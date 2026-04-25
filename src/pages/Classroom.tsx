import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { Download,FileText, Plus,MessageSquare, X, BookOpen, Sparkles, Megaphone, Send, Paperclip } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Classwork {
  id: number;
  title: string;
  description: string;
  type: 'module' | 'quiz' | 'assignment';
  points: number;
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
  const [activeTab, setActiveTab] = useState<'stream' | 'classwork' | 'people'>('stream');
  
  const [classroom, setClassroom] = useState<any>(null);
  const [classworks, setClassworks] = useState<Classwork[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  
  // AI Generator state
  const [aiTopic, setAiTopic] = useState('');
  const [aiGrade, setAiGrade] = useState('');
  const [aiSubject, setAiSubject] = useState('');
  const [generatedPlan, setGeneratedPlan] = useState('');
  
  // Form state
  const [newType, setNewType] = useState<'module' | 'quiz'>('module');
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newFile, setNewFile] = useState<File | null>(null);
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

    // Set up realtime subscriptions
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

        const { error: uploadError } = await supabase.storage
          .from('attachments')
          .upload(filePath, newFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('attachments')
          .getPublicUrl(filePath);
          
        attachmentUrl = publicUrl;
        attachmentName = newFile.name;
      }

      const classworkData: any = {
        classroomId: id,
        title: newTitle,
        description: newDesc,
        type: newType,
        points: newType === 'quiz' ? 10 : 0,
        attachmentUrl,
        attachmentName,
      };

      if (newType === 'module') {
        classworkData.content = newContent;
      } else {
        classworkData.questions = [
          {
            id: 'q1',
            question: newContent || 'Ano ang pambansang bayani ng Pilipinas?',
            options: ['Jose Rizal', 'Andres Bonifacio', 'Apolinario Mabini', 'Emilio Aguinaldo'],
            correctAnswer: 'Jose Rizal'
          }
        ];
      }

      const { error } = await supabase
        .from('assignments')
        .insert([classworkData]);


      if (error) throw error;

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
          classroomId: id,
          authorId: user.dbId,
          content: announcementContent,
        }]);


      if (error) throw error;

      setAnnouncementContent('');
      setIsAnnouncementModalOpen(false);
    } catch (error) {
      console.error("Error posting announcement:", error);
      alert("May error sa pag-post ng anunsyo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGenerateAIPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate AI generation
    setTimeout(() => {
      const plan = `
# Lesson Plan: ${aiTopic}
## Subject: ${aiSubject} | Grade: ${aiGrade}

### Objectives:
1. Maunawaan ang mga pangunahing konsepto ng ${aiTopic}.
2. Maipaliwanag ang kahalagahan nito sa ating lipunan.
3. Makagawa ng isang maikling repleksyon tungkol sa paksa.

### Motivation:
Magsisimula ang klase sa isang maikling laro o "Ice Breaker" na may kaugnayan sa ${aiTopic}.

### Discussion:
- Pagtalakay sa kasaysayan at pinagmulan.
- Pag-aanalisa sa mga mahahalagang detalye.
- Malayang talakayan kasama ang mga mag-aaral.

### Evaluation:
Maikling pagsusulit na binubuo ng 5-10 na tanong.
      `;
      setGeneratedPlan(plan);
      setIsSubmitting(false);
    }, 2000);
  };

  if (!classroom) {
    return <div className="text-center py-12 text-gray-500">Nagloload...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={`h-48 rounded-2xl ${classroom.image || 'bg-gradient-to-r from-blue-600 to-[var(--color-silid-teal)]'} p-8 flex flex-col justify-end text-white shadow-md relative overflow-hidden`}>
        <div className="absolute right-0 bottom-0 opacity-20 transform translate-x-1/4 translate-y-1/4">
          <BookOpen size={200} />
        </div>
        <div className="relative z-10">
          <h1 className="text-4xl font-bold mb-2">{classroom.name}</h1>
          <p className="text-lg text-white/90">{classroom.section}</p>
        </div>
        {user?.dbId === classroom.teacherId && (
          <div className="absolute top-4 right-4 bg-black/20 px-4 py-2 rounded-lg text-sm font-mono backdrop-blur-sm">
            Class Code: <span className="font-bold text-white ml-2 text-lg">{classroom.joinCode}</span>
          </div>
        )}

      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-8">
          {[
            { id: 'stream', label: 'Balita (Stream)' },
            { id: 'classwork', label: 'Gawain (Classwork)' },
            { id: 'people', label: 'Mga Tao (People)' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`
                whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm transition-colors
                ${activeTab === tab.id
                  ? 'border-[var(--color-silid-teal)] text-[var(--color-silid-teal)]'
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
            <div className="lg:col-span-1 space-y-4">
              <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                <h3 className="font-bold text-gray-900 mb-2">Paparating</h3>
                <p className="text-sm text-gray-500">Wala pang nakatakdang gawain.</p>
              </div>
            </div>
            <div className="lg:col-span-3 space-y-4">
              {user?.dbId === classroom?.teacherId && (

                <div className="flex gap-2">
                  <div 
                    onClick={() => setIsAnnouncementModalOpen(true)}
                    className="flex-1 bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex items-center gap-4 cursor-pointer hover:bg-gray-50 transition-colors text-gray-500"
                  >
                    <div className="w-10 h-10 rounded-full bg-silid-teal flex items-center justify-center text-white font-bold">
                      {user.name.charAt(0)}
                    </div>
                    <p>Mag-post ng anunsyo sa iyong klase...</p>
                  </div>
                  <button 
                    onClick={() => setIsAIModalOpen(true)}
                    className="bg-silid-teal text-white px-6 py-4 rounded-xl flex items-center gap-2 font-bold hover:bg-blue-800 transition-all shadow-lg shadow-blue-100"
                  >
                    <Sparkles size={24} />
                    AI Plan
                  </button>
                </div>
              )}
              
              {announcements.length === 0 ? (
                <div className="bg-white border border-dashed border-gray-200 rounded-xl p-12 text-center text-gray-400">
                  <Megaphone className="mx-auto mb-2 opacity-20" size={48} />
                  <p>Wala pang anunsyo sa klaseng ito.</p>
                </div>
              ) : (
                announcements.map((item) => (
                  <div key={item.id} className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 flex gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-[var(--color-silid-teal)] flex-shrink-0">
                      <MessageSquare size={24} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-gray-900">Guro</span>

                        <span className="text-sm text-gray-500">• {new Date(item.createdAt).toLocaleDateString()}</span>
                      </div>
                      <p className="text-gray-800 whitespace-pre-wrap">{item.content}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'classwork' && (
          <div className="space-y-6">
            {user?.dbId === classroom?.teacherId && (

              <div className="flex gap-4">
                <button 
                  onClick={() => setIsModalOpen(true)}
                  className="flex items-center gap-2 bg-[var(--color-silid-teal)] text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-800 transition-colors shadow-sm"
                >
                  <Plus size={20} />
                  Gumawa ng Gawain
                </button>
              </div>
            )}

            <div className="space-y-4">
              {classworks.length === 0 ? (
                <div className="text-center py-12 text-gray-500">Wala pang gawain. Hintayin ang iyong guro!</div>
              ) : (
                classworks.map((cw) => (
                  <Link key={cw.id} to={`/assignment/${cw.id}`} className="block">
                    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow flex items-center justify-between group cursor-pointer">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center group-hover:bg-blue-50 transition-colors">
                          <FileText className="text-gray-500 group-hover:text-[var(--color-silid-teal)] transition-colors" size={24} />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-gray-900 group-hover:text-[var(--color-silid-teal)] transition-colors">{cw.title}</h3>
                          <p className="text-sm text-gray-500">{cw.type === 'quiz' ? 'Pagsusulit' : 'Modyul'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                         <span className="inline-block bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-sm font-medium">
                           {cw.points > 0 ? `${cw.points} Puntos` : 'Walang Marka'}
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
            <div>
              <h2 className="text-2xl font-bold text-[var(--color-silid-teal)] mb-4 border-b border-[var(--color-silid-teal)] pb-2">Mga Guro</h2>
              <div className="flex items-center gap-4 p-4 hover:bg-gray-50 rounded-lg">
                <div className="w-10 h-10 rounded-full bg-gray-200"></div>
                <span className="font-medium">Guro</span>
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center mb-4 border-b border-silid-teal pb-2">
                <h2 className="text-2xl font-bold text-silid-teal">Mga Mag-aaral</h2>
                <div className="flex items-center gap-4">
                  <span className="font-bold text-gray-500">{classroom.students?.length || 0} mag-aaral</span>
                  {user?.dbId === classroom.teacherId && (

                    <button 
                      onClick={() => setIsImportModalOpen(true)}
                      className="flex items-center gap-2 text-silid-teal hover:bg-blue-50 px-3 py-1.5 rounded-lg border border-silid-teal transition-all text-sm font-bold"
                    >
                      <Plus size={16} />
                      Import CSV
                    </button>
                  )}
                </div>
              </div>
              <div className="space-y-1">
                {classroom.students?.length === 0 ? (
                  <p className="text-gray-500 p-4">Wala pang mag-aaral na nakasali.</p>
                ) : (
                  classroom.students?.map((s: string) => (
                    <div key={s} className="flex items-center gap-4 p-4 hover:bg-gray-50 rounded-lg">
                      <div className="w-10 h-10 rounded-full bg-gray-200"></div>
                      <span className="font-medium">Student UID: {s}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create Classwork Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">Gumawa ng Bagong Gawain</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleCreateClasswork} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Uri ng Gawain (Type)</label>
                <select 
                  value={newType}
                  onChange={e => setNewType(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-[var(--color-silid-teal)] focus:border-[var(--color-silid-teal)]"
                >
                  <option value="module">Modyul (Babasahin)</option>
                  <option value="quiz">Pagsusulit (Multiple Choice Quiz)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pamagat (Title)</label>
                <input 
                  required 
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  type="text" 
                  placeholder="Hal. Unang Digmaang Pandaigdig"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-[var(--color-silid-teal)] focus:border-[var(--color-silid-teal)]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsyon (Description)</label>
                <textarea 
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  rows={2}
                  placeholder="Panuto..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-[var(--color-silid-teal)] focus:border-[var(--color-silid-teal)]"
                />
              </div>

              {newType === 'module' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nilalaman (Content)</label>
                  <textarea 
                    value={newContent}
                    onChange={e => setNewContent(e.target.value)}
                    rows={6}
                    placeholder="Ilagay ang teksto ng modyul dito..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-[var(--color-silid-teal)] focus:border-[var(--color-silid-teal)]"
                  />
                </div>
              ) : (
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                  <p className="text-sm text-blue-800 mb-2 font-medium">Demo Quiz Mode</p>
                  <p className="text-xs text-blue-600 mb-3">Para sa prototype, ilagay ang iyong tanong sa ibaba. Ang sagot ay awtomatikong magiging "Jose Rizal".</p>
                  <input 
                    required={newType === 'quiz'}
                    value={newContent}
                    onChange={e => setNewContent(e.target.value)}
                    type="text" 
                    placeholder="Tanong..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-[var(--color-silid-teal)] focus:border-[var(--color-silid-teal)] text-sm"
                  />
                </div>
              )}

              <div className="border-t border-gray-100 pt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Paperclip size={16} />
                  Attachment (Optional)
                </label>
                <input 
                  type="file" 
                  onChange={e => setNewFile(e.target.files ? e.target.files[0] : null)}
                  className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-[var(--color-silid-teal)] hover:file:bg-blue-100 transition-all"
                />
              </div>

              <div className="pt-4 flex gap-3 justify-end">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-md"
                >
                  Kanselahin
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-[var(--color-silid-teal)] text-white font-medium rounded-md hover:bg-blue-800 disabled:opacity-50"
                >
                  {isSubmitting ? 'Nagse-save...' : 'I-post'}
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
      {/* AI Lesson Plan Modal */}
      {isAIModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-silid-teal to-blue-700 text-white">
              <div className="flex items-center gap-2">
                <Sparkles size={24} />
                <h3 className="text-xl font-bold">AI Lesson Plan Generator</h3>
              </div>
              <button onClick={() => { setIsAIModalOpen(false); setGeneratedPlan(''); }} className="p-2 hover:bg-white/10 rounded-full">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6">
              {!generatedPlan ? (
                <form onSubmit={handleGenerateAIPlan} className="space-y-4">
                  <p className="text-gray-600 text-sm">Gamitin ang kapangyarihan ng AI para mabilis na makagawa ng lesson plan.</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                      <input 
                        required
                        value={aiSubject}
                        onChange={e => setAiSubject(e.target.value)}
                        placeholder="e.g. Science, Math" 
                        className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-silid-teal/20 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Grade Level</label>
                      <input 
                        required
                        value={aiGrade}
                        onChange={e => setAiGrade(e.target.value)}
                        placeholder="e.g. Grade 7" 
                        className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-silid-teal/20 outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Topic / Paksa</label>
                    <input 
                      required
                      value={aiTopic}
                      onChange={e => setAiTopic(e.target.value)}
                      placeholder="Anong paksa ang ituturo mo?" 
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-silid-teal/20 outline-none"
                    />
                  </div>
                  <div className="pt-4">
                    <button 
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-silid-teal text-white py-3 rounded-xl font-bold hover:bg-blue-800 disabled:opacity-50 transition-all shadow-lg shadow-blue-200"
                    >
                      {isSubmitting ? 'Nag-ge-generate...' : 'I-generate na! ✨'}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-4">
                  <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 max-h-[400px] overflow-y-auto">
                    <div className="prose prose-sm max-w-none">
                      <pre className="whitespace-pre-wrap font-sans text-gray-800">{generatedPlan}</pre>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button 
                      onClick={() => {
                        setNewTitle(`Lesson Plan: ${aiTopic}`);
                        setNewContent(generatedPlan);
                        setNewType('module');
                        setIsAIModalOpen(false);
                        setIsModalOpen(true);
                      }}
                      className="flex-1 bg-silid-teal text-white py-3 rounded-xl font-bold hover:bg-blue-800"
                    >
                      I-save bilang Module
                    </button>
                    <button 
                      onClick={() => setGeneratedPlan('')}
                      className="px-6 py-3 border border-gray-200 rounded-xl font-bold hover:bg-gray-50"
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-900">Import Student List</h3>
              <button onClick={() => setIsImportModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-sm text-blue-800">
                <p className="font-bold mb-1">CSV Format Required:</p>
                <p>last_name, first_name, email, lrn</p>
              </div>
              
              <div className="border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center hover:border-silid-teal transition-colors cursor-pointer group">
                <input type="file" className="hidden" id="csvFile" accept=".csv" />
                <label htmlFor="csvFile" className="cursor-pointer">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:bg-blue-50 transition-colors">
                    <Download className="text-gray-400 group-hover:text-silid-teal" size={24} />
                  </div>
                  <p className="text-gray-600 font-medium">I-click para mag-upload ng CSV</p>
                  <p className="text-xs text-gray-400 mt-1">O i-drag at i-drop dito</p>
                </label>
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  onClick={() => {
                    alert("Mock: Batch-creating accounts and enrolling students...");
                    setIsImportModalOpen(false);
                  }}
                  className="flex-1 bg-silid-teal text-white py-3 rounded-xl font-bold hover:bg-blue-800 shadow-lg shadow-blue-100"
                >
                  I-confirm ang Import
                </button>
                <button 
                  onClick={() => setIsImportModalOpen(false)}
                  className="px-6 py-3 border border-gray-200 rounded-xl font-bold hover:bg-gray-50"
                >
                  Kanselahin
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
