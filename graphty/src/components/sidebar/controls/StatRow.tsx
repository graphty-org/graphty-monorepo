import {Group, Text} from "@mantine/core";
import React from "react";

interface StatRowProps {
    /** Label for the statistic */
    label: string;
    /** Value to display (can be string or number) */
    value: string | number;
}

/**
 * A label-value pair component for displaying statistics.
 * Shows the label on the left and value on the right with appropriate styling.
 */
export function StatRow({label, value}: StatRowProps): React.JSX.Element {
    return (
        <Group justify="space-between" py={4}>
            <Text size="xs" c="dimmed" style={{fontSize: "11px"}}>
                {label}
            </Text>
            <Text size="xs" c="var(--mantine-color-text)" fw={500} style={{fontSize: "11px"}}>
                {String(value)}
            </Text>
        </Group>
    );
}
