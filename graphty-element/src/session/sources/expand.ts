/**
 * @file Click-to-expand and collapse through `session.data` (design section 14.4). Experimental.
 *
 * An expansion asks the network source that loaded a node for its neighborhood, merges what comes
 * back with `existing: "update"`, and dispatches the merged rows as one `data.source-expand` step,
 * so undo takes it back and redo never fetches. Each node it touches carries neutral facts under
 * `_source.` (`loads`, `expansion`, `degree`, `hidden`, `next`); the element ships no style for
 * them. A collapse removes what one node's expansions alone brought, keeping pinned and edited
 * nodes and saying so.
 */

import { expandFromSource, type ImportGraphResult, type SourceCursor } from "@graphty/graph-io";

import type { EdgeId, NodeId } from "../../catalog/types";
import { columnsMapping, sourceGraph, toRecords } from "../../data/graph-io-import";
import { GraphtyError } from "../../errors/GraphtyError";
import type { SourceCollapseCommand, SourceExpandCommand } from "../commands/source-expand";
import type { CodedFact, CodedFactParam } from "../shared";
import { resolve as storedCredential } from "./credentialLookup";
import { notYetRun, toGraphtyError } from "./errors";
import type { SourceHost } from "./host";
import { isSourceFactKey, sourceFactKeys, sourceFactsOf, sourceLoadsOf } from "./ids";
import type { CollapseResult, ExpandOptions, SourceExpandResult, SourceLoadRecord } from "./types";

/** How far from its seed a new node starts, in scene units. */
const START_RADIUS = 6;

/** The keys an edit check ignores: what the element itself writes on a node. */
const NOT_EDITS = new Set(["id", "position"]);

/**
 * A small deterministic hash, so a node starts at the same place whenever its expansion is replayed.
 * @param text - what to hash
 * @returns a number in [0, 1)
 */
function unitHash(text: string): number {
    let hash = 2166136261;
    for (let i = 0; i < text.length; i++) {
        hash = Math.imul(hash ^ text.charCodeAt(i), 16777619); // NOSONAR(S7758): hashes UTF-16 code units on purpose; code points would move existing seeds
    }

    // FNV-1a alone moves the high bits little for a change in the last character, so keys that
    // differ only at the end ("load-1/x1", "load-1/x2") started their nodes 1.4 degrees apart, one
    // expansion drawn on top of the other. A final avalanche (murmur3's fmix32) spreads them.
    hash ^= hash >>> 16;
    hash = Math.imul(hash, 0x85ebca6b);
    hash ^= hash >>> 13;
    hash = Math.imul(hash, 0xc2b2ae35);
    hash ^= hash >>> 16;
    return (hash >>> 0) / 4294967296;
}

/**
 * A record's attributes as the reader could have changed them, in a stable form.
 * @param record - the record
 * @returns its JSON, keys sorted, without the element's own keys
 */
function editable(record: Readonly<Record<string, unknown>>): string {
    const keys = Object.keys(record)
        .filter((key) => !NOT_EDITS.has(key) && !isSourceFactKey(key))
        .sort((a, b) => (a < b ? -1 : 1)); // keys are unique; code-unit order, independent of locale
    return JSON.stringify(keys.map((key) => [key, record[key]]));
}

/**
 * The refusal of a node no source loaded.
 * @param ids - the nodes
 * @returns the error
 */
function notFromSource(ids: readonly NodeId[]): GraphtyError {
    return new GraphtyError({
        code: "E_SOURCE_UNSUPPORTED",
        message: "Only a node a network source loaded can be expanded from it.",
        source: "data",
        details: { feature: "expand", ids: ids.map(String) },
    });
}

/**
 * The refusal of an id the graph does not hold.
 * @param id - the id
 * @returns the error
 */
function unknownNode(id: NodeId): GraphtyError {
    return new GraphtyError({
        code: "E_UNKNOWN_ELEMENT",
        message: `The graph holds no node ${String(id)}.`,
        source: "data",
        details: { kind: "node", id },
    });
}

/**
 * What an event can carry of an error's details: scalars and lists of scalars.
 * @param details - the details
 * @returns the params
 */
export function factParams(details: unknown): Record<string, CodedFactParam> {
    const params: Record<string, CodedFactParam> = {};
    for (const [key, value] of Object.entries((details as Record<string, unknown> | undefined) ?? {})) {
        const scalar = (v: unknown): boolean => v === null || ["string", "number", "boolean"].includes(typeof v);
        if (scalar(value) || (Array.isArray(value) && value.every(scalar))) {
            params[key] = value as CodedFactParam;
        }
    }

    return params;
}

/**
 * The origin of a recorded endpoint.
 * @param endpoint - origin and path, or null
 * @returns the origin, or "" when there is none
 */
function originOf(endpoint: string | null): string {
    return endpoint === null ? "" : new URL(endpoint).origin;
}

/**
 * Fetch the neighborhood of nodes from the source that loaded them, as one undoable step. A seed
 * already being expanded joins that expansion instead of starting another.
 * @param host - the session pieces
 * @param ids - the seeds
 * @param options - depth, direction, limit and the credential
 * @returns settles once the neighborhood is in the graph
 */
export async function expandNodes(
    host: SourceHost,
    ids: readonly NodeId[],
    options: ExpandOptions,
): Promise<SourceExpandResult> {
    const { running } = host.expansions;
    const joined: Promise<Added>[] = [];
    const fresh: NodeId[] = [];
    for (const id of ids) {
        const current = running.get(String(id));
        if (current === undefined) {
            fresh.push(id);
        } else {
            joined.push(current);
        }
    }

    if (fresh.length > 0) {
        const run = expandFresh(host, fresh, options);
        const settled = run.catch(() => undefined);
        for (const id of fresh) {
            running.set(String(id), run);
        }

        void settled.then(() => {
            for (const id of fresh) {
                if (running.get(String(id)) === run) {
                    running.delete(String(id));
                }
            }
        });
        joined.push(run);
    }

    // An expansion joined twice (two of its seeds asked again) counts once.
    const added = [...new Set(await Promise.all(joined))];
    const nodes = added.reduce((sum, each) => sum + each.nodes, 0);
    const edges = added.reduce((sum, each) => sum + each.edges, 0);
    return Object.freeze({
        code: nodes + edges > 0 ? ("I_SOURCE_EXPANDED" as const) : ("I_SOURCE_NOTHING_NEW" as const),
        params: { seeds: ids.map(String), added: [nodes, edges], partial: added.some((each) => each.partial) },
    });
}

/** What one expansion run added, and whether it has more. */
interface Added {
    readonly nodes: number;
    readonly edges: number;
    readonly partial: boolean;
}

/**
 * Expand seeds no expansion is running for: one fetch per source load they came from.
 * @param host - the session pieces
 * @param ids - the seeds
 * @param options - the options
 * @returns what the expansions added
 */
async function expandFresh(host: SourceHost, ids: readonly NodeId[], options: ExpandOptions): Promise<Added> {
    const groups = new Map<string, { load: SourceLoadRecord; seeds: NodeId[] }>();
    for (const id of ids) {
        const record = host.node(id);
        if (record === undefined) {
            throw unknownNode(id);
        }

        const load = host.ledger.loadOf(sourceLoadsOf(record));
        // A load an opened project holds fetches nothing until the application ran it.
        if (load === undefined || host.pending.has(load.key)) {
            const error = load === undefined ? notFromSource([record.id]) : notYetRun(load.key);
            host.emit("source:expand-failed", { code: error.code, params: factParams(error.details) });
            throw error;
        }

        const group = groups.get(load.key) ?? { load, seeds: [] };
        group.seeds.push(record.id);
        groups.set(load.key, group);
    }

    const total = { nodes: 0, edges: 0, partial: false };
    for (const { load, seeds } of groups.values()) {
        const added = await expandGroup(host, load, seeds, options);
        total.nodes += added.nodes;
        total.edges += added.edges;
        total.partial ||= added.partial;
    }

    return total;
}

/**
 * Fetch and merge one group of seeds from one source load.
 * @param host - the session pieces
 * @param load - the load they came from
 * @param seeds - the seeds
 * @param options - the options
 * @returns what the expansion added
 */
async function expandGroup(
    host: SourceHost,
    load: SourceLoadRecord,
    seeds: readonly NodeId[],
    options: ExpandOptions,
): Promise<Added> {
    host.emit("source:expand-start", { seeds });
    // A capped expansion of one node continues from where it stopped.
    const facts = seeds.length === 1 ? sourceFactsOf(host.node(seeds[0])) : {};
    const cursor = facts.expansion === "partial" ? (facts.next as SourceCursor | null | undefined) : undefined;
    const credential = options.credential ?? (await storedCredential(host.owner, load.source, originOf(load.endpoint)));

    let fetched: ImportGraphResult;
    try {
        fetched = await expandFromSource(
            load.source,
            {
                params: load.config,
                ids: seeds,
                ...definedOnly({
                    depth: options.depth,
                    direction: options.direction,
                    limit: options.limit,
                    relationshipTypes: options.relationshipTypes,
                }),
            },
            definedOnly({
                endpoint: load.endpoint ?? undefined,
                credential,
                cursor: cursor ?? undefined,
                signal: options.signal,
                fetch: options.fetch,
            }),
        );
    } catch (error) {
        const thrown = toGraphtyError(error);
        const coded = thrown instanceof GraphtyError ? thrown : null;
        host.emit("source:expand-failed", {
            code: coded?.code ?? "E_SOURCE_RESPONSE",
            params: factParams(coded?.details),
        });
        throw thrown;
    }

    const next = fetched.report.source?.next ?? null;
    const expansion = host.ledger.addExpansion(load.key, {
        ids: seeds,
        ...definedOnly({ depth: options.depth, direction: options.direction, limit: options.limit }),
        next,
    });
    const command = mergeCommand(host, fetched, expansion.key, seeds, next, options.layout ?? "continue");
    const before = host.edges().length;
    await host.dispatch(command);
    const added = { nodes: command.nodes.length, edges: host.edges().length - before, partial: next !== null };
    host.emit("source:expanded", {
        code: "I_SOURCE_EXPANDED",
        params: { seeds: seeds.map(String), added: [added.nodes, added.edges], partial: added.partial },
    });
    return added;
}

/**
 * Where a new node starts: on a ring around its seed, the expansion's new nodes spread evenly from
 * an angle its key decides, so a replay places them the same way.
 * @param host - the session pieces
 * @param seed - the seed
 * @param key - the expansion's key
 * @param slot - which of the expansion's new nodes this is
 * @param count - how many new nodes the expansion brings
 * @returns the record position in record units, or undefined while the seed is unplaced
 */
function startNear(
    host: SourceHost,
    seed: NodeId,
    key: string,
    slot: number,
    count: number,
): { x: number; y: number; z: number } | undefined {
    const { at } = host.placement(seed);
    if (at === null) {
        return undefined;
    }

    const angle = (unitHash(key) + slot / count) * 2 * Math.PI;
    const scale = host.positionScale();
    return {
        x: (at.x + START_RADIUS * Math.cos(angle)) / scale,
        y: (at.y + START_RADIUS * Math.sin(angle)) / scale,
        z: at.z / scale,
    };
}

/**
 * Merge what an expansion fetched with the graph held now, as the rows of one command.
 * @param host - the session pieces
 * @param fetched - what the source returned
 * @param key - the expansion's key
 * @param seeds - the seeds
 * @param next - where the expansion continues, or null
 * @param layout - what the layout does
 * @returns the command
 */
function mergeCommand(
    host: SourceHost,
    fetched: ImportGraphResult,
    key: string,
    seeds: readonly NodeId[],
    next: SourceCursor | null,
    layout: "continue" | "none",
): SourceExpandCommand {
    const { snapshot } = fetched;
    const rows = toRecords(sourceGraph(fetched), columnsMapping(snapshot));
    const seedKeys = new Set(seeds.map(String));
    const neighbors = new Map<string, Set<string>>();
    const link = (a: NodeId, b: NodeId): void => {
        const set = neighbors.get(String(a)) ?? new Set<string>();
        set.add(String(b));
        neighbors.set(String(a), set);
    };
    for (const edge of rows.edges) {
        link(edge.source as NodeId, edge.target as NodeId);
        link(edge.target as NodeId, edge.source as NodeId);
    }

    const nodes: Record<string, unknown>[] = [];
    const updates: { id: NodeId; values: Record<string, unknown> }[] = [];
    const written = new Map<string, string>();
    const factsFor = (
        id: NodeId,
        incoming: Record<string, unknown>,
        held: Readonly<Record<string, unknown>> | undefined,
    ): Record<string, unknown> => {
        const facts = { ...sourceFactsOf(held), ...sourceFactsOf(incoming) };
        facts.loads = [...new Set([...sourceLoadsOf(held), key])];
        if (seedKeys.has(String(id))) {
            facts.expansion = next === null ? "complete" : "partial";
            facts.next = next;
        } else if (facts.expansion === undefined) {
            facts.expansion = "none";
        }

        const degree = typeof facts.degree === "number" ? facts.degree : null;
        const loaded = new Set([
            ...(held === undefined ? [] : [...host.neighborIds(id)].map(String)),
            ...(neighbors.get(String(id)) ?? []),
        ]);
        facts.degree = degree;
        facts.hidden = degree === null ? null : Math.max(0, degree - loaded.size);
        return facts;
    };

    const freshCount = (rows.nodes as Record<string, unknown>[]).filter(
        (row) => host.node(row.id as NodeId) === undefined,
    ).length;
    // Each new node's slot on the ring, counted in row order (an indexOf per row was quadratic).
    let slot = 0;
    for (const row of rows.nodes as Record<string, unknown>[]) {
        const incoming = Object.fromEntries(Object.entries(row).filter(([name]) => !isSourceFactKey(name)));
        const held = host.node(row.id as NodeId);
        if (held === undefined) {
            const id = row.id as NodeId;
            const position = startNear(host, seeds[0], key, slot++, freshCount);
            const record = {
                ...incoming,
                ...(position === undefined ? {} : { position }),
                ...sourceFactKeys(factsFor(id, row, undefined)),
            };
            nodes.push(record);
            written.set(String(id), editable(record));
        } else {
            const { id: _id, ...attributes } = incoming;
            const values = { ...attributes, ...sourceFactKeys(factsFor(held.id, row, held)) };
            updates.push({ id: held.id, values });
            written.set(String(held.id), editable({ ...held, ...values }));
        }
    }

    // A seed the source did not return still carries what its expansion found.
    for (const seed of seeds) {
        if (!updates.some((update) => String(update.id) === String(seed))) {
            updates.push({ id: seed, values: sourceFactKeys(factsFor(seed, {}, host.node(seed))) });
        }
    }

    host.expansions.written.set(key, written);
    const edges = (rows.edges as Record<string, unknown>[]).map((edge) => ({
        ...edge,
        ...sourceFactKeys({ ...sourceFactsOf(edge), loads: [key] }),
    }));
    return { op: "data.source-expand", key, seeds, nodes, updates, edges, layout };
}

/**
 * An object without its undefined values, so an absent option is left out rather than passed.
 * @param values - the values
 * @returns the defined ones
 */
function definedOnly<T extends Record<string, unknown>>(values: T): { [K in keyof T]?: Exclude<T[K], undefined> } {
    return Object.fromEntries(Object.entries(values).filter(([, value]) => value !== undefined)) as {
        [K in keyof T]?: Exclude<T[K], undefined>;
    };
}

/**
 * Sort the nodes a collapse touches: removed, or kept because they are pinned or edited.
 * @param host - the session pieces
 * @param seedId - the collapsed node
 * @param only - whether a record came only from the seed's expansions
 * @returns the removed and the kept nodes
 */
function collapsedNodes(
    host: SourceHost,
    seedId: NodeId,
    only: (record: Readonly<Record<string, unknown>>) => boolean,
): { removed: NodeId[]; kept: { pinned: NodeId[]; edited: NodeId[] } } {
    const removed: NodeId[] = [];
    const kept = { pinned: [] as NodeId[], edited: [] as NodeId[] };
    for (const nodeId of host.nodeIds()) {
        const record = host.node(nodeId);
        if (record === undefined || String(nodeId) === String(seedId) || !only(record)) {
            continue;
        }

        const key = sourceLoadsOf(record).at(-1) ?? "";
        const wrote = host.expansions.written.get(key)?.get(String(nodeId));
        if (host.placement(nodeId).pinned) {
            kept.pinned.push(nodeId);
        } else if (wrote !== undefined && wrote !== editable(record)) {
            kept.edited.push(nodeId);
        } else {
            removed.push(nodeId);
        }
    }

    return { removed, kept };
}

/**
 * The edges a collapse removes: every edge of a removed node goes with it, and an edge the
 * expansions alone brought goes unless it touches a kept node.
 * @param host - the session pieces
 * @param gone - the removed nodes
 * @param stays - the kept nodes
 * @param only - whether a record came only from the seed's expansions
 * @returns the edges to remove explicitly, and how many edges go in all
 */
function collapsedEdges(
    host: SourceHost,
    gone: ReadonlySet<string>,
    stays: ReadonlySet<string>,
    only: (record: Readonly<Record<string, unknown>>) => boolean,
): { edges: EdgeId[]; removedEdges: number } {
    const edges: EdgeId[] = [];
    let removedEdges = 0;
    for (const edge of host.edges()) {
        if (gone.has(String(edge.source)) || gone.has(String(edge.target))) {
            removedEdges++;
        } else if (only(edge.record) && !stays.has(String(edge.source)) && !stays.has(String(edge.target))) {
            edges.push(edge.id);
            removedEdges++;
        }
    }

    return { edges, removedEdges };
}

/**
 * Remove what a node's expansions alone brought, as one undoable step.
 * @param host - the session pieces
 * @param id - the node
 * @returns what was removed and kept
 */
export async function collapseNode(host: SourceHost, id: NodeId): Promise<CollapseResult> {
    const seed = host.node(id);
    if (seed === undefined) {
        throw unknownNode(id);
    }

    const load = host.ledger.loadOf(sourceLoadsOf(seed));
    if (load === undefined) {
        throw notFromSource([seed.id]);
    }

    const mine = new Set(
        load.expansions.filter((x) => x.ids.some((each) => String(each) === String(seed.id))).map((x) => x.key),
    );
    const only = (record: Readonly<Record<string, unknown>>): boolean => {
        const loads = sourceLoadsOf(record);
        return loads.length > 0 && loads.every((key) => mine.has(key));
    };

    const { removed, kept } = collapsedNodes(host, seed.id, only);
    const gone = new Set(removed.map(String));
    const { edges, removedEdges } = collapsedEdges(
        host,
        gone,
        new Set([...kept.pinned, ...kept.edited].map(String)),
        only,
    );

    const facts = sourceFactsOf(seed);
    const degree = typeof facts.degree === "number" ? facts.degree : null;
    const left = [...host.neighborIds(seed.id)].filter((other) => !gone.has(String(other))).length;
    const command: SourceCollapseCommand = {
        op: "data.collapse",
        seed: seed.id,
        nodes: removed,
        edges,
        update: {
            id: seed.id,
            values: sourceFactKeys({
                expansion: "none",
                next: null,
                hidden: degree === null ? null : Math.max(0, degree - left),
            }),
        },
    };
    await host.dispatch(command);

    const keptFacts: CodedFact<"W_COLLAPSE_KEPT">[] = [];
    for (const [reason, ids] of Object.entries(kept)) {
        if (ids.length > 0) {
            keptFacts.push({ code: "W_COLLAPSE_KEPT", params: { ids: ids.map(String), reason } });
        }
    }

    return { removedNodes: removed, removedEdges, kept: keptFacts };
}
