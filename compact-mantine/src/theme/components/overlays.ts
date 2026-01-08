import { HoverCard, type MantineThemeComponents, Menu, Popover, Tooltip } from "@mantine/core";

import { FLOATING_UI_Z_INDEX } from "../../constants/popout";

/**
 * Theme extensions for overlay components.
 *
 * These components use floating UI and need elevated z-index to appear
 * above Popout panels when used inside them.
 */
export const overlayComponentExtensions: MantineThemeComponents = {
    Menu: Menu.extend({
        defaultProps: {
            zIndex: FLOATING_UI_Z_INDEX,
        },
    }),

    Tooltip: Tooltip.extend({
        defaultProps: {
            zIndex: FLOATING_UI_Z_INDEX,
        },
    }),

    Popover: Popover.extend({
        defaultProps: {
            zIndex: FLOATING_UI_Z_INDEX,
        },
    }),

    HoverCard: HoverCard.extend({
        defaultProps: {
            zIndex: FLOATING_UI_Z_INDEX,
        },
    }),
};
