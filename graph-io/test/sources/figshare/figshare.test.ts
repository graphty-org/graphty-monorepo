/**
 * The Figshare source over hand-written answers in the shapes api.figshare.com gives (no network):
 * an item's file list, a file's download, and a 404.
 */

import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { ImportError, listFromSource, loadFromSource, type Recording, replayFetch } from "../../../src/index.js";
import { figshareSource, parseFigshareUrl } from "../../../src/sources/figshare/index.js";
import { runSourceConformance } from "../harness.js";
import { rejection } from "../helpers.js";

const API = "https://api.figshare.com/v2";
const ARTICLE = "1234567";
const SAMPLES = new URL("../../../docs/samples/", import.meta.url);
const GRAPHML = readFileSync(new URL("got-network.graphml", SAMPLES), "utf8");

const FILES: Recording = {
    url: `${API}/articles/${ARTICLE}/files?page_size=1000`,
    body: [
        { id: 11, name: "README.txt", size: 10, download_url: "https://ndownloader.figshare.com/files/11" },
        { id: 12, name: "got.graphml", size: 100, download_url: "https://ndownloader.figshare.com/files/12" },
        { id: 13, name: "got.json", size: 100, download_url: "https://ndownloader.figshare.com/files/13" },
        { id: 14, name: "edges.csv", size: 100, download_url: "https://ndownloader.figshare.com/files/14" },
    ],
};
const DOWNLOAD: Recording = {
    url: "https://ndownloader.figshare.com/files/12",
    headers: { "content-type": "application/octet-stream" },
    body: GRAPHML,
};
const MISSING: Recording = {
    url: `${API}/articles/999/files?page_size=1000`,
    status: 404,
    body: { message: "Entity not found: ArticleVersion", code: "EntityNotFound" },
};

runSourceConformance(figshareSource, [
    {
        name: "a GraphML file",
        params: { article: ARTICLE, file: "got.graphml" },
        recordings: [FILES, DOWNLOAD],
    },
    { name: "a missing item", params: { article: "999", file: "got.graphml" }, recordings: [MISSING] },
]);

describe("figshare: loading", () => {
    it("finds a file by its name and loads it through format detection", async () => {
        const fetch = replayFetch([FILES, DOWNLOAD]);
        const { snapshot, format, report } = await loadFromSource(
            figshareSource,
            { article: ARTICLE, file: "got.graphml" },
            { fetch },
        );
        expect(format).toBe("graphml");
        expect(snapshot.nodeCount).toBeGreaterThan(0);
        expect(report.source).toMatchObject({ id: "figshare", endpoint: `${API}/`, requests: 2 });
    });

    it("refuses an item that is not a number and an empty file name, before any request", async () => {
        for (const [params, name] of [
            [{ article: "../account", file: "a.graphml" }, "article"],
            [{ article: ARTICLE, file: "" }, "file"],
        ] as const) {
            const fetch = replayFetch([]);
            const err = await rejection(loadFromSource(figshareSource, params, { fetch }));
            expect(err.issue?.params).toEqual({ name, reason: "format" });
            expect(fetch.calls).toHaveLength(0);
        }
    });

    it("a missing item or file is E_SOURCE_NOT_FOUND", async () => {
        const noItem = await rejection(
            loadFromSource(figshareSource, { article: "999", file: "x.gml" }, { fetch: replayFetch([MISSING]) }),
        );
        expect(noItem.issue?.code).toBe("E_SOURCE_NOT_FOUND");
        const noFile = await rejection(
            loadFromSource(figshareSource, { article: ARTICLE, file: "x.gml" }, { fetch: replayFetch([FILES]) }),
        );
        expect(noFile.issue?.params).toMatchObject({ what: "file", value: `${ARTICLE}/x.gml` });
    });
});

describe("figshare: list", () => {
    it("lists an item's files in pages, and an item's params load the file", async () => {
        const fetch = replayFetch([FILES, FILES, FILES, DOWNLOAD]);
        const first = await listFromSource(figshareSource, { params: { article: ARTICLE }, size: 3 }, { fetch });
        expect(first.items.map((item) => item.name)).toEqual(["README.txt", "got.graphml", "got.json"]);
        expect([first.total, first.next]).toEqual([4, { start: 3 }]);
        const second = await listFromSource(
            figshareSource,
            { params: { article: ARTICLE }, size: 3, cursor: first.next ?? undefined },
            { fetch },
        );
        expect(second.items).toEqual([{ params: { article: ARTICLE, file: "edges.csv" }, name: "edges.csv" }]);
        expect(second.next).toBeNull();
        const { format } = await loadFromSource(figshareSource, first.items[1].params as never, { fetch });
        expect(format).toBe("graphml");
    });

    it("narrows to a search text", async () => {
        const fetch = replayFetch([FILES]);
        const listing = await listFromSource(
            figshareSource,
            { params: { article: ARTICLE }, search: "GOT" },
            { fetch },
        );
        expect(listing.items.map((item) => item.name)).toEqual(["got.graphml", "got.json"]);
    });

    it("an answer that is not a file list is E_SOURCE_RESPONSE", async () => {
        const fetch = replayFetch([{ ...FILES, body: { files: [] } }]);
        const err = await rejection(listFromSource(figshareSource, { params: { article: ARTICLE } }, { fetch }));
        expect(err.issue?.code).toBe("E_SOURCE_RESPONSE");
    });
});

/**
 * The params of the error parseFigshareUrl throws for a link.
 * @param url - the link
 * @returns the issue's params
 */
function refusal(url: string): unknown {
    try {
        parseFigshareUrl(url);
    } catch (err) {
        expect(err).toBeInstanceOf(ImportError);
        return (err as ImportError).issue?.params;
    }
    return null;
}

describe("parseFigshareUrl", () => {
    it("reads item pages, API links and DOIs", () => {
        expect(parseFigshareUrl("https://figshare.com/articles/dataset/Got_network/1234567")).toEqual({
            article: ARTICLE,
        });
        expect(parseFigshareUrl("https://figshare.com/articles/dataset/Got_network/1234567/2")).toEqual({
            article: ARTICLE,
        });
        expect(parseFigshareUrl("https://rmit.figshare.com/articles/dataset/x/1234567")).toEqual({
            article: ARTICLE,
        });
        expect(parseFigshareUrl("https://api.figshare.com/v2/articles/1234567")).toEqual({ article: ARTICLE });
        expect(parseFigshareUrl("https://doi.org/10.6084/m9.figshare.1234567.v3")).toEqual({ article: ARTICLE });
        expect(parseFigshareUrl("https://doi.org/10.6084/m9.figshare.1234567")).toEqual({ article: ARTICLE });
    });

    it("refuses other links, and credentials in the link", () => {
        for (const url of [
            "not a url",
            "http://figshare.com/articles/dataset/x/1234567",
            "https://example.org/articles/dataset/x/1234567",
            "https://figshare.com/articles/dataset/x/abc",
            "https://figshare.com/authors/x/1",
            "https://doi.org/10.5281/zenodo.1",
        ]) {
            expect(refusal(url)).toEqual({ name: "url", reason: "format" });
        }
        expect(refusal("https://u:p@figshare.com/articles/dataset/x/1")).toEqual({
            name: "url",
            reason: "credentials-in-url",
        });
    });
});
