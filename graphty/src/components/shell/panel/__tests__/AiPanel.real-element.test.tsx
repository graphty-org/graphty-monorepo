/**
 * The AI panel on the REAL graphty-element, its assistant on the scripted mock provider: the
 * transcript is the element's saved conversation, a change the element holds shows as a card,
 * Approve runs it and Deny leaves the graph alone, and an element mounted again on the same
 * browser database brings the transcript and a still-pending approval back.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { MockLlmProvider } from "@graphty/graphty-element/ai";
import React from "react";
import { afterEach, assert, describe, it } from "vitest";
import { userEvent } from "vitest/browser";

import { useAiManager } from "../../../../hooks/useAiManager";
import { render, screen, waitFor, within } from "../../../../test/test-utils";
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

afterEach(async () => {
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
});
