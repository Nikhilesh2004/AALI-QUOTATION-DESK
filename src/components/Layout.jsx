import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthProvider';

function Tab({ to, children, end = false }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `rounded-lg px-3 py-1.5 text-[13px] font-semibold transition-colors ${
          isActive ? 'text-[#4a3400]' : 'text-[color:var(--color-ink-soft)] hover:text-[color:var(--color-ink)]'
        }`
      }
      style={({ isActive }) =>
        isActive ? { background: 'var(--color-gold-200)', border: '1px solid var(--color-gold-300)' }
          : { border: '1px solid transparent' }
      }
    >
      {children}
    </NavLink>
  );
}

export default function Layout() {
  const { profile, business, signOut, isSuperAdmin } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col lg:h-full">
      <header
        className="no-print flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2.5 sm:px-4"
        style={{ background: 'var(--color-surface)', borderBottom: '1px solid var(--color-line)' }}
      >
        <img src={business?.logo_url || "/logo.svg"} alt="" className="h-8 w-8 shrink-0 object-contain" />
        <div className="mr-2">
          <h1
            className="text-[15px] font-bold leading-tight tracking-tight"
            style={{ fontFamily: 'var(--font-doc)' }}
          >
            AALI QUOTATION DESK
          </h1>
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color: 'var(--color-ink-soft)' }}>
            {business?.name || 'Aali Conssultancy'}
          </p>
        </div>

        <nav className="flex flex-wrap items-center gap-1">
          <Tab to="/quotations" end>Quotations</Tab>
          <Tab to="/new">New</Tab>
          <Tab to="/business">Business</Tab>
          {isSuperAdmin && <Tab to="/admin">Admin</Tab>}
        </nav>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <div className="hidden text-right leading-tight sm:block">
            <div className="text-[12.5px] font-semibold">{profile?.full_name}</div>
            <div className="text-[10.5px] uppercase tracking-wider" style={{ color: 'var(--color-ink-soft)' }}>
              {profile?.role === 'super_admin' ? 'Super admin' : 'Staff'}
            </div>
          </div>
          <button
            type="button"
            className="btn btn-sm"
            onClick={async () => {
              await signOut();
              navigate('/login', { replace: true });
            }}
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="flex flex-1 flex-col lg:min-h-0">
        <Outlet />
      </main>
    </div>
  );
}
