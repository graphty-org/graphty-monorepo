/**
 * @file What a set of matches can make (design design/data/multiple-data-sources-design.md, section
 * 5.2), behind the `source-steps` experiment: each outcome as a code, the acts that make it and the
 * facts an application words it by. Nothing is built or changed here: an outcome's acts go to the
 * draft's own verbs. Pure, and free of Babylon.js, Lit and the DOM.
 */

import type { SourceConnectOptions, SourceJoinAct, SourceLinkOptions, SourceMergeOptions } from "../../types";
import { freeSpace, type JoinInto, rowSpaceOf } from "./acts";
import { type MatchOptions, nodeSpace, ownSpace } from "./build";
import {
    type Copies,
    overlapQuestion,
    rowSources,
    type SourceSteps,
    stepAct,
    stepExtract,
    stepLink,
    type StepsSource,
} from "./project";
import {
    baseOf,
    canBeInto,
    canBeRows,
    countsOf,
    edgePairs,
    fieldOf,
    type FoundField,
    foundMatch,
    indexOf,
    intoOf,
    type JoinMatch,
    nodesNamed,
    pairKey,
    refOfField,
    rowsSide,
    type Side,
    type SideData,
    sideOf,
    type SideRef,
} from "./sides";
import type { Step } from "./types";

/** What a join makes. */
type OutcomeCode = "fields" | "fold" | "link" | "edge" | "middle" | "shared" | "shared-nodes" | "new-nodes";

/** An option an outcome's act takes, by its name there. */
type OutcomeOption =
    | Exclude<keyof SourceMergeOptions, "from" | "into" | "except" | "ignoreCase" | "ignoreSpaces">
    | Exclude<keyof SourceConnectOptions, "from" | "into" | "to" | "ignoreCase" | "ignoreSpaces">
    | Extract<keyof SourceLinkOptions, "maxShared" | "minShared" | "type">
    | "split"
    | "columns";

/** One outcome. */
export interface JoinOutcome {
    readonly code: OutcomeCode;
    readonly acts: readonly SourceJoinAct[];
    /** Whose rows the acts read, one per source. */
    readonly rows: readonly Side[];
    /** Where they land. */
    readonly onto: readonly Side[];
    /** The fields that say which of several such outcomes it is. */
    readonly fields: readonly string[];
    /** The places of the matches it uses. */
    readonly uses: readonly number[];
    /** Whether the rows are nodes of their own already. */
    readonly ownNodes: boolean;
    /** Edges already joining the nodes its edges would join. */
    readonly edgesBetween: number;
    readonly takes: readonly OutcomeOption[];
    readonly current?: true;
}

/** What {@link joinOutcomes} reads. */
export interface OutcomesQuery extends MatchOptions {
    readonly matches?: readonly JoinMatch[];
    readonly step?: number;
}

/** The matches and what they can make. */
export interface JoinOutcomes {
    readonly matches: readonly JoinMatch[];
    readonly outcomes: readonly JoinOutcome[];
}

const TAKES: Readonly<Record<OutcomeCode, readonly OutcomeOption[]>> = {
    fields: ["unmatchedFrom", "repeated", "clash", "fanOut", "aggregate"],
    fold: ["unmatchedFrom", "repeated", "clash", "fanOut", "aggregate"],
    link: ["unmatched", "unlinked", "fanOut", "direction", "edgeType"],
    middle: ["unmatched", "unlinked", "fanOut", "direction", "edgeType"],
    edge: ["perPair", "unmatched", "existing", "fanOut", "direction", "edgeType"],
    shared: ["maxShared", "minShared", "edgeType"],
    "shared-nodes": ["maxShared", "edgeType", "type"],
    "new-nodes": ["split", "type", "columns", "edgeType"],
};

/** One match, sorted by what it can be. */
type Line =
    /** A field matched with itself. */
    | { readonly kind: "self"; readonly at: number; readonly a: FoundField }
    /** Two fields of one side. */
    | { readonly kind: "own"; readonly at: number; readonly a: FoundField; readonly b: FoundField }
    /** Fields of two sides. */
    | { readonly kind: "cross"; readonly at: number; readonly a: FoundField; readonly b: FoundField }
    /** A field whose values become nodes. */
    | { readonly kind: "new"; readonly at: number; readonly a: FoundField };

type Cross = Extract<Line, { kind: "cross" }>;

/** A cross line read one way: rows, and the field naming nodes. */
interface Way {
    readonly at: number;
    readonly rows: FoundField;
    readonly into: FoundField;
}

/** What every outcome is worked out from. */
interface Ctx {
    readonly value: SourceSteps;
    readonly copies: Copies;
    readonly o: MatchOptions;
    /** The choices every act carries. */
    readonly choices: { readonly ignoreCase?: boolean; readonly ignoreSpaces?: boolean };
}

const same = (x: SideData, y: SideData): boolean => x.source === y.source && x.space === y.space;

/**
 * What a set of matches can make, and, for a step, what it makes now.
 * @param value - The sources and steps.
 * @param copies - The rows as read.
 * @param q - The matches, how they compare and the step they are.
 * @returns The matches and outcomes.
 * @throws A `GraphtyError` with `E_LOAD_UNKNOWN` for an unknown source, or `E_BAD_COMMAND` for a
 *   field its side does not hold (reason `no-column`).
 */
export function joinOutcomes(value: SourceSteps, copies: Copies, q: OutcomesQuery): JoinOutcomes {
    const step = q.step === undefined ? undefined : (value.steps[q.step] as Step | undefined);
    const base = baseOf(value, q.step);
    const back = step === undefined || q.step === undefined ? null : stepJoin(value, copies, base, q.step);
    const matches = q.matches ?? back?.matches ?? [];
    const ignoreCase = q.ignoreCase ?? back?.ignoreCase ?? false;
    const ignoreSpaces = q.ignoreSpaces ?? back?.ignoreSpaces ?? false;
    const o = { ignoreCase, ignoreSpaces };
    const ctx: Ctx = { value: base, copies, o, choices: choicesOf(o) };
    const lines = linesOf(ctx, matches, q.matches === undefined);
    const outcomes = lines.length === 0 ? [] : outcomesOf(ctx, lines);
    return {
        matches: Object.freeze(matches),
        outcomes: Object.freeze(withCurrent(outcomes, back, q.matches === undefined)),
    };
}

/**
 * Matches sorted by what each can be.
 * @param ctx - The draft.
 * @param matches - The matches.
 * @param own - Whether they are a step's own, which an earlier step's removal may have left without a field.
 * @returns The lines; none for a step's own when a field of them is gone.
 */
function linesOf(ctx: Ctx, matches: readonly JoinMatch[], own: boolean): readonly Line[] {
    try {
        return matches.map((match, at) => lineOf(ctx, match, at));
    } catch (error) {
        if (own) {
            return [];
        }
        throw error;
    }
}

/**
 * The comparison choices an act carries: the ones that are on.
 * @param o - The choices.
 * @returns Them.
 */
function choicesOf(o: MatchOptions): Ctx["choices"] {
    return {
        ...(o.ignoreCase === true ? { ignoreCase: true } : {}),
        ...(o.ignoreSpaces === true ? { ignoreSpaces: true } : {}),
    };
}

/**
 * A match sorted by what it can be.
 * @param ctx - The draft.
 * @param match - The match.
 * @param at - Its place.
 * @returns The line.
 */
function lineOf(ctx: Ctx, match: JoinMatch, at: number): Line {
    const { a, b } = foundMatch(ctx.value, ctx.copies, match);
    if (b === null) {
        return { kind: "new", at, a };
    }
    if (!same(a.data, b.data)) {
        return { kind: "cross", at, a, b };
    }
    return a.name === b.name ? { kind: "self", at, a } : { kind: "own", at, a, b };
}

/**
 * The outcomes of some lines: those of the whole set, else those of each line by itself, so a set no
 * one join reads still says what its parts make.
 * @param ctx - The draft.
 * @param lines - The lines.
 * @returns The outcomes.
 */
function outcomesOf(ctx: Ctx, lines: readonly Line[]): JoinOutcome[] {
    const whole = wholeOutcomes(ctx, lines);
    return whole.length > 0 || lines.length === 1 ? whole : lines.flatMap((line) => wholeOutcomes(ctx, [line]));
}

/**
 * The outcomes using every line.
 * @param ctx - The draft.
 * @param lines - The lines.
 * @returns The outcomes; none for a set no one join reads.
 */
function wholeOutcomes(ctx: Ctx, lines: readonly Line[]): JoinOutcome[] {
    const self = lines.flatMap((line) => (line.kind === "self" ? [line] : []));
    const cross = lines.flatMap((line) => (line.kind === "cross" ? [line] : []));
    const made = lines.flatMap((line) => (line.kind === "new" ? [line] : []));
    const own = lines.flatMap((line) => (line.kind === "own" ? [line] : []));
    const at = `${String(cross.length)}${String(made.length)}${String(own.length)}`;
    if (self.length > 0) {
        if (!self.every((line) => same(line.a.data, self[0].a.data))) {
            return [];
        }
        if (at === "000") {
            return sharedOf(ctx, self);
        }
        return at === "100" ? sharedByRows(ctx, cross[0], self) : [];
    }
    switch (at) {
        case "100":
            return [...fieldsOf(ctx, cross[0]), ...linkOf(ctx, cross[0])];
        case "200":
            return two(ctx, cross[0], cross[1]);
        case "110":
            return edgeToNew(ctx, cross[0], made[0]);
        case "010":
            return newNodes(ctx, made[0]);
        case "001":
            return linkOwn(ctx, own[0]);
        default:
            return [];
    }
}

/**
 * The ways a line can be read whose rows match at least once.
 * @param ctx - The draft.
 * @param line - The line.
 * @param line.at - Its place.
 * @param line.a - One field.
 * @param line.b - The other.
 * @returns The ways, side a's rows first.
 */
function waysOf(ctx: Ctx, { at, a, b }: Cross): Way[] {
    return [
        { at, rows: a, into: b },
        { at, rows: b, into: a },
    ].filter((way) => canBeRows(way.rows) && canBeInto(ctx.value, way.into) && matches(ctx, way));
}

/**
 * The way a line's rows are read from one side, if they match.
 * @param ctx - The draft.
 * @param line - The line.
 * @param rows - The side.
 * @returns The way, or none.
 */
function wayFrom(ctx: Ctx, line: Cross, rows: SideData): Way | undefined {
    return waysOf(ctx, line).find((way) => same(way.rows.data, rows));
}

/**
 * Whether a way matches any row.
 * @param ctx - The draft.
 * @param way - The way.
 * @returns True when it does.
 */
function matches(ctx: Ctx, way: Way): boolean {
    return countsOf(ctx.value, ctx.copies, way.rows, way.into, ctx.o).matchedRows > 0;
}

/**
 * An outcome, with the facts read from its rows.
 * @param rows - Whose rows it reads.
 * @param onto - Where they land.
 * @param rest - The rest of it.
 * @returns The outcome.
 */
function outcome(
    rows: readonly SideData[],
    onto: readonly SideData[],
    rest: Pick<JoinOutcome, "code" | "acts" | "uses"> & Partial<Pick<JoinOutcome, "fields" | "edgesBetween" | "takes">>,
): JoinOutcome {
    return Object.freeze({
        fields: [],
        edgesBetween: 0,
        takes: TAKES[rest.code],
        ...rest,
        rows: Object.freeze(rows.map((each) => each.side)),
        onto: Object.freeze(onto.map((each) => each.side)),
        ownNodes: rows[0].ownNodes,
    });
}

const fieldRef = (found: FoundField): { source: string; field: string } => ({
    source: found.data.source ?? "",
    field: found.name,
});

/**
 * A merge of one way.
 * @param ctx - The draft.
 * @param way - The way.
 * @param more - More of its options.
 * @returns The act.
 */
function mergeAct(ctx: Ctx, way: Way, more: Partial<SourceMergeOptions> = {}): SourceJoinAct {
    return {
        act: "merge",
        options: { from: fieldRef(way.rows), into: intoOf(way.into), ...ctx.choices, ...more },
    };
}

/**
 * Whether a way's columns have one place to go: no value is on two rows, or none names two nodes.
 * @param ctx - The draft.
 * @param way - The way.
 * @returns True when they do.
 */
function fits(ctx: Ctx, way: Way): boolean {
    return (
        !indexOf(ctx.value, ctx.copies, way.rows, ctx.o).rowsRepeat ||
        !indexOf(ctx.value, ctx.copies, way.into, ctx.o).nodesRepeat
    );
}

/**
 * The fields of one side onto the nodes of the other: from rows with no nodes of their own, or, where
 * the nodes they name are each one, by folding their nodes in. A waiting side's one row per node is
 * never folded into by the nodes the graph holds: it would take them all for a few matches.
 * @param ctx - The draft.
 * @param line - The line.
 * @returns The outcomes.
 */
function fieldsOf(ctx: Ctx, line: Cross): JoinOutcome[] {
    const { value, copies, o } = ctx;
    return waysOf(ctx, line).flatMap((way) => {
        const { rows, into } = way;
        const uses = [way.at];
        const acts = [mergeAct(ctx, way)];
        if (!rows.data.ownNodes) {
            return fits(ctx, way) ? [outcome([rows.data], [into.data], { code: "fields", acts, uses })] : [];
        }
        const one = !indexOf(value, copies, into, o).nodesRepeat;
        const held = into.data.ownNodes || indexOf(value, copies, rows, o).rowsRepeat;
        return one && held ? [outcome([rows.data], [into.data], { code: "fold", acts, uses })] : [];
    });
}

/**
 * Whether a source's rows would be kept as nodes in a space they connect to.
 * @param rows - The rows.
 * @param value - The value.
 * @param ends - The fields they connect to.
 * @returns True when they would.
 */
function landsIn(rows: SideData, value: SourceSteps, ends: readonly FoundField[]): boolean {
    if (rows.table === "edges" || !rows.staged || rows.source === undefined) {
        return false;
    }
    try {
        rowSpaceOf(
            value.sources[rows.source],
            ends.map((end) => end.data.space),
        );
        return false;
    } catch {
        return true;
    }
}

/**
 * Each row linked to what it names.
 * @param ctx - The draft.
 * @param line - The line.
 * @returns The outcome, if it can be made.
 */
function linkOf(ctx: Ctx, line: Cross): JoinOutcome[] {
    const at = rowsSide(ctx.value, ctx.copies, line, ctx.o);
    const way = at === null ? undefined : wayFrom(ctx, line, line[at].data);
    if (way === undefined || landsIn(way.rows.data, ctx.value, [way.into])) {
        return [];
    }
    return [outcome([way.rows.data], [way.into.data], { code: "link", acts: [connectAct(ctx, way)], uses: [way.at] })];
}

/**
 * A connect of one way.
 * @param ctx - The draft.
 * @param way - The way.
 * @param to - The other end.
 * @returns The act.
 */
function connectAct(ctx: Ctx, way: Way, to?: SourceConnectOptions["to"]): SourceJoinAct {
    return {
        act: "connect",
        options: {
            from: fieldRef(way.rows),
            into: intoOf(way.into),
            ...(to === undefined ? {} : { to }),
            ...ctx.choices,
        },
    };
}

/**
 * Two fields of one side: an edge from each row to the nodes of its own side its field names.
 * @param ctx - The draft.
 * @param line - The line.
 * @returns The outcome, if it can be made.
 */
function linkOwn(ctx: Ctx, line: Extract<Line, { kind: "own" }>): JoinOutcome[] {
    // the fields as the rows hold them, whichever was picked first: the first names, the second is named
    const { data } = line.a;
    const order = [...data.own, ...data.joined.keys()];
    const [first, second] = [line.a, line.b].sort((x, y) => order.indexOf(x.name) - order.indexOf(y.name));
    // a column an earlier step brought is in no row: it can only be named
    const [rows, into] = canBeRows(first) && canBeInto(ctx.value, second) ? [first, second] : [second, first];
    const way = { at: line.at, rows, into };
    if (!canBeRows(rows) || !canBeInto(ctx.value, into) || !matches(ctx, way)) {
        return [];
    }
    return [
        outcome([data], [data], {
            code: "link",
            acts: [connectAct(ctx, way)],
            uses: [line.at],
            fields: [rows.name, into.name],
        }),
    ];
}

/**
 * Two matches between different sides or fields.
 * @param ctx - The draft.
 * @param x - One.
 * @param y - The other.
 * @returns The outcomes.
 */
function two(ctx: Ctx, x: Cross, y: Cross): JoinOutcome[] {
    const out: JoinOutcome[] = [];
    for (const rows of [x.a, x.b]) {
        const other = [y.a, y.b].find((each) => same(each.data, rows.data));
        if (other !== undefined) {
            out.push(...edges(ctx, x, y, rows.data));
        }
    }
    out.push(...either(ctx, x, y), ...chain(ctx, x, y));
    return out;
}

/**
 * Each row of one side an edge between the two nodes it names, or a node linked to both.
 * @param ctx - The draft.
 * @param x - One line.
 * @param y - The other.
 * @param rows - The side.
 * @returns The outcomes.
 */
function edges(ctx: Ctx, x: Cross, y: Cross, rows: SideData): JoinOutcome[] {
    const ways = [wayFrom(ctx, x, rows), wayFrom(ctx, y, rows)];
    const [first, second] = ways;
    if (first === undefined || second === undefined) {
        return [];
    }
    const oneSide = same(first.into.data, second.into.data);
    if (oneSide && (first.rows.name === second.rows.name || first.into.name !== second.into.name)) {
        return [];
    }
    // the columns' order says which way the edges run, never which match was made first
    const order = (way: Way): number => rows.own.indexOf(way.rows.name);
    const [from, to] = order(second) < order(first) ? [second, first] : [first, second];
    const uses = [x.at, y.at];
    const fields = oneSide ? [from.rows.name, to.rows.name] : [];
    const onto = [from.into.data, to.into.data];
    const end = { field: to.rows.name, into: intoOf(to.into) };
    const made = outcome([rows], onto, {
        code: "edge",
        acts: [connectAct(ctx, from, end)],
        uses,
        fields,
        edgesBetween: edgesBetween(ctx, from, to),
    });
    if (landsIn(rows, ctx.value, [from.into, to.into])) {
        return [made];
    }
    return [
        made,
        outcome([rows], onto, {
            code: "middle",
            acts: [connectAct(ctx, from, { ...end, keepRow: true })],
            uses,
            fields,
        }),
    ];
}

/**
 * How many edges the graph holds between the nodes the rows name.
 * @param ctx - The draft.
 * @param from - One end.
 * @param to - The other.
 * @returns How many, either way round, each once.
 */
function edgesBetween(ctx: Ctx, from: Way, to: Way): number {
    const held = edgePairs(ctx.value, ctx.copies);
    if (held.size === 0) {
        return 0;
    }
    const at = nodesNamed(ctx.value, ctx.copies, from.into, ctx.o);
    const by = nodesNamed(ctx.value, ctx.copies, to.into, ctx.o);
    const { data } = from.rows;
    const met = new Set<string>();
    for (let i = 0; i < data.length; i++) {
        const others = by(data.cell(i, to.rows.name));
        for (const a of others.length === 0 ? [] : at(data.cell(i, from.rows.name))) {
            for (const b of others) {
                const pair = pairKey(a, b);
                if (held.has(pair)) {
                    met.add(pair);
                }
            }
        }
    }
    return [...met].reduce((n, pair) => n + (held.get(pair) ?? 0), 0);
}

/**
 * The fields of one side onto the nodes of the other by one field or the other: two merges.
 * @param ctx - The draft.
 * @param x - One line.
 * @param y - The other.
 * @returns The outcomes, one per side that can give its fields.
 */
function either(ctx: Ctx, x: Cross, y: Cross): JoinOutcome[] {
    const sides = [x.a, x.b].map((each) => each.data);
    return sides.flatMap((rows) => {
        const first = wayFrom(ctx, x, rows);
        const second = wayFrom(ctx, y, rows);
        if (first === undefined || second === undefined || rows.ownNodes) {
            return [];
        }
        const { data } = first.into;
        const fit = same(data, second.into.data) && first.into.name !== second.into.name;
        if (!fit || !fits(ctx, first) || !fits(ctx, second)) {
            return [];
        }
        return [
            outcome([rows], [data], {
                code: "fields",
                acts: [mergeAct(ctx, first), mergeAct(ctx, second)],
                uses: [x.at, y.at],
                fields: [first.into.name, second.into.name],
            }),
        ];
    });
}

/**
 * The fields of two sides onto a third: the one between them first, carrying what the other is
 * matched by.
 * @param ctx - The draft.
 * @param x - One line.
 * @param y - The other.
 * @returns The outcomes, one per end that can take them.
 */
function chain(ctx: Ctx, x: Cross, y: Cross): JoinOutcome[] {
    return [
        { onto: x, last: y },
        { onto: y, last: x },
    ].flatMap(({ onto, last: other }) => {
        const shared = [onto.a, onto.b].find((each) =>
            [other.a, other.b].some((found) => same(found.data, each.data)),
        )?.data;
        if (shared === undefined || shared.ownNodes) {
            return [];
        }
        const first = wayFrom(ctx, onto, shared);
        const last = waysOf(ctx, other).find((way) => same(way.into.data, shared));
        if (first === undefined || last === undefined || last.rows.data.ownNodes || last.into.joined) {
            return [];
        }
        const target = first.into.data;
        if (same(target, last.rows.data) || !fits(ctx, first) || !fits(ctx, last)) {
            return [];
        }
        const by = last.into.name;
        // matched on the very field the first merge matches by, the target's own field names it
        const onKey = by === first.rows.name;
        if (!onKey && (target.own.includes(by) || target.joined.has(by))) {
            return [];
        }
        const into: JoinInto = onKey ? intoOf(first.into) : { space: landing(ctx, target), field: by };
        return [
            outcome([shared, last.rows.data], [target], {
                code: "fields",
                acts: [
                    mergeAct(ctx, first, onKey ? {} : { aggregate: { [by]: "list" } }),
                    { act: "merge", options: { from: fieldRef(last.rows), into, ...ctx.choices } },
                ],
                uses: [onto.at, other.at],
            }),
        ];
    });
}

/**
 * The space a side's nodes are in once a join adds it.
 * @param ctx - The draft.
 * @param side - The side.
 * @returns The space.
 */
function landing(ctx: Ctx, side: SideData): string {
    if (!side.staged || side.source === undefined) {
        return side.space;
    }
    const src: StepsSource = ctx.value.sources[side.source];
    return overlapQuestion(ctx.value, src, ctx.copies) === null ? nodeSpace(src) : ownSpace(src.id);
}

/**
 * Fields matched with themselves: their nodes linked where they share a value, or a node per value.
 * @param ctx - The draft.
 * @param lines - The lines, of one side.
 * @returns The outcomes.
 */
function sharedOf(ctx: Ctx, lines: readonly Extract<Line, { kind: "self" }>[]): JoinOutcome[] {
    const { data } = lines[0].a;
    if (!lines.some(({ a }) => indexOf(ctx.value, ctx.copies, a, ctx.o).nodesRepeat)) {
        return [];
    }
    // a space's new edges are some source's
    const source = data.source ?? data.built(0)?.loads[0];
    if (source === undefined) {
        return [];
    }
    const held = data.source === undefined || lines.some(({ a }) => a.joined);
    return links(ctx, data, lines, { source, ...(held ? { nodes: data.space } : {}) });
}

/**
 * The two ways nodes sharing values are linked.
 * @param ctx - The draft.
 * @param holders - Whose nodes are linked.
 * @param lines - The fields matched with themselves.
 * @param options - Where the values are.
 * @param uses - The lines used besides.
 * @returns The outcomes.
 */
function links(
    ctx: Ctx,
    holders: SideData,
    lines: readonly Extract<Line, { kind: "self" }>[],
    options: Omit<SourceLinkOptions, "columns">,
    uses: readonly number[] = [],
): JoinOutcome[] {
    const columns = lines.map(({ a }) => a.name);
    const act = (more: Partial<SourceLinkOptions>): SourceJoinAct => ({
        act: "link",
        options: { ...options, columns, ...ctx.choices, ...more },
    });
    const rest = { uses: [...uses, ...lines.map(({ at }) => at)], fields: columns };
    const { data } = lines[0].a;
    return [
        outcome([data], [holders], { code: "shared", acts: [act({})], ...rest }),
        outcome([data], [holders], { code: "shared-nodes", acts: [act({ as: "nodes" })], ...rest }),
    ];
}

/**
 * Fields matched with themselves in rows whose other field names the nodes holding them.
 * @param ctx - The draft.
 * @param line - The match naming the nodes.
 * @param self - The fields matched with themselves.
 * @returns The outcomes.
 */
function sharedByRows(ctx: Ctx, line: Cross, self: readonly Extract<Line, { kind: "self" }>[]): JoinOutcome[] {
    const { data } = self[0].a;
    const way = wayFrom(ctx, line, data);
    const repeats = self.some(({ a }) => indexOf(ctx.value, ctx.copies, a, ctx.o).rowsRepeat);
    if (way === undefined || !repeats || self.some(({ a }) => a.joined)) {
        return [];
    }
    const options = { source: way.rows.data.source ?? "", field: way.rows.name, into: intoOf(way.into) };
    return links(ctx, way.into.data, self, options, [line.at]);
}

/**
 * A field whose values become nodes.
 * @param ctx - The draft.
 * @param line - The line.
 * @returns The outcome, if the field is in its rows.
 */
function newNodes(ctx: Ctx, line: Extract<Line, { kind: "new" }>): JoinOutcome[] {
    const { data, name } = line.a;
    if (!canBeRows(line.a)) {
        return [];
    }
    const both = data.table === "nodes" && ctx.value.sources[data.source ?? ""].mapping.edges !== undefined;
    const act: SourceJoinAct = {
        act: "extract",
        source: data.source ?? "",
        options: { column: name, ...(both ? { from: "row" as const } : {}) },
    };
    return [outcome([data], [data], { code: "new-nodes", acts: [act], uses: [line.at], fields: [name] })];
}

/**
 * Each row an edge, or a node, between the node it names and one made of its other field's value.
 * @param ctx - The draft.
 * @param line - The match naming the first end.
 * @param made - The field whose values become nodes.
 * @returns The outcomes.
 */
function edgeToNew(ctx: Ctx, line: Cross, made: Extract<Line, { kind: "new" }>): JoinOutcome[] {
    const { data, name } = made.a;
    const way = wayFrom(ctx, line, data);
    if (way === undefined || !canBeRows(made.a)) {
        return [];
    }
    const end = {
        field: name,
        into: { space: freeSpace(ctx.value, name) },
        unmatched: "add" as const,
        type: name,
    };
    const rest = { uses: [line.at, made.at], fields: [name] };
    const takes = (code: "edge" | "middle"): readonly OutcomeOption[] => [...TAKES[code], "type"];
    const edge = outcome([data], [way.into.data], {
        code: "edge",
        acts: [connectAct(ctx, way, end)],
        takes: takes("edge"),
        ...rest,
    });
    if (landsIn(data, ctx.value, [way.into])) {
        return [edge];
    }
    const acts = [connectAct(ctx, way, { ...end, keepRow: true })];
    return [edge, outcome([data], [way.into.data], { code: "middle", acts, takes: takes("middle"), ...rest })];
}

// ---------------------------------------------------------------- a step read back

/** A join step read back as its matches and outcome. */
interface StepJoin {
    readonly matches: readonly JoinMatch[];
    readonly outcome: JoinOutcome;
    readonly ignoreCase: boolean;
    readonly ignoreSpaces: boolean;
}

/**
 * Node 1 of a step as a card names it: the source whose rows its nodes are, when there is one, else its space.
 * @param value - The value the step was made on.
 * @param whole - The value the step is in.
 * @param copies - The rows as read.
 * @param into - Node 1, as the step reads back.
 * @returns The field, and its side as read.
 */
function intoRef(
    value: SourceSteps,
    whole: SourceSteps,
    copies: Copies,
    into: JoinInto,
): { readonly ref: SideRef; readonly data: SideData } {
    if (into.source !== undefined) {
        return {
            ref: { source: into.source, field: into.field },
            data: sideOf(value, copies, { source: into.source }),
        };
    }
    const { space, field } = into;
    const owners = rowSources(whole, false).get(space) ?? [];
    for (const source of owners.length === 1 ? owners : []) {
        try {
            const found = fieldOf(value, copies, { source, ...(field === undefined ? {} : { field }) });
            return { ref: refOfField(found), data: found.data };
        } catch {
            // its rows are numbered, or no longer hold the column: the space names them
        }
    }
    const data = sideOf(value, copies, { space });
    return { ref: { space, field: field ?? data.key ?? undefined }, data };
}

/** What reading a step back needs. */
interface Back {
    readonly step: Step;
    /** The rows' side. */
    readonly rows: SideData;
    readonly into: (each: JoinInto) => ReturnType<typeof intoRef>;
    readonly made: (
        matches: readonly JoinMatch[],
        onto: readonly SideData[],
        rest: Pick<JoinOutcome, "code" | "acts"> & Partial<Pick<JoinOutcome, "fields" | "takes">>,
        rows?: SideData,
    ) => StepJoin;
}

/**
 * A join step read back as its matches and its outcome, whatever its counts.
 * @param value - The value the step is in.
 * @param copies - The rows as read.
 * @param base - The value the step was made on.
 * @param index - The step's place.
 * @returns It, or null for a step no join makes.
 */
function stepJoin(value: SourceSteps, copies: Copies, base: SourceSteps, index: number): StepJoin | null {
    const step = value.steps[index];
    const upTo = { ...value, steps: value.steps.slice(0, index) };
    const rows = sideOf(base, copies, { source: step.source });
    const back: Back = {
        step,
        rows,
        into: (each) => intoRef(base, upTo, copies, each),
        made: (matches, onto, rest, of = rows) => ({
            matches,
            outcome: outcome([of], onto, { ...rest, uses: matches.map((_, i) => i) }),
            ignoreCase: step.ignoreCase === true,
            ignoreSpaces: step.ignoreSpaces === true,
        }),
    };
    const act = stepAct(value, step);
    if (act !== null) {
        return act.act === "merge" ? mergeBack(back, act) : connectBack(back, act);
    }
    const link = stepLink(value, step);
    if (link !== null) {
        return linkBack(back, link);
    }
    const extract = stepExtract(value, index);
    if (extract === null) {
        return null;
    }
    const { source } = step;
    return back.made([{ a: { source, field: extract.column }, b: { new: true } }], [rows], {
        code: "new-nodes",
        acts: [{ act: "extract", source, options: extract }],
        fields: [extract.column],
    });
}

/**
 * A merge read back.
 * @param back - The step.
 * @param act - Its act.
 * @returns Its matches and outcome.
 */
function mergeBack(back: Back, act: ReadAct): StepJoin {
    const one = back.into(act.into);
    return back.made([{ a: act.from, b: one.ref }], [one.data], {
        code: back.rows.ownNodes ? "fold" : "fields",
        acts: [{ act: "merge", options: mergeOptions(act) }],
    });
}

/**
 * A connect read back.
 * @param back - The step.
 * @param act - Its act.
 * @returns Its matches and outcome.
 */
function connectBack(back: Back, act: ReadAct): StepJoin {
    const { source } = back.step;
    const one = back.into(act.into);
    const first: JoinMatch = { a: act.from, b: one.ref };
    const acts: SourceJoinAct[] = [{ act: "connect", options: connectOptions(act) }];
    const { to } = act;
    if (to === undefined) {
        const fields = one.data.source === source ? [act.from.field, one.ref.field ?? ""] : [];
        return back.made([first], [one.data], { code: "link", acts, fields });
    }
    const code = to.keepRow === true ? "middle" : "edge";
    const a: SideRef = { source, field: to.field };
    if (to.unmatched === "add") {
        const takes: readonly OutcomeOption[] = [...TAKES[code], "type"];
        return back.made([first, { a, b: { new: true } }], [one.data], { code, acts, takes, fields: [to.field] });
    }
    const other = back.into(to.into);
    const fields = same(one.data, other.data) ? [act.from.field, to.field] : [];
    return back.made([first, { a, b: other.ref }], [one.data, other.data], { code, acts, fields });
}

/**
 * A link read back: its columns as fields matched with themselves.
 * @param back - The step.
 * @param link - Its options.
 * @returns Its matches and outcome.
 */
function linkBack(back: Back, link: SourceLinkOptions): StepJoin {
    const own = link.nodes === undefined ? back.rows : back.into({ space: link.nodes }).data;
    const self = link.columns.map((field): JoinMatch => {
        const ref: SideRef = { ...own.side, field };
        return { a: ref, b: ref };
    });
    const rest = {
        code: link.as === "nodes" ? ("shared-nodes" as const) : ("shared" as const),
        acts: [{ act: "link" as const, options: link }],
        fields: link.columns,
    };
    if (link.field === undefined || link.into === undefined) {
        return back.made(self, [own], rest, own);
    }
    const one = back.into(link.into);
    return back.made([{ a: { source: link.source, field: link.field }, b: one.ref }, ...self], [one.data], rest);
}

type ReadAct = NonNullable<ReturnType<typeof stepAct>>;

/**
 * A merge step's act as `merge` takes it.
 * @param act - The act read back.
 * @returns Its options.
 */
function mergeOptions(act: ReadAct): SourceMergeOptions {
    const { from, into, repeated, aggregate, unmatchedFrom, fanOut, ignoreCase, ignoreSpaces } = act;
    return {
        from,
        into,
        ignoreCase,
        ignoreSpaces,
        ...(unmatchedFrom === undefined ? {} : { unmatchedFrom }),
        ...(fanOut === undefined ? {} : { fanOut }),
        ...(repeated === null || repeated === "both" ? {} : { repeated }),
        ...(aggregate === null ? {} : { aggregate }),
    };
}

/**
 * A connect step's act as `connect` takes it.
 * @param act - The act read back.
 * @returns Its options.
 */
function connectOptions(act: ReadAct): SourceConnectOptions {
    const { act: _act, repeated: _repeated, aggregate: _aggregate, unmatchedFrom: _from, ...options } = act;
    return options;
}

/**
 * The outcomes with the one a step makes marked, or added when its matches still are the step's.
 * @param outcomes - The outcomes.
 * @param back - The step read back, if there is one.
 * @param own - Whether the matches are the step's own.
 * @returns The outcomes.
 */
function withCurrent(outcomes: readonly JoinOutcome[], back: StepJoin | null, own: boolean): JoinOutcome[] {
    if (back === null) {
        return [...outcomes];
    }
    const now = back.outcome;
    const sides = (all: readonly Side[]): string =>
        JSON.stringify([...new Set(all.map((s) => s.source ?? s.space))].sort((a, b) => a.localeCompare(b)));
    const is = (each: JoinOutcome): boolean =>
        each.code === now.code &&
        each.acts.length === 1 &&
        sides(each.rows) === sides(now.rows) &&
        sides(each.onto) === sides(now.onto);
    const at = outcomes.findIndex((each) => is(each));
    if (at === -1) {
        return own ? [...outcomes, Object.freeze({ ...now, current: true as const })] : [...outcomes];
    }
    return outcomes.map((each, i) => (i === at ? Object.freeze({ ...each, current: true as const }) : each));
}
