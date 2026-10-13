import { Box, UnstyledButton } from "@mantine/core";
import React, { useRef } from "react";

import { PANEL_GRID, PANEL_INK } from "../constants/panel";
import { useNumberFormatter } from "../i18n";
import { useCompactStyles } from "../theme/useCompactStyles";
import { useDirection } from "../utils/rtl";
import { ToggleIconButton } from "./buttons";
import { shieldDragSelection } from "./chrome/dragSelectionShield";
import { SwapGlyph, UnitField } from "./GradientEditor";
import { HISTOGRAM_AXIS_INSET, HistogramRow } from "./rows/ChartRow";
import { StyleSelect, type StyleSelectOption } from "./StyleSelect";

// The ramp editor: a mapping from a value to a look, drawn on the value's own axis. The caller
// computes everything -- the bins, what each paints, the counts, the step bounds -- usually from
// one preview call of the thing that will paint, so the picture is exactly what gets painted.
// This control computes no scale: every handle sits on an edge between two of the caller's bins
// (or wherever the caller's value falls inside one), and every value it reports is one of the
// caller's bin edges or a number the reader typed.
//
// Accessibility: every handle is an APG "Slider" (role=slider; Arrow keys one bin or one `step`,
// Page Up / Page Down a larger jump, Home / End the data's ends), its value spoken in the caller's own words (`describe`). The typed fields below
// are the precise path. The histogram stays one named image with its table of values behind it.

/** One bin of the value axis, lowest first; the bins are contiguous and drawn at equal width. */
export interface RampEditorBin {
    /** The lower edge, in the data's units. */
    from: number;
    /** The upper edge, in the data's units. */
    to: number;
    /** How many elements fall in it. */
    count: number;
    /** What the values in it are painted, as a CSS color; the bar is drawn in it. */
    paint?: string;
    /** The bin in words for its tooltip and the table of values, such as `"3 to 4: 12 nodes"`. */
    label: string;
}

/** A palette offered in the palette select, drawn as a strip of its colors. */
export interface RampEditorPalette {
    /** What is stored when it is picked. */
    value: string;
    /** Its name. */
    label: string;
    /** Its colors, lowest first, as CSS colors. */
    stops: string[];
}

/** Which handle a value or a description belongs to. */
export type RampEditorHandle = "domainLow" | "domainHigh" | "midpoint" | "clampLow" | "clampHigh";

/** The words the editor draws or speaks; English by default. */
export interface RampEditorLabels {
    /** Each handle's accessible name. */
    handles: Record<RampEditorHandle, string>;
    /** The typed fields' names, drawn above them: where the ramp starts and ends, in the data's units. */
    from: string;
    to: string;
    midpoint: string;
    /** The scale select's name. */
    scale: string;
    /** The palette select's name. */
    palette: string;
    /** The reverse toggle's name. */
    reverse: string;
    /** A clamp tail's count, such as "14 outside". */
    outside: (count: string) => string;
    /** The no-value chit, such as "No value: 3". */
    noValue: (count: string) => string;
}

const DEFAULT_LABELS: RampEditorLabels = {
    handles: {
        domainLow: "Ramp start",
        domainHigh: "Ramp end",
        midpoint: "Midpoint",
        clampLow: "Lower clamp",
        clampHigh: "Upper clamp",
    },
    from: "Starts at",
    to: "Ends at",
    midpoint: "Midpoint",
    scale: "Scale",
    palette: "Palette",
    reverse: "Reverse palette",
    outside: (count) => `${count} outside`,
    noValue: (count) => `No value: ${count}`,
};

/** Props for the RampEditor component. */
export interface RampEditorProps {
    /** What the ramp maps, such as `"Node color by degree"`: the histogram's accessible name. */
    label: string;
    /** The value axis: the data's bins, lowest first, spanning the data's ends. */
    bins: RampEditorBin[];
    /** The domain's two ends, in the data's units. */
    domain: [number, number];
    /** Called with the new domain when a domain handle moves or a domain field is typed. */
    onDomainChange?: (domain: [number, number]) => void;
    /** A diverging ramp's middle value; absent, no midpoint handle is drawn. */
    midpoint?: number;
    /** Called when the midpoint handle moves or its field is typed. */
    onMidpointChange?: (midpoint: number) => void;
    /**
     * The clamp: two values and how many elements lie beyond each. Absent, no brackets are drawn.
     */
    clamp?: { low: number; high: number; below: number; above: number };
    /** Called when a clamp bracket moves. */
    onClampChange?: (clamp: [number, number]) => void;
    /**
     * The smallest move of a handle, in the data's units: pass 1 for whole-number data (a count, a
     * rank), so the arrows move 1, 2, 3 and a drag lands on whole numbers. Absent, the arrows move
     * from one bin edge to the next. Page Up and Page Down move about a tenth of the data either way.
     */
    step?: number;
    /** Where a stepped ramp changes step, in the data's units: drawn as cut lines on the bars. */
    steps?: number[];
    /**
     * A handle's value in the reader's terms, its `aria-valuetext`: "Lowest color at degree 3,
     * 12th percentile".
     */
    describe: (handle: RampEditorHandle, value: number) => string;
    /** Formats a value for the axis ends and the typed fields. Defaults to the locale's numbers. */
    formatValue?: (value: number) => string;
    /**
     * The scale set here, or undefined when none is (the select then shows `defaultScale` and
     * offers no reset), and the scales offered (a glyph per scale draws its curve).
     */
    scale?: string;
    /** The scale in force when none is set here. */
    defaultScale?: string;
    scales?: StyleSelectOption[];
    /** Called with a picked scale, or undefined when the reader resets it. */
    onScaleChange?: (scale: string | undefined) => void;
    /** The palette set here (undefined: none is, as for `scale`), and the palettes offered. */
    palette?: string;
    /** The palette in force when none is set here. */
    defaultPalette?: string;
    palettes?: RampEditorPalette[];
    /** Called with a picked palette, or undefined when the reader resets it. */
    onPaletteChange?: (palette: string | undefined) => void;
    /** Whether the palette runs high to low. Omit `onReverseChange` to hide the toggle. */
    reverse?: boolean;
    onReverseChange?: (reverse: boolean) => void;
    /**
     * Elements with no value: how many, and what they are painted (a CSS color), or null when they
     * are skipped. Absent, the chit is not drawn.
     */
    noValue?: { count: number; paint: string | null };
    /** Called with true to paint elements with no value, false to skip them. */
    onNoValueChange?: (paint: boolean) => void;
    /** Replace any of the English words. */
    labels?: Partial<RampEditorLabels>;
}

/** The handle track under the bars, tall enough for a 12px caret and its 24px hit area. */
const TRACK_HEIGHT = 16;

/** A handle's hit area: wider than its caret, so it is easy to catch. */
const HANDLE_HIT = 16;

/** A clamp tail's shade over the bars. */
const TAIL_SHADE = "color-mix(in srgb, var(--cm-bg) 70%, transparent)";

/**
 * Where a value sits on the axis, from 0 to 1: its bin's place, plus how far into the bin it is.
 * A value past the data's ends sits at that end.
 * @param bins - the axis
 * @param value - the value
 * @returns the fraction
 */
function fractionOf(bins: RampEditorBin[], value: number): number {
    const n = bins.length;
    if (n === 0 || value <= bins[0].from) {
        return 0;
    }
    for (let i = 0; i < n; i++) {
        const { from, to } = bins[i];
        if (value <= to) {
            return (i + (to === from ? 1 : (value - from) / (to - from))) / n;
        }
    }
    return 1;
}

/**
 * The bin edges, lowest first: the only values a dragged or stepped handle takes.
 * @param bins - the axis
 * @returns n + 1 edges
 */
function edgesOf(bins: RampEditorBin[]): number[] {
    return bins.length === 0 ? [] : [bins[0].from, ...bins.map((bin) => bin.to)];
}

/**
 * A value rounded to a whole number of steps, without the float dust of `0.1 * 3`.
 * @param value - the value
 * @param step - the step
 * @returns the rounded value
 */
function snap(value: number, step: number): number {
    return Number((Math.round(value / step) * step).toPrecision(12));
}

/**
 * The edge one step from a value: the next edge above it, or the last edge below it.
 * @param edges - the edges
 * @param value - where the handle is
 * @param up - which way
 * @returns the edge, or the value when there is none that way
 */
function stepFrom(edges: number[], value: number, up: boolean): number {
    if (up) {
        return edges.find((edge) => edge > value) ?? value;
    }
    return [...edges].reverse().find((edge) => edge < value) ?? value;
}

/** Props for the internal Handle. */
interface HandleProps {
    which: RampEditorHandle;
    value: number;
    fraction: number;
    name: string;
    valueText: string;
    min: number;
    max: number;
    shape: "caret" | "diamond" | "bracketLow" | "bracketHigh";
    onMove: (value: number) => void;
    edges: number[];
    step: number | undefined;
    edgeAt: (clientX: number) => number | null;
}

/**
 * One draggable, keyboard-steppable handle.
 * @param props - Component props
 * @param props.which - which handle
 * @param props.value - its value
 * @param props.fraction - where it sits on the axis
 * @param props.name - its accessible name
 * @param props.valueText - its value in words
 * @param props.min - the data's low end
 * @param props.max - the data's high end
 * @param props.shape - how it is drawn
 * @param props.onMove - called with a new value
 * @param props.edges - the bin edges
 * @param props.step - the smallest move, or undefined to move by bin edges
 * @param props.edgeAt - the edge nearest a pointer position
 * @returns the handle
 */
function Handle({
    which,
    value,
    fraction,
    name,
    valueText,
    min,
    max,
    shape,
    onMove,
    edges,
    step,
    edgeAt,
}: HandleProps): React.JSX.Element {
    const dragging = useRef(false);
    const bracket = shape === "bracketLow" || shape === "bracketHigh";

    const move = (next: number): void => {
        if (next !== value) {
            onMove(next);
        }
    };

    /**
     * The value one move away: one step (or one bin edge), or for a page about a tenth of the data.
     * @param up - which way
     * @param page - whether it is a page move
     * @returns the value, kept within the data's ends
     */
    const along = (up: boolean, page: boolean): number => {
        if (step === undefined) {
            const hops = page ? Math.max(2, Math.ceil((edges.length - 1) / 10)) : 1;
            let next = value;
            for (let i = 0; i < hops; i++) {
                next = stepFrom(edges, next, up);
            }
            return Math.min(max, Math.max(min, next));
        }
        // A page is a tenth of the data, not of this handle's range, so both handles page alike.
        const span = (edges.at(-1) ?? max) - (edges[0] ?? min);
        const by = page ? step * Math.max(2, Math.round(span / step / 10)) : step;
        return Math.min(max, Math.max(min, snap(value + (up ? by : -by), step)));
    };

    const keys: Record<string, () => number> = {
        ArrowRight: () => along(true, false),
        ArrowUp: () => along(true, false),
        ArrowLeft: () => along(false, false),
        ArrowDown: () => along(false, false),
        PageUp: () => along(true, true),
        PageDown: () => along(false, true),
        Home: () => min,
        End: () => max,
    };

    return (
        <div
            role="slider"
            tabIndex={0}
            className="cm-focus-outside"
            data-testid={`ramp-editor-${which}`}
            aria-label={name}
            aria-valuemin={min}
            aria-valuemax={max}
            aria-valuenow={value}
            aria-valuetext={valueText}
            title={valueText}
            style={{
                position: "absolute",
                insetInlineStart: `calc(${String(fraction * 100)}% - ${String(HANDLE_HIT / 2)}px)`,
                top: 0,
                bottom: 0,
                width: HANDLE_HIT,
                display: "flex",
                justifyContent: "center",
                alignItems: bracket ? "stretch" : "flex-start",
                cursor: "ew-resize",
                touchAction: "none",
            }}
            onPointerDown={(event) => {
                if (event.button > 0) {
                    return;
                }
                event.currentTarget.focus();
                event.currentTarget.setPointerCapture(event.pointerId);
                dragging.current = true;
                shieldDragSelection();
            }}
            onPointerMove={(event) => {
                if (!dragging.current) {
                    return;
                }
                const next = edgeAt(event.clientX);
                if (next !== null) {
                    move(next);
                }
            }}
            onPointerUp={() => {
                dragging.current = false;
            }}
            onPointerCancel={() => {
                dragging.current = false;
            }}
            onKeyDown={(event) => {
                const target = keys[event.key];
                if (target === undefined) {
                    return;
                }
                event.preventDefault();
                move(target());
            }}
        >
            <span
                aria-hidden="true"
                style={
                    bracket
                        ? {
                              width: 4,
                              borderBlock: `2px solid ${PANEL_INK.VALUE}`,
                              [shape === "bracketLow" ? "borderInlineStart" : "borderInlineEnd"]:
                                  `2px solid ${PANEL_INK.VALUE}`,
                              boxSizing: "border-box",
                          }
                        : {
                              marginTop: 2,
                              width: 10,
                              height: 10,
                              background: PANEL_INK.VALUE,
                              clipPath:
                                  shape === "diamond"
                                      ? "polygon(50% 0, 100% 50%, 50% 100%, 0 50%)"
                                      : "polygon(50% 0, 100% 100%, 0 100%)",
                          }
                }
            />
        </div>
    );
}

/**
 * A mapping from a value to a look, edited on the value's own axis: the value's histogram with
 * each bar painted what its values get, handles under the bars for the domain's ends (and a
 * diverging ramp's midpoint), clamp brackets over the bars with each shaded tail counted, the cut
 * lines of a stepped ramp, a scale select, a palette select with Reverse, a chit for elements with
 * no value, and typed fields for the exact numbers.
 *
 * It computes nothing about the mapping: pass it the bins, paints, counts and steps of the thing
 * that will paint (graphty-element's `styles.preview`), and it reports the values the reader
 * picks. A dragged or arrowed handle lands on an edge between two bins; Home and End reach the
 * data's ends.
 * @param props - Component props
 * @param props.label - what the ramp maps
 * @param props.bins - the value axis
 * @param props.domain - the domain's two ends
 * @param props.onDomainChange - called with a new domain
 * @param props.midpoint - a diverging ramp's middle value
 * @param props.onMidpointChange - called with a new midpoint
 * @param props.clamp - the clamp and the counts beyond it
 * @param props.onClampChange - called with a new clamp
 * @param props.step - the smallest move of a handle, such as 1 for whole-number data
 * @param props.steps - a stepped ramp's cut values
 * @param props.describe - a handle's value in the reader's terms
 * @param props.formatValue - formats a value
 * @param props.scale - the scale set here
 * @param props.defaultScale - the scale in force when none is set
 * @param props.scales - the scales offered
 * @param props.onScaleChange - called with a new scale
 * @param props.palette - the palette set here
 * @param props.defaultPalette - the palette in force when none is set
 * @param props.palettes - the palettes offered
 * @param props.onPaletteChange - called with a new palette
 * @param props.reverse - whether the palette runs high to low
 * @param props.onReverseChange - called with a new reverse
 * @param props.noValue - elements with no value
 * @param props.onNoValueChange - called to paint or skip them
 * @param props.labels - replacement words
 * @returns the ramp editor
 * @example
 * ```tsx
 * <RampEditor
 *     label="Node color by degree"
 *     bins={preview.bins.map((bin) => ({ from: bin.from, to: bin.to, count: bin.count, paint: bin.paints, label: `${bin.from} to ${bin.to}: ${bin.count}` }))}
 *     domain={domain}
 *     onDomainChange={setDomain}
 *     describe={(handle, value) => `${handle === "domainLow" ? "Lowest" : "Highest"} color at degree ${value}`}
 * />
 * ```
 */
export function RampEditor({
    label,
    bins,
    domain,
    onDomainChange,
    midpoint,
    onMidpointChange,
    clamp,
    onClampChange,
    step,
    steps = [],
    describe,
    formatValue,
    scale,
    defaultScale,
    scales,
    onScaleChange,
    palette,
    defaultPalette,
    palettes,
    onPaletteChange,
    reverse = false,
    onReverseChange,
    noValue,
    onNoValueChange,
    labels: overrides,
}: RampEditorProps): React.JSX.Element {
    useCompactStyles();
    const labels = { ...DEFAULT_LABELS, ...overrides, handles: { ...DEFAULT_LABELS.handles, ...overrides?.handles } };
    const numbers = useNumberFormatter();
    const format = formatValue ?? ((value: number): string => numbers.format(value));
    const direction = useDirection();
    const trackRef = useRef<HTMLDivElement>(null);
    const edges = edgesOf(bins);
    const min = edges[0] ?? 0;
    const max = edges[edges.length - 1] ?? 0;
    const [low, high] = domain;

    /**
     * The edge nearest a pointer position on the track.
     * @param clientX - the pointer's x
     * @returns the edge, or null when the track has no width
     */
    const edgeAt = (clientX: number): number | null => {
        const rect = trackRef.current?.getBoundingClientRect();
        if (rect === undefined || rect.width === 0 || edges.length === 0) {
            return null;
        }
        const along = direction === "rtl" ? rect.right - clientX : clientX - rect.left;
        const index = Math.round(Math.min(1, Math.max(0, along / rect.width)) * bins.length);
        return step === undefined ? edges[index] : snap(edges[index], step);
    };

    // The nearest value a handle may take beside another's, one step or one bin edge away.
    const beside = (value: number, up: boolean): number =>
        step === undefined ? stepFrom(edges, value, up) : snap(value + (up ? step : -step), step);

    const handle = (
        which: RampEditorHandle,
        value: number,
        shape: HandleProps["shape"],
        onMove: (value: number) => void,
        range: [number, number] = [min, max],
    ): React.JSX.Element => (
        <Handle
            which={which}
            value={value}
            fraction={fractionOf(bins, value)}
            name={labels.handles[which]}
            valueText={describe(which, value)}
            min={range[0]}
            max={range[1]}
            shape={shape}
            onMove={onMove}
            edges={edges}
            step={step}
            edgeAt={edgeAt}
        />
    );

    /**
     * A typed field with its name drawn above it, the precise path to a handle's value.
     * @param name - its name, drawn and spoken
     * @param testId - test id
     * @param value - its value
     * @param onCommit - called with a typed value
     * @returns the field
     */
    const field = (
        name: string,
        testId: string,
        value: number,
        onCommit: (value: number) => void,
    ): React.JSX.Element => (
        <label style={{ display: "flex", flexDirection: "column", flex: "1 1 0", minWidth: 0 }}>
            <span className="cm-field-label">{name}</span>
            <UnitField
                className="cm-field"
                ariaLabel={name}
                testId={testId}
                // A percentage width gives the input no minimum of its own (a text input's is
                // about 20 characters), so the two fields share any width and never widen a
                // 240 px pop-out.
                style={{ width: "100%" }}
                value={value}
                format={format}
                normalize={(typed) => typed}
                onCommit={onCommit}
            />
        </label>
    );

    const percent = (value: number): string => `${String(fractionOf(bins, value) * 100)}%`;
    const shownScale = scale ?? defaultScale;
    const shownPalette = palette ?? defaultPalette;
    const strip = (stops: string[]): string =>
        `linear-gradient(to ${direction === "rtl" ? "left" : "right"}, ${(reverse ? [...stops].reverse() : stops).join(", ")})`;

    return (
        <Box data-testid="ramp-editor" style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <Box style={{ position: "relative" }}>
                <HistogramRow
                    label={label}
                    bins={bins.map((bin) => ({ label: bin.label, count: bin.count, paint: bin.paint }))}
                    minLabel={format(min)}
                    maxLabel={format(max)}
                />
                <Box
                    aria-hidden={clamp === undefined ? true : undefined}
                    data-testid="ramp-editor-plot"
                    style={{ position: "absolute", inset: 0, bottom: HISTOGRAM_AXIS_INSET, pointerEvents: "none" }}
                >
                    {steps.map((step) => (
                        <span
                            key={step}
                            aria-hidden="true"
                            data-testid="ramp-editor-step"
                            style={{
                                position: "absolute",
                                top: 0,
                                bottom: 0,
                                insetInlineStart: percent(step),
                                borderInlineStart: `1px dashed ${PANEL_INK.VALUE}`,
                            }}
                        />
                    ))}
                    {clamp !== undefined && (
                        <>
                            <span
                                aria-hidden="true"
                                data-testid="ramp-editor-tail-low"
                                style={{
                                    position: "absolute",
                                    top: 0,
                                    bottom: 0,
                                    insetInlineStart: 0,
                                    width: percent(clamp.low),
                                    background: TAIL_SHADE,
                                }}
                            />
                            <span
                                aria-hidden="true"
                                data-testid="ramp-editor-tail-high"
                                style={{
                                    position: "absolute",
                                    top: 0,
                                    bottom: 0,
                                    insetInlineStart: percent(clamp.high),
                                    insetInlineEnd: 0,
                                    background: TAIL_SHADE,
                                }}
                            />
                            <Box style={{ position: "absolute", inset: 0, pointerEvents: "auto" }}>
                                {handle(
                                    "clampLow",
                                    clamp.low,
                                    "bracketLow",
                                    (value) => {
                                        onClampChange?.([Math.min(value, clamp.high), clamp.high]);
                                    },
                                    [min, clamp.high],
                                )}
                                {handle(
                                    "clampHigh",
                                    clamp.high,
                                    "bracketHigh",
                                    (value) => {
                                        onClampChange?.([clamp.low, Math.max(value, clamp.low)]);
                                    },
                                    [clamp.low, max],
                                )}
                            </Box>
                        </>
                    )}
                </Box>
            </Box>

            <Box ref={trackRef} data-testid="ramp-editor-track" style={{ position: "relative", height: TRACK_HEIGHT }}>
                {/* Each domain handle's range stops beside the other, so Home and End reach the
                    ends it can take (and aria-valuemin / max say so) instead of being refused. */}
                {handle(
                    "domainLow",
                    low,
                    "caret",
                    (value) => {
                        if (value < high) {
                            onDomainChange?.([value, high]);
                        }
                    },
                    [min, beside(high, false)],
                )}
                {handle(
                    "domainHigh",
                    high,
                    "caret",
                    (value) => {
                        if (value > low) {
                            onDomainChange?.([low, value]);
                        }
                    },
                    [beside(low, true), max],
                )}
                {midpoint !== undefined &&
                    handle("midpoint", midpoint, "diamond", (value) => onMidpointChange?.(value))}
            </Box>

            {(clamp !== undefined || noValue !== undefined) && (
                <Box
                    className="cm-chart-text"
                    style={{ display: "flex", alignItems: "center", gap: 8, minHeight: PANEL_GRID.CONTROL_HEIGHT }}
                >
                    {clamp !== undefined && (
                        <span data-testid="ramp-editor-outside-low">{labels.outside(numbers.format(clamp.below))}</span>
                    )}
                    {noValue !== undefined && (
                        <UnstyledButton
                            data-testid="ramp-editor-no-value"
                            className="cm-focus-outside"
                            aria-pressed={noValue.paint !== null}
                            disabled={onNoValueChange === undefined}
                            onClick={() => onNoValueChange?.(noValue.paint === null)}
                            style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                                marginInline: "auto",
                                paddingInline: 6,
                                height: 20,
                                borderRadius: 10,
                                border: `1px solid ${PANEL_INK.BORDER}`,
                                font: "inherit",
                                color: "inherit",
                            }}
                        >
                            <span
                                aria-hidden="true"
                                style={{
                                    width: 10,
                                    height: 10,
                                    borderRadius: 2,
                                    background: noValue.paint ?? "transparent",
                                    border: `1px ${noValue.paint === null ? "dashed" : "solid"} ${PANEL_INK.BORDER}`,
                                }}
                            />
                            {labels.noValue(numbers.format(noValue.count))}
                        </UnstyledButton>
                    )}
                    {clamp !== undefined && (
                        <span data-testid="ramp-editor-outside-high" style={{ marginInlineStart: "auto" }}>
                            {labels.outside(numbers.format(clamp.above))}
                        </span>
                    )}
                </Box>
            )}

            {(scales !== undefined || palettes !== undefined) && (
                <Box style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", gap: 8 }}>
                    {scales !== undefined && shownScale !== undefined && (
                        <Box style={{ flex: "1 0 100%", minWidth: 0 }}>
                            <StyleSelect
                                label={labels.scale}
                                value={scale}
                                defaultValue={shownScale}
                                options={scales}
                                onChange={(value) => onScaleChange?.(value)}
                            />
                        </Box>
                    )}
                    {palettes !== undefined && shownPalette !== undefined && (
                        <Box style={{ flex: "1 1 0", minWidth: 0 }}>
                            <StyleSelect
                                label={labels.palette}
                                value={palette}
                                defaultValue={shownPalette}
                                options={palettes.map((option) => ({
                                    value: option.value,
                                    label: option.label,
                                    glyph: (
                                        <span
                                            data-testid="ramp-editor-strip"
                                            style={{
                                                display: "block",
                                                width: 16,
                                                height: 8,
                                                marginBlock: 4,
                                                borderRadius: 2,
                                                background: strip(option.stops),
                                            }}
                                        />
                                    ),
                                }))}
                                onChange={(value) => onPaletteChange?.(value)}
                            />
                        </Box>
                    )}
                    {onReverseChange !== undefined && (
                        <ToggleIconButton
                            label={labels.reverse}
                            checked={reverse}
                            onChange={onReverseChange}
                            icon={<SwapGlyph />}
                        />
                    )}
                </Box>
            )}

            <Box style={{ display: "flex", gap: 8 }}>
                {field(labels.from, "ramp-editor-from", low, (value) => onDomainChange?.([value, high]))}
                {field(labels.to, "ramp-editor-to", high, (value) => onDomainChange?.([low, value]))}
                {midpoint !== undefined &&
                    field(labels.midpoint, "ramp-editor-midpoint-field", midpoint, (value) =>
                        onMidpointChange?.(value),
                    )}
            </Box>
        </Box>
    );
}
