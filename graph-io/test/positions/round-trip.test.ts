/**
 * toFilePositions() is the inverse of extractPositions(): for GML, Pajek and yEd, the neutral
 * coordinates written back in the column's spelling are the numbers the file holds, so a file
 * loaded and saved is drawn the same way when loaded again.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { GraphBuilder } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import { createRegistry } from "../../src/index.js";
import { toNeutral } from "../../src/positions/convert.js";
import {
    extractPositions,
    type FilePositions,
    type PositionColumnExtra,
    toFilePositions,
    writtenPositions,
} from "../../src/positions/index.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const CONFORMANCE = join(HERE, "..", "conformance", "fixtures");

const registry = createRegistry();

const FILES = [
    { name: "GML from yFiles", file: join(HERE, "fixtures", "yfiles.gml"), format: "gml" },
    { name: "GML with a real z", file: join(CONFORMANCE, "gml", "authored", "graphics-position.gml"), format: "gml" },
    { name: "Pajek 2D (z = 0.5)", file: join(CONFORMANCE, "pajek", "batagelj", "USAir97.net"), format: "pajek" },
    { name: "Pajek 3D", file: join(CONFORMANCE, "pajek", "bavla", "A97.NET"), format: "pajek" },
    { name: "yEd", file: join(HERE, "fixtures", "yed-groups.graphml"), format: "graphml" },
] as const;

describe("toFilePositions inverts extractPositions", () => {
    it.each(FILES)("$name", async ({ file, format }) => {
        const importer = registry.importer(format);
        const { snapshot, report } = await registry.importGraph(readFileSync(file), { format });
        const positions = extractPositions(importer, snapshot, report) as FilePositions;
        const column = snapshot.nodes.byRole("position");
        expect(column).not.toBeNull();
        const hook = importer.positions?.(snapshot, { signal: null }) ?? {};
        const extra = { ...column?.meta.extra, ...hook } as PositionColumnExtra;
        const n = snapshot.nodeCount;
        const size = (name: string | undefined): Float64Array =>
            Float64Array.from({ length: n }, (_, i) => Number(snapshot.nodes.get(name ?? "")?.value(i) ?? 0));
        const back = toFilePositions(positions.coords, extra, { width: size(extra.width), height: size(extra.height) });
        for (let i = 0; i < n; i++) {
            // including the constant z a 2D file writes (Pajek's 0.5)
            const raw = Array.from(column?.value(i) as ArrayLike<number>);
            Array.from(back.subarray(3 * i, 3 * i + 3)).forEach((v, k) =>
                expect(v, `${i}[${k}]`).toBeCloseTo(raw[k], 12),
            );
        }
    });

    it("leaves unplaced rows NaN", () => {
        const back = toFilePositions(Float64Array.of(Number.NaN, Number.NaN, Number.NaN, 1, 2, 0), { yAxis: "down" });
        expect(Array.from(back)).toEqual([Number.NaN, Number.NaN, Number.NaN, 1, -2, 0]);
    });
});

/**
 * Read a file's positions in the neutral convention.
 * @param text - the file
 * @param format - its format
 * @returns x, y, z per node
 */
async function neutral(text: string | Uint8Array, format: "pajek" | "graphml"): Promise<Float64Array> {
    const { snapshot, report } = await registry.importGraph(text, { format });
    return (extractPositions(registry.importer(format), snapshot, report) as FilePositions).coords;
}

describe("positions survive import, export, import", () => {
    it("a 3D Pajek drawing with nodes on the z = 0 plane", async () => {
        // node 2 sits at Pajek's z origin, 0.5, which is neutral z 0
        const file = '*Vertices 3\n1 "a" 0.1 0.2 0.3\n2 "b" 0.4 0.5 0.5\n3 "c" 0.7 0.8 0.9\n*Edges\n1 2\n';
        const first = await neutral(file, "pajek");
        expect(first[5]).toBe(0);
        // export as graphty-element does: the neutral coordinates spelled for Pajek's writer
        const written = writtenPositions("pajek", first);
        const b = new GraphBuilder({ directed: false });
        const pos = b.declareNodeColumn({ name: "position", dtype: "f64", components: 3, role: "position" });
        const label = b.declareNodeColumn({ name: "label", dtype: "string" });
        for (let i = 0; i < 3; i++) {
            const node = b.addNode(i + 1);
            b.setNodeValue(label, node, "abc"[i]);
            b.setNodeValue(pos, node, Array.from(written.subarray(3 * i, 3 * i + 3)));
        }
        const text = await registry.exportGraphToString(b.freeze(), "pajek");
        const again = await neutral(text, "pajek");
        Array.from(again).forEach((v, k) => expect(v, String(k)).toBeCloseTo(first[k], 12));
    });

    it("a yEd drawing", async () => {
        const file = readFileSync(join(HERE, "fixtures", "yed-groups.graphml"));
        const first = await neutral(file, "graphml");
        expect(first.some(Number.isFinite)).toBe(true);
        const { snapshot } = await registry.importGraph(file, { format: "graphml" });
        const text = await registry.exportGraphToString(snapshot, "graphml");
        const again = await neutral(text, "graphml");
        Array.from(again).forEach((v, k) => expect(v, String(k)).toBeCloseTo(first[k], 9));
    });

    it("a stretched top-left spelling inverts toNeutral", () => {
        const extra: PositionColumnExtra = { yAxis: "down", anchor: "top-left", pxPerUnit: 500, pxPerUnitY: 250 };
        for (const yAxis of ["down", "up"] as const) {
            const p: [number, number, number] = [3, 7, 0];
            toNeutral(p, { ...extra, yAxis }, [10, 20], false);
            const back = toFilePositions(
                Float64Array.from(p),
                { ...extra, yAxis },
                {
                    width: Float64Array.of(10),
                    height: Float64Array.of(20),
                },
            );
            expect(Array.from(back)).toEqual([3, 7, 0]);
        }
    });
});

/** The Cytoscape family's writers, each writing y down from the neutral form. */
const CYTOSCAPE_WRITERS = [
    { name: "CX", format: "cx", options: { sanitizeIds: "mangle" } },
    { name: "CX2", format: "cx2", options: { sanitizeIds: "mangle" } },
    { name: "Cytoscape session", format: "cys", options: { sanitizeIds: "mangle" } },
    { name: "Cytoscape.js JSON", format: "json", options: { dialect: "cytoscape" } },
    { name: "XGMML", format: "xgmml", options: {} },
] as const;

describe("a y-down drawing written to a Cytoscape format reads back the same way up", () => {
    // the sources whose position column declares its spelling (a GML column does not: its importer's hook does)
    const cases = FILES.filter((f) => f.format !== "gml").flatMap((source) =>
        CYTOSCAPE_WRITERS.map((writer) => ({
            ...source,
            writer: writer.name,
            to: writer.format,
            options: writer.options,
        })),
    );
    it.each(cases)("$name to $writer", async ({ file, format, to, options }) => {
        const { snapshot, report } = await registry.importGraph(readFileSync(file), { format });
        const first = (extractPositions(registry.importer(format), snapshot, report) as FilePositions).coords;
        const blob = await registry.exportGraphToBlob(snapshot, to, options);
        const back = await registry.importGraph(new Uint8Array(await blob.arrayBuffer()), { format: to });
        const again = (extractPositions(registry.importer(to), back.snapshot, back.report) as FilePositions).coords;
        expect(back.snapshot.nodeCount).toBe(snapshot.nodeCount);
        let compared = 0;
        for (let i = 0; i < snapshot.nodeCount; i++) {
            if (Number.isNaN(first[3 * i]) || Number.isNaN(again[3 * i])) {
                continue;
            }
            compared++;
            expect(again[3 * i], `${i} x`).toBeCloseTo(first[3 * i], 6);
            expect(again[3 * i + 1], `${i} y`).toBeCloseTo(first[3 * i + 1], 6);
        }
        expect(compared).toBeGreaterThan(0);
    });
});
