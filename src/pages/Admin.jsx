import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { fmtDate, money } from '../lib/format';
import { STATUSES } from '../lib/totals';

/**
 * Super-admin overview: the whole company's register, who issued what, and the
 * user list. Everything here is readable only because the RLS policies let a
 * super admin past the `created_by = auth.uid()` restriction -- the page is a
 * view over the same tables, not a privileged back door.
 */
export default function Admin() {
  const [rows, setRows] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingId, setSavingId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      supabase.from('quotation_register').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('*').order('created_at'),
    ]).then(([reg, prof]) => {
      if (cancelled) return;
      if (reg.error) setError(reg.error.message);
      else setRows(reg.data || []);
      if (prof.error) setError((e) => e || prof.error.message);
      else setUsers(prof.data || []);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const byStatus = useMemo(() => {
    const map = Object.fromEntries(STATUSES.map((s) => [s, { count: 0, value: 0 }]));
    for (const r of rows) {
      if (!map[r.status]) map[r.status] = { count: 0, value: 0 };
      map[r.status].count += 1;
      map[r.status].value += Number(r.total || 0);
    }
    return map;
  }, [rows]);

  const perUser = useMemo(() => {
    const map = new Map();
    for (const u of users) map.set(u.id, { ...u, count: 0, value: 0, last: null });
    for (const r of rows) {
      const entry = map.get(r.created_by);
      if (!entry) continue;
      entry.count += 1;
      entry.value += Number(r.total || 0);
      if (!entry.last || r.created_at > entry.last) entry.last = r.created_at;
    }
    return [...map.values()].sort((a, b) => b.value - a.value);
  }, [rows, users]);

  const totalValue = rows.reduce((a, r) => a + Number(r.total || 0), 0);

  async function setRole(user, role) {
    setSavingId(user.id);
    const { error: err } = await supabase.from('profiles').update({ role }).eq('id', user.id);
    setSavingId(null);
    if (err) return alert(`Could not change the role: ${err.message}`);
    setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, role } : u)));
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center" style={{ color: 'var(--color-ink-soft)' }}>
        Loading…
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 p-5">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight" style={{ fontFamily: 'var(--font-doc)' }}>
            Company overview
          </h2>
          <p className="text-[12.5px]" style={{ color: 'var(--color-ink-soft)' }}>
            Every quotation issued from this app, by everyone, since day one.
          </p>
        </div>
        <Link className="btn" to="/quotations">
          Open the full register
        </Link>
      </div>

      {error && (
        <p className="mb-4 rounded-lg px-3 py-2 text-[13px]"
          style={{ background: '#fbeceb', color: '#8f2a2a', border: '1px solid #f0cfcd' }}>
          {error}
        </p>
      )}

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Quotations issued" value={rows.length} />
        <Stat label="Total value quoted" value={money(totalValue)} />
        <Stat label="Accepted" value={money(byStatus.accepted?.value || 0)} accent
          sub={`${byStatus.accepted?.count || 0} quotation${byStatus.accepted?.count === 1 ? '' : 's'}`} />
        <Stat label="Awaiting decision" value={money(byStatus.sent?.value || 0)}
          sub={`${byStatus.sent?.count || 0} sent`} />
      </div>

      <h3 className="mb-2 text-[13px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-gold-900)' }}>
        People
      </h3>
      <div className="card mb-6 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr style={{ background: 'var(--color-gold-50)' }}>
                <Th>Name</Th>
                <Th>Email</Th>
                <Th>Role</Th>
                <Th align="right">Quotations</Th>
                <Th align="right">Value</Th>
                <Th>Last issued</Th>
              </tr>
            </thead>
            <tbody>
              {perUser.map((u) => (
                <tr key={u.id} style={{ borderTop: '1px solid var(--color-line-soft)' }}>
                  <td className="px-3 py-2.5 font-semibold">{u.full_name}</td>
                  <td className="px-3 py-2.5" style={{ color: 'var(--color-ink-soft)' }}>{u.email}</td>
                  <td className="px-3 py-2.5">
                    <select
                      className="fld w-auto py-1 text-[12.5px]"
                      value={u.role}
                      disabled={savingId === u.id}
                      onChange={(e) => setRole(u, e.target.value)}
                    >
                      <option value="staff">Staff</option>
                      <option value="super_admin">Super admin</option>
                    </select>
                  </td>
                  <td className="px-3 py-2.5 text-right" style={{ fontFamily: 'var(--font-num)' }}>{u.count}</td>
                  <td className="px-3 py-2.5 text-right" style={{ fontFamily: 'var(--font-num)' }}>{money(u.value)}</td>
                  <td className="px-3 py-2.5" style={{ fontFamily: 'var(--font-num)', color: 'var(--color-ink-soft)' }}>
                    {u.last ? fmtDate(u.last.slice(0, 10)) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <h3 className="mb-2 text-[13px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-gold-900)' }}>
        All quotations
      </h3>
      <div className="card overflow-hidden">
        <div className="max-h-[520px] overflow-auto">
          <table className="w-full border-collapse text-[13px]">
            <thead className="sticky top-0" style={{ background: 'var(--color-gold-50)' }}>
              <tr>
                <Th>Quote no.</Th>
                <Th>Date</Th>
                <Th>Client</Th>
                <Th>Issued by</Th>
                <Th align="right">Total</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-10 text-center" style={{ color: 'var(--color-ink-soft)' }}>
                    No quotations have been issued yet.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} style={{ borderTop: '1px solid var(--color-line-soft)' }}>
                    <td className="px-3 py-2.5 font-semibold" style={{ fontFamily: 'var(--font-num)' }}>
                      <Link to={`/quotation/${r.id}`} className="hover:underline">{r.quote_no}</Link>
                    </td>
                    <td className="px-3 py-2.5" style={{ fontFamily: 'var(--font-num)' }}>{fmtDate(r.quote_date)}</td>
                    <td className="px-3 py-2.5">{r.client_name || '—'}</td>
                    <td className="px-3 py-2.5" style={{ color: 'var(--color-ink-soft)' }}>{r.created_by_name || '—'}</td>
                    <td className="px-3 py-2.5 text-right" style={{ fontFamily: 'var(--font-num)' }}>
                      {money(r.total, r.currency)}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`pill pill-${r.status}`}>{r.status}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, sub, accent }) {
  return (
    <div className="card px-4 py-3">
      <div className="text-[10.5px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-ink-soft)' }}>
        {label}
      </div>
      <div className="mt-0.5 text-[19px] font-bold"
        style={{ fontFamily: 'var(--font-num)', color: accent ? 'var(--color-gold-700)' : 'var(--color-ink)' }}>
        {value}
      </div>
      {sub && <div className="text-[11.5px]" style={{ color: 'var(--color-ink-soft)' }}>{sub}</div>}
    </div>
  );
}

function Th({ children, align = 'left' }) {
  return (
    <th className="px-3 py-2.5 text-[10.5px] font-bold uppercase tracking-wider"
      style={{ textAlign: align, color: 'var(--color-gold-900)', borderBottom: '1px solid var(--color-line)' }}>
      {children}
    </th>
  );
}
