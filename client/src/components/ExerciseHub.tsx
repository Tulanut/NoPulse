import React, { useState, useMemo } from 'react';
import {
  ArrowRight,
  Plus,
  Search,
  Folder,
  ArrowLeft,
  Trash2,
  CheckSquare,
  Square,
  FolderPlus,
  X,
} from 'lucide-react';
import { Workout } from '../types/workout';
import { formatSpelledDate } from '../utils/dateUtils';

interface ExerciseHubProps {
  workouts: Workout[];
  profiles: string[];
  onCreateProfile: (name: string) => Promise<string>;
  onDeleteProfile?: (profileName: string) => Promise<void> | void;
  onDeleteExercise?: (exerciseName: string, profile?: string) => Promise<void> | void;
  onBulkUpdateExerciseProfile?: (exerciseNames: string[], newProfile: string | null) => Promise<void> | void;
  onBulkDeleteExercises?: (exerciseNames: string[]) => Promise<void> | void;
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
  onDeleteProfile,
  onDeleteExercise,
  onBulkUpdateExerciseProfile,
  onBulkDeleteExercises,
  onSelectExercise,
  onGoToLog,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeProfile, setActiveProfile] = useState<string | null>(null);
  const [deleteConfirmProfile, setDeleteConfirmProfile] = useState<string | null>(null);
  const [deleteConfirmExercise, setDeleteConfirmExercise] = useState<string | null>(null);

  // Bulk Selection State
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedExercises, setSelectedExercises] = useState<Set<string>>(new Set());
  const [showProfilePicker, setShowProfilePicker] = useState(false);
  const [isCreatingBulkProfile, setIsCreatingBulkProfile] = useState(false);
  const [bulkNewProfileName, setBulkNewProfileName] = useState('');
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);

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

  // Bulk selection helpers
  const toggleSelectExercise = (name: string) => {
    setSelectedExercises((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  const selectAll = () => {
    const allNames = filteredSummaries.map((s) => s.name);
    setSelectedExercises(new Set(allNames));
  };

  const deselectAll = () => {
    setSelectedExercises(new Set());
  };

  const exitSelectionMode = () => {
    setIsSelecting(false);
    setSelectedExercises(new Set());
    setShowProfilePicker(false);
    setIsCreatingBulkProfile(false);
    setConfirmBulkDelete(false);
  };

  // Bulk Actions
  const handleBulkMoveToProfile = async (targetProfile: string | null) => {
    if (selectedExercises.size === 0 || !onBulkUpdateExerciseProfile) return;
    const names = Array.from(selectedExercises);
    await onBulkUpdateExerciseProfile(names, targetProfile);
    exitSelectionMode();
  };

  const handleBulkCreateProfileAndMove = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkNewProfileName.trim() || selectedExercises.size === 0 || !onBulkUpdateExerciseProfile) return;

    const created = await onCreateProfile(bulkNewProfileName.trim());
    const names = Array.from(selectedExercises);
    await onBulkUpdateExerciseProfile(names, created);
    setBulkNewProfileName('');
    exitSelectionMode();
  };

  const handleBulkDelete = async () => {
    if (selectedExercises.size === 0 || !onBulkDeleteExercises) return;
    const names = Array.from(selectedExercises);
    await onBulkDeleteExercises(names);
    exitSelectionMode();
  };

  // Single item delete click handlers
  const handleDeleteProfileClick = (e: React.MouseEvent, profileName: string) => {
    e.stopPropagation();
    setDeleteConfirmProfile(profileName);
  };

  const handleConfirmDeleteProfile = async (e: React.MouseEvent, profileName: string) => {
    e.stopPropagation();
    if (onDeleteProfile) {
      await onDeleteProfile(profileName);
      if (activeProfile === profileName) {
        setActiveProfile(null);
      }
    }
    setDeleteConfirmProfile(null);
  };

  const handleDeleteExerciseClick = (e: React.MouseEvent, exerciseName: string) => {
    e.stopPropagation();
    setDeleteConfirmExercise(exerciseName);
  };

  const handleConfirmDeleteExercise = async (e: React.MouseEvent, exerciseName: string) => {
    e.stopPropagation();
    if (onDeleteExercise) {
      await onDeleteExercise(exerciseName, activeProfile || undefined);
    }
    setDeleteConfirmExercise(null);
  };

  // Render Exercise Item Row
  const renderExerciseRow = (item: ExerciseSummary) => {
    const isChecked = selectedExercises.has(item.name);

    return (
      <div
        key={item.name}
        className={`py-5 flex items-center justify-between gap-4 transition-all duration-200 group rounded-xl px-2.5 -mx-2.5 ${
          isSelecting
            ? isChecked
              ? 'bg-[#CC6543]/10 border border-[#CC6543]/40'
              : 'hover:bg-[#252320]/60 border border-transparent'
            : 'hover:translate-x-1'
        }`}
      >
        {/* If in selection mode, show checkbox */}
        {isSelecting && (
          <button
            type="button"
            onClick={() => toggleSelectExercise(item.name)}
            className="p-1 text-[#CC6543] hover:scale-110 active:scale-95 transition shrink-0"
          >
            {isChecked ? (
              <CheckSquare className="w-5 h-5 fill-[#CC6543] text-[#191816]" />
            ) : (
              <Square className="w-5 h-5 text-[#706B62]" />
            )}
          </button>
        )}

        <button
          onClick={() => {
            if (isSelecting) {
              toggleSelectExercise(item.name);
            } else {
              onSelectExercise(item.name);
            }
          }}
          className="space-y-1.5 flex-1 text-left"
        >
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
        </button>

        {/* Normal Actions (hidden during selection) */}
        {!isSelecting && (
          <div className="flex items-center gap-2 shrink-0">
            {onDeleteExercise && (
              deleteConfirmExercise === item.name ? (
                <div className="flex items-center gap-1.5 bg-[#D45B5B]/15 border border-[#D45B5B]/30 px-2.5 py-1 rounded-full animate-pop-in">
                  <span className="text-[10px] text-[#F5B5B5]">Delete?</span>
                  <button
                    onClick={(e) => handleConfirmDeleteExercise(e, item.name)}
                    className="text-[10px] text-[#D45B5B] hover:text-red-400 font-bold uppercase underline"
                  >
                    Yes
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteConfirmExercise(null);
                    }}
                    className="text-[10px] text-[#A8A297] hover:text-white"
                  >
                    No
                  </button>
                </div>
              ) : (
                <button
                  onClick={(e) => handleDeleteExerciseClick(e, item.name)}
                  className="p-2 rounded-full text-[#706B62] hover:text-[#D45B5B] hover:bg-[#D45B5B]/10 transition-colors opacity-70 group-hover:opacity-100"
                  title={`Delete ${item.name}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )
            )}

            <button
              onClick={() => onSelectExercise(item.name)}
              className="w-10 h-10 rounded-full border border-[#383530] group-hover:border-[#CC6543] group-hover:bg-[#CC6543]/10 flex items-center justify-center text-[#A8A297] group-hover:text-[#DE7C5A] transition-all duration-200"
            >
              <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </button>
          </div>
        )}
      </div>
    );
  };

  // -------------------------------------------------------------
  // FLOATING BULK ACTIONS BAR (When exercises are selected)
  // -------------------------------------------------------------
  const renderBulkActionBar = () => {
    if (!isSelecting || selectedExercises.size === 0) return null;

    return (
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-xl px-4 animate-slide-up">
        <div className="bg-[#1E1D1A]/95 border border-[#CC6543]/60 rounded-2xl p-4 shadow-2xl backdrop-blur-md flex flex-col gap-3 text-sm">
          <div className="flex items-center justify-between pb-2 border-b border-[#383530]">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-[#CC6543] text-white font-bold text-xs">
                {selectedExercises.size}
              </span>
              <span className="font-bold text-[#F5F2EB]">
                {selectedExercises.size === 1 ? 'Exercise Selected' : 'Exercises Selected'}
              </span>
            </div>

            <button
              onClick={exitSelectionMode}
              className="text-xs text-[#A8A297] hover:text-white flex items-center gap-1"
            >
              <X className="w-4 h-4" />
              <span>Cancel</span>
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {/* 1. Add / Move to Profile */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowProfilePicker(!showProfilePicker)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#252320] border border-[#383530] hover:border-[#CC6543] text-xs font-semibold text-[#F5F2EB] hover:text-white transition"
              >
                <FolderPlus className="w-3.5 h-3.5 text-[#CC6543]" />
                <span>Move to Profile</span>
              </button>

              {/* Profile Picker Dropdown / Popover */}
              {showProfilePicker && (
                <div className="absolute bottom-full left-0 mb-2 w-64 bg-[#252320] border border-[#383530] rounded-xl shadow-2xl p-3 space-y-2 z-50 animate-pop-in">
                  <span className="text-[10px] uppercase font-bold text-[#A8A297] tracking-wider block pb-1 border-b border-[#383530]">
                    Select Target Profile
                  </span>

                  {/* Remove from Profile (Make General) */}
                  <button
                    type="button"
                    onClick={() => handleBulkMoveToProfile(null)}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-[#383530] text-xs text-[#F5F2EB] transition flex items-center justify-between"
                  >
                    <span>None (General Exercises)</span>
                  </button>

                  {/* Existing Profiles */}
                  {profiles.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => handleBulkMoveToProfile(p)}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-[#CC6543]/20 hover:text-white text-xs text-[#F5F2EB] transition flex items-center justify-between"
                    >
                      <span>{p}</span>
                    </button>
                  ))}

                  {/* Create New Profile Inline */}
                  <div className="pt-2 border-t border-[#383530]">
                    {!isCreatingBulkProfile ? (
                      <button
                        type="button"
                        onClick={() => setIsCreatingBulkProfile(true)}
                        className="w-full text-left px-2 py-1 text-xs text-[#CC6543] hover:underline flex items-center gap-1 font-semibold"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Create New Profile...</span>
                      </button>
                    ) : (
                      <form onSubmit={handleBulkCreateProfileAndMove} className="space-y-2">
                        <input
                          type="text"
                          placeholder="New profile name..."
                          value={bulkNewProfileName}
                          onChange={(e) => setBulkNewProfileName(e.target.value)}
                          autoFocus
                          className="w-full bg-[#191816] border border-[#CC6543] rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none"
                        />
                        <div className="flex gap-1.5">
                          <button
                            type="submit"
                            className="flex-1 bg-[#CC6543] hover:bg-[#DE7C5A] text-white py-1 rounded text-[11px] font-bold"
                          >
                            Create & Move
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsCreatingBulkProfile(false)}
                            className="px-2 py-1 text-[11px] text-[#A8A297]"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* 2. Delete All Selected */}
            <div className="relative">
              {!confirmBulkDelete ? (
                <button
                  type="button"
                  onClick={() => setConfirmBulkDelete(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#D45B5B]/15 border border-[#D45B5B]/30 hover:bg-[#D45B5B]/25 text-xs font-semibold text-[#F5B5B5] transition"
                >
                  <Trash2 className="w-3.5 h-3.5 text-[#D45B5B]" />
                  <span>Delete Selected</span>
                </button>
              ) : (
                <div className="inline-flex items-center gap-2 bg-[#D45B5B]/20 border border-[#D45B5B] px-3 py-1 rounded-xl animate-pop-in">
                  <span className="text-xs text-[#F5B5B5] font-bold">Delete {selectedExercises.size} exercises?</span>
                  <button
                    type="button"
                    onClick={handleBulkDelete}
                    className="text-xs bg-[#D45B5B] hover:bg-red-600 text-white font-bold px-2 py-0.5 rounded uppercase"
                  >
                    Confirm
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmBulkDelete(false)}
                    className="text-xs text-[#A8A297] hover:text-white"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // -------------------------------------------------------------
  // VIEW 1: DRILLDOWN INTO A SPECIFIC WORKOUT PROFILE
  // -------------------------------------------------------------
  if (activeProfile) {
    return (
      <div className="min-h-[85vh] flex flex-col justify-center max-w-3xl mx-auto px-4 py-8 select-none animate-slide-up font-sans">
        {/* Back Button */}
        <button
          onClick={() => {
            exitSelectionMode();
            setActiveProfile(null);
          }}
          className="group inline-flex items-center gap-2 text-xs uppercase tracking-widest text-[#A8A297] hover:text-[#F5F2EB] active:scale-95 transition-all mb-4 font-medium"
        >
          <ArrowLeft className="w-4 h-4 transition-transform duration-200 group-hover:-translate-x-1" />
          <span>Back to Exercises</span>
        </button>

        {/* Profile Header */}
        <div className="mb-8 pb-6 border-b border-[#383530]/50 flex flex-col sm:flex-row sm:items-baseline justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#CC6543]/15 text-[#CC6543] flex items-center justify-center">
                <Folder className="w-5 h-5" />
              </div>
              <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-[#F5F2EB]">
                {activeProfile}
              </h1>

              {/* Profile Delete in Drilldown Header */}
              {onDeleteProfile && (
                deleteConfirmProfile === activeProfile ? (
                  <div className="flex items-center gap-2 bg-[#D45B5B]/15 border border-[#D45B5B]/30 px-3 py-1 rounded-full animate-pop-in ml-2">
                    <span className="text-[11px] text-[#F5B5B5] font-semibold">Delete Profile?</span>
                    <button
                      onClick={(e) => handleConfirmDeleteProfile(e, activeProfile)}
                      className="text-[11px] text-[#D45B5B] hover:text-red-400 font-bold uppercase underline"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteConfirmProfile(null);
                      }}
                      className="text-[11px] text-[#A8A297] hover:text-white"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={(e) => handleDeleteProfileClick(e, activeProfile)}
                    className="p-1.5 rounded-lg text-[#706B62] hover:text-[#D45B5B] hover:bg-[#D45B5B]/10 transition-colors ml-1"
                    title={`Delete "${activeProfile}" profile`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )
              )}
            </div>

            <p className="text-xs text-[#A8A297] mt-2">
              {filteredSummaries.length === 0
                ? 'No exercises recorded in this profile'
                : `${filteredSummaries.length} ${
                    filteredSummaries.length === 1 ? 'exercise' : 'exercises'
                  } in ${activeProfile}`}
            </p>
          </div>

          {/* Search & Bulk Select Trigger */}
          <div className="flex items-center gap-3 w-full sm:w-auto">
            {currentSummaries.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  if (isSelecting) exitSelectionMode();
                  else setIsSelecting(true);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                  isSelecting
                    ? 'bg-[#CC6543] text-white shadow-sm'
                    : 'bg-[#252320] border border-[#383530] text-[#A8A297] hover:text-white'
                }`}
              >
                {isSelecting ? 'Done' : 'Select'}
              </button>
            )}

            {currentSummaries.length > 0 && (
              <div className="relative flex-1 sm:w-56">
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
        </div>

        {/* Selection Bar inside Profile */}
        {isSelecting && filteredSummaries.length > 0 && (
          <div className="mb-4 flex items-center justify-between text-xs text-[#A8A297] bg-[#252320]/60 p-2.5 rounded-xl border border-[#383530]">
            <div className="flex items-center gap-2">
              <button
                onClick={selectAll}
                className="hover:text-white underline"
              >
                Select All ({filteredSummaries.length})
              </button>
              <span>·</span>
              <button
                onClick={deselectAll}
                className="hover:text-white underline"
              >
                Deselect All
              </button>
            </div>
            <span className="text-[#CC6543] font-bold">
              {selectedExercises.size} selected
            </span>
          </div>
        )}

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
            {filteredSummaries.map(renderExerciseRow)}
          </div>
        )}

        {/* Bulk Action Bar */}
        {renderBulkActionBar()}
      </div>
    );
  }

  // -------------------------------------------------------------
  // VIEW 2: GENERAL EXERCISES HUB
  // -------------------------------------------------------------
  return (
    <div className="min-h-[85vh] flex flex-col justify-center max-w-3xl mx-auto px-4 py-8 select-none animate-slide-up font-sans space-y-10">
      {/* Header & Search & Select Button */}
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

        {/* Controls: Search & Select */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {currentSummaries.length > 0 && (
            <button
              type="button"
              onClick={() => {
                if (isSelecting) exitSelectionMode();
                else setIsSelecting(true);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                isSelecting
                  ? 'bg-[#CC6543] text-white shadow-sm'
                  : 'bg-[#252320] border border-[#383530] text-[#A8A297] hover:text-white'
              }`}
            >
              {isSelecting ? 'Done' : 'Select'}
            </button>
          )}

          {workouts.length > 0 && (
            <div className="relative flex-1 sm:w-56">
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
      </div>

      {/* SECTION 1: WORKOUT PROFILE BOXES */}
      {profileCards.length > 0 && !isSelecting && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-widest text-[#A8A297] font-semibold">
              Workout Profiles
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {profileCards.map((p) => (
              <div
                key={p.name}
                onClick={() => {
                  setActiveProfile(p.name);
                  setSearchQuery('');
                  exitSelectionMode();
                }}
                className="group relative text-left p-5 rounded-2xl bg-[#252320]/80 border border-[#383530] hover:border-[#CC6543] hover:bg-[#252320] transition-all flex items-center justify-between gap-4 cursor-pointer active:scale-[0.99]"
              >
                <div className="flex items-center gap-3.5 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-[#CC6543]/15 text-[#CC6543] group-hover:bg-[#CC6543] group-hover:text-white flex items-center justify-center transition-all shrink-0">
                    <Folder className="w-5 h-5" />
                  </div>
                  <div className="truncate">
                    <h3 className="text-xl font-bold text-[#F5F2EB] group-hover:text-[#DE7C5A] transition-colors truncate">
                      {p.name}
                    </h3>
                    <p className="text-xs text-[#A8A297] mt-0.5">
                      {p.uniqueExercises} {p.uniqueExercises === 1 ? 'exercise' : 'exercises'} · {p.totalLogs} {p.totalLogs === 1 ? 'session' : 'sessions'}
                    </p>
                  </div>
                </div>

                {/* Right controls: Delete Profile + Arrow */}
                <div className="flex items-center gap-2 shrink-0">
                  {onDeleteProfile && (
                    deleteConfirmProfile === p.name ? (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1.5 bg-[#D45B5B]/15 border border-[#D45B5B]/30 px-2 py-1 rounded-full animate-pop-in"
                      >
                        <span className="text-[10px] text-[#F5B5B5]">Delete?</span>
                        <button
                          onClick={(e) => handleConfirmDeleteProfile(e, p.name)}
                          className="text-[10px] text-[#D45B5B] hover:text-red-400 font-bold uppercase underline"
                        >
                          Yes
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirmProfile(null);
                          }}
                          className="text-[10px] text-[#A8A297] hover:text-white"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={(e) => handleDeleteProfileClick(e, p.name)}
                        className="p-1.5 rounded-lg text-[#706B62] hover:text-[#D45B5B] hover:bg-[#D45B5B]/10 transition-colors opacity-70 group-hover:opacity-100"
                        title={`Delete ${p.name} profile`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )
                  )}

                  <div className="w-8 h-8 rounded-full border border-[#383530] group-hover:border-[#CC6543] group-hover:bg-[#CC6543]/10 flex items-center justify-center text-[#A8A297] group-hover:text-[#DE7C5A] transition-all">
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 2: GENERAL EXERCISES LIST */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          {profileCards.length > 0 && currentSummaries.length > 0 && (
            <span className="text-xs uppercase tracking-widest text-[#A8A297] font-semibold">
              General Exercises
            </span>
          )}
        </div>

        {/* Selection Helper Controls */}
        {isSelecting && filteredSummaries.length > 0 && (
          <div className="flex items-center justify-between text-xs text-[#A8A297] bg-[#252320]/60 p-2.5 rounded-xl border border-[#383530]">
            <div className="flex items-center gap-2">
              <button
                onClick={selectAll}
                className="hover:text-white underline"
              >
                Select All ({filteredSummaries.length})
              </button>
              <span>·</span>
              <button
                onClick={deselectAll}
                className="hover:text-white underline"
              >
                Deselect All
              </button>
            </div>
            <span className="text-[#CC6543] font-bold">
              {selectedExercises.size} selected
            </span>
          </div>
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
          <div className="divide-y divide-[#2E2B26]">
            {filteredSummaries.map(renderExerciseRow)}
          </div>
        )}
      </div>

      {/* Bulk Action Bar */}
      {renderBulkActionBar()}
    </div>
  );
};
