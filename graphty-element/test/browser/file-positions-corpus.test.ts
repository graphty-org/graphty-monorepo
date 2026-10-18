/**
 * @file The element draws every node of a real file exactly where graph-io's `extractPositions`
 * says the file put it (#2490, #2325): one corpus sample per format, loaded through the public
 * `loadFromUrl` with `layout: "recommended"`, every node read back through the session's position
 * lane and compared with `extractPositions` run on the same file.
 */

import { importGraph, registry } from "@graphty/graph-io";
import { extractPositions } from "@graphty/graph-io/positions";
import { afterEach, assert, describe, it, vi } from "vitest";

import cxUrl from "../../../graph-io/test/conformance/fixtures/cx/ndex/WP4742-ketogenesis.cx?url";
import cx2Url from "../../../graph-io/test/conformance/fixtures/cx2/cytoscape-web/2496d8c5-5c74-11ec-b3be-0ac135e8bacf.valid.cx2?url";
import cysUrl from "../../../graph-io/test/conformance/fixtures/cys/tutorials/STELZ.cys?url";
import dotUrl from "../../../graph-io/test/conformance/fixtures/dot/pydot/parsing_test.dot?url";
import gexfUrl from "../../../graph-io/test/conformance/fixtures/gexf/graphology/les_miserables.gexf?url";
import gmlUrl from "../../../graph-io/test/conformance/fixtures/gml/igraph/fuzzing_test_inputs_graph1.gml?url";
import usAirUrl from "../../../graph-io/test/conformance/fixtures/pajek/batagelj/USAir97.net?url";
import a97Url from "../../../graph-io/test/conformance/fixtures/pajek/bavla/A97.NET?url";
import xgmmlUrl from "../../../graph-io/test/conformance/fixtures/xgmml/ngscheckmate/test.out.xgmml?url";
import yedUrl from "../../../graph-io/test/corpus/graphml/yfiles-sample.graphml?url";
import { Graph } from "../../src/Graph";

const SAMPLES: readonly (readonly [string, string, string])[] = [
    ["GML", gmlUrl, "gml"],
    ["Pajek", usAirUrl, "pajek"],
    ["Pajek 3D", a97Url, "pajek"],
    ["DOT", dotUrl, "dot"],
    ["GEXF", gexfUrl, "gexf"],
    ["yEd GraphML", yedUrl, "graphml"],
    ["XGMML", xgmmlUrl, "xgmml"],
    ["CX", cxUrl, "cx"],
    ["CX2", cx2Url, "cx2"],
    ["Cytoscape session", cysUrl, "cys"],
];

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

/**
 * graph-io's reading of a file's positions, by node id.
 * @param bytes - The file.
 * @returns Each placed node's center, y up, in file units, by id.
 */
async function expectedOf(bytes: Uint8Array): Promise<Map<string, number[]>> {
    const { snapshot, report } = await importGraph(bytes);
    const positions = extractPositions(registry.importer(report.format), snapshot, report);
    assert.isTrue(positions?.usable, "graph-io reads usable positions from the sample");
    const out = new Map<string, number[]>();
    for (let row = 0; row < snapshot.nodeCount; row++) {
        const at = Array.from(positions?.coords.subarray(3 * row, 3 * row + 3) ?? []);
        if (!Number.isNaN(at[0])) {
            out.set(String(snapshot.ids.idOf(row)), at);
        }
    }

    return out;
}

/**
 * Load a file into a fresh graph with `layout: "recommended"` and wait until it is drawn.
 * @param url - The file's URL.
 * @param format - Its format id.
 * @returns The graph.
 */
async function load(url: string, format: string): Promise<Graph> {
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
    await graph.loadFromUrl(url, { format, layout: "recommended" });
    await vi.waitFor(() => {
        assert.lengthOf(graph.getSession().history.pending, 0);
    });
    return graph;
}

describe("every node of a corpus file sits where graph-io's extractPositions puts it", () => {
    for (const [name, url, format] of SAMPLES) {
        it(name, async () => {
            const bytes = new Uint8Array(await (await fetch(url)).arrayBuffer());
            const expected = await expectedOf(bytes);
            const graph = await load(url, format);
            const session = graph.getSession();
            const snapshot = session.snapshot();

            assert.strictEqual(session.layout.id, "fixed", "every node is placed, so the drawing is kept");
            assert.isAbove(expected.size, 1, "the sample stores positions for several nodes");
            assert.strictEqual(snapshot.nodeCount, expected.size, "the element has one node per placed node");
            const at = { x: 0, y: 0, z: 0 };
            for (let row = 0; row < snapshot.nodeCount; row++) {
                const id = String(snapshot.ids.idOf(row));
                const want = expected.get(id);
                assert.isDefined(want, `node ${id} has a file position`);
                session.positions.read(row, at);
                // The lane is float32: compare to its precision, relative to the coordinate's size.
                [at.x, at.y, at.z].forEach((got, axis) => {
                    const value = want?.[axis] ?? Number.NaN;
                    assert.approximately(got, value, 1e-4 * Math.max(1, Math.abs(value)), `node ${id} axis ${axis}`);
                });
            }
        });
    }
});
