/**
 * The size-aware cost gate: what the interface is allowed to SAY about what a node-metric
 * run will cost, and what it does about it.
 *
 * Spec 2043-2047 and 1969-1973 set the gate itself. Above the ask limit
 * (Settings > Performance, default 10 s) "Run reads 'Run (about 4 min)' and confirms".
 * Above the warn limit (default 30 min) the card "shows a warning under Run" and "Run
 * reads 'Run anyway (about 3 h)' and confirms once". Below the ask limit nothing is
 * asked and the run happens at once -- a confirm on a run that finishes before the
 * dialog paints is the kind of ceremony that teaches a reader to click through every
 * dialog without reading it.
 *
 * ## The number is the element's; everything else here is this product's
 *
 * `session.estimate({ op: "algo.run", algorithm })` answers what a run would cost,
 * synchronously, because a button has to decide how it behaves before the click happens
 * and a promise cannot gate a click. It is the element's answer and it is better than any
 * this app could compute: it reads the statistics the session already maintains, the cost
 * class and the iteration bound the catalogue declares for that algorithm, the scope the
 * run would actually cover, whatever the machine has been calibrated at, and the TIMING
 * OF THE LAST REAL RUN of the same algorithm on this machine. The last of those is the
 * one an app can never have -- it sees a number and cannot check it, while the element
 * sees what the run took and uses it next time.
 *
 * WHAT LEFT THIS MODULE. Until this rewrite it carried a per-metric timing model of the
 * element's internals: a linear throughput, a separate per-iteration throughput, a
 * betweenness pairs-per-second figure, and a copy of the element's own `maxIterations`
 * default standing in for PageRank's iteration count. The copy is the tell. The bound is
 * declared once, in the schema the algorithm validates against, and holding a second copy
 * of it here meant the gate was defensible only until the element changed its default.
 *
 * It also meant the gate was wrong, in the one direction it cannot afford. The model
 * charged PageRank at the DEGREE pass's rate, and the two are not the same work: measured
 * against the path the element actually takes, it was optimistic by 3.5x at 20,000 nodes
 * and 6.9x at 200,000. What that gave a reader was a sparse graph of about 70,000 nodes
 * estimated at 2.10 s, so Run read a bare "Run" with no estimate and no confirm, and the
 * frame then locked for 10.4 s with no progress, no cancel and no repaint. The element
 * now holds that model, the measurements that produced it are in its own rate table, and
 * the fix reaches every consumer rather than this one.
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
 * That rule now has something real to hold back. The element's estimate carries its
 * `costClass` as a field and a `basis` line that spells out the work term it used, and
 * both are engineering reference in exactly the sense the spec means. No string this
 * module produces may contain one of those six words, and a test asserts it over every
 * metric, against estimates whose own class and basis carry them.
 *
 * ## The honesty rule that shapes the warn sentence
 *
 * Spec 1969-1973 writes the warning as "About 3 h at this size. Filter to a part, or
 * run the sampled version". The second half of that sentence is not shippable here.
 * There is no sampled version a reader can reach: the element's command carries a
 * `sample` field, but nothing in this shell draws a control that sets it, so offering one
 * would send a reader looking for something that is not on the screen. Spec 2055-2058
 * says precisely this -- "Sampled betweenness and the Louvain seed are new work (5.8) ...
 * until they ship the size-aware default for Bridges is the estimate-and-confirm path and
 * the 'Approximate (sample of N)' caveat does not appear."
 *
 * This module therefore says "Filter to a part, and run it there." and never offers a
 * sampled version. Offering one would be worse than saying nothing: the search for the
 * missing control would end in the reader deciding the app lied. When a sample control
 * ships, the sentence gains its second clause back, here, once.
 *
 * ## What the reader is told when the element cannot answer
 *
 * The element reports an unavailability rather than throwing: `available: false`, a
 * `reason` written as a sentence a person can read, and an infinite estimate. There are
 * three ways to get one -- an algorithm key nothing is registered under, a requirement
 * the graph does not meet ("Needs a directed graph; this graph is undirected."), and a
 * scope that cannot be narrowed -- and the honest thing to do with all three is the same:
 * do not run, do not state a duration, and print the element's own sentence rather than
 * one invented here. An infinite estimate also means every gate written as "under 60 s"
 * refuses the card, which is why it is carried through as infinity rather than flattened
 * to a number.
 *
 * Keeping the seconds and the words together is the point of the module: the card, the
 * confirm dialog and the palette row all read one object, so they cannot drift apart, and
 * one table-driven test holds all of them to spec 1918-1927.
 */

import type { MetricAvailability } from "@graphty/graphty-element/catalog";
import type { CostEstimate, GraphSession } from "@graphty/graphty-element/session";

import { formatCount } from "../readings/readingFormat";
import { NODE_METRIC_IDS, type NodeMetricId } from "./nodeMetrics";

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
 * What the card says when the element refused to estimate and gave no sentence of its own.
 *
 * The element always writes one, so this is the seatbelt rather than the path: an empty
 * warning under Run would be a blank line where a reason belongs.
 */
const UNSTATED_REASON = "This cannot run on this graph.";

/**
 * The four things the gate can decide.
 *
 * "run" happens at once, "ask" states its estimate and confirms, "warn" also draws a
 * warning under Run (spec 2043-2047, 1969-1973), and "unavailable" draws the element's
 * reason under Run and starts nothing.
 * @public
 */
export type MetricCostVerdict = "ask" | "run" | "unavailable" | "warn";

/**
 * A verdict and every string the interface needs to act on it. The strings are built
 * here rather than at the call sites so that the card, the dialog and the palette row
 * cannot drift apart, and so that one test can assert spec 1918-1927 over all of them.
 * @public
 */
export interface MetricCostEstimate {
    /** The metric this estimate is for. */
    readonly metric: NodeMetricId;
    /**
     * The estimate in seconds, as the element gave it.
     *
     * Infinite when the element could not bound the work or refused the run, which is the
     * answer every "under N seconds" gate downstream needs: infinity compares correctly
     * against a threshold, where a stand-in number would be waved through.
     */
    readonly seconds: number;
    /** What the caller should do. */
    readonly verdict: MetricCostVerdict;
    /** The Run control's full label. Never abbreviated and never a glyph. */
    readonly runLabel: string;
    /** The Run control's title attribute; the same text, so the tooltip cannot disagree. */
    readonly runTitle: string;
    /** The confirm dialog's sentence. Absent when nothing is asked, and when nothing can run. */
    readonly confirmSentence?: string;
    /** The sentence drawn under Run. Absent below the warn limit. */
    readonly warningSentence?: string;
}

/**
 * A duration as the interface says it.
 *
 * The shapes are the spec's own: "about 4 min" (spec 2043-2047) and "about 3 h"
 * (spec 1969-1973). "about" is load-bearing -- the number is an estimate and the phrasing
 * must not read as a measurement. Below a second there is no number worth printing at
 * all, which is why that case gets words instead.
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
 * The card's whole account of a run the element will not start.
 *
 * Run keeps its plain full text rather than gaining a duration it has not got, the
 * element's own sentence is drawn under it, and there is no confirm sentence because
 * there is nothing to confirm.
 * @param metric - the metric that cannot run.
 * @param cost - the element's estimate, which carries the reason.
 * @returns the estimate the surfaces draw.
 */
function unavailableCost(metric: NodeMetricId, cost: CostEstimate): MetricCostEstimate {
    return {
        metric,
        seconds: cost.seconds,
        verdict: "unavailable",
        runLabel: "Run",
        runTitle: "Run",
        warningSentence: cost.reason ?? UNSTATED_REASON,
    };
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
 * An estimate with no number in it takes the cautious branch rather than the cheap one.
 * A run the element refuses is "unavailable"; a run it allows but cannot bound is warned
 * about in words, because a gate that has no number must not be the reason a frame locks.
 *
 * Run keeps its full text in every form. It is floor item 4 (spec 4954-4956,
 * 1899-1903: "second-visit verbs hide until the row is hovered -- except Run in every
 * form and Cancel, which are floor item 4 and keep their full text always"), so the
 * label is never abbreviated and never reduced to a glyph, not even at "Run anyway
 * (about 3 h)" where it is long.
 *
 * No string returned from here contains a cost class name (spec 1918-1927), and the
 * warning never offers a sampled version, because there is not one (spec 2055-2058).
 * @param metric - which metric the estimate is about.
 * @param cost - what the element said the run would cost.
 * @returns the estimate, the verdict and every string the surfaces need.
 * @public
 */
export function metricCostFromEstimate(metric: NodeMetricId, cost: CostEstimate): MetricCostEstimate {
    if (!cost.available) {
        return unavailableCost(metric, cost);
    }

    const { seconds } = cost;

    if (!Number.isFinite(seconds)) {
        const warningSentence = "How long this will take at this size is not known. Filter to a part, and run it there.";

        return {
            metric,
            seconds,
            verdict: "warn",
            runLabel: "Run anyway",
            runTitle: "Run anyway",
            confirmSentence: warningSentence,
            warningSentence,
        };
    }

    const duration = formatEstimateDuration(seconds);

    if (seconds > WARN_LIMIT_SECONDS) {
        const warningSentence = `${capitaliseDuration(duration)} at this size. Filter to a part, and run it there.`;
        const runLabel = `Run anyway (${duration})`;

        return {
            metric,
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
            metric,
            seconds,
            verdict: "ask",
            runLabel,
            runTitle: runLabel,
            confirmSentence: `This will take ${duration} at this size.`,
        };
    }

    return {
        metric,
        seconds,
        verdict: "run",
        runLabel: "Run",
        runTitle: "Run",
    };
}

/**
 * What the element says one metric would cost on the graph it is holding now.
 *
 * The command names the metric id as its algorithm, which is the same key
 * `nodeMetrics.runNodeMetric` starts the run under: the estimate and the run must be
 * about the same work or the gate is in front of something else. It names no scope, so
 * the element estimates over the scope a run would actually cover -- the visible graph,
 * which is what the filters and the time window have left showing.
 *
 * With no session there is no element and so no run to gate: the card draws a plain "Run"
 * exactly as it does for a graph of no size, and the click is refused further down by the
 * one place that can tell a missing element from a refused run. Drawing an unavailability
 * here instead would put a sentence under Run that the reader can do nothing about, for
 * the frames between mount and the element coming up.
 * @param session - the element's session, or null while the element is still coming up.
 * @param metric - which metric would run.
 * @returns the verdict and every string the surfaces need.
 * @public
 */
export function metricCost(session: GraphSession | null, metric: NodeMetricId): MetricCostEstimate {
    if (session === null) {
        return UNGATED(metric);
    }

    try {
        return metricCostFromEstimate(metric, session.estimate({ op: "algo.run", algorithm: metric }));
    } catch (error: unknown) {
        /* A session refuses every verb once it is disposed, and the estimate reaches the graph
           statistics to do its work -- so a data event that arrives after teardown throws here.
           It must not take the handler down with it, and it must not be swallowed either: the
           same lifecycle case `readGraphStatistics` absorbs, reported the same way, answered with
           the same "there is nothing to gate" value. */
        console.error("[shell] the element could not estimate", metric, error);

        return UNGATED(metric);
    }
}

/**
 * What the gate answers when there is nothing to gate.
 *
 * Zero seconds and a plain Run, which is what the interface shows before a graph is loaded and
 * what it must fall back to when the element cannot be asked. Declared once so the two callers
 * that need it cannot drift into two different accounts of "we do not know".
 * @param metric - The metric being gated.
 * @returns The ungated estimate.
 */
function UNGATED(metric: NodeMetricId): MetricCostEstimate {
    return { metric, seconds: 0, verdict: "run", runLabel: "Run", runTitle: "Run" };
}

/**
 * Every metric's gate for the graph as it stands, in one frozen record.
 *
 * Two surfaces read it and they must agree: the Suggested Run's own label and tooltip,
 * and the Insights strip's 60 s ceiling, which is inert without an estimate -- an
 * unestimated betweenness card is offered whatever the graph's size, so a graph big
 * enough to cost hours would still be suggested as a one-click card. Frozen because it is
 * derived data that several surfaces read and none may edit.
 * @param session - the element's session, or null while the element is still coming up.
 * @returns one estimate per metric, agreeing with {@link metricCost} called individually.
 * @public
 */
export function metricCosts(session: GraphSession | null): Readonly<Record<NodeMetricId, MetricCostEstimate>> {
    const costs = {} as Record<NodeMetricId, MetricCostEstimate>;

    for (const metric of NODE_METRIC_IDS) {
        costs[metric] = metricCost(session, metric);
    }

    return Object.freeze(costs);
}

/**
 * What the element says this graph can support, one entry per algorithm it ships.
 *
 * The same three facts {@link metricCost} reads for one metric -- can it run here, why not when
 * it cannot, what would it cost -- for EVERY algorithm, which is what a surface choosing between
 * them needs. The Insights strip is the caller: its rule table names five capabilities that run
 * an algorithm, and until this listing existed it offered them without asking whether the element
 * would run them, and applied its 60 s ceiling to the three metrics this shell happened to
 * estimate.
 *
 * It is the element's own assembly (`session.catalog.metrics()`), over the scope a run would
 * actually cover, quoting the same cost model the Run button asks -- so a card and the button it
 * leads to cannot state different numbers.
 *
 * With no session there is nothing to ask and the answer is an empty listing, which every caller
 * already has to handle: it is what the shell holds between mount and the element coming up.
 * @param session - the element's session, or null while the element is still coming up.
 * @returns one entry per algorithm, or an empty listing when there is no element to ask.
 * @public
 */
export function readMetricAvailability(session: GraphSession | null): readonly MetricAvailability[] {
    if (session === null) {
        return [];
    }

    try {
        return session.catalog.metrics();
    } catch (error: unknown) {
        /* The same lifecycle case `metricCost` and `readGraphStatistics` absorb: a session
           refuses every verb once it is disposed, and a data event that arrives after teardown
           must not take the handler down with it. Reported rather than swallowed, and answered
           with the same "there is nothing to ask" value. */
        console.error("[shell] the element could not list what this graph supports", error);

        return [];
    }
}
