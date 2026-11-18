/**
 * `@graphty/graph-io/sources/s3`: the Amazon S3 source, a `file-host` source (design section 2.2).
 * Experimental.
 *
 * - load: one object, read from the bucket's own address and handed to graph-io's format detection
 *   (by its key's file name and its first bytes).
 * - list: the bucket's objects (S3's ListObjectsV2), under a folder, narrowed by a search text, paged
 *   by S3's continuation token.
 *
 * Requests are unsigned unless the load carries `credentials.awsSigV4({ service: "s3", ... })`
 * bound to the bucket's address (`s3BucketUrl`); an unsigned request to a bucket that is not public
 * answers 403, E_SOURCE_FORBIDDEN. A browser also needs the bucket's CORS configuration to allow
 * the page's origin, else E_SOURCE_BLOCKED.
 * @module @graphty/graph-io/sources/s3
 */

import { decodeEntities } from "../../common/xml.js";
import { defineSource } from "../define.js";
import { failOn } from "../fail.js";
import { S3_SOURCE_ID } from "../ids.js";
import { readLink, refuseLink } from "../link.js";
import { type GraphSource, type SourceContext, type SourceListing, type SourceListQuery } from "../types.js";
import { S3_DESCRIPTOR, type S3Params } from "./descriptor.js";

export { S3_DESCRIPTOR, type S3Params } from "./descriptor.js";

/** A bucket name: 3 to 63 lowercase letters, digits, dashes and dots, a letter or digit at each end. */
const BUCKET = /^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/;

/**
 * Whether a name is an S3 bucket name (no two dots in a row, not an IP address).
 * @param name - the name
 * @returns true for a bucket name
 */
function isBucket(name: string): boolean {
    return BUCKET.test(name) && !name.includes("..") && !/^\d+\.\d+\.\d+\.\d+$/.test(name);
}

/** An AWS Region code ("us-east-2", "eu-north-1", "us-gov-west-1"). */
const REGION = /^[a-z]{2}(-[a-z]+)+-\d+$/;

/** Objects a listing asks S3 for when the caller gives no size; S3's own cap is 1,000. */
const DEFAULT_PAGE = 100;

/**
 * The bucket's address, from its name and Region.
 * @param params - the params (bucket, region)
 * @param ctx - the context
 * @returns the address, as `s3BucketUrl` gives it
 */
function bucketUrl(params: Partial<S3Params>, ctx: SourceContext): string {
    const bucket = typeof params.bucket === "string" ? params.bucket : "";
    if (!isBucket(bucket)) {
        failOn(ctx.report, "E_SOURCE_PARAM", "the bucket is not an S3 bucket name", {
            name: "bucket",
            reason: "format",
        });
    }
    const region = params.region ?? "";
    if (region !== "" && !REGION.test(region)) {
        failOn(ctx.report, "E_SOURCE_PARAM", "the region is not an AWS Region", { name: "region", reason: "format" });
    }
    return s3BucketUrl({ bucket, region });
}

/**
 * The address a bucket's objects are read from: `https://<bucket>.s3.<region>.amazonaws.com/`
 * (without the Region, `https://<bucket>.s3.amazonaws.com/`), or for a bucket whose name holds a dot,
 * whose TLS certificate would not match that host, `https://s3.<region>.amazonaws.com/<bucket>/`.
 * Bind a signing credential to its origin to read a private bucket. Experimental.
 * @param bucket - the bucket's name and, optionally, its Region
 * @param bucket.bucket - the bucket's name
 * @param bucket.region - the bucket's AWS Region
 * @returns the address, ending in `/`
 * @example
 * ```ts
 * const params = { bucket: "my-graphs", key: "data/network.graphml", region: "us-east-2" };
 * const credential = credentials.awsSigV4(
 *     { region: "us-east-2", service: "s3", credentials: { accessKeyId, secretAccessKey, sessionToken } },
 *     { origins: [s3BucketUrl(params)] },
 * );
 * const { snapshot } = await loadFromSource(s3Source, params, { credential });
 * ```
 * @category Network sources
 */
export function s3BucketUrl({
    bucket,
    region,
}: {
    readonly bucket: string;
    readonly region?: string | undefined;
}): string {
    const host = region === undefined || region === "" ? "s3.amazonaws.com" : `s3.${region}.amazonaws.com`;
    return bucket.includes(".") ? `https://${host}/${bucket}/` : `https://${bucket}.${host}/`;
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
    const { protocol, host, path } = readLink(url, "S3", S3_SOURCE_ID);
    const m = /^(?:([a-z0-9.-]+)\.)?s3(?:[.-]([a-z0-9-]+))?\.amazonaws\.com$/.exec(host);
    let bucket = host;
    let key = path;
    let region: string | undefined;
    if (protocol !== "s3:") {
        if (protocol !== "https:" || m === null) {
            return refuseLink("S3", S3_SOURCE_ID, "format");
        }
        region = m.at(2);
        // a path-style link holds the bucket as its first path part
        [bucket, key] = m.at(1) === undefined ? splitFirst(path) : [m[1], path];
    }
    return isBucket(bucket) && (region === undefined || REGION.test(region))
        ? { bucket, region, key: key === "" ? undefined : key }
        : refuseLink("S3", S3_SOURCE_ID, "format");
}

/**
 * Split a path at its first slash.
 * @param path - the path
 * @returns what comes before the slash and what after (empty without one)
 */
function splitFirst(path: string): [string, string] {
    const slash = path.indexOf("/");
    return slash < 0 ? [path, ""] : [path.slice(0, slash), path.slice(slash + 1)];
}
