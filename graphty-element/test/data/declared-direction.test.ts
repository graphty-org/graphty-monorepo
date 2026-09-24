/**
 * @file The direction a graph file declares, and what the element does with it.
 *
 * WHAT THIS PROTECTS. A graph file usually says whether it is directed -- GEXF writes
 * `defaultedgetype`, GraphML writes `edgedefault`, GML writes a `directed` key, DOT opens with
 * `graph` or `digraph`, Pajek puts its edges under `*Arcs` or `*Edges`. The element used to read
 * none of it: the builder starts directed, nothing changed it, and so every file was a digraph.
 *
 * That is not a cosmetic mislabel. Density is measured against the pairs that could carry an edge,
 * and a directed graph has twice as many of those, so the karate club network printed HALF its
 * real density. Every algorithm that needs an undirected graph -- Kruskal, Prim, bipartite
 * matching -- was refused on every graph. A node inspector split the neighbours of every node into
 * incoming and outgoing on a file whose edges have no direction to split.
 *
 * The files below are the corpus this repository ships, read through the same data sources the
 * element parses them with. They are real published datasets, and the direction each of them
 * declares is a fact about the file, not a fixture this test invented.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { assert, describe, it } from "vitest";

import { DataConfig } from "../../src/config/DataConfig";
import { CSVDataSource } from "../../src/data/CSVDataSource";
import type { DataSource } from "../../src/data/DataSource";
import { DOTDataSource } from "../../src/data/DOTDataSource";
import { GEXFDataSource } from "../../src/data/GEXFDataSource";
import { GMLDataSource } from "../../src/data/GMLDataSource";
import { GraphMLDataSource } from "../../src/data/GraphMLDataSource";
import { GraphStore } from "../../src/data/GraphStore";
import { ingestDeclaredDirection, ingestEdge, ingestNode } from "../../src/data/ingest";
import { JsonDataSource } from "../../src/data/JsonDataSource";
import { PajekDataSource } from "../../src/data/PajekDataSource";
import { createGraphSession, type GraphSession } from "../../src/session";

/** Where the shipped corpus lives, relative to this file. */
const CORPUS = join(__dirname, "..", "helpers", "corpus");

/** The formats a corpus file can be read as, spelled the way the data source registry spells them. */
type Format = "gexf" | "gml" | "graphml" | "dot" | "pajek" | "csv" | "json";

/**
 * Build the data source for one format over the text of a file.
 * @param format - the format to read it as
 * @param data - the file's text
 * @param options - extra data source options, which only the JSON source needs
 * @returns the source, ready to iterate
 */
function sourceFor(format: Format, data: string, options: object = {}): DataSource {
    const config = { data, ...options };
    switch (format) {
        case "gexf":
            return new GEXFDataSource(config);
        case "gml":
            return new GMLDataSource(config);
        case "graphml":
            return new GraphMLDataSource(config);
        case "dot":
            return new DOTDataSource(config);
        case "pajek":
            return new PajekDataSource(config);
        case "csv":
            return new CSVDataSource(config);
        default:
            return new JsonDataSource(config);
    }
}

/**
 * Read a corpus file to the end and report what it declared about its own direction.
 *
 * The chunks are pulled because parsing does not start until they are: a source asked for its
 * declaration before anything has been iterated has parsed nothing and declares nothing.
 * @param format - the format to read it as
 * @param file - the path inside the corpus directory
 * @param options - extra data source options
 * @returns the declaration, or null when the file stated nothing
 */
async function declarationOf(
    format: Format,
    file: string,
    options: object = {},
): Promise<{ directed: boolean; statedBy: string; conflictingEdges: number } | null> {
    const source = sourceFor(format, readFileSync(join(CORPUS, file), "utf-8"), options);
    for await (const _chunk of source.getData()) {
        // Every chunk, to the end of the file: a format that learns its direction from the edges
        // themselves has not finished learning it until the last one has been read.
    }

    return source.declaredDirection;
}

/** A session over a store, and the store itself so a test can load a second file into it. */
interface Loaded {
    /** The session, which is what a consumer asks for statistics. */
    session: GraphSession;
    /** The store behind it. */
    store: GraphStore;
}

/**
 * Build an empty session and store under one direction policy.
 * @param directed - `config.data.directed`: a boolean settles it, "auto" leaves it to the file
 * @returns the session and its store
 */
function emptySession(directed: boolean | "auto"): Loaded {
    const config = DataConfig.parse({ directed });
    const store = new GraphStore({
        directed: config.directed,
        positionScale: () => config.knownFields.positionScale,
        onReplaced: () => undefined,
        onNodeRemap: () => undefined,
        onEdgeRemap: () => undefined,
    });

    return { session: createGraphSession({ store, config: { data: config } }), store };
}

/**
 * Push a corpus file into a store exactly the way `DataManager.addDataFromSource` does: the file's
 * declaration first, then that chunk's nodes and edges.
 * @param store - the store to load into
 * @param format - the format to read the file as
 * @param file - the path inside the corpus directory
 * @param options - extra data source options
 * @returns nothing; the store holds the graph when it resolves
 */
async function loadInto(store: GraphStore, format: Format, file: string, options: object = {}): Promise<void> {
    const source = sourceFor(format, readFileSync(join(CORPUS, file), "utf-8"), options);
    for await (const chunk of source.getData()) {
        if (source.declaredDirection !== null) {
            ingestDeclaredDirection(store, source.declaredDirection.directed, source.declaredDirection.statedBy);
        }

        for (const node of chunk.nodes) {
            const record = node as unknown as Record<string, unknown>;
            ingestNode(store, record.id, record);
        }

        for (const edge of chunk.edges) {
            const record = edge as unknown as Record<string, unknown>;
            const weight = typeof record.weight === "number" ? record.weight : 1;
            // `source` and `target`: every importer now writes the names the ecosystem writes,
            // rather than one of them renaming into a spelling nothing else uses.
            ingestEdge(store, record.source, record.target, weight);
        }
    }
}

/**
 * Load one corpus file into a fresh session.
 * @param format - the format to read it as
 * @param file - the path inside the corpus directory
 * @param directed - `config.data.directed`
 * @param options - extra data source options
 * @returns the session and its store
 */
async function load(
    format: Format,
    file: string,
    directed: boolean | "auto" = "auto",
    options: object = {},
): Promise<Loaded> {
    const loaded = emptySession(directed);
    await loadInto(loaded.store, format, file, options);
    return loaded;
}

describe("the direction a file declares", () => {
    it("reads GEXF's defaultedgetype, including the undirected default of a file that omits it", async () => {
        assert.deepStrictEqual(await declarationOf("gexf", "gexf/lesmiserables.gexf"), {
            directed: false,
            statedBy: 'defaultedgetype="undirected"',
            conflictingEdges: 0,
        });

        // A GEXF file may leave the attribute out, and no corpus file does. The GEXF schema gives
        // it the default "undirected", so a file that omits it has still said which it is.
        const source = new GEXFDataSource({
            data: '<?xml version="1.0"?><gexf version="1.2"><graph>' +
                '<nodes><node id="a"/><node id="b"/></nodes>' +
                '<edges><edge id="e" source="a" target="b"/></edges></graph></gexf>',
        });
        for await (const _chunk of source.getData()) {
            // Drive the parse to the end.
        }

        assert.strictEqual(source.declaredDirection?.directed, false);
    });

    it("keeps the GEXF graph's own declaration when an edge contradicts it, and counts the edge", async () => {
        // No corpus file mixes edge types, and a file may: GEXF allows `type` per edge. The
        // <graph> element is what the whole graph is read as -- one edge attribute must not decide
        // how the other quarter of a million are read -- and the edge keeps its own `type`.
        const source = new GEXFDataSource({
            data: '<?xml version="1.0"?><gexf version="1.2"><graph defaultedgetype="undirected">' +
                '<nodes><node id="a"/><node id="b"/><node id="c"/></nodes>' +
                '<edges><edge id="e0" source="a" target="b"/>' +
                '<edge id="e1" source="b" target="c" type="directed"/></edges></graph></gexf>',
        });
        const edges = [];
        for await (const chunk of source.getData()) {
            edges.push(...chunk.edges);
        }

        assert.deepStrictEqual(source.declaredDirection, {
            directed: false,
            statedBy: 'defaultedgetype="undirected"',
            conflictingEdges: 1,
        });
        assert.strictEqual((edges[1] as unknown as Record<string, unknown>).type, "directed");
    });

    it("reads a GEXF file whose only direction statement is on its edges as directed", async () => {
        // The attribute the graph element never wrote and the attribute it wrote are not equally
        // strong. Here nothing wrote `defaultedgetype`, so the edges are the file's ONLY statement
        // about direction, and reading them as undirected would invent a reverse path for every
        // edge the author explicitly marked directed. The GEXF schema's default still applies to a
        // file whose edges say nothing -- that is the case above, and it is what karate-style files
        // depend on -- but a default must not outrank the one place the author did write.
        const source = new GEXFDataSource({
            data: '<?xml version="1.0"?><gexf version="1.2"><graph>' +
                '<nodes><node id="a"/><node id="b"/><node id="c"/></nodes>' +
                '<edges><edge id="e0" source="a" target="b" type="directed"/>' +
                '<edge id="e1" source="b" target="c" type="directed"/></edges></graph></gexf>',
        });
        for await (const _chunk of source.getData()) {
            // Drive the parse to the end.
        }

        assert.deepStrictEqual(source.declaredDirection, {
            directed: true,
            statedBy: 'type="directed" on 2 edge(s), with no defaultedgetype on <graph>',
            conflictingEdges: 0,
        });
    });

    it("lets a written GEXF defaultedgetype outrank the edges, even when every edge disagrees", async () => {
        // The mirror of the test above, and the reason the rule is about WRITTEN rather than about
        // which side has more evidence. An author who typed `defaultedgetype="undirected"` and then
        // marked every edge directed described a mixed graph; the graph-level statement is the
        // file's word on the graph as a whole, and each override is counted rather than discarded.
        const source = new GEXFDataSource({
            data: '<?xml version="1.0"?><gexf version="1.2"><graph defaultedgetype="undirected">' +
                '<nodes><node id="a"/><node id="b"/><node id="c"/></nodes>' +
                '<edges><edge id="e0" source="a" target="b" type="directed"/>' +
                '<edge id="e1" source="b" target="c" type="directed"/></edges></graph></gexf>',
        });
        for await (const _chunk of source.getData()) {
            // Drive the parse to the end.
        }

        assert.deepStrictEqual(source.declaredDirection, {
            directed: false,
            statedBy: 'defaultedgetype="undirected"',
            conflictingEdges: 2,
        });
    });

    it("says an unreadable direction attribute was there, rather than that the file omitted it", async () => {
        // Both formats fall back to their spec's default for a value they cannot read, which is
        // right. What was wrong is the sentence the element printed about it: a consumer told their
        // file omitted the attribute goes looking for one that is sitting in the file, spelled
        // wrong. The direction is unchanged; only the explanation is.
        const gexf = new GEXFDataSource({
            data: '<?xml version="1.0"?><gexf version="1.2"><graph defaultedgetype="mutualish">' +
                '<nodes><node id="a"/><node id="b"/></nodes>' +
                '<edges><edge id="e" source="a" target="b"/></edges></graph></gexf>',
        });
        for await (const _chunk of gexf.getData()) {
            // Drive the parse to the end.
        }

        assert.deepStrictEqual(gexf.declaredDirection, {
            directed: false,
            statedBy: 'an unreadable defaultedgetype="mutualish", leaving the GEXF default (undirected)',
            conflictingEdges: 0,
        });

        const gml = new GMLDataSource({
            data: 'graph [ directed "yes" node [ id 1 ] node [ id 2 ] edge [ source 1 target 2 ] ]',
        });
        for await (const _chunk of gml.getData()) {
            // Drive the parse to the end.
        }

        assert.deepStrictEqual(gml.declaredDirection, {
            directed: false,
            statedBy: 'an unreadable directed yes, leaving the GML default (undirected)',
            conflictingEdges: 0,
        });
    });

    it("keeps the GraphML graph's own declaration when an edge contradicts it, and counts the edge", async () => {
        const source = new GraphMLDataSource({
            data: '<?xml version="1.0"?><graphml><graph edgedefault="undirected">' +
                '<node id="a"/><node id="b"/><node id="c"/>' +
                '<edge source="a" target="b"/><edge source="b" target="c" directed="true"/>' +
                "</graph></graphml>",
        });
        const edges = [];
        for await (const chunk of source.getData()) {
            edges.push(...chunk.edges);
        }

        assert.deepStrictEqual(source.declaredDirection, {
            directed: false,
            statedBy: 'edgedefault="undirected"',
            conflictingEdges: 1,
        });
        // The edge's own answer is kept on its record, where a style layer can still read it.
        assert.strictEqual((edges[1] as unknown as Record<string, unknown>).directed, true);
    });

    it("reads GraphML's edgedefault", async () => {
        assert.deepStrictEqual(await declarationOf("graphml", "graphml/simple.graphml"), {
            directed: false,
            statedBy: 'edgedefault="undirected"',
            conflictingEdges: 0,
        });

        assert.deepStrictEqual(await declarationOf("graphml", "graphml/yfiles-sample.graphml"), {
            directed: true,
            statedBy: 'edgedefault="directed"',
            conflictingEdges: 0,
        });
    });

    it("says nothing for a GraphML file with no edgedefault, which the specification requires", async () => {
        // The attribute is REQUIRED by GraphML, so a file without it is malformed rather than
        // silent -- and a malformed document is not something to read a direction out of.
        const source = new GraphMLDataSource({
            data: '<?xml version="1.0"?><graphml><graph><node id="a"/><node id="b"/>' +
                '<edge source="a" target="b"/></graph></graphml>',
        });
        for await (const _chunk of source.getData()) {
            // Drive the parse to the end.
        }

        assert.isNull(source.declaredDirection);
    });

    it("reads GML's directed key, and its undirected default when the key is absent", async () => {
        assert.deepStrictEqual(await declarationOf("gml", "gml/football.gml"), {
            directed: false,
            statedBy: "directed 0",
            conflictingEdges: 0,
        });

        // karate.gml carries no `directed` key anywhere. GML gives an omitted key the value 0, so
        // the file has declared itself undirected -- which is how every other reader takes it, and
        // is why this shipped sample was labelled "Directed" everywhere but in its own header.
        const karate = await declarationOf("gml", "gml/karate.gml");
        assert.strictEqual(karate?.directed, false);
        assert.strictEqual(karate?.conflictingEdges, 0);
    });

    it("reads DOT's opening keyword", async () => {
        assert.deepStrictEqual(await declarationOf("dot", "dot/fsm.gv"), {
            directed: true,
            statedBy: "digraph",
            conflictingEdges: 0,
        });

        assert.deepStrictEqual(await declarationOf("dot", "dot/fdpclust.gv"), {
            directed: false,
            statedBy: "graph",
            conflictingEdges: 0,
        });
    });

    it("says nothing for a DOT file with no opening keyword", async () => {
        const source = new DOTDataSource({ data: "{ a -> b }" });
        for await (const _chunk of source.getData()) {
            // Drive the parse to the end.
        }

        assert.isNull(source.declaredDirection);
    });

    it("reads Pajek's sections: arcs are directed, edges are not", async () => {
        assert.deepStrictEqual(await declarationOf("pajek", "pajek/karate.net"), {
            directed: false,
            statedBy: "*Edges",
            conflictingEdges: 0,
        });

        // simple.net carries both sections: three lines under *Arcs and two under *Edges. The
        // graph is read as directed, and the two undirected lines are counted as overridden
        // rather than quietly turned into arcs.
        assert.deepStrictEqual(await declarationOf("pajek", "pajek/simple.net"), {
            directed: true,
            statedBy: "*Arcs",
            conflictingEdges: 2,
        });
    });

    it("reads a Gephi CSV's Type column, and counts the rows it overrides", async () => {
        assert.deepStrictEqual(await declarationOf("csv", "csv/dolphins-medium.csv"), {
            directed: false,
            statedBy: "Type=Undirected",
            conflictingEdges: 0,
        });

        // gephi-format.csv mixes three Directed rows with two Undirected ones.
        assert.deepStrictEqual(await declarationOf("csv", "csv/gephi-format.csv"), {
            directed: true,
            statedBy: "Type=Directed",
            conflictingEdges: 2,
        });
    });

    it("reads a node-link JSON document's directed key", async () => {
        assert.deepStrictEqual(
            await declarationOf("json", "json/networkx-format.json", { node: { path: "nodes" }, edge: { path: "links" } }),
            { directed: true, statedBy: '"directed": true', conflictingEdges: 0 },
        );
    });

    it("says nothing for the formats that state nothing", async () => {
        // A CSV edge list of source,target pairs is exactly as compatible with a digraph as with
        // an undirected graph, and a JSON document with no `directed` key has not said either. A
        // guess here would overrule the element's own configuration with an invention.
        assert.isNull(await declarationOf("csv", "csv/simple-edges.csv"));
        assert.isNull(
            await declarationOf("json", "json/d3-format.json", { node: { path: "nodes" }, edge: { path: "links" } }),
        );
    });
});

describe("the graph the element then measures", () => {
    it("reports the karate club network as undirected, at its real density", async () => {
        const { session } = await load("gml", "gml/karate.gml");
        const stats = session.data.statistics();

        assert.strictEqual(stats.nodeCount, 34);
        assert.strictEqual(stats.edgeCount, 78);
        assert.strictEqual(stats.directedness, "undirected");

        // 34 nodes pair up 561 ways, and 78 of those pairs carry an edge. Read as a digraph the
        // same 78 edges are measured against 1122 ORDERED pairs, which is where the halved figure
        // this file exists to prevent comes from.
        const undirectedPairs = (34 * 33) / 2;
        assert.closeTo(stats.density, 78 / undirectedPairs, 1e-12);
        assert.closeTo(stats.density, 0.139, 1e-3);
        session.dispose();
    });

    it("reports the football network as undirected, at its real density", async () => {
        const { session } = await load("gml", "gml/football.gml");
        const stats = session.data.statistics();

        assert.strictEqual(stats.nodeCount, 115);
        assert.strictEqual(stats.edgeCount, 613);
        assert.strictEqual(stats.directedness, "undirected");
        assert.closeTo(stats.density, 613 / ((115 * 114) / 2), 1e-12);
        session.dispose();
    });

    it("offers the algorithms that need an undirected graph on a file that declares one", async () => {
        // The refusal these had before the fix was "Needs an undirected graph; this graph is
        // directed", on a file whose own header says otherwise.
        const { session } = await load("gml", "gml/karate.gml");
        const metrics = session.catalog.metrics();

        for (const key of ["kruskal", "prim", "bipartite-matching"]) {
            const metric = metrics.find((candidate) => candidate.key === key);
            assert.isDefined(metric, `${key} is in the catalogue`);
            assert.isTrue(metric?.available, `${key} is available on a graph whose file says undirected`);
        }

        session.dispose();
    });

    it("refuses those same algorithms when the graph really is directed", async () => {
        // The other half of the assertion above: the reason exists and is right for a digraph, so
        // a passing test up there means the direction changed rather than the refusal disappearing.
        const { session } = await load("dot", "dot/fsm.gv");
        const metric = session.catalog.metrics().find((candidate) => candidate.key === "kruskal");

        assert.isFalse(metric?.available, "kruskal needs an undirected graph and fsm.gv is a digraph");
        assert.include(metric?.reason ?? "", "undirected");
        session.dispose();
    });

    it("still reports a directed file as directed", async () => {
        const { session } = await load("dot", "dot/fsm.gv");
        assert.strictEqual(session.data.statistics().directedness, "directed");
        session.dispose();
    });

    it("leaves a graph nothing has declared anything about alone", async () => {
        // A CSV edge list states no direction, so the element's own configuration stands. Under
        // "auto" that is the builder's starting value, which is directed.
        const { session } = await load("csv", "csv/simple-edges.csv");
        assert.strictEqual(session.data.statistics().directedness, "directed");
        session.dispose();
    });
});

describe("what the element says settled the direction", () => {
    it("credits the file, and quotes the words that said so", async () => {
        // The element knew this all along and kept it to itself: every importer reports the text
        // that stated the direction, and until now that text reached a log line and nothing else.
        // A properties panel is specified to read "Directed (from file)", and without this it can
        // only say "Directed" -- which on a CSV nobody labelled would be the element's own default
        // being reported as though it were a fact about the data.
        const { session } = await load("gml", "gml/karate.gml");

        assert.deepStrictEqual(session.data.statistics().directednessSource, {
            by: "file",
            statedBy: "the GML default for an absent directed key (undirected)",
        });
        session.dispose();
    });

    it("quotes a header the file actually wrote", async () => {
        const gexf = await load("gexf", "gexf/lesmiserables.gexf");
        assert.deepStrictEqual(gexf.session.data.statistics().directednessSource, {
            by: "file",
            statedBy: 'defaultedgetype="undirected"',
        });
        gexf.session.dispose();

        const dot = await load("dot", "dot/fsm.gv");
        assert.deepStrictEqual(dot.session.data.statistics().directednessSource, {
            by: "file",
            statedBy: "digraph",
        });
        dot.session.dispose();
    });

    it("credits the consumer, not the file, when the configuration had already settled it", async () => {
        // The file is still read and still logged, and it still loses. Reporting this as coming
        // from the file would tell a reader their data said something it was overruled on.
        const { session } = await load("dot", "dot/fsm.gv", false);

        assert.strictEqual(session.data.statistics().directedness, "undirected");
        assert.deepStrictEqual(session.data.statistics().directednessSource, {
            by: "configuration",
            statedBy: null,
        });
        session.dispose();
    });

    it("stays unsettled for a file that states nothing", async () => {
        // A plain edge-list CSV has no header to read. The graph still has a direction -- the
        // element's own default -- and nothing in the data chose it.
        const { session } = await load("csv", "csv/simple-edges.csv");

        assert.deepStrictEqual(session.data.statistics().directednessSource, {
            by: "unsettled",
            statedBy: null,
        });
        session.dispose();
    });
});

describe("who wins when a file and a consumer disagree", () => {
    it("keeps an explicit directed: true over a file header that says undirected", async () => {
        // A consumer who says "this graph is directed" has settled it. karate.gml says undirected
        // in its own header and does not get to overrule them.
        const { session, store } = await load("gml", "gml/karate.gml", true);

        assert.strictEqual(session.data.statistics().directedness, "directed");
        assert.strictEqual(store.builder.directed, true);
        assert.closeTo(session.data.statistics().density, 78 / (34 * 33), 1e-12);
        session.dispose();
    });

    it("keeps an explicit directed: false over a file header that says directed", async () => {
        const { session, store } = await load("dot", "dot/fsm.gv", false);

        assert.strictEqual(session.data.statistics().directedness, "undirected");
        assert.strictEqual(store.builder.directed, false);
        session.dispose();
    });

    it("does not throw when the locked direction and the file's disagree", () => {
        // setDirected on a locked builder whose value differs throws E_DIRECTED, which would turn
        // a legitimate `directed: false` plus a digraph file into a failed import. The lock is
        // checked, not caught.
        const { store, session } = emptySession(false);
        assert.isTrue(store.builder.directedLocked);
        assert.strictEqual(ingestDeclaredDirection(store, true, "digraph"), "config-wins");
        assert.strictEqual(store.builder.directed, false);
        session.dispose();
    });

    it("lets the first file settle the direction of a graph a second file is added to", async () => {
        // graph-format accepts directed -> undirected only while the builder is empty, and accepts
        // undirected -> directed with live edges only by mirroring every edge it already holds --
        // which would silently double the first file's edge count. So the second file is refused,
        // and the caller is told which it was.
        const { session, store } = await load("gml", "gml/karate.gml");
        assert.strictEqual(store.builder.directed, false);

        assert.strictEqual(ingestDeclaredDirection(store, true, "digraph"), "edges-present");
        assert.strictEqual(session.data.statistics().directedness, "undirected");
        session.dispose();
    });

    it("costs nothing when the file declares what the builder already holds", () => {
        const { store, session } = emptySession("auto");
        assert.strictEqual(ingestDeclaredDirection(store, true, "digraph"), "unchanged");

        // Locked and in agreement is not a conflict either: there is simply nothing to do.
        const locked = emptySession(true);
        assert.strictEqual(ingestDeclaredDirection(locked.store, true, "digraph"), "unchanged");
        session.dispose();
        locked.session.dispose();
    });
});
