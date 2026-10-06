/**
 * @file The Cytoscape formats (XGMML, CX, CX2, sessions) and OBO load with no wiring.
 *
 * A consumer hands the element a file of one of these formats and gets the graph: the format is
 * recognised from the file's name and from its bytes, read through graph-io's importer, and a file
 * holding several networks lists them and loads the one asked for. The files are graph-io's own
 * conformance fixtures, so the counts below are the ones graph-io's independent oracles agree on.
 */

import "../../src/data/index";

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { GraphBuilder } from "@graphty/graph-format";
import { assert, describe, it } from "vitest";

import { listGraphs } from "../../catalog";
import { detectFormats } from "../../src/catalog/detect";
import { DataSource, type DataSourceChunk } from "../../src/data/DataSource";
import { exportSnapshot } from "../../src/data/export";

const FIXTURES = join(__dirname, "..", "..", "..", "graph-io", "test", "conformance", "fixtures");

const bytesOf = (path: string): Uint8Array => new Uint8Array(readFileSync(join(FIXTURES, path)));

/**
 * Everything one data source hands the element.
 * @param type - the registered source
 * @param config - its configuration
 * @returns the nodes and edges it yielded, and its errors
 */
async function read(
    type: string,
    config: object,
): Promise<{ nodes: DataSourceChunk["nodes"]; edges: DataSourceChunk["edges"]; errors: unknown[] }> {
    const source = DataSource.get(type, config);
    assert.isNotNull(source, `"${type}" is registered`);
    const nodes: DataSourceChunk["nodes"] = [];
    const edges: DataSourceChunk["edges"] = [];
    for await (const chunk of source.getData()) {
        nodes.push(...chunk.nodes);
        edges.push(...chunk.edges);
    }

    return { nodes, edges, errors: source.getErrorAggregator().getErrors() };
}

/** One real file per format, with the counts graph-io's conformance manifest records. */
const FILES = [
    { format: "xgmml", path: "xgmml/leovan/yeast_perturbation.xgmml", nodes: 330, edges: 359 },
    { format: "cx2", path: "cx2/ndex/72288e93-5c67-11ec-b3be-0ac135e8bacf.cx2", nodes: 161, edges: 118 },
    { format: "cx", path: "cx/ndex/WP4742-ketogenesis.cx", nodes: 58, edges: 48 },
    { format: "cys", path: "cys/tutorials/galFiltered.cys", nodes: 331, edges: 362 },
    { format: "obo", path: "obo/go/goslim_generic.obo", nodes: 140, edges: 64 },
] as const;

describe("the Cytoscape formats and OBO", () => {
    for (const { format, path, nodes, edges } of FILES) {
        it(`recognises and loads ${path} as ${format}`, async () => {
            const bytes = bytesOf(path);
            const sample = new TextDecoder().decode(bytes.subarray(0, 4096));

            assert.strictEqual(detectFormats({ filename: path, sample })[0], format, "by name and bytes");
            assert.strictEqual(detectFormats({ sample })[0], format, "by bytes alone");

            const loaded = await read(format, { data: bytes });
            assert.deepEqual(loaded.errors, []);
            assert.strictEqual(loaded.nodes.length, nodes);
            assert.strictEqual(loaded.edges.length, edges);
        });
    }

    it("reads an OBO Graphs document as JSON, recognised by its content", async () => {
        const bytes = bytesOf("json/obographs/goslim_generic.json");
        assert.strictEqual(detectFormats({ filename: "goslim_generic.json" })[0], "json");

        const loaded = await read("json", { data: bytes });
        assert.strictEqual(loaded.nodes.length, 140);
        assert.strictEqual(loaded.edges.length, 64);
        assert.include(
            loaded.nodes.map((node) => node.id),
            "GO:0000228",
            "ids are short prefixed ids by default",
        );

        const iris = await read("json", { data: bytes, oboIds: "iri" });
        assert.include(
            iris.nodes.map((node) => node.id),
            "http://purl.obolibrary.org/obo/GO_0000228",
        );
    });

    it("hands every node of a session its saved position", async () => {
        const loaded = await read("cys", { data: bytesOf("cys/tutorials/galFiltered.cys") });
        const placed = loaded.nodes.filter((node) => Array.isArray(node.position));
        assert.strictEqual(placed.length, loaded.nodes.length, "every node of the session has its saved position");
    });

    it("lists the networks of a session and of a CX collection, and loads the one named", async () => {
        const session = { data: bytesOf("cys/authored/base-3x.cys") };
        const listed = await listGraphs({ type: "cys", config: session });
        assert.deepEqual(
            listed?.map((graph) => graph.name),
            ["Beta", "Alpha"],
        );

        const beta = await read("cys", { ...session, graphIndex: 0 });
        const alpha = await read("cys", { ...session, graphName: "Alpha" });
        assert.notDeepEqual(
            alpha.nodes.map((node) => node.id),
            beta.nodes.map((node) => node.id),
        );

        const collection = { data: bytesOf("cx/authored/collection.cx") };
        assert.deepEqual(
            (await listGraphs({ type: "cx", config: collection }))?.map((graph) => graph.name),
            ["First", "Second"],
        );
        const second = await read("cx", { ...collection, graphName: "Second" });
        assert.isAbove(second.nodes.length, 0);
    });

    it("applies the OBO reader options the catalogue publishes", async () => {
        const data = bytesOf("obo/go/goslim_generic.obo");
        const terms = await read("obo", { data });
        // the slim's eleven [Typedef] frames are metadata by default, and nodes when asked
        const withRelations = await read("obo", { data, typedefs: "nodes" });
        assert.strictEqual(withRelations.nodes.length, terms.nodes.length + 11);
        assert.isTrue(terms.nodes.every((node) => typeof node.name === "string"));
    });

    it("writes XGMML and CX2, renumbering text ids for CX2 by default", async () => {
        const builder = new GraphBuilder({ directed: true });
        builder.addEdge(builder.addNode("a"), builder.addNode("b"));
        const snapshot = builder.freeze();

        const xgmml = await exportSnapshot(snapshot, "xgmml").text();
        assert.include(xgmml, "<graph");
        assert.include(xgmml, 'id="a"');

        const cx2 = JSON.parse(await exportSnapshot(snapshot, "cx2").text()) as unknown[];
        assert.isArray(cx2);
        assert.include(JSON.stringify(cx2), "graphty:originalId");
    });
});
