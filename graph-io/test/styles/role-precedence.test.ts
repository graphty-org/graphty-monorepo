/**
 * Columns with a style role (`color`, `size`, `shape`, `thickness`, `hidden`) and styles in one export: with styles
 * given, the format's style slots are written once, from what the styles draw, and the role columns are plain data
 * (no W_VIZ_DROPPED, no W_ROLE_DROPPED); without styles, every format writes exactly what it wrote before styles
 * existed.
 */

import { createHash } from "node:crypto";

import type { GraphSnapshot } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import { createRegistry } from "../../src/registry.js";
import {
    type ExtractedStyles,
    featuresOf,
    planStyles,
    resolveStyles,
    styleFingerprint,
    type StyleProperty,
    type StyleTarget,
} from "../../src/styles/internal.js";
import { roleGraph } from "./hand-made.js";
import { importForStyles, styleTruth } from "./harness.js";

/**
 * Every built-in format's export of the role graph without styles, as the code wrote it before styles were added:
 * the first 64 bits of the SHA-256 of the bytes, and the codes of its check notes.
 */
const BEFORE_STYLES: Readonly<Record<string, string>> = {
    json: "6e3743f38161bdfa W_VIZ_DROPPED,W_VIZ_DROPPED,W_VIZ_DROPPED,W_ROLE_DROPPED,W_VIZ_DROPPED,W_VIZ_DROPPED",
    graphml: "1b24ef5a17e1d346 W_VIZ_DROPPED,W_VIZ_DROPPED,W_VIZ_DROPPED,W_ROLE_DROPPED,W_VIZ_DROPPED,W_VIZ_DROPPED",
    gexf: "72a60ddb41afd525 W_ROLE_DROPPED,W_ROLE_SHAPE,W_ROLE_SHAPE,W_ATTRIBUTE_RENAMED,W_ATTRIBUTE_RENAMED",
    csv: "1531fc90a9b7e91b W_VIZ_DROPPED,W_VIZ_DROPPED,W_VIZ_DROPPED,W_ROLE_DROPPED,W_VIZ_DROPPED,W_VIZ_DROPPED,W_CSV_NODE_TABLE",
    gml: "d2c3cb3f182a602e W_VIZ_DROPPED,W_VIZ_DROPPED,W_VIZ_DROPPED,W_ROLE_DROPPED,W_DTYPE_UNSUPPORTED,W_VIZ_DROPPED,W_VIZ_DROPPED,W_STORAGE_CLASS_CHANGED",
    dot: "3a97bbd45a90805f W_VIZ_DROPPED,W_VIZ_DROPPED,W_VIZ_DROPPED,W_ROLE_DROPPED,W_VIZ_DROPPED,W_VIZ_DROPPED",
    pajek: "07bb4a76301444de W_VIZ_DROPPED,W_VIZ_DROPPED,W_VIZ_DROPPED,W_ROLE_DROPPED,W_VIZ_DROPPED,W_VIZ_DROPPED,W_PAJEK_LABEL_GAINED",
    neo4j: "4519a8a896755d0f W_VIZ_DROPPED,W_VIZ_DROPPED,W_VIZ_DROPPED,W_ROLE_DROPPED,W_VIZ_DROPPED,W_VIZ_DROPPED",
    xgmml: "4e2403a0132e5536 W_VIZ_DROPPED,W_VIZ_DROPPED,W_VIZ_DROPPED,W_ROLE_DROPPED,W_VIZ_DROPPED,W_VIZ_DROPPED,W_ID_TEXT_TYPE,W_STORAGE_CLASS_CHANGED",
    cx2: "a6e07085ec22d69c W_EDGE_IDS_GENERATED,W_VIZ_DROPPED,W_VIZ_DROPPED,W_VIZ_DROPPED,W_ROLE_DROPPED,W_VIZ_DROPPED,W_VIZ_DROPPED",
    cx: "396be9400501e8df W_EDGE_IDS_GENERATED,W_VIZ_DROPPED,W_VIZ_DROPPED,W_VIZ_DROPPED,W_ROLE_DROPPED,W_VIZ_DROPPED,W_VIZ_DROPPED",
    obo: "81444bb688069359 W_ID_TEXT_TYPE,W_OBO_TYPE_GAINED,W_VIZ_DROPPED,W_VIZ_DROPPED,W_VIZ_DROPPED,W_ROLE_DROPPED,W_VIZ_DROPPED,W_VIZ_DROPPED,W_COLUMN_AS_PROPERTY_VALUE,W_COLUMN_AS_PROPERTY_VALUE,W_RELATION_ASSUMED",
    cys: "ac92d48afc2ef9c6 W_EDGE_IDS_GENERATED,W_VIZ_DROPPED,W_VIZ_DROPPED,W_VIZ_DROPPED,W_ROLE_DROPPED,W_VIZ_DROPPED,W_VIZ_DROPPED,W_ID_TEXT_TYPE,W_STORAGE_CLASS_CHANGED",
};

/** The properties the styles below write, each with a value no role column holds. */
const WRITTEN: readonly (readonly [StyleTarget, StyleProperty])[] = [
    ["node", "fill"],
    ["node", "width"],
    ["node", "height"],
    ["node", "shape"],
    ["edge", "color"],
    ["edge", "width"],
];

/**
 * Styles of the role graph that disagree with every role column: fill and shape by group, a fixed size, green edges.
 * @param snapshot - the role graph
 * @returns the styles
 */
function styles(snapshot: GraphSnapshot): ExtractedStyles {
    const even = (i: number): boolean => i % 2 === 0;
    return planStyles(
        {
            format: "test",
            node: {
                values: {
                    fill: Array.from({ length: 6 }, (_, i) => (even(i) ? "#ff0000" : "#0000ff")),
                    width: Array<number>(6).fill(20),
                    height: Array<number>(6).fill(20),
                    shape: Array.from({ length: 6 }, (_, i) => (even(i) ? "ellipse" : "diamond")),
                },
            },
            edge: { values: { color: Array<string>(6).fill("#00aa00"), width: Array<number>(6).fill(2) } },
            fingerprint: styleFingerprint(snapshot),
        },
        { node: featuresOf(snapshot, "node"), edge: featuresOf(snapshot, "edge") },
    );
}

const registry = createRegistry();
const formats = registry.exporters().map((e) => e.format);
const text = (bytes: Uint8Array): string => new TextDecoder().decode(bytes);
const count = (haystack: string, needle: string): number => haystack.split(needle).length - 1;

describe("the role graph", () => {
    it("is checked in every built-in format", () => {
        expect([...formats].sort()).toEqual(Object.keys(BEFORE_STYLES).sort());
    });
});

describe.each(formats.map((f) => [f] as const))("%s", (format) => {
    it("writes the role graph without styles exactly as before styles existed", async () => {
        const snapshot = roleGraph();
        const bytes = await registry.exportGraphToBytes(snapshot, format);
        const notes = registry.checkExport(snapshot, format).map((n) => n.code);
        const hash = createHash("sha256").update(bytes).digest("hex").slice(0, 16);
        expect(`${hash} ${notes.join(",")}`).toBe(BEFORE_STYLES[format]);
    });

    it("writes the role columns as data, with no W_VIZ_DROPPED or W_ROLE_DROPPED, when styles are given", () => {
        const snapshot = roleGraph();
        const codes = registry.checkExport(snapshot, format, { styles: styles(snapshot) }).map((n) => n.code);
        expect(codes).not.toContain("W_VIZ_DROPPED");
        expect(codes).not.toContain("W_ROLE_DROPPED");
    });

    it("fills each style slot it writes from the styles, never from a role column", async () => {
        const snapshot = roleGraph();
        const ex = styles(snapshot);
        const exporter = registry.exporter(format);
        const caps = exporter.styles?.capabilities;
        const notes = registry.checkExport(snapshot, format, { styles: ex });
        if (caps === undefined) {
            // a format with no style slots: every property is reported lost, once
            const lost = notes.filter((n) => n.code === "W_STYLE_NOT_WRITTEN").map((n) => n.style);
            expect(lost).toEqual(expect.arrayContaining(WRITTEN.map(([target, property]) => ({ target, property }))));
            expect(lost).toHaveLength(WRITTEN.length);
            return;
        }
        const back = await importForStyles(
            registry,
            format,
            await registry.exportGraphToBytes(snapshot, format, { styles: ex }),
        );
        const truth = styleTruth(back);
        for (const [target, property] of WRITTEN) {
            // a property the format writes as the nearest value it has, or not at all in this dialect, is not exact
            const inexact = notes.some(
                (n) =>
                    (n.code === "W_STYLE_APPROXIMATED" || n.code === "W_STYLE_NOT_WRITTEN") &&
                    n.style?.target === target &&
                    n.style.property === property,
            );
            if (!(caps[target] as readonly string[]).includes(property) || inexact) {
                continue;
            }
            expect([target, property, truth?.[target]?.[property]]).toEqual([
                target,
                property,
                resolveStyles(ex, target, property, snapshot),
            ]);
        }
    });
});

describe("one slot per element", () => {
    it("GEXF writes one viz:color per node and edge, from the styles", async () => {
        const snapshot = roleGraph();
        const out = text(await registry.exportGraphToBytes(snapshot, "gexf", { styles: styles(snapshot) }));
        expect(count(out, "<viz:color ")).toBe(12);
        expect(count(out, "<viz:size ")).toBe(6);
        expect(count(out, "<viz:shape ")).toBe(6);
        expect(count(out, "<viz:thickness ")).toBe(6);
        expect(count(out, '<viz:color r="255" g="0" b="0"/>')).toBe(3);
        expect(count(out, '<viz:color r="0" g="170" b="0"/>')).toBe(6);
        // the role columns' values are kept as attributes
        expect(out).toContain('value="#123456"');
        expect(out).not.toContain('r="18" g="52" b="86"');
    });

    it("JSON (graphology) writes one color per node and edge, from the styles", async () => {
        const snapshot = roleGraph();
        const out = text(
            await registry.exportGraphToBytes(snapshot, "json", { dialect: "graphology", styles: styles(snapshot) }),
        );
        const doc = JSON.parse(out) as {
            nodes: { attributes: Record<string, unknown> }[];
            edges: { attributes: Record<string, unknown> }[];
        };
        expect(count(out, '"color":')).toBe(12);
        expect(doc.nodes.map((n) => n.attributes.color)).toEqual([
            "#ff0000",
            "#0000ff",
            "#ff0000",
            "#0000ff",
            "#ff0000",
            "#0000ff",
        ]);
        expect(doc.edges.every((e) => e.attributes.color === "#00aa00")).toBe(true);
    });

    it("JSON (node-link) writes the role columns once each, as plain attributes", async () => {
        const snapshot = roleGraph();
        const out = text(await registry.exportGraphToBytes(snapshot, "json", { styles: styles(snapshot) }));
        expect(count(out, '"color":"#123456"')).toBe(6);
        expect(count(out, '"color":"#654321"')).toBe(6);
        expect(count(out, '"size":77')).toBe(6);
    });

    it("Neo4j CSV writes each role column once, as a plain property, and loses every style with a note", async () => {
        const snapshot = roleGraph();
        const ex = styles(snapshot);
        const out = text(await registry.exportGraphToBytes(snapshot, "neo4j", { styles: ex }));
        const header = out.split("\n")[0];
        expect(header.split(",").filter((h) => h.startsWith("color"))).toHaveLength(1);
        expect(count(out, "#123456")).toBe(6);
        const lost = registry
            .checkExport(snapshot, "neo4j", { styles: ex })
            .filter((n) => n.code === "W_STYLE_NOT_WRITTEN");
        expect(
            lost.map((n) => `${n.style?.target ?? ""}.${n.style?.property ?? ""} ${String(n.count)}`).sort(),
        ).toEqual(["edge.color 6", "edge.width 6", "node.fill 6", "node.height 6", "node.shape 6", "node.width 6"]);
    });
});
