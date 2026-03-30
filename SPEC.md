# Fractal Responsiveness Web Components — SPEC.md

> **Version 0.1.0** | Status: ✅ Implemented | Tracking: [[TRL-1]] ✅ [[TRL-2]] ✅ [[TRL-3]] ✅ [[TRL-4]] ✅ [[TRL-5]] ✅ [[TRL-6]] ✅ [[TRL-7]] ✅ [[TRL-8]] ✅ [[TRL-9]] ✅

---

## 1. Philosophy

### The Core Thesis

A Thing is not a component. It is a data entity that expresses itself at multiple levels of fidelity simultaneously. The UI is a spatial query over the TQL graph, not a tree of components.

### Principles

| # | Principle | Implication |
|---|----------|-------------|
| 1 | **The Kernel is the truth** | Components are projections of data, never the source. If the component and the kernel disagree, the kernel wins. |
| 2 | **Vantage is continuous, not discrete** | No `v-if` chains, no component swaps in the hot path. A single CSS variable `--vantage` flows through the system. |
| 3 | **Shells are generic, data is specific** | A card shell renders a task, a note, a user — same shape, different content. Type accents shells, it doesn't fork them. |
| 4 | **Optimistic is the default** | Local changes are instant. Sync confirmation is a notification, not a prerequisite. |
| 5 | **Offline is a feature, not an edge case** | The system works fully disconnected. Sync is eventual. |

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        TQL Kernel                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │  EAV Store  │  │   Query    │  │   Sync      │             │
│  │  (facts)    │  │   Engine   │  │   Engine    │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
└────────────────────────────┬────────────────────────────────────┘
                             │
                    emit: factAdded/Removed
                    emit: linkAdded/Removed
                    emit: syncConfirmed/Rejected
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Signal Layer (Observable Bridge)              │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  createEntitySignal(id) → { facts, links, syncStatus }     │ │
│  │  createQuerySignal(query) → Entity[]                         │ │
│  └─────────────────────────────────────────────────────────────┘ │
└────────────────────────────┬────────────────────────────────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
       ┌───────────┐  ┌───────────┐  ┌───────────┐
       │ Projection│  │ Projection│  │ Projection│
       │ Context   │  │ Context   │  │ Context   │
       │ (Table)   │  │ (Kanban)  │  │ (Map)     │
       └─────┬─────┘  └─────┬─────┘  └─────┬─────┘
             │              │              │
             ▼              ▼              ▼
       ┌───────────────────────────────────────────┐
       │            Canvas (pan/zoom)              │
       │  ┌─────────┐  ┌─────────┐  ┌─────────┐   │
       │  │ Thing   │  │ Thing   │  │ Thing   │   │
       │  │ Shell   │  │ Shell   │  │ Shell   │   │
       │  └─────────┘  └─────────┘  └─────────┘   │
       └───────────────────────────────────────────┘
```

### Browser-to-Kernel Connection

```
┌─────────────────────────────────────────────────────────────────┐
│                         Browser                                  │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────┐  │
│  │  WebSocket  │    │   Tql      │    │   Fractal Canvas   │  │
│  │  Adapter    │───▶│  Signal    │───▶│   + Shells         │  │
│  └─────────────┘    │  Bridge    │    └─────────────────────┘  │
│         │           └─────────────┘                             │
│         │                 ▲                                   │
│         ▼                 │                                   │
│  ┌─────────────┐          │                                   │
│  │  IndexedDB  │◀─────────┘   (future: offline persistence)  │
│  │  (future)   │                                              │
│  └─────────────┘                                              │
└───────────────────────────────┬─────────────────────────────────┘
                                │ WebSocket
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Trellis Kernel (CLI)                          │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────┐  │
│  │   EAV      │    │   Query    │    │   Sync Engine       │  │
│  │   Store    │    │   Engine   │    │   + Op Log          │  │
│  └─────────────┘    └─────────────┘    └─────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

**Evolution path:**
- v1: Browser ←WebSocket→ Kernel (Node.js)
- v2: Browser ←IndexedDB→ Kernel (Node.js adapter)
- v3: Browser ←IndexedDB→ Kernel (WASM in Service Worker)

---

## 3. Vantage System

### The Vantage Scale

Seven territories, 21 named positions. The numbers are a convenience — the territory boundaries matter more than exact values.

```
TERRITORY        VANTAGE    NAME               NOTES
────────────────────────────────────────────────────────────────
sub-dot          0          signal             Pulse, no identity
                                                
dot              1          node               Dot, no label
                  2          labeled node       Dot + name
                                                
inline           3          mention            @thing in prose
                  4          token              Chip in a field
                                                
list             5          row                Table / list item
                  5.5        calendar item      Temporal grid geometry
                  6          gantt item         Row + time dimension
                  7          feed item          Row + activity dimension
                                                
card             8          kanban card        Title + key props
                  9          preview card       Hover / sidebar
                  10         profile card       Type-specific summary
                                                
panel            11         dialog             Full props, editable
                  12         inspector          Persistent side pane
                  13         drawer             Full height, partial width
                                                
screen           14         detail view        Owns the viewport
                  15         workspace          Thing is the environment
                                                
map              16         cluster            Collapsed group
                  17         constellation      Spatial graph layout
                  18         map                Full graph, nodes in space
                                                
cosmos           19         screen             Navigable canvas
                  20         universe           Network of workspaces
```

### The Dual-Shell Crossfade

At any zoom level near a territory boundary, two adjacent shells are mounted simultaneously. The crossfade position — a value 0.0 → 1.0 — drives their relative opacity:

```javascript
vantage = 8.6  →  lowerShell = ShellCard (opacity: 0.4)
                   upperShell = ShellDialog (opacity: 0.6)
```

```typescript
lowerShell = resolveShell(floor(vantage))
upperShell = resolveShell(ceil(vantage))
crossfade  = vantage % 1
```

### Vantage Resolution Chain

```typescript
const VANTAGE_RESOLUTION = [
  (thing) => thing.explicitVantage,      // 1. Explicit prop
  (thing) => projectionContext.vantage,  // 2. Projection ambient
  (thing) => thing.type.naturalVantage,  // 3. Type default
  () => 8,                              // 4. Global fallback (card)
];
```

### Natural Vantage by Type

Every Thing type has a natural vantage — the fidelity level it gravitates toward when no projection or observer context overrides it.

| Type | Natural Vantage | Shell |
|------|----------------|-------|
| `note` | 8 | card |
| `task` | 8 | card |
| `user` | 3 | mention |
| `project` | 15 | workspace |
| `tag` | 4 | token |
| `event` | 5.5 | calendar item |

---

## 4. Component Inventory

### 4.1 Shell Components

| Component | Vantage Range | Purpose |
|-----------|---------------|---------|
| `<thing-node>` | 0-2 | Dot, no label. Pulse at 0. |
| `<thing-mention>` | 3-4 | Inline @thing in prose |
| `<thing-token>` | 4 | Chip in a field |
| `<thing-row>` | 5-7 | Table/list item, gantt item, feed item |
| `<thing-card>` | 8-10 | Kanban card, preview, profile |
| `<thing-dialog>` | 11-13 | Full props, editable |
| `<thing-panel>` | 12-13 | Inspector, drawer |
| `<thing-screen>` | 14-20 | Detail view, workspace, map, cosmos |

### 4.2 Layout Components

| Component | Purpose |
|-----------|---------|
| `<projection-context projection="table|kanban|map|constellation">` | Sets ambient vantage ceiling |
| `<fractal-canvas>` | Pan/zoom container, manages `--vantage` global state |
| `<ghost-proxy>` | Animates transitions between vantages |
| `<affinity-edge>` | Renders graph edges between Things |
| `<vantage-indicator>` | Debug display of current scale→vantage mapping |

### 4.3 Invariant Components

Render identically at all vantages. They are at or near the dot floor.

| Component | Purpose |
|-----------|---------|
| `<status-pip status="active|paused|closed">` | Colored dot |
| `<type-badge type="task|note|project">` | Type indicator |
| `<user-avatar user="id">` | User image/initials |
| `<tag-list tags="[...]">` | Renderable tag chips |

---

## 5. Data Flow

### 5.1 TQL → Component Signal

```typescript
// src/signals/entity-signal.ts

interface EntityData {
  facts: Record<string, Atom>;
  links: Link[];
  syncStatus: SyncStatus;
}

type SyncStatus = 'synced' | 'pending' | 'conflict';

function createEntitySignal(id: string): Signal<EntityData> {
  const state = signal<EntityData>({
    facts: {},
    links: [],
    syncStatus: 'synced',
  });
  
  // Subscribe to TQL kernel events
  kernel.on(`fact:${id}:added`, (fact) => {
    state.facts[fact.a] = fact.v;
  });
  
  kernel.on(`fact:${id}:removed`, (fact) => {
    delete state.facts[fact.a];
  });
  
  kernel.on(`sync:confirmed:${id}`, () => {
    state.syncStatus = 'synced';
  });
  
  kernel.on(`sync:rejected:${id}`, (rejected) => {
    state.facts = rejected.rollback;
    state.syncStatus = 'conflict';
  });
  
  return state;
}
```

### 5.2 Optimistic Update Flow

```typescript
async function updateFact(entityId: string, attr: string, value: Atom) {
  // 1. Optimistic: immediately update local signal
  const signal = useEntity(entityId);
  const previous = signal.value.facts[attr];
  signal.value = { ...signal.value, facts: { ...signal.value.facts, [attr]: value }, syncStatus: 'pending' };
  
  // 2. Queue kernel op
  try {
    await kernel.op({
      type: 'fact:set',
      entity: entityId,
      attribute: attr,
      value,
      timestamp: Date.now(),
    });
    signal.value = { ...signal.value, syncStatus: 'synced' };
  } catch (err) {
    // 3. Rollback on rejection
    signal.value = { ...signal.value, facts: { ...signal.value.facts, [attr]: previous }, syncStatus: 'conflict' };
    throw err;
  }
}
```

---

## 6. Canvas Architecture

### 6.1 Scale → Vantage Mapping

Non-linear curve: more dwell time at card territory (8-10).

```typescript
// src/canvas/scale-vantage.ts

const SCALE_TO_VANTAGE = (scale: number): number => {
  // scale: 0.1 (far) → 10 (close)
  // vantage: 0 → 20
  
  if (scale < 0.5) {
    return scale * 2;              // fast through dot territory
  } else if (scale < 2) {
    return 1 + (scale - 0.5) * 5; // slow through card territory
  } else {
    return 8.5 + (scale - 2) * 3; // reasonable through dialog/screen
  }
};
```

### 6.2 CSS Custom Property Cascade

```css
/* On fractal-canvas */
.fractal-canvas {
  --vantage: 5;
  --scale: 1;
  --translate-x: 0;
  --translate-y: 0;
}

/* Things inherit vantage via shadow DOM inheritance */
.thing-shell {
  /* Property visibility driven by --vantage */
}

.thing-shell .card-description {
  opacity: clamp(0, (var(--vantage) - 8) * 5, 1);
}
```

### 6.3 Ghost Proxy Animation

```typescript
// src/canvas/ghost-proxy.ts

const rectStore = new Map<string, DOMRect>();

function captureRect(id: string, el: Element) {
  rectStore.set(id, el.getBoundingClientRect());
}

function animateGhost(fromRect: DOMRect, toRect: DOMRect, content: string) {
  const ghost = document.createElement('div');
  ghost.style.cssText = `
    position: fixed;
    left: ${fromRect.left}px;
    top: ${fromRect.top}px;
    width: ${fromRect.width}px;
    height: ${fromRect.height}px;
    transition: all 300ms cubic-bezier(0.4, 0, 0.2, 1);
    z-index: 9999;
  `;
  ghost.innerHTML = content;
  document.body.appendChild(ghost);
  
  requestAnimationFrame(() => {
    ghost.style.left = `${toRect.left}px`;
    ghost.style.top = `${toRect.top}px`;
    ghost.style.width = `${toRect.width}px`;
    ghost.style.height = `${toRect.height}px`;
    ghost.style.borderRadius = '8px';
  });
  
  ghost.addEventListener('transitionend', () => ghost.remove());
}
```

---

## 7. Sync Strategy

### 7.1 Conflict Model

| Entity Type | Strategy | Rationale |
|-------------|----------|-----------|
| Properties (name, status) | LWW | Acceptable for v1 |
| Tags | LWW with union | No lost additions |
| Affinities | Weighted average | Smooth convergence |
| Position | Derived from graph | Never stored directly |

### 7.2 Sync Status Visual Treatment

| Status | Visual |
|--------|--------|
| `synced` | Brief pulse, then invisible |
| `pending` | Opacity reduction (0.9) |
| `conflict` | Amber outline, click to resolve |

### 7.3 Offline Queue

```typescript
// src/sync/offline-queue.ts

interface QueuedOp extends KernelOp {
  _queued: number;
}

class OfflineQueue {
  private queue: QueuedOp[] = [];
  
  push(op: KernelOp) {
    this.queue.push({ ...op, _queued: Date.now() });
    this.persist();
  }
  
  async flush(kernel: Kernel) {
    const ops = [...this.queue];
    this.queue = [];
    for (const op of ops) {
      try {
        await kernel.op(op);
      } catch {
        this.queue.push(op);
        break; // stop on first failure for causal ordering
      }
    }
    this.persist();
  }
  
  private persist() {
    localStorage.setItem('fractal:queue', JSON.stringify(this.queue));
  }
}
```

---

## 8. File Structure

```
fractal/
├── src/
│   ├── signals/
│   │   ├── index.ts
│   │   ├── entity-signal.ts
│   │   ├── query-signal.ts
│   │   └── reactivity.ts          # signal, effect, computed primitives
│   ├── shells/
│   │   ├── registry.ts            # SHELL_REGISTRY, resolveShell
│   │   ├── base-shell.ts          # ThingShell base class
│   │   ├── shell-node.ts
│   │   ├── shell-mention.ts
│   │   ├── shell-token.ts
│   │   ├── shell-row.ts
│   │   ├── shell-card.ts
│   │   ├── shell-dialog.ts
│   │   └── shell-screen.ts
│   ├── projections/
│   │   ├── projection-context.ts
│   │   ├── projection-table.ts
│   │   ├── projection-kanban.ts
│   │   └── projection-constellation.ts
│   ├── canvas/
│   │   ├── fractal-canvas.ts
│   │   ├── ghost-proxy.ts
│   │   └── scale-vantage.ts
│   ├── kernel/
│   │   └── bridge.ts              # TqlSignalBridge
│   ├── sync/
│   │   ├── offline-queue.ts
│   │   ├── websocket-adapter.ts   # v1 transport
│   │   └── conflict-resolver.ts
│   ├── components/
│   │   ├── status-pip.ts
│   │   ├── type-badge.ts
│   │   ├── user-avatar.ts
│   │   └── tag-list.ts
│   └── index.ts                   # Public API surface
├── test/
│   ├── signals.test.ts
│   ├── shells.test.ts
│   ├── canvas.test.ts
│   └── integration.test.ts
├── package.json
├── tsconfig.json
└── SPEC.md
```

---

## 9. Technical Decisions

### 9.1 Signals: Native + Polyfill

Use native `Signal` with a polyfill for cross-browser support.

```typescript
// src/signals/index.ts
export { Signal, effect, computed } from 'signal-utils';
```

Rationale: Cleanest API, easiest migration when browsers ship natively.

### 9.2 Shadow DOM: Open Mode

```typescript
class ThingCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }
  
  render() {
    return `<div part="header">${this.name}</div>
            <div part="body">${this.description}</div>`;
  }
}
```

Rationale: CSS var (`--vantage`) inheritance works across shadow boundary. `::part()` allows external styling when needed. Canvas lives in light DOM to simplify global styling.

### 9.3 Testing: Happy DOM + Playwright

| Layer | Tool | Rationale |
|-------|------|-----------|
| Unit | Happy DOM | Fast, handles shadow DOM, no browser needed |
| Integration | Playwright | Real behavior, cross-browser |

### 9.4 Build: ES Modules + Native

No bundler required for v1. Use native ES modules with `importmaps` for browser compatibility.

---

## 10. Open Questions

| # | Question | Status |
|---|----------|--------|
| 1 | IndexedDB schema design | TBD |
| 2 | WebSocket protocol design | TBD |
| 3 | CRDT migration path | TBD |
| 4 | `@property` CSS registration | TBD |
| 5 | Worker-based force layout | TBD |

---

## 11. Implementation Phases

### Phase 1: Foundation (MVP)
- [ ] [[TRL-1]] TqlSignalBridge + reactive signals
- [ ] [[TRL-2]] Shell registry + ThingShell base
- [ ] [[TRL-3]] FractalCanvas with pan/zoom
- [ ] [[TRL-4]] Core shell implementations

### Phase 2: Projections
- [ ] [[TRL-5]] Projection contexts

### Phase 3: Sync + Offline
- [ ] [[TRL-6]] Sync infrastructure

### Phase 4: Spatial Memory
- [ ] [[TRL-7]] Ghost proxy

### Phase 5: Performance
- [ ] [[TRL-8]] Virtual scrolling, workers, optimization

### Documentation
- [ ] [[TRL-9]] SPEC.md

---

## 12. References

- [[README.md]] — Original concept brief
- [[../trellis/README.md]] — TrellisVCS documentation
- [[../anime/README.md]] — anime.js for animation primitives

---

*v0.1 — Initial draft*
