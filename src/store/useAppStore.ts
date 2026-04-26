import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';

interface AppState {
  user: {
    id: string; 
    dbId: number; 
    role: 'student' | 'teacher';
    name: string;
    email: string;
    xp?: number;
  } | null;

  // Cached Data
  classes: any[];
  stats: { totalStudents: number; pendingGradings: number; pendingAssignments: number };

  isOffline: boolean;
  isInitializing: boolean;
  setUser: (user: AppState['user']) => void;
  setClasses: (classes: any[]) => void;
  setStats: (stats: AppState['stats']) => void;
  setOfflineStatus: (status: boolean) => void;
  setInitializing: (status: boolean) => void;
  logout: () => Promise<void>;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      user: null,
      classes: [],
      stats: { totalStudents: 0, pendingGradings: 0, pendingAssignments: 0 },
      isOffline: !navigator.onLine,
      isInitializing: true,
      setUser: (user) => set({ user }),
      setClasses: (classes) => set({ classes }),
      setStats: (stats) => set({ stats }),
      setOfflineStatus: (isOffline) => set({ isOffline }),
      setInitializing: (isInitializing) => set({ isInitializing }),
      logout: async () => {
        set({ user: null, classes: [], stats: { totalStudents: 0, pendingGradings: 0, pendingAssignments: 0 } });
        localStorage.clear();
        supabase.auth.signOut().catch((e: any) => console.error(e));
        window.location.replace('/login');
      },
    }),
    {
      name: 'silid-storage',
      partialize: (state) => ({ 
        user: state.user,
        classes: state.classes,
        stats: state.stats,
        isOffline: state.isOffline 
      }),
    }
  )
);

// Setup Offline/Online listeners
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
    
    try {
      // Use quoted "openId" for case sensitivity
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('"openId"', session.user.id)
        .maybeSingle();

      if (userData) {
        const { data: progressData } = await supabase
          .from('userProgress')
          .select('xp')
          .eq('"userId"', userData.id)
          .maybeSingle();

        useAppStore.getState().setUser({
          id: session.user.id,
          dbId: userData.id,
          role: (userData.appRole || 'student') as 'student' | 'teacher',
          name: userData.name || session.user.user_metadata?.full_name || 'User',
          email: session.user.email || '',
          xp: progressData?.xp || 0
        });
      } else {
        const { data: newProfile } = await supabase
          .from('users')
          .insert([{
            "openId": session.user.id,
            name: session.user.user_metadata?.full_name || 'User',
            email: session.user.email || '',
            "appRole": pendingRole,
          }])
          .select()
          .maybeSingle();

        if (newProfile) {
          useAppStore.getState().setUser({
            id: session.user.id,
            dbId: newProfile.id,
            role: newProfile.appRole as 'student' | 'teacher',
            name: newProfile.name || session.user.user_metadata?.full_name || 'User',
            email: session.user.email || '',
            xp: 0
          });
          localStorage.removeItem('pending_role');
        }
      }
    } catch (err) {
      console.error('❌ Auth error:', err);
    }
  } else if (_event === 'SIGNED_OUT') {
    useAppStore.getState().setUser(null);
  }

  useAppStore.getState().setInitializing(false);
});

// Safety Timeout
setTimeout(() => {
  useAppStore.getState().setInitializing(false);
}, 3000);
