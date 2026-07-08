import { DIESEL_SERVICE, MACHINE_OPTIONS } from '../data/machinesConfig';
import { formatCurrency, formatHours } from '../lib/format';
import { PrintPage, PageHeader, Band, SpecRows, DotLegend } from './PrintKit';

const TINT = { electric: 'var(--sany-electric-light)', diesel: 'var(--sany-diesel-light)' };

function maintenanceRows(machine) {
  return machine.maintenanceSchedule.map((m) => ({
    label: `Maintenance @ ${m.hoursPerYear.toLocaleString('en-US')} h/yr`,
    value: `${formatCurrency(m.costPerYear)}/yr`,
    confidence: m.confidence,
  }));
}

function warrantyRows(machine) {
  return machine.warrantyTiers.map((t) => ({ label: t.item, value: t.terms, confidence: t.confidence }));
}

/** One spec block: turquoise band + ruled rows, kept unbreakable. */
function Block({ title, rows }) {
  return (
    <div className="print-spec__block">
      <Band>{title}</Band>
      <SpecRows rows={rows} />
    </div>
  );
}

/**
 * Brochure section 5 — one full A4 spec sheet per selected SANY machine,
 * modelled on ThinkQuip's physical printed sheets: brand header, machine cutout
 * on a tinted hero panel with the price, then banded two-column spec sections.
 * Figures come from machinesConfig.js and this machine's computed result.
 */
export default function PrintSpecSheet({ result, selection, pageNumber, pageCount, isLast }) {
  const machine = result.machine;
  const isElectric = machine.type === 'electric';
  const per = result.perHour;
  const battery = selection.battery;

  const identity = [
    { label: 'Operating weight', value: `${machine.operatingWeightKg.toLocaleString('en-US')} kg` },
    { label: 'Rated load', value: `${machine.ratedPayloadKg.toLocaleString('en-US')} kg` },
    { label: 'Bucket capacity', value: `${machine.bucketCapacityM3} m³` },
    { label: 'Tyres', value: machine.tyres },
  ];

  const consumption = [
    {
      label: `Rated consumption (${machine.specConsumption.unit})`,
      value: `${machine.specConsumption.value} ${machine.specConsumption.unit}`,
      confidence: machine.specConsumption.confidence,
    },
    {
      label: 'At your selected duty cycle',
      value: isElectric ? `${per.cElec} kWh/h` : `${per.cDiesel} L/h`,
    },
  ];

  const blocks = isElectric
    ? [
        { title: 'Identity', rows: identity },
        {
          title: 'Battery & Charging',
          rows: [
            { label: 'Battery capacity', value: `${machine.battery.capacityKWh} kWh`, confidence: machine.battery.confidence },
            { label: 'Charger (included in price)', value: `${machine.battery.chargerRatingKW} kW`, confidence: machine.battery.confidence },
            { label: 'Charge guns per charger', value: `${machine.battery.gunsPerCharger}` },
            { label: 'Fast charge', value: machine.battery.charge20to80 },
            { label: 'Full charge', value: machine.battery.charge20to100 },
            { label: 'Work per charge', value: machine.battery.workPerCharge },
            { label: 'Battery cycle life', value: machine.battery.cycleLife },
          ],
        },
        { title: 'Consumption', rows: consumption },
        {
          title: 'Life & Maintenance',
          rows: [
            { label: 'Service life', value: machine.serviceLifeHours.label, confidence: machine.serviceLifeHours.confidence },
            ...maintenanceRows(machine),
            {
              label: `Battery replacement @ ${formatHours(machine.batteryReplacement.atHours)}`,
              value: formatCurrency(machine.batteryReplacement.baseCost),
              confidence: machine.batteryReplacement.confidence,
            },
            ...(battery ? [{
              label: 'Projected when it lands (prices falling)',
              value: formatCurrency(battery.escalatedCost),
              confidence: machine.batteryReplacement.confidence,
            }] : []),
          ],
        },
        { title: 'Warranty', rows: warrantyRows(machine) },
        {
          title: 'Price',
          rows: [
            {
              label: 'Selling price (excl. VAT), charger incl.',
              value: formatCurrency(machine.price),
              confidence: machine.priceConfidence,
            },
          ],
        },
      ]
    : [
        { title: 'Identity', rows: identity },
        {
          title: 'Engine & Fuel',
          rows: [
            { label: 'Engine', value: machine.engine },
            { label: 'Fuel tank', value: `${machine.fuelTankL} L` },
          ],
        },
        { title: 'Consumption', rows: consumption },
        {
          title: 'Maintenance',
          rows: [
            { label: 'Routine engine service', value: `R${DIESEL_SERVICE.ratePerHour}/h — continuous`, confidence: DIESEL_SERVICE.confidence },
            ...maintenanceRows(machine),
          ],
        },
        { title: 'Warranty', rows: warrantyRows(machine) },
        {
          title: 'Price',
          rows: MACHINE_OPTIONS.filter((o) => o.type === 'diesel').map((o) => ({
            label: `Selling price (excl. VAT) — ${o.brake} brake`,
            value: formatCurrency(o.price),
            confidence: machine.priceConfidence,
          })),
        },
      ];

  return (
    <PrintPage pageNumber={pageNumber} pageCount={pageCount} isLast={isLast}>
      <PageHeader
        logo={machine.logo}
        logoAlt={machine.brand}
        title="SANY Wheel Loader"
        code={machine.name}
        accent={machine.accentColor}
        logoRight
      />
      <div className="print-spec__hero" style={{ background: TINT[machine.type] }}>
        <img src={machine.photo} alt={machine.displayName} />
        <div className="print-spec__hero-price">
          <p className="print-spec__hero-price-label">{isElectric ? 'Electric wheel loader' : 'Diesel wheel loader'}</p>
          <p className="print-spec__hero-price-value">{formatCurrency(machine.price)}</p>
          <p className="print-spec__hero-price-sub">excl. VAT{isElectric ? ' — 320 kW charger included' : ` — ${machine.brake} brake`}</p>
        </div>
      </div>

      <div className="print-spec__columns">
        {blocks.map((b) => (
          <Block key={b.title} title={b.title} rows={b.rows} />
        ))}
      </div>

      <DotLegend />
    </PrintPage>
  );
}
