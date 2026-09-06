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
  const [customSubProfiles, setCustomSubProfiles] = useState<Record<string, string[]>>({});
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
      const savedSubProfiles = await localDB.getCustomSubProfiles();
      setWorkouts(data);
      setCustomProfiles(savedProfiles);
      setCustomSubProfiles(savedSubProfiles);
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

  // Unique list of all active sub-profiles grouped by parent profile
  const subProfiles = useMemo(() => {
    const map: Record<string, Set<string>> = {};

    // Add stored custom sub-profiles
    Object.entries(customSubProfiles).forEach(([p, subs]) => {
      if (!map[p]) map[p] = new Set();
      if (Array.isArray(subs)) {
        subs.forEach((s) => {
          if (s && s.trim()) map[p].add(s.trim());
        });
      }
    });

    // Add sub-profiles present in logged workouts
    workouts.forEach((w) => {
      if (w.profile && w.profile.trim() && w.sub_profile && w.sub_profile.trim()) {
        const p = w.profile.trim();
        if (!map[p]) map[p] = new Set();
        map[p].add(w.sub_profile.trim());
      }
    });

    const result: Record<string, string[]> = {};
    Object.entries(map).forEach(([p, set]) => {
      result[p] = Array.from(set).sort();
    });
    return result;
  }, [customSubProfiles, workouts]);

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

  // Delete a profile (removes profile, cascades sub-profiles, and unassigns from workouts)
  const deleteProfile = useCallback(
    async (profileName: string) => {
      const trimmed = profileName.trim();
      const updated = customProfiles.filter((p) => p !== trimmed);
      setCustomProfiles(updated);
      await localDB.saveCustomProfiles(updated);

      // Also remove associated sub-profiles
      const updatedSubs = { ...customSubProfiles };
      delete updatedSubs[trimmed];
      setCustomSubProfiles(updatedSubs);
      await localDB.saveCustomSubProfiles(updatedSubs);

      // Unassign profile from matching workouts
      const workoutsWithProfile = workouts.filter((w) => w.profile === trimmed);
      for (const w of workoutsWithProfile) {
        await localDB.saveWorkout({
          ...w,
          profile: null,
          sub_profile: null,
          sync_status: 'pending',
          updated_at: new Date().toISOString(),
        });
      }

      await refreshLocalWorkouts();

      if (network.isOnline) {
        syncService.runSync().then(() => refreshLocalWorkouts());
      }
    },
    [customProfiles, customSubProfiles, workouts, network.isOnline, refreshLocalWorkouts]
  );

  // Rename a profile and migrate all associated workouts & sub-profiles
  const renameProfile = useCallback(
    async (oldName: string, newName: string): Promise<boolean> => {
      const trimmedOld = oldName.trim();
      const trimmedNew = newName.trim();
      if (!trimmedNew || trimmedOld === trimmedNew) return false;

      // 1. Update custom profiles list
      const nextCustomProfiles = customProfiles.map((p) =>
        p.toLowerCase() === trimmedOld.toLowerCase() ? trimmedNew : p
      );
      if (!nextCustomProfiles.some((p) => p.toLowerCase() === trimmedNew.toLowerCase())) {
        nextCustomProfiles.push(trimmedNew);
      }
      const uniqueProfiles = Array.from(new Set(nextCustomProfiles));
      setCustomProfiles(uniqueProfiles);
      await localDB.saveCustomProfiles(uniqueProfiles);

      // 2. Cascade sub-profiles from old name to new name
      const updatedSubs = { ...customSubProfiles };
      if (updatedSubs[trimmedOld]) {
        updatedSubs[trimmedNew] = updatedSubs[trimmedOld];
        delete updatedSubs[trimmedOld];
        setCustomSubProfiles(updatedSubs);
        await localDB.saveCustomSubProfiles(updatedSubs);
      }

      // 3. Migrate all workouts assigned to oldName
      const matchingWorkouts = workouts.filter(
        (w) => w.profile && w.profile.toLowerCase() === trimmedOld.toLowerCase()
      );
      for (const w of matchingWorkouts) {
        await localDB.saveWorkout({
          ...w,
          profile: trimmedNew,
          sync_status: 'pending',
          updated_at: new Date().toISOString(),
        });
      }

      await refreshLocalWorkouts();

      if (network.isOnline) {
        syncService.runSync().then(() => refreshLocalWorkouts());
      }

      return true;
    },
    [customProfiles, customSubProfiles, workouts, network.isOnline, refreshLocalWorkouts]
  );

  // Create a new sub-profile (sub-folder) under a parent profile
  const createSubProfile = useCallback(
    async (profileName: string, subProfileName: string): Promise<string> => {
      const trimmedProfile = profileName.trim();
      const trimmedSub = subProfileName.trim();
      if (!trimmedProfile || !trimmedSub) return '';

      const currentSubs = customSubProfiles[trimmedProfile] || [];
      if (!currentSubs.some((s) => s.toLowerCase() === trimmedSub.toLowerCase())) {
        const next = {
          ...customSubProfiles,
          [trimmedProfile]: [...currentSubs, trimmedSub],
        };
        setCustomSubProfiles(next);
        await localDB.saveCustomSubProfiles(next);
      }
      return trimmedSub;
    },
    [customSubProfiles]
  );

  // Rename a sub-profile and migrate all matching workouts
  const renameSubProfile = useCallback(
    async (profileName: string, oldName: string, newName: string): Promise<boolean> => {
      const trimmedProfile = profileName.trim();
      const trimmedOld = oldName.trim();
      const trimmedNew = newName.trim();
      if (!trimmedProfile || !trimmedNew || trimmedOld === trimmedNew) return false;

      // 1. Update custom sub-profiles map
      const currentSubs = customSubProfiles[trimmedProfile] || [];
      const nextSubs = currentSubs.map((s) =>
        s.toLowerCase() === trimmedOld.toLowerCase() ? trimmedNew : s
      );
      if (!nextSubs.some((s) => s.toLowerCase() === trimmedNew.toLowerCase())) {
        nextSubs.push(trimmedNew);
      }
      const uniqueSubs = Array.from(new Set(nextSubs));
      const updatedMap = {
        ...customSubProfiles,
        [trimmedProfile]: uniqueSubs,
      };
      setCustomSubProfiles(updatedMap);
      await localDB.saveCustomSubProfiles(updatedMap);

      // 2. Migrate matching workouts
      const matching = workouts.filter(
        (w) =>
          w.profile &&
          w.profile.toLowerCase() === trimmedProfile.toLowerCase() &&
          w.sub_profile &&
          w.sub_profile.toLowerCase() === trimmedOld.toLowerCase()
      );

      for (const w of matching) {
        await localDB.saveWorkout({
          ...w,
          sub_profile: trimmedNew,
          sync_status: 'pending',
          updated_at: new Date().toISOString(),
        });
      }

      await refreshLocalWorkouts();

      if (network.isOnline) {
        syncService.runSync().then(() => refreshLocalWorkouts());
      }

      return true;
    },
    [customSubProfiles, workouts, network.isOnline, refreshLocalWorkouts]
  );

  // Delete a sub-profile (unassigns sub_profile from matching workouts without deleting them)
  const deleteSubProfile = useCallback(
    async (profileName: string, subProfileName: string): Promise<void> => {
      const trimmedProfile = profileName.trim();
      const trimmedSub = subProfileName.trim();
      if (!trimmedProfile || !trimmedSub) return;

      // 1. Remove from custom sub profiles
      const currentSubs = customSubProfiles[trimmedProfile] || [];
      const nextSubs = currentSubs.filter(
        (s) => s.toLowerCase() !== trimmedSub.toLowerCase()
      );
      const updatedMap = {
        ...customSubProfiles,
        [trimmedProfile]: nextSubs,
      };
      setCustomSubProfiles(updatedMap);
      await localDB.saveCustomSubProfiles(updatedMap);

      // 2. Unassign sub_profile from matching workouts
      const matching = workouts.filter(
        (w) =>
          w.profile &&
          w.profile.toLowerCase() === trimmedProfile.toLowerCase() &&
          w.sub_profile &&
          w.sub_profile.toLowerCase() === trimmedSub.toLowerCase()
      );

      for (const w of matching) {
        await localDB.saveWorkout({
          ...w,
          sub_profile: null,
          sync_status: 'pending',
          updated_at: new Date().toISOString(),
        });
      }

      await refreshLocalWorkouts();

      if (network.isOnline) {
        syncService.runSync().then(() => refreshLocalWorkouts());
      }
    },
    [customSubProfiles, workouts, network.isOnline, refreshLocalWorkouts]
  );

  // Update sub-profile for an exercise within a specific parent profile
  const updateExerciseSubProfile = useCallback(
    async (exerciseName: string, profileName: string, subProfile: string | null): Promise<void> => {
      const trimmedProfile = profileName.trim();
      const trimmedSub = subProfile ? subProfile.trim() : null;

      // Register sub-profile if new
      if (trimmedSub) {
        const currentSubs = customSubProfiles[trimmedProfile] || [];
        if (!currentSubs.some((s) => s.toLowerCase() === trimmedSub.toLowerCase())) {
          const nextMap = {
            ...customSubProfiles,
            [trimmedProfile]: [...currentSubs, trimmedSub],
          };
          setCustomSubProfiles(nextMap);
          await localDB.saveCustomSubProfiles(nextMap);
        }
      }

      // Update matching workouts
      const matching = workouts.filter(
        (w) =>
          w.exercise_name.toLowerCase() === exerciseName.toLowerCase() &&
          w.profile &&
          w.profile.toLowerCase() === trimmedProfile.toLowerCase()
      );

      for (const w of matching) {
        await localDB.saveWorkout({
          ...w,
          sub_profile: trimmedSub,
          sync_status: 'pending',
          updated_at: new Date().toISOString(),
        });
      }

      await refreshLocalWorkouts();

      if (network.isOnline) {
        syncService.runSync().then(() => refreshLocalWorkouts());
      }
    },
    [customSubProfiles, workouts, network.isOnline, refreshLocalWorkouts]
  );

  // Bulk update sub-profile for multiple exercises within a parent profile
  const bulkUpdateExerciseSubProfile = useCallback(
    async (exerciseNames: string[], profileName: string, subProfile: string | null): Promise<void> => {
      const trimmedProfile = profileName.trim();
      const trimmedSub = subProfile ? subProfile.trim() : null;
      const nameSet = new Set(exerciseNames.map((n) => n.toLowerCase()));

      if (trimmedSub) {
        const currentSubs = customSubProfiles[trimmedProfile] || [];
        if (!currentSubs.some((s) => s.toLowerCase() === trimmedSub.toLowerCase())) {
          const nextMap = {
            ...customSubProfiles,
            [trimmedProfile]: [...currentSubs, trimmedSub],
          };
          setCustomSubProfiles(nextMap);
          await localDB.saveCustomSubProfiles(nextMap);
        }
      }

      const matching = workouts.filter(
        (w) =>
          nameSet.has(w.exercise_name.toLowerCase()) &&
          w.profile &&
          w.profile.toLowerCase() === trimmedProfile.toLowerCase()
      );

      for (const w of matching) {
        await localDB.saveWorkout({
          ...w,
          sub_profile: trimmedSub,
          sync_status: 'pending',
          updated_at: new Date().toISOString(),
        });
      }

      await refreshLocalWorkouts();

      if (network.isOnline) {
        syncService.runSync().then(() => refreshLocalWorkouts());
      }
    },
    [customSubProfiles, workouts, network.isOnline, refreshLocalWorkouts]
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
      sub_profile?: string | null;
      date: string;
      notes?: string;
    }) => {
      const now = new Date().toISOString();
      const trimmedProfile = data.profile ? data.profile.trim() : null;
      const trimmedSubProfile = data.sub_profile ? data.sub_profile.trim() : null;

      const newWorkout: Workout = {
        id: generateUUID(),
        exercise_name: data.exercise_name.trim(),
        sets: data.sets,
        reps: data.reps,
        rir: data.rir,
        weight: data.weight ?? null,
        profile: trimmedProfile,
        sub_profile: trimmedSubProfile,
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

      // 2. If sub_profile is new, also save to custom sub-profiles
      if (trimmedProfile && trimmedSubProfile) {
        const currentSubs = customSubProfiles[trimmedProfile] || [];
        if (!currentSubs.some((s) => s.toLowerCase() === trimmedSubProfile.toLowerCase())) {
          const nextSubs = {
            ...customSubProfiles,
            [trimmedProfile]: [...currentSubs, trimmedSubProfile],
          };
          setCustomSubProfiles(nextSubs);
          await localDB.saveCustomSubProfiles(nextSubs);
        }
      }

      // 3. Save immediately to local IndexedDB
      await localDB.saveWorkout(newWorkout);
      await refreshLocalWorkouts();

      // 4. If online, initiate background sync
      if (network.isOnline) {
        syncService.runSync().then(() => refreshLocalWorkouts());
      }

      return newWorkout;
    },
    [customProfiles, customSubProfiles, network.isOnline, refreshLocalWorkouts]
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
    subProfiles,
    createProfile,
    deleteProfile,
    renameProfile,
    createSubProfile,
    renameSubProfile,
    deleteSubProfile,
    deleteExercise,
    updateExerciseProfile,
    updateExerciseSubProfile,
    bulkUpdateExerciseProfile,
    bulkUpdateExerciseSubProfile,
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
