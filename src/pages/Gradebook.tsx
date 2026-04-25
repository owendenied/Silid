import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../store/useAppStore';
import { ArrowLeft, Download, TrendingUp, Users, FileText, Award, BarChart3 } from 'lucide-react';
import { useT } from '../lib/i18n';

interface Student { id: number; name: string; email: string; }

export const Gradebook = () => {
  const { classId } = useParams<{ classId: string }>();
  const navigate = useNavigate();
  const { user } = useAppStore();
  const t = useT();
  const [classroomName, setClassroomName] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!classId || !user) return;
    const fetchData = async () => {
      try {
        // Get classroom
        const { data: cls } = await supabase.from('classrooms').select('*').eq('id', Number(classId)).single();
        if (cls) setClassroomName(cls.name);

        // Get enrolled students
        const { data: enrollments } = await supabase.from('enrollments').select('studentId').eq('classroomId', Number(classId));
        const sIds = enrollments?.map((e: any) => e.studentId) || [];
        if (sIds.length > 0) {
          const { data: studentsData } = await supabase.from('users').select('*').in('id', sIds);
          setStudents(studentsData || []);
        }

        // Get assignments (non-module)
        const { data: assignData } = await supabase.from('assignments').select('*').eq('classroomId', Number(classId));
        const filteredAssignments = (assignData || []).filter((a: any) => a.type !== 'module');
        setAssignments(filteredAssignments);

        // Get all submissions
        const assignIds = filteredAssignments.map((a: any) => a.id);
        if (assignIds.length > 0) {
          const { data: subData } = await supabase.from('submissions').select('*').in('assignmentId', assignIds);
          setSubmissions(subData || []);
        }
      } catch (err) {
        console.error('Gradebook fetch error:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [classId, user]);

  const getStudentScore = (studentId: number, assignmentId: number): number | null => {
    const sub = submissions.find(s => s.studentId === studentId && s.assignmentId === assignmentId);
    return sub ? (sub.score ?? 0) : null;
  };

  const getStudentTotal = (studentId: number): { earned: number; possible: number } => {
    let earned = 0, possible = 0;
    assignments.forEach(a => {
      const score = getStudentScore(studentId, a.id);
      if (score !== null) {
        earned += score;
        possible += a.points;
      }
    });
    return { earned, possible };
  };

  const getAssignmentAvg = (assignmentId: number): number => {
    const subs = submissions.filter(s => s.assignmentId === assignmentId);
    if (subs.length === 0) return 0;
    const total = subs.reduce((acc: number, s: any) => acc + (s.score || 0), 0);
    return Math.round(total / subs.length);
  };

  const classAverage = (): number => {
    if (students.length === 0 || assignments.length === 0) return 0;
    const totalPossible = assignments.reduce((acc: number, a: any) => acc + a.points, 0);
    if (totalPossible === 0) return 0;
    let totalEarned = 0;
    students.forEach(s => {
      const { earned } = getStudentTotal(s.id);
      totalEarned += earned;
    });
    return Math.round((totalEarned / (totalPossible * students.length)) * 100);
  };

  const exportCSV = () => {
    const headers = ['Student', ...assignments.map(a => a.title), 'Total', '%'];
    const rows = students.map(s => {
      const scores = assignments.map(a => {
        const sc = getStudentScore(s.id, a.id);
        return sc !== null ? sc.toString() : '-';
      });
      const { earned, possible } = getStudentTotal(s.id);
      const pct = possible > 0 ? Math.round((earned / possible) * 100) : 0;
      return [s.name, ...scores, `${earned}/${possible}`, `${pct}%`];
    });
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gradebook_${classroomName.replace(/\s/g, '_')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const typeColor: Record<string, string> = {
    quiz: 'text-blue-600', true_false: 'text-purple-600', identification: 'text-amber-600',
    short_answer: 'text-green-600', essay: 'text-red-600',
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-12 h-12 rounded-2xl bg-gradient-coral flex items-center justify-center animate-pulse shadow-glow-coral">
          <BarChart3 className="text-white" size={24} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-white rounded-xl transition-smooth">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold font-display text-gray-900">{t('gradebook.title')}</h1>
            <p className="text-gray-500 font-medium">{classroomName}</p>
          </div>
        </div>
        <button onClick={exportCSV} className="flex items-center gap-2 bg-gradient-coral text-white px-5 py-2.5 rounded-xl font-bold hover:scale-105 transition-smooth shadow-glow-coral btn-press">
          <Download size={16} />
          Export CSV
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl shadow-soft border border-gray-100/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-coral text-white flex items-center justify-center"><Users size={18} /></div>
            <div>
              <p className="text-2xl font-extrabold font-display">{students.length}</p>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Students</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-soft border border-gray-100/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-teal text-white flex items-center justify-center"><FileText size={18} /></div>
            <div>
              <p className="text-2xl font-extrabold font-display">{assignments.length}</p>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Assessments</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-soft border border-gray-100/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-gold text-white flex items-center justify-center"><TrendingUp size={18} /></div>
            <div>
              <p className="text-2xl font-extrabold font-display">{classAverage()}%</p>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Class Avg</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-soft border border-gray-100/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-green-600 text-white flex items-center justify-center"><Award size={18} /></div>
            <div>
              <p className="text-2xl font-extrabold font-display">{submissions.length}</p>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Submissions</p>
            </div>
          </div>
        </div>
      </div>

      {/* Gradebook Table */}
      <div className="bg-white rounded-2xl shadow-soft border border-gray-100/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10 min-w-[180px]">Student</th>
                {assignments.map(a => (
                  <th key={a.id} className="text-center px-3 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider min-w-[100px]">
                    <div className="truncate max-w-[100px]" title={a.title}>{a.title}</div>
                    <span className={`text-[10px] ${typeColor[a.type] || 'text-gray-400'}`}>{a.points}pts</span>
                  </th>
                ))}
                <th className="text-center px-3 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider min-w-[80px]">Total</th>
                <th className="text-center px-3 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider min-w-[60px]">%</th>
              </tr>
            </thead>
            <tbody>
              {students.length === 0 ? (
                <tr><td colSpan={assignments.length + 3} className="text-center py-12 text-gray-400">No students enrolled</td></tr>
              ) : (
                students.sort((a, b) => a.name.localeCompare(b.name)).map((student, idx) => {
                  const { earned, possible } = getStudentTotal(student.id);
                  const pct = possible > 0 ? Math.round((earned / possible) * 100) : 0;
                  return (
                    <tr key={student.id} className={`border-b border-gray-50 hover:bg-gray-50/50 transition-colors animate-fade-up`} style={{ animationDelay: `${idx * 20}ms` }}>
                      <td className="px-4 py-3 sticky left-0 bg-white z-10">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-gradient-coral text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                            {student.name.charAt(0)}
                          </div>
                          <span className="font-bold text-sm text-gray-900 truncate">{student.name}</span>
                        </div>
                      </td>
                      {assignments.map(a => {
                        const score = getStudentScore(student.id, a.id);
                        return (
                          <td key={a.id} className="text-center px-3 py-3">
                            {score !== null ? (
                              <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-bold ${
                                score === a.points ? 'bg-green-50 text-green-700' : score > 0 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'
                              }`}>
                                {score}
                              </span>
                            ) : (
                              <span className="text-gray-300 text-xs">—</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="text-center px-3 py-3 font-extrabold text-sm text-gray-900">{earned}/{possible}</td>
                      <td className="text-center px-3 py-3">
                        <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-bold ${
                          pct >= 80 ? 'bg-green-50 text-green-700' : pct >= 60 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'
                        }`}>
                          {pct}%
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {students.length > 0 && (
              <tfoot>
                <tr className="bg-gray-50 border-t-2 border-gray-200">
                  <td className="px-4 py-3 font-bold text-sm text-gray-700 sticky left-0 bg-gray-50 z-10">Class Average</td>
                  {assignments.map(a => (
                    <td key={a.id} className="text-center px-3 py-3">
                      <span className="text-xs font-bold text-gray-600">{getAssignmentAvg(a.id)}/{a.points}</span>
                    </td>
                  ))}
                  <td className="text-center px-3 py-3 font-extrabold text-sm text-gray-700">—</td>
                  <td className="text-center px-3 py-3">
                    <span className="inline-block px-2.5 py-1 rounded-lg text-xs font-bold bg-gradient-coral text-white">{classAverage()}%</span>
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};
