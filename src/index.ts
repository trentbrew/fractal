/**
 * Fractal Responsiveness Web Components
 * 
 * A framework-agnostic, continuous-fidelity UI system built on web components.
 * 
 * @example
 * ```html
 * <fractal-canvas>
 *   <projection-context projection="kanban">
 *     <thing-shell entity="task:123" vantage="8.5"></thing-shell>
 *   </projection-context>
 * </fractal-canvas>
 * ```
 * 
 * @example
 * ```ts
 * import { useEntity, effect, createKernelBridge } from '@fractal/web';
 * 
 * // Connect to TQL kernel
 * createKernelBridge({
 *   onEvent: (event) => kernel.emit(event)
 * });
 * 
 * // Reactive entity access
 * const task = useEntity('task:123');
 * effect(() => {
 *   console.log(task.facts.value.name);
 * });
 * ```
 */

// Signals
export { Signal, signal, effect, computed } from './signals/index.js';
export {
  createEntitySignal,
  useEntity,
  getEntitySignal,
  clearEntitySignal,
  clearAllEntitySignals,
  type EntitySignal,
} from './signals/entity-signal.js';
export {
  createQuerySignal,
  useQuery,
  registerEntityForQueries,
  type QuerySignal,
  type QueryResult,
} from './signals/query-signal.js';

// Kernel Bridge
export {
  createKernelBridge,
  getKernelBridge,
  clearKernelBridge,
  type KernelEvent,
  type KernelEventHandler,
} from './kernel/bridge.js';

// Shells
export { ThingShell, withCrossfade, SHELL_REGISTRY, resolveShell, getShellAtVantage } from './shells/index.js';
export { ThingNode, ThingRow, ThingCard, ThingDialog } from './shells/index.js';
export type { ShellConfig, ResolvedShell } from './shells/index.js';

// Canvas
export { FractalCanvas, scaleToVantage, vantageToScale } from './canvas/index.js';
export type { FractalCanvasOptions, TransformState, ScaleVantageOptions } from './canvas/index.js';

// Projections
export {
  ProjectionContextElement,
  ProjectionTable,
  ProjectionKanban,
  ProjectionConstellation,
  getProjectionContext,
  resolveVantageWithContext,
  type ProjectionType,
  type ProjectionConfig,
} from './projections/index.js';

// Types
export type {
  Atom,
  Fact,
  Link,
  EntityData,
  SyncStatus,
  BoundingRect,
} from './types.js';
