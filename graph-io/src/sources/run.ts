/**
 * Running a source (design sections 2, 3 and 5): the checks before any request, the three read
 * paths (`records` through the record methods, `file` through the format importers, `import`
 * straight into the sink), the caps between pages, `idPrefix`, the versioned cursor, and the
 * report's `source` member. graph-io keeps no state between calls.
 */

import { type GraphSink, INVALID_INDEX, type NodeId, type U32 } from "@graphty/graph-format";

import { MISSING_ID_CODE } from "../common/codes.js";
import { readBytes, throwIfAborted } from "../common/input.js";
import { ImportReportBuilder } from "../common/report.js";
import { readZipDirectory, readZipEntry } from "../common/zip.js";
import { type FormatRegistry } from "../registry.js";
import { SNIFF_HEAD_BYTES } from "../sniff.js";
import { type CommonImportOptions, ImportError, type ImportInput, type ImportReport } from "../types.js";
import { type CreatedContext, createSourceContext, detectRuntime, LimitStop } from "./context.js";
import { originOf } from "./credentials.js";
import { checkParams } from "./define.js";
import { failOn, warnOn } from "./fail.js";
import { SOURCE_FORMAT_PREFIX } from "./ids.js";
import {
    type GraphSource,
    type LoadFromSourceOptions,
    type RecordBatch,
    type SourceCursor,
    type SourceFile,
} from "./types.js";

/** The cursor key graph-io adds, holding the source's descriptor version. */
const CURSOR_VERSION_KEY = "~v";

/** The options that belong to the source functions, never to an importer. */
const SOURCE_OPTION_KEYS: ReadonlySet<string> = new Set([
    "endpoint",
    "credential",
    "cursor",
    "limits",
    "retry",
    "idPrefix",
    "allowInsecure",
    "fetch",
    "userAgent",
    "builder",
    "freeze",
    "onProgress",
    "signal",
]);

/** The statuses whose failure on a later page keeps the pages before it. */
const AUTH_CODES: ReadonlySet<string> = new Set(["E_SOURCE_AUTH", "E_SOURCE_FORBIDDEN"]);

/** What a call needs set up before the source runs. */
interface Prepared {
    /** The load's report. */
    readonly report: ImportReportBuilder;
    /** The context and its controls. */
    readonly created: CreatedContext;
    /** The params with the descriptor's defaults. */
    readonly params: Record<string, unknown>;
    /** The sink wrapper's counters, set once the sink is known. */
    readonly counts: { nodes: Set<number>; edgesAtStart: number; sink: GraphSink | null };
}

/**
 * The report format name of a source load.
 * @param id - the source id
 * @returns `"source:<id>"`
 */
export function sourceFormat(id: string): string {
    return `${SOURCE_FORMAT_PREFIX}${id}`;
}

/**
 * The cursor handed back to the caller: the source's own, with its version added.
 * @param next - the source's cursor
 * @param version - the descriptor version
 * @returns the caller's cursor
 */
export function wrapCursor(next: SourceCursor | null | undefined, version: number): SourceCursor | null {
    return next === null || next === undefined ? null : Object.freeze({ ...next, [CURSOR_VERSION_KEY]: version });
}

/**
 * Check every rule that holds before a request is sent and build the context.
 * @param source - the loaded source
 * @param rawParams - the caller's params
 * @param options - the caller's options
 * @param unit - what progress counts
 * @returns the report, context and params
 */
function prepare(
    source: GraphSource<never>,
    rawParams: Readonly<Record<string, unknown>>,
    options: LoadFromSourceOptions,
    unit: "items" | "bytes",
): Prepared {
    const { descriptor } = source;
    const version = descriptor?.version ?? 1;
    const report = new ImportReportBuilder(sourceFormat(source.id), options.errorLimit ?? 100);
    checkRuntime(source, report);
    checkParams(rawParams, descriptor, report);
    const params: Record<string, unknown> = {};
    for (const p of descriptor?.params ?? []) {
        if (p.default !== undefined) {
            params[p.name] = p.default;
        }
    }
    Object.assign(params, rawParams);

    const endpoint = resolveEndpoint(options.endpoint ?? descriptor?.defaultEndpoint ?? null, report);
    if (options.credential?.origins.length === 0 && endpoint === null) {
        failOn(report, "E_SOURCE_PARAM", "a credential needs an endpoint or its own origins", {
            name: "credential",
            reason: "credential-unbound",
        });
    }
    const cursor = resumeCursor(options.cursor, version, report);

    const counts: Prepared["counts"] = { nodes: new Set<number>(), edgesAtStart: 0, sink: null };
    const created = createSourceContext({
        id: source.id,
        descriptor,
        options,
        report,
        endpoint,
        cursor,
        unit,
        counts: () => ({
            nodes: counts.nodes.size,
            edges: counts.sink === null ? 0 : counts.sink.edgeCount - counts.edgesAtStart,
        }),
    });
    return { report, created, params, counts };
}

/**
 * Refuse a source that cannot run here: a runtime it does not support, or a secure context it needs.
 * @param source - the loaded source
 * @param report - the load's report
 */
function checkRuntime(source: GraphSource<never>, report: ImportReportBuilder): void {
    const { descriptor } = source;
    const runtime = detectRuntime();
    const support = descriptor?.runtimes?.[runtime];
    if (support?.supported === false) {
        failOn(report, "E_SOURCE_RUNTIME", `source ${source.id} cannot run in ${runtime}`, {
            runtime,
            reason: support.reason ?? "unsupported",
        });
    }
    if (
        descriptor?.needs?.secureContext === true &&
        runtime === "browser" &&
        (globalThis as { isSecureContext?: boolean }).isSecureContext === false
    ) {
        failOn(report, "E_SOURCE_RUNTIME", `source ${source.id} needs a secure context`, {
            runtime,
            reason: "needs-secure-context",
        });
    }
}

/**
 * The endpoint as a URL, refusing one that is not a URL or carries a user name or password.
 * @param given - the endpoint given, if any
 * @param report - the load's report
 * @returns the URL, or null without one
 */
function resolveEndpoint(given: string | URL | null, report: ImportReportBuilder): URL | null {
    if (given === null) {
        return null;
    }
    let endpoint: URL;
    try {
        endpoint = new URL(given);
    } catch {
        failOn(report, "E_SOURCE_PARAM", "the endpoint is not a URL", { name: "endpoint", reason: "type" });
    }
    if (endpoint.username !== "" || endpoint.password !== "") {
        failOn(report, "E_SOURCE_PARAM", "the endpoint may not carry a user name or password", {
            name: "endpoint",
            reason: "credentials-in-url",
        });
    }
    return endpoint;
}

/**
 * The source's own cursor from the caller's, refusing one another descriptor version made.
 * @param given - the caller's cursor, if any
 * @param version - the descriptor version
 * @param report - the load's report
 * @returns the source's cursor, or null
 */
function resumeCursor(
    given: SourceCursor | null | undefined,
    version: number,
    report: ImportReportBuilder,
): SourceCursor | null {
    if (given === undefined || given === null) {
        return null;
    }
    const { [CURSOR_VERSION_KEY]: recorded, ...rest } = given;
    if (recorded !== undefined && recorded !== version) {
        failOn(report, "E_SOURCE_PARAM", "the cursor was made by another version of the source", {
            name: "cursor",
            reason: "stale-cursor",
        });
    }
    return Object.freeze(rest);
}

/**
 * Wrap a sink so every node id gets the prefix and the caps can count the distinct nodes written.
 * @param sink - the caller's sink or the builder
 * @param prepared - the call's counters
 * @param prefix - the idPrefix, if any
 * @returns the wrapped sink
 */
export function wrapSink(sink: GraphSink, prepared: Prepared, prefix: string | undefined): GraphSink {
    prepared.counts.sink = sink;
    prepared.counts.edgesAtStart = sink.edgeCount;
    const seen = prepared.counts.nodes;
    const id = (value: NodeId): NodeId => (prefix === undefined || prefix === "" ? value : `${prefix}${String(value)}`);
    const node = (index: number): number => {
        seen.add(index);
        return index;
    };
    // an edge may add its end nodes (addMissingNodes)
    const ends = (edge: number): number => {
        const [a, b] = sink.edgeEndpoints(edge);
        seen.add(a);
        seen.add(b);
        return edge;
    };
    return new Proxy(sink, {
        get(target, key): unknown {
            switch (key) {
                case "addNode":
                    return (v: NodeId): number => node(target.addNode(id(v)));
                case "addNodeRecord":
                    return (v: NodeId, attrs: Readonly<Record<string, unknown>>): number =>
                        node(target.addNodeRecord(id(v), attrs));
                case "addNodes":
                    return (ids: Iterable<NodeId>, out?: U32): U32 => {
                        const result = target.addNodes(Array.from(ids, id), out);
                        result.forEach((i) => seen.add(i));
                        return result;
                    };
                case "addEdge":
                    return (s: NodeId, t: NodeId, w?: number): number => ends(target.addEdge(id(s), id(t), w));
                case "addEdgeRecord":
                    return (
                        s: NodeId,
                        t: NodeId,
                        attrs: Readonly<Record<string, unknown>>,
                        weightKey?: string | null,
                    ): number => ends(target.addEdgeRecord(id(s), id(t), attrs, weightKey));
                case "indexOf":
                    return (v: NodeId): number => target.indexOf(id(v));
                default: {
                    const value = Reflect.get(target, key, target) as unknown;
                    return typeof value === "function" ? (value as (...a: unknown[]) => unknown).bind(target) : value;
                }
            }
        },
    });
}

/**
 * The options a format importer gets from a file source's load.
 * @param options - the caller's options
 * @param signal - the context's signal
 * @returns the importer options
 */
function importerOptions(options: LoadFromSourceOptions, signal: AbortSignal): CommonImportOptions {
    const out: Record<string, unknown> = { signal };
    for (const [key, value] of Object.entries(options)) {
        if (!SOURCE_OPTION_KEYS.has(key)) {
            out[key] = value;
        }
    }
    return out;
}

/**
 * Write graph facts: `name`, `description` and `modified` strings to the graph's meta, any other
 * scalar (but `directed`) as a graph value.
 * @param sink - the sink
 * @param meta - the facts
 */
function writeMeta(sink: GraphSink, meta: Readonly<Record<string, unknown>>): void {
    const patch: Record<string, string> = {};
    for (const [key, value] of Object.entries(meta)) {
        if ((key === "name" || key === "description" || key === "modified") && typeof value === "string") {
            patch[key] = value;
        } else if (
            key !== "directed" &&
            (typeof value === "string" || typeof value === "number" || typeof value === "boolean")
        ) {
            sink.setGraphValue(key, value);
        }
    }
    if (Object.keys(patch).length > 0) {
        sink.setMeta(patch);
    }
}

/**
 * Write one page of records into the sink.
 * @param batch - the page
 * @param sink - the wrapped sink
 * @param source - the source (for its record keys)
 * @param prepared - the call
 * @param first - whether this is the first page
 */
function writeBatch(
    batch: RecordBatch,
    sink: GraphSink,
    source: GraphSource<never>,
    prepared: Prepared,
    first: boolean,
): void {
    const idKey = source.idKey ?? "id";
    const sourceKey = source.sourceKey ?? "source";
    const targetKey = source.targetKey ?? "target";
    const meta = batch.meta ?? {};
    if (first && typeof meta.directed === "boolean" && sink.edgeCount === 0) {
        sink.setDirected(meta.directed);
    }
    writeMeta(sink, meta);
    const n = writeNodes(batch, sink, idKey, prepared);
    writeEdges(batch, sink, sourceKey, targetKey, prepared, n);
}

/**
 * Write a page's node records.
 * @param batch - the page
 * @param sink - the wrapped sink
 * @param idKey - the record key holding the id
 * @param prepared - the call
 * @returns how many records were visited, for the abort check's cadence
 */
function writeNodes(batch: RecordBatch, sink: GraphSink, idKey: string, prepared: Prepared): number {
    const { report } = prepared;
    const { signal } = prepared.created.ctx;
    let n = 0;
    for (const record of batch.nodes ?? []) {
        if (n++ % 64 === 0) {
            throwIfAborted(signal);
        }
        const { [idKey]: id, ...attrs } = record;
        if (typeof id !== "string" && typeof id !== "number") {
            report.error("missing-value", MISSING_ID_CODE, `a node record has no ${idKey}`);
            report.counts.skippedNodes++;
            continue;
        }
        try {
            sink.addNodeRecord(id, attrs);
            report.counts.nodes++;
        } catch (err) {
            report.recordError(err, { element: String(id) });
            report.counts.skippedNodes++;
        }
    }
    return n;
}

/**
 * Write a page's edge records.
 * @param batch - the page
 * @param sink - the wrapped sink
 * @param sourceKey - the record key holding the source id
 * @param targetKey - the record key holding the target id
 * @param prepared - the call
 * @param start - records visited so far, for the abort check's cadence
 */
function writeEdges(
    batch: RecordBatch,
    sink: GraphSink,
    sourceKey: string,
    targetKey: string,
    prepared: Prepared,
    start: number,
): void {
    const { report } = prepared;
    const { signal } = prepared.created.ctx;
    let n = start;
    let edgeIds: ReturnType<GraphSink["declareEdgeColumn"]> | null = null;
    for (const record of batch.edges ?? []) {
        if (n++ % 64 === 0) {
            throwIfAborted(signal);
        }
        const s = record[sourceKey];
        const t = record[targetKey];
        const edgeId = record.id;
        const fields = Object.fromEntries(
            Object.entries(record).filter(([k]) => k !== sourceKey && k !== targetKey && k !== "id"),
        );
        if ((typeof s !== "string" && typeof s !== "number") || (typeof t !== "string" && typeof t !== "number")) {
            report.error("missing-value", MISSING_ID_CODE, `an edge record has no ${sourceKey} or ${targetKey}`);
            report.counts.skippedEdges++;
            continue;
        }
        try {
            const e = sink.addEdgeRecord(s, t, fields);
            if (typeof edgeId === "string" || typeof edgeId === "number") {
                edgeIds ??= edgeIdColumn(sink);
                sink.setEdgeValue(edgeIds, e, String(edgeId));
            }
            report.counts.edges++;
        } catch (err) {
            report.recordError(err, { element: `${String(s)} -> ${String(t)}` });
            report.counts.skippedEdges++;
        }
    }
}

/**
 * The origin of an endpoint, or "" without one.
 * @param endpoint - the endpoint
 * @returns its origin
 */
function endpointOrigin(endpoint: URL | null): string {
    return endpoint === null ? "" : originOf(endpoint);
}

/**
 * The edge id column, declared on first use.
 * @param sink - the sink
 * @returns its handle
 */
function edgeIdColumn(sink: GraphSink): ReturnType<GraphSink["declareEdgeColumn"]> {
    const existing = sink.edgeColumn("id");
    return existing === INVALID_INDEX
        ? sink.declareEdgeColumn({ name: "id", dtype: "string", role: "id", nullable: true })
        : existing;
}

/**
 * The page iterator of a records source: its async iterable, or its one batch.
 * @param out - what `records()` returned
 * @returns an iterator over the pages
 */
function pages(out: Promise<RecordBatch> | AsyncIterable<RecordBatch>): AsyncIterator<RecordBatch> {
    if (Symbol.asyncIterator in out) {
        return out[Symbol.asyncIterator]();
    }
    let done = false;
    return {
        async next(): Promise<IteratorResult<RecordBatch>> {
            if (done) {
                return { done: true, value: undefined };
            }
            done = true;
            return { done: false, value: await out };
        },
    };
}

/**
 * Decide what a failed page means: a cap reached or a later page needing a credential stops the
 * load and keeps what was read (warning for the credential); anything else is rethrown.
 * @param err - what the page threw
 * @param page - how many pages were written before it
 * @param prepared - the call
 */
function stopOrThrow(err: unknown, page: number, prepared: Prepared): void {
    if (err instanceof LimitStop) {
        return;
    }
    if (page > 0 && err instanceof ImportError && AUTH_CODES.has(String(err.issue?.code))) {
        const p = err.issue?.params ?? {};
        warnOn(prepared.report, "W_SOURCE_AUTH", "a later page needs a credential; the pages before it are kept", {
            origin: typeof p.origin === "string" ? p.origin : endpointOrigin(prepared.created.ctx.endpoint),
            status: typeof p.status === "number" ? p.status : null,
        });
        return;
    }
    throw err;
}

/**
 * Run a records source into a sink.
 * @param source - the source
 * @param sink - the wrapped sink
 * @param prepared - the call
 * @returns where to resume, as the source gave it
 */
async function runRecords(
    source: GraphSource<never>,
    sink: GraphSink,
    prepared: Prepared,
): Promise<SourceCursor | null> {
    const { ctx } = prepared.created;
    const records = source.records as (p: unknown, c: typeof ctx) => Promise<RecordBatch> | AsyncIterable<RecordBatch>;
    const iterator = pages(records(prepared.params, ctx));
    let next: SourceCursor | null = ctx.cursor;
    let page = 0;
    let stopped = false;
    try {
        for (;;) {
            let step: IteratorResult<RecordBatch>;
            try {
                step = await iterator.next();
            } catch (err) {
                stopOrThrow(err, page, prepared);
                stopped = true;
                return next;
            }
            if (step.done === true) {
                return page === 0 ? null : next;
            }
            writeBatch(step.value, sink, source, prepared, page === 0);
            page++;
            next = step.value.next ?? null;
            ctx.progress(prepared.report.counts.nodes + prepared.report.counts.edges, undefined, "items");
            if (ctx.limits.reached()) {
                stopped = true;
                return next;
            }
        }
    } finally {
        if (stopped) {
            await iterator.return?.().catch(() => undefined);
        }
    }
}

/**
 * The importer input of a file source's body, gunzipped or unzipped when its name says so.
 * @param file - what the source returned
 * @param formats - the registry, for choosing a zip entry
 * @param signal - the signal
 * @returns the input and its hints
 */
async function fileInput(
    file: SourceFile,
    formats: FormatRegistry,
    signal: AbortSignal,
): Promise<{ input: ImportInput; filename: string | undefined; mimeType: string | undefined }> {
    let input: ImportInput = file.body instanceof Response ? (file.body.body ?? new Uint8Array(0)) : file.body;
    let { filename } = file;
    let mimeType =
        file.mimeType ??
        (file.body instanceof Response ? (file.body.headers.get("content-type") ?? undefined) : undefined);
    const gzip = /\.gz$/i.test(filename ?? "") || /gzip/i.test(mimeType ?? "");
    const zip = /\.zip$/i.test(filename ?? "") || /\/(x-)?zip\b/i.test(mimeType ?? "");
    if (gzip) {
        const stream =
            input instanceof ReadableStream
                ? input
                : new Response((await bytesOf(input, signal)) as Uint8Array<ArrayBuffer>).body;
        input = (stream ?? new Response("").body ?? new ReadableStream()).pipeThrough(
            new DecompressionStream("gzip") as unknown as ReadableWritablePair<Uint8Array, Uint8Array>,
        );
        filename = filename?.replace(/\.gz$/i, "");
        mimeType = undefined;
    } else if (zip) {
        const bytes = await bytesOf(input, signal);
        const entry = readZipDirectory(bytes).find((e) => !e.directory && formats.sniff({ filename: e.name }) !== null);
        if (entry === undefined) {
            throw new ImportError("the zip holds no graph file", new ImportReportBuilder("zip", 0).finish());
        }
        input = await readZipEntry(bytes, entry, { signal, maxBytes: Number.MAX_SAFE_INTEGER, maxRatio: 1000 });
        filename = entry.name;
        mimeType = undefined;
    }
    return { input, filename, mimeType };
}

/**
 * The bytes of an input.
 * @param input - the input
 * @param signal - the signal
 * @returns the bytes
 */
async function bytesOf(input: ImportInput, signal: AbortSignal): Promise<Uint8Array> {
    return (await readBytes(input, { signal })) ?? new TextEncoder().encode(typeof input === "string" ? input : "");
}

/**
 * Run a file source into a sink through the format importers.
 * @param source - the source
 * @param sink - the wrapped sink
 * @param prepared - the call
 * @param formats - the registry
 * @param options - the caller's options
 * @returns the format the file was read as
 */
async function runFile(
    source: GraphSource<never>,
    sink: GraphSink,
    prepared: Prepared,
    formats: FormatRegistry,
    options: LoadFromSourceOptions,
): Promise<string> {
    const { ctx } = prepared.created;
    const read = source.file as (p: unknown, c: typeof ctx) => Promise<SourceFile>;
    const file = await read(prepared.params, ctx);
    const { input, filename, mimeType } = await fileInput(file, formats, ctx.signal);
    let { format } = file;
    let body: ImportInput = input;
    if (format === undefined) {
        const bytes = await bytesOf(input, ctx.signal);
        format = formats.sniff({ filename, mimeType, head: bytes.subarray(0, SNIFF_HEAD_BYTES) })?.format;
        body = bytes;
        if (format === undefined) {
            failOn(prepared.report, "E_SOURCE_RESPONSE", "the file is in no format graph-io reads", {
                expected: "graph-file",
                contentType: mimeType ?? null,
            });
        }
    }
    const importer = formats.importer(format);
    prepared.report.include(await importer.import(body, sink, importerOptions(options, ctx.signal)));
    writeMeta(sink, file.meta ?? {});
    return format;
}

/** What a run into a sink produced. */
interface SinkRun {
    /** The report, with its `source` member. */
    readonly report: ImportReport;
    /** The format: `source:<id>`, or the format a file source resolved to. */
    readonly format: string;
}

/**
 * Run a source's read method into a sink.
 * @param source - the loaded source
 * @param params - the caller's params
 * @param sink - where to write
 * @param options - the caller's options
 * @param formats - the registry, for file sources
 * @returns the report and the format
 */
export async function runIntoSink(
    source: GraphSource<never>,
    params: Readonly<Record<string, unknown>>,
    sink: GraphSink,
    options: LoadFromSourceOptions,
    formats: FormatRegistry,
): Promise<SinkRun> {
    const prepared = prepare(source, params, options, typeof source.file === "function" ? "bytes" : "items");
    const { ctx } = prepared.created;
    const version = source.descriptor?.version ?? 1;
    const wrapped = wrapSink(sink, prepared, options.idPrefix);
    try {
        if (typeof source.records === "function") {
            const next = await runRecords(source, wrapped, prepared);
            throwIfAborted(ctx.signal);
            return {
                report: withSource(prepared.report.finish(), prepared, wrapCursor(next, version)),
                format: sourceFormat(source.id),
            };
        }
        if (typeof source.file === "function") {
            const format = await runFile(source, wrapped, prepared, formats, options);
            return { report: withSource(prepared.report.finish(), prepared, null), format };
        }
        const run = source.import as (p: unknown, s: GraphSink, c: typeof ctx) => Promise<ImportReport>;
        const report = await stopAtLimit(run(prepared.params, wrapped, ctx), prepared);
        throwIfAborted(ctx.signal);
        return {
            report: withSource(report, prepared, wrapCursor(prepared.created.state.finish?.next, version)),
            format: sourceFormat(source.id),
        };
    } catch (err) {
        throw settle(err, prepared);
    } finally {
        prepared.created.dispose();
    }
}

/**
 * Run an optional method of a source (expand, probe, list, validate) with a context.
 * @param source - the loaded source
 * @param feature - the method name
 * @param params - the params checked against the descriptor
 * @param options - the caller's options
 * @param call - calls the method with the context
 * @returns what the method returned, and the call's state
 */
export async function runMethod<T>(
    source: GraphSource<never>,
    feature: "expand" | "probe" | "list" | "validate",
    params: Readonly<Record<string, unknown>>,
    options: LoadFromSourceOptions,
    call: (prepared: Prepared) => Promise<T>,
): Promise<T> {
    if (typeof source[feature] !== "function") {
        failOn(
            new ImportReportBuilder(sourceFormat(source.id), 0),
            "E_SOURCE_UNSUPPORTED",
            `source ${source.id} has no ${feature}`,
            {
                feature,
            },
        );
    }
    const prepared = prepare(source, params, options, "items");
    try {
        const out = await call(prepared);
        throwIfAborted(prepared.created.ctx.signal);
        return out;
    } catch (err) {
        throw settle(err, prepared);
    } finally {
        prepared.created.dispose();
    }
}

/**
 * Add the `source` member to a report.
 * @param report - the report
 * @param prepared - the call
 * @param next - where to resume, as the caller sees it
 * @returns the report with its source member
 */
export function withSource(report: ImportReport, prepared: Prepared, next: SourceCursor | null): ImportReport {
    const own = prepared.report.finish();
    // issues the context recorded (retries, limits) that a source's own report does not hold
    const missing = own.issues.filter((i) => !report.issues.includes(i));
    return Object.freeze({
        ...report,
        issues: missing.length === 0 ? report.issues : Object.freeze([...report.issues, ...missing]),
        warningCount: report.warningCount + missing.filter((i) => i.severity === "warning").length,
        errorCount: report.errorCount + missing.filter((i) => i.severity === "error").length,
        source: prepared.created.info(next),
    });
}

/**
 * What a failed call throws: the signal's reason when it aborted, an ImportError with the source
 * info attached, or the error itself.
 * @param err - what was thrown
 * @param prepared - the call
 * @returns the error to throw
 */
function settle(err: unknown, prepared: Prepared): unknown {
    const { signal } = prepared.created.ctx;
    if (signal.aborted) {
        return signal.reason as unknown;
    }
    if (err instanceof LimitStop) {
        // a cap reached where nothing can be kept (a file cut short): the load fails with the cap
        return settle(limitError(err, prepared), prepared);
    }
    if (err instanceof ImportError && err.report.source === undefined) {
        const withInfo = new ImportError(
            err.message,
            { ...err.report, source: prepared.created.info(null) },
            err.details,
        );
        withInfo.stack = err.stack;
        return withInfo;
    }
    return err;
}

/**
 * The E_SOURCE_LIMIT error of a cap that stopped a load which can keep nothing.
 * @param stop - the cap reached
 * @param prepared - the call
 * @returns the error
 */
function limitError(stop: LimitStop, prepared: Prepared): unknown {
    try {
        return failOn(prepared.report, "E_SOURCE_LIMIT", stop.message, { limit: stop.limit, value: stop.value });
    } catch (err) {
        return err;
    }
}

/**
 * The report of an import or expand source, or, when a cap stopped it under "stop" (a LimitStop
 * raised by ctx.fetch that the source did not catch), the report of what it wrote so far.
 * @param run - the source's call
 * @param prepared - the call
 * @returns the report
 */
export async function stopAtLimit(run: Promise<ImportReport>, prepared: Prepared): Promise<ImportReport> {
    try {
        return await run;
    } catch (err) {
        if (err instanceof LimitStop) {
            return prepared.report.finish();
        }
        throw err;
    }
}
