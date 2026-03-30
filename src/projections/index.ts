/**
 * Projections — layout containers for fractal shells
 * 
 * @example
 * ```html
 * <projection-context projection="kanban">
 *   <thing-shell entity="task:1" vantage="8"></thing-shell>
 * </projection-context>
 * ```
 */

export { 
  ProjectionContextElement,
  getProjectionContext,
  resolveVantageWithContext,
  type ProjectionType,
  type ProjectionConfig,
} from './projection-context.js';

export { ProjectionTable } from './projection-table.js';
export { ProjectionKanban } from './projection-kanban.js';
export { ProjectionConstellation } from './projection-constellation.js';
