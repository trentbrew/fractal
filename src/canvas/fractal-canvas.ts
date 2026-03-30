/**
 * FractalCanvas — pan/zoom container for fractal shells
 * 
 * Features:
 * - CSS transform-based pan/zoom
 * - Scale to vantage mapping (non-linear curve)
 * - --vantage CSS custom property cascade
 * - Wheel, pinch, and trackpad gesture support
 * - Animation via requestAnimationFrame
 */

import { scaleToVantage, vantageToScale } from './scale-vantage.js';

export interface FractalCanvasOptions {
  minScale?: number;
  maxScale?: number;
  zoomSensitivity?: number;
  panSensitivity?: number;
  onVantageChange?: (vantage: number) => void;
  onScaleChange?: (scale: number) => void;
  onTranslateChange?: (x: number, y: number) => void;
}

export interface TransformState {
  scale: number;
  translateX: number;
  translateY: number;
  vantage: number;
}

const DEFAULT_OPTIONS: Required<FractalCanvasOptions> = {
  minScale: 0.1,
  maxScale: 10,
  zoomSensitivity: 0.001,
  panSensitivity: 1,
  onVantageChange: () => {},
  onScaleChange: () => {},
  onTranslateChange: () => {},
};

export class FractalCanvas extends HTMLElement {
  private _shadowRoot: ShadowRoot;
  private _options: Required<FractalCanvasOptions>;
  
  private _scale: number = 1;
  private _translateX: number = 0;
  private _translateY: number = 0;
  private _vantage: number = 5;
  
  private _isPanning: boolean = false;
  private _lastPointerX: number = 0;
  private _lastPointerY: number = 0;
  
  private _pinchDistance: number = 0;
  private _pinchCenterX: number = 0;
  private _pinchCenterY: number = 0;
  
  private _container: HTMLElement | null = null;
  private _content: HTMLElement | null = null;
  
  private _rafId: number | null = null;
  private _needsUpdate: boolean = false;

  constructor(options: FractalCanvasOptions = {}) {
    super();
    this._shadowRoot = this.attachShadow({ mode: 'open' });
    this._options = { ...DEFAULT_OPTIONS, ...options };
  }

  static get observedAttributes() {
    return ['min-scale', 'max-scale', 'scale', 'vantage'];
  }

  connectedCallback() {
    this._initDOM();
    this._bindEvents();
    this._updateTransform();
  }

  disconnectedCallback() {
    this._unbindEvents();
    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId);
    }
  }

  attributeChangedCallback(name: string, oldVal: string, newVal: string) {
    if (oldVal === newVal) return;
    
    if (name === 'min-scale') {
      this._options.minScale = parseFloat(newVal) || 0.1;
    }
    if (name === 'max-scale') {
      this._options.maxScale = parseFloat(newVal) || 10;
    }
    if (name === 'scale') {
      this.scale = parseFloat(newVal) || 1;
    }
    if (name === 'vantage') {
      this.vantage = parseFloat(newVal) || 5;
    }
  }

  get scale(): number {
    return this._scale;
  }

  set scale(value: number) {
    this._scale = Math.max(this._options.minScale, Math.min(this._options.maxScale, value));
    this._vantage = scaleToVantage(this._scale);
    this._scheduleUpdate();
    this._options.onScaleChange(this._scale);
    this._options.onVantageChange(this._vantage);
  }

  get vantage(): number {
    return this._vantage;
  }

  set vantage(value: number) {
    this._vantage = value;
    this._scale = vantageToScale(value);
    this._scheduleUpdate();
    this._options.onVantageChange(this._vantage);
    this._options.onScaleChange(this._scale);
  }

  get translateX(): number {
    return this._translateX;
  }

  get translateY(): number {
    return this._translateY;
  }

  set translateX(value: number) {
    this._translateX = value;
    this._scheduleUpdate();
    this._options.onTranslateChange(this._translateX, this._translateY);
  }

  set translateY(value: number) {
    this._translateY = value;
    this._scheduleUpdate();
    this._options.onTranslateChange(this._translateX, this._translateY);
  }

  pan(dx: number, dy: number): void {
    this._translateX += dx;
    this._translateY += dy;
    this._scheduleUpdate();
    this._options.onTranslateChange(this._translateX, this._translateY);
  }

  zoomTo(scale: number, centerX?: number, centerY?: number): void {
    if (centerX !== undefined && centerY !== undefined) {
      // Zoom towards center point
      const rect = this.getBoundingClientRect();
      const cx = centerX - rect.left - this._translateX;
      const cy = centerY - rect.top - this._translateY;
      
      const factor = scale / this._scale;
      this._translateX = centerX - rect.left - cx * factor;
      this._translateY = centerY - rect.top - cy * factor;
    }
    
    this.scale = scale;
  }

  zoomIn(amount: number = 1.2): void {
    this.scale = this._scale * amount;
  }

  zoomOut(amount: number = 1.2): void {
    this.scale = this._scale / amount;
  }

  resetTransform(): void {
    this._scale = 1;
    this._translateX = 0;
    this._translateY = 0;
    this._vantage = scaleToVantage(1);
    this._scheduleUpdate();
    this._options.onScaleChange(this._scale);
    this._options.onVantageChange(this._vantage);
    this._options.onTranslateChange(this._translateX, this._translateY);
  }

  getTransformState(): TransformState {
    return {
      scale: this._scale,
      translateX: this._translateX,
      translateY: this._translateY,
      vantage: this._vantage,
    };
  }

  private _initDOM(): void {
    this._shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          width: 100%;
          height: 100%;
          overflow: hidden;
          position: relative;
          cursor: grab;
        }
        
        :host([panning]) {
          cursor: grabbing;
        }
        
        .container {
          width: 100%;
          height: 100%;
          position: relative;
          overflow: hidden;
        }
        
        .content {
          position: absolute;
          transform-origin: 0 0;
          will-change: transform;
          contain: layout style;
        }
        
        .vantage-indicator {
          position: absolute;
          bottom: 12px;
          right: 12px;
          padding: 4px 8px;
          background: rgba(0, 0, 0, 0.6);
          color: white;
          font-family: monospace;
          font-size: 11px;
          border-radius: 4px;
          pointer-events: none;
          opacity: 0.7;
        }
      </style>
      
      <div class="container">
        <div class="content">
          <slot></slot>
        </div>
      </div>
      
      <div class="vantage-indicator"></div>
    `;
    
    this._container = this._shadowRoot.querySelector('.container');
    this._content = this._shadowRoot.querySelector('.content');
    
    this._updateVantageIndicator();
  }

  private _bindEvents(): void {
    this.addEventListener('wheel', this._onWheel, { passive: false });
    this.addEventListener('pointerdown', this._onPointerDown);
    this.addEventListener('pointermove', this._onPointerMove);
    this.addEventListener('pointerup', this._onPointerUp);
    this.addEventListener('pointercancel', this._onPointerUp);
    
    // Touch pinch support
    this.addEventListener('touchstart', this._onTouchStart, { passive: false });
    this.addEventListener('touchmove', this._onTouchMove, { passive: false });
    this.addEventListener('touchend', this._onTouchEnd);
  }

  private _unbindEvents(): void {
    this.removeEventListener('wheel', this._onWheel);
    this.removeEventListener('pointerdown', this._onPointerDown);
    this.removeEventListener('pointermove', this._onPointerMove);
    this.removeEventListener('pointerup', this._onPointerUp);
    this.removeEventListener('pointercancel', this._onPointerUp);
    this.removeEventListener('touchstart', this._onTouchStart);
    this.removeEventListener('touchmove', this._onTouchMove);
    this.removeEventListener('touchend', this._onTouchEnd);
  }

  private _onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    
    const rect = this.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Calculate new scale
    const delta = -e.deltaY * this._options.zoomSensitivity;
    const newScale = Math.max(
      this._options.minScale,
      Math.min(this._options.maxScale, this._scale * (1 + delta))
    );
    
    // Zoom towards mouse position
    if (newScale !== this._scale) {
      const factor = newScale / this._scale;
      this._translateX = mouseX - (mouseX - this._translateX) * factor;
      this._translateY = mouseY - (mouseY - this._translateY) * factor;
      
      this.scale = newScale;
      this._options.onTranslateChange(this._translateX, this._translateY);
    }
  };

  private _onPointerDown = (e: PointerEvent): void => {
    if (e.button !== 0) return; // Only left click
    
    this._isPanning = true;
    this._lastPointerX = e.clientX;
    this._lastPointerY = e.clientY;
    this.setAttribute('panning', '');
  };

  private _onPointerMove = (e: PointerEvent): void => {
    if (!this._isPanning) return;
    
    const dx = (e.clientX - this._lastPointerX) * this._options.panSensitivity;
    const dy = (e.clientY - this._lastPointerY) * this._options.panSensitivity;
    
    this._translateX += dx;
    this._translateY += dy;
    
    this._lastPointerX = e.clientX;
    this._lastPointerY = e.clientY;
    
    this._scheduleUpdate();
    this._options.onTranslateChange(this._translateX, this._translateY);
  };

  private _onPointerUp = (): void => {
    this._isPanning = false;
    this.removeAttribute('panning');
  };

  private _onTouchStart = (e: TouchEvent): void => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      this._pinchDistance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );
      this._pinchCenterX = (touch1.clientX + touch2.clientX) / 2;
      this._pinchCenterY = (touch1.clientY + touch2.clientY) / 2;
    }
  };

  private _onTouchMove = (e: TouchEvent): void => {
    if (e.touches.length !== 2) return;
    e.preventDefault();
    
    const touch1 = e.touches[0];
    const touch2 = e.touches[1];
    const newDistance = Math.hypot(
      touch2.clientX - touch1.clientX,
      touch2.clientY - touch1.clientY
    );
    const newCenterX = (touch1.clientX + touch2.clientX) / 2;
    const newCenterY = (touch1.clientY + touch2.clientY) / 2;
    
    const scaleDelta = newDistance / this._pinchDistance;
    const newScale = Math.max(
      this._options.minScale,
      Math.min(this._options.maxScale, this._scale * scaleDelta)
    );
    
    if (newScale !== this._scale) {
      const factor = newScale / this._scale;
      const rect = this.getBoundingClientRect();
      const cx = newCenterX - rect.left;
      const cy = newCenterY - rect.top;
      
      this._translateX = newCenterX - rect.left - (this._pinchCenterX - rect.left - this._translateX) * factor;
      this._translateY = newCenterY - rect.top - (this._pinchCenterY - rect.top - this._translateY) * factor;
      
      this.scale = newScale;
    }
    
    this._pinchDistance = newDistance;
    this._pinchCenterX = newCenterX;
    this._pinchCenterY = newCenterY;
  };

  private _onTouchEnd = (e: TouchEvent): void => {
    if (e.touches.length < 2) {
      this._pinchDistance = 0;
    }
  };

  private _scheduleUpdate(): void {
    this._needsUpdate = true;
    
    if (this._rafId === null) {
      this._rafId = requestAnimationFrame(this._onFrame);
    }
  }

  private _onFrame = (): void => {
    this._rafId = null;
    
    if (this._needsUpdate) {
      this._updateTransform();
      this._needsUpdate = false;
    }
  };

  private _updateTransform(): void {
    if (!this._content) return;
    
    const { scale, translateX, translateY } = this;
    this._content.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
    
    // Update CSS custom properties for all child elements
    this._content.style.setProperty('--vantage', String(this._vantage));
    this._content.style.setProperty('--scale', String(scale));
    this._content.style.setProperty('--translate-x', String(translateX));
    this._content.style.setProperty('--translate-y', String(translateY));
    
    this._updateVantageIndicator();
  }

  private _updateVantageIndicator(): void {
    const indicator = this._shadowRoot.querySelector('.vantage-indicator');
    if (indicator) {
      indicator.textContent = `v:${this._vantage.toFixed(1)} s:${this._scale.toFixed(2)}`;
    }
  }
}

// Register the custom element
customElements.define('fractal-canvas', FractalCanvas);

export default FractalCanvas;
