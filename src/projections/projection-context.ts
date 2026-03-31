/**
 * Projection Context — sets ambient vantage for child shells
 * 
 * Provides context for child thing-shell elements via provide/inject pattern.
 * Each projection type sets its own default ambient vantage ceiling.
 */

import { effect } from '../signals/index.js';
import { useQuery, type QuerySignal } from '../signals/query-signal.js';
import { resolveShell } from '../shells/registry.js';

export type ProjectionType = 'table' | 'kanban' | 'map' | 'constellation' | 'feed' | 'calendar';

export interface ProjectionConfig {
  type: ProjectionType;
  ambientVantage?: number;
  columns?: string[];
  groupBy?: string;
}

const PROJECTION_DEFAULTS: Record<ProjectionType, number> = {
  table: 5,       // Row territory
  kanban: 8,      // Card territory
  map: 17,        // Constellation territory
  constellation: 17,
  feed: 7,        // Feed item territory
  calendar: 5.5,  // Calendar item territory
};

const PROJECTION_MAX_VANTAGE: Record<ProjectionType, number> = {
  table: 7,       // Row max
  kanban: 10,     // Card max
  map: 20,        // Screen max
  constellation: 20,
  feed: 7,        // Feed max
  calendar: 7,    // Row max
};

// Context key for provide/inject
const PROJECTION_CONTEXT = Symbol('projection-context');

interface ProjectionContextValue {
  type: ProjectionType;
  ambientVantage: number;
  maxVantage: number;
  query: QuerySignal | null;
}

class ProjectionContextClass extends HTMLElement {
  private _shadowRoot: ShadowRoot;
  private _config: ProjectionConfig;
  private _context: ProjectionContextValue;
  private _dispose: (() => void) | null = null;

  static get observedAttributes() {
    return ['type', 'vantage', 'group-by'];
  }

  static get contextKey() {
    return PROJECTION_CONTEXT;
  }

  constructor(config: ProjectionConfig = { type: 'table' }) {
    super();
    this._shadowRoot = this.attachShadow({ mode: 'open' });
    this._config = config;
    this._context = this._createContext(config);
  }

  connectedCallback() {
    this._initDOM();
    this._provideContext();
  }

  disconnectedCallback() {
    this._dispose?.();
    this._dispose = null;
  }

  attributeChangedCallback(name: string, oldVal: string, newVal: string) {
    if (oldVal === newVal) return;

    if (name === 'type') {
      this._config.type = (newVal as ProjectionType) || 'table';
      this._updateContext();
    }
    if (name === 'vantage') {
      this._config.ambientVantage = parseFloat(newVal) || undefined;
      this._updateContext();
    }
  }

  get config(): ProjectionConfig {
    return { ...this._config };
  }

  get context(): ProjectionContextValue {
    return { ...this._context };
  }

  private _createContext(config: ProjectionConfig): ProjectionContextValue {
    const type = config.type || 'table';
    const ambient = config.ambientVantage ?? PROJECTION_DEFAULTS[type];
    const max = PROJECTION_MAX_VANTAGE[type];

    let query: QuerySignal | null = null;
    if (config.groupBy) {
      query = useQuery({ hasAttr: config.groupBy });
    }

    return { type, ambientVantage: ambient, maxVantage: max, query };
  }

  private _updateContext(): void {
    this._context = this._createContext(this._config);
    this._provideContext();
  }

  private _initDOM(): void {
    this._shadowRoot.innerHTML = `
      <style>
        :host {
          display: contents;
          --projection-type: ${this._context.type};
          --ambient-vantage: ${this._context.ambientVantage};
          --max-vantage: ${this._context.maxVantage};
        }
      </style>
      <slot></slot>
    `;
  }

  private _provideContext(): void {
    // Store context on element for child access
    (this as any)[PROJECTION_CONTEXT] = this._context;

    // Propagate vantage to direct children
    this._dispose?.();
    this._dispose = effect(() => {
      this._propagateVantage();
    });
  }

  private _propagateVantage(): void {
    const children = this.querySelectorAll(':scope > *');
    children.forEach(child => {
      if (child instanceof HTMLElement) {
        // Set CSS custom properties for inheritance
        child.style.setProperty('--projection-vantage', String(this._context.ambientVantage));
        child.style.setProperty('--projection-max-vantage', String(this._context.maxVantage));
        child.style.setProperty('--projection-type', this._context.type);

        // If child is a thing-shell without explicit vantage, set ambient
        const childVantage = child.getAttribute('vantage');
        if (!childVantage) {
          // Let the shell resolve its own vantage from context
        }
      }
    });
  }

  getContext(): ProjectionContextValue {
    return this._context;
  }
}

customElements.define('projection-context', ProjectionContextClass);

export type ProjectionContextElement = ProjectionContextClass;

// Helper to get projection context from an element
export function getProjectionContext(element: Element): ProjectionContextValue | null {
  let current: Element | null = element;
  while (current) {
    const context = (current as any)[PROJECTION_CONTEXT];
    if (context) return context;
    current = current.parentElement;
  }
  return null;
}

// Helper to resolve effective vantage (min of ambient and explicit)
export function resolveEffectiveVantage(
  explicitVantage: number | null,
  context: ProjectionContextValue | null
): number {
  if (explicitVantage !== null) {
    return explicitVantage;
  }
  if (context) {
    return context.ambientVantage;
  }
  return 8; // Card default
}

// Create a projection context element
export function createProjectionContext(config: ProjectionConfig): HTMLDivElement {
  const el = document.createElement('projection-context') as ProjectionContextClass;
  if (config.type) el.setAttribute('type', config.type);
  if (config.ambientVantage !== undefined) {
    el.setAttribute('vantage', String(config.ambientVantage));
  }
  if (config.groupBy) el.setAttribute('group-by', config.groupBy);
  return el;
}
