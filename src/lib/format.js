// Money, dates and amount-in-words. Kept free of React so the same functions
// run in the browser and in any future server-side PDF job.

export const num = (v) => {
  const n = parseFloat(v);
  return Number.isNaN(n) ? 0 : n;
};

export const symbolFor = (currency) => (currency === 'USD' ? '$' : '₹');

export function money(value, currency = 'INR') {
  const locale = currency === 'USD' ? 'en-US' : 'en-IN';
  return `${symbolFor(currency)} ${num(value).toLocaleString(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function fmtDate(iso) {
  if (!iso) return '—';
  const [y, m, d] = String(iso).split('-');
  if (!y || !m || !d) return String(iso);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${d} ${months[parseInt(m, 10) - 1]} ${y}`;
}

export function isoToday(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

// Indian financial year label: 15 Aug 2026 -> '2026-27'. Mirrors fy_label() in
// the database; both must agree or the register groups wrongly.
export function fyLabel(iso) {
  const d = iso ? new Date(iso) : new Date();
  const y = d.getFullYear();
  const start = d.getMonth() >= 3 ? y : y - 1;
  return `${start}-${String(start + 1).slice(-2)}`;
}

const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
  'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function under1000(n) {
  const out = [];
  if (n >= 100) {
    out.push(ONES[Math.floor(n / 100)], 'Hundred');
    n %= 100;
  }
  if (n >= 20) {
    out.push(TENS[Math.floor(n / 10)]);
    n %= 10;
  }
  if (n > 0) out.push(ONES[n]);
  return out.join(' ').trim();
}

// Lakh/crore grouping -- an Indian client reads "One Lakh Seventy Seven
// Thousand", never "One Hundred Seventy Seven Thousand".
function wordsIndian(n) {
  if (n === 0) return 'Zero';
  const out = [];
  const crore = Math.floor(n / 10000000);
  n %= 10000000;
  const lakh = Math.floor(n / 100000);
  n %= 100000;
  const thousand = Math.floor(n / 1000);
  n %= 1000;
  if (crore) out.push(under1000(crore), 'Crore');
  if (lakh) out.push(under1000(lakh), 'Lakh');
  if (thousand) out.push(under1000(thousand), 'Thousand');
  if (n) out.push(under1000(n));
  return out.join(' ').replace(/\s+/g, ' ').trim();
}

function wordsWestern(n) {
  if (n === 0) return 'Zero';
  const out = [];
  for (const [size, name] of [[1000000000, 'Billion'], [1000000, 'Million'], [1000, 'Thousand']]) {
    const v = Math.floor(n / size);
    if (v) {
      out.push(wordsWestern(v), name);
      n %= size;
    }
  }
  if (n) out.push(under1000(n));
  return out.join(' ').replace(/\s+/g, ' ').trim();
}

export function amountInWords(total, currency = 'INR') {
  const usd = currency === 'USD';
  const abs = Math.abs(num(total));
  const whole = Math.floor(abs);
  const frac = Math.round((abs - whole) * 100);
  const body = usd ? wordsWestern(whole) : wordsIndian(whole);
  let text = `${usd ? 'Dollars' : 'Rupees'} ${body}`;
  if (frac > 0) text += ` and ${under1000(frac)} ${usd ? 'Cents' : 'Paise'}`;
  return `${text} Only`;
}
