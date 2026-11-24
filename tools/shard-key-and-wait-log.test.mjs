// Tests of a test shard's input key and the wait log:
//  - a shard's key is made of what it reads -- its package and related ones, the files outside the
//    packages, the installed lockfile, the rule that judges a run -- never of the branch, the commit or
//    the build outputs, so the same tree has the same key in every worktree;
//  - every wait for a slot or a lock is logged with who held it.
// Each test works in throwaway git repositories.
//
//   node tools/shard-key-and-wait-log.test.mjs   (part of pnpm run test:ci-workflows)
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { after, describe, it } from "node:test";

import { isolateGit } from "./isolated-git-env.mjs";
import { acquire } from "./test-slots.mjs";
import { logWait } from "./wait-log.mjs";

const TMP = mkdtempSync(join(tmpdir(), "shard-key-"));
after(() => rmSync(TMP, { recursive: true, force: true }));
isolateGit();

const TOOLS = fileURLToPath(new URL(".", import.meta.url));
let made = 0;

// A checkout with the key's tools in it: a source file, an ignored dist/ and tmp/, an installed lockfile.
function repo() {
    const dir = join(TMP, `repo-${++made}`);
    mkdirSync(join(dir, "tools/lib"), { recursive: true });
    mkdirSync(join(dir, "node_modules/.pnpm"), { recursive: true });
    for (const f of ["prepush-inputs.mjs", "lib/git.mjs"]) copyFileSync(join(TOOLS, f), join(dir, "tools", f));
    writeFileSync(join(dir, ".gitignore"), "node_modules/\ndist/\ntmp/\n");
    writeFileSync(join(dir, "a.ts"), "a\n");
    writeFileSync(join(dir, "pnpm-lock.yaml"), "lock\n");
    writeFileSync(join(dir, "node_modules/.pnpm/lock.yaml"), "lock\n");
    const git = (...args) => {
        const r = spawnSync("git", args, { cwd: dir, encoding: "utf8" });
        assert.equal(r.status, 0, `git ${args.join(" ")}: ${r.stderr}`);
        return r.stdout.trim();
    };
    git("init", "-q", "-b", "main");
    git("add", ".");
    git("commit", "-q", "-m", "a");
    return { dir, git };
}

describe("a test shard's key", () => {
    // Package p depends on q; r is unrelated. The tools are a checkout of their own, whose
    // tools/shard-verdict.mjs judges a run.
    const graph = {
        roots: new Map([
            ["p", "p"],
            ["q", "q"],
            ["r", "r"],
        ]),
        outputs: new Map([
            ["p", ["p/dist"]],
            ["q", ["q/dist"]],
        ]),
        deps: new Map([["p", new Set(["q"])]]),
    };
    const shard = { shard: "p-1", package: "p", "test-command": "cd p && vitest run", "needs-browser": false };
    const write = (dir, path, text) => {
        mkdirSync(join(dir, path, ".."), { recursive: true });
        writeFileSync(join(dir, path), text);
    };
    const tools = repo();
    for (const f of ["shard-verdict.mjs", "x.mjs"]) write(tools.dir, `tools/${f}`, `${f}\n`);
    const inputs = import(join(tools.dir, "tools/prepush-inputs.mjs"));
    const checkout = () => {
        const r = repo();
        for (const p of ["p", "q", "r"]) write(r.dir, `${p}/src/a.ts`, `${p}\n`);
        write(r.dir, ".gitignore", "node_modules/\ndist/\ntmp/\ncoverage/\n.coverage-parts/\n");
        r.git("add", ".");
        r.git("commit", "-q", "-m", "packages");
        return r;
    };
    const keyOf = async (dir) => (await inputs).shardKeys(dir, graph)()(shard);

    it("is the same for the same tree in two worktrees, whatever their build outputs hold", async () => {
        const r = checkout();
        const other = join(TMP, `shard-worktree-${made}`);
        r.git("worktree", "add", "-q", "--detach", other, "HEAD");
        write(other, "node_modules/.pnpm/lock.yaml", "lock\n");
        // graph-format stamps the commit it was built at; nx's cache restores another commit's build.
        write(r.dir, "q/dist/q.js", 'producer = "@graphty/graph-format@29f982b6ae06"\n');
        write(other, "q/dist/q.js", 'producer = "@graphty/graph-format@c09057348c37"\n');
        write(other, "p/dist/tsconfig.tsbuildinfo", "buffer@5.7.1\n");
        assert.equal(await keyOf(other), await keyOf(r.dir));
    });

    it("is not changed by what a run writes, nor by a tool change outside the rule that judges a run", async () => {
        const r = checkout();
        const before = await keyOf(r.dir);
        write(r.dir, "p/coverage/index.html", "report\n");
        write(r.dir, "p/.coverage-parts/p-1/coverage-final.json", "{}\n");
        write(r.dir, "p/dist/p.js", "rebuilt\n");
        write(r.dir, "tmp/test-results/p-1.log", "Tests  1 passed (1)\n");
        write(tools.dir, "tools/x.mjs", "a tool fix that went live during the run\n");
        write(r.dir, "r/src/a.ts", "a package p does not read\n");
        assert.equal(await keyOf(r.dir), before);
    });

    it("changes with the files the shard reads, the installed lockfile and the verdict rule", async () => {
        const r = checkout();
        const base = await keyOf(r.dir);
        const changed = async (why, dir, path, text) => {
            const old = existsSync(join(dir, path)) ? readFileSync(join(dir, path), "utf8") : null;
            write(dir, path, text);
            assert.notEqual(await keyOf(r.dir), base, why);
            if (old === null) rmSync(join(dir, path));
            else writeFileSync(join(dir, path), old);
            assert.equal(await keyOf(r.dir), base, `${why}, undone`);
        };
        await changed("its package's source", r.dir, "p/src/a.ts", "p 2\n");
        await changed("a new test file, not yet committed", r.dir, "p/test/a.test.ts", "t\n");
        await changed("a dependency's source", r.dir, "q/src/a.ts", "q 2\n");
        await changed("a root file", r.dir, "pnpm-lock.yaml", "lock 2\n");
        await changed("the checkout's own tools", r.dir, "tools/run-tests.sh", "x\n");
        await changed("the installed lockfile", r.dir, "node_modules/.pnpm/lock.yaml", "lock 2\n");
        await changed("the verdict rule", tools.dir, "tools/shard-verdict.mjs", "stricter\n");
    });
});

describe("the wait log", () => {
    const read = (file) => readFileSync(file, "utf8").trim().split("\n").map(JSON.parse);

    it("writes one JSON line per wait, and nothing when it is off", () => {
        const file = join(TMP, "waits-direct.jsonl");
        logWait({ kind: "test-slot", start: 1000, end: 4000, waiter: "w", heldBy: ["h"] }, file);
        assert.deepEqual(read(file), [
            {
                kind: "test-slot",
                start: new Date(1000).toISOString(),
                end: new Date(4000).toISOString(),
                ms: 3000,
                waiter: "w",
                pid: process.pid,
                heldBy: ["h"],
            },
        ]);
        logWait({ kind: "x", start: 0 }, null);
        assert.equal(read(file).length, 1);
    });

    it("records a test slot's wait with the run that held it, and no line for a run that did not wait", async () => {
        const dir = join(TMP, "test-slots");
        const lines = [];
        const quiet = { env: {}, poll: 5, log: () => {}, dir, slots: 1, waitLog: (l) => lines.push(l) };
        const holder = spawn("sleep", ["600"], { stdio: "ignore" });
        const waiter = spawn("sleep", ["600"], { stdio: "ignore" });
        try {
            const release = await acquire({ ...quiet, pid: holder.pid, label: "the holder" });
            assert.equal(lines.length, 0, "a slot taken at once is no wait");
            let told;
            const waiting = new Promise((resolve) => (told = resolve));
            const taking = acquire({ ...quiet, pid: waiter.pid, label: "the waiter", log: told });
            await waiting;
            release();
            (await taking)();
            // One wait line, for the waiter only; each run's hold is logged when it gives the slot back.
            assert.deepEqual(
                lines.map((l) => [l.kind, l.waiter]),
                [
                    ["test-slot-held", "the holder"],
                    ["test-slot", "the waiter"],
                    ["test-slot-held", "the waiter"],
                ],
            );
            assert.match(lines[1].heldBy[0], new RegExp(`^pid ${holder.pid} the holder`));
        } finally {
            holder.kill();
            waiter.kill();
        }
    });

    it("records a wait for a browser slot with the commands that held the slots", () => {
        const slots = join(TMP, "browser-slots");
        const log = join(TMP, "waits-browser.jsonl");
        const gate = join(TOOLS, "with-browser.sh");
        // Four holders fill the slots; the fifth command waits, says so, and runs once they end.
        const r = spawnSync(
            "bash",
            [
                "-c",
                `set -u
for i in 1 2 3 4; do "$GATE" sh -c "touch held.$i; while [ ! -e go ]; do sleep 0.05; done" & done
until [ -e held.1 ] && [ -e held.2 ] && [ -e held.3 ] && [ -e held.4 ]; do sleep 0.05; done
"$GATE" sh -c "echo fifth > fifth" 2> fifth.err &
until grep -q "waiting for one of 4 browser slots" fifth.err 2>/dev/null; do sleep 0.05; done
touch go
wait`,
            ],
            {
                cwd: TMP,
                encoding: "utf8",
                env: {
                    ...process.env,
                    GATE: gate,
                    // Run under tools/low-priority.sh, the holders would all wait for slot 4 and never start.
                    BROWSER_SLOT_PRIORITY: "",
                    BROWSER_SLOT_DIR: slots,
                    BROWSER_SLOT_POLL: "0.1",
                    PIPELINE_WAIT_LOG: log,
                },
            },
        );
        assert.equal(r.status, 0, r.stdout + r.stderr);
        assert.equal(readFileSync(join(TMP, "fifth"), "utf8"), "fifth\n");
        const lines = read(log);
        const fifth = lines.find((l) => l.waiter.includes("echo fifth"));
        assert.equal(fifth?.kind, "browser-slot", JSON.stringify(lines));
        assert.equal(fifth.heldBy.length, 4);
        for (const h of fifth.heldBy) assert.match(h, /^\d+ \S+ .* :: sh -c touch held\.\d/);
    });

    it("names a browser slot holder that makes no progress to its waiter and once in the wait log, and never stops it", () => {
        const dir = join(TMP, "stalled-holder");
        mkdirSync(dir, { recursive: true });
        const log = join(dir, "waits.jsonl");
        // The holder blocks reading a fifo: no CPU, no output, as the hung app-perf.mjs did (#9046). The waiter
        // reports it, the holder is left alone, and once the fifo is written the holder ends and the waiter runs.
        const r = spawnSync(
            "bash",
            [
                "-c",
                `set -u
mkfifo hang
"$GATE" sh -c "touch held; read x < hang; touch holder-done" &
until [ -e held ]; do sleep 0.05; done
"$GATE" sh -c "echo waited > waited" 2> waiter.err &
until [ "$(grep -c "STUCK? browser slot 1" waiter.err 2>/dev/null)" -ge 2 ]; do sleep 0.05; done
[ ! -e holder-done ] || exit 9
echo go > hang
wait`,
            ],
            {
                cwd: dir,
                encoding: "utf8",
                env: {
                    ...process.env,
                    GATE: join(TOOLS, "with-browser.sh"),
                    BROWSER_SLOT_PRIORITY: "",
                    BROWSER_SLOTS: "1",
                    BROWSER_SLOT_DIR: join(dir, "browser-slots"),
                    BROWSER_SLOT_POLL: "0.1",
                    BROWSER_SLOT_STALL: "1",
                    BROWSER_SLOT_STALL_CHECK: "0",
                    PIPELINE_WAIT_LOG: log,
                },
            },
        );
        assert.equal(r.status, 0, r.stdout + r.stderr);
        assert.ok(existsSync(join(dir, "holder-done")), "the holder ran to its end");
        assert.equal(readFileSync(join(dir, "waited"), "utf8"), "waited\n");
        const err = readFileSync(join(dir, "waiter.err"), "utf8");
        assert.match(
            err,
            /STUCK\? browser slot 1 holder pid \d+ .* by .*stalled-holder :: sh -c touch held; read x < hang/,
        );
        const stalled = read(log).filter((l) => l.kind === "browser-slot-stalled");
        assert.equal(stalled.length, 1, JSON.stringify(stalled));
        assert.match(stalled[0].waiter, /:: sh -c touch held; read x < hang; touch holder-done$/);
        assert.equal(stalled[0].slot, 1);
    });

    it("gives a low-priority command (BROWSER_SLOT_PRIORITY=low) slot 4 first, then a lower one no ordinary waiter wants", () => {
        const dir = join(TMP, "low-lane");
        mkdirSync(dir, { recursive: true });
        // A low holder takes slot 4 and keeps it, as a hung holder would (#8930). A second low command waits
        // while an ordinary command waits for any slot (a planted ticket of this shell), although slots 1 to 3
        // are free, and takes slot 3 once that ticket is gone; an ordinary command still takes slot 1.
        const r = spawnSync(
            "bash",
            [
                "-c",
                `set -u
BROWSER_SLOT_PRIORITY=low "$GATE" sh -c 'echo $BROWSER_SLOT > a; while [ ! -e go ]; do sleep 0.05; done' &
until [ -s a ]; do sleep 0.05; done
mkdir -p browser-slots/queue
echo 4 > browser-slots/queue/1-$$
BROWSER_SLOT_PRIORITY=low "$GATE" sh -c 'echo $BROWSER_SLOT > b' 2> b.err &
b=$!
until grep -q "waiting for one of 4 browser slots" b.err 2>/dev/null; do sleep 0.05; done
[ ! -e b ] || exit 9
rm browser-slots/queue/1-$$
wait $b || exit 8
"$GATE" sh -c 'echo $BROWSER_SLOT > gate'
touch go
wait`,
            ],
            {
                cwd: dir,
                encoding: "utf8",
                env: {
                    ...process.env,
                    GATE: join(TOOLS, "with-browser.sh"),
                    BROWSER_SLOT_PRIORITY: "",
                    BROWSER_SLOT_DIR: join(dir, "browser-slots"),
                    BROWSER_SLOT_POLL: "0.1",
                    PIPELINE_WAIT_LOG: "off",
                },
            },
        );
        assert.equal(r.status, 0, r.stdout + r.stderr);
        assert.equal(readFileSync(join(dir, "a"), "utf8"), "4\n", "the first low command took slot 4");
        assert.equal(readFileSync(join(dir, "b"), "utf8"), "3\n", "the second took slot 3 once no ordinary one waited");
        assert.equal(readFileSync(join(dir, "gate"), "utf8"), "1\n", "an ordinary command took slot 1");
    });

    it("serves low-lane waiters in the order they began to wait, however often each one looks", () => {
        const dir = join(TMP, "low-lane-fifo");
        mkdirSync(dir, { recursive: true });
        // A holder keeps slot 4. A and B wait, looking every second; C waits last, looking every 0.02 s. When
        // the slot frees, A takes it first, then B, then C. An ordinary waiter for slots 1 to 3 (a planted ticket of
        // this shell) keeps the low lane off those.
        const r = spawnSync(
            "bash",
            [
                "-c",
                `set -u
export BROWSER_SLOT_PRIORITY=low
mkdir -p browser-slots/queue
echo 3 > browser-slots/queue/1-$$
"$GATE" sh -c "touch held; while [ ! -e go ]; do sleep 0.05; done" &
until [ -e held ]; do sleep 0.05; done
for w in A B; do
    "$GATE" sh -c "echo $w >> order" 2> $w.err &
    until grep -q "waiting for one of 4" $w.err 2>/dev/null; do sleep 0.05; done
done
BROWSER_SLOT_POLL=0.02 "$GATE" sh -c "echo C >> order" 2> C.err &
until grep -q "waiting for one of 4" C.err 2>/dev/null; do sleep 0.05; done
touch go
wait
[ "$(tr -d '\\n' < order)" = ABC ] || { echo "order: $(tr '\\n' ' ' < order)"; exit 9; }
ls -a browser-slots | grep -q '^\\.low-' && { echo "a low ticket was left"; exit 8; }
exit 0`,
            ],
            {
                cwd: dir,
                encoding: "utf8",
                env: {
                    ...process.env,
                    GATE: join(TOOLS, "with-browser.sh"),
                    BROWSER_SLOT_DIR: join(dir, "browser-slots"),
                    BROWSER_SLOT_POLL: "1",
                    PIPELINE_WAIT_LOG: "off",
                },
            },
        );
        assert.equal(r.status, 0, r.stdout + r.stderr);
    });

    it("gives the next free slot to the high lane (BROWSER_SLOT_PRIORITY=high), ahead of a command that waited first", () => {
        const dir = join(TMP, "high-lane");
        mkdirSync(dir, { recursive: true });
        // Four holders fill the slots. An ordinary command starts waiting, looking every 0.02 s; then a high one
        // starts waiting, looking every second. One slot frees: the high one takes it, the other keeps waiting.
        const r = spawnSync(
            "bash",
            [
                "-c",
                `set -u
for i in 1 2 3 4; do "$GATE" sh -c "touch held.$i; while [ ! -e go.$i ]; do sleep 0.05; done" & done
until [ -e held.1 ] && [ -e held.2 ] && [ -e held.3 ] && [ -e held.4 ]; do sleep 0.05; done
hold='while [ ! -e done ]; do sleep 0.05; done'
BROWSER_SLOT_POLL=0.02 "$GATE" sh -c "echo shard >> order; $hold" 2> shard.err &
until grep -q "waiting for one of 4" shard.err 2>/dev/null; do sleep 0.05; done
BROWSER_SLOT_PRIORITY=high BROWSER_SLOT_POLL=1 "$GATE" sh -c "echo preview >> order; $hold" 2> preview.err &
until grep -q "waiting for one of 4" preview.err 2>/dev/null; do sleep 0.05; done
touch go.1
until [ -s order ]; do sleep 0.05; done
first=$(head -1 order)
touch go.2 go.3 go.4
until [ "$(wc -l < order)" -eq 2 ]; do sleep 0.05; done
touch done
wait
[ "$first" = preview ] || { echo "first: $first"; exit 9; }
ls -a browser-slots | grep -q '^\\.high-' && { echo "a high mark was left"; exit 8; }
exit 0`,
            ],
            {
                cwd: dir,
                encoding: "utf8",
                env: {
                    ...process.env,
                    GATE: join(TOOLS, "with-browser.sh"),
                    // the caller's lane (tools/low-priority.sh sets low, which waits for slot 4 only) would
                    // keep the four holders from filling the slots
                    BROWSER_SLOT_PRIORITY: "",
                    BROWSER_SLOT_DIR: join(dir, "browser-slots"),
                    PIPELINE_WAIT_LOG: "off",
                },
            },
        );
        assert.equal(r.status, 0, r.stdout + r.stderr);
    });
});
