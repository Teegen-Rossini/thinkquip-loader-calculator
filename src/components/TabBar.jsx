import './TabBar.css';

export default function TabBar({ tabs, activeTab, onChange }) {
  return (
    <nav className="tab-bar no-print" aria-label="Sections">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={tab.id === activeTab ? 'tab-bar__btn is-active' : 'tab-bar__btn'}
          onClick={() => onChange(tab.id)}
          aria-current={tab.id === activeTab ? 'page' : undefined}
        >
          <span className="tab-bar__index">{tab.index}</span>
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
