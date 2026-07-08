export function formatCurrency(value) {
  return `R${Math.round(value).toLocaleString('en-US')}`;
}

export function formatCurrencyCompact(value) {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `R${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `R${(value / 1_000).toFixed(0)}k`;
  return `R${Math.round(value)}`;
}

export function formatHours(value) {
  return `${Math.round(value).toLocaleString('en-US')} h`;
}

export function formatHoursCompact(value) {
  if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}k h`;
  return `${Math.round(value)} h`;
}

/** Operating hours expressed as approximate calendar years for a given
 *  hours/year utilization. */
export function formatYearsFromHours(hours, hoursPerYear) {
  if (!hoursPerYear) return '—';
  const years = hours / hoursPerYear;
  return `${years.toFixed(1)} yr`;
}
