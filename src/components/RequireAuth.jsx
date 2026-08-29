import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/AuthProvider';

/**
 * Gate for every page behind the login. Pass `superAdmin` to additionally
 * require the super-admin role -- used by the company-wide register and the
 * user list, which are the two places that expose other people's work.
 */
export default function RequireAuth({ superAdmin = false, children }) {
  const { session, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ color: 'var(--color-ink-soft)' }}>
        Loading…
      </div>
    );
  }

  if (!session) {
    return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />;
  }

  if (!profile) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2 px-6 text-center"
        style={{ color: 'var(--color-ink-soft)' }}>
        <p>Your login exists but has no profile row yet.</p>
        <p className="text-sm">Ask a super admin to run the schema and re-create your user.</p>
      </div>
    );
  }

  if (superAdmin && profile.role !== 'super_admin') {
    return <Navigate to="/quotations" replace />;
  }

  return children;
}
