import React, { useState, useMemo } from 'react';
import {
  ArrowLeft,
  Calendar,
  Plus,
  Trash2,
  Clock,
  CheckCircle2,
  Zap,
  X,
  Pencil,
  Check,
} from 'lucide-react';
import { Workout } from '../types/workout';
import { formatStandardDate } from '../utils/dateUtils';
import { ProgressionChart } from './ProgressionChart';

interface ExerciseDetailViewProps {
  exerciseName: string;
  allWorkouts: Workout[];
  profiles?: string[];
  subProfiles?: Record<string, string[]>;
  onCreateProfile?: (name: string) => Promise<string>;
  onBack: () => void;
  onAddWorkout: (data: {
    exercise_name: string;
    sets: number;
    reps: number;
    rir: number;
    weight?: number | null;
    profile?: string | null;
    sub_profile?: string | null;
    date: string;
    notes?: string;
  }) => Promise<any>;
  onWorkoutLogged?: (exerciseName: string, profile?: string | null) => void;
  onUpdateWorkout?: (
    id: string,
    updates: Partial<{
      exercise_name: string;
      sets: number;
      reps: number;
      rir: number;
      weight: number | null;
      profile: string | null;
      sub_profile: string | null;
      date: string;
      notes: string | null;
    }>
  ) => Promise<any>;
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
  profiles = [],
  subProfiles = {},
  onCreateProfile,
  onBack,
  onAddWorkout,
  onWorkoutLogged,
  onUpdateWorkout,
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

  // Determine last used profile for this exercise
  const lastUsedProfile = useMemo(() => {
    const withProfile = exerciseWorkouts.find((w) => Boolean(w.profile));
    return withProfile ? withProfile.profile : null;
  }, [exerciseWorkouts]);

  // Form State
  const [date, setDate] = useState<string>(todayStr);
  const [sets, setSets] = useState<string | number>(3);
  const [reps, setReps] = useState<string | number>(10);
  const [weight, setWeight] = useState<string>('');
  const [rir, setRir] = useState<number>(2);
  const [selectedProfile, setSelectedProfile] = useState<string | null>(lastUsedProfile || null);
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Inline Edit State for Logged History Entries
  const [editingWorkoutId, setEditingWorkoutId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState<string>('');
  const [editSets, setEditSets] = useState<string | number>(3);
  const [editReps, setEditReps] = useState<string | number>(10);
  const [editWeight, setEditWeight] = useState<string>('');
  const [editRir, setEditRir] = useState<number>(2);
  const [editProfile, setEditProfile] = useState<string | null>(null);
  const [editSubProfile, setEditSubProfile] = useState<string | null>(null);
  const [editNotes, setEditNotes] = useState<string>('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editToast, setEditToast] = useState<string | null>(null);

  const handleStartEdit = (workout: Workout) => {
    setEditingWorkoutId(workout.id);
    setEditDate(workout.date);
    setEditSets(workout.sets);
    setEditReps(workout.reps);
    setEditWeight(
      workout.weight !== null && workout.weight !== undefined && workout.weight > 0
        ? String(workout.weight)
        : ''
    );
    setEditRir(workout.rir ?? 2);
    setEditProfile(workout.profile || null);
    setEditSubProfile(workout.sub_profile || null);
    setEditNotes(workout.notes || '');
    setEditError(null);
    setDeleteConfirmId(null);
  };

  const handleCancelEdit = () => {
    setEditingWorkoutId(null);
    setEditError(null);
  };

  const handleAdjustEditWeight = (delta: number) => {
    const current = parseFloat(editWeight) || 0;
    const next = Math.max(0, current + delta);
    setEditWeight(next === 0 ? '' : String(next));
  };

  const handleSaveEdit = async (workoutId: string) => {
    if (!onUpdateWorkout) return;

    const numSets = parseInt(String(editSets), 10);
    const numReps = parseInt(String(editReps), 10);
    const numRir = Number(editRir);
    const parsedWeight = editWeight.trim() === '' ? null : parseFloat(editWeight);

    if (isNaN(numSets) || numSets <= 0) {
      setEditError('Sets must be at least 1');
      return;
    }
    if (isNaN(numReps) || numReps <= 0) {
      setEditError('Reps must be at least 1');
      return;
    }
    if (parsedWeight !== null && (isNaN(parsedWeight) || parsedWeight < 0)) {
      setEditError('Weight must be 0 or positive');
      return;
    }

    setIsSavingEdit(true);
    setEditError(null);

    try {
      await onUpdateWorkout(workoutId, {
        sets: numSets,
        reps: numReps,
        rir: numRir,
        weight: parsedWeight,
        date: editDate || todayStr,
        profile: editProfile,
        sub_profile: editSubProfile,
        notes: editNotes.trim() || null,
      });

      setEditingWorkoutId(null);
      const weightLabel = parsedWeight !== null ? `${parsedWeight} kg` : 'bodyweight';
      setEditToast(`Updated entry: ${weightLabel} · ${numSets}×${numReps}`);
      setTimeout(() => setEditToast(null), 3000);
    } catch (err: any) {
      console.error('Failed to update workout:', err);
      setEditError('Failed to save changes. Please try again.');
    } finally {
      setIsSavingEdit(false);
    }
  };

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

    // Collect all profiles this exercise has been logged under
    const distinctProfiles = Array.from(
      new Set(exerciseWorkouts.map((w) => w.profile).filter((p): p is string => Boolean(p)))
    );

    return {
      totalSessions,
      totalSets,
      totalReps,
      maxWeight,
      avgRir: Math.round(avgRir * 10) / 10,
      lastTrained: exerciseWorkouts[0]?.date || 'None yet',
      distinctProfiles,
    };
  }, [exerciseWorkouts]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const effectiveDate = date.trim() || todayStr;
    const numSets = parseInt(String(sets), 10);
    const numReps = parseInt(String(reps), 10);

    if (isNaN(numSets) || numSets <= 0 || !Number.isInteger(numSets)) {
      setError('Sets must be at least 1');
      return;
    }
    if (isNaN(numReps) || numReps <= 0 || !Number.isInteger(numReps)) {
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
      // Auto-resolve profile on submit
      let effectiveProfile: string | null = selectedProfile;
      if (isCreatingProfile && newProfileName.trim()) {
        const trimmed = newProfileName.trim();
        if (onCreateProfile) {
          effectiveProfile = await onCreateProfile(trimmed);
        } else {
          effectiveProfile = trimmed;
        }
        setSelectedProfile(effectiveProfile);
        setIsCreatingProfile(false);
        setNewProfileName('');
      }

      const parsedWeight = weight.trim() !== '' ? parseFloat(weight) : null;
      await onAddWorkout({
        exercise_name: exerciseName,
        sets: numSets,
        reps: numReps,
        rir,
        weight: parsedWeight,
        profile: effectiveProfile,
        date: effectiveDate,
        notes: notes.trim() || undefined,
      });

      if (onWorkoutLogged) {
        onWorkoutLogged(exerciseName, effectiveProfile);
      }
      setNotes('');
    } catch (err: any) {
      setError(err.message || 'Failed to log workout');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateProfileInline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProfileName.trim() || !onCreateProfile) return;

    const created = await onCreateProfile(newProfileName.trim());
    setSelectedProfile(created);
    setNewProfileName('');
    setIsCreatingProfile(false);
  };

  const adjustSets = (delta: number) => {
    const current = parseInt(String(sets), 10) || 1;
    setSets(Math.max(1, current + delta));
  };

  const adjustReps = (delta: number) => {
    const current = parseInt(String(reps), 10) || 1;
    setReps(Math.max(1, current + delta));
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
          <div>
            <div className="flex items-center gap-3">
              {/* Bold Title */}
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-[#F5F2EB] leading-tight">
                {exerciseName}
              </h1>

              {/* Profile Badges */}
              {stats.distinctProfiles.map((pr) => (
                <span
                  key={pr}
                  className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#252320] border border-[#383530] text-[#CC6543]"
                >
                  {pr}
                </span>
              ))}
            </div>
          </div>

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

        {/* Right (3-4 Cols): Compact Fast Log Box */}
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

            {/* Optional Profile Selector */}
            {(profiles.length > 0 || isCreatingProfile) && (
              <div className="space-y-1 border-b border-[#383530]/60 pb-2">
                <div className="flex items-center justify-between text-[9px] uppercase tracking-wider text-[#A8A297] font-medium">
                  <span>Profile</span>
                  {selectedProfile && (
                    <button
                      type="button"
                      onClick={() => setSelectedProfile(null)}
                      className="text-[9px] text-[#706B62] hover:text-[#CC6543] underline"
                    >
                      None
                    </button>
                  )}
                </div>

                {!isCreatingProfile ? (
                  <div className="flex flex-wrap gap-1">
                    {profiles.map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setSelectedProfile(selectedProfile === p ? null : p)}
                        className={`px-2 py-0.5 rounded text-[10px] transition ${
                          selectedProfile === p
                            ? 'bg-[#CC6543] text-white font-bold'
                            : 'bg-[#191816] text-[#A8A297] border border-[#383530]'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                    {onCreateProfile && (
                      <button
                        type="button"
                        onClick={() => setIsCreatingProfile(true)}
                        className="px-1.5 py-0.5 rounded text-[10px] text-[#706B62] hover:text-[#CC6543] border border-dashed border-[#383530]"
                      >
                        +
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-1 bg-[#191816] border border-[#CC6543] rounded px-1.5 py-0.5 animate-pop-in">
                    <input
                      type="text"
                      placeholder="Profile name..."
                      value={newProfileName}
                      onChange={(e) => setNewProfileName(e.target.value)}
                      autoFocus
                      className="bg-transparent text-[10px] text-[#F5F2EB] focus:outline-none w-full"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleCreateProfileInline(e);
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleCreateProfileInline}
                      className="text-[9px] font-bold text-[#CC6543]"
                    >
                      ✓
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsCreatingProfile(false);
                        setNewProfileName('');
                      }}
                      className="text-[#706B62]"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Sets & Reps (Directly Typeable + Stepper Controls) */}
            <div className="grid grid-cols-2 gap-2">
              {/* Sets (Typeable + Steppers) */}
              <div className="space-y-1">
                <label className="block text-[9px] uppercase tracking-wider text-[#A8A297] font-medium">
                  Sets
                </label>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => adjustSets(-1)}
                    className="w-6 h-6 rounded-full border border-[#383530] bg-[#191816] hover:bg-[#2E2B27] text-xs font-bold flex items-center justify-center active:scale-90"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={sets}
                    onChange={(e) => setSets(e.target.value)}
                    onBlur={() => {
                      if (sets === '' || Number(sets) < 1) setSets(1);
                    }}
                    className="w-full bg-transparent text-base font-bold text-[#F5F2EB] text-center focus:outline-none placeholder-[#524E48] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <button
                    type="button"
                    onClick={() => adjustSets(1)}
                    className="w-6 h-6 rounded-full border border-[#383530] bg-[#191816] hover:bg-[#2E2B27] text-xs font-bold flex items-center justify-center active:scale-90"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Reps (Typeable + Steppers) */}
              <div className="space-y-1">
                <label className="block text-[9px] uppercase tracking-wider text-[#A8A297] font-medium">
                  Reps
                </label>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => adjustReps(-1)}
                    className="w-6 h-6 rounded-full border border-[#383530] bg-[#191816] hover:bg-[#2E2B27] text-xs font-bold flex items-center justify-center active:scale-90"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={reps}
                    onChange={(e) => setReps(e.target.value)}
                    onBlur={() => {
                      if (reps === '' || Number(reps) < 1) setReps(1);
                    }}
                    className="w-full bg-transparent text-base font-bold text-[#F5F2EB] text-center focus:outline-none placeholder-[#524E48] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <button
                    type="button"
                    onClick={() => adjustReps(1)}
                    className="w-6 h-6 rounded-full border border-[#383530] bg-[#191816] hover:bg-[#2E2B27] text-xs font-bold flex items-center justify-center active:scale-90"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Weight Input (Typeable + Quick Adjust) */}
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
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight text-[#F5F2EB]">
            History & Progression Timeline
          </h2>
          <span className="text-xs text-[#A8A297]">
            {exerciseWorkouts.length} {exerciseWorkouts.length === 1 ? 'entry' : 'entries'}
          </span>
        </div>

        {/* Edit Toast Feedback */}
        {editToast && (
          <div className="p-3 rounded-xl bg-[#789D74]/15 border border-[#789D74]/30 text-[#B8D4B5] text-xs font-semibold flex items-center gap-2 animate-pop-in">
            <CheckCircle2 className="w-4 h-4 text-[#789D74]" />
            <span>{editToast}</span>
          </div>
        )}

        {exerciseWorkouts.length === 0 ? (
          <p className="text-xs text-[#A8A297]">No logs recorded yet.</p>
        ) : (
          <div className="divide-y divide-[#2E2B26]">
            {exerciseWorkouts.map((workout) => {
              const isPending = workout.sync_status === 'pending';

              // INLINE EDIT FORM FOR THIS WORKOUT
              if (editingWorkoutId === workout.id) {
                return (
                  <div
                    key={workout.id}
                    className="py-4 px-4 my-3 rounded-2xl bg-[#252320] border-2 border-[#CC6543] shadow-2xl animate-pop-in space-y-4"
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-[#383530]">
                      <div className="flex items-center gap-2">
                        <Pencil className="w-3.5 h-3.5 text-[#CC6543]" />
                        <span className="text-xs uppercase font-bold text-[#F5F2EB] tracking-wider">
                          Edit Logged Workout
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="p-1 rounded-full text-[#A8A297] hover:text-white bg-[#191816] transition"
                        title="Cancel editing"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Inputs Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      {/* 1. Date */}
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-[#A8A297] tracking-wider block">
                          Date
                        </label>
                        <input
                          type="date"
                          value={editDate}
                          onChange={(e) => setEditDate(e.target.value)}
                          className="w-full bg-[#191816] border border-[#383530] focus:border-[#CC6543] rounded-xl px-3 py-1.5 text-xs text-[#F5F2EB] focus:outline-none transition"
                        />
                      </div>

                      {/* 2. Weight (with -2.5 and +2.5 steppers) */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] uppercase font-bold text-[#A8A297] tracking-wider block">
                            Weight (kg)
                          </label>
                          <span className="text-[10px] text-[#CC6543] font-semibold">
                            {editWeight.trim() ? `${editWeight} kg` : 'Bodyweight'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 bg-[#191816] border border-[#383530] focus-within:border-[#CC6543] rounded-xl px-2 py-1">
                          <button
                            type="button"
                            onClick={() => handleAdjustEditWeight(-2.5)}
                            className="px-1.5 h-6 rounded-full border border-[#383530] bg-[#252320] text-[9px] font-bold text-[#A8A297] hover:text-white active:scale-90 transition shrink-0"
                            title="-2.5 kg"
                          >
                            -2.5
                          </button>
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            placeholder="0"
                            value={editWeight}
                            onChange={(e) => setEditWeight(e.target.value)}
                            className="w-full bg-transparent text-xs font-bold text-[#F5F2EB] text-center focus:outline-none placeholder-[#524E48] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleAdjustEditWeight(2.5)}
                            className="px-1.5 h-6 rounded-full border border-[#383530] bg-[#252320] text-[9px] font-bold text-[#A8A297] hover:text-white active:scale-90 transition shrink-0"
                            title="+2.5 kg"
                          >
                            +2.5
                          </button>
                        </div>
                      </div>

                      {/* 3. Sets */}
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-[#A8A297] tracking-wider block">
                          Sets
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={editSets}
                          onChange={(e) => setEditSets(e.target.value)}
                          className="w-full bg-[#191816] border border-[#383530] focus:border-[#CC6543] rounded-xl px-3 py-1.5 text-xs text-[#F5F2EB] text-center font-bold focus:outline-none transition"
                        />
                      </div>

                      {/* 4. Reps */}
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-[#A8A297] tracking-wider block">
                          Reps
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={editReps}
                          onChange={(e) => setEditReps(e.target.value)}
                          className="w-full bg-[#191816] border border-[#383530] focus:border-[#CC6543] rounded-xl px-3 py-1.5 text-xs text-[#F5F2EB] text-center font-bold focus:outline-none transition"
                        />
                      </div>
                    </div>

                    {/* Fatigue (RIR) Selection */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] uppercase tracking-wider text-[#A8A297] font-medium">
                        <span>Fatigue (RIR)</span>
                        <span className="text-[#CC6543] font-bold">{editRir} RIR</span>
                      </div>
                      <div className="grid grid-cols-5 gap-1">
                        {RIR_OPTIONS.map((opt) => (
                          <button
                            key={opt.val}
                            type="button"
                            onClick={() => setEditRir(opt.val)}
                            className={`py-1 rounded-lg border text-center text-xs font-bold transition-all ${
                              editRir === opt.val
                                ? 'bg-[#CC6543] border-[#CC6543] text-white shadow-sm'
                                : 'bg-[#191816] border-[#383530] text-[#A8A297] hover:text-[#F5F2EB]'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Profile / Sub-Profile selection if profiles exist */}
                    {profiles.length > 0 && (
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-bold text-[#A8A297] tracking-wider block">
                          Workout Profile / Section
                        </label>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setEditProfile(null);
                              setEditSubProfile(null);
                            }}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition ${
                              editProfile === null
                                ? 'bg-[#CC6543] text-white border-[#CC6543]'
                                : 'bg-[#191816] text-[#A8A297] border-[#383530] hover:text-white'
                            }`}
                          >
                            None (General)
                          </button>
                          {profiles.map((p) => (
                            <button
                              key={p}
                              type="button"
                              onClick={() => {
                                setEditProfile(p);
                                if (editProfile !== p) setEditSubProfile(null);
                              }}
                              className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition ${
                                editProfile === p
                                  ? 'bg-[#CC6543] text-white border-[#CC6543]'
                                  : 'bg-[#191816] text-[#A8A297] border-[#383530] hover:text-white'
                              }`}
                            >
                              {p}
                            </button>
                          ))}
                        </div>

                        {/* Sub-Profiles if selected profile has any */}
                        {editProfile && subProfiles[editProfile] && subProfiles[editProfile].length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5 pt-1">
                            <button
                              type="button"
                              onClick={() => setEditSubProfile(null)}
                              className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border transition ${
                                editSubProfile === null
                                  ? 'bg-[#CC6543]/25 text-[#DE7C5A] border-[#CC6543]'
                                  : 'bg-[#191816] text-[#706B62] border-[#383530] hover:text-white'
                              }`}
                            >
                              General in {editProfile}
                            </button>
                            {subProfiles[editProfile].map((sub) => (
                              <button
                                key={sub}
                                type="button"
                                onClick={() => setEditSubProfile(sub)}
                                className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border transition ${
                                  editSubProfile === sub
                                    ? 'bg-[#CC6543]/25 text-[#DE7C5A] border-[#CC6543]'
                                    : 'bg-[#191816] text-[#706B62] border-[#383530] hover:text-white'
                                }`}
                              >
                                {sub}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Notes */}
                    <div className="space-y-1">
                      <input
                        type="text"
                        placeholder="Notes (optional)..."
                        value={editNotes}
                        onChange={(e) => setEditNotes(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveEdit(workout.id);
                          if (e.key === 'Escape') handleCancelEdit();
                        }}
                        className="w-full bg-[#191816] border border-[#383530] focus:border-[#CC6543] rounded-xl px-3 py-1.5 text-xs text-[#F5F2EB] placeholder-[#524E48] focus:outline-none transition"
                      />
                    </div>

                    {/* Error message */}
                    {editError && (
                      <p className="text-xs text-[#D45B5B] font-medium">{editError}</p>
                    )}

                    {/* Bottom Actions */}
                    <div className="flex items-center justify-end gap-2 pt-1 border-t border-[#383530]">
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        disabled={isSavingEdit}
                        className="px-3.5 py-1.5 rounded-xl bg-[#191816] border border-[#383530] text-xs font-semibold text-[#A8A297] hover:text-white transition"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(workout.id)}
                        disabled={isSavingEdit}
                        className="px-4 py-1.5 rounded-xl bg-[#CC6543] hover:bg-[#DE7C5A] text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-[#CC6543]/25 active:scale-95 disabled:opacity-50"
                      >
                        <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>{isSavingEdit ? 'Saving...' : 'Save Changes'}</span>
                      </button>
                    </div>
                  </div>
                );
              }

              // NORMAL DISPLAY ROW
              return (
                <div
                  key={workout.id}
                  className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex flex-wrap items-center gap-2.5 text-sm">
                      <span className="font-bold text-[#F5F2EB] text-sm tracking-wider">
                        {formatStandardDate(workout.date)}
                      </span>
                      <span className="text-[#CC6543] font-bold text-sm">
                        {workout.sets} sets × {workout.reps} reps
                      </span>

                      {/* Interactive Weight Badge: click to edit weight directly */}
                      {workout.weight !== null && workout.weight !== undefined && workout.weight > 0 ? (
                        <button
                          type="button"
                          onClick={() => handleStartEdit(workout)}
                          className="group/w inline-flex items-center gap-1 font-bold text-sm text-[#DE7C5A] bg-[#CC6543]/10 hover:bg-[#CC6543]/20 border border-[#CC6543]/30 px-2 py-0.5 rounded-lg transition active:scale-95 cursor-pointer"
                          title="Click to edit weight or set details"
                        >
                          <span>@ {workout.weight} kg</span>
                          <Pencil className="w-3 h-3 opacity-60 group-hover/w:opacity-100 transition-opacity text-[#DE7C5A]" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleStartEdit(workout)}
                          className="group/w inline-flex items-center gap-1 text-xs text-[#706B62] hover:text-[#CC6543] border border-dashed border-[#383530] hover:border-[#CC6543] px-2 py-0.5 rounded-lg transition active:scale-95 cursor-pointer"
                          title="Click to add weight to this set"
                        >
                          <span>+ Add weight</span>
                          <Pencil className="w-3 h-3 opacity-60 group-hover/w:opacity-100 transition-opacity" />
                        </button>
                      )}

                      <span className="text-xs text-[#A8A297]">
                        ({workout.rir} RIR)
                      </span>
                      {workout.profile && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#252320] border border-[#383530] text-[#CC6543]">
                          {workout.profile}
                          {workout.sub_profile ? ` / ${workout.sub_profile}` : ''}
                        </span>
                      )}
                    </div>

                    {workout.notes && (
                      <p className="text-xs text-[#A8A297]">
                        "{workout.notes}"
                      </p>
                    )}
                  </div>

                  {/* Actions & Sync State */}
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {isPending ? (
                      <span className="inline-flex items-center gap-1 text-[10px] text-[#F0BD85] mr-1">
                        <Clock className="w-3 h-3" /> Local
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] text-[#B8D4B5] mr-1">
                        <CheckCircle2 className="w-3 h-3" /> Synced
                      </span>
                    )}

                    {/* Edit button */}
                    {onUpdateWorkout && (
                      <button
                        type="button"
                        onClick={() => handleStartEdit(workout)}
                        className="text-[#706B62] hover:text-[#CC6543] hover:bg-[#CC6543]/10 p-1.5 rounded-lg transition-colors"
                        title="Edit logged workout (weight, sets, reps, fatigue)"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    )}

                    {/* Delete button */}
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
                        className="text-[#706B62] hover:text-[#D45B5B] hover:bg-[#D45B5B]/10 p-1.5 rounded-lg transition-colors"
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
    </div>
  );
};
