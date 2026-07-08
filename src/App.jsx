import { useEffect, useState } from 'react';
import { ELECTRIC_MACHINE, DIESEL_MACHINES, DEFAULT_PRICES, CALC_DEFAULTS, THINKQUIP_LOGO } from './data/machinesConfig';
import { runComparison, buildLifecycleTable } from './lib/calculationEngine';
import Dashboard from './components/Dashboard';
import InputForm from './components/InputForm';
import TabBar from './components/TabBar';
import FleetSizeToggle from './components/FleetSizeToggle';
import HeroStat from './components/HeroStat';
import ConfidenceLegend from './components/ConfidenceLegend';
import ComparatorCard from './components/ComparatorCard';
import CostChart from './components/CostChart';
import LifecycleEventsTable from './components/LifecycleEventsTable';
import SummaryTable from './components/SummaryTable';
import PrintCover from './components/PrintCover';
import PrintSummary from './components/PrintSummary';
import './App.css';

const DRAFT_STORAGE_KEY = 'thinkquip-loader-calc-draft-v2';

const defaultInputs = {
  preparedFor: '',
  isTenderJob: false,
  fuelIncludedInTender: true,
  dailyHours: 8,
  daysPerWeek: CALC_DEFAULTS.daysPerWeek,
  weeksPerYear: CALC_DEFAULTS.weeksPerYear,
  operationMixHeavyPct: 50,
  energySource: 'grid',
  chargingInfraInstalled: true,
  electricityPrice: DEFAULT_PRICES.electricityPricePerKWh,
  dieselPrice: DEFAULT_PRICES.dieselPricePerLiter,
  includeElectric: true,
  selectedComparatorIds: ['syl956h5'],
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
  { id: 'details', index: '04', label: 'Spec Sheet' },
];

function App() {
  const [inputs, setInputs] = useState(loadDraftInputs);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showLifecycleEvents, setShowLifecycleEvents] = useState(true);
  const [machineType, setMachineType] = useState('loader');

  useEffect(() => {
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(inputs));
  }, [inputs]);

  const updateInputs = (patch) => setInputs((prev) => ({ ...prev, ...patch }));
  const setFleetSize = (fleetSize) => updateInputs({ fleetSize });

  const selectedDieselMachines = DIESEL_MACHINES.filter(
    (m) => !m.hidden && inputs.selectedComparatorIds.includes(m.id)
  );
  const optionalDieselMachines = DIESEL_MACHINES.filter((m) => !m.isDefault && !m.hidden);

  const comparison = runComparison({
    electricMachine: ELECTRIC_MACHINE,
    dieselMachines: selectedDieselMachines,
    inputs,
    fleetSize: inputs.fleetSize,
  });

  const { electric, comparators, horizonYears } = comparison;
  const hasComparators = comparators.length > 0;
  const allResults = [{ machine: ELECTRIC_MACHINE, ...electric }, ...comparators];

  const lifecycleTable = hasComparators
    ? buildLifecycleTable({
        electricMachine: ELECTRIC_MACHINE,
        dieselMachines: selectedDieselMachines,
        inputs,
        horizonYears: CALC_DEFAULTS.lifecycleTableHorizonYears,
      })
    : null;

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

        {hasComparators && (
          <PrintCover
            inputs={inputs}
            electricMachine={ELECTRIC_MACHINE}
            electricResult={electric}
            comparators={comparators}
            horizonYears={horizonYears}
          />
        )}
        {hasComparators && <PrintSummary inputs={inputs} />}

        <section className={panelClass('inputs')}>
          <InputForm
            inputs={inputs}
            onUpdate={updateInputs}
            dieselComparators={optionalDieselMachines}
            machineType={machineType}
            onMachineTypeChange={setMachineType}
            onNext={() => setActiveTab('comparison')}
          />
        </section>

        <section className={panelClass('comparison')}>
          {hasComparators ? (
            <>
              <FleetSizeToggle fleetSize={inputs.fleetSize} onChange={setFleetSize} />
              {inputs.includeElectric && (
                <HeroStat electricMachine={ELECTRIC_MACHINE} electricResult={electric} comparators={comparators} horizonYears={horizonYears} fleetSize={inputs.fleetSize} />
              )}
              <h3 className="section-heading">Machines compared</h3>
              <div className="comparator-grid">
                {inputs.includeElectric && (
                  <ComparatorCard
                    machine={ELECTRIC_MACHINE}
                    result={electric}
                    allResults={allResults}
                    horizonYears={horizonYears}
                    isElectric
                  />
                )}
                {comparators.map((c) => (
                  <ComparatorCard
                    key={c.machine.id}
                    machine={c.machine}
                    result={c}
                    breakeven={c.breakeven}
                    allResults={allResults}
                    horizonYears={horizonYears}
                    isElectric={false}
                  />
                ))}
              </div>
              <ConfidenceLegend />
            </>
          ) : (
            <p className="empty-state">Select at least one comparison machine on the Inputs tab to see the cost comparison.</p>
          )}
        </section>

        <section className={panelClass('chart')}>
          {hasComparators ? (
            <>
              <FleetSizeToggle fleetSize={inputs.fleetSize} onChange={setFleetSize} />
              <div className="chart-details-layout">
                <div className="panel-surface chart-details-layout__chart">
                  <h3 className="section-heading section-heading--flush">
                    Cumulative cost over time ({inputs.fleetSize} machine{inputs.fleetSize > 1 ? 's' : ''})
                  </h3>
                  <CostChart
                    electricResult={electric}
                    electricMachine={ELECTRIC_MACHINE}
                    comparators={comparators}
                    horizonYears={horizonYears}
                    showLifecycleEvents={showLifecycleEvents}
                    onToggleLifecycleEvents={setShowLifecycleEvents}
                  />
                </div>
                <div className="chart-details-layout__side">
                  <LifecycleEventsTable table={lifecycleTable} onViewAssumptions={() => setActiveTab('details')} />
                </div>
              </div>
            </>
          ) : (
            <p className="empty-state">Select at least one comparison machine on the Inputs tab to see the cost chart.</p>
          )}
        </section>

        <section className={panelClass('details')}>
          {hasComparators ? (
            <>
              <ConfidenceLegend />
              <SummaryTable
                electricMachine={ELECTRIC_MACHINE}
                electricResult={electric}
                comparators={comparators}
                horizonYears={horizonYears}
                fleetSize={inputs.fleetSize}
                vatInclusive={inputs.vatInclusive}
              />
            </>
          ) : (
            <p className="empty-state">Select at least one comparison machine on the Inputs tab to see the spec sheet.</p>
          )}
        </section>
      </main>

      {!isDashboard && (
        <footer className="app-footer">
          <p>
            Projections apply researched annual escalation trends (diesel, electricity, maintenance, overhaul and battery
            replacement costs) to the operating inputs and manufacturer figures shown above &mdash; not a forecast of your
            business income. Figures marked &ldquo;Estimate&rdquo; or &ldquo;Pending quote&rdquo; should be confirmed before
            being used in a final proposal. Planning estimate only &mdash; final pricing, maintenance, finance and availability
            must be confirmed before purchase.
          </p>
        </footer>
      )}
    </>
  );
}

export default App;
