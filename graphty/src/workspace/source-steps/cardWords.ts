/**
 * @file How the join workspace's cards read: each source's one short name, a card's line in the list,
 * what an outcome would make in words, and a field's facts. Every fact is the element's.
 */

import type {
    GraphSession,
    SourceDraft,
    SourceJoinOutcome,
    SourceJoinSide,
    SourceMatchCounts,
    SourceSideField,
    SourceStepRow,
} from "@graphty/graphty-element/session";

import { baseName } from "../data-page/words";
import { sourceName } from "../data-place/words";
import { formatNumber } from "../inspector/words";
import {
    type CardEnd,
    type CardLine,
    type CardResult,
    directionOf,
    linesNaming,
    linksItself,
    loadOrder,
    matchOf,
    type NoMatch,
    sameSide,
    wholeLines,
} from "./joinCards";
import { counted, KIND_WORDS, WORKSPACE_WORDS } from "./words";

/** The sources' short names, by key: a data file without its extension, or whole where two would read the same. */
export type SourceNames = ReadonlyMap<string, string>;

/**
 * Every source's name in the join workspace.
 * @param session - the element's session
 * @returns the names
 */
export function sourceNames(session: GraphSession): SourceNames {
    const known = new Set(
        session.catalog.formats().flatMap((each) => each.extensions.map((ext) => ext.replace(/^\./, "").toLowerCase())),
    );
    const all = session.data.sources({ staged: true }).map((source) => {
        const full = sourceName(source);
        const extension = /\.([^.]*)$/.exec(full)?.[1].toLowerCase() ?? "";
        return { key: source.key, full, short: known.has(extension) ? baseName(full) : full };
    });
    const taken = new Map<string, number>();
    for (const { short } of all) {
        taken.set(short, (taken.get(short) ?? 0) + 1);
    }
    return new Map(all.map(({ key, full, short }) => [key, taken.get(short) === 1 ? short : full]));
}

/**
 * A source's name.
 * @param names - the sources' names
 * @param key - the source
 * @returns its name; a source that is gone reads as removed, never by its id
 */
export function nameOf(names: SourceNames, key: string): string {
    return names.get(key) ?? WORKSPACE_WORDS.removedSource;
}

/**
 * A side as the reader reads it: its source, or the node kind no one source owns.
 * @param session - the element's session
 * @param names - the sources' names
 * @param side - the side
 * @returns its name
 */
export function sideName(session: GraphSession, names: SourceNames, side: SourceJoinSide): string {
    if (side.source !== undefined) {
        return nameOf(names, side.source);
    }
    const owned = session.data.spaces().find((row) => row.space === side.space)?.ownedBy;
    // A step can name nodes of a source that is gone, once the removal is committed: never its id.
    const typed =
        session.data.types().some((type) => type.name === side.space) ||
        session.data.spaces().some((row) => row.space === side.space);
    return (owned === undefined ? undefined : names.get(owned)) ?? (typed ? side.space : WORKSPACE_WORDS.removedSource);
}

/**
 * A space as the reader reads it, as the draft builds it.
 * @param session - the element's session
 * @param draft - the open draft
 * @param names - the sources' names
 * @param space - the space
 * @returns its name
 */
export function spaceName(session: GraphSession, draft: SourceDraft, names: SourceNames, space: string): string {
    const row = draft.spaces().find((each) => each.space === space);
    const owned = row?.ownedBy === undefined ? undefined : names.get(row.ownedBy);
    return owned ?? (row === undefined ? sideName(session, names, { space }) : space);
}

/** The sides a card can pick, by how each is known. */
export interface SideChoices {
    readonly waiting: readonly SourceJoinSide[];
    readonly inGraph: readonly SourceJoinSide[];
    /** The node kinds no one source owns. */
    readonly types: readonly SourceJoinSide[];
}

/**
 * The sides a card can pick: every source, waiting or in the graph, and every node kind no one source
 * owns, as the draft builds it.
 * @param session - the element's session
 * @param draft - the open draft
 * @returns the sides
 */
export function sideChoices(session: GraphSession, draft: SourceDraft): SideChoices {
    return {
        waiting: session.data.staged().map((each) => ({ source: each.key })),
        inGraph: session.data.sources().map((each) => ({ source: each.key })),
        types: draft
            .spaces()
            .filter((row) => row.ownedBy === undefined && row.nodes > 0 && row.rowsOf.length !== 1)
            .map((row) => ({ space: row.space })),
    };
}

/**
 * The sides some lines name, in the order picked, each once.
 * @param lines - the lines
 * @returns them
 */
function sidesOf(lines: readonly CardLine[]): readonly SourceJoinSide[] {
    const out: SourceJoinSide[] = [];
    for (const side of lines.flatMap(({ a, b }) => [a.side, b.side])) {
        if (side !== null && !out.some((each) => sameSide(each, side))) {
            out.push(side);
        }
    }
    return out;
}

/**
 * A card's line in the list: the sources it joins, in the order picked; one source with itself by its
 * first field; a column made nodes beside its source.
 * @param session - the element's session
 * @param names - the sources' names
 * @param lines - the card's lines
 * @returns the words
 */
function rowName(session: GraphSession, names: SourceNames, lines: readonly CardLine[]): string {
    const sides = sidesOf(lines);
    if (sides.length === 0) {
        return WORKSPACE_WORDS.newJoin;
    }
    const read = sides.map((side) => sideName(session, names, side));
    const made = lines.flatMap(({ a, b }) => (b.isNew === true && a.field !== null ? [a.field] : []));
    const all = [...read, ...made];
    const field = firstField(session, lines);
    return all.length === 1 && field !== null && lines[0].b.side !== null ? `${all[0]}, ${field}` : all.join(" + ");
}

/**
 * The first field a card's lines name: of the earlier loaded source, whichever way round it was picked.
 * @param session - the element's session
 * @param lines - the lines
 * @returns it, or null
 */
function firstField(session: GraphSession, lines: readonly CardLine[]): string | null {
    const place = ({ side }: CardEnd): number => (side === null ? Infinity : loadOrder(session, side));
    const fields = lines.flatMap(({ a, b }) =>
        [a, b]
            .sort((x, y) => place(x) - place(y) || (x.field ?? "").localeCompare(y.field ?? ""))
            .map(({ field }) => field),
    );
    return fields.find((field) => field !== null) ?? null;
}

/** What a card is named by: the name the reader gave its join, else its lines. */
export interface CardNaming {
    readonly lines: readonly CardLine[];
    readonly name?: string;
}

/**
 * The cards' lines in the list: the name the reader gave a join, else the words of its lines; cards that
 * would read the same add their first field.
 * @param session - the element's session
 * @param names - the sources' names
 * @param all - what each card is named by
 * @returns the words, in the order of the cards
 */
export function rowNames(session: GraphSession, names: SourceNames, all: readonly CardNaming[]): readonly string[] {
    const read = all.map(({ lines }) => rowName(session, names, lines));
    const again = new Set(read.filter((name, at) => read.indexOf(name) !== at));
    return read.map((name, at) => {
        const given = all[at].name;
        if (given !== undefined) {
            return given;
        }
        const field = firstField(session, all[at].lines);
        return again.has(name) && field !== null && !name.endsWith(`, ${field}`) ? `${name}, ${field}` : name;
    });
}

/**
 * A folded card's line: its matches, each as its two fields.
 * @param lines - the card's lines
 * @returns such as "person_id = person_id"
 */
export function foldedSummary(lines: readonly CardLine[]): string {
    return lines
        .flatMap(({ a, b }) => (a.field !== null && b.field !== null ? [`${a.field} = ${b.field}`] : []))
        .join(", ");
}

/**
 * What a card is named by: the name given its join, and its lines -- its own, in the order the reader
 * picked them, else its step's, the earlier loaded source first, as the card reopens on them.
 * @param session - the element's session
 * @param steps - the steps it is one of
 * @param card - the card
 * @param card.lines - its lines
 * @param card.step - its step
 * @param card.name - the name the reader gave it before it wrote a step
 * @returns its naming
 */
export function namingLines(
    session: GraphSession,
    steps: readonly SourceStepRow[],
    card: { readonly lines: readonly CardLine[] | null; readonly step: SourceStepRow | null; readonly name?: string },
): CardNaming {
    // A written card is named by its join alone; the reader's own name is read only before that.
    const name = card.step === null ? card.name : card.step.join?.name;
    const named = name === undefined ? {} : { name };
    if (card.lines !== null) {
        return { lines: card.lines, ...named };
    }
    const place = ({ side }: CardEnd): number => (side === null ? Infinity : loadOrder(session, side));
    const read = card.step === null ? [] : linesNaming(steps, card.step);
    const lines = read
        .map((line) => (place(line.b) < place(line.a) ? { a: line.b, b: line.a } : line))
        .sort((x, y) => place(x.a) - place(y.a));
    return { lines, ...named };
}

const or = (words: readonly string[]): string => words.join(" or ");
const both = (words: readonly string[]): string => words.join(" and ");

/** What an outcome is worded by besides itself. */
interface Wording {
    /** A side's name. */
    readonly name: (side: SourceJoinSide) => string;
    /** The card's lines. */
    readonly lines: readonly CardLine[];
    /** Its options, for the way its edges run. */
    readonly result: CardResult;
}

/**
 * The ends of an outcome's edges, the way they run: kinds of nodes, or the two fields naming them where
 * both ends are one kind.
 * @param outcome - the outcome
 * @param w - what it is worded by
 * @returns the ends
 */
function runOf(outcome: SourceJoinOutcome, w: Wording): readonly string[] {
    const way = directionOf(outcome, w.result);
    const row = outcome.rows.map((side) => w.name(side)).join("");
    const onto = outcome.onto.map((side) => w.name(side));
    if (outcome.code === "link" && !linksItself(outcome)) {
        return way === "from-into" ? [row, ...onto] : [...onto, row];
    }
    const { fields } = outcome;
    const kinds = onto.length > 1 ? onto : [...onto, `new ${or(fields)} nodes`];
    const ends = fields.length === 2 ? fields : kinds;
    // One source's own edges run from a row to the row it names.
    return way === (linksItself(outcome) ? "from-into" : "into-from") ? ends : ends.toReversed();
}

/**
 * What an outcome would make, in words that say what appears.
 * @param outcome - the outcome
 * @param w - what it is worded by
 * @returns such as "Edge per door_entries row, people to buildings"
 */
function madeWords(outcome: SourceJoinOutcome, w: Wording): string {
    const rows = outcome.rows.map((side) => w.name(side));
    const onto = outcome.onto.map((side) => w.name(side));
    const [row = ""] = rows;
    const [first = ""] = onto;
    const { fields } = outcome;
    switch (outcome.code) {
        case "fields": {
            const by = fields.length === 0 ? "" : `, matching ${or(fields)}`;
            return `Fields of ${both(rows)} on ${first}${by}`;
        }
        case "fold": {
            return `Merge ${row} nodes into ${first}`;
        }
        case "link": {
            const run = runOf(outcome, w);
            if (linksItself(outcome)) {
                return `Edge from ${row} to ${first}, ${run.join(" -> ")}`;
            }
            return outcome.ownNodes ? `Edge from ${run.join(" to ")}` : `Node per ${row} row, linked to ${first}`;
        }
        case "edge": {
            const run = runOf(outcome, w);
            return sameEnds(outcome)
                ? `Edge per ${row} row, ${onto.join(" to ")}, ${run.join(" -> ")}`
                : `Edge per ${row} row, ${run.join(" to ")}`;
        }
        case "middle": {
            if (onto.length < 2) {
                return `Node per ${row} row, linked to ${first} and new ${or(fields)} nodes`;
            }
            return fields.length > 0
                ? `Node per ${row} row, linked to ${first} by ${both(fields)}`
                : `Node per ${row} row, linked to ${both(onto)}`;
        }
        case "shared": {
            return `Edge between ${first} sharing ${or(fields)}`;
        }
        case "shared-nodes": {
            return `Node per ${or(fields)}, linked to ${first}`;
        }
        case "new-nodes": {
            return `Node per ${or(fields)}, linked to ${row}`;
        }
        default: {
            return outcome.code;
        }
    }
}

/**
 * An outcome as a card's "Join type" lists it: one that uses only some of the card's lines names the field
 * it matches.
 * @param outcome - the outcome
 * @param w - what it is worded by
 * @returns the words
 */
export function outcomeWords(outcome: SourceJoinOutcome, w: Wording): string {
    const made = madeWords(outcome, w);
    const whole = wholeLines(w.lines);
    if (outcome.uses.length >= whole.length) {
        return made;
    }
    const matched = outcome.uses.flatMap((at) => {
        const line = whole.at(at);
        if (line === undefined) {
            return [];
        }
        const onto = [line.a, line.b].find((end) => outcome.onto.some((side) => sameSide(side, end.side)));
        return [onto?.field ?? line.a.field ?? ""];
    });
    return `${made}, ${WORKSPACE_WORDS.matching} ${or(matched)}`;
}

/**
 * Which way an outcome's edges can run.
 * @param outcome - the outcome
 * @param w - what it is worded by
 * @returns the two ways
 */
export function directions(
    outcome: SourceJoinOutcome,
    w: Wording,
): readonly { readonly value: "into-from" | "from-into"; readonly label: string }[] {
    return (["into-from", "from-into"] as const).map((value) => {
        const [first, ...rest] = runOf(outcome, { ...w, result: { ...w.result, direction: value } });
        const row = outcome.code === "middle" ? outcome.rows.map((side) => w.name(side)) : [];
        return { value, label: [first, ...row, ...rest].join(" -> ") };
    });
}

/**
 * Whether both ends of an outcome's edges are one kind of nodes, so which way they run is asked first.
 * @param outcome - the outcome
 * @returns true when they are
 */
export function sameEnds(outcome: SourceJoinOutcome): boolean {
    const [first, second] = outcome.onto;
    return linksItself(outcome) || (outcome.onto.length > 1 && sameSide(first, second));
}

/** What a row matching nothing does, as a card names each way. */
export const NO_MATCH_WORDS: Readonly<Record<NoMatch, string>> = {
    add: WORKSPACE_WORDS.addNode,
    skip: WORKSPACE_WORDS.skipRow,
    keep: WORKSPACE_WORDS.keepNode,
    remove: WORKSPACE_WORDS.removeNode,
};

/**
 * A field's facts, as a list and a column header say them: whether its values repeat, and how many of
 * its cells are empty.
 * @param field - the field
 * @returns such as "repeats, 69 empty", or "unique"
 */
export function factWords(field: SourceSideField): string {
    const repeats = field.repeated.keys > 0 ? WORKSPACE_WORDS.repeats : WORKSPACE_WORDS.unique;
    return [
        ...(field.distinct === 0 ? [] : [repeats]),
        ...(field.empty === 0 ? [] : [`${formatNumber(field.empty)} ${WORKSPACE_WORDS.empty}`]),
    ].join(", ");
}

/**
 * A field's profile, as its column header's tooltip says it.
 * @param field - the field
 * @param from - the source an earlier join brought it from, if one did
 * @returns such as "57 values, text: B-1001, B-1002"
 */
export function profileWords(field: SourceSideField, from: string | null): string {
    const samples = field.samples.map(String).join(", ");
    return [
        ...(from === null ? [] : [from]),
        `${counted(field.distinct, { one: "value", many: "values" })}, ${KIND_WORDS[field.kind]}`,
        ...(samples === "" ? [] : [samples]),
    ].join(": ");
}

/**
 * A match's live count, of the rows it reads.
 * @param counts - the element's counts
 * @returns such as "283 of 308 rows matched", or "205 of 308 rows matched, 69 empty"
 */
export function matchWords(counts: Pick<SourceMatchCounts, "matchedRows" | "rows" | "emptyRows">): string {
    const empty = counts.emptyRows === 0 ? "" : `, ${formatNumber(counts.emptyRows)} ${WORKSPACE_WORDS.empty}`;
    return `${formatNumber(counts.matchedRows)} of ${counted(counts.rows, WORKSPACE_WORDS.rowsMatched)}${empty}`;
}

/**
 * A match's count as a card's header draws it, short as a Filters card's count: its words are its name.
 * @param counts - the element's counts
 * @returns such as "283 of 308"
 */
export function matchShort(counts: Pick<SourceMatchCounts, "matchedRows" | "rows">): string {
    return `${formatNumber(counts.matchedRows)} of ${formatNumber(counts.rows)}`;
}

/**
 * A line by its fields, as a choice between a card's lines names it.
 * @param line - the line
 * @param at - its place, from 0
 * @returns the field both ends share, the two fields, or its place while unpicked
 */
export function lineWords(line: CardLine, at: number): string {
    const fields = [...new Set([line.a.field, line.b.field].filter((field) => field !== null))];
    return matchOf(line) === null || fields.length === 0
        ? `${WORKSPACE_WORDS.match} ${formatNumber(at + 1)}`
        : fields.join(" = ");
}
