/**
 * Signals — reactive primitives for Fractal Responsiveness
 * 
 * Provides:
 * - signal, effect, computed for reactive state
 * - createEntitySignal / useEntity for reactive entity access
 * - createQuerySignal / useQuery for reactive queries
 * 
 * @example
 * ```ts
 * import { useEntity, useQuery, effect, signal } from '@fractal/signals';
 * 
 * // Reactive entity access
 * const task = useEntity('task:123');
 * effect(() => console.log(task.facts.value.name));
 * 
 * // Reactive query
 * const tasks = useQuery({ type: 'task' });
 * effect(() => console.log(tasks.results.value.entities));
 * ```
 */

export { Signal, signal, effect, computed } from './reactivity.js';
