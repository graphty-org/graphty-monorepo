import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

const packageRoot = path.resolve(import.meta.dirname, "../..");

interface Source {
    url: string;
    sha256: string;
    file: string;
    redistribute: boolean;
}
interface HostedSources {
    SOURCES: Record<string, Source>;
    sourceRelease: (source: Source) => string;
    sourceReleaseUrl: (source: Source) => string;
    publishedCopy: (url: string, sha256: string | undefined, fetchImpl: typeof fetch) => Promise<Buffer | null>;
    sourceUrls: (source: Source, options?: { fromOriginalHost?: boolean }) => string[];
    fetchSource: (
        source: Source,
        cacheDir: string,
        options?: { fromOriginalHost?: boolean; fetchImpl?: typeof fetch },
    ) => Promise<string>;
}

/** scripts/hosted-sources.mjs, which build-hosted.mjs and refresh-sources.mjs use. */
async function hostedSources(): Promise<HostedSources> {
    return (await import(pathToFileURL(path.join(packageRoot, "scripts/hosted-sources.mjs")).href)) as HostedSources;
}

const bytes = Buffer.from("published snapshot bytes");
const sha256 = createHash("sha256").update(bytes).digest("hex");
const url = "https://graphty.app/data/graph-samples/v1/road-ny.gsnp.gz";
const serving =
    (response: () => Promise<Response>): typeof fetch =>
    () =>
        response();
const source: Source = { url: "http://third-party.example/a.gz", sha256, file: "a.gz", redistribute: true };

// The deploy takes a large dataset from graphty.app instead of building it from third-party hosts
// (#3302), but only bytes whose checksum the repository records.
describe("publishedCopy", () => {
    it("returns the published bytes when their sha256 is the recorded one", async () => {
        const { publishedCopy } = await hostedSources();
        const copy = await publishedCopy(
            url,
            sha256,
            serving(() => Promise.resolve(new Response(bytes))),
        );
        expect(copy?.equals(bytes)).toBe(true);
    });

    it("refuses bytes with another sha256", async () => {
        const { publishedCopy } = await hostedSources();
        const other = serving(() => Promise.resolve(new Response("changed bytes")));
        expect(await publishedCopy(url, sha256, other)).toBeNull();
    });

    it("returns null for a missing file, an unreachable host, or no recorded checksum", async () => {
        const { publishedCopy } = await hostedSources();
        const missing = serving(() => Promise.resolve(new Response("", { status: 404 })));
        expect(await publishedCopy(url, sha256, missing)).toBeNull();
        expect(
            await publishedCopy(
                url,
                sha256,
                serving(() => Promise.reject(new TypeError("fetch failed"))),
            ),
        ).toBeNull();
        let fetched = false;
        const any = serving(() => {
            fetched = true;
            return Promise.resolve(new Response(bytes));
        });
        expect(await publishedCopy(url, undefined, any)).toBeNull();
        expect(fetched).toBe(false);
    });

    it("is what the deploy uses", () => {
        const workflow = readFileSync(path.join(packageRoot, "../.github/workflows/deploy-pages.yml"), "utf8");
        expect(workflow).toContain("node graph-samples/scripts/build-hosted.mjs --reuse-published");
    });
});

// A rebuild reads its sources from this repository's release, and an original host only when the release
// has no good copy (#3362: the release did not exist, so a changed dataset could not be deployed).
describe("sources", () => {
    let cache: string | undefined;
    afterEach(() => {
        if (cache !== undefined) {
            rmSync(cache, { recursive: true, force: true });
        }
    });

    it("come from the release first, then the original host", async () => {
        const { sourceUrls, sourceRelease, sourceReleaseUrl } = await hostedSources();
        // one immutable release per source copy, named by its checksum
        expect(sourceRelease(source)).toBe(`graph-samples-source-${sha256.slice(0, 16)}`);
        expect(sourceReleaseUrl(source)).toBe(
            `https://github.com/graphty-org/graphty-monorepo/releases/download/graph-samples-source-${sha256.slice(0, 16)}/a.gz`,
        );
        expect(sourceUrls(source)).toEqual([sourceReleaseUrl(source), source.url]);
        expect(sourceUrls(source, { fromOriginalHost: true })).toEqual([source.url]);
        expect(sourceUrls({ ...source, redistribute: false })).toEqual([source.url]);
    });

    it("fall through to the original host when the release has no good copy", async () => {
        const { fetchSource, sourceReleaseUrl } = await hostedSources();
        const releaseA = sourceReleaseUrl(source);
        const releaseC = sourceReleaseUrl({ ...source, file: "c.gz" });
        cache = mkdtempSync(path.join(tmpdir(), "hosted-sources-"));
        const answers: Record<string, () => Promise<Response>> = {
            [releaseA]: () => Promise.resolve(new Response("Not Found", { status: 404 })),
            [releaseC]: () => Promise.resolve(new Response("an older copy")),
            [source.url]: () => Promise.resolve(new Response(bytes)),
        };
        const asked: string[] = [];
        const host: typeof fetch = (input) => {
            asked.push(input as string);
            return answers[input as string]();
        };
        expect(readFileSync(await fetchSource(source, cache, { fetchImpl: host })).equals(bytes)).toBe(true);
        expect(
            readFileSync(await fetchSource({ ...source, file: "c.gz" }, cache, { fetchImpl: host })).equals(bytes),
        ).toBe(true);
        expect(asked).toEqual([releaseA, source.url, releaseC, source.url]);
    });

    it("fail naming what to do when no copy can be fetched", async () => {
        const { fetchSource } = await hostedSources();
        cache = mkdtempSync(path.join(tmpdir(), "hosted-sources-"));
        const down = serving(() => Promise.reject(new TypeError("fetch failed")));
        await expect(fetchSource(source, cache, { fetchImpl: down })).rejects.toThrow(
            /dispatch graph-samples-sources\.yml/,
        );
        await expect(fetchSource({ ...source, redistribute: false }, cache, { fetchImpl: down })).rejects.toThrow(
            /not redistributable.*original host answers again/,
        );
    });

    it("keep only those whose terms allow it in the release", async () => {
        const { SOURCES } = await hostedSources();
        const kept = Object.entries(SOURCES)
            .filter(([, entry]) => entry.redistribute)
            .map(([key]) => key);
        // com-dblp: graph-samples/NOTICE says SNAP states no license for its files
        expect(kept).toEqual(["roadNyArcs", "roadNyCoordinates", "arxiv", "goBasic", "doid", "bioplex"]);
    });

    it("are verified against their recorded sha256", async () => {
        const { fetchSource, sourceReleaseUrl } = await hostedSources();
        cache = mkdtempSync(path.join(tmpdir(), "hosted-sources-"));
        const asked: string[] = [];
        const good: typeof fetch = (input) => {
            asked.push(input as string);
            return Promise.resolve(new Response(bytes));
        };
        const file = await fetchSource(source, cache, { fetchImpl: good });
        expect(readFileSync(file).equals(bytes)).toBe(true);
        expect(asked).toEqual([sourceReleaseUrl(source)]);
        // a cached file with the recorded sha256 is not fetched again
        await fetchSource(source, cache, { fetchImpl: good });
        expect(asked).toHaveLength(1);
        const bad = serving(() => Promise.resolve(new Response("other bytes")));
        await expect(fetchSource({ ...source, file: "b.gz" }, cache, { fetchImpl: bad })).rejects.toThrow(
            /source changed/,
        );
    });
});
