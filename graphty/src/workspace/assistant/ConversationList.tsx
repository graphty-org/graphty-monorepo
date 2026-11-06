import type { AiConversationSummary } from "@graphty/graphty-element/ai";
import { Button, Group, Text } from "@mantine/core";
import React, { useEffect, useRef, useState } from "react";

import { useWorkspace } from "../state/WorkspaceContext";
import { WORDS } from "./words";

/**
 * This graph's saved conversations in place of the log: newest first, the reader's first words and
 * a date, with Open and Delete. Esc returns to the log.
 * @param props - Component props
 * @param props.onClose - returns to the log
 * @returns The list
 */
export function ConversationList({ onClose }: Readonly<{ onClose: () => void }>): React.JSX.Element {
    const { element, store } = useWorkspace();
    const [rows, setRows] = useState<readonly AiConversationSummary[]>([]);
    const [deleting, setDeleting] = useState<string | null>(null);
    const list = useRef<HTMLElement>(null);
    useEffect(() => {
        void element?.listAiConversations().then(setRows);
    }, [element]);
    useEffect(() => {
        list.current?.querySelector("button")?.focus();
    }, [rows.length]);
    return (
        <section // NOSONAR(S6847): only catches Esc bubbling from the list's own buttons
            ref={list}
            className="ws-assistant-log"
            aria-label={WORDS["assistant.list.name"]}
            onKeyDown={(event) => {
                if (event.key === "Escape") {
                    event.preventDefault();
                    onClose();
                }
            }}
        >
            <ul className="ws-assistant-list">
                {rows.map((row) => (
                    <li key={row.id}>
                        <Text size="sm" truncate="end">
                            {row.firstWords ?? WORDS["assistant.list.untitled"]}
                        </Text>
                        <Text size="xs" c="dimmed">
                            {new Date(row.updatedAt).toLocaleDateString()}
                        </Text>
                        {deleting === row.id ? (
                            <Group gap={4}>
                                <Text size="xs">{WORDS["assistant.list.confirm"]}</Text>
                                <Button
                                    variant="default"
                                    size="compact-xs"
                                    onClick={() => {
                                        const open = element?.getAiConversation()?.id === row.id;
                                        void element?.deleteAiConversation(row.id).then(() => {
                                            setDeleting(null);
                                            if (open) {
                                                store.set({ assistantEnded: null });
                                            }
                                            setRows(rows.filter((other) => other.id !== row.id));
                                        });
                                    }}
                                >
                                    {WORDS["assistant.list.delete"]}
                                </Button>
                                <Button
                                    variant="default"
                                    size="compact-xs"
                                    onClick={() => {
                                        setDeleting(null);
                                    }}
                                >
                                    {WORDS["assistant.list.keep"]}
                                </Button>
                            </Group>
                        ) : (
                            <Group gap={4}>
                                <Button
                                    variant="default"
                                    size="compact-xs"
                                    aria-label={`${WORDS["assistant.list.open"]}: ${row.firstWords ?? WORDS["assistant.list.untitled"]}`}
                                    onClick={() => {
                                        void element?.openAiConversation(row.id).then(() => {
                                            store.set({ assistantEnded: null });
                                            onClose();
                                        });
                                    }}
                                >
                                    {WORDS["assistant.list.open"]}
                                </Button>
                                <Button
                                    variant="default"
                                    size="compact-xs"
                                    aria-label={`${WORDS["assistant.list.delete"]}: ${row.firstWords ?? WORDS["assistant.list.untitled"]}`}
                                    onClick={() => {
                                        setDeleting(row.id);
                                    }}
                                >
                                    {WORDS["assistant.list.delete"]}
                                </Button>
                            </Group>
                        )}
                    </li>
                ))}
            </ul>
        </section>
    );
}
