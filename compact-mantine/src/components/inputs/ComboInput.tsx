import { Combobox, type ComboboxStore, TextInput, useCombobox } from "@mantine/core";
import { useId, useMergedRef, useUncontrolled } from "@mantine/hooks";
import React, { forwardRef, useRef, useState } from "react";

import { PANEL_GRID, PANEL_INK } from "../../constants/panel";
import { useLabels, useNumberParser } from "../../i18n";
import type { ChangeHandler } from "../../types/events";
import { isRtl, useDirection } from "../../utils/rtl";
import { discardNoteContainer } from "./discard-note-container";
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
    /** Text shown in an empty field, in Figma's placeholder color. */
    placeholder?: string;
    /**
     * The selection disagrees: the empty field reads "Mixed" in the value's ink, as Figma draws
     * it, and typing a value replaces it.
     */
    mixed?: boolean;
    /**
     * The field's surface: `"filled"`, Figma's gray number field, or `"outlined"`, the panel's
     * background inside a 1px edge, as the select and the style fields draw it.
     * @default "filled"
     */
    variant?: "filled" | "outlined";
    /** The chevron button's accessible name. @default "Open list" */
    openLabel?: string;
    /** Extra class on the field's outer element. */
    className?: string;
    /** Extra style on the field's outer element. */
    style?: React.CSSProperties;
}

/** The APG combobox attributes of a field's text box. */
interface ComboboxAttributes {
    role?: "combobox";
    "aria-haspopup"?: "listbox";
    "aria-expanded"?: boolean;
    "aria-controls"?: string;
    "aria-activedescendant"?: string;
    "aria-autocomplete"?: "none";
}

/**
 * What Escape says it kept: the value, or the placeholder in place of an empty one.
 * @param currentText - the value as text
 * @param placeholder - the placeholder, if any
 * @param suffix - the unit drawn after the value, if any
 * @returns the words
 */
function keptTextOf(currentText: string, placeholder: string | undefined, suffix: string | undefined): string {
    return currentText === "" ? (placeholder ?? "") : currentText + (suffix ?? "");
}

/**
 * The glyph slot in front of the value, which scrubs a numeric value when dragged.
 * @param props - Component props
 * @param props.glyph - the glyph
 * @param props.scrub - the drag's pointer handlers, when the slot scrubs
 * @returns the slot
 */
function ScrubSlot({
    glyph,
    scrub,
}: Readonly<{ glyph: React.ReactNode; scrub: ReturnType<typeof useScrub> }>): React.JSX.Element {
    return (
        <span className="cm-scrub-slot" data-scrub={scrub ? "true" : undefined} {...scrub}>
            {glyph}
        </span>
    );
}

/**
 * The combobox attributes of a field that is not a spin button.
 * @param spin - whether the field is a spin button, which has none
 * @param hasList - whether the field has a list to pop up
 * @param opened - whether the list is open
 * @param listId - the list's id
 * @param activeId - the id of the highlighted option
 * @returns the attributes
 */
function comboboxAttributes(
    spin: boolean,
    hasList: boolean,
    opened: boolean,
    listId: string,
    activeId: string | undefined,
): ComboboxAttributes {
    if (spin) {
        return {};
    }
    return {
        role: "combobox",
        "aria-haspopup": hasList ? ("listbox" as const) : undefined,
        "aria-expanded": opened,
        "aria-controls": opened ? listId : undefined,
        "aria-activedescendant": opened ? activeId : undefined,
        "aria-autocomplete": "none" as const,
    };
}

/**
 * The number a numeric field's text holds, for its number handling.
 * @param numeric - whether the field is numeric
 * @param text - the field's current text
 * @param parse - the locale's number parser
 * @returns the number, or null when the field is not numeric, is empty or holds no number
 */
function numberOf(numeric: boolean, text: string, parse: (text: string) => number): number | null {
    if (!numeric || text === "") {
        return null;
    }
    const value = parse(text);
    return Number.isNaN(value) ? null : value;
}

/**
 * The width of a field's right section: its suffix and its chevron.
 * @param hasList - whether the field has a chevron
 * @param divided - whether a rule divides the chevron from the value
 * @param suffix - the unit drawn after the value, if any
 * @returns the width, or undefined when the section is empty
 */
function rightSectionWidthOf(
    hasList: boolean,
    divided: boolean,
    suffix: string | undefined,
): string | number | undefined {
    let chevronWidth = 0;
    if (hasList) {
        chevronWidth = divided ? PANEL_GRID.GLYPH_SLOT + 1 : PANEL_GRID.GLYPH_SLOT;
    }
    if (suffix === undefined) {
        return chevronWidth || undefined;
    }
    return `calc(${String(suffix.length)}ch + ${String(chevronWidth + 4)}px)`;
}

/**
 * The field wrapper's look: the "Mixed" ink and the divided chevron.
 * @param mixed - whether the field reads "Mixed"
 * @param divided - whether a rule divides the chevron from the value
 * @returns the wrapper's styles and class names
 */
function wrapperLookOf(
    mixed: boolean,
    divided: boolean,
): { styles: { wrapper: Record<string, string> } | undefined; classNames: { wrapper: string } } {
    return {
        styles: mixed ? { wrapper: { "--input-placeholder-color": PANEL_INK.VALUE } } : undefined,
        classNames: { wrapper: divided ? "cm-combo cm-combo-divided" : "cm-combo" },
    };
}

/**
 * Whether an empty field shows its placeholder as the not-set look.
 * @param placeholder - the placeholder, if any
 * @param text - the committed value's text
 * @param draft - the typed text not yet committed
 * @returns "true" for the data attribute, or undefined
 */
function isDefaultOf(placeholder: string | undefined, text: string, draft: string | null): "true" | undefined {
    return placeholder !== undefined && text === "" && draft === null ? "true" : undefined;
}

function isSeparator(item: ComboInputItem): item is ComboInputSeparator {
    return "separator" in item;
}

/**
 * The list's keys in a combo field: Control+ArrowDown (or Alt+ArrowDown) opens the list; with it
 * open, ArrowUp / ArrowDown move, Home / End jump, Enter picks and Escape closes.
 * @param event - the key press in the field
 * @param combobox - the field's combobox store
 * @param list - the field's list
 * @param list.hasList - whether the field has a list at all
 * @param list.choiceCount - how many choices (not separators) the list holds
 * @param list.syncActive - points aria-activedescendant at the highlighted option
 * @returns whether the key was the list's (so the field does nothing more with it)
 */
function handleListKeys(
    event: React.KeyboardEvent<HTMLInputElement>,
    combobox: ComboboxStore,
    list: { hasList: boolean; choiceCount: number; syncActive: () => void },
): boolean {
    if (!combobox.dropdownOpened) {
        if (list.hasList && event.key === "ArrowDown" && (event.ctrlKey || event.altKey)) {
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
            combobox.selectOption(list.choiceCount - 1);
        },
    };
    const mover = move[event.key];
    if (mover) {
        event.preventDefault();
        mover();
        list.syncActive();
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
}

/**
 * A combo field (design/figma-spec.md 6.3): a value you can type, with a chevron that opens a list
 * of presets over the field, the current value sitting exactly on top of the field. Figma uses it
 * for font size, auto-layout width and height ("Hug"), gap and export scale.
 *
 * Keyboard: typing edits the value and commits on Enter, Tab or blur; Control+ArrowDown (or
 * Alt+ArrowDown) opens the list with the current value highlighted; ArrowUp / ArrowDown move,
 * Home / End jump, Enter picks, Escape closes without a change and leaves focus in the field.
 * With the list closed, ArrowUp / ArrowDown step a numeric value. A numeric field with no options
 * is a spin button to assistive tech (its value and bounds are read out), not a combobox.
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
        placeholder: placeholderProp,
        mixed = false,
        variant = "filled",
        openLabel = "Open list",
        className,
        style,
    } = props;
    const parse = useNumberParser();
    const labels = useLabels();
    const placeholder = mixed ? labels.mixed : placeholderProp;
    const direction = useDirection();
    const [current, setCurrent] = useUncontrolled<string | number>({ value, defaultValue, finalValue: "", onChange });
    const [textDraft, setTextDraft] = useState<string | null>(null);
    const [activeId, setActiveId] = useState<string | undefined>(undefined);
    const inputRef = useRef<HTMLInputElement>(null);
    const mergedRef = useMergedRef(ref, inputRef);
    const listId = useId();
    // With no choices there is no list: no chevron, and nothing opens it.
    const hasList = options.some((item) => !isSeparator(item));

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
    const number = useNumberField({
        value: numberOf(numeric, currentText, parse),
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

    const listKeys = (event: React.KeyboardEvent<HTMLInputElement>): boolean =>
        handleListKeys(event, combobox, {
            hasList,
            choiceCount: options.filter((item) => !isSeparator(item)).length,
            syncActive: () => {
                setActiveId(highlightedId());
            },
        });

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

    // A number field with no list is a spin button (APG), as StyleNumberInput is: its value and
    // bounds are read out, and nothing pops up. With a list it is a combobox.
    const spin = numeric && !hasList;
    const numericProps = {
        ...number.inputProps,
        ...(spin
            ? {}
            : { role: undefined, "aria-valuenow": undefined, "aria-valuemin": undefined, "aria-valuemax": undefined }),
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

    const rightSectionWidth = rightSectionWidthOf(hasList, divided, suffix);
    const discardedText =
        numeric && number.discarded ? labels.colorEditDiscarded(keptTextOf(currentText, placeholder, suffix)) : "";
    const rightSection = (
        <>
            {suffix !== undefined && <span className="cm-combo-suffix">{suffix}</span>}
            {hasList && (
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
            )}
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
                    {...comboboxAttributes(spin, hasList, combobox.dropdownOpened, listId, activeId)}
                    aria-label={label}
                    autoComplete="off"
                    placeholder={placeholder}
                    disabled={disabled}
                    variant={variant}
                    data-is-default={isDefaultOf(placeholder, currentText, textDraft)}
                    className={className}
                    style={{ width, ...style }}
                    {...wrapperLookOf(mixed, divided)}
                    leftSection={glyph === undefined ? undefined : <ScrubSlot glyph={glyph} scrub={scrub} />}
                    leftSectionPointerEvents={scrub ? "all" : "none"}
                    rightSection={hasList || suffix !== undefined ? rightSection : undefined}
                    rightSectionWidth={rightSectionWidth}
                    rightSectionPointerEvents="all"
                    inputContainer={discardNoteContainer(discardedText)}
                />
            </Combobox.Target>
            <Combobox.Dropdown className="cm-menu-surface cm-menu cm-listbox">
                <Combobox.Options id={listId} aria-label={label}>
                    {options.map((item, index) =>
                        isSeparator(item) ? (
                            <hr key={`separator-${String(index)}`} className="cm-listbox-separator" />
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
