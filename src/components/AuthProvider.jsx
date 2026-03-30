import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';

export function AuthProvider({ children }) {
  const checkAuth = useAuthStore((state) => state.checkAuth);

  useEffect(() => {
    checkAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        useAuthStore.setState({ user: session.user });
      } else {
        useAuthStore.setState({ user: null });
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [checkAuth]);

  return <>{children}</>;
}
