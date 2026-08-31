import React, { useState } from 'react';
import { Check, Plus, Calendar, FolderPlus, X } from 'lucide-react';

interface WorkoutFormProps {
  profiles?: string[];
  onCreateProfile?: (name: string) => Promise<string>;
  onAddWorkout: (data: {
    exercise_name: string;
    sets: number;
    reps: number;
    rir: number;
    weight?: number | null;
    profile?: string | null;
    date: string;
    notes?: string;
  }) => Promise<any>;
  onBack?: () => void;
  onSuccessNavigate?: (exerciseName: string) => void;
}

const RIR_OPTIONS = [
  { val: 0, label: '0', desc: 'Failure' },
  { val: 1, label: '1', desc: '1 left' },
  { val: 2, label: '2', desc: '2 left' },
  { val: 3, label: '3', desc: '3 left' },
  { val: 4, label: '4+', desc: 'Warmup' },
];

export const WorkoutForm: React.FC<WorkoutFormProps> = ({
  profiles = [],
  onCreateProfile,
  onAddWorkout,
  onSuccessNavigate,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];

  const [date, setDate] = useState<string>(todayStr);
  const [exerciseName, setExerciseName] = useState('');
  const [sets, setSets] = useState<number>(3);
  const [reps, setReps] = useState<number>(10);
  const [weight, setWeight] = useState<string>('');
  const [rir, setRir] = useState<number>(2);
  const [selectedProfile, setSelectedProfile] = useState<string | null>(null);
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState(false);
  const [lastLoggedName, setLastLoggedName] = useState<string | null>(null);
  const [lastLoggedProfile, setLastLoggedProfile] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const effectiveDate = date.trim() || todayStr;

    if (!exerciseName.trim()) {
      setError('Please enter an exercise name');
      return;
    }
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
      const loggedName = exerciseName.trim();
      const parsedWeight = weight.trim() !== '' ? parseFloat(weight) : null;

      await onAddWorkout({
        exercise_name: loggedName,
        sets,
        reps,
        rir,
        weight: parsedWeight,
        profile: selectedProfile,
        date: effectiveDate,
        notes: notes.trim() || undefined,
      });

      setLastLoggedName(loggedName);
      setLastLoggedProfile(selectedProfile);
      setSuccessMessage(true);
      setTimeout(() => setSuccessMessage(false), 3500);
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
    <div className="min-h-[85vh] flex flex-col justify-center max-w-2xl mx-auto px-4 py-10 select-none animate-slide-up font-sans">
      {/* Clean Bold Title */}
      <div className="mb-12 pb-6 border-b border-[#383530]/50 text-left">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-[#F5F2EB] leading-tight">
          Log Exercise
        </h1>
      </div>

      {/* Success Banner */}
      {successMessage && lastLoggedName && (
        <div className="mb-10 p-4 rounded-2xl bg-[#789D74]/15 border border-[#789D74]/30 text-[#B8D4B5] text-sm flex items-center justify-between animate-pop-in">
          <div className="flex items-center gap-2.5">
            <Check className="w-5 h-5 text-[#789D74]" />
            <span>
              <strong className="font-bold text-white text-base">{lastLoggedName}</strong> saved
              {lastLoggedProfile ? (
                <span className="text-white/80 font-normal"> into <strong className="font-semibold text-[#F5F2EB]">{lastLoggedProfile}</strong></span>
              ) : (
                <span className="text-white/80 font-normal"> into <span className="text-[#A8A297]">General Exercises</span></span>
              )}.
            </span>
          </div>
          {onSuccessNavigate && (
            <button
              type="button"
              onClick={() => onSuccessNavigate(lastLoggedName)}
              className="text-xs uppercase tracking-wider underline text-white hover:text-claude-terracottaLight transition ml-4 shrink-0 font-medium"
            >
              View History →
            </button>
          )}
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="mb-10 p-4 rounded-2xl bg-[#D45B5B]/15 border border-[#D45B5B]/30 text-[#F5B5B5] text-sm animate-pop-in">
          {error}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-10 sm:space-y-12">
        {/* Field 1: Standard dd/mm/yy Date Input */}
        <div className="flex items-center gap-3 border-b border-[#383530]/60 pb-6 focus-within:border-[#CC6543] transition-colors group">
          <Calendar className="w-4 h-4 text-[#CC6543] shrink-0" />
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            onBlur={() => {
              if (!date) setDate(todayStr);
            }}
            className="w-full bg-transparent text-lg sm:text-xl font-bold text-[#F5F2EB] tracking-wider focus:outline-none cursor-pointer [color-scheme:dark]"
            title="Date of workout"
          />
        </div>

        {/* Field 2: Exercise Name */}
        <div className="space-y-3 border-b border-[#383530]/60 pb-7 focus-within:border-[#CC6543] transition-colors">
          <label className="block text-xs tracking-widest uppercase text-[#A8A297] font-medium">
            Exercise Name
          </label>
          <input
            type="text"
            placeholder="e.g. Bench Press, Wrist Curl, Lateral Raise..."
            value={exerciseName}
            onChange={(e) => setExerciseName(e.target.value)}
            className="w-full bg-transparent text-lg sm:text-xl font-bold text-[#F5F2EB] placeholder-[#524E48] focus:outline-none transition-colors"
          />
        </div>

        {/* Field 3: Add Profile Section (Choose to make or not) */}
        <div className="space-y-3 border-b border-[#383530]/60 pb-7">
          <div className="flex items-center justify-between">
            <label className="block text-xs tracking-widest uppercase text-[#A8A297] font-medium">
              Workout Profile
            </label>
            {selectedProfile && (
              <button
                type="button"
                onClick={() => setSelectedProfile(null)}
                className="text-[11px] text-[#706B62] hover:text-[#CC6543] transition underline"
              >
                Reset to None (General)
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            {/* None / General (Default) */}
            <button
              type="button"
              onClick={() => setSelectedProfile(null)}
              className={`px-3.5 py-1.5 rounded-full text-xs transition-all duration-200 ${
                selectedProfile === null
                  ? 'bg-[#383530] text-white font-bold shadow-sm'
                  : 'bg-[#252320] border border-[#383530] text-[#A8A297] hover:text-[#F5F2EB]'
              }`}
            >
              None (General)
            </button>

            {/* Existing user-created profiles */}
            {profiles.map((p) => {
              const isSelected = selectedProfile === p;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setSelectedProfile(p)}
                  className={`px-3.5 py-1.5 rounded-full text-xs transition-all duration-200 ${
                    isSelected
                      ? 'bg-[#CC6543] text-white font-bold shadow-sm'
                      : 'bg-[#252320] border border-[#383530] text-[#A8A297] hover:text-[#F5F2EB] hover:border-[#4D4740]'
                  }`}
                >
                  {p}
                </button>
              );
            })}

            {/* + Add / New Profile Button */}
            {onCreateProfile && (
              !isCreatingProfile ? (
                <button
                  type="button"
                  onClick={() => setIsCreatingProfile(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs bg-[#252320]/60 border border-dashed border-[#4D4740] text-[#A8A297] hover:text-[#F5F2EB] hover:border-[#CC6543] transition-all"
                >
                  <FolderPlus className="w-3.5 h-3.5 text-[#CC6543]" />
                  <span>+ New Profile</span>
                </button>
              ) : (
                <div className="inline-flex items-center gap-1.5 bg-[#252320] border border-[#CC6543] rounded-full px-3 py-1 animate-pop-in">
                  <input
                    type="text"
                    placeholder="Profile name (e.g. Armwrestling)..."
                    value={newProfileName}
                    onChange={(e) => setNewProfileName(e.target.value)}
                    autoFocus
                    className="bg-transparent text-xs text-[#F5F2EB] placeholder-[#524E48] focus:outline-none w-48"
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
                </div>
              )
            )}
          </div>
        </div>

        {/* Field 4: Unified Sets, Reps & Weight Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 border-b border-[#383530]/60 pb-9">
          {/* Sets */}
          <div className="space-y-3">
            <label className="block text-xs tracking-widest uppercase text-[#A8A297] font-medium">
              Number of Sets
            </label>
            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => adjustValue(setSets, -1, 1)}
                className="w-9 h-9 rounded-full border border-[#383530] hover:border-[#4D4740] bg-[#252320] hover:bg-[#2E2B27] text-[#F5F2EB] text-base font-bold flex items-center justify-center active:scale-90 transition-all shrink-0"
              >
                -
              </button>
              <span className="text-3xl sm:text-4xl font-bold text-[#F5F2EB] flex-1 text-center tracking-tight">
                {sets}
              </span>
              <button
                type="button"
                onClick={() => adjustValue(setSets, 1, 1)}
                className="w-9 h-9 rounded-full border border-[#383530] hover:border-[#4D4740] bg-[#252320] hover:bg-[#2E2B27] text-[#F5F2EB] text-base font-bold flex items-center justify-center active:scale-90 transition-all shrink-0"
              >
                +
              </button>
            </div>
          </div>

          {/* Reps */}
          <div className="space-y-3">
            <label className="block text-xs tracking-widest uppercase text-[#A8A297] font-medium">
              Reps per Set
            </label>
            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => adjustValue(setReps, -1, 1)}
                className="w-9 h-9 rounded-full border border-[#383530] hover:border-[#4D4740] bg-[#252320] hover:bg-[#2E2B27] text-[#F5F2EB] text-base font-bold flex items-center justify-center active:scale-90 transition-all shrink-0"
              >
                -
              </button>
              <span className="text-3xl sm:text-4xl font-bold text-[#F5F2EB] flex-1 text-center tracking-tight">
                {reps}
              </span>
              <button
                type="button"
                onClick={() => adjustValue(setReps, 1, 1)}
                className="w-9 h-9 rounded-full border border-[#383530] hover:border-[#4D4740] bg-[#252320] hover:bg-[#2E2B27] text-[#F5F2EB] text-base font-bold flex items-center justify-center active:scale-90 transition-all shrink-0"
              >
                +
              </button>
            </div>
          </div>

          {/* Weight Option */}
          <div className="space-y-3">
            <label className="block text-xs tracking-widest uppercase text-[#A8A297] font-medium">
              Weight (kg)
            </label>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => adjustWeight(-2.5)}
                className="px-2.5 h-9 rounded-full border border-[#383530] hover:border-[#4D4740] bg-[#252320] hover:bg-[#2E2B27] text-[#A8A297] hover:text-[#F5F2EB] text-xs font-semibold flex items-center justify-center active:scale-90 transition-all shrink-0"
                title="-2.5 kg"
              >
                -2.5
              </button>
              <div className="flex-1 flex items-center justify-center">
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  placeholder="0"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="w-full bg-transparent text-3xl sm:text-4xl font-bold text-[#F5F2EB] text-center focus:outline-none placeholder-[#524E48] tracking-tight [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
              <button
                type="button"
                onClick={() => adjustWeight(2.5)}
                className="px-2.5 h-9 rounded-full border border-[#383530] hover:border-[#4D4740] bg-[#252320] hover:bg-[#2E2B27] text-[#A8A297] hover:text-[#F5F2EB] text-xs font-semibold flex items-center justify-center active:scale-90 transition-all shrink-0"
                title="+2.5 kg"
              >
                +2.5
              </button>
            </div>
          </div>
        </div>

        {/* Field 5: Reps in Reserve (RIR) */}
        <div className="space-y-4 border-b border-[#383530]/60 pb-9">
          <div className="flex items-baseline justify-between">
            <label className="block text-xs tracking-widest uppercase text-[#A8A297] font-medium">
              Reps in Reserve (RIR)
            </label>
            <span className="text-xs font-bold text-[#CC6543] tracking-wide">
              {rir} RIR ({RIR_OPTIONS.find((o) => o.val === Math.min(4, Math.floor(rir)))?.desc || 'Custom'})
            </span>
          </div>

          <div className="grid grid-cols-5 gap-3 pt-1">
            {RIR_OPTIONS.map((opt) => {
              const isSelected = rir === opt.val;
              return (
                <button
                  key={opt.val}
                  type="button"
                  onClick={() => setRir(opt.val)}
                  className={`flex flex-col items-center justify-center py-3 rounded-xl border transition-all duration-200 active:scale-95 ${
                    isSelected
                      ? 'bg-[#CC6543] border-[#CC6543] text-white shadow-md shadow-[#CC6543]/20 scale-[1.02]'
                      : 'bg-[#252320] border-[#383530] text-[#A8A297] hover:text-[#F5F2EB] hover:border-[#4D4740]'
                  }`}
                >
                  <span className="text-xl sm:text-2xl font-bold">
                    {opt.label}
                  </span>
                  <span className="text-[10px] opacity-80 mt-0.5 tracking-normal font-medium">
                    {opt.desc}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Field 6: Optional Notes */}
        <div className="space-y-3 border-b border-[#383530]/60 pb-8">
          <label className="block text-xs tracking-widest uppercase text-[#A8A297] font-medium">
            Notes (Optional)
          </label>
          <input
            type="text"
            placeholder="e.g. paused reps, feeling strong"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full bg-transparent text-base sm:text-lg text-[#F5F2EB] placeholder-[#524E48] focus:outline-none"
          />
        </div>

        {/* Submit Button */}
        <div className="pt-6 sm:pt-8 pb-10 flex justify-center">
          <button
            type="submit"
            disabled={isSubmitting}
            className="group flex items-center justify-center gap-2 px-8 py-3.5 rounded-full bg-[#CC6543] hover:bg-[#DE7C5A] hover:shadow-xl hover:shadow-[#CC6543]/30 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.97] disabled:opacity-50 text-white text-xs sm:text-sm font-semibold tracking-widest uppercase shadow-lg shadow-[#CC6543]/20 transition-all duration-200"
          >
            <Plus className="w-4 h-4 stroke-[2.5] transition-transform duration-200 group-hover:rotate-90" />
            <span>{isSubmitting ? 'Saving Log...' : 'Save Exercise Log'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
