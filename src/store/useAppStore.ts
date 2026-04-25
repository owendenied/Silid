import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';

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
        await signOut(auth);
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

let profileUnsubscribe: (() => void) | null = null;

// Setup Firebase auth listener
onAuthStateChanged(auth, async (firebaseUser: User | null) => {
  if (profileUnsubscribe) {
    profileUnsubscribe();
    profileUnsubscribe = null;
  }

  if (firebaseUser) {
    // 2. Background Update: Use onSnapshot for robust offline cache + real-time updates
    profileUnsubscribe = onSnapshot(doc(db, 'users', firebaseUser.uid), (userDoc) => {
      if (userDoc.exists()) {
        const userData = userDoc.data();
        useAppStore.getState().setUser({
          id: firebaseUser.uid,
          role: userData.role || (userData.level === 'Guro' ? 'teacher' : 'student'),
          name: userData.name || firebaseUser.displayName || 'User',
          email: firebaseUser.email || '',
          xp: userData.xp || 0
        });
      }
      useAppStore.getState().setInitializing(false);
    }, (error) => {
      console.error("Error fetching background profile:", error);
      useAppStore.getState().setInitializing(false);
    });
  } else {
    useAppStore.getState().setUser(null);
    useAppStore.getState().setInitializing(false);
  }
});

// Safety timeout: Ensure initialization always completes even if Firebase hangs
setTimeout(() => {
  if (useAppStore.getState().isInitializing) {
    console.warn("Auth initialization timed out. Proceeding anyway.");
    useAppStore.getState().setInitializing(false);
  }
}, 3000);
