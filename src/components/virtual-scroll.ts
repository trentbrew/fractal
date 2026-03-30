/**
 * Virtual Scroll — renders only visible items
 * 
 * Optimizes rendering for large collections by only rendering
 * items within the visible viewport.
 */

export interface VirtualScrollConfig {
  itemHeight: number;
  overscan?: number;
  container: HTMLElement;
}

export class VirtualScroll {
  private _config: VirtualScrollConfig;
  private _scrollTop: number = 0;
  private _containerHeight: number = 0;
  private _itemCount: number = 0;
  private _renderCallback: (startIndex: number, endIndex: number) => void;

  constructor(config: VirtualScrollConfig) {
    this._config = {
      overscan: 3,
      ...config,
    };
    this._containerHeight = config.container.clientHeight;

    config.container.addEventListener('scroll', this._onScroll);
  }

  setItemCount(count: number): void {
    this._itemCount = count;
    this._render();
  }

  setRenderCallback(callback: (startIndex: number, endIndex: number) => void): void {
    this._renderCallback = callback;
  }

  private _onScroll = (): void => {
    const container = this._config.container;
    this._scrollTop = container.scrollTop;
    this._render();
  };

  private _render(): void {
    const { itemHeight, overscan } = this._config;
    const visibleCount = Math.ceil(this._containerHeight / itemHeight);
    const startIndex = Math.max(0, Math.floor(this._scrollTop / itemHeight) - (overscan ?? 0));
    const endIndex = Math.min(this._itemCount, startIndex + visibleCount + (overscan ?? 0) * 2);

    this._renderCallback(startIndex, endIndex);
  }

  scrollToIndex(index: number, behavior: ScrollBehavior = 'smooth'): void {
    this._config.container.scrollTo({
      top: index * this._config.itemHeight,
      behavior,
    });
  }

  destroy(): void {
    this._config.container.removeEventListener('scroll', this._onScroll);
  }
}
