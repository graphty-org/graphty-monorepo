import { ActionIcon, Button, Group, Menu, Text } from "@mantine/core";
import React, { useEffect, useRef, useState } from "react";

import { CommandMenuItem } from "../frame/menus";
import { RenameInput } from "../frame/RenameInput";
import { GLYPHS } from "../glyphs";
import { useWorkspace } from "../state/WorkspaceContext";
import type { ChatRow } from "./chats";
import { chatMenuName, WORDS } from "./words";

/** The longest chat name the rename field takes. */
const NAME_MAX = 100;

/**
 * A short date: "Nov 6", with the year when it is not this year.
 * @param iso - an ISO time
 * @returns the date
 */
function shortDate(iso: string): string {
    const date = new Date(iso);
    const options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
    if (date.getFullYear() !== new Date().getFullYear()) {
        options.year = "numeric";
    }
    return date.toLocaleDateString(undefined, options);
}

/** Props for ChatListRow. */
interface ChatListRowProps {
    readonly row: ChatRow;
    readonly current: boolean;
    readonly onOpen: () => void;
    readonly onRename: (name: string | null, how: "key" | "left") => void;
    readonly onDelete: () => void;
}

/**
 * One chat: a button that opens it (its date read with it), the date, and "..." with Rename (F2)
 * and Delete. Rename swaps the title for a field; Delete asks on the row first.
 * @param props - Component props
 * @param props.row - the chat
 * @param props.current - whether it is the open chat
 * @param props.onOpen - opens it
 * @param props.onRename - takes the new name, or null when the rename was cancelled, and how it ended
 * @param props.onDelete - deletes it, once confirmed
 * @returns the row
 */
function ChatListRow({ row, current, onOpen, onRename, onDelete }: ChatListRowProps): React.JSX.Element {
    const [renaming, setRenaming] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const keep = useRef<HTMLButtonElement>(null);
    const date = row.updatedAt === null ? null : shortDate(row.updatedAt);
    useEffect(() => {
        if (!deleting) {
            return undefined;
        }
        // After the menu that asked has closed and handed focus back.
        const timer = setTimeout(() => {
            keep.current?.focus();
        }, 0);
        return () => {
            clearTimeout(timer);
        };
    }, [deleting]);
    if (deleting) {
        return (
            <li className="ws-chat-row" data-chat={row.id}>
                <Text size="xs">{WORDS["assistant.list.confirm"]}</Text>
                <Group gap={4}>
                    <Button variant="default" size="compact-xs" onClick={onDelete}>
                        {WORDS["assistant.list.delete"]}
                    </Button>
                    <Button
                        ref={keep}
                        variant="default"
                        size="compact-xs"
                        onClick={() => {
                            setDeleting(false);
                        }}
                    >
                        {WORDS["assistant.list.keep"]}
                    </Button>
                </Group>
            </li>
        );
    }
    return (
        <li className="ws-chat-row" data-chat={row.id}>
            {renaming ? (
                <RenameInput
                    name={row.title}
                    label={WORDS["assistant.list.name-field"]}
                    container=".ws-chat-row"
                    maxLength={NAME_MAX}
                    className="ws-chat-rename"
                    onDone={(name, how) => {
                        setRenaming(false);
                        onRename(name, how);
                    }}
                />
            ) : (
                <Button
                    variant="subtle"
                    color="gray"
                    size="compact-sm"
                    fullWidth
                    justify="flex-start"
                    className="ws-chat-open"
                    data-chat-open={row.id}
                    aria-current={current ? "true" : undefined}
                    aria-description={date ?? undefined}
                    leftSection={
                        current ? (
                            <GLYPHS.check size={12} aria-hidden />
                        ) : (
                            <span className="ws-chat-nocheck" aria-hidden />
                        )
                    }
                    onClick={onOpen}
                    onKeyDown={(event) => {
                        if (event.key === "F2" && row.updatedAt !== null) {
                            event.preventDefault();
                            setRenaming(true);
                        }
                    }}
                >
                    <span className="ws-chat-title">{row.title}</span>
                </Button>
            )}
            {date === null ? null : (
                <>
                    <Text size="xs" c="dimmed" className="ws-chat-date" aria-hidden>
                        {date}
                    </Text>
                    <Menu position="bottom-end">
                        <Menu.Target>
                            <ActionIcon variant="subtle" color="gray" size="sm" aria-label={chatMenuName(row.title)}>
                                <GLYPHS.more size={14} aria-hidden />
                            </ActionIcon>
                        </Menu.Target>
                        <Menu.Dropdown>
                            <CommandMenuItem
                                icon={<GLYPHS.rename size={14} aria-hidden />}
                                label={WORDS["assistant.list.rename"]}
                                shortcut="F2"
                                reason={null}
                                onRun={() => {
                                    setRenaming(true);
                                }}
                            />
                            <CommandMenuItem
                                icon={<GLYPHS.delete size={14} aria-hidden />}
                                label={WORDS["assistant.list.delete"]}
                                shortcut={undefined}
                                reason={null}
                                onRun={() => {
                                    setDeleting(true);
                                }}
                            />
                        </Menu.Dropdown>
                    </Menu>
                </>
            )}
        </li>
    );
}

/** Props for ConversationList. */
interface ConversationListProps {
    readonly id: string;
    readonly rows: readonly ChatRow[];
    readonly openId: string | null;
    readonly reload: () => void;
    readonly onClose: () => void;
}

/**
 * The chats in place of the log: newest first, each opened, renamed or deleted from its row. Opening
 * the list focuses the open chat's row; Esc returns to the log.
 * @param props - Component props
 * @param props.id - the list's id, which the header's switch controls
 * @param props.rows - the chats
 * @param props.openId - the open chat's id
 * @param props.reload - lists the chats again
 * @param props.onClose - returns to the log
 * @returns The list
 */
export function ConversationList({ id, rows, openId, reload, onClose }: ConversationListProps): React.JSX.Element {
    const { element, store } = useWorkspace();
    const list = useRef<HTMLElement>(null);
    // The row whose button takes focus once it is drawn: the open chat's at first.
    const [focusTo, setFocusTo] = useState<string | null>(openId);
    useEffect(() => {
        if (focusTo === null) {
            return;
        }
        // A rename field opened meanwhile keeps the focus it took.
        if (document.activeElement?.closest(".ws-chat-rename") instanceof HTMLElement) {
            setFocusTo(null);
            return;
        }
        const button = list.current?.querySelector<HTMLElement>(`[data-chat-open="${CSS.escape(focusTo)}"]`);
        if (button) {
            button.focus();
            setFocusTo(null);
        }
    }, [focusTo, rows]);
    const rename = (row: ChatRow, name: string | null, how: "key" | "left"): void => {
        // A rename ended by moving focus on (Tab, a click elsewhere) leaves it there.
        if (how === "key") {
            setFocusTo(row.id);
        }
        const next = name?.trim();
        if (next === undefined || next === row.title || element === null) {
            return;
        }
        // Empty returns the chat to its first words.
        element
            .renameAiConversation(row.id, next === "" ? null : next)
            .then(reload)
            .catch(() => {
                store.set({ notice: { message: WORDS["assistant.list.not-renamed"] } });
            });
    };
    const remove = (row: ChatRow, index: number): void => {
        const next = rows[index + 1] ?? rows[index - 1];
        void element?.deleteAiConversation(row.id).then(() => {
            if (openId === row.id) {
                store.set({ assistantEnded: null });
            }
            reload();
            if (next === undefined) {
                store.set((state) => ({ composerCalls: state.composerCalls + 1 }));
            } else {
                setFocusTo(next.id);
            }
        });
    };
    return (
        <section // NOSONAR(S6847): only catches Esc bubbling from the list's own controls
            ref={list}
            id={id}
            className="ws-assistant-log"
            aria-label={WORDS["assistant.list.name"]}
            onKeyDown={(event) => {
                // A menu's portal bubbles its Esc here through React; that Esc only closes the menu.
                if (
                    event.key === "Escape" &&
                    event.target instanceof Node &&
                    event.currentTarget.contains(event.target)
                ) {
                    event.preventDefault();
                    onClose();
                }
            }}
        >
            <ul className="ws-assistant-list" aria-label={WORDS["assistant.list.name"]}>
                {rows.map((row, index) => (
                    <ChatListRow
                        key={row.id}
                        row={row}
                        current={row.id === openId}
                        onOpen={() => {
                            if (row.id === openId) {
                                onClose();
                                return;
                            }
                            void element?.openAiConversation(row.id).then(() => {
                                store.set({ assistantEnded: null });
                                onClose();
                            });
                        }}
                        onRename={(name, how) => {
                            rename(row, name, how);
                        }}
                        onDelete={() => {
                            remove(row, index);
                        }}
                    />
                ))}
            </ul>
        </section>
    );
}
