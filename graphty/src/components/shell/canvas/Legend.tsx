/**
 * The canvas legend: bottom right, 256 wide on every board, flat at radius 4.
 *
 * Floor item 5 (6.10) in its SCREEN obligation, and build spec 01 section 9 in full:
 *
 * - no "Legend" caption -- the legend names itself;
 * - a channel with no encoding renders no block, and with nothing encoded the legend
 *   does not render at all;
 * - the palette name never appears in the body;
 * - block order is Color, Size, Outline, Edge width, Arrow, with a 1 px rule between
 *   blocks;
 * - one block per encoded channel: the plain and technical name on ONE line, the
 *   domain endpoints with the median or midpoint, the scale in words ALWAYS (even
 *   where it is the default), and every departure line;
 * - at most five categorical rows plus one Other row, which carries the coverage
 *   footer and opens the groups table;
 * - NO category counts on canvas under any condition, and NO state rows -- Selected,
 *   Linked to the selection, Matches filter, Filtered out, Not on path, Outside
 *   window and Open notes are the EXPORT legend's and Help's, never this box's.
 *
 * While the data table drawer is open the legend COMPACTS rather than hiding: the
 * reading legend with the swatch rows and the ramps subtracted and the header lines
 * kept, at the same width and the same right edge, with no min-height and no scroll.
 *
 * The SWATCHES are a faithful placeholder: the size wedge draws its stops at the radii
 * it is handed and the categorical rows draw the inks they are handed, but the box
 * does not yet read the encoding model itself.
 */

import { PANEL_INK, ProseBlock } from "@graphty/compact-mantine";
import React from "react";

import { CANVAS_TOOLBAR_Z_INDEX, LEGEND_MIN_HEIGHT, LEGEND_WIDTH, OVERLAY_INSET } from "../constants";
import { CANVAS_LEADING, CANVAS_METRICS, CANVAS_SPACE, CANVAS_TYPE, LEGEND_BLOCK_ORDER, type LegendChannelId, OVERLAY_REFLOW_TRANSITION_MS } from "./canvasLayout";

/**
 * One end of a quantitative domain: MIN, MEDIAN or MAX. The middle stop carries the
 * word "median" in its own label, because "1 to 44" and "1 to 44" print the same
 * string over two very different distributions.
 *
 * Built by the caller and handed in through {@link LegendChannel.stops}.
 * @public
 */
export interface LegendStop {
    /** The endpoint as it is printed, e.g. "2", "median 3", "14,206". */
    readonly label: string;
    /** The swatch's drawn radius, which is the encoding's own transform. */
    readonly radius?: number;
    /** The swatch's ink, for a colour ramp's endpoints. */
    readonly color?: string;
}

/**
 * One categorical row. It carries NO count: category counts are the export legend's.
 *
 * Built by the caller and handed in through {@link LegendChannel.categories};
 * {@link capLegendCategories} takes the same rows.
 * @public
 */
export interface LegendCategory {
    /** Stable id, unique within the block. */
    readonly id: string;
    /** The category's own name, from the user's data. */
    readonly label: string;
    /** The ink the canvas paints it. */
    readonly color: string;
}

/**
 * The Other row, which is the one place the coverage footer lives on canvas.
 */
export interface LegendOtherRow {
    /** The row's leading word, always "Other". */
    readonly label: string;
    /** The coverage footer, e.g. "3,388 groups, 43% of nodes", drawn parenthesised. */
    readonly coverage: string;
    /** The ink the canvas paints the remainder. */
    readonly color: string;
    /** Opens the groups table. */
    readonly onClick?: () => void;
}

/**
 * One encoded channel: one block of the legend.
 */
export interface LegendChannel {
    /** Which channel this is; the block order is fixed by {@link LEGEND_BLOCK_ORDER}. */
    readonly channel: LegendChannelId;
    /** The channel word, e.g. "Color", "Size", "Outline", "Edge width", "Arrow". */
    readonly channelLabel: string;
    /** The plain half of the 6.3 pair, e.g. "Most connected". */
    readonly attribute: string;
    /**
     * The technical half, WITHOUT its parentheses, e.g. "Degree centrality". It is
     * drawn dimmed inside parentheses on the same line; it never takes a line of its
     * own.
     */
    readonly technicalName?: string;
    /** The scale in words, printed always, e.g. "sqrt scale". */
    readonly scaleLine: string;
    /** The compact form's dimmed suffix, e.g. "sqrt", "categorical". */
    readonly scaleShort: string;
    /** MIN / MEDIAN / MAX, for a quantitative channel. */
    readonly stops?: readonly LegendStop[];
    /** The five largest categories by member count, for a categorical channel. */
    readonly categories?: readonly LegendCategory[];
    /** The Other row, drawn under the categories. */
    readonly other?: LegendOtherRow;
    /**
     * Every departure from exact and complete for this channel, including the clamp
     * line and "not measured (N nodes)". Floor item 2: prune duplicates, never the
     * departure itself.
     */
    readonly departures?: readonly string[];
}

/**
 * Props of the canvas legend.
 * @public
 */
export interface LegendProps {
    /** The Views menu's remembered Legend state. */
    readonly visible: boolean;
    /** Whether the two-line rule has raised it onto the second line. */
    readonly raised: boolean;
    /** Whether it takes the compact form, which the open data table drawer produces. */
    readonly compact: boolean;
    /** One entry per ENCODED channel. An unencoded channel is simply absent. */
    readonly channels: readonly LegendChannel[];
    /** Its bottom offset, from the bottom stack. */
    readonly bottom: number;
    /** Its height cap, measured from its raised bottom. Ignored in the compact form. */
    readonly maxHeight: number;
}

const LEGEND_LABEL = "Legend";

/**
 * Puts the encoded channels into the legend's fixed block order and drops anything
 * that is not one of the five channels. A channel with no encoding never reaches here.
 * @param channels - the encoded channels, in any order.
 * @returns the channels in the order Color, Size, Outline, Edge width, Arrow.
 */
export function orderLegendChannels(channels: readonly LegendChannel[]): readonly LegendChannel[] {
    return LEGEND_BLOCK_ORDER.flatMap((id) => channels.filter((channel) => channel.channel === id));
}

/**
 * Applies the canvas's own categorical cap: the five largest categories, and the Other
 * row that follows carries the coverage footer for everything else.
 * @param categories - the categories the encoding model supplies, largest first.
 * @returns at most five of them.
 */
export function capLegendCategories(categories: readonly LegendCategory[]): readonly LegendCategory[] {
    return categories.slice(0, CANVAS_METRICS.LEGEND_MAX_CATEGORY_ROWS);
}

function ChannelHeading(props: { readonly channel: LegendChannel }): React.JSX.Element {
    const { channel } = props;

    return (
        <span
            style={{
                fontSize: CANVAS_TYPE.SMALL,
                lineHeight: CANVAS_LEADING.TIGHT,
                color: PANEL_INK.VALUE,
            }}
        >
            {`${channel.channelLabel}: ${channel.attribute}`}
            {channel.technicalName === undefined ? null : (
                <span style={{ color: PANEL_INK.CHROME }}> ({channel.technicalName})</span>
            )}
        </span>
    );
}

function CategoryRow(props: {
    readonly color: string;
    readonly onClick?: () => void;
    readonly title?: string;
    readonly children: React.ReactNode;
}): React.JSX.Element {
    const { children, color, onClick, title } = props;
    const content = (
        <>
            <svg
                aria-hidden="true"
                width={CANVAS_METRICS.LEGEND_SWATCH}
                height={CANVAS_METRICS.LEGEND_SWATCH}
                viewBox={`0 0 ${String(CANVAS_METRICS.LEGEND_SWATCH)} ${String(CANVAS_METRICS.LEGEND_SWATCH)}`}
                style={{ flex: "0 0 auto" }}
            >
                <circle
                    cx={CANVAS_METRICS.LEGEND_SWATCH / 2}
                    cy={CANVAS_METRICS.LEGEND_SWATCH / 2}
                    r={CANVAS_METRICS.LEGEND_SWATCH / 2}
                    fill={color}
                />
            </svg>
            <span
                style={{
                    flex: "1 1 auto",
                    minWidth: 0,
                    fontSize: CANVAS_TYPE.SMALL,
                    color: PANEL_INK.VALUE,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    textAlign: "start",
                }}
            >
                {children}
            </span>
        </>
    );

    const style: React.CSSProperties = {
        display: "flex",
        alignItems: "center",
        gap: CANVAS_SPACE.SM,
        height: CANVAS_METRICS.LEGEND_CATEGORY_ROW,
        padding: 0,
        border: "none",
        background: "transparent",
        width: "100%",
    };

    if (onClick === undefined) {
        return <div style={style}>{content}</div>;
    }

    return (
        <button type="button" title={title} onClick={onClick} style={{ ...style, cursor: "pointer" }}>
            {content}
        </button>
    );
}

/**
 * Draws the bottom-right canvas legend, or nothing when nothing is encoded.
 * @param props - the visibility, the form, the encoded channels and the offsets.
 * @returns the legend element, or null when it is not drawn.
 */
export function Legend(props: LegendProps): React.JSX.Element | null {
    const { bottom, channels, compact, maxHeight, raised, visible } = props;

    if (!visible || channels.length === 0) {
        return null;
    }

    const ordered = orderLegendChannels(channels);

    const box: React.CSSProperties = {
        position: "absolute",
        right: OVERLAY_INSET,
        bottom,
        width: LEGEND_WIDTH,
        display: "flex",
        flexDirection: "column",
        gap: compact ? CANVAS_SPACE.XS : CANVAS_METRICS.OVERLAY_PAD_Y,
        padding: `${String(CANVAS_METRICS.OVERLAY_PAD_Y)}px ${String(CANVAS_METRICS.OVERLAY_PAD_X)}px`,
        borderRadius: "var(--mantine-radius-sm)",
        background: PANEL_INK.PANEL,
        border: `${String(CANVAS_SPACE.HAIRLINE)}px solid ${PANEL_INK.BORDER}`,
        boxSizing: "border-box",
        overflow: "hidden",
        zIndex: CANVAS_TOOLBAR_Z_INDEX,
        transition: `bottom ${String(OVERLAY_REFLOW_TRANSITION_MS)}ms ease`,
    };

    if (!compact) {
        box.justifyContent = "center";
        box.minHeight = LEGEND_MIN_HEIGHT;
        box.maxHeight = maxHeight;
    }

    return (
        <div
            role="group"
            aria-label={LEGEND_LABEL}
            data-canvas-overlay="legend"
            data-raised={raised ? "true" : "false"}
            data-form={compact ? "compact" : "full"}
            style={box}
        >
            {ordered.map((channel, index) =>
                compact ? (
                    <span
                        key={channel.channel}
                        style={{
                            fontSize: CANVAS_TYPE.SMALL,
                            lineHeight: CANVAS_LEADING.TIGHT,
                            color: PANEL_INK.VALUE,
                        }}
                    >
                        {`${channel.channelLabel}: ${channel.attribute}`}
                        <span style={{ color: PANEL_INK.CHROME }}>{`, ${channel.scaleShort}`}</span>
                    </span>
                ) : (
                    <React.Fragment key={channel.channel}>
                        {index === 0 ? null : (
                            <div
                                style={{ height: CANVAS_SPACE.HAIRLINE, background: PANEL_INK.DIVIDER }}
                                data-legend-rule="true"
                            />
                        )}
                        <div style={{ display: "flex", flexDirection: "column", gap: CANVAS_SPACE.XS }}>
                            <ChannelHeading channel={channel} />

                            {channel.stops === undefined || channel.stops.length === 0 ? null : (
                                <div
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: CANVAS_SPACE.MD,
                                        height: CANVAS_METRICS.LEGEND_STOP_ROW,
                                    }}
                                >
                                    {channel.stops.map((stop) => (
                                        <div
                                            key={stop.label}
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: CANVAS_SPACE.XS,
                                            }}
                                        >
                                            <svg
                                                aria-hidden="true"
                                                width={CANVAS_METRICS.LEGEND_STOP_SWATCH}
                                                height={CANVAS_METRICS.LEGEND_STOP_SWATCH}
                                                viewBox={`0 0 ${String(CANVAS_METRICS.LEGEND_STOP_SWATCH)} ${String(CANVAS_METRICS.LEGEND_STOP_SWATCH)}`}
                                            >
                                                <circle
                                                    cx={CANVAS_METRICS.LEGEND_STOP_SWATCH / 2}
                                                    cy={CANVAS_METRICS.LEGEND_STOP_SWATCH / 2}
                                                    r={stop.radius ?? CANVAS_METRICS.LEGEND_SWATCH / 2}
                                                    fill={stop.color ?? PANEL_INK.CHROME}
                                                />
                                            </svg>
                                            <span
                                                style={{
                                                    fontSize: CANVAS_TYPE.PILL,
                                                    lineHeight: CANVAS_LEADING.TIGHT,
                                                    color: PANEL_INK.CHROME,
                                                }}
                                            >
                                                {stop.label}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {channel.categories === undefined || channel.categories.length === 0 ? null : (
                                <div
                                    style={{ display: "flex", flexDirection: "column", gap: CANVAS_SPACE.TIGHT }}
                                >
                                    {capLegendCategories(channel.categories).map((category) => (
                                        <CategoryRow key={category.id} color={category.color}>
                                            {category.label}
                                        </CategoryRow>
                                    ))}

                                    {channel.other === undefined ? null : (
                                        <CategoryRow
                                            color={channel.other.color}
                                            onClick={channel.other.onClick}
                                            title="Open the groups table"
                                        >
                                            {channel.other.label}
                                            <span
                                                style={{ color: PANEL_INK.CHROME }}
                                            >{` (${channel.other.coverage})`}</span>
                                        </CategoryRow>
                                    )}
                                </div>
                            )}

                            <span
                                style={{
                                    fontSize: CANVAS_TYPE.PILL,
                                    lineHeight: CANVAS_LEADING.TIGHT,
                                    color: PANEL_INK.CHROME,
                                }}
                            >
                                {channel.scaleLine}
                            </span>

                            {(channel.departures ?? []).map((departure) => (
                                <ProseBlock key={departure} variant="departure">
                                    {departure}
                                </ProseBlock>
                            ))}
                        </div>
                    </React.Fragment>
                ),
            )}
        </div>
    );
}
