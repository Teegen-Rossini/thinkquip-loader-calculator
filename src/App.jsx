import { useEffect, useState } from 'react';
import { flushSync } from 'react-dom';
import { DEFAULT_PRICES, CALC_DEFAULTS, THINKQUIP_LOGO_WHITE } from './data/machinesConfig';
import {
  MACHINE_TYPES,
  DEFAULT_MACHINE_TYPE_ID,
  defaultModelIdsForType,
  getModelById,
  LEGACY_OPTION_TO_MODEL,
} from './data/machinesRepo';
import { runSelection } from './lib/calculationEngine';
import { buildPageContext } from './lib/chatPageContext';
import { useAuth } from './lib/useAuth';
import { saveSalesmanCopy, saveCustomerCopy, isDesktop } from './lib/saveSalesmanCopy';
import { printWithSuggestedName } from './lib/printDialog';
import { suggestedFileName } from './lib/salesmanCopyPath';
import LoginScreen, { AuthNotice, AuthLoading } from './components/LoginScreen';
import Dashboard from './components/Dashboard';
import InputForm from './components/InputForm';
import TabBar from './components/TabBar';
import FleetSizeToggle from './components/FleetSizeToggle';
import HeroStat from './components/HeroStat';
import ComparatorCard from './components/ComparatorCard';
import CostChart from './components/CostChart';
import LifecycleEventsTable from './components/LifecycleEventsTable';
import CalculationView from './components/CalculationView';
import PageNav from './components/PageNav';
import SummaryTable from './components/SummaryTable';
import PrintBrochure from './components/PrintBrochure';
import ChatWidget from './ChatWidget';
import './App.css';

const DRAFT_STORAGE_KEY = 'thinkquip-loader-calc-draft-v2';

/** Local (not UTC) today as yyyy-mm-dd, for <input type="date">. */
function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const isISODate = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);

const defaultInputs = {
  // "Prepared For" — the customer, entered on the cover page. Display-only:
  // populates the printed cover, never feeds a calculation.
  preparedForName: '',
  preparedForCell: '',
  preparedForEmail: '',
  // Quote date — auto-filled to today on load, user-editable. Single source
  // of truth for the date on the cover and both print outputs.
  quoteDate: '',
  machineTypeId: DEFAULT_MACHINE_TYPE_ID,
  machineModelIds: defaultModelIdsForType(DEFAULT_MACHINE_TYPE_ID),
  // Per-model price overrides, keyed by model id. Empty = every machine at its
  // default list price; the engine falls back per machine (effectiveMachinePrice).
  machinePrices: {},
  fuelIncludedInRate: true,
  dailyHours: 8,
  daysPerWeek: CALC_DEFAULTS.daysPerWeek,
  weeksPerYear: CALC_DEFAULTS.weeksPerYear,
  operationSlider: CALC_DEFAULTS.operationSliderDefault,
  electricityPrice: DEFAULT_PRICES.electricityPricePerKWh,
  dieselPrice: DEFAULT_PRICES.dieselPricePerLiter,
  fuelTheftLevel: 'moderate',
  fleetSize: CALC_DEFAULTS.fleetSizeDefault,
  vatInclusive: false,
  // Comparison time window (0 → chart limit). Set on the Comparison page
  // slider; drives every window-dependent figure on screen AND in print.
  comparisonWindowHours: CALC_DEFAULTS.chartMaxHours,
};

/** Optional ?draft={...json...} URL override — used for deep links and for
 *  generating print previews at known inputs. When present, the draft in
 *  localStorage is neither read nor overwritten. */
function draftOverride() {
  try {
    const raw = new URLSearchParams(window.location.search).get('draft');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Merge onto defaults and migrate older drafts to `machineModelIds`:
 *  - legacy single-select `machineOption` ('electric' | 'diesel-dry' | 'diesel-wet')
 *  - legacy multi-select `machineOptions` (array of those option ids)
 * Unknown ids are dropped; the machine type is inferred from the selection
 * when missing; the selection is never left empty.
 */
function normalizeInputs(parsed) {
  const merged = { ...defaultInputs, ...parsed };

  // Migrate the legacy single "Prepared for" text field to the customer name.
  if (!merged.preparedForName && typeof parsed.preparedFor === 'string') {
    merged.preparedForName = parsed.preparedFor;
  }
  delete merged.preparedFor;
  if (!isISODate(merged.quoteDate)) merged.quoteDate = todayISO();

  merged.machinePrices =
    parsed.machinePrices && typeof parsed.machinePrices === 'object' && !Array.isArray(parsed.machinePrices)
      ? parsed.machinePrices
      : {};

  const windowHours = Number(merged.comparisonWindowHours);
  merged.comparisonWindowHours = Number.isFinite(windowHours)
    ? Math.max(0, Math.min(CALC_DEFAULTS.chartMaxHours, windowHours))
    : CALC_DEFAULTS.chartMaxHours;

  // Read from `parsed`, not `merged` — merged always carries the defaults.
  let ids = Array.isArray(parsed.machineModelIds) ? parsed.machineModelIds : null;
  if (!ids) {
    let legacyOptions = Array.isArray(parsed.machineOptions) ? parsed.machineOptions : null;
    if (!legacyOptions && typeof parsed.machineOption === 'string') {
      const dieselVariant = parsed.machineOption !== 'electric' ? parsed.machineOption : 'diesel-dry';
      legacyOptions = ['electric', dieselVariant];
    }
    ids = (legacyOptions ?? []).map((optionId) => LEGACY_OPTION_TO_MODEL[optionId] ?? optionId);
  }
  ids = ids.filter((id) => getModelById(id));

  let typeId = merged.machineTypeId;
  if (!MACHINE_TYPES.some((t) => t.id === typeId)) {
    typeId = ids.length ? getModelById(ids[0]).machineTypeId : DEFAULT_MACHINE_TYPE_ID;
  }
  ids = ids.filter((id) => getModelById(id).machineTypeId === typeId);
  if (!ids.length) ids = defaultModelIdsForType(typeId);

  merged.machineTypeId = typeId;
  merged.machineModelIds = ids;
  delete merged.machineOption;
  delete merged.machineOptions;
  return merged;
}

function loadDraftInputs() {
  const override = draftOverride();
  if (override) return normalizeInputs(override);
  try {
    const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!saved) return { ...defaultInputs, quoteDate: todayISO() };
    // The quote date always defaults to TODAY on a fresh load — a stale date
    // from a previous day's draft is never restored. (Deep-link ?draft=
    // overrides above DO honor an explicit quoteDate, for print previews.)
    return { ...normalizeInputs(JSON.parse(saved)), quoteDate: todayISO() };
  } catch {
    return { ...defaultInputs, quoteDate: todayISO() };
  }
}

// Calculations is deliberately LAST — the transparent maths appendix follows
// the Spec Sheet, and carries the end-of-sequence Print button.
const TABS = [
  { id: 'inputs', index: '01', label: 'Inputs' },
  { id: 'comparison', index: '02', label: 'Comparison' },
  { id: 'chart', index: '03', label: 'Cost Over Hours' },
  { id: 'details', index: '04', label: 'Spec Sheet' },
  { id: 'calculation', index: '05', label: 'Calculations' },
];

function App() {
  const [inputs, setInputs] = useState(loadDraftInputs);
  const [activeTab, setActiveTab] = useState('dashboard');
  // Salesman auth + their Supabase profile (name / cell / email / folder_name).
  const { status: authStatus, salesman, profileError, signIn, signOut } = useAuth();
  // Result of the last "Save ThinkQuip Copy" (where it filed, or why it couldn't).
  const [saveNotice, setSaveNotice] = useState(null);
  const [saving, setSaving] = useState(false);
  // Which labelled variant the (hidden) brochure is currently rendering.
  // Each button forces its own variant before it acts, so a button can never
  // emit the other copy's label.
  const [copyKind, setCopyKind] = useState('customer');

  // Successful saves self-dismiss; failures stay until the salesman closes them.
  useEffect(() => {
    if (!saveNotice?.ok) return undefined;
    const t = setTimeout(() => setSaveNotice(null), 9000);
    return () => clearTimeout(t);
  }, [saveNotice]);

  // Once any print dialog closes, fall back to the customer variant so a stray
  // Ctrl+P later can't emit a THINKQUIP COPY.
  useEffect(() => {
    const reset = () => setCopyKind('customer');
    window.addEventListener('afterprint', reset);
    return () => window.removeEventListener('afterprint', reset);
  }, []);

  // Moving between pages always lands at the TOP of the new page — without
  // this, the scroll position of the previous page carries over.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [activeTab]);

  useEffect(() => {
    if (draftOverride()) return; // don't clobber the saved draft from a deep link
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(inputs));
  }, [inputs]);

  const updateInputs = (patch) => setInputs((prev) => ({ ...prev, ...patch }));

  // --- The two copies. Each stamps its OWN label on the cover before it acts.
  // flushSync forces the brochure to re-render with the right label BEFORE the
  // print dialog opens / the desktop bridge snapshots the DOM — without it the
  // state update would land after the PDF was already produced.

  /** Customer take-home brochure: cover reads "CUSTOMER COPY". PRINT — the
   *  system print dialog (a real printer, or the browser's "Save as PDF").
   *  Never auto-files anywhere. */
  const handlePrintCustomerCopy = () => {
    flushSync(() => setCopyKind('customer'));
    printWithSuggestedName(suggestedFileName('customer', { inputs }));
  };

  /** Customer take-home brochure — SAVE (desktop only): renders the PDF and
   *  opens a native Save As dialog so the salesman gets a file to email or
   *  hand over. The browser has no such path; it only gets the print button. */
  const handleSaveCustomerCopy = async () => {
    if (saving) return;
    flushSync(() => setCopyKind('customer'));
    setSaving(true);
    setSaveNotice(null);
    const result = await saveCustomerCopy({ inputs });
    if (result.message) setSaveNotice(result);
    setSaving(false);
  };

  /** ThinkQuip's master record: cover reads "THINKQUIP COPY" (a fixed label,
   *  never the salesman's name). Saves only — no print dialog on the desktop —
   *  auto-filing into {base}\{folder_name}\ via prompt 2's logic. */
  const handleSaveThinkquipCopy = async () => {
    if (saving) return;
    flushSync(() => setCopyKind('thinkquip'));
    setSaving(true);
    setSaveNotice(null);
    const result = await saveSalesmanCopy({ salesman, inputs });
    setSaveNotice(result);
    setSaving(false);
    // A silent desktop write fires no afterprint event, so reset the variant here.
    if (result.mode === 'desktop') setCopyKind('customer');
  };
  const setFleetSize = (fleetSize) => updateInputs({ fleetSize });

  // Switching machine type resets the model selection to that type's default.
  const selectMachineType = (typeId) => setInputs((prev) =>
    prev.machineTypeId === typeId
      ? prev
      : { ...prev, machineTypeId: typeId, machineModelIds: defaultModelIdsForType(typeId) });

  // Toggle a model in/out of the compared set, always keeping ≥1.
  const toggleModel = (modelId) => setInputs((prev) => {
    const current = Array.isArray(prev.machineModelIds) ? prev.machineModelIds : [];
    const has = current.includes(modelId);
    if (has && current.length === 1) return prev; // can't deselect the last one
    const next = has ? current.filter((x) => x !== modelId) : [...current, modelId];
    return { ...prev, machineModelIds: next };
  });

  const selection = runSelection({ inputs, fleetSize: inputs.fleetSize });

  // ---- Login gate: the calculator is unusable until a salesman is signed in
  // AND their profile has loaded. We never proceed on blank/placeholder details.
  if (authStatus === 'misconfigured') {
    return (
      <AuthNotice
        title="Setup Needed"
        message="This app isn't connected to its login service yet. Contact the administrator."
      />
    );
  }
  if (authStatus === 'loading') return <AuthLoading />;
  if (authStatus === 'signedOut') return <LoginScreen onSignIn={signIn} />;
  if (authStatus === 'noProfile') {
    return <AuthNotice title="No Profile Found" message={profileError} onSignOut={signOut} />;
  }

  // ?printview=1 renders ONLY the brochure, on screen, exactly as it prints —
  // for checking the document before handing a customer the PDF.
  // &copy=thinkquip previews the ThinkQuip-labelled variant instead.
  const printViewParams = new URLSearchParams(window.location.search);
  if (printViewParams.has('printview')) {
    return (
      <PrintBrochure
        selection={selection}
        inputs={inputs}
        salesman={salesman}
        copyKind={printViewParams.get('copy') === 'thinkquip' ? 'thinkquip' : 'customer'}
        preview
      />
    );
  }

  const isDashboard = activeTab === 'dashboard';
  // The screen UI never prints — the print output is PrintBrochure alone.
  const panelClass = (id) => `tab-panel no-print${id === 'inputs' ? ' tab-panel--inputs' : ' tab-panel--result'}${activeTab === id ? ' is-active' : ''}`;

  return (
    <>
      <div className="app-topbar no-print">
        <header className="app-header">
          <div className="app-header__inner">
            <div
              className="app-header__titles"
              role="button"
              tabIndex={0}
              onClick={() => setActiveTab('dashboard')}
              onKeyDown={(e) => e.key === 'Enter' && setActiveTab('dashboard')}
            >
              <span className="app-header__lockup">
                <img src={THINKQUIP_LOGO_WHITE} alt="ThinkQuip" className="app-header__logo" />
                <span className="app-header__tagline">Authorized SANY Distributor</span>
              </span>
              <span className="app-header__divider" aria-hidden="true" />
              <span className="app-header__subtitle">ThinkQuip TCO Calculator</span>
            </div>
            <div className="app-header__actions">
              <span className="app-header__user" title={salesman.email}>
                {salesman.name}
              </span>
              <button
                type="button"
                className="salesman-copy-btn"
                onClick={handleSaveThinkquipCopy}
                disabled={saving}
              >
                {saving ? 'Saving…' : 'Save ThinkQuip Copy'}
              </button>
              {isDesktop() && (
                <button
                  type="button"
                  className="print-btn"
                  onClick={handleSaveCustomerCopy}
                  disabled={saving}
                >
                  {saving ? 'Saving…' : 'Save Customer Copy'}
                </button>
              )}
              <button type="button" className="print-btn" onClick={handlePrintCustomerCopy}>
                {isDesktop() ? 'Print Customer Copy' : 'Print / Save Customer Copy'}
              </button>
              <button type="button" className="logout-btn" onClick={signOut}>
                Log out
              </button>
            </div>
          </div>
        </header>

        {!isDashboard && <TabBar tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />}
      </div>

      <main className="app-body">
        <div className={`tab-panel no-print${isDashboard ? ' is-active' : ''}`}>
          <Dashboard onStart={() => setActiveTab('inputs')} inputs={inputs} onUpdate={updateInputs} salesman={salesman} />
        </div>

        <PrintBrochure selection={selection} inputs={inputs} salesman={salesman} copyKind={copyKind} />

        <section className={panelClass('inputs')}>
          <InputForm
            inputs={inputs}
            onUpdate={updateInputs}
            onSelectMachineType={selectMachineType}
            onToggleModel={toggleModel}
          />
          <PageNav
            nextLabel="Comparison"
            onNext={() => setActiveTab('comparison')}
          />
        </section>

        <section className={panelClass('comparison')}>
          <FleetSizeToggle fleetSize={inputs.fleetSize} onChange={setFleetSize} />
          <HeroStat selection={selection} fleetSize={inputs.fleetSize} onUpdate={updateInputs} />
          <h3 className="section-heading">
            {selection.hasComparison ? 'Machines compared' : 'Selected machine'}
          </h3>
          <div className="comparator-grid">
            {selection.machines.map((result) => (
              <ComparatorCard key={result.machine.uid} result={result} selection={selection} inputs={inputs} />
            ))}
          </div>
          <PageNav
            prevLabel="Inputs"
            onPrev={() => setActiveTab('inputs')}
            nextLabel="Cost Over Hours"
            onNext={() => setActiveTab('chart')}
          />
        </section>

        <section className={panelClass('chart')}>
          <FleetSizeToggle fleetSize={inputs.fleetSize} onChange={setFleetSize} />
          <div className="chart-details-layout">
            <div className="panel-surface chart-details-layout__chart">
              <h3 className="section-heading section-heading--flush">
                Cumulative TCO over operating hours ({inputs.fleetSize} machine{inputs.fleetSize > 1 ? 's' : ''})
              </h3>
              <CostChart selection={selection} />
            </div>
            <div className="chart-details-layout__side">
              <LifecycleEventsTable selection={selection} onViewAssumptions={() => setActiveTab('details')} />
            </div>
          </div>
          <PageNav
            prevLabel="Comparison"
            onPrev={() => setActiveTab('comparison')}
            nextLabel="Spec Sheet"
            onNext={() => setActiveTab('details')}
          />
        </section>

        <section className={panelClass('details')}>
          <SummaryTable selection={selection} inputs={inputs} />
          <PageNav
            prevLabel="Cost Over Hours"
            onPrev={() => setActiveTab('chart')}
            nextLabel="Calculations"
            onNext={() => setActiveTab('calculation')}
          />
        </section>

        <section className={panelClass('calculation')}>
          <CalculationView selection={selection} inputs={inputs} />
          <PageNav
            prevLabel="Spec Sheet"
            onPrev={() => setActiveTab('details')}
            onPrintCustomerCopy={handlePrintCustomerCopy}
            onSaveCustomerCopy={isDesktop() ? handleSaveCustomerCopy : undefined}
            onSaveThinkquipCopy={handleSaveThinkquipCopy}
            saving={saving}
          />
        </section>
      </main>

      {saveNotice && (
        <div
          className={`save-notice no-print${saveNotice.ok ? '' : ' save-notice--warn'}`}
          role="status"
        >
          <span className="save-notice__text">{saveNotice.message}</span>
          <button
            type="button"
            className="save-notice__close"
            onClick={() => setSaveNotice(null)}
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      )}

      <ChatWidget pageContext={buildPageContext({ activeTab, inputs, selection, salesman })} />

      {!isDashboard && (
        <footer className="app-footer no-print">
          <p>
            Projections apply researched annual escalation trends (diesel, electricity and routine service costs) to
            the operating inputs and manufacturer figures shown above &mdash; not a forecast of your
            business income. Planning estimate only &mdash; final pricing, maintenance, finance and availability must be
            confirmed before purchase.
          </p>
        </footer>
      )}
    </>
  );
}

export default App;
