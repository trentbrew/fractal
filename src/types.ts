/**
 * Core types for Fractal Responsiveness Web Components
 */

export type Atom = string | number | boolean | Date | EntityRef;
export type EntityRef = string;

export interface Fact {
  e: string; // entity
  a: string; // attribute
  v: Atom;   // value
}

export interface Link {
  e1: string; // source entity
  a: string;  // relationship attribute
  e2: string; // target entity
}

export interface EntityData {
  facts: Record<string, Atom>;
  links: Link[];
  syncStatus: SyncStatus;
}

export type SyncStatus = 'synced' | 'pending' | 'conflict';

export interface ShellConfig {
  min: number;
  max: number;
  name: string;
}

export interface ResolvedShell {
  lower: ShellConfig | null;
  upper: ShellConfig | null;
  crossfade: number;
  vantage: number;
}

export interface BoundingRect {
  left: number;
  top: number;
  width: number;
  height: number;
}
