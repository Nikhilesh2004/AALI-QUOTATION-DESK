import { isoToday } from './format';

export const DEFAULT_TERMS = [
  '1. 50% advance to commence work; balance payable on delivery / deployment.',
  '2. Prices exclude hosting, domain and third-party API or payment-gateway fees unless stated above.',
  '3. GST is charged as per prevailing Indian regulations.',
  '4. Timeline begins on receipt of the advance and of all content, assets and approvals from the client.',
  '5. Any requirement outside the scope listed above will be quoted separately.',
  '6. This quotation is valid until the date shown and is subject to revision thereafter.',
].join('\n');

export const DEFAULT_BANK = [
  'Account name : AALI CONSSULTANCY',
  'Bank / branch : ',
  'Account no.   : ',
  'IFSC          : ',
  'UPI           : ',
].join('\n');

// Quick-add lines, priced from the Aali Tech e-commerce cost estimate.
export const PRESETS = [
  {
    label: 'E-commerce — Starter',
    desc: 'E-commerce website — Starter tier',
    note: 'CMS storefront, theme customisation, cart, one payment gateway, up to 100 products, basic admin dashboard.',
    qty: 1, unit: 'Project', rate: 45000,
  },
  {
    label: 'E-commerce — Basic',
    desc: 'E-commerce website — Basic tier',
    note: 'Custom full-stack build (Node.js + MongoDB), headless CMS, custom UI/UX, advanced filters, multiple payment options.',
    qty: 1, unit: 'Project', rate: 150000,
  },
  {
    label: 'E-commerce — Premium',
    desc: 'E-commerce website — Premium tier',
    note: 'High-scale architecture, inventory management, multi-vendor, custom reporting, automated email flows.',
    qty: 1, unit: 'Project', rate: 450000,
  },
  {
    label: 'HRM implementation',
    desc: 'SaaS HRM — implementation & setup',
    note: 'Tenant setup, master data configuration, role mapping and admin training.',
    qty: 1, unit: 'Project', rate: 0,
  },
  {
    label: 'Payroll module',
    desc: 'Payroll module — configuration & compliance',
    note: 'Salary structures, statutory components, payslip templates and first-cycle run.',
    qty: 1, unit: 'Project', rate: 0,
  },
  {
    label: 'AMC / support',
    desc: 'Annual maintenance & support',
    note: 'Bug fixes, security patches and minor enhancements.',
    qty: 12, unit: 'Months', rate: 0,
  },
  {
    label: 'Hourly development',
    desc: 'Additional development effort',
    note: 'Billed against approved change requests.',
    qty: 10, unit: 'Hours', rate: 0,
  },
];

export const blankItem = () => ({ desc: '', note: '', qty: 1, unit: 'Nos', rate: 0 });

export function blankQuotation(business) {
  return {
    id: null,
    quote_no: null,
    status: 'draft',
    quote_date: isoToday(),
    valid_until: isoToday(15),
    subject: '',
    prepared_by: '',
    currency: 'INR',
    client_name: '',
    client_contact: '',
    client_address: '',
    client_gstin: '',
    client_email: '',
    client_phone: '',
    items: [blankItem()],
    discount_type: 'none',
    discount_value: 0,
    tax_mode: business?.default_tax_mode || 'intra',
    tax_rate: 18,
    round_off: true,
    show_tds: false,
    terms: business?.default_terms || DEFAULT_TERMS,
    bank: business?.default_bank || DEFAULT_BANK,
    sign_name: business?.sign_name || '',
    sign_role: business?.sign_role || '',
    notes: '',
  };
}

export const DENSITIES = [
  { value: '1.05', label: 'Roomy' },
  { value: '1', label: 'Normal' },
  { value: '0.94', label: 'Compact' },
  { value: '0.88', label: 'Tight' },
];
