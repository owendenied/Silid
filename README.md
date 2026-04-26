<div align="center">
  <img src="public/logo.png" alt="Silid Logo" width="120" height="120">
  
  # Silid - Offline-First AI Learning Management System
  
  > *A premium Filipino-inspired Learning Management System*  
  > A comprehensive educational platform demonstrating the power of offline-first PWA and AI integration.
</div>

[![React](https://img.shields.io/badge/React-19.0.0-blue.svg)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-8.0.0-purple.svg)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.0.0-38B2AC.svg)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Backend-3ECF8E.svg)](https://supabase.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## 🎥 Demo Video

Watch Silid in action: [**View Demo Video**](#) *(Coming Soon)*

---

## About Silid

Silid is a comprehensive *offline-first Learning Management System* that combines AI-powered lesson planning, automated grading assistance, and an engaging gamified student experience. Built to address real-world connectivity challenges, Silid showcases a robust offline capability using Dexie.js alongside a powerful cloud backend via Supabase.

### Why Silid?

- *Real-World Application*: Designed with the Philippine educational context in mind, where internet connectivity can be intermittent.
- *Advanced Features*: Google Gemini AI integration for instant lesson plans, Supabase for real-time syncing, and complete PWA support.
- *True Offline-First*: Read modules, answer quizzes, and manage classes even without an internet connection. Data syncs automatically once online.
- *Modern Architecture*: Built with React 19, Vite, Tailwind CSS 4, and the latest web standards.

---

## Platforms Supported

### Web Browser (Primary Platform)
- *Target*: Modern web browsers (Chrome, Edge, Firefox, Safari)
- *Features*: Full feature set including AI tools, real-time chat, and class management.
- *UI*: Clean, modern design with Filipino-inspired aesthetic and Dark/Light mode support.

### Desktop & Mobile (PWA)
- *Target*: Installable Progressive Web App
- *Features*: Offline access to downloaded modules and assignments.
- *Experience*: Native-app-like feel on both Android/iOS home screens and Desktop operating systems.

---

## Core Features

### Smart Class Management
- *Multi-Section Support*: Easily manage large classes with multiple sections under a single subject.
- *Automated Grading*: AI-assisted checking for short answer and essay questions.
- *Class Archiving*: Keep your dashboard clean by archiving old classes without losing data.
- *Stream & Announcements*: Real-time announcements with file attachments.

### AI Integration (Gemini)
- *Lesson Plan Generator*: Teachers can generate complete, exportable (PDF) lesson plans instantly by just providing a topic and grade level.
- *Guro Bot*: An AI tutor available 24/7 to help students understand complex topics.
- *Smart Quiz Creation*: Quickly generate interactive quizzes, true/false questions, and identification tests.

### Offline & Sync Capabilities
- *Dexie.js Local Database*: All essential data is cached locally for immediate access.
- *Background Sync*: Actions taken offline are queued and seamlessly synced to Supabase when connectivity returns.
- *Offline Indicator*: Visual cues let users know when they are working offline or syncing.

### Student Experience
- *Gamification*: Students earn XP for completing tasks, unlocking new titles and badges.
- *Clear Dashboards*: Simple view of pending tasks, active classes, and recent grades.
- *Real-Time Chat*: Direct messaging with teachers and classmates.

---

## Technical Architecture

### Tech Stack Structure
```text
Silid/
├── public/              # Static assets and PWA icons
├── src/
│   ├── assets/          # Global styles and images
│   ├── components/      # Reusable UI components and layouts
│   ├── hooks/           # Custom React hooks (e.g., useSync)
│   ├── lib/             # Core services (Supabase, Dexie, Gemini, i18n)
│   ├── pages/           # Application views (Dashboard, Classroom, etc.)
│   └── store/           # Zustand state management
└── database/            # Supabase SQL schema and RLS policies
```

### Technology Stack

#### Core Technologies
- *React*: 19.2.5
- *TypeScript*: Strict type checking
- *Vite*: Extremely fast build tool and dev server
- *Tailwind CSS*: 4.2.4 for utility-first styling

#### State & Data
- *Zustand*: Lightweight global state management
- *Supabase Client*: Authentication and Postgres database interaction
- *Dexie.js*: IndexedDB wrapper for offline storage
- *React Router*: v7 for client-side routing

#### Integrations
- *Google Generative AI*: Gemini API for lesson plans and auto-checking
- *jsPDF*: Client-side PDF generation for lesson plans
- *Lucide React*: Beautiful, consistent iconography

---

## Installation & Setup

### Prerequisites
- *Node.js*: Version 18 or higher
- *npm*: Version 9 or higher
- *Git*: For cloning the repository

### Clone the Repository
```bash
git clone https://github.com/owendenied/Silid.git
cd Silid
```

### Setup Environment Variables

Create a `.env` file in the root directory:
```env
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
VITE_GEMINI_API_KEY=your_gemini_api_key_here

GOOGLE_CLIENT_ID=your_google_oauth_client_id_here
GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret_here
OAUTH_SERVER_URL=http://localhost:3000
```

### Supabase Setup (Backend)

1. Create a new project on [Supabase](https://supabase.com/).
2. Run the SQL scripts found in the `database/` directory in your Supabase SQL Editor to set up the tables, schema, and Row Level Security (RLS) policies.
3. Enable Google Auth provider in Supabase Authentication settings.

---

## Running the App

### Development Mode

```bash
# Install dependencies
npm install

# Start the Vite development server
npm run dev
```

### Production Build

```bash
# Build the application and generate PWA service workers
npm run build

# Preview the production build locally
npm run preview
```

---

## Screenshots

*(Coming Soon)*

| Landing Page | Dashboard | AI Lesson Plan |
|-------------|--------------|-----------------|
| Placeholder | Placeholder | Placeholder |

---

## Feature Comparison

| Feature | Teacher | Student |
|---------|---------|---------|
| Create Classes | Yes | No |
| Join Classes | No | Yes |
| Create Assignments | Yes | No |
| Submit Assignments | No | Yes |
| Auto-Grade / Manual Grade| Yes | No |
| AI Lesson Plans | Yes | No |
| Gamification (XP) | No | Yes |
| Offline Mode | Yes | Yes |
| Real-Time Chat | Yes | Yes |

---

## Why This Project Stands Out

### 1. *Production-Ready Quality*
- Complete authentication flow with role-based access control.
- Robust database schema with Row Level Security (RLS).
- Comprehensive error handling and offline fallback mechanisms.

### 2. *True Offline-First Experience*
- Not just caching static assets—users can interact with the app, complete assignments, and browse modules without an internet connection using IndexedDB and Service Workers.

### 3. *Meaningful AI Integration*
- Uses generative AI not as a gimmick, but to solve real teacher pain points: generating lesson plans instantly and providing auto-checking for qualitative answers.

### 4. *Localized Context*
- Designed specifically for environments where internet access is unstable, making e-learning accessible to more students.
- Bilingual support (English & Tagalog) built-in.

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Acknowledgments

- *React & Vite*: For the incredible developer experience.
- *Supabase*: For the seamless BaaS platform.
- *Google*: For the Gemini AI API.
- *Tailwind CSS*: For rapid UI development.
