import { Box, Text, VisuallyHidden } from "@mantine/core";
import React, { useId } from "react";

import { PANEL_GRID, PANEL_INK } from "../../constants/panel";
import { useLabels } from "../../i18n";
import { FieldGlyph } from "../../icons";
import type { ActivationHandler } from "../../types/events";
import { liveRegionProps,type LiveSetting } from "../../utils/live-region";
import { mirrorInline, useDirection } from "../../utils/rtl";
import { AdvancedButton, holdsSomething, TrailingSlot } from "./TrailingSlot";

/**
 * The gap between an endpoint value and the drawing it brackets, in pixels.
 */
// The trailing slot still sits at PANEL_GRID.TRAIL_GAP from the body: the slot
// wrapper adds the remaining 4px back as an inline-start margin, so the row
// still ends on the 16 + 108 + 8 + 108 + 8 + 24 + 8 = 280 grid.
const INLINE_GAP = 4;

/**
 * The height of the short end of the size wedge, in pixels.
 */
// The wedge is the size mapping drawn at row size: WEDGE_MIN_HEIGHT at the
// inline start, the full PANEL_GRID.GLYPH at the inline end. Those two heights
// are the smallest and the largest size the mapping produces, which is why the
// row needs no sentence to say so.
const WEDGE_MIN_HEIGHT = 4;

/**
 * The wedge, as a clip on the drawing: 4px tall at one end, 14px at the other,
 * with the two ends joined along the baseline.
 */
// Written left to right and mirrored as a whole under right-to-left text; see
// mirrorInline in ../../utils/rtl for why a polygon cannot be expressed in
// logical terms.
const WEDGE_CLIP_PATH = `polygon(0 calc(100% - ${WEDGE_MIN_HEIGHT}px), 100% 0, 100% 100%, 0 100%)`;

/**
 * The narrowest the drawing may be squeezed before it stops reading as a ramp,
 * in pixels.
 *
 * In a 280px panel the two values and the trailing slot leave more than this,
 * so it only takes effect when a ramp is placed somewhere narrower.
 */
const RAMP_MIN_WIDTH = 120;

/**
 * The gradient the colour form draws when the caller supplies none.
 *
 * It runs from the panel's own field surface to its accent colour, so a ramp
 * with no palette of its own is still a picture of a range and still reads in
 * both the light and the dark colour scheme.
 */
// Written "to right" and mirrored as a whole under right-to-left text, the same
// way a caller's own gradient is. Flipping the keyword here as well would flip
// the default gradient twice.
const DEFAULT_GRADIENT = `linear-gradient(to right, ${PANEL_INK.SURFACE}, ${PANEL_INK.ACCENT})`;

/**
 * The transform a ramp applies between its two endpoints.
 *
 * - `"sqrt"` -- the square root of the value
 * - `"linear"` -- the value itself
 * - `"log"` -- the logarithm of the value
 */
type RampScale = "sqrt" | "linear" | "log";

/**
 * The three curve glyphs, which are also the three keys their words are
 * translated under.
 */
type ScaleCurve = "scaleSqrt" | "scaleLinear" | "scaleLog";

/**
 * The curve drawn for each transform.
 */
// One record serves two purposes: the value is the name of the glyph in the
// icon set and the key of the word in the label set, which are deliberately
// spelled the same. The word is never drawn on the row -- it is the glyph's
// tooltip and part of the drawing's accessible name.
const SCALE_CURVES: Record<RampScale, ScaleCurve> = {
    sqrt: "scaleSqrt",
    linear: "scaleLinear",
    log: "scaleLog",
};

/**
 * The two endpoint values: small, secondary, and nothing else.
 */
// Never wrapped and never truncated. A truncated number is a wrong number, so
// where a translation makes the pair longer -- a grouped thousands separator, a
// unit written out -- the drawing gives up width down to RAMP_MIN_WIDTH and the
// row grows after that, rather than the values losing digits. This is why
// neither endpoint needs the reachable-full-text treatment that an ellipsising
// element does.
const ENDPOINT_STYLE: React.CSSProperties = {
    flex: "0 0 auto",
    lineHeight: 1,
    color: PANEL_INK.CHROME,
    whiteSpace: "nowrap",
};

/**
 * Props for the RampRow component.
 */
export interface RampRowProps {
    /**
     * The value at the low end of the range.
     *
     * Any node is accepted, so a value can bring its own unit or emphasis.
     * Format numbers for the reader's locale before passing them in; this
     * library's `useNumberFormatter` hook does that.
     */
    min: React.ReactNode;
    /**
     * The value at the high end of the range.
     *
     * Any node is accepted, so a value can bring its own unit or emphasis.
     * Format numbers for the reader's locale before passing them in; this
     * library's `useNumberFormatter` hook does that.
     */
    max: React.ReactNode;
    /**
     * Names what the ramp maps, such as `"Node size by age"`.
     *
     * It is never drawn, and it is the difference between a screen reader
     * announcing "Node size by age 45 68 Square root scale" and announcing
     * "45 68". Supply it on every ramp a reader is meant to understand on its
     * own; leave it out only where a heading immediately above already says
     * what is mapped.
     *
     * Pass a fuller phrase -- `"Node size, 45 to 68"` -- when you want to
     * control the wording of the announcement exactly. This is already your own
     * text, so translate it yourself; the transform's word is translated for
     * you.
     */
    label?: string;
    /**
     * Which drawing the row makes of its range.
     *
     * - `"size"` -- a wedge that grows from the low value to the high one,
     *   drawn in the secondary text colour. Its two ends are the smallest and
     *   the largest size the mapping produces.
     * - `"color"` -- a bar painted with `gradient`, so the ramp on the panel is
     *   the ramp on the picture it describes.
     * @default "size"
     */
    variant?: "size" | "color";
    /**
     * A CSS gradient for the colour form, such as
     * `"linear-gradient(to right, #123, #abc)"`.
     *
     * Write it as though text ran left to right; the drawing is mirrored for
     * you where text runs right to left, so it always runs from the low value
     * to the high one. The size form ignores it.
     */
    gradient?: string;
    /**
     * The transform between the two values, drawn as a small curve at the end
     * of the row.
     *
     * The curve's word -- "Square root scale", "Linear scale", "Logarithmic
     * scale" -- is never drawn. It is the curve's tooltip and part of the
     * drawing's accessible name, and it comes from this library's own strings,
     * so wrapping your app in `LabelsProvider` translates it. A ramp that names
     * no transform leaves the slot empty unless `trailing` fills it.
     */
    scale?: RampScale;
    /**
     * Whether what this shows is still being worked out by something that
     * finishes later, such as a background computation.
     *
     * Supplying it at all -- `busy={isRunning}`, true or false -- is how you
     * say the content arrives late, and that is what makes this a live region a
     * screen reader announces. Pass it for the whole life of the component
     * rather than only while the run is in flight: a live region has to be in
     * the document before the change it announces, so one that gains the prop
     * at the same moment it gains its values announces nothing.
     *
     * While it is true the surface is marked busy, which holds the announcement
     * back until the run finishes, so a reader hears the result once instead of
     * hearing every frame of it. Leave it out for content the reader set
     * themselves, which needs no announcement and gets none.
     */
    busy?: boolean;
    /**
     * How urgently a screen reader announces this when it changes on its own.
     *
     * Defaults to `"polite"` when `busy` is given and `"off"` when it is not,
     * which is the right answer nearly always. Raise it to `"assertive"`, which
     * interrupts whatever is being read, only for a failure; lower it to
     * `"off"` to mark a surface busy without announcing it.
     */
    live?: LiveSetting;
    /**
     * Called when the curve is activated, which turns it into a button offering
     * the choice of the three transforms.
     *
     * Without it the curve is a picture that reports which transform is in
     * force: it is not focusable and it is not announced separately, because
     * its word is already in the drawing's name. With it the curve is a real
     * button, reachable by Tab and activated by Enter or Space.
     *
     * The event is passed through, so modifier keys, `preventDefault` and the
     * activated element are all available; it is a mouse event for a pointer
     * activation and a keyboard event for a key one.
     */
    onScaleClick?: ActivationHandler;
    /**
     * Puts your own control at the end of the row in place of the curve.
     *
     * Use it for a button that opens the range and the transform together. The
     * slot keeps its width whether or not it holds anything, so a row with no
     * control still ends level with a row that has one.
     *
     * `undefined`, `null` and `false` all mean "nothing of my own", so the
     * common conditional form `trailing={hasChanges && <AdvancedButton ... />}`
     * falls back to the curve rather than emptying the slot. Replacing the
     * curve does not remove the transform from the drawing's accessible name:
     * the mapping is still in force, so it is still announced.
     */
    trailing?: React.ReactNode;
}

// Accessibility. There is no APG *widget* pattern for a ramp, because a ramp is
// a picture and not a widget; the applicable guidance is the ARIA `img` role
// plus the APG practice "Providing Accessible Names and Descriptions", and the
// same reading ChartRow follows for the three chart rows.
//
// The whole drawing -- the two values and the shape between them -- is ONE
// role="img" whose accessible name is composed by aria-labelledby from the
// parts already on the row: the caller's phrase, the low value, the high value
// and the transform's word. Composing by reference rather than by string is
// what lets the values stay React nodes and what keeps the name in the reader's
// own language, since every part is either the caller's own content or an entry
// in the label set. Before this the row was two loose numbers and a shape, and
// announced no more than "45 68".
//
// The shape itself is a mark of that image and is aria-hidden, as is the curve
// glyph while it is only reporting the transform. The curve becomes a control
// only when onScaleClick is given, at which point it is a real <button> and
// follows the APG "Button" pattern -- Enter and Space, focus order, a 24x24
// target that meets WCAG 2.2 (2.5.8, Target Size) -- and carries its own name.
//
// There is deliberately no visually hidden table of values here, which is what
// a chart with a series gets: a ramp has exactly two values and they are
// already the accessible name.
//
// `busy` makes the drawing a polite live region (WCAG 4.1.3, Status Messages),
// so a range filled in by a background run is announced once when it settles.
// The region is opt-in rather than always on, because a ramp is as often a
// static legend as it is a reading, and a legend that announces itself is
// noise.

/**
 * A row that draws a range: two values with the mapping between them drawn
 * in-line, and no sentence anywhere.
 *
 * One ramp row says what "Age 45 to 68 maps to sizes 1.0 to 2.0, square root
 * scale" says, in the height of a single row. The two values are the ends of
 * the range, the drawing between them is the mapping, and the small curve at
 * the end of the row is the transform. Putting a caption above it or a reading
 * below it spends the lines the row exists to save.
 *
 * Two forms share one layout:
 *
 * - **size** -- a wedge that grows from the low value to the high one. Its two
 *   ends are the smallest and the largest size the mapping produces.
 * - **color** -- a bar painted with your own gradient, so the ramp on the panel
 *   is the ramp on the picture it describes.
 *
 * The drawing always runs from the low value to the high one, in both text
 * directions. Where text runs right to left the values swap ends and the
 * drawing is mirrored to follow them, including a gradient you supplied
 * yourself, so a ramp never contradicts the values on either side of it. Set
 * the direction with Mantine's own `DirectionProvider`; this row reads it from
 * there and needs nothing else.
 *
 * A screen reader gets the whole row as one image. Give `label` a phrase naming
 * what is mapped -- it is never drawn, and it is what turns that image's name
 * from two bare numbers into something a reader can use. Format the two values
 * for the reader's locale before passing them in; the transform's word is
 * translated for you through `LabelsProvider`.
 * @param props - Component props
 * @param props.min - The value at the low end of the range
 * @param props.max - The value at the high end of the range
 * @param props.label - Names what the ramp maps; never drawn, and read first in the drawing's accessible name
 * @param props.variant - Which drawing the row makes of its range: a growing wedge or a colour bar
 * @param props.gradient - A CSS gradient for the colour form, written as though text ran left to right
 * @param props.scale - The transform between the two values, drawn as a small curve at the end of the row
 * @param props.busy - Whether the values are still being worked out by something that finishes later
 * @param props.live - How urgently a screen reader announces the drawing when it changes on its own
 * @param props.onScaleClick - Called when the curve is activated, which turns it into a button offering the three transforms
 * @param props.trailing - Your own control at the end of the row, in place of the curve
 * @returns The ramp row
 * @example
 * ```tsx
 * <RampRow label="Node size by age" min="45" max="68" scale="sqrt" />
 * ```
 * @example
 * A colour ramp filled in by a background run, whose curve opens a chooser.
 * ```tsx
 * const format = useNumberFormatter({maximumFractionDigits: 2});
 *
 * <RampRow
 *     label="Node color by betweenness"
 *     min={format.format(range.low)}
 *     max={format.format(range.high)}
 *     variant="color"
 *     gradient="linear-gradient(to right, #1f2428, #4a7ee8)"
 *     scale="linear"
 *     busy={isRunning}
 *     onScaleClick={(event) => { openScaleMenu(event.currentTarget); }}
 * />
 * ```
 */
export function RampRow({
    min,
    max,
    label,
    variant = "size",
    gradient,
    scale,
    busy,
    live,
    onScaleClick,
    trailing,
}: RampRowProps): React.JSX.Element {
    const labels = useLabels();
    const direction = useDirection();
    const baseId = useId();

    const isColour = variant === "color";
    const curve = scale === undefined ? undefined : SCALE_CURVES[scale];
    const scaleName = curve === undefined ? undefined : labels[curve];

    const labelId = `${baseId}-label`;
    const minId = `${baseId}-min`;
    const maxId = `${baseId}-max`;
    const scaleId = `${baseId}-scale`;

    // The accessible name of the drawing, composed from the parts on the row
    // rather than written out: the values are the caller's own nodes and the
    // transform's word comes from the label set, so the name is already in the
    // reader's language without this component assembling a sentence.
    const nameParts = [
        label === undefined ? undefined : labelId,
        minId,
        maxId,
        scaleName === undefined ? undefined : scaleId,
    ].filter((part): part is string => part !== undefined);

    // The curve: a button when it opens the choice of three transforms, and a
    // mark of the drawing when it only reports which one is in force. As a mark
    // it is hidden from assistive technology, because its word is already in
    // the drawing's accessible name; it keeps its tooltip for a pointer.
    let scaleGlyph: React.ReactNode = null;
    if (curve !== undefined && scaleName !== undefined) {
        if (onScaleClick === undefined) {
            scaleGlyph = (
                <Box
                    data-testid="ramp-row-scale"
                    aria-hidden="true"
                    title={scaleName}
                    style={{
                        flex: "0 0 auto",
                        width: PANEL_GRID.TRAIL,
                        height: PANEL_GRID.CONTROL_HEIGHT,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: PANEL_INK.CHROME,
                    }}
                >
                    <FieldGlyph name={curve} />
                </Box>
            );
        } else {
            // Never marked as changed: the advanced settings button reports a
            // hidden setting that is no longer at its default, and a ramp's
            // transform is drawn on the row rather than hidden behind the
            // button, so there is nothing for that signal to report.
            scaleGlyph = (
                <AdvancedButton label={scaleName} icon={<FieldGlyph name={curve} />} onClick={onScaleClick} />
            );
        }
    }

    // `false` is how a caller writes a conditional trailing control, so it has
    // to fall back to the curve rather than emptying the slot.
    const slotContent = holdsSomething(trailing) ? trailing : scaleGlyph;

    return (
        <Box
            data-testid="ramp-row"
            data-variant={variant}
            data-scale={scale}
            style={{
                display: "flex",
                alignItems: "center",
                gap: INLINE_GAP,
                height: PANEL_GRID.ROW_PITCH,
            }}
        >
            <Box
                data-testid="ramp-row-figure"
                role="img"
                aria-labelledby={nameParts.join(" ")}
                {...liveRegionProps(live, busy)}
                style={{
                    flex: "1 1 auto",
                    minWidth: 0,
                    display: "flex",
                    alignItems: "center",
                    gap: INLINE_GAP,
                }}
            >
                {label !== undefined && (
                    <VisuallyHidden data-testid="ramp-row-a11y-label" id={labelId}>
                        {label}
                    </VisuallyHidden>
                )}

                <Text span size="sm" id={minId} data-testid="ramp-row-min" style={ENDPOINT_STYLE}>
                    {min}
                </Text>

                {/* The mapping, drawn. A mark of the image around it, so it is
                    hidden from assistive technology; mirrored where text runs
                    right to left so that it still runs from the low value to
                    the high one, which neither a clip-path polygon nor a
                    caller's gradient string can express in logical terms.

                    One mirror covers both. Flipping the gradient keyword as
                    well as mirroring the box would flip the colour form twice
                    and leave it running the wrong way again, which is why
                    inlineGradientDirection is deliberately not used here.

                    minWidth and height stay physical. Their logical spellings
                    -- min-inline-size and block-size -- differ only in a
                    vertical writing mode, which a 280px panel laid out on a
                    32px row pitch does not have, and every other row in this
                    library measures itself the same way. */}
                <Box
                    data-testid="ramp-row-ramp"
                    data-variant={variant}
                    aria-hidden="true"
                    style={{
                        flex: "1 1 auto",
                        minWidth: RAMP_MIN_WIDTH,
                        height: PANEL_GRID.GLYPH,
                        boxSizing: "border-box",
                        background: isColour ? (gradient ?? DEFAULT_GRADIENT) : PANEL_INK.CHROME,
                        borderRadius: isColour ? "var(--mantine-radius-xs)" : undefined,
                        border: isColour ? `1px solid ${PANEL_INK.BORDER}` : undefined,
                        clipPath: isColour ? undefined : WEDGE_CLIP_PATH,
                        ...mirrorInline(direction),
                    }}
                />

                <Text span size="sm" id={maxId} data-testid="ramp-row-max" style={ENDPOINT_STYLE}>
                    {max}
                </Text>

                {scaleName !== undefined && (
                    <VisuallyHidden data-testid="ramp-row-a11y-scale" id={scaleId}>
                        {scaleName}
                    </VisuallyHidden>
                )}
            </Box>

            {/* The 4px row gap plus this 4px margin is the 8px the grid puts
                between the body of a row and its trailing slot. */}
            <Box
                style={{
                    flex: "0 0 auto",
                    display: "flex",
                    marginInlineStart: PANEL_GRID.TRAIL_GAP - INLINE_GAP,
                }}
            >
                <TrailingSlot>{slotContent}</TrailingSlot>
            </Box>
        </Box>
    );
}
