import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';

interface AppState {
  user: {
    id: string;
    role: 'student' | 'teacher';
    name: string;
    email: string;
    xp?: number;
  } | null;
  isOffline: boolean;
  isInitializing: boolean;
  setUser: (user: AppState['user']) => void;
  setOfflineStatus: (status: boolean) => void;
  setInitializing: (status: boolean) => void;
  logout: () => Promise<void>;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      user: null,
      isOffline: !navigator.onLine,
      isInitializing: true,
      setUser: (user) => set({ user }),
      setOfflineStatus: (isOffline) => set({ isOffline }),
      setInitializing: (isInitializing) => set({ isInitializing }),
      logout: async () => {
        await supabase.auth.signOut();
        set({ user: null });
      },
    }),
    {
      name: 'silid-storage',
      partialize: (state) => ({ 
        user: state.user,
        isOffline: state.isOffline 
      }),
    }
  )
);

// Listen to online/offline events
window.addEventListener('online', () => {
  useAppStore.getState().setOfflineStatus(false);
});

window.addEventListener('offline', () => {
  useAppStore.getState().setOfflineStatus(true);
});

// Setup Supabase auth listener
supabase.auth.onAuthStateChange(async (event, session) => {
  if (session?.user) {
    const { data: userData } = await supabase
      .from('users')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (userData) {
      useAppStore.getState().setUser({
        id: session.user.id,
        role: userData.role || (userData.level === 'Guro' ? 'teacher' : 'student'),
        name: userData.name || session.user.user_metadata?.full_name || 'User',
        email: session.user.email || '',
        xp: userData.xp || 0
      });
    } else {
      // If user profile doesn't exist in 'users' table yet
      useAppStore.getState().setUser({
        id: session.user.id,
        role: session.user.user_metadata?.role || 'student',
        name: session.user.user_metadata?.full_name || 'User',
        email: session.user.email || '',
        xp: 0
      });
    }
  } else {
    useAppStore.getState().setUser(null);
  }
  useAppStore.getState().setInitializing(false);
});

// Safety timeout: Ensure initialization always completes
setTimeout(() => {
  if (useAppStore.getState().isInitializing) {
    console.warn("Auth initialization timed out. Proceeding anyway.");
    useAppStore.getState().setInitializing(false);
  }
}, 3000);

