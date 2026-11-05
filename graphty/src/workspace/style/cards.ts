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
    type SourceKey,
} from "@graphty/graphty-element/session";

import { sourceName } from "../data-place/words";
import { edgeName } from "../inspector/words";
import { countName, readableName, valueFact, valueName } from "./words";

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
    /**
     * What kind of card it makes: the element's kind, `name` for the node id, `source` for the
     * load an element came from, or `date` for a column graphty-element says measures time.
     */
    readonly kind: ReadableValueKind | "name" | "source" | "date";
    readonly name: string;
    readonly group: FieldGroup;
    readonly range?: { readonly min: number; readonly max: number };
    /** One fact that tells it from its neighbors in a list ("1 to 36", "6 values"), as the Vary by list says it. */
    readonly fact?: string;
}

/** How a text or a name card compares. */
export type TextMode = "substring" | "starts-with" | "ends-with" | "exact";

/**
 * The `userData` key a layer keeps the name it was given by default under (a selection's name),
 * so the name follows its cards until the reader renames it.
 */
export const DEFAULT_NAME_KEY = "graphtyDefaultName";

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
          /** Instants, epoch milliseconds, both ends kept: the element's range leaf read `as: "time"`. */
          readonly type: "date";
          readonly key: string;
          readonly field: CardField;
          readonly match: "before" | "after" | "between" | Presence;
          readonly min?: number;
          readonly max?: number;
      }
    | {
          readonly type: "yes-no";
          readonly key: string;
          readonly field: CardField;
          readonly match: "yes" | "no" | Presence;
      }
    | {
          /** The loads an element came from (`data.sources()` keys), ticked ones being alternatives. */
          readonly type: "source";
          readonly key: string;
          readonly field: CardField;
          readonly sources: readonly SourceKey[];
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

/** The Data source field's path: not a column, the load an element came from (a `source` leaf). */
export const SOURCE_PATH = "@source";

/**
 * The Data source field of one kind.
 * @param side - nodes or edges.
 * @returns the field.
 */
const sourceField = (side: Side): CardField => ({
    path: SOURCE_PATH,
    on: side,
    kind: "source",
    name: "Data source",
    group: "Data",
});

/**
 * The fields a card can test on one kind, from graphty-element's readable values: the node id as
 * Name (Structure), the data columns (Data) and each finished run's fields (Results). A node value
 * read at an edge's end is left out: the Ends card says how edges follow the nodes. With two or
 * more loads, which one an element came from is a field too, Data source.
 * @param session - the element's session.
 * @param side - nodes or edges.
 * @returns the fields, in the element's order.
 */
export function cardFields(session: GraphSession, side: Side): CardField[] {
    const times = new Set(
        session.data
            .attributes()
            .filter((each) => each.kind === side && each.measurement === "time")
            .map((each) => each.path),
    );
    const fields = session.data
        .readableValues()
        // A data column that only spells each node's id is the node id, listed once as Node id.
        .filter((value) => value.on === side && value.end === undefined && value.holdsNodeIds !== true)
        .map((value) => fieldOf(session, value, times.has(value.path)));
    return session.data.sources().length >= 2 ? [...fields, sourceField(side)] : fields;
}

/**
 * One readable value as a card field.
 * @param session - the element's session.
 * @param value - the value.
 * @param time - graphty-element says the column measures time: a date card, with the span of the
 * time field it is, as the table writes dates.
 * @returns the field.
 */
function fieldOf(session: GraphSession, value: ReadableValue, time = false): CardField {
    if (value.path === "id") {
        return { path: "id", on: value.on, kind: "name", name: "Node id", group: "Structure" };
    }
    const groups: Record<ReadableValue["from"], FieldGroup> = { element: "Structure", data: "Data", run: "Results" };
    const span = time ? timeSpan(session, value.path) : undefined;
    return {
        path: value.path,
        on: value.on,
        kind: time && value.kind !== "number" ? "date" : value.kind,
        name: readableName(session, value).name,
        group: groups[value.from],
        ...(value.range === undefined ? {} : { range: value.range }),
        ...withFact(span ?? valueFact(value)),
    };
}

/**
 * A time field's span in years, "1995 to 2018", when the path is the designated time field.
 * @param session - the element's session.
 * @param path - the column's path.
 * @returns the words, or undefined for another column.
 */
function timeSpan(session: GraphSession, path: string): string | undefined {
    const extent = session.time.extent();
    const name = session.data.attributes().find((each) => each.path === path)?.name;
    const { field } = session.time;
    if (extent === null || name === undefined || (field?.nodes?.start !== name && field?.edges?.start !== name)) {
        return undefined;
    }
    const [from, to] = [extent.from, extent.to].map((at) => new Date(at).getUTCFullYear());
    return from === to ? String(from) : `${String(from)} to ${String(to)}`;
}

/** A day, in epoch milliseconds. */
const DAY = 86_400_000;

/** Text that names a whole year: "2005". */
const YEAR_TEXT = /^\s*(\d{4})\s*$/u;

/**
 * The span typed text names: a year from its first instant to the next year's, a date to the next
 * day's, an instant to itself. The session's time parser reads the text, so the card takes what a
 * time field takes ("2005", "2005-03-01", "Mar 1, 2005").
 * @param session - the element's session.
 * @param text - the box's text.
 * @returns the span's first instant and the first one after it, or null when the text names none.
 */
export function spanOf(session: GraphSession, text: string): { start: number; end: number } | null {
    const year = YEAR_TEXT.exec(text);
    if (year !== null) {
        return { start: Date.UTC(Number(year[1]), 0, 1), end: Date.UTC(Number(year[1]) + 1, 0, 1) };
    }
    // A bare number is a year only at four digits: "2", "20" and "200" are a year still being typed.
    const start = /^\s*[-+]?\d+(?:\.\d*)?\s*$/u.test(text) ? null : session.time.parse(text);
    if (start === null) {
        return null;
    }
    return { start, end: start % DAY === 0 ? start + DAY : start };
}

/** The table's way of writing a day, in UTC as the element's calendar is. */
const DAY_WORDS = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", dateStyle: "medium" });

/**
 * A day as the table writes it.
 * @param at - epoch milliseconds.
 * @returns "May 12, 1998".
 */
export const dayWords = (at: number): string => DAY_WORDS.format(at);

/**
 * An instant as a date card writes it: a year when it starts one, a day when it starts one, else
 * the date and time.
 * @param at - epoch milliseconds.
 * @returns "2005", "Jul 1, 2003", or an ISO date and time.
 */
export function startWords(at: number): string {
    const date = new Date(at);
    if (at % DAY !== 0) {
        return date.toISOString();
    }
    return date.getUTCMonth() === 0 && date.getUTCDate() === 1 ? String(date.getUTCFullYear()) : DAY_WORDS.format(at);
}

/**
 * The span that ends just before an instant, as a date card writes it: the year or the day before.
 * @param at - the first instant after the span.
 * @returns "2004", "Jun 30, 2003", or the instant itself.
 */
export function endWords(at: number): string {
    const date = new Date(at);
    if (at % DAY !== 0) {
        return date.toISOString();
    }
    return date.getUTCMonth() === 0 && date.getUTCDate() === 1
        ? String(date.getUTCFullYear() - 1)
        : DAY_WORDS.format(at - DAY);
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
        case "date":
            return { type: "date", key, field, match: "before" };
        case "source":
            return { type: "source", key, field, sources: [] };
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
    if (card.type === "source") {
        return card.sources.length === 0 ? null : { kind: "source", sources: card.sources };
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
            return numberLeaf(card, path);
        case "date":
            return dateLeaf(card, path);
        case "category":
            return categoryLeaf(card, path);
        case "yes-no":
            return {
                kind: "text",
                reads: path,
                mode: "exact",
                text: String(card.match === "yes"),
                caseSensitive: true,
            };
        default:
            return textLeaf(card, path);
    }
}

/** A card of one type. */
type CardOf<T extends Card["type"]> = Extract<Card, { type: T }>;

/**
 * A date card's leaf: its range compared as times, or null while it has neither end.
 * @param card - the card, matching neither present nor absent.
 * @param path - the value path.
 * @returns the leaf, or null while it is unfinished.
 */
function dateLeaf(card: CardOf<"date">, path: string): RuleTree | null {
    if (card.min === undefined && card.max === undefined) {
        return null;
    }
    return {
        kind: "range",
        attribute: path,
        ...(card.min === undefined ? {} : { min: card.min }),
        ...(card.max === undefined ? {} : { max: card.max }),
        as: "time",
    };
}

/**
 * A number card's leaf: its top N, or its range.
 * @param card - the card, matching neither present nor absent.
 * @param path - the value path.
 * @returns the leaf, or null while it is unfinished.
 */
function numberLeaf(card: CardOf<"number">, path: string): RuleTree | null {
    if (card.match === "top") {
        return card.top === undefined || card.top < 1 ? null : { kind: "threshold", path, top: card.top, ties: "all" };
    }
    return {
        kind: "range",
        attribute: path,
        ...(card.min === undefined ? {} : { min: card.min }),
        ...(card.max === undefined ? {} : { max: card.max }),
    };
}

/**
 * A category card's leaf: its ticked values, and the elements without one when "(no value)" is.
 * @param card - the card, matching neither present nor absent.
 * @param path - the value path.
 * @returns the leaf, or null while nothing is ticked.
 */
function categoryLeaf(card: CardOf<"category">, path: string): RuleTree | null {
    const values: RuleTree = { kind: "categories", attribute: path, values: card.values };
    if (card.values.length === 0) {
        return card.gaps ? { kind: "not", of: present(path) } : null;
    }
    return card.gaps ? { kind: "any", of: [values, { kind: "not", of: present(path) }] } : values;
}

/**
 * A text or name card's leaf: its fixed list of ids, or its typed text.
 * @param card - the card, matching neither present nor absent.
 * @param path - the value path.
 * @returns the leaf, or null while it is unfinished.
 */
function textLeaf(card: CardOf<"text">, path: string): RuleTree | null {
    if (card.match === "list") {
        return (card.ids ?? []).length === 0 ? null : { kind: "member", of: { nodes: card.ids ?? [] } };
    }
    const text = card.text.trim();
    // Present and absent are leafOf's own, before a card's type is read.
    if (text === "" || card.match === "present" || card.match === "absent") {
        return null;
    }
    return {
        kind: "text",
        reads: path,
        mode: card.match,
        text,
        ...(card.caseSensitive ? { caseSensitive: true } : {}),
    };
}

/**
 * Whether a card is finished: it makes a leaf, it is the Ends card, or it holds a whole selector
 * that stands alone (edges picked by hand, the selected or hovered elements).
 * @param card - the card.
 * @returns true when finished.
 */
export const isFinished = (card: Card): boolean =>
    card.type === "ends" || (card.type === "fixed" && card.selector !== undefined) || leafOf(card) !== null;

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
        case "ids": {
            // Ids picked by hand (a layer made from a selection): the nodes are a member leaf, so
            // a condition can be added beside them; edge ids have no leaf form and stand alone.
            const nodes = selector.nodes ?? [];
            const edges = selector.edges ?? [];
            return edges.length === 0
                ? { leaves: [{ kind: "member", of: { nodes } }] }
                : { whole: selector, words: pickedWords(nodes.length, edges.length) };
        }
        case "member":
            return { leaves: [{ kind: "member", of: selector.of }] };
        default: {
            // A rule typed in find (`donations >= \`10000\``) reads as its cards too.
            const rule = selectorRule(selector, { comparisons: true });
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
 * Whether a card is a fixed list of nodes picked by hand, whose words already say how many.
 * @param card - the card.
 * @returns true for that card.
 */
export const isPicked = (card: Card): boolean =>
    card.type === "fixed" &&
    card.leaf?.kind === "member" &&
    typeof card.leaf.of === "object" &&
    "nodes" in card.leaf.of;

/**
 * A fixed list of ids in words: "Picked by hand: 3 nodes", "Picked by hand: 1 node, 2 edges".
 * @param nodes - how many nodes it lists.
 * @param edges - how many edges it lists.
 * @returns the words.
 */
export function pickedWords(nodes: number, edges: number): string {
    const part = (n: number, one: string): string[] =>
        n === 0 && one === "edge" ? [] : [`${String(n)} ${one}${n === 1 ? "" : "s"}`];
    const parts = edges > 0 && nodes === 0 ? part(edges, "edge") : [...part(nodes, "node"), ...part(edges, "edge")];
    return `Picked by hand: ${parts.join(", ")}`;
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
export function cardOf(session: GraphSession, leaf: RuleTree, fields: readonly CardField[], at: number): Card {
    const field: FieldFinder = (path) => fields.find((each) => each.path === path);
    const elsewhere: CardOf<"fixed"> = {
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
    switch (leaf.kind) {
        case "not": {
            const not = presentPath(leaf.of);
            const notField = not === undefined ? undefined : field(not);
            return notField === undefined ? elsewhere : presenceCard(notField, "absent");
        }
        case "range":
            return rangeCard(leaf, field(leaf.attribute), elsewhere);
        case "threshold":
            return thresholdCard(leaf, field, elsewhere);
        case "expression":
            return expressionCard(leaf, field, elsewhere);
        case "categories": {
            const f = field(leaf.attribute);
            return f === undefined
                ? elsewhere
                : { type: "category", key: keyOf(f), field: f, match: "values", values: leaf.values, gaps: false };
        }
        case "any":
            return gapsCard(leaf, field, elsewhere);
        case "text":
            return textCard(leaf, field, elsewhere);
        case "source": {
            // Offered once two loads are in; a rule kept after one was removed still draws.
            const f = field(SOURCE_PATH) ?? sourceField(fields[0]?.on ?? "node");
            return { type: "source", key: keyOf(f), field: f, sources: leaf.sources };
        }
        case "member":
            return memberCard(session, leaf, elsewhere);
        default:
            return elsewhere;
    }
}

/**
 * The card a range leaf draws: a date card for a range read as times, a number card for one read
 * as numbers, else the fixed card.
 * @param leaf - the range leaf.
 * @param f - its field, if the kind has it.
 * @param elsewhere - the fixed card.
 * @returns the card.
 */
function rangeCard(leaf: Extract<RuleTree, { kind: "range" }>, f: CardField | undefined, elsewhere: Card): Card {
    if (leaf.as === "time") {
        return f?.kind === "date" ? dateCard(f, leaf.min, leaf.max) : elsewhere;
    }
    return f?.kind === "number"
        ? { type: "number", key: keyOf(f), field: f, match: "range", min: leaf.min, max: leaf.max }
        : elsewhere;
}

/**
 * A date card from its leaf's bounds: Before with only an end, After with only a start.
 * @param field - the date field.
 * @param min - the leaf's first instant kept.
 * @param max - the leaf's last instant kept.
 * @returns the card.
 */
function dateCard(field: CardField, min: number | undefined, max: number | undefined): Card {
    let match: "before" | "after" | "between" = "between";
    if (min === undefined) {
        match = "before";
    } else if (max === undefined) {
        match = "after";
    }
    return {
        type: "date",
        key: keyOf(field),
        field,
        match,
        ...(min === undefined ? {} : { min }),
        ...(max === undefined ? {} : { max }),
    };
}

/** Finds the field a path names. */
type FieldFinder = (path: string) => CardField | undefined;

/** A rule leaf of one kind. */
type LeafOf<K extends RuleTree["kind"]> = Extract<RuleTree, { kind: K }>;

/**
 * A threshold's card: its top N, or "Above 16" said as it is.
 * @param leaf - the leaf.
 * @param field - finds a path's field.
 * @param elsewhere - the fixed card for a leaf no card edits.
 * @returns the card.
 */
function thresholdCard(leaf: LeafOf<"threshold">, field: FieldFinder, elsewhere: CardOf<"fixed">): Card {
    const f = field(leaf.path);
    if (f?.kind !== "number") {
        return elsewhere;
    }
    if (leaf.above !== undefined && leaf.top === undefined) {
        // "Above 16" has no card of its own (a range card keeps its ends); it is said, kept as it is.
        return { ...elsewhere, words: `${f.name} above ${num(leaf.above)}` };
    }
    return leaf.top !== undefined && leaf.above === undefined
        ? { type: "number", key: keyOf(f), field: f, match: "top", top: leaf.top }
        : elsewhere;
}

/**
 * An expression's card. A bare column name (find's `=email`) tests that the column holds a value:
 * an ordinary card, "Has a value" (Yes for a yes-or-no column). The element reads the name.
 * ponytail: an empty text reads as "has a value" here while the expression passes none; the card's
 * count says what the card keeps.
 * @param leaf - the leaf.
 * @param field - finds a path's field.
 * @param elsewhere - the fixed card for a leaf no card edits.
 * @returns the card.
 */
function expressionCard(leaf: LeafOf<"expression">, field: FieldFinder, elsewhere: CardOf<"fixed">): Card {
    const bare = selectorRule({ match: "expression", where: `${leaf.where} != \`null\`` }, { comparisons: true });
    const path = bare === undefined ? undefined : presentPath(bare.where);
    const named = path === undefined ? undefined : field(path);
    if (named === undefined) {
        return { ...elsewhere, words: ruleWords(leaf.where) };
    }
    return named.kind === "yes-no"
        ? { type: "yes-no", key: keyOf(named), field: named, match: "yes" }
        : presenceCard(named, "present");
}

/**
 * "Group 3 or no value": a category card with "(no value)" ticked.
 * @param leaf - the leaf.
 * @param field - finds a path's field.
 * @param elsewhere - the fixed card for a leaf no card edits.
 * @returns the card.
 */
function gapsCard(leaf: LeafOf<"any">, field: FieldFinder, elsewhere: CardOf<"fixed">): Card {
    const [values, gap] = leaf.of;
    const f = values?.kind === "categories" ? field(values.attribute) : undefined;
    const gapPath = gap?.kind === "not" ? presentPath(gap.of) : undefined;
    return f !== undefined && leaf.of.length === 2 && values.kind === "categories" && gapPath === f.path
        ? { type: "category", key: keyOf(f), field: f, match: "values", values: values.values, gaps: true }
        : elsewhere;
}

/**
 * A text leaf's card: Yes or No on a yes-or-no value, else a text card.
 * @param leaf - the leaf.
 * @param field - finds a path's field.
 * @param elsewhere - the fixed card for a leaf no card edits.
 * @returns the card.
 */
function textCard(leaf: LeafOf<"text">, field: FieldFinder, elsewhere: CardOf<"fixed">): Card {
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

/**
 * A member leaf's card: a fixed list of nodes reads as what it is, nodes picked by hand, whatever
 * made it; a saved selection by its name.
 * @param session - the element's session.
 * @param leaf - the leaf.
 * @param elsewhere - the fixed card for a leaf no card edits.
 * @returns the card.
 */
function memberCard(session: GraphSession, leaf: LeafOf<"member">, elsewhere: CardOf<"fixed">): Card {
    if (typeof leaf.of === "object" && "nodes" in leaf.of) {
        return { ...elsewhere, words: pickedWords(leaf.of.nodes.length, 0) };
    }
    if (typeof leaf.of === "object" && "set" in leaf.of) {
        const set = session.sets.get(leaf.of.set)?.name ?? "a saved selection";
        return { ...elsewhere, words: `In a saved selection: ${set}` };
    }
    return elsewhere;
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
    if (card.type === "source") {
        return sourceWords(session, card);
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
            return numberWords(session, card, name);
        case "date":
            return dateWords(card, name);
        case "category":
            return categoryWords(session, card, name, path);
        case "yes-no":
            return `${name}: ${card.match}`;
        default: {
            if (card.match === "list") {
                return pickedWords((card.ids ?? []).length, 0);
            }
            if (card.text.trim() === "") {
                return `${name}: type text`;
            }
            return `${name} ${TEXT_WORDS[card.match]} ${card.text.trim()}`;
        }
    }
}

/**
 * A Data source card in words: "Data source: hosts.csv", "Data source: pick sources".
 * @param session - the element's session.
 * @param card - the card.
 * @returns the words.
 */
function sourceWords(session: GraphSession, card: Extract<Card, { type: "source" }>): string {
    const loads = session.data.sources();
    const named = card.sources.map((key) => {
        const load = loads.find((each) => each.key === key);
        return load === undefined ? "a removed source" : sourceName(load);
    });
    if (named.length === 0) {
        return `${card.field.name}: pick sources`;
    }
    return named.length > 3
        ? `${card.field.name}: ${String(named.length)} sources`
        : `${card.field.name}: ${named.join(", ")}`;
}

/**
 * A number card in words: its top N, or its range.
 * @param session - the element's session.
 * @param card - the card, matching neither present nor absent.
 * @param name - its field's name.
 * @returns the words.
 */
function numberWords(session: GraphSession, card: CardOf<"number">, name: string): string {
    if (card.match === "top") {
        if (card.top === undefined) {
            return `${name}: how many?`;
        }
        // A count of every element there is keeps them all, and says so.
        const stats = session.data.statistics();
        const total = card.field.on === "node" ? stats.nodeCount : stats.edgeCount;
        return card.top >= total ? `${name}: all ${String(total)}` : `top ${String(card.top)} by ${name}`;
    }
    if (card.min !== undefined && card.max !== undefined) {
        return `${name} ${num(card.min)} to ${num(card.max)}`;
    }
    if (card.min !== undefined) {
        return `${name} ${num(card.min)} or more`;
    }
    return card.max === undefined ? `${name}: any value` : `${name} up to ${num(card.max)}`;
}

/**
 * A date card in words: "installed before 2005", "installed after Jul 1, 2003", "installed 1998 to
 * 2004".
 * @param card - the card, matching neither present nor absent.
 * @param name - its field's name.
 * @returns the words.
 */
function dateWords(card: CardOf<"date">, name: string): string {
    if (card.min !== undefined && card.max !== undefined) {
        return `${name} ${startWords(card.min)} to ${endWords(card.max + 1)}`;
    }
    if (card.min !== undefined) {
        return `${name} after ${endWords(card.min)}`;
    }
    return card.max === undefined ? `${name}: type a date` : `${name} before ${startWords(card.max + 1)}`;
}

/**
 * A category card in words: its ticked values, or how many.
 * @param session - the element's session.
 * @param card - the card, matching neither present nor absent.
 * @param name - its field's name.
 * @param path - its field's path.
 * @returns the words.
 */
function categoryWords(session: GraphSession, card: CardOf<"category">, name: string, path: string): string {
    const named = [
        ...card.values.map((value) => valueName(session, path, value)),
        ...(card.gaps ? ["(no value)"] : []),
    ];
    if (named.length === 0) {
        return `${name}: pick values`;
    }
    return named.length > 3 ? `${name}: ${String(named.length)} values` : `${name}: ${named.join(", ")}`;
}

/** A text mode in words. */
export const TEXT_WORDS: Readonly<Record<TextMode, string>> = {
    substring: "contains",
    "starts-with": "starts with",
    "ends-with": "ends with",
    exact: "is exactly",
};

/**
 * How long a default name made from several cards may be: what the layer list shows whole beside
 * a row's count, the narrowest of the three places that show it (the list, the panel's title and
 * the key).
 */
const NAME_ROOM = 17;

/**
 * The name a hand-made layer is given by its cards, while it is still named by them: the cards'
 * words joined by "and" ("trained: yes and hours"). Several cards whose words would be cut off
 * are named by what they test ("Picked and name"), then by the first and how many more ("trained
 * and 2 more", "trained +2"). One card keeps its words. With no card, nothing.
 * @param session - the element's session.
 * @param cards - the cards.
 * @returns the name, or undefined.
 */
export function cardsName(session: GraphSession, cards: readonly Card[]): string | undefined {
    const named = cards.filter((card) => card.type !== "ends" && isFinished(card));
    if (named.length === 0) {
        return undefined;
    }
    const words = named.map((card) => cardWords(session, card)).join(" and ");
    if (named.length === 1 || words.length <= NAME_ROOM) {
        return words;
    }
    const tests = named.map((card) => {
        if (card.type === "ends") {
            return "";
        }
        if (card.type === "fixed") {
            return isPicked(card) || card.selector?.match === "ids" ? "Picked" : "Rule";
        }
        return card.field.name;
    });
    const rest = String(tests.length - 1);
    return (
        [tests.join(" and "), `${tests[0]} and ${rest} more`].find((name) => name.length <= NAME_ROOM) ??
        `${tests[0]} +${rest}`
    );
}

/**
 * A rule no card draws, in words: the rule as it was typed, its literals without their backticks
 * ("Rule: hours < 20").
 * @param where - the rule.
 * @returns the words.
 */
function ruleWords(where: string): string {
    return `Rule: ${where.replaceAll(/`([^`]*)`/g, "$1").trim()}`;
}

/**
 * The name a layer made from a selector takes, said by its cards: the cards of the kind they
 * speak about (the kind with fewer cards no field draws), nodes first on a tie.
 * @param session - the element's session.
 * @param selector - the selector, such as the rule a find selected with.
 * @returns the name, or undefined when no card says anything.
 */
export function selectorName(session: GraphSession, selector: Selector): string | undefined {
    const sides = [
        nodeCards(session, selector, cardFields(session, "node")),
        edgeCards(session, selector, cardFields(session, "edge")),
    ].map((cards) => ({
        name: cardsName(session, cards),
        fixed: cards.filter((card) => card.type === "fixed").length,
    }));
    const named = sides.filter((side) => side.name !== undefined).sort((a, b) => a.fixed - b.fixed);
    return named[0]?.name;
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
    if (!on) {
        await tx.styles.writeRow(rowId, { target: other });
        return true;
    }
    const written = await tx.styles.writeRow(rowId, { target: has(other) ? "both" : side });
    const added = side === "edge" ? written.edge : written.node;
    if (added !== undefined) {
        await tx.styles.update(added, { selector: newPartSelector(session, side, node) });
    }
    return true;
}

/**
 * Where a new part starts: a new edge part follows the node cards through an Ends card (both
 * ends); a new node part starts on every node.
 * @param session - the element's session.
 * @param side - the new part's kind.
 * @param node - the row's node part, if it has one.
 * @returns the new part's selector.
 */
function newPartSelector(session: GraphSession, side: Side, node: Layer | undefined): Selector {
    const leaves = side === "edge" && node !== undefined ? nodeLeaves(session, node.selector) : [];
    return leaves !== null && leaves.length > 0
        ? selectorOf([{ type: "ends", key: "ends", reading: "clipped" }], leaves)
        : { match: "everything" };
}

/**
 * The name of the selection's own row: the rule that selected it, said as its cards say it
 * ("donations 10000 or more"), a node's label, an edge's ends, or how many are selected.
 * @param session - the element's session.
 * @returns the name.
 */
export function selectionName(session: GraphSession): string {
    const { nodes, edges, origin } = session.selection;
    if (origin !== null && "text" in origin && origin.text.startsWith("=")) {
        return selectorName(session, session.selection.layerSelector) ?? origin.text.slice(1).trim();
    }
    if (nodes.length === 1 && edges.length === 0) {
        return String(nodes[0]);
    }
    const edge = edges.length === 1 && nodes.length === 0 ? session.data.edge(edges[0]) : undefined;
    if (edge !== undefined) {
        return edgeName(session, edge);
    }
    return countName(nodes.length, edges.length);
}
