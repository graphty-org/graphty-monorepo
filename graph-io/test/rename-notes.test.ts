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
            // GML and DOT write a label column not named "label" under its own name, yet report it
            // as reading back as "label": expected failures until those notes are fixed
            const known = name === "title" && (format === "gml" || format === "dot");
            (known ? it.fails : it)(`${format}, label columns named "${name}"`, async () => {
                const snapshot = labelled(name);
                const notes = checkExport(snapshot, format).filter((n) => n.code === "W_COLUMN_NAME_CHANGED");
                const back = (await importGraph(await exportGraphToBytes(snapshot, format), { format })).snapshot;
                for (const note of notes) {
                    const table = note.message.startsWith("edge column") ? back.edges : back.nodes;
                    const column = note.column ?? "";
                    expect(table.has(column), `${format}: ${note.message}`).toBe(false);
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
