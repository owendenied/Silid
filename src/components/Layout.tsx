import React, { useState, useEffect } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { BookOpen, LogOut, WifiOff, Award, UserCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getLevelInfo } from '../lib/levels';
import { useSync } from '../hooks/useSync';

export const Layout = () => {
  const { user, isOffline, isInitializing, logout, setUser } = useAppStore();
  const { syncing } = useSync();
  const navigate = useNavigate();
  const [liveXp, setLiveXp] = useState(user?.xp || 0);

  useEffect(() => {
    if (!isInitializing && !user) {
      navigate('/login');
    }
  }, [user, isInitializing, navigate]);

  useEffect(() => {
    if (!user?.id) return;
    
    // Listen to real-time user updates (XP/Badges)
    const profileChannel = supabase.channel(`layout-profile-${user.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'users', filter: `openId=eq.${user.id}` }, (payload) => {

        setLiveXp(payload.new.xp || 0);
        if (payload.new.xp !== user.xp) {
          setUser({ ...user, xp: payload.new.xp });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(profileChannel);
    };
  }, [user?.id, user, setUser]);

  const levelInfo = getLevelInfo(liveXp);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };


  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <BookOpen className="text-[var(--color-silid-teal)] animate-pulse" size={48} />
          <p className="text-gray-500 font-medium">Naglo-load ang Silid...</p>
        </div>
      </div>
    );
  }

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
      {syncing && (
        <div className="bg-blue-600 text-white px-4 py-1 flex items-center justify-center gap-2 text-xs font-bold animate-pulse">
          <span>Nag-sy-sync ng data...</span>
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
