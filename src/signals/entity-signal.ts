/**
 * Entity Signal — reactive access to a TQL entity
 * 
 * Provides:
 * - Reactive facts (attribute → value)
 * - Reactive links
 * - Sync status tracking
 * - Optimistic updates with rollback
 */

import { Signal } from './reactivity.js';
import type { Atom, Fact, Link, SyncStatus, EntityData } from '../types.js';
import { getKernelBridge, type KernelEvent } from '../kernel/bridge.js';

export interface EntitySignal {
  id: string;
  facts: Signal<Record<string, Atom>>;
  links: Signal<Link[]>;
  syncStatus: Signal<SyncStatus>;
  type: Signal<string | null>;
  version: Signal<number>;

  // Methods
  set(attr: string, value: Atom): Promise<void>;
  delete(attr: string): Promise<void>;
  addLink(link: Omit<Link, 'e1'>): Promise<void>;
  removeLink(link: Omit<Link, 'e1'>): Promise<void>;
  subscribe(handler: (data: EntityData) => void): () => void;
  getSnapshot(): EntityData;
}

interface EntitySignalState {
  facts: Record<string, Atom>;
  links: Link[];
  syncStatus: SyncStatus;
  type: string | null;
  version: number;
}

function createEntitySignalState(): EntitySignalState {
  return {
    facts: {},
    links: [],
    syncStatus: 'synced',
    type: null,
    version: 0,
  };
}

const entitySignals = new Map<string, EntitySignal>();

export function createEntitySignal(id: string): EntitySignal {
  if (entitySignals.has(id)) {
    return entitySignals.get(id)!;
  }

  const state = createEntitySignalState();
  const bridge = getKernelBridge();

  // Create signals
  const factsSignal = new Signal(state.facts);
  const linksSignal = new Signal(state.links);
  const syncStatusSignal = new Signal<SyncStatus>(state.syncStatus);
  const typeSignal = new Signal<string | null>(state.type);
  const versionSignal = new Signal(state.version);

  // Pending operations for optimistic updates
  const pendingOps = new Map<string, Atom>();
  const originalFacts = new Map<string, Atom>();

  const signal: EntitySignal = {
    id,

    get facts() { return factsSignal; },
    get links() { return linksSignal; },
    get syncStatus() { return syncStatusSignal; },
    get type() { return typeSignal; },
    get version() { return versionSignal; },

    async set(attr: string, value: Atom): Promise<void> {
      // Capture original for rollback
      if (!originalFacts.has(attr)) {
        originalFacts.set(attr, state.facts[attr]);
      }

      // Optimistic update
      state.facts[attr] = value;
      state.syncStatus = 'pending';
      pendingOps.set(attr, value);
      
      factsSignal.set({ ...state.facts });
      syncStatusSignal.set('pending');

      // Emit to kernel
      bridge.emit({
        type: 'fact:updated',
        entity: id,
        attribute: attr,
        value,
        previous: originalFacts.get(attr) ?? null as unknown as Atom,
      });
    },

    async delete(attr: string): Promise<void> {
      if (!(attr in state.facts)) return;

      // Capture original for rollback
      if (!originalFacts.has(attr)) {
        originalFacts.set(attr, state.facts[attr]);
      }

      // Optimistic update
      const { [attr]: _, ...rest } = state.facts;
      state.facts = rest;
      state.syncStatus = 'pending';
      pendingOps.set(attr, undefined as unknown as Atom);
      
      factsSignal.set({ ...state.facts });
      syncStatusSignal.set('pending');

      // Emit to kernel
      bridge.emit({
        type: 'fact:removed',
        entity: id,
        attribute: attr,
      });
    },

    async addLink(link: Omit<Link, 'e1'>): Promise<void> {
      const newLink: Link = { e1: id, ...link };
      
      state.links.push(newLink);
      state.syncStatus = 'pending';
      
      linksSignal.set([...state.links]);
      syncStatusSignal.set('pending');

      bridge.emit({ type: 'link:added', link: newLink });
    },

    async removeLink(link: Omit<Link, 'e1'>): Promise<void> {
      const idx = state.links.findIndex(
        l => l.e1 === id && l.a === link.a && l.e2 === link.e2
      );
      if (idx === -1) return;

      const removed = state.links.splice(idx, 1)[0];
      state.syncStatus = 'pending';
      
      linksSignal.set([...state.links]);
      syncStatusSignal.set('pending');

      bridge.emit({ type: 'link:removed', link: removed });
    },

    subscribe(handler: (data: EntityData) => void): () => void {
      // Initial call
      handler(signal.getSnapshot());

      // Subscribe to signals
      const unsubFacts = factsSignal.subscribe(() => {
        handler(signal.getSnapshot());
      });

      return unsubFacts;
    },

    getSnapshot(): EntityData {
      return {
        facts: { ...state.facts },
        links: [...state.links],
        syncStatus: state.syncStatus,
      };
    },
  };

  // Subscribe to kernel events for this entity
  const unsubAdded = bridge.on('fact:updated', (event) => {
    if (event.entity !== id) return;
    state.facts[event.attribute] = event.value;
    state.version++;
    factsSignal.set({ ...state.facts });
  });

  const unsubRemoved = bridge.on('fact:removed', (event) => {
    if (event.entity !== id) return;
    const { [event.attribute]: _, ...rest } = state.facts;
    state.facts = rest;
    state.version++;
    factsSignal.set({ ...state.facts });
  });

  const unsubSyncConfirmed = bridge.on('sync:confirmed', (event) => {
    if (event.entity !== id) return;
    state.syncStatus = 'synced';
    pendingOps.clear();
    originalFacts.clear();
    syncStatusSignal.set('synced');
  });

  const unsubSyncRejected = bridge.on('sync:rejected', (event) => {
    if (event.entity !== id) return;
    
    // Rollback
    state.facts = { ...event.rollback };
    state.syncStatus = 'conflict';
    pendingOps.clear();
    originalFacts.clear();
    
    factsSignal.set({ ...state.facts });
    syncStatusSignal.set('conflict');
  });

  const unsubLinkAdded = bridge.on('link:added', (event) => {
    if (event.link.e1 !== id && event.link.e2 !== id) return;
    if (!state.links.some(l => l.e1 === event.link.e1 && l.e2 === event.link.e2)) {
      state.links.push(event.link);
      linksSignal.set([...state.links]);
    }
  });

  const unsubLinkRemoved = bridge.on('link:removed', (event) => {
    const idx = state.links.findIndex(
      l => l.e1 === event.link.e1 && l.a === event.link.a && l.e2 === event.link.e2
    );
    if (idx !== -1) {
      state.links.splice(idx, 1);
      linksSignal.set([...state.links]);
    }
  });

  const unsubEntityCreated = bridge.on('entity:created', (event) => {
    if (event.entity !== id) return;
    state.type = event.type;
    typeSignal.set(event.type);
  });

  // Store cleanup function
  (signal as any)._cleanup = () => {
    unsubAdded();
    unsubRemoved();
    unsubSyncConfirmed();
    unsubSyncRejected();
    unsubLinkAdded();
    unsubLinkRemoved();
    unsubEntityCreated();
  };

  entitySignals.set(id, signal);
  return signal;
}

export function useEntity(id: string): EntitySignal {
  return createEntitySignal(id);
}

export function getEntitySignal(id: string): EntitySignal | undefined {
  return entitySignals.get(id);
}

export function clearEntitySignal(id: string): void {
  const signal = entitySignals.get(id);
  if (signal) {
    (signal as any)._cleanup?.();
    entitySignals.delete(id);
  }
}

export function clearAllEntitySignals(): void {
  entitySignals.forEach((_, id) => clearEntitySignal(id));
}
