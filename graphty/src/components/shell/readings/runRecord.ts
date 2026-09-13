/**
 * The one-line run record and the caveats line -- floor items 3 and 2 (spec 6.10).
 *
 * Both are pure string builders, and both are deliberately terse, because both are
 * resident: no rule in spec 6.9 "may shorten, hide, iconify, circle or default away
 * anything on this list, at any density, at any width, under any Settings value", and
 * "a door may not separate a floor item from the thing it qualifies ... the run record
 * with its run, the departure with the channel it describes".
 *
 * The run record collapses to one line -- "method, the parameters that were not
 * defaults, and scope" (spec 5799-5801). Two things follow from that sentence and are
 * enforced here rather than left to callers:
 *
 * - Only NON-DEFAULT parameters are named. Spec 2536's worked example draws "MCL,
 *   granularity 2.5" because granularity was moved; a run at every default draws
 *   "Louvain, 20 nodes" and names no parameter at all. Rule 7a deletes a control at
 *   its default, and the run record obeys the same economy.
 * - The scope clause is a plain count. FLOOR-1.9.md 2.1 fixes it as "200 nodes", never
 *   "all 200 nodes": "all" is a claim about completeness, and completeness is the
 *   caveats line's job, not the scope clause's.
 *
 * The caveats line names EVERY departure from exact and complete, and returns nothing
 * at all when there is none: "an exact, complete, unfiltered run draws no departure
 * line at all, which is what makes 'Approximate (sample of 200)' loud again" (spec
 * 4795, 1900). A line that always renders -- "Exact. Complete." -- would destroy the
 * signal the loud case depends on, so the absence is the feature.
 *
 * Clause order is spec 5856-5858's order: "Label propagation, stopped after 60 s
 * (partial). Computed on the largest part (912,000 of 1,000,000 nodes). Showing a
 * sample of 50,000." -- what the run did, then what it covered, then what is drawn,
 * then whether a filter is narrowing it.
 */

import { formatCount } from "./readingFormat";

/**
 * The one-line run record's facts (floor item 3).
 * @public
 */
export interface RunRecordFacts {
    /** The method's own name, e.g. "Louvain". */
    readonly method: string;
    /** Only the parameters that were NOT defaults, already worded, e.g. "seed 42". */
    readonly nonDefaultParameters: readonly string[];
    /** The scope clause, e.g. "20 nodes". Never "all 20 nodes". */
    readonly scope: string;
}

/**
 * The run record line: method, then the parameters that were not defaults, then scope.
 * @param facts - what the run was.
 * @returns the line, e.g. "Louvain, 20 nodes" or "MCL, granularity 2.5, 318 nodes".
 */
export function runRecordLine(facts: RunRecordFacts): string {
    return [facts.method, ...facts.nonDefaultParameters, facts.scope].filter((part) => part.length > 0).join(", ");
}

/**
 * Every departure from exact and complete (floor item 2).
 * @public
 */
export interface CaveatFacts {
    /** The sample size of an approximate run. */
    readonly approximateSampleSize?: number;
    /** The method name, when the run used a cheaper method than the one asked for. */
    readonly fallbackMethodName?: string;
    /** Seconds after which a partial run stopped. */
    readonly partialStoppedAfterSeconds?: number;
    /** A largest-component-only run: nodes covered of nodes loaded. */
    readonly largestPart?: {
        /** Nodes the run covered. */
        readonly nodes: number;
        /** Nodes loaded. */
        readonly ofNodes: number;
    };
    /** The drawn sample size, when only a sample is on screen. */
    readonly drawnSampleSize?: number;
    /** Whether a filter or time window was active. */
    readonly filterActive?: boolean;
}

/**
 * The clause that reports a cheaper method, a partial run, or both. Spec 5856 draws the
 * pair ("Label propagation, stopped after 60 s (partial)."); each half alone gets the
 * half it can honestly say, so a fallback with no time limit still names the method
 * that actually ran.
 * @param facts - the caveat facts.
 * @returns the clause, or undefined when neither fact is present.
 */
function methodClause(facts: CaveatFacts): string | undefined {
    const { fallbackMethodName, partialStoppedAfterSeconds } = facts;

    if (partialStoppedAfterSeconds !== undefined) {
        const stopped = `stopped after ${formatCount(partialStoppedAfterSeconds)} s (partial).`;

        return fallbackMethodName === undefined
            ? `${stopped.charAt(0).toUpperCase()}${stopped.slice(1)}`
            : `${fallbackMethodName}, ${stopped}`;
    }

    if (fallbackMethodName !== undefined) {
        return `${fallbackMethodName}.`;
    }

    return undefined;
}

/**
 * The caveats line, or undefined when the run was exact, complete and unfiltered --
 * which is what keeps "Approximate (sample of 200)" loud (spec 4795).
 * @param facts - every departure the run knows about. An empty object means none.
 * @returns the line, or undefined when there is nothing to report.
 */
export function caveatsLine(facts: CaveatFacts): string | undefined {
    const clauses: string[] = [];

    if (facts.approximateSampleSize !== undefined) {
        clauses.push(`Approximate (sample of ${formatCount(facts.approximateSampleSize)}).`);
    }

    const method = methodClause(facts);
    if (method !== undefined) {
        clauses.push(method);
    }

    if (facts.largestPart !== undefined) {
        clauses.push(
            `Computed on the largest part (${formatCount(facts.largestPart.nodes)} of ${formatCount(facts.largestPart.ofNodes)} nodes).`,
        );
    }

    if (facts.drawnSampleSize !== undefined) {
        clauses.push(`Showing a sample of ${formatCount(facts.drawnSampleSize)}.`);
    }

    if (facts.filterActive === true) {
        clauses.push("A filter or time window is active.");
    }

    return clauses.length > 0 ? clauses.join(" ") : undefined;
}
