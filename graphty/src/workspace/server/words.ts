/**
 * The server package's words: a source failure or warning code as a short label, and a refusal
 * as a coded fact.
 */

import { type CodedFact, type CodedFactParam, GraphtyError } from "@graphty/graphty-element/session";

/** A short label per source code (graph-io's `SOURCE_ISSUE`); the code itself for any other. */
const CODE_WORDS: Readonly<Record<string, string>> = {
    E_FETCH: "unreachable",
    E_FETCH_FAILED: "unreachable",
    E_FAILED: "failed",
    E_SOURCE_BLOCKED: "blocked by the browser",
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
    W_SOURCE_LIMIT: "capped",
    W_SOURCE_AUTH: "sign-in needed for more",
    W_SOURCE_RETRIED: "retried",
    W_SOURCE_VALUE: "unread value",
};

/**
 * A coded fact as a short label: "sign-in refused", "missing or wrong value: uuid".
 * @param fact - the code and its params.
 * @returns the label.
 */
export function codeWords(fact: CodedFact): string {
    const words = CODE_WORDS[fact.code] ?? fact.code;
    const { name } = fact.params;
    return typeof name === "string" ? `${words}: ${name}` : words;
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
