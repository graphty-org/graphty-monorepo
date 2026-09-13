/**
 * The inspector's Multiple-nodes-and-edges surface (spec 03 section 6, second bullet).
 *
 * The count reads "3 nodes, 2 edges" -- and the zero half of a selection count is not
 * drawn (6.2), so "3 nodes" alone is correct when no edge is in the set. Selection
 * statistics expand IN PLACE onto the two-column Selection-vs-Graph form; notes sit on
 * the set; a long action list follows; above the selection cap the surface switches to
 * summary form.
 *
 * Multi-selection does not exist in graphty-element yet -- SelectionManager is
 * single-node (spec 03 section 7) -- so the surface is drawn at its target shape with
 * design 5.8's group treatment: one `Coming` tag on the actions block's header, its
 * rows dimmed and disabled, and one info circle.
 *
 * Only the header and the documented section skeleton are built in this pass.
 */

import { ControlSection, DataRow, DataRowHeader, PANEL_GRID, PANEL_INK, ProseBlock } from "@graphty/compact-mantine";
import { Box, Text } from "@mantine/core";
import React from "react";

import { ComingTag } from "./ComingTag";
import { type InspectorAction, InspectorActions } from "./InspectorActions";
import { INSPECTOR_KIND_FONT_SIZE, INSPECTOR_SECTION_IDS } from "./inspectorConstants";
import { useInspectorSection } from "./sections";

/**
 * One row of the Selection-vs-Graph table.
 *
 * Built by the caller and handed in through {@link MultiSelectionInspectorProps.statistics}.
 * @public
 */
export interface SelectionStatisticRow {
    /** What is being compared, e.g. "Average links per node". */
    readonly name: string;
    /** The figure for the selection, already formatted. */
    readonly selection: string;
    /** The figure for the whole graph, already formatted. */
    readonly graph: string;
}

/**
 * Props of the Multiple surface.
 */
export interface MultiSelectionInspectorProps {
    /** The count line, e.g. "3 nodes, 2 edges". The zero half is never drawn. */
    readonly countLabel: string;
    /** Whether the selection is above the cap, where the surface switches to summary form. */
    readonly aboveCap?: boolean;
    /** The reason the surface is in summary form, stated rather than implied. Floor item 2. */
    readonly summaryCaveat?: string;
    /** The Selection-vs-Graph rows. */
    readonly statistics: readonly SelectionStatisticRow[];
    /** Runs one verb of the actions block. */
    readonly onAction: (actionId: string) => void;
}

/**
 * The Multiple surface: its count, its statistics skeleton and its actions block.
 * @param props - the surface's props.
 * @returns the count line, the statistics section, the notes section and the actions block.
 */
export function MultiSelectionInspector(props: MultiSelectionInspectorProps): React.JSX.Element {
    const { countLabel, aboveCap, summaryCaveat, statistics, onAction } = props;

    const statisticsSection = useInspectorSection(INSPECTOR_SECTION_IDS.multiStatistics, true);
    const notesSection = useInspectorSection(INSPECTOR_SECTION_IDS.multiNotes, false);

    const actions: InspectorAction[] = [
        { id: "zoomToSelection", label: "Zoom to selection" },
        { id: "filterToSelection", label: "Filter to selection" },
        { id: "saveAsSubgraph", label: "Save as subgraph" },
        { id: "saveAsSet", label: "Save as set" },
        { id: "styleSelection", label: "Style selection" },
        { id: "merge", label: "Merge" },
        { id: "exportSelection", label: "Export selection..." },
        { id: "pinAsA", label: "Pin as A" },
    ].map((action) => ({
        ...action,
        coming: true,
        onSelect: () => {
            onAction(action.id);
        },
    }));

    return (
        <>
            <Box
                data-testid="multi-header-block"
                style={{
                    flex: "0 0 auto",
                    paddingBlock: PANEL_GRID.SECTION_PAD_BOTTOM,
                    paddingInlineStart: PANEL_GRID.PAD_LEFT,
                    paddingInlineEnd: PANEL_GRID.PAD_RIGHT,
                }}
            >
                <Text
                    span
                    data-testid="multi-count"
                    style={{ fontSize: INSPECTOR_KIND_FONT_SIZE, fontWeight: 500, color: PANEL_INK.VALUE }}
                >
                    {countLabel}
                </Text>

                {aboveCap === true && summaryCaveat !== undefined && (
                    <ProseBlock variant="departure">{summaryCaveat}</ProseBlock>
                )}
            </Box>

            {statistics.length > 0 ? (
                <ControlSection
                    label="Selection statistics"
                    opened={statisticsSection.opened}
                    onOpenChange={statisticsSection.onOpenChange}
                >
                    <DataRowHeader label="Selection" unit="Graph" />
                    {statistics.map((row) => (
                        <DataRow key={row.name} name={row.name} value={`${row.selection} / ${row.graph}`} />
                    ))}
                </ControlSection>
            ) : (
                <ControlSection
                    label="Selection statistics"
                    opened={statisticsSection.opened}
                    onOpenChange={statisticsSection.onOpenChange}
                    empty
                    actions={<ComingTag subject="Selection statistics" />}
                />
            )}

            <ControlSection
                label="Notes"
                opened={notesSection.opened}
                onOpenChange={notesSection.onOpenChange}
                empty
                actions={<ComingTag subject="Notes" />}
            />

            <InspectorActions label="Actions" actions={actions} />
        </>
    );
}
