/**
 * @file The `graph` hook of a session with no renderer: a change to the rows repaints every layer,
 * except rows appended to a picture nothing has renumbered under a stack whose layers paint each
 * element from that element alone, which paint only themselves;
 * a change to records' attributes alone repaints only the layers that read a field it changed,
 * forward and on undo and redo, and paints nothing when no layer reads one. Counted in passes and
 * in what each pass painted, never timed.
 */

import { assert, describe, it } from "vitest";

import type { NodeId } from "../../../src/catalog/types";
import { dispatcherOf } from "../../../src/session/GraphSession";
import type { ElementSession } from "../../../src/session/types";
import { makeSession } from "../helpers";
import { paintBaseline } from "./fixture-session";

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
