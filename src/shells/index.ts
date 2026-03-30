/**
 * Shell components
 * 
 * @example
 * ```ts
 * import { ThingShell, SHELL_REGISTRY, resolveShell, withCrossfade } from '@fractal/shells';
 * 
 * class MyShell extends ThingShell {
 *   render() {
 *     const data = this.getEntityData();
 *     this.renderHTML(`<div>${data?.facts.name ?? 'Loading...'}</div>`);
 *   }
 * }
 * ```
 */

export { SHELL_REGISTRY, resolveShell, getShellAtVantage } from './registry.js';
export type { ShellConfig, ResolvedShell } from '../types.js';
export { ThingShell, withCrossfade } from './base-shell.js';

// Pre-built shell components
export { ThingNode } from './thing-node.js';
export { ThingRow } from './thing-row.js';
export { ThingCard } from './thing-card.js';
export { ThingDialog } from './thing-dialog.js';
