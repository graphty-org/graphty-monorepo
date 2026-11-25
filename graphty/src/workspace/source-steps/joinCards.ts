/**
 * @file The join workspace's cards (issue #9796): one card per join, saying what each row of a
 * source becomes, the fields it matches and that choice's options. A card whose fields are all
 * picked is a step of the one open source draft and is read back from `draft.steps()` after every
 * change, so undo never leaves a card out of step with the draft; a card that still misses a pick is
 * only the reader's picks. Every count, value list and column comes from the open draft, never the
 * committed graph.
 */

import type {
    GraphSession,
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
    /** Fields: several rows naming one node, as the element's `repeated` takes and returns it. */
    readonly repeated: JoinReduce;
    /** Fields: what a row matching no node does. */
    readonly unmatchedFrom: "keep" | "drop";
    /** Edge and node: which way the edges run. */
    readonly direction: "into-from" | "from-into";
    readonly edgeType: string;
    /** Edge: one edge per pair of ends. */
    readonly perPair: boolean;
    /**
     * Edge and node: a row whose field names no node. A node's row that nothing links can also be
     * kept as it is.
     */
    readonly unmatched: "skip" | "add" | "keep";
    /** A row whose value names several nodes: joined to each of them, or to none. */
    readonly fanOut: "each" | "skip";
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
    /** The reader deleted its step's card: it is drawn again only once an undo brings the step back. */
    readonly deleted?: true;
    /** The options of the step it was, which the step it next writes starts with. */
    readonly last?: CardResult;
}

/** One card as the workspace draws it. */
export interface JoinCardView {
    readonly id: string;
    /** The draft step it is, or null for a pending card. */
    readonly step: SourceStepRow | null;
    readonly picks: CardPicks;
    /** The step's options, or null for a pending card. */
    readonly result: CardResult | null;
    /** For a pending card: the options of the step it was. */
    readonly last?: CardResult;
    readonly guess: Becomes | null;
    readonly suggested: boolean;
}

/** The options a new step starts with. */
export const DEFAULT_RESULT: CardResult = {
    repeated: "first",
    unmatchedFrom: "keep",
    direction: "into-from",
    edgeType: "",
    perPair: false,
    unmatched: "keep",
    fanOut: "each",
    existing: "add",
    split: "",
    type: "",
    columns: [],
    as: "edges",
};

/** A match's counts as a card shows them, and the Ignore switches its matches would gain by. */
export interface MatchSwitches {
    /** How many more rows, or nodes, Ignore case would match, over every match of the card; null while on. */
    readonly moreWithCase: number | null;
    /** How many more rows, or nodes, Ignore spaces would match; null while on. */
    readonly moreWithSpaces: number | null;
    /** Whether the two together would match rows neither does alone. */
    readonly together: boolean;
}

/**
 * What a switch would add to a match: the incoming rows it would bring in, else the nodes in the graph
 * the odd spelling is on.
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
            const more = counts === null ? null : read(counts);
            return more === null ? total : (total ?? 0) + more;
        }, null);
    return {
        moreWithCase: sum((counts) => more(counts.moreRowsWithIgnoreCase, counts.moreNodesWithIgnoreCase)),
        moreWithSpaces: sum((counts) => more(counts.moreRowsWithIgnoreSpaces, counts.moreNodesWithIgnoreSpaces)),
        together: (sum((counts) => more(counts.moreRowsWithBoth, counts.moreNodesWithBoth)) ?? 0) > 0,
    };
}

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
    const behind = new Set<string>();
    const steps = draft.steps().flatMap((row): JoinCardView[] => {
        const read = readBack(row);
        if (read === null) {
            return [];
        }
        const card: JoinCardView = {
            id: stepCardId(row.index),
            step: row,
            picks: read.picks,
            result: { ...DEFAULT_RESULT, ...read.result },
            guess: null,
            suggested: false,
        };
        // The card that wrote the step stays the same card, with the control the reader is in.
        const own = pending.find((each) => !behind.has(each.id) && each.deleted !== true && writtenFor(each, card));
        if (own === undefined) {
            return [card];
        }
        behind.add(own.id);
        return [{ ...card, id: own.id }];
    });
    const shown = pending.filter(
        (card) => card.deleted !== true && !behind.has(card.id) && !steps.some((each) => writtenFor(card, each)),
    );
    return [...steps, ...shown.map((card) => ({ ...card, step: null, result: null }))];
}

/**
 * A join step read back as a card's picks and options.
 * @param row - The step.
 * @returns Them, or null for a step no card makes.
 */
function readBack(row: SourceStepRow): { readonly picks: CardPicks; readonly result: Partial<CardResult> } | null {
    if (row.act !== null) {
        return actBack(row.act);
    }
    if (row.link !== null) {
        return linkBack(row.link, row.holders ?? "");
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
            result: {
                repeated: act.repeated === null || act.repeated === "both" ? "first" : act.repeated,
                unmatchedFrom: act.unmatchedFrom ?? "keep",
                fanOut: act.fanOut ?? "skip",
            },
        };
    }
    const asNode = to === undefined || to.keepRow === true;
    const toField = to?.into.field === undefined ? {} : { field: to.into.field };
    const skipped = asNode && act.unlinked !== "drop" ? "keep" : "skip";
    const isNew = to?.unmatched === "add" ? { isNew: true as const } : {};
    return {
        picks: {
            becomes: asNode ? "node" : "edge",
            from,
            into,
            ...matching,
            ...(to === undefined
                ? {}
                : { to: { field: to.field, into: { space: to.into.space, ...toField, ...isNew } } }),
        },
        result: {
            direction: act.direction ?? "into-from",
            edgeType: act.edgeType ?? "",
            perPair: act.perPair === true,
            unmatched: act.unmatched === "add" ? "add" : skipped,
            fanOut: act.fanOut ?? "skip",
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
 * @param link - The step's options.
 * @param holders - The space of the nodes it links.
 * @returns The picks and options.
 */
function linkBack(
    link: SourceLinkOptions,
    holders: string,
): { readonly picks: CardPicks; readonly result: Partial<CardResult> } {
    const inRows = link.field !== undefined;
    const into = inRows && link.into !== undefined ? intoBack(link.into, link.into.space ?? "") : { space: holders };
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
interface IntoField {
    readonly label: string;
    readonly into: CardInto;
}

/**
 * The source whose own space a space is, in the committed graph.
 * @param session - The element's session.
 * @param space - The space.
 * @returns The source, or undefined for a space no one source owns.
 */
export function ownerOf(session: GraphSession, space: string): SourceKey | undefined {
    return session.data.spaces().find((row) => row.space === space)?.ownedBy;
}

/**
 * The column a side's nodes are keyed by: the one every source that made them names.
 * @param draft - The open draft.
 * @param into - The side.
 * @param session - The element's session, for a side whose source the draft no longer adds.
 * @returns The column, or null when they name several, or none.
 */
export function keyColumn(draft: SourceDraft, into: CardInto, session: GraphSession | null = null): string | null {
    const sources = into.space === "" && into.source !== undefined ? [into.source] : addedInto(draft, into.space);
    // With no add left, the space is still that of the source the graph has it from.
    const owner = session === null ? undefined : ownerOf(session, into.space);
    try {
        const keys = new Set(
            (sources.length === 0 && owner !== undefined ? [owner] : sources).map(
                (source) => draft.sourceTable(source).summary().mapping.key ?? null,
            ),
        );
        const [key = null] = keys;
        return keys.size === 1 ? key : null;
    } catch {
        // A source an undo took away keys nothing.
        return null;
    }
}

/**
 * The sources added into a space.
 * @param draft - The open draft.
 * @param space - The space.
 * @returns Them.
 */
function addedInto(draft: SourceDraft, space: string): readonly SourceKey[] {
    return draft
        .steps()
        .flatMap((step) => (step.op === "join.add" && step.spaces.includes(space) ? [step.source] : []));
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
    const key = keyColumn(draft, into);
    if (space === "" && source !== undefined) {
        return columnsOf(draft, source, "nodes")
            .filter((field) => field !== key)
            .map((field) => ({ label: field, into: { space, source, field } }));
    }
    const added = addedInto(draft, space);
    const only = added.length === 1 ? added[0] : undefined;
    const own = only === undefined ? [] : columnsOf(draft, only, "nodes").filter((field) => field !== key);
    let carried: readonly string[] = [];
    try {
        carried = draft.columns(space, before === undefined ? {} : { before }).map((column) => column.name);
    } catch {
        // A space an undo took away carries nothing.
    }
    return [
        ...own.map((field) => ({ label: field, into: { space, source: only, field } })),
        ...carried
            .filter((field) => field !== key && !own.includes(field))
            .map((field) => ({ label: field, into: { space, field } })),
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
    // Every other column is `repeated`'s.
    const { "*": _all, ...aggregate } = step?.act?.aggregate ?? {};
    return {
        act: "merge",
        options: {
            ...pair,
            ignoreCase: picks.ignoreCase,
            ignoreSpaces: picks.ignoreSpaces,
            unmatchedFrom: result.unmatchedFrom,
            fanOut: result.fanOut,
            ...(result.repeated === "first" ? {} : { repeated: result.repeated }),
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
            unmatched: result.unmatched === "add" ? ("add" as const) : ("skip" as const),
            fanOut: result.fanOut,
            ...(picks.becomes === "edge"
                ? { perPair: result.perPair, existing: result.existing }
                : { unlinked: result.unmatched === "skip" ? ("drop" as const) : ("keep" as const) }),
            ...(result.edgeType === "" ? {} : { edgeType: result.edgeType }),
            ...to,
        },
    };
}

/**
 * The new nodes a card's picks make of a column's values.
 * @param picks - The picks.
 * @param result - The options.
 * @param step - The step the card is, whose space it keeps while its type and column stay.
 * @returns The act, or null.
 */
function extractOf(picks: CardPicks, result: CardResult, step: SourceStepRow | null): SourceJoinAct | null {
    const { from } = picks;
    if (from?.field === undefined) {
        return null;
    }
    const was = step?.extract ?? null;
    const same = was !== null && (was.type ?? "") === result.type && was.column === from.field;
    const kept = same ? { space: was.space } : {};
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
 * What holds the values a Links card matches.
 * @param picks - The picks.
 * @param into - The nodes linked.
 * @param step - The step the card is.
 * @returns The link's members, or null while a pick is missing.
 */
function holderOf(
    picks: CardPicks,
    into: CardInto,
    step: SourceStepRow | null,
): Pick<SourceLinkOptions, "source" | "field" | "into" | "nodes"> | null {
    const { from } = picks;
    if (picks.inRows === true) {
        return from?.field === undefined ? null : { source: from.source, field: from.field, into: intoOf(into) };
    }
    if (into.space === "" && into.source !== undefined) {
        return { source: into.source };
    }
    if (from === null) {
        return null;
    }
    // The rows' own nodes still hold the values: an option changed, not where they are.
    const was = step?.link ?? null;
    const own = was?.source === from.source && was.nodes === undefined && was.field === undefined;
    return own && step?.holders === into.space ? { source: from.source } : { source: from.source, nodes: into.space };
}

/**
 * The links a card's picks make between nodes sharing a value.
 * @param picks - The picks.
 * @param result - The options.
 * @param step - The step the card is, whose space it keeps while its type stays.
 * @returns The act, or null.
 */
function linkOf(picks: CardPicks, result: CardResult, step: SourceStepRow | null): SourceJoinAct | null {
    const { into, shared = [] } = picks;
    if (into === null || shared.length === 0) {
        return null;
    }
    const holder = holderOf(picks, into, step);
    if (holder === null) {
        return null;
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
 * The node 1 side the element proposes: a space's keys, or a staged source's.
 * @param into - The side.
 * @returns The card's side.
 */
function suggestedInto(into: SourceJoinInto): CardInto {
    const field = into.field === undefined ? {} : { field: into.field };
    return into.source === undefined ? { space: into.space, ...field } : { space: "", source: into.source, ...field };
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
        // The element proposes a space's keys, or a column naming the rows on both sides.
        const picks = { ...NO_PICKS, from: match.from, into: suggestedInto(match.into) };
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
        const to = other === undefined ? {} : { to: { field: other.from.field, into: suggestedInto(other.into) } };
        return { id, picks: { ...picks, ...to }, guess: edges ? "edge" : "node", suggested: true };
    } catch {
        return blank;
    }
}
