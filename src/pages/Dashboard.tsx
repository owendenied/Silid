import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PlusCircle,LayoutDashboard,Sparkles, MessageSquare,Users, BookOpen, Clock, X } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { supabase } from '../lib/supabase';

interface ClassroomData {
  id: string;
  name: string;
  section: string;
  teacherId: string;
  inviteCode: string;
  students: string[];
  image: string;
}

const GRADIENTS = [
  'bg-gradient-to-r from-blue-500 to-[var(--color-silid-teal)]',
  'bg-gradient-to-r from-yellow-500 to-[var(--color-silid-yellow)]',
  'bg-gradient-to-r from-green-500 to-[var(--color-silid-green)]',
  'bg-gradient-to-r from-purple-500 to-indigo-600',
];

export const Dashboard = () => {
  const { user } = useAppStore();
  const [classes, setClasses] = useState<ClassroomData[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [newSection, setNewSection] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;

    const fetchClasses = async () => {
      const { data, error } = await supabase
        .from('classrooms')
        .select('*')
        .or(`teacherId.eq.${user.id},students.cs.{${user.id}}`);

      if (error) {
        console.error("Error fetching classes:", error);
      } else {
        setClasses(data || []);
      }
    };

    fetchClasses();

    // Set up realtime subscription
    const channel = supabase
      .channel('classrooms-changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'classrooms' 
      }, () => {
        fetchClasses();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || user.role !== 'teacher') return;
    setIsSubmitting(true);

    try {
      const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase().padEnd(6, 'X');
      const randomGradient = GRADIENTS[Math.floor(Math.random() * GRADIENTS.length)];

      const { error } = await supabase
        .from('classrooms')
        .insert([{
          name: newClassName,
          section: newSection,
          teacherId: user.id,
          inviteCode,
          students: [],
          image: randomGradient
        }]);

      if (error) throw error;

      setIsModalOpen(false);
      setNewClassName('');
      setNewSection('');
    } catch (error) {
      console.error("Error creating class: ", error);
      alert("May error sa paggawa ng klase.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJoinClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSubmitting(true);

    try {
      const trimmedCode = joinCode.trim().toUpperCase();
      
      const { data: classroom, error: fetchError } = await supabase
        .from('classrooms')
        .select('*')
        .eq('inviteCode', trimmedCode)
        .single();

      if (fetchError || !classroom) {
        alert("Hindi mahanap ang klase. Siguraduhing tama ang code.");
        setIsSubmitting(false);
        return;
      }

      if (classroom.students?.includes(user.id)) {
        alert("Nakasali ka na sa klaseng ito.");
        setIsModalOpen(false);
        setJoinCode('');
        setIsSubmitting(false);
        return;
      }

      const updatedStudents = [...(classroom.students || []), user.id];

      const { error: updateError } = await supabase
        .from('classrooms')
        .update({ students: updatedStudents })
        .eq('id', classroom.id);

      if (updateError) throw updateError;

      setIsModalOpen(false);
      setJoinCode('');
      alert("Matagumpay na nakasali sa klase!");
    } catch (error) {
      console.error("Error joining class:", error);
      alert("May error sa pagsali sa klase.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">
            Mabuhay, <span className="text-silid-teal">{user?.name}!</span> 👋
          </h1>
          <p className="text-gray-500 text-lg mt-1 font-medium">Ready ka na bang mag-aral ngayong araw?</p>
        </div>
        <div className="flex gap-4 w-full md:w-auto">
          <button 
            onClick={() => setIsModalOpen(true)}
            className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-8 py-3 rounded-xl font-bold transition-all shadow-lg hover:scale-105 ${
              user?.role === 'teacher' 
                ? 'bg-silid-teal text-white shadow-blue-100 hover:bg-blue-800' 
                : 'bg-silid-yellow text-white shadow-yellow-100 hover:bg-yellow-600'
            }`}
          >
            {user?.role === 'teacher' ? <PlusCircle size={24} /> : <Users size={24} />}
            {user?.role === 'teacher' ? 'Bagong Klase' : 'Sumali sa Klase'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-6 hover:shadow-md transition-shadow">
          <div className="w-16 h-16 bg-blue-100 text-silid-teal rounded-2xl flex items-center justify-center">
            <LayoutDashboard size={32} />
          </div>
          <div>
            <p className="text-gray-500 font-bold text-sm uppercase tracking-wider">Mga Klase</p>
            <p className="text-3xl font-extrabold text-gray-900">{classes.length}</p>
          </div>
        </div>
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-6 hover:shadow-md transition-shadow">
          <div className="w-16 h-16 bg-yellow-100 text-silid-yellow rounded-2xl flex items-center justify-center">
            <Sparkles size={32} />
          </div>
          <div>
            <p className="text-gray-500 font-bold text-sm uppercase tracking-wider">XP Earned</p>
            <p className="text-3xl font-extrabold text-gray-900">{user?.xp || 0}</p>
          </div>
        </div>
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-6 hover:shadow-md transition-shadow">
          <div className="w-16 h-16 bg-red-100 text-red-500 rounded-2xl flex items-center justify-center">
            <Clock size={32} />
          </div>
          <div>
            <p className="text-gray-500 font-bold text-sm uppercase tracking-wider">Gawain</p>
            <p className="text-3xl font-extrabold text-gray-900">3</p>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Iyong mga Klase</h2>
        {classes.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-gray-200 rounded-3xl p-16 text-center shadow-sm">
            <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6 text-gray-300">
              <BookOpen size={48} />
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">Wala pang klase rito.</h3>
            <p className="text-gray-500 mb-8 max-w-sm mx-auto text-lg leading-relaxed">
              {user?.role === 'teacher' 
                ? 'Magsimula sa pamamagitan ng paggawa ng iyong unang klase para sa iyong mga mag-aaral.' 
                : 'I-type ang class code na binigay ng iyong guro para makasali at makapagsimulang mag-aral.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {classes.map((cls) => (
              <Link key={cls.id} to={`/class/${cls.id}`} className="block group">
                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300 transform group-hover:-translate-y-1">
                  <div className={`h-40 ${cls.image} p-6 flex flex-col justify-end relative overflow-hidden`}>
                    <div className="absolute top-0 right-0 p-6 opacity-20 transform translate-x-4 -translate-y-4">
                      <BookOpen size={120} className="text-white" />
                    </div>
                    <div className="relative z-10">
                      <h3 className="text-2xl font-bold text-white truncate">{cls.name}</h3>
                      <p className="text-white/80 font-medium">{cls.section}</p>
                    </div>
                  </div>
                  <div className="p-6 space-y-4">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2 text-gray-600 font-medium">
                        <Users size={18} className="text-silid-teal" />
                        <span>{cls.students?.length || 0} Mag-aaral</span>
                      </div>
                      <div className="bg-gray-100 text-gray-600 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                        Active
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <Clock size={16} />
                      <span>Updated 2 hours ago</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">
                {user?.role === 'teacher' ? 'Gumawa ng Klase' : 'Sumali sa Klase'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            
            {user?.role === 'teacher' ? (
              <form onSubmit={handleCreateClass} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pangalan ng Klase (Required)</label>
                  <input 
                    required 
                    value={newClassName}
                    onChange={e => setNewClassName(e.target.value)}
                    type="text" 
                    placeholder="Hal. Araling Panlipunan 10"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-[var(--color-silid-teal)] focus:border-[var(--color-silid-teal)]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Seksyon (Section)</label>
                  <input 
                    value={newSection}
                    onChange={e => setNewSection(e.target.value)}
                    type="text" 
                    placeholder="Hal. Rizal"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-[var(--color-silid-teal)] focus:border-[var(--color-silid-teal)]"
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
                    {isSubmitting ? 'Gumagawa...' : 'Gumawa'}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleJoinClass} className="p-6 space-y-4">
                <p className="text-gray-600 mb-4">Hingin sa iyong guro ang class code para makasali.</p>
                <div>
                  <input 
                    type="text" 
                    required
                    value={joinCode}
                    onChange={e => setJoinCode(e.target.value)}
                    placeholder="Class Code (Hal. X7P9M2)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-lg uppercase tracking-wider font-mono focus:ring-[var(--color-silid-teal)] focus:border-[var(--color-silid-teal)]"
                  />
                </div>
                <div className="flex gap-3 justify-end pt-2">
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
                    {isSubmitting ? 'Sumasali...' : 'Sumali'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
      <div className="mt-12 bg-silid-teal rounded-3xl p-8 text-white relative overflow-hidden shadow-2xl shadow-blue-200">
        <div className="absolute right-0 top-0 opacity-10 transform translate-x-1/4 -translate-y-1/4">
          <Sparkles size={300} />
        </div>
        <div className="relative z-10 max-w-lg">
          <h2 className="text-3xl font-bold mb-4">May tanong ka ba?</h2>
          <p className="text-blue-100 mb-6 text-lg">Subukan ang aming AI Guro Bot para sa tulong sa iyong mga aralin o pag-manage ng klase.</p>
          <Link to="/chat" className="inline-flex items-center gap-2 bg-silid-yellow text-white px-8 py-3 rounded-xl font-bold hover:bg-yellow-600 transition-all shadow-lg hover:scale-105">
            <MessageSquare size={20} />
            Magsimula ng Chat
          </Link>
        </div>
      </div>
    </div>
  );
};
