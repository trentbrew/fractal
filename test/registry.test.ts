/**
 * Tests for base shell and registry
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { resolveShell, SHELL_REGISTRY, getShellAtVantage } from '../src/shells/registry.js';

describe('SHELL_REGISTRY', () => {
  test('has correct number of shells', () => {
    expect(SHELL_REGISTRY.length).toBe(6);
  });

  test('shells cover vantage 0-20', () => {
    expect(SHELL_REGISTRY[0].min).toBe(0);
    expect(SHELL_REGISTRY[SHELL_REGISTRY.length - 1].max).toBe(20);
  });

  test('shells are non-overlapping and adjacent', () => {
    for (let i = 0; i < SHELL_REGISTRY.length - 1; i++) {
      expect(SHELL_REGISTRY[i].max).toBeLessThan(SHELL_REGISTRY[i + 1].min);
      expect(SHELL_REGISTRY[i].max + 1).toBe(SHELL_REGISTRY[i + 1].min);
    }
  });

  test('each shell has a name', () => {
    for (const shell of SHELL_REGISTRY) {
      expect(typeof shell.name).toBe('string');
      expect(shell.name.length).toBeGreaterThan(0);
    }
  });
});

describe('resolveShell', () => {
  test('resolves integer vantage to single shell with no upper', () => {
    const result = resolveShell(5);
    expect(result.lower?.name).toBe('row');
    expect(result.crossfade).toBe(0);
    expect(result.upper).toBeNull();
  });

  test('resolves fractional vantage to adjacent shells at boundary', () => {
    // 7.5 is at the boundary between row (5-7) and card (8-10)
    const result = resolveShell(7.5);
    expect(result.lower?.name).toBe('row');
    expect(result.upper?.name).toBe('card');
    expect(result.crossfade).toBe(0.5);
  });

  test('resolves node territory (0-2)', () => {
    expect(resolveShell(0).lower?.name).toBe('node');
    expect(resolveShell(1).lower?.name).toBe('node');
    expect(resolveShell(2).lower?.name).toBe('node');
  });

  test('resolves mention territory (3-4)', () => {
    expect(resolveShell(3).lower?.name).toBe('mention');
    expect(resolveShell(4).lower?.name).toBe('mention');
    expect(resolveShell(3.5).lower?.name).toBe('mention');
  });

  test('resolves row territory (5-7)', () => {
    expect(resolveShell(5).lower?.name).toBe('row');
    expect(resolveShell(7).lower?.name).toBe('row');
    expect(resolveShell(6).lower?.name).toBe('row');
  });

  test('resolves card territory (8-10)', () => {
    expect(resolveShell(8).lower?.name).toBe('card');
    expect(resolveShell(10).lower?.name).toBe('card');
    // 8.5 is within card territory, no crossfade needed
    expect(resolveShell(8.5).lower?.name).toBe('card');
    // 10.5 is at boundary between card (8-10) and dialog (11-13)
    const boundary = resolveShell(10.5);
    expect(boundary.lower?.name).toBe('card');
    expect(boundary.upper?.name).toBe('dialog');
  });

  test('resolves dialog territory (11-13)', () => {
    expect(resolveShell(11).lower?.name).toBe('dialog');
    expect(resolveShell(13).lower?.name).toBe('dialog');
  });

  test('resolves screen territory (14-20)', () => {
    expect(resolveShell(14).lower?.name).toBe('screen');
    expect(resolveShell(20).lower?.name).toBe('screen');
    expect(resolveShell(17).lower?.name).toBe('screen');
  });
});

describe('getShellAtVantage', () => {
  test('returns shell for any vantage in range', () => {
    expect(getShellAtVantage(1)?.name).toBe('node');
    expect(getShellAtVantage(5)?.name).toBe('row');
    expect(getShellAtVantage(8)?.name).toBe('card');
    expect(getShellAtVantage(15)?.name).toBe('screen');
  });

  test('returns null for vantage out of range', () => {
    expect(getShellAtVantage(-1)).toBeNull();
    expect(getShellAtVantage(25)).toBeNull();
  });
});
