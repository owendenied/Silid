-- =====================================================
-- FIX: Infinite recursion in RLS policies
-- =====================================================
-- PROBLEM: classrooms SELECT policy queries enrollments,
--          enrollments SELECT policy queries classrooms,
--          causing infinite recursion.
-- 
-- SOLUTION: Create SECURITY DEFINER helper functions that
--           bypass RLS, then use those in policies.
-- =====================================================

-- Step 1: Create helper functions (SECURITY DEFINER bypasses RLS)

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

-- Step 2: Drop ALL old policies to avoid conflicts

DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;

DROP POLICY IF EXISTS "Classrooms are viewable by participants" ON public.classrooms;
DROP POLICY IF EXISTS "Instructors can create classrooms" ON public.classrooms;
DROP POLICY IF EXISTS "Instructors can update own classrooms" ON public.classrooms;

DROP POLICY IF EXISTS "Assignments viewable by participants" ON public.assignments;
DROP POLICY IF EXISTS "Assignments are viewable by participants" ON public.assignments;
DROP POLICY IF EXISTS "Instructors manage assignments" ON public.assignments;
DROP POLICY IF EXISTS "Instructors can manage assignments" ON public.assignments;

DROP POLICY IF EXISTS "View enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Join classes" ON public.enrollments;

DROP POLICY IF EXISTS "Students can manage own submissions" ON public.submissions;
DROP POLICY IF EXISTS "Instructors can view and grade submissions" ON public.submissions;

-- Step 3: Recreate policies using helper functions (NO cross-table recursion)

-- USERS (unchanged, no recursion issue here)
CREATE POLICY "Public profiles are viewable by everyone" ON public.users
  FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON public.users
  FOR INSERT WITH CHECK (auth.uid()::text = "openId");
CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid()::text = "openId");

-- CLASSROOMS (uses helper functions instead of subqueries on enrollments)
CREATE POLICY "Classrooms are viewable by participants" ON public.classrooms
  FOR SELECT USING (
    "teacherId" = public.get_my_user_id()
    OR id IN (SELECT public.get_my_enrolled_classroom_ids())
  );
CREATE POLICY "Instructors can create classrooms" ON public.classrooms
  FOR INSERT WITH CHECK (
    public.get_my_app_role() = 'teacher'
  );
CREATE POLICY "Instructors can update own classrooms" ON public.classrooms
  FOR UPDATE USING (
    "teacherId" = public.get_my_user_id()
  );

-- ENROLLMENTS (uses helper functions instead of subqueries on classrooms)
CREATE POLICY "View enrollments" ON public.enrollments
  FOR SELECT USING (
    "studentId" = public.get_my_user_id()
    OR "classroomId" IN (SELECT public.get_my_teacher_classroom_ids())
  );
CREATE POLICY "Join classes" ON public.enrollments
  FOR INSERT WITH CHECK (
    "studentId" = public.get_my_user_id()
  );

-- ASSIGNMENTS (uses helper functions)
CREATE POLICY "Assignments viewable by participants" ON public.assignments
  FOR SELECT USING (
    "classroomId" IN (SELECT public.get_my_teacher_classroom_ids())
    OR "classroomId" IN (SELECT public.get_my_enrolled_classroom_ids())
  );
CREATE POLICY "Instructors manage assignments" ON public.assignments
  FOR ALL USING (
    "createdBy" = public.get_my_user_id()
  );

-- SUBMISSIONS (uses helper functions)
CREATE POLICY "Students can manage own submissions" ON public.submissions
  FOR ALL USING (
    "studentId" = public.get_my_user_id()
  );
CREATE POLICY "Instructors can view and grade submissions" ON public.submissions
  FOR ALL USING (
    "assignmentId" IN (
      SELECT id FROM public.assignments WHERE "createdBy" = public.get_my_user_id()
    )
  );
