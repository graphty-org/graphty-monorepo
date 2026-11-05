import type { AiConversationSnapshot, AiStatus } from "@graphty/graphty-element/ai";
import { useEffect, useState } from "react";

import { type AssistantChoice, providerDescriptor } from "../assistant-door/provider";
import { useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";
import { linked } from "./connection";

/** What the panel draws, all of it read from the element. */
export interface AssistantView {
    readonly status: AiStatus | null;
    readonly conversation: AiConversationSnapshot | null;
    /** Whether the element's assistant is up. */
    readonly linked: boolean;
    /** Whether a provider that needs a key has none. */
    readonly keyMissing: boolean;
}

const NOT_LINKED: AssistantView = { status: null, conversation: null, linked: false, keyMissing: false };

/**
 * A run in progress.
 * @param status - the assistant's status.
 * @returns true while a message runs.
 */
export function isRunning(status: AiStatus | null): boolean {
    return status !== null && status.state !== "ready" && status.state !== "error";
}

/**
 * Sets up the assistant on each fresh element and follows what it reports.
 * @param choice - the saved provider and model.
 * @returns the view.
 */
export function useAssistantView(choice: AssistantChoice | null): AssistantView {
    const { element, store } = useWorkspace();
    const links = useWorkspaceState((state) => state.assistantLinks);
    const [view, setView] = useState(NOT_LINKED);
    useEffect(() => {
        if (element !== null && choice !== null) {
            // A failure here is the first message's to report, worded from its code.
            void linked(element, store, choice).catch(() => undefined);
        }
    }, [element, store, choice]);
    useEffect(() => {
        if (element === null || choice === null) {
            setView(NOT_LINKED);
            return undefined;
        }
        const read = (): void => {
            const needed = providerDescriptor(choice.provider).requiresKey;
            setView({
                status: element.getAiStatus(),
                conversation: element.getAiConversation(),
                linked: element.isAiEnabled(),
                keyMissing:
                    needed && element.isAiEnabled() && element.getApiKeyManager()?.hasKey(choice.provider) !== true,
            });
        };
        read();
        const stop = element.onAiStatusChange(read);
        element.addEventListener("ai-conversation-changed", read);
        return () => {
            stop();
            element.removeEventListener("ai-conversation-changed", read);
        };
    }, [element, choice, links]);
    return view;
}
