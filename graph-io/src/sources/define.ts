/**
 * `defineSource` and the registration checks (design section 2): the id form, exactly one read
 * method, and the declared features against the methods present. Also the parameter checks every
 * load runs against the descriptor before any request.
 */

import { type ImportReportBuilder } from "../common/report.js";
import { failAlone, failOn } from "./fail.js";
import {
    type GraphSource,
    type LazySource,
    type SourceDescriptor,
    type SourceFeature,
    type SourceParamDescriptor,
} from "./types.js";

/** Lowercase letters, digits and single dashes between them. */
const ID_FORM = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** The optional methods and the feature each one is. */
const FEATURE_METHODS: readonly (readonly [SourceFeature, "expand" | "probe" | "list" | "validate"])[] = [
    ["expand", "expand"],
    ["probe", "probe"],
    ["list", "list"],
    ["validate", "validate"],
];

/**
 * Refuse a malformed source.
 * @param id - the source id
 * @param reason - why
 * @param message - for logs
 */
function invalid(id: string, reason: string, message: string): never {
    failAlone("E_SOURCE_INVALID", message, { id, reason });
}

/**
 * Check a source id.
 * @param id - the id
 */
function checkSourceId(id: unknown): asserts id is string {
    if (typeof id !== "string" || !ID_FORM.test(id)) {
        invalid(String(id), "id", `source id ${JSON.stringify(id)} must be lowercase letters, digits and dashes`);
    }
}

/**
 * The features a loaded source has, from its methods.
 * @param source - the source
 * @returns the features
 */
function featuresOf(source: GraphSource<never>): readonly SourceFeature[] {
    return FEATURE_METHODS.filter(([, method]) => typeof source[method] === "function").map(([f]) => f);
}

/**
 * Check a loaded source: its id, exactly one read method, and its declared features.
 * @param source - the source
 * @param declared - features a lazy registration declared, if any
 */
export function checkSource(source: GraphSource<never>, declared?: SourceDescriptor): void {
    checkSourceId((source as { id?: unknown }).id);
    const reads = (["records", "file", "import"] as const).filter((m) => typeof source[m] === "function");
    if (reads.length !== 1) {
        invalid(source.id, "read-methods", `source ${source.id} must have exactly one of records, file and import`);
    }
    const features = (declared ?? source.descriptor)?.features;
    if (features !== undefined) {
        const has = new Set(featuresOf(source));
        for (const f of features) {
            if (f !== "page" && !has.has(f)) {
                invalid(source.id, "features", `source ${source.id} declares ${f} but has no ${f} method`);
            }
        }
    }
}

/**
 * Check a lazy registration before its code is loaded.
 * @param source - the lazy source
 */
export function checkLazySource(source: LazySource): void {
    checkSourceId(source.id);
    if (typeof source.load !== "function" || typeof source.descriptor !== "object") {
        invalid(source.id, "lazy", `lazy source ${source.id} needs a descriptor and a load function`);
    }
}

/**
 * Define a network source: returns it unchanged, with its parameter type inferred, after the
 * registration checks (an id of lowercase letters, digits and dashes; exactly one of `records`,
 * `file` and `import`; declared features backed by methods). A malformed source throws an
 * ImportError whose `issue.code` is E_SOURCE_INVALID. Experimental.
 * @param source - the source
 * @returns the same source
 * @example
 * ```ts
 * const people = defineSource({
 *     id: "people",
 *     async records(params: { team: string }, ctx) {
 *         const rows = await ctx.fetchJson<{ id: string; name: string }[]>(`/api/people?team=${params.team}`);
 *         return { nodes: rows };
 *     },
 * });
 * ```
 * @category Network sources
 */
export function defineSource<P>(source: GraphSource<P>): GraphSource<P> {
    checkSource(source);
    return source;
}

/**
 * Why a number or integer param is wrong, if it is.
 * @param p - the param's descriptor
 * @param value - the value given
 * @returns the reason, or null when it is fine
 */
function numberProblem(p: SourceParamDescriptor, value: unknown): string | null {
    if (typeof value !== "number" || Number.isNaN(value) || (p.type === "integer" && !Number.isInteger(value))) {
        return "type";
    }
    if ((p.min !== undefined && value < p.min) || (p.max !== undefined && value > p.max)) {
        return "range";
    }
    return null;
}

/**
 * Why a URL param is wrong, if it is.
 * @param value - the value given
 * @returns the reason, or null when it is fine
 */
function urlProblem(value: unknown): string | null {
    let url: URL;
    try {
        url = new URL(typeof value === "string" ? value : "");
    } catch {
        return "type";
    }
    return url.username !== "" || url.password !== "" ? "credentials-in-url" : null;
}

/**
 * Why a present param value is wrong for its descriptor, if it is.
 * @param p - the param's descriptor
 * @param value - the value given (not undefined or null)
 * @returns the reason, or null when it is fine
 */
function paramProblem(p: SourceParamDescriptor, value: unknown): string | null {
    switch (p.type) {
        case "integer":
        case "number":
            return numberProblem(p, value);
        case "boolean":
            return typeof value === "boolean" ? null : "type";
        case "enum":
            return p.values !== undefined && !p.values.some((v) => v.value === value) ? "enum" : null;
        case "url":
            return urlProblem(value);
        default:
            return null;
    }
}

/**
 * Check params against a descriptor before any request: required ones present, numbers and
 * integers in range, booleans, enums, URLs (never with a user name or password in them).
 * @param params - the caller's params
 * @param descriptor - the source's descriptor
 * @param report - the load's report
 */
export function checkParams(
    params: Readonly<Record<string, unknown>>,
    descriptor: SourceDescriptor | undefined,
    report: ImportReportBuilder,
): void {
    if (typeof params !== "object" || (params as unknown) === null) {
        failOn(report, "E_SOURCE_PARAM", "params must be an object", { name: "params", reason: "type" });
    }
    for (const p of descriptor?.params ?? []) {
        const value = params[p.name];
        const missing = value === undefined || value === null;
        let reason: string | null = null;
        if (!missing) {
            reason = paramProblem(p, value);
        } else if (p.required === true && p.default === undefined) {
            reason = "required";
        }
        if (reason !== null) {
            failOn(report, "E_SOURCE_PARAM", `parameter ${p.name}: ${reason}`, { name: p.name, reason });
        }
    }
}
