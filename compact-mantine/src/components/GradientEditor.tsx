import { ActionIcon } from "@mantine/core";
import { useUncontrolled } from "@mantine/hooks";
import React, { useEffect, useId, useMemo, useRef, useState } from "react";

import { DEFAULT_GRADIENT_STOP_COLOR } from "../constants/colors";
import { PANEL_GRID } from "../constants/panel";
import { useLabels, useNumberFormatter, useNumberParser } from "../i18n";
import { UiGlyph } from "../icons";
import type { ColorStop } from "../types";
import { createColorStop, createDefaultGradientStops } from "../utils/color-stops";
import { mixHex } from "../utils/color-utils";
import { isLeavingWithoutCommit, leaveWithoutCommit } from "./color/escape";
import { CompactColorInput } from "./CompactColorInput";

// Figma's gradient editor (design/figma-spec.md 7.5, measured on
// popovers-and-menus/color-picker-gradient-existing): a direction row, 24px square stop handles
// over a 32-tall gradient bar, a "Stops" header with "+", and one 32-tall row per stop (position,
// colour, minus). The look lives in src/theme/css/color.css.ts.
//
// Accessibility: each handle is an APG "Slider" (role=slider, arrows 1%, Shift 10%, Home / End,
// Delete / Backspace removes); the stops sit in a group named by the "Stops" heading; the angle
// is a spinbutton.

/** The fewest stops: one stop is a flat colour, not a gradient. */
const DEFAULT_MIN_STOPS = 2;

/** The most stops offered by default. */
const DEFAULT_MAX_STOPS = 5;

/** The ends of a gradient, as percentages. */
const POSITION_MAX = 100;

/** Angles wrap at a full turn. */
const FULL_TURN = 360;

/** The rotate button turns the gradient by a quarter. */
const QUARTER_TURN = 90;

/** Shift multiplies a keyboard step by this. */
const SHIFT_STEP = 10;

/** The English names of the buttons Figma adds; every other string comes from the labels. */
export interface GradientEditorLabels {
    /** The button that reverses the stops. */
    flip: string;
    /** The button that turns the gradient 90 degrees. */
    rotate: string;
}

const DEFAULT_EDITOR_LABELS: GradientEditorLabels = {
    flip: "Flip gradient",
    rotate: "Rotate gradient 90 degrees",
};

/**
 * Clamp a percentage into 0..100.
 * @param n - the value
 * @returns the clamped value
 */
function clampPercent(n: number): number {
    return Math.min(POSITION_MAX, Math.max(0, n));
}

/** Props for the internal UnitField. */
interface UnitFieldProps {
    value: number;
    format: (value: number) => string;
    /** Snap a committed value into range (and wrap an angle). */
    normalize: (value: number) => number;
    onCommit: (value: number, event: React.SyntheticEvent) => void;
    className: string;
    ariaLabel: string;
    role?: "spinbutton";
    min?: number;
    max?: number;
    testId: string;
}

/**
 * A filled text field holding one number with its unit ("50%", "90\u00b0"): typing commits on
 * blur or Enter and reverts on Escape; ArrowUp / ArrowDown step 1 (Shift 10) and commit at once.
 * @param props - Component props
 * @param props.value - the value
 * @param props.format - formats the value with its unit
 * @param props.normalize - snaps a committed value into range
 * @param props.onCommit - called once per committed change
 * @param props.className - the field classes
 * @param props.ariaLabel - the accessible name
 * @param props.role - spinbutton for an angle, none for a position
 * @param props.min - the lowest value
 * @param props.max - the highest value
 * @param props.testId - test id
 * @returns the field
 */
function UnitField({
    value,
    format,
    normalize,
    onCommit,
    className,
    ariaLabel,
    role,
    min,
    max,
    testId,
}: UnitFieldProps): React.JSX.Element {
    const parse = useNumberParser();
    const [draft, setDraft] = useState(format(value));

    useEffect(() => {
        setDraft(format(value));
    }, [value, format]);

    const commit = (next: number, event: React.SyntheticEvent): void => {
        const settled = normalize(next);
        setDraft(format(settled));
        if (settled !== value) {
            onCommit(settled, event);
        }
    };

    const commitDraft = (event: React.SyntheticEvent): void => {
        const typed = parse(draft);
        if (Number.isNaN(typed)) {
            setDraft(format(value));
            return;
        }
        commit(typed, event);
    };

    return (
        <input
            className={className}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            spellCheck={false}
            role={role}
            aria-label={ariaLabel}
            aria-valuenow={role === undefined ? undefined : value}
            aria-valuemin={role === undefined ? undefined : min}
            aria-valuemax={role === undefined ? undefined : max}
            aria-valuetext={role === undefined ? undefined : format(value)}
            data-testid={testId}
            value={draft}
            onChange={(event) => {
                setDraft(event.currentTarget.value);
            }}
            onFocus={(event) => {
                event.currentTarget.select();
            }}
            onBlur={(event) => {
                if (!isLeavingWithoutCommit(event)) {
                    commitDraft(event);
                }
            }}
            onKeyDown={(event) => {
                if (event.key === "Enter") {
                    commitDraft(event);
                } else if (event.key === "Escape") {
                    leaveWithoutCommit(event, () => {
                        setDraft(format(value));
                    });
                } else if (event.key === "ArrowUp" || event.key === "ArrowDown") {
                    event.preventDefault();
                    const step = (event.shiftKey ? SHIFT_STEP : 1) * (event.key === "ArrowUp" ? 1 : -1);
                    commit(value + step, event);
                }
            }}
        />
    );
}

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
     * Whether to offer the direction row: the angle field, flip and rotate.
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
     * While a stop handle is being dragged this is called on every step. Use
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
    /** Replace the English names of the flip and rotate buttons. */
    labels?: Partial<GradientEditorLabels>;
}

/**
 * Figma's flip-gradient glyph: two horizontal arrows pointing opposite ways (swap).
 * ponytail: drawn here because the shared icon register has no swap glyph; move it there when
 * a second caller needs it.
 * @returns the glyph
 */
function SwapGlyph(): React.JSX.Element {
    return (
        <svg
            width={16}
            height={16}
            viewBox="0 0 16 16"
            aria-hidden
            focusable="false"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M13 5.5H3M5 3.5l-2 2 2 2" />
            <path d="M3 10.5h10M11 8.5l2 2-2 2" />
        </svg>
    );
}

/**
 * Figma's rotate-gradient glyph: a diamond with a quarter-turn arrow over it.
 * @returns the glyph
 */
function RotateShapeGlyph(): React.JSX.Element {
    return (
        <svg
            width={16}
            height={16}
            viewBox="0 0 16 16"
            aria-hidden
            focusable="false"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M8 6.5l3.5 3.5L8 13.5 4.5 10z" />
            <path d="M4.5 5.5l1-1a3.5 3.5 0 0 1 5 0l1.5 1.5M12 3.5v2.5H9.5" />
        </svg>
    );
}

/**
 * An editor for a multi-stop linear gradient, laid out as Figma's: square stop handles over a
 * gradient bar, a "Stops" list of rows (position, colour, remove), and an optional direction row
 * (the angle, flip and rotate).
 *
 * Drag a handle to move its stop, click the bar to add a stop there (its colour mixed from its
 * neighbours), and use the arrow keys on a focused handle to nudge it (Shift for 10%), Home /
 * End to send it to an end, and Delete or Backspace to remove it. The list is bounded by
 * `minStops` and `maxStops`; at either bound the button that would cross it is disabled.
 *
 * A drag reports `onChangeStart` once, `onChange` on every step and `onChangeEnd` once, so a
 * consumer can wrap the whole drag in one undo entry. A keyboard step or a typed commit is one
 * complete gesture of its own.
 *
 * Every stop carries an `id`, which keeps the right controls attached to the right stop as stops
 * are added, removed and reordered. Build stops with `createColorStop`.
 * @param props - Component props
 * @param props.stops - The gradient's colour stops, when you drive the editor from your own state
 * @param props.defaultStops - The stops the editor starts with when it keeps its own state
 * @param props.direction - The angle the gradient runs at, when you drive the editor from your own state
 * @param props.defaultDirection - The angle the editor starts at when it keeps its own state
 * @param props.showDirection - Whether to offer the direction row
 * @param props.onChange - Called whenever the gradient changes, with both halves of it
 * @param props.onChangeStart - Called once when a change to a position or to the direction begins
 * @param props.onChangeEnd - Called once when such a change settles, with the gradient it settled on
 * @param props.minStops - The fewest stops the reader can reduce the gradient to
 * @param props.maxStops - The most stops the reader can build up to
 * @param props.labels - English names for the flip and rotate buttons
 * @returns The gradient editor
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
 * />
 * ```
 */
export function GradientEditor({
    stops,
    defaultStops,
    direction,
    defaultDirection = 0,
    showDirection = true,
    onChange,
    onChangeStart,
    onChangeEnd,
    minStops = DEFAULT_MIN_STOPS,
    maxStops = DEFAULT_MAX_STOPS,
    labels: labelOverrides,
}: GradientEditorProps): React.JSX.Element {
    const labels = useLabels();
    const editorLabels = { ...DEFAULT_EDITOR_LABELS, ...labelOverrides };
    const formatNumber = useNumberFormatter({ maximumFractionDigits: 0 });
    const stopsHeadingId = useId();
    const directionHeadingId = useId();

    // Built once: every call mints fresh ids.
    const fallbackStops = useMemo(() => createDefaultGradientStops(), []);

    // Each half reports both halves, so a consumer never has to work out which one moved.
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
        finalValue: 0,
        onChange: (nextDirection: number, event?: React.SyntheticEvent): void => {
            onChange?.(stopsValue, nextDirection, event);
        },
    });

    const [selectedId, setSelectedId] = useState<string | undefined>(stopsValue[0]?.id);
    const selected = stopsValue.find((stop) => stop.id === selectedId) ?? stopsValue[0];

    // The latest stops, for the end of a drag (the release arrives after several renders).
    const latest = useRef(stopsValue);
    latest.current = stopsValue;
    const areaRef = useRef<HTMLDivElement>(null);
    const drag = useRef<{ index: number; pointerId: number } | null>(null);
    // The handle to focus once a keyboard delete has rendered: the one that took the removed
    // stop's place, or the new last one. Without it focus falls to the page body.
    const refocus = useRef<number | null>(null);

    useEffect(() => {
        const index = refocus.current;
        refocus.current = null;
        if (index === null) {
            return;
        }
        const handles = areaRef.current?.querySelectorAll<HTMLElement>(".cm-gradient-handle");
        if (handles !== undefined && handles.length > 0) {
            handles[Math.min(index, handles.length - 1)].focus();
        }
    }, [stopsValue]);

    const percent = (value: number): string => labels.percent(formatNumber.format(value));
    const degrees = (value: number): string => labels.degrees(formatNumber.format(value));

    /**
     * The stops with one stop moved.
     * @param index - which stop
     * @param position - where to, as a percentage
     * @returns a new array of stops
     */
    const withStopOffset = (index: number, position: number): ColorStop[] =>
        latest.current.map((stop, i) =>
            i === index ? { ...stop, offset: clampPercent(position) / POSITION_MAX } : stop,
        );

    /**
     * One complete gesture: start, change, end.
     * @param next - the stops it settles on
     * @param event - what caused it
     */
    const stepStops = (next: ColorStop[], event?: React.SyntheticEvent): void => {
        onChangeStart?.();
        setStops(next, event);
        latest.current = next;
        onChangeEnd?.(next, directionValue);
    };

    const addStop = (event: React.MouseEvent<HTMLButtonElement>): void => {
        if (stopsValue.length >= maxStops) {
            return;
        }
        const last = stopsValue[stopsValue.length - 1];
        const newOffset = last === undefined ? 0.5 : (last.offset + 1) / 2;
        const added = createColorStop(newOffset, DEFAULT_GRADIENT_STOP_COLOR);
        const nextStops = [...stopsValue, added].sort((a, b) => a.offset - b.offset);
        setSelectedId(added.id);
        setStops(nextStops, event);
    };

    const removeStop = (index: number, event: React.SyntheticEvent): void => {
        if (stopsValue.length <= minStops) {
            return;
        }
        setStops(
            stopsValue.filter((_, i) => i !== index),
            event,
        );
    };

    /**
     * A click on the bar adds a stop there, its colour mixed from the stops either side.
     * @param event - the click
     */
    const addStopAt = (event: React.MouseEvent<HTMLDivElement>): void => {
        if (stopsValue.length >= maxStops) {
            return;
        }
        const rect = event.currentTarget.getBoundingClientRect();
        if (rect.width === 0) {
            return;
        }
        const offset =
            Math.round(clampPercent(((event.clientX - rect.left) / rect.width) * POSITION_MAX)) / POSITION_MAX;
        const sorted = [...stopsValue].sort((a, b) => a.offset - b.offset);
        const after = sorted.find((stop) => stop.offset >= offset) ?? sorted[sorted.length - 1];
        const before = [...sorted].reverse().find((stop) => stop.offset <= offset) ?? sorted[0];
        const span = after.offset - before.offset;
        const color = span > 0 ? mixHex(before.color, after.color, (offset - before.offset) / span) : before.color;
        const added = createColorStop(offset, color);
        setSelectedId(added.id);
        setStops(
            [...stopsValue, added].sort((a, b) => a.offset - b.offset),
            event,
        );
    };

    const handlePointerDown = (index: number, event: React.PointerEvent<HTMLDivElement>): void => {
        setSelectedId(stopsValue[index].id);
        if (event.button > 0) {
            return;
        }
        event.currentTarget.focus();
        // jsdom has no pointer capture; browsers always do.
        if ("setPointerCapture" in event.currentTarget) {
            event.currentTarget.setPointerCapture(event.pointerId);
        }
        drag.current = { index, pointerId: event.pointerId };
        onChangeStart?.(event);
    };

    const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>): void => {
        const area = areaRef.current;
        if (drag.current === null || area === null) {
            return;
        }
        const rect = area.getBoundingClientRect();
        if (rect.width === 0) {
            return;
        }
        const position = Math.round(((event.clientX - rect.left) / rect.width) * POSITION_MAX);
        const next = withStopOffset(drag.current.index, position);
        if (next[drag.current.index].offset !== latest.current[drag.current.index].offset) {
            latest.current = next;
            setStops(next);
        }
    };

    const handlePointerUp = (): void => {
        if (drag.current === null) {
            return;
        }
        drag.current = null;
        onChangeEnd?.(latest.current, directionValue);
    };

    const handleHandleKeys = (index: number, event: React.KeyboardEvent<HTMLDivElement>): void => {
        const current = stopsValue[index].offset * POSITION_MAX;
        const step = event.shiftKey ? SHIFT_STEP : 1;
        const targets: Record<string, number> = {
            ArrowRight: current + step,
            ArrowUp: current + step,
            ArrowLeft: current - step,
            ArrowDown: current - step,
            Home: 0,
            End: POSITION_MAX,
        };
        if (event.key === "Delete" || event.key === "Backspace") {
            event.preventDefault();
            if (stopsValue.length > minStops) {
                refocus.current = index;
            }
            removeStop(index, event);
            return;
        }
        if (!(event.key in targets)) {
            return;
        }
        event.preventDefault();
        const next = withStopOffset(index, Math.round(targets[event.key]));
        if (next[index].offset !== stopsValue[index].offset) {
            stepStops(next, event);
        }
    };

    const flip = (event: React.MouseEvent<HTMLButtonElement>): void => {
        const flipped = stopsValue.map((stop) => ({ ...stop, offset: 1 - stop.offset })).reverse();
        setStops(flipped, event);
    };

    const rotate = (event: React.MouseEvent<HTMLButtonElement>): void => {
        setDirection((directionValue + QUARTER_TURN) % FULL_TURN, event);
    };

    const commitDirection = (angle: number, event: React.SyntheticEvent): void => {
        onChangeStart?.();
        setDirection(angle, event);
        onChangeEnd?.(stopsValue, angle);
    };

    const gradientCss = [...stopsValue]
        .sort((a, b) => a.offset - b.offset)
        .map((stop) => `${stop.color} ${stop.offset * POSITION_MAX}%`)
        .join(", ");

    const atMax = stopsValue.length >= maxStops;
    const atMin = stopsValue.length <= minStops;

    return (
        <div className="cm-gradient" data-testid="gradient-editor">
            {showDirection && (
                <div
                    className="cm-gradient-row cm-gradient-direction"
                    data-testid="gradient-editor-direction"
                    role="group"
                    aria-labelledby={directionHeadingId}
                >
                    <span
                        id={directionHeadingId}
                        className="cm-visually-hidden"
                        data-testid="gradient-editor-direction-heading"
                    >
                        {labels.direction}
                    </span>
                    <UnitField
                        className="cm-field cm-gradient-angle"
                        role="spinbutton"
                        min={0}
                        max={FULL_TURN}
                        ariaLabel={labels.gradientDirection}
                        testId="gradient-editor-direction-input"
                        value={directionValue}
                        format={degrees}
                        normalize={(angle) => ((Math.round(angle) % FULL_TURN) + FULL_TURN) % FULL_TURN}
                        onCommit={commitDirection}
                    />
                    <ActionIcon
                        className="cm-gradient-end"
                        variant="subtle"
                        size={PANEL_GRID.TRAIL}
                        aria-label={editorLabels.flip}
                        data-testid="gradient-editor-flip"
                        onClick={flip}
                    >
                        <SwapGlyph />
                    </ActionIcon>
                    <ActionIcon
                        variant="subtle"
                        size={PANEL_GRID.TRAIL}
                        aria-label={editorLabels.rotate}
                        data-testid="gradient-editor-rotate"
                        onClick={rotate}
                    >
                        <RotateShapeGlyph />
                    </ActionIcon>
                </div>
            )}

            <div role="group" aria-labelledby={stopsHeadingId}>
                <div ref={areaRef} className="cm-gradient-area" data-testid="gradient-editor-bar-area">
                    {stopsValue.map((stop, index) => (
                        <div
                            key={stop.id}
                            className="cm-gradient-handle cm-focus-outside"
                            data-testid="gradient-editor-handle"
                            data-selected={stop.id === selected?.id || undefined}
                            role="slider"
                            tabIndex={0}
                            aria-label={labels.colorStopPosition(formatNumber.format(index + 1))}
                            aria-valuemin={0}
                            aria-valuemax={POSITION_MAX}
                            aria-valuenow={Math.round(stop.offset * POSITION_MAX)}
                            aria-valuetext={percent(Math.round(stop.offset * POSITION_MAX))}
                            style={{ "--cm-offset": stop.offset } as React.CSSProperties}
                            onFocus={() => {
                                setSelectedId(stop.id);
                            }}
                            onPointerDown={(event) => {
                                handlePointerDown(index, event);
                            }}
                            onPointerMove={handlePointerMove}
                            onPointerUp={handlePointerUp}
                            onPointerCancel={handlePointerUp}
                            onKeyDown={(event) => {
                                handleHandleKeys(index, event);
                            }}
                        >
                            <span
                                className="cm-gradient-handle-chit"
                                style={{ "--cm-chit-color": stop.color } as React.CSSProperties}
                            />
                        </div>
                    ))}
                    <div
                        className="cm-gradient-bar"
                        // A pointer shortcut only: the "+" button is the keyboard route to a new stop.
                        role="presentation"
                        aria-hidden
                        data-testid="gradient-editor-bar"
                        style={{ "--cm-gradient": gradientCss } as React.CSSProperties}
                        onClick={addStopAt}
                    />
                </div>

                <div className="cm-gradient-header">
                    <span id={stopsHeadingId} data-testid="gradient-editor-heading">
                        {labels.colorStops}
                    </span>
                    <ActionIcon
                        variant="subtle"
                        size={PANEL_GRID.TRAIL}
                        data-testid="gradient-editor-add-stop"
                        onClick={addStop}
                        disabled={atMax}
                        aria-label={labels.addColorStop}
                    >
                        <UiGlyph name="plus" />
                    </ActionIcon>
                </div>

                <div className="cm-gradient-stops" data-testid="gradient-editor-stops">
                    {stopsValue.map((stop, index) => {
                        const ordinal = formatNumber.format(index + 1);

                        return (
                            <div
                                key={stop.id}
                                className="cm-gradient-row cm-gradient-stop"
                                data-testid="gradient-editor-stop"
                                data-selected={stop.id === selected?.id || undefined}
                                onPointerDown={() => {
                                    setSelectedId(stop.id);
                                }}
                                onFocus={() => {
                                    setSelectedId(stop.id);
                                }}
                            >
                                <UnitField
                                    className="cm-field cm-gradient-position"
                                    ariaLabel={labels.colorStopPosition(ordinal)}
                                    testId="gradient-editor-stop-position"
                                    value={Math.round(stop.offset * POSITION_MAX)}
                                    format={percent}
                                    normalize={(position) => Math.round(clampPercent(position))}
                                    onCommit={(position, event) => {
                                        stepStops(withStopOffset(index, position), event);
                                    }}
                                />
                                <div className="cm-gradient-color">
                                    <CompactColorInput
                                        color={stop.color}
                                        defaultColor={DEFAULT_GRADIENT_STOP_COLOR}
                                        showOpacity={false}
                                        showReset={false}
                                        width="100%"
                                        onColorChange={(color, event) => {
                                            setStops(
                                                stopsValue.map((s, i) =>
                                                    i === index
                                                        ? { ...s, color: color ?? DEFAULT_GRADIENT_STOP_COLOR }
                                                        : s,
                                                ),
                                                event,
                                            );
                                        }}
                                    />
                                </div>
                                <ActionIcon
                                    variant="subtle"
                                    size={PANEL_GRID.TRAIL}
                                    onClick={(event) => {
                                        removeStop(index, event);
                                    }}
                                    data-testid="gradient-editor-remove-stop"
                                    disabled={atMin}
                                    aria-label={labels.removeColorStop(ordinal)}
                                >
                                    <UiGlyph name="minus" />
                                </ActionIcon>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
