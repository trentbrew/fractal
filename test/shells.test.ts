/**
 * Comprehensive tests for shell system
 */

import { describe, test, expect } from 'vitest';
import {
  resolveShell,
  SHELL_REGISTRY,
  getShellAtVantage,
  type ResolvedShell,
  type ShellConfig,
} from '../src/shells/registry.js';

describe('SHELL_REGISTRY', () => {
  test('contains expected shell types', () => {
    const names = SHELL_REGISTRY.map(s => s.name);
    expect(names).toContain('node');
    expect(names).toContain('mention');
    expect(names).toContain('row');
    expect(names).toContain('card');
    expect(names).toContain('dialog');
    expect(names).toContain('screen');
  });

  test('has correct number of shells', () => {
    expect(SHELL_REGISTRY.length).toBe(6);
  });

  test('shells cover vantage range 0-20', () => {
    expect(SHELL_REGISTRY[0].min).toBe(0);
    expect(SHELL_REGISTRY[SHELL_REGISTRY.length - 1].max).toBe(20);
  });

  test('shells are adjacent with no gaps', () => {
    for (let i = 0; i < SHELL_REGISTRY.length - 1; i++) {
      const current = SHELL_REGISTRY[i];
      const next = SHELL_REGISTRY[i + 1];
      expect(current.max).toBe(next.min - 1);
    }
  });

  test('each shell has required properties', () => {
    for (const shell of SHELL_REGISTRY) {
      expect(shell.name).toBeDefined();
      expect(shell.min).toBeDefined();
      expect(shell.max).toBeDefined();
      expect(typeof shell.min).toBe('number');
      expect(typeof shell.max).toBe('number');
      expect(shell.min).toBeLessThanOrEqual(shell.max);
    }
  });
});

describe('Shell Territory Boundaries', () => {
  const territories: [string, number, number][] = [
    ['node', 0, 2],
    ['mention', 3, 4],
    ['row', 5, 7],
    ['card', 8, 10],
    ['dialog', 11, 13],
    ['screen', 14, 20],
  ];

  test.each(territories)('resolves %s territory (vantage %d-%d)', (name, min, max) => {
    const mid = (min + max) / 2;
    expect(resolveShell(mid).lower?.name).toBe(name);
    expect(resolveShell(min).lower?.name).toBe(name);
    expect(resolveShell(max).lower?.name).toBe(name);
  });

  test('boundary between node and mention', () => {
    const boundary = resolveShell(2.5);
    expect(boundary.lower?.name).toBe('node');
    expect(boundary.upper?.name).toBe('mention');
    expect(boundary.crossfade).toBeCloseTo(0.5);
  });

  test('boundary between mention and row', () => {
    const boundary = resolveShell(4.5);
    expect(boundary.lower?.name).toBe('mention');
    expect(boundary.upper?.name).toBe('row');
  });

  test('boundary between row and card', () => {
    const boundary = resolveShell(7.5);
    expect(boundary.lower?.name).toBe('row');
    expect(boundary.upper?.name).toBe('card');
  });

  test('boundary between card and dialog', () => {
    const boundary = resolveShell(10.5);
    expect(boundary.lower?.name).toBe('card');
    expect(boundary.upper?.name).toBe('dialog');
  });

  test('boundary between dialog and screen', () => {
    const boundary = resolveShell(13.5);
    expect(boundary.lower?.name).toBe('dialog');
    expect(boundary.upper?.name).toBe('screen');
  });

  test('integer vantages have no crossfade', () => {
    expect(resolveShell(2).crossfade).toBe(0);
    expect(resolveShell(5).crossfade).toBe(0);
    expect(resolveShell(8).crossfade).toBe(0);
    expect(resolveShell(11).crossfade).toBe(0);
    expect(resolveShell(14).crossfade).toBe(0);
  });

  test('crossfade increases toward upper shell', () => {
    const b1 = resolveShell(2.1);
    const b2 = resolveShell(2.5);
    const b3 = resolveShell(2.9);
    
    expect(b1.crossfade).toBeLessThan(b2.crossfade);
    expect(b2.crossfade).toBeLessThan(b3.crossfade);
  });
});

describe('resolveShell()', () => {
  test('returns resolved shell with lower property', () => {
    const result = resolveShell(5);
    expect(result.lower).toBeDefined();
    expect(result.lower?.name).toBe('row');
  });

  test('returns null upper for integer vantages', () => {
    const result = resolveShell(8);
    expect(result.upper).toBeNull();
    expect(result.crossfade).toBe(0);
  });

  test('returns upper shell at boundaries', () => {
    const result = resolveShell(7.5);
    expect(result.upper).toBeDefined();
    expect(result.upper?.name).toBe('card');
  });

  test('crossfade is fractional part at boundaries', () => {
    expect(resolveShell(5.25).crossfade).toBe(0.25);
    expect(resolveShell(8.75).crossfade).toBe(0.75);
    expect(resolveShell(11.5).crossfade).toBe(0.5);
  });

  test('handles full range 0-20', () => {
    for (let v = 0; v <= 20; v++) {
      const result = resolveShell(v);
      expect(result.lower).toBeDefined();
      expect(result.lower?.name).not.toBeUndefined();
    }
  });

  test('handles edge cases 0 and 20', () => {
    const min = resolveShell(0);
    expect(min.lower?.name).toBe('node');
    
    const max = resolveShell(20);
    expect(max.lower?.name).toBe('screen');
  });
});

describe('getShellAtVantage()', () => {
  test('returns shell for valid vantages', () => {
    for (let v = 0; v <= 20; v++) {
      const shell = getShellAtVantage(v);
      expect(shell).toBeDefined();
      expect(shell?.min).toBeLessThanOrEqual(v);
      expect(shell?.max).toBeGreaterThanOrEqual(v);
    }
  });

  test('returns null for negative vantage', () => {
    expect(getShellAtVantage(-1)).toBeNull();
  });

  test('returns correct shell for each territory', () => {
    expect(getShellAtVantage(1)?.name).toBe('node');
    expect(getShellAtVantage(3)?.name).toBe('mention');
    expect(getShellAtVantage(6)?.name).toBe('row');
    expect(getShellAtVantage(9)?.name).toBe('card');
    expect(getShellAtVantage(12)?.name).toBe('dialog');
    expect(getShellAtVantage(17)?.name).toBe('screen');
  });
});

describe('ResolvedShell type', () => {
  test('has correct shape for single shell', () => {
    const result = resolveShell(5);
    
    expect(result).toHaveProperty('lower');
    expect(result).toHaveProperty('upper');
    expect(result).toHaveProperty('crossfade');
    expect(result).toHaveProperty('vantage');
    
    expect(result.lower).not.toBeNull();
    expect(result.upper).toBeNull();
    expect(result.crossfade).toBe(0);
  });

  test('has correct shape for boundary', () => {
    const result = resolveShell(7.5);
    
    expect(result.lower).not.toBeNull();
    expect(result.upper).not.toBeNull();
    expect(result.crossfade).toBe(0.5);
  });
});

describe('ShellConfig type', () => {
  test('accepts valid config', () => {
    const config: ShellConfig = {
      name: 'test',
      min: 0,
      max: 10,
    };
    
    expect(config.name).toBe('test');
  });
});

describe('Edge Cases', () => {
  test('handles very small fractional vantages', () => {
    const result = resolveShell(7.0001);
    expect(result.crossfade).toBeCloseTo(0.0001);
  });

  test('handles very close to boundary', () => {
    const result = resolveShell(7.9999);
    expect(result.upper?.name).toBe('card');
    expect(result.crossfade).toBeCloseTo(0.9999);
  });
});
