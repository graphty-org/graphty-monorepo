import { ControlSection } from "@graphty/compact-mantine";
import type { GraphSession, Note, NoteTarget, NoteTargetInput } from "@graphty/graphty-element/session";
import { ActionIcon, Button, Group, Stack, Text, Textarea, Tooltip } from "@mantine/core";
import React, { useEffect, useRef, useState } from "react";

import { CommandButton } from "../frame/CommandButton";
import { GLYPHS } from "../glyphs";
import { useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";
import { aboutWords, noteTimeWords, targetStateWords, targetWords } from "./words";

/**
 * Re-renders whenever the notes change, and when the filter or the data change what a target
 * points at.
 * @param session - the element's session, or null.
 * @returns a number that changes with each change.
 */
function useNotesVersion(session: GraphSession | null): number {
    const [version, setVersion] = useState(0);
    useEffect(() => {
        if (session === null) {
            return undefined;
        }
        const bump = (): void => {
            setVersion((v) => v + 1);
        };
        const offs = (["note:changed", "visibility:changed", "project:changed", "run:changed"] as const).map((event) =>
            session.on(event, bump),
        );
        return () => {
            offs.forEach((off) => {
                off();
            });
        };
    }, [session]);
    return version;
}

/**
 * Opens a note's target in the inspector: selects its node or edges, clears the selection for the
 * graph, or opens a run's row.
 * @param session - the session.
 * @param note - the note.
 * @param index - which of its targets.
 * @param openRun - opens a run's row.
 */
function openTarget(session: GraphSession, note: Note, index: number, openRun: (run: string) => void): void {
    const target = note.targets[index];
    if ("graph" in target) {
        session.selection.clear();
    } else if ("result" in target) {
        openRun(target.result);
    } else {
        void session.selection.apply({ note: note.id, target: index });
    }
}

/**
 * How a note is named inside its controls' names, so two notes' controls never share a name:
 * its first line, cut at 40 characters.
 * @param text - the note's text.
 * @returns the words.
 */
function noteName(text: string): string {
    const line = text.trim().split("\n")[0] ?? "";
    return line.length > 40 ? `${line.slice(0, 39).trimEnd()}...` : line;
}

/** Props for Chips. */
interface ChipsProps {
    readonly session: GraphSession;
    readonly targets: readonly (NoteTarget | NoteTargetInput)[];
    /** What each target points at now; absent for the editor's targets. */
    readonly states?: readonly (string | null)[];
    /** Opens a target; absent for the editor's targets, which are only shown. */
    readonly onOpen?: (index: number) => void;
    /** Whether the chips are in the Tab order. */
    readonly tabbable?: boolean;
    /** The note's text, which each chip's name ends with; absent for the editor's targets. */
    readonly note?: string;
}

/**
 * A note's target chips: each target's name, a button that opens it, with the words for a target
 * the filter hides or the data no longer holds.
 * @param props - Component props
 * @param props.session - The session
 * @param props.targets - The targets
 * @param props.states - What each target points at now, in words or null
 * @param props.onOpen - Opens a target
 * @param props.tabbable - Whether the chips are in the Tab order
 * @param props.note - The note's text, which each chip's name ends with
 * @returns The chips
 */
function Chips({ session, targets, states, onOpen, tabbable = true, note }: ChipsProps): React.JSX.Element {
    return (
        <Group gap={4}>
            {targets.map((target, index) => {
                const words = targetWords(session, target);
                const state = states?.[index] ?? null;
                return (
                    <Group key={`${String(index)}:${words}`} gap={4} wrap="nowrap">
                        {onOpen === undefined ? (
                            <Text size="xs" fw={600}>
                                {words}
                            </Text>
                        ) : (
                            <Button
                                size="compact-xs"
                                variant="light"
                                tabIndex={tabbable ? 0 : -1}
                                aria-label={note === undefined ? undefined : `${words}, in note: ${noteName(note)}`}
                                onClick={() => {
                                    onOpen(index);
                                }}
                            >
                                {words}
                            </Button>
                        )}
                        {state !== null && (
                            <Text size="xs" c="dimmed">
                                {state}
                            </Text>
                        )}
                    </Group>
                );
            })}
        </Group>
    );
}

/**
 * The editor at the top of the list: what the note is about, the text, Save and Cancel. Mod+Enter
 * saves from anywhere in it; Esc closes an empty one and leaves a written one open with its text.
 * @param props - Component props
 * @param props.onSaved - Called with the new note's id once it is saved
 * @returns The editor, or null when no note is being written
 */
function Editor({ onSaved }: Readonly<{ onSaved: (id: string) => void }>): React.JSX.Element | null {
    const { session, store } = useWorkspace();
    const draft = useWorkspaceState((state) => state.noteDraft);
    const [error, setError] = useState<string | null>(null);
    // Add note while a note is open (its text kept, or new targets) puts the cursor back in it:
    // notes.add writes a fresh `targets`, typing does not.
    const field = useRef<HTMLTextAreaElement>(null);
    const targets = draft?.targets;
    useEffect(() => {
        field.current?.focus();
    }, [targets]);
    if (session === null || draft === null) {
        return null;
    }
    const close = (): void => {
        store.set({ noteDraft: null });
    };
    const save = (): void => {
        if (draft.text.trim() === "") {
            setError("Write something first");
            return;
        }
        let id: string;
        try {
            id = session.notes.add({ text: draft.text, targets: draft.targets });
        } catch {
            setError("This note could not be saved");
            return;
        }
        setError(null);
        store.set({ noteDraft: null, announcement: `Note added about ${aboutWords(session, draft.targets)}` });
        onSaved(id);
    };
    return (
        <Stack
            gap={6}
            px="md"
            py="xs"
            className="nt-editor"
            // Mod+Enter saves from anywhere in the editor, its buttons too.
            onKeyDown={(event) => {
                if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                    event.preventDefault();
                    save();
                }
            }}
        >
            <Group gap={4}>
                <Text size="xs" c="dimmed">
                    About
                </Text>
                <Chips session={session} targets={draft.targets} />
            </Group>
            <Textarea
                ref={field}
                aria-label="Note"
                autosize
                minRows={3}
                data-autofocus
                autoFocus
                value={draft.text}
                error={error}
                onChange={(event) => {
                    store.set({ noteDraft: { ...draft, text: event.currentTarget.value } });
                }}
                onKeyDown={(event) => {
                    if (event.key === "Escape" && draft.text.trim() === "") {
                        event.preventDefault();
                        close();
                    }
                }}
            />
            <Group gap={6} justify="flex-end">
                <Button size="compact-sm" variant="subtle" onClick={close}>
                    Cancel
                </Button>
                <Button size="compact-sm" onClick={save}>
                    Save note
                </Button>
            </Group>
        </Stack>
    );
}

/**
 * The Notes place (tier2-design.md section 3): the editor when a note is being written, then the
 * notes, newest first. The list is one Tab stop; Up and Down move between notes, Delete removes
 * the focused one, and focus then goes to the next note, or to "+" when none is left. A saved
 * note takes focus itself.
 * @returns The Notes place
 */
export function NotesPlace(): React.JSX.Element {
    const { session, store } = useWorkspace();
    const version = useNotesVersion(session);
    const editing = useWorkspaceState((state) => state.noteDraft !== null);
    const notes = session?.notes.list() ?? [];
    const [active, setActive] = useState(0);
    const items = useRef<(HTMLLIElement | null)[]>([]);
    const plus = useRef<HTMLSpanElement>(null);
    // The note to focus once the list has drawn it: the next one after a delete.
    const pending = useRef<string | null>(null);
    const current = Math.min(active, Math.max(notes.length - 1, 0));
    useEffect(() => {
        const index = (session?.notes.list() ?? []).findIndex((note) => note.id === pending.current);
        if (index >= 0) {
            pending.current = null;
            setActive(index);
            items.current[index]?.focus();
        }
    }, [version, session]);
    const focusWhenDrawn = (id: string): void => {
        pending.current = id;
    };

    const focusAt = (index: number): void => {
        setActive(index);
        items.current[index]?.focus();
    };
    const remove = (index: number): void => {
        const note = notes.at(index);
        if (session === null || note === undefined) {
            return;
        }
        // The next note, or the one above when the last one goes, or "+" when none is left.
        const next = notes.at(index + 1) ?? (index > 0 ? notes.at(index - 1) : undefined);
        if (next === undefined) {
            plus.current?.querySelector("button")?.focus();
        } else {
            focusWhenDrawn(next.id);
        }
        session.notes.remove(note.id);
    };
    const openRun = (run: string): void => {
        store.set({ inspected: { kind: "run-row", id: run } });
    };

    return (
        <section className="nt" aria-label="Notes place">
            <ControlSection
                label="Notes"
                collapsible={false}
                actions={
                    <span ref={plus}>
                        <CommandButton id="notes.add" icon={<GLYPHS.add size={14} aria-hidden />} />
                    </span>
                }
            >
                {/* A saved note takes focus itself, so it reads whole: focus on "+" opened its
                    tooltip over the note just written. */}
                <Editor onSaved={focusWhenDrawn} />
                {notes.length === 0 ? (
                    !editing && (
                        <Text size="sm" c="dimmed" px="md" py="xs">
                            No notes.
                        </Text>
                    )
                ) : (
                    <ul className="nt-list" aria-label="Notes" style={{ listStyle: "none", margin: 0, padding: 0 }}>
                        {session !== null &&
                            notes.map((note, index) => {
                                const status = session.notes.status(note.id);
                                const tabbable = index === current;
                                return (
                                    <li
                                        key={note.id}
                                        ref={(node) => {
                                            items.current[index] = node;
                                        }}
                                        tabIndex={tabbable ? 0 : -1}
                                        aria-label={note.text}
                                        className="nt-note"
                                        style={{ padding: "6px 16px" }}
                                        onFocus={(event) => {
                                            if (event.target === event.currentTarget) {
                                                setActive(index);
                                            }
                                        }}
                                        onKeyDown={(event) => {
                                            if (event.target !== event.currentTarget) {
                                                return;
                                            }
                                            if (event.key === "ArrowDown" && index < notes.length - 1) {
                                                event.preventDefault();
                                                focusAt(index + 1);
                                            } else if (event.key === "ArrowUp" && index > 0) {
                                                event.preventDefault();
                                                focusAt(index - 1);
                                            } else if (event.key === "Delete") {
                                                event.preventDefault();
                                                remove(index);
                                            }
                                        }}
                                    >
                                        <Stack gap={4}>
                                            <Text
                                                size="sm"
                                                style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}
                                            >
                                                {note.text}
                                            </Text>
                                            <Chips
                                                session={session}
                                                targets={note.targets}
                                                states={status.targets.map((target) => targetStateWords(target.state))}
                                                tabbable={tabbable}
                                                note={note.text}
                                                onOpen={(target) => {
                                                    openTarget(session, note, target, openRun);
                                                }}
                                            />
                                            <Group gap={4} justify="space-between" wrap="nowrap">
                                                <Text size="xs" c="dimmed">
                                                    {noteTimeWords(note.time, note.edited)}
                                                </Text>
                                                <Tooltip label="Delete note">
                                                    <ActionIcon
                                                        variant="subtle"
                                                        size="sm"
                                                        aria-label={`Delete note: ${noteName(note.text)}`}
                                                        tabIndex={tabbable ? 0 : -1}
                                                        onClick={() => {
                                                            remove(index);
                                                        }}
                                                    >
                                                        <GLYPHS.delete size={14} aria-hidden />
                                                    </ActionIcon>
                                                </Tooltip>
                                            </Group>
                                        </Stack>
                                    </li>
                                );
                            })}
                    </ul>
                )}
            </ControlSection>
        </section>
    );
}
