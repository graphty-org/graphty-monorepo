/**
 * The server package's words: a source failure or warning code as a short label, and a refusal
 * as a coded fact.
 */

import type { SourceCatalogEntry } from "@graphty/graphty-element/catalog";
import { type CodedFact, type CodedFactParam, GraphtyError } from "@graphty/graphty-element/session";

import { formatNumber } from "../inspector/words";

/** The app's names for sources whose catalog name is not the reader's word, by catalog id. */
const KIND_NAMES: Readonly<Record<string, string>> = { rest: "Web API", url: "Load from URL" };

/**
 * A source's name in the app: the catalog's, or the app's own where the catalog's is jargon
 * ("REST API" reads "Web API", as Open network data's card does).
 * @param entry - the source.
 * @returns the name.
 */
export function kindName(entry: SourceCatalogEntry): string {
    return KIND_NAMES[entry.id] ?? entry.descriptor.plainName;
}

/** A short label per source code (graph-io's `SOURCE_ISSUE`); the code itself for any other. */
const CODE_WORDS: Readonly<Record<string, string>> = {
    E_FETCH: "unreachable",
    E_FETCH_FAILED: "unreachable",
    E_FAILED: "failed",
    // The browser reports a refused cross-origin read and a host that is down the same way.
    E_SOURCE_BLOCKED: "unreachable or blocked",
    E_SOURCE_AUTH: "sign-in refused",
    E_SOURCE_FORBIDDEN: "not allowed",
    E_SOURCE_NOT_FOUND: "not found",
    E_SOURCE_QUOTA: "too many requests",
    E_SOURCE_TIMEOUT: "timed out",
    E_SOURCE_QUERY: "query refused",
    E_SOURCE_NOT_A_GRAPH: "no nodes or edges",
    E_SOURCE_RESPONSE: "unexpected answer",
    E_SOURCE_REDIRECT: "redirected",
    E_SOURCE_RUNTIME: "not in a browser",
    E_SOURCE_PARAM: "missing or wrong value",
    E_SOURCE_LIMIT: "over the limit",
    E_SOURCE_UNSUPPORTED: "not supported",
    E_TOO_LARGE: "too large to draw",
    W_SOURCE_LIMIT: "capped",
    W_SOURCE_AUTH: "sign-in needed for more",
    W_SOURCE_RETRIED: "retried",
    W_SOURCE_VALUE: "unread value",
    W_STYLES_NOT_IMPORTED: "styles not read",
};

/** What each of graph-io's caps counts. */
const LIMIT_UNITS: Readonly<Record<string, string>> = { maxNodes: "nodes", maxEdges: "edges", maxBytes: "bytes" };

/**
 * A coded fact as a short label: "missing or wrong value: uuid", with the host of the server
 * that answered, "too many requests: api.openalex.org", or, past a cap, how much the source holds
 * and the form's row that caps it, "2,794 nodes: over Limit".
 * @param fact - the code and its params.
 * @returns the label.
 */
export function codeWords(fact: CodedFact): string {
    const words = CODE_WORDS[fact.code] ?? fact.code;
    const { name, origin, limit, value } = fact.params;
    if (fact.code === "E_SOURCE_LIMIT" && typeof limit === "string" && typeof value === "number") {
        return `${formatNumber(value)} ${LIMIT_UNITS[limit] ?? limit}: over Limit`;
    }
    if (typeof name === "string") {
        return `${words}: ${name}`;
    }
    const host = typeof origin === "string" && URL.canParse(origin) ? new URL(origin).host : null;
    return host === null ? words : `${words}: ${host}`;
}

/**
 * A failure as a coded fact: a `GraphtyError`'s code and details, else a bare failure.
 * @param error - what the element rejected with.
 * @returns the fact.
 */
export function failureOf(error: unknown): CodedFact {
    if (error instanceof GraphtyError) {
        return { code: error.code, params: error.details as Readonly<Record<string, CodedFactParam>> };
    }
    return { code: "E_FAILED", params: {} };
}
