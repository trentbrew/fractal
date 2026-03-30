/**
 * Ghost Proxy — spatial memory for dialog transitions
 * 
 * Animates Things between vantages when they portal outside the canvas.
 * Uses anime.js for smooth morphing animations.
 */

export interface GhostProxyConfig {
  duration?: number;
  easing?: string;
}

const DEFAULT_CONFIG = {
  duration: 300,
  easing: 'easeOutCubic',
};

// Store for spatial memory (bounding rects)
const spatialMemory = new Map<string, DOMRect>();

export function captureSpatialMemory(id: string, element: Element): DOMRect {
  const rect = element.getBoundingClientRect();
  spatialMemory.set(id, rect);
  return rect;
}

export function getSpatialMemory(id: string): DOMRect | undefined {
  return spatialMemory.get(id);
}

export function clearSpatialMemory(id: string): void {
  spatialMemory.delete(id);
}

export function getAllSpatialMemories(): Map<string, DOMRect> {
  return new Map(spatialMemory);
}

export class GhostProxy {
  private _activeGhost: HTMLElement | null = null;
  private _config: Required<GhostProxyConfig>;

  constructor(config: GhostProxyConfig = {}) {
    this._config = { ...DEFAULT_CONFIG, ...config } as Required<GhostProxyConfig>;
  }

  async expand(
    thingId: string,
    sourceRect: DOMRect,
    targetRect: DOMRect,
    content: string
  ): Promise<void> {
    // Clean up any existing ghost
    this._cleanup();

    // Create ghost element
    const ghost = document.createElement('div');
    ghost.innerHTML = content;
    const inner = ghost.firstElementChild as HTMLElement;
    
    if (!inner) return;

    // Position at source
    ghost.style.cssText = `
      position: fixed;
      left: ${sourceRect.left}px;
      top: ${sourceRect.top}px;
      width: ${sourceRect.width}px;
      height: ${sourceRect.height}px;
      z-index: 10000;
      pointer-events: none;
      overflow: hidden;
      border-radius: ${sourceRect.width > 200 ? '8px' : '50%'};
    `;

    inner.style.cssText = `
      width: 100%;
      height: 100%;
      background: white;
      border-radius: inherit;
    `;

    document.body.appendChild(ghost);
    this._activeGhost = ghost;

    // Capture target for collapse
    captureSpatialMemory(thingId, ghost);

    // Animate to target
    return this._animate(ghost, sourceRect, targetRect);
  }

  async collapse(
    thingId: string,
    sourceRect: DOMRect,
    targetRect: DOMRect,
    content: string
  ): Promise<void> {
    this._cleanup();

    const ghost = document.createElement('div');
    ghost.innerHTML = content;
    const inner = ghost.firstElementChild as HTMLElement;
    
    if (!inner) return;

    ghost.style.cssText = `
      position: fixed;
      left: ${sourceRect.left}px;
      top: ${sourceRect.top}px;
      width: ${sourceRect.width}px;
      height: ${sourceRect.height}px;
      z-index: 10000;
      pointer-events: none;
      overflow: hidden;
      border-radius: ${sourceRect.width > 200 ? '12px' : '8px'};
    `;

    inner.style.cssText = `
      width: 100%;
      height: 100%;
      background: white;
      border-radius: inherit;
    `;

    document.body.appendChild(ghost);
    this._activeGhost = ghost;

    return this._animate(ghost, sourceRect, targetRect);
  }

  private async _animate(
    element: HTMLElement,
    from: DOMRect,
    to: DOMRect
  ): Promise<void> {
    const { duration, easing } = this._config;

    // Use native CSS transitions as fallback if anime.js unavailable
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Ease function (easeOutCubic approximation)
      const eased = 1 - Math.pow(1 - progress, 3);

      // Interpolate position and size
      const left = from.left + (to.left - from.left) * eased;
      const top = from.top + (to.top - from.top) * eased;
      const width = from.width + (to.width - from.width) * eased;
      const height = from.height + (to.height - from.height) * eased;
      const radius = (from.width > 200 ? 12 : 8) + (8 - (from.width > 200 ? 12 : 8)) * eased;

      element.style.left = `${left}px`;
      element.style.top = `${top}px`;
      element.style.width = `${width}px`;
      element.style.height = `${height}px`;
      element.style.borderRadius = `${radius}px`;

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        this._cleanup();
      }
    };

    return new Promise(resolve => {
      requestAnimationFrame(animate);
      setTimeout(() => {
        this._cleanup();
        resolve();
      }, duration * 1.5);
    });
  }

  private _cleanup(): void {
    if (this._activeGhost) {
      this._activeGhost.remove();
      this._activeGhost = null;
    }
  }

  isAnimating(): boolean {
    return this._activeGhost !== null;
  }

  cancel(): void {
    this._cleanup();
  }
}

// Singleton
let _ghostProxy: GhostProxy | null = null;

export function getGhostProxy(): GhostProxy {
  if (!_ghostProxy) {
    _ghostProxy = new GhostProxy();
  }
  return _ghostProxy;
}
