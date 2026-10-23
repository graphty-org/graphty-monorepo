/**
 * The NDEx source's expand: NDEx's neighborhood query (`POST /v2/search/network/{uuid}/query`),
 * which answers CX1, read by the CX importer. Seeds are node ids, sent as `nodeIds`; NDEx's CX1
 * answer keeps the ids of the CX2 download (checked on 2026-10-17), so an expansion merges into a
 * loaded network by id. With `idAttribute`, seeds are values of that node attribute instead,
 * matched by NDEx's node search.
 */

import { type GraphSink } from "@graphty/graph-format";

import { cxImporter } from "../../formats/cx/importer.js";
import { type ImportReport } from "../../types.js";
import { failOn } from "../fail.js";
import { type ExpandRequest, type SourceContext } from "../types.js";
import { checkedUuid, ndexFetch } from "./client.js";
import { type NdexParams } from "./params.js";

/** The deepest neighborhood asked for, as for every built-in source. */
const MAX_DEPTH = 10;

/**
 * Quote a value for NDEx's search syntax.
 * @param value - the value
 * @returns the quoted term
 */
function term(value: string): string {
    const escaped = value.replaceAll(/["\\]/g, String.raw`\$&`);
    return `"${escaped}"`;
}

/**
 * The query body: the seeds as node ids, or as values of `idAttribute`.
 * @param request - the expand request
 * @param ctx - the context
 * @returns the body NDEx's query takes
 */
function queryBody(request: ExpandRequest<NdexParams>, ctx: SourceContext): Record<string, unknown> {
    const { ids } = request;
    const { idAttribute } = request.params;
    const depth = request.depth ?? 1;
    if (!Number.isInteger(depth) || depth < 1 || depth > MAX_DEPTH) {
        failOn(ctx.report, "E_SOURCE_PARAM", "depth is an integer from 1 to 10", { name: "depth", reason: "range" });
    }
    if (ids.length === 0) {
        failOn(ctx.report, "E_SOURCE_PARAM", "an expansion needs at least one id", { name: "ids", reason: "required" });
    }
    const limit = request.limit === undefined ? {} : { edgeLimit: request.limit, errorWhenLimitIsOver: false };
    if (idAttribute !== undefined) {
        if (!/^[A-Za-z_][\w.]*$/.test(idAttribute)) {
            failOn(ctx.report, "E_SOURCE_PARAM", "idAttribute is not an attribute name", {
                name: "idAttribute",
                reason: "identifier",
            });
        }
        const searchString = ids.map((id) => `${idAttribute}:${term(String(id))}`).join(" ");
        return { searchString, searchDepth: depth, ...limit };
    }
    const nodeIds = ids.map(Number);
    if (nodeIds.some((n) => !Number.isSafeInteger(n))) {
        failOn(ctx.report, "E_SOURCE_PARAM", "NDEx node ids are integers; set idAttribute to seed by name", {
            name: "ids",
            reason: "type",
        });
    }
    return { searchString: "", searchDepth: depth, nodeIds, ...limit };
}

/**
 * Fetch the neighborhood of some nodes of an NDEx network into a sink.
 * @param request - the seeds, depth and limit; `limit` caps the edges NDEx returns
 * @param sink - where to write
 * @param ctx - the context
 * @returns the report
 */
export async function expandNdex(
    request: ExpandRequest<NdexParams>,
    sink: GraphSink,
    ctx: SourceContext,
): Promise<ImportReport> {
    const uuid = checkedUuid(request.params.uuid, ctx);
    if (request.direction !== undefined && request.direction !== "both") {
        failOn(ctx.report, "E_SOURCE_UNSUPPORTED", "NDEx expands in both directions only", {
            feature: "direction",
            needs: "both",
        });
    }
    if ((request.relationshipTypes ?? []).length > 0) {
        failOn(ctx.report, "E_SOURCE_UNSUPPORTED", "NDEx cannot filter an expansion by relationship type", {
            feature: "relationshipTypes",
        });
    }
    const response = await ndexFetch(ctx, `v2/search/network/${uuid}/query`, uuid, {
        method: "POST",
        idempotent: true,
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(queryBody(request, ctx)),
    });
    ctx.report.include(await cxImporter.import(response.body ?? "", sink, { signal: ctx.signal }));
    return ctx.finish();
}
