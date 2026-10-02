import { describe, expect, it } from "vitest";

import { createGitHub, GitHubError } from "../lib/github.mjs";
import { createFakeGh, fixture, httpOutput } from "./helpers/fake-gh.mjs";

const REPO = "graphty-org/graphty-monorepo";
const RUNS = `repos/${REPO}/actions/workflows/ci.yml/runs?branch=master&per_page=10&exclude_pull_requests=true`;
const NOW = 1790958000_000; // before the fixtures' X-Ratelimit-Reset

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
    it("doubles the interval below 1000 and polls master lanes only below 300", async () => {
        let remaining = 1000;
        const gh = createFakeGh(() => httpOutput({ status: 200, headers: rate(remaining), body: {} }));
        const { gitHub } = client(gh);
        await gitHub.get(RUNS);
        expect(gitHub.pace()).toMatchObject({ level: "normal", intervalFactor: 1 });
        remaining = 999;
        await gitHub.get(RUNS);
        expect(gitHub.pace()).toMatchObject({ level: "slow", intervalFactor: 2 });
        remaining = 300;
        await gitHub.get(RUNS);
        expect(gitHub.pace().level).toBe("slow");
        remaining = 299;
        await gitHub.get(RUNS);
        expect(gitHub.pace()).toEqual({ level: "masters-only", intervalFactor: 1, until: 1790959002_000 });
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
        await gitHub.get(RUNS);
        expect(gitHub.pace().level).toBe("masters-only");
        advance(1790959002_000 - NOW);
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

    it("treats a 403 with rate headers and positive remaining as secondary", async () => {
        const gh = createFakeGh(() => httpOutput({ status: 403, headers: rate(4000), body: { message: "Forbidden" } }));
        await expect(client(gh).gitHub.get(RUNS)).rejects.toMatchObject({ kind: "secondary" });
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
            const out = await gitHub.write("POST", STATUS, BODY);
            await gitHub.mutate(
                "mutation Enable($id: ID!) { enablePullRequestAutoMerge(input:{pullRequestId:$id}) { clientMutationId } }",
                {
                    id: "x",
                },
            );
            expect(out.performed).toBe(false);
            expect(gh.calls).toHaveLength(0);
            expect(gh.writes()).toHaveLength(0);
            expect(ledger).toEqual([
                { kind: "would-do", op: "POST statuses/3e38b709e9452081eb1ee20d6441da676dfd500b", body: BODY },
                expect.objectContaining({ kind: "would-do", op: "graphql mutation Enable" }),
            ]);
        });
    }

    it("performs and logs an action in acting mode", async () => {
        const gh = createFakeGh(() => httpOutput({ status: 201, headers: rate(4000), body: { id: 1 } }));
        const { gitHub, ledger } = client(gh, { mode: "acting" });
        const out = await gitHub.write("POST", STATUS, BODY);
        expect(out).toMatchObject({ performed: true, status: 201 });
        expect(gh.writes()).toHaveLength(1);
        expect(gh.calls[0].args).toEqual(["api", "-i", "-X", "POST", STATUS, "--input", "-"]);
        expect(JSON.parse(gh.calls[0].input)).toEqual(BODY);
        expect(ledger).toEqual([
            { kind: "action", op: "POST statuses/3e38b709e9452081eb1ee20d6441da676dfd500b", result: 201 },
        ]);
    });

    it("sends a bodiless DELETE without stdin and logs a failed write", async () => {
        const gh = createFakeGh(() => httpOutput({ status: 422, body: { message: "Validation Failed" } }));
        const { gitHub, ledger } = client(gh, { mode: "acting" });
        await expect(gitHub.write("DELETE", `repos/${REPO}/issues/5/labels/x`)).rejects.toMatchObject({ kind: "http" });
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
        expect(await gitHub.mutate("mutation { x }")).toMatchObject({ performed: true, body: { data: { x: 1 } } });
        await expect(gitHub.mutate("mutation { x }")).rejects.toMatchObject({ kind: "graphql" });
        expect(ledger.map((e) => e.op)).toEqual(["graphql mutation anonymous", "graphql mutation anonymous"]);
        expect(gh.writes()).toHaveLength(2);
    });

    it("refuses a body with a token in acting mode, before calling gh", async () => {
        const gh = createFakeGh(() => httpOutput({ status: 201, body: {} }));
        const { gitHub, ledger } = client(gh, { mode: "acting" });
        await expect(
            gitHub.write("POST", `repos/${REPO}/issues/5/comments`, { body: "token ghp_abc123" }),
        ).rejects.toMatchObject({
            kind: "refused",
        });
        await expect(gitHub.mutate('mutation { x(body: "ghp_abc123") }')).rejects.toMatchObject({ kind: "refused" });
        expect(gh.calls).toHaveLength(0);
        expect(ledger).toHaveLength(0);
    });

    it("refuses attribution lines, environment secrets and non-ASCII text", async () => {
        const gh = createFakeGh(() => httpOutput({ status: 201, body: {} }));
        const { gitHub } = client(gh, { mode: "acting", env: { MY_TOKEN: "s3cr3tvalue42" } });
        const path = `repos/${REPO}/issues/5/comments`;
        await expect(gitHub.write("POST", path, { body: "Co-Authored-By: x" })).rejects.toMatchObject({
            kind: "refused",
        });
        await expect(gitHub.write("POST", path, { body: "leak s3cr3tvalue42" })).rejects.toThrow(/MY_TOKEN/);
        await expect(gitHub.write("POST", path, { body: `caf${String.fromCharCode(0xe9)}` })).rejects.toMatchObject({
            kind: "refused",
        });
        expect(gh.calls).toHaveLength(0);
    });

    it("refuses other repositories, path escapes and GET", async () => {
        const gh = createFakeGh(() => httpOutput({ status: 201, body: {} }));
        const { gitHub } = client(gh, { mode: "acting" });
        await expect(
            gitHub.write("POST", "repos/cytoscape/cytoscape.js/issues/1/comments", { body: "x" }),
        ).rejects.toBeInstanceOf(GitHubError);
        await expect(gitHub.write("POST", `repos/${REPO}/../../other/r/issues`, {})).rejects.toThrow(
            /only writes under/,
        );
        await expect(gitHub.write("GET", `repos/${REPO}/issues`)).rejects.toThrow(/does not send GET/);
        expect(gh.calls).toHaveLength(0);
    });
});
