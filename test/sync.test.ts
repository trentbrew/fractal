/**
 * Comprehensive tests for sync and offline queue
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import {
  OfflineQueue,
  getOfflineQueue,
  clearOfflineQueue,
} from '../src/sync/offline-queue.js';

describe('OfflineQueue', () => {
  let queue: OfflineQueue;

  beforeEach(() => {
    clearOfflineQueue();
    queue = new OfflineQueue({ storageKey: 'test-queue' });
  });

  test('initializes with empty queue', () => {
    expect(queue.size()).toBe(0);
  });

  test('push adds operation to queue', () => {
    const id = queue.push({
      type: 'fact:updated',
      entity: 'task:1',
      attribute: 'name',
      value: 'Test',
      previous: null as any,
      timestamp: Date.now(),
    });

    expect(id).toBeDefined();
    expect(queue.size()).toBe(1);
  });

  test('peek returns first without removing', () => {
    const peekQueue = new OfflineQueue({ storageKey: 'peek-test' });
    peekQueue.push({
      type: 'fact:updated',
      entity: 'task:1',
      attribute: 'name',
      value: 'Test',
      previous: null as any,
      timestamp: Date.now(),
    });

    const peeked = peekQueue.peek();
    expect(peeked).not.toBeNull();
    expect(peekQueue.size()).toBe(1);
  });

  test('clear removes all operations', () => {
    queue.push({
      type: 'fact:updated',
      entity: 'task:1',
      attribute: 'name',
      value: 'Test',
      previous: null as any,
      timestamp: Date.now(),
    });
    queue.push({
      type: 'fact:updated',
      entity: 'task:2',
      attribute: 'name',
      value: 'Test2',
      previous: null as any,
      timestamp: Date.now(),
    });

    queue.clear();

    expect(queue.size()).toBe(0);
  });

  test('remove operation by id', () => {
    const id = queue.push({
      type: 'fact:updated',
      entity: 'task:1',
      attribute: 'name',
      value: 'Test',
      previous: null as any,
      timestamp: Date.now(),
    });

    const removed = queue.remove(id);
    expect(removed).toBe(true);
    expect(queue.size()).toBe(0);
  });

  test('remove non-existent returns false', () => {
    const removed = queue.remove('non-existent');
    expect(removed).toBe(false);
  });

  test('getAll returns all operations', () => {
    queue.push({
      type: 'fact:updated',
      entity: 'task:1',
      attribute: 'name',
      value: 'Test',
      previous: null as any,
      timestamp: Date.now(),
    });
    queue.push({
      type: 'fact:updated',
      entity: 'task:2',
      attribute: 'name',
      value: 'Test2',
      previous: null as any,
      timestamp: Date.now(),
    });

    const all = queue.getAll();
    expect(all.length).toBe(2);
  });

  test('push generates unique ids', () => {
    const id1 = queue.push({
      type: 'fact:updated',
      entity: 'task:1',
      attribute: 'name',
      value: 'Test',
      previous: null as any,
      timestamp: Date.now(),
    });
    const id2 = queue.push({
      type: 'fact:updated',
      entity: 'task:2',
      attribute: 'name',
      value: 'Test2',
      previous: null as any,
      timestamp: Date.now(),
    });

    expect(id1).not.toBe(id2);
  });
});

describe('getOfflineQueue', () => {
  test('returns singleton instance', () => {
    const q1 = getOfflineQueue();
    const q2 = getOfflineQueue();
    expect(q1).toBe(q2);
  });

  test('clearOfflineQueue removes singleton', () => {
    const q1 = getOfflineQueue();
    clearOfflineQueue();
    const q2 = getOfflineQueue();
    expect(q1).not.toBe(q2);
  });
});

describe('Offline Scenarios', () => {
  test('queue operations while offline', () => {
    const queue = new OfflineQueue({ storageKey: 'offline-test' });

    for (let i = 0; i < 10; i++) {
      queue.push({
        type: 'fact:updated',
        entity: `task:${i}`,
        attribute: 'name',
        value: `Task ${i}`,
        previous: null as any,
        timestamp: Date.now(),
      });
    }

    expect(queue.size()).toBe(10);
  });

  test('flush processes operations', async () => {
    const queue = new OfflineQueue({ storageKey: 'flush-test' });
    
    queue.push({
      type: 'fact:updated',
      entity: 'task:1',
      attribute: 'name',
      value: 'Test',
      previous: null as any,
      timestamp: Date.now(),
    });

    const result = await queue.flush(async (op) => {
      return true;
    });

    expect(result.processed).toBe(1);
    expect(result.remaining).toBe(0);
  });
});
