/**
 * `toolset` keeps today's commands by default: landing the generated tools changes nothing for a
 * consumer that does not ask for them.
 * @module test/ai/AiManager.toolset.test
 */

import { assert, describe, it, vi } from "vitest";
import { z } from "zod";

import type { GraphSession } from "../../session";
import { AiConfigError } from "../../src/ai/agents";
import { type AiManager, type AiManagerConfig, createAiManager } from "../../src/ai/AiManager";
import { MockLlmProvider } from "../../src/ai/providers/MockLlmProvider";
import type { LlmProvider } from "../../src/ai/providers/types";
import { ASSISTANT_TOOLS } from "../../src/catalog/assistant";
import type { Graph } from "../../src/Graph";
import { assistantSession } from "../helpers/assistant";

/** The commands the assistant registered on master, in the order it offers them. */
const HAND_WRITTEN = [
    "queryGraph",
    "findNodes",
    "getSchema",
    "sampleData",
    "describeProperty",
    "listAlgorithms",
    "runAlgorithm",
    "setLayout",
    "setDimension",
    "setImmersiveMode",
    "findAndStyleNodes",
    "findAndStyleEdges",
    "clearStyles",
    "setCameraPosition",
    "zoomToNodes",
];

interface Heard {
    readonly type: string;
    readonly name?: string;
    readonly result?: unknown;
}

/**
 * An assistant over a real session, with what it emits on the graph's event channel.
 * @param session - The session.
 * @param config - Its configuration, beside the mock provider.
 * @returns The assistant and its events.
 */
function assistantOn(
    session: GraphSession,
    config: Partial<AiManagerConfig> = {},
): { ai: AiManager; heard: Heard[]; mock: MockLlmProvider } {
    const heard: Heard[] = [];
    const graph = {
        getSession: () => session,
        eventManager: {
            emit: (type: string, event: object) => heard.push({ type, ...event }),
            addListener: () => Symbol("l"),
            removeListener: () => undefined,
        },
        getDataManager: () => ({ nodes: new Map(), edges: new Map() }),
        getNodeCount: () => 0,
        getEdgeCount: () => 0,
        getXRSessionManager: () => undefined,
    } as unknown as Graph;
    const mock = new MockLlmProvider();
    const ai = createAiManager();
    ai.init(graph, { provider: "mock", providerInstance: mock, ...config });
    return { ai, heard, mock };
}

/**
 * The tool names one kind of event carried.
 * @param heard - The events.
 * @param type - The kind.
 * @returns The names.
 */
function namesOn(heard: readonly Heard[], type: string): (string | undefined)[] {
    return heard.filter((event) => event.type === type).map((event) => event.name);
}

describe("toolset", () => {
    it("registers the hand-written commands with no option, and runs them under their names", async () => {
        const { ai, heard, mock } = assistantOn(await assistantSession());
        mock.setResponse("look", {
            text: "",
            toolCalls: [{ id: "1", name: "getSchema", arguments: {} }],
        });

        assert.deepEqual(
            ai
                .getCommandRegistry()
                .getAll()
                .map((command) => command.name),
            HAND_WRITTEN,
        );

        await ai.execute("look");
        assert.deepEqual(namesOn(heard, "ai-stream-tool-call"), ["getSchema"]);
        assert.deepEqual(namesOn(heard, "ai-stream-tool-result"), ["getSchema"]);
        ai.dispose();
    });

    it("registers the generated tools with toolset: generated, and runs them under their names", async () => {
        const { ai, heard, mock } = assistantOn(await assistantSession(), { toolset: "generated" });
        mock.setResponse("look", {
            text: "",
            toolCalls: [{ id: "1", name: "query", arguments: { action: "overview" } }],
        });

        const names = ai.getCommandRegistry().getNames();
        assert.includeMembers(
            names,
            ASSISTANT_TOOLS.filter((tool) => tool.profiles.includes("standard")).map((tool) => tool.name),
        );
        for (const command of HAND_WRITTEN) {
            assert.notInclude(names, command);
        }

        await ai.execute("look");
        assert.deepEqual(namesOn(heard, "ai-stream-tool-call"), ["query"]);
        assert.deepEqual(namesOn(heard, "ai-stream-tool-result"), ["query"]);
        ai.dispose();
    });

    it("keeps a consumer command's name by default, and offers it as app_<name> beside the tools", async () => {
        const named = {
            name: "query",
            description: "The consumer's own query.",
            parameters: z.object({}),
            examples: [],
            execute: () => Promise.resolve({ success: true, message: "mine" }),
        };
        const plain = assistantOn(await assistantSession());
        plain.ai.registerCommand(named);
        plain.ai.registerCommand(named);
        assert.include(plain.ai.getCommandRegistry().getNames(), "query");
        assert.notInclude(plain.ai.getCommandRegistry().getNames(), "app_query");

        const generated = assistantOn(await assistantSession(), { toolset: "generated" });
        generated.ai.registerCommand(named);
        assert.include(generated.ai.getCommandRegistry().getNames(), "app_query");
    });

    it("sends WebLLM every command by default, and four tools with toolset: generated", async () => {
        const offered = async (toolset?: "generated"): Promise<number> => {
            const provider: LlmProvider = {
                name: "webllm",
                supportsStreaming: false,
                supportsTools: true,
                configure: () => undefined,
                generate: () => Promise.resolve({ text: "ok", toolCalls: [] }),
                generateStream: () => Promise.reject(new Error("not used")),
                validateApiKey: () => Promise.resolve(true),
            };
            const generate = vi.spyOn(provider, "generate");
            const { ai } = assistantOn(await assistantSession(), {
                provider: "webllm",
                providerInstance: provider,
                ...(toolset === undefined ? {} : { toolset }),
            });
            await ai.execute("hello");
            ai.dispose();
            return generate.mock.calls[0][1].length;
        };

        assert.strictEqual(await offered(), HAND_WRITTEN.length);
        assert.strictEqual(await offered("generated"), 4);
    });

    it("refuses a setting only the generated tools honor, so approvals never go unread", async () => {
        const session = await assistantSession();
        for (const [field, value] of Object.entries({
            toolProfile: "small",
            gate: false,
            approvals: "writes",
            tools: { webSearch: true },
            instructions: "Be brief.",
        })) {
            const error: unknown = (() => {
                try {
                    return assistantOn(session, { [field]: value });
                } catch (caught) {
                    return caught;
                }
            })();
            assert.instanceOf(error, AiConfigError, field);
            assert.deepInclude(error.params, { field, reason: "needs-generated-toolset" });
        }

        assert.doesNotThrow(() => assistantOn(session, { toolset: "generated", approvals: "writes" }).ai.dispose());
    });

    it("shows the model a command's result as it is, in a remembered conversation too", async () => {
        const { ai, mock } = assistantOn(await assistantSession(), { history: "memory" });
        ai.registerCommand({
            name: "look",
            description: "Looks.",
            parameters: z.object({}),
            examples: [],
            execute: () => Promise.resolve({ success: true, message: "looked", data: { seen: 1 } }),
        });
        await ai.ready();
        mock.setResponse("look", { text: "", toolCalls: [{ id: "1", name: "look", arguments: {} }] });

        await ai.execute("look");

        const asked = mock.getCallHistory().at(-1)?.messages.at(-1);
        assert.strictEqual(asked?.role, "tool");
        assert.deepEqual(JSON.parse(asked?.content ?? "{}"), { success: true, message: "looked", data: { seen: 1 } });
        ai.dispose();
    });

    it("adds instructions to the system prompt", async () => {
        const { ai, mock } = assistantOn(await assistantSession(), {
            toolset: "generated",
            instructions: "Never name a color.",
        });

        await ai.execute("hello");

        assert.include(mock.getCallHistory()[0].messages[0].content, "Never name a color.");
        ai.dispose();
    });
});
