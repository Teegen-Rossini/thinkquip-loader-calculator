import { CALC_DEFAULTS } from '../data/machinesConfig';
import { formatHours, formatYearsFromHours } from '../lib/format';
import './TimeWindowSlider.css';

/**
 * The comparison time-window slider (0 → chart limit, default the limit).
 * Its track is the two-colour "who is cheaper" bar: each stretch is coloured
 * by the machine with the lower total cost of ownership there, and the colour
 * change point IS the crossover hour shown everywhere else (the segments come
 * from the engine's cheaperSegments). One machine → one solid colour.
 * The slider's value drives every window-dependent figure — and is what the
 * printed brochure uses, so set it to the hours the customer expects to
 * sell/replace at before printing.
 */
export default function TimeWindowSlider({ selection, windowHours, onChange }) {
  const maxHours = CALC_DEFAULTS.chartMaxHours;
  const { segments, machines, hoursPerYear } = selection;

  const colorFor = (uid) =>
    machines.find((m) => m.machine.uid === uid)?.machine.chartColor ?? 'var(--border)';

  const gradient = segments.length
    ? `linear-gradient(to right, ${segments
        .flatMap((s) => {
          const c = colorFor(s.uid);
          return [`${c} ${(s.from / maxHours) * 100}%`, `${c} ${(s.to / maxHours) * 100}%`];
        })
        .join(', ')})`
    : 'var(--border)';

  return (
    <div className="window-slider">
      <div className="window-slider__head">
        <span className="window-slider__label">
          Comparison window
          <span className="tooltip-trigger info-tip" tabIndex={0} role="note"
            data-tooltip="Every figure on this page is measured at this point in the machine's life. The bar colour shows which machine is cheaper at each point — the colour change is the crossover. This window also drives the printed brochure."
            aria-label="Every figure on this page is measured at this point in the machine's life.">?</span>
        </span>
        <span className="window-slider__value mono">
          {formatHours(windowHours)} <span className="window-slider__years">≈ {formatYearsFromHours(windowHours, hoursPerYear)} at your hours</span>
        </span>
      </div>

      <input
        type="range"
        min="0"
        max={maxHours}
        step="250"
        value={windowHours}
        style={{ '--track': gradient }}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label="Comparison window in operating hours"
      />

      <div className="window-slider__scale mono" aria-hidden="true">
        <span>0</span>
        <span>{formatHours(maxHours / 3)}</span>
        <span>{formatHours((maxHours / 3) * 2)}</span>
        <span>{formatHours(maxHours)}</span>
      </div>
    </div>
  );
}
