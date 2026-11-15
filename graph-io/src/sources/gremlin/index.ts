/**
 * `@graphty/graph-io/sources/gremlin`: the Gremlin source, for Apache TinkerPop's Gremlin Server,
 * JanusGraph and Amazon Neptune. It sends Gremlin scripts over the server's HTTP endpoint or its
 * WebSocket protocol (chosen by the endpoint's scheme) and reads every vertex, edge and path in
 * the GraphSON 3 answer as a graph.
 *
 * - Modes: "query" runs the caller's script with its bindings, once; "all" pages every vertex
 *   (`g.V().range(a, b).elementMap()`), then every edge, and hands back `{ phase, offset }` as its
 *   cursor when a cap stops it; "neighborhood" reads the paths of up to `depth` hops from `ids`.
 * - Expand: the same paths, in a direction, over some edge labels.
 * - Not built in: pass `gremlinSource` to the load functions, or `registerSource(gremlinSource)`.
 *
 * Experimental.
 * @module @graphty/graph-io/sources/gremlin
 */

import { type GraphSink, type NodeId } from "@graphty/graph-format";

import { type ImportReport } from "../../types.js";
import { defineSource } from "../define.js";
import { failOn } from "../fail.js";
import {
    type ExpandRequest,
    type GraphSource,
    type SourceContext,
    type SourceCursor,
    type SourceProbe,
} from "../types.js";
import { GREMLIN_DESCRIPTOR } from "./descriptor.js";
import { Elements, writeElements } from "./graphson.js";
import { type GremlinParams } from "./params.js";
import { openTransport, type Transport } from "./transport.js";

export { GREMLIN_DESCRIPTOR } from "./descriptor.js";
export { type GremlinParams } from "./params.js";

/**
 * The id of the Gremlin source. Experimental.
 * @category Network sources
 */
export const GREMLIN_SOURCE_ID = "gremlin";

/** Elements per page of "all", and paths of "neighborhood", when the params name none. */
const DEFAULT_PAGE_SIZE = 1000;

/** Paths per expansion when the request names no limit. */
const DEFAULT_EXPAND_LIMIT = 500;

/** The deepest neighborhood, as for every built-in source. */
const MAX_DEPTH = 10;

/** A traversal source name the server can alias `g` to. */
const IDENTIFIER = /^[A-Za-z_]\w*$/;

/** The step of one hop, by direction. */
const HOP: Readonly<Record<string, string>> = { out: "outE()%.inV()", in: "inE()%.outV()", both: "bothE()%.otherV()" };

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
 * The alias of `g`, checked.
 * @param params - the params
 * @param ctx - the context
 * @returns the name, or undefined for the server's `g`
 */
function traversalSourceOf(params: GremlinParams, ctx: SourceContext): string | undefined {
    const name = params.traversalSource;
    if (name !== undefined && (typeof name !== "string" || !IDENTIFIER.test(name))) {
        failOn(ctx.report, "E_SOURCE_PARAM", "traversalSource is an identifier", {
            name: "traversalSource",
            reason: "identifier",
        });
    }
    return name;
}

/**
 * Seed ids, checked: strings or numbers, at least one.
 * @param ids - the ids
 * @param ctx - the context
 * @returns the ids
 */
function seedsOf(ids: readonly unknown[] | undefined, ctx: SourceContext): NodeId[] {
    if (ids === undefined || ids.length === 0) {
        failOn(ctx.report, "E_SOURCE_PARAM", "ids needs at least one vertex id", { name: "ids", reason: "required" });
    }
    if (!ids.every((id) => typeof id === "string" || typeof id === "number")) {
        failOn(ctx.report, "E_SOURCE_PARAM", "ids are strings or numbers", { name: "ids", reason: "type" });
    }
    return ids as NodeId[];
}

/**
 * The script of a neighborhood: the seeds, then every path of up to `depth` hops, each element as
 * its `elementMap()`. Depth and limit are checked integers, inlined; ids and labels are bindings.
 * @param direction - out, in or both
 * @param depth - hops
 * @param limit - paths read
 * @param labels - whether a `labels` binding filters the edges
 * @returns the script
 */
function aroundScript(direction: string, depth: number, limit: number, labels: boolean): string {
    const hop = (HOP[direction] ?? HOP.both).replace("%", labels ? ".hasLabel(within(labels))" : "");
    return (
        `g.V(ids).emit().repeat(${hop}.simplePath()).times(${String(depth)})` +
        `.path().by(elementMap()).limit(${String(limit)})`
    );
}

/**
 * Run scripts and collect what they return.
 * @param t - the transport
 * @param script - the script
 * @param bindings - its bindings
 * @param els - where to collect
 * @returns how many items the server returned
 */
async function collect(
    t: Transport,
    script: string,
    bindings: Readonly<Record<string, unknown>>,
    els: Elements,
): Promise<number> {
    const result = await t.run(script, bindings);
    for (const item of result) {
        els.add(item);
    }
    return result.length;
}

/**
 * Fail with E_SOURCE_NOT_A_GRAPH when a script returned items but no element.
 * @param count - the items returned
 * @param els - what they held
 * @param ctx - the context
 */
function requireGraph(count: number, els: Elements, ctx: SourceContext): void {
    if (count > 0 && els.empty) {
        failOn(ctx.report, "E_SOURCE_NOT_A_GRAPH", "the script returned no vertex, edge or path", { columns: [] });
    }
}

/**
 * Load every vertex, then every edge, page by page from the cursor, until the end or a cap.
 * @param t - the transport
 * @param size - elements per page
 * @param sink - where to write
 * @param ctx - the context
 * @returns where to resume, or null when complete
 */
async function loadAll(t: Transport, size: number, sink: GraphSink, ctx: SourceContext): Promise<SourceCursor | null> {
    let phase = ctx.cursor?.phase === "edges" ? "edges" : "nodes";
    let offset = Number(ctx.cursor?.offset ?? 0);
    // ponytail: range() over the server's iteration order, stable for an unchanged graph on
    // TinkerGraph and JanusGraph; order().by(id) would make it exact at the cost of a full sort
    for (;;) {
        const els = new Elements();
        const step = phase === "nodes" ? "V" : "E";
        const count = await collect(
            t,
            `g.${step}().range(${String(offset)}, ${String(offset + size)}).elementMap()`,
            {},
            els,
        );
        writeElements(els, sink, ctx.report, ctx.signal);
        const { counts } = ctx.report;
        ctx.progress(counts.nodes + counts.edges, undefined, "items");
        offset += size;
        if (count < size) {
            if (phase === "edges") {
                return null;
            }
            phase = "edges";
            offset = 0;
        }
        if (ctx.limits.reached()) {
            return { phase, offset };
        }
    }
}

/**
 * Load from a Gremlin server into the sink.
 * @param params - the params
 * @param sink - where to write
 * @param ctx - the context
 * @returns the report
 */
async function load(params: GremlinParams, sink: GraphSink, ctx: SourceContext): Promise<ImportReport> {
    const query = params.query?.trim() ?? "";
    const mode = params.mode ?? (query === "" ? "all" : "query");
    const size = integer(params.pageSize ?? DEFAULT_PAGE_SIZE, "pageSize", 100_000, ctx);
    const depth = integer(params.depth ?? 1, "depth", MAX_DEPTH, ctx);
    if (mode === "query" && query === "") {
        failOn(ctx.report, "E_SOURCE_PARAM", "mode query needs a query", { name: "query", reason: "required" });
    }
    const ids = mode === "neighborhood" ? seedsOf(params.ids, ctx) : [];
    const t = await openTransport(ctx, traversalSourceOf(params, ctx));
    try {
        let next: SourceCursor | null = null;
        if (mode === "all") {
            next = await loadAll(t, size, sink, ctx);
        } else {
            const els = new Elements();
            const count =
                mode === "query"
                    ? await collect(t, query, params.bindings ?? {}, els)
                    : await collect(t, aroundScript("both", depth, size, false), { ids }, els);
            requireGraph(count, els, ctx);
            writeElements(els, sink, ctx.report, ctx.signal);
        }
        return ctx.finish({ next });
    } finally {
        t.close();
    }
}

/**
 * Fetch the paths around some vertices into the sink.
 * @param request - the seeds, direction, depth, limit and edge labels
 * @param sink - where to write
 * @param ctx - the context
 * @returns the report
 */
async function expand(
    request: ExpandRequest<GremlinParams>,
    sink: GraphSink,
    ctx: SourceContext,
): Promise<ImportReport> {
    const direction = request.direction ?? "both";
    if (!(direction in HOP)) {
        failOn(ctx.report, "E_SOURCE_PARAM", "direction must be out, in or both", {
            name: "direction",
            reason: "enum",
        });
    }
    const depth = integer(request.depth ?? 1, "depth", MAX_DEPTH, ctx);
    const limit = integer(request.limit ?? DEFAULT_EXPAND_LIMIT, "limit", Number.MAX_SAFE_INTEGER, ctx);
    const ids = seedsOf(request.ids, ctx);
    const labels = request.relationshipTypes;
    const t = await openTransport(ctx, traversalSourceOf(request.params, ctx));
    try {
        const els = new Elements();
        const script = aroundScript(direction, depth, limit, labels !== undefined);
        await collect(t, script, labels === undefined ? { ids } : { ids, labels: [...labels] }, els);
        writeElements(els, sink, ctx.report, ctx.signal);
        return ctx.finish({ next: null });
    } finally {
        t.close();
    }
}

/**
 * The Gremlin source: scripts against Gremlin Server, JanusGraph or Amazon Neptune, over HTTP
 * (`http(s)://host:8182/gremlin`) or a WebSocket (`ws(s)://host:8182/gremlin`). Not registered by
 * default: pass it to the load functions or to `registerSource`. Experimental.
 * @example
 * ```ts
 * import { loadFromSource } from "@graphty/graph-io";
 * import { gremlinSource } from "@graphty/graph-io/sources/gremlin";
 *
 * const { snapshot } = await loadFromSource(
 *     gremlinSource,
 *     { query: "g.V().hasLabel('person').outE('knows').path()" },
 *     { endpoint: "wss://gremlin.example.com:8182/gremlin" },
 * );
 * ```
 * @category Network sources
 */
export const gremlinSource: GraphSource<GremlinParams> = defineSource<GremlinParams>({
    id: GREMLIN_SOURCE_ID,
    descriptor: GREMLIN_DESCRIPTOR,
    import: load,
    expand,
    probe: async (params, ctx): Promise<SourceProbe> => {
        // the server answers a one-vertex script: it is up, it speaks Gremlin, the credential works
        const t = await openTransport(ctx, traversalSourceOf(params, ctx));
        try {
            await t.run("g.V().limit(1).count()", {});
        } finally {
            t.close();
        }
        // a Gremlin request carries no access mode, so only a read-only traversal source refuses writes
        return { ok: true, server: { readOnly: "not-enforced" } };
    },
});
