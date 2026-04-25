import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PlusCircle, Sparkles, MessageSquare, Users, BookOpen, Clock, X, CheckCircle2, GraduationCap } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { supabase } from '../lib/supabase';
import { useT } from '../lib/i18n';

interface ClassroomData {
  id: number;
  name: string;
  section: string;
  teacherId: number;
  joinCode: string;
  _count?: { enrollments: number };
}

const GRADIENTS = [
  'bg-gradient-to-br from-[#C0392B] to-[#E74C3C]',
  'bg-gradient-to-br from-[#F5A623] to-[#F1C40F]',
  'bg-gradient-to-br from-[#27ae60] to-[#2ecc71]',
  'bg-gradient-to-br from-[#1B6CA8] to-[#2980B9]',
  'bg-gradient-to-br from-[#8E44AD] to-[#9B59B6]',
];

export const Dashboard = () => {
  const { user } = useAppStore();
  const t = useT();
  const [classes, setClasses] = useState<ClassroomData[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [newSection, setNewSection] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [stats, setStats] = useState({ totalStudents: 0, pendingGradings: 0, pendingAssignments: 0 });

  const ensureDbId = async (): Promise<number> => {
    if (!user) throw new Error('Not logged in');
    let currentDbId = user.dbId;
    if (currentDbId && currentDbId !== 0) return currentDbId;

    let { data } = await supabase.from('users').select('id').eq('openId', user.id).single();
    if (!data) {
      const { data: newProfile, error } = await supabase.from('users').insert([{
        openId: user.id, name: user.name, email: user.email, appRole: user.role
      }]).select('id').single();
      if (error) throw error;
      data = newProfile;
    }
    if (data?.id) {
      useAppStore.getState().setUser({ ...user, dbId: data.id });
      return data.id;
    }
    throw new Error('Could not get profile ID');
  };

  useEffect(() => {
    if (!user) return;

    const fetchClasses = async () => {
      try {
        const dbId = await ensureDbId();

        let data: ClassroomData[] | null = null;
        if (user.role === 'teacher') {
          const result = await supabase.from('classrooms').select('*').eq('teacherId', dbId);
          data = result.data;
        } else {
          const { data: enrolled } = await supabase.from('enrollments').select('classroomId').eq('studentId', dbId);
          const classroomIds = enrolled?.map((e: any) => e.classroomId) || [];
          if (classroomIds.length > 0) {
            const result = await supabase.from('classrooms').select('*').in('id', classroomIds);
            data = result.data;
          } else {
            data = [];
          }
        }

        const { data: counts } = await supabase.from('enrollments').select('classroomId');
        const classesWithCounts = (data || []).map((cls: any) => ({
          ...cls,
          _count: { enrollments: counts?.filter((e: any) => e.classroomId === cls.id).length || 0 }
        }));
        setClasses(classesWithCounts);

        if (user.role === 'teacher') {
          const studentCount = counts?.filter((e: any) =>
            (data || []).some((cls: any) => cls.id === e.classroomId)
          ).length || 0;
          setStats(prev => ({ ...prev, totalStudents: studentCount }));
        }
      } catch (e) {
        console.error('Error fetching classes:', e);
      }
    };

    fetchClasses();
  }, [user]);

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!user || user.role !== 'teacher') return;
    setIsSubmitting(true);

    try {
      const currentDbId = await ensureDbId();
      const newJoinCode = Math.random().toString(36).substring(2, 8).toUpperCase().padEnd(6, 'X');

      const { error: insertError } = await supabase.from('classrooms').insert([{
        name: newClassName, section: newSection, teacherId: currentDbId, joinCode: newJoinCode
      }]);
      if (insertError) throw new Error(insertError.message);

      setIsModalOpen(false);
      setNewClassName('');
      setNewSection('');

      const { data: refreshData } = await supabase.from('classrooms').select('*').eq('teacherId', currentDbId);
      setClasses(refreshData || []);
    } catch (error: any) {
      setErrorMsg(error.message || 'Unknown error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJoinClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const currentDbId = await ensureDbId();
      const trimmedCode = joinCode.trim().toUpperCase();

      const { data: classroom } = await supabase.from('classrooms').select('*').eq('joinCode', trimmedCode).single();
      if (!classroom) {
        setErrorMsg('Class not found. Make sure the code is correct.');
        setIsSubmitting(false);
        return;
      }

      const { data: existing } = await supabase.from('enrollments').select('*').eq('classroomId', classroom.id).eq('studentId', currentDbId).single();
      if (existing) {
        setErrorMsg('You are already enrolled in this class.');
        setIsSubmitting(false);
        return;
      }

      const { error: enrollError } = await supabase.from('enrollments').insert([{
        classroomId: classroom.id,
        studentId: currentDbId
      }]);
      if (enrollError) throw enrollError;

      setIsModalOpen(false);
      setJoinCode('');

      const { data: enrolled } = await supabase.from('enrollments').select('classroomId').eq('studentId', currentDbId);
      const classroomIds = enrolled?.map((e: any) => e.classroomId) || [];
      if (classroomIds.length > 0) {
        const { data: refreshData } = await supabase.from('classrooms').select('*').in('id', classroomIds);
        setClasses(refreshData || []);
      }
    } catch (error: any) {
      setErrorMsg(error.message || 'Error joining class.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-10">
      {/* Hero */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-extrabold font-display text-gray-900 tracking-tight">
            {user?.role === 'teacher' ? t('dash.greeting_teacher') : t('dash.greeting_student')}, <span className="bg-gradient-to-r from-[var(--color-silid-coral)] to-[var(--color-silid-yellow)] bg-clip-text text-transparent">{user?.name}!</span> 👋
          </h1>
          <p className="text-gray-500 text-lg mt-2 font-medium">
            {user?.role === 'teacher' ? t('dash.subtitle_teacher') : t('dash.subtitle_student')}
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className={`flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl font-bold transition-smooth btn-press ${
            user?.role === 'teacher'
              ? 'bg-gradient-coral text-white shadow-glow-coral hover:scale-105'
              : 'bg-gradient-gold text-white shadow-glow-gold hover:scale-105'
          }`}
        >
          {user?.role === 'teacher' ? <PlusCircle size={22} /> : <Users size={22} />}
          {user?.role === 'teacher' ? t('dash.new_class') : t('dash.join_class')}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-7 rounded-2xl shadow-soft border border-gray-100/50 flex items-center gap-5 hover:shadow-elevated transition-smooth">
          <div className="w-14 h-14 bg-gradient-coral text-white rounded-2xl flex items-center justify-center shadow-glow-coral">
            {user?.role === 'teacher' ? <GraduationCap size={28} /> : <BookOpen size={28} />}
          </div>
          <div>
            <p className="text-gray-500 font-bold text-xs uppercase tracking-wider">{user?.role === 'teacher' ? t('dash.my_classes') : t('dash.classes')}</p>
            <p className="text-3xl font-extrabold font-display text-gray-900">{classes.length}</p>
          </div>
        </div>

        {user?.role === 'teacher' ? (
          <div className="bg-white p-7 rounded-2xl shadow-soft border border-gray-100/50 flex items-center gap-5 hover:shadow-elevated transition-smooth">
            <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-green-600 text-white rounded-2xl flex items-center justify-center">
              <Users size={28} />
            </div>
            <div>
              <p className="text-gray-500 font-bold text-xs uppercase tracking-wider">{t('dash.total_students')}</p>
              <p className="text-3xl font-extrabold font-display text-gray-900">{stats.totalStudents}</p>
            </div>
          </div>
        ) : (
          <div className="bg-white p-7 rounded-2xl shadow-soft border border-gray-100/50 flex items-center gap-5 hover:shadow-elevated transition-smooth">
            <div className="w-14 h-14 bg-gradient-gold text-white rounded-2xl flex items-center justify-center shadow-glow-gold">
              <Sparkles size={28} />
            </div>
            <div>
              <p className="text-gray-500 font-bold text-xs uppercase tracking-wider">{t('dash.xp_earned')}</p>
              <p className="text-3xl font-extrabold font-display text-gray-900">{user?.xp || 0}</p>
            </div>
          </div>
        )}

        <div className="bg-white p-7 rounded-2xl shadow-soft border border-gray-100/50 flex items-center gap-5 hover:shadow-elevated transition-smooth">
          <div className="w-14 h-14 bg-gradient-teal text-white rounded-2xl flex items-center justify-center shadow-glow-teal">
            {user?.role === 'teacher' ? <CheckCircle2 size={28} /> : <Clock size={28} />}
          </div>
          <div>
            <p className="text-gray-500 font-bold text-xs uppercase tracking-wider">{user?.role === 'teacher' ? t('dash.to_grade') : t('dash.tasks')}</p>
            <p className="text-3xl font-extrabold font-display text-gray-900">{user?.role === 'teacher' ? stats.pendingGradings : stats.pendingAssignments}</p>
          </div>
        </div>
      </div>

      {/* Classes */}
      <div>
        <h2 className="text-2xl font-extrabold font-display text-gray-900 mb-6">{t('dash.your_classes')}</h2>
        {classes.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-gray-200 rounded-3xl p-16 text-center shadow-soft">
            <div className="w-24 h-24 bg-[var(--color-silid-cream)] rounded-full flex items-center justify-center mx-auto mb-6 text-gray-300">
              <BookOpen size={48} />
            </div>
            <h3 className="text-2xl font-extrabold font-display text-gray-800 mb-2">{t('dash.no_classes')}</h3>
            <p className="text-gray-500 mb-8 max-w-sm mx-auto text-lg leading-relaxed">
              {user?.role === 'teacher' ? t('dash.no_classes_teacher_desc') : t('dash.no_classes_student_desc')}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {classes.map((cls, idx) => (
              <Link key={cls.id} to={`/class/${cls.id}`} className="block group animate-fade-up" style={{ animationDelay: `${idx * 50}ms` }}>
                <div className="bg-white rounded-2xl shadow-soft border border-gray-100/50 overflow-hidden hover:shadow-elevated transition-smooth transform group-hover:-translate-y-1">
                  <div className={`h-36 ${GRADIENTS[cls.id % GRADIENTS.length]} p-6 flex flex-col justify-end relative overflow-hidden`}>
                    <div className="absolute top-0 right-0 p-4 opacity-15 transform translate-x-6 -translate-y-4">
                      <BookOpen size={120} className="text-white" />
                    </div>
                    <div className="relative z-10">
                      <h3 className="text-xl font-extrabold font-display text-white truncate">{cls.name}</h3>
                      <p className="text-white/80 font-medium text-sm">{cls.section}</p>
                    </div>
                  </div>
                  <div className="p-5 space-y-3">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2 text-gray-600 font-medium text-sm">
                        <Users size={16} className="text-[var(--color-silid-coral)]" />
                        <span>{cls._count?.enrollments || 0} {t('students')}</span>
                      </div>
                      <span className="bg-green-50 text-green-700 text-xs font-bold px-2.5 py-1 rounded-full">{t('active')}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <Clock size={14} />
                      <span>{t('dash.updated_ago')}</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Create/Join Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-elevated w-full max-w-md overflow-hidden animate-fade-up">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h2 className="text-xl font-extrabold font-display text-gray-900">
                {user?.role === 'teacher' ? t('dash.create_class_title') : t('dash.join_class_title')}
              </h2>
              <button onClick={() => { setIsModalOpen(false); setErrorMsg(''); }} className="text-gray-400 hover:text-gray-600 transition-smooth"><X size={24} /></button>
            </div>
            {user?.role === 'teacher' ? (
              <form onSubmit={handleCreateClass} className="p-6 space-y-4">
                {errorMsg && <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm font-medium">{errorMsg}</div>}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">{t('dash.class_name')}</label>
                  <input required value={newClassName} onChange={e => setNewClassName(e.target.value)} type="text" placeholder={t('dash.class_name_placeholder')} className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[var(--color-silid-coral)]/20 focus:border-[var(--color-silid-coral)] outline-none transition-smooth bg-gray-50" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">{t('dash.section')}</label>
                  <input value={newSection} onChange={e => setNewSection(e.target.value)} type="text" placeholder={t('dash.section_placeholder')} className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[var(--color-silid-coral)]/20 focus:border-[var(--color-silid-coral)] outline-none transition-smooth bg-gray-50" />
                </div>
                <div className="pt-4 flex gap-3 justify-end">
                  <button type="button" onClick={() => { setIsModalOpen(false); setErrorMsg(''); }} className="px-5 py-2.5 text-gray-600 font-bold hover:bg-gray-100 rounded-xl transition-smooth btn-press">{t('cancel')}</button>
                  <button type="submit" disabled={isSubmitting} className="px-5 py-2.5 bg-gradient-coral text-white font-bold rounded-xl hover:scale-105 disabled:opacity-50 transition-smooth shadow-glow-coral btn-press">
                    {isSubmitting ? t('creating') : t('create')}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleJoinClass} className="p-6 space-y-4">
                {errorMsg && <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm font-medium">{errorMsg}</div>}
                <p className="text-gray-600">{t('dash.join_prompt')}</p>
                <div>
                  <input type="text" required value={joinCode} onChange={e => setJoinCode(e.target.value)} placeholder="Class Code (e.g. X7P9M2)" className="w-full px-3.5 py-3 border border-gray-200 rounded-xl text-lg uppercase tracking-wider font-mono focus:ring-2 focus:ring-[var(--color-silid-coral)]/20 focus:border-[var(--color-silid-coral)] outline-none transition-smooth bg-gray-50" />
                </div>
                <div className="flex gap-3 justify-end pt-2">
                  <button type="button" onClick={() => { setIsModalOpen(false); setErrorMsg(''); }} className="px-5 py-2.5 text-gray-600 font-bold hover:bg-gray-100 rounded-xl transition-smooth btn-press">{t('cancel')}</button>
                  <button type="submit" disabled={isSubmitting} className="px-5 py-2.5 bg-gradient-coral text-white font-bold rounded-xl hover:scale-105 disabled:opacity-50 transition-smooth shadow-glow-coral btn-press">
                    {isSubmitting ? t('dash.joining') : t('dash.join')}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* CTA */}
      <div className="bg-gradient-coral rounded-3xl p-8 text-white relative overflow-hidden shadow-glow-coral">
        <div className="absolute right-0 top-0 opacity-10 transform translate-x-1/4 -translate-y-1/4"><Sparkles size={300} /></div>
        <div className="relative z-10 max-w-lg">
          <h2 className="text-3xl font-extrabold font-display mb-3">{t('dash.chat_title')}</h2>
          <p className="text-white/80 mb-6 text-lg">{t('dash.chat_desc')}</p>
          <Link to="/chat" className="inline-flex items-center gap-2 bg-gradient-gold text-white px-8 py-3.5 rounded-2xl font-extrabold hover:scale-105 transition-smooth shadow-glow-gold btn-press">
            <MessageSquare size={20} />
            {t('dash.start_chat')}
          </Link>
        </div>
      </div>
    </div>
  );
};
