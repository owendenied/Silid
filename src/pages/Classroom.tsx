import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { Download, FileText, Plus, X, BookOpen, Megaphone, Send, Paperclip, BarChart3, Wand2, Archive } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useT } from '../lib/i18n';
import { generateModuleContent } from '../lib/ai';
import { validateAnswerKey } from '../lib/autoChecker';

interface Classwork {
  id: number;
  title: string;
  description: string;
  type: 'module' | 'quiz' | 'true_false' | 'identification' | 'short_answer' | 'essay';
  points: number;
  autoCheck?: boolean;
  answerKey?: string;
  questions?: any[];
  pdfUrl?: string;
  youtubeUrl?: string;
  createdAt: string;
}

interface Announcement {
  id: number;
  authorId: number;
  content: string;
  createdAt: string;
}


export const Classroom = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAppStore();
  const t = useT();
  const [activeTab, setActiveTab] = useState<'stream' | 'classwork' | 'modules' | 'people'>('stream');
  
  const [classroom, setClassroom] = useState<any>(null);
  const [classworks, setClassworks] = useState<Classwork[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [enrolledStudents, setEnrolledStudents] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [importStatus, setImportStatus] = useState('');
  
  // AI Module Generator state
  const [isAIModuleModalOpen, setIsAIModuleModalOpen] = useState(false);
  const [aiModuleTopic, setAiModuleTopic] = useState('');
  const [aiModuleGrade, setAiModuleGrade] = useState('');
  const [aiModuleSubject, setAiModuleSubject] = useState('');
  const [generatedModule, setGeneratedModule] = useState<{ title: string; content: string } | null>(null);
  const [isGeneratingModule, setIsGeneratingModule] = useState(false);

  // Section filter state
  const [sectionFilter, setSectionFilter] = useState('all');
  const [enrollmentSections, setEnrollmentSections] = useState<Record<number, string>>({});
  const [addSectionInput, setAddSectionInput] = useState('');
  
  // Form state
  const [newType, setNewType] = useState<'module' | 'quiz' | 'true_false' | 'identification' | 'short_answer' | 'essay'>('quiz');
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newPoints, setNewPoints] = useState(10);
  const [newAnswerKey, setNewAnswerKey] = useState('');
  const [newQuestions, setNewQuestions] = useState<any[]>([]);
  const [newFile, setNewFile] = useState<File | null>(null);
  const [answerKeyStatus, setAnswerKeyStatus] = useState<'idle' | 'validating' | 'valid' | 'invalid'>('idle');
  const [answerKeyMsg, setAnswerKeyMsg] = useState('');
  const [announcementContent, setAnnouncementContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;
    
    // Fetch classroom details
    const fetchClass = async () => {
      const { data } = await supabase
        .from('classrooms')
        .select('*')
        .eq('id', id)
        .single();
        
      if (data) {
        setClassroom(data);
      }
    };
    fetchClass();

    // Fetch classwork
    const fetchClasswork = async () => {
      const { data } = await supabase
        .from('assignments')
        .select('*')
        .eq('classroomId', id)
        .order('createdAt', { ascending: false });
        
      if (data) {
        setClassworks(data);
      }
    };
    fetchClasswork();

    // Fetch announcements
    const fetchAnnouncements = async () => {
      const { data } = await supabase
        .from('posts')
        .select('*')
        .eq('classroomId', id)
        .order('createdAt', { ascending: false });
        
      if (data) {
        setAnnouncements(data);
      }
    };

    fetchAnnouncements();

    // Fetch enrolled students with section data
    const fetchEnrolled = async () => {
      const { data: enrollments } = await supabase
        .from('enrollments')
        .select('studentId,section')
        .eq('classroomId', Number(id));
      
      if (enrollments && enrollments.length > 0) {
        const sectionMap: Record<number, string> = {};
        enrollments.forEach((e: any) => {
          if (e.section) sectionMap[e.studentId] = e.section;
        });
        setEnrollmentSections(sectionMap);
        const studentIds = enrollments.map((e: any) => e.studentId);
        const { data: students } = await supabase
          .from('users')
          .select('*')
          .in('id', studentIds);
        setEnrolledStudents(students || []);
      } else {
        setEnrolledStudents([]);
        setEnrollmentSections({});
      }
    };
    fetchEnrolled();

    // Set up realtime subscriptions (no-op with localDb but keeps code consistent)
    const classworkChannel = supabase.channel(`assignments-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'assignments', filter: `classroomId=eq.${id}` }, () => fetchClasswork())
      .subscribe();

    const announcementsChannel = supabase.channel(`posts-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts', filter: `classroomId=eq.${id}` }, () => fetchAnnouncements())
      .subscribe();

    return () => {
      supabase.removeChannel(classworkChannel);
      supabase.removeChannel(announcementsChannel);
    };
  }, [id]);

  const handleCreateClasswork = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || user.dbId !== classroom?.teacherId || !id) return;

    setIsSubmitting(true);

    try {
      let attachmentUrl = '';
      let attachmentName = '';

      if (newFile) {
        const fileExt = newFile.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `classwork_attachments/${fileName}`;
        const { error: uploadError } = await supabase.storage.from('attachments').upload(filePath, newFile);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from('attachments').getPublicUrl(filePath);
        attachmentUrl = publicUrl;
        attachmentName = newFile.name;
      }

      const classworkData: any = {
        classroomId: Number(id),
        createdBy: user.dbId,
        title: newTitle,
        description: newDesc,
        type: newType,
        points: newType === 'module' ? 0 : newPoints,
        attachmentUrl,
        attachmentName,
        answerKey: newAnswerKey || null,
        autoCheck: !!(newAnswerKey && answerKeyStatus !== 'invalid'),
      };

      if (newType === 'module') {
        classworkData.content = newContent;
      } else if (newType === 'quiz') {
        classworkData.questions = newQuestions.length > 0 ? newQuestions : [{
          question: newContent || 'Question?', options: ['A', 'B', 'C', 'D'], correctAnswer: 'A'
        }];
      } else if (newType === 'true_false') {
        classworkData.questions = newQuestions.length > 0 ? newQuestions : [{
          question: newContent || 'Statement?', correctAnswer: 'True'
        }];
      } else if (newType === 'identification') {
        classworkData.questions = newQuestions.length > 0 ? newQuestions : [{
          question: newContent || 'Question?', correctAnswer: newAnswerKey || 'Answer'
        }];
      }

      const { error } = await supabase.from('assignments').insert([classworkData]);


      if (error) throw error;

      // Refresh classwork list
      const { data: refreshed } = await supabase
        .from('assignments')
        .select('*')
        .eq('classroomId', Number(id))
        .order('createdAt', { ascending: false });
      if (refreshed) setClassworks(refreshed);

      setIsModalOpen(false);
      setNewTitle('');
      setNewDesc('');
      setNewContent('');
      setNewFile(null);
    } catch (error) {
      console.error(error);
      alert('May error sa paggawa ng gawain.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePostAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !id || !announcementContent.trim()) return;
    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('posts')
        .insert([{
          classroomId: Number(id),
          authorId: user.dbId,
          content: announcementContent,
        }]);

      if (error) throw error;

      // Refresh announcements
      const { data: refreshedPosts } = await supabase
        .from('posts')
        .select('*')
        .eq('classroomId', Number(id))
        .order('createdAt', { ascending: false });
      if (refreshedPosts) setAnnouncements(refreshedPosts);

      setAnnouncementContent('');
      setIsAnnouncementModalOpen(false);
    } catch (error) {
      console.error("Error posting announcement:", error);
      alert("May error sa pag-post ng anunsyo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!classroom) {
    return <div className="text-center py-12 text-gray-500">{t('loading')}</div>;
  }

  const isTeacher = user?.dbId === classroom.teacherId;
  const teacherName = isTeacher ? user?.name : 'Teacher';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="h-44 md:h-52 rounded-2xl bg-gradient-coral p-6 md:p-8 flex flex-col justify-end text-white shadow-glow-coral relative overflow-hidden animate-fade-up">
        <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-1/4 translate-y-1/4">
          <BookOpen size={200} />
        </div>
        <div className="relative z-10">
          <h1 className="text-3xl md:text-4xl font-extrabold font-display mb-1 truncate">{classroom.name}</h1>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            {classroom.section ? classroom.section.split(',').map((sec: string) => (
              <span key={sec.trim()} className="bg-white/20 text-white text-xs font-bold px-2.5 py-1 rounded-full backdrop-blur-sm">{sec.trim()}</span>
            )) : <span className="text-white/60 text-sm">No sections</span>}
            {isTeacher && (
              <div className="flex items-center gap-1">
                <input
                  value={addSectionInput}
                  onChange={e => setAddSectionInput(e.target.value)}
                  onKeyDown={async e => {
                    if (e.key === 'Enter' && addSectionInput.trim()) {
                      e.preventDefault();
                      const existing = classroom.section ? classroom.section.split(',').map((s: string) => s.trim()) : [];
                      if (!existing.includes(addSectionInput.trim())) {
                        const updated = [...existing, addSectionInput.trim()].join(',');
                        await supabase.from('classrooms').update({ section: updated }).eq('id', classroom.id);
                        setClassroom({ ...classroom, section: updated });
                      }
                      setAddSectionInput('');
                    }
                  }}
                  placeholder="+ Add section"
                  className="bg-white/20 text-white placeholder-white/50 text-xs font-bold px-2.5 py-1 rounded-full backdrop-blur-sm outline-none w-28 focus:bg-white/30 transition-smooth"
                />
              </div>
            )}
          </div>
        </div>
        {isTeacher && (
          <div className="absolute top-4 right-4 flex flex-wrap items-center gap-2">
            <Link to={`/teacher/gradebook/${classroom.id}`} className="bg-white/20 px-4 py-2 rounded-xl text-xs md:text-sm font-bold backdrop-blur-sm hover:bg-white/30 transition-smooth flex items-center gap-2 btn-press">
              <BarChart3 size={16} />
              Gradebook
            </Link>
            <div className="bg-black/20 px-3 py-2 rounded-xl text-xs md:text-sm font-mono backdrop-blur-sm">
              Code: <span className="font-bold text-white ml-1 text-base">{classroom.joinCode}</span>
            </div>
          </div>
        )}

      </div>

      {/* Archived Banner */}
      {classroom?.isArchived && (
        <div className="bg-gray-100 dark:bg-gray-800 border-l-4 border-gray-500 text-gray-700 dark:text-gray-300 p-4 mb-6 rounded-r-xl flex items-center gap-3 shadow-sm animate-fade-up">
          <Archive size={20} />
          <p className="font-bold text-sm">This class is archived. Content is read-only.</p>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 overflow-x-auto">
        <nav className="-mb-px flex gap-1 md:gap-6 min-w-max">
          {[
            { id: 'stream', label: t('class.stream') },
            { id: 'classwork', label: t('class.classwork') },
            { id: 'modules', label: t('class.modules') },
            { id: 'people', label: t('class.people') },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`
                whitespace-nowrap py-3 px-3 md:px-1 border-b-2 font-bold text-sm transition-smooth
                ${activeTab === tab.id
                  ? 'border-[var(--color-silid-coral)] text-[var(--color-silid-coral)]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
              `}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="py-4">
        {activeTab === 'stream' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-1 space-y-4 animate-slide-in-left">
              <div className="bg-white border border-gray-100/50 rounded-2xl p-5 shadow-soft">
                <h3 className="font-extrabold font-display text-gray-900 mb-2">Upcoming</h3>
                <p className="text-sm text-gray-500">No upcoming tasks.</p>
              </div>
            </div>
            <div className="lg:col-span-3 space-y-4">
              {isTeacher && !classroom?.isArchived && (
                <div 
                  onClick={() => setIsAnnouncementModalOpen(true)}
                  className="bg-white border border-gray-100/50 rounded-2xl p-4 shadow-soft flex items-center gap-4 cursor-pointer hover:shadow-elevated transition-smooth text-gray-500 btn-press"
                >
                  <div className="w-10 h-10 rounded-xl bg-gradient-coral flex items-center justify-center text-white font-bold">
                    {user?.name?.charAt(0) || 'T'}
                  </div>
                  <p className="font-medium">{t('class.share_something')}</p>
                </div>
              )}
              
              {announcements.length === 0 ? (
                <div className="bg-white border-2 border-dashed border-gray-200 rounded-2xl p-16 text-center text-gray-400">
                  <Megaphone className="mx-auto mb-3 opacity-20" size={48} />
                  <p className="font-medium">{t('class.no_announcements')}</p>
                </div>
              ) : (
                announcements.map((item, idx) => (
                  <div key={item.id} className="bg-white rounded-2xl p-6 shadow-soft border border-gray-100/50 flex gap-4 animate-fade-up" style={{ animationDelay: `${idx * 60}ms` }}>
                    <div className="w-12 h-12 bg-gradient-coral rounded-xl flex items-center justify-center text-white flex-shrink-0 font-bold text-lg">
                      {teacherName?.charAt(0) || 'T'}
                    </div>
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <span className="font-extrabold text-gray-900">{teacherName}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-[var(--color-silid-coral)]">(Teacher)</span>
                        <span className="text-xs text-gray-400">• {new Date(item.createdAt).toLocaleDateString()}</span>
                      </div>
                      <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{item.content}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'classwork' && (
          <div className="space-y-6">
            {isTeacher && !classroom?.isArchived && (
              <div className="flex gap-3">
                <button 
                  onClick={() => { setNewType('quiz'); setIsModalOpen(true); }}
                  className="flex items-center gap-2 bg-gradient-teal text-white px-4 py-2 rounded-xl font-bold hover:scale-105 transition-smooth shadow-glow-teal btn-press"
                >
                  <Plus size={20} />
                  {t('class.add_classwork')}
                </button>
              </div>
            )}

            <div className="space-y-3">
              {classworks.filter(cw => cw.type !== 'module').length === 0 ? (
                <div className="text-center py-12 text-gray-500">{t('class.no_classwork')}</div>
              ) : (
                classworks.filter(cw => cw.type !== 'module').map((cw, idx) => {
                  const typeColorMap: Record<string, string> = {
                    quiz: 'bg-blue-50 text-blue-700', true_false: 'bg-purple-50 text-purple-700',
                    identification: 'bg-amber-50 text-amber-700', short_answer: 'bg-green-50 text-green-700',
                    essay: 'bg-red-50 text-red-700',
                  };
                  const typeLabel: Record<string, string> = {
                    quiz: 'Quiz', true_false: 'True/False', identification: 'Identification',
                    short_answer: 'Short Answer', essay: 'Essay',
                  };
                  return (
                    <Link key={cw.id} to={`/assignment/${cw.id}`} className="block animate-fade-up" style={{ animationDelay: `${idx * 40}ms` }}>
                      <div className="bg-white border border-gray-100/50 rounded-xl p-4 shadow-soft hover:shadow-elevated transition-smooth flex items-center justify-between group cursor-pointer btn-press">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center group-hover:bg-[var(--color-silid-cream)] transition-smooth">
                            <FileText className="text-gray-400 group-hover:text-[var(--color-silid-coral)] transition-smooth" size={24} />
                          </div>
                          <div>
                            <h3 className="text-base font-extrabold text-gray-900 group-hover:text-[var(--color-silid-coral)] transition-smooth">{cw.title}</h3>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${typeColorMap[cw.type] || 'bg-gray-100 text-gray-600'}`}>
                                {typeLabel[cw.type] || cw.type}
                              </span>
                              {cw.autoCheck && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gradient-gold text-white">AI ✓</span>}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="inline-block bg-gray-50 text-gray-600 px-3 py-1 rounded-full text-xs font-bold">
                            {cw.points > 0 ? `${cw.points} pts` : '—'}
                          </span>
                        </div>
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          </div>
        )}

        {activeTab === 'modules' && (
          <div className="space-y-6">
            {isTeacher && !classroom?.isArchived && (
              <div className="flex gap-3">
                <button 
                  onClick={() => { setNewType('module'); setIsModalOpen(true); }}
                  className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-green-700 transition-smooth shadow-sm btn-press"
                >
                  <Plus size={20} />
                  {t('class.add_module')}
                </button>
                <button 
                  onClick={() => setIsAIModuleModalOpen(true)}
                  className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-2 rounded-xl font-bold hover:scale-105 transition-smooth shadow-sm btn-press"
                >
                  <Wand2 size={20} />
                  AI Module
                </button>
              </div>
            )}

            <div className="space-y-3">
              {classworks.filter(cw => cw.type === 'module').length === 0 ? (
                <div className="text-center py-12 text-gray-500 font-medium">{t('class.no_modules')}</div>
              ) : (
                classworks.filter(cw => cw.type === 'module').map((cw, idx) => (
                  <Link key={cw.id} to={`/assignment/${cw.id}`} className="block animate-fade-up" style={{ animationDelay: `${idx * 40}ms` }}>
                    <div className="bg-white border border-gray-100/50 rounded-xl p-4 shadow-soft hover:shadow-elevated transition-smooth flex items-center justify-between group cursor-pointer btn-press">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center group-hover:bg-green-100 transition-smooth">
                          <BookOpen className="text-green-600 group-hover:text-green-700 transition-smooth" size={24} />
                        </div>
                        <div>
                          <h3 className="text-base font-extrabold text-gray-900 group-hover:text-green-700 transition-smooth">{cw.title}</h3>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-50 text-green-700 mt-1 inline-block">
                            {t('class.module')}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                         <span className="inline-block bg-gradient-gold text-white px-3 py-1 rounded-full text-xs font-bold shadow-glow-gold">
                           +5 XP
                         </span>
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'people' && (
          <div className="space-y-8">
            <div className="animate-fade-up">
              <h2 className="text-xl font-extrabold font-display text-[var(--color-silid-coral)] mb-4 border-b-2 border-[var(--color-silid-coral)]/20 pb-2">{t('class.teachers')}</h2>
              <div className="flex items-center gap-4 p-4 bg-white rounded-xl shadow-soft border border-gray-100/50">
                <div className="w-10 h-10 rounded-xl bg-gradient-coral flex items-center justify-center text-white font-bold">
                  {user?.name?.charAt(0) || 'T'}
                </div>
                <div>
                  <span className="font-bold text-gray-900">{isTeacher ? user?.name : teacherName}</span>
                  <p className="text-xs text-gray-500">{isTeacher ? user?.email : ''}</p>
                </div>
              </div>
            </div>
            <div className="animate-fade-up" style={{ animationDelay: '100ms' }}>
            <div className="bg-white rounded-2xl shadow-soft border border-gray-100/50 p-6">
              <div className="flex flex-wrap justify-between items-center mb-4 border-b-2 border-[var(--color-silid-coral)]/20 pb-2 gap-2">
                <h2 className="text-xl font-extrabold font-display text-[var(--color-silid-coral)]">{t('class.students_list')}</h2>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-gray-500">
                    {sectionFilter === 'all'
                      ? `${enrolledStudents.length} students`
                      : `${enrolledStudents.filter(s => enrollmentSections[s.id] === sectionFilter).length} students`
                    }
                  </span>
                  {user?.dbId === classroom.teacherId && (
                    <button 
                      onClick={() => setIsImportModalOpen(true)}
                      className="flex items-center gap-2 text-[var(--color-silid-coral)] hover:bg-red-50 px-3 py-1.5 rounded-xl border border-[var(--color-silid-coral)]/30 transition-smooth text-xs font-bold btn-press"
                    >
                      <Plus size={14} />
                      Import CSV
                    </button>
                  )}
                </div>
              </div>

              {/* Section filter pills */}
              {classroom.section && classroom.section.split(',').length > 1 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  <button
                    onClick={() => setSectionFilter('all')}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-smooth btn-press ${
                      sectionFilter === 'all'
                        ? 'bg-[var(--color-silid-coral)] text-white shadow-glow-coral'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    All ({enrolledStudents.length})
                  </button>
                  {classroom.section.split(',').map((sec: string) => {
                    const count = enrolledStudents.filter(s => enrollmentSections[s.id] === sec.trim()).length;
                    return (
                      <button
                        key={sec.trim()}
                        onClick={() => setSectionFilter(sec.trim())}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold transition-smooth btn-press ${
                          sectionFilter === sec.trim()
                            ? 'bg-[var(--color-silid-coral)] text-white shadow-glow-coral'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {sec.trim()} ({count})
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="space-y-2">
                {(() => {
                  const filtered = sectionFilter === 'all'
                    ? enrolledStudents
                    : enrolledStudents.filter(s => enrollmentSections[s.id] === sectionFilter);
                  return filtered.length === 0 ? (
                    <p className="text-gray-500 p-6 text-center">{t('class.no_students')}</p>
                  ) : (
                    filtered.map((s: any, idx: number) => (
                      <div key={s.id} className="flex items-center gap-4 p-3 bg-white hover:shadow-soft rounded-xl transition-smooth animate-fade-up border border-gray-100/50" style={{ animationDelay: `${idx * 30}ms` }}>
                        <div className="w-9 h-9 rounded-lg bg-gradient-gold text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                          {s.name?.charAt(0) || '?'}
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="font-bold text-sm text-gray-900 block truncate">{s.name}</span>
                          <p className="text-xs text-gray-400 truncate">{s.email}</p>
                        </div>
                        {enrollmentSections[s.id] && (
                          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 flex-shrink-0">
                            {enrollmentSections[s.id]}
                          </span>
                        )}
                      </div>
                    ))
                  );
                })()}
              </div>
            </div>
            </div>
          </div>
        )}
      </div>

      {/* Create Classwork Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-elevated w-full max-w-lg overflow-hidden animate-fade-up">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h2 className="text-xl font-extrabold font-display text-gray-900">{t('class.create')}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-smooth">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleCreateClasswork} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['quiz', 'true_false', 'identification', 'short_answer', 'essay', 'module'] as const).map(type => (
                    <button key={type} type="button" onClick={() => setNewType(type)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold transition-smooth btn-press ${newType === type ? 'bg-gradient-coral text-white shadow-glow-coral' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                      {type === 'quiz' ? 'Quiz' : type === 'true_false' ? 'True/False' : type === 'identification' ? 'Identification' : type === 'short_answer' ? 'Short Answer' : type === 'essay' ? 'Essay' : 'Module'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Title</label>
                <input required value={newTitle} onChange={e => setNewTitle(e.target.value)} type="text" placeholder="e.g., Quiz 1: Philippine Revolution"
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl bg-gray-50 focus:ring-2 focus:ring-[var(--color-silid-coral)]/20 focus:border-[var(--color-silid-coral)] outline-none transition-smooth" />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Description / Instructions</label>
                <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} rows={2} placeholder="Instructions for students..."
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl bg-gray-50 focus:ring-2 focus:ring-[var(--color-silid-coral)]/20 focus:border-[var(--color-silid-coral)] outline-none transition-smooth resize-none" />
              </div>

              {newType !== 'module' && (
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">Points</label>
                  <input type="number" min="1" max="100" value={newPoints} onChange={e => setNewPoints(Number(e.target.value))}
                    className="w-32 px-3.5 py-2.5 border border-gray-200 rounded-xl bg-gray-50 focus:ring-2 focus:ring-[var(--color-silid-coral)]/20 focus:border-[var(--color-silid-coral)] outline-none transition-smooth" />
                </div>
              )}

              {newType === 'module' && (
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">Module Content</label>
                  <textarea value={newContent} onChange={e => setNewContent(e.target.value)} rows={6} placeholder="Write the module content here..."
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl bg-gray-50 focus:ring-2 focus:ring-[var(--color-silid-coral)]/20 focus:border-[var(--color-silid-coral)] outline-none transition-smooth resize-none" />
                </div>
              )}

              {(newType === 'quiz') && (
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                  <label className="block text-sm font-bold text-blue-800 mb-2">Question</label>
                  <input value={newContent} onChange={e => setNewContent(e.target.value)} type="text" placeholder="What is...?"
                    className="w-full px-3 py-2 border border-blue-200 rounded-lg bg-white text-sm mb-3" />
                  <label className="block text-xs font-bold text-blue-700 mb-1">Options (comma separated)</label>
                  <input type="text" placeholder="Option A, Option B, Option C, Option D" className="w-full px-3 py-2 border border-blue-200 rounded-lg bg-white text-sm mb-3"
                    onChange={e => {
                      const opts = e.target.value.split(',').map(o => o.trim()).filter(Boolean);
                      setNewQuestions([{ question: newContent, options: opts.length > 0 ? opts : ['A','B','C','D'], correctAnswer: newAnswerKey || opts[0] || 'A' }]);
                    }} />
                  <label className="block text-xs font-bold text-blue-700 mb-1">Correct Answer</label>
                  <input value={newAnswerKey} onChange={e => { setNewAnswerKey(e.target.value); setAnswerKeyStatus('valid'); }} type="text" placeholder="The correct answer"
                    className="w-full px-3 py-2 border border-blue-200 rounded-lg bg-white text-sm" />
                </div>
              )}

              {(newType === 'true_false') && (
                <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
                  <label className="block text-sm font-bold text-purple-800 mb-2">Statement</label>
                  <input value={newContent} onChange={e => setNewContent(e.target.value)} type="text" placeholder="The Earth revolves around the Sun."
                    className="w-full px-3 py-2 border border-purple-200 rounded-lg bg-white text-sm mb-3" />
                  <label className="block text-xs font-bold text-purple-700 mb-1">Correct Answer</label>
                  <select value={newAnswerKey || 'True'} onChange={e => { setNewAnswerKey(e.target.value); setAnswerKeyStatus('valid'); setNewQuestions([{ question: newContent, correctAnswer: e.target.value }]); }}
                    className="px-3 py-2 border border-purple-200 rounded-lg bg-white text-sm">
                    <option value="True">True</option>
                    <option value="False">False</option>
                  </select>
                </div>
              )}

              {(newType === 'identification') && (
                <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
                  <label className="block text-sm font-bold text-amber-800 mb-2">Question</label>
                  <input value={newContent} onChange={e => setNewContent(e.target.value)} type="text" placeholder="He wrote Noli Me Tangere."
                    className="w-full px-3 py-2 border border-amber-200 rounded-lg bg-white text-sm mb-3" />
                  <label className="block text-xs font-bold text-amber-700 mb-1">Correct Answer</label>
                  <input value={newAnswerKey} onChange={e => { setNewAnswerKey(e.target.value); setAnswerKeyStatus('valid'); setNewQuestions([{ question: newContent, correctAnswer: e.target.value }]); }} type="text" placeholder="Jose Rizal"
                    className="w-full px-3 py-2 border border-amber-200 rounded-lg bg-white text-sm" />
                </div>
              )}

              {(newType === 'short_answer' || newType === 'essay') && (
                <div className="bg-green-50 p-4 rounded-xl border border-green-100 space-y-3">
                  <div>
                    <label className="block text-sm font-bold text-green-800 mb-1.5">Answer Key / Rubric</label>
                    <p className="text-xs text-green-600 mb-2">Provide the model answer or grading rubric. AI will use this to auto-grade submissions.</p>
                    <textarea value={newAnswerKey} onChange={e => { setNewAnswerKey(e.target.value); setAnswerKeyStatus('idle'); setAnswerKeyMsg(''); }} rows={4} placeholder="Write the answer key, rubric, or model answer..."
                      className="w-full px-3 py-2 border border-green-200 rounded-lg bg-white text-sm resize-none" />
                  </div>
                  {newAnswerKey && (
                    <button type="button" onClick={async () => {
                      setAnswerKeyStatus('validating');
                      const result = await validateAnswerKey(newAnswerKey, newType);
                      setAnswerKeyStatus(result.valid ? 'valid' : 'invalid');
                      setAnswerKeyMsg(result.reason);
                    }} className="text-xs font-bold text-green-700 bg-green-100 px-3 py-1.5 rounded-full hover:bg-green-200 transition-smooth">
                      {answerKeyStatus === 'validating' ? '⏳ Validating...' : '🔍 Validate Answer Key'}
                    </button>
                  )}
                  {answerKeyMsg && (
                    <p className={`text-xs font-medium ${answerKeyStatus === 'valid' ? 'text-green-700' : answerKeyStatus === 'invalid' ? 'text-red-600' : 'text-gray-500'}`}>
                      {answerKeyStatus === 'valid' ? '✅' : '❌'} {answerKeyMsg}
                    </p>
                  )}
                  {!newAnswerKey && (
                    <p className="text-xs text-amber-600 font-medium">⚠ Without an answer key, submissions will need manual grading.</p>
                  )}
                </div>
              )}

              <div className="border-t border-gray-100 pt-4">
                <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                  <Paperclip size={16} /> Attachment (Optional)
                </label>
                <input type="file" onChange={e => setNewFile(e.target.files ? e.target.files[0] : null)}
                  className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-red-50 file:text-[var(--color-silid-coral)] hover:file:bg-red-100 transition-smooth" />
              </div>

              <div className="pt-4 flex gap-3 justify-end">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-gray-600 font-bold hover:bg-gray-100 rounded-xl transition-smooth btn-press">{t('cancel')}</button>
                <button type="submit" disabled={isSubmitting} className="px-5 py-2.5 bg-gradient-coral text-white font-bold rounded-xl hover:scale-105 disabled:opacity-50 transition-smooth shadow-glow-coral btn-press">
                  {isSubmitting ? t('creating') : t('create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Announcement Modal */}
      {isAnnouncementModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-6 border-b border-gray-50">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Megaphone className="text-[var(--color-silid-teal)]" />
                Mag-post ng Anunsyo
              </h2>
              <button onClick={() => setIsAnnouncementModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handlePostAnnouncement} className="p-6 space-y-4">
              <textarea 
                required
                autoFocus
                value={announcementContent}
                onChange={e => setAnnouncementContent(e.target.value)}
                placeholder="Ano ang gusto mong sabihin sa iyong mga mag-aaral?"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[var(--color-silid-teal)]/20 focus:border-[var(--color-silid-teal)] outline-none min-h-[150px] resize-none text-gray-800"
              />
              <div className="flex justify-end gap-3 pt-2">
                <button 
                  type="button"
                  onClick={() => setIsAnnouncementModalOpen(false)}
                  className="px-6 py-2 text-gray-500 font-medium hover:bg-gray-100 rounded-xl transition-colors"
                >
                  Kanselahin
                </button>
                <button 
                  type="submit"
                  disabled={isSubmitting || !announcementContent.trim()}
                  className="px-8 py-2 bg-[var(--color-silid-teal)] text-white font-bold rounded-xl hover:bg-blue-800 disabled:opacity-50 transition-all flex items-center gap-2 shadow-lg shadow-blue-200"
                >
                  {isSubmitting ? 'Ipino-post...' : (
                    <><Send size={18} /> I-post</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* AI Module Generator Modal */}
      {isAIModuleModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-fade-up">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
              <div className="flex items-center gap-2">
                <Wand2 size={24} />
                <h3 className="text-xl font-bold">AI Module Generator</h3>
              </div>
              <button onClick={() => { setIsAIModuleModalOpen(false); setGeneratedModule(null); }} className="p-2 hover:bg-white/10 rounded-full transition-smooth">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6">
              {!generatedModule ? (
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  setIsGeneratingModule(true);
                  try {
                    const result = await generateModuleContent(aiModuleTopic, `${aiModuleSubject} - ${aiModuleGrade}`);
                    setGeneratedModule(result);
                  } catch (err) {
                    console.error('AI module error:', err);
                  } finally {
                    setIsGeneratingModule(false);
                  }
                }} className="space-y-4">
                  <p className="text-gray-600 text-sm">Gumawa ng educational module gamit ang AI. I-type lang ang topic at gagawan ka ng content na pwedeng basahin ng mga estudyante.</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Subject</label>
                      <input 
                        required
                        value={aiModuleSubject}
                        onChange={e => setAiModuleSubject(e.target.value)}
                        placeholder="e.g. Science, Math" 
                        className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-smooth"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Grade Level</label>
                      <input 
                        required
                        value={aiModuleGrade}
                        onChange={e => setAiModuleGrade(e.target.value)}
                        placeholder="e.g. Grade 7" 
                        className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-smooth"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Topic / Paksa</label>
                    <input 
                      required
                      value={aiModuleTopic}
                      onChange={e => setAiModuleTopic(e.target.value)}
                      placeholder="Anong topic ang gusto mong gawing module?" 
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-smooth"
                    />
                  </div>
                  <div className="pt-4">
                    <button 
                      type="submit"
                      disabled={isGeneratingModule}
                      className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-3 rounded-xl font-bold hover:scale-[1.02] disabled:opacity-50 transition-smooth shadow-lg shadow-purple-200 btn-press"
                    >
                      {isGeneratingModule ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                          Nag-ge-generate ng module...
                        </span>
                      ) : 'I-generate ang Module ✨'}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-4">
                  <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 max-h-[400px] overflow-y-auto">
                    <div className="prose prose-sm max-w-none">
                      <pre className="whitespace-pre-wrap font-sans text-gray-800">{generatedModule.content}</pre>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button 
                      onClick={async () => {
                        if (!user || !id) return;
                        setIsSubmitting(true);
                        try {
                          const { error } = await supabase.from('assignments').insert([{
                            classroomId: Number(id),
                            createdBy: user.dbId,
                            title: generatedModule.title,
                            description: `AI-generated module about ${aiModuleTopic}`,
                            type: 'module',
                            points: 0,
                            content: generatedModule.content,
                          }]);
                          if (error) throw error;

                          // Refresh classwork list
                          const { data: refreshed } = await supabase
                            .from('assignments')
                            .select('*')
                            .eq('classroomId', Number(id))
                            .order('createdAt', { ascending: false });
                          if (refreshed) setClassworks(refreshed);

                          setIsAIModuleModalOpen(false);
                          setGeneratedModule(null);
                          setAiModuleTopic('');
                          setAiModuleSubject('');
                          setAiModuleGrade('');
                        } catch (err) {
                          console.error('Error saving module:', err);
                          alert('Error saving module. Please try again.');
                        } finally {
                          setIsSubmitting(false);
                        }
                      }}
                      disabled={isSubmitting}
                      className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-3 rounded-xl font-bold hover:scale-[1.02] transition-smooth shadow-lg shadow-purple-200 btn-press disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <BookOpen size={18} />
                      {isSubmitting ? 'Sine-save...' : 'I-save bilang Module'}
                    </button>
                    <button 
                      onClick={() => setGeneratedModule(null)}
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

      {/* CSV Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-elevated animate-fade-up">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-xl font-extrabold font-display text-gray-900">Import Student List</h3>
              <button onClick={() => { setIsImportModalOpen(false); setImportStatus(''); setCsvFile(null); }} className="p-2 hover:bg-gray-100 rounded-full transition-smooth">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-sm text-blue-800">
                <p className="font-bold mb-1">CSV Format Required:</p>
                <p className="font-mono text-xs">name, email</p>
                <p className="text-xs mt-1 text-blue-600">One student per line. Students will be auto-enrolled.</p>
              </div>
              
              <div className="border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center hover:border-[var(--color-silid-coral)] transition-smooth cursor-pointer group">
                <input type="file" className="hidden" id="csvFileInput" accept=".csv,.txt" onChange={e => setCsvFile(e.target.files?.[0] || null)} />
                <label htmlFor="csvFileInput" className="cursor-pointer">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:bg-red-50 transition-smooth">
                    <Download className="text-gray-400 group-hover:text-[var(--color-silid-coral)]" size={24} />
                  </div>
                  <p className="text-gray-600 font-bold">{csvFile ? csvFile.name : 'Click to upload CSV'}</p>
                  <p className="text-xs text-gray-400 mt-1">or drag and drop here</p>
                </label>
              </div>

              {importStatus && (
                <div className={`p-3 rounded-xl text-sm font-medium ${importStatus.includes('✅') ? 'bg-green-50 text-green-700' : importStatus.includes('❌') ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'}`}>
                  {importStatus}
                </div>
              )}

              <div className="pt-4 flex gap-3">
                <button 
                  onClick={async () => {
                    if (!csvFile || !id) return;
                    setImportStatus('⏳ Processing CSV...');
                    try {
                      const text = await csvFile.text();
                      const lines = text.trim().split('\n').filter(l => l.trim());
                      let imported = 0;
                      
                      for (let i = 0; i < lines.length; i++) {
                        const line = lines[i];
                        if (i === 0 && line.toLowerCase().includes('name')) continue; // Skip header
                        
                        const parts = line.split(',').map(p => p.trim().replace(/"/g, ''));
                        if (parts.length < 2) continue;
                        const [name, email] = parts;
                        if (!name || !email) continue;
                        
                        // Check existing user
                        const { data: existingUser, error: findErr } = await supabase
                          .from('users')
                          .select('id')
                          .eq('email', email)
                          .maybeSingle();
                          
                        if (findErr) throw findErr;
                        
                        let studentId: number;
                        if (existingUser) {
                          studentId = existingUser.id;
                        } else {
                          const { data: newUser, error: insertErr } = await supabase
                            .from('users')
                            .insert([{ 
                              openId: `csv-${Date.now()}-${Math.floor(Math.random() * 10000)}`, 
                              name, 
                              email, 
                              "appRole": 'student', 
                              xp: 0 
                            }])
                            .select('id')
                            .single();
                            
                          if (insertErr) throw insertErr;
                          if (!newUser) continue;
                          studentId = newUser.id;
                        }
                        
                        // Check existing enrollment
                        const { data: existingEnroll, error: enrollFindErr } = await supabase
                          .from('enrollments')
                          .select('id')
                          .eq('classroomId', Number(id))
                          .eq('studentId', studentId)
                          .maybeSingle();
                          
                        if (enrollFindErr) throw enrollFindErr;
                        
                        if (!existingEnroll) {
                          const { error: enrollInsertErr } = await supabase
                            .from('enrollments')
                            .insert([{ classroomId: Number(id), studentId }]);
                            
                          if (enrollInsertErr) throw enrollInsertErr;
                        }
                        imported++;
                      }
                      
                      setImportStatus(`✅ Successfully imported ${imported} student(s)!`);
                      // Refresh enrolled students
                      const { data: enrollData } = await supabase.from('enrollments').select('studentId').eq('classroomId', Number(id));
                      if (enrollData) {
                        const sIds = enrollData.map((e: any) => e.studentId);
                        const { data: studentsData } = await supabase.from('users').select('*').in('id', sIds);
                        setEnrolledStudents(studentsData || []);
                      }
                    } catch (err) {
                      console.error(err);
                      setImportStatus(`❌ Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
                    }
                  }}
                  disabled={!csvFile}
                  className="flex-1 bg-gradient-coral text-white py-3 rounded-xl font-bold hover:scale-[1.02] shadow-glow-coral transition-smooth btn-press disabled:opacity-50"
                >
                  Confirm Import
                </button>
                <button 
                  onClick={() => { setIsImportModalOpen(false); setImportStatus(''); setCsvFile(null); }}
                  className="px-6 py-3 border border-gray-200 rounded-xl font-bold hover:bg-gray-50 transition-smooth btn-press"
                >
                  {t('cancel')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
