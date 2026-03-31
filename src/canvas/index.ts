/**
 * Canvas components
 * 
 * @example
 * ```ts
 * import { FractalCanvas } from '@fractal/canvas';
 * 
 * const canvas = document.querySelector('fractal-canvas');
 * canvas.zoomIn();
 * canvas.pan(100, 0);
 * ```
 */

export { FractalCanvas } from './fractal-canvas.js';
export { scaleToVantage, vantageToScale } from './scale-vantage.js';
export type { FractalCanvasOptions, TransformState } from './fractal-canvas.js';
export type { ScaleVantageOptions } from './scale-vantage.js';
