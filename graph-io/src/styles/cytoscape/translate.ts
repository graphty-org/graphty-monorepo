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
import type { CytoscapeMapping, CytoscapeStyle } from "./mappings.js";
import { chooseVps, type CytoscapeElements, type ParsedMapping, parseMapping, vpUsage } from "./resolve.js";

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

    const set: Record<string, StyleValue> = {};
    for (const [prop, [vp, parse]] of chosen) {
        if (s.defaults.has(vp)) {
            const v = parse(s.defaults.get(vp), site(prop));
            if (v !== null) {
                set[prop] = v;
            }
        }
    }
    if (locked) {
        const size = s.defaults.has(NODE_SIZE_VP) ? sizeParser(s.defaults.get(NODE_SIZE_VP), site("width")) : null;
        set.width = size ?? 50;
        set.height = size ?? 50;
    }
    if (matched && set.color !== undefined) {
        set.sourceArrowColor = set.color;
        set.targetArrowColor = set.color;
    }

    const columns = new Map<string, StyleColumn>();
    const byColumn = new Map<string, MappingRule>();
    const add = (props: readonly string[], raw: CytoscapeMapping, parse: CytoscapeValueParser): void => {
        const parsed = parseMapping(raw, parse, site(props[0]));
        const mapping = neutralMapping(
            parsed,
            props[0],
            parse,
            refOf,
            elements,
            target,
            columns,
            notes,
            options.budget,
        );
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
        const raw = s.mappings.get(vp);
        if (raw !== undefined) {
            add(matched && prop === "color" ? ["color", "sourceArrowColor", "targetArrowColor"] : [prop], raw, parse);
        }
    }
    const size = locked ? s.mappings.get(NODE_SIZE_VP) : undefined;
    if (size !== undefined) {
        add(["width", "height"], size, sizeParser);
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
 * A parsed Cytoscape mapping as a neutral mapping. A passthrough stays a passthrough over the file's column when
 * the planner's reading of every value equals Cytoscape's; otherwise Cytoscape's values are copied into the style
 * column `cytoscape.<property>`, which the passthrough reads.
 * @param m - the parsed mapping
 * @param property - the first property it sets
 * @param parse - Cytoscape's parser for the property
 * @param refOf - how a file column is referenced
 * @param elements - the elements
 * @param target - nodes or edges
 * @param columns - where a copied column is put
 * @param notes - where problems are noted
 * @param budget - the work budget
 * @returns the neutral mapping
 */
function neutralMapping(
    m: ParsedMapping,
    property: string,
    parse: CytoscapeValueParser,
    refOf: (column: string) => ColumnRef,
    elements: CytoscapeElements,
    target: StyleTarget,
    columns: Map<string, StyleColumn>,
    notes: StyleNotes,
    budget: StyleWorkBudget | undefined,
): Mapping {
    const by = refOf(m.column);
    if (m.kind === "discrete") {
        return { kind: "discrete", by, table: m.table };
    }
    if (m.kind === "continuous") {
        return { kind: "continuous", by, points: m.points };
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
