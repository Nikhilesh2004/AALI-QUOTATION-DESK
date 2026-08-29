import { useEffect, useState } from 'react';
import { useAuth } from '../lib/AuthProvider';
import { supabase } from '../lib/supabase';

const FIELDS = [
  'name', 'parent_line', 'tagline', 'address', 'gstin', 'pan', 'phone', 'email', 'website',
  'logo_url', 'quote_prefix', 'default_terms', 'default_bank', 'sign_name', 'sign_role',
];

export default function Business() {
  const { business, refreshBusiness, isSuperAdmin, session } = useAuth();
  const [form, setForm] = useState(business || {});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (business) setForm(business);
  }, [business]);

  const set = (patch) => {
    setForm((p) => ({ ...p, ...patch }));
    setSaved(false);
  };

  async function onLogo(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 400_000) {
      setError('Logo is too large — use an image under 400 KB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => set({ logo_url: String(reader.result) });
    reader.readAsDataURL(file);
  }

  async function save() {
    setSaving(true);
    setError('');
    const payload = Object.fromEntries(FIELDS.map((f) => [f, form[f] ?? '']));
    payload.updated_at = new Date().toISOString();
    payload.updated_by = session.user.id;

    const { error: err } = await supabase.from('business_settings').update(payload).eq('id', 1);
    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
    await refreshBusiness();
    setSaved(true);
  }

  const ro = !isSuperAdmin;

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 p-5">
      <div className="mb-4">
        <h2 className="text-xl font-bold tracking-tight" style={{ fontFamily: 'var(--font-doc)' }}>
          Your business
        </h2>
        <p className="text-[12.5px]" style={{ color: 'var(--color-ink-soft)' }}>
          The letterhead every quotation carries. Change it once and every future quotation follows.
        </p>
      </div>

      {ro && (
        <p className="mb-4 rounded-lg px-3 py-2 text-[12.5px]"
          style={{ background: 'var(--color-gold-100)', border: '1px solid var(--color-gold-300)', color: 'var(--color-gold-900)' }}>
          Only a super admin can change the company letterhead. You can read it here.
        </p>
      )}

      {/* live letterhead preview */}
      <div className="card mb-4 flex items-start gap-3 p-4">
        {form.logo_url ? (
          <img src={form.logo_url} alt="" className="h-12 w-12 object-contain" />
        ) : (
          <img src="/logo.svg" alt="" className="h-12 w-12 object-contain" />
        )}
        <div>
          <div className="text-[19px] font-bold leading-tight" style={{ fontFamily: 'var(--font-doc)' }}>
            {form.name || 'AALI CONSSULTANCY'}
          </div>
          {form.parent_line && (
            <div className="text-[12px] italic" style={{ color: '#8a6a1c' }}>{form.parent_line}</div>
          )}
          {form.tagline && (
            <div className="mt-0.5 text-[10.5px] font-semibold uppercase tracking-[0.14em]"
              style={{ color: 'var(--color-gold-800)' }}>
              {form.tagline}
            </div>
          )}
        </div>
      </div>

      <div className="card flex flex-col gap-3 p-4">
        <F label="Business name">
          <input className="fld" disabled={ro} value={form.name || ''} onChange={(e) => set({ name: e.target.value })} />
        </F>

        <F label="Group / parent line" hint="Printed under the business name on every quotation.">
          <input className="fld" disabled={ro} value={form.parent_line || ''}
            placeholder="A subsidiary of Aali Group"
            onChange={(e) => set({ parent_line: e.target.value })} />
        </F>

        <F label="Tagline / line of work">
          <input className="fld" disabled={ro} value={form.tagline || ''} onChange={(e) => set({ tagline: e.target.value })} />
        </F>

        <F label="Address">
          <textarea className="fld" rows={2} disabled={ro} value={form.address || ''}
            placeholder="Street, City, State — PIN" onChange={(e) => set({ address: e.target.value })} />
        </F>

        <div className="grid grid-cols-3 gap-3">
          <F label="GSTIN">
            <input className="fld" disabled={ro} value={form.gstin || ''} onChange={(e) => set({ gstin: e.target.value })} />
          </F>
          <F label="PAN">
            <input className="fld" disabled={ro} value={form.pan || ''} onChange={(e) => set({ pan: e.target.value })} />
          </F>
          <F label="Phone">
            <input className="fld" disabled={ro} value={form.phone || ''} onChange={(e) => set({ phone: e.target.value })} />
          </F>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <F label="Email">
            <input className="fld" disabled={ro} value={form.email || ''} onChange={(e) => set({ email: e.target.value })} />
          </F>
          <F label="Website">
            <input className="fld" disabled={ro} value={form.website || ''} onChange={(e) => set({ website: e.target.value })} />
          </F>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <F label="Quotation number prefix" hint="AC gives AC/2026-27/001.">
            <input className="fld" disabled={ro} value={form.quote_prefix || ''}
              onChange={(e) => set({ quote_prefix: e.target.value.toUpperCase() })} />
          </F>
          <F label="Logo on the quotation" hint="PNG or SVG under 400 KB.">
            <input className="fld" type="file" accept="image/*" disabled={ro} onChange={onLogo} />
          </F>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <F label="Default signatory name">
            <input className="fld" disabled={ro} value={form.sign_name || ''} onChange={(e) => set({ sign_name: e.target.value })} />
          </F>
          <F label="Default designation">
            <input className="fld" disabled={ro} value={form.sign_role || ''} onChange={(e) => set({ sign_role: e.target.value })} />
          </F>
        </div>

        <F label="Default terms & conditions" hint="Pre-filled into every new quotation.">
          <textarea className="fld" rows={7} disabled={ro} value={form.default_terms || ''}
            onChange={(e) => set({ default_terms: e.target.value })} />
        </F>

        <F label="Default payment details">
          <textarea className="fld" rows={6} disabled={ro} value={form.default_bank || ''}
            onChange={(e) => set({ default_bank: e.target.value })} />
        </F>

        {error && (
          <p className="rounded-lg px-3 py-2 text-[12.5px]"
            style={{ background: '#fbeceb', color: '#8f2a2a', border: '1px solid #f0cfcd' }}>
            {error}
          </p>
        )}

        {!ro && (
          <div className="flex items-center gap-3">
            <button className="btn btn-primary" type="button" onClick={save} disabled={saving}>
              {saving ? 'Saving…' : 'Save letterhead'}
            </button>
            {saved && <span className="text-[12.5px]" style={{ color: 'var(--color-ok)' }}>Saved.</span>}
          </div>
        )}
      </div>
    </div>
  );
}

function F({ label, hint, children }) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5">
      <span className="lbl">{label}</span>
      {children}
      {hint && <span className="text-[11px]" style={{ color: 'var(--color-ink-soft)' }}>{hint}</span>}
    </label>
  );
}
