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

import type { NodeId } from "../../catalog/types";
import { ErrorAggregator } from "../../data/ErrorAggregator";
import { aggregateErrors, columnsMapping, sourceGraph, toRecords } from "../../data/graph-io-import";
import { ensureGraphSamplesSource } from "../../data/graphSamplesSource";
import { GraphtyError } from "../../errors/GraphtyError";
import type { HeldRows } from "../commands/data";
import type { DataImportSourceCommand } from "../commands/source-load";
import { historyMark } from "../loadLine";
import { resolve } from "./credentialLookup";
import { toGraphtyError } from "./errors";
import type { SourceHost } from "./host";
import { SOURCE_ATTR } from "./ids";
import type { PendingSourceLoad, SourceInput, SourceLoadOptions, SourceLoadRecord } from "./types";

/** How many refused rows a source read keeps before it stops counting. */
const ERROR_LIMIT = 100;

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
        ...historyMark(options),
    };
    return host.dispatch(command);
}

/**
 * Load from a source as one undoable step, and record the load.
 * @param host - the session pieces
 * @param input - the source and its params
 * @param options - the load options
 * @returns the load's record
 */
export async function importSource(
    host: SourceHost,
    input: SourceInput,
    options: SourceLoadOptions,
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
        options: options as Readonly<Record<string, unknown>>,
        next: read.info?.next ?? null,
        validators: read.info?.validators ?? {},
        credential: access.credential ?? null,
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
    return importSource(
        host,
        { source, config: sample.params, name: sample.plainName },
        {
            ...(sample.endpoint === undefined ? {} : { endpoint: sample.endpoint }),
            ...(login === undefined ? {} : { credential: credentials.basic(login.username, login.password) }),
            ...options,
        },
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
 * Load the next page after a capped load: the newest load that has more, merged in.
 * @param host - the session pieces
 * @param options - the load options; `mode` is always "merge"
 * @returns settles once the page is drawn, or at once when no load has more
 */
export async function more(host: SourceHost, options: SourceLoadOptions): Promise<void> {
    const record = [...host.loads()].reverse().find((r) => r.next !== null);
    if (!record?.next) {
        return;
    }

    const access = await accessFor(host, record.source, {
        ...options,
        endpoint: options.endpoint ?? record.endpoint ?? undefined,
    });
    const read = await readRows(record.source, record.config, access, { ...options, cursor: record.next });
    await dispatchRows(host, record.key, { source: record.source, config: record.config }, read, {
        ...options,
        mode: "merge",
    });
    host.ledger.refreshLoad(record.key, {
        pages: 1,
        next: read.info?.next ?? null,
        ...(read.info?.validators === undefined ? {} : { validators: read.info.validators }),
        credential: access.credential ?? null,
        endpoint: access.endpoint,
    });
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
        .map((record) =>
            Object.freeze({
                id: record.key,
                source: record.source,
                endpoint: record.endpoint,
                hasQuery: typeof record.config.query === "string" || record.config.mapping !== undefined,
                isLocalNetwork: isLocalNetwork(record.endpoint),
                authRequired: descriptorOf(record.source)?.authRequired ?? "none",
            }),
        );
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
    await dispatchRows(host, record.key, { source: record.source, config }, read, {
        ...readOnly,
        mode: "merge",
        existing: "update",
    });
    host.pending.delete(id);
    host.ledger.refreshLoad(id, {
        next: read.info?.next ?? null,
        ...(read.info?.validators === undefined ? {} : { validators: read.info.validators }),
        credential: access.credential ?? null,
        endpoint: access.endpoint,
    });
}
