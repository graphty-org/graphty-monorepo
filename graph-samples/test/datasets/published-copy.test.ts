import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { describe, expect, it } from "vitest";

const packageRoot = path.resolve(import.meta.dirname, "../..");
type PublishedCopy = (url: string, sha256: string | undefined, fetchImpl: typeof fetch) => Promise<Buffer | null>;

/** scripts/published-copy.mjs, which build-hosted.mjs runs in the deploy. */
async function publishedCopy(...args: Parameters<PublishedCopy>): ReturnType<PublishedCopy> {
    const script = pathToFileURL(path.join(packageRoot, "scripts/published-copy.mjs")).href;
    const module = (await import(script)) as { publishedCopy: PublishedCopy };
    return module.publishedCopy(...args);
}

const bytes = Buffer.from("published snapshot bytes");
const sha256 = createHash("sha256").update(bytes).digest("hex");
const url = "https://graphty.app/data/graph-samples/v1/road-ny.gsnp.gz";
const serving =
    (response: () => Promise<Response>): typeof fetch =>
    () =>
        response();

// The deploy takes a large dataset from graphty.app instead of its third-party sources (#3302), but
// only bytes whose checksum the repository records; anything else falls back to building from sources.
describe("publishedCopy", () => {
    it("returns the published bytes when their sha256 is the recorded one", async () => {
        const copy = await publishedCopy(
            url,
            sha256,
            serving(() => Promise.resolve(new Response(bytes))),
        );
        expect(copy?.equals(bytes)).toBe(true);
    });

    it("refuses bytes with another sha256", async () => {
        const other = serving(() => Promise.resolve(new Response("changed bytes")));
        expect(await publishedCopy(url, sha256, other)).toBeNull();
    });

    it("returns null for a missing file, an unreachable host, or no recorded checksum", async () => {
        expect(
            await publishedCopy(
                url,
                sha256,
                serving(() => Promise.resolve(new Response("", { status: 404 }))),
            ),
        ).toBeNull();
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
