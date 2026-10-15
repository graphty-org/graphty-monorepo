/**
 * The styles of a live Cytoscape.js core: the rules from its stylesheet (`cy.style().json()`) and, when given, the
 * truth per element from what the core reports it draws (`ele.style()`). Reported values win over the stylesheet
 * where they disagree, so a property whose stylesheet value is a function (which `cy.style().json()` writes as "fn")
 * is still exact: it is copied per element from the reported values and noted as `W_STYLE_LAYER_FLATTENED` with the
 * sample (and the rule reason) `FUNCTION`.
 */

import type { GraphSnapshot } from "@graphty/graph-format";

import { StyleBudget } from "../budget.js";
import { StyleNotes } from "../notes.js";
import { featuresOf, styleFingerprint } from "../plan/features.js";
import { planStyles } from "../plan/plan.js";
import type { ExtractedStyles, StyleWorkBudget } from "../types.js";
import { evaluateCytoscapeJs } from "./cascade.js";

/** The input of `readCytoscapeStyles()`. */
export interface CytoscapeLiveInput {
    /** The core's elements: `cy.elements().jsons()`, or `{ nodes, edges }`. */
    readonly elements: unknown;
    /** The core's stylesheet: `cy.style().json()` (a function is written there as "fn"), or the one it was given. */
    readonly style: unknown;
    /**
     * What the core draws for each element, `ele.style()`, in the order of `elements` (for `{ nodes, edges }`, the
     * nodes then the edges); optional, and null for an element with none.
     */
    readonly rendered?: readonly (Readonly<Record<string, unknown>> | null | undefined)[];
    /** The graph the styles are for (the core's elements as a snapshot); the values come out indexed like it. */
    readonly snapshot: GraphSnapshot;
    /** The graph-io format id recorded as the styles' source; default "json". */
    readonly format?: string;
    /** Whether Cytoscape.js's defaults fill what the stylesheet leaves unset; default true. */
    readonly toolDefaults?: boolean;
    /**
     * Where problems are noted; graph-io's own engine passes its notes here.
     * @internal
     */
    readonly notes?: StyleNotes;
    /** The counted work budget. */
    readonly budget?: StyleWorkBudget;
    /** Cancels the work. */
    readonly signal?: AbortSignal;
}

/**
 * What a stylesheet function is read as: a function, whatever it returned.
 * @returns nothing
 */
const FUNCTION = (): null => null;

/**
 * The stylesheet with every "fn" value (how `cy.style().json()` writes a function) read as a function.
 * @param style - the stylesheet
 * @returns the stylesheet to apply
 */
function withFunctions(style: unknown): unknown {
    if (!Array.isArray(style)) {
        return style;
    }
    return style.map((entry: unknown) => {
        if (entry === null || typeof entry !== "object") {
            return entry;
        }
        const e = entry as Record<string, unknown>;
        const props = e.style ?? e.css;
        if (props === null || typeof props !== "object") {
            return entry;
        }
        const copy = Object.create(null) as Record<string, unknown>;
        for (const name of Object.keys(props)) {
            const v = (props as Record<string, unknown>)[name];
            copy[name] = v === "fn" ? FUNCTION : v;
        }
        return { selector: e.selector, style: copy };
    });
}

/**
 * The element list in order: an array as it is, `{ nodes, edges }` as the nodes then the edges.
 * @param elements - the elements
 * @returns the list
 */
function elementList(elements: unknown): readonly unknown[] {
    if (Array.isArray(elements)) {
        return elements;
    }
    if (elements !== null && typeof elements === "object") {
        const e = elements as Record<string, unknown>;
        return [...(Array.isArray(e.nodes) ? e.nodes : []), ...(Array.isArray(e.edges) ? e.edges : [])];
    }
    return [];
}

/**
 * Reads the styles of a live Cytoscape.js core: the stylesheet's rules, with what the core reports it draws as the
 * truth per element when given.
 * @param input - the elements, the stylesheet, the reported values and the graph
 * @returns the styles, exact for every element
 * @category Styles
 */
export function readCytoscapeStyles(input: CytoscapeLiveInput): ExtractedStyles {
    const notes = input.notes ?? new StyleNotes();
    const budget = input.budget ?? new StyleBudget();
    let rendered: Map<object, Readonly<Record<string, unknown>>> | undefined;
    if (input.rendered !== undefined) {
        rendered = new Map();
        const list = elementList(input.elements);
        for (let i = 0; i < list.length && i < input.rendered.length; i++) {
            const json = list[i];
            const r = input.rendered[i];
            if (json !== null && typeof json === "object" && r !== null && r !== undefined && typeof r === "object") {
                rendered.set(json, r);
            }
        }
    }
    const r = evaluateCytoscapeJs({
        elements: input.elements,
        style: withFunctions(input.style),
        snapshot: input.snapshot,
        toolDefaults: input.toolDefaults,
        rendered,
        notes,
        budget,
        signal: input.signal,
    });
    const s = input.snapshot;
    return planStyles(
        {
            format: input.format ?? "json",
            dialect: "cytoscape-js",
            tool: "cytoscape-js",
            units: "px",
            node: { values: r.node.values, rules: r.node.rules, columns: r.node.columns },
            edge: { values: r.edge.values, rules: r.edge.rules, columns: r.edge.columns },
            fingerprint: styleFingerprint(s),
        },
        { node: featuresOf(s, "node"), edge: featuresOf(s, "edge") },
        {
            toolDefaults: input.toolDefaults,
            notes,
            budget,
            signal: input.signal,
            rawColumns: { node: r.node.rawColumns, edge: r.edge.rawColumns },
        },
    );
}
