import { ActionIcon, CloseButton, Group, SegmentedControl, Text, VisuallyHidden } from "@mantine/core";
import type { JSX } from "react";

import { useLabels } from "../../i18n";
import type { PopoutHeaderProps } from "../../types/popout";

// Accessibility: the tab strip is the APG "Radio Group" pattern rather than the
// "Tabs" pattern, because that is what Mantine's SegmentedControl builds --
// real radio inputs in a group, with arrow-key movement and checked state
// exposed natively, and arrow keys that already follow the reading direction.
// The header itself is the dialog's title bar: its title element is what the
// panel points aria-labelledby at.

/**
 * The bar across the top of a pop-out panel: its title or tab strip, any action
 * buttons, and the close button.
 *
 * The whole bar is the panel's drag handle. Which tab is selected is decided by
 * the panel rather than here, so that reopening a panel starts from its first
 * tab again.
 * @param props - Component props
 * @param props.config - Header configuration with variant and title or tabs
 * @param props.onClose - Called when the close button is activated
 * @param props.dragTriggerProps - Props that make the bar a drag handle
 * @param props.actions - Optional action buttons, shown before the close button
 * @param props.activeTab - Currently selected tab
 * @param props.onTabChange - Called when a different tab is selected, with its id first
 * @param props.titleId - ID given to the title element, which names the panel
 * @returns The pop-out panel's header bar
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
    const labels = useLabels();

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
            data-testid="popout-header"
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
                <Text id={titleId} data-testid="popout-header-title" size="sm" fw={500}>
                    {config.title}
                </Text>
            ) : (
                <>
                    {/* A tab strip is not a title, so the panel is named by a
                        hidden one rather than by whichever tab is selected. */}
                    <VisuallyHidden id={titleId}>
                        {tabsConfig?.tabs[0]?.label ?? labels.settings}
                    </VisuallyHidden>
                    <SegmentedControl
                        data-testid="popout-header-tabs"
                        data={segmentedData}
                        value={activeTab}
                        // Mantine's SegmentedControl reports the value it
                        // changed to and not the event that changed it. The
                        // event is optional on every change handler in this
                        // package for exactly this case.
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
                <CloseButton
                    size="sm"
                    data-testid="popout-header-close"
                    onClick={onClose}
                    aria-label={labels.closePanel}
                />
            </Group>
        </Group>
    );
}
