/**
 * Robustness of format detection and the registry (src/sniff.ts, src/registry.ts): wrong names,
 * compressed, archived and foreign files, comments longer than the sniffed head, plugin sniffers
 * that throw, the caller's encoding, and option errors that must not leave a peeked stream locked.
 */

import { GraphFormatError } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import { csvImporter } from "../../src/formats/csv/index.js";
import { createRegistry, importGraph, sniff } from "../../src/registry.js";
import { extensionOf, SNIFF_HEAD_BYTES } from "../../src/sniff.js";
import { type GraphImporter } from "../../src/types.js";
import { makeZip } from "../helpers/zip.js";
import { bytesOf, codes, importFailure, rejection, utf16 } from "./helpers.js";

const HTML_404 = "<!DOCTYPE html>\n<html><head><title>404 Not Found</title></head>\n<body><h1>Not Found</h1></body></html>\n";
const GRAPHML = '<?xml version="1.0"?><graphml xmlns="http://graphml.graphdrawing.org/xmlns"><graph edgedefault="directed"><node id="a"/><node id="b"/><edge source="a" target="b"/></graph></graphml>';

describe("robustness: files that are no graph at all", () => {
    it("refuses an HTML error page under any graph extension, saying it is an HTML document", async () => {
        for (const filename of ["g.csv", "g.json", "g.gml", "g.dot", "g.net", "g.gexf", "g.graphml", null]) {
            const err = await importFailure(importGraph(HTML_404, { filename }));
            expect(err.details.code).toBe("E_UNKNOWN_FORMAT");
            expect(err.message).toContain("HTML document");
        }
    });

    it("refuses gzip data with its compound extension, saying to decompress it", async () => {
        const gzip = bytesOf([0x1f, 0x8b, 0x08, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x03], "garbage");
        for (const filename of ["g.graphml.gz", "g.csv.gz", "g.csv"]) {
            const err = await importFailure(importGraph(gzip, { filename }));
            expect(err.details.code).toBe("E_UNKNOWN_FORMAT");
            expect(err.message).toContain("gzip-compressed data (decompress it first)");
        }
    });

    it("refuses gzip data read as a named format with E_FOREIGN_FORMAT (the message claimed valid UTF-8 text)", async () => {
        const gzip = bytesOf([0x1f, 0x8b, 0x08, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x03, 0xab, 0xcd]);
        const err = await importFailure(importGraph(gzip, { format: "csv" }));
        expect(codes(err.report)).toEqual(["E_FOREIGN_FORMAT"]);
        expect(err.message).toContain("gzip");
    });

    it("refuses a zip that is not a Cytoscape session under an XML name; a session is still read", async () => {
        const zip = makeZip([{ name: "readme.txt", data: "hello" }]);
        const err = await importFailure(importGraph(zip, { filename: "g.graphml" }));
        expect(err.details.code).toBe("E_UNKNOWN_FORMAT");
        expect(err.message).toContain("zip archive");
        const named = await importFailure(importGraph(zip, { format: "graphml" }));
        expect(codes(named.report)).toEqual(["E_FOREIGN_FORMAT"]);
    });

    it("refuses a PNG named g.csv instead of importing it as windows-1252 rows", async () => {
        const png = bytesOf([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x80, 0x81, 0x82]);
        const err = await importFailure(importGraph(png, { filename: "g.csv" }));
        expect(err.message).toContain("PNG image");
    });

    it("refuses a PDF named g.csv instead of resolving an empty graph", async () => {
        const pdf = "%PDF-1.4\n%abc\n1 0 obj\n<< /Type /Catalog >>\nendobj\n";
        const err = await importFailure(importGraph(pdf, { filename: "g.csv" }));
        expect(codes(err.report)).toEqual(["E_FOREIGN_FORMAT"]);
        expect(err.message).toContain("PDF document");
    });

    it("rejects JSON Lines with a message that names JSON Lines", async () => {
        const err = await importFailure(importGraph('{"source":"a","target":"b"}\n{"source":"b","target":"c"}\n'));
        expect(codes(err.report)).toEqual(["E_SYNTAX"]);
        expect(err.message).toContain("JSON Lines");
    });
});

describe("robustness: comments longer than the sniffed head", () => {
    it("never reads a DOT file behind a 9 KB license comment as CSV: E_UNKNOWN_FORMAT", async () => {
        const text = `/* ${"license text ".repeat(700)} */\ndigraph { a -> b }\n`;
        expect(text.indexOf("digraph")).toBeGreaterThan(SNIFF_HEAD_BYTES);
        const err = await importFailure(importGraph(text));
        expect(err.details.code).toBe("E_UNKNOWN_FORMAT");
        const { snapshot } = await importGraph(text, { filename: "g.dot" });
        expect(snapshot.edgeCount).toBe(1);
    });

    it("never lets another format claim GML behind more than 8 KB of # comments", async () => {
        const text = `${"# exported by a tool\n".repeat(500)}graph [ node [ id 1 ] node [ id 2 ] edge [ source 1 target 2 ] ]\n`;
        const err = await importFailure(importGraph(text));
        expect(err.details.code).toBe("E_UNKNOWN_FORMAT");
    });

    it("detects GraphML behind a 9 KB XML comment", async () => {
        const text = GRAPHML.replace("?>", `?><!-- ${"x".repeat(9000)} -->`);
        const { format, snapshot } = await importGraph(text);
        expect(format).toBe("graphml");
        expect(snapshot.edgeCount).toBe(1);
    });

    it("detects Pajek whose first lines are % comments", async () => {
        const { format, snapshot } = await importGraph('% exported by Pajek\n%\n*Vertices 2\n1 "a"\n2 "b"\n*Arcs\n1 2\n');
        expect(format).toBe("pajek");
        expect(snapshot.edgeCount).toBe(1);
    });

    it("detects DOT and GML after their own comments, GML after a BOM and GraphML after a DOCTYPE", async () => {
        const bom = String.fromCharCode(0xfeff);
        expect((await importGraph("/* c */\n// c\n# c\ndigraph { a -> b }")).format).toBe("dot");
        expect((await importGraph("# c\n# c\ngraph [ node [ id 1 ] ]")).format).toBe("gml");
        expect((await importGraph(`${bom}graph [ node [ id 1 ] ]`)).format).toBe("gml");
        const doctype = GRAPHML.replace("?>", '?><!-- c --><!DOCTYPE graphml SYSTEM "graphml.dtd">');
        expect((await importGraph(doctype)).format).toBe("graphml");
    });
});

describe("robustness: names, hints and plugins", () => {
    it("takes the extension of a URL without its query and fragment", () => {
        expect(extensionOf("https://host/g.gml?download=1")).toBe(".gml");
        expect(extensionOf("g.graphml#v2")).toBe(".graphml");
        // in a plain file name, ? and # are ordinary characters
        expect(extensionOf("net#2.gexf")).toBe(".gexf");
        expect(extensionOf("run?.graphml")).toBe(".graphml");
        expect(extensionOf("C:\\data\\net#2.gml")).toBe(".gml");
        expect(extensionOf("file:///data/g.gexf#top")).toBe(".gexf");
        expect(sniff({ filename: "https://host/data/g.gml?download=1&x=y.csv" })?.format).toBe("gml");
    });

    it("treats a plugin sniffer that throws as not recognising the head", async () => {
        const broken: GraphImporter = { ...csvImporter, format: "broken", sniff: (): number => {
            throw new Error("plugin bug");
        } };
        const registry = createRegistry().registerImporter(broken);
        expect(registry.sniff({ head: "graph [ node [ id 1 ] ]" })?.format).toBe("gml");
        const { format, report } = await registry.importGraph("graph [ node [ id 1 ] ]");
        expect(format).toBe("gml");
        // the plugin's defect is not hidden: the import report names it
        expect(codes(report)).toEqual(["W_SNIFF_FAILED"]);
        expect(report.warningCount).toBe(1);
        expect(report.issues[0].element).toBe("broken");
        expect(report.issues[0].message).toContain("plugin bug");
        const err = await importFailure(registry.importGraph("\u0001\u0002"));
        expect(codes(err.report)).toEqual(["W_SNIFF_FAILED", "E_UNKNOWN_FORMAT"]);
    });

    it("refuses whitespace-only input with no hints", async () => {
        const err = await importFailure(importGraph("   \n\n"));
        expect(err.details.code).toBe("E_UNKNOWN_FORMAT");
    });

    it("sniffs the head in the caller's encoding, as the importer reads it", async () => {
        const bytes = utf16(GRAPHML, true, false);
        const { format, snapshot } = await importGraph(bytes, { encoding: "utf-16le" });
        expect(format).toBe("graphml");
        expect(snapshot.edgeCount).toBe(1);
    });

    it("reads Excel's Unicode text (UTF-16LE with a BOM, tabs, CRLF) with no hints", async () => {
        const { format, snapshot } = await importGraph(utf16("source\ttarget\r\na\tb\r\nb\tc\r\n", true, true));
        expect(format).toBe("csv");
        expect(snapshot.edgeCount).toBe(2);
    });

    it("reports a fatal unknown format as not truncated", async () => {
        const empty = new ReadableStream<Uint8Array>({
            start(controller): void {
                controller.close();
            },
        });
        const err = await importFailure(importGraph(empty));
        expect(err.details.code).toBe("E_UNKNOWN_FORMAT");
        expect(err.report.truncated).toBe(false);
        const bad = await importFailure(importGraph(bytesOf("source,target\ncaf", [0xc3, 0xa9], ",b\nx", [0xe9], ",y\n"), { format: "csv", errorLimit: 0 }));
        expect(codes(bad.report)).toEqual(["E_INVALID_UTF8"]);
        expect(bad.report.truncated).toBe(false);
    });
});

describe("robustness: option errors before a stream is touched", () => {
    function longStream(): ReadableStream<Uint8Array> {
        return new Blob([`source,target\n${"a,b\n".repeat(5000)}`]).stream();
    }

    it("raises a bad registry option before peeking, so the stream is never locked", async () => {
        const stream = longStream();
        const err = await rejection(importGraph(stream, { maxEmptyCells: -5 }));
        expect(err).toBeInstanceOf(GraphFormatError);
        expect((err as GraphFormatError).code).toBe("E_UNSUPPORTED");
        expect(stream.locked).toBe(false);
    });

    it("names a signal that is not an AbortSignal instead of claiming an abort", async () => {
        const stream = longStream();
        const err = await rejection(importGraph(stream, { signal: { aborted: 1 } as unknown as AbortSignal }));
        expect(err).toBeInstanceOf(GraphFormatError);
        expect((err as GraphFormatError).message).toContain("option signal");
        expect(stream.locked).toBe(false);
    });

    it("closes the peeked stream when the builder seed is refused", async () => {
        const stream = longStream();
        const err = await rejection(
            importGraph(stream, { builder: { expectedNodes: -1 } as unknown as Record<string, never> }),
        );
        expect(err).toBeInstanceOf(GraphFormatError);
        expect(stream.locked).toBe(false);
    });
});
