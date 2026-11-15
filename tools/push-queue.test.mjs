// Tests of tools/push-queue.sh, the machine's push queue: critical tickets go first and the rest
// first come first served, no more than PUSH_QUEUE_SLOTS run at once, a dead waiter's ticket never
// blocks the queue, and every push appends the line githerd reads to the push log -- also with no
// live gate worktree. Each test runs the script in a throwaway git repository with its own ticket
// directory, push log and gate path; the queued commands are small shell commands.
//
//   node --test tools/push-queue.test.mjs   (part of pnpm run test:ci-workflows)
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { once } from "node:events";
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

// A repository to run the queue in, with one commit and a bare `origin`, plus the queue's paths.
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
    // The queue's own settings come only from here, never from the caller: a push made with
    // PUSH_QUEUE_RETRY=1 runs these tests in its gate with that variable still set (issue #2458).
    const inherited = Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith("PUSH_QUEUE_")));
    const env = {
        ...inherited,
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

    // The gate stages its screenshot capture under HEAD; the queue promotes it to the pull request's
    // preview only once the push is accepted, and a rejected push keeps the old preview (2026-10-24: a
    // rejected push of golden-cut replaced the cut's owner-reviewed preview).
    function withPreview(ctx) {
        mkdirSync(join(ctx.repo, "tools"));
        copyFileSync(
            new URL("./visual-preview.sh", import.meta.url).pathname,
            join(ctx.repo, "tools/visual-preview.sh"),
        );
        writeFileSync(join(ctx.repo, "visual-review.config.json"), "{}\n");
        mkdirSync(join(ctx.repo, "tmp/pr-status"), { recursive: true });
        writeFileSync(
            join(ctx.repo, "tmp/pr-status/status.json"),
            JSON.stringify({ pullRequests: [{ head: "main", number: 77 }] }),
        );
        const local = join(ctx.repo, "tmp/visual-review/local");
        mkdirSync(join(local, "77"), { recursive: true });
        writeFileSync(join(local, "77/status.json"), JSON.stringify({ head: "old" }));
        // The gate's part, as tools/prepush.sh does it once every check passed: stage a capture of HEAD
        // and promote it.
        writeFileSync(
            join(ctx.repo, ".git/hooks/pre-push"),
            `#!/bin/sh\nd=tmp/visual-review/local/.pending-$(git rev-parse HEAD)\nmkdir -p $d\necho "{\\"head\\":\\"$(git rev-parse HEAD)\\"}" > $d/status.json\nPREPUSH_ROOT=$PWD tools/visual-preview.sh --promote $(git rev-parse HEAD)\n`,
            { mode: 0o755 },
        );
        const sha = ctx.git("rev-parse", "HEAD").stdout.trim();
        const head = () => JSON.parse(readFileSync(join(local, "77/status.json"), "utf8")).head;
        return { local, sha, head };
    }

    it("promotes the gate's staged screenshot preview only after the push is accepted", () => {
        const ctx = setup();
        const { local, sha, head } = withPreview(ctx);
        drive(ctx, `"$Q" git push -q origin HEAD:main`);
        assert.equal(head(), sha);
        assert.equal(existsSync(join(local, `.pending-${sha}`)), false);
    });

    it("keeps the old screenshot preview and discards the staged one when the push is rejected", () => {
        const ctx = setup();
        const { local, sha, head } = withPreview(ctx);
        writeFileSync(join(ctx.root, "origin.git/hooks/pre-receive"), "#!/bin/sh\nexit 1\n", { mode: 0o755 });
        const r = spawnSync("bash", ["-c", `"${QUEUE}" git push -q origin HEAD:main`], {
            cwd: ctx.repo,
            encoding: "utf8",
            env: ctx.env,
        });
        assert.notEqual(r.status, 0, r.stdout + r.stderr);
        assert.equal(head(), "old");
        assert.equal(existsSync(join(local, `.pending-${sha}`)), false);
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

    it("stops before the gate when the remote branch holds a commit the push lacks, unless forced", () => {
        const ctx = setup();
        writeFileSync(join(ctx.repo, "b.txt"), "b\n");
        ctx.git("add", "b.txt");
        ctx.git("commit", "-q", "-m", "b");
        ctx.git("push", "-q", "origin", "HEAD:feat/x");
        ctx.git("checkout", "-q", "-b", "other", "HEAD~1");
        writeFileSync(join(ctx.repo, "c.txt"), "c\n");
        ctx.git("add", "c.txt");
        ctx.git("commit", "-q", "-m", "c");
        const origin = () =>
            spawnSync("git", ["--git-dir", join(ctx.root, "origin.git"), "rev-parse", "feat/x"], {
                encoding: "utf8",
            }).stdout.trim();
        const before = origin();
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
            /stopped before the gate -- origin's feat\/x is at [0-9a-f]{12}, which [0-9a-f]{12} does not contain/,
        );
        assert.match(refused.stderr, /git merge origin\/feat\/x/);
        assert.equal(origin(), before);
        drive(ctx, `"$Q" git push -q origin +HEAD:feat/x`);
        assert.equal(origin(), ctx.git("rev-parse", "HEAD").stdout.trim());
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
        for (const f of ["prepush-inputs.mjs", "push-base.mjs"]) {
            copyFileSync(new URL(`./${f}`, import.meta.url).pathname, join(ctx.repo, "tools", f));
        }
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

    it("says when a process in the gate was killed by a signal, and not when a check failed", () => {
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
        // 2026-10-17: the test stage was stopped by a signal while every shard that ran had passed.
        [
            "a test stage stopped by a signal",
            "  [PASS] graphty-element-storybook-3 (3394s)\nStopped after SIGTERM failed (5405s); the other shards did not finish.\n[FAIL] Tests (the CI shards of the affected packages) failed",
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

// The gate runs from a snapshot of its live copy (tools/gate-snapshot.sh), so a `tools/live.sh gate` in the
// middle of a push changes nothing the push runs. The live copy here is a worktree of the repository, as
// .worktrees/gate-live is; its hook reads a rule file, makes a new rule live, and reads the rule again.
describe("push-queue: the gate snapshot", () => {
    const SNAPSHOT = new URL("./gate-snapshot.sh", import.meta.url).pathname;
    const HOOK = `#!/bin/sh
# PREPUSH_ROOT: the gate checks the pushed checkout
GATE_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cat >/dev/null
echo "rule before: $(cat "$GATE_DIR/tools/rule.txt")"
echo "rule $(($(git -C "$LIVE" rev-list --count HEAD) + 1))" >"$LIVE/tools/rule.txt"
git -C "$LIVE" commit -q -am "a new rule goes live" >&2
echo "rule after: $(cat "$GATE_DIR/tools/rule.txt")"
echo "queue settings seen by the gate: [\${PUSH_QUEUE_GATE-}\${PUSH_QUEUE_COPY-}]"
`;
    function setupLive() {
        const ctx = setup();
        const live = join(ctx.repo, ".worktrees", "gate-live");
        writeFileSync(join(ctx.repo, ".gitignore"), ".worktrees/\ntmp/\n");
        mkdirSync(join(ctx.repo, "tools"));
        mkdirSync(join(ctx.repo, ".husky"));
        copyFileSync(QUEUE, join(ctx.repo, "tools", "push-queue.sh"));
        copyFileSync(SNAPSHOT, join(ctx.repo, "tools", "gate-snapshot.sh"));
        writeFileSync(join(ctx.repo, "tools", "rule.txt"), "rule 2\n");
        writeFileSync(join(ctx.repo, ".husky", "pre-push"), HOOK);
        ctx.git("add", ".");
        ctx.git("update-index", "--chmod=+x", "tools/push-queue.sh", "tools/gate-snapshot.sh");
        ctx.git("commit", "-q", "-m", "gate");
        ctx.git("worktree", "add", "-q", "--detach", live, "HEAD");
        // husky's generated wrapper, untracked and ignored, as in a real checkout
        mkdirSync(join(live, ".husky", "_"));
        writeFileSync(join(live, ".husky", "_", ".gitignore"), "*\n");
        const wrapper = '#!/bin/sh\nexec sh "$(dirname "$0")/../pre-push" "$@"\n';
        writeFileSync(join(live, ".husky", "_", "pre-push"), wrapper, { mode: 0o755 });
        ctx.env.PUSH_QUEUE_GATE = live;
        ctx.env.LIVE = live;
        return { ...ctx, live };
    }
    const snapshots = (ctx) => readdirSync(join(ctx.repo, ".worktrees")).filter((d) => d.startsWith("gate-snapshot-"));
    const liveHead = (ctx) =>
        spawnSync("git", ["-C", ctx.live, "rev-parse", "HEAD"], { encoding: "utf8" }).stdout.trim();
    const push = (ctx, branch, extra) => drive(ctx, `"$Q" git push -q origin HEAD:${branch}`, extra).stdout;

    it("runs the whole push from one snapshot while live.sh moves the live copy, and removes the old one", () => {
        const ctx = setupLive();
        const first = `gate-snapshot-${liveHead(ctx).slice(0, 12)}`;
        const out = push(ctx, "feat/x");
        assert.match(out, /rule before: rule 2/);
        assert.match(out, /rule after: rule 2/, "the rule that went live mid-push is not this push's");
        assert.deepEqual(snapshots(ctx), [first]);
        const list = spawnSync("git", ["worktree", "list", "--porcelain"], { cwd: ctx.repo, encoding: "utf8" }).stdout;
        assert.match(list, /locked gate snapshot/, "locked, so tools/worktree-cleanup.mjs leaves it");
        // The next push runs the new rule from its start, and the snapshot nobody holds is gone.
        assert.match(push(ctx, "feat/y"), /rule before: rule 3/);
        assert.equal(snapshots(ctx).includes(first), false);
    });

    // 2026-10-24: the snapshot's PUSH_QUEUE_GATE reached githerd's tests in the gate, whose own
    // throwaway repositories' tools/push-queue.sh then pushed through the machine's snapshot.
    it("never hands its own settings to the gate, so a queue the gate's tests run stays in its checkout", () => {
        const ctx = setupLive();
        assert.match(push(ctx, "feat/x"), /queue settings seen by the gate: \[\]/);
    });

    it("keeps a snapshot a landing holds (--hold) for its next push, and removes it once let go", async () => {
        const ctx = setupLive();
        const holder = spawn(SNAPSHOT, ["--hold", ctx.live], { env: ctx.env, stdio: ["pipe", "pipe", "inherit"] });
        // A failed assertion still lets the holder go, so the test file ends.
        after(() => holder.stdin.end());
        const [line] = await once(holder.stdout, "data");
        const snap = line.toString().trim();
        assert.ok(existsSync(join(snap, ".gate-snapshot")), snap);
        // The landing's push: the snapshot as PUSH_QUEUE_GATE; a rule going live meanwhile does not reach it.
        const out = push(ctx, "feat/x", { PUSH_QUEUE_GATE: snap });
        assert.match(out, /the gate is the snapshot/);
        assert.match(out, /rule after: rule 2/);
        // Another push snapshots the newer rule; the held snapshot stays.
        assert.match(push(ctx, "feat/y"), /rule before: rule 3/);
        assert.ok(existsSync(join(snap, ".gate-snapshot")), "a held snapshot is never removed");
        holder.stdin.end();
        await once(holder, "exit");
        push(ctx, "feat/z");
        assert.equal(existsSync(snap), false, "let go, the next snapshot removes it");
    });
});
