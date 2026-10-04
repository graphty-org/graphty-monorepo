/**
 * Robustness of the XML formats' encoding handling (GraphML, GEXF, XGMML): the prolog against the
 * BOM, the encoding option and the bytes, and a prolog that does not start the document.
 */

import { describe, expect, it } from "vitest";

import { importGraph } from "../../src/registry.js";
import { byteChunks } from "../helpers/corpus.js";
import { bytesOf, codes, importFailure, utf16 } from "./helpers.js";

const E_ACUTE = String.fromCharCode(0xe9);
const NS = 'xmlns="http://graphml.graphdrawing.org/xmlns"';

/** A GraphML document with one node, its id given as bytes, under a prolog. */
function graphml(prolog: string, id: readonly number[] | string): Uint8Array {
    return bytesOf(`${prolog}<graphml ${NS}><graph edgedefault="directed"><node id="`, id, '"/></graph></graphml>');
}

describe("robustness: XML prolog, BOM, option and bytes", () => {
    it("reads BOM-less UTF-16 whose prolog declares UTF-16 by the byte pattern of `<?` (XML 1.0 Appendix F)", async () => {
        const text = `<?xml version="1.0" encoding="UTF-16"?><graphml ${NS}><graph edgedefault="directed"><node id="a"/></graph></graphml>`;
        const read = await importGraph(utf16(text, false, false), { format: "graphml" });
        expect(codes(read.report)).toEqual([]);
        expect(read.snapshot.ids.toArray()).toEqual(["a"]);
        const { snapshot } = await importGraph(utf16(text, false, false), { format: "graphml", encoding: "utf-16be" });
        expect(snapshot.ids.toArray()).toEqual(["a"]);
    });

    it("lets a UTF-16LE BOM win over a prolog saying UTF-8, with a warning", async () => {
        const text = `<?xml version="1.0" encoding="UTF-8"?><graphml ${NS}><graph edgedefault="directed"><node id="caf${E_ACUTE}"/></graph></graphml>`;
        const { snapshot, report } = await importGraph(utf16(text, true, true), { format: "graphml" });
        expect(codes(report)).toEqual(["W_ENCODING_CONFLICT"]);
        expect(report.issues[0].message).toContain("byte order mark");
        expect(snapshot.ids.toArray()).toEqual([`caf${E_ACUTE}`]);
    });

    it("lets a UTF-8 BOM win over a prolog saying ISO-8859-1, with a warning", async () => {
        const bytes = bytesOf([0xef, 0xbb, 0xbf], graphml('<?xml version="1.0" encoding="ISO-8859-1"?>', `caf${E_ACUTE}`));
        const { snapshot, report } = await importGraph(bytes, { format: "graphml" });
        expect(codes(report)).toEqual(["W_ENCODING_CONFLICT"]);
        expect(snapshot.ids.toArray()).toEqual([`caf${E_ACUTE}`]);
    });

    it("reads a prolog's UTF-8 over a Latin-1 byte as windows-1252 with W_ENCODING_FALLBACK", async () => {
        const bytes = graphml('<?xml version="1.0" encoding="UTF-8"?>', [0x63, 0x61, 0x66, 0xe9]);
        const { snapshot, report } = await importGraph(bytes, { format: "graphml" });
        expect(codes(report)).toEqual(["W_ENCODING_FALLBACK"]);
        expect(snapshot.ids.toArray()).toEqual([`caf${E_ACUTE}`]);
    });

    it("lets the encoding option override the prolog, with a warning", async () => {
        const bytes = graphml('<?xml version="1.0" encoding="UTF-8"?>', `caf${E_ACUTE}`);
        const { snapshot, report } = await importGraph(bytes, { format: "graphml", encoding: "windows-1252" });
        expect(codes(report)).toEqual(["W_ENCODING_CONFLICT"]);
        expect(snapshot.ids.toArray()).toEqual([`caf${String.fromCharCode(0xc3, 0xa9)}`]);
    });

    it("warns that a prolog's UTF-16 over bytes that are not UTF-16 was ignored (.NET StringWriter output)", async () => {
        const bytes = graphml('<?xml version="1.0" encoding="utf-16"?>', "a");
        const { snapshot, report } = await importGraph(bytes, { format: "graphml" });
        expect(codes(report)).toEqual(["W_ENCODING_CONFLICT"]);
        expect(report.issues[0].message).toContain("not UTF-16");
        expect(snapshot.ids.toArray()).toEqual(["a"]);
    });

    it("honours a declaration streamed in 7-byte chunks exactly as the whole buffer", async () => {
        const bytes = graphml('<?xml version="1.0" encoding="ISO-8859-1"?>', [0x63, 0x61, 0x66, 0xe9]);
        const whole = await importGraph(bytes, { format: "graphml" });
        const chunked = await importGraph(byteChunks(bytes, 7), { format: "graphml" });
        expect(whole.report.issues).toEqual([]);
        expect(chunked.report.issues).toEqual([]);
        expect(chunked.snapshot.ids.toArray()).toEqual([`caf${E_ACUTE}`]);
        expect(whole.snapshot.ids.toArray()).toEqual([`caf${E_ACUTE}`]);
    });

    it("refuses an XML declaration after leading whitespace with E_XML_SYNTAX (XML 1.0 section 2.8), GraphML and GEXF", async () => {
        const graph = graphml('\n<?xml version="1.0" encoding="ISO-8859-1"?>', [0x63, 0x61, 0x66, 0xe9]);
        const err = await importFailure(importGraph(graph, { format: "graphml" }));
        // the bytes are decoded (here with the fallback the unread declaration leaves) before the
        // tokenizer sees the misplaced declaration
        expect(codes(err.report)).toEqual(["W_ENCODING_FALLBACK", "E_XML_SYNTAX"]);
        expect(err.message).toContain("very start");
        expect(err.report.issues[1].line).toBe(2);
        const gexf = '  <?xml version="1.0"?><gexf xmlns="http://gexf.net/1.3" version="1.3"><graph><nodes/></graph></gexf>';
        const gexfErr = await importFailure(importGraph(gexf, { format: "gexf" }));
        expect(codes(gexfErr.report)).toEqual(["E_XML_SYNTAX"]);
    });
});
