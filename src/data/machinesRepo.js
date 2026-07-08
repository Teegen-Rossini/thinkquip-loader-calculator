/**
 * Machine repository — the ONLY code that reads src/data/machines.json.
 * It resolves the editable JSON (validated by `npm run validate-data`) into
 * fully-formed machine objects for the engine and components: images resolved
 * to bundled URLs, optional { value, confidence } wrappers unwrapped, brand
 * visuals attached, and legacy field aliases kept so every existing consumer
 * (screen and print) keeps working.
 *
 * To add a machine, edit machines.json — see src/data/README.md. This module
 * should not need to change.
 */

import machinesData from './machines.json';
import sanyLogo from '../thinkquip-assets-v3/logos-transparent/sany-logo.png';
import { COLORS } from './machinesConfig';

/** Every machine cutout image, keyed by its path relative to src/, so a
 *  model's `imageAsset` string resolves without a code change. Machine images
 *  MUST live in thinkquip-assets-v3/machines-cutout/ (the validator enforces
 *  this) — globbing wider would bundle every unused legacy asset. */
const IMAGE_MODULES = import.meta.glob(
  '../thinkquip-assets-v3/machines-cutout/*.{png,jpg,jpeg,webp,svg}',
  { eager: true, query: '?url', import: 'default' },
);

function imageUrl(imageAsset) {
  return IMAGE_MODULES[`../${imageAsset}`];
}

/** Unwrap the optional { value, confidence } form; plain values pass through. */
function val(x) {
  if (x !== null && typeof x === 'object' && !Array.isArray(x) && 'value' in x && 'confidence' in x) {
    return x.value;
  }
  return x;
}

/** Unwrap every field of a specs/costs section, dropping "//" comment keys. */
function unwrapSection(obj) {
  const out = {};
  for (const [key, value] of Object.entries(obj ?? {})) {
    if (key.startsWith('//')) continue;
    out[key] = val(value);
  }
  return out;
}

/**
 * A JSON model resolved into the machine object the app consumes. Keeps the
 * legacy aliases (`uid`, `type`, `name`, `price`, `battery`, `warranty`, …)
 * that the engine, cards, chart and brochure were built against.
 */
function resolveModel(model, typeId) {
  const specs = unwrapSection(model.specs);
  const costs = unwrapSection(model.costs);
  const isElectric = model.energyType === 'electric';
  const accent = isElectric ? COLORS.electricAccent : COLORS.dieselAccent;

  return {
    // identity
    id: model.id,
    uid: model.id,
    optionId: model.id,
    modelCode: model.modelCode,
    machineTypeId: typeId,
    energyType: model.energyType,
    type: model.energyType, // legacy alias — 'electric' | 'diesel'
    brand: 'SANY',
    name: model.modelCode,
    displayName: model.displayName,
    variant: model.variant, // optional configuration label, e.g. "dry brake"

    // visuals
    logo: sanyLogo,
    logoColor: COLORS.sanyRed,
    photo: imageUrl(model.imageAsset),
    accentColor: accent,
    chartColor: accent,

    // commercial
    price: costs.priceExVat,

    // shared specs
    operatingWeightKg: specs.operatingWeightKg,
    ratedPayloadKg: specs.ratedPayloadKg,
    bucketCapacityM3: specs.bucketCapacityM3,
    tyres: specs.tyres,
    warranty: specs.warrantySummary,
    warrantyTiers: specs.warrantyTiers,
    specConsumption: specs.ratedConsumption,
    serviceLifeHours: specs.operatingLifeHours ? { label: specs.operatingLifeHours } : undefined,
    maintenanceSchedule: [
      { hoursPerYear: 2000, costPerYear: costs.maintenancePerYearAt2000h },
      { hoursPerYear: 3000, costPerYear: costs.maintenancePerYearAt3000h },
    ],

    // electric-only
    battery: isElectric
      ? {
          capacityKWh: specs.batteryCapacityKWh,
          chargerRatingKW: specs.chargerRatingKW,
          gunsPerCharger: specs.gunsPerCharger,
          charge20to80: specs.chargeTime20to80,
          charge20to100: specs.chargeTime20to100,
          workPerCharge: specs.workHoursPerCharge,
          cycleLife: specs.chargeCycles,
        }
      : undefined,
    batteryReplacement: isElectric && costs.batteryReplacement
      ? { atHours: val(costs.batteryReplacement.atHours), baseCost: val(costs.batteryReplacement.cost) }
      : undefined,

    // diesel-only
    engine: specs.engine,
    fuelTankL: specs.fuelTankL,
    overhaul: costs.overhaul
      ? { intervalHours: val(costs.overhaul.intervalHours), cost: val(costs.overhaul.cost) }
      : null,

    // per-model engine inputs
    consumptionBreakpoints: costs.consumptionBreakpoints,
    routineServicePerHour: costs.routineServicePerHour,
  };
}

/** Machine types in JSON order, each with its resolved models. */
export const MACHINE_TYPES = machinesData.machineTypes.map((t) => ({
  id: t.id,
  displayName: t.displayName,
  models: t.models.map((m) => resolveModel(m, t.id)),
}));

/** Every model across all types, in canonical (JSON) display order. */
export const ALL_MODELS = MACHINE_TYPES.flatMap((t) => t.models);

const MODEL_BY_ID = new Map(ALL_MODELS.map((m) => [m.id, m]));

export const DEFAULT_MACHINE_TYPE_ID = MACHINE_TYPES[0].id;

export function getMachineType(typeId) {
  return MACHINE_TYPES.find((t) => t.id === typeId);
}

export function getModelsForType(typeId) {
  return getMachineType(typeId)?.models ?? [];
}

export function getModelById(modelId) {
  return MODEL_BY_ID.get(modelId);
}

/** The out-of-the-box selection for a machine type: its first electric model
 *  plus its first diesel model (the hero comparison), else its first model. */
export function defaultModelIdsForType(typeId) {
  const models = getModelsForType(typeId);
  if (!models.length) return [];
  const firstElectric = models.find((m) => m.type === 'electric');
  const firstDiesel = models.find((m) => m.type === 'diesel');
  const ids = [firstElectric?.id, firstDiesel?.id].filter(Boolean);
  return ids.length ? ids : [models[0].id];
}

/** Canonicalise selected model ids to display order, dropping unknown ids.
 *  Never returns an empty list — falls back to the default selection. */
export function orderedModelIds(modelIds) {
  const set = new Set(Array.isArray(modelIds) ? modelIds : []);
  const ordered = ALL_MODELS.filter((m) => set.has(m.id)).map((m) => m.id);
  return ordered.length ? ordered : defaultModelIdsForType(DEFAULT_MACHINE_TYPE_ID);
}

/** Pre-multi-model drafts stored option ids — map them to model ids. */
export const LEGACY_OPTION_TO_MODEL = {
  electric: 'sw956e',
  'diesel-dry': 'syl956h5-dry',
  'diesel-wet': 'syl956h5-wet',
};
