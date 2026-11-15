/**
 * @file The `graph` hook of a session with no renderer: a change to the rows repaints every layer,
 * except rows appended to a picture nothing has renumbered under a stack whose layers paint each
 * element from that element alone, or from it and a column that settles as it did, which paint
 * only themselves and the ends of an added edge a layer reads the degree of;
 * a change to records' attributes alone repaints only the layers that read a field it changed,
 * forward and on undo and redo, and paints nothing when no layer reads one. Counted in passes and
 * in what each pass painted, never timed.
 */

import { assert, describe, it } from "vitest";

import type { LayerSpec, NodeId } from "../../../src/catalog/types";
import { dispatcherOf } from "../../../src/session/GraphSession";
import type { ElementSession } from "../../../src/session/types";
import { makeSession } from "../helpers";
import { blankSession, paintBaseline } from "./fixture-session";

const RED = "#ff0000";

/**
 * A session over n1, n2 and n3, weighted 1, 2 and 3, painted.
 * @returns The session.
 */
async function weighted(): Promise<ElementSession> {
    const { session } = makeSession();
    await session.data.addNodes([
        { id: "n1", weight: 1, label: "one" },
        { id: "n2", weight: 2, label: "two" },
        { id: "n3", weight: 3, label: "three" },
    ]);
    return session as ElementSession;
}

/**
 * The nodes the session's last passes painted red.
 * @param session - The session.
 * @returns Their ids, sorted.
 */
function red(session: ElementSession): NodeId[] {
    const snapshot = session.snapshot();
    const found: NodeId[] = [];
    for (let row = 0; row < snapshot.nodeCount; row++) {
        if (session.paint.styleOf("node", row)["node.color"]?.hex === RED) {
            found.push(snapshot.ids.idOf(row));
        }
    }

    return found.sort();
}

/**
 * Count the passes that finish from now on.
 * @param session - The session.
 * @returns The count so far.
 */
function passes(session: ElementSession): { count: number } {
    const seen = { count: 0 };
    session.paint.onPainted(() => {
        seen.count++;
    });
    return seen;
}

describe("the headless graph hook", () => {
    it("repaints a layer reading the edited field, forward and on undo and redo", async () => {
        const session = await weighted();
        await session.styles.add({
            name: "Heavy",
            selector: { match: "expression", where: "data.weight > `2`" },
            set: { "node.color": RED },
        });
        await session.styles.settled();
        assert.deepEqual(red(session), ["n3"]);

        await session.data.updateNodes([{ id: "n1", values: { weight: 9 } }]);
        assert.deepEqual(red(session), ["n1", "n3"]);

        await session.undo();
        assert.deepEqual(red(session), ["n3"], "undo repaints what the field held before");

        await session.redo();
        assert.deepEqual(red(session), ["n1", "n3"], "and redo what it holds after");
        session.dispose();
    });

    it("paints nothing for a record edit no layer reads", async () => {
        const session = await weighted();
        await session.styles.add({
            name: "Heavy",
            selector: { match: "expression", where: "data.weight > `2`" },
            set: { "node.color": RED },
        });
        await session.styles.settled();
        const seen = passes(session);

        await session.data.updateNodes([{ id: "n1", values: { label: "uno" } }]);
        await session.undo();
        await session.redo();

        assert.strictEqual(seen.count, 0, "no layer reads the label");
        assert.deepEqual(red(session), ["n3"]);
        session.dispose();
    });

    it("repaints every layer when rows change, forward and on undo", async () => {
        const session = await weighted();
        await session.styles.add({ name: "All", selector: { match: "everything" }, set: { "node.color": RED } });
        await session.styles.settled();

        await session.data.addNodes([{ id: "n4" }]);
        assert.deepEqual(red(session), ["n1", "n2", "n3", "n4"], "the added row is painted");

        await session.data.removeNodes(["n2"]);
        await session.undo();
        assert.deepEqual(red(session), ["n1", "n2", "n3", "n4"], "the row an undo put back is painted");
        session.dispose();
    });

    it("an add after a removal carries each element's paint to the row it moved to", async () => {
        const session = await chained(5);
        await session.styles.add({
            name: "Named",
            selector: { match: "ids", nodes: ["v3"] },
            set: { "node.color": RED },
        });
        await session.styles.settled();
        assert.deepEqual(red(session), ["v3"]);

        await session.data.removeNodes(["v1"]);
        await session.data.addNodes([{ id: "x1" }]);
        await dispatcherOf(session).lane.settled();

        assert.deepEqual(red(session), ["v3"], "the paint followed v3 to its new row");
        session.dispose();
    });

    it("an add after a removal paints only the rows it added, and the picture equals a full repaint", async () => {
        const session = await chained(200);
        const full = await chained(200);
        for (const each of [session, full]) {
            await each.styles.add(...ROW_ALONE);
            await each.styles.add(...ROW_ALONE_SIZE);
            await each.styles.add(...ROW_ALONE_IDS);
            await each.styles.add(...ROW_ALONE_EDGE);
        }

        await session.styles.settled();
        await session.data.removeNodes(["v50", "v120"]);
        await dispatcherOf(session).lane.settled();
        const painted = paintedPerPass(session);

        await session.data.addNodes([{ id: "x1", weight: 7 }]);
        await dispatcherOf(session).lane.settled();
        await session.data.addEdges([{ src: "x1", dst: "v7" }]);
        await dispatcherOf(session).lane.settled();

        // One pass per add, each painting only what it added; the removal's renumbering moved the
        // paint of every row after the removed ones rather than painting them again.
        assert.deepEqual(painted, [
            { nodes: 1, edges: 0 },
            { nodes: 0, edges: 1 },
        ]);

        // The same graph, every element then painted again from the whole stack.
        await full.data.removeNodes(["v50", "v120"]);
        await full.data.addNodes([{ id: "x1", weight: 7 }]);
        await full.data.addEdges([{ src: "x1", dst: "v7" }]);
        await dispatcherOf(full).lane.settled();
        await paintBaseline(full);
        assert.deepEqual(pictureOf(session), pictureOf(full));
        session.dispose();
        full.dispose();
    });

    it("across random adds, removals, undos and redos, every add leaves the picture a full repaint gives", async () => {
        const session = await chained(40);
        await session.styles.add(...ROW_ALONE_IDS);
        await session.styles.add(...ROW_ALONE_EDGE);
        await session.styles.add(...ROW_ALONE_SIZE);
        await paintBaseline(session);
        let seed = 1253;
        const next = (below: number): number => {
            seed = (seed * 1_103_515_245 + 12_345) % 2_147_483_648;
            return seed % below;
        };
        let added = 0;
        for (let step = 0; step < 80; step++) {
            const ids = session.snapshot().ids.toArray().map(String);
            const pick = (): string => ids[next(ids.length)] ?? "v0";
            const choice = next(6);
            if (choice === 0 && ids.length > 2) {
                await session.data.removeNodes([pick()]);
            } else if (choice === 1 && session.snapshot().edgeCount > 0) {
                const edge = next(session.snapshot().edgeCount);
                await session.data.removeEdges([String(session.snapshot().edges.value("graphty.edgeId", edge))]);
            } else if (choice === 2) {
                await session.undo();
            } else if (choice === 3) {
                await session.redo();
            } else {
                const id = `x${String(added++)}`;
                await session.data.addNodes([{ id, weight: step }]);
                // Every other time to a node the edge creates, which no record of its own names.
                await session.data.addEdges([{ src: id, dst: step % 2 === 0 ? pick() : `y${String(step)}` }]);
                await dispatcherOf(session).lane.settled();
                const incremental = pictureOf(session);
                await paintBaseline(session);
                assert.deepEqual(incremental, pictureOf(session), `step ${String(step)}`);
            }
        }

        session.dispose();
    });

    /**
     * A session over a measured graph whose only layer of its own paints what the run measured.
     * @returns The session, the run's id, and the opacity each node shows.
     */
    async function measured(): Promise<{ session: ElementSession; runId: string; opacities: () => unknown[] }> {
        const session = blankSession();
        await session.data.addNodes(["a", "b", "c", "d"].map((id) => ({ id })));
        await session.data.addEdges([{ src: "a", dst: "b" }]);
        const run = session.runs.start("degree", {}, { as: "deg" });
        await run;
        for (const layer of session.styles.list().filter((entry) => entry.source.by !== "element")) {
            await session.styles.remove(layer.id);
        }

        await session.styles.add({
            name: "Measured",
            selector: { match: "has", path: "results.deg.value" },
            set: { "node.opacity": 0.5 },
        });
        await session.data.addNodes([{ id: "e" }]);
        await dispatcherOf(session).lane.settled();
        const opacities = (): unknown[] =>
            session
                .snapshot()
                .ids.toArray()
                .map((_, row) => session.paint.styleOf("node", row)["node.opacity"]);
        assert.deepEqual(opacities(), [0.5, 0.5, 0.5, 0.5, undefined]);
        return { session, runId: run.id, opacities };
    }

    it("a pass that follows a removal leaves a layer able to take its paint back (issue #5897)", async () => {
        const { session, runId, opacities } = await measured();
        await session.data.removeNodes(["b"]);
        const painted = paintedPerPass(session);

        await session.data.addNodes([{ id: "f" }]);
        await dispatcherOf(session).lane.settled();

        assert.deepEqual(painted, [{ nodes: 1, edges: 0 }], "the pass followed the rows and painted only f");
        assert.deepEqual(opacities(), [0.5, 0.5, 0.5, undefined, undefined], "a, c and d kept what the layer painted");

        session.runs.remove(runId);
        await dispatcherOf(session).lane.settled();

        assert.deepEqual(opacities(), [undefined, undefined, undefined, undefined, undefined]);
        session.dispose();
    });

    it("an add repaints every row when a layer's paint depends on the other rows", async () => {
        const session = await chained(50);
        await session.styles.add({
            name: "By weight",
            selector: { match: "everything" },
            encode: { "node.size": { by: "data.weight", scale: "linear", range: [1, 3] } },
        });
        await session.styles.settled();
        const painted = paintedPerPass(session);

        await session.data.addNodes([{ id: "x1", weight: 1000 }]);
        await dispatcherOf(session).lane.settled();

        assert.deepEqual(painted, [{ nodes: 51, edges: 49 }], "the domain moved, so every row is painted again");
        session.dispose();
    });

    it("an added edge repaints its ends under a label built from their degree (issue #5893)", async () => {
        const session = await chained(5);
        await session.styles.add({
            name: "Degree label",
            selector: { match: "everything" },
            encode: { "node.label": { template: ["{graphty.degree}"] } },
        });
        await session.styles.settled();
        const label = (id: string): unknown =>
            session.paint.styleOf("node", session.snapshot().ids.indexOf(id))["node.label"];
        assert.strictEqual(label("v0"), "1");

        await session.data.addEdges([{ src: "v0", dst: "v2" }]);
        await dispatcherOf(session).lane.settled();

        assert.strictEqual(label("v0"), "2");
        assert.strictEqual(label("v2"), "3");
        session.dispose();
    });

    it("an add that lands with an edit repaints an edge whose presence test reads the edited end", async () => {
        const session = await chained(5);
        await session.styles.add({
            name: "Flagged source",
            target: "edge",
            selector: { match: "has", path: "graphty.source.data.flag" },
            set: { "edge.color": RED },
        });
        await session.styles.settled();

        const edit = session.data.updateNodes([{ id: "v0", values: { flag: 1 } }]);
        await session.data.addEdges([{ src: "v3", dst: "v0" }]);
        await edit;
        await dispatcherOf(session).lane.settled();

        assert.strictEqual(session.paint.styleOf("edge", 0)["edge.color"]?.hex, RED);
        session.dispose();
    });
});

/** Layers of every kind an add can leave narrowed, or has to paint whole, by what they read. */
const ENCODED_LAYERS: Record<string, readonly LayerSpec[]> = {
    "a continuous domain": [
        {
            name: "Size",
            selector: { match: "everything" },
            encode: { "node.size": { by: "data.weight", scale: "linear", range: [1, 3] } },
        },
    ],
    "a percentile clamp": [
        {
            name: "Clamped",
            selector: { match: "everything" },
            encode: { "node.size": { by: "data.weight", scale: "linear", clamp: [10, 90], range: [1, 3] } },
        },
    ],
    "cut points": [
        {
            name: "Quartiles",
            selector: { match: "everything" },
            encode: { "node.size": { by: "data.weight", scale: "quantile", range: [1, 3] } },
        },
    ],
    "a palette over categories": [
        {
            name: "Kinds",
            selector: { match: "has", path: "data.kind" },
            encode: { "node.color": { by: "data.kind", scale: "ordinal", palette: "okabe-ito" } },
        },
    ],
    "stops, which read no domain": [
        {
            name: "Stops",
            selector: { match: "everything" },
            encode: {
                "node.size": {
                    by: "data.weight",
                    stops: [
                        { at: 0, value: 1 },
                        { at: 50, value: 3 },
                    ],
                },
            },
        },
    ],
    "a degree": [
        {
            name: "By degree",
            selector: { match: "everything" },
            encode: { "node.size": { by: "graphty.degree", scale: "linear", range: [1, 3] } },
        },
    ],
    "an expression over a value": [
        { name: "Heavy", selector: { match: "expression", where: "data.weight > `5`" }, set: { "node.color": RED } },
    ],
    "an expression over a degree": [
        { name: "Hubs", selector: { match: "expression", where: "graphty.degree >= `3`" }, set: { "node.color": RED } },
    ],
    "a template of values": [
        {
            name: "Label",
            selector: { match: "everything" },
            encode: { "node.label": { template: ["{data.kind}: {graphty.degree}"] } },
        },
    ],
    "a template's rank": [
        {
            name: "Rank",
            selector: { match: "everything" },
            encode: { "node.label": { template: ["{data.weight|rank} of {data.weight|count}"] } },
        },
    ],
    "an edge's own value": [
        {
            name: "Width",
            target: "edge",
            selector: { match: "everything" },
            encode: { "edge.width": { by: "data.strength", scale: "linear", range: [1, 3] } },
        },
    ],
    "a value at an edge's end": [
        {
            name: "From heavy",
            target: "edge",
            selector: { match: "expression", where: "graphty.source.graphty.degree >= `3`" },
            set: { "edge.color": RED },
        },
    ],
};

/**
 * What each step adds, chosen so that some leave every domain alone and some move it: a value
 * inside the range, one past its end, a new category, a text where numbers stood, an edge between
 * two old nodes, one to a node it creates, and a repeat of an edge.
 */
const ADDS: readonly ((session: ElementSession) => Promise<void>)[] = [
    (session) => session.data.addNodes([{ id: "p", weight: 3, kind: "a" }]),
    (session) => session.data.addEdges([{ src: "v0", dst: "v5", strength: 2 }]),
    (session) => session.data.addEdges([{ src: "v1", dst: "v5", strength: 4 }]),
    (session) => session.data.addNodes([{ id: "q", weight: 500, kind: "b" }]),
    (session) => session.data.addEdges([{ src: "q", dst: "fresh", strength: 900 }]),
    (session) => session.data.addEdges([{ src: "v1", dst: "v5", strength: 4 }]),
    (session) => session.data.addNodes([{ id: "r", weight: -9, kind: "new" }]),
    (session) => session.data.addNodes([{ id: "v3", weight: 7, kind: "a" }]),
    (session) => session.data.addNodes([{ id: "s", weight: "heavy", kind: 4 }]),
];

describe("an add under layers that encode or select by expression (issue #5897)", () => {
    /**
     * A chain carrying every value the layers read.
     * @returns The session.
     */
    async function styled(): Promise<ElementSession> {
        const { session } = makeSession();
        const ids = Array.from({ length: 12 }, (_, at) => `v${String(at)}`);
        await session.data.addNodes(ids.map((id, at) => ({ id, weight: at, kind: at % 2 === 0 ? "a" : "b" })));
        await session.data.addEdges(ids.slice(1).map((id, at) => ({ src: ids[at], dst: id, strength: at })));
        return session as ElementSession;
    }

    for (const [kind, layers] of Object.entries(ENCODED_LAYERS)) {
        it(`leaves the picture a full repaint gives, under ${kind}`, async () => {
            const session = await styled();
            for (const layer of layers) {
                await session.styles.add(layer);
            }

            await session.styles.settled();
            await session.data.addNodes([{ id: "start", weight: 1, kind: "a" }]);
            await dispatcherOf(session).lane.settled();
            for (const [step, add] of ADDS.entries()) {
                await add(session);
                await dispatcherOf(session).lane.settled();
                const incremental = pictureOf(session);
                await paintBaseline(session);
                assert.deepEqual(incremental, pictureOf(session), `add ${String(step)}`);
            }

            session.dispose();
        });
    }

    it("paints only what an add reached while no binding settles differently", async () => {
        const session = await styled();
        for (const kind of ["a continuous domain", "a palette over categories", "an expression over a value"]) {
            await session.styles.add(ENCODED_LAYERS[kind][0]);
        }

        await session.data.addNodes([{ id: "start", weight: 1, kind: "a" }]);
        await dispatcherOf(session).lane.settled();
        const painted = paintedPerPass(session);

        await session.data.addEdges([{ src: "v0", dst: "v5" }]);
        await dispatcherOf(session).lane.settled();

        assert.deepEqual(painted, [{ nodes: 0, edges: 1 }]);
        session.dispose();
    });

    it("paints the ends of an added edge under a degree, and every row once the extent moves", async () => {
        const session = await styled();
        await session.styles.add(ENCODED_LAYERS["a degree"][0]);
        await session.data.addEdges([{ src: "v0", dst: "v5" }]);
        await dispatcherOf(session).lane.settled();
        const painted = paintedPerPass(session);

        // v1 goes from two edges to three, which v5 already has.
        await session.data.addEdges([{ src: "v1", dst: "v8" }]);
        await dispatcherOf(session).lane.settled();
        assert.deepEqual(painted, [{ nodes: 2, edges: 1 }]);

        // v5 goes past the extent.
        await session.data.addEdges([{ src: "v5", dst: "v8" }]);
        await dispatcherOf(session).lane.settled();
        const { nodeCount, edgeCount } = session.snapshot();
        assert.deepEqual(painted[1], { nodes: nodeCount, edges: edgeCount });
        session.dispose();
    });

    it("paints an add of 100,000 edges under a degree, more ends than a call takes arguments", async () => {
        const session = await chained(2000);
        await session.styles.add(ENCODED_LAYERS["a degree"][0]);
        await session.data.addNodes([{ id: "start" }]);
        await dispatcherOf(session).lane.settled();
        const painted = paintedPerPass(session);

        await session.data.addEdges(
            Array.from({ length: 100_000 }, (_, at) => ({
                src: `v${String(at % 2000)}`,
                dst: `v${String((at + 1 + Math.floor(at / 2000)) % 2000)}`,
            })),
        );
        await dispatcherOf(session).lane.settled();

        const { nodeCount, edgeCount } = session.snapshot();
        assert.isAtLeast(edgeCount, 100_000);
        assert.deepEqual(
            painted,
            [{ nodes: nodeCount, edges: edgeCount }],
            "the extent moved, so every row is painted",
        );
        session.dispose();
    });

    it("paints every row under a template's rank, which no settled fact describes", async () => {
        const session = await styled();
        await session.styles.add(ENCODED_LAYERS["a template's rank"][0]);
        await session.data.addNodes([{ id: "start", weight: 1 }]);
        await dispatcherOf(session).lane.settled();
        const painted = paintedPerPass(session);

        await session.data.addNodes([{ id: "mid", weight: 2.5 }]);
        await dispatcherOf(session).lane.settled();

        const { nodeCount, edgeCount } = session.snapshot();
        assert.deepEqual(painted, [{ nodes: nodeCount, edges: edgeCount }]);
        session.dispose();
    });
});

/** A layer that paints every node red from the node alone. */
const ROW_ALONE = [{ name: "All", selector: { match: "everything" }, set: { "node.color": RED } }] as const;
/** A layer that sizes the nodes carrying a weight. */
const ROW_ALONE_SIZE = [
    { name: "Weighted", selector: { match: "has", path: "data.weight" }, set: { "node.size": 2 } },
] as const;
/** A layer that paints named nodes, one before the removed rows and one after. */
const ROW_ALONE_IDS = [
    { name: "Named", selector: { match: "ids", nodes: ["x1", "v9", "v150"] }, set: { "node.opacity": 0.5 } },
] as const;
/** A layer that paints a named edge after the removed rows. */
const ROW_ALONE_EDGE = [
    { name: "Named edge", target: "edge", selector: { match: "ids", edges: ["150"] }, set: { "edge.color": RED } },
] as const;

/**
 * A session over a chain `v0 -> v1 -> ...`, every node weighted by its index.
 * @param count - How many nodes.
 * @returns The session.
 */
async function chained(count: number): Promise<ElementSession> {
    const { session } = makeSession();
    const ids = Array.from({ length: count }, (_, at) => `v${String(at)}`);
    await session.data.addNodes(ids.map((id, at) => ({ id, weight: at })));
    await session.data.addEdges(ids.slice(1).map((id, at) => ({ src: ids[at], dst: id })));
    return session as ElementSession;
}

/**
 * Record how many nodes and edges each pass from now on painted.
 * @param session - The session.
 * @returns The counts, one entry per pass.
 */
function paintedPerPass(session: ElementSession): { nodes: number; edges: number }[] {
    const seen: { nodes: number; edges: number }[] = [];
    session.paint.onPainted(() => {
        seen.push({ nodes: session.paint.lastPainted("node").length, edges: session.paint.lastPainted("edge").length });
    });
    return seen;
}

/**
 * Every node's and edge's resolved style and the style of the mesh it is drawn from, by id.
 * @param session - The session.
 * @returns The styles.
 */
function pictureOf(session: ElementSession): Record<string, unknown> {
    const snapshot = session.snapshot();
    const picture: Record<string, unknown> = {};
    for (let row = 0; row < snapshot.nodeCount; row++) {
        picture[`n:${String(snapshot.ids.idOf(row))}`] = {
            style: session.paint.styleOf("node", row),
            mesh: session.paint.meshStyleOf("node", session.paint.meshKeyOf("node", row)),
        };
    }

    for (let row = 0; row < snapshot.edgeCount; row++) {
        const source = String(snapshot.ids.idOf(snapshot.edgeSource(row)));
        const target = String(snapshot.ids.idOf(snapshot.edgeTarget(row)));
        picture[`e:${source}>${target}`] = {
            style: session.paint.styleOf("edge", row),
            mesh: session.paint.meshStyleOf("edge", session.paint.meshKeyOf("edge", row)),
        };
    }

    return picture;
}
