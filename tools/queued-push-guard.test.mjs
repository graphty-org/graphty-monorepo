// Tests of tools/queued-push-guard.mjs: a push to a queued pull request is refused, everything else
// goes through. The CLI runs against a stubbed gh that prints a canned answer.
//
//   node --test tools/queued-push-guard.test.mjs
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

const GUARD = new URL("./queued-push-guard.mjs", import.meta.url).pathname;
const queued = { number: 7, state: "OPEN", labels: [{ name: "queued" }] };
const unqueued = { number: 7, state: "OPEN", labels: [{ name: "hold" }] };

// A gh stub: prints `answer` as JSON, or fails like gh does for a branch without a pull request.
function stubGh(answer) {
    const dir = mkdtempSync(join(tmpdir(), "queued-push-guard-"));
    const gh = join(dir, "gh");
    const body = answer ? `echo '${JSON.stringify(answer)}'` : `echo 'no pull requests found' >&2; exit 1`;
    writeFileSync(gh, `#!/bin/sh\n${body}\n`);
    chmodSync(gh, 0o755);
    return gh;
}

function push(answer, env = {}) {
    return spawnSync("node", [GUARD, "some-branch"], {
        encoding: "utf8",
        env: { ...process.env, ALLOW_PUSH_WHILE_QUEUED: "", GH: stubGh(answer), ...env },
    });
}

describe("queued-push-guard", () => {
    it("refuses a push to a queued pull request", () => {
        const r = push(queued);
        assert.equal(r.status, 1);
        assert.match(r.stderr, /#7 is in the Mergify merge queue/);
        assert.match(r.stderr, /@mergifyio dequeue/);
        assert.match(r.stderr, /ALLOW_PUSH_WHILE_QUEUED=1/);
    });

    it("allows a push to a pull request that is not queued", () => {
        assert.equal(push(unqueued).status, 0);
    });

    it("allows a push to a branch with no pull request", () => {
        assert.equal(push(null).status, 0);
    });

    it("allows a push to a closed pull request that kept the label", () => {
        assert.equal(push({ ...queued, state: "MERGED" }).status, 0);
    });

    it("allows a push when gh is missing", () => {
        const r = push(queued, { GH: "/nonexistent/gh" });
        assert.equal(r.status, 0);
    });

    it("allows a deliberate push with ALLOW_PUSH_WHILE_QUEUED=1", () => {
        assert.equal(push(queued, { ALLOW_PUSH_WHILE_QUEUED: "1" }).status, 0);
    });
});
