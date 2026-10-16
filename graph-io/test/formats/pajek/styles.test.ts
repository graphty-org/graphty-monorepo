/**
 * Pajek styles: vertex shape keywords and drawing parameters and line parameters read with Pajek's rules and
 * Pajek's stated defaults, the files that failed to read before (a trailing `0` after the parameters, `NaN` line
 * values, a shape keyword among the parameters), and styles written back as Pajek parameters with the
 * `graphty.styles` block as a comment line.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { GraphBuilder, type GraphSnapshot } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import { PAJEK_ISSUE, PAJEK_STYLE_COMMENT } from "../../../src/formats/pajek/index.js";
import { createRegistry } from "../../../src/registry.js";
import {
    type ExtractedStyles,
    featuresOf,
    planStyles,
    resolveStyles,
    styleFingerprint,
    type StyleProperty,
    type StyleRule,
    type StyleTarget,
} from "../../../src/styles/internal.js";
import { editPajekVertexFill, replacePajekBlock } from "../../styles/formats/pajek.js";

const registry = createRegistry();
const CORPUS = resolve(import.meta.dirname, "../../corpus/styles/pajek");
const GENERATED = join(CORPUS, "generated");

/**
 * Imports a Pajek document with its styles.
 * @param doc - the document
 * @param toolDefaults - whether Pajek's defaults are added
 * @returns the import result, with styles
 */
async function load(doc: string | Uint8Array, toolDefaults = true) {
    const result = await registry.importGraph(doc, {
        format: "pajek",
        styles: { toolDefaults },
        errorLimit: Infinity,
    });
    if (result.styles === null || result.styles === undefined) {
        throw new Error("no styles");
    }
    return { ...result, styles: result.styles };
}

/**
 * What graphty draws for one property of every element.
 * @param ex - the styles
 * @param snapshot - the graph
 * @param target - nodes or edges
 * @param property - the property
 * @returns the values by element index
 */
function drawn(ex: ExtractedStyles, snapshot: GraphSnapshot, target: StyleTarget, property: string) {
    return resolveStyles(ex, target, property as StyleProperty, snapshot);
}

const file = (name: string): Uint8Array => new Uint8Array(readFileSync(join(GENERATED, name)));
const text = (name: string): string => readFileSync(join(GENERATED, name), "utf8");
const plain = (ex: ExtractedStyles): StyleRule[] => JSON.parse(JSON.stringify(ex.styles.rules)) as StyleRule[];
const codes = (ex: ExtractedStyles): string[] => ex.styles.notes.map((n) => n.code);

describe("Pajek styles: Pajek's rules", () => {
    it("reads the shape keyword and the vertex parameters as relative sizes", async () => {
        const { snapshot, styles } = await load(file("shapes-and-lines.net"));
        expect(styles.styles.source).toEqual({ format: "pajek", dialect: "dvips", tool: "pajek" });
        expect(styles.styles.units.length).toBe("relative");
        expect(drawn(styles, snapshot, "node", "shape")).toEqual([
            "ellipse",
            "rectangle",
            "diamond",
            "triangle",
            "other:cross",
            "none",
        ]);
        expect(drawn(styles, snapshot, "node", "fill").slice(0, 4)).toEqual([
            "#ff804d",
            "#61ffe0",
            "#ff8a80",
            "#db9470",
        ]);
        expect(drawn(styles, snapshot, "node", "width").slice(0, 4)).toEqual([4, 4, 6, 8]);
        expect(drawn(styles, snapshot, "node", "height").slice(0, 4)).toEqual([2, 4, 2, 2]);
        expect(drawn(styles, snapshot, "node", "labelColor").slice(0, 3)).toEqual(["#0f75ff", "#000000", "#660000"]);
        expect(drawn(styles, snapshot, "node", "labelSize").slice(0, 3)).toEqual([16, 16, null]);
        expect(drawn(styles, snapshot, "node", "borderWidth")[1]).toBe(2);
        // `cross` has no name in the neutral vocabulary: kept as other:cross and noted
        expect(codes(styles)).toEqual(["W_STYLE_UNKNOWN_VALUE"]);
    });

    it("reads line color, width and pattern, with black solid lines and an arrow on arcs by default", async () => {
        const { snapshot, styles } = await load(file("shapes-and-lines.net"));
        const key = (e: number): string =>
            `${String(snapshot.ids.idOf(snapshot.edgeSource(e)))}-${String(snapshot.ids.idOf(snapshot.edgeTarget(e)))}`;
        const byEdge = (property: string): Record<string, unknown> =>
            Object.fromEntries(drawn(styles, snapshot, "edge", property).map((v, e) => [key(e), v]));
        expect(byEdge("color")).toMatchObject({ "1-1": "#0000ff", "4-2": "#ff0000", "3-5": "#000000" });
        expect(byEdge("width")).toMatchObject({ "1-1": 3, "3-5": 1.5, "1-2": 2 });
        expect(byEdge("lineStyle")).toMatchObject({
            "4-2": "dotted",
            "3-5": "solid",
            "1-2": "dotted",
            "5-6": "dashed",
            "1-1": "solid",
        });
        // arcs get Pajek's arrow at the target; edges (each kept as a pair) none
        expect(byEdge("targetArrow")).toMatchObject({ "1-1": "triangle", "4-2": "triangle", "1-2": "none" });
        expect(new Set(drawn(styles, snapshot, "edge", "sourceArrow"))).toEqual(new Set(["none"]));
    });

    it("reads every color form Pajek documents: names, GrayNN, RGB and CMYK in hex and decimals", async () => {
        const { snapshot, styles } = await load(file("color-forms.net"));
        expect(drawn(styles, snapshot, "node", "fill")).toEqual([
            "#616ec4",
            "#ffff00",
            "#ff8000",
            "#33cc99",
            "#404040",
            "#ffff99",
            null,
            null,
        ]);
        expect(drawn(styles, snapshot, "node", "borderColor").slice(0, 3)).toEqual(["#000000", "#00ffff", "#cccccc"]);
        expect(drawn(styles, snapshot, "edge", "color")).toEqual([
            "#0000ff",
            "#a60000",
            "#ff0033",
            "#808080",
            "#000000",
        ]);
        const bad = styles.styles.notes.find((n) => n.code === "W_STYLE_BAD_VALUE");
        expect(bad?.params.samples).toEqual(["RGB(2,0,0)"]);
    });

    it("reads Pajek's own color names, which dvips lacks, as the manual's color table draws them", async () => {
        const names = {
            LightYellow: "#ffff99",
            LightCyan: "#ccffff",
            LightMagenta: "#ffccff",
            LightPurple: "#ccccff",
            LightGreen: "#ccffb3",
            LightOrange: "#ffccb3",
            Canary: "#ffff7f",
            LFadedGreen: "#e6ffcc",
            Pink: "#ffd9f3",
            LSkyBlue: "#d9f3ff",
        };
        const lines = Object.keys(names).map((name, i) => `${String(i + 1)} "${name}" ic ${name}`);
        const { snapshot, styles } = await load(`*Vertices ${String(lines.length)}\n${lines.join("\n")}\n`);
        expect(drawn(styles, snapshot, "node", "fill")).toEqual(Object.values(names));
        expect(codes(styles)).toEqual([]);
    });

    it("gives a file without parameters Pajek's defaults, and none with toolDefaults: false", async () => {
        const doc = "*Vertices 3\n1 a\n2 b\n3 c\n*Arcs\n1 2\n*Edges\n2 3\n";
        const { snapshot, styles } = await load(doc);
        expect(new Set(drawn(styles, snapshot, "node", "shape"))).toEqual(new Set(["ellipse"]));
        expect(drawn(styles, snapshot, "node", "fill")).toEqual([null, null, null]);
        expect(new Set(drawn(styles, snapshot, "node", "borderColor"))).toEqual(new Set(["#000000"]));
        expect(new Set(drawn(styles, snapshot, "node", "borderWidth"))).toEqual(new Set([1]));
        expect(new Set(drawn(styles, snapshot, "node", "labelColor"))).toEqual(new Set(["#000000"]));
        expect(new Set(drawn(styles, snapshot, "node", "labelPosition"))).toEqual(new Set(["center"]));
        expect(new Set(drawn(styles, snapshot, "edge", "color"))).toEqual(new Set(["#000000"]));
        expect(new Set(drawn(styles, snapshot, "edge", "width"))).toEqual(new Set([1]));
        expect(drawn(styles, snapshot, "edge", "targetArrow")).toEqual(["triangle", "none", "none"]);
        const bare = await load(doc, false);
        expect(bare.styles.styles.rules.filter((r) => r.origin === "tool")).toEqual([]);
        expect(drawn(bare.styles, bare.snapshot, "node", "shape")).toEqual([null, null, null]);
        for (const property of ["borderColor", "borderWidth", "labelColor", "labelPosition"]) {
            expect(drawn(bare.styles, bare.snapshot, "node", property)).toEqual([null, null, null]);
        }
        expect(drawn(bare.styles, bare.snapshot, "edge", "width")).toEqual([null, null, null]);
    });

    it("keeps a vertex's or line's own parameters above Pajek's defaults", async () => {
        const doc = "*Vertices 2\n1 a bc Red bw 3 lc Blue\n2 b\n*Edges\n1 2 1 w 4\n";
        const { snapshot, styles } = await load(doc);
        expect(drawn(styles, snapshot, "node", "borderColor")).toEqual(["#ff0000", "#000000"]);
        expect(drawn(styles, snapshot, "node", "borderWidth")).toEqual([3, 1]);
        expect(drawn(styles, snapshot, "node", "labelColor")).toEqual(["#0000ff", "#000000"]);
        expect(new Set(drawn(styles, snapshot, "edge", "width"))).toEqual(new Set([4]));
    });
});

describe("Pajek files that failed to read before", () => {
    it("keeps every vertex's label, position and style when Pajek wrote a trailing 0, and every edge", async () => {
        const { snapshot, styles, report } = await load(file("b98-trailing-zero.net"));
        expect(report.counts.skippedNodes).toBe(0);
        expect(report.counts.skippedEdges).toBe(0);
        expect(report.issues.map((i) => i.code)).toEqual([PAJEK_ISSUE.TRAILING_VALUE]);
        expect(snapshot.nodeCount).toBe(12);
        // 10 arcs and 8 edges, each edge kept as a directed pair
        expect(snapshot.edgeCount).toBe(26);
        const labels = snapshot.nodes.byRole("label");
        expect(Array.from({ length: 12 }, (_, i) => labels?.value(i))).toEqual(
            Array.from({ length: 12 }, (_, i) => String(i + 1)),
        );
        const fills = drawn(styles, snapshot, "node", "fill");
        expect(fills.filter((v) => v !== null)).toHaveLength(8);
        expect(drawn(styles, snapshot, "node", "width")[0]).toBe(19);
    });

    it("keeps a line whose value is NaN, without a value", async () => {
        const { snapshot, report } = await load(file("nan-values.net"));
        expect(snapshot.edgeCount).toBe(16);
        expect(report.counts.skippedEdges).toBe(0);
        expect(report.issues.map((i) => i.code)).toEqual([PAJEK_ISSUE.NAN_VALUE]);
        const weights = snapshot.edges.byRole("weight");
        const loop = Array.from({ length: snapshot.edgeCount }, (_, e) => e).find(
            (e) => snapshot.edgeSource(e) === 0 && snapshot.edgeTarget(e) === 0,
        );
        expect(loop).toBeDefined();
        expect(weights?.isSet(loop ?? -1)).toBe(false);
    });

    it("reads a shape keyword written among the parameters, as Pajek does", async () => {
        const { snapshot, styles, report } = await load(
            '*Vertices 2\n1 "a" ic Red triangle\n2 "b" box bc Blue\n*Edges\n',
        );
        expect(report.issues).toEqual([]);
        expect(drawn(styles, snapshot, "node", "shape")).toEqual(["triangle", "rectangle"]);
        expect(drawn(styles, snapshot, "node", "fill")).toEqual(["#ff0000", null]);
    });
});

describe("Pajek styles: writing", () => {
    it("writes the shape keyword and parameters and reads back the same rules and values", async () => {
        const { snapshot, styles } = await load(file("shapes-and-lines.net"));
        const out = await registry.exportGraphToString(snapshot, "pajek", { styles });
        expect(out.startsWith(PAJEK_STYLE_COMMENT)).toBe(true);
        expect(out).toMatch(/^2 square 0\.8 0\.25 0\.5 box ic SkyBlue x_fact 4\.0 y_fact 4\.0 fos 16\.0 bw 2\.0$/m);
        expect(out).toContain("4 2 -1 l dotted c Red p Dots");
        const back = await load(out);
        expect(back.styles.styles.source.tool).toBe("graphty");
        expect(plain(back.styles)).toEqual(plain(styles));
        for (const [target, property] of [
            ["node", "shape"],
            ["node", "fill"],
            ["node", "width"],
            ["node", "labelColor"],
            ["edge", "color"],
            ["edge", "lineStyle"],
            ["edge", "targetArrow"],
        ] as const) {
            expect(drawn(back.styles, back.snapshot, target, property)).toEqual(
                drawn(styles, snapshot, target, property),
            );
        }
    });

    it("leaves out what Pajek draws by default: a black border 1 wide, a black label, lines 1 wide", async () => {
        const doc = "*Vertices 2\n1 a bc Black bw 1 lc Black\n2 b bc Red bw 2 lc Blue\n*Edges\n1 2 1 w 1\n";
        const { snapshot, styles } = await load(doc);
        const out = await registry.exportGraphToString(snapshot, "pajek", { styles });
        expect(out).toMatch(/^1 a$/m);
        expect(out).toMatch(/^2 b bc Red lc Blue bw 2\.0$/m);
        expect(out).toMatch(/^1 2 1$/m);
        const again = await load(out.replace(/^% graphty\.styles .*\n/, ""));
        for (const property of ["borderColor", "borderWidth", "labelColor"]) {
            expect(drawn(again.styles, again.snapshot, "node", property)).toEqual(
                drawn(styles, snapshot, "node", property),
            );
        }
        expect(drawn(again.styles, again.snapshot, "edge", "width")).toEqual([1]);
    });

    it("reads a file without the comment line by inference, as any Pajek file", async () => {
        const { snapshot, styles } = await load(file("shapes-and-lines.net"));
        const out = await registry.exportGraphToString(snapshot, "pajek", { styles });
        const withoutBlock = out.replace(/^% graphty\.styles .*\n/, "");
        expect(withoutBlock).not.toContain("graphty.styles");
        const again = await load(withoutBlock);
        expect(again.styles.styles.source.tool).toBe("pajek");
        for (const property of ["shape", "fill", "width", "height", "labelColor", "labelSize", "borderWidth"]) {
            expect(drawn(again.styles, again.snapshot, "node", property)).toEqual(
                drawn(styles, snapshot, "node", property),
            );
        }
        // the dashed line is written as Dots, the nearest pattern Pajek has
        expect(drawn(again.styles, again.snapshot, "edge", "color")).toEqual(drawn(styles, snapshot, "edge", "color"));
    });

    it("writes colors exactly and reports what Pajek can only approximate, keeping it exact in the block", async () => {
        const b = new GraphBuilder({ directed: true });
        b.addNode("a");
        b.addNode("b");
        b.addEdge("a", "b");
        const g = b.freeze();
        const styles = planStyles(
            {
                format: "test",
                node: {
                    values: {
                        shape: ["hexagon", "rectangle"],
                        fill: ["#123456", "#ff0000"],
                        fillOpacity: [0.5, null],
                    },
                },
                edge: { values: { lineStyle: ["zigzag"], sourceArrow: ["diamond"] } },
                fingerprint: styleFingerprint(g),
            },
            { node: featuresOf(g, "node"), edge: featuresOf(g, "edge") },
        );
        const losses = registry.checkExport(g, "pajek", { styles });
        expect(
            losses
                .filter((l) => l.code === "W_STYLE_APPROXIMATED")
                .map((l) => [l.style?.target, l.style?.property, l.count])
                .sort(),
        ).toEqual([
            ["edge", "lineStyle", 1],
            ["edge", "sourceArrow", 1],
            ["node", "fillOpacity", 1],
            ["node", "shape", 1],
        ]);
        expect(losses.filter((l) => l.code === "W_STYLE_NOT_WRITTEN")).toEqual([]);
        const out = await registry.exportGraphToString(g, "pajek", { styles });
        // a color with a dvips name is written by it, any other as RGBrrggbb; the ids are kept for the block
        expect(out).toContain("1 a ic RGB123456 graphty_originalId a\n");
        expect(out).toContain("2 b box ic Red graphty_originalId b\n");
        const back = await load(out);
        expect(drawn(back.styles, back.snapshot, "node", "shape")).toEqual(["hexagon", "rectangle"]);
        expect(drawn(back.styles, back.snapshot, "node", "fill")).toEqual(["#123456", "#ff0000"]);
        expect(drawn(back.styles, back.snapshot, "node", "fillOpacity")).toEqual([0.5, null]);
        expect(drawn(back.styles, back.snapshot, "edge", "lineStyle")).toEqual(["zigzag"]);
    });

    it("writes the same file without styles as before", async () => {
        const doc = text("shapes-and-lines.net");
        const { snapshot } = await load(doc);
        const out = await registry.exportGraphToString(snapshot, "pajek");
        expect(out).not.toContain("graphty.styles");
        expect(out).toMatch(/^4 wedge 0\.85 0\.8 0\.5 triangle x_fact 8 y_fact 2 ic Tan lc Black lr 30 lphi 200$/m);
    });
});

/** The block-tamper fixtures: a file graphty wrote, then edited outside as design 10.7 items 4 and 5 describe. */
async function tamperFixtures(): Promise<Record<string, Uint8Array>> {
    const base = await load(file("shapes-and-lines.net"));
    const written = await registry.exportGraphToBytes(base.snapshot, "pajek", { styles: base.styles });
    const decoded = new TextDecoder().decode(written);
    const added = decoded.replace(/^\*Vertices 6$/m, "*Vertices 7").replace(/^(\*Arcs)$/m, '7 "extra"\n$1');
    return {
        "graphty-written.net": written,
        "tamper-native-edited.net": editPajekVertexFill(written) ?? new Uint8Array(),
        "tamper-block-truncated.net": replacePajekBlock(written, (block) =>
            block.slice(0, Math.floor(block.length / 2)),
        ),
        "tamper-node-added.net": new TextEncoder().encode(added),
    };
}

describe("Pajek block tamper fixtures", () => {
    it("are the edits they say they are (UPDATE_PAJEK_TAMPER=1 writes them again)", async () => {
        for (const [name, bytes] of Object.entries(await tamperFixtures())) {
            const path = join(GENERATED, name);
            if (process.env.UPDATE_PAJEK_TAMPER === "1") {
                writeFileSync(path, bytes);
            }
            expect(text(name)).toBe(new TextDecoder().decode(bytes));
        }
    });

    it("bring an outside edit back as one exception over the same rules", async () => {
        const unedited = await load(file("graphty-written.net"));
        const edited = await load(file("tamper-native-edited.net"));
        const below = (ex: ExtractedStyles): unknown => plain(ex).filter((r) => r.role !== "exceptions");
        expect(below(edited.styles)).toEqual(below(unedited.styles));
        const excepted = (ex: ExtractedStyles): number =>
            (ex.columns.node.get("exceptions.fill") ?? []).filter((v) => v !== null).length;
        expect(excepted(edited.styles)).toBe(excepted(unedited.styles) + 1);
        expect(edited.styles.columns.node.get("exceptions.fill")).toContain("#123456");
    });

    it("ignore a truncated block and a block for another graph with a note, and read Pajek's parameters", async () => {
        for (const [name, reason] of [
            ["tamper-block-truncated.net", "NOT_JSON"],
            ["tamper-node-added.net", "FINGERPRINT"],
        ] as const) {
            const { snapshot, styles } = await load(file(name));
            const note = styles.styles.notes.find((n) => n.code === "W_STYLE_BLOCK_IGNORED");
            expect(note?.params.samples).toEqual([reason]);
            expect(styles.styles.source.tool).toBe("pajek");
            expect(drawn(styles, snapshot, "node", "fill")).toContain("#61ffe0");
        }
    });
});
