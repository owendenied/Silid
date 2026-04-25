import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { Award, Star, Flame, Trophy, Target, BookOpen, Users, LayoutDashboard, Settings } from 'lucide-react';
import { db } from '../lib/firebase';
import { doc, onSnapshot, collection, query, where, getDocs, or } from 'firebase/firestore';
import { getLevelInfo, calculateProgress } from '../lib/levels';

export const Profile = () => {
  const { user } = useAppStore();
  const [xp, setXp] = useState(user?.xp || 0);
  const [streak, setStreak] = useState(0);
  const [stats, setStats] = useState({ classes: 0, students: 0, finishedTasks: 0, readModules: 0 });

  useEffect(() => {
    if (!user?.id) return;
    
    // Listen to profile updates
    const unsubscribe = onSnapshot(doc(db, 'users', user.id), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setXp(data.xp || 0);
        setStreak(data.streak || 0);
      }
    });

    // Fetch stats
    const fetchStats = async () => {
      const qClasses = query(
        collection(db, 'classrooms'), 
        or(
          where('teacherId', '==', user.id),
          where('students', 'array-contains', user.id)
        )
      );
      const snapshotClasses = await getDocs(qClasses);
      const classCount = snapshotClasses.size;
      
      if (user.role === 'teacher') {
        let studentCount = 0;
        snapshotClasses.forEach(doc => {
          if (doc.data().teacherId === user.id) {
            studentCount += (doc.data().students?.length || 0);
          }
        });
        setStats(prev => ({ ...prev, classes: classCount, students: studentCount }));
      } else {
        // Student stats
        const qSubmissions = query(collection(db, 'submissions'), where('studentId', '==', user.id));
        const snapshot = await getDocs(qSubmissions);
        
        let finished = 0;
        let read = 0;
        
        snapshot.forEach(doc => {
          const data = doc.data();
          if (data.type === 'view') {
            read++;
          } else {
            finished++;
          }
        });
        
        setStats(prev => ({ ...prev, finishedTasks: finished, readModules: read }));
      }
    };

    fetchStats();

    return () => unsubscribe();
  }, [user?.id, user?.role]);

  const levelInfo = getLevelInfo(xp);
  const progress = calculateProgress(xp);

  const BADGES = [
    { id: '1', name: 'Sipag at Tiyaga', desc: 'Nakumpleto ang 5 modyul.', icon: <Flame className="text-orange-500" />, earned: xp > 50 },
    { id: '2', name: 'Listo', desc: 'Nakuha ang perpektong iskor sa isang pagsusulit.', icon: <Star className="text-yellow-500" />, earned: xp > 100 },
    { id: '3', name: 'Henyo', desc: 'Umabot sa 300 XP.', icon: <Award className="text-purple-500" />, earned: xp >= 300 },
    { id: '4', name: 'Kampeon', desc: 'Maging top 1 sa klase.', icon: <Trophy className="text-gold-500" />, earned: xp >= 500 },
  ];

  if (!user) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      {/* Profile Header */}
      <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 overflow-hidden relative">
        {/* Decorative background element */}
        <div className={`absolute top-0 right-0 w-64 h-64 rounded-full -mr-20 -mt-20 opacity-5 ${user.role === 'teacher' ? 'bg-indigo-600' : 'bg-teal-600'}`}></div>
        
        <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
          <div className={`w-32 h-32 rounded-3xl flex items-center justify-center border-4 border-white shadow-xl rotate-3 ${user.role === 'teacher' ? 'bg-indigo-50 text-indigo-600' : 'bg-teal-50 text-teal-600'}`}>
            {user.role === 'teacher' ? <Users size={64} /> : <Award size={64} />}
          </div>
          
          <div className="flex-1 text-center md:text-left">
            <div className="flex flex-col md:flex-row md:items-center gap-2 mb-2">
              <h1 className="text-3xl font-bold text-gray-900">{user.name}</h1>
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider w-fit mx-auto md:mx-0 ${
                user.role === 'teacher' ? 'bg-indigo-100 text-indigo-700' : 'bg-teal-100 text-teal-700'
              }`}>
                {user.role === 'teacher' ? 'Guro (Teacher)' : 'Mag-aaral (Student)'}
              </span>
            </div>
            <p className="text-gray-500 mb-4">{user.email}</p>
            
            {user.role === 'student' && (
              <div className="mt-4 max-w-md">
                <div className="flex justify-between items-end mb-2">
                  <span className="text-lg font-bold text-[var(--color-silid-teal)]">{levelInfo.title}</span>
                  <span className="text-sm font-medium text-gray-500">{xp} / {levelInfo.maxXp} XP</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-teal-400 to-[var(--color-silid-teal)] h-full transition-all duration-1000 ease-out"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
              </div>
            )}

            {user.role === 'teacher' && (
              <div className="flex gap-4 justify-center md:justify-start mt-4">
                <button className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-xl transition-colors font-medium text-sm">
                  <Settings size={18} />
                  I-edit ang Profile
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats Section */}
      {user.role === 'teacher' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-indigo-600 p-8 rounded-3xl text-white shadow-lg shadow-indigo-200">
            <LayoutDashboard className="mb-4 opacity-80" size={32} />
            <p className="text-indigo-100 text-sm font-medium uppercase tracking-wider">Aktibong Klase</p>
            <p className="text-4xl font-black mt-1">{stats.classes}</p>
          </div>
          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
            <Users className="text-indigo-600 mb-4" size={32} />
            <p className="text-gray-500 text-sm font-medium uppercase tracking-wider">Kabuuang Mag-aaral</p>
            <p className="text-4xl font-black text-gray-900 mt-1">{stats.students}</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center">
              <Flame className="text-orange-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Streak</p>
              <p className="text-2xl font-bold text-gray-900">{streak} Araw</p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center">
              <Target className="text-teal-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Gawain</p>
              <p className="text-2xl font-bold text-gray-900">{stats.finishedTasks} Natapos</p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
              <BookOpen className="text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Modules</p>
              <p className="text-2xl font-bold text-gray-900">{stats.readModules} Nabasa</p>
            </div>
          </div>
        </div>
      )}

      {/* Badges / Classes Section */}
      <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          {user.role === 'teacher' ? (
            <><BookOpen className="text-indigo-600" /> Dashboard ng Guro</>
          ) : (
            <><Trophy className="text-yellow-500" /> Mga Badge</>
          )}
        </h2>
        
        {user.role === 'student' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {BADGES.map((badge) => (
              <div 
                key={badge.id}
                className={`p-6 rounded-2xl border-2 transition-all ${badge.earned ? 'border-teal-100 bg-teal-50/20' : 'border-dashed border-gray-100 opacity-40 grayscale'}`}
              >
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm mb-4 mx-auto">
                  {badge.icon}
                </div>
                <h3 className="font-bold text-gray-900 text-center text-sm">{badge.name}</h3>
                <p className="text-xs text-gray-500 text-center mt-1">{badge.desc}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-gray-50 rounded-2xl p-12 text-center border-2 border-dashed border-gray-200">
            <p className="text-gray-500 font-medium">Maligayang pagdating sa iyong Silid dashboard!</p>
            <p className="text-sm text-gray-400 mt-2">Dito mo makikita ang buod ng iyong mga klase at ang pag-unlad ng iyong mga estudyante.</p>
          </div>
        )}
      </div>
    </div>
  );
};
