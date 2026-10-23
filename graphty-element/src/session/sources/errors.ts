/**
 * @file graph-io's coded source failures as the element's `GraphtyError`: the issue's code becomes
 * the error's code and its params the error's details, so a consumer switches on `err.code` as
 * for every other element failure.
 */

import { ImportError } from "@graphty/graph-io";

import { type GraphtyErrorCode, isGraphtyErrorCode } from "../../errors/codes";
import { GraphtyError } from "../../errors/GraphtyError";

/** graph-io's codes the element spells differently. */
const RENAMED: Readonly<Record<string, GraphtyErrorCode>> = { E_FETCH: "E_FETCH_FAILED" };

/** The codes a later attempt may get past without the caller changing anything. */
const RECOVERABLE: ReadonlySet<string> = new Set([
    "E_FETCH_FAILED",
    "E_SOURCE_QUOTA",
    "E_SOURCE_TIMEOUT",
    "E_SOURCE_BLOCKED",
]);

/**
 * The element's error for what a source call threw: an ImportError with a source code becomes a
 * `GraphtyError` with that code and its params as details; anything else passes unchanged.
 * @param error - what graph-io threw
 * @param extra - details to add (`E_SOURCE_AUTH` gains `stored`)
 * @returns the error to throw
 */
export function toGraphtyError(error: unknown, extra: Readonly<Record<string, unknown>> = {}): unknown {
    if (!(error instanceof ImportError) || error.issue === null) {
        return error;
    }
    const raw = String(error.issue.code);
    const code = RENAMED[raw] ?? (isGraphtyErrorCode(raw) ? raw : null);
    if (code === null) {
        return error;
    }
    return new GraphtyError({
        code,
        message: error.message,
        source: "data",
        recoverable: RECOVERABLE.has(code),
        details: { ...error.issue.params, ...(code === "E_SOURCE_AUTH" ? extra : undefined) },
        cause: error,
    });
}

/**
 * The refusal of a source feature the element has not built yet.
 * @param feature - what was asked for
 * @returns the error
 */
export function notBuiltYet(feature: string): GraphtyError {
    return new GraphtyError({
        code: "E_SOURCE_UNSUPPORTED",
        message: `${feature} from a network source is not available yet.`,
        source: "data",
        details: { feature },
    });
}
