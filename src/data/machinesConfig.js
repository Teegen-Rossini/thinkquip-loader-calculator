/**
 * Fixed-variable data — spec sections 1-3.
 * This is the ONLY place manufacturer specs, prices, consumption and
 * maintenance figures should live. As real dealer quotes come back
 * (see spec section 7), update the values here — nothing in the
 * calculation engine or components should need to change.
 *
 * confidence: 'confirmed' | 'estimate' | 'unconfirmed'
 *   confirmed   — from factory docs / manufacturer's own published data
 *   estimate    — a reasoned figure (e.g. scaled from real telematics data
 *                 of a comparable machine), flagged to the user, pending a
 *                 real quote or manufacturer-published number
 *   unconfirmed — no usable number yet (renders as "Pending quote" in the UI)
 */

import thinkquipLogo from '../thinkquip-assets/logos/thinkquip-logo.png';
import sanyLogo from '../thinkquip-assets-v3/logos-transparent/sany-logo.png';
import catLogo from '../thinkquip-assets-v3/logos-transparent/cat-logo.png';
import komatsuLogo from '../thinkquip-assets-v3/logos-transparent/komatsu-logo.png';
import volvoLogo from '../thinkquip-assets-v3/logos-transparent/volvo-logo.png';

import sanyElectricPhoto from '../thinkquip-assets-v3/machines-cutout/sany-sw956e-electric.png';
import sanyDieselPhoto from '../thinkquip-assets-v3/machines-cutout/sany-syl956h5-diesel.png';
import catPhoto from '../thinkquip-assets-v3/machines-cutout/cat-950m.png';
import komatsuPhoto from '../thinkquip-assets-v3/machines-cutout/komatsu-wa380-8.png';
import volvoPhoto from '../thinkquip-assets-v3/machines-cutout/volvo-l120h.png';

/** Brand & UI color system — spec section 2. Use these exact hex values. */
export const COLORS = {
  thinkquipTurquoise: '#0AA6A0', // app chrome, header, nav, primary CTA only
  sanyRed: '#E2231A', // SANY logo native red — always, regardless of variant
  sanyElectricAccent: '#6BB8E0', // sky blue — SW956E card / chart line / highlights
  sanyDieselAccent: '#F2A93E', // amber-yellow — SYL956H5 card / chart line
  competitorYellow: '#FFC72C', // shared competitor accent (CAT / Komatsu / Volvo)
  competitorBlack: '#1A1A1A',
};

export const THINKQUIP_LOGO = thinkquipLogo;

export const ELECTRIC_MACHINE = {
  id: 'sw956e',
  type: 'electric',
  brand: 'SANY',
  name: 'SW956E',
  displayName: 'SANY SW956E (Electric)',
  logo: sanyLogo,
  logoColor: COLORS.sanyRed,
  photo: sanyElectricPhoto,
  accentColor: COLORS.sanyElectricAccent,
  chartColor: COLORS.sanyElectricAccent,
  chartDash: undefined, // solid

  operatingWeightKg: 19000,
  ratedLoadKg: 5800,
  bucketCapacityM3: [2.7, 5.0],

  machineCost: 3450000,
  costConfidence: 'confirmed',

  // Only one flat rate is published (SANY's own worked example) — not yet
  // broken out by light/heavy duty cycle, so both ends of the operation-mix
  // slider use the same number until real duty-cycle data exists.
  consumption: {
    light: 38,
    heavy: 38,
    unit: 'kWh/h',
    confidence: 'confirmed',
    note: 'Flat rate from SANY’s own worked example; not yet broken out by duty cycle.',
  },

  maintenance: {
    at2000: 53877,
    at3000: 75377,
    confidence: 'confirmed',
  },

  warranty: {
    machine: '24 mo / 5,000 h',
    battery: '60 mo / 10,000 h (battery, drive motor, electric control)',
    driveline: '24 mo / 5,000 h (axle, hydraulic pump, gearbox)',
    confidence: 'confirmed',
  },

  battery: {
    capacityKWh: 422,
    chargerRatingKW: 320,
    chargingPortsPerMachine: 2,
    workingHoursPerCharge: [7, 9],
    chargeTimeHours: { to80: 0.8, to100: 1.5 },
    chargeCycles: 4000,
    totalOperatingLifeHours: [30000, 35000],
    lifeHours: 32500, // midpoint of confirmed 30,000-35,000h range
    replacementCost: 1120000,
    confidence: 'confirmed',
  },
};

export const DIESEL_MACHINES = [
  {
    id: 'syl956h5',
    type: 'diesel',
    brand: 'SANY',
    name: 'SYL956H5 (Dry Brake)',
    displayName: 'SANY SYL956H5 (Diesel — Dry Brake)',
    isDefault: true, // baseline diesel — shown as its own top-level option, selected by default (user-removable)
    logo: sanyLogo,
    logoColor: COLORS.sanyRed,
    photo: sanyDieselPhoto,
    accentColor: COLORS.sanyDieselAccent,
    chartColor: COLORS.sanyDieselAccent,
    chartDash: undefined, // solid

    operatingWeightKg: 17100,
    ratedLoadKg: 5000,
    fuelTankL: 300,

    machineCost: 1850000,
    costConfidence: 'confirmed',

    consumption: {
      light: 14,
      heavy: 14,
      medium: 14,
      unit: 'L/h',
      confidence: 'confirmed',
      note: 'Flat rate (medium duty) from SANY’s own worked example.',
    },

    maintenance: {
      at2000: 74873,
      at3000: 91373,
      confidence: 'confirmed',
    },

    warranty: {
      machine: '12 mo / 2,000 h (SANY standard diesel line warranty)',
      confidence: 'confirmed',
    },
  },
  {
    // Same machine as the SYL956H5 above — the only difference is the wet-brake
    // (wet disc / oil-immersed) axle option, which carries a higher purchase price.
    id: 'syl956h5_wet',
    type: 'diesel',
    brand: 'SANY',
    name: 'SYL956H5 (Wet Brake)',
    displayName: 'SANY SYL956H5 (Diesel — Wet Brake)',
    isDefault: false, // optional variant — offered alongside the dry-brake baseline
    logo: sanyLogo,
    logoColor: COLORS.sanyRed,
    photo: sanyDieselPhoto,
    accentColor: COLORS.sanyDieselAccent,
    chartColor: COLORS.sanyDieselAccent,
    chartDash: '7 5', // dashed — same amber as the dry-brake line, but distinguishable on the chart

    operatingWeightKg: 17100,
    ratedLoadKg: 5000,
    fuelTankL: 300,

    machineCost: 2200000,
    costConfidence: 'confirmed',

    consumption: {
      light: 14,
      heavy: 14,
      medium: 14,
      unit: 'L/h',
      confidence: 'confirmed',
      note: 'Flat rate (medium duty) from SANY’s own worked example.',
    },

    maintenance: {
      at2000: 74873,
      at3000: 91373,
      confidence: 'confirmed',
    },

    warranty: {
      machine: '12 mo / 2,000 h (SANY standard diesel line warranty)',
      confidence: 'confirmed',
    },
  },
  {
    id: 'cat950m',
    type: 'diesel',
    brand: 'CAT',
    name: '950M/GC',
    displayName: 'CAT 950M/GC',
    isDefault: false,
    hidden: true, // temporarily removed from the comparison options — data kept for easy re-enable
    logo: catLogo,
    logoColor: COLORS.competitorBlack,
    photo: catPhoto,
    accentColor: COLORS.competitorYellow,
    chartColor: COLORS.competitorBlack,
    chartDash: undefined, // solid — distinguishes it from the other two competitors

    operatingWeightKg: 19069,
    bucketCapacityM3: [2.7, 4.4],

    machineCost: 2900000,
    costConfidence: 'unconfirmed', // Pending Quote

    consumption: {
      light: 8.8, // midpoint of published 7.3-10.3 range
      heavy: 13.65, // midpoint of published 12.4-14.9 range
      medium: 11.35, // midpoint of published 10.3-12.4 range
      unit: 'L/h',
      confidence: 'confirmed',
      note: 'From CAT’s official Owning & Operating Cost Guide (Ed. 46), real Product Link telematics data. Light/heavy values are midpoints of the published ranges.',
    },

    maintenance: {
      at2000: null,
      at3000: null,
      confidence: 'unconfirmed', // Pending Quote
    },

    warranty: {
      confidence: 'unconfirmed', // Pending Quote
    },
  },
  {
    id: 'komatsu_wa380',
    type: 'diesel',
    brand: 'Komatsu',
    name: 'WA380-8',
    displayName: 'Komatsu WA380-8',
    isDefault: false,
    hidden: true, // temporarily removed from the comparison options — data kept for easy re-enable
    logo: komatsuLogo,
    logoColor: COLORS.competitorBlack,
    photo: komatsuPhoto,
    accentColor: COLORS.competitorYellow,
    chartColor: '#3A3A3A',
    chartDash: '7 5', // dashed

    operatingWeightKg: 18900,
    bucketCapacityM3: [2.7, 3.3],

    machineCost: 2800000,
    costConfidence: 'unconfirmed', // Pending Quote

    consumption: {
      light: 6.5,
      heavy: 12.5,
      medium: 9.5,
      unit: 'L/h',
      confidence: 'estimate',
      note: 'Scaled from CAT’s real telematics data by engine power ratio — a reasoned estimate, not a manufacturer-published figure. Genuine older-gen Komatsu (WA380-3) figures run much higher but reflect an outdated engine.',
    },

    maintenance: {
      at2000: null,
      at3000: null,
      confidence: 'unconfirmed', // Pending Quote
    },

    warranty: {
      confidence: 'unconfirmed', // Pending Quote
    },
  },
  {
    id: 'volvo_l120h',
    type: 'diesel',
    brand: 'Volvo',
    name: 'L120H',
    displayName: 'Volvo L120H',
    isDefault: false,
    hidden: true, // temporarily removed from the comparison options — data kept for easy re-enable
    logo: volvoLogo,
    logoColor: COLORS.competitorBlack,
    photo: volvoPhoto,
    accentColor: COLORS.competitorYellow,
    chartColor: '#5C5C5C',
    chartDash: '1 4', // dotted

    operatingWeightKg: 20000,
    bucketCapacityM3: [3.0, 3.6],

    machineCost: 2800000,
    costConfidence: 'unconfirmed', // Pending Quote

    consumption: {
      light: 6.5,
      heavy: 11,
      medium: 9,
      unit: 'L/h',
      confidence: 'estimate',
      note: 'Same CAT telematics baseline, adjusted for Volvo’s documented efficiency claims — a reasoned estimate, not a manufacturer-published figure. Volvo does not publish absolute L/h figures.',
    },

    maintenance: {
      at2000: null,
      at3000: null,
      confidence: 'unconfirmed', // Pending Quote
    },

    warranty: {
      confidence: 'unconfirmed', // Pending Quote
    },
  },
];

export const ALL_MACHINES = [ELECTRIC_MACHINE, ...DIESEL_MACHINES];

/**
 * Prices, one-time costs and calc defaults that aren't manufacturer specs —
 * placeholders until the live-ish feeds mentioned in spec section 7 exist.
 */
export const DEFAULT_PRICES = {
  electricityPricePerKWh: 2.80,
  electricityPriceConfidence: 'estimate',
  electricityPriceNote: 'Placeholder default — no single "current" commercial tariff exists. Confirm with the customer’s actual rate before presenting.',

  dieselPricePerLiter: 23.50,
  dieselPriceConfidence: 'estimate',
  dieselPriceNote: 'Placeholder default — wire up to the SA official fuel price feed (updates monthly) per spec section 7.',
};

export const ONE_TIME_COSTS = {
  chargerInstallCost: 180000,
  chargerInstallConfidence: 'estimate',
  chargerInstallNote: 'Placeholder — real cost depends on site transformer capacity, DB upgrades and civils. One charger (2 guns) serves 2 machines (2 ports each).',

  solarSystemInstallCost: 650000,
  solarSystemInstallConfidence: 'estimate',
  solarSystemInstallNote: 'Placeholder — solar sizing depends on daily kWh demand; not yet costed.',

  solarEffectivePricePerKWh: 0.50,
  solarEffectivePriceConfidence: 'estimate',
  solarEffectivePriceNote: 'Placeholder blended cost per kWh once a solar system is installed (install capex is costed separately above).',
};

/** Engine overhaul cost model — spec section 4. Applies to every diesel machine. */
export const DIESEL_OVERHAUL = {
  intervalHours: 13500, // midpoint of industry-standard 12,000-15,000h range
  cost: 450000, // midpoint of $15,000-$40,000 USD industry range, converted at ~R16.20/USD
  confidence: 'estimate',
  note: 'Industry-backed estimate (midpoint of published 12,000-15,000h overhaul interval and $15,000-$40,000 cost range), reasoned from industry data rather than a specific manufacturer quote — applies across all diesel machines shown.',
};

export const CALC_DEFAULTS = {
  daysPerWeek: 6,
  weeksPerYear: 50,
  horizonYears: 10,
  horizonYearsMax: 20,
  lifecycleTableHorizonYears: 30, // lifecycle planning table looks further out than the chart
  fleetSizeDefault: 1,
  fleetSizeMax: 4,
  chargingPortsPerCharger: 2, // 2 guns per charger, 2 ports per SW956E
  vatRate: 0.15, // SA VAT
};

/**
 * Annual escalation assumptions — researched industry trends, not flat
 * projections. Running costs compound year-on-year; lifecycle event lump
 * sums are escalated/de-escalated to the cost level of the year they land in.
 */
export const ESCALATION = {
  dieselPrice: 0.06,
  electricityPrice: 0.08,
  maintenance: 0.06,
  dieselOverhaul: 0.06,
  batteryReplacement: -0.05,
};
