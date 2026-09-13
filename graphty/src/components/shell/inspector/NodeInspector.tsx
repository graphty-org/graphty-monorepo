/**
 * The inspector's One-node surface (spec 03 section 5).
 *
 * Six blocks, in order: the header block, Attributes, Computed metrics, Notes,
 * Neighbors, and the actions block.
 *
 * **Pinning rule (binding).** Computed metrics, neighbors and the actions block never
 * move below the first screen. Blocks 1 to 5 scroll inside the inspector's own scroll
 * region and block 6 is a sticky footer OUTSIDE it, which `InspectorActions` reaches
 * through the chrome's footer slot.
 *
 * The Attributes grid is the app's existing `DataAccordion`, re-homed rather than
 * rewritten. Its filter box is drawn only above ten attributes and filters the record
 * before it reaches the grid, so it is a control that does something rather than one
 * that reports a capability nobody built.
 */

import {
    ActionRow,
    ControlSection,
    DataRow,
    PANEL_GRID,
    PANEL_INK,
    PanelField,
    UiGlyph,
    useNumberFormatter,
} from "@graphty/compact-mantine";
import { ActionIcon, Box, Button, Checkbox, Group, Tabs, Text, Textarea, Tooltip, UnstyledButton } from "@mantine/core";
import React, { useMemo, useState } from "react";

import { DataAccordion } from "../../data-view/DataAccordion";
import { keyChipFor } from "../bindings";
import { TOOLTIP_DELAY_MS } from "../constants";
import { type InspectorAction, InspectorActions } from "./InspectorActions";
import {
    ATTRIBUTE_FILTER_THRESHOLD,
    EXPAND_NEIGHBORS_CHOICE_THRESHOLD,
    EXPAND_NEIGHBORS_TOP_N,
    INSPECTOR_CLUSTER_GAP,
    INSPECTOR_HEADER_LABELS,
    INSPECTOR_KIND_FONT_SIZE,
    INSPECTOR_SECTION_IDS,
    NEIGHBOR_ROW_CAP,
    NEIGHBOR_TYPE_CAP,
} from "./inspectorConstants";
import { InspectorMetricRow } from "./inspectorContext";
import { useInspectorSection } from "./sections";

/**
 * Every verb the node actions block draws, in the order spec 03 section 5 item 6 fixes.
 *
 * Named in {@link NodeInspectorProps.onAction} and in the coming-actions list a caller may
 * override.
 * @public
 */
export type NodeActionId =
    | "bookmarkNode"
    | "copyAsJson"
    | "copyNeighborIds"
    | "distanceFromHere"
    | "egoNetwork"
    | "expandAllAnyway"
    | "expandNeighbors"
    | "findPathFromHere"
    | "frameNode"
    | "likelyMissingLinks"
    | "mergeWith"
    | "pinNode"
    | "radialLayout"
    | "selectNeighbors"
    | "showInTable"
    | "simulateRemoving"
    | "tagNode"
    | "useAsRoot";

/**
 * The verbs whose capability design 5.8 records as not shipped, so they are drawn at
 * their target shape and disabled rather than wired to nothing. A caller that has
 * shipped one passes its own list.
 *
 * Exported because it is the default a caller overrides:
 * {@link NodeInspectorProps.comingActions} starts from this list.
 * @public
 */
export const DEFAULT_NODE_COMING_ACTIONS: readonly NodeActionId[] = [
    "egoNetwork",
    "radialLayout",
    "distanceFromHere",
    "likelyMissingLinks",
    "simulateRemoving",
    "mergeWith",
    "tagNode",
    "bookmarkNode",
];

/**
 * One computed metric on this node.
 *
 * Built by the caller and handed in through {@link NodeInspectorProps.metrics}.
 * @public
 */
export interface NodeComputedMetric {
    /** Stable id, which is what a pinned delta is matched on. */
    readonly metricId: string;
    /** 6.3's pair on first mention in this surface, the plain name alone on repeats. */
    readonly name: string;
    /** The raw figure, which the delta against card A is computed from. */
    readonly value: number;
    /** The figure as the reader should see it, e.g. "4,212, top 0.4%". */
    readonly display: string;
    /** Where the value falls in its distribution, 0 to 100. */
    readonly percentile: number;
    /** The rank, already spelled short: `#6`. */
    readonly rank?: string;
    /** Whether a background pass is still computing it. */
    readonly busy?: boolean;
}

/**
 * One note on this node.
 *
 * Built by the caller and handed in through {@link NodeInspectorProps.notes}.
 * @public
 */
export interface NodeNote {
    /** Stable id. */
    readonly id: string;
    /** Who wrote it. */
    readonly author: string;
    /** How long ago, e.g. "2 days ago". */
    readonly relativeTime: string;
    /** The full timestamp, which the relative time carries on hover. */
    readonly timestamp: string;
    /** The note's own text -- floor item 7. */
    readonly text: string;
    /** Whether it has been marked done. Done notes collapse under "N done". */
    readonly done: boolean;
    /** Free-text tags. */
    readonly tags?: readonly string[];
}

/**
 * One edge type in a node's neighbour breakdown.
 *
 * Built by the caller and handed in through {@link NodeInspectorProps.neighborBreakdown}.
 * @public
 */
export interface NeighborTypeCount {
    /** The edge type's own name. */
    readonly edgeType: string;
    /** How many neighbours it reaches, already formatted. */
    readonly count: string;
}

/**
 * One neighbour row.
 */
export interface NeighborRow {
    /** The neighbour's id, which is what a click selects. */
    readonly id: string;
    /** The neighbour's own label. */
    readonly label: string;
    /** The type of the edge that reaches it. */
    readonly edgeType: string;
    /** Which way the edge runs, on a directed graph. Left out on an undirected one. */
    readonly direction?: "in" | "out";
    /** The trailing figure -- edge weight, then neighbour degree. */
    readonly value: string;
}

/**
 * Props of the One-node surface.
 */
export interface NodeInspectorProps {
    /** The node's id, which `Copy id` writes to the clipboard. */
    readonly nodeId: string;
    /** The node's own label. Floor item 7, so it keeps its text. */
    readonly label: string;
    /**
     * "Selected 1 of 120,000 visible (1,000,000 total)", drawn only while a filter, a
     * time window or a subset is active. Floor item 2.
     */
    readonly subtitle?: string;
    /** Whether the node has been dragged, which gives it the `Pinned` badge and `Unpin`. */
    readonly pinnedToCanvas?: boolean;
    /** The attribute record the Attributes grid draws, or null when there is none. */
    readonly attributes: Record<string, unknown> | null;
    /** How many attributes the node carries in total, for `Show all N`. */
    readonly attributeCount: number;
    /** Every result that includes this node. */
    readonly metrics: readonly NodeComputedMetric[];
    /** The node's notes, newest first. */
    readonly notes: readonly NodeNote[];
    /** How many neighbours the node has. */
    readonly neighborCount: number;
    /**
     * The breakdown by edge type, which the surface caps at the top five and finishes
     * with "N more types" -- so the row reads "12,412: 9,100 logon, 3,380 process".
     */
    readonly neighborBreakdown: readonly NeighborTypeCount[];
    /** The per-group breakdown, e.g. "in 4 groups: group 3 holds 71%", when a Groups result exists. */
    readonly groupSummary?: string;
    /** Whether the graph is directed, which adds the In / Out / All tabs. */
    readonly directed?: boolean;
    /** The counts the three directional tabs carry. */
    readonly neighborTabCounts?: { readonly in: string; readonly out: string; readonly all: string };
    /** The neighbour rows, already ordered by edge weight then neighbour degree. */
    readonly neighbors: readonly NeighborRow[];
    /** Copies the node's id. */
    readonly onCopyId: () => void;
    /** Centres and zooms to a scale where neighbours resolve. */
    readonly onLocate: () => void;
    /** Releases a dragged node's position. */
    readonly onUnpinFromCanvas?: () => void;
    /** Opens the whole attribute list. */
    readonly onShowAllAttributes: () => void;
    /** Saves a new note. */
    readonly onAddNote: (text: string) => void;
    /** Marks a note done, or not. */
    readonly onToggleNoteDone: (noteId: string, done: boolean) => void;
    /** Deletes a note. */
    readonly onDeleteNote: (noteId: string) => void;
    /** Selects a neighbour. */
    readonly onSelectNeighbor: (nodeId: string) => void;
    /** Annotates the relationship to a neighbour -- the stopgap while edge selection is unbuilt. */
    readonly onNoteRelationship: (nodeId: string) => void;
    /** Opens the whole neighbour list in the data table. */
    readonly onShowNeighborsInTable: () => void;
    /** Selects every neighbour drawn. */
    readonly onSelectNeighbors: () => void;
    /** Opens the virtualized list of every neighbour. */
    readonly onSeeAllNeighbors: () => void;
    /** Runs one verb of the actions block. */
    readonly onAction: (action: NodeActionId) => void;
    /** Which verbs have not shipped yet. Defaults to `DEFAULT_NODE_COMING_ACTIONS`. */
    readonly comingActions?: readonly NodeActionId[];
}

/**
 * Builds the node's actions block from the verbs spec 03 section 5 item 6 fixes.
 * @param props - the surface's props, which supply the counts each verb states.
 * @param formatted - a locale formatter for the counts the verbs quote.
 * @returns the resident verbs and the verbs that live under `More`.
 */
function buildNodeActions(
    props: NodeInspectorProps,
    formatted: (value: number) => string,
): { resident: InspectorAction[]; more: InspectorAction[] } {
    const { neighborCount, pinnedToCanvas, onAction } = props;
    const coming = new Set<NodeActionId>(props.comingActions ?? DEFAULT_NODE_COMING_ACTIONS);

    const overThreshold = neighborCount > EXPAND_NEIGHBORS_CHOICE_THRESHOLD;
    const expandTake = overThreshold ? EXPAND_NEIGHBORS_TOP_N : neighborCount;
    const expandLabel = overThreshold
        ? `Expand top ${formatted(EXPAND_NEIGHBORS_TOP_N)} of ${formatted(neighborCount)} by weight (Choose which)`
        : `Expand ${formatted(neighborCount)} neighbors`;

    const make = (id: NodeActionId, label: string, extra?: Partial<InspectorAction>): InspectorAction => ({
        id,
        label,
        coming: coming.has(id),
        onSelect: () => {
            onAction(id);
        },
        ...extra,
    });

    /*
     * The block draws four rows and holds the rest (DECISIONS-1.8 D4; the cap is
     * enforced in `InspectorActions`, which is why this list may simply be ordered
     * rather than counted). The four are the ones InspectorGenomics draws, read
     * across to a node's own verbs: the expand split button, the camera verb, the
     * selection verb, and the path verb. `Zoom to selection` is slot 1 of
     * REGISTER-1.5 12.1's frozen order and `Frame this node` is what that slot is
     * called when the selection is one node.
     *
     * Nothing is lost by the cap: `More` carries every remaining verb in full text,
     * shipped and unshipped, in the same order.
     */
    const resident: InspectorAction[] = [
        make("expandNeighbors", expandLabel, {
            glyph: "plus",
            // Floor item 4: the cost line quotes THIS button's cost, never the cost of
            // expanding all, which belongs to its own verb and its own warning.
            cost: `Adds ${formatted(expandTake)} nodes`,
        }),
        make("frameNode", "Frame this node"),
        make("selectNeighbors", "Select neighbors"),
        make("findPathFromHere", "Find path from here"),
    ];

    // Floor item 4: the warning belongs to expanding ALL, and it has to be on screen
    // beside the control it warns about -- a menu row would put it behind a door. It
    // carries a cost, so the cap leaves it where it is put.
    if (overThreshold) {
        resident.splice(1, 0, make("expandAllAnyway", "Expand all anyway", {
            cost: `All ${formatted(neighborCount)} may slow the canvas down`,
        }));
    }

    const more: InspectorAction[] = [
        make("egoNetwork", "Ego network"),
        make("radialLayout", "Radial layout around this node"),
        make("useAsRoot", "Use as root or focus"),
        make("pinNode", pinnedToCanvas === true ? "Unpin" : "Pin", { glyph: "pin" }),
        make("distanceFromHere", "Distance from here"),
        make("likelyMissingLinks", "Likely missing links from here"),
        make("simulateRemoving", "Simulate removing"),
        make("mergeWith", "Merge with..."),
        make("tagNode", "Tag..."),
        make("bookmarkNode", "Bookmark this node"),
        make("showInTable", "Show in table"),
        make("copyAsJson", "Copy as JSON", { glyph: "copy" }),
        make("copyNeighborIds", "Copy neighbor ids"),
    ];

    return { resident, more };
}

/**
 * The One-node surface.
 * @param props - the surface's props.
 * @returns blocks 1 to 5 in the scroll region, and block 6 in the sticky footer.
 */
export function NodeInspector(props: NodeInspectorProps): React.JSX.Element {
    const {
        nodeId,
        label,
        subtitle,
        pinnedToCanvas,
        attributes,
        attributeCount,
        metrics,
        notes,
        neighborCount,
        neighborBreakdown,
        groupSummary,
        directed,
        neighborTabCounts,
        neighbors,
        onCopyId,
        onLocate,
        onUnpinFromCanvas,
        onShowAllAttributes,
        onAddNote,
        onToggleNoteDone,
        onDeleteNote,
        onSelectNeighbor,
        onNoteRelationship,
        onShowNeighborsInTable,
        onSelectNeighbors,
        onSeeAllNeighbors,
    } = props;

    const formatter = useNumberFormatter();
    const formatted = (value: number): string => formatter.format(value);

    const metricsSection = useInspectorSection(INSPECTOR_SECTION_IDS.nodeMetrics, true);
    const notesSection = useInspectorSection(INSPECTOR_SECTION_IDS.nodeNotes, true);
    const neighborsSection = useInspectorSection(INSPECTOR_SECTION_IDS.nodeNeighbors, true);

    const [attributeFilter, setAttributeFilter] = useState<string>("");
    const [draftNote, setDraftNote] = useState<string>("");
    const [neighborTab, setNeighborTab] = useState<string>("all");
    const [showDone, setShowDone] = useState<boolean>(false);

    const filteredAttributes = useMemo<Record<string, unknown> | null>(() => {
        if (attributes === null) {
            return null;
        }

        const needle = attributeFilter.trim().toLowerCase();

        if (needle === "") {
            return attributes;
        }

        return Object.fromEntries(
            Object.entries(attributes).filter(([key]) => key.toLowerCase().includes(needle)),
        );
    }, [attributeFilter, attributes]);

    // Spec 03 section 5 item 5: the breakdown caps at the top five edge types and then
    // says how many it stood down, so no type count is silently dropped.
    const shownTypes = neighborBreakdown.slice(0, NEIGHBOR_TYPE_CAP);
    const hiddenTypeCount = neighborBreakdown.length - shownTypes.length;
    const breakdown = shownTypes.map((type) => `${type.count} ${type.edgeType}`).join(", ");
    const moreTypes = hiddenTypeCount > 0 ? `, ${formatted(hiddenTypeCount)} more types` : "";
    const neighborSummary = `${formatted(neighborCount)}: ${breakdown}${moreTypes}`;

    const openNotes = notes.filter((note) => !note.done);
    const doneNotes = notes.filter((note) => note.done);
    const directionalNeighbors =
        directed === true && neighborTab !== "all"
            ? neighbors.filter((row) => row.direction === neighborTab)
            : neighbors;
    const shownNeighbors = directionalNeighbors.slice(0, NEIGHBOR_ROW_CAP);
    const { resident, more } = buildNodeActions(props, formatted);
    const addNoteChip = keyChipFor("addNote");

    const saveNote = (): void => {
        const text = draftNote.trim();

        if (text === "") {
            return;
        }

        onAddNote(text);
        setDraftNote("");
    };

    return (
        <>
            {/* BLOCK 1 -- the header block. */}
            <Box
                data-testid="node-header-block"
                style={{
                    flex: "0 0 auto",
                    paddingBlock: PANEL_GRID.SECTION_PAD_BOTTOM,
                    paddingInlineStart: PANEL_GRID.PAD_LEFT,
                    paddingInlineEnd: PANEL_GRID.PAD_RIGHT,
                }}
            >
                <Group gap={INSPECTOR_CLUSTER_GAP} wrap="nowrap" justify="space-between">
                    <Text
                        span
                        title={label}
                        data-testid="node-label"
                        style={{
                            minWidth: 0,
                            fontSize: INSPECTOR_KIND_FONT_SIZE,
                            fontWeight: 500,
                            color: PANEL_INK.VALUE,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                        }}
                    >
                        {label}
                    </Text>

                    <Group gap={INSPECTOR_CLUSTER_GAP} wrap="nowrap" style={{ flex: "0 0 auto" }}>
                        <Tooltip label="Copy id" openDelay={TOOLTIP_DELAY_MS} position="top" withinPortal>
                            <ActionIcon
                                type="button"
                                variant="subtle"
                                color="gray"
                                size={PANEL_GRID.TRAIL}
                                aria-label="Copy id"
                                data-testid="node-copy-id"
                                onClick={onCopyId}
                            >
                                <UiGlyph name="copy" size={PANEL_GRID.GLYPH} />
                            </ActionIcon>
                        </Tooltip>

                        {/* `Locate` owns no drawing in the closed register of 6.8, so it
                            keeps its word rather than gaining a glyph nobody else uses. */}
                        <Button
                            variant="subtle"
                            color="gray"
                            size="compact-xs"
                            data-testid="node-locate"
                            onClick={onLocate}
                        >
                            Locate
                        </Button>
                    </Group>
                </Group>

                {/* 5.4: the id row is dropped when the displayed label equals the id. */}
                {nodeId !== label && (
                    <Text
                        span
                        data-testid="node-id"
                        style={{ fontSize: "var(--mantine-font-size-sm)", color: PANEL_INK.CHROME }}
                    >
                        {nodeId}
                    </Text>
                )}

                {pinnedToCanvas === true && (
                    <Group gap={INSPECTOR_CLUSTER_GAP} wrap="nowrap">
                        <Text span data-testid="node-pinned-badge" style={{ fontSize: "var(--mantine-font-size-sm)" }}>
                            Pinned
                        </Text>
                        <Button
                            variant="subtle"
                            color="gray"
                            size="compact-xs"
                            data-testid="node-unpin"
                            onClick={() => {
                                onUnpinFromCanvas?.();
                            }}
                        >
                            {INSPECTOR_HEADER_LABELS.unpin}
                        </Button>
                    </Group>
                )}

                {subtitle !== undefined && (
                    <Text
                        span
                        data-testid="node-subtitle"
                        style={{ fontSize: "var(--mantine-font-size-sm)", color: PANEL_INK.CHROME }}
                    >
                        {subtitle}
                    </Text>
                )}
            </Box>

            {/* BLOCK 2 -- Attributes, the app's existing grid. */}
            <Box data-testid="node-attributes">
                {attributeCount > ATTRIBUTE_FILTER_THRESHOLD && (
                    <Box
                        style={{
                            paddingInlineStart: PANEL_GRID.PAD_LEFT,
                            paddingInlineEnd: PANEL_GRID.PAD_RIGHT,
                        }}
                    >
                        <PanelField
                            label="Filter attributes"
                            kind="text"
                            width={PANEL_GRID.BODY}
                            value={attributeFilter}
                            onChange={(next) => {
                                setAttributeFilter(String(next));
                            }}
                        />
                    </Box>
                )}

                <DataAccordion data={filteredAttributes} title="Attributes" />

                {attributeCount > ATTRIBUTE_FILTER_THRESHOLD && (
                    <Box
                        style={{
                            paddingInlineStart: PANEL_GRID.PAD_LEFT,
                            paddingInlineEnd: PANEL_GRID.PAD_RIGHT,
                        }}
                    >
                        <ActionRow
                            state={`Show all ${formatted(attributeCount)}`}
                            onClick={() => {
                                onShowAllAttributes();
                            }}
                        />
                    </Box>
                )}
            </Box>

            {/* BLOCK 3 -- Computed metrics. Guaranteed to reach the first screen. */}
            {metrics.length > 0 && (
                <ControlSection
                    label="Computed metrics"
                    opened={metricsSection.opened}
                    onOpenChange={metricsSection.onOpenChange}
                >
                    {metrics.map((metric) => (
                        <InspectorMetricRow
                            key={metric.metricId}
                            metricId={metric.metricId}
                            name={metric.name}
                            value={metric.value}
                            display={metric.display}
                            percentile={metric.percentile}
                            rank={metric.rank}
                            busy={metric.busy}
                        />
                    ))}
                </ControlSection>
            )}

            {/* BLOCK 4 -- Notes. */}
            <ControlSection label="Notes" opened={notesSection.opened} onOpenChange={notesSection.onOpenChange}>
                {/* ControlSection already draws the panel's own 16 / 8 around its
                    content, so nothing inside a section draws it again. */}
                <Box>
                    <Textarea
                        autosize
                        minRows={1}
                        aria-label={addNoteChip === null ? "Add a note" : `Add a note (${addNoteChip})`}
                        placeholder="Add a note..."
                        data-testid="node-note-input"
                        value={draftNote}
                        onChange={(event) => {
                            setDraftNote(event.currentTarget.value);
                        }}
                        onKeyDown={(event) => {
                            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                                event.preventDefault();
                                saveNote();
                            }

                            if (event.key === "Escape") {
                                event.preventDefault();
                                setDraftNote("");
                            }
                        }}
                    />
                </Box>

                {openNotes.map((note) => (
                    <ActionRow
                        key={note.id}
                        // The relative time is drawn and the full timestamp is the
                        // row's title, which is what 5.4 asks of a note row.
                        state={`${note.author}, ${note.relativeTime}: ${note.text}`}
                        stateTitle={`${note.author}, ${note.timestamp}: ${note.text}`}
                        residentActions={
                            <Checkbox
                                size="xs"
                                aria-label={`Done: ${note.text}`}
                                checked={note.done}
                                onChange={(event) => {
                                    onToggleNoteDone(note.id, event.currentTarget.checked);
                                }}
                            />
                        }
                        actions={
                            <ActionIcon
                                type="button"
                                variant="subtle"
                                color="gray"
                                size={PANEL_GRID.TRAIL}
                                aria-label={`Delete note: ${note.text}`}
                                onClick={() => {
                                    onDeleteNote(note.id);
                                }}
                            >
                                <UiGlyph name="close" size={PANEL_GRID.CHEVRON} />
                            </ActionIcon>
                        }
                    />
                ))}

                {doneNotes.length > 0 && (
                    <Box>
                        <UnstyledButton
                            type="button"
                            aria-expanded={showDone}
                            data-testid="node-done-notes"
                            onClick={() => {
                                setShowDone(!showDone);
                            }}
                            style={{
                                height: PANEL_GRID.CONTROL_HEIGHT,
                                color: PANEL_INK.CHROME,
                                fontSize: "var(--mantine-font-size-sm)",
                            }}
                        >
                            {`${formatted(doneNotes.length)} done`}
                        </UnstyledButton>

                        {showDone &&
                            doneNotes.map((note) => (
                                <DataRow key={note.id} name={note.text} value={note.relativeTime} />
                            ))}
                    </Box>
                )}
            </ControlSection>

            {/* BLOCK 5 -- Neighbors. Guaranteed to reach the first screen. */}
            <ControlSection
                label="Neighbors"
                opened={neighborsSection.opened}
                onOpenChange={neighborsSection.onOpenChange}
            >
                <Box>
                    <Text
                        span
                        data-testid="neighbor-summary"
                        style={{ fontSize: "var(--mantine-font-size-sm)", color: PANEL_INK.CHROME }}
                    >
                        {groupSummary === undefined ? neighborSummary : `${neighborSummary}; ${groupSummary}`}
                    </Text>
                </Box>

                {directed === true && neighborTabCounts !== undefined && (
                    <Tabs
                        value={neighborTab}
                        onChange={(next) => {
                            setNeighborTab(next ?? "all");
                        }}
                    >
                        <Tabs.List>
                            <Tabs.Tab value="in">{`In ${neighborTabCounts.in}`}</Tabs.Tab>
                            <Tabs.Tab value="out">{`Out ${neighborTabCounts.out}`}</Tabs.Tab>
                            <Tabs.Tab value="all">{`All ${neighborTabCounts.all}`}</Tabs.Tab>
                        </Tabs.List>
                    </Tabs>
                )}

                {shownNeighbors.map((row) => (
                    <ActionRow
                        key={row.id}
                        state={`${row.label} - ${row.edgeType} - ${row.value}`}
                        onClick={() => {
                            onSelectNeighbor(row.id);
                        }}
                        actions={
                            <ActionIcon
                                type="button"
                                variant="subtle"
                                color="gray"
                                size={PANEL_GRID.TRAIL}
                                aria-label={`Note this relationship: ${row.label}`}
                                onClick={() => {
                                    onNoteRelationship(row.id);
                                }}
                            >
                                <UiGlyph name="pin" size={PANEL_GRID.GLYPH} />
                            </ActionIcon>
                        }
                    />
                ))}

                <ActionRow
                    state="Show all in data table"
                    onClick={() => {
                        onShowNeighborsInTable();
                    }}
                />
                <ActionRow
                    state="Select these"
                    onClick={() => {
                        onSelectNeighbors();
                    }}
                />
                <ActionRow
                    state={`See all ${formatted(neighborCount)}`}
                    onClick={() => {
                        onSeeAllNeighbors();
                    }}
                />
            </ControlSection>

            {/* BLOCK 6 -- the actions block, in the sticky footer outside the scroll. */}
            <InspectorActions label="Actions" actions={resident} moreActions={more} />

        </>
    );
}
