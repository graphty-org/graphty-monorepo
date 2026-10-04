import { describe, expect, it } from "vitest";

import { renderBoard } from "../lib/board-text.mjs";
import { createGitHub, GitHubError, holds, MAX_ETAGS } from "../lib/github.mjs";
import { createFakeGh, fixture, httpOutput } from "./helpers/fake-gh.mjs";

const REPO = "graphty-org/graphty-monorepo";
const RUNS = `repos/${REPO}/actions/workflows/ci.yml/runs?branch=master&per_page=10&exclude_pull_requests=true`;
const NOW = 1790958000_000; // before the fixtures' X-Ratelimit-Reset
/** Write options whose read-back holds for any object answer. */
const ANY = { group: "statuses", check: { path: `repos/${REPO}/commits/abc/status`, expect: {} } };

/**
 * A client over the fake gh, in dry-run at a fixed clock, with an array for a ledger.
 * @param {ReturnType<typeof createFakeGh>} gh the fake
 * @param {Partial<Parameters<typeof createGitHub>[0]>} [over] options to override
 * @returns {{gitHub: ReturnType<typeof createGitHub>, ledger: object[], advance: (ms: number) => number, at: () => number}}
 *   the client, its ledger, and the clock controls
 */
function client(gh, over = {}) {
    const ledger = [];
    let t = NOW;
    const gitHub = createGitHub({
        repo: REPO,
        exec: gh.exec,
        mode: "dry-run",
        ledger: (e) => ledger.push(e),
        env: {},
        now: () => t,
        ...over,
    });
    return { gitHub, ledger, advance: (ms) => (t += ms), at: () => t };
}

const rate = (remaining, extra = {}) => ({
    "X-Ratelimit-Limit": "5000",
    "X-Ratelimit-Remaining": String(remaining),
    "X-Ratelimit-Reset": "1790959002",
    "X-Ratelimit-Resource": "core",
    ...extra,
});

describe("login", () => {
    it("asks gh api user every time and answers its login", async () => {
        let login = "apowers313";
        const gh = createFakeGh(() => httpOutput({ status: 200, headers: rate(4000), body: { login } }));
        const { gitHub } = client(gh);
        expect(await gitHub.login()).toBe("apowers313");
        login = "someone-else";
        expect(await gitHub.login()).toBe("someone-else");
        expect(gh.calls.map((c) => c.args)).toEqual([
            ["api", "-i", "user"],
            ["api", "-i", "user"],
        ]);
        expect(gh.writes()).toEqual([]);
    });

    it("throws a credential error for an answer without a login, or a refused token", async () => {
        const empty = client(createFakeGh(() => httpOutput({ status: 200, body: {} }))).gitHub;
        await expect(empty.login()).rejects.toMatchObject({ kind: "credential" });
        const refused = client(createFakeGh(() => httpOutput({ status: 401, body: { message: "Bad credentials" } })));
        await expect(refused.gitHub.login()).rejects.toMatchObject({ kind: "credential" });
    });
});

describe("get", () => {
    it("sends the saved ETag and returns the saved body on 304", async () => {
        const gh = createFakeGh(({ args }) =>
            args.includes("-H") ? httpOutput({ status: 304, headers: rate(3964) }) : fixture("runs-200.http"),
        );
        const { gitHub } = client(gh);
        const first = await gitHub.get(RUNS);
        expect(first.changed).toBe(true);
        expect(first.body.workflow_runs[0].id).toBe(37026209323);
        const second = await gitHub.get(RUNS);
        expect(gh.calls[1].args).toContain(
            'If-None-Match: W/"527685de6c93cf30b5c697a682eee16b1034e78ed758a7bad7552e9310be9536"',
        );
        expect(second.status).toBe(304);
        expect(second.changed).toBe(false);
        expect(second.body).toEqual(first.body);
    });

    it("reads a recorded 304 fixture as unchanged", async () => {
        const gh = createFakeGh(({ args }) => fixture(args.includes("-H") ? "runs-304.http" : "runs-200.http"));
        const { gitHub } = client(gh);
        await gitHub.get(RUNS);
        expect((await gitHub.get(RUNS)).changed).toBe(false);
        expect(gitHub.rate.counters.core.remaining).toBe(3964);
    });

    it("sends no ETag from a new client", async () => {
        const gh = createFakeGh(() => fixture("runs-200.http"));
        await client(gh).gitHub.get(RUNS);
        await client(gh).gitHub.get(RUNS);
        expect(gh.calls.map((c) => c.args.includes("-H"))).toEqual([false, false]);
    });

    it("persists ETags in the record it was given, so a new client starts with 304s", async () => {
        const gh = createFakeGh(({ args }) =>
            args.includes("-H") ? httpOutput({ status: 304, headers: rate(3964) }) : fixture("runs-200.http"),
        );
        const saved = {};
        const first = await client(gh, { etags: saved }).gitHub.get(RUNS);
        const restored = JSON.parse(JSON.stringify(saved));
        const again = await client(gh, { etags: restored }).gitHub.get(RUNS);
        expect(gh.calls[1].args).toContain("-H");
        expect(again).toMatchObject({ status: 304, changed: false });
        expect(again.body).toEqual(first.body);
    });

    it(`keeps the ${MAX_ETAGS} most recently answered paths`, async () => {
        const gh = createFakeGh(({ args }) =>
            httpOutput({ status: 200, headers: { ...rate(4000), ETag: `"${args.at(-1)}"` }, body: [] }),
        );
        const { gitHub } = client(gh);
        for (let i = 0; i <= MAX_ETAGS; i++) await gitHub.get(`repos/${REPO}/issues?page=${i}`);
        await gitHub.get(`repos/${REPO}/issues?page=1`);
        const keys = Object.keys(gitHub.etags);
        expect(keys).toHaveLength(MAX_ETAGS);
        expect(keys).not.toContain(`repos/${REPO}/issues?page=0`);
        expect(keys.at(-1)).toBe(`repos/${REPO}/issues?page=1`);
    });

    it("sends no ETag when fresh", async () => {
        const gh = createFakeGh(() => fixture("runs-200.http"));
        const { gitHub } = client(gh);
        await gitHub.get(RUNS);
        await gitHub.get(RUNS, { fresh: true });
        expect(gh.calls[1].args).not.toContain("-H");
    });

    it("treats a 304 with nothing cached as an error", async () => {
        const gh = createFakeGh(() => httpOutput({ status: 304 }));
        await expect(client(gh).gitHub.get(RUNS)).rejects.toMatchObject({ kind: "http", status: 304 });
    });

    it("classifies a 404 as http without marking GitHub down", async () => {
        const gh = createFakeGh(() => httpOutput({ status: 404, headers: rate(4000), body: { message: "Not Found" } }));
        const { gitHub } = client(gh);
        await expect(gitHub.get(RUNS)).rejects.toMatchObject({ kind: "http", status: 404 });
        expect(gitHub.rate.downSince).toBeNull();
    });
});

describe("failures and downSince", () => {
    it("sets downSince on the first failure, keeps it, and clears it on success", async () => {
        let fail = true;
        const gh = createFakeGh(() =>
            fail ? { code: 1, stdout: "", stderr: "dial tcp: i/o timeout" } : fixture("runs-200.http"),
        );
        const persisted = { downSince: "2026-10-02T00:00:00.000Z" };
        const { gitHub, advance } = client(gh, { rate: persisted });
        await expect(gitHub.get(RUNS)).rejects.toMatchObject({ kind: "network" });
        expect(persisted.downSince).toBe("2026-10-02T00:00:00.000Z");
        advance(1000);
        fail = false;
        await gitHub.get(RUNS);
        expect(persisted.downSince).toBeNull();
        fail = true;
        await expect(gitHub.get(RUNS)).rejects.toMatchObject({ kind: "network" });
        expect(persisted.downSince).toBe(new Date(NOW + 1000).toISOString());
    });

    it("classifies a 5xx, a timeout and a missing login", async () => {
        const answers = [
            httpOutput({ status: 502 }),
            { code: 1, stdout: "", stderr: "", timedOut: true },
            { code: 4, stdout: "", stderr: "To get started with GitHub CLI, please run:  gh auth login" },
        ];
        const gh = createFakeGh(() => answers.shift());
        const { gitHub } = client(gh);
        await expect(gitHub.get(RUNS)).rejects.toMatchObject({ kind: "server", status: 502 });
        await expect(gitHub.get(RUNS)).rejects.toMatchObject({ kind: "timeout" });
        await expect(gitHub.get(RUNS)).rejects.toMatchObject({ kind: "credential" });
    });
});

describe("rate rules", () => {
    it("steps down the tiers at 1500, 500 and 300 remaining", async () => {
        let remaining = 1500;
        const gh = createFakeGh(() => httpOutput({ status: 200, headers: rate(remaining), body: {} }));
        const { gitHub } = client(gh);
        const levels = [];
        for (const n of [1500, 1499, 500, 499, 300, 299]) {
            remaining = n;
            await gitHub.get(RUNS, { purpose: "essential" });
            levels.push(gitHub.pace().level);
        }
        expect(levels).toEqual(["normal", "essential", "essential", "holds", "holds", "reserve"]);
        expect(gitHub.pace()).toEqual({ level: "reserve", intervalFactor: 1, until: 1790959002_000 });
    });

    it("holds back each purpose below its tier, before calling gh", async () => {
        let remaining = 4000;
        const gh = createFakeGh(() => httpOutput({ status: 201, headers: rate(remaining), body: {} }));
        const { gitHub } = client(gh, { mode: "acting" });
        const STATUS = `repos/${REPO}/statuses/abc`;
        const tries = {
            essential: () => gitHub.get(RUNS, { purpose: "essential" }),
            poll: () => gitHub.get(RUNS, { purpose: "poll" }),
            read: () => gitHub.get(RUNS),
            success: () => gitHub.write("POST", STATUS, { state: "success", context: "githerd/merge" }, ANY),
            hold: () => gitHub.write("POST", STATUS, { state: "failure", context: "githerd/merge" }, ANY),
            write: () => gitHub.write("POST", `repos/${REPO}/issues/1/comments`, { body: "x" }, ANY),
        };
        /** @type {Record<number, string[]>} */
        const allowed = {};
        for (const n of [1500, 1499, 499, 299]) {
            remaining = n;
            await gitHub.get(RUNS, { purpose: "essential" });
            allowed[n] = [];
            for (const [purpose, fn] of Object.entries(tries)) {
                const before = gh.calls.length;
                const err = await fn().then(
                    () => null,
                    (e) => e,
                );
                if (err === null) allowed[n].push(purpose);
                else {
                    expect(err).toMatchObject({ kind: "rate", retryAt: 1790959002_000 });
                    expect(gh.calls).toHaveLength(before);
                }
            }
        }
        expect(allowed).toEqual({
            1500: ["essential", "poll", "read", "success", "hold", "write"],
            1499: ["essential", "read", "success", "hold", "write"],
            499: ["essential", "read", "hold", "write"],
            299: ["essential", "hold"],
        });
    });

    it("holds back a GraphQL read and a mutation by the GraphQL counter", async () => {
        const gh = createFakeGh(() =>
            httpOutput({
                status: 200,
                headers: { ...rate(100), "X-Ratelimit-Resource": "graphql" },
                body: { data: {} },
            }),
        );
        const { gitHub } = client(gh, { mode: "acting" });
        await gitHub.graphql("query { viewer { login } }", {}, { purpose: "essential" });
        await expect(gitHub.graphql("query { viewer { login } }")).rejects.toMatchObject({ kind: "rate" });
        await expect(gitHub.mutate("mutation M { x }", {}, ANY)).rejects.toMatchObject({ kind: "rate" });
        expect(gh.calls).toHaveLength(1);
        expect(gitHub.pace().level).toBe("reserve");
    });

    it("follows the lowest of core and GraphQL and forgets a counter after its reset", async () => {
        const gh = createFakeGh(({ args }) =>
            args.includes("graphql")
                ? fixture("prs-graphql.http")
                : httpOutput({ status: 200, headers: rate(250), body: {} }),
        );
        const { gitHub, advance } = client(gh);
        const data = await gitHub.graphql('query { repository(owner:"o", name:"r") { id } }');
        expect(data.repository.pullRequests.nodes).toHaveLength(2);
        expect(gitHub.pace().level).toBe("normal");
        await gitHub.get(RUNS, { purpose: "essential" });
        expect(gitHub.pace().level).toBe("reserve");
        await expect(gitHub.get(RUNS)).rejects.toMatchObject({ kind: "rate" });
        advance(1790959002_000 - NOW);
        await gitHub.get(RUNS);
        expect(gitHub.pace().level).toBe("normal");
    });

    it("ignores the small search counter", async () => {
        const gh = createFakeGh(() =>
            httpOutput({ status: 200, headers: { ...rate(5), "X-Ratelimit-Resource": "search" }, body: {} }),
        );
        const { gitHub } = client(gh);
        await gitHub.get("search/issues?q=x");
        expect(gitHub.pace().level).toBe("normal");
    });

    it("waits as told by Retry-After, then calls again", async () => {
        let limited = true;
        const gh = createFakeGh(() =>
            limited
                ? httpOutput({ status: 429, headers: { "Retry-After": "120" }, body: {} })
                : httpOutput({ status: 200, body: {} }),
        );
        const { gitHub, advance } = client(gh);
        await expect(gitHub.get(RUNS)).rejects.toMatchObject({ retryAt: NOW + 120_000 });
        expect(gitHub.pace()).toMatchObject({ level: "wait", until: NOW + 120_000 });
        await expect(gitHub.get(RUNS)).rejects.toMatchObject({ kind: "rate" });
        expect(gh.calls).toHaveLength(1);
        advance(120_000);
        limited = false;
        await gitHub.get(RUNS);
        expect(gh.calls).toHaveLength(2);
    });

    it("waits until the reset on a 403 with zero remaining", async () => {
        const gh = createFakeGh(() =>
            httpOutput({ status: 403, headers: rate(0), body: { message: "API rate limit exceeded" } }),
        );
        await expect(client(gh).gitHub.get(RUNS)).rejects.toMatchObject({ kind: "rate", retryAt: 1790959002_000 });
    });

    it("backs off at least 60 s on a secondary limit, doubling to 15 minutes, never a credential failure", async () => {
        const gh = createFakeGh(() =>
            httpOutput({
                status: 403,
                body: { message: "You have exceeded a secondary rate limit. Please wait a few minutes." },
            }),
        );
        const { gitHub, advance, at } = client(gh);
        const waits = [];
        for (let i = 0; i < 6; i++) {
            const err = await gitHub.get(RUNS).catch((e) => e);
            expect(err).toBeInstanceOf(GitHubError);
            expect(err.kind).toBe("secondary");
            waits.push(err.retryAt - at());
            advance(err.retryAt - at());
        }
        expect(waits).toEqual([60_000, 120_000, 240_000, 480_000, 900_000, 900_000]);
    });

    it("never calls a plain permission refusal a rate limit, though every answer carries rate headers", async () => {
        const gh = createFakeGh(() =>
            httpOutput({
                status: 403,
                headers: rate(4900),
                body: { message: "Resource not accessible by integration" },
            }),
        );
        const { gitHub } = client(gh);
        await expect(gitHub.get(RUNS)).rejects.toMatchObject({ kind: "credential", status: 403 });
        expect(gitHub.rate.backoffUntil).toBe(0);
        expect(gitHub.pace().level).toBe("normal");
    });

    it("treats a 403 with a retry-after header, or any 429, as secondary", async () => {
        const answers = [
            httpOutput({
                status: 403,
                headers: { ...rate(4000), "retry-after": "30" },
                body: { message: "Forbidden" },
            }),
            httpOutput({ status: 429, headers: rate(4000), body: { message: "Too many" } }),
        ];
        const gh = createFakeGh(() => answers.shift());
        const { gitHub, advance } = client(gh);
        await expect(gitHub.get(RUNS)).rejects.toMatchObject({ kind: "secondary" });
        advance(120_000);
        await expect(gitHub.get(RUNS)).rejects.toMatchObject({ kind: "secondary" });
    });

    it("resets the secondary back-off after a success", async () => {
        let limited = true;
        const gh = createFakeGh(() =>
            limited ? httpOutput({ status: 403, body: "secondary rate limit" }) : httpOutput({ status: 200, body: {} }),
        );
        const { gitHub, advance } = client(gh);
        await gitHub.get(RUNS).catch(() => {});
        advance(60_000);
        limited = false;
        await gitHub.get(RUNS);
        limited = true;
        const err = await gitHub.get(RUNS).catch((e) => e);
        expect(err.retryAt - (NOW + 60_000)).toBe(60_000);
    });

    it("calls a 403 without rate headers or secondary text a credential failure, and a 401 too", async () => {
        const answers = [
            httpOutput({ status: 403, body: { message: "Bad credentials" } }),
            httpOutput({ status: 401, body: {} }),
        ];
        const gh = createFakeGh(() => answers.shift());
        const { gitHub } = client(gh);
        await expect(gitHub.get(RUNS)).rejects.toMatchObject({ kind: "credential", status: 403 });
        await expect(gitHub.get(RUNS)).rejects.toMatchObject({ kind: "credential", status: 401 });
        expect(gitHub.rate.backoffUntil).toBe(0);
        expect(gitHub.rate.downSince).not.toBeNull();
    });
});

describe("graphql", () => {
    it("refuses a mutation without calling gh", async () => {
        const gh = createFakeGh(() => fixture("prs-graphql.http"));
        const { gitHub } = client(gh, { mode: "acting" });
        await expect(
            gitHub.graphql("mutation { addLabelsToLabelable(input:{}) { clientMutationId } }"),
        ).rejects.toMatchObject({
            kind: "refused",
        });
        expect(gh.calls).toHaveLength(0);
    });

    it("sends the query and variables on stdin and surfaces GraphQL errors", async () => {
        const gh = createFakeGh(() => httpOutput({ status: 200, body: { errors: [{ message: "bad field" }] } }));
        const { gitHub } = client(gh);
        await expect(gitHub.graphql("query($n:Int!){ x(n:$n) }", { n: 1 })).rejects.toMatchObject({ kind: "graphql" });
        expect(gh.calls[0].args).toEqual(["api", "-i", "graphql", "--input", "-"]);
        expect(JSON.parse(gh.calls[0].input)).toEqual({ query: "query($n:Int!){ x(n:$n) }", variables: { n: 1 } });
    });
});

describe("writes", () => {
    const STATUS = `repos/${REPO}/statuses/3e38b709e9452081eb1ee20d6441da676dfd500b`;
    const BODY = { state: "failure", context: "githerd/gate", description: "master 3e38b70 red" };

    for (const mode of ["dry-run", "paused", () => "dry-run", "unknown"]) {
        it(`records would-do and never calls gh in ${typeof mode === "function" ? "a mode function" : mode}`, async () => {
            const gh = createFakeGh(() => httpOutput({ status: 201, body: {} }));
            const { gitHub, ledger } = client(gh, { mode });
            const out = await gitHub.write("POST", STATUS, BODY, ANY);
            await gitHub.mutate(
                "mutation Enable($id: ID!) { enablePullRequestAutoMerge(input:{pullRequestId:$id}) { clientMutationId } }",
                {
                    id: "x",
                },
                ANY,
            );
            expect(out.performed).toBe(false);
            expect(gh.calls).toHaveLength(0);
            expect(gh.writes()).toHaveLength(0);
            expect(ledger).toEqual([
                {
                    kind: "would-do",
                    op: "POST statuses/3e38b709e9452081eb1ee20d6441da676dfd500b",
                    group: "statuses",
                    body: BODY,
                },
                expect.objectContaining({ kind: "would-do", op: "graphql mutation Enable" }),
            ]);
        });
    }

    it("performs and logs an action in acting mode", async () => {
        const gh = createFakeGh(() => httpOutput({ status: 201, headers: rate(4000), body: { id: 1 } }));
        const { gitHub, ledger } = client(gh, { mode: "acting" });
        const out = await gitHub.write("POST", STATUS, BODY, ANY);
        expect(out).toMatchObject({ performed: true, status: 201, stuck: true });
        expect(gh.writes()).toHaveLength(1);
        expect(gh.calls[0].args).toEqual(["api", "-i", "-X", "POST", STATUS, "--input", "-"]);
        expect(JSON.parse(gh.calls[0].input)).toEqual(BODY);
        expect(ledger).toEqual([
            {
                kind: "action",
                op: "POST statuses/3e38b709e9452081eb1ee20d6441da676dfd500b",
                group: "statuses",
                result: 201,
            },
        ]);
    });

    it("sends a bodiless DELETE without stdin and logs a failed write", async () => {
        const gh = createFakeGh(() => httpOutput({ status: 422, body: { message: "Validation Failed" } }));
        const { gitHub, ledger } = client(gh, { mode: "acting" });
        await expect(gitHub.write("DELETE", `repos/${REPO}/issues/5/labels/x`, undefined, ANY)).rejects.toMatchObject({
            kind: "http",
        });
        expect(gh.calls[0].args).toEqual(["api", "-i", "-X", "DELETE", `repos/${REPO}/issues/5/labels/x`]);
        expect(ledger[0]).toMatchObject({ kind: "action", op: "DELETE issues/5/labels/x", result: 422 });
    });

    it("performs a mutation in acting mode and surfaces its errors", async () => {
        const answers = [
            httpOutput({ status: 200, body: { data: { x: 1 } } }),
            httpOutput({ status: 200, body: { errors: [{}] } }),
        ];
        const gh = createFakeGh(() => answers.shift());
        const { gitHub, ledger } = client(gh, { mode: "acting" });
        const check = { group: "upkeep", check: { path: `repos/${REPO}/pulls/1`, expect: { auto_merge: null } } };
        answers.splice(1, 0, httpOutput({ status: 200, body: { auto_merge: null } }));
        expect(await gitHub.mutate("mutation { x }", {}, check)).toMatchObject({
            performed: true,
            body: { data: { x: 1 } },
            stuck: true,
        });
        await expect(gitHub.mutate("mutation { x }", {}, check)).rejects.toMatchObject({ kind: "graphql" });
        expect(ledger.map((e) => e.op)).toEqual(["graphql mutation anonymous", "graphql mutation anonymous"]);
        expect(gh.writes()).toHaveLength(2);
    });

    it("refuses a body with a token in acting mode, before calling gh", async () => {
        const gh = createFakeGh(() => httpOutput({ status: 201, body: {} }));
        const { gitHub, ledger } = client(gh, { mode: "acting" });
        await expect(
            gitHub.write("POST", `repos/${REPO}/issues/5/comments`, { body: "token ghp_abc123" }, ANY),
        ).rejects.toMatchObject({
            kind: "refused",
        });
        await expect(gitHub.mutate('mutation { x(body: "ghp_abc123") }', {}, ANY)).rejects.toMatchObject({
            kind: "refused",
        });
        expect(gh.calls).toHaveLength(0);
        expect(ledger).toHaveLength(0);
    });

    it("refuses attribution lines, environment secrets and non-ASCII text", async () => {
        const gh = createFakeGh(() => httpOutput({ status: 201, body: {} }));
        const { gitHub } = client(gh, { mode: "acting", env: { MY_TOKEN: "s3cr3tvalue42" } });
        const path = `repos/${REPO}/issues/5/comments`;
        await expect(gitHub.write("POST", path, { body: "Co-Authored-By: x" }, ANY)).rejects.toMatchObject({
            kind: "refused",
        });
        await expect(gitHub.write("POST", path, { body: "leak s3cr3tvalue42" }, ANY)).rejects.toThrow(/MY_TOKEN/);
        await expect(
            gitHub.write("POST", path, { body: `caf${String.fromCharCode(0xe9)}` }, ANY),
        ).rejects.toMatchObject({
            kind: "refused",
        });
        expect(gh.calls).toHaveLength(0);
    });

    it("refuses other repositories, path escapes and GET", async () => {
        const gh = createFakeGh(() => httpOutput({ status: 201, body: {} }));
        const { gitHub } = client(gh, { mode: "acting" });
        await expect(
            gitHub.write("POST", "repos/cytoscape/cytoscape.js/issues/1/comments", { body: "x" }, ANY),
        ).rejects.toBeInstanceOf(GitHubError);
        await expect(gitHub.write("POST", `repos/${REPO}/../../other/r/issues`, {}, ANY)).rejects.toThrow(
            /only writes under/,
        );
        await expect(gitHub.write("GET", `repos/${REPO}/issues`, undefined, ANY)).rejects.toThrow(/does not send GET/);
        expect(gh.calls).toHaveLength(0);
    });
});

describe("holds", () => {
    it("matches primitives, object subsets and array elements", () => {
        expect(holds(1, 1)).toBe(true);
        expect(holds(null, null)).toBe(true);
        expect(holds(undefined, null)).toBe(false);
        expect(holds({ a: 1, b: 2 }, { a: 1 })).toBe(true);
        expect(holds({ a: 1 }, { a: 2 })).toBe(false);
        expect(holds("x", { a: 1 })).toBe(false);
        expect(holds(null, {})).toBe(false);
        expect(holds([{ name: "a" }, { name: "b" }], [{ name: "b" }])).toBe(true);
        expect(holds([{ name: "a" }], [{ name: "b" }])).toBe(false);
        expect(holds({ statuses: [{ context: "c", state: "success" }] }, { statuses: [{ state: "success" }] })).toBe(
            true,
        );
        expect(holds({ a: [1] }, { a: [1, 2] })).toBe(false);
        expect(holds("not a list", [1])).toBe(false);
    });
});

describe("read-back and next-poll confirmation", () => {
    const SHA = "3e38b709e9452081eb1ee20d6441da676dfd500b";
    const STATUS = `repos/${REPO}/statuses/${SHA}`;
    const COMBINED = `repos/${REPO}/commits/${SHA}/status`;
    const BODY = { state: "failure", context: "githerd/merge", description: "master red" };
    const OPTS = {
        group: "statuses",
        check: { path: COMBINED, expect: { statuses: [{ context: "githerd/merge", state: "failure" }] } },
        fields: { situation: "red-lane" },
    };

    /**
     * A fake GitHub that keeps posted statuses and answers the combined status with an ETag.
     * `drop` posts that many writes without keeping them; `lost` loses what was kept.
     * @returns {{gh: ReturnType<typeof createFakeGh>, fake: {drop: number, statuses: any[], fail: boolean}}}
     *   the fake gh and its knobs
     */
    function statusFake() {
        const fake = { drop: 0, statuses: /** @type {any[]} */ ([]), fail: false };
        const gh = createFakeGh(({ args, input }) => {
            if (args.includes("-X")) {
                if (fake.drop > 0) fake.drop -= 1;
                else fake.statuses = [JSON.parse(input ?? "{}")];
                return httpOutput({ status: 201, headers: rate(4000), body: {} });
            }
            if (fake.fail) return httpOutput({ status: 502, body: "bad gateway" });
            const etag = `"${JSON.stringify(fake.statuses).length}-${fake.statuses[0]?.state ?? "none"}"`;
            if (args.includes(`If-None-Match: ${etag}`)) return httpOutput({ status: 304, headers: rate(4000) });
            return httpOutput({
                status: 200,
                headers: { ...rate(4000), ETag: etag },
                body: { statuses: fake.statuses },
            });
        });
        return { gh, fake };
    }

    it("makes zero calls in dry-run, even when another group is acting", async () => {
        const { gh } = statusFake();
        const writes = {};
        const { gitHub, ledger } = client(gh, {
            mode: (/** @type {string} */ g) => (g === "upkeep" ? "acting" : "dry-run"),
            writes,
        });
        expect(await gitHub.write("POST", STATUS, BODY, OPTS)).toEqual({
            performed: false,
            op: `POST statuses/${SHA}`,
        });
        await gitHub.confirm();
        expect(gh.calls).toHaveLength(0);
        expect(writes).toEqual({ pending: [] });
        expect(ledger).toEqual([
            { kind: "would-do", op: `POST statuses/${SHA}`, group: "statuses", body: BODY, situation: "red-lane" },
        ]);
    });

    it("reads a write back at once and confirms it on the next poll with a 304", async () => {
        const { gh } = statusFake();
        const writes = {};
        const { gitHub, ledger } = client(gh, { mode: "acting", writes });
        expect(await gitHub.write("POST", STATUS, BODY, OPTS)).toMatchObject({ performed: true, stuck: true });
        expect(gh.calls[1].args).toEqual(["api", "-i", COMBINED]);
        expect(writes.pending).toHaveLength(1);
        await gitHub.confirm();
        expect(gh.calls[2].args).toContain("-H");
        expect(writes.pending).toEqual([]);
        expect(gh.writes()).toHaveLength(1);
        expect(ledger.map((e) => e.kind)).toEqual(["action", "write-confirmed"]);
        expect(ledger[1]).toEqual({
            kind: "write-confirmed",
            op: `POST statuses/${SHA}`,
            group: "statuses",
            after: "sent",
        });
    });

    it("retries a write that did not stick once, and shows it when the retry does not stick", async () => {
        const { gh, fake } = statusFake();
        fake.drop = 2;
        const writes = {};
        const { gitHub, ledger } = client(gh, { mode: "acting", writes });
        expect(await gitHub.write("POST", STATUS, BODY, OPTS)).toMatchObject({ performed: true, stuck: false });
        expect(gh.writes()).toHaveLength(2);
        expect(ledger.map((e) => e.kind)).toEqual(["action", "write-retry", "action", "write-mismatch"]);
        expect(writes.pending[0]).toMatchObject({ retried: true, mismatch: new Date(NOW).toISOString() });
        const board = renderBoard(
            { state: { writes }, liveness: { alive: null, progress: null, fatal: null }, down: null },
            new Date(NOW),
            "health",
        );
        expect(board).toContain(`WRITE DID NOT STICK: POST statuses/${SHA} (statuses), sent twice, wrong since`);

        // The next poll reads it again but never sends it a third time, and logs the mismatch once.
        await gitHub.confirm();
        expect(gh.writes()).toHaveLength(2);
        expect(ledger.filter((e) => e.kind === "write-mismatch")).toHaveLength(1);
        expect(writes.pending).toHaveLength(1);

        // Once it holds (someone posted it), it is confirmed and leaves the board.
        fake.statuses = [BODY];
        await gitHub.confirm();
        expect(writes.pending).toEqual([]);
        expect(ledger.at(-1)).toMatchObject({ kind: "write-confirmed", after: "mismatch" });
    });

    it("retries once when the next poll finds the write undone, and it sticks", async () => {
        const { gh, fake } = statusFake();
        const writes = {};
        const { gitHub, ledger } = client(gh, { mode: "acting", writes });
        await gitHub.write("POST", STATUS, BODY, OPTS);
        fake.statuses = [];
        await gitHub.confirm();
        expect(gh.writes()).toHaveLength(2);
        expect(writes.pending).toEqual([]);
        expect(ledger.map((e) => e.kind)).toEqual(["action", "write-retry", "action", "write-confirmed"]);
    });

    it("keeps a write for the poll after when its read fails, without sending it again", async () => {
        const { gh, fake } = statusFake();
        const writes = {};
        const { gitHub } = client(gh, { mode: "acting", writes });
        fake.fail = true;
        expect(await gitHub.write("POST", STATUS, BODY, OPTS)).toMatchObject({ performed: true, stuck: null });
        await gitHub.confirm();
        expect(gh.writes()).toHaveLength(1);
        expect(writes.pending).toHaveLength(1);
        expect(writes.pending[0].retried).toBe(false);
        fake.fail = false;
        await gitHub.confirm();
        expect(writes.pending).toEqual([]);
    });

    it("marks a mismatch when the retry itself fails", async () => {
        let posts = 0;
        const gh = createFakeGh(({ args }) => {
            if (!args.includes("-X")) return httpOutput({ status: 200, body: { statuses: [] } });
            posts += 1;
            return posts === 1 ? httpOutput({ status: 201, body: {} }) : httpOutput({ status: 422, body: {} });
        });
        const writes = {};
        const { gitHub, ledger } = client(gh, { mode: "acting", writes });
        expect(await gitHub.write("POST", STATUS, BODY, OPTS)).toMatchObject({ stuck: false });
        expect(ledger.map((e) => e.kind)).toEqual(["action", "write-retry", "action", "write-mismatch"]);
        expect(ledger[2]).toMatchObject({ result: 422 });
    });

    it("replaces an older write read back at the same path", async () => {
        const { gh } = statusFake();
        const writes = {};
        const { gitHub } = client(gh, { mode: "acting", writes });
        await gitHub.write("POST", STATUS, BODY, OPTS);
        const ok = { state: "success", context: "githerd/merge" };
        await gitHub.write("POST", STATUS, ok, {
            group: "statuses",
            check: { path: COMBINED, expect: { statuses: [ok] } },
        });
        expect(writes.pending).toHaveLength(1);
        expect(writes.pending[0].request.body).toEqual(ok);
    });

    it("reads a created resource back at the URL its answer names", async () => {
        const url = `https://api.github.com/repos/${REPO}/issues/comments/77`;
        const gh = createFakeGh(({ args }) =>
            args.includes("-X")
                ? httpOutput({ status: 201, body: { id: 77, url } })
                : httpOutput({ status: 200, body: { id: 77, body: "hi" } }),
        );
        const writes = {};
        const { gitHub } = client(gh, { mode: "acting", writes });
        const out = await gitHub.write(
            "POST",
            `repos/${REPO}/issues/5/comments`,
            { body: "hi" },
            {
                group: "owner-items",
                check: "created",
            },
        );
        expect(out.stuck).toBe(true);
        expect(gh.calls[1].args).toEqual(["api", "-i", `repos/${REPO}/issues/comments/77`]);
        expect(writes.pending[0].check).toEqual({ path: `repos/${REPO}/issues/comments/77`, expect: { id: 77 } });
    });

    it("does not stick a created write whose answer names no resource", async () => {
        const gh = createFakeGh(() => httpOutput({ status: 201, body: {} }));
        const { gitHub } = client(gh, { mode: "acting" });
        const out = await gitHub.write(
            "POST",
            `repos/${REPO}/issues`,
            { title: "t" },
            { group: "incidents", check: "created" },
        );
        expect(out.stuck).toBe(false);
        expect(gh.writes()).toHaveLength(2);
    });

    it("reads a 404 as a null body, so a removed thing holds its `lacks`", async () => {
        const gh = createFakeGh(({ args }) =>
            args.includes("-X")
                ? httpOutput({ status: 204 })
                : httpOutput({ status: 404, body: { message: "Not Found" } }),
        );
        const { gitHub } = client(gh, { mode: "acting" });
        const path = `repos/${REPO}/issues/5/labels/hold`;
        const out = await gitHub.write("DELETE", path, undefined, {
            group: "upkeep",
            check: { path, lacks: { name: "hold" } },
        });
        expect(out.stuck).toBe(true);
    });

    it("refuses a write without a group or a read-back check, before calling gh", async () => {
        const gh = createFakeGh(() => httpOutput({ status: 201, body: {} }));
        const { gitHub, ledger } = client(gh, { mode: "acting" });
        await expect(gitHub.write("POST", STATUS, BODY, /** @type {any} */ (undefined))).rejects.toThrow(
            /no write group/,
        );
        await expect(gitHub.write("POST", STATUS, BODY, /** @type {any} */ ({ group: "statuses" }))).rejects.toThrow(
            /no read-back check/,
        );
        await expect(gitHub.mutate("mutation { x }", {}, /** @type {any} */ ({ group: "" }))).rejects.toMatchObject({
            kind: "refused",
        });
        expect(gh.calls).toHaveLength(0);
        expect(ledger).toHaveLength(0);
    });
});
