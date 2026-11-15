/**
 * `@graphty/graph-io/sources/s3`: the Amazon S3 source, a `file-host` source (design section 2.2), for
 * buckets the public may read. Experimental.
 *
 * - load: one object, read from the bucket's own address and handed to graph-io's format detection
 *   (by its key's file name and its first bytes).
 * - list: the bucket's objects (S3's ListObjectsV2), under a folder, narrowed by a search text, paged
 *   by S3's continuation token.
 *
 * Requests are unsigned: a bucket that is not public answers 403, E_SOURCE_FORBIDDEN. A browser
 * also needs the bucket's CORS configuration to allow the page's origin, else E_SOURCE_BLOCKED.
 * @module @graphty/graph-io/sources/s3
 */

import { decodeEntities } from "../../common/xml.js";
import { defineSource } from "../define.js";
import { failAlone, failOn } from "../fail.js";
import { S3_SOURCE_ID } from "../ids.js";
import { type GraphSource, type SourceContext, type SourceListing, type SourceListQuery } from "../types.js";
import { S3_DESCRIPTOR, type S3Params } from "./descriptor.js";

export { S3_DESCRIPTOR, type S3Params } from "./descriptor.js";

// ponytail: no dots, so the bucket is always one label of a virtual-hosted address and its TLS
// certificate matches; a dotted (legacy) bucket needs a path-style address.
/** A bucket name S3 accepts for new buckets: 3 to 63 lowercase letters, digits and dashes. */
const BUCKET = /^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/;

/** An AWS Region code ("us-east-2", "eu-north-1", "us-gov-west-1"). */
const REGION = /^[a-z]{2}(-[a-z]+)+-\d+$/;

/** Objects a listing asks S3 for when the caller gives no size; S3's own cap is 1,000. */
const DEFAULT_PAGE = 100;

/**
 * The bucket's address, from its name and Region.
 * @param params - the params (bucket, region)
 * @param ctx - the context
 * @returns `https://<bucket>.s3[.<region>].amazonaws.com/`
 */
function bucketUrl(params: Partial<S3Params>, ctx: SourceContext): string {
    const bucket = typeof params.bucket === "string" ? params.bucket : "";
    if (!BUCKET.test(bucket)) {
        failOn(ctx.report, "E_SOURCE_PARAM", "the bucket is not an S3 bucket name", {
            name: "bucket",
            reason: "format",
        });
    }
    const region = params.region ?? "";
    if (region !== "" && !REGION.test(region)) {
        failOn(ctx.report, "E_SOURCE_PARAM", "the region is not an AWS Region", { name: "region", reason: "format" });
    }
    return `https://${bucket}.s3${region === "" ? "" : `.${region}`}.amazonaws.com/`;
}

/**
 * Check a key: S3 takes any text, but a `.` or `..` part would be resolved away by the URL.
 * @param value - the key
 * @param name - the parameter's name
 * @param ctx - the context
 * @returns the key, each part encoded
 */
function encodedKey(value: unknown, name: string, ctx: SourceContext): string {
    const parts = (typeof value === "string" ? value : "").split("/");
    if (parts.join("") === "" || parts.some((part) => part === "." || part === "..")) {
        failOn(ctx.report, "E_SOURCE_PARAM", `the ${name} is not an S3 key`, { name, reason: "format" });
    }
    return parts.map(encodeURIComponent).join("/");
}

/**
 * The text of every `<tag>` element of an S3 XML answer, decoded.
 * @param xml - the answer
 * @param tag - the element name
 * @returns the texts, in order
 */
function texts(xml: string, tag: string): string[] {
    return [...xml.matchAll(new RegExp(`<${tag}>([^<]*)</${tag}>`, "g"))].map((m) => decodeEntities(m[1], 0));
}

/**
 * The Amazon S3 source. Experimental.
 * @category Network sources
 */
export const s3Source: GraphSource<S3Params> = defineSource<S3Params>({
    id: S3_SOURCE_ID,
    descriptor: S3_DESCRIPTOR,
    async file(params, ctx) {
        const base = bucketUrl(params, ctx);
        const body = await ctx.fetch(`${base}${encodedKey(params.key, "key", ctx)}`);
        // no format: graph-io detects it from the file name and the first bytes
        return { body, filename: params.key.split("/").at(-1) };
    },
    async list(query: SourceListQuery<S3Params>, ctx): Promise<SourceListing> {
        const { params } = query;
        const url = new URL(bucketUrl(params, ctx));
        url.searchParams.set("list-type", "2");
        url.searchParams.set("max-keys", String(Math.min(query.size ?? DEFAULT_PAGE, 1000)));
        if (params.key !== undefined && params.key !== "") {
            encodedKey(params.key, "key", ctx);
            url.searchParams.set("prefix", params.key.endsWith("/") ? params.key : `${params.key}/`);
        }
        if (typeof query.cursor?.token === "string") {
            url.searchParams.set("continuation-token", query.cursor.token);
        }
        const response = await ctx.fetch(url);
        const xml = await response.text();
        let keys: string[];
        let token: string[];
        try {
            if (!xml.includes("<ListBucketResult")) {
                throw new Error("not a listing");
            }
            keys = texts(xml, "Key");
            token = texts(xml, "NextContinuationToken");
        } catch {
            return failOn(ctx.report, "E_SOURCE_RESPONSE", "the S3 answer is not a bucket listing", {
                origin: url.origin,
                expected: "s3-list",
                contentType: response.headers.get("content-type"),
            });
        }
        // ponytail: S3 cannot search, so the search narrows each page and a page may come back
        // short or empty while `next` still leads on
        const search = query.search?.toLowerCase() ?? "";
        const items = keys
            .filter((key) => !key.endsWith("/") && key.toLowerCase().includes(search))
            .map((key) => ({
                params: params.region === undefined ? { bucket: params.bucket, key } : { ...params, key },
                name: key,
            }));
        return { items, next: token.length === 0 ? null : { token: token[0] } };
    },
});

/**
 * What an S3 link names: the bucket, and the Region and key when it has them. Experimental.
 * @category Network sources
 */
export interface S3Link {
    /** The bucket's name. */
    readonly bucket: string;
    /** The Region in the link's host name, when it names one. */
    readonly region?: string | undefined;
    /** The object's key, when the link names one. */
    readonly key?: string | undefined;
}

/**
 * Read an S3 link: `s3://<bucket>/<key>`, a virtual-hosted address
 * (`https://<bucket>.s3.<region>.amazonaws.com/<key>`, also without the Region or with `s3-<region>`)
 * or a path-style one (`https://s3.<region>.amazonaws.com/<bucket>/<key>`). The result is the params
 * of the `s3` source: a link to an object loads as it is; a link to a bucket or a folder (ending in
 * `/`) is a listing's params. Rejects with `E_SOURCE_PARAM` (`name: "url"`): `reason: "format"` when
 * the text is not such a link, `"credentials-in-url"` when it carries a user name or password.
 * Experimental.
 * @param url - the link
 * @returns the bucket, Region and key it names
 * @category Network sources
 */
export function parseS3Url(url: string | URL): S3Link {
    let parsed: URL;
    try {
        parsed = new URL(url);
    } catch {
        return refuse("format");
    }
    if (parsed.username !== "" || parsed.password !== "") {
        return refuse("credentials-in-url");
    }
    let path: string;
    try {
        path = decodeURIComponent(parsed.pathname.slice(1));
    } catch {
        return refuse("format");
    }
    const host = parsed.host.toLowerCase();
    let bucket: string;
    let region: string | undefined;
    if (parsed.protocol === "s3:") {
        bucket = host;
    } else {
        const m = /^(?:([^.]+)\.)?s3(?:[.-]([a-z0-9-]+))?\.amazonaws\.com$/.exec(host);
        if (parsed.protocol !== "https:" || m === null) {
            return refuse("format");
        }
        region = m.at(2);
        const hosted = m.at(1);
        if (hosted === undefined) {
            // path-style: the bucket is the first part of the path
            const slash = path.indexOf("/");
            bucket = slash < 0 ? path : path.slice(0, slash);
            path = slash < 0 ? "" : path.slice(slash + 1);
        } else {
            bucket = hosted;
        }
    }
    return BUCKET.test(bucket) && (region === undefined || REGION.test(region))
        ? { bucket, region, key: path === "" ? undefined : path }
        : refuse("format");
}

/**
 * Reject an S3 link.
 * @param reason - why
 * @returns never
 */
function refuse(reason: "format" | "credentials-in-url"): never {
    return failAlone("E_SOURCE_PARAM", "not an S3 link", { name: "url", reason }, `source:${S3_SOURCE_ID}`);
}
