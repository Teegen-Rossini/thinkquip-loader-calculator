import { useEffect, useState } from 'react';
import { DEFAULT_PRICES, CALC_DEFAULTS, THINKQUIP_LOGO } from './data/machinesConfig';
import { runSelection } from './lib/calculationEngine';
import Dashboard from './components/Dashboard';
import InputForm from './components/InputForm';
import TabBar from './components/TabBar';
import FleetSizeToggle from './components/FleetSizeToggle';
import HeroStat from './components/HeroStat';
import ComparatorCard from './components/ComparatorCard';
import CostChart from './components/CostChart';
import LifecycleEventsTable from './components/LifecycleEventsTable';
import CalculationView from './components/CalculationView';
import PageNav from './components/PageNav';
import SummaryTable from './components/SummaryTable';
import PrintCover from './components/PrintCover';
import PrintSummary from './components/PrintSummary';
import './App.css';

const DRAFT_STORAGE_KEY = 'thinkquip-loader-calc-draft-v2';

const defaultInputs = {
  preparedFor: '',
  machineOptions: ['electric', 'diesel-dry'],
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
    const parsed = JSON.parse(saved);
    const merged = { ...defaultInputs, ...parsed };
    // Migrate the old single-select `machineOption` → multi-select `machineOptions`.
    // The legacy model always showed electric plus one diesel variant.
    if (!Array.isArray(merged.machineOptions)) {
      const legacy = parsed.machineOption;
      const dieselVariant = legacy && legacy !== 'electric' ? legacy : 'diesel-dry';
      merged.machineOptions = ['electric', dieselVariant];
    }
    if (!merged.machineOptions.length) merged.machineOptions = ['electric'];
    delete merged.machineOption;
    return merged;
  } catch {
    return defaultInputs;
  }
}

const TABS = [
  { id: 'inputs', index: '01', label: 'Inputs' },
  { id: 'comparison', index: '02', label: 'Comparison' },
  { id: 'chart', index: '03', label: 'Cost Over Time' },
  { id: 'calculation', index: '04', label: 'Calculations' },
  { id: 'details', index: '05', label: 'Spec Sheet' },
];

function App() {
  const [inputs, setInputs] = useState(loadDraftInputs);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [machineType, setMachineType] = useState('loader');

  useEffect(() => {
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(inputs));
  }, [inputs]);

  const updateInputs = (patch) => setInputs((prev) => ({ ...prev, ...patch }));
  const setFleetSize = (fleetSize) => updateInputs({ fleetSize });

  // Toggle a machine option in/out of the selected set, always keeping ≥1.
  const toggleMachineOption = (id) => setInputs((prev) => {
    const current = Array.isArray(prev.machineOptions) ? prev.machineOptions : [];
    const has = current.includes(id);
    if (has && current.length === 1) return prev; // can't deselect the last one
    const next = has ? current.filter((x) => x !== id) : [...current, id];
    return { ...prev, machineOptions: next };
  });

  const selection = runSelection({ inputs, fleetSize: inputs.fleetSize });

  const isDashboard = activeTab === 'dashboard';
  const panelClass = (id) => `tab-panel${id === 'inputs' ? ' tab-panel--inputs no-print' : ' tab-panel--result'}${activeTab === id ? ' is-active' : ''}`;

  return (
    <>
      <div className="app-topbar">
        <header className="app-header">
          <div className="app-header__inner">
            <div
              className="app-header__titles"
              role="button"
              tabIndex={0}
              onClick={() => setActiveTab('dashboard')}
              onKeyDown={(e) => e.key === 'Enter' && setActiveTab('dashboard')}
            >
              <span className="app-header__lockup">
                <img src={THINKQUIP_LOGO} alt="ThinkQuip" className="app-header__logo" />
                <span className="app-header__tagline">Authorized SANY Distributor</span>
              </span>
              <span className="app-header__divider" aria-hidden="true" />
              <span className="app-header__subtitle">SANY Electric Loader Savings Calculator</span>
            </div>
            <button type="button" className="print-btn no-print" onClick={() => window.print()}>
              Print / Save as PDF
            </button>
          </div>
        </header>

        {!isDashboard && <TabBar tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />}
      </div>

      <main className="app-body">
        <div className={`tab-panel no-print${isDashboard ? ' is-active' : ''}`}>
          <Dashboard onStart={() => setActiveTab('inputs')} />
        </div>

        <PrintCover selection={selection} inputs={inputs} />
        <PrintSummary inputs={inputs} />

        <section className={panelClass('inputs')}>
          <InputForm
            inputs={inputs}
            onUpdate={updateInputs}
            machineType={machineType}
            onMachineTypeChange={setMachineType}
            onToggleMachineOption={toggleMachineOption}
          />
          <PageNav
            nextLabel="Comparison"
            onNext={() => setActiveTab('comparison')}
          />
        </section>

        <section className={panelClass('comparison')}>
          <FleetSizeToggle fleetSize={inputs.fleetSize} onChange={setFleetSize} />
          <HeroStat selection={selection} fleetSize={inputs.fleetSize} inputs={inputs} />
          <h3 className="section-heading">
            {selection.hasComparison ? 'Machines compared' : 'Selected machine'}
          </h3>
          <div className="comparator-grid">
            {selection.machines.map((result) => (
              <ComparatorCard key={result.machine.uid} result={result} selection={selection} inputs={inputs} />
            ))}
          </div>
          <PageNav
            prevLabel="Inputs"
            onPrev={() => setActiveTab('inputs')}
            nextLabel="Cost Over Time"
            onNext={() => setActiveTab('chart')}
          />
        </section>

        <section className={panelClass('chart')}>
          <FleetSizeToggle fleetSize={inputs.fleetSize} onChange={setFleetSize} />
          <div className="chart-details-layout">
            <div className="panel-surface chart-details-layout__chart">
              <h3 className="section-heading section-heading--flush">
                Cumulative cost over operating hours ({inputs.fleetSize} machine{inputs.fleetSize > 1 ? 's' : ''})
              </h3>
              <CostChart selection={selection} />
            </div>
            <div className="chart-details-layout__side">
              <LifecycleEventsTable selection={selection} onViewAssumptions={() => setActiveTab('details')} />
            </div>
          </div>
          <PageNav
            prevLabel="Comparison"
            onPrev={() => setActiveTab('comparison')}
            nextLabel="Calculations"
            onNext={() => setActiveTab('calculation')}
          />
        </section>

        <section className={panelClass('calculation')}>
          <CalculationView selection={selection} inputs={inputs} />
          <PageNav
            prevLabel="Cost Over Time"
            onPrev={() => setActiveTab('chart')}
            nextLabel="Spec Sheet"
            onNext={() => setActiveTab('details')}
          />
        </section>

        <section className={panelClass('details')}>
          <SummaryTable selection={selection} inputs={inputs} />
          <PageNav
            prevLabel="Calculations"
            onPrev={() => setActiveTab('calculation')}
            onPrint={() => window.print()}
          />
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
