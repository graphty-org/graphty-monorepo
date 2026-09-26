import {
    HoverCard,
    type MantineThemeComponents,
    Menu,
    Modal,
    Notification,
    Popover,
    ScrollArea,
    Tooltip,
} from "@mantine/core";
import { createElement } from "react";

import { installOverlayBehavior } from "../../components/overlays/overlayBehavior";
import { FLOATING_UI_Z_INDEX, TOOLTIP_Z_INDEX } from "../../constants/popout";
import { UiGlyph } from "../../icons";
import {
    compactMenuClassNames,
    compactMenuMiddlewares,
    compactMenuVars,
    compactModalClassNames,
    compactNotificationClassNames,
    compactPopoverClassNames,
    compactScrollAreaClassNames,
    compactSubmenuOffset,
    compactTooltipClassNames,
    NO_TRANSITION,
    SCROLLBAR_SIZE,
    TOOLTIP_ARROW_SIZE,
    TOOLTIP_CLOSE_DELAY,
    TOOLTIP_OFFSET,
    TOOLTIP_OPEN_DELAY,
    VIEWPORT_MARGIN,
} from "../styles/overlays";

/**
 * Theme extensions for the overlays (design/figma-spec.md section 8): Figma's dark menu, dark
 * tooltip, light popover, modal, toast and overlay scrollbar.
 *
 * Each extension hands Mantine `classNames` that point its parts at ../css/overlays.css.ts (and
 * at the foundation's shared cm-menu-surface / cm-menu-row / cm-popover-surface), plus the
 * behavior defaults Figma measures: no transitions, the tooltip's 1000 / 300 ms timing, the
 * menu's placement. The dropdowns keep their elevated z-index so they clear an open Popout.
 *
 * `TooltipGroup` gets the same timing as `Tooltip`, so a bare `<Tooltip.Group>` wrapped once
 * around an application shell gives Figma's warm hand-off: once one tooltip is showing (or
 * inside its 300 ms hide window), the next opens immediately. Nothing in this package nests a
 * group of its own, which would break that shell-wide warmth.
 */
export const overlayComponentExtensions: MantineThemeComponents = {
    Menu: Menu.extend({
        defaultProps: {
            zIndex: FLOATING_UI_Z_INDEX,
            position: "bottom-start",
            offset: 4,
            loop: true,
            trapFocus: true,
            transitionProps: NO_TRANSITION,
            middlewares: compactMenuMiddlewares,
        },
        classNames: compactMenuClassNames,
        // vars runs on every render: the first one installs the document-level type-ahead and
        // scroll chevrons (idempotent; see overlayBehavior.ts).
        vars: () => {
            installOverlayBehavior();
            return { dropdown: compactMenuVars };
        },
    }),

    // Submenus open and close with no delay, 4px beside the parent menu, first row level with
    // the parent row. They render inside the parent dropdown, whose height clamp makes it a
    // scroll container, so they position with the fixed strategy to escape its clipping.
    MenuSub: Menu.Sub.extend({
        defaultProps: {
            openDelay: 0,
            closeDelay: 0,
            offset: compactSubmenuOffset,
            floatingStrategy: "fixed",
            transitionProps: NO_TRANSITION,
            middlewares: { flip: true, shift: { padding: VIEWPORT_MARGIN, crossAxis: true } },
        },
    }),

    // The submenu chevron: a 24 x 24 box holding a 3 x 5 caret (UiGlyph caretRight at 10).
    MenuSubItem: Menu.Sub.Item.extend({
        defaultProps: {
            rightSection: createElement(
                "span",
                { className: "cm-menu-chevron", "aria-hidden": true },
                createElement(UiGlyph, { name: "caretRight", size: 10 }),
            ),
        },
    }),

    Tooltip: Tooltip.extend({
        defaultProps: {
            zIndex: TOOLTIP_Z_INDEX,
            position: "bottom",
            offset: TOOLTIP_OFFSET,
            withArrow: true,
            arrowSize: TOOLTIP_ARROW_SIZE,
            openDelay: TOOLTIP_OPEN_DELAY,
            closeDelay: TOOLTIP_CLOSE_DELAY,
            transitionProps: NO_TRANSITION,
            events: { hover: true, focus: true, touch: false },
            middlewares: { flip: true, shift: { padding: VIEWPORT_MARGIN } },
        },
        classNames: compactTooltipClassNames,
        // vars runs on every render: the first one installs the instant dismiss and the focus
        // delay (idempotent; see overlayBehavior.ts).
        vars: () => {
            installOverlayBehavior();
            return { tooltip: {} };
        },
    }),

    TooltipGroup: Tooltip.Group.extend({
        defaultProps: {
            openDelay: TOOLTIP_OPEN_DELAY,
            closeDelay: TOOLTIP_CLOSE_DELAY,
        },
    }),

    Popover: Popover.extend({
        defaultProps: {
            zIndex: FLOATING_UI_Z_INDEX,
            transitionProps: NO_TRANSITION,
        },
        classNames: compactPopoverClassNames,
    }),

    HoverCard: HoverCard.extend({
        defaultProps: {
            zIndex: FLOATING_UI_Z_INDEX,
            transitionProps: NO_TRANSITION,
        },
        classNames: compactPopoverClassNames,
    }),

    // Frame sizes sm 320 / md 480 / lg 760 live on cm-modal as Mantine's --modal-size-* vars.
    Modal: Modal.extend({
        defaultProps: {
            centered: true,
            withOverlay: false,
            transitionProps: NO_TRANSITION,
        },
        classNames: compactModalClassNames,
    }),

    Notification: Notification.extend({
        defaultProps: {
            closeButtonProps: { iconSize: 10 },
        },
        classNames: compactNotificationClassNames,
    }),

    ScrollArea: ScrollArea.extend({
        defaultProps: {
            type: "hover",
            scrollHideDelay: 0,
            scrollbarSize: SCROLLBAR_SIZE,
        },
        classNames: compactScrollAreaClassNames,
    }),
};
