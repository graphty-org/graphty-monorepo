/**
 * The inspector's One-edge surface (spec 03 section 6, first bullet).
 *
 * Endpoints as "source -> target", each a link that selects that node; the attributes
 * table as for a node; weight and time when present; notes. Actions: Select endpoints,
 * Simulate removing this edge, Filter to this edge type, Find alternate route, Show in
 * table, Delete edge (undoable), Copy as JSON.
 *
 * Edge selection does not exist in graphty-element yet -- SelectionManager is
 * single-node (spec 03 section 7, second consequence) -- so this surface is drawn at
 * its target shape with design 5.8's group treatment: one `Coming` tag on the actions
 * block's header, its rows dimmed and disabled, and one info circle reading "Dimmed
 * rows are not built yet." The neighbour row's `Note this relationship` on the node
 * surface is the stopgap until it ships.
 *
 * Only the header and the documented section skeleton are built in this pass; the
 * bodies of its sections arrive with edge selection itself.
 */

import { ControlSection, DataRow, PANEL_GRID, PANEL_INK, ProseBlock } from "@graphty/compact-mantine";
import { Box, Group, Text, UnstyledButton } from "@mantine/core";
import React from "react";

import { ComingTag } from "./ComingTag";
import { type InspectorAction, InspectorActions } from "./InspectorActions";
import { INSPECTOR_CLUSTER_GAP, INSPECTOR_KIND_FONT_SIZE, INSPECTOR_SECTION_IDS } from "./inspectorConstants";
import { useInspectorSection } from "./sections";

/**
 * Props of the One-edge surface.
 */
export interface EdgeInspectorProps {
    /** The edge's id. */
    readonly edgeId: string;
    /** The source node's own label. */
    readonly sourceLabel: string;
    /** The source node's id, which the link selects. */
    readonly sourceId: string;
    /** The target node's own label. */
    readonly targetLabel: string;
    /** The target node's id, which the link selects. */
    readonly targetId: string;
    /** The edge's type. */
    readonly edgeType?: string;
    /** The edge's weight, already formatted, when it has one. */
    readonly weight?: string;
    /** The edge's time, already formatted, when it has one. */
    readonly time?: string;
    /** The edge's attributes. */
    readonly attributes: readonly { readonly name: string; readonly value: string }[];
    /** The departure floor item 2 requires while the capability is unbuilt. */
    readonly caveat?: string;
    /** Selects one of the endpoints. */
    readonly onSelectEndpoint: (nodeId: string) => void;
    /** Runs one verb of the actions block. */
    readonly onAction: (actionId: string) => void;
}

/**
 * The One-edge surface: its header, its endpoint links and its section skeleton.
 * @param props - the surface's props.
 * @returns the endpoints, the attributes section, the notes section and the actions block.
 */
export function EdgeInspector(props: EdgeInspectorProps): React.JSX.Element {
    const {
        edgeId,
        sourceLabel,
        sourceId,
        targetLabel,
        targetId,
        edgeType,
        weight,
        time,
        attributes,
        caveat,
        onSelectEndpoint,
        onAction,
    } = props;

    const attributesSection = useInspectorSection(INSPECTOR_SECTION_IDS.edgeAttributes, true);
    const notesSection = useInspectorSection(INSPECTOR_SECTION_IDS.edgeNotes, false);

    const actions: InspectorAction[] = [
        { id: "selectEndpoints", label: "Select endpoints", coming: true },
        { id: "simulateRemoving", label: "Simulate removing this edge", coming: true },
        { id: "filterToEdgeType", label: "Filter to this edge type", coming: true },
        { id: "findAlternateRoute", label: "Find alternate route", coming: true },
        { id: "showInTable", label: "Show in table", coming: true },
        { id: "deleteEdge", label: "Delete edge", coming: true },
    ].map((action) => ({
        ...action,
        onSelect: () => {
            onAction(action.id);
        },
    }));

    const moreActions: InspectorAction[] = [
        {
            id: "copyAsJson",
            label: "Copy as JSON",
            coming: true,
            onSelect: () => {
                onAction("copyAsJson");
            },
        },
    ];

    const endpointStyle: React.CSSProperties = {
        minWidth: 0,
        color: PANEL_INK.VALUE,
        fontSize: INSPECTOR_KIND_FONT_SIZE,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
    };

    return (
        <>
            <Box
                data-testid="edge-header-block"
                style={{
                    flex: "0 0 auto",
                    paddingBlock: PANEL_GRID.SECTION_PAD_BOTTOM,
                    paddingInlineStart: PANEL_GRID.PAD_LEFT,
                    paddingInlineEnd: PANEL_GRID.PAD_RIGHT,
                }}
            >
                <Group gap={INSPECTOR_CLUSTER_GAP} wrap="nowrap" data-testid="edge-endpoints">
                    <UnstyledButton
                        type="button"
                        title={sourceId}
                        onClick={() => {
                            onSelectEndpoint(sourceId);
                        }}
                        style={endpointStyle}
                    >
                        {sourceLabel}
                    </UnstyledButton>
                    <Text span aria-hidden style={{ flex: "0 0 auto", color: PANEL_INK.CHROME }}>
                        {"->"}
                    </Text>
                    <UnstyledButton
                        type="button"
                        title={targetId}
                        onClick={() => {
                            onSelectEndpoint(targetId);
                        }}
                        style={endpointStyle}
                    >
                        {targetLabel}
                    </UnstyledButton>
                </Group>

                {caveat !== undefined && <ProseBlock variant="departure">{caveat}</ProseBlock>}
            </Box>

            <ControlSection
                label="Attributes"
                opened={attributesSection.opened}
                onOpenChange={attributesSection.onOpenChange}
            >
                {edgeType !== undefined && <DataRow name="Type" value={edgeType} />}
                {weight !== undefined && <DataRow name="Weight" value={weight} />}
                {time !== undefined && <DataRow name="Time" value={time} />}
                {attributes.map((row) => (
                    <DataRow key={row.name} name={row.name} value={row.value} />
                ))}
                <DataRow name="Edge id" value={edgeId} />
            </ControlSection>

            <ControlSection
                label="Notes"
                opened={notesSection.opened}
                onOpenChange={notesSection.onOpenChange}
                empty
                actions={<ComingTag subject="Notes" />}
            />

            <InspectorActions label="Actions" actions={actions} moreActions={moreActions} />
        </>
    );
}
