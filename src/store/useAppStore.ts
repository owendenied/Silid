import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

interface AppState {
  user: {
    id: string;
    role: 'student' | 'teacher';
    name: string;
    email: string;
    xp?: number;
  } | null;
  isOffline: boolean;
  setUser: (user: AppState['user']) => void;
  setOfflineStatus: (status: boolean) => void;
  logout: () => Promise<void>;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      user: null,
      isOffline: !navigator.onLine,
      setUser: (user) => set({ user }),
      setOfflineStatus: (isOffline) => set({ isOffline }),
      logout: async () => {
        await signOut(auth);
        set({ user: null });
      },
    }),
    {
      name: 'silid-storage',
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

// Setup Firebase auth listener
onAuthStateChanged(auth, async (firebaseUser: User | null) => {
  if (firebaseUser) {
    try {
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
      const userData = userDoc.data();
      
      useAppStore.getState().setUser({
        id: firebaseUser.uid,
        role: userData?.role || 'student', // Fallback
        name: userData?.name || firebaseUser.displayName || 'Estudyante',
        email: firebaseUser.email || '',
      });
    } catch (e) {
      console.error("Error fetching user profile:", e);
      // Fallback
      useAppStore.getState().setUser({
        id: firebaseUser.uid,
        role: 'student', 
        name: firebaseUser.displayName || 'Estudyante',
        email: firebaseUser.email || '',
      });
    }
  } else {
    useAppStore.getState().setUser(null);
  }
});
