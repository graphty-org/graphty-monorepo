/**
 * A Cytoscape visual style as neutral rules: the defaults as one rule, then one rule per mapped column and kind.
 * Cytoscape's precedence (a mapping over a default) becomes rule order. Bypasses are not rules: they are the
 * per-element exceptions the planner lays on top of these.
 */

import type { CanonSite } from "../canon/site.js";
import { StyleNotes } from "../notes.js";
import { canonicalFor } from "../plan/resolve.js";
import type { ColumnRef, Mapping, StyleColumn, StyleRule, StyleTarget, StyleValue, StyleWorkBudget } from "../types.js";
import { type CytoscapeValueParser, NODE_SIZE_VP, sizeParser } from "./lexicon.js";
import type { CytoscapeStyle } from "./mappings.js";
import {
    bendParser,
    chooseVps,
    type CytoscapeElements,
    EDGE_BEND_VP,
    type ParsedMapping,
    parseMapping,
    vpUsage,
} from "./resolve.js";

/**
 * Options of `cytoscapeRules()`.
 * @category Styles
 */
export interface CytoscapeTranslateOptions {
    /** Where problems are noted. */
    readonly notes?: StyleNotes;
    /** The counted work budget. */
    readonly budget?: StyleWorkBudget;
    /**
     * The column a mapping over a file column reads; defaults to `{ data: column }`. A writer's own tagged columns
     * map back to style columns here.
     */
    readonly columnRef?: (column: string) => ColumnRef;
}

/**
 * Neutral rules of a Cytoscape style, and the style columns they read.
 * @category Styles
 */
export interface CytoscapeRules {
    /** The rules, bottom to top. */
    readonly rules: StyleRule[];
    /**
     * Style columns by key: a passthrough whose file values Cytoscape reads differently from their plain reading
     * (a 0..255 transparency, `ROUND_RECTANGLE`) reads its values from `cytoscape.<property>` instead.
     */
    readonly columns: Map<string, StyleColumn>;
}

/** A rule being built from one column and mapping kind. */
interface MappingRule {
    readonly id: string;
    readonly map: Record<string, Mapping>;
}

/**
 * Translates one target's Cytoscape style into neutral rules: one `defaults` rule over every element, then one
 * `mapping` rule per mapped column and mapping kind (`node.discrete.Type`), with `nodeSizeLocked` and
 * `arrowColorMatchesEdge` applied. Discrete keys keep their attribute type.
 * @param target - nodes or edges
 * @param style - the style
 * @param elements - the elements (their bypasses decide which visual property a property is read from)
 * @param options - notes, the budget and how a file column is referenced
 * @returns the rules and the style columns they read
 * @category Styles
 */
export function cytoscapeRules(
    target: StyleTarget,
    style: CytoscapeStyle,
    elements: CytoscapeElements,
    options: CytoscapeTranslateOptions = {},
): CytoscapeRules {
    const notes = options.notes ?? new StyleNotes();
    const refOf = options.columnRef ?? ((column: string): ColumnRef => ({ data: column }));
    const s = style[target];
    const { used } = vpUsage(s, elements.bypasses ?? []);
    const chosen = chooseVps(target, s, used);
    const site = (property: string): CanonSite => ({ notes, target, property, budget: options.budget });
    const locked = target === "node" && s.dependencies.get("nodeSizeLocked") === true;
    const matched = target === "edge" && s.dependencies.get("arrowColorMatchesEdge") === true;

    const set = defaultValues(s, chosen, site, { locked, matched });
    const columns = new Map<string, StyleColumn>();
    const byColumn = new Map<string, MappingRule>();
    const reading: MappingRead = { target, refOf, elements, columns, notes, budget: options.budget };
    const add = (props: readonly string[], vp: string, parse: CytoscapeValueParser): void => {
        const raw = s.mappings.get(vp);
        if (raw === undefined) {
            return;
        }
        const parsed = parseMapping(raw, parse, site(props[0]), vp);
        const mapping = neutralMapping(parsed, props[0], parse, reading);
        const key = `${raw.kind}\u0000${raw.column}`;
        let rule = byColumn.get(key);
        if (rule === undefined) {
            rule = { id: `${target}.${raw.kind}.${raw.column}`, map: {} };
            byColumn.set(key, rule);
        }
        for (const p of props) {
            rule.map[p] = mapping;
        }
    };
    for (const [prop, [vp, parse]] of chosen) {
        add(matched && prop === "color" ? ["color", "sourceArrowColor", "targetArrowColor"] : [prop], vp, parse);
    }
    if (locked) {
        add(["width", "height"], NODE_SIZE_VP, sizeParser);
    }

    const rules: StyleRule[] = [];
    if (Object.keys(set).length > 0) {
        rules.push({
            id: `${target}.defaults`,
            target,
            role: "defaults",
            origin: "declared",
            where: { all: true },
            set,
        });
    }
    for (const r of byColumn.values()) {
        rules.push({ id: r.id, target, role: "mapping", origin: "declared", where: { all: true }, map: r.map });
    }
    return { rules, columns };
}

/**
 * The defaults rule's values: each chosen visual property's default, a locked node size as the width and height
 * (50 when unset), an edge color as both arrow colors when they match the edge, and `curved` only with default bends.
 * @param s - the target's style
 * @param chosen - the visual property and parser each neutral property is read from
 * @param site - where a value of a property is read
 * @param deps - the dependencies that apply
 * @param deps.locked - `nodeSizeLocked`
 * @param deps.matched - `arrowColorMatchesEdge`
 * @returns the values
 */
function defaultValues(
    s: CytoscapeStyle["node"],
    chosen: ReadonlyMap<string, readonly [string, CytoscapeValueParser]>,
    site: (property: string) => CanonSite,
    deps: { readonly locked: boolean; readonly matched: boolean },
): Record<string, StyleValue> {
    const set: Record<string, StyleValue> = {};
    for (const [prop, [vp, parse]] of chosen) {
        const v = s.defaults.has(vp) ? parse(s.defaults.get(vp), site(prop)) : null;
        if (v !== null) {
            set[prop] = v;
        }
    }
    if (deps.locked) {
        const size = s.defaults.has(NODE_SIZE_VP) ? sizeParser(s.defaults.get(NODE_SIZE_VP), site("width")) : null;
        set.width = size ?? 50;
        set.height = size ?? 50;
    }
    if (deps.matched && set.color !== undefined) {
        set.sourceArrowColor = set.color;
        set.targetArrowColor = set.color;
    }
    // EDGE_CURVED only rounds bends: with no default bends, the default edge is straight
    if (set.curved === true && bendParser(s.defaults.get(EDGE_BEND_VP), site("curved")) !== true) {
        set.curved = false;
    }
    return set;
}

/** What turning one target's Cytoscape mappings into neutral ones reads. */
interface MappingRead {
    readonly target: StyleTarget;
    /** How a file column is referenced. */
    readonly refOf: (column: string) => ColumnRef;
    readonly elements: CytoscapeElements;
    /** Where a copied column is put. */
    readonly columns: Map<string, StyleColumn>;
    readonly notes: StyleNotes;
    readonly budget: StyleWorkBudget | undefined;
}

/**
 * A parsed Cytoscape mapping as a neutral mapping. A passthrough stays a passthrough over the file's column when
 * the planner's reading of every value equals Cytoscape's; otherwise Cytoscape's values are copied into the style
 * column `cytoscape.<property>`, which the passthrough reads.
 * @param m - the parsed mapping
 * @param property - the first property it sets
 * @param parse - Cytoscape's parser for the property
 * @param reading - the target, the elements and where copies go
 * @returns the neutral mapping
 */
function neutralMapping(
    m: ParsedMapping,
    property: string,
    parse: CytoscapeValueParser,
    reading: MappingRead,
): Mapping {
    const { target, elements, columns, notes, budget } = reading;
    const by = reading.refOf(m.column);
    if (m.kind === "discrete") {
        return { kind: "discrete", by, table: m.table };
    }
    if (m.kind === "continuous") {
        return { kind: "continuous", by, points: m.points, ...(m.step === undefined ? {} : { step: m.step }) };
    }
    const plain = "style" in by ? styleCell : canonicalFor(target, property);
    const n = elements.count;
    budget?.spend(target, n);
    const values = new Array<StyleValue | null>(n);
    let same = true;
    for (let i = 0; i < n; i++) {
        const raw = elements.value(m.column, i);
        const cy =
            raw === null || raw === undefined || Array.isArray(raw)
                ? null
                : parse(raw, { notes, target, property, element: i });
        values[i] = cy;
        if (same && cy !== (raw === null || raw === undefined || Array.isArray(raw) ? null : plain(raw))) {
            same = false;
        }
    }
    if (same) {
        return { kind: "passthrough", by };
    }
    const key = `cytoscape.${property}`;
    columns.set(key, values);
    return { kind: "passthrough", by: { style: key } };
}

/**
 * How the resolver reads a style column's cell: a scalar as it is.
 * @param raw - the cell
 * @returns the value, or null
 */
function styleCell(raw: unknown): StyleValue | null {
    return typeof raw === "string" || typeof raw === "number" || typeof raw === "boolean" ? raw : null;
}
