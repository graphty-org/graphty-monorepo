/**
 * Styles through the exporter contract: a third-party exporter with no `styles` member loses every style with a
 * coded note, one that declares `block: "attributes"` keeps the rules for graphty with no code, styles of another
 * graph are refused before anything is written, and what an exporter with a `styles` member receives.
 */

import { GraphBuilder, GraphFormatError, type GraphSnapshot } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import { jsonExporter } from "../../src/formats/json/index.js";
import { createRegistry, listFormats } from "../../src/registry.js";
import {
    type ExporterStyleInput,
    type ExtractedStyles,
    featuresOf,
    planStyles,
    resolveStyles,
    STYLE_BLOCK_NAME,
    styleFingerprint,
    type StyleProperty,
    styleTag,
} from "../../src/styles/index.js";
import type { GraphExporter } from "../../src/types.js";

/**
 * A graph of eight nodes in two groups and a ring of edges.
 * @param extra - add one more node
 * @returns the graph
 */
function graph(extra = false): GraphSnapshot {
    const b = new GraphBuilder({ directed: true });
    const group = b.declareNodeColumn({ name: "group", dtype: "string" });
    const n = extra ? 9 : 8;
    for (let i = 0; i < n; i++) {
        b.addNode(`n${String(i)}`);
        b.setNodeValue(group, i, i % 2 === 0 ? "even" : "odd");
    }
    for (let i = 0; i < 8; i++) {
        b.addEdge(`n${String(i)}`, `n${String((i + 1) % 8)}`);
    }
    return b.freeze();
}

/**
 * Styles of the eight-node graph: fill by group, a constant width, one node's own shape, edge colors per edge.
 * @param snapshot - the graph
 * @returns the styles
 */
function styles(snapshot: GraphSnapshot): ExtractedStyles {
    const fill = Array.from({ length: 8 }, (_, i) => (i % 2 === 0 ? "#ff0000" : "#0000ff"));
    const shape = Array.from({ length: 8 }, (_, i) => (i === 3 ? "diamond" : "ellipse"));
    const color = Array.from({ length: 8 }, (_, i) => `#0000${String(10 + i)}`);
    return planStyles(
        {
            format: "test",
            node: { values: { fill, width: Array<number>(8).fill(12), shape } },
            edge: { values: { color } },
            graph: { background: "#ffffff" },
            fingerprint: styleFingerprint(snapshot),
        },
        { node: featuresOf(snapshot, "node"), edge: featuresOf(snapshot, "edge") },
    );
}

/** The properties the styles above write, per target. */
const WRITTEN: { readonly node: readonly StyleProperty[]; readonly edge: readonly StyleProperty[] } = {
    node: ["fill", "width", "shape"],
    edge: ["color"],
};

/**
 * A third-party exporter that writes node-link JSON through graph-io's JSON exporter.
 * @param extra - members to add
 * @returns the exporter
 */
function minimal(extra: Partial<GraphExporter> = {}): GraphExporter {
    return {
        format: "mine",
        capabilities: jsonExporter.capabilities,
        check: (s, o) => jsonExporter.check(s, o),
        export: (s, o) => jsonExporter.export(s, o),
        exportToString: (s, o) => jsonExporter.exportToString(s, o),
        ...extra,
    };
}

describe("an exporter without a styles member", () => {
    it("reports W_STYLE_NOT_WRITTEN for every property and W_STYLE_RULES_NOT_KEPT", () => {
        const snapshot = graph();
        const reg = createRegistry().registerExporter(minimal());
        const notes = reg.checkExport(snapshot, "mine", { styles: styles(snapshot) });
        const lost = notes.filter((n) => n.code === "W_STYLE_NOT_WRITTEN").map((n) => n.style);
        const expected = [
            ...WRITTEN.node.map((property) => ({ target: "node", property })),
            ...WRITTEN.edge.map((property) => ({ target: "edge", property })),
            { target: "graph", property: "background" },
        ];
        expect(lost).toHaveLength(expected.length);
        expect(lost).toEqual(expect.arrayContaining(expected));
        const fill = notes.find((n) => n.style?.property === "fill");
        expect(fill?.count).toBe(8);
        expect(notes.filter((n) => n.code === "W_STYLE_RULES_NOT_KEPT")).toHaveLength(1);
    });

    it("writes the same file as without styles", async () => {
        const snapshot = graph();
        const reg = createRegistry().registerExporter(minimal());
        expect(await reg.exportGraphToString(snapshot, "mine", { styles: styles(snapshot) })).toBe(
            await reg.exportGraphToString(snapshot, "mine"),
        );
    });
});

describe('an exporter with block: "attributes"', () => {
    const attributes = minimal({ styles: { capabilities: { node: [], edge: [], block: "attributes" } } });

    it("round-trips the same rules through a re-import", async () => {
        const snapshot = graph();
        const original = styles(snapshot);
        const reg = createRegistry().registerExporter(attributes);
        const notes = reg.checkExport(snapshot, "mine", { styles: original });
        expect(notes.filter((n) => n.code === "W_STYLE_NOT_WRITTEN")).toHaveLength(5);
        expect(notes.some((n) => n.code === "W_STYLE_RULES_NOT_KEPT")).toBe(false);
        const text = await reg.exportGraphToString(snapshot, "mine", { styles: original });
        expect(text).toContain(STYLE_BLOCK_NAME);
        const back = await createRegistry().importGraph(text, { format: "json", styles: true });
        const restyled = back.styles;
        if (restyled === null || restyled === undefined) {
            throw new Error("no styles");
        }
        expect(restyled.styles.rules).toEqual(JSON.parse(JSON.stringify(original.styles.rules)));
        expect(restyled.styles.graph).toEqual(original.styles.graph);
        for (const [target, props] of Object.entries(WRITTEN) as ["node" | "edge", readonly StyleProperty[]][]) {
            for (const p of props) {
                expect(resolveStyles(restyled, target, p, back.snapshot)).toEqual(
                    resolveStyles(original, target, p, snapshot),
                );
            }
        }
        // the tagged values are attributes graph-io reads for the rules, never features to explain styles with
        expect(back.snapshot.nodes.names().some((n) => n.startsWith("graphty.style."))).toBe(
            original.columns.node.size > 0,
        );
        expect(restyled.features.node.some((f) => "data" in f.ref && f.ref.data.startsWith("graphty."))).toBe(false);
    });

    it("lists the style capabilities with the format", () => {
        const reg = createRegistry().registerExporter(attributes);
        const info = reg.listFormats().find((f) => f.format === "mine");
        expect(info?.capabilities?.styles).toEqual({ node: [], edge: [], block: "attributes" });
        const builtIn = createRegistry();
        expect(
            listFormats().every(
                (f) => !f.canExport || f.capabilities?.styles === builtIn.exporter(f.format).styles?.capabilities,
            ),
        ).toBe(true);
    });
});

describe("styles of another graph", () => {
    it("fail with E_STYLES_MISMATCH and write nothing", async () => {
        const snapshot = graph();
        const other = graph(true);
        let writes = 0;
        const counted = minimal({
            styles: { capabilities: { node: ["fill"], edge: [], block: "native" } },
            export: (s, o) => {
                writes++;
                return jsonExporter.export(s, o);
            },
            exportToString: (s, o) => {
                writes++;
                return jsonExporter.exportToString(s, o);
            },
        });
        const reg = createRegistry().registerExporter(counted);
        const given = styles(snapshot);
        const notes = reg.checkExport(other, "mine", { styles: given });
        expect(notes.filter((n) => n.code.startsWith("E_")).map((n) => n.code)).toEqual(["E_STYLES_MISMATCH"]);
        await expect(reg.exportGraphToBytes(other, "mine", { styles: given })).rejects.toSatisfy(
            (e: unknown) => e instanceof GraphFormatError && e.details.code === "E_STYLES_MISMATCH",
        );
        await expect(reg.exportGraphToString(other, "mine", { styles: given })).rejects.toBeInstanceOf(
            GraphFormatError,
        );
        expect(writes).toBe(0);
    });
});

describe("what an exporter with a styles member receives", () => {
    it("gets the picture, the block, the tagged values and the rules, and its native properties are not lost", async () => {
        const snapshot = graph();
        const given = styles(snapshot);
        let input: ExporterStyleInput | undefined;
        const native = minimal({
            styles: {
                capabilities: {
                    node: ["fill", "width", "shape"],
                    edge: ["color"],
                    graph: ["background"],
                    block: "native",
                },
            },
            exportToString: (s, o) => {
                input = (o as { styles?: ExporterStyleInput }).styles;
                return jsonExporter.exportToString(s, o);
            },
        });
        const reg = createRegistry().registerExporter(native);
        expect(
            reg.checkExport(snapshot, "mine", { styles: given }).filter((n) => n.code.startsWith("W_STYLE")),
        ).toEqual([]);
        await reg.exportGraphToString(snapshot, "mine", { styles: given });
        if (input === undefined) {
            throw new Error("no styles input");
        }
        expect(input.picture("node", "fill")).toEqual(resolveStyles(given, "node", "fill", snapshot));
        expect(input.picture("node", "shape")[3]).toBe("diamond");
        expect(input.rules).toBe(given);
        expect(JSON.parse(input.block).rules).toHaveLength(given.styles.rules.length);
        for (const key of given.columns.node.keys()) {
            expect(input.tags.node.get(styleTag("node", key))).toBe(given.columns.node.get(key));
        }
    });
});
