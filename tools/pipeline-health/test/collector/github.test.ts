import { createVerify, generateKeyPairSync } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
    appJwt,
    GitHub,
    HttpError,
    installationToken,
    readAppConfig,
    runJobs,
    APP_PARAMS,
} from "../../src/collector/github.js";
import type { GhJob } from "../../src/collector/parse.js";
import { fakeGitHub, NOW } from "./fake-github.js";

const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const pem = privateKey.export({ type: "pkcs1", format: "pem" }).toString();

describe("GitHub App", () => {
    it("signs an RS256 JWT GitHub accepts: issued a minute ago, expiring within 10 minutes", () => {
        const jwt = appJwt("12345", pem, NOW);
        const [h, p, s] = jwt.split(".");
        expect(JSON.parse(Buffer.from(h, "base64url").toString())).toEqual({ alg: "RS256", typ: "JWT" });
        const claims = JSON.parse(Buffer.from(p, "base64url").toString());
        expect(claims.iss).toBe("12345");
        expect(claims.iat).toBe(Math.floor(NOW / 1000) - 60);
        expect(claims.exp - Math.floor(NOW / 1000)).toBeLessThanOrEqual(600);
        expect(createVerify("RSA-SHA256").update(`${h}.${p}`).verify(publicKey, Buffer.from(s, "base64url"))).toBe(
            true,
        );
    });

    it("reads the App from SSM, and is not set up when a parameter is missing", async () => {
        const all = { [APP_PARAMS.appId]: "1", [APP_PARAMS.installationId]: "2", [APP_PARAMS.privateKey]: pem };
        expect(await readAppConfig(async () => all)).toEqual({ appId: "1", installationId: "2", privateKey: pem });
        expect(await readAppConfig(async () => ({ [APP_PARAMS.appId]: "1" }))).toBeUndefined();
        expect(await readAppConfig(async () => ({}))).toBeUndefined();
    });

    it("caches the installation token until shortly before it expires", async () => {
        const fake = fakeGitHub();
        const cfg = { appId: "9", installationId: "77", privateKey: pem };
        expect(await installationToken(cfg, fake.fetch, NOW)).toBe("ghs_test");
        expect(await installationToken(cfg, fake.fetch, NOW + 10 * 60_000)).toBe("ghs_test");
        expect(fake.tokenCalls).toBe(1);
        await installationToken(cfg, fake.fetch, NOW + 56 * 60_000);
        expect(fake.tokenCalls).toBe(2);
    });

    it("keeps the rate limit of the newest response and answers 404 as undefined", async () => {
        const gh = new GitHub(async () => "t", fakeGitHub().fetch);
        expect(await gh.rest("repos/graphty-org/graphty-monorepo/nothing")).toBeUndefined();
        expect(gh.rate).toEqual({ remaining: 4000, limit: 5000 });
        expect(gh.calls).toBe(1);
    });

    it("retries a 5xx and a short rate limit, and gives up at once on a rate limit that resets later", async () => {
        const answers = [502, 429, 200, 403];
        const seen: number[] = [];
        const gh = new GitHub(
            async () => "ghs_test",
            async () => {
                const status = answers.shift() ?? 500;
                seen.push(status);
                const later = String(Math.floor(Date.now() / 1000) + 3600);
                const headers: Record<string, string> =
                    status === 429
                        ? { "retry-after": "0" }
                        : status === 403
                          ? { "x-ratelimit-remaining": "0", "x-ratelimit-reset": later }
                          : {};
                return new Response(status === 200 ? "{}" : "", { status, headers });
            },
        );
        expect(await gh.rest("repos/o/r")).toEqual({});
        expect(seen).toEqual([502, 429, 200]);
        await expect(gh.rest("repos/o/r")).rejects.toThrow("HTTP 403");
        expect(seen).toEqual([502, 429, 200, 403]);
    });
});

describe("runJobs", () => {
    // Modelled on release.yml run 40476709992 (2026-10-27, 223 jobs over two attempts): GitHub answered 502 every
    // time to a page of 25 or more jobs holding one particular job and served pages of 10, so the LLM regression job
    // on a later page was never read and its paid step was lost from the Costs page.
    function bigRun(failFrom = 25) {
        const jobs = Array.from({ length: 223 }, (_, i) => ({
            id: 122132600000 + i,
            run_id: 40476709992,
            run_attempt: i < 108 ? 1 : 2,
            name: i === 222 ? "LLM regression" : `CI / Test (shard-${i})`,
        })) as unknown as GhJob[];
        const sizes: number[] = [];
        const fetch = async (url: string) => {
            const u = new URL(url);
            const size = Number(u.searchParams.get("per_page"));
            const page = Number(u.searchParams.get("page"));
            sizes.push(size);
            const slice = jobs.slice((page - 1) * size, page * size);
            if (size >= failFrom && slice.some((j) => j.id === jobs[30].id)) return new Response("", { status: 502 });
            return new Response(JSON.stringify({ total_count: jobs.length, jobs: slice }));
        };
        return { jobs, sizes, gh: new GitHub(async () => "t", fetch) };
    }
    const path = "repos/graphty-org/graphty-monorepo/actions/runs/40476709992/jobs?filter=all";

    it("reads a page GitHub keeps answering 502 as smaller pages over the same jobs, losing none", async () => {
        const b = bigRun();
        const got = await runJobs((p) => b.gh.rest(p), path);
        expect(got.map((j) => j.id)).toEqual(b.jobs.map((j) => j.id));
        expect(got.at(-1)?.name).toBe("LLM regression");
        expect(new Set(b.sizes)).toEqual(new Set([100, 50, 10]));
    });

    it("fails when a page cannot be read at any size, so the caller keeps the run to read again", async () => {
        const b = bigRun(1);
        await expect(runJobs((p) => b.gh.rest(p), path)).rejects.toBeInstanceOf(HttpError);
    });
});
