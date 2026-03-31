/**
 * Tests for projection context and scale-vantage mapping integration
 */

import { describe, test, expect } from 'vitest';
import {
  getProjectionContext,
  resolveEffectiveVantage,
  type ProjectionContextValue,
} from '../src/projections/projection-context.js';

describe('Projection Context Helpers', () => {
  test('resolveEffectiveVantage returns explicit when provided', () => {
    const result = resolveEffectiveVantage(10, null);
    expect(result).toBe(10);
  });

  test('resolveEffectiveVantage returns ambient from context when no explicit', () => {
    const context: ProjectionContextValue = {
      type: 'kanban',
      ambientVantage: 9,
      maxVantage: 10,
      query: null,
    };
    const result = resolveEffectiveVantage(null, context);
    expect(result).toBe(9);
  });

  test('resolveEffectiveVantage returns default when no explicit or context', () => {
    const result = resolveEffectiveVantage(null, null);
    expect(result).toBe(8);
  });
});
