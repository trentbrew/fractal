/**
 * Sync — offline support and WebSocket transport
 */

import type { KernelEvent } from '../kernel/bridge.js';

export interface SyncConfig {
  wsUrl?: string;
  maxRetries?: number;
}

export type SyncStatus = 'synced' | 'pending' | 'offline' | 'error';

const listeners: Set<(status: SyncStatus) => void> = new Set();
let status: SyncStatus = 'synced';
let ws: WebSocket | null = null;
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;

export function getSyncStatus(): SyncStatus {
  return status;
}

export function onSyncStatusChange(listener: (status: SyncStatus) => void): () => void {
  listeners.add(listener);
  listener(status);
  return () => listeners.delete(listener);
}

function setStatus(newStatus: SyncStatus): void {
  status = newStatus;
  listeners.forEach(l => l(status));
}

export function connect(config: SyncConfig = {}): void {
  const url = config.wsUrl ?? 'ws://localhost:8081';
  
  if (ws) {
    ws.close();
  }

  try {
    ws = new WebSocket(url);

    ws.onopen = () => {
      setStatus('synced');
      reconnectAttempts = 0;
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as KernelEvent;
        // Forward to kernel bridge
        // This would integrate with the existing bridge.emit() pattern
      } catch {
        console.error('Failed to parse sync message');
      }
    };

    ws.onclose = () => {
      if (navigator.onLine) {
        setStatus('offline');
        scheduleReconnect(url, config.maxRetries);
      }
    };

    ws.onerror = () => {
      setStatus('error');
    };
  } catch {
    setStatus('error');
  }
}

function scheduleReconnect(url: string, retries = maxReconnectAttempts): void {
  if (reconnectAttempts >= retries) {
    return;
  }

  const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
  reconnectAttempts++;

  setTimeout(() => {
    if (navigator.onLine) {
      connect({ wsUrl: url, maxRetries: retries });
    }
  }, delay);
}

export function disconnect(): void {
  ws?.close();
  ws = null;
  setStatus('offline');
}

export async function sendOp(event: KernelEvent): Promise<void> {
  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(event));
  } else {
    throw new Error('Not connected');
  }
}

export function isOnline(): boolean {
  return navigator.onLine && status === 'synced';
}

// Handle online/offline events
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    if (ws?.readyState !== WebSocket.OPEN) {
      connect();
    }
  });

  window.addEventListener('offline', () => {
    setStatus('offline');
  });
}
