/**
 * The inspector's Algorithm-result surface (spec 03 section 6, fourth bullet).
 *
 * Reading, caveats line, one-line run record with a Details chevron, the body for its
 * result shape, then the resident state swatch and layer name with `Change encoding`,
 * `Delete layer` and `Remove result`.
 *
 * Those first two verbs are drawn only in the card's APPLIED form. Spec 2233-2236 gives
 * the applied form "the resident state swatch, the layer name, and Change encoding", and
 * a card whose run painted nothing -- auto-apply's limit 2 suppressed it, or Delete layer
 * has since taken the picture -- has no layer for either verb to act on. Drawn anyway,
 * they did real damage rather than nothing: Change encoding opened Style for an encoding
 * that does not exist, and Delete layer fell through to whichever tag the shell had last
 * recorded and deleted somebody else's layers. The un-applied form keeps `Remove result`
 * alone; spec 2234's "Encode as style" button belongs beside it and exists nowhere in
 * this build, so the row draws no encoding verb rather than one that does nothing.
 *
 * Three floor items meet on this one surface and none of them may move behind a door:
 * the reading (item 1), every departure from exact and complete (item 2) and the
 * one-line run record (item 3) -- and a door may not separate a floor item from the
 * thing it qualifies, which is why all three are drawn above the body rather than
 * inside the Details the chevron opens.
 *
 * The body's per-shape drawing now has its FIRST shape: Node metric (spec 2307) --
 * the top ranked nodes, each with its rank as a RankChip in the trailing slot and each
 * selecting the node it names, plus the aggregate tie row when one applies. Every other
 * result shape still arrives with the shape itself.
 *
 * The distribution beneath those rows is ONE RT-9 chart row whose only text is its two
 * axis ends (spec 4902, 3438-3442), not the five printed figures spec 2307 also asks
 * for. That is a real conflict between two lines of the spec, and RT-9 is the row type
 * rule, so it wins: min, median, mean, max and p99 as five printed statistics is exactly
 * the table a chart row exists to replace, and the figures stay reachable through the
 * copy path. Drawn INSIDE the Result section, under the rows, because it describes the
 * same run they do.
 *
 * The reading, the caveats line and the run record stay ABOVE all of it, outside every
 * door, because a door may not separate a floor item from the thing it qualifies -- the
 * same rule that keeps them out of the Details chevron.
 *
 * The member verbs (spec 2307, 2366 and 2376) act on the result's elements: a metric
 * result offers Select top N, Select above threshold and Filter above threshold, with the
 * threshold field opening where the caller says the result is drawable, and a range slider
 * under the chart that brushes its bars; a grouping result offers Export groups. Every one
 * hands its input to the caller, which asks graphty-element; nothing here ranks or counts.
 *
 * There is deliberately NO legend block on this surface. Floor item 5 is marked not
 * applicable on the Result face (spec 2258): the obligation to say what the colours mean
 * lands on the canvas legend's colour channel, which is where a metric run publishes it.
 */

import {
    ControlSection,
    DataRow,
    FieldRow,
    HistogramRow,
    PANEL_GRID,
    PANEL_INK,
    PanelField,
    ProseBlock,
    RankChip,
} from "@graphty/compact-mantine";
import { Box, Group, RangeSlider, Text } from "@mantine/core";
import React, { useState } from "react";

import { type InspectorAction, InspectorActions } from "./InspectorActions";
import { INSPECTOR_CLUSTER_GAP, INSPECTOR_SECTION_IDS, SWATCH_RADIUS } from "./inspectorConstants";
import { useInspectorSection } from "./sections";

/**
 * One row of a result's body.
 *
 * Built by the caller and handed in through {@link ResultInspectorProps.body}.
 * @public
 */
export interface ResultBodyRow {
    /** The row's own name -- a node label, a group name, a path step. */
    readonly name: string;
    /** The figure beside it, already formatted. */
    readonly value: string;
    /** The row's rank in the result, drawn as a RankChip in the trailing slot. */
    readonly rank?: number;
    /** Selects the thing the row names. A row without one is inert text (RT-6). */
    readonly onSelect?: () => void;
}

/**
 * Props of the Algorithm-result surface.
 */
export interface ResultInspectorProps {
    /** The plain-language reading. Floor item 1: on screen, in full, never circled. */
    readonly reading: string;
    /** Every departure from exact and complete, named. Floor item 2. */
    readonly caveats?: string;
    /** The one-line run record: method, non-default parameters and scope. Floor item 3. */
    readonly runRecord: string;
    /** Opens the full run record. The chevron is drawn only when this is given. */
    readonly onOpenRunDetails?: () => void;
    /** The body for this result's shape. */
    readonly body: readonly ResultBodyRow[];
    /**
     * The result's distribution, drawn as one RT-9 chart row under the rows.
     *
     * Absent draws nothing: a chart row with no bins is a 0-to-0 axis claiming a
     * distribution that was never measured, which is the fabricated-figure failure this
     * surface exists to refuse.
     */
    readonly distribution?: {
        /** The chart's own name, which is also its accessible name and its axis description. */
        readonly caption: string;
        /** The bars, in axis order, each already carrying its own phrase. */
        readonly bins: readonly { readonly label: string; readonly count: number }[];
        /** The value at the start of the axis -- one of RT-9's only two pieces of text. */
        readonly axisMin: string;
        /** The value at the end of the axis -- the other. */
        readonly axisMax: string;
    };
    /** The colour the result's style layer paints, as a CSS colour the caller supplies. */
    readonly stateSwatch?: string;
    /** The style layer's own name. */
    readonly layerName?: string;
    /** Opens the layer's encoding. Drawn only in the applied form. */
    readonly onChangeEncoding: () => void;
    /**
     * Removes the style layer and leaves the run (spec 2241-2243), after which this card
     * draws its un-applied form. A destructive verb, so it keeps its words (6.8). Drawn
     * only in the applied form.
     */
    readonly onDeleteLayer: () => void;
    /**
     * Removes the result AND every layer that reads it (spec 2243-2244). A destructive
     * verb, so it keeps its words (6.8).
     */
    readonly onRemoveResult: () => void;
    /**
     * What Remove result will act on, drawn resident under the verb.
     *
     * Floor item 4 and spec 2241-2249: the layer count is named BEFORE the act, and the
     * spec writes it into the verb's own line rather than into a tooltip, so it is the
     * action's `cost` slot rather than a title. Absent on a result that painted nothing,
     * because there is then no count to name.
     */
    readonly removeResultCost?: string;
    /**
     * The member verbs of a metric result: Select top N, Select above threshold and Filter
     * above threshold, with the two fields they read. Absent draws none of them.
     */
    readonly members?: ResultMembers;
    /**
     * Selects what the bars from `first` to `last` counted, by position. Given, a range
     * slider under the chart brushes the bars; absent, the chart only shows them.
     */
    readonly onSelectBins?: (first: number, last: number) => void;
    /** Downloads a grouping result's groups as CSV. Absent draws no Export groups verb. */
    readonly onExportGroups?: () => void;
}

/**
 * What a metric result's member verbs need.
 * @public
 */
export interface ResultMembers {
    /** The most Select top N may ask for: the selection cap. */
    readonly topLimit: number;
    /** Where the threshold field opens: the lowest value whose matches are still drawable. */
    readonly threshold: number;
    /** The sentence saying where the threshold opened and why, when it left some out. */
    readonly thresholdNote?: string;
    /** Selects the top `n`. */
    readonly onSelectTop: (n: number) => void;
    /** Selects everything above `threshold`. */
    readonly onSelectAbove: (threshold: number) => void;
    /** Shows only what is above `threshold`. */
    readonly onFilterAbove: (threshold: number) => void;
}

/** How many Select top N asks for until the reader says otherwise. */
const DEFAULT_TOP_N = 10;

/**
 * The Algorithm-result surface.
 * @param props - the surface's props.
 * @returns the reading, the caveats, the run record, the body and the three verbs.
 */
export function ResultInspector(props: ResultInspectorProps): React.JSX.Element {
    const {
        reading,
        caveats,
        runRecord,
        onOpenRunDetails,
        body,
        distribution,
        stateSwatch,
        layerName,
        onChangeEncoding,
        onDeleteLayer,
        onRemoveResult,
        removeResultCost,
        members,
        onSelectBins,
        onExportGroups,
    } = props;

    const [topN, setTopN] = useState(() => Math.min(DEFAULT_TOP_N, members?.topLimit ?? DEFAULT_TOP_N));
    const [threshold, setThreshold] = useState(members?.threshold ?? 0);
    const binCount = distribution?.bins.length ?? 0;
    const [brush, setBrush] = useState<[number, number]>([0, Math.max(0, binCount - 1)]);
    /* A different result opens its fields afresh: the threshold where it is drawable and the
       brush across every bar (React's "adjusting state when a prop changes" pattern). */
    const [openedFor, setOpenedFor] = useState({ threshold: members?.threshold, binCount });
    if (openedFor.threshold !== members?.threshold || openedFor.binCount !== binCount) {
        setOpenedFor({ threshold: members?.threshold, binCount });
        setThreshold(members?.threshold ?? 0);
        setBrush([0, Math.max(0, binCount - 1)]);
    }

    const brushed = brush[0] > 0 || brush[1] < binCount - 1;

    const bodySection = useInspectorSection(INSPECTOR_SECTION_IDS.resultBody, true);

    /* The layer name is what says this run painted: it is passed together with the swatch,
       the tag and the count, or none of them is (AppShell's `activeResult`). So the same
       fact gates the two layer verbs and the swatch-and-name row below. */
    const applied = layerName !== undefined;

    const actions: InspectorAction[] = [
        ...(applied
            ? [
                  {
                      id: "changeEncoding",
                      label: "Change encoding",
                      onSelect: onChangeEncoding,
                  },
                  {
                      id: "deleteLayer",
                      label: "Delete layer",
                      onSelect: onDeleteLayer,
                  },
              ]
            : []),
        {
            id: "removeResult",
            label: "Remove result",
            ...(removeResultCost === undefined ? {} : { cost: removeResultCost }),
            onSelect: onRemoveResult,
        },
        ...(members === undefined
            ? []
            : [
                  {
                      id: "selectTop",
                      label: `Select top ${String(topN)}`,
                      onSelect: () => {
                          members.onSelectTop(topN);
                      },
                  },
                  {
                      id: "selectAbove",
                      label: "Select above threshold",
                      onSelect: () => {
                          members.onSelectAbove(threshold);
                      },
                  },
                  {
                      id: "filterAbove",
                      label: "Filter above threshold",
                      onSelect: () => {
                          members.onFilterAbove(threshold);
                      },
                  },
              ]),
        ...(onExportGroups === undefined
            ? []
            : [{ id: "exportGroups", label: "Export groups", cost: "CSV of id and group", onSelect: onExportGroups }]),
    ];

    return (
        <>
            <Box
                data-testid="result-header-block"
                style={{
                    flex: "0 0 auto",
                    paddingBlock: PANEL_GRID.SECTION_PAD_BOTTOM,
                    paddingInlineStart: PANEL_GRID.PAD_LEFT,
                    paddingInlineEnd: PANEL_GRID.PAD_RIGHT,
                }}
            >
                <ProseBlock variant="reading">{reading}</ProseBlock>
                {caveats !== undefined && <ProseBlock variant="departure">{caveats}</ProseBlock>}
                <ProseBlock variant="runRecord" onDetails={onOpenRunDetails}>
                    {runRecord}
                </ProseBlock>

                {applied && (
                    <Group gap={INSPECTOR_CLUSTER_GAP} wrap="nowrap" data-testid="result-layer">
                        {stateSwatch !== undefined && (
                            <Box
                                aria-hidden
                                data-testid="result-swatch"
                                style={{
                                    flex: "0 0 auto",
                                    width: PANEL_GRID.GLYPH,
                                    height: PANEL_GRID.GLYPH,
                                    borderRadius: SWATCH_RADIUS,
                                    border: `1px solid ${PANEL_INK.BORDER}`,
                                    background: stateSwatch,
                                }}
                            />
                        )}
                        <Text
                            span
                            style={{
                                minWidth: 0,
                                fontSize: "var(--mantine-font-size-sm)",
                                color: PANEL_INK.VALUE,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                            }}
                        >
                            {layerName}
                        </Text>
                    </Group>
                )}
            </Box>

            {body.length === 0 && distribution === undefined && members === undefined ? (
                <ControlSection
                    label="Result"
                    opened={bodySection.opened}
                    onOpenChange={bodySection.onOpenChange}
                    empty
                />
            ) : (
                <ControlSection label="Result" opened={bodySection.opened} onOpenChange={bodySection.onOpenChange}>
                    {body.map((row) => (
                        <DataRow
                            key={row.name}
                            name={row.name}
                            value={row.value}
                            /*
                                The rank is a RankChip reading `#1`, never the sentence
                                "Rank 1 of 318" -- DataRow's own doc names the control,
                                and 6.17 makes a chip assembled at the call site a
                                defect. A row with no rank -- spec 2307's aggregate tie
                                line -- gets no chip at all rather than a defaulted one.
                            */
                            {...(row.rank === undefined
                                ? {}
                                : { trailing: <RankChip>{`#${String(row.rank)}`}</RankChip> })}
                            {...(row.onSelect === undefined ? {} : { onClick: row.onSelect })}
                        />
                    ))}

                    {/*
                        RT-9, one chart row, two axis ends and nothing else in text. It
                        sits under the rows and inside the same section because it
                        describes the same run they do, and a reader who collapses
                        Result should lose both together or neither.
                    */}
                    {distribution !== undefined && (
                        <HistogramRow
                            label={distribution.caption}
                            bins={distribution.bins.map((bin, index) => ({
                                ...bin,
                                highlighted: brushed && index >= brush[0] && index <= brush[1],
                            }))}
                            minLabel={distribution.axisMin}
                            maxLabel={distribution.axisMax}
                        />
                    )}

                    {/*
                        The brush: Mantine's own range slider, one step per bar, under the
                        chart it brushes. Letting go selects what the brushed bars counted.
                    */}
                    {distribution !== undefined && onSelectBins !== undefined && binCount > 1 && (
                        <Box
                            style={{
                                paddingInlineStart: PANEL_GRID.PAD_LEFT,
                                paddingInlineEnd: PANEL_GRID.PAD_RIGHT,
                            }}
                        >
                            <RangeSlider
                                size="xs"
                                min={0}
                                max={binCount - 1}
                                step={1}
                                minRange={0}
                                value={brush}
                                onChange={setBrush}
                                onChangeEnd={(range) => {
                                    onSelectBins(range[0], range[1]);
                                }}
                                label={(index) => distribution.bins[index]?.label}
                                thumbFromLabel="First bar to select"
                                thumbToLabel="Last bar to select"
                                data-testid="result-histogram-brush"
                            />
                        </Box>
                    )}

                    {members !== undefined && (
                        <>
                            <FieldRow groupLabel="Members">
                                <PanelField
                                    label="How many to select"
                                    glyph="N"
                                    kind="number"
                                    min={1}
                                    max={members.topLimit}
                                    step={1}
                                    value={topN}
                                    onChange={(value) => {
                                        setTopN(Number(value));
                                    }}
                                />
                                <PanelField
                                    label="Threshold"
                                    glyph="K"
                                    kind="number"
                                    value={threshold}
                                    onChange={(value) => {
                                        setThreshold(Number(value));
                                    }}
                                />
                            </FieldRow>
                            {members.thresholdNote !== undefined && (
                                <Text
                                    size="xs"
                                    c="dimmed"
                                    data-testid="result-threshold-note"
                                    style={{
                                        paddingInlineStart: PANEL_GRID.PAD_LEFT,
                                        paddingInlineEnd: PANEL_GRID.PAD_RIGHT,
                                    }}
                                >
                                    {members.thresholdNote}
                                </Text>
                            )}
                        </>
                    )}
                </ControlSection>
            )}

            <InspectorActions label="Actions" actions={actions} />
        </>
    );
}
