/**
 * @file Loading from a network source through `session.data`: `import({ source, config })`, the
 * probe and the search, `more`, and the waiting loads of an opened project.
 *
 * A load reads the source HERE, outside any command, with the credential, then dispatches
 * `data.import-source` carrying the rows it read. So undo and redo replay rows and never fetch,
 * and the credential reaches no command, history step, journal entry, event or project file: the
 * ledger records only who the credential was (design section 14.2).
 */

import {
    type Credential,
    credentials,
    type LoadFromSourceOptions,
    registry,
    SOURCE_FORMAT_PREFIX,
    type SourceDescriptor,
    type SourceListing,
    type SourceListQuery,
    type SourceProbe,
    type SourceReportInfo,
} from "@graphty/graph-io";

import type { EdgeId, NodeId, SourceKey } from "../../catalog/types";
import { ErrorAggregator } from "../../data/ErrorAggregator";
import { aggregateErrors, columnsMapping, sourceGraph, toRecords } from "../../data/graph-io-import";
import { ensureGraphSamplesSource } from "../../data/graphSamplesSource";
import { GraphtyError } from "../../errors/GraphtyError";
import { describeRows } from "../attributes";
import type { HeldRows } from "../commands/data";
import type { DataImportSourceCommand } from "../commands/source-load";
import { historyMark } from "../loadLine";
import type { SessionCommand } from "../planning";
import { pairKey, planReplace } from "../replace";
import type { CodedFact } from "../shared";
import type { RowUpdate } from "../types";
import { resolve } from "./credentialLookup";
import { toGraphtyError } from "./errors";
import { factParams } from "./expand";
import type { SourceHost } from "./host";
import { isSourceFactKey, SOURCE_ATTR, sourceLoadsOf } from "./ids";
import type {
    PendingSourceLoad,
    SourceCheck,
    SourceCounts,
    SourceInput,
    SourceLoadOptions,
    SourceLoadRecord,
    SourceMoreOptions,
    SourcePreview,
    SourcePreviewOptions,
    SourceRefreshReport,
} from "./types";

/** How many refused rows a source read keeps before it stops counting. */
const ERROR_LIMIT = 100;

/** How many nodes a preview shows when the caller names no cap. */
const PREVIEW_NODES = 25;

/**
 * A source's descriptor, read from the registry without loading the source's code.
 * @param id - the source id
 * @returns the descriptor, or undefined for an id no source has
 */
function descriptorOf(id: string): SourceDescriptor | undefined {
    ensureGraphSamplesSource();
    return registry.listSources().find((info) => info.id === id)?.descriptor;
}

/**
 * The scheme, host and port of an endpoint.
 * @param endpoint - the endpoint
 * @returns the origin
 */
function originOf(endpoint: string): string {
    const url = new URL(endpoint);
    return `${url.protocol}//${url.host}`;
}

/** What one read of a source settled: the credential it used and whether it was remembered. */
interface Access {
    readonly endpoint: string | null;
    readonly credential: Credential | undefined;
    readonly stored: boolean;
}

/**
 * The endpoint and the credential a call uses: the caller's, else the remembered one for the
 * source and the endpoint's origin. A source that requires a credential and gets none is refused
 * before any request, with `E_SOURCE_AUTH` (`stored: false`).
 * @param host - the session pieces
 * @param id - the source id
 * @param options - the caller's options
 * @returns the access
 */
async function accessFor(host: SourceHost, id: string, options: SourceLoadOptions): Promise<Access> {
    const descriptor = descriptorOf(id);
    const endpoint = options.endpoint ?? descriptor?.defaultEndpoint ?? null;
    if (options.credential !== undefined) {
        return { endpoint, credential: options.credential, stored: false };
    }

    const remembered = endpoint === null ? undefined : await resolve(host.owner, id, originOf(endpoint));
    if (remembered === undefined && descriptor?.authRequired === "required") {
        throw new GraphtyError({
            code: "E_SOURCE_AUTH",
            message: `The ${id} source needs a credential and none was given or remembered.`,
            source: "data",
            details: {
                origin: endpoint === null ? null : originOf(endpoint),
                status: null,
                scheme: descriptor.auth?.[0] ?? null,
                serverCode: null,
                stored: false,
            },
        });
    }

    return { endpoint, credential: remembered, stored: remembered !== undefined };
}

/**
 * graph-io's options for a call: never `write` unless asked, never anything recorded.
 * @param access - the endpoint and the credential
 * @param options - the caller's options
 * @returns the options
 */
function ioOptions(access: Access, options: SourceLoadOptions): LoadFromSourceOptions {
    return {
        ...(access.endpoint === null ? {} : { endpoint: access.endpoint }),
        ...(access.credential === undefined ? {} : { credential: access.credential }),
        ...(options.limits === undefined ? {} : { limits: options.limits }),
        ...(options.retry === undefined ? {} : { retry: options.retry }),
        ...(options.cursor === undefined ? {} : { cursor: options.cursor }),
        ...(options.signal === undefined ? {} : { signal: options.signal }),
        ...(options.fetch === undefined ? {} : { fetch: options.fetch }),
    };
}

/**
 * Run a graph-io call, turning its coded failure into the element's error.
 * @param access - whether the credential was a remembered one
 * @param work - the call
 * @returns what it returned
 */
async function coded<T>(access: Access, work: () => Promise<T>): Promise<T> {
    try {
        return await work();
    } catch (error) {
        throw toGraphtyError(error, { stored: access.stored });
    }
}

/** What reading a source produced: the rows and graph-io's facts about the read. */
interface Read {
    readonly held: HeldRows;
    readonly info: SourceReportInfo | undefined;
    /** graph-io's issues, as codes and params. */
    readonly issues: readonly CodedFact[];
}

/**
 * Read a source into rows, outside any command.
 * @param id - the source id
 * @param config - its params
 * @param access - the endpoint and the credential
 * @param options - the caller's options
 * @returns the rows
 */
async function readRows(
    id: string,
    config: Readonly<Record<string, unknown>>,
    access: Access,
    options: SourceLoadOptions,
): Promise<Read> {
    const loaded = await coded(access, () => registry.loadFromSource(id, config, ioOptions(access, options)));
    const { snapshot, report } = loaded;
    const { nodes, edges } = toRecords(sourceGraph(loaded), columnsMapping(snapshot));
    const errors = new ErrorAggregator(ERROR_LIMIT);
    aggregateErrors(report, errors);
    return {
        held: {
            nodes,
            edges,
            // ponytail: the direction a source declares is not passed on yet; add it once a source
            // states one in its report.
            declaredDirection: null,
            errors: errors.getErrors(),
            errorLimit: ERROR_LIMIT,
            idPath: "id",
            source: "source",
            target: "target",
        },
        info: report.source,
        issues: report.issues.map((issue) => ({ code: issue.code, params: factParams(issue.params) })),
    };
}

/**
 * Dispatch the rows as one undoable step.
 * @param host - the session pieces
 * @param key - the key of the load the rows belong to
 * @param input - the source and its params
 * @param read - the rows
 * @param options - the load choices
 * @returns settles once they are drawn
 */
function dispatchRows(
    host: SourceHost,
    key: string,
    input: SourceInput,
    read: Read,
    options: SourceLoadOptions,
): Promise<unknown> {
    return host.dispatch(importCommand(host, key, input, read, options));
}

/**
 * The choices of a merge that adds to a load the graph lists already (a next page, a refresh, a
 * waiting load run again), so its rows count under that load's `data.sources()` entry.
 * @param host - the session pieces
 * @param load - the load's key
 * @returns the entry's key, when the graph lists one for the load
 */
function sameEntry(host: SourceHost, load: string): { sourceKey?: SourceKey } {
    const sourceKey = host.sourceKeyOf(load);
    return sourceKey === undefined ? {} : { sourceKey };
}

/**
 * The step that loads a read's rows, each stamped with the load that brought it.
 * @param host - the session pieces
 * @param key - the key of the load the rows belong to
 * @param input - the source and its params
 * @param read - the rows
 * @param options - the load choices
 * @returns the command
 */
function importCommand(
    host: SourceHost,
    key: string,
    input: SourceInput,
    read: Read,
    options: SourceLoadOptions & { readonly sourceKey?: SourceKey },
): DataImportSourceCommand {
    // Every row names the load that brought it, so expand, collapse and refresh can find its source.
    // ponytail: a merge that keeps or replaces an existing row's `_source.loads` does not union the
    // keys; union them here if a row two loads bring must answer to both.
    const stamp = (row: Record<string, unknown>): Record<string, unknown> => ({ ...row, [SOURCE_ATTR.loads]: [key] });
    const merge = options.mode === "merge";
    // A node no expansion has fetched around reads "none" (design section 14.4); a merge keeps
    // what an earlier expansion found about a node already there.
    const stampNode = (row: Record<string, unknown>): Record<string, unknown> => ({
        [SOURCE_ATTR.expansion]: (merge ? host.node(row.id as NodeId)?.[SOURCE_ATTR.expansion] : undefined) ?? "none",
        ...stamp(row),
    });
    const held: HeldRows = {
        ...read.held,
        nodes: read.held.nodes.map(stampNode),
        edges: read.held.edges.map(stamp),
        // A merge re-reads edges the graph may already hold (a next page, a rerun of a saved load):
        // one per pair, as an expansion does. ponytail: also folds a real parallel edge the source
        // returns again; match on the source's edge id instead if parallel edges matter.
        ...(merge ? { repeated: "first" as const } : {}),
    };
    const command: DataImportSourceCommand = {
        op: "data.import-source",
        source: {
            type: `${SOURCE_FORMAT_PREFIX}${input.source}`,
            config: input.config,
            ...(input.name === undefined ? {} : { name: input.name }),
        },
        mode: options.mode ?? "replace",
        held,
        ...(options.layout === undefined ? {} : { layout: options.layout }),
        ...(options.existing === undefined ? {} : { existing: options.existing }),
        ...(options.unmatched === undefined ? {} : { unmatched: options.unmatched }),
        ...(options.duplicateIds === undefined ? {} : { duplicateIds: options.duplicateIds }),
        ...(options.sourceKey === undefined ? {} : { key: options.sourceKey }),
        ...historyMark(options),
    };
    return command;
}

/**
 * How many nodes the source holds for a read: what the source counted, else what it read when the
 * read is complete, else what the caller knew.
 * @param read - the read
 * @param known - what the caller knew
 * @returns `{ total }`, or nothing when none tells
 */
function totalOf(read: Read, known: number | undefined): { total?: number } {
    const counted = read.info?.total?.nodes;
    if (counted !== undefined) {
        return { total: counted };
    }

    if ((read.info?.next ?? null) === null) {
        return { total: read.held.nodes.length };
    }

    return known === undefined ? {} : { total: known };
}

/**
 * Load from a source as one undoable step, and record the load.
 * @param host - the session pieces
 * @param input - the source and its params
 * @param options - the load options
 * @param total - how many nodes the source holds, when the caller knows (a sample's count)
 * @returns the load's record
 */
export async function importSource(
    host: SourceHost,
    input: SourceInput,
    options: SourceLoadOptions,
    total?: number,
): Promise<SourceLoadRecord> {
    const access = await accessFor(host, input.source, options);
    const read = await readRows(input.source, input.config, access, options);
    // A load asked for earlier dispatches first, however long it spends reading (issue #3382).
    await host.waitTurn?.();
    // Recorded as the step is dispatched, so a consumer that hears the step finds the record; put
    // back as it was when the step fails.
    const before = host.ledger.toMember();
    const pendingBefore = [...host.pending];
    if ((options.mode ?? "replace") === "replace") {
        host.pending.clear();
    }

    // The ledger keeps every record; `data.loads()` lists the ones whose rows the graph holds, so
    // undoing this load (or the load it replaces) takes its record away (or back) with the rows.
    const record = host.ledger.addLoad({
        source: input.source,
        version: read.info?.version ?? descriptorOf(input.source)?.version ?? 1,
        config: input.config,
        endpoint: read.info?.endpoint ?? access.endpoint,
        // The ledger keeps only the recordable choices; the credential and `write` never reach it.
        // The mode is the one the load ran with, as an opened project's record says it.
        options: { ...options, mode: options.mode ?? "replace" },
        next: read.info?.next ?? null,
        validators: read.info?.validators ?? {},
        credential: access.credential ?? null,
        ...totalOf(read, total),
        ...(options.expand === undefined ? {} : { expand: options.expand }),
    });
    try {
        await dispatchRows(host, record.key, input, read, options);
    } catch (error) {
        host.ledger.fromMember(before);
        host.pending.clear();
        for (const key of pendingBefore) {
            host.pending.add(key);
        }

        throw error;
    }

    return record;
}

/**
 * Load a public sample a registered source lists: its params, endpoint and published login.
 * @param host - the session pieces
 * @param id - the sample's id
 * @param options - the load options; a credential or endpoint given here wins
 * @returns the load's record
 */
export function loadSample(host: SourceHost, id: string, options: SourceLoadOptions): Promise<SourceLoadRecord> {
    ensureGraphSamplesSource();
    const listed = registry
        .listSources()
        .flatMap((info) => (info.descriptor.samples ?? []).map((sample) => ({ source: info.id, sample })));
    const found = listed.find((entry) => entry.sample.id === id);
    if (found === undefined) {
        return Promise.reject(
            new GraphtyError({
                code: "E_SOURCE_UNKNOWN",
                message: `No registered source lists a sample with id ${JSON.stringify(id)}.`,
                source: "data",
                details: { id, known: listed.map((entry) => entry.sample.id) },
            }),
        );
    }

    const { source, sample } = found;
    const login = sample.publicLogin;
    // A sample too big to load whole starts with the first page its descriptor names; `more` reads on.
    const firstPage =
        sample.firstPage === undefined ? {} : { limits: { maxNodes: sample.firstPage, onLimit: "stop" as const } };
    return importSource(
        host,
        { source, config: sample.params, name: sample.plainName },
        {
            ...(sample.endpoint === undefined ? {} : { endpoint: sample.endpoint }),
            ...(login === undefined ? {} : { credential: credentials.basic(login.username, login.password) }),
            ...firstPage,
            ...options,
        },
        sample.counts?.nodes,
    );
}

/**
 * Check a source's params and credential.
 * @param host - the session pieces
 * @param input - the source and its params
 * @param options - the credential and endpoint
 * @returns what the service said
 */
export async function testSource(
    host: SourceHost,
    input: SourceInput,
    options: SourceLoadOptions,
): Promise<SourceProbe> {
    const access = await accessFor(host, input.source, options);
    return coded(access, () => registry.probeSource(input.source, input.config, ioOptions(access, options)));
}

/**
 * Search what a source holds.
 * @param host - the session pieces
 * @param input - the source and its params
 * @param query - the search
 * @param options - the credential and endpoint
 * @returns one page of neutral rows
 */
export async function listSource(
    host: SourceHost,
    input: SourceInput,
    query: Omit<SourceListQuery<Record<string, unknown>>, "params">,
    options: SourceLoadOptions,
): Promise<SourceListing> {
    const access = await accessFor(host, input.source, options);
    return coded(access, () =>
        registry.listFromSource(input.source, { ...query, params: input.config }, ioOptions(access, options)),
    );
}

/**
 * Load the next page after a capped load, merged in: the chosen load, else the newest load that
 * has more. The load's own caps apply again unless the caller gives others.
 * @param host - the session pieces
 * @param options - the load options and the load; `mode` is always "merge"
 * @returns settles once the page is drawn, or at once when the load has no more
 */
export async function more(host: SourceHost, options: SourceMoreOptions): Promise<void> {
    const { load, ...rest } = options;
    const loads = host.loads();
    const record = load === undefined ? [...loads].reverse().find((r) => r.next !== null) : requireLoad(host, load);
    if (!record?.next) {
        return;
    }

    const saved = record.options as Pick<SourceLoadOptions, "limits">;
    const access = await accessFor(host, record.source, {
        ...rest,
        endpoint: rest.endpoint ?? record.endpoint ?? undefined,
    });
    const read = await readRows(record.source, record.config, access, {
        ...(saved.limits === undefined ? {} : { limits: saved.limits }),
        ...rest,
        cursor: record.next,
    });
    await host.dispatch(
        importCommand(host, record.key, { source: record.source, config: record.config }, read, {
            ...rest,
            mode: "merge",
            ...sameEntry(host, record.key),
        }),
    );
    host.ledger.refreshLoad(record.key, {
        pages: 1,
        next: read.info?.next ?? null,
        ...(read.info?.validators === undefined ? {} : { validators: read.info.validators }),
        credential: access.credential ?? null,
        endpoint: access.endpoint,
        // A count the source ran replaces the total; a page read on from a cursor counts nothing,
        // so the total is kept. A capped Cypher query reruns from the start, so its last page
        // holds every row.
        ...((read.info?.next ?? null) === null && record.next.rows !== undefined
            ? { total: read.held.nodes.length }
            : {}),
        ...(read.info?.total?.nodes === undefined ? {} : { total: read.info.total.nodes }),
    });
}

/**
 * A load the graph holds, by key.
 * @param host - the session pieces
 * @param key - the load's key
 * @returns the record
 * @throws A `GraphtyError` with `E_SOURCE_UNKNOWN` for a key `data.loads()` does not list.
 */
function requireLoad(host: SourceHost, key: string): SourceLoadRecord {
    const loads = host.loads();
    const record = loads.find((r) => r.key === key);
    if (record === undefined) {
        throw new GraphtyError({
            code: "E_SOURCE_UNKNOWN",
            message: `No source load the graph holds has key ${JSON.stringify(key)}.`,
            source: "data",
            details: { id: key, known: loads.map((r) => r.key) },
        });
    }

    return record;
}

/**
 * Read a few rows of a source, loading nothing: at most `maxNodes` nodes (the cap is sent to the
 * source, so a database returns no more), the edges between them, their columns, whether there is
 * more, the server's facts and the read's issues.
 * @param host - the session pieces
 * @param input - the source and its params
 * @param options - the cap, the credential and the endpoint
 * @returns the preview
 */
export async function previewSource(
    host: SourceHost,
    input: SourceInput,
    options: SourcePreviewOptions,
): Promise<SourcePreview> {
    const { maxNodes = PREVIEW_NODES, ...rest } = options;
    const access = await accessFor(host, input.source, rest);
    const read = await readRows(input.source, input.config, access, {
        ...rest,
        limits: { ...rest.limits, maxNodes, onLimit: "stop" },
    });
    // The `_source.` facts are the element's bookkeeping, not the source's data.
    const nodes = read.held.nodes.slice(0, maxNodes).map(withoutSourceFacts);
    const kept = new Set(nodes.map((row) => String(row.id)));
    const edges = read.held.edges
        .filter((row) => kept.has(String(row.source)) && kept.has(String(row.target)))
        .map(withoutSourceFacts);
    const facts = { ...read.info?.server };
    return Object.freeze({
        nodes: Object.freeze(nodes),
        rows: Object.freeze(nodes.map((row) => Object.freeze({ id: row.id as NodeId, name: labelOf(row) }))),
        edges: Object.freeze(edges),
        columns: Object.freeze([...describeRows(nodes, "node"), ...describeRows(edges, "edge")]),
        more: (read.info?.next ?? null) !== null || read.held.nodes.length > maxNodes,
        facts: Object.freeze(facts),
        serverFacts: Object.freeze(
            Object.entries(facts).map(([name, value]) => Object.freeze({ code: `source.${name}`, params: { value } })),
        ),
        issues: Object.freeze(read.issues),
    });
}

/**
 * A row without the element's `_source.` facts.
 * @param row - the row
 * @returns a copy without them
 */
function withoutSourceFacts(row: Readonly<Record<string, unknown>>): Readonly<Record<string, unknown>> {
    return Object.freeze(Object.fromEntries(Object.entries(row).filter(([name]) => !isSourceFactKey(name))));
}

/** The columns a preview row's label is read from, first match wins. */
const LABEL_COLUMNS = ["label", "name", "title", "display_name"];

/**
 * A row's label: its first text value among {@link LABEL_COLUMNS}.
 * @param row - the row
 * @returns the label, or null
 */
function labelOf(row: Readonly<Record<string, unknown>>): string | null {
    for (const name of LABEL_COLUMNS) {
        const value = row[name];
        if (typeof value === "string" && value.trim() !== "") {
            return value;
        }
    }

    return null;
}

/**
 * Ask the source whether a load's data changed, loading nothing. A source that cannot tell (no
 * `validate`, or validators it cannot compare) answers null.
 * @param host - the session pieces
 * @param key - the load's key
 * @param options - the credential and the endpoint
 * @returns whether it changed
 */
export async function checkSource(host: SourceHost, key: string, options: SourceLoadOptions): Promise<SourceCheck> {
    const record = requireLoad(host, key);
    if (descriptorOf(record.source)?.features?.includes("validate") !== true) {
        return Object.freeze({ changed: null });
    }

    const access = await accessFor(host, record.source, {
        ...options,
        endpoint: options.endpoint ?? record.endpoint ?? undefined,
    });
    const freshness = await coded(access, () =>
        registry.validateSource(record.source, currentParams(record), record.validators, ioOptions(access, options)),
    );
    return Object.freeze({ changed: freshness.status === "unverifiable" ? null : freshness.status === "changed" });
}

/**
 * Read a load again -- as many pages as it read -- and apply only the difference as one undoable
 * step: what the source dropped goes (unless another load also supplied it), what it changed
 * takes the new values, and what it added arrives. Nothing is dispatched when nothing differs.
 * ponytail: the load's expansions are not fetched again, so what they brought stays as it is;
 * re-run each expansion here if a refresh must also drop what an expansion's source dropped.
 * @param host - the session pieces
 * @param key - the load's key
 * @param options - the credential and the endpoint
 * @returns the counts
 */
export async function refreshSource(
    host: SourceHost,
    key: string,
    options: SourceLoadOptions,
): Promise<SourceRefreshReport> {
    const record = requireLoad(host, key);
    const config = currentParams(record);
    const { write: _write, ...readOnly } = options;
    const saved = record.options as Pick<SourceLoadOptions, "limits">;
    const access = await accessFor(host, record.source, {
        ...readOnly,
        endpoint: options.endpoint ?? record.endpoint ?? undefined,
    });
    const read = await readPages(record, config, access, {
        ...(saved.limits === undefined ? {} : { limits: saved.limits }),
        ...readOnly,
    });

    const directed = host.directed();
    const own = (row: Readonly<Record<string, unknown>> | undefined): boolean => sourceLoadsOf(row).includes(key);
    const elsewhere = (row: Readonly<Record<string, unknown>> | undefined): boolean =>
        sourceLoadsOf(row).some((k) => k !== key);
    const nodes = host.nodeIds().flatMap((id) => {
        const row = host.node(id);
        return row !== undefined && own(row) ? [{ id, data: row }] : [];
    });
    const allEdges = host.edges();
    const edges = allEdges
        .filter((edge) => own(edge.record))
        .map((edge) => ({ id: edge.id, source: edge.source, target: edge.target, data: edge.record }));
    const graphPairs = new Set(allEdges.map((edge) => pairKey(edge.source, edge.target, directed)));
    const plan = planReplace({
        nodes,
        edges,
        shared: {
            nodes: new Set(nodes.filter((each) => elsewhere(each.data)).map((each) => each.id)),
            edges: new Set(edges.filter((each) => elsewhere(each.data)).map((each) => each.id)),
        },
        graphPairs,
        hasNode: (id) => host.node(id) !== undefined,
        directed,
        held: read.held,
        paths: { nodeId: "id", source: "source", target: "target" },
    });
    const added = Object.freeze({ nodes: plan.nodes.added, edges: plan.edges.added });
    const removed = Object.freeze({ nodes: plan.nodes.removed, edges: plan.edges.removed });
    const updated = Object.freeze({ nodes: plan.nodes.changed, edges: plan.edges.changed });
    const counted: readonly SourceCounts[] = [added, removed, updated];
    const changed = counted.some((counts) => counts.nodes + counts.edges > 0);
    const pair = (counts: SourceCounts): number[] => [counts.nodes, counts.edges];
    const report: SourceRefreshReport = Object.freeze({
        added,
        removed,
        updated,
        fact: Object.freeze({
            code: changed ? ("I_SOURCE_REFRESHED" as const) : ("I_SOURCE_UNCHANGED" as const),
            params: { added: pair(added), removed: pair(removed), updated: pair(updated) },
        }),
    });

    if (changed) {
        await host.dispatch(refreshBatch(host, record, config, read, plan, report));
    }

    host.ledger.refreshLoad(key, {
        next: read.info?.next ?? null,
        ...(read.info?.validators === undefined ? {} : { validators: read.info.validators }),
        credential: access.credential ?? null,
        endpoint: access.endpoint,
        ...totalOf(read, record.total),
    });
    return report;
}

/**
 * Read as many pages of a load as it read before.
 * @param record - the load
 * @param config - its params, as the source takes them now
 * @param access - the endpoint and the credential
 * @param options - the read options
 * @returns every page's rows together, and the last page's facts
 */
async function readPages(
    record: SourceLoadRecord,
    config: Readonly<Record<string, unknown>>,
    access: Access,
    options: SourceLoadOptions,
): Promise<Read> {
    let read = await readRows(record.source, config, access, options);
    for (let page = 1; page < record.pages && read.info?.next; page++) {
        const next = await readRows(record.source, config, access, { ...options, cursor: read.info.next });
        // ponytail: a capped Cypher query's next page holds every earlier row again; the repeats
        // match by id and pair and change nothing.
        read = {
            held: {
                ...next.held,
                nodes: [...read.held.nodes, ...next.held.nodes],
                edges: [...read.held.edges, ...next.held.edges],
            },
            info: next.info,
            issues: [...read.issues, ...next.issues],
        };
    }

    return read;
}

/**
 * The one step a refresh dispatches: the removals, the new values, and the new rows merged in
 * under the load's key.
 * @param host - the session pieces
 * @param record - the load
 * @param config - its params
 * @param read - what the source holds now
 * @param plan - what differs
 * @param report - the counts
 * @returns the batch
 */
function refreshBatch(
    host: SourceHost,
    record: SourceLoadRecord,
    config: Readonly<Record<string, unknown>>,
    read: Read,
    plan: ReturnType<typeof planReplace>,
    report: SourceRefreshReport,
): SessionCommand {
    const directed = host.directed();
    const graphPairs = new Set(host.edges().map((edge) => pairKey(edge.source, edge.target, directed)));
    const newNodes = read.held.nodes.filter((row) => host.node(row.id as NodeId) === undefined);
    const newEdges = read.held.edges.filter(
        (row) => !graphPairs.has(pairKey(String(row.source), String(row.target), directed)),
    );
    const update = (target: "node" | "edge", rows: readonly RowUpdate<NodeId | EdgeId>[]): SessionCommand[] =>
        rows.length === 0 ? [] : [{ op: "data.apply", mutation: { kind: "update-rows", target, rows: [...rows] } }];
    const steps: SessionCommand[] = [
        ...(plan.removeEdges.length === 0
            ? []
            : [{ op: "data.apply", mutation: { kind: "remove-edges", ids: [...plan.removeEdges] } } as const]),
        ...(plan.removeNodes.length === 0
            ? []
            : [{ op: "data.apply", mutation: { kind: "remove-nodes", ids: [...plan.removeNodes] } } as const]),
        ...update("edge", plan.edgeRows),
        ...update("node", plan.nodeRows),
    ];
    if (newNodes.length > 0 || newEdges.length > 0) {
        steps.push(
            importCommand(
                host,
                record.key,
                { source: record.source, config },
                { ...read, held: { ...read.held, nodes: newNodes, edges: newEdges } },
                { mode: "merge", ...sameEntry(host, record.key) },
            ),
        );
    }

    const name = typeof record.config.name === "string" ? record.config.name : record.source;
    return {
        op: "batch",
        label: `Refreshed ${name}`,
        // A refresh is a replacement of the load by its newer copy, so it reports as one.
        fact: {
            code: "data.replace-source",
            params: {
                key: record.key,
                name,
                added: report.added.nodes + report.added.edges,
                removed: report.removed.nodes + report.removed.edges,
                changed: report.updated.nodes + report.updated.edges,
            },
        },
        steps,
    };
}

/**
 * Whether an endpoint is on this machine or a local network.
 * @param endpoint - the endpoint, or null
 * @returns true for loopback, RFC 1918 and `.local` hosts
 */
function isLocalNetwork(endpoint: string | null): boolean {
    if (endpoint === null) {
        return false;
    }

    const host = new URL(endpoint).hostname.replaceAll(/(?:^\[)|(?:\]$)/g, "");
    return (
        host === "localhost" ||
        host === "::1" ||
        host.endsWith(".local") ||
        host.startsWith("127.") ||
        host.startsWith("10.") ||
        host.startsWith("192.168.") ||
        /^172\.(1[6-9]|2\d|3[01])\./.test(host)
    );
}

/**
 * The source loads an opened project holds but has not run.
 * @param host - the session pieces
 * @returns one entry per waiting load
 */
export function pendingSourceLoads(host: SourceHost): readonly PendingSourceLoad[] {
    return host.ledger
        .loads()
        .filter((record) => host.pending.has(record.key))
        .map((record) => {
            const slot = host.credentialSlotOf(record.key);
            return Object.freeze({
                id: record.key,
                source: record.source,
                endpoint: record.endpoint,
                hasQuery: typeof record.config.query === "string" || record.config.mapping !== undefined,
                isLocalNetwork: isLocalNetwork(record.endpoint),
                authRequired: descriptorOf(record.source)?.authRequired ?? "none",
                ...(slot === undefined ? {} : { credentialSlot: slot }),
            });
        });
}

/**
 * A saved record's params for the source as registered now: the same version as is, an older one
 * through the descriptor's `migrateParams`, anything else refused (`E_SOURCE_PARAM`,
 * `reason: "stale-params"`).
 * @param record - the saved record
 * @returns the params
 */
function currentParams(record: SourceLoadRecord): Readonly<Record<string, unknown>> {
    const descriptor = descriptorOf(record.source);
    const version = descriptor?.version ?? 1;
    if (record.version === version) {
        return record.config;
    }

    if (record.version < version && descriptor?.migrateParams !== undefined) {
        return descriptor.migrateParams({ ...record.config }, record.version);
    }

    throw new GraphtyError({
        code: "E_SOURCE_PARAM",
        message: `The saved ${record.source} load is version ${String(record.version)}; the source is version ${String(version)}.`,
        source: "data",
        details: { name: "version", reason: "stale-params", found: record.version, needs: version },
    });
}

/**
 * Run one waiting load of an opened project, read-only: it fetches again and merges, updating the
 * nodes already there, and keeps its key.
 * @param host - the session pieces
 * @param id - the load's key
 * @param options - the credential, and anything else a load takes except `write`
 * @returns settles once it is loaded
 */
export async function runPendingSourceLoad(host: SourceHost, id: string, options: SourceLoadOptions): Promise<void> {
    const record = host.ledger.loads().find((r) => r.key === id);
    if (record === undefined || !host.pending.has(id)) {
        throw new GraphtyError({
            code: "E_SOURCE_PARAM",
            message: `No waiting source load has the key ${id}.`,
            source: "data",
            details: { name: "id", reason: "unknown", value: id },
        });
    }

    const config = currentParams(record);
    const { write: _write, ...readOnly } = options;
    const saved = record.options as Pick<SourceLoadOptions, "limits">;
    const access = await accessFor(host, record.source, {
        ...readOnly,
        endpoint: options.endpoint ?? record.endpoint ?? undefined,
    });
    const read = await readRows(record.source, config, access, {
        ...(saved.limits === undefined ? {} : { limits: saved.limits }),
        ...readOnly,
    });
    await host.dispatch(
        importCommand(host, record.key, { source: record.source, config }, read, {
            ...readOnly,
            mode: "merge",
            existing: "update",
            ...sameEntry(host, record.key),
        }),
    );
    host.pending.delete(id);
    host.ledger.refreshLoad(id, {
        next: read.info?.next ?? null,
        ...(read.info?.validators === undefined ? {} : { validators: read.info.validators }),
        credential: access.credential ?? null,
        endpoint: access.endpoint,
    });
}
