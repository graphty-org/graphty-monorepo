import { assert, describe, test } from "vitest";

import { detectFormats } from "../../src/catalog/detect.js";
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

    test("detects GEXF 1.2, whose namespace carries www, from its root element", () => {
        const xml = '<?xml version="1.0"?>\n<gexf xmlns="http://www.gexf.net/1.2draft" version="1.2">';
        assert.strictEqual(detectFormat("", xml), "gexf");
    });

    test("does not read a JSON document that mentions an XML root as XML", () => {
        const json = '{ "nodes": [{ "id": "a", "label": "<gexf >" }], "edges": [] }';
        assert.strictEqual(detectFormat("", json), "json");
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

    // The built-in sniffers are graph-io's, so the element recognises what graph-io's importers
    // recognise -- including the files the element's old regular expressions turned away.
    describe("through graph-io's sniffers", () => {
        test("detects DOT behind a leading comment", () => {
            assert.strictEqual(detectFormat("", "// exported by a tool\ndigraph G {\n  A -> B;\n}"), "dot");
        });

        test("detects GEXF and GraphML by their root element when the namespace is missing", () => {
            assert.strictEqual(detectFormat("", '<?xml version="1.0"?>\n<gexf version="1.2"><graph/></gexf>'), "gexf");
            assert.strictEqual(detectFormat("", '<?xml version="1.0"?>\n<graphml><graph/></graphml>'), "graphml");
        });

        test("detects a neo4j-admin header as CSV, the element format that reads it", () => {
            assert.strictEqual(detectFormat("", ":START_ID,:END_ID,:TYPE\n1,2,KNOWS\n"), "csv");
        });

        test("detects a delimited table whose header graph-io does not know as CSV", () => {
            assert.strictEqual(detectFormat("", "a,b\nb,c\n"), "csv");
            assert.strictEqual(detectFormat("", "person,friend\nalice,bob"), "csv");
            assert.strictEqual(detectFormat("", "user,follows,weight\n1,2,0.5"), "csv");
            assert.strictEqual(detectFormat("", "a\tb\nx\ty"), "csv");
            assert.strictEqual(detectFormat("", "left;right\nx;y"), "csv");
        });

        test("does not name space-separated text CSV, which the CSV reader cannot split", () => {
            assert.strictEqual(detectFormat("", "source target\na b\nb c"), null);
            assert.strictEqual(detectFormat("", "id name\n1 foo"), null);
            assert.strictEqual(detectFormat("", "Name of the report\nThe first line of text"), null);
        });

        test("detects a CSV whose first column is named graph as CSV, not DOT", () => {
            assert.deepStrictEqual(detectFormats({ sample: "graph,id,name\ng1,1,x" }), ["csv"]);
        });

        test("detects a single-column neo4j-admin node file as CSV", () => {
            assert.deepStrictEqual(detectFormats({ sample: ":ID\n1\n2\n" }), ["csv"]);
        });

        test("names CSV once when both of its graph-io importers claim the content", () => {
            assert.deepStrictEqual(detectFormats({ sample: ":START_ID,:END_ID,:TYPE\n1,2,KNOWS\n" }), ["csv"]);
        });
    });
});
