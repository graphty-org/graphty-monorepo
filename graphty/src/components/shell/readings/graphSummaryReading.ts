/**
 * The graph-summary reading template (spec section 7.5, lines 5817-5819 and 5845-5858).
 *
 * Two sentences a novice can repeat back, and they are the first thing the inspector
 * shows on the Nothing-selected surface: "Every graph summary and algorithm result in
 * the inspector opens with one or two sentences a novice can repeat back" (spec 5793).
 * It is floor item 1, so it is never placed behind an info circle at any density, at
 * any width, under any Settings value (spec 5803-5806).
 *
 * Sentence 1 names what is loaded; sentence 2 says how it hangs together. The boards
 * draw both as one run: "96 accounts, 48 devices, 34 phone numbers and 22 merchants,
 * connected by 612 transactions. One connected part holds all 200 nodes."
 * (AllStatistics.dc.html:940) and, above the threshold, "... One connected part holds
 * 93% of nodes; 3,140 small parts (mostly single nodes) hold the rest."
 * (ExplorerLargeGraph.dc.html:3328).
 *
 * The template is size-aware and CHEAP: "A template never schedules a computation
 * above O(n+m) on its own; anything more expensive is offered as an action" (spec
 * 5843). So every field of {@link GraphSummaryStatistics} is something one pass over
 * the loaded records can answer, with two exceptions that are GATES rather than work --
 * `exactDiameter` and `sampledMeanDistance` are used only when some other result has
 * already produced them, and their absence silently selects a cheaper sentence.
 *
 * Two clauses the spec draws are reachable but not fed by this slice, and that is
 * deliberate rather than missing:
 *
 * - The type clause ("17 cats, 1 dog and 2 humans") needs a node-type role, which
 *   exists in neither package. With `nodeTypes` absent the node clause is a bare
 *   count, which is the honest form.
 * - `edgeNoun` is the caller's word. Until a role model names it, the caller passes
 *   `DEFAULT_EDGE_NOUN`.
 *
 * Divergence, recorded: ExplorerLargeGraph.dc.html:3328 names FOUR types and keeps its
 * edge count exact at 1,104,206. Spec 5852-5854 says at most three types, largest
 * first, and three significant figures in prose above 100,000. The spec's stated rule
 * wins here, because it is the rule and the board is one instance of it.
 */

import { formatPercent, formatProseCount, joinList } from "./readingFormat";

/** At most this many node types are named before ", and N other types" (spec 5852). */
const NAMED_TYPE_CAP = 3;

/**
 * One node type and how many nodes carry it, already pluralised by the caller.
 *
 * The caller supplies the plural because only the caller knows the data's own words:
 * "cats", "accounts", "proteins". This module never invents a noun.
 * @public
 */
export interface NodeTypeCount {
    /** The plural noun the sentence uses, e.g. "cats". */
    readonly plural: string;
    /** How many nodes carry it. */
    readonly count: number;
}

/**
 * Everything the graph-summary template reads. All of it O(n+m) or cheaper.
 * @public
 */
export interface GraphSummaryStatistics {
    /** Nodes loaded. */
    readonly nodeCount: number;
    /** Edges loaded. */
    readonly edgeCount: number;
    /** The edge noun, e.g. "relationships". */
    readonly edgeNoun: string;
    /** Node types largest-first. Absent or empty means the sentence uses a bare node count. */
    readonly nodeTypes?: readonly NodeTypeCount[];
    /** How many types the three-type cap hid, for "and N other types". */
    readonly otherNodeTypeCount?: number;
    /** Connected components. */
    readonly connectedPartCount: number;
    /** Nodes in the largest component. */
    readonly largestPartNodeCount: number;
    /** An exact diameter, when a result has produced one. Gates the "at most N steps" sentence. */
    readonly exactDiameter?: number;
    /** A sampled mean distance, when one exists. */
    readonly sampledMeanDistance?: {
        /** The mean number of steps between a typical pair. */
        readonly steps: number;
        /** How many pairs were sampled to get it. */
        readonly sampleSize: number;
    };
    /** Whether the "mostly single nodes" clause has been computed and is true. */
    readonly smallPartsMostlySingleNodes?: boolean;
}

/**
 * The default edge noun when the graph has several edge types or none is known.
 *
 * FIXTURES.md:69 forbids reading the noun off an edge attribute, so a graph whose edges
 * are of several kinds gets the general word rather than one kind's name.
 */
export const DEFAULT_EDGE_NOUN = "relationships";

/**
 * What the inspector reads before anything is loaded.
 *
 * The Nothing-selected surface exists in the empty state too, and floor item 1 wants a
 * reading there rather than a blank: this one names the three doors that fill it.
 */
export const GRAPH_SUMMARY_EMPTY_READING =
    "Nothing is loaded yet. Open a file, a URL or pasted data to see a reading here.";

/**
 * Pluralises a noun on a count, so "1 small part holds the rest" is not written as
 * "1 small parts hold the rest". The spec's example strings are all plural; this only
 * ever narrows away from them.
 * @param count - the count the noun is attached to.
 * @param singular - the singular noun.
 * @returns the singular when the count is exactly 1, the "s" plural otherwise.
 */
function pluralise(count: number, singular: string): string {
    return count === 1 ? singular : `${singular}s`;
}

/**
 * Sentence 1's node clause: the type list when types are known, a bare count when they
 * are not (spec 5852: "Type lists name at most three types, largest first, then 'and N
 * other types'").
 * @param statistics - the summary statistics.
 * @returns the clause, without its trailing ", connected by ...".
 */
function nodeClause(statistics: GraphSummaryStatistics): string {
    const types = statistics.nodeTypes ?? [];
    if (types.length === 0) {
        return `${formatProseCount(statistics.nodeCount)} ${pluralise(statistics.nodeCount, "node")}`;
    }

    const named = types.slice(0, NAMED_TYPE_CAP).map((type) => `${formatProseCount(type.count)} ${type.plural}`);
    const clause = joinList(named);
    const other = statistics.otherNodeTypeCount ?? 0;
    if (other <= 0) {
        return clause;
    }

    return `${clause}, and ${formatProseCount(other)} other ${pluralise(other, "type")}`;
}

/**
 * Sentence 2: how the graph hangs together, taking the FIRST branch whose facts are
 * present. The order is the spec's order of strength -- an exact diameter outranks a
 * sampled estimate, which outranks a component count -- so a reading never asserts a
 * structural outcome it has not computed (spec 5870).
 * @param statistics - the summary statistics.
 * @returns the sentence, including its full stop.
 */
function componentSentence(statistics: GraphSummaryStatistics): string {
    const { connectedPartCount, exactDiameter, sampledMeanDistance } = statistics;

    if (exactDiameter !== undefined && connectedPartCount === 1) {
        return `Everyone is connected to everyone else through at most ${formatProseCount(exactDiameter)} ${pluralise(exactDiameter, "step")}.`;
    }

    if (sampledMeanDistance !== undefined) {
        const { sampleSize, steps } = sampledMeanDistance;

        return `A typical pair is about ${formatProseCount(steps)} ${pluralise(Math.round(steps), "step")} apart (estimated from ${formatProseCount(sampleSize)} ${pluralise(sampleSize, "sample")}).`;
    }

    if (connectedPartCount === 1) {
        return `One connected part holds all ${formatProseCount(statistics.nodeCount)} ${pluralise(statistics.nodeCount, "node")}.`;
    }

    const share = statistics.nodeCount > 0 ? statistics.largestPartNodeCount / statistics.nodeCount : 0;
    const smallParts = connectedPartCount - 1;
    const mostly = statistics.smallPartsMostlySingleNodes === true ? " (mostly single nodes)" : "";

    return `One connected part holds ${formatPercent(share)} of nodes; ${formatProseCount(smallParts)} small ${pluralise(smallParts, "part")}${mostly} ${smallParts === 1 ? "holds" : "hold"} the rest.`;
}

/**
 * The two-sentence graph-summary reading (spec 7.5, lines 5817-5819 and 5845-5858).
 *
 * With nothing loaded -- `nodeCount` 0 -- only sentence 1 is returned: there is no
 * connected part to describe, and the caller that wants prose for the empty state uses
 * {@link GRAPH_SUMMARY_EMPTY_READING} instead.
 * @param statistics - what one cheap pass over the loaded records found.
 * @returns the reading, e.g. "20 nodes, connected by 29 relationships. One connected part holds all 20 nodes."
 */
export function graphSummaryReading(statistics: GraphSummaryStatistics): string {
    const sentenceOne = `${nodeClause(statistics)}, connected by ${formatProseCount(statistics.edgeCount)} ${statistics.edgeNoun}.`;

    if (statistics.nodeCount <= 0) {
        return sentenceOne;
    }

    return `${sentenceOne} ${componentSentence(statistics)}`;
}
