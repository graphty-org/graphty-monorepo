/**
 * Library behavior that readers of the guide tripped over: each case is something a reader expected from the
 * documentation and the library did not do.
 */

import { GraphBuilder, INVALID_INDEX as FORMAT_INVALID_INDEX } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import { compareSnapshots, describeDiffs } from "../src/common/compare.js";
import { capabilities, checkCapabilities } from "../src/common/export.js";
import { defineLineFormat } from "../src/common/line-format.js";
import { FORMAT_DIALECTS, resolveExportOptions } from "../src/common/options.js";
import { edgeWeights } from "../src/common/weights.js";
import { csvImporter } from "../src/formats/csv/index.js";
import { DOT_ISSUE, dotImporter } from "../src/formats/dot/index.js";
import { GML_ISSUE, gmlImporter } from "../src/formats/gml/index.js";
import { JSON_DIALECTS } from "../src/formats/json/index.js";
import { NEO4J_ISSUE } from "../src/formats/neo4j/index.js";
import { PAJEK_ISSUE, pajekImporter } from "../src/formats/pajek/index.js";
import { INVALID_INDEX } from "../src/index.js";
import { checkExport, createRegistry, exportGraphToString, importGraph, loadFromFile } from "../src/registry.js";
import { rankFormats } from "../src/sniff.js";
import { ImportError } from "../src/types.js";

/**
 * The ImportError an import rejects with.
 * @param p - the import
 * @returns the error
 */
async function rejection(p: Promise<unknown>): Promise<ImportError> {
    const err: unknown = await p.then(
        () => null,
        (e: unknown) => e,
    );
    expect(err).toBeInstanceOf(ImportError);
    return err as ImportError;
}

describe("CSV", () => {
    it("takes the node table as a Blob, as a browser's second picked file is", async () => {
        const edges = new Blob(["source,target\na,b\n"]);
        const nodes = new Blob(["id,label\na,Alice\nb,Bob\nc,Carol\n"]);
        const { snapshot } = await loadFromFile(edges, { format: "csv", nodes });
        expect(snapshot.nodeCount).toBe(3);
        expect(snapshot.nodes.byRole("label")?.value(2)).toBe("Carol");
    });

    it("names the adjacency table in the node-table note of an adjacency save", async () => {
        const { snapshot } = await importGraph("id,label\na,A\n", { format: "csv", table: "nodes" });
        const notes = checkExport(snapshot, "csv", { table: "adjacency" });
        const note = notes.find((n) => n.code === "W_CSV_NODE_TABLE");
        expect(note?.message).toMatch(/^the adjacency table has no room/);
    });

    it("suggests table: adjacency once, for the first row longer than the header", async () => {
        const { report } = await importGraph("a,b\nb,c,d,e\nc,a,b,d\nd,e\n", { format: "csv", errorLimit: Infinity });
        const messages = report.issues.filter((i) => i.code === "E_CSV_FIELD_COUNT").map((i) => i.message);
        expect(messages).toEqual([
            '4 fields, expected 2; if each line is a node followed by its neighbors, pass table: "adjacency"',
            "4 fields, expected 2",
        ]);
    });
});

describe("typed values", () => {
    it("says 'an integer', and every typed format lists E_COLUMN_TYPE", async () => {
        const { report } = await importGraph("id:ID,age:int\na,xx\nb,3\n", { format: "neo4j" });
        expect(report.issues.map((i) => [i.code, i.message])).toEqual([["E_COLUMN_TYPE", '"xx" is not an integer']]);
        expect(NEO4J_ISSUE.COLUMN_TYPE).toBe("E_COLUMN_TYPE");
    });
});

describe("GML", () => {
    it("keeps every digit of a large integer under long: string", async () => {
        const { snapshot, report } = await importGraph("graph [ node [ id 1 big 9007199254740993 ] ]", {
            format: "gml",
            long: "string",
        });
        expect(report.issues).toEqual([]);
        expect(snapshot.nodes.value("big", 0)).toBe("9007199254740993");
    });

    it("keeps the graph's name in meta.name, and graphName picks a graph by it", async () => {
        const text = 'graph [ name "one" node [ id 1 ] ] graph [ name "two" node [ id 2 ] node [ id 3 ] ]';
        const { snapshot } = await importGraph(text, { format: "gml", graphName: "two" });
        expect(snapshot.meta.name).toBe("two");
        expect(snapshot.nodeCount).toBe(2);
        expect(GML_ISSUE.GRAPH_NOT_FOUND).toBe("E_GRAPH_NOT_FOUND");
    });
});

describe("choosing a graph", () => {
    it("lists the file's graphs when the choice names none", async () => {
        const err = await rejection(importGraph("digraph a { x } digraph b { y }", { format: "dot", graphName: "c" }));
        expect(err.issue?.code).toBe("E_GRAPH_NOT_FOUND");
        expect(err.message).toContain('the file holds 0 "a", 1 "b"');
        const past = await rejection(importGraph("digraph { x }", { format: "dot", graphIndex: 3 }));
        expect(past.message).toContain("the file holds 0 (unnamed)");
        expect([DOT_ISSUE.GRAPH_NOT_FOUND, PAJEK_ISSUE.AMBIGUOUS_GRAPH_NAME]).toEqual([
            "E_GRAPH_NOT_FOUND",
            "E_AMBIGUOUS_GRAPH_NAME",
        ]);
    });
});

describe("W_OPTION_IGNORED", () => {
    it("is not reported for an option set to the default every format shares", async () => {
        const { report } = await importGraph("source,target\na,b\n", {
            format: "csv",
            restoreMangledIds: true,
            nodeIdFrom: "id",
            long: "f64",
            hyperedges: "skip",
        });
        expect(report.issues).toEqual([]);
        const other = await importGraph("source,target\na,b\n", { format: "csv", long: "string" });
        expect(other.report.issues.map((i) => i.code)).toEqual(["W_OPTION_IGNORED"]);
    });
});

describe("plugin helpers", () => {
    it("checkCapabilities() leaves out a column the format writes by name", async () => {
        const { snapshot } = await importGraph("source,target,rel,note\na,b,knows,x\n", { format: "csv" });
        const caps = capabilities({ multiEdges: true, idCharset: "any", dtypes: ["string"] });
        const notes = checkCapabilities(snapshot, caps, resolveExportOptions(undefined), {
            attributes: false,
            weights: false,
            writtenColumns: { edge: ["rel"] },
        });
        expect(notes.filter((n) => n.code === "W_COLUMN_DROPPED").map((n) => n.column)).toEqual(["note"]);
    });

    it("exports INVALID_INDEX, the value lastMirror holds when there is no second edge", () => {
        expect(INVALID_INDEX).toBe(FORMAT_INVALID_INDEX);
    });
});

describe("Pajek", () => {
    it("writes no *Network line when networkHeader is false, even with a name", async () => {
        const { snapshot } = await importGraph("source,target\na,b\n", { format: "csv" });
        const text = await exportGraphToString(snapshot, "pajek", { networkHeader: false, name: "got" });
        expect(text.startsWith("*Vertices")).toBe(true);
    });
});

describe("format detection of text that is not a graph", () => {
    it("refuses prose and a single line rather than reading them as a CSV edge list", async () => {
        for (const text of [
            "Dear team, the meeting is on Monday.",
            "hello world",
            "hello world foo",
            "Hello, world. Thanks, Bob",
            "Thanks, see you there.\nBest, Bob.\n",
        ]) {
            const err = await rejection(importGraph(text));
            expect(err.issue?.code, text).toBe("E_UNKNOWN_FORMAT");
        }
        // two lines of ids still read as an edge list, and a named format reads anything
        expect((await importGraph("a b\nb c\n")).format).toBe("csv");
        expect((await importGraph("hello world", { format: "csv" })).snapshot.edgeCount).toBe(1);
    });

    it("does not read text/plain as CSV when the CSV sniffer rejects the content", async () => {
        const err = await rejection(
            loadFromFile(new Blob(["Dear team, the meeting is on Monday."], { type: "text/plain" }), {
                filename: "notes.txt",
            }),
        );
        expect(err.issue?.code).toBe("E_UNKNOWN_FORMAT");
    });

    it("lets another format's extension beat a space-split line that names an id", () => {
        const head = new TextEncoder().encode("1 First node\n2 Second node\n#\n1 2 Edge label\n");
        const ranked = rankFormats({ head, filename: "a.tgf" }, [
            csvImporter,
            { format: "tgf", extensions: [".tgf"], mimeTypes: [], import: csvImporter.import },
        ]);
        expect(ranked[0].format).toBe("tgf");
    });

    it("says an empty input is empty, with or without a format", async () => {
        expect((await rejection(importGraph(""))).issue?.code).toBe("E_EMPTY_INPUT");
        expect((await rejection(importGraph("  \n"))).issue?.code).toBe("E_EMPTY_INPUT");
        expect((await rejection(importGraph("", { format: "csv" }))).issue?.code).toBe("E_EMPTY_INPUT");
    });
});

describe("the load result and report", () => {
    it("keeps the per-edge freeze report out of console.log and spreads", async () => {
        const result = await importGraph("graph { a -- b }");
        expect(Object.keys(result)).toEqual(["format", "sniff", "snapshot", "report"]);
        expect(result.freeze.mergedEdges).toBe(0);
    });

    it("does not echo an encoding name the caller did not type", async () => {
        const { report } = await importGraph("a,b\nb,c\n", { format: "csv", encoding: "latin1" });
        expect(report.issues.map((i) => i.message)).toEqual([
            "option encoding has no effect on text input, which is already decoded",
        ]);
    });

    it("records a missing JSON section as a warning, since nothing is skipped", async () => {
        const { report, snapshot } = await importGraph('{"nodes": [{"id": "a"}, {"id": "b"}]}', { format: "json" });
        expect(snapshot.nodeCount).toBe(2);
        expect(report.errorCount).toBe(0);
        expect(report.issues.map((i) => i.code)).toEqual(["W_MISSING_SECTION"]);
    });

    it("warns when weightFrom names an attribute no edge has", async () => {
        const gml = "graph [ node [ id 1 ] node [ id 2 ] edge [ source 1 target 2 value 3 ] ]";
        const shared = await importGraph(gml, { format: "gml", weightFrom: "weight" });
        expect(shared.report.issues.map((i) => i.code)).toEqual(["W_WEIGHT_NOT_FOUND"]);
        expect((await importGraph(gml, { format: "gml" })).report.issues).toEqual([]);
        // a format that does not read weightFrom says so once, not twice
        const obo = await importGraph("[Term]\nid: A\nis_a: B\n", { format: "obo", weightFrom: "weight" });
        const codes = obo.report.issues.map((i) => i.code);
        expect(codes).toContain("W_OPTION_IGNORED");
        expect(codes).not.toContain("W_WEIGHT_NOT_FOUND");
    });
});

describe("graph choice when an importer is called directly", () => {
    it("reads the graph graphIndex or graphName chooses in DOT, GML and Pajek", async () => {
        const dot = "digraph first { a -> b }\ndigraph second { x -> y; y -> z }";
        const builder = new GraphBuilder({ directed: true });
        await dotImporter.import(dot, builder, { graphName: "second" });
        expect(builder.freeze().edgeCount).toBe(2);

        const gml = 'graph [ name "one" node [ id 1 ] ]\ngraph [ name "two" node [ id 1 ] node [ id 2 ] ]';
        const g = new GraphBuilder({ directed: false });
        await gmlImporter.import(gml, g, { graphIndex: 1 });
        expect(g.freeze().nodeCount).toBe(2);

        const paj = "*Network one\n*Vertices 1\n1 a\n*Network two\n*Vertices 3\n1 a\n2 b\n3 c\n";
        const p = new GraphBuilder({ directed: false });
        await pajekImporter.import(new TextEncoder().encode(paj), p, { graphName: "two" });
        expect(p.freeze().nodeCount).toBe(3);

        const err = await rejection(dotImporter.import(dot, new GraphBuilder({ directed: true }), { graphIndex: 5 }));
        expect(err.issue?.code).toBe("E_GRAPH_NOT_FOUND");
    });
});

describe("GEXF 1.2 and the edge kind", () => {
    it("does not say a kind column is renamed when 1.2 drops it", async () => {
        const { snapshot } = await importGraph("[Term]\nid: A\nis_a: B\n\n[Term]\nid: B\n", { format: "obo" });
        const codes = checkExport(snapshot, "gexf", { version: "1.2" }).map((n) => n.code);
        expect(codes).toContain("W_GEXF_KIND_DROPPED");
        expect(codes).not.toContain("W_COLUMN_NAME_CHANGED");
    });
});

describe("defineLineFormat", () => {
    const tgfLike = defineLineFormat({
        format: "test-lines",
        extensions: [".test-lines"],
        parseLine(fields, graph) {
            if (fields.length === 2 && fields[0] === "node") {
                graph.node(fields[1], { label: fields[1].toUpperCase(), size: "3" });
            } else if (fields.length === 3) {
                graph.edge(fields[0], fields[1], { weight: fields[2] });
            } else if (fields.length === 2) {
                graph.edge(fields[0], fields[1]);
            } else {
                throw new Error("expected two or three fields");
            }
        },
    });
    const io = createRegistry().registerImporter(tgfLike);

    it("reads nodes, edges, labels, weights and attribute types, and counts what it read", async () => {
        const text = "# a comment\nnode a\na b 2.5\nb c\n\nx y z w\n";
        const { snapshot, report } = await io.importGraph(text, { filename: "g.test-lines" });
        expect(snapshot.directed).toBe(false);
        expect([snapshot.nodeCount, snapshot.edgeCount]).toEqual([3, 2]);
        expect(snapshot.nodes.byRole("label")?.value(0)).toBe("A");
        expect(snapshot.nodes.get("size")?.dtype).toBe("i32");
        expect(snapshot.edgeList().weights?.[0]).toBe(2.5);
        expect(report.counts).toMatchObject({ nodes: 3, edges: 2 });
        expect(report.issues.map((i) => `${i.code} ${i.line}: ${i.message}`)).toEqual([
            "E_BAD_LINE 6: expected two or three fields",
        ]);
        expect(io.sniffAll({ filename: "g.test-lines" })[0].format).toBe("test-lines");
    });

    it("takes the options every importer takes", async () => {
        const { snapshot, report } = await io.importGraph("1 2\n2 3\n", {
            format: "test-lines",
            defaultDirected: true,
            ids: "string",
            weightFrom: null,
            hyperedges: "star",
        });
        expect(snapshot.directed).toBe(true);
        expect(snapshot.ids.idOf(0)).toBe("1");
        expect(report.issues.map((i) => i.code)).toEqual(["W_OPTION_IGNORED"]);
    });
});

describe("compareSnapshots", () => {
    it("lists what a save in a format did not keep", async () => {
        const { snapshot } = await importGraph("source,target,weight\na,b,2\n", { format: "csv" });
        const readBack = (await importGraph(await exportGraphToString(snapshot, "dot"), { format: "dot" })).snapshot;
        expect(compareSnapshots(snapshot, readBack)).toEqual([]);
        const pajek = (await importGraph(await exportGraphToString(snapshot, "pajek"), { format: "pajek" })).snapshot;
        expect(describeDiffs(compareSnapshots(snapshot, pajek))).toMatch(/ids\[0\]/);
    });
});

describe("misspelled options", () => {
    it("are reported by a load and by checkExport(), and options of other formats are not", async () => {
        const { report } = await importGraph("a;b\nb;c\n", { format: "csv", delimeter: ";", indent: 2 });
        expect(report.issues.map((i) => `${i.code} ${i.element}`)).toEqual(["W_UNKNOWN_OPTION delimeter"]);
        const { snapshot } = await importGraph("graph { a -- b }");
        const notes = checkExport(snapshot, "gml", { sanitizeIDs: "mangle", filename: "x.gml", weightFrom: "w" });
        expect(notes.filter((n) => n.code === "W_UNKNOWN_OPTION").map((n) => n.message)).toEqual([
            'option "sanitizeIDs" is not an option of any format or of the load and save functions, so it has no effect; check its spelling',
        ]);
    });

    it("are not reported while a registered format does not list its options", async () => {
        const io = createRegistry().registerImporter({ ...csvImporter, format: "plain-csv", options: undefined });
        const { report } = await io.importGraph("a,b\nb,c\n", { format: "csv", separator: ";" });
        expect(report.issues).toEqual([]);
    });
});

describe("one options object for several formats", () => {
    it("lets CSV and JSON ignore each other's dialect, and still refuses a misspelled one", async () => {
        const { snapshot } = await importGraph("source,target\na,b\n", { format: "csv" });
        const shared = { dialect: "d3", sanitizeIds: "mangle" } as const;
        expect(await exportGraphToString(snapshot, "csv", shared)).toBe(
            await exportGraphToString(snapshot, "csv", { sanitizeIds: "mangle" }),
        );
        expect(await exportGraphToString(snapshot, "json", { dialect: "generic" })).toBe(
            await exportGraphToString(snapshot, "json"),
        );
        expect(() => checkExport(snapshot, "csv", { dialect: "gephy" })).toThrow(/dialect/);
        expect(FORMAT_DIALECTS.json).toEqual(JSON_DIALECTS);
    });
});

describe("edgeWeights", () => {
    it("gives the exact weights in one call, and 1 for an edge without one", async () => {
        const { snapshot } = await importGraph("source,target,weight\na,b,0.1\nb,c,\nc,d,2\n", { format: "csv" });
        expect(Array.from(edgeWeights(snapshot) ?? [])).toEqual([0.1, 1, 2]);
        expect(edgeWeights((await importGraph("graph { a -- b }")).snapshot)).toBeNull();
        const f32 = await importGraph("source,target,weight\na,b,2\n", { format: "csv", weightDtype: "f32" });
        expect(Array.from(edgeWeights(f32.snapshot) ?? [])).toEqual([2]);
    });
});
