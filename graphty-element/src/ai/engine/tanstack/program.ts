/**
 * @file In-page code: runs a program the model wrote in a QuickJS sandbox (TanStack Code Mode's
 * isolate driver), with graphty's bindings as `tools.<name>`, outside `chat()`. Only the driver and
 * `stripTypeScript` are used: `createCodeModeTool` writes a TypeScript stub of every tool into its
 * description, which the assistant's tool budget cannot afford. Loaded by `loadProgramRunner()`
 * (../load.ts) as its own chunk, with the WebAssembly beside it.
 */

// The WebAssembly as an asset beside this chunk, which the build writes as
// `new URL("emscripten-module-<hash>.wasm", import.meta.url)`: the form Vite and webpack both
// follow in a consumer's build. `no-inline`: a library build otherwise inlines it as base64.
import WASM_LOCATION from "@jitl/quickjs-wasmfile-release-sync/wasm?url&no-inline";
import { stripTypeScript } from "@tanstack/ai-code-mode";
import { createQuickJSIsolateDriver } from "@tanstack/ai-isolate-quickjs";

import type { ProgramBindings, ProgramFailureCause, ProgramLimits, ProgramResult } from "../types";

type Driver = ReturnType<typeof createQuickJSIsolateDriver>;
type Context = Awaited<ReturnType<Driver["createContext"]>>;
type DriverBindings = Parameters<Driver["createContext"]>[0]["bindings"];

let driver: Driver | undefined;
let open = 0;

/**
 * How many sandboxes are open now: 0 whenever no program runs, since each is disposed on every path.
 * @returns The count.
 */
export function openProgramContexts(): number {
    return open;
}

const IDENTIFIER = /^[A-Za-z_]\w*$/;

/**
 * Whether this runs in Node (a test harness, a server): there QuickJS reads its WebAssembly from
 * its own package's file, and a page URL such as a dev server's would not open.
 * @returns True in Node.
 */
function inNode(): boolean {
    const { process } = globalThis as { process?: { versions?: { node?: string } } };
    return typeof process?.versions?.node === "string";
}

/**
 * The code that runs before the program: `tools` holds the bindings, and `console` keeps at most
 * `maxLogChars` characters, so a runaway loop cannot fill the page's memory with log lines.
 * @param names - The bindings' names.
 * @param maxLogChars - The console cap.
 * @returns The code.
 */
function prelude(names: readonly string[], maxLogChars: number): string {
    const tools = names.map((name) => `${name}: tool$${name}`).join(", ");
    return `const tools = Object.freeze({ ${tools} });
(() => {
    const c = console;
    let left = ${maxLogChars};
    const capped = (write) => (...args) => {
        if (left <= 0) return;
        const line = args.map((a) => (typeof a === "string" ? a : JSON.stringify(a))).join(" ").slice(0, left);
        left -= line.length;
        write(line);
    };
    globalThis.console = Object.freeze({ log: capped(c.log), info: capped(c.info), warn: capped(c.warn), error: capped(c.error) });
})();`;
}

/**
 * Lines of console output, cut at `maxLogChars` characters in all (the driver prefixes some).
 * @param lines - The lines.
 * @param maxLogChars - The cap.
 * @returns The lines kept.
 */
function capLogs(lines: readonly string[], maxLogChars: number): string[] {
    const kept: string[] = [];
    let left = maxLogChars;
    for (const line of lines) {
        if (left <= 0) {
            break;
        }

        kept.push(line.slice(0, left));
        left -= line.length;
    }

    return kept;
}

/**
 * A failed program's result.
 * @param cause - Why it failed.
 * @param logs - Its console output.
 * @param error - The program's own error, for `program-threw`.
 * @param error.name - Its name.
 * @param error.message - Its message.
 * @returns The result.
 */
function failed(
    cause: ProgramFailureCause,
    logs: readonly string[],
    error?: { name: string; message: string },
): ProgramResult {
    const params: Record<string, string> = { tool: "run_code", cause };
    if (error !== undefined) {
        params.name = error.name;
        params.message = error.message;
    }

    return { code: "AI_TOOL_FAILED", params, logs };
}

/**
 * The cause of a driver error.
 * @param name - The driver's normalized error name.
 * @returns The cause.
 */
function causeOf(name: string): ProgramFailureCause {
    switch (name) {
        case "TimeoutError":
            return "program-timeout";
        case "MemoryLimitError":
        case "StackOverflowError":
            return "program-memory";
        default:
            return "program-threw";
    }
}

/**
 * Run one program in a fresh sandbox. Its bindings are `tools.<name>`; it ends with `return`.
 * TypeScript syntax is stripped first. The sandbox is disposed on every path, also on abort.
 * @param source - The program.
 * @param bindings - The host functions it may call.
 * @param limits - How far it may go.
 * @param signal - Aborts it (`program-cancelled`).
 * @returns What it did.
 */
export async function runProgram(
    source: string,
    bindings: ProgramBindings,
    limits: ProgramLimits,
    signal: AbortSignal,
): Promise<ProgramResult> {
    if (signal.aborted) {
        return failed("program-cancelled", []);
    }

    const names = Object.keys(bindings);
    const invalid = names.find((name) => !IDENTIFIER.test(name));
    if (invalid !== undefined) {
        throw new TypeError(`binding name ${invalid} is not an identifier`);
    }

    let js: string;
    try {
        js = await stripTypeScript(source);
    } catch (error) {
        return failed("program-threw", [], { name: "SyntaxError", message: (error as Error).message });
    }

    let calls = 0;
    let overLimit = false;
    const aborted = new Promise<"cancelled">((resolve) => {
        signal.addEventListener(
            "abort",
            () => {
                resolve("cancelled");
            },
            { once: true },
        );
    });
    const driverBindings: DriverBindings = {};
    for (const name of names) {
        driverBindings[`tool$${name}`] = {
            name,
            description: "",
            inputSchema: {},
            execute: async (input: unknown): Promise<unknown> => {
                calls += 1;
                if (calls > limits.maxCalls) {
                    overLimit = true;
                }

                if (overLimit || signal.aborted) {
                    throw new Error(overLimit ? "program-call-limit" : "program-cancelled");
                }

                // A cancel settles a pending call at once, so the program unwinds and the sandbox can close.
                const result = await Promise.race([bindings[name](input), aborted]);
                if (signal.aborted) {
                    throw new Error("program-cancelled");
                }

                return result;
            },
        };
    }

    driver ??= createQuickJSIsolateDriver(inNode() ? {} : { wasmLocation: WASM_LOCATION });
    const context: Context = await driver.createContext({
        bindings: driverBindings,
        timeout: limits.timeoutMs,
        memoryLimit: limits.memoryMb,
    });
    open += 1;
    try {
        const outcome = await Promise.race([
            context.execute(`${prelude(names, limits.maxLogChars)}\n{\n${js}\n}`),
            aborted,
        ]);
        if (outcome === "cancelled") {
            return failed("program-cancelled", []);
        }

        const logs = capLogs(outcome.logs ?? [], limits.maxLogChars);
        if (signal.aborted) {
            return failed("program-cancelled", logs);
        }

        if (overLimit) {
            return failed("program-call-limit", logs);
        }

        if (!outcome.success) {
            const error = outcome.error ?? { name: "Error", message: "" };
            const cause = causeOf(error.name);
            return failed(cause, logs, cause === "program-threw" ? error : undefined);
        }

        return { code: "AI_COMPLETED", params: {}, value: outcome.value, logs };
    } finally {
        await context.dispose();
        open -= 1;
    }
}
