import { Workout, SyncPayload, SyncResponse } from '../types/workout';

const API_BASE = '/api';

export class ApiService {
  public static async checkHealth(): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/health`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(3000), // 3s timeout
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  public static async fetchWorkouts(): Promise<Workout[]> {
    const res = await fetch(`${API_BASE}/workouts`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });
    if (!res.ok) throw new Error(`Failed to fetch workouts: ${res.statusText}`);
    const json = await res.json();
    return json.data || [];
  }

  public static async syncWithServer(payload: SyncPayload): Promise<SyncResponse> {
    const res = await fetch(`${API_BASE}/workouts/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error(`Sync failed with status: ${res.status}`);
    }

    return await res.json();
  }

  public static async createWorkout(workout: Workout): Promise<Workout> {
    const res = await fetch(`${API_BASE}/workouts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(workout),
    });

    if (!res.ok) {
      throw new Error(`Create failed: ${res.statusText}`);
    }

    const json = await res.json();
    return json.data;
  }

  public static async deleteWorkout(id: string): Promise<boolean> {
    const res = await fetch(`${API_BASE}/workouts/${id}`, {
      method: 'DELETE',
    });
    return res.ok;
  }
}
