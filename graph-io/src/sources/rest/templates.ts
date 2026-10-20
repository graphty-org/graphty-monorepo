/**
 * Templates of the REST mapping (design section 13.2): `{name}` takes a value. Every value is
 * URL-encoded for its position, a value cannot add a path segment, and the finished URL must have
 * the mapping endpoint's origin and stay under its path.
 */

import { type ImportReportBuilder } from "../../common/report.js";
import { failOn } from "../fail.js";
import { type RestRequest } from "./params.js";

/** One `{name}` in a template. */
const SLOT = /\{([^{}]*)\}/g;

/** A slot name. */
const NAME = /^[A-Za-z_][A-Za-z0-9_-]*$/;

/** The values templates are filled from: params as strings, plus `{id}` and `{ids}`. */
export type TemplateValues = Readonly<Record<string, string>>;

/**
 * The slot names of a template, or null when its braces are malformed.
 * @param template - the template
 * @returns the names
 */
export function templateNames(template: string): string[] | null {
    const names: string[] = [];
    for (const m of template.matchAll(SLOT)) {
        if (!NAME.test(m[1])) {
            return null;
        }
        names.push(m[1]);
    }
    // a brace left over after the slots is malformed
    return /[{}]/.test(template.replaceAll(SLOT, "")) ? null : names;
}

/**
 * Fill a template.
 * @param template - the template
 * @param values - the values
 * @param encode - how a value is encoded for its position
 * @param report - the load's report, for a missing value
 * @returns the filled text
 */
function fill(
    template: string,
    values: TemplateValues,
    encode: (value: string) => string,
    report: ImportReportBuilder,
): string {
    return template.replaceAll(SLOT, (_, name: string) => {
        const value = values[name];
        if (value === undefined) {
            failOn(report, "E_SOURCE_PARAM", `the mapping's template needs ${name}`, { name, reason: "required" });
        }
        return encode(value);
    });
}

/**
 * A path value: percent-encoded, so a slash cannot add a segment, and never a dot segment.
 * @param report - the load's report
 * @returns the encoder
 */
function pathValue(report: ImportReportBuilder): (value: string) => string {
    return (value) => {
        // "." and ".." stay dot segments even percent-encoded, so the URL parser would climb out
        if (value === "." || value === ".." || value === "") {
            failOn(report, "E_SOURCE_PARAM", "a path value may not be empty or a dot segment", {
                name: "path",
                reason: "path",
            });
        }
        return encodeURIComponent(value);
    };
}

/**
 * Check that a URL stays on the mapping's origin and under its path.
 * @param url - the URL
 * @param endpoint - the mapping's endpoint
 * @param report - the load's report
 * @returns the URL
 */
export function checkOrigin(url: URL, endpoint: URL, report: ImportReportBuilder): URL {
    const base = endpoint.pathname.replace(/\/$/, "");
    if (url.origin !== endpoint.origin || !(url.pathname === base || url.pathname.startsWith(`${base}/`))) {
        failOn(report, "E_SOURCE_PARAM", "a request left the mapping's endpoint", { name: "url", reason: "origin" });
    }
    return url;
}

/**
 * The URL and init of one request.
 * @param endpoint - the mapping's endpoint
 * @param request - the request
 * @param values - the template values
 * @param report - the load's report
 * @returns the URL and the fetch init
 */
export function buildRequest(
    endpoint: URL,
    request: RestRequest,
    values: TemplateValues,
    report: ImportReportBuilder,
): { url: URL; init: RequestInit & { idempotent?: boolean } } {
    const path = fill(request.path, values, pathValue(report), report);
    const url = new URL(`${endpoint.origin}${endpoint.pathname.replace(/\/$/, "")}${path}`);
    for (const [key, template] of Object.entries(request.query ?? {})) {
        // URLSearchParams encodes the value for the query
        url.searchParams.set(
            key,
            fill(template, values, (v) => v, report),
        );
    }
    checkOrigin(url, endpoint, report);
    if (request.method !== "POST") {
        return { url, init: {} };
    }
    const body = fillBody(request.body, values, report);
    return {
        url,
        init: {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(body ?? null),
            // a mapping's POST reads; it is a query, so it is as safe to retry as a GET
            idempotent: true,
        },
    };
}

/**
 * Fill the string leaves of a POST body.
 * @param body - the body template
 * @param values - the values
 * @param report - the load's report
 * @returns the body
 */
function fillBody(body: unknown, values: TemplateValues, report: ImportReportBuilder): unknown {
    if (typeof body === "string") {
        return fill(body, values, (v) => v, report);
    }
    if (Array.isArray(body)) {
        return body.map((b) => fillBody(b, values, report));
    }
    if (typeof body === "object" && body !== null) {
        return Object.fromEntries(Object.entries(body).map(([k, v]) => [k, fillBody(v, values, report)]));
    }
    return body;
}
