import { ActionIcon, CloseButton, Group, SegmentedControl, Text } from "@mantine/core";
import type { JSX } from "react";

import type { PopoutHeaderProps } from "../../types/popout";

/**
 * Header component for the popout panel.
 * Supports two variants:
 * - "title": Simple text header with title
 * - "tabs": Tabbed interface with multiple tabs
 * Tab state is controlled by PopoutPanel for proper reset-on-reopen behavior.
 * @param props - Component props
 * @param props.config - Header configuration with variant and title/tabs
 * @param props.onClose - Callback when close button is clicked
 * @param props.dragTriggerProps - Props to apply to the drag handle area
 * @param props.actions - Optional action buttons to display
 * @param props.activeTab - Currently active tab ID (controlled)
 * @param props.onTabChange - Callback when active tab changes (controlled)
 * @param props.titleId - ID for the title element (for aria-labelledby)
 * @returns The PopoutHeader component
 */
export function PopoutHeader({
    config,
    onClose,
    dragTriggerProps = {},
    actions = [],
    activeTab,
    onTabChange,
    titleId,
}: PopoutHeaderProps): JSX.Element {
    // Extract style from dragTriggerProps to merge with Group's style
    const { style: dragStyle, ...restDragProps } = dragTriggerProps as {
        style?: React.CSSProperties;
        [key: string]: unknown;
    };

    // For tabs variant, get tabs config
    const isTabs = config.variant === "tabs";
    const tabsConfig = isTabs ? config : null;

    // Convert tabs to SegmentedControl data format
    const segmentedData = tabsConfig?.tabs.map((tab) => ({
        value: tab.id,
        label: tab.label,
    })) ?? [];

    return (
        <Group
            justify="space-between"
            px="sm"
            py="xs"
            {...restDragProps}
            style={{
                ...dragStyle,
            }}
        >
            {/* Left side: Title or Segmented Control */}
            {config.variant === "title" ? (
                <Text id={titleId} size="sm" fw={500}>
                    {config.title}
                </Text>
            ) : (
                <>
                    {/* Visually hidden title for aria-labelledby when using tabs */}
                    <span id={titleId} style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0, 0, 0, 0)" }}>
                        {tabsConfig?.tabs[0]?.label ?? "Settings"}
                    </span>
                    <SegmentedControl
                        data={segmentedData}
                        value={activeTab}
                        onChange={(value) => onTabChange?.(value)}
                        size="xs"
                    />
                </>
            )}

            {/* Right side: Actions and Close button */}
            <Group gap={4}>
                {actions.map((action) => (
                    <ActionIcon
                        key={action.id}
                        variant="subtle"
                        onClick={action.onClick}
                        aria-label={action.label}
                    >
                        {action.icon}
                    </ActionIcon>
                ))}
                <CloseButton size="sm" onClick={onClose} aria-label="Close panel" />
            </Group>
        </Group>
    );
}
