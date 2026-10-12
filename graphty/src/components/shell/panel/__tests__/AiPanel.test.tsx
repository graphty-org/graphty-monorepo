import type { AiApprovalRequest, AiQuestionRequest } from "@graphty/graphty-element/ai";
import { describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { fireEvent, render, screen, within } from "../../../../test/test-utils";
import type { ChatMessage } from "../../../ai/AiMessageBubble";
import { keyChipFor } from "../../bindings";
import { ShellProvider } from "../../ShellContext";
import { AiPanel, type AiPanelProps } from "../AiPanel";

const message: ChatMessage = {
    id: "one",
    role: "assistant",
    content: "The_Vet is the main bridge.",
    timestamp: 0,
};

function renderPanel(props: Partial<AiPanelProps> = {}) {
    return render(
        <ShellProvider initialShellWidth={1440} measureViewport={false} persist={false}>
            <AiPanel {...props} />
        </ShellProvider>,
    );
}

describe("AiPanel", () => {
    describe("the transcript", () => {
        it("is the transcript's new home", () => {
            renderPanel({ messages: [message] });

            expect(screen.getByText("The_Vet is the main bridge.")).toBeInTheDocument();
        });

        it("draws an empty transcript without an empty-state sentence", () => {
            renderPanel();

            expect(screen.getByTestId("ai-transcript")).toBeEmptyDOMElement();
        });
    });

    describe("the setup prompt", () => {
        it("is drawn only when no provider is configured", () => {
            renderPanel();

            expect(screen.getByText("No provider is configured. Open Settings to connect one.")).toBeInTheDocument();
            expect(screen.getByTestId("ai-open-settings")).toBeInTheDocument();
        });

        it("is gone once a provider is configured", () => {
            renderPanel({ providerConfigured: true, providerLabel: "claude-sonnet-5" });

            expect(
                screen.queryByText("No provider is configured. Open Settings to connect one."),
            ).not.toBeInTheDocument();
        });

        it("opens Settings", () => {
            const onOpenSettings = vi.fn();

            renderPanel({ onOpenSettings });

            fireEvent.click(screen.getByTestId("ai-open-settings"));

            expect(onOpenSettings).toHaveBeenCalledTimes(1);
        });
    });

    describe("the provider row", () => {
        it("names the provider once one is configured", () => {
            renderPanel({ providerConfigured: true, providerLabel: "claude-sonnet-5" });

            expect(screen.getByTestId("ai-provider")).toHaveTextContent("claude-sonnet-5");
        });
    });

    describe("the console", () => {
        it("is drawn with its status tag", () => {
            renderPanel();

            expect(screen.getByTestId("control-section-name")).toHaveTextContent("Console");
            expect(screen.getByTestId("coming-tag")).toBeInTheDocument();
        });
    });

    describe("the chat input", () => {
        it("names itself and carries the binding in its title", () => {
            renderPanel();

            const input = screen.getByRole("textbox", { name: "Ask the assistant" });
            expect(input.closest("[title]")?.getAttribute("title")).toContain("Ask the assistant");
        });

        it("sends on the Send control", () => {
            const onSend = vi.fn();

            renderPanel({ onSend });

            fireEvent.change(screen.getByRole("textbox", { name: "Ask the assistant" }), {
                target: { value: "which cats connect the groups?" },
            });
            fireEvent.click(screen.getByRole("button", { name: "Send" }));

            expect(onSend).toHaveBeenCalledWith("which cats connect the groups?");
        });

        it("sends on the platform key plus Enter, and never on Enter alone", () => {
            const onSend = vi.fn();

            renderPanel({ onSend });

            const input = screen.getByRole("textbox", { name: "Ask the assistant" });

            fireEvent.change(input, { target: { value: "hello" } });

            // Bare Enter opens a new line, so the composer can be typed into; the
            // send gesture is the one the inspector's note input established.
            fireEvent.keyDown(input, { key: "Enter" });
            expect(onSend).not.toHaveBeenCalled();

            fireEvent.keyDown(input, { key: "Enter", shiftKey: true });
            expect(onSend).not.toHaveBeenCalled();

            fireEvent.keyDown(input, { key: "Enter", metaKey: true });
            expect(onSend).toHaveBeenCalledWith("hello");
        });

        it("takes the Send chip from the one binding table rather than a literal", () => {
            renderPanel();

            const chip = keyChipFor("assistantSend");

            expect(chip).not.toBeNull();
            expect(screen.getByTestId("ai-send")).toHaveAttribute("title", `Send (${chip ?? ""})`);
        });

        it("gives the field the panel's control height, so it shares a box with Send", () => {
            renderPanel();

            // AiPanel.dc.html:535 draws the field 24 px tall with an 8 px inset, beside a
            // 24 px Send: compact-mantine's borderless field, 4 + 16 + 4.
            const computed = getComputedStyle(screen.getByTestId("ai-input"));

            expect(computed.minHeight).toBe("24px");
            expect(computed.lineHeight).toBe("16px");
            expect(computed.paddingTop).toBe("4px");
            expect(computed.paddingBottom).toBe("4px");
            expect(computed.paddingLeft).toBe("8px");
        });

        it("sends nothing on an empty draft", () => {
            const onSend = vi.fn();

            renderPanel({ onSend });

            fireEvent.click(screen.getByRole("button", { name: "Send" }));

            expect(onSend).not.toHaveBeenCalled();
        });
    });

    describe("dictation", () => {
        it("draws no microphone where speech recognition does not exist", () => {
            renderPanel();

            expect(screen.queryByTestId("ai-microphone")).not.toBeInTheDocument();
        });

        it("draws it where it does, and names its state", () => {
            renderPanel({ speechAvailable: true, listening: true });

            const mic = screen.getByTestId("ai-microphone");
            expect(mic).toHaveAccessibleName("Stop listening");
            expect(mic).toHaveAttribute("aria-pressed", "true");
        });

        it("is not pressed while nothing is heard", () => {
            renderPanel({ speechAvailable: true, listening: false });

            expect(screen.getByTestId("ai-microphone")).toHaveAttribute("aria-pressed", "false");
        });

        it("talks while Space is held on it, and the release does not toggle it back on", async () => {
            const onListeningChange = vi.fn();
            renderPanel({ speechAvailable: true, onListeningChange });

            screen.getByTestId("ai-microphone").focus();
            await userEvent.keyboard("[Space>]");
            expect(onListeningChange.mock.calls).toEqual([[true]]);
            await userEvent.keyboard("[/Space]");
            expect(onListeningChange.mock.calls).toEqual([[true], [false]]);
        });

        it("a press whose click never comes (a cancelled pointer) does not swallow the next Enter", async () => {
            const onListeningChange = vi.fn();
            renderPanel({ speechAvailable: true, onListeningChange });
            const mic = screen.getByTestId("ai-microphone");

            // A cancelled pointer (a touch turned into a scroll) cannot be made with
            // userEvent; the events are dispatched as the browser sends them.
            fireEvent.pointerDown(mic, { button: 0, pointerId: 1 });
            fireEvent.pointerCancel(mic, { pointerId: 1 });
            expect(onListeningChange.mock.calls).toEqual([[true], [false]]);
            await new Promise((resolve) => setTimeout(resolve, 0));

            mic.focus();
            await userEvent.keyboard("{Enter}");
            expect(onListeningChange.mock.calls).toEqual([[true], [false], [true]]);
        });

        it("names where speech goes in the microphone's tooltip", () => {
            renderPanel({
                speechAvailable: true,
                speechDestination: "Your speech is turned into text on this device.",
            });

            expect(screen.getByTestId("ai-microphone")).toHaveAttribute(
                "title",
                "Stop listening. Your speech is turned into text on this device.",
            );
        });

        it("toggles on a click with no hold, for keyboard and switch users", async () => {
            const onListeningChange = vi.fn();
            const { rerender } = renderPanel({ speechAvailable: true, onListeningChange });

            screen.getByTestId("ai-microphone").focus();
            await userEvent.keyboard("{Enter}");
            expect(onListeningChange.mock.calls).toEqual([[true]]);

            rerender(
                <ShellProvider initialShellWidth={1440} measureViewport={false} persist={false}>
                    <AiPanel speechAvailable listening onListeningChange={onListeningChange} />
                </ShellProvider>,
            );
            await userEvent.keyboard("{Enter}");
            expect(onListeningChange.mock.calls).toEqual([[true], [false]]);
        });
    });

    describe("the in-flight controls", () => {
        it("offers Cancel while a call is in flight", () => {
            const onCancel = vi.fn();

            renderPanel({ isProcessing: true, onCancel });

            fireEvent.click(screen.getByTestId("ai-cancel"));

            expect(onCancel).toHaveBeenCalledTimes(1);
        });

        it("offers Retry on a failed message", () => {
            const onRetry = vi.fn();
            const failed: ChatMessage = { ...message, id: "bad", isError: true, content: "Error: no" };

            renderPanel({ messages: [failed], onRetry });

            fireEvent.click(screen.getByTestId("ai-retry"));

            expect(onRetry).toHaveBeenCalledTimes(1);
        });
    });

    describe("the per-step record", () => {
        it("draws one row per tool call, linking into its home panel", () => {
            const onOpenHome = vi.fn();

            renderPanel({
                steps: [
                    {
                        id: "groups",
                        title: "Ran Groups",
                        technical: "(Communities, Louvain)",
                        record: "resolution 1.0, seed 42, 20 of 20 nodes, 12 ms",
                        onOpenHome,
                    },
                ],
            });

            expect(screen.getByText("resolution 1.0, seed 42, 20 of 20 nodes, 12 ms")).toBeInTheDocument();

            fireEvent.click(screen.getByTestId("ai-step-title"));

            expect(onOpenHome).toHaveBeenCalledTimes(1);
        });
    });

    describe("the approval card", () => {
        const request: AiApprovalRequest = {
            id: "req-1",
            gate: "replaces",
            calls: [{ tool: "edit_data", arguments: { action: "delete_all" } }],
            preview: { nodes: 3, edges: 1 },
        };

        it("shows the held call as text and the preview's counts in the app's words", () => {
            renderPanel({ approvals: [request] });

            const card = screen.getByRole("group", { name: "Approve this change?" });
            expect(card).toHaveTextContent('edit_data {"action":"delete_all"}');
            expect(card).toHaveTextContent("Discards the graph's 3 nodes and 1 edge.");
        });

        it("draws no card when nothing waits", () => {
            renderPanel();

            expect(screen.queryByTestId("ai-approval")).not.toBeInTheDocument();
        });

        it("approves and denies by the request's id", async () => {
            const onApprove = vi.fn();
            const onDeny = vi.fn();
            renderPanel({ approvals: [request], onApprove, onDeny });

            await userEvent.click(screen.getByRole("button", { name: "Deny" }));
            expect(onDeny).toHaveBeenCalledWith("req-1");
            expect(onApprove).not.toHaveBeenCalled();

            await userEvent.click(screen.getByRole("button", { name: "Approve" }));
            expect(onApprove).toHaveBeenCalledWith("req-1");
        });
    });

    describe("the question card", () => {
        const question: AiQuestionRequest = {
            id: "q-1",
            question: "Which department is your favorite?",
            choices: ["Sales", "Ops", "R&D"],
            multiple: false,
        };

        it("shows the model's question and one button per choice", () => {
            renderPanel({ questions: [question] });

            const card = screen.getByRole("group", { name: "The assistant asks" });
            expect(card).toHaveTextContent("Which department is your favorite?");
            for (const choice of question.choices) {
                expect(within(card).getByRole("button", { name: choice })).toBeInTheDocument();
            }
        });

        it("answers by the request's id and the clicked choice", async () => {
            const onAnswer = vi.fn();
            renderPanel({ questions: [question], onAnswer });

            await userEvent.click(screen.getByRole("button", { name: "R&D" }));
            expect(onAnswer).toHaveBeenCalledExactlyOnceWith("q-1", "R&D");
        });

        it("draws no card when nothing is asked", () => {
            renderPanel();

            expect(screen.queryByTestId("ai-question")).not.toBeInTheDocument();
        });
    });

    describe("a plan held for approval", () => {
        it("says the assistant hands work to a helper, and which helper asks", () => {
            renderPanel({
                approvals: [
                    {
                        id: "req-2",
                        gate: "plan",
                        calls: [{ tool: "delegate", arguments: { agent: "stylist", task: "color them red" } }],
                        preview: {},
                        agent: "planner",
                    },
                ],
            });

            const card = screen.getByRole("group", { name: "Approve this change?" });
            expect(card).toHaveTextContent("The assistant wants to hand this work to a helper.");
            expect(card).toHaveTextContent("Asked by the helper planner.");
        });
    });

    describe("a helper's message", () => {
        it("is labeled with the helper's name", () => {
            renderPanel({ messages: [{ id: "m1", role: "assistant", content: "3 nodes", agent: "counter" }] });

            expect(screen.getByTestId("ai-message-agent")).toHaveTextContent("Helper: counter");
        });
    });

    describe("the conversation row", () => {
        it("starts a new conversation and clears history", async () => {
            const onNewConversation = vi.fn();
            const onClearHistory = vi.fn();
            renderPanel({ onNewConversation, onClearHistory });

            await userEvent.click(screen.getByRole("button", { name: "New conversation" }));
            expect(onNewConversation).toHaveBeenCalledTimes(1);

            await userEvent.click(screen.getByRole("button", { name: "Clear history" }));
            expect(onClearHistory).toHaveBeenCalledTimes(1);
        });

        it("is not drawn without its actions", () => {
            renderPanel();

            expect(screen.queryByRole("button", { name: "New conversation" })).not.toBeInTheDocument();
        });
    });
});
