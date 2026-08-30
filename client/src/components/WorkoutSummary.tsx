import React from 'react';
import { Dumbbell, Layers, Zap, CalendarCheck } from 'lucide-react';
import { WorkoutStats } from '../types/workout';

interface WorkoutSummaryProps {
  stats: WorkoutStats;
}

export const WorkoutSummary: React.FC<WorkoutSummaryProps> = ({ stats }) => {
  const getRirColor = (rir: number) => {
    if (rir <= 0.5) return 'text-[#D45B5B]';
    if (rir <= 1.5) return 'text-[#CC6543]';
    if (rir <= 3) return 'text-[#789D74]';
    return 'text-[#A8A297]';
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 font-sans">
      {/* Total Exercises */}
      <div className="bg-claude-surface border border-claude-border rounded-2xl p-4 flex flex-col justify-between shadow-sm">
        <div className="flex items-center justify-between text-claude-textMuted mb-2">
          <span className="text-xs font-semibold">Total Logged</span>
          <div className="p-1.5 rounded-lg bg-[#CC6543]/15 text-claude-terracotta">
            <Dumbbell className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold text-claude-text">{stats.totalWorkouts}</span>
          <span className="text-xs text-claude-textDim">entries</span>
        </div>
      </div>

      {/* Sets & Reps */}
      <div className="bg-claude-surface border border-claude-border rounded-2xl p-4 flex flex-col justify-between shadow-sm">
        <div className="flex items-center justify-between text-claude-textMuted mb-2">
          <span className="text-xs font-semibold">Total Sets</span>
          <div className="p-1.5 rounded-lg bg-[#E08E45]/15 text-[#E08E45]">
            <Layers className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold text-claude-text">{stats.totalSets}</span>
          <span className="text-xs text-claude-textDim">({stats.totalReps} reps)</span>
        </div>
      </div>

      {/* Avg RIR */}
      <div className="bg-claude-surface border border-claude-border rounded-2xl p-4 flex flex-col justify-between shadow-sm">
        <div className="flex items-center justify-between text-claude-textMuted mb-2">
          <span className="text-xs font-semibold">Average Fatigue</span>
          <div className="p-1.5 rounded-lg bg-[#789D74]/15 text-[#789D74]">
            <Zap className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="flex items-baseline gap-1">
          <span className={`text-2xl font-bold ${getRirColor(stats.avgRir)}`}>
            {stats.avgRir}
          </span>
          <span className="text-xs text-claude-textDim">avg RIR</span>
        </div>
      </div>

      {/* Today's Session */}
      <div className="bg-claude-surface border border-claude-border rounded-2xl p-4 flex flex-col justify-between shadow-sm">
        <div className="flex items-center justify-between text-claude-textMuted mb-2">
          <span className="text-xs font-semibold">Today's Session</span>
          <div className="p-1.5 rounded-lg bg-[#CC6543]/15 text-claude-terracotta">
            <CalendarCheck className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold text-claude-text">{stats.todayCount}</span>
          <span className="text-xs text-claude-textDim">exercises</span>
        </div>
      </div>
    </div>
  );
};
