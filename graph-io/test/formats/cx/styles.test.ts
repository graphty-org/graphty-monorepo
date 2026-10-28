/**
 * CX version 1 styles: the first view's `cyVisualProperties` and the element bypasses read the way Cytoscape draws
 * them, the prototype's values on the conformance fixtures, the same NDEx network read from CX and from CX2 giving
 * the same values, and the writer: a Cytoscape style, bypasses, the `graphty.styles` aspect, and the files graphty
 * wrote read back, edited and tampered with.
 */

import { readFileSync } from "node:fs";
import { basename, resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { createRegistry } from "../../../src/registry.js";
import { type ExtractedStyles, resolveStyles, type StyleRule, type StyleValue } from "../../../src/styles/internal.js";
import { importForStyles, readCorpusFile, styleTruth } from "../../styles/harness.js";

const registry = createRegistry();
const STYLES = resolve(import.meta.dirname, "../../corpus/styles");
const FIXTURES = resolve(import.meta.dirname, "../../conformance/fixtures");
const GOLDEN = JSON.parse(readFileSync(resolve(import.meta.dirname, "../../styles/cytoscape-golden.json"), "utf8")) as {
    files: Record<string, Record<"node" | "edge", Record<string, [StyleValue | null, number][]>>>;
};

const load = async (input: string | Uint8Array): Promise<Awaited<ReturnType<typeof registry.importGraph>>> =>
    registry.importGraph(typeof input === "string" ? new TextEncoder().encode(input) : input, {
        format: "cx",
        styles: true,
    });

const corpus = (name: string): Uint8Array => readCorpusFile(resolve(STYLES, name)).bytes;

const STYLED = JSON.stringify([
    {
        nodes: [
            { "@id": 1, n: "a" },
            { "@id": 2, n: "b" },
            { "@id": 3, n: "c" },
        ],
    },
    { edges: [{ "@id": 10, s: 1, t: 2 }] },
    {
        nodeAttributes: [
            { po: 1, n: "kind", v: "x" },
            { po: 2, n: "kind", v: "y" },
        ],
    },
    {
        cyVisualProperties: [
            { properties_of: "network", properties: { NETWORK_BACKGROUND_PAINT: "#EEEEEE" } },
            {
                properties_of: "nodes:default",
                properties: { NODE_SHAPE: "TRIANGLE", NODE_WIDTH: "20" },
                mappings: { NODE_FILL_COLOR: { type: "DISCRETE", definition: "COL=kind,T=string,K=0=x,V=0=#FF0000" } },
            },
            { properties_of: "edges:default", properties: { EDGE_WIDTH: "3" } },
            { properties_of: "nodes", applies_to: 2, properties: { NODE_SHAPE: "DIAMOND" } },
        ],
    },
    { status: [{ error: "", success: true }] },
]);

const byId = (
    ex: ExtractedStyles,
    snapshot: Awaited<ReturnType<typeof load>>["snapshot"],
    p: "fill" | "shape" | "width",
): Record<string, unknown> =>
    Object.fromEntries(resolveStyles(ex, "node", p, snapshot).map((v, i) => [String(snapshot.ids.idOf(i)), v]));

describe("reading CX styles", () => {
    it("reads the view's defaults, mappings, bypasses and background, Cytoscape's default style beneath", async () => {
        const { snapshot, styles } = await load(STYLED);
        const ex = styles as ExtractedStyles;
        expect(ex.styles.source).toEqual({ format: "cx", dialect: "cytoscape", tool: "cytoscape" });
        expect(byId(ex, snapshot, "fill")).toEqual({ 1: "#ff0000", 2: "#89d0f5", 3: "#89d0f5" });
        expect(byId(ex, snapshot, "shape")).toEqual({ 1: "triangle", 2: "diamond", 3: "triangle" });
        expect(resolveStyles(ex, "edge", "width", snapshot)).toEqual([3]);
        expect(ex.styles.graph.background).toBe("#eeeeee");
        // Cytoscape measures each word with the space after it when it wraps a label at its width
        expect(resolveStyles(ex, "node", "labelWrapTrailingSpace", snapshot)).toEqual([true, true, true]);
    });

    it("draws the specimen sheet's unmapped edges in #404040 under arrowColorMatchesEdge, as Cytoscape does", async () => {
        const bytes = readFileSync(
            resolve(import.meta.dirname, "../../fidelity/specimens/cx/specimen-mappings-bypass.cx"),
        );
        const { snapshot, styles } = await load(new Uint8Array(bytes));
        const ex = styles as ExtractedStyles;
        const name = snapshot.edges.get("name");
        const color = resolveStyles(ex, "edge", "color", snapshot);
        const arrow = resolveStyles(ex, "edge", "targetArrowColor", snapshot);
        const of = (edge: string): [unknown, unknown] => {
            const e = Array.from({ length: snapshot.edgeCount }, (_, i) => i).find((i) => name?.value(i) === edge);
            return e === undefined ? [undefined, undefined] : [color[e], arrow[e]];
        };
        expect(of("edge-default")).toEqual(["#404040", "#404040"]);
        expect(of("discrete-line-type-dashed")).toEqual(["#404040", "#404040"]);
        // the stroke's passthrough is not drawn under the dependency; a stroke bypass draws the line alone
        expect(of("passthrough-edge-color-d62728")).toEqual(["#404040", "#404040"]);
        expect(of("bypass-over-edge-passthrough")).toEqual(["#9467bd", "#404040"]);
    });

    it("reads the first view of a file with several and notes the others", async () => {
        const { styles } = await load(new Uint8Array(readFileSync(resolve(FIXTURES, "cx/cx2js/5views1network.cx"))));
        const note = (styles as ExtractedStyles).styles.notes.find((n) => n.code === "W_STYLE_OTHER_VIEWS");
        expect(note?.params.count).toBe(4);
    });

    const keys = Object.keys(GOLDEN.files).filter((k) => k.startsWith("cx/"));
    it.each(keys)("reads %s as the prototype resolved it", async (key) => {
        const path = resolve(FIXTURES, key);
        const loaded = await importForStyles(registry, "cx", new Uint8Array(readFileSync(path)), {
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

describe("one NDEx network read from CX and from CX2", () => {
    // NDEx's CX-to-CX2 conversion of 821a7310 carried NODE_WIDTH and NODE_HEIGHT mappings that Cytoscape ignores in
    // the CX file (nodeSizeLocked, NODE_SIZE 12) and folded NODE_SIZE into NODE_WIDTH, where the CX2 reader follows
    // the mapping: the two files draw different node sizes, and with them where a label pinned to a node's side sits
    // (its offset). The conversion also dropped the CX file's white NODE_LABEL_BACKGROUND_SHAPE ROUND_RECTANGLE box
    // behind every label, which Cytoscape draws from the CX file and the CX2 file no longer has.
    it.each([
        [
            "ndex-821a7310-beb6-11ed-a79c-005056ae23aa",
            [
                "height",
                "labelBackground",
                "labelBackgroundOpacity",
                "labelCornerRadius",
                "labelOffsetX",
                "labelOffsetY",
                "width",
            ],
        ],
        ["ndex-90f78bcd-1dd0-11ef-9621-005056ae23aa", []],
        ["ndex-da86cc1f-9544-11e5-b435-06603eb7f303", []],
        ["ndex-f5fd4274-a8c1-11e8-9520-0ac135e8bacf", []],
    ])("%s gives every node the same values, except %j", async (name, differ) => {
        const file = (format: string): Uint8Array => {
            for (const ext of ["", ".gz"]) {
                try {
                    return corpus(`${format}/${name}.${format}${ext}`);
                } catch {
                    // the other spelling
                }
            }
            throw new Error(`${name}.${format} is not in the corpus`);
        };
        const cx = await load(file("cx"));
        const cx2 = await registry.importGraph(file("cx2"), { format: "cx2", styles: true });
        expect(cx2.snapshot.nodeCount).toBe(cx.snapshot.nodeCount);
        const properties = new Set(
            [...(cx.styles?.styles.rules ?? []), ...(cx2.styles?.styles.rules ?? [])]
                .filter((r) => r.target === "node")
                .flatMap((r) => [...Object.keys(r.set ?? {}), ...Object.keys(r.map ?? {})]),
        );
        expect(properties.size).toBeGreaterThan(0);
        const values = (r: typeof cx, p: string): string => {
            const col = resolveStyles(r.styles as ExtractedStyles, "node", p as "fill", r.snapshot);
            return JSON.stringify([...col.keys()].map((i) => [String(r.snapshot.ids.idOf(i)), col[i]]).sort());
        };
        const differing = [...properties].filter((p) => values(cx, p) !== values(cx2, p)).sort();
        expect(differing).toEqual(differ);
    });
});

describe("writing CX styles", () => {
    const rules = (x: ExtractedStyles | null | undefined): StyleRule[] =>
        JSON.parse(JSON.stringify(x?.styles.rules ?? [])) as StyleRule[];

    it("writes a Cytoscape style, bypasses and the block that read back as the same rules and values", async () => {
        const first = await load(STYLED);
        const ex = first.styles as ExtractedStyles;
        const text = await registry.exportGraphToString(first.snapshot, "cx", { styles: ex });
        const written = JSON.parse(text) as Record<string, unknown[]>[];
        expect(written.map((a) => Object.keys(a)[0])).toContain("graphty.styles");
        expect(JSON.stringify(written.find((a) => "networkAttributes" in a) ?? {})).not.toContain("graphty.styles");
        const back = await load(text);
        expect(back.styles?.styles.source.tool).toBe("graphty");
        expect(rules(back.styles)).toEqual(rules(ex));
        for (const p of ["fill", "shape", "width"] as const) {
            expect(byId(back.styles as ExtractedStyles, back.snapshot, p)).toEqual(byId(ex, first.snapshot, p));
        }
        // without the block, Cytoscape's own reading of the file draws the same values
        const bare = written.filter((a) => !("graphty.styles" in a));
        const native = await load(JSON.stringify(bare));
        expect(native.styles?.styles.source.tool).toBe("cytoscape");
        for (const p of ["fill", "shape", "width"] as const) {
            expect(byId(native.styles as ExtractedStyles, native.snapshot, p)).toEqual(byId(ex, first.snapshot, p));
        }
    });
});

describe("CX files graphty wrote", () => {
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

    it("read their own rules back, and a fill another program changed as one more exception", async () => {
        const written = await load(corpus("cx/generated/graphty-written.cx"));
        expect(written.styles?.styles.source.tool).toBe("graphty");
        expect(ignored(written.styles)).toBeUndefined();
        const edited = await load(corpus("cx/generated/graphty-written-native-edit.cx"));
        expect(exceptions(edited.styles as ExtractedStyles)).toBe(exceptions(written.styles as ExtractedStyles) + 1);
    });

    it("ignore a truncated block and a block written for another graph, and read the file's own style", async () => {
        const truncated = await load(corpus("cx/generated/graphty-written-block-truncated.cx"));
        expect(ignored(truncated.styles)).toBe("NOT_JSON");
        expect(truncated.styles?.styles.source.tool).toBe("cytoscape");
        const other = await load(corpus("cx/generated/graphty-written-block-other-graph.cx"));
        expect(ignored(other.styles)).toBe("FINGERPRINT");
        expect(other.styles?.styles.source.tool).toBe("cytoscape");
    });
});
