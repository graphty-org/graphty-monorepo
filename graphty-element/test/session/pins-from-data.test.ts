/**
 * A load with `pins: "data"` pins the nodes the file marks fixed (issue #2004): a Graphviz node
 * written `pos="x,y!"` or `pin=true`, a Cytoscape.js node with `"locked": true`, a sample dataset's
 * `fixed` column, a network source's file. Without the option the load pins nothing, as before.
 */

import { fromEdgeArrays } from "@graphty/graph-format";
import { afterEach, assert, describe, it, vi } from "vitest";

import { createGraphSession, defineSource, type GraphSession, registerSource } from "../../session";

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

/**
 * Serves, for every download, a three-node dataset whose `fixed` column (packed bits) marks a and c.
 */
function serveFixedDataset(): void {
    const bytes = fromEdgeArrays({
        directed: true,
        nodeCount: 3,
        src: Uint32Array.of(0, 0),
        dst: Uint32Array.of(1, 2),
        ids: ["a", "b", "c"],
    })
        .withColumns({ fixed: { data: Uint32Array.of(0b101), decl: { dtype: "bool", role: "fixed" } } })
        .toBytes();
    vi.stubGlobal("fetch", () => Promise.resolve(new Response(bytes.slice())));
}

/** A network source, read in memory, that answers with the DOT graph above. */
registerSource(
    defineSource({
        id: "pins-dot",
        descriptor: { plainName: "Pinned DOT", defaultEndpoint: "https://pins.example.test/", params: [] },
        file: () => Promise.resolve({ body: DOT, format: "dot" }),
    }),
);

afterEach(() => {
    vi.unstubAllGlobals();
});

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

    it("loads a format read through an importer with the choice in its source config", async () => {
        const session = createGraphSession();
        const xgmml =
            '<?xml version="1.0"?><graph xmlns="http://www.cs.rpi.edu/XGMML" directed="1">' +
            '<node id="1" label="a"/><node id="2" label="b"/><edge source="1" target="2"/></graph>';
        await session.data.import({ type: "xgmml", config: { data: xgmml, pins: "data" } });
        assert.strictEqual(session.snapshot().nodeCount, 2);
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

    it("pins the nodes a sample dataset's fixed column marks", async () => {
        serveFixedDataset();
        const session = createGraphSession();
        await session.data.loadDataset("karate", { baseUrl: "https://datasets.test/", pins: "data" });
        assert.sameMembers([...session.positions.pinned], ["a", "c"]);
    });

    it("pins none of a sample dataset's nodes by default", async () => {
        serveFixedDataset();
        const session = createGraphSession();
        await session.data.loadDataset("karate", { baseUrl: "https://datasets.test/" });
        assert.strictEqual(session.positions.pinned.size, 0);
    });

    it("pins the nodes a network source's file marks fixed", async () => {
        const session = createGraphSession();
        await session.data.import({ source: "pins-dot", config: {} }, { pins: "data" });
        assert.sameMembers([...session.positions.pinned], ["a", "b"]);
    });

    it("pins none of a network source's nodes by default", async () => {
        const session = createGraphSession();
        await session.data.import({ source: "pins-dot", config: {} });
        assert.strictEqual(session.snapshot().nodeCount, 3);
        assert.strictEqual(session.positions.pinned.size, 0);
    });

    it("undoes a network source's pins with its load", async () => {
        const session = createGraphSession();
        await session.data.import({ source: "pins-dot", config: {} }, { pins: "data" });
        await session.undo();
        assert.strictEqual(session.positions.pinned.size, 0);
        assert.strictEqual(session.snapshot().nodeCount, 0);
    });
});
