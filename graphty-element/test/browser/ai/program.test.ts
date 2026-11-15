/**
 * @file The in-page code sandbox as the build ships it: the program chunk in `dist/chunks/`, its
 * QuickJS WebAssembly loaded from beside it, run in Chromium. Build first (`npm run build`).
 */

import { assert, describe, it } from "vitest";

import type { ProgramModule } from "../../../src/ai/engine/load";
import type { ProgramLimits } from "../../../src/ai/engine/types";

const built = import.meta.glob<ProgramModule>("../../../dist/chunks/program-*.js");

/**
 * The built program chunk.
 * @returns Its runner and its open-sandbox count.
 */
async function sandbox(): Promise<ProgramModule> {
    const [load, ...more] = Object.values(built);
    assert.ok(load, "dist/chunks/program-*.js is missing: run npm run build first");
    assert.isEmpty(more, "one program chunk in dist/chunks: rebuild into a clean dist/");
    return load();
}

const LIMITS: ProgramLimits = { timeoutMs: 5000, maxCalls: 64, maxLogChars: 4000, memoryMb: 16 };
const never = new AbortController().signal;

describe("in-page code sandbox (built chunk)", () => {
    it("runs a program and returns its value", async () => {
        const { runProgram } = await sandbox();
        const result = await runProgram("return 1 + 1", {}, LIMITS, never);
        assert.deepEqual(result, { code: "AI_COMPLETED", params: {}, value: 2, logs: [] });
    });

    it("strips TypeScript before running", async () => {
        const { runProgram } = await sandbox();
        const result = await runProgram("const n: number = 3;\nreturn n * 2;", {}, LIMITS, never);
        assert.strictEqual(result.value, 6);
    });

    it("hands a binding's host value to the program and back", async () => {
        const { runProgram } = await sandbox();
        const seen: unknown[] = [];
        const result = await runProgram(
            'const c = await tools.count({ of: "nodes" });\nreturn { got: c, doubled: c.n * 2 };',
            {
                count: (input) => {
                    seen.push(input);
                    return Promise.resolve({ n: 21 });
                },
            },
            LIMITS,
            never,
        );
        assert.deepEqual(seen, [{ of: "nodes" }]);
        assert.deepEqual(result.value, { got: { n: 21 }, doubled: 42 });
    });

    it("interrupts an endless loop as program-timeout", async () => {
        const { runProgram, openProgramContexts } = await sandbox();
        const result = await runProgram("while (true) {}", {}, { ...LIMITS, timeoutMs: 200 }, never);
        assert.strictEqual(result.code, "AI_TOOL_FAILED");
        assert.strictEqual(result.params.cause, "program-timeout");
        assert.strictEqual(openProgramContexts(), 0);
    });

    it("keeps console output at the cap", async () => {
        const { runProgram } = await sandbox();
        const result = await runProgram(
            'for (let i = 0; i < 10000; i++) console.log("line", i);\nreturn "done";',
            {},
            LIMITS,
            never,
        );
        assert.strictEqual(result.value, "done");
        assert.strictEqual(result.logs.join("").length, LIMITS.maxLogChars);
        assert.strictEqual(result.logs[0], "line 0");
    });

    it("cancels on abort and disposes the sandbox", async () => {
        const { runProgram, openProgramContexts } = await sandbox();
        const controller = new AbortController();
        let entered: () => void = () => undefined;
        const waiting = new Promise<void>((resolve) => {
            entered = resolve;
        });
        let later = 0;
        const running = runProgram(
            "await tools.wait({});\nawait tools.later({});\nreturn 1;",
            {
                wait: () => {
                    entered();
                    return new Promise(() => undefined);
                },
                later: () => {
                    later += 1;
                    return Promise.resolve(0);
                },
            },
            LIMITS,
            controller.signal,
        );
        await waiting;
        assert.strictEqual(openProgramContexts(), 1, "the sandbox is open while the program waits");
        controller.abort();
        const result = await running;
        assert.strictEqual(result.params.cause, "program-cancelled");
        assert.strictEqual(openProgramContexts(), 0, "the sandbox was disposed");
        assert.strictEqual(later, 0, "nothing ran after the cancel");
    });

    it("reaches no page global", async () => {
        const { runProgram } = await sandbox();
        const result = await runProgram(
            "return [typeof fetch, typeof globalThis.document, typeof window, typeof XMLHttpRequest, typeof WebSocket];",
            {},
            LIMITS,
            never,
        );
        assert.deepEqual(result.value, ["undefined", "undefined", "undefined", "undefined", "undefined"]);
    });

    it("reports a throw with the program's own error", async () => {
        const { runProgram } = await sandbox();
        const result = await runProgram('throw new RangeError("too far");', {}, LIMITS, never);
        assert.deepEqual(result.params, {
            tool: "run_code",
            cause: "program-threw",
            name: "RangeError",
            message: "too far",
        });
    });

    it("stops a program past its binding calls as program-call-limit", async () => {
        const { runProgram } = await sandbox();
        let calls = 0;
        const result = await runProgram(
            "for (let i = 0; i < 10; i++) { try { await tools.ping({}); } catch {} }\nreturn 1;",
            {
                ping: () => {
                    calls += 1;
                    return Promise.resolve(true);
                },
            },
            { ...LIMITS, maxCalls: 3 },
            never,
        );
        assert.strictEqual(result.params.cause, "program-call-limit");
        assert.strictEqual(calls, 3);
    });

    it("stops a program past its memory as program-memory", async () => {
        const { runProgram, openProgramContexts } = await sandbox();
        const result = await runProgram(
            // Arrays, not repeated strings: QuickJS builds a repeated string as a rope of shared
            // pieces, so a thousand copies of one take almost no memory.
            "const a = [];\nwhile (true) a.push(new Array(1000).fill(a.length));",
            {},
            { ...LIMITS, memoryMb: 4 },
            never,
        );
        assert.strictEqual(result.params.cause, "program-memory");
        assert.strictEqual(openProgramContexts(), 0);
    });
});
