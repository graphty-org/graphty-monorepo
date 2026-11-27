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
    joinOf,
    keyOfSteps,
    linesOfStep,
    matchOf,
    newCard,
    offeredOutcomes,
    type OpenCard,
    outcomesOf,
    type ReaderCard,
    removeSteps,
    resultOf,
    sameMatches,
    sameOutcome,
    sigOf,
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
    /** Names a card as typed, or takes its name off when nothing is: a written card's join carries it. */
    readonly rename: (id: string, typed: string) => void;
    /** Turns every step of a written card off or on, as one undo step. */
    readonly setOff: (id: string, off: boolean) => void;
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
 * What the draft's join cards match and make.
 * @param draft - the open draft
 * @param mine - the reader's cards
 * @returns them
 */
function keysNow(draft: SourceDraft, mine: readonly ReaderCard[]): ReadonlySet<string> {
    return new Set(cardsOf(draft, mine).flatMap(({ steps }) => (steps.length === 0 ? [] : [keyOfSteps(steps)])));
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
        const back = card.written.some(({ sigs }) => live.has(JSON.stringify(sigs)));
        if (back) {
            return card;
        }
        const was = before.find((other) => other.id === card.id && other.step !== null)?.lines ?? card.lines;
        return { ...card, lines: was, ...(deleted === true ? { deleted } : {}) };
    });
}

/**
 * The reader's cards after one was removed: a written one waits behind its steps, which an undo of the
 * removal brings back.
 * @param mine - the reader's cards
 * @param id - the removed card
 * @param written - whether it had steps
 * @returns the reader's cards
 */
function afterRemoval(mine: readonly ReaderCard[], id: string, written: boolean): readonly ReaderCard[] {
    if (!written) {
        return mine.filter((each) => each.id !== id);
    }
    return mine.map((each) => (each.id === id ? { ...each, deleted: true } : each));
}

/** The join types that add edges, picked first when a match is complete: they show the change most plainly. */
const EDGE_CODES: ReadonlySet<SourceJoinOutcome["code"]> = new Set(["link", "edge", "middle"]);

/**
 * The join type picked for the reader once a card's matches are complete: the first, in the element's
 * order, that uses every match and matches a row, one that adds edges before one that does not.
 * @param outcomes - what the matches can make
 * @param matches - how many whole matches the card has
 * @returns the type, or undefined when none matches a row
 */
export function defaultOutcome(outcomes: readonly SourceJoinOutcome[], matches: number): SourceJoinOutcome | undefined {
    const ways = outcomes.filter((each) => each.uses.length === matches && !each.matched.includes(0));
    return ways.find((each) => EDGE_CODES.has(each.code)) ?? ways.at(0);
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
        () => (openCard === undefined ? [] : outcomesOf(draft, openCard.lines, openCard, openCard.steps)),
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
            written: card.steps.length === 0 ? [] : [{ sigs: card.steps.map((row) => sigOf(row)), lines: card.lines }],
            at: card.step?.index ?? null,
        };
        return { ...own, lines: card.lines, ...ignoringOf(card) };
    };
    const save = (next: ReaderCard): void => {
        setMine((now) =>
            now.some((each) => each.id === next.id)
                ? now.map((each) => (each.id === next.id ? next : each))
                : [...now, next],
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
            const rows = writeOutcome(
                draft,
                card.steps,
                outcome,
                result,
                next,
                joinOf(card.steps, next.lines, outcome, next.name),
            );
            // An outcome of some of the lines leaves the others out.
            const whole = wholeLines(next.lines);
            const lines = next.lines.filter(
                (line) => matchOf(line) === null || outcome.uses.includes(whole.indexOf(line)),
            );
            const sigs = rows.map((row) => sigOf(row));
            save({ ...next, lines, at: rows.at(0)?.index ?? null, written: [...next.written, { sigs, lines }] });
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
    const takeBack = (card: OpenCard, next: ReaderCard): void => {
        try {
            draft.batch(() => {
                removeSteps(draft, card.steps);
            });
            save({ ...next, at: null });
        } catch (error) {
            refuse(card.id)(error);
        }
    };
    const setLines = (card: OpenCard, lines: readonly CardLine[], resided: boolean): void => {
        const next = { ...mineOf(card), lines };
        calm(card.id);
        if (sameMatches(card.lines, lines)) {
            save(next);
            return;
        }
        // The way to join stays while it is still offered of the same sources and matches a row. Otherwise,
        // and on a card not joined yet, a complete match joins at once by the default join type, so the graph
        // shows the change and the reader can switch it; with no row matching, the card asks again.
        const offered = offeredOutcomes(draft, lines, card, card.step);
        const whole = wholeLines(lines).length;
        const again =
            card.step === null || resided || current === undefined
                ? undefined
                : offered.find(
                      (each) => each.uses.length === whole && !each.matched.includes(0) && sameOutcome(each, current),
                  );
        const way = again ?? defaultOutcome(offered, whole);
        if (way === undefined) {
            if (card.step === null) {
                save(next);
            } else {
                takeBack(card, next);
            }
            return;
        }
        write(card, way, again === undefined ? { ...DEFAULT_RESULT, ...card.chosen } : resultNow(card), { lines });
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
        const added = addSteps.find((step) => addCardId(step.index) === id);
        const steps = card?.steps ?? (added === undefined ? [] : [added]);
        try {
            // A join's card takes back the sources its join added too, and an added one the joins that
            // name its nodes.
            if (steps.length > 0) {
                draft.batch(() => {
                    removeSteps(draft, steps);
                });
            }
        } catch (error) {
            refuse(id)(error);
            return;
        }
        const next = afterRemoval(mine, id, (card?.steps.length ?? 0) > 0);
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
        const next = afterMove(mine, before, keysNow(draft, mine));
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
        rename: (id, typed) => {
            const name = typed.trim() === "" ? undefined : typed.trim();
            const card = cards.find((each) => each.id === id);
            const joinId = card?.step?.join?.id;
            try {
                if (joinId === undefined) {
                    // Not written yet: the card keeps the name, and its first step's join takes it.
                    setMine((now) =>
                        now.map((each) => {
                            if (each.id !== id) {
                                return each;
                            }
                            const { name: _was, ...rest } = each;
                            return name === undefined ? rest : { ...rest, name };
                        }),
                    );
                } else {
                    draft.renameJoin(joinId, name ?? null);
                }
            } catch (error) {
                refuse(id)(error);
            }
        },
        setOff: (id, off) => {
            const steps = cards.find((each) => each.id === id)?.steps ?? [];
            try {
                draft.batch(() => {
                    for (const step of steps) {
                        draft.editStep(step.index, { off });
                    }
                });
            } catch (error) {
                refuse(id)(error);
            }
        },
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
