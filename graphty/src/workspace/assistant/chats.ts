/**
 * @file The Assistant's chats as the header and the list read them: a chat's title, and the list's
 * rows from what graphty-element lists.
 */

import type { AiConversationSnapshot, AiConversationSummary } from "@graphty/graphty-element/ai";
import { useCallback, useEffect, useState } from "react";

import { useWorkspace } from "../state/WorkspaceContext";
import { WORDS } from "./words";

/** One row of the chat list. */
export interface ChatRow {
    readonly id: string;
    readonly title: string;
    /** When it was last saved; null for the open chat before its first message. */
    readonly updatedAt: string | null;
}

/**
 * A chat's title: the reader's name for it, else their first words, else "New chat".
 * @param chat - the chat's name and first words, or null for none
 * @returns the title
 */
export function chatTitle(chat: Pick<AiConversationSummary, "name" | "firstWords"> | null): string {
    return chat?.name ?? chat?.firstWords ?? WORDS["assistant.list.untitled"];
}

/**
 * The chats while the assistant is set up, for the header's count and the list: the saved chats newest first, as the element lists them, and
 * the open chat on top when it is not saved yet (before its first message). Reloads when the element
 * says the open chat changed.
 * @param shown - whether to list them
 * @param open - the open chat
 * @returns the rows, and a reload
 */
export function useChatRows(
    shown: boolean,
    open: AiConversationSnapshot | null,
): { rows: readonly ChatRow[]; reload: () => void } {
    const { element } = useWorkspace();
    const [saved, setSaved] = useState<readonly AiConversationSummary[] | null>(null);
    const reload = useCallback((): void => {
        void element?.listAiConversations().then(setSaved);
    }, [element]);
    useEffect(() => {
        if (!shown || element === null) {
            setSaved(null);
            return undefined;
        }
        reload();
        element.addEventListener("ai-conversation-changed", reload);
        return () => {
            element.removeEventListener("ai-conversation-changed", reload);
        };
    }, [shown, element, reload]);
    if (saved === null) {
        return { rows: [], reload };
    }
    const rows: ChatRow[] = saved.map((row) => ({ id: row.id, title: chatTitle(row), updatedAt: row.updatedAt }));
    if (open !== null && !rows.some((row) => row.id === open.id)) {
        rows.unshift({ id: open.id, title: chatTitle(open), updatedAt: null });
    }
    return { rows, reload };
}
