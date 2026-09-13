/**
 * The inspector's Cleaning-step surface (spec 03 section 6, sixth bullet).
 *
 * The before and after of the selected step, as two short lists the reader can compare
 * down rather than a sentence about them.
 *
 * Cleaning steps rest on a mutation API that returns an inverse for undo, which design
 * 5.8 records as new work in graphty-element, so the surface is drawn at its target
 * shape and its verbs carry the unshipped treatment.
 *
 * Only the header and the documented section skeleton are built in this pass.
 */

import { ControlSection, DataRow, PANEL_GRID, PANEL_INK, ProseBlock } from "@graphty/compact-mantine";
import { Box, Text } from "@mantine/core";
import React from "react";

import { type InspectorAction, InspectorActions } from "./InspectorActions";
import { INSPECTOR_KIND_FONT_SIZE, INSPECTOR_SECTION_IDS } from "./inspectorConstants";
import { useInspectorSection } from "./sections";

/**
 * One fact the step changed, with its value on each side of the change.
 *
 * Built by the caller and handed in through {@link CleaningStepInspectorProps.changes}.
 * @public
 */
export interface CleaningChangeRow {
    /** What changed, e.g. "Nodes", "Duplicate ids". */
    readonly name: string;
    /** Its value before the step, already formatted. */
    readonly before: string;
    /** Its value after the step, already formatted. */
    readonly after: string;
}

/**
 * Props of the Cleaning-step surface.
 */
export interface CleaningStepInspectorProps {
    /** The step's own name, e.g. "Merge duplicate accounts". */
    readonly stepName: string;
    /** The plain-language reading of what the step did. Floor item 1. */
    readonly reading: string;
    /** Every departure from exact and complete, named. Floor item 2. */
    readonly caveats?: string;
    /** The before-and-after rows. */
    readonly changes: readonly CleaningChangeRow[];
    /** Runs one verb of the actions block. */
    readonly onAction: (actionId: string) => void;
}

/**
 * The Cleaning-step surface.
 * @param props - the surface's props.
 * @returns the step's name, its reading, its before-and-after rows and the actions block.
 */
export function CleaningStepInspector(props: CleaningStepInspectorProps): React.JSX.Element {
    const { stepName, reading, caveats, changes, onAction } = props;
    const changesSection = useInspectorSection(INSPECTOR_SECTION_IDS.cleaningBeforeAfter, true);

    const actions: InspectorAction[] = [
        { id: "undoStep", label: "Undo this step" },
        { id: "reapplyStep", label: "Re-apply this step" },
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
                data-testid="cleaning-header-block"
                style={{
                    flex: "0 0 auto",
                    paddingBlock: PANEL_GRID.SECTION_PAD_BOTTOM,
                    paddingInlineStart: PANEL_GRID.PAD_LEFT,
                    paddingInlineEnd: PANEL_GRID.PAD_RIGHT,
                }}
            >
                <Text
                    span
                    data-testid="cleaning-step-name"
                    style={{ fontSize: INSPECTOR_KIND_FONT_SIZE, fontWeight: 500, color: PANEL_INK.VALUE }}
                >
                    {stepName}
                </Text>
                <ProseBlock variant="reading">{reading}</ProseBlock>
                {caveats !== undefined && <ProseBlock variant="departure">{caveats}</ProseBlock>}
            </Box>

            <ControlSection
                label="Before and after"
                opened={changesSection.opened}
                onOpenChange={changesSection.onOpenChange}
                empty={changes.length === 0}
            >
                {changes.map((row) => (
                    <DataRow key={row.name} name={row.name} value={`${row.before} -> ${row.after}`} />
                ))}
            </ControlSection>

            <InspectorActions label="Actions" actions={actions} />
        </>
    );
}
