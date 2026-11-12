/**
 * Raising a network source issue: one place that turns a code and its params into an ImportError
 * whose `issue.params` and `details` both carry the params, so callers branch on
 * `err.issue.code` and read `err.issue.params` as with every other graph-io failure.
 */

import { ImportReportBuilder } from "../common/report.js";
import { type IssueCategory } from "../types.js";
import { type SourceIssueCode } from "./codes.js";

/** The category each code is filed under. */
const CATEGORY: Readonly<Partial<Record<SourceIssueCode, IssueCategory>>> = {
    E_SOURCE_PARAM: "validation-error",
    E_SOURCE_INVALID: "validation-error",
    E_SOURCE_RESPONSE: "parse-error",
    E_SOURCE_NOT_A_GRAPH: "parse-error",
    E_SOURCE_NOT_FOUND: "missing-value",
    E_SOURCE_UNKNOWN: "missing-value",
};

/**
 * Abort a load with a source error, carrying the load's report so far plus the error.
 * @param report - the load's report
 * @param code - the code
 * @param message - a plain-ASCII message, for logs
 * @param params - the issue's values
 * @returns never; it throws the ImportError
 */
export function failOn(
    report: ImportReportBuilder,
    code: SourceIssueCode,
    message: string,
    params: Readonly<Record<string, unknown>>,
): never {
    // a fork, so a failure the runner turns into a warning (a later page's 401, a cap) leaves no
    // error in the load's own report; the ImportError carries everything recorded so far
    return report.fork().failWith(CATEGORY[code] ?? "unsupported", code, message, undefined, params, params);
}

/**
 * Raise a source error outside a load (registration, a credential factory).
 * @param code - the code
 * @param message - a plain-ASCII message, for logs
 * @param params - the issue's values
 * @param format - the report's format name
 */
export function failAlone(
    code: SourceIssueCode,
    message: string,
    params: Readonly<Record<string, unknown>>,
    format = "source",
): never {
    failOn(new ImportReportBuilder(format, 0), code, message, params);
}

/**
 * Record a source warning on a report.
 * @param report - the report
 * @param code - the code
 * @param message - a plain-ASCII message, for logs
 * @param params - the issue's values
 */
export function warnOn(
    report: ImportReportBuilder,
    code: SourceIssueCode,
    message: string,
    params: Readonly<Record<string, unknown>>,
): void {
    report.warning("unsupported", code, message, undefined, params);
}
