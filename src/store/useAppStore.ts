import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';

interface AppState {
  user: {
    id: string; // This is the Supabase UUID (mapped to openId in DB)
    dbId: number; // This is the integer ID from users table
    role: 'student' | 'teacher';
    name: string;
    email: string;
    xp?: number;
  } | null;

  isOffline: boolean;
  isInitializing: boolean;
  theme: 'light' | 'dark';
  setUser: (user: AppState['user']) => void;
  setOfflineStatus: (status: boolean) => void;
  setInitializing: (status: boolean) => void;
  setTheme: (theme: 'light' | 'dark') => void;
  logout: () => Promise<void>;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      user: null,
      isOffline: !navigator.onLine,
      isInitializing: true,
      theme: 'light',
      setUser: (user) => set({ user }),
      setOfflineStatus: (isOffline) => set({ isOffline }),
      setInitializing: (isInitializing) => set({ isInitializing }),
      setTheme: (theme) => set({ theme }),
      logout: async () => {
        // 1. Clear state immediately
        set({ user: null });
        
        // 2. Sign out from Supabase (this clears its session tokens)
        await supabase.auth.signOut().catch((e: any) => console.error(e));
        
        // 3. Clear app-specific storage (not all localStorage — Supabase manages its own)
        localStorage.removeItem('silid-storage');
        localStorage.removeItem('pending_role');
        
        // 4. Redirect immediately
        window.location.replace('/login');
      },
    }),
    {
      name: 'silid-storage',
      partialize: (state) => ({ 
        user: state.user,
        isOffline: state.isOffline,
        theme: state.theme
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
  if (event === 'SIGNED_OUT') {
    useAppStore.getState().setUser(null);
    useAppStore.getState().setInitializing(false);
    return;
  }

  if (session?.user) {
    // If user is already hydrated from persistence and matches this session, skip DB lookup
    const currentUser = useAppStore.getState().user;
    if (currentUser && currentUser.id === session.user.id) {
      useAppStore.getState().setInitializing(false);
      return;
    }

    const pendingRole = localStorage.getItem('pending_role') as 'student' | 'teacher' || 'student';
    
    // Check if user profile exists in DB
    const { data: userData } = await supabase
      .from('users')
      .select('*')
      .eq('openId', session.user.id)
      .single();

    if (userData) {
      useAppStore.getState().setUser({
        id: session.user.id,
        dbId: userData.id,
        role: userData.appRole || 'student',
        name: userData.name || session.user.user_metadata?.full_name || 'User',
        email: session.user.email || '',
        xp: userData.xp || 0
      });
    } else {
      // Auto-create profile
      const { data: newProfile } = await supabase
        .from('users')
        .insert([{
          openId: session.user.id,
          name: session.user.user_metadata?.full_name || 'User',
          email: session.user.email || '',
          appRole: pendingRole,
          xp: 0,
          streak: 0
        }])
        .select()
        .single();

      if (newProfile) {
        useAppStore.getState().setUser({
          id: session.user.id,
          dbId: newProfile.id,
          role: newProfile.appRole as 'student' | 'teacher',
          name: newProfile.name || session.user.user_metadata?.full_name || 'User',
          email: session.user.email || '',
          xp: newProfile.xp || 0
        });
        localStorage.removeItem('pending_role');
      } else {
        // Fallback if profile creation failed
        useAppStore.getState().setUser({
          id: session.user.id,
          dbId: 0,
          role: pendingRole as 'student' | 'teacher',
          name: session.user.user_metadata?.full_name || 'User',
          email: session.user.email || '',
          xp: 0
        });
      }
    }
  } else if (event === 'INITIAL_SESSION') {
    // If it's the initial session check and it's null, we might actually be logged out
    // But if we have a hydrated user, let's verify via getSession before wiping
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      useAppStore.getState().setUser(null);
    }
  }

  useAppStore.getState().setInitializing(false);
});

// If user is already hydrated from persistence, finish init immediately
const hydratedUser = useAppStore.getState().user;
if (hydratedUser) {
  useAppStore.getState().setInitializing(false);
}

// Safety timeout: Ensure initialization always completes
setTimeout(() => {
  if (useAppStore.getState().isInitializing) {
    console.warn("Auth initialization timed out. Proceeding anyway.");
    useAppStore.getState().setInitializing(false);
  }
}, 5000);
