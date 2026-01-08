import { Group, Text } from "@mantine/core";
import React from "react";

import type { StatRowProps } from "../types";

/**
 * A label-value pair component for displaying statistics.
 * Shows the label on the left and value on the right with appropriate styling.
 * @param root0 - Component props
 * @param root0.label - Label for the statistic
 * @param root0.value - Value to display (can be string or number)
 * @returns The stat row component
 */
export function StatRow({ label, value }: StatRowProps): React.JSX.Element {
    return (
        <Group justify="space-between" py={4}>
            <Text size="compact" c="dimmed">
                {label}
            </Text>
            <Text size="compact" c="var(--mantine-color-text)" fw={500}>
                {String(value)}
            </Text>
        </Group>
    );
}
