import { GraphBuilder, type GraphSnapshot } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import { checkExport, exportGraphToBytes, importGraph } from "../src/registry.js";
import { type FormatName, GRAPH_FORMATS } from "../src/sniff.js";

/**
 * A graph whose nodes and edges both carry a label-role column of the given name.
 * @param name - the label columns' name
 * @returns the snapshot
 */
function labelled(name: string): GraphSnapshot {
    const b = new GraphBuilder({ directed: true, weightDtype: "f64" });
    b.declareNodeColumn({ name, dtype: "string", role: "label" });
    b.declareEdgeColumn({ name, dtype: "string", role: "label" });
    b.addNode(1);
    b.addNode(2);
    b.addEdge(1, 2);
    b.setNodeValue(name, 0, "A");
    b.setNodeValue(name, 1, "B");
    b.setEdgeValue(name, 0, "ab1");
    return b.freeze();
}

// Every W_COLUMN_NAME_CHANGED note check() makes must name a column that really is renamed when the
// export is read back by the same format's importer (issue #962: CX2 reported the edge label).
describe("W_COLUMN_NAME_CHANGED names only columns that are renamed on re-import", () => {
    for (const format of GRAPH_FORMATS as readonly FormatName[]) {
        for (const name of ["label", "title"]) {
            it(`${format}, label columns named "${name}"`, async () => {
                const snapshot = labelled(name);
                const notes = checkExport(snapshot, format).filter((n) => n.code === "W_COLUMN_NAME_CHANGED");
                const back = (await importGraph(await exportGraphToBytes(snapshot, format), { format })).snapshot;
                for (const note of notes) {
                    const table = note.message.startsWith("edge column") ? back.edges : back.nodes;
                    const column = note.column ?? "";
                    expect(table.has(column), `${format}: ${note.message}`).toBe(false);
                    // and the name the note promises is there, holding the column's values
                    const promised = /reads back as "([^"]+)"$/.exec(note.message)?.[1] ?? "";
                    expect(table.get(promised)?.value(0), `${format}: ${note.message}`).toBe(
                        table === back.edges ? "ab1" : "A",
                    );
                }
            });
        }
    }
});

describe("CX2 label rename note (issue #962)", () => {
    it("reports the node label as read back as name, and the edge label as keeping its name but not its role", async () => {
        for (const name of ["label", "name"]) {
            const snapshot = labelled(name);
            const notes = checkExport(snapshot, "cx2");
            expect(notes.filter((n) => n.code === "W_COLUMN_NAME_CHANGED").map((n) => n.message)).toEqual(
                name === "name"
                    ? []
                    : [
                          'node column "label" (the labels) is written as the format\'s own label and reads back as "name"',
                      ],
            );
            expect(notes.filter((n) => n.code === "W_ROLE_DROPPED").map((n) => n.column)).toEqual([name]);
            const back = (await importGraph(await exportGraphToBytes(snapshot, "cx2"), { format: "cx2" })).snapshot;
            expect(back.nodes.require("name").value(0)).toBe("A");
            const edge = back.edges.require(name);
            expect(edge.value(0)).toBe("ab1");
            expect(edge.meta.role).toBe(null);
        }
    });
});

describe("GML and DOT label columns not named label (issue #1360)", () => {
    for (const format of ["gml", "dot"] as const) {
        it(`${format} writes the label role under label, where its importer gives it the role back`, async () => {
            const snapshot = labelled("title");
            const notes = checkExport(snapshot, format);
            expect(notes.filter((n) => n.code === "W_COLUMN_NAME_CHANGED").map((n) => n.column)).toEqual([
                "title",
                "title",
            ]);
            expect(notes.filter((n) => n.code === "W_ROLE_DROPPED")).toEqual([]);
            const back = (await importGraph(await exportGraphToBytes(snapshot, format), { format })).snapshot;
            for (const [table, first] of [
                [back.nodes, "A"],
                [back.edges, "ab1"],
            ] as const) {
                const label = table.require("label");
                expect(label.meta.role).toBe("label");
                expect(label.value(0)).toBe(first);
                expect(table.has("title")).toBe(false);
            }
        });
    }

    it("DOT does not write a plain label column beside a label role named otherwise", async () => {
        const b = new GraphBuilder({ directed: true });
        b.declareNodeColumn({ name: "title", dtype: "string", role: "label" });
        b.declareNodeColumn({ name: "label", dtype: "string" });
        b.addNode(1);
        b.setNodeValue("title", 0, "A");
        b.setNodeValue("label", 0, "plain");
        const snapshot = b.freeze();
        const notes = checkExport(snapshot, "dot");
        expect(notes.filter((n) => n.code === "W_DOT_ATTRIBUTE_CLASH").map((n) => n.column)).toEqual(["label"]);
        expect(notes.filter((n) => n.code === "W_ROLE_ASSUMED")).toEqual([]);
        const back = (await importGraph(await exportGraphToBytes(snapshot, "dot"), { format: "dot" })).snapshot;
        expect(back.nodes.require("label").value(0)).toBe("A");
    });

    it("GML gives the label key to the label role and mangles a plain label column beside it", async () => {
        const b = new GraphBuilder({ directed: true });
        b.declareNodeColumn({ name: "label", dtype: "string" });
        b.declareNodeColumn({ name: "title", dtype: "string", role: "label" });
        b.addNode(1);
        b.setNodeValue("title", 0, "A");
        b.setNodeValue("label", 0, "plain");
        const snapshot = b.freeze();
        expect(
            checkExport(snapshot, "gml")
                .filter((n) => n.code === "E_GML_RESERVED_KEY")
                .map((n) => n.column),
        ).toEqual(["label"]);
        const options = { sanitizeKeys: "mangle" } as const;
        const back = (await importGraph(await exportGraphToBytes(snapshot, "gml", options), { format: "gml" }))
            .snapshot;
        expect(back.nodes.require("label").value(0)).toBe("A");
        expect(back.nodes.require("label").meta.role).toBe("label");
        expect(back.nodes.require("label_2").value(0)).toBe("plain");
    });
});

describe("OBO edge label notes (issue #1396)", () => {
    it("reports the edge label as a qualifier without a slot, never as renamed; the node label reads back as name", async () => {
        const snapshot = labelled("title");
        const notes = checkExport(snapshot, "obo");
        const of = (code: string): string[] => notes.filter((n) => n.code === code).map((n) => n.message);
        expect(of("W_COLUMN_NAME_CHANGED")).toEqual([
            'node column "title" (the labels) is written as the format\'s own label and reads back as "name"',
        ]);
        expect(of("W_ROLE_DROPPED")).toEqual([
            'edge column "title" (label) is written as a qualifier; the format has no edge label slot',
        ]);
        expect(of("W_OBO_EDGE_COLUMN_AS_QUALIFIER")).toEqual([
            'edge column "title" is written as the qualifier title and reads back inside the qualifiers column',
        ]);
        const back = (await importGraph(await exportGraphToBytes(snapshot, "obo"), { format: "obo" })).snapshot;
        expect(back.nodes.require("name").value(0)).toBe("A");
        expect(back.edges.has("name")).toBe(false);
        expect(back.edges.has("qualifiers")).toBe(true);
    });
});
