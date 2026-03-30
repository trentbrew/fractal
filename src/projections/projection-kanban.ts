/**
 * Projection Kanban — kanban board view (vantage 8)
 * 
 * Displays Things as cards in columns grouped by status or custom field.
 */

export class ProjectionKanban extends HTMLElement {
  private _shadowRoot: ShadowRoot;
  private _entities: Map<string, string[]> = new Map();

  static get observedAttributes() {
    return ['group-by'];
  }

  get groupBy(): string {
    return this.getAttribute('group-by') || 'status';
  }

  connectedCallback() {
    this._shadowRoot = this.attachShadow({ mode: 'open' });
    this._initDOM();
  }

  private _initDOM(): void {
    this._shadowRoot.innerHTML = `
      <style>
        :host {
          display: flex;
          gap: 16px;
          padding: 16px;
          overflow-x: auto;
          height: 100%;
          box-sizing: border-box;
          --projection-type: kanban;
          --ambient-vantage: 8;
        }
        
        .kanban-column {
          flex: 0 0 280px;
          display: flex;
          flex-direction: column;
          background: #f3f4f6;
          border-radius: 8px;
          max-height: 100%;
        }
        
        .column-header {
          padding: 12px 16px;
          font-size: 13px;
          font-weight: 600;
          color: #374151;
          border-bottom: 2px solid var(--column-color, #6366f1);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        
        .column-count {
          font-size: 11px;
          font-weight: 500;
          color: #9ca3af;
          background: #e5e7eb;
          padding: 2px 8px;
          border-radius: 10px;
        }
        
        .column-content {
          flex: 1;
          overflow-y: auto;
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        
        thing-card {
          flex-shrink: 0;
        }
        
        .empty-column {
          text-align: center;
          padding: 24px;
          color: #9ca3af;
          font-size: 13px;
        }
      </style>
      
      <div class="kanban-column" style="--column-color: #9ca3af">
        <div class="column-header">
          <span>Backlog</span>
          <span class="column-count" data-column="backlog">0</span>
        </div>
        <div class="column-content" data-column="backlog">
          <div class="empty-column">No items</div>
        </div>
      </div>
      
      <div class="kanban-column" style="--column-color: #6366f1">
        <div class="column-header">
          <span>To Do</span>
          <span class="column-count" data-column="todo">0</span>
        </div>
        <div class="column-content" data-column="todo">
          <div class="empty-column">No items</div>
        </div>
      </div>
      
      <div class="kanban-column" style="--column-color: #f59e0b">
        <div class="column-header">
          <span>In Progress</span>
          <span class="column-count" data-column="in_progress">0</span>
        </div>
        <div class="column-content" data-column="in_progress">
          <div class="empty-column">No items</div>
        </div>
      </div>
      
      <div class="kanban-column" style="--column-color: #22c55e">
        <div class="column-header">
          <span>Done</span>
          <span class="column-count" data-column="done">0</span>
        </div>
        <div class="column-content" data-column="done">
          <div class="empty-column">No items</div>
        </div>
      </div>
    `;
  }

  setColumnEntities(columnId: string, entityIds: string[]): void {
    this._entities.set(columnId, entityIds);
    const content = this._shadowRoot.querySelector(`[data-column="${columnId}"]`);
    const count = this._shadowRoot.querySelector(`.column-count[data-column="${columnId}"]`);
    
    if (!content) return;
    
    if (entityIds.length === 0) {
      content.innerHTML = '<div class="empty-column">No items</div>';
    } else {
      content.innerHTML = entityIds
        .map(id => `<thing-card entity="${id}" vantage="8"></thing-card>`)
        .join('');
    }
    
    if (count) {
      count.textContent = String(entityIds.length);
    }
  }
}

customElements.define('projection-kanban', ProjectionKanban);
