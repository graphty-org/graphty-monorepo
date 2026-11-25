/**
 * @file The join workspace's cards (issue #9796): one card per join, saying what each row of a
 * source becomes, the fields it matches and that choice's options. A card whose fields are all
 * picked is a step of the one open source draft and is read back from `draft.steps()` after every
 * change, so undo never leaves a card out of step with the draft; a card that still misses a pick is
 * only the reader's picks. Every count, value list and column comes from the open draft, never the
 * committed graph.
 */

import type {
    JoinReduce,
    SourceDraft,
    SourceExtractOptions,
    SourceJoinAct,
    SourceJoinInto,
    SourceKey,
    SourceLinkOptions,
    SourceMatchCounts,
    SourceMatchPair,
    SourceStepAct,
    SourceStepRow,
} from "@graphty/graphty-element/session";

import { columnsOf } from "./join";

/**
 * What each row of a card's source becomes: fields on a node the graph holds, an edge between two
 * nodes, a node linked to what it names, or links between the nodes sharing a value.
 */
export type Becomes = "fields" | "edge" | "node" | "links";

/** What a card's step does, as the element's join acts name it. */
export type CardAct = SourceJoinAct["act"];

/**
 * The node 1 side of a match: a space's keys, a column its nodes carry, a column of the source that
 * supplied it, a staged source's keys (an empty `space`), or new nodes (`isNew`), one per value.
 */
export interface CardInto {
    readonly space: string;
    readonly source?: SourceKey;
    readonly field?: string;
    /** The matched field's values become new nodes; as another end, in `space` and of that type. */
    readonly isNew?: true;
}

/** The reader's picks of one card. */
export interface CardPicks {
    /** What each row becomes, or null until the reader says. */
    readonly becomes: Becomes | null;
    /** The incoming source and the field that names node 1. */
    readonly from: { readonly source: SourceKey; readonly field?: string } | null;
    readonly into: CardInto | null;
    readonly ignoreCase: boolean;
    readonly ignoreSpaces: boolean;
    /** The second match: the incoming field naming the other end, and the nodes it names. */
    readonly to?: { readonly field?: string; readonly into: CardInto | null } | null;
    /** Links: the columns whose values link nodes. */
    readonly shared?: readonly string[];
    /** Links: the values are in rows of `from`, whose field names the node holding them; else the nodes carry them. */
    readonly inRows?: boolean;
}

/** A card's options, as the draft's step carries them. */
export interface CardResult {
    /** Fields: what a node named by several rows keeps: the first or last row, or every row's values as a list or a count. */
    readonly many: "first" | "last" | "list" | "count";
    /** Fields: what a row matching no node does. */
    readonly unmatchedFrom: "keep" | "drop";
    /** Edge and node: which way the edges run. */
    readonly direction: "into-from" | "from-into";
    readonly edgeType: string;
    /** Edge: one edge per pair of ends. */
    readonly perPair: boolean;
    /** Edge and node: a row whose field names no node. */
    readonly unmatched: "skip" | "add";
    /** Edge: a row whose ends an edge already joins. */
    readonly existing: "add" | "merge";
    /** New nodes: the separator a cell holds several values by, or "" for none. */
    readonly split: string;
    /** New nodes: their type, or "". */
    readonly type: string;
    /** New nodes: the columns that move onto them. */
    readonly columns: readonly string[];
    /** Links: edges between the nodes, or a node per value. */
    readonly as: "edges" | "nodes";
    /** Links: a value more nodes hold links none of them; absent, the element's own default. */
    readonly maxShared?: number;
    /** Links: how many values a pair must share; absent, the element's own default. */
    readonly minShared?: number;
}

/** A card with no step yet: only the reader's picks. */
export interface PendingCard {
    readonly id: string;
    readonly picks: CardPicks;
    /** What the element guessed its rows become, shown as a suggestion and never picked for the reader. */
    readonly guess: Becomes | null;
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
    /** The step's options, or null for a pending card. */
    readonly result: CardResult | null;
    readonly guess: Becomes | null;
    readonly suggested: boolean;
}

/** The options a new step starts with. */
export const DEFAULT_RESULT: CardResult = {
    many: "first",
    unmatchedFrom: "keep",
    direction: "into-from",
    edgeType: "",
    perPair: false,
    unmatched: "skip",
    existing: "add",
    split: "",
    type: "",
    columns: [],
    as: "edges",
};

/** Picks with nothing picked. */
const NO_PICKS: CardPicks = { becomes: null, from: null, into: null, ignoreCase: false, ignoreSpaces: false };

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
 * @param pending - The cards with no step yet.
 * @returns The cards.
 */
export function cardsOf(draft: SourceDraft, pending: readonly PendingCard[]): JoinCardView[] {
    const steps = draft.steps().flatMap((row): JoinCardView[] => {
        const read = readBack(draft, row);
        return read === null
            ? []
            : [
                  {
                      id: stepCardId(row.index),
                      step: row,
                      picks: read.picks,
                      result: { ...DEFAULT_RESULT, ...read.result },
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
 * A join step read back as a card's picks and options.
 * @param draft - The open draft.
 * @param row - The step.
 * @returns Them, or null for a step no card makes.
 */
function readBack(
    draft: SourceDraft,
    row: SourceStepRow,
): { readonly picks: CardPicks; readonly result: Partial<CardResult> } | null {
    if (row.act !== null) {
        return actBack(row.act);
    }
    if (row.link !== null) {
        return linkBack(draft, row.link);
    }
    return row.extract === null ? null : extractBack(row.source, row.extract);
}

/**
 * A Merge or Connect step read back.
 * @param act - The step's act.
 * @returns The picks and options.
 */
function actBack(act: SourceStepAct): { readonly picks: CardPicks; readonly result: Partial<CardResult> } {
    const matching = { ignoreCase: act.ignoreCase, ignoreSpaces: act.ignoreSpaces };
    const { from, to } = act;
    const into = intoBack(act.into, act.into.space);
    if (act.act === "merge") {
        return {
            picks: { becomes: "fields", from, into, ...matching },
            result: { many: manyOf(act.aggregate, act.repeated), unmatchedFrom: act.unmatchedFrom ?? "keep" },
        };
    }
    const isNew = to?.unmatched === "add" ? { isNew: true as const } : {};
    return {
        picks: {
            becomes: to === undefined || to.keepRow === true ? "node" : "edge",
            from,
            into,
            ...matching,
            ...(to === undefined ? {} : { to: { field: to.field, into: { space: to.into.space, ...isNew } } }),
        },
        result: {
            direction: act.direction ?? "into-from",
            edgeType: act.edgeType ?? "",
            perPair: act.perPair === true,
            unmatched: act.unmatched ?? "skip",
            existing: act.existing ?? "add",
        },
    };
}

/**
 * A node 1 side as the element reads it back.
 * @param into - The side.
 * @param space - Its space.
 * @returns The card's side.
 */
function intoBack(into: SourceJoinInto, space: string): CardInto {
    return {
        space,
        ...(into.source === undefined ? {} : { source: into.source }),
        ...(into.field === undefined ? {} : { field: into.field }),
    };
}

/**
 * A step linking nodes that share a value, read back.
 * @param draft - The open draft.
 * @param link - The step's options.
 * @returns The picks and options.
 */
function linkBack(
    draft: SourceDraft,
    link: SourceLinkOptions,
): { readonly picks: CardPicks; readonly result: Partial<CardResult> } {
    const inRows = link.field !== undefined;
    const own = draft.spaces().find((space) => space.sources.includes(link.source));
    let into: CardInto = own === undefined ? { space: "", source: link.source } : { space: own.space };
    if (link.nodes !== undefined) {
        into = { space: link.nodes };
    } else if (inRows && link.into !== undefined) {
        into = intoBack(link.into, link.into.space ?? "");
    }
    return {
        picks: {
            becomes: "links",
            from: { source: link.source, ...(inRows ? { field: link.field } : {}) },
            into,
            ignoreCase: link.ignoreCase === true,
            ignoreSpaces: link.ignoreSpaces === true,
            shared: link.columns,
            inRows,
        },
        result: {
            as: link.as ?? "edges",
            edgeType: link.edgeType ?? "",
            type: link.type ?? "",
            ...(link.maxShared === undefined ? {} : { maxShared: link.maxShared }),
            ...(link.minShared === undefined ? {} : { minShared: link.minShared }),
        },
    };
}

/**
 * A step making nodes of a column's values, read back.
 * @param source - The step's source.
 * @param extract - The step's options.
 * @returns The picks and options.
 */
function extractBack(
    source: SourceKey,
    extract: SourceExtractOptions,
): { readonly picks: CardPicks; readonly result: Partial<CardResult> } {
    return {
        picks: {
            ...NO_PICKS,
            becomes: "node",
            from: { source, field: extract.column },
            into: { space: "", isNew: true },
        },
        result: {
            split: extract.split ?? "",
            type: extract.type ?? "",
            edgeType: extract.edgeType ?? "",
            columns: extract.columns ?? [],
        },
    };
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
 * Whether two cards make the same join of the same fields.
 * @param a - One card's picks.
 * @param b - The other's.
 * @returns True when they do.
 */
function samePicks(a: CardPicks, b: CardPicks): boolean {
    const named = (picks: CardPicks): string =>
        JSON.stringify([picks.becomes, picks.into, pairOf(picks), toPairOf(picks), picks.from, picks.shared ?? []]);
    return named(a) === named(b);
}

/**
 * A card's node 1 side as the element takes it.
 * @param into - The side.
 * @returns The side.
 */
function intoOf(into: CardInto): SourceJoinInto {
    if (into.source === undefined) {
        return into.field === undefined ? { space: into.space } : { space: into.space, field: into.field };
    }
    return into.field === undefined && into.space !== ""
        ? { space: into.space }
        : { source: into.source, ...(into.field === undefined ? {} : { field: into.field }) };
}

/**
 * The second match a card's picks make, once both its fields are picked.
 * @param picks - The picks.
 * @returns The pair, or null.
 */
export function toPairOf(picks: CardPicks): SourceMatchPair | null {
    const { from, to } = picks;
    if (from === null || to?.field === undefined || to.into === null) {
        return null;
    }
    const into = to.into.isNew === true ? { space: newKind(picks) } : intoOf(to.into);
    return { from: { source: from.source, field: to.field }, into };
}

/**
 * The kind of the new nodes at a card's other end: the name picked for them, else the field's.
 * @param picks - The picks.
 * @returns The kind.
 */
export function newKind(picks: CardPicks): string {
    const { to } = picks;
    return to?.into?.space === undefined || to.into.space === "" ? (to?.field ?? "") : to.into.space;
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
 * The match a card's picks make, once both fields are picked; none for new nodes, which match nothing.
 * @param picks - The picks.
 * @returns The pair, or null.
 */
export function pairOf(picks: CardPicks): SourceMatchPair | null {
    const { from, into } = picks;
    if (from?.field === undefined || into === null || into.isNew === true) {
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

/** A field of node 1 as a card offers it: its name, and the side picking it makes. */
export interface IntoField {
    readonly label: string;
    readonly into: CardInto;
}

/**
 * The fields of a card's node 1 besides its key, each a side a match can name: every column the
 * nodes of its space carry as the draft builds them before the card's own step, those earlier merges
 * brought included; a staged source's own columns.
 * @param draft - The open draft.
 * @param into - The side.
 * @param before - The card's step place, if it has one.
 * @returns The fields.
 */
export function intoFields(draft: SourceDraft, into: CardInto, before?: number): readonly IntoField[] {
    const { space, source } = into;
    if (space === "" && source !== undefined) {
        return columnsOf(draft, source, "nodes").map((field) => ({ label: field, into: { space, source, field } }));
    }
    const suppliers = draft.steps().filter((step) => step.op === "join.add" && step.spaces.includes(space));
    const only = suppliers.length === 1 ? suppliers[0]?.source : undefined;
    const own = only === undefined ? [] : columnsOf(draft, only, "nodes");
    let carried: readonly string[] = [];
    try {
        carried = draft.columns(space, before === undefined ? {} : { before }).map((column) => column.name);
    } catch {
        // A space an undo took away carries nothing.
    }
    return [
        ...own.map((field) => ({ label: field, into: { space, source: only, field } })),
        ...carried.filter((field) => !own.includes(field)).map((field) => ({ label: field, into: { space, field } })),
    ];
}

/**
 * A source's columns, as the open draft reads them: node rows first, else edge rows.
 * @param draft - The open draft.
 * @param source - The source.
 * @returns The column names.
 */
export function draftColumns(draft: SourceDraft, source: SourceKey): readonly string[] {
    return columnsOf(draft, source);
}

/**
 * The columns a Links card can match with themselves: the columns of the rows that hold the values,
 * else every column the nodes carry.
 * @param draft - The open draft.
 * @param picks - The card's picks.
 * @param before - The card's step place, if it has one.
 * @returns The column names.
 */
export function sharedColumns(draft: SourceDraft, picks: CardPicks, before?: number): readonly string[] {
    const { from, into } = picks;
    if (picks.inRows === true) {
        return from === null ? [] : draftColumns(draft, from.source).filter((column) => column !== from.field);
    }
    return into === null ? [] : intoFields(draft, into, before).map((field) => field.label);
}

/**
 * What a card's picks and options make, as the element takes it: null until every field that
 * choice needs is picked.
 * @param picks - The picks.
 * @param result - The options.
 * @param step - The step the card is, whose other choices it keeps.
 * @returns The act, or null.
 */
export function actOf(picks: CardPicks, result: CardResult, step: SourceStepRow | null = null): SourceJoinAct | null {
    switch (picks.becomes) {
        case "fields": {
            return mergeOf(picks, result, step);
        }
        case "edge": {
            return toPairOf(picks) === null ? null : connectOf(picks, result);
        }
        case "node": {
            return picks.into?.isNew === true ? extractOf(picks, result, step) : connectOf(picks, result);
        }
        case "links": {
            return linkOf(picks, result, step);
        }
        default: {
            return null;
        }
    }
}

/**
 * The Merge a card's picks make.
 * @param picks - The picks.
 * @param result - The options.
 * @param step - The step the card is, whose rules of its own per column it keeps.
 * @returns The act, or null.
 */
function mergeOf(picks: CardPicks, result: CardResult, step: SourceStepRow | null): SourceJoinAct | null {
    const pair = pairOf(picks);
    if (pair === null) {
        return null;
    }
    const { many } = result;
    const { "*": _all, ...perColumn } = step?.act?.aggregate ?? {};
    const aggregate = { ...perColumn, ...(many === "list" || many === "count" ? { "*": many } : {}) };
    return {
        act: "merge",
        options: {
            ...pair,
            ignoreCase: picks.ignoreCase,
            ignoreSpaces: picks.ignoreSpaces,
            unmatchedFrom: result.unmatchedFrom,
            ...(many === "last" ? { repeated: "last" as const } : {}),
            ...(Object.keys(aggregate).length === 0 ? {} : { aggregate }),
        },
    };
}

/**
 * The Connect a card's picks make: each row an edge between its two ends, or a node linked to the
 * one or two nodes it names.
 * @param picks - The picks.
 * @param result - The options.
 * @returns The act, or null.
 */
function connectOf(picks: CardPicks, result: CardResult): SourceJoinAct | null {
    const pair = pairOf(picks);
    if (pair === null) {
        return null;
    }
    const other = toPairOf(picks);
    const isNew = picks.to?.into?.isNew === true;
    const to =
        other === null
            ? {}
            : {
                  to: {
                      field: other.from.field,
                      into: other.into,
                      ...(picks.becomes === "node" ? { keepRow: true } : {}),
                      ...(isNew ? { unmatched: "add" as const, type: newKind(picks) } : {}),
                  },
              };
    return {
        act: "connect",
        options: {
            ...pair,
            ignoreCase: picks.ignoreCase,
            ignoreSpaces: picks.ignoreSpaces,
            direction: result.direction,
            unmatched: result.unmatched,
            ...(picks.becomes === "edge" ? { perPair: result.perPair, existing: result.existing } : {}),
            ...(result.edgeType === "" ? {} : { edgeType: result.edgeType }),
            ...to,
        },
    };
}

/**
 * The new nodes a card's picks make of a column's values.
 * @param picks - The picks.
 * @param result - The options.
 * @param step - The step the card is, whose space it keeps while its type stays.
 * @returns The act, or null.
 */
function extractOf(picks: CardPicks, result: CardResult, step: SourceStepRow | null): SourceJoinAct | null {
    const { from } = picks;
    if (from?.field === undefined) {
        return null;
    }
    const was = step?.extract ?? null;
    const kept = was !== null && (was.type ?? "") === result.type ? { space: was.space } : {};
    return {
        act: "extract",
        source: from.source,
        options: {
            column: from.field,
            ...kept,
            ...(was === null ? {} : { from: was.from }),
            ...(result.split === "" ? {} : { split: result.split }),
            ...(result.type === "" ? {} : { type: result.type }),
            ...(result.edgeType === "" ? {} : { edgeType: result.edgeType }),
            ...(result.columns.length === 0 ? {} : { columns: result.columns }),
        },
    };
}

/**
 * The links a card's picks make between nodes sharing a value.
 * @param picks - The picks.
 * @param result - The options.
 * @param step - The step the card is, whose space it keeps while its type stays.
 * @returns The act, or null.
 */
function linkOf(picks: CardPicks, result: CardResult, step: SourceStepRow | null): SourceJoinAct | null {
    const { from, into, shared = [] } = picks;
    if (into === null || shared.length === 0) {
        return null;
    }
    let holder: Pick<SourceLinkOptions, "source" | "field" | "into" | "nodes">;
    if (picks.inRows === true) {
        if (from?.field === undefined) {
            return null;
        }
        holder = { source: from.source, field: from.field, into: intoOf(into) };
    } else if (into.space === "" && into.source !== undefined) {
        holder = { source: into.source };
    } else if (from === null) {
        return null;
    } else {
        holder = { source: from.source, nodes: into.space };
    }
    const asNodes = result.as === "nodes";
    const was = step?.link ?? null;
    const kept = asNodes && was?.as === "nodes" && (was.type ?? "") === result.type ? { space: was.space } : {};
    return {
        act: "link",
        options: {
            ...holder,
            columns: shared,
            as: result.as,
            ...(result.maxShared === undefined ? {} : { maxShared: result.maxShared }),
            ...(result.minShared === undefined ? {} : { minShared: result.minShared }),
            ...(result.edgeType === "" ? {} : { edgeType: result.edgeType }),
            ...(asNodes && result.type !== "" ? { type: result.type } : {}),
            ...kept,
            ignoreCase: picks.ignoreCase,
            ignoreSpaces: picks.ignoreSpaces,
        },
    };
}

/**
 * Write a card into the draft as ONE undo entry: a pending card's act is made at the end, a step
 * card's act is made again in its step's place.
 * @param draft - The open draft.
 * @param step - The step the card is, or null for a pending card.
 * @param act - The act.
 * @returns The step's place.
 */
export function writeCard(draft: SourceDraft, step: SourceStepRow | null, act: SourceJoinAct): number {
    const before = draft.steps().length;
    if (step !== null) {
        draft.replaceStep(step.index, act);
        // A staged source the act adds, or no longer needs, comes just before its step.
        return step.index + draft.steps().length - before;
    }
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
    // An edge source's moved columns follow its edges as a step of their own.
    const steps = draft.steps();
    return steps.findLastIndex((row) => row.act !== null || row.link !== null || row.extract !== null);
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
    if (source === undefined) {
        return { id, picks: { ...NO_PICKS, into }, guess: null, suggested: false };
    }
    const blank = { id, picks: { ...NO_PICKS, from: { source }, into }, guess: null, suggested: false };
    if (into !== null) {
        return blank;
    }
    try {
        const guesses = draft.suggestMatches(source);
        const best = guesses.at(0);
        const match = best?.matches.at(0);
        if (best === undefined || match === undefined) {
            return blank;
        }
        // The element proposes a space's keys; a match on another column is the reader's pick.
        const picks = { ...NO_PICKS, from: match.from, into: { space: match.into.space ?? "" } };
        if (best.result === "merge") {
            return { id, picks, guess: "fields", suggested: true };
        }
        // Rows read as edges name two ends: the next field the element connects is the other one.
        const edges = draft.sourceTable(source).summary().mapping.rows === "edges";
        const other = edges
            ? guesses
                  .map((each) => each.matches.at(0))
                  .find((each) => each !== undefined && each.from.field !== match.from.field)
            : undefined;
        const to =
            other === undefined ? {} : { to: { field: other.from.field, into: { space: other.into.space ?? "" } } };
        return { id, picks: { ...picks, ...to }, guess: edges ? "edge" : "node", suggested: true };
    } catch {
        return blank;
    }
}
