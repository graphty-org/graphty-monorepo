import { Box, UnstyledButton, VisuallyHidden } from "@mantine/core";
import React from "react";

import { PANEL_GRID, PANEL_INK } from "../../constants/panel";
import { usePanelLabels } from "../../context/PanelLabelsContext";
import { FieldGlyph, type FieldGlyphName, type FieldLetter, isFieldGlyphName, isFieldLetter } from "../../icons";
import type { ActivationHandler } from "../../types/events";
import { useDevWarning } from "../../utils/dev-warning";
import { liveRegionProps, type LiveSetting, resolveLive } from "../../utils/live-region";
import { TrailingSlot } from "./TrailingSlot";

// ARIA Authoring Practices patterns followed here:
//
//   - read-only form (no onClick): no APG widget pattern applies, because the
//     row is content rather than a control. It is a WAI-ARIA `group` with an
//     accessible name, which is the container role for "these values belong
//     together". Nothing inside it is focusable, so nothing enters the tab
//     order.
//   - interactive form (onClick supplied): the APG Button pattern,
//     https://www.w3.org/WAI/ARIA/apg/patterns/button/, implemented with a real
//     <button> so Enter, Space, the focus ring and the disabled semantics come
//     from the platform rather than from hand-written key handling. The
//     button's accessible name is computed from its content -- the row's name
//     plus every segment's value -- never from an aria-label, which would hide
//     the values it is meant to announce (contract section 3, the defect that
//     ships in PanelField today).
//
// The box is 224x24 or 108x24, so it clears the 24x24 minimum of WCAG 2.2
// 2.5.8 (target size) in its interactive form.
//
// Contract section 3 also asks for aria-live wherever content arrives
// asynchronously, which for this row is a compound whose values are filled in
// by a background algorithm run -- a graph's node and edge counts, say. The
// live region is opt-in through `busy`, because the far commoner compound is
// one the reader set themselves and does not want read back at them.
//
// Contract section 4 names this row as one of the four that are pure layout and
// must NOT be rebased onto a Mantine widget: there is no Mantine component
// whose anatomy is "two or three values sharing one surface", and Group or
// SimpleGrid would put a gutter where the whole point is a hairline. What the
// row does take from Mantine is its primitives -- Box, UnstyledButton and
// VisuallyHidden -- and its theme tokens.
//
// Contract section 2.3, logical properties: every inline-axis measurement here
// is written logically (paddingInline, marginInlineStart, textAlign "start"),
// and flex row order follows `dir` on its own. The two physical properties left
// are the hairline's width and every element's height, neither of which is
// directional: they would only change under a vertical writing mode, which the
// 24px control height and 32px row pitch of the panel grid rule out. Nothing
// here is drawn in absolute coordinates, so this row needs no help from
// useDirection().

/**
 * The padding on each inline edge of one segment.
 *
 * Derived rather than typed, exactly as `PanelField` derives it: the 16px glyph
 * slot plus this padding is `PANEL_GRID.VALUE_INSET`, so a compound row's
 * leading value starts on the same line as the value of every other row in the
 * panel.
 */
const SEGMENT_PADDING_X = PANEL_GRID.VALUE_INSET - PANEL_GRID.GLYPH_SLOT;

/**
 * The gap between a value and its unit suffix inside one segment.
 *
 * Tighter than the gap a `PanelField` spends, because a segment is already
 * fenced by a hairline and does not need the air.
 */
const UNIT_GAP = 2;

/**
 * The width of the divider between two segments. One pixel of panel
 * background, and nothing else: it is a hairline, never a gutter.
 */
const HAIRLINE = 1;

/**
 * The fewest values that make a compound. One value is a `PanelField`.
 */
const MIN_SEGMENTS = 2;

/**
 * The most values one box can carry before the reader stops seeing one control.
 */
const MAX_SEGMENTS = 3;

/**
 * One value inside a compound row's single box.
 */
export interface CompoundSegment {
    /**
     * A glyph name, a single capital letter, or your own node -- a colour
     * swatch, say -- drawn in this segment's leading 16px slot.
     *
     * A plain string is deliberately not accepted: a loose word in the slot
     * would be a label smuggled into a space meant for a drawing. A segment
     * with no glyph draws no slot at all, which is what lets a trailing segment
     * sit tight against its hairline.
     */
    glyph?: FieldGlyphName | FieldLetter | Exclude<React.ReactNode, string>;
    /**
     * The value shown in this segment.
     *
     * Format it before passing it in -- with `useNumberFormatter` for the
     * reader's own locale -- because the row draws whatever it is given.
     */
    value: React.ReactNode;
    /**
     * The complete text of the value, for when what you draw is shortened or is
     * not text at all.
     *
     * A segment is narrow and its value is clipped with an ellipsis when it
     * does not fit, which leaves a reader with no way to see the rest. Supply
     * this and the full text becomes the segment's tooltip and the text a
     * screen reader announces in place of the drawn value. Leave it out when
     * `value` is already a complete string or number, which is the common case:
     * the full text is then taken from the value itself.
     * @example
     * ```tsx
     * {value: "graph-2f9a...", fullValue: "graph-2f9a41c6-88b0-4f2e-9a17-3d5c", mono: true}
     * ```
     */
    fullValue?: string;
    /** Dimmed suffix drawn immediately after the value, inside the same segment, such as a percent sign. */
    unit?: string;
    /** Draw the value in the monospace face. For hex colours, identifiers and anything read character by character. */
    mono?: boolean;
    /** This segment takes the box's remaining width. Exactly one segment should set it, and it should be the main value. */
    grow?: boolean;
}

/**
 * Props for the CompoundRow component.
 */
export interface CompoundRowProps {
    /** Names the one thing the segments belong to. Becomes the box's tooltip and part of its accessible name. */
    label: string;
    /** Two or three values that belong to one thing. For two unrelated values, use a `FieldRow` pair instead. */
    segments: CompoundSegment[];
    /**
     * The width of the box in pixels.
     *
     * `PANEL_GRID.BODY` (224) fills the row and still leaves room for the
     * trailing control; `PANEL_GRID.FIELD` (108) is half a row, for a box that
     * sits beside another control. Ignored while the "show labels on controls"
     * preference is on, when the box fills whatever the label column leaves.
     */
    width?: typeof PANEL_GRID.FIELD | typeof PANEL_GRID.BODY;
    /** The 24px trailing control: an advanced settings button, a reset, or nothing. */
    trailing?: React.ReactNode;
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
     * Called when the box is activated, which turns it into a button.
     *
     * Leave it out and the box is a group of read-only values that never enters
     * the tab order. Supply it and the box becomes a real button: it takes
     * focus, draws a focus ring, and activates on click, on Enter and on Space.
     *
     * The event is passed through so you can read modifier keys, call
     * `preventDefault`, or find what was activated. Each segment carries a
     * `data-segment-index` attribute, so
     * `(event.target as Element).closest("[data-segment-index]")` tells you
     * which value the pointer landed on when that matters.
     * @example
     * ```tsx
     * <CompoundRow
     *     label="Node colour and opacity"
     *     segments={segments}
     *     onClick={(event) => { openColourEditor({addToSelection: event.shiftKey}); }}
     * />
     * ```
     */
    onClick?: ActivationHandler;
    /** Called when focus enters the box. Forwarded untouched. */
    onFocus?: React.FocusEventHandler<HTMLElement>;
    /** Called when focus leaves the box. Forwarded untouched. */
    onBlur?: React.FocusEventHandler<HTMLElement>;
}

/**
 * Props for the internal segment renderer.
 */
interface CompoundSegmentBoxProps {
    /** The value, glyph, unit and face this segment draws. */
    segment: CompoundSegment;
    /** Whether this is the segment that takes the box's remaining width. */
    grow: boolean;
    /** This segment's position in the row, counting from zero, published as `data-segment-index`. */
    index: number;
}

/**
 * Works out the complete text of one segment's value.
 *
 * The drawn value is clipped with an ellipsis when it does not fit, so the full
 * text has to be reachable some other way. It comes from `fullValue` when the
 * caller supplied one, and otherwise from the value itself when that is a
 * string or a number. A value drawn as a node -- a swatch, an icon -- has no
 * text of its own, so it has none here either.
 * @param segment - The segment to read
 * @returns The complete text, or undefined when the segment has none
 */
function segmentFullText(segment: CompoundSegment): string | undefined {
    if (segment.fullValue !== undefined) {
        return segment.fullValue;
    }

    if (typeof segment.value === "string") {
        return segment.value;
    }

    if (typeof segment.value === "number") {
        return String(segment.value);
    }

    return undefined;
}

/**
 * One segment of a compound row: a glyph slot, a value and an optional unit.
 *
 * A segment is deliberately not a `PanelField`. A field paints its own surface,
 * its own corner radius and its own padding; the whole point of a compound row
 * is that the values share one surface and one radius, so a field nested here
 * would draw a box inside a box and the row would stop reading as one control.
 * @param props - Component props
 * @param props.segment - The value, glyph, unit and face this segment draws
 * @param props.grow - Whether this is the segment that takes the box's remaining width
 * @param props.index - This segment's position in the row, counting from zero
 * @returns The segment
 */
function CompoundSegmentBox({ segment, grow, index }: CompoundSegmentBoxProps): React.JSX.Element {
    const { glyph, value, unit, mono = false } = segment;

    let slotContent: React.ReactNode = null;
    if (isFieldGlyphName(glyph)) {
        slotContent = <FieldGlyph name={glyph} />;
    } else if (isFieldLetter(glyph)) {
        slotContent = (
            <Box
                component="span"
                data-letter={glyph}
                style={{
                    fontSize: "var(--mantine-font-size-sm)",
                    lineHeight: 1,
                }}
            >
                {glyph}
            </Box>
        );
    } else if (glyph !== undefined && glyph !== null) {
        slotContent = glyph;
    }

    // Contract section 2.4, text expansion. The drawn value is clipped, and a
    // title alone is unreachable by keyboard and touch, so the complete text
    // also goes into the accessibility tree: either it is already there as the
    // element's own text, or fullValue puts it there and the clipped drawing
    // steps out of the way.
    const fullText = segmentFullText(segment);
    const fullTextReplacesDrawing = segment.fullValue !== undefined;

    return (
        <Box
            data-testid="compound-segment"
            data-segment-index={index}
            data-grow={grow ? "true" : "false"}
            style={{
                display: "flex",
                alignItems: "center",
                boxSizing: "border-box",
                flex: grow ? "1 1 auto" : "0 0 auto",
                minWidth: 0,
                height: PANEL_GRID.CONTROL_HEIGHT,
                paddingBlock: 0,
                paddingInline: SEGMENT_PADDING_X,
            }}
        >
            {slotContent !== null && (
                <Box
                    data-testid="compound-segment-slot"
                    style={{
                        flex: "0 0 auto",
                        width: PANEL_GRID.GLYPH_SLOT,
                        height: PANEL_GRID.GLYPH_SLOT,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: PANEL_INK.CHROME,
                    }}
                >
                    {slotContent}
                </Box>
            )}

            <Box
                component="span"
                data-testid="compound-segment-value"
                data-mono={mono ? "true" : "false"}
                title={fullText}
                aria-hidden={fullTextReplacesDrawing ? true : undefined}
                style={{
                    flex: grow ? "1 1 auto" : "0 0 auto",
                    minWidth: 0,
                    fontFamily: mono ? "var(--mantine-font-family-monospace)" : undefined,
                    fontSize: "var(--mantine-font-size-sm)",
                    lineHeight: 1,
                    color: PANEL_INK.VALUE,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    // A hex colour or an identifier is a run of Latin text that
                    // must not be reordered by the right-to-left paragraph
                    // around it, and a value must not merge with its neighbour
                    // across the hairline.
                    unicodeBidi: "isolate",
                }}
            >
                {value}
            </Box>

            {fullTextReplacesDrawing && <VisuallyHidden>{segment.fullValue}</VisuallyHidden>}

            {unit !== undefined && (
                <Box
                    component="span"
                    data-testid="compound-segment-unit"
                    style={{
                        flex: "0 0 auto",
                        marginInlineStart: UNIT_GAP,
                        fontSize: "var(--mantine-font-size-sm)",
                        lineHeight: 1,
                        color: PANEL_INK.CHROME,
                    }}
                >
                    {unit}
                </Box>
            )}
        </Box>
    );
}

/**
 * States what is wrong with the number of segments a row was given, in
 * development builds only.
 *
 * Four values is a table rather than a compound, and one value is a field.
 * @param label - The row's label, so the message names the offending row
 * @param count - How many segments the row was given
 * @returns The message to report, or undefined when the count is right
 */
function segmentCountWarning(label: string, count: number): string | undefined {
    if (count >= MIN_SEGMENTS && count <= MAX_SEGMENTS) {
        return undefined;
    }

    return (
        `CompoundRow "${label}" was given ${String(count)} ${count === 1 ? "segment" : "segments"}, and it holds ` +
        "two or three. A compound row shows one value together with the parts that belong to it: use PanelField " +
        "for a single value, and a table or a list of rows for more than three."
    );
}

/**
 * States what is wrong with how a row shared out its width, in development
 * builds only.
 *
 * A box where nothing grows -- or where everything does -- is a box whose
 * author has not decided which value is the main one.
 * @param label - The row's label, so the message names the offending row
 * @param growCount - How many segments asked to take the remaining width
 * @returns The message to report, or undefined when exactly one segment grows
 */
function growCountWarning(label: string, growCount: number): string | undefined {
    if (growCount === 1) {
        return undefined;
    }

    return (
        `CompoundRow "${label}" was given ${String(growCount)} segments that set grow, and exactly one should. ` +
        "The segment that sets grow takes the box's leftover width and should be the main value, with the rest " +
        "sized to their content. Using the first segment that sets it, or the leading segment when none does."
    );
}

/**
 * Two or three values that belong to one thing, in a single box divided by
 * hairlines.
 *
 * A colour and its opacity are one setting seen two ways rather than two
 * settings. Drawing them in one box, split by a one-pixel divider in the colour
 * of the panel behind it, says exactly that; drawing them in two boxes with a
 * gap between them says the opposite. The divider is a hairline and not a
 * gutter on purpose, because a gutter reads as two separate controls.
 *
 * **The rule people break.** Never put two unrelated values in one box. The
 * test is whether the box has one honest name: "Node colour and opacity" is one
 * thing seen two ways, so it belongs here; "Node size and edge width" is two
 * things that happen to be adjacent, so it belongs in a `FieldRow` pair -- two
 * fields, two boxes, two glyphs. A compound row is a claim about the data, and
 * a false claim costs the reader more than the pixel it saves.
 *
 * Exactly one segment sets `grow`. That segment is the main value and takes the
 * leftover width; the others are its parts and are sized to their content. When
 * no segment claims it the leading one grows, and development logs a warning --
 * as it does for any count of segments outside two and three.
 *
 * Values are drawn exactly as they are given, so format them first: use
 * `useNumberFormatter` so a number reads correctly in the reader's own locale.
 *
 * Pass `onClick` to make the box a button that opens an editor for the whole
 * compound. It receives the event, so you can read modifier keys, call
 * `preventDefault`, or find which segment the pointer landed on. Without it the
 * box is a named group of read-only values and stays out of the tab order.
 *
 * A screen reader is given the row's name and then every segment's value, so
 * the values are announced rather than replaced by the name. A value you have
 * had to shorten needs `fullValue` on its segment, which puts the complete text
 * in the tooltip and in the announcement in place of the shortened drawing.
 *
 * Pass `busy` when the values are filled in by something running in the
 * background, and the row announces itself politely once the work finishes.
 *
 * When the "show labels on controls" preference is on -- see
 * `PanelLabelsProvider` -- the row's one name moves out to a column of its own
 * beside the box, and the box fills the rest of the row. The segments are never
 * labelled individually, because they are not individually named things.
 * @param props - Component props
 * @param props.label - Names the one thing the segments belong to; becomes the box's tooltip and part of its accessible name
 * @param props.segments - Two or three values that belong to one thing
 * @param props.width - The width of the box in pixels: 224 to fill the row, 108 for half of one
 * @param props.trailing - The 24px trailing control: an advanced settings button, a reset, or nothing
 * @param props.busy - Whether the row's values are still being worked out by something that finishes later
 * @param props.live - How urgently a screen reader announces the row when it changes on its own
 * @param props.onClick - Called when the box is activated, which turns the box into a button
 * @param props.onFocus - Called when focus enters the box
 * @param props.onBlur - Called when focus leaves the box
 * @returns The compound row
 * @example
 * ```tsx
 * <CompoundRow
 *     label="Node colour and opacity"
 *     segments={[
 *         {glyph: <Swatch colour="#4a7ee8" />, value: "4A7EE8", mono: true, grow: true},
 *         {value: percentFormatter.format(1), unit: "%"},
 *     ]}
 *     onClick={() => { setEditorOpen(true); }}
 * />
 * ```
 */
export function CompoundRow({
    label,
    segments,
    width = PANEL_GRID.BODY,
    trailing,
    busy,
    live: liveSetting,
    onClick,
    onFocus,
    onBlur,
}: CompoundRowProps): React.JSX.Element {
    const showLabels = usePanelLabels();
    const labelId = React.useId();

    const growCount = segments.filter((segment) => segment.grow === true).length;

    useDevWarning(segmentCountWarning(label, segments.length));
    useDevWarning(growCountWarning(label, growCount));

    // No segment claimed the remaining width, so the leading one takes it: a
    // box that fills nothing would leave the row short of the panel's content
    // band.
    const claimed = segments.findIndex((segment) => segment.grow === true);
    const growIndex = claimed === -1 ? 0 : claimed;

    const interactive = onClick !== undefined;

    // A live region has to be in the document before the content it announces
    // changes; one added at the same moment its values arrive is announced by
    // nothing. So the region is created as soon as the caller says the row is
    // fed asynchronously -- by supplying `busy` at all, true or false -- rather
    // than when the run starts. `live` overrides that, the same way it does on
    // every other announcing component here.
    const live = resolveLive(liveSetting, busy) !== "off";

    // Where the row's name lives. The announcement is atomic, so it has to
    // carry the name as well as the values; a button takes its accessible name
    // from its content for the same reason. Both cases put a visually hidden
    // copy of the name inside the box, and the visible label column -- when the
    // "show labels on controls" preference draws one -- then steps out of the
    // accessibility tree so the name is not announced twice.
    const nameInsideBox = interactive || live;
    const hiddenNameId = interactive ? undefined : labelId;
    const columnNameId = nameInsideBox ? undefined : labelId;

    // A group takes no name from its content, so it has to be named by
    // reference: at the hidden copy inside it, or at the visible label column.
    // Only the plain read-only row with the preference off has the name nowhere
    // on the page, and there aria-label is the one place left to put it. Naming
    // by reference rather than by aria-label is what keeps the announced name
    // and the drawn word the same string (WCAG 2.2, 2.5.3 Label in Name).
    const namedByElement = nameInsideBox || showLabels;

    const boxStyle: React.CSSProperties = {
        display: "flex",
        alignItems: "center",
        boxSizing: "border-box",
        flex: showLabels ? "1 1 auto" : "0 0 auto",
        width: showLabels ? undefined : width,
        minWidth: 0,
        height: PANEL_GRID.CONTROL_HEIGHT,
        background: PANEL_INK.SURFACE,
        borderRadius: "var(--mantine-radius-sm)",
        // The hairline stops at the box's rounded corners.
        overflow: "hidden",
        // A button carries Mantine's own `text-align: left`, which is physical.
        textAlign: "start",
        cursor: interactive ? "pointer" : undefined,
    };

    const boxContent = (
        <>
            {/* The row's name, for screen readers only: it is the button's
                accessible name, the group's accessible name by reference, and
                the first thing a polite announcement reads. Sighted readers
                have the same name in the tooltip, or in the label column, which
                is hidden from assistive technology below so that the name is
                not announced twice. */}
            {nameInsideBox && <VisuallyHidden id={hiddenNameId}>{label}</VisuallyHidden>}

            {segments.map((segment, index) => (
                <React.Fragment key={index}>
                    {index > 0 && (
                        <Box
                            data-testid="compound-row-hairline"
                            style={{
                                flex: "0 0 auto",
                                width: HAIRLINE,
                                height: PANEL_GRID.CONTROL_HEIGHT,
                                background: PANEL_INK.PANEL,
                            }}
                        />
                    )}
                    <CompoundSegmentBox segment={segment} grow={index === growIndex} index={index} />
                </React.Fragment>
            ))}
        </>
    );

    return (
        <Box
            data-testid="compound-row"
            style={{
                display: "flex",
                alignItems: "center",
                // A 108px box does not reach the trailing gap, so the free
                // width between the box and the trailing slot is spent here
                // rather than after the slot: the trailing control sits at the
                // same place on every row type, whatever its body is worth.
                justifyContent: "space-between",
                gap: PANEL_GRID.TRAIL_GAP,
                height: PANEL_GRID.ROW_PITCH,
            }}
        >
            {/* The "show labels on controls" preference: the one name the box
                already carries as its tooltip becomes visible, in a column of
                its own. */}
            {showLabels && (
                <Box
                    component="span"
                    id={columnNameId}
                    data-testid="compound-row-label"
                    title={label}
                    aria-hidden={nameInsideBox ? true : undefined}
                    style={{
                        flex: `0 0 ${PANEL_GRID.LABEL_COLUMN}px`,
                        fontSize: "var(--mantine-font-size-sm)",
                        lineHeight: 1.2,
                        color: PANEL_INK.CHROME,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                    }}
                >
                    {label}
                </Box>
            )}

            {interactive ? (
                <UnstyledButton
                    type="button"
                    title={label}
                    data-testid="compound-row-box"
                    data-interactive="true"
                    {...liveRegionProps(liveSetting, busy)}
                    onClick={onClick}
                    onFocus={onFocus}
                    onBlur={onBlur}
                    style={boxStyle}
                >
                    {boxContent}
                </UnstyledButton>
            ) : (
                <Box
                    role="group"
                    aria-label={namedByElement ? undefined : label}
                    aria-labelledby={namedByElement ? labelId : undefined}
                    title={label}
                    data-testid="compound-row-box"
                    data-interactive="false"
                    {...liveRegionProps(liveSetting, busy)}
                    onFocus={onFocus}
                    onBlur={onBlur}
                    style={boxStyle}
                >
                    {boxContent}
                </Box>
            )}

            <TrailingSlot>{trailing}</TrailingSlot>
        </Box>
    );
}
