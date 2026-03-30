/**
 * Minimal reactive primitives — signal, effect, computed
 * 
 * Uses native Signal where available, polyfill otherwise.
 * This is a thin wrapper that provides a consistent API.
 */

export { Signal, effect, computed } from 'signal-utils';
