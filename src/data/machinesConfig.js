/**
 * Fixed-variable data — the ONLY place manufacturer specs, prices,
 * consumption breakpoints and escalation figures should live. As real
 * dealer quotes come back, update the values here — nothing in the
 * calculation engine or components should need to change.
 *
 * Scope: this tool compares exactly two SANY machine families —
 * the SW956E electric loader vs the SYL956H5 diesel loader (dry or wet
 * brake, which changes only the diesel selling price). There are no
 * competitor machines, no solar, no tender logic and no charging-
 * infrastructure line — the charger is included in the electric price.
 *
 * confidence: 'confirmed' | 'estimate' | 'unconfirmed'
 *   confirmed   — from factory docs / manufacturer's own published data
 *   estimate    — a reasoned placeholder, pending a real quote / feed
 *   unconfirmed — no usable number yet (renders as "Pending quote")
 */

import thinkquipLogo from '../thinkquip-assets/logos/thinkquip-logo.png';
import sanyLogo from '../thinkquip-assets-v3/logos-transparent/sany-logo.png';

import sanyElectricPhoto from '../thinkquip-assets-v3/machines-cutout/sany-sw956e-electric.png';
import sanyDieselPhoto from '../thinkquip-assets-v3/machines-cutout/sany-syl956h5-diesel.png';

/** Brand & UI color system. Turquoise chrome, yellow CTA; electric line
 *  blue, diesel line amber/yellow. Use these exact hex values. */
export const COLORS = {
  thinkquipTurquoise: '#0AA6A0', // app chrome, header, nav
  sanyRed: '#E2231A', // SANY logo native red
  electricAccent: '#6BB8E0', // sky blue — SW956E card / chart line
  dieselAccent: '#F2A93E', // amber-yellow — SYL956H5 card / chart line
};

export const THINKQUIP_LOGO = thinkquipLogo;

/** Company identity printed in the brochure footer. */
export const COMPANY = {
  name: 'ThinkQuip',
  address: '11 Voyager Street, Linbro Park, JHB',
  website: 'www.thinkquip.co.za',
};

/** SANY SW956E electric loader. Selling price is fixed (the 320 kW charger
 *  is included). Battery reaches replacement at 30,000 h — beyond the first
 *  owner's typical lifecycle and beyond the 20,000 h chart window. */
export const ELECTRIC_MACHINE = {
  id: 'sw956e',
  type: 'electric',
  brand: 'SANY',
  name: 'SW956E',
  displayName: 'SANY SW956E (Electric)',
  logo: sanyLogo,
  logoColor: COLORS.sanyRed,
  photo: sanyElectricPhoto,
  accentColor: COLORS.electricAccent,
  chartColor: COLORS.electricAccent,

  price: 3150000, // ex VAT, charger included
  priceConfidence: 'confirmed',

  operatingWeightKg: 20000,
  ratedPayloadKg: 5800,
  bucketCapacityM3: 3.5,
  tyres: 'L5',
  warranty: '5,000 h / 2 years',
  warrantyConfidence: 'confirmed',

  /** Printed spec-sheet warranty tiers (from ThinkQuip's SANY sheet). */
  warrantyTiers: [
    { item: 'Complete machine', terms: '24 months / 5,000 h', confidence: 'confirmed' },
    { item: 'Battery, drive motor & electric control', terms: '60 months / 10,000 h', confidence: 'confirmed' },
    { item: 'Axle, hydraulic pump & gearbox', terms: '24 months / 5,000 h', confidence: 'confirmed' },
  ],

  /** Rated consumption printed on the spec sheet (typical heavy duty). The
   *  calculator itself interpolates CONSUMPTION_BREAKPOINTS from the slider. */
  specConsumption: { value: 38, unit: 'kWh/h', confidence: 'confirmed' },

  serviceLifeHours: { label: '30,000 – 35,000 h', confidence: 'confirmed' },

  /** Scheduled maintenance cost per year at a given annual utilization —
   *  printed spec-sheet figures, NOT the TCO engine's R0/h service line. */
  maintenanceSchedule: [
    { hoursPerYear: 2000, costPerYear: 53877, confidence: 'confirmed' },
    { hoursPerYear: 3000, costPerYear: 75377, confidence: 'confirmed' },
  ],

  battery: {
    capacityKWh: 422,
    chargerRatingKW: 320, // included in the purchase price
    gunsPerCharger: 2,
    charge20to80: '0.8 h (20% → 80%)',
    charge20to100: '1.5 h (20% → 100%)',
    workPerCharge: '7 – 9 h',
    cycleLife: '4,000+ cycles',
    confidence: 'confirmed',
  },

  // Battery replacement lands at 30,000 h — beyond the 20,000 h chart, so it
  // is NOT plotted on the curve; it is surfaced in the lifecycle table and a
  // callout as a "beyond the first owner's lifecycle" event.
  batteryReplacement: {
    atHours: 30000,
    baseCost: 1120000,
    confidence: 'confirmed',
  },
};

/** SANY SYL956H5 diesel loader. Specs are identical across brake variants;
 *  only the selling price differs (see MACHINE_OPTIONS). Its running cost is
 *  a continuous routine-service line (R29/h) plus fuel — there is no separate
 *  engine-overhaul event. */
export const DIESEL_MACHINE = {
  id: 'syl956h5',
  type: 'diesel',
  brand: 'SANY',
  name: 'SYL956H5',
  displayName: 'SANY SYL956H5 (Diesel)',
  logo: sanyLogo,
  logoColor: COLORS.sanyRed,
  photo: sanyDieselPhoto,
  accentColor: COLORS.dieselAccent,
  chartColor: COLORS.dieselAccent,

  priceConfidence: 'confirmed', // price supplied per brake variant below

  engine: 'Cummins QSL8.9-C220 III, ~164 kW @ 2200 rpm',
  fuelTankL: 300,
  operatingWeightKg: 17100,
  ratedPayloadKg: 5000,
  bucketCapacityM3: 3,
  tyres: 'L5',
  warranty: '4,000 h / 2 years',
  warrantyConfidence: 'confirmed',

  warrantyTiers: [
    { item: 'Complete machine', terms: '24 months / 4,000 h', confidence: 'confirmed' },
  ],

  specConsumption: { value: 14, unit: 'L/h', confidence: 'confirmed' },

  maintenanceSchedule: [
    { hoursPerYear: 2000, costPerYear: 74873, confidence: 'confirmed' },
    { hoursPerYear: 3000, costPerYear: 91373, confidence: 'confirmed' },
  ],
};

/**
 * The three selectable machine options. Wet vs dry brake changes ONLY the
 * diesel selling price — same images, same specs, same consumption. The two
 * compared lines are always the electric machine and one diesel variant.
 */
export const MACHINE_OPTIONS = [
  { id: 'electric', type: 'electric', label: 'SANY SW956E (Electric)', price: 3150000, photo: sanyElectricPhoto },
  { id: 'diesel-dry', type: 'diesel', brake: 'dry', label: 'SANY SYL956H5 (Diesel, dry brake)', price: 1850000, photo: sanyDieselPhoto },
  { id: 'diesel-wet', type: 'diesel', brake: 'wet', label: 'SANY SYL956H5 (Diesel, wet brake)', price: 2200000, photo: sanyDieselPhoto },
];

/** Canonical left-to-right display order for the selectable options — keeps
 *  cards, chart lines and tables stable regardless of tick order. */
export const MACHINE_OPTION_ORDER = ['electric', 'diesel-dry', 'diesel-wet'];

/** The diesel selling price implied by the selected machine option. Selecting
 *  the electric option leaves the diesel comparator at its dry-brake price. */
export function dieselPriceForOption(optionId) {
  return optionId === 'diesel-wet' ? 2200000 : 1850000;
}

export function dieselBrakeForOption(optionId) {
  return optionId === 'diesel-wet' ? 'wet' : 'dry';
}

/** A fully-priced diesel machine object for the selected option. */
export function getDieselMachineForOption(optionId) {
  return {
    ...DIESEL_MACHINE,
    price: dieselPriceForOption(optionId),
    brake: dieselBrakeForOption(optionId),
  };
}

/**
 * A fully-resolved machine object for ANY selectable option id. Each carries a
 * unique `uid` (the option id) so two SYL956H5 variants (dry + wet) — the same
 * machine at two prices — remain distinct series/cards/lines. `displayName` is
 * the option's label so wet/dry read differently.
 */
export function getMachineForOption(optionId) {
  const opt = MACHINE_OPTIONS.find((o) => o.id === optionId) ?? MACHINE_OPTIONS[0];
  if (opt.type === 'electric') {
    return { ...ELECTRIC_MACHINE, uid: opt.id, optionId: opt.id, price: opt.price, displayName: opt.label };
  }
  return { ...DIESEL_MACHINE, uid: opt.id, optionId: opt.id, price: opt.price, brake: opt.brake, displayName: opt.label };
}

/**
 * Consumption breakpoints (spec section 5). Consumption is interpolated
 * LINEARLY between these as the operation slider (50–100) moves — the bands
 * are only where the slope changes, so the slider stays responsive within a
 * band. Each entry is [sliderValue, consumptionRate].
 */
export const CONSUMPTION_BREAKPOINTS = {
  electric: [[50, 20], [65, 30], [85, 35], [100, 40]], // kWh/h
  diesel: [[50, 10], [65, 12], [85, 14], [100, 16]], // L/h
};

/** Operation-mix bands — used for the slider's label only (the raw % is never
 *  shown). Ranges: Light 50–65, Normal 65–85, Heavy 85–100. */
export const OPERATION_BANDS = [
  { id: 'light', label: 'Light', min: 50, max: 65 },
  { id: 'normal', label: 'Normal', min: 65, max: 85 },
  { id: 'heavy', label: 'Heavy', min: 85, max: 100 },
];

/** Fuel-theft control levels (spec section 6). Applies to diesel fuel only —
 *  electricity is never affected. Diesel fuel cost is multiplied by (1 + θ). */
export const FUEL_THEFT_LEVELS = [
  { id: 'low', label: 'Low control environment', range: '5–15%', theta: 0.10 },
  { id: 'moderate', label: 'Moderately controlled site', range: '2–5%', theta: 0.035 },
  { id: 'well', label: 'Well-monitored site', range: '<2%', theta: 0.01 },
];

/**
 * Diesel routine engine service (spec section 7). A continuous linear line at
 * R29/h — R29,000 @ 1,000 h rising to R377,000 @ 13,000 h — continued at the
 * same rate to the 20,000 h chart limit. There is no separate overhaul event.
 * The electric machine carries NO mechanical-service line (R0/h) across the
 * whole chart — a genuine long-term advantage, not a missing value.
 */
export const DIESEL_SERVICE = {
  ratePerHour: 29, // R29,000 per 1,000 h
  confidence: 'confirmed',
  note: 'Routine engine service — R29,000 per 1,000 h (R29/h), linear from R29,000 @1,000h to R377,000 @13,000h and continued at the same rate to 20,000 h.',
};

/**
 * Placeholder energy prices — no live feed is wired up yet. Auto-filled into
 * the editable price inputs; always confirm against the customer's real rates.
 */
export const DEFAULT_PRICES = {
  electricityPricePerKWh: 2.80,
  electricityPriceConfidence: 'estimate',
  electricityPriceNote: 'Placeholder default — no single "current" commercial tariff exists. Confirm the customer’s actual rate before presenting.',

  dieselPricePerLiter: 23.50,
  dieselPriceConfidence: 'estimate',
  dieselPriceNote: 'Placeholder default — wire up to the SA official fuel price feed (updates monthly) when available.',
};

export const CALC_DEFAULTS = {
  daysPerWeek: 6,
  weeksPerYear: 50,
  chartMaxHours: 20000, // x-axis limit
  sliceYears: 0.25, // Δt for cumulative-cost stepping
  fleetSizeDefault: 1,
  fleetSizeMax: 4,
  operationSliderDefault: 75,
  operationSliderMin: 50,
  operationSliderMax: 100,
  vatRate: 0.15, // SA VAT
};

/**
 * Annual escalation assumptions (spec section 8) — running costs compound
 * per year; the battery-replacement lump sum DECLINES (batteryReplacement is
 * negative — battery cost is projected to fall).
 */
export const ESCALATION = {
  dieselFuel: 0.06,
  electricity: 0.08,
  maintenance: 0.06, // diesel routine service
  batteryReplacement: -0.05,
};
