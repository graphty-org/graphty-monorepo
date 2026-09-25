import { compactThemeOverride } from "@graphty/compact-mantine";
import { createTheme, mergeThemeOverrides } from "@mantine/core";

/**
 * The application's own theme override: the dark ramp the shell is drawn on.
 *
 * It carries NO component extensions, and nothing may add one for a component
 * `@graphty/compact-mantine` already extends. `theme` below merges the two
 * overrides with `mergeThemeOverrides`, whose `deepMerge` recurses into plain
 * objects only -- `isObject()` is false for a function -- so a `vars` or `styles`
 * FUNCTION here REPLACES the library's rather than composing with it. `defaultProps`
 * is a plain object and does merge, so an app extension whose non-compact branch
 * returned `{ root: {}, wrapper: {} }` left every component still asking for the
 * library's `size="sm"` while the thing that defined what that size means had been
 * deleted: fifteen components (TextInput, NumberInput, SegmentedControl, Checkbox,
 * Switch, Slider, Button, ActionIcon, Select, Textarea, PasswordInput, Autocomplete,
 * Radio, Badge, Pill) silently reverted to Mantine's stock 36px box. That is what
 * made the Style panel's layout picker 224x36 in a 32px row instead of VOCAB RT-1's
 * 224x24.
 *
 * A component the library styles wrongly, or does not style at all, is fixed in the
 * library, never here.
 */
const appThemeOverride = createTheme({
    colors: {
        dark: [
            "#d5d7da",
            "#a3a8b1",
            "#7a828e",
            "#5f6873",
            "#48525c",
            "#374047",
            "#2a3035",
            "#1f2428",
            "#161b22",
            "#0d1117",
        ],
    },
});

/**
 * The one theme the application mounts, and the one its tests mount.
 *
 * Merged, not stacked: `mergeThemeOverrides` deep-merges the library's override with
 * this app's, so the library's tokens, its `focusRing: "auto"`, its `other.panelGrid`
 * and -- critically -- its component `vars`/`styles` are all in force under the app's
 * own dark ramp, instead of being lost because the provider was handed the app
 * override alone (PLAN item 2, build spec 04 section 11.2).
 *
 * Nothing but this file decides the order: the app is merged LAST, so where both
 * describe the same component the app wins outright. That is exactly why
 * `appThemeOverride` describes no component the library describes -- see its comment.
 */
export const theme = mergeThemeOverrides(compactThemeOverride, appThemeOverride);
