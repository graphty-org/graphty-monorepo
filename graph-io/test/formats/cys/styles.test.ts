/**
 * Cytoscape session styles: the style the imported network's view names, read from `session_vizmap.xml` with
 * Cytoscape's renderer fallbacks beneath it; a 2.x session's resolved values and hidden state; the writer's named
 * style, view bypasses and `graphty.styles` entry; and the sessions graphty wrote read back, edited and tampered with.
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { GraphBuilder } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import { keptForStyles } from "../../../src/common/report.js";
import { cysImporter } from "../../../src/formats/cys/index.js";
import type { SessionStyleSource } from "../../../src/formats/cys/styles.js";
import { cellAtt } from "../../../src/formats/cys/tables.js";
import { createRegistry } from "../../../src/registry.js";
import { type ExtractedStyles, resolveStyles, type StyleRule } from "../../../src/styles/index.js";
import { changeSessionEntry } from "../../styles/formats/cytoscape-xml.js";

const registry = createRegistry();
const STYLES = resolve(import.meta.dirname, "../../corpus/styles/cys");
const FIXTURES = resolve(import.meta.dirname, "../../conformance/fixtures/cys");

const file = (path: string): Uint8Array => new Uint8Array(readFileSync(path));

/**
 * Imports a session with styles.
 * @param bytes - the session
 * @param options - other import options
 * @returns the import
 */
async function load(
    bytes: Uint8Array,
    options: Record<string, unknown> = {},
): Promise<Awaited<ReturnType<typeof registry.importGraph>>> {
    return registry.importGraph(bytes, { format: "cys", styles: true, ...options });
}

const rules = (x: ExtractedStyles | null | undefined): StyleRule[] =>
    JSON.parse(JSON.stringify(x?.styles.rules ?? [])) as StyleRule[];

describe("reading session styles", () => {
    it("reads the style the view names, with Cytoscape's renderer fallbacks beneath it", async () => {
        const { snapshot, styles } = await load(file(resolve(STYLES, "cytoscape-tutorials-layout-v1.cys")));
        const ex = styles as ExtractedStyles;
        expect(snapshot.meta.extra.cytoscape).toMatchObject({ visualStyle: "Sample1" });
        expect(ex.styles.source).toEqual({ format: "cys", dialect: "cytoscape", tool: "cytoscape-fallbacks" });
        const lineStyle = ex.styles.rules.find((r) => r.id === "edge.discrete.interaction");
        expect(lineStyle?.map?.lineStyle).toEqual({
            kind: "discrete",
            by: { data: "interaction" },
            table: [
                ["pp", "solid"],
                ["pd", "dashed"],
            ],
        });
        expect(new Set(resolveStyles(ex, "node", "fill", snapshot))).toEqual(new Set(["#ccccff"]));
        expect(ex.styles.notes.map((n) => n.code)).not.toContain("W_STYLE_VIEW_STYLE_MISSING");
    });

    it("reads the first style, with a note, when the view names a style the session does not hold", async () => {
        const written = file(resolve(STYLES, "generated/graphty-written.cys"));
        const renamed = changeSessionEntry(
            written,
            (n) => n.includes("/views/"),
            (view) => view.replace(/cy:visualStyle="[^"]*"/, 'cy:visualStyle="no such style"'),
        );
        const blockless = changeSessionEntry(
            renamed as Uint8Array,
            (n) => n.endsWith("/graphty.styles"),
            () => "",
        );
        const { styles } = await load(blockless as Uint8Array);
        expect(styles?.styles.notes.map((n) => n.code)).toContain("W_STYLE_VIEW_STYLE_MISSING");
        expect(styles?.styles.rules.some((r) => r.origin === "declared")).toBe(true);
    });

    it("keeps the network it imported and its view's style for the style reader", async () => {
        const bytes = file(resolve(STYLES, "cytoscape-tutorials-layout-v1.cys"));
        const builder = new GraphBuilder({ directed: true });
        const report = await cysImporter.import(bytes, builder, { graphIndex: 1 });
        const kept = keptForStyles(report) as SessionStyleSource;
        expect(kept.network).toEqual({ index: 1, name: "galFiltered.sif(1)" });
        expect(kept.era).toBe("3");
        expect(kept.vizmap?.name).toBe("vizmap");
        expect(builder.freeze().nodeCount).toBe(26);
    });

    it("brings a 2.x session's hidden nodes and edges back invisible", async () => {
        const { snapshot, styles } = await load(file(resolve(FIXTURES, "authored/session-2x.cys")), {
            graphName: "Main net",
        });
        const ex = styles as ExtractedStyles;
        const hidden = snapshot.ids.indexOf("-2");
        expect(resolveStyles(ex, "node", "visible", snapshot)[hidden]).toBe(false);
        expect(resolveStyles(ex, "edge", "visible", snapshot)).toContain(false);
        expect(ex.styles.source.tool).toBe("cytoscape-fallbacks");
    });

    it("splits list cells on carriage returns, as some Cytoscape versions write them", () => {
        const att = cellAtt({ name: "counts", type: "Integer", list: true }, "1\r2\r\n3\n", 1, null, false);
        expect(att?.children.map((c) => c.value)).toEqual(["1", "2", "3"]);
    });

    // The PSPG homework session is licensed for redistribution but over the corpus size limit, so it is read from a
    // local copy of the full corpus when there is one (graph-io/scripts/styles-corpus.mjs reads the same copy).
    const pspg = resolve(
        import.meta.dirname,
        "../../../../../../tmp/style-import/wild/round2/cys/cytoscape-tutorials-PSPG_Homework.cys",
    );
    it.skipIf(!existsSync(pspg))("imports the PSPG homework session whole: 407 nodes and 699 edges", async () => {
        const { snapshot, report, styles } = await load(file(pspg));
        expect([snapshot.nodeCount, snapshot.edgeCount]).toEqual([407, 699]);
        expect(report.issues.filter((i) => i.code === "E_BAD_VALUE")).toEqual([]);
        expect(styles?.styles.rules.length).toBeGreaterThan(0);
    });
});

describe("writing session styles", () => {
    it("writes a style named for the network, which the view names, and reads back the same rules and values", async () => {
        const first = await load(file(resolve(STYLES, "cytoscape-tutorials-layout-v1.cys")));
        const ex = first.styles as ExtractedStyles;
        const written = await registry.exportGraphToBytes(first.snapshot, "cys", { styles: ex });
        let vizmap = "";
        let view = "";
        changeSessionEntry(
            written,
            (n) => n.endsWith("session_vizmap.xml"),
            (t) => (vizmap = t),
        );
        changeSessionEntry(
            written,
            (n) => n.includes("/views/"),
            (t) => (view = t),
        );
        expect(vizmap).toContain('<visualStyle name="galFiltered.sif">');
        expect(view).toContain('cy:visualStyle="galFiltered.sif"');
        const back = await load(written);
        expect(back.styles?.styles.source.tool).toBe("graphty");
        expect(rules(back.styles)).toEqual(rules(ex));
        for (const [target, property] of [
            ["node", "fill"],
            ["node", "label"],
            ["edge", "lineStyle"],
            ["edge", "label"],
        ] as const) {
            expect(resolveStyles(back.styles as ExtractedStyles, target, property, back.snapshot)).toEqual(
                resolveStyles(ex, target, property, first.snapshot),
            );
        }
    });

    it("reads the empty cells it writes for elements without a style value back as no value, with no notes", async () => {
        const json = readFileSync(resolve(STYLES, "../json/generated/graphology-graphty-written.json"));
        const first = await registry.importGraph(new Uint8Array(json), { format: "json", styles: true });
        const written = await registry.exportGraphToBytes(first.snapshot, "cys", {
            styles: first.styles ?? undefined,
            sanitizeIds: "mangle",
        });
        const back = await load(written);
        expect(back.styles?.styles.source.tool).toBe("graphty");
        expect(back.styles?.styles.notes).toEqual([]);
        // a data column keeps CyCSV's rule: an empty String cell is the empty string
        expect(cellAtt({ name: "graphty.style.node.copy.fill", type: "String", list: false }, "", 1, null, false)).toBe(
            null,
        );
        expect(cellAtt({ name: "name", type: "String", list: false }, "", 1, null, false)?.value).toBe("");
    });

    it("draws the same without its block: the named style and the view's bypasses are Cytoscape's own", async () => {
        const first = await load(file(resolve(STYLES, "cytoscape-tutorials-AnnotationExample.cys")));
        const ex = first.styles as ExtractedStyles;
        const written = await registry.exportGraphToBytes(first.snapshot, "cys", { styles: ex });
        const blockless = changeSessionEntry(
            written,
            (n) => n.endsWith("/graphty.styles"),
            () => "",
        ) as Uint8Array;
        const back = await load(blockless);
        expect(back.styles?.styles.source.tool).toBe("cytoscape-fallbacks");
        for (const property of ["fill", "width", "labelSize", "label"] as const) {
            expect(resolveStyles(back.styles as ExtractedStyles, "node", property, back.snapshot)).toEqual(
                resolveStyles(ex, "node", property, first.snapshot),
            );
        }
    });

    it("names Cytoscape's default style in the view of a session written without styles", async () => {
        const { snapshot } = await registry.importGraph(file(resolve(STYLES, "cytoscape-tutorials-layout-v1.cys")), {
            format: "cys",
        });
        const written = await registry.exportGraphToBytes(snapshot, "cys");
        let view = "";
        let vizmap: string | null = null;
        changeSessionEntry(
            written,
            (n) => n.includes("/views/"),
            (t) => (view = t),
        );
        changeSessionEntry(
            written,
            (n) => n.endsWith("session_vizmap.xml"),
            (t) => (vizmap = t),
        );
        expect(view).toContain('cy:visualStyle="default"');
        expect(vizmap).toBeNull();
    });
});

describe("sessions graphty wrote", () => {
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
    const generated = (name: string): Uint8Array => file(resolve(STYLES, "generated", name));

    it("read their own rules back", async () => {
        const { styles } = await load(generated("graphty-written.cys"));
        expect(styles?.styles.source.tool).toBe("graphty");
        expect(ignored(styles)).toBeUndefined();
    });

    it("read a fill locked in the view by another program as one more exception", async () => {
        const written = await load(generated("graphty-written.cys"));
        const edited = await load(generated("graphty-written-native-edit.cys"));
        expect(edited.styles?.styles.source.tool).toBe("graphty");
        expect(exceptions(edited.styles as ExtractedStyles)).toBe(exceptions(written.styles as ExtractedStyles) + 1);
    });

    it("ignore a truncated block, and a block written for another graph, and read the session's own style", async () => {
        const truncated = await load(generated("graphty-written-block-truncated.cys"));
        expect(ignored(truncated.styles)).toBe("NOT_JSON");
        expect(truncated.styles?.styles.source.tool).toBe("cytoscape-fallbacks");
        const other = await load(generated("graphty-written-block-other-graph.cys"));
        expect(ignored(other.styles)).toBe("FINGERPRINT");
        expect(other.styles?.styles.source.tool).toBe("cytoscape-fallbacks");
    });
});
