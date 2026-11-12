/**
 * A hand-made graph and styles covering every kind of rule the style format has: fixed values, a discrete table, a
 * continuous scale, a scale over the computed degree, a passthrough, a membership column, hidden elements and
 * properties only graphty draws.
 */

import { GraphBuilder, type GraphSnapshot } from "@graphty/graph-format";

import { type ExtractedStyles, featuresOf, styleFingerprint, type StyleRule } from "../../src/styles/internal.js";
import type { GraphImporter } from "../../src/types.js";
import type { LoadedGraph } from "./harness.js";

const NODES = 24;
const GROUPS = ["alpha", "beta", "gamma"];

/**
 * A graph of 24 nodes in three groups with a score, a name and a hidden flag, and a ring of edges with a relation
 * (one of them hidden) and a weight; nodes 0, 5 and 10 are members of a set held in a style column.
 * @returns the graph
 */
function handMadeGraph(): GraphSnapshot {
    const b = new GraphBuilder({ directed: true });
    const group = b.declareNodeColumn({ name: "group", dtype: "string" });
    const score = b.declareNodeColumn({ name: "score", dtype: "f64" });
    const name = b.declareNodeColumn({ name: "name", dtype: "string" });
    const hidden = b.declareNodeColumn({ name: "hidden", dtype: "bool" });
    for (let i = 0; i < NODES; i++) {
        b.addNode(`n${String(i)}`);
        b.setNodeValue(group, i, GROUPS[i % 3]);
        b.setNodeValue(score, i, i * 5);
        b.setNodeValue(name, i, `Node ${String(i)}`);
        b.setNodeValue(hidden, i, i === 7);
    }
    const kind = b.declareEdgeColumn({ name: "relation", dtype: "string" });
    const weight = b.declareEdgeColumn({ name: "w", dtype: "f64" });
    for (let i = 0; i < NODES; i++) {
        const e = b.addEdge(`n${String(i)}`, `n${String((i + (i % 4 === 0 ? 2 : 1)) % NODES)}`);
        b.setEdgeValue(kind, e, i === 5 ? "hidden" : ["solid", "weak"][i % 2]);
        b.setEdgeValue(weight, e, 1 + (i % 3));
    }
    return b.freeze();
}

/**
 * Styles of the hand-made graph: fixed defaults, a discrete table, a continuous scale, a scale over the computed
 * degree, a passthrough label, a membership column, a hidden node and edge, and properties only graphty draws.
 * @param snapshot - the graph
 * @returns the styles
 */
function handMadeStyles(snapshot: GraphSnapshot): ExtractedStyles {
    const rules: StyleRule[] = [
        {
            id: "node.defaults",
            target: "node",
            role: "defaults",
            origin: "declared",
            where: { all: true },
            set: { fill: "#cccccc", width: 20, height: 20, shape: "ellipse", borderColor: "#333333", borderWidth: 1 },
        },
        {
            id: "node.by.group",
            target: "node",
            role: "mapping",
            origin: "declared",
            where: { all: true },
            map: {
                fill: {
                    kind: "discrete",
                    by: { data: "group" },
                    table: [
                        ["alpha", "#ff0000"],
                        ["beta", "#00aa00"],
                        ["gamma", "#0000ff"],
                    ],
                },
            },
        },
        {
            id: "node.by.score",
            target: "node",
            role: "mapping",
            origin: "declared",
            where: { all: true },
            map: {
                width: {
                    kind: "continuous",
                    by: { data: "score" },
                    points: [
                        { at: 0, below: 10, value: 10, above: 10 },
                        { at: 100, below: 40, value: 40, above: 40 },
                    ],
                },
            },
        },
        {
            id: "node.by.degree",
            target: "node",
            role: "mapping",
            origin: "declared",
            where: { all: true },
            map: {
                height: {
                    kind: "continuous",
                    by: { computed: "degree" },
                    points: [
                        { at: 1, below: 12, value: 12, above: 12 },
                        { at: 4, below: 30, value: 30, above: 30 },
                    ],
                },
            },
        },
        {
            id: "node.label",
            target: "node",
            role: "passthrough",
            origin: "declared",
            where: { all: true },
            map: { label: { kind: "passthrough", by: { data: "name" } } },
        },
        {
            id: "node.member.0",
            target: "node",
            role: "group",
            origin: "inferred",
            where: { has: { style: "member.0" } },
            set: { shape: "diamond", "graphty:glow": 2 },
        },
        {
            id: "node.hidden",
            target: "node",
            role: "group",
            origin: "declared",
            where: { eq: [{ data: "hidden" }, true] },
            set: { visible: false },
        },
        {
            id: "edge.defaults",
            target: "edge",
            role: "defaults",
            origin: "declared",
            where: { all: true },
            set: { color: "#999999", width: 1, targetArrow: "triangle", "graphty:arrowGlow": "#ffff00" },
        },
        {
            id: "edge.by.kind",
            target: "edge",
            role: "mapping",
            origin: "declared",
            where: { all: true },
            map: {
                color: {
                    kind: "discrete",
                    by: { data: "relation" },
                    table: [
                        ["solid", "#000000"],
                        ["weak", "#aaaaaa"],
                    ],
                },
                width: { kind: "passthrough", by: { data: "w" } },
            },
        },
        {
            id: "edge.hidden",
            target: "edge",
            role: "group",
            origin: "declared",
            where: { eq: [{ data: "relation" }, "hidden"] },
            set: { visible: false },
        },
    ];
    const member = Array.from({ length: NODES }, (_, i) => (i % 5 === 0 && i <= 10 ? true : null));
    return {
        styles: {
            version: 1,
            source: { format: "hand-made", dialect: "graphty", tool: null },
            units: { length: "px" },
            graph: { background: "#fafafa" },
            rules,
            notes: [],
        },
        columns: { node: new Map([["member.0", member]]), edge: new Map() },
        features: { node: featuresOf(snapshot, "node"), edge: featuresOf(snapshot, "edge") },
        fingerprint: styleFingerprint(snapshot),
    };
}

/** An importer that is never called: the hand-made graph was built in memory. */
const IN_MEMORY: GraphImporter = {
    format: "hand-made",
    extensions: [],
    mimeTypes: [],
    import: () => Promise.reject(new Error("built in memory")),
};

/**
 * The hand-made graph and its styles, as the round trip takes them.
 * @returns the graph and its styles
 */
export function handMade(): { loaded: LoadedGraph; ex: ExtractedStyles } {
    const snapshot = handMadeGraph();
    const report = { format: "hand-made" } as unknown as LoadedGraph["report"];
    return { loaded: { snapshot, importer: IN_MEMORY, report }, ex: handMadeStyles(snapshot) };
}

/**
 * A graph whose style values live in columns with style roles (node `color`, `size`, `shape`, `hidden`; edge
 * `color`, `thickness`), every value one no style below uses, beside a `group` column: what an importer of a format
 * with style slots builds.
 * @returns the graph
 */
export function roleGraph(): GraphSnapshot {
    const b = new GraphBuilder({ directed: true });
    const group = b.declareNodeColumn({ name: "group", dtype: "string" });
    const color = b.declareNodeColumn({ name: "color", dtype: "string", role: "color" });
    const size = b.declareNodeColumn({ name: "size", dtype: "f32", role: "size" });
    const shape = b.declareNodeColumn({ name: "shape", dtype: "string", role: "shape" });
    const hidden = b.declareNodeColumn({ name: "hidden", dtype: "bool", role: "hidden" });
    for (let i = 0; i < 6; i++) {
        b.addNode(i + 1);
        b.setNodeValue(group, i, i % 2 === 0 ? "even" : "odd");
        b.setNodeValue(color, i, "#123456");
        b.setNodeValue(size, i, 77);
        b.setNodeValue(shape, i, "triangle");
        b.setNodeValue(hidden, i, false);
    }
    const edgeColor = b.declareEdgeColumn({ name: "color", dtype: "string", role: "color" });
    const thickness = b.declareEdgeColumn({ name: "thickness", dtype: "f32", role: "thickness" });
    for (let i = 0; i < 6; i++) {
        const e = b.addEdge(i + 1, ((i + 1) % 6) + 1);
        b.setEdgeValue(edgeColor, e, "#654321");
        b.setEdgeValue(thickness, e, 9);
    }
    return b.freeze();
}
