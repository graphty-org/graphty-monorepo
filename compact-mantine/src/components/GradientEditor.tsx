import { ActionIcon, Box, Group, Slider, Stack, Text } from "@mantine/core";
import { useUncontrolled } from "@mantine/hooks";
import React, { useId, useMemo, useRef } from "react";

import { DEFAULT_GRADIENT_STOP_COLOR } from "../constants/colors";
import { PANEL_GRID, PANEL_INK } from "../constants/panel";
import { useLabels, useNumberFormatter } from "../i18n";
import { UiGlyph } from "../icons";
import type { ColorStop } from "../types";
import { createColorStop, createDefaultGradientStops } from "../utils/color-stops";
import { CompactColorInput } from "./CompactColorInput";

// The older half of the library, brought to the same standard as the row types.
// Contract sections 1.1, 1.3, 2.1, 2.2, 2.3, 3 and 7 were applied here.
//
// Accessibility: the APG "Grouping controls" pattern for the list of stops --
// a group named by the heading above it, holding one run of controls per stop
// -- and the APG "Slider" pattern for the position and direction sliders,
// which Mantine implements natively including its right-to-left arrow-key
// behaviour. The sliders' names are set with `thumbLabel`, so they land on the
// element that actually carries role="slider"; the aria-label this component
// used to set went on the wrapping div, where no assistive technology looked
// for it.
//
// Not reachable from outside Mantine 8.3.10: aria-valuetext. Slider forwards
// `thumbProps` to its Thumb, but Thumb destructures a fixed list of props and
// spreads nothing onto the element, so the unit ("50%", "90 degrees") cannot be
// attached to the reading. The unit is carried by the visible tooltip and by
// the heading instead, and the reading is announced as a bare number.

/**
 * The fewest stops a gradient can be reduced to.
 *
 * Two is the floor because a gradient with one stop is a flat colour, which is
 * a different thing to configure.
 */
const DEFAULT_MIN_STOPS = 2;

/**
 * The most stops the editor offers by default.
 *
 * Five is as many as a 280px panel can lay out without the position sliders
 * becoming too short to aim at.
 */
const DEFAULT_MAX_STOPS = 5;

/**
 * The width of one stop's position slider, in pixels.
 */
const STOP_SLIDER_WIDTH = 80;

/**
 * A position along a gradient, as a percentage.
 */
const POSITION_MIN = 0;

/**
 * The far end of a gradient, as a percentage.
 */
const POSITION_MAX = 100;

/**
 * The smallest angle the direction slider offers, in degrees.
 */
const ANGLE_MIN = 0;

/**
 * The largest angle the direction slider offers, in degrees.
 */
const ANGLE_MAX = 360;

/**
 * The angles the direction slider writes a tick mark under.
 */
const ANGLE_MARKS = [0, 90, 180, 270, 360];

/**
 * Props for the GradientEditor component.
 */
export interface GradientEditorProps {
    /**
     * The gradient's colour stops, when you drive the editor from your own
     * state. Order them by `offset`; the editor keeps them in order as it
     * works.
     */
    stops?: ColorStop[];
    /** The stops the editor starts with when it keeps its own state. */
    defaultStops?: ColorStop[];
    /**
     * The angle the gradient runs at, in degrees clockwise from 0, when you
     * drive the editor from your own state.
     *
     * This is an angle and has nothing to do with the reading direction that
     * `DirectionProvider` sets; the editor follows that on its own.
     */
    direction?: number;
    /**
     * The angle the editor starts at when it keeps its own state.
     * @default 0
     */
    defaultDirection?: number;
    /**
     * Whether to offer the direction slider.
     * @default true
     */
    showDirection?: boolean;
    /**
     * Called whenever the gradient changes: a colour, a position, a stop added
     * or a stop removed.
     *
     * Both halves of the gradient are passed on every change, so a consumer
     * never has to remember which one moved. The event that caused the change
     * is third and optional -- a drag and the colour picker report none.
     *
     * While a slider is being dragged this is called on every step. Use
     * `onChangeEnd` if you want the settled value only.
     */
    onChange?: (stops: ColorStop[], direction: number, event?: React.SyntheticEvent) => void;
    /**
     * Called once when a change to a position or to the direction begins.
     *
     * Open one undo transaction here and close it in `onChangeEnd`, and a drag
     * across the whole track becomes a single entry in your history instead of
     * one entry per step. The pointer event is passed when the change began
     * with a press, and omitted when it began from the keyboard.
     *
     * A drag is one change from the press to the release. An arrow key is a
     * change of its own: it settles the moment it is pressed, so holding the
     * key down reports a complete start, change and end for every step.
     */
    onChangeStart?: (event?: React.PointerEvent) => void;
    /**
     * Called once when a change to a position or to the direction settles,
     * with the gradient it settled on.
     *
     * Mantine reports no event for the end of a change, so this is called with
     * the values alone.
     */
    onChangeEnd?: (stops: ColorStop[], direction: number) => void;
    /**
     * The fewest stops the editor will let the reader reduce the gradient to.
     * The remove buttons are disabled at this count.
     * @default 2
     */
    minStops?: number;
    /**
     * The most stops the editor will let the reader build up to. The add button
     * is disabled at this count.
     * @default 5
     */
    maxStops?: number;
}

/**
 * An editor for a multi-stop linear gradient.
 *
 * Each stop is one row: a colour control, a slider for where the stop sits
 * along the gradient, and a button that removes it. A button above the list
 * adds a stop halfway between the last one and the end, and an optional slider
 * below sets the angle the gradient runs at.
 *
 * The list is bounded at both ends. It will not go below `minStops`, because a
 * gradient of one colour is a flat fill rather than a gradient, and it will not
 * go above `maxStops`, because the position sliders get too short to aim at.
 * At either bound the button that would cross it is disabled rather than
 * silently doing nothing.
 *
 * Dragging reports three things: `onChangeStart` once when the drag begins,
 * `onChange` on every step, and `onChangeEnd` once when it settles. Opening an
 * undo transaction on the first and closing it on the last turns a whole drag
 * into one undo entry rather than one per pixel moved.
 *
 * Every stop carries an `id`, which is what keeps the right control attached to
 * the right stop as stops are added, removed and reordered. Build stops with
 * `createColorStop` rather than writing the object by hand, so the id is unique.
 * @param props - Component props
 * @param props.stops - The gradient's colour stops, when you drive the editor from your own state
 * @param props.defaultStops - The stops the editor starts with when it keeps its own state
 * @param props.direction - The angle the gradient runs at, when you drive the editor from your own state
 * @param props.defaultDirection - The angle the editor starts at when it keeps its own state
 * @param props.showDirection - Whether to offer the direction slider
 * @param props.onChange - Called whenever the gradient changes, with both halves of it
 * @param props.onChangeStart - Called once when a change to a position or to the direction begins
 * @param props.onChangeEnd - Called once when such a change settles, with the gradient it settled on
 * @param props.minStops - The fewest stops the reader can reduce the gradient to
 * @param props.maxStops - The most stops the reader can build up to
 * @returns The list of stops, and the direction slider when it is asked for
 * @example
 * ```tsx
 * const [stops, setStops] = useState([createColorStop(0, "#6366F1"), createColorStop(1, "#06B6D4")]);
 * const [angle, setAngle] = useState(90);
 *
 * <GradientEditor
 *     stops={stops}
 *     direction={angle}
 *     onChange={(nextStops, nextAngle) => {
 *         setStops(nextStops);
 *         setAngle(nextAngle);
 *     }}
 *     onChangeStart={() => history.begin()}
 *     onChangeEnd={() => history.commit()}
 * />
 * ```
 */
export function GradientEditor({
    stops,
    defaultStops,
    direction,
    defaultDirection = ANGLE_MIN,
    showDirection = true,
    onChange,
    onChangeStart,
    onChangeEnd,
    minStops = DEFAULT_MIN_STOPS,
    maxStops = DEFAULT_MAX_STOPS,
}: GradientEditorProps): React.JSX.Element {
    const labels = useLabels();
    const formatNumber = useNumberFormatter({ maximumFractionDigits: 0 });
    const stopsHeadingId = useId();
    const directionHeadingId = useId();

    // Built once rather than on every render, because every call mints fresh
    // ids and only the first render's result is ever kept.
    const fallbackStops = useMemo(() => createDefaultGradientStops(), []);

    // Controlled and uncontrolled, the way every state-holding component in
    // this package works. Each half reports both halves, so a consumer's
    // handler never has to work out which one moved. Only these two handlers
    // report the change: calling onChange again from the callers below is what
    // used to fire it twice for one edit.
    const [stopsValue, setStops] = useUncontrolled<ColorStop[]>({
        value: stops,
        defaultValue: defaultStops,
        finalValue: fallbackStops,
        onChange: (nextStops: ColorStop[], event?: React.SyntheticEvent): void => {
            onChange?.(nextStops, directionValue, event);
        },
    });

    const [directionValue, setDirection] = useUncontrolled<number>({
        value: direction,
        defaultValue: defaultDirection,
        finalValue: ANGLE_MIN,
        onChange: (nextDirection: number, event?: React.SyntheticEvent): void => {
            onChange?.(stopsValue, nextDirection, event);
        },
    });

    // Whether a drag is in progress, so that its start is reported once rather
    // than on every step of it.
    const draggingRef = useRef(false);

    /**
     * Report the beginning of a drag, once.
     * @param event - The press that began the drag, when there was one
     */
    const beginDrag = (event?: React.PointerEvent): void => {
        if (draggingRef.current) {
            return;
        }

        draggingRef.current = true;
        onChangeStart?.(event);
    };

    /**
     * Report the end of a drag, with the gradient it settled on.
     * @param settledStops - The stops as they stand now
     * @param settledDirection - The angle as it stands now
     */
    const endDrag = (settledStops: ColorStop[], settledDirection: number): void => {
        draggingRef.current = false;
        onChangeEnd?.(settledStops, settledDirection);
    };

    /**
     * The stops with one stop's colour replaced.
     * @param index - Which stop to recolour
     * @param color - The colour to give it
     * @returns A new array of stops
     */
    const withStopColor = (index: number, color: string): ColorStop[] =>
        stopsValue.map((stop, i) => (i === index ? { ...stop, color } : stop));

    /**
     * The stops with one stop moved along the gradient.
     * @param index - Which stop to move
     * @param position - Where to move it to, as a percentage
     * @returns A new array of stops
     */
    const withStopOffset = (index: number, position: number): ColorStop[] =>
        stopsValue.map((stop, i) => (i === index ? { ...stop, offset: position / POSITION_MAX } : stop));

    /**
     * Add a stop halfway between the last one and the end of the gradient.
     *
     * The guard is belt and braces: the button is disabled at `maxStops`, so
     * this is only reached by a caller driving the editor from code.
     * @param event - The click, or the click a browser synthesises from Enter or Space
     */
    const addStop = (event: React.MouseEvent<HTMLButtonElement>): void => {
        if (stopsValue.length >= maxStops) {
            return;
        }

        const last = stopsValue[stopsValue.length - 1];
        const newOffset = last === undefined ? 0.5 : (last.offset + 1) / 2;
        const nextStops = [...stopsValue, createColorStop(newOffset, DEFAULT_GRADIENT_STOP_COLOR)];
        nextStops.sort((a, b) => a.offset - b.offset);
        setStops(nextStops, event);
    };

    /**
     * Remove one stop from the gradient.
     *
     * The guard is belt and braces: the buttons are disabled at `minStops`, so
     * this is only reached by a caller driving the editor from code.
     * @param index - Which stop to remove
     * @param event - The click, or the click a browser synthesises from Enter or Space
     */
    const removeStop = (index: number, event: React.MouseEvent<HTMLButtonElement>): void => {
        if (stopsValue.length <= minStops) {
            return;
        }

        setStops(
            stopsValue.filter((_, i) => i !== index),
            event,
        );
    };

    const atMax = stopsValue.length >= maxStops;
    const atMin = stopsValue.length <= minStops;

    return (
        <Stack data-testid="gradient-editor" gap="xs">
            <Group justify="space-between" align="center">
                <Text id={stopsHeadingId} data-testid="gradient-editor-heading" size="xs" c={PANEL_INK.CHROME}>
                    {labels.colorStops}
                </Text>
                <ActionIcon
                    variant="subtle"
                    color="gray"
                    size={PANEL_GRID.TRAIL}
                    data-testid="gradient-editor-add-stop"
                    onClick={addStop}
                    disabled={atMax}
                    aria-label={labels.addColorStop}
                >
                    <UiGlyph name="plus" size={PANEL_GRID.CHEVRON} />
                </ActionIcon>
            </Group>

            {/* One group, named by the heading above it, so a screen reader
                announces the list once and then reads each stop's controls
                without repeating what they belong to. */}
            <Stack data-testid="gradient-editor-stops" gap="xs" role="group" aria-labelledby={stopsHeadingId}>
                {stopsValue.map((stop, index) => {
                    const ordinal = formatNumber.format(index + 1);

                    return (
                        <Group key={stop.id} data-testid="gradient-editor-stop" gap="xs" align="flex-end" wrap="nowrap">
                            <CompactColorInput
                                color={stop.color}
                                defaultColor={DEFAULT_GRADIENT_STOP_COLOR}
                                onColorChange={(color, event) => {
                                    // A reset reports undefined, which for a
                                    // gradient stop means "go back to the
                                    // colour a new stop starts at".
                                    setStops(withStopColor(index, color ?? DEFAULT_GRADIENT_STOP_COLOR), event);
                                }}
                                showOpacity={false}
                            />
                            <Box style={{ width: STOP_SLIDER_WIDTH }}>
                                <Slider
                                    data-testid="gradient-editor-stop-position"
                                    min={POSITION_MIN}
                                    max={POSITION_MAX}
                                    value={stop.offset * POSITION_MAX}
                                    onPointerDown={beginDrag}
                                    onChange={(position) => {
                                        beginDrag();
                                        setStops(withStopOffset(index, position));
                                    }}
                                    onChangeEnd={(position) => {
                                        endDrag(withStopOffset(index, position), directionValue);
                                    }}
                                    label={(position) => labels.percent(formatNumber.format(position))}
                                    thumbLabel={labels.colorStopPosition(ordinal)}
                                />
                            </Box>
                            <ActionIcon
                                variant="subtle"
                                color="gray"
                                size={PANEL_GRID.TRAIL}
                                onClick={(event) => {
                                    removeStop(index, event);
                                }}
                                data-testid="gradient-editor-remove-stop"
                                disabled={atMin}
                                aria-label={labels.removeColorStop(ordinal)}
                            >
                                <UiGlyph name="minus" size={PANEL_GRID.CHEVRON} />
                            </ActionIcon>
                        </Group>
                    );
                })}
            </Stack>

            {showDirection && (
                <Box data-testid="gradient-editor-direction" pb="md" role="group" aria-labelledby={directionHeadingId}>
                    <Text
                        id={directionHeadingId}
                        data-testid="gradient-editor-direction-heading"
                        size="xs"
                        c={PANEL_INK.CHROME}
                        mb={4}
                    >
                        {labels.direction}
                    </Text>
                    {/* Mantine's Slider reads the direction provider itself, so
                        its arrow keys already run the way the text does. */}
                    <Slider
                        data-testid="gradient-editor-direction-slider"
                        min={ANGLE_MIN}
                        max={ANGLE_MAX}
                        value={directionValue}
                        onPointerDown={beginDrag}
                        onChange={(angle) => {
                            beginDrag();
                            setDirection(angle);
                        }}
                        onChangeEnd={(angle) => {
                            endDrag(stopsValue, angle);
                        }}
                        label={(angle) => labels.degrees(formatNumber.format(angle))}
                        thumbLabel={labels.gradientDirection}
                        marks={ANGLE_MARKS.map((angle) => ({
                            value: angle,
                            label: labels.degrees(formatNumber.format(angle)),
                        }))}
                    />
                </Box>
            )}
        </Stack>
    );
}
