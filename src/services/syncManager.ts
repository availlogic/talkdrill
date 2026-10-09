import { db } from '../storage/db';
import { mergeSnapshots, type SyncSnapshot } from './syncMerger';
import { isValidSyncKey, normalizeSyncKey } from '../utils/syncCrypto';

export type SyncStatus = 'idle' | 'syncing' | 'error';

export interface SyncState {
  status: SyncStatus;
  lastSyncedAt: number | null;
  errorMessage: string | null;
}

export interface SyncResult {
  success: boolean;
  reason?: 'no_key' | 'network_error' | 'invalid_key';
  error?: string;
}

type SyncListener = (state: SyncState) => void;

const SYNC_KEY_STORAGE_KEY = 'talkdrill_sync_key';

export class SyncManager {
  private syncKey: string | null = null;
  private state: SyncState = { status: 'idle', lastSyncedAt: null, errorMessage: null };
  private listeners: Set<SyncListener> = new Set();
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.syncKey = localStorage.getItem(SYNC_KEY_STORAGE_KEY);
  }

  getSyncKey(): string | null {
    return this.syncKey;
  }

  getState(): SyncState {
    return { ...this.state };
  }

  setSyncKey(rawKey: string): boolean {
    const normalized = normalizeSyncKey(rawKey);
    if (!isValidSyncKey(normalized)) return false;

    this.syncKey = normalized;
    localStorage.setItem(SYNC_KEY_STORAGE_KEY, normalized);
    this.notify();
    return true;
  }

  clearSyncKey(): void {
    this.syncKey = null;
    localStorage.removeItem(SYNC_KEY_STORAGE_KEY);
    this.state = { status: 'idle', lastSyncedAt: null, errorMessage: null };
    this.notify();
  }

  subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    const current = this.getState();
    this.listeners.forEach((cb) => cb(current));
  }

  scheduleSync(delayMs = 3000): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.syncNow();
    }, delayMs);
  }

  destroy(): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.listeners.clear();
  }

  private async fetchManifest(key: string): Promise<{ exists: boolean; updatedAt: number }> {
    const res = await fetch('/api/sync/manifest', {
      headers: { 'x-sync-key': key },
    });
    if (!res.ok) throw new Error(`Failed to check manifest: ${res.status}`);
    return res.json();
  }

  private async pullSnapshot(key: string): Promise<SyncSnapshot> {
    const res = await fetch('/api/sync/pull', {
      headers: { 'x-sync-key': key },
    });
    if (!res.ok) throw new Error(`Failed to pull snapshot: ${res.status}`);
    return res.json();
  }

  private async pushSnapshot(key: string, snapshot: SyncSnapshot): Promise<void> {
    const res = await fetch('/api/sync/push', {
      method: 'POST',
      headers: {
        'x-sync-key': key,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(snapshot),
    });
    if (!res.ok) throw new Error(`Failed to push snapshot: ${res.status}`);
  }

  private async uploadSingleAudio(
    key: string,
    audioId: string,
    blob: Blob,
    mimeType: string
  ): Promise<boolean> {
    try {
      const res = await fetch(`/api/sync/audio/${audioId}`, {
        method: 'PUT',
        headers: {
          'x-sync-key': key,
          'Content-Type': mimeType || blob.type || 'audio/mpeg',
        },
        body: blob,
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  private async syncPendingAudios(key: string): Promise<void> {
    const localAudios = await db.audios.toArray();
    const pending = localAudios.filter((a) => !a.synced && a.blob);
    for (const audio of pending) {
      const ok = await this.uploadSingleAudio(key, audio.id, audio.blob, audio.mimeType);
      if (ok) {
        await db.audios.update(audio.id, { synced: true });
      }
    }
  }

  private async executeSync(key: string): Promise<void> {
    const manifest = await this.fetchManifest(key);
    const local = await db.exportSnapshot();

    let targetSnapshot = local;
    if (manifest.exists) {
      const remote = await this.pullSnapshot(key);
      const merged = mergeSnapshots(local, remote);
      await db.applyMergedSnapshot(merged.mergedSnapshot);
      targetSnapshot = merged.mergedSnapshot;
    }

    await this.pushSnapshot(key, targetSnapshot);
    await this.syncPendingAudios(key);
  }

  async syncNow(): Promise<SyncResult> {
    if (!this.syncKey) {
      return { success: false, reason: 'no_key' };
    }

    this.state = { ...this.state, status: 'syncing', errorMessage: null };
    this.notify();

    try {
      await this.executeSync(this.syncKey);
      this.state = { status: 'idle', lastSyncedAt: Date.now(), errorMessage: null };
      this.notify();
      return { success: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown sync error';
      this.state = { status: 'error', lastSyncedAt: this.state.lastSyncedAt, errorMessage: message };
      this.notify();
      return { success: false, reason: 'network_error', error: message };
    }
  }
}

export const syncManager = new SyncManager();
