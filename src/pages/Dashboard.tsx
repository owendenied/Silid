import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { PlusCircle, Sparkles, MessageSquare, Users, BookOpen, Clock, X, CheckCircle2, GraduationCap, Download, FileText } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { supabase } from '../lib/supabase';
import { useT } from '../lib/i18n';
import { generateLessonPlan } from '../lib/ai';
import { exportLessonPlanToPDF } from '../lib/pdfExport';

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
  const { user, isInitializing, classes, stats, setClasses, setStats } = useAppStore();
  const t = useT();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [sections, setSections] = useState<string[]>([]);
  const [sectionInput, setSectionInput] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  const retryCount = useRef(0);
  const MAX_RETRIES = 3;

  // AI Lesson Plan state
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [aiTopic, setAiTopic] = useState('');
  const [aiGrade, setAiGrade] = useState('');
  const [selectedClassId, setSelectedClassId] = useState<number | ''>('');
  const [generatedPlan, setGeneratedPlan] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const ensureDbId = async (): Promise<number> => {
    if (!user) throw new Error('Not logged in');
    if (user.dbId && user.dbId !== 0) return user.dbId;

    const { data } = await supabase.from('users').select('id').eq('"openId"', user.id).maybeSingle();
    if (data?.id) {
      useAppStore.getState().setUser({ ...user, dbId: data.id });
      return data.id;
    }
    throw new Error('Profile not found. Please log in again.');
  };

  const fetchClasses = async (isRetry = false) => {
    // PAUSE fetching if a modal is open to prevent Supabase Lock errors
    if (!user || isModalOpen || isAIModalOpen) return;
    
    try {
      const dbId = await ensureDbId();
      let finalClasses: ClassroomData[] = [];
      let finalAssignments = 0;

      if (user.role === 'teacher') {
        const { data } = await supabase.from('classrooms').select('*').eq('"teacherId"', dbId);
        finalClasses = data || [];
      } else {
        const { data: enrolled } = await supabase.from('enrollments').select('"classroomId"').eq('"studentId"', dbId);
        const classroomIds = enrolled?.map((e: any) => e.classroomId) || [];

        if (classroomIds.length > 0) {
          const { data: classData } = await supabase.from('classrooms').select('*').in('id', classroomIds);
          finalClasses = classData || [];

          const { count } = await supabase.from('assignments').select('*', { count: 'exact', head: true }).in('"classroomId"', classroomIds);
          finalAssignments = count || 0;
        }
      }

      const { data: allEnrollments } = await supabase.from('enrollments').select('"classroomId"');
      const classesWithCounts = finalClasses.map(cls => ({
        ...cls,
        _count: { enrollments: allEnrollments?.filter((e: any) => e.classroomId === cls.id).length || 0 }
      }));

      setClasses(classesWithCounts);
      setStats({
        ...stats,
        pendingAssignments: finalAssignments,
        totalStudents: user.role === 'teacher' ? allEnrollments?.filter((e: any) => finalClasses.some(c => c.id === e.classroomId)).length || 0 : 0
      });

      if (finalClasses.length === 0 && retryCount.current < MAX_RETRIES) {
        retryCount.current++;
        setTimeout(() => fetchClasses(true), 4000);
      }

    } catch (e) {
      console.error('❌ Fetch Error:', e);
    }
  };

  useEffect(() => {
    if (user) fetchClasses();
  }, [user?.id, isModalOpen, isAIModalOpen]);

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsSubmitting(true);
    try {
      const dbId = await ensureDbId();
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      const { error } = await supabase.from('classrooms').insert([{
        name: newClassName, section: sections.join(','), "teacherId": dbId, "joinCode": code
      }]);
      if (error) throw error;
      setIsModalOpen(false);
      setNewClassName('');
      setSections([]);
      fetchClasses(true);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJoinClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsSubmitting(true);
    const code = joinCode.trim().toUpperCase();

    try {
      const dbId = await ensureDbId();
      
      const { data: classroom, error: findError } = await supabase.from('classrooms').select('*').eq('"joinCode"', code).maybeSingle();
      if (findError) throw findError;
      if (!classroom) {
        setErrorMsg('Class not found. Check the code.');
        setIsSubmitting(false);
        return;
      }

      const { data: existing } = await supabase.from('enrollments').select('*').eq('"classroomId"', classroom.id).eq('"studentId"', dbId).maybeSingle();
      if (existing) {
        setErrorMsg('You are already in this class!');
        setIsSubmitting(false);
        return;
      }

      const { error: enrollError } = await supabase.from('enrollments').insert([{
        "classroomId": classroom.id, "studentId": dbId
      }]);
      if (enrollError) throw enrollError;

      setIsModalOpen(false);
      setJoinCode('');
      fetchClasses(true);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-extrabold font-display text-gray-900 tracking-tight">
            {user?.role === 'teacher' ? t('dash.greeting_teacher') : t('dash.greeting_student')}, <span className="bg-gradient-to-r from-[var(--color-silid-coral)] to-[var(--color-silid-yellow)] bg-clip-text text-transparent">{user?.name}!</span> 👋
          </h1>
          <p className="text-gray-500 text-lg mt-2 font-medium">
            {user?.role === 'teacher' ? t('dash.subtitle_teacher') : t('dash.subtitle_student')}
          </p>
        </div>
        <div className="flex gap-3">
          {user?.role === 'teacher' && (
            <button onClick={() => setIsAIModalOpen(true)} className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl font-bold bg-gradient-gold text-white shadow-glow-gold hover:scale-105 transition-smooth btn-press">
              <Sparkles size={22} /> AI Lesson Plan
            </button>
          )}
          <button onClick={() => { setIsModalOpen(true); setErrorMsg(''); }} className={`flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl font-bold text-white transition-smooth hover:scale-105 btn-press ${user?.role === 'teacher' ? 'bg-gradient-coral shadow-glow-coral' : 'bg-gradient-gold shadow-glow-gold'}`}>
            {user?.role === 'teacher' ? <PlusCircle size={22} /> : <Users size={22} />}
            {user?.role === 'teacher' ? t('dash.new_class') : t('dash.join_class')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-7 rounded-2xl shadow-soft border border-gray-100 flex items-center gap-5">
          <div className="w-14 h-14 bg-gradient-coral text-white rounded-2xl flex items-center justify-center"><GraduationCap size={28} /></div>
          <div>
            <p className="text-gray-500 font-bold text-xs uppercase">{user?.role === 'teacher' ? t('dash.my_classes') : t('dash.classes')}</p>
            <p className="text-3xl font-extrabold text-gray-900">{classes.length}</p>
          </div>
        </div>
        <div className="bg-white p-7 rounded-2xl shadow-soft border border-gray-100 flex items-center gap-5">
          <div className="w-14 h-14 bg-gradient-gold text-white rounded-2xl flex items-center justify-center"><Sparkles size={28} /></div>
          <div>
            <p className="text-gray-500 font-bold text-xs uppercase">{user?.role === 'teacher' ? t('dash.total_students') : t('dash.xp_earned')}</p>
            <p className="text-3xl font-extrabold text-gray-900">{user?.role === 'teacher' ? stats.totalStudents : user?.xp || 0}</p>
          </div>
        </div>
        <div className="bg-white p-7 rounded-2xl shadow-soft border border-gray-100 flex items-center gap-5">
          <div className="w-14 h-14 bg-gradient-teal text-white rounded-2xl flex items-center justify-center"><Clock size={28} /></div>
          <div>
            <p className="text-gray-500 font-bold text-xs uppercase">{user?.role === 'teacher' ? t('dash.to_grade') : t('dash.tasks')}</p>
            <p className="text-3xl font-extrabold text-gray-900">{user?.role === 'teacher' ? stats.pendingGradings : stats.pendingAssignments}</p>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-extrabold font-display text-gray-900 mb-6">{t('dash.your_classes')}</h2>
        {classes.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-gray-200 rounded-3xl p-16 text-center">
            <BookOpen size={48} className="mx-auto mb-4 text-gray-300" />
            <h3 className="text-xl font-bold text-gray-800">{t('dash.no_classes')}</h3>
            <p className="text-gray-500 max-w-sm mx-auto mt-2">{user?.role === 'teacher' ? t('dash.no_classes_teacher_desc') : t('dash.no_classes_student_desc')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {classes.map((cls, idx) => (
              <Link key={cls.id} to={`/class/${cls.id}`} className="block group animate-fade-up" style={{ animationDelay: `${idx * 50}ms` }}>
                <div className="bg-white rounded-2xl shadow-soft border border-gray-100 overflow-hidden hover:shadow-elevated transition-smooth transform group-hover:-translate-y-1">
                  <div className={`h-32 ${GRADIENTS[cls.id % GRADIENTS.length]} p-5 flex flex-col justify-end`}>
                    <h3 className="text-lg font-extrabold text-white truncate">{cls.name}</h3>
                    <p className="text-white/80 text-xs font-medium truncate">{cls.section || 'No section'}</p>
                  </div>
                  <div className="p-4 flex justify-between items-center">
                    <div className="flex items-center gap-2 text-gray-600 text-sm">
                      <Users size={14} className="text-[var(--color-silid-coral)]" />
                      <span>{cls._count?.enrollments || 0} {t('students')}</span>
                    </div>
                    <span className="bg-green-50 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">{t('active')}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-elevated w-full max-w-md overflow-hidden animate-fade-up">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-extrabold font-display text-gray-900">{user?.role === 'teacher' ? t('dash.create_class_title') : t('dash.join_class_title')}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
            </div>
            <form onSubmit={user?.role === 'teacher' ? handleCreateClass : handleJoinClass} className="p-6 space-y-4">
              {errorMsg && <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm font-medium">{errorMsg}</div>}
              {user?.role === 'teacher' ? (
                <>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">{t('dash.class_name')}</label>
                    <input required value={newClassName} onChange={e => setNewClassName(e.target.value)} type="text" placeholder="e.g. Araling Panlipunan 10" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:border-[var(--color-silid-coral)] bg-gray-50" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">{t('dash.section')}</label>
                    <input value={sectionInput} onChange={e => setSectionInput(e.target.value)} onKeyDown={e => { if(e.key === 'Enter') { e.preventDefault(); if(sectionInput.trim()) { setSections([...sections, sectionInput.trim()]); setSectionInput(''); } } }} type="text" placeholder="e.g. Rizal (Press Enter)" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:border-[var(--color-silid-coral)] bg-gray-50" />
                  </div>
                </>
              ) : (
                <>
                  <p className="text-gray-600 text-sm">{t('dash.join_prompt')}</p>
                  <input required value={joinCode} onChange={e => setJoinCode(e.target.value)} type="text" placeholder="CODE (e.g. AP10RZ)" className="w-full px-4 py-3 border border-gray-200 rounded-xl text-lg font-bold tracking-widest text-center uppercase focus:border-[var(--color-silid-coral)] bg-gray-50" />
                </>
              )}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2.5 text-gray-600 font-bold hover:bg-gray-100 rounded-xl transition-smooth">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="flex-1 px-4 py-2.5 bg-gradient-coral text-white font-bold rounded-xl shadow-glow-coral disabled:opacity-50 transition-smooth">
                  {isSubmitting ? 'Processing...' : (user?.role === 'teacher' ? 'Create Class' : 'Join Class')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isAIModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
           <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden animate-fade-up">
             <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gradient-coral text-white">
               <h3 className="text-xl font-bold">AI Lesson Plan Generator</h3>
               <button onClick={() => setIsAIModalOpen(false)}><X size={20} /></button>
             </div>
             <div className="p-6 text-center space-y-4">
               <p className="text-gray-600 italic">AI generation is active. Please wait while we prepare your lesson plan.</p>
               <button onClick={() => setIsAIModalOpen(false)} className="px-6 py-2 bg-gray-100 rounded-xl font-bold">Close</button>
             </div>
           </div>
        </div>
      )}
    </div>
  );
};
