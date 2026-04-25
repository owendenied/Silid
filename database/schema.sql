-- Silid Supabase Schema (Aligned with User Prompt)

-- 1. Create Enums Safely
DO $$ BEGIN
    CREATE TYPE public.role AS ENUM ('user', 'admin', 'moderator');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public."appRole" AS ENUM ('student', 'teacher');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.assignment_type AS ENUM ('module', 'quiz', 'assignment');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.status AS ENUM ('submitted', 'graded', 'late', 'pending');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.type AS ENUM ('announcement', 'assignment', 'material');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.question_type AS ENUM ('mcq', 'truefalse', 'fillin', 'matching');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Users Table
CREATE TABLE public.users (
  id serial NOT NULL,
  "openId" character varying(64) NOT NULL,
  name text NULL,
  email character varying(320) NULL,
  "loginMethod" character varying(64) NULL,
  role public.role NOT NULL DEFAULT 'user'::role,
  "appRole" public."appRole" NOT NULL DEFAULT 'student'::"appRole",
  xp integer NULL DEFAULT 0,
  level integer NULL DEFAULT 1,
  streak integer NULL DEFAULT 0,
  "createdAt" timestamp without time zone NOT NULL DEFAULT now(),
  "updatedAt" timestamp without time zone NOT NULL DEFAULT now(),
  "lastSignedIn" timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_openId_key UNIQUE ("openId")
) TABLESPACE pg_default;

-- 3. Classrooms Table
CREATE TABLE public.classrooms (
  id serial NOT NULL,
  name character varying(255) NOT NULL,
  subject character varying(255) NULL,
  section character varying(100) NULL,
  "joinCode" character varying(8) NOT NULL,
  "teacherId" integer NOT NULL,
  students integer[] DEFAULT '{}',
  "leaderboardEnabled" boolean NOT NULL DEFAULT false,
  "coverColor" character varying(20) NOT NULL DEFAULT '#1B6CA8'::character varying,
  image text NULL,
  "createdAt" timestamp without time zone NOT NULL DEFAULT now(),
  "updatedAt" timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT classrooms_pkey PRIMARY KEY (id),
  CONSTRAINT classrooms_joinCode_key UNIQUE ("joinCode"),
  CONSTRAINT classrooms_teacherId_fkey FOREIGN KEY ("teacherId") REFERENCES users (id) ON DELETE CASCADE
) TABLESPACE pg_default;

-- 4. Assignments / Classwork Table
CREATE TABLE public.assignments (
  id serial NOT NULL,
  "classroomId" integer NOT NULL,
  "createdBy" integer NOT NULL,
  title character varying(255) NOT NULL,
  description text NULL,
  type public.assignment_type NOT NULL,
  "dueDate" timestamp without time zone NULL,
  points integer NULL DEFAULT 100,
  "moduleContent" text NULL,
  "youtubeUrl" character varying(500) NULL,
  "pdfUrl" character varying(500) NULL,
  published boolean NOT NULL DEFAULT false,
  "createdAt" timestamp without time zone NOT NULL DEFAULT now(),
  "updatedAt" timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT assignments_pkey PRIMARY KEY (id),
  CONSTRAINT assignments_classroomId_fkey FOREIGN KEY ("classroomId") REFERENCES classrooms (id) ON DELETE CASCADE,
  CONSTRAINT assignments_createdBy_fkey FOREIGN KEY ("createdBy") REFERENCES users (id) ON DELETE CASCADE
) TABLESPACE pg_default;

-- 5. Questions Table
CREATE TABLE public.questions (
  id serial NOT NULL,
  "assignmentId" integer NOT NULL,
  type public.question_type NOT NULL,
  prompt text NOT NULL,
  options jsonb NULL,
  "correctAnswer" jsonb NULL,
  points integer NOT NULL DEFAULT 1,
  "orderIndex" integer NOT NULL DEFAULT 0,
  "createdAt" timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT questions_pkey PRIMARY KEY (id),
  CONSTRAINT questions_assignmentId_fkey FOREIGN KEY ("assignmentId") REFERENCES assignments (id) ON DELETE CASCADE
) TABLESPACE pg_default;

-- 6. Submissions Table
CREATE TABLE public.submissions (
  id serial NOT NULL,
  "assignmentId" integer NOT NULL,
  "studentId" integer NOT NULL,
  status public.status NOT NULL DEFAULT 'submitted'::status,
  score integer NULL,
  "maxScore" integer NULL,
  "teacherFeedback" text NULL,
  answer jsonb NULL,
  "submittedAt" timestamp without time zone NOT NULL DEFAULT now(),
  "gradedAt" timestamp without time zone NULL,
  "syncedAt" timestamp without time zone NULL,
  CONSTRAINT submissions_pkey PRIMARY KEY (id),
  CONSTRAINT submissions_assignmentId_fkey FOREIGN KEY ("assignmentId") REFERENCES assignments (id) ON DELETE CASCADE,
  CONSTRAINT submissions_studentId_fkey FOREIGN KEY ("studentId") REFERENCES users (id) ON DELETE CASCADE
) TABLESPACE pg_default;

-- 7. Posts (Announcements) Table
CREATE TABLE public.posts (
  id serial NOT NULL,
  "classroomId" integer NOT NULL,
  "authorId" integer NOT NULL,
  content text NOT NULL,
  type public.type NOT NULL DEFAULT 'announcement'::type,
  "createdAt" timestamp without time zone NOT NULL DEFAULT now(),
  "updatedAt" timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT posts_pkey PRIMARY KEY (id),
  CONSTRAINT posts_authorId_fkey FOREIGN KEY ("authorId") REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT posts_classroomId_fkey FOREIGN KEY ("classroomId") REFERENCES classrooms (id) ON DELETE CASCADE
) TABLESPACE pg_default;

-- 8. User Progress (Optional if integrated into users)
CREATE TABLE public.user_progress (
  userid integer NOT NULL,
  xp integer NULL DEFAULT 0,
  level integer NULL DEFAULT 1,
  streak integer NULL DEFAULT 0,
  lastactivedate date NULL DEFAULT CURRENT_DATE,
  CONSTRAINT user_progress_pkey PRIMARY KEY (userid),
  CONSTRAINT user_progress_userid_fkey FOREIGN KEY (userid) REFERENCES users (id) ON DELETE CASCADE
) TABLESPACE pg_default;

-- 9. Badges Table
CREATE TABLE public.badges (
  id serial NOT NULL,
  "userId" integer NOT NULL,
  "badgeKey" character varying(64) NOT NULL,
  "earnedAt" timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT badges_pkey PRIMARY KEY (id),
  CONSTRAINT badges_userId_fkey FOREIGN KEY ("userId") REFERENCES users (id) ON DELETE CASCADE
) TABLESPACE pg_default;

-- 10. Enrollments Table
CREATE TABLE public.enrollments (
  id serial NOT NULL,
  "classroomId" integer NOT NULL,
  "studentId" integer NOT NULL,
  "enrolledAt" timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT enrollments_pkey PRIMARY KEY (id),
  CONSTRAINT enrollments_classroomId_fkey FOREIGN KEY ("classroomId") REFERENCES classrooms (id) ON DELETE CASCADE,
  CONSTRAINT enrollments_studentId_fkey FOREIGN KEY ("studentId") REFERENCES users (id) ON DELETE CASCADE
) TABLESPACE pg_default;

-- Storage Buckets (Run in SQL Editor)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('attachments', 'attachments', true) ON CONFLICT (id) DO NOTHING;
