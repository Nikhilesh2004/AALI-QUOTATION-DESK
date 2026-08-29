import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthProvider';
import { supabase } from '../lib/supabase';
import ScrollTop from '../components/ScrollTop';
import { fmtDate, fyLabel, money } from '../lib/format';
import { STATUSES } from '../lib/totals';

export default function Quotations() {
  const { session, isSuperAdmin } = useAuth();
  const navigate = useNavigate();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [nextNo, setNextNo] = useState('');

  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const [fy, setFy] = useState('all');
  const [scope, setScope] = useState('mine');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    Promise.all([
      supabase.from('quotation_register').select('*').order('created_at', { ascending: false }),
      supabase.rpc('peek_quotation_number'),
    ]).then(([list, peek]) => {
      if (cancelled) return;
      if (list.error) setError(list.error.message);
      else setRows(list.data || []);
      if (!peek.error) setNextNo(peek.data || '');
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const years = useMemo(
    () => Array.from(new Set(rows.map((r) => r.fy))).sort().reverse(),
    [rows],
  );

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (scope === 'mine' && r.created_by !== session?.user?.id) return false;
      if (status !== 'all' && r.status !== status) return false;
      if (fy !== 'all' && r.fy !== fy) return false;
      if (!needle) return true;
      return [r.quote_no, r.client_name, r.subject, r.created_by_name]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(needle));
    });
  }, [rows, q, status, fy, scope, session]);

  const stats = useMemo(() => {
    const value = visible.reduce((a, r) => a + Number(r.total || 0), 0);
    const won = visible.filter((r) => r.status === 'accepted').reduce((a, r) => a + Number(r.total || 0), 0);
    return { count: visible.length, value, won };
  }, [visible]);

  async function duplicate(id) {
    const { data, error: err } = await supabase.from('quotations').select('*').eq('id', id).single();
    if (err) return alert(`Could not open that quotation: ${err.message}`);
    // Carried into the editor unsaved and un-numbered: a copy must earn its
    // own number from the sequence, not inherit the original's.
    navigate('/new', { state: { seed: { ...data, id: null, quote_no: null, status: 'draft' } } });
  }

  async function remove(row) {
    if (!confirm(`Delete ${row.quote_no}? The number stays used and is never re-issued.`)) return;
    const { error: err } = await supabase.from('quotations').delete().eq('id', row.id);
    if (err) return alert(`Could not delete: ${err.message}`);
    setRows((prev) => prev.filter((r) => r.id !== row.id));
  }

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 p-3 sm:p-5">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight" style={{ fontFamily: 'var(--font-doc)' }}>
            Quotation register
          </h2>
          <p className="text-[12.5px]" style={{ color: 'var(--color-ink-soft)' }}>
            Every quotation issued from this app, newest first.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {nextNo && (
            <div
              className="rounded-lg px-3 py-1.5 text-right"
              style={{ background: 'var(--color-gold-100)', border: '1px solid var(--color-gold-300)' }}
            >
              <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-gold-900)' }}>
                Next number
              </div>
              <div className="text-[13px] font-semibold" style={{ fontFamily: 'var(--font-num)', color: '#4a3400' }}>
                {nextNo}
              </div>
            </div>
          )}
          <Link className="btn btn-primary" to="/new">
            New quotation
          </Link>
        </div>
      </div>

      <div className="card mb-4 flex flex-wrap items-end gap-3 p-3">
        <label className="flex min-w-[220px] flex-1 flex-col gap-1.5">
          <span className="lbl">Search</span>
          <input
            className="fld"
            placeholder="Quote number, client, subject…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="lbl">Status</span>
          <select className="fld" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">All</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s[0].toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="lbl">Financial year</span>
          <select className="fld" value={fy} onChange={(e) => setFy(e.target.value)}>
            <option value="all">All</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>
        {isSuperAdmin && (
          <label className="flex flex-col gap-1.5">
            <span className="lbl">Scope</span>
            <select className="fld" value={scope} onChange={(e) => setScope(e.target.value)}>
              <option value="mine">Mine</option>
              <option value="all">Everyone</option>
            </select>
          </label>
        )}
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Stat label="Quotations" value={stats.count} />
        <Stat label="Value quoted" value={money(stats.value)} />
        <Stat label="Value accepted" value={money(stats.won)} accent />
      </div>

      {error && (
        <p className="mb-4 rounded-lg px-3 py-2 text-[13px]"
          style={{ background: '#fbeceb', color: '#8f2a2a', border: '1px solid #f0cfcd' }}>
          {error}
        </p>
      )}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr style={{ background: 'var(--color-gold-50)' }}>
                <Th>Quote no.</Th>
                <Th>Date</Th>
                <Th>Client</Th>
                <Th>Subject</Th>
                {isSuperAdmin && scope === 'all' && <Th>Issued by</Th>}
                <Th align="right">Total</Th>
                <Th>Status</Th>
                <Th align="right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center" style={{ color: 'var(--color-ink-soft)' }}>
                    Loading…
                  </td>
                </tr>
              ) : visible.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-10 text-center" style={{ color: 'var(--color-ink-soft)' }}>
                    {rows.length === 0
                      ? 'No quotations yet. The first one you save becomes ' + (nextNo || 'number 001') + '.'
                      : 'Nothing matches those filters.'}
                  </td>
                </tr>
              ) : (
                visible.map((r) => (
                  <tr
                    key={r.id}
                    className="cursor-pointer transition-colors hover:bg-[color:var(--color-gold-50)]"
                    style={{ borderTop: '1px solid var(--color-line-soft)' }}
                    onClick={() => navigate(`/quotation/${r.id}`)}
                  >
                    <Td mono strong>{r.quote_no}</Td>
                    <Td mono>{fmtDate(r.quote_date)}</Td>
                    <Td strong>{r.client_name || '—'}</Td>
                    <Td muted>{r.subject || '—'}</Td>
                    {isSuperAdmin && scope === 'all' && <Td muted>{r.created_by_name || '—'}</Td>}
                    <Td mono align="right">{money(r.total, r.currency)}</Td>
                    <Td>
                      <span className={`pill pill-${r.status}`}>{r.status}</span>
                    </Td>
                    <Td align="right">
                      <span className="flex justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button className="btn btn-sm" type="button" onClick={() => duplicate(r.id)}>
                          Duplicate
                        </button>
                        <button className="btn btn-sm btn-danger" type="button" onClick={() => remove(r)}>
                          Delete
                        </button>
                      </span>
                    </Td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="mt-3 text-[11.5px]" style={{ color: 'var(--color-ink-soft)' }}>
        Numbers run as {nextNo ? nextNo.split('/')[0] : 'AC'}/{fyLabel()}/NNN and are issued by the database when a
        quotation is first saved, so two people saving at once can never receive the same number.
      </p>
      <ScrollTop className="bottom-6 right-4 sm:right-6" />
    </div>
  );
}

function Stat({ label, value, accent }) {
  return (
    <div className="card px-4 py-3">
      <div className="text-[10.5px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-ink-soft)' }}>
        {label}
      </div>
      <div
        className="mt-0.5 text-[19px] font-bold"
        style={{ fontFamily: 'var(--font-num)', color: accent ? 'var(--color-gold-700)' : 'var(--color-ink)' }}
      >
        {value}
      </div>
    </div>
  );
}

function Th({ children, align = 'left' }) {
  return (
    <th
      className="px-3 py-2.5 text-[10.5px] font-bold uppercase tracking-wider"
      style={{ textAlign: align, color: 'var(--color-gold-900)', borderBottom: '1px solid var(--color-line)' }}
    >
      {children}
    </th>
  );
}

function Td({ children, mono, strong, muted, align = 'left' }) {
  return (
    <td
      className="px-3 py-2.5"
      style={{
        textAlign: align,
        fontFamily: mono ? 'var(--font-num)' : undefined,
        fontVariantNumeric: mono ? 'tabular-nums' : undefined,
        fontWeight: strong ? 600 : undefined,
        color: muted ? 'var(--color-ink-soft)' : undefined,
      }}
    >
      {children}
    </td>
  );
}
