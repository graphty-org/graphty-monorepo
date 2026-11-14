/**
 * The regions a compare step keeps (the Venn's regions a reader switched off), as the filter rule
 * graphty-element gives for them (`joinRegionRule`). The element writes the membership, names the
 * rule and filters by it; the workspace only names the regions to keep.
 */

import { type JoinRegion, joinRegionRule, type JoinStepEntry, type RuleTree } from "@graphty/graphty-element/session";

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
        const rule = keep === undefined ? null : joinRegionRule(step.choices, keep);
        return rule === null ? [] : [rule];
    });
    if (leaves.length === 0) {
        return null;
    }
    return leaves.length === 1 ? leaves[0] : { kind: "all", of: leaves };
}
