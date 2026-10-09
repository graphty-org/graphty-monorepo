import { CompactColorInput, ControlSection, DataRow, PANEL_GRID } from "@graphty/compact-mantine";
import type { ScopeInput } from "@graphty/graphty-element/session";
import { Stack, Text, Tooltip } from "@mantine/core";
import type React from "react";

import { weightName } from "../analyze/words";
import { useVisibilityVersion } from "../data-place/useVisibilityVersion";
import { useWorkspace } from "../state/WorkspaceContext";
import { count, directionWords, formatNumber, measurementGloss, measurementWord } from "./words";

/**
 * "19 of 20", exact counts.
 * @param part - how many are showing.
 * @param whole - how many the graph holds.
 * @returns the words.
 */
function ofWords(part: number, whole: number): string {
    return `${part.toLocaleString()} of ${whole.toLocaleString()}`;
}

/**
 * The graph's Values tab, the Overview (tier1-design.md section 2.7, task T6): every count the
 * element publishes about the graph's shape, each that can be selected a link that selects it.
 * While a filter step is on, it leads with the element's visible counts and says that the rest
 * are for the whole graph, so a reader does not take them for what is showing.
 * @returns The Overview
 */
export function Overview(): React.JSX.Element | null {
    const { session } = useWorkspace();
    useVisibilityVersion(session);
    if (session === null) {
        return null;
    }
    const statistics = session.data.statistics();
    if (statistics.nodeCount === 0) {
        return (
            <Text size="xs" c="dimmed" p="md">
                No nodes to draw
            </Text>
        );
    }
    const select = (scope: ScopeInput) => () => {
        void session.selection.apply({ scope });
    };
    const [low, high] = statistics.degreeRange;
    const weight = session.data.loadedWeight();
    const filtered = session.visibility.steps.some((step) => step.on);
    const showing = session.visibility.summary;

    return (
        <ControlSection label="Overview" defaultOpened>
            {filtered && (
                <>
                    <DataRow stat name="Nodes showing" value={ofWords(showing.visibleNodes, showing.totalNodes)} />
                    <DataRow stat name="Edges showing" value={ofWords(showing.visibleEdges, showing.totalEdges)} />
                    <Text size="sm" c="dimmed" pl={PANEL_GRID.PAD_LEFT} pr={PANEL_GRID.PAD_RIGHT} py={2}>
                        The counts below are for the whole graph.
                    </Text>
                </>
            )}
            <DataRow stat name="Nodes" value={statistics.nodeCount} />
            <DataRow stat name="Edges" value={statistics.edgeCount} />
            <DataRow stat name="Direction" value={directionWords(statistics)} />
            {weight !== null && (
                <DataRow stat name="Loaded weight" value={weightName(weight.attribute, weight.meaning)} />
            )}
            <DataRow stat name="Density" value={formatNumber(statistics.density)} />
            <DataRow stat name="Components" value={statistics.components.count} />
            {statistics.components.count > 1 && (
                <DataRow
                    name="Largest component"
                    value={count(statistics.components.largestSize, "node")}
                    onClick={select("largest-component")}
                />
            )}
            {/* The distribution's histogram waits for graphty-element #896; range and mean show. */}
            <DataRow
                stat
                name="Edges per node"
                value={`${formatNumber(low)} to ${formatNumber(high)}, mean ${formatNumber(statistics.meanDegree)}`}
            />
            {/* Text, not links, until graphty-element can select the isolated nodes it counts
                (#931) and the self-loops and repeated edges (#899). */}
            {statistics.components.isolatedCount > 0 && (
                <DataRow name={`${count(statistics.components.isolatedCount, "node")} joined to no other node`} />
            )}
            {statistics.selfLoopCount > 0 && (
                <DataRow name={`${count(statistics.selfLoopCount, "edge")} from a node to itself`} />
            )}
            {statistics.repeatedEdgeCount > 0 && (
                <DataRow name={count(statistics.repeatedEdgeCount, "repeated edge")} />
            )}
        </ControlSection>
    );
}

/**
 * The graph's Style tab, Canvas section (tier1-design.md section 2.7): Background. Show all
 * labels waits for a view-only door in graphty-element (#903), and Reframe when data changes for
 * a yes/no switch (#900); neither is drawn until then.
 * @returns The section
 */
export function CanvasSection(): React.JSX.Element | null {
    const { session } = useWorkspace();
    if (session === null) {
        return null;
    }
    const { background } = session.config;
    const color = background.backgroundType === "color" ? background.color : undefined;

    return (
        <ControlSection label="Canvas" defaultOpened>
            <Stack gap={4} px="md">
                <CompactColorInput
                    label="Background"
                    color={color}
                    defaultColor="#ffffff"
                    showOpacity={false}
                    onChangeEnd={(next) => {
                        if (next !== undefined) {
                            // Once per gesture, so a drag is one step; project:changed re-renders
                            // the inspector with the new color.
                            void session.config.set({ background: { backgroundType: "color", color: next } });
                        }
                    }}
                />
            </Stack>
        </ControlSection>
    );
}

/**
 * The Everything row's Values tab (tier1-design.md section 2.7): what the row covers, which is
 * every node and every edge.
 * @returns The Summary
 */
export function EverythingValues(): React.JSX.Element | null {
    const { session } = useWorkspace();
    if (session === null) {
        return null;
    }
    const { nodes, edges } = session.status.counts;
    return (
        <ControlSection label="Summary" defaultOpened>
            <Text size="xs" px="md">
                {`Covers every node and edge: ${count(nodes, "node")}, ${count(edges, "edge")}.`}
            </Text>
        </ControlSection>
    );
}

const ORIGIN_WORDS = { imported: "From the file", joined: "Joined", computed: "Computed", result: "Result" } as const;

/**
 * An attribute's inspector (tier1-design.md section 2.7, picked in Data > Attributes): Summary
 * (its table, its kind and origin as plain rows, how complete it is). Its values histogram waits for
 * graphty-element to publish a column's distribution (#897).
 * @param props - Component props
 * @param props.path - The attribute's path, such as `data.age`
 * @returns The Summary, or nothing when the graph has no such attribute
 */
export function AttributeValues({ path }: Readonly<{ path: string }>): React.JSX.Element | null {
    const { session } = useWorkspace();
    const column = session?.data.attributes().find((candidate) => candidate.path === path);
    if (column === undefined) {
        return null;
    }
    const measurement = column.measurement === undefined ? undefined : measurementWord(column.measurement);
    return (
        <ControlSection label="Summary" defaultOpened>
            <DataRow stat name="Table" value={column.kind === "node" ? "Nodes" : "Edges"} />
            {/* Facts, not controls: plain rows on the rows' own grid. The kind's word is short, so
                what it means rides in a tooltip on the word, reachable by Tab too. */}
            {measurement !== undefined && (
                <DataRow
                    stat
                    name="Kind"
                    value={
                        <Tooltip label={measurementGloss(column.measurement)} multiline w={220}>
                            <span tabIndex={0}>{measurement}</span>
                        </Tooltip>
                    }
                />
            )}
            <DataRow stat name="Origin" value={ORIGIN_WORDS[column.origin]} />
            <DataRow stat name="Has a value" value={`${formatNumber(column.completeness * 100)}%`} />
            {column.uniqueCount !== undefined && <DataRow stat name="Distinct values" value={column.uniqueCount} />}
            {column.min !== undefined && column.max !== undefined && (
                <DataRow stat name="Range" value={`${formatNumber(column.min)} to ${formatNumber(column.max)}`} />
            )}
        </ControlSection>
    );
}
