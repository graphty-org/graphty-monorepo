/**
 * The `neptune-https` transport (design section 12.4): Neptune Database's `POST /openCypher`
 * (port 8182, TLS only), form fields `query` and `parameters`, signed with `credentials.awsSigV4`
 * (service "neptune-db") or unsigned inside the VPC. Node only: Neptune Database sends no CORS
 * headers, so a browser is refused before any request (E_SOURCE_RUNTIME, reason "cors").
 *
 * An error after the first chunk of a 200 answer is appended to the body; the tail is read for it.
 */

import { originOf } from "../../credentials.js";
import { failOn } from "../../fail.js";
import { type SourceContext } from "../../types.js";
import { type QueryResult } from "../flatten.js";
import { type CypherProfile, neptuneProfile } from "../profiles.js";
import { fromNeptune } from "../types-map.js";
import { objectRows, parseJson, serverError, type Transport, type TransportInput } from "./transport.js";

/** Neptune's error body. */
interface NeptuneError {
    readonly code?: string;
    readonly detailedMessage?: string;
    readonly message?: string;
}

/**
 * Refuse a Neptune transport where it cannot run.
 * @param ctx - the context
 * @param transport - the transport name
 */
export function nodeOnly(ctx: SourceContext, transport: string): void {
    if (ctx.runtime === "browser" || ctx.runtime === "worker") {
        failOn(ctx.report, "E_SOURCE_RUNTIME", `the ${transport} transport cannot run in a browser`, {
            runtime: ctx.runtime,
            reason: "cors",
        });
    }
}

/**
 * The error a body ends with, when a 200 answer was cut short by one.
 * @param text - the body
 * @returns the error, or null
 */
function trailingError(text: string): NeptuneError | null {
    for (let at = text.lastIndexOf("{"); at > 0; at = text.lastIndexOf("{", at - 1)) {
        const tail = parseJson(text.slice(at)) as NeptuneError | null;
        if (tail !== null && typeof tail.code === "string") {
            return tail;
        }
    }
    return null;
}

/**
 * Turn a Neptune answer into a result, or raise its error.
 * @param input - the transport input
 * @param response - the answer
 * @returns the mapped result
 */
export async function neptuneResult(input: TransportInput, response: Response): Promise<QueryResult> {
    const { ctx, m } = input;
    const origin = ctx.endpoint === null ? "" : originOf(ctx.endpoint);
    const text = await response.text();
    const body = parseJson(text) as ({ results?: readonly Record<string, unknown>[] } & NeptuneError) | null;
    let error: NeptuneError | null = typeof body?.code === "string" ? body : null;
    if (body === null) {
        error = trailingError(text);
    }
    if (error !== null) {
        serverError(
            ctx.report,
            {
                code: error.code ?? null,
                message: error.detailedMessage ?? error.message ?? "",
                status: response.status,
                showable: body !== null && response.status >= 400 && response.status < 500,
            },
            origin,
            undefined,
        );
    }
    if (!response.ok) {
        failOn(ctx.report, "E_FETCH", `${origin} answered ${String(response.status)}`, {
            url: origin,
            status: response.status,
        });
    }
    if (body === null || !Array.isArray(body.results)) {
        failOn(ctx.report, "E_SOURCE_RESPONSE", "the Neptune answer has no results", {
            expected: "json",
            contentType: response.headers.get("content-type"),
        });
    }
    return objectRows(body.results, (v, column) => fromNeptune(v, column, m));
}

/**
 * Make the transport.
 * @param input - the context, params and mapper
 * @returns the transport
 */
export function neptuneHttpsTransport(input: TransportInput): Transport {
    const { ctx } = input;
    nodeOnly(ctx, "neptune-https");
    return {
        async run(statement, parameters): Promise<QueryResult> {
            const response = await ctx.fetch("openCypher", {
                method: "POST",
                idempotent: true,
                allowStatus: [400, 500],
                body: new URLSearchParams({ query: statement, parameters: JSON.stringify(parameters) }),
            });
            return neptuneResult(input, response);
        },
        profile: () => Promise.resolve(neptuneProfile()),
        probe: async (): Promise<CypherProfile> => {
            const status = await ctx.fetchJson<{ dbEngineVersion?: string }>("status");
            return neptuneProfile(typeof status.dbEngineVersion === "string" ? status.dbEngineVersion : null);
        },
        close: () => Promise.resolve(),
    };
}
