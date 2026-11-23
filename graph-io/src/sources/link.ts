/**
 * Reading a link a reader pastes, for a file-host source's `parse...Url`.
 */

import { failAlone } from "./fail.js";

/** A pasted link, checked and split. */
export interface LinkParts {
    /** The scheme, with its colon ("https:"). */
    readonly protocol: string;
    /** The host, lowercase. */
    readonly host: string;
    /** The path's parts, decoded, with no empty part. */
    readonly parts: readonly string[];
    /** The whole path, decoded, without its leading slash. */
    readonly path: string;
}

/**
 * Refuse a link.
 * @param host - what the link should have been ("S3"), for the message
 * @param sourceId - the source's id, for the report
 * @param reason - why
 * @returns never
 */
export function refuseLink(host: string, sourceId: string, reason: "format" | "credentials-in-url"): never {
    return failAlone("E_SOURCE_PARAM", `not a ${host} link`, { name: "url", reason }, `source:${sourceId}`);
}

/**
 * Parse a link, refusing one that is not a URL, carries a user name or password, or has a bad escape.
 * @param url - the link
 * @param host - what the link should be ("S3"), for the message
 * @param sourceId - the source's id, for the report
 * @returns its scheme, host and path parts
 */
export function readLink(url: string | URL, host: string, sourceId: string): LinkParts {
    let parsed: URL;
    let path: string;
    try {
        parsed = new URL(url);
        path = decodeURIComponent(parsed.pathname.slice(1));
    } catch {
        return refuseLink(host, sourceId, "format");
    }
    if (parsed.username !== "" || parsed.password !== "") {
        refuseLink(host, sourceId, "credentials-in-url");
    }
    const parts = path.split("/").filter((part) => part !== "");
    return { protocol: parsed.protocol, host: parsed.host.toLowerCase(), parts, path };
}
