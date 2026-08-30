import React, { useState } from 'react';
import {
  Trash2,
  CheckCircle2,
  Clock,
  Search,
  Calendar,
  Layers,
  Flame,
  Info,
  Dumbbell
} from 'lucide-react';
import { Workout, WorkoutFilter } from '../types/workout';

interface WorkoutListProps {
  workouts: Workout[];
  loading: boolean;
  filter: WorkoutFilter;
  setFilter: React.Dispatch<React.SetStateAction<WorkoutFilter>>;
  onDelete: (id: string) => void;
  onSelectExercise?: (exerciseName: string) => void;
}

export const WorkoutList: React.FC<WorkoutListProps> = ({
  workouts,
  loading,
  filter,
  setFilter,
  onDelete,
  onSelectExercise,
}) => {
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const getRirBadge = (rir: number) => {
    if (rir === 0) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-sans px-2 py-0.5 rounded-md bg-[#D45B5B]/15 text-[#F5B5B5] border border-[#D45B5B]/30 font-semibold">
          <Flame className="w-3 h-3 text-[#D45B5B]" />
          0 RIR (Failure)
        </span>
      );
    }
    if (rir <= 1) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-sans px-2 py-0.5 rounded-md bg-[#CC6543]/15 text-[#E59B80] border border-[#CC6543]/30 font-semibold">
          {rir} RIR (1 in tank)
        </span>
      );
    }
    if (rir <= 2) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-sans px-2 py-0.5 rounded-md bg-[#E08E45]/15 text-[#F0BD85] border border-[#E08E45]/30 font-semibold">
          {rir} RIR
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-sans px-2 py-0.5 rounded-md bg-[#789D74]/15 text-[#B8D4B5] border border-[#789D74]/30 font-semibold">
        {rir} RIR
      </span>
    );
  };

  const formatDate = (dateStr: string) => {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    if (dateStr === today) return 'Today';
    if (dateStr === yesterday) return 'Yesterday';

    try {
      const d = new Date(dateStr + 'T00:00:00');
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        weekday: 'short',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="bg-claude-surface border border-claude-border rounded-2xl p-6 shadow-sm font-sans">
      {/* Header & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-claude-border">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#CC6543]/15 text-claude-terracotta border border-[#CC6543]/30">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-claude-text tracking-tight">
              All Activity History
            </h2>
            <p className="text-xs text-claude-textMuted font-sans">
              {workouts.length} {workouts.length === 1 ? 'entry' : 'entries'} recorded
            </p>
          </div>
        </div>

        {/* Search & Date Filter */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-56">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-claude-textDim" />
            <input
              type="text"
              placeholder="Search exercise or notes..."
              value={filter.searchQuery || ''}
              onChange={(e) => setFilter((prev) => ({ ...prev, searchQuery: e.target.value }))}
              className="w-full bg-claude-surfaceDark border border-claude-border rounded-xl pl-8 pr-3 py-1.5 text-xs text-claude-text placeholder-claude-textDim focus:outline-none focus:border-claude-terracotta"
            />
          </div>

          <input
            type="date"
            value={filter.date || ''}
            onChange={(e) => setFilter((prev) => ({ ...prev, date: e.target.value || undefined }))}
            className="bg-claude-surfaceDark border border-claude-border rounded-xl px-2.5 py-1.5 text-xs text-claude-text focus:outline-none focus:border-claude-terracotta font-sans [color-scheme:dark]"
            title="Filter by date"
          />

          {(filter.searchQuery || filter.date) && (
            <button
              onClick={() => setFilter({})}
              className="text-xs text-claude-textMuted hover:text-claude-text px-2.5 py-1.5 rounded-xl bg-claude-surfaceDark border border-claude-border hover:border-claude-borderHover"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="py-12 text-center text-claude-textMuted text-sm flex flex-col items-center gap-2">
          <div className="w-6 h-6 border-2 border-claude-terracotta border-t-transparent rounded-full animate-spin"></div>
          <span>Loading activity history...</span>
        </div>
      ) : workouts.length === 0 ? (
        /* Empty State */
        <div className="py-12 px-4 text-center rounded-xl border border-dashed border-claude-border bg-claude-surfaceDark/40">
          <Dumbbell className="w-10 h-10 text-claude-textDim mx-auto mb-3 stroke-[1.5]" />
          <h3 className="text-sm font-bold text-claude-text mb-1">
            No activity history yet
          </h3>
          <p className="text-xs text-claude-textMuted max-w-sm mx-auto mb-4 font-sans">
            Start by logging an exercise from the Exercise Hub or General Logger.
          </p>
        </div>
      ) : (
        /* Workouts List */
        <div className="space-y-3">
          {workouts.map((workout) => {
            const isPending = workout.sync_status === 'pending';

            return (
              <div
                key={workout.id}
                className="group bg-claude-surfaceDark border border-claude-border hover:border-claude-borderHover rounded-xl p-4 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm"
              >
                {/* Exercise Info */}
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => onSelectExercise && onSelectExercise(workout.exercise_name)}
                      className="text-sm font-bold text-claude-text hover:text-claude-terracottaLight transition text-left"
                    >
                      {workout.exercise_name}
                    </button>

                    {/* RIR Badge */}
                    {getRirBadge(workout.rir)}

                    {/* Sync status */}
                    {isPending ? (
                      <span
                        className="inline-flex items-center gap-1 text-[10px] font-sans px-2 py-0.5 rounded bg-[#E08E45]/15 text-[#F0BD85] border border-[#E08E45]/30"
                        title="Saved locally, pending database sync"
                      >
                        <Clock className="w-3 h-3" /> Local Only
                      </span>
                    ) : (
                      <span
                        className="inline-flex items-center gap-1 text-[10px] font-sans px-2 py-0.5 rounded bg-[#789D74]/15 text-[#B8D4B5] border border-[#789D74]/30"
                        title="Synced to database"
                      >
                        <CheckCircle2 className="w-3 h-3" /> Synced
                      </span>
                    )}
                  </div>

                  {/* Sets & Reps and Date info */}
                  <div className="flex flex-wrap items-center gap-2.5 text-xs text-claude-textMuted font-sans">
                    <span className="bg-claude-surface px-2 py-0.5 rounded border border-claude-border text-claude-text">
                      <strong className="text-claude-terracottaLight font-bold text-xs">{workout.sets}</strong> sets
                    </span>

                    <span className="bg-claude-surface px-2 py-0.5 rounded border border-claude-border text-claude-text">
                      <strong className="text-claude-terracottaLight font-bold text-xs">{workout.reps}</strong> reps/set
                    </span>

                    <span className="text-claude-textDim">
                      Total: {workout.sets * workout.reps} reps
                    </span>

                    <span className="flex items-center gap-1 text-claude-textMuted font-sans">
                      <Calendar className="w-3.5 h-3.5 text-claude-textDim" />
                      {formatDate(workout.date)} ({workout.date})
                    </span>
                  </div>

                  {/* Notes */}
                  {workout.notes && (
                    <div className="text-xs text-claude-textMuted bg-claude-surface/60 rounded-lg px-2.5 py-1.5 border border-claude-border/70 flex items-start gap-1.5 italic font-sans">
                      <Info className="w-3.5 h-3.5 text-claude-textDim mt-0.5 shrink-0" />
                      <span>{workout.notes}</span>
                    </div>
                  )}
                </div>

                {/* Delete */}
                <div className="self-end sm:self-center">
                  {deleteConfirmId === workout.id ? (
                    <div className="flex items-center gap-1.5 bg-[#D45B5B]/20 border border-[#D45B5B]/40 p-1 rounded-lg">
                      <button
                        onClick={() => {
                          onDelete(workout.id);
                          setDeleteConfirmId(null);
                        }}
                        className="text-xs bg-[#D45B5B] hover:bg-[#D45B5B]/80 text-white px-2 py-1 rounded font-semibold font-sans"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(null)}
                        className="text-xs text-claude-textDim hover:text-claude-text px-1.5 font-sans"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirmId(workout.id)}
                      className="text-claude-textDim hover:text-[#D45B5B] p-2 rounded-lg hover:bg-[#D45B5B]/10 transition"
                      title="Delete log"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
