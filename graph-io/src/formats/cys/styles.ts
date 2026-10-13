/**
 * The styles of a Cytoscape session. A 3.x session keeps its named visual styles in `session_vizmap.xml` and each
 * view names the one it uses (`cy:visualStyle`); the view's elements carry only their bypasses
 * (`lockedVisualProperties`). The import reads the style the imported network's view names, resolved the way
 * Cytoscape draws it (bypass over mapping over default), with Cytoscape's renderer fallbacks for what the style
 * leaves unset. A 2.x session's network files carry every element's resolved values, read like XGMML, and its
 * hidden elements come back invisible. The writer emits the graph's styles as a named style, bypasses and columns.
 */

import type { GraphSnapshot } from "@graphty/graph-format";

import { STYLE_ISSUE } from "../../styles/codes.js";
import {
    type CytoscapeMapping,
    type CytoscapeStyle,
    emptyCytoscapeStyle,
    typedKey,
} from "../../styles/cytoscape/mappings.js";
import { cytoscapeBackground, type CytoscapeElements, resolveCytoscape } from "../../styles/cytoscape/resolve.js";
import { cytoscapeRules } from "../../styles/cytoscape/translate.js";
import { StyleNotes } from "../../styles/notes.js";
import { dataCell } from "../../styles/plan/resolve.js";
import type { ImporterStyles, ReaderOutput, StyleReadContext, StyleTarget } from "../../styles/types.js";
import { exactFromBlock, graphicsBypasses, hiddenToVisible, nonEmpty, readXgmmlStyles } from "../xgmml/styles.js";
import { HIDDEN_COLUMN } from "./constants.js";
import type { XmlNode } from "./session.js";

/**
 * What a session import keeps for its styles (through `report.keepForStyles()`): the era, the parsed
 * `session_vizmap.xml`, the style the imported network's view names, and which network was imported.
 */
export interface SessionStyleSource {
    /** "3" for a 3.x session, "2" for a 2.x one. */
    readonly era: "2" | "3";
    /** The root element of `session_vizmap.xml`, or null when the session has none or it cannot be read. */
    readonly vizmap: XmlNode | null;
    /** Why `session_vizmap.xml` could not be read, or null. */
    readonly problem: string | null;
    /** The style the imported view names, or null. */
    readonly visualStyle: string | null;
    /** The network the import read: its index among the session's networks, and its name. */
    readonly network: { readonly index: number; readonly name: string | null };
}

/**
 * The styles of an imported session network.
 * @param snapshot - the network
 * @param context - what the import kept, the budget and the cancel signal
 * @returns the styles
 */
export function readSessionStyles(snapshot: GraphSnapshot, context: StyleReadContext): ImporterStyles {
    const kept = context.kept as SessionStyleSource | undefined;
    if (kept?.era === "2") {
        return readXgmmlStyles(snapshot, context, { tool: "cytoscape-fallbacks", hiddenColumn: HIDDEN_COLUMN });
    }
    const notes = new StyleNotes();
    const style = sessionStyle(kept, notes);
    const out: Record<StyleTarget, ReaderOutput> = { node: { values: {} }, edge: { values: {} } };
    for (const target of ["node", "edge"] as const) {
        context.signal?.throwIfAborted();
        out[target] = sessionTargetStyles(snapshot, target, style, { notes, budget: context.budget });
    }
    const background = cytoscapeBackground(style, notes);
    return {
        canonical: true,
        dialect: "cytoscape",
        tool: "cytoscape-fallbacks",
        units: "px",
        node: out.node,
        edge: out.edge,
        graph: background === null ? {} : { background },
        notes: notes.list(),
    };
}

/**
 * The Cytoscape style of a session: its vizmap's, or an empty one with a note saying why there is none.
 * @param kept - what the import kept
 * @param notes - where problems are noted
 * @returns the style
 */
function sessionStyle(kept: SessionStyleSource | undefined, notes: StyleNotes): CytoscapeStyle {
    if (kept?.vizmap === null || kept?.vizmap === undefined) {
        const problem = kept?.problem ?? null;
        notes.add(problem === null ? STYLE_ISSUE.NO_VIZMAP : STYLE_ISSUE.UNREADABLE, null, "session_vizmap.xml", {
            sample: problem ?? "absent",
        });
        return emptyCytoscapeStyle();
    }
    return cytoscapeStyleFromVizmap(kept.vizmap, kept.visualStyle, notes);
}

/**
 * The styles of a session's nodes or edges.
 * @param snapshot - the network
 * @param target - nodes or edges
 * @param style - the session's style
 * @param work - where problems are noted, and the work budget
 * @param work.notes - where problems are noted
 * @param work.budget - the work budget
 * @returns the reader output for the target
 */
function sessionTargetStyles(
    snapshot: GraphSnapshot,
    target: StyleTarget,
    style: CytoscapeStyle,
    work: { readonly notes: StyleNotes; readonly budget: StyleReadContext["budget"] },
): ReaderOutput {
    const { notes } = work;
    const table = target === "node" ? snapshot.nodes : snapshot.edges;
    const n = target === "node" ? snapshot.nodeCount : snapshot.edgeCount;
    for (const m of style[target].mappings.values()) {
        if (!table.has(m.column)) {
            notes.add(STYLE_ISSUE.MAPPING_COLUMN_MISSING, target, m.column, { sample: m.kind });
        }
    }
    const elements: CytoscapeElements = {
        count: n,
        value: (column, i) => (table.has(column) ? dataCell(table, column, i) : null),
        bypasses: graphicsBypasses(table, target, n, notes),
    };
    const values = resolveCytoscape(target, style, elements, work);
    hiddenToVisible(table, HIDDEN_COLUMN, n, values);
    // a session graphty wrote: a value its style writes as the nearest Cytoscape value is the block's
    exactFromBlock(snapshot, target, values);
    const { rules, columns } = cytoscapeRules(target, style, elements, work);
    return { values: nonEmpty(values), rules, columns };
}

/**
 * One named style of a `session_vizmap.xml` as a Cytoscape style: the one named `name`, else the first with a
 * `W_STYLE_VIEW_STYLE_MISSING` note; the other styles are noted as `W_STYLE_OTHER_STYLES`.
 * @param root - the `<vizmap>` element
 * @param name - the style the view names, or null
 * @param notes - where problems are noted
 * @returns the style
 */
function cytoscapeStyleFromVizmap(root: XmlNode, name: string | null, notes: StyleNotes): CytoscapeStyle {
    const style = emptyCytoscapeStyle();
    const styles = root.children.filter((c) => c.name === "visualStyle");
    let chosen = styles.find((s) => s.attrs.get("name") === name);
    if (chosen === undefined) {
        chosen = styles.at(0);
        if (chosen === undefined) {
            notes.add(STYLE_ISSUE.NO_VIZMAP, null, "visualStyle", { sample: "no visualStyle" });
            return style;
        }
        notes.add(STYLE_ISSUE.VIEW_STYLE_MISSING, null, "visualStyle", { sample: String(name) });
    }
    if (styles.length > 1) {
        notes.add(STYLE_ISSUE.OTHER_STYLES, null, "visualStyle", {
            sample: `${styles.length - 1} unused`,
            count: styles.length - 1,
        });
    }
    for (const kind of ["network", "node", "edge"] as const) {
        const section = chosen.children.find((c) => c.name === kind);
        for (const child of section?.children ?? []) {
            readVizmapEntry(style, kind, child);
        }
    }
    return style;
}

/**
 * One dependency or visual property of a vizmap style section, into the style.
 * @param style - the style being read
 * @param kind - the section
 * @param child - the entry
 */
function readVizmapEntry(style: CytoscapeStyle, kind: "network" | "node" | "edge", child: XmlNode): void {
    const childName = child.attrs.get("name");
    if (childName === undefined) {
        return;
    }
    if (child.name === "dependency" && kind !== "network") {
        style[kind].dependencies.set(childName, child.attrs.get("value")?.trim().toLowerCase() === "true");
        return;
    }
    if (child.name !== "visualProperty") {
        return;
    }
    const d = child.attrs.get("default");
    if (d !== undefined) {
        style[kind].defaults.set(childName, d);
    }
    if (kind !== "network") {
        const mapping = vizmapMapping(child);
        if (mapping !== null) {
            style[kind].mappings.set(childName, mapping);
        }
    }
}

/**
 * The mapping of one `<visualProperty>`: a passthrough, discrete or continuous mapping element.
 * @param vp - the element
 * @returns the mapping, or null
 */
function vizmapMapping(vp: XmlNode): CytoscapeMapping | null {
    for (const m of vp.children) {
        const column = m.attrs.get("attributeName");
        if (column === undefined) {
            continue;
        }
        const type = m.attrs.get("attributeType") ?? null;
        if (m.name === "passthroughMapping") {
            return { kind: "passthrough", column, type };
        }
        if (m.name === "discreteMapping") {
            return { kind: "discrete", column, type, table: discreteTable(m, type) };
        }
        if (m.name === "continuousMapping") {
            return { kind: "continuous", column, type, points: continuousPoints(m) };
        }
    }
    return null;
}

/**
 * The entries of a `<discreteMapping>`.
 * @param m - the element
 * @param type - the attribute type its keys are read as
 * @returns the key and value of each entry
 */
function discreteTable(m: XmlNode, type: string | null): [string | number | boolean, unknown][] {
    const table: [string | number | boolean, unknown][] = [];
    for (const e of m.children) {
        const key = typedKey(e.attrs.get("attributeValue"), type);
        const value = e.attrs.get("value");
        if (e.name === "discreteMappingEntry" && key !== null && value !== undefined) {
            table.push([key, value]);
        }
    }
    return table;
}

/**
 * The points of a `<continuousMapping>`.
 * @param m - the element
 * @returns the points with a finite position
 */
function continuousPoints(
    m: XmlNode,
): { at: number; below: string | undefined; value: string | undefined; above: string | undefined }[] {
    return m.children
        .filter((p) => p.name === "continuousMappingPoint" && Number.isFinite(Number(p.attrs.get("attrValue"))))
        .map((p) => ({
            at: Number(p.attrs.get("attrValue")),
            below: p.attrs.get("lesserValue"),
            value: p.attrs.get("equalValue"),
            above: p.attrs.get("greaterValue"),
        }));
}
