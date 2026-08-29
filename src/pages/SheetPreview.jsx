import { useState } from 'react';
import QuotationSheet from '../components/QuotationSheet';
import PaperStage from '../components/PaperStage';
import { DEFAULT_BANK, DEFAULT_TERMS, DENSITIES } from '../lib/defaults';

// Dev-only (`npm run dev` -> /preview). Renders the printed template against
// representative data so the letterhead and spacing can be checked without a
// database, a login or a real client. Never mounted in a production build.
const BUSINESS = {
  name: 'AALI CONSSULTANCY',
  parent_line: 'A subsidiary of Aali Group',
  tagline: 'Technology & Software Consulting',
  address: '2nd Floor, Alkapuri Complex, Vijayawada, Andhra Pradesh — 520010',
  gstin: '37ABCDE1234F1Z5',
  pan: 'ABCDE1234F',
  phone: '+91 98765 43210',
  email: 'hello@aali.co',
  website: 'aali.co',
  logo_url: '/logo.svg',
};

const QUOTE = {
  quote_no: 'AC/2026-27/007',
  status: 'sent',
  quote_date: '2026-08-30',
  valid_until: '2026-09-14',
  subject: 'E-commerce website — Basic tier build',
  prepared_by: 'Nandini',
  currency: 'INR',
  client_name: 'Gajavalli Retail Pvt Ltd',
  client_contact: 'Ms. Priya Nair',
  client_address: 'Plot 14, Road No. 3, Banjara Hills, Hyderabad, Telangana — 500034',
  client_gstin: '36AAACG1234H1ZP',
  client_email: 'priya@gajavalli.in',
  client_phone: '+91 90000 11122',
  items: [
    {
      desc: 'E-commerce website — Basic tier',
      note: 'Custom full-stack build (Node.js + MongoDB), headless CMS, custom UI/UX, advanced filters, multiple payment options.',
      qty: 1, unit: 'Project', rate: 150000,
    },
    {
      desc: 'Payment gateway integration',
      note: 'Razorpay onboarding, webhook handling and reconciliation report.',
      qty: 1, unit: 'Project', rate: 18000,
    },
    {
      desc: 'Annual maintenance & support',
      note: 'Bug fixes, security patches and minor enhancements.',
      qty: 12, unit: 'Months', rate: 3500,
    },
    {
      desc: 'Additional development effort',
      note: 'Billed against approved change requests.',
      qty: 10, unit: 'Hours', rate: 1500,
    },
  ],
  discount_type: 'percent',
  discount_value: 5,
  tax_mode: 'inter',
  tax_rate: 18,
  round_off: true,
  show_tds: true,
  terms: DEFAULT_TERMS,
  bank: DEFAULT_BANK,
  sign_name: 'Nandini',
  sign_role: 'Founder',
};

export default function SheetPreview() {
  const [density, setDensity] = useState('1');
  return (
    <div className="flex h-screen flex-col">
      <div className="no-print flex items-center gap-3 px-4 py-2"
        style={{ background: 'var(--color-surface)', borderBottom: '1px solid var(--color-line)' }}>
        <strong className="text-[13px]">Template preview (dev only)</strong>
        <select className="fld w-auto py-1.5 text-[12.5px]" value={density} onChange={(e) => setDensity(e.target.value)}>
          {DENSITIES.map((d) => (
            <option key={d.value} value={d.value}>{d.label}</option>
          ))}
        </select>
        <button className="btn btn-sm btn-primary" type="button" onClick={() => window.print()}>
          Print / Save PDF
        </button>
      </div>
      <PaperStage>
        <QuotationSheet quote={QUOTE} business={BUSINESS} density={density} />
      </PaperStage>
    </div>
  );
}
