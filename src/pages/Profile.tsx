import { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { Award, Star, Flame, Trophy, Target, BookOpen, Users, LayoutDashboard, Settings, X, Save } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getLevelInfo, calculateProgress } from '../lib/levels';
import { useT } from '../lib/i18n';

export const Profile = () => {
  const { user, setUser } = useAppStore();
  const t = useT();
  const [xp, setXp] = useState(user?.xp || 0);
  const [streak, setStreak] = useState(0);
  const [stats, setStats] = useState({ classes: 0, students: 0, finishedTasks: 0, readModules: 0 });
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editName, setEditName] = useState(user?.name || '');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!user) return;

    const fetchProfile = async () => {
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('openId', user.id)
        .single();
        
      if (data) {
        setXp(data.xp || 0);
        setStreak(data.streak || 0);
      }
    };
    fetchProfile();

    const profileChannel = supabase.channel(`profile-${user.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'users', filter: `id=eq.${user.id}` }, (payload: any) => {
        setXp(payload.new.xp || 0);
        setStreak(payload.new.streak || 0);
      })
      .subscribe();

    // Fetch stats
    const fetchStats = async () => {
      if (user.role === 'teacher') {
        const { data: classesData } = await supabase
          .from('classrooms')
          .select('*')
          .eq('teacherId', user.dbId);
        
        const classCount = classesData?.length || 0;
        
        let studentCount = 0;
        if (classesData && classesData.length > 0) {
          const classIds = classesData.map((c: any) => c.id);
          const { data: enrollments } = await supabase
            .from('enrollments')
            .select('studentId')
            .in('classroomId', classIds);
          studentCount = enrollments?.length || 0;
        }
        
        setStats(prev => ({ ...prev, classes: classCount, students: studentCount }));
      } else {
        const { data: enrollments } = await supabase
          .from('enrollments')
          .select('classroomId')
          .eq('studentId', user.dbId);
        
        const classCount = enrollments?.length || 0;
        
        const { data: submissionsData } = await supabase
          .from('submissions')
          .select('*')
          .eq('studentId', user.dbId);
        
        let finished = 0;
        let read = 0;
        
        submissionsData?.forEach((sub: any) => {
          if (sub.type === 'view') {
            read++;
          } else {
            finished++;
          }
        });
        
        setStats(prev => ({ ...prev, classes: classCount, finishedTasks: finished, readModules: read }));
      }
    };

    fetchStats();
    
    return () => {
      supabase.removeChannel(profileChannel);
    };
  }, [user]);

  const levelInfo = getLevelInfo(xp);

  const handleSaveProfile = async () => {
    if (!user || !editName.trim()) return;
    setIsSaving(true);
    
    try {
      await supabase
        .from('users')
        .update({ name: editName.trim() })
        .eq('openId', user.id);
      
      setUser({ ...user, name: editName.trim() });
      setIsEditOpen(false);
    } catch (e) {
      console.error('Error saving profile:', e);
    } finally {
      setIsSaving(false);
    }
  };

  const studentBadges = [
    { id: 'hard-worker', name: t('badge.hardwork'), desc: t('badge.hardwork_desc'), icon: <Star className="text-yellow-500" />, unlocked: stats.readModules >= 5 },
    { id: 'smart', name: t('badge.smart'), desc: t('badge.smart_desc'), icon: <Target className="text-blue-500" />, unlocked: stats.finishedTasks > 0 },
    { id: 'genius', name: t('badge.genius'), desc: t('badge.genius_desc'), icon: <Trophy className="text-purple-500" />, unlocked: xp >= 300 },
    { id: 'champion', name: t('badge.champion'), desc: t('badge.champion_desc'), icon: <Award className="text-red-500" />, unlocked: false },
  ];

  const teacherBadges = [
    { id: 'mentor', name: 'Mentor', desc: 'Created your first class.', icon: <BookOpen className="text-blue-500" />, unlocked: stats.classes >= 1 },
    { id: 'leader', name: 'Leader', desc: 'Taught 10+ students.', icon: <Users className="text-green-500" />, unlocked: stats.students >= 10 },
    { id: 'innovator', name: 'Innovator', desc: 'Created 5+ assignments.', icon: <Star className="text-yellow-500" />, unlocked: stats.finishedTasks >= 5 },
    { id: 'master', name: 'Master Teacher', desc: 'Created 3+ classes.', icon: <Trophy className="text-purple-500" />, unlocked: stats.classes >= 3 },
  ];

  if (!user) return null;

  const badges = user.role === 'teacher' ? teacherBadges : studentBadges;

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      {/* Profile Card */}
      <div className="bg-gradient-coral rounded-3xl p-8 text-white relative overflow-hidden shadow-glow-coral">
        <div className="flex items-center gap-6">
          <div className="w-24 h-24 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center text-white text-4xl font-extrabold font-display border-4 border-white/30">
            {user.name.charAt(0)}
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-extrabold font-display mb-1">{user.name}</h1>
            <p className="text-white/70">{user.email}</p>
            <span className="inline-block mt-2 px-3 py-1 text-sm font-bold bg-white/20 rounded-full backdrop-blur-sm">
              {user.role === 'teacher' ? t('profile.teacher_tag') : t('profile.student_tag')}
            </span>
          </div>
          <button 
            onClick={() => { setEditName(user.name); setIsEditOpen(true); }}
            className="bg-white/20 hover:bg-white/30 backdrop-blur-sm px-4 py-2 rounded-xl transition-smooth flex items-center gap-2 font-bold btn-press"
          >
            <Settings size={18} />
            {t('profile.edit')}
          </button>
        </div>
      </div>

      {/* XP / Level Bar */}
      {user.role === 'student' && (
        <div className="bg-white rounded-2xl p-6 shadow-soft border border-gray-100/50">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-xl font-extrabold font-display text-gray-900">{levelInfo.title}</h2>
              <p className="text-sm text-gray-500">{xp} XP</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">{levelInfo.maxXp - xp} XP to next level</p>
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div 
              className="h-full bg-gradient-gold rounded-full transition-all duration-500"
              style={{ width: `${calculateProgress(xp)}%` }}
            />
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-center">
          <LayoutDashboard className="mx-auto text-silid-teal mb-2" size={28} />
          <p className="text-2xl font-extrabold text-gray-900">{stats.classes}</p>
          <p className="text-sm text-gray-500 font-medium">{t('profile.active_classes')}</p>
        </div>
        {user.role === 'teacher' ? (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-center">
            <Users className="mx-auto text-green-600 mb-2" size={28} />
            <p className="text-2xl font-extrabold text-gray-900">{stats.students}</p>
            <p className="text-sm text-gray-500 font-medium">{t('profile.total_students')}</p>
          </div>
        ) : (
          <>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-center">
              <Flame className="mx-auto text-orange-500 mb-2" size={28} />
              <p className="text-2xl font-extrabold text-gray-900">{streak}</p>
              <p className="text-sm text-gray-500 font-medium">{t('profile.streak')} ({t('profile.days')})</p>
            </div>
          </>
        )}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-center">
          <Target className="mx-auto text-blue-600 mb-2" size={28} />
          <p className="text-2xl font-extrabold text-gray-900">{stats.finishedTasks}</p>
          <p className="text-sm text-gray-500 font-medium">{t('profile.tasks_done')}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-center">
          <BookOpen className="mx-auto text-purple-600 mb-2" size={28} />
          <p className="text-2xl font-extrabold text-gray-900">{stats.readModules}</p>
          <p className="text-sm text-gray-500 font-medium">{t('profile.modules_read')}</p>
        </div>
      </div>

      {/* Badges */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('profile.badges')}</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {badges.map((badge) => (
            <div 
              key={badge.id} 
              className={`p-6 rounded-2xl border text-center transition-all ${
                badge.unlocked 
                  ? 'bg-white border-yellow-200 shadow-sm hover:shadow-md' 
                  : 'bg-gray-50 border-gray-100 opacity-50'
              }`}
            >
              <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-gray-100 flex items-center justify-center">
                {badge.icon}
              </div>
              <h3 className="font-bold text-gray-900 text-sm">{badge.name}</h3>
              <p className="text-xs text-gray-500 mt-1">{badge.desc}</p>
              {badge.unlocked && (
                <span className="inline-block mt-2 text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">✓ Unlocked</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Teacher Dashboard Section */}
      {user.role === 'teacher' && (
        <div className="bg-blue-50 rounded-2xl p-8 border border-blue-100">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('profile.teacher_dashboard')}</h2>
          <p className="text-gray-600 mb-4">{t('profile.welcome_desc')}</p>
        </div>
      )}

      {/* Edit Profile Modal */}
      {isEditOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">{t('profile.edit')}</h2>
              <button onClick={() => setIsEditOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('profile.name')}</label>
                <input 
                  type="text" 
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-[var(--color-silid-teal)] focus:border-[var(--color-silid-teal)]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('login.email')}</label>
                <input 
                  type="email" 
                  value={user.email}
                  disabled
                  className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-500 cursor-not-allowed"
                />
              </div>
              <div className="flex gap-3 justify-end pt-4">
                <button onClick={() => setIsEditOpen(false)} className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-md">{t('cancel')}</button>
                <button 
                  onClick={handleSaveProfile}
                  disabled={isSaving || !editName.trim()}
                  className="px-4 py-2 bg-[var(--color-silid-teal)] text-white font-medium rounded-md hover:bg-blue-800 disabled:opacity-50 flex items-center gap-2"
                >
                  <Save size={16} />
                  {isSaving ? t('loading') : t('save')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
