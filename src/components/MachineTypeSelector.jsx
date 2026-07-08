import { MACHINE_TYPES } from '../data/machinesRepo';
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

/** JSON machine-type ids whose icon file uses a different stem. */
const ICON_ALIASES = { 'wheel-loader': 'loader' };

/**
 * Future machine ranges shown as disabled "coming soon" tiles. A range goes
 * live by adding a machineType with its models to src/data/machines.json —
 * live types always come from the JSON, not from this list.
 */
const COMING_SOON = [
  { id: 'excavator', label: 'Excavator', icon: 'excavator' },
  { id: 'dumptruck', label: 'Dump Truck', icon: 'dump-truck' },
  { id: 'mobilecrane', label: 'Mobile Crane', icon: 'mobile-crane' },
  { id: 'reachstacker', label: 'Reach Stacker', icon: 'reach-stacker' },
  { id: 'roller', label: 'Roller', icon: 'roller' },
  { id: 'drillingrig', label: 'Drilling Rig', icon: 'drilling-rig' },
  { id: 'concretepump', label: 'Concrete Pump', icon: 'concrete-pump' },
];

// How many tiles the picker shows in total; live types come first and the
// remaining slots are filled with "coming soon" placeholders.
const VISIBLE_COUNT = 3;

export default function MachineTypeSelector({ selectedType, onSelect }) {
  const liveTypes = MACHINE_TYPES.map((t) => ({
    id: t.id,
    label: t.displayName,
    sublabel: `${t.models.length} model${t.models.length === 1 ? '' : 's'}`,
    icon: ICON_ALIASES[t.id] ?? t.id,
    available: true,
  }));
  const placeholders = COMING_SOON
    .filter((p) => !liveTypes.some((t) => t.id === p.id))
    .slice(0, Math.max(0, VISIBLE_COUNT - liveTypes.length))
    .map((p) => ({ ...p, available: false }));
  const visibleTypes = [...liveTypes, ...placeholders];
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
