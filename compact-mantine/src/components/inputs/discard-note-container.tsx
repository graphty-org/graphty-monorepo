import React from "react";

import { DiscardNote } from "./DiscardNote";

/**
 * A Mantine `inputContainer` that draws a field's input with its DiscardNote under it.
 * @param text - the note's words, or "" when there is nothing to say
 * @returns the container, for a Mantine input's `inputContainer` prop
 */
export function discardNoteContainer(text: string): (input: React.ReactNode) => React.JSX.Element {
    return function DiscardNoteContainer(input: React.ReactNode): React.JSX.Element {
        return (
            <>
                {input}
                <DiscardNote text={text} />
            </>
        );
    };
}
