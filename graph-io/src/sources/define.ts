/**
 * `defineSource` and the registration checks (design section 2): the id form, exactly one read
 * method, and the declared features against the methods present. Also the parameter checks every
 * load runs against the descriptor before any request.
 */

import { type ImportReportBuilder } from "../common/report.js";
import { failAlone, failOn } from "./fail.js";
import { type GraphSource, type LazySource, type SourceDescriptor, type SourceFeature } from "./types.js";

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
        const bad = (reason: string): never =>
            failOn(report, "E_SOURCE_PARAM", `parameter ${p.name}: ${reason}`, { name: p.name, reason });
        if (value === undefined || value === null) {
            if (p.required === true && p.default === undefined) {
                bad("required");
            }
            continue;
        }
        switch (p.type) {
            case "integer":
            case "number":
                if (
                    typeof value !== "number" ||
                    Number.isNaN(value) ||
                    (p.type === "integer" && !Number.isInteger(value))
                ) {
                    bad("type");
                }
                if (
                    (p.min !== undefined && (value as number) < p.min) ||
                    (p.max !== undefined && (value as number) > p.max)
                ) {
                    bad("range");
                }
                break;
            case "boolean":
                if (typeof value !== "boolean") {
                    bad("type");
                }
                break;
            case "enum":
                if (p.values !== undefined && !p.values.some((v) => v.value === value)) {
                    bad("enum");
                }
                break;
            case "url": {
                let url: URL | null = null;
                try {
                    url = new URL(typeof value === "string" ? value : "");
                } catch {
                    bad("type");
                }
                if (url !== null && (url.username !== "" || url.password !== "")) {
                    bad("credentials-in-url");
                }
                break;
            }
            default:
                break;
        }
    }
}
