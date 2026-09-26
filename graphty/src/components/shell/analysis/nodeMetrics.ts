/**
 * The three node-metric runs the Analyze panel's Suggested list offers, and the plain
 * numbers they yield.
 *
 * Spec 6.3 fixes the pairs the shell speaks in -- Most connected (Degree centrality),
 * Influence (PageRank), Bridges (Betweenness centrality) -- and spec 2307 fixes the Node
 * metric shape's body: a ranked top three, a distribution whose caption states its scale,
 * and a "Zero or near-zero" line when more than 10% of the ranked nodes tie at the
 * minimum. Every one of those obligations is a number before it is a sentence, and this
 * module turns one of graphty-element's results into those numbers.
 *
 * IT NO LONGER COMPUTES THEM. This module used to walk every node, read a value off a
 * per-node result bag, and derive the ordering, the maximum, the minimum, the lower
 * median, the count tied at the bottom and a twenty-bar distribution itself -- roughly
 * three hundred lines reconstructing, from per-node values, work the element had already
 * done while it walked the result. The element publishes all of it: `ranking("value")` is
 * the ordering, `summary()` carries the five figures, and `histogram("value")` is the
 * distribution together with the scale it was really laid out on.
 *
 * That was not merely duplication by the end. The per-node bag it read is gone from
 * graphty-element, so every read came back undefined, every node was skipped as
 * unmeasured, and all three cards drew nothing while the runs beneath them succeeded.
 *
 * Two rules this module still holds to, the same two runs.ts holds to:
 *
 * 1. It returns primitives and one element value object. The readings module turns numbers
 *    into sentences and the defaults module turns them into style layers; neither runs the
 *    element, so both stay testable without one.
 * 2. It does not ask for suggested styles. The element applies its own on a run's first
 *    completion and stands aside when a layer somebody wrote by hand already drives the
 *    channel, which is the decision this module used to make on the element's behalf.
 *
 * WHAT STAYS HERE, and why it is not element work. Which three of the element's twenty
 * algorithms this panel offers; the paired plain and technical names; the word a bar label
 * puts after a number ("links", "score"); how a value is printed; and the sentence under
 * the chart. All of it is what this panel says, not what the graph is.
 *
 * NODE IDS ARE NOT STRINGS. `RankingEntry.id` is the element's own `number | string` and
 * is carried through untouched, because that is the value a consumer hands back to select
 * a node. Two of the three shipped samples are keyed by numbers -- GML parses an integer
 * id as an integer -- so selecting by the printed form matches nothing on those, silently.
 * Every reading therefore carries both: the id, and the printed form a row is named by.
 *
 * A PAGERANK `converged: true` IS NOT A MEASUREMENT. On the delta path, which every graph
 * over 100 nodes takes at this shell's defaults, upstream returns a hard-coded `true`
 * whose own comment reads "for now, assume we used all iterations". The element publishes
 * neither field on that path, and this module carries only a published `false` -- which is
 * why {@link NodeMetricRanking.converged} is typed `false` rather than `boolean`. Absence
 * and `true` both mean "draw no convergence caveat", so dropping it costs a reader nothing,
 * while carrying it would build an honesty guarantee on a constant.
 *
 * App shell progressive disclosure design, section 6.3 (capability names), 2307 (the Node
 * metric shape) and 7.5 (readings built from these statistics).
 */
import type { Histogram, RunId, RunResult } from "@graphty/graphty-element/session";

import { METRIC_VALUE_FIELD } from "../defaults/styleDescriptors";
import type { ElementGraph } from "./elementBridge";

/**
 * The three node metrics this slice runs, by the id the Suggested card and the command
 * palette row share.
 * @public
 */
export type NodeMetricId = "betweenness" | "degree" | "pagerank";

/**
 * How the element normalised a metric's published fraction, and therefore how this
 * module derives one when the element published none.
 *
 * "max" is value / maximum: the top node reads 1 and the bottom node reads whatever
 * share of the top it holds. "min-max" is (value - minimum) / (maximum - minimum): the
 * top node reads 1 and the bottom node reads exactly 0 by construction.
 * @public
 */
export type NodeMetricNormalisation = "max" | "min-max";

/**
 * Everything one metric's run needs: where to find it in graphty-element's registry,
 * where its numbers land on a node, and what to call it in the two vocabularies spec
 * 6.3 pairs.
 * @public
 */
export interface NodeMetricDefinition {
    /** The metric's id, matching the Suggested card. */
    readonly id: NodeMetricId;
    /** graphty-element's registry namespace. */
    readonly namespace: string;
    /** graphty-element's registry type -- the second half of `runAlgorithm`'s address. */
    readonly type: string;
    /** The plain-language name (spec 6.3's first half). */
    readonly plainName: string;
    /** The technical name (spec 6.3's second half). */
    readonly technicalName: string;
    /** The method's own name, for the one-line run record. */
    readonly methodName: string;
    /** The word a bin label puts after the value, e.g. "links" or "score". */
    readonly unitWord: string;
    /** Whether the raw value is a count, and therefore printed without decimals. */
    readonly integerValued: boolean;
    /** Which rule this metric's bars are drawn on -- see {@link NodeMetricNormalisation}. */
    readonly normalisation: NodeMetricNormalisation;
}

/**
 * The three metrics, keyed by id.
 *
 * Every coordinate here is read off the element rather than guessed, because a wrong
 * registry type is a run that silently never happens and a wrong result key is a
 * ranking that is silently empty.
 * @public
 */
export const NODE_METRIC_DEFINITIONS: Readonly<Record<NodeMetricId, NodeMetricDefinition>> = {
    /**
     * DegreeAlgorithm.ts:9-10 registers graphty:degree, and :85-91 writes `degree` with
     * `degreePct` as degree / maxDegree -- max-normalised, so the least connected node
     * is rarely 0.
     */
    degree: {
        id: "degree",
        namespace: "graphty",
        type: "degree",
        plainName: "Most connected",
        technicalName: "Degree centrality",
        methodName: "Degree centrality",
        unitWord: "links",
        integerValued: true,
        normalisation: "max",
    },

    /**
     * PageRankAlgorithm.ts:84-85 registers graphty:pagerank, and :219-235 writes `rank`
     * with `rankPct` as rank / maxRank. It also publishes `iterations` and `converged` at
     * graph level, and this module deliberately ignores both: on the delta path every
     * graph over 100 nodes takes, they are the constants `maxIterations` and `true`
     * rather than anything the run measured. See the module comment.
     */
    pagerank: {
        id: "pagerank",
        namespace: "graphty",
        type: "pagerank",
        plainName: "Influence",
        technicalName: "PageRank",
        methodName: "PageRank",
        unitWord: "score",
        integerValued: false,
        normalisation: "max",
    },

    /**
     * BetweennessCentralityAlgorithm.ts:19-20 registers graphty:betweenness -- the type
     * is "betweenness", NOT "betweenness-centrality", and the longer string addresses
     * nothing in the registry -- and :61-78 writes `score` with `scorePct` min-max
     * normalised, so the bottom node reads exactly 0 and the top exactly 1.
     */
    betweenness: {
        id: "betweenness",
        namespace: "graphty",
        type: "betweenness",
        plainName: "Bridges",
        technicalName: "Betweenness centrality",
        methodName: "Betweenness centrality",
        unitWord: "score",
        integerValued: false,
        normalisation: "min-max",
    },
};

/**
 * The three ids in the order the Suggested list draws them: Most connected, Influence,
 * Bridges.
 * @public
 */
export const NODE_METRIC_IDS: readonly NodeMetricId[] = ["degree", "pagerank", "betweenness"];

/**
 * What a metric that has not run reports.
 *
 * Zeros with a rankedCount of zero, so a card draws "not run" rather than "measured nothing":
 * the two are different, and a fabricated zero maximum is exactly the kind of number a reader
 * goes looking for in their own data and cannot find.
 * @param metric - which metric has not run.
 * @returns the empty ranking.
 */
function EMPTY_RANKING(metric: NodeMetricId): NodeMetricRanking {
    return {
        metric,
        byValueDescending: [],
        nodeCount: 0,
        rankedCount: 0,
        maxValue: 0,
        minValue: 0,
        medianValue: 0,
        maxFraction: 0,
        minFraction: 0,
        medianFraction: 0,
        tiedAtMinimum: 0,
        distribution: { bins: [], scale: "linear", suggestedScale: "linear", binning: "empty" },
    };
}

/** One node's reading of one metric. @public */
export interface NodeMetricReading {
    /**
     * The node's id EXACTLY as graphty-element holds it, `number | string`, never
     * coerced. This is the value a consumer hands back to `selectNode`, `getNode` or any
     * other element door; see the module comment for the two shipped samples a
     * stringified id made unselectable.
     */
    readonly id: number | string;
    /**
     * The same id printed, which is what a row is NAMED by. Computed once here so no
     * consumer has to, and so no consumer is tempted to select by it.
     */
    readonly label: string;
    /** The raw value the element measured. */
    readonly value: number;
    /**
     * The normalised value, 0 to 1. Read from the element's own field when it published
     * one, otherwise derived the way that metric's normalisation says.
     */
    readonly fraction: number;
}

/**
 * One metric's run, read back: the ranking plus every statistic the result card, the
 * legend channel and the distribution need.
 * @public
 */
export interface NodeMetricRanking {
    /** Which metric this ranks. */
    readonly metric: NodeMetricId;
    /**
     * The run that measured it, when these readings came from a run.
     *
     * The run is what a style layer scopes itself to and what "Remove result" names, so it
     * travels with the ranking. {@link readNodeMetricResults} reads what is already on the
     * nodes and started nothing, so it reports none.
     */
    readonly runId?: RunId;
    /** Every measured node, highest value first, ties broken by printed id. */
    readonly byValueDescending: readonly NodeMetricReading[];
    /**
     * Every node the graph holds, measured or not. This is the number that lets a
     * consumer say "Not measured (N nodes)" rather than quietly shortening the graph.
     * It is a COUNT OF THE LIVE GRAPH, never the length of the ranking: see
     * {@link rankingFromDegreeResults}, where equating the two hid a whole additively
     * loaded file from the legend.
     */
    readonly nodeCount: number;
    /** How many nodes the run actually measured. */
    readonly rankedCount: number;
    /** The highest value measured, or 0 when nothing was. */
    readonly maxValue: number;
    /** The lowest value measured, or 0 when nothing was. */
    readonly minValue: number;
    /** The lower median value -- see {@link readNodeMetricResults}. */
    readonly medianValue: number;
    /** The fraction of the highest-valued reading. */
    readonly maxFraction: number;
    /** The fraction of the lowest-valued reading. */
    readonly minFraction: number;
    /** The fraction of the median reading. */
    readonly medianFraction: number;
    /** How many readings sit exactly at {@link NodeMetricRanking.minValue}. */
    readonly tiedAtMinimum: number;
    /**
     * The distribution, as graphty-element laid it out.
     *
     * Carried rather than computed, and carrying the SCALE as well as the bars is the point:
     * a logarithmic layout needs positive values spanning more than one magnitude, and a
     * column with neither is drawn linearly rather than refused. A caption written from what
     * was asked for then says "log scale" over a linear chart. {@link Histogram.scale} is
     * what was applied, and that is what the caption reads.
     */
    readonly distribution: Histogram;
    /**
     * PageRank only, and present ONLY when the element reported a failure to converge --
     * which is why its type is `false` and not `boolean`. Absent means one of two things
     * this module cannot tell apart: the run converged, or it ran on the delta path,
     * where the published flag is an upstream constant rather than a measurement. See the
     * module comment before building anything on the absence.
     */
    readonly converged?: false;
    /**
     * PageRank only: how many iterations the run that did NOT converge took. Present only
     * beside {@link NodeMetricRanking.converged}, because that is the only path on which
     * the element's iteration count is measured rather than assumed.
     */
    readonly iterations?: number;
}

/**
 * Derives the fraction a bar is drawn at, for a metric the element publishes raw.
 *
 * WHY THE APP DERIVES THIS AT ALL. Every node metric graphty-element ships publishes its
 * numbers unnormalised -- degree and betweenness both declare `normalization: "none"` --
 * and the per-node share the panel draws is a presentation choice, not a measurement: it
 * is how long to draw the bar next to a number. The element's own per-node `percentile`
 * is a different quantity, the share of nodes this one ranks at or above, and drawing a
 * bar at it would make a graph's most connected node and its least connected node look
 * equally far apart on every graph.
 *
 * The two rules are not interchangeable. "max" answers "what share of the top node's
 * score is this", so the lowest node is rarely at zero. "min-max" answers "where does
 * this sit between the bottom and the top", so the lowest node is always exactly zero and
 * the highest always exactly one, whatever the raw spread was. Which rule a metric uses is
 * declared beside it in {@link NODE_METRIC_DEFINITIONS}, because the reading under the
 * chart has to say which question the bars answer.
 *
 * A zero denominator yields 0 rather than NaN.
 * @param value - the reading's raw value.
 * @param minValue - the lowest value measured.
 * @param maxValue - the highest value measured.
 * @param normalisation - which rule this metric's bars are drawn on.
 * @returns the fraction, 0 to 1.
 */
function deriveFraction(
    value: number,
    minValue: number,
    maxValue: number,
    normalisation: NodeMetricNormalisation,
): number {
    if (normalisation === "max") {
        return maxValue > 0 ? value / maxValue : 0;
    }

    const range = maxValue - minValue;

    return range > 0 ? (value - minValue) / range : 0;
}

/**
 * Turns one of graphty-element's run results into the ranking this panel draws.
 *
 * WHAT THIS USED TO DO, AND WHY IT STOPPED WORKING. It walked every node, read a value off
 * a per-node `algorithmResults` bag, sorted the list, and computed the maximum, the
 * minimum, the lower median and the count of nodes tied at the bottom itself. graphty-element
 * no longer writes that bag -- nothing assigns it and `Node` does not declare it -- so every
 * read came back undefined, every node was skipped as unmeasured, and all three metric cards
 * drew nothing at all while the run underneath them succeeded.
 *
 * The element now answers all of it from the result object: `ranking("value")` is the
 * ordering, sorted value-descending with a printed-id tie-break, and `summary()` carries the
 * count, the measured count, the minimum, the maximum, the lower median and the number tied
 * at the minimum. The arithmetic is the same arithmetic this module used to run -- the same
 * lower median, chosen so a degree median is a whole number some node actually has -- and the
 * element's ranks are better than the ones computed here were: tied elements share a rank
 * rather than being numbered by position, so two nodes with equal betweenness no longer read
 * as third and fourth.
 *
 * Ids are carried through untouched. `RankingEntry.id` is the element's own `number | string`
 * and is what a consumer hands back to select a node; the printed form beside it is what a row
 * is named by. Two of the three shipped samples are keyed by numbers, and selecting by the
 * printed form silently matches nothing on those.
 * @param metric - which metric this result measured.
 * @param result - what the run published.
 * @returns the ranking, highest value first.
 */
function rankingFromResult(metric: NodeMetricId, result: RunResult): NodeMetricRanking {
    const definition = NODE_METRIC_DEFINITIONS[metric];
    const summary = result.summary();
    const maxValue = summary.max ?? 0;
    const minValue = summary.min ?? 0;
    const medianValue = summary.median ?? 0;
    const fractionOf = (value: number): number => deriveFraction(value, minValue, maxValue, definition.normalisation);

    const byValueDescending: NodeMetricReading[] = result.ranking(METRIC_VALUE_FIELD).map((entry) => ({
        id: entry.id,
        label: String(entry.id),
        value: entry.value,
        fraction: fractionOf(entry.value),
    }));

    const ranking: NodeMetricRanking = {
        metric,
        byValueDescending,
        // The element's count is the node scope the run SAW, which is the number that makes
        // "Not measured (N nodes)" mean something: measured against the graph as it stood when
        // the numbers were produced, not against the graph as it stands now. A load that has
        // since added nodes is a different question, and the element answers that one through
        // the run's own staleness note.
        nodeCount: summary.count,
        rankedCount: summary.measured,
        maxValue,
        minValue,
        medianValue,
        maxFraction: fractionOf(maxValue),
        minFraction: fractionOf(minValue),
        medianFraction: fractionOf(medianValue),
        tiedAtMinimum: summary.tiedAtMin,
        /* "auto" rather than a rule of the shell's own: the element knows whether this column
           collapses onto one bar linearly, and whether a logarithmic layout can be built for it
           at all. Both questions used to be answered here, from a copy of the arithmetic. */
        distribution: result.histogram(METRIC_VALUE_FIELD, {
            bins: METRIC_DISTRIBUTION_MAX_BINS,
            scale: "auto",
        }),
    };

    if (metric !== "pagerank") {
        return ranking;
    }

    /* A published `true` is dropped and only a published `false` is carried, which is why
       NodeMetricRanking.converged is typed `false` rather than `boolean`. On the delta path --
       which every graph over 100 nodes takes at the shell's defaults -- the upstream algorithm
       returns a hard-coded `converged: true` whose own comment reads "for now, assume we used
       all iterations", so a `true` is a constant rather than a measurement. The element knows
       this and publishes neither field on that path; carrying a `true` if one ever appeared
       would build an honesty guarantee on nothing. Absence and `true` both mean "draw no
       convergence caveat", so dropping it costs a reader nothing. */
    const { converged, iterations } = result.graph;

    if (converged !== false) {
        return ranking;
    }

    return {
        ...ranking,
        converged: false,
        ...(typeof iterations === "number" && Number.isFinite(iterations) ? { iterations } : {}),
    };
}

/**
 * Reads a metric that has already run, without running one.
 *
 * The result lives on the run rather than on the nodes, so this finds the run instead of
 * walking the graph: the most recent succeeded run of that algorithm, which is the one whose
 * numbers the picture was painted from. A metric nobody has run yet reports an empty ranking
 * rather than zeros, so a card can say "not run" instead of "measured nothing".
 * @param graph - the element graph whose session holds the runs.
 * @param metric - which metric to read.
 * @returns the ranking, highest value first, empty when that metric has not run.
 * @public
 */
export function readNodeMetricResults(graph: ElementGraph, metric: NodeMetricId): NodeMetricRanking {
    const finished = graph
        .getSession()
        .runs.list()
        .filter((run) => run.algorithm === metric && run.status === "succeeded");
    const latest = finished.at(-1);

    if (latest?.result === undefined) {
        return EMPTY_RANKING(metric);
    }

    return { ...rankingFromResult(metric, latest.result), runId: latest.id };
}

/**
 * Runs one metric through graphty-element and reads what it published.
 *
 * No parameters are passed, and that is a decision rather than an omission. Degree and
 * betweenness declare no options at all, so anything handed to them is silently discarded --
 * a parameter passed there would be a claim the element never contradicts, and it would then
 * be printed in a run record describing a run that did not happen. PageRank at its defaults
 * needs none.
 *
 * The run PAINTS. A reader asking for a metric is asking for the picture, and the element's
 * own policy decides whether its suggested encoding stands or a layer somebody wrote by hand
 * keeps the channel. Starting the same metric twice on an unchanged graph returns the run that
 * already exists rather than recomputing it.
 * @param graph - the element graph to run on.
 * @param metric - which metric to run.
 * @returns the ranking, highest value first.
 * @public
 */
export async function runNodeMetric(graph: ElementGraph, metric: NodeMetricId): Promise<NodeMetricRanking> {
    /* Through the session rather than the 1.10 address, so the run's id comes back with it: a
       style layer scopes itself to the run whose column it reads, and the card's "Remove result"
       verb names that run too. */
    const run = graph.getSession().runs.start(metric);
    const result = await run;

    return { ...rankingFromResult(metric, result), runId: run.id };
}

/** One bar of a metric's distribution. @public */
export interface MetricDistributionBin {
    /** The bar's whole phrase, e.g. "2 to 5 links: 40 nodes". */
    readonly label: string;
    /** How many nodes fall in it. */
    readonly count: number;
}

/** A metric's distribution, ready for the result card's one chart row. @public */
export interface MetricDistribution {
    /** One bar per distinct value, or per band once there are too many values. */
    readonly bins: readonly MetricDistributionBin[];
    /** The lowest value measured, as the axis's left end. */
    readonly axisMin: string;
    /** The highest value measured, as the axis's right end. */
    readonly axisMax: string;
    /**
     * Whether these bins REALLY were laid out on a log scale (spec 2307) -- not whether
     * the ratio test asked for one. It is false whenever the chart draws one bar per
     * distinct value, because no banding ran there at all, and false when the log layout
     * degenerated to a single band. {@link MetricDistribution.caption} is derived from
     * this field and never from the ratio test, so a caption cannot name a scale the
     * bins are not on.
     */
    readonly logX: boolean;
    /** The chart's caption, which states the scale when it is not linear. */
    readonly caption: string;
}

/** How many bars the distribution draws at most. Past that, values share a band. */
export const METRIC_DISTRIBUTION_MAX_BINS = 20;

/**
 * Formats one metric value for a bin label or an axis end.
 *
 * Counts print exact with comma groups. A value at or above 1 in magnitude prints to
 * the Settings > Defaults decimal places (spec 2266-2271, default 2). Below 1 that rule
 * stops being data -- a PageRank score of 0.0034 rounds to "0.00" and says nothing --
 * so below 1 the two places are read as two SIGNIFICANT figures instead, which is the
 * comparability the setting was asking for. Trailing zeros are dropped either way,
 * because "0.50" claims a precision the second place is not carrying.
 * @param value - the value to print.
 * @param integerValued - whether the metric is a count.
 * @returns the printed value, ASCII only.
 */
function formatMetricValue(value: number, integerValued: boolean): string {
    if (!Number.isFinite(value)) {
        return "0";
    }

    if (integerValued || Number.isInteger(value)) {
        return Math.round(value).toLocaleString("en-US");
    }

    const text =
        Math.abs(value) >= 1
            ? value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
            : value.toPrecision(2);
    if (text.includes("e") || !text.includes(".")) {
        return text;
    }

    return text.replace(/0+$/, "").replace(/\.$/, "");
}

/**
 * Words one bar: the value or the range it holds, its unit, and its count.
 *
 * The label is the bar's tooltip AND its row in the chart's table of values, so it has
 * to stand on its own without the axis beside it -- "3 links: 12 nodes" rather than
 * "12".
 * @param definition - the metric being drawn.
 * @param from - the lowest value in the bar.
 * @param to - the highest value in the bar.
 * @param count - how many nodes fall in it.
 * @returns the label.
 */
function binLabel(definition: NodeMetricDefinition, from: number, to: number, count: number): string {
    const low = formatMetricValue(from, definition.integerValued);
    const high = formatMetricValue(to, definition.integerValued);
    const span = low === high ? low : `${low} to ${high}`;

    return `${span} ${definition.unitWord}: ${formatMetricValue(count, true)} nodes`;
}

/**
 * The distribution the result card draws as its one chart row.
 *
 * One bar per distinct value while that fits under {@link METRIC_DISTRIBUTION_MAX_BINS},
 * bands once it does not -- so a graph whose degrees run to the thousands draws twenty
 * bars rather than thousands. The graph summary's degree histogram is the same bins,
 * worded by {@link formatMetricDistribution}.
 *
 * The heavy-tail test is spec 2307's rule and nothing else: maximum over median above
 * {@link LOG_X_RATIO_THRESHOLD}, with a median above 0 so the ratio means something. It
 * ASKS for a log layout, where a heavy tail would otherwise collapse every node but a
 * handful into the first bar. What is reported as {@link MetricDistribution.logX}, and
 * therefore what the caption claims, is whether a log layout was actually APPLIED: where
 * there are fewer distinct values than the cap, every value already has its own bar, no
 * banding runs, and the chart is on no scale but its own -- captioning that "(log
 * scale)" would name a transform the bins never saw. Spec 2307 asks a chart to state its
 * scale, which is an obligation to be right rather than an obligation to say something.
 *
 * An empty ranking returns no bins and an axis that claims no range, because nothing on
 * screen may claim a distribution the shell has not measured.
 * @param ranking - the ranking to describe.
 * @returns the bars, the two axis ends and the caption.
 * @public
 */
export function metricDistribution(ranking: NodeMetricRanking): MetricDistribution {
    return formatMetricDistribution(
        NODE_METRIC_DEFINITIONS[ranking.metric],
        ranking.distribution,
        ranking.minValue,
        ranking.maxValue,
    );
}

/**
 * Words graphty-element's bins for one metric: a label per bar, the two axis ends and the
 * caption. It bins nothing -- the bars are the element's, one for one.
 * @param definition - the metric being drawn.
 * @param distribution - what `RunResult.histogram()` returned for the metric's value field.
 * @param minValue - the lowest value measured, for the axis's left end.
 * @param maxValue - the highest value measured, for the axis's right end.
 * @returns the bars, the two axis ends and the caption.
 */
export function formatMetricDistribution(
    definition: NodeMetricDefinition,
    distribution: Histogram,
    minValue: number,
    maxValue: number,
): MetricDistribution {
    const logApplied = distribution.scale === "log";
    const caption = `${definition.plainName} per node${logApplied ? " (log scale)" : ""}`;

    if (distribution.bins.length === 0) {
        return { bins: [], axisMin: "0", axisMax: "0", logX: false, caption };
    }

    return {
        bins: distribution.bins.map((bin) => ({
            label: binLabel(definition, bin.from, bin.to, bin.count),
            count: bin.count,
        })),
        axisMin: formatMetricValue(minValue, definition.integerValued),
        axisMax: formatMetricValue(maxValue, definition.integerValued),
        logX: logApplied,
        caption,
    };
}
