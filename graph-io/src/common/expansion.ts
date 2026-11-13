/**
 * @file The budget on the edges an import expands a few names into (a hyperedge's clique, a DOT `{...} -> {...}`): a
 * 20,000-member clique is 200 million edges from about 1 MB of input, so an expansion that would pass the budget is
 * refused before any of its edges is added.
 */

import { GraphFormatError } from "@graphty/graph-format";

/** An expansion that would pass MAX_HYPEREDGE_EXPANSION: that hyperedge or statement alone is skipped. */
export class ExpansionRefused extends GraphFormatError {}

/** The most edges the expansions of one import make; a 20k-member clique would be 200M edges. */
// ponytail: a fixed cap; make it an option if a real file needs more
export const MAX_HYPEREDGE_EXPANSION = 1_000_000;

/**
 * Refuse an expansion that would take the import beyond MAX_HYPEREDGE_EXPANSION expanded edges,
 * before any of it is added; otherwise count it against the budget.
 * @param count - the number of edges the expansion makes
 * @param budget - the edges the import's hyperedges expanded into so far
 * @param budget.used - that count, updated
 * @param element - the hyperedge's or statement's name
 */
export function checkExpansion(count: number, budget: { used: number }, element: string): void {
    if (budget.used + count > MAX_HYPEREDGE_EXPANSION) {
        throw new ExpansionRefused(
            "E_TOO_LARGE",
            `${element}: the expansion makes ${count} edges, which with the ${budget.used} already expanded is more than ${MAX_HYPEREDGE_EXPANSION}; it is skipped`,
            { count, used: budget.used, limit: MAX_HYPEREDGE_EXPANSION },
        );
    }
    budget.used += count;
}
