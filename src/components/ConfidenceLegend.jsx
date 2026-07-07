import { CONFIDENCE_META } from '../data/confidenceMeta';
import './ConfidenceLegend.css';

const ORDER = ['confirmed', 'estimate', 'unconfirmed'];

export default function ConfidenceLegend() {
  return (
    <div className="confidence-legend">
      <span className="confidence-legend__title">Data confidence:</span>
      {ORDER.map((key) => (
        <span className="confidence-legend__item tooltip-trigger" key={key} data-tooltip={CONFIDENCE_META[key].description} tabIndex={0}>
          <span className={`confidence-legend__dot confidence-legend__dot--${key}`} />
          {CONFIDENCE_META[key].label}
        </span>
      ))}
    </div>
  );
}
