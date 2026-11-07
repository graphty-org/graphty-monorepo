/**
 * @file In-page code (`tools.inPageCode`): the loop offers `run_code`, runs its program through the
 * sandbox the page loads (here a fake runner standing in for QuickJS), binds only the turn's
 * actions that read, refuses a write from inside a program (reason "in-page-code") with the graph
 * and its history unchanged, and passes the limits and the message's cancel to the runner.
 */

import { assert, describe, it, vi } from "vitest";

import type { AiControllerOptions } from "../../../src/ai/AiController";
import type { ProgramBindings, ProgramLimits, ProgramResult, TurnRequest } from "../../../src/ai/engine/types";
import { assistantSession, digest } from "../../helpers/assistant";
import { fakeDriver, Harness } from "../plans/driver";

/**
 * The fake runner's programs, by source: each a host function over the bindings, as a program
 * would be. The runner enforces the call limit and the cancel the way the sandbox does.
 */
const fake = vi.hoisted(() => {
    type Tools = Readonly<Record<string, (input: unknown) => Promise<unknown>>>;
    const state = {
        limits: undefined as ProgramLimits | undefined,
        bound: [] as string[],
        signal: undefined as AbortSignal | undefined,
        started: (): void => undefined,
    };
    const programs: Record<string, (tools: Tools, signal: AbortSignal) => Promise<unknown>> = {
        count: async (tools) => tools.query({ action: "count", where: "data.type == 'server'" }),
        // `view` is bound for its reads (list_saved); saving a view writes the project.
        save: async (tools) => tools.view({ action: "save", name: "from-code" }),
        many: async (tools) => {
            for (let call = 0; call < 65; call++) {
                await tools.query({ action: "count" });
            }

            return "done";
        },
        wait: (_tools, signal) =>
            new Promise((_resolve, reject) => {
                signal.addEventListener("abort", () => {
                    reject(new Error("program-cancelled"));
                });
                state.started();
            }),
    };
    return { state, programs };
});

vi.mock("../../../src/ai/engine/tanstack/program", () => ({
    openProgramContexts: (): number => 0,
    runProgram: async (
        source: string,
        bindings: ProgramBindings,
        limits: ProgramLimits,
        signal: AbortSignal,
    ): Promise<ProgramResult> => {
        fake.state.limits = limits;
        fake.state.bound = Object.keys(bindings).sort();
        fake.state.signal = signal;
        let calls = 0;
        const tools = Object.fromEntries(
            Object.entries(bindings).map(([name, binding]) => [
                name,
                async (input: unknown): Promise<unknown> => {
                    calls += 1;
                    if (calls > limits.maxCalls) {
                        throw new Error("program-call-limit");
                    }

                    return binding(input);
                },
            ]),
        );
        try {
            const value = await fake.programs[source](tools, signal);
            return { code: "AI_COMPLETED", params: {}, value, logs: [] };
        } catch {
            let cause = signal.aborted ? "program-cancelled" : "program-threw";
            if (calls > limits.maxCalls) {
                cause = "program-call-limit";
            }

            return { code: "AI_TOOL_FAILED", params: { tool: "run_code", cause }, logs: [] };
        }
    },
}));

/**
 * An assistant on the scripted engine.
 * @param tools - The tool options.
 * @returns The harness.
 */
async function assistant(tools?: AiControllerOptions["tools"]): Promise<Harness> {
    return new Harness(await assistantSession(), fakeDriver(), tools === undefined ? {} : { tools });
}

/**
 * The model runs one program, then answers.
 * @param harness - The assistant.
 * @param program - The program's source.
 */
function scriptProgram(harness: Harness, program: string): void {
    harness.driver.push({ calls: [{ tool: "run_code", args: { code: program } }] }, { text: "Done." });
}

/**
 * The `run_code` result the model read next.
 * @param requests - Every request.
 * @returns Its code, params and the value and logs it carried.
 */
function codeResult(requests: readonly TurnRequest[]): {
    code: string;
    params: unknown;
    data: { value?: { code: string; params: Record<string, unknown>; data?: unknown }; logs: string[] };
} {
    const parts = requests.flatMap((request) => request.messages.flatMap((message) => message.parts));
    const call = parts.find((part) => part.type === "tool-call" && part.command === "run_code");
    for (const part of parts) {
        if (part.type === "tool-result" && call?.type === "tool-call" && part.callId === call.callId) {
            const { data } = JSON.parse(part.content) as { data: never };
            return { code: part.code, params: part.params, data };
        }
    }

    throw new Error("no run_code result");
}

describe("run_code", () => {
    it("is not offered by default, and is offered with inPageCode", async () => {
        const plain = await assistant();
        plain.driver.push({ text: "Hi." });
        await plain.controller.execute("hello");
        assert.notInclude(
            plain.driver.requests[0].tools.map((tool) => tool.name),
            "run_code",
        );

        const coding = await assistant({ inPageCode: true });
        coding.driver.push({ text: "Hi." });
        await coding.controller.execute("hello");
        assert.include(
            coding.driver.requests[0].tools.map((tool) => tool.name),
            "run_code",
        );
        assert.deepStrictEqual(
            coding.events.filter((event) => event.type === "ai-capability-unavailable"),
            [],
        );
    });

    it("returns what a program read to the next turn, with the sandbox's limits", async () => {
        const harness = await assistant({ inPageCode: true });
        scriptProgram(harness, "count");

        const result = await harness.controller.execute("count the servers with code");

        assert.strictEqual(result.code, "AI_COMPLETED");
        const read = codeResult(harness.driver.requests);
        assert.strictEqual(read.code, "AI_COMPLETED");
        assert.strictEqual(read.data.value?.code, "AI_OK");
        // Two of SMALL_GRAPH's nodes are servers.
        assert.strictEqual((read.data.value?.data as { nodes: number }).nodes, 2);
        assert.deepStrictEqual(fake.state.limits, { timeoutMs: 5000, maxCalls: 64, maxLogChars: 4000, memoryMb: 16 });
        // Only tools with an action that reads and hands the host nothing are bound.
        assert.include(fake.state.bound, "query");
        assert.notInclude(fake.state.bound, "run_code");
        assert.notInclude(fake.state.bound, "capture");
        assert.notInclude(fake.state.bound, "export_graph");
    });

    it("refuses a write from a program (reason in-page-code), with the graph and its history unchanged", async () => {
        const harness = await assistant({ inPageCode: true });
        const before = await digest(harness.session);
        const steps = harness.session.history.steps.length;
        scriptProgram(harness, "save");

        await harness.controller.execute("save this view with code");

        const read = codeResult(harness.driver.requests);
        assert.strictEqual(read.code, "AI_COMPLETED", "the program itself ran");
        assert.deepStrictEqual(read.data.value, {
            code: "AI_TOOL_DENIED_BY_POLICY",
            params: { tool: "view", reason: "in-page-code" },
        });
        // A tool with no action that only reads is not bound at all.
        assert.notInclude(fake.state.bound, "edit_data");
        assert.strictEqual(await digest(harness.session), before);
        assert.strictEqual(harness.session.history.steps.length, steps, "no undo step");
    });

    it("ends a program past 64 calls with program-call-limit", async () => {
        const harness = await assistant({ inPageCode: true });
        scriptProgram(harness, "many");

        await harness.controller.execute("count a lot");

        const read = codeResult(harness.driver.requests);
        assert.strictEqual(read.code, "AI_TOOL_FAILED");
        assert.deepStrictEqual(read.params, { tool: "run_code", cause: "program-call-limit" });
    });

    it("aborts a running program when the message is cancelled", async () => {
        const harness = await assistant({ inPageCode: true });
        scriptProgram(harness, "wait");
        fake.state.started = (): void => {
            harness.controller.cancel();
        };

        const result = await harness.controller.execute("run something long");

        assert.isTrue(fake.state.signal?.aborted, "the program's signal fired");
        assert.strictEqual(result.code, "AI_CANCELLED");
    });
});
