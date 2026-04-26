import { useState, useEffect } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { BookOpen, LogOut, WifiOff, Award, Globe, Wifi, Home, MessageSquare, User, Moon, Sun } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getLevelInfo } from '../lib/levels';
import { useSync } from '../hooks/useSync';
import { useT, useLanguageStore } from '../lib/i18n';

export const Layout = () => {
  const { user, isOffline, isInitializing, theme, logout, setUser, setTheme } = useAppStore();
  const { syncing } = useSync();
  const navigate = useNavigate();
  const location = useLocation();
  const [liveXp, setLiveXp] = useState(user?.xp || 0);
  const t = useT();
  const { lang, setLang } = useLanguageStore();

  useEffect(() => {
    if (!isInitializing && !user) {
      navigate('/login');
    }
  }, [user, isInitializing, navigate]);


  useEffect(() => {
    if (!user?.id) return;
    const profileChannel = supabase.channel(`layout-profile-${user.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'users', filter: `openId=eq.${user.id}` }, (payload: any) => {
        setLiveXp(payload.new.xp || 0);
        if (payload.new.xp !== user.xp) {
          setUser({ ...user, xp: payload.new.xp });
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(profileChannel); };
  }, [user?.id, user, setUser]);

  const levelInfo = getLevelInfo(liveXp);

  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="flex flex-col items-center gap-4">
          <img src="/logo.png" alt="Silid Logo" className="w-16 h-16 rounded-2xl shadow-glow-coral animate-pulse object-cover" />
          <p className="text-gray-500 font-medium font-display">{t('loading')}</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const mobileNavItems = [
    { path: '/dashboard', icon: Home, label: 'Home' },
    { path: '/chat', icon: MessageSquare, label: 'Chat' },
    { path: '/profile', icon: User, label: 'Profile' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[var(--background)]">
      {/* Offline Banner */}
      {isOffline && (
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-2.5 flex items-center justify-center gap-2 text-sm font-medium safe-top">
          <WifiOff size={16} />
          <span>{t('nav.offline')}</span>
        </div>
      )}
      {syncing && (
        <div className="bg-gradient-teal text-white px-4 py-1.5 flex items-center justify-center gap-2 text-xs font-bold">
          <Wifi size={12} className="animate-pulse" />
          <span>{t('nav.syncing')}</span>
        </div>
      )}

      {/* Top Navigation */}
      <header className="glass sticky top-0 z-40 border-b border-white/20 shadow-soft safe-top">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex justify-between h-14 md:h-16">
            <div className="flex">
              <Link to="/dashboard" className="flex-shrink-0 flex items-center gap-2 group">
                <img src="/logo.png" alt="Silid Logo" className="w-8 h-8 md:w-9 md:h-9 rounded-xl shadow-glow-coral transition-smooth group-hover:scale-105 object-cover" />
                <span className="text-lg md:text-xl font-extrabold font-display bg-gradient-to-r from-[var(--color-silid-coral)] to-[var(--color-silid-yellow)] bg-clip-text text-transparent">
                  Silid
                </span>
              </Link>
            </div>
            <div className="flex items-center gap-2 md:gap-3">
              {/* Language Toggle */}
              <button
                onClick={() => setLang(lang === 'en' ? 'tl' : 'en')}
                className="flex items-center gap-1 px-2 md:px-3 py-1.5 text-[10px] md:text-xs font-bold rounded-full border border-gray-200/60 dark:border-gray-700 hover:bg-white/50 dark:hover:bg-gray-800 transition-smooth text-gray-600 dark:text-gray-300 btn-press"
              >
                <Globe size={12} />
                <span className="hidden sm:inline">{t('nav.language')}</span>
              </button>

              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="flex items-center gap-1 px-2 md:px-3 py-1.5 text-[10px] md:text-xs font-bold rounded-full border border-gray-200/60 dark:border-gray-700 hover:bg-white/50 dark:hover:bg-gray-800 transition-smooth text-gray-600 dark:text-gray-300 btn-press"
              >
                {theme === 'dark' ? <Sun size={12} /> : <Moon size={12} />}
              </button>

              {user.role === 'student' && (
                <Link to="/profile" className="hidden sm:flex items-center gap-2 bg-gradient-gold text-white px-3 py-1.5 rounded-full shadow-glow-gold hover:scale-105 transition-smooth btn-press">
                  <Award size={14} />
                  <span className="text-xs font-bold">{levelInfo.title} · {liveXp} XP</span>
                </Link>
              )}

              <Link to="/profile" className="flex items-center gap-2 hover:bg-white/50 px-2 py-1.5 rounded-xl transition-smooth">
                <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-gradient-coral flex items-center justify-center text-white text-xs md:text-sm font-bold">
                  {user.name.charAt(0)}
                </div>
                <span className="text-sm font-bold text-gray-700 hidden lg:inline">{user.name}</span>
              </Link>

              <button
                type="button"
                onClick={(e) => { e.preventDefault(); logout(); }}
                className="flex items-center gap-1 px-2 md:px-3 py-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-smooth btn-press"
                title={t('log_out')}
              >
                <LogOut size={16} />
                <span className="text-xs font-bold hidden lg:inline">{t('log_out')}</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 md:py-8 pb-24 md:pb-8">
        <Outlet />
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 glass border-t border-white/20 shadow-elevated z-40 safe-bottom">
        <div className="flex justify-around items-center h-16 px-4">
          {mobileNavItems.map(item => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link key={item.path} to={item.path} className={`flex flex-col items-center gap-0.5 py-1 px-4 rounded-xl transition-smooth btn-press ${isActive ? 'text-[var(--color-silid-coral)]' : 'text-gray-400'}`}>
                <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                <span className="text-[10px] font-bold">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
};
