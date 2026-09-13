import { describe, expect, it, vi } from "vitest";

import { fireEvent, render, screen } from "../../../../test/test-utils";
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
            // 24 px Send. Mantine's own size="sm" metrics make it 36 px, which is the
            // 12 px overhang this measures against.
            const computed = getComputedStyle(screen.getByTestId("ai-input"));

            expect(computed.minHeight).toBe("24px");
            expect(computed.lineHeight).toBe("16px");
            expect(computed.paddingTop).toBe("3px");
            expect(computed.paddingBottom).toBe("3px");
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
});
