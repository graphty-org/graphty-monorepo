/**
 * @file A `MockLlmProvider` that answers each turn with the next scripted response, in order, so a
 * test can script what the model does after a tool result or a reader's answer (the plain mock
 * answers nothing then). Past the queue it answers as the plain mock does.
 */

import { MockLlmProvider } from "../../src/ai/providers/MockLlmProvider";
import type { LlmResponse, Message, ToolDefinition } from "../../src/ai/providers/types";

/** A mock provider that answers from a queue. */
export class QueuedProvider extends MockLlmProvider {
    /** The responses still to give, in order. */
    readonly queue: LlmResponse[] = [];

    override generate(
        messages: Message[],
        tools: ToolDefinition[],
        options?: { signal?: AbortSignal },
    ): Promise<LlmResponse> {
        const next = this.queue.shift();
        return next === undefined ? super.generate(messages, tools, options) : Promise.resolve(next);
    }
}
