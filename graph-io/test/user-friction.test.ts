/**
 * Library behavior that readers of the guide tripped over: each case is something a reader expected from the
 * documentation and the library did not do.
 */

import { INVALID_INDEX as FORMAT_INVALID_INDEX } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import { capabilities, checkCapabilities } from "../src/common/export.js";
import { resolveExportOptions } from "../src/common/options.js";
import { DOT_ISSUE } from "../src/formats/dot/index.js";
import { GML_ISSUE } from "../src/formats/gml/index.js";
import { NEO4J_ISSUE } from "../src/formats/neo4j/index.js";
import { PAJEK_ISSUE } from "../src/formats/pajek/index.js";
import { INVALID_INDEX } from "../src/index.js";
import { checkExport, exportGraphToString, importGraph, loadFromFile } from "../src/registry.js";
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
