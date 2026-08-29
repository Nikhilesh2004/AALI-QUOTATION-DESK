import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthContext } from '../lib/AuthProvider';
import Layout from '../components/Layout';
import Editor from './Editor';

// Dev-only (`npm run dev` -> /preview/editor). Mounts the real editor inside a
// mock auth context so the layout can be checked at every breakpoint without a
// login. A new quotation makes no network call on mount -- it only reads the
// session and letterhead -- so nothing here talks to Supabase. Saving will fail,
// which is fine: this exists to look at layout, not to write data.
//
// Never reachable in a production build; App.jsx gates it on import.meta.env.DEV.
const MOCK = {
  session: { user: { id: '00000000-0000-0000-0000-000000000000' } },
  profile: { full_name: 'Super Admin', role: 'super_admin', email: 'superadmin@aaliquotation.demo' },
  business: {
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
    quote_prefix: 'AC',
    default_terms: '1. 50% advance to commence work; balance payable on delivery.',
    default_bank: 'Account name : AALI CONSSULTANCY\nIFSC          : ',
    sign_name: 'Nandini',
    sign_role: 'Founder',
  },
  setBusiness: () => {},
  refreshBusiness: async () => {},
  isSuperAdmin: true,
  loading: false,
  signOut: async () => {},
};

export default function UiPreview() {
  return (
    <AuthContext.Provider value={MOCK}>
      <MemoryRouter initialEntries={['/new']}>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/new" element={<Editor />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>
  );
}
