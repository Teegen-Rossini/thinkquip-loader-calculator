//! Desktop backend for the ThinkQuip loader calculator.
//!
//! The only thing the desktop shell adds over the web app is a real filesystem:
//! the "ThinkQuip Copy" PDF is written SILENTLY into the logged-in salesman's
//! subfolder of the shared Google Drive folder, instead of going through a
//! browser save dialog.
//!
//! Deliberately NO `tauri-plugin-fs`: the frontend gets no general filesystem
//! access. Instead these few commands each take the configured base folder and
//! refuse to touch anything outside it (see `resolve_within`).

use std::path::{Component, Path, PathBuf};

/// Reject anything that isn't inside the configured salesman-copies base folder.
/// This is the whole filesystem permission surface of the app.
fn resolve_within(base: &str, target: &str) -> Result<PathBuf, String> {
    if base.trim().is_empty() {
        return Err("No salesman-copies folder is configured.".into());
    }
    let target_path = Path::new(target);

    // No "..\.." escapes.
    if target_path
        .components()
        .any(|c| matches!(c, Component::ParentDir))
    {
        return Err("Refusing to use a path containing '..'.".into());
    }
    if !target_path.starts_with(Path::new(base)) {
        return Err(format!(
            "Refusing to write outside the configured folder ({base})."
        ));
    }
    Ok(target_path.to_path_buf())
}

/// Create the salesman's subfolder (and the base folder) if they don't exist.
/// Fails loudly when the drive isn't mounted — the caller then offers a manual
/// save location rather than losing the PDF.
#[tauri::command]
fn ensure_dir(base: String, dir: String) -> Result<(), String> {
    let path = resolve_within(&base, &dir)?;
    std::fs::create_dir_all(&path).map_err(|e| format!("{}: {e}", path.display()))
}

#[tauri::command]
fn path_exists(base: String, path: String) -> Result<bool, String> {
    let path = resolve_within(&base, &path)?;
    Ok(path.exists())
}

#[tauri::command]
fn write_file(base: String, path: String, contents: Vec<u8>) -> Result<(), String> {
    let path = resolve_within(&base, &path)?;
    std::fs::write(&path, contents).map_err(|e| format!("{}: {e}", path.display()))
}

/// Fallback when the shared folder is unreachable: ask where to put the PDF so
/// the salesman never loses it. Returns the chosen path, or None if cancelled.
#[tauri::command]
async fn save_as(
    app: tauri::AppHandle,
    default_name: String,
    contents: Vec<u8>,
) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::DialogExt;

    let (tx, rx) = std::sync::mpsc::channel::<Option<PathBuf>>();
    app.dialog()
        .file()
        .set_file_name(&default_name)
        .add_filter("PDF", &["pdf"])
        .save_file(move |chosen| {
            let picked = chosen.and_then(|p| p.into_path().ok());
            let _ = tx.send(picked);
        });

    let chosen = tauri::async_runtime::spawn_blocking(move || rx.recv())
        .await
        .map_err(|e| e.to_string())?
        .map_err(|e| e.to_string())?;

    match chosen {
        Some(path) => {
            std::fs::write(&path, contents).map_err(|e| format!("{}: {e}", path.display()))?;
            Ok(Some(path.to_string_lossy().to_string()))
        }
        None => Ok(None),
    }
}

/// Render the CURRENT page to PDF bytes using WebView2's own PrintToPdf.
///
/// This is what makes the save silent: it uses the same print pipeline (and the
/// same `@media print` CSS) the print dialog would, so the A4 brochure comes out
/// exactly like the printed one — but with no dialog.
#[cfg(target_os = "windows")]
#[tauri::command]
async fn render_pdf(window: tauri::WebviewWindow) -> Result<Vec<u8>, String> {
    use std::sync::mpsc;
    use std::time::{Duration, SystemTime, UNIX_EPOCH};

    let stamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|e| e.to_string())?
        .as_millis();
    let tmp: PathBuf = std::env::temp_dir().join(format!("thinkquip-copy-{stamp}.pdf"));
    let tmp_for_webview = tmp.to_string_lossy().to_string();

    let (tx, rx) = mpsc::channel::<Result<(), String>>();

    window
        .with_webview(move |webview| {
            use webview2_com::Microsoft::Web::WebView2::Win32::ICoreWebView2_7;
            use webview2_com::PrintToPdfCompletedHandler;
            use windows::core::{Interface, HSTRING, PCWSTR};

            let started = (|| -> Result<(), String> {
                // SAFETY: standard WebView2 COM usage on the UI thread, which is
                // where Tauri runs this closure.
                unsafe {
                    let core = webview
                        .controller()
                        .CoreWebView2()
                        .map_err(|e| e.to_string())?;
                    let core7: ICoreWebView2_7 = core.cast().map_err(|e| e.to_string())?;

                    let path = HSTRING::from(tmp_for_webview.as_str());
                    let done = tx.clone();
                    let handler = PrintToPdfCompletedHandler::create(Box::new(
                        move |result, is_successful| {
                            let outcome = match result {
                                Ok(()) if is_successful => Ok(()),
                                Ok(()) => Err("WebView2 could not produce the PDF.".to_string()),
                                Err(e) => Err(e.to_string()),
                            };
                            let _ = done.send(outcome);
                            Ok(())
                        },
                    ));

                    core7
                        .PrintToPdf(PCWSTR(path.as_ptr()), None, &handler)
                        .map_err(|e| e.to_string())?;
                }
                Ok(())
            })();

            // If we never even started, unblock the waiter with the reason.
            if let Err(e) = started {
                let _ = tx.send(Err(e));
            }
        })
        .map_err(|e| e.to_string())?;

    // Wait off the UI thread; the completion handler fires on it.
    let outcome =
        tauri::async_runtime::spawn_blocking(move || rx.recv_timeout(Duration::from_secs(120)))
            .await
            .map_err(|e| e.to_string())?
            .map_err(|_| "Timed out rendering the PDF.".to_string())?;
    outcome?;

    let bytes = std::fs::read(&tmp).map_err(|e| format!("{}: {e}", tmp.display()))?;
    let _ = std::fs::remove_file(&tmp);
    Ok(bytes)
}

#[cfg(not(target_os = "windows"))]
#[tauri::command]
async fn render_pdf(_window: tauri::WebviewWindow) -> Result<Vec<u8>, String> {
    Err("Silent PDF rendering is only implemented on Windows.".into())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            render_pdf,
            ensure_dir,
            path_exists,
            write_file,
            save_as
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
