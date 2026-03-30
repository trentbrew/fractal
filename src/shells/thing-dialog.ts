/**
 * ThingDialog Shell — Full dialog representation (vantage 11-13)
 * 
 * Features:
 * - Full properties display
 * - Editable fields
 * - Affinities display
 * - Activity feed placeholder
 */

import { ThingShell, withCrossfade } from './base-shell.js';

class ThingDialogBase extends ThingShell {
  static get shellName() { return 'dialog'; }
  
  static get minVantage() { return 11; }
  static get maxVantage() { return 13; }

  render() {
    const data = this.getEntityData();
    const name = data?.facts['name'] as string | undefined;
    const description = data?.facts['description'] as string | undefined;
    const status = data?.facts['status'] as string | undefined;
    const type = data?.facts['type'] as string | undefined;
    const tags = (data?.facts['tags'] as string[]) ?? [];
    const created = data?.facts['created'] as string | undefined;
    const modified = data?.facts['modified'] as string | undefined;
    const links = data?.links ?? [];
    
    // Property visibility
    const showActivity = this.vantage >= 12;
    const showDescription = this.vantage >= 11.5;

    const html = `
      <style>
        :host {
          display: flex;
          flex-direction: column;
          width: 100%;
          max-width: 560px;
          background: white;
          border-radius: 12px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.2);
          overflow: hidden;
          --vantage: ${this.vantage};
        }
        
        .header {
          padding: 20px 24px;
          border-bottom: 1px solid #e5e7eb;
          display: flex;
          align-items: flex-start;
          gap: 16px;
        }
        
        .header-content {
          flex: 1;
          min-width: 0;
        }
        
        .type-badge {
          font-size: 11px;
          padding: 4px 10px;
          border-radius: 6px;
          background: #f3f4f6;
          color: #4b5563;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          font-weight: 500;
          display: inline-block;
          margin-bottom: 8px;
        }
        
        .title-input {
          font-size: 20px;
          font-weight: 600;
          color: #111827;
          border: none;
          outline: none;
          width: 100%;
          background: transparent;
          padding: 0;
          margin: 0;
          line-height: 1.3;
        }
        
        .title-input:focus {
          background: #f9fafb;
          padding: 4px 8px;
          margin: -4px -8px;
          border-radius: 4px;
        }
        
        .status-select {
          font-size: 12px;
          padding: 4px 8px;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          background: white;
          color: #374151;
          cursor: pointer;
        }
        
        .body {
          padding: 20px 24px;
          flex: 1;
          overflow-y: auto;
        }
        
        .section {
          margin-bottom: 20px;
        }
        
        .section:last-child {
          margin-bottom: 0;
        }
        
        .section-label {
          font-size: 11px;
          font-weight: 600;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 8px;
        }
        
        .description-textarea {
          width: 100%;
          min-height: 100px;
          padding: 12px;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          font-size: 14px;
          line-height: 1.6;
          color: #374151;
          resize: vertical;
          font-family: inherit;
          box-sizing: border-box;
          opacity: ${showDescription ? 1 : 0};
          transition: opacity 200ms ease;
        }
        
        .description-textarea:focus {
          outline: none;
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
        }
        
        .tags-container {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        
        .tag {
          font-size: 12px;
          padding: 4px 10px;
          border-radius: 16px;
          background: #e0e7ff;
          color: #4338ca;
        }
        
        .add-tag-btn {
          font-size: 12px;
          padding: 4px 10px;
          border: 1px dashed #d1d5db;
          border-radius: 16px;
          background: transparent;
          color: #6b7280;
          cursor: pointer;
        }
        
        .affinities-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        
        .affinity-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background: #f9fafb;
          border-radius: 6px;
          font-size: 13px;
          color: #374151;
        }
        
        .affinity-type {
          font-size: 10px;
          padding: 2px 6px;
          border-radius: 4px;
          background: #e5e7eb;
          color: #4b5563;
        }
        
        .activity-feed {
          background: #f9fafb;
          border-radius: 8px;
          padding: 16px;
          opacity: ${showActivity ? 1 : 0};
          transition: opacity 200ms ease;
        }
        
        .activity-placeholder {
          text-align: center;
          color: #9ca3af;
          font-size: 13px;
        }
        
        .footer {
          padding: 16px 24px;
          border-top: 1px solid #e5e7eb;
          display: flex;
          align-items: center;
          gap: 12px;
          color: #9ca3af;
          font-size: 12px;
        }
        
        .timestamp {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        
        /* Sync status */
        :host([sync-status="pending"]) .header {
          opacity: 0.8;
        }
        
        :host([sync-status="conflict"]) .header {
          outline: 2px solid #f59e0b;
          outline-offset: -2px;
        }
      </style>
      
      <div class="header" part="header">
        <div class="header-content">
          <span class="type-badge" part="type">${type ?? 'item'}</span>
          <input 
            type="text" 
            class="title-input" 
            value="${name ?? ''}" 
            placeholder="Untitled"
            part="title"
          />
        </div>
        <select class="status-select" part="status">
          <option value="active" ${status === 'active' ? 'selected' : ''}>Active</option>
          <option value="paused" ${status === 'paused' ? 'selected' : ''}>Paused</option>
          <option value="closed" ${status === 'closed' ? 'selected' : ''}>Closed</option>
        </select>
      </div>
      
      <div class="body" part="body">
        <div class="section">
          <div class="section-label">Description</div>
          <textarea class="description-textarea" placeholder="Add a description..." part="description">${description ?? ''}</textarea>
        </div>
        
        <div class="section">
          <div class="section-label">Tags</div>
          <div class="tags-container" part="tags">
            ${tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
            <button class="add-tag-btn">+ Add tag</button>
          </div>
        </div>
        
        <div class="section">
          <div class="section-label">Connections (${links.length})</div>
          ${links.length > 0 ? `
            <div class="affinities-list" part="affinities">
              ${links.map(link => `
                <div class="affinity-item">
                  <span class="affinity-type">${link.a}</span>
                  <span>${link.e2}</span>
                </div>
              `).join('')}
            </div>
          ` : '<div class="activity-placeholder">No connections yet</div>'}
        </div>
        
        ${showActivity ? `
          <div class="section">
            <div class="section-label">Activity</div>
            <div class="activity-feed" part="activity">
              <div class="activity-placeholder">Activity will appear here</div>
            </div>
          </div>
        ` : ''}
      </div>
      
      <div class="footer" part="footer">
        ${created ? `
          <span class="timestamp">
            Created: ${new Date(created).toLocaleDateString()}
          </span>
        ` : ''}
        ${modified ? `
          <span class="timestamp">
            Modified: ${new Date(modified).toLocaleDateString()}
          </span>
        ` : ''}
      </div>
    `;
    
    this.renderHTML(html);
    
    // Set up event handlers
    this._setupEventHandlers();
  }
  
  private _setupEventHandlers(): void {
    const titleInput = this._shadowRoot?.querySelector('.title-input') as HTMLInputElement;
    const statusSelect = this._shadowRoot?.querySelector('.status-select') as HTMLSelectElement;
    const descriptionTextarea = this._shadowRoot?.querySelector('.description-textarea') as HTMLTextAreaElement;
    
    titleInput?.addEventListener('change', async (e) => {
      const newValue = (e.target as HTMLInputElement).value;
      await this.setFact('name', newValue);
    });
    
    statusSelect?.addEventListener('change', async (e) => {
      const newValue = (e.target as HTMLSelectElement).value;
      await this.setFact('status', newValue);
    });
    
    descriptionTextarea?.addEventListener('change', async (e) => {
      const newValue = (e.target as HTMLTextAreaElement).value;
      await this.setFact('description', newValue);
    });
  }
}

// Export with crossfade mixin
export const ThingDialog = withCrossfade(ThingDialogBase);
customElements.define('thing-dialog', ThingDialog);
