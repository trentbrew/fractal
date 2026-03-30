/**
 * Projection Constellation — force-directed graph layout
 * 
 * Positions Things based on affinity relationships.
 * Uses a simple force-directed algorithm for node positioning.
 */

import type { Link } from '../types.js';

export interface ConstellationConfig {
  width?: number;
  height?: number;
  linkDistance?: number;
  repulsionForce?: number;
}

export class ProjectionConstellation extends HTMLElement {
  private _shadowRoot: ShadowRoot;
  private _nodes: Map<string, HTMLElement> = new Map();
  private _links: Link[] = [];
  private _positions: Map<string, { x: number; y: number }> = new Map();
  private _config: Required<ConstellationConfig>;
  private _animationFrame: number | null = null;

  static get observedAttributes() {
    return ['width', 'height'];
  }

  constructor(config: ConstellationConfig = {}) {
    super();
    this._shadowRoot = this.attachShadow({ mode: 'open' });
    this._config = {
      width: config.width ?? 800,
      height: config.height ?? 600,
      linkDistance: config.linkDistance ?? 100,
      repulsionForce: config.repulsionForce ?? 500,
    };
  }

  connectedCallback() {
    this._initDOM();
    this._startSimulation();
  }

  disconnectedCallback() {
    if (this._animationFrame !== null) {
      cancelAnimationFrame(this._animationFrame);
      this._animationFrame = null;
    }
  }

  attributeChangedCallback(name: string, oldVal: string, newVal: string) {
    if (oldVal === newVal) return;
    if (name === 'width') this._config.width = parseInt(newVal) || 800;
    if (name === 'height') this._config.height = parseInt(newVal) || 600;
    this._updateContainerSize();
  }

  private _initDOM(): void {
    this._shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          position: relative;
          width: ${this._config.width}px;
          height: ${this._config.height}px;
          overflow: hidden;
          background: radial-gradient(circle at center, #1a1a2e 0%, #0f0f1a 100%);
          border-radius: 8px;
          --projection-type: constellation;
          --ambient-vantage: 17;
        }
        
        .canvas {
          position: absolute;
          inset: 0;
        }
        
        .node {
          position: absolute;
          transform: translate(-50%, -50%);
          cursor: pointer;
          transition: transform 0.1s ease;
        }
        
        .node:hover {
          transform: translate(-50%, -50%) scale(1.1);
          z-index: 10;
        }
        
        .node[data-selected="true"] {
          filter: drop-shadow(0 0 8px rgba(99, 102, 241, 0.8));
        }
        
        .edge {
          position: absolute;
          pointer-events: none;
        }
        
        .edge line {
          stroke: rgba(99, 102, 241, 0.3);
          stroke-width: 1;
        }
        
        .edge[data-strength="high"] line {
          stroke: rgba(99, 102, 241, 0.6);
          stroke-width: 2;
        }
        
        ::slotted(*) {
          position: absolute;
        }
      </style>
      
      <div class="canvas">
        <svg class="edges"></svg>
        <slot></slot>
      </div>
    `;
  }

  private _updateContainerSize(): void {
    const host = this._shadowRoot.host as HTMLElement;
    host.style.width = `${this._config.width}px`;
    host.style.height = `${this._config.height}px`;
  }

  addNode(id: string, element: HTMLElement): void {
    this._nodes.set(id, element);
    if (!this._positions.has(id)) {
      // Initialize at random position
      this._positions.set(id, {
        x: Math.random() * this._config.width,
        y: Math.random() * this._config.height,
      });
    }
    this._updateNodePosition(id);
  }

  removeNode(id: string): void {
    this._nodes.delete(id);
    this._positions.delete(id);
  }

  setLinks(links: Link[]): void {
    this._links = links;
    this._updateEdges();
  }

  private _updateNodePosition(id: string): void {
    const element = this._nodes.get(id);
    const position = this._positions.get(id);
    if (element && position) {
      element.style.left = `${position.x}px`;
      element.style.top = `${position.y}px`;
    }
  }

  private _updateEdges(): void {
    const svg = this._shadowRoot.querySelector('.edges');
    if (!svg) return;

    const { width, height } = this._config;
    svg.innerHTML = this._links
      .map(link => {
        const source = this._positions.get(link.e1);
        const target = this._positions.get(link.e2);
        if (!source || !target) return '';

        return `
          <line 
            x1="${source.x}" 
            y1="${source.y}" 
            x2="${target.x}" 
            y2="${target.y}"
            data-strength="${this._getAffinityStrength(link)}"
          />
        `;
      })
      .join('');
  }

  private _getAffinityStrength(link: Link): 'high' | 'medium' | 'low' {
    // In a real implementation, this would check the affinity magnitude
    return 'medium';
  }

  private _startSimulation(): void {
    const simulate = () => {
      this._applyForces();
      this._updatePositions();
      this._animationFrame = requestAnimationFrame(simulate);
    };
    this._animationFrame = requestAnimationFrame(simulate);
  }

  private _applyForces(): void {
    const { width, height, linkDistance, repulsionForce } = this._config;

    // Apply repulsion between all nodes
    const nodeIds = Array.from(this._nodes.keys());
    for (let i = 0; i < nodeIds.length; i++) {
      for (let j = i + 1; j < nodeIds.length; j++) {
        const pos1 = this._positions.get(nodeIds[i])!;
        const pos2 = this._positions.get(nodeIds[j])!;

        const dx = pos2.x - pos1.x;
        const dy = pos2.y - pos1.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;

        const force = repulsionForce / (dist * dist);
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;

        pos1.x -= fx * 0.5;
        pos1.y -= fy * 0.5;
        pos2.x += fx * 0.5;
        pos2.y += fy * 0.5;
      }
    }

    // Apply attraction along links
    for (const link of this._links) {
      const pos1 = this._positions.get(link.e1);
      const pos2 = this._positions.get(link.e2);
      if (!pos1 || !pos2) continue;

      const dx = pos2.x - pos1.x;
      const dy = pos2.y - pos1.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;

      const force = (dist - linkDistance) * 0.05;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;

      pos1.x += fx;
      pos1.y += fy;
      pos2.x -= fx;
      pos2.y -= fy;
    }

    // Keep nodes within bounds
    for (const [id, pos] of this._positions) {
      const padding = 50;
      pos.x = Math.max(padding, Math.min(width - padding, pos.x));
      pos.y = Math.max(padding, Math.min(height - padding, pos.y));
    }
  }

  private _updatePositions(): void {
    for (const [id] of this._nodes) {
      this._updateNodePosition(id);
    }
    this._updateEdges();
  }
}

customElements.define('projection-constellation', ProjectionConstellation);
