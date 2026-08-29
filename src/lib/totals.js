import { num } from './format';

// One place computes a quotation's arithmetic. The editor, the printed sheet,
// the register list and the row written to Postgres all read these same
// numbers, so a total can never differ between the screen and the record.
export function computeTotals(q) {
  const subtotal = (q.items || []).reduce((a, it) => a + num(it.qty) * num(it.rate), 0);

  const dValue = num(q.discount_value);
  let discount = 0;
  if (q.discount_type === 'percent') discount = (subtotal * dValue) / 100;
  else if (q.discount_type === 'flat') discount = dValue;
  if (discount > subtotal) discount = subtotal;

  const taxable = subtotal - discount;
  const rate = num(q.tax_rate);
  const taxed = q.tax_mode === 'intra' || q.tax_mode === 'inter';
  const tax = taxed ? (taxable * rate) / 100 : 0;

  const gross = taxable + tax;
  const roundDelta = q.round_off ? Math.round(gross) - gross : 0;
  const total = gross + roundDelta;

  // TDS is the client's deduction, not our charge -- it never changes the
  // invoice total, only the cash that lands. Shown as a note when asked for.
  const tds = q.show_tds ? taxable * 0.02 : 0;

  return {
    subtotal: round2(subtotal),
    discount: round2(discount),
    taxable: round2(taxable),
    tax: round2(tax),
    roundDelta: round2(roundDelta),
    total: round2(total),
    tds: round2(tds),
    netAfterTds: round2(total - tds),
    rate,
  };
}

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

export const TAX_MODES = [
  { value: 'intra', label: 'CGST + SGST (within state)' },
  { value: 'inter', label: 'IGST (other state)' },
  { value: 'export', label: 'Export — zero-rated (LUT)' },
  { value: 'none', label: 'No tax' },
];

export const STATUSES = ['draft', 'sent', 'accepted', 'declined', 'expired'];
