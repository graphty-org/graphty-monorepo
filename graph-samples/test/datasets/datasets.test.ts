import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { type AttributeTable, type ColumnInput, fromEdgeArrays } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import { buildDataset, type DatasetMeta } from "../../src/datasets/build.js";
import { DATASETS } from "../../src/datasets/catalog.js";
import { celegansNeural } from "../../src/datasets/celegans-neural/index.js";
import { contiguousUsa } from "../../src/datasets/contiguous-usa/index.js";
import { davisSouthernWomen } from "../../src/datasets/davis-southern-women/index.js";
import { dolphins } from "../../src/datasets/dolphins/index.js";
import { florentineFamilies } from "../../src/datasets/florentine-families/index.js";
import { football } from "../../src/datasets/football/index.js";
import { goSlimGeneric } from "../../src/datasets/go-slim-generic/index.js";
import { karate } from "../../src/datasets/karate/index.js";
import { knuthMiles } from "../../src/datasets/knuth-miles/index.js";
import { lesMiserables } from "../../src/datasets/les-miserables/index.js";
import { openflights } from "../../src/datasets/openflights/index.js";
import { politicalBlogs } from "../../src/datasets/political-blogs/index.js";
import { politicalBooks } from "../../src/datasets/political-books/index.js";
import { stelzlInteractome } from "../../src/datasets/stelzl-interactome/index.js";
import { wikipathwaysSenescenceAutophagy } from "../../src/datasets/wikipathways-senescence-autophagy/index.js";
import { yeastPerturbation } from "../../src/datasets/yeast-perturbation/index.js";
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
    "contiguous-usa": contiguousUsa,
    "knuth-miles": knuthMiles,
    "celegans-neural": celegansNeural,
    "political-blogs": politicalBlogs,
    openflights,
    "yeast-perturbation": yeastPerturbation,
    "stelzl-interactome": stelzlInteractome,
    "wikipathways-senescence-autophagy": wikipathwaysSenescenceAutophagy,
    "go-slim-generic": goSlimGeneric,
};

const BUNDLED = DATASETS.filter((meta) => meta.hosting !== "remote");

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

describe.each(BUNDLED.map((meta) => [meta.name, meta] as const))("dataset %s", (name, meta: DatasetMeta) => {
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

    it("returns a fresh copy on every call", () => {
        const a = load();
        a.src[0] = 999;
        expect(load().src[0]).not.toBe(999);
    });
});

describe.each(DATASETS.map((meta) => [meta.name, meta] as const))("NOTICE: %s", (name, meta: DatasetMeta) => {
    it("is recorded in NOTICE with its source, citation and license", () => {
        const notice = readFileSync(path.join(packageRoot, "NOTICE"), "utf8");
        expect(notice).toContain(meta.hosting === "remote" ? `(hosted: ${name})` : `(datasets/${name})`);
        expect(notice).toContain(meta.source);
        expect(notice).toContain(meta.citation);
        expect(notice).toContain(meta.license);
    });
});

describe("the catalogue", () => {
    it("has unique names", () => {
        expect(new Set(DATASETS.map((meta) => meta.name)).size).toBe(DATASETS.length);
    });

    it("lists every dataset directory exactly once", () => {
        const dirs = readdirSync(path.join(packageRoot, "src/datasets"), { withFileTypes: true })
            .filter((entry) => entry.isDirectory())
            .map((entry) => entry.name)
            .sort();
        expect(BUNDLED.map((meta) => meta.name).sort()).toEqual(dirs);
    });
});

describe("dataset contents", () => {
    it("yeast perturbation: Cytoscape's galFiltered, labelled by gene name, placed by its saved drawing", () => {
        const g = yeastPerturbation();
        const snapshot = fromEdgeArrays(g);
        const label = columnValues(snapshot.nodes, "label", g.nodeCount);
        expect(g.ids?.[0]).toBe("YKR026C");
        expect(label).toContain("GAL4");
        const y = columnValues(snapshot.nodes, "y", g.nodeCount) as number[];
        expect(y.every((v) => Number.isFinite(v))).toBe(true);
        // genes with no expression ratio in the session load as NaN, not as a ratio of 0
        const gal4 = columnValues(snapshot.nodes, "gal4RGexp", g.nodeCount) as number[];
        expect(gal4.filter((v) => Number.isNaN(v)).length).toBeGreaterThan(0);
        // stored y-up: Cytoscape's screen y (all positive here) is negated
        expect(y.filter((v) => v > 0).length).toBeLessThan(y.length / 2);
    });

    it("stelzl interactome: HUGO symbols label Entrez ids, and the session's self-loops are gone", () => {
        const g = stelzlInteractome();
        const label = columnValues(fromEdgeArrays(g).nodes, "label", g.nodeCount);
        expect(label).toContain("TP53");
        expect(Array.from(g.src).every((s, e) => s !== g.dst[e])).toBe(true);
    });

    it("wikipathways: every element carries its saved position and a WikiPathways type", () => {
        const g = wikipathwaysSenescenceAutophagy();
        const snapshot = fromEdgeArrays(g);
        const x = columnValues(snapshot.nodes, "x", g.nodeCount) as number[];
        expect(x.every((v) => Number.isFinite(v))).toBe(true);
        expect(columnValues(snapshot.nodes, "type", g.nodeCount)).toContain("GeneProduct");
    });

    it("go slim: terms of all three GO namespaces, each arc from a term to its parent", () => {
        const g = goSlimGeneric();
        const namespaces = new Set(columnValues(fromEdgeArrays(g).nodes, "namespace", g.nodeCount));
        expect(namespaces).toEqual(new Set(["biological_process", "cellular_component", "molecular_function"]));
        expect(g.ids?.every((id) => id.startsWith("GO:"))).toBe(true);
    });

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

    it("contiguous usa: the 48 contiguous states and DC, joined by land borders", () => {
        const g = contiguousUsa();
        const d = degrees(g);
        const degreeOf = (code: string): number => d[g.ids?.indexOf(code) ?? -1];
        expect(degreeOf("ME")).toBe(1);
        expect(degreeOf("DC")).toBe(2);
        expect(degreeOf("MO")).toBe(8);
        expect(degreeOf("TN")).toBe(8);
        // the Four Corners touch at a point only, and Lake Michigan is not a border
        expect(degreeOf("AZ")).toBe(4);
        expect(degreeOf("MI")).toBe(3);
        const snapshot = fromEdgeArrays(g);
        const index = snapshot.ids.requireIndex("CA");
        expect(snapshot.nodes.get("label")?.value(index)).toBe("California");
        expect(snapshot.nodes.get("latitude")?.value(index)).toBeCloseTo(35.5, 0);
        expect(snapshot.nodes.get("longitude")?.value(index)).toBeCloseTo(-119.4, 0);
        expect(snapshot.nodes.get("population")?.value(index)).toBe(39538223);
    });

    it("knuth miles: every pair of 128 cities with its 1949 road mileage", () => {
        const g = knuthMiles();
        const ids = g.ids ?? [];
        const weights = g.weights ?? new Float32Array();
        const between = (a: string, b: string): number => {
            const [i, j] = [ids.indexOf(a), ids.indexOf(b)];
            for (let e = 0; e < g.src.length; e++) {
                if ((g.src[e] === i && g.dst[e] === j) || (g.src[e] === j && g.dst[e] === i)) {
                    return weights[e];
                }
            }
            return Number.NaN;
        };
        expect(between("Youngstown, OH", "Yankton, SD")).toBe(966);
        expect(between("Worcester, MA", "Yakima, WA")).toBe(2964);
        expect(degrees(g).every((x) => x === 127)).toBe(true);
        const snapshot = fromEdgeArrays(g);
        const index = snapshot.ids.requireIndex("Youngstown, OH");
        expect(snapshot.nodes.get("latitude")?.value(index)).toBeCloseTo(41.1, 6);
        expect(snapshot.nodes.get("longitude")?.value(index)).toBeCloseTo(-80.65, 6);
        expect(snapshot.nodes.get("population")?.value(index)).toBe(115436);
    });

    it("c. elegans: parallel arcs merged, total synapse weight kept", () => {
        const g = celegansNeural();
        expect(Array.from(g.weights ?? []).reduce((a, b) => a + b, 0)).toBe(8819);
        const labels = (g.nodeColumns?.label as ColumnInput).data as string[];
        expect(new Set(labels).size).toBe(297);
    });

    it("political blogs: 758 liberal and 732 conservative blogs, 266 of them isolated", () => {
        const g = politicalBlogs();
        const snapshot = fromEdgeArrays(g);
        const lean = columnValues(snapshot.nodes, "lean", 1490);
        expect(lean.filter((l) => l === "liberal").length).toBe(758);
        expect(lean.filter((l) => l === "conservative").length).toBe(732);
        expect(degrees(g).filter((x) => x === 0).length).toBe(266);
    });

    it("openflights: the busiest airports and their coordinates", () => {
        const g = openflights();
        const d = degrees(g);
        const ids = g.ids ?? [];
        const busiest = ids.map((id, i) => [id, d[i]] as const).sort((a, b) => b[1] - a[1]);
        expect(busiest.slice(0, 3).map(([id]) => id)).toEqual(["FRA", "CDG", "AMS"]);
        expect(busiest[0][1]).toBe(477);
        const snapshot = fromEdgeArrays(g);
        const index = snapshot.ids.requireIndex("ATL");
        expect(snapshot.nodes.get("country")?.value(index)).toBe("United States");
        expect(snapshot.nodes.get("latitude")?.value(index)).toBeCloseTo(33.64, 1);
        expect(Array.from(g.weights ?? []).reduce((a, b) => a + b, 0)).toBe(66771 - 1);
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
                columns: { x: { dtype: "i64", values: [1] } } as never,
            }),
        ).toThrow(TypeError);
    });
});
