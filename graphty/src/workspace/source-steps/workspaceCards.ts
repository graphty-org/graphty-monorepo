/**
 * @file What the join workspace opens on and draws, read from its draft: the first card, the lines of the
 * sources added here, each line's likeliest fields, what is unfinished, and the steps a card's color marks.
 */

import {
    DEFAULT_BRANCH_PALETTE,
    type GraphSession,
    type SourceDraft,
    type SourceDraftMarkCounts,
    type SourceJoinSide,
    type SourceKey,
    type SourceMatchPair,
    type SourceStepRow,
} from "@graphty/graphty-element/session";

import type { JoinWorkspaceOpen } from "../state/store";
import {
    type CardLine,
    cardsOf,
    fieldsOf,
    isHalf,
    type JoinCardView,
    matchOf,
    newCard,
    NO_END,
    type OpenCard,
    type ReaderCard,
    rememberedOf,
    sameMatches,
    sameSide,
    sideOfSpace,
    stepCardId,
    type Suggestion,
    wholeLines,
} from "./joinCards";
import type { TableShows } from "./JoinPane";

/** The colors of what the commit does, as the key names them: merged, new, removed. */
export const [MERGED_COLOR = "#000", NEW_COLOR = "#000", REMOVED_COLOR = "#000"] = DEFAULT_BRANCH_PALETTE;

/** How many new nodes are looked for in the view before the preview is framed again. */
const MOST_LOOKED_FOR = 500;

/**
 * An Add step's card id: its place, so a card follows its step through undo.
 * @param index - The step's place.
 * @returns The id.
 */
export function addCardId(index: number): string {
    return `add:${String(index)}`;
}

/**
 * The steps that add a waiting source in this draft, on its own or asking a question; what the graph
 * already held is the Data sidebar's.
 * @param session - the element's session
 * @param draft - the open draft
 * @param asked - the sources a question is asked of
 * @returns the steps
 */
export function ownAdds(session: GraphSession, draft: SourceDraft, asked: ReadonlySet<string>): SourceStepRow[] {
    const waiting = new Set(session.data.staged().map((each) => each.key));
    return draft
        .steps()
        .filter(
            (step) =>
                step.op === "join.add" && waiting.has(step.source) && (step.joined !== true || asked.has(step.source)),
        );
}

/**
 * The places of a card's steps and of the adds its join made for itself, which come just before each.
 * @param all - the draft's steps
 * @param steps - the card's steps
 * @returns the places
 */
export function stepsOf(all: readonly SourceStepRow[], steps: readonly SourceStepRow[]): readonly number[] {
    return steps.flatMap((step) => {
        const places = [step.index];
        for (let at = step.index - 1; at >= 0 && all[at].op === "join.add" && all[at].joined === true; at--) {
            places.unshift(at);
        }
        return places;
    });
}

/**
 * The lines the first card opens with: the side the reader opened it for, else blank.
 * @param draft - the open draft
 * @param how - how the workspace opened
 * @returns the lines
 */
function firstLines(draft: SourceDraft, how: JoinWorkspaceOpen): readonly CardLine[] {
    let side: SourceJoinSide | null = null;
    if (how.source !== undefined) {
        side = { source: how.source };
    } else if (how.into !== undefined) {
        side = sideOfSpace(draft.steps(), how.into);
    }
    return [{ a: { side, field: null }, b: NO_END }];
}

/**
 * What the workspace opens on: the card it was opened for, the last card of a draft it picks up, or a
 * new one.
 * @param session - the element's session
 * @param draft - the open draft
 * @param how - how it opened
 * @param adopted - whether the draft was open already
 * @returns the reader's cards, and the selected one
 */
export function firstCards(
    session: GraphSession,
    draft: SourceDraft,
    how: JoinWorkspaceOpen,
    adopted: boolean,
): { readonly mine: readonly ReaderCard[]; readonly open: string | null } {
    const made = cardsOf(draft, [], rememberedOf(session));
    const held = draft.preview().steps.find((step) => step.committed === how.step);
    if (how.step !== undefined && held !== undefined) {
        return { mine: [], open: stepCardId(held.index) };
    }
    const last = made.at(-1);
    if (
        how.remove !== undefined ||
        how.without !== undefined ||
        (adopted && last !== undefined && how.source === undefined && how.into === undefined)
    ) {
        return { mine: [], open: last?.id ?? null };
    }
    return { mine: [newCard("new:0", firstLines(draft, how))], open: "new:0" };
}

/**
 * The fields of two sides the element finds likeliest to match, best first.
 * @param draft - the open draft
 * @param a - one side
 * @param b - the other
 * @returns the pairs
 */
function likeliest(draft: SourceDraft, a: SourceJoinSide, b: SourceJoinSide): readonly Suggestion[] {
    const [source, other] = a.source === undefined ? [b.source, a] : [a.source, b];
    if (source === undefined) {
        return [];
    }
    const keyOf = (side: SourceJoinSide): string | undefined =>
        fieldsOf(draft, side, undefined).find((field) => field.key)?.name;
    const read = ({ from, into }: SourceMatchPair): Suggestion[] => {
        const fromA = from.source === a.source;
        const named = into.field ?? keyOf(fromA ? b : a);
        if (named === undefined) {
            return [];
        }
        return [fromA ? { a: from.field, b: named } : { a: named, b: from.field }];
    };
    try {
        return draft
            .suggestMatches(source, { with: other })
            .flatMap(({ matches }) => matches.slice(0, 1).flatMap((pair) => read(pair)));
    } catch {
        // A side an undo or a removal took away.
        return [];
    }
}

/**
 * The likeliest fields of each line with both sides picked and a field missing: the element's best guess
 * for the two sides that the picked field, if one is, is part of and no other line makes.
 * @param draft - the open draft
 * @param lines - the lines
 * @returns a suggestion per line, or null
 */
export function suggestionsOf(draft: SourceDraft, lines: readonly CardLine[]): readonly (Suggestion | null)[] {
    const whole = wholeLines(lines);
    return lines.map((line) => {
        const { a, b } = line;
        if (a.side === null || b.side === null || sameSide(a.side, b.side) || matchOf(line) !== null) {
            return null;
        }
        const fits = (each: Suggestion): boolean =>
            (a.field ?? each.a) === each.a &&
            (b.field ?? each.b) === each.b &&
            !whole.some((other) => sameMatches([other], [{ a: { ...a, field: each.a }, b: { ...b, field: each.b } }]));
        return likeliest(draft, a.side, b.side).find((each) => fits(each)) ?? null;
    });
}

/**
 * The waiting sources a card names that no step of the draft adds yet.
 * @param session - the element's session
 * @param draft - the open draft
 * @param lines - the card's lines
 * @returns their keys
 */
export function waitingIn(session: GraphSession, draft: SourceDraft, lines: readonly CardLine[]): readonly SourceKey[] {
    const used = new Set(draft.steps().map((step) => step.source));
    const named = new Set(lines.flatMap(({ a, b }) => [a.side?.source, b.side?.source]));
    return session.data
        .staged()
        .map((each) => each.key)
        .filter((key) => named.has(key) && !used.has(key));
}

/**
 * Whether a card has a pick the reader made that makes nothing yet.
 * @param card - the card
 * @param unfinishedEnds - a waiting source read as edges whose ends are not both picked
 * @returns true when it has
 */
export function unfinished(card: JoinCardView, unfinishedEnds: SourceKey | undefined): boolean {
    const lines = card.lines ?? [];
    const begun = lines.some((line) => isHalf(line) || (card.step === null && matchOf(line) !== null));
    const ends =
        card.step === null &&
        unfinishedEnds !== undefined &&
        lines.some(({ a, b }) => a.side?.source === unfinishedEnds || b.side?.source === unfinishedEnds);
    return begun || ends;
}

/**
 * The new nodes a draft adds, as the element draws them.
 * @param draft - the open draft
 * @returns their ids
 */
export function newNodeIds(draft: SourceDraft): readonly (string | number)[] {
    const preview = draft.preview();
    return preview.steps
        .filter((step) => step.committed === null)
        .flatMap((step) =>
            (["newNodes", "keptNew"] as const).flatMap((bucket) => preview.ids({ step: step.index, bucket }).nodes),
        )
        .slice(0, MOST_LOOKED_FOR);
}

/**
 * How many elements a commit changes.
 * @param marks - the preview's marks
 * @returns the count
 */
export function changesOf(marks: SourceDraftMarkCounts): number {
    const { nodes, edges } = marks;
    const changed = (nodes.changed ?? 0) + (edges.changed ?? 0);
    return nodes.merged + nodes.new + nodes.removed + edges.merged + edges.new + edges.removed + changed;
}

/**
 * Whether the pane has anything to show of a card: none of its sources is picked.
 * @param card - the card
 * @param shows - the list asked for
 * @returns true when it has
 */
export function hasPane(card: OpenCard, shows: TableShows | null): boolean {
    return shows !== null || card.lines.some(({ a, b }) => a.side !== null || b.side !== null);
}
