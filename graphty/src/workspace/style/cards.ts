/**
 * Condition cards: one rule leaf on one field, typed by the field's kind, combined with AND. The
 * same cards pick a style layer's targets (the Which picker) and make the Data place's filter steps
 * (carried over from design/studio-tier3 and cut to what this branch's element holds). The rule a
 * layer or a step holds is the one source of truth: cards are read from it and written back to it.
 * Every card is one of graphty-element's own rule leaves (range, categories, text, flag, source),
 * an edge card's with `side: "edges"`, so the app writes no query text.
 */

import type { AttributeDescriptor, GraphSession, Layer, RuleTree } from "@graphty/graphty-element/session";

/** Nodes or edges. */
export type Side = "node" | "edge";

/** What a layer's rule picks, as graphty-element's layer holds it. */
export type Selector = Layer["selector"];

/** One field a card can test: a data column of one kind. */
export interface CardField {
    readonly path: string;
    readonly on: Side;
    readonly kind: "number" | "category" | "text" | "yes-no" | "source";
    readonly name: string;
    readonly range?: { readonly min: number; readonly max: number };
    /** A hidden column: its cards still read and edit, but "+" does not offer it. */
    readonly hidden?: boolean;
}

/** How a text card compares. */
export type TextMode = "contains" | "is";

/** One card. `key` is the field's (`node:<path>`), or a fixed card's own. */
export type Card =
    | {
          readonly type: "number";
          readonly key: string;
          readonly field: CardField;
          readonly min?: number;
          readonly max?: number;
      }
    | { readonly type: "category"; readonly key: string; readonly field: CardField; readonly values: readonly string[] }
    | {
          readonly type: "text";
          readonly key: string;
          readonly field: CardField;
          readonly mode: TextMode;
          readonly text: string;
      }
    /** `yes` is unset until the reader picks Yes or No. */
    | { readonly type: "yes-no"; readonly key: string; readonly field: CardField; readonly yes?: boolean }
    /** The loads an element came from (`data.sources()` keys), offered once two or more are loaded. */
    | { readonly type: "source"; readonly key: string; readonly field: CardField; readonly sources: readonly string[] }
    /** A leaf no card edits (a rule made elsewhere): kept as it is, removable. */
    | { readonly type: "fixed"; readonly key: string; readonly leaf: RuleTree; readonly side: Side };

/** The Data source field's path: not a column, the load an element came from (a `source` rule). */
export const SOURCE_PATH = "@source";

/** A text column with at most this many distinct values is a category card. */
const MAX_CATEGORIES = 30;

/**
 * The card kind an attribute makes.
 * @param attribute - the attribute.
 * @returns the kind.
 */
function kindOf(attribute: AttributeDescriptor): CardField["kind"] {
    switch (attribute.type) {
        case "number":
        case "integer":
            return "number";
        case "boolean":
            return "yes-no";
        case "category":
            return "category";
        case "string":
            return (attribute.uniqueCount ?? Infinity) <= MAX_CATEGORIES ? "category" : "text";
        default:
            return "text";
    }
}

/**
 * The fields a card can test on one kind: the data columns graphty-element lists, hidden ones
 * marked so a card already on one keeps its field.
 * @param session - the element's session.
 * @param side - nodes or edges.
 * @returns the fields, in the element's order.
 */
export function cardFields(session: GraphSession, side: Side): CardField[] {
    // With two or more loads, which one an element came from is a field too (spec section 3.4).
    const source: CardField[] =
        session.data.sources().length >= 2
            ? [{ path: SOURCE_PATH, on: side, kind: "source", name: "Data source" }]
            : [];
    return session.data
        .attributes()
        .filter((a) => a.kind === side && a.path.startsWith("data."))
        .map((a) => {
            const kind = kindOf(a);
            return {
                path: a.path,
                on: side,
                kind,
                name: a.plainName,
                ...(a.hidden === true ? { hidden: true } : {}),
                ...(kind === "number" && a.min !== undefined && a.max !== undefined
                    ? { range: { min: a.min, max: a.max } }
                    : {}),
            };
        })
        .concat(source);
}

/**
 * A field's card key: one card per field.
 * @param field - the field.
 * @returns the key.
 */
export const keyOf = (field: Pick<CardField, "on" | "path">): string => `${field.on}:${field.path}`;

/**
 * A new card on a field, as "+" starts it: a number over its whole range (a rule at once), and
 * nothing picked or typed yet for the rest (no rule until the reader picks one).
 * @param field - the field.
 * @returns the card.
 */
export function newCard(field: CardField): Card {
    const key = keyOf(field);
    switch (field.kind) {
        case "number":
            return { type: "number", key, field, min: field.range?.min, max: field.range?.max };
        case "category":
            return { type: "category", key, field, values: [] };
        case "yes-no":
            return { type: "yes-no", key, field };
        case "source":
            return { type: "source", key, field, sources: [] };
        default:
            return { type: "text", key, field, mode: "contains", text: "" };
    }
}

/**
 * The rule leaf a card makes, or null while it is unfinished (no value picked, no text typed).
 * @param card - the card.
 * @returns the leaf.
 */
export function leafOf(card: Card): RuleTree | null {
    if (card.type === "fixed") {
        return card.leaf;
    }
    if (card.type === "source") {
        return card.sources.length === 0 ? null : { kind: "source", sources: card.sources };
    }
    const { path, on } = card.field;
    const side = on === "edge" ? { side: "edges" as const } : {};
    switch (card.type) {
        case "number":
            return {
                kind: "range",
                attribute: path,
                ...(card.min === undefined ? {} : { min: card.min }),
                ...(card.max === undefined ? {} : { max: card.max }),
                ...side,
            };
        case "category":
            return card.values.length === 0
                ? null
                : { kind: "categories", attribute: path, values: card.values, ...side };
        case "yes-no":
            return card.yes === undefined ? null : { kind: "flag", attribute: path, value: card.yes, ...side };
        default:
            return card.text === ""
                ? null
                : { kind: "text", attribute: path, match: card.mode, text: card.text, ...side };
    }
}

/**
 * The card one leaf draws: typed by its field, or a fixed card for a leaf no card edits.
 * @param leaf - the leaf.
 * @param fields - the fields of both kinds.
 * @param at - its place, for a fixed card's key.
 * @returns the card.
 */
export function cardOf(leaf: RuleTree, fields: readonly CardField[], at: number): Card {
    const fixed: Card = { type: "fixed", key: `fixed:${String(at)}`, leaf, side: leafSide(leaf) };
    if (leaf.kind === "source") {
        // A source rule speaks nodes and edges: its card is the node field's when there is one.
        const f =
            fields.find((each) => each.path === SOURCE_PATH && each.on === "node") ??
            fields.find((each) => each.path === SOURCE_PATH);
        return f === undefined ? fixed : { type: "source", key: keyOf(f), field: f, sources: leaf.sources };
    }
    if (leaf.kind !== "range" && leaf.kind !== "categories" && leaf.kind !== "text" && leaf.kind !== "flag") {
        return fixed;
    }
    const side = leafSide(leaf);
    const field = fields.find((f) => f.on === side && f.path === leaf.attribute);
    if (field === undefined) {
        return fixed;
    }
    const key = keyOf(field);
    switch (leaf.kind) {
        case "range":
            return field.kind === "number"
                ? {
                      type: "number",
                      key,
                      field,
                      ...(leaf.min === undefined ? {} : { min: leaf.min }),
                      ...(leaf.max === undefined ? {} : { max: leaf.max }),
                  }
                : fixed;
        case "categories":
            return { type: "category", key, field, values: leaf.values };
        case "flag":
            return { type: "yes-no", key, field, yes: leaf.value };
        default:
            return { type: "text", key, field, mode: leaf.match, text: leaf.text };
    }
}

/**
 * The side a leaf counts: edges for an edge leaf or an attribute leaf read on edges, else nodes.
 * @param leaf - the leaf.
 * @returns nodes or edges.
 */
function leafSide(leaf: RuleTree): Side {
    if (leaf.kind === "edges" || leaf.kind === "self-loop") {
        return "edge";
    }
    return "side" in leaf && leaf.side === "edges" ? "edge" : "node";
}

/**
 * The cards a rule draws: one per leaf of its top `all`.
 * @param rule - the rule, or null for none.
 * @param fields - the fields of both kinds.
 * @returns the cards.
 */
export function cardsOf(rule: RuleTree | null, fields: readonly CardField[]): Card[] {
    if (rule === null) {
        return [];
    }
    const leaves = rule.kind === "all" ? rule.of : [rule];
    return leaves.map((leaf, at) => cardOf(leaf, fields, at));
}

/**
 * The rule some cards make: their finished leaves ANDed, or null for none.
 * @param cards - the cards.
 * @returns the rule.
 */
export function ruleOf(cards: readonly Card[]): RuleTree | null {
    const leaves = cards.flatMap((card) => leafOf(card) ?? []);
    if (leaves.length === 0) {
        return null;
    }
    return leaves.length === 1 ? leaves[0] : { kind: "all", of: leaves };
}

/**
 * The rule a layer's selector holds, when it is one the cards write (a member of an inline rule
 * set), `null` for every element, or undefined for a selector the cards cannot draw.
 * @param selector - the selector.
 * @returns the rule, null, or undefined.
 */
export function selectorRule(selector: Selector): RuleTree | null | undefined {
    if (selector.match === "everything") {
        return null;
    }
    if (selector.match === "member" && typeof selector.of === "object" && "define" in selector.of) {
        const { define } = selector.of;
        return define.kind === "rule" && typeof define.where === "object" ? define.where : undefined;
    }
    return undefined;
}

/**
 * The selector some cards make: every element with none, else a member of the inline rule set,
 * whose edges are those between the rule's nodes, as the visibility filter reads a rule.
 * @param cards - the cards.
 * @returns the selector.
 */
export function selectorOf(cards: readonly Card[]): Selector {
    const where = ruleOf(cards);
    return where === null
        ? { match: "everything" }
        : { match: "member", of: { define: { kind: "rule", where, reading: "clipped" } } };
}

/**
 * The side a card counts: its field's, or the fixed leaf's.
 * @param card - the card.
 * @returns nodes or edges.
 */
export const sideOf = (card: Card): Side => (card.type === "fixed" ? card.side : card.field.on);
