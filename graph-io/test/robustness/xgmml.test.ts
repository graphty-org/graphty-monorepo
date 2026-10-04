/**
 * Robustness of the XGMML importer against damaged, odd and hostile input: truncation at every
 * kind of markup, documents that are not XGMML at all, encoding traps, malformed values, deep
 * nesting and the XML corners the Cytoscape writers and hand-written files produce. Each test
 * states the precise outcome: the issue codes recorded and the data kept, or the ImportError and
 * its code. Conditions the audit suites and the per-format tests already pin are not repeated.
 */

import { GraphBuilder, type GraphSnapshot, INVALID_INDEX } from "@graphty/graph-format";
import { describe, expect, it, vi } from "vitest";

import { XGMML_ISSUE } from "../../src/formats/xgmml/constants.js";
import { XgmmlParser } from "../../src/formats/xgmml/document.js";
import { xgmmlImporter, type XgmmlImportOptions } from "../../src/formats/xgmml/importer.js";
import { importAllGraphs, sniff } from "../../src/registry.js";
import { type CommonImportOptions, ImportError, type ImportInput, type ImportReport } from "../../src/types.js";

type Options = XgmmlImportOptions & CommonImportOptions;

interface Loaded {
    readonly snapshot: GraphSnapshot;
    readonly report: ImportReport;
}

async function load(input: ImportInput, options?: Options): Promise<Loaded> {
    const sink = new GraphBuilder({ directed: false, weightDtype: "f64" });
    const report = await xgmmlImporter.import(input, sink, options);
    return { snapshot: sink.freeze(), report };
}

/** The ImportError of a failing import, and the node count the sink holds afterwards. */
async function failure(input: ImportInput, options?: Options): Promise<ImportError & { sinkNodes: number }> {
    const sink = new GraphBuilder({ directed: false, weightDtype: "f64" });
    try {
        await xgmmlImporter.import(input, sink, options);
    } catch (err) {
        expect(err).toBeInstanceOf(ImportError);
        return Object.assign(err as ImportError, { sinkNodes: sink.freeze().nodeCount });
    }
    throw new Error("expected an ImportError");
}

function codes(report: ImportReport): string[] {
    return report.issues.map((i) => i.code);
}

/** The code of the fatal issue (the last one recorded). */
function fatalCode(err: ImportError): string | undefined {
    return err.report.issues.at(-1)?.code;
}

function fatalMessage(err: ImportError): string {
    return err.report.issues.at(-1)?.message ?? "";
}

function cell(snapshot: GraphSnapshot, table: "nodes" | "edges", name: string, id: string | number): unknown {
    const column = snapshot[table].get(name);
    if (column === null) {
        return undefined;
    }
    const index = table === "nodes" ? snapshot.ids.indexOf(id) : Number(id);
    if (index === INVALID_INDEX || !column.isSet(index)) {
        return undefined;
    }
    const value = column.value(index);
    return ArrayBuffer.isView(value) ? Array.from(value as unknown as ArrayLike<number>) : value;
}

const encoder = new TextEncoder();

function bytes(...parts: (string | readonly number[])[]): Uint8Array {
    const out: number[] = [];
    for (const part of parts) {
        out.push(...(typeof part === "string" ? encoder.encode(part) : part));
    }
    return new Uint8Array(out);
}

/** UTF-16LE bytes of a text (no BOM). */
function utf16le(text: string): Uint8Array {
    const out = new Uint8Array(text.length * 2);
    for (let i = 0; i < text.length; i++) {
        out[i * 2] = text.charCodeAt(i) & 0xff;
        out[i * 2 + 1] = text.charCodeAt(i) >>> 8;
    }
    return out;
}

async function* chunked<T>(parts: readonly T[]): AsyncGenerator<T, void, undefined> {
    for (const part of parts) {
        await Promise.resolve();
        yield part;
    }
}

const NS =
    'xmlns="http://www.cs.rpi.edu/XGMML" xmlns:cy="http://www.cytoscape.org" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"';

/** A Cytoscape 3 export around a body. */
function cy3(body: string): string {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<graph id="1" label="Net" directed="1" cy:documentVersion="3.0" ${NS}>\n${body}\n</graph>\n`;
}

/** A 1.0 draft document (XGMML namespace, no Cytoscape namespace) around a body. */
function draft(body: string, root = ""): string {
    return `<?xml version="1.0"?>\n<graph id="d" label="D" xmlns="http://www.cs.rpi.edu/XGMML" xmlns:xlink="http://www.w3.org/1999/xlink" ${root}>\n${body}\n</graph>\n`;
}

const E_ACUTE = String.fromCharCode(0xe9);

describe("xgmml robustness: input that is not an XGMML document", () => {
    it("fails a UTF-8 BOM with nothing after it as empty input (E_EMPTY_INPUT)", async () => {
        const err = await failure(bytes([0xef, 0xbb, 0xbf]));
        expect(fatalCode(err)).toBe(XGMML_ISSUE.EMPTY_INPUT);
    });

    it("fails an XML declaration with no root element (E_XML_SYNTAX: no root element)", async () => {
        const err = await failure('<?xml version="1.0"?>\n');
        expect(fatalCode(err)).toBe(XGMML_ISSUE.XML_SYNTAX);
        expect(fatalMessage(err)).toContain("no root element");
    });

    // Corrected expectation: the root is checked the moment it opens, so a page whose root is <html>
    // is E_NO_GRAPH even when a void <meta> follows; an unquoted attribute on the root itself is
    // E_XML_SYNTAX. Either way nothing reaches the sink.
    it("fails an HTML 404 page: E_NO_GRAPH naming <html>, E_XML_SYNTAX when the root tag is not XML", async () => {
        const wellFormed = await failure(
            "<!DOCTYPE html><html><head><title>404</title></head><body><p>Not Found</p></body></html>",
        );
        expect(fatalCode(wellFormed)).toBe(XGMML_ISSUE.NO_GRAPH);
        expect(fatalMessage(wellFormed)).toContain("<html>");
        expect(wellFormed.sinkNodes).toBe(0);
        const voids = await failure("<!DOCTYPE html><html><head><meta charset=utf-8><title>404</title></head></html>");
        expect(fatalCode(voids)).toBe(XGMML_ISSUE.NO_GRAPH);
        expect(voids.sinkNodes).toBe(0);
        const html = await failure("<!DOCTYPE html><html lang=en><head><meta charset=utf-8></head></html>");
        expect(fatalCode(html)).toBe(XGMML_ISSUE.XML_SYNTAX);
        expect(html.sinkNodes).toBe(0);
    });

    it("fails gzip-compressed bytes with a message that names gzip, not an encoding hint", async () => {
        const err = await failure(bytes([0x1f, 0x8b, 0x08, 0x00, 0, 0, 0, 0, 0, 0x03, 0xcb, 0x48, 0xcd, 0xc9]));
        expect(fatalCode(err)).toBe(XGMML_ISSUE.INVALID_UTF8);
        expect(fatalMessage(err)).toMatch(/gzip/);
        expect(fatalMessage(err)).not.toMatch(/encoding option/);
    });

    it("fails a zip archive (a .cys session opened as .xgmml) with a message that names the zip and the cys importer", async () => {
        const err = await failure(bytes("PK", [3, 4, 20, 0, 8, 0, 8, 0, 0x9c, 0xa1], "3.0.0.version", [0xff, 0x01]));
        expect(fatalCode(err)).toBe(XGMML_ISSUE.INVALID_UTF8);
        expect(fatalMessage(err)).toMatch(/zip archive/);
        expect(fatalMessage(err)).toMatch(/cys/);
    });

    it("fails a file of NUL bytes (E_XML_SYNTAX: a character XML 1.0 forbids)", async () => {
        const err = await failure(new Uint8Array(512));
        expect(fatalCode(err)).toBe(XGMML_ISSUE.XML_SYNTAX);
        expect(fatalMessage(err)).toContain("XML 1.0 forbids");
    });

    it("refuses a session view document (E_XGMML_VIEW_DOCUMENT) before reading any node", async () => {
        const err = await failure(`<graph id="v" cy:view="1" ${NS}><node cy:nodeId="1"/></graph>`);
        expect(fatalCode(err)).toBe(XGMML_ISSUE.VIEW_DOCUMENT);
        expect(err.sinkNodes).toBe(0);
    });
});

describe("xgmml robustness: truncation", () => {
    const head = cy3('<node id="a" label="A"/>\n<node id="b" label="B"/>').replace(/\n<\/graph>\n$/, "");

    it("fails a file cut inside the XML declaration", async () => {
        const err = await failure('<?xml version="1.0" enc');
        expect(fatalCode(err)).toBe(XGMML_ISSUE.XML_SYNTAX);
    });

    it("fails a file cut inside the DOCTYPE", async () => {
        const err = await failure(
            '<?xml version="1.0"?>\n<!DOCTYPE graph PUBLIC "-//John Punin//DTD graph description//EN" "xgmml.dtd"',
        );
        expect(fatalCode(err)).toBe(XGMML_ISSUE.XML_SYNTAX);
    });

    it("fails a file cut inside a start tag; the nodes before it never reach the sink", async () => {
        const err = await failure(`${head}\n<node id="c" lab`);
        expect(fatalCode(err)).toBe(XGMML_ISSUE.XML_SYNTAX);
        expect(err.sinkNodes).toBe(0);
    });

    it("fails a file cut inside an entity reference of an attribute value", async () => {
        const err = await failure(`${head}\n<node id="c" label="&am`);
        expect(fatalCode(err)).toBe(XGMML_ISSUE.XML_SYNTAX);
        expect(err.sinkNodes).toBe(0);
    });

    it("fails a file cut inside a comment, and one cut inside a CDATA section in an att", async () => {
        const comment = await failure(`${head}\n<!-- an unclosed comment`);
        expect(fatalCode(comment)).toBe(XGMML_ISSUE.XML_SYNTAX);
        const cdata = await failure(`${head}\n<node id="c"><att name="s"><![CDATA[never closed`);
        expect(fatalCode(cdata)).toBe(XGMML_ISSUE.XML_SYNTAX);
        expect(cdata.sinkNodes).toBe(0);
    });

    it("fails a file that ends cleanly after a node with </graph> missing (unclosed element <graph>)", async () => {
        const err = await failure(`${head}\n`);
        expect(fatalCode(err)).toBe(XGMML_ISSUE.XML_SYNTAX);
        expect(fatalMessage(err)).toContain("unclosed element <graph>");
        expect(err.sinkNodes).toBe(0);
    });

    // Corrected expectation: a single dangling lead byte (C3) at the very end is also a complete
    // windows-1252 character ("A" with a tilde), so the fallback warning for undeclared bytes is
    // legitimate; the document still fails as truncated XML.
    it("fails bytes cut after the first byte of a 2-byte character (E_XML_SYNTAX)", async () => {
        const err = await failure(bytes(`${head}\n<node id="caf`, [0xc3]));
        expect(fatalCode(err)).toBe(XGMML_ISSUE.XML_SYNTAX);
        expect(err.sinkNodes).toBe(0);
    });

    it("fails bytes cut inside a 3-byte character as truncated UTF-8, with no windows-1252 fallback", async () => {
        const err = await failure(bytes(`${head}\n<node id="euro`, [0xe2, 0x82]));
        expect(fatalCode(err)).toBe(XGMML_ISSUE.INVALID_UTF8);
        expect(fatalMessage(err)).toMatch(/ends inside a UTF-8 sequence/);
        expect(codes(err.report)).not.toContain(XGMML_ISSUE.ENCODING_FALLBACK);
    });
});

describe("xgmml robustness: well-formedness", () => {
    it("fails an att that is never closed (end tag </node> does not match <att>)", async () => {
        const err = await failure(cy3('<node id="a"><att name="x" value="1"></node>'));
        expect(fatalCode(err)).toBe(XGMML_ISSUE.XML_SYNTAX);
        expect(fatalMessage(err)).toContain("end tag </node> does not match <att>");
    });

    it("fails two concatenated documents (a second root element)", async () => {
        const err = await failure(`${cy3('<node id="a"/>')}<graph/>`);
        expect(fatalCode(err)).toBe(XGMML_ISSUE.XML_SYNTAX);
        expect(fatalMessage(err)).toContain("second root element");
        expect(err.sinkNodes).toBe(0);
    });

    it("fails non-whitespace text after the root (text outside the root element)", async () => {
        const err = await failure(`${cy3('<node id="a"/>')}trailing words`);
        expect(fatalCode(err)).toBe(XGMML_ISSUE.XML_SYNTAX);
        expect(fatalMessage(err)).toContain("text outside the root element");
    });

    it("fails the same XML attribute twice on one element", async () => {
        const err = await failure(cy3('<node id="a" id="b"/>'));
        expect(fatalCode(err)).toBe(XGMML_ISSUE.XML_SYNTAX);
        expect(fatalMessage(err)).toContain("duplicate attribute id in <node>");
    });

    it("fails a literal < inside a quoted attribute value (XML 1.0 AttValue)", async () => {
        const err = await failure(cy3('<node id="a" label="x<y"/>'));
        expect(fatalCode(err)).toBe(XGMML_ISSUE.XML_SYNTAX);
        expect(err.sinkNodes).toBe(0);
    });

    it("reads character references with any number of leading zeros", async () => {
        const { snapshot, report } = await load(
            draft('<node id="a" label="&#x0000041;"/><node id="b" label="&#00000065;"/>'),
        );
        expect(cell(snapshot, "nodes", "label", "a")).toBe("A");
        expect(cell(snapshot, "nodes", "label", "b")).toBe("A");
        expect(report.errorCount).toBe(0);
    });

    // A documented leniency: XML 1.0 forbids "--" inside a comment, but a comment carries no graph
    // data and banner comments ("<!-- ----- -->") are common in hand-written files.
    it("accepts -- inside a comment, before and inside the root, with no issue", async () => {
        const { snapshot, report } = await load(
            draft('<!-- c -- d --><node id="a"/>').replace("?>\n", "?>\n<!-- a -- b -->\n"),
        );
        expect(snapshot.nodeCount).toBe(1);
        expect(report.issues).toEqual([]);
    });

    it("says XML 1.1 is not supported when a 1.1 document holds a control character reference", async () => {
        const err = await failure(
            '<?xml version="1.1"?>\n<graph xmlns="http://www.cs.rpi.edu/XGMML"><node id="a" label="bell &#x1;"/></graph>',
        );
        expect(fatalCode(err)).toBe(XGMML_ISSUE.XML_SYNTAX);
        expect(fatalMessage(err)).toMatch(/XML 1\.1/);
    });

    it("reads comments and processing instructions before the root, between and inside atts, and after the root", async () => {
        const { snapshot, report } = await load(
            `<?xml version="1.0"?>\n<!-- before --><?app data?>\n<graph id="d" xmlns="http://www.cs.rpi.edu/XGMML">\n<node id="a"><!-- between --><att name="x" type="integer" value="1"><!-- inside --><?pi inside?></att><?pi between?><att name="y" type="string" value="v"/></node>\n</graph>\n<!-- after --><?app after?>\n`,
        );
        expect(snapshot.nodeCount).toBe(1);
        expect(cell(snapshot, "nodes", "x", "a")).toBe(1);
        expect(cell(snapshot, "nodes", "y", "a")).toBe("v");
        expect(report.issues).toEqual([]);
    });

    it("reads single-quoted values, whitespace around =, tabs and CRLF inside tags", async () => {
        const { snapshot, report } = await load(
            draft("<node  id = 'a'\r\n\tlabel\t=\t'A' />\r\n<node\tid='b'/><edge source = 'a'\r\ntarget='b' />"),
        );
        expect(snapshot.nodeCount).toBe(2);
        expect(snapshot.edgeCount).toBe(1);
        expect(cell(snapshot, "nodes", "label", "a")).toBe("A");
        expect(report.issues).toEqual([]);
    });

    it("counts bare CR, CRLF and LF alike in issue line numbers", async () => {
        const body = [
            '<?xml version="1.0"?>',
            '<graph xmlns="http://www.cs.rpi.edu/XGMML">',
            '<node id="a"/>',
            "<node/>",
        ];
        for (const eol of ["\r", "\r\n", "\n"]) {
            const { report, snapshot } = await load(`${body.join(eol)}${eol}</graph>${eol}`);
            expect(snapshot.nodeCount).toBe(1);
            const missing = report.issues.find((i) => i.code === XGMML_ISSUE.MISSING_ID);
            expect(missing?.line).toBe(4);
        }
        const mixed = await load(`${body[0]}\r\n${body[1]}\n${body[2]}\r${body[3]}\n</graph>`);
        expect(mixed.report.issues.find((i) => i.code === XGMML_ISSUE.MISSING_ID)?.line).toBe(4);
    });

    it("normalises a literal newline in an attribute value to a space and keeps &#10; as a newline", async () => {
        const { snapshot } = await load(
            draft('<node id="a" label="x\ny"/><node id="b" label="x&#10;y"/><node id="c" label="x\r\ny"/>'),
        );
        expect(cell(snapshot, "nodes", "label", "a")).toBe("x y");
        expect(cell(snapshot, "nodes", "label", "b")).toBe("x\ny");
        expect(cell(snapshot, "nodes", "label", "c")).toBe("x y");
    });
});

describe("xgmml robustness: encodings", () => {
    it("reads UTF-16LE without a BOM by the XML declaration's byte pattern (XML 1.0 appendix F)", async () => {
        const text = `<?xml version="1.0" encoding="UTF-16"?>\n<graph xmlns="http://www.cs.rpi.edu/XGMML"><node id="caf${E_ACUTE}"/><node id="b"/><edge source="caf${E_ACUTE}" target="b"/></graph>`;
        const { snapshot, report } = await load(utf16le(text));
        expect(snapshot.nodeCount).toBe(2);
        expect(snapshot.ids.indexOf(`caf${E_ACUTE}`)).not.toBe(INVALID_INDEX);
        expect(snapshot.edgeCount).toBe(1);
        expect(report.errorCount).toBe(0);
    });

    it("reads Latin-1 bytes under a UTF-8 declaration as windows-1252 with W_ENCODING_FALLBACK", async () => {
        const { snapshot, report } = await load(
            bytes(
                '<?xml version="1.0" encoding="UTF-8"?>\n<graph xmlns="http://www.cs.rpi.edu/XGMML"><node id="caf',
                [0xe9],
                '"/></graph>',
            ),
        );
        expect(snapshot.ids.indexOf(`caf${E_ACUTE}`)).not.toBe(INVALID_INDEX);
        expect(codes(report)).toEqual([XGMML_ISSUE.ENCODING_FALLBACK]);
    });

    it("warns about an encoding the platform does not know (W_UNKNOWN_ENCODING) and reads UTF-8", async () => {
        const { snapshot, report } = await load(
            bytes(
                `<?xml version="1.0" encoding="x-bogus"?>\n<graph xmlns="http://www.cs.rpi.edu/XGMML"><node id="caf${E_ACUTE}"/></graph>`,
            ),
        );
        expect(snapshot.ids.indexOf(`caf${E_ACUTE}`)).not.toBe(INVALID_INDEX);
        expect(codes(report)).toEqual([XGMML_ISSUE.UNKNOWN_ENCODING]);
    });

    // XML 1.0 allows the declaration only at the very start (a PI target "xml" anywhere else is an
    // error); failing is what conforming parsers do, and it never decodes the Greek bytes wrongly.
    it("fails an XML declaration that does not start the document (whitespace before it)", async () => {
        const err = await failure(
            bytes(
                '\n  <?xml version="1.0" encoding="ISO-8859-7"?>\n<graph xmlns="http://www.cs.rpi.edu/XGMML"><node id="a" label="',
                [0xe1, 0xe2],
                '"/></graph>',
            ),
        );
        expect(fatalCode(err)).toBe(XGMML_ISSUE.XML_SYNTAX);
        expect(fatalMessage(err)).toContain("very start");
        expect(err.sinkNodes).toBe(0);
    });

    it("reads a UTF-8 BOM over a contradicting declaration as UTF-8, warning W_ENCODING_CONFLICT", async () => {
        const { snapshot, report } = await load(
            bytes(
                [0xef, 0xbb, 0xbf],
                `<?xml version="1.0" encoding="ISO-8859-1"?>\n<graph xmlns="http://www.cs.rpi.edu/XGMML"><node id="a" label="caf${E_ACUTE}"/></graph>`,
            ),
        );
        expect(cell(snapshot, "nodes", "label", "a")).toBe(`caf${E_ACUTE}`);
        expect(codes(report)).toEqual([XGMML_ISSUE.ENCODING_CONFLICT]);
    });

    it("fails bytes invalid in a declared multi-byte encoding (E_INVALID_ENCODING naming it), never falling back", async () => {
        const err = await failure(
            bytes(
                '<?xml version="1.0" encoding="Shift_JIS"?>\n<graph xmlns="http://www.cs.rpi.edu/XGMML"><node id="a" label="',
                [0x81, 0x20],
                '"/></graph>',
            ),
        );
        expect(fatalCode(err)).toBe(XGMML_ISSUE.INVALID_ENCODING);
        expect(fatalMessage(err)).toMatch(/shift_jis/i);
        expect(fatalMessage(err)).toMatch(/byte \d+/);
        expect(codes(err.report)).not.toContain(XGMML_ISSUE.ENCODING_FALLBACK);
    });

    it("streams undeclared Latin-1 whose E9 ends a chunk exactly as the whole bytes", async () => {
        const padding = `<!-- ${"p".repeat(1100)} -->`;
        const before = bytes(
            `<?xml version="1.0"?>\n${padding}\n<graph xmlns="http://www.cs.rpi.edu/XGMML"><node id="caf`,
            [0xe9],
        );
        const after = bytes('"/><node id="b"/></graph>');
        const whole = await load(bytes([...before, ...after]));
        const streamed = await load(chunked([before, after]));
        expect(streamed.snapshot.ids.indexOf(`caf${E_ACUTE}`)).not.toBe(INVALID_INDEX);
        expect(streamed.snapshot.nodeCount).toBe(whole.snapshot.nodeCount);
        expect(codes(streamed.report)).toEqual(codes(whole.report));
        expect(codes(streamed.report)).toEqual([XGMML_ISSUE.ENCODING_FALLBACK]);
    });

    it("streams a 2-byte UTF-8 character split across chunks inside an attribute value with no issue", async () => {
        const padding = `<!-- ${"p".repeat(1100)} -->`;
        const before = bytes(
            `<?xml version="1.0"?>\n${padding}\n<graph xmlns="http://www.cs.rpi.edu/XGMML"><node id="a" label="caf`,
            [0xc3],
        );
        const after = bytes([0xa9], '"/></graph>');
        const { snapshot, report } = await load(chunked([before, after]));
        expect(cell(snapshot, "nodes", "label", "a")).toBe(`caf${E_ACUTE}`);
        expect(report.issues).toEqual([]);
    });

    it("pairs surrogate references split across text chunks exactly as the whole string", async () => {
        const doc = `<graph id="r" ${NS}><att name="networkMetadata"><rdf:RDF><rdf:Description><dc:title>&#xd83d;&#xde00;</dc:title></rdf:Description></rdf:RDF></att><node id="a"/></graph>`;
        const options: Options = { pairSurrogateReferences: true };
        const whole = await load(doc, options);
        const between = doc.indexOf("&#xde00;");
        const inside = doc.indexOf("&#xd83d;") + 5;
        for (const cuts of [[between], [inside], [inside, between]]) {
            const parts: string[] = [];
            let from = 0;
            for (const cut of cuts) {
                parts.push(doc.slice(from, cut));
                from = cut;
            }
            parts.push(doc.slice(from));
            const streamed = await load(chunked(parts), options);
            expect(streamed.snapshot.meta.name).toBe(String.fromCharCode(0xd83d, 0xde00));
            expect(codes(streamed.report)).toEqual(codes(whole.report));
            expect(codes(streamed.report).filter((c) => c === XGMML_ISSUE.SURROGATE_PAIRED)).toHaveLength(1);
        }
    });
});

describe("xgmml robustness: namespaces and structure", () => {
    it("skips a <node> in a foreign namespace as an unknown element (W_UNKNOWN_ELEMENT)", async () => {
        const { snapshot, report } = await load(
            draft('<node id="a"/><svg:node xmlns:svg="http://www.w3.org/2000/svg" id="z"/>'),
        );
        expect(snapshot.nodeCount).toBe(1);
        expect(snapshot.ids.indexOf("z")).toBe(INVALID_INDEX);
        expect(codes(report)).toEqual([XGMML_ISSUE.UNKNOWN_ELEMENT]);
    });

    it("resolves an XLink prefix declared on the referencing element itself", async () => {
        const { snapshot, report } = await load(
            draft(
                '<node id="a"/><node id="g"><att><graph><node xmlns:l="http://www.w3.org/1999/xlink" l:href="#a"/></graph></att></node>',
            ),
        );
        expect(snapshot.nodeCount).toBe(2);
        expect(cell(snapshot, "nodes", "parent", "a")).toBe(snapshot.ids.indexOf("g"));
        expect(codes(report)).not.toContain(XGMML_ISSUE.MISSING_ID);
    });

    it("reads a list item written with a second prefix bound to the XGMML namespace", async () => {
        const { snapshot, report } = await load(
            `<graph id="d" xmlns="http://www.cs.rpi.edu/XGMML" xmlns:x="http://www.cs.rpi.edu/XGMML"><node id="a"><att name="list" type="list"><x:att value="1"/><x:att value="2"/></att></node></graph>`,
        );
        expect(cell(snapshot, "nodes", "list", "a")).toEqual(["1", "2"]);
        expect(codes(report)).not.toContain(XGMML_ISSUE.RECORD_LIST);
    });

    it("keeps the namespace declarations of captured foreign XML, so the stored XML binds its prefixes", async () => {
        const { snapshot } = await load(
            `<graph id="d" ${NS}><node id="a"><att name="meta"><rdf:RDF><rdf:Description><dc:title>T</dc:title></rdf:Description></rdf:RDF></att></node></graph>`,
        );
        const xml = cell(snapshot, "nodes", "meta", "a") as string;
        expect(xml).toContain('xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"');
        expect(xml).toContain('xmlns:dc="http://purl.org/dc/elements/1.1/"');
        expect(xml).toContain("<dc:title>T</dc:title>");
    });

    it("reads a DOCTYPE after a long licence comment as identifying the document (no W_XGMML_NO_NAMESPACE)", async () => {
        const { snapshot, report } = await load(
            `<?xml version="1.0"?>\n<!-- ${"licence text ".repeat(250)} -->\n<!DOCTYPE graph PUBLIC "-//John Punin//DTD graph description//EN" "http://www.cs.rpi.edu/~puninj/XGMML/xgmml.dtd">\n<graph id="d"><node id="a"/></graph>\n`,
        );
        expect(snapshot.nodeCount).toBe(1);
        expect(report.issues).toEqual([]);
    });

    it("sniffs a UTF-16LE file with a BOM and one whose leading comment is longer than 4096 bytes", () => {
        const doc = '<?xml version="1.0"?>\n<graph id="d" xmlns="http://www.cs.rpi.edu/XGMML"><node id="a"/></graph>';
        const utf16 = new Uint8Array([0xff, 0xfe, ...utf16le(doc)]);
        expect(sniff({ head: utf16 })?.format).toBe("xgmml");
        expect((xgmmlImporter.sniff ?? ((): number => 0))(utf16)).toBeGreaterThan(0);
        const long = bytes(`<!-- ${"x".repeat(5000)} -->\n${doc}`);
        expect(sniff({ head: long })?.format).toBe("xgmml");
    });
});

describe("xgmml robustness: values and elements", () => {
    // Corrected expectation: the empty string is a node id graph-format allows, and graph-io's own
    // exporter writes id="" for it; reading it as missing would lose that node on every round trip.
    it("keeps an empty node id as the node id, and an edge naming it connects to it", async () => {
        const { snapshot, report } = await load(
            draft('<node id="" label="x"/><node id="b"/><edge source="" target="b"/>'),
        );
        expect(snapshot.ids.indexOf("")).not.toBe(INVALID_INDEX);
        expect(cell(snapshot, "nodes", "label", "")).toBe("x");
        expect(snapshot.edgeCount).toBe(1);
        expect(report.issues).toEqual([]);
    });

    it("names an ambiguous label alias when an edge has no source", async () => {
        const { snapshot, report } = await load(
            cy3('<node id="1" label="A"/><node id="2" label="A"/><node id="3" label="B"/><edge label="A (pp) B"/>'),
        );
        expect(snapshot.edgeCount).toBe(0);
        const issue = report.issues.find((i) => i.code === XGMML_ISSUE.MISSING_ENDPOINT);
        expect(issue?.message).toMatch(/ambiguous/);
        expect(issue?.message).toContain('"A"');
    });

    it("skips edges whose weight does not parse (E_INVALID_WEIGHT each) and stops at errorLimit", async () => {
        const doc = draft(
            '<node id="a"/><node id="b"/><edge source="a" target="b" weight="heavy"/><edge source="a" target="b" weight="NaN"/><edge source="a" target="b" weight="2"/>',
        );
        const { snapshot, report } = await load(doc);
        expect(snapshot.edgeCount).toBe(1);
        expect(codes(report)).toEqual(["E_INVALID_WEIGHT", "E_INVALID_WEIGHT"]);
        expect(report.counts.skippedEdges).toBe(2);
        const limited = await failure(doc, { errorLimit: 1 });
        expect(limited.report.truncated).toBe(true);
        expect(limited.report.errorCount).toBe(2);
    });

    it("accepts weight Infinity as +Infinity (a Java Double form) with no issue", async () => {
        const { snapshot, report } = await load(
            draft('<node id="a"/><node id="b"/><edge source="a" target="b" weight="Infinity"/>'),
        );
        expect(Array.from(snapshot.weights ?? [])).toContain(Number.POSITIVE_INFINITY);
        expect(report.issues).toEqual([]);
    });

    it("warns when an edge has both a weight attribute and a weight att; the attribute is THE weight", async () => {
        const { snapshot, report } = await load(
            draft(
                '<node id="a"/><node id="b"/><edge source="a" target="b" weight="2"><att name="weight" type="real" value="3"/></edge>',
            ),
        );
        expect(Array.from(snapshot.weights ?? [])).toContain(2);
        expect(Array.from(snapshot.weights ?? [])).not.toContain(3);
        expect(cell(snapshot, "edges", "weight", 0)).toBeUndefined();
        const issue = report.issues.find((i) => i.code === XGMML_ISSUE.DUPLICATE_ATTRIBUTE);
        expect(issue?.message).toContain('"2"');
        expect(issue?.message).toContain('"3"');
        expect(report.warningCount).toBe(1);
    });

    it("honours the direction of a node-nested graph for the edges inside it", async () => {
        const { snapshot } = await load(
            draft(
                '<node id="g"><att><graph directed="1"><node id="x"/><node id="y"/><edge source="x" target="y"/></graph></att></node>',
                'directed="0"',
            ),
        );
        expect(snapshot.edgeCount).toBe(1);
        expect(snapshot.directed).toBe(true);
    });

    it("refuses Java-invalid graphics coordinates (0x10, Infinity, 1_0, empty, text): E_BAD_VALUE, position unset", async () => {
        const { snapshot, report } = await load(
            cy3(
                '<node id="a"><graphics x="0x10" y="1"/></node><node id="b"><graphics x="Infinity" y="1"/></node><node id="c"><graphics x="1_0" y="1"/></node><node id="d"><graphics x="" y="1"/></node><node id="e"><graphics x="abc" y="1"/></node><node id="f"><graphics x="1e1" y="-2.5"/></node>',
            ),
        );
        expect(codes(report).filter((c) => c === XGMML_ISSUE.BAD_VALUE)).toHaveLength(5);
        for (const id of ["a", "b", "c", "d", "e"]) {
            expect(cell(snapshot, "nodes", "position", id)).toBeUndefined();
        }
        expect(cell(snapshot, "nodes", "position", "f")).toEqual([10, 2.5, 0]);
    });

    it("warns about an unknown list element type and types the items by their own type", async () => {
        const { snapshot, report } = await load(
            cy3(
                '<node id="a"><att name="l" type="list" cy:type="List" cy:elementType="Float"><att type="real" value="1.5"/><att type="real" value="2"/></att></node>',
            ),
        );
        expect(cell(snapshot, "nodes", "l", "a")).toEqual([1.5, 2]);
        const issue = report.issues.find((i) => i.code === XGMML_ISSUE.UNKNOWN_ATTR_TYPE);
        expect(issue?.message).toContain("Float");
    });

    it("keeps CDATA inside an att out of the value (W_STRAY_TEXT)", async () => {
        const { snapshot, report } = await load(
            draft(
                '<node id="a"><att name="s" type="string"><![CDATA[hello]]></att><att name="t" type="string" value="v"><![CDATA[ignored]]></att></node>',
            ),
        );
        expect(cell(snapshot, "nodes", "s", "a")).toBeUndefined();
        expect(cell(snapshot, "nodes", "t", "a")).toBe("v");
        expect(codes(report)).toEqual([XGMML_ISSUE.STRAY_TEXT]);
    });

    it("skips a graph nested in a graphics att (W_XGMML_EDGE_NESTED_GRAPH) with its content", async () => {
        const { snapshot, report } = await load(
            cy3('<node id="a"><graphics><att name="g"><graph id="q"><node id="x"/></graph></att></graphics></node>'),
        );
        expect(snapshot.nodeCount).toBe(1);
        expect(snapshot.ids.indexOf("x")).toBe(INVALID_INDEX);
        expect(codes(report)).toContain(XGMML_ISSUE.EDGE_NESTED_GRAPH);
    });

    it("keeps the first of two RDF titles and warns, instead of joining them", async () => {
        const { snapshot, report } = await load(
            `<graph id="r" ${NS}><att name="networkMetadata"><rdf:RDF><rdf:Description><dc:title>T</dc:title><dc:title>U</dc:title></rdf:Description></rdf:RDF></att><node id="a"/></graph>`,
        );
        expect(snapshot.meta.name).toBe("T");
        const issue = report.issues.find((i) => i.code === XGMML_ISSUE.DUPLICATE_ATTRIBUTE);
        expect(issue?.message).toContain("title");
    });

    it("warns about a negative documentVersion (W_XGMML_DOCUMENT_VERSION)", async () => {
        const { report } = await load(`<graph id="1" cy:documentVersion="-1" ${NS}><node id="a"/></graph>`);
        expect(codes(report)).toContain(XGMML_ISSUE.DOCUMENT_VERSION);
    });

    it("warns when a node has both an id and an xlink:href, naming the reference as the one used", async () => {
        const { snapshot, report } = await load(
            draft('<node id="b"/><node id="g"><att><graph><node id="a" xlink:href="#b"/></graph></att></node>'),
        );
        expect(snapshot.ids.indexOf("a")).toBe(INVALID_INDEX);
        expect(cell(snapshot, "nodes", "parent", "b")).toBe(snapshot.ids.indexOf("g"));
        const issue = report.issues.find((i) => i.code === XGMML_ISSUE.ID_AND_HREF);
        expect(issue?.message).toContain('"a"');
        expect(issue?.message).toContain("#b");
    });

    it("warns about a graphics property given twice; the later value wins", async () => {
        const { snapshot, report } = await load(
            cy3(
                '<node id="a"><graphics fill="#ff0000"><att name="fill" value="#00ff00"/><att name="fill" value="#0000ff"/></graphics></node><node id="b"><graphics x="1" y="1"/><graphics x="5"/></node>',
            ),
        );
        expect((cell(snapshot, "nodes", "graphics", "a") as Record<string, unknown>).fill).toBe("#0000ff");
        expect(cell(snapshot, "nodes", "position", "b")).toEqual([5, -1, 0]);
        const duplicates = report.issues.filter((i) => i.code === XGMML_ISSUE.DUPLICATE_ATTRIBUTE);
        expect(duplicates.map((i) => i.element)).toEqual(["fill", "x"]);
    });

    it("drops only true repeats of a 2.x group's edges, counting them, never distinct edges sharing a label", async () => {
        const doc = `<?xml version="1.0"?>
<graph label="Net" ${NS} directed="1">
  <att name="documentVersion" value="1.1"/>
  <node label="a" id="a"/><node label="b" id="b"/><node label="c" id="c"/>
  <node label="g" id="g">
    <att type="integer" name="__groupState" value="1"/>
    <att><graph><node xlink:href="#a"/><node xlink:href="#b"/>
      <edge label="pp" source="a" target="b"/><edge label="pp" source="b" target="c"/><edge label="pp" source="a" target="c"/>
    </graph></att>
  </node>
  <edge label="pp" source="a" target="b"/><edge label="pp" source="b" target="c"/><edge label="pp" source="a" target="c"/>
</graph>`;
        const { snapshot, report } = await load(doc);
        expect(snapshot.edgeCount).toBe(3);
        const repeats = report.issues.filter((i) => i.code === XGMML_ISSUE.GROUP_DUPLICATE_EDGE);
        expect(repeats).toHaveLength(1);
        expect(repeats[0].message).toMatch(/\b3\b/);
    });
});

describe("xgmml robustness: resources", () => {
    it("reads 20,000 nested atts without a stack overflow (W_XGMML_BAD_ATT)", async () => {
        const depth = 20000;
        const doc = draft(`<node id="a">${'<att name="x">'.repeat(depth)}${"</att>".repeat(depth)}</node>`);
        const { snapshot, report } = await load(doc);
        expect(snapshot.nodeCount).toBe(1);
        expect(codes(report)).toContain(XGMML_ISSUE.BAD_ATT);
    });

    it("reads 20,000 groups nested inside each other with the parent column", async () => {
        const depth = 20000;
        const open = Array.from({ length: depth }, (_, i) => `<node id="n${i}"><att><graph>`).join("");
        const close = "</graph></att></node>".repeat(depth);
        const { snapshot } = await load(draft(`${open}${close}`));
        expect(snapshot.nodeCount).toBe(depth);
        expect(cell(snapshot, "nodes", "parent", "n1")).toBe(snapshot.ids.indexOf("n0"));
        expect(cell(snapshot, "nodes", "parent", `n${depth - 1}`)).toBe(snapshot.ids.indexOf(`n${depth - 2}`));
    });

    it("reads 20,000 groups each referencing the next by xlink:href", async () => {
        const count = 20000;
        const body = Array.from(
            { length: count },
            (_, i) =>
                `<node id="g${i}">${i + 1 < count ? `<att><graph><node xlink:href="#g${i + 1}"/></graph></att>` : ""}</node>`,
        ).join("");
        const { snapshot, report } = await load(draft(body));
        expect(snapshot.nodeCount).toBe(count);
        expect(cell(snapshot, "nodes", "parent", `g${count - 1}`)).toBe(snapshot.ids.indexOf(`g${count - 2}`));
        expect(report.errorCount).toBe(0);
    });

    it("parses a session network document once for importAll, whatever its number of networks", async () => {
        const subs = Array.from(
            { length: 20 },
            (_, i) => `<graph id="${i + 2}" label="S${i}" cy:registered="1"><node id="n${i}"/></graph>`,
        ).join("");
        const doc = `<graph id="1" label="Root" cy:registered="0" cy:documentVersion="3.0" ${NS}><att>${subs}</att></graph>`;
        const spy = vi.spyOn(XgmmlParser.prototype, "document");
        try {
            const results = await importAllGraphs(doc, { format: "xgmml" });
            expect(results).toHaveLength(20);
            expect(results[19].snapshot.ids.indexOf("n19")).not.toBe(INVALID_INDEX);
            expect(spy).toHaveBeenCalledTimes(1);
        } finally {
            spy.mockRestore();
        }
    });
});
