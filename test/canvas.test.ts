/**
 * Comprehensive tests for scale-vantage mapping
 */

import { describe, test, expect } from 'vitest';
import {
  scaleToVantage,
  vantageToScale,
  getCrossfadeFraction,
  getVantageBounds,
  type ScaleVantageOptions,
} from '../src/canvas/scale-vantage.js';

describe('scaleToVantage', () => {
  test('maps minimum scale to minimum vantage', () => {
    expect(scaleToVantage(0.1)).toBeCloseTo(0);
  });

  test('maps maximum scale to maximum vantage', () => {
    expect(scaleToVantage(10)).toBeCloseTo(20);
  });

  test('default options use full range', () => {
    const options: ScaleVantageOptions = {
      minScale: 0.1,
      maxScale: 10,
      minVantage: 0,
      maxVantage: 20,
    };
    
    expect(scaleToVantage(0.1, options)).toBeCloseTo(0);
    expect(scaleToVantage(10, options)).toBeCloseTo(20);
  });

  test('clamps out-of-range values', () => {
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
      const recovered = vantageToScale(vantage);
      expect(recovered).toBeCloseTo(scale, 1);
    }
  });

  test('clamps out-of-range values', () => {
    expect(vantageToScale(-5)).toBeCloseTo(0.1);
    expect(vantageToScale(100)).toBeCloseTo(10);
  });
});

describe('getCrossfadeFraction', () => {
  test('returns 0 for integer vantages', () => {
    expect(getCrossfadeFraction(0)).toBe(0);
    expect(getCrossfadeFraction(5)).toBe(0);
    expect(getCrossfadeFraction(10)).toBe(0);
    expect(getCrossfadeFraction(20)).toBe(0);
  });

  test('returns fractional part for decimals', () => {
    expect(getCrossfadeFraction(5.5)).toBe(0.5);
    expect(getCrossfadeFraction(8.25)).toBe(0.25);
    expect(getCrossfadeFraction(7.75)).toBe(0.75);
  });

  test('handles large decimals', () => {
    expect(getCrossfadeFraction(10.999)).toBeCloseTo(0.999);
  });
});

describe('getVantageBounds', () => {
  test('integer vantage has same floor and ceil', () => {
    const { floor, ceil } = getVantageBounds(5);
    expect(floor).toBe(5);
    expect(ceil).toBe(5);
  });

  test('decimal vantage has different floor and ceil', () => {
    const { floor, ceil } = getVantageBounds(5.5);
    expect(floor).toBe(5);
    expect(ceil).toBe(6);
  });

  test('negative decimals', () => {
    const { floor, ceil } = getVantageBounds(-1.5);
    expect(floor).toBe(-2);
    expect(ceil).toBe(-1);
  });
});

describe('Scale-Vantage Mapping', () => {
  describe('Territory correspondence', () => {
    test('scale 0.1 is at min vantage', () => {
      const v = scaleToVantage(0.1);
      expect(v).toBeCloseTo(0);
    });

    test('scale 10 is at max vantage', () => {
      const v = scaleToVantage(10);
      expect(v).toBeCloseTo(20);
    });
  });

  describe('Monotonicity', () => {
    test('scaleToVantage is monotonically increasing', () => {
      let lastVantage = -Infinity;
      for (let s = 0.1; s <= 10; s += 0.1) {
        const v = scaleToVantage(s);
        expect(v).toBeGreaterThanOrEqual(lastVantage);
        lastVantage = v;
      }
    });

    test('vantageToScale is monotonically increasing', () => {
      let lastScale = -Infinity;
      for (let v = 0; v <= 20; v += 0.5) {
        const s = vantageToScale(v);
        expect(s).toBeGreaterThanOrEqual(lastScale);
        lastScale = s;
      }
    });
  });
});

describe('Edge Cases', () => {
  test('handles zero scale', () => {
    expect(scaleToVantage(0)).toBeCloseTo(0);
  });

  test('handles very large scale', () => {
    expect(scaleToVantage(1000)).toBeCloseTo(20);
  });

  test('handles negative vantage in vantageToScale', () => {
    expect(vantageToScale(-10)).toBeCloseTo(0.1);
  });

  test('handles vantage beyond 20', () => {
    expect(vantageToScale(30)).toBeCloseTo(10);
  });

  test('precision at boundaries', () => {
    const v1 = scaleToVantage(0.1);
    const v2 = scaleToVantage(0.10001);
    expect(v2 - v1).toBeLessThan(0.001);
  });
});
