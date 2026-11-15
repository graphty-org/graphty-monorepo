/**
 * Which way up each format's positions come out: extractPositions() (y up) turned to screen order (y
 * down) must lie on the drawing the reference program made of the same file -- the right way round,
 * not mirrored and not turned. The reference scenes are the style fidelity harness's: yEd's stored
 * drawing, Gephi, Graphviz, Cytoscape desktop, Cytoscape.js. Scenes are y down.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";

import { describe, expect, it } from "vitest";

import { createRegistry } from "../../src/index.js";
import { extractPositions } from "../../src/positions/index.js";
import { fitSimilarity } from "../fidelity/compare.js";
import { SAMPLES } from "../fidelity/samples.js";
import type { Scene } from "../fidelity/scene.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const TEST = join(HERE, "..");
const registry = createRegistry();

/** Routes that name a node by a column instead of its id (as the fidelity comparer matches them). */
const NODE_KEY: Partial<Record<string, string>> = {
    "cytoscape-desktop": "name",
    "cyjs-hop": "name",
    "cytoscape-gml": "label",
};

/**
 * Every sample whose file stores positions and has a reference that draws them. The DOT sample is not
 * laid out (Graphviz places it when it draws), and Pajek's iliad file stores no layout: DOT is checked
 * below against Graphviz's own rule instead.
 */
const CASES = SAMPLES.filter((s) => s.id !== "pajek-iliad" && s.id !== "dot-profile").map((s) => ({
    id: s.id,
    format: s.format,
    sample: s,
}));

describe("positions come out the way the reference program draws them", () => {
    it.each(CASES)("$id ($format)", async ({ sample }) => {
        const bytes = readFileSync(join(TEST, sample.file));
        const raw = sample.file.endsWith(".gz") ? gunzipSync(bytes) : bytes;
        const input = sample.format === "cys" ? new Uint8Array(raw) : raw.toString("utf8");
        const { snapshot, report } = await registry.importGraph(input, { format: sample.format });
        const positions = extractPositions(registry.importer(sample.format), snapshot, report);
        expect(positions?.usable).toBe(true);
        if (positions === null) {
            return;
        }
        const route = sample.routes[0];
        const ref = JSON.parse(
            readFileSync(join(TEST, "fidelity", "scenes", sample.id, `${route}.ref.json`), "utf8"),
        ) as Scene;
        const key = NODE_KEY[route];
        const byKey = new Map<string, number>();
        for (let i = 0; i < snapshot.nodeCount; i++) {
            const k = (key === undefined ? snapshot.ids.idOf(i) : snapshot.nodes.value(key, i)) as
                string | number | null | undefined;
            if (k !== undefined && k !== null) {
                byKey.set(String(k), i);
            }
        }
        const from: [number, number][] = [];
        const to: [number, number][] = [];
        for (const node of ref.nodes) {
            const i = byKey.get(node.id);
            if (i === undefined || Number.isNaN(positions.coords[3 * i])) {
                continue;
            }
            // y up to the scene's y down
            from.push([positions.coords[3 * i], -positions.coords[3 * i + 1]]);
            to.push([node.x, node.y]);
        }
        expect(from.length).toBeGreaterThanOrEqual(3);
        const fit = fitSimilarity(from, to);
        expect(fit?.reflect, "mirrored top to bottom").toBe(false);
        expect(Math.abs(fit?.rotation ?? Math.PI), "turned").toBeLessThan(0.01);
    });
});

describe("DOT positions come out the way Graphviz draws them", () => {
    it("draws a top-to-bottom digraph laid out by dot with every edge pointing down", async () => {
        // pydot's parsing_test.dot: laid out by dot (rankdir TB), so every edge's tail is ranked above its head
        const text = readFileSync(join(TEST, "conformance", "fixtures", "dot", "pydot", "parsing_test.dot"), "utf8");
        const { snapshot, report } = await registry.importGraph(text, { format: "dot" });
        const positions = extractPositions(registry.importer("dot"), snapshot, report);
        expect(positions?.usable).toBe(true);
        const y = (i: number): number => positions?.coords[3 * i + 1] ?? Number.NaN;
        let edges = 0;
        for (let e = 0; e < snapshot.edgeCount; e++) {
            // y up: the tail is higher
            expect(y(snapshot.edgeSource(e))).toBeGreaterThan(y(snapshot.edgeTarget(e)));
            edges++;
        }
        expect(edges).toBe(30);
    });

    it("stretches a laid-out drawing to a numeric ratio as Graphviz does, the short side scaled up", async () => {
        const read = async (ratio: string): Promise<{ x: number; y: number; pxPerUnit: number | undefined }> => {
            const text = `digraph { graph [bb="0,0,200,100", ratio="${ratio}"]; a [pos="0,0!"]; b [pos="200,100!"] }`;
            const { snapshot, report } = await registry.importGraph(text, { format: "dot" });
            const positions = extractPositions(registry.importer("dot"), snapshot, report);
            const k = positions?.pxPerUnit ?? 1;
            const c = positions?.coords ?? [];
            return { x: (c[3] - c[0]) * k, y: (c[4] - c[1]) * k, pxPerUnit: positions?.pxPerUnit };
        };
        // 100 / 200 is less than 2: the height is scaled up to twice the width
        const tall = await read("2");
        expect([tall.x, tall.y]).toEqual([200, 400]);
        // 100 / 200 is more than 0.25: the width is scaled up to four times the height
        const wide = await read("0.25");
        expect([wide.x, wide.y]).toEqual([400, 100]);
        // a ratio that is not a number leaves the drawing as laid out
        expect((await read("fill")).pxPerUnit).toBeUndefined();
    });
});
