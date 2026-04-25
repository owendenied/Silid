import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { ArrowLeft, CheckCircle, FileText, AlertCircle, Paperclip, Loader2, Brain, Send } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { notifyXP } from '../components/Toast';
import { autoCheckSubmission } from '../lib/autoChecker';
import { useT } from '../lib/i18n';

export const Assignment = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAppStore();
  const t = useT();
  
  const [classwork, setClasswork] = useState<any>(null);
  const [submission, setSubmission] = useState<any>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string>('');
  const [textAnswer, setTextAnswer] = useState('');
  const [tfAnswers, setTfAnswers] = useState<Record<number, string>>({});
  const [idAnswers, setIdAnswers] = useState<Record<number, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAIGrading, setIsAIGrading] = useState(false);

  useEffect(() => {
    if (!id || !user) return;
    const fetchData = async () => {
      try {
        const { data: cwData } = await supabase.from('assignments').select('*').eq('id', Number(id)).single();
        if (cwData) setClasswork(cwData);

        const { data: allSubs } = await supabase.from('submissions').select('*').eq('assignmentId', Number(id)).eq('studentId', user.dbId);
        if (allSubs && allSubs.length > 0) {
          setSubmission(allSubs.find((s: any) => s.type !== 'view') || allSubs[0]);
        }
      } catch (err) {
        console.error("Error fetching assignment:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [id, user]);

  const handleSubmit = async () => {
    if (!classwork || !user || !id) return;
    setIsSubmitting(true);

    try {
      let answer = '';
      let score = 0;
      let isCorrect = false;
      let feedback = '';

      if (classwork.type === 'quiz') {
        if (!selectedAnswer) return;
        answer = selectedAnswer;
      } else if (classwork.type === 'true_false') {
        answer = JSON.stringify(tfAnswers);
      } else if (classwork.type === 'identification') {
        answer = JSON.stringify(idAnswers);
      } else if (classwork.type === 'short_answer' || classwork.type === 'essay') {
        if (!textAnswer.trim()) return;
        answer = textAnswer;
      }

      // AI Auto-check if answer key exists
      if (classwork.answerKey && classwork.autoCheck) {
        setIsAIGrading(true);

        if (classwork.type === 'quiz') {
          const result = await autoCheckSubmission(answer, classwork.answerKey, 'quiz', classwork.points, classwork.questions?.[0]?.question);
          if (result) { score = result.score; isCorrect = result.isCorrect; feedback = result.feedback; }
        } else if (classwork.type === 'true_false' && classwork.questions) {
          let totalCorrect = 0;
          const parsed = tfAnswers;
          const feedbacks: string[] = [];
          for (let i = 0; i < classwork.questions.length; i++) {
            const q = classwork.questions[i];
            const studentAns = parsed[i] || '';
            if (studentAns.toLowerCase() === q.correctAnswer.toLowerCase()) {
              totalCorrect++;
              feedbacks.push(`Q${i+1}: ✓`);
            } else {
              feedbacks.push(`Q${i+1}: ✗ (Correct: ${q.correctAnswer})`);
            }
          }
          const pointsPerQ = classwork.points / classwork.questions.length;
          score = Math.round(totalCorrect * pointsPerQ);
          isCorrect = totalCorrect === classwork.questions.length;
          feedback = feedbacks.join(' | ') + ` — Score: ${score}/${classwork.points}`;
        } else if (classwork.type === 'identification' && classwork.questions) {
          let totalCorrect = 0;
          const parsed = idAnswers;
          const feedbacks: string[] = [];
          for (let i = 0; i < classwork.questions.length; i++) {
            const q = classwork.questions[i];
            const studentAns = parsed[i] || '';
            const result = await autoCheckSubmission(studentAns, q.correctAnswer, 'identification', 1, q.question);
            if (result?.isCorrect) {
              totalCorrect++;
              feedbacks.push(`Q${i+1}: ✓`);
            } else {
              feedbacks.push(`Q${i+1}: ✗ (Answer: ${q.correctAnswer})`);
            }
          }
          const pointsPerQ = classwork.points / classwork.questions.length;
          score = Math.round(totalCorrect * pointsPerQ);
          isCorrect = totalCorrect === classwork.questions.length;
          feedback = feedbacks.join(' | ');
        } else if (classwork.type === 'short_answer' || classwork.type === 'essay') {
          const result = await autoCheckSubmission(answer, classwork.answerKey, classwork.type, classwork.points, classwork.description);
          if (result) { score = result.score; isCorrect = result.isCorrect; feedback = result.feedback; }
        }

        setIsAIGrading(false);
      }

      const submissionData = {
        assignmentId: Number(id),
        studentId: user.dbId,
        answer,
        isCorrect,
        score,
        feedback,
        autoGraded: !!classwork.answerKey,
      };

      const { error: subError } = await supabase.from('submissions').insert([submissionData]);
      if (subError) throw subError;

      // Award XP
      const xpToAward = isCorrect ? 20 : (score > 0 ? 10 : 5);
      const currentXp = user.xp || 0;
      await supabase.from('users').update({ xp: currentXp + xpToAward }).eq('id', user.dbId);
      useAppStore.getState().setUser({ ...user, xp: currentXp + xpToAward });
      notifyXP(xpToAward, score > 0 ? `Scored ${score}/${classwork.points}! Magaling!` : 'Submitted! Keep trying!');

      setSubmission(submissionData);
    } catch (err) {
      console.error("Error submitting:", err);
      alert("Error submitting. Please try again.");
    } finally {
      setIsSubmitting(false);
      setIsAIGrading(false);
    }
  };

  // Module XP
  useEffect(() => {
    if (classwork?.type === 'module' && user && !submission && !isLoading) {
      const awardModuleXp = async () => {
        try {
          const { data: existing } = await supabase.from('submissions').select('*').eq('assignmentId', Number(id)).eq('studentId', user.dbId).eq('type', 'view');
          if (!existing || existing.length === 0) {
            await supabase.from('submissions').insert([{ assignmentId: Number(id), studentId: user.dbId, type: 'view' }]);
            const currentXp = user.xp || 0;
            await supabase.from('users').update({ xp: currentXp + 5 }).eq('id', user.dbId);
            useAppStore.getState().setUser({ ...user, xp: currentXp + 5 });
            notifyXP(5, 'Module read! Keep learning!');
          }
        } catch (e) { console.error("Error:", e); }
      };
      awardModuleXp();
    }
  }, [classwork, user, submission, isLoading, id]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-12 h-12 rounded-2xl bg-gradient-coral flex items-center justify-center animate-pulse shadow-glow-coral">
          <FileText className="text-white" size={24} />
        </div>
      </div>
    );
  }

  if (!classwork) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-extrabold font-display text-gray-900">{t('assign.not_found')}</h2>
        <button onClick={() => navigate(-1)} className="mt-4 text-[var(--color-silid-coral)] hover:underline font-bold">{t('back')}</button>
      </div>
    );
  }

  const typeLabels: Record<string, string> = {
    quiz: 'Quiz', true_false: 'True or False', identification: 'Identification',
    short_answer: 'Short Answer', essay: 'Essay', module: 'Module',
  };

  const typeColors: Record<string, string> = {
    quiz: 'bg-blue-50 text-blue-700', true_false: 'bg-purple-50 text-purple-700',
    identification: 'bg-amber-50 text-amber-700', short_answer: 'bg-green-50 text-green-700',
    essay: 'bg-red-50 text-red-700', module: 'bg-emerald-50 text-emerald-700',
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-smooth font-medium">
        <ArrowLeft size={20} />
        {t('assign.back_to_class')}
      </button>

      <div className="bg-white rounded-2xl p-8 shadow-soft border border-gray-100/50 animate-fade-up">
        {/* Header */}
        <div className="flex items-start gap-4 mb-6 pb-6 border-b border-gray-100">
          <div className="w-14 h-14 rounded-2xl bg-gradient-coral flex items-center justify-center flex-shrink-0 shadow-glow-coral">
            <FileText size={28} className="text-white" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl md:text-3xl font-extrabold font-display text-gray-900">{classwork.title}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${typeColors[classwork.type] || 'bg-gray-100 text-gray-600'}`}>
                {typeLabels[classwork.type] || classwork.type}
              </span>
              {classwork.points > 0 && (
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">{classwork.points} pts</span>
              )}
              {classwork.autoCheck && (
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-gradient-gold text-white flex items-center gap-1">
                  <Brain size={10} /> AI Auto-Check
                </span>
              )}
            </div>
          </div>
        </div>

        {classwork.description && (
          <div className="prose max-w-none mb-8 text-gray-700 leading-relaxed">
            <p>{classwork.description}</p>
          </div>
        )}

        {/* Attachment */}
        {classwork.attachmentUrl && (
          <div className="mb-8 p-4 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Paperclip className="text-[var(--color-silid-coral)]" size={20} />
              <span className="text-sm font-bold text-gray-900">{classwork.attachmentName || 'Attachment'}</span>
            </div>
            <a href={classwork.attachmentUrl} target="_blank" rel="noopener noreferrer"
              className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-[var(--color-silid-coral)] hover:bg-gray-50 transition-smooth btn-press shadow-soft">
              {t('assign.download')}
            </a>
          </div>
        )}

        {/* Module Content */}
        {classwork.type === 'module' && classwork.content && (
          <div className="bg-[var(--color-silid-cream)] p-6 rounded-xl border border-amber-100 whitespace-pre-wrap text-lg leading-relaxed text-gray-800">
            {classwork.content}
          </div>
        )}

        {/* AI Grading Overlay */}
        {isAIGrading && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-8 shadow-elevated text-center max-w-sm animate-fade-up">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-gold flex items-center justify-center animate-pulse shadow-glow-gold">
                <Brain className="text-white" size={32} />
              </div>
              <h3 className="text-xl font-extrabold font-display text-gray-900 mb-2">AI is checking your work...</h3>
              <p className="text-gray-500 text-sm">Please wait while Guro Bot grades your submission.</p>
            </div>
          </div>
        )}

        {/* Submission Result */}
        {submission && submission.type !== 'view' && (
          <div className={`mt-8 p-6 rounded-xl border animate-fade-up ${submission.isCorrect ? 'bg-green-50 border-green-200' : submission.score > 0 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'}`}>
            <div className="flex items-center gap-3 mb-4">
              {submission.isCorrect ? (
                <CheckCircle className="text-green-600" size={28} />
              ) : (
                <AlertCircle className={submission.score > 0 ? 'text-amber-600' : 'text-red-600'} size={28} />
              )}
              <h2 className={`text-xl font-extrabold font-display ${submission.isCorrect ? 'text-green-800' : submission.score > 0 ? 'text-amber-800' : 'text-red-800'}`}>
                {submission.isCorrect ? 'Perfect! Magaling! 🎉' : submission.score > 0 ? 'Good effort! Keep improving!' : 'Needs improvement. Try harder next time!'}
              </h2>
            </div>
            {submission.feedback && (
              <div className="bg-white/60 p-4 rounded-lg mb-4">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{submission.feedback}</p>
              </div>
            )}
            <div className="text-xl font-extrabold text-gray-900 border-t border-black/10 pt-4">
              Score: {submission.score} / {classwork.points}
            </div>
          </div>
        )}

        {/* Answering Forms */}
        {!submission && user?.role === 'student' && classwork.type !== 'module' && (
          <div className="space-y-6 mt-8 animate-fade-up">
            {/* Quiz (Multiple Choice) */}
            {classwork.type === 'quiz' && classwork.questions && (
              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-soft">
                <h3 className="text-lg font-extrabold text-gray-900 mb-4">{classwork.questions[0].question}</h3>
                <div className="space-y-3">
                  {classwork.questions[0].options.map((option: string) => (
                    <label key={option} className={`flex items-center p-4 border rounded-xl cursor-pointer transition-smooth btn-press ${selectedAnswer === option ? 'border-[var(--color-silid-coral)] bg-red-50 ring-2 ring-[var(--color-silid-coral)]/20' : 'border-gray-200 hover:bg-gray-50'}`}>
                      <input type="radio" name="quiz-option" value={option} checked={selectedAnswer === option} onChange={() => setSelectedAnswer(option)}
                        className="w-5 h-5 text-[var(--color-silid-coral)] focus:ring-[var(--color-silid-coral)] border-gray-300" />
                      <span className="ml-3 text-gray-700 font-medium">{option}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* True/False */}
            {classwork.type === 'true_false' && classwork.questions && (
              <div className="space-y-4">
                {classwork.questions.map((q: any, i: number) => (
                  <div key={i} className="bg-white border border-gray-200 rounded-xl p-5 shadow-soft">
                    <p className="font-bold text-gray-900 mb-3">{i+1}. {q.question}</p>
                    <div className="flex gap-3">
                      {['True', 'False'].map(val => (
                        <button key={val} onClick={() => setTfAnswers(prev => ({ ...prev, [i]: val }))}
                          className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-smooth btn-press ${tfAnswers[i] === val ? (val === 'True' ? 'bg-green-500 text-white' : 'bg-red-500 text-white') : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                          {val}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Identification */}
            {classwork.type === 'identification' && classwork.questions && (
              <div className="space-y-4">
                {classwork.questions.map((q: any, i: number) => (
                  <div key={i} className="bg-white border border-gray-200 rounded-xl p-5 shadow-soft">
                    <p className="font-bold text-gray-900 mb-3">{i+1}. {q.question}</p>
                    <input type="text" value={idAnswers[i] || ''} onChange={e => setIdAnswers(prev => ({ ...prev, [i]: e.target.value }))}
                      placeholder="Type your answer..." className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 focus:ring-2 focus:ring-[var(--color-silid-coral)]/20 focus:border-[var(--color-silid-coral)] outline-none transition-smooth" />
                  </div>
                ))}
              </div>
            )}

            {/* Short Answer / Essay */}
            {(classwork.type === 'short_answer' || classwork.type === 'essay') && (
              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-soft">
                <textarea value={textAnswer} onChange={e => setTextAnswer(e.target.value)}
                  rows={classwork.type === 'essay' ? 12 : 5}
                  placeholder={classwork.type === 'essay' ? 'Write your essay here...' : 'Type your answer here...'}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:ring-2 focus:ring-[var(--color-silid-coral)]/20 focus:border-[var(--color-silid-coral)] outline-none transition-smooth resize-none" />
                <p className="text-xs text-gray-400 mt-2">{textAnswer.length} characters</p>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex justify-end">
              <button onClick={handleSubmit} disabled={isSubmitting}
                className="px-8 py-3 bg-gradient-coral text-white font-extrabold rounded-xl hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 transition-smooth shadow-glow-coral btn-press flex items-center gap-2">
                {isSubmitting ? <><Loader2 size={18} className="animate-spin" /> {t('submitting')}</> : <><Send size={18} /> {t('submit')}</>}
              </button>
            </div>
          </div>
        )}

        {/* Teacher Notice */}
        {user?.role === 'teacher' && classwork.type !== 'module' && (
          <div className="mt-8 p-4 bg-amber-50 text-amber-800 rounded-xl text-sm font-medium border border-amber-200">
            {t('assign.teacher_notice')}
          </div>
        )}
      </div>
    </div>
  );
};
