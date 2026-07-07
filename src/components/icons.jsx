const base = {
  width: 24,
  height: 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

export function ArrowRightIcon(props) {
  return (
    <svg {...base} width={16} height={16} {...props}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export function InputsIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M9 3h6a1 1 0 0 1 1 1v1H8V4a1 1 0 0 1 1-1Z" />
      <rect x="5" y="5" width="14" height="16" rx="1.5" />
      <path d="M8 11h5M8 14h8M8 17h6" />
    </svg>
  );
}

export function ComparisonIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M12 3v18M12 6l-5 3M12 6l5 3" />
      <path d="M3 9l4 6a4 4 0 0 0 8 0" />
      <path d="M9 9H3M15 9h6" />
      <path d="M13 9l4 6" />
    </svg>
  );
}

export function CostOverTimeIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M4 19h16" />
      <path d="M4 15l4-5 4 3 4-6 4 4" />
      <circle cx="8" cy="10" r="0.6" fill="currentColor" />
      <circle cx="12" cy="13" r="0.6" fill="currentColor" />
      <circle cx="16" cy="7" r="0.6" fill="currentColor" />
    </svg>
  );
}

export function SpecSheetIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M14 3H7a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V8Z" />
      <path d="M14 3v5h5" />
      <path d="M9 13h6M9 16h6M9 10h2" />
    </svg>
  );
}

export function ShieldIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6Z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

export function LifecycleIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M4 12a8 8 0 0 1 14-5.3M20 12a8 8 0 0 1-14 5.3" />
      <path d="M18 3v4h-4M6 21v-4h4" />
    </svg>
  );
}

export function ConfidenceIcon(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="0.6" fill="currentColor" />
    </svg>
  );
}

export function ResearchIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M12 3l2.2 4.9 5.3.6-4 3.7 1.1 5.3L12 14.9 7.4 17.5l1.1-5.3-4-3.7 5.3-.6Z" />
    </svg>
  );
}
