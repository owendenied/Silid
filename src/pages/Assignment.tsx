import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { ArrowLeft, CheckCircle, FileText, AlertCircle, Paperclip } from 'lucide-react';
import { supabase } from '../lib/supabase';

export const Assignment = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAppStore();
  
  const [classwork, setClasswork] = useState<any>(null);
  const [submission, setSubmission] = useState<any>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id || !user) return;

    const fetchData = async () => {
      try {
        // Fetch the classwork details
        const { data: cwData, error: cwError } = await supabase
          .from('classwork')
          .select('*')
          .eq('id', id)
          .single();
          
        if (cwData) {
          setClasswork(cwData);
        }

        // Fetch user's submission if it exists
        const subId = `${id}_${user.id}`;
        const { data: subData, error: subError } = await supabase
          .from('submissions')
          .select('*')
          .eq('id', subId)
          .single();
          
        if (subData) {
          setSubmission(subData);
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
    if (!selectedAnswer || !classwork || !user || !id) return;
    setIsSubmitting(true);

    try {
      // Auto-checking logic
      const question = classwork.questions[0]; // Assuming 1 question for prototype
      const isCorrect = selectedAnswer === question.correctAnswer;
      const score = isCorrect ? classwork.points : 0;
      const xpToAward = isCorrect ? 20 : 0;

      const subId = `${id}_${user.id}`;
      const submissionData = {
        id: subId,
        classworkId: id,
        studentId: user.id,
        answer: selectedAnswer,
        isCorrect,
        score,
      };

      // Save to submissions collection
      const { error: subError } = await supabase
        .from('submissions')
        .upsert([submissionData]);

      if (subError) throw subError;

      // Award XP to user
      if (xpToAward > 0) {
        const { error: userError } = await supabase
          .from('users')
          .update({ xp: (user.xp || 0) + xpToAward })
          .eq('id', user.id);
          
        if (userError) console.error("Error updating XP:", userError);
      }

      setSubmission(submissionData);
    } catch (err) {
      console.error("Error submitting assignment:", err);
      alert("May error sa pagpasa ng sagot.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Add XP for viewing module
  useEffect(() => {
    if (classwork?.type === 'module' && user && !submission && !isLoading) {
      const awardModuleXp = async () => {
        try {
          const subId = `${id}_${user.id}_viewed`;
          const { data: existingSub } = await supabase
            .from('submissions')
            .select('*')
            .eq('id', subId)
            .single();
          
          if (!existingSub) {
            await supabase
              .from('submissions')
              .insert([{
                id: subId,
                classworkId: id,
                studentId: user.id,
                type: 'view',
              }]);
            
            await supabase
              .from('users')
              .update({ xp: (user.xp || 0) + 5 })
              .eq('id', user.id);
          }
        } catch (e) {
          console.error("Error awarding module XP:", e);
        }
      };
      awardModuleXp();
    }
  }, [classwork, user, submission, isLoading, id]);

  if (isLoading) {
    return <div className="text-center py-20 text-gray-500">Nagloload...</div>;
  }

  if (!classwork) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold text-gray-900">Hindi mahanap ang gawain.</h2>
        <button onClick={() => navigate(-1)} className="mt-4 text-[var(--color-silid-teal)] hover:underline">Bumalik</button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors">
        <ArrowLeft size={20} />
        Bumalik sa Klase
      </button>

      <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200">
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100">
          <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0 text-[var(--color-silid-teal)]">
            <FileText size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{classwork.title}</h1>
            <p className="text-gray-500 mt-1">{classwork.type === 'quiz' ? 'Pagsusulit' : 'Modyul (Babasahin)'} • {classwork.points > 0 ? `${classwork.points} Puntos` : 'Walang Marka'}</p>
          </div>
        </div>

        <div className="prose max-w-none mb-8 text-gray-700">
          <p>{classwork.description}</p>
        </div>

        {/* Attachment View */}
        {classwork.attachmentUrl && (
          <div className="mb-8 p-4 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm text-[var(--color-silid-teal)]">
                <Paperclip size={20} />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">{classwork.attachmentName || 'Attachment'}</p>
                <p className="text-xs text-gray-500">I-download para makita ang file</p>
              </div>
            </div>
            <a 
              href={classwork.attachmentUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-bold text-[var(--color-silid-teal)] hover:bg-gray-50 transition-colors shadow-sm"
            >
              I-download
            </a>
          </div>
        )}

        {/* Module Content View */}
        {classwork.type === 'module' && (
          <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 whitespace-pre-wrap font-serif text-lg leading-relaxed text-gray-800">
            {classwork.content}
          </div>
        )}

        {/* Quiz View */}
        {classwork.type === 'quiz' && classwork.questions && (
          <div className="space-y-8 mt-8">
            {submission ? (
              // Results View
              <div className={`p-6 rounded-xl border ${submission.isCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                <div className="flex items-center gap-3 mb-4">
                  {submission.isCorrect ? (
                    <CheckCircle className="text-green-600" size={28} />
                  ) : (
                    <AlertCircle className="text-red-600" size={28} />
                  )}
                  <h2 className={`text-2xl font-bold ${submission.isCorrect ? 'text-green-800' : 'text-red-800'}`}>
                    {submission.isCorrect ? 'Tama ang iyong sagot!' : 'Mali ang iyong sagot.'}
                  </h2>
                </div>
                
                <div className="bg-white/60 p-4 rounded-lg mb-4">
                  <p className="font-medium text-gray-900 mb-2">{classwork.questions[0].question}</p>
                  <p className="text-gray-700">Ang iyong sagot: <span className="font-bold">{submission.answer}</span></p>
                  {!submission.isCorrect && (
                     <p className="text-gray-700 mt-1">Tamang sagot: <span className="font-bold text-green-700">{classwork.questions[0].correctAnswer}</span></p>
                  )}
                </div>

                <div className="text-xl font-bold text-gray-900 mt-4 border-t border-black/10 pt-4">
                  Nakuha mong Marka: {submission.score} / {classwork.points}
                </div>
              </div>
            ) : (
              // Answering View
              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                <h3 className="text-xl font-bold text-gray-900 mb-6">{classwork.questions[0].question}</h3>
                <div className="space-y-3">
                  {classwork.questions[0].options.map((option: string) => (
                    <label 
                      key={option} 
                      className={`flex items-center p-4 border rounded-lg cursor-pointer transition-all ${selectedAnswer === option ? 'border-[var(--color-silid-teal)] bg-blue-50 ring-2 ring-[var(--color-silid-teal)]/20' : 'border-gray-200 hover:bg-gray-50'}`}
                    >
                      <input 
                        type="radio" 
                        name="quiz-option" 
                        value={option}
                        checked={selectedAnswer === option}
                        onChange={() => setSelectedAnswer(option)}
                        className="w-5 h-5 text-[var(--color-silid-teal)] focus:ring-[var(--color-silid-teal)] border-gray-300"
                      />
                      <span className="ml-3 text-lg text-gray-700">{option}</span>
                    </label>
                  ))}
                </div>

                {user?.role === 'student' && (
                  <div className="mt-8 flex justify-end">
                    <button
                      onClick={handleSubmit}
                      disabled={!selectedAnswer || isSubmitting}
                      className="px-8 py-3 bg-[var(--color-silid-teal)] text-white font-bold rounded-lg hover:bg-blue-800 disabled:opacity-50 transition-colors shadow-sm"
                    >
                      {isSubmitting ? 'Ipinapasa...' : 'Ipasa ang Sagot'}
                    </button>
                  </div>
                )}
                
                {user?.role === 'teacher' && (
                  <div className="mt-8 p-4 bg-yellow-50 text-yellow-800 rounded-lg text-sm">
                    Isa kang guro. Hindi ka maaaring sumagot sa pagsusulit na ito.
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
