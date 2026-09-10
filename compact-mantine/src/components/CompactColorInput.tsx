import {
    ActionIcon,
    ColorPicker,
    ColorSwatch,
    Divider,
    Group,
    NumberInput,
    Stack,
    Text,
    TextInput,
} from "@mantine/core";
import { useUncontrolled } from "@mantine/hooks";
import React, { useEffect, useId, useMemo, useState } from "react";

import { SWATCH_COLORS_HEXA } from "../constants/colors";
import { PANEL_GRID, PANEL_INK } from "../constants/panel";
import { useLabels, useLocale, useNumberParser } from "../i18n";
import { UiGlyph } from "../icons";
import type { ChangeHandler } from "../types/events";
import { opacityToAlphaHex, parseAlphaFromHexa } from "../utils/color-utils";
import { Popout } from "./popout";

// One of the "style" trio (StyleSelect, StyleNumberInput, CompactColorInput):
// the older half of the library, brought to the same standard as the row types.
// Contract sections 1, 2.1, 2.2, 2.3, 3 and 7 were applied here.
//
// Accessibility: the APG "Grouping controls" pattern wrapped round three
// separately named controls -- a button that opens a dialog, which is the APG
// "Dialog (Modal)" pattern and belongs to Popout.Trigger; a text box; and a
// number box. The group carries the field's own name, so a screen reader
// announces "Fill colour group" once on entry and each control then says only
// which part of the colour it holds. Naming the three controls after the whole
// field instead would repeat the field name three times and never say which
// was which.

/**
 * The gap between the joined controls and the reset button beside them.
 */
const CONTROL_GAP = 4;

/**
 * The corner radius of the joined run of controls, in pixels.
 *
 * Only its two outer ends are rounded; the joins between them are square, so
 * the swatch, the hex box and the opacity box read as one control.
 */
const JOINED_RADIUS = 4;

/**
 * The corner radius of the colour chip inside the swatch button, in pixels.
 */
const SWATCH_RADIUS = 2;

/**
 * The width of the hex box, in pixels: enough for six upper-case hex digits in
 * the monospace face.
 */
const HEX_WIDTH = 72;

/**
 * The width of the opacity box, in pixels: enough for "100%".
 */
const OPACITY_WIDTH = 54;

/**
 * The width of the colour picker pop-out, in pixels.
 */
const PICKER_WIDTH = 220;

/**
 * The lowest opacity the control accepts, as a percentage.
 */
const MIN_OPACITY = 0;

/**
 * The highest opacity the control accepts, as a percentage.
 */
const MAX_OPACITY = 100;

/**
 * The length of a `#RRGGBBAA` colour, which is what tells one apart from the
 * `#RRGGBB` the picker reports when it is carrying no alpha channel.
 */
const HEXA_LENGTH = 9;

/**
 * Where the alpha channel begins in a `#RRGGBBAA` colour.
 */
const HEXA_ALPHA_START = 7;

/**
 * A six-digit hex colour, with the leading `#`.
 */
const SIX_DIGIT_HEX = /^#[0-9A-F]{6}$/iu;

/**
 * A number with a fraction, used only to read a locale's decimal separator off
 * `Intl`.
 */
const DECIMAL_SAMPLE = 1.1;

/**
 * Which end of the joined run of controls an element sits at.
 */
type JoinPosition = "start" | "middle" | "end";

/**
 * The corner radii for one element of a joined run of controls.
 *
 * Written as logical corners -- start-start, end-start and so on -- rather than
 * as the four physical ones, so the rounded ends stay on the outside of the run
 * when the interface is laid out right to left and the run is drawn in the
 * other order.
 * @param position - Which end of the run the element sits at
 * @returns Style properties to spread into the element's own style
 */
function joinedCorners(position: JoinPosition): React.CSSProperties {
    const leading = position === "start" ? JOINED_RADIUS : 0;
    const trailing = position === "end" ? JOINED_RADIUS : 0;

    return {
        borderStartStartRadius: leading,
        borderEndStartRadius: leading,
        borderStartEndRadius: trailing,
        borderEndEndRadius: trailing,
    };
}

/**
 * The character the active locale writes between a whole number and its
 * fraction.
 * @returns The decimal separator for the active locale
 */
function useDecimalSeparator(): string {
    const locale = useLocale();

    return useMemo(() => {
        const parts = new Intl.NumberFormat(locale).formatToParts(DECIMAL_SAMPLE);
        return parts.find((part) => part.type === "decimal")?.value ?? ".";
    }, [locale]);
}

/**
 * Props for the CompactColorInput component.
 */
export interface CompactColorInputProps {
    /**
     * The colour, as `#RRGGBB`, when you drive the control from your own state.
     *
     * `undefined` does not mean "no colour" here: it means the reader has
     * chosen none and the control is showing `defaultColor`.
     */
    color?: string | undefined;
    /** The colour shown, in italics, while the reader has chosen none of their own. */
    defaultColor: string;
    /**
     * The opacity as a percentage from 0 to 100, when you drive the control
     * from your own state. `undefined` means the reader has set none and the
     * control is showing `defaultOpacity`.
     */
    opacity?: number | undefined;
    /**
     * The opacity shown, in italics, while the reader has set none of their
     * own.
     * @default 100
     */
    defaultOpacity?: number;
    /**
     * Called when the colour changes, and with `undefined` when the control is
     * reset to its default.
     *
     * The colour comes first, as `#RRGGBB` in upper case; the event that caused
     * the change is second and is absent for a change made from the picker,
     * which reports none.
     */
    onColorChange?: ChangeHandler<string | undefined>;
    /**
     * Called when the opacity changes, and with `undefined` when the control is
     * reset to its default.
     *
     * The percentage comes first; the event that caused the change is second.
     */
    onOpacityChange?: ChangeHandler<number | undefined>;
    /**
     * The field's name, drawn above the control and used to name the group the
     * three controls sit in.
     *
     * Leave it out for a colour that is already named by what surrounds it,
     * such as one stop of a gradient.
     */
    label?: string;
    /**
     * Whether to offer an opacity box beside the colour.
     * @default true
     */
    showOpacity?: boolean;
    /**
     * Whether the control cannot be used at all.
     *
     * A disabled control is drawn in the same dimmed ink as every other
     * disabled control in the library, is skipped by the Tab key, and is
     * announced as unavailable. Its reset button is disabled with it, so the
     * value cannot be changed by any route.
     * @default false
     */
    disabled?: boolean;
    /** Called when the hex box or the opacity box takes focus. Forwarded unchanged. */
    onFocus?: React.FocusEventHandler<HTMLInputElement>;
    /**
     * Called when the hex box or the opacity box loses focus.
     *
     * Forwarded after the value has been committed, so reading the state you
     * keep for this control inside the handler sees the new value.
     */
    onBlur?: React.FocusEventHandler<HTMLInputElement>;
}

/**
 * A colour swatch, a hex box and an opacity box, joined into one 24px control.
 *
 * Pressing the swatch opens a picker in a pop-out; the hex box takes a typed
 * `RRGGBB` and commits it when it loses focus; the opacity box takes a
 * percentage. All three describe one colour, so they are drawn as a single run
 * with only its outer ends rounded.
 *
 * As in the other controls of this family, `undefined` means "the reader has
 * chosen nothing here": the control shows the default in italics and offers no
 * reset until something of the reader's own is set, and pressing the reset
 * reports `undefined` again. Colour and opacity are tracked separately, so
 * either can be the reader's while the other is still the default.
 *
 * What is typed into the opacity box is read in the reader's own locale, so a
 * comma decimal separator and a locale's own digits are understood rather than
 * discarded. Nothing that is typed is reported until the box loses focus, so a
 * half-typed value never reaches your state.
 * @param props - Component props
 * @param props.color - The colour, when you drive the control from your own state
 * @param props.defaultColor - The colour shown while the reader has chosen none of their own
 * @param props.opacity - The opacity as a percentage, when you drive the control from your own state
 * @param props.defaultOpacity - The opacity shown while the reader has set none of their own
 * @param props.onColorChange - Called with the new colour, or with `undefined` when the control is reset
 * @param props.onOpacityChange - Called with the new opacity, or with `undefined` when the control is reset
 * @param props.label - The field's name, drawn above the control and used to name the group
 * @param props.showOpacity - Whether to offer an opacity box beside the colour
 * @param props.disabled - Whether the control cannot be used at all
 * @param props.onFocus - Called when the hex box or the opacity box takes focus
 * @param props.onBlur - Called when the hex box or the opacity box loses focus
 * @returns The joined colour control, and its reset button when something has been set
 * @example
 * ```tsx
 * const [fill, setFill] = useState<string | undefined>(undefined);
 *
 * <PopoutManager>
 *     <CompactColorInput
 *         label="Fill"
 *         color={fill}
 *         defaultColor="#5B8FF9"
 *         onColorChange={setFill}
 *     />
 * </PopoutManager>
 * ```
 */
export function CompactColorInput({
    color,
    defaultColor,
    opacity,
    defaultOpacity = MAX_OPACITY,
    onColorChange,
    onOpacityChange,
    label,
    showOpacity = true,
    disabled = false,
    onFocus,
    onBlur,
}: CompactColorInputProps): React.JSX.Element {
    const labels = useLabels();
    const parseNumber = useNumberParser();
    const decimalSeparator = useDecimalSeparator();
    const labelId = useId();

    // Controlled and uncontrolled, the way every state-holding component in
    // this package works. The uncontrolled state starts at undefined, which is
    // this component's word for "the reader has chosen nothing".
    const [chosenColor, setChosenColor] = useUncontrolled<string | undefined>({
        value: color,
        defaultValue: undefined,
        finalValue: undefined,
        onChange: onColorChange,
    });

    const [chosenOpacity, setChosenOpacity] = useUncontrolled<number | undefined>({
        value: opacity,
        defaultValue: undefined,
        finalValue: undefined,
        onChange: onOpacityChange,
    });

    const isColorDefault = chosenColor === undefined;
    const isOpacityDefault = chosenOpacity === undefined;
    const isDefault = isColorDefault && (!showOpacity || isOpacityDefault);

    const displayColor = chosenColor ?? defaultColor;
    const displayOpacity = chosenOpacity ?? defaultOpacity;

    // What the two boxes are showing, which is not the committed value while
    // the reader is part-way through typing.
    const [hexDraft, setHexDraft] = useState(displayColor.replace("#", "").toUpperCase());
    const [opacityDraft, setOpacityDraft] = useState<string | number>(displayOpacity);

    useEffect(() => {
        setHexDraft(displayColor.replace("#", "").toUpperCase());
    }, [displayColor]);

    useEffect(() => {
        setOpacityDraft(displayOpacity);
    }, [displayOpacity]);

    /**
     * Take a colour from the picker, splitting off its alpha channel.
     *
     * Mantine reports `#RRGGBBAA` in the `hexa` format and `#RRGGBB` when there
     * is no alpha channel to report. The picker gives us no event, so the
     * change is reported with the value alone.
     * @param picked - The colour the picker reports
     */
    const handlePickerChange = (picked: string): void => {
        if (picked.length === HEXA_LENGTH) {
            setChosenColor(picked.slice(0, HEXA_ALPHA_START).toUpperCase());

            if (showOpacity) {
                setChosenOpacity(parseAlphaFromHexa(picked.slice(HEXA_ALPHA_START, HEXA_LENGTH)));
            }

            return;
        }

        setChosenColor(picked.toUpperCase());
    };

    /**
     * The colour and the opacity as one `#RRGGBBAA` value, which is the format
     * the picker works in.
     * @returns The current colour with its alpha channel appended
     */
    const hexaValue = (): string => `${displayColor}${opacityToAlphaHex(displayOpacity)}`.toUpperCase();

    /**
     * Record a keystroke in the hex box without committing it.
     * @param event - The change that carried the keystroke
     */
    const handleHexChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
        setHexDraft(event.currentTarget.value.toUpperCase());
    };

    /**
     * Commit what was typed into the hex box, and hand the blur on.
     *
     * A value that is not six hex digits leaves the colour alone and redraws
     * the box from it, so a half-typed colour is discarded rather than
     * guessed at.
     * @param event - The blur that ended the edit
     */
    const handleHexBlur = (event: React.FocusEvent<HTMLInputElement>): void => {
        const typed = hexDraft.toUpperCase();
        const candidate = typed.startsWith("#") ? typed : `#${typed}`;

        if (SIX_DIGIT_HEX.test(candidate) && candidate !== displayColor) {
            setChosenColor(candidate, event);
        } else {
            setHexDraft(displayColor.replace("#", "").toUpperCase());
        }

        onBlur?.(event);
    };

    /**
     * Record a keystroke in the opacity box without committing it.
     * @param next - What the box now holds, as Mantine reports it
     */
    const handleOpacityChange = (next: string | number): void => {
        setOpacityDraft(next);
    };

    /**
     * Commit what was typed into the opacity box, pulled into 0..100, and hand
     * the blur on.
     *
     * What the reader typed is read in their own locale rather than with
     * `parseFloat`, which understands only a period and only ASCII digits.
     * @param event - The blur that ended the edit
     */
    const handleOpacityBlur = (event: React.FocusEvent<HTMLInputElement>): void => {
        const typed = typeof opacityDraft === "string" ? parseNumber(opacityDraft) : opacityDraft;

        if (Number.isNaN(typed)) {
            setOpacityDraft(displayOpacity);
            onBlur?.(event);
            return;
        }

        const clamped = Math.min(MAX_OPACITY, Math.max(MIN_OPACITY, typed));
        if (clamped !== displayOpacity) {
            setChosenOpacity(clamped, event);
        }

        setOpacityDraft(clamped);
        onBlur?.(event);
    };

    /**
     * Give the colour, and the opacity when it is shown, back to their
     * defaults.
     * @param event - The click, or the click a browser synthesises from Enter or Space
     */
    const handleReset = (event: React.MouseEvent<HTMLButtonElement>): void => {
        setChosenColor(undefined, event);

        if (showOpacity) {
            setChosenOpacity(undefined, event);
        }
    };

    const hexPosition: JoinPosition = showOpacity ? "middle" : "end";

    const controls = (
        <Group data-testid="compact-color-input" gap={CONTROL_GAP} wrap="nowrap">
            <Group gap={0} wrap="nowrap">
                <Popout>
                    <Popout.Trigger>
                        {/* A real button, so Popout.Trigger's aria-expanded,
                            aria-controls and aria-haspopup="dialog" land on
                            something that already answers Enter and Space. */}
                        <ActionIcon
                            variant="filled"
                            size={PANEL_GRID.CONTROL_HEIGHT}
                            radius={0}
                            style={{
                                // The same variable the theme gives every input
                                // its --input-bg from, so the swatch and the two
                                // boxes beside it read as one surface.
                                backgroundColor: "var(--mantine-color-default)",
                                ...joinedCorners("start"),
                            }}
                            data-testid="compact-color-input-swatch"
                            disabled={disabled}
                            aria-label={labels.colorSwatch}
                        >
                            <ColorSwatch
                                color={displayColor}
                                size={PANEL_GRID.GLYPH}
                                radius={SWATCH_RADIUS}
                                style={{ border: `1px solid ${PANEL_INK.BORDER}` }}
                            />
                        </ActionIcon>
                    </Popout.Trigger>
                    <Popout.Panel
                        width={PICKER_WIDTH}
                        header={{ variant: "title", title: label ?? labels.colorPanelTitle }}
                        placement="bottom"
                        alignment="start"
                        gap={CONTROL_GAP}
                    >
                        <Popout.Content>
                            <ColorPicker
                                format="hexa"
                                value={hexaValue()}
                                onChange={handlePickerChange}
                                swatches={[...SWATCH_COLORS_HEXA]}
                            />
                        </Popout.Content>
                    </Popout.Panel>
                </Popout>

                <TextInput
                    data-testid="compact-color-input-hex"
                    disabled={disabled}
                    value={hexDraft}
                    onChange={handleHexChange}
                    onFocus={onFocus}
                    onBlur={handleHexBlur}
                    aria-label={labels.colorHexValue}
                    data-is-default={isColorDefault ? "true" : "false"}
                    w={HEX_WIDTH}
                    styles={{
                        input: {
                            ...joinedCorners(hexPosition),
                            fontFamily: "monospace",
                            textTransform: "uppercase",
                            ...(isColorDefault
                                ? {
                                      fontStyle: "italic",
                                      color: PANEL_INK.CHROME,
                                  }
                                : {}),
                        },
                    }}
                />

                {showOpacity && (
                    <>
                        <Divider
                            orientation="vertical"
                            color={PANEL_INK.BORDER}
                            h={PANEL_GRID.CONTROL_HEIGHT}
                            my={0}
                        />

                        <NumberInput
                            data-testid="compact-color-input-opacity"
                            disabled={disabled}
                            value={opacityDraft}
                            onChange={handleOpacityChange}
                            onFocus={onFocus}
                            onBlur={handleOpacityBlur}
                            min={MIN_OPACITY}
                            max={MAX_OPACITY}
                            decimalSeparator={decimalSeparator}
                            hideControls
                            suffix="%"
                            aria-label={labels.opacity}
                            data-is-default={isOpacityDefault ? "true" : "false"}
                            w={OPACITY_WIDTH}
                            styles={{
                                input: {
                                    ...joinedCorners("end"),
                                    // "end" rather than "right", so the number
                                    // stays against the closing edge of the run
                                    // when the interface runs the other way.
                                    textAlign: "end",
                                    ...(isOpacityDefault
                                        ? {
                                              fontStyle: "italic",
                                              color: PANEL_INK.CHROME,
                                          }
                                        : {}),
                                },
                            }}
                        />
                    </>
                )}
            </Group>

            {/* The reset is drawn only once there is something to undo, so a
                panel of untouched controls stays quiet. Its 24px box is the
                WCAG 2.2 (2.5.8) target-size minimum, which the 18px "xs"
                ActionIcon it used to be did not meet. */}
            {!isDefault && (
                <ActionIcon
                    variant="subtle"
                    size={PANEL_GRID.TRAIL}
                    c={PANEL_INK.CHROME}
                    data-testid="compact-color-input-reset"
                    disabled={disabled}
                    aria-label={labels.resetToDefault(label ?? labels.colorGenericName)}
                    onClick={handleReset}
                >
                    <UiGlyph name="reset" size={PANEL_GRID.CHEVRON} />
                </ActionIcon>
            )}
        </Group>
    );

    if (label === undefined) {
        return controls;
    }

    return (
        <Stack data-testid="compact-color-input-labelled" gap={0} role="group" aria-labelledby={labelId}>
            <Text id={labelId} data-testid="compact-color-input-label" size="xs" c={PANEL_INK.CHROME} mb={1} lh={1.2}>
                {label}
            </Text>
            {controls}
        </Stack>
    );
}
