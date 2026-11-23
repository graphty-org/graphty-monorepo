/**
 * The S3 source over hand-written answers in the shapes Amazon S3 gives (no network): an object,
 * ListObjectsV2 pages, and its 403 and 404 refusals.
 */

import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
    credentials,
    ImportError,
    listFromSource,
    loadFromSource,
    type Recording,
    replayFetch,
} from "../../../src/index.js";
import { parseS3Url, s3BucketUrl, s3Source } from "../../../src/sources/s3/index.js";
import { runSourceConformance } from "../harness.js";
import { rejection } from "../helpers.js";

const BUCKET = "graphty-samples";
const HOST = `https://${BUCKET}.s3.us-east-2.amazonaws.com`;
const SAMPLES = new URL("../../../docs/samples/", import.meta.url);
const GRAPHML = readFileSync(new URL("got-network.graphml", SAMPLES), "utf8");

/**
 * A ListObjectsV2 answer.
 * @param keys - the keys on the page
 * @param next - the continuation token, when more follow
 * @returns the XML
 */
function listing(keys: readonly string[], next?: string): string {
    const contents = keys.map((k) => `<Contents><Key>${k}</Key><Size>100</Size></Contents>`).join("");
    const more =
        next === undefined
            ? "<IsTruncated>false</IsTruncated>"
            : `<IsTruncated>true</IsTruncated><NextContinuationToken>${next}</NextContinuationToken>`;
    return `<?xml version="1.0" encoding="UTF-8"?>\n<ListBucketResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/"><Name>${BUCKET}</Name>${more}${contents}</ListBucketResult>`;
}

const OBJECT: Recording = {
    url: `${HOST}/data/got.graphml`,
    headers: { "content-type": "application/octet-stream" },
    body: GRAPHML,
};
const PARAMS = { bucket: BUCKET, key: "data/got.graphml", region: "us-east-2" };

// the source takes no credential and has no endpoint, so the sentinel is bound to the bucket's origin
runSourceConformance(s3Source, [
    {
        name: "a GraphML object",
        params: PARAMS,
        recordings: [OBJECT],
        credential: (secret) => credentials.bearer(secret, { origins: [HOST] }),
    },
]);

describe("s3: loading", () => {
    it("loads an object through format detection, by its key's name and first bytes", async () => {
        const { snapshot, format, report } = await loadFromSource(s3Source, PARAMS, { fetch: replayFetch([OBJECT]) });
        expect(format).toBe("graphml");
        expect(snapshot.nodeCount).toBeGreaterThan(0);
        expect(report.source).toMatchObject({ id: "s3", requests: 1 });
    });

    it("uses the global address without a Region and encodes each part of the key", async () => {
        const fetch = replayFetch([{ ...OBJECT, url: `https://${BUCKET}.s3.amazonaws.com/a%20b/c%23d.graphml` }]);
        const { format } = await loadFromSource(s3Source, { bucket: BUCKET, key: "a b/c#d.graphml" }, { fetch });
        expect(format).toBe("graphml");
    });

    it("reads a bucket whose name holds a dot from the path-style address", async () => {
        const fetch = replayFetch([
            { ...OBJECT, url: "https://s3.us-east-2.amazonaws.com/graphs.example.org/a.graphml" },
        ]);
        const params = { bucket: "graphs.example.org", key: "a.graphml", region: "us-east-2" };
        expect((await loadFromSource(s3Source, params, { fetch })).format).toBe("graphml");
    });

    it("signs each request of a private bucket with a credential bound to the bucket's address", async () => {
        const credential = credentials.awsSigV4(
            { region: "us-east-2", service: "s3", credentials: { accessKeyId: "AKID", secretAccessKey: "secret" } },
            { origins: [s3BucketUrl(PARAMS)] },
        );
        const fetch = replayFetch([{ ...OBJECT, credential: true }]);
        expect((await loadFromSource(s3Source, PARAMS, { fetch, credential })).format).toBe("graphml");
        expect(fetch.calls).toEqual([{ method: "GET", url: OBJECT.url, credential: true }]);
    });

    it("refuses a bad bucket, Region or key before any request", async () => {
        for (const [params, name] of [
            [{ bucket: "Bad_Bucket", key: "a.gml" }, "bucket"],
            [{ bucket: "evil.com/x", key: "a.gml" }, "bucket"],
            [{ bucket: "a..b", key: "a.gml" }, "bucket"],
            [{ bucket: "192.168.1.1", key: "a.gml" }, "bucket"],
            [{ bucket: BUCKET, key: "a.gml", region: "x/y" }, "region"],
            [{ bucket: BUCKET, key: "../a.gml" }, "key"],
        ] as const) {
            const fetch = replayFetch([]);
            const err = await rejection(loadFromSource(s3Source, params, { fetch }));
            expect(err.issue?.params).toEqual({ name, reason: "format" });
            expect(fetch.calls).toHaveLength(0);
        }
    });

    it("a bucket that is not public is E_SOURCE_FORBIDDEN, a missing key E_SOURCE_NOT_FOUND", async () => {
        const denied = replayFetch([
            { url: OBJECT.url, status: 403, body: "<Error><Code>AccessDenied</Code></Error>" },
        ]);
        expect((await rejection(loadFromSource(s3Source, PARAMS, { fetch: denied }))).issue?.code).toBe(
            "E_SOURCE_FORBIDDEN",
        );
        const missing = replayFetch([{ url: OBJECT.url, status: 404, body: "<Error><Code>NoSuchKey</Code></Error>" }]);
        expect((await rejection(loadFromSource(s3Source, PARAMS, { fetch: missing }))).issue?.code).toBe(
            "E_SOURCE_NOT_FOUND",
        );
    });
});

describe("s3: list", () => {
    it("lists a folder page by page with S3's continuation token, skipping folder markers", async () => {
        const fetch = replayFetch([
            {
                url: `${HOST}/?list-type=2&max-keys=2&prefix=data%2F`,
                body: listing(["data/", "data/got.graphml"], "tok+1"),
            },
            {
                url: `${HOST}/?list-type=2&max-keys=2&prefix=data%2F&continuation-token=tok%2B1`,
                body: listing(["data/a&amp;b.json"]),
            },
            OBJECT,
        ]);
        const params = { bucket: BUCKET, key: "data", region: "us-east-2" };
        const first = await listFromSource(s3Source, { params, size: 2 }, { fetch });
        expect(first.items).toEqual([{ params: PARAMS, name: "data/got.graphml" }]);
        expect(first.next).toEqual({ token: "tok+1" });
        const second = await listFromSource(s3Source, { params, size: 2, cursor: first.next ?? undefined }, { fetch });
        expect(second.items.map((item) => item.name)).toEqual(["data/a&b.json"]);
        expect(second.next).toBeNull();
        const { format } = await loadFromSource(s3Source, first.items[0].params as never, { fetch });
        expect(format).toBe("graphml");
    });

    it("narrows a page to a search text", async () => {
        const fetch = replayFetch([
            { url: `https://${BUCKET}.s3.amazonaws.com/?list-type=2&max-keys=100`, body: listing(["a.gml", "b.csv"]) },
        ]);
        const listing2 = await listFromSource(s3Source, { params: { bucket: BUCKET }, search: ".GML" }, { fetch });
        expect(listing2.items).toEqual([{ params: { bucket: BUCKET, key: "a.gml" }, name: "a.gml" }]);
    });

    it("an answer that is not a listing is E_SOURCE_RESPONSE", async () => {
        const fetch = replayFetch([
            { url: `https://${BUCKET}.s3.amazonaws.com/?list-type=2&max-keys=100`, body: "<html/>" },
        ]);
        const err = await rejection(listFromSource(s3Source, { params: { bucket: BUCKET } }, { fetch }));
        expect(err.issue?.code).toBe("E_SOURCE_RESPONSE");
    });
});

/**
 * The params of the error parseS3Url throws for a link.
 * @param url - the link
 * @returns the issue's params
 */
function refusal(url: string): unknown {
    try {
        parseS3Url(url);
    } catch (err) {
        expect(err).toBeInstanceOf(ImportError);
        return (err as ImportError).issue?.params;
    }
    return null;
}

describe("s3BucketUrl", () => {
    it("gives the virtual-hosted address, or the path-style one for a dotted bucket", () => {
        expect(s3BucketUrl({ bucket: BUCKET, region: "us-east-2" })).toBe(`${HOST}/`);
        expect(s3BucketUrl({ bucket: BUCKET })).toBe(`https://${BUCKET}.s3.amazonaws.com/`);
        expect(s3BucketUrl({ bucket: "a.b.c", region: "eu-west-1" })).toBe("https://s3.eu-west-1.amazonaws.com/a.b.c/");
    });
});

describe("parseS3Url", () => {
    it("reads s3://, virtual-hosted and path-style links", () => {
        expect(parseS3Url(`s3://${BUCKET}/data/got.graphml`)).toEqual({ bucket: BUCKET, key: "data/got.graphml" });
        expect(parseS3Url(`s3://${BUCKET}`)).toEqual({ bucket: BUCKET });
        expect(parseS3Url(`${HOST}/data/a%20b.gml`)).toEqual({
            bucket: BUCKET,
            region: "us-east-2",
            key: "data/a b.gml",
        });
        expect(parseS3Url(`https://${BUCKET}.s3.amazonaws.com/x.gml`)).toEqual({ bucket: BUCKET, key: "x.gml" });
        expect(parseS3Url(`https://${BUCKET}.s3-eu-west-1.amazonaws.com/x.gml`)).toEqual({
            bucket: BUCKET,
            region: "eu-west-1",
            key: "x.gml",
        });
        expect(parseS3Url("https://graphs.example.org.s3.us-east-2.amazonaws.com/x.gml")).toEqual({
            bucket: "graphs.example.org",
            region: "us-east-2",
            key: "x.gml",
        });
        expect(parseS3Url("https://s3.amazonaws.com/graphs.example.org/x.gml")).toEqual({
            bucket: "graphs.example.org",
            key: "x.gml",
        });
        expect(parseS3Url(`https://s3.us-east-2.amazonaws.com/${BUCKET}/data/`)).toEqual({
            bucket: BUCKET,
            region: "us-east-2",
            key: "data/",
        });
    });

    it("refuses other links, and credentials in the link", () => {
        for (const url of [
            "not a url",
            `http://${BUCKET}.s3.amazonaws.com/x.gml`,
            "https://example.com/x.gml",
            "https://s3.amazonaws.com/",
            "https://Bad_Bucket.s3.amazonaws.com/x",
        ]) {
            expect(refusal(url)).toEqual({ name: "url", reason: "format" });
        }
        expect(refusal(`https://u:p@${BUCKET}.s3.amazonaws.com/x`)).toEqual({
            name: "url",
            reason: "credentials-in-url",
        });
    });
});
