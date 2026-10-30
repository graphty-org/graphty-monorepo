// Tests of the CI shape: the test matrix's shard groups (tools/ci-test-matrix.mjs), the parts of
// ci.yml and pr-title.yml that decide what a draft, a pull request and a merge-queue run do, verification of
// golden in CI (golden-verify.yml calling ci.yml), the
// release train (release.yml, tools/release-diff.mjs, deploy-pages.yml), the record tools/pr-status-broker.mjs writes for agents, the local commit and push hooks
// (.husky/pre-commit, tools/format-staged.sh, tools/prepush.sh), and the warning period of new
// required checks (tools/ci-advisory-checks.json).
//
//   node tools/ci-workflows.test.mjs   (pnpm run test:ci-workflows)
import assert from "node:assert/strict";
import { execFileSync, spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
    copyFileSync,
    existsSync,
    mkdirSync,
    mkdtempSync,
    readdirSync,
    readFileSync,
    rmSync,
    truncateSync,
    writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, describe, it } from "node:test";

import { parse as parseYaml } from "yaml";

import {
    ciCommand,
    GROUPS,
    groupEntry,
    parseOnly,
    plan,
    SHARDS,
    storiesPlan,
    STORY_SHARDS,
} from "./ci-test-matrix.mjs";
import { isolateGit } from "./isolated-git-env.mjs";
import {
    closeStaleReverts,
    decide,
    examineRed,
    fileIssue,
    FREEZE_PREFIX,
    frozenSha,
    mergedPrs,
    revertBody,
    revertTitle,
    superseded,
} from "./master-guard.mjs";
import { linksIssue, skipReason } from "./pr-issue-link.mjs";
import { summarize } from "./pr-status-broker.mjs";
import {
    fingerprint,
    inputKey,
    outputHash,
    partitionByPasses,
    passStore,
    related,
    testsPassed,
} from "./prepush-inputs.mjs";
import { byFailureRate, failureRates, gateShards, localShards, shardEnv, startRule } from "./prepush-tests.mjs";
import {
    buildNotReusable,
    decide as reuseDecide,
    excludedPaths,
    marker,
    notPassed,
    STORYBOOKS,
    treeWithout,
} from "./ci-reuse-plan.mjs";
import {
    cancelNote as releaseCancelNote,
    due as releaseDue,
    fixForwardDispatch as releaseFixForwardDispatch,
    fixForwardMerges as releaseFixForwardMerges,
    fixForwardDue as releaseFixForwardDue,
    lastGreenBuild,
    resumesDue as releaseResumesDue,
    toCancel as releaseToCancel,
} from "./release-due.mjs";
import { rerunnable } from "./release-rerun.mjs";
import { reportsFailure as releaseReportsFailure } from "./release-status.mjs";
import { strayChanges } from "./release-diff.mjs";
import { changedFiles, skippedProjects } from "./visual-capture-plan.mjs";

// The temporary directories this file makes go inside this one, removed when the file finishes.
const TMP = mkdtempSync(join(tmpdir(), "ci-workflows-"));
after(() => rmSync(TMP, { recursive: true, force: true }));

// Every git process below (and in the scripts the hook tests run) runs without the developer's own
// config: a commit there must never reach their signing key.
isolateGit();

const PUSHOVER_SECRETS = ["secrets.PUSHOVER_APP_TOKEN", "secrets.PUSHOVER_USER_KEY"];
// The caller's environment without the gate's own settings (PREPUSH_RERUN_ALL,
// PREPUSH_ROOT): a push made with one of them runs these tests in its gate with it still set.
const withoutPrepushSettings = () =>
    Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith("PREPUSH_")));
const workflow = (name) => readFileSync(new URL(`../.github/workflows/${name}`, import.meta.url), "utf8");
const job = (text, name) => {
    const start = text.indexOf(`\n    ${name}:\n`);
    assert.ok(start > 0, `job ${name} exists`);
    const next = text.slice(start + 1).search(/\n {4}[a-z0-9_-]+:\n/);
    return next === -1 ? text.slice(start) : text.slice(start, start + 1 + next);
};
const PACKAGES = [...new Set(SHARDS.map((s) => s.package))];
const QUEUE =
    "startsWith(github.head_ref, 'mergify/merge-queue/') && github.event.pull_request.head.repo.full_name == github.repository && github.event.pull_request.user.login == 'mergify[bot]'";

describe("the test matrix", () => {
    it("runs every shard exactly once on a full run, in 25 jobs", () => {
        const include = plan(PACKAGES);
        const ran = include.flatMap((e) => (e.shard in GROUPS ? GROUPS[e.shard] : [e.shard]));
        assert.deepEqual([...ran].sort(), SHARDS.map((s) => s.shard).sort());
        assert.equal(include.length, 25);
    });

    // A shard's nx target can depend on builds (cytoscape-extensions:coverage dependsOn ^build), and
    // running them would rewrite another package's dist while the shards beside it read it (#2858).
    it("never lets a shard's nx command rebuild what the Build step built", () => {
        const nx = SHARDS.filter((s) => /\bnx run\b/.test(s["test-command"]));
        assert.ok(nx.length > 0);
        for (const s of nx) assert.match(s["test-command"], /--exclude-task-dependencies\b/, s.shard);
    });

    it("puts only the affected members into a group's job", () => {
        // graph-samples has one shard, a member of small-node (graph-io also has a browser shard)
        const include = plan(["graph-samples"]);
        assert.equal(include.length, 1);
        assert.equal(include[0].shard, "small-node");
        assert.match(include[0]["test-command"], /graph-samples:coverage/);
        assert.doesNotMatch(include[0]["test-command"], /graph-format:coverage/);
        assert.equal(include[0].coverage, "graph-samples=graph-samples/coverage/lcov.info");
    });

    it("leaves out the groups and shards of unaffected packages", () => {
        assert.deepEqual(plan([]), []);
        assert.deepEqual(
            plan(["graphty-element"]).map((e) => e.shard),
            SHARDS.filter((s) => s.package === "graphty-element").map((s) => s.shard),
        );
    });

    it("uploads coverage for every member that writes it", () => {
        const browser = plan(PACKAGES).find((e) => e.shard === "small-browser");
        assert.doesNotMatch(browser.coverage, /webgpu-graph-algorithms-browser|graphty-storybook/);
        assert.match(browser.coverage, /visual-review=visual-review\/coverage\/lcov.info/);
        assert.match(browser.coverage, /^algorithms-browser=algorithms\/coverage\/lcov.info /);
        assert.equal(browser["needs-browser"], true);
    });

    it("runs every shard, alone or in a group, through the quarantine wrapper with its own command", () => {
        const include = plan(PACKAGES);
        const wrapped = (shard) => ciCommand(SHARDS.find((s) => s.shard === shard));
        for (const e of include) {
            const members = e.shard in GROUPS ? GROUPS[e.shard] : [e.shard];
            for (const m of members) assert.ok(e["test-command"].includes(wrapped(m)), m);
        }
        // The wrapper gets back exactly the shard's command, quotes and all.
        const graphty = SHARDS.find((s) => s.shard === "graphty-1");
        const r = spawnSync(
            "bash",
            ["-c", ciCommand(graphty).replace(/^node tools\/results\/run-group\.mjs graphty-1 /, "printf %s ")],
            {
                encoding: "utf8",
            },
        );
        assert.equal(r.stdout, graphty["test-command"]);
    });

    // A shard with a job of its own uploads its report through the group's steps, under the same
    // coverage-<shard> name; graphty-element and webgpu-graph-algorithms have upload steps of their own.
    it("uploads coverage for every shard with a job of its own that writes it", () => {
        const own = Object.fromEntries(plan(PACKAGES).map((e) => [e.shard, e.coverage]));
        // the five graphty parts keep their reports apart
        for (const n of [1, 2, 3, 4, 5]) {
            assert.equal(own[`graphty-${n}`], `graphty-${n}=graphty/.coverage-parts/graphty-${n}/lcov.info`);
        }
        assert.equal(own["graph-io"], "graph-io=graph-io/coverage/lcov.info");
        assert.equal(own["graphty-storybook"], undefined);
        assert.equal(own["graphty-element-default"], undefined);
        assert.equal(own["webgpu-graph-algorithms-node"], undefined);
    });

    // graph-io-storybook's fidelity stories decode the oracles' PNGs, Git LFS objects; a pointer file fails to
    // decode and every story errors (#4989). The test job pulls a matrix entry's "lfs" (see ci.yml below).
    it("names the Git LFS files a shard reads, alone, in its group and in a light-check bin", () => {
        const oracles = "graph-io/test/fidelity/oracles/*.png";
        assert.equal(SHARDS.find((s) => s.shard === "graph-io-storybook").lfs, oracles);
        assert.equal(plan(PACKAGES).find((e) => e.shard === "small-browser").lfs, oracles);
        assert.equal(plan(["graph-samples"])[0].lfs, "", "a group whose members read no LFS file pulls none");
        const bin = { name: "graph-io-storybook-1", shard: "graph-io-storybook", command: "true", files: [] };
        assert.equal(plan(["graph-io"], undefined, { bins: [bin] }).find((e) => e.shard === bin.name).lfs, oracles);
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

describe("the pre-push gate matches CI", () => {
    const tool = (name) => readFileSync(new URL(name, import.meta.url), "utf8");
    // A script without its comment lines, so prose about a command is not mistaken for running it.
    const code = (text) => text.replace(/^\s*#.*$/gm, "");
    // The shards one CI matrix runs: a group job runs its members, named by its `echo "==> <shard>"` lines.
    const ciShards = (affected) =>
        plan(affected).flatMap((e) =>
            e.shard in GROUPS ? [...e["test-command"].matchAll(/echo "==> ([^"]+)"/g)].map((m) => m[1]) : [e.shard],
        );

    it("runs exactly the shards CI runs, for every affected set", () => {
        const sets = [[], PACKAGES, ...PACKAGES.map((p) => [p]), ["@graphty/remote-logger", "graph-io"]];
        for (const affected of sets) {
            const local = localShards(affected).map((s) => s.shard);
            assert.deepEqual([...local].sort(), ciShards(affected.map((p) => p.replace(/^@graphty\//, ""))).sort());
            for (const s of localShards(affected)) {
                assert.equal(
                    s,
                    SHARDS.find((x) => x.shard === s.shard),
                    "with CI's own entry, so CI's command",
                );
            }
        }
    });

    it("never writes core dumps, and passes Formatting with one in the tree (#2617)", () => {
        const prepush = code(tool("prepush.sh"));
        const limit = prepush.indexOf("\nulimit -c 0\n");
        assert.ok(limit > 0 && limit < prepush.indexOf("prepush-source-checks.sh"), "ulimit -c 0 before every step");
        // prettier reads the root .gitignore; a sparse 3 GiB dump costs no disk.
        const dir = mkdtempSync(join(TMP, "core-dump-"));
        writeFileSync(join(dir, ".gitignore"), readFileSync(new URL("../.gitignore", import.meta.url)));
        writeFileSync(join(dir, "ok.js"), "export const a = 1;\n");
        for (const name of ["core", "core.2406307"]) {
            writeFileSync(join(dir, name), "");
            truncateSync(join(dir, name), 3 * 1024 ** 3);
        }
        const prettier = new URL("../node_modules/.bin/prettier", import.meta.url).pathname;
        const run = spawnSync(prettier, ["--check", "."], { cwd: dir, encoding: "utf8" });
        assert.equal(run.status, 0, run.stdout + run.stderr);
    });

    it("tests through tools/prepush-tests.mjs only, on CI's affected set", () => {
        const prepush = code(tool("prepush.sh"));
        assert.match(prepush, /nx show projects --affected --base="\$BASE" --head=HEAD --json/);
        assert.match(
            prepush,
            /bg_step "[^"]+" \\\n\s+"PREPUSH_ROOT='\$ROOT_DIR' node '\$SCRIPT_DIR\/prepush-tests.mjs' '\$PROJECTS' '\$\{BASE:-\}'[;"]/,
        );
        // The shards start right after the build, before the static checks they run beside.
        const testsAt = prepush.indexOf('bg_step "Tests');
        assert.ok(testsAt > prepush.indexOf('run_step "Build"'), "after the build");
        assert.ok(testsAt < prepush.indexOf('run_step "Knip (dead code detection)"'), "before Knip and Lint");
        assert.ok(prepush.indexOf("\nbg_wait\n") > prepush.indexOf('run_step "Public API report'), "read after them");
        // No wall-clock limit on the stage: it would count the time shards wait for slots other gates hold
        // (2026-10-17: a push whose every shard passed failed at 90 minutes). No limit on a shard either
        // (the owner's no-arbitrary-timeouts rule): a 30-minute shard clock failed tier 3's graphty shard
        // under load while its tests still ran. A hung test is ended by vitest's one hang guard.
        assert.doesNotMatch(prepush, /timeout[^\n]*prepush-tests\.mjs/);
        assert.doesNotMatch(code(tool("prepush-tests.mjs")), /"timeout"|PREPUSH_SHARD_TIMEOUT/);
        assert.match(
            code(tool("prepush-tests.mjs")),
            // a run of selected files (PREPUSH_SELECT=1) goes through run-tests.sh --command, in the same environment
            // and every shard through the quarantine wrapper, as CI's plan() runs it, inside the shard's test slot
            /const what = shard.selected \? \["--command", shard.shard, shard\["test-command"\]\] : \[shard.shard\];\n(\s+\/\/.*\n)*\s+const shardRun = \["bash", "tools\/run-tests.sh", \.\.\.what\]\.map\(shQuote\)\.join\(" "\);\n\s+const quarantine = \[join\(tools, "test-quarantine.mjs"\), "run", shard.shard, shardRun, "--via-run-tests"\];\n\s+const cmd = \[process.execPath, \.\.\.quarantine\];\n\s+cmd.unshift\(process.execPath, join\(tools, "test-slots.mjs"\)\);/,
        );
        // No test command of its own, which could drift from CI's -- but the NVIDIA run, which CI has none of.
        const nvidia = /\n {4}setsid bash -c "cd webgpu-graph-algorithms && .*\n/;
        assert.match(prepush, nvidia);
        assert.doesNotMatch(
            prepush.replace(nvidia, "\n"),
            /vitest|test:run|test:prepush|nx run-many -t test|:coverage/,
        );
        const ci = workflow("ci.yml");
        assert.match(job(ci, "packages"), /node tools\/ci-test-matrix.mjs "\$all" "\$affected"/);
        assert.match(job(ci, "test"), /run: \$\{\{ matrix.test-command \}\}/);
    });

    describe("each shard's local policy", () => {
        const element = localShards(["graphty-element"]);
        const long = element.filter((s) => s.local === "when-paths-change").map((s) => s.shard);
        // What vitest answers for each shard, made up: one test file per shard, the shared setup file.
        const triggersOf = (s) => ({
            specs: new Set([`graphty-element/test/${s.shard}.test.ts`]),
            config: ["graphty-element/vitest.config.ts", "graphty-element/test/setup.ts", ...(s["local-paths"] ?? [])],
        });
        const run = (changed) => gateShards(element, changed, triggersOf).map((s) => s.shard);

        it("is always, when-paths-change or never, and CI runs every shard whatever it is", () => {
            for (const s of SHARDS) {
                assert.ok([undefined, "always", "when-paths-change", "never"].includes(s.local), s.shard);
            }
            assert.deepEqual(long.sort(), [
                ...[1, 2, 3, 4, 5].map((n) => `graphty-element-browser-${n}`),
                ...[1, 2, 3, 4, 5].map((n) => `graphty-element-storybook-${n}`),
            ]);
            const ci = plan(["graphty-element"]).map((e) => e.shard);
            for (const shard of long) {
                assert.ok(ci.includes(shard), `CI runs ${shard}`);
            }
        });

        it("skips graphty-element's long shards for a change none of them tests", () => {
            assert.deepEqual(run(["graphty-element/src/Graph.ts", "graphty/src/App.tsx"]), ["graphty-element-default"]);
            assert.deepEqual(run([]), ["graphty-element-default"]);
        });

        it("runs the one shard whose test file changed", () => {
            assert.deepEqual(run(["graphty-element/test/graphty-element-browser-3.test.ts"]).sort(), [
                "graphty-element-browser-3",
                "graphty-element-default",
            ]);
            // A story is a test file of one storybook shard, though it sits under stories/, a local path
            // of every storybook shard.
            const story = "graphty-element/stories/Data.stories.ts";
            const withStory = (s) => {
                const t = triggersOf(s);
                return s.shard === "graphty-element-storybook-2" ? { ...t, specs: new Set([story]) } : t;
            };
            assert.deepEqual(
                gateShards(element, [story], withStory)
                    .map((s) => s.shard)
                    .sort(),
                ["graphty-element-default", "graphty-element-storybook-2"],
            );
        });

        it("runs every shard of a family when its config, setup or a local path changes", () => {
            const browsers = long.filter((n) => n.includes("browser"));
            const stories = long.filter((n) => n.includes("storybook"));
            assert.deepEqual(
                run(["graphty-element/test/setup.ts"]).sort(),
                [...long, "graphty-element-default"].sort(),
            );
            assert.deepEqual(
                run(["graphty-element/test/helpers/graph.ts"]).sort(),
                [...browsers, "graphty-element-default"].sort(),
            );
            assert.deepEqual(
                run(["graphty-element/.storybook/main.ts"]).sort(),
                [...stories, "graphty-element-default"].sort(),
            );
        });

        it("runs every shard but a never one when there is nothing to compare with (PREPUSH_ALL=1)", () => {
            assert.deepEqual(
                gateShards(element, null, null),
                element.filter((s) => s.local !== "never"),
            );
            const never = { ...element[0], local: "never" };
            assert.deepEqual(gateShards([never, element[1]], null, null), [element[1]]);
        });
    });

    it("runs each shard in CI's environment, moving only where a shared package writes its coverage", () => {
        assert.match(code(tool("run-tests.sh")), /\n\s+export CI=true\n/);
        // The runner's fonts, which visual-fonts/ is a snapshot of: this machine has no emoji font.
        assert.match(code(tool("run-tests.sh")), /export FONTCONFIG_FILE="\$ROOT\/visual-fonts\/fonts.conf"/);
        assert.match(code(tool("prepush-tests.mjs")), /"bash", "tools\/run-tests.sh", \.\.\.what/);
        for (const s of SHARDS) {
            // A shard that names its own COVERAGE_DIR (webgpu-graph-algorithms' device-error pass) writes
            // where no other shard does.
            const shared = SHARDS.filter(
                (x) =>
                    x.package === s.package &&
                    / --coverage/.test(x["test-command"]) &&
                    !/COVERAGE_DIR=/.test(x["test-command"]),
            );
            assert.deepEqual(
                shardEnv(s),
                {
                    GRAPHTY_TEST_SHARD: s.shard,
                    ...(shared.length > 1 ? { COVERAGE_DIR: `.coverage-parts/${s.shard}` } : {}),
                },
                s.shard,
            );
        }
    });

    // A copy of the runner beside a fake matrix and a fake run-tests.sh, in a throwaway repository. `shards` names
    // the shards as [shard, package]; `setup(dir, git)` may commit before the run (the repository has no commit).
    const STAGE_FILES = [
        "prepush-tests.mjs",
        // The runner wraps every shard in the machine-wide test slot (it imports the wait log beside it).
        "test-slots.mjs",
        "wait-log.mjs",
        "prepush-inputs.mjs",
        "push-base.mjs",
        "shard-verdict.mjs",
        // and the advisory test selector it starts beside the shards
        "test-select.mjs",
        "test-select-rules.json",
        // the quarantine wrapper every shard runs through, and the ledger it reads JUnit with
        "test-quarantine.mjs",
        // the test ledger, and the scratch worktree a land check re-runs a failure on golden's tip in
        "test-ledger.mjs",
        "land.mjs",
        "branch-note.mjs",
        "ship-risks.mjs",
    ];
    const runStage = (runTests, env = {}, opts = {}) => {
        const { shards = [["broken"], ["slow"]], setup } = opts;
        const dir = mkdtempSync(join(tmpdir(), "prepush-tests-"));
        try {
            mkdirSync(join(dir, "tools"));
            for (const f of STAGE_FILES) copyFileSync(new URL(`./${f}`, import.meta.url), join(dir, "tools", f));
            const shard = ([name, pkg = name]) => ({
                shard: name,
                package: pkg,
                "test-command": "true",
                "needs-browser": false,
            });
            writeFileSync(
                join(dir, "tools/ci-test-matrix.mjs"),
                `export const SHARDS = ${JSON.stringify(shards.map(shard))};\n`,
            );
            writeFileSync(join(dir, "tools/run-tests.sh"), runTests);
            const git = (...args) => spawnSync("git", args, { cwd: dir, encoding: "utf8" });
            assert.equal(git("init", "-q", "-b", "golden").status, 0);
            setup?.(dir, git);
            const packages = JSON.stringify([...new Set(shards.map(([n, p = n]) => p))]);
            return spawnSync(process.execPath, ["tools/prepush-tests.mjs", packages], {
                cwd: dir,
                encoding: "utf8",
                env: {
                    ...withoutPrepushSettings(),
                    // bin/ holds a fake gh when a test needs one
                    PATH: `${join(dir, "bin")}:${process.env.PATH}`,
                    GRAPHTY_TEST_SLOTS_DIR: join(dir, "tmp/test-slots"),
                    GRAPHTY_TEST_SLOTS: "2",
                    GRAPHTY_TEST_SLOT_HELD: "",
                    TEST_LEDGER_DIR: join(dir, "tmp/test-ledger"),
                    ...env,
                },
            });
        } finally {
            rmSync(dir, { recursive: true, force: true });
        }
    };
    const SUMMARY = "echo ' Test Files  1 passed (1)'; echo '      Tests  1 passed (1)'";

    it("ends non-zero when a shard fails, even after its log stream ended and while another shard runs", () => {
        // "broken" closes its output (so the log stream has finished) and then fails; "slow" is still running then
        // and is stopped. The stopped shard closing last must still end the stage.
        const run = runStage(
            'if [ "$1" = broken ]; then echo broken output; exec >&- 2>&-; sleep 1; exit 1; fi\nexec sleep 60\n',
        );
        assert.match(run.stdout, /\[FAIL\] broken \(exit 1/);
        assert.match(run.stdout, /Stopped after broken failed/);
        assert.equal(run.status, 1, run.stdout + run.stderr);
    });

    it("runs every shard to the end under PREPUSH_ALL=1 (verification), so one failure cannot hide another", () => {
        const run = runStage(`if [ "$1" = broken ]; then exit 1; fi\n${SUMMARY}\n`, { PREPUSH_ALL: "1" });
        assert.match(run.stdout, /\[PASS\] slow/);
        assert.match(run.stdout, /Failed: broken/);
        assert.equal(run.status, 1, run.stdout + run.stderr);
        // and when the failed shard is its package's warm-up, the rest of the package still runs
        const same = runStage(
            `if [ "$1" = a-1 ]; then exit 1; fi\n${SUMMARY}\n`,
            { PREPUSH_ALL: "1" },
            {
                shards: [
                    ["a-1", "a"],
                    ["a-2", "a"],
                ],
            },
        );
        assert.match(same.stdout, /\[PASS\] a-2/);
        assert.match(same.stdout, /Failed: a-1/);
        assert.equal(same.status, 1, same.stdout + same.stderr);
    });

    // A land check whose shard "broken" fails with test a.test.ts > t: HEAD is `land: b`, HEAD^1 golden's tip
    // (origin/golden), on which the same fake run-tests.sh fails the same test the same way. A fake gh files #7.
    const landedRepo = (dir, git) => {
        writeFileSync(join(dir, ".gitignore"), "tmp/\ntest-results/\n.worktrees/\nbin/\n");
        mkdirSync(join(dir, "bin"));
        writeFileSync(join(dir, "bin/gh"), "#!/bin/sh\necho https://github.com/o/r/issues/7\n", { mode: 0o755 });
        git("add", ".");
        git("commit", "-q", "-m", "golden's tip");
        git("update-ref", "refs/remotes/origin/golden", "HEAD");
        git("checkout", "-q", "-b", "b");
        writeFileSync(join(dir, "other.txt"), "x");
        git("add", ".");
        git("commit", "-q", "-m", "a change");
        git("checkout", "-q", "golden");
        git("merge", "-q", "--no-ff", "-m", "land: b", "b");
    };
    const failsWith = (message) =>
        [
            'if [ "$1" = --command ]; then shift; fi',
            `if [ "$1" = broken ]; then mkdir -p test-results; printf '<testsuites><testcase classname="a.test.ts" name="t"><failure>${message}</failure></testcase></testsuites>' > "test-results/junit-broken-$TEST_LEDGER_RUN-1.xml"; echo ' Test Files  1 failed (1)'; echo '      Tests  1 failed (1)'; exit 1; fi`,
            SUMMARY,
        ].join("\n");

    it("excuses a land check's failure that golden's tip has too, files its issue, and exits 3", () => {
        const run = runStage(
            failsWith("Error: broken on golden too"),
            { TEST_LEDGER_KIND: "land-check" },
            { setup: landedRepo },
        );
        assert.match(run.stdout, /\[BASE\] broken: running the whole shard on golden's tip/);
        assert.match(run.stdout, /\[KNOWN\] broken: broken\/a\.test\.ts > t fails the same way on golden's tip/);
        assert.match(run.stdout, /\[PASS\] slow/);
        assert.equal(run.status, 3, run.stdout + run.stderr);
    });

    it("records an excused gate as gate-known, which only a land check's push accepts", () => {
        const prepush = code(tool("prepush.sh"));
        assert.match(prepush, /record "gate\$\{KNOWN_FAILURES:\+-known\}" "\$GATE_KEY"/);
        for (const script of [prepush, code(tool("push-queue.sh"))]) {
            assert.match(script, /\[ "\$\{TEST_LEDGER_KIND:-\}" = land-check \] &&\n\s+\w+=\S*\(.*passed gate-known/);
        }
    });

    it("blocks a land check's failure that golden's tip does not have, with no database at all", () => {
        // golden's tip passes: its run-tests.sh is the one committed; the land commit's own fails
        const run = runStage(
            SUMMARY,
            { TEST_LEDGER_KIND: "land-check" },
            {
                setup: (dir, git) => {
                    landedRepo(dir, git);
                    writeFileSync(join(dir, "tools/run-tests.sh"), failsWith("Error: new"));
                },
            },
        );
        assert.match(run.stdout, /\[BASE\] broken/);
        assert.match(run.stdout, /\[FAIL\] broken/);
        assert.equal(run.status, 1, run.stdout + run.stderr);
    });

    it("fails a shard that exits 0 with no vitest run summary in its log", () => {
        // A pnpm older than 10.29.1 reports a pnpm exec killed by a signal as exit 0 (issue #2116).
        const dir = mkdtempSync(join(tmpdir(), "prepush-tests-"));
        try {
            mkdirSync(join(dir, "tools"));
            for (const f of [
                "prepush-tests.mjs",
                "test-slots.mjs",
                "wait-log.mjs",
                "prepush-inputs.mjs",
                "push-base.mjs",
                "shard-verdict.mjs",
                "test-quarantine.mjs",
                "test-ledger.mjs",
                "test-select.mjs",
                "test-select-rules.json",
            ]) {
                copyFileSync(new URL(`./${f}`, import.meta.url), join(dir, "tools", f));
            }
            const shard = (name) => ({ shard: name, package: name, "test-command": "true", "needs-browser": false });
            writeFileSync(
                join(dir, "tools/ci-test-matrix.mjs"),
                `export const SHARDS = ${JSON.stringify([shard("killed")])};\n`,
            );
            writeFileSync(join(dir, "tools/run-tests.sh"), "echo ' RUN  v4'\nexit 0\n");
            assert.equal(spawnSync("git", ["init", "-q"], { cwd: dir }).status, 0);
            const run = spawnSync(process.execPath, ["tools/prepush-tests.mjs", '["killed"]'], {
                cwd: dir,
                encoding: "utf8",
                env: {
                    ...withoutPrepushSettings(),
                    GRAPHTY_TEST_SLOTS_DIR: join(dir, "tmp/test-slots"),
                    GRAPHTY_TEST_SLOTS: "1",
                    GRAPHTY_TEST_SLOT_HELD: "",
                },
            });
            assert.match(run.stdout, /\[FAIL\] killed \(exit 0 but 0 of 1 vitest run summaries/);
            assert.equal(run.status, 1, run.stdout + run.stderr);
        } finally {
            rmSync(dir, { recursive: true, force: true });
        }
    });

    it("starts the shards with the highest failure rate in the test ledger first, else in the usual order", () => {
        const shards = localShards(["graph-format", "graphty", "githerd"]);
        const names = (list) => list.map((s) => s.shard);
        const rates = new Map([
            ["graphty-2", 0.16],
            ["githerd", 0.08],
            ["graph-format", 0],
        ]);
        const ordered = names(byFailureRate(shards, rates));
        assert.deepEqual(ordered.slice(0, 2), ["graphty-2", "githerd"]);
        // The rest keep their order (a stable sort), and so does everything without the ledger.
        const rest = names(shards).filter((n) => !["graphty-2", "githerd"].includes(n));
        assert.deepEqual(ordered.slice(2), rest);
        assert.deepEqual(names(byFailureRate(shards, new Map())), names(shards));
        // The ledger never blocks a push: missing, unopenable or failing, it gives no rates and one line.
        const lines = [];
        assert.equal(failureRates(null, (l) => lines.push(l)).size, 0);
        assert.equal(failureRates({ openLedger: () => ({ why: "no database yet" }) }, (l) => lines.push(l)).size, 0);
        const broken = {
            prepare: () => ({
                all: () => {
                    throw new Error("database is locked");
                },
            }),
            close: () => {},
        };
        assert.equal(failureRates({ openLedger: () => ({ db: broken }) }, (l) => lines.push(l)).size, 0);
        assert.equal(lines.length, 3);
        assert.match(lines[1], /no database yet.*usual order/);
        assert.match(lines[2], /database is locked/);
        const db = { prepare: () => ({ all: () => [{ shard: "graphty-1", rate: 0.18 }] }), close: () => {} };
        assert.deepEqual([...failureRates({ openLedger: () => ({ db }) })], [["graphty-1", 0.18]]);
    });

    it("warms each package's caches one family at a time before the rest of the package starts", () => {
        // What the gate schedules: the shards it runs, never the ones it leaves to CI.
        const shards = gateShards(localShards(["graphty-element", "layout"]), null, null);
        const pick = (n) => shards.find((s) => s.shard === n);
        const canStart = startRule(shards);
        const startable = (running, warmed) =>
            shards.filter((s) => !running.includes(s) && canStart(s, running, new Set(warmed))).map((s) => s.shard);
        // Cold: one warm-up per package (the shortest command of a family), and nothing else.
        assert.deepEqual(startable([], []).sort(), [
            "graphty-element-browser-1",
            "graphty-element-default",
            "graphty-element-storybook-1",
            "layout",
            "layout-storybook",
        ]);
        // While one warm-up of graphty-element runs, no other shard of graphty-element may start.
        assert.deepEqual(startable([pick("graphty-element-browser-1")], []).sort(), ["layout", "layout-storybook"]);
        // A warmed family's siblings still wait for the package's other families.
        const afterBrowser = startable([], ["graphty-element-browser"]);
        assert.ok(!afterBrowser.includes("graphty-element-browser-3"));
        assert.ok(afterBrowser.includes("graphty-element-storybook-1"));
        const all = ["graphty-element-browser", "graphty-element-storybook", "graphty-element-default"];
        assert.equal(startable([pick("graphty-element-browser-1")], all).length, shards.length - 1);
    });

    it("runs webgpu-graph-algorithms on the local NVIDIA GPU beside the CI shards, on the GPU slot, requiring nvidia", () => {
        const prepush = code(tool("prepush.sh"));
        const tests = prepush.indexOf("prepush-tests.mjs' '$PROJECTS'");
        const gpu = prepush.indexOf("--gpu npm run test:run");
        const verdict = prepush.lastIndexOf('wait "$GPU_PGID"');
        assert.ok(gpu > 0 && gpu < tests && verdict > tests, "started before the Tests step, read after it");
        assert.match(
            prepush,
            /\nif affected webgpu-graph-algorithms; then\n[\s\S]*?GRAPHTY_EGL_LIB_DIR[\s\S]*?setsid bash -c "cd webgpu-graph-algorithms && LD_LIBRARY_PATH='\$EGL_LIB_DIR[^']*' GRAPHTY_GPU_REQUIRE=nvidia node '\$SCRIPT_DIR\/test-slots.mjs' --gpu npm run test:run" >"\$GPU_LOG" 2>&1 &\n {4}GPU_PGID=\$!\n/,
        );
        assert.match(
            prepush,
            /cleanup\(\) \{\n {4}bg_kill\n {4}if \[ -n "\$GPU_PGID" \]; then\n {8}kill -- -"\$GPU_PGID"/,
            "the EXIT trap stops it",
        );
        assert.doesNotMatch(prepush, /GRAPHTY_GPU_REQUIRE=any npm run test:run/);
    });

    // The DOCS_API_PACKAGES line and docs_site_affected live in tools/docs-affected.sh, which prepush.sh
    // and check-quick.sh both source; docs_site_step is prepush.sh's. Cut out to run alone.
    const docsAffected = () => {
        assert.match(code(tool("prepush.sh")), /\nsource "\$SCRIPT_DIR\/docs-affected\.sh"\n/, "prepush.sh sources it");
        return code(tool("docs-affected.sh"));
    };
    const docsApiLine = () => docsAffected().match(/\nDOCS_API_PACKAGES=.*\n/)[0];
    const docsSetup = (prepush) => {
        const fn = (text, file, name) => {
            const at = text.indexOf(`\n${name}() {\n`);
            assert.ok(at > 0, `${name} is in tools/${file}`);
            return text.slice(at, text.indexOf("\n}\n", at) + 3);
        };
        return (
            docsApiLine() +
            fn(docsAffected(), "docs-affected.sh", "docs_site_affected") +
            fn(prepush, "prepush.sh", "docs_site_step")
        );
    };

    it("builds the API reference of each affected package that has one, as CI's Docs job does", () => {
        const prepush = code(tool("prepush.sh"));
        const start = prepush.indexOf("for DOCS_PACKAGE in");
        assert.ok(start > prepush.indexOf('run_step "Build"'), "after the build");
        const loop = prepush.slice(start, prepush.indexOf("\ndone\n", start) + 6);
        const run = (list) =>
            spawnSync(
                "bash",
                [
                    "-c",
                    `PROJECT_LIST=${list}\naffected() { echo ",$PROJECT_LIST," | grep -q ",$1,"; }\n` +
                        `run_step() { echo "$2"; }\n${docsApiLine()}${loop}`,
                ],
                { cwd: new URL("..", import.meta.url), encoding: "utf8" },
            ).stdout;
        assert.equal(run("graph-io,graph-format,layout"), "pnpm run docs:api:layout\npnpm run docs:api:graph-io\n");
        assert.equal(run("graph-format"), "");
    });

    it("builds the docs site as CI's Docs job does when a package with an API reference or the docs change", () => {
        // A doc comment that split a code span across two lines left a bare `<value>` tag in a TypeDoc
        // page; only VitePress's Vue compiler rejects that, and it failed CI's Docs job (2026-10-22).
        const prepush = code(tool("prepush.sh"));
        // git is stubbed: it records the pathspec it was asked about and answers "changed" when CHANGED is set.
        const run = (list, changed) =>
            spawnSync(
                "bash",
                [
                    "-c",
                    `PROJECT_LIST=${list}\nBASE=base\nCHANGED=${changed ? 1 : ""}\n` +
                        `affected() { echo ",$PROJECT_LIST," | grep -q ",$1,"; }\n` +
                        `run_step() { echo "$1: $2"; }\n` +
                        `git() { echo "git $*" >&2; [ -z "$CHANGED" ]; }\n${docsSetup(prepush)}docs_site_step`,
                ],
                { cwd: new URL("..", import.meta.url), encoding: "utf8" },
            );
        const site = "node tools/sanitize-api-docs.js && pnpm exec vitepress build docs\n";
        // An affected package with an API reference: only the other packages' pages are generated here.
        assert.equal(
            run("graphty-element,graph-format", false).stdout,
            "Docs site (VitePress build): pnpm run docs:content && pnpm run docs:api:algorithms && " +
                "pnpm run docs:api:layout && pnpm run docs:api:cytoscape-extensions && pnpm run docs:api:graph-io && " +
                site,
        );
        // Only docs changed (no package affected): every package's pages, as CI generates them.
        const docsOnly = run("", true);
        assert.match(docsOnly.stdout, /pnpm run docs:api:graphty-element && pnpm run docs:api:algorithms/);
        assert.ok(docsOnly.stdout.endsWith(site));
        for (const path of [
            " docs/ ",
            " visual-review/docs/ ",
            " graphty-element/docs/ ",
            " tools/copy-docs-content.js ",
        ]) {
            assert.ok(docsOnly.stderr.includes(path), `the docs check looks at${path}`);
        }
        // Neither: no step.
        assert.equal(run("graph-format", false).stdout, "");
        assert.equal(run("", false).stdout, "");
        // After the API docs steps, and on the push that affects no package too.
        const firstExit = prepush.search(/\n\s*exit "\$FAILED"/);
        const calls = [...prepush.matchAll(/\n\s*docs_site_step\n/g)].map((m) => m.index);
        assert.equal(calls.length, 2);
        assert.ok(calls[0] < firstExit && calls[1] > prepush.indexOf("for DOCS_PACKAGE in"));
    });

    it("bounds the screenshot capture and stops it, unpromoted, when the gate stops early", () => {
        const prepush = code(tool("prepush.sh"));
        assert.match(
            prepush,
            /setsid env VISUAL_PREVIEW_TIMEOUT="\$\{PREPUSH_SCREENSHOTS_TIMEOUT:-45m\}" PREPUSH_ROOT="\$ROOT_DIR" "\$SCRIPT_DIR\/visual-preview.sh" --head "\$PUSH_HEAD" /,
        );
        assert.match(prepush, /if wait "\$SCREENSHOTS_PGID"; then[\s\S]*?else[\s\S]*?FAILED=1\n/);
        assert.match(
            prepush,
            /PREPUSH_ROOT="\$ROOT_DIR" "\$SCRIPT_DIR\/visual-preview.sh" --promote "\$PUSH_HEAD" && SCREENSHOTS_STAGED=0\n\s+echo -e "\$\{GREEN\}All pre-push checks passed/,
        );
        // The EXIT trap, run for real: a failed step exits; the capture's process group dies and its
        // staged preview is discarded.
        const fn = prepush.slice(
            prepush.indexOf("cleanup() {"),
            prepush.indexOf("\n}\n", prepush.indexOf("cleanup() {")) + 3,
        );
        const dir = mkdtempSync(join(tmpdir(), "prepush-trap-"));
        try {
            mkdirSync(join(dir, "tools"));
            writeFileSync(join(dir, "tools/visual-preview.sh"), `#!/bin/sh\necho "$@" > ${dir}/called\n`, {
                mode: 0o755,
            });
            const script = `cd ${dir}\nSCRIPT_DIR=${dir}/tools\nROOT_DIR=${dir}\nPUSH_HEAD=abc\n${fn}\ntrap cleanup EXIT\nsetsid bash -c 'timeout 300 sleep 300 & echo $! > ${dir}/inner; wait' &\nSCREENSHOTS_PGID=$!\nuntil [ "$(ps -o pgid= -p $SCREENSHOTS_PGID | tr -d " ")" = $SCREENSHOTS_PGID ] && [ -s ${dir}/inner ]; do sleep 0.05; done\nSCREENSHOTS_STAGED=1\necho $SCREENSHOTS_PGID > ${dir}/pid\nexit 1\n`;
            const r = spawnSync("bash", ["-c", script], { encoding: "utf8" });
            assert.equal(r.status, 1);
            const pid = Number(readFileSync(join(dir, "pid"), "utf8"));
            assert.throws(() => process.kill(pid, 0), "the capture's process group was killed");
            // timeout runs its command in a process group of its own; the session kill reaches it.
            const inner = readFileSync(join(dir, "inner"), "utf8").trim();
            const gone = spawnSync("bash", ["-c", `while kill -0 ${inner} 2>/dev/null; do sleep 0.05; done`]);
            assert.equal(gone.status, 0, "the capture's time-limited step was killed too");
            assert.equal(readFileSync(join(dir, "called"), "utf8"), "--discard abc\n");
        } finally {
            rmSync(dir, { recursive: true, force: true });
        }
    });

    describe("tools/visual-preview.sh --head, against a throwaway repository", () => {
        const realGit = spawnSync("bash", ["-c", "command -v git"], { encoding: "utf8" }).stdout.trim();
        // Stubs for everything outside git: gh finds no pull request, or with STUB_GH_DIR lists pull
        // request 7 at STUB_OLD_HEAD for the first STUB_OLD_TIMES asks and at STUB_NEW_HEAD after
        // (counted in $STUB_GH_DIR/calls); pnpm installs nothing and says project p is affected; node's capture writes a results.json with the story status asked for;
        // every other node command runs; git passes through, except `lfs` and a forced merge-tree exit code.
        const STUBS = {
            gh: `#!/bin/bash
[ -n "$STUB_GH_DIR" ] || exit 0
n=$(( $(cat "$STUB_GH_DIR/calls" 2>/dev/null || echo 0) + 1 )); echo "$n" > "$STUB_GH_DIR/calls"
head="$STUB_NEW_HEAD"
case "$*" in
    *@tsv*) [ "$n" -le "$STUB_OLD_TIMES" ] && head="$STUB_OLD_HEAD"; printf 'open\to/r\to/r\t%s\n' "$head" ;;
    *) echo "$head" ;;
esac
`,
            pnpm: '#!/bin/sh\ncase "$*" in *"show projects"*) echo \'["p"]\';; esac\n',
            node: `#!/bin/bash
if [ "$2" = capture ]; then
    [ -n "$STUB_HANG" ] && exec sleep 300
    [ -n "$STUB_CAPTURES" ] && echo x >> "$STUB_CAPTURES"
    while [ $# -gt 0 ]; do [ "$1" = --out ] && out="$2"; shift; done
    mkdir -p "$out"
    printf '{"complete":true,"items":[{"file":"s.png","status":"%s","reason":"r"}]}' "$STUB_STATUS" > "$out/results.json"
    exit 0
fi
exec ${process.execPath} "$@"
`,
            git: `#!/bin/bash
case " $* " in
    *" lfs "*) exit 0 ;;
    *" merge-tree "*) [ -n "$STUB_MERGE_TREE_RC" ] && exit "$STUB_MERGE_TREE_RC" ;;
    *" fetch "*)
        # A concurrent fetch holding origin/master's ref lock, for the first STUB_FETCH_LOCKED fetches:
        # real git then fails exactly as it does when it loses the race.
        n=$(( $(cat "$2/fetches" 2>/dev/null || echo 0) + 1 )); echo "$n" > "$2/fetches"
        if [ "$n" -le "\${STUB_FETCH_LOCKED:-0}" ]; then
            lock="$2/.git/refs/remotes/origin/master.lock"
            touch "$lock"; ${realGit} "$@"; rc=$?; rm -f "$lock"; exit $rc
        fi ;;
esac
exec ${realGit} "$@"
`,
        };
        const sandbox = async (fn) => {
            const t = mkdtempSync(join(tmpdir(), "visual-preview-"));
            // Without the caller's browser lane (tools/low-priority.sh sets BROWSER_SLOT_PRIORITY=low): the
            // lane tests read the lane the script itself chooses.
            const env = Object.fromEntries(
                Object.entries(process.env).filter(
                    ([k]) => !k.startsWith("GIT_") && k !== "BROWSER_SLOT_PRIORITY" && !k.startsWith("VISUAL_PREVIEW_"),
                ),
            );
            Object.assign(env, {
                PATH: `${t}/bin:${process.env.PATH}`,
                GIT_CONFIG_GLOBAL: "/dev/null",
                GIT_AUTHOR_NAME: "t",
                GIT_AUTHOR_EMAIL: "t@t",
                GIT_COMMITTER_NAME: "t",
                GIT_COMMITTER_EMAIL: "t@t",
            });
            const main = join(t, "main");
            const git = (...a) => {
                const r = spawnSync(realGit, a, { cwd: main, env, encoding: "utf8" });
                assert.equal(r.status, 0, r.stderr);
                return r.stdout.trim();
            };
            try {
                mkdirSync(join(t, "bin"));
                for (const [name, body] of Object.entries(STUBS)) {
                    writeFileSync(join(t, "bin", name), body, { mode: 0o755 });
                }
                spawnSync(realGit, ["init", "-q", "--bare", "-b", "master", join(t, "origin.git")], { env });
                mkdirSync(join(main, "tools"), { recursive: true });
                mkdirSync(join(main, "visual-review/capture"), { recursive: true });
                mkdirSync(join(main, "visual-review/trusted"), { recursive: true });
                copyFileSync(new URL("visual-preview.sh", import.meta.url), join(main, "tools/visual-preview.sh"));
                copyFileSync(
                    new URL("visual-capture-plan.mjs", import.meta.url),
                    join(main, "tools/visual-capture-plan.mjs"),
                );
                writeFileSync(join(main, "visual-review.config.json"), '{"projects":{"p":{"build":"true"}}}\n');
                writeFileSync(join(main, "visual-review/capture/c"), "c\n");
                writeFileSync(join(main, "visual-review/trusted/t"), "t\n");
                writeFileSync(join(main, ".gitignore"), ".env\ntmp/\n.worktrees/\n");
                writeFileSync(join(main, ".env"), "");
                git("init", "-q", "-b", "master");
                git("add", ".");
                git("commit", "-qm", "base", "--no-verify");
                git("remote", "add", "origin", join(t, "origin.git"));
                git("push", "-q", "origin", "master");
                git("checkout", "-qb", "feat");
                writeFileSync(join(main, "b.txt"), "b\n");
                git("add", "b.txt");
                git("commit", "-qm", "feat", "--no-verify");
                const head = git("rev-parse", "HEAD");
                const run = (extra, ...args) =>
                    spawnSync("bash", [join(main, "tools/visual-preview.sh"), ...args], {
                        cwd: main,
                        env: { ...env, ...extra },
                        encoding: "utf8",
                    });
                // Master moves on the remote (pushed by URL, so origin/master here is not updated), so
                // the next fetch must lock and write refs/remotes/origin/master.
                const origin = join(t, "origin.git");
                git(
                    "push",
                    "-q",
                    origin,
                    `${git("commit-tree", "master^{tree}", "-p", "master", "-m", "m2")}:refs/heads/master`,
                );
                // The same, in the background: resolves to its exit code and output once it ends.
                const start = (extra, ...args) => {
                    const child = spawn("bash", [join(main, "tools/visual-preview.sh"), ...args], {
                        cwd: main,
                        env: { ...env, ...extra },
                    });
                    let out = "";
                    child.stdout.on("data", (b) => (out += b));
                    child.stderr.on("data", (b) => (out += b));
                    const done = new Promise((resolve) => child.on("close", (status) => resolve({ status, out })));
                    return { child, done, output: () => out };
                };
                await fn({ run, start, git, head, origin, main, local: join(main, "tmp/visual-review/local") });
            } finally {
                rmSync(t, { recursive: true, force: true });
            }
        };

        it("stages a capture with changed images, passes, and promotes or discards it on request", () => {
            return sandbox(({ run, head, local }) => {
                // An exported BRANCH (common in CI and agent shells) must not change the mode.
                const r = run({ STUB_STATUS: "changed", BRANCH: "something" }, "--head", head);
                assert.equal(r.status, 0, r.stdout + r.stderr);
                assert.ok(existsSync(join(local, `.pending-${head}/p/results.json`)), "staged under the commit");
                assert.ok(!existsSync(join(local, "branch-feat")), "nothing promoted before the push passed");
                assert.equal(run({}, "--promote", head).status, 0);
                assert.ok(existsSync(join(local, "branch-feat/p/results.json")));
                assert.ok(!existsSync(join(local, `.pending-${head}`)));
                assert.equal(run({ STUB_STATUS: "changed" }, "--head", head).status, 0);
                assert.equal(run({}, "--discard", head).status, 0);
                assert.ok(!existsSync(join(local, `.pending-${head}`)));
                assert.ok(existsSync(join(local, "branch-feat/p/results.json")), "the promoted preview is kept");
            });
        });

        it("captures for the pull request of VISUAL_PREVIEW_BRANCH and leaves it staged on --promote, for land.mjs", () => {
            sandbox(({ run, head, main, local }) => {
                // The detached check worktree has no branch: land.mjs names the one it pushes to.
                mkdirSync(join(main, "tmp/pr-status"), { recursive: true });
                writeFileSync(
                    join(main, "tmp/pr-status/status.json"),
                    JSON.stringify({ pullRequests: [{ head: "golden", number: 7 }] }),
                );
                const named = { VISUAL_PREVIEW_BRANCH: "golden" };
                const r = run({ ...named, STUB_STATUS: "changed" }, "--head", head);
                assert.equal(r.status, 0, r.stdout + r.stderr);
                const staged = join(local, `.pending-${head}`);
                const status = JSON.parse(readFileSync(join(staged, "status.json"), "utf8"));
                assert.deepEqual([status.state, status.pr, status.head], ["done", 7, head]);
                assert.equal(run(named, "--promote", head).status, 0);
                assert.ok(existsSync(join(staged, "p/results.json")), "still staged: pending push");
                assert.ok(!existsSync(join(local, "7")), "never the pull request's preview before the push");
                assert.equal(run(named, "--discard", head).status, 0);
                assert.ok(!existsSync(staged));
            });
        });

        it("does not count the wait for a browser slot against its limit, but times out a stuck capture", () => {
            return sandbox(({ run, head, main, local }) => {
                // The browser cap, held by someone else for longer than the whole limit (#1820).
                mkdirSync(join(main, "tmp"), { recursive: true });
                const wrapper = join(main, "tmp/with-browser.sh");
                writeFileSync(wrapper, '#!/bin/sh\nsleep "$STUB_SLOT_WAIT"\nexec "$@"\n', {
                    mode: 0o755,
                });
                const waited = run(
                    {
                        STUB_STATUS: "changed",
                        VISUAL_PREVIEW_TIMEOUT: "10s",
                        STUB_SLOT_WAIT: "11",
                        WITH_BROWSER: wrapper,
                    },
                    "--head",
                    head,
                );
                assert.equal(waited.status, 0, waited.stdout + waited.stderr);
                assert.match(waited.stdout, /p: waiting for a browser slot \(not counted against 10s\)/);
                assert.match(waited.stdout, /p: capturing \(\d+s left\)/);

                // A capture that holds its slot and never finishes still fails, once its limit is spent
                // (the finished capture of the same head is discarded first, or it would be reused).
                assert.equal(run({}, "--discard", head).status, 0);
                const stuck = run(
                    { STUB_HANG: "1", VISUAL_PREVIEW_TIMEOUT: "2s", STUB_SLOT_WAIT: "0", WITH_BROWSER: wrapper },
                    "--head",
                    head,
                );
                assert.equal(stuck.status, 1, stuck.stdout + stuck.stderr);
                assert.match(stuck.stdout, /p: timed out: the capture ran past what was left of 2s/);
                assert.match(stuck.stderr, /capture failed: p/);
                const status = JSON.parse(readFileSync(join(local, `.pending-${head}/status.json`), "utf8"));
                assert.equal(status.state, "failed");
            });
        });

        it("gives the cut's capture the high browser lane, and only the cut's", () =>
            sandbox(({ run, head, main }) => {
                mkdirSync(join(main, "tmp"), { recursive: true });
                const wrapper = join(main, "tmp/with-browser.sh");
                const lanes = join(main, "tmp/lanes");
                writeFileSync(wrapper, `#!/bin/sh\necho "\${BROWSER_SLOT_PRIORITY:-none}" >> ${lanes}\nexec "$@"\n`, {
                    mode: 0o755,
                });
                const ordinary = run({ STUB_STATUS: "changed", WITH_BROWSER: wrapper }, "--head", head);
                assert.equal(ordinary.status, 0, ordinary.stdout + ordinary.stderr);
                // Discarded first, or a finished capture of the same head would be reused.
                assert.equal(run({}, "--discard", head).status, 0);
                const cut = run(
                    { STUB_STATUS: "changed", WITH_BROWSER: wrapper, VISUAL_PREVIEW_PRIORITY: "cut" },
                    "--head",
                    head,
                );
                assert.equal(cut.status, 0, cut.stdout + cut.stderr);
                assert.equal(readFileSync(lanes, "utf8"), "none\nhigh\n");
            }));

        it("--expect waits until GitHub lists the pushed commit as the pull request's head, then captures it", () => {
            return sandbox(({ run, head, origin, main, local }) => {
                const git = (...a) => spawnSync(realGit, a, { cwd: main, encoding: "utf8" }).stdout.trim();
                // GitHub's merge ref of the new head, as it builds it once it has seen the push.
                const merge = git("commit-tree", `${head}^{tree}`, "-p", "master", "-p", head, "-m", "merge");
                git("push", "-q", origin, `${merge}:refs/pull/7/merge`);
                const gh = join(main, "gh-calls");
                mkdirSync(gh);
                const old = git("rev-parse", "master");
                const r = run(
                    {
                        STUB_STATUS: "changed",
                        STUB_GH_DIR: gh,
                        STUB_OLD_HEAD: old,
                        STUB_NEW_HEAD: head,
                        STUB_OLD_TIMES: "2",
                        VISUAL_PREVIEW_POLL: "0",
                    },
                    "7",
                    "--expect",
                    head,
                );
                assert.equal(r.status, 0, r.stdout + r.stderr);
                assert.match(r.stdout, new RegExp(`waiting for GitHub to list ${head.slice(0, 10)} as the head of #7`));
                // Two answers with the old head, one with the new, and the check that it did not move.
                assert.equal(readFileSync(join(gh, "calls"), "utf8").trim(), "4");
                const status = JSON.parse(readFileSync(join(local, "7/status.json"), "utf8"));
                assert.deepEqual([status.state, status.head], ["done", head]);
            });
        });

        // A live process to hold a queue ticket, and a pid that is certainly dead.
        const holder = () => spawn("sleep", ["600"]);
        const deadPid = () => spawnSync("bash", ["-c", "echo $$"], { encoding: "utf8" }).stdout.trim();
        const ticket = (local, name) => {
            mkdirSync(join(local, ".queue"), { recursive: true });
            writeFileSync(join(local, ".queue", name), "someone\n");
        };
        const until = async (ok) => {
            while (!ok()) await new Promise((r) => setImmediate(r));
        };

        it("waits its turn behind an earlier preview, first come first served, and skips a dead waiter", () =>
            sandbox(async ({ run, start, head, local }) => {
                const earlier = holder();
                try {
                    ticket(local, `1-1-${earlier.pid}`);
                    ticket(local, `1-2-${deadPid()}`);
                    const p = start({ STUB_STATUS: "changed", VISUAL_PREVIEW_POLL: "0.05" }, "--head", head);
                    await until(() => /waiting for the previews ahead of it/.test(p.output()));
                    assert.ok(!existsSync(join(local, `.pending-${head}/p/results.json`)), "nothing captured yet");
                    earlier.kill();
                    const r = await p.done;
                    assert.equal(r.status, 0, r.out);
                    assert.ok(existsSync(join(local, `.pending-${head}/p/results.json`)));
                    assert.deepEqual(readdirSync(join(local, ".queue")), [], "every ticket is gone, the dead one too");
                    // One that arrived after this one never holds it up.
                    assert.equal(run({}, "--discard", head).status, 0);
                    const later = holder();
                    try {
                        ticket(local, `1-99999999999999999999-${later.pid}`);
                        assert.equal(run({ STUB_STATUS: "changed" }, "--head", head).status, 0);
                    } finally {
                        later.kill();
                    }
                } finally {
                    earlier.kill();
                }
            }));

        it("puts the cut's preview ahead of every waiting one, but never ahead of one already working", () =>
            sandbox(async ({ run, start, head, local }) => {
                const waiting = holder();
                const working = holder();
                try {
                    ticket(local, `1-1-${waiting.pid}`);
                    const cut = { STUB_STATUS: "changed", VISUAL_PREVIEW_PRIORITY: "cut", VISUAL_PREVIEW_POLL: "0.05" };
                    assert.equal(run(cut, "--head", head).status, 0, "ahead of a waiting preview");
                    assert.equal(run({}, "--discard", head).status, 0);
                    // A working preview's ticket is rank 0 as of its start.
                    ticket(local, `0-2-${working.pid}`);
                    const p = start(cut, "--head", head);
                    await until(() => /waiting for the previews ahead of it/.test(p.output()));
                    working.kill();
                    const r = await p.done;
                    assert.equal(r.status, 0, r.out);
                } finally {
                    waiting.kill();
                    working.kill();
                }
            }));

        it("reuses a finished capture of the same head and trees, and only that", () =>
            sandbox(({ run, git, head, origin, main, local }) => {
                const captures = join(main, "captures");
                const count = () => (existsSync(captures) ? readFileSync(captures, "utf8").split("\n").length - 1 : 0);
                const env = { STUB_STATUS: "changed", STUB_CAPTURES: captures };
                assert.equal(run(env, "--head", head).status, 0);
                assert.equal(run({}, "--promote", head).status, 0);
                assert.equal(count(), 1);
                const source = join(local, "branch-feat/p/results.json");
                const before = readFileSync(source, "utf8");

                // Pull request 7 at the same head: GitHub's merge ref has the same tree on the same base.
                git("fetch", "-q", "origin", "master");
                const pr = (tree) => {
                    const merge = git("commit-tree", tree, "-p", "origin/master", "-p", head, "-m", "merge");
                    git("push", "-q", "-f", origin, `${merge}:refs/pull/7/merge`);
                };
                const gh = join(main, "gh-calls");
                mkdirSync(gh);
                const prEnv = { ...env, STUB_GH_DIR: gh, STUB_NEW_HEAD: head, STUB_OLD_TIMES: "0" };
                pr(`${head}^{tree}`);
                const reused = run(prEnv, "7");
                assert.equal(reused.status, 0, reused.stdout + reused.stderr);
                assert.match(reused.stdout, /reused the capture of branch-feat/);
                assert.equal(count(), 1, "no capture made");
                const status = JSON.parse(readFileSync(join(local, "7/status.json"), "utf8"));
                assert.deepEqual(
                    [status.state, status.head, status.reusedFrom, status.projects],
                    ["done", head, "branch-feat", ["p"]],
                );
                const results = JSON.parse(readFileSync(join(local, "7/p/results.json"), "utf8"));
                assert.deepEqual([results.pr, results.headSha], [7, head], "named for its own pull request");
                assert.ok(results.local.preview, "decidable on the review page");
                assert.equal(readFileSync(source, "utf8"), before, "the source capture is unchanged");
                // Run again, it sees its own finished capture and does nothing.
                const again = run(prEnv, "7");
                assert.match(again.stdout, /7 at [0-9a-f]{10} is already captured/);
                assert.equal(count(), 1);

                // Other baselines (any other merge tree): captured again.
                writeFileSync(join(main, "baseline.png"), "other\n");
                const blob = git("hash-object", "-w", "baseline.png");
                const index = join(main, "index.tmp");
                const tree = spawnSync(
                    "bash",
                    [
                        "-c",
                        `git read-tree ${head} && git update-index --add --cacheinfo 100644,${blob},visual-baselines/p/s.png && git write-tree`,
                    ],
                    { cwd: main, env: { ...process.env, GIT_INDEX_FILE: index }, encoding: "utf8" },
                ).stdout.trim();
                pr(tree);
                const other = run(prEnv, "7");
                assert.equal(other.status, 0, other.stdout + other.stderr);
                assert.equal(count(), 2, "captured, not reused");
                assert.equal(JSON.parse(readFileSync(join(local, "7/status.json"), "utf8")).reusedFrom, null);

                // Another head with the very same tree: captured again.
                const twin = git("commit-tree", `${head}^{tree}`, "-p", `${head}^`, "-m", "twin");
                assert.equal(run(env, "--head", twin).status, 0);
                assert.equal(count(), 3);
            }));

        it("fails on a story that failed to render", () => {
            return sandbox(({ run, head }) => {
                const r = run({ STUB_STATUS: "failed" }, "--head", head);
                assert.equal(r.status, 1);
                assert.match(r.stderr, /stories failed to capture/);
            });
        });

        it("retries a fetch that lost a ref-lock race with another fetch (#1548)", () => {
            return sandbox(({ run, head }) => {
                const r = run({ STUB_STATUS: "changed", STUB_FETCH_LOCKED: "2" }, "--head", head);
                assert.equal(r.status, 0, r.stdout + r.stderr);
            });
        });

        it("fails a fetch that keeps failing with git's own message", () => {
            return sandbox(({ run, head, local, origin }) => {
                rmSync(origin, { recursive: true, force: true });
                const r = run({ STUB_STATUS: "changed" }, "--head", head);
                assert.equal(r.status, 1);
                assert.match(
                    r.stderr,
                    /cannot fetch master: fatal: '.*origin\.git' does not appear to be a git repository/,
                );
                const status = JSON.parse(readFileSync(join(local, `.pending-${head}/status.json`), "utf8"));
                assert.equal(status.state, "failed");
                assert.equal(status.step, "fetching origin/master");
                assert.match(status.log, /does not appear to be a git repository/);
            });
        });

        it("skips a conflicting merge but fails on a merge-tree error", () => {
            return sandbox(({ run, head, local }) => {
                const conflict = run({ STUB_MERGE_TREE_RC: "1" }, "--head", head);
                assert.equal(conflict.status, 0, conflict.stderr);
                assert.match(conflict.stdout, /conflicts with origin\/master/);
                const error = run({ STUB_MERGE_TREE_RC: "128" }, "--head", head);
                assert.equal(error.status, 1);
                assert.match(error.stderr, /merge-tree failed \(exit 128\)/);
                const status = JSON.parse(readFileSync(join(local, `.pending-${head}/status.json`), "utf8"));
                assert.equal(status.state, "failed");
            });
        });
    });

    it("uploads Git LFS objects before anything else, and stops the push when that fails", () => {
        const hook = readFileSync(new URL("../.husky/pre-push", import.meta.url), "utf8");
        const commands = code(hook)
            .split("\n")
            .map((l) => l.trim())
            .filter((l) => l && !l.startsWith("#!"));
        assert.equal(commands[0], 'GATE_DIR="$(cd "$(dirname "$0")/.." && pwd)"');
        // git's ref lines are read once: the LFS upload gets them, and the remote sha is kept.
        assert.equal(commands[1], "PUSH_REFS=$(cat)");
        assert.equal(commands[2], `printf '%s\\n' "$PUSH_REFS" | "$GATE_DIR/tools/lfs-pre-push.sh" "$@" || exit 1`);
    });
});

describe("every workflow", () => {
    // A `needs` entry naming a missing job makes GitHub reject the whole file: the run starts with 0 jobs.
    it("names only jobs of its own file in every job's needs", () => {
        const dir = new URL("../.github/workflows/", import.meta.url);
        const files = readdirSync(dir).filter((f) => /\.ya?ml$/.test(f));
        assert.ok(files.includes("ci.yml"));
        for (const file of files) {
            const jobs = parseYaml(readFileSync(new URL(file, dir), "utf8"))?.jobs ?? {};
            for (const [name, job] of Object.entries(jobs))
                for (const need of [job.needs ?? []].flat())
                    assert.ok(need in jobs, `${file}: job ${name} needs ${need}, which is not a job in the file`);
        }
    });
});

describe("ci.yml", () => {
    const ci = workflow("ci.yml");

    it("pulls the Git LFS files a test shard reads before it runs (#4989)", () => {
        const test = job(ci, "test");
        assert.match(
            test,
            /- name: Fetch the Git LFS files the shard reads\n\s+if: matrix\.lfs\n\s+run: git lfs pull --include "\$\{\{ matrix\.lfs \}\}"\n/,
        );
        assert.ok(test.indexOf("Fetch the Git LFS files the shard reads") < test.indexOf("- name: Run tests"));
    });

    it("runs every pull request, a draft too, and still names the merge queue once (#3418)", () => {
        // Pull requests are opened ready (tools/pr-open.sh); there is no draft probe and no draft skip.
        assert.match(ci, /types: \[opened, synchronize, reopened, ready_for_review\]/);
        assert.equal(parseJobs(ci).draft, undefined, "no Draft state job");
        // Build needs only the run cap (tools/ci-run-cap.mjs), which never fails, and has no condition
        assert.doesNotMatch(job(ci, "packages"), /\n {8}if:/, "Build has no condition");
        // a skipped run cap would skip every job below Build, so the job always runs and only its steps wait
        assert.doesNotMatch(job(ci, "run-cap"), /\n {8}if:/, "the run cap job runs on every event");
        assert.match(job(ci, "packages"), /\n {8}needs: run-cap\n/, "Build needs only the run cap");
        assert.doesNotMatch(ci, /github\.event\.pull_request\.draft/);
        assert.ok(ci.includes(`    MERGE_QUEUE: \${{ ${QUEUE} }}\n`), "the workflow names the merge queue once");
    });

    it("cancels a pull request's older run, never a running master push build, a dispatch or the release train (#1108, #3418, #3850, #3938)", () => {
        const block = ci.match(/^concurrency:\n((?: {4}.*\n)+)/m);
        assert.ok(block, "ci.yml has a workflow-level concurrency block");
        assert.equal(
            block[1],
            "    group: ci-${{ github.event.pull_request.number || inputs.ref && format('release-{0}', inputs.ref) || github.event_name == 'push' && github.run_attempt == '1' && 'master-push' || github.sha }}\n" +
                "    cancel-in-progress: ${{ github.event_name == 'pull_request' }}\n",
        );
        // GitHub's expressions read like JavaScript's here: && and || return an operand, a missing input is falsy
        const evaluate = (field, { event, pr, ref, sha = "abc", attempt = "1" }) => {
            const expr = new RegExp(`^ {4}${field}: (.*)$`, "m").exec(block[1])[1];
            const js = expr.replace(/\$\{\{ (.+?) \}\}/g, (_, e) => `\${${e.replaceAll("'", '"')}}`);
            const format = (f, a) => f.replace("{0}", a);
            return Function(
                "github",
                "inputs",
                "format",
                `return \`${js}\`;`,
            )(
                { event_name: event, sha, run_attempt: attempt, event: { pull_request: { number: pr } } },
                { ref },
                format,
            );
        };
        const run = (o) => ({ group: evaluate("group", o), cancels: evaluate("cancel-in-progress", o) === "true" });
        assert.deepEqual(run({ event: "pull_request", pr: 12 }), { group: "ci-12", cancels: true }, "a pull request");
        // every master push shares one group but cancels nothing: a running build finishes, and a newer push only
        // replaces the waiting one, so master never goes without a finished build (#3938)
        assert.deepEqual(run({ event: "push", sha: "a1" }), { group: "ci-master-push", cancels: false }, "a push");
        assert.equal(run({ event: "push", sha: "b2" }).group, "ci-master-push", "a later push, same group");
        // a re-run of an older master build (master-guard re-runs an outside failure) neither cancels the newer
        // build nor is cancelled: its commit's own group
        assert.deepEqual(run({ event: "push", sha: "a1", attempt: "2" }), { group: "ci-a1", cancels: false });
        // a dispatch keeps its commit's own group and is never cancelled
        assert.deepEqual(run({ event: "workflow_dispatch", sha: "a1" }), { group: "ci-a1", cancels: false });
        // the release train's call: its own group, never cancelled, even if a caller were a push
        assert.deepEqual(run({ event: "workflow_dispatch", ref: "c3" }), { group: "ci-release-c3", cancels: false });
        assert.deepEqual(run({ event: "push", ref: "c3" }), { group: "ci-release-c3", cancels: false });
    });

    it("fails, never skips, the summary checks when Build did not run", () => {
        // A skipped required check counts as passing.
        assert.match(job(ci, "all-checks"), /\n {8}if: always\(\)\n/, "all-checks always runs");
        assert.match(
            job(ci, "all-checks"),
            /if \[\[ "\$BUILD" == "skipped" \]\]; then\n.*Build did not run.*\n\s+exit 1/,
        );
    });

    it("runs the full suite on a merge-queue branch", () => {
        const step = job(ci, "packages");
        assert.match(step, /"\$EVENT" == "pull_request" && "\$MERGE_QUEUE" != "true"/);
        assert.match(
            step,
            /if: steps.plan.outputs.full == 'true' && steps.reuse-build.outputs.artifacts-run == ''\n\s+run: pnpm exec nx run-many -t build/,
        );
        assert.match(
            job(ci, "lint"),
            /if: needs.packages.outputs.full == 'true'\n\s+run: pnpm exec nx run-many -t lint/,
        );
    });

    it("holds the merge queue to master's rule that every job succeeds", () => {
        assert.match(
            job(ci, "all-checks"),
            /\[\[ "\$FULL" == "false" \|\| "\$LIGHT" == "true" \]\] && ok='\["success","skipped"\]'/,
        );
    });

    it("has no retired Queue Checks Pass anywhere a check is defined or read (#3477)", () => {
        assert.equal(parseJobs(ci)["queue-checks"], undefined, "no queue-checks job");
        assert.ok(!/Queue Checks Pass/.test(ci), "ci.yml never names Queue Checks Pass");
        const action = readFileSync(new URL("../.github/actions/early-verdict/action.yml", import.meta.url), "utf8");
        assert.ok(!/Queue Checks Pass/.test(action), "early-verdict never reads Queue Checks Pass");
        const advisory = readFileSync(new URL("./ci-advisory-checks.json", import.meta.url), "utf8");
        assert.ok(!/Queue Checks Pass/.test(advisory), "no advisory entry for Queue Checks Pass");
    });

    it("gates every pull request that affects graphty-element on the cost estimates", () => {
        assert.match(
            job(ci, "cost-accuracy"),
            /if: contains\(fromJSON\(needs.packages.outputs.affected\), 'graphty-element'\)/,
        );
        assert.ok(parseJobs(ci)["all-checks"].needs.includes("cost-accuracy"));
    });

    it("reports flaky screenshots after the story tests without gating anything on them", () => {
        const jobs = parseJobs(ci);
        assert.deepEqual(jobs["visual-flaky"].needs, ["story-tests", "story-tests-merge"]);
        assert.equal(jobs["visual-flaky"].coe, "true");
        assert.match(job(ci, "visual-flaky"), /pattern: visual-\*\n/);
        assert.match(job(ci, "visual-flaky"), /node tools\/visual-flaky-report\.mjs "\$RUNNER_TEMP\/visual"/);
        assert.ok(!jobs["all-checks"].needs.includes("visual-flaky"));
    });

    it("runs no security audit on pull requests or merge-queue runs", () => {
        // advisories land against code a pull request did not change; the release train audits instead
        assert.doesNotMatch(ci, /pnpm audit/);
        const review = workflow("dependency-review.yml");
        assert.match(review, /paths:\n\s+- "pnpm-lock.yaml"/);
        assert.match(review, /if: \$\{\{ !startsWith\(github.head_ref, 'mergify\/merge-queue\/'\) \}\}/);
        assert.match(review, /fail-on-severity: high/);
    });

    it("keeps the benchmarks advisory, outside the verdict and beside the tests", () => {
        assert.match(job(ci, "performance"), /continue-on-error: true/);
        assert.doesNotMatch(job(ci, "performance"), /needs: .*test/);
        assert.doesNotMatch(job(ci, "all-checks"), /needs: .*performance/);
    });

    it("reuses the build of the run reuse_build_run names, on a dispatch and on a call", () => {
        for (const trigger of ["workflow_call", "workflow_dispatch"]) {
            const on = ci.split(`    ${trigger}:\n`)[1].split(/\n {4}\w/)[0];
            assert.match(on, /\n {12}reuse_build_run:\n(?: {16}.*\n){1,2} {16}type: string\n/, trigger);
        }
        const packages = job(ci, "packages");
        assert.match(
            packages,
            /id: reuse-build\n {14}if: inputs.reuse_build_run != ''\n {14}continue-on-error: true\n/,
            "an unreadable run is a build, never a failure",
        );
        assert.match(packages, /node tools\/ci-reuse-plan.mjs --build-run "\$RUN"/);
        assert.match(
            packages,
            /artifacts-run: \$\{\{ steps.reuse.outputs.artifacts-run \|\| steps.reuse-build.outputs.artifacts-run \}\}/,
        );
        // the master build is skipped, and the named run's packages are downloaded instead
        assert.match(
            packages,
            /if: steps.plan.outputs.full == 'true' && steps.reuse-build.outputs.artifacts-run == ''\n\s+run: pnpm exec nx run-many -t build/,
        );
        assert.match(
            packages,
            /run-id: \$\{\{ steps.reuse.outputs.artifacts-run \|\| steps.reuse-build.outputs.artifacts-run \}\}/,
        );
        // a master push keeps the builds 14 days, so a full run 6 hours later can reuse them
        const keep = /retention-days: \$\{\{ github.event_name == 'push' && !inputs.ref && 14 \|\| 1 \}\}/;
        assert.match(packages.split("name: build-packages\n").at(-1), keep);
        for (const name of Object.keys(STORYBOOKS)) {
            assert.match(job(ci, "build").split(`name: ${name}\n`)[1].split("\n\n")[0], keep, name);
        }
    });

    it("reuses a named run's builds only when it built this commit and they are all still there", () => {
        const head = "a".repeat(40);
        const all = ["build-packages", ...Object.keys(STORYBOOKS)].map((name) => ({ name, expired: false }));
        const push = { event: "push", head_sha: head };
        assert.equal(buildNotReusable(push, all, head), null);
        assert.match(buildNotReusable({ ...push, head_sha: "b".repeat(40) }, all, head), /not a{40}/);
        // a pull request run built its merge commit, not head_sha
        assert.match(buildNotReusable({ ...push, event: "pull_request" }, all, head), /pull_request run/);
        const expired = all.map((a) => (a.name === "build-storybook-app" ? { ...a, expired: true } : a));
        assert.match(buildNotReusable(push, expired, head), /build-storybook-app/);
        assert.match(buildNotReusable(push, all.slice(1), head), /build-packages/);
    });

    it("prints the named run as artifacts-run only when it can be reused (the --build-run step)", () => {
        const dir = mkdtempSync(join(TMP, "reuse-build-"));
        const g = (...args) => spawnSync("git", args, { cwd: dir, encoding: "utf8" }).stdout.trim();
        g("init", "-q");
        g("-c", "user.name=t", "-c", "user.email=t@t", "commit", "-q", "--allow-empty", "-m", "c");
        const head = g("rev-parse", "HEAD");
        const bin = join(dir, "bin");
        mkdirSync(bin);
        const artifacts = ["build-packages", ...Object.keys(STORYBOOKS)].map((name) => ({ name, expired: false }));
        const stub = (sha) =>
            writeFileSync(
                join(bin, "gh"),
                `#!/bin/bash\ncase "$2" in *artifacts*) echo '${JSON.stringify({ artifacts })}';; *) echo '{"event":"push","head_sha":"${sha}"}';; esac\n`,
                { mode: 0o755 },
            );
        const run = (id = "77") =>
            spawnSync("node", [new URL("./ci-reuse-plan.mjs", import.meta.url).pathname, "--build-run", id], {
                cwd: dir,
                encoding: "utf8",
                env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, GITHUB_REPOSITORY: "o/r" },
            });
        stub(head);
        assert.equal(run().stdout, "artifacts-run=77\n");
        assert.equal(run("77/../../x").stdout, "artifacts-run=\n", "only a numeric run id is read");
        stub("0".repeat(40));
        const other = run();
        assert.equal(other.stdout, "artifacts-run=\n");
        assert.match(other.stderr, /this run builds/);
        writeFileSync(join(bin, "gh"), "#!/bin/bash\necho 'HTTP 404' >&2; exit 1\n", { mode: 0o755 });
        assert.equal(run().stdout, "artifacts-run=\n", "an unreadable run is a build");
    });

    it("dispatches release.yml from the master push run only for a merge that references a red issue", () => {
        const red = [
            { number: 9001, title: "Full run red: ci on abc" },
            { number: 9002, title: "Release held: T4 GPU failed on abc" },
        ];
        // a Refs restarts without cancelling, so the red run still reaches its verdict, bisect and store record
        assert.deepEqual(releaseDue(red, "fix(ci): x\n\nRefs #9001\n"), {
            mode: "restart",
            issue: 9001,
            cancel: false,
        });
        assert.deepEqual(releaseDue(red, "fix: y\n\nfixes #9001"), { mode: "restart", issue: 9001, cancel: true });
        assert.deepEqual(releaseDue(red, "Refs #9001\nCloses #9001"), { mode: "restart", issue: 9001, cancel: true });
        for (const k of ["Fix", "Fixed", "Close", "Closed", "Resolve", "Resolved"]) {
            assert.deepEqual(releaseDue(red, `${k} #9001`), { mode: "restart", issue: 9001, cancel: true }, k);
        }
        assert.deepEqual(releaseDue(red, "Part of #9001"), { mode: "restart", issue: 9001, cancel: false });
        assert.equal(releaseDue(red, "fix: z\n\nRefs #9002"), null, "only a Full run red issue restarts");
        assert.equal(releaseDue(red, "fix: z\n\nRefs #90011"), null);
        assert.equal(releaseDue(red, "feat: unrelated"), null);
        assert.equal(releaseDue([], "Refs #9001"), null, "no open red issue: nothing is due");
        // a Fixes closes the issue as the merge lands, minutes before this job runs
        const now = Date.parse("2026-10-25T12:00:00Z");
        const closed = (closedAt) => [{ number: 9001, title: "Full run red: ci on abc", state: "CLOSED", closedAt }];
        assert.deepEqual(releaseDue(closed("2026-10-25T11:55:00Z"), "Fixes #9001", now), {
            mode: "restart",
            issue: 9001,
            cancel: true,
        });
        assert.equal(releaseDue(closed("2026-10-24T11:55:00Z"), "Refs #9001", now), null, "closed long ago");
        // every form GitHub closes an issue from
        for (const form of [
            "Fixes: #9001",
            "Fixes graphty-org/graphty-monorepo#9001",
            "Resolves https://github.com/graphty-org/graphty-monorepo/issues/9001",
        ]) {
            assert.equal(releaseDue(closed("2026-10-25T11:55:00Z"), form, now)?.cancel, true, form);
        }
        assert.equal(
            releaseDue(closed("2026-10-25T11:55:00Z"), "Fixes other-org/other#9001", now),
            null,
            "another repository",
        );
        // the restart cancels the full runs in progress first, which hold it pending in release.yml's group
        const runs = [
            { databaseId: 1, displayTitle: "Release (full)" },
            { databaseId: 2, displayTitle: "Release (restart)" },
            { databaseId: 3, displayTitle: "Release (shadow)" },
            { databaseId: 4, displayTitle: "Release (legacy)" },
        ];
        const named = "https://github.com/o/r/actions/runs/1 https://github.com/o/r/actions/runs/3";
        assert.deepEqual(releaseToCancel(runs, named), [1], "never a shadow or a legacy release");
        // only the runs the red issue names: a restart testing the fix, or an unrelated full run, keeps running
        assert.deepEqual(releaseToCancel(runs, "https://github.com/o/r/actions/runs/1"), [1]);
        assert.deepEqual(releaseToCancel(runs, "no run linked"), []);
        // the note on the Release status issue reads as that attempt's failure report, so release-watch is quiet
        const url = "https://github.com/o/r/actions/runs/1";
        assert.ok(releaseReportsFailure(releaseCancelNote(9001, url, 1), url, 1));
        assert.ok(releaseReportsFailure(releaseCancelNote(9001, url, 2), url, 2));
        assert.ok(!releaseReportsFailure(releaseCancelNote(9001, url, 1), url, 2));
        const due = job(ci, "release-due");
        assert.match(due, /\n {8}needs: all-checks\n/);
        assert.match(
            due,
            /\n {8}if: \$\{\{ !cancelled\(\) && needs\.all-checks\.result == 'success' && github\.event_name == 'push' && github\.ref == 'refs\/heads\/master' && !inputs\.ref \}\}\n/,
        );
        assert.match(due, /actions: write\n/);
        // the held candidate is read from the results store when the merge is the owner's screenshot approval
        assert.match(due, /id-token: write\n/);
        assert.match(due, /RESULTS_URL: \$\{\{ vars.RESULTS_URL \}\}\n/);
        assert.doesNotMatch(due, /concurrency:/);
        // a failed dispatch must not turn master red: that skips the deploy and has master-guard revert the merge
        assert.match(due, /\n {8}continue-on-error: true\n/);
    });

    it("promotes a held candidate when the owner's approval of it merges, and tells the hold issue when it is stale", () => {
        const h = "a".repeat(40);
        const accept = {
            sha: "b".repeat(40),
            parents: [h],
            subject: `test(workspace): approve visual baselines at ${h.slice(0, 12)}`,
        };
        // the commit holding the owner's signed approval, the pull request's head
        const approval = "9".repeat(40);
        const merge = { sha: "c".repeat(40), parents: ["d".repeat(40), approval], subject: "Merge pull request #1" };
        const store = (head) => ({ hold: { head, issue: 77 }, recent: [{ sha: h, state: "green-images", runId: 5 }] });
        const brings = (...commits) => [{ approval, commits }];
        assert.deepEqual(releaseResumesDue(brings(merge), store(h)), [], "no accept commit, no promotion");
        const [due] = releaseResumesDue(brings(merge, accept), store(h));
        assert.deepEqual([due.run, due.candidate, due.accept], [true, h, approval]);
        const [stale] = releaseResumesDue(brings(accept), store("e".repeat(40)));
        assert.deepEqual([stale.run, stale.comment], [false, 77]);
        // a store that does not answer dispatches: promote-nightly checks again
        assert.equal(releaseResumesDue(brings(accept), null)[0].run, true);
    });

    it("dispatches the fix forward on a merge named for, or referencing, the hold issue, and only while held", () => {
        const store = { hold: { base: "a".repeat(40), head: "a".repeat(40), issue: 900 } };
        const named = { subject: "Merge pull request #5 from graphty-org/fix/900-topic", messages: "" };
        assert.equal(releaseFixForwardDue(named, store), 900);
        const refs = {
            subject: "Merge pull request #6 from graphty-org/feat/950-x",
            messages: "fix(x): y\n\nRefs #900",
        };
        assert.equal(releaseFixForwardDue(refs, store), 900);
        assert.equal(
            releaseFixForwardDue({ subject: "Merge pull request #7 from o/feat/950-x", messages: "" }, store),
            null,
        );
        assert.equal(releaseFixForwardDue(named, { hold: null }), null);
        assert.equal(releaseFixForwardDue(named, null), null, "a store that does not answer: the next slot merges it");
    });

    it("names only the fixes' pull requests in the candidate run it dispatches (fix_pr), never a newer merge", () => {
        const store = { hold: { base: "a".repeat(40), head: "a".repeat(40), issue: 900 } };
        // fix #5, described only in its pull request, then unrelated #6 whose green build reads both
        const fix = {
            subject: "Merge pull request #5 from graphty-org/feat/950-x",
            messages: "fix(x): y\n\nRefs #900",
        };
        const other = { subject: "Merge pull request #6 from graphty-org/feat/951-z", messages: "feat(z): unrelated" };
        assert.deepEqual(releaseFixForwardMerges([other, fix], store), { issue: 900, prs: ["5"] });
        assert.equal(releaseFixForwardMerges([other], store), null);
        const named = { subject: "Merge pull request #7 from graphty-org/fix/900-topic", messages: "" };
        assert.deepEqual(releaseFixForwardMerges([named, other, fix], store).prs, ["7", "5"]);
        assert.deepEqual(releaseFixForwardDispatch(["7", "5"]).slice(-4), ["-f", "mode=candidate", "-f", "fix_pr=7,5"]);
        assert.equal(releaseFixForwardDispatch([]).at(-1), "mode=candidate");
    });

    // ci.yml cancels an unfinished master build when a newer push starts (#3850), and release-due runs only in a
    // green build, so a cancelled build's merge must still be read by the next green build's release-due.
    it("restarts from a merge whose master build a newer push cancelled", () => {
        const order = ["h", "c2", "c1", "g", "older"];
        const ancestor = (sha) => order.includes(sha);
        assert.equal(lastGreenBuild("h", ["h", "g", "older"], ancestor), "g", "this build's own run is never the base");
        assert.equal(lastGreenBuild("h", ["elsewhere", "g"], ancestor), "g", "only a commit in this history");
        assert.equal(lastGreenBuild("h", [], ancestor), null);
        // the cancelled merge's Fixes closed the issue more than an hour before this build's release-due ran
        const now = Date.parse("2026-10-25T12:00:00Z");
        const closed = [
            { number: 9001, title: "Full run red: ci on abc", state: "CLOSED", closedAt: "2026-10-25T10:40:00Z" },
        ];
        assert.equal(releaseDue(closed, "Fixes #9001", now), null, "an hour's window alone misses it");
        assert.equal(releaseDue(closed, "Fixes #9001", now, Date.parse("2026-10-25T10:30:00Z"))?.issue, 9001);

        // end to end, --dry-run: green build at G, a merge M1 (Refs #9001) whose build was cancelled, then this build's
        // merge M2 with no reference. Reading only HEAD^1..HEAD would miss M1.
        const dir = mkdtempSync(join(TMP, "release-due-"));
        const g = (...args) =>
            spawnSync("git", ["-c", "user.name=t", "-c", "user.email=t@t", ...args], {
                cwd: dir,
                encoding: "utf8",
            }).stdout.trim();
        g("init", "-q", "-b", "master");
        g("commit", "-q", "--allow-empty", "-m", "green base");
        const green = g("rev-parse", "HEAD");
        const merge = (msg) => {
            g("switch", "-q", "-c", `b${msg.length}`);
            g("commit", "-q", "--allow-empty", "-m", msg);
            g("switch", "-q", "master");
            g("merge", "-q", "--no-ff", "-m", `Merge pull request #${msg.length}`, `b${msg.length}`);
        };
        merge("fix(ci): the red lane\n\nRefs #9001");
        merge("feat: unrelated work");
        const bin = join(dir, "bin");
        mkdirSync(bin);
        const issue = JSON.stringify({ number: 9001, title: "Full run red: ci on abc", state: "OPEN" });
        writeFileSync(
            join(bin, "gh"),
            `#!/bin/bash\ncase "$*" in\n` +
                `"run list"*) echo '${JSON.stringify([{ headSha: green }])}';;\n` +
                `*state=open*) echo '${issue}';;\n` +
                `*) ;;\nesac\n`,
            { mode: 0o755 },
        );
        const out = spawnSync("node", [new URL("./release-due.mjs", import.meta.url).pathname, "--dry-run"], {
            cwd: dir,
            encoding: "utf8",
            env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, GITHUB_REPOSITORY: "o/r" },
        });
        assert.equal(out.status, 0, out.stderr);
        assert.match(out.stdout, new RegExp(`since the last green master build ${green.slice(0, 7)}`));
        assert.match(out.stdout, /references red issue #9001: release\.yml mode=restart/);
        // without a green build to read from, only this merge counts: nothing due
        writeFileSync(
            join(bin, "gh"),
            `#!/bin/bash\ncase "$*" in\n"run list"*) echo '[]';;\n*state=open*) echo '${issue}';;\nesac\n`,
            { mode: 0o755 },
        );
        const alone = spawnSync("node", [new URL("./release-due.mjs", import.meta.url).pathname, "--dry-run"], {
            cwd: dir,
            encoding: "utf8",
            env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, GITHUB_REPOSITORY: "o/r" },
        });
        assert.match(alone.stdout, /nothing due/);
    });

    it("deletes superseded cache keys on green master pushes only, with no write permission but actions", () => {
        const hygiene = job(ci, "cache-hygiene");
        assert.match(
            hygiene,
            /\n {8}if: \$\{\{ !cancelled\(\) && needs\.all-checks\.result == 'success' && github\.event_name == 'push' && github\.ref == 'refs\/heads\/master' \}\}\n/,
        );
        const doc = parseYaml(ci).jobs["cache-hygiene"];
        assert.deepEqual(doc.permissions, { contents: "read", actions: "write", "pull-requests": "read" });
        // a failed cleanup must not turn master red
        assert.equal(doc["continue-on-error"], true);
        // the script deletes, so its summary is written after the deletes and counts the failed ones
        assert.match(
            hygiene,
            /node tools\/cache-hygiene\.mjs "\$RUNNER_TEMP\/caches\.ndjson" "\$RUNNER_TEMP\/open-prs\.txt" --apply/,
        );
        assert.match(hygiene, /gh pr list --repo "\$GITHUB_REPOSITORY" --state open/);
        // no pull-request run reaches it: All Checks Pass does not wait on it
        assert.ok(!(parseYaml(ci).jobs["all-checks"].needs ?? []).includes("cache-hygiene"));
    });

    it("runs every benchmark, and the browser set-up the last one needs, after an earlier benchmark fails", () => {
        const steps = job(ci, "performance")
            .split(/\n {12}- /)
            .slice(1);
        const first = steps.findIndex((step) => /vitest run --project=bench/.test(step));
        assert.ok(first > 0, "the performance job runs the graphty-element benchmarks");
        for (const step of steps.slice(first)) {
            assert.match(step, /\n\s+if: \$\{\{ !cancelled\(\) \}\}\n/, `this step runs after a failure:\n${step}`);
        }
    });

    it("runs no test, screenshot, link or cost job on a push to master, and still builds every package", () => {
        const build = job(ci, "packages");
        // the plan: a push tests nothing (affected is empty, so the matrix is empty) and is marked light
        assert.match(
            build,
            /if \[\[ "\$EVENT" == "push" && -z "\$CALLED_REF" \]\]; then\n.*\n\s+\{ echo "full=true"; echo "light=true"; \} >> "\$GITHUB_OUTPUT"\n\s+affected='\[\]'\n/,
        );
        assert.equal(plan([]).length, 0, "an empty affected list runs no shard");
        assert.match(
            job(ci, "test"),
            /if: needs.packages.outputs.test-count != '0' && needs.packages.outputs.reuse-run == ''\n/,
        );
        assert.match(
            job(ci, "cost-accuracy"),
            /if: contains\(fromJSON\(needs.packages.outputs.affected\), 'graphty-element'\)/,
        );
        for (const name of ["links"]) {
            assert.match(
                job(ci, name),
                /\n {8}if: (?:needs.packages.outputs.full == 'true' && )?needs.packages.outputs.light != 'true'(?: && needs.packages.outputs.reuse-run == '')?(?: && github.event_name != 'pull_request')?\n/,
                `${name} is skipped on master`,
            );
        }
        // the benchmarks need only the build, and a light run (master) skips them
        assert.match(job(ci, "performance"), /needs: packages\n/);
        assert.match(job(ci, "performance"), /&& needs.packages.outputs.light != 'true'\n/);
        assert.match(job(ci, "checks"), /- name: CI workflow tests\n\s+if: needs.packages.outputs.light != 'true'\n/);
        // the build still runs, every project, with the uploads deploy-pages.yml reads
        assert.match(
            build,
            /if: steps.plan.outputs.full == 'true' && steps.reuse-build.outputs.artifacts-run == ''\n\s+run: pnpm exec nx run-many -t build/,
        );
        assert.match(job(ci, "docs"), /name: build-docs\n/);
        assert.match(job(ci, "build"), /name: build-storybook-element\n/);
        assert.match(job(ci, "build"), /\n {8}needs: run-cap\n {8}runs-on:/, "build runs on master too");
        for (const name of ["lint", "checks", "docs"]) {
            assert.match(
                job(ci, name),
                /\n {8}needs: packages\n(?: {8}if: needs.packages.outputs.reuse-run == ''(?: && needs.packages.outputs.docs == 'true')?\n)? {8}runs-on:/,
                `${name} runs on master too`,
            );
        }
        // the summary checks pass a light run whose skipped jobs were skipped on purpose, and the build
        // jobs must succeed
        assert.match(job(ci, "all-checks"), /LIGHT: \$\{\{ needs.packages.outputs.light \}\}/);
        assert.match(job(ci, "all-checks"), /strict='\["packages","build","lint","checks","docs"\]'\n/);
    });

    it("still runs every test job on pull requests, merge-queue runs, dispatches and the release train", () => {
        const build = job(ci, "packages");
        // light is set only on a push of master itself and on a call that names its shards; every other
        // event takes the affected (pull request) or full path
        assert.equal(build.match(/echo "light=true"/g).length, 2);
        assert.match(build, /if \[\[ -n "\$SHARDS" \]\]; then\n\s+echo "light=true" >> "\$GITHUB_OUTPUT"\n/);
        assert.match(build, /elif \[\[ "\$EVENT" == "pull_request" && "\$MERGE_QUEUE" != "true" \]\]; then/);
        assert.equal(plan(PACKAGES).length, 25, "a full run is every shard");
        // no test-type job is limited to pushes or to master (the nx cache write environment and its probe's
        // WRITES pick a token on master; they skip nothing)
        for (const name of ["test", "links", "cost-accuracy", "performance", "lint", "checks", "docs"]) {
            const body = job(ci, name).replace(/\n {8}environment: .*|\n {18}WRITES: .*/g, "");
            assert.doesNotMatch(body, /event_name == 'push'|refs\/heads\/master/, name);
        }
        assert.match(job(ci, "performance"), /if: github.event_name != 'pull_request' && !inputs.verify &&/);
    });

    it("can be called by the release train on its candidate, and checks out that commit in every job", () => {
        assert.match(ci, /workflow_call:\n\s+inputs:\n\s+ref:\n(?:.*\n){1,2}\s+type: string\n\s+required: true/);
        const checkouts = ci.match(/- uses: actions\/checkout@v\d+\n(?:\s+.*\n){0,3}/g);
        assert.ok(checkouts.length >= 10);
        for (const c of checkouts) {
            assert.match(c, /ref: \$\{\{ inputs.ref \}\}/, c);
        }
    });
});

describe("the test matrix limited to named shards (--only, a CI bisect point)", () => {
    it("keeps only the named shards, a group member in its group's job", () => {
        const include = plan(PACKAGES, ["graph-io", "graph-samples"]);
        assert.deepEqual(
            include.map((e) => e.shard),
            ["graph-io", "small-node"],
        );
        const group = include.find((e) => e.shard === "small-node");
        assert.match(group["test-command"], /graph-samples:coverage/);
        assert.doesNotMatch(group["test-command"], /graph-format:coverage/);
    });

    it("still leaves out a named shard whose package the run does not test", () => {
        assert.deepEqual(plan(["graph-io"], ["graph-samples"]), []);
    });

    it("refuses an unknown shard name, an empty list and anything but a JSON list", () => {
        assert.equal(parseOnly(undefined), undefined);
        assert.deepEqual(parseOnly('["graphty-1"]'), ["graphty-1"]);
        assert.throws(() => parseOnly('["graphty-1", "no-such-shard"]'), /do not exist: no-such-shard/);
        assert.throws(() => parseOnly("[]"), /non-empty/);
        assert.throws(() => parseOnly('"graphty-1"'), /non-empty/);
        assert.throws(() => parseOnly("not json"), SyntaxError);
    });

    it("fails the command line on an unknown shard, so a bisect point never runs an empty matrix", () => {
        const all = JSON.stringify(PACKAGES);
        const run = (...extra) =>
            spawnSync("node", [new URL("ci-test-matrix.mjs", import.meta.url).pathname, all, all, ...extra], {
                encoding: "utf8",
            });
        assert.match(run("--only", '["graphty-2"]').stdout, /\ntest-count=1\n/);
        const bad = run("--only", '["graphty-9"]');
        assert.notEqual(bad.status, 0);
        assert.match(bad.stderr, /graphty-9/);
    });
});

describe("verification runs of ci.yml", () => {
    const ci = workflow("ci.yml");

    // The plan step's script, run as GitHub runs it (bash -eo pipefail), with nx answered by a stub.
    const planStep = (env) => {
        const build = job(ci, "packages");
        const body = /\n {14}id: plan\n[\s\S]*?\n {14}run: \|\n((?: {18}.*\n|\n)+)/
            .exec(build)[1]
            .replace(/^ {18}/gm, "");
        const dir = mkdtempSync(join(TMP, "plan-"));
        const bin = join(dir, "bin");
        mkdirSync(bin);
        writeFileSync(
            join(bin, "pnpm"),
            `#!/bin/bash\nif [[ "$*" == *--affected* ]]; then echo '["graph-io"]'; else echo '${JSON.stringify(PACKAGES)}'; fi\n`,
            { mode: 0o755 },
        );
        const output = join(dir, "output");
        writeFileSync(output, "");
        const r = spawnSync("bash", ["--noprofile", "--norc", "-eo", "pipefail", "-c", body], {
            cwd: new URL("..", import.meta.url).pathname,
            encoding: "utf8",
            env: {
                ...process.env,
                PATH: `${bin}:${process.env.PATH}`,
                GITHUB_OUTPUT: output,
                MERGE_QUEUE: "false",
                BASE_REF: "master",
                SKIP_UNAFFECTED_CAPTURES: "false",
                LABELS: "[]",
                CALLED_REF: "",
                SHARDS: "",
                ...env,
            },
        });
        const out = Object.fromEntries(
            readFileSync(output, "utf8")
                .split("\n")
                .filter(Boolean)
                .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]),
        );
        return { status: r.status, stderr: r.stderr, out };
    };

    it("is called with a ref, an optional verify flag and an optional shard list", () => {
        assert.match(
            ci,
            /\n {12}verify:\n {16}description: .*\n {16}type: boolean\n {16}required: false\n {16}default: false\n/,
        );
        assert.match(
            ci,
            /\n {12}shards:\n {16}description: .*\n {16}type: string\n {16}required: false\n {16}default: ""\n/,
        );
    });

    it("plans a full run for a called run started by a push, and build-only for a push of master", () => {
        const called = planStep({ EVENT: "push", CALLED_REF: "abc123" });
        assert.equal(called.status, 0, called.stderr);
        assert.equal(called.out.full, "true");
        assert.equal(called.out.light, undefined, "a verification run is not light");
        assert.equal(called.out["test-count"], "25");
        const master = planStep({ EVENT: "push" });
        assert.equal(master.status, 0, master.stderr);
        assert.equal(master.out.light, "true");
        assert.equal(master.out["test-count"], "0");
        const pr = planStep({ EVENT: "pull_request" });
        assert.equal(pr.out.full, "false");
        assert.equal(pr.out.light, undefined);
    });

    it("runs only the named shards as a light run, and fails on an unknown one", () => {
        const point = planStep({ EVENT: "push", CALLED_REF: "abc123", SHARDS: '["graph-io","graphty-3"]' });
        assert.equal(point.status, 0, point.stderr);
        assert.equal(point.out.light, "true");
        assert.deepEqual(
            JSON.parse(point.out["test-matrix"]).include.map((e) => e.shard),
            ["graph-io", "graphty-3"],
        );
        const bad = planStep({ EVENT: "workflow_dispatch", CALLED_REF: "abc123", SHARDS: '["nope"]' });
        assert.notEqual(bad.status, 0);
    });

    it("skips the benchmarks on a verification run", () => {
        assert.match(job(ci, "performance"), /\n {8}if: github.event_name != 'pull_request' && !inputs.verify &&/);
    });

    it("uploads every shard's JUnit reports, without letting the upload decide the shard", () => {
        const upload = parseJobs(ci).test.steps.find((s) => s.name === "Upload JUnit results");
        assert.ok(upload, "the test job uploads its JUnit reports");
        assert.equal(upload.if, "${{ !cancelled() }}");
        assert.equal(upload.coe, "true");
        const text = job(ci, "test");
        assert.match(
            text,
            /name: junit-\$\{\{ matrix.shard \}\}\n\s+path: test-results\/junit-\*.xml\n\s+retention-days: 7\n/,
        );
    });

    // A called run checks out inputs.ref in the caller's cache scope. A caller that took the ref from a dispatch
    // input could run any commit's code in master's scope and plant a cache master later restores (CodeQL
    // actions/cache-poisoning; golden-verify.yml did, and is gone). The release train passes the commit it was
    // dispatched on (pick's CANDIDATE is github.sha).
    it("is called only by the release train, with the commit it was dispatched on", () => {
        const callers = readdirSync(new URL("../.github/workflows/", import.meta.url)).filter((f) =>
            /uses: \.\/\.github\/workflows\/ci\.yml/.test(workflow(f)),
        );
        assert.deepEqual(callers, ["release.yml"]);
        const release = workflow("release.yml");
        assert.match(release, /\n {18}CANDIDATE: \$\{\{ github\.sha \}\}\n/);
        assert.match(job(release, "ci"), /\n {12}ref: \$\{\{ needs\.pick\.outputs\.sha \}\}\n/);
    });

    it("leaves the visual gate step exactly as master has them", () => {
        // Both are the owner's (CLAUDE.md, "Visual review"). A change the owner asked for updates these hashes
        // The owner asked on 2026-10-25 for the gate to report only until stories are tests (#3418).
        // in the same commit.
        // A version bump of an action from GitHub's own `actions/` organization (Dependabot's, `@v4` to `@v7`) is
        // not a change to the owner's steps; any other edit, another action or a ref that is not a version, is.
        const sha = (t) =>
            createHash("sha256")
                .update(t.replace(/(uses: actions\/[\w-]+)@v\d+(?:\.\d+)*$/gm, "$1@v4"))
                .digest("hex");
        // The gate steps moved, unchanged, from "All Checks Pass" to the Visual report job (#3443).
        const report = job(ci, "visual-report");
        const from = report.indexOf("            - name: Check out the gate");
        const gate = report.slice(from, report.indexOf("\n\n    #", from) + 1);
        assert.ok(gate.length > 1000, "found the gate steps");
        // The old visual job is gone (#3473): the story tests' capture replaced it after two zero-difference runs.
        assert.ok(!parseJobs(ci).visual, "no old visual job");
        assert.equal(sha(gate), "575b27ce4867b26ba3159100b157c8333074616ef5be1a8aa2c2a0576b42823e");
    });

    it("keeps the screenshot report out of All Checks Pass, so a pull request never waits on captures (#3443)", () => {
        const jobs = parseJobs(ci);
        assert.ok(!jobs["all-checks"].needs.includes("visual"), "All Checks Pass must not need the visual job");
        // comments dropped: the next job's leading comment ends the all-checks slice
        const allChecks = job(ci, "all-checks").replace(/^ *#.*$/gm, "");
        assert.ok(!/visual/.test(allChecks), "All Checks Pass reads nothing of the screenshots");
        const report = job(ci, "visual-report");
        assert.deepEqual(jobs["visual-report"].needs, ["packages", "story-tests", "story-tests-merge"]);
        assert.match(report, /\n {8}name: Visual report\n/);
        assert.match(
            report,
            /\n {8}if: \$\{\{ !cancelled\(\) && github.event_name == 'pull_request' && needs.story-tests.result != 'skipped' \}\}\n/,
        );
        assert.match(report, /\n {8}continue-on-error: true\n/, "the job never fails the run");
        assert.match(
            report,
            /id: visual-gate\n {14}if: github.event_name == 'pull_request'\n {14}continue-on-error: true\n/,
        );
        assert.match(report, /- name: Report the visual gate \(does not block\)\n/);
        assert.match(report, /::warning title=Visual gate \(report only\)::/);
    });

    // The story tests are the only capture (#3473): the old built-Storybook capture and its parity job are gone,
    // and the report and the flaky-screenshot report read the story tests' captures.
    it("captures with the story tests only, on every kind of run", () => {
        const jobs = parseJobs(ci);
        assert.ok(!jobs.visual && !jobs["story-tests-parity"], "no old capture or parity job");
        assert.match(
            job(ci, "visual-flaky"),
            /\n {8}if: \$\{\{ !cancelled\(\) && needs.story-tests.result != 'skipped' \}\}\n/,
        );
        // what a pull request's All Checks Pass needs still runs: its own stories, captured by the Stories jobs
        assert.ok(jobs["all-checks"].needs.includes("stories"));
        assert.match(job(ci, "stories"), /github.event_name == 'pull_request'/);
        // the story tests feed the results store's flaky-story detection on a pull request too
        assert.doesNotMatch(job(ci, "story-tests"), /\n {8}if: .*pull_request/);
    });

    it("judges the full run's story tests by the store's quarantine, `-shots` families included", () => {
        const stories = job(ci, "story-tests");
        assert.match(
            stories,
            /- name: Read the results plan\n {14}if: steps\.skip\.outputs\.skip != 'true' && github\.event_name != 'pull_request'\n {14}continue-on-error: true\n[\s\S]*?node tools\/results\/plan-read\.mjs "\$pkg" "\$RUNNER_TEMP\/results-plan"/,
        );
        // plan-read.mjs asks for the `-shots` family of exactly the shards this job runs
        const include = parseYaml(ci).jobs["story-tests"].strategy.matrix.include;
        assert.deepEqual([...new Set(include.map((e) => e.shard))].sort(), [...STORY_SHARDS].sort());
    });

    it("runs the story tests' capture blocking, outside All Checks Pass", () => {
        const jobs = parseJobs(ci);
        for (const name of ["story-tests", "story-tests-merge"]) {
            assert.ok(jobs[name], `${name} exists`);
            // a broken story fails the job and so the workflow: the full run's CI lane goes red (#4612)
            assert.equal(jobs[name].coe, undefined, `${name} blocks`);
            // a pull request is gated by its own Stories jobs; this one runs whole projects
            assert.ok(!jobs["all-checks"].needs.includes(name), `All Checks Pass does not wait for ${name}`);
            // both combine steps judge with the blocking switch on: broken fails, a changed picture holds nightly
            assert.match(
                job(ci, name),
                /- name: Combine the capture\n.*\n {14}env:\n {18}VISUAL_REVIEW_BLOCKING: "1"\n/,
            );
        }
        assert.match(job(ci, "story-tests"), /VISUAL_REVIEW_STORY_OUT: /);
        // Through the results store like every test shard, and judged against the committed quarantine list.
        assert.match(job(ci, "story-tests"), /node tools\/results\/run-group\.mjs "\$SHARD"/);
        assert.match(job(ci, "story-tests"), /id-token: write/);
        // the combine step judges by the very list the run step judged by, which the run step writes
        assert.match(
            job(ci, "story-tests"),
            /RESULTS_QUARANTINE_OUT: \$\{\{ runner\.temp \}\}\/stories\/quarantine\.json/,
        );
        assert.match(job(ci, "story-tests"), /merge-results .*--quarantine "\$RUNNER_TEMP\/stories\/quarantine\.json"/);
        // the store quarantines a flaky story with an issue, which the step files
        assert.match(job(ci, "story-tests"), /issues: write/);
        // the pull request's own stories run here, so no token reaches them on a pull request
        assert.match(job(ci, "story-tests"), /persist-credentials: false/);
        assert.match(
            job(ci, "story-tests"),
            /RESULTS_PLAN: \$\{\{ runner\.temp \}\}\/results-plan\/results-plan\.json/,
        );
        assert.match(
            job(ci, "story-tests"),
            /GH_TOKEN: \$\{\{ github\.event_name != 'pull_request' && github\.token \|\| '' \}\}/,
        );
        // graph-io-fidelity runs in four legs (one job was about 44 of its 45 minutes); story-tests-merge combines
        // their partials, every leg's file once, into the one capture visual-<project>-<attempt>.
        for (let n = 1; n <= 4; n++) {
            assert.match(
                job(ci, "story-tests"),
                new RegExp(`name: graph-io-fidelity-${n}\\n\\s+part: ${n}\\n\\s+parts: 4\\n`),
            );
            assert.match(job(ci, "story-tests"), new RegExp(`vitest\\.storybook\\.config\\.ts --shard=${n}/4\\n`));
        }
        assert.match(job(ci, "story-tests"), /RESULTS_PART: \$\{\{ matrix\.part \}\}/);
        assert.match(job(ci, "story-tests"), /name: story-parts-\$\{\{ matrix\.name \}\}-/);
        // every attempt's parts, then each part's newest attempt: a re-run of failed jobs re-runs only the failed parts
        assert.match(job(ci, "story-tests-merge"), /pattern: story-parts-\$\{\{ matrix\.project \}\}-\*\n/);
        assert.match(job(ci, "story-tests-merge"), /sort -V \| awk .*sub\(\/-\[0-9\]\+\$\/, "", part\)/);
        assert.match(job(ci, "story-tests-merge"), /merge-results --project .* "\$RUNNER_TEMP"\/parts\/\*\/part-\*\//);
        assert.match(
            job(ci, "story-tests-merge"),
            /name: visual-\$\{\{ matrix\.project \}\}-\$\{\{ github\.run_attempt \}\}/,
        );
        // One matrix leg per project, each skipped when the run does not test its storybook shard.
        assert.match(job(ci, "story-tests"), /- project: graphty-element\n\s+shard: graphty-element-storybook-1\n/);
        assert.match(
            job(ci, "story-tests"),
            /- project: graphty\n\s+name: graphty-1\n\s+part: 1\n\s+parts: 2\n\s+shard: graphty-storybook\n/,
        );
        assert.match(job(ci, "story-tests"), /- project: layout\n\s+shard: layout\n/);
        assert.match(job(ci, "story-tests"), /- project: algorithms\n\s+shard: algorithms-browser\n/);
        assert.match(job(ci, "story-tests"), /- project: compact-mantine\n\s+shard: compact-mantine\n/);
        assert.match(job(ci, "story-tests"), /- project: cytoscape-extensions\n\s+shard: cytoscape-extensions\n/);
        assert.match(
            job(ci, "story-tests"),
            /- project: graph-io-fidelity\n\s+name: graph-io-fidelity-1\n\s+part: 1\n\s+parts: 4\n\s+shard: graph-io-browser\n/,
        );
        assert.match(job(ci, "story-tests"), /format\('"\{0\}"', matrix\.shard\)/);
        // Each leg finds its shard in the test matrix as '"<shard>"', also when the shard runs in a group
        // (algorithms-browser is a member of small-browser): for one package alone and for all of them.
        const legs = [...job(ci, "story-tests").matchAll(/^\s+shard: (\S+)$/gm)].map((m) => m[1]);
        assert.ok(legs.includes("algorithms-browser"));
        const jobIf = job(ci, "story-tests").match(/^\s+if: (.*)$/m)[1];
        for (const shard of legs) {
            const own = SHARDS.find((s) => s.shard === shard);
            // A pull request's light check runs it as a file-level bin named after it, not as itself.
            const bins = { bins: [{ name: `${shard}-1`, shard, covers: [shard], command: "true", files: ["x"] }] };
            for (const [affected, light] of [[PACKAGES], [[own.package]], [[own.package], bins]]) {
                const matrix = JSON.stringify(plan(affected, undefined, light));
                assert.ok(matrix.includes(`"${shard}"`), `${shard} for ${affected.join(",")} ${light ? "binned" : ""}`);
            }
            // The job's own condition names every leg's shard, or a leg alone in a run is never started.
            assert.ok(jobIf.includes(`'"${shard}"'`), `the story-tests job's if names ${shard}`);
        }
    });

    // #4109: graphty's capture was the CI lane's longest job, which the full run's re-capture waits for
    it("splits a story-tests project into vitest shards 1..N/N, each once, all merged by story-tests-merge", () => {
        const jobs = parseYaml(ci).jobs;
        const include = jobs["story-tests"].strategy.matrix.include;
        const split = [...new Set(include.filter((r) => r.parts).map((r) => r.project))].sort();
        assert.deepEqual(split, ["graph-io-fidelity", "graphty"]);
        assert.deepEqual([...jobs["story-tests-merge"].strategy.matrix.project].sort(), split);
        for (const project of split) {
            const legs = include.filter((r) => r.project === project);
            const parts = legs[0].parts;
            assert.ok(
                legs.every((r) => r.parts === parts && r.name === `${project}-${r.part}`),
                project,
            );
            // every shard of the split once, so vitest runs every story file in exactly one leg
            assert.deepEqual(
                legs.map((r) => r.part).sort((a, b) => a - b),
                Array.from({ length: parts }, (_, i) => i + 1),
            );
            for (const r of legs) assert.ok(r.command.endsWith(` --shard=${r.part}/${parts}`), r.name);
            // and every leg tests the same files of the same project
            assert.equal(new Set(legs.map((r) => r.command.replace(/ --shard=\S+$/, ""))).size, 1, project);
        }
        // story-tests-merge's artifact pattern for one split project never matches another project's parts
        for (const a of split)
            for (const b of include.map((r) => r.name).filter(Boolean)) {
                if (!b.startsWith(`${a}-`)) continue;
                assert.match(b.slice(a.length + 1), /^\d+$/, `story-parts-${a}-* would match ${b}`);
            }
    });

    it("finds every story-tests leg's shard in the planned matrix, alone or folded into a group", () => {
        // The job's `if` and its skip step look for `"<shard>"` in the test-matrix JSON. A shard folded into a
        // group (layout in small-node, algorithms-browser in small-browser) is there only as a group member.
        const legs = [...job(ci, "story-tests").matchAll(/- project: (\S+)\n\s+shard: (\S+)\n/g)].map((m) => m[2]);
        assert.ok(legs.length >= 4, "the legs were read");
        const each = (affected) => JSON.stringify({ include: plan(affected) });
        const runs = [PACKAGES, ["graph-format", "layout", "algorithms"], ["layout"], ["algorithms"]];
        for (const affected of runs) {
            const matrix = each(affected);
            for (const shard of legs) {
                const pkg = SHARDS.find((s) => s.shard === shard).package;
                assert.equal(matrix.includes(`"${shard}"`), affected.includes(pkg), `${shard} with ${affected}`);
            }
        }
    });

    it("is not seen by the workflows that react to master's CI", () => {
        for (const name of ["master-guard.yml", "deploy-pages.yml", "release.yml"]) {
            const on = workflow(name);
            const triggers = on.slice(on.indexOf("\non:\n"), on.search(/\n(permissions|concurrency|jobs|env):/));
            assert.doesNotMatch(triggers, /Golden verify|golden-/, name);
        }
    });
});

// Every job of a workflow: its direct needs, its job-level continue-on-error (`coe`) and its steps, each
// named by its `name`, or by its `uses` when it has none, with its id, if, coe and a one-line run.
const parseJobs = (text) => {
    const jobs = {};
    let job;
    let step;
    let inNeeds = false;
    for (const line of text.slice(text.indexOf("\njobs:\n")).split("\n")) {
        let m = /^ {4}([\w-]+):\s*$/.exec(line);
        if (m) {
            job = jobs[m[1]] = { needs: [], steps: [] };
            step = undefined;
            inNeeds = false;
            continue;
        }
        if (!job) continue;
        if (/^ {8}\S/.test(line)) {
            step = undefined;
            inNeeds = line.startsWith("        needs:");
            if ((m = /^ {8}continue-on-error:\s*(.*)$/.exec(line))) job.coe = m[1];
        }
        if (inNeeds) job.needs.push(...(line.replace(/^ {8}needs:/, "").match(/[\w-]+/g) ?? []));
        if ((m = /^ {12}- (?:([\w-]+):\s*(.*))?/.exec(line))) {
            step = {};
            job.steps.push(step);
            if (m[1]) step[m[1]] = m[2];
        } else if (step && (m = /^ {14}([\w-]+):\s*(.*)$/.exec(line))) step[m[1]] = m[2];
    }
    for (const j of Object.values(jobs))
        j.steps = j.steps.map((s) => ({ ...s, name: s.name ?? s.uses, coe: s["continue-on-error"] }));
    return jobs;
};

// The (job, step) pairs that can fail "All Checks Pass": every step of every job
// in its `needs` closure, less a job or step marked `continue-on-error: true`, as { job: [step names] }.
const requiredChecks = (jobs) => {
    const closure = new Set();
    const visit = (name) => {
        if (closure.has(name) || !jobs[name]) return;
        closure.add(name);
        for (const need of jobs[name].needs) visit(need);
    };
    visit("all-checks");
    return Object.fromEntries(
        [...closure]
            .filter((name) => jobs[name].coe !== "true")
            .map((name) => [name, jobs[name].steps.filter((s) => s.coe !== "true").map((s) => s.name)]),
    );
};

const DAY = 86_400_000;
// The job that lists the advisory checks (its "List advisory checks" step) and that every other job
// reads them from.
const LIST_JOB = "packages";
const idOf = (a) => (a.step === undefined ? a.job : `${a.job}/${a.step}`);

// What is wrong with tools/ci-advisory-checks.json against ci.yml and against the base branch's copies of
// both, and which entries are due for promotion. "required" lists jobs, not steps, so renaming, adding or
// removing a step inside a required job never touches the registry. A warning period is granted only to a
// job or step the base branch does not require yet, and "required" grows only by jobs the base branch
// already runs, so a pull request can neither put an existing check back into a warning period nor skip a
// new job's.
// The dates warn and never fail: an entry past its enforce date is simply required (the build job drops
// it from the list), so no run turns red because a calendar day passed.
const advisoryProblems = ({ ci, registry, baseCi, baseRegistry, today }) => {
    const jobs = parseJobs(ci);
    const checks = requiredChecks(jobs);
    const baseChecks = requiredChecks(parseJobs(baseCi));
    const baseAdvisory = new Set((baseRegistry?.advisory ?? []).map(idOf));
    const problems = [];
    const warnings = [];
    const check = (ok, message) => {
        if (!ok) problems.push(message);
        return ok;
    };

    for (const job of Object.keys(checks))
        check(
            registry.required.includes(job) || registry.advisory.some((a) => a.job === job && a.step === undefined),
            `${job}: unregistered: a new job goes into "advisory" first`,
        );
    // A job that only holds steps the base branch already requires (a required job split in two) is not
    // a new check: its steps were required yesterday, so they stay required without a warning period.
    const baseSteps = new Set(Object.values(baseChecks).flat());
    // A job the base branch runs report-only (job-level continue-on-error: true) has served its warning period.
    const baseJobs = parseJobs(baseCi);
    for (const job of registry.required) {
        check(job in checks, `${job}: in "required" but not a required job of ci.yml`);
        if (baseRegistry && !baseRegistry.required.includes(job))
            check(
                job in baseChecks ||
                    baseJobs[job]?.coe === "true" ||
                    (job in checks && checks[job].every((step) => baseSteps.has(step))),
                `${job}: "required" only grows by jobs the base branch already runs, or jobs made of steps it already requires; a new one goes into "advisory" first`,
            );
    }

    for (const a of registry.advisory) {
        const id = idOf(a);
        if (!check(/^\d{4}-\d\d-\d\d$/.test(a.added) && /^\d{4}-\d\d-\d\d$/.test(a.enforce), `${id}: dates`)) continue;
        check(Number.isInteger(a.issue), `${id}: names its tracking issue`);
        const added = Date.parse(a.added);
        const enforce = Date.parse(a.enforce);
        check(enforce > added && enforce <= added + 21 * DAY, `${id}: enforce within 21 days of added`);
        if (Date.parse(today) >= enforce - 3 * DAY)
            warnings.push(`${id}: required from ${a.enforce}: move it into "required" and drop its warning wiring`);
        if (!baseAdvisory.has(id)) {
            check(
                a.step === undefined ? !(a.job in baseChecks) : !baseChecks[a.job]?.includes(a.step),
                `${id}: the base branch already requires it, so it cannot go back to a warning period`,
            );
            check(a.added <= today, `${id}: added in the future`);
        }
        const j = jobs[a.job];
        if (!check(a.job in checks, `${id}: a job "All Checks Pass" needs`)) continue;
        const list = a.job === LIST_JOB ? "steps.advisory.outputs.checks" : `needs.${LIST_JOB}.outputs.advisory-checks`;
        const coe = `\${{ contains(fromJSON(${list}), '${id}') }}`;
        if (a.job !== LIST_JOB)
            check(
                j.needs.includes(LIST_JOB),
                `${id}: the job needs ${LIST_JOB} directly (it lists the advisory checks)`,
            );
        let warn;
        if (a.step === undefined) {
            check(!registry.required.includes(a.job), `${id}: a job in "required" is not new`);
            check(j.coe === coe, `${id}: job-level continue-on-error: ${coe}`);
            warn = { if: "${{ failure() }}", step: j.steps.at(-1) };
        } else {
            const i = j.steps.findIndex((s) => s.name === a.step);
            if (!check(i >= 0, `${id}: the step exists`)) continue;
            const s = j.steps[i];
            check(s.coe === coe, `${id}: continue-on-error: ${coe}`);
            check(s.id !== undefined, `${id}: has an id`);
            if (a.job === LIST_JOB)
                check(i > j.steps.findIndex((x) => x.id === "advisory"), `${id}: comes after "List advisory checks"`);
            warn = { if: `\${{ steps.${s.id}.outcome == 'failure' }}`, step: j.steps[i + 1] };
        }
        check(
            warn.step?.if === warn.if &&
                warn.step.coe === "true" &&
                warn.step.run?.includes(`::warning::advisory check ${id} failed`),
            `${id}: followed by a step with if: ${warn.if}, continue-on-error: true, run: echo "::warning::advisory check ${id} failed"`,
        );
    }
    return { problems, warnings };
};

const gitShow = (path) => {
    const r = spawnSync("git", ["show", `origin/master:${path}`], { encoding: "utf8" });
    return r.status === 0 ? r.stdout : undefined;
};

describe("dependabot.yml", () => {
    const text = readFileSync(new URL("../.github/dependabot.yml", import.meta.url), "utf8");
    it("opens every version update against master, the default branch (golden is retired, #3418)", () => {
        assert.doesNotMatch(text, /target-branch:/);
    });
    it("never bumps visual-seed.yml, which init generates from visual-review's template (#3898)", () => {
        const actions = text.slice(text.indexOf("package-ecosystem: github-actions"));
        assert.match(actions, /\n {6}exclude-paths: \[".github\/workflows\/visual-seed.yml"\]\n/);
    });
    const section = (eco) => {
        const start = text.indexOf(`package-ecosystem: ${eco}`);
        const next = text.indexOf("package-ecosystem:", start + 1);
        return text.slice(start, next === -1 ? undefined : next);
    };
    const groupsOf = (eco) => parseYaml(text).updates.find((u) => u["package-ecosystem"] === eco).groups;
    it("opens no routine version update: limit 0 stops them, security updates continue (owner, 2026-10-27)", () => {
        for (const eco of ["npm", "github-actions"]) {
            assert.match(section(eco), /\n {6}open-pull-requests-limit: 0\n/, eco);
            for (const [name, g] of Object.entries(groupsOf(eco))) {
                assert.equal(g["applies-to"], "security-updates", `${eco} group ${name}`);
            }
        }
    });
    it("groups security updates: Storybook together first, then all other npm packages, then all actions", () => {
        const npm = groupsOf("npm");
        // Dependabot puts a dependency in the first group that matches (#3294 and #3295 bumped Storybook apart)
        assert.deepEqual(Object.keys(npm), ["storybook-security", "npm-security"]);
        assert.deepEqual(npm["storybook-security"].patterns, ["storybook", "@storybook/*", "eslint-plugin-storybook"]);
        assert.deepEqual(npm["npm-security"].patterns, ["*"]);
        assert.deepEqual(groupsOf("github-actions")["actions-security"].patterns, ["*"]);
    });
});

describe("the Sentry source map upload", () => {
    const ci = workflow("ci.yml");
    const steps = Object.values(parseJobs(ci)).flatMap((j) => j.steps);
    const upload = steps.find((s) => s.name === "Upload graphty's source maps to Sentry (master push)");

    it("is never inside a build: the plugin's per-chunk re-mapping took graphty's build from 53 s to 13m33s", () => {
        // The token is what would switch a Sentry build plugin on, so only the upload step may hold it
        assert.deepEqual(ci.match(/SENTRY_AUTH_TOKEN: .*/g), ["SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}"]);
        assert.ok(
            !/sentry.*-plugin/i.test(readFileSync(new URL("../graphty/vite.config.ts", import.meta.url), "utf8")),
        );
    });

    it("runs right after the build, only on a push to master, the build canary.graphty.app deploys", () => {
        assert.ok(upload);
        assert.equal(
            upload.if,
            "steps.plan.outputs.full == 'true' && github.event_name == 'push' && " +
                "github.ref == 'refs/heads/master' && !inputs.ref",
        );
        const i = steps.indexOf(upload);
        assert.equal(steps[i - 1].name, "Build all (master, a manual dispatch or the merge queue)");
        assert.equal(steps[i + 1].name, "Upload all package builds");
        // deploy-pages.yml publishes only a push run's build, so that one carries the debug ids
        assert.match(workflow("deploy-pages.yml"), /github\.event\.workflow_run\.event == 'push'/);
    });

    it("injects debug ids before uploading, under the release the build stamped", () => {
        const body = ci.slice(ci.indexOf("- name: Upload graphty's source maps to Sentry"));
        const inject = body.indexOf("sentry-cli sourcemaps inject dist");
        const send = body.indexOf('sentry-cli sourcemaps upload --release "$SENTRY_RELEASE" dist');
        assert.ok(inject > 0 && send > inject);
        assert.equal(upload["working-directory"], "graphty");
        assert.equal((ci.match(/SENTRY_RELEASE: \$\{\{ github\.sha \}\}/g) ?? []).length, 2);
    });

    it("never cancels or fails the build: six master builds were cancelled by a hanging set-commits", () => {
        assert.equal(String(upload["continue-on-error"]), "true");
        assert.ok(Number(upload["timeout-minutes"]) > 0 && Number(upload["timeout-minutes"]) <= 5);
        // every sentry-cli call is bounded (written out per line, so knip sees the binary)
        const start = ci.indexOf("- name: Upload graphty's source maps to Sentry");
        const body = ci.slice(start, ci.indexOf("- name: Upload all package builds", start));
        const calls = body.match(/^.*pnpm exec sentry-cli.*$/gm) ?? [];
        assert.equal(calls.length, 5);
        for (const call of calls) assert.match(call, /timeout \d+ pnpm exec sentry-cli /);
    });
});

describe("new required checks start as warnings", () => {
    const ci = workflow("ci.yml");
    const registry = JSON.parse(readFileSync(new URL("ci-advisory-checks.json", import.meta.url), "utf8"));

    it("finds the required jobs and steps", () => {
        const checks = requiredChecks(parseJobs(ci));
        assert.ok(checks.packages.includes("Install dependencies"));
        assert.ok(checks.lint.includes("Lint all (master, a manual dispatch or the merge queue)"));
        // The visual gate reports and never blocks a pull request (#3418).
        assert.ok(!checks["all-checks"].includes("Check visual changes were accepted"));
        assert.ok(!("visual" in checks) && !("performance" in checks), "continue-on-error jobs never block");
        assert.ok(!checks["all-checks"].includes("Download visual captures"));
    });

    it("registers every required check, against ci.yml and the base branch", () => {
        const baseCi = gitShow(".github/workflows/ci.yml");
        assert.ok(baseCi, "origin/master's ci.yml (git fetch origin master)");
        const base = gitShow("tools/ci-advisory-checks.json");
        const { problems, warnings } = advisoryProblems({
            ci,
            registry,
            baseCi,
            baseRegistry: base && JSON.parse(base),
            today: new Date().toISOString().slice(0, 10),
        });
        for (const w of warnings) console.log(`::warning file=tools/ci-advisory-checks.json::${w}`);
        assert.deepEqual(problems, []);
    });

    describe("the registry rules, on a small workflow", () => {
        const BASE_CI = `on: push
jobs:
    packages:
        steps:
            - name: List advisory checks
              id: advisory
              run: x
            - name: Lint
              run: x
    test:
        needs: packages
        steps:
            - name: Unit
              run: x
    all-checks:
        needs: [packages, test]
        steps:
            - name: Check
              run: x
`;
        const HEAD_CI = BASE_CI.replace(
            "            - name: Unit\n              run: x\n",
            `            - name: Unit
              run: x
            - name: Types
              id: types
              continue-on-error: \${{ contains(fromJSON(needs.packages.outputs.advisory-checks), 'test/Types') }}
              run: x
            - name: Warn that Types failed
              if: \${{ steps.types.outcome == 'failure' }}
              continue-on-error: true
              run: echo "::warning::advisory check test/Types failed"
    links:
        needs: packages
        continue-on-error: \${{ contains(fromJSON(needs.packages.outputs.advisory-checks), 'links') }}
        steps:
            - name: Check links
              run: x
            - name: Warn that links failed
              if: \${{ failure() }}
              continue-on-error: true
              run: echo "::warning::advisory check links failed"
`,
        ).replace("needs: [packages, test]", "needs: [packages, test, links]");
        const REQUIRED = ["packages", "test", "all-checks"];
        const entry = (job, step) => ({ job, step, added: "2026-10-01", enforce: "2026-10-15", issue: 1 });
        const ADVISORY = [entry("test", "Types"), entry("links")];
        const run = ({ ci = HEAD_CI, required = REQUIRED, advisory = ADVISORY, today = "2026-10-05" } = {}) =>
            advisoryProblems({
                ci,
                registry: { required, advisory },
                baseCi: BASE_CI,
                baseRegistry: { required: REQUIRED, advisory: [] },
                today,
            });

        it("accepts a new job and a new step, each wired to warn", () => {
            assert.deepEqual(run(), { problems: [], warnings: [] });
        });

        it("warns, and never fails, from three days before an entry's enforce date", () => {
            const late = run({ today: "2026-11-30" });
            assert.deepEqual(late.problems, []);
            assert.equal(late.warnings.length, 2);
            assert.match(late.warnings[1], /^links: required from 2026-10-15/);
            assert.equal(run({ today: "2026-10-11" }).warnings.length, 0);
            assert.equal(run({ today: "2026-10-12" }).warnings.length, 2);
        });

        it("leaves the registry alone when a step of a required job is renamed, added or removed", () => {
            const renamed = HEAD_CI.replace("- name: Lint", "- name: Lint everything").replace(
                "            - name: Check\n",
                "            - name: Check\n              run: x\n            - name: Check again\n",
            );
            assert.deepEqual(run({ ci: renamed }), { problems: [], warnings: [] });
        });

        it("refuses to put a check the base branch requires back into a warning period", () => {
            const { problems } = run({ advisory: [...ADVISORY, entry("packages", "Lint")] });
            assert.ok(problems.some((p) => p.startsWith("packages/Lint: the base branch already requires it")));
            const job = run({ advisory: [...ADVISORY, entry("test")], required: ["packages", "all-checks"] });
            assert.ok(job.problems.some((p) => p.startsWith("test: the base branch already requires it")));
        });

        it("refuses a new job that skips its warning period", () => {
            const { problems } = run({ required: [...REQUIRED, "links"], advisory: [entry("test", "Types")] });
            assert.ok(problems.some((p) => p.startsWith('links: "required" only grows')));
        });

        it("accepts a new job made only of steps the base branch already requires", () => {
            // a required job split in two: the Lint step moves from packages into a job of its own
            const split = BASE_CI.replace("            - name: Lint\n              run: x\n", "").replace(
                "    all-checks:\n        needs: [packages, test]",
                "    lint:\n        needs: packages\n        steps:\n            - name: Lint\n              run: x\n    all-checks:\n        needs: [packages, test, lint]",
            );
            const ok = run({ ci: split, required: [...REQUIRED, "lint"], advisory: [] });
            assert.deepEqual(ok, { problems: [], warnings: [] });
            const added = split.replace(
                "            - name: Lint\n              run: x\n",
                "            - name: Lint\n              run: x\n            - name: Types\n              run: x\n",
            );
            assert.ok(
                run({ ci: added, required: [...REQUIRED, "lint"], advisory: [] }).problems.some((p) =>
                    p.startsWith('lint: "required" only grows'),
                ),
            );
        });

        it("accepts a job the base branch ran report-only straight into required (#3472)", () => {
            const report = `    report:
        needs: packages
        continue-on-error: true
        steps:
            - name: Report
              run: x
`;
            const required = `    report:
        needs: packages
        steps:
            - name: Report
              run: x
`;
            const base = BASE_CI.replace("    all-checks:", `${report}    all-checks:`);
            const head = BASE_CI.replace("    all-checks:", `${required}    all-checks:`).replace(
                "needs: [packages, test]",
                "needs: [packages, test, report]",
            );
            const check = (baseCi) =>
                advisoryProblems({
                    ci: head,
                    registry: { required: [...REQUIRED, "report"], advisory: [] },
                    baseCi,
                    baseRegistry: { required: REQUIRED, advisory: [] },
                    today: "2026-10-05",
                }).problems;
            assert.deepEqual(check(base), []);
            assert.ok(
                check(BASE_CI).some((p) => p.startsWith('report: "required" only grows')),
                "a new job still waits",
            );
        });

        it("refuses an unregistered job and a stale entry", () => {
            assert.ok(
                run({ advisory: [entry("test", "Types")] }).problems.includes(
                    'links: unregistered: a new job goes into "advisory" first',
                ),
            );
            const stale = run({ required: [...REQUIRED, "lint"] });
            assert.ok(stale.problems.includes('lint: in "required" but not a required job of ci.yml'));
        });

        it("refuses an entry that is not wired", () => {
            const unwired = (from, to) => run({ ci: HEAD_CI.replace(from, to) }).problems;
            assert.ok(
                unwired(/\n {8}continue-on-error: .*'links'.*/, "").some((p) =>
                    p.startsWith("links: job-level continue-on-error"),
                ),
            );
            assert.ok(
                unwired("    links:\n        needs: packages", "    links:\n        needs: test").some((p) =>
                    p.includes("needs packages directly"),
                ),
            );
            assert.ok(
                unwired("if: ${{ failure() }}", "if: always()").some((p) => p.startsWith("links: followed by a step")),
            );
            assert.ok(unwired("              id: types\n", "").some((p) => p === "test/Types: has an id"));
            assert.ok(
                unwired("'test/Types') }}", "'test/Type') }}").some((p) =>
                    p.startsWith("test/Types: continue-on-error"),
                ),
            );
        });
    });

    it("lists the entries before their enforce date, from the base branch on a pull request", () => {
        const step = /- name: List advisory checks\n[\s\S]*?\n {14}run: \|\n([\s\S]*?)\n\n/.exec(
            job(ci, "packages"),
        )[1];
        assert.match(step, /base=HEAD\^1/, "a pull request cannot loosen the list that judges it");
        const program = /jq -c --arg today "\$\(date -u \+%F\)" '([^']+)'/.exec(step);
        assert.ok(program, "the build job lists the advisory checks");
        const fixture = JSON.stringify({
            advisory: [
                { job: "links", added: "2026-10-01", enforce: "2026-10-08" },
                { job: "build", step: "Lint", added: "2026-10-01", enforce: "2026-10-08" },
                { job: "test", added: "2026-09-20", enforce: "2026-10-05" },
            ],
        });
        const r = spawnSync("jq", ["-c", "--arg", "today", "2026-10-05", program[1]], {
            input: fixture,
            encoding: "utf8",
        });
        assert.equal(r.stdout.trim(), '["links","build/Lint"]');
    });

    it("probes the nx remote cache in the Storybooks job the same way, writing only on master", () => {
        // build-storybook is cached (nx.json), so the Storybooks job reads the cache; its probe must be the
        // Build job's, tested below, and only master's runs may hold the write environment.
        const probe = (name) =>
            /- name: Probe the nx remote cache\n[\s\S]*?\n {14}run: \|\n([\s\S]*?)\n\n/.exec(job(ci, name))[1];
        assert.equal(probe("build"), probe("packages"));
        const env = (name) => /\n {8}environment: (.*)\n/.exec(job(ci, name))[1];
        assert.equal(env("build"), env("packages"));
        const nx = JSON.parse(readFileSync(new URL("../nx.json", import.meta.url), "utf8"));
        assert.equal(nx.targetDefaults["build-storybook"].cache, true);
    });

    it("probes the nx remote cache in the Lint job before linting, writing only on master", () => {
        // lint is cached (nx.json): a pull request that marks every project affected (nx.json, a project.json)
        // replays master's lint of the projects whose inputs it left alone instead of linting them again.
        const probe = (name) =>
            /- name: Probe the nx remote cache\n[\s\S]*?\n {14}run: \|\n([\s\S]*?)\n\n/.exec(job(ci, name))[1];
        assert.equal(probe("lint"), probe("packages"));
        const env = (name) => /\n {8}environment: (.*)\n/.exec(job(ci, name))[1];
        assert.equal(env("lint"), env("packages"));
        const lint = job(ci, "lint");
        assert.ok(lint.indexOf("- name: Probe the nx remote cache") < lint.indexOf("- name: Lint affected (PR)"));
        const nx = JSON.parse(readFileSync(new URL("../nx.json", import.meta.url), "utf8"));
        assert.equal(nx.targetDefaults.lint.cache, true);
        // A replayed lint is only right when its key holds everything lint reads: the files eslint.config.js
        // imports (its own rules) and the dependencies' source a project's tsc checks against.
        const inputs = nx.targetDefaults.lint.inputs;
        const config = readFileSync(new URL("../eslint.config.js", import.meta.url), "utf8");
        for (const [, dir] of config.matchAll(/from "\.\/(.+)\/[^/]+"/g)) {
            assert.ok(inputs.includes(`{workspaceRoot}/${dir}/**/*`), dir);
        }
        const root = new URL("../", import.meta.url);
        for (const dir of readdirSync(root)) {
            const file = new URL(`${dir}/project.json`, root);
            const own = existsSync(file) && JSON.parse(readFileSync(file, "utf8")).targets?.lint?.inputs;
            if (own) assert.ok(own.includes("^production"), dir);
        }
    });

    it("runs both knip passes in the Checks job and fails when either fails", () => {
        const step =
            /- name: Knip \(dead code detection and production dependencies\)\n {14}run: \|\n([\s\S]*?)\n\n/.exec(
                job(ci, "checks"),
            )[1];
        const dir = mkdtempSync(join(tmpdir(), "knip-step-"));
        const run = (dead, prod) => {
            writeFileSync(
                join(dir, "pnpm"),
                `#!/bin/bash\n[ "$2" = lint:knip ] && exit ${dead}\n[ "$2" = lint:knip:prod ] && exit ${prod}\nexit 9\n`,
                { mode: 0o755 },
            );
            return spawnSync("bash", ["-e", "-c", step], {
                env: { ...process.env, PATH: `${dir}:${process.env.PATH}` },
            }).status;
        };
        assert.equal(run(0, 0), 0);
        assert.notEqual(run(1, 0), 0);
        assert.notEqual(run(0, 1), 0);
    });

    it("keys every cached Storybook on everything graphty-element bundles", () => {
        // Storybooks import graphty-element's source by relative path (graph-io's fidelity stories do), which nx's
        // graph does not see; a workspace package missing here would restore a stale Storybook from the cache.
        const root = new URL("../", import.meta.url);
        const read = (p) => JSON.parse(readFileSync(new URL(p, root), "utf8"));
        const byPackage = new Map();
        for (const dir of readdirSync(root)) {
            const pkg = existsSync(new URL(`${dir}/package.json`, root)) && read(`${dir}/package.json`);
            if (!pkg || dir === "node_modules") continue;
            const project = existsSync(new URL(`${dir}/project.json`, root))
                ? read(`${dir}/project.json`).name
                : pkg.name;
            byPackage.set(pkg.name, { dir, project });
        }
        const closure = new Set();
        const walk = (name) => {
            const { dir, project } = byPackage.get(name);
            const pkg = read(`${dir}/package.json`);
            for (const dep of Object.keys({
                ...pkg.dependencies,
                ...pkg.peerDependencies,
                ...pkg.optionalDependencies,
            })) {
                if (byPackage.has(dep) && !closure.has(byPackage.get(dep).project)) {
                    closure.add(byPackage.get(dep).project);
                    walk(dep);
                }
            }
            return project;
        };
        closure.add(walk("@graphty/graphty-element"));
        const nx = read("nx.json");
        const listed = nx.targetDefaults["build-storybook"].inputs.find((i) => i.projects)?.projects ?? [];
        assert.deepEqual(
            [...closure].filter((p) => !listed.includes(p)),
            [],
        );
    });

    it("turns the nx remote cache on only when the Worker accepts the token", async () => {
        // nx fails the whole build on a 401 from the cache, so a wrong or unregistered token must turn it off.
        const run = /- name: Probe the nx remote cache\n[\s\S]*?\n {14}run: \|\n([\s\S]*?)\n\n/.exec(
            job(ci, "packages"),
        )[1];
        const { handle } = await import("./nx-cache-worker/src/cache.js");
        const env = {
            READ_TOKEN_HASHES: createHash("sha256").update("good").digest("hex"),
            CACHE: { get: async () => null },
        };
        const { createServer } = await import("node:http");
        const server = createServer(async (req, res) => {
            const r = await handle(new Request(`http://x${req.url}`, { headers: req.headers }), env);
            res.writeHead(r.status).end();
        }).listen(0, "127.0.0.1");
        await new Promise((resolve) => server.once("listening", resolve));
        const dir = mkdtempSync(join(tmpdir(), "nx-probe-"));
        const groups = [];
        const probe = (url, token) =>
            new Promise((resolve) => {
                writeFileSync(join(dir, "env"), "");
                const child = spawn("bash", ["-e", "-c", run], {
                    cwd: new URL("../", import.meta.url),
                    detached: true,
                    env: {
                        ...process.env,
                        NX_CACHE_URL: url,
                        NX_CACHE_TOKEN: token,
                        WRITES: "false",
                        GITHUB_ENV: join(dir, "env"),
                        GITHUB_STEP_SUMMARY: join(dir, "summary"),
                        RUNNER_TEMP: dir,
                    },
                    stdio: "ignore",
                });
                groups.push(child.pid);
                child.on("close", (code) => resolve({ code, env: readFileSync(join(dir, "env"), "utf8") }));
            });
        try {
            const url = `http://127.0.0.1:${server.address().port}`;
            const on = await probe(url, "good");
            assert.equal(on.code, 0);
            // nx is pointed at the timeout proxy (tools/nx-cache-proxy.mjs, #4193), which reaches the Worker.
            const proxy = /^NX_SELF_HOSTED_REMOTE_CACHE_SERVER=(http:\/\/127\.0\.0\.1:\d+)\n/.exec(on.env)?.[1];
            assert.ok(proxy, on.env);
            assert.match(on.env, /\nNX_SELF_HOSTED_REMOTE_CACHE_ACCESS_TOKEN=good\n$/);
            const miss = await fetch(`${proxy}/v1/cache/abc`, { headers: { authorization: "Bearer good" } });
            assert.equal(miss.status, 404);
            const refused = await fetch(`${proxy}/v1/cache/abc`, { headers: { authorization: "Bearer wrong" } });
            assert.equal(refused.status, 401);
            for (const [u, token] of [
                [url, "wrong"],
                [url, ""],
                ["", "good"],
                ["http://127.0.0.1:1", "good"],
            ]) {
                const off = await probe(u, token);
                assert.equal(off.code, 0, `${u} ${token}: the build goes on without the cache`);
                assert.equal(off.env, "", `${u} ${token}: the cache stays off`);
            }
        } finally {
            for (const pid of groups) {
                try {
                    process.kill(-pid);
                } catch {
                    // the group already ended
                }
            }
            server.close();
            rmSync(dir, { recursive: true, force: true });
        }
    });

    it("only warns about a failed job in its warning period", () => {
        const body = job(ci, "all-checks");
        const run = /- name: Check all jobs passed\n[\s\S]*?\n {14}run: \|\n([\s\S]*?)\n\n/.exec(body)[1];
        const verdict = (advisory) =>
            spawnSync("bash", ["-e", "-c", run], {
                encoding: "utf8",
                env: {
                    ...process.env,
                    BUILD: "success",
                    FULL: "true",
                    ADVISORY: advisory,
                    NEEDS: JSON.stringify({ build: { result: "success" }, links: { result: "failure" } }),
                },
            });
        const warned = verdict('["links"]');
        assert.equal(warned.status, 0, warned.stdout);
        assert.match(warned.stdout, /::warning::advisory check links: failure/);
        assert.equal(verdict("[]").status, 1);
        assert.equal(verdict('["build"]').status, 1);
    });
});

describe("the summary checks fail as soon as a required job fails", () => {
    const ci = workflow("ci.yml");
    const jobs = parseJobs(ci);
    // The jobs "All Checks Pass" fails on: every job it needs.
    const deciding = jobs["all-checks"].needs;

    it("ends every job whose failure fails them with the early-verdict step, on pull requests only", () => {
        assert.deepEqual([...deciding].sort(), [
            "build",
            "checks",
            "cost-accuracy",
            "docs",
            "links",
            "lint",
            "packages",
            "stories",
            "test",
        ]);
        for (const name of deciding) {
            const last = jobs[name].steps.at(-1);
            assert.equal(last.uses, "./.github/actions/early-verdict", name);
            assert.equal(last.if, "failure() && github.event_name == 'pull_request'", name);
            assert.equal(last.coe, "true", `${name}: a failure to post never changes the job's result`);
            assert.match(job(ci, name), new RegExp(`\\n {18}job: ${name}\\n`), name);
        }
        assert.match(ci, /\npermissions:\n {4}contents: read\n {4}checks: write\n/);
        assert.match(
            job(workflow("release.yml"), "ci"),
            /permissions:\n(?: {12}.*\n)*? {12}checks: write\n(?: {12}#.*\n| {12}.*\n)*? {8}uses: \.\/\.github\/workflows\/ci\.yml/,
            "a called workflow cannot ask for more than its caller grants",
        );
    });

    it("only ever reports a failure, and never for a job in its warning period", () => {
        const action = readFileSync(new URL("../.github/actions/early-verdict/action.yml", import.meta.url), "utf8");
        assert.match(action, /for check in "All Checks Pass"; do/);
        assert.equal(action.match(/conclusion=/g).length, 1);
        assert.match(action, /-f status=completed -f conclusion=failure/);
        const program = /if jq -e --arg job "\$JOB" '([^']+)'/.exec(action)[1];
        const advisory = (list, name) =>
            spawnSync("jq", ["-e", "--arg", "job", name, program], { input: list, encoding: "utf8" }).status === 0;
        assert.equal(advisory('["links"]', "links"), true);
        assert.equal(advisory('["links"]', "lint"), false);
        assert.equal(advisory("[]", "test"), false);
    });
});

describe("a passing summary job clears its early verdicts (#2639)", () => {
    // An early verdict lands in another workflow's check suite, which the summary job's own check run
    // does not replace, so Mergify kept reading it after a re-run passed.
    const ci = workflow("ci.yml");
    const jobs = parseJobs(ci);

    it("ends the summary job with the clearing step, on a passing pull request run only", () => {
        for (const [name, check] of [["all-checks", "All Checks Pass"]]) {
            const last = jobs[name].steps.at(-1);
            assert.equal(last.name, "Clear this check's early verdicts", name);
            assert.equal(last.if, "success() && github.event_name == 'pull_request'", name);
            // a clear that cannot finish fails the job, so the pull request is not left blocked in silence (#3857)
            assert.equal(last.coe, undefined, name);
            assert.match(job(ci, name), new RegExp(`\\n {18}CHECK: ${check}\\n`), name);
        }
    });

    // The step's script run against a stand-in gh (and sleep), the way the run's token answered on
    // 2026-10-26: "API rate limit exceeded for installation" on the first listing (#3857).
    const runClear = (jobName, { failList, resetIn }) => {
        const dir = mkdtempSync(join(tmpdir(), "early-verdict-"));
        const step = parseYaml(ci).jobs[jobName].steps.at(-1);
        writeFileSync(
            join(dir, "gh"),
            [
                "#!/bin/bash",
                'echo "gh $*" >> "$LOG"',
                'case "$*" in',
                '    *rate_limit*) echo "1 $(( $(date +%s) + RESET_IN ))" ;;',
                '    *"api graphql"*)',
                '        n=$(cat "$STATE" 2>/dev/null || echo 0); echo $((n + 1)) > "$STATE"',
                '        if (( n < FAIL_LIST )); then echo "gh: API rate limit exceeded for installation." >&2; exit 1; fi',
                "        echo 1 ;;",
                "esac",
            ].join("\n"),
            { mode: 0o755 },
        );
        writeFileSync(join(dir, "sleep"), '#!/bin/bash\necho "sleep $*" >> "$LOG"\n', { mode: 0o755 });
        const result = spawnSync("bash", ["-e", "-c", step.run], {
            encoding: "utf8",
            env: {
                ...process.env,
                PATH: `${dir}:${process.env.PATH}`,
                LOG: join(dir, "log"),
                STATE: join(dir, "state"),
                FAIL_LIST: String(failList),
                RESET_IN: String(resetIn),
                ...step.env,
                GITHUB_REPOSITORY: "o/r",
                SHA: "abc",
                RUN_URL: "https://x/actions/runs/7",
            },
        });
        const log = existsSync(join(dir, "log")) ? readFileSync(join(dir, "log"), "utf8") : "";
        rmSync(dir, { recursive: true, force: true });
        return { ...result, log };
    };

    it("waits for an exhausted API limit to reset and then clears, on any attempt (#3857)", () => {
        for (const name of ["all-checks"]) {
            const { status, stdout, log } = runClear(name, { failList: 1, resetIn: 30 });
            assert.equal(status, 0, name);
            assert.match(stdout, /cleared early verdict 1/, name);
            assert.match(log, /^sleep (3[0-5])$/m, name);
            assert.match(log, /gh api -X PATCH repos\/o\/r\/check-runs\/1 /, name);
        }
    });

    it("fails the job, loudly, when every try fails (#3857)", () => {
        const { status, stdout, log } = runClear("all-checks", { failList: 99, resetIn: 30 });
        assert.equal(status, 1);
        assert.match(stdout, /::error::could not clear the early verdicts of All Checks Pass/);
        assert.doesNotMatch(log, /PATCH/);
        assert.equal(log.match(/^gh api graphql /gm).length, 4);
        assert.equal(log.match(/^sleep /gm).length, 3);
    });

    // The listing is GraphQL, whose limit is separate from REST's: an exhausted REST limit held a run
    // 18 minutes on 2026-10-29 for nothing to clear. The query filters by name and conclusion; the jq
    // keeps only the verdicts a run posted, never a job's own check run, and refuses a truncated page.
    const listing = () => {
        const text = job(ci, "all-checks");
        return {
            query: /-f query='([^']+)'/.exec(text)[1],
            program: /--jq '([^']+)'\) \|\| return 1/.exec(text)[1],
        };
    };

    it("asks GraphQL for the failing check runs of its own name, every kind, never REST", () => {
        const { query } = listing();
        assert.match(query, /filterBy: \{checkName: \$check, checkType: ALL, conclusions: \[FAILURE\]\}/);
        assert.doesNotMatch(job(ci, "all-checks"), /commits\/\$SHA\/check-runs/);
    });

    it("rewrites only the early verdicts, never a job's check run, and refuses a truncated page", () => {
        const { program } = listing();
        const page = (more) => ({
            data: {
                repository: {
                    object: {
                        checkSuites: {
                            pageInfo: { hasNextPage: false },
                            nodes: [
                                { checkRuns: { pageInfo: { hasNextPage: false }, nodes: [] } },
                                {
                                    checkRuns: {
                                        pageInfo: { hasNextPage: more },
                                        nodes: [
                                            { databaseId: 1, detailsUrl: "https://x/actions/runs/7" },
                                            { databaseId: 2, detailsUrl: "https://x/actions/runs/7/job/9" },
                                        ],
                                    },
                                },
                            ],
                        },
                    },
                },
            },
        });
        const run = (more) => spawnSync("jq", [program], { input: JSON.stringify(page(more)), encoding: "utf8" });
        assert.equal(run(false).stdout.trim(), "1");
        const truncated = run(true);
        assert.notEqual(truncated.status, 0);
        assert.equal(truncated.stdout.trim(), "");
    });
});

describe("screenshots of Storybooks a pull request cannot affect", () => {
    const ci = workflow("ci.yml");
    const VISUAL = ["compact-mantine", "graphty-element", "layout", "algorithms", "graphty"];
    const ALL = [...PACKAGES, "@graphty/remote-logger", "visual-review"];
    const base = {
        on: true,
        pullRequest: true,
        labels: [],
        visual: VISUAL,
        all: ALL,
        affected: ["graph-io"],
        changed: ["graph-io/src/index.ts"],
    };

    it("leaves out the unaffected Storybooks on a pull request's own run", () => {
        assert.deepEqual(skippedProjects(base), VISUAL);
        assert.deepEqual(
            skippedProjects({
                ...base,
                affected: ["layout", "graphty-element", "graphty"],
                changed: ["layout/src/a.ts"],
            }),
            ["compact-mantine", "algorithms"],
        );
    });

    it("captures the style fidelity Storybook when graph-io or graphty-element is affected", () => {
        const fidelity = { ...base, visual: ["graph-io-fidelity"] };
        assert.deepEqual(skippedProjects(fidelity), []);
        assert.deepEqual(
            skippedProjects({ ...fidelity, affected: ["graphty-element"], changed: ["graphty-element/a.ts"] }),
            [],
        );
        assert.deepEqual(skippedProjects({ ...fidelity, affected: ["layout"], changed: ["layout/src/a.ts"] }), [
            "graph-io-fidelity",
        ]);
    });

    it("captures everything when off, in the queue or on master, after a dequeue, or with a root file changed", () => {
        assert.deepEqual(skippedProjects({ ...base, on: false }), []);
        assert.deepEqual(skippedProjects({ ...base, pullRequest: false }), []);
        assert.deepEqual(skippedProjects({ ...base, labels: ["queued", "dequeued"] }), []);
        assert.deepEqual(skippedProjects({ ...base, changed: [] }), []);
        for (const root of [
            "pnpm-lock.yaml",
            "tools/storybook-brand-theme.mjs",
            "tools/visual-capture-plan.mjs",
            ".github/workflows/ci.yml",
            ".github/actions/playwright-system-deps/install.sh",
            "visual-baselines/layout/a.png",
            "visual-fonts/fonts.conf",
            "docs/x.md",
        ]) {
            assert.deepEqual(skippedProjects({ ...base, changed: ["graph-io/src/index.ts", root] }), [], root);
        }
    });

    it("judges a change to workflows, tools and design documents no Storybook reads by its packages alone", () => {
        const changed = ["graph-io/src/index.ts", ".github/workflows/release.yml", "tools/full-run.mjs", "design/x.md"];
        assert.deepEqual(
            skippedProjects({ ...base, changed }),
            skippedProjects({ ...base, changed: changed.slice(0, 1) }),
        );
        assert.notDeepEqual(skippedProjects({ ...base, changed }), []);
    });

    it("still sees a root file a pull request moves into a package", () => {
        const dir = mkdtempSync(join(tmpdir(), "visual-plan-"));
        const git = (...args) => {
            const r = spawnSync("git", args, { cwd: dir, encoding: "utf8" });
            assert.equal(r.status, 0, r.stderr);
            return r.stdout.trim();
        };
        try {
            // Two trees, no commits: the diff is the same, and nothing needs signing.
            git("init", "-q");
            mkdirSync(join(dir, "graph-io"));
            writeFileSync(join(dir, "root.json"), '{"a": 1, "b": 2, "c": 3}\n');
            git("add", ".");
            const before = git("write-tree");
            git("mv", "root.json", "graph-io/root.json");
            const after = git("write-tree");
            const changed = changedFiles(`${before}..${after}`, dir);
            assert.deepEqual(changed.sort(), ["graph-io/root.json", "root.json"]);
            assert.deepEqual(skippedProjects({ ...base, changed }), []);
        } finally {
            rmSync(dir, { recursive: true, force: true });
        }
    });

    it("is switched on in ci.yml (master's gate accepts the not-affected marker)", () => {
        const build = job(ci, "packages");
        assert.match(build, /\n {18}SKIP_UNAFFECTED_CAPTURES: "true"\n/);
        assert.match(build, /LABELS: \$\{\{ toJSON\(github\.event\.pull_request\.labels\.\*\.name\) \}\}/);
        assert.match(build, /node tools\/visual-capture-plan\.mjs "\$all" "\$affected" \| tee -a "\$GITHUB_OUTPUT"/);
        assert.match(build, /visual-skip: \$\{\{ steps\.plan\.outputs\.visual-skip \}\}/);
        // the Storybooks job starts beside the packages job (#3448), so it hands on no plan: a job that needs
        // both reads the plan from the packages job
        assert.match(job(ci, "build"), /\n {8}needs: run-cap\n/);
        assert.doesNotMatch(ci, /needs\.build\.outputs\./);
    });

    it("uploads the not-affected marker as the capture of a project the story tests skip", () => {
        const story = job(ci, "story-tests");
        const steps = story.split(/\n(?= {12}- (?:name|uses): )/).slice(1);
        const skip = steps.findIndex((t) => /- name: Skip a project this run does not test\n {14}id: skip\n/.test(t));
        assert.ok(skip >= 0, "the skip step");
        assert.match(steps[skip], /\{"skipped":"not affected","project":"%s"\}/);
        assert.match(steps[skip + 1], /- name: Upload the not-affected marker\n/);
        assert.match(
            steps[skip + 1],
            /if: .*steps\.skip\.outputs\.skip == 'true' && \(!matrix\.parts \|\| matrix\.part == 1\)/,
        );
        assert.match(steps[skip + 1], /name: visual-\$\{\{ matrix\.project \}\}-\$\{\{ github\.run_attempt \}\}/);
    });

    // What the old visual job promised for a skipped project: nothing but the marker and the summary runs.
    it("skips every other step of a project the story tests skip, but the marker and the summary", () => {
        const steps = job(ci, "story-tests")
            .split(/\n(?= {12}- (?:name|uses): )/)
            .slice(1);
        const skip = steps.findIndex((t) => /\n {14}id: skip\n/.test(t));
        for (const step of steps.slice(skip + 2)) {
            const title = step.trim().split("\n")[0];
            if (/Write the counts/.test(title)) assert.match(step, /if: always\(\)/, title);
            else assert.match(step, /\n {14}if: .*steps\.skip\.outputs\.skip != 'true'/, title);
        }
    });

    it("uploads every capture, combined or merged, under the one name the gate reads, even after a failed step", () => {
        const name = /name: visual-\$\{\{ matrix\.project \}\}-\$\{\{ github\.run_attempt \}\}/;
        const upload = (j) => j.slice(j.indexOf("- name: Upload the capture\n"));
        assert.match(upload(job(ci, "story-tests")), name);
        assert.match(
            upload(job(ci, "story-tests")),
            /if: \$\{\{ steps\.skip\.outputs\.skip != 'true' && !cancelled\(\)/,
        );
        assert.match(upload(job(ci, "story-tests-merge")), name);
        assert.match(
            upload(job(ci, "story-tests-merge")),
            /if: \$\{\{ !cancelled\(\) && steps\.found\.outputs\.any != ''/,
        );
        // a project split into parts is merged only when the story tests ran at all
        assert.match(job(ci, "story-tests-merge"), /\n {8}needs: story-tests\n/);
    });

    it("leaves no job waiting on the removed capture or its parity", () => {
        for (const [name, j] of Object.entries(parseYaml(workflow("ci.yml")).jobs)) {
            const needs = [j.needs ?? []].flat();
            assert.ok(
                !needs.includes("visual") && !needs.includes("story-tests-parity"),
                `${name} needs a removed job`,
            );
        }
        assert.doesNotMatch(ci, /needs\.visual\.|needs\.story-tests-parity\./);
    });

    it("writes the marker the trusted gate reads", async () => {
        const { isSkipMarker, SKIPPED_FILE } = await import("../visual-review/trusted/lib/results.mjs");
        const story = job(ci, "story-tests");
        assert.ok(story.includes(`"$RUNNER_TEMP/not-affected/${SKIPPED_FILE}"`));
        const printf = /printf '(.+?)\\n' "\$PROJECT"/.exec(story)[1];
        assert.ok(isSkipMarker(JSON.parse(printf.replace("%s", "layout")), "layout"));
    });
});

describe("base-check.yml", () => {
    const steps = () => parseYaml(workflow("base-check.yml")).jobs.check.steps;

    it("runs master's own copy of the tools against the base's tests", () => {
        const all = steps();
        const take = all.findIndex((s) => s.name === "Take the tools from master");
        const run = all.findIndex((s) => s.name === "Run the file");
        assert.ok(take > 0 && take < run, "the tools are taken from master before the file runs");
        assert.match(all[run].run, /^node "\$RUNNER_TEMP\/trusted\/tools\/results\/cli\.mjs" base-check /);
        for (const s of all) assert.doesNotMatch(s.run ?? "", /^node tools\//m, `${s.name} runs the base's own tools`);
    });

    it("takes the tools of this run's commit, not the base's, against a throwaway repository", () => {
        const dir = mkdtempSync(join(tmpdir(), "base-check-"));
        const git = (...a) => execFileSync("git", a, { cwd: join(dir, "base"), encoding: "utf8" });
        mkdirSync(join(dir, "base/tools/results"), { recursive: true });
        execFileSync("git", ["init", "-q", "-b", "master"], { cwd: join(dir, "base") });
        git("config", "user.email", "t@t");
        git("config", "user.name", "t");
        git("config", "commit.gpgsign", "false");
        writeFileSync(join(dir, "base/tools/results/cli.mjs"), "old\n");
        git("add", ".");
        git("commit", "-qm", "base");
        const base = git("rev-parse", "HEAD").trim();
        writeFileSync(join(dir, "base/tools/results/cli.mjs"), "new\n");
        git("commit", "-qam", "master");
        const master = git("rev-parse", "HEAD").trim();
        git("checkout", "-q", base);
        git("remote", "add", "origin", join(dir, "base"));
        const script = steps().find((s) => s.name === "Take the tools from master").run;
        execFileSync("bash", ["-euo", "pipefail", "-c", script], {
            cwd: join(dir, "base"),
            env: { ...process.env, GITHUB_SHA: master, RUNNER_TEMP: dir },
        });
        assert.equal(readFileSync(join(dir, "trusted/tools/results/cli.mjs"), "utf8"), "new\n");
        assert.equal(readFileSync(join(dir, "base/tools/results/cli.mjs"), "utf8"), "old\n");
        rmSync(dir, { recursive: true, force: true });
    });
});

describe("pr-title.yml", () => {
    it("skips the whole job, not a step, for Mergify's own merge-queue draft and only for it", () => {
        // A skipped job completes at once; a job that installs first leaves the required check in progress
        // for a minute after each of Mergify's body edits.
        const pr = workflow("pr-title.yml");
        assert.ok(pr.includes(`        name: Lint PR Title\n`));
        assert.ok(pr.includes(`\n        if: \${{ !(${QUEUE}) }}\n        runs-on: ubuntu-24.04\n`));
        assert.equal(pr.split(QUEUE).length, 2);
    });
    // The breaking-change step's script, against a stub gh: one GraphQL page with the commits, the labels and
    // who added them; `fail` is gh's error output for a failed call.
    const breaking = ({ title = "fix(tools): a", commits = ["fix: a"], labels = [], by = [], fail = "" } = {}) => {
        const pr = workflow("pr-title.yml");
        const body = pr.slice(pr.indexOf("- name: No breaking change without the owner's go"));
        const script = /run: \|\n([\s\S]*?)\n\n/.exec(body)[1].replaceAll(/^ {18}/gm, "");
        const dir = mkdtempSync(join(tmpdir(), "pr-breaking-"));
        const page = {
            data: {
                repository: {
                    pullRequest: {
                        labels: { nodes: labels.map((name) => ({ name })) },
                        timelineItems: {
                            nodes: by.map((login) => ({ label: { name: "breaking-go" }, actor: { login } })),
                        },
                        commits: {
                            pageInfo: { hasNextPage: false, endCursor: null },
                            nodes: commits.map((message) => ({ commit: { message } })),
                        },
                    },
                },
            },
        };
        writeFileSync(join(dir, "page.json"), JSON.stringify(page));
        writeFileSync(join(dir, "fail.txt"), fail);
        writeFileSync(
            join(dir, "gh"),
            `#!/bin/bash\n[ "$1 $2" = "api graphql" ] || exit 9\n` +
                `if [ -s "${dir}/fail.txt" ]; then cat "${dir}/fail.txt" >&2; exit 1; fi\ncat "${dir}/page.json"\n`,
            { mode: 0o755 },
        );
        const r = spawnSync("bash", ["-e", "-o", "pipefail", "-c", script], {
            encoding: "utf8",
            env: {
                ...process.env,
                PR: "1",
                PR_TITLE: title,
                OWNER: "apowers313",
                GITHUB_REPOSITORY: "o/r",
                RUNNER_TEMP: dir,
                PATH: `${dir}:${process.env.PATH}`,
            },
        });
        rmSync(dir, { recursive: true, force: true });
        breaking.stdout = r.stdout;
        return r.status;
    };
    it("fails a breaking change until the owner adds breaking-go, and re-checks on a label", () => {
        assert.match(workflow("pr-title.yml"), /types: \[opened, edited, synchronize, reopened, labeled, unlabeled\]/);
        assert.equal(breaking(), 0);
        assert.equal(breaking({ commits: ["fix: a", "feat(tools)!: drop"] }), 1, "a breaking commit pushed later");
        assert.equal(breaking({ commits: ["fix: a\n\nBREAKING CHANGE: gone"] }), 1);
        assert.equal(breaking({ title: "feat!: x" }), 1, "a breaking title");
        assert.equal(breaking({ commits: ["feat!: x"], labels: ["breaking-go"], by: ["graphty-agent"] }), 1);
        assert.equal(breaking({ commits: ["feat!: x"], labels: ["breaking-go"], by: ["apowers313"] }), 0);
        assert.equal(breaking({ commits: ["feat!: x"], by: ["apowers313"] }), 1, "the label was removed");
    });
    it("fails closed, naming the cause, when the GitHub API cannot be asked", () => {
        assert.equal(breaking({ fail: "gh: API rate limit exceeded for installation ID 1. (HTTP 403)" }), 1);
        assert.match(breaking.stdout, /::error::GitHub API rate limit for this repository ran out; re-run this check/);
        assert.equal(breaking({ fail: "HTTP 502: Bad Gateway" }), 1);
        assert.match(breaking.stdout, /::error::could not read this pull request's commits and labels/);
    });
    it("is never cancelled by a later run, so Mergify's body edits cannot interrupt the required check", () => {
        // A concurrency group cancels superseded runs even without cancel-in-progress.
        assert.doesNotMatch(workflow("pr-title.yml"), /^concurrency:/m);
    });
});

describe("pr-issue-link.yml", () => {
    it("passes a closing keyword, in any case, with or without a colon, for #N or owner/repo#N", () => {
        for (const kw of ["close", "closes", "closed", "fix", "fixes", "fixed", "resolve", "resolves", "resolved"]) {
            for (const text of [`${kw} #12`, `${kw.toUpperCase()}: #12`, `${kw} graphty-org/graphty-monorepo#12`]) {
                assert.ok(linksIssue(`Some change.\n\n${text}.`), text);
            }
        }
    });
    it("passes Refs, Ref and Part of", () => {
        for (const text of ["Refs #12", "ref: #12", "Part of #12", "part  of #12"]) assert.ok(linksIssue(text), text);
    });
    it("passes a line that is only No issue, in any case", () => {
        assert.ok(linksIssue("Bumps a dependency.\n\n  no ISSUE  \n"));
        assert.ok(linksIssue("No issue\r\nmore"));
        assert.ok(!linksIssue("There is no issue for this yet."));
    });
    it("fails an empty description, a bare number, and a keyword with no issue", () => {
        for (const body of [
            undefined,
            "",
            "Filed as #12 and not changed here.",
            "Fixes 12",
            "prefixes #12",
            "Fixes the bug",
        ]) {
            assert.ok(!linksIssue(body), String(body));
        }
    });
    it("skips Dependabot, and only Dependabot", () => {
        assert.ok(skipReason({ author: "dependabot[bot]" }));
        // releases no longer open a pull request (owner decision, 2026-10-11)
        assert.equal(skipReason({ author: "github-actions[bot]" }), null);
        assert.equal(skipReason({ author: "someone" }), null);
    });
    it("skips the whole job for Mergify's own merge-queue draft, and re-runs on a description edit", () => {
        const wf = workflow("pr-issue-link.yml");
        assert.ok(wf.includes(`        name: Link PR Issue\n`));
        assert.ok(wf.includes(`\n        if: \${{ !(${QUEUE}) }}\n        runs-on: ubuntu-24.04\n`));
        assert.match(wf, /types: \[opened, edited, synchronize, reopened\]/);
        assert.doesNotMatch(wf, /^concurrency:/m);
        // never in an environment variable: one over 128 KiB stops the runner starting the step
        assert.doesNotMatch(wf, /pull_request\.body/);
    });
    it("reads a description over 128 KiB from the event file (run 40001752947: E2BIG)", () => {
        const run = (body) => {
            const event = join(TMP, "pr-event.json");
            writeFileSync(event, JSON.stringify({ pull_request: { body } }));
            const env = { ...process.env, PR_AUTHOR: "someone", GITHUB_EVENT_PATH: event };
            delete env.PR_BODY;
            return spawnSync(process.execPath, [new URL("pr-issue-link.mjs", import.meta.url).pathname], {
                encoding: "utf8",
                env,
            });
        };
        const long = "- land: fix/some-branch, merged into golden\n".repeat(4000);
        assert.ok(long.length > 128 * 1024);
        assert.equal(run(`${long}Fixes #3342\n`).status, 0);
        assert.equal(run("a".repeat(200 * 1024)).status, 1);
        assert.equal(run(null).status, 1);
    });
    it("fails with the message that says what to add", () => {
        const run = (env) =>
            spawnSync(process.execPath, [new URL("pr-issue-link.mjs", import.meta.url).pathname], {
                encoding: "utf8",
                env: { ...process.env, HEAD_REF: "fix/x", PR_AUTHOR: "someone", SAME_REPO: "true", ...env },
            });
        const bad = run({ PR_BODY: "" });
        assert.equal(bad.status, 1);
        assert.match(bad.stderr, /Add 'Fixes #123' \(or Closes\/Resolves\), 'Refs #123'.*a line 'No issue'/);
        assert.equal(run({ PR_BODY: "Fixes #1611" }).status, 0);
        assert.equal(run({ PR_BODY: "", PR_AUTHOR: "dependabot[bot]" }).status, 0);
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

    it("makes apt drop a stalled connection and retry", () => {
        // Run 40555956340: apt stalled up to 148 s per connection and spent 24 minutes on 114 MB.
        const action = readFileSync(
            new URL("../.github/actions/drop-microsoft-apt-source/action.yml", import.meta.url),
            "utf8",
        );
        assert.match(action, /tee \/etc\/apt\/apt\.conf\.d\/99-ci-timeouts/);
        assert.match(action, /Acquire::http::Timeout "20";.*Acquire::https::Timeout "20";.*Acquire::Retries "5";/);
    });
});

describe("actions/cache in the workflows", () => {
    it("never keys a cache on the commit and never caches .nx/cache", () => {
        // The Nx cache never hit (release commits change every package.json, and nx.json sharedGlobals
        // includes .github/workflows/**) and its key held github.sha, so every run saved a new 600 MB entry
        // into the 10 GB Actions cache and pushed the Git LFS baseline caches toward eviction.
        const dir = new URL("../.github/workflows/", import.meta.url);
        let checked = 0;
        for (const file of readdirSync(dir).filter((f) => f.endsWith(".yml"))) {
            const code = readFileSync(new URL(file, dir), "utf8").replace(/^\s*#.*$/gm, "");
            for (const step of code.split(/\n\s+- (?=name:|uses:)/)) {
                if (step.includes(".nx/cache")) assert.fail(`${file}: a step caches .nx/cache`);
                if (!/actions\/cache(\/\w+)?@/.test(step)) continue;
                assert.doesNotMatch(step, /github\.sha/, `${file}: a cache key holds github.sha`);
                checked++;
            }
        }
        assert.ok(checked >= 4, `found the cache steps (${checked})`);
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

    it("installs through the action in ci.yml's test and story-tests jobs, never with apt directly", () => {
        const ci = workflow("ci.yml").replace(/^\s*#.*$/gm, "");
        const test = job(ci, "test");
        assert.doesNotMatch(test, /--with-deps|install-deps/);
        assert.match(test, /if: matrix\.needs-browser\n\s+uses: \.\/\.github\/actions\/playwright-system-deps\n/);
        assert.match(test, /run: pnpm exec playwright install chromium\n/);
        // the story tests took over the old visual job's capture, and its install rule with it
        const story = job(ci, "story-tests");
        assert.doesNotMatch(story, /--with-deps|install-deps/);
        assert.match(
            story,
            /\n\s+uses: \.\/\.github\/actions\/playwright-system-deps\n\s+with:\n\s+browsers: chromium\n/,
        );
        assert.match(story, /run: pnpm exec playwright install chromium\n/);
    });

    // Runs install.sh against a fake apt: sudo logs its arguments (and really runs rm), pnpm answers
    // the dry run with PKGS and the install by writing DOWNLOADS into the archive directory, and
    // dpkg-query reports the packages named in INSTALLED as installed.
    const run = ({ hit, cached = [], stale = [], downloads = [], aptSays = "", installed = "a b" }) => {
        const home = mkdtempSync(join(TMP, "pw-debs-"));
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

describe("Mergify is retired", () => {
    it("has no .mergify.yml: changes land through the golden branch (tools/land.mjs)", () => {
        assert.equal(existsSync(new URL("../.mergify.yml", import.meta.url)), false);
    });
    it("uploads nothing to Mergify: GitHub refused its token with 403 on every test job", () => {
        for (const name of readdirSync(new URL("../.github/workflows/", import.meta.url))) {
            assert.doesNotMatch(workflow(name), /gha-mergify-ci|Mergify Test Insights/, name);
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
        // the T4 tests the commit the train selected, not the train's own checkout
        assert.match(
            job(gpu, "test-gpu"),
            /- uses: actions\/checkout@v\d+\n {14}with: \{ ref: "\$\{\{ inputs.ref \}\}" \}/,
        );
        assert.doesNotMatch(gpu, /gpu-lane-needed|T4 GPU gate/);
    });

    it("runs on an on-demand T4 by default, the release train included, with spot and hosted as dispatch options", () => {
        // owner decision, 2026-10-08 (spot reclaims held releases); a workflow_call declares no runner input, so the
        // train takes the default
        assert.match(
            job(gpu, "test-gpu"),
            /runs-on: \$\{\{ inputs\.runner \|\| 'machine\/gpu=t4\/cpu=4\/ram=16\/tenancy=on_demand' \}\}/,
        );
        assert.match(gpu, /default: machine\/gpu=t4\/cpu=4\/ram=16\/tenancy=on_demand\n/);
        for (const option of ["gpu-linux-t4", "machine/gpu=t4/cpu=4/ram=16/tenancy=spot"]) {
            assert.ok(gpu.includes(`- ${option}\n`), option);
        }
        assert.doesNotMatch(triggers(gpu).split("workflow_dispatch:")[0], /runner:/);
        assert.match(
            job(workflow("gpu-weekly-paired.yml"), "paired"),
            /runs-on: machine\/gpu=t4\/cpu=4\/ram=16\/tenancy=on_demand\n/,
        );
    });

    it("runs every T4 job in the ubuntu:24.04 container, since the 22.04 host cannot load Dawn", () => {
        // The machine.dev host's libstdc++ lacks GLIBCXX_3.4.32, which webgpu 0.6.x's dawn.node needs: a T4 job on the
        // bare host gets E_NO_WEBGPU at its adapter report (issue #2313: the weekly failed that way every week).
        const dir = new URL("../.github/workflows/", import.meta.url);
        let checked = 0;
        for (const file of readdirSync(dir).filter((f) => f.endsWith(".yml"))) {
            const code = readFileSync(new URL(file, dir), "utf8").replace(/^\s*#.*$/gm, "");
            for (const body of code.split(/\n(?= {4}[a-z][\w-]*:\n)/)) {
                if (!/\n {8}runs-on: .*gpu=t4/.test(body)) continue;
                const where = `${file}: ${body.trim().split("\n")[0]}`;
                assert.match(body, /\n {8}container:\n {12}image: ubuntu:24\.04\n {12}options: --gpus all\b/, where);
                assert.match(body, /NVIDIA_DRIVER_CAPABILITIES: all\n/, where);
                // the whole apt-get install command, with its backslash-continued lines
                const install = body.match(/apt-get install(?:[^\n]*\\\n)*[^\n]*/)?.[0] ?? "";
                assert.match(install, /\blibvulkan1 libegl1\b/, where);
                assert.match(
                    install,
                    /\blibatomic1\b/,
                    `${where}: pnpm/action-setup v6 runs @pnpm/exe, which links libatomic.so.1`,
                );
                assert.doesNotMatch(body, /modprobe/, `${where}: a container cannot load kernel modules`);
                if (/\bgh (issue|api|pr|run) /.test(body)) {
                    assert.match(install, /\sgh\s/, `${where}: calls gh, so installs it`);
                }
                checked++;
            }
        }
        assert.ok(checked >= 2, `found the T4 jobs (${checked})`);
    });

    it("builds nx's project graph from graphty-element, where the T4's element step runs nx", () => {
        // nx names a project that only @nx/eslint infers by reading <root>/package.json relative to the
        // process's cwd, so from a package directory it failed "have no name provided" (release run
        // 40119894804, issue #3318) while graph-io/test/fidelity/oracles/tools/web was a project of its
        // own. That directory is now part of graph-io; this keeps any such directory from coming back.
        assert.match(job(gpu, "test-gpu"), /working-directory: graphty-element\n.*\n {14}run: pnpm exec nx run-many/);
        const r = spawnSync("pnpm", ["exec", "nx", "show", "projects", "--json"], {
            cwd: new URL("../graphty-element/", import.meta.url),
            encoding: "utf8",
            env: { ...process.env, NX_DAEMON: "false" },
        });
        assert.equal(r.status, 0, `${r.stdout}\n${r.stderr}`);
        assert.ok(JSON.parse(r.stdout).includes("graph-io"));
    });

    it("leaves no pull request or master push able to start a paid T4 anywhere", () => {
        const dir = new URL("../.github/workflows/", import.meta.url);
        for (const file of readdirSync(dir).filter((f) => f.endsWith(".yml"))) {
            const text = readFileSync(new URL(file, dir), "utf8");
            if (!/gpu=t4|gpu-linux-t4|uses: \.\/\.github\/workflows\/gpu\.yml/.test(text.replace(/^\s*#.*$/gm, ""))) {
                continue;
            }
            assert.doesNotMatch(triggers(text), /^ {4}(pull_request|pull_request_target|push|merge_group)\b/m, file);
        }
    });
});

describe("the same-commit re-run of a finished run (release-rerun.yml)", () => {
    const rerun = workflow("release-rerun.yml");
    const held = job(workflow("release.yml"), "held");

    it("watches every run that holds a T4 job or a full run's lanes: GPU, the Release run, the weekly benchmark", () => {
        // a workflow_call's jobs belong to the CALLER's run, so the train's T4 is seen only through "Release"
        assert.match(rerun, /workflows: \["GPU", "Release", "GPU weekly paired benchmark"\]\n\s+types: \[completed\]/);
        assert.match(workflow("release.yml"), /^name: Release\n/);
        assert.match(workflow("gpu.yml"), /^name: GPU\n/m);
        assert.match(workflow("gpu-weekly-paired.yml"), /^name: GPU weekly paired benchmark\n/m);
        assert.equal(existsSync(new URL("../.github/workflows/gpu-rerun-on-runner-loss.yml", import.meta.url)), false);
    });

    it("looks at a first attempt that failed or was cancelled (a job timeout), and a second one that was cancelled, and leaves the decision to tools/release-rerun.mjs", () => {
        assert.match(
            rerun,
            /if: github.event_name == 'workflow_dispatch' \|\| \(contains\(fromJSON\('\["failure","cancelled","timed_out"\]'\), github.event.workflow_run.conclusion\) && github.event.workflow_run.run_attempt == 1\) \|\| \(github.event.workflow_run.conclusion == 'cancelled' && github.event.workflow_run.run_attempt == 2\)\n/,
        );
        assert.match(rerun, /run: node tools\/release-rerun.mjs\n/);
        assert.doesNotMatch(
            rerun.replace(/^\s*#.*$/gm, ""),
            /gh run rerun/,
            "the script re-runs, so release-watch.yml can ask it the same question",
        );
        assert.match(rerun, /TITLE: \$\{\{ github.event.workflow_run.display_title \|\| env.D_TITLE \}\}/);
    });

    it("re-runs a full run's lanes, re-capture and verdict, and never its version, land, publish or hold jobs", () => {
        const jobs = parseYaml(workflow("release.yml")).jobs;
        const never = [
            "pick",
            "held",
            "version",
            "approve",
            "land",
            "unhold",
            "publish",
            "site",
            "candidate_branch",
            "candidate_fix",
            "keep_builds",
            "resume",
            // a re-run would move channel/full-run and dispatch a second hand-off run
            "handoff",
            // runs again in every attempt anyway: it needs every job, with always()
            "watchers",
            // the missed-slot alarm reports; it never fails the run (continue-on-error) and a re-run of the
            // verdict runs it again as a dependent
            "slot",
        ];
        for (const [id, j] of Object.entries(jobs)) {
            const name = j.name.replace(/\$\{\{ matrix.project \}\}/, "graphty");
            assert.equal(rerunnable(name), !never.includes(id), `${id} (${name})`);
        }
        // a called workflow's jobs are named "<caller job> / <job>"
        assert.equal(rerunnable("CI / test (graphty-1)"), true);
    });

    it("re-captures every project ci.yml's story tests capture, from this run's artifacts, into visual-final", () => {
        const release = parseYaml(workflow("release.yml")).jobs;
        const story = parseYaml(workflow("ci.yml")).jobs["story-tests"];
        const projects = (include) => [...new Set(include.map((r) => r.project))].sort();
        assert.deepEqual(projects(release.recapture.strategy.matrix.include), projects(story.strategy.matrix.include));
        const text = job(workflow("release.yml"), "recapture");
        assert.match(text, /needs: \[pick, ci\]/);
        assert.match(text, /pattern: visual-\$\{\{ matrix.project \}\}-\*/);
        assert.match(text, /node tools\/channel\/recapture.mjs plan --project "\$PROJECT"/);
        assert.match(
            text,
            /pnpm exec visual-review capture --project "\$PROJECT" --out "\$RUNNER_TEMP\/second" --stories "\$STORIES"/,
        );
        assert.match(text, /name: visual-final-\$\{\{ matrix.project \}\}-\$\{\{ github.run_attempt \}\}/);
        // a legged project: every leg 1..legs once, and recapture_merge builds its one visual-final (#4172)
        const legged = release.recapture.strategy.matrix.include.filter((r) => r.leg);
        for (const p of new Set(legged.map((r) => r.project))) {
            const legs = legged.filter((r) => r.project === p);
            assert.deepEqual(
                legs.map((r) => r.leg),
                Array.from({ length: legs[0].legs }, (_, k) => k + 1),
            );
        }
        assert.deepEqual(
            release.recapture_merge.strategy.matrix.include.map((r) => r.project),
            [...new Set(legged.map((r) => r.project))],
        );
        assert.ok(legged.some((r) => r.project === "graph-io-fidelity"));
        assert.match(text, /plan --project "\$PROJECT" --captures "\$RUNNER_TEMP\/first" \$\{LEG:\+--leg "\$LEG"\}/);
        // ci.yml's gate step is untouched: the re-capture is release.yml's own job
        assert.doesNotMatch(workflow("ci.yml"), /visual-final|recapture/);
    });

    // #3952: the first nightly run's candidate predated tools/channel/recapture.mjs, so every re-capture failed
    it("runs master's nightly code, never the picked commit's, in every job that checks the pick out", () => {
        const nightlyCode = /tools\/channel\//;
        // the one overlay step (tools/own-tools-overlay.test.mjs)
        const overlay = /git archive "\$GITHUB_SHA" \$OVERLAY \| tar -x/;
        const own = parseYaml(workflow("release.yml")).jobs.recapture.steps.find((st) => overlay.test(st.run ?? ""));
        // #4940: the re-capture shoots with the candidate's capture code, the code the CI lane's story tests shot
        // the first picture with (ci.yml takes master's capture code only for a pull request); master's would draw
        // a different picture whenever the two differ, and every re-shot story would read as flaky
        assert.equal(own.env.OVERLAY, "tools .github/actions");
        const ci = parseYaml(workflow("ci.yml")).jobs["story-tests"].steps;
        assert.ok(
            ci.some(
                (st) => /git archive HEAD\^1 \$CAPTURE_CODE/.test(st.run ?? "") && /pull_request/.test(st.if ?? ""),
            ),
            "ci.yml's story tests take other capture code only for a pull request; re-check the re-capture if not",
        );
        let checked = 0;
        for (const [id, j] of Object.entries(parseYaml(workflow("release.yml")).jobs)) {
            const steps = j.steps ?? [];
            const at = steps.findIndex((st) => /needs\.(pick|version)\.outputs/.test(st.with?.ref ?? ""));
            if (at < 0) continue;
            const uses = steps.findIndex((st, i) => i > at && nightlyCode.test(st.run ?? "") && !overlay.test(st.run));
            if (uses < 0) continue;
            checked++;
            const from = steps.findIndex((st, i) => i > at && overlay.test(st.run ?? ""));
            assert.ok(from > at && from < uses, `${id}: runs ${steps[uses].name ?? "a step"} from the picked commit`);
        }
        assert.ok(checked > 0, "the re-capture job checks out the pick and runs tools/channel");
    });

    // workflow_run.name is the run-name ("Release (full)"), which never equals the workflow's name "Release",
    // so the first nightly run's deferred red was neither re-run nor filed
    it("hands release-rerun.mjs the workflow's name, not the run's", () => {
        const step = parseYaml(workflow("release-rerun.yml")).jobs.rerun.steps.at(-1);
        assert.equal(step.env.WORKFLOW, "${{ github.event.workflow.name || 'Release' }}");
    });

    it("keeps each attempt's verdict for the next attempt and for release-rerun.yml", () => {
        const verdict = job(workflow("release.yml"), "verdict");
        assert.match(verdict, /RUN_ATTEMPT: \$\{\{ github.run_attempt \}\}/);
        assert.match(verdict, /RECORD: \$\{\{ runner.temp \}\}\/record\/verdict-\$\{\{ github.run_attempt \}\}.json/);
        assert.match(verdict, /name: verdict-\$\{\{ github.run_attempt \}\}\n/);
        assert.match(
            verdict,
            /if: \$\{\{ github.run_attempt > 1 \}\}\n[^\n]*\n[^\n]*\n\s+with:\n\s+pattern: verdict-\*/,
        );
    });

    it("abandons the held candidate in nightly-abandon.yml, with no approval and outside the train's group", () => {
        const yml = workflow("nightly-abandon.yml");
        const wf = parseYaml(yml);
        // the owner, 2026-10-27: abandoning publishes nothing and the next full run undoes it, so it waits for nobody
        assert.deepEqual(Object.keys(wf.on), ["workflow_dispatch"]);
        assert.equal(wf.on.workflow_dispatch.inputs.reason.required, true);
        assert.equal(wf.concurrency.group, "nightly-abandon");
        assert.doesNotMatch(yml.replace(/^\s*#.*$/gm, ""), /release-train|production/);
        const job = wf.jobs.abandon;
        assert.equal(job.environment, "release");
        assert.deepEqual(Object.keys(wf.jobs), ["abandon"]);
        assert.equal(job.steps.find((st) => st.id === "end").run, "node tools/channel/hold.mjs end");
        assert.match(job.steps.find((st) => st.id === "end").env.WHY, /\$\{\{ inputs.reason \}\}/);
        assert.match(
            yml,
            /--force-with-lease=refs\/heads\/channel\/candidate:"\$HEAD_SHA" origin :refs\/heads\/channel\/candidate/,
        );
    });

    it("holds a candidate only from the verdict's decision, and ends the hold on its promotion or an abandon", () => {
        const release = workflow("release.yml");
        const jobs = parseYaml(release).jobs;
        const hold = jobs.verdict.steps.find((st) => st.id === "hold");
        assert.equal(
            hold.if,
            "${{ steps.verdict.outputs.hold == 'start' || steps.verdict.outputs.hold == 'update' || steps.verdict.outputs.hold == 'replace' }}",
        );
        assert.equal(hold.run, 'node tools/channel/hold.mjs "$HOLD"');
        // a red hold a newer green run replaced (#5052) loses its channel/candidate here too
        assert.equal(
            jobs.candidate_branch.if,
            "${{ !cancelled() && (needs.verdict.outputs.hold == 'start' || needs.verdict.outputs.replaced != '') }}",
        );
        // abandoning is its own workflow, needing no approval (owner, 2026-10-27; it blocked nightly for 6 hours
        // waiting in production): no abandon mode or job is left here
        assert.ok(!Object.keys(jobs).some((id) => id.startsWith("abandon")));
        assert.doesNotMatch(
            release,
            /mode == 'abandon'|- abandon\n|environment: production # the owner's approval\n {8}permissions: \{\}/,
        );
        assert.match(
            jobs.unhold.if,
            /needs.land.outputs.pushed == 'true' && \(\(needs.pick.outputs.held != '' && needs.pick.outputs.held == \(needs.pick.outputs.tested \|\| needs.pick.outputs.sha\)\) \|\| needs.pick.outputs.resume == 'true'\)/,
        );
        assert.ok(jobs.unhold.steps.some((st) => st.run === "node tools/channel/hold.mjs end"));
        // after the owner's approval, the tested head is recorded approved, so the same approval never promotes again
        const approved = jobs.unhold.steps.find((st) => st.run === "node tools/channel/resume.mjs record");
        assert.equal(approved.if, "${{ needs.pick.outputs.resume == 'true' }}");
        assert.equal(approved.env.STATE, "approved");
    });

    it("opens no Release held issue for a first attempt the re-run will repeat, using the same test", () => {
        assert.match(held, /tools\/gpu-runner-lost.sh\n/);
        const skip = held.indexOf(
            `if [ "$GITHUB_RUN_ATTEMPT" = 1 ] && tools/gpu-runner-lost.sh "$GITHUB_RUN_ID" 1; then`,
        );
        assert.ok(skip > 0, "the held job asks the same question");
        assert.match(
            held.slice(skip),
            /^[^\n]*\n\s+echo "::warning::[^\n]*\n\s+echo "reclaimed=true" >> "\$GITHUB_OUTPUT"\n\s+exit 0\n/,
        );
        // and announces nothing: the re-run attempt announces its own outcome
        assert.match(
            held,
            /- name: Announce the held release\n\s+if: \$\{\{ always\(\) && steps.hold.outputs.reclaimed != 'true' && inputs.mode != 'shadow' \}\}/,
        );
        assert.ok(skip < held.indexOf("tools/release-held.sh open"), "before the issue is opened");
        // versioning still requires a green T4: the re-run attempt must pass it
        assert.match(job(workflow("release.yml"), "version"), /needs.t4.result == 'success'/);
    });

    describe("tools/gpu-runner-lost.sh, against a stub gh", () => {
        const LOST = "The runner has received a shutdown signal. This can happen when the runner service is stopped";
        const lost = (failed, annotations) => {
            const bin = mkdtempSync(join(tmpdir(), "runner-lost-"));
            const lines = Object.entries(annotations)
                .map(([id, msg]) => `*/check-runs/${id}/annotations) echo "${msg}";;`)
                .join("\n");
            writeFileSync(
                join(bin, "gh"),
                `#!/bin/bash\ncase "$2" in\n*/runs/7/attempts/1/jobs*) printf '%s\\n' ${failed.join(" ")};;\n${lines}\n*) exit 3;;\nesac\n`,
                { mode: 0o755 },
            );
            const r = spawnSync("bash", [new URL("./gpu-runner-lost.sh", import.meta.url).pathname, "7", "1"], {
                encoding: "utf8",
                env: { ...process.env, GITHUB_REPOSITORY: "o/r", PATH: `${bin}:${process.env.PATH}` },
            });
            rmSync(bin, { recursive: true, force: true });
            return r.status;
        };

        it("says lost when every failed job lost its runner", () => {
            assert.equal(lost(["11"], { 11: LOST }), 0);
            assert.equal(
                lost(["11", "12"], { 11: LOST, 12: "The self-hosted runner lost communication with the server." }),
                0,
            );
        });

        it("says not lost for a real failure, alone or beside a lost runner, and for no failed job", () => {
            assert.equal(lost(["11"], { 11: "Process completed with exit code 1." }), 1);
            assert.equal(lost(["11", "12"], { 11: LOST, 12: "Process completed with exit code 1." }), 1);
            assert.equal(lost([], {}), 1);
        });
    });
});

describe("the webgpu-graph-algorithms node suite on every lane", () => {
    // Issue #1884: the files that hold the GPU for seconds per submission are the node-gpu-alone project, which runs
    // after the node project and alone. A lane that names only `--project=node` silently drops them.
    it("selects node-gpu-alone wherever it selects the node project, except a run of one named file", () => {
        const pkg = JSON.parse(
            readFileSync(new URL("../webgpu-graph-algorithms/package.json", import.meta.url), "utf8"),
        );
        const lines = [
            ...SHARDS.map((s) => s["test-command"]),
            ...Object.values(pkg.scripts),
            ...workflow("hosts.yml").split("\n"),
            ...workflow("gpu.yml").split("\n"),
        ].filter(
            (line) =>
                /run-node-shard\.js|vitest run/.test(line) &&
                /--project[= ]node(?![\w-])/.test(line) &&
                !/\.test\.ts\b/.test(line),
        );
        assert.ok(lines.length >= 9, `found only ${lines.length} node-suite invocations`);
        for (const line of lines) {
            assert.match(line, /--project[= ]node-gpu-alone\b/, line);
        }
    });
});

describe("hosts.yml", () => {
    it("runs no nightly, and a pull request's Windows leg on the short scope", () => {
        const hosts = workflow("hosts.yml");
        // the full run every 6 hours calls it on master's candidate; a cron would test master twice
        assert.doesNotMatch(hosts.slice(0, hosts.indexOf("\njobs:")), /^ {4}schedule:/m);
        // a push to master runs no tests: the release train runs Hosts on its candidate instead
        assert.doesNotMatch(hosts.slice(0, hosts.indexOf("\njobs:")), /^ {4}push:/m);
        assert.match(hosts, /NARROW: .*github.event_name == 'pull_request'/);
    });
});

describe("master-guard", () => {
    const run = (name, conclusion, event = "push") => ({ name, conclusion, event });

    it("freezes on a red master CI, lifts on a green one, and leaves the hardware lanes to the release train", () => {
        assert.equal(decide(run("CI", "failure")), "red");
        assert.equal(decide(run("CI", "timed_out")), "red");
        assert.equal(decide(run("CI", "success")), "green");
        assert.equal(decide(run("CI", "cancelled")), "stopped");
        assert.equal(decide(run("CI", "failure", "workflow_dispatch")), "none");
        // Hosts and the T4 run only in the release train, which files its own issue
        assert.equal(decide(run("Hosts", "failure", "schedule")), "none");
        assert.equal(decide(run("Hosts", "failure", "workflow_dispatch")), "none");
        assert.equal(decide(run("GPU", "failure")), "none");
        assert.match(workflow("master-guard.yml"), /workflows: \["CI", "Deploy to GitHub Pages"\]/);
    });

    // Master CI runs 40227703075 to 40231980144 ended `cancelled` (the Build job ran into its timeout) and the
    // guard, acting only on `failure`, said nothing (#3560).
    it("alarms on a master CI run that stopped without a verdict, unless a newer run superseded it", async () => {
        assert.equal(decide(run("CI", "cancelled")), "stopped");
        assert.equal(decide(run("CI", "startup_failure")), "stopped");
        assert.equal(decide(run("CI", "cancelled", "pull_request")), "none");
        // timed_out and failure stay red: freeze, revert and issue as before
        assert.equal(decide(run("CI", "timed_out")), "red");
        assert.equal(decide(run("CI", "failure")), "red");

        const stopped = {
            id: 6,
            head_sha: "c".repeat(40),
            created_at: "2026-10-25T10:00:00Z",
            updated_at: "2026-10-25T10:12:30Z",
        };
        // jobs: how many jobs the stopped run started (0: it was still waiting when it stopped)
        const lister = (runs, jobs = 0) => {
            const calls = [];
            const gh = async (path) => {
                calls.push(path);
                if (path.startsWith(`/actions/runs/${stopped.id}/jobs`)) {
                    return { total_count: jobs };
                }
                assert.match(path, /^\/actions\/workflows\/ci\.yml\/runs\?branch=master&event=push/);
                return { workflow_runs: [...runs, stopped] };
            };
            return { gh, calls };
        };
        const newer = (created_at) => ({ id: 7, head_sha: "d".repeat(40), created_at });

        // a waiting build a newer push replaced (ci.yml's master-push group, #3938): no job started, superseded
        let fake = lister([newer("2026-10-25T10:05:00Z")]);
        assert.equal(await superseded(fake.gh, stopped), true);
        assert.equal(fake.calls.length, 2, "a jobs call and one runs-list call");
        // a running build that stopped (a job ran into its timeout, or a person cancelled it) alarms, even with a
        // newer push queued behind it: ci.yml never cancels a running master build, so nothing newer stopped it
        fake = lister([newer("2026-10-25T10:05:00Z")], 4);
        assert.equal(await superseded(fake.gh, stopped), false);
        assert.equal(fake.calls.length, 1, "no runs-list call once a job ran");
        assert.match(fake.calls[0], /^\/actions\/runs\/6\/jobs/, "it asks about the stopped run's own jobs");
        // a re-run is in its commit's own group, so a newer push never replaces it: a stopped re-run alarms
        fake = lister([newer("2026-10-25T10:05:00Z")]);
        assert.equal(await superseded(fake.gh, { ...stopped, run_attempt: 2 }), false);
        assert.equal(fake.calls.length, 0, "no calls");
        // no job started, but no newer run at all, or only a re-run of the same commit: alarms
        assert.equal(await superseded(lister([]).gh, stopped), false);
        assert.equal(
            await superseded(lister([{ ...newer("2026-10-25T10:12:20Z"), head_sha: stopped.head_sha }]).gh, stopped),
            false,
        );
    });

    it("reports a failed canary deploy, which runs on CI's workflow_run event", () => {
        assert.equal(decide(run("Deploy to GitHub Pages", "failure", "workflow_run")), "deploy-red");
        assert.equal(decide(run("Deploy to GitHub Pages", "timed_out", "workflow_run")), "deploy-red");
        assert.equal(decide(run("Deploy to GitHub Pages", "success", "workflow_run")), "none");
        assert.equal(decide(run("Deploy to GitHub Pages", "cancelled", "workflow_run")), "none");
        // the guard job's filter lets the deploy's event through, and the name matches deploy-pages.yml's
        assert.match(workflow("master-guard.yml"), /event == 'workflow_run'/);
        assert.match(workflow("deploy-pages.yml"), /^name: Deploy to GitHub Pages$/m);
    });

    it("finds the commit in its own freezes and the pull request in a merge commit", () => {
        const sha = "a".repeat(40);
        assert.equal(frozenSha(`${FREEZE_PREFIX}${sha} (url)`), sha);
        assert.equal(frozenSha("release freeze"), null);
        assert.deepEqual(mergedPrs("Merge pull request #1011 from graphty-org/x\n\nbody"), [1011]);
        assert.deepEqual(mergedPrs("Merged #42, #43, #44\n\nMerged by Mergify Merge Queue"), [42, 43, 44]);
        assert.deepEqual(mergedPrs("Merged #42\n\nMerged by Mergify Merge Queue"), [42]);
        // the merges inside a batch branch are not landings of their own
        assert.deepEqual(mergedPrs("Merge of #42"), []);
        assert.deepEqual(mergedPrs("chore(release): publish"), []);
    });

    // A fake repository: open issues, and every write the guard makes. `racer` is an issue another run opens
    // between this run's lookup and its own create.
    const repo = (open, racer) => {
        const writes = [];
        let next = 2000;
        const gh = async (path, init = {}) => {
            const method = init.method ?? "GET";
            const body = init.body ? JSON.parse(init.body) : undefined;
            if (method === "GET" && path.startsWith("/issues?")) {
                assert.match(path, /state=open&labels=priority:critical/);
                return open.filter((i) => i.state !== "closed");
            }
            writes.push([method, path, body]);
            if (method === "POST" && path === "/issues") {
                if (racer) {
                    open.push(racer);
                }
                const created = { number: next++, title: body.title };
                open.push(created);
                return created;
            }
            if (method === "PATCH") {
                open.find((i) => `/issues/${i.number}` === path).state = body.state;
            }
            return {};
        };
        return { gh, writes };
    };
    const red = (sha) => ({
        prefix: FREEZE_PREFIX,
        title: `${FREEZE_PREFIX}${sha}`,
        labels: ["bug"],
        body: `body ${sha}`,
        comment: `also ${sha}`,
    });

    it("adds a red commit to the red-master issue already open instead of opening another", async () => {
        const { gh, writes } = repo([
            { number: 7, title: "Something else" },
            { number: 9, title: "Fix the thing", pull_request: {} },
            { number: 1124, title: `${FREEZE_PREFIX}7edecd1` },
        ]);
        assert.equal(await fileIssue(gh, red("056ee80")), 1124);
        assert.deepEqual(writes, [["POST", "/issues/1124/comments", { body: "also 056ee80" }]]);
    });

    it("opens an issue when none is open", async () => {
        const { gh, writes } = repo([{ number: 7, title: "GPU lane red on master" }]);
        assert.equal(await fileIssue(gh, red("7edecd1")), 2000);
        assert.deepEqual(writes, [
            ["POST", "/issues", { title: `${FREEZE_PREFIX}7edecd1`, labels: ["bug"], body: "body 7edecd1" }],
        ]);
    });

    it("closes its own issue as a duplicate when a racing run opened one first", async () => {
        const { gh, writes } = repo([], { number: 1128, title: `${FREEZE_PREFIX}056ee80` });
        assert.equal(await fileIssue(gh, red("df92205")), 1128);
        assert.deepEqual(writes.slice(1), [
            ["POST", "/issues/2000/comments", { body: "Duplicate of #1128." }],
            ["PATCH", "/issues/2000", { state: "closed", state_reason: "not_planned" }],
            ["POST", "/issues/1128/comments", { body: "also df92205" }],
        ]);
    });

    it("keeps its issue when the racing run's issue is the newer one", async () => {
        const { gh, writes } = repo([], { number: 3000, title: `${FREEZE_PREFIX}056ee80` });
        assert.equal(await fileIssue(gh, red("df92205")), 2000);
        assert.equal(writes.length, 1);
    });

    it("runs unqueued, since a concurrency group would cancel a pending red run", () => {
        assert.doesNotMatch(workflow("master-guard.yml"), /^\s*concurrency:/m);
    });

    it("titles a revert so Lint PR Title passes it", () => {
        const lint = (title) =>
            spawnSync("pnpm", ["exec", "commitlint"], { input: `${title}\n`, encoding: "utf8" }).status;
        const sha = "0123456789abcdef0123456789abcdef01234567";
        assert.equal(lint(revertTitle(sha, [1011])), 0);
        assert.equal(lint(revertTitle(sha, [])), 0);
        assert.equal(lint(revertTitle(sha, [42, 43, 44])), 0);
    });

    it("names every pull request of a reverted batch", () => {
        const sha = "0123456789abcdef0123456789abcdef01234567";
        assert.equal(revertTitle(sha, [42, 43, 44]), "revert: batch #42, #43, #44, master CI red at 0123456");
        assert.equal(revertTitle(sha, [1011]), "revert: pull request #1011, master CI red at 0123456");
    });

    it("tells authors to revert the revert, never to re-queue a merged pull request", () => {
        const sha = "0123456789abcdef0123456789abcdef01234567";
        for (const prs of [[], [1011], [42, 43, 44]]) {
            const body = revertBody(sha, "https://run", prs);
            assert.match(body, /reverts this revert/);
            assert.doesNotMatch(body, /re-enter/);
        }
        // a batch went red on the tree the queue passed: point at master-only jobs and flakes first
        assert.match(revertBody(sha, "https://run", [42, 43, 44]), /#42, #43, #44.*jobs that run only on master/s);
    });

    // A red CI run on master as the jobs API and the logs show it. `logs` maps a failed job's name to the lines
    // its failed step printed; `earlier` lists the jobs that failed on a master run an hour before.
    const redRun = (logs, earlier = []) => {
        const at = (s) => `2026-10-06T09:51:${s}Z`;
        const jobs = [
            { id: 1, name: "Build", conclusion: "success", steps: [] },
            ...Object.keys(logs).map((name, i) => ({
                id: 10 + i,
                name,
                conclusion: "failure",
                steps: [{ name: "Run it", conclusion: "failure", started_at: at(26), completed_at: at(30) }],
            })),
            { id: 99, name: "All Checks Pass", conclusion: "failure", steps: [] },
        ];
        const run = { id: 5, run_attempt: 1, head_sha: "b".repeat(40), created_at: "2026-10-06T10:00:00Z" };
        const gh = async (path) => {
            if (path === "/actions/runs/5/attempts/1/jobs?per_page=100") {
                return { jobs };
            }
            const log = /^\/actions\/jobs\/(\d+)\/logs$/.exec(path);
            if (log) {
                const job = jobs.find((j) => j.id === Number(log[1]));
                // a line of the step before, which must not count
                return [`${at(20)} ETIMEDOUT in an earlier step`, ...logs[job.name].map((l) => `${at(27)} ${l}`)].join(
                    "\n",
                );
            }
            if (path.startsWith("/actions/workflows/ci.yml/runs?")) {
                return {
                    workflow_runs: [
                        { id: 4, head_sha: "a".repeat(40), conclusion: "failure", created_at: "2026-10-06T09:00:00Z" },
                    ],
                };
            }
            if (path === "/actions/runs/4/jobs?per_page=100") {
                return { jobs: earlier.map((name) => ({ name, conclusion: "failure" })) };
            }
            throw new Error(`unexpected ${path}`);
        };
        return examineRed(gh, run);
    };
    // The Links job of master run 37444427406: GitHub answered 502 for a linked Actions run page.
    const LINKS_502 = [
        "Checking github.com/graphty-org links",
        "[502] https://github.com/graphty-org/graphty-monorepo/actions/runs/35316416067 (at 109:186) | Rejected status code: 502 Bad Gateway",
        "[502] https://github.com/graphty-org/graphty-monorepo/actions/runs/35316416067 (at 53:153) | Rejected status code: 502 Bad Gateway",
        "Dead links found (see above). Fix the link, or publish what it points to.",
        "##[error]Process completed with exit code 1.",
    ];

    it("opens no revert when every failed job failed from outside", async () => {
        const { failed, outside } = await redRun({ Links: LINKS_502 });
        assert.deepEqual(failed, ["Links"]);
        assert.equal(outside.length, 1);
        assert.match(outside[0], /^Links: `\[502\] https:\/\/github.com\/.*502 Bad Gateway` \(and 1 more like it\)$/);
        // npm and DNS errors, a lost runner, and a job that also failed on an earlier commit
        assert.ok(
            (await redRun({ Build: ["npm error code E503", "##[error]Process completed with exit code 1."] })).outside,
        );
        assert.ok((await redRun({ Build: ["getaddrinfo EAI_AGAIN registry.npmjs.org"] })).outside);
        const lost = await redRun({ Build: [] }, ["Build"]);
        assert.deepEqual(lost.outside, [`Build also failed on the earlier master commit ${"a".repeat(40)}.`]);
    });

    it("still opens a revert when a failure may be the commit's own", async () => {
        // a dead relative link beside the 502s, a type error, or a failure with no outside error at all
        assert.equal(
            (await redRun({ Links: [...LINKS_502, "[ERROR] file:///docs/x.md#gone | Cannot find fragment"] })).outside,
            null,
        );
        assert.equal((await redRun({ Links: LINKS_502, Build: ["src/a.ts(1,2): error TS2322: no"] })).outside, null);
        assert.equal((await redRun({ Build: ["##[error]Process completed with exit code 1."] })).outside, null);
        // an outside error printed by an earlier step of the job does not count
        assert.equal((await redRun({ Build: ["vite build failed"] })).outside, null);
        // a job that failed earlier in a window does not excuse a different job
        assert.equal((await redRun({ Build: ["vite build failed"] }, ["Links"])).outside, null);
    });

    // A fake repository holding one open revert pull request of commit `reverted`, which failed `jobs`.
    const withRevert = (status, jobs = ["Links"]) => {
        const reverted = "c".repeat(40);
        const writes = [];
        const gh = async (path, init = {}) => {
            if ((init.method ?? "GET") !== "GET") {
                writes.push([init.method, path, init.body ? JSON.parse(init.body) : undefined]);
                return {};
            }
            if (path.startsWith("/pulls?")) {
                return [
                    { number: 3, head: { ref: "fix/thing" }, body: "Fixes it" },
                    {
                        number: 1203,
                        head: { ref: "revert/ccccccc" },
                        body: `${revertBody(reverted, "https://run/1", [1118])}\n\n<!-- master-guard failed jobs: ${JSON.stringify(jobs)} -->`,
                    },
                ];
            }
            assert.equal(path, `/compare/${reverted}...${"d".repeat(40)}`);
            return { status };
        };
        return { gh, writes };
    };
    const at = { sha: "d".repeat(40), url: "https://run/2" };

    it("closes its open revert once master CI is green at or after the reverted commit", async () => {
        const { gh, writes } = withRevert("ahead");
        assert.deepEqual(await closeStaleReverts(gh, { ...at, green: true }), [1203]);
        assert.match(writes[0][2].body, /^Master CI is green at d{40} \(https:\/\/run\/2\), which contains c{40}/);
        assert.deepEqual(writes.slice(1), [
            ["PATCH", "/pulls/1203", { state: "closed" }],
            ["DELETE", "/git/refs/heads/revert/ccccccc", undefined],
        ]);
        // green on a commit without the reverted one says nothing about it
        assert.deepEqual(await closeStaleReverts(withRevert("behind").gh, { ...at, green: true }), []);
    });

    it("closes its open revert when the same job fails on another commit", async () => {
        const { gh, writes } = withRevert("behind");
        assert.deepEqual(await closeStaleReverts(gh, { ...at, green: false, failed: ["Links"] }), [1203]);
        assert.match(writes[0][2].body, /^Links failed again at d{40} .*on a commit without c{40}/);
        // after the reverted commit, only an outside cause clears it; a different job never does
        assert.deepEqual(
            await closeStaleReverts(withRevert("ahead").gh, { ...at, green: false, failed: ["Links"] }),
            [],
        );
        const outside = { ...at, green: false, failed: ["Links"], outside: true };
        assert.deepEqual(await closeStaleReverts(withRevert("ahead").gh, outside), [1203]);
        assert.deepEqual(
            await closeStaleReverts(withRevert("behind").gh, { ...at, green: false, failed: ["Build"] }),
            [],
        );
    });
});

describe("release.yml", () => {
    const release = workflow("release.yml");
    const pick = job(release, "pick");
    const ci = job(release, "ci");
    const t4 = job(release, "t4");
    const audit = job(release, "audit");
    const hosts = job(release, "hosts");
    const autosaveMacos = job(release, "autosave_macos");
    const llm = job(release, "llm");
    const coverage = job(release, "coverage");
    const held = job(release, "held");
    const version = job(release, "version");
    const land = job(release, "land");
    const landSh = readFileSync(new URL("./channel/land.sh", import.meta.url), "utf8");
    const publish = job(release, "publish");
    const approve = job(release, "approve");

    it("opens no pull request and pushes to master only from the land job, with the deploy key", () => {
        assert.doesNotMatch(release, /gh pr create|head_commit/);
        assert.deepEqual(release.match(/git push[^\n]*/g), [
            // channel/candidate deleted by the automatic abandon (candidate_fix), only at the head it ended
            'git push --no-verify --force-with-lease=refs/heads/channel/candidate:"$head" origin :refs/heads/channel/candidate ||',
            // channel/full-run, moved to a candidate tested with its own workflow files (handoff)
            'git push --no-verify --force origin "${SHA}:refs/heads/channel/full-run"',
            // channel/candidate deleted when a newer green run replaced its red hold (candidate_branch, #5052)
            'git push --no-verify --force-with-lease=refs/heads/channel/candidate:"$REPLACED" origin :refs/heads/channel/candidate ||',
            // channel/candidate, pushed at a held commit (candidate_branch)
            'git push --no-verify origin "$ref" ||',
        ]);
        // the site job's deployed.json, in its checkout of graphty-nightly (nightly-site.yml, which the site job calls)
        assert.deepEqual(workflow("nightly-site.yml").match(/git push[^\n]*/g), ["git push --quiet origin HEAD"]);
        // the land job's pushes are in its script: a nightly with nothing versioned moves only the site tag and
        // channel/nightly; a release pushes the merge and its tags together
        assert.match(land, /run: tools\/channel\/land\.sh\n/);
        assert.deepEqual(landSh.match(/git push[^\n]*/g), [
            'git push --atomic --no-verify origin "${refs[@]}"',
            'git push --atomic --no-verify origin HEAD:refs/heads/master "${refs[@]}"; then',
        ]);
        assert.match(
            job(workflow("nightly-site.yml"), "site"),
            /cd nightly-site\n(?:.*\n){4}\s+git push --quiet origin HEAD\n/,
        );
        // the key reaches only the land job and the channel/candidate jobs (candidate_branch, candidate_fix), which install nothing and run no nx
        assert.equal(release.match(/RELEASE_DEPLOY_KEY/g).length, 4);
        // the fix forward's merge into channel/candidate: git and the script, nothing installed, and the store's hold
        // it moves in the same step (tools/channel/candidate-fix.mjs advance pushes)
        const fix = job(release, "candidate_fix");
        assert.match(fix, /ssh-key: \$\{\{ secrets.RELEASE_DEPLOY_KEY \}\}/);
        assert.doesNotMatch(fix.replace(/^\s*#.*$/gm, ""), /pnpm|nx |npm |setup-node/);
        assert.match(fix, /contents: read/);
        assert.doesNotMatch(fix, /contents: write/);
        for (const keyed of [land, job(release, "candidate_branch")]) {
            assert.match(keyed, /ssh-key: \$\{\{ secrets.RELEASE_DEPLOY_KEY \}\}/);
            assert.doesNotMatch(keyed.replace(/^\s*#.*$/gm, ""), /pnpm|nx |npm |setup-node/);
            assert.doesNotMatch(keyed, /contents: write|id-token/);
        }
        // the land job's token cannot write: the deploy key does the pushing
        assert.match(land, /contents: read/);
        assert.doesNotMatch(land, /contents: write|id-token/);
        // no push trigger: the publish runs in the train's own run
        const on = /^on:\n([\s\S]*?)\n\S/m.exec(release)[1];
        assert.doesNotMatch(on, /^\s+push:/m);
    });

    it("lands and publishes only in an owner-approved legacy run; a full run, the default, only tests", () => {
        assert.match(
            release,
            /\n {12}mode:\n[^\n]*\n\s+required: false\n\s+default: full\n\s+type: choice\n\s+options:\n\s+- full\n\s+- restart\n\s+- shadow\n\s+- legacy\n\s+- candidate\n\s+- promote-nightly\n\s+candidate:\n[^\n]*\n\s+required: false\n\s+default: ""\n\s+type: string\n\s+accept:\n/,
        );
        assert.match(release, /^ {4}MODE: \$\{\{ inputs.mode \|\| 'full' \}\}\n/m);
        // the owner's approval in production stands before the land job, and refuses a production that asks nobody
        assert.match(approve, /\n {8}environment: production\n/);
        assert.match(approve, /\n {8}permissions:\n {12}actions: read\n {8}steps:/);
        assert.match(approve, /select\(.type == "required_reviewers"\)/);
        assert.match(approve, /\[ "\$reviewers" -gt 0 \] \|\| \{\n[^\n]*::error::[^\n]*\n\s+exit 1\n/);
        assert.doesNotMatch(approve, /secrets\./);
        // every job that reads an outside-world secret declares its environment
        assert.match(land, /\n {8}environment: release # the deploy key\n/);
        assert.match(publish, /\n {8}environment: release # /);
        assert.match(llm, /\n {8}environment: full-run # GOOGLE_API_KEY\n/);
        // pick and held read Pushover only for a legacy run's announcements
        assert.match(pick, /\n {8}environment: \$\{\{ inputs.mode == 'legacy' && 'release' \|\| '' \}\}\n/);
        assert.match(held, /\n {8}environment: \$\{\{ inputs.mode != 'shadow' && 'release' \|\| '' \}\}\n/);
        // the full run's verdict announces a red run or an owner item
        assert.match(job(release, "verdict"), /\n {8}environment: release # Pushover\n/);
        // the nightly site's deploy key and its announcements
        assert.match(
            job(workflow("nightly-site.yml"), "site"),
            /\n {8}environment: nightly # NIGHTLY_SITE_DEPLOY_KEY, Pushover\n/,
        );
        // channel/candidate takes the deploy key
        assert.match(job(release, "candidate_branch"), /\n {8}environment: release # the deploy key\n/);
        // and so does the fix forward's merge into it
        assert.match(job(release, "candidate_fix"), /\n {8}environment: release # the deploy key\n/);
        assert.equal(release.match(/\n {8}environment: /g).length, 10);
        // no job reads a secret without an environment, except GITHUB_TOKEN and the reusable-workflow calls
        for (const [, name] of release.slice(release.indexOf("\njobs:")).matchAll(/^ {4}(\w+):$/gm)) {
            const body = job(release, name);
            if (/secrets\.(?!GITHUB_TOKEN\b)\w+/.test(body) && !/secrets: inherit/.test(body)) {
                assert.match(body, /\n {8}environment: /, `${name} reads a secret, so it declares its environment`);
            }
        }
    });

    it("a full run picks its candidate from the results store and ends in one verdict", () => {
        const verdict = job(release, "verdict");
        // the store's pick replaces the 29-minute nx check, which only shadow and legacy runs still make
        assert.match(
            pick,
            /id: candidate\n\s+if: \$\{\{ steps.pending.outputs.pending == 'false' && \(env.MODE == 'full' \|\| env.MODE == 'restart' \|\| env.MODE == 'candidate'\) && steps.resume.outputs.resume != 'true' \}\}/,
        );
        assert.match(pick, /node tools\/full-run.mjs pick\n/);
        assert.match(pick, /RESULTS_URL: \$\{\{ vars.RESULTS_URL \}\}/);
        assert.match(pick, /id-token: write/);
        // the ordering-only rule (early-capture.md 4e) is switched by a repository variable, so the trial can turn it off
        assert.match(pick, /PICK_RULE: \$\{\{ vars.FULL_RUN_PICK_RULE \}\}/);
        assert.match(
            pick,
            /id: releasable\n\s+if: \$\{\{ steps.pending.outputs.pending == 'false' && env.MODE != 'full' && env.MODE != 'restart' && env.MODE != 'candidate' && env.MODE != 'promote-nightly' \}\}/,
        );
        // the verdict judges every lane, whatever it ended with, only in a full run
        const lanes = ["ci", "t4", "hosts", "autosave_macos", "audit", "llm", "version_dry_run"];
        assert.deepEqual(parseYaml(release).jobs.verdict.needs, [
            "pick",
            ...lanes,
            "recapture",
            "recapture_merge",
            "candidate_site",
            ...lanes.map((l) => `${l}_red`),
        ]);
        assert.match(
            verdict,
            /if: \$\{\{ !cancelled\(\) && \(inputs.mode == 'full' \|\| inputs.mode == 'restart' \|\| inputs.mode == 'candidate'\) && \(needs.pick.outputs.release == 'true' \|\| \(needs.pick.result != 'success' && needs.pick.result != 'skipped'\)\) \}\}/,
        );
        // a held major's projects are held alone: the verdict names them, and a green-clean run announces them
        assert.match(verdict, /VERSION_HELD: \$\{\{ needs.version_dry_run.outputs.held \}\}/);
        assert.match(verdict, /owner: \$\{\{ steps.verdict.outputs.owner \}\}/);
        assert.match(
            verdict,
            /if: \$\{\{ steps.verdict.outputs.state == 'green-clean' && steps.verdict.outputs.owner != '' \}\}[\s\S]*?node tools\/release-status.mjs owner-item --sha "\$SHA" --what "\$OWNER"/,
        );
        assert.match(
            verdict,
            /"ci": "\$\{\{ needs.candidate_site.result == 'failure' && 'failure' \|\| needs.ci.result == 'cancelled' && needs.ci.outputs.checks == 'success' && 'success' \|\| needs.ci.result \}\}"/,
        );
        for (const lane of ["pick", "llm", "t4", "audit"]) {
            assert.match(verdict, new RegExp(`"${lane}": "\\$\\{\\{ needs.${lane}.result \\}\\}"`), lane);
        }
        // a lane a fix forward's re-test leaves out passes as unaffected
        for (const [lane, out] of [
            ["hosts", "hosts"],
            ["autosave_macos", "macos"],
        ]) {
            const unaffected = `"${lane}": "\\$\\{\\{ needs.pick.outputs.${out} == 'false' && 'unaffected' \\|\\| needs.${lane}.result \\}\\}"`;
            assert.match(verdict, new RegExp(unaffected), lane);
        }
        assert.match(verdict, /FORWARD: \$\{\{ needs.pick.outputs.forward \}\}/);
        assert.match(verdict, /node tools\/full-run.mjs verdict\n/);
        // the run's one gated capture is the re-capture's, renamed to what the judge and the gate read
        assert.match(verdict, /pattern: visual-final-\*/);
        assert.match(verdict, /mv "\$d" "\$CAPTURES\/visual-\$\{d##\*\/visual-final-\}"/);
        // a legged project's merge failing fails the re-capture lane too
        assert.match(
            verdict,
            /"recapture": "\$\{\{ \(needs.recapture_merge.result == 'failure' \|\| needs.recapture_merge.result == 'cancelled'\) && 'failure' \|\| needs.recapture.result \}\}"/,
        );
        // it dispatches the bisect, files the red issue and writes to the store; nothing else
        assert.deepEqual(verdict.match(/\w+(-\w+)?: write/g), ["actions: write", "issues: write", "id-token: write"]);
        assert.match(
            verdict,
            // green-images too: nothing else tells the owner that nightly waits on his screenshot review (#3698)
            /if: \$\{\{ steps.verdict.outputs.deferred != 'true' && \(steps.verdict.outputs.state == 'red' \|\| steps.verdict.outputs.state == 'owner-item' \|\| steps.verdict.outputs.state == 'green-images'\) \}\}/,
        );
        assert.match(verdict, /node tools\/release-status.mjs "\$STATE" --sha "\$SHA"/);
        // a full run versions, lands and publishes nothing, and never opens a "Release held" issue
        for (const j of [version, held]) assert.match(j, /inputs.mode == 'shadow' \|\| inputs.mode == 'legacy'/);
        assert.match(job(release, "timings"), /needs:\s+\[[^\]]*\bverdict\b/);
    });

    it("files the red issue the moment a lane ends red, one job per lane, in no concurrency group", () => {
        const jobs = parseYaml(release).jobs;
        const owner = {
            llm: "${{ needs.llm.outputs.owner_item }}",
            version_dry_run: "${{ needs.version_dry_run.outputs.held }}",
        };
        for (const lane of ["ci", "t4", "hosts", "autosave_macos", "audit", "llm", "version_dry_run"]) {
            const red = jobs[`${lane}_red`];
            assert.ok(red, lane);
            assert.deepEqual(red.needs, ["pick", lane]);
            // without a status function the job would need every lane to succeed, and never run
            assert.equal(
                red.if,
                `\${{ !cancelled() && needs.${lane}.result == 'failure' && (inputs.mode == 'full' || inputs.mode == 'restart' || inputs.mode == 'candidate') && needs.pick.outputs.forward == '' }}`,
            );
            // a group keeps one pending job and cancels the rest: a third lane's filing would be dropped
            assert.equal(red.concurrency, undefined);
            assert.deepEqual(red.permissions, { contents: "read", issues: "write" });
            const step = red.steps.at(-1);
            assert.equal(step.run, "node tools/full-run.mjs lane-red");
            assert.equal(step.env.LANE, lane);
            assert.equal(step.env.RESULT, `\${{ needs.${lane}.result }}`);
            assert.equal(step.env.SHA, "${{ needs.pick.outputs.sha }}");
            assert.equal(step.env.OWNER_ITEM, owner[lane]);
        }
    });

    it("tries a release on dispatch, from master's newest commit, with no GitHub cron", () => {
        // the release scheduler Worker (tools/release-scheduler/) dispatches with scheduled=true; GitHub's cron would fire twice a slot
        const on = /^on:\n([\s\S]*?)\n\S/m.exec(release)[1];
        assert.doesNotMatch(on, /^\s*schedule:/m);
        assert.doesNotMatch(release, /^\s*- cron:/m);
        assert.match(
            release,
            /workflow_dispatch:\n\s+inputs:\n\s+scheduled:\n\s+description: "Set by the release scheduler: [^"]*"\n\s+required: false\n\s+default: false\n\s+type: boolean\n\s+packages:/,
        );
        // one effective trigger for every job: a scheduler dispatch is a scheduled attempt, any other run its event
        assert.match(
            release,
            /^env:\n {4}TRIGGER: \$\{\{ github.event_name == 'workflow_dispatch' && inputs.scheduled && 'schedule' \|\| github.event_name \}\}\n/m,
        );
        assert.doesNotMatch(release, /\$EVENT\b|\$GITHUB_EVENT_NAME|EVENT: \$\{\{/);
        assert.match(
            pick,
            /needs: candidate_fix\n(?:\s+#.*\n)*\s+if: \$\{\{ !cancelled\(\) && \(github.ref == 'refs\/heads\/master' \|\| github.ref == 'refs\/heads\/channel\/full-run'\) \}\}/,
        );
        // the run's own commit, so the run, Coveralls and the lanes all name the tested commit
        assert.match(pick, /CANDIDATE: \$\{\{ github.sha \}\}/);
        assert.match(pick, /ref: \$\{\{ github.sha \}\}/);
        assert.match(pick, /echo "sha=\$\{CANDIDATE\}"/);
        assert.doesNotMatch(pick, /ref: master/);
        // master runs no tests, the train tests the candidate itself; it reads master's push run of ci.yml only for
        // the builds it reuses
        assert.doesNotMatch(pick, /hosts\.yml|ci_run_id/);
        assert.deepEqual(pick.replace(/^\s*#.*$/gm, "").match(/ci\.yml[^\n]*/g), [
            'ci.yml --commit "$sha" --event push --status success --limit 1 \\',
        ]);
        // only a promotion after the owner's approval, and a fix forward's re-capture of the Storybooks its fixes do
        // not reach, read another run: the Release run that judged the candidate before
        assert.deepEqual(release.match(/run-id: \$\{\{ needs.pick[^\n]*/g), [
            "run-id: ${{ needs.pick.outputs.source_run }}",
            "run-id: ${{ needs.pick.outputs.source_run }}",
            "run-id: ${{ needs.pick.outputs.source_run }}",
        ]);
    });

    it("does nothing while the previous release is pending", () => {
        // cut-over: a release pull request left from the old design is closed, never merged untagged
        assert.match(pick, /startswith\("release\/train-"\)/);
        assert.match(pick, /gh pr close "\$number" --delete-branch --comment/);
        // an open "Release held" issue stops the schedule; a restart and an ad hoc dispatch run anyway
        assert.match(
            pick,
            /if \[ -n "\$held" \] && \[ "\$TRIGGER" = schedule \] && \[ "\$\{MODE:-\}" != full \] && \[ "\$\{MODE:-\}" != restart \]; then\n\s+skip /,
        );
        // a version commit on master without its tags is an error that holds the release, not a silent skip
        assert.match(pick, /::error::the last version commit \$\{last\} has no tag \$\{project\}@\$\{version\}/);
        // nothing releasable: the same versioning the train runs, made locally, makes no commit
        assert.match(pick, /commit=\$\(tools\/release-version.sh "\$PACKAGES"\)/);
        assert.match(
            pick,
            /release: \$\{\{ steps.handoff.outputs.release \|\| steps.candidate.outputs.run \|\| steps.releasable.outputs.release \|\| 'false' \}\}/,
        );
        for (const j of [ci, t4, audit]) {
            assert.match(
                j,
                /needs: pick\n\s+if: \$\{\{ !cancelled\(\) && needs.pick.result == 'success' && needs.pick.outputs.release == 'true' \}\}/,
            );
        }
        // a fix forward's re-test leaves Hosts out when its fixes do not reach it (tools/channel/candidate-fix.mjs)
        assert.match(
            hosts,
            /needs: pick\n(?:\s+#.*\n)*\s+if: \$\{\{ !cancelled\(\) && needs.pick.result == 'success' && needs.pick.outputs.release == 'true' && needs.pick.outputs.hosts != 'false' \}\}/,
        );
    });

    it("waits on events, never on a count of hours", () => {
        for (const file of ["release.yml", "ci.yml", "coverage.yml"]) {
            const text = workflow(file).replace(/^\s*#.*$/gm, "");
            assert.doesNotMatch(text, /\bdate -d|created_?[aA]t|updated_?[aA]t|mergedAt|\bhours?\b|3600|86400/, file);
        }
        // A job's only clock is its hang guard (tools/ci-budgets.mjs lint): a hung job is a defect, not a wait.
        const jobs = Object.values(parseYaml(release).jobs).filter((j) => !j.uses);
        for (const j of jobs) assert.ok(Number.isInteger(j["timeout-minutes"]) && j["timeout-minutes"] >= 10, j.name);
    });

    it("tests the candidate with the full suite, the T4 and the audit before it versions anything", () => {
        assert.match(
            ci,
            /uses: \.\/\.github\/workflows\/ci\.yml\n\s+with:\n\s+ref: \$\{\{ needs.pick.outputs.sha \}\}\n\s+reuse_build_run: \$\{\{ needs.pick.outputs.build_run \}\}\n(?:\s+#.*\n)*\s+shards: \$\{\{ needs.pick.outputs.shards \}\}\n\s+secrets: inherit/,
        );
        assert.match(
            t4,
            /uses: \.\/\.github\/workflows\/gpu\.yml\n\s+with:\n\s+ref: \$\{\{ needs.pick.outputs.sha \}\}/,
        );
        assert.match(
            hosts,
            /uses: \.\/\.github\/workflows\/hosts\.yml\n\s+with:\n\s+ref: \$\{\{ needs.pick.outputs.sha \}\}/,
        );
        assert.match(workflow("hosts.yml"), /workflow_call:\n\s+inputs:\n\s+ref:/);
        assert.match(
            autosaveMacos,
            /uses: \.\/\.github\/workflows\/work-protection-macos\.yml\n\s+with:\n\s+candidate: \$\{\{ needs.pick.outputs.sha \}\}/,
        );
        assert.match(workflow("work-protection-macos.yml"), /workflow_call:\n\s+inputs:\n\s+candidate:/);
        assert.match(audit, /ref: \$\{\{ needs.pick.outputs.sha \}\}/);
        assert.match(audit, /run: pnpm audit --prod --audit-level=high/);
        assert.doesNotMatch(audit, /continue-on-error/, "a high advisory holds the release");
        assert.match(
            version,
            /needs: \[pick, ci, t4, hosts, autosave_macos, audit, llm, version_dry_run, verdict, resume\]/,
        );
        // shadow and legacy: every lane passed; a nightly promotion: the verdict job decided to promote
        assert.match(
            version,
            /if: \$\{\{ !cancelled\(\) && \(\(needs.pick.outputs.release == 'true' && \(\(\(inputs.mode == 'shadow' \|\| inputs.mode == 'legacy'\) && \(needs.ci.result == 'success' \|\| \(needs.ci.result == 'cancelled' && needs.ci.outputs.checks == 'success'\)\) && needs.t4.result == 'success' && needs.hosts.result == 'success' && needs.autosave_macos.result == 'success' && needs.audit.result == 'success' && needs.llm.result == 'success' && needs.version_dry_run.result == 'success'\) \|\| \(\(inputs.mode == 'full' \|\| inputs.mode == 'restart' \|\| inputs.mode == 'candidate'\) && needs.verdict.outputs.promote == 'true'\)\)\) \|\| \(needs.pick.outputs.resume == 'true' && needs.resume.outputs.promote == 'true'\)\) \}\}/,
        );
        // the major-bump dry run is a lane: it versions the candidate and checks release-approvals.json (#3455)
        const dryRun = job(release, "version_dry_run");
        assert.match(
            dryRun,
            /needs: pick\n\s+if: \$\{\{ !cancelled\(\) && needs.pick.result == 'success' && needs.pick.outputs.release == 'true' \}\}/,
        );
        assert.match(dryRun, /ref: \$\{\{ needs.pick.outputs.sha \}\}\n\s+fetch-depth: 0/);
        assert.match(dryRun, /commit=\$\(tools\/release-version.sh "\$PACKAGES"\)/);
        assert.match(dryRun, /node tools\/release-approvals.mjs dry-run "\$SHA" "\$commit"/);
        assert.match(dryRun, /held: \$\{\{ steps.approvals.outputs.held \}\}/);
        assert.doesNotMatch(dryRun, /environment:|git push|upload-artifact|id-token/);
        // the release ships the builds of its own CI call, not a master run's
        assert.match(version, /pattern: \$\{\{ env.PACKAGE_BUILDS \}\}\n\s+path: \$\{\{ runner.temp \}\}\/builds\n\n/);
        assert.match(version, /commit=\$\(tools\/release-version.sh "\$PACKAGES"\)/);
        assert.match(version, /node tools\/release-diff.mjs "\$SHA" "\$commit"/);
        // the projects the dry run held are left out of this run's versioning alone (#4021); a promotion after
        // approval, which runs no dry run, checks its version commit and versions again without the ones it names
        assert.match(version, /RELEASE_HOLD_ALSO: \$\{\{ needs.version_dry_run.outputs.held \}\}/);
        assert.match(
            version,
            /if ! GITHUB_OUTPUT="\$RUNNER_TEMP\/approvals" node tools\/release-approvals.mjs dry-run "\$SHA" "\$commit"; then[\s\S]*?git reset --hard --quiet "\$SHA"[\s\S]*?commit=\$\(tools\/release-version.sh "\$PACKAGES"\)[\s\S]*?node tools\/release-approvals.mjs dry-run "\$SHA" "\$commit"\n\s+fi\n\s+node tools\/release-diff.mjs/,
        );
        assert.match(landSh, /node tools\/release-diff.mjs "\$SHA" "\$COMMIT"/);
        // land and publish follow only a version commit made after every lane passed, and the owner's approval
        // (legacy) or the verdict's decision to promote (a nightly; the land and site tests below)
        assert.match(
            approve,
            /needs: \[pick, version\]\n\s+if: \$\{\{ !cancelled\(\) && inputs.mode == 'legacy' && needs.version.result == 'success' \}\}/,
        );
        assert.match(land, /needs: \[pick, version, approve\]\n/);
        assert.match(
            publish,
            /needs: \[pick, version, land\]\n\s+if: \$\{\{ always\(\) && needs.land.outputs.pushed == 'true'/,
        );
        // one train at a time across its jobs, so two trains never pay for two T4 runs of one commit
        assert.match(release, /^concurrency:\n {4}group: release-train\n {4}cancel-in-progress: false/m);
        // coverage comes from the same CI call, and never holds the release
        assert.match(
            coverage,
            /needs: \[pick, ci\]\n\s+if: \$\{\{ !cancelled\(\) && \(needs.ci.result == 'success' \|\| \(needs.ci.result == 'cancelled' && needs.ci.outputs.checks == 'success'\)\) \}\}/,
        );
        assert.match(coverage, /uses: \.\/\.github\/workflows\/coverage\.yml/);
        assert.doesNotMatch(version + land + publish + held, /coverage/);
        const cov = workflow("coverage.yml");
        assert.match(cov, /on:\n\s+workflow_call:/);
        assert.doesNotMatch(cov, /workflow_run|run-id/);
        // Coveralls names the tested commit, not the calling run's
        assert.match(cov, /git-commit: \$\{\{ inputs.ref \}\}\n\s+git-branch: master/);
    });

    it("runs the paid LLM tests in every release test of a candidate, with no once-a-day gate (owner, 2026-10-29)", () => {
        // no step decides whether the lane is due: every step runs whenever the job runs
        assert.doesNotMatch(llm, /steps\.due|llm-due/);
        // (the cost step after the tests, which runs after a failed test step too, is not a gate)
        const steps = llm.slice(llm.indexOf("\n        steps:"), llm.indexOf('- name: "LLM regression cost:'));
        assert.doesNotMatch(steps, /\n\s+if: /, "no step-level gate");
        // the job runs only when the pick chose a candidate to test, never in promote-nightly (which tests nothing)
        assert.match(
            llm,
            /if: \$\{\{ !cancelled\(\) && inputs.mode != 'promote-nightly' && needs.pick.result == 'success' && needs.pick.outputs.release == 'true'/,
        );
        // the month's spend is still checked (spend:llm), before installing anything, and never stops the run
        const spend = llm.indexOf("run: node tools/llm-spend.mjs");
        assert.ok(spend > 0 && spend < llm.indexOf("uses: pnpm/action-setup@"), "checks the spend first");
        assert.match(llm, /actions: read/);
        const script = readFileSync(new URL("./llm-spend.mjs", import.meta.url), "utf8");
        assert.match(script, /export const STEP = "LLM regression tests";/);
        assert.match(script, /const MONTHLY_CEILING = 60;/);
        assert.match(llm, /- name: LLM regression tests\n/, "the step llm-spend.mjs counts");
        // the run's logged cost reaches llm-spend.mjs and the health dashboard as the next step's name
        assert.match(
            llm,
            /echo "usd=\$\(node \.\.\/tools\/llm-spend\.mjs cost "\$RUNNER_TEMP\/llm-regression\.log"\)" >> "\$GITHUB_OUTPUT"/,
        );
        assert.match(
            llm,
            /- name: "LLM regression cost: \$\{\{ steps\.llm\.outputs\.usd \}\} USD"\n\s+if: \$\{\{ always\(\) && steps\.llm\.outputs\.usd != '' \}\}\n/,
        );
        assert.match(script, /export const COST_STEP = /);
        // the paid project runs nowhere else: not on a pull request, a master push or any other workflow
        for (const name of readdirSync(new URL("../.github/workflows/", import.meta.url))) {
            if (name === "release.yml" || !/\.ya?ml$/.test(name)) continue;
            assert.doesNotMatch(workflow(name), /--project[ =]llm-regression/, name);
        }
    });

    it("runs the LLM regression tests on the candidate with the Google secret, failing when it is missing", () => {
        assert.match(
            llm,
            /needs: \[pick, ci\]\n\s+if: \$\{\{ !cancelled\(\) && inputs.mode != 'promote-nightly' && needs.pick.result == 'success' && needs.pick.outputs.release == 'true' && \(needs.ci.result == 'success' \|\| \(needs.ci.result == 'cancelled' && needs.ci.outputs.checks == 'success'\)\) \}\}/,
        );
        assert.match(llm, /ref: \$\{\{ needs.pick.outputs.sha \}\}/);
        assert.match(llm, /run: pnpm exec nx run graphty-element:build/);
        assert.match(llm, /LLM_REGRESSION_PROVIDER: google\n/);
        assert.match(llm, /GOOGLE_API_KEY: \$\{\{ secrets.GOOGLE_API_KEY \}\}/);
        // the tests skip without a key; the job must fail instead, naming the secret, before vitest runs
        const check = llm.indexOf('if [ -z "${GOOGLE_API_KEY}" ]; then');
        assert.ok(check > 0, "checks the key is non-empty");
        assert.match(
            llm.slice(check),
            /^\s+echo "owner_item=[^\n]*\n\s+echo "::error::the GOOGLE_API_KEY repository secret[^\n]*\n\s+exit 1\n/m,
        );
        assert.ok(check < llm.indexOf("npx vitest run --project llm-regression"), "before the tests run");
        assert.doesNotMatch(llm, /continue-on-error/, "a failure holds the release");
        // the job fails with vitest's own status, and a provider refusing the account marks an owner item
        assert.match(llm, /status=\$\{PIPESTATUS\[0\]\}/);
        assert.match(llm, /exit "\$status"\n/);
        assert.match(llm, /grep -q '\\\[llm-regression\\\] provider refused the account'/);
        assert.match(llm, /owner_item: \$\{\{ steps.llm.outputs.owner_item \}\}/);
        const harness = readFileSync(
            new URL("../graphty-element/test/helpers/llm-regression-harness.ts", import.meta.url),
            "utf8",
        );
        assert.ok(
            harness.includes('ACCOUNT_REFUSED_MARKER = "[llm-regression] provider refused the account"'),
            "the marker the job reads is the one the harness prints",
        );
        // paid calls: never on a pull request, the merge queue or a master push
        for (const file of ["ci.yml", "gpu.yml", "hosts.yml", "work-protection-macos.yml", "coverage.yml"]) {
            assert.doesNotMatch(workflow(file), /llm-regression|ANTHROPIC_API_KEY|OPENAI_API_KEY|GOOGLE_API_KEY/, file);
        }
    });

    it("holds the whole release when anything fails: nothing pushed, nothing published, one issue", () => {
        assert.match(
            held,
            /needs:\s+\[pick, ci, t4, hosts, autosave_macos, audit, llm, version_dry_run, verdict, resume, version, approve, land\]/,
        );
        assert.doesNotMatch(held, /gh pr create|git push|nx release|upload-artifact|id-token/);
        // the publish job finds only builds the version job kept, and only the version job keeps them -- besides a held
        // green-images head's, which the keep_builds job keeps for its promotion after the owner's approval
        assert.equal(release.match(/name: release-builds-/g).length, 4);
        assert.match(job(release, "keep_builds"), /name: release-builds-\$\{\{ needs.pick.outputs.sha \}\}/);
        assert.match(
            version,
            /name: release-builds-\$\{\{ needs.pick.outputs.tested \}\}\n\s+path: [^\n]*\n\s+run-id: \$\{\{ needs.pick.outputs.source_run \}\}/,
        );
        assert.match(version, /name: release-builds-\$\{\{ needs.pick.outputs.sha \}\}/);
        assert.match(publish, /name: release-builds-\$\{\{ needs.pick.outputs.sha \}\}/);
        // and the land job pushes exactly the commit the version job made
        assert.match(version, /name: release-commit-\$\{\{ needs.pick.outputs.sha \}\}/);
        assert.match(land, /name: release-commit-\$\{\{ needs.pick.outputs.sha \}\}/);
        assert.match(landSh, /\[ "\$\(git rev-parse FETCH_HEAD\)" = "\$COMMIT" \]/);
        // one issue naming what failed: found by its title prefix and updated, else created with the labels
        // githerd and triage read
        for (const [result, name] of [
            ["PICK", "candidate pick"],
            ["CI", "CI"],
            ["T4", "T4 GPU"],
            ["HOSTS", "Hosts"],
            ["AUTOSAVE_MACOS", "work protection (macOS)"],
            ["AUDIT", "security audit"],
            ["VERSION_DRY_RUN", "version dry run"],
            ["VERSION", "versioning"],
            ["LAND", "landing on master"],
        ]) {
            assert.ok(held.includes(`"${name}=$${result}_RESULT"`), name);
        }
        // the LLM lane is named an owner item when the provider refused the account
        assert.ok(held.includes('"$llm_lane=$LLM_RESULT"'), "LLM regression");
        assert.match(held, /\[ -z "\$LLM_OWNER_ITEM" \] \|\| llm_lane="LLM regression \(owner item: Google account\)"/);
        assert.match(held, /LLM_OWNER_ITEM: \$\{\{ needs.llm.outputs.owner_item \}\}/);
        assert.match(
            held,
            /if \[ -n "\$LLM_OWNER_ITEM" \]; then\n\s+echo\n\s+echo "The LLM regression job did not fail on code: [^\n]*it is an owner item/,
        );
        assert.match(held, /title="Release held: \$\{what\} failed on \$\{SHA:0:7\}"/);
        assert.match(held, /open=\$\(tools\/release-held.sh open "\$title" "\$RUNNER_TEMP\/body.md"\)/);
        // a full or restart run whose promotion failed in versioning or landing reports it in its own issue
        assert.match(
            held,
            /\(inputs.mode == 'full' \|\| inputs.mode == 'restart' \|\| inputs.mode == 'candidate'\) && needs.verdict.outputs.promote == 'true' && \(needs.version.result != 'success' \|\| needs.land.outputs.pushed != 'true'\)/,
        );
        assert.match(held, /title="Nightly promotion failed: \$\{what\} on \$\{SHA:0:7\}"/);
        assert.match(held, /release-held.sh open "\$title" "\$RUNNER_TEMP\/body.md" "Nightly promotion failed:"/);
        assert.match(held, /reclaimed != 'true' && inputs.mode != 'shadow'/, "announced too");
        assert.match(
            held,
            /environment: \$\{\{ inputs.mode != 'shadow' && 'release' \|\| '' \}\}/,
            "Pushover's secrets",
        );
        // full, restart and promote-nightly are nightly promotions (the job's NIGHTLY)
        assert.match(held, /\[ "\$\{NIGHTLY:-\}" != true \] \|\| outcome=nightly-held/);
        const site = job(workflow("nightly-site.yml"), "site");
        assert.match(
            site,
            /- name: Close the failed-deploy and failed-promotion issues\n[^\n]*\n\s+continue-on-error: true\n[\s\S]*release-held.sh close "[^"]*" "Nightly promotion failed:" \|\| rc=\$\?\n\s+tools\/release-held.sh close "[^"]*" "Nightly blocked:" \|\| rc=\$\?\n\s+exit "\$rc"/,
        );
        const helper = readFileSync(new URL("./release-held.sh", import.meta.url), "utf8");
        assert.match(
            helper,
            /retry gh issue list[^\n]*--search "in:title \\"\$\{1:-Release held:\}\\""/,
            "searches by the prefix, retrying a 5xx",
        );
        assert.match(helper, /startswith\(\\"\$\{1:-Release held: \}\\"\)/);
        assert.match(helper, /gh issue edit "\$open"[^\n]*--title "\$2"/);
        assert.match(helper, /gh issue comment "\$open"/);
        assert.match(helper, /--label bug --label priority:high --label effort:medium/);
        assert.match(held, /::error::release held/);
        // the only way out without an issue is the T4 runner loss the re-run repeats (tested with it)
        assert.equal(held.match(/\n\s+exit [0-9]/g).length, 1);
        // a refused or lost T4 runner has no code fix: the issue says so
        assert.match(held, /if \[ "\$T4_RESULT" = failure \]; then\n\s+echo\n\s+echo "If the T4 job was refused/);
        // and the next train that lands closes it, only after the push
        const close = land.indexOf("tools/release-held.sh close");
        assert.ok(close > land.indexOf("tools/channel/land.sh"), "closed only after the release is on master");
    });

    // A train attempt ends with a release on master or a "Release held" issue, never with neither. Run
    // 37635516841 (2026-10-07) ended with neither: a GitHub Actions outage left CI's "All Checks Pass" queued for
    // good, its result "abandoned", and held's `if` listed only failure and cancelled.
    describe("never ends a train attempt without a landed release or a held issue", () => {
        // the version job's needs but the verdict, which runs only in full and restart runs (the nightly promotion)
        const trainNeeds = [
            .../\n {8}needs: \[([^\]]*)\]/
                .exec(version)[1]
                .split(", ")
                .filter((j) => j !== "verdict" && j !== "resume"),
            "version",
            "land",
        ];
        const condition = /\n {8}if: \$\{\{ (.*) \}\}\n/.exec(held)[1];
        // the condition as JavaScript: GitHub's expression syntax here is a subset of it. `pushed` is the land
        // job's output: "true" once the release is on master, "" (GitHub's value for an unset output) before.
        const runs = (results, release = "true", pushed = "", mode = "legacy", promote = "") =>
            new Function(
                "needs",
                "inputs",
                `return ${condition.replace(/\balways\(\)/g, "true").replace(/!cancelled\(\)/g, "true")};`,
            )(
                Object.fromEntries(
                    [
                        "pick",
                        "ci",
                        "t4",
                        "hosts",
                        "autosave_macos",
                        "audit",
                        "llm",
                        "version_dry_run",
                        "verdict",
                        "resume",
                        "version",
                        "approve",
                        "land",
                    ].map((j) => [
                        j,
                        {
                            result: results[j] ?? "success",
                            outputs:
                                j === "pick"
                                    ? { release }
                                    : j === "land"
                                      ? { pushed }
                                      : j === "verdict"
                                        ? { promote }
                                        : {},
                        },
                    ]),
                ),
                { mode },
            );
        // every result a job can end with, including the ones GitHub does not document
        const NOT_SUCCESS = ["failure", "cancelled", "skipped", "abandoned", "timed_out", "a-result-not-yet-invented"];

        it("needs every lane, the version job and the land job", () => {
            assert.deepEqual(trainNeeds, [
                "pick",
                "ci",
                "t4",
                "hosts",
                "autosave_macos",
                "audit",
                "llm",
                "version_dry_run",
                "version",
                "land",
            ]);
            assert.match(
                held,
                new RegExp(
                    `needs:\\s+\\[${trainNeeds.slice(0, -2).join(", ")}, verdict, resume, version, approve, land\\]`,
                ),
            );
            // a promotion after the owner's approval that did not land files the nightly promotion's issue too
            assert.match(
                held,
                /\(needs.pick.outputs.resume == 'true' && needs.resume.outputs.promote == 'true' && \(needs.version.result != 'success' \|\| needs.land.outputs.pushed != 'true'\)\)/,
            );
            assert.match(
                held,
                /NIGHTLY: \$\{\{ inputs.mode == 'full' \|\| inputs.mode == 'restart' \|\| inputs.mode == 'candidate' \|\| inputs.mode == 'promote-nightly' \}\}/,
            );
        });

        it("runs whatever the run's state: always(), never a list of red results", () => {
            assert.match(condition, /^always\(\) && /);
            assert.doesNotMatch(condition, /cancelled\(\)|contains\(|== 'failure'|== 'cancelled'/);
        });

        it("runs for every non-success result of every lane the train needs", () => {
            for (const lane of trainNeeds.filter((j) => j !== "pick")) {
                for (const result of NOT_SUCCESS) {
                    // a lane that did not succeed skips versioning and landing
                    assert.equal(
                        runs({ [lane]: result, version: "skipped", land: "skipped" }),
                        true,
                        `${lane} ${result}`,
                    );
                }
            }
        });

        it("runs when the pick itself did not finish, but not when it skipped by design", () => {
            for (const result of NOT_SUCCESS.filter((r) => r !== "skipped")) {
                assert.equal(
                    runs(
                        {
                            pick: result,
                            ci: "skipped",
                            t4: "skipped",
                            hosts: "skipped",
                            audit: "skipped",
                            llm: "skipped",
                            version: "skipped",
                            land: "skipped",
                        },
                        "",
                    ),
                    true,
                    result,
                );
            }
            // a restart whose build failed skips the pick
            assert.equal(
                runs(
                    {
                        pick: "skipped",
                        ci: "skipped",
                        t4: "skipped",
                        hosts: "skipped",
                        audit: "skipped",
                        llm: "skipped",
                        version: "skipped",
                        land: "skipped",
                    },
                    "",
                ),
                false,
            );
        });

        it("stays quiet when the release landed, or the pick found nothing to release", () => {
            assert.equal(runs({}, "true", "true"), false);
            const none = {
                ci: "skipped",
                t4: "skipped",
                hosts: "skipped",
                audit: "skipped",
                llm: "skipped",
                version: "skipped",
                land: "skipped",
            };
            assert.equal(runs(none, "false"), false);
        });

        // Issue #1768: a bookkeeping step after the release went ahead (closing the held issue) failed, and this
        // job posted "Release held" for a release that was going ahead.
        it("opens no held issue when a step fails after the release landed", () => {
            for (const result of NOT_SUCCESS.filter((r) => r !== "skipped")) {
                assert.equal(runs({ land: result }, "true", "true"), false, `land ${result}`);
            }
            assert.match(land, /\n {8}outputs:\n {12}pushed: \$\{\{ steps.push.outputs.pushed \}\}\n/);
            // and the land job says so in the run, rather than failing silently
            assert.match(
                land,
                /- name: Report a failure after the release landed\n\s+if: \$\{\{ failure\(\) && steps.push.outputs.pushed == 'true' \}\}[\s\S]*::error::/,
            );
        });

        it("stays quiet for a green shadow run, which lands nothing, and when the owner declines the approval", () => {
            assert.equal(runs({ approve: "skipped", land: "skipped" }), false);
            for (const result of NOT_SUCCESS.filter((r) => r !== "skipped")) {
                assert.equal(runs({ approve: result, land: "skipped" }), false, `approve ${result}`);
            }
        });

        it("never runs in a full run, which ends in its verdict instead", () => {
            for (const mode of ["full", "restart"]) {
                assert.equal(runs({ ci: "failure", version: "skipped", land: "skipped" }, "true", "", mode), false);
                assert.equal(runs({ pick: "failure" }, "", "", mode), false);
            }
            assert.equal(runs({ ci: "failure", version: "skipped", land: "skipped" }, "true", "", "shadow"), true);
        });

        it("reports a full run's promotion whose versioning or landing failed", () => {
            for (const mode of ["full", "restart"]) {
                assert.equal(runs({ version: "failure", land: "skipped" }, "true", "", mode, "true"), true, mode);
                assert.equal(runs({ land: "failure" }, "true", "", mode, "true"), true, mode);
                assert.equal(runs({}, "true", "true", mode, "true"), false, "landed: the site job reports");
                assert.equal(runs({ version: "skipped", land: "skipped" }, "true", "", mode, "false"), false);
            }
        });

        it("still opens the held issue when versioning or landing fails before the push", () => {
            for (const result of NOT_SUCCESS) {
                assert.equal(runs({ version: result, land: "skipped" }, "true", ""), true, `version ${result}`);
                assert.equal(runs({ land: result }, "true", ""), true, `land ${result}`);
            }
        });

        // The issue step, run in a scratch directory with stubs: gh lists this attempt's jobs (run 37635516841's
        // shape: CI's "All Checks Pass" never ran, "Queue Checks Pass" failed on it) and tools/release-held.sh
        // records the issue it would open.
        const issue = (env, jobs) => {
            const script =
                /- name: Open or update the held-release issue\n\s+id: hold\n\s+run: \|\n([\s\S]*?)\n\n/.exec(held)[1];
            const dir = mkdtempSync(join(tmpdir(), "release-held-"));
            try {
                mkdirSync(join(dir, "tools"));
                mkdirSync(join(dir, "bin"));
                writeFileSync(join(dir, "jobs.json"), JSON.stringify({ jobs }));
                // `gh api .../jobs --jq <filter>` answers from jobs.json through the real jq; a job log is empty
                writeFileSync(
                    join(dir, "bin", "gh"),
                    `#!/bin/bash\ncase "$2" in */jobs\\?*) jq -r "$4" "${join(dir, "jobs.json")}";; comment) echo "#$3" > "${join(dir, "title")}"; cp "$5" "${join(dir, "body")}";; esac\n`,
                    { mode: 0o755 },
                );
                writeFileSync(join(dir, "tools", "gpu-runner-lost.sh"), "#!/bin/sh\nexit 1\n", { mode: 0o755 });
                writeFileSync(
                    join(dir, "tools", "release-held.sh"),
                    `#!/bin/sh\necho "$2" > "${join(dir, "title")}"\ncp "$3" "${join(dir, "body")}"\necho 42\n`,
                    { mode: 0o755 },
                );
                const run = spawnSync("bash", ["-c", script.replace(/^ {18}/gm, "")], {
                    cwd: dir,
                    encoding: "utf8",
                    env: {
                        ...process.env,
                        PATH: `${join(dir, "bin")}:${process.env.PATH}`,
                        GITHUB_SERVER_URL: "https://github.com",
                        GITHUB_REPOSITORY: "o/r",
                        GITHUB_RUN_ID: "37635516841",
                        GITHUB_RUN_ATTEMPT: "1",
                        GITHUB_OUTPUT: join(dir, "output"),
                        RUNNER_TEMP: dir,
                        TRIGGER: "schedule",
                        MODE: "legacy",
                        SHA: "44ab26d10658f95c66025ab391219e2865b94aa8",
                        PICK_RESULT: "success",
                        CI_RESULT: "success",
                        T4_RESULT: "success",
                        HOSTS_RESULT: "success",
                        AUTOSAVE_MACOS_RESULT: "success",
                        AUDIT_RESULT: "success",
                        LLM_RESULT: "success",
                        LLM_OWNER_ITEM: "",
                        VERSION_DRY_RUN_RESULT: "success",
                        VERSION_RESULT: "success",
                        LAND_RESULT: "skipped",
                        ...env,
                    },
                });
                assert.equal(run.status, 0, run.stderr);
                return {
                    title: readFileSync(join(dir, "title"), "utf8"),
                    body: readFileSync(join(dir, "body"), "utf8"),
                };
            } finally {
                rmSync(dir, { recursive: true, force: true });
            }
        };
        const JOBS = [
            { id: 1, name: "Pick the release candidate", status: "completed", conclusion: "success", steps: [] },
            { id: 2, name: "CI / Build", status: "completed", conclusion: "success", steps: [] },
            { id: 3, name: "CI / All Checks Pass", status: "queued", conclusion: null, steps: [] },
            {
                id: 4,
                name: "CI / Queue Checks Pass",
                status: "completed",
                conclusion: "failure",
                steps: [{ name: "Check the run passed, and was the full suite in the queue", conclusion: "failure" }],
            },
            { id: 5, name: "Coverage", status: "completed", conclusion: "skipped", steps: [] },
            { id: 6, name: "Hold the release", status: "in_progress", conclusion: null, steps: [] },
        ];

        it("opens the issue for an abandoned CI call, naming the job that never ran", () => {
            const { title, body } = issue({ CI_RESULT: "abandoned" }, JOBS);
            assert.equal(title, "Release held: CI failed on 44ab26d\n");
            assert.match(body, /Results: candidate pick success, CI abandoned, T4 GPU success, /);
            assert.match(body, /Jobs that did not pass: CI \/ All Checks Pass, CI \/ Queue Checks Pass\n/);
            assert.match(body, /\nCI \/ All Checks Pass: never finished \(still queued\)/);
            assert.match(body, /\nCI \/ Queue Checks Pass \(failure\): Check the run passed/);
            assert.match(body, /githubstatus\.com/);
            assert.doesNotMatch(body, /Hold the release|Coverage/);
        });

        it("in a shadow run, comments once on #3418 instead of opening a Release held issue", () => {
            const { title, body } = issue({ MODE: "shadow", T4_RESULT: "failure" }, []);
            assert.equal(title, "#3418\n");
            assert.match(body, /^\*\*Shadow release run: T4 GPU failed on 44ab26d\*\*\n/);
            assert.match(body, /A shadow run: it never pushes or publishes, and it holds nothing/);
            assert.doesNotMatch(body, /Nothing was pushed to master and nothing was published/);
            assert.match(held, /gh issue comment 3418 --body-file/);
            assert.equal(held.match(/gh issue comment/g).length, 1);
        });

        it("opens the issue when a lane was only cancelled", () => {
            const { title } = issue({ T4_RESULT: "cancelled" }, []);
            assert.equal(title, "Release held: T4 GPU failed on 44ab26d\n");
        });

        it("opens the issue when the pick itself failed", () => {
            const { title } = issue(
                {
                    PICK_RESULT: "failure",
                    CI_RESULT: "skipped",
                    T4_RESULT: "skipped",
                    HOSTS_RESULT: "skipped",
                    AUTOSAVE_MACOS_RESULT: "skipped",
                    AUDIT_RESULT: "skipped",
                    LLM_RESULT: "skipped",
                },
                [],
            );
            assert.equal(title, "Release held: candidate pick failed on 44ab26d\n");
        });

        it("names a failed LLM lane, and an owner item as one", () => {
            assert.equal(
                issue({ LLM_RESULT: "failure" }, []).title,
                "Release held: LLM regression failed on 44ab26d\n",
            );
            assert.equal(
                issue({ LLM_RESULT: "cancelled" }, []).title,
                "Release held: LLM regression failed on 44ab26d\n",
            );
            const { title, body } = issue(
                { LLM_RESULT: "failure", LLM_OWNER_ITEM: "the provider refused the account (credit balance too low)" },
                [],
            );
            assert.equal(title, "Release held: LLM regression (owner item: Google account) failed on 44ab26d\n");
            assert.match(body, /LLM regression \(owner item: Google account\) failure/);
            assert.match(body, /The LLM regression job did not fail on code: the provider refused the account/);
            assert.doesNotMatch(body, /githubstatus/);
        });

        it("names a failed land, and holds the outage hint back when a job failed on its own", () => {
            const { title, body } = issue({ LAND_RESULT: "failure" }, [
                {
                    id: 7,
                    name: "Land the release on master",
                    status: "completed",
                    conclusion: "failure",
                    steps: [{ name: "Push the version commit and its tags to master", conclusion: "failure" }],
                },
            ]);
            assert.equal(title, "Release held: landing on master failed on 44ab26d\n");
            assert.match(body, /Land the release on master \(failure\): Push the version commit/);
            assert.match(body, /Nothing was pushed to master and nothing was published\./);
            assert.doesNotMatch(body, /githubstatus|pull request was/);
            assert.equal(
                issue({ VERSION_RESULT: "failure" }, []).title,
                "Release held: versioning failed on 44ab26d\n",
            );
        });
    });

    describe("starts only on dispatch, never on a master push", () => {
        // The pick job's "Skip while the previous release is pending" step, run in a scratch directory with
        // stubs for gh (no release pull request left, or one from the old design to close), git (no release yet) and
        // tools/release-held.sh (the held train issue, or none; `publishHold` an open publish hold, which only a
        // plain `find` returns). `trigger` is the workflow's TRIGGER: "schedule" for a scheduler dispatch
        // (scheduled=true), "workflow_dispatch" for one by hand. `calls` collects every gh call. `settle` stubs
        // tools/publish-hold.mjs settle: "closes" (npm lists what the publish hold awaited, so the hold is gone),
        // "keeps" or "throws".
        const pending = (
            trigger,
            heldIssue,
            trainPr = false,
            publishHold = "",
            calls = [],
            settle = "keeps",
            extra = {},
        ) => {
            const script = /- name: Skip while the previous release is pending[\s\S]*?run: \|\n([\s\S]*?)\n\n/.exec(
                pick,
            )[1];
            const dir = mkdtempSync(join(tmpdir(), "release-pick-"));
            try {
                mkdirSync(join(dir, "tools"));
                mkdirSync(join(dir, "bin"));
                // `gh pr list` names an open release pull request of the old design; every gh call is recorded
                const log = join(dir, "gh-calls");
                const gh =
                    `echo "$1 $2 $3" >> "${log}"\n${trainPr ? '[ "$1 $2" != "pr list" ] || echo 77' : ""}\n` +
                    `[ "$1 $2" != "run list" ] || echo ${extra.shadowPassed ?? 0}`;
                writeFileSync(join(dir, "bin", "gh"), `#!/bin/sh\n${gh}\n`, { mode: 0o755 });
                // no release commit yet, so no tag to wait for
                writeFileSync(join(dir, "bin", "git"), "#!/bin/sh\n", { mode: 0o755 });
                writeFileSync(
                    join(dir, "tools", "release-held.sh"),
                    `#!/bin/sh\nif [ "$2" = --train ] || [ -f settled ]; then echo ${heldIssue}; else echo ${heldIssue || publishHold}; fi\n`,
                    { mode: 0o755 },
                );
                writeFileSync(
                    join(dir, "tools", "publish-hold.mjs"),
                    {
                        closes: `import { writeFileSync } from "node:fs";\nif (process.argv[2] === "settle" && process.argv[4] === "${publishHold}") writeFileSync("settled", "");\n`,
                        keeps: "",
                        throws: 'throw new Error("GitHub said 502");\n',
                    }[settle],
                );
                const output = join(dir, "output");
                writeFileSync(output, "");
                const run = spawnSync("bash", ["-c", script.replace(/^ {18}/gm, "")], {
                    cwd: dir,
                    encoding: "utf8",
                    env: {
                        ...process.env,
                        PATH: `${join(dir, "bin")}:${process.env.PATH}`,
                        TRIGGER: trigger,
                        GITHUB_SERVER_URL: "https://github.com",
                        GITHUB_REPOSITORY: "o/r",
                        GITHUB_RUN_ID: "1",
                        CANDIDATE: "abc123",
                        GITHUB_OUTPUT: output,
                        ...(extra.mode ? { MODE: extra.mode } : {}),
                    },
                });
                assert.equal(run.status, 0, run.stderr);
                if (existsSync(log)) calls.push(...readFileSync(log, "utf8").trim().split("\n"));
                return readFileSync(output, "utf8");
            } finally {
                rmSync(dir, { recursive: true, force: true });
            }
        };

        it("has no workflow_run trigger, so a master push starts no release and restarts no held one", () => {
            const on = /^on:\n([\s\S]*?)\n\S/m.exec(release)[1];
            assert.deepEqual(on.match(/^ {4}\w+:/gm), ["    workflow_dispatch:"]);
            assert.doesNotMatch(release.replace(/^\s*#.*$/gm, ""), /workflow_run/);
            assert.match(
                pick,
                /\n {8}if: \$\{\{ !cancelled\(\) && \(github.ref == 'refs\/heads\/master' \|\| github.ref == 'refs\/heads\/channel\/full-run'\) \}\}\n/,
            );
        });

        it("runs a schedule only when nothing is held, and a dispatch by hand anyway", () => {
            assert.equal(pending("schedule", ""), "pending=false\nsha=abc123\n");
            assert.equal(pending("schedule", "1234"), "pending=true\n");
            assert.equal(pending("workflow_dispatch", "1234"), "pending=false\nsha=abc123\n");
        });

        it("skips the schedule for a publish hold too, which only a re-run publish clears", () => {
            assert.equal(pending("schedule", "", false, "1440"), "pending=true\n");
            assert.match(pick, /held=\$\(tools\/release-held.sh find\)\n/);
        });

        it("ends a publish hold npm only had to list, before any hold decides, and never fails the pick over it", () => {
            // npm now lists every version it accepted: the hold closes and the schedule runs the train
            assert.equal(pending("schedule", "", false, "2189", [], "closes"), "pending=false\nsha=abc123\n");
            // npm refused one, or has not listed it yet: still held
            assert.equal(pending("schedule", "", false, "2189", [], "keeps"), "pending=true\n");
            // GitHub or npm failing to answer leaves the hold for the next attempt, never a red pick
            assert.equal(pending("schedule", "", false, "2189", [], "throws"), "pending=true\n");
            assert.match(pick, /issues: write/);
            const settle = pick.indexOf("node tools/publish-hold.mjs settle");
            assert.ok(settle > 0 && settle < pick.indexOf("held=$(tools/release-held.sh find)\n"));
            assert.match(pick, /publish_hold=\$\(tools\/release-held.sh find "Release held: publish failed"\)/);
            assert.match(
                pick,
                /GITHUB_TOKEN: \$\{\{ github.token \}\}\n\s+RELEASE_NOTIFY: \$\{\{ vars.RELEASE_NOTIFY \}\}/,
            );
        });

        it("skips a scheduler dispatch while a held issue is open; runs one by hand", () => {
            // scheduled=true: TRIGGER is "schedule"
            assert.equal(pending("schedule", "1234"), "pending=true\n");
            assert.equal(pending("schedule", ""), "pending=false\nsha=abc123\n");
            // by hand (scheduled=false): runs despite the held issue
            assert.equal(pending("workflow_dispatch", "1234"), "pending=false\nsha=abc123\n");
        });

        it("never skips a full run's slot for a held issue: it publishes nothing", () => {
            for (const mode of ["full", "restart"]) {
                const run = pending("schedule", "1234", false, "", [], "keeps", { mode });
                assert.equal(run, "pending=false\nsha=abc123\n");
            }
        });

        it("skips a scheduled shadow run on a commit a shadow run already passed, never a dispatch", () => {
            const shadow = (trigger, shadowPassed) =>
                pending(trigger, "", false, "", [], "keeps", { mode: "shadow", shadowPassed });
            assert.equal(shadow("schedule", 1), "pending=true\n");
            assert.equal(shadow("schedule", 0), "pending=false\nsha=abc123\n");
            assert.equal(shadow("workflow_dispatch", 1), "pending=false\nsha=abc123\n");
            assert.match(pick, /actions: read/);
        });

        it("closes a release pull request left from the old design and releases anyway", () => {
            const calls = [];
            assert.equal(pending("schedule", "", true, "", calls), "pending=false\nsha=abc123\n");
            assert.deepEqual(calls, ["pr list --state", "pr close 77"]);
        });

        it("shares the one train group, so two pushes in a row never start two trains", () => {
            assert.match(release, /^concurrency:\n {4}group: release-train\n {4}cancel-in-progress: false/m);
        });

        it("tells a legacy hold's fix to keep the issue open and dispatch again", () => {
            assert.match(held, /Refs #<this issue>/);
            assert.match(held, /gh workflow run release.yml --ref master -f mode=legacy/);
        });
    });

    it("publishes the landed version commit, from this run's tested builds, with OIDC", () => {
        assert.match(publish, /id-token: write/);
        assert.match(publish, /ref: \$\{\{ needs.version.outputs.commit \}\}/);
        assert.doesNotMatch(publish, /run-id:/, "this run's own builds");
        assert.doesNotMatch(version + land, /id-token|nx release publish/);
        // the GitHub releases name the tags the land job pushed
        assert.match(publish, /gh release create "\$tag" --verify-tag /);
    });

    it("publishes npm next for the nightly path and latest for legacy, from the one release environment", () => {
        assert.match(release, /^ {4}DIST_TAG: \$\{\{ inputs.mode == 'legacy' && 'latest' \|\| 'next' \}\}\n/m);
        assert.match(publish, /\n {8}environment: release # npm trusted publishing/);
        assert.match(publish, /nx release publish --projects="\$PROJECTS" --tag "\$DIST_TAG" /);
        // a next release is a GitHub prerelease, never "Latest"
        assert.match(publish, /\[ "\$DIST_TAG" = latest \] \|\| flags=\(--prerelease --latest=false\)/);
        assert.match(publish, /gh release create "\$tag" --verify-tag "\$\{flags\[@\]\}" /);
        // no dependency's install script runs beside npm's OIDC in a nightly publish; legacy installs as before
        assert.deepEqual(publish.match(/pnpm install[^\n]*/g), [
            "pnpm install --frozen-lockfile ${{ inputs.mode != 'legacy' && '--ignore-scripts' || '' }}",
        ]);
        // legacy still lands and publishes only behind the owner's production approval; a nightly promotion lands
        // once its version job passed (the verdict decided to promote)
        assert.match(
            land,
            /needs: \[pick, version, approve\]\n[^\n]*\n\s+if: \$\{\{ !cancelled\(\) && needs.version.result == 'success' && \(needs.approve.result == 'success' \|\| inputs.mode == 'full' \|\| inputs.mode == 'restart' \|\| inputs.mode == 'candidate' \|\| inputs.mode == 'promote-nightly'\) \}\}/,
        );
        assert.match(
            approve,
            /if: \$\{\{ !cancelled\(\) && inputs.mode == 'legacy' && needs.version.result == 'success' \}\}/,
        );
        // npm next moves only when something was versioned; the site and channel/nightly move either way
        assert.match(
            publish,
            /if: \$\{\{ always\(\) && needs.land.outputs.pushed == 'true' && needs.version.outputs.commit != '' \}\}/,
        );
    });

    describe("the land job's push, against a real repository", () => {
        // The "Push the version commit and its tags to master" step, run against a bare origin: master at the
        // tested commit T, the version commit V made on T and kept as a bundle, and optionally a commit that
        // reached master after T (`moved`) or one that edits the same version line (`conflict`).
        const land_ = (opts = {}) => {
            const script = landSh;
            const dir = mkdtempSync(join(tmpdir(), "release-land-"));
            const git = (cwd, ...args) => {
                const r = spawnSync("git", args, { cwd, encoding: "utf8" });
                assert.equal(r.status, 0, `git ${args.join(" ")}: ${r.stderr}`);
                return r.stdout.trim();
            };
            try {
                const origin = join(dir, "origin.git");
                const work = join(dir, "work");
                git(dir, "init", "-q", "--bare", "-b", "master", origin);
                git(dir, "clone", "-q", origin, work);
                for (const k of ["user.name", "user.email"]) git(work, "config", k, "t@t");
                mkdirSync(join(work, "tools"));
                copyFileSync(new URL("./release-diff.mjs", import.meta.url), join(work, "tools", "release-diff.mjs"));
                writeFileSync(join(work, "package.json"), '{\n    "name": "a",\n    "version": "1.0.0"\n}\n');
                writeFileSync(join(work, "src.txt"), "code\n");
                git(work, "add", ".");
                git(work, "commit", "-qm", "feat: t");
                const T = git(work, "rev-parse", "HEAD");
                git(work, "push", "-q", "origin", "HEAD:master");
                // S, the commit versioned: T itself; the owner's accept commit on T, merged into master (a promotion
                // after approval); or a commit master does not hold (code that never went through a pull request)
                if (opts.accept) {
                    git(work, "switch", "-q", "-c", "accept");
                    mkdirSync(join(work, "visual-baselines"));
                    writeFileSync(join(work, "visual-baselines", "a.png"), "png\n");
                    git(work, "add", ".");
                    git(work, "commit", "-qm", `test(workspace): approve visual baselines at ${T.slice(0, 12)}`);
                    git(work, "switch", "-q", "master");
                    git(work, "merge", "-q", "--no-ff", "-m", "Merge the approval", "accept");
                    git(work, "push", "-q", "origin", "HEAD:master");
                    git(work, "switch", "-q", "--detach", "accept");
                } else if (opts.unmerged) {
                    writeFileSync(join(work, "src.txt"), "code master never reviewed\n");
                    git(work, "commit", "-qam", "fix: not on master");
                }
                const S = git(work, "rev-parse", "HEAD");
                // the version commit and its bundle, as the version job makes them
                writeFileSync(join(work, "package.json"), '{\n    "name": "a",\n    "version": "1.1.0"\n}\n');
                writeFileSync(join(work, "CHANGELOG.md"), "## 1.1.0\n");
                git(work, "add", ".");
                git(work, "commit", "-qm", "chore(release): publish [skip ci]\n\n- project: a 1.1.0");
                const V = git(work, "rev-parse", "HEAD");
                mkdirSync(join(dir, "release"));
                git(work, "branch", "release", V);
                git(work, "bundle", "create", join(dir, "release", "release.bundle"), "release", `^${S}`);
                git(work, "checkout", "-q", "--detach", S);
                git(work, "branch", "-D", "release");
                if (opts.moved || opts.conflict) {
                    const other = join(dir, "other");
                    git(dir, "clone", "-q", origin, other);
                    for (const k of ["user.name", "user.email"]) git(other, "config", k, "t@t");
                    if (opts.conflict)
                        writeFileSync(join(other, "package.json"), '{\n    "name": "a",\n    "version": "9.9.9"\n}\n');
                    else writeFileSync(join(other, "src.txt"), "newer code\n");
                    git(other, "commit", "-qam", "fix: after the candidate");
                    git(other, "push", "-q", "origin", "HEAD:master");
                }
                if (opts.nightlyAhead) {
                    // a nightly the candidate's history lacks (a newer commit off master)
                    const other = join(dir, "ahead");
                    git(dir, "clone", "-q", origin, other);
                    for (const k of ["user.name", "user.email"]) git(other, "config", k, "t@t");
                    writeFileSync(join(other, "src.txt"), "nightly code\n");
                    git(other, "commit", "-qam", "fix: on nightly");
                    git(other, "push", "-q", "origin", "HEAD:refs/heads/channel/nightly");
                }
                // a held candidate: branch channel/candidate at the tested commit
                if (opts.held) git(work, "push", "-q", "origin", `${T}:refs/heads/channel/candidate`);
                const output = join(dir, "output");
                writeFileSync(output, "");
                const run = spawnSync("bash", ["-c", script.replace(/^ {18}/gm, "")], {
                    cwd: work,
                    encoding: "utf8",
                    env: {
                        ...process.env,
                        RUNNER_TEMP: dir,
                        GITHUB_OUTPUT: output,
                        SHA: S,
                        // after the owner's approval the land job is told the candidate the lanes tested
                        ...(opts.accept ? { TESTED: T } : {}),
                        COMMIT: opts.noVersion ? "" : V,
                        TAGS: opts.noVersion ? "" : "a@1.1.0",
                        DIST_TAG: opts.distTag ?? "latest",
                        HELD: opts.held === "other" ? "f".repeat(40) : opts.held ? T : "",
                        HUSKY: "0",
                    },
                });
                const master = spawnSync("git", ["--git-dir", origin, "rev-parse", "master"], {
                    encoding: "utf8",
                }).stdout.trim();
                const tag = spawnSync(
                    "git",
                    ["--git-dir", origin, "rev-parse", "-q", "--verify", "refs/tags/a@1.1.0^{commit}"],
                    {
                        encoding: "utf8",
                    },
                ).stdout.trim();
                const parents = git(dir, "--git-dir", origin, "log", "-1", "--format=%P %s", "master");
                const ref = (name) =>
                    spawnSync("git", ["--git-dir", origin, "rev-parse", "-q", "--verify", `${name}^{commit}`], {
                        encoding: "utf8",
                    }).stdout.trim();
                const site = ref(`refs/tags/site-${T}`);
                const nightly = ref("refs/heads/channel/nightly");
                const candidate = ref("refs/heads/channel/candidate");
                return {
                    run,
                    output: readFileSync(output, "utf8"),
                    master,
                    tag,
                    parents,
                    site,
                    nightly,
                    candidate,
                    T,
                    S,
                    V,
                };
            } finally {
                rmSync(dir, { recursive: true, force: true });
            }
        };

        it("merges the version commit into master and tags the version commit, in one push", () => {
            const r = land_();
            assert.equal(r.run.status, 0, r.run.stdout + r.run.stderr);
            assert.equal(r.output, "pushed=true\n");
            assert.equal(r.tag, r.V, "the tag names the shipped source, not the merge");
            assert.equal(r.parents, `${r.T} ${r.V} chore(release): publish a@1.1.0 onto master`);
            assert.equal(r.site, "", "a legacy (latest) release pushes no site tag");
            assert.equal(r.nightly, "", "and does not move channel/nightly");
        });

        it("a nightly (next) release also pushes the site tag on the tested commit and channel/nightly", () => {
            const r = land_({ distTag: "next" });
            assert.equal(r.run.status, 0, r.run.stdout + r.run.stderr);
            assert.equal(r.tag, r.V);
            assert.equal(r.site, r.T, "site-<sha> names the tested commit");
            assert.equal(r.nightly, r.V, "channel/nightly is the version commit");
            assert.equal(
                r.parents,
                `${r.T} ${r.V} chore(release): nightly a@1.1.0 onto master`,
                "not a production subject",
            );
        });

        it("refuses a nightly whose candidate lacks the current channel/nightly, by name, pushing nothing", () => {
            const r = land_({ distTag: "next", nightlyAhead: true });
            assert.equal(r.run.status, 1);
            assert.match(r.run.stdout, /::error::channel\/nightly \([0-9a-f]+\) is not in the history of /);
            assert.deepEqual([r.output, r.site, r.master, r.tag], ["", "", r.T, ""]);
        });

        it("a nightly with nothing versioned moves only the site tag and channel/nightly, to the tested commit", () => {
            const r = land_({ distTag: "next", noVersion: true });
            assert.equal(r.run.status, 0, r.run.stdout + r.run.stderr);
            assert.equal(r.output, "pushed=true\n");
            assert.equal(r.master, r.T, "master does not move");
            assert.equal(r.tag, "", "no version tag");
            assert.equal(r.site, r.T);
            assert.equal(r.nightly, r.T);
        });

        it("deletes channel/candidate in the same push when the held candidate promotes, and only then", () => {
            const r = land_({ distTag: "next", held: true });
            assert.equal(r.run.status, 0, r.run.stdout + r.run.stderr);
            assert.deepEqual([r.nightly, r.candidate], [r.V, ""], "the hold's branch goes with nightly's move");
            const other = land_({ distTag: "next", held: "other" });
            assert.equal(other.run.status, 0, other.run.stdout + other.run.stderr);
            assert.equal(other.candidate, other.T, "another commit's promotion leaves the hold's branch");
            assert.equal(land_({ distTag: "next" }).candidate, "", "no branch, nothing to delete");
        });

        it("promotes the owner's accept commit: site tag on the tested candidate, nightly on its version commit", () => {
            const r = land_({ distTag: "next", held: true, accept: true });
            assert.equal(r.run.status, 0, r.run.stdout + r.run.stderr);
            assert.notEqual(r.S, r.T);
            assert.equal(r.site, r.T, "the site master built is the candidate's");
            assert.equal(r.nightly, r.V, "channel/nightly is the accept commit's version commit");
            assert.equal(r.tag, r.V);
            assert.equal(r.candidate, "", "the held candidate's branch goes with the promotion");
        });

        it("refuses a version commit whose merge would bring master code no pull request reviewed", () => {
            const r = land_({ distTag: "next", unmerged: true });
            assert.equal(r.run.status, 1);
            assert.match(
                r.run.stdout,
                /::error::merging .* into master would bring in more than versions and changelogs/,
            );
            assert.deepEqual([r.output, r.tag, r.master], ["", "", r.T], "nothing pushed");
        });

        it("refuses a legacy release with no version commit, pushing nothing", () => {
            const r = land_({ noVersion: true });
            assert.equal(r.run.status, 1);
            assert.match(r.run.stdout, /::error::no version commit to land/);
            assert.deepEqual([r.output, r.site, r.nightly], ["", "", ""]);
        });

        it("lands on top of a master that moved since the candidate", () => {
            const r = land_({ moved: true });
            assert.equal(r.run.status, 0, r.run.stdout + r.run.stderr);
            assert.equal(r.tag, r.V);
            const [first, second] = r.parents.split(" ");
            assert.notEqual(first, r.T, "the newer master commit is the first parent");
            assert.equal(second, r.V);
        });

        it("holds, pushing nothing, when master changed a line the release writes", () => {
            const r = land_({ conflict: true });
            assert.equal(r.run.status, 1);
            assert.match(r.run.stdout, /::error::the version commit .* does not merge cleanly into master/);
            assert.equal(r.output, "");
            assert.equal(r.tag, "", "no tag without the commit");
        });
    });

    it("reports a failed publish as a held release, and closes it when a re-run publishes", () => {
        assert.match(publish, /issues: write/);
        assert.match(
            publish,
            /- name: Report a failed publish\n\s+id: report\n\s+if: \$\{\{ failure\(\) \}\}[\s\S]*title="Release held: publish failed on \$\{SHA:0:7\}"[\s\S]*tools\/release-held.sh open "\$title"/,
        );
        assert.match(
            publish,
            /- name: Close the failed-publish issue\n\s+run: \|\n\s+tools\/release-held.sh close[\s\S]*"Release held: publish failed"\n/,
        );
    });

    it("announces every outcome on the Release status issue: held, published or failed", () => {
        // tools/release-status.mjs mentions RELEASE_NOTIFY; a run the owner did not start notifies nobody otherwise
        assert.match(held, /node tools\/release-status.mjs "\$outcome" /);
        assert.match(held, /outcome=held\n/);
        assert.match(held, /RELEASE_NOTIFY: \$\{\{ vars.RELEASE_NOTIFY \}\}/);
        assert.doesNotMatch(release, /release-status.mjs (opened|dequeued)/);
        assert.match(held, /tools\/release-status.mjs\n/, "in the held job's sparse checkout");
        // the last step of the publish job, whatever happened above it, so a re-run (--failed) announces again
        // the site job's comment follows the publish job
        assert.match(
            publish.replace(/(\n {4}#[^\n]*)+$/, ""),
            /- name: Announce the publish outcome\n\s+if: \$\{\{ always\(\) && \(env.DIST_TAG == 'latest' \|\| job.status != 'success'\) \}\}[\s\S]*OUTCOME: \$\{\{ job.status == 'success' && 'published' \|\| 'publish-failed' \}\}[\s\S]*node tools\/release-status.mjs "\$OUTCOME"[^\n]*\n[^\n]*\n$/,
        );
        assert.match(publish, /echo "tags=\$\(IFS=,; echo "\$\{tags\[\*\]\}"\)" >> "\$GITHUB_OUTPUT"/);
    });

    it("sends a phone notice when a train starts testing a candidate, RETRYING after a fix or on a re-run", () => {
        // after the pending and nothing-releasable checks, only when there is something to release
        assert.ok(pick.indexOf("- name: Announce the train attempt") > pick.indexOf("id: releasable"));
        assert.match(
            pick,
            /- name: Announce the train attempt\n\s+if: \$\{\{ steps.releasable.outputs.release == 'true' && inputs.mode == 'legacy' \}\}\n\s+continue-on-error: true\n/,
        );
        assert.match(pick, /TAGS: \$\{\{ steps.releasable.outputs.tags \}\}/);
        assert.match(
            pick,
            /node tools\/release-status.mjs started --sha "\$SHA" --tags "\$TAGS" \\\n\s+--attempt "\$GITHUB_RUN_ATTEMPT"/,
        );
        // a re-run of a failed publish says it is retrying, before anything else in the job
        assert.match(
            publish,
            /git archive "\$GITHUB_SHA" \$OVERLAY \| tar -x\n\n[^\n]*\n\s+- name: Announce a re-run of the publish\n\s+if: \$\{\{ github.run_attempt > 1 \}\}\n\s+continue-on-error: true\n/,
        );
        assert.match(publish, /node tools\/release-status.mjs started --sha "\$SHA" --attempt "\$GITHUB_RUN_ATTEMPT"/);
    });

    it("hands the Pushover secrets only to the steps that announce (tools/release-status.mjs, publish-hold.mjs settle)", () => {
        for (const name of ["release.yml", "release-watch.yml", "release-rerun.yml", "nightly-site.yml"]) {
            const steps = workflow(name).split(/\n(?=\s+- (?:name|uses): )/);
            // tools/release-rerun.mjs announces a re-run, or the red verdict it files, through release-status.mjs;
            // tools/health-dead-man.sh pages when the health dashboard itself has stopped
            const announcing = steps.filter((st) =>
                /node tools\/(?:release-status\.mjs |publish-hold\.mjs settle |release-rerun\.mjs\n)|run: tools\/health-dead-man\.sh\s*$/.test(
                    st,
                ),
            );
            assert.ok(announcing.length > 0, name);
            for (const st of steps) {
                const secrets = st.match(/secrets\.PUSHOVER_\w+/g) ?? [];
                if (announcing.includes(st)) {
                    assert.match(
                        st,
                        /\n\s+PUSHOVER_APP_TOKEN: \$\{\{ secrets.PUSHOVER_APP_TOKEN \}\}\n/,
                        `${name}: ${st}`,
                    );
                    assert.match(
                        st,
                        /\n\s+PUSHOVER_USER_KEY: \$\{\{ secrets.PUSHOVER_USER_KEY \}\}\n/,
                        `${name}: ${st}`,
                    );
                } else {
                    assert.deepEqual(secrets, [], `${name}: only an announcing step gets the Pushover secrets`);
                }
            }
        }
    });

    it("has a backstop that announces a run that ended badly without announcing itself", () => {
        const watch = workflow("release-watch.yml");
        // workflow_run matches the watched workflow by its name
        assert.match(release, /^name: Release\n/);
        assert.match(watch, /workflow_run:\n\s+workflows: \["Release"\]\n\s+types: \[completed\]\n/);
        assert.match(
            watch,
            /if: \$\{\{ github.event_name == 'workflow_dispatch' \|\| \(!contains\(fromJSON\('\["success","skipped","neutral"\]'\), github.event.workflow_run.conclusion\) && github.event.workflow_run.display_title != 'Release \(shadow\)'\) \}\}/,
        );
        // a shadow run is named so, and never announced: it publishes nothing. A full run is announced like a legacy
        // one: its verdict comments on a red run, and the backstop covers one that ended before its verdict.
        assert.match(
            release,
            /^run-name: \$\{\{ inputs.mode == 'legacy' && 'Release \(legacy\)' \|\| inputs.mode == 'shadow' && 'Release \(shadow\)' \|\| format\('Release \(\{0\}\)', inputs.mode \|\| 'full'\) \}\}\n/m,
        );
        assert.deepEqual(watch.match(/secrets\.\w+/g), PUSHOVER_SECRETS, "GITHUB_TOKEN and Pushover only");
        assert.deepEqual(watch.match(/\w+: write/g), ["issues: write"], "it writes only the comment");
        assert.match(watch, /RELEASE_NOTIFY: \$\{\{ vars.RELEASE_NOTIFY \}\}/);
        assert.match(watch, /node tools\/release-status.mjs run-ended --run "\$RUN_URL" --attempt "\$ATTEMPT"/);
        assert.match(watch, /--what "\$CONCLUSION" --sha "\$HEAD_SHA" --since "\$STARTED"/);
        // the same decision release-rerun.yml acts on, so a run it re-runs or files for is never announced twice
        assert.match(
            watch,
            /RUN="\$RUN_ID" WORKFLOW=Release GITHUB_OUTPUT="\$out" node tools\/release-rerun.mjs --dry/,
        );
        assert.match(watch, /if \[ -n "\$decision" \] && \[ "\$decision" != none \]; then\n[^\n]*\n\s+exit 0\n/);
    });

    // The failed-publish report, run in a scratch directory with stubs: the publish step's output (run
    // 37691314850's shape, colors and all), `pnpm exec nx show project` answering each project's root, and
    // tools/release-held.sh recording the issue it would open.
    const publishReport = (log, absent) => {
        const script = /- name: Report a failed publish\n\s+id: report\n\s+if: [^\n]*\n\s+run: \|\n([\s\S]*?)\n\n/.exec(
            publish,
        )[1];
        const dir = mkdtempSync(join(tmpdir(), "release-publish-"));
        try {
            mkdirSync(join(dir, "tools"));
            mkdirSync(join(dir, "bin"));
            for (const project of ["cytoscape-extensions", "layout"]) {
                mkdirSync(join(dir, project));
                writeFileSync(join(dir, project, "package.json"), JSON.stringify({ name: `@graphty/${project}` }));
            }
            writeFileSync(join(dir, "bin", "pnpm"), '#!/bin/sh\necho "{\\"root\\": \\"$5\\"}"\n', { mode: 0o755 });
            for (const f of ["publish-hold.mjs", "release-status.mjs"]) {
                copyFileSync(new URL(`./${f}`, import.meta.url), join(dir, "tools", f));
            }
            if (absent !== undefined) writeFileSync(join(dir, "absent.txt"), absent);
            writeFileSync(
                join(dir, "tools", "release-held.sh"),
                `#!/bin/sh\necho "$2" > "${join(dir, "title")}"\ncp "$3" "${join(dir, "body")}"\necho 42\n`,
                { mode: 0o755 },
            );
            if (log !== undefined) writeFileSync(join(dir, "publish.log"), log);
            const run = spawnSync("bash", ["-c", script.replace(/^ {18}/gm, "")], {
                cwd: dir,
                encoding: "utf8",
                env: {
                    ...process.env,
                    PATH: `${join(dir, "bin")}:${process.env.PATH}`,
                    GITHUB_SERVER_URL: "https://github.com",
                    GITHUB_REPOSITORY: "graphty-org/graphty-monorepo",
                    GITHUB_RUN_ID: "37691314850",
                    SHA: "e140ea5c8358785f46e6a671172c30a361c6ded4",
                    COMMIT: "f00dcafe",
                    GITHUB_OUTPUT: join(dir, "output"),
                    RUNNER_TEMP: dir,
                },
            });
            assert.equal(run.status, 0, run.stderr);
            return { title: readFileSync(join(dir, "title"), "utf8"), body: readFileSync(join(dir, "body"), "utf8") };
        } finally {
            rmSync(dir, { recursive: true, force: true });
        }
    };
    const task = (ok, project, output) =>
        `##[group]${ok ? "✅" : "❌"} \x1b[2m> \x1b[22m\x1b[2mnx run\x1b[22m ${project}:nx-release-publish\n\n${output}\n##[endgroup]\n`;
    const LOGIN =
        "pnpm publish error:\nThis command requires you to be logged in to https://registry.npmjs.org/\nYou need to authorize this machine using `npm adduser`";
    const FAILED = "\x1b[2mFailed tasks:\x1b[22m\n\n\x1b[2m-\x1b[22m cytoscape-extensions:nx-release-publish\n";

    it("keeps the publish output for the report and still lets the registry check decide", () => {
        assert.match(
            publish,
            /set -o pipefail\n\s+pnpm exec nx release publish --projects="\$PROJECTS" --tag "\$DIST_TAG" --nxBail=false 2>&1 \| tee "\$RUNNER_TEMP\/publish.log" \|\|\n\s+echo "::warning::/,
        );
        assert.match(
            publish,
            /- name: Check every version is on npm\n[\s\S]*?::error::\$\{spec\} is versioned on master but not on npm[\s\S]*?exit 1\n/,
        );
    });

    it("makes a package with no npm trusted publisher an owner item naming its settings, the fields and the re-run", () => {
        const { title, body } = publishReport(
            task(true, "graph-format", 'Published to https://registry.npmjs.org/ with tag "latest"') +
                task(false, "cytoscape-extensions", LOGIN) +
                task(true, "graphty-element", "{") +
                FAILED,
        );
        assert.equal(
            title.trim(),
            "Release held: publish failed on e140ea5: owner must create the npm trusted publisher for @graphty/cytoscape-extensions",
        );
        assert.ok(title.startsWith("Release held: publish failed"), "the close step still finds it");
        assert.match(body, /^## OWNER ITEM: create the npm trusted publisher for @graphty\/cytoscape-extensions\n/);
        assert.match(body, /This is not a code defect/);
        assert.match(
            body,
            /- @graphty\/cytoscape-extensions: https:\/\/www.npmjs.com\/package\/@graphty\/cytoscape-extensions\/access\n/,
        );
        assert.match(
            body,
            /Organization or user `graphty-org`, Repository `graphty-monorepo`, Workflow filename `release.yml`, Environment left empty/,
        );
        assert.match(body, /within 2 days/);
        assert.match(body, /`gh run rerun 37691314850 --failed`/);
        assert.doesNotMatch(body, /graph-format|graphty-element/);
    });

    it("names every package that hit the login error, and only those", () => {
        const { title, body } = publishReport(
            task(false, "layout", LOGIN) +
                task(false, "graph-io", "npm error code E403") +
                task(false, "cytoscape-extensions", LOGIN),
        );
        assert.match(title, /trusted publisher for @graphty\/cytoscape-extensions @graphty\/layout\n$/);
        assert.doesNotMatch(body, /graph-io/);
    });

    it("marks a hold npm only has to list as ending by itself, and the check step says what was missing", () => {
        assert.match(publish, /printf '%s\\n' "\$absent" > "\$RUNNER_TEMP\/absent.txt"\n\s+exit 1\n/);
        const tarball = (name, v) => `name:          @graphty/${name}\nversion:       ${v}\n`;
        const { title, body } = publishReport(
            task(
                true,
                "compact-mantine",
                `${tarball("compact-mantine", "0.9.20")}Published to https://registry.npmjs.org/ with tag "latest"`,
            ),
            "@graphty/compact-mantine@0.9.20\n",
        );
        assert.equal(
            title.trim(),
            "Release held: publish failed on e140ea5: npm has not listed @graphty/compact-mantine@0.9.20 yet",
        );
        assert.match(body, /^## Nothing to do: npm accepted @graphty\/compact-mantine@0\.9\.20/);
        assert.match(body, /\n<!-- publish-hold: awaiting-registry @graphty\/compact-mantine@0\.9\.20 -->\n$/);
        // one npm refused beside it: a person must act
        const refused = publishReport(
            task(
                true,
                "compact-mantine",
                `${tarball("compact-mantine", "0.9.20")}Published to https://registry.npmjs.org/ with tag "latest"`,
            ) + task(false, "layout", `${tarball("layout", "2.4.3")}npm error code E403`),
            "@graphty/compact-mantine@0.9.20\n@graphty/layout@2.4.3\n",
        );
        assert.equal(refused.title.trim(), "Release held: publish failed on e140ea5");
        assert.doesNotMatch(refused.body, /Nothing to do/);
        assert.match(refused.body, /\n<!-- publish-hold: rejected -->\n$/);
    });

    it("reports any other failed publish as before, with no owner item", () => {
        for (const log of [task(false, "graph-io", "npm error code E403\nnpm error 403 Forbidden"), undefined]) {
            const { title, body } = publishReport(log);
            assert.equal(title.trim(), "Release held: publish failed on e140ea5");
            assert.doesNotMatch(body, /OWNER ITEM/);
            assert.match(body, /^The publish job failed on e140ea5c[0-9a-f]* \(released as f00dcafe\)/);
            assert.match(body, /<!-- publish-hold: rejected -->/);
        }
    });

    // tools/release-held.sh itself, against a stub gh whose open issues are `issues` (the real --jq runs over
    // them with jq) and which records every other call. #1440: a train that failed during a publish hold
    // retitled the publish issue, and the next passing train closed it before the owner had acted.
    describe("keeps a publish hold separate from train holds", () => {
        const PUBLISH = { number: 1440, title: "Release held: publish failed on ecb1ba1" };
        const TRAIN = { number: 1500, title: "Release held: T4 GPU failed on 719db7f" };
        const held = (issues, ...args) => {
            const dir = mkdtempSync(join(tmpdir(), "release-held-sh-"));
            try {
                mkdirSync(join(dir, "bin"));
                writeFileSync(join(dir, "issues.json"), JSON.stringify(issues));
                writeFileSync(join(dir, "body.md"), "body\n");
                writeFileSync(
                    join(dir, "bin", "gh"),
                    [
                        "#!/bin/sh",
                        `if [ "$1 $2" = "issue list" ]; then`,
                        '    while [ $# -gt 0 ]; do [ "$1" = --jq ] && exec jq -r "$2" "' +
                            join(dir, "issues.json") +
                            '"; shift; done',
                        "fi",
                        'printf "%s\\n" "$*" >> "' + join(dir, "calls") + '"',
                        '[ "$1 $2" != "issue create" ] || echo https://github.com/o/r/issues/99',
                        "",
                    ].join("\n"),
                    { mode: 0o755 },
                );
                const run = spawnSync(
                    "bash",
                    [
                        new URL("./release-held.sh", import.meta.url).pathname,
                        ...args.map((a) => a.replace("BODY", join(dir, "body.md"))),
                    ],
                    {
                        encoding: "utf8",
                        env: {
                            ...process.env,
                            PATH: `${join(dir, "bin")}:${process.env.PATH}`,
                            GITHUB_REPOSITORY: "o/r",
                        },
                    },
                );
                assert.equal(run.status, 0, run.stderr);
                const calls = existsSync(join(dir, "calls")) ? readFileSync(join(dir, "calls"), "utf8") : "";
                return { out: run.stdout.trim(), calls: calls.replaceAll(join(dir, "body.md"), "BODY") };
            } finally {
                rmSync(dir, { recursive: true, force: true });
            }
        };

        it("opens a separate train issue when a train fails during a publish hold, leaving the publish issue alone", () => {
            const { out, calls } = held([PUBLISH], "open", "Release held: CI failed on 44ab26d", "BODY");
            assert.equal(out, "https://github.com/o/r/issues/99");
            assert.match(calls, /^issue create -R o\/r --title Release held: CI failed on 44ab26d /);
            assert.doesNotMatch(calls, /1440/);
        });

        it("retitles and comments on the train issue, never the publish issue, when both are open", () => {
            const { out, calls } = held([PUBLISH, TRAIN], "open", "Release held: CI failed on 44ab26d", "BODY");
            assert.equal(out, "1500");
            assert.equal(
                calls,
                "issue edit 1500 -R o/r --title Release held: CI failed on 44ab26d\nissue comment 1500 -R o/r --body-file BODY\n",
            );
        });

        it("closes only the train hold when a train passes", () => {
            assert.equal(held([PUBLISH, TRAIN], "close", "passed").calls, "issue close 1500 -R o/r --comment passed\n");
            assert.equal(held([PUBLISH], "close", "passed").calls, "");
        });

        it("finds a publish hold for the schedule but not for the restart gate", () => {
            assert.equal(held([PUBLISH], "find").out, "1440");
            assert.equal(held([PUBLISH], "find", "--train").out, "");
            assert.equal(held([PUBLISH, TRAIN], "find", "--train").out, "1500");
        });

        it("comments on an open publish hold without retitling it when the publish fails again", () => {
            const prefix = "Release held: publish failed";
            const title =
                "Release held: publish failed on ecb1ba1: owner must create the npm trusted publisher for @graphty/x";
            const { out, calls } = held([TRAIN, PUBLISH], "open", title, "BODY", prefix);
            assert.equal(out, "1440");
            assert.equal(calls, "issue comment 1440 -R o/r --body-file BODY\n");
            // with none open, it opens one; the passing re-run closes it and leaves the train hold
            assert.match(
                held([TRAIN], "open", title, "BODY", prefix).calls,
                /^issue create -R o\/r --title Release held: publish failed/,
            );
            assert.equal(
                held([TRAIN, PUBLISH], "close", "published", prefix).calls,
                "issue close 1440 -R o/r --comment published\n",
            );
        });

        it("is wired that way in release.yml", () => {
            assert.match(
                publish,
                /tools\/release-held.sh open "\$title" "\$RUNNER_TEMP\/body.md" "Release held: publish failed"\)/,
            );
            assert.match(publish, /until that run is re-run and passes/);
        });
    });

    describe("deploy-pages.yml", () => {
        const deploy = workflow("deploy-pages.yml");

        it("keeps the site of every green CI run of a push to master as site-<sha>", () => {
            assert.match(deploy, /workflow_run:\n\s+workflows: \["CI"\]/);
            const build = job(deploy, "build");
            assert.match(
                build,
                /if: \$\{\{ inputs.sha \|\| \(github.event.workflow_run.conclusion == 'success' && github.event.workflow_run.event == 'push'\) \}\}/,
            );
            assert.match(
                build,
                /name: site-\$\{\{ env.SHA \}\}\n\s+path: site-\$\{\{ env.SHA \}\}.tar\n\s+retention-days: 14/,
            );
            // the build job never deploys: the deploy job publishes master's newest site, whichever run it is in
            assert.doesNotMatch(build, /upload-pages-artifact|site\.json/);
            assert.match(job(deploy, "deploy"), /needs: build\n/);
            assert.doesNotMatch(
                deploy,
                /^concurrency:/m,
                "every build keeps its own site-<sha>; only the deploy job is serialized",
            );
        });

        // The deploy job's decision, against a stub curl (canary's page, or nothing when canary does not answer)
        // and a stub gh (the Pages domain, master's newest green build, the compare and the
        // newest build's site-<sha> artifact; null makes that call fail). Run as GitHub runs a step: bash -e -o pipefail.
        const decide = ({
            sha = "abc1111",
            newest = "abc9999",
            live = "0ddba11",
            compare = "ahead",
            order = "behind",
            cname = "canary.graphty.app",
            code = 200,
            cut = false,
            artifact = "42",
        } = {}) => {
            const dir = mkdtempSync(join(tmpdir(), "deploy-pages-"));
            const bin = join(dir, "bin");
            mkdirSync(bin);
            const page =
                live === ""
                    ? "<html></html>"
                    : `<meta name="graphty-build" content="commit=${live} release=graphty@1.0.0">`;
            writeFileSync(
                join(bin, "curl"),
                `#!/bin/bash\necho "$*" >> "${dir}/curl.log"\nwhile [ $# -gt 0 ]; do [ "$1" = -o ] && out=$2; shift; done\n` +
                    (live === null
                        ? `printf 000\nexit 6\n`
                        : cut
                          ? `echo '<html><head>' > "$out"\nprintf ${code}\nexit 28\n`
                          : `echo '${page}' > "$out"\nprintf ${code}\n`),
                { mode: 0o755 },
            );
            const answer = (v) => (v === null ? "exit 1" : `echo "${v}"`);
            writeFileSync(
                join(bin, "gh"),
                `#!/bin/bash\necho "$*" >> "${dir}/gh.log"\ncase "$2" in\n*/pages) ${answer(cname)};;\n` +
                    `*/workflows/ci.yml/runs*) ${answer(newest)};;\n` +
                    `*/compare/abc9999...abc1111) ${answer(order)};;\n*/compare/*) ${answer(compare)};;\n*/actions/artifacts*) ${answer(artifact)};;\n*) exit 1;;\nesac\n`,
                { mode: 0o755 },
            );
            const step = /- id: live\n([\s\S]*?)\n\n/.exec(`${job(deploy, "deploy")}\n\n`)[1];
            const script = /run: \|\n([\s\S]*)$/.exec(step)[1].replace(/^ {18}/gm, "");
            const out = join(dir, "out");
            writeFileSync(out, "");
            const r = spawnSync("bash", ["-e", "-o", "pipefail", "-c", script], {
                encoding: "utf8",
                env: {
                    ...process.env,
                    SHA: sha,
                    CANARY_URL: /CANARY_URL: (\S+)/.exec(step)[1],
                    GITHUB_REPOSITORY: "o/r",
                    RUNNER_TEMP: dir,
                    GITHUB_RUN_ID: "7",
                    GITHUB_RUN_ATTEMPT: "2",
                    GITHUB_OUTPUT: out,
                    PATH: `${bin}:${process.env.PATH}`,
                },
            });
            const output = readFileSync(out, "utf8");
            const result = {
                status: r.status,
                deploy: /deploy=(\w+)/.exec(output)?.[1] ?? "",
                sha: /sha=(\w+)/.exec(output)?.[1] ?? "",
                run: /run=(\w+)/.exec(output)?.[1] ?? "",
                curl: existsSync(join(dir, "curl.log")) ? readFileSync(join(dir, "curl.log"), "utf8") : "",
                gh: existsSync(join(dir, "gh.log")) ? readFileSync(join(dir, "gh.log"), "utf8") : "",
            };
            rmSync(dir, { recursive: true, force: true });
            return result;
        };
        const deploys = (o) => {
            const r = decide(o);
            return [r.status, r.deploy, r.sha, r.run];
        };

        it("deploys master's newest green build's site from that build's own run, whichever run gets here (#3618 review)", () => {
            // no commit-message rule: an ordinary merge deploys
            assert.doesNotMatch(deploy, /chore\(release\)|head_commit|MESSAGE/);
            // this run is for abc1111, master's newest green build is abc9999: abc9999's site is deployed, from its run 42
            assert.deepEqual(deploys(), [0, "true", "abc9999", "42"]);
            const r = decide();
            assert.match(r.gh, /workflows\/ci\.yml\/runs\?branch=master&event=push&status=success&per_page=1/);
            assert.match(r.gh, /compare\/0ddba11\.\.\.abc9999/);
            assert.match(r.gh, /actions\/artifacts\?name=site-abc9999/);
            assert.match(
                r.curl,
                /^-sSL --max-time 30 -o \S+ -w %\{http_code\} https:\/\/canary\.graphty\.app\/\?run=7-2\n$/,
            );
            // the runs list lags and still names an older build than the one that started this run: this run's
            // build is the newest, and it deploys its own site (#3618 review)
            assert.deepEqual(deploys({ order: "ahead", artifact: "" }), [0, "true", "abc1111", "7"]);
            // this run's own build is the newest: it deploys its own site, from this run, without asking the
            // artifacts list, which may not show an upload made moments ago yet (#3618 review)
            assert.deepEqual(deploys({ sha: "abc9999", artifact: "" }), [0, "true", "abc9999", "7"]);
            assert.doesNotMatch(decide({ sha: "abc9999" }).gh, /actions\/artifacts/);
            // canary's site.json comes from master's tip, like promote.yml's: an older deployed commit may not have it
            assert.match(
                job(deploy, "deploy"),
                /- name: Check out canary's site.json\n(?:.*\n){3}\s+sparse-checkout: graphty\/sites\n/,
            );
            assert.doesNotMatch(job(deploy, "deploy"), /ref: \$\{\{ steps.live/);
            // the download, the site.json and the Pages upload all take the chosen build's site
            const job_ = job(deploy, "deploy");
            assert.match(
                job_,
                /name: site-\$\{\{ steps.live.outputs.sha \}\}\n\s+path: \.\/site\/\n\s+run-id: \$\{\{ steps.live.outputs.run \}\}/,
            );
            assert.ok(job_.indexOf("tar -xf") < job_.indexOf("canary.json > public/site.json"));
            assert.ok(job_.indexOf("canary.json > public/site.json") < job_.indexOf("upload-pages-artifact"));
            assert.match(
                job_,
                /- name: Deploy to GitHub Pages\n\s+if: \$\{\{ steps.live.outputs.deploy == 'true' \}\}\n/,
            );
            // no hand-off to another run: nothing re-runs a run, finds one by name, or needs actions: write
            assert.doesNotMatch(deploy, /Hand off|gh run rerun|display_title|actions: write/);
            assert.equal(
                JSON.parse(readFileSync(new URL("../graphty/sites/canary.json", import.meta.url), "utf8")).site,
                "canary",
            );
            // the custom domain is this repository's Pages setting; the site carries no CNAME file
            assert.doesNotMatch(
                deploy + readFileSync(new URL("./assemble-pages-site.sh", import.meta.url), "utf8"),
                /CNAME/,
            );
        });

        it("deploys nothing when canary already serves the newest build, or something newer", () => {
            assert.deepEqual(deploys({ live: "abc9999" }), [0, "false", "", ""]);
            assert.deepEqual(deploys({ compare: "behind" }), [0, "false", "", ""]);
            assert.deepEqual(deploys({ compare: "identical" }), [0, "false", "", ""]);
            // a canary on a commit off master's line is replaced
            assert.deepEqual(deploys({ compare: "diverged" }), [0, "true", "abc9999", "42"]);
            // the newest build's site is not assembled yet: that build's own run deploys it
            assert.deepEqual(deploys({ artifact: "" }), [0, "false", "", ""]);
            // before the domain swap the domain is graphty.app, which only promotion may move: canary is not read
            assert.deepEqual(
                [decide({ cname: "graphty.app" }).deploy, decide({ cname: "graphty.app" }).curl],
                ["false", ""],
            );
        });

        it("fails the job, deploying nothing, on every read that fails, so master-guard reports it (#3618 review)", () => {
            for (const o of [
                { cname: null }, // the Pages settings
                { cname: "" }, // a Pages domain that is neither graphty.app (before the swap) nor canary
                { cname: "canary.graphty.ap" },
                { order: null }, // this run's build cannot be compared with the runs list's newest
                { newest: null }, // the CI runs list
                { newest: "" },
                { live: null }, // canary does not answer
                { code: 503 },
                { code: 429 },
                { cut: true }, // a body that breaks off after a 200
                { live: "" }, // a 200 with no build stamp
                { code: 404 }, // this repository's Pages always serves a site (the deploy job's environment alone
                // records a github-pages deployment), so a 404 is never "no site yet" (#3618 review)
                { compare: null }, // a stamp commit the compare API cannot resolve
                { compare: "" },
                { artifact: null }, // the artifacts list
                { artifact: "expired" },
            ]) {
                const r = decide(o);
                assert.notEqual(r.status, 0, JSON.stringify(o));
                assert.notEqual(r.deploy, "true", JSON.stringify(o));
            }
        });

        it("reuses the hosted datasets canary publishes, not graphty.app's, which moves only by promotion (#3618 review)", () => {
            const hosted = readFileSync(new URL("../graph-samples/scripts/build-hosted.mjs", import.meta.url), "utf8");
            assert.match(hosted, /^const REUSE_URL = "https:\/\/canary\.graphty\.app\/data\/graph-samples\/v1\/";$/m);
            assert.match(hosted, /publishedCopy\(`\$\{REUSE_URL\}/);
            // graphty.app only after canary, while canary does not serve the data yet or cannot be read
            assert.ok(hosted.indexOf("publishedCopy(`${REUSE_URL}") < hosted.indexOf("publishedCopy(`${BASE_URL}"));
            assert.match(job(deploy, "build"), /node graph-samples\/scripts\/build-hosted\.mjs --reuse-published/);
        });

        // The record step's script, against a stub curl that logs its arguments and answers (or fails) as told
        const record = ({ url = "https://results.test/", store = 0, health = "", healthStatus = 0 } = {}) => {
            const dir = mkdtempSync(join(tmpdir(), "deploy-record-"));
            writeFileSync(
                join(dir, "curl"),
                `#!/bin/bash\necho "$*" >> "${dir}/curl.log"\ncase "$*" in\n*health.test/v1/sites*) exit ${healthStatus};;\n` +
                    `*/v1/sites*) exit ${store};;\n*graphty-health*) echo '{"value":"hjwt"}';;\n*) echo '{"value":"jwt"}';;\nesac\n`,
                { mode: 0o755 },
            );
            const step = /- name: Record the site in the results store\n[\s\S]*?run: \|\n([\s\S]*?)\n\n/.exec(
                job(deploy, "build"),
            );
            const r = spawnSync("bash", ["-eo", "pipefail", "-c", step[1].replace(/^ {18}/gm, "")], {
                encoding: "utf8",
                env: {
                    ...process.env,
                    RESULTS_URL: url,
                    HEALTH_API_URL: health,
                    SHA: "a".repeat(40),
                    ACTIONS_ID_TOKEN_REQUEST_URL: "https://oidc.test/?x=1",
                    ACTIONS_ID_TOKEN_REQUEST_TOKEN: "req",
                    PATH: `${dir}:${process.env.PATH}`,
                },
            });
            const calls = existsSync(join(dir, "curl.log")) ? readFileSync(join(dir, "curl.log"), "utf8") : "";
            rmSync(dir, { recursive: true, force: true });
            return { status: r.status, out: r.stdout, calls };
        };

        it("records each kept site in the results store with the run's OIDC token, failing open", () => {
            assert.match(deploy, /^ {4}id-token: write/m);
            const ok = record();
            assert.equal(ok.status, 0);
            assert.match(ok.calls, /audience=graphty-results/);
            assert.match(ok.calls, /-X POST https:\/\/results.test\/v1\/sites -H Authorization: Bearer jwt /);
            assert.match(ok.calls, new RegExp(`-d \\{"sha":"${"a".repeat(40)}"\\}`));
            const down = record({ store: 22 });
            assert.equal(down.status, 0, "a store that does not answer never fails the deploy");
            assert.match(down.out, /::warning::the results store did not record site-a{40}/);
            const unset = record({ url: "" });
            assert.equal(unset.status, 0);
            assert.equal(unset.calls, "", "no store configured: no call");
            assert.doesNotMatch(ok.calls, /graphty-health/, "no health API configured: no call there");
            // after the site is uploaded, so a recorded site always exists as an artifact
            const build = job(deploy, "build");
            assert.ok(
                build.indexOf("name: Upload the site") < build.indexOf("name: Record the site in the results store"),
            );
        });

        it("records each kept site in the pipeline health API too, with its own token, failing open", () => {
            const both = record({ health: "https://health.test/" });
            assert.equal(both.status, 0);
            assert.match(both.calls, /audience=graphty-health/);
            assert.match(both.calls, /-X POST https:\/\/health.test\/v1\/sites -H Authorization: Bearer hjwt /);
            assert.match(both.calls, /-X POST https:\/\/results.test\/v1\/sites -H Authorization: Bearer jwt /);
            const down = record({ health: "https://health.test/", healthStatus: 22 });
            assert.equal(down.status, 0, "a health API that does not answer never fails the deploy");
            assert.match(down.calls, /results.test\/v1\/sites/, "and never stops the store's record");
            const alone = record({ url: "", health: "https://health.test/" });
            assert.equal(alone.status, 0);
            assert.match(alone.calls, /health.test\/v1\/sites/);
        });
    });
});

// Every POST to the results store also goes to the pipeline health API (issue #3602), which
// takes the same bodies: tools/results/client.mjs sends there when HEALTH_API_URL is set.
describe("the pipeline health API", () => {
    const files = [
        ...readdirSync(new URL("../.github/workflows/", import.meta.url))
            .filter((f) => f.endsWith(".yml"))
            .map((f) => [f, workflow(f)]),
        ["tools/channel/site-deploy.yml", readFileSync(new URL("channel/site-deploy.yml", import.meta.url), "utf8")],
    ];
    it("gets HEALTH_API_URL beside every RESULTS_URL and health-api-url beside every results-url", () => {
        for (const [name, text] of files) {
            const lines = text.split("\n");
            lines.forEach((line, i) => {
                const m = /^( *)RESULTS_URL: \$\{\{ vars\.RESULTS_URL \}\}$/.exec(line);
                if (m)
                    assert.equal(
                        lines[i + 1],
                        `${m[1]}HEALTH_API_URL: \${{ vars.HEALTH_API_URL }}`,
                        `${name}:${i + 1}`,
                    );
                const r = /^( *)results-url: \$\{\{ vars\.RESULTS_URL \}\}$/.exec(line);
                if (r)
                    assert.equal(
                        lines[i + 1],
                        `${r[1]}health-api-url: \${{ vars.HEALTH_API_URL }}`,
                        `${name}:${i + 1}`,
                    );
            });
        }
        const action = readFileSync(new URL("../.github/actions/timings/action.yml", import.meta.url), "utf8");
        assert.match(action, /^ {4}health-api-url:\n/m);
        assert.match(action, /HEALTH_API_URL: \$\{\{ inputs\.health-api-url \}\}/);
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
    it("writes one compact record per pull request, its head commit and the newest check of each name", () => {
        const pr = (number, rollup) => ({
            number,
            title: "t",
            author: number === 1 ? { login: "graphty-agent" } : null,
            headRefName: "h",
            headRefOid: "abc123",
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
            author: "graphty-agent",
            head: "h",
            headSha: "abc123",
            base: "master",
            draft: false,
            mergeable: "MERGEABLE",
            labels: ["hold"],
            state: "PENDING",
            checks: { Build: "SUCCESS", "All Checks Pass": "SUCCESS", Links: "QUEUED" },
            hiddenFailures: ["Links"],
            checksTruncated: true,
        });
        assert.equal(b.state, null);
        assert.equal(b.author, null, "a deleted account");
        assert.deepEqual(b.checks, {});
    });
});

describe("the commit and push hooks", () => {
    const repoFile = (name) => readFileSync(new URL(`../${name}`, import.meta.url), "utf8");
    // run_step, bg_step and the functions they use, cut out of tools/prepush-source-checks.sh to run alone.
    const stepFunctions = (checks) =>
        checks.slice(checks.indexOf("script_missing() {"), checks.indexOf("trap bg_kill EXIT\n") + 18);
    const formatStaged = new URL("./format-staged.sh", import.meta.url).pathname;
    const inRepo = (fn) => {
        const dir = mkdtempSync(join(tmpdir(), "format-staged-"));
        const git = (...args) => spawnSync("git", args, { cwd: dir, encoding: "utf8" });
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
            const r = spawnSync(formatStaged, { cwd: dir, encoding: "utf8" });
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
            assert.equal(spawnSync(formatStaged, { cwd: dir }).status, 0);
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
        assert.ok(at('source "$SCRIPT_DIR/prepush-source-checks.sh"') < at("PROJECTS=$("), "before the affected list");
        const checks = repoFile("tools/prepush-source-checks.sh");
        const steps = ["Formatting", "ESLint root config", "Legacy graph API use", "Links", "CI workflow tests"];
        for (const step of [...steps, "SonarQube (changed lines)"]) {
            assert.match(checks, new RegExp(`(run|bg)_step "${step.replace(/[\\()]/g, "\\$&")}"`), step);
        }
        // The two commonest failures start first, in the background, before any other check.
        const firstRun = checks.indexOf('    run_step "');
        assert.ok(checks.indexOf('bg_step "SonarQube (changed lines)"') < firstRun, "SonarQube starts first");
        assert.ok(checks.indexOf('bg_step "CI workflow tests"') < firstRun, "the CI workflow tests start first");
        // SonarQube runs only there, so a push it fails never reaches the queue or the build.
        assert.doesNotMatch(prepush, /sonar-gate\.mjs/);
        const steps_ = stepFunctions(checks);
        const r = spawnSync("bash", ["-c", `${steps_}\nrun_step one false\nrun_step two "echo SECOND"`], {
            encoding: "utf8",
        });
        assert.equal(r.status, 1);
        assert.match(r.stdout, /stopped at the first failure: one/);
        assert.doesNotMatch(r.stdout, /SECOND/);
    });

    it("pre-push stops with a clear message when the remote branch moved while the gate ran", () => {
        const prepush = repoFile("tools/prepush.sh");
        const fn = prepush.slice(
            prepush.indexOf("remote_moved() {"),
            prepush.indexOf("\n}\n", prepush.indexOf("remote_moved() {")) + 3,
        );
        assert.ok(
            prepush.indexOf("if remote_moved; then") > prepush.indexOf('record "gate${KNOWN_FAILURES:+-known}"'),
            "after the pass is recorded",
        );
        const dir = mkdtempSync(join(tmpdir(), "prepush-remote-"));
        try {
            const git = (...args) => spawnSync("git", args, { cwd: dir, encoding: "utf8" });
            git("init", "-q", "-b", "main");
            git("commit", "-q", "--allow-empty", "-m", "a");
            const a = git("rev-parse", "HEAD").stdout.trim();
            spawnSync("git", ["init", "-q", "--bare", join(dir, "origin.git")]);
            git("remote", "add", "origin", join(dir, "origin.git"));
            git("push", "-q", "origin", "HEAD:feat/x", "HEAD:golden");
            git("commit", "-q", "--allow-empty", "-m", "b");
            const moved = (ref, sha) =>
                spawnSync("bash", ["-c", `${fn}\nremote_moved`], {
                    cwd: dir,
                    encoding: "utf8",
                    env: { ...process.env, PUSH_REMOTE: "origin", PUSH_REMOTE_REF: ref, PUSH_REMOTE_SHA: sha },
                }).status === 0;
            assert.equal(moved("refs/heads/feat/x", a), false, "still where the push began");
            git("push", "-q", "origin", "HEAD:feat/x", "HEAD:golden");
            assert.equal(moved("refs/heads/feat/x", a), true, "moved during the gate");
            assert.equal(moved("refs/heads/feat/x", "0".repeat(40)), true, "created during the gate");
            assert.equal(moved("refs/heads/golden", a), false, "golden is land.mjs's to handle");
            assert.equal(moved("refs/heads/gone", a), false, "a remote that has no answer is not moved");
        } finally {
            rmSync(dir, { recursive: true, force: true });
        }
    });

    it("pre-push reports a background step's failure at the next step and stops the rest", () => {
        const steps = stepFunctions(repoFile("tools/prepush-source-checks.sh"));
        const dir = mkdtempSync(join(tmpdir(), "prepush-bg-"));
        try {
            const script = `${steps}
bg_step slow "sleep 30; echo SLOW-DONE" "${dir}/slow.log"
bg_step fails "echo FAILED-OUTPUT; exit 1" "${dir}/fails.log"
until [ -s "${dir}/fails.log" ] && ! kill -0 "\${BG_PIDS[1]}" 2>/dev/null; do sleep 0.05; done
run_step after "echo AFTER-RAN"`;
            const r = spawnSync("bash", ["-c", script], { encoding: "utf8" });
            assert.equal(r.status, 1, r.stdout + r.stderr);
            assert.match(r.stdout, /FAILED-OUTPUT[\s\S]*\[FAIL\] fails failed/);
            assert.match(r.stdout, /stopped at the first failure: fails/);
            assert.doesNotMatch(r.stdout, /AFTER-RAN|SLOW-DONE/);
            const passing = spawnSync(
                "bash",
                ["-c", `${steps}\nbg_step ok "echo OK-OUTPUT" "${dir}/ok.log"\nrun_step next "echo NEXT"\nbg_wait`],
                { encoding: "utf8" },
            );
            assert.equal(passing.status, 0, passing.stdout + passing.stderr);
            assert.match(passing.stdout, /OK-OUTPUT[\s\S]*\[PASS\] ok passed/);
        } finally {
            rmSync(dir, { recursive: true, force: true });
        }
    });

    it("pre-push runs knip and the published-dependency check on a push that affects no package", () => {
        // CI's Build job always runs them, and a push of root files only (tools/, knip.config.ts,
        // package.json) is one nx calls unaffected: PR #1345 passed the gate and failed knip in CI.
        const prepush = repoFile("tools/prepush.sh");
        const at = (s) => {
            const i = prepush.indexOf(s);
            assert.ok(i > 0, `${s} is in tools/prepush.sh`);
            return i;
        };
        const firstExit = prepush.search(/\n\s*exit "\$FAILED"/);
        for (const step of ["Knip (dead code detection)", "Knip (production dependencies)", "Published dependencies"]) {
            assert.ok(at(`run_step "${step}"`) < firstExit, `${step} runs before the no-affected-package exit`);
        }
        const unaffected = prepush.slice(prepush.lastIndexOf('if [ -z "$PROJECT_LIST" ]; then', firstExit), firstExit);
        assert.match(unaffected, /run_step "Published dependencies" "pnpm run check:published-deps"\n/);
    });
});

// The test files under `root` (tracked, or untracked and not ignored) that run git without
// isolateGit() or isolatedGitEnv().
function bareGitTests(root) {
    const runsGit = /\b(?:spawnSync|spawn|execFileSync|execFile|execSync|exec|execa)\(\s*["'`]git\b/;
    const isTest = /(^|\/)(test|tests|__tests__)\/|\.(test|spec)\.[cm]?[jt]sx?$/;
    const files = spawnSync("git", ["ls-files", "-z", "--cached", "--others", "--exclude-standard"], {
        cwd: root,
        encoding: "utf8",
    }).stdout.split("\0");
    return files
        .filter((f) => isTest.test(f) && /\.[cm]?[jt]sx?$/.test(f))
        .filter((f) => {
            const text = readFileSync(join(root, f), "utf8");
            return runsGit.test(text) && !/\b(isolateGit|isolatedGitEnv)\b/.test(text);
        });
}

describe("tests that run git", () => {
    it("run it with the developer's own git config isolated (tools/isolated-git-env.mjs)", () => {
        const root = new URL("..", import.meta.url).pathname;
        assert.deepEqual(bareGitTests(root), [], "these run git without isolateGit() or isolatedGitEnv()");
        assert.match(readFileSync(join(root, "visual-review/vitest.config.mjs"), "utf8"), /isolate-git\.setup\.mjs/);
    });

    it("the check also covers a new test file git does not track yet", () => {
        const dir = mkdtempSync(join(tmpdir(), "bare-git-test-"));
        try {
            spawnSync("git", ["init", "-q"], { cwd: dir });
            writeFileSync(join(dir, "new.test.mjs"), 'spawnSync("git", ["status"]);\n');
            assert.deepEqual(bareGitTests(dir), ["new.test.mjs"]);
        } finally {
            rmSync(dir, { recursive: true, force: true });
        }
    });
});

describe("a failed pre-push test shard (#1562)", () => {
    it("keeps its test name and error where the next push does not overwrite them", () => {
        // A copy of the runner and test-slots.mjs in a throwaway repository, beside a one-shard matrix
        // and a run-tests.sh that prints tmp/fake-output and fails. The second run overwrites
        // tmp/prepush-tests/fake.log; the first run's copy under tmp/push-gate-logs/ must survive.
        const dir = mkdtempSync(join(tmpdir(), "prepush-kept-log-"));
        try {
            mkdirSync(join(dir, "tools"));
            mkdirSync(join(dir, "tmp"));
            for (const f of [
                "prepush-tests.mjs",
                "test-slots.mjs",
                "wait-log.mjs",
                "prepush-inputs.mjs",
                "push-base.mjs",
                "shard-verdict.mjs",
                "test-quarantine.mjs",
                "test-ledger.mjs",
                "test-select.mjs",
                "test-select-rules.json",
            ]) {
                copyFileSync(new URL(`./${f}`, import.meta.url), join(dir, "tools", f));
            }
            const shard = { shard: "fake", package: "fake", "test-command": "true", "needs-browser": false };
            writeFileSync(join(dir, "tools/ci-test-matrix.mjs"), `export const SHARDS = ${JSON.stringify([shard])};\n`);
            writeFileSync(join(dir, "tools/run-tests.sh"), "cat tmp/fake-output; exit 1\n");
            assert.equal(spawnSync("git", ["init", "-q"], { cwd: dir }).status, 0);
            const run = (output) => {
                writeFileSync(join(dir, "tmp/fake-output"), output);
                return spawnSync(process.execPath, ["tools/prepush-tests.mjs", '["fake"]'], {
                    cwd: dir,
                    encoding: "utf8",
                });
            };

            const first = run(" FAIL  src/a.test.ts > draws the edge\nError: Test timed out in 5000ms.\n");
            assert.equal(first.status, 1, first.stdout + first.stderr);
            const kept = /\[FAIL\] fake: its whole log is kept in (\S+)/.exec(first.stdout)?.[1];
            assert.ok(kept?.startsWith(join(dir, "tmp/push-gate-logs/")), first.stdout);

            assert.equal(run(" FAIL  src/b.test.ts > another test\nError: fetch failed\n").status, 1);
            assert.match(readFileSync(join(dir, "tmp/prepush-tests/fake.log"), "utf8"), /fetch failed/);

            const firstLog = readFileSync(kept, "utf8");
            assert.match(firstLog, /FAIL {2}src\/a\.test\.ts > draws the edge/);
            assert.match(firstLog, /Test timed out in 5000ms/);
            assert.equal(readdirSync(join(dir, "tmp/push-gate-logs")).length, 2);
        } finally {
            rmSync(dir, { recursive: true, force: true });
        }
    });
});

describe("pre-push shards skipped on inputs that already passed (tools/prepush-inputs.mjs)", () => {
    const shard = (name, pkg = name) => ({ shard: name, package: pkg, "test-command": "true", "needs-browser": false });
    const roots = new Map([
        ["graph-format", "graph-format"],
        ["graphty-element", "graphty-element"],
        ["graphty", "graphty"],
    ]);
    const files = (changes = {}) =>
        new Map(
            Object.entries({
                "pnpm-lock.yaml": "a",
                "tools/run-tests.sh": "a",
                "graph-format/src/a.ts": "a",
                "graphty-element/src/b.ts": "a",
                "graphty/src/c.ts": "a",
                ...changes,
            }),
        );
    // graphty-element depends on graph-format; graphty is a dependent of graphty-element, not an input.
    const include = related("graphty-element", new Map([["graphty-element", new Set(["graph-format"])]]));
    const key = (changes, outputs = new Map([["graph-format/dist", "x"]])) =>
        inputKey(shard("graphty-element-default", "graphty-element"), files(changes), roots, include, outputs, {});

    it("runs a shard that never passed, and one whose key is unknown", () => {
        const shards = [shard("a"), shard("b")];
        const { run, skipped } = partitionByPasses(
            shards,
            new Map([
                ["a", "k"],
                ["b", null],
            ]),
            (key) => (key === null ? { key: null, sha: "s", at: "t" } : null),
        );
        assert.deepEqual(run, shards);
        assert.deepEqual(skipped, []);
    });

    it("skips only a shard whose recorded pass has exactly this key", () => {
        const shards = [shard("same"), shard("changed")];
        const passes = { k1: { key: "k1", sha: "s", at: "t" }, old: { key: "old", sha: "s", at: "t" } };
        const { run, skipped } = partitionByPasses(
            shards,
            new Map([
                ["same", "k1"],
                ["changed", "new"],
            ]),
            (key) => passes[key] ?? null,
        );
        assert.deepEqual(
            run.map((s) => s.shard),
            ["changed"],
        );
        assert.deepEqual(
            skipped.map((s) => s.shard.shard),
            ["same"],
        );
    });

    it("re-runs when the package, a dependency, a root file or a dependency's build output changes", () => {
        const base = key({});
        assert.notEqual(key({ "graphty-element/src/b.ts": "b" }), base, "its own source");
        assert.notEqual(key({ "graphty-element/test/new.test.ts": "n" }), base, "a new file");
        assert.notEqual(key({ "graph-format/src/a.ts": "b" }), base, "a dependency's source");
        assert.notEqual(key({ "pnpm-lock.yaml": "b" }), base, "a root file");
        assert.notEqual(key({ "tools/run-tests.sh": "b" }), base, "a tool");
        assert.notEqual(key({}, new Map([["graph-format/dist", "y"]])), base, "a dependency's dist");
        const gone = files();
        gone.delete("graphty-element/src/b.ts");
        assert.notEqual(
            inputKey(
                shard("graphty-element-default", "graphty-element"),
                gone,
                roots,
                include,
                new Map([["graph-format/dist", "x"]]),
                {},
            ),
            base,
            "a deleted file",
        );
        assert.notEqual(
            inputKey(
                shard("graphty-element-default", "graphty-element"),
                files(),
                roots,
                include,
                new Map([["graph-format/dist", "x"]]),
                { GRAPHTY_GPU_REQUIRE: "any" },
            ),
            base,
            "the GRAPHTY_ environment",
        );
    });

    it("keeps the key of a shard whose inputs a change does not touch", () => {
        assert.equal(key({ "graphty/src/c.ts": "b" }), key({}), "a package that depends on it");
        assert.equal(key({}), key({}));
    });

    it("follows dependencies and relative path references transitively", () => {
        const deps = new Map([["graphty", new Set(["graphty-element"])]]);
        const refs = new Map([["graphty-element", new Set(["graph-format"])]]);
        assert.deepEqual([...related("graphty", deps, refs)].sort(), ["graph-format", "graphty", "graphty-element"]);
        assert.deepEqual([...related("graph-format", deps, refs)], ["graph-format"]);
    });

    it("hashes the checkout as it is on disk: edits and untracked files count, ignored ones do not", () => {
        const dir = mkdtempSync(join(tmpdir(), "prepush-inputs-"));
        try {
            const git = (...args) => assert.equal(spawnSync("git", args, { cwd: dir }).status, 0, args.join(" "));
            git("init", "-q");
            writeFileSync(join(dir, ".gitignore"), "dist/\n");
            writeFileSync(join(dir, "a.ts"), "a\n");
            git("add", ".");
            git("commit", "-q", "-m", "a");
            const before = fingerprint(dir);
            mkdirSync(join(dir, "dist"));
            writeFileSync(join(dir, "dist/out.js"), "x\n");
            assert.equal(fingerprint(dir), before, "an ignored file");
            writeFileSync(join(dir, "new.ts"), "n\n");
            const untracked = fingerprint(dir);
            assert.notEqual(untracked, before, "an untracked file");
            writeFileSync(join(dir, "a.ts"), "b\n");
            assert.notEqual(fingerprint(dir), untracked, "an edit");
            assert.notEqual(outputHash(join(dir, "dist")), outputHash(join(dir, "missing")));
            const out = outputHash(join(dir, "dist"));
            writeFileSync(join(dir, "dist/out.js"), "y\n");
            assert.notEqual(outputHash(join(dir, "dist")), out, "a changed build output");
        } finally {
            rmSync(dir, { recursive: true, force: true });
        }
    });

    it("counts the passed tests of a shard's log, so a run that passed none is never recorded", () => {
        assert.equal(testsPassed("No test files found, exiting with code 0\n"), 0);
        assert.equal(testsPassed(" Test Files  1 passed (1)\n      Tests  0 passed (0)\n"), 0);
        assert.equal(testsPassed("\x1b[2m      Tests \x1b[22m \x1b[1m\x1b[32m6 passed\x1b[39m\x1b[22m (6)\n"), 6);
        assert.equal(testsPassed("      Tests  12 passed | 1 skipped (13)\n...\n      Tests  3 passed (3)\n"), 15);
        assert.equal(testsPassed("      Tests  2 failed | 5 passed (7)\n"), 5);
    });

    it("records passes by kind and key, for every branch, and reads them back", () => {
        const dir = mkdtempSync(join(tmpdir(), "prepush-passes-"));
        try {
            const k1 = "1".repeat(64);
            const k2 = "2".repeat(64);
            const store = passStore(dir);
            assert.equal(store.get("shard", k1), null);
            store.record("shard", k1, { shard: "a", branch: "tools/x", sha: "s", at: "t" });
            store.record("shard", k2, { shard: "b", branch: "other", sha: "s", at: "t" });
            assert.equal(passStore(dir).get("shard", k1).shard, "a");
            assert.equal(passStore(dir).get("shard", k2).key, k2);
            assert.equal(passStore(dir).get("gate", k1), null, "another kind");
            assert.throws(() => store.record("shard", "../x", {}), /not a pass kind and key/);
        } finally {
            rmSync(dir, { recursive: true, force: true });
        }
    });
});

// Every `pnpm run <script>` the source-only checks run, as package.json scripts, so none is skipped.
function sourceCheckScripts() {
    const checks = readFileSync(new URL("./prepush-source-checks.sh", import.meta.url), "utf8");
    return Object.fromEntries([...checks.matchAll(/"pnpm run ([\w:-]+)/g)].map((m) => [m[1], "true"]));
}

describe("the source-only checks before the queue (tools/prepush-source-checks.sh)", () => {
    it("skip only on the exact checkout they passed on, and run again after any edit", () => {
        // The script and the fingerprint tool in a throwaway repository, every check behind a fake
        // pnpm (and check-links.sh) that logs its call and passes.
        const dir = mkdtempSync(join(tmpdir(), "prepush-source-checks-"));
        try {
            mkdirSync(join(dir, "tools"));
            mkdirSync(join(dir, "bin"));
            mkdirSync(join(dir, "node_modules/.pnpm"), { recursive: true });
            for (const f of ["prepush-source-checks.sh", "prepush-inputs.mjs", "push-base.mjs"]) {
                copyFileSync(new URL(`./${f}`, import.meta.url), join(dir, "tools", f));
            }
            writeFileSync(join(dir, "bin/pnpm"), `#!/bin/sh\necho "$*" >> ${dir}/calls\n`, { mode: 0o755 });
            writeFileSync(join(dir, "tools/check-links.sh"), `#!/bin/sh\necho links >> ${dir}/calls\n`, {
                mode: 0o755,
            });
            writeFileSync(
                join(dir, "tools/sonar-gate.mjs"),
                `import { appendFileSync } from "node:fs";\nappendFileSync("${dir}/calls", "sonar\\n");\n`,
            );
            writeFileSync(
                join(dir, "tools/check-committed-images.mjs"),
                `import { appendFileSync } from "node:fs";\nappendFileSync("${dir}/calls", "images\\n");\n`,
            );
            writeFileSync(
                join(dir, "tools/check-figma-lock.mjs"),
                `import { appendFileSync } from "node:fs";\nappendFileSync("${dir}/calls", "figma-lock\\n");\n`,
            );
            writeFileSync(
                join(dir, "tools/release-dry-run.mjs"),
                `import { appendFileSync } from "node:fs";\nappendFileSync("${dir}/calls", "release\\n");\n`,
            );
            writeFileSync(join(dir, "pnpm-lock.yaml"), "lock\n");
            writeFileSync(join(dir, "node_modules/.pnpm/lock.yaml"), "lock\n");
            writeFileSync(join(dir, "package.json"), JSON.stringify({ scripts: sourceCheckScripts() }));
            writeFileSync(join(dir, ".gitignore"), "node_modules/\ncalls\ntmp/\n");
            writeFileSync(join(dir, "a.ts"), "a\n");
            const git = (...args) => assert.equal(spawnSync("git", args, { cwd: dir }).status, 0, args.join(" "));
            git("init", "-q");
            git("add", ".");
            git("commit", "-q", "-m", "a");
            const run = () => {
                rmSync(join(dir, "calls"), { force: true });
                const r = spawnSync("bash", ["tools/prepush-source-checks.sh"], {
                    cwd: dir,
                    encoding: "utf8",
                    env: { ...process.env, PATH: `${join(dir, "bin")}:${process.env.PATH}` },
                });
                assert.equal(r.status, 0, r.stdout + r.stderr);
                return {
                    out: r.stdout,
                    calls: existsSync(join(dir, "calls")) ? readFileSync(join(dir, "calls"), "utf8") : "",
                };
            };
            const first = run();
            assert.match(first.calls, /run format:check/);
            assert.match(first.calls, /links/);
            assert.match(first.calls, /sonar/);
            assert.match(first.calls, /images/);
            assert.match(first.calls, /release/);
            const second = run();
            assert.equal(second.calls, "", "nothing changed: no check runs");
            assert.match(second.out, /\[SKIP\] Source-only checks/);
            writeFileSync(join(dir, "a.ts"), "b\n");
            assert.match(run().calls, /run format:check/, "an edit runs them again");
            writeFileSync(join(dir, "new.ts"), "n\n");
            assert.match(run().calls, /run format:check/, "a new file runs them again");
            assert.equal(run().calls, "");
            git("add", ".");
            git("commit", "-q", "-m", "b");
            assert.equal(run().calls, "", "a commit of the files they passed on does not run them again");
            writeFileSync(join(dir, "node_modules/.pnpm/lock.yaml"), "lock\n# reinstalled\n");
            writeFileSync(join(dir, "pnpm-lock.yaml"), "lock\n# reinstalled\n");
            assert.match(run().calls, /run format:check/, "a new lockfile runs them again");
        } finally {
            rmSync(dir, { recursive: true, force: true });
        }
    });

    it("run from the gate's live copy, use the copy's scripts and check the checkout in PREPUSH_ROOT", () => {
        // gate/: the real scripts, a sonar step and a link check that log "gate-...". root/: the checkout
        // being pushed, with a different tools/ (its own link check, sonar step and a decoy copy of the
        // source checks) and no check:legacy-use script, as a branch from before that check would have.
        const dir = mkdtempSync(join(tmpdir(), "prepush-gate-dir-"));
        try {
            const gate = join(dir, "gate");
            const root = join(dir, "root");
            const log = (name) => `#!/bin/sh\necho "${name} $PWD" >> ${dir}/calls\n`;
            const sonar = (name) =>
                `import { appendFileSync } from "node:fs";\nappendFileSync("${dir}/calls", "${name}\\n");\n`;
            for (const d of [
                join(gate, "tools"),
                join(root, "tools"),
                join(root, "node_modules/.pnpm"),
                join(dir, "bin"),
            ]) {
                mkdirSync(d, { recursive: true });
            }
            for (const f of ["prepush-source-checks.sh", "prepush-inputs.mjs", "push-base.mjs"]) {
                copyFileSync(new URL(`./${f}`, import.meta.url), join(gate, "tools", f));
            }
            writeFileSync(join(gate, "tools/check-links.sh"), log("gate-links"), { mode: 0o755 });
            writeFileSync(join(gate, "tools/sonar-gate.mjs"), sonar("gate-sonar"));
            writeFileSync(join(gate, "tools/check-committed-images.mjs"), sonar("gate-images"));
            writeFileSync(join(gate, "tools/check-figma-lock.mjs"), sonar("gate-figma-lock"));
            writeFileSync(join(gate, "tools/release-dry-run.mjs"), sonar("gate-release"));
            writeFileSync(join(root, "tools/check-links.sh"), log("root-links"), { mode: 0o755 });
            writeFileSync(join(root, "tools/sonar-gate.mjs"), sonar("root-sonar"));
            writeFileSync(join(root, "tools/prepush-source-checks.sh"), log("root-copy"), { mode: 0o755 });
            writeFileSync(join(dir, "bin/pnpm"), `#!/bin/sh\necho "$* $PWD" >> ${dir}/calls\n`, { mode: 0o755 });
            const scripts = sourceCheckScripts();
            delete scripts["check:legacy-use"];
            writeFileSync(join(root, "package.json"), JSON.stringify({ scripts }));
            writeFileSync(join(root, "pnpm-lock.yaml"), "lock\n");
            writeFileSync(join(root, "node_modules/.pnpm/lock.yaml"), "lock\n");
            writeFileSync(join(root, ".gitignore"), "node_modules/\ntmp/\n");
            const git = (...args) => assert.equal(spawnSync("git", args, { cwd: root }).status, 0, args.join(" "));
            git("init", "-q");
            git("add", ".");
            git("commit", "-q", "-m", "a");
            const r = spawnSync("bash", [join(gate, "tools/prepush-source-checks.sh")], {
                cwd: gate,
                encoding: "utf8",
                env: { ...process.env, PREPUSH_ROOT: root, PATH: `${join(dir, "bin")}:${process.env.PATH}` },
            });
            assert.equal(r.status, 0, r.stdout + r.stderr);
            const calls = readFileSync(join(dir, "calls"), "utf8");
            assert.match(calls, /^gate-sonar$/m, "the gate's own scripts run");
            assert.match(calls, /^gate-images$/m, "the image check runs from the gate's copy");
            assert.match(calls, /^gate-figma-lock$/m, "the Figma lock runs from the gate's copy");
            assert.match(calls, /^gate-release$/m, "the release dry run runs from the gate's copy");
            assert.match(calls, new RegExp(`^root-links ${root}$`, "m"), "the checkout's own checks run, in it");
            assert.match(calls, new RegExp(`^run format:check ${root}$`, "m"));
            assert.doesNotMatch(calls, /gate-links|root-sonar|root-copy/);
            assert.doesNotMatch(calls, /check:legacy-use/);
            assert.match(r.stdout, /\[SKIP\] Legacy graph API use: this checkout has no `check:legacy-use` script/);
            assert.equal(readdirSync(join(root, "tmp/prepush-passes/source")).length, 1, "the pass is recorded");
        } finally {
            rmSync(dir, { recursive: true, force: true });
        }
    });

    it("the hook runs only the LFS upload, the secret scan and the image limit, from its own copy", () => {
        const code = (text) => text.replace(/^\s*#.*$/gm, "");
        const repoFile = (name) => readFileSync(new URL(`../${name}`, import.meta.url), "utf8");
        const hook = code(readFileSync(new URL("../.husky/pre-push", import.meta.url), "utf8"));
        const tools = [...hook.matchAll(/"\$GATE_DIR\/tools\/([\w.-]+)"/g)].map((m) => m[1]);
        assert.deepEqual(tools, ["lfs-pre-push.sh", "push-base.mjs", "scan-secrets.sh", "check-committed-images.mjs"]);
        assert.doesNotMatch(hook, /\.\/tools\/|prepush|sonar-gate|nx /);
        const prepush = code(repoFile("tools/prepush.sh"));
        for (const s of [
            "queued-push-guard.mjs",
            "visual-preview.sh",
            "prepush-tests.mjs",
            "prepush-source-checks.sh",
        ]) {
            assert.doesNotMatch(
                prepush,
                new RegExp(`(\\./|[ "'])tools/${s.replace(".", "\\.")}`),
                `${s} from SCRIPT_DIR`,
            );
        }
    });
});

describe("pnpm-lock.yaml", () => {
    it("holds one Playwright version, the one CI installs browsers for", () => {
        // A second version lets a re-resolution move @vitest/browser-playwright's peer to it, and
        // every browser shard then fails to find its browser. pnpm-workspace.yaml's overrides pin it.
        const lock = readFileSync(new URL("../pnpm-lock.yaml", import.meta.url), "utf8");
        for (const name of ["playwright", "playwright-core", "@playwright/test"]) {
            const escaped = name.replace(/[\\/@]/g, "\\$&");
            const versions = new Set(
                [...lock.matchAll(new RegExp(`^  '?${escaped}@(\\d[^:'(]*)'?:`, "gm"))].map((m) => m[1]),
            );
            assert.deepEqual([...versions], ["1.57.0"], `${name} versions in pnpm-lock.yaml`);
        }
    });
});

describe("a run reuses an earlier run's results when only screenshot records changed", () => {
    const ci = workflow("ci.yml");
    const TREE = "a".repeat(40);
    const OTHER = "b".repeat(40);
    // The jobs of run 40001752903 (golden-cut, 2026-10-23), as the Actions API answered, shortened.
    const recorded = [
        ["Draft state", "success"],
        ["Build", "success"],
        ["Storybooks", "success"],
        ["Lint", "success"],
        ["Checks", "success"],
        ["Docs", "success"],
        ["Cost Estimate Accuracy", "success"],
        ["Test (graphty-1)", "success"],
        ["Test (graphty-element-browser-1)", "success"],
        ["Test (small-node)", "success"],
        ["visual (graphty-element)", "success"],
        ["visual (graph-io-fidelity)", "failure"],
        ["Links", "success"],
        ["Performance Benchmarks", "skipped"],
        ["All Checks Pass", "failure"],
        ["Queue Checks Pass", "failure"],
    ].map(([name, conclusion]) => ({ name, conclusion, status: "completed" }));
    const withJob = (jobs, name, conclusion) =>
        jobs.map((j) => (j.name === name ? { ...j, conclusion, status: conclusion ? "completed" : "in_progress" } : j));
    const BUILDS = ["build-packages", ...Object.keys(STORYBOOKS)];
    const artifactsOf = (record, { expired = false } = {}) => [
        ...(record ? [{ name: record, expired: false }] : []),
        ...BUILDS.map((name) => ({ name, expired })),
        { name: "visual-graphty-element-1", expired: false },
    ];
    // An API that answers from recorded runs: { id: { jobs, artifacts } }, counting its calls.
    const recordedApi = (byRun) => {
        const api = async (path) => {
            api.calls.push(path);
            const [, id, what] = /^actions\/runs\/(\d+)\/(jobs|artifacts)\?/.exec(path);
            return { [what]: byRun[id][what] };
        };
        api.calls = [];
        return api;
    };
    const chain = ["h3", "h2", "h1"];
    const runAt = (id, sha) => ({ id, head_sha: sha });

    it("reuses the newest passing run that tested the same tree, and downloads its builds", async () => {
        const api = recordedApi({ 10: { jobs: recorded, artifacts: artifactsOf(`ci-tested-${TREE}`) } });
        const r = await reuseDecide({ tree: TREE, chain, runs: [runAt(10, "h2"), runAt(11, "h3")], runId: 11, api });
        assert.equal(r.reuse, "10");
        assert.equal(r.artifacts, "10");
        assert.equal(api.calls.length, 2, "two requests for the one earlier run");
    });

    it("builds again when the reused run's builds expired, and still reuses its test results", async () => {
        const api = recordedApi({
            10: { jobs: recorded, artifacts: artifactsOf(`ci-tested-${TREE}`, { expired: true }) },
        });
        const r = await reuseDecide({ tree: TREE, chain, runs: [runAt(10, "h2")], runId: 11, api });
        assert.equal(r.reuse, "10");
        assert.equal(r.artifacts, null);
    });

    it("runs in full when any other file changed (the newest passing run tested another tree)", async () => {
        const api = recordedApi({
            10: { jobs: recorded, artifacts: artifactsOf(`ci-tested-${OTHER}`) },
            9: { jobs: recorded, artifacts: artifactsOf(`ci-tested-${TREE}`) },
        });
        const r = await reuseDecide({ tree: TREE, chain, runs: [runAt(10, "h2"), runAt(9, "h1")], runId: 11, api });
        assert.equal(r.reuse, null, "an older run with the same tree is not looked at past a newer passing one");
        assert.match(r.reason, /another tree/);
    });

    it("runs in full when the earlier run failed, was cancelled or has not finished", async () => {
        for (const [name, conclusion] of [
            ["Test (graphty-1)", "failure"],
            ["Test (small-node)", "cancelled"],
            ["Lint", "skipped"],
            ["Links", null],
            ["Build", "failure"],
        ]) {
            const api = recordedApi({
                10: { jobs: withJob(recorded, name, conclusion), artifacts: artifactsOf(`ci-tested-${TREE}`) },
            });
            const r = await reuseDecide({ tree: TREE, chain, runs: [runAt(10, "h2")], runId: 11, api });
            assert.equal(r.reuse, null, `${name} ${conclusion}`);
            assert.match(r.skipped[0], new RegExp(`${name.replace(/[\\()]/g, "\\$&")} `));
        }
    });

    it("passes over a cancelled newer run to an older one that passed on the same tree", async () => {
        const api = recordedApi({
            10: {
                jobs: withJob(recorded, "Test (graphty-1)", "cancelled"),
                artifacts: artifactsOf(`ci-tested-${TREE}`),
            },
            9: { jobs: recorded, artifacts: artifactsOf(`ci-tested-${TREE}`) },
        });
        const r = await reuseDecide({ tree: TREE, chain, runs: [runAt(9, "h1"), runAt(10, "h2")], runId: 11, api });
        assert.equal(r.reuse, "9");
    });

    it("runs in full when the earlier run recorded no tree (a ci.yml from before this record)", async () => {
        const api = recordedApi({ 10: { jobs: recorded, artifacts: artifactsOf(null) } });
        const r = await reuseDecide({ tree: TREE, chain, runs: [runAt(10, "h2")], runId: 11, api });
        assert.equal(r.reuse, null);
        assert.match(r.reason, /recorded no tested tree/);
    });

    it("never reuses itself, another branch's commit, or a commit off the first-parent chain", async () => {
        const api = recordedApi({});
        const runs = [runAt(11, "h3"), runAt(12, "elsewhere")];
        const r = await reuseDecide({ tree: TREE, chain, runs, runId: 11, api });
        assert.equal(r.reuse, null);
        assert.equal(api.calls.length, 0);
    });

    it("chains through a run that itself reused, to the run that ran the tests", async () => {
        const reusedJobs = ["Lint", "Checks", "Docs", "Cost Estimate Accuracy", "Test (graphty-1)", "Links"].reduce(
            (jobs, name) => withJob(jobs, name, "skipped"),
            recorded,
        );
        const api = recordedApi({ 10: { jobs: reusedJobs, artifacts: artifactsOf(`ci-tested-${TREE}-from-7`) } });
        const r = await reuseDecide({ tree: TREE, chain, runs: [runAt(10, "h2")], runId: 11, api });
        assert.equal(r.reuse, "7", "the link names the run whose tests passed");
        assert.equal(r.artifacts, "10", "the builds come from the newest run, whose copies are fresh");
        assert.equal(notPassed(withJob(reusedJobs, "Storybooks", "failure"), true), "Storybooks failure");
        assert.equal(notPassed(reusedJobs, false), "Lint skipped", "a full run must have run Lint");
    });

    it("reads the record from an artifact's name", () => {
        assert.deepEqual(marker([{ name: "build-packages" }, { name: `ci-tested-${TREE}` }]), {
            tree: TREE,
            from: null,
        });
        assert.deepEqual(marker([{ name: `ci-tested-${TREE}-from-42` }]), { tree: TREE, from: "42" });
        assert.equal(marker([{ name: "ci-tested-xyz" }]), null);
    });

    it("compares trees with exactly the baselines and approvals directories taken out", () => {
        const repo = mkdtempSync(join(TMP, "reuse-"));
        const g = (...args) => spawnSync("git", args, { cwd: repo, encoding: "utf8" }).stdout.trim();
        const put = (file, text) => {
            mkdirSync(join(repo, file, ".."), { recursive: true });
            writeFileSync(join(repo, file), text);
        };
        const commit = (message) => {
            g("add", "-A");
            g("-c", "user.name=t", "-c", "user.email=t@t", "commit", "-q", "-m", message);
            return g("rev-parse", "HEAD");
        };
        g("init", "-q");
        put(
            "visual-review.config.json",
            JSON.stringify({ baselines: "visual-baselines", approvals: "visual-review-approvals" }),
        );
        put("src/a.ts", "1");
        put("visual-baselines/p/a.png", "1");
        put("visual-baselines/reviews/r.json", "1");
        put("visual-baselines-old/a.png", "1");
        put("visual-review/trusted/x.mjs", "1");
        const base = commit("base");
        const excluded = excludedPaths(repo, base);
        assert.deepEqual(excluded, ["visual-baselines", "visual-review-approvals"]);
        const before = treeWithout(repo, base, excluded);
        put("visual-baselines/p/a.png", "2");
        put("visual-baselines/reviews/r.json", "2");
        put("visual-review-approvals/t.json", "{}");
        const finish = commit("finish");
        assert.equal(treeWithout(repo, finish, excluded), before, "a Finish commit leaves the tested tree as it was");
        assert.notEqual(g("rev-parse", `${finish}^{tree}`), g("rev-parse", `${base}^{tree}`));
        for (const file of [
            "src/a.ts",
            "visual-baselines-old/a.png",
            "visual-review/trusted/x.mjs",
            "visual-review-approvals.json",
        ]) {
            put(file, "changed");
            const at = commit(file);
            assert.notEqual(treeWithout(repo, at, excluded), before, `${file} is part of the tested tree`);
            g("reset", "-q", "--hard", finish);
            g("clean", "-qfd");
        }
        for (const bad of [".", "../x", "", "a b"]) {
            put("visual-review.config.json", JSON.stringify({ baselines: bad, approvals: "visual-review-approvals" }));
            assert.equal(excludedPaths(repo, commit(`bad ${bad}`)), null, `"${bad}" is refused`);
        }
        assert.equal(excludedPaths(repo, "HEAD~100"), null, "no config: no reuse");
    });

    it("prints the plan from the base's config and recorded API answers (the packages job's step)", () => {
        const repo = mkdtempSync(join(TMP, "reuse-main-"));
        const g = (...args) => spawnSync("git", args, { cwd: repo, encoding: "utf8" }).stdout.trim();
        const put = (file, text) => {
            mkdirSync(join(repo, file, ".."), { recursive: true });
            writeFileSync(join(repo, file), text);
        };
        const commit = (message) => {
            g("add", "-A");
            g("-c", "user.name=t", "-c", "user.email=t@t", "commit", "-q", "-m", message);
            return g("rev-parse", "HEAD");
        };
        const merge = (base, head) => {
            g("checkout", "-q", "--detach", base);
            g("-c", "user.name=t", "-c", "user.email=t@t", "merge", "-q", "--no-ff", "-m", "m", head);
            return g("rev-parse", "HEAD");
        };
        g("init", "-q", "-b", "master");
        put(
            "visual-review.config.json",
            JSON.stringify({ baselines: "visual-baselines", approvals: "visual-review-approvals" }),
        );
        const base = commit("base");
        g("checkout", "-q", "-b", "cut");
        put("src/a.ts", "1");
        const h1 = commit("code");
        put("visual-review-approvals/t.json", "{}");
        const h2 = commit("finish");
        const tested = treeWithout(repo, merge(base, h1), ["visual-baselines", "visual-review-approvals"]);
        merge(base, h2);
        const answers = join(repo, "..", `answers-${Date.now()}`);
        mkdirSync(answers);
        const answer = (name, value) => writeFileSync(join(answers, name), JSON.stringify(value));
        answer("runs", { workflow_runs: [{ id: 5, head_sha: h1 }] });
        answer("artifacts", { artifacts: artifactsOf(`ci-tested-${tested}`) });
        answer("jobs", { jobs: recorded });
        const bin = join(answers, "bin");
        mkdirSync(bin);
        writeFileSync(
            join(bin, "gh"),
            `#!/bin/bash\ncase "$2" in *workflows/ci.yml/runs*) f=runs;; *artifacts*) f=artifacts;; *jobs*) f=jobs;; esac\ncat "${answers}/$f"\n`,
            { mode: 0o755 },
        );
        const run = (env) =>
            spawnSync("node", [new URL("./ci-reuse-plan.mjs", import.meta.url).pathname], {
                cwd: repo,
                encoding: "utf8",
                env: {
                    ...process.env,
                    PATH: `${bin}:${process.env.PATH}`,
                    GITHUB_REPOSITORY: "o/r",
                    GITHUB_RUN_ID: "6",
                    GITHUB_SERVER_URL: "https://github.com",
                    HEAD_SHA: h2,
                    HEAD_REF: "cut",
                    GITHUB_STEP_SUMMARY: "",
                    ...env,
                },
            });
        const out = run({}).stdout;
        assert.match(out, new RegExp(`^tested-tree=${tested}$`, "m"));
        assert.match(out, new RegExp(`^marker=ci-tested-${tested}-from-5$`, "m"));
        assert.match(out, /^reuse-run=5$/m);
        assert.match(out, /^reuse-url=https:\/\/github.com\/o\/r\/actions\/runs\/5$/m);
        assert.match(out, /^artifacts-run=5$/m);
        answer("jobs", { jobs: withJob(recorded, "Test (graphty-1)", "failure") });
        const full = run({}).stdout;
        assert.match(full, /^reuse-run=$/m);
        assert.match(full, new RegExp(`^marker=ci-tested-${tested}$`, "m"), "a full run records its tree");
        writeFileSync(join(bin, "gh"), "#!/bin/bash\necho 'HTTP 403' >&2; exit 1\n", { mode: 0o755 });
        const offline = run({});
        assert.equal(offline.status, 0);
        assert.match(offline.stdout, /^reuse-run=$/m, "an API failure is a full run");
    });

    it("skips exactly the jobs the reused run passed, and still builds, captures and gates", () => {
        const jobs = parseJobs(ci);
        const reused = Object.keys(jobs).filter((name) =>
            /needs\.packages\.outputs\.reuse-run == ''/.test(job(ci, name)),
        );
        assert.deepEqual(reused.sort(), ["checks", "cost-accuracy", "docs", "links", "lint", "story-tests", "test"]);
        for (const name of ["packages", "build", "visual", "all-checks"]) {
            assert.ok(!reused.includes(name), `${name} runs on every run`);
        }
        const packages = job(ci, "packages");
        assert.match(
            packages,
            /id: reuse\n {14}if: github.event_name == 'pull_request' && env.MERGE_QUEUE != 'true'\n {14}continue-on-error: true\n/,
        );
        assert.match(packages, /reuse-run: \$\{\{ steps.reuse.outputs.reuse-run \}\}/);
        assert.match(packages, /permissions:\n {12}contents: read\n {12}actions: read\n {12}checks: write\n/);
        assert.match(job(ci, "build"), /permissions:\n {12}contents: read\n {12}actions: read\n {12}checks: write\n/);
    });

    it("downloads exactly the Storybooks the build job uploads, to the paths it uploads them from", () => {
        const build = job(ci, "build");
        const uploads = [...build.matchAll(/name: (build-storybook-[\w-]+)\n {18}path: (\S+)\/\n/g)].map((m) => [
            m[1],
            m[2],
        ]);
        assert.deepEqual(Object.fromEntries(uploads), STORYBOOKS);
        // every step that builds is skipped when the builds are downloaded instead
        const building = build
            .split(/\n {12}- /)
            .filter((s) => /nx run(-many)? .*build-storybook|pnpm install/.test(s));
        assert.ok(
            building.some((s) => /build-storybook/.test(s)),
            "no step builds the Storybooks",
        );
        for (const step of building) {
            assert.match(step, /\n {14}if: steps.reuse-build.outputs.artifacts-run == ''\n/, step);
        }
        // it decides that itself, with the packages job's check, since it does not wait for that job
        assert.match(build, /id: reuse-build\n {14}if: inputs.reuse_build_run != ''\n {14}continue-on-error: true\n/);
        assert.match(build, /node tools\/ci-reuse-plan.mjs --build-run "\$RUN"/);
        // nx builds the packages the Storybooks import, so nothing waits for the packages job's artifact
        assert.match(build, /nx run-many -t build-storybook --parallel=3/);
        assert.doesNotMatch(build, /--exclude-task-dependencies|name: build-packages\n/);
    });

    it("passes All Checks Pass with skipped check jobs only when the run reused a passing run", () => {
        const body = job(ci, "all-checks");
        const run = /- name: Check all jobs passed\n[\s\S]*?\n {14}run: \|\n([\s\S]*?)\n\n/.exec(body)[1];
        const needs = (over) =>
            JSON.stringify(
                Object.fromEntries(
                    ["packages", "build", "lint", "checks", "docs", "test", "links", "cost-accuracy"].map((n) => [
                        n,
                        {
                            result: over[n] ?? (["packages", "build", "visual"].includes(n) ? "success" : "skipped"),
                        },
                    ]),
                ),
            );
        const verdict = (reuse, over = {}) =>
            spawnSync("bash", ["-e", "-c", run], {
                encoding: "utf8",
                env: {
                    ...process.env,
                    BUILD: "success",
                    FULL: "false",
                    ADVISORY: "[]",
                    LIGHT: "false",
                    REUSE_RUN: reuse,
                    REUSE_URL: reuse && `https://github.com/o/r/actions/runs/${reuse}`,
                    NEEDS: needs(over),
                },
            });
        const ok = verdict("5");
        assert.equal(ok.status, 0, ok.stdout);
        assert.match(ok.stdout, /::notice title=Results reused::.*actions\/runs\/5/);
        assert.equal(verdict("").status, 1, "skipped Lint, Checks and Docs fail a run that reused nothing");
        assert.equal(verdict("5", { build: "skipped" }).status, 1, "Storybooks must still succeed");
        assert.equal(verdict("5", { lint: "failure" }).status, 1);
    });
});

describe("bisect.yml's LLM points", () => {
    it("run in environment full-run, which holds GOOGLE_API_KEY, as release.yml's llm job does", () => {
        const jobs = parseYaml(readFileSync(".github/workflows/bisect.yml", "utf8")).jobs;
        const release = parseYaml(readFileSync(".github/workflows/release.yml", "utf8")).jobs;
        assert.equal(release.llm.environment, "full-run");
        assert.equal(jobs.point.environment, "${{ inputs.lane == 'llm' && 'full-run' || '' }}");
        assert.match(JSON.stringify(jobs.point.steps), /secrets.GOOGLE_API_KEY/);
    });
});

describe("a workflow call grants what the called workflow's jobs ask for", () => {
    // GitHub refuses a call at startup when a called job asks for more than the caller grants, even a job
    // whose `if` would skip it.
    const LEVEL = { none: 0, read: 1, write: 2 };
    const dir = ".github/workflows";
    const load = (f) => parseYaml(readFileSync(join(dir, f), "utf8"));
    const asked = (wf) => [wf.permissions, ...Object.values(wf.jobs ?? {}).map((j) => j.permissions)];
    it("for every local reusable workflow call", () => {
        const files = readdirSync(dir).filter((f) => /\.ya?ml$/.test(f));
        let calls = 0;
        for (const f of files) {
            const wf = load(f);
            for (const [name, job] of Object.entries(wf.jobs ?? {})) {
                const m = /^\.\/\.github\/workflows\/(.+)$/.exec(job.uses ?? "");
                const granted = job.permissions ?? wf.permissions;
                if (!m || typeof granted !== "object") continue;
                calls++;
                for (const want of asked(load(m[1]))) {
                    if (!want || typeof want !== "object") continue;
                    for (const [scope, level] of Object.entries(want)) {
                        assert.ok(
                            (LEVEL[granted[scope]] ?? 0) >= LEVEL[level],
                            `${f} job ${name} calls ${m[1]}, which asks ${scope}: ${level}; it grants ${granted[scope] ?? "none"}`,
                        );
                    }
                }
            }
        }
        assert.ok(calls > 0);
    });
});

describe("release.yml's version dry run with nothing releasable", () => {
    const steps = parseYaml(readFileSync(".github/workflows/release.yml", "utf8")).jobs.version_dry_run.steps;
    const script = steps.find((s) => s.id === "approvals").run;
    const runWith = (mode) => {
        const dir = mkdtempSync(join(tmpdir(), "version-dry-run-"));
        try {
            mkdirSync(join(dir, "tools"));
            writeFileSync(join(dir, "tools/release-version.sh"), "#!/bin/sh\nexit 0\n", { mode: 0o755 });
            spawnSync("git", ["init", "-q"], { cwd: dir });
            return spawnSync("bash", ["-c", script], {
                cwd: dir,
                encoding: "utf8",
                env: { ...process.env, MODE: mode, SHA: "abc", PACKAGES: "" },
            });
        } finally {
            rmSync(dir, { recursive: true, force: true });
        }
    };
    it("passes the lane in full and restart mode", () => {
        for (const mode of ["full", "restart"]) {
            const r = runWith(mode);
            assert.equal(r.status, 0, `${mode}: ${r.stdout}${r.stderr}`);
            assert.match(r.stdout, /nothing releasable changed on abc/);
        }
    });
    it("fails in shadow and legacy mode, where the pick job checked releasability", () => {
        for (const mode of ["shadow", "legacy"]) {
            const r = runWith(mode);
            assert.equal(r.status, 1, mode);
            assert.match(r.stdout, /nx versioned nothing on abc/);
        }
    });
});

describe("release.yml's nightly promotion (#1020)", () => {
    const release = workflow("release.yml");
    const verdict = job(release, "verdict");
    const caller = job(release, "site");
    const nightlySite = workflow("nightly-site.yml");
    const site = job(nightlySite, "site");
    const timings = job(release, "timings");
    const steps = { ...parseYaml(release).jobs, site: parseYaml(nightlySite).jobs.site };
    const callerJob = parseYaml(release).jobs.site;

    it("records an owner-approved baselines tree in channel.json as approved:<tree>, else unchanged", () => {
        assert.match(verdict, /\n {12}screenshots: \$\{\{ steps.gate.outputs.screenshots \}\}\n/);
        const gate = readFileSync("tools/channel/screenshot-gate.sh", "utf8");
        assert.match(gate, /tree=\$\(git rev-parse "\$HEAD_SHA:visual-baselines"\)/);
        assert.match(gate, /echo "screenshots=approved:\$tree"/);
        // a promotion after the owner's approval records its accept commit's tree the same way
        assert.match(job(release, "resume"), /\n {12}screenshots: \$\{\{ steps.gate.outputs.screenshots \}\}\n/);
        assert.equal(
            callerJob.with.screenshots,
            "${{ needs.verdict.outputs.screenshots || needs.resume.outputs.screenshots }}",
        );
        assert.equal(steps.site.env.SCREENSHOTS, "${{ inputs.screenshots }}");
    });

    it("hands the publish job a build of every package it can version, cytoscape-extensions included", () => {
        const ci = parseYaml(workflow("ci.yml"));
        const uploaded = Object.values(ci.jobs)
            .flatMap((j) => j.steps ?? [])
            .map((x) => x.with?.name)
            .filter((n) => typeof n === "string" && n.startsWith("build-"));
        const pattern = steps.version.steps.find((x) => x.name === "Download the tested commit's builds").with.pattern;
        assert.equal(pattern, "${{ env.PACKAGE_BUILDS }}");
        const downloaded = /^build-\{(.+)\}$/.exec(parseYaml(workflow("release.yml")).env.PACKAGE_BUILDS)[1].split(",");
        assert.ok(downloaded.includes("cytoscape-extensions"));
        for (const name of downloaded) assert.ok(uploaded.includes(`build-${name}`), `ci.yml uploads build-${name}`);
    });

    it("decides the promotion in the verdict job: green-clean, the screenshot gate, no publish hold", () => {
        assert.match(
            verdict,
            /\n {8}outputs:\n {12}state: \$\{\{ steps.verdict.outputs.state \}\}\n {12}promote: \$\{\{ steps.promote.outputs.promote \}\}\n/,
        );
        const gate = steps.verdict.steps.find((st) => st.id === "gate");
        assert.equal(gate.if, "${{ steps.verdict.outputs.state == 'green-clean' }}");
        assert.equal(gate["continue-on-error"], undefined, "an error fails the job; only a refusal is a decision");
        // master's tip's gate, unchanged, against channel/nightly (or the last release before nightly exists)
        assert.equal(gate.run, "tools/channel/screenshot-gate.sh");
        assert.deepEqual(gate.env, { HEAD_SHA: "${{ env.SHA }}", CAPTURES: "${{ runner.temp }}/visual" });
        const script = readFileSync("tools/channel/screenshot-gate.sh", "utf8");
        assert.match(script, /git archive HEAD visual-review\/trusted \| tar -x -C "\$gate"/);
        assert.match(script, /gate --captures "\$CAPTURES" --base "\$base" --head "\$HEAD_SHA"/);
        assert.match(script, /refs\/heads\/channel\/nightly/);
        // the promotion after the owner's approval runs the same gate on its accept commit, with the captures of the
        // run that judged its candidate
        const resume = steps.resume.steps.find((st) => st.id === "gate");
        assert.match(resume.run, /\n\s*tools\/channel\/screenshot-gate.sh\n?$/);
        assert.equal(resume.env.HEAD_SHA, "${{ needs.pick.outputs.sha }}");
        const decide = steps.verdict.steps.find((st) => st.id === "promote");
        assert.equal(decide.run, "node tools/channel/nightly.mjs decide");
        assert.deepEqual(decide.env, {
            STATE: "${{ steps.verdict.outputs.state }}",
            GATE: "${{ steps.gate.outputs.outcome }}",
            FIRST: "${{ steps.gate.outputs.first }}",
            // while a candidate is held, only it promotes (channels-pipeline.md section 3): the hold as the store had it
            // at the verdict, not the pick's, which a re-run attempt keeps from attempt 1
            // nothing is held once this run replaced a red hold (#5052)
            HELD: "${{ steps.hold.outputs.replaced == '' && steps.verdict.outputs.held || '' }}",
        });
        const order = steps.verdict.steps.map((st) => st.id ?? st.name);
        assert.ok(order.indexOf("verdict") < order.indexOf("gate") && order.indexOf("gate") < order.indexOf("promote"));
    });

    it("tells a screenshot gate refusal from an error, and a missing channel/nightly from a failed ls-remote", () => {
        const run = readFileSync("tools/channel/screenshot-gate.sh", "utf8");
        // the refusal line the step looks for is the one the gate prints
        assert.match(readFileSync("visual-review/trusted/gate.mjs", "utf8"), /"Review them with `visual-review serve`/);
        const gateRun = (lsRemote, gateExit, gateOut) => {
            const dir = mkdtempSync(join(TMP, "nightly-gate-"));
            const bin = join(dir, "bin");
            const src = join(dir, "src", "visual-review", "trusted");
            mkdirSync(bin, { recursive: true });
            mkdirSync(src, { recursive: true });
            writeFileSync(
                join(src, "cli.mjs"),
                `console.log(${JSON.stringify(gateOut)}); process.exit(${gateExit});\n`,
            );
            writeFileSync(
                join(bin, "git"),
                [
                    "#!/bin/sh",
                    `echo "$*" >> "${dir}/git.log"`,
                    'case "$1" in',
                    `ls-remote) exit ${lsRemote} ;;`,
                    "log) echo releasesha ;;",
                    `archive) tar -c -C "${join(dir, "src")}" visual-review ;;`,
                    "rev-parse) echo tree-$2 ;;",
                    "esac",
                    "",
                ].join("\n"),
                { mode: 0o755 },
            );
            const out = join(dir, "out");
            writeFileSync(out, "");
            mkdirSync(join(dir, "tmp"));
            const r = spawnSync("bash", ["-c", run], {
                cwd: dir,
                encoding: "utf8",
                env: {
                    ...process.env,
                    PATH: `${bin}:${process.env.PATH}`,
                    HEAD_SHA: "abc",
                    CAPTURES: join(dir, "captures"),
                    RUNNER_TEMP: join(dir, "tmp"),
                    GITHUB_OUTPUT: out,
                },
            });
            return {
                status: r.status,
                out: readFileSync(out, "utf8"),
                git: readFileSync(join(dir, "git.log"), "utf8"),
            };
        };
        const passed = gateRun(0, 0, "No unaccepted visual changes");
        assert.equal(passed.status, 0);
        assert.match(passed.out, /^outcome=success\nscreenshots=approved:tree-abc:visual-baselines\n$/);
        assert.match(passed.git, /--base origin\/channel\/nightly|fetch .*channel\/nightly/);
        const refused = gateRun(0, 1, "Review them with `visual-review serve` (the README).");
        assert.equal(refused.status, 0, "a refusal is a decision");
        assert.equal(refused.out, "outcome=failure\n");
        const crashed = gateRun(0, 1, "TypeError: boom");
        assert.equal(crashed.status, 1, "an error fails the job, so re-running it retries the gate");
        assert.equal(crashed.out, "");
        const first = gateRun(2, 0, "ok");
        assert.equal(first.status, 0, "no channel/nightly yet: the last release is the base");
        assert.match(first.git, /^log -1 /m);
        assert.match(first.out, /^first=true\n/, "decide files the Nightly blocked issue on a refusal");
        assert.doesNotMatch(first.git, /^fetch /m);
        const unreachable = gateRun(128, 0, "ok");
        assert.equal(unreachable.status, 128, "a failed ls-remote fails the step");
        assert.equal(unreachable.out, "");
    });

    it("trusts the passkeys.json master already has, and still judges visual-baselines/ against nightly's", () => {
        const run = readFileSync("tools/channel/screenshot-gate.sh", "utf8");
        const realGit = spawnSync("sh", ["-c", "command -v git"], { encoding: "utf8" }).stdout.trim();
        const scenario = (changeBaselines) => {
            const dir = mkdtempSync(join(TMP, "nightly-passkey-"));
            const bin = join(dir, "bin");
            const repo = join(dir, "repo");
            mkdirSync(bin);
            mkdirSync(join(repo, "visual-review", "trusted"), { recursive: true });
            mkdirSync(join(repo, "visual-baselines"));
            mkdirSync(join(dir, "tmp"));
            // only the network is faked: channel/nightly exists, and the fetch is already done
            writeFileSync(
                join(bin, "git"),
                `#!/bin/sh\ncase "$1" in ls-remote|fetch) exit 0 ;; esac\nexec ${realGit} "$@"\n`,
                {
                    mode: 0o755,
                },
            );
            // a stand-in gate with the real one's two rules: a passkeys.json change refuses, and so does a
            // changed visual-baselines/ (with no approval to check here)
            writeFileSync(
                join(repo, "visual-review", "trusted", "cli.mjs"),
                [
                    'import { execFileSync } from "node:child_process";',
                    "const a = process.argv;",
                    'const base = a[a.indexOf("--base") + 1], head = a[a.indexOf("--head") + 1];',
                    'const diff = (p) => execFileSync("git", ["diff", "--name-only", base, head, "--", p], { encoding: "utf8" }).trim();',
                    'if (diff("visual-review/passkeys.json") || diff("visual-baselines")) {',
                    '    console.log("Review them with `visual-review serve` (the README).");',
                    "    process.exit(1);",
                    "}",
                    "",
                ].join("\n"),
            );
            const git = (...args) => execFileSync("git", args, { cwd: repo, encoding: "utf8" }).trim();
            git("init", "-q");
            git("config", "user.name", "t");
            git("config", "user.email", "t@t");
            git("config", "commit.gpgsign", "false");
            writeFileSync(join(repo, "visual-review", "passkeys.json"), '{"keys":["old"]}\n');
            writeFileSync(join(repo, "visual-baselines", "a.txt"), "a\n");
            git("add", "-A");
            git("commit", "-qm", "nightly");
            git("update-ref", "refs/remotes/origin/channel/nightly", "HEAD");
            // master after nightly: an administrator-merged key change
            writeFileSync(join(repo, "visual-review", "passkeys.json"), '{"keys":["new"]}\n');
            if (changeBaselines) writeFileSync(join(repo, "visual-baselines", "a.txt"), "b\n");
            git("commit", "-qam", "candidate");
            const out = join(dir, "out");
            writeFileSync(out, "");
            const r = spawnSync("bash", ["-c", run], {
                cwd: repo,
                encoding: "utf8",
                env: {
                    ...process.env,
                    PATH: `${bin}:${process.env.PATH}`,
                    HEAD_SHA: git("rev-parse", "HEAD"),
                    CAPTURES: join(dir, "captures"),
                    RUNNER_TEMP: join(dir, "tmp"),
                    GITHUB_OUTPUT: out,
                },
            });
            return { status: r.status, stderr: r.stderr, out: readFileSync(out, "utf8"), git };
        };
        const keyOnly = scenario(false);
        assert.equal(keyOnly.status, 0, keyOnly.stderr);
        assert.equal(
            keyOnly.out,
            "outcome=success\nscreenshots=unchanged\n",
            "a key change on master never stalls nightly",
        );
        assert.equal(
            keyOnly.git("rev-parse", "refs/remotes/origin/channel/nightly"),
            keyOnly.git("rev-parse", "HEAD~1"),
            "channel/nightly is not moved",
        );
        const withBaselines = scenario(true);
        assert.equal(withBaselines.status, 0, withBaselines.stderr);
        assert.equal(withBaselines.out, "outcome=failure\n", "changed baselines are still judged against nightly's");
    });

    it("waits while a publish hold is open", () => {
        const dir = mkdtempSync(join(TMP, "nightly-decide-"));
        mkdirSync(join(dir, "tools"));
        const held = join(dir, "tools", "release-held.sh");
        const decide = (hold, gate = "success", first = "") => {
            writeFileSync(
                held,
                `#!/bin/sh\necho "$1 $2" >> "${dir}/held.log"\n[ "$2" = "Release held: publish failed" ] && echo "${hold}"\nexit 0\n`,
                {
                    mode: 0o755,
                },
            );
            const out = join(dir, "out");
            writeFileSync(out, "");
            const r = spawnSync(
                process.execPath,
                [new URL("./channel/nightly.mjs", import.meta.url).pathname, "decide"],
                {
                    cwd: dir,
                    encoding: "utf8",
                    env: {
                        PATH: process.env.PATH,
                        STATE: "green-clean",
                        GATE: gate,
                        FIRST: first,
                        SHA: "abc",
                        RUNNER_TEMP: dir,
                        GITHUB_OUTPUT: out,
                    },
                },
            );
            assert.equal(r.status, 0, r.stdout + r.stderr);
            return { out: readFileSync(out, "utf8"), stdout: r.stdout };
        };
        const waiting = decide("3500");
        assert.match(waiting.out, /^promote=false$/m);
        assert.match(waiting.stdout, /::notice::the nightly promotion waits: publish hold #3500 is open/);
        assert.match(decide("").out, /^promote=true$/m);
        assert.match(decide("", "failure").out, /^promote=false$/m);
        // the first promotion refused: no move means no stall alarm, so an issue says so
        writeFileSync(join(dir, "held.log"), "");
        decide("", "failure");
        assert.doesNotMatch(readFileSync(join(dir, "held.log"), "utf8"), /^open /m);
        assert.match(decide("", "failure", "true").out, /^promote=false$/m);
        assert.match(readFileSync(join(dir, "held.log"), "utf8"), /^open Nightly blocked: abc$/m);
    });

    it("promotes after the owner's approval: no lane runs, the gate reads the judging run, then version to site", () => {
        const pick = steps.pick;
        const resume = pick.steps.find((st) => st.id === "resume");
        assert.equal(
            resume.if,
            "${{ steps.pending.outputs.pending == 'false' && (env.MODE == 'full' || env.MODE == 'promote-nightly') && github.ref == 'refs/heads/master' }}",
        );
        assert.match(resume.run, /node tools\/channel\/resume.mjs check\n$/);
        const order = pick.steps.map((st) => st.id);
        assert.ok(order.indexOf("resume") < order.indexOf("candidate"), "a full slot catches up first");
        // the release output stays false, so no lane runs; the accept commit is the run's sha
        assert.equal(
            pick.outputs.release,
            "${{ steps.handoff.outputs.release || steps.candidate.outputs.run || steps.releasable.outputs.release || 'false' }}",
        );
        assert.match(pick.outputs.sha, /^\$\{\{ steps.resume.outputs.sha \|\| /);
        for (const lane of ["ci", "t4", "hosts", "autosave_macos", "audit", "version_dry_run"]) {
            assert.match(
                steps[lane].if,
                /^\$\{\{ !cancelled\(\) && needs.pick.result == 'success' && needs.pick.outputs.release == 'true'( && needs.pick.outputs.(hosts|macos) != 'false')? \}\}$/,
                lane,
            );
        }
        const gate = steps.resume;
        assert.equal(
            gate.if,
            "${{ !cancelled() && needs.pick.result == 'success' && needs.pick.outputs.resume == 'true' }}",
        );
        const download = gate.steps.find((st) => st.uses?.startsWith("actions/download-artifact"));
        assert.deepEqual(
            [download.with.pattern, download.with["run-id"]],
            ["visual-final-*", "${{ needs.pick.outputs.source_run }}"],
        );
        const decide = gate.steps.find((st) => st.id === "promote");
        assert.deepEqual([decide.run, decide.env.STATE], ["node tools/channel/nightly.mjs decide", "approved"]);
        // only a gate refusal is recorded (rejected), never a wait for a publish hold
        const rejected = gate.steps.find((st) => st.run === "node tools/channel/resume.mjs record");
        assert.equal(rejected.if, "${{ steps.gate.outputs.outcome == 'failure' }}");
        assert.equal(rejected.env.STATE, "rejected");
        // the builds the promotion ships: those the judging run kept for its held green-images head
        assert.equal(
            steps.keep_builds.if,
            "${{ !cancelled() && needs.verdict.outputs.state == 'green-images' && (needs.verdict.outputs.hold == 'start' || needs.verdict.outputs.hold == 'update') }}",
        );
    });

    it("deploys the site from environment nightly, after npm next, with the site repository's key only", () => {
        assert.match(caller, /\n {8}needs: \[pick, verdict, resume, version, land, publish\]\n/);
        assert.equal(callerJob.uses, "./.github/workflows/nightly-site.yml");
        assert.equal(
            callerJob.if,
            "${{ !cancelled() && (inputs.mode == 'full' || inputs.mode == 'restart' || inputs.mode == 'candidate' || inputs.mode == 'promote-nightly') && needs.land.outputs.pushed == 'true' && (needs.publish.result == 'success' || needs.publish.result == 'skipped') }}",
        );
        // after the owner's approval: the candidate's built site (master built it, not the accept commit), and
        // channel/nightly where the land job moved it
        assert.equal(callerJob.with.sha, "${{ needs.pick.outputs.tested || needs.pick.outputs.sha }}");
        assert.equal(callerJob.with.target, "${{ needs.version.outputs.commit || needs.pick.outputs.sha }}");
        for (const name of ["SHA", "TARGET", "COMMIT", "TAGS"]) {
            assert.equal(steps.site.env[name], `\${{ inputs.${name.toLowerCase()} }}`);
        }
        // channel.json's fullRun: a redeploy dispatched by hand names the promoting run
        assert.equal(steps.site.env.RUN_ID, "${{ inputs.run || github.run_id }}");
        assert.deepEqual(Object.keys(parseYaml(nightlySite).on), ["workflow_call", "workflow_dispatch"]);
        assert.equal(steps.site.environment, "nightly");
        const permissions = { actions: "read", contents: "write", "id-token": "write", issues: "write" };
        assert.deepEqual(steps.site.permissions, permissions);
        assert.deepEqual(callerJob.permissions, permissions);
        // the key reaches only this job: its presence check and the site repository's checkout
        assert.doesNotMatch(release, /NIGHTLY_SITE_DEPLOY_KEY/);
        assert.deepEqual(nightlySite.match(/secrets\.NIGHTLY_SITE_DEPLOY_KEY/g).length, 2);
        assert.match(
            site,
            /repository: \$\{\{ env.SITE_REPO \}\}\n\s+path: nightly-site\n\s+ssh-key: \$\{\{ secrets.NIGHTLY_SITE_DEPLOY_KEY \}\}/,
        );
        assert.equal(steps.site.env.SITE_REPO, "graphty-org/graphty-nightly");
        // nothing third-party runs beside the key
        assert.doesNotMatch(site.replace(/^\s*#.*$/gm, ""), /pnpm|nx |npm (?:install|ci)/);
        // the order of section 3: asset and channel.json, prerelease, deployed.json, the deploy, the store
        const names = steps.site.steps.map((st) => st.name ?? st.uses);
        const at = (n) => names.findIndex((x) => x.startsWith(n));
        for (const [a, b] of [
            // the checkout first, so a missing key still reaches the failure report (node tools/channel/...)
            ["actions/checkout@", "Check the site's deploy key"],
            ["Check the site's deploy key", "Download the candidate's built site"],
            // a re-run of an older run deploys nothing once channel/nightly moved on
            ["Check that nightly is still this run's", "Download the candidate's built site"],
            ["Pack the site and write channel.json", "Hang the site on the site-<sha> prerelease"],
            [
                "Hang the site on the site-<sha> prerelease",
                "Push deployed.json and channel.json to the site repository",
            ],
            ["Push deployed.json and channel.json to the site repository", "Wait for the site's deploy"],
            ["Wait for the site's deploy", "Record the promotion in the results store"],
            ["Record the promotion in the results store", "Announce the promoted nightly"],
            ["Wait for the site's deploy", "Close the failed-deploy and failed-promotion issues"],
        ]) {
            assert.ok(at(a) >= 0 && at(a) < at(b), `${a} before ${b}`);
        }
        // a deploy that worked closes the "Nightly site deploy failed" issue a failed one filed
        assert.match(
            steps.site.steps[at("Close the failed-deploy and failed-promotion issues")].run,
            /^rc=0\nnode tools\/channel\/nightly.mjs deployed \|\| rc=\$\?\n/m,
        );
        // a nightly closes no legacy train hold
        const closeHeld = steps.land.steps.find((st) => st.name === "Close the held-release issue");
        assert.equal(closeHeld.if, "${{ inputs.mode == 'legacy' }}");
        // the release and its assets in one call (immutable releases, #4149): tools/channel/nightly.mjs site-release
        assert.equal(
            steps.site.steps[at("Hang the site on the site-<sha> prerelease")].run,
            "node tools/channel/nightly.mjs site-release",
        );
        assert.doesNotMatch(nightlySite, /gh release upload/);
        assert.equal(
            steps.site.steps[at("Push deployed.json and channel.json to the site repository")].env.TAG,
            "${{ steps.release.outputs.tag }}",
        );
        assert.match(site, /node tools\/release-status.mjs nightly --sha "\$SHA" --tags "\$TAGS"/);
        const failed = steps.site.steps.find((st) => st.name === "Report a failed nightly deploy");
        assert.equal(failed.if, "${{ failure() }}");
        assert.match(
            failed.run,
            /node tools\/channel\/nightly.mjs failed\)\n\s*node tools\/release-status.mjs nightly-failed/,
        );
    });

    it("fails by name when environment nightly lacks the deploy key", () => {
        const check = steps.site.steps.find((st) => st.name === "Check the site's deploy key");
        assert.equal(check.env.KEY, "${{ secrets.NIGHTLY_SITE_DEPLOY_KEY }}");
        const run = (key) =>
            spawnSync("bash", ["-c", check.run], { encoding: "utf8", env: { PATH: process.env.PATH, KEY: key } });
        const missing = run("");
        assert.equal(missing.status, 1);
        assert.match(missing.stdout, /::error::secret NIGHTLY_SITE_DEPLOY_KEY is missing from environment nightly/);
        assert.equal(run("-----BEGIN OPENSSH PRIVATE KEY-----").status, 0);
    });

    it("refuses a site repository without its deploy workflow before it pushes", () => {
        const push = steps.site.steps.find(
            (st) => st.name === "Push deployed.json and channel.json to the site repository",
        );
        assert.ok(push.run.indexOf("nightly-site/.github/workflows/deploy.yml") < push.run.indexOf("git push"));
    });

    it("pushes channel.json beside deployed.json, as promote-push.sh does, for promote.mjs to read", () => {
        const push = steps.site.steps.find(
            (st) => st.name === "Push deployed.json and channel.json to the site repository",
        );
        assert.match(push.run, /cp "\$RUNNER_TEMP\/out\/channel.json" nightly-site\/channel.json\n/);
        assert.match(push.run, /\ngit add deployed.json channel.json\n/);
    });

    it("skips, never fails, a re-run whose channel/nightly moved on", () => {
        const all = steps.site.steps;
        const guard = all.findIndex((st) => st.name === "Check that nightly is still this run's");
        assert.equal(all[guard].id, "current");
        assert.doesNotMatch(all[guard].run, /exit 1|::error::/, "a moved nightly is not a failure");
        assert.match(all[guard].run, /echo "ours=true" >> "\$GITHUB_OUTPUT"/);
        assert.match(all[guard].run, /echo "ours=false" >> "\$GITHUB_OUTPUT"/);
        for (const st of all.slice(guard + 1)) {
            const name = st.name ?? st.uses;
            if (name === "Report a failed nightly deploy") assert.equal(st.if, "${{ failure() }}");
            else assert.equal(st.if, "${{ steps.current.outputs.ours == 'true' }}", name);
        }
    });

    it("checks age:nightly in every run's timings job, on master, without failing it", () => {
        assert.match(timings, /\n\s+site,\n\s+\]\n/, "timings runs after the site job too");
        assert.match(timings, /issues: write # the age:nightly stall alarm/);
        const stallStep = steps.timings.steps.find(
            (st) => st.name === "Check that nightly is not stalled (age:nightly)",
        );
        assert.equal(stallStep.run, "node tools/channel/nightly.mjs stall");
        assert.equal(stallStep["continue-on-error"], true);
        assert.equal(stallStep.if, "${{ github.ref == 'refs/heads/master' }}");
        assert.equal(stallStep.env.RESULTS_URL, "${{ vars.RESULTS_URL }}");
    });
});

describe("every workflow's job env", () => {
    // GitHub refuses a whole workflow file, with a failed run and no jobs on every push, when a job's
    // env reads a context it does not offer there (runner is only available inside steps).
    it("reads no runner context", () => {
        const dir = new URL("../.github/workflows/", import.meta.url);
        for (const name of readdirSync(dir).filter((f) => /\.ya?ml$/.test(f))) {
            const jobs = parseYaml(workflow(name))?.jobs ?? {};
            for (const [id, body] of Object.entries(jobs)) {
                for (const [key, value] of Object.entries(body?.env ?? {})) {
                    assert.doesNotMatch(String(value), /\$\{\{[^}]*\brunner\./, `${name} job ${id} env ${key}`);
                }
            }
        }
    });
});

describe("promote.yml", () => {
    const promote = workflow("promote.yml");
    const main = job(promote, "promote");
    const nightlySite = job(promote, "nightly-site");
    const channelRef = job(promote, "channel-ref");
    // each step of a job, as text, from its "- " line to the next one
    const steps = (text) =>
        text
            .replace(/^\s*#.*\n/gm, "")
            .split(/\n(?= {12}- )/)
            .slice(1);

    it("is dispatched only, with the nightly, the channel, dry_run (on by default) and config_only", () => {
        const on = /^on:\n([\s\S]*?)\n\S/m.exec(promote)[1];
        assert.deepEqual(
            [...on.matchAll(/^ {4}(\w+):/gm)].map((m) => m[1]),
            ["workflow_dispatch"],
        );
        assert.match(on, /\n {12}nightly:\n[\s\S]*?default: newest\n/);
        assert.match(
            on,
            /\n {12}channel:\n[\s\S]*?type: choice\n\s+default: production\n\s+options:\n\s+- production\n\s+- nightly\n/,
        );
        assert.match(on, /\n {12}dry_run:\n[^\n]*\n\s+type: boolean\n\s+default: true\n/);
        assert.match(on, /\n {12}config_only:\n[^\n]*\n\s+type: boolean\n\s+default: false\n/);
    });

    it("waits for the owner: the job runs in environment production, from master only, and checks production has a reviewer", () => {
        assert.match(main, /\n {8}environment: production\n/);
        assert.match(main, /\n {8}if: \$\{\{ github.ref == 'refs\/heads\/master' \}\}\n/);
        assert.match(main, /required_reviewers/);
        // the refusals come before anything that can move
        const order = [
            "promote.mjs gather",
            "promote.mjs check",
            "promote.mjs trust",
            "promote.mjs move",
            "promote-push.sh",
            "promote.mjs releases",
        ];
        const at = order.map((s) => main.indexOf(s));
        assert.ok(
            at.every((i) => i > 0),
            JSON.stringify(at),
        );
        assert.deepEqual(
            [...at].sort((a, b) => a - b),
            at,
        );
    });

    it("moves nothing in a dry run: every step that writes outside the run is off unless dry_run is false", () => {
        const writers = steps(main).filter((s) =>
            /promote\.mjs (move|releases)|promote-push\.sh|ssh-key|promote\.mjs wait/.test(s),
        );
        assert.equal(writers.length, 5);
        for (const s of writers) assert.match(s, /if: \$\{\{ inputs.dry_run != true && /, s);
        assert.match(nightlySite, /\n {8}if: \$\{\{ inputs.dry_run != true && inputs.channel == 'nightly' \}\}\n/);
        assert.match(
            channelRef,
            /\n {8}if: \$\{\{ always\(\) && inputs.dry_run != true && inputs.config_only != true && needs.promote.result == 'success'/,
        );
        // no push happens anywhere else
        assert.deepEqual(
            [...promote.matchAll(/git push[^\n]*/g)].map((m) => m[0]),
            [
                'git push --no-verify --force-with-lease="${ref}:${old}" origin "${COMMIT}:${ref}"',
                'git push --no-verify origin "${COMMIT}:${ref}"',
            ],
        );
    });

    it("config_only moves no tag and marks no release; channel: nightly deploys only from environment nightly", () => {
        for (const s of steps(main).filter((s) => /promote\.mjs (move|releases)/.test(s)))
            assert.match(s, /inputs.config_only != true/);
        for (const s of steps(main).filter((s) => /graphty-site|promote-push\.sh|releases/.test(s)))
            assert.match(s, /inputs.channel == 'production'/);
        assert.match(nightlySite, /\n {8}environment: nightly\n/);
        assert.match(nightlySite, /NIGHTLY_SITE_DEPLOY_KEY/);
        assert.doesNotMatch(main, /NIGHTLY_SITE_DEPLOY_KEY/);
    });

    it("moves the dist-tags with npm trusted publishing (OIDC): no stored npm token, npm 11.21+, checked before moving", () => {
        assert.doesNotMatch(promote, /NPM_DIST_TAG_TOKEN|NODE_AUTH_TOKEN|NPM_TOKEN|_authToken|registry-url/);
        assert.match(main, /\n {12}id-token: write\b/);
        assert.match(main, /\n {8}environment: production\n/);
        assert.match(main, /npm install -g npm@11\.(2[1-9]|[3-9]\d)\.\d+\n/);
        const order = steps(main).map((s) => /promote\.mjs (\w+)/.exec(s)?.[1] ?? /npm install -g/.exec(s)?.[0]);
        assert.ok(order.indexOf("npm install -g") < order.indexOf("trust"));
        assert.ok(order.indexOf("trust") < order.indexOf("move"));
        const trust = steps(main).find((s) => /promote\.mjs trust/.test(s));
        assert.match(trust, /if: \$\{\{ inputs.config_only != true \}\}/, "a dry run checks the trust too");
    });

    it("keeps each key in its own environment: graphty-site's key in production, the release key in release", () => {
        assert.equal(promote.match(/secrets.RELEASE_DEPLOY_KEY/g).length, 1);
        assert.match(channelRef, /\n {8}environment: release # the deploy key\n/);
        assert.match(channelRef, /secrets.RELEASE_DEPLOY_KEY/);
        assert.doesNotMatch(channelRef.replace(/^\s*#.*$/gm, ""), /npm |setup-node|pnpm/);
        for (const secret of ["PRODUCTION_SITE_DEPLOY_KEY"]) {
            assert.ok(promote.includes(secret));
            assert.doesNotMatch(nightlySite + channelRef, new RegExp(secret));
        }
        assert.match(promote, /\npermissions:\n {4}contents: read\n/);
    });
});

describe("the light pull-request check (#3443, merging.md 4.1)", () => {
    const ci = workflow("ci.yml");
    const build = job(ci, "packages");
    const stepOf = (name) => {
        const m = new RegExp(`\\n {12}- name: ${name}\\n([\\s\\S]*?)(?=\\n\\n {12}(?:#|- ))`).exec(build);
        assert.ok(m, `Build has the step ${name}`);
        return `\n${m[1]}`;
    };
    const index = (name) => build.indexOf(`- name: ${name}\n`);

    it("plans inside Build after the builds: one results-store read, then the selector's bins, pull requests only", () => {
        const bins = stepOf("Plan the light check's test bins");
        assert.match(bins, /\n {14}id: bins\n/);
        // the base is the master commit the merge ref was built on, never master's tip at fetch time
        assert.doesNotMatch(bins, /rev-parse "origin\/\$BASE_REF"/);
        assert.match(bins, /--arg base "\$\(git rev-parse HEAD\^1\)"/);
        assert.match(
            bins,
            /\n {14}if: steps\.plan\.outputs\.full == 'false' && steps\.reuse\.outputs\.reuse-run == ''\n/,
        );
        assert.match(bins, /\n {14}continue-on-error: true\n/, "a failed plan keeps the whole-shard matrix");
        assert.match(bins, /node tools\/results\/plan-read\.mjs "\$AFFECTED" "\$plan"/);
        assert.match(bins, /node tools\/test-select\.mjs --base "origin\/\$BASE_REF" --head HEAD --plan/);
        assert.match(bins, /--durations "\$plan\/durations\.json"/);
        assert.match(bins, /node tools\/ci-test-matrix\.mjs [^\n]* --plan "\$plan\/light-plan\.json"/);
        // the import graphs resolve the other packages through their dist folders
        for (const b of ["Build affected (PR)", "Build the rest (PR), so every shard finds its artifact"]) {
            assert.ok(index(b) > 0 && index(b) < index("Plan the light check's test bins"), `${b} runs first`);
            // the app is off the test jobs' critical path: no PR job reads graphty/dist, Lint builds it
            assert.match(
                build.slice(index(b)),
                /^[^\n]*\n[^\n]*\n {14}run: [^\n]*--exclude=graphty\b/u,
                `${b} skips the app`,
            );
        }
        const lint = job(ci, "lint");
        assert.match(
            lint,
            /- name: Build the graphty app \(PR, when affected\)\n {14}if: needs\.packages\.outputs\.full == 'false' && contains\(fromJSON\(needs\.packages\.outputs\.affected\), 'graphty'\)\n {14}run: pnpm exec nx run graphty:build --exclude-task-dependencies\n/u,
        );
        assert.ok(
            index("Plan the light check's test bins") < index("Upload all package builds"),
            "planned before the uploads",
        );
        assert.match(
            build,
            /test-matrix: \$\{\{ steps\.bins\.outputs\.test-matrix \|\| steps\.plan\.outputs\.test-matrix \}\}/,
        );
        assert.match(
            build,
            /test-count: \$\{\{ steps\.bins\.outputs\.test-count \|\| steps\.plan\.outputs\.test-count \}\}/,
        );
        // the Plan step itself never packs bins: a full run keeps every shard
        assert.doesNotMatch(stepOf("Plan affected projects and test shards"), /plan-read|--plan/);
        assert.match(build, /\n {12}id-token: write\n/, "Build may read the store with its OIDC token");
        assert.match(stepOf("Upload the results plan"), /name: results-plan\n/);
    });

    it("restores the selector's import graphs read-only; only master's push build saves them", () => {
        assert.match(
            build,
            /- name: Restore the selector's import graphs\n[\s\S]*?uses: actions\/cache\/restore@v\d+\n/,
        );
        assert.doesNotMatch(build, /actions\/cache\/save@|actions\/cache@v\d+\n[^\n]*\n[^\n]*tmp\/test-select/);
        const graphs = job(ci, "select-graphs");
        assert.match(
            graphs,
            /\n {8}if: github\.event_name == 'push' && github\.ref == 'refs\/heads\/master' && inputs\.ref == ''\n/,
        );
        assert.match(graphs, /uses: actions\/cache\/save@v\d+\n/);
        // an exact-key restore (no prefix restore-keys) and a save only on a miss: the saved set holds only the
        // current graphs (the restore also serves the reach step, design/visual-testing/early-capture.md 4a)
        assert.doesNotMatch(graphs, /restore-keys: test-select-graphs/, "the saved set holds only the current graphs");
        assert.match(graphs, /- name: Save the import graphs\n {14}if: steps\.graphs\.outputs\.cache-hit != 'true'\n/);
    });

    it("runs the plan's bins as Test (<family>-<bin>) jobs, each through run-group.mjs", () => {
        const test = job(ci, "test");
        assert.match(test, /\n {8}name: Test \(\$\{\{ matrix\.shard \}\}\)\n/);
        assert.match(test, /matrix: \$\{\{ fromJSON\(needs\.packages\.outputs\.test-matrix\) \}\}/);
        assert.match(test, /\n {14}run: \$\{\{ matrix\.test-command \}\}\n/);
        const light = {
            bins: [
                {
                    name: "graphty-element-browser-1",
                    family: "graphty-element-browser",
                    shard: "graphty-element-browser-1",
                    covers: SHARDS.filter((s) => s.shard.startsWith("graphty-element-browser-")).map((s) => s.shard),
                    files: ["graphty-element/test/browser/a.test.ts"],
                    command: "pnpm exec vitest run --project=browser test/browser/a.test.ts",
                },
            ],
            whole: [],
            none: ["graphty-element-default"],
        };
        const include = plan(["graphty-element"], undefined, light);
        const bin = include.find((e) => e.shard === "graphty-element-browser-1");
        assert.deepEqual(bin.files, ["graphty-element/test/browser/a.test.ts"]);
        assert.equal(bin.coverage, undefined, "a bin writes no coverage");
        assert.ok(bin["test-command"].startsWith("node tools/results/run-group.mjs graphty-element-browser-1 '"));
        assert.ok(!include.some((e) => /^graphty-element-browser-[2-5]$/.test(e.shard)), "the bin replaces its shards");
        assert.ok(
            !include.some((e) => e.shard === "graphty-element-default"),
            "a shard with nothing selected runs nowhere",
        );
        for (const e of include) assert.match(e["test-command"], /^node tools\/results\/run-group\.mjs /);
    });

    it("a full run (dispatch, the release train) still runs every shard", () => {
        const include = plan(PACKAGES);
        const ran = new Set(include.flatMap((e) => [e.shard, ...(GROUPS[e.shard] ?? [])]));
        assert.deepEqual(
            SHARDS.map((s) => s.shard).filter((s) => !ran.has(s)),
            [],
        );
    });

    it("All Checks Pass fails when the plan made Test jobs that did not all pass", () => {
        assert.match(job(ci, "all-checks"), /needs: \[[^\]]*\btest\b/);
        const run = /- name: Check all jobs passed\n[\s\S]*?\n {14}run: \|\n([\s\S]*?)\n\n/.exec(
            job(ci, "all-checks"),
        )[1];
        const verdict = (count, testResult) =>
            spawnSync("bash", ["-e", "-c", run], {
                encoding: "utf8",
                env: {
                    ...process.env,
                    BUILD: "success",
                    FULL: "false",
                    LIGHT: "false",
                    ADVISORY: "[]",
                    REUSE_RUN: "",
                    TEST_COUNT: count,
                    NEEDS: JSON.stringify(
                        Object.fromEntries(
                            ["packages", "build", "lint", "checks", "docs"]
                                .map((n) => [n, { result: "success" }])
                                .concat([["test", { result: testResult }]]),
                        ),
                    ),
                },
            });
        assert.equal(verdict("3", "success").status, 0);
        assert.equal(verdict("0", "skipped").status, 0, "no planned Test job: a skipped Test passes");
        assert.equal(verdict("3", "skipped").status, 1, "a planned Test job that never ran fails");
        assert.equal(verdict("3", "failure").status, 1);
        assert.equal(verdict("3", "cancelled").status, 1);
    });
});

describe("the light check's Stories jobs (#3443 part b, merging.md 4.1)", () => {
    const ci = workflow("ci.yml");
    const stories = job(ci, "stories");
    const runOf = (name) => {
        const m = new RegExp(`- name: ${name}\\n[\\s\\S]*?\\n {14}run: \\|\\n([\\s\\S]*?)\\n\\n`).exec(stories);
        assert.ok(m, `Stories has the step ${name}`);
        return m[1];
    };

    it("is a Stories (<project>-<bin>) matrix from the Build job's plan, only when a story was selected", () => {
        assert.match(stories, /\n {8}name: Stories \(\$\{\{ matrix\.name \}\}\)\n/);
        assert.match(stories, /matrix: \$\{\{ fromJSON\(needs\.packages\.outputs\.stories-matrix\) \}\}/);
        assert.match(stories, /fromJSON\(needs\.packages\.outputs\.stories-count \|\| '0'\) > 0/);
        const build = job(ci, "packages");
        assert.match(build, /stories-matrix: \$\{\{ steps\.bins\.outputs\.stories-matrix \}\}/);
        assert.match(build, /grep -E '\^\(test\|stories\)-\(matrix\|count\)='/);
    });

    it("blocks: All Checks Pass needs it, and neither the job nor its capture is continue-on-error (#3472)", () => {
        assert.match(job(ci, "all-checks"), /needs: \[[^\]]*\bstories\b/);
        const jobs = parseJobs(ci);
        assert.equal(jobs.stories.coe, undefined, "no job-level continue-on-error");
        const capture = jobs.stories.steps.find((x) => x.name === "Capture the selected stories");
        assert.equal(capture.coe, undefined, "a capture crash fails the job");
        // its partial captures are not visual-* artifacts, which the visual gate and the flaky report read
        assert.match(stories, /name: stories-\$\{\{ matrix\.name \}\}-\$\{\{ github\.run_attempt \}\}/);
    });

    it("finds master's newest capture once per run, not once per Stories job (#4318)", () => {
        // each Stories job walking master's commits itself spent about 20 Actions-token calls a job
        assert.doesNotMatch(stories, /visual-review reference|GH_TOKEN/);
        assert.match(stories, /needs: \[packages, build, story-references\]/);
        assert.match(stories, /name: story-references-\$\{\{ github\.run_attempt \}\}/);
        const refs = job(ci, "story-references");
        assert.match(refs, /\n {8}continue-on-error: true\n/, "a reference is an aid: its job never fails the run");
        assert.match(refs, /for project in \$\(jq -r '\.projects \| keys\[\]' visual-review\.config\.json\)/);
        // it starts with the Build job, not after it: the Stories jobs wait for it (#3448)
        assert.doesNotMatch(refs, /\n {8}needs:/);
        assert.match(refs, /node visual-review\/trusted\/cli\.mjs reference --project "\$project"/);
        assert.match(refs, /VISUAL_REVIEW_API_CACHE: \$\{\{ runner\.temp \}\}\/github-api/);
        assert.match(refs, /git archive "\$src" visual-review\/capture visual-review\/trusted \| tar -x/);
    });

    it("captures with the old visual-review capture, the base branch's copy, and only the selected stories", () => {
        assert.match(stories, /if \[ "\$GITHUB_EVENT_NAME" = pull_request \]; then src=HEAD\^1\n/);
        assert.match(stories, /git archive "\$src" visual-review\/capture visual-review\/trusted \| tar -x/);
        assert.match(
            stories,
            /run: pnpm exec visual-review capture --project \$\{\{ matrix\.project \}\} --out "\$RUNNER_TEMP\/visual" --reference "\$\{\{ steps\.reference\.outputs\.dir \}\}" --stories "\$STORIES"\n/,
        );
        const dir = mkdtempSync(join(TMP, "stories-"));
        writeFileSync(
            join(dir, "index.json"),
            JSON.stringify({
                v: 5,
                entries: {
                    "a--one": { id: "a--one", type: "story", importPath: "./stories/A.stories.ts" },
                    "a--two": { id: "a--two", type: "story", importPath: "./stories/A.stories.ts" },
                    "a--docs": { id: "a--docs", type: "docs", importPath: "./stories/A.stories.ts" },
                    "b--one": { id: "b--one", type: "story", importPath: "./stories/B.stories.ts" },
                },
            }),
        );
        const pick = (files, ids) => {
            const out = join(dir, "out.txt");
            writeFileSync(out, "");
            const r = spawnSync("bash", ["-e", "-c", runOf("Pick the selected stories")], {
                encoding: "utf8",
                env: {
                    ...process.env,
                    FILES: JSON.stringify(files),
                    IDS: JSON.stringify(ids),
                    STORYBOOK: dir,
                    GITHUB_OUTPUT: out,
                },
            });
            assert.equal(r.status, 0, r.stderr);
            return readFileSync(out, "utf8").trim();
        };
        assert.equal(pick(["graphty-element/stories/A.stories.ts"], []), "stories=a--one,a--two");
        assert.equal(pick([], ["c--changed-baseline"]), "stories=c--changed-baseline");
        assert.equal(
            pick(["graphty-element/stories/C.stories.ts"], []),
            "stories=",
            "an unbuilt file captures nothing",
        );
    });

    it("reports a changed picture in the job summary and passes", () => {
        const dir = mkdtempSync(join(TMP, "stories-report-"));
        mkdirSync(join(dir, "visual"));
        writeFileSync(
            join(dir, "visual", "results.json"),
            JSON.stringify({
                reference: null,
                items: [
                    { file: "a--one.png", status: "changed" },
                    { file: "a--two.png", status: "unchanged" },
                ],
            }),
        );
        const summary = join(dir, "summary.md");
        const r = spawnSync("bash", ["-e", "-c", runOf("Report the changed pictures \\(does not block\\)")], {
            encoding: "utf8",
            env: { ...process.env, RUNNER_TEMP: dir, GITHUB_STEP_SUMMARY: summary, NAME: "graphty-element-1" },
        });
        assert.equal(r.status, 0, r.stderr);
        const text = readFileSync(summary, "utf8");
        assert.match(text, /### Stories \(graphty-element-1\)\n/);
        assert.match(text, /\n- changed: a--one\.png\n/);
        assert.doesNotMatch(text, /- unchanged/);
    });

    it("fails on a broken or unstable story, never on a changed, new or flaky-then-matching picture (#3472)", () => {
        const verdict = (items) => {
            const dir = mkdtempSync(join(TMP, "stories-verdict-"));
            if (items) {
                mkdirSync(join(dir, "visual"));
                writeFileSync(join(dir, "visual", "results.json"), JSON.stringify({ items }));
            }
            return spawnSync("bash", ["-e", "-c", runOf("Fail on a broken or unstable story")], {
                encoding: "utf8",
                env: { ...process.env, RUNNER_TEMP: dir, PROJECT: "graphty-element", VISUAL_REVIEW_BLOCKING: "1" },
            });
        };
        assert.match(stories, /- name: Fail on a broken or unstable story\n[\s\S]*?VISUAL_REVIEW_BLOCKING: "1"/);
        assert.match(stories, /github\.event_name == 'pull_request'/);
        const passing = verdict([
            { file: "a.png", status: "changed" },
            { file: "b.png", status: "new" },
            { file: "c.png", status: "unchanged", flaky: true },
            { file: "d.png", status: "removed" },
        ]);
        assert.equal(passing.status, 0, passing.stdout);
        const broken = verdict([{ file: "a.png", status: "failed", reason: "play function threw\nstack" }]);
        assert.equal(broken.status, 1);
        assert.match(broken.stdout, /::error::\[BROKEN\] graphty-element: a\.png: play function threw\n/);
        const unstable = verdict([{ file: "b.png", status: "unstable" }]);
        assert.equal(unstable.status, 1);
        assert.match(unstable.stdout, /::error::\[UNSTABLE\] graphty-element: b\.png/);
        const missing = verdict(null);
        assert.equal(missing.status, 1);
        assert.match(missing.stdout, /wrote no results\.json/);
    });

    it("All Checks Pass fails on a failed Stories job and passes a skipped one when none was planned (#3472)", () => {
        const run = /- name: Check all jobs passed\n[\s\S]*?\n {14}run: \|\n([\s\S]*?)\n\n/.exec(
            job(ci, "all-checks"),
        )[1];
        const verdict = (count, result, full = "false") =>
            spawnSync("bash", ["-e", "-c", run], {
                encoding: "utf8",
                env: {
                    ...process.env,
                    BUILD: "success",
                    FULL: full,
                    LIGHT: "false",
                    ADVISORY: "[]",
                    REUSE_RUN: "",
                    TEST_COUNT: "0",
                    STORIES_COUNT: count,
                    NEEDS: JSON.stringify(
                        Object.fromEntries(
                            ["packages", "build", "lint", "checks", "docs"]
                                .map((n) => [n, { result: "success" }])
                                .concat([
                                    ["test", { result: "success" }],
                                    ["stories", { result }],
                                ]),
                        ),
                    ),
                },
            });
        assert.equal(verdict("2", "success").status, 0);
        assert.equal(verdict("0", "skipped").status, 0, "no story selected: a skipped Stories passes");
        assert.equal(verdict("0", "skipped", "true").status, 0, "a full run plans no Stories job either");
        const failed = verdict("2", "failure");
        assert.equal(failed.status, 1);
        assert.match(failed.stdout, /the plan made 2 Stories jobs, but Stories reports failure/);
        assert.equal(verdict("2", "skipped").status, 1, "planned Stories jobs that never ran fail");
        assert.equal(verdict("2", "cancelled").status, 1);
    });

    it("storiesPlan() makes one entry per story bin with its project's Storybook artifact", () => {
        assert.deepEqual(storiesPlan(undefined), []);
        assert.deepEqual(storiesPlan({ bins: [] }), []);
        const [e] = storiesPlan({
            storyBins: [
                {
                    name: "graphty-element-1",
                    project: "graphty-element",
                    storybook: "graphty-element/storybook-static",
                    files: ["graphty-element/stories/A.stories.ts"],
                    ids: [],
                    ms: 1000,
                },
            ],
        });
        assert.deepEqual(e, {
            name: "graphty-element-1",
            project: "graphty-element",
            artifact: "build-storybook-element",
            storybook: "graphty-element/storybook-static",
            files: ["graphty-element/stories/A.stories.ts"],
            ids: [],
        });
        assert.throws(() => storiesPlan({ storyBins: [{ name: "x-1", storybook: "x/storybook-static" }] }), /x-1/);
    });
});

describe("the light check's optional jobs (#3443 part c, merging.md 4.1)", () => {
    const ci = workflow("ci.yml");
    const jobs = parseYaml(ci).jobs;
    const step = (jobId, name) => {
        const s = jobs[jobId].steps.find((x) => x.name === name);
        assert.ok(s, `${jobId} has the step ${name}`);
        return s;
    };

    // Runs the Build job's "Plan the optional jobs" script in a throwaway repository whose origin/master holds
    // this checkout's package.json and tools/copy-docs-content.js, on a pull request changing `files`.
    const optional = (files, { event = "pull_request", affected = [] } = {}) => {
        const dir = mkdtempSync(join(TMP, "optional-"));
        const git = (...a) => {
            const r = spawnSync("git", a, { cwd: dir, encoding: "utf8" });
            assert.equal(r.status, 0, r.stderr);
        };
        mkdirSync(join(dir, "tools"));
        copyFileSync("package.json", join(dir, "package.json"));
        copyFileSync("tools/copy-docs-content.js", join(dir, "tools/copy-docs-content.js"));
        mkdirSync(join(dir, "visual-review/docs"), { recursive: true });
        copyFileSync("visual-review/docs/index.md", join(dir, "visual-review/docs/index.md"));
        git("init", "-q", "-b", "master");
        git("add", ".");
        git("commit", "-qm", "base");
        git("update-ref", "refs/remotes/origin/master", "HEAD");
        for (const f of files) {
            mkdirSync(join(dir, f, ".."), { recursive: true });
            writeFileSync(join(dir, f), "x\n");
        }
        git("add", ".");
        git("commit", "-qm", "change", "--allow-empty");
        const out = join(dir, "out");
        writeFileSync(out, "");
        const r = spawnSync("bash", ["-e", "-c", step("packages", "Plan the optional jobs").run], {
            cwd: dir,
            encoding: "utf8",
            env: {
                ...process.env,
                EVENT: event,
                BASE_REF: "master",
                AFFECTED: JSON.stringify(affected),
                GITHUB_OUTPUT: out,
            },
        });
        assert.equal(r.status, 0, r.stderr);
        return Object.fromEntries(
            readFileSync(out, "utf8")
                .trim()
                .split("\n")
                .map((l) => l.split("=")),
        );
    };

    it("plans them in Build and hands them to the other jobs", () => {
        const build = job(ci, "packages");
        for (const o of ["docs", "cost-accuracy"]) {
            assert.match(build, new RegExp(`\\n {12}${o}: \\$\\{\\{ steps\\.optional\\.outputs\\.${o} \\}\\}\\n`));
        }
    });

    it("runs every optional job on any run but a pull request", () => {
        for (const event of ["push", "workflow_dispatch", "workflow_call"]) {
            assert.deepEqual(optional([], { event }), { docs: "true", "cost-accuracy": "true" });
        }
    });

    it("a pull request touching no docs or cost files runs neither", () => {
        assert.deepEqual(optional(["graph-samples/src/a.ts"], { affected: ["graph-samples"] }), {
            docs: "false",
            "cost-accuracy": "false",
        });
    });

    it("runs Docs on a docs input: docs/, a package's docs/, the copy script, or an affected package with API docs", () => {
        for (const f of ["docs/index.md", "graph-io/docs/guide.md", "tools/copy-docs-content.js"]) {
            assert.equal(optional([f]).docs, "true", f);
        }
        assert.equal(optional(["algorithms/src/a.ts"], { affected: ["algorithms"] }).docs, "true");
        assert.equal(optional(["graph-format/README.md"], { affected: ["graph-format"] }).docs, "false");
    });

    it("runs Docs when a file a docs page includes changed (visual-review's README)", () => {
        assert.equal(optional(["visual-review/README.md"]).docs, "true");
    });

    it("runs Docs when what builds the docs changed: root package.json, the lockfile, ci.yml", () => {
        for (const f of ["package.json", "pnpm-lock.yaml", ".github/workflows/ci.yml"]) {
            assert.equal(optional([f]).docs, "true", f);
        }
    });

    it("runs Cost Estimate Accuracy on a pull request only when its files changed", () => {
        assert.equal(optional(["graphty-element/src/session/cost/estimate.ts"])["cost-accuracy"], "true");
        for (const f of [
            "graphty-element/src/catalog/algorithms.ts",
            "algorithms/src/shortest-path/dijkstra.ts",
            "graph-format/src/a.ts",
            "graphty-element/package.json",
            ".github/workflows/ci.yml",
        ]) {
            assert.equal(optional([f])["cost-accuracy"], "true", f);
        }
        assert.equal(optional(["graphty-element/src/Graph.ts"])["cost-accuracy"], "false");
        assert.match(jobs["cost-accuracy"].if, /&& needs\.packages\.outputs\.cost-accuracy == 'true'$/);
    });

    it("gates Docs on the plan and runs the tool tests on every pull request, and All Checks Pass accepts a skipped Docs", () => {
        assert.match(jobs.docs.if, /&& needs\.packages\.outputs\.docs == 'true'$/);
        assert.equal(step("checks", "CI workflow tests").if, "needs.packages.outputs.light != 'true'");
        const summary = step("all-checks", "Check all jobs passed");
        assert.equal(summary.env.DOCS, "${{ needs.packages.outputs.docs }}");
        assert.match(summary.run, /\[\[ "\$DOCS" == "false" \]\] && strict='\["packages","build","lint","checks"\]'/);
    });

    it("adds the budgets lint, the offline links and the signing-bypass check to Checks", () => {
        assert.equal(step("checks", "CI budgets").run, "node tools/ci-budgets.mjs lint");
        assert.equal(step("checks", "Links (offline)").run, "./tools/check-links.sh --offline");
        assert.match(
            step("checks", "No signing bypass in tools/ and .husky/").run,
            /^! git grep -niE .*-- tools\/ \.husky\/$/,
        );
    });

    it("moves the network links, the coverage uploads and the lifecycle shard to the full run", () => {
        assert.match(jobs.links.if, /^needs\.packages\.outputs\.full == 'true' && /);
        const uploads = jobs.test.steps.filter((s) => /coverage/i.test(s.name ?? ""));
        assert.equal(uploads.length, 5);
        for (const s of uploads) assert.match(s.if, /needs\.packages\.outputs\.full == 'true'/, s.name);
        const lifecycle = "graphty-element-lifecycle";
        assert.ok(
            plan(PACKAGES).some((e) => e.shard === lifecycle),
            "a full run has it",
        );
        assert.ok(
            !plan(PACKAGES, undefined, undefined, true).some((e) => e.shard === lifecycle),
            "a pull request does not",
        );
        const bin = { name: `${lifecycle}-1`, shard: lifecycle, family: lifecycle, files: ["a"], command: "x" };
        assert.ok(!plan(PACKAGES, undefined, { bins: [bin] }, true).some((e) => e.shard === bin.name), "nor its bin");
        assert.match(step("packages", "Plan affected projects and test shards").run, /pr=\(--pull-request\)/);
        assert.match(
            step("packages", "Plan the light check's test bins").run,
            /--plan "\$plan\/light-plan\.json" --pull-request/,
        );
    });
});

describe("release.yml's fix forward into the held candidate (#3741)", () => {
    const release = workflow("release.yml");
    const jobs = parseYaml(release).jobs;

    it("merges the fixes before the pick, in every full, restart and candidate run, and the pick runs whatever it did", () => {
        const fix = jobs.candidate_fix;
        // the job itself runs in every mode on master, so it never skips the jobs after the pick (#4134); its steps do
        // the work only in a full, restart or candidate run
        assert.equal(fix.if, "${{ github.ref == 'refs/heads/master' }}");
        const modes = /inputs\.mode == 'full' \|\| inputs\.mode == 'restart'( \|\| inputs\.mode == 'candidate')?/;
        for (const st of fix.steps) assert.match(st.if ?? "", modes, st.name ?? st.uses);
        assert.equal(fix.steps.at(-1).run.trim().split("\n").at(-1), "node tools/channel/candidate-fix.mjs advance");
        assert.equal(jobs.pick.needs, "candidate_fix");
        assert.match(jobs.pick.if, /^\$\{\{ !cancelled\(\) && /);
        assert.ok(parseYaml(release).on.workflow_dispatch.inputs.mode.options.includes("candidate"));
    });

    it("re-tests a moved head whole unless CANDIDATE_RETEST is affected: the plan's outputs are empty then", () => {
        const plan = jobs.pick.steps.find((st) => st.id === "forward");
        assert.equal(
            plan.if,
            "${{ steps.candidate.outputs.run == 'true' && steps.handoff.outputs.handoff != 'true' && steps.candidate.outputs.forward != '' && vars.CANDIDATE_RETEST == 'affected' }}",
        );
        // a skipped plan step: shards "" is ci.yml's whole suite with its screenshots, Hosts and macOS run, and the
        // re-capture reads the CI lane's own capture
        for (const out of ["shards", "hosts", "macos", "capture"]) {
            assert.equal(jobs.pick.outputs[out], `\${{ steps.forward.outputs.${out} }}`, out);
        }
        assert.equal(
            jobs.pick.outputs.source_run,
            "${{ steps.resume.outputs.source_run || steps.forward.outputs.source_run }}",
        );
        assert.equal(
            jobs.ci.if,
            "${{ !cancelled() && needs.pick.result == 'success' && needs.pick.outputs.release == 'true' }}",
        );
        assert.equal(
            jobs.t4.if,
            "${{ !cancelled() && needs.pick.result == 'success' && needs.pick.outputs.release == 'true' }}",
        );
    });

    it("hands the fix's pull request (fix_pr) to the candidate_fix job", () => {
        assert.equal(parseYaml(release).on.workflow_dispatch.inputs.fix_pr.type, "string");
        assert.equal(jobs.candidate_fix.steps.at(-1).env.FIX_PR, "${{ inputs.fix_pr }}");
    });

    it("with CANDIDATE_RETEST=affected, re-tests a moved head only where the fixes reach", () => {
        const plan = jobs.pick.steps.find((st) => st.id === "forward");
        assert.match(plan.run, /node tools\/channel\/candidate-fix.mjs plan/);
        assert.equal(jobs.ci.with.shards, "${{ needs.pick.outputs.shards }}");
        assert.match(jobs.hosts.if, /needs.pick.outputs.hosts != 'false'/);
        assert.match(jobs.autosave_macos.if, /needs.pick.outputs.macos != 'false'/);
        // the re-capture shoots an affected Storybook whole and carries the others over from the run before
        const re = jobs.recapture;
        assert.match(re.env.WHOLE, /contains\(fromJSON\(needs.pick.outputs.capture \|\| '\[\]'\), matrix.project\)/);
        const step = (name) => re.steps.find((st) => st.name === name);
        assert.equal(step("Download the CI lane's capture").if, "${{ needs.pick.outputs.source_run == '' }}");
        const carried = step("Download the final capture of the run that judged the head before");
        assert.deepEqual(
            [carried.if, carried.with["run-id"], carried.with.pattern],
            [
                "${{ env.CARRY == 'true' }}",
                "${{ needs.pick.outputs.source_run }}",
                "visual-final-${{ matrix.project }}-*",
            ],
        );
        assert.match(
            step("Shoot every story").run,
            /--out "\$RUNNER_TEMP\/first\/visual-\$\{PROJECT\}-\$\{GITHUB_RUN_ATTEMPT\}"/,
        );
        assert.equal(step("Plan the re-capture").if, "${{ env.WHOLE != 'true' }}");
    });

    it("reports a moved head's red only on the hold issue: no early red issue", () => {
        for (const lane of ["ci", "t4", "hosts", "autosave_macos", "audit", "llm", "version_dry_run"]) {
            assert.match(jobs[`${lane}_red`].if, /&& needs.pick.outputs.forward == '' \}\}$/, lane);
        }
        assert.equal(
            jobs.verdict.steps.find((st) => st.id === "verdict").env.FORWARD,
            "${{ needs.pick.outputs.forward }}",
        );
    });

    it("assembles the moved head's site with deploy-pages.yml, which then only assembles, and deploys it by name", () => {
        const site = jobs.candidate_site;
        assert.equal(site.uses, "./.github/workflows/deploy-pages.yml");
        assert.deepEqual(site.with, {
            sha: "${{ needs.pick.outputs.sha }}",
            run_id: "${{ format('{0}', github.run_id) }}",
        });
        assert.ok(jobs.verdict.needs.includes("candidate_site"));
        const pages = parseYaml(workflow("deploy-pages.yml"));
        assert.deepEqual(Object.keys(pages.on.workflow_call.inputs), ["sha", "run_id"]);
        assert.equal(pages.jobs.deploy.if, "${{ !inputs.sha }}");
        assert.equal(
            pages.jobs.build.steps.find((st) => st.name === "Record the site in the results store").if,
            "${{ !inputs.sha }}",
        );
        assert.doesNotMatch(workflow("deploy-pages.yml"), /run-id: \$\{\{ github.event.workflow_run.id \}\}/);
        // the site job finds site-<sha> whichever run kept it
        assert.match(job(workflow("nightly-site.yml"), "site"), /actions\/artifacts\?name=site-\$\{SHA\}/);
    });
});

describe("the full run's pick rides out a GitHub 5xx", () => {
    it("tools/release-held.sh find tries a failed issue listing again", () => {
        const dir = mkdtempSync(join(tmpdir(), "release-held-"));
        const count = join(dir, "count");
        writeFileSync(count, "0");
        writeFileSync(
            join(dir, "gh"),
            `#!/bin/bash\nn=$(($(cat "${count}") + 1)); echo "$n" > "${count}"\n[ "$n" -ge 3 ] || { echo "HTTP 502" >&2; exit 1; }\necho 42\n`,
            { mode: 0o755 },
        );
        const out = execFileSync("tools/release-held.sh", ["find"], {
            encoding: "utf8",
            env: {
                ...process.env,
                PATH: `${dir}:${process.env.PATH}`,
                GITHUB_REPOSITORY: "o/r",
                RELEASE_HELD_RETRY_WAIT: "0",
            },
            stdio: ["ignore", "pipe", "ignore"],
        });
        assert.equal(out.trim(), "42");
        assert.equal(readFileSync(count, "utf8").trim(), "3");
    });
    it("retries the pick's other GitHub reads", () => {
        const pick = job(workflow("release.yml"), "pick");
        assert.match(pick, /for number in \$\(retry gh pr list /);
        assert.match(pick, /tested=\$\(retry gh run list /);
        assert.match(pick, /build=\$\(retry gh run list /);
        assert.equal(pick.match(/^\s+retry\(\) \{ "\$@" \|\| /gm).length, 2);
    });
});

describe("the package builds release.yml keeps and publishes", () => {
    const release = workflow("release.yml");
    const env = parseYaml(release).env;
    it("are one list, exactly ci.yml's build-<package> uploads, used by every job that downloads builds", () => {
        const uploaded = [...workflow("ci.yml").matchAll(/name: build-([a-z-]+)\n\s+path: \1\/dist\//g)].map(
            (m) => m[1],
        );
        const listed = /^build-\{([a-z,-]+)\}$/.exec(env.PACKAGE_BUILDS)[1].split(",");
        assert.deepEqual([...listed].sort(), [...new Set(uploaded)].sort());
        assert.ok(listed.includes("babylonjs-map"));
        // keep_builds (a held candidate promoted after approval) and version (every promotion)
        assert.equal(release.match(/pattern: \$\{\{ env.PACKAGE_BUILDS \}\}/g)?.length, 2);
        assert.doesNotMatch(release, /pattern: "build-\{/, "no second, hand-kept list");
    });
});

describe("the release policy files release.yml reads", () => {
    it("are master's, from a checkout that has origin/master, whatever commit the job versions", () => {
        const release = workflow("release.yml");
        assert.equal(parseYaml(release).env.RELEASE_POLICY_REF, "refs/remotes/origin/master");
        const jobs = parseYaml(release).jobs;
        for (const [name, j] of Object.entries(jobs)) {
            const runs = (j.steps ?? []).map((st) => st.run ?? "").join("\n");
            if (!/release-version\.sh|release-hold\.mjs|release-approvals\.mjs/.test(runs)) continue;
            const checkout = j.steps.find((st) => String(st.uses ?? "").startsWith("actions/checkout@"));
            assert.equal(checkout?.with?.["fetch-depth"], 0, `${name} needs origin/master to read the policy`);
        }
    });
});

describe("the Checks job's CI workflow tests run their files side by side", () => {
    it("runs every listed file at once, prints each file's output whole and in list order, and names the failures", () => {
        const dir = mkdtempSync(join(tmpdir(), "ci-workflow-tests-"));
        try {
            mkdirSync(join(dir, "tools"));
            copyFileSync(
                new URL("run-ci-workflow-tests.mjs", import.meta.url),
                join(dir, "tools/run-ci-workflow-tests.mjs"),
            );
            // "slow" finishes last but is listed first; "bad" fails; "a.mjs" is listed twice (a union merge)
            const slow = 'console.log("slow-1"); setTimeout(() => console.log("slow-2"), 300);';
            writeFileSync(join(dir, "tools/slow.mjs"), slow);
            writeFileSync(join(dir, "tools/a.mjs"), 'console.log("a-1"); console.log("a-2");');
            writeFileSync(join(dir, "tools/bad.mjs"), 'console.log("bad-1"); process.exit(3);');
            writeFileSync(
                join(dir, "tools/tool-tests.txt"),
                "tools/slow.mjs\ntools/a.mjs\n# note\ntools/bad.mjs\ntools/a.mjs\n",
            );
            const r = spawnSync(process.execPath, [join(dir, "tools/run-ci-workflow-tests.mjs")], {
                encoding: "utf8",
                env: { ...process.env, CI_WORKFLOW_TESTS_JOBS: "3" },
            });
            assert.equal(r.status, 1);
            assert.match(r.stdout, /^slow-1\nslow-2\na-1\na-2\nbad-1\n/);
            assert.match(r.stdout, /2 of 3 test files passed/);
            assert.match(r.stdout, /failed:\n {2}tools\/bad\.mjs \(exit 3\)/);
        } finally {
            rmSync(dir, { recursive: true, force: true });
        }
    });

    it("still prints the summary and the failure list after a file printed megabytes, through a pipe (#4187)", () => {
        // process.exit() drops whatever a pipe has not taken yet: the Checks log ended mid-file with no "failed:"
        const dir = mkdtempSync(join(tmpdir(), "ci-workflow-tests-"));
        try {
            mkdirSync(join(dir, "tools"));
            copyFileSync(
                new URL("run-ci-workflow-tests.mjs", import.meta.url),
                join(dir, "tools/run-ci-workflow-tests.mjs"),
            );
            writeFileSync(
                join(dir, "tools/loud.mjs"),
                'process.stdout.write("x".repeat(4 * 1024 * 1024) + "\\n"); process.exitCode = 2;',
            );
            writeFileSync(join(dir, "tools/tool-tests.txt"), "tools/loud.mjs\n");
            const r = spawnSync(process.execPath, [join(dir, "tools/run-ci-workflow-tests.mjs")], {
                encoding: "utf8",
                maxBuffer: 64 * 1024 * 1024,
            });
            assert.equal(r.status, 1);
            assert.match(r.stdout, /0 of 1 test files passed\nfailed:\n {2}tools\/loud\.mjs \(exit 2\)\n$/);
        } finally {
            rmSync(dir, { recursive: true, force: true });
        }
    });
});

describe("release.yml's job conditions under a skipped ancestor", () => {
    it("gives every job below a job that can be skipped a status function, so a skipped candidate_fix skips nothing (#4130)", () => {
        // GitHub's implicit success() looks at the whole needs chain: one skipped ancestor (candidate_fix outside full,
        // restart and candidate) skips every job below it whose if has no !cancelled() or always()
        const { jobs } = parseYaml(workflow("release.yml"));
        const needs = (name) => [jobs[name].needs ?? []].flat();
        const ancestors = (name, seen = new Set()) => {
            for (const n of needs(name)) if (!seen.has(n)) ancestors(n, seen.add(n));
            return seen;
        };
        const skippable = (name) => jobs[name].if !== undefined && !/always\(\)/.test(String(jobs[name].if));
        const missing = Object.keys(jobs).filter(
            (name) =>
                [...ancestors(name)].some(skippable) && !/!cancelled\(\)|always\(\)/.test(String(jobs[name].if ?? "")),
        );
        assert.deepEqual(missing, []);
    });
});

describe("a full run never tests a candidate with another commit's workflow files (#4522)", () => {
    // run 40926721806: dispatched on fb592ce, whose ci.yml added a Checks step and its package.json script, it tested
    // the older a4c81c3 with that ci.yml and failed on ERR_PNPM_NO_SCRIPT. When the candidate cannot be handed to
    // channel/full-run, the run's own commit is tested in its place.
    const pick = parseYaml(workflow("release.yml")).jobs.pick;
    const step = pick.steps.find((s) => s.id === "handoff");
    const dir = mkdtempSync(join(tmpdir(), "handoff-skew-"));
    // An empty global config (as the other scratch repositories here): no signing is configured, so none is
    // switched off.
    const env = { ...process.env, GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1" };
    const git = (...a) =>
        execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@t", ...a], {
            cwd: dir,
            encoding: "utf8",
            env,
        }).trim();
    const commit = (path, text) => {
        mkdirSync(join(dir, path, ".."), { recursive: true });
        writeFileSync(join(dir, path), text);
        git("add", "-A");
        git("commit", "-q", "-m", path);
        return git("rev-parse", "HEAD");
    };
    git("init", "-q", "-b", "master");
    const old = commit(".github/workflows/release.yml", "no hand-off yet\n");
    const later = commit("src.js", "1");
    const head = commit(".github/workflows/ci.yml", "a new Checks step\n");
    const run = ({ sha, held = "", allowed = "false", top = head }) => {
        writeFileSync(join(dir, "gh"), `#!/bin/bash\necho ${allowed}\n`, { mode: 0o755 });
        const out = join(dir, "out.txt");
        writeFileSync(out, "");
        const r = spawnSync("bash", ["-c", step.run], {
            cwd: dir,
            encoding: "utf8",
            env: {
                ...process.env,
                PATH: `${dir}:${process.env.PATH}`,
                SHA: sha,
                HELD: held,
                GITHUB_SHA: top,
                GITHUB_REPOSITORY: "o/r",
                GITHUB_OUTPUT: out,
            },
        });
        assert.equal(r.status, 0, r.stderr);
        return Object.fromEntries(
            readFileSync(out, "utf8")
                .split("\n")
                .filter(Boolean)
                .map((l) => l.split("=")),
        );
    };

    it("tests the run's own commit, with its site assembled, when the candidate's workflows differ", () => {
        assert.deepEqual(run({ sha: old }), { sha: head, site: "build" });
        assert.deepEqual(run({ sha: later }), { sha: head, site: "build" });
    });

    it("keeps a candidate whose workflows are this run's, the held head, and this commit itself", () => {
        commit(".github/workflows/release.yml", "refs/heads/channel/full-run\n");
        const same = commit("src.js", "2");
        commit("tools/x.mjs", "3"); // not a workflow file: the candidate shares the run's workflows
        assert.deepEqual(run({ sha: same, top: git("rev-parse", "HEAD") }), {});
        assert.deepEqual(run({ sha: old, held: old }), {}, "the hold exists to test exactly that commit");
        assert.deepEqual(run({ sha: head }), {});
    });

    it("hands a candidate with the hand-off off as before, and the outputs carry the swap", () => {
        const handed = commit(".github/workflows/release.yml", "refs/heads/channel/full-run\nnewer\n");
        commit(".github/workflows/ci.yml", "another step\n");
        assert.deepEqual(run({ sha: handed, allowed: "true" }), { handoff: "true", release: "false" });
        assert.match(pick.outputs.sha, /steps\.handoff\.outputs\.sha \|\| steps\.candidate\.outputs\.sha/);
        assert.equal(
            pick.outputs.build_run,
            "${{ steps.handoff.outputs.sha == '' && steps.candidate.outputs.build_run || '' }}",
        );
        assert.equal(pick.outputs.site, "${{ steps.handoff.outputs.site }}");
        assert.match(
            parseYaml(workflow("release.yml")).jobs.candidate_site.if,
            /needs\.pick\.outputs\.site == 'build'/,
        );
    });
});
