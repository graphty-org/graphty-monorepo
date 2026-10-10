// Tests of the CI shape: the test matrix's shard groups (tools/ci-test-matrix.mjs), the parts of
// ci.yml and pr-title.yml that decide what a draft, a pull request and a merge-queue run do, the
// release train (release.yml, tools/release-diff.mjs, deploy-pages.yml, .mergify.yml's release
// rule), the record tools/pr-status-broker.mjs writes for agents, the local commit and push hooks
// (.husky/pre-commit, tools/format-staged.sh, tools/prepush.sh), and the warning period of new
// required checks (tools/ci-advisory-checks.json).
//
//   node tools/ci-workflows.test.mjs   (pnpm run test:ci-workflows)
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
    copyFileSync,
    existsSync,
    mkdirSync,
    mkdtempSync,
    readdirSync,
    readFileSync,
    rmSync,
    writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import { GROUPS, groupEntry, plan, SHARDS } from "./ci-test-matrix.mjs";
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
import { gateShards, localShards, shardEnv, startRule } from "./prepush-tests.mjs";
import { strayChanges } from "./release-diff.mjs";
import { changedFiles, skippedProjects } from "./visual-capture-plan.mjs";

// Every git process below (and in the scripts the hook tests run) runs without the developer's own
// config: a commit there must never reach their signing key.
isolateGit();

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
    it("runs every shard exactly once on a full run, in 16 jobs", () => {
        const include = plan(PACKAGES);
        const ran = include.flatMap((e) => (e.shard in GROUPS ? GROUPS[e.shard] : [e.shard]));
        assert.deepEqual([...ran].sort(), SHARDS.map((s) => s.shard).sort());
        assert.equal(include.length, 16);
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

    it("tests through tools/prepush-tests.mjs only, on CI's affected set", () => {
        const prepush = code(tool("prepush.sh"));
        assert.match(prepush, /nx show projects --affected --base="\$BASE" --head=HEAD --json/);
        assert.match(
            prepush,
            /run_step "[^"]+" \\\n\s+"timeout --foreground --kill-after=60s '\$\{PREPUSH_TESTS_TIMEOUT:-90m\}' node tools\/prepush-tests.mjs '\$PROJECTS' '\$\{BASE:-\}'"/,
        );
        // No test command of its own, which could drift from CI's -- but the NVIDIA run, which CI has none of.
        const nvidia = /\n {4}run_step "webgpu-graph-algorithms on the local NVIDIA GPU" \\\n.*\n/;
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
                ...[1, 2, 3, 4].map((n) => `graphty-element-storybook-${n}`),
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
            assert.deepEqual(gateShards(element, null, null), element);
            const never = { ...element[0], local: "never" };
            assert.deepEqual(gateShards([never, element[1]], null, null), [element[1]]);
        });
    });

    it("runs each shard in CI's environment, moving only where a shared package writes its coverage", () => {
        assert.match(code(tool("run-tests.sh")), /\n\s+export CI=true\n/);
        // The runner's fonts, which visual-fonts/ is a snapshot of: this machine has no emoji font.
        assert.match(code(tool("run-tests.sh")), /export FONTCONFIG_FILE="\$ROOT\/visual-fonts\/fonts.conf"/);
        assert.match(code(tool("prepush-tests.mjs")), /"bash", "tools\/run-tests.sh", shard.shard/);
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
                shared.length > 1 ? { COVERAGE_DIR: `.coverage-parts/${s.shard}` } : {},
                s.shard,
            );
        }
    });

    it("ends non-zero when a shard fails, even after its log stream ended and while another shard runs", () => {
        // A copy of the runner beside a fake matrix and a fake run-tests.sh, in a throwaway repository:
        // "broken" closes its output (so the log stream has finished) and then fails; "slow" is still
        // running then and is stopped. The stopped shard closing last must still end the stage.
        const dir = mkdtempSync(join(tmpdir(), "prepush-tests-"));
        try {
            mkdirSync(join(dir, "tools"));
            copyFileSync(new URL("./prepush-tests.mjs", import.meta.url), join(dir, "tools/prepush-tests.mjs"));
            // The runner wraps every shard in the machine-wide test slot (it imports only node builtins).
            copyFileSync(new URL("./test-slots.mjs", import.meta.url), join(dir, "tools/test-slots.mjs"));
            copyFileSync(new URL("./prepush-inputs.mjs", import.meta.url), join(dir, "tools/prepush-inputs.mjs"));
            const shard = (name) => ({ shard: name, package: name, "test-command": "true", "needs-browser": false });
            writeFileSync(
                join(dir, "tools/ci-test-matrix.mjs"),
                `export const SHARDS = ${JSON.stringify([shard("broken"), shard("slow")])};\n`,
            );
            writeFileSync(
                join(dir, "tools/run-tests.sh"),
                'if [ "$1" = broken ]; then echo broken output; exec >&- 2>&-; sleep 1; exit 1; fi\nexec sleep 60\n',
            );
            assert.equal(spawnSync("git", ["init", "-q"], { cwd: dir }).status, 0);
            const run = spawnSync(process.execPath, ["tools/prepush-tests.mjs", '["broken","slow"]'], {
                cwd: dir,
                encoding: "utf8",
                timeout: 60_000,
                // Its own slot directory, with a slot per shard: never waits on, or holds up, the real slots.
                env: {
                    ...process.env,
                    GRAPHTY_TEST_SLOTS_DIR: join(dir, "tmp/test-slots"),
                    GRAPHTY_TEST_SLOTS: "2",
                    GRAPHTY_TEST_SLOT_HELD: "",
                },
            });
            assert.match(run.stdout, /\[FAIL\] broken \(exit 1/);
            assert.match(run.stdout, /Stopped after broken failed/);
            assert.equal(run.status, 1, run.stdout + run.stderr);
        } finally {
            rmSync(dir, { recursive: true, force: true });
        }
    });

    it("warms each package's caches one family at a time before the rest of the package starts", () => {
        const shards = localShards(["graphty-element", "layout"]);
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
        ]);
        // While one warm-up of graphty-element runs, no other shard of graphty-element may start.
        assert.deepEqual(startable([pick("graphty-element-browser-1")], []), ["layout"]);
        // A warmed family's siblings still wait for the package's other families.
        const afterBrowser = startable([], ["graphty-element-browser"]);
        assert.ok(!afterBrowser.includes("graphty-element-browser-3"));
        assert.ok(afterBrowser.includes("graphty-element-storybook-1"));
        const all = ["graphty-element-browser", "graphty-element-storybook", "graphty-element-default"];
        assert.equal(startable([pick("graphty-element-browser-1")], all).length, shards.length - 1);
    });

    it("runs webgpu-graph-algorithms on the local NVIDIA GPU after the CI shards, requiring nvidia", () => {
        const prepush = code(tool("prepush.sh"));
        const tests = prepush.indexOf("node tools/prepush-tests.mjs");
        const gpu = prepush.indexOf('run_step "webgpu-graph-algorithms on the local NVIDIA GPU"');
        assert.ok(tests > 0 && gpu > tests, "after the Tests step");
        assert.match(
            prepush,
            /\nif affected webgpu-graph-algorithms; then\n[\s\S]*?GRAPHTY_EGL_LIB_DIR[\s\S]*?LD_LIBRARY_PATH='\$EGL_LIB_DIR[^']*' GRAPHTY_GPU_REQUIRE=nvidia npm run test:run\)"\nfi/,
        );
        assert.doesNotMatch(prepush, /GRAPHTY_GPU_REQUIRE=any npm run test:run/);
    });

    it("bounds the screenshot capture and stops it, unpromoted, when the gate stops early", () => {
        const prepush = code(tool("prepush.sh"));
        assert.match(
            prepush,
            /setsid env VISUAL_PREVIEW_TIMEOUT="\$\{PREPUSH_SCREENSHOTS_TIMEOUT:-45m\}" \.\/tools\/visual-preview.sh --head "\$PUSH_HEAD" /,
        );
        assert.match(prepush, /if wait "\$SCREENSHOTS_PGID"; then[\s\S]*?else[\s\S]*?FAILED=1\n/);
        assert.match(
            prepush,
            /\.\/tools\/visual-preview.sh --promote "\$PUSH_HEAD" && SCREENSHOTS_STAGED=0\n\s+echo -e "\$\{GREEN\}All pre-push checks passed/,
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
            const script = `cd ${dir}\nPUSH_HEAD=abc\n${fn}\ntrap cleanup EXIT\nsetsid bash -c 'timeout 300 sleep 300 & echo $! > ${dir}/inner; wait' &\nSCREENSHOTS_PGID=$!\nuntil [ "$(ps -o pgid= -p $SCREENSHOTS_PGID | tr -d " ")" = $SCREENSHOTS_PGID ] && [ -s ${dir}/inner ]; do sleep 0.05; done\nSCREENSHOTS_STAGED=1\necho $SCREENSHOTS_PGID > ${dir}/pid\nexit 1\n`;
            const r = spawnSync("bash", ["-c", script], { encoding: "utf8", timeout: 20_000 });
            assert.equal(r.status, 1);
            const pid = Number(readFileSync(join(dir, "pid"), "utf8"));
            assert.throws(() => process.kill(pid, 0), "the capture's process group was killed");
            // timeout runs its command in a process group of its own; the session kill reaches it.
            const inner = readFileSync(join(dir, "inner"), "utf8").trim();
            const gone = spawnSync("bash", ["-c", `while kill -0 ${inner} 2>/dev/null; do sleep 0.05; done`], {
                timeout: 20_000,
            });
            assert.equal(gone.status, 0, "the capture's time-limited step was killed too");
            assert.equal(readFileSync(join(dir, "called"), "utf8"), "--discard abc\n");
        } finally {
            rmSync(dir, { recursive: true, force: true });
        }
    });

    describe("tools/visual-preview.sh --head, against a throwaway repository", () => {
        const realGit = spawnSync("bash", ["-c", "command -v git"], { encoding: "utf8" }).stdout.trim();
        // Stubs for everything outside git: gh finds no pull request; pnpm installs nothing and says
        // project p is affected; node's capture writes a results.json with the story status asked for;
        // git passes through, except `lfs` and a forced merge-tree exit code.
        const STUBS = {
            gh: "#!/bin/sh\nexit 0\n",
            pnpm: '#!/bin/sh\ncase "$*" in *"show projects"*) echo \'["p"]\';; esac\n',
            node: `#!/bin/bash
if [ "$2" = capture ]; then
    [ -n "$STUB_HANG" ] && exec sleep 300
    while [ $# -gt 0 ]; do [ "$1" = --out ] && out="$2"; shift; done
    mkdir -p "$out"
    printf '{"complete":true,"items":[{"file":"s.png","status":"%s","reason":"r"}]}' "$STUB_STATUS" > "$out/results.json"
fi
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
        const sandbox = (fn) => {
            const t = mkdtempSync(join(tmpdir(), "visual-preview-"));
            const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith("GIT_")));
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
                        timeout: 60_000,
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
                fn({ run, head, origin, main, local: join(main, "tmp/visual-review/local") });
            } finally {
                rmSync(t, { recursive: true, force: true });
            }
        };

        it("stages a capture with changed images, passes, and promotes or discards it on request", () => {
            sandbox(({ run, head, local }) => {
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

        it("does not count the wait for a browser slot against its limit, but times out a stuck capture", () => {
            sandbox(({ run, head, main, local }) => {
                // The browser cap, held by someone else for longer than the whole limit (#1820).
                mkdirSync(join(main, "tmp"), { recursive: true });
                writeFileSync(join(main, "tmp/with-browser.sh"), '#!/bin/sh\nsleep "$STUB_SLOT_WAIT"\nexec "$@"\n', {
                    mode: 0o755,
                });
                const waited = run(
                    { STUB_STATUS: "changed", VISUAL_PREVIEW_TIMEOUT: "10s", STUB_SLOT_WAIT: "11" },
                    "--head",
                    head,
                );
                assert.equal(waited.status, 0, waited.stdout + waited.stderr);
                assert.match(waited.stdout, /p: waiting for a browser slot \(not counted against 10s\)/);
                assert.match(waited.stdout, /p: capturing \(\d+s left\)/);

                // A capture that holds its slot and never finishes still fails, once its limit is spent.
                const stuck = run(
                    { STUB_HANG: "1", VISUAL_PREVIEW_TIMEOUT: "2s", STUB_SLOT_WAIT: "0" },
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

        it("fails on a story that failed to render", () => {
            sandbox(({ run, head }) => {
                const r = run({ STUB_STATUS: "failed" }, "--head", head);
                assert.equal(r.status, 1);
                assert.match(r.stderr, /stories failed to capture/);
            });
        });

        it("retries a fetch that lost a ref-lock race with another fetch (#1548)", () => {
            sandbox(({ run, head }) => {
                const r = run({ STUB_STATUS: "changed", STUB_FETCH_LOCKED: "2" }, "--head", head);
                assert.equal(r.status, 0, r.stdout + r.stderr);
            });
        });

        it("fails a fetch that keeps failing with git's own message", () => {
            sandbox(({ run, head, local, origin }) => {
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
            sandbox(({ run, head, local }) => {
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
        assert.equal(commands[0], './tools/lfs-pre-push.sh "$@" || exit 1');
    });
});

describe("ci.yml", () => {
    const ci = workflow("ci.yml");

    it("starts a run when a draft is marked ready, and skips drafts except the merge queue's", () => {
        assert.match(ci, /types: \[opened, synchronize, reopened, ready_for_review\]/);
        assert.ok(
            job(ci, "packages").includes(
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
            "    group: ci-${{ github.event.pull_request.number || inputs.ref && format('release-{0}', inputs.ref) || github.sha }}-" +
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
        const step = job(ci, "packages");
        assert.match(step, /"\$EVENT" == "pull_request" && "\$MERGE_QUEUE" != "true"/);
        assert.match(step, /if: steps.plan.outputs.full == 'true'\n\s+run: pnpm exec nx run-many -t build/);
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
        const queue = job(ci, "queue-checks");
        assert.match(queue, /name: Queue Checks Pass/);
        assert.match(queue, /"\$ALL_CHECKS" != "success"/);
        assert.match(queue, /"\$MERGE_QUEUE" == "true" && "\$FULL" != "true"/);
    });

    it("gates every pull request that affects graphty-element on the cost estimates", () => {
        assert.match(
            job(ci, "cost-accuracy"),
            /if: contains\(fromJSON\(needs.packages.outputs.affected\), 'graphty-element'\)/,
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
            /if \[\[ "\$EVENT" == "push" \]\]; then\n.*\n\s+\{ echo "full=true"; echo "light=true"; \} >> "\$GITHUB_OUTPUT"\n\s+affected='\[\]'\n/,
        );
        assert.equal(plan([]).length, 0, "an empty affected list runs no shard");
        assert.match(job(ci, "test"), /if: needs.packages.outputs.test-count != '0'\n/);
        assert.match(
            job(ci, "cost-accuracy"),
            /if: contains\(fromJSON\(needs.packages.outputs.affected\), 'graphty-element'\)/,
        );
        for (const name of ["links", "visual"]) {
            assert.match(
                job(ci, name),
                /\n {8}if: needs.build.outputs.light != 'true'\n/,
                `${name} is skipped on master`,
            );
        }
        // the benchmarks need the test job, so they are skipped with it
        assert.match(job(ci, "performance"), /needs: test\n/);
        assert.match(job(ci, "checks"), /- name: CI workflow tests\n\s+if: needs.packages.outputs.light != 'true'\n/);
        // the build still runs, every project, with the uploads deploy-pages.yml reads
        assert.match(build, /if: steps.plan.outputs.full == 'true'\n\s+run: pnpm exec nx run-many -t build/);
        assert.match(job(ci, "docs"), /name: build-docs\n/);
        assert.match(job(ci, "build"), /name: build-storybook-element\n/);
        for (const name of ["build", "lint", "checks", "docs"]) {
            assert.match(job(ci, name), /\n {8}needs: packages\n {8}runs-on:/, `${name} runs on master too`);
        }
        // the summary checks pass a light run whose skipped jobs were skipped on purpose, and the build
        // jobs must succeed
        assert.match(job(ci, "all-checks"), /LIGHT: \$\{\{ needs.packages.outputs.light \}\}/);
        assert.match(
            job(ci, "all-checks"),
            /\(\(.key \| IN\("packages", "build", "lint", "checks", "docs"\)\) and \$r != "success"\)/,
        );
        assert.match(job(ci, "queue-checks"), /"\$ALL_CHECKS" != "success"/);
    });

    it("still runs every test job on pull requests, merge-queue runs, dispatches and the release train", () => {
        const build = job(ci, "packages");
        // light is set only on a push; every other event takes the affected (pull request) or full path
        assert.equal(build.match(/echo "light=true"/g).length, 1);
        assert.match(build, /elif \[\[ "\$EVENT" == "pull_request" && "\$MERGE_QUEUE" != "true" \]\]; then/);
        assert.equal(plan(PACKAGES).length, 16, "a full run is every shard");
        // no test-type job is limited to pushes or to master
        for (const name of ["test", "links", "visual", "cost-accuracy", "performance", "lint", "checks", "docs"]) {
            assert.doesNotMatch(job(ci, name), /event_name == 'push'|refs\/heads\/master/, name);
        }
        assert.match(job(ci, "performance"), /if: github.event_name != 'pull_request'\n/);
    });

    it("can be called by the release train on its candidate, and checks out that commit in every job", () => {
        assert.match(ci, /workflow_call:\n\s+inputs:\n\s+ref:\n(?:.*\n){1,2}\s+type: string\n\s+required: true/);
        const checkouts = ci.match(/- uses: actions\/checkout@v4\n(?:\s+.*\n){0,3}/g);
        assert.ok(checkouts.length >= 10);
        for (const c of checkouts) {
            assert.match(c, /ref: \$\{\{ inputs.ref \}\}/, c);
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

// The (job, step) pairs that can fail "All Checks Pass" or "Queue Checks Pass": every step of every job
// in their `needs` closure, less a job or step marked `continue-on-error: true`, as { job: [step names] }.
const requiredChecks = (jobs) => {
    const closure = new Set();
    const visit = (name) => {
        if (closure.has(name) || !jobs[name]) return;
        closure.add(name);
        for (const need of jobs[name].needs) visit(need);
    };
    visit("all-checks");
    visit("queue-checks");
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
    for (const job of registry.required) {
        check(job in checks, `${job}: in "required" but not a required job of ci.yml`);
        if (baseRegistry && !baseRegistry.required.includes(job))
            check(
                job in baseChecks || (job in checks && checks[job].every((step) => baseSteps.has(step))),
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

describe("new required checks start as warnings", () => {
    const ci = workflow("ci.yml");
    const registry = JSON.parse(readFileSync(new URL("ci-advisory-checks.json", import.meta.url), "utf8"));

    it("finds the required jobs and steps", () => {
        const checks = requiredChecks(parseJobs(ci));
        assert.ok(checks.packages.includes("Install dependencies"));
        assert.ok(checks.lint.includes("Lint all (master, a manual dispatch or the merge queue)"));
        assert.ok(checks["all-checks"].includes("Check visual changes were accepted"));
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
    // The jobs "All Checks Pass" fails on: every job it needs but the opt-in Chromatic jobs and the
    // visual job, whose results the gate step judges at the end.
    const deciding = jobs["all-checks"].needs.filter((n) => !n.startsWith("chromatic-") && n !== "visual");

    it("ends every job whose failure fails them with the early-verdict step, on pull requests only", () => {
        assert.deepEqual([...deciding].sort(), [
            "build",
            "checks",
            "cost-accuracy",
            "docs",
            "links",
            "lint",
            "packages",
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
        assert.match(action, /for check in "All Checks Pass" "Queue Checks Pass"; do/);
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

    it("captures everything when off, in the queue or on master, after a dequeue, or with a root file changed", () => {
        assert.deepEqual(skippedProjects({ ...base, on: false }), []);
        assert.deepEqual(skippedProjects({ ...base, pullRequest: false }), []);
        assert.deepEqual(skippedProjects({ ...base, labels: ["queued", "dequeued"] }), []);
        assert.deepEqual(skippedProjects({ ...base, changed: [] }), []);
        for (const root of [
            "pnpm-lock.yaml",
            ".github/workflows/ci.yml",
            "visual-baselines/layout/a.png",
            "visual-fonts/fonts.conf",
            "design/x.md",
        ]) {
            assert.deepEqual(skippedProjects({ ...base, changed: ["graph-io/src/index.ts", root] }), [], root);
        }
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

    it("is switched off in ci.yml until master's gate accepts the not-affected marker", () => {
        const build = job(ci, "packages");
        assert.match(build, /\n {18}SKIP_UNAFFECTED_CAPTURES: "false"\n/);
        assert.match(build, /LABELS: \$\{\{ toJSON\(github\.event\.pull_request\.labels\.\*\.name\) \}\}/);
        assert.match(build, /node tools\/visual-capture-plan\.mjs "\$all" "\$affected" \| tee -a "\$GITHUB_OUTPUT"/);
        assert.match(build, /visual-skip: \$\{\{ steps\.plan\.outputs\.visual-skip \}\}/);
        // the visual job needs build (the Storybooks), which hands the plan on
        assert.match(job(ci, "build"), /visual-skip: \$\{\{ needs\.packages\.outputs\.visual-skip \}\}/);
    });

    it("writes the marker in place of a capture and skips every other step but the upload and the summary", () => {
        const visual = job(ci, "visual");
        const steps = visual.split(/\n(?= {12}- (?:name|uses): )/).slice(1);
        assert.match(steps[0], /- name: Skip a Storybook this pull request cannot affect\n {14}id: skip\n/);
        assert.match(
            steps[0],
            /contains\(fromJSON\(needs\.build\.outputs\.visual-skip \|\| '\[\]'\), matrix\.project\)/,
        );
        assert.match(steps[0], /\{"skipped":"not affected","project":"%s"\}/);
        for (const step of steps.slice(1)) {
            const title = step.trim().split("\n")[0];
            if (/Upload captures|Write the counts/.test(title)) {
                assert.match(step, /if: always\(\)/, title);
            } else {
                assert.match(step, /\n {14}if: .*steps\.skip\.outputs\.skip != 'true'\n/, title);
            }
        }
    });

    it("writes the marker the trusted gate reads", async () => {
        const { isSkipMarker, SKIPPED_FILE } = await import("../visual-review/trusted/lib/results.mjs");
        const visual = job(ci, "visual");
        assert.ok(visual.includes(`"$RUNNER_TEMP/visual/${SKIPPED_FILE}"`));
        const printf = /printf '(.+?)\\n' "\$PROJECT"/.exec(visual)[1];
        assert.ok(isSkipMarker(JSON.parse(printf.replace("%s", "layout")), "layout"));
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
    it("skips Dependabot and the release train, and only those", () => {
        assert.ok(skipReason({ headRef: "dependabot/npm/x", author: "dependabot[bot]", sameRepo: true }));
        assert.ok(skipReason({ headRef: "release/train-1", author: "github-actions[bot]", sameRepo: true }));
        assert.equal(skipReason({ headRef: "release/train-1", author: "someone", sameRepo: true }), null);
        assert.equal(skipReason({ headRef: "release/train-1", author: "github-actions[bot]", sameRepo: false }), null);
        assert.equal(skipReason({ headRef: "fix/x", author: "someone", sameRepo: true }), null);
    });
    it("skips the whole job for Mergify's own merge-queue draft, and re-runs on a description edit", () => {
        const wf = workflow("pr-issue-link.yml");
        assert.ok(wf.includes(`        name: Link PR Issue\n`));
        assert.ok(wf.includes(`\n        if: \${{ !(${QUEUE}) }}\n        runs-on: ubuntu-24.04\n`));
        assert.match(wf, /types: \[opened, edited, synchronize, reopened\]/);
        assert.doesNotMatch(wf, /^concurrency:/m);
        assert.match(wf, /PR_BODY: \$\{\{ github\.event\.pull_request\.body \}\}\n/);
    });
    it("fails with the message that says what to add, and a failing one blocks Mergify", () => {
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
        const mergify = readFileSync(new URL("../.mergify.yml", import.meta.url), "utf8");
        assert.match(mergify, /- -check-failure=Link PR Issue\n/);
        assert.doesNotMatch(mergify, /check-success=Link PR Issue/);
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
    it("merges every pull request, the release one included, with its own merge commit", () => {
        // Never merge-batch: marking the batch's draft ready starts a second CI run on the same commit, and the
        // ruleset waits on its unfinished "All Checks Pass" until Mergify dequeues the batch. The release rule
        // must stay merge, because release.yml's publish job finds the release by the branch its merge commit names.
        const mergify = readFileSync(new URL("../.mergify.yml", import.meta.url), "utf8");
        const queues = mergify.slice(mergify.indexOf("queue_rules:"));
        const release = queues.slice(queues.indexOf("- name: release"), queues.indexOf("- name: default"));
        const batch = queues.slice(queues.indexOf("- name: default"));
        // the rule that matches the train's branch and author is the one that merges with a plain merge commit
        assert.match(release, /^\s+- head~=\^release\/train-$/m);
        assert.match(release, /^\s+- author=github-actions\[bot\]$/m);
        assert.match(release, /^\s+merge_method: merge(\s+#.*)?$/m);
        assert.match(batch, /^\s+merge_method: merge$/m);
        assert.doesNotMatch(mergify, /^\s+merge_method: merge-batch/m);
    });

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
        // the T4 tests the commit the train selected, not the train's own checkout
        assert.match(
            job(gpu, "test-gpu"),
            /- uses: actions\/checkout@v4\n {14}with: \{ ref: "\$\{\{ inputs.ref \}\}" \}/,
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

describe("the re-run of a T4 run whose spot runner was lost", () => {
    const rerun = workflow("gpu-rerun-on-runner-loss.yml");
    const held = job(workflow("release.yml"), "held");

    it("watches every run that holds a T4 job: a GPU dispatch, the release train's Release run, the weekly benchmark", () => {
        // a workflow_call's jobs belong to the CALLER's run, so the train's T4 is seen only through "Release"
        assert.match(rerun, /workflows: \["GPU", "Release", "GPU weekly paired benchmark"\]\n\s+types: \[completed\]/);
        assert.match(workflow("release.yml"), /^name: Release\n/);
        assert.match(workflow("gpu.yml"), /^name: GPU\n/m);
        assert.match(workflow("gpu-weekly-paired.yml"), /^name: GPU weekly paired benchmark\n/m);
    });

    it("re-runs only a failed first attempt, only its failed jobs, and only when tools/gpu-runner-lost.sh says so", () => {
        assert.match(
            rerun,
            /if: github.event.workflow_run.conclusion == 'failure' && github.event.workflow_run.run_attempt == 1\n/,
        );
        assert.match(rerun, /if tools\/gpu-runner-lost.sh "\$RUN" 1; then\n[^\n]*\n\s+gh run rerun "\$RUN" --failed /);
        assert.equal(rerun.match(/gh run rerun/g).length, 1);
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
            /- name: Announce the held release\n\s+if: \$\{\{ always\(\) && steps.hold.outputs.reclaimed != 'true' \}\}/,
        );
        assert.ok(skip < held.indexOf("tools/release-held.sh open"), "before the issue is opened");
        // the train still requires a green T4: the re-run attempt must pass it
        assert.match(job(workflow("release.yml"), "train"), /needs.t4.result == 'success'/);
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
        // a push to master runs no tests: the release train runs Hosts on its candidate instead
        assert.doesNotMatch(hosts.slice(0, hosts.indexOf("\njobs:")), /^ {4}push:/m);
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
        // Hosts runs on master only as the nightly: a push to master runs no Hosts
        assert.equal(decide(run("Hosts", "failure", "schedule")), "hardware-red");
        assert.equal(decide(run("Hosts", "failure")), "none");
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
    const llm = job(release, "llm");
    const coverage = job(release, "coverage");
    const held = job(release, "held");
    const train = job(release, "train");
    const publish = job(release, "publish");

    it("never pushes to master and holds no deploy key", () => {
        assert.doesNotMatch(release, /RELEASE_DEPLOY_KEY|ssh-key/);
        const pushes = release.match(/git push[^\n]*/g);
        assert.deepEqual(pushes, ['git push origin "${COMMIT}:refs/heads/${branch}"']);
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
        assert.match(pick, /if: \$\{\{ github.event_name != 'push' && github.ref == 'refs\/heads\/master' && /);
        // the run's own commit (the pushed commit for a restart), so the run, Coveralls and the lanes all name
        // the tested commit
        assert.match(pick, /CANDIDATE: \$\{\{ github.event.workflow_run.head_sha \|\| github.sha \}\}/);
        assert.match(pick, /ref: \$\{\{ github.event.workflow_run.head_sha \|\| github.sha \}\}/);
        assert.match(pick, /echo "sha=\$\{CANDIDATE\}"/);
        assert.doesNotMatch(pick, /ref: master/);
        // no master CI run is read: master runs no tests, the train tests the candidate itself
        assert.doesNotMatch(pick, /ci\.yml|hosts\.yml|ci_run_id/);
        assert.doesNotMatch(release, /run-id: \$\{\{ needs.pick/);
    });

    it("does nothing while the previous release is pending", () => {
        // an open release pull request, unless it can no longer merge: then it is closed and replaced
        assert.match(pick, /startswith\("release\/train-"\)/);
        assert.match(pick, /pending \| held\) skip "release pull request #\$\{number\} is still open/);
        assert.match(pick, /\*\) gh pr close "\$number" --delete-branch/);
        // an open "Release held" issue stops the schedule; a restart and an ad hoc dispatch run anyway
        assert.match(pick, /if \[ -n "\$held" \] && \[ "\$TRIGGER" = schedule \]; then\n\s+skip /);
        // the last release not tagged yet
        assert.match(pick, /has no tag \$\{project\}@\$\{version\} yet/);
        // nothing releasable: the same versioning the train runs, made locally, makes no commit
        assert.match(pick, /commit=\$\(tools\/release-version.sh "\$PACKAGES"\)/);
        assert.match(pick, /release: \$\{\{ steps.releasable.outputs.release \|\| 'false' \}\}/);
        for (const j of [ci, t4, hosts, audit]) {
            assert.match(j, /needs: pick\n\s+if: \$\{\{ needs.pick.outputs.release == 'true' \}\}/);
        }
    });

    it("replaces a release pull request that conflicts, has a failed check or left the merge queue", () => {
        const jq = /--jq '\n([\s\S]*?end)'\)/.exec(pick)[1];
        const state = (pr) => {
            const out = spawnSync("jq", ["-r", jq], { input: JSON.stringify(pr), encoding: "utf8" });
            assert.equal(out.status, 0, out.stderr);
            return out.stdout.trim();
        };
        const queued = { name: "Mergify Merge Queue", status: "IN_PROGRESS", conclusion: "" };
        const ok = { context: "All Checks Pass", state: "SUCCESS" };
        const pr = (over) => ({ mergeable: "MERGEABLE", labels: [], statusCheckRollup: [ok, queued], ...over });
        assert.equal(state(pr({})), "pending");
        assert.equal(state(pr({ mergeable: "UNKNOWN" })), "pending");
        assert.equal(state(pr({ mergeable: "CONFLICTING" })), "conflicts with master");
        assert.equal(
            state(
                pr({ statusCheckRollup: [ok, queued, { name: "Build", status: "COMPLETED", conclusion: "FAILURE" }] }),
            ),
            "has a failed check",
        );
        assert.equal(
            state(pr({ statusCheckRollup: [ok, { ...queued, status: "COMPLETED", conclusion: "NEUTRAL" }] })),
            "left the merge queue",
        );
        // a person's hold wins over everything: it is never closed
        assert.equal(state(pr({ mergeable: "CONFLICTING", labels: [{ name: "hold" }] })), "held");
    });

    it("waits on events, never on a count of hours", () => {
        for (const file of ["release.yml", "ci.yml", "coverage.yml"]) {
            const text = workflow(file).replace(/^\s*#.*$/gm, "");
            assert.doesNotMatch(text, /\bdate -d|created_?[aA]t|updated_?[aA]t|mergedAt|\bhours?\b|3600|86400/, file);
        }
        assert.doesNotMatch(release.replace(/^\s*#.*$/gm, ""), /timeout-minutes/);
    });

    it("tests the candidate with the full suite, the T4 and the audit before the release pull request", () => {
        assert.match(
            ci,
            /uses: \.\/\.github\/workflows\/ci\.yml\n\s+with:\n\s+ref: \$\{\{ needs.pick.outputs.sha \}\}\n\s+secrets: inherit/,
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
        assert.match(audit, /ref: \$\{\{ needs.pick.outputs.sha \}\}/);
        assert.match(audit, /run: pnpm audit --prod --audit-level=high/);
        assert.doesNotMatch(audit, /continue-on-error/, "a high advisory holds the release");
        assert.match(train, /needs: \[pick, ci, t4, hosts, audit, llm\]/);
        assert.match(
            train,
            /if: \$\{\{ needs.pick.outputs.release == 'true' && needs.ci.result == 'success' && needs.t4.result == 'success' && needs.hosts.result == 'success' && needs.audit.result == 'success' && needs.llm.result == 'success' \}\}/,
        );
        // the release ships the builds of its own CI call, not a master run's
        assert.match(train, /pattern: "build-\{graph-format,[^"]*\}"\n\s+path: \$\{\{ runner.temp \}\}\/builds\n\n/);
        assert.match(train, /commit=\$\(tools\/release-version.sh "\$PACKAGES"\)/);
        assert.match(train, /node tools\/release-diff.mjs "\$SHA" "\$COMMIT"/);
        // the train is put first by .mergify.yml's "release train" priority rule, not a label
        assert.doesNotMatch(train, /gh pr create[^\n]*--label/);
        // one train at a time across its jobs, so two trains never pay for two T4 runs of one commit
        assert.match(release, /^concurrency:\n {4}group: .*'release-train' \}\}\n {4}cancel-in-progress: false/m);
        // coverage comes from the same CI call, and never holds the release
        assert.match(coverage, /needs: \[pick, ci\]\n\s+if: \$\{\{ needs.ci.result == 'success' \}\}/);
        assert.match(coverage, /uses: \.\/\.github\/workflows\/coverage\.yml/);
        assert.doesNotMatch(train + held, /coverage/);
        const cov = workflow("coverage.yml");
        assert.match(cov, /on:\n\s+workflow_call:/);
        assert.doesNotMatch(cov, /workflow_run|run-id/);
        // Coveralls names the tested commit, not the calling run's
        assert.match(cov, /git-commit: \$\{\{ inputs.ref \}\}\n\s+git-branch: master/);
    });

    it("runs the LLM regression tests on the candidate with the Google secret, failing when it is missing", () => {
        assert.match(llm, /needs: pick\n\s+if: \$\{\{ needs.pick.outputs.release == 'true' \}\}/);
        assert.match(llm, /ref: \$\{\{ needs.pick.outputs.sha \}\}/);
        assert.match(llm, /run: pnpm exec nx run graphty-element:build/);
        assert.match(llm, /VITE_LLM_REGRESSION_PROVIDER: google\n/);
        assert.match(llm, /VITE_GOOGLE_API_KEY: \$\{\{ secrets.GOOGLE_API_KEY \}\}/);
        // the tests skip without a key; the job must fail instead, naming the secret, before vitest runs
        const check = llm.indexOf('if [ -z "${VITE_GOOGLE_API_KEY}" ]; then');
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
        for (const file of ["ci.yml", "gpu.yml", "hosts.yml", "coverage.yml"]) {
            assert.doesNotMatch(workflow(file), /llm-regression|ANTHROPIC_API_KEY|OPENAI_API_KEY|GOOGLE_API_KEY/, file);
        }
    });

    it("holds the whole release when anything fails: no pull request, no builds kept, nothing published, one issue", () => {
        assert.match(held, /needs: \[pick, ci, t4, hosts, audit, llm, train\]/);
        assert.doesNotMatch(held, /gh pr create|git push|nx release|upload-artifact|id-token/);
        // the publish job finds only builds the train kept, and only the train keeps them
        assert.equal(release.match(/name: release-builds-/g).length, 2);
        assert.match(train, /name: release-builds-\$\{\{ needs.pick.outputs.sha \}\}/);
        assert.match(publish, /name: release-builds-\$\{\{ steps.commit.outputs.sha \}\}/);
        assert.equal(release.match(/gh pr create/g).length, 1);
        // one issue naming what failed: found by its title prefix and updated, else created with the labels
        // githerd and triage read
        for (const [result, name] of [
            ["PICK", "candidate pick"],
            ["CI", "CI"],
            ["T4", "T4 GPU"],
            ["HOSTS", "Hosts"],
            ["AUDIT", "security audit"],
            ["TRAIN", "release pull request"],
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
        const helper = readFileSync(new URL("./release-held.sh", import.meta.url), "utf8");
        assert.match(helper, /startswith\(\\"\$\{1:-Release held: \}\\"\)/);
        assert.match(helper, /gh issue edit "\$open"[^\n]*--title "\$2"/);
        assert.match(helper, /gh issue comment "\$open"/);
        assert.match(helper, /--label bug --label priority:high --label effort:medium/);
        assert.match(held, /::error::release held/);
        // the only way out without an issue is the T4 runner loss the re-run repeats (tested with it)
        assert.equal(held.match(/\n\s+exit [0-9]/g).length, 1);
        // a refused or lost T4 runner has no code fix: the issue says so
        assert.match(held, /if \[ "\$T4_RESULT" = failure \]; then\n\s+echo\n\s+echo "If the T4 job was refused/);
        // and the next train that passes closes it, as its last step
        const close = train.indexOf("tools/release-held.sh close");
        assert.ok(close > train.indexOf("gh pr create"), "closed only after the release pull request");
    });

    // A train attempt ends with a release pull request or a "Release held" issue, never with neither. Run
    // 37635516841 (2026-10-07) ended with neither: a GitHub Actions outage left CI's "All Checks Pass" queued for
    // good, its result "abandoned", and held's `if` listed only failure and cancelled.
    describe("never ends a train attempt without a pull request or a held issue", () => {
        const trainNeeds = /\n {8}needs: \[([^\]]*)\]/.exec(train)[1].split(", ");
        const condition = /\n {8}if: \$\{\{ (.*) \}\}\n/.exec(held)[1];
        // the condition as JavaScript: GitHub's expression syntax here is a subset of it. `pr` is the train's
        // output: the release pull request it opened, "" (GitHub's value for an unset output) when it opened none.
        const runs = (results, release = "true", pr = "") =>
            new Function(
                "needs",
                `return ${condition.replace(/\balways\(\)/g, "true").replace(/!cancelled\(\)/g, "true")};`,
            )(
                Object.fromEntries(
                    ["pick", "ci", "t4", "hosts", "audit", "llm", "train"].map((j) => [
                        j,
                        {
                            result: results[j] ?? "success",
                            outputs: j === "pick" ? { release } : j === "train" ? { pr } : {},
                        },
                    ]),
                ),
            );
        // every result a job can end with, including the ones GitHub does not document
        const NOT_SUCCESS = ["failure", "cancelled", "skipped", "abandoned", "timed_out", "a-result-not-yet-invented"];

        it("needs every job the train needs, and the train", () => {
            assert.deepEqual(trainNeeds, ["pick", "ci", "t4", "hosts", "audit", "llm"]);
            assert.match(held, new RegExp(`needs: \\[${[...trainNeeds, "train"].join(", ")}\\]`));
        });

        it("runs whatever the run's state: always(), never a list of red results", () => {
            assert.match(condition, /^always\(\) && /);
            assert.doesNotMatch(condition, /cancelled\(\)|contains\(|== 'failure'|== 'cancelled'/);
        });

        it("runs for every non-success result of every lane the train needs", () => {
            for (const lane of trainNeeds.filter((j) => j !== "pick")) {
                for (const result of NOT_SUCCESS) {
                    // a lane that did not succeed skips the train
                    assert.equal(runs({ [lane]: result, train: "skipped" }), true, `${lane} ${result}`);
                }
            }
            for (const result of NOT_SUCCESS) {
                assert.equal(runs({ train: result }), true, `train ${result}`);
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
                            train: "skipped",
                        },
                        "",
                    ),
                    true,
                    result,
                );
            }
            // a push (the publish job's run) and a restart whose build failed skip the pick
            assert.equal(
                runs(
                    {
                        pick: "skipped",
                        ci: "skipped",
                        t4: "skipped",
                        hosts: "skipped",
                        audit: "skipped",
                        llm: "skipped",
                        train: "skipped",
                    },
                    "",
                ),
                false,
            );
        });

        it("stays quiet when the train opened its pull request, or the pick found nothing to release", () => {
            assert.equal(runs({}), false);
            const none = {
                ci: "skipped",
                t4: "skipped",
                hosts: "skipped",
                audit: "skipped",
                llm: "skipped",
                train: "skipped",
            };
            assert.equal(runs(none, "false"), false);
        });

        // Issue #1768: a bookkeeping step after the pull request opened (closing the held issue, announcing it)
        // failed the train, and this job posted "Release held" for a release that was going ahead.
        it("opens no held issue when a step fails after the train opened its pull request", () => {
            const pr = "https://github.com/graphty-org/graphty-monorepo/pull/1800";
            for (const result of NOT_SUCCESS.filter((r) => r !== "skipped")) {
                assert.equal(runs({ train: result }, "true", pr), false, `train ${result}`);
            }
            assert.match(train, /\n {8}outputs:\n {12}pr: \$\{\{ steps.open.outputs.pr \}\}\n/);
            // and the train says so in the run, rather than failing silently
            assert.match(
                train,
                /- name: Report a failure after the release pull request opened\n\s+if: \$\{\{ failure\(\) && steps.open.outputs.pr != '' \}\}[\s\S]*::error::/,
            );
        });

        it("still opens the held issue when the train fails before its pull request opens", () => {
            for (const result of NOT_SUCCESS) {
                assert.equal(runs({ train: result }, "true", ""), true, `train ${result}`);
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
                    `#!/bin/bash\ncase "$2" in */jobs\\?*) jq -r "$4" "${join(dir, "jobs.json")}";; esac\n`,
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
                        SHA: "44ab26d10658f95c66025ab391219e2865b94aa8",
                        PICK_RESULT: "success",
                        CI_RESULT: "success",
                        T4_RESULT: "success",
                        HOSTS_RESULT: "success",
                        AUDIT_RESULT: "success",
                        LLM_RESULT: "success",
                        LLM_OWNER_ITEM: "",
                        TRAIN_RESULT: "skipped",
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

        it("names a failed train, and holds the outage hint back when a job failed on its own", () => {
            const { title, body } = issue({ TRAIN_RESULT: "failure" }, [
                {
                    id: 7,
                    name: "Open the release pull request",
                    status: "completed",
                    conclusion: "failure",
                    steps: [{ name: "Version the packages", conclusion: "failure" }],
                },
            ]);
            assert.equal(title, "Release held: release pull request failed on 44ab26d\n");
            assert.match(body, /Open the release pull request \(failure\): Version the packages/);
            assert.doesNotMatch(body, /githubstatus/);
        });
    });

    describe("restarts a held release on a master push whose build passed", () => {
        // The pick job's "Skip while the previous release is pending" step, run in a scratch directory with
        // stubs for gh (no release pull request, or one still pending), git (no release yet) and
        // tools/release-held.sh (the held train issue, or none; `publishHold` an open publish hold, which only a
        // plain `find` returns). `trigger` is the workflow's TRIGGER: "schedule" for a scheduler dispatch
        // (scheduled=true), "workflow_dispatch" for one by hand.
        const pending = (trigger, heldIssue, trainPr = false, publishHold = "") => {
            const script = /- name: Skip while the previous release is pending[\s\S]*?run: \|\n([\s\S]*?)\n\n/.exec(
                pick,
            )[1];
            const dir = mkdtempSync(join(tmpdir(), "release-pick-"));
            try {
                mkdirSync(join(dir, "tools"));
                mkdirSync(join(dir, "bin"));
                // `gh pr list` names the open train pull request; `gh pr view` finds it still pending
                const gh = trainPr ? 'case "$2" in list) echo 77;; view) echo pending;; esac' : "";
                writeFileSync(join(dir, "bin", "gh"), `#!/bin/sh\n${gh}\n`, { mode: 0o755 });
                // no release commit yet, so no tag to wait for
                writeFileSync(join(dir, "bin", "git"), "#!/bin/sh\n", { mode: 0o755 });
                writeFileSync(
                    join(dir, "tools", "release-held.sh"),
                    `#!/bin/sh\nif [ "$2" = --train ]; then echo ${heldIssue}; else echo ${heldIssue || publishHold}; fi\n`,
                    { mode: 0o755 },
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
                    },
                });
                assert.equal(run.status, 0, run.stderr);
                return readFileSync(output, "utf8");
            } finally {
                rmSync(dir, { recursive: true, force: true });
            }
        };

        it("is started by every completed CI run of a push to master", () => {
            assert.match(
                release,
                /\n {4}workflow_run:\n {8}workflows: \["CI"\]\n {8}types:\n {12}- completed\n {8}branches:\n {12}- master\n/,
            );
        });

        it("starts only when the build passed, on a push to master in this repository", () => {
            const gate = /\n {8}if: (\$\{\{.*\}\})\n/.exec(pick)[1];
            assert.match(
                gate,
                /github.event_name != 'workflow_run' \|\| \(github.event.workflow_run.conclusion == 'success' && github.event.workflow_run.event == 'push' && github.event.workflow_run.head_branch == 'master' && github.event.workflow_run.head_repository.full_name == github.repository\)/,
            );
        });

        it("starts the held release on the pushed commit when a held issue is open", () => {
            assert.equal(pending("workflow_run", "1234"), "pending=false\nsha=abc123\n");
        });

        it("never starts when no held issue is open", () => {
            assert.equal(pending("workflow_run", ""), "pending=true\n");
            // the schedule, unlike a restart, runs only when nothing is held
            assert.equal(pending("schedule", ""), "pending=false\nsha=abc123\n");
            assert.equal(pending("schedule", "1234"), "pending=true\n");
            assert.equal(pending("workflow_dispatch", "1234"), "pending=false\nsha=abc123\n");
        });

        it("never restarts a train for a publish hold, which only a re-run publish clears; the schedule still skips", () => {
            assert.equal(pending("workflow_run", "", false, "1440"), "pending=true\n");
            assert.equal(pending("schedule", "", false, "1440"), "pending=true\n");
            // a train hold beside it still restarts
            assert.equal(pending("workflow_run", "1234", false, "1440"), "pending=false\nsha=abc123\n");
            assert.match(pick, /\[ -z "\$\(tools\/release-held.sh find --train\)" \]/);
            assert.match(pick, /held=\$\(tools\/release-held.sh find\)\n/);
        });

        it("skips a scheduler dispatch while a train pull request or a held issue is open; runs one by hand", () => {
            // scheduled=true: TRIGGER is "schedule"
            assert.equal(pending("schedule", "", true), "pending=true\n");
            assert.equal(pending("schedule", "1234"), "pending=true\n");
            assert.equal(pending("schedule", ""), "pending=false\nsha=abc123\n");
            // by hand (scheduled=false): runs despite the held issue, waits for an open train pull request
            assert.equal(pending("workflow_dispatch", "1234"), "pending=false\nsha=abc123\n");
            assert.equal(pending("workflow_dispatch", "", true), "pending=true\n");
        });

        it("shares the one train group, so two pushes in a row never start two trains", () => {
            assert.match(
                release,
                /^concurrency:\n {4}group: \$\{\{ github.event_name == 'push' && format\('release-push-\{0\}', github.run_id\) \|\| 'release-train' \}\}\n {4}cancel-in-progress: false/m,
            );
            // and a restart that finds the first train's release pull request open skips
            assert.match(pick, /pending \| held\) skip "release pull request/);
        });

        it("comments on the same held issue when the restarted release fails again", () => {
            assert.match(held, /\[ "\$TRIGGER" != workflow_run \] \|\| echo "This was a restarted release/);
            assert.match(held, /Refs #<this issue>/);
        });
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
        // a Mergify merge commit of any other pull request never names the release branch, so it never publishes
        const marker = /contains\(github.event.head_commit.message, '([^']+)'\)/.exec(publish)[1];
        assert.ok(!"Merged #42, #43, #44\n\nMerged by Mergify Merge Queue".includes(marker));
        assert.ok(!"Merge of #42".includes(marker));
    });

    it("reports a failed publish as a held release, and closes it when a re-run publishes", () => {
        assert.match(publish, /issues: write/);
        assert.match(
            publish,
            /- name: Report a failed publish\n\s+id: report\n\s+if: \$\{\{ failure\(\) \}\}[\s\S]*title="Release held: publish failed on \$\{GITHUB_SHA:0:7\}"[\s\S]*tools\/release-held.sh open "\$title"/,
        );
        assert.match(
            publish,
            /- name: Close the failed-publish issue\n\s+run: \|\n\s+tools\/release-held.sh close[\s\S]*"Release held: publish failed"\n/,
        );
    });

    it("announces every outcome on the Release status issue: held, release pull request, published or failed", () => {
        // tools/release-status.mjs mentions RELEASE_NOTIFY; a run the owner did not start notifies nobody otherwise
        for (const [j, outcome] of [
            [held, "held"],
            [train, "opened"],
        ]) {
            assert.match(j, new RegExp(`node tools/release-status.mjs ${outcome} `));
            assert.match(j, /RELEASE_NOTIFY: \$\{\{ vars.RELEASE_NOTIFY \}\}/);
        }
        assert.match(held, /tools\/release-status.mjs\n/, "in the held job's sparse checkout");
        // the last step of the publish job, whatever happened above it, so a re-run (--failed) announces again
        assert.match(
            publish,
            /- name: Announce the publish outcome\n\s+if: \$\{\{ always\(\) \}\}[\s\S]*OUTCOME: \$\{\{ job.status == 'success' && 'published' \|\| 'publish-failed' \}\}[\s\S]*node tools\/release-status.mjs "\$OUTCOME"[^\n]*\n[^\n]*\n$/,
        );
        assert.match(publish, /echo "tags=\$\(IFS=,; echo "\$\{tags\[\*\]\}"\)" >> "\$GITHUB_OUTPUT"/);
    });

    it("has a backstop that announces a run that ended badly without announcing itself", () => {
        const watch = workflow("release-watch.yml");
        // workflow_run matches the watched workflow by its name
        assert.match(release, /^name: Release\n/);
        assert.match(watch, /workflow_run:\n\s+workflows: \["Release"\]\n\s+types: \[completed\]\n/);
        assert.match(
            watch,
            /if: \$\{\{ !contains\(fromJSON\('\["success","skipped","neutral"\]'\), github.event.workflow_run.conclusion\) \}\}/,
        );
        assert.doesNotMatch(watch, /secrets\./, "GITHUB_TOKEN only");
        assert.deepEqual(watch.match(/\w+: write/g), ["issues: write"], "it writes only the comment");
        assert.match(watch, /RELEASE_NOTIFY: \$\{\{ vars.RELEASE_NOTIFY \}\}/);
        assert.match(watch, /node tools\/release-status.mjs run-ended --run "\$RUN_URL" --attempt "\$ATTEMPT"/);
        assert.match(watch, /--what "\$CONCLUSION" --sha "\$HEAD_SHA" --since "\$STARTED"/);
        // the same rule gpu-rerun-on-runner-loss.yml re-runs by, so a lost spot runner is never announced twice
        assert.match(watch, /tools\/gpu-runner-lost.sh "\$RUN_ID" 1/);
    });

    it("announces a release pull request that left the merge queue without merging", () => {
        const dq = workflow("release-dequeued.yml");
        // master's copy, no merge commit needed (a conflicting release pull request still fires); Mergify's app adds
        // the label, and a label a GitHub App adds starts workflows
        assert.match(dq, /\non:\n {4}pull_request_target:\n {8}types: \[labeled\]\n\npermissions:/);
        assert.match(dq, /github.event.label.name == 'dequeued'/);
        assert.match(dq, /startsWith\(github.event.pull_request.head.ref, 'release\/train-'\)/);
        assert.match(dq, /github.event.pull_request.user.login == 'github-actions\[bot\]'/);
        // the same branch and author .mergify.yml's release train priority rule names
        const mergify = readFileSync(new URL("../.mergify.yml", import.meta.url), "utf8");
        assert.match(mergify, /- head~=\^release\/train-\n\s+- author=github-actions\[bot\]/);
        // it runs nothing from the pull request
        assert.match(dq, /- uses: actions\/checkout@v4\n\s+with:\n\s+ref: master\n/);
        assert.doesNotMatch(dq, /secrets\./, "GITHUB_TOKEN only");
        assert.deepEqual(dq.match(/\w+: write/g), ["issues: write"], "it writes only the comment");
        assert.match(dq, /checks: read/, "it reads the Mergify Merge Queue check run");
        assert.match(dq, /RELEASE_NOTIFY: \$\{\{ vars.RELEASE_NOTIFY \}\}/);
        assert.match(
            dq,
            /node tools\/release-status.mjs dequeued --pr "\$PR_URL" --sha "\$HEAD_SHA" --run "\$RUN_URL"/,
        );
    });

    // The failed-publish report, run in a scratch directory with stubs: the publish step's output (run
    // 37691314850's shape, colors and all), `pnpm exec nx show project` answering each project's root, and
    // tools/release-held.sh recording the issue it would open.
    const publishReport = (log) => {
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
                    GITHUB_SHA: "e140ea5c8358785f46e6a671172c30a361c6ded4",
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
            /set -o pipefail\n\s+pnpm exec nx release publish --projects="\$PROJECTS" --nxBail=false 2>&1 \| tee "\$RUNNER_TEMP\/publish.log" \|\|\n\s+echo "::warning::/,
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

    it("reports any other failed publish as before, with no owner item", () => {
        for (const log of [task(false, "graph-io", "npm error code E403\nnpm error 403 Forbidden"), undefined]) {
            const { title, body } = publishReport(log);
            assert.equal(title.trim(), "Release held: publish failed on e140ea5");
            assert.doesNotMatch(body, /OWNER ITEM/);
            assert.match(body, /^The publish job failed on master /);
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
        const next = rules.slice(rules.indexOf("- name: next in line"));
        assert.ok(rules.indexOf("- name: next in line") > rules.indexOf("- name: fix for a red master"));
        assert.match(next, /^\s+- label=queue:next$/m);
        assert.match(next, /^\s+priority: medium$/m);
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
            assert.match(checks, new RegExp(`run_step "${step.replace(/[()]/g, "\\$&")}"`), step);
        }
        // SonarQube runs only there, so a push it fails never reaches the queue or the build.
        assert.doesNotMatch(prepush, /sonar-gate\.mjs/);
        const runStep = checks.slice(
            checks.indexOf("run_step() {"),
            checks.indexOf("\n}\n", checks.indexOf("run_step() {")) + 3,
        );
        const r = spawnSync("bash", ["-c", `${runStep}\nrun_step one false\nrun_step two "echo SECOND"`], {
            encoding: "utf8",
        });
        assert.equal(r.status, 1);
        assert.match(r.stdout, /stopped at the first failure: one/);
        assert.doesNotMatch(r.stdout, /SECOND/);
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
            for (const f of ["prepush-tests.mjs", "test-slots.mjs", "prepush-inputs.mjs"]) {
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
                    timeout: 60_000,
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
            {
                b: { key: null, sha: "s", at: "t" },
            },
        );
        assert.deepEqual(run, shards);
        assert.deepEqual(skipped, []);
    });

    it("skips only a shard whose recorded pass has exactly this key", () => {
        const shards = [shard("same"), shard("changed")];
        const passes = { same: { key: "k1", sha: "s", at: "t" }, changed: { key: "old", sha: "s", at: "t" } };
        const { run, skipped } = partitionByPasses(
            shards,
            new Map([
                ["same", "k1"],
                ["changed", "new"],
            ]),
            passes,
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

    it("records passes per branch and reads them back", () => {
        const dir = mkdtempSync(join(tmpdir(), "prepush-passes-"));
        try {
            const store = passStore(dir, "tools/x");
            assert.deepEqual(store.read(), {});
            store.record("a", { key: "k", sha: "s", at: "t" });
            store.record("b", { key: "k2", sha: "s", at: "t" });
            assert.deepEqual(Object.keys(passStore(dir, "tools/x").read()).sort(), ["a", "b"]);
            assert.deepEqual(passStore(dir, "other").read(), {});
        } finally {
            rmSync(dir, { recursive: true, force: true });
        }
    });
});

describe("the source-only checks before the queue (tools/prepush-source-checks.sh)", () => {
    it("skip only on the exact checkout they passed on, and run again after any edit", () => {
        // The script and the fingerprint tool in a throwaway repository, every check behind a fake
        // pnpm (and check-links.sh) that logs its call and passes.
        const dir = mkdtempSync(join(tmpdir(), "prepush-source-checks-"));
        try {
            mkdirSync(join(dir, "tools"));
            mkdirSync(join(dir, "bin"));
            mkdirSync(join(dir, "node_modules/.pnpm"), { recursive: true });
            for (const f of ["prepush-source-checks.sh", "prepush-inputs.mjs"]) {
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
            writeFileSync(join(dir, "pnpm-lock.yaml"), "lock\n");
            writeFileSync(join(dir, "node_modules/.pnpm/lock.yaml"), "lock\n");
            writeFileSync(join(dir, ".gitignore"), "node_modules/\ncalls\n");
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
            const second = run();
            assert.equal(second.calls, "", "nothing changed: no check runs");
            assert.match(second.out, /\[SKIP\] Source-only checks/);
            writeFileSync(join(dir, "a.ts"), "b\n");
            assert.match(run().calls, /run format:check/, "an edit runs them again");
            writeFileSync(join(dir, "new.ts"), "n\n");
            assert.match(run().calls, /run format:check/, "a new file runs them again");
            git("add", ".");
            git("commit", "-q", "-m", "b");
            assert.match(run().calls, /run format:check/, "a commit runs them again");
            assert.equal(run().calls, "");
        } finally {
            rmSync(dir, { recursive: true, force: true });
        }
    });
});
