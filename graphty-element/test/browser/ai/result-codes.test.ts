/**
 * @file Every AI command result carries a code from `AI_RESULT_CODES`, and every code in the
 * table is one a command can end with.
 *
 * Each test drives one path through the controller or the manager and records the code it ended
 * with; the last test fails when a code in the table was never reached, so the table cannot list
 * a code nothing returns. The compiler checks the other direction: `ExecutionResult.code` is an
 * `AiResultCode`, so a code missing from the table does not build.
 */

import { afterAll, assert, beforeEach, describe, it } from "vitest";
import { z } from "zod";

import { AI_RESULT_CODES } from "../../../catalog";
import { createGraphSession, type GraphSession } from "../../../session";
import { AiController, type ExecutionResult } from "../../../src/ai/AiController";
import { AiManager } from "../../../src/ai/AiManager";
import { CommandRegistry } from "../../../src/ai/commands";
import type { CommandContext } from "../../../src/ai/commands/types";
import { MockLlmProvider } from "../../../src/ai/providers/MockLlmProvider";
import type { LlmProvider, LlmResponse } from "../../../src/ai/providers/types";
import { VercelAiProvider } from "../../../src/ai/providers/VercelAiProvider";

const reached = new Set<string>();

/**
 * Record a result's code.
 * @param result - The result.
 * @returns The result.
 */
function seen(result: ExecutionResult): ExecutionResult {
    assert.isDefined(result.code, "every result carries a code");
    assert.isDefined(result.params, "every result carries params");
    reached.add(result.code);
    return result;
}

/**
 * A response that calls one tool.
 * @param name - The tool.
 * @param args - Its arguments.
 * @returns The response.
 */
function call(name: string, args: Record<string, unknown> = {}): LlmResponse {
    return { text: "", toolCalls: [{ id: name, name, arguments: args }] };
}

/**
 * A model that calls one tool, then waits on its second ask until the message is aborted.
 * @returns The provider and a promise that settles when the second ask has begun.
 */
function stallingModel(): { provider: LlmProvider; asked: Promise<void> } {
    let asks = 0;
    let markAsked: () => void = () => undefined;
    const asked = new Promise<void>((resolve) => {
        markAsked = resolve;
    });
    const provider: LlmProvider = {
        name: "stalling",
        supportsStreaming: false,
        supportsTools: true,
        configure: () => undefined,
        generate: (_messages, _tools, options) => {
            asks++;
            if (asks === 1) {
                return Promise.resolve(call("addNode", { id: "x" }));
            }

            markAsked();
            return new Promise<never>((_, reject) => {
                options?.signal?.addEventListener("abort", () => {
                    reject(options.signal?.reason as Error);
                });
            });
        },
        generateStream: () => Promise.reject(new Error("not used")),
        validateApiKey: () => Promise.resolve(true),
    };
    return { provider, asked };
}

describe("AI command result codes", () => {
    let session: GraphSession;
    let registry: CommandRegistry;
    let mock: MockLlmProvider;

    beforeEach(() => {
        session = createGraphSession();
        mock = new MockLlmProvider();
        registry = new CommandRegistry();
        registry.register({
            name: "addNode",
            description: "Adds a node",
            parameters: z.object({ id: z.string() }),
            examples: [],
            execute: async (_graph, params, context) => {
                await context?.tx.data.addNodes([{ id: String(params.id) }]);
                return { success: true, message: "added" };
            },
        });
        registry.register({
            name: "refuse",
            description: "Reports failure",
            parameters: z.object({}),
            examples: [],
            execute: () => Promise.resolve({ success: false, message: "no" }),
        });
        registry.register({
            name: "explode",
            description: "Throws",
            parameters: z.object({}),
            examples: [],
            execute: () => Promise.reject(new Error("boom")),
        });
    });

    /**
     * An assistant over the session.
     * @param provider - Its model.
     * @param graph - The graph, when not the session's.
     * @returns The controller.
     */
    function assistant(provider: LlmProvider = mock, graph?: CommandContext["graph"]): AiController {
        return new AiController({
            provider,
            commandRegistry: registry,
            graph: graph ?? ({ getSession: () => session } as unknown as CommandContext["graph"]),
        });
    }

    it("AI_COMPLETED for an answer, counting the tools that ran", async () => {
        mock.setDefaultResponse({ text: "hi", toolCalls: [] });
        const answered = seen(await assistant().execute("hello"));
        assert.isTrue(answered.success);
        assert.strictEqual(answered.code, "AI_COMPLETED");
        assert.deepEqual(answered.params, { toolCalls: 0 });

        mock.setResponse("add", call("addNode", { id: "a" }));
        const ran = seen(await assistant().execute("add"));
        assert.strictEqual(ran.code, "AI_COMPLETED");
        assert.deepEqual(ran.params, { toolCalls: 1 });
    });

    it("AI_NO_RESPONSE when the model says nothing and calls nothing", async () => {
        mock.setDefaultResponse({ text: "", toolCalls: [] });
        const result = seen(await assistant().execute("hello"));
        assert.isTrue(result.success);
        assert.strictEqual(result.code, "AI_NO_RESPONSE");
    });

    it("AI_TOOL_UNKNOWN, AI_TOOL_INVALID_ARGUMENTS, AI_TOOL_FAILED and AI_TOOL_THREW name the tool", async () => {
        const cases = [
            [call("nope"), "AI_TOOL_UNKNOWN", "nope"],
            [call("addNode", { id: 7 }), "AI_TOOL_INVALID_ARGUMENTS", "addNode"],
            [call("refuse"), "AI_TOOL_FAILED", "refuse"],
            [call("explode"), "AI_TOOL_THREW", "explode"],
        ] as const;
        for (const [response, code, tool] of cases) {
            mock.setResponse("go", response);
            const result = seen(await assistant().execute("go"));
            assert.isFalse(result.success, code);
            assert.strictEqual(result.code, code);
            assert.deepEqual(result.params, { tool });
        }
    });

    it("AI_PROVIDER_ERROR and AI_KEY_REJECTED name the provider and the HTTP status", async () => {
        mock.setError(new Error("network down"));
        const failed = seen(await assistant().execute("hello"));
        assert.strictEqual(failed.code, "AI_PROVIDER_ERROR");
        assert.deepEqual(failed.params, { provider: "mock" });

        mock.setError(Object.assign(new Error("overloaded"), { statusCode: 529 }));
        assert.deepEqual(seen(await assistant().execute("hello")).params, { provider: "mock", status: 529 });

        mock.setError(Object.assign(new Error("bad key"), { statusCode: 401 }));
        const rejected = seen(await assistant().execute("hello"));
        assert.strictEqual(rejected.code, "AI_KEY_REJECTED");
        assert.deepEqual(rejected.params, { provider: "mock", status: 401 });
    });

    it("AI_KEY_MISSING when the provider has no key", async () => {
        const result = seen(await assistant(new VercelAiProvider("openai")).execute("hello"));
        assert.isFalse(result.success);
        assert.strictEqual(result.code, "AI_KEY_MISSING");
        assert.deepEqual(result.params, { provider: "openai" });
    });

    it("AI_CANCELLED when cancelled, AI_UNDONE when undone while it runs", async () => {
        const cancelling = stallingModel();
        const controller = assistant(cancelling.provider);
        const cancelled = controller.execute("add x");
        await cancelling.asked;
        controller.cancel();
        assert.strictEqual(seen(await cancelled).code, "AI_CANCELLED");

        const undoing = stallingModel();
        const undone = assistant(undoing.provider).execute("add x");
        await undoing.asked;
        await session.undo();
        const result = seen(await undone);
        assert.isFalse(result.success);
        assert.strictEqual(result.code, "AI_UNDONE");
    });

    it("AI_FAILED when something other than the provider or a tool fails", async () => {
        const broken = {
            getSession: () => {
                throw new Error("no session");
            },
        } as unknown as CommandContext["graph"];
        const result = seen(await assistant(mock, broken).execute("hello"));
        assert.strictEqual(result.code, "AI_FAILED");
        assert.deepEqual(result.params, {});
    });

    it("AI_DISPOSED and AI_NOT_ENABLED before or after the assistant runs", async () => {
        const controller = assistant();
        controller.dispose();
        assert.strictEqual(seen(await controller.execute("hello")).code, "AI_DISPOSED");

        const manager = new AiManager();
        assert.strictEqual(seen(await manager.execute("hello")).code, "AI_NOT_ENABLED");
        manager.dispose();
        assert.strictEqual(seen(await manager.execute("hello")).code, "AI_DISPOSED");
    });

    afterAll(() => {
        assert.sameMembers([...reached], [...AI_RESULT_CODES], "every code in AI_RESULT_CODES is reached");
    });
});
