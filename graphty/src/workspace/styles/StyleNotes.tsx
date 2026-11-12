import type { FileStyleNote } from "@graphty/graphty-element/session";
import { List, Text } from "@mantine/core";
import React from "react";

import { fileStyleNotesWords } from "./fileStyleWords";

/**
 * What a load did with a file's styles, one sentence per kind of note: values it could not
 * read, gradients drawn as one color, a selector too complex to keep. Nothing when the load
 * noted nothing.
 * @param props - Component props
 * @param props.notes - The load's notes, `LoadReport.styles.notes`.
 * @returns The list, or null.
 */
export function StyleNotes({
    notes,
}: {
    readonly notes: readonly FileStyleNote[] | undefined;
}): React.JSX.Element | null {
    const sentences = fileStyleNotesWords(notes ?? []);
    if (sentences.length === 0) {
        return null;
    }
    return (
        <section aria-label="What the file's styles lost">
            <Text size="xs">The file&apos;s styles are drawn, with these differences:</Text>
            <List size="xs">
                {sentences.map((sentence) => (
                    <List.Item key={sentence}>{sentence}</List.Item>
                ))}
            </List>
        </section>
    );
}
