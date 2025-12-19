import {Badge, Box, Checkbox, Group, Radio, Stack, Text} from "@mantine/core";
import {FileText} from "lucide-react";
import React from "react";

import type {GraphInfo, GraphTypeConfig} from "../../../types/selection";
import {ControlGroup} from "../controls/ControlGroup";
import {StatRow} from "../controls/StatRow";

interface GraphPropertiesPanelProps {
    /** Information about the current graph */
    graphInfo: GraphInfo;
    /** Callback when graph type settings change */
    onGraphTypeChange?: (graphType: GraphTypeConfig) => void;
}

/**
 * Panel displaying graph-level properties and statistics.
 * Shown when no layer is selected in the sidebar.
 */
export function GraphPropertiesPanel({
    graphInfo,
    onGraphTypeChange,
}: GraphPropertiesPanelProps): React.JSX.Element {
    const handleDirectedChange = (value: string): void => {
        onGraphTypeChange?.({
            ... graphInfo.graphType,
            directed: value === "directed",
        });
    };

    const handleWeightedChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
        onGraphTypeChange?.({
            ... graphInfo.graphType,
            weighted: event.target.checked,
        });
    };

    const handleSelfLoopsChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
        onGraphTypeChange?.({
            ... graphInfo.graphType,
            selfLoops: event.target.checked,
        });
    };

    const formatDensity = (density: number): string => {
        // Format to 4 decimal places, but remove trailing zeros
        return density.toFixed(4).replace(/\.?0+$/, "") || "0";
    };

    return (
        <Stack gap={0}>
            {/* Data Sources Section */}
            <ControlGroup label="Data Sources">
                {graphInfo.dataSources.length > 0 ? (
                    <Stack gap={4} py={4}>
                        {graphInfo.dataSources.map((source, index) => (
                            <Group key={index} gap="xs">
                                <FileText size={12} style={{color: "var(--mantine-color-gray-5)"}} />
                                <Text size="xs" c="dimmed" style={{fontSize: "11px"}}>
                                    {source.name}
                                </Text>
                                <Badge size="compact" variant="light" color="gray">
                                    {source.type}
                                </Badge>
                            </Group>
                        ))}
                    </Stack>
                ) : (
                    <Box py={8}>
                        <Text size="xs" c="dimmed" fs="italic" style={{fontSize: "11px"}}>
                            No data loaded
                        </Text>
                    </Box>
                )}
            </ControlGroup>

            {/* Statistics Section */}
            <ControlGroup label="Statistics">
                <Stack gap={0}>
                    <StatRow label="Nodes" value={graphInfo.nodeCount} />
                    <StatRow label="Edges" value={graphInfo.edgeCount} />
                    <StatRow label="Density" value={formatDensity(graphInfo.density)} />
                </Stack>
            </ControlGroup>

            {/* Graph Type Section */}
            <ControlGroup label="Graph Type">
                <Stack gap={8} py={4}>
                    {/* Directed/Undirected radio group */}
                    <Radio.Group
                        value={graphInfo.graphType.directed ? "directed" : "undirected"}
                        onChange={handleDirectedChange}
                    >
                        <Group gap="md">
                            <Radio
                                value="directed"
                                label="Directed"
                                size="compact"
                            />
                            <Radio
                                value="undirected"
                                label="Undirected"
                                size="compact"
                            />
                        </Group>
                    </Radio.Group>

                    {/* Weighted and Self-loops checkboxes */}
                    <Group gap="md">
                        <Checkbox
                            label="Weighted"
                            checked={graphInfo.graphType.weighted}
                            onChange={handleWeightedChange}
                            size="compact"
                        />
                        <Checkbox
                            label="Self-loops"
                            checked={graphInfo.graphType.selfLoops}
                            onChange={handleSelfLoopsChange}
                            size="compact"
                        />
                    </Group>
                </Stack>
            </ControlGroup>
        </Stack>
    );
}
