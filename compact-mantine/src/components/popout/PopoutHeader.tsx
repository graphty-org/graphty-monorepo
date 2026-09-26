import { ActionIcon, Box, CloseButton, Tabs, VisuallyHidden } from "@mantine/core";
import type { JSX } from "react";

import { useLabels } from "../../i18n";
import type { PopoutHeaderProps } from "../../types/popout";

// Accessibility: the tab strip is the APG "Tabs" pattern, built by Mantine's
// Tabs: a tablist whose tabs carry aria-selected and aria-controls, with arrow
// keys that move and select and follow the reading direction. The panel draws
// the matching tabpanel (same ids, see ./utils/tabs.ts). The header itself is
// the dialog's title bar: its title element is what the panel points
// aria-labelledby at.
//
// The look is Figma's light popover header (design/figma-spec.md 8.4): 40 tall,
// padding 0 32 0 8, a 1px divider drawn as an inset shadow, the title 11/16 550
// 16px from the edge, pill tabs in the title slot, and a 24px ghost close
// button 8px from the top and the end. The CSS is cm-popout-* in
// src/theme/css/overlays.css.ts.

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
 * @param props.tabsId - The base id of the tab strip, shared with the panel's tab panel
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
    tabsId,
}: PopoutHeaderProps): JSX.Element {
    const labels = useLabels();

    // Extract style from dragTriggerProps to merge with the bar's style
    const { style: dragStyle, ...restDragProps } = dragTriggerProps as {
        style?: React.CSSProperties;
        [key: string]: unknown;
    };

    return (
        <Box data-testid="popout-header" className="cm-popout-header" {...restDragProps} style={dragStyle}>
            {config.variant === "title" ? (
                <h2 id={titleId} data-testid="popout-header-title" className="cm-popout-title">
                    {config.title}
                </h2>
            ) : (
                <>
                    {/* A tab strip is not a title, so the panel is named by a
                        hidden one rather than by whichever tab is selected. */}
                    <VisuallyHidden id={titleId}>{config.tabs[0]?.label ?? labels.settings}</VisuallyHidden>
                    <Tabs
                        id={tabsId}
                        variant="pills"
                        value={activeTab ?? null}
                        // Mantine's Tabs reports the value it changed to and not
                        // the event that changed it. The event is optional on
                        // every change handler in this package for this case.
                        onChange={(value) => {
                            if (value !== null) {
                                onTabChange?.(value);
                            }
                        }}
                        className="cm-popout-tabs"
                    >
                        <Tabs.List data-testid="popout-header-tabs">
                            {config.tabs.map((tab) => (
                                <Tabs.Tab key={tab.id} value={tab.id}>
                                    {tab.label}
                                </Tabs.Tab>
                            ))}
                        </Tabs.List>
                    </Tabs>
                </>
            )}

            {actions.length > 0 ? (
                <div className="cm-popout-actions">
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
                </div>
            ) : null}

            <CloseButton
                data-testid="popout-header-close"
                className="cm-popout-close"
                onClick={onClose}
                aria-label={labels.closePanel}
            />
        </Box>
    );
}
