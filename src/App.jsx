import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './lib/AuthProvider';
import { isConfigured } from './lib/supabase';
import RequireAuth from './components/RequireAuth';
import Layout from './components/Layout';
import Login from './pages/Login';
import Quotations from './pages/Quotations';
import Editor from './pages/Editor';
import Business from './pages/Business';
import Admin from './pages/Admin';
import SheetPreview from './pages/SheetPreview';

// Shown instead of a blank page when the deploy has no Supabase credentials.
function NotConfigured() {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="card max-w-lg p-6">
        <h1 className="mb-2 text-xl font-bold" style={{ fontFamily: 'var(--font-doc)' }}>
          Aali Quotation Desk is not connected yet
        </h1>
        <p className="mb-3 text-[13.5px]" style={{ color: 'var(--color-ink-soft)' }}>
          This build has no database credentials, so there is nothing to sign in to. Set both variables and redeploy:
        </p>
        <pre className="overflow-x-auto rounded-lg p-3 text-[12.5px]"
          style={{ background: 'var(--color-gold-50)', border: '1px solid var(--color-line)', fontFamily: 'var(--font-num)' }}>
{`VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=<publishable anon key>`}
        </pre>
        <p className="mt-3 text-[12.5px]" style={{ color: 'var(--color-ink-soft)' }}>
          On Vercel these live under Project → Settings → Environment Variables. Locally they go in <code>.env</code>.
        </p>
      </div>
    </div>
  );
}

export default function App() {
  // Design preview for the printed template. Dev server only -- tree-shaken
  // out of the production bundle, and never reachable on the deployed site.
  if (import.meta.env.DEV && window.location.pathname === '/preview') {
    return <SheetPreview />;
  }

  if (!isConfigured) return <NotConfigured />;

  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            element={
              <RequireAuth>
                <Layout />
              </RequireAuth>
            }
          >
            <Route path="/quotations" element={<Quotations />} />
            <Route path="/new" element={<Editor />} />
            <Route path="/quotation/:id" element={<Editor />} />
            <Route path="/business" element={<Business />} />
            <Route
              path="/admin"
              element={
                <RequireAuth superAdmin>
                  <Admin />
                </RequireAuth>
              }
            />
          </Route>
          <Route path="*" element={<Navigate to="/quotations" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
