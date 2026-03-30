/**
 * ThingNode Shell — Dot representation (vantage 0-2)
 * 
 * Features:
 * - Pulse animation at vantage 0
 * - Optional label at vantage 2
 * - Minimal visual footprint
 */

import { ThingShell } from './base-shell.js';

export class ThingNode extends ThingShell {
  static get shellName() { return 'node'; }
  
  static get minVantage() { return 0; }
  static get maxVantage() { return 2; }

  render() {
    const data = this.getEntityData();
    const name = data?.facts['name'] as string | undefined;
    const showLabel = this.vantage >= 2;
    const showPulse = this.vantage < 1;

    const html = `
      <style>
        :host {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          --vantage: ${this.vantage};
          --crossfade: ${this.resolvedShell.crossfade};
        }
        
        .node {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--node-color, #6366f1);
          position: relative;
        }
        
        ${showPulse ? `
        .node::before {
          content: '';
          position: absolute;
          inset: -4px;
          border-radius: 50%;
          background: var(--node-color, #6366f1);
          opacity: calc((1 - var(--crossfade)) * 0.3);
          animation: pulse 2s ease-in-out infinite;
        }
        
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.3; }
          50% { transform: scale(1.5); opacity: 0; }
        }
        ` : ''}
        
        .label {
          font-size: 11px;
          color: #666;
          opacity: ${showLabel ? 1 : 0};
          transition: opacity 150ms ease;
          white-space: nowrap;
        }
      </style>
      
      <div class="node" part="node"></div>
      ${showLabel ? `<span class="label" part="label">${name ?? ''}</span>` : ''}
    `;
    
    this.renderHTML(html);
  }
}

customElements.define('thing-node', ThingNode);
