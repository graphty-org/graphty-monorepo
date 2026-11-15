/**
 * `@graphty/graph-io/sources/ndex`: the NDEx source (design section 12.1). Experimental.
 *
 * - load: the network's summary first (counts, download size, modification time), checked against
 *   the caps before a byte of the network is read; then the CX2 (or CX) download, streamed into
 *   the CX2 (or CX) importer.
 * - probe: the summary. list: NDEx's v2 network search. validate: the summary's modificationTime.
 * - expand: NDEx's neighborhood query (`expand.ts`).
 *
 * Errors are classified by status; a body is read only from a 401, 403 or 404 (NDEx's own
 * `errorCode`, passed through as `serverCode`), so a 500 with a Java stack trace never reaches a
 * report.
 * @module @graphty/graph-io/sources/ndex
 */

import { endpointOrigin } from "../credentials.js";
import { defineSource } from "../define.js";
import { failOn } from "../fail.js";
import { NDEX_SOURCE_ID } from "../ids.js";
import {
    type GraphSource,
    type SourceContext,
    type SourceFreshness,
    type SourceListing,
    type SourceListQuery,
    type SourceProbe,
    type SourceValidators,
} from "../types.js";
import { checkedUuid, checkEndpoint, ndexFetch } from "./client.js";
import { NDEX_DESCRIPTOR } from "./descriptor.js";
import { expandNdex } from "./expand.js";
import { type NdexParams } from "./params.js";

export { NDEX_DESCRIPTOR } from "./descriptor.js";
export { type NdexParams } from "./params.js";
export { type NdexShareLink, parseShareUrl } from "./share-url.js";

/** The fields of a network summary this source reads. */
interface NdexSummary {
    readonly nodeCount?: number;
    readonly edgeCount?: number;
    readonly cxFileSize?: number;
    readonly cx2FileSize?: number;
    readonly modificationTime?: number;
    readonly creationTime?: number;
    readonly visibility?: string;
    readonly properties?: Readonly<Record<string, { readonly v?: unknown } | undefined>>;
}

/** One network of a v2 search answer. */
interface NdexSearchHit {
    readonly externalId?: string;
    readonly name?: string;
    readonly nodeCount?: number;
    readonly edgeCount?: number;
    readonly modificationTime?: number;
}

/**
 * Read a network's summary.
 * @param uuid - the checked UUID
 * @param ctx - the context
 * @returns the summary and the bytes it took
 */
async function readSummary(uuid: string, ctx: SourceContext): Promise<{ summary: NdexSummary; bytes: number }> {
    const response = await ndexFetch(ctx, `v3/networks/${uuid}/summary`, uuid, {
        headers: { Accept: "application/json" },
    });
    const text = await response.text();
    try {
        return { summary: JSON.parse(text) as NdexSummary, bytes: new TextEncoder().encode(text).byteLength };
    } catch {
        return failOn(ctx.report, "E_SOURCE_RESPONSE", "the NDEx summary is not JSON", {
            origin: endpointOrigin(ctx.endpoint),
            expected: "json",
            contentType: response.headers.get("content-type"),
        });
    }
}

/**
 * An NDEx time (epoch milliseconds) as an ISO string.
 * @param ms - the time
 * @returns the ISO string, or undefined
 */
function iso(ms: number | undefined): string | undefined {
    return typeof ms === "number" && Number.isFinite(ms) ? new Date(ms).toISOString() : undefined;
}

/**
 * The download size the summary gives for a format.
 * @param summary - the summary
 * @param format - "cx2" or "cx"
 * @returns the size in bytes, or undefined
 */
function sizeOf(summary: NdexSummary, format: string): number | undefined {
    return format === "cx" ? summary.cxFileSize : summary.cx2FileSize;
}

/**
 * Stop the load before its first byte when the summary says a cap would cut it: a network file cut
 * short is not a graph, so this is E_SOURCE_LIMIT under either `onLimit`.
 * @param summary - the summary
 * @param format - the download format
 * @param ctx - the context
 */
function checkCaps(summary: NdexSummary, format: string, ctx: SourceContext): void {
    const caps: [string, number | undefined, number | undefined][] = [
        ["maxNodes", summary.nodeCount, ctx.limits.maxNodes],
        ["maxEdges", summary.edgeCount, ctx.limits.maxEdges],
        ["maxBytes", sizeOf(summary, format), ctx.limits.maxBytes],
    ];
    for (const [limit, value, cap] of caps) {
        if (value !== undefined && cap !== undefined && value > cap) {
            failOn(ctx.report, "E_SOURCE_LIMIT", `the network's ${limit} of ${String(value)} is over the cap`, {
                limit,
                value,
            });
        }
    }
}

/**
 * The graph facts a summary adds: when it changed, and who may use it.
 * @param summary - the summary
 * @returns the facts
 */
function metaOf(summary: NdexSummary): Record<string, string> {
    const meta: Record<string, string> = {};
    const modified = iso(summary.modificationTime);
    if (modified !== undefined) {
        meta.modified = modified;
    }
    if (typeof summary.visibility === "string") {
        meta.visibility = summary.visibility;
    }
    for (const key of ["rights", "rightsHolder"]) {
        const value = summary.properties?.[key]?.v;
        if (typeof value === "string") {
            meta[key] = value;
        }
    }
    return meta;
}

/**
 * The validators of a summary.
 * @param summary - the summary
 * @returns `{ modified }` when NDEx gave a modification time
 */
function validatorsOf(summary: NdexSummary): SourceValidators {
    const modified = iso(summary.modificationTime);
    return modified === undefined ? {} : { modified };
}

/**
 * The NDEx source. Experimental.
 * @category Network sources
 */
export const ndexSource: GraphSource<NdexParams> = defineSource<NdexParams>({
    id: NDEX_SOURCE_ID,
    descriptor: NDEX_DESCRIPTOR,
    async file(params, ctx) {
        const uuid = checkedUuid(params.uuid, ctx);
        const format = params.format ?? "cx2";
        const { summary, bytes } = await readSummary(uuid, ctx);
        checkCaps(summary, format, ctx);
        const size = sizeOf(summary, format);
        // progress counts every byte read, the summary's included
        ctx.progress(bytes, size === undefined ? undefined : bytes + size, "bytes");
        // records the validators in report.source; the file path keeps them
        ctx.finish({ validators: validatorsOf(summary) });
        const path = format === "cx" ? `v2/network/${uuid}` : `v3/networks/${uuid}`;
        const body = await ndexFetch(ctx, path, uuid);
        return { body, format, meta: metaOf(summary) };
    },
    async probe(params, ctx): Promise<SourceProbe> {
        const uuid = checkedUuid(params.uuid, ctx);
        const { summary } = await readSummary(uuid, ctx);
        return {
            ok: true,
            counts: {
                nodes: summary.nodeCount,
                edges: summary.edgeCount,
                bytes: sizeOf(summary, params.format ?? "cx2"),
            },
        };
    },
    async list(query: SourceListQuery<NdexParams>, ctx): Promise<SourceListing> {
        checkEndpoint(ctx);
        const start = Number(query.cursor?.start ?? 0);
        const size = query.size ?? 25;
        const body = await ctx.fetchJson<{ networks?: unknown; numFound?: unknown }>(
            `v2/search/network?start=${String(start)}&size=${String(size)}`,
            {
                method: "POST",
                idempotent: true,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ searchString: query.search ?? "" }),
            },
        );
        const networks = Array.isArray(body.networks)
            ? (body.networks as readonly NdexSearchHit[])
            : failOn(ctx.report, "E_SOURCE_RESPONSE", "the NDEx search answer has no networks", {
                  origin: endpointOrigin(ctx.endpoint),
                  expected: "ndex-search",
                  contentType: "application/json",
              });
        const { numFound } = body;
        const items = networks.flatMap((n) =>
            typeof n.externalId === "string"
                ? [
                      {
                          params: { uuid: n.externalId },
                          name: n.name ?? n.externalId,
                          nodeCount: n.nodeCount,
                          edgeCount: n.edgeCount,
                          modified: iso(n.modificationTime),
                      },
                  ]
                : [],
        );
        const total = typeof numFound === "number" ? numFound : undefined;
        const more = total === undefined ? networks.length === size : start + networks.length < total;
        return { items, next: more && networks.length > 0 ? { start: start + networks.length } : null, total };
    },
    async validate(params, seen, ctx): Promise<SourceFreshness> {
        const uuid = checkedUuid(params.uuid, ctx);
        const validators = validatorsOf((await readSummary(uuid, ctx)).summary);
        if (seen.modified === undefined || validators.modified === undefined) {
            return { status: "unverifiable", validators };
        }
        return seen.modified === validators.modified
            ? { status: "current", via: "modified", validators }
            : { status: "changed", via: "modified", changedAt: validators.modified, validators };
    },
    expand: expandNdex,
});
