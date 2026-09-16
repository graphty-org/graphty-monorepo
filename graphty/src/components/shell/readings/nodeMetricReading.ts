/**
 * The three node-metric readings -- Most connected (Degree centrality), Influence
 * (PageRank) and Bridges (Betweenness centrality) -- their collapsed headline, and the
 * Top 3 body the result card draws beneath them (spec 7.5, and the Node metric row of
 * the shape table at spec 2307).
 *
 * "Readings are generated from result statistics by templates, not by AI. A template
 * never asserts a structural outcome it has not computed" (spec 7415-7418), and a
 * template "never schedules a computation above O(n+m) on its own" (spec 7392-7393). Both
 * rules are structural here rather than aspirational: this module takes a flat record of
 * primitives that the run already computed, it imports nothing from graphty-element, it
 * reads no clock and it touches no AI seam. The most expensive thing it does is slice
 * three entries off a list the analysis module already sorted.
 *
 * ## The budget: two sentences and 220 characters
 *
 * RT-10 fixes it -- "the reading at 12 px over 1.5, at most two sentences and 220
 * characters" (spec 4903-4905) -- 7.5's own opening restates it ("one or two sentences a
 * novice can repeat back", spec 7341-7350), and `ProseBlock` enforces it in the
 * presentation layer (`READING_MAX_SENTENCES = 2`). Every template below is exactly two
 * sentences, and none of them is ever truncated at runtime: a truncated reading is worse
 * than a shorter template, because the half-sentence still looks like a claim.
 *
 * The sentence that was cut is the one `communityReading.ts` cuts, for the same reason.
 * What the colours MEAN is the legend's channel line, not the reading's closing clause,
 * so no reading here ends "Colors now show ...". That also disposes of spec 2222-2226 --
 * a suppressed card's reading "omits its closing clause" -- trivially and permanently: a
 * template that never has a closing clause cannot fail to omit one, so the un-applied
 * form of the card draws the same two sentences as the applied form, and neither claims
 * a colour the canvas is not painting.
 *
 * ## Why betweenness never prints a percentage
 *
 * Spec 7377-7383 writes out "Mr_Whiskers is the main bridge. It sits on 41% of the
 * shortest paths between other nodes." That sentence is NOT used here, at any graph
 * size. The element runs betweenness over a graph its converter made directed with a
 * reverse edge added for every edge, so upstream skips the undirected divide-by-2 while
 * the doubled edges inflate the path counts, and the published percentage field is a
 * min-max normalisation of the score rather than a share of anything. No percentage of
 * shortest paths is derivable from those numbers, and a template that printed one would
 * be asserting an outcome nothing computed -- exactly what spec 7415-7418 forbids. The
 * relative form spec 7405-7409 writes out instead ("it sits on about 40 times more
 * shortest paths than a typical node") claims only what two measured values support, so
 * it is used at every size rather than only above 10,000 nodes. That the run is directed
 * at all is a property of the method, and belongs in the Bridges row's taught text (6.7,
 * spec 4670-4684) rather than in a caveats line that would then print on every run.
 *
 * The third sentence of spec 7377-7383 does not appear in either of its forms. "Removing
 * it would split the network into 2 parts" waits on an articulation-point check that is
 * new work (5.8), and its stand-in "Simulate removing Mr_Whiskers to see what breaks"
 * opens What breaks if removed, which does not exist. Both are the reading's THIRD
 * sentence, which the two-sentence cap drops in any case, so nothing here is lost by
 * their absence and nothing here is claimed by it.
 *
 * ## Degree and PageRank say only what was measured
 *
 * Spec 7.5 writes out no worked example for a degree or a PageRank result card -- the
 * only verbatim centrality readings in the section are the two betweenness forms -- so
 * neither template invents a structural claim to fill the gap. Degree names who has the
 * most links and what a typical node has; PageRank names who has the most influence and
 * by what multiple. Neither says anything about what would break, split or disconnect,
 * because neither run measured it.
 *
 * ## Two sentences that were drawn on runs measuring the opposite
 *
 * Both defects had the same shape -- a template naming a winner on a run that found none
 * -- so both are recorded here rather than only in a test name.
 *
 * The first: `betweennessReading` opened "<id> is the strongest bridge" without ever
 * looking at `topValue`. Betweenness is exactly 0 for every node of a complete graph, of
 * a set of cliques and of a set of disjoint pairs, because no node lies between two
 * others; the run measured that there is no bridge and the reading crowned whichever id
 * sorted first. On a ring, where every node scores the same, the second sentence read "It
 * sits on about 1 times more shortest paths than a typical node", asserting a difference
 * the run measured to be none, and PageRank's "Its score is 1 times the typical node's"
 * did the same. So {@link nodeMetricReading} now tests two degenerate shapes before it
 * reaches a template -- a maximum of 0, and a maximum equal to the median -- and answers
 * each from {@link DEGENERATE_READINGS}. Both replacements are built from numbers already
 * in {@link NodeMetricStatistics}, so neither costs a pass over anything.
 *
 * The second: the result body drew spec 2307's "Zero or near-zero" row whenever more than
 * a tenth of the ranked nodes tied at the minimum, without ever asking what the minimum
 * WAS. On a ring, a lattice, a k-regular graph or a complete graph every node ties at it,
 * so the row read "Zero or near-zero: 6 nodes (100%)" for six nodes that each have two
 * links -- under a first sentence saying "with 2 links" and beside a distribution axis
 * reading min 2. The label is now drawn only when the minimum is at or near zero
 * ({@link NEAR_ZERO_VALUE_SHARE}); otherwise the same count and share are stated under a
 * name that reports the value they tie at. That is a deliberate departure from spec 2307,
 * which prescribes the label and the threshold verbatim -- the same kind of departure as
 * the two above, and for the same reason: the spec line assumes the heavy-tailed shape of
 * its own example, and a template never asserts an outcome it has not computed (spec
 * 7415-7418).
 */

import { NODE_METRIC_DEFINITIONS, type NodeMetricId, type NodeMetricRanking } from "../analysis/nodeMetrics";
import { formatCount, formatPercent, formatProseCount } from "./readingFormat";

/**
 * Everything the node-metric templates read: primitives the run already computed, and
 * nothing a particular method alone would know.
 * @public
 */
export interface NodeMetricStatistics {
    /** Which metric was run, and therefore which of the three templates applies. */
    readonly metric: NodeMetricId;
    /**
     * The top-ranked node's own id, drawn verbatim (floor item 7).
     *
     * `number | string`, the element's own {@link NodeMetricReading.id} type, because a
     * node id is not a string -- GML gives Karate Club and College football NUMERIC ids
     * (see the NODE IDS ARE NOT STRINGS note in `analysis/nodeMetrics`). A reading only
     * ever PRINTS it, so either form is safe here and a caller may pass the raw id or its
     * printed label; it is `NodeMetricBodyRow.nodeId` that has to carry the raw form,
     * because that one is handed back to the element.
     */
    readonly topId: number | string;
    /** The top-ranked node's value. */
    readonly topValue: number;
    /** The median value over the ranked nodes -- "a typical node". */
    readonly medianValue: number;
    /** Nodes in the graph, including any the run did not reach. */
    readonly nodeCount: number;
    /** Nodes the run actually measured. Below {@link NodeMetricStatistics.nodeCount} when it did not reach them all. */
    readonly rankedCount: number;
    /** How many ranked nodes tie at the lowest value -- spec 2307's "Zero or near-zero" line. */
    readonly tiedAtMinimum: number;
}

/** How many ranked nodes the result body draws: "Top 3 nodes" (spec 2307). */
export const NODE_METRIC_TOP_ROWS = 3;

/**
 * The display rounding spec 2266-2272 sets -- "display rounds to the Settings > Defaults
 * decimal places (default 2)". The default is the constant until that setting is drawn.
 */
const DISPLAY_DECIMAL_PLACES = 2;

/**
 * The share of ranked nodes that must tie at the minimum before the body states it:
 * spec 2307's "a line 'Zero or near-zero: 912,400 nodes (91%)' when more than 10% tie at
 * the minimum". Strictly more than, as the spec says.
 */
const NEAR_ZERO_TIE_SHARE = 0.1;

/**
 * How small the tied minimum has to be, against the maximum the same run measured, before
 * "near-zero" is a word for it. A hundredth of the top value is the band: it keeps spec
 * 2307's own example (a million nodes whose minimum is 0 or 1 against a top of 1,204,318)
 * under the label the spec writes out, and it keeps a 6-ring's minimum of 2 against a
 * maximum of 2 -- one whole unit of the only scale the run has -- out of it.
 */
const NEAR_ZERO_VALUE_SHARE = 0.01;

/** Below this ratio the multiple keeps one decimal; at or above it, it is a whole number. */
const RATIO_DECIMAL_CEILING = 10;

/** Guards `toFixed`, which throws above 100 digits, for a value a hair above zero. */
const MAX_SIGNIFICANT_DECIMALS = 20;

/**
 * The lead of the collapsed headline, one per metric.
 *
 * A lookup rather than a switch, so a fourth metric cannot compile without its lead. The
 * words are the plain half of each capability's 6.3 pair read as a superlative -- Most
 * connected, Influence and Bridges become "Most connected", "Most influential" and "Main
 * bridge", the last of them verbatim from spec 7345's worked example. They live here
 * rather than being derived from `NODE_METRIC_DEFINITIONS[metric].plainName` because
 * "Influence" does not mechanically yield "Most influential", and a derivation that has
 * to be special-cased twice out of three is a lookup written the long way.
 */
const HEADLINE_LEADS: Readonly<Record<NodeMetricId, string>> = {
    betweenness: "Main bridge",
    degree: "Most connected",
    pagerank: "Most influential",
};

/**
 * A metric value as the surface draws it.
 *
 * A metric the definitions declare `integerValued` prints exact through
 * {@link formatCount}: a degree is a count of links and "12.00 links" is not a thing
 * anyone measured. So does any value that happens to land exactly on an integer, which is
 * also what keeps a measured 0 out of the significant-figures branch below. Everything
 * else prints to {@link DISPLAY_DECIMAL_PLACES} decimals, WITH ONE DEPARTURE, stated here
 * in full because it is a departure from a spec line rather than an implementation
 * detail.
 *
 * Spec 2266-2272 sets display rounding at the Settings > Defaults decimal places, default
 * 2. Applied literally to a PageRank score of 0.0034 that gives "0.00", which is not a
 * rounded value but an erased one: every node in the lower half of a PageRank ranking
 * would print the same string and the column would stop being data. The setting exists to
 * make values comparable, so below 1 in magnitude it is read as
 * {@link DISPLAY_DECIMAL_PLACES} SIGNIFICANT figures instead -- 0.0034 stays "0.0034",
 * 0.41 stays "0.41" -- which keeps the same two-digit precision the setting asks for and
 * keeps the values distinguishable. At or above 1 the two readings coincide.
 * @param metric - which metric the value belongs to, which is what says whether it is a
 * count.
 * @param value - the value. A non-finite value reads "0", matching {@link formatCount}.
 * @returns the value as a string, e.g. 1234 -> "1,234", 41.276 -> "41.28", 0.0034 -> "0.0034".
 */
export function formatMetricValue(metric: NodeMetricId, value: number): string {
    if (!Number.isFinite(value)) {
        return "0";
    }

    if (NODE_METRIC_DEFINITIONS[metric].integerValued || Number.isInteger(value)) {
        return formatCount(value);
    }

    const magnitude = Math.abs(value);
    if (magnitude < 1) {
        const leadingZeros = -Math.floor(Math.log10(magnitude));
        const decimals = Math.min(leadingZeros + DISPLAY_DECIMAL_PLACES - 1, MAX_SIGNIFICANT_DECIMALS);

        return value.toFixed(decimals);
    }

    return value.toFixed(DISPLAY_DECIMAL_PLACES);
}

/**
 * The multiple the two ratio templates print: a whole number, or one decimal below 10,
 * because "1 times" and "1.4 times" are different findings while "1,412" and "1,412.3"
 * are the same one.
 * @param ratio - the top value over the median value.
 * @returns the multiple as a string, e.g. 3.44 -> "3.4" and 1412.7 -> "1,413".
 */
function formatRatio(ratio: number): string {
    if (ratio < RATIO_DECIMAL_CEILING) {
        return String(Math.round(ratio * 10) / 10);
    }

    return formatProseCount(ratio);
}

/**
 * The second sentence of the two ratio templates, whichever is honest.
 *
 * A median of 0 makes the ratio infinite, and a reading that printed "Infinity times more
 * shortest paths" would be stating a number nobody computed. The median itself is still a
 * fact, and "Half the nodes score 0 or less" is true by the definition of a median, so
 * the sentence is replaced rather than softened or dropped: the budget is two sentences
 * and there is a second fact available, so the reading spends it.
 * @param statistics - the node-metric statistics.
 * @param multipleSentence - the sentence to use when the ratio is a real multiple, built
 * from the formatted ratio.
 * @returns the second sentence.
 */
function ratioSentence(statistics: NodeMetricStatistics, multipleSentence: (ratio: string) => string): string {
    const { medianValue, metric, topValue } = statistics;
    const ratio = topValue / medianValue;

    if (medianValue === 0 || !Number.isFinite(ratio)) {
        return `Half the nodes score ${formatMetricValue(metric, medianValue)} or less.`;
    }

    return multipleSentence(formatRatio(ratio));
}

/**
 * Most connected (Degree centrality): who has the most links, and what a typical node
 * has. No structural claim -- a degree count says nothing about what would split.
 * @param statistics - the node-metric statistics.
 * @returns the reading.
 */
function degreeReading(statistics: NodeMetricStatistics): string {
    const { medianValue, topId, topValue } = statistics;

    return [
        `${topId} is the most connected, with ${formatProseCount(topValue)} links.`,
        `The typical node has ${formatProseCount(medianValue)}.`,
    ].join(" ");
}

/**
 * Influence (PageRank): who scores highest, and by what multiple over a typical node. The
 * multiple rather than the raw score, because a PageRank score is a share of a unit mass
 * and means nothing to a novice on its own.
 * @param statistics - the node-metric statistics.
 * @returns the reading.
 */
function pagerankReading(statistics: NodeMetricStatistics): string {
    return [
        `${statistics.topId} has the most influence.`,
        ratioSentence(statistics, (ratio) => `Its score is ${ratio} times the typical node's.`),
    ].join(" ");
}

/**
 * Bridges (Betweenness centrality), in the relative form spec 7405-7409 writes out and
 * never in the percentage form of spec 7377-7383. See the module doc for why the
 * percentage is not derivable from what the element computes.
 * @param statistics - the node-metric statistics.
 * @returns the reading.
 */
function betweennessReading(statistics: NodeMetricStatistics): string {
    return [
        `${statistics.topId} is the strongest bridge.`,
        ratioSentence(
            statistics,
            (ratio) => `It sits on about ${ratio} times more shortest paths than a typical node.`,
        ),
    ].join(" ");
}

/**
 * The templates, one per metric. A lookup rather than a switch, so a fourth metric cannot
 * compile without a template and therefore cannot fall back on a metric's wording that
 * does not describe it.
 */
const READING_TEMPLATES: Readonly<Record<NodeMetricId, (statistics: NodeMetricStatistics) => string>> = {
    betweenness: betweennessReading,
    degree: degreeReading,
    pagerank: pagerankReading,
};

/**
 * What one metric says when its run has no ranking to report.
 */
interface DegenerateReadings {
    /** The reading when the highest value measured is 0. */
    readonly nothingMeasured: (statistics: NodeMetricStatistics) => string;
    /** The reading when the highest value measured is the median as well. */
    readonly tiedWithTypical: (statistics: NodeMetricStatistics) => string;
}

/**
 * The two readings a degenerate run gets instead of a template, one pair per metric.
 *
 * `nothingMeasured` answers a maximum of 0. Every metric here is non-negative, so a
 * maximum of 0 means every measured node scored 0, and each metric says what that means in
 * its own words rather than naming the first id in the sort order.
 *
 * `tiedWithTypical` answers a maximum equal to the median. It keeps the node's id -- the
 * node really is one of the top nodes -- and drops both the superlative and the multiple,
 * because neither survives the tie. "At least half" is exact rather than hedged: the
 * median is the LOWER median of the descending list, so a maximum equal to it means every
 * reading from the first down to the median holds the maximum, and that is at least half
 * of them.
 *
 * A lookup rather than a switch, for the reason {@link READING_TEMPLATES} is one: a fourth
 * metric cannot compile without its own answer to both.
 */
const DEGENERATE_READINGS: Readonly<Record<NodeMetricId, DegenerateReadings>> = {
    betweenness: {
        nothingMeasured: ({ rankedCount }) =>
            [
                "No node sits on a shortest path between two others.",
                `All ${formatProseCount(rankedCount)} measured nodes scored 0.`,
            ].join(" "),
        tiedWithTypical: ({ topId }) =>
            [
                `${topId} is among the strongest bridges.`,
                "At least half the measured nodes sit on as many shortest paths.",
            ].join(" "),
    },
    degree: {
        nothingMeasured: ({ rankedCount }) =>
            [
                "No node has any links.",
                `All ${formatProseCount(rankedCount)} measured nodes are on their own.`,
            ].join(" "),
        tiedWithTypical: ({ topId, topValue }) =>
            [
                `${topId} is among the most connected, with ${formatProseCount(topValue)} links.`,
                "At least half the measured nodes have as many.",
            ].join(" "),
    },
    pagerank: {
        nothingMeasured: ({ rankedCount }) =>
            [
                "No node scored any influence.",
                `All ${formatProseCount(rankedCount)} measured nodes scored 0.`,
            ].join(" "),
        tiedWithTypical: ({ topId }) =>
            [
                `${topId} is among the most influential.`,
                "At least half the measured nodes score as much.",
            ].join(" "),
    },
};

/**
 * The node-metric result reading: two sentences, under 220 characters, naming what was
 * measured and nothing else (spec 7.5, RT-10 at spec 4903-4905).
 *
 * The cap holds by construction rather than by truncation. The longest fixed text of the
 * three templates is the betweenness form at 90 characters, which leaves 130 for the
 * node's id and the multiple together -- so a reading crosses 220 only when the id alone
 * runs past about 120 characters, and a node id is the user's own string, which floor
 * item 7 forbids shortening at any density. A long true line is the right failure; a
 * clipped sentence that still reads as a claim is not.
 * The two degenerate shapes are tested first, because a template's superlative is only
 * true when the run separated the nodes at all. See the module doc for what each of them
 * printed before the guard.
 * @param statistics - what the run reported, as primitives.
 * @returns the reading, e.g. "acct-4471 is the strongest bridge. It sits on about 12 times more shortest paths than a typical node."
 */
export function nodeMetricReading(statistics: NodeMetricStatistics): string {
    const { medianValue, metric, topValue } = statistics;
    const degenerate = DEGENERATE_READINGS[metric];

    if (topValue === 0) {
        return degenerate.nothingMeasured(statistics);
    }

    if (topValue === medianValue) {
        return degenerate.tiedWithTypical(statistics);
    }

    return READING_TEMPLATES[metric](statistics);
}

/**
 * The collapsed form of the reading row: "the first clause and the headline number on one
 * line", which spec 7345 writes out as "Main bridge: acct-4471 (0.41)".
 *
 * IT NOW HAS A SECOND CALLER, and this is the one that made it load-bearing: the Analyze
 * panel's Results tab draws one collapsed card per run, and spec 2200-2202 gives that card
 * "title, state and headline plus the primary action" -- the headline being this string.
 * That card sits on screen at the same moment as the inspector's expanded reading (spec
 * 2203-2204: "One result body renders on screen at a time ... Reading, caveats line, run
 * record and shape body each render exactly once on screen"), so the two ARE read side by
 * side and a drift between them is visible rather than theoretical. It stays here, built
 * from the same {@link NodeMetricStatistics} as {@link nodeMetricReading}, for exactly
 * that reason; the panel assembles nothing.
 *
 * It takes the STATISTICS rather than a `NodeMetricRanking`, which is the shape the run
 * sites already build for {@link nodeMetricReading} one line earlier -- the same six
 * primitives plus the top reading's id and value. A second entry point taking a ranking
 * would be a second way to spell one call, and the two would be free to answer
 * differently the day either grew a case.
 *
 * It carries the same two degenerate shapes {@link nodeMetricReading} does, because the
 * collapsed form is the reading's first clause and a collapsed line reading "Main bridge:
 * a (0)" beside an expanded one reading "No node sits on a shortest path between two
 * others" is the falsehood the expanded form just stopped telling.
 * @param statistics - what the run reported, as primitives.
 * @returns the one-line headline, e.g. "Main bridge: acct-4471 (0.41)", "Main bridge: none".
 */
export function nodeMetricHeadline(statistics: NodeMetricStatistics): string {
    const { medianValue, metric, topId, topValue } = statistics;

    if (topValue === 0) {
        return `${HEADLINE_LEADS[metric]}: none`;
    }

    const value = formatMetricValue(metric, topValue);
    if (topValue === medianValue) {
        return `${HEADLINE_LEADS[metric]}: ${topId} (${value}, tied)`;
    }

    return `${HEADLINE_LEADS[metric]}: ${topId} (${value})`;
}

/**
 * One row of the result body.
 *
 * `rank` and `nodeId` are both absent on the aggregate tie row, which is a statement
 * about the distribution rather than about a node: it has no rank to chip and nothing to
 * select.
 * @public
 */
export interface NodeMetricBodyRow {
    /** The row's name: a node's own id PRINTED, or the aggregate row's label. */
    readonly name: string;
    /** The formatted value, or the aggregate row's count and share. */
    readonly value: string;
    /** The 1-based rank, on a ranked row only. */
    readonly rank?: number;
    /**
     * The node to select when the row is clicked, on a ranked row only.
     *
     * The element's OWN id, `number | string`, never the printed name beside it: two of
     * the three shipped samples are keyed by numbers, and a row that handed back "1" for
     * the node keyed `1` selected nothing at all and said nothing about it.
     */
    readonly nodeId?: number | string;
}

/**
 * Whether the value the tied nodes hold is one "Zero or near-zero" describes truthfully.
 *
 * Zero itself always is. Above it the test is relative, because the metrics have no common
 * scale: a betweenness score of 4 and a degree of 4 are not the same size of thing, and the
 * only size either run established is its own maximum. A run whose maximum is 0 has every
 * node at 0 and takes the first branch, so the division is never by zero.
 * @param minValue - the lowest value measured.
 * @param maxValue - the highest value measured.
 * @returns true when the minimum is zero, or small enough against the maximum to read as
 * near it.
 */
function isNearZeroMinimum(minValue: number, maxValue: number): boolean {
    if (minValue <= 0) {
        return true;
    }

    return maxValue > 0 && minValue / maxValue < NEAR_ZERO_VALUE_SHARE;
}

/**
 * The result body: the top {@link NODE_METRIC_TOP_ROWS} nodes in rank order, then spec
 * 2307's tie line when it applies.
 *
 * Rows are named by the node's OWN id -- never a display label, never a shortened form,
 * never an icon (floor item 7: the user's own strings are what RT-6 draws). The name is
 * the PRINTED id ({@link NodeMetricReading.label}) and `nodeId` is the element's own id
 * beside it, so a caller selects the node with the value the element is keyed by rather
 * than parsing the drawn name back out -- which on the two GML samples, keyed by numbers,
 * selected nothing.
 *
 * The tie row states spec 2307's "Zero or near-zero: 912,400 nodes (91%)" as a fact
 * rather than drawing it as a bar, and appears only when more than
 * {@link NEAR_ZERO_TIE_SHARE} of the RANKED nodes tie at the minimum -- ranked, not
 * loaded, because a node the run never reached did not tie with anything. It takes the
 * spec's label only when the minimum they tie at is at or near zero; otherwise it states
 * the same count and share under the value they actually hold, which is the whole of the
 * second defect in the module doc.
 *
 * An empty ranking yields an empty array, so the section that would draw it draws nothing
 * at all rather than an empty claim about a ranking that has no members.
 * @param ranking - the ranked nodes, highest first, with the counts the tie line needs.
 * @returns the rows, in the order they are drawn.
 */
export function nodeMetricResultBody(ranking: NodeMetricRanking): readonly NodeMetricBodyRow[] {
    const rows: NodeMetricBodyRow[] = ranking.byValueDescending
        .slice(0, NODE_METRIC_TOP_ROWS)
        .map((reading, index) => ({
            name: reading.label,
            value: formatMetricValue(ranking.metric, reading.value),
            rank: index + 1,
            nodeId: reading.id,
        }));

    const { maxValue, metric, minValue, rankedCount, tiedAtMinimum } = ranking;
    if (rankedCount > 0 && tiedAtMinimum / rankedCount > NEAR_ZERO_TIE_SHARE) {
        rows.push({
            name: isNearZeroMinimum(minValue, maxValue)
                ? "Zero or near-zero"
                : `Lowest value (${formatMetricValue(metric, minValue)} ${NODE_METRIC_DEFINITIONS[metric].unitWord})`,
            value: `${formatCount(tiedAtMinimum)} nodes (${formatPercent(tiedAtMinimum / rankedCount)})`,
        });
    }

    return rows;
}
