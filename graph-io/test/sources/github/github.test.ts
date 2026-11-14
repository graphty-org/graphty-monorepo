/**
 * The GitHub source over hand-written answers in the shapes api.github.com gives (no network): a
 * repository, a recursive tree, raw file contents, and its 403 and 404 refusals.
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
import { githubSource, parseGithubUrl } from "../../../src/sources/github/index.js";
import { runSourceConformance } from "../harness.js";
import { rejection } from "../helpers.js";

const API = "https://api.github.com";
const REPO = "graphty-org/samples";
const SAMPLES = new URL("../../../docs/samples/", import.meta.url);
const GRAPHML = readFileSync(new URL("got-network.graphml", SAMPLES), "utf8");
const JSON_GRAPH = readFileSync(new URL("got.json", SAMPLES), "utf8");

/**
 * A raw file answer.
 * @param path - the path in the repository
 * @param body - the file's text
 * @param query - the query string, with its `?`
 * @returns the recording
 */
function raw(path: string, body: string, query = ""): Recording {
    return {
        url: `${API}/repos/${REPO}/contents/${path}${query}`,
        headers: { "content-type": "application/vnd.github.raw; charset=utf-8" },
        body,
    };
}

const REPOSITORY: Recording = { url: `${API}/repos/${REPO}`, body: { full_name: REPO, default_branch: "main" } };
const TREE: Recording = {
    url: `${API}/repos/${REPO}/git/trees/main?recursive=1`,
    body: {
        sha: "abc",
        truncated: false,
        tree: [
            { path: "README.md", type: "blob", size: 10 },
            { path: "data", type: "tree" },
            { path: "data/got.graphml", type: "blob", size: 100 },
            { path: "data/got.json", type: "blob", size: 100 },
            { path: "data/old", type: "tree" },
            { path: "data/old/karate.gml", type: "blob", size: 100 },
            { path: "other/data.csv", type: "blob", size: 100 },
        ],
    },
};

runSourceConformance(githubSource, [
    {
        name: "a GraphML file",
        params: { repository: REPO, path: "data/got.graphml" },
        recordings: [raw("data/got.graphml", GRAPHML)],
    },
    {
        name: "a missing file",
        params: { repository: REPO, path: "nope.graphml" },
        recordings: [
            { url: `${API}/repos/${REPO}/contents/nope.graphml`, status: 404, body: { message: "Not Found" } },
        ],
    },
]);

describe("github: loading", () => {
    it("loads a GraphML file through format detection, by its name and first bytes", async () => {
        const fetch = replayFetch([raw("data/got.graphml", GRAPHML)]);
        const { snapshot, format, report } = await loadFromSource(
            githubSource,
            { repository: REPO, path: "data/got.graphml" },
            { fetch },
        );
        expect(format).toBe("graphml");
        expect(snapshot.nodeCount).toBeGreaterThan(0);
        expect(report.source).toMatchObject({ id: "github", endpoint: `${API}/`, requests: 1 });
    });

    it("loads a JSON file at a ref, with the token sent only to the API", async () => {
        const fetch = replayFetch([{ ...raw("got.json", JSON_GRAPH, "?ref=v1.0"), credential: true }]);
        const { snapshot, format } = await loadFromSource(
            githubSource,
            { repository: REPO, path: "/got.json", ref: "v1.0" },
            { fetch, credential: credentials.bearer("ghp_example") },
        );
        expect(format).toBe("json");
        expect(snapshot.nodeCount).toBeGreaterThan(0);
        expect(fetch.calls).toEqual([
            { method: "GET", url: `${API}/repos/${REPO}/contents/got.json`, credential: true },
        ]);
    });

    it("encodes each path segment and refuses a path that would leave the repository", async () => {
        const fetch = replayFetch([raw("a%20b/c%23d.graphml", GRAPHML)]);
        const ok = await loadFromSource(githubSource, { repository: REPO, path: "a b/c#d.graphml" }, { fetch });
        expect(ok.format).toBe("graphml");
        for (const path of ["../x.graphml", "a/./b", "a//b"]) {
            const err = await rejection(
                loadFromSource(githubSource, { repository: REPO, path }, { fetch: replayFetch([]) }),
            );
            expect(err.issue?.code).toBe("E_SOURCE_PARAM");
            expect(err.issue?.params).toEqual({ name: "path", reason: "format" });
        }
        const bad = await rejection(
            loadFromSource(githubSource, { repository: "../users/x", path: "a" }, { fetch: replayFetch([]) }),
        );
        expect(bad.issue?.params).toEqual({ name: "repository", reason: "format" });
    });

    it("a file in no format graph-io reads is E_SOURCE_RESPONSE", async () => {
        const fetch = replayFetch([raw("README.md", "# hello\n\nnot a graph\n")]);
        const err = await rejection(loadFromSource(githubSource, { repository: REPO, path: "README.md" }, { fetch }));
        expect(err.issue?.code).toBe("E_SOURCE_RESPONSE");
    });
});

describe("github: errors", () => {
    it("a missing (or, without a token, private) file is E_SOURCE_NOT_FOUND", async () => {
        const fetch = replayFetch([
            { url: `${API}/repos/${REPO}/contents/x.graphml`, status: 404, body: { message: "Not Found" } },
        ]);
        const err = await rejection(loadFromSource(githubSource, { repository: REPO, path: "x.graphml" }, { fetch }));
        expect(err.issue?.code).toBe("E_SOURCE_NOT_FOUND");
        expect(err.issue?.params).toEqual({ origin: API, what: "file", value: `${REPO}/x.graphml` });
    });

    it("a missing repository in a listing is E_SOURCE_NOT_FOUND for the repository", async () => {
        const fetch = replayFetch([{ url: `${API}/repos/${REPO}`, status: 404, body: { message: "Not Found" } }]);
        const err = await rejection(listFromSource(githubSource, { params: { repository: REPO } }, { fetch }));
        expect(err.issue?.params).toEqual({ origin: API, what: "repository", value: REPO });
    });

    it("an exhausted rate limit is E_SOURCE_QUOTA with the wait until the reset", async () => {
        const reset = Math.floor(Date.now() / 1000) + 600;
        const fetch = replayFetch([
            {
                url: `${API}/repos/${REPO}/contents/x.graphml`,
                status: 403,
                headers: { "x-ratelimit-remaining": "0", "x-ratelimit-reset": String(reset) },
                body: { message: "API rate limit exceeded" },
            },
        ]);
        const err = await rejection(loadFromSource(githubSource, { repository: REPO, path: "x.graphml" }, { fetch }));
        expect(err.issue?.code).toBe("E_SOURCE_QUOTA");
        const wait = (err.issue?.params as { retryAfterMs: number }).retryAfterMs;
        expect(wait).toBeGreaterThan(500_000);
        expect(wait).toBeLessThanOrEqual(600_000);
    });

    it("a secondary rate limit's Retry-After is the wait", async () => {
        const fetch = replayFetch([
            { url: `${API}/repos/${REPO}/contents/x.graphml`, status: 403, headers: { "retry-after": "60" }, body: "" },
        ]);
        const err = await rejection(loadFromSource(githubSource, { repository: REPO, path: "x.graphml" }, { fetch }));
        expect(err.issue?.params).toEqual({ origin: API, retryAfterMs: 60_000 });
    });

    it("a private repository the token may not read is E_SOURCE_FORBIDDEN", async () => {
        const fetch = replayFetch([
            {
                url: `${API}/repos/${REPO}/contents/x.graphml`,
                status: 403,
                headers: { "x-ratelimit-remaining": "4999" },
                body: { message: "Resource not accessible by personal access token" },
            },
        ]);
        const err = await rejection(
            loadFromSource(
                githubSource,
                { repository: REPO, path: "x.graphml" },
                { fetch, credential: credentials.bearer("ghp_example") },
            ),
        );
        expect(err.issue?.code).toBe("E_SOURCE_FORBIDDEN");
        expect(err.issue?.params).toEqual({ origin: API, status: 403, serverCode: null });
    });

    it("a refused token is E_SOURCE_AUTH", async () => {
        const fetch = replayFetch([
            { url: `${API}/repos/${REPO}/contents/x.graphml`, status: 401, body: { message: "Bad credentials" } },
        ]);
        const err = await rejection(
            loadFromSource(
                githubSource,
                { repository: REPO, path: "x.graphml" },
                { fetch, credential: credentials.bearer("ghp_example") },
            ),
        );
        expect(err.issue?.code).toBe("E_SOURCE_AUTH");
    });
});

describe("github: list", () => {
    it("lists every file at the default branch, in pages of the caller's size", async () => {
        const fetch = replayFetch([REPOSITORY, TREE, REPOSITORY, TREE]);
        const first = await listFromSource(githubSource, { params: { repository: REPO }, size: 3 }, { fetch });
        expect(first.items.map((item) => item.name)).toEqual(["README.md", "data/got.graphml", "data/got.json"]);
        expect(first.items[1].params).toEqual({ repository: REPO, path: "data/got.graphml" });
        expect([first.total, first.next]).toEqual([5, { start: 3 }]);
        const second = await listFromSource(
            githubSource,
            { params: { repository: REPO }, size: 3, cursor: first.next ?? undefined },
            { fetch },
        );
        expect(second.items.map((item) => item.name)).toEqual(["data/old/karate.gml", "other/data.csv"]);
        expect(second.next).toBeNull();
    });

    it("narrows to a folder and a search text, at the caller's ref, with no repository request", async () => {
        const fetch = replayFetch([{ ...TREE, url: `${API}/repos/${REPO}/git/trees/release/v2?recursive=1` }]);
        const listing = await listFromSource(
            githubSource,
            { params: { repository: REPO, path: "data/", ref: "release/v2" }, search: "GOT" },
            { fetch },
        );
        expect(listing.items).toEqual([
            { params: { repository: REPO, path: "data/got.graphml", ref: "release/v2" }, name: "data/got.graphml" },
            { params: { repository: REPO, path: "data/got.json", ref: "release/v2" }, name: "data/got.json" },
        ]);
        expect(listing.next).toBeNull();
        expect(fetch.calls).toHaveLength(1);
    });

    it("an item's params load the file", async () => {
        const fetch = replayFetch([REPOSITORY, TREE, raw("data/got.graphml", GRAPHML)]);
        const listing = await listFromSource(
            githubSource,
            { params: { repository: REPO }, search: ".graphml" },
            { fetch },
        );
        const { format } = await loadFromSource(githubSource, listing.items[0].params as never, { fetch });
        expect(format).toBe("graphml");
    });

    it("a tree answer without a tree is E_SOURCE_RESPONSE", async () => {
        const fetch = replayFetch([REPOSITORY, { ...TREE, body: { message: "odd" } }]);
        const err = await rejection(listFromSource(githubSource, { params: { repository: REPO } }, { fetch }));
        expect(err.issue?.code).toBe("E_SOURCE_RESPONSE");
    });
});

/**
 * The params of the error parseGithubUrl throws for a link.
 * @param url - the link
 * @returns the issue's params
 */
function refusal(url: string): unknown {
    try {
        parseGithubUrl(url);
    } catch (err) {
        expect(err).toBeInstanceOf(ImportError);
        return (err as ImportError).issue?.params;
    }
    return null;
}

describe("parseGithubUrl", () => {
    it("reads repository, file, folder and raw links", () => {
        expect(parseGithubUrl("https://github.com/graphty-org/samples")).toEqual({ repository: REPO });
        expect(parseGithubUrl("https://github.com/graphty-org/samples.git")).toEqual({ repository: REPO });
        expect(parseGithubUrl("https://github.com/graphty-org/samples/blob/main/data/got.graphml")).toEqual({
            repository: REPO,
            ref: "main",
            path: "data/got.graphml",
        });
        expect(parseGithubUrl("https://github.com/graphty-org/samples/tree/main")).toEqual({
            repository: REPO,
            ref: "main",
        });
        expect(parseGithubUrl("https://raw.githubusercontent.com/graphty-org/samples/v1/a%20b.gml")).toEqual({
            repository: REPO,
            ref: "v1",
            path: "a b.gml",
        });
    });

    it("refuses other links, and credentials in the link", () => {
        for (const url of [
            "not a url",
            "http://github.com/graphty-org/samples",
            "https://gitlab.com/graphty-org/samples",
            "https://github.com/graphty-org",
            "https://github.com/graphty-org/samples/issues/1",
        ]) {
            expect(refusal(url)).toEqual({ name: "url", reason: "format" });
        }
        expect(refusal("https://user:pw@github.com/graphty-org/samples")).toEqual({
            name: "url",
            reason: "credentials-in-url",
        });
    });
});
