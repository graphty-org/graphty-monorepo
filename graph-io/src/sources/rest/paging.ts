/**
 * Paging of the REST mapping (design section 13.2): a cursor in the body, an offset, the `Link`
 * header, or a next URL in the body. A position is a string or a number, so it fits a SourceCursor;
 * a position that is a URL is checked against the mapping's origin before it is followed.
 */

import { type ImportReportBuilder } from "../../common/report.js";
import { originOf } from "../credentials.js";
import { failOn } from "../fail.js";
import { type RestPaging } from "./params.js";
import { selectOne } from "./selectors.js";
import { checkOrigin } from "./templates.js";

/** Where a paged request is: the first page (null), a cursor or offset, or a full URL. */
export type PagePosition = string | number | null;

/**
 * The position of the first page.
 * @param paging - the request's paging
 * @returns the position
 */
function firstPosition(paging: RestPaging | undefined): PagePosition {
    switch (paging?.style) {
        case "cursor":
            return paging.first;
        case "offset":
            return paging.base ?? 0;
        default:
            return null;
    }
}

/**
 * The URL of a page.
 * @param url - the request's first-page URL
 * @param paging - the request's paging
 * @param position - where to read
 * @param endpoint - the mapping's endpoint, which a full URL must stay on
 * @param report - the load's report
 * @returns the page's URL
 */
export function pageUrl(
    url: URL,
    paging: RestPaging | undefined,
    position: PagePosition,
    endpoint: URL,
    report: ImportReportBuilder,
): URL {
    if (position === null) {
        return url;
    }
    const out = new URL(url);
    switch (paging?.style) {
        case "cursor":
            out.searchParams.set(paging.param, String(position));
            return out;
        case "offset":
            out.searchParams.set(paging.param, String(position));
            out.searchParams.set(paging.size.param, String(paging.size.value));
            return out;
        default:
            // link-header and next-url positions are full URLs from a response (or a recorded cursor)
            return checkOrigin(new URL(String(position), url), endpoint, report);
    }
}

/**
 * The first page's URL with its paging parameters, so an offset request carries its size.
 * @param url - the request's URL
 * @param paging - the request's paging
 * @param endpoint - the mapping's endpoint
 * @param report - the load's report
 * @returns the URL
 */
export function firstPageUrl(
    url: URL,
    paging: RestPaging | undefined,
    endpoint: URL,
    report: ImportReportBuilder,
): URL {
    return pageUrl(url, paging, firstPosition(paging), endpoint, report);
}

/**
 * The `rel` URL of a Link header.
 * @param header - the header's value
 * @param rel - the relation
 * @returns the URL text, or null
 */
function linkOf(header: string, rel: string): string | null {
    for (const part of header.split(/,(?=\s*<)/)) {
        const m = /^\s*<([^>]*)>(.*)$/.exec(part);
        if (m === null) {
            continue;
        }
        const rels = /;\s*rel="?([^";]+)"?/i.exec(m[2]);
        if (rels?.[1].split(/\s+/).includes(rel)) {
            return m[1];
        }
    }
    return null;
}

/** What `nextPosition` reads. */
interface PageResponse {
    /** The parsed body. */
    readonly body: unknown;
    /** The response headers. */
    readonly headers: Headers;
    /** The URL the page was read from. */
    readonly url: URL;
    /** How many records the page held. */
    readonly records: number;
    /** Where the load runs: a missing Link header in a browser may be one the service hides. */
    readonly runtime: string;
}

/**
 * The next page's URL from the Link header, or null after the last one.
 * @param rel - the relation that names the next page
 * @param page - this page's response
 * @param endpoint - the mapping's endpoint
 * @param report - the load's report
 * @returns the next position
 */
function nextLink(rel: string, page: PageResponse, endpoint: URL, report: ImportReportBuilder): PagePosition {
    const header = page.headers.get("link");
    if (header === null) {
        if (page.runtime === "browser") {
            // a browser reads Link only when the service exposes it: never a silent single page
            failOn(report, "E_SOURCE_RESPONSE", "the Link header cannot be read", {
                origin: originOf(endpoint),
                expected: "link-header",
                contentType: page.headers.get("content-type"),
            });
        }
        return null;
    }
    const next = linkOf(header, rel);
    return next === null ? null : checkOrigin(new URL(next, page.url), endpoint, report).href;
}

/**
 * Where the next page is, or null after the last one.
 * @param paging - the request's paging
 * @param position - this page's position
 * @param page - this page's response
 * @param endpoint - the mapping's endpoint
 * @param report - the load's report
 * @returns the next position
 */
export function nextPosition(
    paging: RestPaging | undefined,
    position: PagePosition,
    page: PageResponse,
    endpoint: URL,
    report: ImportReportBuilder,
): PagePosition {
    switch (paging?.style) {
        case "cursor": {
            const next = selectOne(page.body, paging.next);
            return (typeof next === "string" && next !== "") || typeof next === "number" ? next : null;
        }
        case "offset": {
            if (page.records < paging.size.value || page.records === 0) {
                return null;
            }
            const step = paging.unit === "pages" ? 1 : paging.size.value;
            return Number(position) + step;
        }
        case "link-header":
            return nextLink(paging.rel ?? "next", page, endpoint, report);
        case "next-url": {
            const next = selectOne(page.body, paging.next);
            return typeof next === "string" && next !== ""
                ? checkOrigin(new URL(next, page.url), endpoint, report).href
                : null;
        }
        default:
            return null;
    }
}
