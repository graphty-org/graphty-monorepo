import { TextInput } from "@mantine/core";
import React, { useEffect, useRef, useState } from "react";

/** Props for RenameInput. */
interface RenameInputProps {
    /** The name now, prefilled and selected. */
    readonly name: string;
    /**
     * Takes the new name, or null to cancel, and how the field ended: `"key"` (Enter or Escape:
     * focus is still in the field) or `"left"` (Tab, or focus moved elsewhere).
     */
    readonly onDone: (name: string | null, how: "key" | "left") => void;
    /** The field's accessible name ("Source name", "Chat name"). */
    readonly label: string;
    /** The row the field sits in, as a selector: focus moving within it is not leaving the field. */
    readonly container: string;
    /** The longest name the field takes. */
    readonly maxLength?: number;
    /** The field's class. */
    readonly className?: string;
}

/**
 * A name being edited in place, in a row: Enter, Tab or leaving it commits, Escape cancels (and
 * stops there, so a list around it stays open).
 * @param props - Component props
 * @param props.name - the name now
 * @param props.onDone - takes the new name, or null to cancel, and how the field ended
 * @param props.label - the field's accessible name
 * @param props.container - the row's selector, for the blur check
 * @param props.maxLength - the longest name it takes
 * @param props.className - its class
 * @returns the input
 */
export function RenameInput({
    name,
    onDone,
    label,
    container,
    maxLength,
    className,
}: RenameInputProps): React.JSX.Element {
    const [text, setText] = useState(name);
    const input = useRef<HTMLInputElement>(null);
    // Tab leaves the field for the row's next control, which commits: no keyboard trap.
    const tabbing = useRef(false);
    // Ended once: Enter or Escape unmounts the field, and the blur that follows must not end it again.
    const done = useRef(false);
    const finish = (next: string | null, how: "key" | "left"): void => {
        if (!done.current) {
            done.current = true;
            onDone(next, how);
        }
    };
    // Focused once the menu that opened it has closed and handed focus back to its button, so
    // that hand-back is not taken as leaving the field.
    useEffect(() => {
        const timer = setTimeout(() => {
            input.current?.focus();
            input.current?.select();
        }, 0);
        return () => {
            clearTimeout(timer);
        };
    }, []);
    return (
        <TextInput
            ref={input}
            size="xs"
            className={className}
            aria-label={label}
            maxLength={maxLength}
            value={text}
            onChange={(event) => {
                setText(event.currentTarget.value);
            }}
            onBlur={(event) => {
                // The menu that opened it hands focus back to its button in the same row, and the
                // window losing focus blurs the field too: neither is the reader leaving it.
                const to = event.relatedTarget;
                if (
                    !tabbing.current &&
                    to instanceof Node &&
                    event.currentTarget.closest(container)?.contains(to) === true
                ) {
                    event.currentTarget.focus();
                    return;
                }
                if (document.hasFocus()) {
                    finish(text, "left");
                }
            }}
            onKeyDown={(event) => {
                tabbing.current = event.key === "Tab";
                if (event.key === "Enter") {
                    // Focus may return to the row's button before this press ends; its Enter must
                    // not reach that button and press it.
                    event.preventDefault();
                    finish(text, "key");
                } else if (event.key === "Escape") {
                    event.stopPropagation();
                    finish(null, "key");
                }
            }}
        />
    );
}
