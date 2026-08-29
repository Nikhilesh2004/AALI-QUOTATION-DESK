import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { supabase } from './supabase';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined); // undefined = still loading
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [business, setBusiness] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) {
      setProfile(null);
      setBusiness(null);
      return;
    }
    setProfileLoading(true);
    Promise.all([
      supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle(),
      supabase.from('business_settings').select('*').eq('id', 1).maybeSingle(),
    ]).then(([p, b]) => {
      if (p.error) console.error('Failed to load profile:', p.error);
      if (b.error) console.error('Failed to load business settings:', b.error);
      setProfile(p.data ?? null);
      setBusiness(b.data ?? null);
      setProfileLoading(false);
    });
  }, [session]);

  const refreshBusiness = useCallback(async () => {
    const { data, error } = await supabase.from('business_settings').select('*').eq('id', 1).maybeSingle();
    if (error) console.error('Failed to refresh business settings:', error);
    else setBusiness(data ?? null);
    return data;
  }, []);

  const value = {
    session,
    profile,
    business,
    setBusiness,
    refreshBusiness,
    isSuperAdmin: profile?.role === 'super_admin',
    loading: session === undefined || (Boolean(session) && profileLoading),
    signOut: () => supabase.auth.signOut(),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
