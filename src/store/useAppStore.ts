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
        // 1. Clear state immediately
        set({ user: null });
        
        // 2. Clear all local storage to be sure
        localStorage.clear();
        
        // 3. Fire and forget Supabase signout
        supabase.auth.signOut().catch((e: any) => console.error(e));
        
        // 4. Redirect immediately
        window.location.replace('/login');
      },
    }),
    {
      name: 'silid-storage',
      partialize: (state) => ({ 
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
supabase.auth.onAuthStateChange(async (_event, session) => {
  if (session?.user) {
    const pendingRole = localStorage.getItem('pending_role') as 'student' | 'teacher' || 'student';
    
    // Check if user profile exists in local DB
    const { data: userData } = await supabase
      .from('users')
      .select('*')
      .eq('openId', session.user.id)
      .single();

    if (userData) {
      // Fetch progress from userProgress table
      const { data: progressData } = await supabase
        .from('userProgress')
        .select('xp')
        .eq('userId', userData.id)
        .single();

      useAppStore.getState().setUser({
        id: session.user.id,
        dbId: userData.id,
        role: userData.appRole || 'student',
        name: userData.name || session.user.user_metadata?.full_name || 'User',
        email: session.user.email || '',
        xp: progressData?.xp || 0
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
