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
    
Format it with these sections:
## Lesson Plan: ${topic}

### Learning Objectives
(3-4 specific, measurable objectives)

### Materials Needed
(List of materials)

### Motivation / Ice Breaker (5 minutes)
(An engaging opening activity)

### Discussion / Input (15 minutes)
(Key concepts to cover with examples)

### Activity (15 minutes)
(A hands-on activity for students)

### Evaluation (10 minutes)
(Assessment questions or tasks)

### Assignment
(Take-home work)

Make it practical, engaging, and aligned to Philippine K-12 curriculum standards where applicable.`;

    const result = await geminiModel.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Lesson plan generation error:", error);
    return "Could not generate lesson plan. Please try again.";
  }
}
