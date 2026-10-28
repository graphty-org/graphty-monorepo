/**
 * NDEx share links: a network's page or API URL, possibly carrying a link-share access key.
 */

import { credentials } from "../credentials.js";
import { failAlone } from "../fail.js";
import { NDEX_SOURCE_ID } from "../ids.js";
import { type Credential } from "../types.js";
import { ACCESS_KEY_QUERY } from "./client.js";

/** A network UUID anywhere in a URL's path or hash. */
const UUID_IN_URL = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

/**
 * What a share link says: the network, the NDEx server, and the access key as a credential.
 * Experimental.
 * @category Network sources
 */
export interface NdexShareLink {
    /** The params to load the network with. */
    readonly params: {
        /** The network's NDEx id. */
        readonly uuid: string;
    };
    /** The NDEx server the link points at ("https://www.ndexbio.org/"). */
    readonly endpoint: string;
    /** The link's access key, sent only to that server; absent when the link has none. */
    readonly credential?: Credential | undefined;
}

/**
 * Read an NDEx share link (`https://www.ndexbio.org/viewer/networks/<uuid>?accesskey=<key>`, the
 * older `#/network/<uuid>` form, or an API URL). The access key leaves the URL and becomes a
 * credential bound to the link's server, so it is never logged or stored with the params.
 * Rejects with `E_SOURCE_PARAM` (`name: "url"`): `reason: "format"` when the text is not a URL
 * naming a network, `"credentials-in-url"` when it carries a user name or password. Experimental.
 * @param url - the link
 * @returns the params, endpoint and credential to load it with
 * @example
 * ```ts
 * const link = parseShareUrl(sharedUrl);
 * const { snapshot } = await loadFromSource("ndex", link.params, {
 *     endpoint: link.endpoint,
 *     credential: link.credential,
 * });
 * ```
 * @category Network sources
 */
export function parseShareUrl(url: string | URL): NdexShareLink {
    let parsed: URL;
    try {
        parsed = new URL(url);
    } catch {
        return refuse("format");
    }
    if (parsed.username !== "" || parsed.password !== "") {
        return refuse("credentials-in-url");
    }
    // the older viewer keeps the network and its key in the hash
    const hash = new URL(parsed.hash.replace(/^#/, ""), "https://hash.invalid/");
    const uuid = UUID_IN_URL.exec(`${parsed.pathname} ${hash.pathname}`)?.[0];
    if (uuid === undefined || (parsed.protocol !== "https:" && parsed.protocol !== "http:")) {
        return refuse("format");
    }
    // the bare host redirects to www without CORS headers, so a page cannot follow it
    const host = parsed.host.toLowerCase() === "ndexbio.org" ? "www.ndexbio.org" : parsed.host;
    const endpoint = `${parsed.protocol}//${host}/`;
    const key = parsed.searchParams.get(ACCESS_KEY_QUERY) ?? hash.searchParams.get(ACCESS_KEY_QUERY);
    const params = { uuid: uuid.toLowerCase() };
    if (key === null || key === "") {
        return { params, endpoint };
    }
    const credential = credentials.apiKey({ query: ACCESS_KEY_QUERY }, key, { origins: [new URL(endpoint).origin] });
    return { params, endpoint, credential };
}

/**
 * Reject a share link.
 * @param reason - why
 * @returns never
 */
function refuse(reason: "format" | "credentials-in-url"): never {
    return failAlone("E_SOURCE_PARAM", "not an NDEx share link", { name: "url", reason }, `source:${NDEX_SOURCE_ID}`);
}
