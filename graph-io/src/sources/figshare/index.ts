/**
 * `@graphty/graph-io/sources/figshare`: the Figshare source, a `file-host` source (design section
 * 2.2), for public items. Experimental.
 *
 * - load: one file of a Figshare item, found by its name through Figshare's API and downloaded from
 *   the address the API gives, then handed to graph-io's format detection (by its file name and its
 *   first bytes).
 * - list: the files of an item, narrowed by a search text, paged by the caller's `size`.
 *
 * Figshare's download address redirects to storage that sends no CORS headers, so a browser can
 * list an item but not load its files (E_SOURCE_BLOCKED); Node loads them.
 * @module @graphty/graph-io/sources/figshare
 */

import { endpointOrigin } from "../credentials.js";
import { defineSource } from "../define.js";
import { failOn } from "../fail.js";
import { FIGSHARE_SOURCE_ID } from "../ids.js";
import { readLink, refuseLink } from "../link.js";
import { type GraphSource, type SourceContext, type SourceListing, type SourceListQuery } from "../types.js";
import { FIGSHARE_DESCRIPTOR, type FigshareParams } from "./descriptor.js";

export { FIGSHARE_DESCRIPTOR, type FigshareParams } from "./descriptor.js";

/** An item number: Figshare's ids are digits. */
const ARTICLE = /^\d+$/;

/** Files a listing returns when the caller gives no size. */
const DEFAULT_PAGE = 100;

/**
 * Check the article parameter.
 * @param value - the value
 * @param ctx - the context
 * @returns the item number
 */
function checkedArticle(value: unknown, ctx: SourceContext): string {
    const article = typeof value === "string" ? value.trim() : "";
    if (!ARTICLE.test(article)) {
        failOn(ctx.report, "E_SOURCE_PARAM", "the article is not a Figshare item number", {
            name: "article",
            reason: "format",
        });
    }
    return article;
}

/**
 * An item's files: each one's name and download address.
 * @param article - the checked item number
 * @param ctx - the context
 * @returns the files, in Figshare's order
 */
async function articleFiles(article: string, ctx: SourceContext): Promise<{ name: string; url: string }[]> {
    // ponytail: one page of 1,000 files, Figshare's largest; an item with more lists only those
    const body = await ctx.fetchJson(`articles/${article}/files?page_size=1000`, {
        headers: { Accept: "application/json" },
    });
    if (!Array.isArray(body)) {
        failOn(ctx.report, "E_SOURCE_RESPONSE", "the Figshare answer is not a file list", {
            origin: endpointOrigin(ctx.endpoint),
            expected: "figshare-files",
            contentType: "application/json",
        });
    }
    return (body as readonly { name?: unknown; download_url?: unknown }[]).flatMap((file) =>
        typeof file.name === "string" &&
        typeof file.download_url === "string" &&
        file.download_url.startsWith("https://")
            ? [{ name: file.name, url: file.download_url }]
            : [],
    );
}

/**
 * The Figshare source. Experimental.
 * @category Network sources
 */
export const figshareSource: GraphSource<FigshareParams> = defineSource<FigshareParams>({
    id: FIGSHARE_SOURCE_ID,
    descriptor: FIGSHARE_DESCRIPTOR,
    async file(params, ctx) {
        const article = checkedArticle(params.article, ctx);
        const name = typeof params.file === "string" ? params.file : "";
        if (name === "") {
            failOn(ctx.report, "E_SOURCE_PARAM", "the file is not a file name", { name: "file", reason: "format" });
        }
        const file = (await articleFiles(article, ctx)).find((each) => each.name === name);
        if (file === undefined) {
            return failOn(ctx.report, "E_SOURCE_NOT_FOUND", "the Figshare item has no such file", {
                origin: endpointOrigin(ctx.endpoint),
                what: "file",
                value: `${article}/${name}`,
            });
        }
        // no format: graph-io detects it from the file name and the first bytes
        return { body: await ctx.fetch(file.url), filename: name };
    },
    async list(query: SourceListQuery<FigshareParams>, ctx): Promise<SourceListing> {
        const article = checkedArticle(query.params.article, ctx);
        const search = query.search?.toLowerCase() ?? "";
        const files = (await articleFiles(article, ctx)).flatMap((file) =>
            file.name.toLowerCase().includes(search) ? [file.name] : [],
        );
        const start = Number(query.cursor?.start ?? 0);
        const size = query.size ?? DEFAULT_PAGE;
        const items = files.slice(start, start + size).map((file) => ({ params: { article, file }, name: file }));
        const end = start + items.length;
        return { items, next: end < files.length ? { start: end } : null, total: files.length };
    },
});

/**
 * What a Figshare link names: the item. Experimental.
 * @category Network sources
 */
export interface FigshareLink {
    /** The item's number. */
    readonly article: string;
}

/**
 * Read a Figshare link: an item page (`https://figshare.com/articles/<type>/<title>/<id>`, with or
 * without a version after the id, also on an institution's `<name>.figshare.com`), an API link
 * (`https://api.figshare.com/v2/articles/<id>`) or a Figshare DOI
 * (`https://doi.org/10.6084/m9.figshare.<id>`, with or without `.v<version>`). The result is a
 * listing's params for the `figshare` source. Rejects with `E_SOURCE_PARAM` (`name: "url"`):
 * `reason: "format"` when the text is not such a link, `"credentials-in-url"` when it carries a
 * user name or password. Experimental.
 * @param url - the link
 * @returns the item it names
 * @category Network sources
 */
export function parseFigshareUrl(url: string | URL): FigshareLink {
    const { protocol, host, parts } = readLink(url, "Figshare", FIGSHARE_SOURCE_ID);
    let article: string | undefined;
    if (protocol === "https:" && host === "doi.org" && parts.length === 2 && parts[0] === "10.6084") {
        article = /^m9\.figshare\.(\d+)(?:\.v\d+)?$/i.exec(parts[1])?.[1];
    } else if (protocol === "https:" && host === "api.figshare.com") {
        article = parts.length === 3 && parts[0] === "v2" && parts[1] === "articles" ? parts[2] : undefined;
    } else if (protocol === "https:" && (host === "figshare.com" || host.endsWith(".figshare.com"))) {
        // articles/<type>/<title>/<id>[/<version>]
        article = parts[0] === "articles" && (parts.length === 4 || parts.length === 5) ? parts[3] : undefined;
    }
    return article !== undefined && ARTICLE.test(article)
        ? { article }
        : refuseLink("Figshare", FIGSHARE_SOURCE_ID, "format");
}
