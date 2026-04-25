import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Users, BookOpen, Clock, X } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { db } from '../lib/firebase';
import { collection, addDoc, query, where, onSnapshot, serverTimestamp, getDocs, updateDoc, arrayUnion, doc, or } from 'firebase/firestore';

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

    // Listen to classes where user is teacher OR student
    // For now, let's just do teacher or all if student is joined
    const q = query(
      collection(db, 'classrooms'), 
      or(
        where('teacherId', '==', user.id),
        where('students', 'array-contains', user.id)
      )
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const classData: ClassroomData[] = [];
      snapshot.forEach((d) => {
        classData.push({ id: d.id, ...d.data() } as ClassroomData);
      });
      setClasses(classData);
    });

    return () => unsubscribe();
  }, [user]);

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || user.role !== 'teacher') return;
    setIsSubmitting(true);

    try {
      // Generate a random 6 char invite code
      const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase().padEnd(6, 'X');
      const randomGradient = GRADIENTS[Math.floor(Math.random() * GRADIENTS.length)];

      await addDoc(collection(db, 'classrooms'), {
        name: newClassName,
        section: newSection,
        teacherId: user.id,
        inviteCode,
        students: [],
        image: randomGradient,
        createdAt: serverTimestamp()
      });

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
      console.log("Searching for class with code:", trimmedCode);
      
      const q = query(
        collection(db, 'classrooms'), 
        where('inviteCode', '==', trimmedCode)
      );
      
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        alert("Hindi mahanap ang klase. Siguraduhing tama ang code.");
        setIsSubmitting(false);
        return;
      }

      const classDoc = querySnapshot.docs[0];
      const classRef = doc(db, 'classrooms', classDoc.id);
      const classData = classDoc.data();

      // Check if already in class
      if (classData.students?.includes(user.id)) {
        alert("Nakasali ka na sa klaseng ito.");
        setIsModalOpen(false);
        setJoinCode('');
        setIsSubmitting(false);
        return;
      }

      await updateDoc(classRef, {
        students: arrayUnion(user.id)
      });

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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Mga Klase</h1>
          <p className="text-gray-500 mt-1">Magandang araw, {user?.name}!</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-[var(--color-silid-teal)] text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-800 transition-colors shadow-sm"
        >
          <Plus size={20} />
          {user?.role === 'teacher' ? 'Gumawa ng Klase' : 'Sumali sa Klase'}
        </button>
      </div>

      {classes.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center shadow-sm">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
            <BookOpen size={40} />
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">Wala pang klase.</h3>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            {user?.role === 'teacher' 
              ? 'Magsimula sa pamamagitan ng paggawa ng unang klase mo para sa mga estudyante.' 
              : 'Hintayin ang class code mula sa iyong guro para makasali.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {classes.map((cls) => (
            <Link key={cls.id} to={`/class/${cls.id}`} className="block group">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                <div className={`h-32 ${cls.image} p-4 flex flex-col justify-end relative overflow-hidden`}>
                  <div className="absolute top-0 right-0 p-4 opacity-30">
                    <BookOpen size={80} className="text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-white relative z-10 truncate">{cls.name}</h3>
                  <p className="text-white/90 relative z-10 text-sm">{cls.section}</p>
                </div>
                <div className="p-4 space-y-3">
                  {cls.teacherId === user?.id && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Users size={16} />
                      <span>{cls.students?.length || 0} Mag-aaral</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm text-gray-500 font-medium">
                    <Clock size={16} />
                    <span>Walang nakatakdang gawain</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

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
    </div>
  );
};
