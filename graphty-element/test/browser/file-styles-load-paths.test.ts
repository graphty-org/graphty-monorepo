/**
 * The simple load calls take the file-styles choice: `loadFromUrl`, `loadFromFile` and the
 * element's `dataSourceConfig` each draw a file's own colors when asked with `styles: "file"`, and
 * load the data alone when not.
 */
import "../../src/graphty-element";

import { afterEach, assert, describe, test, vi } from "vitest";

import type { Graphty } from "../../index.js";
import { fileStyleOf } from "../../session";
import { Graph } from "../../src/Graph.js";

/** Twelve nodes in two groups, each group with its own viz color. */
const GEXF = `<?xml version="1.0" encoding="UTF-8"?>
<gexf xmlns="http://gexf.net/1.3" xmlns:viz="http://gexf.net/1.3/viz" version="1.3">
<graph defaultedgetype="undirected"><attributes class="node"><attribute id="0" title="group" type="string"/></attributes>
<nodes>
${Array.from({ length: 12 }, (_unused, i) => {
    const x = i % 3 !== 0;
    return `<node id="n${String(i)}"><attvalues><attvalue for="0" value="${x ? "x" : "y"}"/></attvalues><viz:color r="${x ? "255" : "0"}" g="0" b="${x ? "0" : "255"}"/></node>`;
}).join("\n")}
</nodes><edges><edge source="n0" target="n1"/></edges></graph></gexf>`;

/**
 * What a node is drawn with.
 * @param graph - The graph.
 * @param id - The node.
 * @returns Its color as `#rrggbb`.
 */
function color(graph: Graph, id: string): string {
    const value = (graph.getSession().styles.explain({ node: id }).merged as Record<string, unknown>)["node.color"];
    return (value as { hex: string }).hex.slice(0, 7).toLowerCase();
}

/**
 * How many layers a file's styles made.
 * @param graph - The graph.
 * @returns The count.
 */
function fileLayers(graph: Graph): number {
    return graph
        .getSession()
        .styles.list()
        .filter((layer) => fileStyleOf(layer) !== null).length;
}

/**
 * A graph on a fresh canvas.
 * @returns The graph.
 */
function freshGraph(): Graph {
    document.body.innerHTML = '<canvas id="test-canvas"></canvas>';
    return new Graph(document.getElementById("test-canvas") as HTMLCanvasElement);
}

let mounted: Graphty | null = null;

afterEach(() => {
    vi.restoreAllMocks();
    mounted?.remove();
    mounted = null;
});

describe("the file-styles choice on the simple load calls", () => {
    test("loadFromUrl draws the file's colors with styles: file", async () => {
        vi.spyOn(globalThis, "fetch").mockImplementation(() => Promise.resolve(new Response(GEXF, { status: 200 })));
        const graph = freshGraph();
        await graph.loadFromUrl("https://example.com/groups.gexf", { styles: "file" });
        assert.isAbove(fileLayers(graph), 0);
        assert.strictEqual(color(graph, "n1"), "#ff0000");
        assert.strictEqual(color(graph, "n0"), "#0000ff");

        const plain = freshGraph();
        await plain.loadFromUrl("https://example.com/groups.gexf");
        assert.strictEqual(fileLayers(plain), 0);
    });

    test("loadFromFile draws the file's colors with styles: file", async () => {
        const graph = freshGraph();
        await graph.loadFromFile(new File([GEXF], "groups.gexf", { type: "application/gexf+xml" }), { styles: "file" });
        assert.isAbove(fileLayers(graph), 0);
        assert.strictEqual(color(graph, "n1"), "#ff0000");
    });

    test("the element's dataSourceConfig draws the file's colors with styles: file", async () => {
        const element = document.createElement("graphty-element");
        element.style.width = "400px";
        element.style.height = "300px";
        element.style.display = "block";
        document.body.appendChild(element);
        mounted = element;
        await element.updateComplete;
        const { graph } = element;
        assert.isDefined(graph);
        const started: Promise<unknown>[] = [];
        const original = graph.addDataFromSource.bind(graph);
        graph.addDataFromSource = (...args) => {
            const load = original(...args);
            started.push(load);
            return load;
        };

        element.dataSource = "gexf";
        element.dataSourceConfig = { data: GEXF, styles: "file" };
        await element.updateComplete;
        await Promise.all(started);
        assert.lengthOf(started, 1);
        assert.isAbove(fileLayers(graph), 0);
        assert.strictEqual(color(graph, "n1"), "#ff0000");
    });
});
