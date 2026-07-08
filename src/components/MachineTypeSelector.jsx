import './MachineTypeSelector.css';

/**
 * Machine-type icons live in src/thinkquip-assets/machine-types/ and are matched
 * to a tile by filename stem (e.g. loader.png -> icon: 'loader'). See the README
 * in that folder. Drop images in and they appear — no code change needed.
 */
const ICON_MODULES = import.meta.glob(
  '../thinkquip-assets/machine-types/*.{png,jpg,jpeg,webp,svg}',
  { eager: true, query: '?url', import: 'default' },
);

const ICON_URLS = {};
for (const [path, url] of Object.entries(ICON_MODULES)) {
  const stem = path.split('/').pop().replace(/\.[^.]+$/, '');
  ICON_URLS[stem] = url;
}

/**
 * The machine categories the picker offers. Only 'loader' is live — selecting it
 * loads the loader comparison (SANY SW956E electric vs the SANY SYL956H5 diesel,
 * per machinesConfig). The rest are placeholders for future machine ranges.
 */
const MACHINE_TYPES = [
  { id: 'loader', label: 'Loader', sublabel: 'Wheel Loader', icon: 'loader', available: true },
  { id: 'excavator', label: 'Excavator', icon: 'excavator', available: false },
  { id: 'dumptruck', label: 'Dump Truck', icon: 'dump-truck', available: false },
  { id: 'mobilecrane', label: 'Mobile Crane', icon: 'mobile-crane', available: false },
  { id: 'reachstacker', label: 'Reach Stacker', icon: 'reach-stacker', available: false },
  { id: 'roller', label: 'Roller', icon: 'roller', available: false },
  { id: 'drillingrig', label: 'Drilling Rig', icon: 'drilling-rig', available: false },
  { id: 'concretepump', label: 'Concrete Pump', icon: 'concrete-pump', available: false },
];

// Only the first few types are shown for now; the rest stay defined above so
// they can be switched back on by bumping this count.
const VISIBLE_COUNT = 3;

export default function MachineTypeSelector({ selectedType, onSelect }) {
  const visibleTypes = MACHINE_TYPES.slice(0, VISIBLE_COUNT);
  return (
    <div className="machine-type-grid" style={{ '--type-cols': Math.min(visibleTypes.length, 4) }}>
      {visibleTypes.map(({ id, label, sublabel, icon, available }) => {
        const isActive = available && selectedType === id;
        const iconUrl = ICON_URLS[icon];
        return (
          <button
            type="button"
            key={id}
            className={`machine-type-card${isActive ? ' machine-type-card--active' : ''}${available ? '' : ' machine-type-card--soon'}`}
            onClick={() => available && onSelect(id)}
            disabled={!available}
            aria-pressed={isActive}
          >
            <span className="machine-type-card__thumb">
              {iconUrl
                ? <img src={iconUrl} alt="" className="machine-type-card__icon" loading="lazy" />
                : <span className="machine-type-card__thumb-empty" aria-hidden="true" />}
            </span>
            <span className="machine-type-card__label">{label}</span>
            <span className="machine-type-card__sub">{available ? sublabel : 'Coming soon'}</span>
            {isActive && <span className="machine-type-card__check" aria-hidden="true">✓</span>}
          </button>
        );
      })}
    </div>
  );
}
