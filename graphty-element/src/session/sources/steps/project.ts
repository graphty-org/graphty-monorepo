/**
 * @file Sources and steps as project state (design design/data/multiple-data-sources-design.md,
 * sections 3, 9 and 10), behind the `source-steps` experiment.
 *
 * The `graph` slice keeps one value, {@link SourceSteps}: every source with its mapping and copy id,
 * the ordered steps, the type registry and the reader's operations. The rows as read are kept beside
 * it by copy id. A door turns a call into a {@link StepsEdit}; {@link applyEdit} gives the next
 * value, and {@link projectBuild} and {@link diffGraph} turn the build of each value into the
 * session's nodes and edges and the smallest change between them, so unchanged elements keep their
 * ids and a change costs what it touches in the graph. Pure: it reads only its arguments, so a
 * stage 2 draft can run it on a copy. Free of Babylon.js, Lit and the DOM.
 */

import type { EdgeId, NodeId } from "../../../catalog/types";
import { GraphtyError } from "../../../errors/GraphtyError";
import type { JoinRecord, SourceExtractOptions, SourceLinkOptions, SourceStepAct } from "../../types";
import { applyAct, extractOf, movedAfter, type StepsAct } from "./acts";
import { build, copyKey, isStaged, nodeSpace, ownSpace, resolveNode, rowNodeSpace, stepSources } from "./build";
import { RECORD_PATHS } from "./paths";
import { conflictReport, readableRecord, type StepsOutcome } from "./provenance";
import { applyRefreshEdit, editStates, missingColumns, type RefreshEdit, type RefreshIssue } from "./refresh";
import {
    type Aggregate,
    type BuildInput,
    type BuildResult,
    type BuiltEdge,
    type BuiltNode,
    type CellValue,
    type CopyTables,
    type EdgesStep,
    READER_SOURCE,
    READER_SPACE,
    type ReaderOp,
    type RowFateKind,
    type RowFilter,
    type Source,
    type Step,
    type StepStats,
    type TableName,
    type TypeEntry,
    type TypeRule,
    type Value,
} from "./types";

/** The graph value holding the {@link SourceSteps}. */
export const SOURCE_STEPS_VALUE = "sourceSteps";

/** The graph value holding every copy (rows as read) a source of {@link SOURCE_STEPS_VALUE} names. */
export const SOURCE_COPIES_VALUE = "sourceCopies";

/** The graph value mapping each built edge (`<load>\u0001<key>`) to the session edge id drawing it. */
export const SOURCE_EDGE_IDS_VALUE = "sourceEdgeIds";

/** How a source was obtained, as `data.sources()` lists it. */
export type StepsSourceKind = "file" | "url" | "server" | "sample" | "derived";

/** A key overlap a source met when it was added (5.5, 9.1). */
interface SpaceOverlap {
    readonly code: "W_SPACE_OVERLAP";
    readonly params: {
        readonly space: string;
        readonly count: number;
        readonly of: number;
        /** For an untyped source: the other source whose own space holds the same keys. */
        readonly other?: string;
    };
}

/** A source as the project keeps it: the build's {@link Source} and what `data.sources()` lists of it. */
export interface StepsSource extends Source {
    readonly kind: StepsSourceKind;
    /** Its name, as `data.sources()` lists it; null when it has none. */
    readonly label: string | null;
    /** The data source's name (`"csv"`, `"json"`, ...), as the load named it. */
    readonly type?: string;
    /** The data source's options, without inline text or a file. */
    readonly config?: Readonly<Record<string, unknown>>;
    /** The names of the tables it read. */
    readonly tables: readonly string[];
    /** What each of `tables` held. */
    readonly tableRows?: readonly TableName[];
    /** The token of what the session can read it from again. */
    readonly input?: string;
    /** Whether the caller named its space, so Add never asks the overlap question (5.5). */
    readonly spacePicked?: boolean;
    /** The node type it was staged or loaded with; written as its whole-source rule. */
    readonly stagedType?: string | null;
    /** The node types of its edge ends, written as end rules. */
    readonly endTypes?: { readonly source?: string; readonly target?: string };
    /** The key overlaps it met when it was added. */
    readonly issues?: readonly SpaceOverlap[];
    /** The direction its file declares, and the part of the file that said so. */
    readonly declared?: { readonly directed: boolean; readonly statedBy: string };
    /** For a table joined through today's join screen: the join as `data.joins()` lists it. */
    readonly join?: JoinRecord;
    /**
     * What reading it recorded, for `sourceTable(id).summary()`: the size in bytes, when it was
     * read (RFC 3339) and a CSV file's separator. Kept for the session only, never saved.
     */
    readonly read?: {
        readonly size?: number;
        readonly at?: string;
        readonly delimiter?: { readonly value: string; readonly detected: boolean };
    };
}

/** Sources and steps: what the graph is built from. */
export interface SourceSteps {
    /** Every source, in the order added. */
    readonly sources: Readonly<Record<string, StepsSource>>;
    readonly steps: readonly Step[];
    readonly types: readonly TypeEntry[];
    /** The reader source's operations, in the order made. */
    readonly reader: readonly ReaderOp[];
    /**
     * The graph's `data.knownFields.repeatedEdges` as of the last edit, which the build reduces
     * repeated edges by; absent keeps them. Session state, not saved: an edit sets it from the setting.
     */
    readonly repeatedEdges?: BuildInput["repeatedEdges"];
    /**
     * The build stamp, a ULID minted by each build that changed the graph, so a run made over one
     * build reads stale after a later one, even when a refresh brings the same rows back (8.6).
     */
    readonly build?: string;
}

/** The rows as read, by copy id. */
export type Copies = Readonly<Record<string, CopyTables>>;

/** No sources and no steps: the value before the first load. */
export const EMPTY_STEPS: SourceSteps = Object.freeze({
    sources: Object.freeze({}),
    steps: Object.freeze([]),
    types: Object.freeze([]),
    reader: Object.freeze([]),
});

/** One change a door makes to the {@link SourceSteps}. */
export type StepsEdit =
    /**
     * The whole value. A draft's commit names the value it started from as `draftBase`, and is refused
     * with `E_DRAFT_STALE` when the value it lands on is another.
     */
    | {
          readonly kind: "set";
          readonly value: SourceSteps;
          readonly draftBase?: { readonly value: SourceSteps; readonly draft: string };
      }
    /**
     * A source, staged or added with `join.add`; `replace` first takes out every source, step, type
     * and reader operation (a replacing load).
     */
    | {
          readonly kind: "add";
          readonly source: StepsSource;
          readonly replace?: boolean;
          readonly staged?: boolean;
          /** What a key overlap does: `"separate"` (the default) keeps the source's keys in its own space. */
          readonly overlap?: "separate" | "merge";
      }
    /** Reader operations, applied after every step in the order given. */
    | { readonly kind: "reader"; readonly ops: readonly ReaderOp[] }
    /** Take back one reader operation. */
    | { readonly kind: "remove-edit"; readonly id: string }
    /** Take out one source, every step that reads it and its type rules (section 8, removal). */
    | { readonly kind: "remove-source"; readonly id: string }
    /**
     * The whole value, read back from a project file, over the graph the file embeds: the graph
     * becomes the build, keeping every element the embedded graph already holds as built.
     */
    | { readonly kind: "restore"; readonly value: SourceSteps }
    /** A type entry, or more rules for one already declared. */
    | { readonly kind: "declare-type"; readonly entry: TypeEntry }
    /** An act: Merge, Make an edge, Extract, Move columns, Rename, a pick, or deleting a step. */
    | { readonly kind: "act"; readonly act: StepsAct }
    /** A refresh or replace of one source's copy, a reader edit settled, or a held step resolved (7.12). */
    | RefreshEdit;

// ---------------------------------------------------------------- ids

const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

/**
 * A ULID: 48 bits of the time and 80 random bits, in Crockford base 32.
 * @returns The 26 characters.
 */
export function mintUlid(): string {
    let time = Date.now();
    let head = "";
    for (let i = 0; i < 10; i++) {
        head = CROCKFORD[time % 32] + head;
        time = Math.floor(time / 32);
    }
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    return head + Array.from(bytes, (b) => CROCKFORD[b % 32]).join("");
}

/**
 * A new source id.
 * @returns `src_` and a ULID.
 */
export const mintSourceId = (): string => `src_${mintUlid()}`;

/**
 * A new copy id for rows that are not bytes as read (version 2, 4.1.2 rule 1).
 * @returns A ULID.
 */
export const mintCopyId = (): string => mintUlid();

/**
 * The copy id of a source's rows, and the key the session holds them under: `sha256:` and the
 * digest of the bytes as read for a file, URL or downloaded sample, under a key of its own since
 * two sources may read the same bytes; else a new ULID, which is its own key (4.1.2 rule 1).
 * @param kind - How the source was obtained.
 * @param digest - The lower-case hex SHA-256 of the bytes its rows were read from, when known.
 * @returns The origin, and the key its rows go under in the copies.
 */
export function copyOrigin(
    kind: StepsSourceKind,
    digest: string | undefined,
): { readonly origin: { readonly copy: string; readonly rows?: string }; readonly key: string } {
    if (digest === undefined || (kind !== "file" && kind !== "url" && kind !== "sample")) {
        const copy = mintCopyId();
        return { origin: { copy }, key: copy };
    }
    const rows = mintUlid();
    return { origin: { copy: `sha256:${digest}`, rows }, key: rows };
}

/**
 * A new reader operation id.
 * @returns `edit_` and a ULID.
 */
export const mintEditId = (): string => `edit_${mintUlid()}`;

/**
 * Refuse a space a caller may not name: `graph:` spaces are reserved (3.1).
 * @param space - The space, or undefined for none.
 * @throws A `GraphtyError` with `E_SPACE_RESERVED`.
 */
export function checkSpace(space: string | undefined): void {
    if (space?.startsWith("graph:") === true) {
        throw new GraphtyError({
            code: "E_SPACE_RESERVED",
            message: `The id space "${space}" is reserved.`,
            source: "data",
            details: { space },
        });
    }
}

// ---------------------------------------------------------------- builds

const builds = new WeakMap<SourceSteps, { readonly copies: Copies; readonly result: BuildResult }>();
const copyMaps = new WeakMap<Copies, ReadonlyMap<string, CopyTables>>();

/**
 * The copies as the build reads them.
 * @param copies - The copies by id.
 * @returns A map, the same one for the same object.
 */
export function copyMap(copies: Copies): ReadonlyMap<string, CopyTables> {
    let map = copyMaps.get(copies);
    if (map === undefined) {
        map = new Map(Object.entries(copies));
        copyMaps.set(copies, map);
    }
    return map;
}

/**
 * The build of a value, run once per value and copies.
 * @param value - The sources and steps.
 * @param copies - The rows as read.
 * @returns The working graph.
 */
export function buildOf(value: SourceSteps, copies: Copies): BuildResult {
    const held = builds.get(value);
    if (held?.copies === copies) {
        return held.result;
    }
    const result = build(value, copyMap(copies));
    builds.set(value, { copies, result });
    return result;
}

/**
 * The value with a new build stamp, sharing its build: the stamp changes no element.
 * @param value - The value, built over `copies`.
 * @param copies - Its copies.
 * @returns The stamped value.
 */
export function counted(value: SourceSteps, copies: Copies): SourceSteps {
    const next = { ...value, build: mintUlid() };
    builds.set(next, { copies, result: buildOf(value, copies) });
    return next;
}

// ---------------------------------------------------------------- edits

/**
 * Write a staged or added source's type rules: its whole-source rule and its end rules (5.1, 9.1).
 * @param types - The registry.
 * @param src - The source.
 * @returns The registry with the rules.
 */
export function withSourceRules(types: readonly TypeEntry[], src: StepsSource): readonly TypeEntry[] {
    const rules: [string, TypeRule][] = [];
    for (const [end, name] of Object.entries(src.endTypes ?? {}) as ["source" | "target", string | undefined][]) {
        if (name !== undefined) {
            rules.push([name, { source: src.id, end }]);
        }
    }
    if (src.stagedType !== undefined && src.stagedType !== null && src.mapping.nodes !== undefined) {
        rules.push([src.stagedType, { source: src.id }]);
    }
    let out = types;
    for (const [name, rule] of rules) {
        out = declared(out, { name, kind: "node", plainName: name, rules: [rule] });
    }
    return out;
}

/**
 * The registry with an entry declared: a new entry, or its rules added to the one of its name and kind.
 * @param types - The registry.
 * @param entry - The entry.
 * @returns The new registry.
 */
export function declared(types: readonly TypeEntry[], entry: TypeEntry): readonly TypeEntry[] {
    const at = types.findIndex((t) => t.name === entry.name && t.kind === entry.kind);
    if (at < 0) {
        return [...types, entry];
    }
    const held = types[at];
    const fresh = entry.rules.filter((r) => !held.rules.some((h) => JSON.stringify(h) === JSON.stringify(r)));
    return types.map((t, i) => (i === at ? { ...held, rules: [...held.rules, ...fresh] } : t));
}

/**
 * The node keys a source's node rows hold, as text.
 * @param src - The source.
 * @param copies - The rows as read.
 * @returns The distinct keys.
 */
function nodeKeys(src: StepsSource, copies: Copies): Set<string> {
    const key = src.mapping.nodes?.key;
    const rows = copies[copyKey(src)]?.nodes ?? [];
    const out = new Set<string>();
    if (key === undefined) {
        return out;
    }
    for (const row of rows) {
        const v = row[key];
        if (v !== undefined && v !== null && v !== "") {
            out.add(String(v));
        }
    }
    return out;
}

/**
 * Add a source with `join.add`, asking the key-overlap question (5.5): keys meeting nodes another
 * source's node rows built (or the reader added) in its space are reported, and kept in its own
 * space unless `overlap` is `"merge"`. An untyped source's keys equal to another untyped source's
 * are reported too (9.1).
 * @param base - The value it is added to.
 * @param src - The source.
 * @param copies - The rows as read, the source's included.
 * @param overlap - What a key overlap does.
 * @returns The next value.
 */
export function addSource(
    base: SourceSteps,
    src: StepsSource,
    copies: Copies,
    overlap: "separate" | "merge" | undefined,
): SourceSteps {
    const met = proposedOverlap(base, src, copies);
    const added = met !== null && overlap !== "merge" ? keptSeparate(src, met.params.space) : src;
    const next: SourceSteps = {
        ...base,
        sources: { ...base.sources, [src.id]: added },
        types: withSourceRules(base.types, added),
        steps: [...base.steps, { op: "join.add", source: src.id }],
    };
    const issues = [met, ownSpaceOverlap(next, src.id, copies)].filter((each) => each !== null);
    if (issues.length === 0) {
        return next;
    }
    // The issues change nothing the build reads, so the value with them shares the build just made.
    const reported = { ...next, sources: { ...next.sources, [src.id]: { ...added, issues } } };
    builds.set(reported, { copies, result: buildOf(next, copies) });
    return reported;
}

/** The key-overlap question (5.5) a source asks when it is added: the keys it meets, and whose. */
export interface OverlapQuestion {
    /** The space it proposes. */
    readonly space: string;
    /** How many of its keys meet. */
    readonly count: number;
    /** How many distinct keys it holds. */
    readonly of: number;
    /** The sources whose node rows built the nodes it meets, `reader` for the reader's, in order added. */
    readonly sources: readonly string[];
}

/**
 * The key-overlap question (5.5): the source's keys that meet nodes another source's node rows
 * built, or the reader added, in the space it proposes. A space the caller named never asks.
 * @param base - The value it is added to.
 * @param src - The source.
 * @param copies - The rows as read.
 * @returns The question, or null when it meets nothing or does not ask.
 */
export function overlapQuestion(base: SourceSteps, src: StepsSource, copies: Copies): OverlapQuestion | null {
    const proposed = src.mapping.nodes?.key === undefined ? null : nodeSpace(src);
    if (proposed === null || src.spacePicked === true || proposed === ownSpace(src.id)) {
        return null;
    }
    const built = buildOf(base, copies);
    const keys = nodeKeys(src, copies);
    const by = new Set<string>();
    let count = 0;
    for (const k of keys) {
        const n = resolveNode(built, proposed, k);
        const rows = n?.touch.filter((t) => t.table === "nodes" && t.valued !== true).map((t) => t.source) ?? [];
        const reader = n?.loads.includes(READER_SOURCE) === true;
        if (rows.length > 0 || reader) {
            count++;
            rows.forEach((each) => by.add(each));
            if (reader) {
                by.add(READER_SOURCE);
            }
        }
    }
    const order = [...Object.keys(base.sources), READER_SOURCE];
    return count === 0 ? null : { space: proposed, count, of: keys.size, sources: order.filter((id) => by.has(id)) };
}

/**
 * The overlap a source records when it is added, as its `W_SPACE_OVERLAP`.
 * @param base - The value it is added to.
 * @param src - The source.
 * @param copies - The rows as read.
 * @returns The overlap, or null.
 */
function proposedOverlap(base: SourceSteps, src: StepsSource, copies: Copies): SpaceOverlap | null {
    const q = overlapQuestion(base, src, copies);
    return q === null ? null : { code: "W_SPACE_OVERLAP", params: { space: q.space, count: q.count, of: q.of } };
}

/**
 * Keep separate, the default answer to the overlap question: the source's keys, and its edge ends
 * in the proposed space, move to its own space.
 * @param src - The source.
 * @param proposed - The space it proposed.
 * @returns The source with its own space.
 */
function keptSeparate(src: StepsSource, proposed: string): StepsSource {
    const own = ownSpace(src.id);
    const { edges } = src.mapping;
    const end = (space: string | undefined): string | undefined => (space === proposed ? own : space);
    return {
        ...src,
        mapping: {
            ...src.mapping,
            nodes: { ...src.mapping.nodes, space: own },
            ...(edges === undefined
                ? {}
                : { edges: { ...edges, sourceSpace: end(edges.sourceSpace), targetSpace: end(edges.targetSpace) } }),
        },
    };
}

/**
 * An untyped source's keys equal to another untyped source's (9.1): its own space meets theirs.
 * @param next - The value with the source added.
 * @param id - The source's id.
 * @param copies - The rows as read.
 * @returns The overlap, or null.
 */
function ownSpaceOverlap(next: SourceSteps, id: string, copies: Copies): SpaceOverlap | null {
    const own = ownSpace(id);
    const mine = new Set<string>();
    const other = new Map<string, string>();
    for (const n of buildOf(next, copies).nodes.values()) {
        if (n.space === own) {
            mine.add(n.key);
        } else if (n.space.startsWith("source:") && n.space !== READER_SPACE) {
            other.set(n.key, n.space.slice("source:".length));
        }
    }
    const shared = [...mine].filter((k) => other.has(k));
    return shared.length === 0
        ? null
        : {
              code: "W_SPACE_OVERLAP",
              params: { space: own, count: shared.length, of: mine.size, other: other.get(shared[0]) ?? "" },
          };
}

/**
 * The value an edit makes.
 * @param prior - The value now.
 * @param edit - The edit.
 * @param copies - The rows as read, every copy the next value names included.
 * @returns The next value.
 */
export function applyEdit(prior: SourceSteps, edit: StepsEdit, copies: Copies): SourceSteps {
    switch (edit.kind) {
        case "set":
            if (edit.draftBase !== undefined && edit.draftBase.value !== prior) {
                throw new GraphtyError({
                    code: "E_DRAFT_STALE",
                    message: "The sources and steps changed after the draft opened: its commit would undo that change.",
                    source: "data",
                    details: { draft: edit.draftBase.draft },
                });
            }
            return edit.value;
        case "restore":
            return edit.value;
        case "add": {
            const base = edit.replace === true ? EMPTY_STEPS : prior;
            if (edit.staged === true) {
                return {
                    ...base,
                    sources: { ...base.sources, [edit.source.id]: edit.source },
                    types: withSourceRules(base.types, edit.source),
                };
            }
            return addSource(base, edit.source, copies, edit.overlap);
        }
        case "reader":
            return { ...prior, reader: [...prior.reader, ...edit.ops] };
        case "remove-edit":
            return { ...prior, reader: prior.reader.filter((op) => op.id !== edit.id) };
        case "remove-source":
            return withoutSource(prior, edit.id);
        case "act":
            return applyAct(prior, edit.act, copies);
        case "replace-copy":
        case "settle-edit":
        case "resolve-step":
            return applyRefreshEdit(prior, edit, copies);
        default:
            return { ...prior, types: declared(prior.types, edit.entry) };
    }
}

/**
 * The value without one source: its entry, every step that reads it and every type rule naming it.
 * Reader operations stay; one on a node the source alone built binds to nothing.
 * @param prior - The value.
 * @param id - The source's id.
 * @returns The value without it.
 */
function withoutSource(prior: SourceSteps, id: string): SourceSteps {
    const sources = Object.fromEntries(Object.entries(prior.sources).filter(([each]) => each !== id));
    return {
        ...prior,
        sources,
        steps: prior.steps.filter((step) => !stepSources(step, prior).includes(id)),
        types: prior.types.map((entry) => ({ ...entry, rules: entry.rules.filter((rule) => rule.source !== id) })),
    };
}

/**
 * The copies the value still names; every other one is let go.
 * @param value - The value.
 * @param copies - Every copy held.
 * @returns The copies by id.
 */
export function copiesOf(value: SourceSteps, copies: Copies): Copies {
    const named = new Set(Object.values(value.sources).map((s) => copyKey(s)));
    if (Object.keys(copies).every((id) => named.has(id))) {
        return copies;
    }
    return Object.freeze(Object.fromEntries(Object.entries(copies).filter(([id]) => named.has(id))));
}

// ---------------------------------------------------------------- node ids (9.1)

/**
 * The key as the rows spelled it: a number when a row held it as one, so an integer id stays an
 * integer, as today's loads keep it.
 * @param el - The node.
 * @returns The key, or its number.
 */
function typedKey(el: BuiltNode): string | number {
    for (const v of Object.values(el.values)) {
        if (typeof v === "number" && String(v) === el.key) {
            return v;
        }
    }
    for (const t of el.touch) {
        for (const v of Object.values(t.cells)) {
            if (typeof v === "number" && String(v) === el.key) {
                return v;
            }
        }
    }
    return el.key;
}

/**
 * Each node's NodeId: its key when one space holds that key, else `<space>:<key>` (9.1). A key
 * that reads the same as another node's `<space>:<key>` (a key such as `person:x`) is spelled
 * `<space>:<key>` too, so no two nodes share a NodeId.
 * @param result - The build.
 * @returns The NodeId by internal id.
 */
export function nodeIdsOf(result: BuildResult): ReadonlyMap<string, NodeId> {
    const spaces = new Map<string, number>();
    for (const n of result.nodes.values()) {
        spaces.set(n.key, (spaces.get(n.key) ?? 0) + 1);
    }
    const spelled = new Set<BuiltNode>();
    for (const n of result.nodes.values()) {
        if (spaces.get(n.key) !== 1) {
            spelled.add(n);
        }
    }
    // Spelling one key can make another bare key collide, so repeat until nothing changes.
    for (let grew = spelled.size > 0; grew;) {
        const taken = new Set([...spelled].map((n) => `${n.space}:${n.key}`));
        grew = false;
        for (const n of result.nodes.values()) {
            if (!spelled.has(n) && taken.has(n.key)) {
                spelled.add(n);
                grew = true;
            }
        }
    }
    const out = new Map<string, NodeId>();
    for (const n of result.nodes.values()) {
        out.set(n.id, spelled.has(n) ? `${n.space}:${n.key}` : typedKey(n));
    }
    return out;
}

/**
 * The node a NodeId names: the one node holding the key, or the `<space>:<key>` one.
 * @param result - The build.
 * @param id - The NodeId.
 * @returns The node, or null.
 */
export function nodeOfId(result: BuildResult, id: NodeId): BuiltNode | null {
    const ids = nodeIdsOf(result);
    for (const n of result.nodes.values()) {
        const mine = ids.get(n.id);
        if (mine === id || String(mine) === String(id)) {
            return n;
        }
    }
    return null;
}

// ---------------------------------------------------------------- the session graph

/** A node as the session holds it. */
interface ProjectedNode {
    readonly id: NodeId;
    readonly record: Readonly<Record<string, unknown>>;
}

/** An edge as the session holds it, by its built id. */
export interface ProjectedEdge {
    readonly from: NodeId;
    readonly to: NodeId;
    /** The record key its weight is read from; absent reads the configured path. */
    readonly weight?: string;
    readonly ends: { readonly source: string; readonly target: string };
    readonly record: Readonly<Record<string, unknown>>;
}

/** A build as the session's nodes and edges. */
export interface ProjectedGraph {
    readonly nodes: ReadonlyMap<NodeId, ProjectedNode>;
    /** By built edge id. */
    readonly edges: ReadonlyMap<string, ProjectedEdge>;
}

/**
 * A build as the session's nodes and edges: each node's values with its NodeId at `idPath`, each
 * edge's values with its ends' NodeIds in the columns the step that made it reads them from.
 * @param result - The build.
 * @param value - The value it was built from.
 * @param idPath - Where a node record holds its id.
 * @returns The nodes and edges.
 */
export function projectBuild(result: BuildResult, value: SourceSteps, idPath: string): ProjectedGraph {
    const ids = nodeIdsOf(result);
    const nodes = new Map<NodeId, ProjectedNode>();
    for (const n of result.nodes.values()) {
        const id = ids.get(n.id) as NodeId;
        nodes.set(id, { id, record: { ...n.values, ...readableRecord(n), [idPath]: id } });
    }
    const edges = new Map<string, ProjectedEdge>();
    for (const e of result.edges.values()) {
        edges.set(e.id, projectEdge(e, value, ids));
    }
    return { nodes, edges };
}

/**
 * One edge as the session holds it.
 * @param e - The built edge.
 * @param value - The value it was built from.
 * @param ids - The NodeIds by internal id.
 * @returns The edge.
 */
function projectEdge(e: BuiltEdge, value: SourceSteps, ids: ReadonlyMap<string, NodeId>): ProjectedEdge {
    const mapping = value.sources[e.load]?.mapping.edges;
    // The columns the step that made it reads, not its source's: an extracted edge runs between other ends.
    const ends = e.ends ?? { source: mapping?.source ?? "source", target: mapping?.target ?? "target" };
    const from = ids.get(e.from) as NodeId;
    const to = ids.get(e.to) as NodeId;
    const record: Record<string, unknown> = {
        ...e.values,
        ...readableRecord(e),
        [ends.source]: from,
        [ends.target]: to,
    };
    let weight = mapping?.weight;
    if (e.weight !== null) {
        weight ??= "weight";
        record[weight] = e.weight;
    }
    return { from, to, ends, record, ...(weight === undefined ? {} : { weight }) };
}

/** The keys an embedded edge record and its built edge are not compared on. */
const UNCOMPARED: ReadonlySet<string> = new Set([...RECORD_PATHS, "_source.loads", "id", "source", "target"]);

/**
 * Whether an edge record a file embedded is the built edge: the built edge holds the same value in
 * every column the record holds but its ends. A save leaves out the readable paths and the columns
 * a record read hides (those an edge group reads its ends from), so the record may hold fewer.
 * @param held - The record as opened, its ends at `source` and `target`.
 * @param built - The built edge.
 * @returns True when they agree.
 */
function sameEdge(held: Readonly<Record<string, unknown>>, built: ProjectedEdge): boolean {
    const skip = (k: string): boolean => UNCOMPARED.has(k) || k === built.ends.source || k === built.ends.target;
    return Object.keys(held)
        .filter((k) => !skip(k))
        .every((k) => JSON.stringify(held[k]) === JSON.stringify(built.record[k]));
}

/**
 * The part of the graph a project file embedded that the build owns, as the build it should be:
 * each opened edge matched to the built edge it is (same ends and values, in order), so a
 * {@link diffGraph} to the build keeps it. An opened node or edge no step builds is left out, so the
 * diff leaves it in place: the session held it beside the build when it saved (records an older
 * file brought in before the experiment was on), as a live session does.
 * @param after - The build.
 * @param nodes - The opened node records, by id.
 * @param edges - The opened edge records, by id, their ends at `source` and `target`.
 * @returns The opened graph the build owns, keyed as the build is, and each matched edge's session id.
 */
export function openedAsBuilt(
    after: ProjectedGraph,
    nodes: ReadonlyMap<NodeId, Readonly<Record<string, unknown>>>,
    edges: ReadonlyMap<EdgeId, Readonly<Record<string, unknown>>>,
): { before: ProjectedGraph; edgeIds: Record<string, EdgeId> } {
    const byEnds = new Map<string, (readonly [string, ProjectedEdge])[]>();
    for (const each of after.edges) {
        const k = `${String(each[1].from)}\u0001${String(each[1].to)}`;
        byEnds.set(k, [...(byEnds.get(k) ?? []), each]);
    }
    const edgeIds: Record<string, EdgeId> = {};
    const beforeEdges = new Map<string, ProjectedEdge>();
    for (const [id, record] of edges) {
        const candidates = byEnds.get(`${String(record.source)}\u0001${String(record.target)}`) ?? [];
        const at = candidates.findIndex(([, built]) => sameEdge(record, built));
        if (at === -1) {
            continue;
        }
        const [[key, built]] = candidates.splice(at, 1);
        edgeIds[key] = id;
        beforeEdges.set(key, { ...built, record });
    }
    const beforeNodes = new Map<NodeId, ProjectedNode>(
        [...nodes].filter(([id]) => after.nodes.has(id)).map(([id, record]) => [id, { id, record }]),
    );
    return { before: { nodes: beforeNodes, edges: beforeEdges }, edgeIds };
}

/** The writes that take the session graph from one build to the next. */
export interface GraphDiff {
    readonly removeEdges: readonly EdgeId[];
    readonly removeNodes: readonly NodeId[];
    readonly updateNodes: readonly { readonly id: NodeId; readonly values: Readonly<Record<string, unknown>> }[];
    readonly updateEdges: readonly { readonly id: EdgeId; readonly values: Readonly<Record<string, unknown>> }[];
    readonly addNodes: readonly Readonly<Record<string, unknown>>[];
    /** By built edge id, in build order. */
    readonly addEdges: readonly (readonly [string, ProjectedEdge])[];
    /** The session edge id of every edge kept as it was or patched in place, by built edge id. */
    readonly kept: Readonly<Record<string, EdgeId>>;
}

/**
 * Whether two records hold the same values.
 * @param a - One record.
 * @param b - The other.
 * @returns True when every key holds the same value.
 */
function sameRecord(a: Readonly<Record<string, unknown>>, b: Readonly<Record<string, unknown>>): boolean {
    const keys = Object.keys(a);
    return keys.length === Object.keys(b).length && keys.every((k) => JSON.stringify(a[k]) === JSON.stringify(b[k]));
}

/**
 * The smallest set of writes from one projected build to the next: a node whose id is gone is
 * removed (its edges with it), a changed record is replaced in place, an edge whose ends or weight
 * changed is removed and added again, and what is new is added.
 * @param before - The graph the session holds.
 * @param after - The graph it should hold.
 * @param edgeIds - The session edge id of each edge of `before`, by built edge id.
 * @returns The writes.
 */
export function diffGraph(
    before: ProjectedGraph,
    after: ProjectedGraph,
    edgeIds: Readonly<Record<string, EdgeId>>,
): GraphDiff {
    const nodes = diffNodes(before, after);
    return { ...nodes, ...diffEdges(before, after, edgeIds, new Set(nodes.removeNodes)) };
}

/**
 * The node half of {@link diffGraph}.
 * @param before - The graph the session holds.
 * @param after - The graph it should hold.
 * @returns The node writes.
 */
function diffNodes(
    before: ProjectedGraph,
    after: ProjectedGraph,
): Pick<GraphDiff, "removeNodes" | "updateNodes" | "addNodes"> {
    const removeNodes: NodeId[] = [];
    const updateNodes: { id: NodeId; values: Readonly<Record<string, unknown>> }[] = [];
    for (const [id, node] of before.nodes) {
        const next = after.nodes.get(id);
        if (next === undefined) {
            removeNodes.push(id);
        } else if (!sameRecord(node.record, next.record)) {
            updateNodes.push({ id, values: next.record });
        }
    }
    const addNodes = [...after.nodes].filter(([id]) => !before.nodes.has(id)).map(([, node]) => node.record);
    return { removeNodes, updateNodes, addNodes };
}

/**
 * Whether an edge must be removed and added again: its ends or its weight changed, or it is gone.
 * @param edge - The edge as the session holds it.
 * @param next - The edge as it should be, or undefined when it is gone.
 * @returns True when it moved.
 */
function edgeMoved(edge: ProjectedEdge, next: ProjectedEdge | undefined): boolean {
    if (next?.from !== edge.from || next.to !== edge.to || next.weight !== edge.weight) {
        return true;
    }
    return next.weight !== undefined && next.record[next.weight] !== edge.record[next.weight];
}

/**
 * The edge half of {@link diffGraph}.
 * @param before - The graph the session holds.
 * @param after - The graph it should hold.
 * @param edgeIds - The session edge id of each edge of `before`.
 * @param gone - The nodes removed, whose edges go with them.
 * @returns The edge writes.
 */
function diffEdges(
    before: ProjectedGraph,
    after: ProjectedGraph,
    edgeIds: Readonly<Record<string, EdgeId>>,
    gone: ReadonlySet<NodeId>,
): Pick<GraphDiff, "removeEdges" | "updateEdges" | "addEdges" | "kept"> {
    const removeEdges: EdgeId[] = [];
    const updateEdges: { id: EdgeId; values: Readonly<Record<string, unknown>> }[] = [];
    const kept: Record<string, EdgeId> = {};
    for (const [key, edge] of before.edges) {
        const id = edgeIds[key] as EdgeId | undefined;
        const next = after.edges.get(key);
        const dropped = id === undefined || gone.has(edge.from) || gone.has(edge.to);
        if (edgeMoved(edge, next)) {
            if (!dropped) {
                removeEdges.push(id);
            }
        } else if (!dropped) {
            kept[key] = id;
            if (next !== undefined && !sameRecord(edge.record, next.record)) {
                updateEdges.push({ id, values: next.record });
            }
        }
    }
    const addEdges = [...after.edges].filter(([key]) => !(key in kept));
    return { removeEdges, updateEdges, addEdges, kept };
}

// ---------------------------------------------------------------- what the public calls read

/** Where a source stands in the build (9.2). */
export type SourceState = "staged" | "built" | "off" | "held";

/**
 * Where a source stands: held, staged (no step reads it), off (every step reading it is off) or built.
 * @param value - The value.
 * @param id - The source's id.
 * @returns The state.
 */
export function sourceState(value: SourceSteps, id: string): SourceState {
    if (value.sources[id]?.held === true) {
        return "held";
    }
    if (isStaged(value, id)) {
        return "staged";
    }
    const reading = value.steps.filter((s) => stepSources(s).includes(id));
    return reading.every((s) => s.off === true) ? "off" : "built";
}

/** What one source supplied and named in a build, in session ids. */
export interface SourceFacts {
    readonly nodes: readonly NodeId[];
    readonly edges: readonly EdgeId[];
    /** How many nodes and edges it made: the ones no earlier source supplied (today's `LoadedSource.added`). */
    readonly added: { readonly nodes: number; readonly edges: number };
    /** How many nodes it only named. */
    readonly named: number;
    /** Its rows the build left out, by reason. */
    readonly leftOut: Readonly<Partial<Record<Exclude<RowFateKind, "built">, number>>>;
}

/**
 * What each source supplied, named and left out in a build.
 * @param result - The build.
 * @param value - The value it was built from.
 * @param edgeIds - The session edge id of each built edge.
 * @returns The facts by source id, every source of the value included.
 */
export function sourceFacts(
    result: BuildResult,
    value: SourceSteps,
    edgeIds: Readonly<Record<string, EdgeId>>,
): ReadonlyMap<string, SourceFacts> {
    const ids = nodeIdsOf(result);
    const out = new Map<
        string,
        {
            nodes: NodeId[];
            edges: EdgeId[];
            added: { nodes: number; edges: number };
            named: number;
            leftOut: Record<string, number>;
        }
    >();
    // The reader source is in no list of sources, but supplies what the reader adds (3.1).
    for (const id of [...Object.keys(value.sources), READER_SOURCE]) {
        out.set(id, { nodes: [], edges: [], added: { nodes: 0, edges: 0 }, named: 0, leftOut: {} });
    }
    for (const n of result.nodes.values()) {
        n.loads.forEach((id) => out.get(id)?.nodes.push(ids.get(n.id) as NodeId));
        const maker = out.get(n.loads[0] ?? "");
        if (maker) {
            maker.added.nodes++;
        }
        n.named.forEach((id) => {
            const facts = out.get(id);
            if (facts) {
                facts.named++;
            }
        });
    }
    for (const e of result.edges.values()) {
        const edge = edgeIds[e.id] as EdgeId | undefined;
        e.loads.forEach((id) => edge !== undefined && out.get(id)?.edges.push(edge));
        const maker = out.get(e.loads[0] ?? "");
        if (maker && edge !== undefined) {
            maker.added.edges++;
        }
    }
    for (const [id, fates] of result.fates) {
        const leftOut = out.get(id)?.leftOut ?? {};
        [...fates.values()]
            .filter(({ fate }) => fate !== "built")
            .forEach(({ fate }) => (leftOut[fate] = (leftOut[fate] ?? 0) + 1));
    }
    return out;
}

/** One step as `data.steps()` lists it (9.2). */
export interface StepRow {
    /** Its place in the ordered list, from 0. */
    readonly index: number;
    readonly op: Step["op"];
    /** The source it reads. */
    readonly source: string;
    /** The columns it reads its keys, ends and roles from. */
    readonly reads: readonly string[];
    /** The id spaces it writes nodes in. */
    readonly spaces: readonly string[];
    /** The types its source's rules give what it builds. */
    readonly types: readonly string[];
    /** The reader turned it off: kept but not built (7.13). */
    readonly off: boolean;
    /** A source it depends on is held, or it misses a column (`missing`), so it is not built (7.12). */
    readonly held: boolean;
    /** The columns it reads that its sources' rows no longer hold; a step missing one is held (7.12). */
    readonly missing: readonly RefreshIssue[];
    /** Its counts in the committed build; null when it was not built. */
    readonly buckets: StepStats | null;
    /** One `W_VALUES_DIFFER` per column whose values from different sources differ at this step. */
    readonly valuesDiffer: readonly Extract<StepsOutcome, { code: "W_VALUES_DIFFER" }>[];
    /** The rows it leaves out by one column's values (5.4); null when it leaves none out. */
    readonly except: RowFilter | null;
    /** The join act that made it, as `connect` or `merge` would take it again; null for any other step. */
    readonly act: StepAct | null;
    /** For a step that links nodes sharing a value: its choices, as `link` would take them again. */
    readonly link: SourceLinkOptions | null;
    /** For a step that links nodes sharing a value: the space of the nodes it links. */
    readonly holders: string | null;
    /** For an Extract's step: its choices, as `extract` would take them again for its source. */
    readonly extract: SourceExtractOptions | null;
}

/** A merge or a Make an edge step, read back as the act that makes it (5.2, 7.13). */
interface StepAct {
    readonly act: "connect" | "merge";
    /** Source 2's field, read on its rows. */
    readonly from: { readonly source: string; readonly field: string };
    /** Node 1: its space, and the source and field translating to its key when it is not the key. */
    readonly into:
        | { readonly space: string; readonly source: string; readonly field: string }
        | { readonly space: string; readonly source?: undefined; readonly field?: string };
    readonly direction?: "into-from" | "from-into";
    readonly edgeType?: string;
    readonly ignoreCase: boolean;
    readonly ignoreSpaces: boolean;
    readonly repeated: "first" | "last" | "both" | null;
    readonly aggregate: Aggregate | null;
    readonly unmatchedFrom?: "keep" | "drop";
    readonly unmatched?: "skip" | "add";
    readonly perPair?: boolean;
    /** Each row an edge between node 1 and the node its `field` names in `into.space`, or a node between them. */
    readonly to?: NonNullable<SourceStepAct["to"]>;
    /** A row whose ends an edge already joins folds into that edge. */
    readonly existing?: "merge";
    /** A row naming several nodes joins each of them. */
    readonly fanOut?: "each";
    /** A row no edge reaches makes no node. */
    readonly unlinked?: "drop";
}

/**
 * A merge, or the edge step of a Connect, read back as its act: the inverse of `merge` and
 * `connect` in acts.ts.
 * @param value - The value.
 * @param step - The step.
 * @returns The act, or null for a step no join act makes.
 */
export function stepAct(value: SourceSteps, step: Step): StepAct | null {
    const into = (
        space: string,
        s: {
            readonly via?: string;
            readonly mapping?: { readonly columns: readonly [string, string] };
            readonly nodeColumn?: string;
        },
    ): StepAct["into"] => {
        if (s.nodeColumn !== undefined) {
            return { space, field: s.nodeColumn };
        }
        return s.via !== undefined && s.mapping !== undefined
            ? { space, source: s.via, field: s.mapping.columns[0] }
            : { space };
    };
    const shared = {
        ignoreCase: step.ignoreCase === true,
        ignoreSpaces: step.ignoreSpaces === true,
    };
    if (step.op === "join.merge") {
        return {
            act: "merge",
            from: { source: step.source, field: step.read.key },
            into: into(step.read.space, step),
            ...shared,
            repeated: step.repeated ?? null,
            aggregate: step.aggregate ?? null,
            unmatchedFrom: step.unmatchedFrom ?? "keep",
            ...defined({ fanOut: step.fanOut }),
        };
    }
    const src = value.sources[step.source] as Source | undefined;
    if (step.op !== "join.edges" || step.link !== undefined || extractOf(step) !== null) {
        return null;
    }
    if (src === undefined || !(step.read.table === "nodes" || rowEdges(step))) {
        return null;
    }
    const { read, rowNode } = step;
    // The row's own node is one end, keyed by the row's key; else each row is an edge between two
    // nodes it names, made by `connect` with `to`.
    const key = src.mapping.nodes?.key;
    const own = (end: "source" | "target", col: string | undefined, space: string | undefined): boolean =>
        rowNode === undefined ? col !== undefined && col === key && space === nodeSpace(src) : rowNode === end;
    const ownTarget = own("target", read.target, read.targetSpace);
    const ownSource = own("source", read.source, read.sourceSpace);
    const intoFrom = ownTarget || (!ownSource && step.viaEnd !== "target");
    const one = { field: intoFrom ? read.source : read.target, space: intoFrom ? read.sourceSpace : read.targetSpace };
    const two = { field: intoFrom ? read.target : read.source, space: intoFrom ? read.targetSpace : read.sourceSpace };
    const edgeType = partType(value, step, "edge");
    return {
        act: "connect",
        from: { source: step.source, field: one.field ?? "" },
        into: into(one.space ?? "", step),
        direction: intoFrom ? "into-from" : "from-into",
        ...(edgeType === undefined ? {} : { edgeType }),
        ...shared,
        repeated: step.repeated ?? null,
        aggregate: step.aggregate ?? null,
        unmatched: step.unmatchedRows === "add" ? "add" : "skip",
        perPair: step.repeated === "first",
        ...defined({ existing: step.existing, fanOut: step.fanOut, unlinked: step.unlinked }),
        ...(ownTarget || ownSource ? {} : otherEnd(value, step, two, intoFrom ? "target" : "source")),
    };
}

/**
 * The type the rules naming one edge step's part give what it makes.
 * @param value - The value.
 * @param step - The step.
 * @param kind - The nodes at one end, or its edges.
 * @param end - Which end's nodes; default the target's.
 * @returns The type, or undefined.
 */
function partType(
    value: SourceSteps,
    step: EdgesStep,
    kind: "node" | "edge",
    end: "source" | "target" | undefined = kind === "node" ? "target" : undefined,
): string | undefined {
    return value.types.find(
        (t) =>
            t.kind === kind && t.rules.some((r) => r.source === step.source && r.part === step.part && r.end === end),
    )?.name;
}

/**
 * A step that links nodes sharing a value, read back as its choices: the inverse of `link` in acts.ts.
 * @param value - The value.
 * @param step - The step.
 * @returns The choices, or null for any other step.
 */
function stepLink(value: SourceSteps, step: Step): SourceLinkOptions | null {
    if (step.op !== "join.edges" || step.link === undefined) {
        return null;
    }
    const { link, read } = step;
    const asNodes = link.as === "nodes";
    const held =
        step.via !== undefined && step.mapping !== undefined
            ? { source: step.via, field: step.mapping.columns[0], space: read.sourceSpace }
            : { space: read.sourceSpace ?? "", ...defined({ field: step.nodeColumn }) };
    return Object.freeze({
        source: step.source,
        columns: link.columns,
        ...(link.of === "nodes" ? { nodes: read.sourceSpace } : {}),
        ...(read.source === undefined ? {} : { field: read.source, into: held }),
        as: asNodes ? ("nodes" as const) : ("edges" as const),
        maxShared: link.maxShared,
        minShared: link.minShared,
        ...defined({
            edgeType: partType(value, step, "edge"),
            type: asNodes ? partType(value, step, "node") : undefined,
            space: asNodes ? read.targetSpace : undefined,
        }),
        ignoreCase: step.ignoreCase === true,
        ignoreSpaces: step.ignoreSpaces === true,
    });
}

/**
 * The space of the nodes a link's values are held by: the one it names, else the one its rows' own
 * nodes are in by then, which is node 1's once a merge folded them.
 * @param value - The value.
 * @param step - The link's step.
 * @param index - Its place.
 * @returns The space.
 */
function holdersOf(value: SourceSteps, step: EdgesStep, index: number): string {
    if (step.read.sourceSpace !== undefined) {
        return step.read.sourceSpace;
    }
    const merged = value.steps
        .slice(0, index)
        .flatMap((s) =>
            s.op === "join.merge" && s.source === step.source && s.off !== true && s.read.table !== "edges"
                ? [s.read.space]
                : [],
        )
        .at(-1);
    if (merged !== undefined) {
        return merged;
    }
    const src = value.sources[step.source] as Source | undefined;
    return src === undefined ? ownSpace(step.source) : rowNodeSpace(src, step.read.table ?? "edges");
}

/**
 * The sources whose own rows are nodes of each space: added into it, made nodes of it by an edge step,
 * and, with `merged`, merged into its nodes.
 * @param value - The value.
 * @param merged - Whether the merged ones count.
 * @returns The sources, by space.
 */
export function rowSources(value: SourceSteps, merged: boolean): ReadonlyMap<string, readonly string[]> {
    const out = new Map<string, string[]>();
    const note = (space: string, id: string): void => {
        const held = out.get(space) ?? [];
        out.set(space, held.includes(id) ? held : [...held, id]);
    };
    for (const step of value.steps) {
        const src = value.sources[step.source] as Source | undefined;
        if (src === undefined || step.off === true) {
            continue;
        }
        if (step.op === "join.add" && src.mapping.nodes !== undefined) {
            note(nodeSpace(src), src.id);
        } else if (step.op === "join.edges" && step.rowNode !== undefined) {
            note(rowNodeSpace(src, step.read.table ?? "edges"), src.id);
        } else if (merged && step.op === "join.merge" && step.read.table !== "edges") {
            note(step.read.space, src.id);
        }
    }
    return out;
}

/**
 * An Extract's step read back as its choices: the inverse of `extract` in acts.ts.
 * @param value - The value.
 * @param index - The step's place.
 * @returns The choices, or null for any other step.
 */
function stepExtract(value: SourceSteps, index: number): SourceExtractOptions | null {
    const step = extractOf(value.steps[index]);
    const src = step === null ? undefined : (value.sources[step.source] as Source | undefined);
    if (step === null || src === undefined || step.read.target === undefined) {
        return null;
    }
    const m = src.mapping.edges;
    const end =
        m !== undefined &&
        step.read.source === m.target &&
        step.read.sourceSpace === (m.targetSpace ?? ownSpace(src.id))
            ? ("target" as const)
            : ("source" as const);
    return Object.freeze({
        column: step.read.target,
        from: step.rowNode === "source" ? ("row" as const) : end,
        ...defined({
            space: step.read.targetSpace,
            type: partType(value, step, "node"),
            edgeType: partType(value, step, "edge"),
            columns: step.extract === undefined ? movedAfter(value.steps, index)?.columns : step.extract.columns,
            split: step.extract?.split,
        }),
    });
}

/**
 * The members of an object that are defined.
 * @param members - The members.
 * @returns Them.
 */
export function defined<T extends Record<string, unknown>>(members: T): Partial<T> {
    return Object.fromEntries(Object.entries(members).filter(([, v]) => v !== undefined)) as Partial<T>;
}

/**
 * A Connect's other end, read back. A step whose other end names no column reads back as a one-match
 * Connect, never `to.field: ""`.
 * @param value - The value.
 * @param step - The Connect's step.
 * @param end - The column naming it and the space its nodes live in.
 * @param end.field - The column.
 * @param end.space - The space.
 * @param which - The edge end it is.
 * @returns The act's `to`, if it has one.
 */
function otherEnd(
    value: SourceSteps,
    step: EdgesStep,
    end: { readonly field: string | undefined; readonly space: string | undefined },
    which: "source" | "target",
): Pick<StepAct, "to"> {
    if (end.field === undefined || end.field === "" || end.space === undefined) {
        return {};
    }
    return {
        to: {
            field: end.field,
            into: { space: end.space },
            ...(step.rowNode === "middle" ? { keepRow: true } : {}),
            ...(step.addEnd === which ? { unmatched: "add" as const } : {}),
            ...defined({ type: partType(value, step, "node", which) }),
        },
    };
}

/**
 * Whether a `join.edges` step reading edge rows is a Connect made from a source read as edges. Only
 * a Connect says both what an unmatched row does and that its edges carry no weight: Extract leaves
 * the first to the source, a joined table's edges the second.
 * @param step - The step.
 * @returns True for a Connect.
 */
function rowEdges(step: Extract<Step, { op: "join.edges" }>): boolean {
    return step.read.table === "edges" && step.unmatchedRows !== undefined && step.read.weight === null;
}

/**
 * The columns a step reads from its source: the keys, ends and roles of its mapping or its own read.
 * @param step - The step.
 * @param src - Its source.
 * @returns The column names.
 */
function readsOf(step: Step, src: Source | undefined): string[] {
    const out = new Set<string>();
    const pick = (o: object | undefined, keys: readonly string[]): void => {
        for (const k of keys) {
            const v = (o as Record<string, unknown> | undefined)?.[k];
            if (typeof v === "string") {
                out.add(v);
            }
        }
    };
    const roles = ["key", "source", "target", "edgeId", "weight", "time", "timeEnd"] as const;
    if (step.op === "join.add") {
        pick(src?.mapping.nodes, roles);
        pick(src?.mapping.edges, roles);
        // a key the rows were numbered by is no column of theirs
        out.delete(src?.numbered ?? "");
    } else {
        pick(step.read, roles);
        if (step.op === "join.edges") {
            (step.link?.columns ?? []).forEach((c) => out.add(c));
        }
    }
    return [...out];
}

/**
 * The id spaces a step writes nodes in.
 * @param step - The step.
 * @param src - Its source.
 * @returns The spaces.
 */
export function stepSpaces(step: Step, src: StepsSource | undefined): ReadonlySet<string> {
    const spaces = new Set<string>();
    if (step.op === "join.add" && src !== undefined) {
        if (src.mapping.nodes !== undefined) {
            spaces.add(nodeSpace(src));
        }
        if (src.mapping.edges !== undefined) {
            spaces.add(src.mapping.edges.sourceSpace ?? ownSpace(src.id));
            spaces.add(src.mapping.edges.targetSpace ?? ownSpace(src.id));
        }
    } else if (step.op !== "join.edge-values") {
        const read = (step as { readonly read: unknown }).read as {
            readonly space?: string;
            readonly sourceSpace?: string;
            readonly targetSpace?: string;
        };
        for (const s of [read.space, read.sourceSpace, read.targetSpace]) {
            if (s !== undefined) {
                spaces.add(s);
            }
        }
        if (step.op === "join.edges" && step.rowNode !== undefined && src !== undefined) {
            spaces.add(rowNodeSpace(src, step.read.table ?? "edges"));
        }
    }
    return spaces;
}

/**
 * Every step with its buckets from the committed build (9.2).
 * @param value - The value.
 * @param result - Its build.
 * @param copies - The rows as read, which say what columns each step finds.
 * @returns One row per step, in order.
 */
export function stepRows(value: SourceSteps, result: BuildResult, copies: Copies): readonly StepRow[] {
    const report = conflictReport(result).filter((each) => each.code === "W_VALUES_DIFFER");
    return value.steps.map((step, index) => {
        const src = value.sources[step.source] as StepsSource | undefined;
        const spaces = stepSpaces(step, src);
        const types = value.types
            .filter((t) =>
                t.rules.some(
                    (r) =>
                        r.source === step.source && (r.part === undefined || ("part" in step && step.part === r.part)),
                ),
            )
            .map((t) => t.name);
        const missing = missingColumns(value, copies, index);
        return Object.freeze({
            index,
            op: step.op,
            source: step.source,
            reads: Object.freeze(readsOf(step, src)),
            spaces: Object.freeze([...spaces]),
            types: Object.freeze(types),
            off: step.off === true,
            held: missing.length > 0 || stepSources(step, value).some((id) => value.sources[id]?.held === true),
            missing: Object.freeze(missing),
            buckets: result.stats.find((s) => s.step === index) ?? null,
            valuesDiffer: Object.freeze(report.filter((each) => each.params.step === index)),
            except: step.op === "join.add" || step.except === undefined ? null : step.except,
            act: stepAct(value, step),
            link: stepLink(value, step),
            holders: step.op === "join.edges" && step.link !== undefined ? holdersOf(value, step, index) : null,
            extract: stepExtract(value, index),
        });
    });
}

/** One id space as `data.spaces()` lists it. */
export interface SpaceRow {
    readonly space: string;
    /** How many nodes the build holds in it. */
    readonly nodes: number;
    /** The sources whose rows built or named its nodes. */
    readonly sources: readonly string[];
    /** For a source's own space (its rows keyed with no space named): that source. */
    readonly ownedBy?: string;
}

/**
 * Every id space the build holds nodes in.
 * @param result - The build.
 * @returns One row per space, in the order the build first used it.
 */
export function spaceRows(result: BuildResult): readonly SpaceRow[] {
    const out = new Map<string, { nodes: number; sources: Set<string> }>();
    for (const n of result.nodes.values()) {
        let row = out.get(n.space);
        if (row === undefined) {
            row = { nodes: 0, sources: new Set() };
            out.set(n.space, row);
        }
        row.nodes++;
        n.loads.forEach((s) => row.sources.add(s));
        n.named.forEach((s) => row.sources.add(s));
    }
    return [...out].map(([space, row]) => {
        const ownedBy = [...row.sources].find((id) => ownSpace(id) === space);
        return Object.freeze({
            space,
            nodes: row.nodes,
            sources: Object.freeze([...row.sources]),
            ...(ownedBy === undefined ? {} : { ownedBy }),
        });
    });
}

/** One reader operation as `data.edits()` lists it. */
export interface EditRow {
    readonly id: string;
    readonly op: ReaderOp["op"];
    /** The node or edge it names: `{ space, key }` or `{ load, key }`. */
    readonly target: { readonly space: string; readonly key: string } | { readonly load: string; readonly key: string };
    readonly column?: string;
    readonly value?: CellValue;
    /** For a pick or Use: the source whose value it took. */
    readonly picked?: string;
    /** For an edit: whether it applies, names no element (`lost`), or its source moved under it (7.12). */
    readonly state?: "applies" | "lost" | "source-changed";
    /** For `source-changed`: the value it was made over, and what the source says now. */
    readonly was?: Value | null;
    readonly now?: Value | null;
}

/**
 * The element a reader operation other than a node add names.
 * @param op - The operation.
 * @returns Its node or edge.
 */
function targetOf(op: Exclude<ReaderOp, { op: "add" }>): EditRow["target"] {
    return op.op === "add-edge" ? op.edge : (op.node ?? op.edge);
}

/**
 * The reader source's operations, in the order made, each edit with where it stands.
 * @param value - The value.
 * @param copies - The rows as read.
 * @returns One row per operation.
 */
export function editRows(value: SourceSteps, copies: Copies): readonly EditRow[] {
    const states = new Map(editStates(value, copies).map((s) => [s.id, s]));
    return value.reader.map((op) => {
        const state = states.get(op.id);
        const target = op.op === "add" ? op.node : targetOf(op);
        return Object.freeze({
            id: op.id,
            op: op.op,
            target,
            ...(op.op === "edit"
                ? { column: op.column, value: op.value, ...(op.picked === undefined ? {} : { picked: op.picked }) }
                : {}),
            ...(state === undefined
                ? {}
                : {
                      state: state.state,
                      ...(state.state === "source-changed" ? { was: state.was ?? null, now: state.now ?? null } : {}),
                  }),
        });
    });
}

/**
 * The `{ space, key }` a key names: the one node holding it (through merge aliases), in `space` when given.
 * @param result - The build.
 * @param key - The key.
 * @param space - The space to look in; absent looks in every space.
 * @returns The reference, or null when no node holds the key.
 * @throws A `GraphtyError` with `E_AMBIGUOUS_ID` when nodes in several spaces hold it.
 */
export function refOf(
    result: BuildResult,
    key: string,
    space?: string,
): { readonly space: string; readonly key: string } | null {
    const hits = new Set<string>();
    for (const n of result.nodes.values()) {
        if (n.key === key && (space === undefined || n.space === space)) {
            hits.add(n.id);
        }
    }
    for (const [alias, id] of result.aliases) {
        const [s, k] = alias.split("\u0001");
        if (k === key && (space === undefined || s === space)) {
            hits.add(id);
        }
    }
    if (hits.size > 1) {
        throw new GraphtyError({
            code: "E_AMBIGUOUS_ID",
            message: `Nodes in several id spaces hold the key "${key}"; name the space.`,
            source: "data",
            details: { key, spaces: [...hits].map((id) => result.nodes.get(id)?.space ?? "") },
        });
    }
    const [id] = hits;
    const n = id === undefined ? undefined : result.nodes.get(id);
    return n === undefined ? null : Object.freeze({ space: n.space, key: n.key });
}
