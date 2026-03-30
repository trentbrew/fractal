/**
 * Kernel Bridge — connects TQL kernel events to reactive signals
 * 
 * This module provides the observable layer over the TQL EAV store.
 * It handles:
 * - Entity fact changes (add/remove/update)
 * - Link changes
 * - Sync status updates
 */

import type { Atom, Fact, Link, SyncStatus } from '../types.js';

export type KernelEvent =
  | { type: 'fact:added'; entity: string; attribute: string; value: Atom }
  | { type: 'fact:removed'; entity: string; attribute: string }
  | { type: 'fact:updated'; entity: string; attribute: string; value: Atom; previous: Atom }
  | { type: 'link:added'; link: Link }
  | { type: 'link:removed'; link: Link }
  | { type: 'sync:confirmed'; entity: string }
  | { type: 'sync:rejected'; entity: string; rollback: Record<string, Atom> }
  | { type: 'entity:created'; entity: string; type: string }
  | { type: 'entity:deleted'; entity: string };

export type KernelEventHandler = (event: KernelEvent) => void;

interface KernelBridgeConfig {
  onEvent?: (event: KernelEvent) => void;
}

class KernelBridge {
  private handlers: Map<string, Set<KernelEventHandler>> = new Map();
  private config: KernelBridgeConfig;

  constructor(config: KernelBridgeConfig = {}) {
    this.config = config;
  }

  on(eventType: string, handler: KernelEventHandler): () => void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    this.handlers.get(eventType)!.add(handler);

    return () => {
      this.handlers.get(eventType)?.delete(handler);
    };
  }

  off(eventType: string, handler: KernelEventHandler): void {
    this.handlers.get(eventType)?.delete(handler);
  }

  emit(event: KernelEvent): void {
    this.config.onEvent?.(event);
    const handlers = this.handlers.get(event.type);
    if (handlers) {
      handlers.forEach(h => h(event));
    }
  }

  clear(): void {
    this.handlers.clear();
  }
}

// Singleton instance
let bridgeInstance: KernelBridge | null = null;

export function getKernelBridge(): KernelBridge {
  if (!bridgeInstance) {
    bridgeInstance = new KernelBridge();
  }
  return bridgeInstance;
}

export function createKernelBridge(config?: KernelBridgeConfig): KernelBridge {
  bridgeInstance = new KernelBridge(config);
  return bridgeInstance;
}

export function clearKernelBridge(): void {
  bridgeInstance?.clear();
  bridgeInstance = null;
}
