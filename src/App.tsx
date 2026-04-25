import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Landing } from './pages/Landing'
import { Dashboard } from './pages/Dashboard'
import { Classroom } from './pages/Classroom'
import { Assignment } from './pages/Assignment'
import { Profile } from './pages/Profile'
import { Login } from './pages/Login'
import { Chat } from './pages/Chat'
import { Gradebook } from './pages/Gradebook'
import { Layout } from './components/Layout'

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] font-sans">
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
          {/* We will add more routes later */}
        </Routes>
      </div>
    </Router>
  )
}

export default App
