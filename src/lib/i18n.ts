import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Lang = 'en' | 'tl';

interface LangState {
  lang: Lang;
  setLang: (lang: Lang) => void;
}

export const useLanguageStore = create<LangState>()(
  persist(
    (set) => ({
      lang: 'en',
      setLang: (lang) => set({ lang }),
    }),
    { name: 'silid-lang' }
  )
);

const translations: Record<string, Record<Lang, string>> = {
  // ---- General ----
  'loading': { en: 'Loading...', tl: 'Nagloload...' },
  'cancel': { en: 'Cancel', tl: 'Kanselahin' },
  'save': { en: 'Save', tl: 'I-save' },
  'create': { en: 'Create', tl: 'Gumawa' },
  'creating': { en: 'Creating...', tl: 'Gumagawa...' },
  'submit': { en: 'Submit', tl: 'Ipasa' },
  'submitting': { en: 'Submitting...', tl: 'Ipinapasa...' },
  'back': { en: 'Back', tl: 'Bumalik' },
  'active': { en: 'Active', tl: 'Aktibo' },
  'students': { en: 'Students', tl: 'Mag-aaral' },
  'teacher_label': { en: 'Teacher', tl: 'Guro' },
  'student_label': { en: 'Student', tl: 'Mag-aaral' },
  'log_out': { en: 'Log out', tl: 'Log out' },

  // ---- Dashboard ----
  'dash.greeting_teacher': { en: 'Welcome, Instructor', tl: 'Mabuhay, Instructor' },
  'dash.greeting_student': { en: 'Welcome', tl: 'Mabuhay' },
  'dash.subtitle_teacher': { en: 'Ready to guide your students today?', tl: 'Handa ka na bang gabayan ang iyong mga mag-aaral ngayon?' },
  'dash.subtitle_student': { en: 'Ready to learn something new today?', tl: 'Ready ka na bang mag-aral ngayong araw?' },
  'dash.new_class': { en: 'New Class', tl: 'Bagong Klase' },
  'dash.join_class': { en: 'Join Class', tl: 'Sumali sa Klase' },
  'dash.my_classes': { en: 'My Classes', tl: 'Aking mga Klase' },
  'dash.classes': { en: 'Classes', tl: 'Mga Klase' },
  'dash.total_students': { en: 'Total Students', tl: 'Total Mag-aaral' },
  'dash.xp_earned': { en: 'XP Earned', tl: 'XP Earned' },
  'dash.to_grade': { en: 'To Grade', tl: 'Para i-grade' },
  'dash.tasks': { en: 'Tasks', tl: 'Gawain' },
  'dash.your_classes': { en: 'Your Classes', tl: 'Iyong mga Klase' },
  'dash.no_classes': { en: 'No classes yet.', tl: 'Wala pang klase rito.' },
  'dash.no_classes_teacher_desc': { en: 'Create your first class to get started with your students.', tl: 'Magsimula sa pamamagitan ng paggawa ng iyong unang klase para sa iyong mga mag-aaral.' },
  'dash.no_classes_student_desc': { en: 'Enter the class code from your teacher to join and start learning.', tl: 'I-type ang class code na binigay ng iyong guro para makasali at makapagsimulang mag-aral.' },
  'dash.create_class_title': { en: 'Create a Class', tl: 'Gumawa ng Klase' },
  'dash.join_class_title': { en: 'Join a Class', tl: 'Sumali sa Klase' },
  'dash.class_name': { en: 'Class Name (Required)', tl: 'Pangalan ng Klase (Required)' },
  'dash.class_name_placeholder': { en: 'e.g. Social Studies 10', tl: 'Hal. Araling Panlipunan 10' },
  'dash.section': { en: 'Section', tl: 'Seksyon' },
  'dash.section_placeholder': { en: 'e.g. Rizal', tl: 'Hal. Rizal' },
  'dash.join_prompt': { en: 'Ask your teacher for the class code to join.', tl: 'Hingin sa iyong guro ang class code para makasali.' },
  'dash.joining': { en: 'Joining...', tl: 'Sumasali...' },
  'dash.join': { en: 'Join', tl: 'Sumali' },
  'dash.chat_title': { en: 'Have a question?', tl: 'May tanong ka ba?' },
  'dash.chat_desc': { en: 'Try our AI Tutor Bot for help with your lessons or classroom management.', tl: 'Subukan ang aming AI Guro Bot para sa tulong sa iyong mga aralin o pag-manage ng klase.' },
  'dash.start_chat': { en: 'Start a Chat', tl: 'Magsimula ng Chat' },
  'dash.updated_ago': { en: 'Updated recently', tl: 'Updated recently' },

  // ---- Classroom ----
  'class.stream': { en: 'Stream', tl: 'Balita' },
  'class.classwork': { en: 'Classwork', tl: 'Gawain' },
  'class.modules': { en: 'Modules', tl: 'Modyul' },
  'class.people': { en: 'People', tl: 'Tao' },
  'class.teachers': { en: 'Teachers', tl: 'Mga Guro' },
  'class.students_list': { en: 'Students', tl: 'Mga Mag-aaral' },
  'class.no_students': { en: 'No students enrolled yet.', tl: 'Wala pang mag-aaral na nakasali.' },
  'class.add_classwork': { en: 'Add Classwork', tl: 'Magdagdag ng Gawain' },
  'class.add_module': { en: 'Add Module', tl: 'Magdagdag ng Modyul' },
  'class.post_announcement': { en: 'Post Announcement', tl: 'Mag-post ng Anunsyo' },
  'class.no_announcements': { en: 'No announcements yet.', tl: 'Wala pang anunsyo.' },
  'class.no_classwork': { en: 'No classwork yet.', tl: 'Wala pang gawain.' },
  'class.no_modules': { en: 'No modules yet.', tl: 'Wala pang modyul.' },
  'class.share_something': { en: 'Share something with your class...', tl: 'Mag-share ng kahit ano sa iyong klase...' },
  'class.class_code': { en: 'Class Code', tl: 'Class Code' },
  'class.gradebook': { en: 'Gradebook', tl: 'Gradebook' },
  'class.import_csv': { en: 'Import CSV', tl: 'Import CSV' },
  'class.new_classwork': { en: 'New Classwork', tl: 'Bagong Gawain' },
  'class.new_module': { en: 'New Module', tl: 'Bagong Modyul' },
  'class.title': { en: 'Title', tl: 'Pamagat' },
  'class.description': { en: 'Description', tl: 'Deskripsyon' },
  'class.type': { en: 'Type', tl: 'Uri' },
  'class.quiz': { en: 'Quiz', tl: 'Pagsusulit' },
  'class.module': { en: 'Module (Reading)', tl: 'Modyul (Babasahin)' },
  'class.content': { en: 'Content / Question', tl: 'Nilalaman / Tanong' },
  'class.attach_file': { en: 'Attach File', tl: 'Mag-attach ng File' },
  'class.announcement_placeholder': { en: 'Write your announcement here...', tl: 'Isulat ang iyong anunsyo dito...' },
  'class.post': { en: 'Post', tl: 'I-post' },
  'class.ai_generate': { en: 'AI Lesson Plan', tl: 'AI Lesson Plan' },
  'class.points': { en: 'Points', tl: 'Puntos' },

  // ---- Assignment ----
  'assign.back_to_class': { en: 'Back to Class', tl: 'Bumalik sa Klase' },
  'assign.quiz_label': { en: 'Quiz', tl: 'Pagsusulit' },
  'assign.module_label': { en: 'Module (Reading)', tl: 'Modyul (Babasahin)' },
  'assign.no_score': { en: 'No Score', tl: 'Walang Marka' },
  'assign.correct': { en: 'Your answer is correct!', tl: 'Tama ang iyong sagot!' },
  'assign.wrong': { en: 'Your answer is wrong.', tl: 'Mali ang iyong sagot.' },
  'assign.your_answer': { en: 'Your answer', tl: 'Ang iyong sagot' },
  'assign.correct_answer': { en: 'Correct answer', tl: 'Tamang sagot' },
  'assign.your_score': { en: 'Your Score', tl: 'Nakuha mong Marka' },
  'assign.submit_answer': { en: 'Submit Answer', tl: 'Ipasa ang Sagot' },
  'assign.teacher_notice': { en: 'You are a teacher. You cannot answer this quiz.', tl: 'Isa kang guro. Hindi ka maaaring sumagot sa pagsusulit na ito.' },
  'assign.not_found': { en: 'Assignment not found.', tl: 'Hindi mahanap ang gawain.' },
  'assign.download': { en: 'Download', tl: 'I-download' },

  // ---- Profile ----
  'profile.edit': { en: 'Edit Profile', tl: 'I-edit ang Profile' },
  'profile.teacher_tag': { en: 'Teacher', tl: 'Guro (Teacher)' },
  'profile.student_tag': { en: 'Student', tl: 'Mag-aaral (Student)' },
  'profile.active_classes': { en: 'Active Classes', tl: 'Aktibong Klase' },
  'profile.total_students': { en: 'Total Students', tl: 'Kabuuang Mag-aaral' },
  'profile.streak': { en: 'Streak', tl: 'Streak' },
  'profile.days': { en: 'Days', tl: 'Araw' },
  'profile.tasks_done': { en: 'Tasks Done', tl: 'Gawain Natapos' },
  'profile.modules_read': { en: 'Modules Read', tl: 'Modules Nabasa' },
  'profile.badges': { en: 'Badges', tl: 'Mga Badge' },
  'profile.teacher_dashboard': { en: 'Teacher Dashboard', tl: 'Dashboard ng Guro' },
  'profile.welcome_teacher': { en: 'Welcome to your Silid dashboard!', tl: 'Maligayang pagdating sa iyong Silid dashboard!' },
  'profile.welcome_desc': { en: 'Here you can see a summary of your classes and your students\' progress.', tl: 'Dito mo makikita ang buod ng iyong mga klase at ang pag-unlad ng iyong mga estudyante.' },
  'profile.name': { en: 'Name', tl: 'Pangalan' },

  // ---- Login ----
  'login.create_account': { en: 'Create an Account', tl: 'Gumawa ng Account sa Silid' },
  'login.sign_in': { en: 'Sign In to Silid', tl: 'Mag-sign In sa Silid' },
  'login.i_am': { en: 'I am a...', tl: 'Ako ay isang...' },
  'login.student': { en: 'Student', tl: 'Mag-aaral' },
  'login.instructor': { en: 'Instructor', tl: 'Instructor' },
  'login.name': { en: 'Name', tl: 'Pangalan (Name)' },
  'login.email': { en: 'Email address', tl: 'Email address' },
  'login.password': { en: 'Password', tl: 'Password' },
  'login.loading': { en: 'Loading...', tl: 'Naglo-load...' },
  'login.register_btn': { en: 'Create Account', tl: 'Gumawa ng Account' },
  'login.login_btn': { en: 'Sign In', tl: 'Sign in' },
  'login.or': { en: 'Or', tl: 'O kaya ay' },
  'login.google': { en: 'Sign in with Google', tl: 'Mag-sign in gamit ang Google' },
  'login.has_account': { en: 'Already have an account? Sign in.', tl: 'May account na? Mag-sign in.' },
  'login.no_account': { en: 'Don\'t have an account? Create one.', tl: 'Wala pang account? Gumawa na.' },
  'login.signup_success': { en: 'Sign up successful! Please check your email for a confirmation link.', tl: 'Matagumpay ang iyong pag-signup! Mangyaring i-check ang iyong email para sa confirmation link bago mag-login.' },

  'gradebook.title': { en: 'Gradebook', tl: 'Gradebook' },
  'grade.title': { en: 'Gradebook', tl: 'Gradebook' },
  'grade.track': { en: 'Track your students\' grades.', tl: 'Subaybayan ang marka ng iyong mga mag-aaral.' },
  'grade.export': { en: 'Export as CSV', tl: 'I-export bilang CSV' },
  'grade.submission_rate': { en: 'Submission Rate', tl: 'Submission Rate' },
  'grade.summary': { en: 'Summary', tl: 'Buod' },
  'grade.total_tasks': { en: 'Total Tasks', tl: 'Kabuuang Gawain' },
  'grade.submissions': { en: 'Submissions', tl: 'Mga Submission' },
  'class.create': { en: 'Create New Classwork', tl: 'Gumawa ng Bagong Gawain' },
  'grade.search': { en: 'Search student...', tl: 'Hanapin ang mag-aaral...' },
  'grade.name': { en: 'Name', tl: 'Pangalan' },
  'grade.status': { en: 'Status', tl: 'Status' },
  'grade.completed': { en: 'Completed', tl: 'Natapos' },
  'grade.not_yet': { en: 'Not yet', tl: 'Hindi pa' },
  'grade.total_score': { en: 'Total Score', tl: 'Kabuuang Score' },
  'grade.no_students': { en: 'No students in this class yet.', tl: 'Wala pang mga mag-aaral sa klaseng ito.' },

  // ---- Badges ----
  'badge.hardwork': { en: 'Hard Worker', tl: 'Sipag at Tiyaga' },
  'badge.hardwork_desc': { en: 'Completed 5 modules.', tl: 'Nakumpleto ang 5 modyul.' },
  'badge.smart': { en: 'Smart', tl: 'Listo' },
  'badge.smart_desc': { en: 'Got a perfect score on a quiz.', tl: 'Nakuha ang perpektong iskor sa isang pagsusulit.' },
  'badge.genius': { en: 'Genius', tl: 'Henyo' },
  'badge.genius_desc': { en: 'Reached 300 XP.', tl: 'Umabot sa 300 XP.' },
  'badge.champion': { en: 'Champion', tl: 'Kampeon' },
  'badge.champion_desc': { en: 'Be #1 in your class.', tl: 'Maging top 1 sa klase.' },

  // ---- Nav ----
  'nav.offline': { en: 'You are offline. Your work is saved and will sync when you\'re back online!', tl: 'Wala kang internet (Offline). Naka-save ang gawa mo at mag-sy-sync pagbalik online!' },
  'nav.syncing': { en: 'Syncing data...', tl: 'Nag-sy-sync ng data...' },
  'nav.language': { en: '🇵🇭 Tagalog', tl: '🇺🇸 English' },
};

export function t(key: string): string {
  const lang = useLanguageStore.getState().lang;
  return translations[key]?.[lang] || translations[key]?.['en'] || key;
}

// React hook version for reactivity
export function useT() {
  const lang = useLanguageStore((s) => s.lang);
  return (key: string): string => {
    return translations[key]?.[lang] || translations[key]?.['en'] || key;
  };
}
