/**
 * Projection Table — tabular view (vantage 5)
 */

import { useQuery, type QuerySignal } from '../signals/query-signal.js';
import { effect } from '../signals/index.js';
import { ThingRow } from '../shells/thing-row.js';

export interface TableColumn {
  key: string;
  label: string;
  width?: string;
}

export interface TableConfig {
  columns?: TableColumn[];
  entityType?: string;
}

export class ProjectionTable extends HTMLElement {
  private _shadowRoot: ShadowRoot;
  private _config: TableConfig;
  private _query: QuerySignal | null = null;
  private _dispose: (() => void) | null = null;

  static get observedAttributes() {
    return ['entity-type', 'columns'];
  }

  constructor(config: TableConfig = {}) {
    super();
    this._shadowRoot = this.attachShadow({ mode: 'open' });
    this._config = config;
  }

  connectedCallback() {
    this._initDOM();
    this._setupQuery();
    this._render();
  }

  disconnectedCallback() {
    this._dispose?.();
    this._dispose = null;
  }

  attributeChangedCallback(name: string, oldVal: string, newVal: string) {
    if (oldVal === newVal) return;

    if (name === 'entity-type') {
      this._config.entityType = newVal || undefined;
      this._setupQuery();
    }
  }

  private _initDOM(): void {
    this._shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          width: 100%;
          overflow: auto;
        }
        
        .table {
          width: 100%;
          border-collapse: collapse;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        
        .table-header {
          position: sticky;
          top: 0;
          background: #f9fafb;
          z-index: 1;
        }
        
        .table-header-cell {
          padding: 12px 16px;
          text-align: left;
          font-size: 12px;
          font-weight: 600;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border-bottom: 1px solid #e5e7eb;
        }
        
        .table-row {
          border-bottom: 1px solid #f3f4f6;
          transition: background-color 150ms ease;
        }
        
        .table-row:hover {
          background: #f9fafb;
        }
        
        .table-cell {
          padding: 0;
        }
        
        .empty-state {
          padding: 40px;
          text-align: center;
          color: #9ca3af;
          font-size: 14px;
        }
        
        thing-row {
          display: block;
        }
      </style>
      
      <table class="table">
        <thead class="table-header">
          <tr class="table-header-row">
            <th class="table-header-cell" style="width: 40px"></th>
            <th class="table-header-cell">Name</th>
            <th class="table-header-cell">Type</th>
            <th class="table-header-cell">Status</th>
            <th class="table-header-cell">Date</th>
          </tr>
        </thead>
        <tbody class="table-body"></tbody>
      </table>
      
      <div class="empty-state" hidden>No items found</div>
    `;
  }

  private _setupQuery(): void {
    if (!this._config.entityType && !this._query) {
      // Default query for all entities
      this._query = useQuery({});
    } else if (this._config.entityType) {
      this._query = useQuery({ type: this._config.entityType });
    }

    if (this._query) {
      this._dispose?.();
      this._dispose = effect(() => {
        const results = this._query!.results.value;
        this._renderRows(results.entities);
      });
    }
  }

  private _render(): void {
    // Initial render handled by effect
  }

  private _renderRows(entityIds: string[]): void {
    const tbody = this._shadowRoot.querySelector('.table-body');
    const emptyState = this._shadowRoot.querySelector('.empty-state');
    
    if (!tbody) return;

    if (entityIds.length === 0) {
      tbody.innerHTML = '';
      emptyState?.removeAttribute('hidden');
      return;
    }

    emptyState?.setAttribute('hidden', '');
    
    tbody.innerHTML = entityIds
      .map(id => `
        <tr class="table-row">
          <td class="table-cell" style="width: 40px">
            <div style="width: 8px; height: 8px; border-radius: 50%; background: #22c55e; margin: auto;"></div>
          </td>
          <td class="table-cell">
            <thing-row entity="${id}" vantage="5"></thing-row>
          </td>
          <td class="table-cell" style="padding: 12px 16px; font-size: 13px; color: #6b7280;">
            ${this._config.entityType ?? 'item'}
          </td>
          <td class="table-cell" style="padding: 12px 16px;">
            <span style="font-size: 12px; padding: 2px 8px; border-radius: 12px; background: #dcfce7; color: #166534;">active</span>
          </td>
          <td class="table-cell" style="padding: 12px 16px; font-size: 13px; color: #9ca3af;">
            ${new Date().toLocaleDateString()}
          </td>
        </tr>
      `)
      .join('');
  }
}

customElements.define('projection-table', ProjectionTable);
