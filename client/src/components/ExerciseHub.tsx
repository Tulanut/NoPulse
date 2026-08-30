import React, { useState, useMemo } from 'react';
import { ArrowRight, Plus, Search } from 'lucide-react';
import { Workout } from '../types/workout';
import { formatSpelledDate } from '../utils/dateUtils';

interface ExerciseHubProps {
  workouts: Workout[];
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
}

export const ExerciseHub: React.FC<ExerciseHubProps> = ({
  workouts,
  onSelectExercise,
  onGoToLog,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Group ONLY exercises that the user has actually logged
  const exerciseSummaries = useMemo(() => {
    const map = new Map<string, Workout[]>();

    for (const w of workouts) {
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

      summaries.push({
        name,
        totalLogs,
        totalSets,
        totalReps,
        maxWeight,
        avgRir: Math.round(avgRir * 10) / 10,
        lastTrainedDate,
        latestRir,
      });
    });

    return summaries.sort((a, b) => b.totalLogs - a.totalLogs);
  }, [workouts]);

  const filteredSummaries = useMemo(() => {
    if (!searchQuery.trim()) return exerciseSummaries;
    return exerciseSummaries.filter((e) =>
      e.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [exerciseSummaries, searchQuery]);

  return (
    <div className="min-h-[85vh] flex flex-col justify-center max-w-3xl mx-auto px-4 py-8 select-none animate-slide-up font-sans">
      {/* Clean Bold Headline & Search */}
      <div className="mb-10 pb-6 border-b border-[#383530]/50 flex flex-col sm:flex-row sm:items-baseline justify-between gap-4">
        <div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-[#F5F2EB] leading-tight">
            Exercises
          </h1>
          <p className="text-xs font-sans text-[#A8A297] mt-2">
            {exerciseSummaries.length === 0
              ? 'No exercises recorded yet'
              : `${exerciseSummaries.length} ${
                  exerciseSummaries.length === 1 ? 'exercise' : 'exercises'
                } in archive`}
          </p>
        </div>

        {/* Minimal Search Line */}
        {exerciseSummaries.length > 0 && (
          <div className="relative w-full sm:w-56">
            <Search className="w-3.5 h-3.5 absolute left-0 top-1/2 -translate-y-1/2 text-[#706B62]" />
            <input
              type="text"
              placeholder="Search exercise..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent border-b border-[#383530] focus:border-[#CC6543] pl-6 pr-2 py-1.5 text-sm font-sans text-[#F5F2EB] placeholder-[#524E48] focus:outline-none transition-colors"
            />
          </div>
        )}
      </div>

      {/* Empty State */}
      {exerciseSummaries.length === 0 ? (
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
                {/* Bold Sans Headline */}
                <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#F5F2EB] group-hover:text-claude-terracottaLight transition-colors">
                  {item.name}
                </h3>

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
