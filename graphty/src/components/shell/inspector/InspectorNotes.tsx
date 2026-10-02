/**
 * The Notes section the node and edge inspectors share: a note input, then one row per note,
 * newest first, each with a Delete control.
 *
 * Presentation only. The notes themselves live in graphty-element's `session.notes`; the caller
 * reads them from there and hands the save and delete back to it, so undo, saving and loading
 * are the element's.
 *
 * graphty-element's notes carry no done state, so there is no Done box here.
 */

import { ActionRow, ControlSection, PANEL_GRID, UiGlyph } from "@graphty/compact-mantine";
import type { Note } from "@graphty/graphty-element/session";
import { ActionIcon, Box, Textarea } from "@mantine/core";
import React, { useState } from "react";

import { keyChipFor } from "../bindings";
import { useInspectorSection } from "./sections";

/** One note, as the inspector draws it: the fields of graphty-element's own record it reads. */
export type InspectorNote = Pick<Note, "id" | "time" | "text" | "author">;

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

/** Props of {@link InspectorNotes}. */
interface InspectorNotesProps {
    /** The section's persisted open/closed id. */
    readonly sectionId: string;
    /** Whether the section starts open. */
    readonly defaultOpen: boolean;
    /** The input's test id. */
    readonly inputTestId: string;
    /** The notes, newest first. */
    readonly notes: readonly InspectorNote[];
    /** Saves a new note's text, already trimmed and never blank. */
    readonly onAddNote: (text: string) => void;
    /** Deletes a note. */
    readonly onDeleteNote: (noteId: string) => void;
}

/**
 * The Notes section.
 * @param props - the section's props.
 * @returns the section.
 */
export function InspectorNotes(props: InspectorNotesProps): React.JSX.Element {
    const { sectionId, defaultOpen, inputTestId, notes, onAddNote, onDeleteNote } = props;
    const section = useInspectorSection(sectionId, defaultOpen);
    const [draft, setDraft] = useState("");
    const addNoteChip = keyChipFor("addNote");

    return (
        <ControlSection label="Notes" opened={section.opened} onOpenChange={section.onOpenChange}>
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

            {notes.map((note) => {
                const who = note.author === undefined ? "" : `${note.author}, `;

                return (
                    <ActionRow
                        key={note.id}
                        // The relative time is drawn and the full timestamp is the
                        // row's title, which is what 5.4 asks of a note row.
                        state={`${who}${relativeTimeOf(note.time)}: ${note.text}`}
                        stateTitle={`${who}${new Date(note.time).toLocaleString()}: ${note.text}`}
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
            })}
        </ControlSection>
    );
}
