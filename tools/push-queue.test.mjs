// Tests of tools/push-queue.sh, the machine's push queue: critical tickets go first and the rest
// first come first served, no more than PUSH_QUEUE_SLOTS run at once, a dead waiter's ticket never
// blocks the queue, and every push appends the line githerd reads to the push log -- also with no
// live gate worktree. Each test runs the script in a throwaway git repository with its own ticket
// directory, push log and gate path; the queued commands are small shell commands.
//
//   node --test tools/push-queue.test.mjs   (part of pnpm run test:ci-workflows)
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
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
