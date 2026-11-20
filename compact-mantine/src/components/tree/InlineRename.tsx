import { TextInput } from "@mantine/core";
import { useUncontrolled } from "@mantine/hooks";
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
 * hand focus back to the row the field sits in (the nearest focusable element around it), or,
 * outside one, to whatever held it before the field opened. Leaving
 * the field any other way (a click elsewhere, Tab) commits and lets focus go where it was sent.
 * @param props - Component props
 * @param props.value - The current name
 * @param props.onCommit - Called once with the new name
 * @param props.onCancel - Called when Escape abandons the edit
 * @param props.label - The field's accessible name
 * @param props.width - The field's width
 * @returns The rename field
 */
export function InlineRename({
    value,
    onCommit,
    onCancel,
    label = "Name",
    width,
}: InlineRenameProps): React.JSX.Element {
    useCompactStyles();
    const inputRef = useRef<HTMLInputElement>(null);
    const returnTo = useRef<HTMLElement | null>(null);
    const done = useRef(false);

    useEffect(() => {
        // Back to the row the field sits in (a tree row, a page): the row it names, whatever
        // opened the field -- an add button, a menu that is gone. Else what held focus before.
        const row = inputRef.current?.parentElement?.closest<HTMLElement>("[tabindex]") ?? null;
        returnTo.current = row ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
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

/**
 * The id of the row being renamed, controlled by `value` when the caller passes one.
 * @param value - The controlled id, or undefined to keep it inside.
 * @param onChange - Called when a rename opens or closes.
 * @returns The id (null when none) and its setter.
 */
export function useRenaming(
    value: string | null | undefined,
    onChange: ((id: string | null) => void) | undefined,
): [string | null, (id: string | null) => void] {
    const [renaming, setRenaming] = useUncontrolled<string | null>({ value, finalValue: null, onChange });
    return [renaming, setRenaming];
}
