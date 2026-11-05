/**
 * @file What the timeline's data side costs at the render ceiling, through the real session with no
 * renderer: 1,000,000 edges and 100,000 nodes against the budgets of
 * design/data/timeline-attribute.md section 5.2.
 *
 * Three seeded graphs, each under a node filter that hides a tenth of the nodes: uniform edge
 * instants, node-timed, and Zipf (bursty times on hub-heavy degrees, nodes and edges both timed).
 * Each measurement is the median of seven rounds after one warm-up. The window is 30 days wide.
 * A jump goes between quantiles of the data. `stepBy` and `slide` move it a day, the first through
 * a recorded window and the second as a smooth play frame does, from a place where that day takes
 * in a quantile instant or, in the last round, the best connected node's instant: every round must
 * cross rows, and the rows crossed print beside the timings. `binsVisible` is the first read after
 * a filter change.
 *
 * THE BUDGETS ARE PRINTED, NOT ASSERTED: a stopwatch on a busy machine measures the machine. Each
 * measurement prints as a `[time-pipeline]` line with its pass or fail, and each graph appends a row
 * to `benchmarks/results/browser-<host>.jsonl`, the ignored file of this machine's runs. Run with:
 * npx vitest run --project=bench test/session/time/time-pipeline.bench.test.ts
 */

import { appendFileSync } from "node:fs";
import { hostname } from "node:os";
import { setFlagsFromString } from "node:v8";
import { runInNewContext } from "node:vm";

import { mulberry32 } from "@graphty/algorithms";
import { afterAll, assert, beforeAll, describe, it } from "vitest";

import { setDefaultFeatures } from "../../../src/features/resolve";
import type { TimeField, TimeStepEvent } from "../../../src/session/time/TimeApi";
import { type EdgeRow, type Harness, makeSession, type NodeRow } from "../helpers";

// Timings are taken with strict state off, as a published build runs.
(globalThis as { __GRAPHTY_STRICT_STATE__?: boolean }).__GRAPHTY_STRICT_STATE__ = false;

const NODES = 100_000;
const EDGES = 1_000_000;
const ROUNDS = 7;
const DAY = 86_400_000;
const START = Date.UTC(2020, 0, 1);
const SPAN = 5 * 365 * DAY;
const WIDTH = 30 * DAY;
const BINS = 500;
/** How many bursts the Zipf graph's times fall in, and how long one lasts. */
const BURSTS = 40;
const BURST_SPAN = 3 * DAY;
/** The order a jump visits the seven quantiles in: every move crosses the data. */
const JUMP_ORDER = [3, 0, 5, 1, 6, 2, 4];

/** Design 5.2's budgets, in milliseconds. */
const BUDGET_MS = { build: 150, jump: 10, stepBy: 2, slide: 2, bins: 1, binsVisible: 5 };
type Measure = keyof typeof BUDGET_MS;

/** Design 5.2's memory: 24 bytes per timed element, and 1 per element for the cached filter mask. */
const BYTES_PER_TIMED = 24;
const BYTES_PER_ELEMENT = 1;

/** One measurement's rounds. */
interface Timing {
    readonly median: number;
    readonly slowest: number;
}

/** One seeded graph. */
interface Graph {
    readonly nodes: NodeRow[];
    readonly edges: EdgeRow[];
    readonly field: TimeField;
}

/**
 * A rank from 0 to `count - 1`, with a chance falling as 1 / rank: Zipf's law with exponent 1.
 * @param next - The generator.
 * @param count - How many ranks.
 * @returns The rank.
 */
function zipf(next: () => number, count: number): number {
    return Math.floor(count ** next()) - 1;
}

/**
 * The records of a graph, whose times and endpoints the two callbacks draw.
 * @param seed - The seed.
 * @param field - What is designated.
 * @param node - Draws a node's rank.
 * @param instant - Draws an instant.
 * @returns The graph.
 */
function graphOf(
    seed: number,
    field: TimeField,
    node: (next: () => number) => number,
    instant: (next: () => number) => number,
): Graph {
    const next = mulberry32(seed);
    const nodes = Array.from({ length: NODES }, (_, at) => ({
        id: `n${String(at)}`,
        kind: `k${String(at % 10)}`,
        ...(field.nodes === undefined ? {} : { t: instant(next) }),
    }));
    const edges = Array.from({ length: EDGES }, () => ({
        src: `n${String(node(next))}`,
        dst: `n${String(node(next))}`,
        ...(field.edges === undefined ? {} : { t: instant(next) }),
    }));

    return { nodes, edges, field };
}

/** Each case's graph, made only when its test runs: two at once would sit in the heap together. */
const CASES: Record<string, () => Graph> = {
    uniform: () =>
        graphOf(
            1,
            { edges: { start: "t" } },
            (next) => Math.floor(next() * NODES),
            (next) => START + Math.floor(next() * SPAN),
        ),
    "node-timed": () =>
        graphOf(
            2,
            { nodes: { start: "t" } },
            (next) => Math.floor(next() * NODES),
            (next) => START + Math.floor(next() * SPAN),
        ),
    zipf: () => {
        const place = mulberry32(3);
        // Short of the end, so a step from the last burst still moves.
        const bursts = Array.from({ length: BURSTS }, () => START + Math.floor(place() * (SPAN - 2 * WIDTH)));
        return graphOf(
            4,
            { nodes: { start: "t" }, edges: { start: "t" } },
            (next) => zipf(next, NODES),
            (next) => bursts[zipf(next, BURSTS)] + Math.floor(next() * BURST_SPAN),
        );
    },
};

/**
 * Time some work over the rounds, after one warm-up.
 * @param work - The work, handed its round.
 * @param prepare - What each round needs first, untimed.
 * @returns The median and the slowest round.
 */
async function timed(
    work: (round: number) => unknown,
    prepare: (round: number) => unknown = () => undefined,
): Promise<Timing> {
    const round = async (at: number): Promise<number> => {
        await prepare(at);
        const start = performance.now();
        await work(at);
        return performance.now() - start;
    };

    // The warm-up stands at the last round's place, so the first round still moves.
    await round(ROUNDS - 1);
    const rounds: number[] = [];
    for (let at = 0; at < ROUNDS; at++) {
        rounds.push(await round(at));
    }

    rounds.sort((a, b) => a - b);
    return { median: rounds[ROUNDS >> 1], slowest: rounds[ROUNDS - 1] };
}

/**
 * The quantiles of the graph's instants, in {@link JUMP_ORDER}.
 * @param graph - The graph.
 * @returns The seven instants.
 */
function quantilesOf(graph: Graph): number[] {
    const rows: readonly (NodeRow | EdgeRow)[] = graph.field.edges === undefined ? graph.nodes : graph.edges;
    const instants = Float64Array.from(rows, (row) => row.t as number).sort();
    return JUMP_ORDER.map((at) => instants[Math.floor(((at + 0.5) / ROUNDS) * instants.length)]);
}

/**
 * The instant of the node with the most edges, whose crossing re-tests all of them.
 * @param graph - The graph.
 * @returns The instant, or undefined when nodes are not timed.
 */
function hubInstant(graph: Graph): number | undefined {
    if (graph.field.nodes === undefined) {
        return undefined;
    }

    const degree = new Map<unknown, number>();
    for (const { src, dst } of graph.edges) {
        degree.set(src, (degree.get(src) ?? 0) + 1);
        degree.set(dst, (degree.get(dst) ?? 0) + 1);
    }

    const degreeOf = (node: NodeRow): number => degree.get(node.id) ?? 0;
    const hub = graph.nodes.reduce((best, node) => (degreeOf(node) > degreeOf(best) ? node : best));
    return hub.t as number;
}

/**
 * How many rows a move took in and out of view.
 * @param event - The move.
 * @returns Nodes and edges together.
 */
function rowsCrossed({ entered, left }: TimeStepEvent): number {
    return entered.nodes + entered.edges + left.nodes + left.edges;
}

setFlagsFromString("--expose-gc");
const collect = runInNewContext("gc") as () => void;

/**
 * The bytes alive now, after a full collection.
 * @returns Heap and array buffers together.
 */
function bytesHeld(): number {
    collect();
    const { heapUsed, arrayBuffers } = process.memoryUsage();
    return heapUsed + arrayBuffers;
}

/**
 * Print one measurement against its budget.
 * @param name - The case.
 * @param measure - What was measured.
 * @param timing - The result.
 */
function report(name: string, measure: Measure, timing: Timing): void {
    const budget = BUDGET_MS[measure];
    console.log(
        `[time-pipeline] ${name} ${measure}: median ${timing.median.toFixed(2)} ms, slowest ${timing.slowest.toFixed(2)} ms, budget ${String(budget)} ms: ${timing.median <= budget ? "pass" : "fail"}`,
    );
}

/**
 * The bytes a designated field, a window, a slide and a histogram add, per timed element.
 * @param harness - The session, nothing designated yet.
 * @param graph - The graph.
 * @param timedRows - How many elements carry a time.
 * @returns The bytes, how many of them the undo history holds, and the budget.
 */
async function bytesAdded(
    harness: Harness,
    graph: Graph,
    timedRows: number,
): Promise<{ perTimed: number; historyPerTimed: number; budget: number }> {
    const { history, time } = harness.session;
    const historyBefore = history.bytes;
    const before = bytesHeld();
    await time.setField(graph.field);
    const from = START + SPAN / 2;
    await time.window({ from, to: from + WIDTH, step: DAY });
    await time.stepBy(1);
    await time.ready;
    // A slide holds what a play or a drag holds, and it stays held after the commit.
    await time.seek(from + 2 * DAY, { commit: false });
    await time.commit();
    time.bins({ count: BINS, scope: "visible" });

    return {
        perTimed: (bytesHeld() - before) / timedRows,
        // The mask copies steps keep for undo, the first thing the history drops.
        historyPerTimed: (history.bytes - historyBefore) / timedRows,
        budget: BYTES_PER_TIMED + (BYTES_PER_ELEMENT * (NODES + EDGES)) / timedRows,
    };
}

describe("the timeline at 1,000,000 edges", () => {
    const worst = new Map<Measure, Timing & { name: string }>();

    beforeAll(() => {
        // The timeline is an experiment: this file's sessions switch it on.
        setDefaultFeatures(["timeline"]);
    });

    afterAll(() => {
        for (const [measure, timing] of worst) {
            report(`worst case (${timing.name})`, measure, timing);
        }
    });

    for (const [name, make] of Object.entries(CASES)) {
        it(`${name}: runs every measurement and writes a results row`, async () => {
            const graph = make();
            const harness = makeSession();
            harness.add(graph.nodes, graph.edges);
            const { session } = harness;
            assert.strictEqual(session.snapshot().edgeCount, EDGES);
            const { time, visibility } = session;
            const hideTenth = (tenth: number): PromiseLike<unknown> =>
                visibility.setSteps([
                    {
                        id: "shown",
                        on: true,
                        rule: {
                            kind: "categories",
                            attribute: "data.kind",
                            values: Array.from({ length: 10 }, (_, at) => `k${String(at)}`).filter(
                                (kind) => kind !== `k${String(tenth)}`,
                            ),
                        },
                    },
                ]);
            await hideTenth(9);

            const timedRows =
                (graph.field.nodes === undefined ? 0 : NODES) + (graph.field.edges === undefined ? 0 : EDGES);
            const bytes = await bytesAdded(harness, graph, timedRows);
            const quantiles = quantilesOf(graph);
            const seek = (round: number): Promise<unknown> => time.seek(quantiles[round] - WIDTH / 2);
            // Where a day's move takes in the instant: it sits half a day past the window's end.
            const stops = [...quantiles.slice(0, -1), hubInstant(graph) ?? quantiles[ROUNDS - 1]].map(
                (at) => at - WIDTH - DAY / 2,
            );
            const crossed = { stepBy: Array<number>(ROUNDS), slide: Array<number>(ROUNDS) };
            let hidden = 9;

            const timings: Record<Measure, Timing> = {
                jump: await timed(seek),
                stepBy: await timed(
                    async (round) => {
                        crossed.stepBy[round] = rowsCrossed(await time.stepBy(1));
                    },
                    (round) => time.seek(stops[round]),
                ),
                // Uncommitted on both sides, as frames of a play are: a recorded window between
                // them would make the slide start over with a full pass.
                slide: await timed(
                    async (round) => {
                        crossed.slide[round] = rowsCrossed(await time.seek(stops[round] + DAY, { commit: false }));
                    },
                    (round) => time.seek(stops[round], { commit: false }),
                ),
                bins: await timed(() => time.bins({ count: BINS })),
                // Ends where it began: the warm-up and the seven rounds are eight changes.
                binsVisible: await timed(
                    () => time.bins({ count: BINS, scope: "visible" }),
                    () => {
                        hidden = hidden === 9 ? 8 : 9;
                        return hideTenth(hidden);
                    },
                ),
                // A new data token drops the index; the snapshot is rebuilt before the clock starts. The
                // `extent()` asks for the build, and `ready` holds until it is done.
                build: await timed(
                    () => {
                        time.extent();
                        return time.ready;
                    },
                    () => {
                        harness.touch();
                        session.snapshot();
                    },
                ),
            };

            // A move that crossed no rows, or an accidentally empty window, cannot look fast.
            assert.isAbove(Math.min(...crossed.stepBy, ...crossed.slide), 0);
            await seek(0);
            const visibleEdges = visibility.edgeMask().reduce((sum, shown) => sum + shown, 0);
            assert.isAbove(visibleEdges, 0);

            for (const measure of Object.keys(BUDGET_MS) as Measure[]) {
                const timing = timings[measure];
                report(name, measure, timing);
                if (timing.median > (worst.get(measure)?.median ?? -1)) {
                    worst.set(measure, { ...timing, name });
                }
            }

            console.log(`[time-pipeline] ${name} rows crossed per round: ${crossed.stepBy.join(", ")}`);
            console.log(
                `[time-pipeline] ${name} bytes added per timed element: ${bytes.perTimed.toFixed(1)} (${bytes.historyPerTimed.toFixed(1)} held by the undo history), budget ${bytes.budget.toFixed(1)}: ${bytes.perTimed <= bytes.budget ? "pass" : "fail"}`,
            );
            appendFileSync(
                new URL(`../../../benchmarks/results/browser-${hostname()}.jsonl`, import.meta.url),
                `${JSON.stringify({ date: new Date().toISOString(), runner: "node", bench: "time-pipeline", case: name, nodes: NODES, edges: EDGES, visibleEdges, timings, crossed, bytes })}\n`,
            );
        });
    }
});
