/**
 * What every NDEx call shares: the checks on the endpoint and the network UUID, and a fetch that
 * classifies NDEx's failures.
 */

import { failOn } from "../fail.js";
import { type SourceContext } from "../types.js";

/** An NDEx network UUID. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The query parameter NDEx reads a link-share access key from. */
export const ACCESS_KEY_QUERY = "accesskey";

/** The statuses whose JSON body (NDEx's errorCode) is read; every other failure is classified by status alone. */
const READ_STATUSES = [401, 403, 404] as const;

/**
 * Refuse an access key in the endpoint: it belongs in a credential, which is never logged.
 * @param ctx - the context
 */
export function checkEndpoint(ctx: SourceContext): void {
    if (ctx.endpoint?.searchParams.has(ACCESS_KEY_QUERY) === true) {
        failOn(ctx.report, "E_SOURCE_PARAM", "an access key goes in a credential, never in the endpoint", {
            name: "endpoint",
            reason: "credentials-in-url",
        });
    }
}

/**
 * Check a call's endpoint and network UUID.
 * @param uuid - the network UUID
 * @param ctx - the context
 * @returns the UUID, lowercase and URL-safe
 */
export function checkedUuid(uuid: unknown, ctx: SourceContext): string {
    checkEndpoint(ctx);
    const value = String(uuid);
    if (/accesskey/i.test(value)) {
        failOn(ctx.report, "E_SOURCE_PARAM", "an access key goes in a credential, never in the uuid", {
            name: "uuid",
            reason: "credentials-in-url",
        });
    }
    if (!UUID.test(value)) {
        failOn(ctx.report, "E_SOURCE_PARAM", "the uuid is not a network UUID", { name: "uuid", reason: "format" });
    }
    return value.toLowerCase();
}

/**
 * Fetch from NDEx, turning a 401, 403 or 404 into its coded error with NDEx's own errorCode.
 * @param ctx - the context
 * @param path - the path, relative to the endpoint
 * @param uuid - the network the request is about, for E_SOURCE_NOT_FOUND
 * @param init - the request init
 * @returns the response, status 2xx
 */
export async function ndexFetch(
    ctx: SourceContext,
    path: string,
    uuid: string | null,
    init: RequestInit & { readonly idempotent?: boolean } = {},
): Promise<Response> {
    const response = await ctx.fetch(path, { ...init, allowStatus: READ_STATUSES });
    if (response.ok) {
        return response;
    }
    const url = new URL(path, ctx.endpoint ?? undefined);
    const serverCode = await errorCode(response);
    const { status } = response;
    if (status === 401) {
        failOn(ctx.report, "E_SOURCE_AUTH", `NDEx answered ${String(status)}`, {
            origin: url.origin,
            status,
            scheme: response.headers.get("www-authenticate")?.split(/\s/)[0] ?? null,
            serverCode,
        });
    }
    if (status === 403) {
        failOn(ctx.report, "E_SOURCE_FORBIDDEN", "NDEx answered 403", { origin: url.origin, status, serverCode });
    }
    return failOn(ctx.report, "E_SOURCE_NOT_FOUND", "NDEx has no such network", {
        origin: url.origin,
        what: uuid === null ? "url" : "network",
        value: uuid ?? `${url.origin}${url.pathname}`,
    });
}

/**
 * NDEx's own error code from a JSON error body, never its message or stack trace.
 * @param response - the failed response
 * @returns the code, or null
 */
async function errorCode(response: Response): Promise<string | null> {
    try {
        const body = (await response.json()) as { errorCode?: unknown };
        return typeof body.errorCode === "string" ? body.errorCode.slice(0, 100) : null;
    } catch {
        return null;
    }
}
