import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export const useAuthStore = create((set) => ({
  user: null,
  loading: true,
  error: null,

  signUp: async (email, password) => {
    try {
      set({ error: null });
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      if (error) throw error;
      set({ user: data.user });
      return { success: true, data };
    } catch (err) {
      const errorMessage = err.message || 'Sign up failed';
      set({ error: errorMessage });
      throw err;
    }
  },

  signIn: async (email, password) => {
    try {
      set({ error: null });
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      set({ user: data.user });
      return { success: true, data };
    } catch (err) {
      const errorMessage = err.message || 'Sign in failed';
      set({ error: errorMessage });
      throw err;
    }
  },

  signOut: async () => {
    try {
      set({ error: null });
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      set({ user: null });
      return { success: true };
    } catch (err) {
      const errorMessage = err.message || 'Sign out failed';
      set({ error: errorMessage });
      throw err;
    }
  },

  checkAuth: async () => {
    try {
      set({ error: null });
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;

      let user = data.session?.user ?? null;
      if (!user) {
        const { data: anon, error: anonErr } = await supabase.auth.signInAnonymously();
        if (!anonErr && anon.session?.user) {
          user = anon.session.user;
        } else if (anonErr) {
          console.warn('[auth] Anonymous sign-in skipped:', anonErr.message);
        }
      }

      set({ user, loading: false });
      return user;
    } catch (err) {
      console.error('Auth check failed:', err);
      set({ loading: false, error: err.message });
      return null;
    }
  },

  clearError: () => set({ error: null }),
}));
