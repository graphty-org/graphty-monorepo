// Storybook does not run src/main.tsx, so the story defines the real <graphty-element> itself.
import "@graphty/graphty-element";

import type { MockLlmProvider } from "@graphty/graphty-element/ai";
import { Box, Button } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import React, { useEffect, useRef, useState } from "react";
import { userEvent, waitFor, within } from "storybook/test";

import { aiTranscript } from "../components/ai/aiResultText";
import { AiPanel } from "../components/shell/panel/AiPanel";
import { ShellProvider } from "../components/shell/ShellContext";
import { useAiManager } from "../hooks/useAiManager";

/** The element itself, by its own published type; the import above registers it. */
type ElementUnderTest = import("@graphty/graphty-element").Graphty;

/** What the reader asks; the mock provider answers it by clearing the graph, which the gate holds. */
const ASK = "clear the graph";

/** The element's id, which scopes the conversations it saves in the browser. */
const ELEMENT_ID = "ai-assistant-story";

/** The story's own button that takes the element off the page and puts a new one in its place. */
const REMOUNT_LABEL = "Mount the element again";

/** Three nodes in a row. */
const NODES = [{ id: "a" }, { id: "b" }, { id: "c" }];
const EDGES = [
    { source: "a", target: "b" },
    { source: "b", target: "c" },
];

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
            providerLabel="mock"
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
    );
}

/**
 * A real element holding three nodes beside the AI panel, and a button that mounts a new element
 * in its place on the same browser database.
 * @returns The story's page.
 */
function AssistantOnElement(): React.JSX.Element {
    const host = useRef<HTMLDivElement>(null);
    const [generation, setGeneration] = useState(0);
    const [element, setElement] = useState<ElementUnderTest | null>(null);

    useEffect(() => {
        const created = document.createElement("graphty-element");
        created.id = ELEMENT_ID;
        created.style.display = "block";
        created.style.width = "100%";
        created.style.height = "100%";
        host.current?.appendChild(created);
        let live = true;
        void (async () => {
            await created.waitForSettled();
            await created.session.layout.setDimension("2d");
            await created.session.layout.set("circular", { options: { scale: 0.2 } });
            await created.session.data.addNodes(NODES);
            await created.session.data.addEdges(EDGES);
            if (live) {
                setElement(created);
            }
        })();

        return () => {
            live = false;
            setElement(null);
            created.remove();
        };
    }, [generation]);

    return (
        <ShellProvider initialShellWidth={1200} measureViewport={false} persist={false}>
            <Box style={{ display: "flex", gap: 16, width: 1100, height: 600 }}>
                <div ref={host} style={{ width: 600, height: 600 }} />
                <Box style={{ width: 400, display: "flex", flexDirection: "column" }}>
                    <Button
                        variant="default"
                        size="xs"
                        onClick={() => {
                            setGeneration((current) => current + 1);
                        }}
                    >
                        {REMOUNT_LABEL}
                    </Button>
                    {element !== null && <Assistant key={generation} element={element} />}
                </Box>
            </Box>
        </ShellProvider>
    );
}

/**
 * The element on the page, once its assistant is on.
 * @param canvasElement - The story's root.
 * @returns The element, its mock provider answering the story's request with a held change.
 */
async function assistantReady(canvasElement: HTMLElement): Promise<ElementUnderTest> {
    let element: ElementUnderTest | null = null;
    await waitFor(
        () => {
            element = canvasElement.querySelector("graphty-element");
            const provider = element?.getAiManager()?.getProvider() as MockLlmProvider | undefined;
            if (provider === undefined) {
                throw new Error("the assistant is not on yet");
            }

            provider.setResponse(ASK, {
                text: "",
                toolCalls: [{ id: "0", name: "edit_data", arguments: { action: "delete_all" } }],
            });
        },
        { timeout: 60_000 },
    );
    if (element === null) {
        throw new Error("the story rendered no <graphty-element>");
    }

    return element;
}

const meta: Meta<typeof AssistantOnElement> = {
    title: "AI/Assistant",
    component: AssistantOnElement,
    parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The reader asks to clear the graph, which the element holds for approval; the element is then
 * mounted again on the same browser database, and its saved transcript and the still-pending
 * approval come back.
 */
export const RememberedApproval: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await assistantReady(canvasElement);
        // Start from nothing saved, whatever an earlier visit left in this browser.
        await userEvent.click(await canvas.findByRole("button", { name: "Clear history" }, { timeout: 60_000 }));

        await userEvent.type(canvas.getByRole("textbox", { name: "Ask the assistant" }), ASK);
        await userEvent.click(canvas.getByRole("button", { name: "Send" }));
        await canvas.findByRole("group", { name: "Approve this change?" }, { timeout: 60_000 });

        await userEvent.click(canvas.getByRole("button", { name: REMOUNT_LABEL }));
        const element = await assistantReady(canvasElement);
        await canvas.findByRole("group", { name: "Approve this change?" }, { timeout: 60_000 });
        await canvas.findByText(ASK, {}, { timeout: 60_000 });
        if (element.session.status.counts.nodes !== NODES.length) {
            throw new Error("the held change ran before it was approved");
        }

        await element.waitForStableFrame();
    },
};
