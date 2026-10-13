/**
 * scripts/run-node-shard.js passes a run only when vitest exited 0, its output holds the vitest summary and the
 * --outputFile the caller named was written whole by this run (tools/shard-verdict.mjs), whether or not the hang
 * watcher took snapshots along the way (issue #2181). It fails, with a named cause, a run that exited 0 without that
 * proof (issue #2111), a run the watcher killed, and a non-zero exit. Each case runs the real wrapper against a stub
 * runner in place of vitest; no device.
 */
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { main, verdict } from "../scripts/run-node-shard.js";

const SUMMARY = " Test Files  1 passed (1)";

let dir = "";
/** A stub that prints one line, then hangs until SIGUSR2 and exits 0 on it with no summary, as the #2111 runs did. */
let hangs = "";
/**
 * A stub that prints one line, stays silent until the watcher's SIGUSR2, then finishes: prints the summary, writes
 * the --outputFile it was given and exits 0, as a legitimately slow GPU test does (#2181).
 */
let slowPasses = "";
/** A stub that ignores SIGUSR2 and never writes again, so the watcher has to kill it. */
let stuck = "";
/** A stub that exits 0 having printed no summary. */
let silent = "";
/** A stub that prints vitest's summary and exits 0. */
let passes = "";
/** A stub that exits 1, as a run with a failing test does. */
let fails = "";

beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), "run-node-shard-"));
    hangs = join(dir, "hangs.mjs");
    slowPasses = join(dir, "slow-passes.mjs");
    stuck = join(dir, "stuck.mjs");
    silent = join(dir, "silent.mjs");
    passes = join(dir, "passes.mjs");
    fails = join(dir, "fails.mjs");
    writeFileSync(
        hangs,
        'process.on("SIGUSR2", () => process.exit(0)); console.log("started"); setInterval(() => {}, 1000);\n',
    );
    writeFileSync(
        slowPasses,
        [
            'import { writeFileSync } from "node:fs";',
            'const out = process.argv.find((a) => a.startsWith("--outputFile="))?.slice("--outputFile=".length);',
            'process.on("SIGUSR2", () => {',
            "    if (out !== undefined) writeFileSync(out, JSON.stringify({ success: true }));",
            `    console.log(${JSON.stringify(SUMMARY)});`,
            "    process.exit(0);",
            "});",
            'console.log("started");',
            "setInterval(() => {}, 1000);",
            "",
        ].join("\n"),
    );
    writeFileSync(stuck, 'process.on("SIGUSR2", () => {}); console.log("started"); setInterval(() => {}, 1000);\n');
    writeFileSync(silent, 'console.log("started");\n');
    writeFileSync(passes, `console.log(${JSON.stringify(SUMMARY)});\n`);
    writeFileSync(fails, "process.exit(1);\n");
});

afterAll(() => {
    rmSync(dir, { recursive: true, force: true });
});

afterEach(() => {
    vi.restoreAllMocks();
});

/**
 * Runs the wrapper with the stub as its runner; returns the exit code and the [shard-verdict] line. Only the cases
 * that must be snapshotted shorten the silence that counts as a hang: a stub that exits at once can still take longer
 * than 200 ms to start on a loaded machine, and must not be snapshotted then (seen in the full node shard, #2158).
 * The snapshotted stubs wait for the signal, not for time, so they are deterministic.
 */
async function run(
    stub: string,
    argv: string[] = [],
    silenceMs = 60_000,
): Promise<{ code: number; verdictLine: string | undefined }> {
    const lines: string[] = [];
    vi.spyOn(console, "log").mockImplementation((...args: unknown[]) => {
        lines.push(args.map(String).join(" "));
    });
    const code = await main(argv, { command: ["node", stub], silenceMs, reportDir: join(dir, "reports") });
    return { code, verdictLine: lines.find((line) => line.startsWith("[shard-verdict]")) };
}

describe("scripts/run-node-shard.js verdict on a real run", () => {
    it.skipIf(process.platform === "win32")(
        "a runner that is snapshotted, then prints the summary, writes its report and exits 0 passes (#2181)",
        async () => {
            const file = join(dir, "slow-report.json");
            const { code, verdictLine } = await run(slowPasses, [`--outputFile=${file}`], 200);
            expect(code).toBe(0);
            expect(verdictLine).toMatch(/^\[shard-verdict\] PASS \(note: the run went 0\.2s silent and 1 process/);
        },
    );

    it.skipIf(process.platform === "win32")(
        "a runner that is snapshotted and exits 0 with no summary fails as no summary (#2111)",
        async () => {
            const { code, verdictLine } = await run(hangs, [], 200);
            expect(code).not.toBe(0);
            expect(verdictLine).toMatch(/^\[shard-verdict\] FAIL exit 0 but 0 of 1 vitest run summaries/);
        },
    );

    it.skipIf(process.platform === "win32")(
        "a runner still silent after every snapshot is killed and fails as hung",
        async () => {
            const { code, verdictLine } = await run(stuck, [], 200);
            expect(code).not.toBe(0);
            expect(verdictLine).toBe("[shard-verdict] FAIL hung: still no output 0.2s after the last snapshot, killed");
        },
    );

    it("a runner that exits non-zero fails with its own code", async () => {
        const { code, verdictLine } = await run(fails);
        expect(code).toBe(1);
        expect(verdictLine).toBe("[shard-verdict] FAIL exit 1");
    });

    it("a runner that exits 0 with no vitest summary fails as no summary", async () => {
        const { code, verdictLine } = await run(silent);
        expect(code).not.toBe(0);
        expect(verdictLine).toMatch(/^\[shard-verdict\] FAIL exit 0 but 0 of 1 vitest run summaries/);
    });

    it("a runner that prints the summary but never writes the named --outputFile fails as no report", async () => {
        const file = join(dir, "never-written.json");
        const { code, verdictLine } = await run(passes, [`--outputFile=${file}`]);
        expect(code).not.toBe(0);
        expect(verdictLine).toBe(
            `[shard-verdict] FAIL exit 0 but no report written by this run: ${file} (missing, stale or not whole JSON)`,
        );
    });

    it("a runner that prints the summary and exits 0 passes", async () => {
        const { code, verdictLine } = await run(passes);
        expect(code).toBe(0);
        expect(verdictLine).toBeUndefined();
    });
});

describe("scripts/run-node-shard.js verdict", () => {
    const base = { status: 0, silenceMs: 90_000, output: " Test Files  3 passed (3)\n" };

    it("passes a non-zero vitest exit through unchanged", () => {
        expect(verdict({ ...base, status: 3 }).exitCode).toBe(3);
    });

    it("believes an exit of 0 with a summary and a written report", () => {
        expect(verdict(base).exitCode).toBe(0);
        expect(verdict({ ...base, outputFile: "r.json", outputWritten: true }).exitCode).toBe(0);
    });

    it("fails a report that was not written whole", () => {
        expect(verdict({ ...base, outputFile: "r.json", outputWritten: false }).exitCode).toBe(1);
    });

    it("names a killed run as hung, with vitest's own non-zero code", () => {
        expect(verdict({ ...base, status: 137, killed: true })).toEqual({
            exitCode: 137,
            cause: "hung: still no output 90s after the last snapshot, killed",
        });
    });
});
