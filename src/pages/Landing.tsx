// Landing page
import { Link } from 'react-router-dom'
import { BookOpen, Users, WifiOff } from 'lucide-react'

export const Landing = () => {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="flex justify-between items-center p-6 bg-white shadow-sm border-b border-gray-200">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="Silid Logo" className="w-8 h-8 object-cover rounded-lg shadow-sm" />
          <h1 className="text-2xl font-bold text-[var(--color-silid-teal)]">Silid</h1>
        </div>
        <div className="flex gap-4">
          <Link to="/login" className="px-4 py-2 font-medium text-silid-teal hover:bg-gray-50 rounded-md transition-colors">
            Mag-sign In
          </Link>
          <Link to="/login" className="px-4 py-2 font-medium text-white bg-silid-teal hover:bg-blue-800 rounded-md transition-colors shadow-sm">
            Magsimula (Libre)
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <section className="px-6 py-20 text-center max-w-4xl mx-auto">
          <h2 className="text-5xl font-extrabold text-gray-900 mb-6 tracking-tight">
            Ang Kwaderno ng <span className="text-[var(--color-silid-teal)]">Bawat Pilipino</span>
          </h2>
          <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
            Isang offline-first na classroom management at learning platform na dinisenyo para sa mga estudyante at guro sa Pilipinas, kahit mahina ang internet.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/login" className="px-8 py-4 text-lg font-bold text-white bg-silid-yellow hover:bg-yellow-600 rounded-lg shadow-md transition-transform hover:scale-105">
              Gumawa ng Account
            </Link>
            <Link to="/login" className="px-8 py-4 text-lg font-bold text-silid-teal bg-white border-2 border-silid-teal hover:bg-blue-50 rounded-lg shadow-sm transition-transform hover:scale-105">
              Subukan ang Demo
            </Link>
          </div>
        </section>

        <section className="bg-gray-50 py-16 px-6">
          <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-blue-100 text-silid-teal rounded-full flex items-center justify-center mb-6">
                <Users size={32} />
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-800">Para sa Malaking Klase</h3>
              <p className="text-gray-600">
                Madaling i-manage ang mga mag-aaral. May auto-checking ng quizzes para bawas ang trabaho ng guro.
              </p>
            </div>
            
            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-yellow-100 text-silid-yellow rounded-full flex items-center justify-center mb-6">
                <WifiOff size={32} />
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-800">Offline-First</h3>
              <p className="text-gray-600">
                Basahin ang modules at sagutan ang mga gawain kahit walang internet. Mag-sy-sync kusa pabalik online.
              </p>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-green-100 text-silid-green rounded-full flex items-center justify-center mb-6">
                <BookOpen size={32} />
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-800">Masayang Mag-aral</h3>
              <p className="text-gray-600">
                Kumita ng XP at Badges habang nag-aaral. Nakaka-engganyo para sa mga estudyante.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-gray-900 text-gray-400 py-8 px-6 text-center">
        <p>© 2026 Silid Classroom. Para sa kabataang Pilipino.</p>
      </footer>
    </div>
  )
}
