/**
 * AiManager Tests - Tests for the AI Manager that integrates with Graph.
 * @module test/ai/AiManager.test
 */

import { afterAll, afterEach, assert, beforeAll, beforeEach, describe, it } from "vitest";

import { AiConfigError } from "../../../src/ai/agents";
import { AiManager } from "../../../src/ai/AiManager";
import type { Graph } from "../../../src/Graph";
import { cleanupTestGraph, createTestGraph } from "../../helpers/testSetup";

describe("AiManager", () => {
    let manager: AiManager;
    let graph: Graph;

    // A real graph: the manager reads the element it is handed, not a copy of its members.
    beforeAll(async () => {
        graph = await createTestGraph();
    });

    afterAll(() => {
        cleanupTestGraph(graph);
    });

    beforeEach(() => {
        manager = new AiManager();
        manager.init(graph, { provider: "mock" });
    });

    afterEach(() => {
        manager.dispose();
    });

    describe("initialization", () => {
        it("initializes with built-in commands", () => {
            const commands = manager.getRegisteredCommands();
            assert.ok(commands.includes("queryGraph"), "should include queryGraph command");
            assert.ok(commands.includes("setLayout"), "should include setLayout command");
            assert.ok(commands.includes("setImmersiveMode"), "should include setImmersiveMode command");
        });

        it("initializes with the generated tools under toolset: generated", () => {
            const generated = new AiManager();
            generated.init(graph, { provider: "mock", toolset: "generated" });
            const commands = generated.getRegisteredCommands();
            assert.ok(commands.includes("query"), "should include the query tool");
            assert.ok(commands.includes("layout"), "should include the layout tool");
            assert.ok(commands.includes("immersive"), "should include the immersive tool");
            generated.dispose();
        });

        it("initializes with mock provider", () => {
            const status = manager.getStatus();
            assert.strictEqual(status.state, "ready");
        });

        it("rejects helpers that cannot run before building anything, as enableAiControl does", () => {
            const another = new AiManager();
            assert.throws(() => {
                another.init(graph, {
                    provider: "mock",
                    agents: [{ name: "counter", purpose: "Count nodes.", commands: ["paint"] }],
                });
            }, AiConfigError);
            assert.deepStrictEqual(another.getRegisteredCommands(), [], "nothing was registered");
        });

        it("can be initialized with different providers", () => {
            const anotherManager = new AiManager();
            // Note: In real usage, you'd need API keys for non-mock providers
            // For this test, we just verify the manager accepts the provider type
            anotherManager.init(graph, { provider: "mock" });
            assert.strictEqual(anotherManager.getStatus().state, "ready");
            anotherManager.dispose();
        });
    });

    describe("execute", () => {
        it("executes commands through context", async () => {
            const result = await manager.execute("How many nodes?");
            assert.strictEqual(result.success, true);
        });

        it("returns error for disposed manager", async () => {
            manager.dispose();
            const result = await manager.execute("test");
            assert.strictEqual(result.success, false);
            assert.strictEqual(result.code, "AI_DISPOSED");
        });
    });

    describe("API key management", () => {
        it("keeps every key the page gave out of a saved conversation, a replaced one too", async () => {
            const remembering = new AiManager();
            remembering.init(graph, {
                provider: "mock",
                history: "memory",
            });
            await remembering.ready();
            remembering.setApiKey("openai", "sk-old-key-0123456789");
            remembering.setApiKey("openai", "sk-new-key-9876543210");

            await remembering.execute("my old key was sk-old-key-0123456789");
            const json = await remembering.exportConversation(remembering.getConversation()?.id ?? "");
            remembering.dispose();

            assert.isString(json);
            assert.include(json, "my old key was [api-key]");
            assert.notInclude(json, "sk-old-key-0123456789");
        });

        it("can set API keys without throwing", () => {
            // Should not throw
            manager.setApiKey("openai", "sk-test-key");
            manager.setApiKey("anthropic", "sk-ant-test-key");
            manager.setApiKey("google", "AIza-test-key");
        });
    });

    describe("dispose", () => {
        it("returns to the initial status after dispose", async () => {
            await manager.execute("How many nodes?");
            manager.dispose();
            // There is no disposed state: dispose resets the status to the one a new manager starts with.
            assert.deepStrictEqual(manager.getStatus(), new AiManager().getStatus());
        });

        it("can be disposed multiple times without error", () => {
            manager.dispose();
            manager.dispose(); // Should not throw
        });
    });

    describe("status", () => {
        it("returns current status", () => {
            const status = manager.getStatus();
            assert.strictEqual(status.state, "ready");
            assert.strictEqual(status.canCancel, false);
        });

        it("allows subscribing to status changes", async () => {
            const states: string[] = [];
            const unsubscribe = manager.onStatusChange((status) => {
                states.push(status.state);
            });

            await manager.execute("test");

            // Should have received status updates
            assert.ok(states.length > 0);
            unsubscribe();
        });
    });

    describe("cancel", () => {
        it("ends an in-progress command as canceled", async () => {
            const running = manager.execute("test");
            manager.cancel();
            const result = await running;
            assert.strictEqual(result.success, false);
            assert.strictEqual(result.code, "AI_CANCELED");
        });
    });
});
