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
 */

// Signals
export { Signal, effect, computed } from './signals/index.js';

// Shells
export { ThingShell, SHELL_REGISTRY, resolveShell, getShellAtVantage } from './shells/index.js';

// Types
export type { EntityData, SyncStatus, Atom, Fact, Link, ResolvedShell, BoundingRect } from './types.js';
