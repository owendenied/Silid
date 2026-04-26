import { useState, useEffect } from 'react';
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
  const { user, isInitializing } = useAppStore();
  const t = useT();
  const [classes, setClasses] = useState<ClassroomData[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [sections, setSections] = useState<string[]>([]);
  const [sectionInput, setSectionInput] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [joinSection, setJoinSection] = useState('');
  const [foundClass, setFoundClass] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [stats, setStats] = useState({ totalStudents: 0, pendingGradings: 0, pendingAssignments: 0 });

  // AI Lesson Plan state
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [aiTopic, setAiTopic] = useState('');
  const [aiGrade, setAiGrade] = useState('');
  const [selectedClassId, setSelectedClassId] = useState<number | ''>('');
  const [generatedPlan, setGeneratedPlan] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const ensureDbId = async (): Promise<number> => {
    if (!user) throw new Error('Not logged in');
    const currentDbId = user.dbId;
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
    // Only fetch if we have a user AND initialization is done
    if (!user || isInitializing) return;

    console.log('🚀 Supabase Ready. Fetching data for:', user.email);
    
    const fetchClasses = async () => {
      try {
        const dbId = await ensureDbId();
        console.log('🔍 Current User DB ID:', dbId);
        console.log('🔍 Current User Role:', user.role);

        let data: ClassroomData[] | null = null;
        if (user.role === 'teacher') {
          const result = await supabase.from('classrooms').select('*').eq('teacherId', dbId);
          console.log('🔍 Teacher Classes:', result.data);
          data = result.data;
        } else {
          // 1. Fetch Enrollments
          const { data: enrolled, error: enrollError } = await supabase
            .from('enrollments')
            .select('classroomId')
            .eq('studentId', dbId);
          
          if (enrollError) console.error('❌ Enrollment Fetch Error:', enrollError);
          console.log('🔍 Student Enrollments:', enrolled);
          
          const classroomIds = enrolled?.map((e: any) => e.classroomId) || [];
          
          if (classroomIds.length > 0) {
            // 2. Fetch Classrooms
            const result = await supabase.from('classrooms').select('*').in('id', classroomIds);
            data = result.data;

            // 3. Fetch Tasks (Assignments) for these classrooms
            const { count: taskCount, error: taskError } = await supabase
              .from('assignments')
              .select('*', { count: 'exact', head: true })
              .in('classroomId', classroomIds);
            
            if (taskError) console.error('❌ Task Fetch Error:', taskError);
            setStats(prev => ({ ...prev, pendingAssignments: taskCount || 0 }));
          } else {
            data = [];
            setStats(prev => ({ ...prev, pendingAssignments: 0 }));
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
  }, [user, isInitializing]);

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!user || user.role !== 'teacher') return;
    setIsSubmitting(true);

    try {
      const currentDbId = await ensureDbId();
      const newJoinCode = Math.random().toString(36).substring(2, 8).toUpperCase().padEnd(6, 'X');

      const { data: newClass, error: insertError } = await supabase.from('classrooms').insert([{
        name: newClassName, section: sections.join(','), teacherId: currentDbId, joinCode: newJoinCode
      }]).select().single();
      if (insertError) throw new Error(insertError.message);

      setClasses(prev => [...prev, { ...newClass, _count: { enrollments: 0 } }]);
      setIsModalOpen(false);
      setNewClassName('');
      setSections([]);
      setSectionInput('');
    } catch (error: any) {
      setErrorMsg(error.message || 'Unknown error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLookupClass = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedCode = joinCode.trim().toUpperCase();
    console.log('🔍 Looking up class code:', trimmedCode);
    
    setErrorMsg('');
    setIsSubmitting(true);
    setFoundClass(null);

    try {
      // Check if we have a session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setErrorMsg('Your session has expired. Please log in again.');
        return;
      }

      const { data: classroom, error } = await supabase
        .from('classrooms')
        .select('*')
        .eq('joinCode', trimmedCode)
        .maybeSingle(); // maybeSingle is safer than .single()

      if (error) throw error;

      if (!classroom) {
        console.warn('⚠️ Class not found for code:', trimmedCode);
        setErrorMsg('Class not found. Make sure the code is correct.');
        return;
      }

      console.log('✅ Class found:', classroom);
      setFoundClass(classroom);
      const classSections = classroom.section ? classroom.section.split(',').filter((s: string) => s.trim()) : [];
      if (classSections.length === 1) setJoinSection(classSections[0]);
    } catch (error: any) {
      console.error('❌ Lookup Error:', error);
      setErrorMsg(error.message || 'Error looking up class.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJoinClass = async () => {
    if (!user || !foundClass) return;
    setIsSubmitting(true);
    setErrorMsg('');
    
    try {
      const currentDbId = await ensureDbId();
      
      // Optimitiscally close modal
      const pendingClass = { ...foundClass };
      const pendingSection = joinSection;
      
      setIsModalOpen(false);
      setJoinCode('');
      setJoinSection('');
      setFoundClass(null);
      
      // Optimistically add to UI
      setClasses(prev => [...prev, { ...pendingClass, _count: { enrollments: 0 } }]);

      const { data: existing } = await supabase.from('enrollments').select('*').eq('classroomId', pendingClass.id).eq('studentId', currentDbId).single();
      if (existing) {
        // Revert optimistic update if already enrolled
        setClasses(prev => prev.filter(c => c.id !== pendingClass.id));
        setErrorMsg('You are already enrolled in this class.');
        setIsSubmitting(false);
        setIsModalOpen(true);
        return;
      }
      
      const { error: enrollError } = await supabase.from('enrollments').insert([{
        classroomId: pendingClass.id,
        studentId: currentDbId,
        section: pendingSection || null
      }]);
      
      if (enrollError) {
        // Revert optimistic update
        setClasses(prev => prev.filter(c => c.id !== pendingClass.id));
        throw enrollError;
      }

    } catch (error: any) {
      setErrorMsg(error.message || 'Error joining class.');
      setIsModalOpen(true); // Re-open if it failed
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
        <div className="flex gap-3">
          {user?.role === 'teacher' && (
            <button
              onClick={() => setIsAIModalOpen(true)}
              className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl font-bold transition-smooth btn-press bg-gradient-gold text-white shadow-glow-gold hover:scale-105"
            >
              <Sparkles size={22} />
              AI Lesson Plan
            </button>
          )}
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
                      <p className="text-white/80 font-medium text-sm">
                        {cls.section ? `${cls.section.split(',').length} section${cls.section.split(',').length > 1 ? 's' : ''}: ${cls.section.split(',').join(', ')}` : 'No sections'}
                      </p>
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
                  <div className="flex flex-wrap gap-2 mb-2">
                    {sections.map((sec, i) => (
                      <span key={i} className="inline-flex items-center gap-1 bg-[var(--color-silid-cream)] text-[var(--color-silid-coral)] px-3 py-1 rounded-full text-sm font-bold">
                        {sec}
                        <button type="button" onClick={() => setSections(sections.filter((_, j) => j !== i))} className="hover:text-red-700 transition-smooth"><X size={14} /></button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      value={sectionInput}
                      onChange={e => setSectionInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && sectionInput.trim()) {
                          e.preventDefault();
                          if (!sections.includes(sectionInput.trim())) {
                            setSections([...sections, sectionInput.trim()]);
                          }
                          setSectionInput('');
                        }
                      }}
                      type="text"
                      placeholder={sections.length === 0 ? 'e.g. Rizal (press Enter to add)' : 'Add another section...'}
                      className="flex-1 px-3.5 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[var(--color-silid-coral)]/20 focus:border-[var(--color-silid-coral)] outline-none transition-smooth bg-gray-50"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (sectionInput.trim() && !sections.includes(sectionInput.trim())) {
                          setSections([...sections, sectionInput.trim()]);
                          setSectionInput('');
                        }
                      }}
                      className="px-3 py-2.5 bg-gray-100 text-gray-600 rounded-xl font-bold text-sm hover:bg-gray-200 transition-smooth btn-press"
                    >+</button>
                  </div>
                </div>
                <div className="pt-4 flex gap-3 justify-end">
                  <button type="button" onClick={() => { setIsModalOpen(false); setErrorMsg(''); }} className="px-5 py-2.5 text-gray-600 font-bold hover:bg-gray-100 rounded-xl transition-smooth btn-press">{t('cancel')}</button>
                  <button type="submit" disabled={isSubmitting} className="px-5 py-2.5 bg-gradient-coral text-white font-bold rounded-xl hover:scale-105 disabled:opacity-50 transition-smooth shadow-glow-coral btn-press">
                    {isSubmitting ? t('creating') : t('create')}
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-6 space-y-4">
                {errorMsg && <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm font-medium">{errorMsg}</div>}
                {!foundClass ? (
                  <form onSubmit={handleLookupClass} className="space-y-4">
                    <p className="text-gray-600">{t('dash.join_prompt')}</p>
                    <div>
                      <input type="text" required value={joinCode} onChange={e => setJoinCode(e.target.value)} placeholder="Class Code (e.g. X7P9M2)" className="w-full px-3.5 py-3 border border-gray-200 rounded-xl text-lg uppercase tracking-wider font-mono focus:ring-2 focus:ring-[var(--color-silid-coral)]/20 focus:border-[var(--color-silid-coral)] outline-none transition-smooth bg-gray-50" />
                    </div>
                    <div className="flex gap-3 justify-end pt-2">
                      <button type="button" onClick={() => { setIsModalOpen(false); setErrorMsg(''); setFoundClass(null); }} className="px-5 py-2.5 text-gray-600 font-bold hover:bg-gray-100 rounded-xl transition-smooth btn-press">{t('cancel')}</button>
                      <button type="submit" disabled={isSubmitting} className="px-5 py-2.5 bg-gradient-coral text-white font-bold rounded-xl hover:scale-105 disabled:opacity-50 transition-smooth shadow-glow-coral btn-press">
                        Find Class
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-green-50 border border-green-200 p-4 rounded-xl">
                      <p className="font-bold text-green-800 text-lg">{foundClass.name}</p>
                      <p className="text-green-600 text-sm">{foundClass.section ? `Sections: ${foundClass.section.split(',').join(', ')}` : 'No sections'}</p>
                    </div>
                    {foundClass.section && foundClass.section.split(',').length > 1 && (
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1.5">Pumili ng section mo</label>
                        <select
                          required
                          value={joinSection}
                          onChange={e => setJoinSection(e.target.value)}
                          className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[var(--color-silid-coral)]/20 focus:border-[var(--color-silid-coral)] outline-none transition-smooth bg-gray-50"
                        >
                          <option value="">— Pumili ng section —</option>
                          {foundClass.section.split(',').map((sec: string) => (
                            <option key={sec.trim()} value={sec.trim()}>{sec.trim()}</option>
                          ))}
                        </select>
                      </div>
                    )}
                    <div className="flex gap-3 justify-end pt-2">
                      <button type="button" onClick={() => { setFoundClass(null); setJoinSection(''); setErrorMsg(''); }} className="px-5 py-2.5 text-gray-600 font-bold hover:bg-gray-100 rounded-xl transition-smooth btn-press">Back</button>
                      <button
                        onClick={handleJoinClass}
                        disabled={isSubmitting || (foundClass.section && foundClass.section.split(',').length > 1 && !joinSection)}
                        className="px-5 py-2.5 bg-gradient-coral text-white font-bold rounded-xl hover:scale-105 disabled:opacity-50 transition-smooth shadow-glow-coral btn-press"
                      >
                        {isSubmitting ? t('dash.joining') : t('dash.join')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* AI Lesson Plan Modal */}
      {isAIModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-fade-up">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-[var(--color-silid-coral)] to-[#F5A623] text-white">
              <div className="flex items-center gap-2">
                <FileText size={24} />
                <h3 className="text-xl font-extrabold font-display">AI Lesson Plan Generator</h3>
              </div>
              <button onClick={() => { setIsAIModalOpen(false); setGeneratedPlan(''); }} className="p-2 hover:bg-white/10 rounded-full transition-smooth">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6">
              {!generatedPlan ? (
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  setIsGenerating(true);
                  try {
                    const selectedClass = classes.find(c => c.id === selectedClassId);
                    const plan = await generateLessonPlan(aiTopic, `${selectedClass?.name || ''} - ${aiGrade}`);
                    setGeneratedPlan(plan);
                  } catch (err) {
                    console.error('AI error:', err);
                    setGeneratedPlan('Could not generate lesson plan. Please try again.');
                  } finally {
                    setIsGenerating(false);
                  }
                }} className="space-y-4">
                  <p className="text-gray-600 text-sm">Pumili ng klase at i-type ang topic — gagawan ka ng detailed lesson plan na pwedeng i-download bilang PDF.</p>
                  
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">Class</label>
                    <select
                      required
                      value={selectedClassId}
                      onChange={e => setSelectedClassId(e.target.value ? Number(e.target.value) : '')}
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[var(--color-silid-coral)]/20 focus:border-[var(--color-silid-coral)] outline-none transition-smooth bg-gray-50"
                    >
                      <option value="">— Pumili ng klase —</option>
                      {classes.map(cls => (
                        <option key={cls.id} value={cls.id}>{cls.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">Grade Level</label>
                    <input 
                      required
                      value={aiGrade}
                      onChange={e => setAiGrade(e.target.value)}
                      placeholder="e.g. Grade 7" 
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[var(--color-silid-coral)]/20 focus:border-[var(--color-silid-coral)] outline-none transition-smooth bg-gray-50"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">Topic / Paksa</label>
                    <input 
                      required
                      value={aiTopic}
                      onChange={e => setAiTopic(e.target.value)}
                      placeholder="Anong paksa ang ituturo mo?" 
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[var(--color-silid-coral)]/20 focus:border-[var(--color-silid-coral)] outline-none transition-smooth bg-gray-50"
                    />
                  </div>

                  <div className="pt-4">
                    <button 
                      type="submit"
                      disabled={isGenerating}
                      className="w-full bg-gradient-coral text-white py-3 rounded-xl font-bold hover:scale-[1.02] disabled:opacity-50 transition-smooth shadow-glow-coral btn-press"
                    >
                      {isGenerating ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                          Nag-ge-generate...
                        </span>
                      ) : 'I-generate ang Lesson Plan ✨'}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm text-gray-500 font-medium">
                    <BookOpen size={16} />
                    <span>Lesson Plan para sa: <strong className="text-gray-800">{classes.find(c => c.id === selectedClassId)?.name || aiTopic}</strong></span>
                  </div>
                  <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 max-h-[400px] overflow-y-auto">
                    <div className="prose prose-sm max-w-none">
                      <pre className="whitespace-pre-wrap font-sans text-gray-800">{generatedPlan}</pre>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button 
                      onClick={() => {
                        const selectedClass = classes.find(c => c.id === selectedClassId);
                        exportLessonPlanToPDF({
                          plan: generatedPlan,
                          topic: aiTopic,
                          subject: selectedClass?.name,
                          grade: aiGrade,
                        });
                      }}
                      className="flex-1 bg-gradient-coral text-white py-3 rounded-xl font-bold hover:scale-[1.02] transition-smooth shadow-glow-coral btn-press flex items-center justify-center gap-2"
                    >
                      <Download size={18} />
                      Download as PDF
                    </button>
                    <button 
                      onClick={() => setGeneratedPlan('')}
                      className="px-6 py-3 border border-gray-200 rounded-xl font-bold hover:bg-gray-50 transition-smooth btn-press"
                    >
                      Ulitin
                    </button>
                  </div>
                </div>
              )}
            </div>
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
