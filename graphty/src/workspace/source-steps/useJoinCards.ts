/**
 * @file The join workspace's cards as the reader works on them: which is selected, what its matches can
 * make, and what a pick, an option, Undo or Remove does. A card's step is the one open draft's; the
 * reader's own lines are kept beside it.
 */

import type {
    GraphSession,
    SourceDraft,
    SourceJoinOutcome,
    SourceStepPatch,
    SourceStepRow,
} from "@graphty/graphty-element/session";
import { useMemo, useRef, useState } from "react";

import {
    type CardLine,
    type CardResult,
    cardsOf,
    DEFAULT_RESULT,
    type Ignoring,
    ignoringOf,
    type JoinCardView,
    linesOfStep,
    matchOf,
    newCard,
    offeredOutcomes,
    type OpenCard,
    outcomesOf,
    type ReaderCard,
    resultOf,
    sameMatches,
    sameOutcome,
    sigOf,
    stepCardId,
    type Suggestion,
    wholeLines,
    writeOutcome,
} from "./joinCards";
import { refusedWords, WORKSPACE_WORDS } from "./words";
import { addCardId, ownAdds, suggestionsOf, unfinished } from "./workspaceCards";

/** What the workspace opens on. */
export interface FirstCards {
    readonly mine: readonly ReaderCard[];
    readonly open: string | null;
}

/** The cards, and what can be done with them. */
export interface JoinCards {
    readonly cards: readonly JoinCardView[];
    /** The steps that add a waiting source in this draft. */
    readonly addSteps: readonly SourceStepRow[];
    /** The selected card's id, or an added source's. */
    readonly open: string | null;
    readonly openCard: OpenCard | undefined;
    readonly openAdd: SourceStepRow | undefined;
    /** What the selected card's matches can make. */
    readonly outcomes: readonly SourceJoinOutcome[];
    /** The likeliest fields of each of its lines. */
    readonly suggestions: readonly (Suggestion | null)[];
    /** The refusal each card last met, by its id; "" for none of them. */
    readonly errors: Readonly<Partial<Record<string, string>>>;
    readonly select: (id: string | null) => void;
    readonly add: () => void;
    readonly remove: (id: string) => void;
    readonly setLines: (lines: readonly CardLine[], resided: boolean) => void;
    readonly setIgnoring: (change: Partial<Ignoring>) => void;
    readonly pick: (outcome: SourceJoinOutcome) => void;
    readonly set: (outcome: SourceJoinOutcome, change: Partial<CardResult>) => void;
    readonly patch: (step: number, edit: SourceStepPatch) => void;
    /** Adds the selected card's one waiting source as it is, and selects what was added. */
    readonly addAsIs: (source: string) => void;
    /** Undo or Redo. */
    readonly move: (make: () => boolean) => void;
    readonly refuse: (id: string) => (error: unknown) => void;
    /** Selects a card that must be finished or answered before Done, and says so. */
    readonly stopsDone: (unfinishedEnds: string | undefined) => boolean;
}

/**
 * What the draft's join steps match and make.
 * @param draft - the open draft
 * @returns them
 */
function sigsNow(draft: SourceDraft): ReadonlySet<string> {
    return new Set(cardsOf(draft, []).flatMap(({ step }) => (step === null ? [] : [sigOf(step)])));
}

/**
 * The reader's cards after an undo or a redo: one whose step was taken back is as it was when the step
 * was written, and a removed one whose step came back is drawn again.
 * @param mine - the reader's cards
 * @param before - the cards as drawn before it
 * @param live - what the draft's steps match and make now
 * @returns the reader's cards
 */
function afterMove(
    mine: readonly ReaderCard[],
    before: readonly JoinCardView[],
    live: ReadonlySet<string>,
): readonly ReaderCard[] {
    return mine.map(({ deleted, ...card }) => {
        const back = [...card.written.map(({ sig }) => sig), ...card.split].some((sig) => live.has(sig));
        if (back) {
            return card;
        }
        const was = before.find((other) => other.id === card.id && other.step !== null)?.lines ?? card.lines;
        return { ...card, lines: was, ...(deleted === true ? { deleted } : {}) };
    });
}

/**
 * The reader's cards after one was removed: a written one waits behind its step, which an undo of the
 * removal brings back, and so does the card several steps were split from once the last is gone.
 * @param mine - the reader's cards
 * @param id - the removed card
 * @param sig - what its step matched and made, or null for a card with none
 * @param left - what the steps left match and make
 * @returns the reader's cards
 */
function afterRemoval(
    mine: readonly ReaderCard[],
    id: string,
    sig: string | null,
    left: ReadonlySet<string>,
): readonly ReaderCard[] {
    if (sig === null) {
        return mine.filter((each) => each.id !== id);
    }
    const gone = ({ id: own, split }: ReaderCard): boolean =>
        own === id || (split.includes(sig) && !split.some((other) => left.has(other)));
    return mine.map((each) => (gone(each) ? { ...each, deleted: true } : each));
}

/**
 * The cards of an open draft.
 * @param session - the element's session
 * @param draft - the open draft
 * @param first - what the workspace opens on
 * @param version - counts the draft's changes
 * @param onSelect - another card is selected
 * @returns the cards, and what can be done with them
 */
export function useJoinCards(
    session: GraphSession,
    draft: SourceDraft,
    first: FirstCards,
    version: unknown,
    onSelect: () => void,
): JoinCards {
    const nextId = useRef(0);
    // on reload: fresh: in flight: lines of cards with no step yet, which the closed workspace drops
    const [mine, setMine] = useState<readonly ReaderCard[]>(first.mine);
    // on reload: fresh: pointer: the card selected for a look
    const [open, setOpen] = useState<string | null>(first.open);
    // on reload: fresh: in flight: the refusal each card last met, drawn on it
    const [errors, setErrors] = useState<JoinCards["errors"]>({});

    const cards = cardsOf(draft, mine);
    const asked = new Set(draft.preview().questions.map((question) => question.params.source));
    const addSteps = ownAdds(session, draft, asked);
    const openAdd = addSteps.find((step) => addCardId(step.index) === open);
    const selected = openAdd === undefined ? cards.find((card) => card.id === open) : undefined;
    const openLines = useMemo(() => {
        const step = selected?.step ?? null;
        // A card reopened from its step is read back, then kept as the reader has it.
        return selected?.lines ?? (step === null ? null : linesOfStep(session, draft, step));
        // eslint-disable-next-line react-hooks/exhaustive-deps -- the card is read from the draft, which `version` follows
    }, [session, draft, version, selected?.id, selected?.lines]);
    const openCard: OpenCard | undefined =
        selected === undefined || openLines === null ? undefined : { ...selected, lines: openLines };
    const outcomes = useMemo(
        () => (openCard === undefined ? [] : outcomesOf(draft, openCard.lines, openCard, openCard.step)),
        // eslint-disable-next-line react-hooks/exhaustive-deps -- as above
        [draft, version, openLines, openCard?.ignoreCase, openCard?.ignoreSpaces, openCard?.step?.index],
    );
    const suggestions = useMemo(
        () => (openLines === null ? [] : suggestionsOf(draft, openLines)),
        // eslint-disable-next-line react-hooks/exhaustive-deps -- as above
        [draft, version, openLines],
    );
    const current = outcomes.find((each) => each.current === true);

    // A refusal is drawn on the card that met it, never behind the modal; with no card, under the list.
    const refuse =
        (id: string) =>
        (error: unknown): void => {
            setErrors((now) => ({ ...now, [id]: refusedWords(error) }));
        };
    const calm = (id: string): void => {
        setErrors(({ [id]: _was, ...rest }) => rest);
    };
    const select = (id: string | null): void => {
        setOpen(id);
        onSelect();
    };
    const freshId = (): string => `new:${String(++nextId.current)}`;
    // The reader's own card behind one drawn: made when a step's card is first changed.
    const mineOf = (card: OpenCard): ReaderCard => {
        const own = mine.find((each) => each.id === card.id) ?? {
            ...newCard(freshId()),
            written: card.step === null ? [] : [{ sig: sigOf(card.step), lines: card.lines }],
            at: card.step?.index ?? null,
        };
        return { ...own, lines: card.lines, ...ignoringOf(card) };
    };
    const save = (next: ReaderCard, more: (each: ReaderCard) => ReaderCard = (each) => each): void => {
        setMine((now) =>
            (now.some((each) => each.id === next.id)
                ? now.map((each) => (each.id === next.id ? next : each))
                : [...now, next]
            ).map((each) => more(each)),
        );
        setOpen(next.id);
    };
    const write = (
        card: OpenCard,
        outcome: SourceJoinOutcome,
        result: CardResult,
        to: Partial<Pick<ReaderCard, "lines" | "chosen" | "ignoreCase" | "ignoreSpaces">> = {},
    ): void => {
        const next = { ...mineOf(card), ...to };
        calm(card.id);
        calm(next.id);
        try {
            const rows = writeOutcome(draft, card.step, outcome, result, next);
            // An outcome of some of the lines leaves the others out.
            const whole = wholeLines(next.lines);
            const lines = next.lines.filter(
                (line) => matchOf(line) === null || outcome.uses.includes(whole.indexOf(line)),
            );
            const sigs = rows.map((row) => sigOf(row));
            const was = card.step === null ? null : sigOf(card.step);
            const inherits = (each: ReaderCard): ReaderCard =>
                was !== null && each.split.includes(was) ? { ...each, split: [...each.split, ...sigs] } : each;
            const [row, ...others] = rows;
            if (others.length === 0) {
                const written = [...next.written, { sig: sigs[0], lines }];
                save({ ...next, lines, at: row.index, written }, inherits);
                return;
            }
            save({ ...next, lines, at: null, split: [...next.split, ...sigs] }, inherits);
            setOpen(stepCardId(row.index));
        } catch (error) {
            // What was picked stays on the card, beside why it was refused.
            save(next);
            refuse(next.id)(error);
        }
    };
    const resultNow = (card: OpenCard): CardResult =>
        card.step === null || current === undefined
            ? { ...DEFAULT_RESULT, ...card.chosen }
            : resultOf(card.step, current);
    const takeBack = (card: OpenCard, step: SourceStepRow, next: ReaderCard): void => {
        try {
            draft.removeStep(step.index, { adds: "remove" });
            save({ ...next, at: null });
        } catch (error) {
            refuse(card.id)(error);
        }
    };
    const setLines = (card: OpenCard, lines: readonly CardLine[], resided: boolean): void => {
        const next = { ...mineOf(card), lines };
        calm(card.id);
        if (card.step === null || sameMatches(card.lines, lines)) {
            save(next);
            return;
        }
        // The way to join stays while it is still offered of the same sources; another source asks again.
        const again =
            resided || current === undefined
                ? undefined
                : offeredOutcomes(draft, lines, card, card.step).find(
                      (each) => each.uses.length === wholeLines(lines).length && sameOutcome(each, current),
                  );
        if (again === undefined) {
            takeBack(card, card.step, next);
        } else {
            write(card, again, resultNow(card), { lines });
        }
    };
    const setIgnoring = (card: OpenCard, change: Partial<Ignoring>): void => {
        const on = { ...ignoringOf(card), ...change };
        if (card.step === null || current === undefined) {
            save({ ...mineOf(card), ...on });
        } else {
            write(card, current, resultNow(card), on);
        }
    };
    const pick = (card: OpenCard, outcome: SourceJoinOutcome): void => {
        // What the reader set stays; each way's own No match and direction start as that way has them.
        const { noMatch: _noMatch, direction: _direction, ...kept } = resultNow(card);
        write(card, outcome, { ...DEFAULT_RESULT, ...(card.step === null ? {} : kept), ...card.chosen });
    };
    const remove = (id: string): void => {
        const card = cards.find((each) => each.id === id);
        const index = card?.step?.index ?? addSteps.find((step) => addCardId(step.index) === id)?.index;
        const sig = card?.step === null || card?.step === undefined ? null : sigOf(card.step);
        if (index !== undefined) {
            try {
                // A join's card takes back the sources its join added too, and an added one the joins that
                // name its nodes.
                draft.removeStep(index, { adds: "remove" });
            } catch (error) {
                refuse(id)(error);
                return;
            }
        }
        const next = afterRemoval(mine, id, sig, sigsNow(draft));
        setMine(next);
        const rest = cardsOf(draft, next);
        const at = cards.findIndex((each) => each.id === id);
        select(rest[Math.min(Math.max(at, 0), rest.length - 1)]?.id ?? null);
    };
    const move = (make: () => boolean): void => {
        const before = cardsOf(draft, mine);
        if (!make()) {
            return;
        }
        const next = afterMove(mine, before, sigsNow(draft));
        setMine(next);
        const after = cardsOf(draft, next);
        if (openAdd === undefined && !after.some((card) => card.id === open)) {
            const reborn = after.find((card) => !before.some((other) => other.id === card.id));
            setOpen((reborn ?? after.at(-1))?.id ?? null);
        }
    };
    const stop = (id: string, words: string): true => {
        select(id);
        setErrors((now) => ({ ...now, [id]: words }));
        return true;
    };
    const onOpen =
        <A extends readonly unknown[]>(run: (card: OpenCard, ...args: A) => void) =>
        (...args: A): void => {
            if (openCard !== undefined) {
                run(openCard, ...args);
            }
        };
    return {
        cards,
        addSteps,
        open,
        openCard,
        openAdd,
        outcomes,
        suggestions,
        errors,
        select,
        add: () => {
            const card = newCard(freshId());
            setMine((now) => [...now, card]);
            select(card.id);
        },
        remove,
        setLines: onOpen(setLines),
        setIgnoring: onOpen(setIgnoring),
        pick: onOpen(pick),
        set: onOpen((card, outcome: SourceJoinOutcome, change: Partial<CardResult>) => {
            const chosen = { ...card.chosen, ...change };
            write(card, outcome, { ...resultNow(card), ...change }, { chosen });
        }),
        patch: (step, edit) => {
            try {
                draft.editStep(step, edit);
            } catch (error) {
                refuse(cards.find((each) => each.step?.index === step)?.id ?? "")(error);
            }
        },
        addAsIs: onOpen((card, source: string) => {
            try {
                draft.add(source);
            } catch (error) {
                refuse(card.id)(error);
                return;
            }
            setMine((now) => now.filter((each) => each.id !== card.id));
            const made = draft.steps().findLast((each) => each.op === "join.add" && each.source === source);
            select(made === undefined ? null : addCardId(made.index));
        }),
        move,
        refuse,
        stopsDone: (unfinishedEnds) => {
            // A join begun and not finished is never dropped unseen.
            const half = cards.find((card) => unfinished(card, unfinishedEnds));
            if (half !== undefined) {
                return stop(half.id, WORKSPACE_WORDS.unfinished);
            }
            const asking = addSteps.find((each) => asked.has(each.source));
            return asking !== undefined && stop(addCardId(asking.index), WORKSPACE_WORDS.unanswered);
        },
    };
}
