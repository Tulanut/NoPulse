import { useState, useEffect, useCallback, useMemo } from 'react';
import { Goal, CreateGoalInput, PeriodPreset } from '../types/goal';
import { localDB } from '../db/indexedDB';
import { ApiService } from '../services/api';

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

export function calculatePresetTargetDate(preset: PeriodPreset): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);

  switch (preset) {
    case '3_weeks':
      d.setDate(d.getDate() + 21);
      break;
    case '1_month':
      d.setMonth(d.getMonth() + 1);
      break;
    case '3_months':
      d.setMonth(d.getMonth() + 3);
      break;
    case 'custom':
    default:
      d.setDate(d.getDate() + 7);
      break;
  }

  return d.toISOString().split('T')[0];
}

export function formatDaysRemaining(targetDateStr: string): { label: string; isOverdue: boolean } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const target = new Date(targetDateStr + 'T00:00:00');
  target.setHours(0, 0, 0, 0);

  const diffTime = target.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return { label: 'Due today', isOverdue: false };
  } else if (diffDays === 1) {
    return { label: 'Due tomorrow', isOverdue: false };
  } else if (diffDays > 1) {
    return { label: `Due in ${diffDays} days`, isOverdue: false };
  } else if (diffDays === -1) {
    return { label: '1 day overdue', isOverdue: true };
  } else {
    return { label: `${Math.abs(diffDays)} days overdue`, isOverdue: true };
  }
}

export const useGoals = () => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Load goals from IndexedDB on mount
  const refreshGoals = useCallback(async () => {
    try {
      const storedGoals = await localDB.getAllGoals();
      setGoals(storedGoals);
    } catch (err: any) {
      console.error('Failed to load goals from localDB:', err);
      setError(err.message || 'Failed to load goals');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshGoals();
  }, [refreshGoals]);

  // Background sync helper
  const syncPendingGoals = useCallback(async () => {
    if (!navigator.onLine) return;
    try {
      const isOnline = await ApiService.checkHealth();
      if (!isOnline) return;

      const pending = await localDB.getPendingSyncGoals();
      if (pending.length > 0) {
        const res = await ApiService.syncGoals(pending);
        await localDB.markGoalsAsSynced(pending.map((g) => g.id));
        if (res.server_goals) {
          await localDB.bulkMergeServerGoals(res.server_goals);
          const fresh = await localDB.getAllGoals();
          setGoals(fresh);
        }
      }
    } catch (err) {
      console.warn('Background goals sync skipped:', err);
    }
  }, []);

  // Run initial sync check
  useEffect(() => {
    syncPendingGoals();
  }, [syncPendingGoals]);

  // Add Goal
  const addGoal = useCallback(
    async (input: CreateGoalInput): Promise<Goal> => {
      const now = new Date().toISOString();
      const newGoal: Goal = {
        id: generateUUID(),
        title: input.title.trim(),
        description: input.description ? input.description.trim() : null,
        target_date: input.target_date,
        period_preset: input.period_preset || 'custom',
        completed: false,
        completed_at: null,
        created_at: now,
        updated_at: now,
        is_deleted: 0,
        sync_status: 'pending',
      };

      // Optimistic in-memory update
      setGoals((prev) => [newGoal, ...prev]);

      // Save locally
      await localDB.saveGoal(newGoal);

      // Background network sync
      if (navigator.onLine) {
        ApiService.createGoal(newGoal)
          .then(async () => {
            await localDB.markGoalsAsSynced([newGoal.id]);
          })
          .catch((err) => console.warn('Goal creation queued offline:', err));
      }

      return newGoal;
    },
    []
  );

  // Toggle Goal Completion
  const toggleGoalCompletion = useCallback(
    async (id: string): Promise<Goal | null> => {
      const existing = goals.find((g) => g.id === id);
      if (!existing) return null;

      const now = new Date().toISOString();
      const nextCompleted = !existing.completed;
      const updatedGoal: Goal = {
        ...existing,
        completed: nextCompleted,
        completed_at: nextCompleted ? now : null,
        updated_at: now,
        sync_status: 'pending',
      };

      // Optimistic update
      setGoals((prev) => prev.map((g) => (g.id === id ? updatedGoal : g)));

      // Save locally
      await localDB.saveGoal(updatedGoal);

      // Background network sync
      if (navigator.onLine) {
        ApiService.updateGoal(id, {
          completed: nextCompleted,
          completed_at: updatedGoal.completed_at,
        })
          .then(async () => {
            await localDB.markGoalsAsSynced([id]);
          })
          .catch((err) => console.warn('Goal update queued offline:', err));
      }

      return updatedGoal;
    },
    [goals]
  );

  // Delete Goal
  const deleteGoal = useCallback(
    async (id: string): Promise<void> => {
      // Optimistic remove
      setGoals((prev) => prev.filter((g) => g.id !== id));

      // Delete locally
      await localDB.deleteGoal(id, true);

      // Background network sync
      if (navigator.onLine) {
        ApiService.deleteGoal(id).catch((err) =>
          console.warn('Goal deletion queued offline:', err)
        );
      }
    },
    []
  );

  // Derived filtered & sorted lists
  const activeGoals = useMemo(() => {
    return goals
      .filter((g) => !g.completed && g.is_deleted !== 1)
      .sort((a, b) => a.target_date.localeCompare(b.target_date));
  }, [goals]);

  const completedGoals = useMemo(() => {
    return goals
      .filter((g) => g.completed && g.is_deleted !== 1)
      .sort((a, b) => {
        const timeA = new Date(a.completed_at || a.updated_at).getTime();
        const timeB = new Date(b.completed_at || b.updated_at).getTime();
        return timeB - timeA;
      });
  }, [goals]);

  // 3 goals closest to the user's current date
  const closestGoals = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayMs = today.getTime();

    // Prefer active goals; fallback to all goals if none active
    const pool = activeGoals.length > 0 ? activeGoals : goals.filter((g) => g.is_deleted !== 1);

    return [...pool]
      .sort((a, b) => {
        const targetA = new Date(a.target_date + 'T00:00:00').getTime();
        const targetB = new Date(b.target_date + 'T00:00:00').getTime();
        const diffA = Math.abs(targetA - todayMs);
        const diffB = Math.abs(targetB - todayMs);
        return diffA - diffB;
      })
      .slice(0, 3);
  }, [activeGoals, goals]);

  return {
    goals,
    activeGoals,
    completedGoals,
    closestGoals,
    loading,
    error,
    addGoal,
    toggleGoalCompletion,
    deleteGoal,
    refreshGoals,
  };
};
