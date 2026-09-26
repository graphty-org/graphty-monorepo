import { Input, TextInput, type TextInputProps } from "@mantine/core";
import { useUncontrolled } from "@mantine/hooks";
import React, { forwardRef, useEffect, useRef, useState } from "react";

import { useLabels } from "../../i18n";
import { UiGlyph } from "../../icons";
import type { ChangeHandler } from "../../types/events";

/** The magnifier's drawn size, in its 24px leading slot. */
const SEARCH_ICON = 16;

/** How long the focus ring stays after the field loses focus (Figma's Assets search). */
const LINGER_MS = 100;

/** Props for SearchInput. Every other TextInput prop is passed through. */
export interface SearchInputProps
    extends Omit<TextInputProps, "value" | "defaultValue" | "onChange" | "size" | "leftSection" | "rightSection"> {
    /** The search text, when you drive the field from your own state. */
    value?: string;
    /** The text the field starts with when it keeps its own state. */
    defaultValue?: string;
    /** Called with the new text on every keystroke and on clear; the event is second when there is one. */
    onChange?: ChangeHandler<string>;
    /**
     * `"sm"`: the 24px panel field (default). `"lg"`: the 32px quick-actions field with 13/24 text.
     * @default "sm"
     */
    size?: "sm" | "lg";
    /**
     * A 24 x 24 control joined to the field's end (Figma's Variables table filter button): the
     * field takes the `5px 0 0 5px` corners and the control `0 5px 5px 0`, 1px apart.
     */
    rightSection?: React.ReactNode;
    /** The accessible name of the clear button. Defaults to the `clearSearch` label ("Clear search"). */
    clearLabel?: string;
}

/**
 * A search field (design/figma-spec.md 6.2): a filled 24px field with a leading magnifier, a clear
 * button once there is text, and a focus ring drawn flush with the field that lingers 100ms after
 * focus leaves.
 *
 * Escape clears the text; with nothing to clear it is left to bubble, so an enclosing popover
 * can close. `autoFocus` is off by default: Figma focuses its search fields when their panel
 * opens, and whether that is right is the caller's decision.
 * @example
 * ```tsx
 * const [query, setQuery] = useState("");
 * <SearchInput value={query} onChange={setQuery} placeholder="Search layers" />
 * ```
 */
export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(function SearchInput(props, ref) {
    const {
        value,
        defaultValue,
        onChange,
        size = "sm",
        rightSection,
        clearLabel,
        placeholder,
        classNames,
        wrapperProps,
        onKeyDown,
        onBlur,
        onFocus,
        disabled,
        "aria-label": ariaLabel,
        ...rest
    } = props;
    const labels = useLabels();
    const [text, setText] = useUncontrolled<string>({ value, defaultValue, finalValue: "", onChange });
    const [linger, setLinger] = useState(false);
    const lingerTimer = useRef<number | undefined>(undefined);
    const inputRef = useRef<HTMLInputElement | null>(null);

    useEffect(
        () => () => {
            window.clearTimeout(lingerTimer.current);
        },
        [],
    );

    const setRefs = (node: HTMLInputElement | null): void => {
        inputRef.current = node;
        if (typeof ref === "function") {
            ref(node);
        } else if (ref) {
            ref.current = node;
        }
    };

    const clear = (event?: React.SyntheticEvent): void => {
        setText("", event);
        inputRef.current?.focus();
    };

    const field = (
        <TextInput
            {...rest}
            ref={setRefs}
            size={size === "lg" ? "md" : "sm"}
            value={text}
            disabled={disabled}
            placeholder={placeholder ?? labels.searchPlaceholder}
            aria-label={ariaLabel ?? (rest.label === undefined ? labels.search : undefined)}
            type="search"
            onChange={(event) => {
                setText(event.currentTarget.value, event);
            }}
            onKeyDown={(event) => {
                onKeyDown?.(event);
                if (!event.defaultPrevented && event.key === "Escape" && text !== "") {
                    event.preventDefault();
                    event.stopPropagation();
                    clear(event);
                }
            }}
            onFocus={(event) => {
                window.clearTimeout(lingerTimer.current);
                setLinger(false);
                onFocus?.(event);
            }}
            onBlur={(event) => {
                setLinger(true);
                lingerTimer.current = window.setTimeout(() => {
                    setLinger(false);
                }, LINGER_MS);
                onBlur?.(event);
            }}
            classNames={{ ...(typeof classNames === "object" ? classNames : undefined), wrapper: "cm-search" }}
            wrapperProps={{ ...wrapperProps, "data-cm-linger": linger || undefined }}
            leftSection={
                <span className="cm-search-icon" aria-hidden="true">
                    <UiGlyph name="search" size={SEARCH_ICON} />
                </span>
            }
            leftSectionPointerEvents="none"
            rightSection={
                text !== "" && !disabled ? (
                    <Input.ClearButton
                        aria-label={clearLabel ?? labels.clearSearch}
                        onMouseDown={(event) => {
                            event.preventDefault();
                        }}
                        onClick={(event) => {
                            clear(event);
                        }}
                    />
                ) : undefined
            }
        />
    );

    if (rightSection === undefined) {
        return field;
    }
    return (
        <div className="cm-search-joined">
            {field}
            <div className="cm-search-joined-end">{rightSection}</div>
        </div>
    );
});
