// ============================================================
// Sample Data Seeder — Populates the app with realistic demo data
// ============================================================

const DB_KEY = 'silid_local_db';
const SEEDED_KEY = 'silid_seeded_v4';

interface SeedDb {
  users: any[];
  classrooms: any[];
  enrollments: any[];
  assignments: any[];
  posts: any[];
  submissions: any[];
  _nextId: Record<string, number>;
}

function getSeedDb(): SeedDb {
  try {
    const stored = localStorage.getItem(DB_KEY);
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }
  return { users: [], classrooms: [], enrollments: [], assignments: [], posts: [], submissions: [], _nextId: {} };
}

function saveSeedDb(db: SeedDb) {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}

const STUDENT_NAMES = [
  'Maria Santos', 'Juan Cruz', 'Ana Reyes', 'Carlos Garcia', 'Sofia Lopez',
  'Miguel Torres', 'Isabella Navarro', 'Alejandro Bautista', 'Gabriela Mendoza', 'Luis Rivera',
  'Patricia Flores', 'Antonio Ramos', 'Camila Dela Cruz', 'Rafael Aquino', 'Elena Villanueva',
  'Diego Hernandez', 'Valentina Pascual', 'Fernando Aguilar', 'Mariana Ocampo', 'Jose Manalo',
  'Andrea Castillo', 'Ricardo Salazar', 'Teresa Morales', 'Pablo Mercado', 'Lucia Dimaculangan',
];

const TEACHER_NAMES = [
  'Dr. Carmen Velasco', 'Prof. Roberto Lim', 'Ms. Angelica Tan',
];

export function seedDemoData() {
  if (localStorage.getItem(SEEDED_KEY)) return; // Already seeded

  const db = getSeedDb();

  // Create teacher users
  const teachers = TEACHER_NAMES.map((name, i) => ({
    id: 100 + i,
    openId: `teacher-${i}`,
    name,
    email: `${name.split(' ').pop()?.toLowerCase()}@silid.edu`,
    appRole: 'teacher',
    xp: 0,
    streak: Math.floor(Math.random() * 30),
    createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  }));

  // Create student users
  const students = STUDENT_NAMES.map((name, i) => ({
    id: 200 + i,
    openId: `student-${i}`,
    name,
    email: `${name.split(' ').join('.').toLowerCase()}@student.silid.edu`,
    appRole: 'student',
    xp: Math.floor(Math.random() * 250) + 10,
    streak: Math.floor(Math.random() * 14),
    createdAt: new Date(Date.now() - 20 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  }));

  // Create classrooms
  const classroomsData = [
    { name: 'Araling Panlipunan 10', section: 'Rizal,Mabini,Luna', teacherIdx: 0, code: 'AP10RZ' },
    { name: 'Mathematics 9', section: 'Mabini,Bonifacio', teacherIdx: 1, code: 'MA9MBN' },
    { name: 'English Literature 10', section: 'Bonifacio,Aguinaldo', teacherIdx: 2, code: 'EL10BN' },
    { name: 'Filipino 9', section: 'Luna,Rizal', teacherIdx: 0, code: 'FL9LNA' },
    { name: 'Science 10', section: 'Aguinaldo,Mabini,Rizal', teacherIdx: 1, code: 'SC10AG' },
  ];

  const classrooms = classroomsData.map((cls, i) => ({
    id: 300 + i,
    name: cls.name,
    section: cls.section,
    teacherId: teachers[cls.teacherIdx].id,
    joinCode: cls.code,
    createdAt: new Date(Date.now() - 25 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  }));

  // Enroll students (distribute across classes)
  const enrollments: any[] = [];
  let enrollId = 400;
  students.forEach((student, si) => {
    // Each student enrolls in 2-3 classes
    const numClasses = 2 + (si % 2);
    for (let j = 0; j < numClasses; j++) {
      const classIdx = (si + j) % classrooms.length;
      const sections = classrooms[classIdx].section.split(',');
      const section = sections[si % sections.length];
      enrollments.push({
        id: enrollId++,
        classroomId: classrooms[classIdx].id,
        studentId: student.id,
        section,
        createdAt: new Date(Date.now() - 20 * 86400000).toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  });

  // Create assignments (multiple types per class)
  const assignmentTemplates = [
    // Quiz type
    { title: 'Quiz 1: Philippine Revolution', type: 'quiz', points: 10, classIdx: 0,
      questions: [{ question: 'Who wrote the Noli Me Tangere?', options: ['Jose Rizal', 'Andres Bonifacio', 'Emilio Aguinaldo', 'Apolinario Mabini'], correctAnswer: 'Jose Rizal' }],
      answerKey: 'Jose Rizal' },
    { title: 'Quiz 2: Quadratic Equations', type: 'quiz', points: 15, classIdx: 1,
      questions: [{ question: 'What is the discriminant of x²-4x+4=0?', options: ['0', '4', '8', '16'], correctAnswer: '0' }],
      answerKey: '0' },
    // Short Answer type
    { title: 'Short Answer: Filipino Values', type: 'short_answer', points: 20, classIdx: 0,
      description: 'In 2-3 sentences, explain the concept of "Bayanihan" and give one modern example.',
      answerKey: 'Bayanihan is the Filipino tradition of communal unity and cooperation. It comes from the practice of neighbors helping a family move their house. Modern examples include community clean-up drives, disaster relief efforts, and crowdfunding for medical needs.' },
    { title: 'Short Answer: Literary Analysis', type: 'short_answer', points: 20, classIdx: 2,
      description: 'Describe the theme of sacrifice in "Florante at Laura".',
      answerKey: 'The theme of sacrifice is central to Florante at Laura. Florante sacrifices his comfort and safety for his love Laura, showing how love can motivate selfless acts. Sacrifice is also shown through patriotism as characters fight for their homeland.' },
    // Essay type
    { title: 'Essay: Impact of Colonialism', type: 'essay', points: 50, classIdx: 0,
      description: 'Write a 500-word essay discussing the lasting impact of Spanish colonialism on Filipino culture. Include at least 3 specific examples.',
      answerKey: 'Rubric: Content relevance (15pts), specific examples minimum 3 (15pts), coherent argument structure (10pts), proper grammar and spelling (10pts). Key topics: Religion/Catholicism, language influence, architecture, food culture, social class system, education system.' },
    // True/False type
    { title: 'True or False: Cell Biology', type: 'true_false', points: 10, classIdx: 4,
      questions: [
        { question: 'Mitochondria is the powerhouse of the cell.', correctAnswer: 'True' },
        { question: 'DNA stands for Deoxyribonucleic Acid.', correctAnswer: 'True' },
        { question: 'Prokaryotic cells have a nucleus.', correctAnswer: 'False' },
        { question: 'Photosynthesis occurs in the ribosomes.', correctAnswer: 'False' },
        { question: 'Cell membrane is selectively permeable.', correctAnswer: 'True' },
      ],
      answerKey: 'True, True, False, False, True' },
    // Identification type
    { title: 'Identification: Filipino Heroes', type: 'identification', points: 20, classIdx: 3,
      questions: [
        { question: 'He is known as the Father of the Katipunan.', correctAnswer: 'Andres Bonifacio' },
        { question: 'She was the first Filipina to earn a pharmaceutical degree.', correctAnswer: 'Anastacia Giron-Tupas' },
        { question: 'He wrote "Mi Ultimo Adios".', correctAnswer: 'Jose Rizal' },
      ],
      answerKey: 'Andres Bonifacio, Anastacia Giron-Tupas, Jose Rizal' },
    // Module type
    { title: 'Module: Introduction to Algebra', type: 'module', points: 0, classIdx: 1,
      description: 'Read through this introductory module on algebraic expressions.',
      content: 'Algebra is a branch of mathematics that uses symbols (usually letters) to represent numbers in formulas and equations...' },
    { title: 'Module: Panitikang Filipino', type: 'module', points: 0, classIdx: 3,
      description: 'Basahin ang modyul tungkol sa mga uri ng panitikang Filipino.',
      content: 'Ang panitikang Filipino ay may mayamang kasaysayan na nagsimula pa bago dumating ang mga Kastila...' },
  ];

  const assignments: any[] = [];
  let assignId = 500;
  assignmentTemplates.forEach((tpl) => {
    assignments.push({
      id: assignId++,
      classroomId: classrooms[tpl.classIdx].id,
      createdBy: classrooms[tpl.classIdx].teacherId,
      title: tpl.title,
      type: tpl.type,
      description: tpl.description || '',
      points: tpl.points,
      questions: tpl.questions || null,
      content: tpl.content || null,
      answerKey: tpl.answerKey || null,
      autoCheck: !!tpl.answerKey,
      createdAt: new Date(Date.now() - (15 - assignmentTemplates.indexOf(tpl)) * 86400000).toISOString(),
      updatedAt: new Date().toISOString(),
    });
  });

  // Create some submissions
  const submissions: any[] = [];
  let subId = 600;
  // Some students answered the quizzes
  const quiz1 = assignments.find(a => a.title.includes('Quiz 1'));
  const quiz2 = assignments.find(a => a.title.includes('Quiz 2'));
  
  if (quiz1) {
    students.slice(0, 12).forEach(student => {
      const isCorrect = Math.random() > 0.3;
      submissions.push({
        id: subId++,
        assignmentId: quiz1.id,
        studentId: student.id,
        answer: isCorrect ? 'Jose Rizal' : 'Andres Bonifacio',
        isCorrect,
        score: isCorrect ? quiz1.points : 0,
        createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
        updatedAt: new Date().toISOString(),
      });
    });
  }

  if (quiz2) {
    students.slice(5, 18).forEach(student => {
      const isCorrect = Math.random() > 0.4;
      submissions.push({
        id: subId++,
        assignmentId: quiz2.id,
        studentId: student.id,
        answer: isCorrect ? '0' : '4',
        isCorrect,
        score: isCorrect ? quiz2.points : 0,
        createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
        updatedAt: new Date().toISOString(),
      });
    });
  }

  // Create announcements
  const posts = [
    { id: 700, classroomId: classrooms[0].id, authorId: teachers[0].id, content: 'Good morning class! Please prepare for our quiz tomorrow about the Philippine Revolution. Review chapters 5-7.', createdAt: new Date(Date.now() - 2 * 86400000).toISOString() },
    { id: 701, classroomId: classrooms[0].id, authorId: teachers[0].id, content: 'Reminder: Submit your essay on the Impact of Colonialism by Friday. Late submissions will have a 10% deduction.', createdAt: new Date(Date.now() - 1 * 86400000).toISOString() },
    { id: 702, classroomId: classrooms[1].id, authorId: teachers[1].id, content: 'Great job on the last quiz everyone! Most of you got perfect scores. Keep it up! 🎉', createdAt: new Date(Date.now() - 86400000).toISOString() },
    { id: 703, classroomId: classrooms[2].id, authorId: teachers[2].id, content: 'Our literary analysis session has been moved to Thursday. Please read Act 3 of the play before class.', createdAt: new Date().toISOString() },
  ];

  // Merge with existing data (don't duplicate)
  const existingUsers = db.users;
  db.users = [...existingUsers, ...teachers.filter(t => !existingUsers.find((u: any) => u.id === t.id)), ...students.filter(s => !existingUsers.find((u: any) => u.id === s.id))];
  db.classrooms = [...db.classrooms, ...classrooms];
  db.enrollments = [...db.enrollments, ...enrollments];
  db.assignments = [...db.assignments, ...assignments];
  db.submissions = [...db.submissions, ...submissions];
  db.posts = [...db.posts, ...posts.map(p => ({ ...p, updatedAt: new Date().toISOString() }))];
  
  // Update next IDs
  db._nextId = {
    users: Math.max(db._nextId.users || 0, 300),
    classrooms: Math.max(db._nextId.classrooms || 0, 400),
    enrollments: Math.max(db._nextId.enrollments || 0, enrollId + 10),
    assignments: Math.max(db._nextId.assignments || 0, assignId + 10),
    submissions: Math.max(db._nextId.submissions || 0, subId + 10),
    posts: Math.max(db._nextId.posts || 0, 800),
  };

  saveSeedDb(db);
  localStorage.setItem(SEEDED_KEY, 'true');
  console.log('✅ Demo data seeded successfully!');
}
