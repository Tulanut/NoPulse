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
  const [loading, setLoading] = useState<boolean>(true);
  const [syncState, setSyncState] = useState<SyncState>('idle');
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | undefined>(undefined);
  const [filter, setFilter] = useState<WorkoutFilter>({});

  const network = useNetworkStatus();

  // Reload local workouts from IndexedDB
  const refreshLocalWorkouts = useCallback(async () => {
    try {
      const data = await localDB.getAllWorkouts(false);
      setWorkouts(data);
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

  // Initial load
  useEffect(() => {
    refreshLocalWorkouts();
  }, [refreshLocalWorkouts]);

  // Trigger sync when transitioning to online
  useEffect(() => {
    if (network.isOnline) {
      syncService.runSync().then(() => {
        refreshLocalWorkouts();
      });
    }
  }, [network.isOnline, refreshLocalWorkouts]);

  // Add a new workout log
  const addWorkout = useCallback(
    async (data: {
      exercise_name: string;
      sets: number;
      reps: number;
      rir: number;
      date: string;
      notes?: string;
    }) => {
      const now = new Date().toISOString();
      const newWorkout: Workout = {
        id: generateUUID(),
        exercise_name: data.exercise_name.trim(),
        sets: data.sets,
        reps: data.reps,
        rir: data.rir,
        date: data.date || now.split('T')[0],
        notes: data.notes?.trim() || null,
        created_at: now,
        updated_at: now,
        is_deleted: 0,
        sync_status: 'pending',
      };

      // 1. Save immediately to local IndexedDB (Zero latency, works offline)
      await localDB.saveWorkout(newWorkout);
      await refreshLocalWorkouts();

      // 2. If online, initiate background sync
      if (network.isOnline) {
        syncService.runSync().then(() => refreshLocalWorkouts());
      }

      return newWorkout;
    },
    [network.isOnline, refreshLocalWorkouts]
  );

  // Delete a workout
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

  // Manual sync trigger
  const manualSync = useCallback(async () => {
    const result = await syncService.runSync();
    await refreshLocalWorkouts();
    return result;
  }, [refreshLocalWorkouts]);

  // Filtered workouts
  const filteredWorkouts = useMemo(() => {
    return workouts.filter((w) => {
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
