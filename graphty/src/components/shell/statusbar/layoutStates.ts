/**
 * The layout chip's five states, build spec 02 section 4.2 slot 4.
 *
 * 1. `Positions from file`
 * 2. `Quick grid (Performance mode)` -- or `Random (seeded)` when the quick grid fell
 *    back (7.2)
 * 3. `Force directed - step 120 of 1,000, Stop`
 * 4. `Force directed - settled`
 * 5. `Force directed - stopped after 1,000 steps`
 *
 * plus the two spec examples `Radial on 37 of 200 nodes` and
 * `Computing Kamada-Kawai... Cancel`.
 *
 * `settled` is NEVER shown when the step cap, rather than convergence, stopped the
 * layout -- that is state 5, and the two are separate builders here so a caller
 * cannot reach for the wrong word.
 *
 * The chip's visible text carries the PLAIN name; the technical name goes in the
 * chip's own `title` and nowhere else on the status bar.
 */

import { formatCount, formatExactCount } from "./formatCounts";

/** State 1: the file carried positions for every node, so Fixed is in force. */
export const LAYOUT_FROM_FILE_LABEL = "Positions from file";

/** State 1's drawn tooltip, where the state needs a noun (ExplorerLargeGraph). */
export const LAYOUT_FROM_FILE_TITLE = "Layout. Positions from file";

/** State 2: above the large-graph threshold the quick grid stands in for a run. */
export const LAYOUT_QUICK_GRID_LABEL = "Quick grid (Performance mode)";

/** State 2, fallback form: the quick grid could not be built (7.2). */
export const LAYOUT_QUICK_GRID_FALLBACK_LABEL = "Random (seeded)";

/**
 * State 3: a run in progress, which names the step it is on and offers Stop.
 * @param name - The engine's plain name, e.g. `Force directed`.
 * @param step - The step the run is on.
 * @param steps - The step cap.
 * @returns The chip text, e.g. `Force directed - step 120 of 1,000, Stop`.
 */
export function layoutSteppingLabel(name: string, step: number, steps: number): string {
    return `${name} - step ${formatExactCount(step)} of ${formatExactCount(steps)}, Stop`;
}

/**
 * State 4: the run converged.
 * @param name - The engine's plain name.
 * @returns The chip text, e.g. `Force directed - settled`.
 */
export function layoutSettledLabel(name: string): string {
    return `${name} - settled`;
}

/**
 * State 5: the step cap, not convergence, ended the run -- so not `settled`.
 * @param name - The engine's plain name.
 * @param steps - The step cap the run reached.
 * @returns The chip text, e.g. `Force directed - stopped after 1,000 steps`.
 */
export function layoutStoppedLabel(name: string, steps: number): string {
    return `${name} - stopped after ${formatExactCount(steps)} steps`;
}

/**
 * A run whose scope is narrower than the graph, which says so.
 * @param name - The engine's plain name.
 * @param shown - How many nodes the run acts on.
 * @param total - How many nodes there are.
 * @returns The chip text, e.g. `Radial on 37 of 200 nodes`.
 */
export function layoutScopedLabel(name: string, shown: number, total: number): string {
    return `${name} on ${formatCount(shown)} of ${formatCount(total)} nodes`;
}

/**
 * A run that has not begun reporting steps yet, which offers Cancel.
 * @param name - The engine's plain name.
 * @returns The chip text, e.g. `Computing Kamada-Kawai... Cancel`.
 */
export function layoutComputingLabel(name: string): string {
    return `Computing ${name}... Cancel`;
}

/**
 * The chip's own tooltip: the technical name, then the state.
 *
 * This is the only place `(ngraph)` may appear on the status bar.
 * @param technicalName - The plain-then-technical pair, e.g. `Force directed (ngraph)`.
 * @param state - The state suffix, e.g. `settled`.
 * @returns The tooltip, e.g. `Force directed (ngraph) - settled`.
 */
export function layoutChipTitle(technicalName: string, state: string): string {
    return `${technicalName} - ${state}`;
}
