import React, { useState, useEffect } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { BookOpen, LogOut, WifiOff, Award, UserCircle } from 'lucide-react';
import { db } from '../lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { getLevelInfo } from '../lib/levels';

export const Layout = () => {
  const { user, isOffline, logout, setUser } = useAppStore();
  const navigate = useNavigate();
  const [liveXp, setLiveXp] = useState(user?.xp || 0);

  useEffect(() => {
    if (!user?.id) return;
    
    // Listen to real-time user updates (XP/Badges)
    const unsubscribe = onSnapshot(doc(db, 'users', user.id), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setLiveXp(data.xp || 0);
        // Sync back to store if needed
        if (data.xp !== user.xp) {
          setUser({ ...user, xp: data.xp });
        }
      }
    });

    return () => unsubscribe();
  }, [user?.id]);

  const levelInfo = getLevelInfo(liveXp);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {isOffline && (
        <div className="bg-orange-100 border-b border-orange-200 text-orange-800 px-4 py-2 flex items-center justify-center gap-2 text-sm font-medium z-50">
          <WifiOff size={16} />
          <span>Wala kang internet (Offline). Naka-save ang gawa mo at mag-sy-sync pagbalik online!</span>
        </div>
      )}
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <Link to="/dashboard" className="flex-shrink-0 flex items-center gap-2">
                <BookOpen className="text-[var(--color-silid-teal)]" size={28} />
                <span className="text-xl font-bold text-[var(--color-silid-teal)]">Silid</span>
              </Link>
            </div>
            <div className="flex items-center gap-6">
              {user.role === 'student' && (
                <Link to="/profile" className="hidden sm:flex items-center gap-2 bg-yellow-50 px-3 py-1 rounded-full border border-yellow-200 hover:bg-yellow-100 transition-colors">
                  <Award size={18} className="text-yellow-600" />
                  <span className="text-sm font-bold text-yellow-700">{levelInfo.title} ({liveXp} XP)</span>
                </Link>
              )}
              <Link to="/profile" className="flex items-center gap-2 hover:bg-gray-50 px-2 py-1 rounded-lg transition-colors">
                <UserCircle className="text-gray-400" size={24} />
                <span className="text-sm font-medium text-gray-700">{user.name}</span>
              </Link>
              <button
                onClick={handleLogout}
                className="text-gray-500 hover:text-red-600 transition-colors"
                title="Mag-log out"
              >
                <LogOut size={20} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
};
