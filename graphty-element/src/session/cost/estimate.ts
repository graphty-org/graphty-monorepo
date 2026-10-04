/**
 * @file What a run would cost, answered synchronously, and the gate that decides what happens
 * when the answer is too big.
 *
 * A user interface has to decide how a button behaves BEFORE the click happens: whether it runs
 * at once, states its estimate, asks for confirmation, or refuses in place with "about 40 s --
 * run this at the desk". A promise cannot gate a click, so the estimate here is synchronous and
 * O(1) in the size of the graph. It reads the statistics the session already maintains and the
 * cost class the catalogue already declares, and it multiplies two numbers.
 *
 * Why this lives in the element rather than in the consumer, in one piece of evidence: the one
 * consumer carries 449 lines modelling the element's own performance
 * (`graphty/src/components/shell/analysis/metricCost.ts`), holding an iteration bound that is a
 * copy of a default declared in this package's own schema. Its own history records the model
 * being wrong by 6.9x at 200,000 nodes -- a 70,000-node graph was estimated at 2.10 seconds, so
 * the button showed no confirmation, and the frame then locked for 10.4 seconds. No consumer
 * should be able to compute a better estimate than the element can, because only the element
 * knows what it is about to do.
 *
 * The rule the whole module is built to keep: an estimate that is confidently wrong is worse
 * than one that reports low confidence. Every path that cannot support a number degrades
 * {@link CostEstimate.confidence} and says why in {@link CostEstimate.basis}, and the model errs
 * toward the cautious side of every band it was fitted against, because the two ways of being
 * wrong do not cost the same: too cautious costs one confirmation dialog, too optimistic costs a
 * locked tab with no progress, no cancel and no repaint.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM: an estimate is arithmetic over plain data,
 * published from the Node-safe `./session` entry point.
 */

import { registeredAlgorithmByKey } from "../../catalog/registry";
import {
    type AlgorithmDescriptor,
    type AlgorithmKey,
    type CostClass,
    isDeprecatedAlgorithm,
    type Scope,
} from "../../catalog/types";
import { GraphtyError } from "../../errors/GraphtyError";
import type { GraphStatistics } from "../types";

// ---------------------------------------------------------------------------------------------
// The answer
// ---------------------------------------------------------------------------------------------

/**
 * How much the number in an estimate is worth.
 *
 * The four values are a ladder, not a mood. "measured" means this machine has run this algorithm
 * and the estimate was scaled from that run. "calibrated" means this machine's throughput was
 * probed but this algorithm has never run on it. "modelled" means neither, so built-in rates
 * apply. "unknown" means the inputs do not support a number at all, and the estimate says so
 * rather than inventing one.
 */
export type CostConfidence = "measured" | "calibrated" | "modelled" | "unknown";

/**
 * What a run would cost, and how much the answer is worth.
 *
 * Every field is something a consumer would otherwise guess at. `seconds` gates the button,
 * `confidence` decides whether the sentence beside it reads "about" or "at least",
 * `blocksFrame` decides whether a spinner is honest, `cancellable` decides whether a Cancel
 * button appears at all, `available` and `reason` decide whether the control is offered, and
 * `basis` is the sentence a person reads when they want to know where the number came from.
 */
export interface CostEstimate {
    /**
     * How long the run would take, in seconds.
     *
     * `Number.POSITIVE_INFINITY` when the work cannot be bounded in advance -- an unbounded cost
     * class, or a graph whose size is not a usable number. Infinity compares correctly against
     * every threshold a consumer sets, so a gate written as `seconds < 10` refuses it rather
     * than letting an unbounded run through.
     */
    readonly seconds: number;
    /** How much the number is worth. */
    readonly confidence: CostConfidence;
    /** The cost class the catalogue declares for this algorithm. */
    readonly costClass: CostClass;
    /** Whether running it would hold the render loop, so a UI knows a spinner would freeze. */
    readonly blocksFrame: boolean;
    /** Whether the work can be stopped once it has started. */
    readonly cancellable: boolean;
    /** Whether it can run on this graph at all. */
    readonly available: boolean;
    /** Why it cannot, in a sentence a person can read. Present only when `available` is false. */
    readonly reason?: string;
    /** Where the number came from, in a sentence: the sizes, the work term and the provenance. */
    readonly basis: string;
}

// ---------------------------------------------------------------------------------------------
// The model
// ---------------------------------------------------------------------------------------------

/**
 * The throughputs the model multiplies against, one per cost class.
 *
 * They are rates rather than a fitted curve on purpose. Five points from one machine cannot tell
 * an allocator's behaviour from a complexity term, a fitted curve is far harder for a per-device
 * probe to replace than a single rate, and a rate pinned to the floor of a measured band is
 * cautious everywhere inside that band.
 */
export interface CostRates {
    /** Elements (nodes plus edges) one linear pass retires per second. */
    readonly linearElementsPerSecond: number;
    /** Elements one iteration of an iterative algorithm retires per second. */
    readonly iterativeElementsPerSecond: number;
    /** Source-edge pairs an all-sources shortest-path sweep retires per second. */
    readonly heavyPairsPerSecond: number;
    /** Operations a cubic sweep retires per second. */
    readonly cubicOperationsPerSecond: number;
}

/**
 * The rates that apply when this machine has never been measured.
 *
 * The first three come from timings taken against a built bundle of this element and recorded in
 * `graphty/src/components/shell/analysis/metricCost.ts`, and each is pinned to the FLOOR of its
 * measured band rather than the band's mean, so the model stays cautious across everything that
 * was measured. The iterative rate is its own number and not the linear one: sharing the linear
 * rate for iterative work is the specific mistake that made the consumer's gate optimistic by up
 * to 6.9x, because a per-iteration pass allocates and a single linear pass does not.
 *
 * The linear rate is NOT the consumer's. Its 20M elements/s timed a pass over degrees already in
 * memory, but an element run then built a fresh `@graphty/algorithms` object graph from the
 * snapshot every time and wrote one result object per node. Measured on 2026-09-23 that
 * whole path retires 1.7-4.4M elements/s for degree under plain Node (n = 10,000 to 200,000,
 * m = 5n, falling with size) and about 1.1M/s at n = 100,000 inside a vitest worker, so 20M was
 * optimistic by 5x to 18x. It is pinned at 1M, the floor of that band.
 *
 * The cubic rate has never been measured and is a placeholder at the consumer's old linear figure,
 * which makes a cubic estimate the most pessimistic of the four for any graph big enough to matter.
 * If a cubic algorithm is ever timed, replace this constant; do not fit an exponent to hide it.
 *
 * `test/session/cost/estimate-against-measured-runs.test.ts` times real runs against these rates.
 * They were fitted to the object-graph route; the adapters now run the snapshot functions, which are
 * 10 to 300 times faster, so the algorithms that test times carry their own models
 * (`OWN_COST_MODELS`), refitted to the snapshot.
 */
export const DEFAULT_COST_RATES: Readonly<CostRates> = Object.freeze({
    linearElementsPerSecond: 1_000_000,
    iterativeElementsPerSecond: 3_000_000,
    heavyPairsPerSecond: 5_000_000,
    cubicOperationsPerSecond: 20_000_000,
});

/**
 * This machine's measured throughput, or the record that it could not be measured.
 *
 * `basis` is the honest half: `"probe"` means the rates were timed here, `"defaults"` means the
 * probe could not run and `DEFAULT_COST_RATES` apply. An estimate reports the difference
 * through its confidence rather than pretending the two are the same.
 */
export interface MachineCalibration {
    /** The rates to multiply against. */
    readonly rates: Readonly<CostRates>;
    /** When the measurement was taken, as an ISO 8601 timestamp. */
    readonly at: string;
    /** A fingerprint of the machine the measurement belongs to. */
    readonly machine: string;
    /** Whether the numbers were measured here or are the built-in defaults. */
    readonly basis: "probe" | "defaults";
}

/**
 * One completed run, kept so the next estimate of the same algorithm can be scaled from it
 * rather than modelled.
 *
 * This is the loop that makes the element's estimate better than any consumer's: a consumer sees
 * one number and cannot check it, while the element sees what the run actually took and uses it
 * next time.
 */
export interface CostMeasurement {
    /** Which algorithm was timed. */
    readonly algorithm: AlgorithmKey;
    /** How many nodes it covered. */
    readonly nodes: number;
    /** How many edges it covered. */
    readonly edges: number;
    /** How many iterations it actually did, when the algorithm is iterative. */
    readonly iterations?: number;
    /** How long it took, in seconds. */
    readonly seconds: number;
    /** When it ran, as an ISO 8601 timestamp. */
    readonly at: string;
    /** The machine fingerprint it was timed on, so a measurement from elsewhere is not trusted. */
    readonly machine: string;
}

/**
 * How far a measurement may be extrapolated before it stops counting as a measurement.
 *
 * A model fitted at one size and stretched to another is exactly how the consumer's gate went
 * wrong: its bias GREW with size, which is the signature of a mis-fit rather than a stale
 * number. Beyond one decade of work in either direction the measurement still informs the
 * estimate, but the confidence drops to what the rest of the model can support.
 */
export const MEASUREMENT_EXTRAPOLATION_LIMIT = 10;

/**
 * The iteration count assumed for an iterative algorithm that declares no bound of its own.
 *
 * An assumed bound is a guess, so it caps the confidence at "modelled" however well this machine
 * is calibrated. The number a real algorithm uses is read from its own option descriptor, which
 * is what stops this package's defaults from being copied into a consumer's model.
 */
export const ASSUMED_ITERATION_BOUND = 100;

/** The option name an algorithm declares its iteration bound under. */
export const ITERATION_OPTION_NAME = "maxIterations";

/** One 60 Hz frame, which is the budget a run has before it is reported as blocking the frame. */
const FRAME_BUDGET_SECONDS = 1 / 60;

/** The most elements a typed array can hold, which is the element's hard structural ceiling. */
export const MAX_COLUMN_LENGTH = 2 ** 32 - 1;

/** Bytes one published numeric column entry occupies. */
const BYTES_PER_VALUE = 8;

/** Bytes a graph-level field is charged, which is a nominal figure for a scalar or a small table. */
const BYTES_PER_GRAPH_FIELD = 1024;

// ---------------------------------------------------------------------------------------------
// What is being estimated
// ---------------------------------------------------------------------------------------------

/** How much graph a run would cover, when that is not the whole graph. */
interface CostScopeSize {
    /** How many nodes are in scope. */
    readonly nodes: number;
    /** How many edges are in scope. */
    readonly edges: number;
    /** What was asked for, when the caller has a specification to name. */
    readonly spec?: Scope;
    /** Whether the two counts were counted or scaled from the whole graph. Defaults to true. */
    readonly exact?: boolean;
}

/**
 * Everything an estimate is computed from.
 *
 * All of it is either plain data or a maintained struct the session already holds, which is what
 * keeps {@link estimateCost} synchronous and O(1) in the size of the graph.
 */
export interface CostInput {
    /** Which algorithm would run. */
    readonly algorithm: AlgorithmKey;
    /**
     * Its catalogue descriptor.
     *
     * Absent means the key is not registered, which is an answer rather than a failure: the
     * estimate comes back unavailable with confidence "unknown", so a control can be disabled
     * with a reason instead of a call throwing at a consumer that was only drawing a button.
     */
    readonly descriptor?: AlgorithmDescriptor;
    /** The parameters it would run with, which is where an iteration bound is overridden. */
    readonly params?: Readonly<Record<string, unknown>>;
    /** The graph's shape, as the session maintains it. */
    readonly statistics: GraphStatistics;
    /** How much of it the run would cover. Defaults to the whole graph. */
    readonly scope?: CostScopeSize;
    /** This machine's measured throughput, when it has been measured. */
    readonly calibration?: MachineCalibration;
    /** The most recent timing of each algorithm on this machine, keyed by algorithm. */
    readonly measurements?: ReadonlyMap<AlgorithmKey, CostMeasurement>;
    /** Whether an accelerator is attached, for an algorithm that declares it needs one. */
    readonly acceleratorAvailable?: boolean;
    /**
     * Whether the run yields to the render loop between chunks.
     *
     * One flag decides two facts, because they are the same fact: work that yields neither holds
     * the frame nor resists cancellation, and work that does not yield does both. It defaults to
     * false, which is what today's algorithms do -- a single synchronous pass has no point at
     * which a signal can be noticed.
     */
    readonly chunked?: boolean;
    /**
     * Estimate the approximate method at this sample size instead of the exact method.
     *
     * The sampled work is the exact work scaled by the share of the graph sampled, which for the
     * heavy class is the familiar "k sources times m edges" and for every other class is the
     * same rule written once.
     */
    readonly sample?: number;
    /**
     * Seconds spent deriving a scoped run's compact input before the algorithm starts, added to
     * the algorithm's own estimate. Absent for a run over the whole graph.
     */
    readonly derivationSeconds?: number;
}

// ---------------------------------------------------------------------------------------------
// Reading the inputs
// ---------------------------------------------------------------------------------------------

/**
 * Whether a value can be used as a count of something.
 * @param value - The value to test.
 * @returns True when it is a finite number that is not negative.
 */
function isUsableCount(value: unknown): value is number {
    return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

/**
 * Write an integer with thousands separators, so a basis line reads "n=70,000" not "n=70000".
 * @param value - The number to write.
 * @returns The grouped digits, or "unknown" for anything that is not a finite number.
 */
function group(value: number): string {
    if (!Number.isFinite(value)) {
        return "unknown";
    }

    return String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/**
 * The iteration bound an iterative algorithm would run to.
 *
 * Read from the caller's parameters first and from the algorithm's own option descriptor second,
 * which is the point of the whole exercise: the bound is declared once, in the schema the
 * algorithm validates against, and nothing outside this package has to hold a copy of it.
 * @param descriptor - The algorithm's descriptor, when it has one.
 * @param params - The parameters the run would use.
 * @returns The bound, or undefined when neither the parameters nor the schema declare one.
 */
function declaredIterationBound(
    descriptor: AlgorithmDescriptor | undefined,
    params: Readonly<Record<string, unknown>> | undefined,
): number | undefined {
    const passed = params?.[ITERATION_OPTION_NAME];
    if (typeof passed === "number" && Number.isFinite(passed) && passed > 0) {
        return passed;
    }

    const option = descriptor?.options.find((candidate) => candidate.name === ITERATION_OPTION_NAME);
    const fallback = option?.default;

    return typeof fallback === "number" && Number.isFinite(fallback) && fallback > 0 ? fallback : undefined;
}

/** The option that samples a run's sources, by catalogue key: set, the run costs that share of the exact one. */
const SAMPLE_OPTIONS: Readonly<Partial<Record<string, string>>> = { betweenness: "k", closeness: "k" };

/**
 * The sample size a run asks for through its own option, such as closeness's `k`.
 * @param descriptor - The algorithm's descriptor.
 * @param params - The parameters the run would use.
 * @returns The sample size, or undefined when the run is not sampled that way.
 */
function optionSample(
    descriptor: AlgorithmDescriptor,
    params: Readonly<Record<string, unknown>> | undefined,
): number | undefined {
    const name = SAMPLE_OPTIONS[descriptor.key];
    const value = name === undefined ? undefined : params?.[name];
    return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : undefined;
}

/**
 * The option values a run would use: the caller's, with the declared defaults filled in. What a
 * plugin's `costUnits` is handed, so an option that multiplies the work is priced.
 * @param descriptor - The algorithm's descriptor.
 * @param params - The parameters the run would use.
 * @returns The values.
 */
function withDefaults(
    descriptor: AlgorithmDescriptor,
    params: Readonly<Record<string, unknown>> | undefined,
): Readonly<Record<string, unknown>> {
    const values: Record<string, unknown> = {};
    for (const option of descriptor.options) {
        if (option.default !== undefined) {
            values[option.name] = option.default;
        }
    }

    return { ...values, ...params };
}

/**
 * Why an algorithm cannot run on this graph, when it cannot.
 *
 * Every test here reads a requirement the descriptor declares against a fact the statistics
 * maintain. Nothing is inferred: an algorithm with no `requires` block is available on every
 * graph, and a graph whose direction nothing has settled -- an empty one under `"auto"` -- is
 * never refused for a direction it has not got.
 * @param descriptor - The algorithm's descriptor.
 * @param statistics - The graph's shape.
 * @param acceleratorAvailable - Whether an accelerator is attached.
 * @returns The sentence, or undefined when the algorithm can run.
 */
function unavailableReason(
    descriptor: AlgorithmDescriptor,
    statistics: GraphStatistics,
    acceleratorAvailable: boolean,
): string | undefined {
    const { requires } = descriptor;
    if (requires === undefined) {
        return undefined;
    }

    if (requires.directed === true && statistics.directedness === "undirected") {
        return "Needs a directed graph; this graph is undirected.";
    }

    if (requires.directed === false && statistics.directedness === "directed") {
        return "Needs an undirected graph; this graph is directed.";
    }

    if (requires.weighted === true && !statistics.weighted) {
        return "Needs edge weights; every edge in this graph weighs 1.";
    }

    if (requires.connected === true && statistics.components.count > 1) {
        return `Needs one connected piece; this graph is in ${group(statistics.components.count)} pieces.`;
    }

    if (requires.accelerator === true && !acceleratorAvailable) {
        return "Needs hardware acceleration, and no accelerator is attached.";
    }

    return undefined;
}

// ---------------------------------------------------------------------------------------------
// The work term
// ---------------------------------------------------------------------------------------------

/**
 * How much work a cost class implies at a given size.
 * @param costClass - The class the catalogue declares.
 * @param nodes - Nodes in scope.
 * @param edges - Edges in scope.
 * @param iterations - The iteration bound, used by the iterative class only.
 * @returns The work in the units that class's rate is written in.
 */
function workUnits(costClass: CostClass, nodes: number, edges: number, iterations: number): number {
    switch (costClass) {
        case "instant":
            return nodes + edges;
        case "iterative":
            return iterations * (nodes + edges);
        case "heavy":
            return nodes * edges;
        case "cubic":
            return nodes * nodes * nodes;
        case "unbounded":
            return Number.POSITIVE_INFINITY;
        default: {
            const unreachable: never = costClass;

            throw new Error(`unhandled cost class: ${String(unreachable)}`);
        }
    }
}

/**
 * An algorithm whose work its cost class's shared term misdescribes, with its own.
 *
 * Written against the rates in force rather than in seconds, so a calibrated machine scales it
 * exactly as it scales the class model.
 */
interface OwnCostModel {
    /** The work term as a person reads it in a basis line, given the iteration bound. */
    readonly term: (iterations: number) => string;
    /**
     * Seconds over the whole graph, given its sizes, the rates in force, the iteration bound and the
     * graph's statistics, for a model whose work depends on the graph's shape and not its size alone.
     */
    readonly seconds: (
        nodes: number,
        edges: number,
        rates: Readonly<CostRates>,
        iterations: number,
        statistics: GraphStatistics,
    ) => number;
}

/**
 * The element's own algorithms that carry their own model, by catalogue key.
 *
 * Kept here rather than as a `static cost` on the class because that hook is read for plugins
 * only and answers in absolute seconds, which no calibration can scale. Each rate is pinned to the
 * FLOOR of what was measured across graph shapes, and each is held to a stopwatch, on its typical
 * and its worst shapes, by `test/session/cost/estimate-against-measured-runs.test.ts`.
 *
 * Degree, PageRank, betweenness, closeness, eigenvector centrality and Louvain were refitted on
 * 2026-09-29, when the element moved them off a freshly built `@graphty/algorithms` Graph and onto
 * the snapshot (the dispatcher's CPU port, `Algorithm.accelerated`, for all but degree): typed-array
 * code 5x to 300x faster than the Map-based code the 2026-09-23 rates were fitted on.
 */
const OWN_COST_MODELS: Readonly<Partial<Record<string, OwnCostModel>>> = {
    /* One pass over the snapshot's edge list counting each end, then one result object per node.
       Measured on 2026-09-29 on random m = 5n graphs of 25,000 to 400,000 nodes: 3.6 to 4.1 ns per
       element of n + m up to 100,000 nodes, then about 10 ns from 200,000 up, once the result
       objects outgrow V8's young generation and every scavenge copies them. Pinned at 11 ns,
       1 / (90 * the linear rate): about 3x over the small graphs and 1.1x over the large ones. The
       linear rate was fitted to the object-graph route this used to take, and read about 280x over
       the snapshot. */
    degree: {
        term: () => "n + m",
        seconds: (nodes, edges, rates) => (nodes + edges) / (90 * rates.linearElementsPerSecond),
    },
    /* Power iteration over the snapshot, charged the whole bound: how many passes it takes nothing
       the estimate sees predicts (1 or 2 on a star, 11 on random m = 50n, 41 to 46 on random
       m = 1.2n, 71 to 95 on a path, all 100 on a grid at the schema's smallest tolerance). Measured
       on 2026-09-29 across random (m = 1.2n to 50n), scale-free, grid, path, tree, star and
       clique-ring graphs of 4,000 to 200,000 nodes, a whole run cost at most 2.33 ns per element of
       n + m per pass of the bound (random m = 1.2n, whose passes miss the cache most), and a pass
       1.3 to 5.3 ns. Pinned at 3.3 ns per element per pass of the bound, 1 / (100 * the iterative
       rate). The class model charged 333 ns and was 50x to 600x pessimistic on the snapshot. */
    pagerank: {
        term: (iterations) => `k(n + m) with k=${group(iterations)}`,
        seconds: (nodes, edges, rates, iterations) =>
            (iterations * (nodes + edges)) / (100 * rates.iterativeElementsPerSecond),
    },
    /* Brandes: one BFS per source plus the back-propagation, so n(n + m) rather than the heavy
       class' n * m, which undercharges a sparse graph (a path costs 2x per n * m what random
       m = 20n does). Measured on 2026-09-29 at 63M to 183M n(n + m) per second across random
       (m = 1.2n to 50n), scale-free, grid, path, tree, star and clique-ring graphs of 400 to 1,600
       nodes, the least on sparse random and scale-free graphs: pinned at 11x the heavy rate, 55M.
       The class model was 7x to 30x pessimistic on the snapshot. */
    betweenness: {
        term: () => "n(n + m)",
        seconds: (nodes, edges, rates) => (nodes * (nodes + edges)) / (11 * rates.heavyPairsPerSecond),
    },
    /* One BFS per source, so n(n + m), where betweenness' class term is n * m. Measured on
       2026-09-29 at 131M to 571M n(n + m) per second across random (m = 1.2n to 50n), scale-free,
       grid, path, tree, star and clique-ring graphs of 400 to 1,600 nodes. A node visit costs
       several edge scans (a random read against a sequential one), so the least is on sparse random
       graphs and the most on dense ones and cache-local shapes: pinned at 24x the heavy rate, 120M,
       and 4.7x over random m = 50n. Before the move onto the snapshot it was 3x, 15M. */
    closeness: {
        term: () => "n(n + m)",
        seconds: (nodes, edges, rates) => (nodes * (nodes + edges)) / (24 * rates.heavyPairsPerSecond),
    },
    /* Multilevel Louvain over the snapshot: local-moving sweeps over the edges, then a fold, until
       nothing moves. It stops on its tolerance long before `maxIterations`, so the bound is not
       charged. Refitted on 2026-09-29, when the element moved it off the Map-based object graph and
       onto the dispatcher's CPU port, and given a structure term on 2026-10-03.
       Where the time goes, counted with an instrumented copy of the port: an arc scan costs a
       steady 7.5 to 9 ns, so the cost is the NUMBER of scans, and that is set by the graph's
       community structure rather than its size. On a graph with none, the first two levels only
       pair nodes up, halving the node count while keeping almost every arc, and the third level --
       about n / 5 super-nodes with about 40 neighbours each -- runs 10 to 22 scans of each original
       edge. On a graph with communities the first level gathers whole communities and the levels
       after it are small. One rate per element of n + m per unit of log2(n + m) cannot cover both:
       measured on 2026-10-03 it ran from 7.2 ns on planted partitions to 20.6 on random m = 5n and
       24.5 on scale-free at 200,000 nodes, a 3.4x spread against the 4.2x the accuracy test allows
       before CI runners' 10% scatter, and a flat 26.7 ns read 4.07 on a planted partition on CI.
       What tells the two apart is the transitivity in the statistics: the share of two-edge paths
       closed into triangles, which a community has and a graph without structure does not. The
       charge is divided by 1 + min(10 T, 1), so it halves at T = 0.1 and no further. Measured at
       10,000 to 200,000 nodes (ns per element-log, then the transitivity):
       - no triangles: random m = 1.2n 10.6 to 11.9, m = 5n 14.0 to 20.6, m = 20n 10.7 to 12.2
         (T 0.003 or less), scale-free 15.3 to 24.5 (T 0.002 or less);
       - blocks of 50 with k_in / k_out edges per node inside and out: 4 / 1 7.2 to 8.8 (T 0.09),
         3 / 2 13.1 (T 0.04), 2.5 / 2.5 15.2 (T 0.021), 2 / 3 15.8 (T 0.011), 1 / 4 20.8 (T 0.002);
         blocks of 10 9.2 (T 0.26), of 500 10.2 (T 0.011);
       - Watts-Strogatz rings 2.4 to 9.6 (T 0.07 to 0.47), a random geometric graph 6.9 (T 0.59),
         a ring of 10-cliques 2.6 (T 0.95).
       The discount stops at 2 because more triangles stop predicting a cheaper run: blocks of 10
       (T 0.26) cost more than blocks of 50 (T 0.09). Pinned at 30.3 ns, 1 / (11 * the iterative
       rate), over that divisor: 1.24x to 2.9x over every graph above with T under 0.6, 1.24x over
       the slowest (scale-free at 200,000 nodes) and 1.5x over the slowest held to both bounds
       (random m = 5n at 70,000). Far more over grid, path, star and clique-ring shapes, which settle
       in a handful of sweeps. Statistics with no transitivity are charged as a graph with none. */
    louvain: {
        term: () => "(n + m) log2(n + m) / (1 + min(10 T, 1)), T the transitivity",
        seconds: (nodes, edges, rates, _iterations, statistics) =>
            ((nodes + edges) * Math.log2(Math.max(2, nodes + edges))) /
            (11 * rates.iterativeElementsPerSecond * (1 + Math.min(10 * (statistics.transitivity ?? 0), 1))),
    },
    /* Power iteration x <- (A + I)x over the snapshot: a setup, then up to k passes of n + m each
       (k = 1,000 by default). How many passes depends on the spectral gap, which nothing the
       estimate sees predicts, so the whole bound is charged, and a graph that converges early
       reads as pessimistic by 1,000 / its pass count:
       - a path settles in 1 or 2 passes: every node but the two ends has the same degree, so the
         start vector (1 everywhere) changes only near the ends and meets the tolerance at once;
       - clique rings and dense random graphs settle in 4 to 6, and random m = 5n in about 11:
         their degrees cluster tightly, so the start vector is already close, and the gap is wide;
       - scale-free graphs settle in about 50: their hubs dominate the leading eigenvector;
       - random m = 1.2n takes 263 to 415, growing with n: it is barely past its percolation
         threshold, so its gap is narrow;
       - trees take 121 to 338, grids 63 to over 1,000 and stars 478 to over 1,000, so those run
         most or all of the bound.
       Mean degree does not predict the pass count either (a grid and random m = 2n both have mean
       degree 4, and take over 199 and about 33). Refitted on 2026-09-29, after the element moved
       it onto the dispatcher's CPU port: on those shapes at 10,000 to 200,000 nodes the setup cost
       0.55 to 2.3 ns per element per unit of log2(n + m) (48 ns on the object graph before), and a
       pass 1.7 to 7.1 ns per element, the most on sparse random graphs, whose passes miss the
       cache most. Pinned at 3.3 ns per unit of log2(n + m) (1 / (100 * the iterative rate)) and
       7.4 ns per pass (1 / (45 * the iterative rate)): 1.7x to 2.7x over graphs that run the whole
       bound. The class model charged each pass at the iterative rate, 333 ns per element. */
    eigenvector: {
        term: (iterations) => `(n + m) log2(n + m) + k(n + m) with k=${group(iterations)}`,
        seconds: (nodes, edges, rates, iterations) =>
            ((nodes + edges) * (Math.log2(Math.max(2, nodes + edges)) / 100 + iterations / 45)) /
            rates.iterativeElementsPerSecond,
    },
};

/**
 * The rate a cost class's work is retired at.
 * @param costClass - The class the catalogue declares.
 * @param rates - The throughputs in force.
 * @returns The rate, or NaN for a class no rate can describe.
 */
function rateFor(costClass: CostClass, rates: Readonly<CostRates>): number {
    switch (costClass) {
        case "instant":
            return rates.linearElementsPerSecond;
        case "iterative":
            return rates.iterativeElementsPerSecond;
        case "heavy":
            return rates.heavyPairsPerSecond;
        case "cubic":
            return rates.cubicOperationsPerSecond;
        case "unbounded":
            return Number.NaN;
        default: {
            const unreachable: never = costClass;

            throw new Error(`unhandled cost class: ${String(unreachable)}`);
        }
    }
}

/**
 * The work term as a person reads it in a basis line.
 * @param costClass - The class the catalogue declares.
 * @param iterations - The iteration bound, for the iterative class.
 * @returns The term, such as "n * m" or "k(n + m) with k=100".
 */
function termFor(costClass: CostClass, iterations: number): string {
    switch (costClass) {
        case "instant":
            return "n + m";
        case "iterative":
            return `k(n + m) with k=${group(iterations)}`;
        case "heavy":
            return "n * m";
        case "cubic":
            return "n^3";
        case "unbounded":
            return "unbounded";
        default: {
            const unreachable: never = costClass;

            throw new Error(`unhandled cost class: ${String(unreachable)}`);
        }
    }
}

// ---------------------------------------------------------------------------------------------
// The estimate
// ---------------------------------------------------------------------------------------------

/**
 * An estimate that could not be computed at all, with the reason it could not.
 * @param costClass - The class the catalogue declares, so a consumer can still group the entry.
 * @param chunked - Whether the run would yield to the render loop between chunks.
 * @param reason - Why no number could be produced, in a sentence a person can read.
 * @param available - Whether the algorithm could run at all, which is a separate question from
 * whether its cost is knowable.
 * @returns The estimate.
 */
function unknownEstimate(costClass: CostClass, chunked: boolean, reason: string, available: boolean): CostEstimate {
    const estimate: CostEstimate = {
        seconds: Number.POSITIVE_INFINITY,
        confidence: "unknown",
        costClass,
        blocksFrame: !chunked,
        cancellable: chunked,
        available,
        basis: reason,
    };

    return Object.freeze(available ? estimate : { ...estimate, reason });
}

/** The seconds and the provenance one rate model produced. */
interface ModelledSeconds {
    /** The estimate in seconds. */
    readonly seconds: number;
    /** How much it is worth. */
    readonly confidence: CostConfidence;
    /** Where it came from, for the basis line. */
    readonly provenance: string;
}

/**
 * Scale a recorded run of the same algorithm up or down to the size being asked about.
 *
 * A measurement only counts as one when it was taken on THIS machine and within one decade of
 * work in either direction. Outside either condition it is still the best information available,
 * but it is no longer a measurement of the thing being estimated, and the confidence says so.
 * @param measurement - The recorded run.
 * @param unitsOf - The work units of a run at a given size, in the same units as `units`.
 * @param units - The work being asked about.
 * @param iterations - The iteration bound this run would use.
 * @param machine - The fingerprint of the machine now, when one is known.
 * @returns The scaled seconds and how much they are worth, or undefined when the measurement
 * cannot be scaled at all.
 */
function fromMeasurement(
    measurement: CostMeasurement,
    unitsOf: (nodes: number, edges: number, iterations: number) => number,
    units: number,
    iterations: number,
    machine: string | undefined,
): ModelledSeconds | undefined {
    if (!isUsableCount(measurement.seconds) || !isUsableCount(measurement.nodes) || !isUsableCount(measurement.edges)) {
        return undefined;
    }

    const measuredUnits = unitsOf(measurement.nodes, measurement.edges, measurement.iterations ?? iterations);
    if (!Number.isFinite(measuredUnits) || measuredUnits <= 0) {
        return undefined;
    }

    const ratio = units / measuredUnits;
    const seconds = measurement.seconds * ratio;
    const sameMachine = machine === undefined || machine === measurement.machine;
    const withinBand = ratio <= MEASUREMENT_EXTRAPOLATION_LIMIT && ratio >= 1 / MEASUREMENT_EXTRAPOLATION_LIMIT;

    if (sameMachine && withinBand) {
        return { seconds, confidence: "measured", provenance: `measured ${measurement.at} on this device` };
    }

    if (!sameMachine) {
        return undefined;
    }

    return {
        seconds,
        confidence: "modelled",
        provenance: `extrapolated ${ratio.toPrecision(2)}x from a run measured ${measurement.at}, which is past the ${MEASUREMENT_EXTRAPOLATION_LIMIT}x band a measurement is trusted over`,
    };
}

/**
 * What a run would cost, and how much the answer is worth.
 *
 * Synchronous and O(1) in the size of the graph: it reads the maintained statistics, the cost
 * class the catalogue declares, and the machine's calibration, and multiplies. It never walks
 * the graph, never touches the renderer, and never returns a number it cannot defend -- an input
 * that does not support one comes back with `confidence: "unknown"` and an infinite estimate
 * rather than a plausible figure a button would act on.
 * @param input - The algorithm, the graph's shape and whatever has been measured about this
 * machine.
 * @returns The estimate.
 */
export function estimateCost(input: CostInput): CostEstimate {
    const { descriptor, statistics, scope, calibration, measurements } = input;
    const chunked = input.chunked ?? false;

    if (descriptor === undefined) {
        return unknownEstimate("unbounded", chunked, `No algorithm is registered under "${input.algorithm}".`, false);
    }

    const { costClass } = descriptor;
    const nodes = scope?.nodes ?? statistics.nodeCount;
    const edges = scope?.edges ?? statistics.edgeCount;

    if (!isUsableCount(nodes) || !isUsableCount(edges)) {
        return unknownEstimate(
            costClass,
            chunked,
            "The graph's size is not known yet, so nothing can be estimated.",
            true,
        );
    }

    const reason = unavailableReason(descriptor, statistics, input.acceleratorAvailable ?? false);
    const sizes = `n=${group(nodes)} m=${group(edges)}`;

    if (reason !== undefined) {
        return Object.freeze({
            seconds: Number.POSITIVE_INFINITY,
            confidence: "unknown" as const,
            costClass,
            blocksFrame: false,
            cancellable: chunked,
            available: false,
            reason,
            basis: `${sizes}; ${reason}`,
        });
    }

    if (costClass === "unbounded") {
        return unknownEstimate(
            costClass,
            chunked,
            `${sizes}; this algorithm's running time cannot be bounded before it runs.`,
            true,
        );
    }

    const declared = declaredIterationBound(descriptor, input.params);
    const iterations = declared ?? ASSUMED_ITERATION_BOUND;

    // A run's own sampling option (closeness's `k`) prices it like a sample the gate chose.
    const sample = input.sample ?? optionSample(descriptor, input.params);
    const sampleFactor = sample === undefined || nodes === 0 ? 1 : Math.min(1, Math.max(0, sample / nodes));
    // A plugin's own work units replace the class term, so the rate, a timing taken here and the
    // calibration all scale them exactly as they scale a built-in's.
    // costUnits counts every iteration itself, so no iteration bound is guessed when it is declared.
    const costUnits = registeredAlgorithmByKey(descriptor.key)?.costUnits;
    const optionValues = withDefaults(descriptor, input.params);
    const declaredUnits = costUnits?.(nodes, edges, optionValues);
    const ownUnits = declaredUnits !== undefined && isUsableCount(declaredUnits) ? declaredUnits : undefined;
    const iterationsAreGuessed = costClass === "iterative" && declared === undefined && ownUnits === undefined;
    const units = (ownUnits ?? workUnits(costClass, nodes, edges, iterations)) * sampleFactor;
    const unitsOf =
        ownUnits !== undefined && costUnits !== undefined
            ? (n: number, m: number): number => costUnits(n, m, optionValues)
            : (n: number, m: number, i: number): number => workUnits(costClass, n, m, i);

    const measurement = measurements?.get(input.algorithm);
    const scaled =
        measurement === undefined
            ? undefined
            : fromMeasurement(measurement, unitsOf, units, iterations, calibration?.machine);

    const modelled =
        scaled ??
        modelFromRates(
            descriptor,
            costClass,
            nodes,
            edges,
            units,
            iterations,
            sampleFactor,
            calibration,
            ownUnits !== undefined,
            statistics,
        );
    const confidence = iterationsAreGuessed && modelled.confidence !== "modelled" ? "modelled" : modelled.confidence;
    const derivation = input.derivationSeconds ?? 0;
    const seconds =
        Number.isFinite(modelled.seconds) && modelled.seconds >= 0
            ? modelled.seconds + derivation
            : Number.POSITIVE_INFINITY;

    const notes = [
        sizes,
        ownUnits === undefined
            ? (OWN_COST_MODELS[descriptor.key]?.term(iterations) ?? termFor(costClass, iterations))
            : "the algorithm's own work units",
    ];
    if (sample !== undefined) {
        notes.push(`sampled at ${group(sample)} of ${group(nodes)} nodes`);
    }

    if (scope !== undefined && scope.exact === false) {
        notes.push("sizes scaled from the whole graph rather than counted");
    }

    if (iterationsAreGuessed) {
        notes.push(`no iteration bound is declared, so ${group(ASSUMED_ITERATION_BOUND)} is assumed`);
    }

    if (derivation > 0) {
        notes.push(`plus about ${String(Math.round(derivation * 1000))} ms to derive the scope's subgraph`);
    }

    notes.push(modelled.provenance);

    return Object.freeze({
        seconds,
        confidence,
        costClass,
        blocksFrame: !chunked && seconds > FRAME_BUDGET_SECONDS,
        cancellable: chunked,
        available: true,
        basis: notes.join("; "),
    });
}

/**
 * The estimate when no run of this algorithm has been timed here.
 *
 * A descriptor that declares its own `cost` function wins over the rate table, because its
 * author knows the shape of the work better than a cost class does -- but it is still a model
 * written somewhere else about some other machine, so it reports "modelled" however well this
 * one is calibrated.
 * @param descriptor - The algorithm's descriptor.
 * @param costClass - The class it declares.
 * @param nodes - Nodes in scope.
 * @param edges - Edges in scope.
 * @param units - The work term already computed.
 * @param iterations - The iteration bound the run would use.
 * @param sampleFactor - The share of the graph a sampled run would cover, or 1 for an exact run.
 * @param calibration - This machine's calibration, when it has one.
 * @param ownUnits - Whether `units` came from the plugin's `static costUnits`, which supersedes a
 *   seconds model.
 * @param statistics - The graph's shape, for an own model that reads more than its size.
 * @returns The seconds and how much they are worth.
 */
function modelFromRates(
    descriptor: AlgorithmDescriptor,
    costClass: CostClass,
    nodes: number,
    edges: number,
    units: number,
    iterations: number,
    sampleFactor: number,
    calibration: MachineCalibration | undefined,
    ownUnits: boolean,
    statistics: GraphStatistics,
): ModelledSeconds {
    /* THE REGISTRATION IS ASKED FIRST, AND IT IS THE ONLY PLACE A PLUGIN CAN PUT ONE. A cost
       model is a function, and a function stops a descriptor surviving `JSON.stringify` and a
       `postMessage` -- so the model lives beside the class reference in the registry, read from
       `static cost`, and `descriptor.cost` is only still consulted for the element's own older
       shape. */
    const model = ownUnits ? undefined : (registeredAlgorithmByKey(descriptor.key)?.cost ?? descriptor.cost);

    if (model !== undefined) {
        // A declared cost model is written over the whole graph, so a sampled run is scaled by
        // the same share the rate model uses rather than being handed a smaller graph the author
        // never wrote the model against.
        const declared = model(nodes, edges);
        if (isUsableCount(declared)) {
            return {
                seconds: declared * sampleFactor,
                confidence: "modelled",
                provenance: "the algorithm's own declared cost model",
            };
        }
    }

    const probed = calibration !== undefined && calibration.basis === "probe";
    const rates = calibration?.rates ?? DEFAULT_COST_RATES;
    const rate = rateFor(costClass, rates);

    if (!Number.isFinite(rate) || rate <= 0) {
        return {
            seconds: Number.POSITIVE_INFINITY,
            confidence: "unknown",
            provenance: "no throughput is known for this cost class",
        };
    }

    const own = OWN_COST_MODELS[descriptor.key];
    const seconds =
        own === undefined || ownUnits ? units / rate : own.seconds(nodes, edges, rates, iterations, statistics) * sampleFactor;

    if (probed) {
        return {
            seconds,
            confidence: "calibrated",
            provenance: `calibrated ${calibration.at} on this device`,
        };
    }

    return {
        seconds,
        confidence: "modelled",
        provenance:
            calibration === undefined
                ? "built-in rates; this device has not been calibrated"
                : `built-in rates; the calibration of ${calibration.at} could not measure this device`,
    };
}

// ---------------------------------------------------------------------------------------------
// The gate
// ---------------------------------------------------------------------------------------------

/**
 * The two numbers the gate compares a run against.
 *
 * `exactComputationSeconds` is in SECONDS: the policy is "if the estimate is at or below the cap it
 * runs exactly", so the cap and the estimate have to be the same kind of number. It is a
 * different threshold from the reader-facing "ask before runs estimated over" preference, which
 * belongs to whoever is watching the screen rather than to the element.
 */
export interface CostGateLimits {
    /** The seconds at or below which a run is computed exactly. */
    readonly exactComputationSeconds: number;
    /** The bytes one run's published columns may occupy before the run is refused. */
    readonly runColumnBudgetBytes: number;
}

/**
 * The cap a session applies when nothing else is configured.
 *
 * Thirty seconds, deliberately above any sensible "ask the reader first" limit, because the two
 * gates answer different questions: a reader is asked about a wait they will sit through, and
 * this cap decides when an exact answer stops being worth computing at all.
 */
export const DEFAULT_EXACT_COMPUTATION_CAP_SECONDS = 30;

/** The memory one run's published columns may occupy when nothing else is configured. */
const DEFAULT_MEMORY_BUDGET_BYTES = 512 * 1024 * 1024;

/** The limits a session applies when nothing else is configured. */
export const DEFAULT_COST_GATE_LIMITS: Readonly<CostGateLimits> = Object.freeze({
    exactComputationSeconds: DEFAULT_EXACT_COMPUTATION_CAP_SECONDS,
    runColumnBudgetBytes: DEFAULT_MEMORY_BUDGET_BYTES,
});

/** A scope that would bring a refused run back under the cap. */
interface FittingScope {
    /** The scope specification, which a caller passes straight back to the run it was refused. */
    readonly scope: Scope;
    /** What to call it on a button. */
    readonly label: string;
    /** How many nodes it would cover. */
    readonly nodes: number;
    /** How many edges it would cover. */
    readonly edges: number;
    /** What it would cost, in seconds. */
    readonly seconds: number;
    /** Whether the two counts were counted or scaled from the whole graph. */
    readonly exact: boolean;
}

/** What the gate decided, as three cases a caller switches on. */
export type CostGateDecision =
    | {
          /** Run it exactly. */
          readonly kind: "exact";
          /** What it is expected to cost. */
          readonly estimate: CostEstimate;
      }
    | {
          /** Run the approximate method instead, and say so in the caveats. */
          readonly kind: "approximate";
          /** What the approximate method is expected to cost. */
          readonly estimate: CostEstimate;
          /** What the exact method would have cost, which is why the switch happened. */
          readonly exactEstimate: CostEstimate;
          /** The method name, for `caveats.method`. */
          readonly method: string;
          /** What the method is called in words. */
          readonly plainName: string;
          /** The sample size, for `caveats.sampleSize`. */
          readonly sampleSize: number;
          /** Whether the method takes a seed, so `caveats.seed` can be filled or left null. */
          readonly seeded: boolean;
          /** Sentences for `caveats.notes`, stating plainly what the numbers are. */
          readonly notes: readonly string[];
      }
    | {
          /** Refuse it. */
          readonly kind: "refused";
          /** The error to reject the run with, carrying the facts a consumer switches on. */
          readonly error: GraphtyError;
      };

/** A scope a refused run could be pointed at, sized by whoever holds it: a kept set, today. */
export interface ScopeCandidate {
    /** The scope specification. */
    readonly scope: Scope;
    /** What to call it on a button: the set's name. */
    readonly label: string;
    /** How many nodes it covers. */
    readonly nodes: number;
    /** How many edges it covers. */
    readonly edges: number;
    /** Seconds to derive its compact input. */
    readonly derivationSeconds: number;
}

/** What the gate is told beyond the estimate's own inputs. */
interface CostGateOptions {
    /** The kept sets to suggest when they fit, read only on a refusal. */
    readonly keptSets?: () => readonly ScopeCandidate[];
    /** The cap and the memory budget. Defaults to {@link DEFAULT_COST_GATE_LIMITS}. */
    readonly limits?: Readonly<CostGateLimits>;
    /** Refuse to approximate: above the cap this fails rather than sampling. */
    readonly exact?: boolean;
    /**
     * Ask for the approximate method by name at this sample size, whatever the estimate says.
     *
     * It takes precedence over {@link CostInput.sample}, which describes the work being
     * estimated rather than the decision being made; the gate reads whichever is set.
     */
    readonly sample?: number;
}

/**
 * How many bytes one run's published columns would occupy.
 *
 * Counted from the fields the descriptor DECLARES rather than from a table of shapes kept here,
 * so an algorithm that publishes four node columns is charged for four. That is the difference
 * between agreeing with the catalogue and restating it.
 * @param descriptor - The algorithm's descriptor.
 * @param nodes - Nodes in scope.
 * @param edges - Edges in scope.
 * @returns The bytes.
 */
export function resultBytes(descriptor: AlgorithmDescriptor, nodes: number, edges: number): number {
    let bytes = 0;
    for (const declared of descriptor.fields) {
        switch (declared.kind) {
            case "node":
                bytes += nodes * BYTES_PER_VALUE;
                break;
            case "edge":
                bytes += edges * BYTES_PER_VALUE;
                break;
            case "graph":
                bytes += BYTES_PER_GRAPH_FIELD;
                break;
            default:
                break;
        }
    }

    return bytes;
}

/**
 * Whether one run's published columns would exceed what a typed array can hold.
 *
 * This is the hard structural limit, and it is the reason `E_TOO_LARGE` and `E_CAP_EXCEEDED` are
 * two codes rather than one: a column longer than a typed array cannot be built at any sample
 * size on any machine, while a run that is merely slow becomes runnable the moment the scope
 * narrows.
 *
 * A pair-list is not charged for every node pair: the only one the element ships publishes at
 * most its topK rows, so a slow pair-list is the time cap's to refuse, not this limit's.
 * @param nodes - Nodes in scope.
 * @param edges - Edges in scope.
 * @returns The count that is too large and what it is, or undefined when nothing is.
 */
function structuralOverflow(nodes: number, edges: number): { kind: string; count: number } | undefined {
    if (nodes > MAX_COLUMN_LENGTH) {
        return { kind: "nodes", count: nodes };
    }

    if (edges > MAX_COLUMN_LENGTH) {
        return { kind: "edges", count: edges };
    }

    return undefined;
}

/**
 * The scopes that would bring a refused run back under the cap.
 *
 * None for an algorithm that computes on the whole graph whatever its scope: no scope changes
 * what it costs. Otherwise the largest connected piece comes first -- the statistics carry its
 * node count, and its edge count is scaled by the share of nodes it holds, which the entry marks
 * as scaled rather than counted so nobody mistakes it for a measurement -- then the kept sets that
 * fit, smallest first, each counted and charged for deriving its input.
 * @param input - The estimate's own inputs.
 * @param statistics - The graph's shape.
 * @param cap - The seconds a run has to fit in.
 * @param keptSets - The kept sets, sized.
 * @returns The scopes that fit.
 */
function fittingScopes(
    input: CostInput,
    statistics: GraphStatistics,
    cap: number,
    keptSets: () => readonly ScopeCandidate[],
): readonly FittingScope[] {
    if (input.descriptor?.scopeInput !== "subgraph") {
        return Object.freeze([]);
    }

    const fitting: FittingScope[] = [];
    const { largestSize } = statistics.components;
    if (statistics.components.count > 1 && largestSize > 0 && statistics.nodeCount > 0) {
        const share = largestSize / statistics.nodeCount;
        const edges = Math.round(statistics.edgeCount * share);
        const estimate = estimateCost({
            ...input,
            sample: undefined,
            scope: { nodes: largestSize, edges, exact: false },
        });
        if (estimate.available && estimate.seconds <= cap) {
            fitting.push(
                Object.freeze({
                    scope: "largest-component" as Scope,
                    label: "The largest connected piece",
                    nodes: largestSize,
                    edges,
                    seconds: estimate.seconds,
                    exact: false,
                }),
            );
        }
    }

    const sets = [...keptSets()].sort((left, right) => left.nodes - right.nodes || left.edges - right.edges);
    for (const candidate of sets) {
        const { scope, label, nodes, edges, derivationSeconds } = candidate;
        const estimate = estimateCost({
            ...input,
            sample: undefined,
            derivationSeconds,
            scope: { nodes, edges, spec: scope, exact: true },
        });
        if (estimate.available && estimate.seconds <= cap) {
            fitting.push(Object.freeze({ scope, label, nodes, edges, seconds: estimate.seconds, exact: true }));
        }
    }

    return Object.freeze(fitting);
}

/**
 * The largest graph this algorithm still fits under the cap on.
 *
 * Reported beside a refusal so that "too expensive" arrives with something a reader can act on:
 * a filter narrowed to about this many nodes runs. It is found by bisection over the estimate
 * rather than by inverting the work term, so it stays correct for a descriptor that declares its
 * own cost model and for every cost class at once.
 * @param input - The estimate's own inputs.
 * @param cap - The seconds a run has to fit in.
 * @returns The node and edge counts that fit, or undefined when even one node does not.
 */
function fitsUpTo(input: CostInput, cap: number): { nodes: number; edges: number } | undefined {
    const { statistics } = input;
    const nodes = statistics.nodeCount;
    if (nodes <= 0) {
        return undefined;
    }

    const density = statistics.edgeCount / nodes;
    /**
     * What a graph of this many nodes, at this graph's density, would cost.
     * @param candidate - The node count to try.
     * @returns The seconds.
     */
    const secondsAt = (candidate: number): number =>
        estimateCost({
            ...input,
            sample: undefined,
            scope: { nodes: candidate, edges: Math.round(candidate * density), exact: false },
        }).seconds;

    if (secondsAt(1) > cap) {
        return undefined;
    }

    let low = 1;
    let high = nodes;
    while (high - low > 1) {
        const mid = Math.floor((low + high) / 2);
        if (secondsAt(mid) <= cap) {
            low = mid;
        } else {
            high = mid;
        }
    }

    return { nodes: low, edges: Math.round(low * density) };
}

/**
 * Decide what happens to a run whose cost has been estimated.
 *
 * The policy, in the order the design states it: estimate before starting; at or below the cap
 * run exactly; above the cap switch to the algorithm's declared approximate method and record
 * that honestly; above the cap with no approximate method, or with exactness demanded, fail with
 * `E_CAP_EXCEEDED` carrying the estimate, the cap, the graph size and the scopes that would fit.
 *
 * Two structural cases are settled before the clock is consulted at all, because a run that
 * cannot be held in memory is not a run that is merely slow: a column longer than a typed array
 * fails with `E_TOO_LARGE`, and columns larger than the memory budget fail with
 * `E_OUT_OF_MEMORY`. Neither becomes possible at a smaller sample size, which is exactly what
 * distinguishes them from the cap.
 *
 * The gate never throws. It returns the error it would have thrown, so that the same decision
 * can be shown on a button before the click and applied to a run after it.
 * @param input - The algorithm, the graph's shape and what is known about this machine.
 * @param options - The limits, and whether the caller demanded exactness or named a sample size.
 * @returns What to do.
 */
export function gateRun(input: CostInput, options: CostGateOptions = {}): CostGateDecision {
    const limits = options.limits ?? DEFAULT_COST_GATE_LIMITS;
    const cap = limits.exactComputationSeconds;
    const { descriptor, statistics } = input;
    const nodes = input.scope?.nodes ?? statistics.nodeCount;
    const edges = input.scope?.edges ?? statistics.edgeCount;

    if (options.exact === true && (options.sample ?? input.sample) !== undefined) {
        return refuse("E_BAD_COMMAND", "A run cannot be both exact and sampled.", {
            fields: ["exact", "sample"],
        });
    }

    if (descriptor === undefined && isDeprecatedAlgorithm(input.algorithm)) {
        return refuse(
            "E_UNSUPPORTED",
            `The "${input.algorithm}" algorithm is not implemented. The name is deprecated and will be removed at the next major release unless it is implemented first.`,
            { algorithm: input.algorithm, reason: "deprecated" },
        );
    }

    if (descriptor === undefined) {
        return refuse("E_UNKNOWN_ALGORITHM", `No algorithm is registered under "${input.algorithm}".`, {
            algorithm: input.algorithm,
        });
    }

    const overflow = structuralOverflow(nodes, edges);
    if (overflow !== undefined) {
        return refuse(
            "E_TOO_LARGE",
            `This graph has ${group(overflow.count)} ${overflow.kind}, past the ${group(MAX_COLUMN_LENGTH)} a result column can hold. No scope or sample changes that.`,
            { limit: MAX_COLUMN_LENGTH, count: overflow.count, of: overflow.kind, graph: { nodes, edges } },
        );
    }

    const bytes = resultBytes(descriptor, nodes, edges);
    if (bytes > limits.runColumnBudgetBytes) {
        return refuse(
            "E_OUT_OF_MEMORY",
            `This run would publish ${group(bytes)} bytes of results, past the ${group(limits.runColumnBudgetBytes)}-byte budget.`,
            { bytes, budget: limits.runColumnBudgetBytes, graph: { nodes, edges } },
        );
    }

    const exactEstimate = estimateCost({ ...input, sample: undefined });
    if (!exactEstimate.available) {
        const reason = exactEstimate.reason ?? "This algorithm cannot run on this graph.";
        const code = descriptor.requires?.accelerator === true ? "E_NO_ACCELERATOR" : "E_UNSUPPORTED";

        return refuse(code, reason, { algorithm: input.algorithm, reason, graph: { nodes, edges } });
    }

    const requestedSample = options.sample ?? input.sample;
    if (requestedSample === undefined && exactEstimate.seconds <= cap) {
        return { kind: "exact", estimate: exactEstimate };
    }

    const { approximable } = descriptor;
    if (approximable !== undefined && options.exact !== true) {
        return approximateDecision(
            input,
            exactEstimate,
            approximable,
            requestedSample ?? approximable.defaultSample,
            cap,
        );
    }

    return refuse(
        "E_CAP_EXCEEDED",
        options.exact === true
            ? `An exact run is estimated at ${exactEstimate.seconds.toPrecision(3)} s, past the ${cap} s cap, and exactness was demanded.`
            : `This run is estimated at ${exactEstimate.seconds.toPrecision(3)} s, past the ${cap} s cap, and this algorithm has no approximate method.`,
        {
            algorithm: input.algorithm,
            estimateSeconds: exactEstimate.seconds,
            confidence: exactEstimate.confidence,
            basis: exactEstimate.basis,
            capSeconds: cap,
            graph: { nodes, edges },
            approximable: approximable !== undefined,
            exactRequested: options.exact === true,
            scopes: fittingScopes(input, statistics, cap, options.keptSets ?? ((): readonly ScopeCandidate[] => [])),
            fitsUpTo: fitsUpTo(input, cap),
        },
    );
}

/**
 * Build the approximate arm of a decision, with the caveats spelled out rather than implied.
 * @param input - The estimate's own inputs.
 * @param exactEstimate - What the exact method would have cost.
 * @param approximable - The approximate method the descriptor declares.
 * @param sampleSize - The sample size to run at.
 * @param cap - The cap that was exceeded.
 * @returns The decision.
 */
function approximateDecision(
    input: CostInput,
    exactEstimate: CostEstimate,
    approximable: NonNullable<AlgorithmDescriptor["approximable"]>,
    sampleSize: number,
    cap: number,
): CostGateDecision {
    const estimate = estimateCost({ ...input, sample: sampleSize });
    const nodes = input.scope?.nodes ?? input.statistics.nodeCount;
    const notes = [
        `Sampled rather than exact: ${approximable.plainName} over ${group(sampleSize)} of ${group(nodes)} nodes.`,
    ];

    if (exactEstimate.seconds > cap) {
        notes.push(
            `An exact run was estimated at ${exactEstimate.seconds.toPrecision(3)} s, past the ${cap} s cap, so the approximate method was used instead.`,
        );
    }

    if (estimate.seconds > cap) {
        notes.push(
            `The sampled run is itself estimated at ${estimate.seconds.toPrecision(3)} s, which is still past the cap.`,
        );
    }

    return {
        kind: "approximate",
        estimate,
        exactEstimate,
        method: approximable.method,
        plainName: approximable.plainName,
        sampleSize,
        seeded: approximable.seeded,
        notes: Object.freeze(notes),
    };
}

/**
 * Build a refusal.
 * @param code - The error code a consumer switches on.
 * @param message - The sentence a person reads.
 * @param details - The facts behind it.
 * @returns The refused decision.
 */
function refuse(
    code: GraphtyError["code"],
    message: string,
    details: Readonly<Record<string, unknown>>,
): CostGateDecision {
    return {
        kind: "refused",
        error: new GraphtyError({ code, message, source: "run", details }),
    };
}
