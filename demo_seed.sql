-- Run this entire script in your Supabase SQL Editor to generate demo data!
-- This will automatically find your teacher account, create 3 fake students, 3 classes, and populate them with modules.

DO $$
DECLARE
  v_teacher_id INT;
  v_student1_id INT;
  v_student2_id INT;
  v_student3_id INT;
  v_class1_id INT;
  v_class2_id INT;
  v_class3_id INT;
BEGIN
  -- 1. Find the first teacher ID in the system (this will be your account)
  SELECT id INTO v_teacher_id FROM users WHERE "appRole" = 'teacher' LIMIT 1;

  IF v_teacher_id IS NULL THEN
    RAISE EXCEPTION 'No teacher account found. Please log into the app as a teacher at least once before running this script.';
  END IF;

  -- 2. Create some fake students (using ON CONFLICT DO NOTHING to avoid errors if run twice)
  -- Note: We assume openId must be unique.
  IF NOT EXISTS (SELECT 1 FROM users WHERE email = 'juan@student.com') THEN
    INSERT INTO users ("openId", "name", "email", "appRole", "xp")
    VALUES ('fake-stu-1', 'Juan Dela Cruz', 'juan@student.com', 'student', 150);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM users WHERE email = 'maria@student.com') THEN
    INSERT INTO users ("openId", "name", "email", "appRole", "xp")
    VALUES ('fake-stu-2', 'Maria Clara', 'maria@student.com', 'student', 220);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM users WHERE email = 'jose@student.com') THEN
    INSERT INTO users ("openId", "name", "email", "appRole", "xp")
    VALUES ('fake-stu-3', 'Jose Rizal', 'jose@student.com', 'student', 450);
  END IF;

  SELECT id INTO v_student1_id FROM users WHERE email = 'juan@student.com';
  SELECT id INTO v_student2_id FROM users WHERE email = 'maria@student.com';
  SELECT id INTO v_student3_id FROM users WHERE email = 'jose@student.com';

  -- 3. Insert 3 realistic subjects
  INSERT INTO classrooms (name, subject, section, "joinCode", "teacherId", "isArchived", "coverColor")
  VALUES 
    ('Introduction to Artificial Intelligence', 'Computer Science', 'Diamond,Ruby', 'AI101X', v_teacher_id, false, '#8E44AD'),
    ('Philippine History: Pre-Colonial to Spanish Era', 'History', 'Rizal', 'PHLHIS', v_teacher_id, false, '#C0392B'),
    ('Advanced Calculus', 'Mathematics', 'Newton', 'CALC99', v_teacher_id, false, '#27ae60')
  RETURNING id INTO v_class1_id;

  -- Need to get IDs for the other two classes just inserted
  SELECT id INTO v_class2_id FROM classrooms WHERE "joinCode" = 'PHLHIS' ORDER BY id DESC LIMIT 1;
  SELECT id INTO v_class3_id FROM classrooms WHERE "joinCode" = 'CALC99' ORDER BY id DESC LIMIT 1;

  -- 4. Enroll students into sections
  INSERT INTO enrollments ("classroomId", "studentId", "section")
  VALUES 
    (v_class1_id, v_student1_id, 'Diamond'),
    (v_class1_id, v_student2_id, 'Ruby'),
    (v_class1_id, v_student3_id, 'Diamond'),
    (v_class2_id, v_student1_id, 'Rizal'),
    (v_class2_id, v_student3_id, 'Rizal'),
    (v_class3_id, v_student2_id, 'Newton');

  -- 5. Add some modules and assignments
  INSERT INTO assignments ("classroomId", "createdBy", "title", "description", "type", "points", "content")
  VALUES
    (v_class1_id, v_teacher_id, 'Week 1: What is AI?', 'Read the introductory module before our next session.', 'module', 0, 'Artificial Intelligence is the simulation of human intelligence processes by machines, especially computer systems...'),
    (v_class1_id, v_teacher_id, 'Quiz: AI Basics', 'Answer this short quiz to test your knowledge on Week 1.', 'quiz', 20, NULL),
    (v_class2_id, v_teacher_id, 'Module 1: Pre-Colonial Era', 'Understand the early civilization of the Philippines.', 'module', 0, 'Before the Spanish arrived, the Philippines was a collection of independent barangays with rich cultures, trade networks, and writing systems like Baybayin...'),
    (v_class2_id, v_teacher_id, 'Essay: The impact of trade', 'Write a 500-word essay on how early trade shaped our culture.', 'essay', 50, NULL),
    (v_class3_id, v_teacher_id, 'Derivatives Worksheet', 'Solve the attached problems.', 'short_answer', 100, NULL);

END $$;
