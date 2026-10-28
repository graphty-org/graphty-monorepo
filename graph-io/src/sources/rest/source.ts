/**
 * Running a REST mapping (design section 13.2): `restSource(mapping, info)` turns one into a
 * `records` source with `expand` (breadth-first, batched `{ids}`, depth 0 hydrates), `probe` and
 * `validate`; the generic `rest` source takes the mapping as a parameter. Every request goes through
 * `ctx.fetch`, so the credential, retries, caps and coded errors are the framework's.
 */

import { type GraphSink } from "@graphty/graph-format";

import { throwIfAborted } from "../../common/input.js";
import { ImportError, type ImportReport } from "../../types.js";
import { sleep } from "../context.js";
import { originOf } from "../credentials.js";
import { defineSource } from "../define.js";
import { failAlone, failOn, warnOn } from "../fail.js";
import { REST_SOURCE_ID } from "../ids.js";
import {
    type ExpandRequest,
    type GraphSource,
    type RecordBatch,
    type SourceContext,
    type SourceCredentialSlot,
    type SourceCursor,
    type SourceDescriptor,
    type SourceFinish,
    type SourceFreshness,
    type SourceProbe,
    type SourceValidators,
} from "../types.js";
import { REST_DESCRIPTOR } from "./descriptor.js";
import { checkRestMapping } from "./mapping.js";
import { firstPageUrl, nextPosition, type PagePosition, pageUrl } from "./paging.js";
import { type RestMapping, type RestParams, type RestRequest } from "./params.js";
import { newState, type PageRecords, type RecordState, toRecords } from "./records.js";
import { selectRecords } from "./selectors.js";
import { buildRequest, type TemplateValues } from "./templates.js";

/** What a call runs: the mapping and the values its templates use. */
export interface RestPlan {
    /** The mapping. */
    readonly mapping: RestMapping;
    /** The template values. */
    readonly values: TemplateValues;
}

/** Why a plan is asked for: the values may differ (a validation selects only what it compares). */
export type RestPurpose = "load" | "expand" | "probe" | "validate";

/** Turns a call's params into the plan it runs. */
type RestPlanner<P> = (params: P, ctx: SourceContext, purpose: RestPurpose) => RestPlan;

/** Auth failures a later page may answer with, keeping the pages before it. */
const AUTH_CODES: ReadonlySet<string> = new Set(["E_SOURCE_AUTH", "E_SOURCE_FORBIDDEN"]);

/** One page read. */
interface Page {
    readonly records: unknown[];
    readonly next: PagePosition;
    readonly headers: Headers;
    readonly status: number;
}

/**
 * How long until a budget resets.
 * @param reset - the reset header's number: past 1e9 an epoch in seconds, otherwise seconds from now
 * @returns milliseconds from now, never negative
 */
function resetDelayMs(reset: number): number {
    return Math.max(0, reset > 1e9 ? reset * 1000 - Date.now() : reset * 1000);
}

/** One call's running state. */
class RestRun {
    readonly endpoint: URL;
    readonly facts: { budget?: SourceFinish["budget"]; validators?: SourceValidators } = {};
    private last = 0;

    /**
     * Create one.
     * @param plan - the mapping and values
     * @param ctx - the context
     * @param paced - whether this run paces itself (the generic source, whose descriptor cannot)
     */
    constructor(
        readonly plan: RestPlan,
        readonly ctx: SourceContext,
        private readonly paced: boolean,
    ) {
        this.endpoint = new URL(plan.mapping.endpoint);
        if (ctx.endpoint !== null && originOf(ctx.endpoint) !== this.endpoint.origin) {
            failOn(ctx.report, "E_SOURCE_PARAM", "the endpoint is not the mapping's", {
                name: "endpoint",
                reason: "origin",
            });
        }
    }

    /** Wait out the mapping's own rate limit (the generic source only). */
    private async pace(): Promise<void> {
        const rate = this.plan.mapping.rateLimit;
        if (!this.paced || rate === undefined) {
            return;
        }
        // ponytail: even spacing, one request at a time; a burst window is the descriptor's pacer
        const wait = this.last + rate.perMs / rate.requests - Date.now();
        if (wait > 0) {
            await sleep(wait, this.ctx.signal);
        }
        this.last = Date.now();
    }

    /**
     * Record the budget headers of a response.
     * @param headers - the response headers
     */
    private noteBudget(headers: Headers): void {
        const names = this.plan.mapping.budgetHeaders;
        const remaining = names === undefined ? null : headers.get(names.remaining);
        if (names === undefined || remaining === null || !Number.isFinite(Number(remaining))) {
            return;
        }
        const reset = names.reset === undefined ? null : Number(headers.get(names.reset) ?? Number.NaN);
        const resetMs = reset === null || !Number.isFinite(reset) ? undefined : resetDelayMs(reset);
        this.facts.budget = { remaining: Number(remaining), ...(resetMs === undefined ? {} : { resetMs }) };
    }

    /**
     * Read one page of a request.
     * @param name - the request name
     * @param values - the template values
     * @param position - the page's position, or undefined for the first page
     * @param headers - extra request headers (validation)
     * @returns the page
     */
    async read(
        name: string,
        values: TemplateValues,
        position: PagePosition | undefined,
        headers?: Record<string, string>,
    ): Promise<Page> {
        const request: RestRequest = this.plan.mapping.requests[name];
        const { report } = this.ctx;
        const built = buildRequest(this.endpoint, request, values, report);
        const url =
            position === undefined
                ? firstPageUrl(built.url, request.paging, this.endpoint, report)
                : pageUrl(built.url, request.paging, position, this.endpoint, report);
        await this.pace();
        const response = await this.ctx.fetch(url, {
            ...built.init,
            headers: { accept: "application/json", ...(built.init.headers as Record<string, string>), ...headers },
            allowStatus: [304],
        });
        this.noteBudget(response.headers);
        if (response.status === 304) {
            return { records: [], next: null, headers: response.headers, status: 304 };
        }
        const text = await response.text();
        let body: unknown;
        try {
            body = JSON.parse(text) as unknown;
        } catch {
            failOn(report, "E_SOURCE_RESPONSE", "the response is not JSON", {
                expected: "json",
                contentType: response.headers.get("content-type"),
            });
        }
        const records = selectRecords(body, request.records);
        const here = position ?? null;
        const next = nextPosition(
            request.paging,
            position ?? (request.paging?.style === "offset" ? (request.paging.base ?? 0) : here),
            { body, headers: response.headers, url, records: records.length, runtime: this.ctx.runtime },
            this.endpoint,
            report,
        );
        return { records, next, headers: response.headers, status: response.status };
    }

    /**
     * Record what the facts say so far, so the report carries them even when a later page fails.
     * @param state - the load's record state
     * @param next - where to resume, for an expansion
     * @returns the report so far
     */
    finish(state: RecordState | null, next: SourceCursor | null = null): ImportReport {
        if (state?.modified !== null && state?.modified !== undefined) {
            this.facts.validators = { ...this.facts.validators, modified: state.modified };
        }
        return this.ctx.finish({ ...this.facts, next });
    }

    /**
     * Note the HTTP validators of a load's first response.
     * @param headers - its headers
     */
    noteValidators(headers: Headers): void {
        const etag = headers.get("etag");
        const lastModified = headers.get("last-modified");
        this.facts.validators = {
            ...this.facts.validators,
            ...(etag === null ? {} : { etag }),
            ...(lastModified === null ? {} : { lastModified }),
        };
    }

    /**
     * The graph facts of a first page.
     * @returns the meta
     */
    meta(): RecordBatch["meta"] {
        const { directed } = this.plan.mapping;
        return directed === undefined ? undefined : { directed };
    }
}

/**
 * The template values of params: every string, number and boolean, as text.
 * @param params - the params
 * @param skip - a key to leave out
 * @returns the values
 */
function stringValues(params: Readonly<Record<string, unknown>>, skip?: string): TemplateValues {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(params)) {
        if (k !== skip && (typeof v === "string" || typeof v === "number" || typeof v === "boolean")) {
            out[k] = String(v);
        }
    }
    return out;
}

/**
 * The load: the seed request once, then the load request page by page.
 * @param run - the call
 * @yields one page of nodes and edges
 */
async function* loadPages(run: RestRun): AsyncGenerator<RecordBatch> {
    const { mapping, values } = run.plan;
    const { cursor } = run.ctx;
    if (cursor !== null && cursor.r !== mapping.load) {
        failOn(run.ctx.report, "E_SOURCE_PARAM", "the cursor is not this mapping's", {
            name: "cursor",
            reason: "stale-cursor",
        });
    }
    const state = newState();
    const groups: { records: unknown[]; entity: string }[] = [];
    if (cursor === null && mapping.seed !== undefined) {
        const seed = await run.read(mapping.seed, values, undefined);
        groups.push({ records: seed.records, entity: mapping.requests[mapping.seed].entity });
    }
    const { entity } = mapping.requests[mapping.load];
    let position: PagePosition | undefined = cursor === null ? undefined : (cursor.at as PagePosition);
    let first = true;
    for (;;) {
        const page = await run.read(mapping.load, values, position);
        if (first && cursor === null) {
            run.noteValidators(page.headers);
        }
        const out = toRecords(mapping, [...groups.splice(0), { records: page.records, entity }], state);
        run.finish(state);
        const next = page.next === null ? null : { r: mapping.load, at: page.next };
        yield { nodes: out.nodes, edges: out.edges, next, meta: first ? run.meta() : undefined };
        if (page.next === null) {
            return;
        }
        first = false;
        position = page.next;
    }
}

/**
 * Write one page into a sink.
 * @param out - the page
 * @param sink - the sink
 * @param ctx - the context
 * @param types - the relationship types to keep, if any
 */
function writePage(out: PageRecords, sink: GraphSink, ctx: SourceContext, types?: ReadonlySet<string>): void {
    const { report } = ctx;
    let n = 0;
    for (const { id, ...attrs } of out.nodes) {
        if (n++ % 64 === 0) {
            throwIfAborted(ctx.signal);
        }
        try {
            sink.addNodeRecord(id, attrs);
            report.counts.nodes++;
        } catch (err) {
            report.recordError(err, { element: String(id) });
            report.counts.skippedNodes++;
        }
    }
    for (const { source, target, ...attrs } of out.edges) {
        if (n++ % 64 === 0) {
            throwIfAborted(ctx.signal);
        }
        if (types !== undefined && !types.has(String(attrs.type))) {
            continue;
        }
        try {
            sink.addEdgeRecord(source, target, attrs);
            report.counts.edges++;
        } catch (err) {
            report.recordError(err, { element: `${String(source)} -> ${String(target)}` });
            report.counts.skippedEdges++;
        }
    }
}

/**
 * The requests an expansion runs for a direction; depth 0 hydrates.
 * @param mapping - the mapping
 * @param request - the expansion
 * @returns the request names
 */
function expandRequests(mapping: RestMapping, request: ExpandRequest<unknown>): string[] {
    if (request.depth === 0) {
        return mapping.hydrate === undefined ? [] : [mapping.hydrate];
    }
    const { expand } = mapping;
    if (typeof expand === "string" || expand === undefined) {
        return expand === undefined ? [] : [expand];
    }
    const direction = request.direction ?? "both";
    const names = [direction !== "out" ? expand.in : undefined, direction !== "in" ? expand.out : undefined];
    return [...new Set(names.filter((n): n is string => n !== undefined))];
}

/**
 * Split ids into a request's batches.
 * @param ids - the ids
 * @param max - the batch size
 * @returns the batches
 */
function batches(ids: readonly string[], max: number): string[][] {
    const out: string[][] = [];
    for (let i = 0; i < ids.length; i += max) {
        out.push(ids.slice(i, i + max));
    }
    return out;
}

/**
 * Breadth-first expansion: each hop runs the direction's requests with the frontier's ids in
 * `{ids}` batches; the nodes it adds are the next frontier. A capped first hop records where it
 * stopped, so expanding again continues from there.
 * @param run - the call
 * @param request - the seeds and how far to go
 * @param sink - where to write
 * @returns the report
 */
async function expandInto(run: RestRun, request: ExpandRequest<unknown>, sink: GraphSink): Promise<ImportReport> {
    return new Expansion(run, request, sink).expand();
}

/** Which batch of which request of which hop is being read. */
interface BatchAt {
    readonly hop: number;
    readonly x: number;
    readonly b: number;
}

/** One expansion's running state. */
class Expansion {
    private readonly mapping: RestMapping;
    private readonly names: string[];
    private readonly state: RecordState;
    private readonly types: ReadonlySet<string> | undefined;
    private added = 0;
    private wrote = false;

    /**
     * Check the expansion and set the sink's direction.
     * @param run - the call
     * @param request - the seeds and how far to go
     * @param sink - where to write
     */
    constructor(
        private readonly run: RestRun,
        private readonly request: ExpandRequest<unknown>,
        private readonly sink: GraphSink,
    ) {
        const { ctx } = run;
        this.mapping = run.plan.mapping;
        this.names = expandRequests(this.mapping, request);
        if (this.names.length === 0) {
            failOn(ctx.report, "E_SOURCE_UNSUPPORTED", "the mapping has no request for this expansion", {
                feature: request.depth === 0 ? "hydrate" : "expand",
            });
        }
        if (request.ids.length === 0) {
            failOn(ctx.report, "E_SOURCE_PARAM", "an expansion needs seed ids", { name: "ids", reason: "required" });
        }
        this.state = newState([...request.ids.map(String), ...(request.exclude ?? []).map(String)]);
        this.types = request.relationshipTypes === undefined ? undefined : new Set(request.relationshipTypes);
        if (this.mapping.directed !== undefined && sink.edgeCount === 0) {
            sink.setDirected(this.mapping.directed);
        }
    }

    /**
     * Run every hop.
     * @returns the report
     */
    async expand(): Promise<ImportReport> {
        let frontier = this.request.ids.map(String);
        const depth = Math.max(1, this.request.depth ?? 1);
        for (let hop = 1; hop <= depth && frontier.length > 0; hop++) {
            const reached: string[] = [];
            const stop = await this.hop(hop, frontier, reached);
            if (stop !== null) {
                return stop;
            }
            frontier = [...new Set(reached)];
        }
        return this.run.finish(this.state, null);
    }

    /**
     * Run one hop: every request over every batch of the frontier.
     * @param hop - the hop, from 1
     * @param frontier - the ids this hop starts from
     * @param reached - collects the ids this hop adds
     * @returns the report when the expansion stopped, else null
     */
    private async hop(hop: number, frontier: readonly string[], reached: string[]): Promise<ImportReport | null> {
        for (const [x, name] of this.names.entries()) {
            const max = this.mapping.requests[name].batch?.max ?? 1;
            for (const [b, batch] of batches(frontier, max).entries()) {
                if (this.skipped({ hop, x, b })) {
                    continue;
                }
                const stop = await this.readBatch({ hop, x, b }, name, batch, frontier, reached);
                if (stop !== null) {
                    return stop;
                }
            }
        }
        return null;
    }

    /**
     * Whether a resumed first hop already read this batch.
     * @param at - the batch
     * @returns true to skip it
     */
    private skipped(at: BatchAt): boolean {
        const { hop, x, b } = at;
        const resume = this.run.ctx.cursor;
        if (hop !== 1 || resume === null) {
            return false;
        }
        const rx = Number(resume.x);
        return x < rx || (x === rx && b < Number(resume.b));
    }

    /**
     * Where a batch starts: the recorded position for the batch a first hop stopped in.
     * @param at - the batch
     * @returns the position, or undefined for the first page
     */
    private startPosition(at: BatchAt): PagePosition | undefined {
        const { hop, x, b } = at;
        const resume = this.run.ctx.cursor;
        return hop === 1 && resume !== null && x === Number(resume.x) && b === Number(resume.b)
            ? ((resume.at as PagePosition) ?? undefined)
            : undefined;
    }

    /**
     * Read one batch page by page.
     * @param at - the batch
     * @param name - the request
     * @param batch - its ids
     * @param frontier - the hop's ids
     * @param reached - collects the ids it adds
     * @returns the report when the expansion stopped, else null
     */
    private async readBatch(
        at: BatchAt,
        name: string,
        batch: readonly string[],
        frontier: readonly string[],
        reached: string[],
    ): Promise<ImportReport | null> {
        const r = this.mapping.requests[name];
        const own = { ...this.run.plan.values, id: batch[0], ids: batch.join(r.batch?.join ?? ",") };
        let position = this.startPosition(at);
        for (;;) {
            let page: Page;
            try {
                page = await this.run.read(name, own, position);
            } catch (err) {
                return this.authStop(err, at.hop === 1 ? { x: at.x, b: at.b, at: position ?? null } : null);
            }
            this.writeNew(page, r.entity, reached);
            const stop = this.capStop(at, page, frontier);
            if (stop !== null || page.next === null) {
                return stop;
            }
            position = page.next;
        }
    }

    /**
     * Keep what was written when a later page needs a credential; rethrow anything else.
     * @param err - what the page threw
     * @param cursor - where to resume
     * @returns the report
     */
    private authStop(err: unknown, cursor: SourceCursor | null): ImportReport {
        if (!this.wrote || !(err instanceof ImportError) || !AUTH_CODES.has(String(err.issue?.code))) {
            throw err;
        }
        const p = err.issue?.params ?? {};
        warnOn(this.run.ctx.report, "W_SOURCE_AUTH", "a later page needs a credential; the pages before it are kept", {
            origin: typeof p.origin === "string" ? p.origin : this.run.endpoint.origin,
            status: typeof p.status === "number" ? p.status : null,
        });
        return this.run.finish(this.state, cursor);
    }

    /**
     * Write a page and collect the nodes it added.
     * @param page - the page
     * @param entity - its records' entity
     * @param reached - collects the ids it adds
     */
    private writeNew(page: Page, entity: string, reached: string[]): void {
        const { state } = this;
        const before = new Set([...state.full, ...state.stubs]);
        const out = toRecords(this.mapping, [{ records: page.records, entity }], state);
        writePage(out, this.sink, this.run.ctx, this.types);
        this.wrote = true;
        for (const node of out.nodes) {
            const id = String(node.id);
            if (!before.has(id) && !state.known.has(id)) {
                reached.push(id);
                this.added++;
            }
        }
    }

    /**
     * Stop at the expansion's limit or the load's caps.
     * @param at - the batch
     * @param page - the page just written
     * @param frontier - the hop's ids
     * @returns the report when a cap was reached, else null
     */
    private capStop(at: BatchAt, page: Page, frontier: readonly string[]): ImportReport | null {
        const { hop, x, b } = at;
        const { ctx } = this.run;
        const limited = this.request.limit !== undefined && this.added >= this.request.limit;
        if (limited) {
            warnOn(ctx.report, "W_SOURCE_LIMIT", "the expansion reached its limit", {
                limit: "limit",
                value: this.added,
            });
        }
        if (!limited && !ctx.limits.reached()) {
            return null;
        }
        const more = page.next === null ? null : { x, b, at: page.next };
        // ponytail: only a capped first hop can resume; a deeper hop's frontier is not recorded
        return this.run.finish(
            this.state,
            hop === 1 ? (more ?? nextBatch(x, b, this.names, frontier, this.mapping)) : null,
        );
    }
}

/**
 * Where a first hop continues after a batch that ended on a cap.
 * @param x - the request index
 * @param b - the batch index
 * @param names - the requests
 * @param frontier - the seeds
 * @param mapping - the mapping
 * @returns the cursor, or null when nothing is left
 */
function nextBatch(
    x: number,
    b: number,
    names: readonly string[],
    frontier: readonly string[],
    mapping: RestMapping,
): SourceCursor | null {
    const count = Math.ceil(frontier.length / (mapping.requests[names[x]].batch?.max ?? 1));
    if (b + 1 < count) {
        return { x, b: b + 1, at: null };
    }
    return x + 1 < names.length ? { x: x + 1, b: 0, at: null } : null;
}

/**
 * Whether data loaded earlier changed: the load's first page (with the seed), sent with the
 * recorded HTTP validators; a 304 or an equal ETag is current, else the newest modification time
 * is compared.
 * @param run - the call
 * @param seen - the validators recorded then
 * @returns the freshness
 */
async function validateRun(run: RestRun, seen: SourceValidators): Promise<SourceFreshness> {
    const { mapping, values } = run.plan;
    const headers: Record<string, string> = {};
    if (seen.etag !== undefined) {
        headers["if-none-match"] = seen.etag;
    }
    if (seen.lastModified !== undefined) {
        headers["if-modified-since"] = seen.lastModified;
    }
    const state = newState();
    const groups: { records: unknown[]; entity: string }[] = [];
    if (mapping.seed !== undefined) {
        const seed = await run.read(mapping.seed, values, undefined);
        groups.push({ records: seed.records, entity: mapping.requests[mapping.seed].entity });
    }
    const page = await run.read(mapping.load, values, undefined, headers);
    if (page.status === 304) {
        return { status: "current", via: seen.etag === undefined ? "modified" : "etag", validators: seen };
    }
    toRecords(mapping, [...groups, { records: page.records, entity: mapping.requests[mapping.load].entity }], state);
    run.noteValidators(page.headers);
    const now: SourceValidators = {
        ...run.facts.validators,
        ...(state.modified === null ? {} : { modified: state.modified }),
    };
    if (seen.etag !== undefined && now.etag !== undefined) {
        return { status: seen.etag === now.etag ? "current" : "changed", via: "etag", validators: now };
    }
    if (seen.modified !== undefined && now.modified !== undefined) {
        return now.modified > seen.modified
            ? { status: "changed", via: "modified", changedAt: now.modified, validators: now }
            : { status: "current", via: "modified", validators: now };
    }
    return { status: "unverifiable", validators: now };
}

/**
 * The methods of a source that runs plans.
 * @param plan - turns params into the plan
 * @param paced - whether the run paces itself
 * @returns records, expand, probe and validate
 */
export function restMethods<P>(
    plan: RestPlanner<P>,
    paced: boolean,
): Pick<Required<GraphSource<P>>, "expand" | "probe" | "validate"> & {
    records: (params: P, ctx: SourceContext) => AsyncIterable<RecordBatch>;
} {
    return {
        records: (params, ctx) => loadPages(new RestRun(plan(params, ctx, "load"), ctx, paced)),
        expand: (request, sink, ctx) =>
            expandInto(new RestRun(plan(request.params, ctx, "expand"), ctx, paced), request, sink),
        async probe(params, ctx): Promise<SourceProbe> {
            const run = new RestRun(plan(params, ctx, "probe"), ctx, paced);
            const page = await run.read(run.plan.mapping.load, run.plan.values, undefined);
            if (page.records.length === 0 && page.status !== 304) {
                failOn(ctx.report, "E_SOURCE_NOT_FOUND", "the load request found no records", {
                    what: "records",
                    value: run.plan.mapping.load,
                });
            }
            return { ok: true };
        },
        validate: (params, seen, ctx) => validateRun(new RestRun(plan(params, ctx, "validate"), ctx, paced), seen),
    };
}

/**
 * The plan of a mapping given as data, after it is checked.
 * @param mapping - the mapping
 * @param ctx - the context
 * @returns the mapping, checked
 */
function checkedMapping(mapping: unknown, ctx: SourceContext): RestMapping {
    const [issue] = checkRestMapping(mapping);
    if (issue !== undefined) {
        failOn(ctx.report, "E_SOURCE_PARAM", `the mapping is invalid at ${issue.at}`, {
            name: "mapping",
            reason: issue.code,
            at: issue.at,
        });
    }
    return mapping as RestMapping;
}

/**
 * What `restSource` needs beside the mapping: the source id and any descriptor fields to set.
 * Experimental.
 * @category Network sources
 */
export type RestSourceInfo = {
    /** The source id: lowercase letters, digits and dashes. */
    readonly id: string;
} & Partial<SourceDescriptor>;

/**
 * The credential slot a mapping's `auth` describes: an API key's slot is named by the query
 * parameter or header it is sent in (`{ query: "api_key" }` is the slot `api_key`), a bearer
 * token's is `default`. Optional, as a mapping cannot say a key is required.
 * @param mapping - the mapping
 * @returns the slots
 */
function mappingSlots(mapping: RestMapping): readonly SourceCredentialSlot[] {
    const { auth } = mapping;
    if (auth === undefined) {
        return [];
    }
    if (auth.kind === "bearer") {
        return [{ name: "default", kind: "bearer", required: false }];
    }
    const { header } = auth;
    if (header !== undefined) {
        return [{ name: header.toLowerCase(), kind: "api-key", required: false, send: { header } }];
    }
    const query = auth.query ?? "api_key";
    return [{ name: query, kind: "api-key", required: false, send: { query } }];
}

/**
 * Where a mapping's API key goes, as a descriptor says it.
 * @param auth - the mapping's auth
 * @returns `{ apiKey }`, or nothing when the mapping takes no key or does not say where
 */
function apiKeyOf(auth: RestMapping["auth"]): Pick<SourceDescriptor, "apiKey"> {
    if (auth?.kind !== "api-key") {
        return {};
    }
    if (auth.header !== undefined) {
        return { apiKey: { header: auth.header } };
    }
    return auth.query === undefined ? {} : { apiKey: { query: auth.query } };
}

/**
 * Turn a REST mapping into a source: a `records` source that loads the mapping's `load` request
 * page by page, with `expand` (breadth-first over the `expand` requests, `{ids}` batched; depth 0
 * fetches the seeds' own records through `hydrate`), `probe` and `validate`. The descriptor is
 * derived from the mapping (its endpoint, params, auth and rate limit), and `info` may set any of
 * its fields. A mapping with a problem is refused: E_SOURCE_INVALID with `reason: "mapping"`.
 * Experimental.
 * @param mapping - the mapping
 * @param info - the id and descriptor fields
 * @returns the source
 * @example
 * ```ts
 * const people = restSource(mapping, { id: "people", plainName: "People" });
 * registerSource(people);
 * const { snapshot } = await loadFromSource("people", { team: "core" });
 * ```
 * @category Network sources
 */
export function restSource(mapping: RestMapping, info: RestSourceInfo): GraphSource<Readonly<Record<string, unknown>>> {
    const [issue] = checkRestMapping(mapping);
    if (issue !== undefined) {
        failAlone("E_SOURCE_INVALID", `the mapping of ${info.id} is invalid at ${issue.at}`, {
            id: info.id,
            reason: "mapping",
            at: issue.at,
        });
    }
    const { id, ...fields } = info;
    const auth = mapping.auth === undefined ? [] : [mapping.auth.kind];
    const descriptor: SourceDescriptor = Object.freeze({
        plainName: id,
        kind: "rest",
        params: mapping.params ?? [],
        defaultEndpoint: mapping.endpoint,
        auth,
        authRequired: auth.length === 0 ? "none" : "optional",
        credentials: mappingSlots(mapping),
        ...apiKeyOf(mapping.auth),
        ...(mapping.rateLimit === undefined ? {} : { rateLimit: mapping.rateLimit }),
        ...fields,
    });
    return defineSource<Readonly<Record<string, unknown>>>({
        id,
        descriptor,
        ...restMethods((params) => ({ mapping, values: stringValues(params) }), false),
    });
}

/**
 * The generic REST mapping source: `params.mapping` says how to read the API, and the other params
 * fill its templates. The mapping is checked before any request (E_SOURCE_PARAM, `name:
 * "mapping"`, `reason` the problem's code, `at` where it is). With a credential, pass the mapping's
 * endpoint as `endpoint`, so the credential is bound to it. Experimental.
 * @category Network sources
 */
export const restMappingSource: GraphSource<RestParams> = defineSource<RestParams>({
    id: REST_SOURCE_ID,
    descriptor: REST_DESCRIPTOR,
    ...restMethods<RestParams>(
        (params, ctx) => ({ mapping: checkedMapping(params.mapping, ctx), values: stringValues(params, "mapping") }),
        true,
    ),
});
