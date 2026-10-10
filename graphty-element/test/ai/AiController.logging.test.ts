import { afterEach, assert, beforeEach, describe, it } from "vitest";
import { z } from "zod";

import { AiController } from "../../src/ai/AiController";
import { CommandRegistry } from "../../src/ai/commands";
import type { LlmProvider, LlmResponse, Message } from "../../src/ai/providers/types";
import { GraphtyLogger, LogLevel, type LogRecord } from "../../src/logging";
import { createMessageGraph } from "../helpers/message-graph";

// A value that must never leave the page through a log destination. It is put in every place
// the AI path handles content: the prompt, the person's message, the model's text, tool call
// arguments (valid and invalid), what a command emits and what it returns.
const SENTINEL = "SENTINEL-7f3c9a-never-log-me";

/**
 * Render a record completely, error included, so a value hidden anywhere in it is found.
 * @param record - The record a destination received.
 * @returns Every field of the record as text.
 */
function serialize(record: LogRecord): string {
    const { error } = record;
    return JSON.stringify({
        ...record,
        error: error
            ? { name: error.name, message: error.message, stack: error.stack, own: Object.assign({}, error) }
            : undefined,
    });
}

/**
 * A model that calls the tools on its first turn and answers in text on its second.
 * @returns The provider.
 */
function sentinelProvider(): LlmProvider {
    let turn = 0;
    return {
        name: "sentinel",
        supportsStreaming: false,
        supportsTools: true,
        configure: () => undefined,
        generate: (_messages: Message[]): Promise<LlmResponse> => {
            turn++;
            if (turn === 1) {
                return Promise.resolve({
                    text: `Looking for ${SENTINEL}`,
                    toolCalls: [
                        { id: "1", name: "echo", arguments: { value: SENTINEL } },
                        { id: "2", name: "pick", arguments: { choice: SENTINEL } },
                        { id: "3", name: `missing-${SENTINEL}`, arguments: { value: SENTINEL } },
                    ],
                });
            }

            return Promise.resolve({ text: `Found ${SENTINEL}`, toolCalls: [] });
        },
        generateStream: () => Promise.reject(new Error("not used")),
        validateApiKey: () => Promise.resolve(true),
        dispose: () => undefined,
    } as unknown as LlmProvider;
}

describe("AiController debug logging", () => {
    let records: LogRecord[];

    beforeEach(async () => {
        records = [];
        await GraphtyLogger.configure({
            enabled: true,
            level: LogLevel.TRACE,
            modules: "*",
            sinks: [{ name: "capture", write: (record) => records.push(record) }],
        });
        // Only the capturing destination: the console's output is not under test.
        GraphtyLogger.removeSink("console");
    });

    afterEach(async () => {
        GraphtyLogger.removeSink("capture");
        await GraphtyLogger.configure({ enabled: false });
    });

    it("records no prompt, message, model output, tool argument or tool result", async () => {
        const registry = new CommandRegistry();
        registry.register({
            name: "echo",
            description: `Echo a value such as ${SENTINEL}`,
            parameters: z.object({ value: z.string() }),
            examples: [],
            execute: (_graph, params, context) => {
                context?.emitEvent("echoed", { value: params.value });
                return Promise.resolve({
                    success: true,
                    message: `Echoed ${String(params.value)}`,
                    data: { nodeIds: [SENTINEL] },
                });
            },
        });
        registry.register({
            name: "pick",
            description: "Pick one",
            parameters: z.object({ choice: z.enum(["a", "b"]) }),
            examples: [],
            execute: () => Promise.resolve({ success: true, message: "picked" }),
        });

        const controller = new AiController({
            provider: sentinelProvider(),
            commandRegistry: registry,
            graph: createMessageGraph(),
        });

        await controller.execute(`Please find ${SENTINEL}`);

        const aiRecords = records.filter((record) => record.category.includes("ai"));
        assert.isAbove(aiRecords.length, 0, "the AI path should log something at debug level");

        const leaked = records.map(serialize).filter((text) => text.includes(SENTINEL));
        assert.deepStrictEqual(leaked, []);
    });
});
