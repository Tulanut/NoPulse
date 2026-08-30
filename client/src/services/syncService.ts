import { localDB } from '../db/indexedDB';
import { ApiService } from './api';
import { SyncResponse } from '../types/workout';

export type SyncState = 'idle' | 'syncing' | 'error';

class SyncService {
  private isSyncing = false;
  private listeners: Array<(state: SyncState, lastSynced: string | null, error?: string) => void> = [];
  private lastSyncedAt: string | null = null;

  constructor() {
    this.initLastSynced();
  }

  private async initLastSynced() {
    this.lastSyncedAt = await localDB.getLastSyncedAt();
  }

  public subscribe(fn: (state: SyncState, lastSynced: string | null, error?: string) => void) {
    this.listeners.push(fn);
    fn(this.isSyncing ? 'syncing' : 'idle', this.lastSyncedAt);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== fn);
    };
  }

  private notify(state: SyncState, error?: string) {
    this.listeners.forEach((l) => l(state, this.lastSyncedAt, error));
  }

  public async runSync(): Promise<{ success: boolean; syncedCount: number; error?: string }> {
    if (this.isSyncing) {
      return { success: false, syncedCount: 0, error: 'Sync already in progress' };
    }

    // Check if backend is reachable
    const isOnline = await ApiService.checkHealth();
    if (!isOnline) {
      return { success: false, syncedCount: 0, error: 'Server unreachable / Offline' };
    }

    this.isSyncing = true;
    this.notify('syncing');

    try {
      // 1. Gather all pending records from local IndexedDB
      const pending = await localDB.getPendingSyncWorkouts();
      const lastSynced = await localDB.getLastSyncedAt();

      // 2. Transmit to server
      const syncResult: SyncResponse = await ApiService.syncWithServer({
        workouts: pending,
        last_synced_at: lastSynced || undefined,
      });

      // 3. Mark sent pending items as synced in IndexedDB
      if (pending.length > 0) {
        const pendingIds = pending.map((w) => w.id);
        await localDB.markWorkoutsAsSynced(pendingIds);
      }

      // 4. Merge server workouts into IndexedDB
      if (syncResult.server_workouts && syncResult.server_workouts.length > 0) {
        await localDB.bulkMergeServerWorkouts(syncResult.server_workouts);
      }

      // 5. Update last_synced_at
      this.lastSyncedAt = syncResult.timestamp;
      await localDB.setLastSyncedAt(syncResult.timestamp);

      this.isSyncing = false;
      this.notify('idle');

      return {
        success: true,
        syncedCount: syncResult.synced_count,
      };
    } catch (err: any) {
      this.isSyncing = false;
      const errorMsg = err.message || 'Sync failed';
      console.warn('Sync failed:', errorMsg);
      this.notify('error', errorMsg);
      return {
        success: false,
        syncedCount: 0,
        error: errorMsg,
      };
    }
  }
}

export const syncService = new SyncService();
