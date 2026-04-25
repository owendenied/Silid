import Dexie, { type EntityTable } from 'dexie';

export interface Classroom {
  id: string;
  name: string;
  section: string;
  teacherId: string;
  inviteCode: string;
  createdAt: number;
}

export interface StudentProfile {
  id: string;
  name: string;
  xp: number;
  level: string;
  streak: number;
  lastActive: number;
}

export interface Material {
  id: string;
  classroomId: string;
  title: string;
  description: string;
  type: 'module' | 'quiz' | 'assignment';
  content?: string; // Markdown or rich text
  dueDate?: number;
  createdAt: number;
}

export interface Submission {
  id: string;
  materialId: string;
  studentId: string;
  answers: Record<string, string | number | boolean>;
  score?: number;
  status: 'pending_sync' | 'synced' | 'graded';
  submittedAt: number;
}

const db = new Dexie('SilidDB') as Dexie & {
  classrooms: EntityTable<Classroom, 'id'>;
  profiles: EntityTable<StudentProfile, 'id'>;
  materials: EntityTable<Material, 'id'>;
  submissions: EntityTable<Submission, 'id'>;
};

// Schema declaration
db.version(1).stores({
  classrooms: 'id, teacherId, inviteCode',
  profiles: 'id',
  materials: 'id, classroomId, type',
  submissions: 'id, materialId, studentId, status'
});

export { db };
