// Indian digit grouping (1,23,456 rather than 123,456) — the format a buyer
// in this market reads without translating. Mirrors server/src/lib/money.js.
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

/** Whole rupees — order values, thresholds. */
export const money = (n) => (n == null ? '—' : inr.format(Number(n)));

/** Two decimals — unit prices, where paise matter. */
export const unitMoney = (n) => (n == null ? '—' : inrPrecise.format(Number(n)));
