// Singapore Dollar Currency Formatting & Tax Calculation Engine
export const GST_RATE = 0.09; // Singapore GST: 9%

export function formatSGD(amount, options = {}) {
  const num = Number(amount);
  if (isNaN(num)) {
    return '$0.00';
  }
  const { showSymbol = true } = options;
  const formatted = Math.abs(num).toLocaleString('en-SG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  const prefix = num < 0 ? '-' : '';
  return showSymbol ? `${prefix}$${formatted}` : `${prefix}${formatted}`;
}

export function calculateGST(subtotal, rate = GST_RATE) {
  const sub = Math.max(0, Number(subtotal) || 0);
  const tax = Math.round(sub * rate * 100) / 100;
  const total = Math.round((sub + tax) * 100) / 100;
  return {
    subtotal: sub,
    tax,
    total,
    ratePercent: Math.round(rate * 100)
  };
}

export function parseCurrency(val) {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (!val) return 0;
  const cleaned = String(val).replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}
