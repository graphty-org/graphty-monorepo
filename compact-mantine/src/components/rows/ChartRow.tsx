import { Box, Progress, VisuallyHidden } from "@mantine/core";
import React, { useId } from "react";

import { PANEL_GRID, PANEL_INK } from "../../constants/panel";
import { useLabels, useNumberFormatter, useOrdinalFormatter } from "../../i18n";
import { type ActivationHandlerWithMeta, getActivationMeta } from "../../types/events";
import { liveRegionProps,type LiveSetting } from "../../utils/live-region";
import { type Direction, inlineX, useDirection } from "../../utils/rtl";
import { RankChip } from "./DataRow";
import { holdsSomething, TrailingSlot } from "./TrailingSlot";

// Accessibility, for all three rows in this file. There is no ARIA Authoring
// Practices *widget* pattern for a chart, because a chart is not a widget: the
// applicable guidance is WAI-ARIA's `img` role together with the WAI tutorial
// for complex images, which asks for a short text alternative on the picture
// and a full text alternative -- here a table -- somewhere a reader can reach.
// So each drawing is ONE role="img" with its own name, its marks are
// aria-hidden, and a visually hidden table beside it carries every value.
//
// Before this the three rows were, respectively: N nameless images (one per
// histogram bar), nothing at all (the sparkline's svg was aria-hidden with no
// text alternative anywhere), and a bar whose accessible name was its only
// content.
//
// The interactive metric row follows the APG Button pattern: role="button",
// tabIndex 0, and Enter and Space both activating.

// Section 3 of the hardening contract also asks for aria-live wherever content
// arrives asynchronously, which is the normal case here -- every one of these
// rows is filled in when a background algorithm run finishes. The live region
// is the chart itself (its name and its two axis-end values), never the table:
// a polite announcement of forty rows of numbers is worse than no announcement
// at all. `busy` sets aria-busy, which is what holds the announcement back
// until a run has finished rather than announcing every intermediate frame.

/**
 * The gap between a chart's plot, its baseline and the values under it.
 *
 * Not a `PANEL_GRID` member: the grid measures the panel, and this measures the
 * inside of one drawing.
 */
const CHART_GAP = 2;

/**
 * The 1px rule every chart in this family stands on.
 *
 * It is what says "this is a chart and not three loose rectangles", and it is
 * drawn even when the plot above it is empty.
 */
const BASELINE_HEIGHT = 1;

/**
 * The line the two axis-end labels are drawn on, under a histogram's baseline.
 *
 * 13px is an 11px face on a 1 line-height with room for a descender, which is
 * what keeps the plot, the baseline and the labels reading as one 64px block.
 */
const AXIS_ROW_HEIGHT = 13;

/**
 * The gap between two bars of a histogram.
 */
const BAR_GAP = 2;

/**
 * A bar's corner radius. Smaller than every radius in a colour ramp on purpose:
 * an 11px bar with a 4px radius reads as a lozenge rather than as a count.
 */
const BAR_RADIUS = 1;

/**
 * The shortest a bar with a non-zero count may draw.
 *
 * A bin holding one node beside a bin holding four hundred would otherwise
 * round to nothing, and a chart that draws a real count as absence is lying.
 */
const MIN_BAR_HEIGHT = 1;

/**
 * The width of a metric row's micro-bar.
 */
// Deliberately NOT PANEL_GRID.HISTOGRAM_HEIGHT: that member is two row pitches
// of chart height and this is a width, and the two are 64 by coincidence rather
// than by identity.
const MICRO_BAR_WIDTH = 64;

/**
 * The height of a metric row's micro-bar.
 */
// The same 4px the theme puts on Mantine's Progress, which is what this bar is
// built from.
const MICRO_BAR_HEIGHT = 4;

/**
 * The corner radius of a metric row's micro-bar: half its height, so the bar is
 * fully round at both ends.
 */
// Written as a border radius on the track and on the fill rather than passed as
// Progress's own `radius` prop, which Mantine 8.3.10 does not destructure out of
// ProgressRoot and therefore spreads onto the div as a `radius="2"` attribute
// that means nothing to a browser. The track clips its fill (`overflow: hidden`
// in Mantine's own stylesheet), so the two radii agree by construction.
const MICRO_BAR_RADIUS = MICRO_BAR_HEIGHT / 2;

/**
 * The gap between a glyph and a word, or a value and its neighbour, inside one
 * control.
 */
const INLINE_GAP = 4;

/**
 * The 12px body face a row's own name is set in.
 *
 * The compact type scale jumps 11 to 13, so this one role has no token to point
 * at. The 11px roles on these rows -- the axis ends, the value -- use
 * `--mantine-font-size-sm` like everything else.
 */
const NAME_FONT_SIZE = 12;

/**
 * The square user space a sparkline is drawn in before it is stretched to the
 * width of the row.
 */
const SPARKLINE_VIEWBOX = 100;

/**
 * The sparkline's stroke, matching the 1.5px of the glyph set.
 */
const SPARKLINE_STROKE = 1.5;

/**
 * The largest percentile a micro-bar can draw.
 */
const FULL_PERCENT = 100;

/**
 * One bar of a histogram.
 */
export interface HistogramBin {
    /**
     * What this bin holds, in words, such as `"3 links: 12 nodes"`.
     *
     * It is the bar's tooltip and its row in the chart's table of values, so
     * write it as a phrase a reader can understand on its own rather than as a
     * bare number.
     */
    label: string;
    /** How many things fell in this bin. The bar's height is this over the tallest bin's. */
    count: number;
    /** Draws this bar in the accent colour, for the bin the reader has selected or the one being explained. */
    highlighted?: boolean;
}

/**
 * Props for the HistogramRow component.
 */
export interface HistogramRowProps {
    /** The bins, in order along the axis. Each one carries its own label. */
    bins: HistogramBin[];
    /**
     * The chart's own name, such as `"Links per node"`.
     *
     * It becomes the accessible name of the drawing and the caption of the
     * table of values behind it, so a screen reader announces one named image
     * rather than a run of anonymous bars. The two axis-end values are added to
     * it as a description, so the announcement carries the range as well as the
     * name.
     *
     * Supply it: without it the drawing is hidden from assistive technology
     * altogether, and only the table remains.
     */
    label?: string;
    /** The value at the start of the axis. Always drawn: it is what lets the picture be read as the table it replaced. */
    minLabel: React.ReactNode;
    /** The value at the end of the axis. Always drawn: it is what lets the picture be read as the table it replaced. */
    maxLabel: React.ReactNode;
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
    /** The 24px trailing slot: an advanced settings button, a reset control, or nothing. */
    trailing?: React.ReactNode;
}

/**
 * Props for the SparklineRow component.
 */
export interface SparklineRowProps {
    /** The series, in order. Fewer than two values draws a flat line; none draws only the baseline. */
    values: number[];
    /**
     * The chart's own name, such as `"Layout settling"`.
     *
     * It becomes the accessible name of the drawing and the caption of the
     * table of values behind it, with the two axis-end values added to it as a
     * description. Supply it: without it the drawing is hidden from assistive
     * technology altogether, and only the table remains.
     */
    label?: string;
    /** The value at the start of the axis. Always drawn. */
    minLabel: React.ReactNode;
    /** The value at the end of the axis. Always drawn. */
    maxLabel: React.ReactNode;
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
    /** The 24px trailing slot: an advanced settings button, a reset control, or nothing. */
    trailing?: React.ReactNode;
}

/**
 * Props for the MetricRow component.
 */
export interface MetricRowProps {
    /** The metric's own name. Shown at 12px, and shortened with an ellipsis when the row is too narrow for it. */
    name: string;
    /** Where the value falls in its distribution, from 0 to 100. Values outside that range are clamped rather than drawn off the end of the bar. */
    percentile: number;
    /**
     * The number itself, drawn beside the bar. A chart never removes the last
     * path to the figure it draws.
     *
     * It is rendered exactly as given, so format it for your reader's locale
     * before passing it in -- `useNumberFormatter()` from this package is the
     * short way to do that.
     */
    value: React.ReactNode;
    /** The rank, such as `#6`. It is drawn inside a rank chip, so pass the content and not the chip. */
    rank?: React.ReactNode;
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
     * Called when the row is activated, by a pointer or by Enter or Space.
     *
     * The event comes first, so you can read modifier keys for a multiple
     * selection and call `preventDefault`. The second argument states whether
     * the activation came from a pointer or from the keyboard, which is the
     * distinction selection behaviour usually turns on.
     *
     * Supplying it makes the row a real button: focusable, with a pointer
     * cursor, and answering Enter and Space.
     * @example
     * ```tsx
     * <MetricRow
     *     name="Bridges"
     *     percentile={98}
     *     value="0.31"
     *     onClick={(event, meta) => {
     *         select(metric, {add: meta.source === "pointer" && event.shiftKey});
     *     }}
     * />
     * ```
     */
    onClick?: ActivationHandlerWithMeta;
    /** Called on a double click, for opening the metric rather than selecting it. */
    onDoubleClick?: React.MouseEventHandler<HTMLDivElement>;
    /** Called on a right click or a long press, for a context menu of your own. */
    onContextMenu?: React.MouseEventHandler<HTMLDivElement>;
    /** Called when the row takes focus. Forwarded untouched. */
    onFocus?: React.FocusEventHandler<HTMLDivElement>;
    /** Called when the row loses focus. Forwarded untouched. */
    onBlur?: React.FocusEventHandler<HTMLDivElement>;
}

/**
 * Props for the internal axis-end label.
 */
interface AxisLabelProps {
    /** The value drawn at one end of the axis. */
    children: React.ReactNode;
    /** Which end of the axis this is. */
    end: "min" | "max";
    /** Identifies the label so the drawing beside it can point at it. */
    id: string;
}

/**
 * One of the two axis-end values, at 11px secondary text.
 *
 * These are the only text a chart row draws, and they are never optional: they
 * are what lets the picture be read as the table it replaced, by a reader who
 * has not been taught to read a chart.
 * @param props - Component props
 * @param props.children - The value drawn at one end of the axis
 * @param props.end - Which end of the axis this is
 * @param props.id - Identifies the label so the drawing beside it can point at it
 * @returns The axis-end label
 */
function AxisLabel({ children, end, id }: AxisLabelProps): React.JSX.Element {
    return (
        <Box
            component="span"
            id={id}
            data-testid={`chart-axis-${end}`}
            style={{
                flex: "0 0 auto",
                minWidth: 0,
                fontSize: "var(--mantine-font-size-sm)",
                lineHeight: 1,
                color: PANEL_INK.CHROME,
                whiteSpace: "nowrap",
            }}
        >
            {children}
        </Box>
    );
}

/**
 * The 1px rule a chart stands on.
 * @returns The chart baseline
 */
function ChartBaseline(): React.JSX.Element {
    return (
        <Box
            data-testid="chart-baseline"
            style={{
                flex: "0 0 auto",
                height: BASELINE_HEIGHT,
                background: PANEL_INK.BORDER,
            }}
        />
    );
}

/**
 * One row of the table of values that stands behind a chart.
 */
interface ChartValueRow {
    /** A stable key for the row. */
    id: string;
    /** What the value describes: a bin's own label, or a position in a series. */
    header: React.ReactNode;
    /** The value itself, already formatted for the active locale. */
    value: string;
}

/**
 * Props for the internal table of values behind a chart.
 */
interface ChartValueTableProps {
    /** The chart's own name, drawn as the table's caption. */
    caption?: string;
    /** One row per mark in the drawing. */
    rows: ChartValueRow[];
    /** Identifies the table in tests. */
    testId: string;
}

/**
 * The table of values behind a chart, for a reader who cannot see the drawing.
 *
 * It is visually hidden rather than removed, so it stays in the accessibility
 * tree and a screen reader can walk it row by row -- which a picture, however
 * well named, can never be walked.
 * @param props - Component props
 * @param props.caption - The chart's own name, drawn as the table's caption
 * @param props.rows - One row per mark in the drawing
 * @param props.testId - Identifies the table in tests
 * @returns The visually hidden table of values
 */
function ChartValueTable({ caption, rows, testId }: ChartValueTableProps): React.JSX.Element {
    // The table IS the visually hidden element rather than sitting inside one:
    // a table nested in Mantine's VisuallyHidden span would be invalid markup,
    // and a server-rendered page would come back from the browser's parser with
    // a different tree than React built.
    return (
        <VisuallyHidden component="table" data-testid={testId}>
            {caption !== undefined && <caption>{caption}</caption>}
            <tbody>
                {rows.map((row) => (
                    <tr key={row.id}>
                        <th scope="row">{row.header}</th>
                        <td>{row.value}</td>
                    </tr>
                ))}
            </tbody>
        </VisuallyHidden>
    );
}

/**
 * The polyline points of a sparkline, in a 100 by 100 user space that is then
 * stretched to the width of the row.
 *
 * The series is normalised over its own extremes, because a sparkline reports
 * shape and the two axis-end labels report magnitude. A series with no range
 * draws down the middle rather than at the top or the bottom, and a series of
 * one value draws as a flat line across the row rather than as a single
 * invisible point.
 *
 * The first value is plotted at the inline start, which is the left edge when
 * text runs left to right and the right edge when it runs right to left. An SVG
 * user space has no notion of text direction, so a series plotted straight into
 * it would read backwards under reversed labels.
 * @param values - The series, in order
 * @param direction - The text direction in force
 * @returns The `points` attribute for the polyline, or null when there is nothing to draw
 */
function sparklinePoints(values: number[], direction: Direction): string | null {
    if (values.length === 0) {
        return null;
    }

    const middle = SPARKLINE_VIEWBOX / 2;

    if (values.length === 1) {
        return `0,${middle} ${SPARKLINE_VIEWBOX},${middle}`;
    }

    const lowest = Math.min(...values);
    const highest = Math.max(...values);
    const span = highest - lowest;
    const lastIndex = values.length - 1;

    return values
        .map((value, index) => {
            const x = inlineX(index / lastIndex, SPARKLINE_VIEWBOX, direction);
            const y = span === 0 ? middle : SPARKLINE_VIEWBOX - ((value - lowest) / span) * SPARKLINE_VIEWBOX;
            return `${x},${y}`;
        })
        .join(" ");
}

/**
 * The identifiers a chart gives its two axis-end labels.
 */
interface AxisIds {
    /** Identifies the label at the start of the axis. */
    min: string;
    /** Identifies the label at the end of the axis. */
    max: string;
    /** Both identifiers in reading order, ready for a drawing's `aria-describedby`. */
    describedBy: string;
}

/**
 * Names a chart's two axis-end labels so the drawing between them can cite them.
 *
 * A picture's accessible name says what it is; the range it covers is context,
 * and context belongs in a description rather than in the name. Pointing at the
 * two labels already on the row is what lets a screen reader announce "Links per
 * node, image, 2, 4" without the row drawing that text twice.
 * @returns The identifier of each axis-end label, and the two of them together
 */
function useAxisIds(): AxisIds {
    const base = useId();
    const min = `${base}min`;
    const max = `${base}max`;

    return { min, max, describedBy: `${min} ${max}` };
}

/**
 * A distribution drawn instead of the four numbers that summarise it.
 *
 * `min 2, median 3, max 4, standard deviation 0.62` is four numbers standing in
 * for a shape. A histogram draws the shape in the same space, and answers what
 * the four numbers cannot: is the distribution bimodal, does it have a long
 * tail, is this one hub and nineteen leaves. Reach for it for a distribution --
 * degree, betweenness, component size -- and never for two or three values,
 * which belong on a row of their own.
 *
 * The row is exactly two row pitches tall (64px) and there is no other height.
 * It carries no legend, no title and no summary line; what it does carry is a
 * tooltip on every bar and the two axis-end values, always, because those are
 * what let the picture be read as the table it replaced.
 *
 * Assistive technology gets the whole chart as one named image, plus a
 * visually hidden table listing every bin and its count. Give `label` the
 * chart's own name so both have one.
 * @param props - Component props
 * @param props.bins - The bins, in order along the axis, each with its own label
 * @param props.label - The chart's own name, used as its accessible name and as the caption of its table of values
 * @param props.minLabel - The value at the start of the axis
 * @param props.maxLabel - The value at the end of the axis
 * @param props.busy - Whether the chart is still being worked out by something that finishes later
 * @param props.live - How urgently a screen reader announces the chart when it changes on its own
 * @param props.trailing - The 24px trailing slot: an advanced settings button, a reset control, or nothing
 * @returns The histogram row
 * @example
 * ```tsx
 * <HistogramRow
 *     label="Links per node"
 *     bins={[
 *         {label: "2 links: 5 nodes", count: 5},
 *         {label: "3 links: 12 nodes", count: 12, highlighted: true},
 *         {label: "4 links: 3 nodes", count: 3},
 *     ]}
 *     minLabel="2"
 *     maxLabel="4"
 * />
 * ```
 */
export function HistogramRow({
    bins,
    label,
    minLabel,
    maxLabel,
    busy,
    live,
    trailing,
}: HistogramRowProps): React.JSX.Element {
    const formatNumber = useNumberFormatter();
    const axis = useAxisIds();

    // A bar is its count over the tallest bin's, so the tallest bar fills the
    // plot and the chart never needs a y axis. Nothing below zero raises it: a
    // count is a count.
    const tallest = bins.reduce((highest, bin) => Math.max(highest, bin.count, 0), 0);

    const valueRows = bins.map((bin, index) => ({
        id: `${bin.label}-${String(index)}`,
        header: bin.label,
        // The raw count, not the clamped one the bar draws: the table is the
        // record of what was measured, and silently rewriting a negative count
        // to zero would hide the defect that produced it.
        value: formatNumber.format(bin.count),
    }));

    return (
        <Box
            data-testid="histogram-row"
            aria-busy={busy}
            style={{
                display: "flex",
                // The trailing slot belongs to the row's first pitch, so it sits
                // at the top of a two-pitch chart rather than floating in it.
                alignItems: "flex-start",
                gap: PANEL_GRID.TRAIL_GAP,
                height: PANEL_GRID.HISTOGRAM_HEIGHT,
            }}
        >
            <Box
                data-testid="histogram-chart"
                // The live region is the drawing and its two axis ends -- short,
                // and exactly what changes when a background run finishes. The
                // table of values is deliberately outside it.
                {...liveRegionProps(live, busy)}
                style={{
                    flex: "1 1 auto",
                    minWidth: 0,
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    gap: CHART_GAP,
                }}
            >
                <Box
                    data-testid="histogram-drawing"
                    role={label === undefined ? undefined : "img"}
                    aria-label={label}
                    // The name says what the picture is; the two axis ends say
                    // what it spans, and they are cited rather than repeated so
                    // the row never draws the same text twice.
                    aria-describedby={label === undefined ? undefined : axis.describedBy}
                    // A picture with no name is worse than no picture: it is
                    // announced as "image" and nothing else. Without a label the
                    // drawing steps out of the accessibility tree and the table
                    // of values carries the whole chart on its own.
                    aria-hidden={label === undefined ? true : undefined}
                    style={{
                        flex: "1 1 auto",
                        minHeight: 0,
                        display: "flex",
                        flexDirection: "column",
                        gap: CHART_GAP,
                    }}
                >
                    <Box
                        data-testid="histogram-plot"
                        style={{
                            flex: "1 1 auto",
                            minHeight: 0,
                            display: "flex",
                            alignItems: "flex-end",
                            gap: BAR_GAP,
                        }}
                    >
                        {bins.map((bin, index) => {
                            const count = Math.max(0, bin.count);
                            const share = tallest === 0 ? 0 : (count / tallest) * FULL_PERCENT;
                            const highlighted = bin.highlighted === true;

                            return (
                                <Box
                                    key={`${bin.label}-${String(index)}`}
                                    data-testid="histogram-bar"
                                    data-highlighted={highlighted ? "true" : "false"}
                                    // One mark of a drawing, not a picture of its
                                    // own. The title stays: it is the tooltip a
                                    // sighted reader hovers for.
                                    aria-hidden="true"
                                    title={bin.label}
                                    style={{
                                        flex: "1 1 0",
                                        minWidth: 0,
                                        height: `${String(share)}%`,
                                        minHeight: count > 0 ? MIN_BAR_HEIGHT : 0,
                                        background: highlighted ? PANEL_INK.ACCENT : PANEL_INK.BORDER,
                                        borderRadius: BAR_RADIUS,
                                    }}
                                />
                            );
                        })}
                    </Box>

                    <ChartBaseline />
                </Box>

                <Box
                    data-testid="chart-axis"
                    style={{
                        flex: "0 0 auto",
                        height: AXIS_ROW_HEIGHT,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: INLINE_GAP,
                    }}
                >
                    <AxisLabel end="min" id={axis.min}>
                        {minLabel}
                    </AxisLabel>
                    <AxisLabel end="max" id={axis.max}>
                        {maxLabel}
                    </AxisLabel>
                </Box>
            </Box>

            <ChartValueTable caption={label} rows={valueRows} testId="histogram-values" />

            {holdsSomething(trailing) && <TrailingSlot>{trailing}</TrailingSlot>}
        </Box>
    );
}

/**
 * The same chart at half the height, for a series rather than a distribution.
 *
 * Reach for it when the question is "which way is this going" -- a layout
 * settling, a value over time. The drawing is 24px tall on its 1px baseline and
 * the two axis-end values flank it rather than sitting under it, because one
 * row pitch has no second line to put them on. They are still always drawn: a
 * sparkline with no ends is a squiggle.
 *
 * The series is normalised over its own extremes, so the line reports shape and
 * the labels report magnitude. No legend, no title, no summary line.
 *
 * The line is drawn from the start of the axis to its end, following the text
 * direction, so it reads the same way as the labels beside it in a right-to-left
 * interface. Assistive technology gets the whole chart as one named image plus a
 * visually hidden table of every value in the series; give `label` the chart's
 * own name so both have one.
 * @param props - Component props
 * @param props.values - The series, in order
 * @param props.label - The chart's own name, used as its accessible name and as the caption of its table of values
 * @param props.minLabel - The value at the start of the axis
 * @param props.maxLabel - The value at the end of the axis
 * @param props.busy - Whether the chart is still being worked out by something that finishes later
 * @param props.live - How urgently a screen reader announces the chart when it changes on its own
 * @param props.trailing - The 24px trailing slot: an advanced settings button, a reset control, or nothing
 * @returns The sparkline row
 * @example
 * ```tsx
 * <SparklineRow label="Layout settling" values={[92, 71, 55, 44, 36]} minLabel="Tick 1" maxLabel="Tick 40" />
 * ```
 */
export function SparklineRow({
    values,
    label,
    minLabel,
    maxLabel,
    busy,
    live,
    trailing,
}: SparklineRowProps): React.JSX.Element {
    const direction = useDirection();
    const formatNumber = useNumberFormatter();
    const axis = useAxisIds();
    const points = sparklinePoints(values, direction);

    const valueRows = values.map((value, index) => ({
        id: `point-${String(index)}`,
        // Positions count from one, the way a reader counts them, and are
        // formatted for the locale so a series longer than a thousand points
        // groups its digits the way the rest of the panel does.
        header: formatNumber.format(index + 1),
        value: formatNumber.format(value),
    }));

    return (
        <Box
            data-testid="sparkline-row"
            aria-busy={busy}
            style={{
                display: "flex",
                alignItems: "center",
                gap: PANEL_GRID.TRAIL_GAP,
                height: PANEL_GRID.SPARKLINE_HEIGHT,
            }}
        >
            <Box
                data-testid="sparkline-chart"
                // The drawing and its two axis ends are the live region; the
                // table of values behind it deliberately sits outside.
                {...liveRegionProps(live, busy)}
                style={{
                    flex: "1 1 auto",
                    minWidth: 0,
                    display: "flex",
                    alignItems: "center",
                    gap: INLINE_GAP,
                }}
            >
                <AxisLabel end="min" id={axis.min}>
                    {minLabel}
                </AxisLabel>

                <Box
                    data-testid="sparkline-drawing"
                    role={label === undefined ? undefined : "img"}
                    aria-label={label}
                    // As on the histogram: the name says what the picture is,
                    // the two axis ends say what it spans.
                    aria-describedby={label === undefined ? undefined : axis.describedBy}
                    aria-hidden={label === undefined ? true : undefined}
                    style={{
                        flex: "1 1 auto",
                        minWidth: 0,
                        display: "flex",
                        flexDirection: "column",
                        // The line and the rule it stands on are one drawing.
                        color: PANEL_INK.BORDER,
                    }}
                >
                    <Box
                        component="svg"
                        data-testid="sparkline-plot"
                        width="100%"
                        height={PANEL_GRID.CONTROL_HEIGHT}
                        viewBox={`0 0 ${String(SPARKLINE_VIEWBOX)} ${String(SPARKLINE_VIEWBOX)}`}
                        preserveAspectRatio="none"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={SPARKLINE_STROKE}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                        focusable="false"
                        style={{ display: "block", overflow: "visible" }}
                    >
                        {points !== null && <polyline points={points} vectorEffect="non-scaling-stroke" />}
                    </Box>

                    <ChartBaseline />
                </Box>

                <AxisLabel end="max" id={axis.max}>
                    {maxLabel}
                </AxisLabel>
            </Box>

            <ChartValueTable caption={label} rows={valueRows} testId="sparkline-values" />

            {holdsSomething(trailing) && <TrailingSlot>{trailing}</TrailingSlot>}
        </Box>
    );
}

/**
 * One reading, with a bar for where it falls in its distribution and a chip for
 * its rank.
 *
 * This is the row that replaces two lines of prose -- `0.31, 98th percentile`
 * and `Rank 6 of 318` -- with one: the name, a 64px bar filled to the
 * percentile, the number itself, and a rank chip. Stack several and the outlier
 * is visible in the bars before any of the numbers have been read.
 *
 * The bar is a progress bar to assistive technology, named by the metric and
 * read out as its percentile rather than as a bare percentage. The percentile
 * is spelled as an ordinal in the active locale, so it is "98th" in English and
 * "98e" in French; both the spelling and the sentence around it are replaceable
 * through `LabelsProvider`.
 *
 * Supplying `onClick` makes the whole row a button, focusable and answering
 * Enter and Space.
 * @param props - Component props
 * @param props.name - The metric's own name
 * @param props.percentile - Where the value falls in its distribution, 0 to 100; values outside that range are clamped
 * @param props.value - The number itself
 * @param props.rank - The rank, drawn inside a rank chip
 * @param props.busy - Whether the reading is still being worked out by something that finishes later
 * @param props.live - How urgently a screen reader announces the row when it changes on its own
 * @param props.onClick - Called when the row is activated, with the event and whether it came from a pointer or the keyboard
 * @param props.onDoubleClick - Called on a double click
 * @param props.onContextMenu - Called on a right click or a long press
 * @param props.onFocus - Called when the row takes focus
 * @param props.onBlur - Called when the row loses focus
 * @returns The metric row
 * @example
 * ```tsx
 * <MetricRow name="Bridges" percentile={98} value="0.31" rank="#6" />
 * ```
 */
export function MetricRow({
    name,
    percentile,
    value,
    rank,
    busy,
    live,
    onClick,
    onDoubleClick,
    onContextMenu,
    onFocus,
    onBlur,
}: MetricRowProps): React.JSX.Element {
    const labels = useLabels();
    const formatOrdinal = useOrdinalFormatter();
    const nameId = useId();

    const activate = onClick;
    const interactive = activate !== undefined;
    // Clamped rather than trusted: a bar drawn past its own track is a defect a
    // reader cannot see, and a negative one silently disappears.
    const filled = Math.min(FULL_PERCENT, Math.max(0, percentile));
    const percentileLabel = labels.percentile(formatOrdinal(Math.round(filled)));

    /**
     * Activate the row on click, handing the consumer the event and the
     * activation source.
     * @param event - The mouse event
     */
    const handleClick = (event: React.MouseEvent<HTMLDivElement>): void => {
        if (activate !== undefined) {
            activate(event, getActivationMeta(event));
        }
    };

    /**
     * Activate the row from the keyboard, so a row that responds to a pointer
     * responds to Enter and Space as well.
     * @param event - The keyboard event
     */
    const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
        if (activate === undefined) {
            return;
        }

        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            activate(event, getActivationMeta(event));
        }
    };

    return (
        <Box
            data-testid="metric-row"
            role={interactive ? "button" : undefined}
            tabIndex={interactive ? 0 : undefined}
            // The whole row is the live region: the reading, its bar and its
            // rank all change together when a run finishes, and announcing them
            // together keeps the name in front of the number.
            {...liveRegionProps(live, busy)}
            onClick={handleClick}
            onKeyDown={handleKeyDown}
            onDoubleClick={onDoubleClick}
            onContextMenu={onContextMenu}
            onFocus={onFocus}
            onBlur={onBlur}
            style={{
                display: "flex",
                alignItems: "center",
                gap: PANEL_GRID.GUTTER,
                height: PANEL_GRID.ROW_PITCH,
                cursor: interactive ? "pointer" : "default",
            }}
        >
            <Box
                component="span"
                id={nameId}
                data-testid="metric-row-name"
                // The ellipsis is visual only -- the whole name is in the DOM, so
                // a screen reader always reads it in full. The title is for the
                // sighted reader, who is the one the ellipsis hides it from.
                title={name}
                style={{
                    flex: "1 1 auto",
                    minWidth: 0,
                    fontSize: NAME_FONT_SIZE,
                    lineHeight: 1.2,
                    color: PANEL_INK.VALUE,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                }}
            >
                {name}
            </Box>

            <Progress.Root
                data-testid="metric-row-bar"
                // The section's own aria is switched off below and the role is
                // taken here, on the whole bar, so that the value is read as the
                // percentile it is rather than as Mantine's fixed "N%".
                role="progressbar"
                aria-labelledby={nameId}
                aria-valuemin={0}
                aria-valuemax={FULL_PERCENT}
                aria-valuenow={filled}
                aria-valuetext={percentileLabel}
                title={percentileLabel}
                size={MICRO_BAR_HEIGHT}
                style={{
                    flex: `0 0 ${String(MICRO_BAR_WIDTH)}px`,
                    borderRadius: MICRO_BAR_RADIUS,
                    // The track is the field surface rather than the raised one.
                    // Measured against this library's own palette, the accent
                    // fill reads 2.66:1 (dark) and 3.20:1 (light) on the field
                    // surface, against the 3:1 that WCAG 2.2 (1.4.11) asks of a
                    // shape carrying meaning; on the raised surface it reads
                    // 2.11:1 and 2.73:1. So the move clears the clause outright
                    // in the light scheme and improves the dark one without
                    // clearing it. PANEL_INK.RAISED records the same finding and
                    // says it has to be settled where the bar is drawn, which is
                    // here.
                    background: PANEL_INK.SURFACE,
                }}
            >
                <Progress.Section
                    data-testid="metric-row-fill"
                    value={filled}
                    // Mantine would otherwise put role="progressbar" here with a
                    // hardcoded aria-valuetext of `${value}%`, which would
                    // announce "98%" for a value that is a 98th percentile. The
                    // role is taken by the track above instead.
                    withAria={false}
                    color={PANEL_INK.ACCENT}
                    // The fill runs from the inline start because the track is a
                    // flex row, which follows the text direction; nothing here is
                    // anchored to the left edge.
                    style={{ borderRadius: MICRO_BAR_RADIUS }}
                />
            </Progress.Root>

            <Box
                component="span"
                data-testid="metric-row-value"
                style={{
                    flex: "0 0 auto",
                    fontSize: "var(--mantine-font-size-sm)",
                    lineHeight: 1,
                    color: PANEL_INK.VALUE,
                }}
            >
                {value}
            </Box>

            {rank !== undefined && <RankChip>{rank}</RankChip>}
        </Box>
    );
}
