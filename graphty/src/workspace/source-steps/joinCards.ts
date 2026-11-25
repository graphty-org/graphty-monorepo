/**
 * @file The join workspace's cards (issue #9796): one card per join, each one or more matches and
 * one result. A card with a result is a step of the one open source draft and is read back from
 * `draft.steps()` after every change, so undo never leaves a card out of step with the draft; a
 * card with no result yet is only the reader's picks. Every count, value list and column comes
 * from the open draft, never the committed graph.
 */

import type {
    JoinReduce,
    SourceDraft,
    SourceJoinAct,
    SourceJoinInto,
    SourceKey,
    SourceMatchCounts,
    SourceMatchPair,
    SourceStepRow,
} from "@graphty/graphty-element/session";

import { columnsOf } from "./join";

/**
 * The node 1 side of a match: a space's keys, a column of a source that supplied it, or (with an
 * empty `space`) a staged source's keys.
 */
export interface CardInto {
    readonly space: string;
    readonly source?: SourceKey;
    readonly field?: string;
}

/** The reader's picks of one card. */
export interface CardPicks {
    /** The incoming source and the field that names node 1. */
    readonly from: { readonly source: SourceKey; readonly field?: string } | null;
    readonly into: CardInto | null;
    readonly ignoreCase: boolean;
    readonly ignoreSpaces: boolean;
    /** Connect's second match: the incoming field naming the other end, and the nodes it names. */
    readonly to?: { readonly field?: string; readonly into: CardInto | null } | null;
}

/** A card's result and its options, as the draft's step carries them. */
export interface CardResult {
    readonly result: "merge" | "connect";
    /** Merge: what a node named by several rows keeps: the first or last row, or every row's values as a list or a count. */
    readonly many: "first" | "last" | "list" | "count";
    /** Merge: what a row matching no node does. */
    readonly unmatchedFrom: "keep" | "drop";
    /** Connect: which way the edges run. */
    readonly direction: "into-from" | "from-into";
    readonly edgeType: string;
    /** Connect: one edge per pair of ends. */
    readonly perPair: boolean;
    /** Connect: a row whose field names no node. */
    readonly unmatched: "skip" | "add";
}

/** A card with no result yet: only the reader's picks. */
export interface PendingCard {
    readonly id: string;
    readonly picks: CardPicks;
    /** The result the element guessed, shown as a suggestion and never picked for the reader. */
    readonly guess: "merge" | "connect" | null;
    /** Whether the picks are still the element's guess. */
    readonly suggested: boolean;
    /**
     * The picks of every step the card wrote, its first and each rewrite: while a step with any
     * of them is in the draft the card is drawn as that step's card, and it is drawn again as this
     * card once undo takes them all back.
     */
    readonly written?: readonly CardPicks[];
}

/** One card as the workspace draws it. */
export interface JoinCardView {
    readonly id: string;
    /** The draft step it is, or null for a pending card. */
    readonly step: SourceStepRow | null;
    readonly picks: CardPicks;
    readonly result: CardResult | null;
    readonly guess: "merge" | "connect" | null;
    readonly suggested: boolean;
}

/** The options a new result starts with. */
export const DEFAULT_RESULT: Omit<CardResult, "result"> = {
    many: "first",
    unmatchedFrom: "keep",
    direction: "into-from",
    edgeType: "",
    perPair: false,
    unmatched: "skip",
};

/**
 * A step's card id: its place, so a card follows its step through undo.
 * @param index - The step's place.
 * @returns The id.
 */
export function stepCardId(index: number): string {
    return `step:${String(index)}`;
}

/**
 * The cards of a draft's join steps, in step order, then the pending cards.
 * @param draft - The open draft.
 * @param pending - The cards with no result yet.
 * @returns The cards.
 */
export function cardsOf(draft: SourceDraft, pending: readonly PendingCard[]): JoinCardView[] {
    const steps = draft.steps().flatMap((row): JoinCardView[] => {
        const { act } = row;
        if (act === null) {
            return [];
        }
        const into: CardInto =
            act.into.source === undefined || act.into.field === undefined
                ? { space: act.into.space }
                : { space: act.into.space, source: act.into.source, field: act.into.field };
        const to = act.to === undefined ? {} : { to: { field: act.to.field, into: { space: act.to.into.space } } };
        return [
            {
                id: stepCardId(row.index),
                step: row,
                picks: { from: act.from, into, ignoreCase: act.ignoreCase, ignoreSpaces: act.ignoreSpaces, ...to },
                result: {
                    result: act.act,
                    many: manyOf(act.aggregate, act.repeated),
                    unmatchedFrom: act.unmatchedFrom ?? "keep",
                    direction: act.direction ?? "into-from",
                    edgeType: act.edgeType ?? "",
                    perPair: act.perPair === true,
                    unmatched: act.unmatched ?? "skip",
                },
                guess: null,
                suggested: false,
            },
        ];
    });
    const shown = pending.filter(
        (card) => !steps.some((each) => card.written?.some((picks) => samePicks(each.picks, picks)) === true),
    );
    return [...steps, ...shown.map((card) => ({ ...card, step: null, result: null }))];
}

/**
 * A merge step's "many rows" choice, from its aggregate for every column or its repeated rule.
 * @param aggregate - The step's aggregate.
 * @param repeated - The step's repeated rule.
 * @returns The choice.
 */
function manyOf(
    aggregate: Readonly<Record<string, JoinReduce>> | null,
    repeated: "first" | "last" | "both" | null,
): CardResult["many"] {
    const reduce = aggregate?.["*"];
    if (reduce === "list" || reduce === "count") {
        return reduce;
    }
    return repeated === "last" ? "last" : "first";
}

/**
 * Whether two cards match the same fields.
 * @param a - One card's picks.
 * @param b - The other's.
 * @returns True when they do.
 */
function samePicks(a: CardPicks, b: CardPicks): boolean {
    return JSON.stringify([pairOf(a), toPairOf(a)]) === JSON.stringify([pairOf(b), toPairOf(b)]);
}

/**
 * A card's node 1 side as the element takes it.
 * @param into - The side.
 * @returns The side.
 */
function intoOf(into: CardInto): SourceJoinInto {
    if (into.source !== undefined && into.field !== undefined) {
        return { source: into.source, field: into.field };
    }
    return into.source !== undefined && into.space === "" ? { source: into.source } : { space: into.space };
}

/**
 * The second match a Connect card's picks make, once both its fields are picked.
 * @param picks - The picks.
 * @returns The pair, or null.
 */
export function toPairOf(picks: CardPicks): SourceMatchPair | null {
    const { from, to } = picks;
    if (from === null || to?.field === undefined || to.into === null) {
        return null;
    }
    return { from: { source: from.source, field: to.field }, into: intoOf(to.into) };
}

/**
 * Whether a pending card is the written card behind a step card: it wrote that step's picks.
 * @param pending - A pending card.
 * @param card - A step card.
 * @returns True when it is.
 */
export function writtenFor(pending: PendingCard, card: JoinCardView): boolean {
    return card.step !== null && pending.written?.some((picks) => samePicks(picks, card.picks)) === true;
}

/**
 * The match a card's picks make, once both fields are picked.
 * @param picks - The picks.
 * @returns The pair, or null.
 */
export function pairOf(picks: CardPicks): SourceMatchPair | null {
    const { from, into } = picks;
    if (from?.field === undefined || into === null) {
        return null;
    }
    return { from: { source: from.source, field: from.field }, into: intoOf(into) };
}

/**
 * The live counts of a card's match, in the open draft: a step card's against the graph as the
 * steps before it build it, so its own result is never counted.
 * @param draft - The open draft.
 * @param picks - The picks.
 * @param step - The card's step place, if it has one.
 * @param pair - The match to count; default the card's first.
 * @returns The counts, or null while a field is unpicked or the draft refuses the pair.
 */
export function countsOf(
    draft: SourceDraft,
    picks: CardPicks,
    step?: number,
    pair: SourceMatchPair | null = pairOf(picks),
): SourceMatchCounts | null {
    if (pair === null) {
        return null;
    }
    try {
        return draft.matchCounts(pair, {
            ignoreCase: picks.ignoreCase,
            ignoreSpaces: picks.ignoreSpaces,
            ...(step === undefined ? {} : { before: step }),
        });
    } catch {
        return null;
    }
}

/**
 * A source's columns, as the open draft reads them: node rows first, else edge rows.
 * @param draft - The open draft.
 * @param source - The source.
 * @param table - Only its node rows.
 * @returns The column names.
 */
export function draftColumns(draft: SourceDraft, source: SourceKey, table?: "nodes"): readonly string[] {
    return columnsOf(draft, source, table);
}

/**
 * A card's act, as the draft makes it.
 * @param pair - The match.
 * @param picks - The picks.
 * @param result - The result and its options.
 * @returns The act.
 */
function actOf(pair: SourceMatchPair, picks: CardPicks, result: CardResult): SourceJoinAct {
    const matching = { ignoreCase: picks.ignoreCase, ignoreSpaces: picks.ignoreSpaces };
    if (result.result === "merge") {
        const { many } = result;
        return {
            act: "merge",
            options: {
                ...pair,
                ...matching,
                unmatchedFrom: result.unmatchedFrom,
                ...(many === "last" ? { repeated: "last" } : {}),
                ...(many === "list" || many === "count" ? { aggregate: { "*": many } } : {}),
            },
        };
    }
    const to = toPairOf(picks);
    return {
        act: "connect",
        options: {
            ...pair,
            ...matching,
            direction: result.direction,
            perPair: result.perPair,
            unmatched: result.unmatched,
            ...(result.edgeType === "" ? {} : { edgeType: result.edgeType }),
            ...(to === null ? {} : { to: { field: to.from.field, into: to.into } }),
        },
    };
}

/**
 * Write a card into the draft as ONE undo entry: a pending card's act is made at the end, a step
 * card's act is made again in its step's place.
 * @param draft - The open draft.
 * @param at - The card's step place, or null for a pending card.
 * @param picks - The picks.
 * @param result - The result and its options.
 * @returns The step's place, or null while the picks make no match.
 */
export function writeCard(draft: SourceDraft, at: number | null, picks: CardPicks, result: CardResult): number | null {
    const pair = pairOf(picks);
    if (pair === null) {
        return null;
    }
    const act = actOf(pair, picks, result);
    const before = draft.steps().length;
    if (at !== null) {
        draft.replaceStep(at, act);
        // A staged source the act adds lands just before its step.
        return at + draft.steps().length - before;
    }
    if (act.act === "merge") {
        draft.merge(act.options);
    } else {
        draft.connect(act.options);
    }
    return draft.steps().length - 1;
}

/**
 * A new card for a source, its picks the element's best guess, if it has one.
 * @param draft - The open draft.
 * @param id - The card's id.
 * @param source - The incoming source, if one is known.
 * @param into - The node 1 side, when the reader started from a node.
 * @returns The card.
 */
export function newCard(
    draft: SourceDraft,
    id: string,
    source: SourceKey | undefined,
    into: CardInto | null = null,
): PendingCard {
    const blank = { ignoreCase: false, ignoreSpaces: false };
    if (source === undefined) {
        return { id, picks: { from: null, into, ...blank }, guess: null, suggested: false };
    }
    let best;
    try {
        [best] = draft.suggestMatches(source);
    } catch {
        best = undefined;
    }
    const match = best?.matches[0];
    if (match === undefined || into !== null) {
        return { id, picks: { from: { source }, into, ...blank }, guess: null, suggested: false };
    }
    // The element proposes a space's keys; a match on another source's column is the reader's pick.
    const guessedInto: CardInto = { space: match.into.space ?? "" };
    return {
        id,
        picks: { from: match.from, into: guessedInto, ...blank },
        guess: best?.result ?? null,
        suggested: true,
    };
}
