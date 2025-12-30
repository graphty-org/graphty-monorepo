import {Badge, Box, Group, Stack, Text} from "@mantine/core";
import {FileText} from "lucide-react";
import React from "react";

import type {GraphInfo} from "../../../types/selection";
import {ControlGroup} from "../controls/ControlGroup";
import {StatRow} from "../controls/StatRow";

interface GraphPropertiesPanelProps {
    /** Information about the current graph */
    graphInfo: GraphInfo;
}

/**
 * Panel displaying graph-level properties and statistics.
 * Shown when no layer is selected in the sidebar.
 */
export function GraphPropertiesPanel({
    graphInfo,
}: GraphPropertiesPanelProps): React.JSX.Element {
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
        </Stack>
    );
}
