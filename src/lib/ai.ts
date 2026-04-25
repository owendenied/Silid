import { geminiModel } from "./gemini";

const SYSTEM_CONTEXT = `You are "Guro Bot", an AI tutor assistant built into Silid Classroom — a Filipino-themed Learning Management System. 

Your personality:
- You are warm, encouraging, and knowledgeable — like a friendly Filipino teacher
- You use a mix of English (primary) with occasional Filipino/Tagalog words of encouragement (like "Magaling!", "Tama!", "Ayos!")
- You help students understand their lessons and help teachers plan their classes
- You are patient and break down complex topics into simple explanations
- You give practical examples relevant to Filipino students when possible
- You celebrate small wins and encourage persistence

For students, you can:
- Explain difficult concepts in simple terms
- Help with homework and assignments
- Quiz them on topics they're studying
- Suggest study strategies

For teachers, you can:
- Help create lesson plans aligned to Philippine curriculum (K-12, DepEd)
- Suggest classroom activities and assessments
- Help with rubric creation
- Provide teaching strategies

Always be helpful, concise, and encouraging. Keep responses under 300 words unless a detailed explanation is needed.`;

export async function askGemini(prompt: string): Promise<string> {
  try {
    const fullPrompt = `${SYSTEM_CONTEXT}\n\nUser: ${prompt}\n\nGuro Bot:`;
    const result = await geminiModel.generateContent(fullPrompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Gemini error:", error);
    return "Pasensya na — nagkaroon ng error sa AI. Subukan ulit mamaya! (Sorry, there was an AI error. Try again later!)";
  }
}

export async function generateLessonPlan(topic: string, gradeLevel?: string): Promise<string> {
  try {
    const prompt = `${SYSTEM_CONTEXT}\n\nGenerate a detailed lesson plan for the topic "${topic}"${gradeLevel ? ` for ${gradeLevel}` : ''}.
    
DO NOT use markdown formatting (like ## or **). Use ALL CAPS for section headers.

Format it with these sections:
LESSON PLAN: ${topic}

LEARNING OBJECTIVES
(3-4 specific, measurable objectives)

MATERIALS NEEDED
(List of materials)

MOTIVATION / ICE BREAKER (5 minutes)
(An engaging opening activity)

DISCUSSION / INPUT (15 minutes)
(Key concepts to cover with examples)

ACTIVITY (15 minutes)
(A hands-on activity for students)

EVALUATION (10 minutes)
(Assessment questions or tasks)

ASSIGNMENT
(Take-home work)

Make it practical, engaging, and aligned to Philippine K-12 curriculum standards where applicable.`;

    const result = await geminiModel.generateContent(prompt);
    const response = await result.response;
    let text = response.text();
    // Strip markdown characters like #, *, _, `
    text = text.replace(/[#*`_]/g, '').trim();
    return text;
  } catch (error) {
    console.error("Lesson plan generation error:", error);
    return "Could not generate lesson plan. Please try again.";
  }
}

export async function generateModuleContent(topic: string, gradeLevel?: string): Promise<{ title: string; content: string }> {
  try {
    const prompt = `${SYSTEM_CONTEXT}\n\nGenerate educational module content for the topic "${topic}"${gradeLevel ? ` for ${gradeLevel}` : ''}.

DO NOT use markdown formatting (like ## or **). Use ALL CAPS for section headers.
Write it as a comprehensive learning module that a student can read and learn from.

Format it with these sections:

INTRODUCTION
(Brief overview of the topic and why it matters)

KEY CONCEPTS
(Detailed explanation of the main concepts with clear definitions)

EXAMPLES
(2-3 practical, real-world examples relevant to Filipino students)

DID YOU KNOW?
(An interesting fact related to the topic)

SUMMARY
(A concise recap of the key points)

REVIEW QUESTIONS
(3-5 questions to check understanding — no answer key needed)

Make it educational, engaging, age-appropriate, and aligned to Philippine K-12 curriculum standards where applicable.`;

    const result = await geminiModel.generateContent(prompt);
    const response = await result.response;
    let text = response.text();
    // Strip markdown characters
    text = text.replace(/[#*`_]/g, '').trim();

    return {
      title: `${topic}`,
      content: text,
    };
  } catch (error) {
    console.error("Module content generation error:", error);
    return {
      title: topic,
      content: "Could not generate module content. Please try again.",
    };
  }
}
