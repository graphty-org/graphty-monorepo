/**
 * The inspector's Multiple-nodes-and-edges surface (spec 03 section 6, second bullet).
 *
 * The count reads "3 nodes, 2 edges" -- and the zero half of a selection count is not
 * drawn (6.2), so "3 nodes" alone is correct when no edge is in the set. Selection
 * statistics expand IN PLACE onto the two-column Selection-vs-Graph form; notes sit on
 * the set; a long action list follows; above the selection cap the surface switches to
 * summary form.
 *
 * The statistics are graphty-element's own `selection.statistics()`: per node attribute, the
 * selection's mean beside the whole graph's mean, or for a non-numeric attribute how the
 * selected nodes divide between its values. This surface only formats them. The actions
 * block keeps design 5.8's group treatment -- one `Coming` tag on its header, its rows
 * dimmed and disabled -- until those verbs are wired.
 */

import { ControlSection, DataRow, DataRowHeader, PANEL_GRID, PANEL_INK, ProseBlock } from "@graphty/compact-mantine";
import type { SelectionAttributeStatistics, SelectionStatistics } from "@graphty/graphty-element/session";
import { Box, Text } from "@mantine/core";
import React from "react";

import { ComingTag } from "./ComingTag";
import { type InspectorAction, InspectorActions } from "./InspectorActions";
import { INSPECTOR_KIND_FONT_SIZE, INSPECTOR_SECTION_IDS } from "./inspectorConstants";
import { useInspectorSection } from "./sections";

/** Four significant digits, grouped, so a mean of 6.333333 reads "6.333". */
const NUMBER = new Intl.NumberFormat("en-US", { maximumSignificantDigits: 4 });

/**
 * One attribute's Selection-vs-Graph figure, as the row draws it.
 * @param attribute - the element's statistics for one attribute.
 * @returns "selection mean / graph mean" for a number, "value count, ..." for a category,
 * or undefined when the element had nothing to report (too many distinct values).
 */
function attributeValue(attribute: SelectionAttributeStatistics): string | undefined {
    if (attribute.mean !== undefined) {
        const graph = attribute.graphMean === undefined ? "" : ` / ${NUMBER.format(attribute.graphMean)}`;

        return `${NUMBER.format(attribute.mean)}${graph}`;
    }

    return attribute.distribution?.map(({ value, count }) => `${value} ${NUMBER.format(count)}`).join(", ");
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
    /** graphty-element's `selection.statistics()`, or null while it is being read. */
    readonly statistics: SelectionStatistics | null;
    /** Runs one verb of the actions block. */
    readonly onAction: (actionId: string) => void;
}

/**
 * The Multiple surface: its count, its statistics and its actions block.
 * @param props - the surface's props.
 * @returns the count line, the statistics section, the notes section and the actions block.
 */
export function MultiSelectionInspector(props: MultiSelectionInspectorProps): React.JSX.Element {
    const { countLabel, aboveCap, summaryCaveat, statistics, onAction } = props;

    const statisticsSection = useInspectorSection(INSPECTOR_SECTION_IDS.multiStatistics, true);
    const notesSection = useInspectorSection(INSPECTOR_SECTION_IDS.multiNotes, false);

    const rows = (statistics?.attributes ?? []).flatMap((attribute) => {
        const value = attributeValue(attribute);

        return value === undefined ? [] : [{ path: attribute.path, name: attribute.plainName, value }];
    });

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

            <ControlSection
                label="Selection statistics"
                opened={statisticsSection.opened}
                onOpenChange={statisticsSection.onOpenChange}
                empty={rows.length === 0}
            >
                <DataRowHeader label="Selection" unit="Graph" />
                {rows.map((row) => (
                    <DataRow key={row.path} name={row.name} value={row.value} />
                ))}
            </ControlSection>

            {/* Still Coming. graphty-element's notes take one to 64 targets, so a note cannot name
                every member of a larger selection; a note on a selection is a note on a kept set
                (`{ set }` target), which needs Keep selection as a set first. */}
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
