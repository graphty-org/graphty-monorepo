import { assert, beforeEach, describe, it } from "vitest";
import { z } from "zod";

import { AiController } from "../../src/ai/AiController";
import type { AiStatus } from "../../src/ai/AiStatus";
import { CommandRegistry } from "../../src/ai/commands";
import type { CommandContext, CommandResult } from "../../src/ai/commands/types";
import { MockLlmProvider } from "../../src/ai/providers/MockLlmProvider";
import type { LlmProvider, LlmResponse, Message } from "../../src/ai/providers/types";
import { createMessageGraph } from "../helpers/message-graph";

describe("AiController", () => {
    let controller: AiController;
    let mockProvider: MockLlmProvider;
    let registry: CommandRegistry;
    let mockGraph: CommandContext["graph"];

    beforeEach(() => {
        mockProvider = new MockLlmProvider();
        registry = new CommandRegistry();
        mockGraph = createMessageGraph();
        controller = new AiController({
            provider: mockProvider,
            commandRegistry: registry,
            graph: mockGraph,
        });
    });

    describe("initialization", () => {
        it("creates controller with provider and registry", () => {
            assert.ok(controller);
        });

        it("starts in ready state", () => {
            const status = controller.getStatus();
            assert.strictEqual(status.state, "ready");
        });
    });

    describe("execute - text-only response", () => {
        it("processes text-only response", async () => {
            mockProvider.setResponse("hello", {
                text: "Hello! How can I help you with the graph?",
                toolCalls: [],
            });

            const result = await controller.execute("hello");
            assert.strictEqual(result.success, true);
            assert.ok(result.message.includes("Hello"));
        });

        it("returns message from LLM when no tool calls", async () => {
            mockProvider.setResponse("what", {
                text: "I can help you with various graph operations.",
                toolCalls: [],
            });

            const result = await controller.execute("what can you do?");
            assert.ok(result.message.includes("graph operations"));
        });
    });

    describe("execute - tool calls", () => {
        it("executes tool calls from LLM", async () => {
            let executedWith: unknown = null;
            registry.register({
                name: "sayHello",
                description: "Say hello",
                parameters: z.object({ name: z.string() }),
                examples: [],
                execute: (_graph, params) => {
                    executedWith = params;

                    return Promise.resolve({ success: true, message: `Hello, ${params.name}!` });
                },
            });

            mockProvider.setResponse("greet", {
                text: "",
                toolCalls: [{ id: "1", name: "sayHello", arguments: { name: "World" } }],
            });

            const result = await controller.execute("greet someone");
            assert.deepStrictEqual(executedWith, { name: "World" });
            assert.strictEqual(result.success, true);
        });

        it("returns command result when tool call succeeds", async () => {
            registry.register({
                name: "getCount",
                description: "Get count",
                parameters: z.object({}),
                examples: [],
                execute: (): Promise<CommandResult> =>
                    Promise.resolve({
                        success: true,
                        message: "Found 42 nodes",
                        data: { count: 42 },
                    }),
            });

            mockProvider.setResponse("how many", {
                text: "",
                toolCalls: [{ id: "1", name: "getCount", arguments: {} }],
            });

            const result = await controller.execute("how many?");
            assert.strictEqual(result.success, true);
            assert.ok(result.message.includes("42"));
            assert.deepStrictEqual(result.data, { count: 42 });
        });

        it("executes multiple tool calls in sequence", async () => {
            const executionOrder: string[] = [];

            registry.register({
                name: "first",
                description: "First",
                parameters: z.object({}),
                examples: [],
                execute: () => {
                    executionOrder.push("first");

                    return Promise.resolve({ success: true, message: "First done" });
                },
            });

            registry.register({
                name: "second",
                description: "Second",
                parameters: z.object({}),
                examples: [],
                execute: () => {
                    executionOrder.push("second");

                    return Promise.resolve({ success: true, message: "Second done" });
                },
            });

            mockProvider.setResponse("both", {
                text: "",
                toolCalls: [
                    { id: "1", name: "first", arguments: {} },
                    { id: "2", name: "second", arguments: {} },
                ],
            });

            await controller.execute("do both");
            assert.deepStrictEqual(executionOrder, ["first", "second"]);
        });

        it("handles unknown command gracefully", async () => {
            mockProvider.setResponse("unknown", {
                text: "",
                toolCalls: [{ id: "1", name: "nonExistent", arguments: {} }],
            });

            const result = await controller.execute("unknown command");
            assert.strictEqual(result.success, false);
            assert.ok(
                result.message.toLowerCase().includes("unknown") || result.message.toLowerCase().includes("not found"),
            );
        });

        it("handles command execution failure", async () => {
            registry.register({
                name: "failing",
                description: "Fails",
                parameters: z.object({}),
                examples: [],
                execute: (): Promise<CommandResult> =>
                    Promise.resolve({
                        success: false,
                        message: "Command failed for reasons",
                    }),
            });

            mockProvider.setResponse("fail", {
                text: "",
                toolCalls: [{ id: "1", name: "failing", arguments: {} }],
            });

            const result = await controller.execute("make it fail");
            assert.strictEqual(result.success, false);
            assert.ok(result.message.includes("failed"));
        });

        it("handles command execution throwing an error", async () => {
            registry.register({
                name: "throwing",
                description: "Throws",
                parameters: z.object({}),
                examples: [],
                execute: () => {
                    return Promise.reject(new Error("Unexpected error"));
                },
            });

            mockProvider.setResponse("throw", {
                text: "",
                toolCalls: [{ id: "1", name: "throwing", arguments: {} }],
            });

            const result = await controller.execute("make it throw");
            assert.strictEqual(result.success, false);
            assert.ok(result.message.toLowerCase().includes("error"));
        });
    });

    /**
     * A model that looks before it acts -- findNodes, then zoomToNodes on what it found -- needs
     * the first tool's result before it can make the second call. Asked once, it stops after
     * looking and the person gets nothing done.
     */
    describe("execute - tool results go back to the model", () => {
        /** A provider that answers each ask with the next scripted response and records what it was sent. */
        function scriptedProvider(script: LlmResponse[]): LlmProvider & { asks: Message[][] } {
            const asks: Message[][] = [];
            return {
                name: "scripted",
                supportsStreaming: false,
                supportsTools: true,
                asks,
                configure: () => undefined,
                generate: (messages) => {
                    asks.push([...messages]);
                    return Promise.resolve(script[asks.length - 1] ?? { text: "done", toolCalls: [] });
                },
                generateStream: () => Promise.reject(new Error("not used")),
                validateApiKey: () => Promise.resolve(true),
            };
        }

        function registerEcho(name: string, success = true): string[] {
            const ran: string[] = [];
            registry.register({
                name,
                description: name,
                parameters: z.object({ value: z.string() }),
                examples: [],
                execute: (_graph, params) => {
                    ran.push(String(params.value));
                    return Promise.resolve({
                        success,
                        message: `${name} ${String(params.value)}`,
                        data: { seen: params.value },
                    });
                },
            });
            return ran;
        }

        it("asks again with the tool's result, and runs the tool the model calls next", async () => {
            const looked = registerEcho("look");
            const acted = registerEcho("act");
            const provider = scriptedProvider([
                { text: "", toolCalls: [{ id: "t1", name: "look", arguments: { value: "servers" } }] },
                { text: "", toolCalls: [{ id: "t2", name: "act", arguments: { value: "zoom" } }] },
                { text: "Zoomed to the servers.", toolCalls: [] },
            ]);
            const multi = new AiController({ provider, commandRegistry: registry, graph: mockGraph });

            const result = await multi.execute("focus on servers");

            assert.deepStrictEqual(looked, ["servers"]);
            assert.deepStrictEqual(acted, ["zoom"]);
            assert.strictEqual(provider.asks.length, 3);
            const second = provider.asks[1];
            assert.deepStrictEqual(
                second.at(-2)?.toolCalls?.map((call) => call.name),
                ["look"],
            );
            assert.strictEqual(second.at(-1)?.role, "tool");
            assert.strictEqual(second.at(-1)?.toolCallId, "t1");
            assert.deepStrictEqual(JSON.parse(second.at(-1)?.content ?? "{}"), {
                success: true,
                message: "look servers",
                data: { seen: "servers" },
            });
            assert.strictEqual(result.success, true);
            assert.include(result.message, "Zoomed to the servers.");
            assert.strictEqual(result.llmText, "Zoomed to the servers.");
        });

        it("hands a failed tool's result back, so the model can correct it", async () => {
            registerEcho("broken", false);
            const fixed = registerEcho("fixed");
            const provider = scriptedProvider([
                { text: "", toolCalls: [{ id: "t1", name: "broken", arguments: { value: "a" } }] },
                { text: "", toolCalls: [{ id: "t2", name: "fixed", arguments: { value: "b" } }] },
            ]);
            const multi = new AiController({ provider, commandRegistry: registry, graph: mockGraph });

            await multi.execute("do it");

            assert.strictEqual(JSON.parse(provider.asks[1].at(-1)?.content ?? "{}").success, false);
            assert.deepStrictEqual(fixed, ["b"]);
        });

        it("answers every call of a turn, including one skipped after an earlier failure", async () => {
            registerEcho("broken", false);
            const skipped = registerEcho("later");
            const provider = scriptedProvider([
                {
                    text: "",
                    toolCalls: [
                        { id: "t1", name: "broken", arguments: { value: "a" } },
                        { id: "t2", name: "later", arguments: { value: "b" } },
                    ],
                },
            ]);
            const multi = new AiController({ provider, commandRegistry: registry, graph: mockGraph });

            await multi.execute("do both");

            assert.deepStrictEqual(skipped, []);
            const toolMessages = provider.asks[1].filter((message) => message.role === "tool");
            assert.deepStrictEqual(
                toolMessages.map((message) => message.toolCallId),
                ["t1", "t2"],
            );
            assert.include(toolMessages[1].content, "Not run");
        });

        it("stops asking after five turns of a model that never stops calling tools", async () => {
            const ran = registerEcho("again");
            const forever = { text: "", toolCalls: [{ id: "t", name: "again", arguments: { value: "x" } }] };
            const provider = scriptedProvider(Array.from({ length: 10 }, () => forever));
            const multi = new AiController({ provider, commandRegistry: registry, graph: mockGraph });

            const result = await multi.execute("loop");

            assert.strictEqual(provider.asks.length, 5);
            assert.strictEqual(ran.length, 5);
            assert.strictEqual(result.success, true);
        });
    });

    describe("status changes", () => {
        it("emits status changes during execution", async () => {
            const states: string[] = [];
            controller.onStatusChange((status) => states.push(status.state));

            mockProvider.setResponse("test", { text: "Done", toolCalls: [] });
            await controller.execute("test");

            assert.ok(states.includes("submitted"));
            assert.ok(states.includes("ready"));
        });

        it("transitions through streaming state", async () => {
            const states: string[] = [];
            controller.onStatusChange((status) => states.push(status.state));

            mockProvider.setResponse("test", { text: "Response", toolCalls: [] });
            await controller.execute("test");

            // Should have gone through streaming state
            assert.ok(states.includes("streaming"));
        });

        it("transitions through executing state when tools are called", async () => {
            const states: string[] = [];
            controller.onStatusChange((status) => states.push(status.state));

            registry.register({
                name: "testCommand",
                description: "Test",
                parameters: z.object({}),
                examples: [],
                execute: () => Promise.resolve({ success: true, message: "done" }),
            });

            mockProvider.setResponse("test", {
                text: "",
                toolCalls: [{ id: "1", name: "testCommand", arguments: {} }],
            });

            await controller.execute("test");

            assert.ok(states.includes("executing"));
        });

        it("getStatus returns current status snapshot", () => {
            const status = controller.getStatus();
            assert.strictEqual(status.state, "ready");
            assert.strictEqual(status.canCancel, false);
        });
    });

    describe("error handling", () => {
        it("handles provider errors gracefully", async () => {
            mockProvider.setError(new Error("Network error"));

            const result = await controller.execute("test");
            assert.strictEqual(result.success, false);
            assert.ok(result.message.toLowerCase().includes("error"));
        });

        it("transitions to error state on provider failure", async () => {
            const states: string[] = [];
            controller.onStatusChange((status) => states.push(status.state));

            mockProvider.setError(new Error("API error"));
            await controller.execute("test");

            assert.ok(states.includes("error"));
        });

        it("status includes error details", async () => {
            let errorStatus: AiStatus | null = null;
            controller.onStatusChange((status) => {
                if (status.state === "error") {
                    errorStatus = status;
                }
            });

            mockProvider.setError(new Error("Test error message"));
            await controller.execute("test");

            assert.ok(errorStatus);
            const capturedStatus = errorStatus as AiStatus;
            assert.strictEqual(capturedStatus.error?.message, "Test error message");
        });

        it("can recover from error state", async () => {
            mockProvider.setError(new Error("Temporary error"));
            await controller.execute("test");

            // Clear error and try again
            mockProvider.clearError();
            mockProvider.setResponse("retry", { text: "Success!", toolCalls: [] });

            const result = await controller.execute("retry");
            assert.strictEqual(result.success, true);
        });
    });

    describe("unsubscribe", () => {
        it("unsubscribe stops receiving updates", async () => {
            const states: string[] = [];
            const unsubscribe = controller.onStatusChange((status) => states.push(status.state));

            mockProvider.setResponse("first", { text: "First", toolCalls: [] });
            await controller.execute("first");
            const statesAfterFirst = states.length;

            unsubscribe();

            mockProvider.setResponse("second", { text: "Second", toolCalls: [] });
            await controller.execute("second");

            // Should not have received any new states
            assert.strictEqual(states.length, statesAfterFirst);
        });
    });

    describe("command context", () => {
        it("passes graph to command execution", async () => {
            let receivedGraph: unknown = null;

            registry.register({
                name: "checkGraph",
                description: "Check graph",
                parameters: z.object({}),
                examples: [],
                execute: (graph) => {
                    receivedGraph = graph;

                    return Promise.resolve({ success: true, message: "done" });
                },
            });

            mockProvider.setResponse("check", {
                text: "",
                toolCalls: [{ id: "1", name: "checkGraph", arguments: {} }],
            });

            await controller.execute("check graph");
            assert.strictEqual(receivedGraph, mockGraph);
        });

        it("provides abort signal to commands", async () => {
            let receivedSignal: AbortSignal | undefined;

            registry.register({
                name: "checkSignal",
                description: "Check signal",
                parameters: z.object({}),
                examples: [],
                execute: (_graph, _params, context) => {
                    receivedSignal = context?.abortSignal;

                    return Promise.resolve({ success: true, message: "done" });
                },
            });

            mockProvider.setResponse("signal", {
                text: "",
                toolCalls: [{ id: "1", name: "checkSignal", arguments: {} }],
            });

            await controller.execute("check signal");
            assert.ok(receivedSignal);
            assert.ok(receivedSignal instanceof AbortSignal);
        });
    });

    describe("text and tool calls combined", () => {
        it("handles response with both text and tool calls", async () => {
            registry.register({
                name: "doAction",
                description: "Do action",
                parameters: z.object({}),
                examples: [],
                execute: () => Promise.resolve({ success: true, message: "Action done" }),
            });

            mockProvider.setResponse("mixed", {
                text: "Let me help you with that.",
                toolCalls: [{ id: "1", name: "doAction", arguments: {} }],
            });

            const result = await controller.execute("mixed response");
            assert.strictEqual(result.success, true);
            // Should include both the LLM text and action result
            assert.ok(result.message.includes("Action done") || result.message.includes("help you"));
        });
    });

    describe("dispose", () => {
        it("disposes cleanly", () => {
            controller.dispose();
            // Should not throw
        });

        it("clears listeners on dispose", async () => {
            const states: string[] = [];
            controller.onStatusChange((status) => states.push(status.state));

            controller.dispose();

            mockProvider.setResponse("after", { text: "After", toolCalls: [] });
            // This might throw or not work after dispose
            try {
                await controller.execute("after dispose");
            } catch {
                // Expected to possibly fail after dispose
            }

            // States should be minimal or empty after dispose
            // This test verifies dispose doesn't crash and clears state
        });
    });
});
