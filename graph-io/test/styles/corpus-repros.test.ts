/**
 * Defects found in the style fidelity corpus, each pinned by the small file that reproduces it
 * (`test/corpus/styles/<format>/fidelity/repro-*`, written by `test/fidelity/generators/gen_repros.py`)
 * or by a few lines of the format: what graph-io's planned styles say each element looks like,
 * read through `resolveStyles()`.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";

import { describe, expect, it } from "vitest";

import { extractPositions } from "../../src/positions/index.js";
import { createRegistry } from "../../src/registry.js";
import { readImageAnnotations } from "../../src/styles/annotations.js";
import { resolveStyles, type StyleProperty, type StyleTarget } from "../../src/styles/internal.js";

const registry = createRegistry();
const CORPUS = resolve(import.meta.dirname, "../corpus/styles");

/**
 * Imports a document with its styles.
 * @param doc - the file's bytes or text
 * @param format - its format
 * @returns the import result
 */
async function load(doc: string | Uint8Array, format: string): ReturnType<typeof registry.importGraph> {
    const r = await registry.importGraph(doc, { format, styles: true, errorLimit: Infinity });
    if (!r.styles) {
        throw new Error("no styles");
    }
    return r;
}

/**
 * A corpus file's bytes.
 * @param path - relative to the styles corpus
 * @returns the bytes
 */
function corpus(path: string): Uint8Array {
    const raw = readFileSync(resolve(CORPUS, path));
    return new Uint8Array(path.endsWith(".gz") ? gunzipSync(raw) : raw);
}

/**
 * Each element's planned value of one property.
 * @param r - the import result
 * @param target - nodes or edges
 * @param property - the property
 * @returns the values by element index
 */
function planned(r: Awaited<ReturnType<typeof load>>, target: StyleTarget, property: StyleProperty): unknown[] {
    if (!r.styles) {
        throw new Error("no styles");
    }
    return [...resolveStyles(r.styles, target, property, r.snapshot)];
}

describe("Cytoscape's size lock", () => {
    it("draws a node that sets its own width and height at them, the rest at the locked size", async () => {
        const r = await load(corpus("cx/fidelity/repro-locked-own-size.cx"), "cx");
        const width = planned(r, "node", "width") as number[];
        const height = planned(r, "node", "height") as number[];
        // nodes 0..9 set their own size (node 0: 61.3678, node 3: 187.7697); 10 and 11 take the mapped size
        expect(width[0]).toBeCloseTo(61.3678, 3);
        expect(height[3]).toBeCloseTo(187.7697, 3);
        expect(width.slice(0, 10).every((w, i) => w === height[i])).toBe(true);
        for (const i of [10, 11]) {
            expect(width[i]).toBeGreaterThanOrEqual(10);
            expect(width[i]).toBeLessThanOrEqual(30);
        }
    });
});

describe("Cytoscape's shared name and shared interaction", () => {
    it("are read from name and interaction when the file holds only those", async () => {
        const r = await load(corpus("cx2/fidelity/repro-shared-interaction.cx2"), "cx2");
        // edge i has interaction kinds[i % 4]: product, reactant, inhibitor, modifier
        const color = planned(r, "edge", "color");
        expect(color.slice(0, 4)).toEqual(["#000000", "#000000", "#ff3333", "#3333ff"]);
        expect(planned(r, "edge", "lineStyle").slice(2, 4)).toEqual(["dotted", "dashed"]);
        expect(planned(r, "node", "label").slice(0, 2)).toEqual(["S0", "S1"]);
        expect(r.styles?.styles.notes.map((n) => n.code)).not.toContain("W_STYLE_MAPPING_COLUMN_MISSING");
    });
});

describe("labels Cytoscape draws by default", () => {
    it("label an XGMML node by its name, else by its label= when it has no name", async () => {
        const r = await load(corpus("xgmml/fidelity/repro-name-only-labels.xgmml"), "xgmml");
        // even nodes carry a name att, odd ones only label=; every node shows DB-<index>
        const want = Array.from({ length: 14 }, (_v, i) => `DB-${String(i).padStart(2, "0")}`);
        expect(planned(r, "node", "label")).toEqual(want);
    });

    it("label a node by the tool's label column when the reader gives no label (Cytoscape: name)", async () => {
        const doc = JSON.stringify([
            { CXVersion: "2.0", hasFragments: false },
            {
                attributeDeclarations: [{ nodes: { name: { d: "string" } } }],
            },
            {
                nodes: [
                    { id: 1, v: { name: "alpha" } },
                    { id: 2, v: {} },
                ],
            },
            { edges: [] },
            { visualProperties: [{ default: { node: { NODE_BACKGROUND_COLOR: "#FF0000" } } }] },
        ]);
        const r = await load(doc, "cx2");
        expect(planned(r, "node", "label")).toEqual(["alpha", null]);
        const rule = r.styles?.styles.rules.find((x) => x.id === "node.tool.label");
        expect(rule?.origin).toBe("tool");
    });
});

describe("sigma's node size", () => {
    const doc = JSON.stringify({
        attributes: {},
        options: { type: "undirected", multi: false, allowSelfLoops: true },
        nodes: [
            { key: "a", attributes: { size: 5, x: 0, y: 0 } },
            { key: "b", attributes: { x: 1, y: 1 } },
        ],
        edges: [{ source: "a", target: "b", attributes: { size: 3 } }],
    });

    it("is a radius: a node is twice its size across, and sigma 4's default size 10 is 20 across", async () => {
        const r = await load(doc, "json");
        expect(r.styles?.styles.source.tool).toBe("sigma");
        expect(planned(r, "node", "width")).toEqual([10, 20]);
        expect(planned(r, "node", "height")).toEqual([10, 20]);
        // an edge is drawn half as wide as its size (graphology-specimen-arrows edge-size-6: 3 px)
        expect(planned(r, "edge", "width")).toEqual([1.5]);
    });

    it("draws labels 12 px, as sigma 4 sets every node's labelSize", async () => {
        const r = await load(doc, "json");
        expect(planned(r, "node", "labelSize")).toEqual([12, 12]);
    });

    it("comes with positions the viewer fits into its canvas, 30 px in from each side", async () => {
        const r = await load(doc, "json");
        const positions = extractPositions(registry.importer("json"), r.snapshot, r.report);
        expect(positions?.viewerFit).toEqual({ padding: 30 });
        expect(positions?.units).toBe("file");
        // a node-link file's positions keep their own length
        const nodeLink = await registry.importGraph(
            JSON.stringify({
                nodes: [
                    { id: "a", x: 0, y: 0 },
                    { id: "b", x: 1, y: 2 },
                ],
                links: [],
            }),
            { format: "json" },
        );
        expect(
            extractPositions(registry.importer("json"), nodeLink.snapshot, nodeLink.report)?.viewerFit,
        ).toBeUndefined();
    });

    it("is written back as the radius", async () => {
        const r = await load(doc, "json");
        const bytes = await registry.exportGraphToBytes(r.snapshot, "json", {
            styles: r.styles,
            dialect: "graphology",
        });
        const text = new TextDecoder().decode(bytes);
        expect(text).toContain('"size":5');
        const back = await load(text, "json");
        expect(planned(back, "node", "width")[0]).toBe(10);
    });
});

describe("sigma's visibility", () => {
    const doc = JSON.stringify({
        attributes: {},
        options: { type: "undirected", multi: false, allowSelfLoops: true },
        nodes: [
            { key: "a", attributes: { x: 0, y: 0, hidden: true } },
            { key: "b", attributes: { x: 1, y: 1, visibility: "hidden" } },
            { key: "c", attributes: { x: 2, y: 2 } },
        ],
        edges: [
            { source: "a", target: "c", attributes: { hidden: true } },
            { source: "b", target: "c", attributes: { visibility: "hidden" } },
        ],
    });

    // sigma 4.0.1's default styles bind neither key: its own drawings of graphology-specimen-node-sizes-opacity and
    // -edges-lines show every element marked hidden true or visibility "hidden"
    it("hides nothing marked hidden true (sigma 3's key) or visibility \"hidden\" (sigma 4's display-data name)", async () => {
        const r = await load(doc, "json");
        expect(planned(r, "node", "visible")).toEqual([null, null, null]);
        expect(planned(r, "edge", "visible")).toEqual([null, null]);
    });
});

describe("yEd GML without a Creator line (BioNetGen)", () => {
    it("is read as yEd: groups into the parent column, yEd's defaults, labels placed by their anchor", async () => {
        const r = await load(corpus("gml/fidelity/repro-groups-no-creator.gml"), "gml");
        expect(r.styles?.styles.source.tool).toBe("yed");
        // node 0 is Rule0, node 1 its molecule M00 (gid 0), node 2 a component of M00 (gid 1)
        const parent = r.snapshot.nodes.byRole("parent");
        expect(parent).not.toBeNull();
        expect([1, 2].map((i) => parent?.value(i))).toEqual([0, 1]);
        expect(parent?.isSet(0)).toBe(false);
        expect(new Set(planned(r, "node", "labelPosition"))).toEqual(new Set(["center"]));
        // yEd draws an outline 1 wide and an edge without targetArrow with no arrow
        expect(new Set(planned(r, "node", "borderWidth"))).toEqual(new Set([1]));
        expect(planned(r, "edge", "targetArrow")[0]).toBe("none");
        expect(r.report.issues.map((i) => i.code)).not.toContain("W_GML_GROUPS");
    });
});

describe("Cytoscape groups", () => {
    /**
     * The names of the nodes the styles mark not visible.
     * @param r - the import result
     * @returns the names, sorted
     */
    function hidden(r: Awaited<ReturnType<typeof load>>): string[] {
        const label = r.snapshot.nodes.byRole("label");
        return planned(r, "node", "visible")
            .flatMap((v, i) => (v === false ? [String(label?.value(i))] : []))
            .sort();
    }

    it("hide an expanded group's own node and a collapsed group's members, as Cytoscape draws them (XGMML)", async () => {
        const r = await load(corpus("xgmml/fidelity/syn-bypass.xgmml.gz"), "xgmml");
        // B10, B20 and B30 are hidden by the file itself
        expect(hidden(r)).toEqual([
            "B10",
            "B20",
            "B30",
            "B50",
            "B51",
            "B52",
            "B53",
            "group-expanded-1",
            "group-expanded-2",
        ]);
    });

    it("hide an expanded group's own node in a session (a collapsed group's members are not in its network)", async () => {
        const r = await load(corpus("cys/fidelity/syn-bypass.cys"), "cys");
        expect(hidden(r)).toEqual(["B10", "B20", "B30", "group-expanded-1", "group-expanded-2"]);
    });
});

describe("picture annotations", () => {
    it("are read, not noted as skipped (the image a Cytoscape sample session places on its canvas)", async () => {
        const r = await load(corpus("cys/fidelity/import-and-save.cys"), "cys");
        const note = r.styles?.styles.notes.find((n) => n.code === "W_STYLE_ANNOTATION_SKIPPED");
        expect(note).toBeUndefined();
        expect(readImageAnnotations(r.snapshot).map((a) => a.kind)).toEqual(["image"]);
    });
});
