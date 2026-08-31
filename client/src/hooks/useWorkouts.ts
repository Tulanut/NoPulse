import { useState, useEffect, useCallback, useMemo } from 'react';
import { localDB } from '../db/indexedDB';
import { syncService, SyncState } from '../services/syncService';
import { Workout, WorkoutFilter, WorkoutStats } from '../types/workout';
import { useNetworkStatus } from './useNetworkStatus';

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function useWorkouts() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [customProfiles, setCustomProfiles] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [syncState, setSyncState] = useState<SyncState>('idle');
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | undefined>(undefined);
  const [filter, setFilter] = useState<WorkoutFilter>({});

  const network = useNetworkStatus();

  // Reload local workouts and profiles from IndexedDB
  const refreshLocalWorkouts = useCallback(async () => {
    try {
      const data = await localDB.getAllWorkouts(false);
      const savedProfiles = await localDB.getCustomProfiles();
      setWorkouts(data);
      setCustomProfiles(savedProfiles);
    } catch (err) {
      console.error('Failed to load local workouts:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Sync listener subscription
  useEffect(() => {
    const unsubscribe = syncService.subscribe((state, lastSynced, error) => {
      setSyncState(state);
      setLastSyncedAt(lastSynced);
      setSyncError(error);
      if (state === 'idle') {
        refreshLocalWorkouts();
      }
    });

    return () => unsubscribe();
  }, [refreshLocalWorkouts]);

  // Initial load & trigger sync immediately
  useEffect(() => {
    refreshLocalWorkouts();
    syncService.runSync().then(() => refreshLocalWorkouts());
  }, [refreshLocalWorkouts]);

  // Trigger sync when transitioning to online
  useEffect(() => {
    if (network.isOnline) {
      syncService.runSync().then(() => {
        refreshLocalWorkouts();
      });
    }
  }, [network.isOnline, refreshLocalWorkouts]);

  // Unique list of all active profiles (user-created + logged)
  const profiles = useMemo(() => {
    const profileSet = new Set<string>();

    // Add stored custom profiles
    customProfiles.forEach((p) => {
      if (p.trim()) profileSet.add(p.trim());
    });

    // Add profiles present in logged workouts
    workouts.forEach((w) => {
      if (w.profile && w.profile.trim()) {
        profileSet.add(w.profile.trim());
      }
    });

    return Array.from(profileSet).sort();
  }, [customProfiles, workouts]);

  // Create a new workout profile
  const createProfile = useCallback(
    async (profileName: string): Promise<string> => {
      const trimmed = profileName.trim();
      if (!trimmed) return '';

      const updated = Array.from(new Set([...customProfiles, trimmed]));
      setCustomProfiles(updated);
      await localDB.saveCustomProfiles(updated);
      return trimmed;
    },
    [customProfiles]
  );

  // Delete a profile (removes profile and unassigns from workouts)
  const deleteProfile = useCallback(
    async (profileName: string) => {
      const trimmed = profileName.trim();
      const updated = customProfiles.filter((p) => p !== trimmed);
      setCustomProfiles(updated);
      await localDB.saveCustomProfiles(updated);

      // Unassign profile from matching workouts
      const workoutsWithProfile = workouts.filter((w) => w.profile === trimmed);
      for (const w of workoutsWithProfile) {
        await localDB.saveWorkout({
          ...w,
          profile: null,
          sync_status: 'pending',
          updated_at: new Date().toISOString(),
        });
      }

      await refreshLocalWorkouts();

      if (network.isOnline) {
        syncService.runSync().then(() => refreshLocalWorkouts());
      }
    },
    [customProfiles, workouts, network.isOnline, refreshLocalWorkouts]
  );

  // Update profile for all entries of an exercise
  const updateExerciseProfile = useCallback(
    async (exerciseName: string, newProfile: string | null) => {
      const trimmedProfile = newProfile ? newProfile.trim() : null;

      if (trimmedProfile && !customProfiles.includes(trimmedProfile)) {
        const next = [...customProfiles, trimmedProfile];
        setCustomProfiles(next);
        await localDB.saveCustomProfiles(next);
      }

      const matching = workouts.filter(
        (w) => w.exercise_name.toLowerCase() === exerciseName.toLowerCase()
      );

      for (const w of matching) {
        await localDB.saveWorkout({
          ...w,
          profile: trimmedProfile,
          sync_status: 'pending',
          updated_at: new Date().toISOString(),
        });
      }

      await refreshLocalWorkouts();

      if (network.isOnline) {
        syncService.runSync().then(() => refreshLocalWorkouts());
      }
    },
    [customProfiles, workouts, network.isOnline, refreshLocalWorkouts]
  );

  // Bulk update profile for multiple exercises
  const bulkUpdateExerciseProfile = useCallback(
    async (exerciseNames: string[], newProfile: string | null) => {
      const trimmedProfile = newProfile ? newProfile.trim() : null;
      const nameSet = new Set(exerciseNames.map((n) => n.toLowerCase()));

      if (trimmedProfile && !customProfiles.includes(trimmedProfile)) {
        const next = [...customProfiles, trimmedProfile];
        setCustomProfiles(next);
        await localDB.saveCustomProfiles(next);
      }

      const matching = workouts.filter((w) => nameSet.has(w.exercise_name.toLowerCase()));

      for (const w of matching) {
        await localDB.saveWorkout({
          ...w,
          profile: trimmedProfile,
          sync_status: 'pending',
          updated_at: new Date().toISOString(),
        });
      }

      await refreshLocalWorkouts();

      if (network.isOnline) {
        syncService.runSync().then(() => refreshLocalWorkouts());
      }
    },
    [customProfiles, workouts, network.isOnline, refreshLocalWorkouts]
  );

  // Bulk delete all entries for multiple exercises
  const bulkDeleteExercises = useCallback(
    async (exerciseNames: string[]) => {
      const nameSet = new Set(exerciseNames.map((n) => n.toLowerCase()));
      const toDelete = workouts.filter((w) => nameSet.has(w.exercise_name.toLowerCase()));

      for (const w of toDelete) {
        await localDB.deleteWorkout(w.id);
      }

      await refreshLocalWorkouts();

      if (network.isOnline) {
        syncService.runSync().then(() => refreshLocalWorkouts());
      }
    },
    [workouts, network.isOnline, refreshLocalWorkouts]
  );

  // Add a new workout log
  const addWorkout = useCallback(
    async (data: {
      exercise_name: string;
      sets: number;
      reps: number;
      rir: number;
      weight?: number | null;
      profile?: string | null;
      date: string;
      notes?: string;
    }) => {
      const now = new Date().toISOString();
      const trimmedProfile = data.profile ? data.profile.trim() : null;

      const newWorkout: Workout = {
        id: generateUUID(),
        exercise_name: data.exercise_name.trim(),
        sets: data.sets,
        reps: data.reps,
        rir: data.rir,
        weight: data.weight ?? null,
        profile: trimmedProfile,
        date: data.date || now.split('T')[0],
        notes: data.notes?.trim() || null,
        created_at: now,
        updated_at: now,
        is_deleted: 0,
        sync_status: 'pending',
      };

      // 1. If profile is new, also save to custom profiles
      if (trimmedProfile && !customProfiles.includes(trimmedProfile)) {
        const nextProfiles = [...customProfiles, trimmedProfile];
        setCustomProfiles(nextProfiles);
        await localDB.saveCustomProfiles(nextProfiles);
      }

      // 2. Save immediately to local IndexedDB
      await localDB.saveWorkout(newWorkout);
      await refreshLocalWorkouts();

      // 3. If online, initiate background sync
      if (network.isOnline) {
        syncService.runSync().then(() => refreshLocalWorkouts());
      }

      return newWorkout;
    },
    [customProfiles, network.isOnline, refreshLocalWorkouts]
  );

  // Delete a single workout entry by ID
  const deleteWorkout = useCallback(
    async (id: string) => {
      await localDB.deleteWorkout(id);
      await refreshLocalWorkouts();

      if (network.isOnline) {
        syncService.runSync().then(() => refreshLocalWorkouts());
      }
    },
    [network.isOnline, refreshLocalWorkouts]
  );

  // Delete all entries for an exercise
  const deleteExercise = useCallback(
    async (exerciseName: string, profile?: string) => {
      const toDelete = workouts.filter((w) => {
        const nameMatches = w.exercise_name.toLowerCase() === exerciseName.toLowerCase();
        if (profile) {
          return nameMatches && w.profile === profile;
        }
        return nameMatches;
      });

      for (const w of toDelete) {
        await localDB.deleteWorkout(w.id);
      }
      await refreshLocalWorkouts();

      if (network.isOnline) {
        syncService.runSync().then(() => refreshLocalWorkouts());
      }
    },
    [workouts, network.isOnline, refreshLocalWorkouts]
  );

  // Manual sync trigger
  const manualSync = useCallback(async () => {
    const result = await syncService.runSync();
    await refreshLocalWorkouts();
    return result;
  }, [refreshLocalWorkouts]);

  // Filtered workouts
  const filteredWorkouts = useMemo(() => {
    return workouts.filter((w) => {
      if (filter.profile && w.profile !== filter.profile) {
        return false;
      }
      if (filter.exercise && !w.exercise_name.toLowerCase().includes(filter.exercise.toLowerCase())) {
        return false;
      }
      if (filter.date && w.date !== filter.date) {
        return false;
      }
      if (
        filter.searchQuery &&
        !w.exercise_name.toLowerCase().includes(filter.searchQuery.toLowerCase()) &&
        !w.notes?.toLowerCase().includes(filter.searchQuery.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [workouts, filter]);

  // Workout metrics & statistics
  const stats: WorkoutStats = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const totalWorkouts = workouts.length;
    const totalSets = workouts.reduce((sum, w) => sum + w.sets, 0);
    const totalReps = workouts.reduce((sum, w) => sum + w.sets * w.reps, 0);
    const todayCount = workouts.filter((w) => w.date === todayStr).length;
    const avgRir = totalWorkouts > 0 ? workouts.reduce((sum, w) => sum + w.rir, 0) / totalWorkouts : 0;

    return {
      totalWorkouts,
      totalSets,
      totalReps,
      avgRir: Math.round(avgRir * 10) / 10,
      todayCount,
    };
  }, [workouts]);

  const pendingSyncCount = useMemo(() => {
    return workouts.filter((w) => w.sync_status === 'pending').length;
  }, [workouts]);

  return {
    workouts: filteredWorkouts,
    allWorkouts: workouts,
    profiles,
    createProfile,
    deleteProfile,
    deleteExercise,
    updateExerciseProfile,
    bulkUpdateExerciseProfile,
    bulkDeleteExercises,
    loading,
    syncState,
    lastSyncedAt,
    syncError,
    pendingSyncCount,
    network,
    filter,
    setFilter,
    stats,
    addWorkout,
    deleteWorkout,
    manualSync,
    refreshLocalWorkouts,
  };
}
