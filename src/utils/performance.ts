/**
 * Performance utilities — virtual scrolling and optimization helpers
 */

export interface VirtualScrollConfig {
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
}

export class VirtualScroller {
  private _config: Required<VirtualScrollConfig>;
  private _scrollTop: number = 0;
  private _items: unknown[] = [];

  constructor(config: VirtualScrollConfig) {
    this._config = {
      overscan: 3,
      ...config,
    };
  }

  setItems(items: unknown[]): void {
    this._items = items;
  }

  setScrollTop(scrollTop: number): void {
    this._scrollTop = scrollTop;
  }

  getVisibleRange(): { start: number; end: number } {
    const { itemHeight, containerHeight, overscan } = this._config;
    
    const start = Math.max(0, Math.floor(this._scrollTop / itemHeight) - overscan);
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const end = Math.min(this._items.length, start + visibleCount + overscan * 2);

    return { start, end };
  }

  getTotalHeight(): number {
    return this._items.length * this._config.itemHeight;
  }

  getOffset(index: number): number {
    return index * this._config.itemHeight;
  }

  getItems(): unknown[] {
    const { start, end } = this.getVisibleRange();
    return this._items.slice(start, end).map((item, i) => ({
      item,
      index: start + i,
      offset: this.getOffset(start + i),
    }));
  }
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

export function throttle<T extends (...args: unknown[]) => unknown>(
  fn: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => { inThrottle = false; }, limit);
    }
  };
}

export function memoize<T extends (...args: unknown[]) => unknown>(
  fn: T
): T {
  const cache = new Map<string, ReturnType<T>>();
  return ((...args: Parameters<T>) => {
    const key = JSON.stringify(args);
    if (cache.has(key)) {
      return cache.get(key);
    }
    const result = fn(...args);
    cache.set(key, result);
    return result;
  }) as T;
}

export class PerformanceMonitor {
  private _marks: Map<string, number> = new Map();

  mark(name: string): void {
    this._marks.set(name, performance.now());
  }

  measure(name: string, startMark: string, endMark?: string): number {
    const start = this._marks.get(startMark);
    if (!start) return 0;
    
    const end = endMark ? this._marks.get(endMark) : performance.now();
    const duration = (end ?? performance.now()) - start;
    
    return duration;
  }

  getMarks(): Map<string, number> {
    return new Map(this._marks);
  }

  clear(): void {
    this._marks.clear();
  }
}
