import { compactThemeOverride, PANEL_INK } from "@graphty/compact-mantine";
import { ColorInput, createTheme, mergeThemeOverrides, NativeSelect } from "@mantine/core";

/**
 * The 24px input metrics this app draws every field at -- VOCAB section 11's grid
 * (control height 24px, 11px value ink, 8px inset) -- written as CSS custom
 * properties because Mantine resolves an input's box from them and a static style
 * cannot beat a var.
 *
 * BOTH `--input-height` and `--input-size` are set deliberately. Mantine's
 * `styles.css` reads `height: var(--input-size)` but `min-height:
 * var(--input-height)`, so setting only one leaves the other resolving against
 * `--input-height-<size>`; no such variable exists for this app's private
 * "compact" size name, which is why a compact field's min-height used to fall
 * back to `auto`.
 *
 * `--input-bd` is `transparent`, not `none`: Mantine draws the border as
 * `1px solid var(--input-bd)` and shows focus by swapping that one variable to
 * `--input-bd-focus`, so `none` invalidates the whole declaration and the focus
 * border can never paint. `transparent` keeps the field borderless at rest and
 * reserves the 1px the focus ring needs (build spec 04 section 11.2: "prefer the
 * library's `transparent`").
 *
 * `--input-bd-focus` is primary-5 in dark rather than Mantine's default filled
 * shade, which measures 2.66:1 on a #2a3035 field -- under the 3:1 WCAG 1.4.11
 * asks of a non-text indicator. This is the value and the reasoning
 * `@graphty/compact-mantine` documents on its own `compactInputVars`.
 *
 * These values ARE the library's `compactInputVars`. They are restated here only
 * because the library does not export them and does not extend the two
 * components below -- see `appThemeOverride`. Anything the library does extend
 * must NOT be re-extended here.
 */
const compactInputVars = {
    "--input-height": "24px",
    "--input-size": "24px",
    "--input-fz": "11px",
    "--input-bg": "var(--mantine-color-default)",
    "--input-bd": "transparent",
    "--input-bd-focus": "light-dark(var(--mantine-primary-color-filled), var(--mantine-primary-color-5))",
} as const;

/**
 * The static half of the compact input treatment: an 11px label above an 8px-inset
 * field. The border is deliberately absent -- it lives on `--input-bd` above, and
 * an inline `border` here would win over Mantine's focus rule and put the field
 * back to having no visible focus indicator.
 *
 * The label ink is the library's `PANEL_INK.CHROME`, not `--mantine-color-dimmed`.
 * Dimmed is dark-2 (#7a828e), which at 11px measures 4.03:1 on the panel and 3.44:1
 * on a field -- under the 4.5:1 WCAG AA asks of text -- and it is the colour the
 * twelve inputs the library extends already moved off. Keeping dimmed here would
 * leave a NativeSelect label a visibly different grey from the TextInput label
 * beside it in the same section.
 */
const compactInputStyles = {
    label: {
        fontSize: 11,
        color: PANEL_INK.CHROME,
        marginBottom: 1,
        lineHeight: 1.2,
    },
    input: {
        // Logical, not paddingLeft/paddingRight, so a field under dir="rtl" pads the
        // edge its text starts from.
        paddingInlineStart: 8,
        paddingInlineEnd: 8,
    },
};

/**
 * The application's own theme override: the dark ramp the shell is drawn on, plus
 * the two Mantine inputs `@graphty/compact-mantine` does not cover.
 *
 * It carries NO extension for any component the library already extends, and
 * nothing may add one back. `theme` below merges the two overrides with
 * `mergeThemeOverrides`, whose `deepMerge` recurses into plain objects only --
 * `isObject()` is false for a function -- so a `vars` or `styles` FUNCTION here
 * REPLACES the library's rather than composing with it. `defaultProps` is a plain
 * object and does merge, so an app extension whose non-compact branch returned
 * `{ root: {}, wrapper: {} }` left every component still asking for the library's
 * `size="sm"` while the thing that defined what that size means had been deleted:
 * fifteen components (TextInput, NumberInput, SegmentedControl, Checkbox, Switch,
 * Slider, Button, ActionIcon, Select, Textarea, PasswordInput, Autocomplete, Radio,
 * Badge, Pill) silently reverted to Mantine's stock 36px box. That is what made the
 * Style panel's layout picker 224x36 in a 32px row instead of VOCAB RT-1's 224x24.
 *
 * The app's `size="compact"` variant predates the library (build spec 04 section
 * 11.2) and its values were identical field for field to the library's, so the
 * duplicates are simply gone; the library applies the same treatment
 * unconditionally, which is why call sites that still pass `size="compact"` keep
 * working. If a future component genuinely needs an app-side extension, EITHER the
 * library must not extend it, OR the extension's fallback branch must return the
 * library's values -- never `{}`.
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

    components: {
        // NativeSelect and ColorInput are the only two inputs `@graphty/compact-mantine`
        // publishes no extension for, so these two do not collide with anything and are
        // the app's job. Both are unconditional, like every extension in the library: a
        // size-gated branch is what let the default size drift back to 36px, and every
        // call site in this app wants the compact box anyway.
        NativeSelect: NativeSelect.extend({
            vars: () => ({
                root: {},
                wrapper: compactInputVars,
            }),
            styles: compactInputStyles,
        }),

        ColorInput: ColorInput.extend({
            vars: () => ({
                root: {},
                wrapper: compactInputVars,
                eyeDropperIcon: {},
                eyeDropperButton: {},
                colorPreview: {},
            }),
            styles: compactInputStyles,
        }),
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
