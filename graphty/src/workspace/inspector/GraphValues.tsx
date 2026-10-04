import { CompactColorInput, ControlSection, DataRow } from "@graphty/compact-mantine";
import type { ScopeInput } from "@graphty/graphty-element/session";
import { Badge, Group, Stack, Text } from "@mantine/core";
import type React from "react";

import { useWorkspace } from "../state/WorkspaceContext";
import { useAsyncValue } from "./hooks";
import { count, directionWords, formatNumber } from "./words";

/** The nodes with no edges, as a rule graphty-element resolves. */
const NO_EDGES: ScopeInput = { define: { kind: "rule", where: { kind: "degree", max: 0 }, reading: "induced" } };

/**
 * The graph's Values tab, the Overview (tier1-design.md section 2.7, task T6): every count the
 * element publishes about the graph's shape, each that can be selected a link that selects it.
 * @param props - Component props
 * @param props.version - Changes whenever the element reports a change
 * @returns The Overview
 */
export function Overview({ version }: { version: number }): React.JSX.Element | null {
    const { session } = useWorkspace();
    const noEdges = useAsyncValue(() => session?.scope.count(NO_EDGES) ?? null, version);
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

    return (
        <ControlSection label="Overview" defaultOpened>
            <DataRow stat name="Nodes" value={statistics.nodeCount} />
            <DataRow stat name="Edges" value={statistics.edgeCount} />
            <DataRow stat name="Direction" value={directionWords(statistics)} />
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
            {noEdges !== undefined && noEdges.nodes > 0 && (
                <DataRow name={`${count(noEdges.nodes, "node")} with no edges`} onClick={select(NO_EDGES)} />
            )}
            {/* Text, not links, until graphty-element can select them (#899). */}
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
                    onChange={(next) => {
                        if (next !== undefined) {
                            // One step; project:changed re-renders the inspector with the new color.
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

/** The roles a column's measurement gives it, as read-only tags. */
const MEASUREMENT_WORDS: Readonly<Record<string, string>> = {
    categorical: "Groups",
    ordinal: "Ordered",
    quantitative: "Amount",
    time: "Time",
};
const ORIGIN_WORDS = { imported: "From the file", joined: "Joined", computed: "Computed", result: "Result" } as const;

/**
 * An attribute's inspector (tier1-design.md section 2.7, picked in Data > Attributes): Summary
 * (its table, its roles as read-only tags, how complete it is). Its values histogram waits for
 * graphty-element to publish a column's distribution (#897).
 * @param props - Component props
 * @param props.path - The attribute's path, such as `data.age`
 * @returns The Summary, or nothing when the graph has no such attribute
 */
export function AttributeValues({ path }: { path: string }): React.JSX.Element | null {
    const { session } = useWorkspace();
    const column = session?.data.attributes().find((candidate) => candidate.path === path);
    if (column === undefined) {
        return null;
    }
    return (
        <ControlSection label="Summary" defaultOpened>
            <DataRow stat name="Table" value={column.kind === "node" ? "Nodes" : "Edges"} />
            <Group gap={4} px="md" py={2}>
                {column.measurement !== undefined && (
                    <Badge size="xs" variant="light">
                        {MEASUREMENT_WORDS[column.measurement] ?? column.measurement}
                    </Badge>
                )}
                <Badge size="xs" variant="light">
                    {ORIGIN_WORDS[column.origin]}
                </Badge>
            </Group>
            <DataRow stat name="Has a value" value={`${formatNumber(column.completeness * 100)}%`} />
            {column.uniqueCount !== undefined && <DataRow stat name="Distinct values" value={column.uniqueCount} />}
            {column.min !== undefined && column.max !== undefined && (
                <DataRow stat name="Range" value={`${formatNumber(column.min)} to ${formatNumber(column.max)}`} />
            )}
        </ControlSection>
    );
}
