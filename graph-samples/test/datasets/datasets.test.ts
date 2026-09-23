import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { type AttributeTable, type ColumnInput, fromEdgeArrays } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import { buildDataset, type DatasetMeta } from "../../src/datasets/build.js";
import { DATASETS } from "../../src/datasets/catalog.js";
import { davisSouthernWomen } from "../../src/datasets/davis-southern-women/index.js";
import { dolphins } from "../../src/datasets/dolphins/index.js";
import { florentineFamilies } from "../../src/datasets/florentine-families/index.js";
import { football } from "../../src/datasets/football/index.js";
import { karate } from "../../src/datasets/karate/index.js";
import { lesMiserables } from "../../src/datasets/les-miserables/index.js";
import { politicalBooks } from "../../src/datasets/political-books/index.js";
import { type SampleGraph } from "../../src/types.js";
import { degrees, expectSimple } from "../helpers/graph.js";

const packageRoot = path.resolve(import.meta.dirname, "../..");

const LOADERS: Readonly<Record<string, () => SampleGraph>> = {
    karate,
    "florentine-families": florentineFamilies,
    "davis-southern-women": davisSouthernWomen,
    "les-miserables": lesMiserables,
    football,
    "political-books": politicalBooks,
    dolphins,
};

/**
 * A node column's value for every node of a loaded snapshot.
 * @param table - the snapshot's node table
 * @param name - the column
 * @param count - the node count
 * @returns the values
 */
function columnValues(table: AttributeTable, name: string, count: number): unknown[] {
    const column = table.get(name);
    expect(column).not.toBeNull();
    return Array.from({ length: count }, (_, i) => column?.value(i));
}

describe.each(DATASETS.map((meta) => [meta.name, meta] as const))("dataset %s", (name, meta: DatasetMeta) => {
    const load = LOADERS[name];

    it("has a loader", () => {
        expect(load).toBeTypeOf("function");
    });

    it("matches its metadata", () => {
        const g = load();
        expect(g.nodeCount).toBe(meta.nodes);
        expect(g.src.length).toBe(meta.edges);
        expect(g.directed).toBe(meta.directed);
        expect(g.weights !== undefined).toBe(meta.weighted);
        expect(Object.keys(g.nodeColumns ?? {}).sort()).toEqual(Object.keys(meta.attributes).sort());
        if (meta.groundTruth !== null) {
            expect(Object.keys(meta.attributes)).toContain(meta.groundTruth);
        }
        expect(meta.showcases.length).toBeGreaterThan(0);
        expect(meta.source).toMatch(/^https:\/\//);
        expect(meta.license.length).toBeGreaterThan(0);
    });

    it("is simple and loads into a graph-format snapshot with its ids, weights and columns", () => {
        const g = load();
        expectSimple(g);
        const snapshot = fromEdgeArrays(g);
        expect(snapshot.nodeCount).toBe(meta.nodes);
        expect(snapshot.edgeCount).toBe(meta.edges);
        expect(snapshot.weights !== null).toBe(meta.weighted);
        for (const column of Object.keys(meta.attributes)) {
            expect(snapshot.nodes.get(column)).not.toBeNull();
        }
    });

    it("is recorded in NOTICE with its source, citation and license", () => {
        const notice = readFileSync(path.join(packageRoot, "NOTICE"), "utf8");
        expect(notice).toContain(`(datasets/${name})`);
        expect(notice).toContain(meta.source);
        expect(notice).toContain(meta.citation);
        expect(notice).toContain(meta.license);
    });

    it("returns a fresh copy on every call", () => {
        const a = load();
        a.src[0] = 999;
        expect(load().src[0]).not.toBe(999);
    });
});

describe("the catalogue", () => {
    it("lists every dataset directory exactly once", () => {
        const dirs = readdirSync(path.join(packageRoot, "src/datasets"), { withFileTypes: true })
            .filter((entry) => entry.isDirectory())
            .map((entry) => entry.name)
            .sort();
        expect(DATASETS.map((meta) => meta.name).sort()).toEqual(dirs);
    });
});

describe("dataset contents", () => {
    it("karate: the instructor and the administrator lead the two factions", () => {
        const g = karate();
        const snapshot = fromEdgeArrays(g);
        const club = columnValues(snapshot.nodes, "club", 34);
        expect(club[0]).toBe("Mr. Hi");
        expect(club[33]).toBe("Officer");
        expect(club.filter((c) => c === "Mr. Hi").length).toBe(17);
        expect(degrees(g)[33]).toBe(17);
        expect(Array.from(g.weights ?? []).reduce((a, b) => a + b, 0)).toBe(231);
    });

    it("florentine families: the Medici have the most marriages", () => {
        const g = florentineFamilies();
        const d = degrees(g);
        expect(g.ids?.[d.indexOf(Math.max(...d))]).toBe("Medici");
        expect(Math.max(...d)).toBe(6);
    });

    it("davis southern women: every edge joins a woman to an event", () => {
        const g = davisSouthernWomen();
        const side = g.nodeColumns?.side as Uint8Array;
        expect(Array.from(side).filter((s) => s === 0).length).toBe(18);
        for (let e = 0; e < g.src.length; e++) {
            expect(side[g.src[e]] + side[g.dst[e]]).toBe(1);
        }
        expect(g.ids?.[18]).toBe("E1");
    });

    it("les miserables: Valjean is the most connected character", () => {
        const g = lesMiserables();
        const d = degrees(g);
        expect(g.ids?.[d.indexOf(Math.max(...d))]).toBe("Valjean");
        expect(Math.max(...d)).toBe(36);
    });

    it("football: conferences from Evans' corrected 2000 season", () => {
        const snapshot = fromEdgeArrays(football());
        const label = columnValues(snapshot.nodes, "label", 115);
        const conference = columnValues(snapshot.nodes, "conference", 115);
        expect(new Set(conference).size).toBe(19);
        expect(conference[label.indexOf("BoiseState")]).toBe("Big West");
        expect(conference[label.indexOf("NotreDame")]).toBe("Independent: Notre Dame");
    });

    it("political books: three leanings", () => {
        const snapshot = fromEdgeArrays(politicalBooks());
        const lean = columnValues(snapshot.nodes, "lean", 105);
        expect(lean.filter((l) => l === "liberal").length).toBe(43);
        expect(lean.filter((l) => l === "conservative").length).toBe(49);
        expect(lean.filter((l) => l === "neutral").length).toBe(13);
    });

    it("dolphins: 62 named dolphins", () => {
        const g = dolphins();
        const labels = (g.nodeColumns?.label as ColumnInput).data as string[];
        expect(new Set(labels).size).toBe(62);
        expect(labels).toContain("SN100");
    });
});

describe("buildDataset", () => {
    it("rejects an unknown column dtype", () => {
        expect(() =>
            buildDataset({
                directed: false,
                nodeCount: 1,
                ids: null,
                edges: [],
                weights: null,
                columns: { x: { dtype: "f64", values: [1] } } as never,
            }),
        ).toThrow(TypeError);
    });
});
