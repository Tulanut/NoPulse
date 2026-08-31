import React, { useState, useMemo } from 'react';
import { ArrowRight, Plus, Search, Folder, ArrowLeft } from 'lucide-react';
import { Workout } from '../types/workout';
import { formatSpelledDate } from '../utils/dateUtils';

interface ExerciseHubProps {
  workouts: Workout[];
  profiles: string[];
  onCreateProfile: (name: string) => Promise<string>;
  onSelectExercise: (exerciseName: string) => void;
  onGoToLog: () => void;
  onGoHome: () => void;
}

interface ExerciseSummary {
  name: string;
  totalLogs: number;
  totalSets: number;
  totalReps: number;
  maxWeight: number;
  avgRir: number;
  lastTrainedDate: string | null;
  latestRir: number | null;
  profiles: string[];
}

export const ExerciseHub: React.FC<ExerciseHubProps> = ({
  workouts,
  profiles,
  onSelectExercise,
  onGoToLog,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeProfile, setActiveProfile] = useState<string | null>(null);

  // Group workouts by exercise name helper
  const groupExercises = (workoutList: Workout[]): ExerciseSummary[] => {
    const map = new Map<string, Workout[]>();

    for (const w of workoutList) {
      const key = w.exercise_name.trim();
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(w);
    }

    const summaries: ExerciseSummary[] = [];

    map.forEach((items, name) => {
      const totalLogs = items.length;
      const totalSets = items.reduce((sum, i) => sum + i.sets, 0);
      const totalReps = items.reduce((sum, i) => sum + i.sets * i.reps, 0);
      const maxWeight = items.reduce((max, i) => Math.max(max, i.weight || 0), 0);
      const avgRir = totalLogs > 0 ? items.reduce((sum, i) => sum + i.rir, 0) / totalLogs : 0;

      const sorted = [...items].sort(
        (a, b) =>
          new Date(b.created_at || b.date).getTime() -
          new Date(a.created_at || a.date).getTime()
      );
      const lastTrainedDate = sorted[0]?.date || null;
      const latestRir = sorted[0]?.rir ?? null;

      const exProfiles = Array.from(
        new Set(items.map((i) => i.profile).filter((p): p is string => Boolean(p)))
      );

      summaries.push({
        name,
        totalLogs,
        totalSets,
        totalReps,
        maxWeight,
        avgRir: Math.round(avgRir * 10) / 10,
        lastTrainedDate,
        latestRir,
        profiles: exProfiles,
      });
    });

    return summaries.sort((a, b) => b.totalLogs - a.totalLogs);
  };

  // Profiles that actually contain workouts or were created
  const profileCards = useMemo(() => {
    const profileMap = new Map<string, { count: number; exerciseSet: Set<string> }>();

    // Register all known profiles
    profiles.forEach((p) => {
      if (!profileMap.has(p)) {
        profileMap.set(p, { count: 0, exerciseSet: new Set() });
      }
    });

    // Count workouts and unique exercises per profile
    workouts.forEach((w) => {
      if (w.profile) {
        if (!profileMap.has(w.profile)) {
          profileMap.set(w.profile, { count: 0, exerciseSet: new Set() });
        }
        const data = profileMap.get(w.profile)!;
        data.count++;
        data.exerciseSet.add(w.exercise_name.trim().toLowerCase());
      }
    });

    return Array.from(profileMap.entries()).map(([name, data]) => ({
      name,
      totalLogs: data.count,
      uniqueExercises: data.exerciseSet.size,
    }));
  }, [profiles, workouts]);

  // Uncategorized / direct exercises (without a profile)
  const uncategorizedWorkouts = useMemo(() => {
    return workouts.filter((w) => !w.profile);
  }, [workouts]);

  // If inside an active profile drilldown, get its workouts
  const activeProfileWorkouts = useMemo(() => {
    if (!activeProfile) return [];
    return workouts.filter((w) => w.profile === activeProfile);
  }, [workouts, activeProfile]);

  // Summaries for current view
  const currentSummaries = useMemo(() => {
    if (activeProfile) {
      return groupExercises(activeProfileWorkouts);
    }
    // On the main page, show direct/uncategorized exercises (or all if no profiles exist)
    const list = profileCards.length > 0 ? uncategorizedWorkouts : workouts;
    return groupExercises(list);
  }, [activeProfile, activeProfileWorkouts, profileCards.length, uncategorizedWorkouts, workouts]);

  const filteredSummaries = useMemo(() => {
    if (!searchQuery.trim()) return currentSummaries;
    return currentSummaries.filter((e) =>
      e.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [currentSummaries, searchQuery]);

  // -------------------------------------------------------------
  // VIEW 1: DRILLDOWN INTO A SPECIFIC WORKOUT PROFILE
  // -------------------------------------------------------------
  if (activeProfile) {
    return (
      <div className="min-h-[85vh] flex flex-col justify-center max-w-3xl mx-auto px-4 py-8 select-none animate-slide-up font-sans">
        {/* Back Button */}
        <button
          onClick={() => setActiveProfile(null)}
          className="group inline-flex items-center gap-2 text-xs uppercase tracking-widest text-[#A8A297] hover:text-[#F5F2EB] active:scale-95 transition-all mb-4 font-medium"
        >
          <ArrowLeft className="w-4 h-4 transition-transform duration-200 group-hover:-translate-x-1" />
          <span>Back to Exercises</span>
        </button>

        {/* Profile Header */}
        <div className="mb-10 pb-6 border-b border-[#383530]/50 flex flex-col sm:flex-row sm:items-baseline justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#CC6543]/15 text-[#CC6543] flex items-center justify-center">
                <Folder className="w-5 h-5" />
              </div>
              <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-[#F5F2EB]">
                {activeProfile}
              </h1>
            </div>
            <p className="text-xs text-[#A8A297] mt-2">
              {filteredSummaries.length === 0
                ? 'No exercises recorded in this profile'
                : `${filteredSummaries.length} ${
                    filteredSummaries.length === 1 ? 'exercise' : 'exercises'
                  } in ${activeProfile}`}
            </p>
          </div>

          {/* Search inside profile */}
          {currentSummaries.length > 0 && (
            <div className="relative w-full sm:w-56">
              <Search className="w-3.5 h-3.5 absolute left-0 top-1/2 -translate-y-1/2 text-[#706B62]" />
              <input
                type="text"
                placeholder={`Search in ${activeProfile}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent border-b border-[#383530] focus:border-[#CC6543] pl-6 pr-2 py-1.5 text-sm text-[#F5F2EB] placeholder-[#524E48] focus:outline-none transition-colors"
              />
            </div>
          )}
        </div>

        {/* Exercises List inside Profile */}
        {filteredSummaries.length === 0 ? (
          <div className="py-16 text-center animate-pop-in">
            <p className="text-base text-[#C8C2B7] italic mb-6">
              No exercises logged under "{activeProfile}" yet.
            </p>
            <button
              onClick={onGoToLog}
              className="group inline-flex items-center gap-2 px-7 py-3 rounded-full bg-[#CC6543] hover:bg-[#DE7C5A] text-white text-xs sm:text-sm font-semibold tracking-widest uppercase shadow-lg shadow-[#CC6543]/20 hover:-translate-y-0.5 active:scale-95 transition-all duration-200"
            >
              <Plus className="w-4 h-4 stroke-[2.5] transition-transform duration-200 group-hover:rotate-90" />
              <span>Log Exercise to {activeProfile}</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-[#2E2B26]">
            {filteredSummaries.map((item) => (
              <button
                key={item.name}
                onClick={() => onSelectExercise(item.name)}
                className="group w-full py-6 text-left flex items-center justify-between gap-4 hover:translate-x-1 active:scale-[0.99] transition-all duration-200"
              >
                <div className="space-y-1.5 flex-1">
                  <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#F5F2EB] group-hover:text-claude-terracottaLight transition-colors">
                    {item.name}
                  </h3>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#A8A297]">
                    <span>
                      {item.totalLogs} {item.totalLogs === 1 ? 'session' : 'sessions'}
                    </span>
                    <span className="text-[#4D4740]">·</span>
                    <span>{item.totalSets} sets</span>
                    <span className="text-[#4D4740]">·</span>
                    <span>{item.totalReps} reps</span>
                    {item.maxWeight > 0 && (
                      <>
                        <span className="text-[#4D4740]">·</span>
                        <span className="text-[#DE7C5A] font-bold">{item.maxWeight} kg</span>
                      </>
                    )}
                    {item.lastTrainedDate && (
                      <>
                        <span className="text-[#4D4740]">·</span>
                        <span className="text-[#8A8477]">
                          {formatSpelledDate(item.lastTrainedDate)}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="w-10 h-10 rounded-full border border-[#383530] group-hover:border-[#CC6543] group-hover:bg-[#CC6543]/10 flex items-center justify-center text-[#A8A297] group-hover:text-[#DE7C5A] transition-all duration-200 shrink-0">
                  <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // -------------------------------------------------------------
  // VIEW 2: GENERAL EXERCISES HUB
  // (Shows Profile Boxes if profiles exist + usual exercises list)
  // -------------------------------------------------------------
  return (
    <div className="min-h-[85vh] flex flex-col justify-center max-w-3xl mx-auto px-4 py-8 select-none animate-slide-up font-sans space-y-10">
      {/* Header & Search */}
      <div className="pb-6 border-b border-[#383530]/50 flex flex-col sm:flex-row sm:items-baseline justify-between gap-4">
        <div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-[#F5F2EB] leading-tight">
            Exercises
          </h1>
          <p className="text-xs text-[#A8A297] mt-2">
            {workouts.length === 0
              ? 'No exercises recorded yet'
              : `${workouts.length} total entries recorded`}
          </p>
        </div>

        {/* Search Line */}
        {workouts.length > 0 && (
          <div className="relative w-full sm:w-56">
            <Search className="w-3.5 h-3.5 absolute left-0 top-1/2 -translate-y-1/2 text-[#706B62]" />
            <input
              type="text"
              placeholder="Search exercise..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent border-b border-[#383530] focus:border-[#CC6543] pl-6 pr-2 py-1.5 text-sm text-[#F5F2EB] placeholder-[#524E48] focus:outline-none transition-colors"
            />
          </div>
        )}
      </div>

      {/* SECTION 1: WORKOUT PROFILE BOXES (Only shown if user has created profiles) */}
      {profileCards.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-widest text-[#A8A297] font-semibold">
              Workout Profiles
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {profileCards.map((p) => (
              <button
                key={p.name}
                onClick={() => {
                  setActiveProfile(p.name);
                  setSearchQuery('');
                }}
                className="group text-left p-5 rounded-2xl bg-[#252320]/80 border border-[#383530] hover:border-[#CC6543] hover:bg-[#252320] transition-all flex items-center justify-between gap-4 active:scale-[0.99]"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-[#CC6543]/15 text-[#CC6543] group-hover:bg-[#CC6543] group-hover:text-white flex items-center justify-center transition-all">
                    <Folder className="w-5 h-5" />
                  </div>
                  <div>
                    {/* The name of profile */}
                    <h3 className="text-xl font-bold text-[#F5F2EB] group-hover:text-[#DE7C5A] transition-colors">
                      {p.name}
                    </h3>
                    <p className="text-xs text-[#A8A297] mt-0.5">
                      {p.uniqueExercises} {p.uniqueExercises === 1 ? 'exercise' : 'exercises'} · {p.totalLogs} {p.totalLogs === 1 ? 'session' : 'sessions'}
                    </p>
                  </div>
                </div>

                <div className="w-8 h-8 rounded-full border border-[#383530] group-hover:border-[#CC6543] group-hover:bg-[#CC6543]/10 flex items-center justify-center text-[#A8A297] group-hover:text-[#DE7C5A] transition-all">
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 2: EXERCISES LIST (Direct / Uncategorized or All if no profiles) */}
      <div className="space-y-4 pt-2">
        {profileCards.length > 0 && currentSummaries.length > 0 && (
          <span className="text-xs uppercase tracking-widest text-[#A8A297] font-semibold block">
            General Exercises
          </span>
        )}

        {/* Empty State */}
        {filteredSummaries.length === 0 && profileCards.length === 0 ? (
          <div className="py-16 text-center animate-pop-in">
            <p className="text-base sm:text-lg text-[#C8C2B7] italic mb-6">
              "Every journey begins with a single recorded rep."
            </p>
            <button
              onClick={onGoToLog}
              className="group inline-flex items-center gap-2 px-7 py-3 rounded-full bg-[#CC6543] hover:bg-[#DE7C5A] text-white text-xs sm:text-sm font-semibold tracking-widest uppercase shadow-lg shadow-[#CC6543]/20 hover:-translate-y-0.5 active:scale-95 transition-all duration-200"
            >
              <Plus className="w-4 h-4 stroke-[2.5] transition-transform duration-200 group-hover:rotate-90" />
              <span>Log First Exercise</span>
            </button>
          </div>
        ) : filteredSummaries.length === 0 ? (
          <p className="text-xs text-[#706B62] py-4">No standalone exercises found.</p>
        ) : (
          /* Minimalist Editorial Exercise List with d Month yyyy Spelled Date */
          <div className="divide-y divide-[#2E2B26]">
            {filteredSummaries.map((item) => (
              <button
                key={item.name}
                onClick={() => onSelectExercise(item.name)}
                className="group w-full py-6 text-left flex items-center justify-between gap-4 hover:translate-x-1 active:scale-[0.99] transition-all duration-200"
              >
                <div className="space-y-1.5 flex-1">
                  <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#F5F2EB] group-hover:text-claude-terracottaLight transition-colors">
                    {item.name}
                  </h3>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#A8A297]">
                    <span>
                      {item.totalLogs} {item.totalLogs === 1 ? 'session' : 'sessions'}
                    </span>
                    <span className="text-[#4D4740]">·</span>
                    <span>{item.totalSets} sets</span>
                    <span className="text-[#4D4740]">·</span>
                    <span>{item.totalReps} reps</span>
                    {item.maxWeight > 0 && (
                      <>
                        <span className="text-[#4D4740]">·</span>
                        <span className="text-[#DE7C5A] font-bold">{item.maxWeight} kg</span>
                      </>
                    )}
                    {item.lastTrainedDate && (
                      <>
                        <span className="text-[#4D4740]">·</span>
                        <span className="text-[#8A8477]">
                          {formatSpelledDate(item.lastTrainedDate)}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="w-10 h-10 rounded-full border border-[#383530] group-hover:border-[#CC6543] group-hover:bg-[#CC6543]/10 flex items-center justify-center text-[#A8A297] group-hover:text-[#DE7C5A] transition-all duration-200 shrink-0">
                  <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
