export interface Workout {
  id: string;
  exercise_name: string;
  sets: number;
  reps: number;
  rir: number;
  weight?: number | null;
  profile?: string | null;
  date: string;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  is_deleted?: number;
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
  profile?: string;
  searchQuery?: string;
}
