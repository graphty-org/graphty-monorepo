// node --test design/ui/studio/tool/dry-run-pass.test.mjs
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { previousPass, taskOf } from "./dry-run-pass.mjs";

test("a route's task is its from without spaces", () => {
    assert.equal(taskOf("T42 A"), "T42A");
    assert.equal(taskOf(undefined), "");
});

test("the earlier pass is the newest other pass with a summary", (t) => {
    const walks = mkdtempSync(join(tmpdir(), "dry-run-pass-"));
    t.after(() => rmSync(walks, { recursive: true, force: true }));
    const pass = (tag, secondsAgo) => {
        mkdirSync(join(walks, tag, "script"), { recursive: true });
        if (secondsAgo === null) return;
        const f = join(walks, tag, "script", "summary.json");
        writeFileSync(f, "{}");
        const when = Date.now() / 1000 - secondsAgo;
        utimesSync(f, when, when);
    };
    pass("r1", 300);
    pass("r1d1", 100);
    pass("r1d2", null); // no summary: never finished
    pass("r1d3", 10); // this pass, from an earlier attempt
    assert.equal(previousPass(join(walks, "r1d3", "script")), join(walks, "r1d1", "script"));
    assert.equal(previousPass(join(walks, "r1", "script")), join(walks, "r1d3", "script"));
    assert.equal(previousPass(join(walks, "nowhere", "x", "script")), null);
});
