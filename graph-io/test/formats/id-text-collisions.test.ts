/**
 * Node ids with the same text (the number 1 and the string "1") in the exporters that write ids as text through
 * sanitizeIds(): refused under `sanitizeIds: "error"`, renamed under "mangle" so they read back as two nodes.
 */
import { fromRecords, type GraphSnapshot } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import { LOSS, sanitizeIds } from "../../src/common/export.js";
import { dotExporter } from "../../src/formats/dot/exporter.js";
import { dotImporter } from "../../src/formats/dot/importer.js";
import { gexfExporter } from "../../src/formats/gexf/exporter.js";
import { gexfImporter } from "../../src/formats/gexf/importer.js";
import { graphmlExporter } from "../../src/formats/graphml/exporter.js";
import { graphmlImporter } from "../../src/formats/graphml/importer.js";
import { xgmmlExporter } from "../../src/formats/xgmml/exporter.js";
import { xgmmlImporter } from "../../src/formats/xgmml/importer.js";
import { type GraphExporter, type GraphImporter } from "../../src/types.js";
import { roundTrip } from "../helpers/roundtrip.js";

/** Nodes 1, "1", 2 and an edge between the two that share their text. */
function colliding(): GraphSnapshot {
    return fromRecords({
        directed: true,
        nodes: [{ id: 1 }, { id: "1" }, { id: 2 }],
        edges: [
            { source: 1, target: "1" },
            { source: "1", target: 2 },
        ],
    }).snapshot;
}

/**
 * Each format and the ids the mangled export reads back: GraphML restores the originals, the others keep the
 * rename (XGMML reads every id back as text).
 */
const FORMATS: readonly [string, GraphExporter<object>, GraphImporter<object>, unknown[]][] = [
    ["GraphML", graphmlExporter, graphmlImporter, [1, "1", 2]],
    ["GEXF", gexfExporter, gexfImporter, [1, "1_2", 2]],
    ["DOT", dotExporter, dotImporter, [1, "1_2", 2]],
    ["XGMML", xgmmlExporter, xgmmlImporter, ["1", "1_2", "2"]],
];

describe.each(FORMATS)("%s: node ids with the same text", (_name, exporter, importer, readBack) => {
    it("check() notes E_ID_TEXT_COLLISION and export() refuses under sanitizeIds 'error'", async () => {
        const s = colliding();
        const note = exporter.check(s).find((n) => n.code === LOSS.ID_TEXT_COLLISION);
        expect(note?.count).toBe(1);
        await expect(exporter.exportToString(s)).rejects.toMatchObject({
            code: "E_INVALID_ID",
            details: { reason: "collision", count: 1, id: "1", index: 1 },
        });
    });

    it("renames the later id under 'mangle', which reads back as a distinct node", async () => {
        const s = colliding();
        const result = await roundTrip(s, exporter, importer, { exportOptions: { sanitizeIds: "mangle" } });
        expect(result.notes.find((n) => n.code === LOSS.ID_TEXT_RENAMED)?.count).toBe(1);
        expect(result.notes.some((n) => n.code === LOSS.ID_TEXT_COLLISION)).toBe(false);
        expect(result.snapshot.nodeCount).toBe(3);
        expect(result.snapshot.edgeCount).toBe(2);
        expect(result.snapshot.ids.toArray()).toEqual(readBack);
    });
});

describe("sanitizeIds: text collisions", () => {
    it("keeps the first id and suffixes the later ones past every id in use", () => {
        const s = fromRecords({
            directed: false,
            nodes: [{ id: "1" }, { id: 1 }, { id: "1_2" }],
            edges: [],
        }).snapshot;
        for (const charset of ["any", "nmtoken"] as const) {
            const ids = sanitizeIds(s, charset, "mangle");
            expect([0, 1, 2].map((i) => ids.idAt(i))).toEqual(["1", "1_3", "1_2"]);
            expect(ids.changed).toBe(1);
            expect(ids.isChanged(1)).toBe(true);
            expect(ids.originalAt(1)).toBe(1);
        }
    });

    it("leaves integer ids alone: an id outside the charset is renumbered, never a collision", () => {
        const s = fromRecords({ directed: false, nodes: [{ id: 1 }, { id: "1" }], edges: [] }).snapshot;
        const ids = sanitizeIds(s, "integer", "mangle");
        expect([ids.idAt(0), ids.idAt(1)]).toEqual([1, 0]);
    });
});
