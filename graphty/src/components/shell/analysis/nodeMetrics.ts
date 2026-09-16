/**
 * The three node-metric runs the Analyze panel's Suggested list offers, and the plain
 * numbers they yield.
 *
 * Spec 6.3 fixes the pairs the shell speaks in -- Most connected (Degree centrality),
 * Influence (PageRank), Bridges (Betweenness centrality) -- and spec 2307 fixes the
 * Node metric shape's body: a ranked top three, a distribution whose caption states its
 * scale, and a "Zero or near-zero" line when more than 10% of the ranked nodes tie at
 * the minimum. Every one of those obligations is a number before it is a sentence, and
 * this module produces the numbers and nothing else.
 *
 * Two rules this module holds to, the same two runs.ts holds to and for the same
 * reasons:
 *
 * 1. It returns primitives. The readings module turns numbers into sentences and the
 *    defaults module turns numbers into style layers; neither imports the element, so
 *    both stay pure and testable. This module is the only place in the slice that
 *    awaits the element for a centrality run.
 * 2. It does not ask for suggested styles. `applySuggestedStyles` would paint the
 *    element's own layer, and every one of the three these metrics ship uses node
 *    selector "" and writes a fixed ramp into `style.texture.color`
 *    (DegreeAlgorithm.ts:12-30 viridis, BetweennessCentralityAlgorithm.ts:21-40 plasma)
 *    -- or, for PageRank, into `style.shape.size`, the exact channel the element's
 *    hand-tuned node defaults own (PageRankAlgorithm.ts:170-173). Applying one would
 *    overwrite an encoding the shell did not construct and whose palette it cannot
 *    control, on a graph where the reader may already have authored a colour layer of
 *    their own. It is the same objection runs.ts:16-20 already records for Louvain's
 *    modulo-8 okabeIto palette. The encoding this slice paints is built by the defaults
 *    module out of the fractions returned here.
 *
 * The *Pct fields the element publishes are NOT one thing, and a consumer that treats
 * them as one will mis-explain two of the three metrics. Degree's `degreePct` and
 * PageRank's `rankPct` are value / maximum (DegreeAlgorithm.ts:91,
 * PageRankAlgorithm.ts:228), so the smallest node is rarely 0 and a node at 0.5 has
 * half the top node's score. Betweenness's `scorePct` is (score - min) / (max - min)
 * (BetweennessCentralityAlgorithm.ts:77), so the lowest node is always exactly 0 and
 * the highest always exactly 1 whatever the raw spread was. That is why
 * {@link NodeMetricDefinition} carries `normalisation`, and why one shared "percent"
 * explanation for all three would be wrong about two of them.
 *
 * The betweenness caveat, stated plainly because a consumer must repeat it:
 * `BetweennessCentralityAlgorithm` calls `toAlgorithmGraph` with NO options, and those
 * options default to directed:false plus addReverseEdges:true, which sets
 * `useDirectedInternally` true (graphConverter.ts:43). Upstream therefore skips the
 * undirected divide-by-2 while the added reverse edges inflate the path counts, so the
 * absolute `score` is not comparable to NetworkX output and no percentage of shortest
 * paths is derivable from it. It is a RELATIVE ranking and every consumer must present
 * it as one -- spec 7405-7409 writes the honest template out ("it sits on about 40
 * times more shortest paths than a typical node"), and that relative phrasing is the
 * only one this data supports.
 *
 * Betweenness and closeness publish NOTHING at graph level -- there is no
 * `addGraphResult` call anywhere in either file -- so a maximum cannot be read off the
 * data manager for them. This module therefore computes maximum, minimum and median
 * from the node readings themselves for EVERY metric, including the two that do publish
 * a graph-level maximum, so one source answers every question it is asked. That is the
 * identical note runs.ts:105-109 records for maxDegree.
 *
 * NODE IDS ARE NOT STRINGS, and this module used to pretend they were. It stored
 * `String(node.id)` and nothing else, while graphty-element's `NodeIdType` is
 * `number | string` and `DataManager.nodes` is keyed by whatever the data source
 * produced: `GMLDataSource.parseSimpleValue` returns `parseInt(value, 10)` for
 * /^-?\d+$/, so Karate Club and College football -- two of the three shipped samples --
 * are keyed by NUMBERS. `DataManager.getNode` is a bare `this.nodes.get(id)` with no
 * fallback, so `selectById("1")` on a Map keyed by `1` returned false with no warning
 * and clicking a ranked row did nothing at all on those two samples. Every reading
 * therefore now carries BOTH: {@link NodeMetricReading.id}, the element's own id,
 * untouched, which is what a consumer must hand back to the element; and
 * {@link NodeMetricReading.label}, the printed form, which is what a consumer draws.
 * A consumer that selects by the label is reintroducing the defect.
 *
 * A PAGERANK `converged: true` IS NOT A MEASUREMENT, and this module used to carry it as
 * one. For every graph over 100 nodes -- `runNodeMetric` passes no options, so `useDelta`
 * takes its schema default of true and pagerank.ts:110 sends the run to
 * SimpleDeltaPageRank -- pagerank.ts:144-148 returns a hard-coded
 * `{iterations: maxIterations, converged: true}` whose own comment reads "For now, assume
 * we used all iterations". Measured against the built package: n=101/5000/20000 all
 * publish converged=true iterations=100, while the same graphs run with useDelta:false
 * converge honestly in 19/11/8, and a run capped at maxIterations=3 publishes
 * converged=true where the honest answer is false. SimpleDeltaPageRank.compute knows its
 * own iteration count and whether maxDiff fell below tolerance, but it returns only the
 * score Map, so the real answer cannot be read through the element without changing the
 * algorithms package.
 *
 * What CAN be trusted is the other value. `converged: false` is returned from exactly one
 * place -- pagerank.ts:281, the standard power iteration, which set the flag by comparing
 * maxDiff against tolerance -- and the delta path cannot produce it. So this module keeps
 * a published `false` (and the `iterations` beside it, real on that same path) and drops
 * a published `true`, which is why {@link NodeMetricRanking.converged} is typed `false`
 * rather than `boolean`. Dropping the `true` costs a consumer nothing: absence and `true`
 * both mean "draw no convergence caveat". Carrying it would cost the next reader of this
 * module everything, because a constant that looks like a measurement is how an honesty
 * guarantee gets built on nothing. When upstream measures the delta path, widen the field
 * back to `boolean` here and delete this paragraph.
 *
 * What this module still CANNOT do, and no consumer should read into its silence: on the
 * delta path nobody knows whether the run converged. At the shell's fixed defaults
 * (damping 0.85, tolerance 1e-6, 100 iterations) the error decays by ~0.85 per step, so
 * 0.85^100 = 8.7e-8 is already inside the tolerance and every run the shell can order
 * does in fact converge -- the silence happens to be true, and it is true by arithmetic
 * rather than by measurement.
 *
 * App shell progressive disclosure design, section 6.3 (capability names), 2307 (the
 * Node metric shape) and 7.5 (readings built from these statistics).
 */

import { type ElementGraph, readResultPath } from "./elementBridge";
import type { DegreeResults } from "./runs";

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
    /** The per-node result key holding the raw value. */
    readonly valueField: string;
    /** The per-node result key holding the element's normalised fraction. */
    readonly fractionField: string;
    /** The word a bin label puts after the value, e.g. "links" or "score". */
    readonly unitWord: string;
    /** Whether the raw value is a count, and therefore printed without decimals. */
    readonly integerValued: boolean;
    /** How `fractionField` was normalised -- see {@link NodeMetricNormalisation}. */
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
        valueField: "degree",
        fractionField: "degreePct",
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
        valueField: "rank",
        fractionField: "rankPct",
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
        valueField: "score",
        fractionField: "scorePct",
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
 * Whether a value read back off the element is a number a ranking can hold.
 * @param value - the value at a result path.
 * @returns true when it is a finite number.
 */
function isFiniteNumber(value: unknown): value is number {
    return typeof value === "number" && Number.isFinite(value);
}

/**
 * Compares two PRINTED ids as a stable tie-break, so equal scores come back in the same
 * order on every run and a rerun does not reshuffle the top three under the reader's
 * cursor.
 *
 * The printed form rather than the raw id, and deliberately: `readDegreeResults`
 * (runs.ts:129) breaks its ties exactly this way, and the degree card is built from
 * either source depending on whether the load-time pass still covers the graph. Two
 * orderings for one metric would mean the ranked rows silently reshuffled when the shell
 * changed its mind about which source to read. Numeric ids therefore tie-break as "1",
 * "10", "2", which is arbitrary but identical on both paths.
 * @param a - one printed id.
 * @param b - the other printed id.
 * @returns the usual negative, zero or positive ordering.
 */
function compareIds(a: string, b: string): number {
    if (a === b) {
        return 0;
    }

    return a < b ? -1 : 1;
}

/**
 * Derives the normalised fraction for a reading whose element did not publish one.
 *
 * The two rules are not interchangeable: max-normalisation answers "what share of the
 * top node's score is this", min-max answers "where does this sit between the bottom
 * and the top". A zero denominator yields 0 rather than NaN, exactly as the element's
 * own guarded divisions do (DegreeAlgorithm.ts:91,
 * BetweennessCentralityAlgorithm.ts:77).
 * @param value - the reading's raw value.
 * @param minValue - the lowest value measured.
 * @param maxValue - the highest value measured.
 * @param normalisation - which rule the metric's own field used.
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
 * Turns an already-sorted list of readings into the full ranking.
 *
 * The median is the LOWER median of the ascending values -- the element at index
 * Math.floor((n - 1) / 2) -- rather than the mean of the two middle values on an even
 * count. That choice is deliberate: a degree median is then always an integer the
 * reader can go and find in their own data, where "3.5 links" names a node that does
 * not exist. The three fractions are read off those same three readings rather than
 * recomputed, so a fraction the element published and the value beside it can never
 * disagree.
 * @param metric - which metric these readings belong to.
 * @param byValueDescending - the readings, already sorted highest first.
 * @param nodeCount - every node the graph holds, measured or not.
 * @returns the ranking.
 */
function summariseReadings(
    metric: NodeMetricId,
    byValueDescending: readonly NodeMetricReading[],
    nodeCount: number,
): NodeMetricRanking {
    const rankedCount = byValueDescending.length;
    if (rankedCount === 0) {
        return {
            metric,
            byValueDescending,
            nodeCount,
            rankedCount: 0,
            maxValue: 0,
            minValue: 0,
            medianValue: 0,
            maxFraction: 0,
            minFraction: 0,
            medianFraction: 0,
            tiedAtMinimum: 0,
        };
    }

    const highest = byValueDescending[0];
    const lowest = byValueDescending[rankedCount - 1];
    const median = byValueDescending[rankedCount - 1 - Math.floor((rankedCount - 1) / 2)];

    let tiedAtMinimum = 0;
    for (const reading of byValueDescending) {
        if (reading.value === lowest.value) {
            tiedAtMinimum++;
        }
    }

    return {
        metric,
        byValueDescending,
        nodeCount,
        rankedCount,
        maxValue: highest.value,
        minValue: lowest.value,
        medianValue: median.value,
        maxFraction: highest.fraction,
        minFraction: lowest.fraction,
        medianFraction: median.fraction,
        tiedAtMinimum,
    };
}

/**
 * Reads a metric that has already run, without running one.
 *
 * A node whose VALUE is not a finite number is SKIPPED, never read as 0: the pass
 * either reached it or it did not, and a fabricated zero would sit in the ranking
 * claiming to have been measured -- at the bottom of a betweenness ranking a
 * fabricated zero is indistinguishable from a genuine "on no shortest path", which is
 * a real and interesting finding. `nodeCount` still counts it, so the consumer can say
 * "not measured (N nodes)" instead of quietly shortening the graph.
 *
 * A node whose FRACTION is absent or non-finite keeps its value and has the fraction
 * derived by that metric's own rule, so an older element bundle that publishes the
 * value but not the percentage degrades to a correct ranking rather than to none.
 *
 * Each reading keeps the node's own id AND its printed form. Nothing here stringifies an
 * id on the way out, because the printed form does not address a node: the element's
 * node Map is keyed by the id type the data source produced.
 *
 * PageRank's graph-level `converged` is read but a `true` is DISCARDED, because on the
 * delta path every graph over 100 nodes takes it is a hard-coded constant rather than
 * anything the run measured; only a published `false`, which no delta run can produce,
 * is carried, together with the `iterations` beside it. See the module comment.
 * `graphResults` is read defensively either way: it is optional on the data manager's
 * type and is wiped to undefined on every data clear (DataManager.ts:167, :606), so a
 * read after a clear must yield no convergence claim rather than a stale one.
 * @param graph - the element graph whose nodes carry the results.
 * @param metric - which metric to read.
 * @returns the ranking, highest value first.
 * @public
 */
export function readNodeMetricResults(graph: ElementGraph, metric: NodeMetricId): NodeMetricRanking {
    const definition = NODE_METRIC_DEFINITIONS[metric];
    const raw: {
        id: number | string;
        label: string;
        value: number;
        storedFraction: number | undefined;
    }[] = [];
    let nodeCount = 0;

    for (const node of graph.getNodes()) {
        nodeCount++;

        const value = readResultPath(node.algorithmResults, [
            definition.namespace,
            definition.type,
            definition.valueField,
        ]);
        if (!isFiniteNumber(value)) {
            continue;
        }

        const storedFraction = readResultPath(node.algorithmResults, [
            definition.namespace,
            definition.type,
            definition.fractionField,
        ]);
        raw.push({
            id: node.id,
            label: String(node.id),
            value,
            storedFraction: isFiniteNumber(storedFraction) ? storedFraction : undefined,
        });
    }

    raw.sort((a, b) => (b.value === a.value ? compareIds(a.label, b.label) : b.value - a.value));

    const maxValue = raw.length > 0 ? raw[0].value : 0;
    const minValue = raw.length > 0 ? raw[raw.length - 1].value : 0;
    const byValueDescending: NodeMetricReading[] = raw.map((reading) => ({
        id: reading.id,
        label: reading.label,
        value: reading.value,
        fraction:
            reading.storedFraction ?? deriveFraction(reading.value, minValue, maxValue, definition.normalisation),
    }));

    const ranking = summariseReadings(metric, byValueDescending, nodeCount);
    if (metric !== "pagerank") {
        return ranking;
    }

    const { graphResults } = graph.getDataManager();
    const converged = readResultPath(graphResults, [definition.namespace, definition.type, "converged"]);
    if (typeof converged !== "boolean" || converged) {
        return ranking;
    }

    const iterations = readResultPath(graphResults, [definition.namespace, definition.type, "iterations"]);

    return {
        ...ranking,
        converged: false,
        ...(isFiniteNumber(iterations) ? { iterations } : {}),
    };
}

/**
 * Runs one metric through graphty-element's registry and reads it back.
 *
 * No `algorithmOptions` are passed, and that is a decision rather than an omission.
 * Degree and betweenness declare no options schema at all, so anything handed to them
 * is SILENTLY DISCARDED by `Algorithm.resolveOptions`, which returns `{}` the moment
 * the schema is empty (Algorithm.ts:166-169) -- a parameter passed there would be a
 * claim the element never contradicts, and it would then be printed in a run record
 * that describes a run that did not happen. PageRank at its defaults needs none.
 * @param graph - the element graph to run on.
 * @param metric - which metric to run.
 * @returns the ranking, highest value first.
 * @public
 */
export async function runNodeMetric(graph: ElementGraph, metric: NodeMetricId): Promise<NodeMetricRanking> {
    const definition = NODE_METRIC_DEFINITIONS[metric];
    await graph.runAlgorithm(definition.namespace, definition.type);

    return readNodeMetricResults(graph, metric);
}

/**
 * Builds the degree ranking out of a {@link DegreeResults} the shell is already
 * holding, running nothing.
 *
 * The degree pass ALREADY runs at import, for node size and the top-degree labels
 * (spec 7.2; AppShell's load-defaults effect awaits `runDegreePass` and stores what it
 * returns). Running graphty:degree again for the Most connected card would recompute
 * numbers the shell has in hand, and would do it on a graph that has not changed since
 * the first pass.
 *
 * `nodeCount` IS A REQUIRED ARGUMENT, and that is this function's whole defect history.
 * It used to be the held list's own length, which made `nodeCount === rankedCount` true
 * by construction rather than by measurement, so `notMeasured` was always 0 and the
 * legend could never draw its "Not measured (N nodes)" departure on this path. That was
 * survivable only while the held pass provably covered the drawn graph, and it does not:
 * an ADDITIVE load (a drop on the Data panel while a file is loaded, the Welcome zone,
 * or the Load data dialog with "Replace existing data" unchecked) crosses no dataset
 * boundary, so the load-defaults latch stays set, the degree pass never re-runs, and the
 * held results describe file A alone. The ranking then reported file A's node count as
 * the whole graph, the reading named file A's most connected node ignoring B's edges,
 * and every node of file B sat unstyled under a legend asserting the ramp covered
 * everything. Making the live count an argument means a caller cannot report that
 * coverage without stating what it is measured against -- and a caller that finds the
 * counts disagree should read the element instead, through
 * {@link readNodeMetricResults}, rather than passing the bigger number and describing
 * stale numbers honestly.
 *
 * A count SMALLER than the held list's length cannot describe a live graph -- it would
 * mean the pass measured nodes the graph does not hold -- so it is clamped up rather
 * than propagated: a negative "not measured" is a worse lie than a stale one.
 *
 * `DegreeResults` still declares its ids as strings (runs.ts), so the raw id and the
 * printed label are the same value here and `String()` would be a no-op the linter
 * rightly rejects. When that type widens to the element's own `number | string`, this is
 * the line that will stop compiling, and the fix is to print the label then -- NOT to
 * stringify the id, which is the coercion {@link NodeMetricReading.id} exists to undo.
 * @param degrees - the degree pass the load already ran.
 * @param nodeCount - every node the LIVE graph holds now, measured by that pass or not.
 * @returns the same ranking {@link readNodeMetricResults} would build from those numbers.
 * @public
 */
export function rankingFromDegreeResults(degrees: DegreeResults, nodeCount: number): NodeMetricRanking {
    const byValueDescending: NodeMetricReading[] = degrees.byDegreeDescending.map((reading) => ({
        id: reading.id,
        label: reading.id,
        value: reading.degree,
        fraction: reading.degreePct,
    }));

    return summariseReadings("degree", byValueDescending, Math.max(nodeCount, byValueDescending.length));
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
 * Above this ratio of maximum to median the distribution bins on a log scale
 * (spec 2307, "histogram defaults to log x when max/median exceeds 100").
 */
export const LOG_X_RATIO_THRESHOLD = 100;

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

/** How a banded distribution places a value and words a band. */
interface BandPlan {
    /** How many bands there are. */
    readonly binCount: number;
    /** Which band a value falls in. */
    readonly indexOf: (value: number) => number;
    /** The lowest and highest value a band holds, in value space. */
    readonly rangeOf: (index: number) => readonly [number, number];
    /**
     * Whether these bands really are log-spaced. False for every linear plan, and false
     * when a log plan collapsed to a single band, so the caption can be derived from
     * what was applied rather than from what was asked for.
     */
    readonly logApplied: boolean;
}

/**
 * Lays out equal-width bands over the measured range, linearly.
 *
 * A count metric keeps integer band edges -- the same arithmetic AppShell's degree
 * histogram uses -- so a band reads "2 to 5 links" and the next one starts at 6, with no
 * value named by two bands. A continuous metric gets equal-width bands over the raw
 * range, whose edges are the values themselves.
 * @param minValue - the lowest value measured.
 * @param maxValue - the highest value measured.
 * @param integerValued - whether the metric is a count.
 * @returns the band plan.
 */
function linearBandPlan(minValue: number, maxValue: number, integerValued: boolean): BandPlan {
    if (integerValued) {
        const span = maxValue - minValue + 1;
        const width = Math.ceil(span / Math.min(span, METRIC_DISTRIBUTION_MAX_BINS));
        const binCount = Math.ceil(span / width);

        return {
            binCount,
            logApplied: false,
            indexOf: (value) => Math.min(Math.floor((value - minValue) / width), binCount - 1),
            rangeOf: (index) => {
                const from = minValue + index * width;

                return [from, Math.min(from + width - 1, maxValue)];
            },
        };
    }

    if (!(maxValue > minValue)) {
        return { binCount: 1, logApplied: false, indexOf: () => 0, rangeOf: () => [minValue, maxValue] };
    }

    const binCount = METRIC_DISTRIBUTION_MAX_BINS;
    const width = (maxValue - minValue) / binCount;

    return {
        binCount,
        logApplied: false,
        indexOf: (value) => Math.min(Math.floor((value - minValue) / width), binCount - 1),
        rangeOf: (index) => [
            index === 0 ? minValue : minValue + index * width,
            index === binCount - 1 ? maxValue : minValue + (index + 1) * width,
        ],
    };
}

/**
 * Lays out bands that are equal-width in log10 of the value, with exact zeros in a bin
 * of their own.
 *
 * THE DEFECT THIS REPLACES, because it is the kind that hides in plain sight: the bands
 * used to be equal-width in log10(value + 1). For degree and betweenness, whose values
 * run well past 1, that is a genuine log axis. For PageRank it is not: normalized ranks
 * sum to 1, so the whole domain lies below 1, where log10(v + 1) is very nearly linear
 * in v. Measured over real power-iteration output on hub-and-spoke and taxonomy graphs
 * -- exactly the shapes whose max/median ratio trips the log rule -- the last band came
 * out between 1.009 and 1.336 times the width of the first, against 1690.9 for degree
 * 1..5000 and against the 10^2-10^3 a true log10 gives. 13 to 18 of the 20 bands were
 * empty and 99.3% to 100.0% of the nodes sat in the first bar, under a caption reading
 * "(log scale)". The chart was linear and the caption said otherwise, which is the one
 * thing spec 2307's caption rule exists to prevent.
 *
 * So the transform is log10(value) over the POSITIVE part of the domain. Zeros cannot go
 * on a log axis at all, and folding them into the first band would understate that band
 * the same way the shift did, so they get their own leading bin and the remaining
 * {@link METRIC_DISTRIBUTION_MAX_BINS} - 1 bands cover the positive range. The lowest
 * positive value measured is the left edge, rather than some fabricated floor, so the
 * first band names a value the reader can find in their own data.
 *
 * For a count metric the carried-back edges are pulled to the integers the band can
 * actually hold, so the bands still do not overlap.
 * @param minValue - the lowest value measured, which may be 0 or (corruptly) negative.
 * @param maxValue - the highest value measured.
 * @param smallestPositive - the lowest value above 0, the log axis's left end.
 * @param integerValued - whether the metric is a count.
 * @returns the band plan, which reports whether it really managed a log layout.
 */
function logBandPlan(
    minValue: number,
    maxValue: number,
    smallestPositive: number,
    integerValued: boolean,
): BandPlan {
    const zeroBins = minValue > 0 ? 0 : 1;
    const positiveLow = zeroBins === 0 ? minValue : smallestPositive;
    if (!(maxValue > 0) || !(positiveLow > 0) || !Number.isFinite(positiveLow)) {
        return { binCount: 1, logApplied: false, indexOf: () => 0, rangeOf: () => [minValue, maxValue] };
    }

    const low = Math.log10(positiveLow);
    const high = Math.log10(maxValue);
    if (!(high > low)) {
        const binCount = zeroBins + 1;

        return {
            binCount,
            logApplied: false,
            indexOf: (value) => (value > 0 ? zeroBins : 0),
            rangeOf: (index) => (index < zeroBins ? [minValue, 0] : [positiveLow, maxValue]),
        };
    }

    const bandCount = METRIC_DISTRIBUTION_MAX_BINS - zeroBins;
    const width = (high - low) / bandCount;

    return {
        binCount: METRIC_DISTRIBUTION_MAX_BINS,
        logApplied: true,
        indexOf: (value) => {
            if (!(value > 0)) {
                return 0;
            }

            const band = Math.floor((Math.log10(value) - low) / width);

            return zeroBins + Math.min(Math.max(band, 0), bandCount - 1);
        },
        rangeOf: (index) => {
            if (index < zeroBins) {
                return [minValue, 0];
            }

            const band = index - zeroBins;
            const rawFrom = band === 0 ? positiveLow : 10 ** (low + band * width);
            const rawTo = band === bandCount - 1 ? maxValue : 10 ** (low + (band + 1) * width);
            if (!integerValued) {
                return [rawFrom, rawTo];
            }

            const from = band === 0 ? positiveLow : Math.ceil(rawFrom);

            return [from, band === bandCount - 1 ? maxValue : Math.max(from, Math.ceil(rawTo) - 1)];
        },
    };
}

/**
 * The distribution the result card draws as its one chart row.
 *
 * One bar per distinct value while that fits under {@link METRIC_DISTRIBUTION_MAX_BINS},
 * bands once it does not -- so a graph whose degrees run to the thousands draws twenty
 * bars rather than thousands -- the same shape AppShell's degree histogram already
 * draws, generalised to a metric whose values are not counts.
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
    const definition = NODE_METRIC_DEFINITIONS[ranking.metric];
    const heavyTailed = ranking.medianValue > 0 && ranking.maxValue / ranking.medianValue > LOG_X_RATIO_THRESHOLD;

    /**
     * The caption for a chart laid out the way the flag says.
     * @param logApplied - whether the bins really are log-spaced.
     * @returns the caption, which names a scale only when the bins are on one.
     */
    const captionFor = (logApplied: boolean): string =>
        `${definition.plainName} per node${logApplied ? " (log scale)" : ""}`;

    if (ranking.byValueDescending.length === 0) {
        return { bins: [], axisMin: "0", axisMax: "0", logX: false, caption: captionFor(false) };
    }

    const axisMin = formatMetricValue(ranking.minValue, definition.integerValued);
    const axisMax = formatMetricValue(ranking.maxValue, definition.integerValued);

    const perValue = new Map<number, number>();
    let smallestPositive = Number.POSITIVE_INFINITY;
    for (const reading of ranking.byValueDescending) {
        perValue.set(reading.value, (perValue.get(reading.value) ?? 0) + 1);
        if (reading.value > 0 && reading.value < smallestPositive) {
            smallestPositive = reading.value;
        }
    }

    if (perValue.size <= METRIC_DISTRIBUTION_MAX_BINS) {
        const bins = Array.from(perValue.entries())
            .sort((a, b) => a[0] - b[0])
            .map(([value, count]) => ({ label: binLabel(definition, value, value, count), count }));

        return { bins, axisMin, axisMax, logX: false, caption: captionFor(false) };
    }

    const plan = heavyTailed
        ? logBandPlan(ranking.minValue, ranking.maxValue, smallestPositive, definition.integerValued)
        : linearBandPlan(ranking.minValue, ranking.maxValue, definition.integerValued);
    const counts = new Array<number>(plan.binCount).fill(0);
    for (const reading of ranking.byValueDescending) {
        counts[plan.indexOf(reading.value)] += 1;
    }

    const bins = counts.map((count, index) => {
        const [from, to] = plan.rangeOf(index);

        return { label: binLabel(definition, from, to, count), count };
    });

    return { bins, axisMin, axisMax, logX: plan.logApplied, caption: captionFor(plan.logApplied) };
}
