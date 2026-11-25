import { ActionIcon, Box, CloseButton, Menu, Tabs, Tooltip, VisuallyHidden } from "@mantine/core";
import type { JSX } from "react";

import { useLabels } from "../../i18n";
import { UiGlyph } from "../../icons";
import { compactMenuMiddlewares } from "../../theme/styles/overlays";
import type { PopoutHeaderMore, PopoutHeaderProps } from "../../types/popout";
import { type Direction, useDirection } from "../../utils/rtl";
import { resolvePlacement } from "./utils/position";

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

/** The gap between "..." and its menu, and between the pop-over and a menu beside it, in px. */
const MENU_GAP = 4;

/**
 * Where the "..." menu may open: below its button, else above, else beside the pop-over -- the
 * start side, then the end side, as a group pop-over placed "beside" does (chooseBesideSide) --
 * so a long menu opens whole rather than scrolling. Only the main axis is tested: the shift
 * middleware slides a beside menu up or down into the window. Mantine passes a non-boolean flip
 * straight to floating-ui.
 * @param direction - the reading direction, which decides which side is the start
 * @returns the menu's middlewares
 */
function moreMenuMiddlewares(direction: Direction): typeof compactMenuMiddlewares {
    const flip = {
        crossAxis: false,
        fallbackPlacements: [
            "top-start",
            `${resolvePlacement("start", direction)}-start`,
            `${resolvePlacement("end", direction)}-start`,
        ],
    };
    return { ...compactMenuMiddlewares, flip: flip as unknown as boolean };
}

/**
 * The menu's distance from "...": the usual gap above or below it, and beside the pop-over the gap
 * from the pop-over's own edge, so the menu never covers the pop-over. Floating-ui's offset may be
 * derived from the placement it is trying, which Mantine passes straight through.
 * @param state - floating-ui's middleware state
 * @param state.placement - the placement being tried
 * @param state.elements - the button the menu opens from
 * @param state.elements.reference - the button
 * @returns the main-axis offset, in px
 */
function moreMenuOffset(state: { placement: string; elements: { reference: unknown } }): number {
    const { reference } = state.elements;
    const panel = reference instanceof Element ? reference.closest(".cm-popout") : null;
    if (!(reference instanceof Element) || panel === null) {
        return MENU_GAP;
    }
    const button = reference.getBoundingClientRect();
    const edge = panel.getBoundingClientRect();
    if (state.placement.startsWith("left")) {
        return button.left - edge.left + MENU_GAP;
    }
    if (state.placement.startsWith("right")) {
        return edge.right - button.right + MENU_GAP;
    }
    return MENU_GAP;
}

/**
 * The header's "..." button: a ghost icon button with a tooltip, drawn in the brand color while
 * something it leads to is set and it is not open. With entries it opens a menu of them; without,
 * it calls its own click.
 * @param props - Component props
 * @param props.more - What the button is called, its set state, and its menu or click
 * @returns The button, with its menu when it has one
 */
function MoreButton({ more }: Readonly<{ more: PopoutHeaderMore }>): JSX.Element {
    const direction = useDirection();
    const glyph = <UiGlyph name="more" size={12} />;
    const look = {
        variant: "subtle",
        className: "cm-popout-more",
        "aria-label": more.label,
        "data-set": more.set === true ? "" : undefined,
    } as const;
    if (more.children === undefined) {
        return (
            <Tooltip label={more.label}>
                <ActionIcon
                    {...look}
                    aria-haspopup="dialog"
                    aria-expanded={more.expanded ?? false}
                    onClick={more.onClick}
                >
                    {glyph}
                </ActionIcon>
            </Tooltip>
        );
    }
    // The tooltip wraps Menu.Target (not the reverse), or the target's click never opens the menu.
    // A pick in the menu is not a click on the panel: React carries it out of the menu's portal to
    // the panel, whose click closes what the panel opened -- the group the pick just reopened.
    return (
        <Menu middlewares={moreMenuMiddlewares(direction)} offset={moreMenuOffset as unknown as number}>
            <Tooltip label={more.label}>
                <Menu.Target>
                    <ActionIcon {...look}>{glyph}</ActionIcon>
                </Menu.Target>
            </Tooltip>
            <Menu.Dropdown
                onClick={(event) => {
                    event.stopPropagation();
                }}
            >
                {more.children}
            </Menu.Dropdown>
        </Menu>
    );
}

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
 * @param props.more - Optional "..." button, shown after the actions
 * @param props.closeLabel - The close button's accessible name
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
    more,
    closeLabel,
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
                    <VisuallyHidden id={titleId}>
                        {config.title ?? config.tabs[0]?.label ?? labels.settings}
                    </VisuallyHidden>
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

            {actions.length > 0 || more !== undefined ? (
                <div className="cm-popout-actions">
                    {actions.map((action) => (
                        <ActionIcon key={action.id} variant="subtle" onClick={action.onClick} aria-label={action.label}>
                            {action.icon}
                        </ActionIcon>
                    ))}
                    {more === undefined ? null : <MoreButton more={more} />}
                </div>
            ) : null}

            <CloseButton
                data-testid="popout-header-close"
                className="cm-popout-close"
                onClick={onClose}
                aria-label={closeLabel ?? labels.closePanel}
            />
        </Box>
    );
}
