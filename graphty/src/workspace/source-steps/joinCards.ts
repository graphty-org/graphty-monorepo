/**
 * @file The join workspace's cards: one card per join, holding the lines of fields the reader matches
 * in the order picked. What a set of matches can make, its counts and the acts that make it are
 * graphty-element's (`draft.joinOutcomes`, `draft.joinRows`); a card adds the reader's options to the
 * acts. A card whose outcome is picked is a step of the one open source draft and is read back from
 * `draft.steps()` after every change, so undo never leaves a card out of step with the draft; a card
 * with none is only the reader's lines.
 */

import type {
    GraphSession,
    JoinReduce,
    SourceDraft,
    SourceJoinAct,
    SourceJoinField,
    SourceJoinMatch,
    SourceJoinOutcome,
    SourceJoinSide,
    SourceKey,
    SourceMatchCounts,
    SourceSideField,
    SourceSpaceName,
    SourceStepAct,
    SourceStepRow,
} from "@graphty/graphty-element/session";

/** One end of a line: a side and its field, or new nodes. */
export interface CardEnd {
    readonly side: SourceJoinSide | null;
    readonly field: string | null;
    /** The other end's values become new nodes. */
    readonly isNew?: true;
}

/** One line of a card, its two ends where the reader picked them. */
export interface CardLine {
    readonly a: CardEnd;
    readonly b: CardEnd;
}

/** An end with nothing picked. */
export const NO_END: CardEnd = { side: null, field: null };

/** A line with nothing picked. */
export const BLANK_LINE: CardLine = { a: NO_END, b: NO_END };

/** What a row matching nothing does. */
export type NoMatch = "add" | "skip" | "keep" | "remove";

/** A card's options, as the draft's step carries them. */
export interface CardResult {
    /** Fields: several rows naming one node, as the element's `repeated` takes and returns it. */
    readonly repeated: JoinReduce;
    /** What a row matching nothing does; null for the outcome's default. */
    readonly noMatch: NoMatch | null;
    /** A node linked to what it names: whether a node is made of a value that names none. */
    readonly missing: "add" | "skip";
    /** Which way the edges run; null for the outcome's default. */
    readonly direction: "into-from" | "from-into" | null;
    readonly edgeType: string;
    /** One edge per pair of ends. */
    readonly perPair: boolean;
    /** A row whose value names several nodes: joined to each of them, or to none. */
    readonly fanOut: "each" | "skip";
    /** A row whose ends an edge already joins. */
    readonly existing: "add" | "merge";
    /** New nodes: the separator a cell holds several values by, or "" for none. */
    readonly split: string;
    /** New nodes: their type, or "". */
    readonly type: string;
    /** New nodes: the columns that move onto them. */
    readonly columns: readonly string[];
    /** Shared values: a value more nodes hold links none of them; absent, the element's own default. */
    readonly maxShared?: number;
    /** Shared values: how many values a pair must share; absent, the element's own default. */
    readonly minShared?: number;
}

/** The options a new step starts with. */
export const DEFAULT_RESULT: CardResult = {
    repeated: "first",
    noMatch: null,
    missing: "skip",
    direction: null,
    edgeType: "",
    perPair: false,
    fanOut: "each",
    existing: "add",
    split: "",
    type: "",
    columns: [],
};

/** How a card compares values. */
export interface Ignoring {
    readonly ignoreCase: boolean;
    readonly ignoreSpaces: boolean;
}

/** A card the reader made or changed in this opening of the workspace. */
export interface ReaderCard extends Ignoring {
    readonly id: string;
    readonly lines: readonly CardLine[];
    /** The options the reader set, which the step it next writes takes. */
    readonly chosen: Partial<CardResult>;
    /**
     * The steps it wrote, by what they match: while they are in the draft the card is theirs, with the
     * lines as the reader had them; once undo takes them back the card is drawn again.
     */
    readonly written: readonly Written[];
    /** The place of the first step it last wrote. */
    readonly at: number | null;
    /** The reader removed its step: it is drawn again only once an undo brings the step back. */
    readonly deleted?: true;
}

/** What a card wrote: what its steps match and make, in step order, and its lines as the reader had them. */
export interface Written {
    readonly sigs: readonly string[];
    readonly lines: readonly CardLine[];
}

/** A card as it was last written in this session, which a card reopened on its steps reads back. */
export interface Remembered extends Written {
    /** The way to join picked, by `outcomeKey`. */
    readonly outcome: string;
}

/**
 * The cards written in each session. A way to join of several acts writes several steps, and the
 * element reads a step back as one join of its own: the steps a card wrote are kept together here, and
 * the order its sources were picked in, which no step holds.
 * Temporary, for a graphty-element gap: `draft.steps()` and `joinOutcomes({ step })` cannot say which
 * steps one way to join wrote, nor the order its ends were picked in, so a project reopened from a file
 * reads such a card back as one card per step, in load order. Once the element reads back the steps one
 * outcome wrote as one join, this goes.
 */
const REMEMBERED = new WeakMap<GraphSession, Remembered[]>();

/**
 * The cards written in a session, oldest first.
 * @param session - The element's session.
 * @returns Them.
 */
export function rememberedOf(session: GraphSession): readonly Remembered[] {
    return REMEMBERED.get(session) ?? [];
}

/**
 * Keeps a card as written.
 * @param session - The element's session.
 * @param card - The card.
 */
export function remember(session: GraphSession, card: Remembered): void {
    const key = JSON.stringify(card.sigs);
    REMEMBERED.set(session, [...rememberedOf(session).filter((each) => JSON.stringify(each.sigs) !== key), card]);
}

/** One card as the workspace draws it. */
export interface JoinCardView extends Ignoring {
    readonly id: string;
    /** The first draft step it is, or null for a card with no outcome picked. */
    readonly step: SourceStepRow | null;
    /** Every step it is, in order: one, or several for a way to join of several acts. */
    readonly steps: readonly SourceStepRow[];
    /** Its lines; null for a step not opened in this workspace yet. */
    readonly lines: readonly CardLine[] | null;
    readonly chosen: Partial<CardResult>;
}

/** A card whose lines are known. */
export type OpenCard = JoinCardView & { readonly lines: readonly CardLine[] };

/** The fields the element finds likeliest to match, of a line's two ends. */
export interface Suggestion {
    readonly a: string;
    readonly b: string;
}

/**
 * A new card.
 * @param id - Its id.
 * @param lines - Its lines; blank by default.
 * @returns The card.
 */
export function newCard(id: string, lines: readonly CardLine[] = [BLANK_LINE]): ReaderCard {
    return { id, lines, ignoreCase: false, ignoreSpaces: false, chosen: {}, written: [], at: null };
}

/**
 * A step's card id: its place.
 * @param index - The step's place.
 * @returns The id.
 */
export function stepCardId(index: number): string {
    return `step:${String(index)}`;
}

/**
 * Whether a step is a join: one a card is drawn for.
 * @param row - The step.
 * @returns True when it is.
 */
export function isJoin(row: SourceStepRow): boolean {
    return row.act !== null || row.link !== null || row.extract !== null;
}

/**
 * What a step matches and makes, without its options: the same for one card's step whatever is set on it.
 * @param row - The step.
 * @returns It, as text.
 */
export function sigOf(row: SourceStepRow): string {
    if (row.act !== null) {
        const { act, from, into, to } = row.act;
        return JSON.stringify([act, from, into, to?.field, to?.into, to?.keepRow === true]);
    }
    if (row.link !== null) {
        const { source, columns, field, into, nodes, as } = row.link;
        return JSON.stringify(["link", source, columns, field, into, nodes, as]);
    }
    return JSON.stringify(["extract", row.source, row.extract?.column]);
}

/**
 * What a card's steps match and make, as one key.
 * @param steps - The steps.
 * @returns The key.
 */
export function keyOfSteps(steps: readonly SourceStepRow[]): string {
    return JSON.stringify(steps.map((row) => sigOf(row)));
}

/**
 * The join steps as cards draw them: one step each, but the steps one card wrote together stay one.
 * @param rows - The join steps, in order.
 * @param together - What the steps of each card written together match and make.
 * @returns The steps of each card, in order.
 */
export function stepGroups(
    rows: readonly SourceStepRow[],
    together: readonly (readonly string[])[],
): readonly (readonly SourceStepRow[])[] {
    const used = new Set<number>();
    return rows.flatMap((row) => {
        if (used.has(row.index)) {
            return [];
        }
        const free = rows.filter((each) => !used.has(each.index));
        const find = (sig: string): SourceStepRow[] => free.filter((each) => sigOf(each) === sig).slice(0, 1);
        const sig = sigOf(row);
        const kept = together.find(
            (sigs) => sigs.length > 1 && sigs[0] === sig && sigs.every((each) => find(each).length === 1),
        );
        const group = kept === undefined ? [row] : kept.flatMap((each) => find(each));
        for (const each of group) {
            used.add(each.index);
        }
        return [group];
    });
}

/**
 * The cards of a draft's join steps, in step order, then the cards with no step.
 * @param draft - The open draft.
 * @param mine - The reader's cards.
 * @param kept - The cards written in this session.
 * @returns The cards.
 */
export function cardsOf(
    draft: SourceDraft,
    mine: readonly ReaderCard[],
    kept: readonly Remembered[] = [],
): JoinCardView[] {
    const rows = draft.steps().filter((row) => isJoin(row));
    const groups = stepGroups(rows, [
        ...mine.flatMap((card) => card.written.map((each) => each.sigs)),
        ...kept.map((each) => each.sigs),
    ]);
    const keys = new Map(groups.map((group) => [group[0].index, keyOfSteps(group)]));
    const wrote = (card: ReaderCard, key: string | undefined): Written | undefined =>
        card.written.findLast((each) => JSON.stringify(each.sigs) === key);
    const taken = new Map<number, ReaderCard>();
    for (const card of mine) {
        const own = groups.filter(
            ([row]) => card.deleted !== true && !taken.has(row.index) && wrote(card, keys.get(row.index)) !== undefined,
        );
        const group = own.find(([each]) => each.index === card.at) ?? own.at(-1);
        if (group !== undefined) {
            taken.set(group[0].index, card);
        }
    }
    const steps = groups.map((group): JoinCardView => {
        const [row] = group;
        const key = keys.get(row.index);
        const card = taken.get(row.index);
        const on = {
            ignoreCase: (row.act ?? row.link)?.ignoreCase === true,
            ignoreSpaces: (row.act ?? row.link)?.ignoreSpaces === true,
        };
        if (card === undefined) {
            // Reopened: as the reader last wrote it, else as its step reads back.
            const lines = kept.findLast((each) => JSON.stringify(each.sigs) === key)?.lines ?? null;
            return { id: stepCardId(row.index), step: row, steps: group, lines, chosen: {}, ...on };
        }
        const was = wrote(card, key)?.lines ?? card.lines;
        const lines = sameMatches(card.lines, was) ? card.lines : was;
        return { id: card.id, step: row, steps: group, lines, chosen: card.chosen, ...on };
    });
    const drawn = new Set([...taken.values()].map((card) => card.id));
    const live = new Set(keys.values());
    const rest = mine.filter(
        (card) =>
            card.deleted !== true &&
            !drawn.has(card.id) &&
            !card.written.some((each) => live.has(JSON.stringify(each.sigs))),
    );
    return [
        ...steps,
        ...rest.map(({ id, lines, chosen, ignoreCase, ignoreSpaces }) => ({
            id,
            step: null,
            steps: [],
            lines,
            chosen,
            ignoreCase,
            ignoreSpaces,
        })),
    ];
}

/**
 * An end as the element takes it, once it is picked whole.
 * @param end - The end.
 * @returns The field, or null.
 */
function fieldOf(end: CardEnd): SourceJoinField | null {
    if (end.side === null || end.field === null) {
        return null;
    }
    return end.side.source === undefined
        ? { space: end.side.space, field: end.field }
        : { source: end.side.source, field: end.field };
}

/**
 * A line as the match it makes.
 * @param line - The line.
 * @returns The match, or null while a pick is missing.
 */
export function matchOf(line: CardLine): SourceJoinMatch | null {
    const a = fieldOf(line.a);
    const b = line.b.isNew === true ? { new: true as const } : fieldOf(line.b);
    return a === null || b === null ? null : { a, b };
}

/**
 * The lines whose picks are all made.
 * @param lines - The lines.
 * @returns Them.
 */
export function wholeLines(lines: readonly CardLine[]): readonly CardLine[] {
    return lines.filter((line) => matchOf(line) !== null);
}

const byText = (x: string, y: string): number => x.localeCompare(y);

/**
 * Whether two sets of lines make the same matches, whichever way round each is.
 * @param x - One set.
 * @param y - The other.
 * @returns True when they do.
 */
export function sameMatches(x: readonly CardLine[], y: readonly CardLine[]): boolean {
    const said = (lines: readonly CardLine[]): string =>
        JSON.stringify(
            wholeLines(lines)
                .map(({ a, b }) => JSON.stringify([JSON.stringify(a), JSON.stringify(b)].sort(byText)))
                .sort(byText),
        );
    return said(x) === said(y);
}

/**
 * Whether a line has a pick and misses another.
 * @param line - The line.
 * @returns True when it does.
 */
export function isHalf(line: CardLine): boolean {
    return matchOf(line) === null && (line.a.side !== null || line.b.side !== null || line.b.isNew === true);
}

/**
 * Whether two sides are one.
 * @param x - One side.
 * @param y - The other.
 * @returns True when they are.
 */
export function sameSide(x: SourceJoinSide | null, y: SourceJoinSide | null): boolean {
    return x !== null && y !== null && x.source === y.source && x.space === y.space;
}

/**
 * The side that names an id space's nodes: the one source whose rows they are, else the space itself.
 * @param steps - The steps that build it.
 * @param space - The space.
 * @returns The side.
 */
export function sideOfSpace(steps: readonly SourceStepRow[], space: SourceSpaceName): SourceJoinSide {
    const owners = new Set(
        steps.flatMap((row) => (row.op === "join.add" && row.spaces.includes(space) ? [row.source] : [])),
    );
    const [source] = owners;
    return owners.size === 1 ? { source } : { space };
}

/**
 * The lines a step's card is named by, read from the step alone: which side each end is, and its field.
 * @param steps - The steps it is one of.
 * @param row - The step.
 * @returns The lines.
 */
export function linesNaming(steps: readonly SourceStepRow[], row: SourceStepRow): readonly CardLine[] {
    const intoEnd = (into: {
        readonly space?: string;
        readonly source?: string;
        readonly field?: string;
    }): CardEnd => ({
        side: into.source === undefined ? sideOfSpace(steps, into.space ?? "") : { source: into.source },
        field: into.field ?? null,
    });
    const own = (source: SourceKey, field: string): CardEnd => ({ side: { source }, field });
    if (row.act !== null) {
        const { from, into, to } = row.act;
        return [
            { a: own(from.source, from.field), b: intoEnd(into) },
            ...(to === undefined
                ? []
                : [
                      {
                          a: own(from.source, to.field),
                          b: to.unmatched === "add" ? { ...NO_END, isNew: true as const } : intoEnd(to.into),
                      },
                  ]),
        ];
    }
    if (row.link !== null) {
        const { source, columns, field, into, nodes } = row.link;
        const holder = nodes === undefined ? { source } : sideOfSpace(steps, nodes);
        return [
            ...(field === undefined || into === undefined ? [] : [{ a: own(source, field), b: intoEnd(into) }]),
            ...columns.map((column) => ({ a: { side: holder, field: column }, b: { side: holder, field: column } })),
        ];
    }
    return [{ a: own(row.source, row.extract?.column ?? ""), b: { ...NO_END, isNew: true } }];
}

/**
 * The place of a side in the order loaded: an id space is before every source.
 * @param session - The element's session.
 * @param side - The side.
 * @returns Its place.
 */
export function loadOrder(session: GraphSession, side: SourceJoinSide): number {
    return side.source === undefined
        ? -1
        : session.data.sources({ staged: true }).findIndex((each) => each.key === side.source);
}

/**
 * A step's lines as its card reopens on them: the element's matches, the earlier loaded side first, and
 * in a further line the side an earlier line names.
 * @param session - The element's session.
 * @param draft - The open draft.
 * @param row - The step.
 * @returns The lines.
 */
export function linesOfStep(session: GraphSession, draft: SourceDraft, row: SourceStepRow): readonly CardLine[] {
    const endOf = (ref: SourceJoinField): CardEnd & { readonly side: SourceJoinSide } => {
        const side: SourceJoinSide = ref.source === undefined ? { space: ref.space } : { source: ref.source };
        return { side, field: ref.field ?? keyOf(draft, side, row.index) };
    };
    const named: SourceJoinSide[] = [];
    const place = ({ side }: { readonly side: SourceJoinSide }): number =>
        named.some((each) => sameSide(each, side)) ? -Infinity : loadOrder(session, side);
    return draft.joinOutcomes({ step: row.index }).matches.map(({ a, b }) => {
        const one = endOf(a);
        if ("new" in b) {
            named.push(one.side);
            return { a: one, b: { ...NO_END, isNew: true as const } };
        }
        const other = endOf(b);
        const turned = place(other) < place(one);
        named.push(one.side, other.side);
        return turned ? { a: other, b: one } : { a: one, b: other };
    });
}

/**
 * The key field of a side.
 * @param draft - The open draft.
 * @param side - The side.
 * @param before - The step's place to read it before.
 * @returns Its name, or null when it has none.
 */
function keyOf(draft: SourceDraft, side: SourceJoinSide, before: number): string | null {
    try {
        return draft.sideFields(side, { before }).find((field) => field.key)?.name ?? null;
    } catch {
        // A source an undo or a removal took away.
        return null;
    }
}

/**
 * What a card's matches can make.
 * @param draft - The open draft.
 * @param lines - Its lines.
 * @param on - How it compares values.
 * @param step - The step it is, if it is one.
 * @returns The outcomes.
 */
export function offeredOutcomes(
    draft: SourceDraft,
    lines: readonly CardLine[],
    on: Ignoring,
    step: SourceStepRow | null,
): readonly SourceJoinOutcome[] {
    const matches = lines.flatMap((line) => matchOf(line) ?? []);
    if (matches.length === 0) {
        return [];
    }
    try {
        return draft.joinOutcomes({
            matches,
            ...ignoringOf(on),
            ...(step === null ? {} : { step: step.index }),
        }).outcomes;
    } catch {
        // A field an earlier change took away matches nothing.
        return [];
    }
}

/**
 * What a card lists: what its matches can make, and a step's own outcome whatever matches now.
 * @param draft - The open draft.
 * @param lines - Its lines.
 * @param on - How it compares values.
 * @param steps - The steps it is.
 * @param picked - For a card of several steps, the way it was written, by `outcomeKey`.
 * @returns The outcomes.
 */
export function outcomesOf(
    draft: SourceDraft,
    lines: readonly CardLine[],
    on: Ignoring,
    steps: readonly SourceStepRow[],
    picked?: string,
): readonly SourceJoinOutcome[] {
    const step = steps.at(0) ?? null;
    const found = offeredOutcomes(draft, lines, on, step);
    if (steps.length > 1) {
        // The element reads one step back as its own join: a card of several is on the way it was written.
        return found.map(({ current: _current, ...each }) =>
            outcomeKey(each) === picked ? { ...each, current: true as const } : each,
        );
    }
    return step === null || found.some((each) => each.current === true)
        ? found
        : [...found, ...draft.joinOutcomes({ step: step.index }).outcomes.filter((each) => each.current === true)];
}

/**
 * An outcome's key: what tells it from the others of one card.
 * @param outcome - The outcome.
 * @returns The key.
 */
export function outcomeKey(outcome: SourceJoinOutcome): string {
    const { code, rows, onto, uses, fields } = outcome;
    return JSON.stringify([code, rows, onto, uses, fields]);
}

/**
 * Whether two outcomes make the same thing of the same sides.
 * @param x - One outcome.
 * @param y - The other.
 * @returns True when they do.
 */
export function sameOutcome(x: SourceJoinOutcome, y: SourceJoinOutcome): boolean {
    const said = ({ code, rows, onto, acts }: SourceJoinOutcome): string =>
        JSON.stringify([code, rows, onto, acts.length]);
    return said(x) === said(y);
}

/**
 * The live counts of a line's match, a step card's against the graph before its own step.
 * @param draft - The open draft.
 * @param line - The line.
 * @param on - How it compares values.
 * @param before - The card's step place, if it has one.
 * @returns The counts; null while a pick is missing, for new nodes, and for a field matched with itself.
 */
export function countsOf(
    draft: SourceDraft,
    line: CardLine,
    on: Ignoring,
    before: number | undefined,
): SourceMatchCounts | null {
    const match = matchOf(line);
    const { a, b } = line;
    const self = sameSide(a.side, b.side) && a.field === b.field;
    if (match === null || a.side === null || b.side === null || self) {
        return null;
    }
    try {
        return draft.joinRows({
            a: a.side,
            b: b.side,
            match,
            ...ignoringOf(on),
            ...(before === undefined ? {} : { before }),
            limit: 0,
        }).counts;
    } catch {
        return null;
    }
}

/**
 * Whether a value of a step's matches names several nodes, the way its act reads them.
 * @param draft - The open draft.
 * @param row - The step.
 * @returns True when one does.
 */
export function namesSeveral(draft: SourceDraft, row: SourceStepRow): boolean {
    const { act } = row;
    if (act === null) {
        return false;
    }
    const { from, into, to } = act;
    const pairs = [
        { from, into },
        ...(to === undefined || to.unmatched === "add"
            ? []
            : [{ from: { source: from.source, field: to.field }, into: to.into }]),
    ];
    return pairs.some((pair) => {
        try {
            return draft.matchCounts(pair, { ...ignoringOf(act), before: row.index }).fanOut > 0;
        } catch {
            return false;
        }
    });
}

/**
 * How a card compares values, as the element takes it.
 * @param on - The card.
 * @returns The options.
 */
export function ignoringOf(on: Ignoring): Ignoring {
    return { ignoreCase: on.ignoreCase, ignoreSpaces: on.ignoreSpaces };
}

/** A card's Ignore switches: what each would add over its matches. */
export interface MatchSwitches {
    /** How many more rows, or nodes, Ignore case would match, over every match of the card; null while on. */
    readonly moreWithCase: number | null;
    /** How many more rows, or nodes, Ignore spaces would match; null while on. */
    readonly moreWithSpaces: number | null;
    /** Whether the two together would match rows neither does alone. */
    readonly together: boolean;
}

/**
 * What a switch would add to a match: the rows it would bring in, else the nodes the odd spelling is on.
 * @param rows - How many more rows.
 * @param nodes - How many more nodes.
 * @returns The count, or null while the switch is on.
 */
function more(rows: number | null, nodes: number | null): number | null {
    return rows === null || nodes === null ? null : Math.max(rows, nodes);
}

/**
 * What the Ignore switches, which set a whole card's matching, would add over its matches.
 * @param all - Each match's counts, or null while unpicked.
 * @returns The sums.
 */
export function switchesOf(all: readonly (SourceMatchCounts | null)[]): MatchSwitches {
    const sum = (read: (counts: SourceMatchCounts) => number | null): number | null =>
        all.reduce<number | null>((total, counts) => {
            const extra = counts === null ? null : read(counts);
            return extra === null ? total : (total ?? 0) + extra;
        }, null);
    return {
        moreWithCase: sum((counts) => more(counts.moreRowsWithIgnoreCase, counts.moreNodesWithIgnoreCase)),
        moreWithSpaces: sum((counts) => more(counts.moreRowsWithIgnoreSpaces, counts.moreNodesWithIgnoreSpaces)),
        together: (sum((counts) => more(counts.moreRowsWithBoth, counts.moreNodesWithBoth)) ?? 0) > 0,
    };
}

/**
 * What a row matching nothing can do under an outcome: what keeps it, its default first or last as the
 * outcome has it, then what leaves it out.
 * @param outcome - The outcome.
 * @returns The two ways and the default, or null where no row can go unmatched.
 */
export function noMatchWays(
    outcome: Pick<SourceJoinOutcome, "code" | "ownNodes">,
): { readonly ways: readonly [NoMatch, NoMatch]; readonly unset: NoMatch } | null {
    switch (outcome.code) {
        case "fields":
        case "edge": {
            return { ways: ["add", "skip"], unset: "skip" };
        }
        case "fold": {
            return { ways: ["keep", "remove"], unset: "keep" };
        }
        case "link":
        case "middle": {
            return outcome.ownNodes
                ? { ways: ["keep", "remove"], unset: "keep" }
                : { ways: ["add", "skip"], unset: "add" };
        }
        default: {
            return null;
        }
    }
}

/**
 * What a row matching nothing does under an outcome, as its card shows it.
 * @param outcome - The outcome.
 * @param result - The card's options.
 * @returns The way: the one set when the outcome takes it, else its default.
 */
export function noMatchOf(outcome: SourceJoinOutcome, result: CardResult): NoMatch | null {
    const choice = noMatchWays(outcome);
    if (choice === null) {
        return null;
    }
    return choice.ways.find((way) => way === result.noMatch) ?? choice.unset;
}

/**
 * Whether an outcome links rows of a side to nodes of the same side.
 * @param outcome - The outcome.
 * @returns True when it does.
 */
export function linksItself(outcome: Pick<SourceJoinOutcome, "code" | "rows" | "onto">): boolean {
    return outcome.code === "link" && sameSide(outcome.rows.at(0) ?? null, outcome.onto.at(0) ?? null);
}

/**
 * Which way an outcome's edges run: as set, else from the first end to the other, or from a row to the
 * row of its own side it names.
 * @param outcome - The outcome.
 * @param result - The card's options.
 * @returns The direction.
 */
export function directionOf(
    outcome: Pick<SourceJoinOutcome, "code" | "rows" | "onto">,
    result: CardResult,
): "into-from" | "from-into" {
    return result.direction ?? (linksItself(outcome) ? "from-into" : "into-from");
}

/**
 * Which way a step's edges run, of its outcome's ends: a step made by its ends the other way round runs
 * the other way between them.
 * @param act - The step's act.
 * @param outcome - Its outcome.
 * @returns The direction.
 */
function wayOf(act: SourceStepAct, outcome: Pick<SourceJoinOutcome, "acts">): "into-from" | "from-into" {
    const made = outcome.acts.at(0);
    const turned = made?.act === "connect" && made.options.from.field !== act.from.field;
    const way = act.direction ?? "into-from";
    if (!turned) {
        return way;
    }
    return way === "into-from" ? "from-into" : "into-from";
}

/**
 * A connect's options read back.
 * @param act - The step's act.
 * @param outcome - Its outcome.
 * @param kept - The way a row matching nothing is kept.
 * @param left - The way it is left out.
 * @returns The options.
 */
function connectResult(
    act: SourceStepAct,
    outcome: Pick<SourceJoinOutcome, "code" | "ownNodes" | "acts">,
    kept: NoMatch | null,
    left: NoMatch | null,
): CardResult {
    // A row an earlier "left out" kept because the graph already held its node is kept.
    const out = act.unlinked === "remove" || (act.unlinked === "drop" && !outcome.ownNodes);
    const isEdge = outcome.code === "edge";
    const gone = isEdge ? act.unmatched !== "add" : out;
    return {
        ...DEFAULT_RESULT,
        fanOut: act.fanOut ?? "skip",
        noMatch: gone ? left : kept,
        missing: !isEdge && act.unmatched === "add" ? "add" : "skip",
        direction: wayOf(act, outcome),
        edgeType: act.edgeType ?? "",
        perPair: act.perPair === true,
        existing: act.existing ?? "add",
        type: act.to?.unmatched === "add" ? (act.to.type ?? "") : "",
    };
}

/**
 * A step's options read back.
 * @param row - The step.
 * @param outcome - Its outcome.
 * @returns The options.
 */
export function resultOf(
    row: SourceStepRow,
    outcome: Pick<SourceJoinOutcome, "code" | "ownNodes" | "acts">,
): CardResult {
    const [kept = null, left = null] = noMatchWays(outcome)?.ways ?? [];
    if (row.link !== null) {
        const { edgeType = "", type = "", maxShared, minShared } = row.link;
        return {
            ...DEFAULT_RESULT,
            edgeType,
            type,
            ...(maxShared === undefined ? {} : { maxShared }),
            ...(minShared === undefined ? {} : { minShared }),
        };
    }
    if (row.extract !== null) {
        const { split = "", type = "", edgeType = "", columns = [] } = row.extract;
        return { ...DEFAULT_RESULT, split, type, edgeType, columns };
    }
    if (row.act === null) {
        return DEFAULT_RESULT;
    }
    const { act } = row;
    const fanOut = act.fanOut ?? "skip";
    if (act.act === "merge") {
        return {
            ...DEFAULT_RESULT,
            fanOut,
            repeated: act.repeated === null || act.repeated === "both" ? "first" : act.repeated,
            noMatch: act.unmatchedFrom === "drop" ? left : kept,
        };
    }
    return connectResult(act, outcome, kept, left);
}

type Merge = Extract<SourceJoinAct, { act: "merge" }>["options"];
type Connect = Extract<SourceJoinAct, { act: "connect" }>["options"];
type Link = Extract<SourceJoinAct, { act: "link" }>["options"];
type Extracted = Extract<SourceJoinAct, { act: "extract" }>["options"];

/** What an act's options are made of. */
interface Choices {
    readonly outcome: SourceJoinOutcome;
    readonly result: CardResult;
    readonly on: Ignoring;
    /** The step the card is, whose choices no option names it keeps. */
    readonly step: SourceStepRow | null;
}

/**
 * A member of an act, left out where it is empty.
 * @param name - The member.
 * @param text - Its text.
 * @returns It.
 */
const given = <K extends string>(name: K, text: string): Partial<Record<K, string>> =>
    (text === "" ? {} : { [name]: text }) as Partial<Record<K, string>>;

/**
 * A merge with a card's options.
 * @param options - The merge.
 * @param c - The options.
 * @returns The merge's options.
 */
function mergeWith(options: Merge, c: Choices): Merge {
    const noMatch = noMatchOf(c.outcome, c.result);
    // Every other column is `repeated`'s.
    const { "*": _all, ...own } = c.step?.act?.aggregate ?? {};
    const aggregate = { ...own, ...options.aggregate };
    return {
        ...options,
        ...ignoringOf(c.on),
        unmatchedFrom: noMatch === "skip" || noMatch === "remove" ? "drop" : "keep",
        fanOut: c.result.fanOut,
        ...(c.result.repeated === "first" ? {} : { repeated: c.result.repeated }),
        ...(Object.keys(aggregate).length === 0 ? {} : { aggregate }),
    };
}

/** What becomes of a row nothing links, by the way picked. */
const UNLINKED = { add: "keep", keep: "keep", skip: "drop", remove: "remove" } as const;

/**
 * A connect with a card's options.
 * @param options - The connect.
 * @param c - The options.
 * @returns The connect's options.
 */
function connectWith(options: Connect, c: Choices): Connect {
    const { outcome, result } = c;
    const noMatch = noMatchOf(outcome, result) ?? "keep";
    const { to } = options;
    const { type } = result;
    const end = to?.unmatched === "add" && type !== "" ? { to: { ...to, type, into: { space: type } } } : {};
    const rows =
        outcome.code === "edge"
            ? {
                  unmatched: noMatch === "add" ? ("add" as const) : ("skip" as const),
                  perPair: result.perPair,
                  existing: result.existing,
              }
            : { unmatched: result.missing, unlinked: UNLINKED[noMatch] };
    return {
        ...options,
        ...ignoringOf(c.on),
        ...end,
        direction: directionOf(outcome, result),
        fanOut: result.fanOut,
        ...given("edgeType", result.edgeType),
        ...rows,
    };
}

/**
 * A link with a card's options.
 * @param options - The link.
 * @param c - The options.
 * @returns The link's options.
 */
function linkWith(options: Link, c: Choices): Link {
    const { outcome, result } = c;
    const was = c.step?.link ?? null;
    const asNodes = outcome.code === "shared-nodes";
    const kept = asNodes && was?.as === "nodes" && (was.type ?? "") === result.type ? was.space : undefined;
    const least = asNodes ? undefined : result.minShared;
    return {
        ...options,
        ...ignoringOf(c.on),
        ...given("edgeType", result.edgeType),
        ...(asNodes ? given("type", result.type) : {}),
        ...(result.maxShared === undefined ? {} : { maxShared: result.maxShared }),
        ...(least === undefined ? {} : { minShared: least }),
        ...(kept === undefined ? {} : { space: kept }),
    };
}

/**
 * New nodes with a card's options: they stay in the space they are in while their type and column do.
 * @param options - The new nodes.
 * @param c - The options.
 * @returns The new nodes' options.
 */
function extractWith(options: Extracted, c: Choices): Extracted {
    const { result } = c;
    const was = c.step?.extract ?? null;
    const kept = was?.column === options.column && (was.type ?? "") === result.type ? was.space : undefined;
    return {
        ...options,
        ...(kept === undefined ? {} : { space: kept }),
        ...(was?.from === undefined ? {} : { from: was.from }),
        ...given("edgeType", result.edgeType),
        ...given("type", result.type),
        ...given("split", result.split),
        ...(result.columns.length === 0 ? {} : { columns: result.columns }),
    };
}

/**
 * An outcome's act with a card's options.
 * @param act - The act.
 * @param c - The options.
 * @returns The act.
 */
function actWith(act: SourceJoinAct, c: Choices): SourceJoinAct {
    switch (act.act) {
        case "merge": {
            return { act: "merge", options: mergeWith(act.options, c) };
        }
        case "connect": {
            return { act: "connect", options: connectWith(act.options, c) };
        }
        case "link": {
            return { act: "link", options: linkWith(act.options, c) };
        }
        default: {
            return { act: "extract", source: act.source, options: extractWith(act.options, c) };
        }
    }
}

/**
 * Make an act on a draft.
 * @param draft - The open draft.
 * @param act - The act.
 */
function make(draft: SourceDraft, act: SourceJoinAct): void {
    switch (act.act) {
        case "merge": {
            draft.merge(act.options);
            break;
        }
        case "connect": {
            draft.connect(act.options);
            break;
        }
        case "link": {
            draft.link(act.options);
            break;
        }
        default: {
            draft.extract(act.source, act.options);
        }
    }
}

/**
 * Take steps out of the draft, the last first, so each earlier place still holds.
 * @param draft - The open draft.
 * @param steps - The steps, in order.
 */
export function removeSteps(draft: SourceDraft, steps: readonly SourceStepRow[]): void {
    for (const each of steps.toReversed()) {
        draft.removeStep(each.index, { adds: "remove" });
    }
}

/**
 * Write an outcome into the draft as one undo entry: a new card's acts at the end, a one-step card's act
 * in its step's place.
 * @param draft - The open draft.
 * @param steps - The steps the card is.
 * @param outcome - The outcome.
 * @param result - The card's options.
 * @param on - How it compares values.
 * @returns The steps it is now, in order.
 */
export function writeOutcome(
    draft: SourceDraft,
    steps: readonly SourceStepRow[],
    outcome: SourceJoinOutcome,
    result: CardResult,
    on: Ignoring,
): readonly SourceStepRow[] {
    const step = steps.at(0) ?? null;
    const acts = outcome.acts.map((act) => actWith(act, { outcome, result, on, step }));
    const [only] = acts;
    if (step !== null && steps.length === 1 && acts.length === 1) {
        const before = draft.steps().length;
        draft.replaceStep(step.index, only);
        // A staged source the act adds, or no longer needs, comes just before its step.
        const steps = draft.steps();
        return steps.slice(step.index + steps.length - before).slice(0, 1);
    }
    draft.batch(() => {
        removeSteps(draft, steps);
        for (const act of acts) {
            make(draft, act);
        }
    });
    return draft
        .steps()
        .filter((row) => isJoin(row))
        .slice(-acts.length);
}

/**
 * The fields of a side, its key first, before a step.
 * @param draft - the open draft
 * @param side - the side
 * @param before - the step's place, if there is one
 * @returns the fields; none once the side is gone
 */
export function fieldsOf(
    draft: SourceDraft,
    side: SourceJoinSide | null,
    before: number | undefined,
): readonly SourceSideField[] {
    if (side === null) {
        return [];
    }
    try {
        const fields = draft.sideFields(side, before === undefined ? {} : { before });
        return [...fields.filter((field) => field.key), ...fields.filter((field) => !field.key)];
    } catch {
        // A source an undo or a removal took away.
        return [];
    }
}
