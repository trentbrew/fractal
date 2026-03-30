/**
 * Query Signal — reactive access to TQL queries
 * 
 * Provides reactive access to collections of entities
 * that match a given query pattern.
 */

import { Signal, computed } from './reactivity.js';
import type { EntityRef } from '../types.js';
import { useEntity, type EntitySignal } from './entity-signal.js';

export interface QueryResult {
  entities: EntityRef[];
  version: number;
}

export interface QuerySignal {
  results: Signal<QueryResult>;
  version: Signal<number>;
  refetch(): void;
  subscribe(handler: (results: QueryResult) => void): () => void;
}

interface QueryConfig {
  type?: string;
  hasAttr?: string;
  linkedFrom?: { entity: EntityRef; attr: string };
  linkedTo?: { entity: EntityRef; attr: string };
}

const querySignals = new Map<string, QuerySignal>();
let queryIdCounter = 0;

export function createQuerySignal(config: QueryConfig): QuerySignal {
  const cacheKey = JSON.stringify(config);
  if (querySignals.has(cacheKey)) {
    return querySignals.get(cacheKey)!;
  }

  const entitySubscriptions = new Map<EntityRef, EntitySignal>();
  const entityIdsSignal = new Signal<EntityRef[]>([]);
  const resultsSignal = new Signal<QueryResult>({ entities: [], version: 0 });
  const versionSignal = new Signal(0);

  let queryId = ++queryIdCounter;

  // Track which entities match the query
  const matchingEntities = new Set<EntityRef>();

  function checkEntity(entityId: EntityRef): boolean {
    const signal = entitySubscriptions.get(entityId);
    if (!signal) return false;

    const data = signal.getSnapshot();

    if (config.type && data.facts['type'] !== config.type) {
      return false;
    }

    if (config.hasAttr && !(config.hasAttr in data.facts)) {
      return false;
    }

    if (config.linkedFrom) {
      const hasLink = data.links.some(
        l => l.e1 === config.linkedFrom!.entity && l.a === config.linkedFrom!.attr
      );
      if (!hasLink) return false;
    }

    if (config.linkedTo) {
      const hasLink = data.links.some(
        l => l.e2 === config.linkedTo!.entity && l.a === config.linkedTo!.attr
      );
      if (!hasLink) return false;
    }

    return true;
  }

  function updateResults(): void {
    matchingEntities.forEach(id => {
      if (!checkEntity(id)) {
        matchingEntities.delete(id);
      }
    });

    const entities = Array.from(matchingEntities);
    resultsSignal.set({ entities, version: versionSignal.value });
    entityIdsSignal.set(entities);
  }

  function subscribeToEntity(entityId: EntityRef): void {
    if (entitySubscriptions.has(entityId)) return;

    const entitySignal = useEntity(entityId);
    entitySubscriptions.set(entityId, entitySignal);

    entitySignal.facts.subscribe(() => {
      const matches = checkEntity(entityId);
      if (matches && !matchingEntities.has(entityId)) {
        matchingEntities.add(entityId);
        versionSignal.value++;
        updateResults();
      } else if (!matches && matchingEntities.has(entityId)) {
        matchingEntities.delete(entityId);
        versionSignal.value++;
        updateResults();
      }
    });

    entitySignal.links.subscribe(() => {
      const matches = checkEntity(entityId);
      if (matches && !matchingEntities.has(entityId)) {
        matchingEntities.add(entityId);
        versionSignal.value++;
        updateResults();
      } else if (!matches && matchingEntities.has(entityId)) {
        matchingEntities.delete(entityId);
        versionSignal.value++;
        updateResults();
      }
    });
  }

  function refetch(): void {
    versionSignal.value++;
    updateResults();
  }

  function subscribe(handler: (results: QueryResult) => void): () => void {
    handler(resultsSignal.value);
    return resultsSignal.subscribe(handler);
  }

  const signal: QuerySignal = {
    get results() { return resultsSignal; },
    get version() { return versionSignal; },
    refetch,
    subscribe,
  };

  (signal as any)._subscribeToEntity = subscribeToEntity;

  querySignals.set(cacheKey, signal);
  return signal;
}

export function useQuery(config: QueryConfig): QuerySignal {
  return createQuerySignal(config);
}

// Register an entity with all matching queries
export function registerEntityForQueries(entityId: EntityRef): void {
  querySignals.forEach((query) => {
    (query as any)._subscribeToEntity?.(entityId);
  });
}
