/**
 * The issue codes of network sources (design section 8). Every failure a source or the framework
 * raises is an ImportIssue with one of these codes and machine-readable `params`; graph-io writes
 * no reader-facing sentence. The English `message` is for logs.
 *
 * Experimental, with the source contract.
 */

import { FETCH_CODE } from "../common/codes.js";

/**
 * Every issue code a network source can report, keyed by itself, so `SOURCE_ISSUE.E_SOURCE_AUTH`
 * autocompletes and `keyof typeof SOURCE_ISSUE` is the code union. Experimental.
 * @category Network sources
 */
export const SOURCE_ISSUE = Object.freeze({
    /** Another HTTP status, or an unreachable host (Node). Params: `url`, `status`. */
    E_FETCH: FETCH_CODE,
    /** The browser refused the request and hid why. Params: `url`, `cause`. */
    E_SOURCE_BLOCKED: "E_SOURCE_BLOCKED",
    /** 401 or a database login failure. Params: `origin`, `status`, `scheme`, `serverCode`. */
    E_SOURCE_AUTH: "E_SOURCE_AUTH",
    /** 403 or a database authorization failure. Params: `status`, `serverCode`. */
    E_SOURCE_FORBIDDEN: "E_SOURCE_FORBIDDEN",
    /** The named item does not exist. Params: `what`, `value`. */
    E_SOURCE_NOT_FOUND: "E_SOURCE_NOT_FOUND",
    /** 429 after the retries. Params: `retryAfterMs`. */
    E_SOURCE_QUOTA: "E_SOURCE_QUOTA",
    /** `timeoutMs` passed, or the server's own timeout. Params: `timeoutMs`, `serverSide`. */
    E_SOURCE_TIMEOUT: "E_SOURCE_TIMEOUT",
    /** The server rejected the query. Params: `serverCode`, `line`, `column`, `serverMessage`. */
    E_SOURCE_QUERY: "E_SOURCE_QUERY",
    /** The result holds no node, relationship or path. Params: `columns`. */
    E_SOURCE_NOT_A_GRAPH: "E_SOURCE_NOT_A_GRAPH",
    /** A response body of the wrong shape. Params: `expected`, `contentType`. */
    E_SOURCE_RESPONSE: "E_SOURCE_RESPONSE",
    /** A redirect, or a changed origin, while a credential was attached. Params: `from`, `to`. */
    E_SOURCE_REDIRECT: "E_SOURCE_REDIRECT",
    /** The source cannot run in this runtime. Params: `runtime`, `reason`, `package`. */
    E_SOURCE_RUNTIME: "E_SOURCE_RUNTIME",
    /** A parameter or option is invalid. Params: `name`, `reason`. */
    E_SOURCE_PARAM: "E_SOURCE_PARAM",
    /** A cap was reached under `onLimit: "error"`. Params: `limit`, `value`. */
    E_SOURCE_LIMIT: "E_SOURCE_LIMIT",
    /** No source has that id. Params: `id`, `known`. */
    E_SOURCE_UNKNOWN: "E_SOURCE_UNKNOWN",
    /** The source lacks the feature. Params: `feature`, `needs`. */
    E_SOURCE_UNSUPPORTED: "E_SOURCE_UNSUPPORTED",
    /** A malformed source at registration. Params: `id`, `reason`. */
    E_SOURCE_INVALID: "E_SOURCE_INVALID",
    /** A cap stopped the load; what came first is kept. Params: `limit`, `value`. */
    W_SOURCE_LIMIT: "W_SOURCE_LIMIT",
    /** A later page needs a credential; the pages before it are kept. Params: `origin`, `status`. */
    W_SOURCE_AUTH: "W_SOURCE_AUTH",
    /** The request succeeded after retries. Params: `attempts`, `statuses`. */
    W_SOURCE_RETRIED: "W_SOURCE_RETRIED",
    /** A server value with no dtype. Params: `type`, `column`, `as`. */
    W_SOURCE_VALUE: "W_SOURCE_VALUE",
} as const);

/**
 * A network source issue code. Experimental.
 * @category Network sources
 */
export type SourceIssueCode = keyof typeof SOURCE_ISSUE;

/**
 * Why `E_SOURCE_BLOCKED` was raised, as far as a page can tell. Open: handle unknown values.
 * @category Network sources
 */
export type SourceBlockedCause = "cors" | "unreachable" | "local-network" | "unknown" | (string & {}); // NOSONAR(S4335): open string union, keeps the known names autocompleting

/**
 * The `params` of each source issue code. Every URL is origin and path only. Experimental.
 * @category Network sources
 */
export interface SourceIssueParams {
    /** Another status, or an unreachable host. */
    readonly E_FETCH: {
        /** The address, origin and path only. */
        readonly url: string;
        /** The HTTP status, or null when there was none. */
        readonly status: number | null;
    };
    /** Refused by the browser. */
    readonly E_SOURCE_BLOCKED: {
        /** The address, origin and path only. */
        readonly url: string;
        /** Why, as far as the page can tell. */
        readonly cause: SourceBlockedCause;
    };
    /** A credential is needed or was refused. */
    readonly E_SOURCE_AUTH: {
        /** The origin that asked for a credential. */
        readonly origin: string;
        /** The HTTP status, or null when there was none. */
        readonly status: number | null;
        /** The authentication scheme the server named, or null. */
        readonly scheme: string | null;
        /** The service's own code, passed through, or null. */
        readonly serverCode: string | null;
        /** Set by graphty-element when the credential came from its store. */
        readonly stored?: boolean;
    };
    /** Not allowed. */
    readonly E_SOURCE_FORBIDDEN: {
        /** The HTTP status, or null when there was none. */
        readonly status: number | null;
        /** The service's own code, passed through, or null. */
        readonly serverCode: string | null;
    };
    /** No such item. */
    readonly E_SOURCE_NOT_FOUND: {
        /** What was looked up (`url`, `network`, `node`). */
        readonly what: string;
        /** The value that reached the cap, or what was looked up. */
        readonly value: string;
    };
    /** Out of quota. */
    readonly E_SOURCE_QUOTA: {
        /** How long the service asked to wait, when readable. */
        readonly retryAfterMs: number | null;
    };
    /** Took too long. */
    readonly E_SOURCE_TIMEOUT: {
        /** The time limit, or null for the server's own. */
        readonly timeoutMs: number | null;
        /** Whether the server timed the query out. */
        readonly serverSide: boolean;
    };
    /** The query was refused. */
    readonly E_SOURCE_QUERY: {
        /** The service's own code, passed through, or null. */
        readonly serverCode: string | null;
        /** The query line the server named, or null. */
        readonly line: number | null;
        /** The query column the server named, or null. */
        readonly column: number | null;
        /** The server's message from a JSON 4xx body, at most 500 characters, or null. */
        readonly serverMessage: string | null;
    };
    /** Scalars only. */
    readonly E_SOURCE_NOT_A_GRAPH: {
        /** The result's column names. */
        readonly columns: readonly string[];
    };
    /** Wrong body. */
    readonly E_SOURCE_RESPONSE: {
        /** What shape was expected (`json`, `graph-file`, `link-header`). */
        readonly expected: string;
        /** The response's Content-Type, or null. */
        readonly contentType: string | null;
    };
    /** A redirect with a credential; `to` is null in a browser, which hides it. */
    readonly E_SOURCE_REDIRECT: {
        /** Where the request was going, origin and path. */
        readonly from: string;
        /** Where it was sent instead, or null when the browser hides it. */
        readonly to: string | null;
    };
    /** Cannot run here. */
    readonly E_SOURCE_RUNTIME: {
        /** The runtime it ran in. */
        readonly runtime: string;
        /** Why, as a code. */
        readonly reason: string;
        /** The optional package that is missing. */
        readonly package?: string;
    };
    /** A bad parameter or option. */
    readonly E_SOURCE_PARAM: {
        /** The parameter or option's name. */
        readonly name: string;
        /** Why, as a code. */
        readonly reason: string;
    };
    /** A cap under onLimit "error". */
    readonly E_SOURCE_LIMIT: {
        /** The cap's option name (`maxNodes`, `maxBytes`, ...). */
        readonly limit: string;
        /** The value that reached the cap, or what was looked up. */
        readonly value: number;
    };
    /** No such source. */
    readonly E_SOURCE_UNKNOWN: {
        /** The source id. */
        readonly id: string;
        /** The ids that are registered. */
        readonly known: readonly string[];
    };
    /** The source lacks the feature. */
    readonly E_SOURCE_UNSUPPORTED: {
        /** The feature asked for. */
        readonly feature: string;
        /** What it needs, when known. */
        readonly needs?: string;
    };
    /** A malformed source. */
    readonly E_SOURCE_INVALID: {
        /** The source id. */
        readonly id: string;
        /** Why, as a code. */
        readonly reason: string;
    };
    /** A cap stopped the load. */
    readonly W_SOURCE_LIMIT: {
        /** The cap's option name (`maxNodes`, `maxBytes`, ...). */
        readonly limit: string;
        /** The value that reached the cap, or what was looked up. */
        readonly value: number;
    };
    /** A later page needs a credential. */
    readonly W_SOURCE_AUTH: {
        /** The origin that asked for a credential. */
        readonly origin: string;
        /** The HTTP status, or null when there was none. */
        readonly status: number | null;
    };
    /** Retried. */
    readonly W_SOURCE_RETRIED: {
        /** How many attempts were made. */
        readonly attempts: number;
        /** The status of each failed attempt, null for a network failure. */
        readonly statuses: readonly (number | null)[];
    };
    /** A value with no dtype. */
    readonly W_SOURCE_VALUE: {
        /** The server's value type. */
        readonly type: string;
        /** The column (of the query, or of the graph) involved. */
        readonly column: string;
        /** What the value was kept as. */
        readonly as: string;
    };
}
