import {
    Drawer,
    HoverCard,
    type MantineThemeComponents,
    Menu,
    Modal,
    Popover,
    Tooltip,
} from "@mantine/core";

import { FLOATING_UI_Z_INDEX } from "../../constants/popout";
import {
    compactHoverCardStyles,
    compactMenuVars,
    compactPopoverStyles,
    compactTooltipStyles,
} from "../styles/overlays";

/**
 * Theme extensions for overlay components with compact styling.
 *
 * These components use floating UI and need elevated z-index to appear
 * above Popout panels when used inside them.
 *
 * Compact styling is applied via:
 * - Menu: CSS vars (--menu-item-fz: 11px)
 * - Tooltip: styles (fontSize: 11, padding: 4px 8px)
 * - Popover: styles (dropdown padding: 8px)
 * - HoverCard: styles (dropdown padding: 8px)
 *
 * None of the four takes a size prop, so none of them got the per-size scale the
 * rest of the theme grew on 2026-09-13 (product owner: "sizes aren't varying
 * anymore"). Menu's resolver stays argument-less deliberately -- see
 * compactMenuVars in ../styles/overlays.ts.
 */
export const overlayComponentExtensions: MantineThemeComponents = {
    Menu: Menu.extend({
        defaultProps: {
            zIndex: FLOATING_UI_Z_INDEX,
            // Mantine's placeholder is a role-less focusable div inside role="menu", which
            // a menu may not own (axe: aria-required-children). Without it, focus lands on
            // the first item on open, as the WAI-ARIA menu pattern asks.
            withInitialFocusPlaceholder: false,
        },
        vars: () => ({
            dropdown: compactMenuVars,
        }),
    }),

    // Mantine's close button is an icon with no text and no label, so it has no
    // accessible name (axe: button-name). A caller's own closeButtonProps still win.
    Modal: Modal.extend({
        defaultProps: {
            closeButtonProps: { "aria-label": "Close" },
        },
    }),

    Drawer: Drawer.extend({
        defaultProps: {
            closeButtonProps: { "aria-label": "Close" },
        },
    }),

    Tooltip: Tooltip.extend({
        defaultProps: {
            zIndex: FLOATING_UI_Z_INDEX,
        },
        styles: compactTooltipStyles,
    }),

    Popover: Popover.extend({
        defaultProps: {
            zIndex: FLOATING_UI_Z_INDEX,
        },
        styles: compactPopoverStyles,
    }),

    HoverCard: HoverCard.extend({
        defaultProps: {
            zIndex: FLOATING_UI_Z_INDEX,
        },
        styles: compactHoverCardStyles,
    }),
};
