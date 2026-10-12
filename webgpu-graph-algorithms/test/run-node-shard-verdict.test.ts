/**
 * scripts/run-node-shard.js fails closed (issue #2111): a run vitest reports as passing still fails, with a named
 * cause, when the hang watcher had to signal it, when its output holds no vitest summary, or when the --outputFile the
 * caller named was not written. Each case runs the real wrapper against a stub runner in place of vitest; no device.
 */
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { main, verdict } from "../scripts/run-node-shard.js";

let dir = "";
/** A stub that prints one line, then hangs until SIGUSR2 and exits 0 on it, as the killed runs did. */
let hangs = "";
/** A stub that exits 0 having printed no summary. */
let silent = "";
/** A stub that prints vitest's summary and exits 0. */
let passes = "";

beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), "run-node-shard-"));
    hangs = join(dir, "hangs.mjs");
    silent = join(dir, "silent.mjs");
    passes = join(dir, "passes.mjs");
    writeFileSync(
        hangs,
        'process.on("SIGUSR2", () => process.exit(0)); console.log("started"); setInterval(() => {}, 1000);\n',
    );
    writeFileSync(silent, 'console.log("started");\n');
    writeFileSync(passes, 'console.log(" Test Files  1 passed (1)");\n');
});

afterAll(() => {
    rmSync(dir, { recursive: true, force: true });
});

afterEach(() => {
    vi.restoreAllMocks();
});

/** Runs the wrapper with the stub as its runner; returns the exit code and the [shard-verdict] line. */
async function run(stub: string, argv: string[] = []): Promise<{ code: number; verdictLine: string | undefined }> {
    const lines: string[] = [];
    vi.spyOn(console, "log").mockImplementation((...args: unknown[]) => {
        lines.push(args.map(String).join(" "));
    });
    const code = await main(argv, { command: ["node", stub], silenceMs: 200, reportDir: join(dir, "reports") });
    return { code, verdictLine: lines.find((line) => line.startsWith("[shard-verdict]")) };
}

describe("scripts/run-node-shard.js fails closed (issue #2111)", () => {
    it.skipIf(process.platform === "win32")(
        "a runner that hangs, is signalled by the hang watcher and exits 0 fails as hung",
        async () => {
            const { code, verdictLine } = await run(hangs);
            expect(code).not.toBe(0);
            expect(verdictLine).toBe("[shard-verdict] FAIL hung: no output for 0.2s, signalled 1 process(es)");
        },
    );

    it("a runner that exits 0 with no vitest summary fails as no summary", async () => {
        const { code, verdictLine } = await run(silent);
        expect(code).not.toBe(0);
        expect(verdictLine).toBe(
            "[shard-verdict] FAIL no vitest summary: the run exited 0 without printing Test Files",
        );
    });

    it("a runner that prints the summary but never writes the named --outputFile fails as no JSON report", async () => {
        const file = join(dir, "never-written.json");
        const { code, verdictLine } = await run(passes, [`--outputFile=${file}`]);
        expect(code).not.toBe(0);
        expect(verdictLine).toBe(`[shard-verdict] FAIL no JSON report: ${file} was not written by this run`);
    });

    it("a runner that prints the summary and exits 0 passes", async () => {
        const { code, verdictLine } = await run(passes);
        expect(code).toBe(0);
        expect(verdictLine).toBeUndefined();
    });
});

describe("scripts/run-node-shard.js verdict", () => {
    const base = { status: 0, signalled: 0, silenceMs: 90_000, output: " Test Files  3 passed (3)\n" };

    it("passes a non-zero vitest exit through unchanged", () => {
        expect(verdict({ ...base, status: 3 }).exitCode).toBe(3);
    });

    it("believes an exit of 0 with a summary, a run that matched no file, and a written report", () => {
        expect(verdict(base).exitCode).toBe(0);
        expect(verdict({ ...base, output: "No test files found, exiting with code 0\n" }).exitCode).toBe(0);
        expect(verdict({ ...base, outputFile: "r.json", outputWritten: true }).exitCode).toBe(0);
    });

    it("names the production threshold in the hung cause", () => {
        expect(verdict({ ...base, signalled: 6 }).cause).toBe("hung: no output for 90s, signalled 6 process(es)");
    });

    it("names a signalled run that was then killed as hung, with vitest's own non-zero code", () => {
        expect(verdict({ ...base, status: 137, signalled: 2 })).toEqual({
            exitCode: 137,
            cause: "hung: no output for 90s, signalled 2 process(es)",
        });
    });
});
