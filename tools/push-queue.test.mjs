// Tests of tools/push-queue.sh: it runs the checkout's source-only checks before a push and skips the
// push when they fail, refuses a commit whose checks already failed while nothing it depends on changed,
// and appends one line per push to the push log. Each test runs the script in a throwaway git repository
// with its own push log; the commands are small shell commands.
//
//   node --test tools/push-queue.test.mjs   (part of pnpm run test:ci-workflows)
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
import { after, describe, it } from "node:test";

import { isolateGit } from "./isolated-git-env.mjs";

// The temporary directories this file makes go inside this one, removed when the file finishes.
const TMP = mkdtempSync(join(tmpdir(), "push-queue-"));
after(() => rmSync(TMP, { recursive: true, force: true }));

isolateGit();
const QUEUE = new URL("./push-queue.sh", import.meta.url).pathname;

// A repository to run the script in, with one commit and a bare `origin`, plus the script's paths.
function setup() {
    const root = mkdtempSync(join(TMP, "push-queue-"));
    const repo = join(root, "repo");
    mkdirSync(repo);
    const git = (...args) => spawnSync("git", args, { cwd: repo, encoding: "utf8" });
    git("init", "-q", "-b", "main");
    writeFileSync(join(repo, "a.txt"), "a\n");
    git("add", "a.txt");
    git("commit", "-q", "-m", "a");
    spawnSync("git", ["init", "-q", "--bare", join(root, "origin.git")]);
    git("remote", "add", "origin", join(root, "origin.git"));
    // The script's own settings come only from here, never from the caller: a push made with
    // PUSH_QUEUE_RETRY=1 runs these tests in its checks with that variable still set (issue #2458).
    const inherited = Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith("PUSH_QUEUE_")));
    const env = {
        ...inherited,
        PUSH_QUEUE_STATE: join(root, "q"),
        PUSH_QUEUE_LOG: join(root, "q", "push-log.jsonl"),
        PUSH_QUEUE_COPY: "",
    };
    return { root, repo, git, env };
}

// Runs a bash driver in the repository; $Q is the script.
function drive({ repo, env }, script, extra = {}) {
    const r = spawnSync("bash", ["-c", `set -u\nQ=${QUEUE}\n${script}`], {
        cwd: repo,
        encoding: "utf8",
        env: { ...env, ...extra },
    });
    assert.equal(r.status, 0, r.stdout + r.stderr);
    return r;
}

const originRef = (ctx, ref) =>
    spawnSync("git", ["--git-dir", join(ctx.root, "origin.git"), "rev-parse", "-q", "--verify", ref], {
        encoding: "utf8",
    }).stdout.trim();

describe("push-queue", () => {
    it("pushes and logs the push line", () => {
        const ctx = setup();
        drive(ctx, `"$Q" git push -q origin HEAD:feat/x`);
        const sha = ctx.git("rev-parse", "HEAD").stdout.trim();
        assert.equal(originRef(ctx, "feat/x"), sha);
        const lines = readFileSync(ctx.env.PUSH_QUEUE_LOG, "utf8").trim().split("\n");
        assert.equal(lines.length, 1);
        const line = JSON.parse(lines[0]);
        assert.deepEqual(Object.keys(line), [
            "at",
            "branch",
            "sha",
            "exit",
            "cwd",
            "sessionId",
            "name",
            "queuedAt",
            "startedAt",
            "gateLog",
            "gate",
            "changed",
            "fingerprint",
        ]);
        assert.equal(line.branch, "feat/x");
        assert.equal(line.sha, sha);
        assert.equal(line.exit, 0);
        assert.equal(line.cwd, ctx.repo);
        assert.ok(line.gateLog.startsWith(join(ctx.root, "q", "push-gate-logs") + "/"), line.gateLog);
        assert.ok(existsSync(line.gateLog));
        assert.match(line.queuedAt, /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/);
        assert.match(line.startedAt, /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/);
        // The private copy lives in the main checkout's tmp/ and is removed when the push ends.
        assert.deepEqual(readdirSync(join(ctx.repo, "tmp", "push-queue-copies")), []);
    });

    it("runs the checkout's source-only checks first, and never pushes when they fail", () => {
        const ctx = setup();
        mkdirSync(join(ctx.repo, "tools"));
        const checks = join(ctx.repo, "tools/prepush-source-checks.sh");
        writeFileSync(checks, `echo "[FAIL] Formatting failed"\nexit 1\n`);
        const r = spawnSync("bash", [QUEUE, "git", "push", "-q", "origin", "HEAD:feat/x"], {
            cwd: ctx.repo,
            encoding: "utf8",
            env: ctx.env,
        });
        assert.equal(r.status, 1, r.stdout + r.stderr);
        assert.equal(originRef(ctx, "feat/x"), "", "nothing was pushed");
        const line = JSON.parse(readFileSync(ctx.env.PUSH_QUEUE_LOG, "utf8").trim());
        assert.deepEqual(line.gate, ["[FAIL] Formatting failed"]);
        writeFileSync(checks, "exit 0\n");
        drive(ctx, `"$Q" git push -q origin HEAD:feat/x`);
        assert.notEqual(originRef(ctx, "feat/x"), "");
    });

    it("stops before the checks when the remote branch holds a commit the push lacks, unless forced", () => {
        const ctx = setup();
        writeFileSync(join(ctx.repo, "b.txt"), "b\n");
        ctx.git("add", "b.txt");
        ctx.git("commit", "-q", "-m", "b");
        ctx.git("push", "-q", "origin", "HEAD:feat/x");
        ctx.git("checkout", "-q", "-b", "other", "HEAD~1");
        writeFileSync(join(ctx.repo, "c.txt"), "c\n");
        ctx.git("add", "c.txt");
        ctx.git("commit", "-q", "-m", "c");
        const before = originRef(ctx, "feat/x");
        const r = spawnSync("bash", ["-c", `"${QUEUE}" sh -c 'touch ran; git push -q origin HEAD:feat/x'`], {
            cwd: ctx.repo,
            encoding: "utf8",
            env: ctx.env,
        });
        // A non-git command is never judged; the git push below is.
        assert.equal(existsSync(join(ctx.repo, "ran")), true, r.stdout + r.stderr);
        const refused = spawnSync("bash", ["-c", `"${QUEUE}" git push -q origin HEAD:feat/x`], {
            cwd: ctx.repo,
            encoding: "utf8",
            env: ctx.env,
        });
        assert.equal(refused.status, 1, refused.stdout + refused.stderr);
        assert.match(
            refused.stderr,
            /stopped before the checks -- origin's feat\/x is at [0-9a-f]{12}, which [0-9a-f]{12} does not contain/,
        );
        assert.match(refused.stderr, /git merge origin\/feat\/x/);
        assert.equal(originRef(ctx, "feat/x"), before);
        drive(ctx, `"$Q" git push -q origin +HEAD:feat/x`);
        assert.equal(originRef(ctx, "feat/x"), ctx.git("rev-parse", "HEAD").stdout.trim());
    });

    it("logs a failed command with its exit code", () => {
        const ctx = setup();
        const r = spawnSync("bash", [QUEUE, "sh", "-c", "exit 3"], { cwd: ctx.repo, encoding: "utf8", env: ctx.env });
        assert.equal(r.status, 3);
        const line = JSON.parse(readFileSync(ctx.env.PUSH_QUEUE_LOG, "utf8").trim());
        assert.equal(line.exit, 3);
        assert.equal(line.branch, null);
        assert.equal(line.sha, null);
    });
});

// A commit whose checks failed a check of its own is not run again until something it depends on
// changes; a failure outside the commit's control never blocks it.
describe("push-queue: a commit that already failed", () => {
    // A test repository with the fingerprint tool committed, so the script records fingerprints.
    function setupWithInputs() {
        const ctx = setup();
        mkdirSync(join(ctx.repo, "tools/lib"), { recursive: true });
        for (const f of ["prepush-inputs.mjs", "push-base.mjs", "lib/git.mjs"]) {
            copyFileSync(new URL(`./${f}`, import.meta.url).pathname, join(ctx.repo, "tools", f));
        }
        writeFileSync(join(ctx.repo, ".gitignore"), "tmp/\n");
        ctx.git("add", ".");
        ctx.git("commit", "-q", "-m", "tools");
        return ctx;
    }
    // Runs `git <alias>` through the script: a stand-in check that prints `output` and exits 1.
    function failGate(ctx, output) {
        const fake = join(ctx.root, "gate.sh");
        writeFileSync(fake, `cat <<'EOF'\n${output}\nEOF\nexit 1\n`);
        const r = spawnSync("bash", [QUEUE, "git", "-c", `alias.gate=!sh ${fake}`, "gate"], {
            cwd: ctx.repo,
            encoding: "utf8",
            env: ctx.env,
        });
        assert.equal(r.status, 1, r.stdout + r.stderr);
    }
    const push = (ctx, extra = {}) =>
        spawnSync("bash", [QUEUE, "git", "push", "-q", "origin", "HEAD:feat/x"], {
            cwd: ctx.repo,
            encoding: "utf8",
            env: { ...ctx.env, ...extra },
        });
    const pushed = (ctx) => originRef(ctx, "feat/x");

    it("refuses the same commit after a lint failure, naming the step and the log", () => {
        const ctx = setupWithInputs();
        failGate(ctx, "[FAIL] Lint failed");
        const first = JSON.parse(readFileSync(ctx.env.PUSH_QUEUE_LOG, "utf8").trim());
        assert.match(first.fingerprint, /^[0-9a-f]{64}$/);
        const r = push(ctx);
        assert.equal(r.status, 1);
        assert.match(r.stderr, /refused/);
        assert.match(r.stderr, /\[FAIL\] Lint failed/);
        assert.ok(r.stderr.includes(first.gateLog), r.stderr);
        assert.match(r.stderr, /PUSH_QUEUE_RETRY=1/);
        assert.equal(pushed(ctx), "", "nothing was pushed");
        assert.equal(
            readFileSync(ctx.env.PUSH_QUEUE_LOG, "utf8").trim().split("\n").length,
            1,
            "a refusal is not logged",
        );
    });

    it("refuses after a test shard that exited 1", () => {
        const ctx = setupWithInputs();
        failGate(
            ctx,
            "[FAIL] Tests (the CI shards of the affected packages) failed\n  [FAIL] graphty (exit 1, 300s); the end of /x/graphty.log:",
        );
        const r = push(ctx);
        assert.equal(r.status, 1);
        assert.match(r.stderr, /\[FAIL\] graphty \(exit 1/);
    });

    it("still refuses when the caller's environment has PUSH_QUEUE_RETRY=1", () => {
        const saved = process.env.PUSH_QUEUE_RETRY;
        process.env.PUSH_QUEUE_RETRY = "1";
        let ctx;
        try {
            ctx = setupWithInputs();
        } finally {
            if (saved === undefined) delete process.env.PUSH_QUEUE_RETRY;
            else process.env.PUSH_QUEUE_RETRY = saved;
        }
        failGate(ctx, "[FAIL] Lint failed");
        const r = push(ctx);
        assert.equal(r.status, 1, r.stdout + r.stderr);
        assert.match(r.stderr, /refused/);
        assert.equal(pushed(ctx), "", "nothing was pushed");
    });

    it("says when a process in the checks was killed by a signal, and not when a check failed", () => {
        const ctx = setupWithInputs();
        const fake = join(ctx.root, "gate.sh");
        const run = (output) => {
            writeFileSync(fake, `cat <<'EOF'\n${output}\nEOF\nexit 1\n`);
            return spawnSync("bash", [QUEUE, "git", "-c", `alias.gate=!sh ${fake}`, "gate"], {
                cwd: ctx.repo,
                encoding: "utf8",
                env: ctx.env,
            });
        };
        assert.match(run("Terminated\n[FAIL] Lint failed").stderr, /killed by a signal from outside it/);
        assert.match(
            run("Stopped after SIGTERM failed (5405s); the other shards did not finish.\n[FAIL] Tests failed").stderr,
            /killed by a signal from outside it/,
        );
        assert.doesNotMatch(run("error  no-unused-vars\n[FAIL] Lint failed").stderr, /killed by a signal/);
    });

    it("pushes again with PUSH_QUEUE_RETRY=1", () => {
        const ctx = setupWithInputs();
        failGate(ctx, "[FAIL] Lint failed");
        assert.equal(push(ctx, { PUSH_QUEUE_RETRY: "1" }).status, 0);
        assert.notEqual(pushed(ctx), "");
    });

    it("pushes again once a file changed", () => {
        const ctx = setupWithInputs();
        failGate(ctx, "[FAIL] Lint failed");
        writeFileSync(join(ctx.repo, "fix.txt"), "fixed\n");
        assert.equal(push(ctx).status, 0);
    });

    // Issue #2357: the checks print on stdout and stderr, each copied into the log by a tee. Written as
    // `cmd > >(tee ...) 2> >(tee ...)`, the tees were children of the command, not of the script, so
    // nothing waited for them and the push log line could be written before the [FAIL] line reached
    // the log. The stand-in tee here holds back its copy until the push log has a line (a script that
    // does not wait for it), or until the script (its parent) is blocked in wait(2) with this tee its
    // only child (a script that waits for it), or the script is gone.
    it("records a [FAIL] line whose stdout copy reaches the log last", () => {
        const ctx = setupWithInputs();
        const bin = join(ctx.root, "bin");
        mkdirSync(bin);
        writeFileSync(
            join(bin, "tee"),
            `#!/bin/bash
buf=$(cat; echo .); buf=\${buf%.}
if [ -n "$buf" ]; then
    q=$PPID
    kids=/proc/$q/task/$q/children
    waited() { [ "$(cat "$kids")" = "$$ " ] && [ "$(cat "/proc/$q/wchan")" = do_wait ] && [ "$(cat "$kids")" = "$$ " ]; }
    until [ -s "$PUSH_QUEUE_LOG" ] || ! [ -e "$kids" ] || waited 2>/dev/null; do sleep 0.05; done
fi
printf '%s' "$buf" >>"$2"
printf '%s' "$buf"
`,
            { mode: 0o755 },
        );
        ctx.env.PATH = `${bin}:${ctx.env.PATH}`;
        failGate(ctx, "[FAIL] Lint failed");
        const first = JSON.parse(readFileSync(ctx.env.PUSH_QUEUE_LOG, "utf8").trim());
        assert.deepEqual(first.gate, ["[FAIL] Lint failed"]);
        assert.equal(push(ctx).status, 1, "the same commit is refused");
    });

    for (const [what, output] of [
        ["a rejected push", " ! [rejected]        HEAD -> feat/x (fetch first)"],
        ["a run that printed no failure line", "something crashed"],
        [
            "a shard that timed out",
            "[FAIL] Tests (the CI shards of the affected packages) failed\n  [FAIL] graphty (exit 124, 900s); the end of /x:",
        ],
        // 2026-10-17: a killer outside the gate sent SIGTERM to the largest processes when memory ran out.
        [
            "a lint whose process was killed by a signal",
            '> eslint && tsc --noEmit\n\nTerminated\nWarning: command "npm run lint" exited with non-zero status code\n[FAIL] Lint failed',
        ],
        [
            "a Knip run killed by a signal",
            "Terminated\n ELIFECYCLE  Command failed with exit code 143.\n[FAIL] Knip (dead code detection) failed",
        ],
        [
            "a test shard killed by a signal",
            "tools/run-tests.sh: graphty FAILED: exit 143\n  [FAIL] graphty (exit 1, 714s); the end of /x/graphty.log:\n[FAIL] Tests (the CI shards of the affected packages) failed",
        ],
    ]) {
        it(`never refuses after ${what}`, () => {
            const ctx = setupWithInputs();
            failGate(ctx, output);
            const r = push(ctx);
            assert.equal(r.status, 0, r.stdout + r.stderr);
        });
    }
});
