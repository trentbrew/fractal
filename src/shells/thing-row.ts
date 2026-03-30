/**
 * ThingRow Shell — List/table item representation (vantage 5-7)
 * 
 * Features:
 * - Compact single-line layout
 * - Status indicator
 * - Optional secondary info
 */

import { ThingShell } from './base-shell.js';

export class ThingRow extends ThingShell {
  static get shellName() { return 'row'; }
  
  static get minVantage() { return 5; }
  static get maxVantage() { return 7; }

  render() {
    const data = this.getEntityData();
    const name = data?.facts['name'] as string | undefined;
    const status = data?.facts['status'] as string | undefined;
    const date = data?.facts['date'] as string | undefined;
    
    const showStatus = this.vantage >= 5;
    const showDate = this.vantage >= 6;

    const html = `
      <style>
        :host {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 12px;
          background: white;
          border-radius: 4px;
          box-shadow: 0 1px 2px rgba(0,0,0,0.05);
          cursor: pointer;
          transition: box-shadow 150ms ease;
          --vantage: ${this.vantage};
        }
        
        :host(:hover) {
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .status {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          flex-shrink: 0;
          background: var(--status-color, #22c55e);
          opacity: ${showStatus ? 1 : 0};
          transition: opacity 150ms ease;
        }
        
        .status[data-status="paused"] {
          background: #f59e0b;
        }
        
        .status[data-status="closed"] {
          background: #6b7280;
        }
        
        .name {
          flex: 1;
          font-size: 13px;
          font-weight: 500;
          color: #1f2937;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        
        .date {
          font-size: 11px;
          color: #9ca3af;
          flex-shrink: 0;
          opacity: ${showDate ? 1 : 0};
          transition: opacity 150ms ease;
        }
        
        .type-badge {
          font-size: 10px;
          padding: 2px 6px;
          border-radius: 4px;
          background: #f3f4f6;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          flex-shrink: 0;
          opacity: ${this.vantage >= 6.5 ? 1 : 0};
          transition: opacity 150ms ease;
        }
      </style>
      
      <div class="status" data-status="${status ?? 'active'}" part="status"></div>
      <span class="name" part="name">${name ?? 'Untitled'}</span>
      ${showDate && date ? `<span class="date" part="date">${date}</span>` : ''}
      <span class="type-badge" part="type">${data?.facts['type'] ?? ''}</span>
    `;
    
    this.renderHTML(html);
  }
}

customElements.define('thing-row', ThingRow);
