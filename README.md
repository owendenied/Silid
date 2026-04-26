<div align="center">
  <img src="public/logo.png" alt="Silid Logo" width="120" height="120">
  
  # Silid - The Smart Learning Management System
  
  > *Empowering Teachers, Engaging Students.*  
  > A digital space where education is an opportunity, built to address the infrastructure and teaching crisis.
</div>

[![React](https://img.shields.io/badge/React-19.0.0-blue.svg)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-8.0.0-purple.svg)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.0.0-38B2AC.svg)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Backend-3ECF8E.svg)](https://supabase.com/)
[![Gemini AI](https://img.shields.io/badge/Google_Gemini-AI-orange.svg)](https://ai.google.dev/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## 🎥 Demo Video

Watch Silid in action: [**View Demo Video**](#) *(Coming Soon)*

---

## About Silid & The Infrastructure Crisis

The Philippines is currently facing a severe infrastructure crisis, missing over 165,000 classrooms. This shortage forces over 2,200 schools to run multiple shifts, meaning millions of students have very little time to actually study in a classroom. At our current budget, it will take 20 years to build enough rooms for everyone. Our students simply cannot wait two decades for a place to learn.

**The Teacher and Tech Gap**
The problem isn't just the buildings; it is also the people and the tools. We are currently missing between 30,000 and 65,000 teachers nationwide. The teachers we do have are exhausted because they must manage overcrowded rooms while spending hours manually planning lessons and grading papers. 

While we hope digital tools can help, current platforms are often too complex for busy teachers or too boring for students. Learning becomes a chore rather than an opportunity, and without the right support, a student's progress stops the moment they leave the school gates.

**The Solution**
We built **Silid** to be a smarter, more efficient digital classroom. It is designed to take the weight off teachers’ shoulders and put the joy back into learning for students.

---

## Core Features

### Easy Access via Teacher Codes
Students join their specific classes instantly by entering a simple code from their teacher. No complicated registration—just immediate access to their lessons.

### Guro Bot (AI for Teachers)
To solve the teacher shortage and burnout, we created Guro Bot. It uses AI to auto-generate lesson plans and act as a smart assistant, giving teachers hours of their time back so they can focus on mentoring students.

### Guro Bot (AI for Students)
For students, Guro Bot is a 24/7 tutor. It answers questions about lessons instantly, ensuring that learning doesn't stop even when the teacher is busy with other students.

### Gamified Experience
We believe learning should feel like an achievement. Silid uses XP, badges, and progress bars to motivate students. By turning lessons into a rewarding journey, we keep students engaged and excited to finish their modules.

---

## Technical Architecture

Silid is built with high-performance tools to ensure it is reliable and easy to use.

- **React**: We used React for the frontend to create a fast, responsive, and intuitive user interface that works smoothly on any device.
- **Supabase**: Our backend is powered by Supabase, providing us with a robust real-time database and secure authentication to handle student data and class progress efficiently.
- **Gemini AI**: Guro Bot is integrated with Google’s Gemini, allowing us to provide high-level intelligence for automated lesson planning and interactive student tutoring.

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
# Build the application
npm run build

# Preview the production build locally
npm run preview
```

---

## Screenshots

*(Coming Soon)*

| Landing Page | Dashboard | Guro Bot (AI) |
|-------------|--------------|-----------------|
| Placeholder | Placeholder | Placeholder |

---

## Feature Comparison

| Feature | Teacher | Student |
|---------|---------|---------|
| Create Classes | Yes | No |
| Join via Code | No | Yes |
| Create Assignments | Yes | No |
| Submit Assignments | No | Yes |
| AI Lesson Planning | Yes | No |
| 24/7 AI Tutor | No | Yes |
| Gamification (XP & Badges)| No | Yes |
| Real-Time Chat | Yes | Yes |

---

## The Real-World Impact

> "We cannot wait 20 years for every school to have a new building. We need to support our teachers and engage our students now. By combining Google's Gemini AI with an engaging, gamified experience, Silid provides a digital space where education is an opportunity. Our mission is simple: to make sure that for every student, the 'cost of dreaming' is never too high."

**Team Silid**

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Acknowledgments

- *React & Vite*: For the incredible developer experience.
- *Supabase*: For the seamless BaaS platform.
- *Google*: For the Gemini AI API.
- *Tailwind CSS*: For rapid UI development.
