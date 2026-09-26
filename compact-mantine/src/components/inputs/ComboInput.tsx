import { Combobox, TextInput, useCombobox } from "@mantine/core";
import { useId, useMergedRef, useUncontrolled } from "@mantine/hooks";
import React, { forwardRef, useRef, useState } from "react";

import { PANEL_GRID } from "../../constants/panel";
import { useNumberParser } from "../../i18n";
import type { ChangeHandler } from "../../types/events";
import { isRtl, useDirection } from "../../utils/rtl";
import { FieldCaret, ListboxCheck, overTriggerComboboxProps } from "./listbox";
import { useNumberField } from "./useNumberField";
import { useScrub } from "./useScrub";

/** One choice in a ComboInput's list. */
export interface ComboInputOption {
    /** What is committed when the choice is picked. */
    value: string;
    /** What the list shows; the value when absent. */
    label?: string;
    /** Shown but not selectable. */
    disabled?: boolean;
}

/** A line between groups of choices. */
export interface ComboInputSeparator {
    separator: true;
}

/** An entry in a ComboInput's list. */
export type ComboInputItem = ComboInputOption | ComboInputSeparator;

/** Props for ComboInput. */
export interface ComboInputProps {
    /** The field's accessible name ("Font size"). */
    label: string;
    /** The value, when you drive the field from your own state. */
    value?: string | number;
    /** The value the field starts with when it keeps its own state. */
    defaultValue?: string | number;
    /**
     * Called once per commit: a choice from the list, Enter, Tab or blur after typing, an arrow
     * step or the end of a scrub. A numeric field reports a number, a text field a string.
     */
    onChange?: ChangeHandler<string | number>;
    /** The list's entries: choices and separators. */
    options: ComboInputItem[];
    /**
     * Whether the value is a number: typing evaluates arithmetic (`12*2`), ArrowUp / ArrowDown
     * step it while the list is closed (Shift: ten steps), and a `glyph` slot scrubs it.
     */
    numeric?: boolean;
    /** The smallest number a numeric field accepts. */
    min?: number;
    /** The largest number a numeric field accepts. */
    max?: number;
    /** One arrow step of a numeric field. @default 1 */
    step?: number;
    /** A mode word shown right-aligned before the chevron, in the secondary ink ("Hug"). */
    suffix?: string;
    /** A 24px leading slot: a glyph or a letter. On a numeric field it is the scrub handle. */
    glyph?: React.ReactNode;
    /** Draws the chevron slot 25 wide with a 1px divider in the panel color (the font-size field). */
    divided?: boolean;
    /** The field's width. @default 88 (PANEL_GRID.FIELD) */
    width?: number | string;
    /** The field cannot be used. */
    disabled?: boolean;
    /** Text shown in an empty field. */
    placeholder?: string;
    /** The chevron button's accessible name. @default "Open list" */
    openLabel?: string;
    /** Extra class on the field's outer element. */
    className?: string;
    /** Extra style on the field's outer element. */
    style?: React.CSSProperties;
}

function isSeparator(item: ComboInputItem): item is ComboInputSeparator {
    return "separator" in item;
}

/**
 * A combo field (design/figma-spec.md 6.3): a value you can type, with a chevron that opens a list
 * of presets over the field, the current value sitting exactly on top of the field. Figma uses it
 * for font size, auto-layout width and height ("Hug"), gap and export scale.
 *
 * Keyboard: typing edits the value and commits on Enter, Tab or blur; Control+ArrowDown (or
 * Alt+ArrowDown) opens the list with the current value highlighted; ArrowUp / ArrowDown move,
 * Home / End jump, Enter picks, Escape closes without a change and leaves focus in the field.
 * With the list closed, ArrowUp / ArrowDown step a numeric value.
 * @example
 * ```tsx
 * <ComboInput
 *     label="Font size"
 *     numeric
 *     value={size}
 *     onChange={(next) => { setSize(Number(next)); }}
 *     options={[10, 11, 12, 13, 14, 16, 24].map((n) => ({ value: String(n) }))}
 * />
 * ```
 */
export const ComboInput = forwardRef<HTMLInputElement, ComboInputProps>(function ComboInput(props, ref) {
    const {
        label,
        value,
        defaultValue,
        onChange,
        options,
        numeric = false,
        min,
        max,
        step,
        suffix,
        glyph,
        divided = false,
        width = PANEL_GRID.FIELD,
        disabled = false,
        placeholder,
        openLabel = "Open list",
        className,
        style,
    } = props;
    const parse = useNumberParser();
    const direction = useDirection();
    const [current, setCurrent] = useUncontrolled<string | number>({ value, defaultValue, finalValue: "", onChange });
    const [textDraft, setTextDraft] = useState<string | null>(null);
    const [activeId, setActiveId] = useState<string | undefined>(undefined);
    const inputRef = useRef<HTMLInputElement>(null);
    const mergedRef = useMergedRef(ref, inputRef);
    const listId = useId();

    const combobox = useCombobox({
        onDropdownOpen: () => {
            // The options mount with the dropdown; highlight the current value once they have,
            // unless an arrow key already moved the highlight (see fromChecked).
            requestAnimationFrame(() => {
                if (combobox.getSelectedOptionIndex() === -1) {
                    combobox.selectActiveOption();
                }
                setActiveId(highlightedId());
            });
        },
        onDropdownClose: () => {
            combobox.resetSelectedOption();
            setActiveId(undefined);
        },
    });

    /**
     * The id of the option the keyboard highlight is on, for aria-activedescendant.
     * @returns the option's id, when one is highlighted
     */
    const highlightedId = (): string | undefined =>
        document.querySelector(`[id="${listId}"] [data-combobox-selected]`)?.id || undefined;

    const currentText = String(current);
    const numberValue = numeric && currentText !== "" ? parse(currentText) : NaN;
    const number = useNumberField({
        value: Number.isNaN(numberValue) ? null : numberValue,
        display: currentText,
        onCommit: (next, event) => {
            setCurrent(next, event);
        },
        parse,
        min,
        max,
        step,
        locked: disabled,
    });

    const scrub = useScrub(numeric && glyph !== undefined && !disabled, isRtl(direction), number.scrub);

    const commitChoice = (choice: string, event?: React.SyntheticEvent): void => {
        const next = numeric ? parse(choice) : choice;
        combobox.closeDropdown();
        setTextDraft(null);
        if (typeof next === "number" && Number.isNaN(next)) {
            return;
        }
        if (next !== current) {
            setCurrent(next, event);
        }
    };

    const listKeys = (event: React.KeyboardEvent<HTMLInputElement>): boolean => {
        const open = combobox.dropdownOpened;
        if (!open) {
            if (event.key === "ArrowDown" && (event.ctrlKey || event.altKey)) {
                event.preventDefault();
                combobox.openDropdown("keyboard");
                return true;
            }
            return false;
        }
        // An arrow pressed before the open frame has highlighted the current value still moves
        // from the current value, not from the top of the list.
        const fromChecked = (step: () => void) => (): void => {
            if (combobox.getSelectedOptionIndex() === -1) {
                combobox.selectActiveOption();
            }
            step();
        };
        const move: Record<string, () => void> = {
            ArrowDown: fromChecked(() => combobox.selectNextOption()),
            ArrowUp: fromChecked(() => combobox.selectPreviousOption()),
            Home: () => combobox.selectFirstOption(),
            End: () => {
                combobox.selectOption(options.filter((item) => !isSeparator(item)).length - 1);
            },
        };
        const mover = move[event.key];
        if (mover) {
            event.preventDefault();
            mover();
            setActiveId(highlightedId());
            return true;
        }
        if (event.key === "Enter") {
            event.preventDefault();
            if (combobox.getSelectedOptionIndex() !== -1) {
                combobox.clickSelectedOption();
            } else {
                combobox.closeDropdown();
            }
            return true;
        }
        if (event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            combobox.closeDropdown();
            return true;
        }
        return false;
    };

    const textProps = {
        value: textDraft ?? currentText,
        onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
            setTextDraft(event.currentTarget.value);
        },
        onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => {
            if (listKeys(event)) {
                return;
            }
            if (event.key === "Enter" && textDraft !== null) {
                event.preventDefault();
                commitChoice(textDraft, event);
            } else if (event.key === "Escape" && textDraft !== null) {
                setTextDraft(null);
            }
        },
        onBlur: (event: React.FocusEvent<HTMLInputElement>) => {
            combobox.closeDropdown();
            if (textDraft !== null) {
                commitChoice(textDraft, event);
            }
        },
    };

    const numericProps = {
        ...number.inputProps,
        role: undefined,
        "aria-valuenow": undefined,
        "aria-valuemin": undefined,
        "aria-valuemax": undefined,
        onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => {
            if (!listKeys(event)) {
                number.inputProps.onKeyDown(event);
            }
        },
        onBlur: (event: React.FocusEvent<HTMLInputElement>) => {
            combobox.closeDropdown();
            number.inputProps.onBlur(event);
        },
    };

    const chevronWidth = divided ? PANEL_GRID.GLYPH_SLOT + 1 : PANEL_GRID.GLYPH_SLOT;
    const rightSection = (
        <>
            {suffix !== undefined && <span className="cm-combo-suffix">{suffix}</span>}
            <button
                type="button"
                tabIndex={-1}
                className="cm-combo-chevron"
                aria-label={openLabel}
                disabled={disabled}
                onMouseDown={(event) => {
                    // Keep focus in the field: the list is the field's.
                    event.preventDefault();
                }}
                onClick={() => {
                    inputRef.current?.focus();
                    combobox.toggleDropdown();
                }}
            >
                <FieldCaret />
            </button>
        </>
    );

    return (
        <Combobox
            store={combobox}
            onOptionSubmit={(choice) => {
                commitChoice(choice);
            }}
            {...overTriggerComboboxProps()}
            keepMounted={false}
            disabled={disabled}
        >
            <Combobox.Target withKeyboardNavigation={false} withAriaAttributes={false}>
                <TextInput
                    ref={mergedRef}
                    {...(numeric ? numericProps : textProps)}
                    role="combobox"
                    aria-label={label}
                    aria-haspopup="listbox"
                    aria-expanded={combobox.dropdownOpened}
                    aria-controls={combobox.dropdownOpened ? listId : undefined}
                    aria-activedescendant={combobox.dropdownOpened ? activeId : undefined}
                    aria-autocomplete="none"
                    autoComplete="off"
                    placeholder={placeholder}
                    disabled={disabled}
                    variant="filled"
                    className={className}
                    style={{ width, ...style }}
                    classNames={{ wrapper: ["cm-combo", divided ? "cm-combo-divided" : ""].filter(Boolean).join(" ") }}
                    leftSection={
                        glyph === undefined ? undefined : (
                            <span className="cm-scrub-slot" data-scrub={scrub ? "true" : undefined} {...scrub}>
                                {glyph}
                            </span>
                        )
                    }
                    leftSectionPointerEvents={scrub ? "all" : "none"}
                    rightSection={rightSection}
                    rightSectionWidth={
                        suffix === undefined ? chevronWidth : `calc(${String(suffix.length)}ch + ${String(chevronWidth + 4)}px)`
                    }
                    rightSectionPointerEvents="all"
                />
            </Combobox.Target>
            <Combobox.Dropdown className="cm-menu-surface cm-menu cm-listbox">
                <Combobox.Options id={listId} aria-label={label}>
                    {options.map((item, index) =>
                        isSeparator(item) ? (
                            <div key={`separator-${String(index)}`} role="separator" className="cm-listbox-separator" />
                        ) : (
                            <Combobox.Option
                                key={item.value}
                                value={item.value}
                                disabled={item.disabled}
                                active={item.value === currentText}
                                aria-selected={item.value === currentText}
                                data-checked={item.value === currentText || undefined}
                                className="cm-menu-row cm-listbox-option"
                            >
                                <ListboxCheck />
                                <span className="cm-listbox-label">{item.label ?? item.value}</span>
                            </Combobox.Option>
                        ),
                    )}
                </Combobox.Options>
            </Combobox.Dropdown>
        </Combobox>
    );
});
