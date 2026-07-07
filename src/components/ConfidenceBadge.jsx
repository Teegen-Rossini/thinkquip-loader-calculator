import { CONFIDENCE_META } from '../data/confidenceMeta';

export default function ConfidenceBadge({ confidence, tooltip }) {
  if (!confidence || confidence === 'confirmed') return null;
  const meta = CONFIDENCE_META[confidence];
  if (!meta) return null;
  const description = tooltip || meta.description;
  return (
    <span
      className={`badge badge--${confidence} tooltip-trigger`}
      data-tooltip={description}
      tabIndex={0}
      role="note"
      aria-label={`${meta.label}: ${description}`}
    >
      {meta.label}
    </span>
  );
}
