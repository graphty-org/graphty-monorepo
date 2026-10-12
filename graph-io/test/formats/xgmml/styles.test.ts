/**
 * XGMML styles: Cytoscape's resolved per-element values read from `<graphics>`, Cytoscape desktop's default style
 * beneath them, nesting limits, and the writer: `<graphics>` from what graphty draws, the `graphty.styles` block as
 * a graph `<att>`, and the files graphty wrote read back, edited and tampered with.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";

import { describe, expect, it } from "vitest";

import { XML_NESTING_CODE } from "../../../src/common/codes.js";
import { createRegistry } from "../../../src/registry.js";
import { type ExtractedStyles, resolveStyles, type StyleRule } from "../../../src/styles/index.js";
import { ImportError } from "../../../src/types.js";

const registry = createRegistry();
const CORPUS = resolve(import.meta.dirname, "../../corpus/styles/xgmml");

/**
 * A corpus file's bytes, decompressed when stored as `.gz`.
 * @param name - the file, relative to the XGMML style corpus
 * @returns the bytes
 */
function corpus(name: string): Uint8Array {
    const raw = readFileSync(resolve(CORPUS, name));
    return new Uint8Array(name.endsWith(".gz") ? gunzipSync(raw) : raw);
}

/**
 * Imports XGMML text or bytes with styles.
 * @param input - the file
 * @returns the import
 */
async function load(input: string | Uint8Array): Promise<Awaited<ReturnType<typeof registry.importGraph>>> {
    return registry.importGraph(typeof input === "string" ? new TextEncoder().encode(input) : input, {
        format: "xgmml",
        styles: true,
    });
}

const doc = (body: string, graph = ""): string =>
    `<?xml version="1.0"?>\n<graph label="g" directed="1" xmlns:cy="http://www.cytoscape.org" xmlns="http://www.cs.rpi.edu/XGMML">\n${graph}${body}</graph>\n`;

/**
 * Each element's value of a property, by id.
 * @param ex - the styles
 * @param snapshot - the graph
 * @param property - a node property
 * @returns id to value
 */
function nodeValues(
    ex: ExtractedStyles,
    snapshot: Awaited<ReturnType<typeof load>>["snapshot"],
    property: Parameters<typeof resolveStyles>[2],
): Record<string, unknown> {
    const values = resolveStyles(ex, "node", property, snapshot);
    return Object.fromEntries(values.map((v, i) => [String(snapshot.ids.idOf(i)), v]));
}

describe("reading XGMML styles", () => {
    const file = doc(
        `<node id="a" label="a"><graphics type="ELLIPSE" w="20" h="30" fill="#ff0000" outline="#000000" width="2">
            <att name="NODE_LABEL" value="Alpha" type="string"/>
        </graphics></node>
        <node id="b" label="b"><graphics fill="#00ff00"><att name="NODE_FILL_COLOR" value="#0000FF" type="string"/>
            <att name="lockedVisualProperties"><att name="NODE_SHAPE" value="DIAMOND" type="string"/></att>
        </graphics></node>
        <node id="c" label="c"/>
        <edge source="a" target="b"><graphics width="4" fill="#123456"/></edge>`,
        '<graphics><att name="NETWORK_BACKGROUND_PAINT" value="#EEEEEE" type="string"/></graphics>\n',
    );

    it("reads every element's graphics, the old spelling and visual property names alike, locked values on top", async () => {
        const { snapshot, styles } = await load(file);
        expect(styles).not.toBeNull();
        const ex = styles as ExtractedStyles;
        expect(ex.styles.source).toEqual({ format: "xgmml", dialect: "cytoscape", tool: "cytoscape" });
        expect(nodeValues(ex, snapshot, "fill")).toEqual({ a: "#ff0000", b: "#00ff00", c: "#89d0f5" });
        expect(nodeValues(ex, snapshot, "shape")).toEqual({ a: "ellipse", b: "diamond", c: "round-rectangle" });
        expect(nodeValues(ex, snapshot, "width")).toEqual({ a: 20, b: 75, c: 75 });
        expect(nodeValues(ex, snapshot, "label")).toMatchObject({ a: "Alpha" });
        expect(resolveStyles(ex, "edge", "width", snapshot)).toEqual([4]);
        expect(resolveStyles(ex, "edge", "color", snapshot)).toEqual(["#123456"]);
        expect(ex.styles.graph.background).toBe("#eeeeee");
    });

    it("leaves Cytoscape's defaults out when asked", async () => {
        const { snapshot, styles } = await registry.importGraph(new TextEncoder().encode(file), {
            format: "xgmml",
            styles: { toolDefaults: false },
        });
        const ex = styles as ExtractedStyles;
        expect(ex.styles.source.tool).toBeNull();
        expect(nodeValues(ex, snapshot, "fill").c).toBeNull();
    });

    it("notes graphics nested deeper than it reads", async () => {
        const depth = 20;
        const open = Array.from({ length: depth }, (_, k) => `<att name="level${String(k)}">`).join("");
        const nested = `${open}<att name="NODE_FILL_COLOR" value="#FF0000"/>${"</att>".repeat(depth)}`;
        const { styles } = await load(doc(`<node id="a"><graphics>${nested}</graphics></node>`));
        expect(styles?.styles.notes.map((n) => n.code)).toContain("W_STYLE_NESTING");
    });

    it("imports a file whose graphics are nested 20,000 deep, the graphics left out with a code", async () => {
        const depth = 20_000;
        const nested = `${'<att name="x">'.repeat(depth)}<att name="NODE_FILL_COLOR" value="#FF0000"/>${"</att>".repeat(depth)}`;
        const { snapshot, report } = await load(doc(`<node id="a"><graphics>${nested}</graphics></node>`));
        expect(snapshot.nodeCount).toBe(1);
        expect(report.issues.map((i) => [i.code, i.element])).toContainEqual(["E_COLUMN_TYPE", "graphics"]);
    });

    it("stops a file nested deeper than XML is read with a code, not a bare error", async () => {
        const depth = 100_001;
        const nested = `${'<att name="x">'.repeat(depth)}${"</att>".repeat(depth)}`;
        const err = await load(doc(`<node id="a"><graphics>${nested}</graphics></node>`)).catch((e: unknown) => e);
        expect(err).toBeInstanceOf(ImportError);
        expect((err as ImportError).issue?.code).toBe(XML_NESTING_CODE);
    });
});

describe("writing XGMML styles", () => {
    it("writes styles that read back as the same rules and the same value per element", async () => {
        const first = await load(corpus("sample_yeast_network.xgmml.gz"));
        const ex = first.styles as ExtractedStyles;
        const written = await registry.exportGraphToBytes(first.snapshot, "xgmml", { styles: ex });
        const back = await load(written);
        const rules = (x: ExtractedStyles | null | undefined): StyleRule[] =>
            JSON.parse(JSON.stringify(x?.styles.rules ?? [])) as StyleRule[];
        expect(back.styles?.styles.source.tool).toBe("graphty");
        expect(rules(back.styles)).toEqual(rules(ex));
        for (const property of ["fill", "shape", "width", "label", "borderWidth"] as const) {
            expect(resolveStyles(back.styles as ExtractedStyles, "node", property, back.snapshot)).toEqual(
                resolveStyles(ex, "node", property, first.snapshot),
            );
        }
        expect(resolveStyles(back.styles as ExtractedStyles, "edge", "color", back.snapshot)).toEqual(
            resolveStyles(ex, "edge", "color", first.snapshot),
        );
    });

    it("writes each element's values into its graphics, in both of Cytoscape's spellings", async () => {
        const { snapshot, styles } = await load(doc('<node id="a"><graphics type="TRIANGLE" fill="#ff0000"/></node>'));
        const text = await registry.exportGraphToString(snapshot, "xgmml", { styles: styles as ExtractedStyles });
        expect(text).toMatch(/<graphics[^>]* type="TRIANGLE"[^>]* fill="#FF0000"/);
        expect(text).toContain('<att name="NODE_FILL_COLOR" value="#FF0000" type="string"/>');
        expect(text).toContain('<att name="graphty.styles" value="{');
    });

    it("reports every property XGMML cannot hold before writing", async () => {
        const { snapshot, styles } = await load(doc('<node id="a"><graphics fill="#ff0000"/></node>'));
        const ex = styles as ExtractedStyles;
        const withOpacity: ExtractedStyles = {
            ...ex,
            styles: {
                ...ex.styles,
                rules: [
                    ...ex.styles.rules,
                    {
                        id: "node.dim",
                        target: "node",
                        role: "defaults",
                        origin: "declared",
                        where: { all: true },
                        set: { opacity: 0.5 },
                    },
                ],
            },
        };
        const losses = registry.checkExport(snapshot, "xgmml", { styles: withOpacity });
        expect(losses.filter((l) => l.code === "W_STYLE_NOT_WRITTEN").map((l) => l.style)).toEqual([
            { target: "node", property: "opacity" },
        ]);
        expect(losses.some((l) => l.code === "W_STYLE_RULES_NOT_KEPT")).toBe(false);
    });
    it("writes a block that reads back whole where backslashes are Cytoscape escapes", async () => {
        const { snapshot, styles } = await load(doc('<node id="a" label="x"><graphics fill="#ff0000"/></node>'));
        const ex = styles as ExtractedStyles;
        const label = String.raw`C:\new\top\N`;
        const withLabel: ExtractedStyles = {
            ...ex,
            styles: {
                ...ex.styles,
                rules: [
                    ...ex.styles.rules,
                    {
                        id: "node.path",
                        target: "node",
                        role: "defaults",
                        origin: "declared",
                        where: { all: true },
                        set: { label },
                    },
                ],
            },
        };
        const written = await registry.exportGraphToBytes(snapshot, "xgmml", { styles: withLabel });
        const back = await registry.importGraph(written, { format: "xgmml", styles: true, cytoscapeEscapes: true });
        expect(back.styles?.styles.notes.filter((n) => n.code === "W_STYLE_BLOCK_IGNORED")).toEqual([]);
        expect(back.styles?.styles.source.tool).toBe("graphty");
        expect(back.styles?.styles.rules.find((r) => r.id === "node.path")?.set?.label).toBe(label);
    });
});

describe("files graphty wrote", () => {
    const exceptions = (ex: ExtractedStyles): number =>
        ex.styles.rules
            .filter((r) => r.role === "exceptions")
            .flatMap((r) => Object.values(r.map ?? {}))
            .reduce((n, m) => {
                const key = m !== undefined && "by" in m && "style" in m.by ? m.by.style : null;
                return n + (key === null ? 0 : (ex.columns.node.get(key) ?? []).filter((v) => v !== null).length);
            }, 0);
    const ignored = (ex: ExtractedStyles | null | undefined): unknown =>
        ex?.styles.notes.find((n) => n.code === "W_STYLE_BLOCK_IGNORED")?.params.samples[0];

    it("read their own rules back", async () => {
        const { styles } = await load(corpus("generated/graphty-written.xgmml.gz"));
        expect(styles?.styles.source.tool).toBe("graphty");
        expect(ignored(styles)).toBeUndefined();
    });

    it("read a value another program changed as one more exception", async () => {
        const written = await load(corpus("generated/graphty-written.xgmml.gz"));
        const edited = await load(corpus("generated/graphty-written-native-edit.xgmml.gz"));
        expect(edited.styles?.styles.source.tool).toBe("graphty");
        expect(exceptions(edited.styles as ExtractedStyles)).toBe(exceptions(written.styles as ExtractedStyles) + 1);
    });

    it("ignore a truncated block, and a block written for another graph, and read the file's own values", async () => {
        const truncated = await load(corpus("generated/graphty-written-block-truncated.xgmml.gz"));
        expect(ignored(truncated.styles)).toBe("NOT_JSON");
        expect(truncated.styles?.styles.source.tool).toBe("cytoscape");
        const other = await load(corpus("generated/graphty-written-block-other-graph.xgmml.gz"));
        expect(ignored(other.styles)).toBe("FINGERPRINT");
        expect(other.styles?.styles.source.tool).toBe("cytoscape");
    });
});
