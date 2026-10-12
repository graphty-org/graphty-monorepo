/**
 * The AI panel on the REAL graphty-element, its assistant on the scripted mock provider: the
 * transcript is the element's saved conversation, a change the element holds shows as a card,
 * Approve runs it and Deny leaves the graph alone, and an element mounted again on the same
 * browser database brings the transcript and a still-pending approval back. A question the model
 * asks shows as a card with one button per choice; clicking one continues the message, and the
 * question, too, comes back on an element mounted again. Switching on Run code lets the model run a
 * program in the page, and a change asked for after the assistant read the web is held with the
 * app's web-content wording; the web sources show under the answer as links.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { MockLlmProvider } from "@graphty/graphty-element/ai";
import React from "react";
import { afterEach, assert, describe, it } from "vitest";
import { userEvent } from "vitest/browser";

import { useAiManager } from "../../../../hooks/useAiManager";
import { render, screen, waitFor, within } from "../../../../test/test-utils";
import { AiToolSettings } from "../../../ai/AiProviderSettings";
import { aiTranscript } from "../../../ai/aiResultText";
import { ShellProvider } from "../../ShellContext";
import { AiPanel } from "../AiPanel";

/** The element itself, by its own published type; the import above registers it. */
type ElementUnderTest = import("@graphty/graphty-element").Graphty;

/** A hang guard for the element coming up and the assistant answering; not a pass/fail timing. */
const TIMEOUT_MS = 60_000;

/** What the reader asks; the mock provider answers it by clearing the graph, which the gate holds. */
const ASK = "clear the graph";

/** The held call, as the card and the transcript write it. */
const CALL_TEXT = 'edit_data {"action":"delete_all"}';

/** What the reader asks; the mock provider answers it with a question. */
const ASK_QUESTION = "color my favorite department";

/** The model's question. */
const QUESTION = "Which department is your favorite?";

/** What the reader asks; the mock provider answers it with a program. */
const ASK_CODE = "count the nodes with code";

/** The program the model writes: the node count, read through the query tool. */
const COUNT_PROGRAM = `const seen = await tools.query({ action: "overview" });
return seen.data.nodes;`;

/** What the reader asks after the research answer; the mock provider answers it with a removal. */
const ASK_REMOVE = "remove node b";

/** A saved conversation in the published `graphty-ai-conversation` format, as far as these tests edit it. */
interface SavedRecord {
    readonly messages: { readonly role: string; readonly parts: Record<string, unknown>[] }[];
}

/**
 * Saves a conversation record where the element keeps them: its default IndexedDB database
 * ("graphty-ai", documented), store "conversations", keyed by the record's id.
 * @param record - The record, in the published format.
 */
async function saveRecord(record: SavedRecord): Promise<void> {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open("graphty-ai");
        request.onsuccess = () => {
            resolve(request.result);
        };
        request.onerror = () => {
            reject(request.error ?? new Error("IndexedDB open failed"));
        };
    });
    await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction("conversations", "readwrite");
        transaction.objectStore("conversations").put(record);
        transaction.oncomplete = () => {
            resolve();
        };
        transaction.onerror = () => {
            reject(transaction.error ?? new Error("IndexedDB write failed"));
        };
    });
    db.close();
}

const mounted: ElementUnderTest[] = [];

/**
 * The AI panel wired to the element as the app shell wires it.
 * @param props - The element.
 * @param props.element - The element whose assistant the panel drives.
 * @returns The panel.
 */
function Assistant({ element }: { readonly element: ElementUnderTest }): React.JSX.Element {
    const ai = useAiManager({ element, defaultProvider: "mock" });

    return (
        <div data-testid="assistant" data-ready={String(ai.isReady)}>
            <AiToolSettings tools={ai.toolSwitches} onToolChange={ai.setToolSwitch} capabilities={ai.capabilities} />
            <AiPanel
                messages={aiTranscript(ai)}
                providerConfigured
                isProcessing={ai.isProcessing}
                onSend={(text) => {
                    void ai.execute(text);
                }}
                approvals={ai.approvals}
                onApprove={(id) => {
                    void ai.resolveApproval(id, true);
                }}
                onDeny={(id) => {
                    void ai.resolveApproval(id, false);
                }}
                questions={ai.questions}
                onAnswer={(id, answer) => {
                    void ai.answerQuestion(id, answer);
                }}
                // Offered once the assistant is on: before that there is no conversation to act on.
                onNewConversation={
                    ai.isReady
                        ? () => {
                              void ai.newConversation();
                          }
                        : undefined
                }
                onClearHistory={
                    ai.isReady
                        ? () => {
                              void ai.clearHistory();
                          }
                        : undefined
                }
            />
        </div>
    );
}

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
 * Renders the panel on the element and scripts the mock provider once the assistant is on.
 * @param element - The element.
 * @returns The rendered panel's unmount.
 */
async function renderAssistant(element: ElementUnderTest): Promise<() => void> {
    const { unmount } = render(
        <ShellProvider initialShellWidth={1440} measureViewport={false} persist={false}>
            <Assistant element={element} />
        </ShellProvider>,
    );
    let provider: MockLlmProvider | undefined;
    await waitFor(
        () => {
            provider = element.getAiManager()?.getProvider() as MockLlmProvider | undefined;
            assert.isDefined(provider);
        },
        { timeout: TIMEOUT_MS },
    );
    provider?.setResponse(ASK, {
        text: "",
        toolCalls: [{ id: "0", name: "edit_data", arguments: { action: "delete_all" } }],
    });
    provider?.setResponse(ASK_QUESTION, {
        text: "",
        toolCalls: [{ id: "q", name: "ask_reader", arguments: { question: QUESTION, choices: ["Sales", "Ops"] } }],
    });
    // The panel offers its conversation actions once the assistant is on.
    await screen.findByRole("button", { name: "Clear history" }, { timeout: TIMEOUT_MS });
    return unmount;
}

/**
 * Types the request into the console, sends it, and waits for the card the element holds it on.
 * @returns The card.
 */
async function askAndWaitForCard(): Promise<HTMLElement> {
    await userEvent.fill(screen.getByRole("textbox", { name: "Ask the assistant" }), ASK);
    await userEvent.click(screen.getByRole("button", { name: "Send" }));
    return screen.findByRole("group", { name: "Approve this change?" }, { timeout: TIMEOUT_MS });
}

/**
 * Types the request the model answers with a question, sends it, and waits for the question card.
 * @returns The card.
 */
async function askAndWaitForQuestion(): Promise<HTMLElement> {
    await userEvent.fill(screen.getByRole("textbox", { name: "Ask the assistant" }), ASK_QUESTION);
    await userEvent.click(screen.getByRole("button", { name: "Send" }));
    return screen.findByRole("group", { name: "The assistant asks" }, { timeout: TIMEOUT_MS });
}

/**
 * The calls the element's mock provider has answered.
 * @param element - The element.
 * @returns How many.
 */
function providerCalls(element: ElementUnderTest): number {
    return (element.getAiManager()?.getProvider() as MockLlmProvider).getCallHistory().length;
}

/**
 * Clicks a choice on the question card and waits until the message has gone on with the answer.
 * @param element - The element.
 * @param card - The card.
 */
async function answerOps(element: ElementUnderTest, card: HTMLElement): Promise<void> {
    const asked = providerCalls(element);
    await userEvent.click(within(card).getByRole("button", { name: "Ops" }));

    // The reader's answer is the reader's message in the transcript, and the card is gone.
    const transcript = screen.getByTestId("ai-transcript");
    await within(transcript).findByText("Ops", {}, { timeout: TIMEOUT_MS });
    await waitFor(
        () => {
            assert.isNull(screen.queryByRole("group", { name: "The assistant asks" }));
        },
        { timeout: TIMEOUT_MS },
    );
    await waitFor(
        () => {
            assert.isAbove(providerCalls(element), asked, "the model was asked again with the answer");
        },
        { timeout: TIMEOUT_MS },
    );
    assert.deepStrictEqual(element.getPendingAiQuestions(), []);
}

afterEach(async () => {
    // The reader's tool switches are saved in this browser: each test starts with them off.
    for (const key of ["graphty.ai.webSearch.v1", "graphty.ai.webFetch.v1", "graphty.ai.inPageCode.v1"]) {
        localStorage.removeItem(key);
    }

    for (const element of mounted.splice(0)) {
        await element.getAiManager()?.clearHistory();
        element.disableAiControl();
        element.remove();
    }
});

describe("the AI panel on the real element", () => {
    it("runs a held change when the reader clicks Approve, and the answer appears", async () => {
        const element = await placeElement(`ai-approve-${crypto.randomUUID()}`);
        await renderAssistant(element);

        const card = await askAndWaitForCard();
        assert.include(card.textContent, CALL_TEXT);
        assert.include(card.textContent, "Discards the graph's 3 nodes and 0 edges.");
        assert.strictEqual(element.session.status.counts.nodes, 3, "nothing ran before the approval");

        await userEvent.click(within(card).getByRole("button", { name: "Approve" }));

        await screen.findByText(`${CALL_TEXT}: Done.`, {}, { timeout: TIMEOUT_MS });
        assert.strictEqual(element.session.status.counts.nodes, 0);
        assert.isNull(screen.queryByRole("group", { name: "Approve this change?" }));
        assert.isNotNull(screen.getByText(ASK), "the reader's message is in the transcript");
    });

    it("leaves the graph unchanged when the reader clicks Deny", async () => {
        const element = await placeElement(`ai-deny-${crypto.randomUUID()}`);
        await renderAssistant(element);

        const card = await askAndWaitForCard();
        await userEvent.click(within(card).getByRole("button", { name: "Deny" }));

        await screen.findByText(
            `${CALL_TEXT}: You declined the change, so nothing was changed.`,
            {},
            {
                timeout: TIMEOUT_MS,
            },
        );
        assert.isNull(screen.queryByRole("group", { name: "Approve this change?" }));
        assert.strictEqual(element.session.status.counts.nodes, 3);
    });

    it("brings the transcript and a still-pending approval back when the element mounts again", async () => {
        const id = `ai-remount-${crypto.randomUUID()}`;
        const first = await placeElement(id);
        const unmount = await renderAssistant(first);
        await askAndWaitForCard();
        unmount();
        first.disableAiControl();
        first.remove();

        // The same id and the same graph: the element reopens the conversation saved under its key.
        const second = await placeElement(id);
        await renderAssistant(second);

        const card = await screen.findByRole("group", { name: "Approve this change?" }, { timeout: TIMEOUT_MS });
        assert.include(card.textContent, CALL_TEXT);
        await screen.findByText(ASK, {}, { timeout: TIMEOUT_MS });
        assert.isNotNull(screen.getByText(`${CALL_TEXT}: This change waits for your approval.`));

        await userEvent.click(within(card).getByRole("button", { name: "Approve" }));
        await screen.findByText(`${CALL_TEXT}: Done.`, {}, { timeout: TIMEOUT_MS });
        assert.strictEqual(second.session.status.counts.nodes, 0);
    });

    it("draws the model's question with one button per choice, and a click continues the message", async () => {
        const element = await placeElement(`ai-question-${crypto.randomUUID()}`);
        await renderAssistant(element);

        const card = await askAndWaitForQuestion();
        assert.include(card.textContent, QUESTION);
        assert.deepStrictEqual(
            within(card)
                .getAllByRole("button")
                .map((button) => button.textContent),
            ["Sales", "Ops"],
        );

        await answerOps(element, card);
    });

    it("brings a still-open question back when the element mounts again", async () => {
        const id = `ai-question-remount-${crypto.randomUUID()}`;
        const first = await placeElement(id);
        const unmount = await renderAssistant(first);
        await askAndWaitForQuestion();
        unmount();
        first.disableAiControl();
        first.remove();

        const second = await placeElement(id);
        await renderAssistant(second);

        const card = await screen.findByRole("group", { name: "The assistant asks" }, { timeout: TIMEOUT_MS });
        assert.include(card.textContent, QUESTION);
        await answerOps(second, card);
    });

    it("runs the model's program in the page once the reader switches on Run code", async () => {
        const element = await placeElement(`ai-run-code-${crypto.randomUUID()}`);
        await renderAssistant(element);
        const before = element.getAiManager();

        const runCode = screen.getByRole("switch", { name: /^Run code/ });
        assert.isFalse((runCode as HTMLInputElement).checked, "off until the reader turns it on");
        await userEvent.click(runCode);

        // The assistant is switched on again with the tool: a new assistant, ready.
        await waitFor(
            () => {
                assert.notStrictEqual(element.getAiManager(), before);
                assert.isDefined(element.getAiManager()?.getProvider());
                assert.strictEqual(screen.getByTestId("assistant").dataset.ready, "true");
            },
            { timeout: TIMEOUT_MS },
        );
        assert.strictEqual(element.getAiCapabilities()?.tools["in-page-code"], "available");
        const provider = element.getAiManager()?.getProvider() as MockLlmProvider;
        provider.setResponse(ASK_CODE, {
            text: "I counted the nodes with code.",
            toolCalls: [{ id: "code1", name: "run_code", arguments: { code: COUNT_PROGRAM } }],
        });

        await userEvent.fill(screen.getByRole("textbox", { name: "Ask the assistant" }), ASK_CODE);
        await userEvent.click(screen.getByRole("button", { name: "Send" }));

        const transcript = screen.getByTestId("ai-transcript");
        await within(transcript).findByText(
            (text) =>
                text.includes("I counted the nodes with code.") &&
                text.includes("run_code") &&
                text.includes(": Done."),
            {},
            { timeout: TIMEOUT_MS },
        );
        // The program really ran: the model was sent the graph's own node count.
        const sent = provider
            .getCallHistory()
            .flatMap((call) => call.messages)
            .find((message) => message.role === "tool")?.content;
        assert.include(sent, `"value":${String(element.session.status.counts.nodes)}`);
    });

    it("holds a change asked for after the assistant read the web, with the web-content wording", async () => {
        const id = `ai-web-content-${crypto.randomUUID()}`;
        const first = await placeElement(id);
        const unmount = await renderAssistant(first);
        await userEvent.fill(screen.getByRole("textbox", { name: "Ask the assistant" }), "hello");
        await userEvent.click(screen.getByRole("button", { name: "Send" }));
        await screen.findByText("This is a mock response.", {}, { timeout: TIMEOUT_MS });

        // A scripted research answer: the saved conversation, as a provider that searched the web
        // would have left it (a hosted web search with its source), in the published format.
        const conversationId = first.getAiConversation()?.id ?? "";
        const record = JSON.parse((await first.exportAiConversation(conversationId)) ?? "{}") as SavedRecord;
        const answer = [...record.messages].reverse().find((message) => message.role === "assistant");
        answer?.parts.push({
            type: "hosted-tool",
            origin: "web",
            tool: "web-search",
            status: "done",
            sources: [{ url: "https://example.org/fr", title: "French cities" }],
        });
        unmount();
        first.disableAiControl();
        first.remove();
        await saveRecord(record);

        const second = await placeElement(id);
        await renderAssistant(second);
        const source = await screen.findByRole("link", { name: "French cities" }, { timeout: TIMEOUT_MS });
        assert.strictEqual(source.getAttribute("href"), "https://example.org/fr");
        assert.strictEqual(source.getAttribute("rel"), "noopener noreferrer");
        assert.strictEqual(source.getAttribute("target"), "_blank");

        (second.getAiManager()?.getProvider() as MockLlmProvider).setResponse(ASK_REMOVE, {
            text: "",
            toolCalls: [{ id: "rm", name: "edit_data", arguments: { action: "remove_nodes", ids: ["b"] } }],
        });
        await userEvent.fill(screen.getByRole("textbox", { name: "Ask the assistant" }), ASK_REMOVE);
        await userEvent.click(screen.getByRole("button", { name: "Send" }));

        const card = await screen.findByRole("group", { name: "Approve this change?" }, { timeout: TIMEOUT_MS });
        assert.include(
            card.textContent,
            "The assistant read web content in this conversation. Approve only what you asked for.",
        );
        assert.strictEqual(second.session.status.counts.nodes, 3, "nothing ran before the approval");

        await userEvent.click(within(card).getByRole("button", { name: "Deny" }));
        await waitFor(
            () => {
                assert.isNull(screen.queryByRole("group", { name: "Approve this change?" }));
            },
            { timeout: TIMEOUT_MS },
        );
        assert.strictEqual(second.session.status.counts.nodes, 3);
    });
});
