/**
 * Shell Registry — maps vantage ranges to shell constructors
 * 
 * The registry is the central configuration point for the vantage system.
 * Adding a new shell is one entry — no changes to Thing logic.
 */

import type { ShellConfig, ResolvedShell } from '../types.js';

export const SHELL_REGISTRY: ShellConfig[] = [
  { min: 0,  max: 2,  name: 'node' },
  { min: 3,  max: 4,  name: 'mention' },
  { min: 5,  max: 7,  name: 'row' },
  { min: 8,  max: 10, name: 'card' },
  { min: 11, max: 13, name: 'dialog' },
  { min: 14, max: 20, name: 'screen' },
];

export function resolveShell(vantage: number): ResolvedShell {
  const floor = Math.floor(vantage);
  const ceil = Math.ceil(vantage);
  const crossfade = vantage % 1;

  const lower = SHELL_REGISTRY.find(
    s => floor >= s.min && floor <= s.max
  ) || null;

  // If vantage is an integer, upper is the next shell
  if (crossfade === 0) {
    const upperIdx = SHELL_REGISTRY.findIndex(s => s.min > floor);
    const upper = upperIdx >= 0 ? SHELL_REGISTRY[upperIdx] : null;
    return { lower, upper, crossfade: 1, vantage };
  }

  const upper = SHELL_REGISTRY.find(
    s => ceil >= s.min && ceil <= s.max
  ) || null;

  return { lower, upper, crossfade, vantage };
}

export function getShellAtVantage(vantage: number): ShellConfig | null {
  const { lower } = resolveShell(vantage);
  return lower;
}
