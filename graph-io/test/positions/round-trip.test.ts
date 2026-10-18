/**
 * toFilePositions() is the inverse of extractPositions(): for GML, Pajek and yEd, the neutral
 * coordinates written back in the column's spelling are the numbers the file holds, so a file
 * loaded and saved is drawn the same way when loaded again.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { createRegistry } from "../../src/index.js";
import {
    extractPositions,
    type FilePositions,
    type PositionColumnExtra,
    toFilePositions,
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
