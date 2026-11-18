# The compact theme

`compactTheme` is a complete Mantine theme, already merged with Mantine's
default, that draws every component the way the Figma editor draws its own.
Light and dark are Mantine's own color scheme (`defaultColorScheme`,
`forceColorScheme`, `useMantineColorScheme`); one theme serves both, and the dark
scheme uses Figma's neutral grays (#2c2c2c panels, #383838 fields).

| Token                       | Values                                                  |
| --------------------------- | ------------------------------------------------------- |
| `fontSizes` / `lineHeights` | xs 9/14, sm 11/16, md 13/22, lg 15/25, xl 24/32         |
| `spacing`                   | xs 4px, sm 8px, md 8px, lg 12px, xl 16px                |
| `radius`                    | xs 2px, sm 5px, md 5px, lg 13px, xl 13px                |
| `shadows`                   | xs to xl map onto Figma's five elevations               |
| `primaryColor`              | `brand`: #0d99ff for filled surfaces, #007be5 for links |

Every color is a CSS custom property named `--cm-*` (for example `--cm-bg`,
`--cm-text-secondary`, `--cm-bg-brand`), written with the CSS `light-dark()`
function, so it resolves from the color scheme of the element that uses it. A
subtree that has to render dark inside a light app -- a menu, a tooltip, the
shortcuts sheet -- sets `color-scheme: dark` and every token inside it follows.
Read the tokens in your own CSS; `PANEL_INK` (see [the panel grid](./panel-grid))
names the ones a panel row uses.

Controls are 24px tall with an 11px face. Fields are drawn filled and without a
border at rest, outlined on hover and ringed on focus. The focus ring is Figma's:
1px, keyboard focus only (number and text fields ring on any focus), inside a
field and outside a button. Menus, list boxes and tooltips are dark in both
schemes. Overlays open and close in one frame, with no fade.

## The bundled typeface

The theme sets Inter (the variable font, latin subset) and ships it inside the
package, inlined into the stylesheet, so Figma's 450, 550 and 600 weights render
exactly with no font setup and no network request. Inter is licensed under the
SIL Open Font License 1.1; the license text is in `dist/fonts/LICENSE-Inter.txt`.
To use another face, set `fontFamily` in a theme merged over this one.

## `createCompactTheme` and the WCAG AA option

`compactTheme` is exact Figma. Figma's secondary text, field boundaries and
checkbox edges fall short of WCAG 2.2 AA contrast, so the theme has an option
that raises them:

```tsx
import { createCompactTheme } from "@graphty/compact-mantine";

<MantineProvider theme={createCompactTheme({ highContrast: true })}>{children}</MantineProvider>;
```

`highContrast` changes color tokens only -- nothing moves. It darkens secondary
text and icons (50% to 55% black, 4.7:1), raises checkbox, switch and field
boundaries to 3:1 (fields gain a 1px inside edge), gives the selected segment of
a segmented control a 3:1 edge, and darkens placeholder text, the focus ring,
links and the brand, danger and success fills to the next darker color in
Figma's own palette. Dividers stay as Figma draws them. `createCompactTheme()`
with no options is `compactThemeOverride`, and the options it was built with are
published on `theme.other.compact`.

## The graphty accent

The accent is Figma's blue by default. `accent: "graphty"` switches it to the
graphty brand's lime and ink, in both color schemes and both contrast modes:

```tsx
<MantineProvider theme={createCompactTheme({ highContrast: true, accent: "graphty" })}>{children}</MantineProvider>
```

In light, filled buttons, the active tool, checked boxes and switches are the
mark green #97c800 with ink labels (9.1:1); links and accent text are the olive
#588300 (4.5:1 on white); focus rings, selection edges and accent graphics are
the olive too (3:1 or more on white, a field and raised gray); text on a selected
row's lime tint is ink. In dark, all of them are the bright lime #c4f23a, with
near-black labels on lime fills (14.5:1). Danger, success and inverse buttons
keep their white labels. The theme's `primaryColor` becomes `"graphty"`
(`compactGraphtyColors`), so Mantine components that read the primary palette
follow too.

## Tooltips: wrap your app once

Tooltips follow Figma's timing: the first one opens after 1000ms, and while one
is showing, or for 300ms after it closes, the next one opens at once. That
hand-off needs Mantine's `Tooltip.Group` around everything that has tooltips,
and a theme cannot add a provider, so wrap your app once:

```tsx
import { MantineProvider, Tooltip } from "@mantine/core";

<MantineProvider theme={compactTheme}>
    <Tooltip.Group>
        <App />
    </Tooltip.Group>
</MantineProvider>;
```

The theme gives `Tooltip.Group` the right delays, so it needs no props. Do not
nest a second group inside: tooltips inside it would stop sharing the warmth.
No component in this package nests one, so the warm hand-off crosses the whole
shell: from a toolbar tooltip to a rail button, to the help button, and back.
The price is that inside a group Mantine ignores a tooltip's own `openDelay`
and `closeDelay`. Figma opens rail tooltips after 500ms and shows and hides the
help button's at once; `RailButton` and `HelpButton` keep those timings when
there is no group, and take the group's 1000ms / 300ms when cold inside one.
Tooltips keep their `aria-describedby` link, so screen readers still hear them.

## Stylesheet, SSR and shadow roots

The stylesheet is injected into `document.head` when the theme is created
(and again, if something removed it, when a themed component renders). For server rendering, put `compactGlobalCss()` (or
`compactGlobalCss({ highContrast: true })`) in a `<style>` in your document head.
For a shadow root, call `ensureCompactStyles()` or append `compactGlobalCss()` to
the root yourself. Mantine's own `@mantine/core/styles.css` is still required,
imported before this package's stylesheet as in the quick start.

## Components the theme restyles

Pass no `size` prop and these render compact. Pass `size="md"` or `size="lg"`
and you get larger sizes back.

| Group      | Components                                                                                                                                                                |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Inputs     | TextInput, NumberInput, Select, NativeSelect, Textarea, PasswordInput, Autocomplete, MultiSelect, TagsInput, PillsInput, FileInput, JsonInput, InputClearButton, Combobox |
| Buttons    | Button, ActionIcon, CloseButton                                                                                                                                           |
| Controls   | Switch, Checkbox, Radio, Slider, RangeSlider, SegmentedControl                                                                                                            |
| Color      | ColorSwatch, HueSlider, AlphaSlider                                                                                                                                       |
| Display    | Badge, Text, Avatar, Avatar.Group, ThemeIcon, Indicator, Kbd, Pill, Card                                                                                                  |
| Navigation | Tabs, NavLink, Pagination, Stepper, Anchor, Burger                                                                                                                        |
| Feedback   | Loader, Progress, RingProgress, Notification, Alert                                                                                                                       |
| Overlays   | Menu, Tooltip, Tooltip.Group, Popover, HoverCard, Modal, Drawer, ScrollArea                                                                                               |

Most of these have a Storybook page under
[Themed Mantine](https://graphty.app/storybook/compact-mantine/?path=/docs/themed-mantine-actions-button--docs),
and `Select`, `NativeSelect`, `Menu`, `Tooltip` and `Modal` have theirs under Components.
`ColorSwatch`, `HueSlider` and `AlphaSlider` are shown on the
[ColorPickerPanel](https://graphty.app/storybook/compact-mantine/?path=/docs/components-color-colorpickerpanel--docs)
page, and `InputClearButton` and `Combobox` on the `Select`, `MultiSelect` and `FileInput` pages.
`Tooltip.Group`, `Popover`, `HoverCard`, `Drawer`, `Notification` and `Alert` have no page.

A few defaults are worth knowing: `Badge` defaults to the outlined look
(`variant="filled"` and `"light"` are the brand looks); `Kbd` is Figma's dark key
cap in both schemes (`size="md"` for the large cap, `variant="inline"` for a
light cap in running text, <code v-pre>mod={{ active: true }}</code> to light it); `Select`
defaults to the outlined trigger; `Tabs` defaults to pills. A removable `Pill`'s
remove button is in the Tab order and named "Remove" (Mantine hides it from the
keyboard and from screen readers); name it after the value with
<code v-pre>removeButtonProps={{ "aria-label": `Remove ${tag}` }}</code>. The name is always the
English "Remove" -- the theme cannot reach `LabelsProvider` -- and the pills of
`MultiSelect` and `TagsInput` cannot be renamed, since Mantine gives them no
`removeButtonProps`: each pill's button there reads "Remove", after the value it
follows.

## Making it your own

Merge your own theme on top of the compact one:

```tsx
import { createTheme, MantineProvider, mergeMantineTheme } from "@mantine/core";
import { compactTheme } from "@graphty/compact-mantine";

const theme = mergeMantineTheme(
    compactTheme,
    createTheme({
        primaryColor: "teal",
    }),
);

<MantineProvider theme={theme}>{children}</MantineProvider>;
```

The accent follows `primaryColor`. By default it is `"brand"`, Figma's blue (#0d99ff, exported as
`compactBrandColors`); set it to any Mantine color, or to a 10-shade palette of your own, and the
filled buttons, checked boxes and switches, focus rings, selected rows and brand text take it.
Light mode uses shades 6 (fill) and 7 (hover and text), dark mode shades 8, 9 and 4:

```tsx
const theme = mergeMantineTheme(
    compactTheme,
    createTheme({
        colors: {
            forest: [
                "#ebfbee",
                "#d3f9d8",
                "#b2f2bb",
                "#8ce99a",
                "#69db7c",
                "#51cf66",
                "#40c057",
                "#37b24d",
                "#2f9e44",
                "#2b8a3e",
            ],
        },
        primaryColor: "forest",
    }),
);
```

With `highContrast: true`, a custom accent replaces the AA option's darker blues, so check its
contrast yourself.

If you already build your theme from several overrides, take
`compactThemeOverride` (or `createCompactTheme(options)`) instead. It is the raw
`createTheme()` result, suitable for `mergeThemeOverrides()`:

```tsx
import { createTheme, mergeThemeOverrides } from "@mantine/core";
import { compactThemeOverride } from "@graphty/compact-mantine";

const override = mergeThemeOverrides(compactThemeOverride, createTheme({ primaryColor: "teal" }));
```

Merge component extensions with care: `mergeThemeOverrides` replaces a
component's `vars` or `styles` function rather than composing it, so an override
of a component this theme already extends discards the compact treatment. Adjust
such a component through its props, `classNames` or the `--cm-*` tokens instead.
The theme extends these keys of `theme.components` (`AvatarGroup` is `Avatar.Group`,
`TabsTab` is `Tabs.Tab`, and so on); an override that names any of them replaces the compact
treatment of that component:

<!-- theme-component-keys:start -->

`ActionIcon`, `ActionIconGroup`, `Alert`, `AlphaSlider`, `Anchor`, `Autocomplete`, `Avatar`,
`AvatarGroup`, `Badge`, `Burger`, `Button`, `Card`, `Checkbox`, `CloseButton`, `ColorSwatch`,
`Combobox`, `ComboboxTarget`, `Drawer`, `DrawerHeader`, `FileInput`, `HoverCard`, `HueSlider`,
`Indicator`, `InputBase`, `InputClearButton`, `InputWrapper`, `JsonInput`, `Kbd`, `Loader`,
`Menu`, `MenuSub`, `MenuSubItem`, `Modal`, `ModalHeader`, `MultiSelect`, `NativeSelect`,
`NavLink`, `Notification`, `NumberInput`, `Pagination`, `PasswordInput`, `Pill`, `PillsInput`,
`Popover`, `Progress`, `Radio`, `RangeSlider`, `RingProgress`, `ScrollArea`, `SegmentedControl`,
`Select`, `Slider`, `Stepper`, `Switch`, `Tabs`, `TabsTab`, `TagsInput`, `Text`, `Textarea`,
`TextInput`, `ThemeIcon`, `Tooltip`, `TooltipGroup`.

<!-- theme-component-keys:end -->

An override of any other component, and `defaultProps` on any component, merge safely.

## A compact region inside a normal-sized app

`MantineProvider` nests, so you can keep your application at its usual size and
make one region dense -- which is the common case for a sidebar or an inspector.

```tsx
<MantineProvider>
    <TextInput label="Normal size" />

    <MantineProvider theme={compactTheme}>
        <aside style={{ width: 240 }}>
            <TextInput label="Compact" />
        </aside>
    </MantineProvider>
</MantineProvider>
```

Also exported: `compactColors` (the palettes this theme adds), `compactDarkColors`
(its neutral dark scale) and `compactBrandColors` (the brand scale), if you want
to reuse the colors elsewhere.
