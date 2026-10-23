import { VisuallyHidden } from "@mantine/core";
import React from "react";

/**
 * What Escape did in a field, "Edit discarded; this stays 3.", shown under the field and said
 * aloud. The spoken copy is a live region that stays mounted, so a change is announced; the
 * shown copy is hidden from assistive tech, so it is not read twice.
 * @param props - Component props
 * @param props.text - the words, or "" when there is nothing to say
 * @param props.className - extra classes for the shown copy (its place in the caller's layout)
 * @returns the note
 */
export function DiscardNote({ text, className }: Readonly<{ text: string; className?: string }>): React.JSX.Element {
    return (
        <>
            <VisuallyHidden role="status">{text}</VisuallyHidden>
            {text !== "" && (
                <div aria-hidden="true" className={["cm-field-description", className].filter(Boolean).join(" ")}>
                    {text}
                </div>
            )}
        </>
    );
}
