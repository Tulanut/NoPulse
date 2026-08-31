import { Workout } from '../types/workout';

const DB_NAME = 'ironpulse_gym_db';
const DB_VERSION = 1;
const WORKOUTS_STORE = 'workouts';
const METADATA_STORE = 'metadata';

class LocalDatabase {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        return reject(new Error('IndexedDB is not available in this environment'));
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Workouts store
        if (!db.objectStoreNames.contains(WORKOUTS_STORE)) {
          const workoutStore = db.createObjectStore(WORKOUTS_STORE, { keyPath: 'id' });
          workoutStore.createIndex('date', 'date', { unique: false });
          workoutStore.createIndex('exercise_name', 'exercise_name', { unique: false });
          workoutStore.createIndex('profile', 'profile', { unique: false });
          workoutStore.createIndex('sync_status', 'sync_status', { unique: false });
          workoutStore.createIndex('updated_at', 'updated_at', { unique: false });
        }

        // Metadata store (for last_synced_at timestamp, custom profiles, etc.)
        if (!db.objectStoreNames.contains(METADATA_STORE)) {
          db.createObjectStore(METADATA_STORE, { keyPath: 'key' });
        }
      };

      request.onsuccess = (event) => {
        resolve((event.target as IDBOpenDBRequest).result);
      };

      request.onerror = (event) => {
        console.error('IndexedDB open error:', (event.target as IDBOpenDBRequest).error);
        reject((event.target as IDBOpenDBRequest).error);
      };
    });

    return this.dbPromise;
  }

  public async getAllWorkouts(includeDeleted: boolean = false): Promise<Workout[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(WORKOUTS_STORE, 'readonly');
      const store = tx.objectStore(WORKOUTS_STORE);
      const request = store.getAll();

      request.onsuccess = () => {
        let results = (request.result as Workout[]) || [];
        if (!includeDeleted) {
          results = results.filter((w) => w.is_deleted !== 1);
        }
        // Sort descending by date and updated_at
        results.sort((a, b) => {
          if (a.date !== b.date) {
            return b.date.localeCompare(a.date);
          }
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
        resolve(results);
      };

      request.onerror = () => reject(request.error);
    });
  }

  public async getWorkoutById(id: string): Promise<Workout | undefined> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(WORKOUTS_STORE, 'readonly');
      const store = tx.objectStore(WORKOUTS_STORE);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result as Workout | undefined);
      request.onerror = () => reject(request.error);
    });
  }

  public async saveWorkout(workout: Workout): Promise<Workout> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(WORKOUTS_STORE, 'readwrite');
      const store = tx.objectStore(WORKOUTS_STORE);

      const request = store.put(workout);

      request.onsuccess = () => resolve(workout);
      request.onerror = () => reject(request.error);
    });
  }

  public async deleteWorkout(id: string): Promise<void> {
    const existing = await this.getWorkoutById(id);
    if (!existing) return;

    const updated: Workout = {
      ...existing,
      is_deleted: 1,
      sync_status: 'pending',
      updated_at: new Date().toISOString(),
    };

    await this.saveWorkout(updated);
  }

  public async getPendingSyncWorkouts(): Promise<Workout[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(WORKOUTS_STORE, 'readonly');
      const store = tx.objectStore(WORKOUTS_STORE);
      const request = store.getAll();

      request.onsuccess = () => {
        const all = (request.result as Workout[]) || [];
        const pending = all.filter((w) => w.sync_status === 'pending');
        resolve(pending);
      };

      request.onerror = () => reject(request.error);
    });
  }

  public async markWorkoutsAsSynced(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    const db = await this.getDB();
    const idSet = new Set(ids);

    return new Promise((resolve, reject) => {
      const tx = db.transaction(WORKOUTS_STORE, 'readwrite');
      const store = tx.objectStore(WORKOUTS_STORE);
      const request = store.getAll();

      request.onsuccess = () => {
        const all = (request.result as Workout[]) || [];
        for (const w of all) {
          if (idSet.has(w.id)) {
            w.sync_status = 'synced';
            store.put(w);
          }
        }
      };

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  public async bulkMergeServerWorkouts(serverWorkouts: Workout[]): Promise<void> {
    if (!serverWorkouts || serverWorkouts.length === 0) return;
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(WORKOUTS_STORE, 'readwrite');
      const store = tx.objectStore(WORKOUTS_STORE);

      for (const sw of serverWorkouts) {
        const getReq = store.get(sw.id);
        getReq.onsuccess = () => {
          const local = getReq.result as Workout | undefined;
          if (!local) {
            // Local doesn't have it, write directly as synced
            store.put({ ...sw, sync_status: 'synced' });
          } else {
            // If local has pending modifications, only overwrite if server is strictly newer
            const localUpdated = new Date(local.updated_at).getTime();
            const serverUpdated = new Date(sw.updated_at).getTime();

            if (local.sync_status === 'synced' || serverUpdated > localUpdated) {
              store.put({ ...sw, sync_status: 'synced' });
            }
          }
        };
      }

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  public async getLastSyncedAt(): Promise<string | null> {
    try {
      const db = await this.getDB();
      return new Promise((resolve) => {
        const tx = db.transaction(METADATA_STORE, 'readonly');
        const store = tx.objectStore(METADATA_STORE);
        const req = store.get('last_synced_at');
        req.onsuccess = () => resolve(req.result?.value || null);
        req.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  }

  public async setLastSyncedAt(timestamp: string): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(METADATA_STORE, 'readwrite');
        const store = tx.objectStore(METADATA_STORE);
        const req = store.put({ key: 'last_synced_at', value: timestamp });
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      console.error('Error setting last_synced_at:', e);
    }
  }

  // Get custom workout profiles created by user
  public async getCustomProfiles(): Promise<string[]> {
    try {
      const db = await this.getDB();
      return new Promise((resolve) => {
        const tx = db.transaction(METADATA_STORE, 'readonly');
        const store = tx.objectStore(METADATA_STORE);
        const req = store.get('custom_workout_profiles');
        req.onsuccess = () => resolve(req.result?.value || []);
        req.onerror = () => resolve([]);
      });
    } catch {
      return [];
    }
  }

  // Save custom workout profiles
  public async saveCustomProfiles(profiles: string[]): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(METADATA_STORE, 'readwrite');
        const store = tx.objectStore(METADATA_STORE);
        const req = store.put({ key: 'custom_workout_profiles', value: profiles });
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      console.error('Error saving custom profiles:', e);
    }
  }
}

export const localDB = new LocalDatabase();
