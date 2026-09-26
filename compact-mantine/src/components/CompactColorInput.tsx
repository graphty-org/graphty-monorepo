import { ActionIcon, VisuallyHidden } from "@mantine/core";
import { useUncontrolled } from "@mantine/hooks";
import React, { useEffect, useId, useState } from "react";

import { SWATCH_COLORS_HEXA } from "../constants/colors";
import { PANEL_GRID, PANEL_INK } from "../constants/panel";
import { useLabels } from "../i18n";
import { UiGlyph } from "../icons";
import type { ChangeHandler } from "../types/events";
import { normalizeHexa, opacityToAlphaHex, parseAlphaFromHexa } from "../utils/color-utils";
import { useControlAnnotation } from "../utils/control-annotation";
import { Chit } from "./color/Chit";
import { ColorPickerPanel } from "./color/ColorPickerPanel";
import { isLeavingWithoutCommit, leaveWithoutCommit } from "./color/escape";
import { OpacityInput } from "./color/OpacityInput";
import { Popout } from "./popout";

// Figma's paint field (design/figma-spec.md 7.2): ONE 24-tall field holding the 14px chit (a
// real button that opens the picker, 7.3), the hex box, a 1px seam and the opacity box with its
// scrubbable "%". The look lives in src/theme/css/color.css.ts.
//
// Accessibility: the APG "Grouping controls" pattern round three separately named controls --
// the chit button (Popout.Trigger adds aria-haspopup="dialog" and aria-expanded), the hex text
// box and the opacity text box. The group carries the field's own name, so a screen reader
// announces "Fill group" once and each control then says which part of the colour it holds.

/** The default field width: the panel grid's body column. */
const DEFAULT_WIDTH = PANEL_GRID.BODY;

/** The lowest and highest opacity, in percent. */
const MAX_OPACITY = 100;

/** The length of `#RRGGBBAA`. */
const HEXA_LENGTH = 9;

/** Where the alpha pair starts in `#RRGGBBAA`. */
const HEXA_ALPHA_START = 7;

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
     * Supplying this ALONGSIDE `onColorChange` or `onOpacityChange` makes every
     * gesture write twice. Pick one route.
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
    onChange?: (color: string | undefined, opacity: number | undefined, event?: React.SyntheticEvent) => void;
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
    /**
     * The field's width. Figma's paint field is 156 beside a row's eye and minus buttons and
     * 184 on its own, which is the default here (the reset button sits in the trailing slot).
     * Pass `"100%"` to fill a flex slot, as the gradient editor's stop rows do.
     * @default 184
     */
    width?: number | string;
    /**
     * Whether to offer the reset button once something is chosen.
     * @default true
     */
    showReset?: boolean;
}

/**
 * A colour in one paint field: the chit, the hex value and the opacity.
 *
 * Pressing the chit opens the colour picker in a pop-out (one at a time, docked to the start
 * side of the panel); the hex box takes `RRGGBB` (or `RGB`) and commits on blur or Enter, and
 * reverts on Escape; the opacity box commits on blur or Enter, steps with ArrowUp / ArrowDown
 * (Shift for 10) and scrubs by dragging its "%".
 *
 * As in the other controls of this family, `undefined` means "the reader has chosen nothing
 * here": the control shows the default in italics and offers no reset until something of the
 * reader's own is set, and pressing the reset reports `undefined` again. Colour and opacity are
 * tracked separately, so either can be the reader's while the other is still the default.
 * Typed opacity is read in the reader's own locale.
 * @param props - Component props
 * @param props.color - The colour, when you drive the control from your own state
 * @param props.defaultColor - The colour shown while the reader has chosen none of their own
 * @param props.opacity - The opacity as a percentage, when you drive the control from your own state
 * @param props.defaultOpacity - The opacity shown while the reader has set none of their own
 * @param props.onColorChange - Called with the new colour, or with `undefined` when the control is reset
 * @param props.onOpacityChange - Called with the new opacity, or with `undefined` when the control is reset
 * @param props.onChange - Called once per gesture with both halves of the colour, whichever of them moved
 * @param props.label - The field's name, drawn above the control and used to name the group
 * @param props.showOpacity - Whether to offer the opacity box
 * @param props.disabled - Whether the control cannot be used at all
 * @param props.disabledReason - One sentence saying why the control is off, drawn only while it is off
 * @param props.onFocus - Called when the hex box or the opacity box takes focus
 * @param props.onBlur - Called when the hex box or the opacity box loses focus
 * @param props.width - The field's width
 * @param props.showReset - Whether to offer the reset button
 * @returns The paint field, and its reset button when something has been set
 * @example
 * ```tsx
 * const [fill, setFill] = useState<string | undefined>(undefined);
 *
 * <PopoutManager>
 *     <CompactColorInput label="Fill" color={fill} defaultColor="#5B8FF9" onColorChange={setFill} />
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
    width = DEFAULT_WIDTH,
    showReset = true,
}: CompactColorInputProps): React.JSX.Element {
    const labels = useLabels();
    const labelId = useId();

    // Plain inputs, so every control takes aria-describedby directly.
    const annotation = useControlAnnotation({ name: label, disabled, disabledReason });

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

    const hexText = (c: string): string => c.replace("#", "").toUpperCase();
    const [hexDraft, setHexDraft] = useState(hexText(displayColor));

    useEffect(() => {
        setHexDraft(hexText(displayColor));
    }, [displayColor]);

    /**
     * Take a colour from the picker, splitting off its alpha channel. One onChange for the whole
     * gesture, after both halves are settled: two separate callbacks inside one React batch
     * would each rebuild a controlled consumer's state from the same stale snapshot.
     * @param picked - `#RRGGBBAA`, or `#RRGGBB` when the picker carries no alpha
     */
    const handlePickerChange = (picked: string): void => {
        const carriesAlpha = picked.length === HEXA_LENGTH;
        const nextColor = picked.slice(0, HEXA_ALPHA_START).toUpperCase();
        const movesOpacity = carriesAlpha && showOpacity;
        const nextOpacity = movesOpacity
            ? parseAlphaFromHexa(picked.slice(HEXA_ALPHA_START, HEXA_LENGTH))
            : chosenOpacity;

        setChosenColor(nextColor);
        if (movesOpacity) {
            setChosenOpacity(nextOpacity);
        }
        onChange?.(nextColor, nextOpacity);
    };

    /**
     * Commit what was typed into the hex box: six (or three) hex digits, otherwise redraw it.
     * @param event - the blur or Enter that ended the edit
     */
    const commitHex = (event: React.SyntheticEvent): void => {
        const digits = hexDraft.trim().replace("#", "");
        const hexa = digits.length === 3 || digits.length === 6 ? normalizeHexa(digits) : undefined;
        const candidate = hexa?.slice(0, HEXA_ALPHA_START);

        if (candidate !== undefined && candidate !== displayColor.toUpperCase()) {
            setChosenColor(candidate, event);
            onChange?.(candidate, chosenOpacity, event);
        } else {
            setHexDraft(hexText(displayColor));
        }
    };

    const commitOpacity = (next: number, event?: React.SyntheticEvent): void => {
        setChosenOpacity(next, event);
        onChange?.(chosenColor, next, event);
    };

    /**
     * Give the colour, and the opacity when it is shown, back to their defaults. With no opacity
     * box the reader's opacity is untouched and reported back as it stands.
     * @param event - the click
     */
    const handleReset = (event: React.MouseEvent<HTMLButtonElement>): void => {
        setChosenColor(undefined, event);
        if (showOpacity) {
            setChosenOpacity(undefined, event);
        }
        onChange?.(undefined, showOpacity ? undefined : chosenOpacity, event);
    };

    const hexaValue = `${displayColor}${opacityToAlphaHex(displayOpacity)}`.toUpperCase();

    const controls = (
        <div
            className="cm-paint"
            data-testid="compact-color-input"
            // The tooltip belongs to the outermost element only, so one hover matches one title.
            title={label === undefined ? annotation.title : undefined}
            data-disabled={disabled ? "true" : undefined}
        >
            <div
                className="cm-paint-field"
                data-testid="compact-color-input-field"
                data-disabled={disabled || undefined}
                style={{ width }}
            >
                <Popout>
                    <Popout.Trigger>
                        <button
                            type="button"
                            className="cm-paint-chit"
                            data-testid="compact-color-input-swatch"
                            disabled={disabled}
                            aria-label={labels.colorSwatch}
                            aria-describedby={annotation.describedBy}
                        >
                            <Chit color={showOpacity ? hexaValue : displayColor} variant="field" />
                        </button>
                    </Popout.Trigger>
                    <Popout.Panel
                        width={PANEL_GRID.POPOVER_WIDTH}
                        header={{ variant: "title", title: label ?? labels.colorPanelTitle }}
                    >
                        <ColorPickerPanel
                            value={hexaValue}
                            onChange={handlePickerChange}
                            withAlpha={showOpacity}
                            swatches={SWATCH_COLORS_HEXA}
                        />
                    </Popout.Panel>
                </Popout>

                <input
                    className="cm-paint-input cm-paint-hex"
                    type="text"
                    autoComplete="off"
                    spellCheck={false}
                    data-testid="compact-color-input-hex"
                    data-is-default={isColorDefault ? "true" : "false"}
                    aria-label={labels.colorHexValue}
                    aria-describedby={annotation.describedBy}
                    disabled={disabled}
                    value={hexDraft}
                    onChange={(event) => {
                        setHexDraft(event.currentTarget.value.toUpperCase());
                    }}
                    onFocus={(event) => {
                        event.currentTarget.select();
                        onFocus?.(event);
                    }}
                    onBlur={(event) => {
                        if (!isLeavingWithoutCommit(event)) {
                            commitHex(event);
                        }
                        onBlur?.(event);
                    }}
                    onKeyDown={(event) => {
                        if (event.key === "Enter") {
                            commitHex(event);
                        } else if (event.key === "Escape") {
                            leaveWithoutCommit(event, () => {
                                setHexDraft(hexText(displayColor));
                            });
                        }
                    }}
                />

                {showOpacity && (
                    <OpacityInput
                        value={displayOpacity}
                        onCommit={commitOpacity}
                        ariaLabel={labels.opacity}
                        isDefault={isOpacityDefault}
                        disabled={disabled}
                        describedBy={annotation.describedBy}
                        testId="compact-color-input-opacity"
                        onFocus={onFocus}
                        onBlur={onBlur}
                    />
                )}
            </div>

            {/* Drawn only once there is something to undo; a 24px target (WCAG 2.2, 2.5.8). */}
            {showReset && !isDefault && (
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

            {annotation.description !== undefined && (
                <VisuallyHidden id={annotation.describedBy}>{annotation.description}</VisuallyHidden>
            )}
        </div>
    );

    if (label === undefined) {
        return controls;
    }

    return (
        <div
            data-testid="compact-color-input-labelled"
            className="cm-paint-labelled"
            role="group"
            aria-labelledby={labelId}
            title={annotation.title}
        >
            <div id={labelId} data-testid="compact-color-input-label" className="cm-paint-label">
                {label}
            </div>
            {controls}
        </div>
    );
}
