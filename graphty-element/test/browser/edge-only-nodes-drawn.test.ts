/**
 * @file A node the data names only as an edge end, with no node record of its own, is drawn like
 * a declared one, and so are the edges between such nodes -- by every route data arrives through:
 * the `edgeData` property, a built-in reader whose file has no node rows, and a third party's
 * reader whose importer only adds edges (issue #3192). Before the fix every one of these stored
 * and counted the nodes and drew an empty canvas.
 */
import "../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";

import { DataSource, type GraphImporter, type ImporterReport } from "../../extend";
import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";

const mounted: HTMLElement[] = [];

afterEach(() => {
    for (const element of mounted.splice(0)) {
        element.remove();
    }
});

/**
 * A connected element, after its first update.
 * @returns the element
 */
async function mount(): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.style.display = "block";
    element.style.width = "400px";
    element.style.height = "300px";
    document.body.appendChild(element);
    mounted.push(element);
    await element.updateComplete;
    return element;
}

/**
 * What a reader sees: the nodes counted, the nodes drawn and the edges drawn.
 * @param element - the element
 * @returns the counts and the drawn ids
 */
async function picture(element: Graphty): Promise<{ counted: number; nodes: string[]; edges: number }> {
    await operationQueueOf(element.graph).waitForCompletion();
    return {
        counted: element.session.status.counts.nodes,
        nodes: element.graph
            .getNodes()
            .map((node) => String(node.id))
            .sort(),
        edges: element.graph.getDataManager().edges.size,
    };
}

/** An importer that names only edges: `a-b`, `b-c`. */
const edgesOnlyImporter: GraphImporter = {
    format: "edges-only",
    extensions: [".edgesonly"],
    mimeTypes: ["text/vnd.test.edges-only"],
    import(_input, sink) {
        sink.addEdge("a", "b");
        sink.addEdge("b", "c");
        const report: ImporterReport = {
            format: "edges-only",
            counts: { nodes: 0, edges: 2, skippedNodes: 0, skippedEdges: 0, expandedMixed: 0 },
            issues: [],
            errorCount: 0,
            warningCount: 0,
            truncated: false,
            lossy: [],
            durationMs: 0,
        };
        return Promise.resolve(report);
    },
};

DataSource.register(
    DataSource.fromImporter(edgesOnlyImporter, {
        id: "test-edges-only",
        plainName: "Edges only",
        extensions: [".edgesonly"],
        mimeTypes: ["text/vnd.test.edges-only"],
        canImport: true,
        canExport: false,
        options: [],
    }),
);

describe("a node named only by an edge is drawn (#3192)", () => {
    it("through the edgeData property", async () => {
        const element = await mount();
        element.edgeData = [{ source: "a", target: "b" }];

        assert.deepStrictEqual(await picture(element), { counted: 2, nodes: ["a", "b"], edges: 1 });
    });

    it("through the session's addEdges", async () => {
        const element = await mount();
        await element.session.data.addEdges([{ source: "a", target: "b" }]);

        assert.deepStrictEqual(await picture(element), { counted: 2, nodes: ["a", "b"], edges: 1 });
    });

    it("through the element's addEdges, and a later node record takes over the node", async () => {
        const element = await mount();
        await element.addEdges([{ source: "a", target: "b" }]);
        assert.deepStrictEqual(await picture(element), { counted: 2, nodes: ["a", "b"], edges: 1 });

        await element.addNodes([{ id: "a", label: "Ava" }]);
        assert.deepStrictEqual(await picture(element), { counted: 2, nodes: ["a", "b"], edges: 1 });
        assert.strictEqual(element.graph.getDataManager().nodes.get("a")?.data.label, "Ava");
    });

    it("and undo takes the nodes out with the edge", async () => {
        const element = await mount();
        await element.session.data.addEdges([{ source: "a", target: "b" }]);
        assert.lengthOf((await picture(element)).nodes, 2);

        await element.session.undo();
        assert.deepStrictEqual(await picture(element), { counted: 0, nodes: [], edges: 0 });
        await element.session.redo();
        assert.deepStrictEqual(await picture(element), { counted: 2, nodes: ["a", "b"], edges: 1 });
    });

    it("and a push rolled back by a refused repeat leaves no node behind for the next one", async () => {
        const element = await mount();
        const refused = [
            { source: "a", target: "b" },
            { source: "c", target: "d" },
            { source: "a", target: "b" },
        ];
        let threw = false;
        try {
            await element.addEdges(refused, { repeated: "error" });
        } catch {
            threw = true;
        }

        assert.isTrue(threw, "the repeated a-b edge is refused");
        await element.addEdges([{ source: "x", target: "y" }]);
        assert.deepStrictEqual(await picture(element), { counted: 2, nodes: ["x", "y"], edges: 1 });
    });

    it("through a JSON file with an empty node list", async () => {
        const element = await mount();
        const data = JSON.stringify({ nodes: [], edges: [{ source: "a", target: "b" }] });
        await element.graph.addDataFromSource("json", { data });

        assert.deepStrictEqual(await picture(element), { counted: 2, nodes: ["a", "b"], edges: 1 });
    });

    it("through a GML file with only edges", async () => {
        const element = await mount();
        await element.graph.addDataFromSource("gml", { data: "graph [ edge [ source 1 target 2 ] ]" });

        const shown = await picture(element);
        assert.strictEqual(shown.counted, 2);
        assert.deepStrictEqual(shown.nodes, ["1", "2"]);
        assert.strictEqual(shown.edges, 1);
    });

    it("through a third party's importer that only adds edges", async () => {
        const element = await mount();
        await element.graph.addDataFromSource("test-edges-only", { data: "anything" });

        assert.deepStrictEqual(await picture(element), { counted: 3, nodes: ["a", "b", "c"], edges: 2 });
    });
});
