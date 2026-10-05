import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { type ColumnDecl, GraphBuilder, GraphFormatError, type GraphSnapshot } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import { collectBytes } from "../../../src/common/writer.js";
import { readZipDirectory, readZipEntry, writeZip } from "../../../src/common/zip.js";
import { CYS_CAPABILITIES, CYS_LOSS, cysExporter, sessionEscape } from "../../../src/formats/cys/exporter.js";
import { CYS_LOSS as CYS_LOSS_FROM_SUBPATH } from "../../../src/formats/cys/index.js";
import { exportGraph, exportGraphToString, importGraph, registry } from "../../../src/registry.js";
import { type CommonExportOptions, type ImportReport, type LossNote } from "../../../src/types.js";
import { corpusFiles, readCorpusInput } from "../../helpers/corpus.js";
import { compareSnapshots, expectSameSnapshot, type SnapshotDiff } from "../../helpers/roundtrip.js";

const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "conformance", "fixtures", "cys");

/** Export a snapshot as a session. */
async function sessionOf(snapshot: GraphSnapshot, options?: CommonExportOptions): Promise<Uint8Array> {
    return collectBytes(cysExporter.export(snapshot, options));
}

/** Export and re-import. */
async function roundTrip(
    snapshot: GraphSnapshot,
    options?: CommonExportOptions,
    importOptions: Record<string, unknown> = {},
): Promise<{ back: GraphSnapshot; notes: readonly LossNote[]; report: ImportReport; bytes: Uint8Array }> {
    const notes = cysExporter.check(snapshot, options);
    const bytes = await sessionOf(snapshot, options);
    const { snapshot: back, report } = await importGraph(bytes, { format: "cys", ...importOptions });
    return { back, notes, report, bytes };
}

/** The text of every entry, by name, in archive order. */
async function entriesOf(bytes: Uint8Array): Promise<Map<string, string>> {
    const out = new Map<string, string>();
    for (const entry of readZipDirectory(bytes)) {
        const data = await readZipEntry(bytes, entry, { maxBytes: 1e9, maxRatio: 1e9 });
        out.set(entry.name, new TextDecoder().decode(data));
    }
    return out;
}

/** The entry whose name ends with a suffix. */
function entry(entries: Map<string, string>, test: RegExp): string {
    const name = [...entries.keys()].find((n) => test.test(n));
    if (name === undefined) {
        throw new Error(`no entry matches ${String(test)}: ${[...entries.keys()].join(", ")}`);
    }
    return entries.get(name) as string;
}

function build(directed: boolean, fill: (b: GraphBuilder) => void): GraphSnapshot {
    const b = new GraphBuilder({ directed, weightDtype: "f64" });
    fill(b);
    return b.freeze();
}

/** A graph of string SUIDs with one column filled per row. */
function withNodeColumn(decl: ColumnDecl, values: readonly unknown[]): GraphSnapshot {
    return build(true, (b) => {
        values.forEach((_, i) => b.addNode(String(i + 1)));
        const h = b.declareNodeColumn(decl);
        values.forEach((v, i) => {
            if (v !== undefined) {
                b.setNodeValue(h, i, v);
            }
        });
    });
}

const codes = (notes: readonly LossNote[]): string[] => notes.map((n) => n.code);

const cellOf = (s: GraphSnapshot, table: "nodes" | "edges", column: string, row: number): unknown => {
    const c = s[table].get(column);
    if (c === null || !c.isSet(row)) {
        return undefined;
    }
    const v = c.value(row);
    return ArrayBuffer.isView(v) ? Array.from(v as unknown as ArrayLike<number>) : v;
};

/**
 * The differences check() did not announce: an id difference needs an id note, a column
 * difference a note naming that column, an extension table difference a note naming the table.
 */
function unexplained(diffs: readonly SnapshotDiff[], notes: readonly LossNote[]): SnapshotDiff[] {
    const noted = new Set(notes.map((n) => n.column).filter((c): c is string => c !== null));
    const idNotes = notes.some((n) => [CYS_LOSS.ID_TEXT_TYPE, CYS_LOSS.ID_MANGLED].includes(n.code as never));
    return diffs.filter((d) => {
        if (d.path.startsWith("ids[")) {
            return !idNotes;
        }
        const table = /^(nodes|edges|graph|extensions)\.(.+)$/.exec(d.path);
        if (table === null) {
            return true;
        }
        const rest = table[2];
        return ![...noted].some(
            (c) => rest === c || rest.startsWith(`${c}[`) || rest.startsWith(`${c}.`) || rest.startsWith(`${c}:`),
        );
    });
}

describe("cysExporter: what it is", () => {
    it("is registered, with a frozen capability table and loss table", () => {
        expect(registry.exporter("cys")).toBe(cysExporter);
        expect(cysExporter.format).toBe("cys");
        expect(cysExporter.capabilities).toBe(CYS_CAPABILITIES);
        expect(Object.isFrozen(CYS_CAPABILITIES)).toBe(true);
        expect(CYS_LOSS_FROM_SUBPATH).toBe(CYS_LOSS);
        expect(Object.isFrozen(CYS_LOSS)).toBe(true);
        expect(CYS_CAPABILITIES.mixedDirection).toBe(true);
        expect(CYS_CAPABILITIES.edgeIds).toBe("required");
        expect(CYS_CAPABILITIES.hierarchy).toBe(false);
    });

    it("refuses to write a string: a session is binary", async () => {
        const g = build(true, (b) => b.addNode("1"));
        await expect(cysExporter.exportToString(g)).rejects.toMatchObject({
            code: "E_UNSUPPORTED",
            details: { reason: "binary" },
        });
        await expect(exportGraphToString(g, "cys")).rejects.toBeInstanceOf(GraphFormatError);
        const viaRegistry = await collectBytes(exportGraph(g, "cys"));
        expect(viaRegistry).toEqual(await sessionOf(g));
    });
});

describe("cysExporter: the archive Cytoscape reads", () => {
    const graph = (): GraphSnapshot =>
        build(true, (b) => {
            b.addNodes(["1", "2", "3"]);
            b.addEdge("1", "2");
            b.addEdge("2", "3");
            const label = b.declareNodeColumn({ name: "label", dtype: "string", role: "label" });
            ["A", "B", "C"].forEach((v, i) => b.setNodeValue(label, i, v));
            const pos = b.declareNodeColumn({ name: "position", dtype: "f32", components: 3, role: "position" });
            b.setNodeValue(pos, 0, [10, 20, 0]);
            b.setNodeValue(pos, 1, [-5, 0, 0]);
            b.setMeta({ name: "My net-work" });
        });

    it("lays out the version marker, the network, the tables and the view under one root folder", async () => {
        const bytes = await sessionOf(graph());
        const names = readZipDirectory(bytes).map((e) => e.name);
        expect(names[0]).toBe("CytoscapeSession/3.0.0.version");
        expect(names.every((n) => n.startsWith("CytoscapeSession/"))).toBe(true);
        // Cytoscape's entry patterns (Cy3SessionReaderImpl), with the root folder's ".*/"
        const network = names.filter((n) => /^.*\/networks\/(([^/]+)[.]xgmml)$/.test(n));
        const views = names.filter((n) => /^.*\/views\/(([^/]+)[.]xgmml)$/.test(n));
        const tables = names
            .map((n) => /^.*\/tables\/(([^/]+)\/([^/]+)-([^/]+)-([^/]+)[.]cytable)$/.exec(n))
            .filter((m) => m !== null);
        expect(network).toEqual(["CytoscapeSession/networks/6-My+net%2Dwork.xgmml"]);
        expect(views).toHaveLength(1);
        expect(/views\/(\d+)-(\d+)(-(.+))?\.xgmml$/.exec(views[0])?.[1]).toBe("7");
        expect(tables.map((m) => [m[3], m[4]])).toEqual([
            ["LOCAL_ATTRS", "org.cytoscape.model.CyNode"],
            ["LOCAL_ATTRS", "org.cytoscape.model.CyEdge"],
            ["LOCAL_ATTRS", "org.cytoscape.model.CyNetwork"],
            ["LOCAL_ATTRS", "org.cytoscape.model.CyNetwork"],
        ]);
        // NETWORK_NAME_PATTERN: the folder starts with the network's SUID
        expect(tables.map((m) => /^(\d+)(-(.+))?$/.exec(m[2])?.[1])).toEqual(["7", "7", "7", "6"]);
    });

    it("writes stored entries with their CRC and sizes in the local header, no data descriptor", async () => {
        const bytes = await sessionOf(graph());
        const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
        for (const e of readZipDirectory(bytes)) {
            const at = e.localOffset;
            expect(view.getUint32(at, true)).toBe(0x04034b50);
            const flags = view.getUint16(at + 6, true);
            expect(flags & 0x0008).toBe(0);
            expect(flags & 0x0800).toBe(0x0800);
            expect(view.getUint16(at + 8, true)).toBe(0);
            expect(view.getUint32(at + 14, true)).toBe(e.crc32);
            expect(view.getUint32(at + 18, true)).toBe(e.size);
            expect(view.getUint32(at + 22, true)).toBe(e.size);
        }
        // the same bytes for the same snapshot
        expect(await sessionOf(graph())).toEqual(bytes);
    });

    it("passes Python's zipfile check", async () => {
        const python = spawnSync("python3", ["-c", "import zipfile"]);
        if (python.status !== 0) {
            return;
        }
        const dir = mkdtempSync(join(tmpdir(), "cys-"));
        const path = join(dir, "out.cys");
        writeFileSync(path, await sessionOf(graph()));
        const run = spawnSync("python3", [
            "-c",
            "import sys, zipfile; z = zipfile.ZipFile(sys.argv[1]); print(z.testzip()); print(len(z.namelist()))",
            path,
        ]);
        expect(run.stdout.toString().trim().split("\n")).toEqual(["None", "7"]);
    });

    it("writes the network without attributes, edges with cy:directed, and SUIDs above the kept ids", async () => {
        const files = await entriesOf(await sessionOf(graph()));
        const network = entry(files, /networks\//);
        expect(network).toContain('<graph id="6" label="My net-work" directed="1"');
        expect(network).toContain('cy:registered="0" cy:documentVersion="3.0"');
        expect(network).toContain('<graph id="7" label="My net-work" cy:registered="1">');
        expect(network).toContain('<node id="1"/>');
        expect(network).toContain('<edge id="4" source="1" target="2" cy:directed="1"/>');
        expect(network).not.toContain("<att name");
    });

    it("writes CyCSV tables keyed by SUID, the label as name", async () => {
        const files = await entriesOf(await sessionOf(graph()));
        expect(entry(files, /CyNode-/).split("\n")).toEqual([
            "CyCSV-Version,1",
            "SUID,name",
            "java.lang.Long,java.lang.String",
            '"",mutable',
            'My net-work default node,""',
            "1,A",
            "2,B",
            "3,C",
            "",
        ]);
        expect(entry(files, /7-.*CyNetwork-/)).toContain("7,My net-work\n");
        expect(entry(files, /6-.*CyNetwork-/)).toContain("6,My net-work\n");
    });

    it("writes the view with y negated back to screen coordinates, and no view without positions", async () => {
        const files = await entriesOf(await sessionOf(graph()));
        const view = entry(files, /views\//);
        expect(view).toContain('cy:view="1" cy:networkId="7" cy:visualStyle="default"');
        expect(view).toContain('<node id="9" cy:nodeId="1">\n    <graphics x="10" y="-20"/>');
        expect(view).toContain('<graphics x="-5" y="0"/>');
        expect(view).not.toContain('cy:nodeId="3"');
        const plain = await entriesOf(await sessionOf(build(true, (b) => b.addNode("1"))));
        expect([...plain.keys()].some((n) => n.includes("/views/"))).toBe(false);
    });

    it("escapes names as Cytoscape's SessionUtil does", () => {
        expect(sessionEscape("a-b c")).toBe("a%2Db+c");
        expect(sessionEscape("x.y_z*")).toBe("x.y_z*");
        expect(sessionEscape("(it's)!~")).toBe("%28it%27s%29%21%7E");
        expect(sessionEscape(`${String.fromCharCode(0xe9)}/`)).toBe("%C3%A9%2F");
        expect(sessionEscape(String.fromCharCode(0xd800))).toBe("%EF%BF%BD");
    });
});

describe("cysExporter: round trips through graph-io's session importer", () => {
    it("reads back a typed graph exactly", async () => {
        const g = build(true, (b) => {
            b.addNodes(["10", "20", "30"]);
            b.addEdge("10", "20", 1.5);
            b.addEdge("20", "30", -0.25);
            b.addEdge("30", "30", 2);
            const node = (decl: ColumnDecl, values: unknown[]): void => {
                const h = b.declareNodeColumn(decl);
                values.forEach((v, i) => b.setNodeValue(h, i, v));
            };
            node({ name: "name", dtype: "string", role: "label" }, ["alpha", "beta", "gamma, delta"]);
            node({ name: "score", dtype: "f64" }, [0.5, Number.NaN, -0]);
            node({ name: "count", dtype: "i32" }, [1, -2, 2147483647]);
            node({ name: "big", dtype: "f64", origin: { format: "cx2", type: "long" } }, [2 ** 40, 1, 2]);
            node({ name: "ok", dtype: "bool" }, [true, false, true]);
            node({ name: "tags", dtype: "list", itemDtype: "string" }, [["a", "b"], ["c"], ['"q"']]);
            node({ name: "hits", dtype: "list", itemDtype: "f64" }, [[1.5, 2], [Infinity], [3]]);
            node({ name: "position", dtype: "f32", components: 3, role: "position" }, [
                [1, 2, 0],
                [3, 4, 0],
                [5, 6, 0],
            ]);
            node({ name: "z", dtype: "f64" }, [1, 2, 3]);
            const id = b.declareEdgeColumn({ name: "id", dtype: "string", role: "id" });
            ["100", "101", "102"].forEach((v, e) => b.setEdgeValue(id, e, v));
            const kind = b.declareEdgeColumn({ name: "interaction", dtype: "string" });
            ["pp", "pd", "pp"].forEach((v, e) => b.setEdgeValue(kind, e, v));
            b.setGraphValue("organism", "yeast", { dtype: "string" });
            b.setMeta({ name: "Net" });
        });
        const { back, notes, report } = await roundTrip(g);
        expect(codes(notes)).toEqual([]);
        expect(report.issues.filter((i) => i.severity === "error")).toEqual([]);
        expectSameSnapshot(g, back);
        expect(back.edges.get("id")?.meta.role).toBe("id");
        expect(back.meta.name).toBe("Net");
        expect(back.graph.get("organism")?.value(0)).toBe("yeast");
        expect(back.nodes.get("big")?.meta.origin?.type).toBe("long");
    });

    it("keeps mixed direction and an undirected graph", async () => {
        const graphml = `<graphml xmlns="http://graphml.graphdrawing.org/xmlns"><graph edgedefault="directed">
            <node id="1"/><node id="2"/><node id="3"/>
            <edge source="1" target="2"/><edge source="2" target="3" directed="false"/></graph></graphml>`;
        const mixed = (await importGraph(graphml, { format: "graphml" })).snapshot;
        const { back, notes } = await roundTrip(mixed, { sanitizeIds: "mangle" });
        expect(unexplained(compareSnapshots(mixed, back), notes)).toEqual([]);
        expect(back.directed).toBe(true);
        expect(back.edgeCount).toBe(3);
        const undirected = build(false, (b) => {
            b.addNodes(["1", "2"]);
            b.addEdge("1", "2");
        });
        const again = await roundTrip(undirected);
        expect(again.back.directed).toBe(false);
        expect(unexplained(compareSnapshots(undirected, again.back), again.notes)).toEqual([]);
    });

    it("restores mangled ids from graphty:originalId, or keeps the column when told not to", async () => {
        const g = build(true, (b) => {
            b.addNodes(["a", "", 7, "7.5", -3, "=x"]);
            b.addEdge("a", "");
            b.addEdge(-3, 7);
            const pos = b.declareNodeColumn({ name: "position", dtype: "f32", components: 3, role: "position" });
            b.setNodeValue(pos, 0, [1, 1, 0]);
        });
        expect(codes(cysExporter.check(g))).toContain("E_ID_CHARSET");
        await expect(sessionOf(g)).rejects.toMatchObject({ code: "E_INVALID_ID", details: { reason: "charset" } });
        const { back, notes } = await roundTrip(g, { sanitizeIds: "mangle" });
        expect(codes(notes)).toEqual(expect.arrayContaining([CYS_LOSS.ID_MANGLED, CYS_LOSS.ID_TEXT_TYPE]));
        expect(back.ids.toArray()).toEqual(["a", "", "7", "7.5", "-3", "=x"]);
        expect(back.nodes.get("graphty:originalId")).toBeNull();
        expect(cellOf(back, "nodes", "position", 0)).toEqual([1, 1, 0]);
        const kept = await roundTrip(g, { sanitizeIds: "mangle" }, { restoreMangledIds: false });
        expect(kept.back.ids.toArray()).toEqual(["8", "9", "7", "10", "11", "12"]);
        expect(cellOf(kept.back, "nodes", "graphty:originalId", 0)).toBe("a");
    });

    it("refuses two ids with one text", async () => {
        const g = build(true, (b) => b.addNodes([5, "5"]));
        expect(codes(cysExporter.check(g, { sanitizeIds: "mangle" }))).toContain(CYS_LOSS.ID_TEXT_COLLISION);
        await expect(sessionOf(g, { sanitizeIds: "mangle" })).rejects.toMatchObject({ code: "E_INVALID_ID" });
    });

    describe("corpus files", () => {
        const cases: [string, string, () => string | Uint8Array][] = [
            ...corpusFiles("cys")
                .filter((f) => f.path.includes("3x"))
                .map((f): [string, string, () => Uint8Array | string] => [
                    "cys",
                    f.path,
                    () => readCorpusInput("cys", f.path),
                ]),
            ...["session3x/simpleSession.cys", "session3x/visualMappings.cys", "tutorials/galFiltered.cys"].map(
                (p): [string, string, () => Uint8Array] => [
                    "cys",
                    p,
                    () => new Uint8Array(readFileSync(join(FIXTURES, p))),
                ],
            ),
            ...corpusFiles("gml").map((f): [string, string, () => string] => [
                "gml",
                f.path,
                () => readCorpusInput("gml", f.path) as string,
            ]),
            ...corpusFiles("graphml").map((f): [string, string, () => string] => [
                "graphml",
                f.path,
                () => readCorpusInput("graphml", f.path) as string,
            ]),
        ];
        for (const [format, path, input] of cases) {
            it(`${format}/${path}: every difference is announced by check()`, async () => {
                const first = (await importGraph(input(), { format })).snapshot;
                const { back, notes, report } = await roundTrip(first, { sanitizeIds: "mangle" });
                const diffs = unexplained(compareSnapshots(first, back, { limit: 1000 }), notes);
                expect(diffs.map((d) => d.message)).toEqual([]);
                expect(report.issues.filter((i) => i.severity === "error")).toEqual([]);
                expect(back.nodeCount).toBe(first.nodeCount);
                expect(back.edgeCount).toBe(first.edgeCount);
            });
        }

        it("a session read back from its own export is the same snapshot (karate)", async () => {
            const first = (await importGraph(readCorpusInput("cys", "karate-3x.cys"), { format: "cys" })).snapshot;
            const { back } = await roundTrip(first);
            expectSameSnapshot(first, back, { ignoreColumns: ["graphics"] });
        });
    });
});

describe("cysExporter: every loss check() announces happens", () => {
    it("unset text cells read back empty", async () => {
        const g = withNodeColumn({ name: "note", dtype: "string" }, ["x", undefined]);
        const { back, notes } = await roundTrip(g);
        expect(notes.find((n) => n.code === CYS_LOSS.UNSET_AS_EMPTY_STRING)?.count).toBe(1);
        expect(cellOf(back, "nodes", "note", 1)).toBe("");
    });

    it("list cells CyCSV cannot hold change", async () => {
        const g = build(true, (b) => {
            b.addNodes(["1", "2", "3", "4", "5"]);
            const text = b.declareNodeColumn({ name: "text", dtype: "list", itemDtype: "string" });
            const nums = b.declareNodeColumn({ name: "nums", dtype: "list", itemDtype: "i32" });
            b.setNodeValue(text, 0, []);
            b.setNodeValue(text, 1, ["a", ""]);
            b.setNodeValue(text, 2, ["a\nb"]);
            b.setNodeValue(text, 3, ["ok"]);
            b.setNodeValue(nums, 0, []);
            b.setNodeValue(nums, 1, [1, 2]);
        });
        const { back, notes } = await roundTrip(g);
        const listNotes = notes.filter((n) => n.code === CYS_LOSS.LIST_ITEMS);
        expect(listNotes.map((n) => [n.column, n.count])).toEqual([
            ["text", 4],
            ["nums", 1],
        ]);
        expect([0, 1, 2, 3, 4].map((r) => cellOf(back, "nodes", "text", r))).toEqual([
            [""],
            ["a"],
            ["a", "b"],
            ["ok"],
            [""],
        ]);
        expect(cellOf(back, "nodes", "nums", 0)).toBeUndefined();
        expect(cellOf(back, "nodes", "nums", 1)).toEqual([1, 2]);
    });

    it("text starting with = is a Cytoscape formula and reads back as text", async () => {
        const g = withNodeColumn({ name: "f", dtype: "string" }, ["=1+2", "plain"]);
        const { back, notes, report } = await roundTrip(g);
        expect(notes.find((n) => n.code === CYS_LOSS.TEXT_AS_EQUATION)?.count).toBe(1);
        expect(cellOf(back, "nodes", "f", 0)).toBe("=1+2");
        expect(report.issues.map((i) => i.code)).toContain("W_EQUATION_AS_TEXT");
    });

    it("nested values are written as JSON text", async () => {
        const g = withNodeColumn({ name: "j", dtype: "json" }, [{ a: [1, 2] }, null]);
        const { back, notes } = await roundTrip(g);
        expect(codes(notes)).toContain(CYS_LOSS.JSON_AS_STRING);
        expect(codes(notes)).not.toContain("W_JSON_UNSUPPORTED");
        expect(cellOf(back, "nodes", "j", 0)).toBe('{"a":[1,2]}');
    });

    it("positions of another shape, non-finite or with a z", async () => {
        const g = build(true, (b) => {
            b.addNodes(["1", "2", "3"]);
            const pos = b.declareNodeColumn({ name: "xy", dtype: "f64", components: 3, role: "position" });
            b.setNodeValue(pos, 0, [1, 2, 5]);
            b.setNodeValue(pos, 1, [Number.NaN, 2, 0]);
            b.setNodeValue(pos, 2, [3, 4, 0]);
        });
        const { back, notes } = await roundTrip(g);
        expect(notes.filter((n) => n.code === CYS_LOSS.POSITION).map((n) => n.count)).toEqual([1, 1]);
        expect(codes(notes)).toEqual(
            expect.arrayContaining([CYS_LOSS.COLUMN_NAME_CHANGED, CYS_LOSS.DTYPE_UNSUPPORTED]),
        );
        expect(cellOf(back, "nodes", "position", 0)).toEqual([1, 2, 0]);
        expect(cellOf(back, "nodes", "position", 1)).toBeUndefined();
        expect(cellOf(back, "nodes", "z", 0)).toBe(5);
        const flat = build(true, (b) => {
            b.addNode("1");
            const pos = b.declareNodeColumn({ name: "position", dtype: "f32", components: 2, role: "position" });
            b.setNodeValue(pos, 0, [1, 2]);
        });
        const two = await roundTrip(flat);
        expect(two.notes.find((n) => n.code === CYS_LOSS.POSITION)?.message).toContain("reads back with 3");
        expect(cellOf(two.back, "nodes", "position", 0)).toEqual([1, 2, 0]);
    });

    it("renames columns Cytoscape would refuse or merge", async () => {
        const g = build(true, (b) => {
            b.addNodes(["1"]);
            for (const [name, dtype] of [
                ["Score", "f64"],
                ["score", "f64"],
                ["SUID", "string"],
                ["name", "i32"],
                ["selected", "string"],
                ["parent", "string"],
            ] as const) {
                const h = b.declareNodeColumn({ name, dtype });
                b.setNodeValue(h, 0, dtype === "string" ? "x" : 1);
            }
        });
        const { back, notes } = await roundTrip(g);
        const renamed = notes.filter((n) => n.code === CYS_LOSS.COLUMN_NAME_CHANGED).map((n) => n.column);
        expect(renamed).toEqual(["score", "SUID", "name", "selected", "parent"]);
        for (const name of ["Score", "score#2", "SUID#2", "name#2", "selected#2"]) {
            expect(back.nodes.get(name), name).not.toBeNull();
        }
        expect(back.nodes.get("parent")).toBeNull();
    });

    it("a plain name column becomes the label; a label of another dtype reads back as text", async () => {
        const named = withNodeColumn({ name: "name", dtype: "string" }, ["a", "b"]);
        const one = await roundTrip(named);
        expect(codes(one.notes)).toEqual([CYS_LOSS.ROLE_ASSUMED]);
        expect(one.back.nodes.get("name")?.meta.role).toBe("label");
        const numeric = withNodeColumn({ name: "label", dtype: "i32", role: "label" }, [1, 2]);
        const two = await roundTrip(numeric);
        expect(codes(two.notes)).toEqual(
            expect.arrayContaining([CYS_LOSS.DTYPE_UNSUPPORTED, CYS_LOSS.COLUMN_NAME_CHANGED]),
        );
        expect(cellOf(two.back, "nodes", "name", 1)).toBe("2");
    });

    it("numeric ids read back as text; edge ids are generated", async () => {
        const g = build(true, (b) => {
            b.addNodes([1, 2]);
            b.addEdge(1, 2);
        });
        const { back, notes } = await roundTrip(g);
        expect(codes(notes)).toEqual([CYS_LOSS.EDGE_IDS_GENERATED, CYS_LOSS.ID_TEXT_TYPE]);
        expect(back.ids.toArray()).toEqual(["1", "2"]);
        expect(cellOf(back, "edges", "id", 0)).toBe("3");
        const ids = build(true, (b) => {
            b.addNodes(["1", "2"]);
            b.addEdge("1", "2");
            b.addEdge("1", "2");
            const id = b.declareEdgeColumn({ name: "key", dtype: "f64", role: "id" });
            b.setEdgeValue(id, 0, 1);
            b.setEdgeValue(id, 1, 40);
        });
        const again = await roundTrip(ids);
        expect(again.notes.map((n) => [n.code, n.count])).toEqual(
            expect.arrayContaining([
                [CYS_LOSS.EDGE_IDS_GENERATED, 1],
                [CYS_LOSS.DTYPE_UNSUPPORTED, 2],
                [CYS_LOSS.COLUMN_NAME_CHANGED, 2],
            ]),
        );
        expect([0, 1].map((e) => cellOf(again.back, "edges", "id", e))).toEqual(["41", "40"]);
    });

    it("dtypes Cytoscape widens, empty columns and the string / dict heuristic", async () => {
        const g = build(true, (b) => {
            b.addNodes(["1", "2", "3"]);
            const f = b.declareNodeColumn({ name: "f", dtype: "f32" });
            b.setNodeValue(f, 0, 0.5);
            const u = b.declareNodeColumn({ name: "u", dtype: "u32" });
            b.setNodeValue(u, 0, 4000000000);
            b.declareNodeColumn({ name: "empty", dtype: "i32" });
            const d = b.declareNodeColumn({ name: "d", dtype: "dict" });
            ["x", "y", "z"].forEach((v, i) => b.setNodeValue(d, i, v));
        });
        const { back, notes } = await roundTrip(g);
        const byColumn = new Map(notes.map((n) => [n.column, n.code]));
        expect(byColumn.get("f")).toBe(CYS_LOSS.DTYPE_UNSUPPORTED);
        expect(byColumn.get("u")).toBe(CYS_LOSS.DTYPE_UNSUPPORTED);
        expect(byColumn.get("empty")).toBe(CYS_LOSS.EMPTY_COLUMN_DROPPED);
        expect(byColumn.get("d")).toBe(CYS_LOSS.STORAGE_CLASS_CHANGED);
        expect(back.nodes.get("f")?.dtype).toBe("f64");
        expect(cellOf(back, "nodes", "u", 0)).toBe(4000000000);
        expect(back.nodes.get("empty")).toBeNull();
        expect(back.nodes.get("d")?.dtype).toBe("string");
    });

    it("a plain weight column reads back as the weight; explicit weights are written", async () => {
        const g = build(true, (b) => {
            b.addNodes(["1", "2"]);
            b.addEdge("1", "2");
            const w = b.declareEdgeColumn({ name: "weight", dtype: "f64" });
            b.setEdgeValue(w, 0, 3);
        });
        const { back, notes } = await roundTrip(g);
        expect(codes(notes)).toContain(CYS_LOSS.WEIGHT_KEY_CLASH);
        expect(back.flags.weighted).toBe(true);
        expect(back.edgeList().weights?.[0]).toBe(3);
    });

    it("containment, time and extension tables are not written", async () => {
        const g = build(true, (b) => {
            b.addNodes(["1", "2"]);
            const parent = b.declareNodeColumn({ name: "parent", dtype: "string", role: "parent" });
            b.setNodeValue(parent, 1, "1");
            const start = b.declareNodeColumn({ name: "start", dtype: "f64", role: "start" });
            b.setNodeValue(start, 0, 1);
            const t = b.addExtensionTable("notes", [{ name: "text", dtype: "string" }]);
            b.addExtensionRow(t, ["x"]);
        });
        const { back, notes } = await roundTrip(g);
        expect(codes(notes)).toEqual(
            expect.arrayContaining([
                CYS_LOSS.HIERARCHY_DROPPED,
                CYS_LOSS.TEMPORAL_DROPPED,
                CYS_LOSS.EXTENSION_TABLE_DROPPED,
            ]),
        );
        expect(back.nodes.get("parent")).toBeNull();
        expect(back.nodes.get("start")).toBeNull();
        expect(back.extensions.size).toBe(0);
    });
});

describe("writeZip", () => {
    it("writes what the zip reader reads, entry by entry", async () => {
        const data = new TextEncoder().encode("hello");
        const bytes = new Uint8Array(
            [
                ...writeZip([
                    { name: "a/b.txt", data },
                    { name: "a/empty", data: new Uint8Array(0) },
                ]),
            ].flatMap((c) => [...c]),
        );
        const entries = readZipDirectory(bytes);
        expect(entries.map((e) => [e.name, e.method, e.size])).toEqual([
            ["a/b.txt", 0, 5],
            ["a/empty", 0, 0],
        ]);
        expect(await readZipEntry(bytes, entries[0], { maxBytes: 100, maxRatio: 10 })).toEqual(data);
    });

    it("refuses an archive that needs zip64", () => {
        const many = function* (): Generator<{ name: string; data: Uint8Array }> {
            for (let i = 0; i < 70000; i++) {
                yield { name: String(i), data: new Uint8Array(0) };
            }
        };
        expect(() => [...writeZip(many())]).toThrow(/zip64/);
    });
});
