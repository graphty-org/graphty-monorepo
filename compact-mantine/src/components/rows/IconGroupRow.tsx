import { Box, SegmentedControl, VisuallyHidden } from "@mantine/core";
import { useUncontrolled } from "@mantine/hooks";
import React, { useRef } from "react";

import { PANEL_GRID, PANEL_INK } from "../../constants/panel";
import { usePanelLabels } from "../../context/PanelLabelsContext";
import type { ChangeHandler } from "../../types/events";
import { useDevWarning } from "../../utils/dev-warning";
import { TrailingSlot } from "./TrailingSlot";

// This row is Mantine's SegmentedControl with a picture in each segment,
// re-measured onto the panel grid. It used to be a hand-built track of
// UnstyledButtons carrying role="radio", which meant re-implementing a radio
// group in JavaScript: the arrows advanced in DOM order whichever way the text
// ran, and the selected tile was told apart from the rest by colour alone.
// Standing it on real <input type="radio"> elements hands all of that back to
// the browser.

/**
 * The fewest options that earn a group.
 *
 * One option is not a choice, it is a statement, and a statement belongs in a
 * field rather than in a set of buttons.
 */
const MIN_OPTIONS = 2;

/**
 * The most options a group may hold.
 *
 * Seven segments in the wide track are 30px each and stop reading as drawings.
 * Past six, or when the difference between the options is conceptual rather
 * than visual, the control belongs in a select.
 */
const MAX_OPTIONS = 6;

/**
 * The inner padding of the track, which is what makes the selected segment read
 * as a raised tile inside a well rather than as a repainted third of the box.
 */
const TRACK_PADDING = 1;

/**
 * The drawn height of one segment: the 24px control less the track's padding on
 * both edges. Derived rather than typed, so the segment keeps sitting inside the
 * track if the control height ever moves.
 */
const SEGMENT_HEIGHT = PANEL_GRID.CONTROL_HEIGHT - TRACK_PADDING * 2;

/**
 * The gap between two segments of the track.
 */
const SEGMENT_GAP = 2;

/**
 * The corner radius of a segment: one step tighter than the track's own 4px, so
 * the two curves nest instead of fighting.
 */
const SEGMENT_RADIUS = 3;

/**
 * The gap between a drawing and the word beside it inside one segment.
 */
const INLINE_GAP = 4;

/**
 * The padding a segment grows along the inline axis when it carries a word as
 * well as a drawing.
 */
const WORD_PADDING = 6;

/**
 * The narrowest a segment may be squeezed: exactly the drawing it holds.
 *
 * Segments share the track by their content, so a segment carrying a word takes
 * the room its word needs and the rest divide what is left. This minimum is
 * what stops that division from cropping a drawing when the words are long and
 * the track is narrow.
 */
const SEGMENT_MIN_WIDTH = PANEL_GRID.GLYPH;

/**
 * The largest option count that fits the narrow track.
 */
const NARROW_TRACK_MAX = 3;

/**
 * The ink a segment's drawing and word are painted in.
 *
 * The selected segment is a solid patch of one colour with its contents punched
 * out of it, so its ink is the panel's own ground rather than the text colour
 * every other segment uses.
 * @param active - Whether this option is the selected one
 * @param disabled - Whether this option cannot be chosen
 * @returns The colour to paint the segment's contents with
 */
function segmentInk(active: boolean, disabled: boolean): string {
    if (disabled) {
        return PANEL_INK.DISABLED;
    }

    return active ? PANEL_INK.ON_SELECTED : PANEL_INK.CHROME;
}

// Accessibility: the APG "Radio Group" pattern
// (https://www.w3.org/WAI/ARIA/apg/patterns/radio/), built out of native
// <input type="radio"> elements rather than re-implemented with ARIA. Mantine's
// SegmentedControl draws one radio per option inside a role="radiogroup"
// element, so the browser supplies the pattern itself:
//
//   - the group is one stop in the tab order and Tab lands on the selected
//     option, or on the first one when nothing is selected;
//   - the arrow keys move the selection and the focus together, and follow the
//     direction the text runs, so ArrowRight advances under dir="ltr" and goes
//     back under dir="rtl" (measured in Chromium, tests/components/rows/
//     IconGroupRow.browser.test.tsx);
//   - the checked state reaches assistive technology from the input rather than
//     from the colour of a tile, which is what WCAG 1.4.1 asks for;
//   - Space selects the focused option, and a disabled option is skipped.
//
// Home and End are the one addition. They are not part of the APG radio group
// pattern and no browser supplies them for radios, but this row has always had
// them, so they are handled here rather than dropped.
//
// The word is what names an option to a screen reader. When it is not drawn it
// is rendered into a VisuallyHidden element, which keeps the name inside the
// label -- name from content, rather than an aria-label that would replace a
// drawn word with a second copy of itself.
//
// Target size (WCAG 2.2, 2.5.8): a segment is 22px tall, under the 24px
// minimum, and passes on the spacing exception -- neighbouring segments are at
// least 24px apart centre to centre, and the rows above and below are a 32px
// row pitch away. The one arrangement that does not clear it is `hybrid` on the
// narrow track, where the segments that hold only a drawing are squeezed to
// 14px; `hybrid` asks for the wide track for that reason as well as for room to
// read the word.

/**
 * One option of an icon group: a value, the word it is called, and the drawing
 * that stands in for the word.
 */
export interface IconGroupOption {
    /** The value this option selects. Unique within the group. */
    value: string;
    /**
     * The word this option would have been called.
     *
     * It is what a screen reader announces for the option and what the tooltip
     * says, whether or not it is drawn, so write the word rather than a
     * description of the drawing.
     */
    label: string;
    /**
     * The drawing that lets the word be dropped.
     *
     * A 14px inline SVG that takes its colour from its parent, so the drawing
     * changes colour with the selection. Mark it `aria-hidden` -- the word
     * beside it is what names the option.
     */
    icon: React.ReactNode;
    /**
     * Whether this option cannot be chosen.
     *
     * A disabled option is drawn dimmer, is skipped by the arrow keys and is
     * announced as unavailable.
     * @default false
     */
    disabled?: boolean;
}

/**
 * Props for the IconGroupRow component.
 */
export interface IconGroupRowProps {
    /** Two to six mutually exclusive options whose difference can be drawn. */
    options: IconGroupOption[];
    /** The selected value. Supply this to drive the row from your own state. */
    value?: string;
    /**
     * The value selected before anything is chosen, when the row keeps its own
     * state. Defaults to the first option.
     */
    defaultValue?: string;
    /**
     * Called with the newly selected value, and with the event that selected it
     * when a person did the selecting.
     *
     * The event is second and optional so that a change made in code is
     * expressible as `onChange(next)`.
     */
    onChange?: ChangeHandler<string>;
    /**
     * What the whole group is for, such as `"Node shape"`.
     *
     * A group of radio buttons needs a name of its own: without one a screen
     * reader announces the options but never says what is being chosen. The
     * word is not drawn on the row -- give it here when nothing else on the
     * screen names the group, or use `labelledBy` when something does.
     */
    label?: string;
    /**
     * The `id` of the element that names the group, such as the heading of the
     * section it sits in.
     *
     * Prefer this to `label` whenever the name is already on the screen, so
     * that the drawn name and the announced one cannot drift apart. When both
     * are given, this one wins.
     */
    labelledBy?: string;
    /**
     * The name shared by the group's radio inputs, as an HTML form would use.
     *
     * One is generated when you leave it out. Set it to submit the choice with
     * a form, or to keep it stable between renders in a test.
     */
    name?: string;
    /**
     * Whether the whole group cannot be used.
     *
     * Every option is drawn dimmer, none can be chosen, and the group is
     * skipped by the Tab key. To disable one option rather than all of them,
     * set `disabled` on that option.
     * @default false
     */
    disabled?: boolean;
    /**
     * Draw the word beside the drawing on the selected option only.
     *
     * Some option sets have names the panel cannot afford to hide -- layout
     * names, scale names, method names -- and drawing every word costs a row
     * the panel does not have. This names the current choice, leaves the
     * alternatives to be learned by trying them, and still fits one row. It
     * wants the 224px track: on the 108px one the words squeeze the drawings
     * down to nothing.
     * @default false
     */
    hybrid?: boolean;
    /**
     * How wide the track is drawn, in pixels, or `"fill"` to take whatever the
     * row has left over.
     *
     * Defaults to the width the option count asks for: 108px for up to three
     * options and 224px for four to six. Use `"fill"` inside a container that
     * is not the 280px panel this library measures for.
     */
    width?: number | "fill";
    /**
     * The row's 24px trailing slot: an advanced settings button, a control that
     * resets the row, or nothing.
     */
    trailing?: React.ReactNode;
    /** Called when the focus enters the group, with the option that took it. */
    onFocus?: React.FocusEventHandler<HTMLDivElement>;
    /** Called when the focus leaves the group. */
    onBlur?: React.FocusEventHandler<HTMLDivElement>;
}

/**
 * A row of two to six mutually exclusive options drawn as pictures, in one
 * segmented track.
 *
 * Reach for it in place of a select whose whole option list is short and can be
 * drawn: node shapes, edge routing, layouts, scale curves. It costs the same
 * single row as the select and spends it better, because every alternative is
 * visible at rest instead of hidden behind a chevron.
 *
 * Stay inside the range. One option is a statement rather than a choice and
 * belongs in a field; more than six stop reading as a set of drawings. So does
 * any set whose options differ conceptually rather than visually, however few
 * of them there are -- those belong in a select, and a legible checkbox is
 * never worth converting into a pair of pictures. Outside two to six the row
 * still renders, and says so once in the console during development.
 *
 * Every option carries the word it would have been called. The word is not
 * drawn unless you ask for it, but it is always the option's accessible name
 * and its tooltip, so the row is operable by someone who cannot see the
 * drawings. Two things ask for it to be drawn as well: `hybrid`, which names
 * the selected option only, and `PanelLabelsProvider`, the application-wide
 * preference that puts a word beside every control in the panel.
 *
 * The group is a set of radio buttons, so Tab reaches it in one stop and lands
 * on the current choice, the arrow keys move the selection and the focus
 * together and follow the direction the text runs, Home and End jump to the
 * ends, and Space selects.
 * @param props - Component props
 * @param props.options - Two to six mutually exclusive options whose difference can be drawn
 * @param props.value - The selected value, to drive the row from your own state
 * @param props.defaultValue - The value selected before anything is chosen, when the row keeps its own state
 * @param props.onChange - Called with the newly selected value and the event that selected it
 * @param props.label - What the whole group is for, announced as its name
 * @param props.labelledBy - The `id` of the element that already names the group
 * @param props.name - The name shared by the group's radio inputs
 * @param props.disabled - Whether the whole group cannot be used
 * @param props.hybrid - Draw the word beside the drawing on the selected option only
 * @param props.width - How wide the track is drawn, or `"fill"` to take the rest of the row
 * @param props.trailing - The row's 24px trailing slot
 * @param props.onFocus - Called when the focus enters the group
 * @param props.onBlur - Called when the focus leaves the group
 * @returns The icon group row
 * @example
 * ```tsx
 * <IconGroupRow
 *     label="Node shape"
 *     options={[
 *         {value: "box", label: "Box", icon: <BoxGlyph />},
 *         {value: "sphere", label: "Sphere", icon: <SphereGlyph />},
 *         {value: "disc", label: "Disc", icon: <DiscGlyph />},
 *     ]}
 *     value={shape}
 *     onChange={(next) => { setShape(next); }}
 * />
 * ```
 */
export function IconGroupRow(props: IconGroupRowProps): React.JSX.Element {
    const {
        options,
        value,
        defaultValue,
        onChange,
        label,
        labelledBy,
        name,
        disabled = false,
        hybrid = false,
        width,
        trailing,
        onFocus,
        onBlur,
    } = props;

    const showLabels = usePanelLabels();
    const count = options.length;

    const [firstOption] = options;
    const [selected, handleChange] = useUncontrolled<string>({
        value,
        defaultValue,
        finalValue: firstOption === undefined ? "" : firstOption.value,
        onChange,
    });

    // Mantine's SegmentedControl reports the value it changed to and not the
    // event that changed it, and the event is what lets a consumer read
    // modifier keys or call preventDefault. The change event is caught on its
    // way down to the input that fired it -- a capture handler runs before the
    // target's own -- and handed to onChange alongside the value.
    const changeEvent = useRef<React.SyntheticEvent | undefined>(undefined);

    useDevWarning(
        count < MIN_OPTIONS || count > MAX_OPTIONS
            ? `IconGroupRow was given ${String(count)} ${count === 1 ? "option" : "options"}, and it holds two ` +
                  "to six drawable ones. One option is a statement rather than a choice and belongs in a field, " +
                  "and more than six stop reading as a set of drawings -- use a select instead. Rendering them " +
                  "anyway."
            : undefined,
    );

    // The narrow track for up to three options, the wide one for up to six.
    const trackWidth = width ?? (count <= NARROW_TRACK_MAX ? PANEL_GRID.FIELD : PANEL_GRID.BODY);
    const fills = trackWidth === "fill";

    /**
     * Jump to the first or the last option, which native radios do not do.
     * @param event - The keyboard event, taken on the group rather than on one option
     */
    const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
        if (disabled || (event.key !== "Home" && event.key !== "End")) {
            return;
        }

        const choosable = options.filter((option) => option.disabled !== true);
        const target = event.key === "Home" ? choosable[0] : choosable[choosable.length - 1];

        if (target === undefined) {
            return;
        }

        // Also stops the browser from scrolling the panel to its ends, and
        // stops the testing library's own Home handling, which assumes a text
        // box and asks a radio for a selection range it does not have.
        event.preventDefault();
        handleChange(target.value, event);

        // Matching on the value rather than building a selector keeps a value
        // holding a quote from breaking the query.
        const inputs = Array.from(event.currentTarget.querySelectorAll<HTMLInputElement>("input[type=\"radio\"]"));
        inputs.find((input) => input.value === target.value)?.focus();
    };

    const data = options.map((option) => {
        const active = option.value === selected;
        const optionDisabled = disabled || option.disabled === true;
        // Hybrid names the current choice and nothing else. The panel-wide
        // preference names everything, because that is what it is for.
        const showsWord = showLabels || (hybrid && active);

        return {
            value: option.value,
            disabled: option.disabled,
            label: (
                <Box
                    component="span"
                    data-testid="icon-group-button"
                    data-value={option.value}
                    data-active={active ? "true" : "false"}
                    title={option.label}
                    style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxSizing: "border-box",
                        gap: showsWord ? INLINE_GAP : 0,
                        paddingInline: showsWord ? WORD_PADDING : 0,
                        width: "100%",
                        minWidth: 0,
                        // The selected segment is a solid patch of the selected
                        // ground with its label punched out of it; everything
                        // else is secondary text on the track. Written here,
                        // per option, rather than in the styles below, which
                        // would paint every segment the same.
                        color: segmentInk(active, optionDisabled),
                    }}
                >
                    <Box
                        component="span"
                        data-testid="icon-group-icon"
                        style={{
                            flex: "0 0 auto",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                    >
                        {option.icon}
                    </Box>
                    {showsWord
                        ? (
                            <Box
                                component="span"
                                data-testid="icon-group-word"
                                style={{
                                    minWidth: 0,
                                    fontWeight: 500,
                                    lineHeight: 1,
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                }}
                            >
                                {option.label}
                            </Box>
                        )
                        : <VisuallyHidden>{option.label}</VisuallyHidden>}
                </Box>
            ),
        };
    });

    return (
        <Box
            data-testid="icon-group-row"
            style={{
                display: "flex",
                alignItems: "center",
                // A 108px track does not reach the trail gap, so the free width
                // between the track and the slot is spent here rather than
                // after the slot: the trailing slot belongs at the same place
                // on every row type, whatever its body is worth.
                justifyContent: "space-between",
                gap: PANEL_GRID.TRAIL_GAP,
                height: PANEL_GRID.ROW_PITCH,
            }}
        >
            <SegmentedControl
                data={data}
                value={selected}
                onChange={(next: string): void => {
                    const event = changeEvent.current;
                    changeEvent.current = undefined;
                    handleChange(next, event);
                }}
                onChangeCapture={(event: React.SyntheticEvent<HTMLDivElement>): void => {
                    changeEvent.current = event;
                }}
                onKeyDown={handleKeyDown}
                onFocus={onFocus}
                onBlur={onBlur}
                name={name}
                disabled={disabled}
                radius="sm"
                aria-label={label}
                aria-labelledby={labelledBy}
                data-testid="icon-group-track"
                data-hybrid={hybrid ? "true" : undefined}
                // --sc-color paints the selected segment for the one frame
                // before Mantine measures the sliding indicator, and --sc-shadow
                // would otherwise put a drop shadow under it in the light
                // scheme, which no other tile in the panel has.
                __vars={{
                    "--sc-color": PANEL_INK.SELECTED,
                    "--sc-shadow": "none",
                }}
                styles={{
                    root: {
                        boxSizing: "border-box",
                        flex: fills ? "1 1 auto" : "0 0 auto",
                        width: fills ? "100%" : trackWidth,
                        minWidth: 0,
                        height: PANEL_GRID.CONTROL_HEIGHT,
                        padding: TRACK_PADDING,
                        gap: SEGMENT_GAP,
                        backgroundColor: PANEL_INK.SURFACE,
                        // Mantine hides the track's overflow, which would crop
                        // the focus ring of a segment against the edge of the
                        // track. Nothing else draws outside it.
                        overflow: "visible",
                    },
                    // Segments divide the track by what they hold, so a segment
                    // carrying a word takes the room the word needs; the
                    // minimum keeps that from cropping the drawings beside it.
                    control: {
                        flex: "1 1 auto",
                        minWidth: SEGMENT_MIN_WIDTH,
                    },
                    label: {
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        height: SEGMENT_HEIGHT,
                        // The padding moves onto the content, where it can
                        // depend on whether that segment draws a word.
                        padding: 0,
                        borderRadius: SEGMENT_RADIUS,
                        // The panel's own reading size, rather than the 10px
                        // the compact theme gives a segmented control, so a
                        // drawn word matches the value beside it in the panel.
                        fontSize: "var(--mantine-font-size-sm)",
                    },
                    innerLabel: {
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: "100%",
                        minWidth: 0,
                    },
                    indicator: {
                        backgroundColor: PANEL_INK.SELECTED,
                        borderRadius: SEGMENT_RADIUS,
                        boxShadow: "none",
                    },
                }}
            />

            <TrailingSlot>{trailing}</TrailingSlot>
        </Box>
    );
}
