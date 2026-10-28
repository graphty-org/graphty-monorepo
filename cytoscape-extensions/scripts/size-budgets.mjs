/**
 * size-budgets.mjs -- the budget arithmetic of scripts/size.mjs, apart from the build so it can be tested
 * (scripts/size-budgets.test.mjs).
 *
 * The total ("everything") holds every part, so it fills whenever a part grows. Re-baselining one part must
 * re-baseline the total with it (rebaseline with `only`), and a total close to its budget is reported before it
 * blocks an unrelated change (totalWarning).
 */

/** The part that holds every other part. */
export const TOTAL = "everything (every chunk of the build)";

/**
 * A budget for a measured size: headroomPercent more, and at least minimumHeadroomBytes more.
 * @param {{ headroomPercent: number, minimumHeadroomBytes: number }} budgets - size-budgets.json
 * @param {number} gz - the measured gzip bytes
 * @returns {number} the budget in bytes
 */
export function budgetFor(budgets, gz) {
    return Math.ceil(Math.max((gz * (100 + budgets.headroomPercent)) / 100, gz + budgets.minimumHeadroomBytes));
}

/**
 * The part names a `--update <part>` argument means: an exact name, else every name starting with it.
 * @param {string[]} names - the parts this build has
 * @param {string} arg - what was asked for
 * @returns {string[]} the matching names
 */
export function matchParts(names, arg) {
    return names.includes(arg) ? [arg] : names.filter((n) => n.toLowerCase().startsWith(arg.toLowerCase()));
}

/**
 * New budgets from a build: every part's, or only `only` and the total's.
 * @param {{ headroomPercent: number, minimumHeadroomBytes: number, parts: Record<string, number> }} budgets -
 *   size-budgets.json
 * @param {Record<string, { gz: number }>} parts - the measured parts
 * @param {string} [only] - the one part to re-baseline (the total is re-baselined with it)
 * @returns {Record<string, number>} the new `parts`
 */
export function rebaseline(budgets, parts, only) {
    if (only === undefined) {
        return Object.fromEntries(Object.entries(parts).map(([k, { gz }]) => [k, budgetFor(budgets, gz)]));
    }
    const out = { ...budgets.parts };
    for (const k of new Set([only, TOTAL])) {
        out[k] = budgetFor(budgets, parts[k].gz);
    }
    return out;
}

/**
 * A warning when the total has less than a quarter of the headroom it is given, or undefined.
 * @param {{ headroomPercent: number, minimumHeadroomBytes: number, parts: Record<string, number> }} budgets -
 *   size-budgets.json
 * @param {Record<string, { gz: number }>} parts - the measured parts
 * @returns {string | undefined} the warning
 */
export function totalWarning(budgets, parts) {
    const budget = budgets.parts[TOTAL];
    const gz = parts[TOTAL]?.gz;
    if (budget === undefined || gz === undefined || gz > budget) {
        return undefined; // no budget, or over it: the check already fails
    }
    const left = budget - gz;
    if (left >= (budgetFor(budgets, gz) - gz) / 4) {
        return undefined;
    }
    return (
        `${TOTAL}: only ${left} B left of its ${budget} B budget, under a quarter of its usual headroom. ` +
        "A part budget was probably raised without the total. Run `node scripts/size.mjs --update <part>` " +
        "for the part that grew, which raises the total with it."
    );
}
