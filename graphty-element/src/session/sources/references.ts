/**
 * @file Saving a load as a reference (the `source-references` experiment): which loads can be one,
 * which of a referenced load's rows a save leaves out of the data member, and putting them back
 * when a project opens by reading the load again.
 *
 * A row is left out only when its one supplier is the referenced load and its values are what the
 * load reads now; anything a reader edited, or another load also supplied, stays in the file. A
 * left-out row is written as a placeholder in its place (`{ id, "_source.ref": <entry> }` for a
 * node, `{ source, target, "_source.ref": <entry> }` for an edge), so every member that names
 * elements by position (a run's edge values, the selection) reads the same positions on open; a
 * placeholder a changed load no longer gives keeps its position empty (`Filled.linkAt`). The
 * load is read in a scratch session, so what is compared and what is put back are the records the
 * load gives, whatever its format and choices.
 */

import { sha256Hex } from "@graphty/graph-io";
import type { GeneratorParams } from "@graphty/graph-samples/generators";

import type { EdgeId, NodeId, SourceKey } from "../../catalog/types";
import { GraphtyError } from "../../errors/GraphtyError";
import type { NetworkApiInternal } from "../network";
import { pairKey } from "../replace";
import type { CodedFact } from "../shared";
import type { GraphSession, LoadChoices, LoadedSource, SourceNoPathReason } from "../types";
import { type LoadFacts, paramsOf, redactUrl, sampleAddress } from "./member";
import { targetOf } from "./pending";
import type { SourceLoadRecord } from "./types";

/** The key a placeholder names its load's entry by. */
export const REF_KEY = "_source.ref";

/** The column a saved record lists its loads in. */
const LOADS_KEY = "_source.loads";

/** A problem a save or an open reports about a reference. */
export type ReferenceProblem = CodedFact<"W_SOURCE_UNAVAILABLE" | "W_SOURCE_CHANGED">;

/** Why a reference could not be read again. */
type UnavailableReason = "not-found" | "denied" | "unreadable";

/**
 * Whether a value is a plain JSON object.
 * @param value - The value.
 * @returns True for `{...}`.
 */
function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Why a generated graph or a named dataset cannot be saved as a reference.
 * @param facts - What the session keeps about it.
 * @returns The reason, or undefined when it can be made again.
 */
function sampleRefusal(facts: LoadFacts | undefined): SourceNoPathReason | undefined {
    // Every generator gives the same graph for the same params (an absent seed is 0).
    const sample = facts?.sample;
    return typeof sample?.generator === "string" ||
        (typeof sample?.dataset === "string" && typeof sample.baseUrl === "string")
        ? undefined
        : "no-seed";
}

/** What a network load's reference reads: its source, params, endpoint and credential. */
export type NetworkRecord = Pick<SourceLoadRecord, "source" | "config" | "endpoint" | "credential" | "options">;

/**
 * Why a load cannot be saved as a reference.
 * @param load - The load, as `data.sources()` lists it.
 * @param facts - What the session keeps about it.
 * @param record - A network load's record.
 * @returns The reason, or undefined for a load that can be one.
 */
export function refusalOf(
    load: LoadedSource,
    facts: LoadFacts | undefined,
    record?: NetworkRecord,
): SourceNoPathReason | undefined {
    if (load.kind === "join" || load.joinedOnto !== undefined) {
        return "join";
    }

    if (load.kind === "server") {
        // A network load is read again by its source, endpoint and params, unless reading it
        // needed a credential or a secret the file never holds.
        const secrets = new Set<string>();
        paramsOf(record?.config ?? load.config ?? {}, secrets);
        return (record?.credential ?? null) !== null || facts?.credentialSlot !== undefined || secrets.size > 0
            ? "secret-url"
            : undefined;
    }

    const address = sampleAddress(load, facts);
    if (load.kind === "sample" && address === undefined) {
        return sampleRefusal(facts);
    }

    // A sample read by URL is a URL load, at its address resolved against the page.
    const url = address ?? load.config?.url;
    if ((load.kind !== "url" && address === undefined) || typeof url !== "string") {
        return load.fileName === undefined && facts?.file?.name === undefined ? "inline" : "file";
    }

    let parsed: URL;
    try {
        parsed = new URL(url);
    } catch {
        return "relative-url";
    }

    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
        return "relative-url";
    }

    return parsed.username !== "" || parsed.password !== "" || redactUrl(url).dropped.length > 0
        ? "secret-url"
        : undefined;
}

/** How to read a load again: what a scratch session is given. */
export interface LoadHow {
    readonly kind: string;
    readonly type?: string;
    readonly name?: string;
    readonly config: Readonly<Record<string, unknown>>;
    readonly choices?: LoadChoices;
    /** A sample's `{ generator, params }` or `{ dataset, baseUrl }`. */
    readonly sample?: Readonly<Record<string, unknown>>;
    /** A network load's source id, endpoint and recorded options (its limits). */
    readonly network?: {
        readonly source: string;
        readonly endpoint: string | null;
        readonly options: Readonly<Record<string, unknown>>;
    };
}

/** A load's records as it reads them: nodes, edges without ids, and their digest. */
export interface ReadRows {
    readonly nodes: readonly Record<string, unknown>[];
    readonly edges: readonly Record<string, unknown>[];
    readonly directed: boolean;
    readonly sha256: string;
}

/**
 * A record without the column a saved record lists its loads in.
 * @param record - The record.
 * @returns The rest.
 */
function bare(record: Readonly<Record<string, unknown>>): Record<string, unknown> {
    const { [LOADS_KEY]: _loads, ...rest } = record;
    return rest;
}

/**
 * The URL a reference reads, for the network gate: the load's address, or a dataset's base.
 * @param how - The load.
 * @returns The URL, or undefined for a generated graph, which fetches nothing.
 */
function fetchedUrl(how: LoadHow): URL | undefined {
    const { network } = how;
    const address =
        network === undefined
            ? (how.sample?.baseUrl ?? how.config.url)
            : targetOf({ source: network.source, config: how.config, endpoint: network.endpoint });
    if (typeof address !== "string") {
        return undefined;
    }

    try {
        return new URL(address);
    } catch {
        return undefined;
    }
}

/**
 * Read a load again in a scratch session, after the network gate allows its host.
 * @param how - The load.
 * @param scratch - Makes an empty session; this disposes it.
 * @param network - The gate, or undefined to fetch without asking (the page's own load).
 * @returns The records, or why they could not be read.
 */
export async function readAsLoaded(
    how: LoadHow,
    scratch: () => GraphSession,
    network: NetworkApiInternal | undefined,
): Promise<ReadRows | UnavailableReason> {
    const url = fetchedUrl(how);
    if (network !== undefined && url !== undefined) {
        const allowed = await network.ask({ url, kind: "data", by: "file", layerIds: [] });
        if (!allowed) {
            return "denied";
        }
    }

    const session = scratch();
    try {
        await loadInto(session, how);
        const nodes = session.data.nodes({ scope: "graph" }).map((node) => bare(node));
        const edges = session.data.edges({ scope: "graph" }).map(({ id: _id, ...edge }) => bare(edge));
        const sha256 = await sha256Hex(new TextEncoder().encode(JSON.stringify({ nodes, edges })));
        return { nodes, edges, directed: session.status.directed, sha256 };
    } catch (error) {
        return unavailableReason(error);
    } finally {
        session.dispose();
    }
}

/**
 * Load a load into a session as it was loaded: the same generator, dataset or source and choices.
 * @param session - The scratch session.
 * @param how - The load.
 * @returns Settles once it is loaded.
 */
async function loadInto(session: GraphSession, how: LoadHow): Promise<void> {
    const { mode: _mode, ...choices } = how.choices ?? {};
    const sample = how.sample ?? {};
    if (how.network !== undefined) {
        const { endpoint, options } = how.network;
        await session.data.import(
            { source: how.network.source, config: how.config },
            { ...options, ...choices, ...(endpoint === null ? {} : { endpoint }) },
        );
        return;
    }

    if (how.kind === "sample" && typeof sample.generator === "string") {
        await session.data.generate(sample.generator, (sample.params ?? {}) as GeneratorParams, choices);
        return;
    }

    if (how.kind === "sample" && typeof sample.baseUrl === "string") {
        await session.data.loadDataset(String(sample.dataset), { ...choices, baseUrl: sample.baseUrl });
        return;
    }

    await session.data.import(
        {
            ...(how.type === undefined ? {} : { type: how.type }),
            ...(how.name === undefined ? {} : { name: how.name }),
            config: how.config,
        },
        choices,
    );
}

/**
 * Why a read failed: the address answered that nothing is there, or anything else.
 * @param error - What the read threw.
 * @returns The reason.
 */
function unavailableReason(error: unknown): UnavailableReason {
    if (!(error instanceof GraphtyError)) {
        return "unreadable";
    }

    const { status } = (error.details ?? {}) as { status?: unknown };
    return error.code === "E_UNKNOWN_DATASET" || status === 404 || status === 410 ? "not-found" : "unreadable";
}

/**
 * Whether two records say the same, over every key but the loads column and the computed ones.
 * @param a - One.
 * @param b - The other.
 * @param skip - Keys neither side is compared on.
 * @returns True when they do.
 */
function sameRecord(
    a: Readonly<Record<string, unknown>>,
    b: Readonly<Record<string, unknown>>,
    skip: ReadonlySet<string>,
): boolean {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const key of keys) {
        if (key !== LOADS_KEY && !skip.has(key) && JSON.stringify(a[key]) !== JSON.stringify(b[key])) {
            return false;
        }
    }

    return true;
}

/**
 * The pairs that occur once in a list of edges: only those are matched across a re-read.
 * @param edges - The edges.
 * @param directed - Whether order counts.
 * @returns Each single pair's edge.
 */
function singlePairs<E extends Readonly<Record<string, unknown>>>(
    edges: readonly E[],
    directed: boolean,
): Map<string, E> {
    const seen = new Map<string, E | null>();
    for (const edge of edges) {
        const key = pairKey(String(edge.source), String(edge.target), directed);
        seen.set(key, seen.has(key) ? null : edge);
    }

    return new Map([...seen].filter((entry): entry is [string, E] => entry[1] !== null));
}

/** What a save leaves out of the data member, and what it writes about it. */
export interface LeaveOut {
    /** Each left-out node, with the load it belongs to. */
    readonly nodes: ReadonlyMap<NodeId, SourceKey>;
    /** Each left-out edge, with the load it belongs to. */
    readonly edges: ReadonlyMap<EdgeId, SourceKey>;
    /** The digest of each referenced load's rows as read: its entry's `rowsSha256`. */
    readonly sha256: ReadonlyMap<SourceKey, string>;
    /** The referenced loads that could not be read, saved as copies this time. */
    readonly problems: readonly ReferenceProblem[];
}

/** What planning a save's leave-out reads. */
export interface LeaveOutInput {
    readonly session: GraphSession;
    /** The loads saved as references, with how to read each again. */
    readonly loads: readonly { readonly key: SourceKey; readonly how: LoadHow; readonly ask: boolean }[];
    /** The computed columns' names, which the file never holds. */
    readonly computed: { readonly node: ReadonlySet<string>; readonly edge: ReadonlySet<string> };
    readonly scratch: () => GraphSession;
    readonly network: NetworkApiInternal | undefined;
}

/**
 * Note each of a load's rows that only it supplied and that the graph holds as the load reads it.
 * @param of - The session, the load, its rows as read now, the computed columns, and the graph.
 * @param of.session - The session.
 * @param of.key - The load's key.
 * @param of.read - Its rows as read now.
 * @param of.computed - The computed columns, never compared.
 * @param of.graphNodes - The graph's nodes.
 * @param of.graphEdges - The graph's edges.
 * @param nodes - Collects each such node.
 * @param edges - Collects each such edge.
 */
function markUnchanged(
    of: {
        readonly session: GraphSession;
        readonly key: SourceKey;
        readonly read: ReadRows;
        readonly computed: LeaveOutInput["computed"];
        readonly graphNodes: readonly Readonly<Record<string, unknown>>[];
        readonly graphEdges: readonly (Readonly<Record<string, unknown>> & { readonly id: EdgeId })[];
    },
    nodes: Map<NodeId, SourceKey>,
    edges: Map<EdgeId, SourceKey>,
): void {
    const { session, key, read, computed } = of;
    const only = (keys: readonly SourceKey[]): boolean => keys.length === 1 && keys[0] === key;
    const readNodes = new Map(read.nodes.map((node) => [String(node.id), node]));
    for (const node of of.graphNodes) {
        const id = node.id as NodeId;
        const was = readNodes.get(String(id));
        if (was !== undefined && only(session.data.sourcesOf(id)) && sameRecord(node, was, computed.node)) {
            nodes.set(id, key);
        }
    }

    const readPairs = singlePairs(read.edges, read.directed);
    for (const [pair, edge] of singlePairs(of.graphEdges, read.directed)) {
        const was = readPairs.get(pair);
        const { id, ...record } = edge;
        if (
            was !== undefined &&
            only(session.data.sourcesOf(id, { kind: "edge" })) &&
            sameRecord(record, was, computed.edge)
        ) {
            edges.set(id, key);
        }
    }
}

/**
 * Read each referenced load once and work out which of its rows the file can leave out.
 * ponytail: reads every referenced load on every save (one fetch each); keep the rows read at
 * load or open if saves of large references get slow.
 * @param input - The session, its referenced loads and how to read them.
 * @returns What to leave out.
 */
export async function planLeaveOut(input: LeaveOutInput): Promise<LeaveOut> {
    const { session, computed } = input;
    const nodes = new Map<NodeId, SourceKey>();
    const edges = new Map<EdgeId, SourceKey>();
    const sha256 = new Map<SourceKey, string>();
    const problems: ReferenceProblem[] = [];
    const graphNodes = session.data.nodes({ scope: "graph" });
    const graphEdges = session.data.edges({ scope: "graph" });
    for (const { key, how, ask } of input.loads) {
        const read = await readAsLoaded(how, input.scratch, ask ? input.network : undefined);
        if (typeof read === "string") {
            problems.push({ code: "W_SOURCE_UNAVAILABLE", params: { source: key, reason: read } });
            continue;
        }

        sha256.set(key, read.sha256);
        markUnchanged({ session, key, read, computed, graphNodes, graphEdges }, nodes, edges);
    }

    return { nodes, edges, sha256, problems };
}

/** The entries an open could not read: their rows stay in the graph as bare held rows. */
const UNREAD = new WeakMap<GraphSession, ReadonlySet<string>>();

/**
 * The references the last open could not read. Their rows opened as bare held rows (an id, or a
 * pair), so every member that names them still binds; a save writes each such row, still bare and
 * supplied by that load alone, back as its placeholder, so a reference that comes back fills it.
 * @param session - The session.
 * @returns The entries' ids, which are the loads' keys.
 */
export function unreadLoads(session: GraphSession): ReadonlySet<string> {
    return UNREAD.get(session) ?? new Set();
}

/** What filling an opened file's references did. */
export interface Filled {
    readonly nodes: Record<string, unknown>[];
    readonly links: Record<string, unknown>[];
    readonly problems: ReferenceProblem[];
    /** The entries that could not be read: their rows open bare and are written back as placeholders. */
    readonly unread: ReadonlySet<string>;
    /**
     * Where each of the file's links is in `links`, by the file's position: undefined for a
     * placeholder the load no longer gives. The selection, provenance and runs name edges by the
     * file's positions, so they bind through it. Absent when every link kept its place.
     */
    readonly linkAt?: readonly (number | undefined)[];
}

/** What filling an opened file's references reads. */
export interface FillInput {
    readonly session: GraphSession;
    readonly nodes: readonly Record<string, unknown>[];
    readonly links: readonly Record<string, unknown>[];
    /** The data member, for each load's format, options and choices. */
    readonly data: Readonly<Record<string, unknown>>;
    /** The `graphty-sources` member, if the file holds one. */
    readonly member: Readonly<Record<string, unknown>> | undefined;
    readonly scratch: () => GraphSession;
    readonly network: NetworkApiInternal | undefined;
}

/**
 * How to read an entry of the sources member again.
 * @param entry - The entry.
 * @param data - The data member, whose `sources` holds the load's choices.
 * @returns How to read it.
 */
function howOf(entry: Readonly<Record<string, unknown>>, data: Readonly<Record<string, unknown>>): LoadHow {
    const listed = (Array.isArray(data.sources) ? data.sources : []).find(
        (each: unknown) => isObject(each) && each.key === entry.id,
    ) as Partial<LoadedSource> | undefined;
    const url = isObject(entry.url) ? entry.url.address : undefined;
    const choices = listed?.choices === undefined ? {} : { choices: listed.choices };
    if (isObject(entry.source)) {
        const { source } = entry;
        return {
            kind: "server",
            config: isObject(source.params) ? source.params : {},
            ...choices,
            network: {
                source: String(source.id),
                endpoint: typeof source.endpoint === "string" ? source.endpoint : null,
                options: isObject(entry.options) ? entry.options : {},
            },
        };
    }

    return {
        kind: String(entry.kind),
        ...(typeof entry.format === "string" ? { type: entry.format } : {}),
        ...(typeof entry.name === "string" ? { name: entry.name } : {}),
        config: {
            ...(isObject(entry.options) ? entry.options : {}),
            ...(typeof url === "string" ? { url } : {}),
        },
        ...choices,
        ...(isObject(entry.sample) ? { sample: entry.sample } : {}),
    };
}

/**
 * Read each referenced entry again, noting the ones that could not be read or changed.
 * @param entries - The entries whose rows the file left out.
 * @param input - How to read a load.
 * @param unread - Collects the ids of the entries that could not be read.
 * @param problems - Collects what is reported.
 * @returns Each read entry's records, by id.
 */
async function readEntries(
    entries: readonly Record<string, unknown>[],
    input: FillInput,
    unread: Set<string>,
    problems: ReferenceProblem[],
): Promise<Map<string, ReadRows>> {
    const reads = new Map<string, ReadRows>();
    for (const entry of entries) {
        const id = String(entry.id);
        const read = await readAsLoaded(howOf(entry, input.data), input.scratch, input.network);
        if (typeof read === "string") {
            unread.add(id);
            // The load is not in the opened graph, so its name and address come with the fact.
            const url = isObject(entry.url) && typeof entry.url.address === "string" ? entry.url.address : undefined;
            problems.push({
                code: "W_SOURCE_UNAVAILABLE",
                params: {
                    source: id,
                    reason: read,
                    ...(typeof entry.name === "string" ? { name: entry.name } : {}),
                    ...(url === undefined ? {} : { url }),
                },
            });
            continue;
        }

        reads.set(id, read);
        if (read.sha256 !== entry.rowsSha256) {
            problems.push({ code: "W_SOURCE_CHANGED", params: { source: id } });
        }
    }

    return reads;
}

/**
 * Put back the rows a file left out for its references, reading each referenced load again: each
 * placeholder takes the record the load gives now, in its place. A load that cannot be read is
 * reported, and its placeholders open in their places as bare rows that load supplied, so the
 * positions, runs, selection and edges that name them keep them, and the next save writes them
 * back as placeholders.
 * @param input - The file's records and members, and how to read a load.
 * @returns The records to open, and what was reported.
 */
export async function fillReferences(input: FillInput): Promise<Filled> {
    const { member } = input;
    const unread = new Set<string>();
    const problems: ReferenceProblem[] = [];
    UNREAD.delete(input.session);
    const hasRef = (row: Readonly<Record<string, unknown>>): boolean => typeof row[REF_KEY] === "string";
    if (member?.data !== "references" || ![...input.nodes, ...input.links].some((row) => hasRef(row))) {
        return { nodes: [...input.nodes], links: [...input.links], problems, unread };
    }

    const entries = (Array.isArray(member.loads) ? member.loads : []).filter(
        (entry: unknown): entry is Record<string, unknown> =>
            isObject(entry) && typeof entry.id === "string" && typeof entry.rowsSha256 === "string",
    );
    const reads = await readEntries(entries, input, unread, problems);

    const embeddedIds = new Set(input.nodes.filter((row) => !hasRef(row)).map((row) => String(row.id)));
    const nodesOf = new Map([...reads].map(([id, read]) => [id, new Map(read.nodes.map((n) => [String(n.id), n]))]));
    const pairsOf = new Map([...reads].map(([id, read]) => [id, singlePairs(read.edges, read.directed)]));
    const fill = (
        row: Record<string, unknown>,
        find: (ref: string) => Record<string, unknown> | undefined,
    ): Record<string, unknown>[] => {
        if (!hasRef(row)) {
            return [row];
        }

        const { [REF_KEY]: ref, ...held } = row as Record<string, unknown> & { [REF_KEY]: string };
        if (unread.has(ref)) {
            return [{ ...held, [LOADS_KEY]: [ref] }];
        }

        const found = find(ref);
        return found === undefined ? [] : [{ ...found, [LOADS_KEY]: [ref] }];
    };
    const nodes = input.nodes.flatMap((row) =>
        // A placeholder for an id the file also embeds is dropped: the embedded record wins.
        hasRef(row) && embeddedIds.has(String(row.id)) ? [] : fill(row, (ref) => nodesOf.get(ref)?.get(String(row.id))),
    );
    const links: Record<string, unknown>[] = [];
    const linkAt: (number | undefined)[] = [];
    for (const row of input.links) {
        const kept = fill(row, (ref) => {
            const read = reads.get(ref);
            return read === undefined
                ? undefined
                : pairsOf.get(ref)?.get(pairKey(String(row.source), String(row.target), read.directed));
        });
        linkAt.push(kept.length === 0 ? undefined : links.length);
        links.push(...kept);
    }

    if (unread.size > 0) {
        UNREAD.set(input.session, unread);
    }

    return { nodes, links, problems, unread, ...(links.length === input.links.length ? {} : { linkAt }) };
}
