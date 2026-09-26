import { TextInput } from "@mantine/core";
import React, { useEffect, useRef } from "react";

import { useCompactStyles } from "../../theme/useCompactStyles";

/**
 * Props for the InlineRename component.
 */
export interface InlineRenameProps {
    /** The current name. The field opens holding it, wholly selected. */
    value: string;
    /** Called once with the new name, on Enter or when the field loses focus. */
    onCommit: (name: string) => void;
    /** Called when Escape abandons the edit. */
    onCancel?: () => void;
    /** The field's accessible name. Defaults to "Name". */
    label?: string;
    /** The field's width: a number of pixels or any CSS length. Defaults to filling its slot. */
    width?: number | string;
}

/**
 * A name edited in place: the 24px outlined field that replaces a layer, page or collection
 * name while it is renamed (design/figma-spec.md 10.3).
 *
 * It opens focused with the whole name selected. Enter commits and Escape cancels, and both
 * hand focus back to whatever held it before the field opened -- the row it came from. Leaving
 * the field any other way (a click elsewhere, Tab) commits and lets focus go where it was sent.
 * @param props - Component props
 * @param props.value - The current name
 * @param props.onCommit - Called once with the new name
 * @param props.onCancel - Called when Escape abandons the edit
 * @param props.label - The field's accessible name
 * @param props.width - The field's width
 * @returns The rename field
 */
export function InlineRename({ value, onCommit, onCancel, label = "Name", width }: InlineRenameProps): React.JSX.Element {
    useCompactStyles();
    const inputRef = useRef<HTMLInputElement>(null);
    const returnTo = useRef<HTMLElement | null>(null);
    const done = useRef(false);

    useEffect(() => {
        returnTo.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        inputRef.current?.focus();
        inputRef.current?.select();
    }, []);

    const finish = (commit: boolean, restoreFocus: boolean): void => {
        if (done.current) {
            return;
        }
        done.current = true;
        const target = returnTo.current;
        if (commit) {
            onCommit(inputRef.current?.value ?? value);
        } else {
            onCancel?.();
        }
        if (restoreFocus && target?.isConnected) {
            target.focus();
        }
    };

    return (
        <TextInput
            ref={inputRef}
            aria-label={label}
            defaultValue={value}
            spellCheck={false}
            autoComplete="off"
            classNames={{ root: "cm-rename", wrapper: "cm-rename-wrapper", input: "cm-rename-input" }}
            style={width === undefined ? undefined : { width }}
            onKeyDown={(event) => {
                if (event.key === "Enter") {
                    event.preventDefault();
                    event.stopPropagation();
                    finish(true, true);
                } else if (event.key === "Escape") {
                    event.preventDefault();
                    event.stopPropagation();
                    finish(false, true);
                } else {
                    // Keep the row's and the tree's own keys (arrows, Space, type-ahead) out of it.
                    event.stopPropagation();
                }
            }}
            onFocus={() => {
                // A field that stays mounted after a commit starts a new edit when it is focused again.
                done.current = false;
            }}
            onBlur={() => {
                finish(true, false);
            }}
            onClick={(event) => {
                event.stopPropagation();
            }}
            onDoubleClick={(event) => {
                event.stopPropagation();
            }}
        />
    );
}
