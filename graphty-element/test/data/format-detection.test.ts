import { assert, describe, test } from "vitest";

import { formatDescriptor } from "../../src/catalog/formats.js";
import { detectFormat } from "../../src/data/format-detection.js";

describe("detectFormat", () => {
    test("detects GraphML from extension", () => {
        assert.strictEqual(detectFormat("graph.graphml", ""), "graphml");
    });

    test("detects GraphML from XML namespace", () => {
        const xml = '<?xml version="1.0"?><graphml xmlns="http://graphml.graphdrawing.org/xmlns">';
        assert.strictEqual(detectFormat("", xml), "graphml");
    });

    test("detects GEXF from namespace", () => {
        const xml = '<gexf xmlns="http://gexf.net/1.3">';
        assert.strictEqual(detectFormat("", xml), "gexf");
    });

    test("detects CSV from extension", () => {
        assert.strictEqual(detectFormat("edges.csv", ""), "csv");
    });

    test("detects GML from content", () => {
        const gml = "graph [\n  node [\n    id 1\n  ]\n]";
        assert.strictEqual(detectFormat("", gml), "gml");
    });

    test("returns null for unknown format", () => {
        assert.strictEqual(detectFormat("unknown.xyz", "random content"), null);
    });

    test("detects JSON from content", () => {
        const json = '{ "nodes": [], "edges": [] }';
        assert.strictEqual(detectFormat("", json), "json");
    });

    test("detects Pajek from content", () => {
        const pajek = '*Vertices 3\n1 "Node1"\n2 "Node2"\n3 "Node3"';
        assert.strictEqual(detectFormat("", pajek), "pajek");
    });

    test("detects DOT from content", () => {
        const dot = "digraph G {\n  A -> B;\n}";
        assert.strictEqual(detectFormat("", dot), "dot");
    });

    test("handles .xml extension with GraphML namespace", () => {
        const xml = '<?xml version="1.0"?><graphml xmlns="http://graphml.graphdrawing.org/xmlns">';
        assert.strictEqual(detectFormat("graph.xml", xml), "graphml");
    });

    test("handles .xml extension with GEXF namespace", () => {
        const xml = '<gexf xmlns="http://gexf.net/1.3">';
        assert.strictEqual(detectFormat("graph.xml", xml), "gexf");
    });

    // An XML document the element cannot read must come back as "I do not know this file", not as
    // a CSV. The CSV sniffer matches any line that reads `word , word` and the GML sniffer matches
    // `graph [` anywhere, and both of those turn up inside ordinary XML element content -- so
    // without a guard a catalogue export would be handed to the CSV reader and the user would be
    // told about a column instead of about the format.
    test("answers nothing for an XML document that is neither GraphML nor GEXF", () => {
        const xml = '<?xml version="1.0"?>\n<rows>\nalpha,beta\n</rows>';

        assert.strictEqual(detectFormat("", xml), null);
    });

    test("answers nothing for an XML document whose text happens to mention a GML opening", () => {
        const xml = '<?xml version="1.0"?>\n<doc>graph [ x ]</doc>';

        assert.strictEqual(detectFormat("", xml), null);
    });

    test("detects CSV from the tab-separated extensions and MIME type", () => {
        assert.strictEqual(detectFormat("edges.tsv", ""), "csv");
        assert.strictEqual(detectFormat("edges.tab", ""), "csv");
        assert.include(formatDescriptor("csv")?.mimeTypes ?? [], "text/tab-separated-values");
    });

    test("detects unnamed tab, semicolon and pipe separated content as CSV", () => {
        assert.strictEqual(detectFormat("", "source\ttarget\na\tb\n"), "csv");
        assert.strictEqual(detectFormat("", "source;target\na;b\n"), "csv");
        assert.strictEqual(detectFormat("", "source|target\na|b\n"), "csv");
    });
});
