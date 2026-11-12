/**
 * Condition cards: a layer's pick as the Which nodes and Which edges pickers draw it (tier3 design,
 * "2026-10-16 -- The combined Style panel"). Each card is one of graphty-element's conditions on one
 * field, named and worded for a reader here; the cards combine with AND. graphty-element reads a
 * selector into conditions and writes them back (`nodeConditions`, `conditionSelector`); the
 * element's selector stays the one source of truth.
 */

import {
    type Condition,
    CONDITION_SOURCE_PATH,
    type ConditionField,
    conditionFields,
    conditionKey,
    conditionLeaf,
    conditionOf,
    conditionSelector,
    type ConditionTextMode,
    edgeConditions,
    type GraphSession,
    isConditionFinished,
    type Layer,
    type LayerId,
    type ListedConditionField,
    newCondition,
    nodeConditionLeaves,
    nodeConditions,
    type RuleTree,
    type Scope,
    type ValueHistogram,
} from "@graphty/graphty-element/session";

import { sourceName } from "../data-place/words";
import { edgeName } from "../inspector/words";
import { countName, readableName, valueFact, valueName } from "./words";

/** What a layer's rule picks, as graphty-element's layer holds it. */
export type Selector = Layer["selector"];
/** Nodes or edges. */
export type Side = "node" | "edge";

/** The heading a field is listed under in the add menu. */
type FieldGroup = "Data" | "Results" | "Structure";

/** One value a card can test: one of graphty-element's condition fields, named for a reader. */
export interface CardField extends ConditionField {
    readonly name: string;
    readonly group: FieldGroup;
    /** graphty-element says it holds whole numbers only (a count, a rank), so a slider steps by 1. */
    readonly integer?: boolean;
    /** One fact that tells it from its neighbors in a list ("1 to 36", "6 values"), as the Vary by list says it. */
    readonly fact?: string;
    /** The elements a card counts over (a selection's base); absent, the whole graph. */
    readonly within?: "graph" | "visible";
    /**
     * What a checklist counts its values over when that is narrower than `within`: a Keep or
     * Except step's input, so each value's count is what the step would keep of it.
     */
    readonly counted?: Scope;
    /** How many of them have no value, when the card cannot read it by its path. */
    readonly missing?: number;
    /**
     * How the values are spread, when no path names them (a selection step's own computation, on
     * So far or over its Links): its bars are drawn from this instead of a column.
     */
    readonly spread?: ValueHistogram;
    /** The values and counts of a selection step's own computation, when no path names them. */
    readonly listed?: Extract<ValueHistogram, { kind: "categorical" }>;
    /** A selection step's Links: the edge condition a structure value (degree) is counted over. */
    readonly links?: RuleTree;
    /** Plain words for what it is, as the picker's tooltip (selection spec 3.5). */
    readonly tip?: string;
    /** Other words the picker's search finds it by ("links" for Degree). */
    readonly aliases?: readonly string[];
}

/** How a text or a name card compares. */
export type TextMode = ConditionTextMode;

/**
 * The `userData` key a layer keeps the name it was given by default under (a selection's name),
 * so the name follows its cards until the reader renames it.
 */
export const DEFAULT_NAME_KEY = "graphtyDefaultName";

/** graphty-element's fixed condition: a leaf or a whole selector no card edits. */
type FixedCondition = Extract<Condition<CardField>, { type: "fixed" }>;

/**
 * One card: graphty-element's condition on a named field; a fixed one carries the words its chip
 * says. `key` is the field (`node:<path>`), "ends", or a fixed card's own.
 */
export type Card = Exclude<Condition<CardField>, { type: "fixed" }> | (FixedCondition & { readonly words: string });

/** The Data source field's path: not a column, the load an element came from (a `source` leaf). */
export const SOURCE_PATH = CONDITION_SOURCE_PATH;

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
 * The fields a card can test on one kind: graphty-element's condition fields, named and grouped
 * here -- the node id as Node id (Structure), the data columns (Data), each finished run's fields
 * (Results), and Data source with two or more loads.
 * @param session - the element's session.
 * @param side - nodes or edges.
 * @returns the fields, in the element's order.
 */
export function cardFields(session: GraphSession, side: Side): CardField[] {
    return conditionFields(session, side).map((field) => fieldOf(session, field));
}

/**
 * One condition field as a card field.
 * @param session - the element's session.
 * @param field - the field.
 * @returns the card field.
 */
function fieldOf(session: GraphSession, field: ListedConditionField): CardField {
    const { value } = field;
    if (value === undefined) {
        return sourceField(field.on);
    }
    if (field.kind === "name") {
        return { path: field.path, on: field.on, kind: "name", name: "Node id", group: "Structure" };
    }
    const groups: Record<typeof value.from, FieldGroup> = { element: "Structure", data: "Data", run: "Results" };
    const span = timeSpan(session, field.path);
    return {
        path: field.path,
        on: field.on,
        kind: field.kind,
        name: readableName(session, value).name,
        group: groups[value.from],
        // A result is found by its field's name too ("Label propagation: community").
        ...(value.from === "run" ? { aliases: [field.path.split(".").at(-1) ?? ""] } : {}),
        ...(field.range === undefined ? {} : { range: field.range }),
        ...(field.integer === true ? { integer: true } : {}),
        ...withFact(span ?? valueFact(value)),
    };
}

/**
 * Whether what a path reads holds whole numbers only (a count, a rank), as graphty-element types it:
 * an integer column or an integer run field.
 * @param session - the element's session
 * @param path - what is read
 * @returns true for an integer column or run result
 */
export function wholeNumbers(session: GraphSession, path: string): boolean {
    if (session.data.attributes().some((column) => column.path === path && column.type === "integer")) {
        return true;
    }
    return session.runs
        .list()
        .some((run) => run.fields.some((f) => f.type === "integer" && session.results.path(run.id, f.name) === path));
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
export const keyOf = conditionKey;

/**
 * A new card on a field, as "+ Add a condition" starts it: graphty-element's new condition.
 * @param field - the field.
 * @returns the card.
 */
export const newCard = (field: CardField): Card => newCondition(field);

/**
 * The rule leaf a card makes, or null while it is unfinished (no value ticked, no text typed).
 * The Ends card makes none: it says how the node cards reach the edges.
 */
export const leafOf: (card: Card) => RuleTree | null = conditionLeaf;

/**
 * The rule leaf a card makes in a style layer: a Highest or a percentile ranks among what is
 * shown, so the layer picks the top of what the reader sees (owner decision C,
 * design/working-graph/design.md). A filter's and a selection's cards keep `leafOf`'s whole-graph
 * ranking.
 * @param card - the card.
 * @returns the leaf, or null while it is unfinished.
 */
export function styleLeafOf(card: Card): RuleTree | null {
    const leaf = leafOf(card);
    return leaf?.kind === "threshold" && card.type !== "fixed" ? { ...leaf, within: "visible" } : leaf;
}

/**
 * Whether a card is finished: it makes a leaf, it is the Ends card, or it holds a whole selector
 * that stands alone (edges picked by hand).
 */
export const isFinished: (card: Card) => boolean = isConditionFinished;

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
function pickedWords(nodes: number, edges: number): string {
    const part = (n: number, one: string): string[] =>
        n === 0 && one === "edge" ? [] : [`${String(n)} ${one}${n === 1 ? "" : "s"}`];
    const parts = edges > 0 && nodes === 0 ? part(edges, "edge") : [...part(nodes, "node"), ...part(edges, "edge")];
    return `Picked by hand: ${parts.join(", ")}`;
}

/** The words of a fixed card graphty-element says nothing more about. */
const ELSEWHERE = "A rule set elsewhere";

/**
 * A condition as its card: a fixed one with the words its chip says. A Data source leaf kept after
 * a load was removed (so the kind offers no Data source field) still draws as its card.
 * @param session - the element's session.
 * @param condition - graphty-element's condition.
 * @param fields - the fields of the kind.
 * @returns the card.
 */
function cardFrom(session: GraphSession, condition: Condition<CardField>, fields: readonly CardField[]): Card {
    if (condition.type !== "fixed") {
        return condition;
    }
    const { leaf, selector } = condition;
    if (selector?.match === "ids") {
        return { ...condition, words: pickedWords(selector.nodes?.length ?? 0, selector.edges?.length ?? 0) };
    }
    if (leaf?.kind === "source" && condition.repeat !== true) {
        const field = sourceField(fields[0]?.on ?? "node");
        return { type: "source", key: keyOf(field), field, sources: leaf.sources };
    }
    return {
        ...condition,
        words: leaf === null || condition.repeat === true ? ELSEWHERE : fixedWords(session, leaf, fields),
    };
}

/**
 * A leaf no card edits, in words: "Degree above 16", "Rule: hours < 20", "Picked by hand: 3
 * nodes", "In a saved selection: Hubs", "On the canvas: hovered".
 * @param session - the element's session.
 * @param leaf - the leaf.
 * @param fields - the fields of the kind.
 * @returns the words.
 */
function fixedWords(session: GraphSession, leaf: RuleTree, fields: readonly CardField[]): string {
    switch (leaf.kind) {
        case "threshold": {
            const f = fields.find((each) => each.path === leaf.path);
            return f?.kind === "number" && leaf.above !== undefined && leaf.top === undefined
                ? `${f.name} above ${num(leaf.above)}`
                : ELSEWHERE;
        }
        case "expression":
            return ruleWords(leaf.where);
        case "member":
            if (typeof leaf.of === "object" && "nodes" in leaf.of) {
                return pickedWords(leaf.of.nodes.length, 0);
            }
            if (typeof leaf.of === "object" && "set" in leaf.of) {
                return `In a saved selection: ${session.sets.get(leaf.of.set)?.name ?? "a saved selection"}`;
            }
            return ELSEWHERE;
        case "state":
            return `On the canvas: ${leaf.state}`;
        default:
            return ELSEWHERE;
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
    return cardFrom(session, conditionOf(leaf, fields, at), fields);
}

/**
 * The cards a layer's node part draws on the Node tab.
 * @param session - the element's session.
 * @param selector - the node part's selector.
 * @param fields - the node fields.
 * @returns the cards.
 */
export function nodeCards(session: GraphSession, selector: Selector, fields: readonly CardField[]): Card[] {
    return nodeConditions(selector, fields).map((condition) => cardFrom(session, condition, fields));
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
    return edgeConditions(selector, fields).map((condition) => cardFrom(session, condition, fields));
}

/**
 * The node leaves a node part's selector holds, which the Ends card copies into the edge part, or
 * null when it is a whole selector that cannot be.
 */
export const nodeLeaves: (selector: Selector) => readonly RuleTree[] | null = nodeConditionLeaves;

/**
 * The selector some cards make (unfinished ones left out), with the node leaves an Ends card brings.
 * A style layer's Highest or percentile card ranks among what is shown: see {@link styleLeafOf}.
 * @param cards - the side's cards.
 * @param ends - the node leaves an Ends card brings, for the edge part.
 * @returns the selector.
 */
export function selectorOf(cards: readonly Card[], ends: readonly RuleTree[] = []): Selector {
    return conditionSelector(cards.map(rankedAmongShown), ends);
}

/**
 * A card whose leaf ranks among what is shown, as a fixed card holding that leaf; any other card as it is.
 * @param card - the card.
 * @returns the card to combine.
 */
function rankedAmongShown(card: Card): Card {
    const leaf = card.type === "fixed" ? null : styleLeafOf(card);
    return leaf?.kind === "threshold" ? { type: "fixed", key: card.key, leaf } : card;
}

/**
 * Whether two selectors pick the same way, so writing one over the other changes nothing.
 * @param a - one.
 * @param b - the other.
 * @returns true when they are the same.
 */
export const sameSelector = (a: Selector, b: Selector): boolean => JSON.stringify(a) === JSON.stringify(b);

/** A card of one type. */
type CardOf<T extends Card["type"]> = Extract<Card, { type: T }>;

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
            // Yes and No as the table and the field write them.
            if (card.match === "unset") {
                return `${name}: pick yes or no`;
            }

            return `${name}: ${card.match === "yes" ? "Yes" : "No"}`;
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
 * A Top-N number card in words: "top 5 by degree", "bottom 10% by age".
 * @param session - the element's session.
 * @param card - the card, matching its top or bottom.
 * @param name - its field's name.
 * @returns the words.
 */
function topWords(session: GraphSession, card: CardOf<"number">, name: string): string {
    if (card.top === undefined) {
        return `${name}: how many?`;
    }
    const end = card.from === "low" ? "bottom" : "top";
    if (card.percent === true) {
        return `${end} ${num(card.top)}% by ${name}`;
    }
    // A count of every element there is keeps them all, and says so: every element of the
    // card's base, the whole graph unless it has one.
    const stats = session.data.statistics({ scope: card.field.within === "visible" ? "visible" : "all" });
    const total = card.field.on === "node" ? stats.nodeCount : stats.edgeCount;
    return card.top >= total ? `${name}: all ${String(total)}` : `${end} ${String(card.top)} by ${name}`;
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
        return topWords(session, card, name);
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
    const leaves = side === "edge" && node !== undefined ? nodeLeaves(node.selector) : [];
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

/** How many value rows a checklist draws in all, whatever the column holds (spec 4.3). */
export const SHOWN_VALUES = 8;

/** A value of a checklist: its value, its name and how many carry it. */
export interface Listed {
    readonly value: string;
    readonly label: string;
    readonly count: number;
}

/**
 * The rows a checklist draws, never more than {@link SHOWN_VALUES} (spec 4.3): with nothing typed
 * the checked values first, then the largest unchecked; while typing, the matches, checked or not.
 * @param named - every value, largest first.
 * @param checked - the checked values.
 * @param typed - the search, lower case.
 * @returns the rows, how many more are checked than drawn, and the matches and unchecked counts.
 */
export function checklistRows(
    named: readonly Listed[],
    checked: ReadonlySet<string>,
    typed: string,
): { rows: Listed[]; moreChecked: number; matches: readonly Listed[]; unchecked: number } {
    if (typed !== "") {
        const matches = named.filter((each) => each.label.toLowerCase().includes(typed));
        return { rows: matches.slice(0, SHOWN_VALUES), moreChecked: 0, matches, unchecked: 0 };
    }
    const ticked = named.filter((each) => checked.has(each.value));
    const rest = named.filter((each) => !checked.has(each.value));
    // The checked never fill the list: the two largest unchecked stay reachable without a search.
    const pinned = ticked.slice(0, SHOWN_VALUES - Math.min(2, rest.length));
    return {
        rows: [...pinned, ...rest.slice(0, SHOWN_VALUES - pinned.length)],
        moreChecked: ticked.length - pinned.length,
        matches: named,
        unchecked: rest.length,
    };
}
