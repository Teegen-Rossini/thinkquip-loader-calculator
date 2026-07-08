/**
 * Validates src/data/machines.json — run with `npm run validate-data`.
 * Also runs automatically before `npm run build` (see "prebuild" in
 * package.json), so a broken data file refuses to build.
 *
 * Checks: the file is valid JSON, every model has the required fields for
 * its energyType, values have the right types, ids are unique, image files
 * exist, and confidence markers (when present) are one of
 * confirmed / estimate / pending. Errors name the machine and field.
 */

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA_FILE = path.join(ROOT, 'src', 'data', 'machines.json');
const TEMPLATE_FILE = path.join(ROOT, 'src', 'data', 'machines.template.json');
const SRC_DIR = path.join(ROOT, 'src');

const CONFIDENCE_VALUES = ['confirmed', 'estimate', 'pending'];
const ENERGY_TYPES = ['electric', 'diesel'];

const errors = [];
function fail(where, message) {
  errors.push(`  ✗ ${where}: ${message}`);
}

/**
 * Any value may be written either plain, or wrapped as
 * { value: <plain value>, confidence: "confirmed" | "estimate" | "pending" }.
 * Returns { value, confidence } and records an error for a bad confidence.
 */
function unwrap(raw, where, field) {
  if (
    raw !== null && typeof raw === 'object' && !Array.isArray(raw)
    && 'value' in raw && 'confidence' in raw
  ) {
    if (!CONFIDENCE_VALUES.includes(raw.confidence)) {
      fail(where, `${field} has confidence "${raw.confidence}" — it must be "confirmed", "estimate" or "pending".`);
    }
    return { value: raw.value, confidence: raw.confidence };
  }
  return { value: raw, confidence: 'confirmed' };
}

function checkType(value, type) {
  switch (type) {
    case 'number': return typeof value === 'number' && Number.isFinite(value);
    case 'string': return typeof value === 'string' && value.trim().length > 0;
    default: return false;
  }
}

const TYPE_WORDS = {
  number: 'a plain number (no quotes, no commas, no "R")',
  string: 'text in quotes',
};

/**
 * Field lists per section. Each entry: field name → expected scalar type.
 * Complex fields (ratedConsumption, warrantyTiers, consumptionBreakpoints,
 * batteryReplacement, overhaul) are validated by hand below.
 */
const SPEC_FIELDS = {
  requiredCommon: {},
  requiredElectric: {
    batteryCapacityKWh: 'number',
    chargerRatingKW: 'number',
    gunsPerCharger: 'number',
    chargeTime20to80: 'string',
    chargeTime20to100: 'string',
    workHoursPerCharge: 'string',
    chargeCycles: 'string',
    operatingLifeHours: 'string',
  },
  requiredDiesel: {
    engine: 'string',
    fuelTankL: 'number',
  },
  optional: {
    operatingWeightKg: 'number',
    ratedPayloadKg: 'number',
    bucketCapacityM3: 'number',
    tyres: 'string',
    warrantySummary: 'string',
    operatingLifeHours: 'string', // optional for diesel, required for electric
  },
};

const COST_FIELDS = {
  requiredCommon: {
    priceExVat: 'number',
    routineServicePerHour: 'number',
    maintenancePerYearAt2000h: 'number',
    maintenancePerYearAt3000h: 'number',
  },
};

function checkScalarField(obj, field, type, where, section, required) {
  if (!(field in obj)) {
    if (required) fail(where, `${section}.${field} is missing — add it (${TYPE_WORDS[type]}).`);
    return;
  }
  const { value } = unwrap(obj[field], where, `${section}.${field}`);
  if (!checkType(value, type)) {
    fail(where, `${section}.${field} should be ${TYPE_WORDS[type]}, but it is ${JSON.stringify(value)}.`);
  } else if (type === 'number' && value < 0) {
    fail(where, `${section}.${field} is negative (${value}) — costs and specs must be 0 or more.`);
  }
}

function checkRatedConsumption(specs, where, energyType) {
  if (!('ratedConsumption' in specs)) {
    fail(where, 'specs.ratedConsumption is missing — add { "value": <number>, "unit": "kWh/h" or "L/h" }.');
    return;
  }
  const rc = specs.ratedConsumption;
  if (rc === null || typeof rc !== 'object' || Array.isArray(rc)) {
    fail(where, 'specs.ratedConsumption must be an object like { "value": 38, "unit": "kWh/h" }.');
    return;
  }
  if (!checkType(rc.value, 'number')) {
    fail(where, `specs.ratedConsumption.value should be a plain number, but it is ${JSON.stringify(rc.value)}.`);
  }
  const expectedUnit = energyType === 'electric' ? 'kWh/h' : 'L/h';
  if (rc.unit !== expectedUnit) {
    fail(where, `specs.ratedConsumption.unit should be "${expectedUnit}" for a ${energyType} machine, but it is ${JSON.stringify(rc.unit)}.`);
  }
  if ('confidence' in rc && !CONFIDENCE_VALUES.includes(rc.confidence)) {
    fail(where, `specs.ratedConsumption has confidence "${rc.confidence}" — it must be "confirmed", "estimate" or "pending".`);
  }
}

function checkWarrantyTiers(specs, where) {
  if (!('warrantyTiers' in specs)) {
    fail(where, 'specs.warrantyTiers is missing — add at least one row like { "item": "Complete machine", "terms": "24 months / 5,000 h" }.');
    return;
  }
  const tiers = specs.warrantyTiers;
  if (!Array.isArray(tiers) || tiers.length === 0) {
    fail(where, 'specs.warrantyTiers must be a list with at least one entry.');
    return;
  }
  tiers.forEach((tier, i) => {
    if (tier === null || typeof tier !== 'object') {
      fail(where, `specs.warrantyTiers entry ${i + 1} must be an object with "item" and "terms".`);
      return;
    }
    if (!checkType(tier.item, 'string')) fail(where, `specs.warrantyTiers entry ${i + 1} is missing "item" (text describing what is covered).`);
    if (!checkType(tier.terms, 'string')) fail(where, `specs.warrantyTiers entry ${i + 1} is missing "terms" (text like "24 months / 5,000 h").`);
    if ('confidence' in tier && !CONFIDENCE_VALUES.includes(tier.confidence)) {
      fail(where, `specs.warrantyTiers entry ${i + 1} has confidence "${tier.confidence}" — it must be "confirmed", "estimate" or "pending".`);
    }
  });
}

function checkConsumptionBreakpoints(costs, where, energyType) {
  const unit = energyType === 'electric' ? 'kWh/h' : 'litres/h';
  if (!('consumptionBreakpoints' in costs)) {
    fail(where, `costs.consumptionBreakpoints is missing — add pairs of [slider value 50–100, consumption in ${unit}], e.g. [[50, 10], [100, 16]].`);
    return;
  }
  const bp = costs.consumptionBreakpoints;
  if (!Array.isArray(bp) || bp.length < 2) {
    fail(where, 'costs.consumptionBreakpoints must be a list of at least two [slider, consumption] pairs.');
    return;
  }
  let prevSlider = -Infinity;
  bp.forEach((pair, i) => {
    if (!Array.isArray(pair) || pair.length !== 2 || !checkType(pair[0], 'number') || !checkType(pair[1], 'number')) {
      fail(where, `costs.consumptionBreakpoints entry ${i + 1} must be a pair of two numbers like [65, 12].`);
      return;
    }
    const [slider, rate] = pair;
    if (slider < 50 || slider > 100) fail(where, `costs.consumptionBreakpoints entry ${i + 1} has slider value ${slider} — slider values must be between 50 and 100.`);
    if (slider <= prevSlider) fail(where, `costs.consumptionBreakpoints entry ${i + 1} has slider value ${slider}, which is not higher than the previous entry — pairs must go from low slider to high.`);
    if (rate < 0) fail(where, `costs.consumptionBreakpoints entry ${i + 1} has a negative consumption (${rate}).`);
    prevSlider = slider;
  });
  if (Array.isArray(bp) && bp.length >= 2 && Array.isArray(bp[0]) && Array.isArray(bp[bp.length - 1])) {
    if (bp[0][0] !== 50) fail(where, `costs.consumptionBreakpoints must start at slider value 50 (it starts at ${bp[0][0]}).`);
    if (bp[bp.length - 1][0] !== 100) fail(where, `costs.consumptionBreakpoints must end at slider value 100 (it ends at ${bp[bp.length - 1][0]}).`);
  }
}

function checkBatteryReplacement(costs, where) {
  if (!('batteryReplacement' in costs)) {
    fail(where, 'costs.batteryReplacement is missing — every electric model needs { "atHours": <hours>, "cost": <Rand> }.');
    return;
  }
  const br = costs.batteryReplacement;
  if (br === null || typeof br !== 'object' || Array.isArray(br)) {
    fail(where, 'costs.batteryReplacement must be an object like { "atHours": 30000, "cost": 1120000 }.');
    return;
  }
  if (!checkType(br.atHours, 'number') || br.atHours <= 0) fail(where, 'costs.batteryReplacement.atHours must be a plain number of operating hours, e.g. 30000.');
  if (!checkType(br.cost, 'number') || br.cost < 0) fail(where, 'costs.batteryReplacement.cost must be a plain Rand amount, e.g. 1120000.');
  if ('confidence' in br && !CONFIDENCE_VALUES.includes(br.confidence)) {
    fail(where, `costs.batteryReplacement has confidence "${br.confidence}" — it must be "confirmed", "estimate" or "pending".`);
  }
}

function checkOverhaul(costs, where) {
  if (!('overhaul' in costs)) {
    fail(where, 'costs.overhaul is missing — every diesel model needs it. Use null if the machine has no separate overhaul event, or { "intervalHours": <hours>, "cost": <Rand> } if it does.');
    return;
  }
  const oh = costs.overhaul;
  if (oh === null) return; // explicitly no overhaul event — valid
  if (typeof oh !== 'object' || Array.isArray(oh)) {
    fail(where, 'costs.overhaul must be null (no overhaul event) or an object like { "intervalHours": 12000, "cost": 350000 }.');
    return;
  }
  if (!checkType(oh.intervalHours, 'number') || oh.intervalHours <= 0) fail(where, 'costs.overhaul.intervalHours must be a plain number of operating hours, e.g. 12000.');
  if (!checkType(oh.cost, 'number') || oh.cost < 0) fail(where, 'costs.overhaul.cost must be a plain Rand amount, e.g. 350000.');
  if ('confidence' in oh && !CONFIDENCE_VALUES.includes(oh.confidence)) {
    fail(where, `costs.overhaul has confidence "${oh.confidence}" — it must be "confirmed", "estimate" or "pending".`);
  }
}

function validateModel(model, typeId, index) {
  const label = model?.displayName || model?.id || `model #${index + 1}`;
  const where = `Machine "${label}" (in machineType "${typeId}")`;

  if (model === null || typeof model !== 'object' || Array.isArray(model)) {
    fail(where, 'must be an object — check for a stray comma or bracket in the models list.');
    return;
  }

  for (const field of ['id', 'displayName', 'modelCode', 'imageAsset']) {
    if (!checkType(model[field], 'string')) fail(where, `${field} is missing or empty — it must be text in quotes.`);
  }
  if ('variant' in model && !checkType(model.variant, 'string')) {
    fail(where, 'variant must be short text in quotes (e.g. "dry brake") — or leave the field out entirely.');
  }
  if (model.machineType !== typeId) {
    fail(where, `machineType is ${JSON.stringify(model.machineType)} but the model sits inside machineType "${typeId}" — the two must match exactly.`);
  }
  if (!ENERGY_TYPES.includes(model.energyType)) {
    fail(where, `energyType is ${JSON.stringify(model.energyType)} — it must be exactly "electric" or "diesel".`);
    return; // can't check energy-specific fields without a valid energyType
  }

  if (checkType(model.imageAsset, 'string')) {
    if (!model.imageAsset.startsWith('thinkquip-assets-v3/machines-cutout/')) {
      fail(where, `imageAsset is "${model.imageAsset}" — machine images must live in src/thinkquip-assets-v3/machines-cutout/ (the only folder the app loads machine images from).`);
    } else {
      const imgPath = path.join(SRC_DIR, model.imageAsset);
      if (!existsSync(imgPath)) {
        fail(where, `imageAsset points to "src/${model.imageAsset}", but no file exists there — check the path and file name.`);
      }
    }
  }

  // ---- specs ----
  if (model.specs === null || typeof model.specs !== 'object' || Array.isArray(model.specs)) {
    fail(where, 'specs is missing — it must be an object holding the machine\'s specifications.');
  } else {
    const specs = model.specs;
    const required = model.energyType === 'electric' ? SPEC_FIELDS.requiredElectric : SPEC_FIELDS.requiredDiesel;
    for (const [field, type] of Object.entries({ ...SPEC_FIELDS.requiredCommon, ...required })) {
      checkScalarField(specs, field, type, where, 'specs', true);
    }
    for (const [field, type] of Object.entries(SPEC_FIELDS.optional)) {
      if (field in specs && !(field in required)) checkScalarField(specs, field, type, where, 'specs', false);
    }
    checkRatedConsumption(specs, where, model.energyType);
    checkWarrantyTiers(specs, where);
  }

  // ---- costs ----
  if (model.costs === null || typeof model.costs !== 'object' || Array.isArray(model.costs)) {
    fail(where, 'costs is missing — it must be an object holding the machine\'s prices and running costs.');
  } else {
    const costs = model.costs;
    for (const [field, type] of Object.entries(COST_FIELDS.requiredCommon)) {
      checkScalarField(costs, field, type, where, 'costs', true);
    }
    checkConsumptionBreakpoints(costs, where, model.energyType);
    if (model.energyType === 'electric') checkBatteryReplacement(costs, where);
    if (model.energyType === 'diesel') checkOverhaul(costs, where);
  }
}

// ---------------------------------------------------------------------------

console.log('Validating src/data/machines.json …\n');

let data;
try {
  const raw = readFileSync(DATA_FILE, 'utf8');
  try {
    data = JSON.parse(raw);
  } catch (parseErr) {
    console.error(`  ✗ src/data/machines.json is not valid JSON: ${parseErr.message}`);
    console.error('    Common causes: a missing or extra comma, a missing quote, or an unclosed { or [.');
    console.error('    Tip: paste the file into https://jsonlint.com to see exactly where it breaks.');
    process.exit(1);
  }
} catch {
  console.error(`  ✗ Could not read ${DATA_FILE} — has the file been moved or deleted?`);
  process.exit(1);
}

// The template must stay valid JSON too, since people copy from it.
try {
  JSON.parse(readFileSync(TEMPLATE_FILE, 'utf8'));
} catch (e) {
  fail('machines.template.json', `is not valid JSON (${e.message}) — fix it so it can be safely copied from.`);
}

if (!Array.isArray(data?.machineTypes) || data.machineTypes.length === 0) {
  fail('machines.json', 'must have a top-level "machineTypes" list with at least one machine type.');
} else {
  const seenTypeIds = new Set();
  const seenModelIds = new Map(); // id → displayName

  for (const [ti, machineType] of data.machineTypes.entries()) {
    const typeLabel = machineType?.displayName || machineType?.id || `machineType #${ti + 1}`;
    if (machineType === null || typeof machineType !== 'object') {
      fail(`machineType #${ti + 1}`, 'must be an object with id, displayName and models.');
      continue;
    }
    if (!checkType(machineType.id, 'string')) fail(`machineType "${typeLabel}"`, 'id is missing — it must be text in quotes, e.g. "wheel-loader".');
    if (!checkType(machineType.displayName, 'string')) fail(`machineType "${typeLabel}"`, 'displayName is missing — it must be text in quotes, e.g. "Wheel Loader".');
    if (machineType.id) {
      if (seenTypeIds.has(machineType.id)) fail(`machineType "${typeLabel}"`, `id "${machineType.id}" is used by more than one machine type — every id must be unique.`);
      seenTypeIds.add(machineType.id);
    }
    if (!Array.isArray(machineType.models) || machineType.models.length === 0) {
      fail(`machineType "${typeLabel}"`, 'must have a "models" list with at least one machine in it.');
      continue;
    }
    for (const [mi, model] of machineType.models.entries()) {
      validateModel(model, machineType.id, mi);
      if (model && typeof model === 'object' && checkType(model.id, 'string')) {
        if (seenModelIds.has(model.id)) {
          fail(`Machine "${model.displayName || model.id}"`, `id "${model.id}" is already used by "${seenModelIds.get(model.id)}" — every machine needs its own unique id.`);
        } else {
          seenModelIds.set(model.id, model.displayName || model.id);
        }
      }
    }
  }
}

if (errors.length > 0) {
  console.error(`FAILED — ${errors.length} problem${errors.length === 1 ? '' : 's'} found:\n`);
  for (const e of errors) console.error(e);
  console.error('\nFix the problems above in src/data/machines.json, then run `npm run validate-data` again.');
  console.error('See src/data/README.md and machines.template.json for what each field means.');
  process.exit(1);
}

const modelCount = data.machineTypes.reduce((n, t) => n + (t.models?.length ?? 0), 0);
console.log(`  ✓ machines.json is valid — ${data.machineTypes.length} machine type(s), ${modelCount} model(s):`);
for (const t of data.machineTypes) {
  for (const m of t.models) {
    console.log(`      • ${m.displayName}  [${m.energyType}]  (id: ${m.id})`);
  }
}
console.log('');
