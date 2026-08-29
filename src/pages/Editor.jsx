import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../lib/AuthProvider';
import { supabase } from '../lib/supabase';
import { money, num } from '../lib/format';
import { computeTotals, STATUSES, TAX_MODES } from '../lib/totals';
import { blankItem, blankQuotation, DENSITIES, PRESETS } from '../lib/defaults';
import QuotationSheet from '../components/QuotationSheet';
import PaperStage from '../components/PaperStage';

// Columns the quotations table actually has. Anything else on the object (the
// register view's joined names, for instance) must not be sent to Postgres.
const COLUMNS = [
  'status', 'quote_date', 'valid_until', 'subject', 'prepared_by', 'currency',
  'client_name', 'client_contact', 'client_address', 'client_gstin', 'client_email', 'client_phone',
  'items', 'discount_type', 'discount_value', 'tax_mode', 'tax_rate', 'round_off', 'show_tds',
  'terms', 'bank', 'sign_name', 'sign_role', 'notes',
];

export default function Editor() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { session, business } = useAuth();

  const [quote, setQuote] = useState(() => location.state?.seed || blankQuotation(business));
  const [loading, setLoading] = useState(Boolean(id));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [dirty, setDirty] = useState(false);
  const [density, setDensity] = useState('1');
  const [pane, setPane] = useState('edit'); // small screens only

  // Load an existing quotation.
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    supabase.from('quotations').select('*').eq('id', id).maybeSingle().then(({ data, error: err }) => {
      if (cancelled) return;
      if (err) setError(err.message);
      else if (!data) setError('That quotation does not exist, or is not yours to open.');
      else setQuote(data);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [id]);

  // A brand-new quotation inherits the company's saved defaults.
  useEffect(() => {
    if (id || location.state?.seed || !business) return;
    setQuote((prev) => ({
      ...prev,
      terms: prev.terms || business.default_terms,
      bank: prev.bank || business.default_bank,
      sign_name: prev.sign_name || business.sign_name || '',
      sign_role: prev.sign_role || business.sign_role || '',
    }));
  }, [business, id, location.state]);

  const set = useCallback((patch) => {
    setQuote((prev) => ({ ...prev, ...patch }));
    setDirty(true);
  }, []);

  const setItem = useCallback((index, patch) => {
    setQuote((prev) => {
      const items = prev.items.map((it, i) => (i === index ? { ...it, ...patch } : it));
      return { ...prev, items };
    });
    setDirty(true);
  }, []);

  const moveItem = useCallback((index, delta) => {
    setQuote((prev) => {
      const items = [...prev.items];
      const target = index + delta;
      if (target < 0 || target >= items.length) return prev;
      [items[index], items[target]] = [items[target], items[index]];
      return { ...prev, items };
    });
    setDirty(true);
  }, []);

  const totals = useMemo(() => computeTotals(quote), [quote]);

  async function save() {
    setSaving(true);
    setError('');

    const payload = Object.fromEntries(COLUMNS.map((c) => [c, quote[c]]));
    payload.discount_value = num(quote.discount_value);
    payload.tax_rate = num(quote.tax_rate);
    payload.items = (quote.items || []).map((it) => ({
      desc: it.desc || '', note: it.note || '', qty: num(it.qty), unit: it.unit || 'Nos', rate: num(it.rate),
    }));
    payload.subtotal = totals.subtotal;
    payload.discount_amount = totals.discount;
    payload.taxable = totals.taxable;
    payload.tax_amount = totals.tax;
    payload.total = totals.total;
    if (!payload.valid_until) payload.valid_until = null;

    try {
      if (quote.id) {
        const { data, error: err } = await supabase
          .from('quotations').update(payload).eq('id', quote.id).select().single();
        if (err) throw err;
        setQuote(data);
      } else {
        // The number comes from the database, never from the browser. On the
        // vanishingly rare chance the unique index still rejects the insert
        // (a number issued and inserted between our two calls), ask for the
        // next one and try again rather than showing the user an error.
        let inserted = null;
        for (let attempt = 0; attempt < 3 && !inserted; attempt += 1) {
          const { data: issued, error: rpcErr } = await supabase
            .rpc('next_quotation_number', { d: payload.quote_date });
          if (rpcErr) throw rpcErr;
          const row = Array.isArray(issued) ? issued[0] : issued;

          const { data, error: err } = await supabase
            .from('quotations')
            .insert({
              ...payload,
              quote_no: row.quote_no,
              fy: row.fy,
              seq: row.seq,
              created_by: session.user.id,
            })
            .select()
            .single();

          if (!err) inserted = data;
          else if (err.code !== '23505') throw err;
        }
        if (!inserted) throw new Error('Could not obtain a free quotation number. Try again.');
        setQuote(inserted);
        navigate(`/quotation/${inserted.id}`, { replace: true });
      }
      setDirty(false);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center" style={{ color: 'var(--color-ink-soft)' }}>
        Loading quotation…
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
      {/* ---------------- form ---------------- */}
      <aside
        className={`no-print flex w-full shrink-0 flex-col lg:w-[430px] ${pane === 'edit' ? '' : 'hidden lg:flex'}`}
        style={{ background: 'var(--color-surface)', borderRight: '1px solid var(--color-line)' }}
      >
        <div className="flex flex-wrap items-center gap-2 px-4 py-2.5" style={{ borderBottom: '1px solid var(--color-line)' }}>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-ink-soft)' }}>
              Quotation no.
            </div>
            <div className="text-[14px] font-bold" style={{ fontFamily: 'var(--font-num)' }}>
              {quote.quote_no || <span style={{ color: 'var(--color-ink-soft)' }}>Issued on save</span>}
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {dirty && (
              <span className="text-[11.5px]" style={{ color: 'var(--color-warn)' }}>
                Unsaved
              </span>
            )}
            <button className="btn btn-primary btn-sm" type="button" onClick={save} disabled={saving}>
              {saving ? 'Saving…' : quote.id ? 'Save changes' : 'Save & issue number'}
            </button>
          </div>
        </div>

        {error && (
          <p className="m-3 rounded-lg px-3 py-2 text-[12.5px]"
            style={{ background: '#fbeceb', color: '#8f2a2a', border: '1px solid #f0cfcd' }}>
            {error}
          </p>
        )}

        <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto p-4">
          <Section title="Quotation details" open>
            <Row cols={2}>
              <Field label="Date">
                <input className="fld" type="date" value={quote.quote_date || ''}
                  onChange={(e) => set({ quote_date: e.target.value })} />
              </Field>
              <Field label="Valid until">
                <input className="fld" type="date" value={quote.valid_until || ''}
                  onChange={(e) => set({ valid_until: e.target.value })} />
              </Field>
            </Row>
            <Field label="Subject / project">
              <input className="fld" value={quote.subject || ''} placeholder="E-commerce website — Basic tier build"
                onChange={(e) => set({ subject: e.target.value })} />
            </Field>
            <Row cols={3}>
              <Field label="Prepared by">
                <input className="fld" value={quote.prepared_by || ''} onChange={(e) => set({ prepared_by: e.target.value })} />
              </Field>
              <Field label="Currency">
                <select className="fld" value={quote.currency} onChange={(e) => set({ currency: e.target.value })}>
                  <option value="INR">INR — ₹</option>
                  <option value="USD">USD — $</option>
                </select>
              </Field>
              <Field label="Status">
                <select className="fld" value={quote.status} onChange={(e) => set({ status: e.target.value })}>
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>
                  ))}
                </select>
              </Field>
            </Row>
          </Section>

          <Section title="Quotation for" open>
            <Row cols={2}>
              <Field label="Client / company">
                <input className="fld" value={quote.client_name || ''} placeholder="Acme Retail Pvt Ltd"
                  onChange={(e) => set({ client_name: e.target.value })} />
              </Field>
              <Field label="Attention (person)">
                <input className="fld" value={quote.client_contact || ''} placeholder="Ms. Priya Nair"
                  onChange={(e) => set({ client_contact: e.target.value })} />
              </Field>
            </Row>
            <Field label="Address">
              <textarea className="fld" rows={2} value={quote.client_address || ''}
                placeholder="Street, City, State — PIN" onChange={(e) => set({ client_address: e.target.value })} />
            </Field>
            <Row cols={3}>
              <Field label="GSTIN">
                <input className="fld" value={quote.client_gstin || ''} onChange={(e) => set({ client_gstin: e.target.value })} />
              </Field>
              <Field label="Email">
                <input className="fld" value={quote.client_email || ''} onChange={(e) => set({ client_email: e.target.value })} />
              </Field>
              <Field label="Phone">
                <input className="fld" value={quote.client_phone || ''} onChange={(e) => set({ client_phone: e.target.value })} />
              </Field>
            </Row>
          </Section>

          <Section title={`Line items · ${quote.items?.length || 0}`} open>
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  className="chip-add"
                  onClick={() => set({ items: [...(quote.items || []), { desc: p.desc, note: p.note, qty: p.qty, unit: p.unit, rate: p.rate }] })}
                >
                  + {p.label}
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-2">
              {(quote.items || []).map((it, i) => (
                <div key={i} className="flex flex-col gap-2 rounded-lg p-2.5"
                  style={{ background: 'var(--color-gold-50)', border: '1px solid var(--color-line)' }}>
                  <div className="flex items-center gap-2">
                    <span className="w-4 text-[11px] font-semibold" style={{ fontFamily: 'var(--font-num)', color: 'var(--color-gold-800)' }}>
                      {i + 1}
                    </span>
                    <input className="fld flex-1 font-semibold" placeholder="Description of work" value={it.desc}
                      onChange={(e) => setItem(i, { desc: e.target.value })} />
                    <IconBtn label="Move up" onClick={() => moveItem(i, -1)}>↑</IconBtn>
                    <IconBtn label="Move down" onClick={() => moveItem(i, 1)}>↓</IconBtn>
                    <IconBtn label="Remove" danger
                      onClick={() => set({ items: quote.items.filter((_, j) => j !== i) })}>✕</IconBtn>
                  </div>
                  <input className="fld" placeholder="Sub-note (optional) — what is included" value={it.note}
                    onChange={(e) => setItem(i, { note: e.target.value })} />
                  <div className="grid grid-cols-[.75fr_.75fr_1fr_auto] items-end gap-1.5">
                    <Field label="Qty">
                      <input className="fld" type="number" step="0.01" min="0" value={it.qty}
                        onChange={(e) => setItem(i, { qty: e.target.value })} />
                    </Field>
                    <Field label="Unit">
                      <input className="fld" value={it.unit} onChange={(e) => setItem(i, { unit: e.target.value })} />
                    </Field>
                    <Field label="Rate">
                      <input className="fld" type="number" step="0.01" min="0" value={it.rate}
                        onChange={(e) => setItem(i, { rate: e.target.value })} />
                    </Field>
                    <div className="min-w-[80px] pb-2 text-right text-[12.5px] font-semibold"
                      style={{ fontFamily: 'var(--font-num)', fontVariantNumeric: 'tabular-nums' }}>
                      {money(num(it.qty) * num(it.rate), quote.currency)}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button className="btn" type="button" onClick={() => set({ items: [...(quote.items || []), blankItem()] })}>
              + Add line item
            </button>
            <p className="text-[11.5px]" style={{ color: 'var(--color-ink-soft)' }}>
              Keep it to roughly 8 lines so the quotation stays on one page — the fit meter above the sheet tracks this live.
            </p>
          </Section>

          <Section title="Discount &amp; tax" open>
            <Row cols={2}>
              <Field label="Discount type">
                <select className="fld" value={quote.discount_type} onChange={(e) => set({ discount_type: e.target.value })}>
                  <option value="none">No discount</option>
                  <option value="percent">Percentage</option>
                  <option value="flat">Flat amount</option>
                </select>
              </Field>
              <Field label="Discount value">
                <input className="fld" type="number" min="0" step="0.01" value={quote.discount_value}
                  onChange={(e) => set({ discount_value: e.target.value })} />
              </Field>
            </Row>
            <Row cols={2}>
              <Field label="Tax treatment">
                <select className="fld" value={quote.tax_mode} onChange={(e) => set({ tax_mode: e.target.value })}>
                  {TAX_MODES.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="GST rate %">
                <input className="fld" type="number" min="0" step="0.5" value={quote.tax_rate}
                  onChange={(e) => set({ tax_rate: e.target.value })} />
              </Field>
            </Row>
            <Check checked={quote.round_off} onChange={(v) => set({ round_off: v })}>
              Round off the total
            </Check>
            <Check checked={quote.show_tds} onChange={(v) => set({ show_tds: v })}>
              Show TDS note (Sec 194J @ 2%)
            </Check>
          </Section>

          <Section title="Terms, payment &amp; signature">
            <Field label="Terms &amp; conditions">
              <textarea className="fld" rows={8} value={quote.terms || ''} onChange={(e) => set({ terms: e.target.value })} />
            </Field>
            <Field label="Payment details">
              <textarea className="fld" rows={6} value={quote.bank || ''} onChange={(e) => set({ bank: e.target.value })} />
            </Field>
            <Row cols={2}>
              <Field label="Signatory name">
                <input className="fld" value={quote.sign_name || ''} onChange={(e) => set({ sign_name: e.target.value })} />
              </Field>
              <Field label="Designation">
                <input className="fld" value={quote.sign_role || ''} onChange={(e) => set({ sign_role: e.target.value })} />
              </Field>
            </Row>
          </Section>
        </div>
      </aside>

      {/* ---------------- sheet ---------------- */}
      <section className={`flex min-h-0 flex-1 flex-col ${pane === 'view' ? '' : 'hidden lg:flex'}`}>
        <div className="no-print flex flex-wrap items-center justify-end gap-2 px-4 py-2"
          style={{ borderBottom: '1px solid var(--color-line)' }}>
          <select className="fld w-auto py-1.5 text-[12.5px]" value={density} onChange={(e) => setDensity(e.target.value)}>
            {DENSITIES.map((d) => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
          </select>
          <button className="btn" type="button" onClick={() => navigate('/quotations')}>
            Register
          </button>
          <button className="btn btn-primary" type="button" onClick={() => window.print()}>
            Print / Save PDF
          </button>
        </div>

        <PaperStage>
          <QuotationSheet quote={quote} business={business} density={density} />
        </PaperStage>
      </section>

      {/* small-screen pane switch */}
      <div className="no-print fixed bottom-4 left-1/2 flex -translate-x-1/2 gap-1 rounded-full p-1 shadow-lg lg:hidden"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-line)' }}>
        <button className={`btn btn-sm ${pane === 'edit' ? 'btn-primary' : ''}`} type="button" onClick={() => setPane('edit')}>
          Edit
        </button>
        <button className={`btn btn-sm ${pane === 'view' ? 'btn-primary' : ''}`} type="button" onClick={() => setPane('view')}>
          Preview
        </button>
      </div>
    </div>
  );
}

/* ---------- small form primitives ---------- */

function Section({ title, open = false, children }) {
  return (
    <details className="overflow-hidden rounded-[10px]" open={open}
      style={{ border: '1px solid var(--color-line)', background: 'var(--color-surface)' }}>
      <summary className="cursor-pointer list-none px-3 py-2.5 text-[13px] font-semibold"
        style={{ background: 'var(--color-gold-50)' }}>
        {title}
      </summary>
      <div className="flex flex-col gap-2.5 p-3">{children}</div>
    </details>
  );
}

function Row({ cols = 2, children }) {
  return <div className={`grid gap-2.5 ${cols === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>{children}</div>;
}

function Field({ label, children }) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5">
      <span className="lbl">{label}</span>
      {children}
    </label>
  );
}

function Check({ checked, onChange, children }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-[12.5px]" style={{ color: 'var(--color-ink-soft)' }}>
      <input type="checkbox" checked={!!checked} onChange={(e) => onChange(e.target.checked)} />
      {children}
    </label>
  );
}

function IconBtn({ children, onClick, label, danger }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className="grid h-[26px] w-[26px] shrink-0 place-items-center rounded-md border border-transparent text-[13px] transition-colors hover:border-[color:var(--color-line)] hover:bg-white"
      style={{ color: danger ? 'var(--color-bad)' : 'var(--color-ink-soft)' }}
    >
      {children}
    </button>
  );
}
