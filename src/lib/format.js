export function formatCurrency(value) {
  return `R${Math.round(value).toLocaleString('en-US')}`;
}

export function formatCurrencyCompact(value) {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `R${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `R${(value / 1_000).toFixed(0)}k`;
  return `R${Math.round(value)}`;
}

export function formatYearLabel(year) {
  return Number.isInteger(year) ? `Yr ${year}` : `Yr ${year.toFixed(1)}`;
}
