import {
    HoverCard,
    type MantineThemeComponents,
    Menu,
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
 */
export const overlayComponentExtensions: MantineThemeComponents = {
    Menu: Menu.extend({
        defaultProps: {
            zIndex: FLOATING_UI_Z_INDEX,
        },
        vars: () => ({
            dropdown: compactMenuVars,
        }),
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
