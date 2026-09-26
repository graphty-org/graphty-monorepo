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
    VisuallyHidden,
} from "@mantine/core";
import { useUncontrolled } from "@mantine/hooks";
import React, { useEffect, useId, useMemo, useState } from "react";

import { SWATCH_COLORS_HEXA } from "../constants/colors";
import { PANEL_GRID, PANEL_INK } from "../constants/panel";
import { useLabels, useLocale, useNumberParser } from "../i18n";
import { UiGlyph } from "../icons";
import type { ChangeHandler } from "../types/events";
import { opacityToAlphaHex, parseAlphaFromHexa } from "../utils/color-utils";
import { useControlAnnotation, VISUALLY_HIDDEN_STYLE } from "../utils/control-annotation";
import { useDevWarning } from "../utils/dev-warning";
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
     *
     * Not called when `onChange` is supplied.
     */
    onColorChange?: ChangeHandler<string | undefined>;
    /**
     * Called when the opacity changes, and with `undefined` when the control is
     * reset to its default.
     *
     * The percentage comes first; the event that caused the change is second.
     *
     * Not called when `onChange` is supplied.
     */
    onOpacityChange?: ChangeHandler<number | undefined>;
    /**
     * Called once per gesture with BOTH halves of the colour, whichever of them
     * moved.
     *
     * Reach for this one, alone, whenever you drive the control from your own
     * state. `onColorChange` and `onOpacityChange` are kept for call sites that
     * already use them, but they cannot carry a gesture that moves both halves
     * at once.
     *
     * THE DEFECT THIS REPAIRS, reproduced at runtime rather than reasoned
     * about: dragging in the picker used to call `onColorChange` and then
     * `onOpacityChange` back to back inside one React batch. A controlled
     * consumer builds its next state out of the props it is holding -- the only
     * snapshot it has -- and both callbacks run against the SAME pre-gesture
     * snapshot, so the second one writes a state rebuilt from a colour the
     * first one had already replaced. A test in this package
     * (tests/components/CompactColorInput.test.tsx, "the two separate callbacks
     * cannot carry one gesture") drives a picker swatch and watches the second
     * write arrive as `{opacity: 50}` with the new colour gone. The application
     * had already forked this whole component to escape it.
     *
     * Both halves are always passed, so a consumer never has to remember which
     * one moved -- the same shape `GradientEditor` already uses for its stops
     * and its direction. `undefined` keeps its meaning from the props: the
     * reader has chosen nothing for that half and the default is showing.
     *
     * When this is supplied, `onColorChange` and `onOpacityChange` are not
     * called: one gesture makes one write. Passing both routes logs a
     * development warning naming the conflict.
     * @example
     * ```tsx
     * <CompactColorInput
     *     label="Fill"
     *     color={style.color}
     *     opacity={style.opacity}
     *     defaultColor="#5B8FF9"
     *     onChange={(color, opacity) => { setStyle({...style, color, opacity}); }}
     * />
     * ```
     */
    onChange?: (
        color: string | undefined,
        opacity: number | undefined,
        event?: React.SyntheticEvent,
    ) => void;
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
    /**
     * One sentence saying why the control is off, shown only while `disabled`
     * is true.
     *
     * It is appended to the control's own name after a full stop and drawn as
     * the tooltip -- "Glow colour. Glow is not drawn yet" -- and it also joins
     * the accessible description of the swatch, the hex box and the opacity
     * box, so the reason reaches a pointer user and a screen reader user alike.
     * With no `label` to append to, the sentence stands on its own.
     *
     * THE DEFECT THIS REPAIRS: a disabled colour control used to be dimmed and
     * silent, so a reader who could not open the picker had no route at all to
     * learning why -- spec:6641 asks for the one reason to travel with the
     * disabled ink, and until now this component had nowhere to put it.
     */
    disabledReason?: string;
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
 * @param props.onChange - Called once per gesture with both halves of the colour, whichever of them moved
 * @param props.label - The field's name, drawn above the control and used to name the group
 * @param props.showOpacity - Whether to offer an opacity box beside the colour
 * @param props.disabled - Whether the control cannot be used at all
 * @param props.disabledReason - One sentence saying why the control is off, drawn only while it is off
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
    onChange,
    label,
    showOpacity = true,
    disabled = false,
    disabledReason,
    onFocus,
    onBlur,
}: CompactColorInputProps): React.JSX.Element {
    const labels = useLabels();
    const parseNumber = useNumberParser();
    const decimalSeparator = useDecimalSeparator();
    const labelId = useId();

    // The swatch is a plain button, so it takes `aria-describedby` and points
    // at a hidden element of this component's own. The hex box and the opacity
    // box are Input.Wrapper-based, and Input.Wrapper computes its own
    // `aria-describedby` from its `description` prop and overwrites anything
    // passed in (measured against @mantine/core 8.3.10), so those two take the
    // sentence through `description` with the description element styled out of
    // sight -- the route PanelField already uses.
    const annotation = useControlAnnotation({name: label, disabled, disabledReason});

    // onChange, when given, is the only route out. The older pair would be a
    // second write for the same gesture, built from the same pre-gesture
    // snapshot onChange exists to avoid.
    const usesOnChange = onChange !== undefined;
    useDevWarning(
        usesOnChange && (onColorChange !== undefined || onOpacityChange !== undefined)
            ? "CompactColorInput was given onChange together with onColorChange or onOpacityChange. " +
                  "Only onChange is called; drop the other callbacks."
            : undefined,
    );

    // Controlled and uncontrolled, the way every state-holding component in
    // this package works. The uncontrolled state starts at undefined, which is
    // this component's word for "the reader has chosen nothing".
    const [chosenColor, setChosenColor] = useUncontrolled<string | undefined>({
        value: color,
        defaultValue: undefined,
        finalValue: undefined,
        onChange: usesOnChange ? undefined : onColorChange,
    });

    const [chosenOpacity, setChosenOpacity] = useUncontrolled<number | undefined>({
        value: opacity,
        defaultValue: undefined,
        finalValue: undefined,
        onChange: usesOnChange ? undefined : onOpacityChange,
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
        const carriesAlpha = picked.length === HEXA_LENGTH;
        const nextColor = carriesAlpha ? picked.slice(0, HEXA_ALPHA_START).toUpperCase() : picked.toUpperCase();
        const movesOpacity = carriesAlpha && showOpacity;
        const nextOpacity = movesOpacity
            ? parseAlphaFromHexa(picked.slice(HEXA_ALPHA_START, HEXA_LENGTH))
            : chosenOpacity;

        setChosenColor(nextColor);

        if (movesOpacity) {
            setChosenOpacity(nextOpacity);
        }

        // One write for the whole gesture, AFTER both halves are settled. When
        // onChange is absent the two setters above report through
        // onColorChange and onOpacityChange, which cannot carry a gesture that
        // moved both: a controlled consumer
        // rebuilds its next state from the props it is holding, both callbacks
        // see the same pre-gesture snapshot inside one React batch, and the
        // second write silently drops the first's colour. That is the race the
        // application forked this component to escape; onChange is the fix, and
        // it passes both halves every time so a consumer never has to work out
        // which one moved.
        onChange?.(nextColor, nextOpacity);
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
            // Both halves, every time: the opacity has not moved, but a
            // consumer driving the control from one state object needs the
            // value to rebuild that object with rather than a gap to guess at.
            onChange?.(candidate, chosenOpacity, event);
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
            // Both halves, every time -- see the hex commit above.
            onChange?.(chosenColor, clamped, event);
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

        // The reset is the other gesture that moves both halves at once, and it
        // loses one of them to exactly the same race. `undefined` here keeps
        // its meaning from the props: the reader has chosen nothing and the
        // default is showing again. With no opacity box on screen the reader's
        // opacity is untouched, so it is reported back as it stands rather than
        // being cleared behind their back.
        onChange?.(undefined, showOpacity ? undefined : chosenOpacity, event);
    };

    const hexPosition: JoinPosition = showOpacity ? "middle" : "end";

    const controls = (
        <Group
            data-testid="compact-color-input"
            gap={CONTROL_GAP}
            wrap="nowrap"
            // The tooltip belongs to the OUTERMOST element this component
            // returns, and only there: written on both the labelled wrapper and
            // the run of controls inside it, one hover would match two elements
            // and `getByTitle` would find a pair. A title on an ancestor already
            // covers everything inside it.
            title={label === undefined ? annotation.title : undefined}
            data-disabled={disabled ? "true" : undefined}
        >
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
                            aria-describedby={annotation.describedBy}
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
                    description={annotation.description}
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
                        // Present in the accessibility tree, absent from the
                        // layout: a visible description would break the 24px
                        // joined run this control is measured as.
                        description: VISUALLY_HIDDEN_STYLE,
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
                            description={annotation.description}
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
                                // Present in the accessibility tree, absent
                                // from the layout -- see the hex box above.
                                description: VISUALLY_HIDDEN_STYLE,
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

            {/* One hidden sentence, pointed at by the swatch button. The two
                boxes beside it carry the same words through Input.Wrapper's own
                description slot, because that wrapper overwrites any
                aria-describedby handed to it. */}
            {annotation.description !== undefined && (
                <VisuallyHidden id={annotation.describedBy}>{annotation.description}</VisuallyHidden>
            )}
        </Group>
    );

    if (label === undefined) {
        return controls;
    }

    return (
        <Stack
            data-testid="compact-color-input-labelled"
            gap={0}
            role="group"
            aria-labelledby={labelId}
            title={annotation.title}
        >
            <Text id={labelId} data-testid="compact-color-input-label" size="xs" c={PANEL_INK.CHROME} mb={1} lh={1.2}>
                {label}
            </Text>
            {controls}
        </Stack>
    );
}
