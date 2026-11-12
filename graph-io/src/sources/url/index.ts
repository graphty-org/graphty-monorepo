/**
 * The URL source: one graph file at a web address, read by graph-io's format importers. Experimental.
 *
 * The file is fetched through `ctx.fetch` (credential, redirect guard, retries, caps) and read
 * like any file source's: gunzipped or unzipped by name, its format given or detected from its
 * name, its Content-Type and its first bytes. Its CSV options and `directed` reach the importer.
 */

import { defineSource, sourceFileName } from "../define.js";
import { failOn } from "../fail.js";
import { URL_SOURCE_ID } from "../ids.js";
import { type GraphSource } from "../types.js";
import { URL_DESCRIPTOR, type UrlParams } from "./descriptor.js";

export { URL_DESCRIPTOR, type UrlParams } from "./descriptor.js";

/**
 * A column reference as the CSV importer takes it: a string of digits is a 0-based position.
 * @param value - the column typed
 * @returns the name or the position
 */
function column(value: string): string | number {
    return /^\d+$/.test(value) ? Number(value) : value;
}

/**
 * The CSV importer's options the params set; unset ones are left out so the importer detects them.
 * @param params - the params
 * @returns the options
 */
function csvOptions(params: UrlParams): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    if (params.delimiter !== undefined) {
        out.delimiter = params.delimiter;
    }
    if (params.header !== undefined) {
        out.header = params.header === "yes";
    }
    if (params.table !== undefined) {
        out.table = params.table;
    }
    for (const name of ["sourceColumn", "targetColumn", "idColumn"] as const) {
        const value = params[name];
        if (value !== undefined && value !== "") {
            out[name] = column(value);
        }
    }
    return out;
}

/**
 * The URL source. Experimental.
 * @category Network sources
 */
export const urlSource: GraphSource<UrlParams> = defineSource<UrlParams>({
    id: URL_SOURCE_ID,
    descriptor: URL_DESCRIPTOR,
    async file(params, ctx) {
        const url = new URL(params.url);
        if (url.protocol !== "http:" && url.protocol !== "https:") {
            failOn(ctx.report, "E_SOURCE_PARAM", "the URL must be http or https", { name: "url", reason: "scheme" });
        }
        const response = await ctx.fetch(url.href);
        return {
            body: response,
            format: params.format,
            filename: sourceFileName(URL_DESCRIPTOR, { ...params }),
            formatOptions: { csv: csvOptions(params) },
            ...(params.directed === undefined ? {} : { importOptions: { defaultDirected: params.directed === "yes" } }),
            // The id column a CSV node table was keyed by is saved with the load, so a reopened
            // project keys it the same way after the importer's default changes. A header name of
            // digits only would read back as a position, so it is left to the default.
            settle: ({ idColumn }) =>
                typeof idColumn === "string" && !/^\d+$/.test(idColumn) ? { ...params, idColumn } : undefined,
        };
    },
});
