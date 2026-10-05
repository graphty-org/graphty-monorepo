// Tests of the CI shape: the test matrix's shard groups (tools/ci-test-matrix.mjs), the parts of
// ci.yml and pr-title.yml that decide what a draft, a pull request and a merge-queue run do, the
// release train (release.yml, tools/release-diff.mjs, deploy-pages.yml, .mergify.yml's release
// rule), and the record tools/pr-status-broker.mjs writes for agents.
//
//   node tools/ci-workflows.test.mjs   (pnpm run test:ci-workflows)
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
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
    const next = text.slice(start + 1).search(/\n {4}[a-z-]+:\n/);
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
        const gpu = workflow("gpu.yml");
        assert.match(gpu, /pull_request: \{ types: \[opened, synchronize, reopened, ready_for_review\] \}/);
        assert.match(
            job(gpu, "decide"),
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
        const APT = /--with-deps|install-deps|install-browser|apt-get|playwright-system-deps/;
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

describe("Playwright's system packages", () => {
    // apt ran on every browser job (15 s median, 30 s mean); now the .deb files apt chose are cached per
    // runner image and Playwright version, and a hit runs only dpkg. Covers the test job and the visual
    // job; visual-seed.yml (dispatched by hand) still runs `visual-review install-browser`.
    const actionDir = new URL("../.github/actions/playwright-system-deps/", import.meta.url);
    const action = readFileSync(new URL("action.yml", actionDir), "utf8");
    const script = new URL("install.sh", actionDir).pathname;

    it("keys the cache on the runner image and the Playwright version", () => {
        assert.match(
            action,
            /key=playwright-debs-\$\{ImageOS:\?\}-\$\{ImageVersion:\?\}-\$\(pnpm exec playwright --version/,
        );
        assert.match(action, /path: ~\/\.cache\/playwright-debs/);
        assert.match(action, /run: '"\$GITHUB_ACTION_PATH\/install\.sh"'\n/);
    });

    it("installs through the action in ci.yml's test and visual jobs, never with apt directly", () => {
        const ci = workflow("ci.yml").replace(/^\s*#.*$/gm, "");
        const test = job(ci, "test");
        assert.doesNotMatch(test, /--with-deps|install-deps/);
        assert.match(test, /if: matrix\.needs-browser\n\s+uses: \.\/\.github\/actions\/playwright-system-deps\n/);
        assert.match(test, /run: pnpm exec playwright install chromium\n/);
        const visual = job(ci, "visual");
        assert.doesNotMatch(visual, /--with-deps|install-deps|install-browser/);
        assert.match(
            visual,
            /uses: \.\/\.github\/actions\/playwright-system-deps\n\s+with:\n\s+working-directory: visual-review\n/,
        );
        assert.match(visual, /working-directory: visual-review\n\s+run: pnpm exec playwright install chromium\n/);
    });

    // Runs install.sh against a fake apt: sudo logs its arguments (and really runs rm), pnpm answers
    // the dry run with PKGS and the install by writing DOWNLOADS into the archive directory, and
    // dpkg-query reports the packages named in INSTALLED as installed.
    const run = ({ hit, cached = [], stale = [], downloads = [], aptSays = "", installed = "a b" }) => {
        const home = mkdtempSync(join(tmpdir(), "pw-debs-"));
        const bin = join(home, "bin");
        const debs = join(home, "debs");
        const archives = join(home, "archives");
        for (const d of [bin, debs, archives]) mkdirSync(d);
        for (const d of cached) writeFileSync(join(debs, d), "");
        for (const d of stale) writeFileSync(join(archives, d), "");
        const stub = (name, body) => writeFileSync(join(bin, name), `#!/bin/bash\n${body}\n`, { mode: 0o755 });
        stub("sudo", `echo "$*" >> "${home}/calls"; case "$1" in rm) exec "$@";; tee) cat >/dev/null;; esac`);
        stub(
            "pnpm",
            `echo "pnpm $*" >> "${home}/calls"
if [ "$4" = --dry-run ]; then echo 'sudo -- sh -c "apt-get update&& apt-get install -y --no-install-recommends a b"'; exit; fi
for d in ${downloads.join(" ")}; do touch "${archives}/$d"; done
echo "${aptSays}"`,
        );
        stub(
            "dpkg-query",
            `rc=0; for p in "\${@:3}"; do case " ${installed} " in *" $p "*) echo "ii  $p";; *) echo "dpkg-query: no packages found matching $p" >&2; rc=1;; esac; done; exit $rc`,
        );
        const r = spawnSync("bash", [script], {
            encoding: "utf8",
            env: {
                ...process.env,
                HIT: hit,
                PLAYWRIGHT_DEBS: debs,
                APT_ARCHIVES: archives,
                PATH: `${bin}:${process.env.PATH}`,
            },
        });
        let calls = "";
        try {
            calls = readFileSync(join(home, "calls"), "utf8");
        } catch {
            // nothing was called
        }
        return { ...r, calls, cache: readdirSync(debs).sort() };
    };

    it("on a hit installs exactly the cached files with dpkg and never runs apt", () => {
        const r = run({ hit: "true", cached: ["a.deb", "b.deb"] });
        assert.equal(r.status, 0, r.stdout + r.stderr);
        assert.match(r.calls, /^dpkg -i \S+\/a\.deb \S+\/b\.deb\n/m);
        assert.doesNotMatch(r.calls, /install-deps chromium/);
        assert.match(r.stdout, /All 2 packages Chromium needs are installed/);
    });

    it("on a hit fails when the cache left a package Chromium needs uninstalled", () => {
        const r = run({ hit: "true", cached: ["a.deb"], installed: "a" });
        assert.equal(r.status, 1);
        assert.match(r.stdout, /::error::Chromium's system packages are not all installed/);
        assert.match(r.stdout, /no packages found matching b/);
    });

    it("on a miss clears apt's old downloads, installs with apt and caches only what apt downloaded", () => {
        const r = run({
            hit: "",
            stale: ["old.deb"],
            downloads: ["a.deb", "b.deb"],
            aptSays: "0 upgraded, 2 newly installed",
        });
        assert.equal(r.status, 0, r.stdout + r.stderr);
        assert.match(r.calls, /^tee \/etc\/apt\/apt\.conf\.d\/99keep-downloaded-packages\n/m);
        assert.match(r.calls, /^rm -f \S+\/archives\/old\.deb\n/m);
        assert.match(r.calls, /^pnpm exec playwright install-deps chromium\n/m);
        assert.deepEqual(r.cache, ["a.deb", "b.deb"]);
    });

    it("on a miss fails when apt installed packages but kept none of the files", () => {
        const r = run({ hit: "", aptSays: "0 upgraded, 2 newly installed" });
        assert.equal(r.status, 1);
        assert.match(r.stdout, /::error::apt installed packages but kept no \.deb files/);
    });

    it("on a miss with everything already installed caches nothing and passes", () => {
        const r = run({ hit: "", aptSays: "0 upgraded, 0 newly installed, 0 to remove and 1 not upgraded." });
        assert.equal(r.status, 0, r.stdout + r.stderr);
        assert.deepEqual(r.cache, []);
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

    it("runs on ready pull requests and master, never on a label or a schedule, and never cancels a paid run", () => {
        assert.match(gpu, /pull_request: \{ types: \[opened, synchronize, reopened, ready_for_review\] \}/);
        // the nightly is off until the owner turns it on (spot on hold, issue #1003): no live schedule, no spot
        assert.doesNotMatch(gpu, /^ {4}schedule:/m);
        assert.doesNotMatch(gpu, /labeled/);
        assert.match(gpu, /cancel-in-progress: false/);
        assert.doesNotMatch(job(gpu, "test-gpu"), /tenancy=spot/);
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

describe("release.yml", () => {
    const release = workflow("release.yml");
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
        assert.match(train, /if: \$\{\{ github.event_name != 'push' && github.ref == 'refs\/heads\/master' \}\}/);
        assert.match(train, /case "\$ci" in \*" completed success"\) ;; \*\) continue ;; esac/);
        assert.match(train, /case "\$gpu" in \*" completed success"\) ;; \*\) continue ;; esac/);
        assert.match(train, /case "\$hosts" in "" \| \*" completed success"\) ;; \*\) continue ;; esac/);
        assert.match(train, /is still open; it must merge or close first/);
        assert.match(train, /node tools\/release-hold.mjs apply --only "\$PACKAGES"/);
        assert.match(train, /node tools\/release-diff.mjs "\$SHA" "\$COMMIT"/);
        assert.match(train, /--label priority:critical/);
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
