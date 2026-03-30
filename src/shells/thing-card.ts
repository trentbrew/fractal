/**
 * ThingCard Shell — Kanban card representation (vantage 8-10)
 * 
 * Features:
 * - Title and key properties
 * - Optional description (fades in)
 * - Status and type badges
 * - Tags
 */

import { ThingShell, withCrossfade } from './base-shell.js';

class ThingCardBase extends ThingShell {
  static get shellName() { return 'card'; }
  
  static get minVantage() { return 8; }
  static get maxVantage() { return 10; }

  render() {
    const data = this.getEntityData();
    const name = data?.facts['name'] as string | undefined;
    const description = data?.facts['description'] as string | undefined;
    const status = data?.facts['status'] as string | undefined;
    const tags = (data?.facts['tags'] as string[]) ?? [];
    const priority = data?.facts['priority'] as string | undefined;
    
    // Property visibility based on vantage
    const showDescription = this.vantage >= 8.5;
    const showTags = this.vantage >= 9;
    const showPriority = this.vantage >= 9.5;

    const html = `
      <style>
        :host {
          display: flex;
          flex-direction: column;
          padding: 12px;
          background: white;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          cursor: pointer;
          transition: box-shadow 200ms ease, transform 200ms ease;
          --vantage: ${this.vantage};
          min-width: 200px;
          max-width: 320px;
        }
        
        :host(:hover) {
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          transform: translateY(-2px);
        }
        
        .header {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          margin-bottom: 8px;
        }
        
        .priority-indicator {
          width: 3px;
          height: 24px;
          border-radius: 2px;
          flex-shrink: 0;
          background: var(--priority-color, #e5e7eb);
          opacity: ${showPriority ? 1 : 0};
          transition: opacity 200ms ease;
        }
        
        .priority-indicator[data-priority="critical"] {
          background: #ef4444;
        }
        
        .priority-indicator[data-priority="high"] {
          background: #f97316;
        }
        
        .priority-indicator[data-priority="medium"] {
          background: #eab308;
        }
        
        .priority-indicator[data-priority="low"] {
          background: #22c55e;
        }
        
        .title-group {
          flex: 1;
          min-width: 0;
        }
        
        .title {
          font-size: 14px;
          font-weight: 600;
          color: #111827;
          line-height: 1.4;
          margin: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }
        
        .type-badge {
          font-size: 10px;
          padding: 2px 6px;
          border-radius: 4px;
          background: #f3f4f6;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-top: 4px;
          display: inline-block;
        }
        
        .description {
          font-size: 13px;
          color: #6b7280;
          line-height: 1.5;
          margin: 0 0 12px 0;
          overflow: hidden;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          opacity: ${showDescription ? 1 : 0};
          transform: translateY(${showDescription ? 0 : -4}px);
          transition: opacity 200ms ease, transform 200ms ease;
        }
        
        .footer {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: auto;
        }
        
        .status {
          font-size: 11px;
          padding: 2px 8px;
          border-radius: 12px;
          background: var(--status-bg, #dcfce7);
          color: var(--status-color, #166534);
        }
        
        .status[data-status="paused"] {
          --status-bg: #fef3c7;
          --status-color: #92400e;
        }
        
        .status[data-status="closed"] {
          --status-bg: #f3f4f6;
          --status-color: #4b5563;
        }
        
        .tags {
          display: flex;
          gap: 4px;
          flex-wrap: wrap;
          margin-left: auto;
          opacity: ${showTags ? 1 : 0};
          transition: opacity 200ms ease;
        }
        
        .tag {
          font-size: 10px;
          padding: 2px 6px;
          border-radius: 4px;
          background: #e0e7ff;
          color: #4338ca;
        }
        
        /* Sync status indicator */
        :host([sync-status="pending"]) {
          opacity: 0.85;
        }
        
        :host([sync-status="conflict"]) {
          outline: 2px solid #f59e0b;
        }
      </style>
      
      <div class="header" part="header">
        <div class="priority-indicator" data-priority="${priority ?? 'none'}" part="priority"></div>
        <div class="title-group">
          <h3 class="title" part="title">${name ?? 'Untitled'}</h3>
          <span class="type-badge" part="type">${data?.facts['type'] ?? 'item'}</span>
        </div>
      </div>
      
      ${description ? `<p class="description" part="description">${description}</p>` : ''}
      
      <div class="footer" part="footer">
        <span class="status" data-status="${status ?? 'active'}" part="status">
          ${status ?? 'active'}
        </span>
        ${showTags && tags.length > 0 ? `
          <div class="tags" part="tags">
            ${tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
          </div>
        ` : ''}
      </div>
    `;
    
    this.renderHTML(html);
  }
}

// Export with crossfade mixin for smooth transitions at boundaries
export const ThingCard = withCrossfade(ThingCardBase);
customElements.define('thing-card', ThingCard);
