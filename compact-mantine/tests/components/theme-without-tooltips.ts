import { mergeThemeOverrides, Tooltip } from "@mantine/core";

import { compactTheme } from "../../src";

/**
 * The compact theme with every tooltip switched off: none opens on hover, focus or touch.
 *
 * For jsdom tests of keyboard or pointer behavior that say nothing about tooltips. Each focus
 * move or hover otherwise mounts the target's tooltip, and positioning it makes floating-ui read
 * the computed style of the target and every ancestor. jsdom drops its style cache on every DOM
 * change, so each of those reads re-matches the whole package stylesheet (about 1.4 ms), and a
 * test that walks a toolbar with the arrows spent most of its CPU there -- enough to pass the 5 s
 * timeout in a loaded pre-push gate (issue #1514). The tooltips themselves are tested on their
 * own, with the full theme.
 */
export const compactThemeWithoutTooltips = mergeThemeOverrides(compactTheme, {
    components: {
        Tooltip: Tooltip.extend({ defaultProps: { events: { hover: false, focus: false, touch: false } } }),
    },
});
