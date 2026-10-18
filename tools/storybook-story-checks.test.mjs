// Tests of tools/storybook-story-checks.mjs (the per-story console and accessibility record).
//
//   node tools/storybook-story-checks.test.mjs
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { a11yViolationCount, recordStory, unexpectedErrors, watchConsole } from "./storybook-story-checks.mjs";

describe("storybook-story-checks", () => {
    it("records console.error calls until stopped, and restores console.error", () => {
        const original = console.error;
        const quiet = () => {};
        console.error = quiet;
        try {
            const watcher = watchConsole();
            console.error("first", new Error("second"));
            assert.deepEqual(watcher.stop(), ["first second"]);
            assert.equal(console.error, quiet);
        } finally {
            console.error = original;
        }
    });

    it("drops what the story or the package expects", () => {
        const messages = ["WebGL context lost", "fetch failed: 404", "real problem"];
        assert.deepEqual(unexpectedErrors(messages, ["404"], [/^WebGL/]), ["real problem"]);
        assert.deepEqual(unexpectedErrors(messages, undefined), messages);
    });

    it("counts the violations of the accessibility reports only", () => {
        const reports = [
            { type: "a11y", result: { violations: [{}, {}] } },
            { type: "other", result: { violations: [{}] } },
            { type: "a11y", result: {} },
        ];
        assert.equal(a11yViolationCount(reports), 2);
        assert.equal(a11yViolationCount(undefined), 0);
    });

    it("writes each story's report, warns in report mode and throws in fail mode", async () => {
        const written = [];
        const writeFile = async (path, text) => {
            written.push([path, JSON.parse(text)]);
        };
        const warn = console.warn;
        const warned = [];
        console.warn = (text) => warned.push(text);
        try {
            const story = { id: "a--b", messages: ["boom"], expected: [], reports: undefined };
            await recordStory(story, { writeFile });
            assert.deepEqual(written, [
                [".storybook-reports/a--b.json", { id: "a--b", consoleErrors: ["boom"], a11yViolations: 0 }],
            ]);
            assert.match(warned[0], /report only\] a--b: 1 unexpected console error/);
            await assert.rejects(recordStory(story, { mode: "fail" }), /expectedConsoleErrors/);
            await recordStory({ ...story, expected: ["boom"] }, { mode: "fail" });
        } finally {
            console.warn = warn;
        }
    });
});
