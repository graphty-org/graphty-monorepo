/**
 * `@graphty/graph-io/sources/zenodo`: the Zenodo source, a `file-host` source (design section 2.2).
 * Experimental.
 *
 * - load: one file of a Zenodo record, read through Zenodo's records API and handed to graph-io's
 *   format detection (by its file name and its first bytes).
 * - list: the files of a record, narrowed by a search text, paged by the caller's `size`.
 *
 * A missing record or file is E_SOURCE_NOT_FOUND, a restricted one without a token
 * E_SOURCE_FORBIDDEN (or E_SOURCE_NOT_FOUND, as Zenodo answers). A token given as
 * `credentials.bearer(token)` goes only to the endpoint.
 * @module @graphty/graph-io/sources/zenodo
 */

import { endpointOrigin } from "../credentials.js";
import { defineSource } from "../define.js";
import { failOn } from "../fail.js";
import { ZENODO_SOURCE_ID } from "../ids.js";
import { readLink, refuseLink } from "../link.js";
import { type GraphSource, type SourceContext, type SourceListing, type SourceListQuery } from "../types.js";
import { ZENODO_DESCRIPTOR, type ZenodoParams } from "./descriptor.js";

export { ZENODO_DESCRIPTOR, type ZenodoParams } from "./descriptor.js";

/** A record number: Zenodo's ids are digits. */
const RECORD = /^\d+$/;

/** Files a listing returns when the caller gives no size. */
const DEFAULT_PAGE = 100;

/**
 * Check the record parameter.
 * @param value - the value
 * @param ctx - the context
 * @returns the record number
 */
function checkedRecord(value: unknown, ctx: SourceContext): string {
    const record = typeof value === "string" ? value.trim() : "";
    if (!RECORD.test(record)) {
        failOn(ctx.report, "E_SOURCE_PARAM", "the record is not a Zenodo record number", {
            name: "record",
            reason: "format",
        });
    }
    return record;
}

/**
 * The Zenodo source. Experimental.
 * @category Network sources
 */
export const zenodoSource: GraphSource<ZenodoParams> = defineSource<ZenodoParams>({
    id: ZENODO_SOURCE_ID,
    descriptor: ZENODO_DESCRIPTOR,
    async file(params, ctx) {
        const record = checkedRecord(params.record, ctx);
        const file = typeof params.file === "string" ? params.file : "";
        if (file === "" || file === "." || file === "..") {
            failOn(ctx.report, "E_SOURCE_PARAM", "the file is not a file name", { name: "file", reason: "format" });
        }
        // the whole name is one encoded segment, so a slash in it never reaches another API route
        const body = await ctx.fetch(`records/${record}/files/${encodeURIComponent(file)}/content`);
        // no format: graph-io detects it from the file name and the first bytes
        return { body, filename: file.split("/").at(-1) };
    },
    async list(query: SourceListQuery<ZenodoParams>, ctx): Promise<SourceListing> {
        const record = checkedRecord(query.params.record, ctx);
        const body = await ctx.fetchJson<{ files?: unknown }>(`records/${record}`, {
            headers: { Accept: "application/json" },
        });
        if (!Array.isArray(body.files)) {
            failOn(ctx.report, "E_SOURCE_RESPONSE", "the Zenodo record answer has no files", {
                origin: endpointOrigin(ctx.endpoint),
                expected: "zenodo-record",
                contentType: "application/json",
            });
        }
        const search = query.search?.toLowerCase() ?? "";
        const files = (body.files as readonly { key?: unknown }[]).flatMap((entry) =>
            typeof entry.key === "string" && entry.key.toLowerCase().includes(search) ? [entry.key] : [],
        );
        const start = Number(query.cursor?.start ?? 0);
        const size = query.size ?? DEFAULT_PAGE;
        const items = files.slice(start, start + size).map((file) => ({ params: { record, file }, name: file }));
        const end = start + items.length;
        return { items, next: end < files.length ? { start: end } : null, total: files.length };
    },
});

/**
 * What a Zenodo link names: the record, and the file when it names one. Experimental.
 * @category Network sources
 */
export interface ZenodoLink {
    /** The record number. */
    readonly record: string;
    /** The file's name, when the link names one. */
    readonly file?: string | undefined;
}

/**
 * Read a Zenodo link: a record page (`https://zenodo.org/records/<id>`, or the older `/record/<id>`),
 * a file link (`https://zenodo.org/records/<id>/files/<name>`, with or without `?download=1`), an
 * API file link (`https://zenodo.org/api/records/<id>/files/<name>/content`) or a Zenodo DOI
 * (`https://doi.org/10.5281/zenodo.<id>`). The result is the params of the `zenodo` source: a file
 * link loads as it is; a record link is a listing's params. Rejects with `E_SOURCE_PARAM`
 * (`name: "url"`): `reason: "format"` when the text is not such a link, `"credentials-in-url"` when
 * it carries a user name or password. Experimental.
 * @param url - the link
 * @returns the record and file it names
 * @category Network sources
 */
export function parseZenodoUrl(url: string | URL): ZenodoLink {
    const { protocol, host, parts } = readLink(url, "Zenodo", ZENODO_SOURCE_ID);
    if (protocol === "https:" && host === "doi.org") {
        const record =
            parts.length === 2 && parts[0] === "10.5281" ? /^zenodo\.(\d+)$/i.exec(parts[1])?.[1] : undefined;
        return record === undefined ? refuseLink("Zenodo", ZENODO_SOURCE_ID, "format") : { record };
    }
    // an API link: drop the leading `api` and a trailing `content`
    const api = parts[0] === "api";
    const page = api ? parts.slice(1, parts.at(-1) === "content" ? -1 : undefined) : parts;
    const [kind, record = "", files, ...file] = page;
    const recordPage =
        protocol === "https:" &&
        (host === "zenodo.org" || host === "www.zenodo.org") &&
        (kind === "records" || kind === "record") &&
        RECORD.test(record);
    if (recordPage && page.length === 2) {
        return { record };
    }
    return recordPage && files === "files" && file.length > 0
        ? { record, file: file.join("/") }
        : refuseLink("Zenodo", ZENODO_SOURCE_ID, "format");
}
