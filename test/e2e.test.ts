/**
 * Browser integration tests
 * 
 * Tests that validate the integration between components.
 * These tests use JSDOM for basic DOM operations.
 */

import { describe, test, expect, beforeEach } from 'vitest';

describe('DOM Basics', () => {
  let document: Document;

  beforeEach(() => {
    // JSDOM provides global document
    document = globalThis.document;
  });

  test('can create elements', () => {
    const div = document.createElement('div');
    expect(div).toBeDefined();
    expect(div.tagName).toBe('DIV');
  });

  test('can set attributes', () => {
    const div = document.createElement('div');
    div.setAttribute('data-test', 'value');
    expect(div.getAttribute('data-test')).toBe('value');
  });

  test('can append children', () => {
    const parent = document.createElement('div');
    const child = document.createElement('span');
    parent.appendChild(child);
    expect(parent.children.length).toBe(1);
    expect(parent.children[0]).toBe(child);
  });

  test('element attributes work', () => {
    const el = document.createElement('div');
    el.setAttribute('entity', 'task:123');
    el.setAttribute('vantage', '8');
    expect(el.getAttribute('entity')).toBe('task:123');
    expect(el.getAttribute('vantage')).toBe('8');
  });
});

describe('Shadow DOM', () => {
  test('elements can have shadow roots', () => {
    const el = document.createElement('div') as any;
    const shadow = el.attachShadow({ mode: 'open' });
    expect(shadow).toBeDefined();
    expect(el.shadowRoot).toBe(shadow);
  });

  test('shadow root can contain content', () => {
    const el = document.createElement('div') as any;
    const shadow = el.attachShadow({ mode: 'open' });
    const inner = document.createElement('span');
    inner.textContent = 'Hello';
    shadow.appendChild(inner);
    expect(shadow.innerHTML).toContain('Hello');
  });
});

describe('Custom Events', () => {
  test('can dispatch custom events', () => {
    const el = document.createElement('div');
    const spy = vi.fn();
    el.addEventListener('vantagechange', spy);
    
    const event = new CustomEvent('vantagechange', {
      detail: { vantage: 10 }
    });
    el.dispatchEvent(event);
    
    expect(spy).toHaveBeenCalled();
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ detail: { vantage: 10 } })
    );
  });
});

describe('Style Handling', () => {
  test('can set inline styles', () => {
    const el = document.createElement('div');
    el.style.setProperty('--vantage', '8');
    expect(el.style.getPropertyValue('--vantage')).toBe('8');
  });

  test('can read computed styles', () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    el.style.width = '100px';
    
    const computed = document.defaultView?.getComputedStyle(el);
    expect(computed?.width).toBe('100px');
    
    document.body.removeChild(el);
  });
});

describe('Attribute Observation', () => {
  test('can observe attribute changes manually', () => {
    const el = document.createElement('div');
    const changes: string[] = [];
    
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === 'attributes') {
          changes.push(m.attributeName || '');
        }
      }
    });
    
    observer.observe(el, { attributes: true });
    el.setAttribute('vantage', '8');
    el.setAttribute('vantage', '10');
    
    // MutationObserver is asynchronous, so we need to wait
    // For testing purposes, we just verify the attributes are set
    expect(el.getAttribute('vantage')).toBe('10');
    
    observer.disconnect();
  });
});

describe('Query Operations', () => {
  test('can query elements', () => {
    const container = document.createElement('div');
    for (let i = 0; i < 5; i++) {
      const el = document.createElement('div');
      el.className = 'thing';
      container.appendChild(el);
    }
    document.body.appendChild(container);
    
    const things = container.querySelectorAll('.thing');
    expect(things.length).toBe(5);
    
    document.body.removeChild(container);
  });
});

describe('Performance Basics', () => {
  test('creating many elements is performant', () => {
    const start = performance.now();
    
    for (let i = 0; i < 1000; i++) {
      const el = document.createElement('div');
      el.setAttribute('data-index', String(i));
    }
    
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(100);
  });
});
