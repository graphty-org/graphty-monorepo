/**
 * `@graphty/graph-io/sources/sparql`: the SPARQL source. It sends CONSTRUCT (or DESCRIBE) queries
 * over the SPARQL 1.1 protocol (a form POST, N-Triples back) and reads the triples as a graph: an
 * IRI or blank-node object is an edge from the subject (`type` is the predicate's local name,
 * `predicate` the full IRI), a literal is an attribute of the subject named by the predicate's
 * local name. Node ids are the IRIs.
 *
 * - Paging: the source adds `ORDER BY` (the template's variables) and `LIMIT` / `OFFSET` to the
 *   caller's query, unless it sets its own; a load stops between pages at a cap and hands back
 *   `{ offset }` as its cursor. A page is `pageSize` solutions, so its triple count varies; the
 *   first empty page ends the load.
 * - Expand: the triples of the seeds, `VALUES ?s { ... }` out and `VALUES ?o { ... }` in.
 * - Validate: SHA-256 of the first page's triples.
 *
 * Experimental.
 * @module @graphty/graph-io/sources/sparql
 */

import { type GraphSink } from "@graphty/graph-format";

import { throwIfAborted } from "../../common/input.js";
import { type ImportReport } from "../../types.js";
import { defineSource } from "../define.js";
import { failOn } from "../fail.js";
import { SPARQL_SOURCE_ID } from "../ids.js";
import { sha256Hex } from "../sigv4.js";
import {
    type ExpandRequest,
    type GraphSource,
    type SourceContext,
    type SourceCursor,
    type SourceFreshness,
    type SourceProbe,
} from "../types.js";
import { SPARQL_DESCRIPTOR } from "./descriptor.js";
import { canonicalTriple, type Graphed, graphTriples, parseNTriples, type Triple } from "./ntriples.js";
import { type SparqlParams } from "./params.js";
import { allQuery, aroundQuery, iriTerm, pagedQuery, readQuery, validLanguage } from "./query.js";

export { SPARQL_DESCRIPTOR } from "./descriptor.js";
export { type SparqlParams } from "./params.js";

/** Solutions per page when the params name none. */
const DEFAULT_PAGE_SIZE = 1000;

/** Triples per hop of an expansion when the request names no limit. */
const DEFAULT_EXPAND_LIMIT = 500;

/** The deepest expansion, as for every built-in source. */
const MAX_DEPTH = 10;

/** What CONSTRUCT and DESCRIBE are asked to answer. */
const ACCEPT_TRIPLES = "application/n-triples, text/plain;q=0.9";

/** One page's query, by offset; `paged` false when the query is sent once, as written. */
interface Plan {
    /** The query of the page at an offset. */
    readonly at: (offset: number) => string;
    /** Whether the source pages it. */
    readonly paged: boolean;
}

/**
 * Send a query and read the answer as N-Triples.
 * @param ctx - the context
 * @param query - the query
 * @returns the triples
 */
async function send(ctx: SourceContext, query: string): Promise<Triple[]> {
    throwIfAborted(ctx.signal);
    const response = await ctx.fetch(ctx.endpoint ?? "", {
        method: "POST",
        idempotent: true,
        headers: { Accept: ACCEPT_TRIPLES, "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ query }).toString(),
        allowStatus: [400],
    });
    if (response.status === 400) {
        const text = (await response.text()).trim().slice(0, 500);
        failOn(ctx.report, "E_SOURCE_QUERY", "the endpoint refused the query", {
            serverCode: null,
            line: null,
            column: null,
            serverMessage: text === "" ? null : text,
        });
    }
    const contentType = response.headers.get("content-type");
    const notTriples = (): never =>
        failOn(ctx.report, "E_SOURCE_RESPONSE", "the endpoint did not answer N-Triples", {
            expected: "n-triples",
            contentType,
        });
    if (contentType !== null && /html|json|xml/i.test(contentType)) {
        notTriples();
    }
    const { triples, badLine } = parseNTriples(await response.text());
    if (badLine !== null) {
        notTriples();
    }
    return triples;
}

/**
 * A whole-number param, checked.
 * @param value - the value
 * @param name - the param
 * @param max - the largest allowed
 * @param ctx - the context
 * @returns the number
 */
function integer(value: number, name: string, max: number, ctx: SourceContext): number {
    if (!Number.isInteger(value) || value < 1 || value > max) {
        failOn(ctx.report, "E_SOURCE_PARAM", `${name} is an integer from 1 to ${String(max)}`, {
            name,
            reason: "range",
        });
    }
    return value;
}

/**
 * The language filter, lowercase and checked, or "" for none.
 * @param params - the params
 * @param ctx - the context
 * @returns the tag
 */
function languageOf(params: SparqlParams, ctx: SourceContext): string {
    const language = params.language ?? "";
    if (language !== "" && !validLanguage(language)) {
        failOn(ctx.report, "E_SOURCE_PARAM", "language is a language tag", { name: "language", reason: "type" });
    }
    return language.toLowerCase();
}

/**
 * The predicate prefixes generated queries follow, checked.
 * @param params - the params
 * @param ctx - the context
 * @returns the prefixes; empty means every predicate
 */
function predicatesOf(params: SparqlParams, ctx: SourceContext): readonly string[] {
    const list = params.predicates ?? [];
    const prefixes = typeof list === "string" ? [list] : list;
    for (const p of prefixes) {
        if (typeof p !== "string" || iriTerm(p) === null) {
            failOn(ctx.report, "E_SOURCE_PARAM", "predicates are IRI prefixes", { name: "predicates", reason: "iri" });
        }
    }
    return prefixes;
}

/**
 * Seed ids as IRI terms; a blank node or anything else that is not an IRI is refused.
 * @param ids - the ids
 * @param name - the param, for the error
 * @param ctx - the context
 * @returns the terms
 */
function irisOf(ids: readonly unknown[] | undefined, name: string, ctx: SourceContext): string[] {
    if (ids === undefined || ids.length === 0) {
        failOn(ctx.report, "E_SOURCE_PARAM", `${name} needs at least one IRI`, { name, reason: "required" });
    }
    return ids.map(
        (id) => iriTerm(id) ?? failOn(ctx.report, "E_SOURCE_PARAM", `${name}: not an IRI`, { name, reason: "iri" }),
    );
}

/**
 * What a load sends, from its mode.
 * @param params - the params
 * @param ctx - the context
 * @returns the plan
 */
function planOf(params: SparqlParams, ctx: SourceContext): Plan {
    const size = integer(params.pageSize ?? DEFAULT_PAGE_SIZE, "pageSize", 10_000, ctx);
    const filter = { language: languageOf(params, ctx), predicates: predicatesOf(params, ctx) };
    const query = params.query?.trim() ?? "";
    const mode = params.mode ?? (query === "" ? "all" : "query");
    if (mode === "neighborhood") {
        const iris = irisOf(params.ids, "ids", ctx);
        return { at: (offset) => aroundQuery(iris, "both", filter, size, offset), paged: true };
    }
    if (mode === "all") {
        return { at: (offset) => allQuery(filter, size, offset), paged: true };
    }
    if (query === "") {
        failOn(ctx.report, "E_SOURCE_PARAM", "mode query needs a query", { name: "query", reason: "required" });
    }
    const shape = readQuery(query);
    if (shape.form !== "construct" && shape.form !== "describe") {
        failOn(ctx.report, "E_SOURCE_PARAM", "the query must be CONSTRUCT or DESCRIBE", {
            name: "query",
            reason: "form",
        });
    }
    if (shape.ownLimit) {
        return { at: () => query, paged: false };
    }
    return { at: (offset) => pagedQuery(query, shape, size, offset), paged: true };
}

/**
 * Write nodes and edges into the sink, counting them on the report.
 * @param graphed - the nodes and edges
 * @param sink - where to write
 * @param ctx - the context
 */
function write(graphed: Graphed, sink: GraphSink, ctx: SourceContext): void {
    const { report } = ctx;
    if (sink.edgeCount === 0) {
        sink.setDirected(true);
    }
    for (const [id, attrs] of graphed.nodes) {
        try {
            sink.addNodeRecord(id, attrs);
            report.counts.nodes++;
        } catch (err) {
            report.recordError(err, { element: id });
            report.counts.skippedNodes++;
        }
    }
    for (const { source, target, ...attrs } of graphed.edges) {
        try {
            sink.addEdgeRecord(source, target, attrs, null);
            report.counts.edges++;
        } catch (err) {
            report.recordError(err, { element: `${source} -> ${target}` });
            report.counts.skippedEdges++;
        }
    }
}

/**
 * The content hash of some triples, in any order.
 * @param triples - the triples
 * @returns the SHA-256, hex
 */
function hashOf(triples: readonly Triple[]): Promise<string> {
    return sha256Hex(triples.map(canonicalTriple).sort().join("\n")); // NOSONAR(S2871): code-unit order is the point: a locale-free, stable order for the hash
}

/**
 * Load pages into the sink from the cursor's offset until an empty page or a cap.
 * @param params - the params
 * @param sink - where to write
 * @param ctx - the context
 * @returns the report
 */
async function load(params: SparqlParams, sink: GraphSink, ctx: SourceContext): Promise<ImportReport> {
    const plan = planOf(params, ctx);
    const size = params.pageSize ?? DEFAULT_PAGE_SIZE;
    const start = Number(ctx.cursor?.offset ?? 0);
    const language = languageOf(params, ctx);
    let offset = start;
    let next: SourceCursor | null = null;
    let contentHash: string | undefined;
    for (;;) {
        const triples = await send(ctx, plan.at(offset));
        if (offset === 0) {
            contentHash = await hashOf(triples);
        }
        write(graphTriples(triples, language), sink, ctx);
        const { counts } = ctx.report;
        ctx.progress(counts.nodes + counts.edges, undefined, "items");
        if (!plan.paged || triples.length === 0) {
            next = null;
            break;
        }
        offset += size;
        next = { offset };
        if (ctx.limits.reached()) {
            break;
        }
    }
    return ctx.finish({ next, ...(contentHash === undefined ? {} : { validators: { contentHash } }) });
}

/**
 * Fetch the triples around some IRIs into the sink, hop by hop.
 * @param request - the seeds, direction, depth, limit and predicate filter
 * @param sink - where to write
 * @param ctx - the context
 * @returns the report
 */
async function expand(
    request: ExpandRequest<SparqlParams>,
    sink: GraphSink,
    ctx: SourceContext,
): Promise<ImportReport> {
    const direction = request.direction ?? "both";
    if (!["out", "in", "both"].includes(direction)) {
        failOn(ctx.report, "E_SOURCE_PARAM", "direction must be out, in or both", {
            name: "direction",
            reason: "enum",
        });
    }
    const depth = integer(request.depth ?? 1, "depth", MAX_DEPTH, ctx);
    const limit = integer(request.limit ?? DEFAULT_EXPAND_LIMIT, "limit", Number.MAX_SAFE_INTEGER, ctx);
    const language = languageOf(request.params, ctx);
    const filter = { language, predicates: predicatesOf(request.params, ctx) };
    const types = request.relationshipTypes === undefined ? null : new Set(request.relationshipTypes);
    // a capped one-hop expansion resumes at its offset; deeper ones are read whole per hop
    const offset = depth === 1 ? Number(ctx.cursor?.offset ?? 0) : 0;
    const seen = new Set<string>(request.ids.map(String));
    let frontier = irisOf(request.ids, "ids", ctx);
    let next: SourceCursor | null = null;
    const graphed: Graphed = { nodes: new Map(), edges: [] };
    for (let hop = 0; hop < depth && frontier.length > 0; hop++) {
        const triples = await send(ctx, aroundQuery(frontier, direction, filter, limit, offset));
        const before = graphed.edges.length;
        graphTriples(triples, language, graphed);
        if (types !== null) {
            const kept = graphed.edges.slice(before).filter((e) => types.has(e.type) || types.has(e.predicate));
            graphed.edges.splice(before, Infinity, ...kept);
        }
        if (depth === 1 && triples.length > 0) {
            next = { offset: offset + limit };
        }
        const reached = graphed.edges.slice(before).flatMap((e) => [e.source, e.target]);
        frontier = [...new Set(reached)]
            .filter((id) => !seen.has(id))
            .flatMap((id) => {
                seen.add(id);
                const term = iriTerm(id);
                return term === null ? [] : [term];
            });
    }
    write(graphed, sink, ctx);
    return ctx.finish({ next });
}

/**
 * The SPARQL source: CONSTRUCT or DESCRIBE queries against any SPARQL 1.1 endpoint, paged by
 * `LIMIT` and `OFFSET`, expanded by `VALUES`, validated by a hash of the first page. Experimental.
 * @category Network sources
 */
export const sparqlSource: GraphSource<SparqlParams> = defineSource<SparqlParams>({
    id: SPARQL_SOURCE_ID,
    descriptor: SPARQL_DESCRIPTOR,
    import: load,
    expand,
    probe: async (params, ctx): Promise<SourceProbe> => {
        // the endpoint answers a one-solution query: it is up, it reads SPARQL, the credential works
        await send(ctx, "CONSTRUCT { ?s ?p ?o } WHERE { ?s ?p ?o } LIMIT 1");
        languageOf(params, ctx);
        return { ok: true };
    },
    validate: async (params, seen, ctx): Promise<SourceFreshness> => {
        const contentHash = await hashOf(await send(ctx, planOf(params, ctx).at(0)));
        let status: SourceFreshness["status"] = "unverifiable";
        if (seen.contentHash !== undefined) {
            status = seen.contentHash === contentHash ? "current" : "changed";
        }
        return { status, via: "hash", validators: { contentHash } };
    },
});
