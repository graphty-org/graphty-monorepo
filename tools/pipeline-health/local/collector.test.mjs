import assert from "node:assert/strict";
import {
    appendFileSync,
    copyFileSync,
    mkdirSync,
    mkdtempSync,
    readFileSync,
    rmSync,
    utimesSync,
    writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, beforeEach, test } from "node:test";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

import { batches, collect, fit, MAX_BYTES, MAX_ROWS, mapLedger, readToken, scrub } from "./collector.mjs";

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "fixtures");
let root;

function addRecord(name, date, mtimeSec) {
    const dir = join(root, "tmp/test-ledger/records", date);
    mkdirSync(dir, { recursive: true });
    const path = join(dir, `${name}.json.gz`);
    writeFileSync(path, gzipSync(readFileSync(join(fixtures, `${name}.json`))));
    utimesSync(path, mtimeSec, mtimeSec);
}

function recorder(fail = () => false) {
    const calls = [];
    const post = async (kind, body) => {
        calls.push({ kind, body });
        return !fail(kind, body);
    };
    return { calls, post };
}

beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "health-local-"));
    addRecord("ledger-land-check-failed", "2026-10-24", 1_792_800_000);
    addRecord("ledger-verify-passed", "2026-10-25", 1_792_900_000);
    copyFileSync(join(fixtures, "push-log.jsonl"), join(root, "tmp/push-log.jsonl"));
    copyFileSync(join(fixtures, "waits.jsonl"), join(root, "tmp/waits.jsonl"));
});

afterEach(() => rmSync(root, { recursive: true, force: true }));

test("maps every source and posts no host path, gate log, cwd or session id", async () => {
    const { calls, post } = recorder();
    const counts = await collect({ root, post });
    assert.deepEqual(Object.fromEntries(Object.entries(counts).map(([k, c]) => [k, c.posted])), {
        invocations: 2,
        "push-runs": 2,
        waits: 2,
    });
    const text = JSON.stringify(calls);
    for (const banned of ["/home/", "/tmp/", "cwd", "sessionId", "gateLog", "heldBy", "waiter", '"log"']) {
        assert.ok(!text.includes(banned), `posted ${banned}`);
    }
    const inv = calls.find((c) => c.kind === "invocations").body.rows;
    assert.equal(inv[0].id, "local.1792826226852-3959103-githerd.retry");
    assert.equal(inv[0].startedAt, Date.parse("2026-10-24T07:17:06.852Z"));
    assert.equal(inv[0].try, 1);
    assert.equal(inv[0].outcome, "failed");
    assert.deepEqual(inv[0].files, [["githerd/test/owners.test.mjs", 17, 3, 0, 2588]]);
    assert.deepEqual(Object.keys(inv[0].failures[0]), ["file", "name", "message"]);
    assert.match(inv[0].failures[0].message, /bash tools\/push-queue\.sh git push/);
    assert.equal(inv[1].runUrl, "https://github.com/graphty-org/graphty-monorepo/actions/runs/40148074821");
    assert.equal(inv[1].reusedFrom, "local.1792890000000-1-graphty-element-default");
    const push = calls.find((c) => c.kind === "push-runs").body.rows;
    assert.deepEqual(push[1], {
        id: "local.push.291c6a4ffae5f0a8384096d5bb1968b37bfeaba0.2026-10-25T15:15:41Z",
        at: "2026-10-25T15:15:41Z",
        branch: "golden",
        sha: "291c6a4ffae5f0a8384096d5bb1968b37bfeaba0",
        exit: 0,
        queuedAt: "2026-10-25T15:15:36Z",
        startedAt: "2026-10-25T15:15:37Z",
    });
    const waits = calls.find((c) => c.kind === "waits").body.rows;
    assert.deepEqual(
        waits.map((w) => w.kind),
        ["test-slot", "gpu-slot"],
    ); // browser-slot left out
    assert.equal(waits[0].id, "local.wait.test-slot.2026-10-22T14:28:16.738Z.3236649");
});

test("posts each record once, and only new ones on the next pass", async () => {
    const first = recorder();
    await collect({ root, post: first.post });
    const again = recorder();
    await collect({ root, post: again.post });
    assert.equal(again.calls.length, 0);

    appendFileSync(
        join(root, "tmp/waits.jsonl"),
        readFileSync(join(fixtures, "waits.jsonl"), "utf8").split("\n")[0].replace("3236649", "7"),
    );
    const partial = recorder(); // a line without its newline is still being written
    await collect({ root, post: partial.post });
    assert.equal(partial.calls.length, 0);
    appendFileSync(join(root, "tmp/waits.jsonl"), "\n");
    addRecord("ledger-verify-passed", "2026-10-26", 1_793_000_000);
    const next = recorder();
    await collect({ root, post: next.post });
    assert.deepEqual(
        next.calls.map((c) => [c.kind, c.body.rows.length]),
        [
            ["invocations", 1],
            ["waits", 1],
        ],
    );
});

test("a failed post leaves the cursor where it was", async () => {
    const failing = recorder((kind) => kind === "push-runs");
    await collect({ root, post: failing.post });
    const retry = recorder();
    await collect({ root, post: retry.post });
    assert.deepEqual(
        retry.calls.map((c) => c.kind),
        ["push-runs"],
    );
    assert.equal(retry.calls[0].body.rows.length, 2);
});

test("dry run posts nothing and keeps no cursor", async () => {
    const counts = await collect({ root, dryRun: true, post: () => assert.fail("posted") });
    assert.equal(counts.invocations.rows, 2);
    assert.equal(counts.waits.example.kind, "test-slot");
    const later = recorder();
    await collect({ root, post: later.post });
    assert.equal(later.calls.length, 3);
});

test("batches hold at most 500 rows and 1 MB", () => {
    const small = Array.from({ length: 1201 }, (_, i) => ({ id: `r${i}` }));
    assert.deepEqual(
        batches(small).map((b) => b.length),
        [MAX_ROWS, MAX_ROWS, 201],
    );
    const big = Array.from({ length: 5 }, (_, i) => ({ id: `b${i}`, pad: "x".repeat(300_000) }));
    for (const b of batches(big)) assert.ok(Buffer.byteLength(JSON.stringify({ rows: b })) <= MAX_BYTES);
    const huge = { id: "h", files: [["f".repeat(MAX_BYTES), 1, 0, 0, 1]] };
    assert.deepEqual(fit(huge), { id: "h", files: undefined });
});

test("scrub keeps the repository part of a path and hides the rest", () => {
    assert.equal(scrub("at /home/u/Projects/graphty-monorepo/.worktrees/w/tools/x.mjs:3"), "at tools/x.mjs:3");
    assert.equal(scrub("open '/tmp/vitest-x/a.json'"), "open '<path>'");
    assert.equal(mapLedger({ id: "x", outcome: "unattributed", files: [], failures: [] }), null);
});

test("the token comes from the environment or the root .env", () => {
    assert.equal(readToken(root, { HEALTH_LOCAL_TOKEN: " env-token " }), "env-token");
    assert.equal(readToken(root, {}), undefined);
    writeFileSync(join(root, ".env"), 'OTHER=1\nexport HEALTH_LOCAL_TOKEN="file-token"\n');
    assert.equal(readToken(root, {}), "file-token");
});
