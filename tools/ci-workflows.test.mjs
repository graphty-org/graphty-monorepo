// Tests of the CI shape: the test matrix's shard groups (tools/ci-test-matrix.mjs), the parts of
// ci.yml and pr-title.yml that decide what a draft, a pull request and a merge-queue run do, and the
// record tools/pr-status-broker.mjs writes for agents.
//
//   node tools/ci-workflows.test.mjs   (pnpm run test:ci-workflows)
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { GROUPS, groupEntry, plan, SHARDS } from "./ci-test-matrix.mjs";
import { decide, FREEZE_PREFIX, frozenSha, mergedPr, revertTitle } from "./master-guard.mjs";
import { summarize } from "./pr-status-broker.mjs";

const workflow = (name) => readFileSync(new URL(`../.github/workflows/${name}`, import.meta.url), "utf8");
const job = (text, name) => {
    const start = text.indexOf(`\n    ${name}:\n`);
    assert.ok(start > 0, `job ${name} exists`);
    const next = text.slice(start + 1).search(/\n {4}[a-z-]+:\n/);
    return next === -1 ? text.slice(start) : text.slice(start, start + 1 + next);
};
const PACKAGES = [...new Set(SHARDS.map((s) => s.package))];
const DRAFT_GUARD =
    "github.event_name != 'pull_request' || !github.event.pull_request.draft || startsWith(github.head_ref, 'mergify/merge-queue/')";

describe("the test matrix", () => {
    it("runs every shard exactly once on a full run, in 13 jobs", () => {
        const include = plan(PACKAGES);
        const ran = include.flatMap((e) => (e.shard in GROUPS ? GROUPS[e.shard] : [e.shard]));
        assert.deepEqual([...ran].sort(), SHARDS.map((s) => s.shard).sort());
        assert.equal(include.length, 13);
    });

    it("puts only the affected members into a group's job", () => {
        const include = plan(["graph-io"]);
        assert.equal(include.length, 1);
        assert.equal(include[0].shard, "small-node");
        assert.match(include[0]["test-command"], /graph-io:coverage/);
        assert.doesNotMatch(include[0]["test-command"], /graph-format:coverage/);
        assert.equal(include[0].coverage, "graph-io=graph-io/coverage/lcov.info");
    });

    it("leaves out the groups and shards of unaffected packages", () => {
        assert.deepEqual(plan([]), []);
        assert.deepEqual(
            plan(["graphty-element"]).map((e) => e.shard),
            SHARDS.filter((s) => s.package === "graphty-element").map((s) => s.shard),
        );
    });

    it("uploads coverage only for the members that uploaded it before the groups", () => {
        const browser = plan(PACKAGES).find((e) => e.shard === "small-browser");
        assert.doesNotMatch(browser.coverage, /visual-review|webgpu-graph-algorithms-browser/);
        assert.match(browser.coverage, /^algorithms-browser=algorithms\/coverage\/lcov.info /);
        assert.equal(browser["needs-browser"], true);
    });

    it("runs every member of a group even after one fails, then fails naming it", () => {
        const fake = (shard, cmd) => ({ shard, package: shard, "test-command": cmd, "needs-browser": false });
        const entry = groupEntry("g", [fake("a", "echo ran-a"), fake("b", "cd / && false"), fake("c", "echo ran-c")]);
        // As Actions runs a `run:` step: bash -e.
        const r = spawnSync("bash", ["-e", "-c", entry["test-command"]], { encoding: "utf8" });
        assert.equal(r.status, 1);
        assert.match(r.stdout, /ran-a/);
        assert.match(r.stdout, /ran-c/);
        assert.match(r.stdout, /::error::failed: b$/m);
        const ok = groupEntry("g", [fake("a", "true"), fake("c", "true")]);
        assert.equal(spawnSync("bash", ["-e", "-c", ok["test-command"]]).status, 0);
    });
});

describe("ci.yml", () => {
    const ci = workflow("ci.yml");

    it("starts a run when a draft is marked ready, and skips drafts except the merge queue's", () => {
        assert.match(ci, /types: \[opened, synchronize, reopened, ready_for_review\]/);
        for (const name of ["build", "all-checks", "queue-checks"]) {
            assert.ok(job(ci, name).includes(DRAFT_GUARD), `${name} carries the draft condition`);
        }
    });

    it("runs the full suite on a merge-queue branch", () => {
        const step = job(ci, "build");
        assert.match(step, /"\$EVENT" == "pull_request" && "\$HEAD_REF" != mergify\/merge-queue\/\*/);
        assert.match(step, /if: steps.plan.outputs.full == 'true'\n\s+run: pnpm exec nx run-many -t build/);
        assert.match(step, /if: steps.plan.outputs.full == 'true'\n\s+run: pnpm exec nx run-many -t lint/);
    });

    it("holds the merge queue to master's rule that every job succeeds", () => {
        assert.match(job(ci, "all-checks"), /\[\[ "\$FULL" == "false" \]\] && ok='\["success","skipped"\]'/);
        const queue = job(ci, "queue-checks");
        assert.match(queue, /name: Queue Checks Pass/);
        assert.match(queue, /"\$ALL_CHECKS" != "success"/);
        assert.match(queue, /mergify\/merge-queue\/\* && "\$FULL" != "true"/);
    });

    it("gates every pull request that affects graphty-element on the cost estimates", () => {
        assert.match(
            job(ci, "cost-accuracy"),
            /if: contains\(fromJSON\(needs.build.outputs.affected\), 'graphty-element'\)/,
        );
        assert.match(job(ci, "all-checks"), /\n\s+cost-accuracy,\n/);
    });

    it("keeps the benchmarks advisory", () => {
        assert.match(job(ci, "performance"), /continue-on-error: true/);
    });
});

describe("pr-title.yml", () => {
    it("passes a merge-queue draft without linting Mergify's title", () => {
        assert.match(
            workflow("pr-title.yml"),
            /- name: Lint PR title\n\s+if: \$\{\{ !startsWith\(github.head_ref, 'mergify\/merge-queue\/'\) \}\}/,
        );
    });
});

describe("gpu.yml", () => {
    const gpu = workflow("gpu.yml");

    it("runs on ready pull requests, master and nightly, never on a label, and never cancels a paid run", () => {
        assert.match(gpu, /pull_request: \{ types: \[opened, synchronize, reopened, ready_for_review\] \}/);
        assert.match(gpu, /schedule: \[\{ cron: /);
        assert.doesNotMatch(gpu, /labeled/);
        assert.match(gpu, /cancel-in-progress: false/);
        assert.match(job(gpu, "test-gpu"), /tenancy=spot/);
    });

    it("runs the T4 only when the decision says so, and only for this repository's pull requests", () => {
        const t4 = job(gpu, "test-gpu");
        assert.match(t4, /needs: decide/);
        assert.match(t4, /needs.decide.outputs.run == 'true'/);
        assert.match(t4, /head.repo.full_name == github.repository/);
    });

    it("always reports the gate, failing it on a draft, a missing decision or a failed T4", () => {
        const gate = job(gpu, "gate");
        assert.match(gate, /name: T4 GPU gate/);
        assert.match(gate, /if: always\(\)/);
        assert.match(gate, /"\$DRAFT" == "true" .* exit 1/);
        assert.match(gate, /"\$DECIDE" != "success" .* exit 1/);
        assert.match(gate, /"\$T4" != "success" .* exit 1/);
    });
});

describe(".mergify.yml and the GPU gate", () => {
    const mergify = readFileSync(new URL("../.mergify.yml", import.meta.url), "utf8");

    it("lets a pull request skip the gate only when none of its files can affect the GPU package", () => {
        const exempt = /-files~=\^\(\?!\(([^)]+)\)\/\)/.exec(mergify)[1].split("|");
        assert.match(mergify, /- check-success=T4 GPU gate/);
        // Every workspace package the GPU package depends on, through package.json (what nx follows).
        const pkg = (dir) => JSON.parse(readFileSync(new URL(`../${dir}/package.json`, import.meta.url), "utf8"));
        const dirs = [
            "algorithms",
            "graph-format",
            "graph-io",
            "graph-samples",
            "layout",
            "graphty-element",
            "graphty",
        ];
        dirs.push("remote-logger", "compact-mantine", "visual-review", "webgpu-graph-algorithms");
        const byName = new Map(dirs.map((d) => [pkg(d).name, d]));
        const deps = new Set(["webgpu-graph-algorithms"]);
        for (const d of deps) {
            const p = pkg(d);
            for (const name of Object.keys({ ...p.dependencies, ...p.devDependencies, ...p.peerDependencies })) {
                if (byName.has(name)) {
                    deps.add(byName.get(name));
                }
            }
        }
        assert.ok(deps.has("graph-format") && deps.has("layout"), "the walk found the GPU package's dependencies");
        for (const dir of exempt) {
            assert.ok(!deps.has(dir), `${dir} is a dependency of webgpu-graph-algorithms, so it cannot skip the gate`);
        }
        const skip = new RegExp(`^(?!(${exempt.join("|")})/)`);
        assert.ok(!skip.test("graphty-element/src/Graph.ts"));
        assert.ok(skip.test("graph-format/src/index.ts"));
        assert.ok(skip.test("pnpm-lock.yaml"));
    });
});

describe("hosts.yml", () => {
    it("runs nightly, and a pull request's Windows leg on the short scope", () => {
        const hosts = workflow("hosts.yml");
        assert.match(hosts, /schedule: \[\{ cron: /);
        assert.match(hosts, /NARROW: .*github.event_name == 'pull_request'/);
    });
});

describe("master-guard", () => {
    const run = (name, conclusion, event = "push") => ({ name, conclusion, event });

    it("freezes on a red master CI, lifts on a green one, and only reports a red hardware lane", () => {
        assert.equal(decide(run("CI", "failure")), "red");
        assert.equal(decide(run("CI", "timed_out")), "red");
        assert.equal(decide(run("CI", "success")), "green");
        assert.equal(decide(run("CI", "cancelled")), "none");
        assert.equal(decide(run("CI", "failure", "workflow_dispatch")), "none");
        assert.equal(decide(run("GPU", "failure")), "hardware-red");
        assert.equal(decide(run("Hosts", "failure", "schedule")), "hardware-red");
        assert.equal(decide(run("GPU", "success")), "none");
        assert.equal(decide(run("GPU", "failure", "pull_request")), "none");
    });

    it("finds the commit in its own freezes and the pull request in a merge commit", () => {
        const sha = "a".repeat(40);
        assert.equal(frozenSha(`${FREEZE_PREFIX}${sha} (url)`), sha);
        assert.equal(frozenSha("release freeze"), null);
        assert.equal(mergedPr("Merge pull request #1011 from graphty-org/x\n\nbody"), 1011);
        assert.equal(mergedPr("chore(release): publish"), null);
    });

    it("titles a revert so Lint PR Title passes it", () => {
        const lint = (title) =>
            spawnSync("pnpm", ["exec", "commitlint"], { input: `${title}\n`, encoding: "utf8" }).status;
        assert.equal(lint(revertTitle("0123456789abcdef0123456789abcdef01234567", 1011)), 0);
        assert.equal(lint(revertTitle("0123456789abcdef0123456789abcdef01234567", null)), 0);
    });
});

describe("pr-status-broker", () => {
    it("writes one compact record per pull request, checks by name", () => {
        const pr = (number, rollup) => ({
            number,
            title: "t",
            headRefName: "h",
            baseRefName: "master",
            isDraft: false,
            mergeable: "MERGEABLE",
            labels: { nodes: [{ name: "hold" }] },
            commits: { nodes: rollup === undefined ? [] : [{ commit: { statusCheckRollup: rollup } }] },
        });
        const contexts = {
            nodes: [
                { name: "Build", status: "COMPLETED", conclusion: "SUCCESS" },
                { name: "Links", status: "IN_PROGRESS", conclusion: null },
                {},
            ],
        };
        const [a, b] = summarize({
            repository: { pullRequests: { nodes: [pr(1, { state: "PENDING", contexts }), pr(2, null)] } },
        });
        assert.deepEqual(a, {
            number: 1,
            title: "t",
            head: "h",
            base: "master",
            draft: false,
            mergeable: "MERGEABLE",
            labels: ["hold"],
            state: "PENDING",
            checks: { Build: "SUCCESS", Links: "IN_PROGRESS" },
        });
        assert.equal(b.state, null);
        assert.deepEqual(b.checks, {});
    });
});
