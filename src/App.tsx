import { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Dashboard } from './pages/Dashboard'
import { Classroom } from './pages/Classroom'
import { Assignment } from './pages/Assignment'
import { Profile } from './pages/Profile'
import { Login } from './pages/Login'
import { Chat } from './pages/Chat'
import { Gradebook } from './pages/Gradebook'
import { Layout } from './components/Layout'
import { ToastContainer } from './components/Toast'
import { useAppStore } from './store/useAppStore'

function App() {
  const { theme } = useAppStore();

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  return (
    <Router>
      <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] font-sans">
        <ToastContainer />
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/login" element={<Login />} />
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/class/:id" element={<Classroom />} />
            <Route path="/assignment/:id" element={<Assignment />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/teacher/gradebook/:classId" element={<Gradebook />} />
          </Route>
        </Routes>
      </div>
    </Router>
  )
}

export default App
