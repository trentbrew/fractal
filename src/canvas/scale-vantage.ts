/**
 * Scale to Vantage mapping
 * 
 * Non-linear curve: more dwell time at card territory (8-10).
 */

export interface ScaleVantageOptions {
  minScale: number;
  maxScale: number;
  minVantage: number;
  maxVantage: number;
}

export const DEFAULT_SCALE_VANTAGE_OPTIONS: ScaleVantageOptions = {
  minScale: 0.1,
  maxScale: 10,
  minVantage: 0,
  maxVantage: 20,
};

/**
 * Maps a scale value (0.1 → 10) to a vantage value (0 → 20).
 * Uses a piecewise linear function for more dwell time in card territory.
 */
export function scaleToVantage(
  scale: number,
  options: Partial<ScaleVantageOptions> = {}
): number {
  const opts = { ...DEFAULT_SCALE_VANTAGE_OPTIONS, ...options };
  
  // Clamp scale to range
  const clampedScale = Math.max(opts.minScale, Math.min(opts.maxScale, scale));
  
  // Normalize to 0-1 range
  const normalized = (clampedScale - opts.minScale) / (opts.maxScale - opts.minScale);
  
  // Piecewise linear mapping:
  // - 0.0 to 0.05: fast through dot territory (0-1)
  // - 0.05 to 0.2: slow through card territory (1-10)
  // - 0.2 to 1.0: reasonable through dialog/screen (10-20)
  
  if (normalized < 0.05) {
    // Fast through dot territory
    const t = normalized / 0.05;
    return opts.minVantage + t * 1;
  } else if (normalized < 0.2) {
    // Slow through card territory
    const t = (normalized - 0.05) / 0.15;
    return 1 + t * 9; // 1 → 10
  } else {
    // Through dialog/screen
    const t = (normalized - 0.2) / 0.8;
    return 10 + t * 10; // 10 → 20
  }
}

/**
 * Maps a vantage value (0 → 20) to a scale value (0.1 → 10).
 */
export function vantageToScale(
  vantage: number,
  options: Partial<ScaleVantageOptions> = {}
): number {
  const opts = { ...DEFAULT_SCALE_VANTAGE_OPTIONS, ...options };
  
  // Clamp vantage to range
  const clampedVantage = Math.max(opts.minVantage, Math.min(opts.maxVantage, vantage));
  
  // Piecewise inverse mapping
  if (clampedVantage < 1) {
    const t = clampedVantage / 1;
    return opts.minScale + t * 0.05 * (opts.maxScale - opts.minScale);
  } else if (clampedVantage < 10) {
    const t = (clampedVantage - 1) / 9;
    return opts.minScale + (0.05 + t * 0.15) * (opts.maxScale - opts.minScale);
  } else {
    const t = (clampedVantage - 10) / 10;
    return opts.minScale + (0.2 + t * 0.8) * (opts.maxScale - opts.minScale);
  }
}

/**
 * Calculates the fractional crossfade position between two vantages.
 */
export function getCrossfadeFraction(vantage: number): number {
  return vantage % 1;
}

/**
 * Gets the floor and ceil vantages for crossfade calculation.
 */
export function getVantageBounds(vantage: number): { floor: number; ceil: number } {
  return {
    floor: Math.floor(vantage),
    ceil: Math.ceil(vantage),
  };
}
