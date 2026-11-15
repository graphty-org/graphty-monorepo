/**
 * `time.series`: every window of a step at once, without touching what is on screen, and
 * `waitForRender`, which keeps a stepped play from outrunning the renderer.
 */
import { afterEach, assert, beforeAll, describe, it, vi } from "vitest";

import { isGraphtyError } from "../../../src/errors";
import { setDefaultFeatures } from "../../../src/features/resolve";
import type { TimeSeriesRow } from "../../../src/session/time/series";
import type { TimeStepEvent } from "../../../src/session/time/TimeApi";
import { slideCounters } from "../../../src/session/visibility/slide";
import { type Harness, makeSession } from "../helpers";

// The timeline is an experiment: this file's sessions switch it on.
beforeAll(() => {
    setDefaultFeatures(["timeline"]);
});

afterEach(() => {
    setDefaultFeatures(["timeline"]);
    vi.useRealTimers();
});

const DAY = 86_400_000;
const KOLKATA = "Asia/Kolkata";

/** One node of a graph kept beside its session, for the brute force to read. */
interface PlainNode {
    readonly id: string;
    readonly kind: string;
    readonly w?: number;
}

/** One edge of a graph kept beside its session. */
interface PlainEdge {
    readonly src: number;
    readonly dst: number;
    readonly w?: number;
}

/** A session, and the same graph as plain rows. */
interface Plain {
    readonly harness: Harness;
    readonly nodes: readonly PlainNode[];
    readonly edges: readonly PlainEdge[];
}

/**
 * A seeded pseudo-random number in [0, 1).
 * @param seed - The seed.
 * @returns The generator.
 */
function random(seed: number): () => number {
    let state = seed;
    return () => {
        state = (state * 1_103_515_245 + 12_345) % 2_147_483_648;
        return state / 2_147_483_648;
    };
}

/**
 * A graph of `n` nodes and `3n` edges whose edges carry a time over `span`, and with `nodeTime` its
 * nodes too; one edge in ten carries none.
 * @param n - How many nodes.
 * @param seed - The seed.
 * @param span - The spread of the instants.
 * @param nodeTime - Whether nodes carry a time.
 * @returns The session and the plain rows.
 */
function seeded(n: number, seed: number, span: number, nodeTime: boolean): Plain {
    const next = random(seed);
    const nodes: PlainNode[] = Array.from({ length: n }, (_, at) => ({
        id: `n${String(at)}`,
        kind: at % 3 === 0 ? "hub" : "leaf",
        ...(nodeTime ? { w: Math.floor(next() * span) } : {}),
    }));
    const edges: PlainEdge[] = Array.from({ length: 3 * n }, (_, at) => ({
        src: Math.floor(next() * n),
        dst: Math.floor(next() * n),
        ...(at % 10 === 9 ? {} : { w: Math.floor(next() * span) }),
    }));
    const harness = makeSession({ directed: true });
    harness.add(
        nodes.map((node) => ({ ...node })),
        edges.map((edge) => ({ ...edge, src: nodes[edge.src].id, dst: nodes[edge.dst].id })),
    );
    return { harness, nodes, edges };
}

/**
 * The window's rule written out by hand: what shows in one window, as sets of rows.
 * @param plain - The graph.
 * @param row - The window.
 * @param nodeTime - Whether nodes are timed; when not, a node follows its edges.
 * @param kept - The node kinds the filter keeps.
 * @returns The rows showing.
 */
function shown(
    plain: Plain,
    row: Pick<TimeSeriesRow, "from" | "to">,
    nodeTime: boolean,
    kept: ReadonlySet<string>,
): { readonly nodes: Set<number>; readonly edges: Set<number> } {
    const inside = (at: number | undefined): boolean => at === undefined || (at >= row.from && at < row.to);
    const hasEdge = new Set<number>();
    plain.edges.forEach((edge) => {
        if (inside(edge.w)) {
            hasEdge.add(edge.src);
            hasEdge.add(edge.dst);
        }
    });
    const nodes = new Set<number>();
    plain.nodes.forEach((node, at) => {
        if (kept.has(node.kind) && (nodeTime ? inside(node.w) : hasEdge.has(at))) {
            nodes.add(at);
        }
    });
    const edges = new Set<number>();
    plain.edges.forEach((edge, at) => {
        if (inside(edge.w) && nodes.has(edge.src) && nodes.has(edge.dst)) {
            edges.add(at);
        }
    });

    return { nodes, edges };
}

/**
 * How many of a set's members another set lacks.
 * @param some - The set.
 * @param other - The other.
 * @returns The count.
 */
function outside(some: ReadonlySet<number>, other: ReadonlySet<number>): number {
    return [...some].filter((row) => !other.has(row)).length;
}

/**
 * A small graph with edges a day apart, one for each of `days` days.
 * @param days - How many days.
 * @param internals - What the session is built with.
 * @returns The session, with its field designated.
 */
async function daily(days: number, internals: Parameters<typeof makeSession>[0] = {}): Promise<Harness> {
    const harness = makeSession(internals);
    const nodes = Array.from({ length: days + 1 }, (_, at) => ({ id: `n${String(at)}` }));
    const edges = Array.from({ length: days }, (_, at) => ({
        src: `n${String(at)}`,
        dst: `n${String(at + 1)}`,
        w: at * DAY,
    }));
    harness.add(nodes, edges);
    await harness.session.time.setField({ edges: { start: "w" } });
    return harness;
}

describe("time.series", () => {
    for (const mode of ["sliding", "cumulative"] as const) {
        for (const nodeTime of [false, true]) {
            it(`gives every window as a brute force counts it (${mode}, ${nodeTime ? "nodes and edges" : "edges"} timed, under a filter)`, async () => {
                const plain = seeded(80, 11, 1000, nodeTime);
                const { session } = plain.harness;
                await session.time.setField(
                    nodeTime ? { nodes: { start: "w" }, edges: { start: "w" } } : { edges: { start: "w" } },
                );
                await session.visibility.setSteps([
                    { id: "s1", on: true, rule: { kind: "categories", attribute: "data.kind", values: ["leaf"] } },
                ]);

                const { rows } = await session.time.series({ step: 90, mode, measures: ["nodes", "edges"] });
                assert.isAbove(rows.length, 5);
                let was = { nodes: new Set<number>(), edges: new Set<number>() };
                for (const row of rows) {
                    const now = shown(plain, row, nodeTime, new Set(["leaf"]));
                    assert.deepEqual(row.visible, { nodes: now.nodes.size, edges: now.edges.size });
                    assert.deepEqual(row.entered, {
                        nodes: outside(now.nodes, was.nodes),
                        edges: outside(now.edges, was.edges),
                    });
                    assert.deepEqual(row.left, {
                        nodes: outside(was.nodes, now.nodes),
                        edges: outside(was.edges, now.edges),
                    });
                    assert.deepEqual(row.values, { nodes: now.nodes.size, edges: now.edges.size });
                    was = now;
                }
            });
        }
    }

    it("covers the data by the same windows as stepping, a month at a time in a zone", async () => {
        const start = Date.UTC(2025, 0, 15);
        const harness = await daily(200);
        const { session } = harness;
        for (let row = 0; row < 200; row++) {
            (harness.edgeAttributes.get(row) as { w: number }).w = start + row * DAY;
        }
        harness.touch();
        await session.time.setField({ edges: { start: "w", unit: "ms" } });
        const { rows } = await session.time.series({ step: "month", timeZone: KOLKATA });

        await session.time.window({ step: "month", timeZone: KOLKATA });
        const stepped = [[session.time.current?.from, session.time.current?.to]];
        while (!session.time.atEnd) {
            const step = await session.time.stepBy(1);
            stepped.push([step.from, step.to]);
        }

        assert.isAbove(rows.length, 5);
        assert.deepEqual(
            rows.map((row) => [row.from, row.to]),
            stepped,
        );
    });

    it("starts and ends where it is told, and a cumulative series keeps that start", async () => {
        const { session } = await daily(20);
        const { rows } = await session.time.series({ step: DAY, from: 5 * DAY, to: 8 * DAY });
        assert.deepEqual(
            rows.map((row) => row.from),
            [5 * DAY, 6 * DAY, 7 * DAY],
        );
        const grown = await session.time.series({ step: DAY, mode: "cumulative", from: 5 * DAY, to: 8 * DAY });
        assert.deepEqual(
            grown.rows.map((row) => [row.from, row.to]),
            [
                [5 * DAY, 6 * DAY],
                [5 * DAY, 7 * DAY],
                [5 * DAY, 8 * DAY],
            ],
        );
    });

    it("takes the step, the mode and the missing rule of the window in force", async () => {
        const plain = seeded(30, 5, 100, false);
        const { session } = plain.harness;
        await session.time.setField({ edges: { start: "w" } });
        await session.time.window({ from: 0, to: 20, step: 20, mode: "cumulative", missing: "outside" });
        const { rows } = await session.time.series();
        assert.strictEqual(rows[1].to - rows[0].to, 20);
        assert.strictEqual(rows[1].from, rows[0].from);
        const untimed = plain.edges.filter((edge) => edge.w === undefined).length;
        const last = rows[rows.length - 1];
        assert.strictEqual(last.visible.edges, plain.edges.length - untimed);
    });

    it("gives sliding rows when asked, whatever the settings and the window in force say", async () => {
        const { session } = await daily(5);
        await session.time.setSettings({ mode: "cumulative" });
        const wanted = [
            [0, DAY],
            [DAY, 2 * DAY],
            [2 * DAY, 3 * DAY],
            [3 * DAY, 4 * DAY],
            [4 * DAY, 5 * DAY],
        ];
        const slid = await session.time.series({ step: DAY, mode: "sliding" });
        assert.deepEqual(
            slid.rows.map((row) => [row.from, row.to]),
            wanted,
        );
        assert.deepEqual(
            slid.rows.map((row) => row.visible.edges),
            [1, 1, 1, 1, 1],
        );

        await session.time.window({ from: 0, to: DAY, step: DAY, mode: "sliding" });
        const inForce = await session.time.series();
        assert.deepEqual(
            inForce.rows.map((row) => [row.from, row.to]),
            wanted,
        );
    });

    it("plays sliding windows when asked to, under cumulative settings", async () => {
        const { session } = await daily(5);
        await session.time.setSettings({ mode: "cumulative" });
        const steps = await new Promise<number[]>((resolve) => {
            const seen: number[] = [];
            const off = session.on("time:step", (step) => {
                seen.push(step.from);
                if (seen.length === 2) {
                    off();
                    resolve(seen);
                }
            });
            session.time.play({ motion: "steps", mode: "sliding", step: DAY, interval: 0 });
        });
        session.time.pause();
        assert.deepEqual(steps, [0, DAY]);
    });

    it("grows a cumulative series that starts before the data", async () => {
        const { session } = await daily(10);
        const { rows } = await session.time.series({ step: DAY, mode: "cumulative", from: -5 * DAY });
        assert.strictEqual(rows.length, 15);
        assert.isTrue(rows.every((row) => row.from === -5 * DAY));
        assert.deepEqual(
            rows.map((row) => row.visible.edges),
            [0, 0, 0, 0, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
        );
    });

    it("makes each window one step wide, whatever the width of the window in force", async () => {
        const { session } = await daily(6);
        await session.time.window({ from: 0, to: 3 * DAY, step: DAY });
        const { rows } = await session.time.series();
        assert.isTrue(rows.every((row) => row.to - row.from === DAY));
    });

    for (const directed of [true, false]) {
        for (const missing of ["inside", "outside"] as const) {
            // `carried`: the kind the field does not time holds the column too, so the index alone
            // cannot say what a window keeps and the series falls back to full passes.
            for (const [field, mode, carried] of [
                ["edges", "sliding", false],
                ["nodes", "sliding", false],
                ["both", "sliding", false],
                ["edges", "cumulative", false],
                ["nodes", "cumulative", false],
                ["both", "cumulative", false],
                ["edges", "sliding", true],
                ["nodes", "sliding", true],
                ["edges", "cumulative", true],
                ["nodes", "cumulative", true],
            ] as const) {
                it(`counts as a full pass does (${directed ? "directed" : "undirected"}, ${field}, ${mode}, missing ${missing}, self-loops${carried ? ", the other kind carrying the column" : ""})`, async () => {
                    const next = random(29);
                    const span = 600;
                    const timed = (): { w?: number } => (next() < 0.15 ? {} : { w: Math.floor(next() * span) });
                    const nodes = Array.from({ length: 40 }, (_, at) => ({
                        id: `n${String(at)}`,
                        kind: at % 4 === 0 ? "hub" : "leaf",
                        ...(field === "edges" && !carried ? {} : timed()),
                    }));
                    const edges = Array.from({ length: 160 }, (_, at) => {
                        const src = Math.floor(next() * 40);
                        return {
                            src: `n${String(src)}`,
                            // Every eighth edge is a self-loop.
                            dst: `n${String(at % 8 === 0 ? src : Math.floor(next() * 40))}`,
                            kind: at % 5 === 0 ? "weak" : "strong",
                            ...(field === "nodes" && !carried ? {} : timed()),
                        };
                    });
                    const harness = makeSession({ directed });
                    harness.add(nodes, edges);
                    const { session } = harness;
                    await session.time.setField({
                        ...(field === "edges" ? {} : { nodes: { start: "w" } }),
                        ...(field === "nodes" ? {} : { edges: { start: "w" } }),
                    });
                    await session.visibility.setSteps([
                        {
                            id: "s1",
                            on: true,
                            rule: { kind: "categories", attribute: "data.kind", values: ["leaf", "strong"] },
                        },
                    ]);
                    // A window sets what a series reads of `missing`; the step is narrower than a burst of rows.
                    await session.time.window({ from: 0, to: 70, step: 70, missing, mode });
                    const passes = slideCounters.full;
                    const { rows } = await session.time.series({ step: 70, measures: ["nodes"] });
                    assert.strictEqual(slideCounters.full > passes, carried);

                    let was = { nodes: new Array<number>(40).fill(0), edges: new Array<number>(160).fill(0) };
                    const gone = (now: readonly number[], then: readonly number[]): number =>
                        then.filter((shown, at) => shown === 1 && now[at] === 0).length;
                    for (const row of rows) {
                        await session.time.window({ from: row.from, to: row.to, step: 70, missing, mode });
                        const now = {
                            nodes: [...session.visibility.nodeMask()],
                            edges: [...session.visibility.edgeMask()],
                        };
                        assert.deepEqual(row.visible, {
                            nodes: now.nodes.filter((shown) => shown === 1).length,
                            edges: now.edges.filter((shown) => shown === 1).length,
                        });
                        assert.deepEqual(row.entered, {
                            nodes: gone(was.nodes, now.nodes),
                            edges: gone(was.edges, now.edges),
                        });
                        assert.deepEqual(row.left, {
                            nodes: gone(now.nodes, was.nodes),
                            edges: gone(now.edges, was.edges),
                        });
                        was = now;
                    }
                });
            }
        }
    }

    it("reads each timed row and its edges a bounded number of times, with no mask pass", async () => {
        const { harness } = seeded(200, 7, 1000, true);
        const { session } = harness;
        await session.time.setField({ nodes: { start: "w" }, edges: { start: "w" } });
        await session.time.ready;
        const graph = session.snapshot();
        // The masks on screen catch up on their first read: that pass is not the series'.
        assert.isNotNull(session.visibility.summary);
        const was = { ...slideCounters };
        const { rows } = await session.time.series({ step: 10 });
        assert.isAtLeast(rows.length, 100);
        // Twice across the window each, and a node crossing reads its edges in both directions.
        const bound = 2 * (graph.nodeCount + graph.edgeCount) + 4 * 2 * graph.edgeCount;
        assert.isAtMost(slideCounters.rows - was.rows, bound);
        assert.strictEqual(slideCounters.jumps, was.jumps);
        assert.strictEqual(slideCounters.full, was.full);
    });

    it("works out density, doubled for an undirected graph and null under two nodes", async () => {
        for (const [directed, density] of [
            [true, 1 / 2],
            [false, 1],
        ] as const) {
            const harness = makeSession({ directed });
            harness.add(
                [{ id: "a" }, { id: "b" }, { id: "c" }],
                [
                    { src: "a", dst: "b", w: 0 },
                    { src: "b", dst: "c", w: 0 },
                    { src: "a", dst: "c", w: 0 },
                    { src: "c", dst: "c", w: 500 },
                ],
            );
            await harness.session.time.setField({ edges: { start: "w" } });
            const { rows } = await harness.session.time.series({ step: 100, measures: ["density"] });
            assert.strictEqual(rows[0].values.density, density);
            assert.deepEqual(rows[rows.length - 1].visible, { nodes: 1, edges: 1 });
            assert.isNull(rows[rows.length - 1].values.density);
        }
    });

    it("leaves the masks, the window and history as they were", async () => {
        const { harness } = seeded(50, 3, 500, false);
        const { session } = harness;
        await session.time.setField({ edges: { start: "w" } });
        await session.time.window({ from: 100, to: 200, step: 100 });
        const nodes = [...session.visibility.nodeMask()];
        const edges = [...session.visibility.edgeMask()];
        const { position } = session.history;
        const { window } = session.visibility;
        let moved = 0;
        const stopStep = session.on("time:step", () => moved++);
        const stopChange = session.on("visibility:changed", () => moved++);

        await session.time.series({ step: 50, measures: ["density"] });

        stopStep();
        stopChange();
        assert.strictEqual(moved, 0);
        assert.deepEqual([...session.visibility.nodeMask()], nodes);
        assert.deepEqual([...session.visibility.edgeMask()], edges);
        assert.strictEqual(session.history.position, position);
        assert.strictEqual(session.visibility.window, window);
    });

    it("reports each window, and a cancel stops it after a counted number of them", async () => {
        const { session } = await daily(40);
        const run = session.time.series({
            step: DAY,
            onProgress: (progress) => {
                if (progress.completed === 3) {
                    run.cancel();
                }
            },
        });
        let refused: unknown = null;
        try {
            await run;
        } catch (error) {
            refused = error;
        }

        assert.strictEqual((refused as Error).name, "AbortError");
        assert.strictEqual(run.status, "canceled");
        assert.strictEqual(run.progress.completed, 3);
        assert.strictEqual(run.progress.total, 40);
    });

    it("waits for an index building in the background", async () => {
        const count = 50_000;
        const harness = makeSession();
        harness.add(Array.from({ length: count }, (_, at) => ({ id: `n${String(at)}`, w: at })));
        const { session } = harness;
        await session.time.setField({ nodes: { start: "w", unit: "ms" } });
        harness.add([{ id: "late", w: 2 * count }]);
        assert.isNull(session.time.extent());

        const { rows } = await session.time.series({ step: count });

        assert.strictEqual(rows[rows.length - 1].visible.nodes, 1);
        assert.isAbove(rows[rows.length - 1].to, 2 * count);
    });

    it("gives no rows when nothing has a time", async () => {
        const harness = await daily(4);
        harness.edgeAttributes.clear();
        harness.touch();
        const { rows } = await harness.session.time.series({ step: DAY });
        assert.isEmpty(rows);
    });

    it("refuses a measure it does not have, no field, more windows than it can hold, and a bad bound", async () => {
        const { session } = await daily(4);
        const refusal = async (start: () => PromiseLike<unknown>): Promise<unknown> => {
            try {
                await start();
            } catch (error) {
                return error;
            }

            return null;
        };
        const measure = await refusal(() => session.time.series({ measures: ["components" as "nodes"] }));
        assert.isTrue(isGraphtyError(measure) && measure.code === "E_BAD_COMMAND");
        const many = await refusal(() => session.time.series({ step: 0.001 }));
        assert.isTrue(isGraphtyError(many) && many.code === "E_OPTION_RANGE");
        const none = await refusal(() => makeSession().session.time.series());
        assert.isTrue(isGraphtyError(none) && none.code === "E_NO_TIME_FIELD");
        for (const option of ["from", "to"] as const) {
            for (const value of [Number.NaN, Infinity, -Infinity]) {
                const bound = await refusal(() => session.time.series({ step: DAY, [option]: value }));
                assert.deepEqual(isGraphtyError(bound) ? [bound.code, bound.details] : bound, [
                    "E_OPTION_RANGE",
                    { option, value },
                ]);
            }
        }
    });

    it("throws E_FEATURE_OFF with the experiment off", () => {
        setDefaultFeatures([]);
        const { session } = makeSession();
        let refused: unknown = null;
        try {
            void session.time.series();
        } catch (error) {
            refused = error;
        }

        assert.isTrue(isGraphtyError(refused) && refused.code === "E_FEATURE_OFF");
    });
});

describe("a stepped play with waitForRender", () => {
    /**
     * A renderer whose frames the test hands out one at a time.
     * @returns The source, and how to draw.
     */
    function heldFrames(): { renderedFrame: () => Promise<void>; asked: () => number; draw: () => void } {
        const waiting: (() => void)[] = [];
        let asked = 0;
        return {
            renderedFrame: () =>
                new Promise((resolve) => {
                    asked++;
                    waiting.push(resolve);
                }),
            asked: () => asked,
            draw: () => {
                waiting.shift()?.();
            },
        };
    }

    /**
     * Start a stepped play over fake timers.
     * @param frames - The frames.
     * @param waitForRender - The option; left out, the default.
     * @returns The steps seen so far, and the session.
     */
    async function played(
        frames: ReturnType<typeof heldFrames>,
        waitForRender?: boolean,
    ): Promise<{ steps: TimeStepEvent[]; harness: Harness }> {
        const harness = await daily(10, { internals: { renderedFrame: frames.renderedFrame } });
        const { session } = harness;
        await session.time.window({ from: 0, to: DAY, step: DAY });
        const steps: TimeStepEvent[] = [];
        session.on("time:step", (step) => steps.push(step));
        vi.useFakeTimers();
        session.time.play({
            interval: 10,
            motion: "steps",
            ...(waitForRender === undefined ? {} : { waitForRender }),
        });
        return { steps, harness };
    }

    it("makes no second step until a frame is drawn", async () => {
        const frames = heldFrames();
        const { steps, harness } = await played(frames, true);

        await vi.advanceTimersByTimeAsync(1000);
        assert.strictEqual(steps.length, 1);
        assert.strictEqual(frames.asked(), 1);

        frames.draw();
        await vi.advanceTimersByTimeAsync(10);
        assert.strictEqual(steps.length, 2);
        harness.session.time.pause();
    });

    for (const waits of [false, undefined]) {
        it(`keeps to the timer with waitForRender ${String(waits)}`, async () => {
            const frames = heldFrames();
            const { steps, harness } = await played(frames, waits);

            await vi.advanceTimersByTimeAsync(35);
            assert.strictEqual(steps.length, 3);
            assert.strictEqual(frames.asked(), 0);
            harness.session.time.pause();
        });
    }

    it("runs on a session with no renderer", async () => {
        const harness = await daily(10);
        await harness.session.time.window({ from: 0, to: DAY, step: DAY });
        const steps: TimeStepEvent[] = [];
        harness.session.on("time:step", (step) => steps.push(step));
        vi.useFakeTimers();
        harness.session.time.play({ interval: 10, motion: "steps", waitForRender: true });
        await vi.advanceTimersByTimeAsync(35);
        assert.strictEqual(steps.length, 3);
        harness.session.time.pause();
    });

    it("starts no timer for a play paused while a frame was awaited", async () => {
        const frames = heldFrames();
        const { steps, harness } = await played(frames, true);
        await vi.advanceTimersByTimeAsync(10);
        const { time } = harness.session;
        time.pause();
        time.play({ interval: 10, motion: "steps", waitForRender: true });
        await vi.advanceTimersByTimeAsync(10);
        assert.strictEqual(steps.length, 2);
        assert.strictEqual(frames.asked(), 2);

        // The first play's frame arrives: only the second play goes on.
        frames.draw();
        await vi.advanceTimersByTimeAsync(1000);
        assert.strictEqual(steps.length, 2);
        time.pause();
    });

    it("asks for no frame with the experiment off", () => {
        const frames = heldFrames();
        setDefaultFeatures([]);
        const { session } = makeSession({ internals: { renderedFrame: frames.renderedFrame } });
        let refused: unknown = null;
        try {
            session.time.play({ motion: "steps", waitForRender: true });
        } catch (error) {
            refused = error;
        }

        assert.isTrue(isGraphtyError(refused) && refused.code === "E_FEATURE_OFF");
        assert.strictEqual(frames.asked(), 0);
    });
});
