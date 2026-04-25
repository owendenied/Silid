-- MASTER FIX (Revised): Sync Schema and Set RLS
-- This script avoids touching the non-existent 'students' column.

-- 1. Ensure enrollments table exists
CREATE TABLE IF NOT EXISTS public.enrollments (
  id serial PRIMARY KEY,
  "classroomId" integer NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
  "studentId" integer NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  "enrolledAt" timestamp without time zone DEFAULT now(),
  UNIQUE("classroomId", "studentId")
);

-- 2. Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;

-- 3. Clear old policies to avoid conflicts
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Classrooms are viewable by participants" ON public.classrooms;
DROP POLICY IF EXISTS "Instructors can create classrooms" ON public.classrooms;
DROP POLICY IF EXISTS "Instructors can update own classrooms" ON public.classrooms;
DROP POLICY IF EXISTS "Assignments are viewable by participants" ON public.assignments;
DROP POLICY IF EXISTS "Assignments viewable by participants" ON public.assignments;
DROP POLICY IF EXISTS "Instructors can manage assignments" ON public.assignments;
DROP POLICY IF EXISTS "Instructors manage assignments" ON public.assignments;
DROP POLICY IF EXISTS "Students can manage own submissions" ON public.submissions;
DROP POLICY IF EXISTS "Instructors can view and grade submissions" ON public.submissions;
DROP POLICY IF EXISTS "View enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Join classes" ON public.enrollments;

-- 4. Recreate Policies
-- USERS
CREATE POLICY "Public profiles are viewable by everyone" ON public.users FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON public.users FOR INSERT WITH CHECK (auth.uid()::text = "openId");
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid()::text = "openId");

-- CLASSROOMS
CREATE POLICY "Classrooms are viewable by participants" ON public.classrooms FOR SELECT 
USING (
  "teacherId" = (SELECT id FROM users WHERE "openId" = auth.uid()::text) OR
  id IN (SELECT "classroomId" FROM enrollments WHERE "studentId" = (SELECT id FROM users WHERE "openId" = auth.uid()::text))
);
CREATE POLICY "Instructors can create classrooms" ON public.classrooms FOR INSERT 
WITH CHECK ( (SELECT "appRole" FROM users WHERE "openId" = auth.uid()::text) = 'teacher' );
CREATE POLICY "Instructors can update own classrooms" ON public.classrooms FOR UPDATE 
USING ( "teacherId" = (SELECT id FROM users WHERE "openId" = auth.uid()::text) );

-- ASSIGNMENTS
CREATE POLICY "Assignments viewable by participants" ON public.assignments FOR SELECT 
USING (
  "classroomId" IN (SELECT id FROM classrooms WHERE "teacherId" = (SELECT id FROM users WHERE "openId" = auth.uid()::text)) OR
  "classroomId" IN (SELECT "classroomId" FROM enrollments WHERE "studentId" = (SELECT id FROM users WHERE "openId" = auth.uid()::text))
);
CREATE POLICY "Instructors manage assignments" ON public.assignments FOR ALL 
USING ( "createdBy" = (SELECT id FROM users WHERE "openId" = auth.uid()::text) );

-- ENROLLMENTS
CREATE POLICY "View enrollments" ON public.enrollments FOR SELECT 
USING (
  "studentId" = (SELECT id FROM users WHERE "openId" = auth.uid()::text) OR
  "classroomId" IN (SELECT id FROM classrooms WHERE "teacherId" = (SELECT id FROM users WHERE "openId" = auth.uid()::text))
);
CREATE POLICY "Join classes" ON public.enrollments FOR INSERT 
WITH CHECK ( "studentId" = (SELECT id FROM users WHERE "openId" = auth.uid()::text) );

-- SUBMISSIONS
CREATE POLICY "Students can manage own submissions" ON public.submissions FOR ALL 
USING ( "studentId" = (SELECT id FROM users WHERE "openId" = auth.uid()::text) );
CREATE POLICY "Instructors can view and grade submissions" ON public.submissions FOR ALL 
USING (
  "assignmentId" IN (
    SELECT id FROM assignments WHERE "createdBy" = (SELECT id FROM users WHERE "openId" = auth.uid()::text)
  )
);
