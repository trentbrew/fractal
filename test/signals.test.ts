/**
 * Comprehensive tests for signal reactivity system
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  Signal,
  signal,
  effect,
  computed,
} from '../src/signals/reactivity.js';
import {
  createKernelBridge,
  getKernelBridge,
  clearKernelBridge,
  type KernelEvent,
} from '../src/kernel/bridge.js';
import {
  createEntitySignal,
  useEntity,
  getEntitySignal,
  clearEntitySignal,
  clearAllEntitySignals,
  type EntitySignal,
} from '../src/signals/entity-signal.js';

describe('Signal', () => {
  test('creates signal with initial value', () => {
    const s = new Signal(42);
    expect(s.value).toBe(42);
  });

  test('set updates value', () => {
    const s = new Signal(0);
    s.set(100);
    expect(s.value).toBe(100);
  });

  test('peek returns current value without tracking', () => {
    const s = new Signal(10);
    expect(s.peek()).toBe(10);
  });

  test('set with same value still notifies', () => {
    const s = new Signal(42);
    const spy = vi.fn();
    s.subscribe(spy);
    s.set(42);
    expect(spy).toHaveBeenCalled();
  });
});

describe('signal() factory', () => {
  test('creates signal from initial value', () => {
    const s = signal(42);
    expect(s.value).toBe(42);
  });

  test('can be typed', () => {
    const s = signal<string | null>(null);
    s.value = 'hello';
    expect(s.value).toBe('hello');
  });
});

describe('effect()', () => {
  test('runs immediately and tracks dependencies', () => {
    const a = signal(1);
    const b = signal(2);
    const spy = vi.fn();
    
    effect(() => {
      spy(a.value + b.value);
    });
    
    expect(spy).toHaveBeenCalledWith(3);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  test('re-runs when tracked signal changes', () => {
    const count = signal(0);
    const spy = vi.fn();
    
    effect(() => {
      spy(count.value);
    });
    
    expect(spy).toHaveBeenCalledWith(0);
    expect(spy).toHaveBeenCalledTimes(1);
    
    count.value = 1;
    expect(spy).toHaveBeenCalledWith(1);
    expect(spy).toHaveBeenCalledTimes(2);
    
    count.value = 2;
    expect(spy).toHaveBeenCalledWith(2);
    expect(spy).toHaveBeenCalledTimes(3);
  });

  test('does not re-run when unrelated signal changes', () => {
    const a = signal(1);
    const b = signal(2);
    const spy = vi.fn();
    
    effect(() => {
      spy(a.value);
    });
    
    expect(spy).toHaveBeenCalledTimes(1);
    
    b.value = 100;
    expect(spy).toHaveBeenCalledTimes(1);
  });

  test('tracks multiple dependencies', () => {
    const a = signal(1);
    const b = signal(2);
    const c = signal(3);
    const spy = vi.fn();
    
    effect(() => {
      spy(a.value + b.value + c.value);
    });
    
    expect(spy).toHaveBeenCalledWith(6);
    
    a.value = 10;
    expect(spy).toHaveBeenCalledWith(15);
    
    b.value = 20;
    expect(spy).toHaveBeenCalledWith(33);
  });
});

describe('computed()', () => {
  test('derives value from dependencies', () => {
    const a = signal(2);
    const b = signal(3);
    const product = computed(() => a.value * b.value);
    
    expect(product.value).toBe(6);
  });

  test('updates when dependencies change', () => {
    const count = signal(1);
    const doubled = computed(() => count.value * 2);
    
    expect(doubled.value).toBe(2);
    
    count.value = 5;
    expect(doubled.value).toBe(10);
  });
});

describe('KernelBridge', () => {
  afterEach(() => {
    clearKernelBridge();
  });

  test('creates singleton instance', () => {
    const bridge1 = createKernelBridge();
    const bridge2 = getKernelBridge();
    expect(bridge1).toBe(bridge2);
  });

  test('on() registers event handler', () => {
    const bridge = createKernelBridge();
    const spy = vi.fn();
    bridge.on('fact:updated', spy);
    
    bridge.emit({
      type: 'fact:updated',
      entity: 'task:1',
      attribute: 'name',
      value: 'Test',
      previous: null as any,
      timestamp: Date.now(),
    });
    
    expect(spy).toHaveBeenCalledTimes(1);
  });

  test('off() removes handler', () => {
    const bridge = createKernelBridge();
    const spy = vi.fn();
    const handler = (e: KernelEvent) => spy(e);
    
    bridge.on('fact:updated', handler);
    bridge.off('fact:updated', handler);
    
    bridge.emit({
      type: 'fact:updated',
      entity: 'task:1',
      attribute: 'name',
      value: 'Test',
      previous: null as any,
      timestamp: Date.now(),
    });
    
    expect(spy).not.toHaveBeenCalled();
  });

  test('handles multiple event types', () => {
    const bridge = createKernelBridge();
    const factSpy = vi.fn();
    const linkSpy = vi.fn();
    
    bridge.on('fact:updated', factSpy);
    bridge.on('link:created', linkSpy);
    
    bridge.emit({
      type: 'fact:updated',
      entity: 'task:1',
      attribute: 'name',
      value: 'Test',
      previous: null as any,
      timestamp: Date.now(),
    });
    bridge.emit({
      type: 'link:created',
      entity: 'task:1',
      target: 'project:1',
      relation: 'partOf',
      timestamp: Date.now(),
    });
    
    expect(factSpy).toHaveBeenCalledTimes(1);
    expect(linkSpy).toHaveBeenCalledTimes(1);
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

  test('createEntitySignal returns signal instance', () => {
    const signal = createEntitySignal('task:1');
    expect(signal).toBeDefined();
    expect(signal.id).toBe('task:1');
  });

  test('singleton behavior', () => {
    const s1 = createEntitySignal('task:1');
    const s2 = createEntitySignal('task:1');
    expect(s1).toBe(s2);
  });

  test('different entities have different signals', () => {
    const s1 = createEntitySignal('task:1');
    const s2 = createEntitySignal('task:2');
    expect(s1).not.toBe(s2);
  });

  test('useEntity is alias for createEntitySignal', () => {
    const s1 = useEntity('task:1');
    const s2 = createEntitySignal('task:1');
    expect(s1).toBe(s2);
  });

  test('getEntitySignal returns existing or undefined', () => {
    const s1 = createEntitySignal('task:1');
    const s2 = getEntitySignal('task:1');
    const s3 = getEntitySignal('nonexistent');
    
    expect(s2).toBe(s1);
    expect(s3).toBeUndefined();
  });

  test('initial state is empty and synced', () => {
    const signal = createEntitySignal('task:1');
    const snapshot = signal.getSnapshot();
    
    expect(snapshot.facts).toEqual({});
    expect(snapshot.links).toEqual([]);
    expect(snapshot.syncStatus).toBe('synced');
  });

  test('set updates fact optimistically', async () => {
    const signal = createEntitySignal('task:1');
    
    await signal.set('name', 'My Task');
    
    expect(signal.getSnapshot().facts.name).toBe('My Task');
    expect(signal.getSnapshot().syncStatus).toBe('pending');
  });

  test('set queues operation in bridge', async () => {
    const bridge = getKernelBridge();
    const signal = createEntitySignal('task:1');
    const spy = vi.fn();
    
    bridge.on('fact:updated', spy);
    await signal.set('name', 'Test');
    
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        entity: 'task:1',
        attribute: 'name',
        value: 'Test',
      })
    );
  });

  test('sync:confirmed updates status', () => {
    const bridge = getKernelBridge();
    const signal = createEntitySignal('task:1');
    
    signal.set('name', 'Pending');
    expect(signal.getSnapshot().syncStatus).toBe('pending');
    
    bridge.emit({
      type: 'sync:confirmed',
      entity: 'task:1',
      timestamp: Date.now(),
    });
    
    expect(signal.getSnapshot().syncStatus).toBe('synced');
  });

  test('sync:rejected rolls back', () => {
    const bridge = getKernelBridge();
    const signal = createEntitySignal('task:1');
    
    signal.set('name', 'New Value');
    
    bridge.emit({
      type: 'sync:rejected',
      entity: 'task:1',
      rollback: { name: 'Old Value' },
      timestamp: Date.now(),
    });
    
    expect(signal.getSnapshot().facts.name).toBe('Old Value');
    expect(signal.getSnapshot().syncStatus).toBe('conflict');
  });

  test('fact:updated from kernel updates signal', () => {
    const bridge = getKernelBridge();
    const signal = createEntitySignal('task:1');
    
    bridge.emit({
      type: 'fact:updated',
      entity: 'task:1',
      attribute: 'description',
      value: 'From kernel',
      previous: null as any,
      timestamp: Date.now(),
    });
    
    expect(signal.getSnapshot().facts.description).toBe('From kernel');
  });

  test('subscribe fires with current state', () => {
    const signal = createEntitySignal('task:1');
    let received: any = null;
    
    signal.subscribe((data) => { received = data; });
    
    expect(received.syncStatus).toBe('synced');
  });

  test('clearEntitySignal removes signal', () => {
    const s1 = createEntitySignal('task:1');
    clearEntitySignal('task:1');
    
    const s2 = createEntitySignal('task:1');
    expect(s1).not.toBe(s2);
  });

  test('clearAllEntitySignals removes all', () => {
    createEntitySignal('task:1');
    createEntitySignal('task:2');
    clearAllEntitySignals();
    
    expect(getEntitySignal('task:1')).toBeUndefined();
    expect(getEntitySignal('task:2')).toBeUndefined();
  });
});
