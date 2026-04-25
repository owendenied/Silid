import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Search, Filter, CheckCircle, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../store/useAppStore';
import { Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface Classroom {
  name: string;
  students?: string[];
}

interface Submission {
  studentId: string;
  score?: number;
  teacherFeedback?: string;
}

interface Student {
  id: string;
  name: string;
}

export const Gradebook = () => {
  const { classId } = useParams<{ classId: string }>();
  const navigate = useNavigate();
  const { user } = useAppStore();
  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!classId || user?.role !== 'teacher') return;

    const fetchData = async () => {
      try {
        // Fetch classroom
        const { data: classData } = await supabase
          .from('classrooms')
          .select('*')
          .eq('id', classId)
          .single();
        setClassroom(classData);

        // Fetch submissions for this class
        // This is a bit complex as we need to join with classwork
        const { data: subs } = await supabase
          .from('submissions')
          .select(`
            *,
            classwork:classworkId (*)
          `)
          .eq('classwork.classroomId', classId);
        
        setSubmissions(subs || []);

        // Fetch student profiles (placeholder for now)
        // In a real app, we'd fetch users who are in classroom.students
        if (classData?.students) {
          const { data: studentData } = await supabase
            .from('users')
            .select('*')
            .in('id', classData.students);
          setStudents(studentData || []);
        }
      } catch (err) {
        console.error("Error fetching gradebook:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [classId, user]);

  const stats = [
    { name: 'Submitted', value: submissions.length, color: '#1B6CA8' },
    { name: 'Pending', value: students.length - submissions.length, color: '#CBD5E0' },
  ];

  if (loading) return <div className="text-center py-12">Nagloload...</div>;

  return (
    <div className="space-y-8 pb-12">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full">
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gradebook: {classroom?.name}</h1>
            <p className="text-gray-500">Subaybayan ang marka ng iyong mga mag-aaral.</p>
          </div>
        </div>
        <button className="flex items-center gap-2 bg-silid-teal text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-800 shadow-lg shadow-blue-200 transition-all">
          <Download size={20} />
          I-export bilang CSV
        </button>
      </div>

      {/* Analytics Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-900 mb-4">Submission Rate</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {stats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 mt-2 text-sm font-medium">
            {stats.map(s => (
              <div key={s.name} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }}></div>
                <span>{s.name}: {s.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-900 mb-4">Performance Distribution</h3>
          <div className="h-64 text-center flex items-center justify-center text-gray-400 italic">
            Dito makikita ang distribution ng scores (Coming Soon)
          </div>
        </div>
      </div>

      {/* Student List */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Hanapin ang mag-aaral..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-silid-teal/20 focus:border-silid-teal outline-none"
            />
          </div>
          <button className="flex items-center gap-2 text-gray-600 hover:text-gray-900 px-3 py-2 rounded-lg border border-gray-200">
            <Filter size={18} />
            Filter
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-gray-500 text-xs font-bold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Pangalan (Name)</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Score / Points</th>
                <th className="px-6 py-4">Feedback</th>
                <th className="px-6 py-4">Aksyon</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {students.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase())).map((student) => {
                const sub = submissions.find(sub => sub.studentId === student.id);
                return (
                  <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold">
                          {student.name.charAt(0)}
                        </div>
                        <span className="font-medium text-gray-900">{student.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {sub ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700">
                          <CheckCircle size={12} />
                          Tapos na
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-500">
                          <Clock size={12} />
                          Hindi pa
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-bold text-gray-900">{sub?.score || '-'}</span>
                      <span className="text-gray-400"> / 10</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-500 truncate max-w-[200px] block">
                        {sub?.teacherFeedback || 'Walang feedback'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button className="text-silid-teal font-bold hover:underline">Tingnan</button>
                    </td>
                  </tr>
                );
              })}
              {students.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500 italic">
                    Wala pang mga mag-aaral sa klaseng ito.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
