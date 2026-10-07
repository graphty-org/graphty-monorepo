/**
 * The Notes section the node and edge inspectors share: a note input, then one row per open note,
 * newest first, each with a Done box and a Delete control, then the done notes folded under
 * "N done". The Explore panel draws the same rows, {@link NoteRows}, for the case notes inside
 * its own section.
 *
 * Presentation only. The notes themselves live in graphty-element's `session.notes`; the caller
 * reads them from there and hands the save and delete back to it, so undo, saving and loading
 * are the element's. Whether a note is done is the element's `done` field too.
 */

import {
    ActionRow,
    ControlSection,
    PANEL_GRID,
    PANEL_INK,
    UiGlyph,
    useNumberFormatter,
} from "@graphty/compact-mantine";
import type { Note } from "@graphty/graphty-element/session";
import { ActionIcon, Box, Checkbox, Textarea, UnstyledButton } from "@mantine/core";
import React, { useState } from "react";

import { keyChipFor } from "../bindings";
import { useInspectorSection } from "./sections";

/** One note, as the inspector draws it: the fields of graphty-element's own record it reads. */
export type InspectorNote = Pick<Note, "id" | "time" | "text" | "author" | "done">;

const RELATIVE_UNITS: readonly [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 365 * 24 * 3600],
    ["month", 30 * 24 * 3600],
    ["week", 7 * 24 * 3600],
    ["day", 24 * 3600],
    ["hour", 3600],
    ["minute", 60],
];

/**
 * How long ago an ISO time was, in words: "2 days ago", "now".
 * @param iso - the time, as `Date.prototype.toISOString()` writes it.
 * @returns the phrase.
 */
function relativeTimeOf(iso: string): string {
    const seconds = Math.round((Date.parse(iso) - Date.now()) / 1000);
    const format = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

    for (const [unit, size] of RELATIVE_UNITS) {
        if (Math.abs(seconds) >= size) {
            return format.format(Math.trunc(seconds / size), unit);
        }
    }

    return format.format(0, "second");
}

/** Props of {@link NoteRows}. */
interface NoteRowsProps {
    /** The input's test id. */
    readonly inputTestId: string;
    /** The notes, newest first. */
    readonly notes: readonly InspectorNote[];
    /** Saves a new note's text, already trimmed and never blank. */
    readonly onAddNote: (text: string) => void;
    /** Deletes a note. */
    readonly onDeleteNote: (noteId: string) => void;
    /** Marks a note done, or not done. */
    readonly onSetNoteDone: (noteId: string, done: boolean) => void;
}

/** Props of {@link InspectorNotes}. */
interface InspectorNotesProps extends NoteRowsProps {
    /** The section's persisted open/closed id. */
    readonly sectionId: string;
    /** Whether the section starts open. */
    readonly defaultOpen: boolean;
}

/**
 * A Notes section's rows: the note input, then one row per open note with its Done box and
 * Delete control, then the done notes folded under "N done".
 * @param props - the rows' props.
 * @returns the rows.
 */
export function NoteRows(props: NoteRowsProps): React.JSX.Element {
    const { inputTestId, notes, onAddNote, onDeleteNote, onSetNoteDone } = props;
    const [draft, setDraft] = useState("");
    const [showDone, setShowDone] = useState(false);
    const formatter = useNumberFormatter();
    const addNoteChip = keyChipFor("addNote");
    const openNotes = notes.filter((note) => note.done === undefined);
    const doneNotes = notes.filter((note) => note.done !== undefined);

    const noteRow = (note: InspectorNote): React.JSX.Element => {
        const who = note.author === undefined ? "" : `${note.author}, `;

        return (
            <ActionRow
                key={note.id}
                // The relative time is drawn and the full timestamp is the
                // row's title, which is what 5.4 asks of a note row.
                state={`${who}${relativeTimeOf(note.time)}: ${note.text}`}
                stateTitle={`${who}${new Date(note.time).toLocaleString()}: ${note.text}`}
                residentActions={
                    <Checkbox
                        size="xs"
                        aria-label={`Done: ${note.text}`}
                        checked={note.done !== undefined}
                        onChange={(event) => {
                            onSetNoteDone(note.id, event.currentTarget.checked);
                        }}
                    />
                }
                actions={
                    <ActionIcon
                        type="button"
                        variant="subtle"
                        color="gray"
                        size={PANEL_GRID.TRAIL}
                        aria-label={`Delete note: ${note.text}`}
                        onClick={() => {
                            onDeleteNote(note.id);
                        }}
                    >
                        <UiGlyph name="close" size={PANEL_GRID.CHEVRON} />
                    </ActionIcon>
                }
            />
        );
    };

    return (
        <>
            {/* ControlSection already draws the panel's own 16 / 8 around its
                content, so nothing inside a section draws it again. */}
            <Box>
                <Textarea
                    autosize
                    minRows={1}
                    aria-label={addNoteChip === null ? "Add a note" : `Add a note (${addNoteChip})`}
                    placeholder="Add a note..."
                    data-testid={inputTestId}
                    value={draft}
                    onChange={(event) => {
                        setDraft(event.currentTarget.value);
                    }}
                    onKeyDown={(event) => {
                        if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                            event.preventDefault();
                            const text = draft.trim();

                            if (text !== "") {
                                onAddNote(text);
                                setDraft("");
                            }
                        }

                        if (event.key === "Escape") {
                            event.preventDefault();
                            setDraft("");
                        }
                    }}
                />
            </Box>

            {openNotes.map(noteRow)}

            {doneNotes.length > 0 && (
                <Box>
                    <UnstyledButton
                        type="button"
                        aria-expanded={showDone}
                        data-testid={`${inputTestId}-done`}
                        onClick={() => {
                            setShowDone(!showDone);
                        }}
                        style={{
                            height: PANEL_GRID.CONTROL_HEIGHT,
                            color: PANEL_INK.CHROME,
                            fontSize: "var(--mantine-font-size-sm)",
                        }}
                    >
                        {`${formatter.format(doneNotes.length)} done`}
                    </UnstyledButton>

                    {showDone && doneNotes.map(noteRow)}
                </Box>
            )}
        </>
    );
}

/**
 * The Notes section.
 * @param props - the section's props.
 * @returns the section.
 */
export function InspectorNotes(props: InspectorNotesProps): React.JSX.Element {
    const { sectionId, defaultOpen, ...rows } = props;
    const section = useInspectorSection(sectionId, defaultOpen);

    return (
        <ControlSection label="Notes" opened={section.opened} onOpenChange={section.onOpenChange}>
            <NoteRows {...rows} />
        </ControlSection>
    );
}
