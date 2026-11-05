/**
 * The window's rule held by every way of moving it: after any step, jump, undo or redo the masks
 * equal a brute-force scan of design/data/timeline-attribute.md section 2.4, and `time.changes()`
 * equals a brute-force diff. A hand-passed window keeps what it gave before, and a `stepBy` costs
 * the rows it crossed, not the graph.
 */
import { assert, beforeAll, describe, it } from "vitest";

import { setDefaultFeatures } from "../../../src/features/resolve";
import { edgeSpaceOf } from "../../../src/session/scope/index";
import type { TimeField } from "../../../src/session/time/TimeApi";
import { timeIndexCounters } from "../../../src/session/time/timeIndex";
import { slideCounters } from "../../../src/session/visibility/slide";
import { assertScalesLinearly } from "../../helpers/cost";
import { type Harness, makeSession } from "../helpers";

// The timeline is an experiment: this file's sessions switch it on.
beforeAll(() => {
    setDefaultFeatures(["timeline"]);
});

const SPAN = 1000;

/** One case of the property. */
interface Case {
    readonly seed: number;
    readonly directed: boolean;
    readonly field: TimeField;
    readonly missing: "inside" | "outside";
    readonly ends: boolean;
    readonly hub: boolean;
    readonly filtered: boolean;
}

/** One graph's rows as the brute force reads them. */
interface Rows {
    readonly nodes: readonly { readonly t?: number; readonly kind: string }[];
    readonly edges: readonly { readonly t?: number; readonly heavy: boolean }[];
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
 * A graph where one element in eight carries no time; a hub graph sends half its edges to node 0.
 * @param test - The case.
 * @returns The session, and its rows in snapshot order.
 */
function graphOf(test: Case): { harness: Harness; rows: Rows } {
    const next = random(test.seed);
    const count = 40;
    const timeOf = (timed: boolean): { t?: number } =>
        timed && next() > 0.125 ? { t: Math.floor(next() * SPAN) } : {};
    const nodes = Array.from({ length: count }, (_, at) => ({
        id: `n${String(at)}`,
        kind: at % 3 === 0 ? "hub" : "leaf",
        ...timeOf(test.field.nodes !== undefined),
    }));
    const edges = Array.from({ length: 3 * count }, () => ({
        src: test.hub && next() < 0.5 ? "n0" : `n${String(Math.floor(next() * count))}`,
        dst: `n${String(Math.floor(next() * count))}`,
        heavy: next() > 0.4,
        ...timeOf(test.field.edges !== undefined),
    }));
    const harness = makeSession({ directed: test.directed });
    harness.add(nodes, edges);
    const graph = harness.session.snapshot();
    const byId = new Map(nodes.map((node) => [node.id, node]));
    const nodeRows = Array.from({ length: graph.nodeCount }, (_, row) => {
        const node = byId.get(graph.ids.idOf(row) as string);
        assert.isDefined(node);
        return node;
    });

    return { harness, rows: { nodes: nodeRows, edges } };
}

/**
 * The rule of section 2.4, written from the design and not from the code.
 * @param test - The case.
 * @param harness - The session, for the endpoints.
 * @param rows - The rows.
 * @param window - The window, or null for none.
 * @param window.from - Its start.
 * @param window.to - Its end.
 * @returns What must show, one byte per row.
 */
function bruteForce(
    test: Case,
    harness: Harness,
    rows: Rows,
    window: { from: number; to: number } | null,
): { nodes: number[]; edges: number[] } {
    const graph = harness.session.snapshot();
    const inside = (t: number | undefined): boolean => {
        if (window === null) {
            return true;
        }

        return t === undefined ? test.missing === "inside" : t >= window.from && t < window.to;
    };
    const edgePasses = rows.edges.map(
        (edge) => (!test.filtered || edge.heavy) && (test.field.edges === undefined || inside(edge.t)),
    );
    const counted = new Set<number>();
    edgePasses.forEach((passes, row) => {
        if (passes) {
            counted.add(graph.edgeSource(row));
            counted.add(graph.edgeTarget(row));
        }
    });
    const ends = test.ends && test.field.edges !== undefined && window !== null;
    const nodes = rows.nodes.map((node, row) =>
        (!test.filtered || node.kind === "leaf") &&
        (test.field.nodes === undefined || inside(node.t)) &&
        (!ends || counted.has(row))
            ? 1
            : 0,
    );
    const edges = edgePasses.map((passes, row) =>
        passes && nodes[graph.edgeSource(row)] === 1 && nodes[graph.edgeTarget(row)] === 1 ? 1 : 0,
    );

    return { nodes, edges };
}

/**
 * The session's masks, as plain arrays.
 * @param harness - The session.
 * @returns Both masks.
 */
function masks(harness: Harness): { nodes: number[]; edges: number[] } {
    const { visibility } = harness.session;
    return { nodes: [...visibility.nodeMask()], edges: [...visibility.edgeMask()] };
}

/**
 * The ids a move took in and out of view, by brute force.
 * @param harness - The session.
 * @param was - The masks before.
 * @param now - The masks after.
 * @returns The ids, sorted.
 */
function diffOf(
    harness: Harness,
    was: { nodes: number[]; edges: number[] },
    now: { nodes: number[]; edges: number[] },
): object {
    const graph = harness.session.snapshot();
    const space = edgeSpaceOf(graph);
    const rowsWhere = (before: number[], after: number[]): number[] =>
        after.flatMap((byte, row) => (byte === 1 && before[row] !== 1 ? [row] : []));
    const ids = (
        before: { nodes: number[]; edges: number[] },
        after: { nodes: number[]; edges: number[] },
    ): object => ({
        nodes: rowsWhere(before.nodes, after.nodes).map((row) => graph.ids.idOf(row)),
        edges: rowsWhere(before.edges, after.edges).map((row) => space.idOf(row)),
    });

    return { entered: ids(was, now), left: ids(now, was) };
}

const FIELDS: readonly TimeField[] = [
    { edges: { start: "t" } },
    { nodes: { start: "t" } },
    { nodes: { start: "t" }, edges: { start: "t" } },
];

/**
 * Every combination the property covers.
 * @returns The cases.
 */
function cases(): Case[] {
    const out: Case[] = [];
    let seed = 1;
    for (const field of FIELDS) {
        for (const directed of [true, false]) {
            for (const missing of ["inside", "outside"] as const) {
                for (const hub of [false, true]) {
                    seed++;
                    out.push({ seed, directed, field, missing, ends: field.edges !== undefined, hub, filtered: true });
                }

                seed++;
                out.push({ seed, directed, field, missing, ends: false, hub: false, filtered: false });
            }
        }
    }

    return out;
}

describe("the window's rule", () => {
    for (const test of cases()) {
        const label = `${Object.keys(test.field).join(" and ")} timed, ${test.directed ? "directed" : "undirected"}, missing ${test.missing}, ends ${String(test.ends)}, hub ${String(test.hub)}, filter ${String(test.filtered)}`;
        it(`holds after every move: ${label}`, async () => {
            const { harness, rows } = graphOf(test);
            const { session } = harness;
            const { time, visibility } = session;
            await time.setField(test.field);
            if (test.filtered) {
                await visibility.setSteps([
                    {
                        id: "kept",
                        on: true,
                        rule: {
                            kind: "all",
                            of: [
                                { kind: "categories", attribute: "data.kind", values: ["leaf"], nodes: "all" },
                                { kind: "edges", where: "heavy == `true`" },
                            ],
                        },
                    },
                ]);
            }

            await time.window({
                from: 300,
                to: 400,
                step: 10,
                nodes: test.ends ? "ends" : "all",
                missing: test.missing,
            });

            const next = random(test.seed * 31);
            const bounds = (): { from: number; to: number } | null => {
                const { window } = visibility;
                return window === null ? null : { from: Number(window.from), to: Number(window.to) };
            };
            const check = (what: string): void => {
                assert.deepEqual(masks(harness), bruteForce(test, harness, rows, bounds()), what);
            };

            check("the first window");
            for (let round = 0; round < 40; round++) {
                const was = masks(harness);
                const roll = next();
                if (roll < 0.4) {
                    await time.stepBy(next() < 0.5 ? 1 : -1);
                } else if (roll < 0.7) {
                    await time.seek(Math.floor(next() * SPAN));
                } else if (roll < 0.85) {
                    await time.window({
                        ...(visibility.window ?? {}),
                        from: Math.floor(next() * SPAN),
                        to: Math.floor(next() * SPAN) + SPAN,
                    });
                } else {
                    await session.undo();
                    check(`undo in round ${String(round)}`);
                    await session.redo();
                    check(`redo in round ${String(round)}`);
                    continue;
                }

                check(`round ${String(round)}`);
                const seen = time.changes();
                const sorted = (ids: readonly unknown[]): unknown[] => [...ids].sort();
                const brute = diffOf(harness, was, masks(harness)) as typeof seen;
                for (const side of ["entered", "left"] as const) {
                    assert.deepEqual(sorted(seen[side].nodes), sorted(brute[side].nodes), `${side} nodes`);
                    assert.deepEqual(sorted(seen[side].edges), sorted(brute[side].edges), `${side} edges`);
                }
            }

            session.dispose();
        });
    }

    it("counts an edge for a node only when it passes the filter too", async () => {
        const harness = makeSession({ directed: true });
        harness.add(
            [{ id: "a" }, { id: "b" }, { id: "c" }],
            [
                { src: "a", dst: "b", t: 5, heavy: true },
                { src: "b", dst: "c", t: 5, heavy: false },
            ],
        );
        const { time, visibility } = harness.session;
        await time.setField({ edges: { start: "t" } });
        await visibility.setSteps([{ id: "s", on: true, rule: { kind: "edges", where: "heavy == `true`" } }]);
        await time.window({ from: 0, to: 10 });
        assert.deepEqual([...visibility.nodeMask()], [1, 1, 0], "c's only edge is filtered out");
        harness.session.dispose();
    });

    it("leaves a kind the field does not time alone, though it holds the column's name", async () => {
        const harness = makeSession({ directed: true });
        harness.add(
            [
                { id: "a", t: 5 },
                { id: "b", t: 5 },
            ],
            [{ src: "a", dst: "b", t: 500 }],
        );
        const { time, visibility } = harness.session;
        await time.setField({ nodes: { start: "t" } });
        await time.window({ from: 0, to: 10 });
        assert.deepEqual([...visibility.edgeMask()], [1]);
        harness.session.dispose();
    });

    it("gives a hand-passed window what it gave before", async () => {
        const harness = makeSession({ directed: true });
        harness.add(
            [{ id: "a" }, { id: "b" }, { id: "c" }],
            [
                { src: "a", dst: "b", t: 5, other: 500 },
                { src: "b", dst: "c", t: 50, other: 5 },
            ],
        );
        const { time, visibility } = harness.session;
        await time.setField({ edges: { start: "t" } });
        await time.window({ from: 0, to: 10 });
        await visibility.setWindow({ attribute: "data.other", from: 0, to: 10 });
        assert.deepEqual([...visibility.edgeMask()], [0, 1]);
        assert.deepEqual([...visibility.nodeMask()], [1, 1, 1], "`nodes` was not asked for");
        await visibility.setWindow({ attribute: "data.t", from: 0, to: 10 });
        assert.deepEqual([...visibility.edgeMask()], [1, 0]);
        await time.stepBy(1);
        await visibility.setWindow(null);
        assert.deepEqual([...visibility.edgeMask()], [1, 1]);
        harness.session.dispose();
    });

    it("rolls a slide back when the recording fails, and evaluates a window the slide did not reach", async () => {
        const harness = makeSession({ directed: true });
        harness.add(
            [{ id: "a" }, { id: "b" }],
            [
                { src: "a", dst: "b", t: 5 },
                { src: "a", dst: "b", t: 15 },
            ],
        );
        const { time, visibility } = harness.session;
        await time.setField({ edges: { start: "t" } });
        await time.window({ from: 0, to: 10, step: 10 });
        await time.seek(10, { commit: false });
        assert.deepEqual([...visibility.edgeMask()], [0, 1]);
        // Same bounds as the slide but another `nodes`: the masks are not that window's.
        await visibility.setWindow({
            ...(visibility.window ?? { attribute: "data.t" }),
            from: 10,
            to: 20,
            nodes: "all",
        });
        assert.deepEqual([...visibility.edgeMask()], [0, 1]);
        assert.deepEqual([...visibility.nodeMask()], [1, 1]);
        harness.session.dispose();
    });
});

describe("the work of a move", () => {
    /**
     * A ring of `size` edges, one instant per row.
     * @param size - How many.
     * @returns The session with a window open.
     */
    async function ring(size: number): Promise<Harness> {
        const harness = makeSession({ directed: true });
        harness.add(
            Array.from({ length: size }, (_, at) => ({ id: `n${String(at)}` })),
            Array.from({ length: size }, (_, at) => ({
                src: `n${String(at)}`,
                dst: `n${String((at + 1) % size)}`,
                w: at,
            })),
        );
        await harness.session.time.setField({ edges: { start: "w" } });
        await harness.session.time.window({ from: 0, to: 40, step: 7 });
        return harness;
    }

    it("a stepBy visits the rows it crossed and runs no full pass", async () => {
        await assertScalesLinearly(
            async (size) => {
                const harness = await ring(size);
                await harness.session.time.stepBy(1);
                const { full, jumps } = slideCounters;
                const { rows } = slideCounters;
                await harness.session.time.stepBy(1);
                await harness.session.time.seek(30);
                assert.strictEqual(slideCounters.full, full, "no evaluate");
                assert.strictEqual(slideCounters.jumps, jumps, "no jump");
                return slideCounters.rows - rows;
            },
            { sizes: [2_000, 8_000], growth: "constant", counter: "rows a stepBy visits" },
        );
    });

    it("a move over budget jumps, with no full pass", async () => {
        const harness = await ring(800);
        await harness.session.time.stepBy(1);
        const { full, jumps } = slideCounters;
        await harness.session.time.seek(500);
        assert.strictEqual(slideCounters.full, full);
        assert.strictEqual(slideCounters.jumps, jumps + 1);
        assert.strictEqual(harness.session.visibility.summary.visibleEdges, 40);
        harness.session.dispose();
    });

    it("a node-timed hub's move counts its degree against the budget", async () => {
        const harness = makeSession({ directed: true });
        const leaves = Array.from({ length: 200 }, (_, at) => ({ id: `n${String(at)}`, t: 1000 }));
        harness.add(
            [{ id: "hub", t: 15 }, ...leaves],
            leaves.map(({ id }) => ({ src: "hub", dst: id })),
        );
        const { time, visibility } = harness.session;
        await time.setField({ nodes: { start: "t" } });
        await time.window({ from: 0, to: 10, step: 10 });
        await time.stepBy(1);
        await time.stepBy(1);
        const { jumps } = slideCounters;
        await time.stepBy(-1);
        assert.strictEqual(slideCounters.jumps, jumps + 1, "one node crossed, 200 edges to test");
        assert.strictEqual(visibility.summary.visibleNodes, 1);
        harness.session.dispose();
    });

    it("undo after a 50-step play returns to the start, in one history entry", async () => {
        const harness = await ring(400);
        const { session } = harness;
        const { time } = session;
        const start = [...session.visibility.edgeMask()];
        const { position } = session.history;
        let plays = 0;
        const ended = new Promise<void>((resolve) => {
            session.on("time:step", () => {
                plays++;
                if (plays === 50) {
                    time.pause();
                    resolve();
                }
            });
        });
        time.play({ motion: "steps", interval: 0 });
        await ended;
        assert.strictEqual(session.history.position, position + 1);
        await session.undo();
        assert.strictEqual(session.visibility.window?.from, 0);
        assert.deepEqual([...session.visibility.edgeMask()], start);
        session.dispose();
    });
});

describe("bins of what passes the filter", () => {
    /**
     * Four edges on four days, the last with a filtered-out end.
     * @returns The session, with edges timed and the filter on.
     */
    async function filtered(): Promise<Harness> {
        const harness = makeSession({ directed: true });
        harness.add(
            [{ id: "a" }, { id: "b" }, { id: "c", gone: "yes" }],
            [
                { src: "a", dst: "b", t: 0, heavy: true },
                { src: "a", dst: "b", t: 10, heavy: false },
                { src: "a", dst: "b", t: 20, heavy: true },
                { src: "b", dst: "c", t: 30, heavy: true },
            ],
        );
        await harness.session.time.setField({ edges: { start: "t", unit: "ms" } });
        await harness.session.visibility.setSteps([
            { id: "e", on: true, rule: { kind: "edges", where: "heavy == `true`" } },
            {
                id: "n",
                on: true,
                rule: { kind: "not", of: { kind: "categories", attribute: "data.gone", values: ["yes"] } },
            },
        ]);
        return harness;
    }

    it("holds the filtered count outside the window, and drops what the filter hides", async () => {
        const harness = await filtered();
        const { time } = harness.session;
        const counts = (): number[] => (time.bins({ step: 10, scope: "visible" }) ?? []).map((bin) => bin.edges);
        assert.deepEqual(counts(), [1, 0, 1, 0]);
        await time.window({ from: 0, to: 10, step: 10 });
        assert.deepEqual(counts(), [1, 0, 1, 0], "the window does not narrow it");
        harness.session.dispose();
    });

    it("costs nothing on a step, and follows a filter change", async () => {
        const harness = await filtered();
        const { time, visibility } = harness.session;
        await time.window({ from: 0, to: 10, step: 10 });
        time.bins({ step: 10, scope: "visible" });
        const rows = timeIndexCounters.binned;
        await time.stepBy(1);
        await time.seek(20, { commit: false });
        const after = time.bins({ step: 10, scope: "visible" });
        assert.strictEqual(timeIndexCounters.binned, rows, "the counts come from the cache");
        assert.deepEqual(
            after?.map((bin) => bin.edges),
            [1, 0, 1, 0],
        );

        await visibility.setSteps([]);
        assert.deepEqual(
            time.bins({ step: 10, scope: "visible" })?.map((bin) => bin.edges),
            [1, 1, 1, 1],
        );
        harness.session.dispose();
    });
});
