import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, GraduationCap, BookOpen, Sparkles, Shield, Zap } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { supabase } from '../lib/supabase';
import { useT } from '../lib/i18n';

export const Login = () => {
  const { user } = useAppStore();
  const t = useT();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'student' | 'teacher'>('student');
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const navigate = useNavigate();

  if (user) {
    navigate('/dashboard');
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      if (isRegistering) {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email, password,
          options: { data: { full_name: name, role: role } }
        });
        if (authError) throw authError;
        if (!authData.user) throw new Error('Failed to create user');

        await supabase.from('users').insert([{
          openId: authData.user.id, name, email, appRole: role
        }]);

        setSuccessMessage(t('login.signup_success'));
        setIsRegistering(false);
        setIsLoading(false);
        return;
      } else {
        useAppStore.getState().setInitializing(true);
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) {
          if (signInError.message.includes('Email not confirmed')) {
            throw new Error('Your email is not confirmed. Please check your inbox.');
          }
          throw signInError;
        }
      }
      navigate('/dashboard');
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'An error occurred.');
      useAppStore.getState().setInitializing(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-filipino-warm flex">
      {/* Left side — Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-coral relative overflow-hidden flex-col justify-center items-center p-12 text-white">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-40 h-40 rounded-full bg-white/20" />
          <div className="absolute bottom-20 right-10 w-60 h-60 rounded-full bg-white/10" />
          <div className="absolute top-1/3 right-1/4 w-32 h-32 rounded-full bg-white/15" />
        </div>
        <div className="relative z-10 text-center max-w-md">
          <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mx-auto mb-8 shadow-lg">
            <BookOpen size={40} className="text-white" />
          </div>
          <h1 className="text-5xl font-extrabold font-display mb-4 tracking-tight">Silid</h1>
          <p className="text-xl text-white/80 font-medium mb-12">Your premium Filipino Learning Management System</p>
          
          <div className="space-y-6 text-left">
            <div className="flex items-center gap-4 bg-white/10 backdrop-blur-sm p-4 rounded-xl">
              <Sparkles size={24} className="text-yellow-300 flex-shrink-0" />
              <div>
                <p className="font-bold text-sm">AI-Powered Learning</p>
                <p className="text-xs text-white/70">Instant grading & lesson planning with Guro Bot</p>
              </div>
            </div>
            <div className="flex items-center gap-4 bg-white/10 backdrop-blur-sm p-4 rounded-xl">
              <Shield size={24} className="text-green-300 flex-shrink-0" />
              <div>
                <p className="font-bold text-sm">Offline-First</p>
                <p className="text-xs text-white/70">Works without internet, syncs when back online</p>
              </div>
            </div>
            <div className="flex items-center gap-4 bg-white/10 backdrop-blur-sm p-4 rounded-xl">
              <Zap size={24} className="text-yellow-300 flex-shrink-0" />
              <div>
                <p className="font-bold text-sm">Gamified Experience</p>
                <p className="text-xs text-white/70">XP, badges, and levels to motivate students</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side — Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-6 sm:px-12 lg:px-16">
        <div className="max-w-md mx-auto w-full">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-gradient-coral flex items-center justify-center shadow-glow-coral">
              <BookOpen size={24} className="text-white" />
            </div>
            <span className="text-3xl font-extrabold font-display bg-gradient-to-r from-[var(--color-silid-coral)] to-[var(--color-silid-yellow)] bg-clip-text text-transparent">Silid</span>
          </div>

          <h2 className="text-3xl font-extrabold font-display text-gray-900 mb-2">
            {isRegistering ? t('login.create_account') : t('login.sign_in')}
          </h2>
          <p className="text-gray-500 mb-8 font-medium">
            {isRegistering ? 'Join the Silid community today.' : 'Welcome back! Enter your credentials.'}
          </p>

          <div className="mb-6">
            <label className="block text-sm font-bold text-gray-700 mb-3">{t('login.i_am')}</label>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => { setRole('student'); localStorage.setItem('pending_role', 'student'); }}
                className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-smooth btn-press ${
                  role === 'student' ? 'border-[var(--color-silid-coral)] bg-red-50 text-[var(--color-silid-coral)] shadow-glow-coral' : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                }`}>
                <Users size={28} className="mb-2" />
                <span className="font-bold text-sm">{t('login.student')}</span>
              </button>
              <button type="button" onClick={() => { setRole('teacher'); localStorage.setItem('pending_role', 'teacher'); }}
                className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-smooth btn-press ${
                  role === 'teacher' ? 'border-[var(--color-silid-coral)] bg-red-50 text-[var(--color-silid-coral)] shadow-glow-coral' : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                }`}>
                <GraduationCap size={28} className="mb-2" />
                <span className="font-bold text-sm">{t('login.instructor')}</span>
              </button>
            </div>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            {error && <div className="bg-red-50 border-l-4 border-red-400 p-3 rounded-r-xl"><p className="text-sm text-red-700 font-medium">{error}</p></div>}
            {successMessage && <div className="bg-green-50 border-l-4 border-green-400 p-3 rounded-r-xl"><p className="text-sm text-green-700 font-medium">{successMessage}</p></div>}

            {isRegistering && (
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">{t('login.name')}</label>
                <input id="name" type="text" required value={name} onChange={e => setName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:ring-2 focus:ring-[var(--color-silid-coral)]/20 focus:border-[var(--color-silid-coral)] outline-none transition-smooth text-sm" />
              </div>
            )}
            
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">{t('login.email')}</label>
              <input id="email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:ring-2 focus:ring-[var(--color-silid-coral)]/20 focus:border-[var(--color-silid-coral)] outline-none transition-smooth text-sm" />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">{t('login.password')}</label>
              <input id="password" type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:ring-2 focus:ring-[var(--color-silid-coral)]/20 focus:border-[var(--color-silid-coral)] outline-none transition-smooth text-sm" />
            </div>

            <button type="submit" disabled={isLoading}
              className="w-full py-3.5 bg-gradient-coral text-white font-extrabold rounded-xl hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100 transition-smooth shadow-glow-coral btn-press text-sm">
              {isLoading ? t('login.loading') : (isRegistering ? t('login.register_btn') : t('login.login_btn'))}
            </button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
              <div className="relative flex justify-center text-sm"><span className="px-4 bg-[var(--background)] text-gray-400 font-medium">{t('login.or')}</span></div>
            </div>
            <div className="mt-5">
              <button onClick={async () => {
                localStorage.setItem('pending_role', role);
                const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/dashboard` } });
                if (error) setError(error.message);
              }} className="w-full flex items-center justify-center gap-3 py-3 border border-gray-200 rounded-xl bg-white text-sm font-bold text-gray-700 hover:bg-gray-50 transition-smooth btn-press shadow-soft">
                <img className="h-5 w-5" src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" />
                {t('login.google')}
              </button>
            </div>
          </div>

          <div className="mt-6 text-center">
            <button onClick={() => setIsRegistering(!isRegistering)} className="font-bold text-[var(--color-silid-coral)] hover:underline text-sm">
              {isRegistering ? t('login.has_account') : t('login.no_account')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
