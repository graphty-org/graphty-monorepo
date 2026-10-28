/**
 * @file Every format that stores node positions draws each node where the file put it (#2490,
 * #2325): loaded with `layout: "recommended"`, the element picks the `fixed` layout and each node
 * sits at the file's coordinate, converted once to its center with y up, whatever the format's own
 * spelling (y down in GML, Pajek, yEd and XGMML; a top-left corner in yEd; z = 0.5 padding in Pajek).
 */

import { afterEach, assert, describe, it, vi } from "vitest";

import { Graph } from "../../src/Graph";

type Triple = readonly [number, number, number];

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

/**
 * A graph in its own container, initialised, with its render loop stopped.
 * @returns The graph.
 */
async function newGraph(): Promise<Graph> {
    const container = document.createElement("div");
    container.style.width = "400px";
    container.style.height = "300px";
    document.body.appendChild(container);
    const graph = new Graph(container);
    cleanups.push(() => {
        graph.dispose();
        container.remove();
    });
    await graph.init();
    graph.engine.stopRenderLoop();
    return graph;
}

/**
 * Every node's coordinates in the element's position lane, by id.
 * @param graph - The graph.
 * @returns The coordinates.
 */
function lane(graph: Graph): Map<string, Triple> {
    const session = graph.getSession();
    const snapshot = session.snapshot();
    const at = { x: 0, y: 0, z: 0 };
    const out = new Map<string, Triple>();
    for (let row = 0; row < snapshot.nodeCount; row++) {
        session.positions.read(row, at);
        out.set(String(snapshot.ids.idOf(row)), [at.x, at.y, at.z]);
    }

    return out;
}

/**
 * Wait until the load and the layout it chose have both been recorded.
 * @param graph - The graph.
 */
async function settled(graph: Graph): Promise<void> {
    await vi.waitFor(() => {
        assert.lengthOf(graph.getSession().history.pending, 0);
    });
}

/**
 * Assert each node sits at its expected coordinate.
 * @param graph - The graph.
 * @param expected - Coordinates by node id.
 */
function assertAt(graph: Graph, expected: Readonly<Record<string, Triple>>): void {
    const actual = lane(graph);
    assert.strictEqual(actual.size, Object.keys(expected).length, "one row per node");
    for (const [id, want] of Object.entries(expected)) {
        const got = actual.get(id);
        assert.isDefined(got, `node ${id} is in the graph`);
        for (let axis = 0; axis < 3; axis++) {
            assert.closeTo(got?.[axis] ?? Number.NaN, want[axis], 1e-6, `node ${id}, axis ${String(axis)}`);
        }
    }
}

/** One sample file per format, and where each node belongs once it is converted. */
const SAMPLES: readonly { format: string; name: string; text: string; expected: Record<string, Triple> }[] = [
    {
        // yFiles writes y down, in pixels.
        format: "gml",
        name: "yfiles.gml",
        text: [
            'Creator "yFiles"',
            "graph [",
            "  directed 1",
            '  node [ id 0 label "a" graphics [ x 10.0 y 20.0 w 30.0 h 30.0 ] ]',
            '  node [ id 1 label "b" graphics [ x 110.0 y -40.0 w 50.0 h 30.0 ] ]',
            "  edge [ source 0 target 1 ]",
            "]",
        ].join("\n"),
        expected: { "0": [10, -20, 0], "1": [110, 40, 0] },
    },
    {
        // y down; a z of 0.5 on every vertex is a 2D drawing.
        format: "pajek",
        name: "drawing.net",
        text: [
            "*Vertices 3",
            '1 "a" 0.1 0.2 0.5',
            '2 "b" 0.9 0.6 0.5',
            '3 "c" 0.4 0.8 0.5',
            "*Edges",
            "1 2",
            "2 3",
        ].join("\n"),
        expected: { "1": [0.1, -0.2, 0], "2": [0.9, -0.6, 0], "3": [0.4, -0.8, 0] },
    },
    {
        // Graphviz output (the root graph has bb): points, y up.
        format: "dot",
        name: "laid-out.gv",
        text: 'digraph G { graph [bb="0,0,100,100"]; a [pos="10,20"]; b [pos="80,90"]; a -> b; }',
        expected: { a: [10, 20, 0], b: [80, 90, 0] },
    },
    {
        // Gephi's viz:position is already y up.
        format: "gexf",
        name: "drawing.gexf",
        text: [
            '<?xml version="1.0" encoding="UTF-8"?>',
            '<gexf xmlns="http://gexf.net/1.3" xmlns:viz="http://gexf.net/1.3/viz" version="1.3">',
            '<graph defaultedgetype="directed"><nodes>',
            '<node id="a" label="a"><viz:position x="1" y="2" z="0"/></node>',
            '<node id="b" label="b"><viz:position x="-3" y="4" z="0"/></node>',
            '</nodes><edges><edge id="e" source="a" target="b"/></edges></graph></gexf>',
        ].join("\n"),
        expected: { a: [1, 2, 0], b: [-3, 4, 0] },
    },
    {
        // yEd stores the top-left corner, y down: the center is half the size in.
        format: "graphml",
        name: "drawing.graphml",
        text: [
            '<?xml version="1.0" encoding="UTF-8"?>',
            '<graphml xmlns="http://graphml.graphdrawing.org/xmlns" xmlns:y="http://www.yworks.com/xml/graphml">',
            '<key for="node" id="d6" yfiles.type="nodegraphics"/>',
            '<graph edgedefault="directed" id="G">',
            '<node id="n0"><data key="d6"><y:ShapeNode><y:Geometry height="20.0" width="30.0" x="0.0" y="0.0"/></y:ShapeNode></data></node>',
            '<node id="n1"><data key="d6"><y:ShapeNode><y:Geometry height="20.0" width="30.0" x="100.0" y="50.0"/></y:ShapeNode></data></node>',
            '<edge id="e0" source="n0" target="n1"/>',
            "</graph></graphml>",
        ].join("\n"),
        expected: { n0: [15, -10, 0], n1: [115, -60, 0] },
    },
    {
        // Cytoscape's XGMML graphics are y down; read through DataSource.fromImporter.
        format: "xgmml",
        name: "drawing.xgmml",
        text: [
            '<?xml version="1.0" encoding="UTF-8"?>',
            '<graph label="g" directed="1" xmlns="http://www.cs.rpi.edu/XGMML">',
            '<node id="1" label="a"><graphics x="10" y="20"/></node>',
            '<node id="2" label="b"><graphics x="30" y="-40"/></node>',
            '<edge source="1" target="2"/>',
            "</graph>",
        ].join("\n"),
        expected: { "1": [10, -20, 0], "2": [30, 40, 0] },
    },
];

describe("a file's stored positions", () => {
    for (const sample of SAMPLES) {
        it(`draws a ${sample.format} file where it was saved`, async () => {
            const graph = await newGraph();
            await graph.loadFromFile(new File([sample.text], sample.name), {
                format: sample.format,
                layout: "recommended",
            });
            await settled(graph);

            assert.strictEqual(graph.getSession().layout.id, "fixed", "every node placed: the fixed layout");
            assertAt(graph, sample.expected);
        });
    }

    it("reads layout from a data source config, as dataSourceConfig and session.data.import pass it", async () => {
        const graph = await newGraph();
        const [sample] = SAMPLES;
        await graph
            .getSession()
            .data.import({ type: sample.format, config: { data: sample.text, layout: "recommended" } });
        await settled(graph);

        assert.strictEqual(graph.getSession().layout.id, "fixed");
        assertAt(graph, sample.expected);
    });

    it("leaves the layout alone with layout: keep", async () => {
        const graph = await newGraph();
        await graph.setLayout("circular");
        const [sample] = SAMPLES;
        await graph.loadFromFile(new File([sample.text], sample.name), { format: sample.format, layout: "keep" });
        await settled(graph);

        assert.strictEqual(graph.getSession().layout.id, "circular");
    });

    it("computes a layout for a file whose nodes are all on one point", async () => {
        const graph = await newGraph();
        const stacked = ["*Vertices 3", '1 "a" 0 0', '2 "b" 0 0', '3 "c" 0 0', "*Edges", "1 2", "2 3"].join("\n");
        await graph.loadFromFile(new File([stacked], "stacked.net"), { layout: "recommended" });
        await settled(graph);

        assert.notStrictEqual(graph.getSession().layout.id, "fixed", "nothing to keep: a computed layout");
    });

    it("refuses a layout choice it does not know", async () => {
        const graph = await newGraph();
        const [sample] = SAMPLES;
        const load = graph
            .getSession()
            .data.import({ type: sample.format, config: { data: sample.text, layout: "sideways" } });
        const error = await load.then(
            () => null,
            (failure: unknown) => failure,
        );
        assert.strictEqual((error as { code?: unknown } | null)?.code, "E_BAD_COMMAND");
    });
});

describe("a file that places some nodes and not others", () => {
    it("keeps every placed node where the file put it and lays out only the rest", async () => {
        const graph = await newGraph();
        // vertex 4 has no coordinates; Pajek is y down, so y is negated
        const text = [
            "*Vertices 4",
            '1 "a" 0.1 0.2',
            '2 "b" 0.4 0.3',
            '3 "c" 0.8 0.6',
            '4 "d"',
            "*Edges",
            "1 2",
            "2 3",
            "3 4",
        ];
        await graph.loadFromFile(new File([text.join("\n")], "partial.net"), { layout: "recommended" });
        await settled(graph);
        await graph.waitForSettled();

        assert.strictEqual(graph.getSession().layout.id, "force", "the unplaced node is laid out");
        assert.deepEqual(graph.getLayoutScope(), { nodes: ["4"] }, "over the unplaced node only");
        const at = lane(graph);
        const placed = { "1": [0.1, 0.2], "2": [0.4, 0.3], "3": [0.8, 0.6] } as const;
        const [ax, ay] = at.get("1") ?? [Number.NaN, Number.NaN];
        // the placed nodes keep the file's drawing exactly, whatever unit it is drawn in
        const unit = ((at.get("2")?.[0] ?? Number.NaN) - ax) / (0.4 - 0.1);
        for (const [id, [x, y]] of Object.entries(placed)) {
            const got = at.get(id) ?? [Number.NaN, Number.NaN, Number.NaN];
            assert.closeTo(got[0] - ax, (x - 0.1) * unit, 1e-4, `node ${id}, x`);
            assert.closeTo(got[1] - ay, -(y - 0.2) * unit, 1e-4, `node ${id}, y`);
        }
        assert.isTrue(at.get("4")?.every(Number.isFinite), "the unplaced node was placed by the layout");
    });

    it("keeps the placed nodes of a file with no edges, where a ring would move them all", async () => {
        const graph = await newGraph();
        // no edges: the advice for the whole graph is a ring, which cannot hold nodes still
        const text = ["*Vertices 4", '1 "a" 0.1 0.2', '2 "b" 0.4 0.3', '3 "c" 0.8 0.6', '4 "d"'];
        await graph.loadFromFile(new File([text.join("\n")], "partial-edgeless.net"), { layout: "recommended" });
        await settled(graph);
        await graph.waitForSettled();

        assert.deepEqual(graph.getLayoutScope(), { nodes: ["4"] }, "only the unplaced node is laid out");
        const at = lane(graph);
        const [ax, ay] = at.get("1") ?? [Number.NaN, Number.NaN];
        const unit = ((at.get("2")?.[0] ?? Number.NaN) - ax) / (0.4 - 0.1);
        assert.isTrue(Number.isFinite(unit) && unit > 0, "the placed nodes keep their spacing");
        const [cx, cy] = at.get("3") ?? [Number.NaN, Number.NaN];
        assert.closeTo(cx - ax, 0.7 * unit, 1e-4, "node 3, x");
        assert.closeTo(cy - ay, -0.4 * unit, 1e-4, "node 3, y");
        assert.isTrue(at.get("4")?.every(Number.isFinite), "the unplaced node was placed by the layout");
    });
});
