// Tests of tools/push-queue.sh, the machine's push queue: critical tickets go first and the rest
// first come first served, no more than PUSH_QUEUE_SLOTS run at once, a dead waiter's ticket never
// blocks the queue, and every push appends the line githerd reads to the push log -- also with no
// live gate worktree. Each test runs the script in a throwaway git repository with its own ticket
// directory, push log and gate path; the queued commands are small shell commands.
//
//   node --test tools/push-queue.test.mjs   (part of pnpm run test:ci-workflows)
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import { isolateGit } from "./isolated-git-env.mjs";

isolateGit();
const QUEUE = new URL("./push-queue.sh", import.meta.url).pathname;

// A repository to run the queue in, with one commit and a bare `origin`, plus the queue's paths.
function setup() {
    const root = mkdtempSync(join(tmpdir(), "push-queue-"));
    const repo = join(root, "repo");
    mkdirSync(repo);
    const git = (...args) => spawnSync("git", args, { cwd: repo, encoding: "utf8" });
    git("init", "-q", "-b", "main");
    writeFileSync(join(repo, "a.txt"), "a\n");
    git("add", "a.txt");
    git("commit", "-q", "-m", "a");
    spawnSync("git", ["init", "-q", "--bare", join(root, "origin.git")]);
    git("remote", "add", "origin", join(root, "origin.git"));
    const env = {
        ...process.env,
        PUSH_QUEUE_DIR: join(root, "q", "tickets"),
        PUSH_QUEUE_LOG: join(root, "q", "push-log.jsonl"),
        PUSH_QUEUE_GATE: join(root, "no-gate-live"),
        PUSH_QUEUE_POLL: "0.1",
        PUSH_QUEUE_PRIORITY: "",
        PUSH_QUEUE_COPY: "",
    };
    return { root, repo, git, env };
}

// Runs a bash driver in the repository; $Q is the queue, $T the ticket directory.
function drive({ repo, env }, script, extra = {}) {
    const r = spawnSync("bash", ["-c", `set -u\nQ=${QUEUE}\nT=$PUSH_QUEUE_DIR\n${script}`], {
        cwd: repo,
        encoding: "utf8",
        env: { ...env, ...extra },
    });
    assert.equal(r.status, 0, r.stdout + r.stderr);
    return r;
}

// Shell waits. \`lines n\`: until n commands have run (each appends a line to \`order\`). \`tickets n r\`:
// until n tickets wait or run -- or more than r commands have run, one that should still be waiting,
// which the test's assertions then report instead of waiting for ever.
const WAITS = `
ran() { cat order 2>/dev/null | wc -l; }
lines() { until [ "$(ran)" = "$1" ]; do sleep 0.05; done; }
tickets() { until [ "$(ls "$T" 2>/dev/null | wc -l)" = "$1" ] || [ "$(ran)" -gt "$2" ]; do sleep 0.05; done; }
`;

describe("push-queue", () => {
    it("runs critical tickets first, then the rest in arrival order, one slot at a time", () => {
        const ctx = setup();
        drive(
            ctx,
            `${WAITS}
export PUSH_QUEUE_SLOTS=1
"$Q" sh -c 'echo A >> order; while [ ! -e go ]; do sleep 0.05; done' & lines 1
"$Q" sh -c 'echo B >> order' & tickets 2 1
PUSH_QUEUE_PRIORITY=critical "$Q" sh -c 'echo C >> order' & tickets 3 1
"$Q" sh -c 'echo D >> order' & tickets 4 1
cp order held
touch go
wait`,
        );
        assert.equal(
            readFileSync(join(ctx.repo, "held"), "utf8"),
            "A\n",
            "nothing else ran while A held the only slot",
        );
        assert.equal(readFileSync(join(ctx.repo, "order"), "utf8"), "A\nC\nB\nD\n");
        assert.deepEqual(readdirSync(ctx.env.PUSH_QUEUE_DIR), [], "every ticket is removed when its push ends");
    });

    it("runs as many at once as PUSH_QUEUE_SLOTS allows", () => {
        const ctx = setup();
        drive(
            ctx,
            `${WAITS}
export PUSH_QUEUE_SLOTS=2
"$Q" sh -c 'echo A >> order; while [ ! -e go ]; do sleep 0.05; done' & lines 1
"$Q" sh -c 'echo B >> order; while [ ! -e go ]; do sleep 0.05; done' & lines 2
"$Q" sh -c 'echo C >> order' & tickets 3 2
cp order held
touch go
wait`,
        );
        assert.equal(readFileSync(join(ctx.repo, "held"), "utf8"), "A\nB\n");
        assert.equal(readFileSync(join(ctx.repo, "order"), "utf8"), "A\nB\nC\n");
    });

    it("drops the ticket of a waiter whose process is gone", () => {
        const ctx = setup();
        drive(
            ctx,
            `mkdir -p "$T"
true & dead=$!; wait $dead
touch "$T/0-1-$dead"
PUSH_QUEUE_SLOTS=1 "$Q" sh -c 'echo ran > order'`,
        );
        assert.equal(readFileSync(join(ctx.repo, "order"), "utf8"), "ran\n");
        assert.deepEqual(readdirSync(ctx.env.PUSH_QUEUE_DIR), []);
    });

    it("pushes with no live gate worktree and logs the push line githerd reads", () => {
        const ctx = setup();
        assert.equal(existsSync(ctx.env.PUSH_QUEUE_GATE), false);
        drive(ctx, `"$Q" git push -q origin HEAD:feat/x`);
        const sha = ctx.git("rev-parse", "HEAD").stdout.trim();
        assert.equal(
            spawnSync("git", ["--git-dir", join(ctx.root, "origin.git"), "rev-parse", "feat/x"], {
                encoding: "utf8",
            }).stdout.trim(),
            sha,
        );
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
            "gateTree",
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

// A commit whose gate failed a check of its own is not queued again until something it depends on
// changes; a failure outside the commit's control never blocks it.
describe("push-queue: a commit that already failed", () => {
    // A test repository with the fingerprint tool committed, so the queue records fingerprints.
    function setupWithInputs() {
        const ctx = setup();
        mkdirSync(join(ctx.repo, "tools"));
        copyFileSync(
            new URL("./prepush-inputs.mjs", import.meta.url).pathname,
            join(ctx.repo, "tools", "prepush-inputs.mjs"),
        );
        writeFileSync(join(ctx.repo, ".gitignore"), "tmp/\n");
        ctx.git("add", ".");
        ctx.git("commit", "-q", "-m", "tools");
        return ctx;
    }
    // Runs `git <alias>` through the queue: a stand-in gate that prints `output` and exits 1.
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
    const pushed = (ctx) =>
        spawnSync("git", ["--git-dir", join(ctx.root, "origin.git"), "rev-parse", "-q", "--verify", "feat/x"], {
            encoding: "utf8",
        }).stdout.trim();

    it("refuses the same commit after a lint failure, naming the step and the gate log", () => {
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
        assert.deepEqual(readdirSync(ctx.env.PUSH_QUEUE_DIR), [], "a refusal leaves no ticket");
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

    // Issue #2357: the gate prints on stdout and stderr, each copied into the gate log by a tee. Written
    // as `cmd > >(tee ...) 2> >(tee ...)`, the tees were children of the command, not of the queue, so
    // nothing waited for them and the push log line could be written before the [FAIL] line reached
    // the gate log. The stand-in tee here holds back its copy until the push log has a line (a queue
    // that does not wait for it), or until the queue (the pid in its ticket) is blocked in wait(2)
    // with this tee its only child (a queue that waits for it), or the queue is gone.
    it("records a [FAIL] line whose stdout copy reaches the gate log last", () => {
        const ctx = setupWithInputs();
        const bin = join(ctx.root, "bin");
        mkdirSync(bin);
        writeFileSync(
            join(bin, "tee"),
            `#!/bin/bash
buf=$(cat; echo .); buf=\${buf%.}
if [ -n "$buf" ]; then
    q=$(ls "$PUSH_QUEUE_DIR" | sed 's/.*-//')
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
        ["a gate that printed no failure line", "something crashed"],
        ["a screenshot capture", "[FAIL] Screenshots: the capture failed or timed out (above; the log is /x)"],
        [
            "a shard that timed out",
            "[FAIL] Tests (the CI shards of the affected packages) failed\n  [FAIL] graphty (exit 124, 900s); the end of /x:",
        ],
        ["the local GPU lane", "[FAIL] webgpu-graph-algorithms on the local NVIDIA GPU failed"],
    ]) {
        it(`never refuses after ${what}`, () => {
            const ctx = setupWithInputs();
            failGate(ctx, output);
            const r = push(ctx);
            assert.equal(r.status, 0, r.stdout + r.stderr);
        });
    }
});
