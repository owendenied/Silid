-- =====================================================
-- NUCLEAR FIX: Completely reset all RLS policies
-- Run this ENTIRE script in Supabase SQL Editor at once
-- =====================================================

-- Step 1: DISABLE RLS on all tables first to stop the recursion
ALTER TABLE public.classrooms DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop EVERY policy on classrooms (catch-all with known names)
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'classrooms' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.classrooms', pol.policyname);
    END LOOP;

    FOR pol IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'enrollments' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.enrollments', pol.policyname);
    END LOOP;

    FOR pol IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'assignments' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.assignments', pol.policyname);
    END LOOP;

    FOR pol IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'submissions' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.submissions', pol.policyname);
    END LOOP;

    FOR pol IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'users' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.users', pol.policyname);
    END LOOP;
END $$;

-- Step 3: Drop old helper functions if they exist
DROP FUNCTION IF EXISTS public.get_my_user_id();
DROP FUNCTION IF EXISTS public.get_my_app_role();
DROP FUNCTION IF EXISTS public.get_my_teacher_classroom_ids();
DROP FUNCTION IF EXISTS public.get_my_enrolled_classroom_ids();

-- Step 4: Create helper functions (SECURITY DEFINER = bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_my_user_id()
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT id FROM public.users WHERE "openId" = auth.uid()::text
$$;

CREATE OR REPLACE FUNCTION public.get_my_app_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT "appRole"::text FROM public.users WHERE "openId" = auth.uid()::text
$$;

CREATE OR REPLACE FUNCTION public.get_my_teacher_classroom_ids()
RETURNS SETOF integer
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT id FROM public.classrooms WHERE "teacherId" = public.get_my_user_id()
$$;

CREATE OR REPLACE FUNCTION public.get_my_enrolled_classroom_ids()
RETURNS SETOF integer
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT "classroomId" FROM public.enrollments WHERE "studentId" = public.get_my_user_id()
$$;

-- Step 5: Re-enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

-- Step 6: Create fresh policies

-- USERS
CREATE POLICY "users_select" ON public.users FOR SELECT USING (true);
CREATE POLICY "users_insert" ON public.users FOR INSERT WITH CHECK (auth.uid()::text = "openId");
CREATE POLICY "users_update" ON public.users FOR UPDATE USING (auth.uid()::text = "openId");

-- CLASSROOMS
CREATE POLICY "classrooms_select" ON public.classrooms FOR SELECT USING (
  "teacherId" = public.get_my_user_id()
  OR id IN (SELECT public.get_my_enrolled_classroom_ids())
);
CREATE POLICY "classrooms_insert" ON public.classrooms FOR INSERT WITH CHECK (
  public.get_my_app_role() = 'teacher'
);
CREATE POLICY "classrooms_update" ON public.classrooms FOR UPDATE USING (
  "teacherId" = public.get_my_user_id()
);

-- ENROLLMENTS
CREATE POLICY "enrollments_select" ON public.enrollments FOR SELECT USING (
  "studentId" = public.get_my_user_id()
  OR "classroomId" IN (SELECT public.get_my_teacher_classroom_ids())
);
CREATE POLICY "enrollments_insert" ON public.enrollments FOR INSERT WITH CHECK (
  "studentId" = public.get_my_user_id()
);

-- ASSIGNMENTS
CREATE POLICY "assignments_select" ON public.assignments FOR SELECT USING (
  "classroomId" IN (SELECT public.get_my_teacher_classroom_ids())
  OR "classroomId" IN (SELECT public.get_my_enrolled_classroom_ids())
);
CREATE POLICY "assignments_all" ON public.assignments FOR ALL USING (
  "createdBy" = public.get_my_user_id()
);

-- SUBMISSIONS
CREATE POLICY "submissions_student" ON public.submissions FOR ALL USING (
  "studentId" = public.get_my_user_id()
);
CREATE POLICY "submissions_teacher" ON public.submissions FOR ALL USING (
  "assignmentId" IN (
    SELECT id FROM public.assignments WHERE "createdBy" = public.get_my_user_id()
  )
);
