/**
 * A load with `pins: "data"` pins the nodes the file marks fixed (issue #2004): a Graphviz node
 * written `pos="x,y!"` or `pin=true`, a Cytoscape.js node with `"locked": true`. Without the option
 * the load pins nothing, as before.
 */

import { assert, describe, it, vi } from "vitest";

import { createGraphSession, type GraphSession } from "../../src/session";

/** A DOT graph: a pinned with `!`, b pinned with `pin=true`, c placed but free. */
const DOT = 'digraph { a [pos="0,0!"]; b [pos="10,0", pin=true]; c [pos="0,10"]; a -> b; a -> c; }';

/** A Cytoscape.js document: a locked, b not. */
const CYTOSCAPE = JSON.stringify({
    elements: {
        nodes: [
            { data: { id: "a" }, position: { x: 0, y: 0 }, locked: true },
            { data: { id: "b" }, position: { x: 10, y: 0 }, locked: false },
        ],
        edges: [{ data: { id: "ab", source: "a", target: "b" } }],
    },
});

/** A DOT graph placing every node, fixing only a and d: a b d in a row, c above a. */
const ROW = 'digraph { a [pos="0,0!"]; b [pos="1,0"]; c [pos="0,1"]; d [pos="2,0!"]; a -> b; a -> c; b -> d; }';

/**
 * Where the session holds a node.
 * @param session - the session
 * @param id - the node
 * @returns its x and y
 */
function at(session: GraphSession, id: string): readonly [number, number] {
    const out = { x: 0, y: 0, z: 0 };
    session.positions.read(session.snapshot().ids.indexOf(id), out);
    return [out.x, out.y];
}

describe("pins from data", () => {
    it("pins the nodes a DOT file marks fixed", async () => {
        const session = createGraphSession();
        await session.data.import({ type: "dot", config: { data: DOT } }, { pins: "data" });
        assert.sameMembers([...session.positions.pinned], ["a", "b"]);
    });

    it("pins the nodes a Cytoscape.js document locks", async () => {
        const session = createGraphSession();
        await session.data.import({ type: "json", config: { data: CYTOSCAPE } }, { pins: "data" });
        assert.sameMembers([...session.positions.pinned], ["a"]);
    });

    it("takes the choice from the source config, as loadFromFile passes it", async () => {
        const session = createGraphSession();
        await session.data.import({ type: "dot", config: { data: DOT, pins: "data" } });
        assert.sameMembers([...session.positions.pinned], ["a", "b"]);
    });

    it("keeps the fixed layout's drawing in one unit with layout: placed", async () => {
        const session = createGraphSession();
        await session.data.import({ type: "dot", config: { data: ROW } }, { layout: "placed", pins: "data" });
        assert.strictEqual(session.layout.id, "fixed");
        await vi.waitFor(() => assert.sameMembers([...session.positions.pinned], ["a", "d"]));
        const [ax] = at(session, "a");
        const [bx] = at(session, "b");
        const [dx] = at(session, "d");
        const unit = bx - ax;
        assert.isAbove(unit, 0, "b right of a");
        assert.closeTo(dx - ax, 2 * unit, 1e-6, "d twice as far as b: pinned and free nodes share one unit");
    });

    it("pins nothing by default", async () => {
        const session = createGraphSession();
        await session.data.import({ type: "dot", config: { data: DOT } });
        assert.strictEqual(session.positions.pinned.size, 0);
    });

    it("undoes the pins with the load", async () => {
        const session = createGraphSession();
        await session.data.import({ type: "dot", config: { data: DOT } }, { pins: "data" });
        await session.undo();
        assert.strictEqual(session.positions.pinned.size, 0);
    });

    it("refuses an unknown choice", async () => {
        const session = createGraphSession();
        const pins = "all" as unknown as "data";
        const error = await session.data
            .import({ type: "dot", config: { data: DOT } }, { pins })
            .catch((e: unknown) => e);
        assert.strictEqual((error as { code?: unknown }).code, "E_BAD_COMMAND");
    });
});
