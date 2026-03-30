/**
 * Tests for scale-vantage mapping
 */

import { describe, test, expect } from 'vitest';
import { 
  scaleToVantage, 
  vantageToScale,
  getCrossfadeFraction,
  getVantageBounds,
} from '../src/canvas/scale-vantage.js';

describe('scaleToVantage', () => {
  test('maps minimum scale to minimum vantage', () => {
    expect(scaleToVantage(0.1)).toBeCloseTo(0);
    expect(scaleToVantage(0.1)).toBeCloseTo(0);
  });

  test('maps maximum scale to maximum vantage', () => {
    expect(scaleToVantage(10)).toBeCloseTo(20);
  });

  test('maps middle scale to middle vantage', () => {
    // scale 1 should be around vantage 3-5 (row territory)
    const v = scaleToVantage(1);
    expect(v).toBeGreaterThanOrEqual(3);
    expect(v).toBeLessThanOrEqual(7);
  });

  test('scale 0.5 is in dot territory', () => {
    const v = scaleToVantage(0.5);
    expect(v).toBeLessThan(2);
  });

  test('scale 2-3 is in card territory', () => {
    const v = scaleToVantage(2);
    expect(v).toBeGreaterThanOrEqual(8);
    expect(v).toBeLessThanOrEqual(10);
  });

  test('clamping works for out-of-range values', () => {
    expect(scaleToVantage(0)).toBeCloseTo(0);
    expect(scaleToVantage(100)).toBeCloseTo(20);
  });
});

describe('vantageToScale', () => {
  test('maps minimum vantage to minimum scale', () => {
    expect(vantageToScale(0)).toBeCloseTo(0.1);
  });

  test('maps maximum vantage to maximum scale', () => {
    expect(vantageToScale(20)).toBeCloseTo(10);
  });

  test('is inverse of scaleToVantage', () => {
    const scales = [0.1, 0.5, 1, 2, 5, 10];
    for (const scale of scales) {
      const vantage = scaleToVantage(scale);
      const recoveredScale = vantageToScale(vantage);
      expect(recoveredScale).toBeCloseTo(scale, 1);
    }
  });
});

describe('getCrossfadeFraction', () => {
  test('returns 0 for integer vantages', () => {
    expect(getCrossfadeFraction(5)).toBe(0);
    expect(getCrossfadeFraction(8)).toBe(0);
    expect(getCrossfadeFraction(10)).toBe(0);
  });

  test('returns fractional part for non-integer vantages', () => {
    expect(getCrossfadeFraction(5.5)).toBe(0.5);
    expect(getCrossfadeFraction(8.25)).toBe(0.25);
    expect(getCrossfadeFraction(7.75)).toBe(0.75);
  });
});

describe('getVantageBounds', () => {
  test('returns same value for integer vantages', () => {
    const { floor, ceil } = getVantageBounds(5);
    expect(floor).toBe(5);
    expect(ceil).toBe(5);
  });

  test('returns floor and ceil for non-integer vantages', () => {
    const { floor, ceil } = getVantageBounds(8.5);
    expect(floor).toBe(8);
    expect(ceil).toBe(9);
  });
});
