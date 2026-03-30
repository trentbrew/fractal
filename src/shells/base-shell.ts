/**
 * Base class for all Thing shells
 * 
 * Encapsulates:
 * - Entity signal subscription via useEntity()
 * - Vantage resolution via resolveShell()
 * - Shadow DOM rendering
 * - Crossfade logic at territory boundaries
 * - CSS custom property cascade (--vantage)
 */

import { effect } from '../signals/index.js';
import { useEntity, type EntitySignal } from '../signals/entity-signal.js';
import { resolveShell, getShellAtVantage } from './registry.js';
import type { ResolvedShell, ShellConfig } from '../types.js';

export abstract class ThingShell extends HTMLElement {
  private _entityId: string = '';
  private _vantage: number = 8; // card default
  private _entitySignal: EntitySignal | null = null;
  private _dispose: (() => void) | null = null;
  private _shadowRoot: ShadowRoot | null = null;

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
    this.render();
  }

  get entitySignal(): EntitySignal | null {
    return this._entitySignal;
  }

  get resolvedShell(): ResolvedShell {
    return resolveShell(this.vantage);
  }

  get currentShell(): ShellConfig | null {
    return getShellAtVantage(this.vantage);
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
    this._shadowRoot = this.attachShadow({ mode: 'open' });
    this.updateVantageStyles();
    this.render();
  }

  disconnectedCallback() {
    this._dispose?.();
    this._dispose = null;
    this._entitySignal = null;
  }

  protected abstract render(): void;

  protected getEntityData() {
    return this._entitySignal?.getSnapshot() ?? null;
  }

  protected getFact(attr: string) {
    return this._entitySignal?.facts.peek()[attr] ?? null;
  }

  protected getAllFacts() {
    return this._entitySignal?.facts.peek() ?? {};
  }

  protected async setFact(attr: string, value: unknown) {
    if (this._entitySignal) {
      await this._entitySignal.set(attr, value as any);
    }
  }

  protected onVantageChange(_vantage: number): void {
    // Override in subclasses to respond to vantage changes
  }

  protected updateVantageStyles(): void {
    this.style.setProperty('--vantage', String(this._vantage));
    
    // Set crossfade for dual-shell rendering
    const { crossfade, lower, upper } = this.resolvedShell;
    this.style.setProperty('--crossfade', String(crossfade));
    this.style.setProperty('--lower-shell', lower?.name ?? '');
    this.style.setProperty('--upper-shell', upper?.name ?? '');
    
    // Notify shadow DOM children
    if (this._shadowRoot) {
      this._shadowRoot.host.style.setProperty('--vantage', String(this._vantage));
      this._shadowRoot.host.style.setProperty('--crossfade', String(crossfade));
    }
  }

  protected renderHTML(html: string): void {
    if (this._shadowRoot) {
      this._shadowRoot.innerHTML = html;
    }
  }

  protected renderTemplate(template: HTMLTemplateElement): void {
    if (this._shadowRoot && template.content) {
      this._shadowRoot.appendChild(template.content.cloneNode(true));
    }
  }

  private subscribeToEntity(): void {
    if (!this._entityId) return;

    this._entitySignal = useEntity(this._entityId);

    // Set up reactive effect
    this._dispose?.();
    this._dispose = effect(() => {
      // Access the facts to track them
      const _ = this._entitySignal?.facts.value;
      this.render();
    });
  }
}

/**
 * Mixin for shells that need dual-shell crossfade rendering
 */
export function withCrossfade<T extends new (...args: any[]) => ThingShell>(Base: T) {
  return class extends Base {
    protected get lowerShellOpacity(): number {
      return 1 - this.resolvedShell.crossfade;
    }

    protected get upperShellOpacity(): number {
      return this.resolvedShell.crossfade;
    }

    protected shouldRenderUpperShell(): boolean {
      const { upper, crossfade } = this.resolvedShell;
      return upper !== null && crossfade > 0 && crossfade < 1;
    }

    protected renderCrossfadeStyles(): string {
      return `
        <style>
          :host {
            --lower-opacity: ${this.lowerShellOpacity};
            --upper-opacity: ${this.upperShellOpacity};
          }
          .shell-lower {
            opacity: var(--lower-opacity, 1);
          }
          .shell-upper {
            opacity: var(--upper-opacity, 0);
          }
        </style>
      `;
    }
  };
}
