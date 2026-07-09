// Node module-loader hooks that let scripts/generate-knowledge.mjs import the
// REAL app modules (src/data/machinesConfig.js, src/lib/calculationEngine.js)
// outside Vite:
//   - image imports (.png/.svg/…) resolve to an empty-string stub
//   - src/data/machinesRepo.js is stubbed (it uses Vite-only import.meta.glob);
//     the generator builds its machine objects straight from machines.json
//   - extensionless relative imports (Vite style) get ".js" appended
// Registered via module.register() in generate-knowledge.mjs — never used by
// the Vite build itself.

const ASSET_RE = /\.(png|jpe?g|gif|svg|webp|css)$/i;

export async function resolve(specifier, context, next) {
  if (ASSET_RE.test(specifier)) {
    return { url: `thinkquip-asset-stub:${encodeURIComponent(specifier)}`, shortCircuit: true };
  }
  if (/machinesRepo(\.js)?$/.test(specifier)) {
    return { url: 'thinkquip-repo-stub:1', shortCircuit: true };
  }
  if ((specifier.startsWith('./') || specifier.startsWith('../')) && !/\.[a-z]+$/i.test(specifier)) {
    return next(`${specifier}.js`, context);
  }
  return next(specifier, context);
}

export async function load(url, context, next) {
  if (url.startsWith('thinkquip-asset-stub:')) {
    return { format: 'module', source: 'export default "";', shortCircuit: true };
  }
  if (url.startsWith('thinkquip-repo-stub:')) {
    // Only the names calculationEngine.js imports; the generator never calls
    // the engine functions that depend on them (it passes machines explicitly).
    return {
      format: 'module',
      source: [
        'export const ALL_MODELS = [];',
        'export const MACHINE_TYPES = [];',
        'export const getModelById = () => null;',
        'export const orderedModelIds = (x) => (Array.isArray(x) ? x : []);',
      ].join('\n'),
      shortCircuit: true,
    };
  }
  return next(url, context);
}
