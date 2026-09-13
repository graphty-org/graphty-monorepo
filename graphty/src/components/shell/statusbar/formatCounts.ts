/**
 * The status bar's number rules, build spec 02 section 7.
 *
 * Five rules, all binding:
 *
 * 1. Thousands separators up to 99,999 -- `48,000 nodes`, `12,400 of 51,000 nodes`.
 * 2. Compact form above 99,999 -- `120k nodes`, `500k of 1.1M edges`, `10M`. One
 *    decimal place on the M scale, and no decimal once the leading value reaches two
 *    digits.
 * 3. Exact values live in the tooltip -- `120,418 nodes. 500,000 of 1,104,206 edges
 *    drawn` -- and in the inspector Counts section.
 * 4. The N-of-N collapse: a count reads `120,418` rather than `120,418 of 120,418`
 *    whenever shown, loaded and total are equal. The N-of-N form returns the moment a
 *    filter, window or subset makes them differ.
 * 5. The filter strip uses the same compact numbers as the status bar.
 *
 * The separators are taken from `en-US` rather than the runtime locale so that the
 * strings the spec fixes character for character are the strings that ship. The
 * locale-aware formatters in `@graphty/compact-mantine` are for user-entered values
 * in a panel field, which these are not.
 */

/** The locale whose grouping separators spec 02 section 7 is written in. */
const COUNT_LOCALE = "en-US";

/** Above this value a count takes the compact form (spec 02 section 7 rule 2). */
const COMPACT_THRESHOLD = 99_999;

/** The k scale begins here. */
const THOUSAND = 1_000;

/** The M scale begins here. */
const MILLION = 1_000_000;

/** At and above this many millions the M scale drops its decimal place. */
const TWO_DIGIT_MILLIONS = 10;

/**
 * The three quantities behind one count: how many are drawn, how many are loaded and
 * how many the source holds. They decide the N-of-N collapse of spec 02 section 7
 * rule 4 -- the plain form is drawn only when all three agree.
 *
 * The one parameter {@link formatCountPair}, {@link formatExactCountPair} and
 * {@link formatCountsTitle} share.
 * @public
 */
export interface CountFacts {
    /** How many are drawn right now, after every filter, window and cap. */
    readonly shown: number;
    /** How many are loaded into the session. */
    readonly loaded: number;
    /** How many the source holds. */
    readonly total: number;
}

/**
 * Coerces a value to the non-negative whole number a count is.
 * @param value - The raw count.
 * @returns The value rounded to a whole number, with anything unusable read as zero.
 */
function whole(value: number): number {
    if (!Number.isFinite(value) || value <= 0) {
        return 0;
    }

    return Math.round(value);
}

/**
 * Formats a count for the bar: thousands separators up to 99,999, compact form above.
 *
 * Spec 02 section 7 rules 1 and 2. `48,000` stays `48,000`; `120,418` becomes `120k`;
 * `1,104,206` becomes `1.1M`; `10,000,000` becomes `10M`, because the M scale drops
 * its decimal once the leading value reaches two digits.
 * @param value - The count to format.
 * @returns The visible string for that count.
 */
export function formatCount(value: number): string {
    const n = whole(value);

    if (n <= COMPACT_THRESHOLD) {
        return n.toLocaleString(COUNT_LOCALE);
    }

    const thousands = Math.round(n / THOUSAND);

    if (n < MILLION && thousands < THOUSAND) {
        return `${String(thousands)}k`;
    }

    const millions = Math.round((n / MILLION) * 10) / 10;

    if (millions >= TWO_DIGIT_MILLIONS) {
        return `${String(Math.round(millions))}M`;
    }

    return `${millions.toFixed(1)}M`;
}

/**
 * Formats a count exactly, with thousands separators at every magnitude.
 *
 * Spec 02 section 7 rule 3: the exact values live in the tooltip, never in the bar's
 * visible text once the compact threshold is passed.
 * @param value - The count to format.
 * @returns The exact string for that count, e.g. `1,104,206`.
 */
export function formatExactCount(value: number): string {
    return whole(value).toLocaleString(COUNT_LOCALE);
}

/**
 * Whether all three quantities agree, which is what collapses `N of N` to `N`.
 * @param facts - The shown, loaded and total counts.
 * @returns True when nothing has been filtered, windowed or capped away.
 */
function collapses(facts: CountFacts): boolean {
    return whole(facts.shown) === whole(facts.loaded) && whole(facts.loaded) === whole(facts.total);
}

/**
 * Formats one visible count span of the counts slot.
 *
 * Spec 02 section 7 rule 4: `20 nodes` when shown, loaded and total are equal, and
 * `120 of 200 nodes` the moment a filter, window or subset makes them differ. The
 * numbers themselves follow `formatCount`, so the same pair reads `500k of 1.1M
 * edges` on a large graph.
 * @param facts - The shown, loaded and total counts.
 * @param noun - The noun the span names, `nodes` or `edges`.
 * @returns The visible span, e.g. `500k of 1.1M edges`.
 */
export function formatCountPair(facts: CountFacts, noun: string): string {
    if (collapses(facts)) {
        return `${formatCount(facts.shown)} ${noun}`;
    }

    return `${formatCount(facts.shown)} of ${formatCount(facts.total)} ${noun}`;
}

/**
 * Formats one half of the counts slot's tooltip, in exact values.
 *
 * Spec 02 section 7 rule 3, drawn as `120,418 nodes. 500,000 of 1,104,206 edges
 * drawn`: the collapsed half is the bare noun, and the half that differs names what
 * the smaller number is -- the part that is drawn.
 * @param facts - The shown, loaded and total counts.
 * @param noun - The noun the half names, `nodes` or `edges`.
 * @returns The exact half, e.g. `500,000 of 1,104,206 edges drawn`.
 */
export function formatExactCountPair(facts: CountFacts, noun: string): string {
    if (collapses(facts)) {
        return `${formatExactCount(facts.shown)} ${noun}`;
    }

    return `${formatExactCount(facts.shown)} of ${formatExactCount(facts.total)} ${noun} drawn`;
}

/**
 * Builds the counts slot's whole tooltip from the two sets of facts.
 * @param nodes - The node counts.
 * @param edges - The edge counts.
 * @returns The tooltip, e.g. `120,418 nodes. 500,000 of 1,104,206 edges drawn`.
 */
export function formatCountsTitle(nodes: CountFacts, edges: CountFacts): string {
    return `${formatExactCountPair(nodes, "nodes")}. ${formatExactCountPair(edges, "edges")}`;
}

/**
 * Builds the sample line the counts slot carries in the subset state.
 *
 * Spec 04 section 5.1, "Loaded, subset": the bar carries `Sample: 50,000 of
 * 1,000,000` in addition to its counts, in exact values as drawn.
 * @param shown - How many of the source were sampled.
 * @param total - How many the source holds.
 * @returns The sample line, e.g. `Sample: 50,000 of 1,000,000`.
 */
export function formatSampleLine(shown: number, total: number): string {
    return `Sample: ${formatExactCount(shown)} of ${formatExactCount(total)}`;
}
