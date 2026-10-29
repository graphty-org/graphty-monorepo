/**
 * Filter cards as the app reaches them (design/data/filter-cards.md section 5): a filter condition
 * of graphty-element's (`visibility.conditions`) drawn as one card, its words, the doors that open
 * a new card, and the words Undo and Redo name a change with. The conditions, their matching and
 * their counts are graphty-element's; the app holds only a card not yet written (the draft).
 */

import type {
    CodedFact,
    FilterCondition,
    GraphSession,
    HistoryCode,
    NodeId,
    RuleTree,
} from "@graphty/graphty-element/session";

import { valueWord } from "../inspector/words";
import type { WorkspaceStore } from "../state/store";
import { type Card, cardFields, cardOf, leafOf, type Side } from "../style/cards";
import { filterChangeWords, type Namer, ruleWords } from "./filterWords";
import { sourceName } from "./words";

/**
 * Reads attribute and node names from the session, as the card words show them.
 * @param session - the element's session.
 * @returns the namer.
 */
function namerOf(session: GraphSession): Namer {
    const attributes = session.data.attributes();
    return {
        attribute: (path) =>
            path === "id"
                ? "Node id"
                : (attributes.find((a) => a.path === path)?.plainName ?? path.replace(/^data\./, "")),
        // A node is named by its id until graphty-element publishes its name (#895).
        node: String,
        value: (path, value) => valueWord(value, attributes.find((a) => a.path === path)?.type),
        source: (key) => {
            const load = session.data.sources().find((each) => each.key === key);
            return load === undefined ? "a removed source" : sourceName(load);
        },
    };
}

/**
 * A rule's words: "weight is at least 4", "in the largest component". A card is named by them.
 * @param session - the element's session.
 * @param rule - the rule.
 * @returns the words.
 */
export function conditionWords(session: GraphSession, rule: RuleTree): string {
    return ruleWords(rule, namerOf(session));
}

/** The Filters row, and the inspected id, of the time window. */
export const TIME_ROW = "time-window";

/**
 * Opens the time window's card in the inspector on the Data place.
 * @param store - the chrome store.
 */
export function openTimeCard(store: WorkspaceStore): void {
    store.set({ page: "panels", place: "data", inspected: { kind: "filter-step", id: TIME_ROW } });
}

/** `openFilterDraft`'s target that opens the Filters section's "+" list. */
export const PLUS = "+";

/**
 * Goes to the Filters section and opens a new card on a field (`<node|edge>:<path>`, "Filter
 * to..."), or its "+" list (`PLUS`, the toolbar's Filters).
 * @param store - the chrome store.
 * @param target - `<node|edge>:<path>`, or `PLUS`.
 */
export function openFilterDraft(store: WorkspaceStore, target: string): void {
    store.set({ page: "panels", place: "data", filterDraft: target });
}

/**
 * A new condition id, unique among the conditions and the steps the element holds.
 * @param conditions - the conditions.
 * @param taken - ids also in use (a draft's).
 * @returns the id.
 */
export function newConditionId(conditions: readonly FilterCondition[], taken: readonly string[] = []): string {
    const used = new Set([...conditions.map((c) => c.id), ...taken]);
    let n = conditions.length + 1;
    while (used.has(`filter-${String(n)}`)) {
        n += 1;
    }
    return `filter-${String(n)}`;
}

/**
 * Runs one condition change; a refusal is one notice.
 * @param store - the chrome store.
 * @param change - the change.
 * @returns true when the element took it.
 */
export async function writeCondition(store: WorkspaceStore, change: () => PromiseLike<unknown>): Promise<boolean> {
    try {
        await change();
        return true;
    } catch {
        store.set({ notice: { message: "The filter could not be changed.", error: true } });
        return false;
    }
}

/** How a condition is drawn: by its field cards, as the largest component, as neighbors, or read-only. */
export type CardShape =
    | { readonly kind: "fields"; readonly side: Side; readonly cards: readonly Card[] }
    | { readonly kind: "largest" }
    | { readonly kind: "neighbors"; readonly seeds: readonly NodeId[]; readonly depth: number }
    | { readonly kind: "fixed" };

/**
 * One leaf's card, on the node fields or else the edge fields; null when no card edits it.
 * @param session - the element's session.
 * @param leaf - the leaf.
 * @param at - its place.
 * @returns the card and its side, or null.
 */
function leafCard(session: GraphSession, leaf: RuleTree, at: number): { side: Side; card: Card } | null {
    for (const side of ["node", "edge"] as const) {
        const card = cardOf(session, leaf, cardFields(session, side), at);
        if (card.type !== "fixed") {
            return { side, card };
        }
    }
    return null;
}

/**
 * How a condition's card draws: a largest-component or neighbors card, one field card per leaf of
 * one kind, or a read-only row for a rule no card edits (an old Hide step, an expression, a rule
 * over nodes and edges at once, an exclude condition).
 * @param session - the element's session.
 * @param condition - the condition.
 * @returns the shape.
 */
export function shapeOf(session: GraphSession, condition: Pick<FilterCondition, "effect" | "rule">): CardShape {
    const { rule } = condition;
    if (condition.effect !== "keep" && condition.effect !== "select") {
        return { kind: "fixed" };
    }
    if (rule.kind === "member" && rule.of === "largest-component") {
        return { kind: "largest" };
    }
    if (rule.kind === "neighborhood") {
        return { kind: "neighbors", seeds: rule.seeds, depth: rule.depth };
    }
    const leaves = rule.kind === "all" ? rule.of : [rule];
    const read = leaves.map((leaf, at) => leafCard(session, leaf, at));
    const sides = new Set(read.map((each) => each?.side));
    const [side] = sides;
    if (read.length === 0 || sides.size !== 1 || side === undefined) {
        return { kind: "fixed" };
    }
    const cards = read.flatMap((each) => (each === null ? [] : [each.card]));
    // Two leaves on one field draw one card each only when they read apart; else the rule is kept whole.
    return new Set(cards.map((card) => card.key)).size === cards.length
        ? { kind: "fields", side, cards }
        : { kind: "fixed" };
}

/**
 * The rule a card's field cards make: their leaves ANDed, or null while none has a value.
 * @param cards - the cards.
 * @returns the rule.
 */
export function ruleOfCards(cards: readonly Card[]): RuleTree | null {
    const leaves = cards.flatMap((card) => leafOf(card) ?? []);
    if (leaves.length === 0 || leaves.length < cards.length) {
        return null;
    }
    return leaves.length === 1 ? leaves[0] : { kind: "all", of: leaves };
}

/**
 * Whether two rules say the same, whatever order their keys were written in.
 * @param a - one rule.
 * @param b - the other.
 * @returns true when they match.
 */
export function sameRule(a: RuleTree, b: RuleTree): boolean {
    const text = (rule: RuleTree): string =>
        JSON.stringify(rule, (_key, value: unknown) =>
            value !== null && typeof value === "object" && !Array.isArray(value)
                ? Object.fromEntries(Object.entries(value).sort(([x], [y]) => x.localeCompare(y)))
                : value,
        );
    return text(a) === text(b);
}

/**
 * A filter change as Undo and Redo name it (`turning off the filter "weight is at least 4"`), or
 * null for any other history step, or for a condition the session does not hold now (a removed
 * one before its Redo): read it again after the undo or redo has run.
 * @param session - the element's session.
 * @param fact - the history step's fact.
 * @returns the words, or null.
 */
export function filterChange(session: GraphSession, fact: CodedFact<HistoryCode>): string | null {
    const { id } = fact.params;
    const condition = session.visibility.conditions.find((each) => each.id === id);
    return condition === undefined ? null : filterChangeWords(fact.code, conditionWords(session, condition.rule));
}

/**
 * Selects what a rule holds, replacing the selection: a source row's Select nodes.
 * @param session - the element's session.
 * @param rule - the rule.
 */
export async function selectRule(session: Pick<GraphSession, "selection">, rule: RuleTree): Promise<void> {
    await session.selection.apply({ scope: { define: { kind: "rule", where: rule, reading: "clipped" } } });
}

/**
 * Whether the graph has a column to put on a timeline: one designated, or one whose values read
 * as time.
 * @param session - the element's session.
 * @returns true when a time window can be offered.
 */
export function offersTime(session: GraphSession): boolean {
    return session.time.field !== null || session.time.candidates().length > 0;
}
