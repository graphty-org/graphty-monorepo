import { ActionIcon, Tooltip, VisuallyHidden } from "@mantine/core";
import React, { useEffect, useId, useLayoutEffect, useRef, useState } from "react";

import { SWATCH_COLORS_HEXA } from "../constants/colors";
import { PANEL_GRID } from "../constants/panel";
import { type CompactMantineLabels, defaultLabels, useLabels } from "../i18n";
import { UiGlyph } from "../icons";
import type { ChangeHandler } from "../types/events";
import { useChosen } from "../utils/chosen";
import { opacityToAlphaHex, parseAlphaFromHexa } from "../utils/color-utils";
import { type ControlAnnotation, useControlAnnotation } from "../utils/control-annotation";
import { useDevWarning } from "../utils/dev-warning";
import { Chit } from "./color/Chit";
import { ColorPickerPanel } from "./color/ColorPickerPanel";
import { revertOnEscape } from "./color/escape";
import { OpacityInput } from "./color/OpacityInput";
import { typedColor } from "./color/typed-color";
import { DiscardNote } from "./inputs/DiscardNote";
import { Popout } from "./popout";

// Figma's paint field (design/figma-spec.md 7.2): ONE 24-tall field holding the 14px chit (a
// real button that opens the picker, 7.3), the hex box, a 1px seam and the opacity box with its
// scrubbable "%". The look lives in src/theme/css/color.css.ts.
//
// Accessibility: the APG "Grouping controls" pattern round three separately named controls --
// the chit button (Popout.Trigger adds aria-haspopup="dialog" and aria-expanded), the hex text
// box and the opacity text box. The group carries the field's own name, so a screen reader
// announces "Fill group" once; each control is also named from the label on its own ("Pick fill
// color", "Fill color" followed by the hex it holds, "Fill opacity"), so a reader who lands on one
// directly, or lists the page's controls, still hears what it sets.

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
     * The color, as `#RRGGBB`, when you drive the control from your own state.
     *
     * `undefined` does not mean "no color" here: it means the reader has
     * chosen none and the control is showing `defaultColor`.
     */
    color?: string | undefined;
    /** The color shown while the reader has chosen none of their own. */
    defaultColor: string;
    /**
     * Words shown in the hex box in place of `defaultColor` while the reader has chosen nothing,
     * for a color whose default is another color rather than a value of its own -- "Line color"
     * for an arrowhead that takes its edge's color. The hex box is then empty, with these words
     * as its placeholder; the chit still shows `defaultColor`. As `StyleNumberInput`'s `emptyText`.
     * In the chip form, which has no hex box, the chip is drawn empty instead -- no color is shown
     * as if it were chosen -- and its name says "not set" with these words; pressing it opens the
     * picker at `defaultColor`.
     */
    emptyText?: string;
    /**
     * Whether no color is in force while the reader has chosen none: the field form then draws its
     * swatch empty (an outline), as the chip form does with `emptyText`, so a swatch never shows a
     * color that nothing draws -- a label background whose default is none. `defaultColor` is then
     * only where the picker opens. Default false: the swatch shows `defaultColor`.
     */
    emptySwatch?: boolean;
    /**
     * Whether the things this field stands for disagree: several selected rows, or elements the
     * layers beneath paint in different colors. While the reader has chosen nothing, the field
     * draws the word "Mixed" (`labels.mixed`) and no swatch, since no one color is in force.
     * Typing a color writes one color, as in any field. In the chip form, the chip draws a dash in
     * place of a color and its name says "Mixed"; pressing it opens the picker.
     * @default false
     */
    mixed?: boolean;
    /**
     * The opacity as a percentage from 0 to 100, when you drive the control
     * from your own state. `undefined` means the reader has set none and the
     * control is showing `defaultOpacity`.
     */
    opacity?: number | undefined;
    /**
     * The opacity shown while the reader has set none of their own.
     * @default 100
     */
    defaultOpacity?: number;
    /**
     * Called when the color changes, and with `undefined` when the control is
     * reset to its default.
     *
     * The color comes first, as `#RRGGBB` in upper case; the event that caused
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
     * Called once per gesture with BOTH halves of the color, whichever of them
     * moved.
     *
     * Reach for this one, alone, whenever you drive the control from your own
     * state. `onColorChange` and `onOpacityChange` are kept for call sites that
     * already use them, but they cannot carry a gesture that moves both halves
     * at once.
     *
     * Why: a picker gesture can move the color and the opacity at once. With
     * the two separate callbacks, both run against the same props, so a
     * controlled consumer that rebuilds its state from those props in each one
     * loses the color when the opacity write lands second.
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
    onChange?: (color: string | undefined, opacity: number | undefined, event?: React.SyntheticEvent) => void;
    /**
     * Called once when a gesture settles, with both halves of the color, as
     * `onChange` passes them.
     *
     * A drag in the picker calls `onChange` on every move and this once, on
     * release; a typed hex, an opacity commit, a swatch pick and the reset
     * each call both once. Write to an undo history or a slow store here, so
     * a drag is one step.
     *
     * Called whichever of `onChange` or `onColorChange` / `onOpacityChange`
     * you use.
     */
    onChangeEnd?: (color: string | undefined, opacity: number | undefined, event?: React.SyntheticEvent) => void;
    /**
     * The swatch set the picker offers under its divider, as hex or hexa
     * strings -- the colors already used in the document, for instance.
     * @default SWATCH_COLORS_HEXA
     */
    swatches?: readonly string[];
    /**
     * The field's name, drawn above the control and used to name the group the
     * three controls sit in.
     *
     * Leave it out for a color that is already named by what surrounds it,
     * such as one stop of a gradient.
     */
    label?: string;
    /**
     * The field's name when nothing draws it: the swatch, the hex box and the opacity box are
     * named from it as they are from `label` ("Pick node color", "Node color"), and no label is
     * drawn. For a field whose name is drawn by what surrounds it in another form, such as a
     * properties row that draws "Color" above two fields. Ignored when `label` is given.
     */
    "aria-label"?: string;
    /**
     * Words a screen reader hears for the color in force ("teal"). In the chip form they replace
     * its state and hex, for a row where the color is the value itself, such as a group's color in
     * a palette, so the reader hears a name rather than "not set, #009E73". In the field form they
     * join the hex box's name after its state ("Node color, set, teal"), beside the hex it holds.
     */
    valueText?: string;
    /**
     * Whether to offer an opacity box beside the color.
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
     * the tooltip -- "Glow color. Glow is not drawn yet" -- and it also joins
     * the accessible description of the swatch, the hex box and the opacity
     * box, so the reason reaches a pointer user and a screen reader user alike.
     * With no `label` to append to, the sentence stands on its own.
     *
     * Write it as a whole sentence naming what would make the control usable
     * again.
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
     * Whether to offer the reset button once something is chosen. Turn it off when the caller
     * draws its own way back to "nothing chosen" beside the control, such as one Clear per row.
     * @default true
     */
    showReset?: boolean;
    /**
     * How the control is drawn. `"field"` is the whole paint field (swatch, hex and opacity).
     * `"chip"` is the swatch alone, 24 px square, for a row that already names the color beside
     * it (an effect, a category of a varied value): pressing it opens the picker. Its accessible
     * name carries the field's name, its state and its color ("Group 3 color, set here,
     * #E69F00"), and no label is drawn.
     * @default "field"
     */
    variant?: "field" | "chip";
    /**
     * Whether to use `label` only to name the controls, without drawing it above them or
     * grouping them under it. For a field whose name is already drawn beside it, such as the
     * value of a `FieldRow` that shows the property's name in its own column.
     * @default false
     */
    hideLabel?: boolean;
}

/** What the hex box shows and says. */
interface HexReading {
    /** Whether the field draws "Mixed": the things it stands for disagree and none is chosen. */
    showsMixed: boolean;
    /** The words under an empty hex box, if any. */
    emptyWords: string | undefined;
    /** The hex box's value: the digits, or empty under the words. */
    shownHex: string;
    /** The spoken state: mixed, not set (with what is drawn), or set. */
    hexState: string;
    /** Whether the state already carries the color's words, so the value text is not added again. */
    wordsInState: boolean;
}

/**
 * Work out what the hex box shows and says.
 * @param labels - the words
 * @param options - the field's state
 * @param options.mixed - whether the things the field stands for disagree
 * @param options.isColorDefault - whether no color is chosen here
 * @param options.emptyText - words for an unchosen color
 * @param options.emptySwatch - whether no color is in force while none is chosen
 * @param options.displayColor - the color shown
 * @param options.valueText - the color's spoken words
 * @returns the reading
 */
function readHex(
    labels: CompactMantineLabels,
    options: {
        mixed: boolean;
        isColorDefault: boolean;
        emptyText: string | undefined;
        emptySwatch: boolean;
        displayColor: string;
        valueText: string | undefined;
    },
): HexReading {
    const { mixed, isColorDefault, emptyText, emptySwatch, displayColor, valueText } = options;
    // While nothing is chosen and there are words for that ("Mixed", "Line color"), the hex box
    // is empty under them.
    const showsMixed = mixed && isColorDefault;
    const emptyWords = showsMixed ? labels.mixed : emptyText;
    const shownHex = isColorDefault && emptyWords !== undefined ? "" : displayColor.replace("#", "").toUpperCase();
    // Every state is spoken, set included, as the number and select fields say theirs.
    let hexState: string;
    if (showsMixed) {
        hexState = labels.mixed;
    } else if (isColorDefault) {
        // The color is what the drawing shows, not a value set here: "not set, drawn #6366F1
        // indigo". With an empty swatch nothing is drawn, so no color is named.
        const drawn = labels.colorDrawn ?? defaultLabels.colorDrawn;
        hexState = labels.fieldNotSet(emptyText ?? (emptySwatch ? "" : drawn(displayColor.toUpperCase(), valueText)));
    } else {
        hexState = labels.fieldSet;
    }
    // An unset color's words are already in its state ("drawn #6366F1 indigo").
    const wordsInState = showsMixed || (isColorDefault && emptyText === undefined);
    return { showsMixed, emptyWords, shownHex, hexState, wordsInState };
}

/**
 * The development warning for a field given both callback routes.
 * @param usesOnChange - whether onChange was given
 * @param onColorChange - the older color callback
 * @param onOpacityChange - the older opacity callback
 * @returns the warning, or undefined when the callbacks agree
 */
function callbackConflict(usesOnChange: boolean, onColorChange: unknown, onOpacityChange: unknown): string | undefined {
    return usesOnChange && (onColorChange !== undefined || onOpacityChange !== undefined)
        ? "CompactColorInput was given onChange together with onColorChange or onOpacityChange. " +
              "Only onChange is called; drop the other callbacks."
        : undefined;
}

/**
 * The names of the field's controls, from the field's own name.
 * @param labels - the words
 * @param name - the field's name, if any
 * @returns the hex box's, the swatch's and the opacity box's names
 */
function controlNames(
    labels: CompactMantineLabels,
    name: string | undefined,
): { hexName: string; swatchName: string; opacityName: string } {
    if (name === undefined) {
        return { hexName: labels.colorHexValue, swatchName: labels.colorSwatch, opacityName: labels.opacity };
    }
    return {
        hexName: labels.colorValue(name),
        swatchName: labels.pickColor(name),
        opacityName: labels.colorOpacity(name),
    };
}

/**
 * The swatch's face: a dash for mixed, nothing for an empty swatch, else the color's chit.
 * @param props - Component props
 * @param props.showsMixed - whether the field draws "Mixed"
 * @param props.empty - whether the swatch is drawn empty
 * @param props.color - the chit's color
 * @returns the face
 */
function SwatchFace({
    showsMixed,
    empty,
    color,
}: Readonly<{ showsMixed: boolean; empty: boolean; color: string }>): React.JSX.Element {
    return (
        <>
            {showsMixed && <UiGlyph name="dash" size={PANEL_GRID.CHEVRON} />}
            {!showsMixed && !empty && <Chit color={color} variant="field" />}
        </>
    );
}

/**
 * The hidden description a disabled reason is announced from, when there is one.
 * @param props - Component props
 * @param props.annotation - the control's annotation
 * @returns the description, or null
 */
function AnnotationDescription({ annotation }: Readonly<{ annotation: ControlAnnotation }>): React.JSX.Element | null {
    if (annotation.description === undefined) {
        return null;
    }
    return <VisuallyHidden id={annotation.describedBy}>{annotation.description}</VisuallyHidden>;
}

/** Props for ColorChip. */
interface ColorChipProps {
    /** The words. */
    labels: CompactMantineLabels;
    /** The field's name, if any. */
    name: string | undefined;
    /** What the hex box shows and says. */
    reading: HexReading;
    /** Whether no color is chosen here. */
    isColorDefault: boolean;
    /** Words for an unchosen color. */
    emptyText: string | undefined;
    /** Whether no color is in force while none is chosen. */
    emptySwatch: boolean;
    /** The color shown. */
    displayColor: string;
    /** The color's spoken words. */
    valueText: string | undefined;
    /** The chit's color. */
    chitColor: string;
    /** The control's annotation. */
    annotation: ControlAnnotation;
    /** Whether the control cannot be used. */
    disabled: boolean;
    /** The picker's pop-out panel. */
    pickerPanel: React.ReactNode;
}

/**
 * The chip form: the swatch alone, a 24px target (WCAG 2.2, 2.5.8), named with its state and color.
 * @param props - Component props
 * @param props.labels - the words
 * @param props.name - the field's name
 * @param props.reading - what the hex box shows and says
 * @param props.isColorDefault - whether no color is chosen here
 * @param props.emptyText - words for an unchosen color
 * @param props.emptySwatch - whether no color is in force while none is chosen
 * @param props.displayColor - the color shown
 * @param props.valueText - the color's spoken words
 * @param props.chitColor - the chit's color
 * @param props.annotation - the control's annotation
 * @param props.disabled - whether the control cannot be used
 * @param props.pickerPanel - the picker's pop-out panel
 * @returns the chip
 */
function ColorChip({
    labels,
    name,
    reading,
    isColorDefault,
    emptyText,
    emptySwatch,
    displayColor,
    valueText,
    chitColor,
    annotation,
    disabled,
    pickerPanel,
}: Readonly<ColorChipProps>): React.JSX.Element {
    const { showsMixed, hexState } = reading;
    const chipNoun = name === undefined ? labels.colorSwatch : labels.colorValue(name);
    const chipName = `${chipNoun}, ${hexState}`;
    /**
     * The chip's name: the caller's words for the color, else its state and hex.
     * @param stated - the name with the state
     * @param words - the caller's words, if any
     * @returns the name
     */
    const chipLabel = (stated: string, words: string | undefined): string => {
        if (words !== undefined && !showsMixed) {
            return `${chipNoun}, ${words}`;
        }
        return isColorDefault ? stated : `${stated}, ${displayColor.toUpperCase()}`;
    };
    // Nothing chosen, with words for it: an empty chip, since no color is in force here.
    const emptyChip = !showsMixed && isColorDefault && (emptyText !== undefined || emptySwatch);
    return (
        <span className="cm-paint-chip-wrap" title={annotation.title} data-disabled={disabled || undefined}>
            <Popout>
                <Popout.Trigger>
                    <button
                        type="button"
                        className="cm-paint-chit cm-paint-chip"
                        data-testid="compact-color-input-chip"
                        data-is-default={isColorDefault ? "true" : "false"}
                        data-mixed={showsMixed || undefined}
                        data-empty={emptyChip || undefined}
                        disabled={disabled}
                        aria-label={chipLabel(chipName, valueText)}
                        aria-describedby={annotation.describedBy}
                    >
                        <SwatchFace showsMixed={showsMixed} empty={emptyChip} color={chitColor} />
                    </button>
                </Popout.Trigger>
                {pickerPanel}
            </Popout>
            <AnnotationDescription annotation={annotation} />
        </span>
    );
}

/**
 * The reset button, drawn only once there is something to undo; a 24px target (WCAG 2.2, 2.5.8).
 * @param props - Component props
 * @param props.show - whether the field offers a reset at all
 * @param props.isDefault - whether nothing is set here
 * @param props.name - the words the button's name is built from
 * @param props.labels - the words
 * @param props.disabled - whether the control cannot be used
 * @param props.onReset - called on a click
 * @returns the button, or null
 */
function ResetButton({
    show,
    isDefault,
    name,
    labels,
    disabled,
    onReset,
}: Readonly<{
    show: boolean;
    isDefault: boolean;
    name: string;
    labels: CompactMantineLabels;
    disabled: boolean;
    onReset: (event: React.MouseEvent<HTMLButtonElement>) => void;
}>): React.JSX.Element | null {
    if (!show || isDefault) {
        return null;
    }
    return (
        // An icon-only button says what it does on hover, not only to a screen reader.
        <Tooltip label={labels.resetToDefault(name)}>
            <ActionIcon
                variant="subtle"
                size={PANEL_GRID.TRAIL}
                // The ink is a variable the theme dims under a locked (aria-disabled) panel.
                c="var(--cm-paint-reset-ink)"
                data-testid="compact-color-input-reset"
                disabled={disabled}
                aria-label={labels.resetToDefault(name)}
                onClick={onReset}
            >
                <UiGlyph name="reset" size={PANEL_GRID.CHEVRON} />
            </ActionIcon>
        </Tooltip>
    );
}

/**
 * A color in one paint field: the chit, the hex value and the opacity.
 *
 * Pressing the chit opens the color picker in a pop-out (one at a time, docked to the start
 * side of the panel); the hex box takes `RRGGBB` (or `RGB`) and commits on blur or Enter, and
 * reverts on Escape; the opacity box commits on blur or Enter, steps with ArrowUp / ArrowDown
 * (Shift for 10) and scrubs by dragging its "%".
 *
 * As in the other controls of this family, `undefined` means "the reader has chosen nothing
 * here": the control shows the default as its value and offers no reset until something of the
 * reader's own is set, and pressing the reset reports `undefined` again. Color and opacity are
 * tracked separately, so either can be the reader's while the other is still the default.
 * Typed opacity is read in the reader's own locale.
 * @param props - Component props
 * @param props.color - The color, when you drive the control from your own state
 * @param props.defaultColor - The color shown while the reader has chosen none of their own
 * @param props.emptyText - Words shown in the hex box in place of `defaultColor` while nothing is chosen
 * @param props.emptySwatch - Whether no color is in force while none is chosen, so the swatch is drawn empty
 * @param props.mixed - Whether the things the field stands for disagree, shown as "Mixed" while nothing is chosen
 * @param props.opacity - The opacity as a percentage, when you drive the control from your own state
 * @param props.defaultOpacity - The opacity shown while the reader has set none of their own
 * @param props.onColorChange - Called with the new color, or with `undefined` when the control is reset
 * @param props.onOpacityChange - Called with the new opacity, or with `undefined` when the control is reset
 * @param props.onChange - Called once per gesture with both halves of the color, whichever of them moved
 * @param props.onChangeEnd - Called once when a gesture settles, with both halves of the color
 * @param props.swatches - The swatch set the picker offers
 * @param props.label - The field's name, drawn above the control and used to name the group
 * @param props.showOpacity - Whether to offer the opacity box
 * @param props.disabled - Whether the control cannot be used at all
 * @param props.disabledReason - One sentence saying why the control is off, drawn only while it is off
 * @param props.onFocus - Called when the hex box or the opacity box takes focus
 * @param props.onBlur - Called when the hex box or the opacity box loses focus
 * @param props.width - The field's width
 * @param props.showReset - Whether to offer the reset button
 * @param props."aria-label" - The field's name when nothing draws it, which names its controls
 * @param props.variant - The whole paint field, or the swatch alone as a chip
 * @param props.valueText - The color's spoken words: in the chip form in place of its state and hex, in the field form beside them
 * @param props.hideLabel - Whether the label only names the controls and is not drawn
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
    emptyText,
    emptySwatch = false,
    mixed = false,
    opacity,
    defaultOpacity = MAX_OPACITY,
    onColorChange,
    onOpacityChange,
    onChange,
    onChangeEnd,
    swatches = SWATCH_COLORS_HEXA,
    label,
    showOpacity = true,
    disabled = false,
    disabledReason,
    onFocus,
    onBlur,
    width = DEFAULT_WIDTH,
    showReset = true,
    "aria-label": ariaLabel,
    variant = "field",
    valueText,
    hideLabel = false,
}: Readonly<CompactColorInputProps>): React.JSX.Element {
    const labels = useLabels();
    // What names the controls: the drawn label, else the undrawn name.
    const name = label ?? ariaLabel;
    const labelId = useId();

    // Plain inputs, so every control takes aria-describedby directly.
    const annotation = useControlAnnotation({ name: label, disabled, disabledReason });

    // onChange, when given, is the only route out. The older pair would be a
    // second write for the same gesture, built from the same pre-gesture
    // snapshot onChange exists to avoid.
    const usesOnChange = onChange !== undefined;
    useDevWarning(callbackConflict(usesOnChange, onColorChange, onOpacityChange));

    const older = usesOnChange ? {} : { onColorChange, onOpacityChange };
    const [chosenColor, setChosenColor] = useChosen(color, older.onColorChange);
    const [chosenOpacity, setChosenOpacity] = useChosen(opacity, older.onOpacityChange);

    const isColorDefault = chosenColor === undefined;
    const isOpacityDefault = chosenOpacity === undefined;

    const displayColor = chosenColor ?? defaultColor;
    const displayOpacity = chosenOpacity ?? defaultOpacity;

    const reading = readHex(labels, { mixed, isColorDefault, emptyText, emptySwatch, displayColor, valueText });
    const { showsMixed, emptyWords, shownHex, hexState } = reading;
    // The state joins the hex box's name: a default is drawn as any value, as Figma does.
    const { hexName, swatchName, opacityName } = controlNames(labels, name);
    const [hexDraft, setHexDraft] = useState(shownHex);
    // Why the last entry was refused, or what Escape did: said aloud, never drawn, since Figma's
    // field silently goes back to its value.
    const [refusal, setRefusal] = useState<{ message: string } | undefined>(undefined);
    const [discarded, setDiscarded] = useState("");
    const hexRef = useRef<HTMLInputElement>(null);
    // Set by an Enter that settled the box: the value it shows next is selected, so the next key
    // replaces it. Typing and leaving clear it.
    const selectOnRedraw = useRef(false);
    // Whether the reader typed in the box since it last showed its value: typing the color it
    // already shows is a choice, as Enter on it is; a Tab past it is not.
    const typedHere = useRef(false);

    useEffect(() => {
        typedHere.current = false;
        setHexDraft(shownHex);
        // A new value (an undo, a pick, a write from elsewhere) answers any earlier refusal.
        setRefusal(undefined);
        setDiscarded("");
    }, [shownHex]);

    useLayoutEffect(() => {
        const input = hexRef.current;
        if (selectOnRedraw.current && input !== null && input === document.activeElement && hexDraft === shownHex) {
            input.select();
        }
    }, [hexDraft, shownHex]);

    // A refusal stays until focus moves on from where it was said: a later focus anywhere but the
    // hex box clears it. Listening from the next task skips the move that made it (a Tab out).
    useEffect(() => {
        if (refusal === undefined) {
            return undefined;
        }
        const onFocusIn = (event: FocusEvent): void => {
            if (event.target !== hexRef.current) {
                setRefusal(undefined);
            }
        };
        const later = setTimeout(() => {
            document.addEventListener("focusin", onFocusIn);
        }, 0);
        return () => {
            clearTimeout(later);
            document.removeEventListener("focusin", onFocusIn);
        };
    }, [refusal]);

    /**
     * Split a picker color into the field's two halves.
     * @param picked - `#RRGGBBAA`, or `#RRGGBB` when the picker carries no alpha
     * @returns the color, the opacity it implies, and whether the picker moved the opacity
     */
    const splitPicked = (
        picked: string,
    ): { nextColor: string; nextOpacity: number | undefined; movesOpacity: boolean } => {
        const movesOpacity = picked.length === HEXA_LENGTH && showOpacity;
        return {
            nextColor: picked.slice(0, HEXA_ALPHA_START).toUpperCase(),
            nextOpacity: movesOpacity ? parseAlphaFromHexa(picked.slice(HEXA_ALPHA_START, HEXA_LENGTH)) : chosenOpacity,
            movesOpacity,
        };
    };

    /**
     * Take a color from the picker, splitting off its alpha channel. One onChange for the whole
     * gesture, after both halves are settled: two separate callbacks inside one React batch
     * would each rebuild a controlled consumer's state from the same stale snapshot.
     * @param picked - `#RRGGBBAA`, or `#RRGGBB` when the picker carries no alpha
     */
    const handlePickerChange = (picked: string): void => {
        const { nextColor, nextOpacity, movesOpacity } = splitPicked(picked);
        setChosenColor(nextColor);
        if (movesOpacity) {
            setChosenOpacity(nextOpacity);
        }
        onChange?.(nextColor, nextOpacity);
    };

    const handlePickerChangeEnd = (picked: string): void => {
        const { nextColor, nextOpacity } = splitPicked(picked);
        onChangeEnd?.(nextColor, nextOpacity);
    };

    /**
     * Commit what was typed into the hex box: six (or three) hex digits or a color's name.
     * Words that name no color are refused: the box goes back to its value, as Figma's does, and
     * says so aloud.
     * While nothing is chosen, Enter on the color shown, or typing exactly it, chooses it: the
     * reader can set the starting color on purpose. Leaving an untouched box chooses nothing.
     * @param event - the blur or Enter that ended the edit
     * @param byEnter - Enter ended it: the color shown is chosen
     */
    const commitHex = (event: React.SyntheticEvent, byEnter = false): void => {
        const typed = hexDraft.trim();
        const candidate = typedColor(typed);
        const choosesShown = isColorDefault && (byEnter || typedHere.current);
        typedHere.current = false;

        // Under empty words, typing the default color is a choice of its own, not "no change".
        const changed = candidate !== displayColor.toUpperCase() || shownHex === "" || choosesShown;
        if (candidate !== undefined && changed) {
            setRefusal(undefined);
            // Choosing the color already shown leaves the box's value as it was, so the box is
            // given it here: no redraw would replace the typed words.
            setHexDraft(candidate.replace("#", "").toUpperCase());
            setChosenColor(candidate, event);
            onChange?.(candidate, chosenOpacity, event);
            onChangeEnd?.(candidate, chosenOpacity, event);
        } else if (candidate === undefined && typed !== "" && hexDraft !== shownHex) {
            setRefusal({
                message: labels.colorRefusedKept(typed, shownHex === "" ? (emptyWords ?? "") : shownHex),
            });
            setHexDraft(shownHex);
        } else {
            setRefusal(undefined);
            setHexDraft(shownHex);
        }
    };

    const commitOpacity = (next: number, event?: React.SyntheticEvent): void => {
        setChosenOpacity(next, event);
        onChange?.(chosenColor, next, event);
        onChangeEnd?.(chosenColor, next, event);
    };

    /**
     * Give the color, and the opacity when it is shown, back to their defaults. With no opacity
     * box the reader's opacity is untouched and reported back as it stands.
     * @param event - the click
     */
    const handleReset = (event: React.MouseEvent<HTMLButtonElement>): void => {
        setChosenColor(undefined, event);
        if (showOpacity) {
            setChosenOpacity(undefined, event);
        }
        onChange?.(undefined, showOpacity ? undefined : chosenOpacity, event);
        onChangeEnd?.(undefined, showOpacity ? undefined : chosenOpacity, event);
    };

    const hexaValue = `${displayColor}${opacityToAlphaHex(displayOpacity)}`.toUpperCase();

    const pickerPanel = (
        <Popout.Panel
            width={PANEL_GRID.POPOVER_WIDTH}
            header={{ variant: "title", title: label ?? labels.colorPanelTitle }}
        >
            <ColorPickerPanel
                value={hexaValue}
                onChange={handlePickerChange}
                onChangeEnd={handlePickerChangeEnd}
                withAlpha={showOpacity}
                swatches={swatches}
                labels={{ colorWord: labels.colorWord }}
            />
        </Popout.Panel>
    );

    const chitColor = showOpacity ? hexaValue : displayColor;

    if (variant === "chip") {
        return (
            <ColorChip
                labels={labels}
                name={name}
                reading={reading}
                isColorDefault={isColorDefault}
                emptyText={emptyText}
                emptySwatch={emptySwatch}
                displayColor={displayColor}
                valueText={valueText}
                chitColor={chitColor}
                annotation={annotation}
                disabled={disabled}
                pickerPanel={pickerPanel}
            />
        );
    }

    // No color in force and none chosen: an empty swatch, never one that shows a color nothing draws.
    const emptyField = emptySwatch && !showsMixed && isColorDefault;
    const unlabeled = label === undefined || hideLabel;
    const controls = (
        <div
            className="cm-paint"
            data-testid="compact-color-input"
            // The tooltip belongs to the outermost element only, so one hover matches one title.
            title={unlabeled ? annotation.title : undefined}
            data-disabled={disabled ? "true" : undefined}
        >
            <div
                className="cm-paint-field"
                data-testid="compact-color-input-field"
                data-disabled={disabled || undefined}
                data-mixed={showsMixed || undefined}
                style={{ width }}
            >
                {/* Mixed has no color in force, so no swatch is drawn: the field holds the word
                    alone, and typing a color replaces it (Figma's mixed fill). */}
                {/* Mixed has no color in force, so its swatch is a dash in an outline, which cannot
                    be taken for a color; it still opens the picker (Figma's mixed fill). */}
                <Popout>
                    <Popout.Trigger>
                        <button
                            type="button"
                            className="cm-paint-chit"
                            data-testid="compact-color-input-swatch"
                            data-mixed={showsMixed || undefined}
                            data-empty={emptyField || undefined}
                            disabled={disabled}
                            aria-label={swatchName}
                            aria-describedby={annotation.describedBy}
                        >
                            <SwatchFace showsMixed={showsMixed} empty={emptyField} color={chitColor} />
                        </button>
                    </Popout.Trigger>
                    {pickerPanel}
                </Popout>

                <input
                    ref={hexRef}
                    className="cm-paint-input cm-paint-hex"
                    type="text"
                    autoComplete="off"
                    spellCheck={false}
                    data-testid="compact-color-input-hex"
                    data-is-default={isColorDefault ? "true" : "false"}
                    // An unset color's words are already in its state ("drawn #6366F1 indigo").
                    aria-label={[hexName, hexState, reading.wordsInState ? undefined : valueText]
                        .filter((part) => part !== undefined && part !== "")
                        .join(", ")}
                    // Marks a box that holds its committed value and no typing of its own, so an
                    // application's Undo key can take back the last change rather than the box's
                    // empty native undo.
                    data-committed={hexDraft === shownHex || undefined}
                    aria-describedby={annotation.describedBy}
                    disabled={disabled}
                    value={hexDraft}
                    placeholder={emptyWords}
                    onChange={(event) => {
                        selectOnRedraw.current = false;
                        setRefusal(undefined);
                        setDiscarded("");
                        typedHere.current = true;
                        setHexDraft(event.currentTarget.value);
                    }}
                    onMouseDown={(event) => {
                        // A box showing its value takes a click as "replace this": the whole value
                        // is selected, focused or not, so what is typed next is not glued to it.
                        // A box holding typing keeps the click's caret, to edit that typing.
                        if (event.button === 0 && hexDraft === shownHex) {
                            event.preventDefault();
                            event.currentTarget.focus();
                            event.currentTarget.select();
                        }
                    }}
                    onFocus={(event) => {
                        event.currentTarget.select();
                        onFocus?.(event);
                    }}
                    onBlur={(event) => {
                        selectOnRedraw.current = false;
                        setDiscarded("");
                        commitHex(event);
                        onBlur?.(event);
                    }}
                    onKeyDown={(event) => {
                        if (event.key === "Enter") {
                            selectOnRedraw.current = true;
                            commitHex(event, true);
                            event.currentTarget.select();
                        } else if (event.key === "Escape") {
                            typedHere.current = false;
                            setRefusal(undefined);
                            if (hexDraft !== shownHex) {
                                setDiscarded(
                                    labels.colorEditDiscarded(shownHex === "" ? (emptyWords ?? "") : shownHex),
                                );
                            }
                            revertOnEscape(
                                event,
                                () => {
                                    setHexDraft(shownHex);
                                },
                                hexDraft !== shownHex,
                            );
                        }
                    }}
                />

                {showOpacity && (
                    <OpacityInput
                        value={displayOpacity}
                        onCommit={commitOpacity}
                        ariaLabel={opacityName}
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
            <ResetButton
                show={showReset}
                isDefault={isColorDefault && (!showOpacity || isOpacityDefault)}
                name={label ?? labels.colorGenericName}
                labels={labels}
                disabled={disabled}
                onReset={handleReset}
            />

            <DiscardNote text={refusal?.message ?? discarded} />

            <AnnotationDescription annotation={annotation} />
        </div>
    );

    if (unlabeled) {
        return controls;
    }

    return (
        <fieldset
            data-testid="compact-color-input-labeled"
            className="cm-fieldset cm-paint-labeled"
            aria-labelledby={labelId}
            title={annotation.title}
        >
            <div id={labelId} data-testid="compact-color-input-label" className="cm-paint-label">
                {label}
            </div>
            {controls}
        </fieldset>
    );
}
