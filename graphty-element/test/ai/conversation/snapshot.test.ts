/**
 * @file What an application reads of a saved conversation: an assistant message lists the pages
 * the provider's tools found for it, as `sources`.
 */

import { readFileSync } from "node:fs";

import { assert, describe, it } from "vitest";

import { readConversation } from "../../../src/ai/conversation/formats";
import { conversationSnapshot } from "../../../src/ai/conversation/snapshot";

const GOLDEN = readFileSync(new URL("fixtures/v1-every-kind.json", import.meta.url), "utf8");

describe("the conversation snapshot", () => {
    it("lists a helper's web sources under its message, and none under a message without them", () => {
        const read = readConversation(GOLDEN);
        assert.isTrue(read.ok);
        const messages = read.ok ? conversationSnapshot(read.record).messages : [];
        const research = messages.find((message) => message.id === "h5");
        assert.deepEqual(research?.role === "assistant" ? research : undefined, {
            id: "h5",
            role: "assistant",
            agent: "research",
            text: "It opened in 1889.",
            calls: [],
            sources: [
                { tool: "web-search", url: "https://en.wikipedia.org/wiki/Eiffel_Tower", title: "Eiffel Tower" },
                { tool: "web-search", url: "http://example.org/tower" },
            ],
        });
        const plain = messages.find((message) => message.id === "m2");
        assert.deepEqual(plain?.role === "assistant" ? plain.sources : undefined, []);
    });
});
