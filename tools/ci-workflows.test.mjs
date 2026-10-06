// Tests of the CI shape: the test matrix's shard groups (tools/ci-test-matrix.mjs), the parts of
// ci.yml and pr-title.yml that decide what a draft, a pull request and a merge-queue run do, the
// release train (release.yml, tools/release-diff.mjs, deploy-pages.yml, .mergify.yml's release
// rule), the record tools/pr-status-broker.mjs writes for agents, and the local commit and push hooks
// (.husky/pre-commit, tools/format-staged.sh, tools/prepush.sh).
//
//   node tools/ci-workflows.test.mjs   (pnpm run test:ci-workflows)
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import { GROUPS, groupEntry, plan, SHARDS } from "./ci-test-matrix.mjs";
import { decide, FREEZE_PREFIX, frozenSha, mergedPr, revertTitle } from "./master-guard.mjs";
import { summarize } from "./pr-status-broker.mjs";
import { strayChanges } from "./release-diff.mjs";

const workflow = (name) => readFileSync(new URL(`../.github/workflows/${name}`, import.meta.url), "utf8");
const job = (text, name) => {
    const start = text.indexOf(`\n    ${name}:\n`);
    assert.ok(start > 0, `job ${name} exists`);
    const next = text.slice(start + 1).search(/\n {4}[a-z0-9-]+:\n/);
    return next === -1 ? text.slice(start) : text.slice(start, start + 1 + next);
};
const PACKAGES = [...new Set(SHARDS.map((s) => s.package))];
const QUEUE =
    "startsWith(github.head_ref, 'mergify/merge-queue/') && github.event.pull_request.head.repo.full_name == github.repository && github.event.pull_request.user.login == 'mergify[bot]'";

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
        assert.ok(
            job(ci, "build").includes(
                `if: github.event_name != 'pull_request' || !github.event.pull_request.draft || (${QUEUE})\n`,
            ),
        );
        assert.ok(ci.includes(`    MERGE_QUEUE: \${{ ${QUEUE} }}\n`), "the workflow names the merge queue once");
    });

    it("never lets a draft run cancel a ready run, and never cancels a push to master (#1108)", () => {
        // `opened` (draft: true) and `ready_for_review` (draft: false) fire a second apart. Sharing one
        // group, whichever was queued second cancelled the other, which could leave only the draft's
        // "draft: CI not run". A plain draft -- exactly the drafts the build job skips -- gets its own
        // group; the merge queue's drafts are real runs and stay with the ready runs.
        const block = ci.match(/^concurrency:\n((?: {4}.*\n)+)/m);
        assert.ok(block, "ci.yml has a workflow-level concurrency block");
        assert.equal(
            block[1],
            "    group: ci-${{ github.event.pull_request.number || github.sha }}-" +
                `\${{ github.event.pull_request.draft && !(${QUEUE}) && 'draft' || 'run' }}\n` +
                "    cancel-in-progress: ${{ github.event_name == 'pull_request' }}\n",
        );
    });

    it("fails, never skips, the summary checks on a draft", () => {
        // A skipped required check counts as passing, and the draft run's check stays on the head SHA
        // after "gh pr ready" until the new run reports.
        for (const name of ["all-checks", "queue-checks"]) {
            assert.match(job(ci, name), /\n {8}if: always\(\)\n/, `${name} always runs`);
        }
        assert.match(
            job(ci, "all-checks"),
            /if \[\[ "\$BUILD" == "skipped" \]\]; then\n.*draft: CI not run.*\n\s+exit 1/,
        );
    });

    it("runs the full suite on a merge-queue branch", () => {
        const step = job(ci, "build");
        assert.match(step, /"\$EVENT" == "pull_request" && "\$MERGE_QUEUE" != "true"/);
        assert.match(step, /if: steps.plan.outputs.full == 'true'\n\s+run: pnpm exec nx run-many -t build/);
        assert.match(step, /if: steps.plan.outputs.full == 'true'\n\s+run: pnpm exec nx run-many -t lint/);
    });

    it("holds the merge queue to master's rule that every job succeeds", () => {
        assert.match(job(ci, "all-checks"), /\[\[ "\$FULL" == "false" \]\] && ok='\["success","skipped"\]'/);
        const queue = job(ci, "queue-checks");
        assert.match(queue, /name: Queue Checks Pass/);
        assert.match(queue, /"\$ALL_CHECKS" != "success"/);
        assert.match(queue, /"\$MERGE_QUEUE" == "true" && "\$FULL" != "true"/);
    });

    it("gates every pull request that affects graphty-element on the cost estimates", () => {
        assert.match(
            job(ci, "cost-accuracy"),
            /if: contains\(fromJSON\(needs.build.outputs.affected\), 'graphty-element'\)/,
        );
        assert.match(job(ci, "all-checks"), /\n\s+cost-accuracy,\n/);
    });

    it("runs no security audit on pull requests or merge-queue runs", () => {
        // advisories land against code a pull request did not change; the release train audits instead
        assert.doesNotMatch(ci, /pnpm audit/);
        const review = workflow("dependency-review.yml");
        assert.match(review, /paths:\n\s+- "pnpm-lock.yaml"/);
        assert.match(review, /if: \$\{\{ !startsWith\(github.head_ref, 'mergify\/merge-queue\/'\) \}\}/);
        assert.match(review, /fail-on-severity: high/);
    });

    it("keeps the benchmarks advisory", () => {
        assert.match(job(ci, "performance"), /continue-on-error: true/);
    });
});

describe("pr-title.yml", () => {
    it("passes only Mergify's own merge-queue draft without linting its title", () => {
        assert.ok(workflow("pr-title.yml").includes(`- name: Lint PR title\n              if: \${{ !(${QUEUE}) }}\n`));
    });
    it("is never cancelled by a later run, so Mergify's body edits cannot interrupt the required check", () => {
        // A concurrency group cancels superseded runs even without cancel-in-progress.
        assert.doesNotMatch(workflow("pr-title.yml"), /^concurrency:/m);
    });
});

describe("the lanes outside CI", () => {
    it("run nothing on a draft and start when it is marked ready", () => {
        const hosts = workflow("hosts.yml");
        assert.match(hosts, /types: \[opened, synchronize, reopened, ready_for_review\]/);
        assert.match(
            job(hosts, "test"),
            /if: github.event_name != 'pull_request' \|\| !github.event.pull_request.draft\n/,
        );
    });
});

describe("apt in the workflows", () => {
    it("drops the Microsoft apt sources before every job's first apt use", () => {
        // packages.microsoft.com, a source the hosted Ubuntu images ship and nothing here installs from,
        // sometimes answers 403 and apt-get update exits 100 (run 37244710257). A job in a `container:`
        // runs a bare image without that source.
        const dir = new URL("../.github/workflows/", import.meta.url);
        const files = readdirSync(dir)
            .filter((f) => f.endsWith(".yml"))
            .map((f) => [f, readFileSync(new URL(f, dir), "utf8")]);
        files.push([
            "visual-review template",
            readFileSync(new URL("../visual-review/templates/visual-review.yml", import.meta.url), "utf8"),
        ]);
        const APT = /--with-deps|install-deps|install-browser|apt-get/;
        let checked = 0;
        for (const [file, text] of files) {
            const code = text.replace(/^\s*#.*$/gm, "");
            for (const body of code.split(/\n(?= {4}[a-z][\w-]*:\n)/)) {
                const use = body.search(APT);
                if (use === -1 || /\n {8}container:/.test(body)) continue;
                const drop = body.search(/drop-microsoft-apt-source|grep -rl packages\.microsoft\.com/);
                assert.ok(drop !== -1 && drop < use, `${file}: ${body.trim().split("\n")[0]} drops the source first`);
                checked++;
            }
        }
        assert.ok(checked >= 4, `found the apt jobs (${checked})`);
    });
});

describe(".mergify.yml", () => {
    it("does not make the queue wait on the visual gate before the gate accepts a batch", () => {
        // In a queue run the gate's --pr is the queue draft's own number, which no review record names,
        // so a batch that changes a baseline fails "Queue Checks Pass" every time. merge_conditions may
        // name it only once the trusted gate takes a batch's pull request numbers (its usage says so).
        const mergify = readFileSync(new URL("../.mergify.yml", import.meta.url), "utf8");
        const gate = readFileSync(new URL("../visual-review/trusted/gate.mjs", import.meta.url), "utf8");
        const usage = gate.slice(gate.indexOf("export const GATE_USAGE"));
        if (/^\s*merge_conditions:/m.test(mergify) || /^\s*batch_size: *([2-9]|\d{2,})/m.test(mergify)) {
            assert.match(usage.slice(0, usage.indexOf("`;")), /batch/i, "the gate accepts a batch first");
        }
    });
});

describe("gpu.yml", () => {
    const gpu = workflow("gpu.yml");
    const triggers = (text) => text.slice(text.indexOf("\non:\n"), text.search(/\n(permissions|concurrency|jobs):/));

    it("runs only when dispatched or called by the release train, never on a pull request, a push or a schedule", () => {
        const on = triggers(gpu);
        assert.doesNotMatch(on, /^ {4}(pull_request|pull_request_target|push|schedule|merge_group|workflow_run)\b/m);
        assert.match(on, /^ {4}workflow_call:\n {8}inputs:\n {12}ref:/m);
        assert.match(on, /^ {4}workflow_dispatch:/m);
        assert.match(gpu, /cancel-in-progress: false/);
        assert.doesNotMatch(job(gpu, "test-gpu"), /tenancy=spot/);
        // the T4 tests the commit the train selected, not the train's own checkout
        assert.match(
            job(gpu, "test-gpu"),
            /- uses: actions\/checkout@v4\n {14}with: \{ ref: "\$\{\{ inputs.ref \}\}" \}/,
        );
        assert.doesNotMatch(gpu, /gpu-lane-needed|T4 GPU gate/);
    });

    it("leaves no pull request or master push able to start a paid T4 anywhere", () => {
        const dir = new URL("../.github/workflows/", import.meta.url);
        for (const file of readdirSync(dir).filter((f) => f.endsWith(".yml"))) {
            const text = readFileSync(new URL(file, dir), "utf8");
            if (!/gpu=t4|gpu-linux-t4|uses: \.\/\.github\/workflows\/gpu\.yml/.test(text.replace(/^\s*#.*$/gm, ""))) {
                continue;
            }
            if (file === "release.yml") {
                // its push trigger only publishes; the T4 hangs off the pick job, which never runs on a push
                assert.match(job(text, "pick"), /if: \$\{\{ github.event_name != 'push' /);
                assert.match(job(text, "t4"), /needs: pick\n/);
                continue;
            }
            assert.doesNotMatch(triggers(text), /^ {4}(pull_request|pull_request_target|push|merge_group)\b/m, file);
        }
    });
});

describe(".mergify.yml and the T4", () => {
    it("makes no pull request wait on a T4 result", () => {
        const mergify = readFileSync(new URL("../.mergify.yml", import.meta.url), "utf8");
        assert.doesNotMatch(mergify, /T4|GPU|gpu/);
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
        assert.equal(decide(run("Hosts", "failure")), "hardware-red");
        assert.equal(decide(run("Hosts", "failure", "schedule")), "hardware-red");
        assert.equal(decide(run("Hosts", "success")), "none");
        assert.equal(decide(run("Hosts", "failure", "pull_request")), "none");
        // the T4 runs only in the release train, which files its own issue
        assert.equal(decide(run("GPU", "failure")), "none");
        assert.match(workflow("master-guard.yml"), /workflows: \["CI", "Hosts"\]/);
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

describe("release.yml", () => {
    const release = workflow("release.yml");
    const pick = job(release, "pick");
    const t4 = job(release, "t4");
    const held = job(release, "held");
    const train = job(release, "train");
    const publish = job(release, "publish");

    it("never pushes to master and holds no deploy key", () => {
        assert.doesNotMatch(release, /RELEASE_DEPLOY_KEY|ssh-key/);
        const pushes = release.match(/git push[^\n]*/g);
        assert.deepEqual(pushes, ['git push origin "${COMMIT}:refs/heads/${branch}"']);
    });

    it("cuts the release only from master, once a day or on dispatch, from a commit green on every lane", () => {
        assert.match(release, /schedule:\n\s+- cron: /);
        assert.match(release, /workflow_dispatch:\n\s+inputs:\n\s+packages:/);
        assert.match(pick, /if: \$\{\{ github.event_name != 'push' && github.ref == 'refs\/heads\/master' \}\}/);
        assert.match(pick, /case "\$ci" in \*" completed success"\) ;; \*\) continue ;; esac/);
        assert.match(pick, /case "\$hosts" in "" \| \*" completed success"\) ;; \*\) continue ;; esac/);
        assert.match(pick, /is still open; it must merge or close first/);
        // the T4 is no longer read from gpu.yml runs on master: the train runs it itself
        assert.doesNotMatch(pick, /runs gpu\.yml|"\$gpu"/);
        assert.match(train, /node tools\/release-hold.mjs apply --only "\$PACKAGES"/);
        assert.match(train, /node tools\/release-diff.mjs "\$SHA" "\$COMMIT"/);
        // the train is put first by .mergify.yml's "release train" priority rule, not a label
        assert.doesNotMatch(train, /gh pr create[^\n]*--label/);
    });

    it("runs the T4 on the picked commit before anything is versioned, and opens the pull request only if it passed", () => {
        assert.match(t4, /needs: pick\n/);
        assert.match(t4, /if: \$\{\{ needs.pick.outputs.release == 'true' \}\}/);
        assert.match(
            t4,
            /uses: \.\/\.github\/workflows\/gpu\.yml\n\s+with:\n\s+ref: \$\{\{ needs.pick.outputs.sha \}\}/,
        );
        assert.match(train, /needs: \[pick, t4\]/);
        assert.match(train, /if: \$\{\{ needs.pick.outputs.release == 'true' && needs.t4.result == 'success' \}\}/);
        // one train at a time across its jobs, so two trains never pay for two T4 runs of one commit
        assert.match(release, /^concurrency:\n {4}group: .*'release-train' \}\}\n {4}cancel-in-progress: false/m);
    });

    it("holds the whole release on a red T4: no pull request, no builds kept, nothing published, one issue", () => {
        assert.match(held, /needs: \[pick, t4\]/);
        assert.match(held, /needs.t4.result == 'failure'/);
        assert.doesNotMatch(held, /gh pr create|git push|nx release|upload-artifact|id-token/);
        // the publish job finds only builds the train kept, and only the train keeps them
        assert.equal(release.match(/name: release-builds-/g).length, 2);
        assert.match(train, /name: release-builds-\$\{\{ needs.pick.outputs.sha \}\}/);
        assert.match(publish, /name: release-builds-\$\{\{ steps.commit.outputs.sha \}\}/);
        assert.equal(release.match(/gh pr create/g).length, 1);
        // one issue: found by its title prefix and updated, else created with the labels githerd and triage read
        assert.match(held, /title="Release held: T4 GPU failed on \$\{SHA:0:7\}"/);
        assert.match(held, /startswith\("Release held: T4 GPU failed on "\)/);
        assert.match(held, /gh issue edit "\$open"[^\n]*--title "\$title"/);
        assert.match(held, /gh issue comment "\$open"/);
        assert.match(held, /--label bug --label priority:high --label gpu --label effort:medium/);
        assert.match(held, /actions\/runs\/\$\{GITHUB_RUN_ID\}/);
        assert.match(held, /::error::release held/);
        // and the next train whose T4 passes closes it
        assert.match(train, /startswith\("Release held: T4 GPU failed on "\)[\s\S]*gh issue close "\$open"/);
    });

    it("audits the released commit's dependencies before it opens the release pull request", () => {
        const audit = train.indexOf("run: pnpm audit --prod --audit-level=high");
        assert.ok(audit > train.indexOf("pnpm install --frozen-lockfile"), "after install");
        assert.ok(audit < train.indexOf("nx release --skip-publish"), "before versioning");
        assert.ok(audit < train.indexOf("name: Keep the builds for the publish job"), "before the 30-day artifact");
        assert.ok(audit < train.indexOf("gh pr create"), "before the release pull request");
        const step = train.slice(train.lastIndexOf("- name:", audit), audit);
        assert.match(step, /if: \$\{\{ steps.lanes.outputs.release == 'true' \}\}/, "runs whenever a release is cut");
        assert.doesNotMatch(step, /continue-on-error/, "a high advisory blocks the release");
    });

    it("publishes only on a push that lands a release branch, from the train's builds, with OIDC", () => {
        assert.match(
            publish,
            /if: \$\{\{ github.event_name == 'push' && contains\(github.event.head_commit.message, '\/release\/train-'\) \}\}/,
        );
        assert.match(publish, /id-token: write/);
        assert.match(publish, /node tools\/release-diff.mjs "\$sha" "\$commit"/);
        assert.match(publish, /\.workflow_run.head_branch == "master"/);
        assert.doesNotMatch(train, /id-token|nx release publish/);
    });

    it("lets Mergify take the release pull request alone, ahead of the default rule", () => {
        const mergify = readFileSync(new URL("../.mergify.yml", import.meta.url), "utf8");
        const rule = mergify.indexOf("- name: release");
        assert.ok(rule > 0 && rule < mergify.indexOf("- name: default"));
        assert.match(mergify.slice(rule), /^\s+- head~=\^release\/train-$/m);
    });

    it("puts the train first by its branch, and lets no priority rule interrupt the batches being checked", () => {
        const mergify = readFileSync(new URL("../.mergify.yml", import.meta.url), "utf8");
        const rules = mergify.slice(mergify.indexOf("priority_rules:"), mergify.indexOf("queue_rules:"));
        assert.doesNotMatch(rules, /allow_checks_interruption: *true/);
        const train = rules.slice(rules.indexOf("- name: release train"));
        assert.match(train, /^\s+- head~=\^release\/train-$/m);
        assert.match(train, /^\s+- author=github-actions\[bot\]$/m);
        assert.match(train, /^\s+priority: high$/m);
        assert.match(train, /^\s+allow_checks_interruption: false$/m);
    });

    it("deploys graphty.app from every green CI run of a push to master", () => {
        const deploy = workflow("deploy-pages.yml");
        assert.match(deploy, /workflow_run:\n\s+workflows: \["CI"\]/);
        assert.match(
            job(deploy, "check"),
            /github.event.workflow_run.conclusion == 'success' && github.event.workflow_run.event == 'push'/,
        );
    });
});

describe("release-diff", () => {
    const manifest = (version, extra = {}) => JSON.stringify({ name: "a", version, ...extra }, null, 4);
    const tree = (files) => (path) => files[path] ?? null;

    it("accepts version bumps, changelogs and consumed version plans", () => {
        const before = tree({ "a/package.json": manifest("1.0.0"), ".nx/version-plans/x.md": "minor" });
        const after = tree({ "a/package.json": manifest("1.1.0"), "a/CHANGELOG.md": "## 1.1.0" });
        const files = ["a/package.json", "a/CHANGELOG.md", ".nx/version-plans/x.md"];
        assert.deepEqual(strayChanges(files, before, after), []);
    });

    it("rejects any other change", () => {
        const before = tree({ "a/package.json": manifest("1.0.0"), "a/src/x.ts": "1" });
        const after = tree({
            "a/package.json": manifest("1.1.0", { main: "x" }),
            "a/src/x.ts": "2",
            "b/package.json": "{}",
        });
        const found = strayChanges(["a/package.json", "a/src/x.ts", "b/package.json"], before, after);
        assert.equal(found.length, 3);
        assert.match(found.join("\n"), /a\/package.json: changes more than "version"/);
    });
});

describe("pr-status-broker", () => {
    it("writes one compact record per pull request, the newest check of each name", () => {
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
            pageInfo: { hasNextPage: true },
            nodes: [
                { name: "Build", status: "COMPLETED", conclusion: "SUCCESS", startedAt: "2026-10-04T10:00:00Z" },
                // The draft run's skipped check, older, listed after the real one: the newest wins.
                {
                    name: "All Checks Pass",
                    status: "COMPLETED",
                    conclusion: "SUCCESS",
                    startedAt: "2026-10-04T10:20:00Z",
                },
                {
                    name: "All Checks Pass",
                    status: "COMPLETED",
                    conclusion: "SKIPPED",
                    startedAt: "2026-10-04T09:00:00Z",
                },
                { name: "Links", status: "COMPLETED", conclusion: "FAILURE", startedAt: "2026-10-04T10:00:00Z" },
                { name: "Links", status: "QUEUED", conclusion: null, startedAt: null },
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
            checks: { Build: "SUCCESS", "All Checks Pass": "SUCCESS", Links: "QUEUED" },
            checksTruncated: true,
        });
        assert.equal(b.state, null);
        assert.deepEqual(b.checks, {});
    });
});

describe("the commit and push hooks", () => {
    const repoFile = (name) => readFileSync(new URL(`../${name}`, import.meta.url), "utf8");
    const formatStaged = new URL("./format-staged.sh", import.meta.url).pathname;
    // A throwaway repository, run without the GIT_* variables a hook inherits.
    const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith("GIT_")));
    const inRepo = (fn) => {
        const dir = mkdtempSync(join(tmpdir(), "format-staged-"));
        const git = (...args) => spawnSync("git", args, { cwd: dir, env, encoding: "utf8" });
        try {
            git("init", "-q");
            fn(dir, git);
        } finally {
            rmSync(dir, { recursive: true, force: true });
        }
    };
    const staged = (git, f) => git("show", `:${f}`).stdout;

    it("pre-commit scans for secrets, then formats the staged files", () => {
        assert.match(
            repoFile(".husky/pre-commit"),
            /scan-secrets\.sh --cached \|\| exit 1\n[\s\S]*\.\/tools\/format-staged\.sh/,
        );
    });

    it("commit-changes.sh runs the same pre-commit hook as a plain commit", () => {
        assert.match(repoFile("tools/commit-changes.sh"), /cp \.husky\/pre-commit \.husky\/commit-msg "\$HOOKS_DIR\/"/);
    });

    it("formats fully staged files and leaves partial, baseline and binary files alone", () => {
        inRepo((dir, git) => {
            mkdirSync(join(dir, "visual-baselines"));
            writeFileSync(join(dir, "a.ts"), "const  x = {a:1}\n");
            writeFileSync(join(dir, "b.ts"), "const  y = {b:2}\n");
            writeFileSync(join(dir, "visual-baselines/c.json"), '{"c":3}\n');
            writeFileSync(join(dir, "d.png"), Buffer.from([0x89, 0x50, 0x4e, 0x47, 0, 1, 2]));
            git("add", ".");
            writeFileSync(join(dir, "b.ts"), "const  y = {b:2}\nconst z = 3;\n");
            const r = spawnSync(formatStaged, { cwd: dir, env, encoding: "utf8" });
            assert.equal(r.status, 0, r.stderr);
            assert.equal(staged(git, "a.ts"), "const x = { a: 1 };\n");
            assert.equal(readFileSync(join(dir, "a.ts"), "utf8"), "const x = { a: 1 };\n");
            assert.equal(staged(git, "b.ts"), "const  y = {b:2}\n");
            assert.match(r.stdout, /not formatting b\.ts/);
            assert.equal(staged(git, "visual-baselines/c.json"), '{"c":3}\n');
            // Byte-identical on disk, and (the diff check below) in the index.
            assert.deepEqual(readFileSync(join(dir, "d.png")), Buffer.from([0x89, 0x50, 0x4e, 0x47, 0, 1, 2]));
            assert.equal(git("diff", "--quiet").status, 1, "only b.ts differs from the index");
            assert.equal(git("diff", "--name-only").stdout, "b.ts\n");
        });
    });

    it("a pathspec commit (git commit <file>) leaves the real index formatted too", () => {
        inRepo((dir, git) => {
            git("config", "user.email", "t@t");
            git("config", "user.name", "t");
            git("config", "commit.gpgsign", "false");
            writeFileSync(join(dir, ".git/hooks/pre-commit"), `#!/bin/sh\nexec ${formatStaged}\n`, { mode: 0o755 });
            writeFileSync(join(dir, "a.ts"), "const a = 1;\n");
            git("add", "a.ts");
            assert.equal(git("commit", "-qm", "init").status, 0);
            writeFileSync(join(dir, "a.ts"), "const  b = {b:2}\n");
            const r = git("commit", "-qm", "only", "a.ts");
            assert.equal(r.status, 0, r.stderr);
            assert.equal(git("show", "HEAD:a.ts").stdout, "const b = { b: 2 };\n");
            assert.equal(staged(git, "a.ts"), "const b = { b: 2 };\n");
            assert.equal(git("status", "--short").stdout, "");
        });
    });

    it("formats nothing while a merge is being committed", () => {
        inRepo((dir, git) => {
            writeFileSync(join(dir, "a.ts"), "const  x = {a:1}\n");
            git("add", ".");
            writeFileSync(join(dir, ".git/MERGE_HEAD"), "0".repeat(40) + "\n");
            assert.equal(spawnSync(formatStaged, { cwd: dir, env }).status, 0);
            assert.equal(staged(git, "a.ts"), "const  x = {a:1}\n");
        });
    });

    it("pre-push runs the source-only checks before the build and stops at the first failure", () => {
        const prepush = repoFile("tools/prepush.sh");
        const at = (s) => {
            const i = prepush.indexOf(s);
            assert.ok(i > 0, `${s} is in tools/prepush.sh`);
            return i;
        };
        const build = at('run_step "Build"');
        assert.ok(at("PROJECTS=$(") < build);
        for (const step of ["Formatting (changed files)", "ESLint root config", "Legacy graph API use", "Links"]) {
            assert.ok(
                at(`run_step "${step}"`) < at("PROJECTS=$("),
                `${step} runs before the affected list and the build`,
            );
        }
        const runStep = prepush.slice(at("run_step() {"), prepush.indexOf("\n}\n", at("run_step() {")) + 3);
        const r = spawnSync("bash", ["-c", `${runStep}\nrun_step one false\nrun_step two "echo SECOND"`], {
            encoding: "utf8",
        });
        assert.equal(r.status, 1);
        assert.match(r.stdout, /stopped at the first failure: one/);
        assert.doesNotMatch(r.stdout, /SECOND/);
    });
});
