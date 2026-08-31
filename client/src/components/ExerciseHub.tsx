import React, { useState, useMemo } from 'react';
import { ArrowRight, Plus, Search, X, Tag } from 'lucide-react';
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
  onCreateProfile,
  onSelectExercise,
  onGoToLog,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProfile, setSelectedProfile] = useState<string>('all');
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');

  // Filter workouts by active profile tab (if not 'all')
  const profileFilteredWorkouts = useMemo(() => {
    if (selectedProfile === 'all') return workouts;
    return workouts.filter((w) => w.profile === selectedProfile);
  }, [workouts, selectedProfile]);

  // Group ONLY exercises that match the profile filter
  const exerciseSummaries = useMemo(() => {
    const map = new Map<string, Workout[]>();

    for (const w of profileFilteredWorkouts) {
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

      // Collect unique profiles associated with this exercise
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
  }, [profileFilteredWorkouts]);

  const filteredSummaries = useMemo(() => {
    if (!searchQuery.trim()) return exerciseSummaries;
    return exerciseSummaries.filter((e) =>
      e.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [exerciseSummaries, searchQuery]);

  const handleCreateProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProfileName.trim()) return;

    const created = await onCreateProfile(newProfileName.trim());
    setSelectedProfile(created);
    setNewProfileName('');
    setIsCreatingProfile(false);
  };

  return (
    <div className="min-h-[85vh] flex flex-col justify-center max-w-3xl mx-auto px-4 py-8 select-none animate-slide-up font-sans">
      {/* Header & Search */}
      <div className="mb-6 pb-6 border-b border-[#383530]/50 flex flex-col sm:flex-row sm:items-baseline justify-between gap-4">
        <div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-[#F5F2EB] leading-tight">
            Exercises
          </h1>
          <p className="text-xs text-[#A8A297] mt-2">
            {exerciseSummaries.length === 0
              ? 'No exercises in this view'
              : `${exerciseSummaries.length} ${
                  exerciseSummaries.length === 1 ? 'exercise' : 'exercises'
                } recorded`}
          </p>
        </div>

        {/* Minimal Search Line */}
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
      </div>

      {/* Workout Profiles Tabs (Clean, only present if profiles exist or user wants to add one) */}
      <div className="mb-8 flex flex-wrap items-center gap-2">
        {/* All Tab */}
        <button
          onClick={() => setSelectedProfile('all')}
          className={`px-3.5 py-1.5 rounded-full text-xs transition-all duration-200 ${
            selectedProfile === 'all'
              ? 'bg-[#CC6543] text-white font-bold shadow-sm'
              : 'bg-[#252320] border border-[#383530] text-[#A8A297] hover:text-[#F5F2EB]'
          }`}
        >
          All
        </button>

        {/* User-created profiles */}
        {profiles.map((p) => (
          <button
            key={p}
            onClick={() => setSelectedProfile(p)}
            className={`px-3.5 py-1.5 rounded-full text-xs transition-all duration-200 ${
              selectedProfile === p
                ? 'bg-[#CC6543] text-white font-bold shadow-sm'
                : 'bg-[#252320] border border-[#383530] text-[#A8A297] hover:text-[#F5F2EB]'
            }`}
          >
            {p}
          </button>
        ))}

        {/* Create Profile Button / Inline Form */}
        {!isCreatingProfile ? (
          <button
            onClick={() => setIsCreatingProfile(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs bg-[#252320]/60 border border-dashed border-[#4D4740] text-[#A8A297] hover:text-[#F5F2EB] hover:border-[#CC6543] transition-all"
            title="Create a new workout profile (e.g. Armwrestling, Rehab, Gym)"
          >
            <Plus className="w-3 h-3 text-[#CC6543]" />
            <span>New Profile</span>
          </button>
        ) : (
          <form
            onSubmit={handleCreateProfileSubmit}
            className="inline-flex items-center gap-1.5 bg-[#252320] border border-[#CC6543] rounded-full px-3 py-1 animate-pop-in"
          >
            <Tag className="w-3 h-3 text-[#CC6543]" />
            <input
              type="text"
              placeholder="Profile name (e.g. Rehab)..."
              value={newProfileName}
              onChange={(e) => setNewProfileName(e.target.value)}
              autoFocus
              className="bg-transparent text-xs text-[#F5F2EB] placeholder-[#524E48] focus:outline-none w-44"
            />
            <button
              type="submit"
              className="text-[10px] uppercase font-bold text-[#CC6543] hover:text-[#DE7C5A] px-1"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => {
                setIsCreatingProfile(false);
                setNewProfileName('');
              }}
              className="text-[#706B62] hover:text-[#F5F2EB]"
            >
              <X className="w-3 h-3" />
            </button>
          </form>
        )}
      </div>

      {/* Empty State */}
      {exerciseSummaries.length === 0 ? (
        <div className="py-16 text-center animate-pop-in">
          <p className="text-base sm:text-lg text-[#C8C2B7] italic mb-6">
            {selectedProfile !== 'all'
              ? `No exercises logged under "${selectedProfile}" yet.`
              : '"Every journey begins with a single recorded rep."'}
          </p>
          <button
            onClick={onGoToLog}
            className="group inline-flex items-center gap-2 px-7 py-3 rounded-full bg-[#CC6543] hover:bg-[#DE7C5A] text-white text-xs sm:text-sm font-semibold tracking-widest uppercase shadow-lg shadow-[#CC6543]/20 hover:-translate-y-0.5 active:scale-95 transition-all duration-200"
          >
            <Plus className="w-4 h-4 stroke-[2.5] transition-transform duration-200 group-hover:rotate-90" />
            <span>Log First Exercise</span>
          </button>
        </div>
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
                <div className="flex items-center gap-2.5">
                  {/* Bold Headline */}
                  <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#F5F2EB] group-hover:text-claude-terracottaLight transition-colors">
                    {item.name}
                  </h3>

                  {/* Profile Tags (if assigned) */}
                  {item.profiles.length > 0 && selectedProfile === 'all' && (
                    <div className="flex flex-wrap gap-1">
                      {item.profiles.map((pr) => (
                        <span
                          key={pr}
                          className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#252320] border border-[#383530] text-[#CC6543]"
                        >
                          {pr}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Clean Stats Row with d Month yyyy */}
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

              {/* Arrow Indicator */}
              <div className="w-10 h-10 rounded-full border border-[#383530] group-hover:border-[#CC6543] group-hover:bg-[#CC6543]/10 flex items-center justify-center text-[#A8A297] group-hover:text-[#DE7C5A] transition-all duration-200 shrink-0">
                <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
