/**
 * Condition cards: a layer's pick as the Which nodes and Which edges pickers draw it (tier3 design,
 * "2026-10-16 -- The combined Style panel"). Each card is one rule leaf on one field, typed by the
 * field's kind; the cards combine with AND. The selector each kind's layer holds is read into
 * cards and written back from them; the element's selector stays the one source of truth.
 */

import {
    type EdgeReading,
    type GraphSession,
    type Layer,
    type LayerId,
    type ReadableValue,
    type ReadableValueKind,
    type RuleTree,
    selectorRule,
} from "@graphty/graphty-element/session";

import { readableName, valueFact, valueName } from "./words";

/** What a layer's rule picks, as graphty-element's layer holds it. */
export type Selector = Layer["selector"];
/** Nodes or edges. */
export type Side = "node" | "edge";

/** The heading a field is listed under in the add menu. */
export type FieldGroup = "Data" | "Results" | "Structure";

/** One value a card can test: an entry of `session.data.readableValues()`, named for a reader. */
export interface CardField {
    readonly path: string;
    readonly on: Side;
    /** What kind of card it makes: the element's kind, or `name` for the node id. */
    readonly kind: ReadableValueKind | "name";
    readonly name: string;
    readonly group: FieldGroup;
    readonly range?: { readonly min: number; readonly max: number };
    /** One fact that tells it from its neighbors in a list ("1 to 36", "6 values"), as the Vary by list says it. */
    readonly fact?: string;
}

/** How a text or a name card compares. */
export type TextMode = "substring" | "starts-with" | "ends-with" | "exact";

/** The two "Match" choices every value card ends with. */
type Presence = "present" | "absent";

/** One card: what it reads and what it keeps. `key` is the field (`node:<path>`), "ends", or a fixed card's own. */
export type Card =
    | {
          readonly type: "number";
          readonly key: string;
          readonly field: CardField;
          readonly match: "range" | "top" | Presence;
          readonly min?: number;
          readonly max?: number;
          readonly top?: number;
      }
    | {
          readonly type: "category";
          readonly key: string;
          readonly field: CardField;
          readonly match: "values" | Presence;
          readonly values: readonly string[];
          /** "(no value)" is ticked: the elements without one pass too. */
          readonly gaps: boolean;
      }
    | {
          readonly type: "text";
          readonly key: string;
          readonly field: CardField;
          readonly match: TextMode | Presence | "list";
          readonly text: string;
          readonly caseSensitive: boolean;
          /** The fixed list of node ids, for a name card's "Use the selected nodes". */
          readonly ids?: readonly string[];
      }
    | {
          readonly type: "yes-no";
          readonly key: string;
          readonly field: CardField;
          readonly match: "yes" | "no" | Presence;
      }
    | { readonly type: "ends"; readonly key: "ends"; readonly reading: "clipped" | "incident" }
    | {
          readonly type: "fixed";
          readonly key: string;
          /** The leaf it holds, or null for a whole selector that stands alone (selected, hovered). */
          readonly leaf: RuleTree | null;
          readonly selector?: Selector;
          readonly words: string;
      };

/** A side's cards, and the edge reading the Ends card writes. */
export interface SideCards {
    readonly cards: readonly Card[];
}

/**
 * The fields a card can test on one kind, from graphty-element's readable values: the node id as
 * Name (Structure), the data columns (Data) and each finished run's fields (Results). A node value
 * read at an edge's end is left out: the Ends card says how edges follow the nodes.
 * @param session - the element's session.
 * @param side - nodes or edges.
 * @returns the fields, in the element's order.
 */
export function cardFields(session: GraphSession, side: Side): CardField[] {
    return session.data
        .readableValues()
        .filter((value) => value.on === side && value.end === undefined)
        .map((value) => fieldOf(session, value));
}

/**
 * One readable value as a card field.
 * @param session - the element's session.
 * @param value - the value.
 * @returns the field.
 */
function fieldOf(session: GraphSession, value: ReadableValue): CardField {
    if (value.path === "id") {
        return { path: "id", on: value.on, kind: "name", name: "Node id", group: "Structure" };
    }
    const groups: Record<ReadableValue["from"], FieldGroup> = { element: "Structure", data: "Data", run: "Results" };
    return {
        path: value.path,
        on: value.on,
        kind: value.kind,
        name: readableName(session, value).name,
        group: groups[value.from],
        ...(value.range === undefined ? {} : { range: value.range }),
        ...withFact(valueFact(value)),
    };
}

/**
 * A fact as an optional field.
 * @param fact - the fact, or undefined.
 * @returns `{ fact }`, or nothing.
 */
const withFact = (fact: string | undefined): { fact?: string } => (fact === undefined ? {} : { fact });

/**
 * A field's card key: one card per field.
 * @param field - the field.
 * @returns the key.
 */
export const keyOf = (field: Pick<CardField, "on" | "path">): string => `${field.on}:${field.path}`;

/**
 * The leaf that says an element carries a value for a path (the element's own spelling of "has a value").
 * @param path - the value path.
 * @returns the leaf.
 */
const present = (path: string): RuleTree => ({ kind: "text", reads: path, mode: "regex", text: "" });

/**
 * Whether a leaf is "has a value" on some path.
 * @param leaf - the leaf.
 * @returns its path, or undefined.
 */
function presentPath(leaf: RuleTree): string | undefined {
    return leaf.kind === "text" && leaf.mode === "regex" && leaf.text === "" ? leaf.reads : undefined;
}

/**
 * A new card on a field, as "+ Add a condition" starts it: a number over its whole range, Yes for
 * a yes-or-no value, nothing picked or typed yet for the rest.
 * @param field - the field.
 * @returns the card.
 */
export function newCard(field: CardField): Card {
    const key = keyOf(field);
    switch (field.kind) {
        case "number":
            return { type: "number", key, field, match: "range", min: field.range?.min, max: field.range?.max };
        case "category":
            return { type: "category", key, field, match: "values", values: [], gaps: false };
        case "yes-no":
            return { type: "yes-no", key, field, match: "yes" };
        default:
            return { type: "text", key, field, match: "substring", text: "", caseSensitive: false };
    }
}

/**
 * The rule leaf a card makes, or null while it is unfinished (no value ticked, no text typed).
 * The Ends card makes none: it says how the node cards reach the edges.
 * @param card - the card.
 * @returns the leaf.
 */
export function leafOf(card: Card): RuleTree | null {
    if (card.type === "ends") {
        return null;
    }
    if (card.type === "fixed") {
        return card.leaf;
    }
    const { path } = card.field;
    if (card.match === "present") {
        return present(path);
    }
    if (card.match === "absent") {
        return { kind: "not", of: present(path) };
    }
    switch (card.type) {
        case "number":
            if (card.match === "top") {
                return card.top === undefined || card.top < 1
                    ? null
                    : { kind: "threshold", path, top: card.top, ties: "all" };
            }
            return {
                kind: "range",
                attribute: path,
                ...(card.min === undefined ? {} : { min: card.min }),
                ...(card.max === undefined ? {} : { max: card.max }),
            };
        case "category": {
            const values: RuleTree = { kind: "categories", attribute: path, values: card.values };
            if (card.values.length === 0) {
                return card.gaps ? { kind: "not", of: present(path) } : null;
            }
            return card.gaps ? { kind: "any", of: [values, { kind: "not", of: present(path) }] } : values;
        }
        case "yes-no":
            return {
                kind: "text",
                reads: path,
                mode: "exact",
                text: String(card.match === "yes"),
                caseSensitive: true,
            };
        default:
            if (card.match === "list") {
                return (card.ids ?? []).length === 0 ? null : { kind: "member", of: { nodes: card.ids ?? [] } };
            }
            return card.text.trim() === ""
                ? null
                : {
                      kind: "text",
                      reads: path,
                      mode: card.match,
                      text: card.text.trim(),
                      ...(card.caseSensitive ? { caseSensitive: true } : {}),
                  };
    }
}

/**
 * Whether a card is finished: it makes a leaf, or it is the Ends card.
 * @param card - the card.
 * @returns true when finished.
 */
export const isFinished = (card: Card): boolean => card.type === "ends" || leafOf(card) !== null;

/** What a selector holds, as leaves ANDed together, or a whole selector that stands alone. */
type Leaves =
    | { readonly leaves: readonly RuleTree[]; readonly edges?: EdgeReading }
    | { readonly whole: Selector; readonly words: string };

/**
 * A selector as the leaves the cards draw: a rule's `all`, a fixed id list and a saved selection as
 * member leaves, any other selector the element has a rule form for through `selectorRule`.
 * @param session - the element's session.
 * @param selector - the selector.
 * @returns the leaves, or the whole selector when it cannot be ANDed with a card.
 */
function leavesOf(session: GraphSession, selector: Selector): Leaves {
    switch (selector.match) {
        case "everything":
            return { leaves: [] };
        case "state":
            return { whole: selector, words: `On the canvas: ${selector.state}` };
        case "ids":
            return selector.edges === undefined
                ? { leaves: [{ kind: "member", of: { nodes: selector.nodes ?? [] } }] }
                : { whole: selector, words: "A rule set elsewhere" };
        case "member":
            return { leaves: [{ kind: "member", of: selector.of }] };
        default: {
            const rule = selectorRule(selector);
            if (rule === undefined) {
                return selector.match === "expression"
                    ? { leaves: [{ kind: "expression", where: selector.where }] }
                    : { whole: selector, words: "A rule set elsewhere" };
            }
            const leaves = rule.where.kind === "all" ? rule.where.of : [rule.where];
            return { leaves, ...(rule.edges === undefined ? {} : { edges: rule.edges }) };
        }
    }
}

/**
 * Whether a leaf on an edge layer's rule speaks about nodes (so it came from the node cards
 * through the Ends card): the node id, a saved selection or id list, the shape leaves, or a value
 * only nodes carry.
 * @param leaf - the leaf.
 * @param edgeFields - the values edges carry.
 * @returns true when it speaks nodes.
 */
function speaksNodes(leaf: RuleTree, edgeFields: readonly CardField[]): boolean {
    const onEdges = (path: string): boolean => edgeFields.some((field) => field.path === path);
    switch (leaf.kind) {
        case "range":
        case "categories":
            return !onEdges(leaf.attribute);
        case "text":
            return leaf.reads === "id" || !onEdges(leaf.reads);
        case "threshold":
            return !onEdges(leaf.path);
        case "not":
            return speaksNodes(leaf.of, edgeFields);
        case "any":
        case "all":
            return leaf.of.length > 0 && leaf.of.every((each) => speaksNodes(each, edgeFields));
        case "member":
        case "degree":
        case "component":
        case "neighborhood":
        case "isolated":
        case "expression":
            return true;
        default:
            return false;
    }
}

/**
 * The card one leaf draws: typed by its field, or a fixed card for a leaf no card edits.
 * @param session - the element's session.
 * @param leaf - the leaf.
 * @param fields - the fields of the kind.
 * @param at - its place, for a fixed card's key.
 * @returns the card.
 */
function cardOf(session: GraphSession, leaf: RuleTree, fields: readonly CardField[], at: number): Card {
    const field = (path: string): CardField | undefined => fields.find((each) => each.path === path);
    const elsewhere: Card = {
        type: "fixed",
        key: `fixed:${String(at)}:${JSON.stringify(leaf)}`,
        leaf,
        words: "A rule set elsewhere",
    };
    const has = presentPath(leaf);
    const hasField = has === undefined ? undefined : field(has);
    if (hasField !== undefined) {
        return presenceCard(hasField, "present");
    }
    if (leaf.kind === "not") {
        const not = presentPath(leaf.of);
        const notField = not === undefined ? undefined : field(not);
        return notField === undefined ? elsewhere : presenceCard(notField, "absent");
    }
    switch (leaf.kind) {
        case "range": {
            const f = field(leaf.attribute);
            return f?.kind === "number"
                ? { type: "number", key: keyOf(f), field: f, match: "range", min: leaf.min, max: leaf.max }
                : elsewhere;
        }
        case "threshold": {
            const f = field(leaf.path);
            return f?.kind === "number" && leaf.top !== undefined && leaf.above === undefined
                ? { type: "number", key: keyOf(f), field: f, match: "top", top: leaf.top }
                : elsewhere;
        }
        case "categories": {
            const f = field(leaf.attribute);
            return f === undefined
                ? elsewhere
                : { type: "category", key: keyOf(f), field: f, match: "values", values: leaf.values, gaps: false };
        }
        case "any": {
            // "Group 3 or no value": a category card with "(no value)" ticked.
            const [values, gap] = leaf.of;
            const f = values?.kind === "categories" ? field(values.attribute) : undefined;
            const gapPath = gap?.kind === "not" ? presentPath(gap.of) : undefined;
            return f !== undefined && leaf.of.length === 2 && values.kind === "categories" && gapPath === f.path
                ? { type: "category", key: keyOf(f), field: f, match: "values", values: values.values, gaps: true }
                : elsewhere;
        }
        case "text": {
            const f = field(leaf.reads);
            if (f === undefined || leaf.mode === "regex") {
                return elsewhere;
            }
            if (f.kind === "yes-no" && leaf.mode === "exact" && (leaf.text === "true" || leaf.text === "false")) {
                return { type: "yes-no", key: keyOf(f), field: f, match: leaf.text === "true" ? "yes" : "no" };
            }
            return {
                type: "text",
                key: keyOf(f),
                field: f,
                match: leaf.mode,
                text: leaf.text,
                caseSensitive: leaf.caseSensitive === true,
            };
        }
        case "member": {
            const name = field("id");
            if (typeof leaf.of === "object" && "nodes" in leaf.of && name !== undefined) {
                return {
                    type: "text",
                    key: keyOf(name),
                    field: name,
                    match: "list",
                    text: "",
                    caseSensitive: false,
                    ids: leaf.of.nodes.map(String),
                };
            }
            if (typeof leaf.of === "object" && "set" in leaf.of) {
                const set = session.sets.get(leaf.of.set)?.name ?? "a saved selection";
                return { ...elsewhere, words: `In a saved selection: ${set}` };
            }
            return elsewhere;
        }
        default:
            return elsewhere;
    }
}

/**
 * A "Has a value" or "Has no value" card on a field.
 * @param field - the field.
 * @param match - which.
 * @returns the card.
 */
function presenceCard(field: CardField, match: Presence): Card {
    const card = newCard(field);
    return { ...card, match } as Card;
}

/**
 * The cards a layer's node part draws on the Node tab.
 * @param session - the element's session.
 * @param selector - the node part's selector.
 * @param fields - the node fields.
 * @returns the cards.
 */
export function nodeCards(session: GraphSession, selector: Selector, fields: readonly CardField[]): Card[] {
    const read = leavesOf(session, selector);
    if ("whole" in read) {
        return [{ type: "fixed", key: "fixed:whole", leaf: null, selector: read.whole, words: read.words }];
    }
    return dedupe(read.leaves.map((leaf, at) => cardOf(session, leaf, fields, at)));
}

/**
 * The cards a layer's edge part draws on the Edge tab: the Ends card first when its rule reads the
 * node cards, then one card per edge leaf.
 * @param session - the element's session.
 * @param selector - the edge part's selector.
 * @param fields - the edge fields.
 * @returns the cards.
 */
export function edgeCards(session: GraphSession, selector: Selector, fields: readonly CardField[]): Card[] {
    const read = leavesOf(session, selector);
    if ("whole" in read) {
        return [{ type: "fixed", key: "fixed:whole", leaf: null, selector: read.whole, words: read.words }];
    }
    const own = read.leaves.filter((leaf) => !speaksNodes(leaf, fields));
    const ends: Card[] =
        own.length < read.leaves.length
            ? [{ type: "ends", key: "ends", reading: read.edges === "incident" ? "incident" : "clipped" }]
            : [];
    return [...ends, ...dedupe(own.map((leaf, at) => cardOf(session, leaf, fields, at)))];
}

/**
 * One card per field: a second leaf on a field already drawn becomes a fixed card, so nothing is lost.
 * @param cards - the cards in order.
 * @returns them, keys unique.
 */
function dedupe(cards: readonly Card[]): Card[] {
    const seen = new Set<string>();
    return cards.map((card, at) => {
        if (!seen.has(card.key)) {
            seen.add(card.key);
            return card;
        }
        const leaf = leafOf(card);
        return {
            type: "fixed",
            key: `fixed:${String(at)}:${JSON.stringify(leaf)}`,
            leaf,
            words: "A rule set elsewhere",
        };
    });
}

/**
 * The node leaves a node part's selector holds, which the Ends card copies into the edge part, or
 * null when it is a whole selector that cannot be.
 * @param session - the element's session.
 * @param selector - the node part's selector.
 * @returns the leaves.
 */
export function nodeLeaves(session: GraphSession, selector: Selector): readonly RuleTree[] | null {
    const read = leavesOf(session, selector);
    return "whole" in read ? null : read.leaves;
}

/**
 * The selector some cards make. A whole fixed card stands alone; no leaves is every element.
 * @param cards - the side's cards; unfinished ones are left out.
 * @param ends - the node leaves an Ends card brings, for the edge part.
 * @returns the selector.
 */
export function selectorOf(cards: readonly Card[], ends: readonly RuleTree[] = []): Selector {
    const whole = cards.find((card) => card.type === "fixed" && card.selector !== undefined);
    if (whole?.type === "fixed" && whole.selector !== undefined) {
        return whole.selector;
    }
    const endsCard = cards.find((card) => card.type === "ends");
    const own = cards.flatMap((card) => leafOf(card) ?? []);
    const leaves = endsCard === undefined ? own : [...ends, ...own];
    if (leaves.length === 0) {
        return { match: "everything" };
    }
    const where: RuleTree = leaves.length === 1 ? leaves[0] : { kind: "all", of: leaves };
    return endsCard?.type === "ends" && endsCard.reading === "incident"
        ? { match: "rule", where, edges: "incident" }
        : { match: "rule", where };
}

/**
 * Whether two selectors pick the same way, so writing one over the other changes nothing.
 * @param a - one.
 * @param b - the other.
 * @returns true when they are the same.
 */
export const sameSelector = (a: Selector, b: Selector): boolean => JSON.stringify(a) === JSON.stringify(b);

/**
 * A number as a card writes it: "12", "0.25".
 * @param n - the number.
 * @returns the words.
 */
const num = (n: number): string => String(Math.round(n * 1000) / 1000);

/**
 * One card in words, as its chip says it: "Degree 5 to 12", "Community: Group 1, Group 3", "Name
 * contains Mme", "On the route: yes", "Ends: both in this layer's nodes".
 * @param session - the element's session.
 * @param card - the card.
 * @returns the words.
 */
export function cardWords(session: GraphSession, card: Card): string {
    if (card.type === "ends") {
        return `Ends: ${card.reading === "incident" ? "either" : "both"} in this layer's nodes`;
    }
    if (card.type === "fixed") {
        return card.words;
    }
    const { name, path } = card.field;
    if (card.match === "present") {
        return `${name}: has a value`;
    }
    if (card.match === "absent") {
        return `${name}: no value`;
    }
    switch (card.type) {
        case "number":
            if (card.match === "top") {
                return card.top === undefined ? `${name}: how many?` : `${name}: highest ${String(card.top)}`;
            }
            if (card.min !== undefined && card.max !== undefined) {
                return `${name} ${num(card.min)} to ${num(card.max)}`;
            }
            if (card.min !== undefined) {
                return `${name} ${num(card.min)} or more`;
            }
            return card.max === undefined ? `${name}: any value` : `${name} up to ${num(card.max)}`;
        case "category": {
            const named = [
                ...card.values.map((value) => valueName(session, path, value)),
                ...(card.gaps ? ["(no value)"] : []),
            ];
            if (named.length === 0) {
                return `${name}: pick values`;
            }
            return named.length > 3 ? `${name}: ${String(named.length)} values` : `${name}: ${named.join(", ")}`;
        }
        case "yes-no":
            return `${name}: ${card.match}`;
        default: {
            if (card.match === "list") {
                const ids = card.ids ?? [];
                return ids.length === 1 ? `${name}: ${ids[0]}` : `${name}: ${String(ids.length)} nodes`;
            }
            if (card.text.trim() === "") {
                return `${name}: type text`;
            }
            return `${name} ${TEXT_WORDS[card.match]} ${card.text.trim()}`;
        }
    }
}

/** A text mode in words. */
export const TEXT_WORDS: Readonly<Record<TextMode, string>> = {
    substring: "contains",
    "starts-with": "starts with",
    "ends-with": "ends with",
    exact: "is exactly",
};

/**
 * The name a hand-made layer is given by its cards, while it is still named by them: the cards'
 * words joined by "and"; with none, nothing.
 * @param session - the element's session.
 * @param cards - the cards.
 * @returns the name, or undefined.
 */
export function cardsName(session: GraphSession, cards: readonly Card[]): string | undefined {
    const named = cards.filter((card) => card.type !== "ends" && isFinished(card));
    return named.length === 0 ? undefined : named.map((card) => cardWords(session, card)).join(" and ");
}

/**
 * Whether a row's layers are blank: they pick every element and set nothing, as a new layer does.
 * @param session - the element's session.
 * @param id - the tree row.
 * @returns true for a blank row.
 */
export function isBlankRow(session: GraphSession, id: LayerId): boolean {
    const parts = session.styles.parts(id);
    const layers = [parts?.node, parts?.edge].flatMap((each) => {
        const layer = each === undefined ? undefined : session.styles.get(each);
        return layer === undefined ? [] : [layer];
    });
    const empty = (record: object | undefined): boolean => record === undefined || Object.keys(record).length === 0;
    return (
        layers.length > 0 &&
        layers.every((layer) => layer.selector.match === "everything" && empty(layer.set) && empty(layer.encode))
    );
}

/**
 * Turn one kind of a tree row on or off, inside a transaction, with the element's `writeRow`
 * target. A new edge part follows the node cards through an Ends card (both ends); a new node part
 * starts on every node. A row whose only kind this is keeps it.
 * @param session - the element's session.
 * @param tx - the transaction.
 * @param rowId - the tree row.
 * @param side - the kind.
 * @param on - on or off.
 * @returns whether the row changed.
 */
export async function writeKind(
    session: GraphSession,
    tx: Pick<GraphSession, "styles">,
    rowId: string,
    side: Side,
    on: boolean,
): Promise<boolean> {
    const parts = session.styles.parts(rowId);
    const has = (kind: Side): boolean => (kind === "node" ? parts?.node : parts?.edge) !== undefined;
    const other: Side = side === "node" ? "edge" : "node";
    if (has(side) === on || (!on && !has(other))) {
        return false;
    }
    const node = parts?.node === undefined ? undefined : session.styles.get(parts.node);
    let target: "node" | "edge" | "both" = other;
    if (on) {
        target = has(other) ? "both" : side;
    }
    const written = await tx.styles.writeRow(rowId, { target });
    if (on) {
        const added = side === "edge" ? written.edge : written.node;
        const leaves = side === "edge" && node !== undefined ? nodeLeaves(session, node.selector) : [];
        const selector: Selector =
            leaves !== null && leaves.length > 0
                ? selectorOf([{ type: "ends", key: "ends", reading: "clipped" }], leaves)
                : { match: "everything" };
        if (added !== undefined) {
            await tx.styles.update(added, { selector });
        }
    }
    return true;
}
