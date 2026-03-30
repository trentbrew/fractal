/**
 * Minimal reactive primitives — signal, effect, computed
 * 
 * A lightweight reactive system that works everywhere.
 * Uses the standard getter/setter pattern.
 */

type EffectFn = () => void;
type UnsubscribeFn = () => void;

let currentEffect: EffectFn | null = null;

export class Signal<T> {
  private _value: T;
  private _subscribers: Set<EffectFn> = new Set();

  constructor(value: T) {
    this._value = value;
  }

  get value(): T {
    if (currentEffect) {
      this._subscribers.add(currentEffect);
    }
    return this._value;
  }

  set value(newValue: T) {
    this._value = newValue;
    this._notify();
  }

  set(newValue: T): void {
    this.value = newValue;
  }

  update(fn: (value: T) => T): void {
    this._value = fn(this._value);
    this._notify();
  }

  subscribe(handler: EffectFn): UnsubscribeFn {
    this._subscribers.add(handler);
    return () => this._subscribers.delete(handler);
  }

  private _notify(): void {
    this._subscribers.forEach(fn => fn());
  }

  peek(): T {
    return this._value;
  }
}

export function signal<T>(initialValue: T): Signal<T> {
  return new Signal(initialValue);
}

export function effect(fn: EffectFn): UnsubscribeFn {
  const wrappedFn = () => {
    const prevEffect = currentEffect;
    currentEffect = wrappedFn;
    try {
      fn();
    } finally {
      currentEffect = prevEffect;
    }
  };
  
  currentEffect = wrappedFn;
  try {
    fn();
  } finally {
    currentEffect = null;
  }
  
  return () => {
    // Effect cleanup handled by subscribers
  };
}

export function computed<T>(fn: () => T): Signal<T> {
  const result = new Signal<T>(undefined as T);
  
  effect(() => {
    result.value = fn();
  });
  
  return result;
}
