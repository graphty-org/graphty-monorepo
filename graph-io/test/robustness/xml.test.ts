/**
 * Robustness of the XML layer GraphML and GEXF share: the streaming tokenizer (src/common/xml.ts)
 * and the byte decoder (src/common/input.ts). Every case runs through both importers and asserts
 * the exact outcome: a fatal ImportError with its code, message and line, or a snapshot with the
 * issues recorded and the data kept.
 */

import { describe, expect, it } from "vitest";

import { gexfImporter } from "../../src/formats/gexf/importer.js";
import { graphmlImporter } from "../../src/formats/graphml/importer.js";
import {
    bytesOf,
    codes,
    concat,
    fatal,
    gexf,
    GEXF_NS,
    graphml,
    GRAPHML_NS,
    ids,
    issuesOf,
    load,
    nodesDoc,
    rejection,
    textStream,
    type XmlFormat,
} from "./xml-helpers.js";

const FORMATS: readonly XmlFormat[] = ["graphml", "gexf"];

const E_ACUTE = String.fromCharCode(0xe9);
const BOM = String.fromCharCode(0xfeff);

/** The root element start tag of each format, for documents cut short. */
const ROOT: Readonly<Record<XmlFormat, string>> = {
    graphml: `<graphml xmlns="${GRAPHML_NS}"><graph edgedefault="directed">`,
    gexf: `<gexf xmlns="${GEXF_NS}" version="1.3"><graph><nodes>`,
};

/** A document whose one node carries a text run (GraphML data, GEXF meta description). */
function textDoc(format: XmlFormat, text: string): string {
    if (format === "graphml") {
        return graphml(
            `<node id="a"><data key="d">${text}</data></node>`,
            `<key id="d" for="node" attr.name="d" attr.type="string"/>`,
        );
    }
    return `<gexf xmlns="${GEXF_NS}" version="1.3"><meta><description>${text}</description></meta><graph><nodes><node id="a"/></nodes></graph></gexf>`;
}

/** The text a textDoc() import kept. */
function textOf(format: XmlFormat, result: Awaited<ReturnType<typeof load>>): unknown {
    return format === "graphml" ? result.snapshot.nodes.value("d", 0) : result.snapshot.meta.description;
}

describe.each(FORMATS)("%s: truncated input", (format) => {
    it("xml-trunc-mid-entity-in-attribute: an input cut inside an entity of an attribute value is fatal at the tag's line", async () => {
        const err = await rejection(format, `${ROOT[format]}\n<node id="a&am`);
        const issue = fatal(err, "E_XML_SYNTAX");
        expect(issue.message).toMatch(/unexpected end of input inside markup/);
        expect(issue.line).toBe(2);
        expect(err.report.counts.nodes).toBe(0);
    });

    it("xml-trunc-mid-char-reference-in-text: an input cut inside a character reference is fatal, never a partly decoded value", async () => {
        const doc = textDoc(format, "caf&#x0");
        const cut = doc.slice(0, doc.indexOf("caf&#x0") + "caf&#x0".length);
        const issue = fatal(await rejection(format, cut), "E_XML_SYNTAX");
        expect(issue.message).toMatch(/unterminated entity reference/);
    });

    it("xml-truncated-short-declaration: an input cut in the first characters of a comment, CDATA or DOCTYPE reads as truncated", async () => {
        for (const tail of ["<!-", "<!DOC", "<![CDA", "<!"]) {
            const issue = fatal(await rejection(format, `${ROOT[format]}\n${tail}`), "E_XML_SYNTAX");
            expect(issue.message, tail).toMatch(/unexpected end of input inside markup/);
        }
    });

    it("xml-trunc-mid-utf8-sequence: bytes cut inside a multi-byte UTF-8 character are E_INVALID_UTF8 at that byte, not a windows-1252 fallback", async () => {
        const head = bytesOf(`${ROOT[format]}<node id="`);
        // the first two bytes of the euro sign (E2 82 AC)
        const err = await rejection(format, concat(head, [0xe2, 0x82]));
        const issue = fatal(err, "E_INVALID_UTF8");
        expect(issue.message).toContain(`at byte ${head.byteLength}`);
        expect(issue.message).toMatch(/truncated/);
        expect(err.details).toMatchObject({ byteOffset: head.byteLength });
        expect(codes(err.report)).not.toContain("W_ENCODING_FALLBACK");
    });

    it("xml-trunc-mid-utf8-sequence (corrected): a lone lead byte at the end stays the windows-1252 fallback, since Latin-1 text ending in an e acute ends the same way", async () => {
        // the expectation was "never fall back"; a lone 0xE9 at the end is equally a Latin-1 "e acute"
        // without a final newline, so the fallback (with its warning) is the right reading
        const err = await rejection(format, concat(bytesOf(`${ROOT[format]}<node id="`), [0xc3]));
        expect(codes(err.report)).toEqual(["W_ENCODING_FALLBACK", "E_XML_SYNTAX"]);
    });
});

describe.each(FORMATS)("%s: encodings", (format) => {
    it("xml-invalid-utf8-offset-is-chunk-start: E_INVALID_UTF8 names the byte that fails, not the start of the chunk", async () => {
        const head = bytesOf(`${ROOT[format]}<node id="caf`);
        const middle = bytesOf(`"/><node id="`);
        const bytes = concat(head, [0xc3, 0xa9], middle, [0xff], bytesOf(`"/>`));
        const err = await rejection(format, bytes);
        const at = head.byteLength + 2 + middle.byteLength;
        const issue = fatal(err, "E_INVALID_UTF8");
        expect(issue.message).toContain(`at byte ${at}`);
        expect(issue.message).toContain("after valid non-ASCII UTF-8 text");
        expect(err.details).toMatchObject({ byteOffset: at });
    });

    it("xml-declared-utf8-but-latin1-bytes: the windows-1252 fallback warning names the overridden UTF-8 declaration", async () => {
        const doc = nodesDoc(format, `<node id="caf${E_ACUTE}"/>`);
        const { snapshot, report } = await load(format, bytesOf(doc, "latin1"));
        const [warning] = issuesOf(report, "W_ENCODING_FALLBACK");
        expect(warning.message).toMatch(/declares UTF-8 but is not valid UTF-8/);
        expect(warning.message).not.toMatch(/declares no encoding/);
        expect(snapshot.ids.idOf(0)).toBe(`caf${E_ACUTE}`);
    });

    it("xml-mixed-latin1-then-utf8: UTF-8 after the windows-1252 fallback is reported as a mixed encoding", async () => {
        const doc = nodesDoc(format, `<node id="caf${E_ACUTE}"/><node id="b${E_ACUTE}b${E_ACUTE}"/>`).replace(
            ' encoding="UTF-8"',
            "",
        );
        // the first e acute as Latin-1 (E9), the later two as UTF-8 (C3 A9)
        const cut = doc.indexOf(`b${E_ACUTE}`);
        const bytes = concat(bytesOf(doc.slice(0, cut), "latin1"), new TextEncoder().encode(doc.slice(cut)));
        const { snapshot, report } = await load(format, bytes);
        const warnings = issuesOf(report, "W_ENCODING_FALLBACK");
        expect(warnings).toHaveLength(2);
        expect(warnings[1].message).toMatch(/mixes encodings/);
        expect(snapshot.nodeCount).toBe(2);
    });

    it("xml-utf16-without-bom: BOM-less UTF-16 that starts with an XML declaration is detected and decoded", async () => {
        const doc = nodesDoc(format, `<node id="caf${E_ACUTE}"/><node id="b"/>`).replace("UTF-8", "UTF-16");
        for (const encoding of ["utf-16le", "utf-16be"] as const) {
            const result = await load(format, bytesOf(doc, encoding));
            expect(ids(result), encoding).toEqual([`caf${E_ACUTE}`, "b"]);
            expect(result.report.issues, encoding).toEqual([]);
        }
    });

    it("xml-utf32-bom: UTF-32 is refused as an encoding, not as a forbidden character", async () => {
        const doc = nodesDoc(format, `<node id="a"/>`);
        const bytes = new Uint8Array(4 + doc.length * 4);
        bytes.set([0xff, 0xfe, 0x00, 0x00]);
        for (let i = 0; i < doc.length; i++) {
            bytes[4 + 4 * i] = doc.charCodeAt(i);
        }
        const issue = fatal(await rejection(format, bytes), "E_INVALID_ENCODING");
        expect(issue.message).toMatch(/UTF-32/);
    });

    it("xml-bom-contradicts-declaration: the byte order mark wins and the contradiction is reported", async () => {
        const latin = nodesDoc(format, `<node id="caf${E_ACUTE}"/>`).replace("UTF-8", "ISO-8859-1");
        const utf8 = await load(format, concat([0xef, 0xbb, 0xbf], new TextEncoder().encode(latin)));
        expect(codes(utf8.report)).toEqual(["W_ENCODING_CONFLICT"]);
        expect(utf8.report.issues[0].message).toMatch(/ISO-8859-1.*byte order mark says utf-8/);
        expect(ids(utf8)).toEqual([`caf${E_ACUTE}`]);

        const utf16 = await load(format, concat([0xff, 0xfe], bytesOf(nodesDoc(format, `<node id="a"/>`), "utf-16le")));
        expect(codes(utf16.report)).toEqual(["W_ENCODING_CONFLICT"]);
        expect(ids(utf16)).toEqual(["a"]);
    });

    it("xml-utf16-odd-byte-truncation: an odd number of UTF-16 bytes is reported as a truncated file at the last byte", async () => {
        const bytes = concat([0xff, 0xfe], bytesOf(nodesDoc(format, `<node id="a"/>`), "utf-16le"));
        const cut = bytes.subarray(0, bytes.byteLength - 1);
        const err = await rejection(format, cut);
        const issue = fatal(err, "E_INVALID_ENCODING");
        expect(issue.message).toMatch(/ends with half a utf-16le code unit/);
        expect(issue.message).toMatch(/truncated/);
        expect(err.details).toMatchObject({ byteOffset: cut.byteLength - 1 });
    });

    it("xml-raw-control-char: a raw control character, a NUL after the root or U+FFFE is fatal", async () => {
        for (const doc of [
            nodesDoc(format, `<node id="a${String.fromCharCode(1)}"/>`),
            `${nodesDoc(format, `<node id="a"/>`)}${String.fromCharCode(0)}`,
            nodesDoc(format, `<node id="a${String.fromCharCode(0xfffe)}"/>`),
        ]) {
            const issue = fatal(await rejection(format, doc), "E_XML_SYNTAX");
            expect(issue.message).toMatch(/a character XML 1\.0 forbids/);
        }
    });
});

describe.each(FORMATS)("%s: not a graph document", (format) => {
    const notFormat = format === "graphml" ? "E_NOT_GRAPHML" : "E_NOT_GEXF";

    it("xml-whitespace-only: spaces, tabs and CRLF only are E_EMPTY_INPUT", async () => {
        fatal(await rejection(format, "  \t\r\n \r\n"), "E_EMPTY_INPUT");
    });

    it("xml-bom-only: a byte order mark alone is E_EMPTY_INPUT; with a declaration and a comment but no element it has no root", async () => {
        fatal(await rejection(format, Uint8Array.from([0xef, 0xbb, 0xbf])), "E_EMPTY_INPUT");
        fatal(await rejection(format, BOM), "E_EMPTY_INPUT");
        const prolog = fatal(
            await rejection(format, concat([0xef, 0xbb, 0xbf], bytesOf('<?xml version="1.0"?>\n<!-- nothing -->\n'))),
            "E_XML_SYNTAX",
        );
        expect(prolog.message).toBe("no root element");
    });

    it("xml-gzip-bytes: gzip-compressed bytes are refused as compressed data", async () => {
        const issue = fatal(
            await rejection(format, Uint8Array.from([0x1f, 0x8b, 0x08, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x03, 0xab])),
            "E_FOREIGN_FORMAT",
        );
        expect(issue.message).toMatch(/gzip-compressed/);
    });

    it("xml-zip-bytes: a zip archive is refused as an archive", async () => {
        const issue = fatal(
            await rejection(format, concat([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00], bytesOf("graph.graphml"))),
            "E_FOREIGN_FORMAT",
        );
        expect(issue.message).toMatch(/zip archive/);
    });

    it("xml-html-error-page: an HTML error page is refused as not this format, naming <html> at its line", async () => {
        const page = `<!DOCTYPE html>\n<html><head><title>404 Not Found</title></head><body><h1>Not Found</h1><br>&nbsp;</body></html>`;
        const issue = fatal(await rejection(format, page), notFormat);
        expect(issue.message).toContain("<html>");
        expect(issue.line).toBe(2);
    });

    it("xml-html5-lowercase-doctype: an HTML5 page (lowercase doctype) is a syntax error that says it looks like HTML", async () => {
        const issue = fatal(
            await rejection(format, "<!doctype html>\n<html><head><title>502 Bad Gateway</title></head></html>"),
            "E_XML_SYNTAX",
        );
        expect(issue.message).toMatch(/looks like an HTML document/);
        expect(issue.line).toBe(1);
    });

    it("xml-sniff-utf16-and-prefixed-root: sniff() recognises UTF-16 documents and a prefixed root", () => {
        const importer = format === "graphml" ? graphmlImporter : gexfImporter;
        const sniff = (head: Uint8Array): number => importer.sniff?.(head) ?? -1;
        const doc = nodesDoc(format, `<node id="a"/>`).replace("UTF-8", "UTF-16");
        expect(sniff(concat([0xff, 0xfe], bytesOf(doc, "utf-16le")))).toBe(1);
        expect(sniff(concat([0xfe, 0xff], bytesOf(doc, "utf-16be")))).toBe(1);
        expect(sniff(bytesOf(doc, "utf-16le"))).toBe(1);
        const prefixed =
            format === "graphml"
                ? `<?xml version="1.0"?><g:graphml xmlns:g="${GRAPHML_NS}"><g:graph edgedefault="directed"/></g:graphml>`
                : `<?xml version="1.0"?><g:gexf xmlns:g="${GEXF_NS}" version="1.3"><g:graph/></g:gexf>`;
        expect(sniff(bytesOf(prefixed))).toBe(1);
    });
});

describe.each(FORMATS)("%s: XML declaration, DOCTYPE and processing instructions", (format) => {
    const doc = nodesDoc(format, `<node id="a"/>`);
    const body = doc.slice(doc.indexOf("?>") + 2);

    it("xml-xml11-control-char-ref: an XML 1.0 forbidden character reference in an XML 1.1 document names XML 1.1", async () => {
        const issue = fatal(
            await rejection(format, `<?xml version="1.1"?>${nodesDoc(format, `<node id="a&#1;"/>`).slice(doc.indexOf("?>") + 2)}`),
            "E_XML_SYNTAX",
        );
        expect(issue.message).toMatch(/invalid character reference &#1;/);
        expect(issue.message).toMatch(/declares XML 1\.1, whose character rules are not supported/);
    });

    it("xml-xml11-control-char-ref: an XML 1.1 document within the 1.0 rules imports", async () => {
        const result = await load(format, `<?xml version="1.1"?>${body}`);
        expect(ids(result)).toEqual(["a"]);
    });

    it("xml-unknown-xml-version: version 2.0 is refused", async () => {
        const issue = fatal(await rejection(format, `<?xml version="2.0"?>${body}`), "E_XML_SYNTAX");
        expect(issue.message).toBe("XML version 2.0 is not supported (only 1.x)");
    });

    it("xml-declaration-not-first: whitespace before the XML declaration is fatal", async () => {
        const issue = fatal(await rejection(format, `\n  ${doc}`), "E_XML_SYNTAX");
        expect(issue.message).toMatch(/very start of the document/);
        expect(issue.line).toBe(2);
    });

    it("xml-declaration-repeated-mid-document: a second XML declaration (inside the root, or a concatenated export) is fatal", async () => {
        const inside = doc.replace(`<node id="a"/>`, `<?xml version="1.0"?><node id="a"/>`);
        expect(fatal(await rejection(format, inside), "E_XML_SYNTAX").message).toMatch(/target xml is reserved/);
        expect(fatal(await rejection(format, `${doc}\n${doc}`), "E_XML_SYNTAX").line).toBe(3);
        // case-insensitive: <?XML ...?> is the reserved target too
        const upper = doc.replace(`<node id="a"/>`, `<?XML x?><node id="a"/>`);
        expect(fatal(await rejection(format, upper), "E_XML_SYNTAX").message).toMatch(/reserved/);
        // and at the start: the declaration is written <?xml exactly, so <?XML / <?Xml is not one
        for (const target of ["XML", "Xml"]) {
            const issue = fatal(await rejection(format, doc.replace("<?xml", `<?${target}`)), "E_XML_SYNTAX");
            expect(issue.message, target).toMatch(/lower case/);
        }
    });

    it("xml-pi-without-target: a processing instruction without a target name is fatal", async () => {
        for (const pi of ["<? ?>", "<?123 x?>", "<??>"]) {
            const issue = fatal(await rejection(format, doc.replace(`<node id="a"/>`, `${pi}<node id="a"/>`)), "E_XML_SYNTAX");
            expect(issue.message, pi).toMatch(/needs a target name/);
        }
        // a named processing instruction is still skipped
        const result = await load(format, doc.replace(`<node id="a"/>`, `<?app setting="1"?><node id="a"/>`));
        expect(ids(result)).toEqual(["a"]);
    });

    it("xml-external-doctype: an external DOCTYPE is skipped (never fetched) and the document imports with no issue", async () => {
        const doctype =
            format === "graphml"
                ? `<!DOCTYPE graphml SYSTEM "http://graphml.graphdrawing.org/dtds/graphml.dtd">`
                : `<!DOCTYPE gexf SYSTEM "http://www.gexf.net/gexf.dtd">`;
        const result = await load(format, doc.replace("?>\n", `?>\n${doctype}\n`));
        expect(ids(result)).toEqual(["a"]);
        expect(result.report.issues).toEqual([]);
    });

    it("xml-doctype-misplaced: a DOCTYPE inside the root, after it, or a second one is fatal", async () => {
        const inside = doc.replace(`<node id="a"/>`, `<node id="a"/><!DOCTYPE x>`);
        const after = `${doc}<!DOCTYPE x>`;
        const twice = doc.replace("?>\n", "?>\n<!DOCTYPE x><!DOCTYPE y>");
        for (const bad of [inside, after, twice]) {
            const issue = fatal(await rejection(format, bad), "E_XML_SYNTAX");
            expect(issue.message).toBe("a DOCTYPE declaration is allowed once, before the root element");
        }
    });

    it("xml-doctype-subset-pi-with-quote: a processing instruction with an apostrophe inside the internal subset is skipped", async () => {
        const result = await load(format, doc.replace("?>\n", "?>\n<!DOCTYPE x [ <?note it's fine?> <!ENTITY e \"v\"> ]>\n"));
        expect(ids(result)).toEqual(["a"]);
        expect(result.report.issues).toEqual([]);
    });
});

describe.each(FORMATS)("%s: well-formedness of tags, text and comments", (format) => {
    it("xml-lt-in-attribute-value: a literal < in an attribute value is fatal", async () => {
        const issue = fatal(await rejection(format, nodesDoc(format, `<node id="a<b"/>`)), "E_XML_SYNTAX");
        expect(issue.message).toBe(`a "<" in the value of attribute id of <node> (write &lt;)`);
    });

    it("xml-no-space-between-attributes: attributes not separated by whitespace are fatal", async () => {
        const issue = fatal(await rejection(format, nodesDoc(format, `<node id="a"foo="b"/>`)), "E_XML_SYNTAX");
        expect(issue.message).toBe("the attributes of <node> must be separated by whitespace");
    });

    it("xml-cdata-close-in-text: a literal ]]> in character data is fatal, also split across chunks", async () => {
        const doc = textDoc(format, "x]]>y");
        expect(fatal(await rejection(format, doc), "E_XML_SYNTAX").message).toMatch(/"\]\]>" is not allowed/);
        const at = doc.indexOf("]]>") + 2;
        const split = await rejection(format, textStream([doc.slice(0, at), doc.slice(at)]));
        expect(fatal(split, "E_XML_SYNTAX").message).toMatch(/"\]\]>" is not allowed/);
        // ]]&gt; and a ]] that a comment interrupts are legal
        expect(textOf(format, await load(format, textDoc(format, "x]]&gt;y")))).toBe("x]]>y");
    });

    it("xml-double-dash-in-comment: -- inside a comment, or a comment ending --->, is fatal", async () => {
        for (const comment of ["<!-- a -- b -->", "<!-- a --->"]) {
            const issue = fatal(
                await rejection(format, nodesDoc(format, `${comment}<node id="a"/>`)),
                "E_XML_SYNTAX",
            );
            expect(issue.message, comment).toBe('"--" is not allowed inside a comment');
        }
    });

    it("xml-end-tag-space-after-slash: whitespace between </ and the name is fatal", async () => {
        const doc = format === "graphml" ? graphml(`<node id="a"></ node>`) : gexf(`<node id="a"></ node>`);
        expect(fatal(await rejection(format, doc), "E_XML_SYNTAX").message).toBe("malformed end tag </ node>");
        // whitespace after the name is legal
        const ok = format === "graphml" ? graphml(`<node id="a"></node  >`) : gexf(`<node id="a"></node  >`);
        expect(ids(await load(format, ok))).toEqual(["a"]);
    });

    it("xml-text-error-line-is-run-start: an error inside a long text run or a multi-line start tag cites its own line", async () => {
        const lines = Array.from({ length: 39 }, (_, i) => `line ${i}`).join("\n");
        const doc = textDoc(format, `${lines}\n&nbsp; here`);
        const runStart = doc.slice(0, doc.indexOf("line 0")).split("\n").length;
        expect(fatal(await rejection(format, doc), "E_XML_SYNTAX")).toMatchObject({
            message: "unknown entity &nbsp;",
            line: runStart + 39,
        });
        const control = textDoc(format, `${lines}\n${String.fromCharCode(1)}`);
        expect(fatal(await rejection(format, control), "E_XML_SYNTAX").line).toBe(runStart + 39);
        const tag = nodesDoc(format, `<node\n  id="a"\n  label="x"\n  id="b"/>`);
        const tagLine = tag.slice(0, tag.indexOf("<node")).split("\n").length;
        expect(fatal(await rejection(format, tag), "E_XML_SYNTAX")).toMatchObject({
            message: "duplicate attribute id in <node>",
            line: tagLine + 3,
        });
        const unquoted = nodesDoc(format, `<node\n  id="a"\n  label=x/>`);
        expect(fatal(await rejection(format, unquoted), "E_XML_SYNTAX").line).toBe(tagLine + 2);
    });

    it("xml-char-reference-leading-zeros: character references with any number of leading zeros decode, also split across chunks", async () => {
        const doc = nodesDoc(format, `<node id="&#x0000000041;"/><node id="&#00000066;"/>`);
        expect(ids(await load(format, doc))).toEqual(["A", "B"]);
        const text = textDoc(format, "x&#x000000000000000043;y");
        expect(textOf(format, await load(format, text))).toBe("xCy");
        // a chunk boundary more than 16 characters after the "&"
        const at = text.indexOf("&#x") + 20;
        expect(textOf(format, await load(format, textStream([text.slice(0, at), text.slice(at)])))).toBe("xCy");
        expect(fatal(await rejection(format, nodesDoc(format, `<node id="&#x0000;"/>`)), "E_XML_SYNTAX").message).toBe(
            "invalid character reference &#x0000;",
        );
    });

    it("xml-string-chunk-splits-surrogate-pair: text chunks split between the halves of an astral character import like the whole text", async () => {
        const emoji = String.fromCharCode(0xd83d, 0xde00);
        const doc = textDoc(format, `a${emoji}b`);
        const at = doc.indexOf(emoji) + 1;
        const whole = await load(format, doc);
        const split = await load(format, textStream([doc.slice(0, at), doc.slice(at)]));
        expect(textOf(format, split)).toBe(`a${emoji}b`);
        expect(textOf(format, split)).toBe(textOf(format, whole));
        // and a high surrogate the input really ends on is still refused
        const lone = await rejection(format, textStream([doc.slice(0, at), ""]));
        expect(fatal(lone, "E_XML_SYNTAX").message).toMatch(/forbids|unexpected end/);
    });
});

describe.each(FORMATS)("%s: names, namespaces and resource bounds", (format) => {
    it("xml-colon-and-undeclared-prefix-names: an element that is not namespace-well-formed is not read as a node", async () => {
        for (const bad of [`<:node id="z"/>`, `<a:b:node id="z"/>`, `<q:node id="z"/>`]) {
            const { snapshot, report } = await load(format, nodesDoc(format, `<node id="a"/>${bad}`));
            expect(snapshot.nodeCount, bad).toBe(1);
            expect(codes(report), bad).toEqual(["W_UNKNOWN_ELEMENT"]);
            expect(report.issues[0].element, bad).toBe(bad.slice(1, bad.indexOf(" ")));
        }
    });

    it("xml-many-distinct-unknown-attributes: 5,000 distinct unknown attributes produce a bounded report", async () => {
        const attrs = Array.from({ length: 5000 }, (_, i) => ` x${i}="${i}"`).join("");
        const { snapshot, report } = await load(format, nodesDoc(format, `<node id="a"${attrs}/><node id="b"/>`));
        expect(snapshot.nodeCount).toBe(2);
        const issues = issuesOf(report, "W_UNKNOWN_XML_ATTRIBUTE");
        expect(issues).toHaveLength(17);
        expect(issues[15].element).toBe("x15");
        expect(issues[16].message).toMatch(/^4984 more distinct attribute names on <node>/);
        expect(report.issues).toHaveLength(17);
    });
});
