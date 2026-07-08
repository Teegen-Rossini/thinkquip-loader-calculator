import { DEFAULT_PRICES, MACHINE_OPTIONS, FUEL_THEFT_LEVELS } from '../data/machinesConfig';
import { annualHours, interpolateConsumption, operationBand } from '../lib/calculationEngine';
import ConfidenceBadge from './ConfidenceBadge';
import ConfidenceLegend from './ConfidenceLegend';
import MachineTypeSelector from './MachineTypeSelector';
import { ArrowRightIcon } from './icons';
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

export default function InputForm({ inputs, onUpdate, machineType, onMachineTypeChange, onNext }) {
  const hours = annualHours(inputs);
  const band = operationBand(inputs.operationSlider);
  const cElec = interpolateConsumption('electric', inputs.operationSlider);
  const cDiesel = interpolateConsumption('diesel', inputs.operationSlider);

  const dailyHoursWarning = rangeWarning(inputs.dailyHours, 1, 24, 'h/day');
  const daysPerWeekWarning = rangeWarning(inputs.daysPerWeek, 1, 7, ' days');
  const weeksPerYearWarning = rangeWarning(inputs.weeksPerYear, 1, 52, ' weeks');
  const electricityPriceWarning = inputs.electricityPrice <= 0 ? 'Must be greater than 0.' : rangeWarning(inputs.electricityPrice, 0.5, 8, ' R/kWh');
  const dieselPriceWarning = inputs.dieselPrice <= 0 ? 'Must be greater than 0.' : rangeWarning(inputs.dieselPrice, 10, 45, ' R/L');

  return (
    <form className="input-form" onSubmit={(e) => e.preventDefault()}>
      <div className="input-card input-card--wide">
        <label className="field__label" htmlFor="preparedFor">
          Prepared for <span className="field__optional">(optional — appears on the printed cover page)</span>
        </label>
        <input id="preparedFor" type="text" placeholder="Customer / company name"
          value={inputs.preparedFor}
          onChange={(e) => onUpdate({ preparedFor: e.target.value })} />
      </div>

      <div className="input-grid">
        <section className="input-card input-card--wide">
          <h3>Machine Type</h3>
          <MachineTypeSelector selectedType={machineType} onSelect={onMachineTypeChange} />
        </section>

        <section className="input-card input-card--wide">
          <h3>Machine Option</h3>
          <p className="field__help">Both the SW956E electric and the SYL956H5 diesel are always compared. Wet vs dry brake changes only the diesel purchase price.</p>
          <div className="machine-option-group" role="radiogroup" aria-label="Machine option">
            {MACHINE_OPTIONS.map((opt) => {
              const selected = inputs.machineOption === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  className={selected ? 'machine-option is-active' : 'machine-option'}
                  onClick={() => onUpdate({ machineOption: opt.id })}
                >
                  <span className={`machine-option__type machine-option__type--${opt.type}`}>{opt.type === 'electric' ? 'Electric' : 'Diesel'}</span>
                  <span className="machine-option__label">{opt.label}</span>
                  <span className="machine-option__price mono">R{opt.price.toLocaleString('en-US')} <span className="machine-option__exvat">ex VAT</span></span>
                </button>
              );
            })}
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
            <div className="toggle-group toggle-group--wrap">
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
          <h3>Operation</h3>
          <div className="field">
            <span className="field__label">
              Duty cycle <InfoTip text="Moves consumption between the light/normal/heavy breakpoints. This drives consumption only — never the time axis." />
            </span>
            <div className="slider-labels">
              <span className="slider-labels__band">{band.label} duty</span>
              <span className="mono">{cElec} kWh/h · {cDiesel} L/h</span>
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
              <label className="field__label" htmlFor="electricityPrice">
                Electricity price (R/kWh) <ConfidenceBadge confidence={DEFAULT_PRICES.electricityPriceConfidence} tooltip={DEFAULT_PRICES.electricityPriceNote} />
              </label>
              <input id="electricityPrice" type="number" min="0" step="0.01"
                value={inputs.electricityPrice}
                onChange={(e) => onUpdate({ electricityPrice: Number(e.target.value) })} />
              <Warning>{electricityPriceWarning}</Warning>
            </div>
            <div className="field">
              <label className="field__label" htmlFor="dieselPrice">
                Diesel price (R/L) <ConfidenceBadge confidence={DEFAULT_PRICES.dieselPriceConfidence} tooltip={DEFAULT_PRICES.dieselPriceNote} />
              </label>
              <input id="dieselPrice" type="number" min="0" step="0.01"
                value={inputs.dieselPrice}
                onChange={(e) => onUpdate({ dieselPrice: Number(e.target.value) })} />
              <Warning>{dieselPriceWarning}</Warning>
            </div>
          </div>
          <p className="field__help">Auto-filled placeholder defaults — always confirm against the customer’s actual rates before presenting.</p>
        </section>

        <section className="input-card">
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
      </div>

      <div className="input-card input-card--wide input-card--vat">
        <label className="vat-toggle">
          <input type="checkbox" checked={inputs.vatInclusive} onChange={(e) => onUpdate({ vatInclusive: e.target.checked })} />
          <span>Show prices including VAT (15%)</span>
        </label>
      </div>

      <div className="input-form__footer">
        <ConfidenceLegend />
        <button type="button" className="btn-cta" onClick={onNext}>
          Next: Comparison <ArrowRightIcon />
        </button>
      </div>
    </form>
  );
}
