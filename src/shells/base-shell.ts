/**
 * Base class for all Thing shells
 * 
 * Encapsulates:
 * - Entity signal subscription
 * - Vantage resolution
 * - Shadow DOM rendering
 * - Crossfade logic
 */

import type { EntityData, ResolvedShell } from '../types.js';
import { resolveShell } from './registry.js';

export abstract class ThingShell extends HTMLElement {
  private _entityId: string = '';
  private _vantage: number = 8; // card default
  private _signal: { value: EntityData } | null = null;
  private _dispose: (() => void) | null = null;

  static get observedAttributes() {
    return ['entity', 'vantage'];
  }

  get entityId(): string {
    return this._entityId;
  }

  get vantage(): number {
    return this._vantage;
  }

  set vantage(v: number) {
    this._vantage = v;
    this.updateVantageStyles();
    this.onVantageChange(v);
  }

  attributeChangedCallback(name: string, oldVal: string, newVal: string) {
    if (oldVal === newVal) return;
    
    if (name === 'entity') {
      this._entityId = newVal;
      this.subscribeToEntity();
    }
    
    if (name === 'vantage') {
      this.vantage = parseFloat(newVal) || 8;
    }
  }

  connectedCallback() {
    this.attachShadow({ mode: 'open' });
    this.updateVantageStyles();
    this.render();
  }

  disconnectedCallback() {
    this._dispose?.();
    this._dispose = null;
  }

  protected abstract render(): void;

  protected getEntityData(): EntityData | null {
    return this._signal?.value ?? null;
  }

  protected getResolvedShell(): ResolvedShell {
    return resolveShell(this.vantage);
  }

  protected onVantageChange(_vantage: number): void {
    // Override in subclasses to respond to vantage changes
  }

  private updateVantageStyles(): void {
    this.style.setProperty('--vantage', String(this._vantage));
  }

  private subscribeToEntity(): void {
    if (!this._entityId) return;
    
    // In the actual implementation, this would use the TqlSignalBridge
    // For now, we create a minimal reactive pattern
    this._signal = {
      value: {
        facts: {},
        links: [],
        syncStatus: 'synced',
      },
    };

    // Effect to re-render when data changes
    // TODO: wire up to TqlSignalBridge
  }

  protected updateFacts(facts: Record<string, unknown>): void {
    if (this._signal) {
      this._signal.value = {
        ...this._signal.value,
        facts: { ...this._signal.value.facts, ...facts },
      };
      this.render();
    }
  }

  protected updateSyncStatus(status: 'synced' | 'pending' | 'conflict'): void {
    if (this._signal) {
      this._signal.value = {
        ...this._signal.value,
        syncStatus: status,
      };
      this.render();
    }
  }
}
