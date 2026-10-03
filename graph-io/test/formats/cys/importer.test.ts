import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { GraphBuilder, type GraphSnapshot } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import { readBytes } from "../../../src/common/input.js";
import { CYS_ISSUE } from "../../../src/formats/cys/constants.js";
import { cysImporter, sniffCys } from "../../../src/formats/cys/importer.js";
import { urlDecode } from "../../../src/formats/cys/session.js";
import { importAllGraphs, importGraph, type ImportGraphOptions, listGraphs, registry } from "../../../src/registry.js";
import { ImportError, type ImportReport } from "../../../src/types.js";
import { makeZip, type ZipInput } from "../../helpers/zip.js";

const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "conformance", "fixtures", "cys");

function fixture(path: string): Uint8Array {
    return new Uint8Array(readFileSync(join(FIXTURES, path)));
}

function codes(report: ImportReport): string[] {
    return report.issues.map((i) => i.code);
}

function cell(
    snapshot: GraphSnapshot,
    table: "nodes" | "edges" | "graph",
    column: string,
    row: number | string,
): unknown {
    const c = snapshot[table].get(column);
    const index = typeof row === "number" ? row : snapshot.ids.indexOf(row);
    if (c === null || index < 0 || !c.isSet(index)) {
        return undefined;
    }
    const value = c.value(index);
    return value instanceof Float32Array ? Array.from(value) : value;
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

const DECL = '<?xml version="1.0" encoding="UTF-8"?>\n';
const NS =
    'xmlns="http://www.cs.rpi.edu/XGMML" xmlns:cy="http://www.cytoscape.org" xmlns:xlink="http://www.w3.org/1999/xlink"';
const ROOT = "CytoscapeSession-1/";

/** A one-network 3.x session around a network body and extra entries. */
function session(body: string, extra: readonly ZipInput[] = []): Uint8Array {
    return makeZip([
        { name: `${ROOT}3.0.0.version`, data: "" },
        {
            name: `${ROOT}networks/1-Root.xgmml`,
            data: `${DECL}<graph id="1" label="Root" cy:registered="0" cy:documentVersion="3.0" ${NS}><att><graph id="2" label="Net" cy:registered="1">${body}</graph></att></graph>`,
        },
        ...extra,
    ]);
}

function table(path: string, lines: readonly string[]): ZipInput {
    return { name: `${ROOT}tables/${path}`, data: `${lines.join("\n")}\n` };
}

const NODE_TABLE = "2-Net/LOCAL_ATTRS-org.cytoscape.model.CyNode-Net+default+node.cytable";

describe("cysImporter: the archive", () => {
    it("is registered as a read-only format with a session sniff", () => {
        expect(cysImporter.format).toBe("cys");
        expect(cysImporter.extensions).toEqual([".cys"]);
        expect(registry.importer("cys")).toBe(cysImporter);
        expect(registry.hasExporter("cys")).toBe(false);
        expect(sniffCys(fixture("authored/base-3x.cys"))).toBe(0.95);
        expect(sniffCys(fixture("session2x/v270session.cys"))).toBe(0.95);
        expect(sniffCys(fixture("authored/self-extracting-stub.cys").subarray(0, 8192))).toBe(0.95);
        expect(sniffCys(makeZip([{ name: "word/document.xml", data: "<w/>" }]))).toBe(0);
        expect(sniffCys(new TextEncoder().encode("PK but not a zip"))).toBe(0);
        expect(registry.sniff({ head: makeZip([{ name: "a.graphml", data: "<graphml/>" }]) })).toBeNull();
    });

    it("refuses text input, empty input and what is not a zip", async () => {
        for (const [input, code] of [
            ["a string", CYS_ISSUE.NOT_ZIP],
            [new Uint8Array(0), CYS_ISSUE.EMPTY_INPUT],
            [new TextEncoder().encode("hello"), CYS_ISSUE.NOT_ZIP],
        ] as const) {
            const err = await failure(cysImporter.import(input, new GraphBuilder({ directed: true })));
            expect(codes(err.report)).toEqual([code]);
            expect(err.report.format).toBe("cys");
        }
        async function* text(): AsyncGenerator<string> {
            await Promise.resolve();
            yield "PK";
        }
        const err = await failure(cysImporter.import(text(), new GraphBuilder({ directed: true })));
        expect(codes(err.report)).toEqual([CYS_ISSUE.NOT_ZIP]);
    });

    it("reads a ReadableStream and an async iterable of byte chunks like the bytes", async () => {
        const bytes = fixture("authored/base-3x.cys");
        const stream = new ReadableStream<Uint8Array>({
            start(controller): void {
                for (let at = 0; at < bytes.byteLength; at += 999) {
                    controller.enqueue(bytes.subarray(at, at + 999));
                }
                controller.close();
            },
        });
        const fromStream = await importGraph(stream, { format: "cys" });
        async function* chunks(): AsyncGenerator<Uint8Array> {
            await Promise.resolve();
            yield bytes.subarray(0, 10);
            yield bytes.subarray(10);
        }
        const fromChunks = await importGraph(chunks(), { format: "cys" });
        const whole = await importGraph(bytes, { format: "cys" });
        expect(fromStream.snapshot.nodeCount).toBe(whole.snapshot.nodeCount);
        expect(fromChunks.snapshot.edgeCount).toBe(whole.snapshot.edgeCount);
    });

    it("refuses a chunk that is neither text nor bytes", async () => {
        async function* odd(): AsyncGenerator {
            await Promise.resolve();
            yield 42;
        }
        await expect(readBytes(odd() as AsyncIterable<Uint8Array>)).rejects.toMatchObject({ code: "E_UNSUPPORTED" });
    });

    it("reports what the archive holds besides graphs, and names the entry in relayed messages", async () => {
        const { report } = await importGraph(fixture("authored/base-3x.cys"), { format: "cys", graphName: "Alpha" });
        const skipped = report.issues.find((i) => i.code === CYS_ISSUE.ENTRY_SKIPPED);
        expect(skipped?.message).toContain("tables/global/60-Global+Table.cytable");
        expect(skipped?.message).toContain("session_bookmarks.xml");
        const styles = report.issues.find((i) => i.code === CYS_ISSUE.STYLES_NOT_IMPORTED);
        expect(styles?.message).toContain("session_vizmap.xml");
        expect(styles?.message).toContain("#706");
        const relayed = report.issues.find((i) => i.code === "W_XGMML_ROOT_ONLY_ELEMENTS");
        expect(relayed?.message).toContain("networks/10-Collection.xgmml");
    });

    it("maps each container failure to its code", async () => {
        for (const [file, code] of [
            ["truncated.cys", CYS_ISSUE.CORRUPT],
            ["no-end-record.cys", CYS_ISSUE.CORRUPT],
            ["crc-mismatch.cys", CYS_ISSUE.CORRUPT],
            ["encrypted.cys", CYS_ISSUE.UNSUPPORTED],
            ["deflate64.cys", CYS_ISSUE.UNSUPPORTED],
            ["bzip2.cys", CYS_ISSUE.UNSUPPORTED],
            ["version-4.cys", CYS_ISSUE.VERSION],
            ["prerelease-3.0.cys", CYS_ISSUE.VERSION],
            ["not-a-session.zip", CYS_ISSUE.NOT_SESSION],
            ["ratio-bomb.cys", CYS_ISSUE.TOO_LARGE],
            ["network-not-xml.cys", "E_XML_SYNTAX"],
        ] as const) {
            const err = await failure(
                cysImporter.import(fixture(`authored/${file}`), new GraphBuilder({ directed: true })),
            );
            expect(codes(err.report), file).toContain(code);
            if (file === "network-not-xml.cys") {
                expect(err.report.issues.at(-1)?.message).toContain("networks/10-Collection.xgmml");
            }
            if (file === "ratio-bomb.cys") {
                expect(err.report.issues.at(-1)?.category).toBe("unsupported");
            }
        }
    });

    it("stops at maxUncompressedBytes and refuses a bad value of it", async () => {
        const err = await failure(
            importGraph(fixture("authored/base-3x.cys"), {
                format: "cys",
                maxUncompressedBytes: 500,
            } as ImportGraphOptions),
        );
        expect(codes(err.report)).toContain(CYS_ISSUE.TOO_LARGE);
        await expect(
            importGraph(fixture("authored/base-3x.cys"), {
                format: "cys",
                maxUncompressedBytes: -1,
            } as ImportGraphOptions),
        ).rejects.toMatchObject({
            code: "E_UNSUPPORTED",
        });
        await expect(
            importGraph(fixture("authored/base-3x.cys"), { format: "cys", zAs: "depth" } as ImportGraphOptions),
        ).rejects.toMatchObject({
            code: "E_UNSUPPORTED",
        });
    });

    it("checks the cancellation signal and reports inflation progress", async () => {
        const controller = new AbortController();
        const reason = new Error("stop");
        controller.abort(reason);
        await expect(
            cysImporter.import(fixture("authored/base-3x.cys"), new GraphBuilder({ directed: true }), {
                signal: controller.signal,
            }),
        ).rejects.toBe(reason);
        const seen: [number, number | undefined][] = [];
        await cysImporter.import(fixture("authored/base-3x.cys"), new GraphBuilder({ directed: true }), {
            onProgress: (done, total) => seen.push([done, total]),
        });
        // the input's bytes, then the bytes inflated so far against the archive's uncompressed total
        expect(seen.length).toBeGreaterThan(2);
        const [, total] = seen[seen.length - 1];
        expect(seen.slice(1).every(([done, t]) => t === total && done <= (total ?? 0))).toBe(true);
    });

    it("reports the common options it has no use for and the sink options it cannot apply", async () => {
        const { report } = await importGraph(fixture("authored/base-3x.cys"), { format: "cys", nodeIdFrom: "label" });
        expect(report.issues.filter((i) => i.code === "W_OPTION_IGNORED").map((i) => i.element)).toEqual([
            "nodeIdFrom",
        ]);
        const sink = new GraphBuilder({ directed: true, addMissingNodes: false });
        const own = await cysImporter.import(fixture("authored/base-3x.cys"), sink, { addMissingNodes: true });
        expect(codes(own)).toContain("W_SINK_OPTION");
    });

    it("decodes URL-encoded entry names as Java's URLDecoder does", () => {
        expect(urlDecode("Main+net%2D2.xgmml")).toBe("Main net-2.xgmml");
        expect(urlDecode("50%")).toBe("50%");
    });
});

describe("cysImporter: choosing a network", () => {
    it("lists the registered subnetworks in network_list.xml order, with their counts", async () => {
        expect(await listGraphs(fixture("authored/base-3x.cys"))).toEqual([
            { index: 0, name: "Beta", nodes: 3, edges: 2 },
            { index: 1, name: "Alpha", nodes: 4, edges: 2 },
        ]);
        expect((await listGraphs(fixture("authored/no-network-list.cys")))?.map((g) => g.name)).toEqual([
            "Alpha",
            "Beta",
        ]);
        expect(await listGraphs(fixture("authored/session-2x.cys"))).toEqual([
            { index: 0, name: "Main net--child", nodes: null, edges: null },
            { index: 1, name: "Main net", nodes: null, edges: null },
        ]);
    });

    it("reads the first network by default, another by graphIndex or graphName, and warns about the rest", async () => {
        const first = await importGraph(fixture("authored/base-3x.cys"), { format: "cys" });
        expect(first.snapshot.meta.name).toBe("Beta");
        expect(codes(first.report)).toContain(CYS_ISSUE.MULTIPLE_GRAPHS);
        const second = await importGraph(fixture("authored/base-3x.cys"), { format: "cys", graphIndex: 1 });
        expect(second.snapshot.meta.name).toBe("Alpha");
        const named = await importGraph(fixture("session3x/subnetworks.cys"), { format: "cys", graphName: "Nb" });
        expect(named.snapshot.nodeCount).toBe(2);
        expect(cell(named.snapshot, "nodes", "cytoscape.nestedNetwork", "233")).toBe("Na");
        expect(cell(named.snapshot, "nodes", "cytoscape.nestedNetwork", "234")).toBe("Nb.1");
    });

    it("fails on a choice that names nothing, a shared name, and both options at once", async () => {
        const missing = await failure(
            importGraph(fixture("authored/base-3x.cys"), { format: "cys", graphName: "Gamma" }),
        );
        expect(codes(missing.report)).toContain(CYS_ISSUE.GRAPH_NOT_FOUND);
        const twice = makeZip([
            { name: `${ROOT}3.0.0.version`, data: "" },
            {
                name: `${ROOT}networks/1-R.xgmml`,
                data: `${DECL}<graph id="1" cy:registered="0" ${NS}><att><graph id="2" label="Same" cy:registered="1"/></att><att><graph id="3" label="Same" cy:registered="1"/></att></graph>`,
            },
        ]);
        const ambiguous = await failure(importGraph(twice, { format: "cys", graphName: "Same" }));
        expect(codes(ambiguous.report)).toContain(CYS_ISSUE.AMBIGUOUS_GRAPH_NAME);
        expect(ambiguous.report.issues.at(-1)?.message).toContain("0, 1");
        await expect(importGraph(twice, { format: "cys", graphIndex: 0, graphName: "Same" })).rejects.toMatchObject({
            code: "E_UNSUPPORTED",
        });
        const empty = makeZip([
            { name: `${ROOT}3.0.0.version`, data: "" },
            { name: `${ROOT}networks/1-R.xgmml`, data: `${DECL}<graph id="1" cy:registered="0" ${NS}/>` },
        ]);
        expect(codes((await failure(importGraph(empty, { format: "cys" }))).report)).toContain(CYS_ISSUE.NO_GRAPH);
    });

    it("imports every network, each with its own report", async () => {
        const all = await importAllGraphs(fixture("session2x/v283Session1.cys"), { format: "cys" });
        expect(all.map((r) => [r.snapshot.meta.name, r.snapshot.nodeCount, r.snapshot.edgeCount])).toEqual([
            ["RUAL.subset--child", 26, 46],
            ["RUAL.subset", 419, 1089],
            ["galFiltered--child", 82, 94],
            ["RUAL.subset--child--child", 7, 7],
            ["galFiltered", 331, 362],
        ]);
        expect(all.every((r) => !codes(r.report).includes(CYS_ISSUE.MULTIPLE_GRAPHS))).toBe(true);
    });
});

describe("cysImporter: a 3.x network", () => {
    it("flips y to y-up, keeps z apart, writes further views as position@n, and keeps the view graphics", async () => {
        const { snapshot } = await importGraph(fixture("authored/base-3x.cys"), { format: "cys", graphName: "Alpha" });
        expect(cell(snapshot, "nodes", "position", "21")).toEqual([10, -20, 0]);
        expect(cell(snapshot, "nodes", "position", "23")).toEqual([50, 0, 0]);
        expect(Object.is(cell(snapshot, "nodes", "position", "23") as number[], -0)).toBe(false);
        expect(cell(snapshot, "nodes", "z", "22")).toBe(2);
        expect(cell(snapshot, "nodes", "position@2", "22")).toEqual([3, -4, 0]);
        expect(snapshot.nodes.get("position@2")?.meta.role).toBeNull();
        expect(snapshot.nodes.get("position@2")?.meta.origin?.id).toBe("41");
        expect(cell(snapshot, "graph", "graphics", 0)).toEqual({ NETWORK_TITLE: "Alpha", NETWORK_SCALE_FACTOR: "1.5" });
        const zInPosition = await importGraph(fixture("authored/base-3x.cys"), {
            format: "cys",
            graphName: "Alpha",
            zAs: "position",
        } as ImportGraphOptions);
        expect(cell(zInPosition.snapshot, "nodes", "position", "22")).toEqual([30.5, 40, 2]);
        const noViews = await importGraph(fixture("authored/no-views.cys"), { format: "cys" });
        expect(noViews.snapshot.nodes.byRole("position")).toBeNull();
    });

    it("reads every CyCSV type and the cell rules: empty cells, list splits, equations, quotes, newlines", async () => {
        const { snapshot, report } = await importGraph(fixture("authored/base-3x.cys"), {
            format: "cys",
            graphName: "Alpha",
        });
        expect(snapshot.nodes.get("score")?.dtype).toBe("f64");
        expect(cell(snapshot, "nodes", "score", "22")).toBeNaN();
        expect(cell(snapshot, "nodes", "score", "23")).toBeUndefined();
        expect(snapshot.nodes.get("count")?.dtype).toBe("i32");
        expect(cell(snapshot, "nodes", "count", "22")).toBeUndefined();
        expect(snapshot.nodes.get("big")?.meta.origin?.type).toBe("long");
        expect(cell(snapshot, "nodes", "tags", "22")).toEqual([""]);
        expect(cell(snapshot, "nodes", "flags", "22")).toBeUndefined();
        expect(cell(snapshot, "nodes", "note", "22")).toBe("");
        expect(snapshot.nodes.get("formula")?.meta.extra.equation).toBe(true);
        expect(cell(snapshot, "nodes", "selected", "21")).toBe(true);
        expect(codes(report)).toEqual(expect.arrayContaining(["E_BAD_VALUE", "W_PRECISION", "W_EQUATION_AS_TEXT"]));
    });

    it("joins virtual columns, renames a shared or app column that collides with a local one, and hides HIDDEN and app columns", async () => {
        const { snapshot } = await importGraph(fixture("authored/base-3x.cys"), { format: "cys", graphName: "Alpha" });
        expect(snapshot.nodes.get("count#SHARED_ATTRS")?.meta.origin?.namespace).toBe("SHARED_ATTRS");
        expect(snapshot.nodes.get("count#MYAPP")?.meta.extra.hidden).toBe(true);
        expect(snapshot.nodes.get("appScore")?.meta.origin?.namespace).toBe("MYAPP");
        expect(snapshot.graph.get("__layoutAlgorithm")?.meta.origin?.namespace).toBe("HIDDEN");
        expect(snapshot.nodes.get("__isGroup")).toBeNull();
        expect(cell(snapshot, "edges", "shared interaction", 0)).toBe("pp");
        expect(cell(snapshot, "nodes", "species", "26")).toBe("");
    });

    it("records the session facts in meta.extra.cytoscape", async () => {
        const beta = await importGraph(fixture("authored/base-3x.cys"), { format: "cys" });
        expect(beta.snapshot.meta.sourceFormat).toBe("cys");
        expect(beta.snapshot.meta.extra.cytoscape).toMatchObject({
            sessionVersion: "3.0.0",
            collection: "Collection",
            network: "30",
            parentNetwork: "Alpha",
            visualStyle: "Sample Style",
            groups: [],
        });
        const groups = await importGraph(fixture("session3x/nestedGroups_collapsed.cys"), { format: "cys" });
        expect((groups.snapshot.meta.extra.cytoscape as { groups: unknown }).groups).toEqual([
            { group: "301", members: ["313", "312"] },
            { group: "290", members: ["315"] },
        ]);
    });

    it("skips an edge whose endpoint is not in the network, through the registry and a caller's sink, unless addMissingNodes", async () => {
        const bytes = fixture("authored/edge-outside-network.cys");
        const viaRegistry = await importGraph(bytes, { format: "cys" });
        expect(codes(viaRegistry.report)).toContain("E_UNKNOWN_NODE");
        expect(viaRegistry.snapshot.edgeCount).toBe(1);
        const sink = new GraphBuilder({ directed: true });
        const own = await cysImporter.import(bytes, sink);
        expect(codes(own)).toContain("E_UNKNOWN_NODE");
        expect(sink.freeze().edgeCount).toBe(1);
        const added = await importGraph(bytes, { format: "cys", addMissingNodes: true });
        expect(added.snapshot.ids.has("23")).toBe(true);
        expect(added.snapshot.edgeCount).toBe(2);
    });

    it("reads a table of schema version 0 and rejects an unknown list item class", async () => {
        const v0 = session('<node id="5" label="n"/>', [
            table(NODE_TABLE, [
                '"SUID","w"',
                '"java.lang.Long","java.lang.Double"',
                '"Net default node",""',
                '"5","2.5"',
            ]),
        ]);
        expect(cell((await importGraph(v0, { format: "cys" })).snapshot, "nodes", "w", "5")).toBe(2.5);
        const odd = session('<node id="5" label="n"/>', [
            table(NODE_TABLE, [
                '"CyCSV-Version","1"',
                '"SUID","w"',
                '"java.lang.Long","java.util.List<java.lang.Float>"',
                '"",""',
                '"Net default node",""',
                '"5","2.5"',
            ]),
        ]);
        const { report } = await importGraph(odd, { format: "cys" });
        expect(codes(report)).toContain(CYS_ISSUE.TABLE);
    });

    it("refuses an Integer cell beyond i32 (E_BAD_VALUE): a java.lang.Integer column never holds one", async () => {
        const doc = session('<node id="5" label="n"/><node id="6" label="m"/>', [
            table(NODE_TABLE, [
                '"SUID","n","l"',
                '"java.lang.Long","java.lang.Integer","java.util.List<java.lang.Integer>"',
                '"Net default node",""',
                '"5","2147483648","2147483648\n4"',
                '"6","7","8"',
            ]),
        ]);
        const { snapshot, report } = await importGraph(doc, { format: "cys" });
        expect(codes(report).filter((c) => c === "E_BAD_VALUE")).toHaveLength(2);
        expect(codes(report)).not.toContain("W_WIDENED");
        expect(snapshot.nodes.get("n")?.dtype).toBe("i32");
        expect(cell(snapshot, "nodes", "n", "5")).toBeUndefined();
        expect(cell(snapshot, "nodes", "n", "6")).toBe(7);
        expect(Array.from(cell(snapshot, "nodes", "l", "5") as number[])).toEqual([4]);
    });

    it("keeps a column name with doubled quotes and a comma as written", async () => {
        const doc = session('<node id="5" label="n"/>', [
            table(NODE_TABLE, [
                '"SUID","say ""hi"", then"',
                '"java.lang.Long","java.lang.String"',
                '"Net default node",""',
                '"5","a ""quoted"" cell"',
            ]),
        ]);
        const { snapshot } = await importGraph(doc, { format: "cys" });
        expect(cell(snapshot, "nodes", 'say "hi", then', "5")).toBe('a "quoted" cell');
    });

    it("records a broken table header, broken CSV and a bad Boolean", async () => {
        const short = session('<node id="5" label="n"/>', [table(NODE_TABLE, ['"CyCSV-Version","1"', '"SUID","w"'])]);
        expect(codes((await importGraph(short, { format: "cys" })).report)).toContain(CYS_ISSUE.TABLE);
        const mismatch = session('<node id="5" label="n"/>', [
            table(NODE_TABLE, ['"SUID","w"', '"java.lang.Long"', '"Net default node",""', '"5","2.5"']),
        ]);
        expect(codes((await importGraph(mismatch, { format: "cys" })).report)).toContain(CYS_ISSUE.TABLE);
        const unclosed = session('<node id="5" label="n"/>', [
            table(NODE_TABLE, [
                '"SUID","w"',
                '"java.lang.Long","java.lang.String"',
                '"Net default node",""',
                '"5","open',
            ]),
        ]);
        expect(codes((await importGraph(unclosed, { format: "cys" })).report)).toContain(CYS_ISSUE.TABLE);
        const flag = session('<node id="5" label="n"/>', [
            table(NODE_TABLE, [
                '"SUID","f"',
                '"java.lang.Long","java.lang.Boolean"',
                '"Net default node",""',
                '"5","maybe"',
            ]),
        ]);
        expect(codes((await importGraph(flag, { format: "cys" })).report)).toContain("E_BAD_VALUE");
    });

    it("resolves a nested-network pointer into another network file of the session", async () => {
        const bytes = makeZip([
            { name: `${ROOT}3.0.0.version`, data: "" },
            {
                name: `${ROOT}networks/1-A.xgmml`,
                data: `${DECL}<graph id="1" cy:registered="0" ${NS}><att><graph id="2" label="First" cy:registered="1"><node id="3" label="n"><att><graph xlink:href="5-B.xgmml#6"/></att></node></graph></att></graph>`,
            },
            {
                name: `${ROOT}networks/5-B.xgmml`,
                data: `${DECL}<graph id="5" cy:registered="0" ${NS}><att><graph id="6" label="Second" cy:registered="1"/></att></graph>`,
            },
        ]);
        const { snapshot } = await importGraph(bytes, { format: "cys" });
        expect(cell(snapshot, "nodes", "cytoscape.nestedNetwork", "3")).toBe("Second");
    });

    it("skips the nodes of a second view the network does not hold, and an id the id rule refuses", async () => {
        const view = (id: string, x: string): ZipInput => ({
            name: `${ROOT}views/2-${id}-Net.xgmml`,
            data: `${DECL}<graph id="${id}" cy:view="1" cy:networkId="2" ${NS}><node id="${id}0" cy:nodeId="5"><graphics x="${x}" y="2"/></node><node id="${id}1" cy:nodeId="404"><graphics x="9" y="9"/></node><node id="${id}2" cy:nodeId="abc"><graphics x="9" y="9"/></node></graph>`,
        });
        const doc = session('<node id="5" label="n"/>', [view("8", "1"), view("9", "3")]);
        for (const options of [{}, { ids: "number" as const }]) {
            const { snapshot, report } = await importGraph(doc, { format: "cys", ...options });
            expect(snapshot.nodeCount).toBe(1);
            expect(cell(snapshot, "nodes", "position@2", 0)).toEqual([3, -2, 0]);
            expect(codes(report)).toContain(CYS_ISSUE.DANGLING_REFERENCE);
        }
    });

    it("warns about tables, views and view elements that name nothing", async () => {
        const stray = session('<node id="5" label="n"/>', [
            {
                name: `${ROOT}views/2-9-Net.xgmml`,
                data: `${DECL}<graph id="9" cy:view="1" cy:networkId="2" ${NS}><node id="10" cy:nodeId="404"><graphics x="1" y="1"/></node></graph>`,
            },
        ]);
        const { report } = await importGraph(stray, { format: "cys" });
        expect(codes(report)).toContain(CYS_ISSUE.DANGLING_REFERENCE);
    });
});

describe("cysImporter: a 2.x session", () => {
    it("reads selection and hidden state from cysession.xml as cytoscape.selected and cytoscape.hidden", async () => {
        const { snapshot, report } = await importGraph(fixture("authored/session-2x.cys"), {
            format: "cys",
            graphName: "Main net",
        });
        expect(cell(snapshot, "nodes", "cytoscape.selected", "-1")).toBe(true);
        expect(cell(snapshot, "nodes", "cytoscape.selected", "-2")).toBeUndefined();
        expect(cell(snapshot, "nodes", "cytoscape.hidden", "-2")).toBe(true);
        expect(cell(snapshot, "edges", "cytoscape.hidden", 1)).toBe(true);
        expect(snapshot.nodes.get("cytoscape.selected")?.meta.origin?.namespace).toBe("cytoscape");
        expect(snapshot.meta.extra.cytoscape).toMatchObject({
            sessionVersion: "2.0.0",
            parentNetwork: null,
            visualStyle: "default",
        });
        expect(codes(report)).toEqual(
            expect.arrayContaining([
                CYS_ISSUE.DANGLING_REFERENCE,
                CYS_ISSUE.ENTRY_SKIPPED,
                CYS_ISSUE.STYLES_NOT_IMPORTED,
            ]),
        );
        const child = await importGraph(fixture("authored/session-2x.cys"), { format: "cys" });
        expect(child.snapshot.meta.extra.cytoscape).toMatchObject({ parentNetwork: "Main net", visualStyle: "Solid" });
        expect(child.snapshot.nodes.get("cytoscape.selected")).toBeNull();
    });

    it("counts the integration tests' selection of v283Session1: 82 nodes and 110 edges", async () => {
        const { snapshot } = await importGraph(fixture("session2x/v283Session1.cys"), {
            format: "cys",
            graphName: "galFiltered",
        });
        const nodes = snapshot.nodes.get("cytoscape.selected");
        const edges = snapshot.edges.get("cytoscape.selected");
        expect((nodes?.length ?? 0) - (nodes?.nullCount ?? 0)).toBe(82);
        expect((edges?.length ?? 0) - (edges?.nullCount ?? 0)).toBe(110);
    });

    it("needs cysession.xml when there is no version marker", async () => {
        const bytes = makeZip([
            { name: `${ROOT}net.xgmml`, data: `${DECL}<graph ${NS}/>` },
            { name: `${ROOT}cysession.xml`, data: "<cysession" },
        ]);
        const err = await failure(importGraph(bytes, { format: "cys" }));
        expect(codes(err.report)).toContain(CYS_ISSUE.CORRUPT);
        expect(err.report.issues.at(-1)?.message).toContain("cysession.xml");
    });
});
