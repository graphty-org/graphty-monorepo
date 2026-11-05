import type {
    AiApprovalRequest,
    AiConversationSnapshot,
    AiQuestionRequest,
    AiStatus,
} from "@graphty/graphty-element/ai";
import { useEffect, useState } from "react";

import { type AssistantChoice, providerDescriptor } from "../assistant-door/provider";
import { useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";
import { linked } from "./connection";

/** What the panel draws, all of it read from the element. */
export interface AssistantView {
    readonly status: AiStatus | null;
    readonly conversation: AiConversationSnapshot | null;
    /** The approvals and the questions that wait on the reader, oldest first. */
    readonly approvals: readonly AiApprovalRequest[];
    readonly questions: readonly AiQuestionRequest[];
    /** Whether the element's assistant is up. */
    readonly linked: boolean;
    /** Whether a provider that needs a key has none. */
    readonly keyMissing: boolean;
}

const NOT_LINKED: AssistantView = {
    status: null,
    conversation: null,
    approvals: [],
    questions: [],
    linked: false,
    keyMissing: false,
};

/** What can change the requests that wait. */
const REQUEST_EVENTS = ["ai-approval-requested", "ai-question-asked", "ai-pending-resolved"] as const;

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
    const asked = useWorkspaceState((state) => state.assistantTalkPress);
    const [view, setView] = useState(NOT_LINKED);
    useEffect(() => {
        if (element !== null && choice !== null) {
            // A failure here is the first message's to report, worded from its code. A Talk press
            // ends with it: no Talk comes up to take it, and later it would open the microphone.
            void linked(element, store, choice).catch(() => {
                store.set({ assistantTalkPress: false });
            });
        }
    }, [element, store, choice, asked]);
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
                approvals: element.getPendingAiApprovals(),
                questions: element.getPendingAiQuestions(),
                linked: element.isAiEnabled(),
                keyMissing:
                    needed && element.isAiEnabled() && element.getApiKeyManager()?.hasKey(choice.provider) !== true,
            });
        };
        read();
        const stop = element.onAiStatusChange(read);
        for (const type of ["ai-conversation-changed", ...REQUEST_EVENTS] as const) {
            element.addEventListener(type, read);
        }
        return () => {
            stop();
            for (const type of ["ai-conversation-changed", ...REQUEST_EVENTS] as const) {
                element.removeEventListener(type, read);
            }
        };
    }, [element, choice, links]);
    return view;
}
