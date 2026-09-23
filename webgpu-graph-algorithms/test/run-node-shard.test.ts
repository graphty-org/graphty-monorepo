/**
 * scripts/run-node-shard.js: the file-set logic that names the process that died.
 *
 * When a forked vitest worker dies the pool reports one closed channel and the run ends with no summary, so the only
 * evidence of WHICH test file went down is the reporter's own output: the files it announced minus the files it
 * printed a result for. These cases pin that difference against the exact lines vitest's reporters write, colour
 * escapes and all, without needing a device.
 */
import { formatMissingFiles, missingTestFiles } from "../scripts/run-node-shard.js";

/** The reporters' pass glyph, built from its code point so this source stays plain ASCII. */
const TICK = String.fromCharCode(0x2713);
/** The reporters' fail glyph. */
const CROSS = String.fromCharCode(0x00d7);
/** The escape that opens every colour sequence the reporters write. */
const ESC = String.fromCharCode(27);

/** Wraps text in the green colour escapes the default reporter puts around a pass glyph. */
function green(text: string): string {
    return `${ESC}[32m${text}${ESC}[39m`;
}

/** The two lines vitest prints when a test file writes to stderr, which every node test file does from its setup. */
function announced(file: string): string {
    return `stderr | ${file}\n[gpu] adapter vendor=mesa architecture=software device=llvmpipe software=true`;
}

/** The default reporter's per-file result line, as it appears in a continuous integration log. */
function passed(file: string, tests: number): string {
    return ` ${green(TICK)} ${ESC}[30m${ESC}[43m node ${ESC}[49m${ESC}[39m ${file} ${ESC}[2m(${String(tests)} tests)${ESC}[22m 60ms`;
}

/** The default reporter's per-file result line for a file with a failing test. */
function failed(file: string, tests: number): string {
    return ` ${ESC}[31m${CROSS}${ESC}[39m  node  ${file} (${String(tests)} tests | 1 failed) 90ms`;
}

describe("scripts/run-node-shard.js missingTestFiles (the set difference a dead worker leaves)", () => {
    it("reports nothing missing when every file that started also reported", () => {
        const output = [
            announced("test/errors.test.ts"),
            passed("test/errors.test.ts", 9),
            announced("test/index.test.ts"),
            passed("test/index.test.ts", 4),
            "",
            " Test Files  2 passed (2)",
        ].join("\n");
        const sets = missingTestFiles(output);
        expect(sets.started).toEqual(["test/errors.test.ts", "test/index.test.ts"]);
        expect(sets.reported).toEqual(["test/errors.test.ts", "test/index.test.ts"]);
        expect(sets.missing).toEqual([]);
        expect(formatMissingFiles(sets)).toContain("[missing-files] started 2, reported 2, missing 0");
        expect(formatMissingFiles(sets)).toContain("the death is elsewhere");
    });

    it("names the one file that started and never reported", () => {
        const output = [
            announced("test/errors.test.ts"),
            passed("test/errors.test.ts", 9),
            announced("test/layouts/grid-settle.test.ts"),
            announced("test/index.test.ts"),
            passed("test/index.test.ts", 4),
            "Unhandled Rejection: Channel closed",
        ].join("\n");
        const sets = missingTestFiles(output);
        expect(sets.started).toHaveLength(3);
        expect(sets.reported).toHaveLength(2);
        expect(sets.missing).toEqual(["test/layouts/grid-settle.test.ts"]);
        const block = formatMissingFiles(sets);
        expect(block).toContain("[missing-files] started 3, reported 2, missing 1");
        expect(block).toContain("[missing-files] no result for test/layouts/grid-settle.test.ts");
    });

    it("names every file when a whole worker's batch went down, in sorted order", () => {
        const output = [
            announced("test/kernel/batch.test.ts"),
            announced("test/layouts/fa2.test.ts"),
            announced("test/algorithms/pagerank.test.ts"),
            announced("test/errors.test.ts"),
            passed("test/errors.test.ts", 9),
            failed("test/kernel/batch.test.ts", 12),
        ].join("\n");
        const sets = missingTestFiles(output);
        expect(sets.missing).toEqual(["test/algorithms/pagerank.test.ts", "test/layouts/fa2.test.ts"]);
        expect(formatMissingFiles(sets)).toContain("started 4, reported 2, missing 2");
    });

    it("counts a failing file as reported: a red test is not a vanished process", () => {
        const sets = missingTestFiles(
            [announced("test/kernel/batch.test.ts"), failed("test/kernel/batch.test.ts", 12)].join("\n"),
        );
        expect(sets.reported).toEqual(["test/kernel/batch.test.ts"]);
        expect(sets.missing).toEqual([]);
    });

    it("says nothing is missing when there was no output at all", () => {
        const sets = missingTestFiles("");
        expect(sets).toEqual({ started: [], reported: [], missing: [] });
        expect(formatMissingFiles(sets)).toContain("[missing-files] started 0, reported 0, missing 0");
    });

    it("names the in-flight file when the output stops mid-line", () => {
        const output = `${[
            announced("test/errors.test.ts"),
            passed("test/errors.test.ts", 9),
            "stderr | test/limits/layout-1m.test.ts",
        ].join("\n")}\n[gpu] adapter vendor=mesa archi`;
        const sets = missingTestFiles(output);
        expect(sets.missing).toEqual(["test/limits/layout-1m.test.ts"]);
        expect(formatMissingFiles(sets)).toContain("no result for test/limits/layout-1m.test.ts");
    });

    it("reads the verbose reporter's per-test lines as a report for their file", () => {
        const output = [
            announced("test/errors.test.ts"),
            ` ${green(TICK)} |node| test/errors.test.ts > WebGpuGraphError > carries the code 2ms`,
            announced("test/leak.test.ts"),
        ].join("\n");
        const sets = missingTestFiles(output);
        expect(sets.reported).toEqual(["test/errors.test.ts"]);
        expect(sets.missing).toEqual(["test/leak.test.ts"]);
    });

    it("ignores stack frames and paths that are not a test file", () => {
        const output = [
            announced("test/errors.test.ts"),
            passed("test/errors.test.ts", 9),
            "    at Object.teardown (/home/runner/webgpu-graph-algorithms/test/setup/global.ts:120:11)",
            "stderr | src/context.ts",
        ].join("\n");
        const sets = missingTestFiles(output);
        expect(sets.started).toEqual(["test/errors.test.ts"]);
        expect(sets.missing).toEqual([]);
    });
});
