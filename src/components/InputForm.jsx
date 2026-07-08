import { DEFAULT_PRICES, ELECTRIC_MACHINE, DIESEL_MACHINES } from '../data/machinesConfig';
import { annualHours } from '../lib/calculationEngine';
import ConfidenceBadge from './ConfidenceBadge';
import ConfidenceLegend from './ConfidenceLegend';
import MachineTypeSelector from './MachineTypeSelector';
import { ArrowRightIcon } from './icons';
import './InputForm.css';

const BASELINE_DIESEL = DIESEL_MACHINES.find((m) => m.isDefault);

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

export default function InputForm({ inputs, onUpdate, dieselComparators, machineType, onMachineTypeChange, onNext }) {
  const hours = annualHours(inputs);

  const toggleComparator = (id) => {
    const isSelected = inputs.selectedComparatorIds.includes(id);
    onUpdate({
      selectedComparatorIds: isSelected
        ? inputs.selectedComparatorIds.filter((c) => c !== id)
        : [...inputs.selectedComparatorIds, id],
    });
  };

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
        <section className="input-card">
          <h3>Tender &amp; Fuel Terms</h3>
          <div className="field">
            <span className="field__label">
              Is this a tender job? <InfoTip text="A tender job is priced against a fixed customer contract rate. This affects whether fuel cost counts toward the comparison below." />
            </span>
            <div className="toggle-group">
              <button type="button" className={inputs.isTenderJob ? 'toggle-btn is-active' : 'toggle-btn'}
                onClick={() => onUpdate({ isTenderJob: true })}>Yes</button>
              <button type="button" className={!inputs.isTenderJob ? 'toggle-btn is-active' : 'toggle-btn'}
                onClick={() => onUpdate({ isTenderJob: false })}>No</button>
            </div>
          </div>

          {inputs.isTenderJob && (
            <div className="field">
              <span className="field__label">Fuel cost included in tender?</span>
              <div className="toggle-group toggle-group--wrap">
                <button type="button" className={inputs.fuelIncludedInTender ? 'toggle-btn is-active' : 'toggle-btn'}
                  onClick={() => onUpdate({ fuelIncludedInTender: true })}>Yes — customer pays fuel</button>
                <button type="button" className={!inputs.fuelIncludedInTender ? 'toggle-btn is-active' : 'toggle-btn'}
                  onClick={() => onUpdate({ fuelIncludedInTender: false })}>No — excluded from their cost calc</button>
              </div>
              {!inputs.fuelIncludedInTender && (
                <p className="field__help">Energy cost will be excluded from the comparison below — it isn’t part of what this customer actually pays.</p>
              )}
            </div>
          )}
        </section>

        <section className="input-card">
          <h3>Operation Mix</h3>
          <div className="field">
            <span className="field__label">
              Duty cycle blend <InfoTip text="Blended consumption = heavy% x heavy rate + light% x light rate. Move the slider to match how hard the machine typically works." />
            </span>
            <div className="slider-labels">
              <span>Light duty {100 - inputs.operationMixHeavyPct}%</span>
              <span>Heavy duty {inputs.operationMixHeavyPct}%</span>
            </div>
            <input type="range" min="0" max="100" step="5" className="slider"
              value={inputs.operationMixHeavyPct}
              onChange={(e) => onUpdate({ operationMixHeavyPct: Number(e.target.value) })} />
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
          <h3>Energy Source (Electric Machine)</h3>
          <div className="field">
            <div className="toggle-group">
              <button type="button" className={inputs.energySource === 'grid' ? 'toggle-btn is-active' : 'toggle-btn'}
                onClick={() => onUpdate({ energySource: 'grid' })}>Grid charger</button>
              <button type="button" className={inputs.energySource === 'solar' ? 'toggle-btn is-active' : 'toggle-btn'}
                onClick={() => onUpdate({ energySource: 'solar' })}>Solar</button>
            </div>
          </div>
          <div className="field">
            <span className="field__label">Charging infrastructure already installed?</span>
            <div className="toggle-group">
              <button type="button" className={inputs.chargingInfraInstalled ? 'toggle-btn is-active' : 'toggle-btn'}
                onClick={() => onUpdate({ chargingInfraInstalled: true })}>Yes</button>
              <button type="button" className={!inputs.chargingInfraInstalled ? 'toggle-btn is-active' : 'toggle-btn'}
                onClick={() => onUpdate({ chargingInfraInstalled: false })}>No</button>
            </div>
            {!inputs.chargingInfraInstalled && (
              <p className="field__help">A one-time installation cost will be added to the electric machine’s capital cost.</p>
            )}
          </div>
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
      </div>

      <section className="input-card input-card--wide">
        <h3>Machine Type</h3>
        <MachineTypeSelector selectedType={machineType} onSelect={onMachineTypeChange} />
      </section>

      <section className="input-card input-card--wide">
        <h3>Comparison Machines</h3>
        <div className="comparator-list">
          <label className="comparator-item">
            <input type="checkbox"
              checked={inputs.includeElectric}
              onChange={(e) => onUpdate({ includeElectric: e.target.checked })} />
            <span>{ELECTRIC_MACHINE.displayName}</span>
            <span className={inputs.includeElectric ? 'comparator-item__status comparator-item__status--included' : 'comparator-item__status'}>
              {inputs.includeElectric ? 'Included' : 'Hidden'}
            </span>
          </label>
          <label className="comparator-item">
            <input type="checkbox"
              checked={inputs.selectedComparatorIds.includes(BASELINE_DIESEL.id)}
              onChange={() => toggleComparator(BASELINE_DIESEL.id)} />
            <span>{BASELINE_DIESEL.displayName}</span>
            <span className={inputs.selectedComparatorIds.includes(BASELINE_DIESEL.id) ? 'comparator-item__status comparator-item__status--included' : 'comparator-item__status'}>
              {inputs.selectedComparatorIds.includes(BASELINE_DIESEL.id) ? 'Included' : 'Hidden'}
            </span>
          </label>
          {dieselComparators.map((machine) => {
            const included = inputs.selectedComparatorIds.includes(machine.id);
            return (
              <label className="comparator-item" key={machine.id}>
                <input type="checkbox"
                  checked={included}
                  onChange={() => toggleComparator(machine.id)} />
                <span>{machine.displayName}</span>
                <span className={included ? 'comparator-item__status comparator-item__status--included' : 'comparator-item__status'}>
                  {included ? 'Included' : (machine.costConfidence === 'unconfirmed' ? 'Pending quote' : 'Hidden')}
                </span>
              </label>
            );
          })}
        </div>
      </section>

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
