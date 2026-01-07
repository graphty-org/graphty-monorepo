import { ActionIcon, Group, Text } from "@mantine/core";
import { X } from "lucide-react";
import type { JSX } from "react";

import type { PopoutHeaderProps } from "../../types/popout";

/**
 * Header component for the popout panel.
 * Phase 1 supports the "title" variant only.
 * Phase 3 will add the "tabs" variant.
 * @param props - Component props
 * @param props.config - Header configuration with variant and title
 * @param props.onClose - Callback when close button is clicked
 * @returns The PopoutHeader component
 */
export function PopoutHeader({ config, onClose }: PopoutHeaderProps): JSX.Element {
    return (
        <Group justify="space-between" px="sm" py="xs">
            <Text size="sm" fw={500}>
                {config.title}
            </Text>
            <ActionIcon variant="subtle" size="sm" onClick={onClose} aria-label="Close panel">
                <X size={14} />
            </ActionIcon>
        </Group>
    );
}
