/**
 * The transcript follows the newest message while the reader is at its foot; once the reader
 * scrolls up with the wheel to read, a new message leaves them where they are and offers Jump to
 * latest, which takes them back down and follows again.
 */

import React from "react";
import { afterEach, assert, describe, it } from "vitest";
import { cdp, userEvent } from "vitest/browser";

import { render, screen, waitFor } from "../../../../test/test-utils";
import type { ChatMessage } from "../../../ai/AiMessageBubble";
import { ShellProvider } from "../../ShellContext";
import { AiPanel, type AiPanelProps } from "../AiPanel";

/**
 * Messages enough to overflow a short panel.
 * @param count - How many.
 * @returns The messages.
 */
function messages(count: number): ChatMessage[] {
    return Array.from({ length: count }, (_, index) => ({
        id: `m${String(index)}`,
        role: index % 2 === 0 ? ("user" as const) : ("assistant" as const),
        content: `Message ${String(index)}: the servers connect through the bridge node.`,
    }));
}

/**
 * The panel in a 300 px column, as the shell's panel holds it.
 * @param props - The panel's props.
 * @returns The panel.
 */
function Column(props: Partial<AiPanelProps>): React.JSX.Element {
    return (
        <ShellProvider initialShellWidth={1440} measureViewport={false} persist={false}>
            <div style={{ display: "flex", flexDirection: "column", height: 300, width: 280 }}>
                <AiPanel providerConfigured {...props} />
            </div>
        </ShellProvider>
    );
}

/**
 * Whether the transcript shows its last line.
 * @returns True at the foot.
 */
function atFoot(): boolean {
    const transcript = screen.getByTestId("ai-transcript");
    return transcript.scrollHeight - transcript.scrollTop - transcript.clientHeight <= 1;
}

/**
 * Turns the real mouse wheel over the transcript, as a reader scrolling up does.
 * @param deltaY - How far; negative scrolls up.
 */
async function wheel(deltaY: number): Promise<void> {
    const session = cdp() as unknown as { send: (method: string, params: Record<string, unknown>) => Promise<unknown> };
    const rect = screen.getByTestId("ai-transcript").getBoundingClientRect();
    // The test page is an iframe of the runner's page, possibly scaled to fit it.
    const box = window.frameElement?.getBoundingClientRect();
    const scale = box === undefined ? 1 : box.width / window.innerWidth;
    const x = (box?.left ?? 0) + (rect.left + rect.width / 2) * scale;
    const y = (box?.top ?? 0) + (rect.top + rect.height / 2) * scale;
    await session.send("Input.dispatchMouseEvent", { type: "mouseWheel", x, y, deltaX: 0, deltaY });
}

afterEach(() => {
    document.body.innerHTML = "";
});

describe("the transcript's scroll", () => {
    it("follows new messages at the foot, stays put once the reader scrolls up, and Jump to latest returns", async () => {
        const { rerender } = render(<Column messages={messages(20)} />);
        await waitFor(() => {
            assert.isTrue(atFoot(), "opens on the newest message");
        });

        rerender(<Column messages={messages(22)} />);
        await waitFor(() => {
            assert.isTrue(atFoot(), "follows a new message while at the foot");
        });
        assert.isNull(screen.queryByRole("button", { name: "Jump to latest" }));

        await wheel(-400);
        await waitFor(() => {
            assert.isFalse(atFoot());
        });
        const readingAt = screen.getByTestId("ai-transcript").scrollTop;

        rerender(<Column messages={messages(24)} />);
        const jump = await screen.findByRole("button", { name: "Jump to latest" });
        assert.strictEqual(screen.getByTestId("ai-transcript").scrollTop, readingAt, "not yanked down");

        await userEvent.click(jump);
        await waitFor(() => {
            assert.isTrue(atFoot());
        });
        assert.isNull(screen.queryByRole("button", { name: "Jump to latest" }));

        rerender(<Column messages={messages(24)} isProcessing streamingText="The bridge node is b." />);
        await waitFor(() => {
            assert.isTrue(atFoot(), "follows the reply as it streams in");
        });
    });
});
