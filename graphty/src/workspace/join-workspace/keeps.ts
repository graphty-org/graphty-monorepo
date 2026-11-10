/**
 * The regions a compare step keeps (the Venn's regions a reader switched off), as the filter rule
 * graphty-element reads: a `categories` leaf on the step's membership column. The element writes
 * the membership and filters by it; the workspace only names the regions to keep.
 */

import type { JoinRegion, JoinStepEntry, RuleTree } from "@graphty/graphty-element/session";

/** Every region a compare step writes. */
export const REGIONS: readonly JoinRegion[] = ["only-onto", "both", "only-from"];

/**
 * The filter rule keeping only the chosen regions of the given compare steps.
 * @param steps - the steps, in order.
 * @param keeps - the regions each step keeps, by step id.
 * @returns the rule, or null when every step keeps every region.
 */
export function keepRule(
    steps: readonly JoinStepEntry[],
    keeps: ReadonlyMap<string, readonly JoinRegion[]>,
): RuleTree | null {
    const leaves = steps.flatMap((step): RuleTree[] => {
        const keep = keeps.get(step.id);
        if (step.choices.compare !== true || keep === undefined || keep.length === REGIONS.length) {
            return [];
        }
        return [
            {
                kind: "categories",
                attribute: `data.${step.choices.membership ?? "membership"}`,
                values: keep,
                // A node the comparison never saw (a later step made it) is not hidden by it.
                missing: "include",
            },
        ];
    });
    if (leaves.length === 0) {
        return null;
    }
    return leaves.length === 1 ? leaves[0] : { kind: "all", of: leaves };
}
