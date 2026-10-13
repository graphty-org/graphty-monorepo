/**
 * The one counted work budget of a style extraction: the readers' cascades, the planner, the translation and the
 * replay all spend from it. It counts operations, never time, so the same file always stops at the same place.
 */

import type { StyleTarget, StyleWorkBudget } from "./types.js";

/**
 * Operations one extraction may spend per target (nodes, edges) before what is left is copied per element.
 * @category Styles
 */
export const STYLE_WORK_BUDGET = 2e8;

/**
 * A counted work budget per target. `spend()` adds operations and answers whether the target is still within its
 * limit; once a target has spent more than the limit it stays exhausted.
 * @category Styles
 */
export class StyleBudget implements StyleWorkBudget {
    /** Operations allowed per target. */
    readonly limit: number;
    readonly #used = { node: 0, edge: 0 };

    /**
     * Creates a budget.
     * @param limit - operations allowed per target; defaults to `STYLE_WORK_BUDGET`
     */
    constructor(limit: number = STYLE_WORK_BUDGET) {
        this.limit = limit;
    }

    /**
     * Spends operations for a target.
     * @param target - nodes or edges
     * @param operations - how many operations the work costs
     * @returns true while the target has spent at most `limit` operations
     */
    spend(target: StyleTarget, operations: number): boolean {
        this.#used[target] += operations;
        return this.#used[target] <= this.limit;
    }

    /**
     * Whether a target has spent more than `limit` operations.
     * @param target - nodes or edges
     * @returns true once the target's budget is exhausted
     */
    exhausted(target: StyleTarget): boolean {
        return this.#used[target] > this.limit;
    }

    /**
     * How many operations a target has spent.
     * @param target - nodes or edges
     * @returns the operations spent so far
     */
    used(target: StyleTarget): number {
        return this.#used[target];
    }
}
