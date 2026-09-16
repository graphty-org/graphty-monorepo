/**
 * The size-aware cost gate: what a node-metric run will cost, in units of time, and
 * what the interface is allowed to say about it.
 *
 * Spec 2043-2047 and 1969-1973 set the gate itself. Above the ask limit
 * (Settings > Performance, default 10 s) "Run reads 'Run (about 4 min)' and confirms".
 * Above the warn limit (default 30 min) the card "shows a warning under Run" and "Run
 * reads 'Run anyway (about 3 h)' and confirms once". Below the ask limit nothing is
 * asked and the run happens at once -- a confirm on a run that finishes before the
 * dialog paints is the kind of ceremony that teaches a reader to click through every
 * dialog without reading it.
 *
 * ## The rule that makes this module's copy correct
 *
 * Spec 1918-1927: "Cost classes are an internal cost model ... No class name ever
 * appears in the interface: not on a group header, not on a card, not in a tooltip,
 * not in the palette, not in a caveats line." The six class names -- instant,
 * iterative, heavy, sampled, cubic, unbounded -- are engineering reference and nothing
 * more. The spec's own reasoning is that a class is a range in any case, so "3 cards,
 * instant to cubic" says nothing, and every heavy card finishes instantly at twenty
 * nodes. "What the user sees of cost is an estimate in units of time, and a warning
 * when it is large."
 *
 * So: no string this module produces may contain one of those six words, and a test
 * asserts exactly that over every metric at every size. The strings here ARE the
 * interface's whole account of cost, which is why they live in one tested module
 * rather than being formatted at three call sites.
 *
 * ## The honesty rule that shapes the warn sentence
 *
 * Spec 1969-1973 writes the warning as "About 3 h at this size. Filter to a part, or
 * run the sampled version". The second half of that sentence is not shippable here.
 * There is no sampled version: the algorithms package exposes no k-source parameter
 * and `BetweennessCentralityAlgorithm` passes no options at all, so a sampled path
 * would be a route the reader could not take. Spec 2055-2058 says precisely this --
 * "Sampled betweenness and the Louvain seed are new work (5.8) ... until they ship the
 * size-aware default for Bridges is the estimate-and-confirm path and the 'Approximate
 * (sample of N)' caveat does not appear."
 *
 * This module therefore says "Filter to a part, and run it there." and never offers a
 * sampled version. Offering one would be worse than saying nothing: it would send a
 * reader looking for a control that is not drawn, and the search would end in the
 * reader deciding the app lied. When sampling ships, the sentence gains its second
 * clause back, here, once.
 *
 * ## The throughput constants are FALLBACKS, not measurements
 *
 * Spec 3292-3308 describes its own size thresholds the same way -- "measured on this
 * machine; 10,000 nodes or 50,000 edges, whichever is crossed first, as the fallback".
 * Nothing in this build probes the machine, so every number below is the fallback
 * limb of that rule and is expected to be replaced by a calibrated one (spec 2043:
 * "calibrated once per device by a short probe run and stored"). Each is shaped by the
 * complexity of the algorithm it stands for, not by a guess at a wall clock:
 *
 * - Degree is O(n + m) over elements already in memory, so its cost is one linear pass
 *   and {@link LINEAR_ELEMENTS_PER_SECOND} is the elements-per-second that pass moves
 *   at. At every size this slice ships it lands under the ask limit, which is the
 *   correct outcome: the shell reads the degree numbers the import-time pass already
 *   wrote and does not re-run anything.
 * - PageRank is O(k(n + m)) and k is the thing nobody can know in advance. The only k
 *   the app actually holds is the element's own `maxIterations` default of 100, so
 *   {@link PAGERANK_ITERATION_BOUND} is that bound and the estimate is the worst case
 *   the app can defend rather than a convergence count it would be inventing. An
 *   estimate that guessed "it usually converges in 20" and then took five times as
 *   long is the failure this bound prevents. What one iteration costs per element is
 *   {@link PAGERANK_ELEMENTS_PER_SECOND}, which is its OWN constant and not the degree
 *   pass's: two different pieces of work, two different rates. Reusing one for both was
 *   the defect recorded below.
 * - Betweenness is exact Brandes from every source, O(n * m), and it is synchronous
 *   inside an async function with no yields
 *   (algorithms/src/algorithms/centrality/betweenness.ts:216-220: a bare `for (const
 *   source of nodes)` loop around `brandesSingleSource`). The run blocks the frame for
 *   its whole duration -- there is no progress, no cancel and no repaint until it
 *   returns -- so this gate is the only thing standing between a reader and a locked
 *   tab. {@link BETWEENNESS_PAIRS_PER_SECOND} is the source-edge pairs per second that
 *   loop retires.
 *
 * One more fact about betweenness belongs in the record, though not in a caveats line:
 * the element runs it through `toAlgorithmGraph` with no options, which yields
 * `directed: true` plus reverse edges (graphConverter.ts:43). The run is therefore over
 * a graph with twice the edges of the one the reader imported, and the estimate above
 * is computed from the reader's own edge count. That makes this module's betweenness
 * number optimistic by a constant factor, which is one more reason it is a fallback.
 *
 * ## What the PageRank row got wrong, and why its rate is now its own constant
 *
 * Until 2026-09-14 the pagerank row divided by {@link LINEAR_ELEMENTS_PER_SECOND} -- the
 * constant defined one bullet above as the rate of the DEGREE pass over elements already
 * in memory. PageRank's per-iteration work is not that pass and never was. The element
 * always takes the delta path: `PageRankAlgorithm` defaults `useDelta` to true and
 * `centrality/pagerank.ts` sends every graph over 100 nodes to `SimpleDeltaPageRank`,
 * which per iteration makes four or five full passes over the score map, allocates a
 * fresh Set, and calls `Array.from` once per changed node. Measured against that exact
 * path -- 100 iterations, damping .85, tolerance 1e-6, and a sparse m = 5n so the
 * iteration bound is genuinely exhausted rather than cut short by early convergence --
 * it retires 5.6M elements/s at n = 20,000, falling to 2.9M/s at n = 200,000. Not 20M/s.
 *
 * So the estimate was optimistic by 3.5x at n = 20,000, 4.6x at 50,000, 5.6x at 100,000
 * and 6.9x at 200,000, in the one direction this module cannot afford. What that gave a
 * reader: a sparse graph of about 70,000 nodes estimated 2.10 s, so Run read a bare
 * "Run" with no estimate and no confirm, and the frame then locked for 10.4 s; at
 * 100,000 nodes and 500,000 edges the estimate was 3.00 s against a real 16.9 s; at
 * 200,000 and 1M it was 6.00 s against 41.5 s. Nothing upstream catches that -- the
 * Suggested list is a frozen four-row list with no size filter -- so this row IS the
 * gate. Note too that the bias GREW with size, which is what makes it a mis-fit rather
 * than a stale number: the per-device probe of spec 2043 rescales a rate, and would not
 * have flattened a curve.
 *
 * {@link PAGERANK_ELEMENTS_PER_SECOND} replaces it, pinned deliberately to the FLOOR of
 * that measured band -- 3,000,000/s, the slowest size measured -- rather than its mean.
 * A flat rate at the floor leaves the model cautious across everything that was
 * measured: 1.9x pessimistic at n = 20,000, 1.2x at 100,000, and 0.96x at 200,000, where
 * rounding the measured 2.9M/s up to a round 3M leaves a few percent of optimism at the
 * very bottom of the band (both the model and the stopwatch say "ask" there, so no
 * verdict turns on it). Every verdict the row now returns at a measured size is either
 * the true one or one step more cautious than the truth, which is the only direction a
 * fallback is allowed to be wrong in.
 *
 * The alternative was to fit the super-linear term those per-iteration allocations
 * imply, and the measurements do support one -- time grows about n^1.3 across the range.
 * It was rejected on purpose: five points from one machine cannot tell an allocator's
 * behaviour from a complexity term, a fitted curve is far harder for the device probe to
 * replace than a single rate, and the two ways of being wrong do not cost the same --
 * too cautious costs one confirm dialog, too optimistic costs a locked tab with no
 * progress, no cancel and no repaint. If the band is ever extended past 200,000 nodes
 * and the floor drops again, lower this constant; do not add an exponent to hide it.
 *
 * The betweenness row was measured at the same time and is NOT part of this: at
 * n = 500/1,000/2,000/4,000 it came out 0.6-1.1x, already at or on the cautious side of
 * the truth. Leave it as it is.
 *
 * Pure: no React, no element, no clock. It imports a type and one formatter and that is
 * all, so a gate can be tested at a million nodes without a browser.
 */

import { formatCount } from "../readings/readingFormat";
import { type NodeMetricId } from "./nodeMetrics";

/**
 * Settings > Performance, "Ask before runs estimated over", default 10 s (spec 3292-3308).
 * At or above it Run states its estimate and confirms; below it the run happens at once.
 * @public
 */
export const ASK_LIMIT_SECONDS = 10;

/**
 * Settings > Performance, "Warn on exact runs estimated over", default 30 min
 * (spec 3292-3308). Above it the card warns under Run and Run reads "Run anyway".
 * @public
 */
export const WARN_LIMIT_SECONDS = 1800;

/**
 * Fallback throughput for the linear metrics: graph elements (nodes plus edges) a
 * single O(n + m) pass retires per second. Not a measurement -- see the module doc.
 * @public
 */
export const LINEAR_ELEMENTS_PER_SECOND = 20000000;

/**
 * The iteration count PageRank is estimated at: the element's own `maxIterations`
 * default. The bound the app can defend, not a convergence count it would be guessing
 * at -- see the module doc.
 * @public
 */
export const PAGERANK_ITERATION_BOUND = 100;

/**
 * Fallback throughput for one PageRank iteration: graph elements (nodes plus edges) a
 * single iteration of the element's delta path retires per second. Its own constant
 * rather than {@link LINEAR_ELEMENTS_PER_SECOND}, because it is its own work -- sharing
 * that one made this gate optimistic by up to 6.9x. Pinned to the floor of the measured
 * band and not its mean, so the model errs toward asking. Not a measurement this build
 * takes -- see the module doc.
 * @public
 */
export const PAGERANK_ELEMENTS_PER_SECOND = 3000000;

/**
 * Fallback throughput for exact Brandes: source-edge pairs retired per second. Not a
 * measurement -- see the module doc.
 * @public
 */
export const BETWEENNESS_PAIRS_PER_SECOND = 5000000;

/**
 * Below a second, a duration is not a number the reader needs.
 */
const ONE_SECOND = 1;

/**
 * Where "about N s" hands over to "about N min". 90 rather than 60 so that "about 75 s"
 * is said as seconds rather than rounded to "about 1 min", which would be a coarser
 * claim than the estimate supports.
 */
const SECONDS_CEILING = 90;

/** Seconds in a minute. */
const SECONDS_PER_MINUTE = 60;

/** Minutes in an hour. */
const MINUTES_PER_HOUR = 60;

/** Seconds in an hour. */
const SECONDS_PER_HOUR = SECONDS_PER_MINUTE * MINUTES_PER_HOUR;

/**
 * Where "about N min" hands over to "about N h", for the same reason
 * {@link SECONDS_CEILING} sits at 90.
 */
const MINUTES_CEILING = 90;

/**
 * What the gate is asked about: one metric and the size of the graph it would run over.
 * @public
 */
export interface MetricCostInput {
    /** Which metric would run. */
    readonly metric: NodeMetricId;
    /** How many nodes the run would cover. */
    readonly nodeCount: number;
    /** How many edges the run would cover, as the reader imported them. */
    readonly edgeCount: number;
}

/**
 * The three things the gate can decide. "run" happens at once, "ask" states its
 * estimate and confirms, "warn" also draws a warning under Run (spec 2043-2047,
 * 1969-1973).
 * @public
 */
export type MetricCostVerdict = "ask" | "run" | "warn";

/**
 * A verdict and every string the interface needs to act on it. The strings are built
 * here rather than at the call sites so that the card, the dialog and the palette row
 * cannot drift apart, and so that one test can assert spec 1918-1927 over all of them.
 * @public
 */
export interface MetricCostEstimate {
    /** The metric this estimate is for. */
    readonly metric: NodeMetricId;
    /** The estimate in seconds. Always finite and never negative. */
    readonly seconds: number;
    /** What the caller should do. */
    readonly verdict: MetricCostVerdict;
    /** The Run control's full label. Never abbreviated and never a glyph. */
    readonly runLabel: string;
    /** The Run control's title attribute; the same text, so the tooltip cannot disagree. */
    readonly runTitle: string;
    /** The confirm dialog's sentence. Absent when nothing is asked. */
    readonly confirmSentence?: string;
    /** The sentence drawn under Run. Absent below the warn limit. */
    readonly warningSentence?: string;
}

/**
 * Guards a size so the arithmetic below cannot produce a number the gate is unable to
 * compare against its own limits. A gate that cannot compare its own number is no gate:
 * `NaN < ASK_LIMIT_SECONDS` is false and `NaN > WARN_LIMIT_SECONDS` is false too, so an
 * unguarded NaN would silently fall through to "ask" and state an estimate of "about
 * NaN min".
 * @param value - a node or edge count from a caller that may not have one yet.
 * @returns the value when it is a finite non-negative number, and 0 otherwise.
 */
function safeCount(value: number): number {
    if (!Number.isFinite(value) || value <= 0) {
        return 0;
    }

    return value;
}

/**
 * The per-metric cost model. A lookup rather than a switch so that a metric cannot be
 * added to {@link NodeMetricId} without a cost for it, and so that
 * {@link estimateSecondsByMetric} can walk every metric without a second list.
 */
const SECONDS_BY_METRIC: Readonly<Record<NodeMetricId, (nodeCount: number, edgeCount: number) => number>> = {
    betweenness: (nodeCount, edgeCount) => (nodeCount * edgeCount) / BETWEENNESS_PAIRS_PER_SECOND,
    degree: (nodeCount, edgeCount) => (nodeCount + edgeCount) / LINEAR_ELEMENTS_PER_SECOND,
    pagerank: (nodeCount, edgeCount) =>
        (PAGERANK_ITERATION_BOUND * (nodeCount + edgeCount)) / PAGERANK_ELEMENTS_PER_SECOND,
};

/**
 * How long a metric would take on a graph this size, in seconds.
 *
 * Degree is one linear pass, PageRank is that many elements times the iteration bound
 * at its own slower per-iteration rate, and betweenness is the product of nodes and
 * edges -- the three shapes the module doc explains. Non-finite and negative sizes are read as 0 rather than propagated, so the
 * return value is always a number the caller can compare.
 * @param input - the metric and the graph's size.
 * @returns the estimate in seconds. Finite, never negative, never NaN.
 * @public
 */
export function estimateMetricSeconds(input: MetricCostInput): number {
    const nodeCount = safeCount(input.nodeCount);
    const edgeCount = safeCount(input.edgeCount);
    const seconds = SECONDS_BY_METRIC[input.metric](nodeCount, edgeCount);

    if (!Number.isFinite(seconds) || seconds <= 0) {
        return 0;
    }

    return seconds;
}

/**
 * Every metric's estimate for one graph, in one frozen record.
 *
 * This is the shape the Insights strip's own gate takes: `insightsRules` reads
 * `estimateSeconds[capability]` against `INSIGHTS_ESTIMATE_CEILING_SECONDS` (60 s) to
 * decide whether a card may be offered at all, and it wants every estimate at once
 * rather than three calls it would have to keep in step. Frozen because it is derived
 * data that several surfaces read and none may edit.
 * @param input - the graph's size.
 * @param input.nodeCount - how many nodes a run would cover.
 * @param input.edgeCount - how many edges a run would cover.
 * @returns a frozen record of seconds per metric, agreeing with
 * {@link estimateMetricSeconds} called individually.
 * @public
 */
export function estimateSecondsByMetric(input: {
    readonly nodeCount: number;
    readonly edgeCount: number;
}): Readonly<Record<NodeMetricId, number>> {
    const seconds = {} as Record<NodeMetricId, number>;

    for (const metric of Object.keys(SECONDS_BY_METRIC) as NodeMetricId[]) {
        seconds[metric] = estimateMetricSeconds({
            metric,
            nodeCount: input.nodeCount,
            edgeCount: input.edgeCount,
        });
    }

    return Object.freeze(seconds);
}

/**
 * A duration as the interface says it.
 *
 * The shapes are the spec's own: "about 4 min" (spec 2043-2047) and "about 3 h"
 * (spec 1969-1973). "about" is load-bearing -- the number is a fallback estimate and
 * the phrasing must not read as a measurement. Below a second there is no number worth
 * printing at all, which is why that case gets words instead.
 *
 * Every figure goes through {@link formatCount}, so an estimate of four thousand hours
 * reads "about 4,000 h" rather than "about 4000 h"; grouping only ever engages in the
 * hours branch, since the other two hand over below 90.
 * @param seconds - the estimate. Non-finite and negative values read "under a second".
 * @returns "under a second", "about N s", "about N min" or "about N h".
 * @public
 */
export function formatEstimateDuration(seconds: number): string {
    if (!Number.isFinite(seconds) || seconds < ONE_SECOND) {
        return "under a second";
    }

    if (seconds < SECONDS_CEILING) {
        return `about ${formatCount(seconds)} s`;
    }

    const minutes = seconds / SECONDS_PER_MINUTE;
    if (minutes < MINUTES_CEILING) {
        return `about ${formatCount(minutes)} min`;
    }

    return `about ${formatCount(seconds / SECONDS_PER_HOUR)} h`;
}

/**
 * The same duration at the head of a sentence.
 * @param duration - the output of {@link formatEstimateDuration}.
 * @returns it with its first letter capitalised, e.g. "About 3 h".
 */
function capitaliseDuration(duration: string): string {
    if (duration.length === 0) {
        return duration;
    }

    return `${duration.charAt(0).toUpperCase()}${duration.slice(1)}`;
}

/**
 * The whole gate: what a run would cost and what the interface may say about it.
 *
 * Below {@link ASK_LIMIT_SECONDS} the verdict is "run" and Run reads "Run" with no
 * sentence attached -- there is nothing to warn about and a confirm would be ceremony.
 * From there to {@link WARN_LIMIT_SECONDS} the verdict is "ask": Run carries its
 * estimate and a confirm sentence states it again, because the reader is about to spend
 * minutes and should be told before rather than after. Above the warn limit the verdict
 * is "warn": the card draws a sentence under Run, Run reads "Run anyway", and the
 * confirm sentence is THE SAME sentence, so the card and the dialog say one thing
 * rather than two things the reader has to reconcile.
 *
 * Run keeps its full text in every form. It is floor item 4 (spec 4954-4956,
 * 1899-1903: "second-visit verbs hide until the row is hovered -- except Run in every
 * form and Cancel, which are floor item 4 and keep their full text always"), so the
 * label is never abbreviated and never reduced to a glyph, not even at "Run anyway
 * (about 3 h)" where it is long.
 *
 * No string returned from here contains a cost class name (spec 1918-1927), and the
 * warning never offers a sampled version, because there is not one (spec 2055-2058).
 * @param input - the metric and the graph's size.
 * @returns the estimate, the verdict and every string the surfaces need.
 * @public
 */
export function estimateMetricCost(input: MetricCostInput): MetricCostEstimate {
    const seconds = estimateMetricSeconds(input);
    const duration = formatEstimateDuration(seconds);

    if (seconds > WARN_LIMIT_SECONDS) {
        const warningSentence = `${capitaliseDuration(duration)} at this size. Filter to a part, and run it there.`;
        const runLabel = `Run anyway (${duration})`;

        return {
            metric: input.metric,
            seconds,
            verdict: "warn",
            runLabel,
            runTitle: runLabel,
            confirmSentence: warningSentence,
            warningSentence,
        };
    }

    if (seconds >= ASK_LIMIT_SECONDS) {
        const runLabel = `Run (${duration})`;

        return {
            metric: input.metric,
            seconds,
            verdict: "ask",
            runLabel,
            runTitle: runLabel,
            confirmSentence: `This will take ${duration} at this size.`,
        };
    }

    return {
        metric: input.metric,
        seconds,
        verdict: "run",
        runLabel: "Run",
        runTitle: "Run",
    };
}
