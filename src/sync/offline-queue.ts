/**
 * Offline Queue — queues kernel ops when offline
 * 
 * Persists to localStorage and flushes when connectivity returns.
 */

import type { KernelEvent } from '../kernel/bridge.js';

export interface QueuedOp {
  id: string;
  timestamp: number;
  event: KernelEvent;
  retries: number;
}

export interface OfflineQueueConfig {
  storageKey?: string;
  maxRetries?: number;
  maxQueueSize?: number;
}

const DEFAULT_CONFIG = {
  storageKey: 'fractal:queue',
  maxRetries: 3,
  maxQueueSize: 1000,
};

export class OfflineQueue {
  private _queue: QueuedOp[] = [];
  private _config: Required<OfflineQueueConfig>;
  private _listeners: Set<(count: number) => void> = new Set();
  private _onlineHandler: (() => void) | null = null;

  constructor(config: OfflineQueueConfig = {}) {
    this._config = { ...DEFAULT_CONFIG, ...config };
    this._load();
    this._setupOnlineListener();
  }

  private _load(): void {
    try {
      const stored = localStorage.getItem(this._config.storageKey);
      if (stored) {
        this._queue = JSON.parse(stored);
      }
    } catch {
      this._queue = [];
    }
  }

  private _persist(): void {
    try {
      localStorage.setItem(this._config.storageKey, JSON.stringify(this._queue));
    } catch {
      // Storage full or unavailable
    }
    this._notify();
  }

  private _setupOnlineListener(): void {
    this._onlineHandler = () => {
      this.flush();
    };
    window.addEventListener('online', this._onlineHandler);
  }

  private _notify(): void {
    this._listeners.forEach(fn => fn(this._queue.length));
  }

  push(event: KernelEvent): string {
    const id = `op_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    
    this._queue.push({
      id,
      timestamp: Date.now(),
      event,
      retries: 0,
    });

    // Trim if over max size
    if (this._queue.length > this._config.maxQueueSize) {
      this._queue = this._queue.slice(-this._config.maxQueueSize);
    }

    this._persist();
    return id;
  }

  async flush(handler: (op: QueuedOp) => Promise<boolean>): Promise<FlushResult> {
    if (this._queue.length === 0) {
      return { processed: 0, failed: 0, remaining: 0 };
    }

    const originalQueue = [...this._queue];
    let processed = 0;
    let failed = 0;

    for (const op of originalQueue) {
      try {
        const success = await handler(op);
        if (success) {
          // Remove from queue
          this._queue = this._queue.filter(o => o.id !== op.id);
          processed++;
        } else {
          // Increment retry count
          op.retries++;
          if (op.retries >= this._config.maxRetries) {
            // Remove after max retries
            this._queue = this._queue.filter(o => o.id !== op.id);
            failed++;
          }
        }
      } catch {
        op.retries++;
        if (op.retries >= this._config.maxRetries) {
          this._queue = this._queue.filter(o => o.id !== op.id);
          failed++;
        }
      }
    }

    this._persist();
    return { processed, failed, remaining: this._queue.length };
  }

  remove(id: string): boolean {
    const idx = this._queue.findIndex(op => op.id === id);
    if (idx !== -1) {
      this._queue.splice(idx, 1);
      this._persist();
      return true;
    }
    return false;
  }

  clear(): void {
    this._queue = [];
    this._persist();
  }

  size(): number {
    return this._queue.length;
  }

  peek(): QueuedOp | null {
    return this._queue[0] ?? null;
  }

  getAll(): QueuedOp[] {
    return [...this._queue];
  }

  subscribe(listener: (count: number) => void): () => void {
    this._listeners.add(listener);
    listener(this._queue.length);
    return () => this._listeners.delete(listener);
  }

  isOnline(): boolean {
    return navigator.onLine;
  }

  destroy(): void {
    if (this._onlineHandler) {
      window.removeEventListener('online', this._onlineHandler);
      this._onlineHandler = null;
    }
    this._listeners.clear();
  }
}

export interface FlushResult {
  processed: number;
  failed: number;
  remaining: number;
}

// Singleton instance
let _instance: OfflineQueue | null = null;

export function getOfflineQueue(config?: OfflineQueueConfig): OfflineQueue {
  if (!_instance) {
    _instance = new OfflineQueue(config);
  }
  return _instance;
}

export function clearOfflineQueue(): void {
  _instance?.destroy();
  _instance = null;
}
