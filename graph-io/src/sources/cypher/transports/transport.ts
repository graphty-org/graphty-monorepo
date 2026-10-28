/**
 * What every Cypher transport is (design section 12.2): something that runs one statement with
 * its parameters and returns mapped rows, knows the server's profile, and closes. Also the one
 * place a server's own error code becomes a source issue code.
 */

import { type ImportReportBuilder } from "../../../common/report.js";
import { failOn } from "../../fail.js";
import { type SourceContext } from "../../types.js";
import { type QueryResult } from "../flatten.js";
import { type CypherParams } from "../params.js";
import { type CypherProfile } from "../profiles.js";
import { type MapContext } from "../types-map.js";

/** One way a Cypher statement travels to a server. Internal. */
export interface Transport {
    /**
     * Run one read-only statement.
     * @param statement - the statement
     * @param parameters - its parameters, sent separately
     * @returns the mapped result
     */
    run(statement: string, parameters: Readonly<Record<string, unknown>>): Promise<QueryResult>;
    /**
     * The server's profile, detected once.
     * @returns the profile
     */
    profile(): Promise<CypherProfile>;
    /**
     * The server facts `probe` reports, which may cost a request.
     * @returns the profile with its version filled in where the server says it
     */
    probe(): Promise<CypherProfile>;
    /** Release the connection. */
    close(): Promise<void>;
}

/** What a transport is made from. */
export interface TransportInput {
    /** The load's context. */
    readonly ctx: SourceContext;
    /** The params, with defaults. */
    readonly params: CypherParams;
    /** The type mapper's context. */
    readonly m: MapContext;
}

/** The longest server message a report keeps. */
const MAX_SERVER_MESSAGE = 500;

/** What a server said about a failed statement. */
interface ServerError {
    /** The service's own code, or null. */
    readonly code: string | null;
    /** Its message, or "". */
    readonly message: string;
    /** The HTTP status, or null over Bolt. */
    readonly status: number | null;
    /** Whether the message came from a JSON 4xx body (or a Bolt client error), so a report may keep it. */
    readonly showable: boolean;
}

/**
 * Raise the source issue a server error is: a login failure, a refusal, a server timeout, a
 * missing database, or E_SOURCE_QUERY with the line and column the message names.
 * @param report - the load's report
 * @param err - what the server said
 * @param origin - the origin that answered
 * @param database - the database asked for, if any
 * @returns never; it throws
 */
export function serverError(
    report: ImportReportBuilder,
    err: ServerError,
    origin: string,
    database: string | undefined,
): never {
    const code = err.code ?? "";
    if (/Security\.Unauthorized|AuthenticationRateLimit|UnauthorizedException/i.test(code)) {
        return failOn(report, "E_SOURCE_AUTH", `${origin} refused the login`, {
            origin,
            status: err.status,
            scheme: null,
            serverCode: err.code,
        });
    }
    if (/Security\.Forbidden|AccessMode|AccessDenied/i.test(code)) {
        return failOn(report, "E_SOURCE_FORBIDDEN", `${origin} refused the statement`, {
            status: err.status,
            serverCode: err.code,
        });
    }
    if (/TimedOut|Timeout|TimeLimitExceeded/i.test(code)) {
        return failOn(report, "E_SOURCE_TIMEOUT", `${origin} timed the statement out`, {
            timeoutMs: null,
            serverSide: true,
        });
    }
    if (/DatabaseNotFound/i.test(code)) {
        return failOn(report, "E_SOURCE_NOT_FOUND", `${origin} has no database ${String(database)}`, {
            what: "database",
            value: database ?? null,
        });
    }
    const where = /line (\d+), column (\d+)/i.exec(err.message);
    return failOn(report, "E_SOURCE_QUERY", `${origin} refused the query: ${code}`, {
        serverCode: err.code,
        line: where === null ? null : Number(where[1]),
        column: where === null ? null : Number(where[2]),
        serverMessage: err.showable && err.message !== "" ? err.message.slice(0, MAX_SERVER_MESSAGE) : null,
    });
}

/**
 * The value of a response body as JSON, or null when it is not JSON.
 * @param text - the body
 * @returns the parsed value, or null
 */
export function parseJson(text: string): unknown {
    try {
        return JSON.parse(text) as unknown;
    } catch {
        return null;
    }
}

/**
 * The fields and rows of a result given as one object per row (Neptune's `results`).
 * @param results - the row objects
 * @param map - maps one value, given its column
 * @returns the result
 */
export function objectRows(
    results: readonly Readonly<Record<string, unknown>>[],
    map: (v: unknown, column: string) => unknown,
): QueryResult {
    const fields = [...new Set(results.flatMap((r) => Object.keys(r)))];
    return { fields, rows: results.map((r) => fields.map((f) => map(r[f], f))) };
}
