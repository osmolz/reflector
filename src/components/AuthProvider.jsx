import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';

export function AuthProvider({ children }) {
  const checkAuth = useAuthStore((state) => state.checkAuth);

  useEffect(() => {
    // Check for existing session on app load
    checkAuth();

    // Set up listener for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event);
      if (session?.user) {
        useAuthStore.setState({ user: session.user });
      } else {
        useAuthStore.setState({ user: null });
      }
    });

    // Clean up subscription on unmount
    return () => {
      subscription?.unsubscribe();
    };
  }, [checkAuth]);

  return <>{children}</>;
}
