/**
 * `@graphty/graph-io/sources/cypher`: the Cypher source and its `neo4j` and `neptune` presets
 * (design sections 10, 11, 12.2 and 12.4). One query builder, one result flattener and one type
 * mapper over four transports: Neo4j's Query API, Bolt (through the optional peer neo4j-driver),
 * Neptune Database over HTTPS and Neptune Analytics. The presets fix the transports and the server
 * profile and hold no query code of their own. Experimental.
 * @module @graphty/graph-io/sources/cypher
 */

import { type GraphSink, type NodeId } from "@graphty/graph-format";

import { throwIfAborted } from "../../common/input.js";
import { type ImportReportBuilder } from "../../common/report.js";
import { ImportError, type ImportReport } from "../../types.js";
import { SOURCE_ISSUE } from "../codes.js";
import { defineSource } from "../define.js";
import { failOn } from "../fail.js";
import { CYPHER_SOURCE_ID, NEO4J_SOURCE_ID, NEPTUNE_SOURCE_ID } from "../ids.js";
import { sha256Hex } from "../sigv4.js";
import {
    type ExpandRequest,
    type GraphSource,
    type SourceContext,
    type SourceCursor,
    type SourceDescriptor,
    type SourceFreshness,
    type SourceProbe,
    type SourceTotal,
    type SourceValidators,
} from "../types.js";
import { CYPHER_DESCRIPTOR, NEO4J_DESCRIPTOR, NEPTUNE_DESCRIPTOR } from "./descriptor.js";
import { canonicalRows, Collector, compareText, type QueryResult, requireGraph, writeCollected } from "./flatten.js";
import { type CypherParams } from "./params.js";
import { type CypherProfile, neo4jProfile, neptuneProfile, serverFacts } from "./profiles.js";
import {
    checkedInteger,
    counts,
    DEFAULT_PAGE_SIZE,
    edgePage,
    edgesAmong,
    MAX_DEPTH,
    MAX_PAGE_SIZE,
    neighborhood,
    nodePage,
    type QueryFilters,
    quoted,
    storeCount,
} from "./query-builder.js";
import { boltTransport } from "./transports/bolt.js";
import { neptuneAnalyticsTransport } from "./transports/neptune-analytics.js";
import { neptuneHttpsTransport } from "./transports/neptune-https.js";
import { queryApiTransport } from "./transports/query-api.js";
import { type Transport, type TransportInput } from "./transports/transport.js";

export { CYPHER_DESCRIPTOR, NEO4J_DESCRIPTOR, NEPTUNE_DESCRIPTOR } from "./descriptor.js";
export { type CypherParams } from "./params.js";
export { cypherIdentifier } from "./query-builder.js";

/** The transports, by name. */
type TransportName = NonNullable<CypherParams["transport"]>;

/** What a preset fixes. */
interface Preset {
    /** The source id. */
    readonly id: string;
    /** Its descriptor. */
    readonly descriptor: SourceDescriptor;
    /** The transport used when neither the params nor the endpoint's scheme picks one. */
    readonly transport: TransportName;
}

/** One page a read produced. */
interface Page {
    /** What it held. */
    readonly collected: Collector;
    /** Where the next page starts, or null after the last. */
    readonly next: SourceCursor | null;
}

/** The directions an expansion may follow. */
const DIRECTIONS: ReadonlySet<string> = new Set(["out", "in", "both"]);

/**
 * A query without the semicolons it ends with, so it can sit inside `CALL { }`. A loop, not
 * `/;+$/`, which backtracks over every run of semicolons that is not at the end.
 * @param query - the trimmed query
 * @returns the query
 */
function withoutTrailingSemicolons(query: string): string {
    let end = query.length;
    while (end > 0 && query[end - 1] === ";") {
        end--;
    }
    return query.slice(0, end);
}

/**
 * A list parameter: an array, or one value. A string is one item, never split, since an id or a
 * label may hold any character.
 * @param value - the value
 * @param name - the parameter
 * @param report - the load's report
 * @returns the items
 */
function listParam(value: unknown, name: string, report: ImportReportBuilder): readonly unknown[] {
    if (value === undefined || value === null) {
        return [];
    }
    if (Array.isArray(value)) {
        return value as unknown[];
    }
    if (typeof value === "string" || typeof value === "number") {
        return [value];
    }
    return failOn(report, "E_SOURCE_PARAM", `parameter ${name}: not a list`, { name, reason: "type" });
}

/**
 * A query without the semicolons at its end, which `CALL { ... }` refuses.
 * @param query - the query, trimmed
 * @returns it without them
 */
function withoutTrailingSemicolons(query: string): string {
    let end = query.length;
    while (end > 0 && query[end - 1] === ";") {
        end--;
    }

    return query.slice(0, end);
}

/**
 * The transport a load uses: the params' choice, else the endpoint's scheme, else the preset's.
 * @param params - the params
 * @param ctx - the context
 * @param preset - the preset
 * @returns the transport name
 */
function transportName(params: CypherParams, ctx: SourceContext, preset: Preset): TransportName {
    if (params.transport !== undefined) {
        return params.transport;
    }
    const scheme = ctx.endpoint?.protocol ?? "";
    if (scheme.startsWith("bolt") || scheme.startsWith("neo4j")) {
        return "bolt";
    }
    if (ctx.endpoint?.hostname.endsWith(".neptune-graph.amazonaws.com") === true) {
        return "neptune-analytics";
    }
    return preset.transport;
}

/** One load's connection, filters and profile. */
class Reader {
    private known: CypherProfile | null = null;
    private degree = true;
    readonly filters: QueryFilters;
    /** What the source holds for this load, when a count ran. */
    counted: SourceTotal | undefined;
    /** The raw id property, for the node ids. */
    readonly idProperty: string | null;

    /**
     * Set up a read.
     * @param transport - the transport
     * @param params - the params
     * @param ctx - the context
     */
    constructor(
        readonly transport: Transport,
        readonly params: CypherParams,
        readonly ctx: SourceContext,
    ) {
        const { report } = ctx;
        this.idProperty = params.idProperty ?? null;
        this.filters = {
            labels: listParam(params.labels, "labels", report).map((l) => quoted(l, "labels", report)),
            relationshipTypes: listParam(params.relationshipTypes, "relationshipTypes", report).map((t) =>
                quoted(t, "relationshipTypes", report),
            ),
            idProperty: this.idProperty === null ? null : quoted(this.idProperty, "idProperty", report),
        };
    }

    /**
     * The server's profile: the params' choice, else the transport's detection.
     * @returns the profile
     */
    async profile(): Promise<CypherProfile> {
        if (this.known === null) {
            const detected = await this.transport.profile();
            this.known = detected;
            if (this.params.profile === "neptune") {
                this.known = neptuneProfile(detected.version);
            } else if (this.params.profile === "neo4j" && detected.name !== "neo4j") {
                this.known = neo4jProfile(detected.version);
            }
        }
        return this.known;
    }

    /**
     * Run a generated statement with the degree hint, and without it once if the server refuses it.
     * @param build - builds the statement, with or without the hint
     * @param parameters - its parameters
     * @returns the result, collected
     */
    async generated(
        build: (degree: boolean) => string,
        parameters: Readonly<Record<string, unknown>>,
    ): Promise<{ collected: Collector; rows: readonly (readonly unknown[])[]; fields: readonly string[] }> {
        let result;
        try {
            result = await this.transport.run(build(this.degree), parameters);
        } catch (err) {
            if (!this.degree || !(err instanceof ImportError) || err.issue?.code !== SOURCE_ISSUE.E_SOURCE_QUERY) {
                throw err;
            }
            // the pattern comprehension of the degree hint is not every server's (Neptune, unverified)
            this.degree = false;
            result = await this.transport.run(build(false), parameters);
        }
        const collected = new Collector();
        collected.add(result, true);
        return { collected, rows: result.rows, fields: result.fields };
    }

    /**
     * The pages of a read, as `mode` asks.
     * @param cursor - where to resume
     * @param counting - whether a first page of mode "all" may count what the source holds
     * @yields one page at a time
     */
    async *pages(cursor: SourceCursor | null, counting = true): AsyncGenerator<Page> {
        const { params, ctx } = this;
        const { report } = ctx;
        const mode = params.mode ?? (typeof params.query === "string" && params.query !== "" ? "query" : "all");
        if (mode === "query") {
            if (typeof params.query !== "string" || params.query.trim() === "") {
                failOn(report, "E_SOURCE_PARAM", "mode query needs a query", { name: "query", reason: "required" });
            }
            yield await this.userQuery(params.query, cursor);
            return;
        }
        const profile = await this.profile();
        if (mode === "neighborhood") {
            const ids = listParam(params.ids, "ids", report) as readonly NodeId[];
            if (ids.length === 0) {
                failOn(report, "E_SOURCE_PARAM", "mode neighborhood needs ids", { name: "ids", reason: "required" });
            }
            const shape = {
                depth: checkedInteger(params.depth ?? 1, "depth", 1, MAX_DEPTH, report),
                direction: "both" as const,
                limit:
                    ctx.limits.maxNodes === undefined
                        ? null
                        : checkedInteger(ctx.limits.maxNodes, "maxNodes", 1, Number.MAX_SAFE_INTEGER, report),
            };
            const { collected } = await this.generated((d) => neighborhood(profile, this.filters, shape, d), { ids });
            yield { collected, next: null };
            return;
        }
        yield* this.everything(profile, cursor, counting);
    }

    /**
     * Mode "query": the reader's own query, as written. With a node cap (or a cursor from a capped
     * run) the server returns at most that many rows (`CALL { query } RETURN * LIMIT n`), and a full
     * result hands back a cursor that runs the query again with twice the rows, for the caller to
     * merge. A server that refuses the wrapper fails the load with `E_SOURCE_PARAM` (`name:
     * "maxNodes"`, `reason: "uncappable"`): the query is never run past the cap the caller set.
     * @param query - the query
     * @param cursor - where to resume: `{ rows }` from an earlier capped run
     * @returns the one page
     */
    private async userQuery(query: string, cursor: SourceCursor | null): Promise<Page> {
        const { params, ctx } = this;
        const parameters = params.parameters ?? {};
        const asked = cursor?.rows ?? ctx.limits.maxNodes;
        const rows =
            asked === undefined || asked === null
                ? null
                : Number(checkedInteger(asked, "maxNodes", 1, Number.MAX_SAFE_INTEGER, ctx.report));
        let result: QueryResult;
        try {
            result = await this.transport.run(
                rows === null
                    ? query
                    : `CALL {\n${withoutTrailingSemicolons(query.trim())}\n}\nRETURN * LIMIT ${String(rows)}`,
                parameters,
            );
        } catch (err) {
            if (rows === null || !(err instanceof ImportError) || err.issue?.code !== SOURCE_ISSUE.E_SOURCE_QUERY) {
                throw err;
            }
            return failOn(ctx.report, "E_SOURCE_PARAM", "the server cannot cap this query; load it without maxNodes", {
                name: "maxNodes",
                reason: "uncappable",
            });
        }
        const collected = new Collector();
        collected.add(result, false);
        requireGraph(result, collected, ctx.report);
        const full = rows !== null && result.rows.length >= rows;
        return { collected, next: full ? { rows: rows * 2 } : null };
    }

    /**
     * Mode "all": the nodes, then the relationships with their ends, each paged by keyset on the
     * id expression (never SKIP), so a page is stable under unrelated writes.
     * @param profile - the server's profile
     * @param cursor - where to resume
     * @param counting - whether a first page may count what the source holds
     * @yields one page at a time
     */
    private async *everything(
        profile: CypherProfile,
        cursor: SourceCursor | null,
        counting: boolean,
    ): AsyncGenerator<Page> {
        const { params, ctx } = this;
        const size = checkedInteger(params.pageSize ?? DEFAULT_PAGE_SIZE, "pageSize", 1, MAX_PAGE_SIZE, ctx.report);
        if (cursor === null && counting) {
            this.counted = await this.count(profile);
        }
        const cap = ctx.limits.maxNodes;
        if (cap !== undefined && cursor?.phase !== "edges") {
            const capped = Number(checkedInteger(cap, "maxNodes", 1, Number.MAX_SAFE_INTEGER, ctx.report));
            yield* this.cappedNodes(profile, cursor, Math.min(Number(size), capped));
            return;
        }

        let phase: "nodes" | "edges" = cursor?.phase === "edges" ? "edges" : "nodes";
        let after: string | number | boolean | null = cursor?.after ?? null;
        const { counted } = this;
        const total =
            params.countFirst === true && counted !== undefined
                ? (counted.nodes ?? 0) + (counted.edges ?? 0)
                : undefined;
        for (;;) {
            const nodes = phase === "nodes";
            const { collected, rows, fields } = await this.generated(
                (d) =>
                    nodes
                        ? nodePage(profile, this.filters, size, after !== null, d)
                        : edgePage(profile, this.filters, size, after !== null),
                after === null ? {} : { after },
            );
            const next = nextCursor(phase, rows, fields, Number(size));
            yield { collected, next };
            const { counts: done } = ctx.report;
            ctx.progress(done.nodes + done.edges, total, "items");
            if (next === null) {
                return;
            }
            phase = next.phase === "edges" ? "edges" : "nodes";
            after = next.after ?? null;
        }
    }

    /**
     * Mode "all" under a node cap: pages of at most the cap's nodes, each with the relationships
     * among the nodes loaded so far, so a capped load stops at its cap with its edges, and its
     * next page (`data.more`) continues by key.
     * @param profile - the server's profile
     * @param cursor - where to resume
     * @param size - the page size
     * @yields one page at a time
     */
    private async *cappedNodes(
        profile: CypherProfile,
        cursor: SourceCursor | null,
        size: number,
    ): AsyncGenerator<Page> {
        let after: string | number | boolean | null = cursor?.after ?? null;
        for (;;) {
            const { collected, rows, fields } = await this.generated(
                (d) => nodePage(profile, this.filters, String(size), after !== null, d),
                after === null ? {} : { after },
            );
            const at = fields.indexOf("key");
            const last = rows.at(-1)?.[at];
            const key = typeof last === "string" || typeof last === "number" ? last : null;
            if (key !== null) {
                const keys = rows.map((row) => row[at]);
                const among = await this.transport.run(edgesAmong(profile, this.filters), { keys, last: key });
                collected.add(among, false);
            }
            const next = rows.length >= size && key !== null ? { phase: "nodes", after: key } : null;
            yield { collected, next };
            if (next === null) {
                return;
            }
            after = key;
        }
    }

    /**
     * What a first page of mode "all" counts: with `countFirst`, the nodes and relationships the
     * filters match (for progress too); else, on Neo4j with at most one label and the server's
     * ids, the nodes from the count store; else nothing.
     * @param profile - the server's profile
     * @returns the count, or undefined
     */
    private async count(profile: CypherProfile): Promise<SourceTotal | undefined> {
        // A count is a non-negative integer; anything else a server answers is no count.
        const first = async (statement: string): Promise<number | undefined> => {
            const c = Number((await this.transport.run(statement, {})).rows[0]?.[0]);
            return Number.isSafeInteger(c) && c >= 0 ? c : undefined;
        };
        const { labels, idProperty } = this.filters;
        if (this.params.countFirst === true) {
            const [n, r] = counts(this.filters);
            const [nodes, edges] = await Promise.all([first(n), first(r)]);
            return { ...(nodes === undefined ? {} : { nodes }), ...(edges === undefined ? {} : { edges }) };
        }
        if (profile.name !== "neo4j" || labels.length > 1 || idProperty !== null) {
            return undefined;
        }
        const nodes = await first(storeCount(labels[0]));
        return nodes === undefined ? undefined : { nodes };
    }

    /**
     * The server facts and validators of what was read.
     * @param lines - the canonical rows
     * @returns the server facts and validators
     */
    async facts(lines: string[]): Promise<{ server: Readonly<Record<string, string>>; validators: SourceValidators }> {
        const profile = await this.profile();
        const contentHash = await sha256Hex([...lines].sort(compareText).join("\n"));
        return {
            server: serverFacts(profile),
            validators: profile.version === null ? { contentHash } : { contentHash, serverVersion: profile.version },
        };
    }
}

/**
 * Where mode "all" resumes after a page: the same phase after the page's last key while pages are
 * full, then the relationships from the start, then nothing.
 * @param phase - the page's phase
 * @param rows - the page's rows
 * @param fields - the page's field names
 * @param size - the page size
 * @returns the next cursor, or null at the end
 */
function nextCursor(
    phase: "nodes" | "edges",
    rows: readonly (readonly unknown[])[],
    fields: readonly string[],
    size: number,
): SourceCursor | null {
    const last = rows.at(-1)?.[fields.indexOf("key")];
    const key = typeof last === "string" || typeof last === "number" ? last : null;
    if (rows.length >= size && key !== null) {
        return { phase, after: key };
    }
    return phase === "nodes" ? { phase: "edges", after: null } : null;
}

/**
 * Open a read: pick the transport, check what it needs, connect.
 * @param params - the params
 * @param ctx - the context
 * @param preset - the preset
 * @returns the reader
 */
async function open(params: CypherParams, ctx: SourceContext, preset: Preset): Promise<Reader> {
    throwIfAborted(ctx.signal);
    const input: TransportInput = { ctx, params, m: { long: params.long ?? "f64", report: ctx.report } };
    const name = transportName(params, ctx, preset);
    let transport: Transport;
    switch (name) {
        case "bolt":
            transport = await boltTransport(input);
            break;
        case "neptune-https":
            transport = neptuneHttpsTransport(input);
            break;
        case "neptune-analytics":
            transport = neptuneAnalyticsTransport(input);
            break;
        default:
            transport = queryApiTransport(input);
            break;
    }
    try {
        return new Reader(transport, params, ctx);
    } catch (err) {
        await transport.close();
        throw err;
    }
}

/**
 * Run something with a reader, closing it after.
 * @param params - the params
 * @param ctx - the context
 * @param preset - the preset
 * @param body - what to do
 * @returns what the body returned
 */
async function withReader<T>(
    params: CypherParams,
    ctx: SourceContext,
    preset: Preset,
    body: (reader: Reader) => Promise<T>,
): Promise<T> {
    const reader = await open(params, ctx, preset);
    try {
        return await body(reader);
    } finally {
        await reader.transport.close();
    }
}

/**
 * Make the Cypher source or one of its presets.
 * @param preset - the id, descriptor and default transport
 * @returns the source
 */
function cypher(preset: Preset): GraphSource<CypherParams> {
    return defineSource<CypherParams>({
        id: preset.id,
        descriptor: preset.descriptor,
        import: (params, sink, ctx) =>
            withReader(params, ctx, preset, async (reader): Promise<ImportReport> => {
                const lines: string[] = [];
                let next: SourceCursor | null = null;
                for await (const page of reader.pages(ctx.cursor)) {
                    writeCollected(page.collected, sink, reader.idProperty, ctx.report, ctx.signal);
                    lines.push(...canonicalRows(page.collected, reader.idProperty));
                    ({ next } = page);
                    if (next !== null && ctx.limits.reached()) {
                        break;
                    }
                }
                const total = reader.counted === undefined ? {} : { total: reader.counted };
                return ctx.finish({ next, ...total, ...(await reader.facts(lines)) });
            }),
        expand: (request, sink, ctx) =>
            withReader(request.params, ctx, preset, (reader) => expand(reader, request, sink)),
        probe: (params, ctx) =>
            withReader(params, ctx, preset, async (reader): Promise<SourceProbe> => {
                const profile = await reader.transport.probe();
                return { ok: true, server: serverFacts(profile) };
            }),
        validate: (params, seen, ctx) =>
            withReader(params, ctx, preset, async (reader): Promise<SourceFreshness> => {
                const lines: string[] = [];
                for await (const page of reader.pages(null, false)) {
                    lines.push(...canonicalRows(page.collected, reader.idProperty));
                }
                const { validators } = await reader.facts(lines);
                let status: SourceFreshness["status"] = "unverifiable";
                if (seen.contentHash !== undefined) {
                    status = seen.contentHash === validators.contentHash ? "current" : "changed";
                }
                return { status, via: "hash", validators };
            }),
    });
}

/**
 * Fetch the neighborhood of some nodes into the sink.
 * @param reader - the reader
 * @param request - the seeds and how far to go
 * @param sink - where to write
 * @returns the report
 */
async function expand(reader: Reader, request: ExpandRequest<CypherParams>, sink: GraphSink): Promise<ImportReport> {
    const { ctx } = reader;
    const { report } = ctx;
    if (request.ids.length === 0) {
        failOn(report, "E_SOURCE_PARAM", "an expansion needs seed ids", { name: "ids", reason: "required" });
    }
    const direction = request.direction ?? "both";
    if (!DIRECTIONS.has(direction)) {
        failOn(report, "E_SOURCE_PARAM", "direction must be out, in or both", { name: "direction", reason: "enum" });
    }
    const limit = request.limit ?? ctx.limits.maxNodes;
    const after = ctx.cursor?.after ?? null;
    const shape = {
        depth: checkedInteger(request.depth ?? 1, "depth", 1, MAX_DEPTH, report),
        direction,
        limit: limit === undefined ? null : checkedInteger(limit, "limit", 1, Number.MAX_SAFE_INTEGER, report),
        after: after !== null,
    };
    const filters: QueryFilters =
        request.relationshipTypes === undefined
            ? reader.filters
            : {
                  ...reader.filters,
                  relationshipTypes: request.relationshipTypes.map((t) => quoted(t, "relationshipTypes", report)),
              };
    const profile = await reader.profile();
    const { collected, rows, fields } = await reader.generated((d) => neighborhood(profile, filters, shape, d), {
        ids: request.ids,
        ...(after === null ? {} : { after }),
    });
    writeCollected(collected, sink, reader.idProperty, report, ctx.signal);
    const { server } = await reader.facts([]);
    // A full page may have more behind it: hand back where the next one starts.
    const last = rows.at(-1)?.[fields.indexOf("key")];
    const full = shape.limit !== null && rows.length >= Number(shape.limit);
    const next = full && (typeof last === "string" || typeof last === "number") ? { after: last } : null;
    return ctx.finish({ server, next });
}

/**
 * The generic Cypher source, for any openCypher server: Neo4j over its Query API or Bolt, Neptune
 * over HTTPS. The transport comes from `params.transport`, else the endpoint (`bolt+s://` is Bolt,
 * a `neptune-graph` host is Neptune Analytics), else the Query API. Experimental.
 * @category Network sources
 */
export const cypherSource: GraphSource<CypherParams> = cypher({
    id: CYPHER_SOURCE_ID,
    descriptor: CYPHER_DESCRIPTOR,
    transport: "query-api",
});

/**
 * The Neo4j preset: the Query API (Neo4j 5.26 and later, Aura), or Bolt for a `bolt:` or
 * `bolt+s:` endpoint (any Neo4j; needs the optional peer neo4j-driver). Experimental.
 * @category Network sources
 */
export const neo4jSource: GraphSource<CypherParams> = cypher({
    id: NEO4J_SOURCE_ID,
    descriptor: NEO4J_DESCRIPTOR,
    transport: "query-api",
});

/**
 * The Amazon Neptune preset: Neptune Database over HTTPS, or Neptune Analytics for a
 * `neptune-graph` host. Node only; sign requests with `credentials.awsSigV4`. Experimental.
 * @category Network sources
 */
export const neptuneSource: GraphSource<CypherParams> = cypher({
    id: NEPTUNE_SOURCE_ID,
    descriptor: NEPTUNE_DESCRIPTOR,
    transport: "neptune-https",
});
