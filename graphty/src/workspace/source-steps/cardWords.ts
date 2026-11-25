/**
 * @file How the join workspace's cards read and name what they hold: the choices of a type list, a
 * card's title, summary and matches in words, and the picks it takes on when its rows become
 * something else. Every fact is the open draft's.
 */

import type { GraphSession, SourceDraft } from "@graphty/graphty-element/session";

import { sourceName } from "../data-place/words";
import { formatNumber } from "../inspector/words";
import { draftSpaceChoices, spaceChoices } from "./join";
import {
    actOf,
    type Becomes,
    type CardAct,
    type CardInto,
    type CardPicks,
    type CardResult,
    DEFAULT_RESULT,
    type JoinCardView,
    keyColumn,
    pairOf,
} from "./joinCards";
import { nameOf } from "./tableColumns";
import { CARD_ACT_WORDS, JOIN_WORDS, WORKSPACE_WORDS } from "./words";

/** A staged source's value in a type list: its keys, before any step builds it. */
const STAGED = "staged:";

/** New nodes' value in a type list. */
export const NEW_VALUE = "new:";

/**
 * What a card's rows become as it is drawn: what the reader picked, else the element's guess, else
 * fields once a match was started from a node.
 * @param card - the card
 * @returns the choice, or null while only the question is asked
 */
export function shownBecomes(card: JoinCardView): Becomes | null {
    const { picks } = card;
    return picks.becomes ?? card.guess ?? (picks.into === null && picks.from?.field === undefined ? null : "fields");
}

/**
 * What a card's step does, or would do: null while a field it needs is unpicked.
 * @param card - the card
 * @returns the act's name
 */
function cardAct(card: JoinCardView): CardAct | null {
    return actOf(card.picks, card.result ?? DEFAULT_RESULT, card.step)?.act ?? null;
}

/**
 * The types a match can name in the graph: each space as the draft builds it, then each staged
 * source the draft has not added yet, by its keys.
 * @param session - the element's session
 * @param draft - the open draft
 * @returns the choices
 */
export function intoChoices(
    session: GraphSession,
    draft: SourceDraft,
): readonly { readonly value: string; readonly label: string }[] {
    const built = new Set(draft.steps().map((step) => step.source));
    return [
        ...draftSpaceChoices(session, draft),
        ...session.data
            .staged()
            .filter((source) => !built.has(source.key))
            .map((source) => ({ value: `${STAGED}${source.key}`, label: sourceName(source) })),
    ];
}

/**
 * A space as the reader reads it, as the draft builds it.
 * @param session - the element's session
 * @param draft - the open draft
 * @param space - the space
 * @returns its name
 */
export function spaceName(session: GraphSession, draft: SourceDraft, space: string): string {
    // A source the draft removes builds no nodes: its space is still named in the committed graph.
    const named = [...draftSpaceChoices(session, draft), ...spaceChoices(session)];
    return named.find((choice) => choice.value === space)?.label ?? space;
}

/**
 * A type list's value as a card's node 1 side.
 * @param value - the picked value
 * @returns the side, on its keys
 */
export function intoOfChoice(value: string): CardInto {
    if (value === NEW_VALUE) {
        return { space: "", isNew: true };
    }
    return value.startsWith(STAGED) ? { space: "", source: value.slice(STAGED.length) } : { space: value };
}

/**
 * A card's node 1 side as its type list's value.
 * @param into - the side
 * @returns the value
 */
export function choiceOfInto(into: CardInto | null): string | null {
    if (into === null) {
        return null;
    }
    if (into.isNew === true) {
        return NEW_VALUE;
    }
    return into.space === "" && into.source !== undefined ? `${STAGED}${into.source}` : into.space;
}

/**
 * A node 1 side as the reader reads it: the type and its field, such as "people.Key".
 * @param session - the element's session
 * @param draft - the open draft
 * @param into - the side
 * @returns the words
 */
export function intoWords(session: GraphSession, draft: SourceDraft, into: CardInto): string {
    if (into.isNew === true) {
        return into.space === "" ? WORKSPACE_WORDS.newNodes : into.space;
    }
    const type =
        into.space === "" && into.source !== undefined
            ? nameOf(session, into.source)
            : spaceName(session, draft, into.space);
    return `${type}.${into.field ?? keyColumn(draft, into) ?? JOIN_WORDS.key}`;
}

/**
 * The name of the source a card reads.
 * @param session - the element's session
 * @param card - the card
 * @returns its name, or "Join" while none is picked
 */
export function cardTitle(session: GraphSession, card: JoinCardView): string {
    const source = card.picks.from?.source;
    return source === undefined ? WORKSPACE_WORDS.title : nameOf(session, source);
}

/**
 * A card's folded summary: its matches, named by their sources, and what its step does.
 * @param session - the element's session
 * @param draft - the open draft
 * @param card - the card
 * @returns the line
 */
export function cardSummary(session: GraphSession, draft: SourceDraft, card: JoinCardView): string {
    const { from, into, to, shared = [] } = card.picks;
    const name = from === null ? "" : nameOf(session, from.source);
    const matches = [
        from?.field === undefined || into === null
            ? null
            : `${intoWords(session, draft, into)} = ${name}.${from.field}`,
        to?.field === undefined || to.into === null
            ? null
            : `${intoWords(session, draft, to.into)} = ${name}.${to.field}`,
        shared.length === 0 ? null : shared.join(", "),
    ].filter((each) => each !== null);
    const act = cardActWords(card);
    const match = act === undefined ? matches.join(", ") : `${act}: ${matches.join(", ")}`;
    const b = card.step?.buckets;
    if (b === null || b === undefined) {
        return match;
    }
    const done =
        card.step?.op === "join.merge"
            ? `${formatNumber(b.merged)} ${WORKSPACE_WORDS.merged}, ${formatNumber(b.keptNew)} ${WORKSPACE_WORDS.new}`
            : `${formatNumber(b.newEdges)} ${WORKSPACE_WORDS.edges.toLowerCase()}`;
    return `${match}; ${done}`;
}

/**
 * Which way a card's edges can run, by its numbered rows.
 * @param picks - the card's picks
 * @returns the two ways
 */
export function directions(
    picks: CardPicks,
): readonly { readonly value: CardResult["direction"]; readonly label: string }[] {
    const other = picks.to !== undefined && picks.to !== null;
    const path = picks.becomes === "node" ? ["1", "2", ...(other ? ["3"] : [])] : ["1", "3"];
    return [
        { value: "into-from", label: path.join("->") },
        { value: "from-into", label: path.toReversed().join("->") },
    ];
}

/**
 * The picks a Links card starts with: values in the rows when a field of theirs already names a node,
 * else on the nodes the card's source or its node 1 holds.
 * @param draft - the open draft
 * @param picks - the card's picks
 * @returns the picks
 */
function linking(draft: SourceDraft, picks: CardPicks): CardPicks {
    const { from } = picks;
    const into = picks.into?.isNew === true ? null : picks.into;
    const links = { ...picks, becomes: "links" as const, to: null, shared: [] };
    if (from?.field !== undefined && into !== null) {
        return { ...links, inRows: true };
    }
    if (from === null) {
        return { ...links, into, inRows: false };
    }
    const own = draft.spaces().find((space) => space.rowsOf.includes(from.source));
    const theirs: CardInto = own === undefined ? { space: "", source: from.source } : { space: own.space };
    return { ...links, from: { source: from.source }, into: into ?? theirs, inRows: false };
}

/**
 * The picks a card takes on when the reader says what its rows become: the matches it has stay, and
 * what the choice cannot use goes.
 * @param draft - the open draft
 * @param picks - the card's picks
 * @param becomes - the choice
 * @returns the picks
 */
export function becoming(draft: SourceDraft, picks: CardPicks, becomes: Becomes): CardPicks {
    if (becomes === "links") {
        return linking(draft, picks);
    }
    const { shared: _shared, inRows: _inRows, to = null, ...rest } = picks;
    // New nodes at 1 are a node's own: no field or edge matches them. With one type of node in the
    // graph, it is the one a match can name.
    const types = draft.spaces().filter((space) => !space.rowsOf.includes(rest.from?.source ?? ""));
    const only: CardInto | null = types.length === 1 && types[0] !== undefined ? { space: types[0].space } : null;
    const into: CardInto | null = becomes !== "node" && rest.into?.isNew === true ? null : (rest.into ?? only);
    const next: CardPicks = { ...rest, becomes, into };
    if (becomes === "fields" || into?.isNew === true) {
        return { ...next, to: null };
    }
    return { ...next, to: becomes === "edge" ? (to ?? { into: null }) : to };
}
/**
 * What a card's step is called beside its title.
 * @param card - the card
 * @returns the word, or undefined while it makes nothing
 */
export function cardActWords(card: JoinCardView): string | undefined {
    const act = card.step === null ? null : cardAct(card);
    return act === null ? undefined : CARD_ACT_WORDS[act];
}

/**
 * Whether a card matches two fields, so the table can list their values.
 * @param card - the card
 * @returns true when it does
 */
export function hasMatch(card: JoinCardView): boolean {
    return shownBecomes(card) !== "links" && pairOf(card.picks) !== null;
}
