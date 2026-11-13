/**
 * @file graph-io's coded source failures as the element's `GraphtyError`: the issue's code becomes
 * the error's code and its params the error's details, so a consumer switches on `err.code` as
 * for every other element failure.
 */

import { ImportError } from "@graphty/graph-io";

import { parseFailed } from "../../data/graph-io-import";
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
 * `GraphtyError` with that code and its params as details, one an importer stopped on becomes
 * `E_PARSE_FAILED` (or `E_EMPTY_LOAD`); anything else passes unchanged.
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
        // A file a source fetched that its format's importer could not read fails as a file does.
        return parseFailed(error.report.format, error);
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
 * The refusal of a fetch for a load an opened project holds that has not run since it opened: a
 * file's entry fetches nothing until the application runs it with `runPendingSourceLoad`, after
 * the reader approved (sources.md, "Reopening").
 * @param id - the load's key
 * @returns the error
 */
export function notYetRun(id: string): GraphtyError {
    return new GraphtyError({
        code: "E_SOURCE_PENDING",
        message: `The load ${id} of the opened project has not been run yet; run it with runPendingSourceLoad first.`,
        source: "data",
        details: { id },
    });
}
