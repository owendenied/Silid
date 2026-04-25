import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { Award, Star, Flame, Trophy, Target, BookOpen } from 'lucide-react';
import { db } from '../lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { getLevelInfo, calculateProgress } from '../lib/levels';

export const Profile = () => {
  const { user } = useAppStore();
  const [xp, setXp] = useState(user?.xp || 0);

  useEffect(() => {
    if (!user?.id) return;
    const unsubscribe = onSnapshot(doc(db, 'users', user.id), (snapshot) => {
      if (snapshot.exists()) {
        setXp(snapshot.data().xp || 0);
      }
    });
    return () => unsubscribe();
  }, [user?.id]);

  const levelInfo = getLevelInfo(xp);
  const progress = calculateProgress(xp);

  const BADGES = [
    { id: '1', name: 'Sipag at Tiyaga', desc: 'Nakumpleto ang 5 modyul.', icon: <Flame className="text-orange-500" />, earned: xp > 50 },
    { id: '2', name: 'Listo', desc: 'Nakuha ang perpektong iskor sa isang pagsusulit.', icon: <Star className="text-yellow-500" />, earned: xp > 100 },
    { id: '3', name: 'Henyo', desc: 'Umabot sa 300 XP.', icon: <Award className="text-purple-500" />, earned: xp >= 300 },
    { id: '4', name: 'Kampeon', desc: 'Maging top 1 sa klase.', icon: <Trophy className="text-gold-500" />, earned: xp >= 500 },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200">
        <div className="flex flex-col md:flex-row items-center gap-8">
          <div className="w-32 h-32 bg-blue-100 rounded-full flex items-center justify-center text-[var(--color-silid-teal)] border-4 border-white shadow-lg">
            <Award size={64} />
          </div>
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-3xl font-bold text-gray-900">{user?.name}</h1>
            <p className="text-gray-500 mt-1">{user?.role === 'teacher' ? 'Guro' : 'Mag-aaral'}</p>
            
            <div className="mt-6">
              <div className="flex justify-between items-end mb-2">
                <span className="text-lg font-bold text-[var(--color-silid-teal)]">{levelInfo.title}</span>
                <span className="text-sm font-medium text-gray-500">{xp} / {levelInfo.maxXp} XP</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-4 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-blue-400 to-[var(--color-silid-teal)] h-full transition-all duration-1000 ease-out"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-400 mt-2 text-right">
                {levelInfo.nextTitle ? `${levelInfo.maxXp - xp} XP pa para maging ${levelInfo.nextTitle}!` : 'Naabot mo na ang pinakamataas na level!'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-orange-50 rounded-lg flex items-center justify-center">
            <Flame className="text-orange-500" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Streak</p>
            <p className="text-2xl font-bold text-gray-900">3 Araw</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
            <Target className="text-green-500" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Gawain</p>
            <p className="text-2xl font-bold text-gray-900">12 Natapos</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
            <BookOpen className="text-blue-500" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Modules</p>
            <p className="text-2xl font-bold text-gray-900">8 Nabasa</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <Trophy className="text-yellow-500" />
          Mga Badge
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {BADGES.map((badge) => (
            <div 
              key={badge.id}
              className={`p-6 rounded-xl border-2 transition-all ${badge.earned ? 'border-blue-100 bg-blue-50/30' : 'border-dashed border-gray-200 opacity-40 grayscale'}`}
            >
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm mb-4 mx-auto">
                {badge.icon}
              </div>
              <h3 className="font-bold text-gray-900 text-center text-sm">{badge.name}</h3>
              <p className="text-xs text-gray-500 text-center mt-1">{badge.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
