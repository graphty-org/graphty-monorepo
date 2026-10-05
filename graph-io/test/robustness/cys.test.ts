/**
 * Robustness of the Cytoscape session (.cys) importer and its zip reader against damaged, odd and
 * hostile archives: truncated and lying zip structures, sessions re-zipped by other tools, broken
 * entries inside an intact archive, malformed tables, views and session documents, and the
 * resource limits of importAll. Each test states the precise outcome: the issue codes recorded
 * and the data kept, or the ImportError and its code. Conditions the per-format tests and the
 * conformance fixtures already pin are not repeated.
 */

import { GraphBuilder, type GraphSnapshot, INVALID_INDEX } from "@graphty/graph-format";
import { describe, expect, it, vi } from "vitest";

import { ImportReportBuilder } from "../../src/common/report.js";
import { CYS_ISSUE } from "../../src/formats/cys/constants.js";
import { cysImporter, type CysImportOptions, sniffCys } from "../../src/formats/cys/importer.js";
import { XGMML_ISSUE } from "../../src/formats/xgmml/constants.js";
import { XgmmlParser } from "../../src/formats/xgmml/document.js";
import { importAllGraphs, listGraphs } from "../../src/registry.js";
import { type CommonImportOptions, ImportError, type ImportReport } from "../../src/types.js";
import { makeZip, type ZipInput } from "../helpers/zip.js";

type Options = CysImportOptions & CommonImportOptions;

function codes(report: ImportReport): string[] {
    return report.issues.map((i) => i.code);
}

function cell(snapshot: GraphSnapshot, table: "nodes" | "edges", column: string, row: number | string): unknown {
    const c = snapshot[table].get(column);
    const index = typeof row === "number" ? row : snapshot.ids.indexOf(row);
    if (c === null || index === INVALID_INDEX || index < 0 || !c.isSet(index)) {
        return undefined;
    }
    const value = c.value(index);
    return value instanceof Float32Array ? Array.from(value) : value;
}

async function load(
    bytes: Uint8Array,
    options: Options = {},
): Promise<{ snapshot: GraphSnapshot; report: ImportReport }> {
    const sink = new GraphBuilder({ directed: true });
    const report = await cysImporter.import(bytes, sink, options);
    return { snapshot: sink.freeze(), report };
}

async function failure(promise: Promise<unknown>): Promise<ImportError> {
    try {
        await promise;
    } catch (err) {
        expect(err).toBeInstanceOf(ImportError);
        return err as ImportError;
    }
    throw new Error("expected an ImportError");
}

function fail(bytes: Uint8Array, options: Options = {}): Promise<ImportError> {
    return failure(cysImporter.import(bytes, new GraphBuilder({ directed: true }), options));
}

function fatal(err: ImportError): { code: string | undefined; message: string } {
    const last = err.report.issues.at(-1);
    return { code: last?.code, message: last?.message ?? "" };
}

const DECL = '<?xml version="1.0" encoding="UTF-8"?>\n';
const NS =
    'xmlns="http://www.cs.rpi.edu/XGMML" xmlns:cy="http://www.cytoscape.org" xmlns:xlink="http://www.w3.org/1999/xlink"';
const ROOT = "CytoscapeSession-1/";
const NODE_TABLE = "2-Net/LOCAL_ATTRS-org.cytoscape.model.CyNode-Net+default+node.cytable";
const E_ACUTE = String.fromCharCode(0xe9);

/** A 3.x network file holding registered subnetworks (each `[id, label, body]`). */
function networkFile(
    subnetworks: readonly (readonly [string, string, string])[],
    rootAttrs = 'id="1" label="Root"',
): string {
    const subs = subnetworks.map(
        ([id, label, body]) => `<graph id="${id}" label="${label}" cy:registered="1">${body}</graph>`,
    );
    return `${DECL}<graph ${rootAttrs} cy:registered="0" cy:documentVersion="3.0" ${NS}><att>${subs.join("")}</att></graph>`;
}

/** The entries of a one-network 3.x session (network SUID 2, labelled Net) around a body. */
function sessionEntries(body: string, root = ROOT): ZipInput[] {
    return [
        { name: `${root}3.0.0.version`, data: "" },
        { name: `${root}networks/1-Root.xgmml`, data: networkFile([["2", "Net", body]]) },
    ];
}

function session(body: string, extra: readonly ZipInput[] = []): Uint8Array {
    return makeZip([...sessionEntries(body), ...extra]);
}

function table(path: string, lines: readonly string[]): ZipInput {
    return { name: `${ROOT}tables/${path}`, data: `${lines.join("\n")}\n` };
}

function view(network: string, id: string, nodes: string): ZipInput {
    return {
        name: `${ROOT}views/${network}-${id}-Net.xgmml`,
        data: `${DECL}<graph id="${id}" cy:view="1" cy:networkId="${network}" ${NS}>${nodes}</graph>`,
    };
}

function cytables(virtuals: readonly string[]): ZipInput {
    return {
        name: `${ROOT}tables/cytables.xml`,
        data: `${DECL}<cyTables xmlns="http://www.cytoscape.org"><virtualColumns>${virtuals.join("")}</virtualColumns></cyTables>`,
    };
}

/** A 2.x session: cysession.xml and network files at the session root. */
function session2x(cysession: string, files: readonly ZipInput[], marker = true): Uint8Array {
    return makeZip([
        ...(marker ? [{ name: `${ROOT}2.8.0.version`, data: "" }] : []),
        { name: `${ROOT}cysession.xml`, data: cysession },
        ...files,
    ]);
}

function cysessionXml(networks: string, documentVersion = "1.0"): string {
    return `${DECL}<cysession documentVersion="${documentVersion}" id="S"><networkTree>${networks}<network id="Network Root" filename="Network Root.xgmml"><parent id="NULL"/></network></networkTree></cysession>`;
}

function xgmml2x(body: string, label = "Main"): string {
    return `${DECL}<graph label="${label}" ${NS} directed="1"><att name="documentVersion" value="1.1"/>${body}</graph>`;
}

// ------------------------------------------------------------------ byte patching

/** Every offset of a 4-byte little-endian signature. */
function signatures(bytes: Uint8Array, signature: number): number[] {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const out: number[] = [];
    for (let at = 0; at + 4 <= bytes.byteLength; at++) {
        if (view.getUint32(at, true) === signature) {
            out.push(at);
        }
    }
    return out;
}

const LOCAL = 0x04034b50;
const CENTRAL = 0x02014b50;
const EOCD = 0x06054b50;

function patch(bytes: Uint8Array, at: number, value: number, width: 2 | 4): Uint8Array {
    const out = bytes.slice();
    const view = new DataView(out.buffer);
    if (width === 2) {
        view.setUint16(at, value, true);
    } else {
        view.setUint32(at, value, true);
    }
    return out;
}

describe("cys robustness: the zip container", () => {
    it("refuses gzip bytes as not a zip (E_CYS_NOT_ZIP)", async () => {
        const err = await fail(
            new Uint8Array([0x1f, 0x8b, 0x08, 0, 0, 0, 0, 0, 0, 3, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]),
        );
        expect(fatal(err).code).toBe(CYS_ISSUE.NOT_ZIP);
    });

    it("refuses a valid zip with no entries as not a session (E_CYS_NOT_SESSION)", async () => {
        const err = await fail(makeZip([]));
        expect(fatal(err).code).toBe(CYS_ISSUE.NOT_SESSION);
    });

    it("fails an entry whose compressed data runs past the end of the archive, naming the entry", async () => {
        const zip = makeZip([
            { name: `${ROOT}3.0.0.version`, data: "" },
            { name: `${ROOT}networks/1-Root.xgmml`, data: networkFile([["2", "Net", '<node id="5"/>']]), method: 0 },
        ]);
        const central = signatures(zip, CENTRAL)[1];
        const err = await fail(patch(zip, central + 20, 0x00100000, 4));
        expect(fatal(err).code).toBe(CYS_ISSUE.CORRUPT);
        expect(fatal(err).message).toContain("networks/1-Root.xgmml");
    });

    it("fails a directory size smaller than what the deflate data inflates to (E_CYS_CORRUPT)", async () => {
        const err = await fail(
            makeZip([
                { name: `${ROOT}3.0.0.version`, data: "" },
                { name: `${ROOT}networks/1-Root.xgmml`, data: networkFile([["2", "Net", '<node id="5"/>']]), size: 10 },
            ]),
        );
        expect(fatal(err).code).toBe(CYS_ISSUE.CORRUPT);
    });

    it("fails an end record that counts fewer entries than the directory holds", async () => {
        const zip = session('<node id="5" label="n"/>', [
            table(NODE_TABLE, ['"SUID","w"', '"java.lang.Long","java.lang.Double"', '"T",""', '"5","2.5"']),
        ]);
        const eocd = signatures(zip, EOCD).at(-1) as number;
        const err = await fail(patch(patch(zip, eocd + 8, 2, 2), eocd + 10, 2, 2));
        expect(fatal(err).code).toBe(CYS_ISSUE.CORRUPT);
        expect(fatal(err).message).toMatch(/counts 2/);
    });

    it("fails an end record that claims 60,000 entries in a 3-entry directory", async () => {
        const zip = session('<node id="5"/>', [{ name: `${ROOT}extra.txt`, data: "x" }]);
        const eocd = signatures(zip, EOCD).at(-1) as number;
        const err = await fail(patch(patch(zip, eocd + 8, 60000, 2), eocd + 10, 60000, 2));
        expect(fatal(err).code).toBe(CYS_ISSUE.CORRUPT);
        expect(fatal(err).message).toContain("central directory entry 4 of 60000 is damaged");
    });

    it("fails a local header whose name differs from the directory's (a zip-confusion pattern)", async () => {
        const zip = session('<node id="5"/>');
        const local = signatures(zip, LOCAL)[1];
        const name = new TextEncoder().encode(`${ROOT}networks/1-Root.xgmml`);
        const out = zip.slice();
        out[local + 30 + name.byteLength - 7] = "l".charCodeAt(0); // Root -> Rool in the local header only
        const err = await fail(out);
        expect(fatal(err).code).toBe(CYS_ISSUE.CORRUPT);
        expect(fatal(err).message).toContain("networks/1-Root.xgmml");
    });

    it("refuses a split archive (E_CYS_UNSUPPORTED)", async () => {
        const zip = session('<node id="5"/>');
        const eocd = signatures(zip, EOCD).at(-1) as number;
        const err = await fail(patch(zip, eocd + 4, 1, 2));
        expect(fatal(err).code).toBe(CYS_ISSUE.UNSUPPORTED);
    });

    it("refuses 2,000 directory entries that all point at one local header (an overlapping-file bomb)", async () => {
        const zip = session('<node id="5"/>', [
            table(NODE_TABLE, [
                '"SUID","w"',
                '"java.lang.Long","java.lang.String"',
                '"T",""',
                `"5","${"w".repeat(2000)}"`,
            ]),
        ]);
        const centrals = signatures(zip, CENTRAL);
        const eocd = signatures(zip, EOCD).at(-1) as number;
        const tableRecord = zip.slice(centrals[2], eocd);
        const copies: number[] = [];
        for (let i = 0; i < 2000; i++) {
            const copy = tableRecord.slice();
            const nameAt = 46 + `${ROOT}tables/2-Net/LOCAL_ATTRS-org.cytoscape.model.CyNode-`.length;
            const digits = String(i).padStart(4, "0");
            for (let d = 0; d < 4; d++) {
                copy[nameAt + d] = digits.charCodeAt(d);
            }
            copies.push(...copy);
        }
        const head = zip.slice(0, eocd);
        const tail = zip.slice(eocd);
        const out = new Uint8Array([...head, ...copies, ...tail]);
        const view = new DataView(out.buffer);
        const at = out.byteLength - tail.byteLength;
        view.setUint16(at + 8, 2003, true);
        view.setUint16(at + 10, 2003, true);
        view.setUint32(at + 12, view.getUint32(at + 12, true) + copies.length, true);
        const err = await fail(out);
        expect(fatal(err).code).toBe(CYS_ISSUE.CORRUPT);
        expect(fatal(err).message).toMatch(/overlap/);
    });

    it("refuses deflated entries without a DecompressionStream, and reads a stored-only session", async () => {
        vi.stubGlobal("DecompressionStream", undefined);
        try {
            const err = await fail(session('<node id="5"/>'));
            expect(fatal(err).code).toBe(CYS_ISSUE.UNSUPPORTED);
            expect(fatal(err).message).toContain("DecompressionStream");
            const stored = makeZip(sessionEntries('<node id="5"/><node id="6"/>').map((e) => ({ ...e, method: 0 })));
            const { snapshot } = await load(stored);
            expect(snapshot.nodeCount).toBe(2);
        } finally {
            vi.unstubAllGlobals();
        }
    });

    it("refuses a zip64 size beyond 2^53 rather than reading a wrong value", async () => {
        const zip = makeZip(sessionEntries('<node id="5"/>'), { zip64: true });
        const central = signatures(zip, CENTRAL)[1];
        const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
        const extra = central + 46 + view.getUint16(central + 28, true);
        const err = await fail(patch(zip, extra + 4 + 4, 0x00200000, 4));
        expect(fatal(err).code).toBe(CYS_ISSUE.UNSUPPORTED);
        expect(fatal(err).message).toContain("2^53");
    });

    it("decodes legacy CP437 entry names (bit 11 clear, not UTF-8), matching cysession.xml and naming the collection", async () => {
        const cp437 = (prefix: string, suffix: string): Uint8Array =>
            new Uint8Array([...new TextEncoder().encode(prefix), 0x82, ...new TextEncoder().encode(suffix)]);
        const three = makeZip([
            { name: `${ROOT}3.0.0.version`, data: "" },
            {
                name: "",
                nameBytes: cp437(`${ROOT}networks/1-R`, "seau.xgmml"),
                data: networkFile([["2", "Net", '<node id="5"/>']], 'id="1"'),
            },
        ]);
        const { snapshot } = await load(three);
        expect((snapshot.meta.extra.cytoscape as Record<string, unknown>).collection).toBe(`R${E_ACUTE}seau`);
        const two = session2x(
            cysessionXml(
                `<network id="R${E_ACUTE}seau" filename="R${E_ACUTE}seau.xgmml"><parent id="Network Root"/></network>`,
            ),
            [{ name: "", nameBytes: cp437(`${ROOT}R`, "seau.xgmml"), data: xgmml2x('<node id="a" label="a"/>') }],
            false,
        );
        const read = await load(two);
        expect(read.snapshot.nodeCount).toBe(1);
        expect(codes(read.report)).not.toContain(CYS_ISSUE.DANGLING_REFERENCE);
    });
});

describe("cys robustness: the session layout", () => {
    it("finds a session re-zipped one folder deeper", async () => {
        const { snapshot } = await load(makeZip(sessionEntries('<node id="5"/>', `Downloads/${ROOT}`)));
        expect(snapshot.nodeCount).toBe(1);
    });

    it("reads entry names a Windows tool wrote with backslashes", async () => {
        const entries = sessionEntries('<node id="5"/><node id="6"/>').map((e) => ({
            ...e,
            name: e.name.replace(/\//g, "\\"),
        }));
        const { snapshot } = await load(makeZip(entries));
        expect(snapshot.nodeCount).toBe(2);
    });

    it("says a version marker that does not parse does not parse (E_CYS_VERSION)", async () => {
        const err = await fail(makeZip([{ name: `${ROOT}abc.version`, data: "" }, ...sessionEntries("").slice(1)]));
        expect(fatal(err).code).toBe(CYS_ISSUE.VERSION);
        expect(fatal(err).message).toMatch(/does not parse/);
        expect(fatal(err).message).not.toMatch(/newer/);
    });

    it("warns about two version markers in one session, naming both and the one used", async () => {
        const { snapshot, report } = await load(
            makeZip([...sessionEntries('<node id="5"/>'), { name: `${ROOT}3.7.2.version`, data: "" }]),
        );
        expect(snapshot.nodeCount).toBe(1);
        const issue = report.issues.find(
            (i) => i.code === CYS_ISSUE.ENTRY_SKIPPED && i.message.includes("3.7.2.version"),
        );
        expect(issue?.message).toContain("3.0.0.version");
        expect(issue?.message).toMatch(/version markers/);
    });

    it("refuses a 2.x marker without cysession.xml (E_CYS_NOT_SESSION)", async () => {
        const err = await fail(
            makeZip([
                { name: `${ROOT}2.8.0.version`, data: "" },
                { name: `${ROOT}Main.xgmml`, data: xgmml2x('<node id="a"/>') },
            ]),
        );
        expect(fatal(err).code).toBe(CYS_ISSUE.NOT_SESSION);
        expect(fatal(err).message).toContain("cysession.xml");
    });

    it("skips a table of an element class that is not a node, edge or network table (W_CYS_ENTRY_SKIPPED)", async () => {
        const odd = "2-Net/LOCAL_ATTRS-org.cytoscape.model.CyFoo-T.cytable";
        const { snapshot, report } = await load(
            session('<node id="5"/>', [
                table(odd, ['"SUID","w"', '"java.lang.Long","java.lang.String"', '"T",""', '"5","x"']),
            ]),
        );
        expect(snapshot.nodes.get("w")).toBeNull();
        const skipped = report.issues.find((i) => i.code === CYS_ISSUE.ENTRY_SKIPPED);
        expect(skipped?.message).toContain("CyFoo");
    });

    it("finds a session whose folder was renamed by its content, from the sniff head", () => {
        const big = new Uint8Array(9000).fill(0x61);
        const zip = makeZip([
            { name: "MySession/apps/org.cytoscape.swing-application/big.xml", data: big, method: 0 },
            ...sessionEntries('<node id="5"/>', "MySession/").map((e) =>
                e.name.endsWith(".version") ? { ...e, name: "MySession/zz/3.0.0.version" } : e,
            ),
        ]);
        expect(sniffCys(zip.subarray(0, 8192))).toBeGreaterThan(0);
    });
});

describe("cys robustness: broken entries", () => {
    it("names the 2.x network entry whose </graph> is missing (E_XML_SYNTAX)", async () => {
        const err = await fail(
            session2x(cysessionXml('<network id="Main" filename="Main.xgmml"><parent id="Network Root"/></network>'), [
                { name: `${ROOT}Main.xgmml`, data: xgmml2x('<node id="a"/>').replace("</graph>", "") },
            ]),
        );
        expect(fatal(err).code).toBe("E_XML_SYNTAX");
        expect(fatal(err).message).toContain("Main.xgmml");
    });

    it("names a 0-byte network entry (E_EMPTY_INPUT)", async () => {
        const err = await fail(
            makeZip([
                { name: `${ROOT}3.0.0.version`, data: "" },
                { name: `${ROOT}networks/1-Root.xgmml`, data: "" },
            ]),
        );
        expect(fatal(err).code).toBe(CYS_ISSUE.EMPTY_INPUT);
        expect(fatal(err).message).toContain("networks/1-Root.xgmml");
    });

    it("names a network entry whose root is not a graph (E_NO_GRAPH)", async () => {
        const err = await fail(
            makeZip([
                { name: `${ROOT}3.0.0.version`, data: "" },
                { name: `${ROOT}networks/1-Root.xgmml`, data: "<graphml/>" },
            ]),
        );
        expect(fatal(err).code).toBe(CYS_ISSUE.NO_GRAPH);
        expect(fatal(err).message).toContain("networks/1-Root.xgmml");
    });

    it("names a view document stored as a network file (E_XGMML_VIEW_DOCUMENT)", async () => {
        const err = await fail(
            makeZip([
                { name: `${ROOT}3.0.0.version`, data: "" },
                {
                    name: `${ROOT}networks/1-Root.xgmml`,
                    data: `${DECL}<graph id="9" cy:view="1" cy:networkId="2" ${NS}><node cy:nodeId="5"/></graph>`,
                },
            ]),
        );
        expect(fatal(err).code).toBe(XGMML_ISSUE.VIEW_DOCUMENT);
        expect(fatal(err).message).toContain("networks/1-Root.xgmml");
    });

    it("fails a session with a marker and no networks (E_NO_GRAPH)", async () => {
        const err = await fail(makeZip([{ name: `${ROOT}3.0.0.version`, data: "" }]));
        expect(fatal(err).code).toBe(CYS_ISSUE.NO_GRAPH);
    });

    it("skips a registered subnetwork without an id (E_MISSING_ID) and reads the others", async () => {
        const zip = makeZip([
            { name: `${ROOT}3.0.0.version`, data: "" },
            {
                name: `${ROOT}networks/1-Root.xgmml`,
                data: `${DECL}<graph id="1" cy:registered="0" ${NS}><att><graph label="NoId" cy:registered="1"><node id="7"/></graph><graph id="3" label="Good" cy:registered="1"><node id="5"/></graph></att></graph>`,
            },
        ]);
        expect((await listGraphs(zip))?.map((g) => g.name)).toEqual(["Good"]);
        const { snapshot, report } = await load(zip);
        expect(snapshot.ids.indexOf("5")).not.toBe(INVALID_INDEX);
        const missing = report.issues.find((i) => i.code === XGMML_ISSUE.MISSING_ID);
        expect(missing?.message).toContain("networks/1-Root.xgmml");
    });

    it("imports the subnetwork asked for when two registered subnetworks share an id", async () => {
        const zip = makeZip([
            { name: `${ROOT}3.0.0.version`, data: "" },
            {
                name: `${ROOT}networks/1-Root.xgmml`,
                data: networkFile([
                    ["2", "A", '<node id="a"/>'],
                    ["2", "B", '<node id="b"/>'],
                ]),
            },
        ]);
        const { snapshot } = await load(zip, { graphIndex: 1 });
        expect(snapshot.meta.name).toBe("B");
        expect(snapshot.ids.indexOf("b")).not.toBe(INVALID_INDEX);
        expect(snapshot.ids.indexOf("a")).toBe(INVALID_INDEX);
    });

    it("reads a registered root with no subnetworks as the network", async () => {
        const zip = makeZip([
            { name: `${ROOT}3.0.0.version`, data: "" },
            {
                name: `${ROOT}networks/1-Root.xgmml`,
                data: `${DECL}<graph id="1" label="Solo" cy:registered="1" cy:documentVersion="3.0" ${NS}><node id="5"/><node id="6"/><edge source="5" target="6"/></graph>`,
            },
        ]);
        const { snapshot } = await load(zip);
        expect(snapshot.nodeCount).toBe(2);
        expect(snapshot.edgeCount).toBe(1);
        expect(snapshot.meta.name).toBe("Solo");
    });

    it("counts the nodes skipped while parsing a network file (report.counts.skippedNodes)", async () => {
        const { snapshot, report } = await load(session('<node id="5"/><node/>'));
        expect(snapshot.nodeCount).toBe(1);
        expect(report.counts.skippedNodes).toBe(1);
        expect(codes(report)).toContain(XGMML_ISSUE.MISSING_ID);
    });

    it("stops parsing a network file at errorLimit instead of collecting every error first", async () => {
        const zip = session("<node/>".repeat(1000));
        const spy = vi.spyOn(ImportReportBuilder.prototype, "error");
        try {
            const err = await fail(zip, { errorLimit: 10 });
            expect(err.report.truncated).toBe(true);
            expect(err.report.errorCount).toBe(11);
            expect(spy.mock.calls.length).toBeLessThan(50);
        } finally {
            spy.mockRestore();
        }
    });

    it("keeps the encoding warnings of cysession.xml (W_ENCODING_FALLBACK, W_UNKNOWN_ENCODING) naming it", async () => {
        const latin = new Uint8Array([
            ...new TextEncoder().encode(`<cysession documentVersion="1.0" id="S"><networkTree><network id="caf`),
            0xe9,
            ...new TextEncoder().encode(
                `" filename="Main.xgmml"><parent id="Network Root"/></network></networkTree></cysession>`,
            ),
        ]);
        const first = await load(
            session2x(latin as unknown as string, [{ name: `${ROOT}Main.xgmml`, data: xgmml2x('<node id="a"/>') }]),
        );
        const fallback = first.report.issues.find((i) => i.code === XGMML_ISSUE.ENCODING_FALLBACK);
        expect(fallback?.message).toContain("cysession.xml");
        expect(first.snapshot.meta.name).toBe(`caf${E_ACUTE}`);
        const bogus = cysessionXml(
            '<network id="Main" filename="Main.xgmml"><parent id="Network Root"/></network>',
        ).replace('encoding="UTF-8"', 'encoding="x-bogus"');
        const second = await load(session2x(bogus, [{ name: `${ROOT}Main.xgmml`, data: xgmml2x('<node id="a"/>') }]));
        const unknown = second.report.issues.find((i) => i.code === XGMML_ISSUE.UNKNOWN_ENCODING);
        expect(unknown?.message).toContain("cysession.xml");
    });
});

describe("cys robustness: views", () => {
    const node = (viewNode: string, model: string, graphics: string): string =>
        `<node id="${viewNode}" cy:nodeId="${model}"><graphics ${graphics}/></node>`;

    it("refuses a bad coordinate of the first view (E_BAD_VALUE), leaving the position unset", async () => {
        const { snapshot, report } = await load(
            session('<node id="5"/><node id="6"/>', [
                view("2", "8", node("80", "5", 'x="abc" y="1"') + node("81", "6", 'x="1" y="2"')),
            ]),
        );
        expect(codes(report)).toContain("E_BAD_VALUE");
        expect(cell(snapshot, "nodes", "position", "5")).toBeUndefined();
        expect(cell(snapshot, "nodes", "position", "6")).toEqual([1, -2, 0]);
    });

    it("refuses bad coordinates of a further view as the first view's (E_BAD_VALUE each, position@2 unset)", async () => {
        const good = node("80", "5", 'x="1" y="1"') + node("81", "6", 'x="1" y="1"') + node("82", "7", 'x="1" y="1"');
        const bad =
            node("90", "5", 'x="abc" y="1"') + node("91", "6", 'x="" y=""') + node("92", "7", 'x="1" y="2" z="q"');
        const { snapshot, report } = await load(
            session('<node id="5"/><node id="6"/><node id="7"/>', [view("2", "8", good), view("2", "9", bad)]),
            { zAs: "position" },
        );
        expect(codes(report).filter((c) => c === "E_BAD_VALUE")).toHaveLength(4);
        expect(cell(snapshot, "nodes", "position@2", "5")).toBeUndefined();
        expect(cell(snapshot, "nodes", "position@2", "6")).toBeUndefined();
        expect(cell(snapshot, "nodes", "position@2", "7")).toEqual([1, -2, 0]);
    });

    it("counts the elements of a further view that name nothing (W_DANGLING_REFERENCE)", async () => {
        const { report } = await load(
            session('<node id="5"/>', [
                view("2", "8", node("80", "5", 'x="1" y="1"')),
                view("2", "9", node("90", "5", 'x="1" y="1"') + node("91", "404", 'x="1" y="1"')),
            ]),
        );
        const dangling = report.issues.filter((i) => i.code === CYS_ISSUE.DANGLING_REFERENCE);
        expect(dangling).toHaveLength(1);
        expect(dangling[0].message).toContain("views/2-9-Net.xgmml");
    });

    it("warns about a view element given twice for one node, naming the one used", async () => {
        const { snapshot, report } = await load(
            session('<node id="5"/>', [
                view("2", "8", node("80", "5", 'x="1" y="1"') + node("81", "5", 'x="7" y="1"')),
            ]),
        );
        expect(cell(snapshot, "nodes", "position", "5")).toEqual([7, -1, 0]);
        const issue = report.issues.find((i) => i.code === XGMML_ISSUE.DUPLICATE_NODE);
        expect(issue?.message).toContain('"5"');
        expect(issue?.message).toMatch(/later/);
    });

    it("chooses the first view by its SUID, not by the order of the entries in the archive", async () => {
        const nine = view("2", "9", node("90", "5", 'x="9" y="0"'));
        const ten = view("2", "10", node("100", "5", 'x="10" y="0"'));
        for (const order of [
            [nine, ten],
            [ten, nine],
        ]) {
            const { snapshot } = await load(session('<node id="5"/>', order));
            expect(cell(snapshot, "nodes", "position", "5")).toEqual([9, 0, 0]);
            expect(cell(snapshot, "nodes", "position@2", "5")).toEqual([10, 0, 0]);
        }
    });

    it("skips a truncated view with an error naming it, and still reads the topology and the tables", async () => {
        const broken = view("2", "8", node("80", "5", 'x="1" y="1"'));
        const { snapshot, report } = await load(
            session('<node id="5"/><node id="6"/><edge source="5" target="6" cy:directed="1"/>', [
                { ...broken, data: (broken.data as string).slice(0, -20) },
                table(NODE_TABLE, ['"SUID","w"', '"java.lang.Long","java.lang.Double"', '"T",""', '"5","2.5"']),
            ]),
        );
        expect(snapshot.nodeCount).toBe(2);
        expect(snapshot.edgeCount).toBe(1);
        expect(cell(snapshot, "nodes", "w", "5")).toBe(2.5);
        expect(snapshot.nodes.get("position")).toBeNull();
        const issue = report.issues.find((i) => i.code === "E_XML_SYNTAX");
        expect(issue?.severity).toBe("error");
        expect(issue?.message).toContain("views/2-8-Net.xgmml");
    });
    it("skips a view whose zip data is damaged (a CRC mismatch) with an error naming it", async () => {
        const damaged = { ...view("2", "8", node("80", "5", 'x="1" y="1"')), crc: 1 };
        const { snapshot, report } = await load(session('<node id="5"/>', [damaged]));
        expect(snapshot.nodeCount).toBe(1);
        expect(snapshot.nodes.get("position")).toBeNull();
        const issue = report.issues.find((i) => i.code === CYS_ISSUE.CORRUPT);
        expect(issue?.severity).toBe("error");
        expect(issue?.message).toContain("views/2-8-Net.xgmml");
    });
});

describe("cys robustness: tables", () => {
    const header = ['"CyCSV-Version","1"', '"SUID","w"', '"java.lang.Long","java.lang.Double"', '"",""'];

    it("records a 0-byte table (E_CYS_TABLE) and reads the rest", async () => {
        const { snapshot, report } = await load(
            session('<node id="5"/>', [{ name: `${ROOT}tables/${NODE_TABLE}`, data: "" }]),
        );
        expect(snapshot.nodeCount).toBe(1);
        expect(codes(report)).toContain(CYS_ISSUE.TABLE);
    });

    it("records a table with a Latin-1 byte (E_CYS_TABLE): CyCSV is always UTF-8", async () => {
        const data = new Uint8Array([
            ...new TextEncoder().encode(`${header.join("\n")}\n"T",""\n"5","caf`),
            0xe9,
            ...new TextEncoder().encode('"\n'),
        ]);
        const bad = data.slice();
        // the column is a String column, so the cell is text
        const text = new TextDecoder("latin1").decode(bad).replace("java.lang.Double", "java.lang.String");
        const bytes = Uint8Array.from(text, (c) => c.charCodeAt(0));
        const { snapshot, report } = await load(
            session('<node id="5"/>', [{ name: `${ROOT}tables/${NODE_TABLE}`, data: bytes }]),
        );
        expect(snapshot.nodeCount).toBe(1);
        expect(snapshot.nodes.get("w")).toBeNull();
        expect(codes(report)).toContain(CYS_ISSUE.TABLE);
    });

    it("reads a table with a UTF-8 BOM and one with bare CR line endings", async () => {
        for (const data of [
            `${String.fromCharCode(0xfeff)}${[...header, '"T",""', '"5","2.5"'].join("\n")}\n`,
            `${[...header, '"T",""', '"5","2.5"'].join("\r")}\r`,
        ]) {
            const { snapshot, report } = await load(
                session('<node id="5"/>', [{ name: `${ROOT}tables/${NODE_TABLE}`, data }]),
            );
            expect(cell(snapshot, "nodes", "w", "5")).toBe(2.5);
            expect(codes(report)).not.toContain(CYS_ISSUE.TABLE);
        }
    });

    it("keeps a String cell starting with = as text (W_EQUATION_AS_TEXT)", async () => {
        const { snapshot, report } = await load(
            session('<node id="5"/>', [
                table(NODE_TABLE, [
                    '"SUID","s"',
                    '"java.lang.Long","java.lang.String"',
                    '"T",""',
                    '"5","=not a formula"',
                ]),
            ]),
        );
        expect(cell(snapshot, "nodes", "s", "5")).toBe("=not a formula");
        expect(codes(report)).toContain(XGMML_ISSUE.EQUATION_AS_TEXT);
    });

    it("reads the rows after a blank table-title line written by another tool", async () => {
        const { snapshot, report } = await load(
            session('<node id="5"/><node id="6"/>', [table(NODE_TABLE, [...header, "", '"5","2.5"', '"6","3.5"'])]),
        );
        expect(cell(snapshot, "nodes", "w", "5")).toBe(2.5);
        expect(cell(snapshot, "nodes", "w", "6")).toBe(3.5);
        expect(codes(report)).not.toContain(CYS_ISSUE.TABLE_ROW);
    });

    it("refuses a version row that does not parse (E_CYS_TABLE)", async () => {
        for (const versionRow of ['"CyCSV-Version",""', '"CyCSV-Version","1","x"']) {
            const { snapshot, report } = await load(
                session('<node id="5"/>', [table(NODE_TABLE, [versionRow, ...header.slice(1), '"T",""', '"5","2.5"'])]),
            );
            expect(snapshot.nodes.get("w")).toBeNull();
            const issue = report.issues.find((i) => i.code === CYS_ISSUE.TABLE);
            expect(issue?.message).toMatch(/version row/);
        }
    });

    const shared = (title: string, lines: readonly string[]): ZipInput =>
        table(`1-Root/SHARED_ATTRS-org.cytoscape.model.CyNode-${title}.cytable`, lines);
    const local = table(NODE_TABLE, ['"SUID","own"', '"java.lang.Long","java.lang.String"', '"T",""', '"5","o"']);
    const virtual = (attrs: Record<string, string>): string =>
        `<virtualColumn ${Object.entries(attrs)
            .map(([k, v]) => `${k}="${v}"`)
            .join(" ")}/>`;

    it("refuses a virtual column whose target join key the target table lacks, directly and through a chain", async () => {
        const base = shared("base", ['"SUID","v"', '"java.lang.Long","java.lang.String"', '"T",""', '"5","from-base"']);
        const mid = shared("mid", ['"SUID","m"', '"java.lang.Long","java.lang.String"', '"T",""', '"5","x"']);
        const direct = virtual({
            name: "v",
            targetTable: NODE_TABLE,
            sourceTable: "1-Root/SHARED_ATTRS-org.cytoscape.model.CyNode-base.cytable",
            sourceColumn: "v",
            sourceJoinKey: "SUID",
            targetJoinKey: "nope",
        });
        const first = await load(session('<node id="5"/>', [local, base, cytables([direct])]));
        expect(first.snapshot.nodes.get("v")).toBeNull();
        expect(first.report.issues.find((i) => i.code === CYS_ISSUE.TABLE)?.message).toContain('"nope"');
        const chainedSource = virtual({
            name: "v",
            targetTable: "1-Root/SHARED_ATTRS-org.cytoscape.model.CyNode-mid.cytable",
            sourceTable: "1-Root/SHARED_ATTRS-org.cytoscape.model.CyNode-base.cytable",
            sourceColumn: "v",
            sourceJoinKey: "SUID",
            targetJoinKey: "nope",
        });
        const chained = virtual({
            name: "c",
            targetTable: NODE_TABLE,
            sourceTable: "1-Root/SHARED_ATTRS-org.cytoscape.model.CyNode-mid.cytable",
            sourceColumn: "v",
            sourceJoinKey: "SUID",
            targetJoinKey: "SUID",
        });
        const second = await load(session('<node id="5"/>', [local, base, mid, cytables([chainedSource, chained])]));
        expect(second.snapshot.nodes.get("c")).toBeNull();
        expect(second.report.issues.find((i) => i.code === CYS_ISSUE.TABLE)?.message).toContain('"nope"');
    });

    it("refuses a virtual column missing a required attribute (E_CYS_TABLE naming it)", async () => {
        const { snapshot, report } = await load(
            session('<node id="5"/>', [local, cytables([virtual({ name: "v", sourceTable: "x", sourceColumn: "v" })])]),
        );
        expect(cell(snapshot, "nodes", "own", "5")).toBe("o");
        expect(report.issues.find((i) => i.code === CYS_ISSUE.TABLE)?.message).toContain("targetTable");
    });

    it("skips the virtual columns of a truncated cytables.xml (E_CYS_TABLE) and reads the rest", async () => {
        const broken = cytables([]);
        const { snapshot, report } = await load(
            session('<node id="5"/>', [local, { ...broken, data: (broken.data as string).slice(0, -30) }]),
        );
        expect(cell(snapshot, "nodes", "own", "5")).toBe("o");
        const issue = report.issues.find((i) => i.code === CYS_ISSUE.TABLE);
        expect(issue?.message).toContain("cytables.xml");
    });

    it("orders the networks by entry order when network_list.xml is truncated, with a warning naming it", async () => {
        const zip = makeZip([
            { name: `${ROOT}3.0.0.version`, data: "" },
            {
                name: `${ROOT}networks/1-Root.xgmml`,
                data: networkFile([
                    ["2", "A", '<node id="a"/>'],
                    ["3", "B", '<node id="b"/>'],
                ]),
            },
            {
                name: `${ROOT}apps/org.cytoscape.swing-application/network_list.xml`,
                data: `${DECL}<networks><network id="3" order="0"/><network id="2" or`,
            },
        ]);
        expect((await listGraphs(zip))?.map((g) => g.name)).toEqual(["A", "B"]);
        const { report } = await load(zip);
        const issue = report.issues.find(
            (i) => i.code === CYS_ISSUE.ENTRY_SKIPPED && i.message.includes("network_list.xml"),
        );
        expect(issue?.severity).toBe("warning");
    });
});

describe("cys robustness: 2.x sessions", () => {
    it("counts the selected and hidden names that match no element (W_DANGLING_REFERENCE)", async () => {
        const { snapshot, report } = await load(
            session2x(
                cysessionXml(
                    '<network id="Main" filename="Main.xgmml"><parent id="Network Root"/><selectedNodes><node id="a"/><node id="ghost"/></selectedNodes><hiddenNodes><node id="phantom"/></hiddenNodes></network>',
                ),
                [{ name: `${ROOT}Main.xgmml`, data: xgmml2x('<node id="a" label="a"/>') }],
            ),
        );
        expect(cell(snapshot, "nodes", "cytoscape.selected", "a")).toBe(true);
        const issue = report.issues.find((i) => i.code === CYS_ISSUE.DANGLING_REFERENCE);
        expect(issue?.message).toMatch(/\b2\b/);
    });

    it("warns about a cysession.xml documentVersion that does not parse and reads the session as 2.x", async () => {
        const { snapshot, report } = await load(
            session2x(
                cysessionXml('<network id="Main" filename="Main.xgmml"><parent id="Network Root"/></network>', "abc"),
                [{ name: `${ROOT}Main.xgmml`, data: xgmml2x('<node id="a"/>') }],
            ),
        );
        expect(snapshot.nodeCount).toBe(1);
        const issue = report.issues.find((i) => i.code === XGMML_ISSUE.DOCUMENT_VERSION);
        expect(issue?.message).toContain("cysession.xml");
    });

    it("warns about a network record without an id and one naming a file another record names", async () => {
        const zip = session2x(
            cysessionXml(
                '<network filename="Alpha.xgmml"><parent id="Network Root"/></network><network id="Beta" filename="Alpha.xgmml"><parent id="Network Root"/></network>',
            ),
            [{ name: `${ROOT}Alpha.xgmml`, data: xgmml2x('<node id="a"/>') }],
        );
        expect((await listGraphs(zip))?.map((g) => g.name)).toEqual(["Alpha"]);
        const { report } = await load(zip);
        const records = report.issues.filter((i) => i.code === CYS_ISSUE.SESSION_RECORD);
        expect(records).toHaveLength(2);
        expect(records.map((i) => i.message).join(" ")).toContain("Alpha.xgmml");
    });
});

describe("cys robustness: importAll", () => {
    /** A session of `count` networks, each with its own node table of about `tableBytes` bytes. */
    function multi(count: number, tableBytes = 100, badCrc = -1): Uint8Array {
        const subs: [string, string, string][] = [];
        const tables: ZipInput[] = [];
        for (let i = 0; i < count; i++) {
            const id = String(i + 2);
            subs.push([id, `N${i}`, `<node id="${100 + i}"/>`]);
            const entry = table(`${id}-N${i}/LOCAL_ATTRS-org.cytoscape.model.CyNode-t.cytable`, [
                '"SUID","w"',
                '"java.lang.Long","java.lang.String"',
                '"T",""',
                `"${100 + i}","${"w".repeat(tableBytes)}"`,
            ]);
            tables.push(i === badCrc ? { ...entry, crc: 1 } : entry);
        }
        return makeZip([
            { name: `${ROOT}3.0.0.version`, data: "" },
            { name: `${ROOT}networks/1-Root.xgmml`, data: networkFile(subs) },
            ...tables,
        ]);
    }

    it("parses each network file once, whatever its number of registered subnetworks", async () => {
        const spy = vi.spyOn(XgmmlParser.prototype, "document");
        try {
            const results = await importAllGraphs(multi(30), { format: "cys" });
            expect(results).toHaveLength(30);
            expect(results[29].snapshot.ids.indexOf("129")).not.toBe(INVALID_INDEX);
            expect(cell(results[29].snapshot, "nodes", "w", "129")).toBe("w".repeat(100));
            expect(cell(results[0].snapshot, "nodes", "w", "129")).toBeUndefined();
            expect(spy).toHaveBeenCalledTimes(1);
        } finally {
            spy.mockRestore();
        }
    });

    it("applies maxUncompressedBytes to the whole call", async () => {
        const zip = multi(5, 4000);
        const results = await importAllGraphs(zip, { format: "cys", maxUncompressedBytes: 40000 } as never);
        expect(results).toHaveLength(5);
        const err = await failure(importAllGraphs(zip, { format: "cys", maxUncompressedBytes: 12000 } as never));
        expect(fatal(err).code).toBe(CYS_ISSUE.TOO_LARGE);
        expect(fatal(err).message).toContain("tables/4-N2/");
        // the failing network's own report: network 0 pushed its node, network 2 has not yet
        expect(err.report.counts.nodes).toBe(0);
        expect(err.report.issues).toHaveLength(1);
    });

    it("fails a later network's damaged table with that network's report, not the first one's", async () => {
        const err = await failure(importAllGraphs(multi(5, 100, 3), { format: "cys" }));
        expect(fatal(err).code).toBe(CYS_ISSUE.CORRUPT);
        expect(fatal(err).message).toContain("tables/5-N3/");
        expect(err.report.counts.nodes).toBe(0);
        expect(err.report.issues).toHaveLength(1);
    });

    it("reports monotonic progress that ends at its total", async () => {
        const seen: [number, number | undefined][] = [];
        await cysImporter.importAll?.(multi(3), () => new GraphBuilder({ directed: true }), {
            onProgress: (done, total) => seen.push([done, total]),
        });
        const [lastDone, total] = seen[seen.length - 1];
        expect(lastDone).toBe(total);
        const inflation = seen.filter(([, t]) => t === total);
        for (let i = 1; i < inflation.length; i++) {
            expect(inflation[i][0]).toBeGreaterThanOrEqual(inflation[i - 1][0]);
        }
    });
});
