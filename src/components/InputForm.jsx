import { FUEL_THEFT_LEVELS } from '../data/machinesConfig';
import { getModelsForType } from '../data/machinesRepo';
import { annualHours, interpolateConsumption, operationBand, effectiveMachinePrice } from '../lib/calculationEngine';
import { formatCurrency } from '../lib/format';
import MachineTypeSelector from './MachineTypeSelector';
import MachineName from './MachineName';
import './InputForm.css';

function InfoTip({ text }) {
  return (
    <span className="info-tip tooltip-trigger" data-tooltip={text} tabIndex={0} role="note" aria-label={text}>?</span>
  );
}

function Warning({ children }) {
  if (!children) return null;
  return <p className="field__warning">{children}</p>;
}

function rangeWarning(value, min, max, unit) {
  if (value == null || Number.isNaN(value)) return null;
  if (value < min) return `Unusually low — expected at least ${min}${unit}.`;
  if (value > max) return `Unusually high — expected at most ${max}${unit}.`;
  return null;
}

export default function InputForm({ inputs, onUpdate, onSelectMachineType, onToggleModel }) {
  const selectedModelIds = Array.isArray(inputs.machineModelIds) ? inputs.machineModelIds : [];
  const models = getModelsForType(inputs.machineTypeId);
  const hours = annualHours(inputs);
  const band = operationBand(inputs.operationSlider);
  const cElec = interpolateConsumption('electric', inputs.operationSlider);
  const cDiesel = interpolateConsumption('diesel', inputs.operationSlider);

  const dailyHoursWarning = rangeWarning(inputs.dailyHours, 1, 24, 'h/day');
  const daysPerWeekWarning = rangeWarning(inputs.daysPerWeek, 1, 7, ' days');
  const weeksPerYearWarning = rangeWarning(inputs.weeksPerYear, 1, 52, ' weeks');
  const electricityPriceWarning = inputs.electricityPrice <= 0 ? 'Must be greater than 0.' : rangeWarning(inputs.electricityPrice, 0.5, 8, ' R/kWh');
  const dieselPriceWarning = inputs.dieselPrice <= 0 ? 'Must be greater than 0.' : rangeWarning(inputs.dieselPrice, 10, 45, ' R/L');

  // The raw field value for a machine-price input ('' while cleared); the
  // engine falls back to the default list price via effectiveMachinePrice.
  const priceFieldValue = (model) => inputs.machinePrices?.[model.id] ?? model.price;
  const setMachinePrice = (model, raw) => onUpdate({
    machinePrices: { ...inputs.machinePrices, [model.id]: raw === '' ? '' : Number(raw) },
  });
  // Discount off the LIST price — deliberately never worded as "saving"
  // (that term is the TCO cost-gap figure elsewhere in the app).
  const discountFor = (model) => {
    const entered = effectiveMachinePrice(model, inputs);
    const off = model.price - entered;
    return off > 0 ? { entered, off, pct: Math.round((off / model.price) * 100) } : null;
  };

  return (
    <form className="input-form" onSubmit={(e) => e.preventDefault()}>
      <div className="input-grid">
        <section className="input-card input-card--wide">
          <h3>Machine Type</h3>
          <MachineTypeSelector selectedType={inputs.machineTypeId} onSelect={onSelectMachineType} />
        </section>

        <section className="input-card input-card--wide">
          <h3>Models to Compare</h3>
          <p className="field__help">Select any combination of SANY models to compare — at least one stays selected.</p>
          <div className="machine-option-group" role="group" aria-label="Models to compare">
            {models.map((model) => {
              const selected = selectedModelIds.includes(model.id);
              const isLastSelected = selected && selectedModelIds.length === 1;
              return (
                <button
                  key={model.id}
                  type="button"
                  role="checkbox"
                  aria-checked={selected}
                  className={`machine-option${selected ? ' is-active' : ''}`}
                  onClick={() => onToggleModel(model.id)}
                  title={isLastSelected ? 'At least one model must stay selected' : undefined}
                >
                  <span className="machine-option__photo">
                    <img src={model.photo} alt="" loading="lazy" />
                  </span>
                  <span className="machine-option__body">
                    <MachineName machine={model} className="machine-option__name" />
                    <span className="machine-option__meta">
                      <span className={`machine-option__type machine-option__type--${model.type}`}>{model.type === 'electric' ? 'Electric' : 'Diesel'}</span>
                      <span className="machine-option__price mono">R{effectiveMachinePrice(model, inputs).toLocaleString('en-US')} <span className="machine-option__exvat">excl. VAT</span></span>
                    </span>
                  </span>
                  <span className="machine-option__check" aria-hidden="true">{selected ? '✓' : ''}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="input-card input-card--wide">
          <h3>Machine Prices (R, excl. VAT)</h3>
          <p className="field__help">
            Defaults are the list prices — edit a price to quote a discount; every figure in the tool
            (and the printed brochure) follows the entered price. <InfoTip text="An empty or zero field falls back to that machine's default list price. A price below list shows a discount summary; a price at or above list shows nothing extra." />
          </p>
          <div className="field-row field-row--prices">
            {models.map((model) => {
              const discount = discountFor(model);
              return (
                <div className="field" key={model.id}>
                  <label className="field__label" htmlFor={`price-${model.id}`}>
                    <MachineName machine={model} />
                  </label>
                  <input
                    id={`price-${model.id}`}
                    type="number"
                    min="0"
                    step="10000"
                    value={priceFieldValue(model)}
                    onChange={(e) => setMachinePrice(model, e.target.value)}
                  />
                  <p className="field__help">List price: <span className="mono">{formatCurrency(model.price)}</span></p>
                  {discount && (
                    <p className="field__discount">
                      Discount: {discount.pct}% — {formatCurrency(discount.off)} off list (now {formatCurrency(discount.entered)})
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <section className="input-card input-card--wide">
          <h3>Fleet Size</h3>
          <div className="field">
            <span className="field__label">Number of machines <InfoTip text="Multiplies all costs (capital, energy and service) by the fleet size." /></span>
            <div className="toggle-group">
              {[1, 2, 3, 4].map((n) => (
                <button key={n} type="button" className={inputs.fleetSize === n ? 'toggle-btn is-active' : 'toggle-btn'}
                  onClick={() => onUpdate({ fleetSize: n })}>{n}</button>
              ))}
            </div>
          </div>
        </section>

        <section className="input-card">
          <h3>Fuel Terms</h3>
          <div className="field">
            <span className="field__label">
              Fuel included in rate? <InfoTip text="If the customer’s contract rate does not include diesel fuel, the diesel machine’s fuel cost (and fuel-theft uplift) is dropped from the comparison. Electricity for the electric machine and the R29/h diesel service are always counted." />
            </span>
            <div className="toggle-group">
              <button type="button" className={inputs.fuelIncludedInRate ? 'toggle-btn is-active' : 'toggle-btn'}
                onClick={() => onUpdate({ fuelIncludedInRate: true })}>Yes</button>
              <button type="button" className={!inputs.fuelIncludedInRate ? 'toggle-btn is-active' : 'toggle-btn'}
                onClick={() => onUpdate({ fuelIncludedInRate: false })}>No</button>
            </div>
            {!inputs.fuelIncludedInRate && (
              <p className="field__help">Diesel fuel cost is excluded — electricity and the R29/h diesel service still count.</p>
            )}
          </div>
        </section>

        <section className="input-card">
          <h3>Fuel-Theft Control</h3>
          <div className="field">
            <span className="field__label">
              Site control level <InfoTip text="Diesel fuel cost is multiplied by (1 + θ) to reflect on-site fuel losses. Electricity is never affected." />
            </span>
            <div className="toggle-group toggle-group--vertical">
              {FUEL_THEFT_LEVELS.map((lvl) => (
                <button key={lvl.id} type="button"
                  className={inputs.fuelTheftLevel === lvl.id ? 'toggle-btn is-active' : 'toggle-btn'}
                  onClick={() => onUpdate({ fuelTheftLevel: lvl.id })}>
                  {lvl.label} ({lvl.range})
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="input-card">
          <h3>Duty Cycle</h3>
          <div className="field">
            <span className="field__label">
              Duty cycle <InfoTip text="Moves consumption between the light/normal/heavy breakpoints. This drives consumption only — never the time axis." />
            </span>
            <div className="slider-labels">
              <span className="slider-labels__band">{band.label} duty</span>
              <span className="mono">{Math.round(cElec)} kWh/h · {Math.round(cDiesel)} L/h</span>
            </div>
            <input type="range" min="50" max="100" step="1" className="slider"
              value={inputs.operationSlider}
              onChange={(e) => onUpdate({ operationSlider: Number(e.target.value) })} />
            <div className="slider-scale">
              <span>Light</span><span>Normal</span><span>Heavy</span>
            </div>
          </div>
        </section>

        <section className="input-card">
          <h3>Utilization</h3>
          <div className="field-row">
            <div className="field">
              <label className="field__label" htmlFor="dailyHours">Daily operating hours</label>
              <div className="unit-input">
                <input id="dailyHours" type="number" min="0" max="24" step="0.5"
                  value={inputs.dailyHours}
                  onChange={(e) => onUpdate({ dailyHours: Number(e.target.value) })} />
                <span className="unit-input__suffix">h/day</span>
              </div>
              <Warning>{dailyHoursWarning}</Warning>
            </div>
            <div className="field">
              <label className="field__label" htmlFor="daysPerWeek">Days per week</label>
              <div className="unit-input">
                <input id="daysPerWeek" type="number" min="1" max="7" step="1"
                  value={inputs.daysPerWeek}
                  onChange={(e) => onUpdate({ daysPerWeek: Number(e.target.value) })} />
                <span className="unit-input__suffix">days</span>
              </div>
              <Warning>{daysPerWeekWarning}</Warning>
            </div>
            <div className="field">
              <label className="field__label" htmlFor="weeksPerYear">
                Weeks per year <InfoTip text="Fewer than 52 to account for planned downtime, shutdowns and scheduled maintenance weeks." />
              </label>
              <div className="unit-input">
                <input id="weeksPerYear" type="number" min="1" max="52" step="1"
                  value={inputs.weeksPerYear}
                  onChange={(e) => onUpdate({ weeksPerYear: Number(e.target.value) })} />
                <span className="unit-input__suffix">weeks</span>
              </div>
              <Warning>{weeksPerYearWarning}</Warning>
            </div>
          </div>
          <p className="field__help">Annual operating hours per machine: <strong className="mono">{hours.toLocaleString()} h/yr</strong></p>
        </section>

        <section className="input-card">
          <h3>Energy Prices</h3>
          <div className="field-row">
            <div className="field">
              <label className="field__label" htmlFor="electricityPrice">Electricity price (R/kWh)</label>
              <input id="electricityPrice" type="number" min="0" step="0.01"
                value={inputs.electricityPrice}
                onChange={(e) => onUpdate({ electricityPrice: Number(e.target.value) })} />
              <Warning>{electricityPriceWarning}</Warning>
            </div>
            <div className="field">
              <label className="field__label" htmlFor="dieselPrice">Diesel price (R/L)</label>
              <input id="dieselPrice" type="number" min="0" step="0.01"
                value={inputs.dieselPrice}
                onChange={(e) => onUpdate({ dieselPrice: Number(e.target.value) })} />
              <Warning>{dieselPriceWarning}</Warning>
            </div>
          </div>
          <p className="field__help">Placeholder defaults — confirm the customer’s actual rates before presenting.</p>
        </section>
      </div>

      <div className="input-card input-card--wide input-card--vat">
        <label className="vat-toggle">
          <input type="checkbox" checked={inputs.vatInclusive} onChange={(e) => onUpdate({ vatInclusive: e.target.checked })} />
          <span>Show prices including VAT (15%)</span>
        </label>
      </div>
    </form>
  );
}
