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
    setJoinOff,
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
    /**
     * Takes out every card, as one undo step: "undoable" once done, "final" when no card had written a step, so
     * no undo brings them back, and null when refused, which a notice says.
     */
    readonly clear: () => "undoable" | "final" | null;
    /**
     * Names a card as typed, or takes its name off when nothing is: a written card's join carries it.
     * @returns whether its name changed
     */
    readonly rename: (id: string, typed: string) => boolean;
    /** Turns every step of a written card off or on, as one undo step; false when refused, which a notice says. */
    readonly setOff: (id: string, off: boolean) => boolean;
    readonly setLines: (lines: readonly CardLine[], resided: boolean) => void;
    readonly setIgnoring: (change: Partial<Ignoring>) => void;
    readonly pick: (outcome: SourceJoinOutcome) => void;
    readonly set: (outcome: SourceJoinOutcome, change: Partial<CardResult>) => void;
    readonly patch: (step: number, edit: SourceStepPatch) => void;
    /** Adds the selected card's one waiting source as it is, and selects what was added. */
    readonly addAsIs: (source: string) => void;
    /** Undo or Redo. */
    readonly move: (way: "undo" | "redo") => void;
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
 * was written, and a removed one whose step came back is drawn again. A removal an undo took back is kept
 * beside the card while it can be redone, so a redo removes it again.
 * @param mine - the reader's cards
 * @param before - the cards as drawn before it
 * @param live - what the draft's steps match and make now
 * @param redo - a redo, which makes again a removal an undo took back
 * @returns the reader's cards
 */
function afterMove(
    mine: readonly ReaderCard[],
    before: readonly JoinCardView[],
    live: ReadonlySet<string>,
    redo: boolean,
): readonly ReaderCard[] {
    return mine.map(({ deleted, clearedWith, undone, ...card }) => {
        const now = deleted === true ? { deleted, ...(clearedWith === undefined ? {} : { clearedWith }) } : undefined;
        const removal = now ?? (redo ? undone : undefined);
        const back =
            card.written.some(({ sigs }) => live.has(JSON.stringify(sigs))) ||
            (removal?.clearedWith?.some((key) => live.has(key)) ?? false);
        if (back) {
            const kept = now ?? undone;
            return kept === undefined ? card : { ...card, undone: kept };
        }
        const was = before.find((other) => other.id === card.id && other.step !== null)?.lines ?? card.lines;
        return { ...card, lines: was, ...removal, ...(undone === undefined ? {} : { undone }) };
    });
}

/**
 * How many steps there are of each signature.
 * @param rows - the steps
 * @returns each signature's count
 */
function countSigs(rows: readonly SourceStepRow[]): Map<string, number> {
    const counts = new Map<string, number>();
    for (const row of rows) {
        const sig = sigOf(row);
        counts.set(sig, (counts.get(sig) ?? 0) + 1);
    }
    return counts;
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

/**
 * Whether a card can be named: one not written yet keeps the name, and a written one's join carries it. A step
 * written without a join tag has nowhere to keep one.
 * @param card - the card
 * @returns true when it can
 */
export function canRename(card: JoinCardView): boolean {
    return card.step === null || card.step.join !== undefined;
}

/**
 * A reader's card with the name its join holds, or none.
 * @param card - the card
 * @param name - the name
 * @returns the card
 */
function named(card: ReaderCard, name: string | undefined): ReaderCard {
    const { name: _was, ...rest } = card;
    return name === undefined ? rest : { ...rest, name };
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
            const join = joinOf(card.steps, next.lines, outcome, next.name);
            const rows = writeOutcome(draft, card.steps, outcome, result, next, join);
            // An outcome of some of the lines leaves the others out.
            const whole = wholeLines(next.lines);
            const lines = next.lines.filter(
                (line) => matchOf(line) === null || outcome.uses.includes(whole.indexOf(line)),
            );
            const sigs = rows.map((row) => sigOf(row));
            const written = { ...named(next, join.name), lines, at: rows.at(0)?.index ?? null };
            save({ ...written, written: [...next.written, { sigs, lines }] });
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
            // Its join's name stays the card's while it waits to be written again.
            save({ ...named(next, card.step?.join?.name), at: null });
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
    const move = (way: "undo" | "redo"): void => {
        // A removal kept for a redo is gone once a new change took the redo away.
        const held = draft.canRedo ? mine : mine.map(({ undone: _undone, ...card }) => card);
        const before = cardsOf(draft, held);
        if (!(way === "undo" ? draft.undo() : draft.redo())) {
            return;
        }
        const next = afterMove(held, before, keysNow(draft, held), way === "redo");
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
        clear: () => {
            // Every card's steps go as one undo step, each as Delete takes one card's: with the sources its join
            // added. The newest goes first. Steps are counted by signature, so two steps alike are both taken,
            // and a step a removal took along is counted as taken.
            const targets = countSigs([...cards.flatMap((card) => card.steps), ...addSteps]);
            try {
                draft.batch(() => {
                    for (;;) {
                        const row = draft.steps().findLast((each) => (targets.get(sigOf(each)) ?? 0) > 0);
                        if (row === undefined) {
                            break;
                        }
                        const was = countSigs(draft.steps());
                        draft.removeStep(row.index, { adds: "remove" });
                        const left = countSigs(draft.steps());
                        for (const [sig, count] of was) {
                            const target = targets.get(sig);
                            if (target !== undefined) {
                                targets.set(sig, target - (count - (left.get(sig) ?? 0)));
                            }
                        }
                    }
                });
            } catch (error) {
                refuse("")(error);
                return null;
            }
            // A written card waits behind its steps; one not written yet waits behind theirs, so one Undo
            // brings every card back.
            const clearedWith = cards.flatMap((card) => (card.steps.length === 0 ? [] : [keyOfSteps(card.steps)]));
            setMine((now) =>
                now.flatMap((each): readonly ReaderCard[] => {
                    if (cards.some((card) => card.id === each.id && card.steps.length > 0)) {
                        return [{ ...each, deleted: true }];
                    }
                    // With nothing written to undo, a card not written yet goes, as Delete takes one.
                    return clearedWith.length === 0 ? [] : [{ ...each, deleted: true, clearedWith }];
                }),
            );
            select(null);
            if (cards.length === 0) {
                return null;
            }
            return clearedWith.length === 0 ? "final" : "undoable";
        },
        rename: (id, typed) => {
            const name = typed.trim() === "" ? undefined : typed.trim();
            const card = cards.find((each) => each.id === id);
            if (card === undefined || !canRename(card)) {
                return false;
            }
            const was = card.step === null ? card.name : card.step.join?.name;
            if (was === name) {
                return false;
            }
            try {
                if (card.step === null) {
                    // Not written yet: the card keeps the name, and its first step's join takes it.
                    setMine((now) => now.map((each) => (each.id === id ? named(each, name) : each)));
                } else if (card.step.join !== undefined) {
                    draft.renameJoin(card.step.join.id, name ?? null);
                }
            } catch (error) {
                refuse(id)(error);
                return false;
            }
            return true;
        },
        setOff: (id, off) => {
            const steps = cards.find((each) => each.id === id)?.steps ?? [];
            try {
                setJoinOff(draft, steps, off);
            } catch (error) {
                refuse(id)(error);
                return false;
            }
            return true;
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
