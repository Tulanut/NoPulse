export type SyncStatus = 'synced' | 'pending' | 'deleted';

export interface Workout {
  id: string;
  exercise_name: string;
  sets: number;
  reps: number;
  rir: number; // Reps in reserve (0 = failure, 1 = 1 rep in tank, etc.)
  weight?: number | null; // Load lifted in kg or lbs
  date: string; // YYYY-MM-DD
  notes?: string | null;
  created_at: string;
  updated_at: string;
  is_deleted?: number; // 0 = active, 1 = deleted
  sync_status?: SyncStatus; // Client-side tracking: synced | pending | deleted
}

export interface SyncPayload {
  workouts: Workout[];
  last_synced_at?: string;
}

export interface SyncResponse {
  success: boolean;
  synced_count: number;
  server_workouts: Workout[];
  timestamp: string;
}

export interface WorkoutFilter {
  exercise?: string;
  date?: string;
  searchQuery?: string;
}

export interface WorkoutStats {
  totalWorkouts: number;
  totalSets: number;
  totalReps: number;
  avgRir: number;
  todayCount: number;
}
