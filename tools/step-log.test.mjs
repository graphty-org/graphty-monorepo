// Tests of tools/step-log.mjs: where the step log goes, and what one line holds.
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, describe, it } from "node:test";

import { logStep, stepLogFile } from "./step-log.mjs";

const dir = mkdtempSync(join(tmpdir(), "step-log-test-"));
after(() => rmSync(dir, { recursive: true, force: true }));

describe("step-log.mjs", () => {
    it("writes to PIPELINE_STEP_LOG, nowhere when it is off, else beside the main checkout's waits log", () => {
        assert.equal(stepLogFile({ PIPELINE_STEP_LOG: "/x/y.jsonl" }), "/x/y.jsonl");
        assert.equal(stepLogFile({ PIPELINE_STEP_LOG: "off" }), null);
        assert.match(stepLogFile({}), /\/tmp\/step-times\.jsonl$/);
    });

    it("appends one line per step in the waits log's format, with what ran and its exit code", () => {
        const file = join(dir, "a.jsonl");
        const env = { PIPELINE_STEP_LOG: file };
        assert.equal(logStep(["check-quick-step", "1000", "Formatting", "0"], env), true);
        assert.equal(logStep(["pr-open", "2000", "total", "3"], env), true);
        const lines = readFileSync(file, "utf8")
            .trim()
            .split("\n")
            .map((l) => JSON.parse(l));
        assert.equal(lines.length, 2);
        assert.equal(lines[0].kind, "check-quick-step");
        assert.equal(lines[0].start, new Date(1000).toISOString());
        assert.equal(lines[0].what, "Formatting");
        assert.equal(lines[0].exit, 0);
        assert.equal(lines[0].ms, Date.parse(lines[0].end) - 1000);
        assert.equal(lines[0].pid, process.ppid, "the script that ran the step");
        assert.deepEqual(lines[0].heldBy, []);
        assert.equal(lines[1].exit, 3);
    });

    it("writes nothing for arguments that are not a step, and an unknown exit code is null", () => {
        const file = join(dir, "b.jsonl");
        const env = { PIPELINE_STEP_LOG: file };
        assert.equal(logStep([], env), false);
        assert.equal(logStep(["pr-open", "soon"], env), false);
        assert.equal(logStep(["pr-open", "5"], env), true);
        const lines = readFileSync(file, "utf8").trim().split("\n");
        assert.equal(lines.length, 1);
        assert.equal(JSON.parse(lines[0]).exit, null);
    });

    it("never throws when the log cannot be written", () => {
        // its directory is a file, so neither the directory nor the log can be made
        const blocker = join(dir, "a-file");
        writeFileSync(blocker, "");
        assert.equal(logStep(["pr-open", "5", "total", "0"], { PIPELINE_STEP_LOG: join(blocker, "log.jsonl") }), true);
    });
});
