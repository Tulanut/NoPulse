export interface Workout {
  id: string;
  exercise_name: string;
  sets: number;
  reps: number;
  rir: number;
  weight?: number | null;
  date: string;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  is_deleted?: number; // 0 = active, 1 = soft-deleted
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

export interface CreateWorkoutDto {
  id?: string;
  exercise_name: string;
  sets: number;
  reps: number;
  rir: number;
  weight?: number | null;
  date: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}
