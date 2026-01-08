import { ActionIcon, Group, Text, UnstyledButton } from "@mantine/core";
import { X } from "lucide-react";
import type { JSX } from "react";

import type { PopoutHeaderProps } from "../../types/popout";

/**
 * Renders a tab button for the tabbed header variant.
 */
interface TabButtonProps {
    /** Tab ID */
    id: string;
    /** Tab label */
    label: string;
    /** Whether this tab is currently active */
    isActive: boolean;
    /** Callback when tab is clicked */
    onClick: () => void;
}

function TabButton({ id, label, isActive, onClick }: TabButtonProps): JSX.Element {
    return (
        <UnstyledButton
            role="tab"
            id={`tab-${id}`}
            aria-selected={isActive}
            aria-controls={`tabpanel-${id}`}
            onClick={onClick}
            px="xs"
            py={3}
            style={{
                fontSize: "11px",
                fontWeight: isActive ? 500 : 400,
                color: isActive ? "var(--mantine-color-text)" : "var(--mantine-color-dimmed)",
                borderBottom: isActive ? "2px solid var(--mantine-color-blue-filled)" : "2px solid transparent",
                cursor: "pointer",
            }}
        >
            {label}
        </UnstyledButton>
    );
}

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

    const handleTabClick = (tabId: string): void => {
        if (onTabChange) {
            onTabChange(tabId);
        }
    };

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
            {/* Left side: Title or Tabs */}
            {config.variant === "title" ? (
                <Text id={titleId} size="compact" fw={500}>
                    {config.title}
                </Text>
            ) : (
                <Group gap={0} role="tablist" aria-label="Panel tabs">
                    {/* Visually hidden title for aria-labelledby when using tabs */}
                    <span id={titleId} style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0, 0, 0, 0)" }}>
                        {tabsConfig?.tabs[0]?.label ?? "Settings"}
                    </span>
                    {tabsConfig?.tabs.map((tab) => (
                        <TabButton
                            key={tab.id}
                            id={tab.id}
                            label={tab.label}
                            isActive={activeTab === tab.id}
                            onClick={() => {
                                handleTabClick(tab.id);
                            }}
                        />
                    ))}
                </Group>
            )}

            {/* Right side: Actions and Close button */}
            <Group gap={4}>
                {actions.map((action) => (
                    <ActionIcon
                        key={action.id}
                        variant="subtle"
                        size="compact"
                        onClick={action.onClick}
                        aria-label={action.label}
                    >
                        {action.icon}
                    </ActionIcon>
                ))}
                <ActionIcon variant="subtle" size="compact" onClick={onClose} aria-label="Close panel">
                    <X size={14} />
                </ActionIcon>
            </Group>
        </Group>
    );
}
