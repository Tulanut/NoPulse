# NoPulse - Full-Stack Offline-First Gym Tracker

A production-grade, offline-first Gym Tracker web application designed with modern, high-demand web technologies (React 18, TypeScript, Tailwind CSS, Vite, Node.js/Express, IndexedDB, and SQLite).

---

## 🏗️ Architecture & Industry Relevance

This project demonstrates core architectural patterns requested across modern tech companies in Southeast Asia (Malaysia) and globally:

1. **Offline-First Resilience**: Workouts can be logged seamlessly with zero latency in underground gyms, basements, or areas without cellular service. Logs are saved to **IndexedDB** in the browser.
2. **Automatic Data Synchronization**: When network connectivity is established, background sync reconciles local logs with the **Node.js Express + SQLite** backend database using timestamp conflict resolution (Last Write Wins).
3. **Interactive Gym UX**: Clean dark theme with rapid RIR (Reps in Reserve) selectors, exercise suggestions, set counters, and workout volume metrics.
4. **End-to-End TypeScript**: Type safety across both client and server data models.

---

##  Quick Start

### 1. Prerequisites
- **Node.js**: v18+ (tested on v22)
- **npm**: v9+

### 2. Running the Application

You can run both the server and client concurrently or in separate terminals:

#### Terminal 1: Backend API (Port 5000)
```powershell
cd server
npm run dev
```

#### Terminal 2: Frontend Client (Port 5173)
```powershell
cd client
npm run dev
```

Open your browser at: **`http://localhost:5173`**

---

##  Testing & Verification

### Run Backend Integration Tests:
```powershell
cd server
npm test
```

### Build Client for Production:
```powershell
cd client
npm run build
```

---

##  Features Included

- **Exercise Logging**:
  - Exercise Name (with quick-select tags: Bench Press, Squat, Deadlift, etc.)
  - Number of Sets
  - Number of Reps per set
  - Reps in Reserve (RIR) with interactive visual picker & description (0 = Failure, 1 = 1 in tank, 2 = 2 in tank, etc.)
  - Workout Date picker (defaults to today)
  - Optional Weight / Notes
- **Real-Time Network & Sync Status**:
  - 🟢 **Online & DB Connected**: Workouts synced to remote database.
  - 🟡 **Offline (Local IndexedDB Active)**: Workouts saved on local device with pending sync tag.
  - 🔵 **Syncing**: Real-time batch sync indicator.
  - **"Simulate Offline" Toggle**: Test offline logging with one click directly in the UI!
- **Workout Dashboard**:
  - Total Exercises Logged, Total Sets, Total Reps, Average RIR, Today's Session metrics.
  - Search & filter by exercise name or date.
