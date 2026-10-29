// A fetch that answers the collector's requests from responses recorded from the public graphty-org repositories
// on 2026-10-26 (test/fixtures/github), and counts what was asked.
import { readFileSync } from "node:fs";
import type { GhRun } from "../../src/collector/parse.js";

const dir = new URL("../fixtures/github/", import.meta.url);
export const fixture = <T = unknown>(name: string): T => JSON.parse(readFileSync(new URL(name, dir), "utf8")) as T;

/** 2026-10-26 00:35 UTC, a few minutes after the newest recorded run. */
export const NOW = Date.parse("2026-10-26T00:35:00Z");

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
    new Response(status === 304 ? null : JSON.stringify(body), {
        status,
        headers: {
            "content-type": "application/json",
            "x-ratelimit-remaining": "4000",
            "x-ratelimit-limit": "5000",
            ...headers,
        },
    });

export interface Fake {
    fetch: (url: string, init?: RequestInit) => Promise<Response>;
    urls: string[];
    tokenCalls: number;
}

/** The master list: the recorded green build, and a newer cancelled one whose Build hit its timeout (red). */
export function masterRuns(): GhRun[] {
    const green = fixture<GhRun>("run-master-40239928447.json");
    const red: GhRun = {
        ...green,
        id: 40227703075,
        conclusion: "cancelled",
        created_at: "2026-10-26T00:00:00Z",
        updated_at: "2026-10-26T00:13:00Z",
        check_suite_node_id: "CS_kwDOQuemQs8AAAAZYq97aw",
    };
    return [red, green];
}

export function fakeGitHub(opts: { coveralls?: string } = {}): Fake {
    const fake: Fake = { urls: [], tokenCalls: 0, fetch: async () => json({}) };
    const runs = new Map<number, GhRun>(
        [
            fixture<GhRun>("run-pr-40238975833.json"),
            ...fixture<{ workflow_runs: GhRun[] }>("runs-list.json").workflow_runs,
            ...fixture<{ workflow_runs: GhRun[] }>("release-runs.json").workflow_runs,
        ].map((r) => [r.id, r]),
    );
    const jobsFor: Record<number, string> = {
        40238975833: "jobs-pr-40238975833.json",
        40239928447: "jobs-master-40239928447.json",
        40167547801: "jobs-release-skipped-40167547801.json",
        40119894804: "jobs-release-tested-40119894804.json",
    };
    fake.fetch = async (url, init) => {
        fake.urls.push(url);
        const u = new URL(url);
        const p = u.pathname;
        if (u.hostname === "coveralls.io")
            return opts.coveralls ? json({ created_at: opts.coveralls }) : json({ error: "nope" }, 500);
        if (u.hostname === "registry.npmjs.org")
            return p.includes("graph-format")
                ? json(fixture("npm-graph-format.json"), 200, { etag: '"gf1"' })
                : json({}, 404);
        if (p.endsWith("/access_tokens")) {
            fake.tokenCalls++;
            return json({ token: "ghs_test", expires_at: new Date(NOW + 3_600_000).toISOString() }, 201);
        }
        if (p === "/graphql") {
            const body = JSON.parse(String(init?.body)) as { query: string; variables: { ids?: string[] } };
            if (body.query.includes("checkRuns")) {
                const nodes = fixture<{ data: { nodes: { id: string }[] } }>("cancel-annotations.json").data.nodes;
                return json({
                    data: { nodes: (body.variables.ids ?? []).map((id) => nodes.find((n) => n.id === id) ?? null) },
                });
            }
            if (body.query.includes("pullRequests")) return json(fixture("gql-pr.json"));
            if (body.query.includes("issues(")) return json(fixture("gql-issue.json"));
            if (body.query.includes("channel/nightly"))
                return json({
                    data: { repository: { nightly: { target: { oid: "a".repeat(40) } }, production: null } },
                });
            if (body.query.includes("refs(")) return json(fixture("gql-tag.json"));
            if (body.query.includes("test-quarantine.json"))
                return json({
                    data: {
                        repository: {
                            quarantine: {
                                text: JSON.stringify({
                                    quarantine: [
                                        {
                                            file: "a/x.test.ts",
                                            name: "t1",
                                            family: "a",
                                            issue: 9,
                                            reason: "r",
                                            excerpt: "e",
                                        },
                                    ],
                                }),
                            },
                            codeowners: { text: "# owners\n/.github/ @o\n/visual-review/ @o\n" },
                        },
                    },
                });
            if (body.query.includes("files(first")) {
                const ns = [...body.query.matchAll(/p(\d+): pullRequest/g)].map((m) => m[1]);
                return json({
                    data: {
                        repository: Object.fromEntries(
                            ns.map((n) => [`p${n}`, { files: { nodes: [{ path: ".github/workflows/ci.yml" }] } }]),
                        ),
                    },
                });
            }
        }
        if (p === "/orgs/graphty-org/repos") return json(fixture("org-repos.json"));
        if (p.endsWith("/actions/workflows/ci.yml/runs")) return json({ total_count: 2, workflow_runs: masterRuns() });
        if (p.endsWith("/actions/workflows/release.yml/runs")) return json(fixture("release-runs.json"));
        if (/\/actions\/workflows\/[^/]+\/runs$/.test(p)) return json({}, 404);
        if (/\/repos\/graphty-org\/graphty-monorepo\/actions\/runs$/.test(p)) {
            if (u.searchParams.get("status") === "in_progress")
                return json({
                    total_count: 1,
                    workflow_runs: [{ ...runs.get(40238975833)!, status: "in_progress", conclusion: null }],
                });
            if (u.searchParams.get("status")) return json({ total_count: 0, workflow_runs: [] });
            const list = fixture<{ workflow_runs: GhRun[] }>("runs-list.json").workflow_runs;
            return json({ total_count: list.length + 1, workflow_runs: [...list, runs.get(40238975833)!] });
        }
        if (/\/actions\/runs$/.test(p)) return json({ total_count: 0, workflow_runs: [] });
        const job = /\/actions\/runs\/(\d+)\/jobs$/.exec(p);
        if (job) {
            const id = Number(job[1]);
            if (jobsFor[id]) return json(fixture(jobsFor[id]));
            return json({ total_count: 0, jobs: [] });
        }
        const one = /\/actions\/runs\/(\d+)$/.exec(p);
        if (one) return runs.has(Number(one[1])) ? json(runs.get(Number(one[1]))) : json({}, 404);
        if (p.includes("/compare/")) return json({ commits: [] });
        return json({ message: "Not Found" }, 404);
    };
    return fake;
}
