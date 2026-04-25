import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { FileText, Plus, Users, Clock, CheckCircle, X, BookOpen, MessageSquare } from 'lucide-react';
import { db } from '../lib/firebase';
import { doc, getDoc, collection, query, where, onSnapshot, addDoc, serverTimestamp, orderBy } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../lib/firebase';
import { Paperclip, Megaphone, Send } from 'lucide-react';

interface Classwork {
  id: string;
  title: string;
  description: string;
  type: 'module' | 'quiz';
  points: number;
  attachmentUrl?: string;
  attachmentName?: string;
  createdAt: any;
}

interface Announcement {
  id: string;
  authorName: string;
  content: string;
  createdAt: any;
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
      const docSnap = await getDoc(doc(db, 'classrooms', id));
      if (docSnap.exists()) {
        setClassroom({ id: docSnap.id, ...docSnap.data() });
      }
    };
    fetchClass();

    // Listen to classwork
    const q = query(collection(db, 'classwork'), where('classroomId', '==', id));
    const unsubClasswork = onSnapshot(q, (snapshot) => {
      const cwData: Classwork[] = [];
      snapshot.forEach(doc => {
        cwData.push({ id: doc.id, ...doc.data() } as Classwork);
      });
      cwData.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
      setClassworks(cwData);
    });

    // Listen to announcements
    const qAnnouncements = query(
      collection(db, 'announcements'), 
      where('classroomId', '==', id),
      orderBy('createdAt', 'desc')
    );
    const unsubAnnouncements = onSnapshot(qAnnouncements, (snapshot) => {
      const announceData: Announcement[] = [];
      snapshot.forEach(doc => {
        announceData.push({ id: doc.id, ...doc.data() } as Announcement);
      });
      setAnnouncements(announceData);
    });

    return () => {
      unsubClasswork();
      unsubAnnouncements();
    };
  }, [id]);

  const handleCreateClasswork = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || user.id !== classroom?.teacherId || !id) return;
    setIsSubmitting(true);

    try {
      let attachmentUrl = '';
      let attachmentName = '';

      if (newFile) {
        const fileRef = ref(storage, `classwork_attachments/${Date.now()}_${newFile.name}`);
        const uploadResult = await uploadBytes(fileRef, newFile);
        attachmentUrl = await getDownloadURL(uploadResult.ref);
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
        createdAt: serverTimestamp()
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

      await addDoc(collection(db, 'classwork'), classworkData);
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
      await addDoc(collection(db, 'announcements'), {
        classroomId: id,
        authorId: user.id,
        authorName: user.name,
        content: announcementContent,
        createdAt: serverTimestamp()
      });
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
        {user?.id === classroom.teacherId && (
          <div className="absolute top-4 right-4 bg-black/20 px-4 py-2 rounded-lg text-sm font-mono backdrop-blur-sm">
            Class Code: <span className="font-bold text-white ml-2 text-lg">{classroom.inviteCode}</span>
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
              {user?.id === classroom?.teacherId && (
                <div 
                  onClick={() => setIsAnnouncementModalOpen(true)}
                  className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex items-center gap-4 cursor-pointer hover:bg-gray-50 transition-colors text-gray-500"
                >
                  <div className="w-10 h-10 rounded-full bg-[var(--color-silid-teal)] flex items-center justify-center text-white font-bold">
                    {user.name.charAt(0)}
                  </div>
                  <p>Mag-post ng anunsyo sa iyong klase...</p>
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
                        <span className="font-bold text-gray-900">{item.authorName}</span>
                        <span className="text-sm text-gray-500">• {item.createdAt?.toDate().toLocaleDateString()}</span>
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
            {user?.id === classroom?.teacherId && (
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
              <div className="flex justify-between items-center mb-4 border-b border-[var(--color-silid-teal)] pb-2">
                <h2 className="text-2xl font-bold text-[var(--color-silid-teal)]">Mga Mag-aaral</h2>
                <span className="font-bold text-gray-500">{classroom.students?.length || 0} mag-aaral</span>
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
    </div>
  );
};
