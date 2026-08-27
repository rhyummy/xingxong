// Indian digit grouping (1,23,456 rather than 123,456) — the format a buyer
// in this market reads without translating.
const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

const inrPrecise = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Whole rupees — for order values and thresholds. */
export const money = (n) => (n == null ? '—' : inr.format(n));

/** Two decimals — for unit prices, where paise matter. */
export const unitMoney = (n) => (n == null ? '—' : inrPrecise.format(n));
