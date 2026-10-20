/**
 * Condition cards: one rule leaf on one field, typed by the field's kind, combined with AND. The
 * same cards pick a style layer's targets (the Which picker) and make the Data place's filter steps
 * (carried over from design/studio-tier3 and cut to what this branch's element holds). The rule a
 * layer or a step holds is the one source of truth: cards are read from it and written back to it.
 *
 * Temporary, until graphty-element's RuleTree has a text leaf and range / categories leaves on
 * edge columns (design/studio-tier3 has both; the data prototype's element half left them out): a
 * text or yes-no card, and every edge card, is written as the element's own query leaf
 * (`expression` for nodes, `edges` for edges), quoted with the element's `quotePath`.
 */

import {
    type AttributeDescriptor,
    type GraphSession,
    type Layer,
    quotePath,
    type RuleTree,
} from "@graphty/graphty-element/session";

/** Nodes or edges. */
export type Side = "node" | "edge";

/** What a layer's rule picks, as graphty-element's layer holds it. */
export type Selector = Layer["selector"];

/** One field a card can test: a data column of one kind. */
export interface CardField {
    readonly path: string;
    readonly on: Side;
    readonly kind: "number" | "category" | "text" | "yes-no";
    readonly name: string;
    readonly range?: { readonly min: number; readonly max: number };
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
    | { readonly type: "yes-no"; readonly key: string; readonly field: CardField; readonly yes: boolean }
    /** A leaf no card edits (a rule made elsewhere): kept as it is, removable. */
    | { readonly type: "fixed"; readonly key: string; readonly leaf: RuleTree; readonly side: Side };

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
 * The fields a card can test on one kind: the data columns graphty-element lists, hidden ones left
 * out.
 * @param session - the element's session.
 * @param side - nodes or edges.
 * @returns the fields, in the element's order.
 */
export function cardFields(session: GraphSession, side: Side): CardField[] {
    return session.data
        .attributes()
        .filter((a) => a.kind === side && a.hidden !== true && a.path.startsWith("data."))
        .map((a) => {
            const kind = kindOf(a);
            return {
                path: a.path,
                on: side,
                kind,
                name: a.plainName,
                ...(kind === "number" && a.min !== undefined && a.max !== undefined
                    ? { range: { min: a.min, max: a.max } }
                    : {}),
            };
        });
}

/**
 * A field's card key: one card per field.
 * @param field - the field.
 * @returns the key.
 */
export const keyOf = (field: Pick<CardField, "on" | "path">): string => `${field.on}:${field.path}`;

/**
 * A new card on a field, as "+" starts it: a number over its whole range, Yes, nothing picked or
 * typed yet for the rest.
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
            return { type: "yes-no", key, field, yes: true };
        default:
            return { type: "text", key, field, mode: "contains", text: "" };
    }
}

/**
 * Text as a query's raw string literal.
 * @param text - the text.
 * @returns `'text'`, escaped.
 */
const raw = (text: string): string => `'${text.replaceAll("\\", "\\\\").replaceAll("'", "\\'")}'`;

/**
 * A value as a query's JSON literal.
 * @param value - the value.
 * @returns `` `value` ``, escaped.
 */
const json = (value: unknown): string => `\`${JSON.stringify(value).replaceAll("`", "\\`")}\``;

/**
 * The query a card makes, for a leaf the element has no rule form of on this side.
 * @param card - a value card.
 * @returns the query, or null while the card is unfinished.
 */
function queryOf(card: Exclude<Card, { type: "fixed" }>): string | null {
    const q = quotePath(card.field.path);
    switch (card.type) {
        case "number": {
            const parts = [
                ...(card.min === undefined ? [] : [`${q} >= ${json(card.min)}`]),
                ...(card.max === undefined ? [] : [`${q} <= ${json(card.max)}`]),
            ];
            return parts.length === 0 ? `${q} != \`null\`` : parts.join(" && ");
        }
        case "category":
            return card.values.length === 0 ? null : `contains(${json(card.values)}, to_string(${q}))`;
        case "yes-no":
            return `${q} == ${json(card.yes)}`;
        default:
            if (card.text === "") {
                return null;
            }
            return card.mode === "is"
                ? `to_string(${q}) == ${raw(card.text)}`
                : `${q} != \`null\` && contains(to_string(${q}), ${raw(card.text)})`;
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
    const { path, on } = card.field;
    if (on === "node" && card.type === "number") {
        return {
            kind: "range",
            attribute: path,
            ...(card.min === undefined ? {} : { min: card.min }),
            ...(card.max === undefined ? {} : { max: card.max }),
        };
    }
    if (on === "node" && card.type === "category") {
        return card.values.length === 0 ? null : { kind: "categories", attribute: path, values: card.values };
    }
    const where = queryOf(card);
    if (where === null) {
        return null;
    }
    return on === "node" ? { kind: "expression", where } : { kind: "edges", where };
}

/**
 * Text read back from a raw string literal.
 * @param literal - the literal's inside.
 * @returns the text.
 */
const unraw = (literal: string): string => literal.replaceAll(/\\(.)/g, "$1");

/**
 * Escapes text for a regular expression.
 * @param text - the text.
 * @returns it, escaped.
 */
const escape = (text: string): string => text.replaceAll(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * The value card a query leaf reads as on a field, when the query is one `queryOf` writes.
 * @param field - the field.
 * @param where - the query.
 * @returns the card, or undefined.
 */
function cardOfQuery(field: CardField, where: string): Card | undefined {
    const q = escape(quotePath(field.path));
    const key = keyOf(field);
    const literal = "'((?:[^'\\\\]|\\\\.)*)'";
    const num = "`(-?[\\d.eE+-]+)`";
    let m = new RegExp(`^${q} != \`null\` && contains\\(to_string\\(${q}\\), ${literal}\\)$`).exec(where);
    if (m !== null) {
        return { type: "text", key, field, mode: "contains", text: unraw(m[1]) };
    }
    m = new RegExp(`^to_string\\(${q}\\) == ${literal}$`).exec(where);
    if (m !== null) {
        return { type: "text", key, field, mode: "is", text: unraw(m[1]) };
    }
    m = new RegExp(`^${q} == \`(true|false)\`$`).exec(where);
    if (m !== null) {
        return { type: "yes-no", key, field, yes: m[1] === "true" };
    }
    m = new RegExp(`^contains\\(\`(.*)\`, to_string\\(${q}\\)\\)$`).exec(where);
    if (m !== null) {
        const values: unknown = JSON.parse(m[1].replaceAll("\\`", "`"));
        return Array.isArray(values) ? { type: "category", key, field, values: values.map(String) } : undefined;
    }
    if (where === `${quotePath(field.path)} != \`null\``) {
        return { type: "number", key, field };
    }
    m = new RegExp(`^(?:${q} >= ${num})?(?: && )?(?:${q} <= ${num})?$`).exec(where);
    if (m !== null && (m[1] !== undefined || m[2] !== undefined)) {
        return {
            type: "number",
            key,
            field,
            ...(m[1] === undefined ? {} : { min: Number(m[1]) }),
            ...(m[2] === undefined ? {} : { max: Number(m[2]) }),
        };
    }
    return undefined;
}

/**
 * The card one leaf draws: typed by its field, or a fixed card for a leaf no card edits.
 * @param leaf - the leaf.
 * @param fields - the fields of both kinds.
 * @param at - its place, for a fixed card's key.
 * @returns the card.
 */
export function cardOf(leaf: RuleTree, fields: readonly CardField[], at: number): Card {
    const on = (side: Side, path: string): CardField | undefined =>
        fields.find((f) => f.on === side && f.path === path);
    const fixed: Card = {
        type: "fixed",
        key: `fixed:${String(at)}`,
        leaf,
        side: leaf.kind === "edges" ? "edge" : "node",
    };
    switch (leaf.kind) {
        case "range": {
            const f = on("node", leaf.attribute);
            return f?.kind === "number"
                ? { type: "number", key: keyOf(f), field: f, min: leaf.min, max: leaf.max }
                : fixed;
        }
        case "categories": {
            const f = on("node", leaf.attribute);
            return f === undefined ? fixed : { type: "category", key: keyOf(f), field: f, values: leaf.values };
        }
        case "expression":
        case "edges": {
            const side: Side = leaf.kind === "edges" ? "edge" : "node";
            const { where } = leaf;
            for (const f of fields.filter((each) => each.on === side)) {
                const card = cardOfQuery(f, where);
                if (card !== undefined) {
                    return card;
                }
            }
            return fixed;
        }
        default:
            return fixed;
    }
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
