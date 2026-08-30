import React, { useState, useMemo } from 'react';
import {
  ArrowLeft,
  Calendar,
  Check,
  Plus,
  Trash2,
  Clock,
  CheckCircle2,
  Zap,
} from 'lucide-react';
import { Workout } from '../types/workout';
import { formatStandardDate } from '../utils/dateUtils';
import { ProgressionChart } from './ProgressionChart';

interface ExerciseDetailViewProps {
  exerciseName: string;
  allWorkouts: Workout[];
  onBack: () => void;
  onAddWorkout: (data: {
    exercise_name: string;
    sets: number;
    reps: number;
    rir: number;
    weight?: number | null;
    date: string;
    notes?: string;
  }) => Promise<any>;
  onDeleteWorkout: (id: string) => void;
}

const RIR_OPTIONS = [
  { val: 0, label: '0', desc: 'Failure' },
  { val: 1, label: '1', desc: '1 left' },
  { val: 2, label: '2', desc: '2 left' },
  { val: 3, label: '3', desc: '3 left' },
  { val: 4, label: '4+', desc: 'Warmup' },
];

export const ExerciseDetailView: React.FC<ExerciseDetailViewProps> = ({
  exerciseName,
  allWorkouts,
  onBack,
  onAddWorkout,
  onDeleteWorkout,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];

  // Filter workouts for this specific exercise
  const exerciseWorkouts = useMemo(() => {
    return allWorkouts
      .filter((w) => w.exercise_name.toLowerCase() === exerciseName.toLowerCase())
      .sort((a, b) => {
        if (a.date !== b.date) {
          return b.date.localeCompare(a.date);
        }
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  }, [allWorkouts, exerciseName]);

  // Form State
  const [date, setDate] = useState<string>(todayStr);
  const [sets, setSets] = useState<number>(3);
  const [reps, setReps] = useState<number>(10);
  const [weight, setWeight] = useState<string>('');
  const [rir, setRir] = useState<number>(2);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Exercise statistics
  const stats = useMemo(() => {
    const totalSessions = exerciseWorkouts.length;
    const totalSets = exerciseWorkouts.reduce((sum, w) => sum + w.sets, 0);
    const totalReps = exerciseWorkouts.reduce((sum, w) => sum + w.sets * w.reps, 0);
    const maxWeight = exerciseWorkouts.reduce(
      (max, w) => Math.max(max, w.weight || 0),
      0
    );
    const avgRir =
      totalSessions > 0
        ? exerciseWorkouts.reduce((sum, w) => sum + w.rir, 0) / totalSessions
        : 0;

    return {
      totalSessions,
      totalSets,
      totalReps,
      maxWeight,
      avgRir: Math.round(avgRir * 10) / 10,
      lastTrained: exerciseWorkouts[0]?.date || 'None yet',
    };
  }, [exerciseWorkouts]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const effectiveDate = date.trim() || todayStr;

    if (sets <= 0 || !Number.isInteger(sets)) {
      setError('Sets must be at least 1');
      return;
    }
    if (reps <= 0 || !Number.isInteger(reps)) {
      setError('Reps must be at least 1');
      return;
    }
    if (rir < 0) {
      setError('RIR must be 0 or greater');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const parsedWeight = weight.trim() !== '' ? parseFloat(weight) : null;
      await onAddWorkout({
        exercise_name: exerciseName,
        sets,
        reps,
        rir,
        weight: parsedWeight,
        date: effectiveDate,
        notes: notes.trim() || undefined,
      });

      setSuccessMessage(true);
      setTimeout(() => setSuccessMessage(false), 2500);
      setNotes('');
    } catch (err: any) {
      setError(err.message || 'Failed to log workout');
    } finally {
      setIsSubmitting(false);
    }
  };

  const adjustValue = (
    setter: React.Dispatch<React.SetStateAction<number>>,
    delta: number,
    min: number = 1
  ) => {
    setter((prev) => Math.max(min, prev + delta));
  };

  const adjustWeight = (delta: number) => {
    const current = parseFloat(weight) || 0;
    const next = Math.max(0, current + delta);
    setWeight(next.toString());
  };

  return (
    <div className="min-h-[85vh] flex flex-col justify-center max-w-6xl mx-auto px-4 sm:px-6 py-8 select-none animate-slide-up space-y-12 font-sans">
      {/* Top Breadcrumb & Title */}
      <div>
        <button
          onClick={onBack}
          className="group inline-flex items-center gap-2 text-xs uppercase tracking-widest text-[#A8A297] hover:text-[#F5F2EB] active:scale-95 transition-all mb-4 font-medium"
        >
          <ArrowLeft className="w-4 h-4 transition-transform duration-200 group-hover:-translate-x-1" />
          <span>Back to Exercises</span>
        </button>

        <div className="pb-6 border-b border-[#383530]/50 flex flex-col sm:flex-row sm:items-baseline justify-between gap-3">
          {/* Bold Sans Title */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-[#F5F2EB] leading-tight">
            {exerciseName}
          </h1>

          {/* Clean Summary Stats Line */}
          <div className="flex flex-wrap items-center gap-x-3 text-xs sm:text-sm text-[#A8A297]">
            <span>{stats.totalSessions} sessions</span>
            <span className="text-[#4D4740]">·</span>
            <span>{stats.totalSets} sets</span>
            {stats.maxWeight > 0 && (
              <>
                <span className="text-[#4D4740]">·</span>
                <span className="text-[#DE7C5A] font-bold">{stats.maxWeight} kg max</span>
              </>
            )}
            <span className="text-[#4D4740]">·</span>
            <span>{stats.avgRir} avg RIR</span>
          </div>
        </div>
      </div>

      {/* Success Banner */}
      {successMessage && (
        <div className="p-4 rounded-2xl bg-[#789D74]/15 border border-[#789D74]/30 text-[#B8D4B5] text-sm flex items-center gap-2.5 animate-pop-in">
          <Check className="w-5 h-5 text-[#789D74]" />
          <span>New entry for <strong className="font-bold text-white text-base">{exerciseName}</strong> saved.</span>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-2xl bg-[#D45B5B]/15 border border-[#D45B5B]/30 text-[#F5B5B5] text-sm animate-pop-in">
          {error}
        </div>
      )}

      {/* SIDE BY SIDE: Dominant Grand Graph (8-9 Cols) + Compact Small Log Box (3-4 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
        {/* Left (8-9 Cols): Dominant Large Progression Graph */}
        <div className="lg:col-span-8 xl:col-span-9">
          <ProgressionChart workouts={exerciseWorkouts} exerciseName={exerciseName} />
        </div>

        {/* Right (3-4 Cols): Compact, Smaller Fast Log Box */}
        <div className="lg:col-span-4 xl:col-span-3 bg-[#252320]/80 border border-[#383530] rounded-xl p-3.5 sm:p-4 shadow-sm space-y-3.5">
          <div className="flex items-center gap-1.5 pb-2 border-b border-[#383530]/60">
            <Zap className="w-3.5 h-3.5 text-[#CC6543]" />
            <h3 className="text-xs font-bold text-[#F5F2EB] uppercase tracking-wider">
              Log Next Set
            </h3>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Standard Robust Date Input */}
            <div className="flex items-center gap-2 border-b border-[#383530]/60 pb-1.5 focus-within:border-[#CC6543] transition-colors">
              <Calendar className="w-3 h-3 text-[#CC6543] shrink-0" />
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                onBlur={() => {
                  if (!date) setDate(todayStr);
                }}
                className="w-full bg-transparent text-xs font-bold text-[#F5F2EB] tracking-wider focus:outline-none cursor-pointer [color-scheme:dark]"
                title="Date of workout"
              />
            </div>

            {/* Sets & Reps */}
            <div className="grid grid-cols-2 gap-2">
              {/* Sets */}
              <div className="space-y-1">
                <label className="block text-[9px] uppercase tracking-wider text-[#A8A297] font-medium">
                  Sets
                </label>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => adjustValue(setSets, -1, 1)}
                    className="w-6 h-6 rounded-full border border-[#383530] bg-[#191816] hover:bg-[#2E2B27] text-xs font-bold flex items-center justify-center active:scale-90"
                  >
                    -
                  </button>
                  <span className="text-base font-bold text-[#F5F2EB] flex-1 text-center">
                    {sets}
                  </span>
                  <button
                    type="button"
                    onClick={() => adjustValue(setSets, 1, 1)}
                    className="w-6 h-6 rounded-full border border-[#383530] bg-[#191816] hover:bg-[#2E2B27] text-xs font-bold flex items-center justify-center active:scale-90"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Reps */}
              <div className="space-y-1">
                <label className="block text-[9px] uppercase tracking-wider text-[#A8A297] font-medium">
                  Reps
                </label>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => adjustValue(setReps, -1, 1)}
                    className="w-6 h-6 rounded-full border border-[#383530] bg-[#191816] hover:bg-[#2E2B27] text-xs font-bold flex items-center justify-center active:scale-90"
                  >
                    -
                  </button>
                  <span className="text-base font-bold text-[#F5F2EB] flex-1 text-center">
                    {reps}
                  </span>
                  <button
                    type="button"
                    onClick={() => adjustValue(setReps, 1, 1)}
                    className="w-6 h-6 rounded-full border border-[#383530] bg-[#191816] hover:bg-[#2E2B27] text-xs font-bold flex items-center justify-center active:scale-90"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Weight Input */}
            <div className="space-y-1 border-b border-[#383530]/60 pb-2">
              <label className="block text-[9px] uppercase tracking-wider text-[#A8A297] font-medium">
                Weight (kg)
              </label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => adjustWeight(-2.5)}
                  className="px-1.5 h-6 rounded-full border border-[#383530] bg-[#191816] text-[9px] font-semibold text-[#A8A297] flex items-center justify-center active:scale-90"
                >
                  -2.5
                </button>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  placeholder="0"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="w-full bg-transparent text-base font-bold text-[#F5F2EB] text-center focus:outline-none placeholder-[#524E48] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <button
                  type="button"
                  onClick={() => adjustWeight(2.5)}
                  className="px-1.5 h-6 rounded-full border border-[#383530] bg-[#191816] text-[9px] font-semibold text-[#A8A297] flex items-center justify-center active:scale-90"
                >
                  +2.5
                </button>
              </div>
            </div>

            {/* RIR Selection */}
            <div className="space-y-1">
              <div className="flex justify-between text-[9px] uppercase tracking-wider text-[#A8A297] font-medium">
                <span>Fatigue (RIR)</span>
                <span className="text-[#CC6543] font-bold">{rir} RIR</span>
              </div>
              <div className="grid grid-cols-5 gap-1">
                {RIR_OPTIONS.map((opt) => (
                  <button
                    key={opt.val}
                    type="button"
                    onClick={() => setRir(opt.val)}
                    className={`py-1 rounded border text-center text-xs font-bold transition-all ${
                      rir === opt.val
                        ? 'bg-[#CC6543] border-[#CC6543] text-white shadow-sm'
                        : 'bg-[#191816] border-[#383530] text-[#A8A297] hover:text-[#F5F2EB]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Optional Notes */}
            <div className="space-y-1">
              <input
                type="text"
                placeholder="Notes (optional)..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-transparent border-b border-[#383530]/60 pb-1 text-xs text-[#F5F2EB] placeholder-[#524E48] focus:outline-none"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-1 flex items-center justify-center gap-1 py-2 rounded-full bg-[#CC6543] hover:bg-[#DE7C5A] text-white text-xs font-semibold tracking-wider uppercase shadow-sm shadow-[#CC6543]/20 active:scale-95 transition-all"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>{isSubmitting ? 'Saving...' : 'Record Set'}</span>
            </button>
          </form>
        </div>
      </div>

      {/* Overtime History Timeline */}
      <div className="space-y-6 pt-6 border-t border-[#383530]/50">
        <h2 className="text-xl font-bold tracking-tight text-[#F5F2EB]">
          History & Progression Timeline
        </h2>

        {exerciseWorkouts.length === 0 ? (
          <p className="text-xs text-[#A8A297]">No logs recorded yet.</p>
        ) : (
          <div className="divide-y divide-[#2E2B26]">
            {exerciseWorkouts.map((workout) => {
              const isPending = workout.sync_status === 'pending';

              return (
                <div
                  key={workout.id}
                  className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex flex-wrap items-center gap-3 text-sm">
                      <span className="font-bold text-[#F5F2EB] text-sm tracking-wider">
                        {formatStandardDate(workout.date)}
                      </span>
                      <span className="text-[#CC6543] font-bold text-sm">
                        {workout.sets} sets × {workout.reps} reps
                      </span>
                      {workout.weight !== null && workout.weight !== undefined && workout.weight > 0 && (
                        <span className="text-[#DE7C5A] font-bold text-sm">@ {workout.weight} kg</span>
                      )}
                      <span className="text-xs text-[#A8A297]">
                        ({workout.rir} RIR)
                      </span>
                    </div>

                    {workout.notes && (
                      <p className="text-xs text-[#A8A297]">
                        "{workout.notes}"
                      </p>
                    )}
                  </div>

                  {/* Actions & Sync State */}
                  <div className="flex items-center gap-3 self-end sm:self-center">
                    {isPending ? (
                      <span className="inline-flex items-center gap-1 text-[10px] text-[#F0BD85]">
                        <Clock className="w-3 h-3" /> Local
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] text-[#B8D4B5]">
                        <CheckCircle2 className="w-3 h-3" /> Synced
                      </span>
                    )}

                    {deleteConfirmId === workout.id ? (
                      <div className="flex items-center gap-2 animate-pop-in">
                        <button
                          onClick={() => {
                            onDeleteWorkout(workout.id);
                            setDeleteConfirmId(null);
                          }}
                          className="text-xs text-[#D45B5B] underline uppercase font-semibold"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(null)}
                          className="text-xs text-[#706B62] hover:text-[#F5F2EB] uppercase"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirmId(workout.id)}
                        className="text-[#706B62] hover:text-[#D45B5B] p-1 transition-colors"
                        title="Delete log"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
