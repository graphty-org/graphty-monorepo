/**
 * The styles of XGMML files and Cytoscape 2.x session networks: Cytoscape writes every element's RESOLVED visual
 * properties into its `<graphics>` (XML attributes in the old spelling, nested `<att>` elements named for the visual
 * property, and the locked ones under `lockedVisualProperties`), and no style. The reader turns those values into
 * the neutral vocabulary; the planner explains them. The writer does the reverse from what graphty draws.
 */

import type { GraphSnapshot } from "@graphty/graph-format";

import { type BendPoint, canonBends } from "../../styles/canon/bends.js";
import { STYLE_ISSUE } from "../../styles/codes.js";
import {
    type CytoscapeDialect,
    cytoscapeElementProperties,
    cytoscapeWritableProperties,
} from "../../styles/cytoscape/emit.js";
import { normalizeVisualProperties } from "../../styles/cytoscape/lexicon.js";
import { type CytoscapeStyle, emptyCytoscapeStyle } from "../../styles/cytoscape/mappings.js";
import {
    cytoscapeBackground,
    type CytoscapeBypass,
    type CytoscapeElements,
    edgeEnds,
    resolveCytoscapeBypasses,
} from "../../styles/cytoscape/resolve.js";
import { STYLE_BLOCK_NAME } from "../../styles/io/block.js";
import { takeFromBlock } from "../../styles/io/round-trip.js";
import type { ExporterStyleInput } from "../../styles/io/writer.js";
import { StyleNotes } from "../../styles/notes.js";
import { plainCell } from "../../styles/plan/resolve.js";
import type {
    EdgeStyleProperty,
    GraphStyle,
    ImporterStyles,
    NodeStyleProperty,
    ReaderOutput,
    StyleColumn,
    StyleProperty,
    StyleReadContext,
    StyleTarget,
    StyleTool,
    StyleValue,
    StyleWriteCapabilities,
} from "../../styles/types.js";
import type { LossNote } from "../../types.js";
import { lossOf } from "../cx/styles.js";
import { GRAPHICS_COLUMN, SUBGRAPH_COLUMN, XGMML_ORIGIN_NAMESPACE } from "./constants.js";

type Table = GraphSnapshot["nodes"];

/**
 * The name of a table's graphics column: the json column the XGMML reader keeps `<graphics>` in.
 * @param table - the node, edge or graph table
 * @returns the column's name, or null
 */
function graphicsColumnOf(table: Table): string | null {
    for (const col of table) {
        const { origin } = col.meta;
        if (col.dtype === "json" && origin?.type === "graphics" && origin.namespace === XGMML_ORIGIN_NAMESPACE) {
            return col.meta.name;
        }
    }
    return table.get(GRAPHICS_COLUMN)?.dtype === "json" ? GRAPHICS_COLUMN : null;
}

/**
 * Each element's visual properties from its graphics: the graphics values normalized to visual property names, the
 * locked ones (`lockedVisualProperties`, a session view's bypasses) on top.
 * @param table - the node or edge table
 * @param target - nodes or edges
 * @param n - the element count
 * @param notes - where too-deep nesting is noted
 * @returns per element, its visual properties (null without graphics)
 */
export function graphicsBypasses(table: Table, target: StyleTarget, n: number, notes: StyleNotes): CytoscapeBypass[] {
    const out = new Array<CytoscapeBypass>(n).fill(null);
    const name = graphicsColumnOf(table);
    if (name === null) {
        return out;
    }
    for (let i = 0; i < n; i++) {
        const g = plainCell(table.value(name, i));
        if (g === null || typeof g !== "object" || Array.isArray(g)) {
            continue;
        }
        const map = normalizeVisualProperties(target, g, notes);
        const locked = Object.hasOwn(g, "lockedVisualProperties")
            ? (g as Record<string, unknown>).lockedVisualProperties
            : undefined;
        if (locked !== null && typeof locked === "object") {
            for (const [k, v] of normalizeVisualProperties(target, locked, notes)) {
                map.set(k, v);
            }
        }
        out[i] = map.size > 0 ? map : null;
    }
    return out;
}

/** What the XGMML style reader is told by its caller. */
interface XgmmlStyleSettings {
    /** Whose defaults fill what the file leaves unset. */
    readonly tool: StyleTool;
    /** A bool column marking hidden elements (a Cytoscape 2.x session's hidden state), or null. */
    readonly hiddenColumn?: string | null;
}

/**
 * The styles of a graph whose elements carry Cytoscape's resolved visual properties in their graphics.
 * @param snapshot - the graph
 * @param context - the budget and cancel signal
 * @param settings - the tool and the hidden-state column
 * @returns the styles (canonical values, no declared rules)
 */
export function readXgmmlStyles(
    snapshot: GraphSnapshot,
    context: StyleReadContext,
    settings: XgmmlStyleSettings,
): ImporterStyles {
    const notes = new StyleNotes();
    const out: Record<StyleTarget, ReaderOutput> = { node: { values: {} }, edge: { values: {} } };
    for (const target of ["node", "edge"] as const) {
        context.signal?.throwIfAborted();
        const table = target === "node" ? snapshot.nodes : snapshot.edges;
        const n = target === "node" ? snapshot.nodeCount : snapshot.edgeCount;
        const maps = graphicsBypasses(table, target, n, notes);
        const values = maps.some((m) => m !== null)
            ? resolveCytoscapeBypasses(target, maps, {
                  notes,
                  budget: context.budget,
                  value: (column, i) => (table.has(column) ? plainCell(table.value(column, i)) : null),
                  ...(target === "edge" ? { ends: edgeEnds(snapshot, out.node.values) } : {}),
              })
            : {};
        drawnAsDesktop(snapshot, target, out.node.values, values, settings);
        exactFromBlock(snapshot, target, values);
        out[target] = { values: nonEmpty(values) };
    }
    return {
        canonical: true,
        dialect: "cytoscape",
        tool: settings.tool,
        units: "px",
        node: out.node,
        edge: out.edge,
        graph: graphStyleOf(snapshot, notes),
        notes: notes.list(),
    };
}

/**
 * What Cytoscape desktop draws of an XGMML file's resolved values: hidden elements, the groups it hides and the
 * edges of every node it does not draw not visible, nodes with no label labeled by their names, and edge bends at the
 * network origin.
 * @param snapshot - the graph
 * @param target - nodes or edges
 * @param nodes - the node values per property (read for edges)
 * @param values - the values per property, changed in place
 * @param settings - the tool and the hidden-state column
 */
function drawnAsDesktop(
    snapshot: GraphSnapshot,
    target: StyleTarget,
    nodes: Partial<Record<string, StyleColumn>>,
    values: Partial<Record<string, StyleColumn>>,
    settings: XgmmlStyleSettings,
): void {
    const table = target === "node" ? snapshot.nodes : snapshot.edges;
    const n = target === "node" ? snapshot.nodeCount : snapshot.edgeCount;
    const desktop = settings.tool === "cytoscape";
    if (target === "edge" && desktop) {
        bendsAtOrigin(snapshot, values);
    }
    hiddenToVisible(table, settings.hiddenColumn ?? null, n, values);
    hideWhatCytoscapeHides(snapshot, target, nodes, values);
    if (target === "node") {
        if (desktop && values.label === undefined && !snapshot.graph.has(STYLE_BLOCK_NAME)) {
            nameLabels(table, n, values);
        }
    }
}

/**
 * Every bend of an edge where Cytoscape desktop draws it from an XGMML file: at the network's origin. Its XGMML reader
 * turns each `EDGE_BEND` handle (`cos,sin,ratio`, relative to the line between the two nodes) into a point while
 * every node is still at the origin and keeps that point, so each handle of each edge is drawn at (0, 0) of the
 * network, wherever the nodes then go (measured on Cytoscape 3.10.5's own SVG of an XGMML file with handles; its CX
 * reader places the same handles along their lines). An edge whose nodes have no position keeps its handles.
 * @param snapshot - the graph
 * @param values - the edge values per property, changed in place
 */
function bendsAtOrigin(snapshot: GraphSnapshot, values: Partial<Record<string, StyleColumn>>): void {
    const { bends } = values;
    const position = snapshot.nodes.byRole("position");
    if (bends === undefined || position === null) {
        return;
    }
    const center = (i: number): BendPoint | null => {
        const v = position.isSet(i) ? (position.value(i) as ArrayLike<number>) : null;
        return v === null ? null : [v[0], v[1]];
    };
    const { src, dst } = snapshot.edgeList();
    values.bends = bends.map((v, e) => {
        const [s, t] = [center(src[e]), center(dst[e])];
        if (typeof v !== "string" || s === null || t === null) {
            return v;
        }
        const handles = v.trim().split(/\s+/).length;
        return (
            canonBends(
                s,
                t,
                Array.from({ length: handles }, (): BendPoint => [0, 0]),
                false,
            ) ?? v
        );
    });
}

/**
 * The labels Cytoscape shows for nodes whose graphics state none: its default style labels a node by its name, and
 * a node with no `name` att is named by its `label=` (Cytoscape 2.x files often carry only that). Not for a file
 * graphty wrote: its block says what to draw.
 * @param table - the node table
 * @param n - the node count
 * @param values - the values per property, changed in place
 */
function nameLabels(table: Table, n: number, values: Partial<Record<string, StyleColumn>>): void {
    const label = table.byRole("label")?.meta.name ?? null;
    const text = (column: string | null, i: number): string | null => {
        const v = column !== null && table.has(column) ? plainCell(table.value(column, i)) : null;
        return typeof v === "string" || typeof v === "number" ? String(v) : null;
    };
    const labels = Array.from({ length: n }, (_v, i) => text("name", i) ?? text(label, i));
    if (labels.some((v) => v !== null)) {
        values.label = labels;
    }
}

/**
 * The styles of an XGMML file: its elements' resolved values, with Cytoscape desktop's default style beneath.
 * @param snapshot - the graph
 * @param context - the budget and cancel signal
 * @returns the styles
 */
export function readXgmmlFileStyles(snapshot: GraphSnapshot, context: StyleReadContext): ImporterStyles {
    return readXgmmlStyles(snapshot, context, { tool: "cytoscape" });
}

/**
 * For a file graphty wrote: where an element's value is what the writer's nearest Cytoscape value of the
 * `graphty.styles` block's value reads back as (a font family list written as its first family, a shape Cytoscape
 * does not have), the block's exact value is the truth, so a re-import gives the same rules. A value that differs
 * from what graphty wrote (another program edited it) stays the truth.
 * @param snapshot - the graph
 * @param target - nodes or edges
 * @param values - the values per property, changed in place
 * @param dialect - the Cytoscape dialect the file's values are written in
 * @param created - the order desktop creates the elements in, when the file is read with it (CX version 1)
 */
export function exactFromBlock(
    snapshot: GraphSnapshot,
    target: StyleTarget,
    values: Partial<Record<string, StyleColumn>>,
    dialect: CytoscapeDialect = "desktop",
    created?: NonNullable<CytoscapeElements["ends"]>["created"],
): void {
    const text = snapshot.graph.has(STYLE_BLOCK_NAME) ? plainCell(snapshot.graph.value(STYLE_BLOCK_NAME, 0)) : null;
    if (typeof text !== "string") {
        return;
    }
    takeFromBlock(snapshot, text, "xgmml", (t, block) => {
        if (t !== target) {
            return null;
        }
        const n = target === "node" ? snapshot.nodeCount : snapshot.edgeCount;
        // What each element's exact values are written as, read back the way the file is read.
        const written = Array.from({ length: n }, (_v, i) =>
            cytoscapeElementProperties(
                target,
                (property) => block(target, property)[i] ?? null,
                dialect,
                () => undefined,
            ),
        );
        // Desktop fans the curved edges between the same two nodes by the nodes' size, as the file is read
        const ends =
            target === "edge"
                ? {
                      ends: {
                          ...edgeEnds(snapshot, {
                              width: block("node", "width"),
                              height: block("node", "height"),
                              borderWidth: block("node", "borderWidth"),
                          }),
                          ...(created === undefined ? {} : { created }),
                      },
                  }
                : {};
        const readBack = resolveCytoscapeBypasses(target, written, { notes: new StyleNotes(), ...ends });
        return {
            values,
            properties: Object.keys(values).filter((p) => values[p] !== undefined && readBack[p] !== undefined),
            readBack: (i) => (property) => readBack[property]?.[i] ?? null,
        };
    });
}

/**
 * Marks the elements a hidden-state column holds true as not visible.
 * @param table - the node or edge table
 * @param column - the bool column, or null
 * @param n - the element count
 * @param values - the values per property, changed in place
 */
export function hiddenToVisible(
    table: Table,
    column: string | null,
    n: number,
    values: Partial<Record<string, StyleColumn>>,
): void {
    if (column === null || !table.has(column)) {
        return;
    }
    let visible: (StyleValue | null)[] | null = null;
    for (let i = 0; i < n; i++) {
        if (plainCell(table.value(column, i)) === true) {
            visible ??= values.visible === undefined ? new Array<StyleValue | null>(n).fill(null) : [...values.visible];
            visible[i] = false;
        }
    }
    if (visible !== null) {
        values.visible = visible;
    }
}

/**
 * Marks not visible what Cytoscape does not draw of its groups: an expanded group's own node (its members are drawn
 * in its place), and every node inside a collapsed group (the group's node is drawn in their place). A group is
 * collapsed when its nested graph's `__groupCollapsed.SUID` names the network being read: an XGMML export writes it
 * there, and the session reader copies it there from the group network's hidden table. A file graphty wrote is left
 * alone: its block says what to draw.
 * @param snapshot - the graph
 * @param values - the node values per property, changed in place
 */
function hideGroupsCytoscapeHides(snapshot: GraphSnapshot, values: Partial<Record<string, StyleColumn>>): void {
    const parent = snapshot.nodes.byRole("parent");
    if (parent === null || snapshot.graph.has(STYLE_BLOCK_NAME)) {
        return;
    }
    const n = snapshot.nodeCount;
    const members = membersOf(parent, n);
    if (members.size === 0) {
        return;
    }
    const network = (snapshot.meta.extra as { xgmml?: { graphId?: unknown } } | undefined)?.xgmml?.graphId;
    const visible = values.visible === undefined ? new Array<StyleValue | null>(n).fill(null) : [...values.visible];
    for (const [group, inside] of members) {
        if (!collapsedIn(snapshot, group, network)) {
            visible[group] = false;
            continue;
        }
        for (const i of insideAtAnyDepth(group, inside, members)) {
            visible[i] = false;
        }
    }
    values.visible = visible;
}

/**
 * Marks not visible what Cytoscape does not draw of its groups, and the edges of every node it does not draw.
 * @param snapshot - the graph
 * @param target - nodes or edges
 * @param nodes - the node values per property (read for edges)
 * @param values - the target's values per property, changed in place
 */
export function hideWhatCytoscapeHides(
    snapshot: GraphSnapshot,
    target: StyleTarget,
    nodes: Partial<Record<string, StyleColumn>>,
    values: Partial<Record<string, StyleColumn>>,
): void {
    if (target === "node") {
        hideGroupsCytoscapeHides(snapshot, values);
    } else {
        hideEdgesOfHiddenNodes(snapshot, nodes, values);
    }
}

/**
 * Marks not visible every edge with an end Cytoscape does not draw: a collapsed group's members' own edges (the
 * group's meta-edges are drawn in their place), an expanded group node's meta-edges, and a hidden node's edges. A
 * file graphty wrote is left alone: its block says what to draw.
 * @param snapshot - the graph
 * @param nodes - the node values per property
 * @param values - the edge values per property, changed in place
 */
function hideEdgesOfHiddenNodes(
    snapshot: GraphSnapshot,
    nodes: Partial<Record<string, StyleColumn>>,
    values: Partial<Record<string, StyleColumn>>,
): void {
    const shown = nodes.visible;
    if (shown === undefined || !shown.includes(false) || snapshot.graph.has(STYLE_BLOCK_NAME)) {
        return;
    }
    const { src, dst } = snapshot.edgeList();
    const visible =
        values.visible === undefined ? new Array<StyleValue | null>(src.length).fill(null) : [...values.visible];
    for (let e = 0; e < src.length; e++) {
        if (shown[src[e]] === false || shown[dst[e]] === false) {
            visible[e] = false;
        }
    }
    values.visible = visible;
}

/**
 * Each group node's direct members.
 * @param parent - the node parent column
 * @param n - the node count
 * @returns group node to its members
 */
function membersOf(
    parent: NonNullable<ReturnType<GraphSnapshot["nodes"]["byRole"]>>,
    n: number,
): Map<number, number[]> {
    const members = new Map<number, number[]>();
    for (let i = 0; i < n; i++) {
        const g = parent.isSet(i) ? plainCell(parent.value(i)) : null;
        if (typeof g === "number" && g !== i) {
            members.set(g, [...(members.get(g) ?? []), i]);
        }
    }
    return members;
}

/**
 * Every node inside a group, at any depth.
 * @param group - the group node
 * @param inside - its direct members
 * @param members - each group node's direct members
 * @returns the nodes inside
 */
function insideAtAnyDepth(group: number, inside: readonly number[], members: Map<number, number[]>): Set<number> {
    const stack = [...inside];
    const seen = new Set<number>([group]);
    const out = new Set<number>();
    for (let i = stack.pop(); i !== undefined; i = stack.pop()) {
        if (!seen.has(i)) {
            seen.add(i);
            out.add(i);
            stack.push(...(members.get(i) ?? []));
        }
    }
    return out;
}

/**
 * Whether a group node's nested graph says the group is collapsed in a network (`__groupCollapsed.SUID` lists it).
 * @param snapshot - the graph
 * @param group - the group node
 * @param network - the id of the network being read, or anything else when unknown
 * @returns true when collapsed there
 */
function collapsedIn(snapshot: GraphSnapshot, group: number, network: unknown): boolean {
    if (typeof network !== "string" || !snapshot.nodes.has(SUBGRAPH_COLUMN)) {
        return false;
    }
    const sub = plainCell(snapshot.nodes.value(SUBGRAPH_COLUMN, group));
    const atts = sub !== null && typeof sub === "object" ? (sub as { atts?: unknown }).atts : null;
    const collapsed =
        atts !== null && typeof atts === "object" ? (atts as Record<string, unknown>)["__groupCollapsed.SUID"] : null;
    return Array.isArray(collapsed) && collapsed.some((v) => String(v) === network);
}

/**
 * The properties with at least one value.
 * @param values - per property, each element's value
 * @returns the same without all-null properties
 */
export function nonEmpty(values: Partial<Record<string, StyleColumn>>): Partial<Record<StyleProperty, StyleColumn>> {
    const out: Partial<Record<string, StyleColumn>> = {};
    for (const [p, col] of Object.entries(values)) {
        if (col?.some((v) => v !== null) === true) {
            out[p] = col;
        }
    }
    return out;
}

/**
 * The graph's background: its own graphics' `NETWORK_BACKGROUND_PAINT`, the locked one (`lockedVisualProperties`, a
 * session view's bypass) on top, over the style's own.
 * @param snapshot - the graph
 * @param notes - where a bad value is noted
 * @param style - the style whose network defaults the graph's graphics override, or none
 * @returns the graph style
 * @category Styles
 */
export function graphStyleOf(snapshot: GraphSnapshot, notes: StyleNotes, style?: CytoscapeStyle): GraphStyle {
    const merged = emptyCytoscapeStyle();
    for (const [k, v] of style?.network.defaults ?? []) {
        merged.network.defaults.set(k, v);
    }
    for (const [k, v] of networkBypasses(snapshot, notes)) {
        merged.network.defaults.set(k, v);
    }
    const background = cytoscapeBackground(merged, notes);
    return background === null ? {} : { background };
}

/**
 * The network visual properties a graph's own graphics set, the locked ones (`lockedVisualProperties`) last.
 * @param snapshot - the graph
 * @param notes - where too-deep nesting is noted
 * @returns visual property name to raw value, in the order they apply
 */
function networkBypasses(snapshot: GraphSnapshot, notes: StyleNotes): [string, unknown][] {
    const name = graphicsColumnOf(snapshot.graph);
    const g = name === null ? null : plainCell(snapshot.graph.value(name, 0));
    if (g === null || typeof g !== "object" || Array.isArray(g)) {
        return [];
    }
    const locked = Object.hasOwn(g, "lockedVisualProperties")
        ? (g as Record<string, unknown>).lockedVisualProperties
        : undefined;
    return [g, locked].flatMap((layer) =>
        [...normalizeVisualProperties("node", layer, notes)].filter(([k]) => k.startsWith("NETWORK_")),
    );
}

// ------------------------------------------------------------------ writing

/**
 * What the XGMML writer holds natively: every visual property Cytoscape keeps per element, and the graph's
 * background. The block and the tagged values go into graph and element `<att>`s.
 */
export const XGMML_STYLE_CAPABILITIES: StyleWriteCapabilities = Object.freeze({
    tool: "cytoscape",
    node: Object.freeze(cytoscapeWritableProperties("node", "desktop") as NodeStyleProperty[]),
    edge: Object.freeze(cytoscapeWritableProperties("edge", "desktop") as EdgeStyleProperty[]),
    graph: Object.freeze(["background"] as const),
    block: "attributes",
});

/** The visual properties Cytoscape also writes as `<graphics>` XML attributes, in its old spelling. */
const XML_ATTRIBUTES: Readonly<Record<StyleTarget, readonly (readonly [vp: string, attribute: string])[]>> = {
    node: [
        ["NODE_SHAPE", "type"],
        ["NODE_HEIGHT", "h"],
        ["NODE_WIDTH", "w"],
        ["NODE_FILL_COLOR", "fill"],
        ["NODE_BORDER_WIDTH", "width"],
        ["NODE_BORDER_PAINT", "outline"],
    ],
    edge: [
        ["EDGE_WIDTH", "width"],
        ["EDGE_STROKE_UNSELECTED_PAINT", "fill"],
    ],
};

/**
 * One element's graphics record for a file written with styles: what graphty draws as Cytoscape visual properties,
 * the six classic ones also as XML attributes (the importer reads both alike), over the kept graphics' visual
 * properties no neutral property carries (custom graphics, label widths) and edge bends.
 * @param target - nodes or edges
 * @param styles - the exporter's style input
 * @param i - the element index
 * @param kept - the element's kept graphics record, or null
 * @returns the record, or null when there is nothing to write
 */
export function styledGraphics(
    target: StyleTarget,
    styles: ExporterStyleInput,
    i: number,
    kept: Record<string, unknown> | null,
): Record<string, unknown> | null {
    const vps = cytoscapeElementProperties(
        target,
        (p) => styles.picture(target, p as StyleProperty)[i] ?? null,
        "desktop",
        () => undefined,
    );
    const out: Record<string, unknown> = {};
    for (const [vp, attribute] of XML_ATTRIBUTES[target]) {
        if (vps.has(vp)) {
            out[attribute] = String(vps.get(vp));
        }
    }
    for (const [k, v] of Object.entries(kept ?? {})) {
        // a kept visual property the picture does not write, or the edge's bends; old-spelling and nested keys
        // would be read before the picture's values and contradict them
        if (k === "Line" || (/^[A-Z][A-Z_0-9]+$/.test(k) && !vps.has(k))) {
            out[k] = v;
        }
    }
    for (const [vp, v] of vps) {
        out[vp] = String(v);
    }
    return Object.keys(out).length === 0 ? null : out;
}

/**
 * What writing every element's graphics with styles loses: each value written as the nearest one Cytoscape allows,
 * counted per element.
 * @param styles - the exporter's style input
 * @param snapshot - the graph
 * @returns the loss notes
 */
export function styledGraphicsNotes(styles: ExporterStyleInput, snapshot: GraphSnapshot): LossNote[] {
    const notes = new StyleNotes();
    for (const target of ["node", "edge"] as const) {
        const n = target === "node" ? snapshot.nodeCount : snapshot.edgeCount;
        for (let i = 0; i < n; i++) {
            cytoscapeElementProperties(
                target,
                (p) => styles.picture(target, p as StyleProperty)[i] ?? null,
                "desktop",
                (p) => {
                    notes.add(STYLE_ISSUE.APPROXIMATED, target, p, { element: i });
                },
            );
        }
    }
    return notes.list().map(lossOf);
}

/**
 * The graph's graphics record for a file written with styles: the kept record with the background replaced.
 * @param styles - the exporter's style input
 * @param kept - the kept graph graphics, or null
 * @returns the record, or null
 */
export function styledGraphGraphics(
    styles: ExporterStyleInput,
    kept: Record<string, unknown> | null,
): Record<string, unknown> | null {
    const { background } = styles.rules.styles.graph;
    const out: Record<string, unknown> = { ...kept };
    if (background !== undefined) {
        out.NETWORK_BACKGROUND_PAINT = background.toUpperCase();
    }
    return Object.keys(out).length === 0 ? null : out;
}
