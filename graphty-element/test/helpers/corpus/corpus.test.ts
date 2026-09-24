/**
 * Corpus Test Runner
 *
 * This test suite runs all corpus files through their respective parsers
 * and verifies the expected node/edge counts from the manifest files.
 *
 * The corpus tests use a 90% threshold to account for minor parsing differences
 * that may occur due to parser limitations with advanced features.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { assert, describe, test } from "vitest";

import { CSVDataSource } from "../../../src/data/CSVDataSource.js";
import { DOTDataSource } from "../../../src/data/DOTDataSource.js";
import { GEXFDataSource } from "../../../src/data/GEXFDataSource.js";
import { GMLDataSource } from "../../../src/data/GMLDataSource.js";
import { GraphMLDataSource } from "../../../src/data/GraphMLDataSource.js";
import { JsonDataSource } from "../../../src/data/JsonDataSource.js";
import { PajekDataSource } from "../../../src/data/PajekDataSource.js";

// Manifest file structure
interface CorpusFile {
    path: string;
    source: string;
    license: string;
    /**
     * Set when this file is HALF of a graph -- a node table whose edges live in the file it names.
     *
     * Such a file must still be listed, so that nothing sits in the corpus unaccounted for, but it
     * must not be parsed alone: handed to the edge-list reader by itself, a two-column node table
     * reads as an edge list and yields a graph of self-loops rather than an error.
     */
    companionOf?: string;
    /**
     * Set when this file is a NEGATIVE fixture: one the element is meant to refuse.
     *
     * The count test below cannot run against it -- there is nothing to count -- but it must
     * still be listed, because an unlisted file is a file no test ever opens. The value says what
     * the element does with it and which test asserts that.
     */
    unreadable?: string;
    expectedNodes: number;
    expectedEdges: number;
    features: string[];
}

interface Manifest {
    format: string;
    description: string;
    files: CorpusFile[];
}

// Map format names to DataSource classes
const formatToDataSource: Record<
    string,
    | typeof DOTDataSource
    | typeof GraphMLDataSource
    | typeof GMLDataSource
    | typeof GEXFDataSource
    | typeof CSVDataSource
    | typeof PajekDataSource
    | typeof JsonDataSource
> = {
    dot: DOTDataSource,
    graphml: GraphMLDataSource,
    gml: GMLDataSource,
    gexf: GEXFDataSource,
    csv: CSVDataSource,
    pajek: PajekDataSource,
    json: JsonDataSource,
};

// JSON variant configurations for proper JMESPath extraction
interface JsonVariantConfig {
    node: { path: string };
    edge: { path: string };
}

const jsonVariantConfigs: Record<string, JsonVariantConfig> = {
    "d3-format.json": { node: { path: "nodes" }, edge: { path: "links" } },
    "cytoscape-format.json": { node: { path: "elements.nodes[*].data" }, edge: { path: "elements.edges[*].data" } },
    "sigma-format.json": { node: { path: "nodes" }, edge: { path: "edges" } },
    "visjs-format.json": { node: { path: "nodes" }, edge: { path: "edges" } },
    "networkx-format.json": { node: { path: "nodes" }, edge: { path: "links" } },
    "karate-d3.json": { node: { path: "nodes" }, edge: { path: "links" } },
    "miserables.json": { node: { path: "nodes" }, edge: { path: "links" } },
};

// DataSource type union
type AnyDataSource =
    | DOTDataSource
    | GraphMLDataSource
    | GMLDataSource
    | GEXFDataSource
    | CSVDataSource
    | PajekDataSource
    | JsonDataSource;

// Helper function to collect all chunks from a data source
async function collectChunks(dataSource: AnyDataSource): Promise<{ totalNodes: number; totalEdges: number }> {
    let totalNodes = 0;
    let totalEdges = 0;

    for await (const chunk of dataSource.getData()) {
        totalNodes += chunk.nodes.length;
        totalEdges += chunk.edges.length;
    }

    return { totalNodes, totalEdges };
}

// Load manifest for a given format
function loadManifest(format: string): Manifest {
    const manifestPath = join(__dirname, format, "manifest.json");
    const content = readFileSync(manifestPath, "utf-8");
    return JSON.parse(content) as Manifest;
}

// Define which formats to test
const formats = ["dot", "graphml", "gml", "gexf", "csv", "pajek", "json"];

describe("the corpus has nothing in it that nothing reads", () => {
    // WHY THIS EXISTS. Every test below walks the MANIFEST, so a file sitting in a corpus
    // directory that no manifest lists is parsed by nothing, ever. One was: a
    // `got-social-network.graphml` whose entire content was the four words "404: Not Found",
    // committed from a failed download and never read by anything for the nine months it sat
    // there. A corpus file that no test opens is not a test fixture, it is a file.
    for (const format of formats) {
        test(`every ${format} file on disk is listed in its manifest`, () => {
            const listed = new Set(loadManifest(format).files.map((file) => file.path));
            const onDisk = readdirSync(join(__dirname, format)).filter((name) => name !== "manifest.json");

            const unlisted = onDisk.filter((name) => !listed.has(name));
            assert.deepStrictEqual(
                unlisted,
                [],
                `${format}/ holds ${unlisted.join(", ")}, which no manifest entry names, so no test ever parses it`,
            );
        });

        test(`every ${format} file its manifest names is actually there`, () => {
            const onDisk = new Set(readdirSync(join(__dirname, format)));

            const missing = loadManifest(format).files.map((file) => file.path).filter((path) => !onDisk.has(path));
            assert.deepStrictEqual(missing, [], `${format}/manifest.json names ${missing.join(", ")}, which is not on disk`);
        });
    }
});

describe("Corpus Tests", () => {
    for (const format of formats) {
        describe(`${format.toUpperCase()} Format`, () => {
            let manifest: Manifest;

            try {
                manifest = loadManifest(format);
            } catch {
                test.skip(`No manifest for ${format}`, () => {
                    // Intentionally empty - manifest not found
                });
                return;
            }

            for (const file of manifest.files) {
                if (file.unreadable !== undefined) {
                    test(`lists ${file.path}, which the element refuses to read`, () => {
                        // Nothing is parsed here. The point is that the fixture is accounted for
                        // and its purpose is written down next to it; the refusal itself is
                        // asserted where it belongs, against a running element.
                        assert.isNotEmpty(file.unreadable, `${format}/${file.path} must say why it cannot be counted`);
                    });
                    continue;
                }

                if (file.companionOf !== undefined) {
                    test(`pairs ${file.path} with ${file.companionOf}`, () => {
                        // Half a graph, so there is nothing to parse alone. What IS checked is that
                        // the other half is really there, because a companion pointing at a file
                        // nobody ships is the same silent hole as a file nobody lists.
                        const partner = manifest.files.some((other) => other.path === file.companionOf);
                        assert.isTrue(partner, `${format}/${file.path} names ${file.companionOf}, which the manifest does not list`);
                    });
                    continue;
                }

                test(`parses ${file.path}`, async () => {
                    // Load file content
                    const filePath = join(__dirname, format, file.path);
                    const content = readFileSync(filePath, "utf-8");

                    // Get the appropriate DataSource class
                    const DataSourceClass = formatToDataSource[format];
                    assert.ok(DataSourceClass, `No DataSource for format: ${format}`);

                    // Create data source instance with format-specific config
                    const jsonConfig = format === "json" ? jsonVariantConfigs[file.path] : undefined;
                    const dataSource: AnyDataSource = jsonConfig
                        ? new DataSourceClass({ data: content, ...jsonConfig })
                        : new DataSourceClass({ data: content });

                    // Collect all chunks
                    const { totalNodes, totalEdges } = await collectChunks(dataSource);

                    // Verify expected counts with 90% threshold
                    // This accounts for minor parsing differences due to advanced features
                    const nodeThreshold = Math.floor(file.expectedNodes * 0.9);
                    const edgeThreshold = Math.floor(file.expectedEdges * 0.9);

                    assert.isAtLeast(
                        totalNodes,
                        nodeThreshold,
                        `Expected at least ${nodeThreshold} nodes (90% of ${file.expectedNodes}), got ${totalNodes}`,
                    );

                    assert.isAtLeast(
                        totalEdges,
                        edgeThreshold,
                        `Expected at least ${edgeThreshold} edges (90% of ${file.expectedEdges}), got ${totalEdges}`,
                    );

                    // Log results for debugging
                    // console.log(`${format}/${file.path}: ${totalNodes} nodes, ${totalEdges} edges`);
                });
            }
        });
    }
});
