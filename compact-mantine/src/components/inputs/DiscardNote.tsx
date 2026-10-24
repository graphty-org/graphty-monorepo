import { VisuallyHidden } from "@mantine/core";
import React from "react";

/**
 * What Escape did in a field, "Edit discarded; this stays 3.", said aloud and never drawn: Figma
 * shows nothing when an edit is discarded. The live region stays mounted, so a change is announced.
 * @param props - Component props
 * @param props.text - the words, or "" when there is nothing to say
 * @returns the note
 */
export function DiscardNote({ text }: Readonly<{ text: string }>): React.JSX.Element {
    return <VisuallyHidden role="status">{text}</VisuallyHidden>;
}
