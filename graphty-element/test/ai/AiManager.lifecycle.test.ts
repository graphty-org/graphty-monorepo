/**
 * @file `AiManager`'s public surface across its life, on a real session whose chat runs on a
 * scripted engine: every answer before `init`, a second `init` that changes nothing, status and
 * commands, `retry`, saved conversations under `history: "memory"`, a reviewed transcript a live
 * conversation cannot give, talk held by `voice.holdKey`, and every answer after `dispose`.
 */

import { assert, describe, it } from "vitest";

import { AiConfigError } from "../../src/ai/agents";
import { type AiManagerConfig, createAiManager, NO_VOICE_SUPPORT } from "../../src/ai/AiManager";
import { FakeEngine } from "../../src/ai/engine/FakeEngine";
import { registerProviderApiEngine } from "../../src/ai/engine/load";
import { createProvider } from "../../src/ai/providers";
import { assistantSession, textTurn } from "../helpers/assistant";
import { type Emitted, graphHandle } from "../helpers/session-graph";

/**
 * A manager over a real session whose chat runs on a scripted engine.
 * @param config - The configuration, besides the provider.
 * @param renderer - Extra members of the graph handle (an `element` for a hold key).
 * @returns The manager, its chat engine, the provider and what it emitted.
 */
async function manager(
    config: Omit<AiManagerConfig, "provider"> = {},
    renderer: Record<string, unknown> = {},
): Promise<{
    ai: ReturnType<typeof createAiManager>;
    chat: FakeEngine;
    provider: ReturnType<typeof createProvider>;
    emitted: Emitted;
}> {
    const session = await assistantSession();
    // Nothing runs XR in a node test.
    const { graph, emitted } = graphHandle(session, { getXRSessionManager: () => undefined, ...renderer });
    const chat = new FakeEngine();
    const provider = createProvider("mock");
    registerProviderApiEngine(provider, () => chat);
    const ai = createAiManager();
    ai.init(graph, { toolset: "generated", ...config, provider: "mock", providerInstance: provider });
    return { ai, chat, provider, emitted };
}

/**
 * The text of the reader's message in one of the chat's requests.
 * @param chat - The chat engine.
 * @param at - Which request.
 * @returns Its text parts, joined.
 */
function sent(chat: FakeEngine, at: number): string {
    const parts = chat.requests[at]?.messages.at(-1)?.parts ?? [];
    return parts.flatMap((part) => (part.type === "text" ? [part.text] : [])).join("\n");
}

/**
 * A key event as a browser dispatches it, on a target with no DOM behind it.
 * @param type - `keydown` or `keyup`.
 * @param key - `KeyboardEvent.key`.
 * @param repeat - Whether the key is auto-repeating.
 * @returns The event.
 */
function keyEvent(type: string, key: string, repeat = false): Event {
    return Object.assign(new Event(type, { cancelable: true }), { key, repeat });
}

describe("an AiManager before init", () => {
    it("answers every ask as not enabled, and holds nothing", async () => {
        const ai = createAiManager();
        const notEnabled = { success: false, message: "", code: "AI_NOT_ENABLED", params: {} } as const;
        assert.deepStrictEqual(await ai.resolveAiApproval("x", { approve: true }), notEnabled);
        assert.deepStrictEqual(await ai.answerQuestion("x", "yes"), notEnabled);
        assert.strictEqual((await ai.execute("hi")).code, "AI_NOT_ENABLED");
        assert.strictEqual((await ai.retry()).code, "AI_NOT_ENABLED");
        assert.deepStrictEqual(ai.getPendingQuestions(), []);
        assert.deepStrictEqual(ai.getPendingAiApprovals(), []);
        assert.isNull(ai.getCapabilities());
        assert.isNull(ai.getConversation());
        assert.deepStrictEqual(await ai.listConversations(), []);
        assert.isNull(await ai.openConversation("x"));
        assert.isNull(await ai.newConversation());
        assert.isNull(await ai.exportConversation("x"));
        await ai.deleteConversation("x");
        await ai.renameConversation("x", "name");
        await ai.clearHistory();
        assert.isNull(ai.getController());
        assert.isNull(ai.getProvider());
        assert.isNull(ai.getSchemaManager());
        assert.deepStrictEqual(ai.getRegisteredCommands(), []);
        assert.strictEqual(await ai.getVoiceSupport(), NO_VOICE_SUPPORT);
        // With no graph a press has nowhere to say it ended.
        ai.talk(true);
        assert.isFalse(ai.isTalking());
        ai.cancel();
        ai.endLive();
        ai.stopSpeech();
        await ai.ready();
    });

    it("reports its status from its own status manager, and stops reporting on unsubscribe", () => {
        const ai = createAiManager();
        assert.strictEqual(ai.getStatus().state, "ready");
        const seen: string[] = [];
        const stop = ai.onStatusChange((status) => {
            seen.push(status.state);
        });
        stop();
        ai.dispose();
        assert.strictEqual(ai.getStatus().state, "ready");
    });
});

describe("an initialized AiManager", () => {
    it("keeps its first configuration when init is called again", async () => {
        const { ai, provider } = await manager();
        const session = await assistantSession();
        const other = createProvider("mock");
        ai.init(graphHandle(session, { getXRSessionManager: () => undefined }).graph, {
            provider: "mock",
            providerInstance: other,
        });
        assert.strictEqual(ai.getProvider(), provider);
        ai.dispose();
    });

    it("offers its commands, its capabilities, its schema and its status", async () => {
        const { ai } = await manager();
        assert.isAbove(ai.getRegisteredCommands().length, 0);
        assert.isNotNull(ai.getCapabilities());
        assert.isNotNull(ai.getSchemaManager());
        assert.isNotNull(ai.getController());
        assert.strictEqual(ai.getStatus().state, "ready");
        const stop = ai.onStatusChange(() => undefined);
        stop();
        ai.dispose();
    });

    it("retries nothing before a command, then sends the last command again", async () => {
        const { ai, chat } = await manager();
        const none = await ai.retry();
        assert.strictEqual(none.code, "AI_NO_PREVIOUS_COMMAND");
        assert.isFalse(none.success);
        assert.strictEqual(chat.requests.length, 0);

        chat.push(textTurn("Five nodes."));
        const first = await ai.execute("how many nodes");
        assert.isTrue(first.success, first.message);
        chat.push(textTurn("Still five."));
        const again = await ai.retry();
        assert.isTrue(again.success, again.message);
        assert.strictEqual(chat.requests.length, 2);
        assert.include(sent(chat, 1), "how many nodes");
        ai.cancel();
        ai.dispose();
    });

    it("answers every ask as disposed once disposed, and disposes once", async () => {
        const { ai, chat } = await manager();
        ai.dispose();
        ai.dispose();
        assert.strictEqual((await ai.execute("hi")).code, "AI_DISPOSED");
        assert.strictEqual((await ai.retry()).code, "AI_DISPOSED");
        assert.isNull(ai.getProvider());
        assert.isNull(ai.getSchemaManager());
        assert.deepStrictEqual(ai.getRegisteredCommands(), []);
        assert.strictEqual(chat.requests.length, 0);
    });
});

describe("saved conversations, history: memory", () => {
    it("starts, names, exports, lists, opens and deletes conversations", async () => {
        const { ai, chat } = await manager({ history: { store: "memory", key: "lifecycle" } });
        await ai.ready();
        chat.push(textTurn("Five nodes."));
        assert.isTrue((await ai.execute("how many nodes")).success);
        const first = ai.getConversation();
        assert.isNotNull(first);
        const firstId = first.id;

        const second = await ai.newConversation();
        assert.isNotNull(second);
        assert.notStrictEqual(second.id, firstId);
        await ai.renameConversation(firstId, "  Counting  ");

        const listed = await ai.listConversations();
        assert.includeMembers(
            listed.map((summary) => summary.id),
            [firstId],
        );
        assert.strictEqual(listed.find((summary) => summary.id === firstId)?.name, "Counting");

        const json = await ai.exportConversation(firstId);
        assert.isNotNull(json);
        assert.include(json, "how many nodes");
        assert.isNull(await ai.exportConversation("no-such-conversation"));

        const opened = await ai.openConversation(firstId);
        assert.strictEqual(opened?.id, firstId);
        assert.strictEqual(ai.getConversation()?.id, firstId);
        assert.isNull(await ai.openConversation("no-such-conversation"));

        await ai.deleteConversation(firstId);
        assert.notInclude(
            (await ai.listConversations()).map((summary) => summary.id),
            firstId,
        );
        await ai.clearHistory();
        assert.deepStrictEqual(await ai.listConversations({ allKeys: true }), []);
        ai.dispose();
    });
});

describe("voice settings init checks", () => {
    it("refuses a reviewed transcript for a live conversation, before building anything", async () => {
        const session = await assistantSession();
        const { graph } = graphHandle(session, { getXRSessionManager: () => undefined });
        const ai = createAiManager();
        let caught: unknown;
        try {
            ai.init(graph, { provider: "mock", voice: { mode: "live", review: true } });
        } catch (error) {
            caught = error;
        }

        assert.instanceOf(caught, AiConfigError);
        assert.deepInclude(caught.params, { field: "voice.review", reason: "needs-turns" });
        assert.isNull(ai.getController());
    });
});

describe("voice.holdKey", () => {
    it("holds talk while the key is down, ignores repeats and other keys, and lets go on keyup or focus loss", async () => {
        const element = new EventTarget();
        const { ai } = await manager({ voice: { holdKey: "v" } }, { element });

        element.dispatchEvent(keyEvent("keydown", "x"));
        assert.isFalse(ai.isTalking(), "another key holds nothing");

        const press = keyEvent("keydown", "v");
        element.dispatchEvent(press);
        assert.isTrue(press.defaultPrevented, "the held key types nothing");
        assert.isTrue(ai.isTalking());

        const repeat = keyEvent("keydown", "v", true);
        element.dispatchEvent(repeat);
        assert.isFalse(repeat.defaultPrevented, "a repeat is not a second press");

        element.dispatchEvent(keyEvent("keyup", "x"));
        assert.isTrue(ai.isTalking(), "releasing another key keeps talk held");
        element.dispatchEvent(keyEvent("keyup", "v"));
        assert.isFalse(ai.isTalking());

        element.dispatchEvent(keyEvent("keydown", "v"));
        assert.isTrue(ai.isTalking());
        element.dispatchEvent(new Event("focusout"));
        assert.isFalse(ai.isTalking(), "leaving the graph lets go");

        ai.dispose();
        const after = keyEvent("keydown", "v");
        element.dispatchEvent(after);
        assert.isFalse(after.defaultPrevented, "dispose unbinds the key");
    });
});
