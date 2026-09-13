/**
 * The inspector's Algorithm-result surface (spec 03 section 6, fourth bullet).
 *
 * Reading, caveats line, one-line run record with a Details chevron, the body for its
 * result shape, then the resident state swatch and layer name with `Change encoding`,
 * `Delete layer` and `Remove result`.
 *
 * Three floor items meet on this one surface and none of them may move behind a door:
 * the reading (item 1), every departure from exact and complete (item 2) and the
 * one-line run record (item 3) -- and a door may not separate a floor item from the
 * thing it qualifies, which is why all three are drawn above the body rather than
 * inside the Details the chevron opens.
 *
 * Only the header and the documented section skeleton are built in this pass; the
 * body's per-shape drawings arrive with the shapes themselves.
 */

import { ControlSection, DataRow, PANEL_GRID, PANEL_INK, ProseBlock } from "@graphty/compact-mantine";
import { Box, Group, Text } from "@mantine/core";
import React from "react";

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
    /** The colour the result's style layer paints, as a CSS colour the caller supplies. */
    readonly stateSwatch?: string;
    /** The style layer's own name. */
    readonly layerName?: string;
    /** Opens the layer's encoding. */
    readonly onChangeEncoding: () => void;
    /** Removes the style layer. A destructive verb, so it keeps its words (6.8). */
    readonly onDeleteLayer: () => void;
    /** Removes the result. A destructive verb, so it keeps its words (6.8). */
    readonly onRemoveResult: () => void;
}

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
        stateSwatch,
        layerName,
        onChangeEncoding,
        onDeleteLayer,
        onRemoveResult,
    } = props;

    const bodySection = useInspectorSection(INSPECTOR_SECTION_IDS.resultBody, true);

    const actions: InspectorAction[] = [
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
        {
            id: "removeResult",
            label: "Remove result",
            onSelect: onRemoveResult,
        },
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

                {layerName !== undefined && (
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

            {body.length > 0 ? (
                <ControlSection
                    label="Result"
                    opened={bodySection.opened}
                    onOpenChange={bodySection.onOpenChange}
                >
                    {body.map((row) => (
                        <DataRow key={row.name} name={row.name} value={row.value} />
                    ))}
                </ControlSection>
            ) : (
                <ControlSection
                    label="Result"
                    opened={bodySection.opened}
                    onOpenChange={bodySection.onOpenChange}
                    empty
                />
            )}

            <InspectorActions label="Actions" actions={actions} />
        </>
    );
}
