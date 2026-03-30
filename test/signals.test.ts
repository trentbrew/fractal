/**
 * Tests for signals layer
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { Signal } from 'signal-utils';
import { createKernelBridge, getKernelBridge, clearKernelBridge } from '../src/kernel/bridge.js';
import {
  createEntitySignal,
  useEntity,
  clearAllEntitySignals,
} from '../src/signals/entity-signal.js';
import type { KernelEvent } from '../src/kernel/bridge.js';

describe('KernelBridge', () => {
  afterEach(() => {
    clearKernelBridge();
    clearAllEntitySignals();
  });

  test('emits and receives events', () => {
    const bridge = createKernelBridge();
    const received: KernelEvent[] = [];

    bridge.on('fact:updated', (event) => {
      received.push(event);
    });

    bridge.emit({
      type: 'fact:updated',
      entity: 'task:1',
      attribute: 'name',
      value: 'Test',
      previous: null as any,
    });

    expect(received.length).toBe(1);
    expect(received[0].entity).toBe('task:1');
  });

  test('multiple handlers for same event type', () => {
    const bridge = createKernelBridge();
    let count1 = 0;
    let count2 = 0;

    bridge.on('fact:updated', () => count1++);
    bridge.on('fact:updated', () => count2++);

    bridge.emit({
      type: 'fact:updated',
      entity: 'task:1',
      attribute: 'name',
      value: 'Test',
      previous: null as any,
    });

    expect(count1).toBe(1);
    expect(count2).toBe(1);
  });

  test('unsubscribe removes handler', () => {
    const bridge = createKernelBridge();
    let count = 0;

    const unsub = bridge.on('fact:updated', () => count++);
    unsub();

    bridge.emit({
      type: 'fact:updated',
      entity: 'task:1',
      attribute: 'name',
      value: 'Test',
      previous: null as any,
    });

    expect(count).toBe(0);
  });
});

describe('EntitySignal', () => {
  beforeEach(() => {
    createKernelBridge();
    clearAllEntitySignals();
  });

  afterEach(() => {
    clearAllEntitySignals();
  });

  test('creates signal for entity id', () => {
    const signal = createEntitySignal('task:1');
    expect(signal.id).toBe('task:1');
  });

  test('returns same signal for same id (singleton)', () => {
    const signal1 = createEntitySignal('task:1');
    const signal2 = createEntitySignal('task:1');
    expect(signal1).toBe(signal2);
  });

  test('useEntity returns existing or creates new', () => {
    const signal1 = useEntity('task:2');
    const signal2 = useEntity('task:2');
    expect(signal1).toBe(signal2);
  });

  test('getSnapshot returns current state', () => {
    const signal = createEntitySignal('task:1');
    const snapshot = signal.getSnapshot();
    expect(snapshot.facts).toEqual({});
    expect(snapshot.links).toEqual([]);
    expect(snapshot.syncStatus).toBe('synced');
  });

  test('set updates facts optimistically', async () => {
    const bridge = getKernelBridge();
    const signal = createEntitySignal('task:1');

    let updated = false;
    signal.facts.subscribe(() => { updated = true; });

    await signal.set('name', 'Test Task');

    expect(signal.getSnapshot().facts.name).toBe('Test Task');
    expect(signal.getSnapshot().syncStatus).toBe('pending');
    expect(updated).toBe(true);
  });

  test('emits kernel event on set', async () => {
    const bridge = getKernelBridge();
    const signal = createEntitySignal('task:1');

    let received: KernelEvent | null = null;
    bridge.on('fact:updated', (e) => { received = e; });

    await signal.set('name', 'Test Task');

    expect(received).not.toBeNull();
    expect((received as any).entity).toBe('task:1');
    expect((received as any).attribute).toBe('name');
    expect((received as any).value).toBe('Test Task');
  });

  test('sync:confirmed updates status to synced', () => {
    const bridge = getKernelBridge();
    const signal = createEntitySignal('task:1');

    bridge.emit({
      type: 'sync:confirmed',
      entity: 'task:1',
    });

    expect(signal.getSnapshot().syncStatus).toBe('synced');
  });

  test('sync:rejected rolls back and sets conflict status', () => {
    const bridge = getKernelBridge();
    const signal = createEntitySignal('task:1');

    signal.set('name', 'New Name');

    bridge.emit({
      type: 'sync:rejected',
      entity: 'task:1',
      rollback: { name: 'Old Name' },
    });

    expect(signal.getSnapshot().facts.name).toBe('Old Name');
    expect(signal.getSnapshot().syncStatus).toBe('conflict');
  });

  test('subscribe calls handler with current state', () => {
    const signal = createEntitySignal('task:1');
    let received: any = null;

    signal.subscribe((data) => { received = data; });

    expect(received.facts).toEqual({});
    expect(received.syncStatus).toBe('synced');
  });
});
