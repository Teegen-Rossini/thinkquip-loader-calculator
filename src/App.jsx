import { useEffect, useState } from 'react';
import { DEFAULT_PRICES, CALC_DEFAULTS, THINKQUIP_LOGO } from './data/machinesConfig';
import { runComparison } from './lib/calculationEngine';
import Dashboard from './components/Dashboard';
import InputForm from './components/InputForm';
import TabBar from './components/TabBar';
import FleetSizeToggle from './components/FleetSizeToggle';
import HeroStat from './components/HeroStat';
import ConfidenceLegend from './components/ConfidenceLegend';
import ComparatorCard from './components/ComparatorCard';
import CostChart from './components/CostChart';
import LifecycleEventsTable from './components/LifecycleEventsTable';
import CalculationView from './components/CalculationView';
import SummaryTable from './components/SummaryTable';
import PrintCover from './components/PrintCover';
import PrintSummary from './components/PrintSummary';
import './App.css';

const DRAFT_STORAGE_KEY = 'thinkquip-loader-calc-draft';

const defaultInputs = {
  preparedFor: '',
  machineOption: 'diesel-dry',
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
};

function loadDraftInputs() {
  try {
    const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!saved) return defaultInputs;
    return { ...defaultInputs, ...JSON.parse(saved) };
  } catch {
    return defaultInputs;
  }
}

const TABS = [
  { id: 'inputs', index: '01', label: 'Inputs' },
  { id: 'comparison', index: '02', label: 'Comparison' },
  { id: 'chart', index: '03', label: 'Cost Over Time' },
  { id: 'calculation', index: '04', label: 'Calculation' },
  { id: 'details', index: '05', label: 'Spec Sheet' },
];

function App() {
  const [inputs, setInputs] = useState(loadDraftInputs);
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(inputs));
  }, [inputs]);

  const updateInputs = (patch) => setInputs((prev) => ({ ...prev, ...patch }));
  const setFleetSize = (fleetSize) => updateInputs({ fleetSize });

  const comparison = runComparison({ inputs, fleetSize: inputs.fleetSize });
  const { electricMachine, dieselMachine, electric, diesel } = comparison;

  const isDashboard = activeTab === 'dashboard';
  const panelClass = (id) => `tab-panel${id === 'inputs' ? ' tab-panel--inputs no-print' : ' tab-panel--result'}${activeTab === id ? ' is-active' : ''}`;

  return (
    <>
      <header className="app-header">
        <div className="app-header__inner">
          <div
            className="app-header__titles"
            role="button"
            tabIndex={0}
            onClick={() => setActiveTab('dashboard')}
            onKeyDown={(e) => e.key === 'Enter' && setActiveTab('dashboard')}
          >
            <img src={THINKQUIP_LOGO} alt="ThinkQuip" className="app-header__logo" />
            <span className="app-header__divider" aria-hidden="true" />
            <span className="app-header__subtitle">SANY Electric Loader Savings Calculator</span>
          </div>
          <button type="button" className="print-btn no-print" onClick={() => window.print()}>
            Print / Save as PDF
          </button>
        </div>
      </header>

      {!isDashboard && <TabBar tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />}

      <main className="app-body">
        <div className={`tab-panel no-print${isDashboard ? ' is-active' : ''}`}>
          <Dashboard onStart={() => setActiveTab('inputs')} />
        </div>

        <PrintCover comparison={comparison} inputs={inputs} />
        <PrintSummary inputs={inputs} comparison={comparison} />

        <section className={panelClass('inputs')}>
          <InputForm inputs={inputs} onUpdate={updateInputs} onNext={() => setActiveTab('comparison')} />
        </section>

        <section className={panelClass('comparison')}>
          <FleetSizeToggle fleetSize={inputs.fleetSize} onChange={setFleetSize} />
          <HeroStat comparison={comparison} fleetSize={inputs.fleetSize} />
          <h3 className="section-heading">Machines compared</h3>
          <div className="comparator-grid">
            <ComparatorCard machine={electricMachine} result={electric} comparison={comparison} inputs={inputs} isElectric />
            <ComparatorCard machine={dieselMachine} result={diesel} comparison={comparison} inputs={inputs} isElectric={false} />
          </div>
          <ConfidenceLegend />
        </section>

        <section className={panelClass('chart')}>
          <FleetSizeToggle fleetSize={inputs.fleetSize} onChange={setFleetSize} />
          <div className="chart-details-layout">
            <div className="panel-surface chart-details-layout__chart">
              <h3 className="section-heading section-heading--flush">
                Cumulative cost over operating hours ({inputs.fleetSize} machine{inputs.fleetSize > 1 ? 's' : ''})
              </h3>
              <CostChart comparison={comparison} />
            </div>
            <div className="chart-details-layout__side">
              <LifecycleEventsTable comparison={comparison} onViewAssumptions={() => setActiveTab('details')} />
            </div>
          </div>
        </section>

        <section className={panelClass('calculation')}>
          <CalculationView comparison={comparison} inputs={inputs} />
        </section>

        <section className={panelClass('details')}>
          <ConfidenceLegend />
          <SummaryTable comparison={comparison} inputs={inputs} />
        </section>
      </main>

      {!isDashboard && (
        <footer className="app-footer">
          <p>
            Projections apply researched annual escalation trends (diesel, electricity, routine service and battery
            replacement costs) to the operating inputs and manufacturer figures shown above &mdash; not a forecast of your
            business income. Figures marked &ldquo;Estimate&rdquo; should be confirmed before being used in a final
            proposal. Planning estimate only &mdash; final pricing, maintenance, finance and availability must be confirmed
            before purchase.
          </p>
        </footer>
      )}
    </>
  );
}

export default App;
