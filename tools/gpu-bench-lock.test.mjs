// Tests of tools/gpu-bench-lock.mjs, the GPU benchmark lock wrapper: runs take the lock in arrival order, a hold
// past its cap is ended, a wait past --wait gives up behind a plain flock holder, and `status` shows the holder and
// the queue, including plain flock users.
//
//   node --test tools/gpu-bench-lock.test.mjs
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { once } from "node:events";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { after, describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { CAP_EXIT, LOCK_TIMEOUT_EXIT, parseArgs } from "./gpu-bench-lock.mjs";

const TMP = mkdtempSync(join(tmpdir(), "gpu-bench-lock-"));
after(() => rmSync(TMP, { recursive: true, force: true }));
const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), "gpu-bench-lock.mjs");

const children = [];
after(() => children.forEach((c) => c.kill("SIGKILL")));

function setup() {
    const dir = mkdtempSync(join(TMP, "case-"));
    const lock = join(dir, "gpu-bench.lock");
    writeFileSync(lock, "");
    const env = {
        ...process.env,
        GPU_BENCH_LOCK: lock,
        GRAPHTY_GPUBENCH_SLOTS_DIR: join(dir, "queue"),
        PIPELINE_WAIT_LOG: join(dir, "waits.jsonl"),
    };
    const start = (args) => {
        const child = spawn(process.execPath, [SCRIPT, ...args], { env, stdio: ["pipe", "pipe", "pipe"] });
        children.push(child);
        child.out = "";
        child.err = "";
        child.stdout.on("data", (d) => (child.out += d));
        child.stderr.on("data", (d) => (child.err += d));
        return child;
    };
    const status = () => spawnSync(process.execPath, [SCRIPT, "status"], { env, encoding: "utf8" }).stdout;
    return { dir, lock, env, start, status };
}

// Resolves once the stream has printed text matching re.
async function until(stream, re) {
    let seen = "";
    while (!re.test(seen)) seen += await once(stream, "data");
}

describe("gpu-bench-lock", () => {
    it("reads its flags and refuses a bad one", () => {
        assert.deepEqual(parseArgs(["echo", "hi"]), { waitMin: 30, capMin: 20, cmd: ["echo", "hi"] });
        assert.deepEqual(parseArgs(["--cap", "5", "--wait", "2", "x"]), { waitMin: 2, capMin: 5, cmd: ["x"] });
        assert.equal(parseArgs(["--cap", "0", "x"]), null);
        assert.equal(parseArgs(["--nope", "1", "x"]), null);
        assert.equal(parseArgs([]), null);
    });

    it("runs waiters in arrival order and shows the holder and the queue", async () => {
        const { dir, start, status } = setup();
        const log = join(dir, "order.log");
        // A holds until its stdin closes; B and C each append their letter.
        const a = start(["sh", "-c", `echo started; cat >/dev/null; echo A >> ${log}`]);
        await until(a.stdout, /started/);
        const b = start(["sh", "-c", `echo B >> ${log}`]);
        await until(b.stderr, /queued/);
        const c = start(["sh", "-c", `echo C >> ${log}`]);
        await until(c.stderr, /queued/);

        const lines = status().split("\n");
        assert.match(lines[1], new RegExp(`^holds: pid ${a.pid} sh -c echo started`));
        assert.match(lines[2], new RegExp(`^waits 1: pid ${b.pid} `));
        assert.match(lines[3], new RegExp(`^waits 2: pid ${c.pid} `));

        a.stdin.end();
        const codes = await Promise.all([a, b, c].map(async (p) => (await once(p, "exit"))[0]));
        assert.deepEqual(codes, [0, 0, 0]);
        assert.equal(readFileSync(log, "utf8"), "A\nB\nC\n");
        assert.match(status(), /free: nobody holds or waits/);
    });

    it("ends a hold that passes its cap", async () => {
        const { start } = setup();
        const run = start(["--cap", "0.01", "sleep", "600"]);
        const [code] = await once(run, "exit");
        assert.equal(code, CAP_EXIT);
        assert.match(run.err, /CAP: held the lock for 0.01 min, ending: sleep 600/);
    });

    it("shares the lock with plain flock users and gives up after --wait", async () => {
        const { lock, start, status } = setup();
        const plain = spawn("flock", [lock, "sh", "-c", "echo held; cat >/dev/null"], { stdio: "pipe" });
        children.push(plain);
        await until(plain.stdout, /held/);
        assert.match(status(), /holds \(plain flock\): pid \d+ \(\S+\) flock /);

        const run = start(["--wait", "0.01", "sh", "-c", "echo ran"]);
        const [code] = await once(run, "exit");
        assert.equal(code, LOCK_TIMEOUT_EXIT);
        assert.match(run.err, /LOCK-TIMEOUT after 0.01 min waiting; not run: sh -c echo ran/);
        assert.equal(run.out, "");
        plain.stdin.end();
        await once(plain, "exit");
    });
});
