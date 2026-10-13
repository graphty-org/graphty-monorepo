/**
 * The chat on the REAL graphty-element: the reply shows while the message is still running, with
 * the step the assistant is on, and the model choices a reader makes in Settings are kept in this
 * browser and reach the provider's request. The mock provider answers the chat; the Google request
 * is answered by a stubbed `fetch`, so no paid call is made.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { MockLlmProvider } from "@graphty/graphty-element/ai";
import React from "react";
import { afterEach, assert, describe, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { useAiManager } from "../../../../hooks/useAiManager";
import { render, screen, waitFor, within } from "../../../../test/test-utils";
import type { ProviderType } from "../../../../types/ai";
import { readAiModelChoices } from "../../../../workspace/settings/preferences";
import { AiModelSettings } from "../../../ai/AiModelSettings";
import { aiActivityText, aiTranscript } from "../../../ai/aiResultText";
import { ShellProvider } from "../../ShellContext";
import { AiPanel } from "../AiPanel";

/** The element itself, by its own published type; the import above registers it. */
type ElementUnderTest = import("@graphty/graphty-element").Graphty;

/** A hang guard for the element coming up and the assistant answering; not a pass/fail timing. */
const TIMEOUT_MS = 60_000;

/** A key of Google's shape; the request it signs never leaves the page. */
const FAKE_GOOGLE_KEY = "AIzaSy-test-only-0123456789";

/**
 * The key store, as the app's is: one function for the page's life, so the assistant is not
 * switched on again at every render.
 * @returns The fake key.
 */
const getKey = (): string => FAKE_GOOGLE_KEY;

const mounted: ElementUnderTest[] = [];

/**
 * A real element holding three nodes, on the page.
 * @param id - Its id, which scopes its saved conversations.
 * @returns The element.
 */
async function placeElement(id: string): Promise<ElementUnderTest> {
    const element = document.createElement("graphty-element");
    element.id = id;
    element.style.display = "block";
    element.style.width = "400px";
    element.style.height = "300px";
    document.body.appendChild(element);
    mounted.push(element);
    await element.waitForSettled();
    await element.session.data.addNodes([{ id: "a" }, { id: "b" }, { id: "c" }]);
    return element;
}

/**
 * The chat and the model settings wired to the element as the app shell wires them.
 * @param props - The element and the provider.
 * @param props.element - The element.
 * @param props.provider - The provider the assistant runs on.
 * @returns The two.
 */
function Chat({
    element,
    provider,
}: {
    readonly element: ElementUnderTest;
    readonly provider: ProviderType;
}): React.JSX.Element {
    const ai = useAiManager({ element, defaultProvider: provider, getKey });

    return (
        <div data-testid="chat" data-ready={String(ai.isReady)} style={{ display: "flex", flexDirection: "column" }}>
            <AiModelSettings
                provider={provider}
                choice={ai.modelChoices[provider] ?? {}}
                onChange={(choice) => {
                    ai.setModelChoice(provider, choice);
                }}
            />
            <AiPanel
                messages={aiTranscript(ai)}
                providerConfigured
                isProcessing={ai.isProcessing}
                streamingText={ai.status?.streamedText}
                activity={aiActivityText(ai.status)}
                onSend={(text) => {
                    void ai.execute(text);
                }}
                onCancel={ai.cancel}
            />
        </div>
    );
}

/**
 * Renders the chat and waits for the assistant to be on.
 * @param element - The element.
 * @param provider - The provider.
 */
async function renderChat(element: ElementUnderTest, provider: ProviderType): Promise<void> {
    render(
        <ShellProvider initialShellWidth={1440} measureViewport={false} persist={false}>
            <Chat element={element} provider={provider} />
        </ShellProvider>,
    );
    await waitFor(
        () => {
            assert.strictEqual(screen.getByTestId("chat").dataset.ready, "true");
            assert.isDefined(element.getAiManager()?.getProvider());
        },
        { timeout: TIMEOUT_MS },
    );
}

/**
 * Types a message into the composer and sends it with Enter, as a reader does.
 * @param text - The message.
 */
async function ask(text: string): Promise<void> {
    await userEvent.type(screen.getByRole("textbox", { name: "Ask the assistant" }), `${text}{Enter}`);
}

afterEach(async () => {
    localStorage.removeItem("graphty.ai.modelChoices.v1");
    vi.unstubAllGlobals();
    for (const element of mounted.splice(0)) {
        await element.getAiManager()?.clearHistory();
        element.disableAiControl();
        element.remove();
    }
});

describe("the chat on the real element", () => {
    it("shows the reply so far, and that the assistant is thinking, before the message ends", async () => {
        const element = await placeElement(`ai-stream-${crypto.randomUUID()}`);
        await renderChat(element, "mock");
        const provider = element.getAiManager()?.getProvider() as MockLlmProvider;
        provider.setResponse("count the nodes", {
            text: "Counting the nodes.",
            toolCalls: [{ id: "q1", name: "query", arguments: { action: "overview" } }],
        });
        // The model's second turn waits until the test lets it answer: the first turn's text is
        // what the reader sees meanwhile.
        let release: () => void = () => undefined;
        const held = new Promise<void>((resolve) => {
            release = resolve;
        });
        const generate = provider.generate.bind(provider);
        let turns = 0;
        provider.generate = async (...args) => {
            turns++;
            if (turns === 2) {
                await held;
            }

            return generate(...args);
        };

        await ask("count the nodes");

        const reply = await screen.findByTestId("ai-streaming-reply", {}, { timeout: TIMEOUT_MS });
        assert.include(reply.textContent, "Counting the nodes.");
        await screen.findByText("Thinking...", {}, { timeout: TIMEOUT_MS });
        assert.isTrue(screen.getByRole("button", { name: "Send" }).hasAttribute("disabled"), "no second send mid-turn");

        // Shown once: the reply streaming in is not also a saved message yet.
        assert.lengthOf(within(screen.getByTestId("ai-transcript")).getAllByText(/Counting the nodes\./), 1);

        release();
        // The message ends: the reply is the saved message now, and nothing streams.
        await waitFor(
            () => {
                assert.isNull(screen.queryByTestId("ai-streaming-reply"));
                assert.isNull(screen.queryByText("Thinking..."));
            },
            { timeout: TIMEOUT_MS },
        );
        assert.lengthOf(within(screen.getByTestId("ai-transcript")).getAllByText(/Counting the nodes\./), 1);
    });

    it("keeps the reader's model choices and sends them with the provider's request", async () => {
        const sent: { url: string; body: Record<string, unknown> }[] = [];
        const pageFetch = globalThis.fetch;
        vi.stubGlobal("fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
            const url = input instanceof Request ? input.url : String(input);
            if (!url.includes("generativelanguage.googleapis.com")) {
                return pageFetch(input, init);
            }

            sent.push({
                url,
                body: JSON.parse(typeof init?.body === "string" ? init.body : "{}") as Record<string, unknown>,
            });
            const answer = {
                candidates: [{ content: { role: "model", parts: [{ text: "Hi." }] }, finishReason: "STOP" }],
            };
            return new Response(`data: ${JSON.stringify(answer)}\n\n`, {
                status: 200,
                headers: { "content-type": "text/event-stream" },
            });
        });

        const element = await placeElement(`ai-model-${crypto.randomUUID()}`);
        await renderChat(element, "google");
        const before = element.getAiManager();

        await userEvent.selectOptions(screen.getByLabelText("Model"), "gemini-3.1-pro-preview");
        await waitFor(
            () => {
                assert.notStrictEqual(element.getAiManager(), before, "the assistant is switched on again");
                assert.strictEqual(screen.getByTestId("chat").dataset.ready, "true");
            },
            { timeout: TIMEOUT_MS },
        );
        await userEvent.selectOptions(screen.getByLabelText("Reasoning"), "high");
        const temperature = screen.getByLabelText("Temperature");
        await userEvent.type(temperature, "0.4");
        await userEvent.tab();

        await waitFor(() => {
            assert.deepStrictEqual(readAiModelChoices().google, {
                model: "gemini-3.1-pro-preview",
                reasoningEffort: "high",
                temperature: 0.4,
            });
        });
        await waitFor(
            () => {
                assert.strictEqual(screen.getByTestId("chat").dataset.ready, "true");
            },
            { timeout: TIMEOUT_MS },
        );

        await ask("hello");
        await waitFor(
            () => {
                assert.isAbove(sent.length, 0);
            },
            { timeout: TIMEOUT_MS },
        );
        const [request] = sent;
        assert.include(request.url, "gemini-3.1-pro-preview");
        const config = request.body.generationConfig as {
            temperature?: number;
            thinkingConfig?: { thinkingLevel?: string };
        };
        assert.strictEqual(config.thinkingConfig?.thinkingLevel, "HIGH");
        assert.strictEqual(config.temperature, 0.4);
    });
});
