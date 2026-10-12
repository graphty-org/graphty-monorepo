/**
 * CX2 styles: the file's defaults, mappings, dependencies, background and bypasses read the way Cytoscape draws them,
 * Cytoscape desktop's default style beneath, the prototype's values on the conformance fixtures, and the writer:
 * a Cytoscape style, bypasses, the `graphty.styles` aspect, and the files graphty wrote read back, edited and
 * tampered with.
 */

import { readFileSync } from "node:fs";
import { basename, resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { createRegistry } from "../../../src/registry.js";
import { type ExtractedStyles, resolveStyles, type StyleRule, type StyleValue } from "../../../src/styles/internal.js";
import { importForStyles, styleTruth } from "../../styles/harness.js";

const registry = createRegistry();
const CORPUS = resolve(import.meta.dirname, "../../corpus/styles/cx2");
const FIXTURES = resolve(import.meta.dirname, "../../conformance/fixtures");
const GOLDEN = JSON.parse(readFileSync(resolve(import.meta.dirname, "../../styles/cytoscape-golden.json"), "utf8")) as {
    files: Record<string, Record<"node" | "edge", Record<string, [StyleValue | null, number][]>>>;
};

const load = async (input: string | Uint8Array): Promise<Awaited<ReturnType<typeof registry.importGraph>>> =>
    registry.importGraph(typeof input === "string" ? new TextEncoder().encode(input) : input, {
        format: "cx2",
        styles: true,
    });

const corpus = (name: string): Uint8Array => new Uint8Array(readFileSync(resolve(CORPUS, name)));

/** A CX2 document of three nodes and one edge, with the given style aspects. */
function doc(style: Record<string, unknown>[]): string {
    return JSON.stringify([
        { CXVersion: "2.0", hasFragments: false },
        { attributeDeclarations: [{ nodes: { kind: { d: "string" } } }] },
        { nodes: [{ id: 1, v: { kind: "a" } }, { id: 2, v: { kind: "b" } }, { id: 3 }] },
        { edges: [{ id: 0, s: 1, t: 2 }] },
        ...style,
        { status: [{ error: "", success: true }] },
    ]);
}

const STYLED = doc([
    {
        visualProperties: [
            {
                default: {
                    network: { NETWORK_BACKGROUND_COLOR: "#EEEEEE" },
                    node: { NODE_SHAPE: "triangle", NODE_WIDTH: 20 },
                    edge: { EDGE_WIDTH: 3 },
                },
                nodeMapping: {
                    NODE_BACKGROUND_COLOR: {
                        type: "DISCRETE",
                        definition: { attribute: "kind", map: [{ v: "a", vp: "#FF0000" }] },
                    },
                },
                edgeMapping: {},
            },
        ],
    },
    { visualEditorProperties: [{ properties: { nodeSizeLocked: false, arrowColorMatchesEdge: false } }] },
    { nodeBypasses: [{ id: 2, v: { NODE_SHAPE: "diamond" } }] },
]);

const byId = (
    ex: ExtractedStyles,
    snapshot: Awaited<ReturnType<typeof load>>["snapshot"],
    p: "fill" | "shape" | "width",
): Record<string, unknown> =>
    Object.fromEntries(resolveStyles(ex, "node", p, snapshot).map((v, i) => [String(snapshot.ids.idOf(i)), v]));

describe("reading CX2 styles", () => {
    it("reads defaults, mappings, bypasses and the background, Cytoscape's default style beneath", async () => {
        const { snapshot, styles, report } = await load(STYLED);
        const ex = styles as ExtractedStyles;
        expect(ex.styles.source).toEqual({ format: "cx2", dialect: "cytoscape", tool: "cytoscape" });
        expect(byId(ex, snapshot, "fill")).toEqual({ 1: "#ff0000", 2: "#89d0f5", 3: "#89d0f5" });
        expect(byId(ex, snapshot, "shape")).toEqual({ 1: "triangle", 2: "diamond", 3: "triangle" });
        expect(byId(ex, snapshot, "width")).toEqual({ 1: 20, 2: 20, 3: 20 });
        expect(resolveStyles(ex, "edge", "width", snapshot)).toEqual([3]);
        expect(ex.styles.graph.background).toBe("#eeeeee");
        expect(report.issues.map((i) => i.code)).not.toContain("W_STYLES_NOT_IMPORTED");
    });

    it("gives a file with no style Cytoscape desktop's default style, and none under toolDefaults: false", async () => {
        const { snapshot, styles } = await load(doc([]));
        expect(byId(styles as ExtractedStyles, snapshot, "fill")).toEqual({ 1: "#89d0f5", 2: "#89d0f5", 3: "#89d0f5" });
        const bare = await registry.importGraph(new TextEncoder().encode(STYLED), {
            format: "cx2",
            styles: { toolDefaults: false },
        });
        expect(byId(bare.styles as ExtractedStyles, bare.snapshot, "fill")).toEqual({ 1: "#ff0000", 2: null, 3: null });
    });

    it("still names the style it does not apply when styles are not asked for", async () => {
        const { report, styles } = await registry.importGraph(new TextEncoder().encode(STYLED), { format: "cx2" });
        expect(styles).toBeUndefined();
        expect(report.issues.map((i) => i.code)).toContain("W_STYLES_NOT_IMPORTED");
    });

    const keys = Object.keys(GOLDEN.files).filter((k) => k.endsWith(".cx2") || k.startsWith("cx2/"));
    it.each(keys)("reads %s as the prototype resolved it", async (key) => {
        const format = key.split("/")[0];
        const path = resolve(FIXTURES, key);
        const loaded = await importForStyles(registry, format, new Uint8Array(readFileSync(path)), {
            filename: basename(path),
        });
        const truth = styleTruth(loaded);
        for (const target of ["node", "edge"] as const) {
            const want = Object.fromEntries(
                Object.entries(GOLDEN.files[key][target]).map(([p, runs]) => [
                    p,
                    runs.flatMap(([v, k]) => new Array<StyleValue | null>(k).fill(v)),
                ]),
            );
            expect(truth?.[target] ?? {}).toEqual(want);
        }
    });
});

describe("writing CX2 styles", () => {
    const rules = (x: ExtractedStyles | null | undefined): StyleRule[] =>
        JSON.parse(JSON.stringify(x?.styles.rules ?? [])) as StyleRule[];

    it("writes a Cytoscape style, bypasses and the block that read back as the same rules and values", async () => {
        const first = await load(STYLED);
        const ex = first.styles as ExtractedStyles;
        const text = await registry.exportGraphToString(first.snapshot, "cx2", { styles: ex });
        const written = JSON.parse(text) as Record<string, unknown[]>[];
        const names = written.map((a) => Object.keys(a)[0]);
        expect(names).toContain("visualProperties");
        expect(names).toContain("graphty.styles");
        const back = await load(text);
        expect(back.styles?.styles.source.tool).toBe("graphty");
        expect(rules(back.styles)).toEqual(rules(ex));
        for (const p of ["fill", "shape", "width"] as const) {
            expect(byId(back.styles as ExtractedStyles, back.snapshot, p)).toEqual(byId(ex, first.snapshot, p));
        }
        // the block is an aspect, never a network attribute
        expect(back.snapshot.graph.get("graphty.styles")?.value(0)).toBeTypeOf("string");
        expect(JSON.stringify(written.find((a) => "networkAttributes" in a) ?? {})).not.toContain("graphty.styles");
    });

    it("writes what Cytoscape cannot say as a rule as bypasses, so Cytoscape alone draws the same values", async () => {
        const first = await load(STYLED);
        const ex = first.styles as ExtractedStyles;
        const text = await registry.exportGraphToString(first.snapshot, "cx2", { styles: ex });
        // drop the block: what is left is read as Cytoscape reads it
        const bare = (JSON.parse(text) as Record<string, unknown>[]).filter((a) => !("graphty.styles" in a));
        const native = await load(JSON.stringify(bare));
        expect(native.styles?.styles.source.tool).toBe("cytoscape");
        for (const p of ["fill", "shape", "width"] as const) {
            expect(byId(native.styles as ExtractedStyles, native.snapshot, p)).toEqual(byId(ex, first.snapshot, p));
        }
    });

    it("writes the file's own style back unchanged without styles", async () => {
        const { snapshot } = await registry.importGraph(new TextEncoder().encode(STYLED), { format: "cx2" });
        const text = await registry.exportGraphToString(snapshot, "cx2");
        const vp = (JSON.parse(text) as Record<string, unknown>[]).find((a) => "visualProperties" in a);
        expect(vp).toEqual(JSON.parse(STYLED).find((a: Record<string, unknown>) => "visualProperties" in a));
    });
});

describe("CX2 files graphty wrote", () => {
    const ignored = (ex: ExtractedStyles | null | undefined): unknown =>
        ex?.styles.notes.find((n) => n.code === "W_STYLE_BLOCK_IGNORED")?.params.samples[0];
    const exceptions = (ex: ExtractedStyles): number =>
        ex.styles.rules
            .filter((r) => r.role === "exceptions")
            .flatMap((r) => Object.values(r.map ?? {}))
            .reduce((n, m) => {
                const key = m !== undefined && "by" in m && "style" in m.by ? m.by.style : null;
                return n + (key === null ? 0 : (ex.columns.node.get(key) ?? []).filter((v) => v !== null).length);
            }, 0);

    it("read their own rules back", async () => {
        const { styles } = await load(corpus("generated/graphty-written.cx2"));
        expect(styles?.styles.source.tool).toBe("graphty");
        expect(ignored(styles)).toBeUndefined();
    });

    it("read a fill another program changed as one more exception", async () => {
        const written = await load(corpus("generated/graphty-written.cx2"));
        const edited = await load(corpus("generated/graphty-written-native-edit.cx2"));
        expect(edited.styles?.styles.source.tool).toBe("graphty");
        expect(exceptions(edited.styles as ExtractedStyles)).toBe(exceptions(written.styles as ExtractedStyles) + 1);
    });

    it("ignore a truncated block and a block written for another graph, and read the file's own style", async () => {
        const truncated = await load(corpus("generated/graphty-written-block-truncated.cx2"));
        expect(ignored(truncated.styles)).toBe("NOT_JSON");
        expect(truncated.styles?.styles.source.tool).toBe("cytoscape");
        const other = await load(corpus("generated/graphty-written-block-other-graph.cx2"));
        expect(ignored(other.styles)).toBe("FINGERPRINT");
        expect(other.styles?.styles.source.tool).toBe("cytoscape");
    });
});
