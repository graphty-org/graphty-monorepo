/**
 * The window's rule held by every way of moving it: after any step, jump, undo or redo the masks
 * equal a brute-force scan of design/data/timeline-attribute.md section 2.4, after a move through
 * `session.time` its `changes()` equals a brute-force diff, and undo and redo leave `changes()` as
 * the last such move left it. A hand-passed window keeps what it gave before, and a `stepBy` costs
 * the rows it crossed, not the graph.
 */
import type { GraphSnapshot } from "@graphty/graph-format";
import { assert, beforeAll, describe, it, vi } from "vitest";

import { createGraphSession, type GraphSession } from "../../../session";
import { setDefaultFeatures } from "../../../src/features/resolve";
import { dispatcherOf } from "../../../src/session/GraphSession";
import { createRunResult } from "../../../src/session/results";
import type { RunExecutionContext, RunOutcome } from "../../../src/session/runs";
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
 * A graph where one element in eight carries no time and the last four nodes have no edges; a hub
 * graph sends half its edges to node 0.
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
    const connected = count - 4;
    const edges = Array.from({ length: 3 * count }, () => ({
        src: test.hub && next() < 0.5 ? "n0" : `n${String(Math.floor(next() * connected))}`,
        dst: `n${String(Math.floor(next() * connected))}`,
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
    // An edge counts for its ends by the filter and the window, its own time or none.
    const counted = new Set<number>();
    rows.edges.forEach((edge, row) => {
        if ((!test.filtered || edge.heavy) && inside(edge.t)) {
            counted.add(graph.edgeSource(row));
            counted.add(graph.edgeTarget(row));
        }
    });
    const ends = test.ends && window !== null;
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
 * @param graph - The snapshot the masks describe.
 * @param was - The masks before.
 * @param now - The masks after.
 * @returns The ids, sorted.
 */
function diffOf(
    graph: GraphSnapshot,
    was: { nodes: number[]; edges: number[] },
    now: { nodes: number[]; edges: number[] },
): object {
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
                    for (const ends of [false, true]) {
                        seed++;
                        out.push({ seed, directed, field, missing, ends, hub, filtered: true });
                    }
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
            const keep = [
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
            ] as const;
            let now = test;
            if (test.filtered) {
                await visibility.setSteps(keep);
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
                assert.deepEqual(masks(harness), bruteForce(now, harness, rows, bounds()), what);
            };

            check("the first window");
            for (let round = 0; round < 40; round++) {
                const was = masks(harness);
                const roll = next();
                if (roll < 0.4) {
                    await time.stepBy(next() < 0.5 ? 1 : -1);
                } else if (roll < 0.7) {
                    await time.seek(Math.floor(next() * SPAN));
                } else if (roll < 0.8) {
                    await time.window({
                        ...(visibility.window ?? {}),
                        from: Math.floor(next() * SPAN),
                        to: Math.floor(next() * SPAN) + SPAN,
                    });
                } else if (roll < 0.9) {
                    now = { ...now, filtered: !now.filtered };
                    await visibility.setSteps(now.filtered ? keep : []);
                    check(`the filter in round ${String(round)}`);
                    continue;
                } else {
                    const left = time.changes();
                    await session.undo();
                    now = { ...now, filtered: visibility.steps.length > 0 };
                    check(`undo in round ${String(round)}`);
                    await session.redo();
                    now = { ...now, filtered: visibility.steps.length > 0 };
                    check(`redo in round ${String(round)}`);
                    assert.strictEqual(time.changes(), left, "the last move through session.time");
                    continue;
                }

                check(`round ${String(round)}`);
                const seen = time.changes();
                const sorted = (ids: readonly unknown[]): unknown[] => [...ids].sort();
                const brute = diffOf(harness.session.snapshot(), was, masks(harness)) as typeof seen;
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

    it("hides a node with no edge the same way, however a node-timed window was reached", async () => {
        const harness = makeSession({ directed: true });
        harness.add(
            [
                { id: "a", t: 10 },
                { id: "b", t: 12 },
                { id: "c", t: 30 },
                { id: "d", t: 31 },
                { id: "e", t: 32 },
            ],
            [
                { src: "a", dst: "b" },
                { src: "d", dst: "e" },
            ],
        );
        const { time, visibility } = harness.session;
        await time.setField({ nodes: { start: "t" } });
        await time.window({ from: 0, to: 20, step: 20, nodes: "ends" });
        await time.stepBy(1);
        assert.deepEqual([...visibility.nodeMask()], [0, 0, 0, 1, 1], "stepped: c has no edge");
        await time.window({ from: 20, to: 40, step: 20, nodes: "ends" });
        assert.deepEqual([...visibility.nodeMask()], [0, 0, 0, 1, 1], "set directly");
        await time.seek(0, { commit: false });
        assert.deepEqual([...visibility.nodeMask()], [1, 1, 0, 0, 0], "slid back");
        harness.session.dispose();
    });

    it("counts an untimed edge for its ends only when the window keeps what has no time", async () => {
        const harness = makeSession({ directed: true });
        harness.add(
            [
                { id: "a", t: 5 },
                { id: "b", t: 6 },
            ],
            [{ src: "a", dst: "b" }],
        );
        const { time, visibility } = harness.session;
        await time.setField({ nodes: { start: "t" } });
        await time.window({ from: 0, to: 10, step: 10, nodes: "ends", missing: "outside" });
        assert.deepEqual([...visibility.nodeMask()], [0, 0]);
        await time.window({ from: 0, to: 10, step: 10, nodes: "ends", missing: "inside" });
        assert.deepEqual([...visibility.nodeMask()], [1, 1]);
        harness.session.dispose();
    });

    it("follows a new reading of the field, though the masks were not rewritten", async () => {
        const harness = makeSession({ directed: true });
        harness.add(
            [{ id: "a" }, { id: "b" }, { id: "c" }],
            [
                { src: "a", dst: "b", t: 5 },
                { src: "b", dst: "c", t: 50 },
            ],
        );
        const { config, time, visibility } = harness.session;
        await time.setField({ edges: { start: "t", unit: "ms" } });
        await time.window({ from: 0, to: 100, step: 100, nodes: "all" });
        await time.stepBy(1);
        await time.stepBy(-1);
        await config.set({ data: { knownFields: { edgeTimeUnit: "s" } } });
        await time.window({ from: 0, to: 10_000, step: 10_000, nodes: "all" });
        assert.deepEqual([...visibility.edgeMask()], [1, 0], "5 s is inside, 50 s is not");
        harness.session.dispose();
    });

    for (const [name, move] of [
        ["a seek", (time: GraphSession["time"]) => time.seek(30)],
        ["a window", (time: GraphSession["time"]) => time.window({ from: 30, to: 50, step: 20, nodes: "all" })],
    ] as const) {
        it(`names what ${name} changed by the graph it moved on, when a removal lands as it records`, async () => {
            const session = createGraphSession({ features: ["timeline"] });
            await session.data.addNodes(["a", "b", "c", "d", "e"].map((id, at) => ({ id, t: at * 10 })));
            await session.data.addEdges([
                { source: "a", target: "b" },
                { source: "d", target: "e" },
            ]);
            await session.time.setField({ nodes: { start: "t" } });
            await session.time.window({ from: 0, to: 20, step: 20, nodes: "all" });
            const graph = session.snapshot();
            const read = (): { nodes: number[]; edges: number[] } => ({
                nodes: [...session.visibility.nodeMask()],
                edges: [...session.visibility.edgeMask()],
            });
            const was = read();
            const moved = move(session.time);
            const brute = diffOf(graph, was, read()) as ReturnType<typeof session.time.changes>;
            const removed = session.data.removeNodes(["a", "b"]);
            await Promise.all([moved, removed]);
            assert.deepEqual(session.time.changes(), brute);
            session.dispose();
        });
    }

    it("reads a kind the field does not time by name, moved or passed by hand", async () => {
        const harness = makeSession({ directed: true });
        harness.add(
            [
                { id: "a", t: 1000 },
                { id: "b", t: 1000 },
                { id: "c", t: 9000 },
                { id: "d", t: 9000 },
            ],
            [
                { src: "a", dst: "b", t: 1000 },
                { src: "b", dst: "c", t: 2000 },
                { src: "c", dst: "d", t: 9000 },
            ],
        );
        const { time, visibility } = harness.session;
        await time.setField({ edges: { start: "t", unit: "ms" } });
        await visibility.setWindow({ attribute: "data.t", from: 0, to: 5000 });
        assert.deepEqual([...visibility.nodeMask()], [1, 1, 0, 0], "a node's own record still counts");
        assert.deepEqual([...visibility.edgeMask()], [1, 0, 0]);

        const { jumps } = slideCounters;
        const { full } = slideCounters;
        await time.window({ from: 5000, to: 10_000, step: 1000, nodes: "all" });
        await time.stepBy(-1);
        await time.stepBy(1);
        assert.deepEqual([...visibility.nodeMask()], [0, 0, 1, 1], "the same rule as a move");
        assert.deepEqual([...visibility.edgeMask()], [0, 0, 1]);
        assert.isAbove(slideCounters.full, full + 2, "every move reads the records in a full pass");
        assert.strictEqual(slideCounters.jumps, jumps);
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

    it("puts the recorded window back when the recording fails", async () => {
        const harness = makeSession({ directed: true });
        harness.add(
            [{ id: "a" }, { id: "b" }],
            [
                { src: "a", dst: "b", t: 5 },
                { src: "a", dst: "b", t: 15 },
            ],
        );
        const { session } = harness;
        const { time, visibility } = session;
        await time.setField({ edges: { start: "t" } });
        await time.window({ from: 0, to: 10, step: 10 });
        const recorded = [...visibility.edgeMask()];
        assert.deepEqual(recorded, [1, 0]);

        const refusal = new Error("refused");
        const dispatch = vi.spyOn(dispatcherOf(session), "dispatch");
        for (const move of [() => time.stepBy(1), () => time.window({ from: 10, to: 20, step: 10 })]) {
            dispatch.mockRejectedValueOnce(refusal);
            const failed = await Promise.resolve(move()).then(
                () => null,
                (error: unknown) => error,
            );
            assert.include(String(failed), "refused");
            assert.strictEqual(visibility.window?.from, 0);
            assert.deepEqual([...visibility.edgeMask()], recorded);
        }

        dispatch.mockRestore();
        harness.session.dispose();
    });

    it("keeps a run's result the same as a full pass when the masks are adopted", async () => {
        const harness = makeSession({ directed: true });
        harness.add(
            [
                { id: "a", t: 5 },
                { id: "b", t: 5 },
                { id: "c", t: 20 },
            ],
            [{ src: "a", dst: "b", w: 1 }],
        );
        const { time, visibility } = harness.session;
        await time.setField({ nodes: { start: "t" } });
        await visibility.set({ kind: "range", attribute: "data.w", min: 0, max: 2 });
        const gap = await time.window({ from: 15, to: 25, step: 10 });
        assert.deepEqual(gap.unresolvedPaths, ["data.w"], "no edge got past its ends");

        const adopted = await time.window({ from: 0, to: 10, step: 10 });
        assert.strictEqual(adopted.visible.edges, 1);
        const full = await visibility.setWindow({ attribute: "data.t", from: 0, to: 11 });
        assert.deepEqual(adopted.unresolvedPaths, full.unresolvedPaths);
        harness.session.dispose();
    });
});

describe("what a slide's masks are compared against", () => {
    /**
     * Two edges inside the slide's window and out of it, one node pair per edge so `nodes` shows,
     * and one edge with no time.
     * @returns The session, slid to [10, 20) over a recorded [0, 10).
     */
    async function slid(): Promise<Harness> {
        const harness = makeSession({ directed: true });
        harness.add(
            ["a", "b", "c", "d", "e", "f", "g", "h"].map((id) => ({ id })),
            [
                { src: "a", dst: "b", t: 5, u: 15 },
                { src: "c", dst: "d", t: 15, u: 5 },
                { src: "e", dst: "f", t: 25, u: 5 },
                { src: "g", dst: "h", u: 5 },
            ],
        );
        const { time } = harness.session;
        await time.setField({ edges: { start: "t" } });
        await time.window({ from: 0, to: 10, step: 10, missing: "outside" });
        await time.seek(10, { commit: false });
        return harness;
    }

    const SLID = { attribute: "data.t", from: 10, to: 20, step: 10, nodes: "ends", missing: "outside" } as const;

    /**
     * Assert the masks.
     * @param harness - The session.
     * @param nodes - The nodes that show, as letters.
     * @param edges - The edges that show.
     */
    function shows(harness: Harness, nodes: string, edges: number[]): void {
        const { visibility } = harness.session;
        const letters = "abcdefgh".split("");
        assert.strictEqual(letters.filter((_, row) => visibility.nodeMask()[row] === 1).join(""), nodes);
        assert.deepEqual([...visibility.edgeMask()], edges);
    }

    it("adopts the window it slid to", async () => {
        const harness = await slid();
        shows(harness, "cd", [0, 1, 0, 0]);
        const { full } = slideCounters;
        await harness.session.visibility.setWindow(SLID);
        assert.strictEqual(slideCounters.full, full, "no pass");
        shows(harness, "cd", [0, 1, 0, 0]);
        harness.session.dispose();
    });

    for (const [part, change, nodes, edges] of [
        ["start", { from: 0 }, "abcd", [1, 1, 0, 0]],
        ["end", { to: 30 }, "cdef", [0, 1, 1, 0]],
        ["nodes", { nodes: "all" }, "abcdefgh", [0, 1, 0, 0]],
        ["missing", { missing: "inside" }, "cdgh", [0, 1, 0, 1]],
        ["attribute", { attribute: "data.u" }, "ab", [1, 0, 0, 0]],
    ] as const) {
        it(`evaluates a window with another ${part}`, async () => {
            const harness = await slid();
            await harness.session.visibility.setWindow({ ...SLID, ...change });
            shows(harness, nodes, [...edges]);
            harness.session.dispose();
        });
    }

    /**
     * Slide onto the window the project records, so only what the masks were read from can differ.
     * @returns The session.
     */
    async function onRecorded(): Promise<Harness> {
        const harness = await slid();
        const { time } = harness.session;
        await time.commit();
        await time.seek(10, { commit: false });
        return harness;
    }

    it("evaluates when the filter changed", async () => {
        const harness = await onRecorded();
        const { time, visibility } = harness.session;
        await visibility.set({ kind: "member", of: { nodes: ["c", "d"] } });
        await time.seek(10, { commit: false });
        shows(harness, "cd", [0, 1, 0, 0]);
        await visibility.set({ kind: "member", of: { nodes: ["a"] } });
        shows(harness, "", [0, 0, 0, 0]);
        harness.session.dispose();
    });

    it("evaluates when what the filter reads changed", async () => {
        const harness = await slid();
        const { session } = harness;
        await session.time.commit();
        const set = session.sets.create({ kind: "fixed", nodes: ["c", "d"], reading: "induced" }, { name: "Kept" });
        await session.visibility.set({ kind: "member", of: { set } });
        await session.time.seek(10, { commit: false });
        shows(harness, "cd", [0, 1, 0, 0]);
        session.sets.redefine(set, { kind: "fixed", nodes: ["a"], reading: "induced" });
        shows(harness, "", [0, 0, 0, 0]);
        session.dispose();
    });

    it("evaluates when the data changed", async () => {
        const harness = await onRecorded();
        harness.add([], [{ src: "e", dst: "f", t: 12 }]);
        shows(harness, "cdef", [0, 1, 0, 0, 1]);
        harness.session.dispose();
    });
});

describe("a slide whose filter's inputs change", () => {
    it("follows a redefined set, though the masks were empty", async () => {
        const harness = makeSession({ directed: true });
        harness.add(
            [{ id: "a" }, { id: "b" }, { id: "c" }],
            [
                { src: "a", dst: "b", t: 5 },
                { src: "b", dst: "c", t: 15 },
            ],
        );
        const { session } = harness;
        const { time, visibility } = session;
        await time.setField({ edges: { start: "t" } });
        const set = session.sets.create({ kind: "fixed", nodes: ["a"], reading: "induced" }, { name: "Kept" });
        await visibility.set({ kind: "member", of: { set } });
        await time.window({ from: 100, to: 110, step: 10, nodes: "ends" });
        await time.stepBy(1);
        assert.strictEqual(visibility.summary.visibleNodes, 0);

        session.sets.redefine(set, { kind: "fixed", nodes: ["b", "c"], reading: "induced" });
        await time.seek(10);
        assert.deepEqual([...visibility.nodeMask()], [0, 1, 1]);
        assert.deepEqual([...visibility.edgeMask()], [0, 1]);
        session.dispose();
    });

    it("follows a run read again, though the masks were empty", async () => {
        let scores = new Map([
            ["c", 5],
            ["d", 5],
        ]);
        const harness: Harness = makeSession({
            directed: true,
            runs: { execute: (context) => Promise.resolve(scored(context, harness.store.getSnapshot(), scores)) },
        });
        harness.add([
            { id: "a", t: 0 },
            { id: "b", t: 0 },
            { id: "c", t: 100 },
            { id: "d", t: 100 },
        ]);
        const { session } = harness;
        const { time, visibility } = session;
        await time.setField({ nodes: { start: "t" } });
        await session.runs.start("degree", {}, { as: "score", style: false });
        await visibility.set({ kind: "expression", where: "results.score.value > `1`" });
        await time.window({ from: 50, to: 60, step: 10 });
        await time.stepBy(1);
        assert.strictEqual(visibility.summary.visibleNodes, 0);

        scores = new Map();
        await session.runs.get("score")?.rerun();
        await time.seek(100);
        assert.deepEqual([...visibility.nodeMask()], [0, 0, 0, 0]);
        session.dispose();
    });
});

/**
 * A fake run that publishes each node's score.
 * @param context - The run.
 * @param graph - The graph when the run starts.
 * @param scores - The scores by id.
 * @returns Its outcome.
 */
function scored(context: RunExecutionContext, graph: GraphSnapshot, scores: ReadonlyMap<string, number>): RunOutcome {
    const ids = Array.from({ length: graph.nodeCount }, (_, row) => graph.ids.idOf(row));
    return {
        result: createRunResult({
            runId: context.runId,
            shape: "node-metric",
            fields: [
                {
                    name: "value",
                    plainName: "value",
                    technicalName: "value",
                    kind: "node",
                    type: "number",
                    path: `results.${context.runId}.value`,
                },
            ],
            measured: { nodes: graph.nodeCount, edges: graph.edgeCount },
            nodes: ids.map((id) => ({ id, values: { value: scores.get(String(id)) ?? 0 } })),
            caveats: { exact: true, direction: "as-loaded", precision: "f64", method: "fake", facts: [], notes: [] },
            durationMs: 1,
        }),
    };
}

describe("a window over a graph that changes between moves", () => {
    for (const seed of [11, 12, 13, 14]) {
        it(`holds after removals and a run read again: seed ${String(seed)}`, async () => {
            const next = random(seed);
            const pick = (count: number): number => Math.floor(next() * count);
            let scores = new Map<string, number>();
            const session = createGraphSession({
                features: ["timeline"],
                runs: { execute: (context) => Promise.resolve(scored(context, session.snapshot(), scores)) },
            });
            const nodes = new Map(Array.from({ length: 30 }, (_, at) => [`n${String(at)}`, pick(SPAN)]));
            /** Each edge's time by its ends, one edge per pair of ends. */
            const edges = new Map<string, number>();
            while (edges.size < 90) {
                edges.set(`n${String(pick(30))}>n${String(pick(30))}`, pick(SPAN));
            }

            const reroll = (): void => {
                scores = new Map([...nodes.keys()].map((id) => [id, next() < 0.7 ? 5 : 0]));
            };
            reroll();
            await session.data.addNodes([...nodes].map(([id, t]) => ({ id, t })));
            await session.data.addEdges(
                [...edges].map(([ends, t]) => {
                    const [source, target] = ends.split(">");
                    return { source, target, t };
                }),
            );
            await session.time.setField({ nodes: { start: "t" }, edges: { start: "t" } });
            await session.runs.start("degree", {}, { as: "score", style: false });
            await session.visibility.set({ kind: "expression", where: "results.score.value > `1`" });
            await session.time.window({ from: 300, to: 500, step: 25, nodes: "ends" });

            const check = (what: string): void => {
                const graph = session.snapshot();
                const { window } = session.visibility;
                const inside = (t: number | undefined): boolean =>
                    t !== undefined && t >= Number(window?.from) && t < Number(window?.to);
                const ends = new Set([...edges].flatMap(([key, t]) => (inside(t) ? key.split(">") : [])));
                const shows = (id: string): boolean =>
                    (scores.get(id) ?? 0) > 1 && inside(nodes.get(id)) && ends.has(id);
                const nodeMask = session.visibility.nodeMask();
                const edgeMask = session.visibility.edgeMask();
                assert.strictEqual(graph.nodeCount, nodes.size, what);
                assert.strictEqual(graph.edgeCount, edges.size, what);
                for (let row = 0; row < graph.nodeCount; row++) {
                    const id = String(graph.ids.idOf(row));
                    assert.strictEqual(nodeMask[row] === 1, shows(id), `${what}: node ${id}`);
                }

                for (let row = 0; row < graph.edgeCount; row++) {
                    const source = String(graph.ids.idOf(graph.edgeSource(row)));
                    const target = String(graph.ids.idOf(graph.edgeTarget(row)));
                    const key = `${source}>${target}`;
                    assert.strictEqual(
                        edgeMask[row] === 1,
                        inside(edges.get(key)) && shows(source) && shows(target),
                        `${what}: edge ${key}`,
                    );
                }
            };
            const removeEdge = async (key: string): Promise<void> => {
                const graph = session.snapshot();
                const space = edgeSpaceOf(graph);
                const [source, target] = key.split(">");
                const row = Array.from({ length: graph.edgeCount }, (_, at) => at).find(
                    (at) =>
                        String(graph.ids.idOf(graph.edgeSource(at))) === source &&
                        String(graph.ids.idOf(graph.edgeTarget(at))) === target,
                );
                assert.isDefined(row);
                edges.delete(key);
                await session.data.removeEdges([space.idOf(row)]);
            };

            check("the first window");
            for (let round = 0; round < 30; round++) {
                const roll = next();
                if (roll < 0.35) {
                    await session.time.stepBy(next() < 0.5 ? 1 : -1);
                } else if (roll < 0.6) {
                    await session.time.seek(pick(SPAN));
                } else if (roll < 0.75) {
                    reroll();
                    await session.runs.get("score")?.rerun();
                } else if (roll < 0.9) {
                    await removeEdge([...edges.keys()][pick(edges.size)]);
                } else {
                    const id = [...nodes.keys()][pick(nodes.size)];
                    nodes.delete(id);
                    for (const key of [...edges.keys()]) {
                        if (key.split(">").includes(id)) {
                            edges.delete(key);
                        }
                    }

                    await session.data.removeNodes([id]);
                }

                check(`round ${String(round)}`);
            }

            session.dispose();
        });
    }
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
                assert.isAbove(slideCounters.rows, rows, "and the rows it visited were counted");
                return slideCounters.rows - rows;
            },
            { sizes: [2_000, 8_000], growth: "constant", counter: "rows a stepBy visits" },
        );
    });

    it("a node-timed stepBy visits the rows it crossed and runs no full pass", async () => {
        await assertScalesLinearly(
            async (size) => {
                const harness = makeSession({ directed: true });
                harness.add(
                    Array.from({ length: size }, (_, at) => ({ id: `n${String(at)}`, w: at })),
                    Array.from({ length: size }, (_, at) => ({
                        src: `n${String(at)}`,
                        dst: `n${String((at + 1) % size)}`,
                    })),
                );
                const { time } = harness.session;
                await time.setField({ nodes: { start: "w" } });
                await time.window({ from: 0, to: 40, step: 7 });
                await time.stepBy(1);
                const { full, jumps } = slideCounters;
                const { rows } = slideCounters;
                await time.stepBy(1);
                await time.stepBy(1);
                assert.strictEqual(slideCounters.full, full, "no evaluate");
                assert.strictEqual(slideCounters.jumps, jumps, "no jump");
                assert.isAbove(slideCounters.rows, rows, "and the rows it visited were counted");
                return slideCounters.rows - rows;
            },
            { sizes: [2_000, 8_000], growth: "constant", counter: "rows a node-timed stepBy visits" },
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

    it("a jump between overlapping windows hides an edge inside both whose end left", async () => {
        const harness = makeSession({ directed: true });
        const fillers = Array.from({ length: 10 }, (_, at) => ({ id: `f${String(at)}`, t: 510 }));
        const between = (count: number, t: number): { src: string; dst: string; t: number }[] =>
            Array.from({ length: count }, (_, at) => ({
                src: `f${String(at % 10)}`,
                dst: `f${String((at + 1) % 10)}`,
                t,
            }));
        harness.add(
            [{ id: "a", t: 50 }, { id: "b", t: 30 }, ...fillers],
            // The edge inside both windows, sixty only in the new one, and seventy in neither.
            [{ src: "a", dst: "b", t: 50 }, ...between(60, 510), ...between(70, 5000)],
        );
        const { time, visibility } = harness.session;
        await time.setField({ nodes: { start: "t" }, edges: { start: "t" } });
        await time.window({ from: 0, to: 500, step: 1 });
        await time.stepBy(1);
        assert.strictEqual(visibility.summary.visibleEdges, 1, "a to b, both inside");

        const { full, jumps } = slideCounters;
        await time.seek(40);
        assert.strictEqual(slideCounters.full, full);
        assert.strictEqual(slideCounters.jumps, jumps + 1);
        assert.strictEqual(visibility.summary.visibleEdges, 60, "b left, and its edge with it");
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

    it("a hub leaving takes the window's edges with it, scanning those and not its degree", async () => {
        const harness = makeSession({ directed: true });
        const near = ["n0", "n1", "n2"].map((id) => ({ id, t: 25 }));
        const far = Array.from({ length: 200 }, (_, at) => ({ id: `f${String(at)}`, t: 1000 }));
        harness.add(
            [{ id: "hub", t: 15 }, ...near, ...far],
            [
                ...near.map(({ id }) => ({ src: "hub", dst: id, t: 25 })),
                ...far.map(({ id }) => ({ src: "hub", dst: id, t: 1000 })),
                { src: "n0", dst: "n1", t: 25 },
            ],
        );
        const { time, visibility } = harness.session;
        await time.setField({ nodes: { start: "t" }, edges: { start: "t" } });
        await time.window({ from: 10, to: 30, step: 10, nodes: "all", missing: "outside" });
        assert.strictEqual(visibility.summary.visibleEdges, 4, "the hub's three, and one between leaves");

        const { scans, jumps } = slideCounters;
        await time.stepBy(1);
        assert.strictEqual(slideCounters.scans, scans + 1);
        assert.strictEqual(slideCounters.jumps, jumps);
        assert.strictEqual(visibility.summary.visibleNodes, 3);
        assert.strictEqual(visibility.summary.visibleEdges, 1, "the hub's edges went with it");
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
                { src: "a", dst: "b", t: 0, u: 0, heavy: true },
                { src: "a", dst: "b", t: 10, u: 10, heavy: false },
                { src: "a", dst: "b", t: 20, u: 30, heavy: true },
                { src: "b", dst: "c", t: 30, u: 20, heavy: true },
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

    it("follows the bins asked for, the column and the data", async () => {
        const harness = await filtered();
        const { time } = harness.session;
        const edgesBy = (step: number): number[] =>
            (time.bins({ step, scope: "visible" }) ?? []).map((bin) => bin.edges);
        assert.deepEqual(edgesBy(10), [1, 0, 1, 0]);
        assert.deepEqual(edgesBy(20), [1, 1]);
        assert.deepEqual(edgesBy(10), [1, 0, 1, 0]);

        await time.setField({ edges: { start: "u", unit: "ms" } });
        assert.deepEqual(edgesBy(10), [1, 0, 0, 1]);

        harness.add([], [{ src: "a", dst: "b", t: 2, u: 12, heavy: true }]);
        assert.deepEqual(edgesBy(10), [1, 1, 0, 1]);
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
