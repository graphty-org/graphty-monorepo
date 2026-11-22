import type { GraphSession } from "@graphty/graphty-element/session";
import { Button, Group, Kbd, Stack, Text, UnstyledButton } from "@mantine/core";
import React from "react";

import { sourceName } from "../data-place/words";
import { ariaKey, formatKey } from "../keys/keys";
import { useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";
import { DELETE_KEY, READER_EDITS_KEY } from "./keys";
import { removeEdit, toggleReaderEdits } from "./steps";
import { editKindWords, editValueWords, STEP_WORDS } from "./words";

/**
 * Reader edits (design 7.17, the source-steps experiment): the reader's own changes and picks,
 * from `data.edits()`, each with Delete (`data.removeEdit`). R opens and closes the list.
 * @param props - Component props
 * @param props.session - the element's session
 * @returns the list, or nothing while there is no edit
 */
export function ReaderEdits({ session }: Readonly<{ session: GraphSession }>): React.JSX.Element | null {
    const { store } = useWorkspace();
    const open = useWorkspaceState((state) => state.readerEditsOpen);
    const edits = session.data.edits();
    if (edits.length === 0) {
        return null;
    }
    const sources = session.data.sources({ staged: true });
    return (
        <Stack gap={2} className="ss-steps">
            <UnstyledButton
                aria-expanded={open}
                aria-keyshortcuts={ariaKey(READER_EDITS_KEY)}
                onClick={() => {
                    toggleReaderEdits(store);
                }}
            >
                <Group gap={6}>
                    <Text size="xs" fw={600}>
                        {STEP_WORDS.readerEdits}
                    </Text>
                    <Text size="xs" c="dimmed">
                        {edits.length}
                    </Text>
                    <Kbd size="xs">{formatKey(READER_EDITS_KEY)}</Kbd>
                </Group>
            </UnstyledButton>
            {open ? (
                <div // eslint-disable-line jsx-a11y/prefer-tag-over-role -- a <ul>/<li> would bring list styling the compact rows do not use; the role gives the same semantics
                    role="list"
                    aria-label={STEP_WORDS.readerEdits}
                >
                    {edits.map((edit, index) => {
                        const picked =
                            edit.picked === undefined ? undefined : sources.find((each) => each.key === edit.picked);
                        const label = `${editKindWords(edit)} ${edit.target.key}`;
                        const remove = (): void => {
                            void removeEdit(store, session, edit.id);
                        };
                        return (
                            <div // eslint-disable-line jsx-a11y/prefer-tag-over-role, jsx-a11y/no-noninteractive-element-interactions -- a <li> would bring list styling the compact rows do not use; Del pressed on any of the row's buttons deletes it, as its Delete button shows
                                key={edit.id}
                                role="listitem"
                                aria-label={label}
                                onKeyDown={(event) => {
                                    if (event.key === DELETE_KEY) {
                                        event.preventDefault();
                                        remove();
                                    }
                                }}
                            >
                                <Group gap={6} wrap="nowrap">
                                    <Text size="xs" c="dimmed" w={16}>
                                        {index + 1}
                                    </Text>
                                    <Text size="xs" fw={600}>
                                        {editKindWords(edit)}
                                    </Text>
                                    <Text size="xs">{edit.target.key}</Text>
                                    <Text size="xs" truncate style={{ flex: 1, minWidth: 0 }}>
                                        {editValueWords(edit)}
                                    </Text>
                                    {picked === undefined ? null : (
                                        <Text size="xs" c="dimmed" truncate>
                                            {sourceName(picked)}
                                        </Text>
                                    )}
                                    {edit.state === "lost" || edit.state === "source-changed" ? (
                                        <Text size="xs" c="dimmed">
                                            {edit.state === "lost" ? STEP_WORDS.lost : STEP_WORDS.sourceChanged}
                                        </Text>
                                    ) : null}
                                    <Button
                                        size="compact-xs"
                                        variant="subtle"
                                        aria-label={`${STEP_WORDS.delete} ${label}`}
                                        aria-keyshortcuts={ariaKey(DELETE_KEY)}
                                        onClick={remove}
                                    >
                                        <Kbd size="xs">{formatKey(DELETE_KEY)}</Kbd>
                                    </Button>
                                </Group>
                            </div>
                        );
                    })}
                </div>
            ) : null}
        </Stack>
    );
}
