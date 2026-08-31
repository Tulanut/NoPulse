import React, { useState, useMemo } from 'react';
import { Header, ScreenState, NavPosition } from './components/Header';
import { LandingScreen } from './components/LandingScreen';
import { ExerciseHub } from './components/ExerciseHub';
import { ExerciseDetailView } from './components/ExerciseDetailView';
import { WorkoutForm } from './components/WorkoutForm';
import { UserProfileView } from './components/UserProfileView';
import { useWorkouts } from './hooks/useWorkouts';
import { useFullscreen } from './hooks/useFullscreen';
import { ShieldCheck, HardDrive, Check } from 'lucide-react';

interface ActiveToast {
  exerciseName: string;
  profile?: string | null;
}

export const App: React.FC = () => {
  const {
    allWorkouts,
    profiles,
    createProfile,
    deleteProfile,
    deleteExercise,
    bulkUpdateExerciseProfile,
    bulkDeleteExercises,
    syncState,
    lastSyncedAt,
    pendingSyncCount,
    network,
    addWorkout,
    deleteWorkout,
    manualSync,
  } = useWorkouts();

  const { isFullscreen, toggleFullscreen } = useFullscreen();

  const [currentScreen, setCurrentScreen] = useState<ScreenState>('landing');
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);

  // Global Viewport-Locked Toast Notification (Screen-Positioned, Zero Blur)
  const [activeToast, setActiveToast] = useState<ActiveToast | null>(null);

  const handleWorkoutLogged = (exerciseName: string, profile?: string | null) => {
    setActiveToast({ exerciseName, profile });
    setTimeout(() => {
      setActiveToast(null);
    }, 2200);
  };

  // Nav Position: 'top' | 'side' (Stored locally)
  const [navPosition, setNavPosition] = useState<NavPosition>(() => {
    return (localStorage.getItem('nopulse_nav_position') as NavPosition) || 'top';
  });

  const toggleNavPosition = () => {
    setNavPosition((prev) => {
      const next = prev === 'top' ? 'side' : 'top';
      localStorage.setItem('nopulse_nav_position', next);
      return next;
    });
  };

  // Calculate unique exercise count (only from actual user logs)
  const uniqueExerciseCount = useMemo(() => {
    const set = new Set(allWorkouts.map((w) => w.exercise_name.trim().toLowerCase()));
    return set.size;
  }, [allWorkouts]);

  const handleSelectExercise = (exerciseName: string) => {
    setSelectedExercise(exerciseName);
    setCurrentScreen('exercise-detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToExercises = () => {
    setSelectedExercise(null);
    setCurrentScreen('exercises');
  };

  const handleGoHome = () => {
    setSelectedExercise(null);
    setCurrentScreen('landing');
  };

  return (
    <div className="min-h-screen bg-[#191816] text-[#F5F2EB] flex flex-col font-sans selection:bg-[#CC6543] selection:text-white relative">
      {/* =========================================================================
          GLOBAL VIEWPORT-LOCKED TOAST (Screen Center on Mobile / Top-Right on Laptop)
          Zero screen blur, 100% visible regardless of page scroll position
         ========================================================================= */}
      {activeToast && (
        <div className="fixed inset-0 pointer-events-none z-[99999] flex items-center justify-center sm:items-start sm:justify-end p-4 sm:p-6">
          {/* 1. Mobile Phone View: Exact Center of the Screen Viewport */}
          <div className="sm:hidden flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-[#1C1A17]/95 border border-[#789D74]/50 text-[#F5F2EB] shadow-2xl shadow-black/90 backdrop-blur-xl animate-pop-in">
            <span className="w-6 h-6 rounded-full bg-[#789D74]/20 text-[#789D74] flex items-center justify-center shrink-0">
              <Check className="w-3.5 h-3.5 stroke-[3]" />
            </span>
            <div className="text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap">
              <span className="font-bold text-white">{activeToast.exerciseName}</span>
              <span className="text-[#A8A297]">logged</span>
              {activeToast.profile && (
                <span className="text-[#CC6543] font-bold">· {activeToast.profile}</span>
              )}
            </div>
          </div>

          {/* 2. Laptop / Desktop View: Clean Top-Right Screen Corner Notification */}
          <div className="hidden sm:flex items-center gap-3 px-5 py-3 rounded-2xl bg-[#1C1A17]/95 border border-[#789D74]/50 text-[#F5F2EB] shadow-2xl shadow-black/80 backdrop-blur-xl animate-slide-up">
            <span className="w-6 h-6 rounded-full bg-[#789D74]/20 text-[#789D74] flex items-center justify-center shrink-0">
              <Check className="w-3.5 h-3.5 stroke-[3]" />
            </span>
            <div className="text-xs font-medium flex items-center gap-1.5 whitespace-nowrap">
              <span className="font-bold text-white">{activeToast.exerciseName}</span>
              <span className="text-[#A8A297]">logged successfully</span>
              {activeToast.profile && (
                <span className="text-[#CC6543] font-semibold">· {activeToast.profile}</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Navigation Header / Sidebar - Auto-hides, shown inside app sections */}
      {currentScreen !== 'landing' && (
        <Header
          currentScreen={currentScreen}
          onNavigate={(screen) => {
            if (screen !== 'exercise-detail') {
              setSelectedExercise(null);
            }
            setCurrentScreen(screen);
          }}
          navPosition={navPosition}
          onToggleNavPosition={toggleNavPosition}
          isOnline={network.isOnline}
          simulatedOffline={network.simulatedOffline}
          toggleSimulateOffline={network.toggleSimulateOffline}
          syncState={syncState}
          pendingSyncCount={pendingSyncCount}
          lastSyncedAt={lastSyncedAt}
          onManualSync={manualSync}
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggleFullscreen}
        />
      )}

      {/* Main Screen Content with Dynamic Top/Side Clearance */}
      <main
        className={`flex-1 w-full max-w-5xl mx-auto px-4 transition-all duration-300 ${
          currentScreen === 'landing'
            ? 'flex flex-col justify-center py-6'
            : navPosition === 'side'
            ? 'sm:pl-28 pt-8 pb-16'
            : 'pt-20 sm:pt-24 pb-16'
        }`}
      >
        {/* Offline Banner if Offline */}
        {!network.isOnline && currentScreen !== 'landing' && (
          <div className="mb-6 p-3.5 rounded-xl bg-gradient-to-r from-[#E08E45]/15 to-claude-surface border border-[#E08E45]/40 text-[#F0BD85] flex items-center gap-3 text-xs animate-slide-up">
            <HardDrive className="w-4 h-4 text-[#E08E45] shrink-0" />
            <span>
              <strong>Offline Mode:</strong> Workouts save locally in IndexedDB and sync
              automatically once reconnected.
            </span>
          </div>
        )}

        <div key={currentScreen + (selectedExercise || '')} className="animate-slide-up">
          {/* 1. Minimalist Frontpage Landing Screen */}
          {currentScreen === 'landing' && (
            <LandingScreen
              exerciseCount={uniqueExerciseCount}
              isFullscreen={isFullscreen}
              onToggleFullscreen={toggleFullscreen}
              onGoToLog={() => setCurrentScreen('log')}
              onGoToExercises={() => setCurrentScreen('exercises')}
            />
          )}

          {/* 2. Dedicated Log Exercise Screen */}
          {currentScreen === 'log' && (
            <WorkoutForm
              profiles={profiles}
              onCreateProfile={createProfile}
              onAddWorkout={addWorkout}
              onWorkoutLogged={handleWorkoutLogged}
              onBack={handleGoHome}
              onSuccessNavigate={(name) => handleSelectExercise(name)}
            />
          )}

          {/* 3. General Exercises & History Screen */}
          {currentScreen === 'exercises' && (
            <ExerciseHub
              workouts={allWorkouts}
              profiles={profiles}
              onCreateProfile={createProfile}
              onDeleteProfile={deleteProfile}
              onDeleteExercise={deleteExercise}
              onBulkUpdateExerciseProfile={bulkUpdateExerciseProfile}
              onBulkDeleteExercises={bulkDeleteExercises}
              onSelectExercise={handleSelectExercise}
              onGoToLog={() => setCurrentScreen('log')}
              onGoHome={handleGoHome}
            />
          )}

          {/* 4. Dedicated Exercise Deep-Dive Screen */}
          {currentScreen === 'exercise-detail' && selectedExercise && (
            <ExerciseDetailView
              exerciseName={selectedExercise}
              allWorkouts={allWorkouts}
              profiles={profiles}
              onCreateProfile={createProfile}
              onBack={handleBackToExercises}
              onAddWorkout={addWorkout}
              onWorkoutLogged={handleWorkoutLogged}
              onDeleteWorkout={deleteWorkout}
            />
          )}

          {/* 5. User Profile, Activity & Settings Screen */}
          {currentScreen === 'profile' && (
            <UserProfileView
              workouts={allWorkouts}
              navPosition={navPosition}
              onToggleNavPosition={toggleNavPosition}
              onBackToHome={handleGoHome}
            />
          )}
        </div>
      </main>

      {/* Minimal Footer */}
      {currentScreen !== 'landing' && (
        <footer
          className={`border-t border-claude-border bg-[#191816] py-4 px-4 text-center text-xs text-claude-textDim animate-fade-in transition-all duration-300 ${
            navPosition === 'side' ? 'sm:pl-28' : ''
          }`}
        >
          <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
            <span className="font-serif">
              NoPulse &copy; {new Date().getFullYear()} — Minimalist Gym Tracker
            </span>
            <div className="flex items-center gap-1.5 text-claude-textMuted font-sans text-[11px]">
              <ShieldCheck className="w-3.5 h-3.5 text-[#789D74]" />
              <span>IndexedDB & SQLite Sync</span>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
};

export default App;
