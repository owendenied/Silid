import { geminiModel } from './gemini';

interface CheckResult {
  score: number;
  maxScore: number;
  feedback: string;
  isCorrect: boolean;
}

/**
 * AI-powered auto-checker that grades student submissions against an answer key.
 * Returns null if auto-checking is not possible.
 */
export async function autoCheckSubmission(
  studentAnswer: string,
  answerKey: string,
  assignmentType: string,
  maxPoints: number,
  questionText?: string,
): Promise<CheckResult | null> {
  if (!answerKey || !answerKey.trim()) return null;
  if (!studentAnswer || !studentAnswer.trim()) {
    return { score: 0, maxScore: maxPoints, feedback: 'No answer provided.', isCorrect: false };
  }

  // For simple types, do exact matching first
  if (assignmentType === 'quiz' || assignmentType === 'true_false') {
    const isCorrect = studentAnswer.trim().toLowerCase() === answerKey.trim().toLowerCase();
    return {
      score: isCorrect ? maxPoints : 0,
      maxScore: maxPoints,
      feedback: isCorrect ? 'Correct! Great job! 🎉' : `Incorrect. The correct answer is: ${answerKey}`,
      isCorrect,
    };
  }

  if (assignmentType === 'identification') {
    // Fuzzy match: allow slight variations
    const normalizedStudent = studentAnswer.trim().toLowerCase().replace(/[^a-z0-9\s]/g, '');
    const normalizedKey = answerKey.trim().toLowerCase().replace(/[^a-z0-9\s]/g, '');
    const isCorrect = normalizedStudent === normalizedKey || normalizedKey.includes(normalizedStudent) || normalizedStudent.includes(normalizedKey);
    
    if (isCorrect) {
      return { score: maxPoints, maxScore: maxPoints, feedback: 'Correct! 🎉', isCorrect: true };
    }
    
    // If not exact match, use AI for fuzzy check
    try {
      const prompt = `You are grading a student's answer. 
Question: "${questionText || 'Identification question'}"
Correct Answer: "${answerKey}"
Student's Answer: "${studentAnswer}"

Is the student's answer correct or acceptably close to the correct answer? 
Respond with ONLY a JSON object: {"correct": true/false, "feedback": "brief explanation"}`;

      const result = await geminiModel.generateContent(prompt);
      const text = (await result.response).text();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          score: parsed.correct ? maxPoints : 0,
          maxScore: maxPoints,
          feedback: parsed.feedback || (parsed.correct ? 'Correct!' : 'Incorrect.'),
          isCorrect: parsed.correct,
        };
      }
    } catch (e) {
      console.error('AI check failed for identification:', e);
    }
    
    return { score: 0, maxScore: maxPoints, feedback: `The correct answer is: ${answerKey}`, isCorrect: false };
  }

  // For short_answer and essay, use AI grading
  if (assignmentType === 'short_answer' || assignmentType === 'essay') {
    try {
      const prompt = `You are an expert teacher grading a student's ${assignmentType === 'essay' ? 'essay' : 'short answer'}.

${questionText ? `Question/Prompt: "${questionText}"` : ''}

Answer Key / Rubric:
${answerKey}

Student's Submission:
${studentAnswer}

Maximum Points: ${maxPoints}

Grade this submission based on the answer key/rubric provided. Consider:
- Content accuracy and relevance
- Completeness of response
- Quality of explanation

Respond with ONLY a JSON object (no markdown, no extra text):
{"score": <number 0-${maxPoints}>, "feedback": "<2-3 sentence constructive feedback in English>"}`;

      const result = await geminiModel.generateContent(prompt);
      const text = (await result.response).text();
      const jsonMatch = text.match(/\{[\s\S]*?\}/);
      
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        const score = Math.min(Math.max(0, Number(parsed.score) || 0), maxPoints);
        return {
          score,
          maxScore: maxPoints,
          feedback: parsed.feedback || 'Graded by AI.',
          isCorrect: score >= maxPoints * 0.6,
        };
      }
    } catch (e) {
      console.error('AI grading failed:', e);
      return null; // AI couldn't grade → manual grading needed
    }
  }

  return null;
}

/**
 * Validates whether an answer key is usable for auto-checking.
 * Returns true if AI can use this answer key for grading.
 */
export async function validateAnswerKey(
  answerKey: string,
  assignmentType: string,
): Promise<{ valid: boolean; reason: string }> {
  if (!answerKey || !answerKey.trim()) {
    return { valid: false, reason: 'No answer key provided. Submissions will need manual grading.' };
  }

  // Simple types always valid if non-empty
  if (['quiz', 'true_false', 'identification'].includes(assignmentType)) {
    return { valid: true, reason: 'Answer key accepted for auto-checking.' };
  }

  // For essay/short_answer, check if answer key is substantial enough
  if (answerKey.trim().length < 20) {
    return { valid: false, reason: 'Answer key is too short for AI grading. Please provide more detail (rubric, key points, or a model answer).' };
  }

  try {
    const prompt = `Can the following text be used as an answer key or grading rubric for a ${assignmentType}? 
Text: "${answerKey.substring(0, 500)}"
Respond with ONLY: {"usable": true/false, "reason": "brief explanation"}`;

    const result = await geminiModel.generateContent(prompt);
    const text = (await result.response).text();
    const jsonMatch = text.match(/\{[\s\S]*?\}/);
    
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        valid: parsed.usable,
        reason: parsed.reason || (parsed.usable ? 'Answer key accepted.' : 'Answer key cannot be used for auto-grading.'),
      };
    }
  } catch (e) {
    console.error('Answer key validation failed:', e);
  }

  return { valid: true, reason: 'Answer key accepted (validation skipped).' };
}
