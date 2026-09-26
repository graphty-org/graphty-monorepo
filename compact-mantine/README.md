# @graphty/compact-mantine

[![npm version](https://img.shields.io/npm/v/@graphty/compact-mantine.svg)](https://www.npmjs.com/package/@graphty/compact-mantine)
[![Storybook](https://img.shields.io/badge/storybook-examples-ff4785)](https://graphty.app/storybook/compact-mantine/)
[![license](https://img.shields.io/npm/l/@graphty/compact-mantine.svg)](./LICENSE)

Compact components and a compact theme for [Mantine 8](https://mantine.dev), for
interfaces where screen space is the scarce resource: property panels,
inspectors, sidebars, editors and dashboards. The look is measured from the
Figma editor's own interface, in its light and its dark theme: the same 24px
controls, the same 11px Inter, the same colours, radii, shadows and timing.

It gives you two things, and you can take either one on its own:

1. **A theme.** Drop `compactTheme` into your `MantineProvider` and the Mantine
   components render dense and Figma-accurate -- 24px controls, 11px text,
   tighter spacing -- with no `size` prop anywhere in your code. The theme ships
   its own typeface (Inter) and stylesheet, so there is nothing else to set up.
2. **A component library.** Components built for a narrow column and an editor
   around it: rows that put a value and its label on one 32px line, charts that
   fit in the height of a line of text, a virtualized data table, a
   floating-panel system, and the editor shell -- a floating toolbar, a
   navigation rail, a quick actions palette and a keyboard shortcuts sheet.

Everything is typed, translatable, keyboard-operable, screen-reader-tested,
works in light and dark schemes, and works in right-to-left languages.

---

## Contents

- [Installation](#installation)
- [Quick start](#quick-start)
- [The compact theme](#the-compact-theme)
- [The components](#the-components)
  - [Building a panel](#building-a-panel)
  - [Editing a value](#editing-a-value)
  - [Showing data](#showing-data)
  - [Floating panels](#floating-panels)
  - [The editor shell](#the-editor-shell)
  - [Glyphs](#glyphs)
- [A worked example](#a-worked-example)
- [The panel grid](#the-panel-grid)
- [Handling events](#handling-events)
- [The shared prop names](#the-shared-prop-names)
- [Internationalization](#internationalization)
- [Right-to-left languages](#right-to-left-languages)
- [Accessibility](#accessibility)
- [TypeScript](#typescript)
- [Which one should I use?](#which-one-should-i-use)
- [Breaking changes in the Figma release](#breaking-changes-in-the-figma-release)
- [Contributing](#contributing)
- [License](#license)

---

## Installation

```bash
npm install @graphty/compact-mantine @mantine/core @mantine/hooks
```

`@mantine/core`, `@mantine/hooks`, `react` and `react-dom` are peer
dependencies, so you control their versions. React 18 or later, Mantine 8 or
later.

## Quick start

Two steps: import Mantine's stylesheet, and give `MantineProvider` the compact
theme. This is a complete, runnable file.

```tsx
import "@mantine/core/styles.css";

import { Button, MantineProvider, TextInput } from "@mantine/core";
import { compactTheme, ControlSection, FieldRow, PanelField, ToggleRow } from "@graphty/compact-mantine";

export function App() {
    return (
        <MantineProvider theme={compactTheme}>
            {/* Ordinary Mantine components, now rendered compact. */}
            <TextInput label="Project name" />
            <Button>Save</Button>

            {/* This package's own components, for a 240px panel. */}
            <div style={{width: 240}}>
                <ControlSection label="Node size">
                    <FieldRow>
                        <PanelField label="Smallest" glyph="sizeSmallest" defaultValue="1.0" />
                        <PanelField label="Largest" glyph="sizeLargest" defaultValue="4.0" />
                    </FieldRow>
                    <ToggleRow label="Scale with zoom" defaultChecked />
                </ControlSection>
            </div>
        </MantineProvider>
    );
}
```

That is the whole setup: the theme puts its stylesheet (the Inter typeface, the
colour tokens and the component rules) on the page the first time a themed
component renders. Three further pieces are optional and are introduced where
they matter: [`Tooltip.Group`](#tooltips-wrap-your-app-once) around your app for
Figma's tooltip timing, [`PopoutManager`](#floating-panels) if you use pop-outs,
and [`LabelsProvider`](#internationalization) if you translate the library's
strings.

## The compact theme

`compactTheme` is a complete Mantine theme, already merged with Mantine's
default, that draws every component the way the Figma editor draws its own.
Light and dark are Mantine's own colour scheme (`defaultColorScheme`,
`forceColorScheme`, `useMantineColorScheme`); one theme serves both, and the dark
scheme uses Figma's neutral greys (#2c2c2c panels, #383838 fields).

| Token | Values |
|-------|--------|
| `fontSizes` / `lineHeights` | xs 9/14, sm 11/16, md 13/22, lg 15/25, xl 24/32 |
| `spacing` | xs 4px, sm 8px, md 8px, lg 12px, xl 16px |
| `radius` | xs 2px, sm 5px, md 5px, lg 13px, xl 13px |
| `shadows` | xs to xl map onto Figma's five elevations |
| `primaryColor` | `brand`: #0d99ff for filled surfaces, #007be5 for links |

Every colour is a CSS custom property named `--cm-*` (for example `--cm-bg`,
`--cm-text-secondary`, `--cm-bg-brand`), written with the CSS `light-dark()`
function, so it resolves from the colour scheme of the element that uses it. A
subtree that has to render dark inside a light app -- a menu, a tooltip, the
shortcuts sheet -- sets `color-scheme: dark` and every token inside it follows.
Read the tokens in your own CSS; `PANEL_INK` (see [the panel grid](#the-panel-grid))
names the ones a panel row uses.

Controls are 24px tall with an 11px face. Fields are drawn filled and without a
border at rest, outlined on hover and ringed on focus. The focus ring is Figma's:
1px, keyboard focus only (number and text fields ring on any focus), inside a
field and outside a button. Menus, list boxes and tooltips are dark in both
schemes. Overlays open and close in one frame, with no fade.

### The bundled typeface

The theme sets Inter (the variable font, latin subset) and ships it inside the
package, inlined into the stylesheet, so Figma's 450, 550 and 600 weights render
exactly with no font setup and no network request. Inter is licensed under the
SIL Open Font License 1.1; the license text is in `dist/fonts/LICENSE-Inter.txt`.
To use another face, set `fontFamily` in a theme merged over this one.

### `createCompactTheme` and the WCAG AA option

`compactTheme` is exact Figma. Figma's secondary text, field boundaries and
checkbox edges fall short of WCAG 2.2 AA contrast, so the theme has an option
that raises them:

```tsx
import { createCompactTheme } from "@graphty/compact-mantine";

<MantineProvider theme={createCompactTheme({ highContrast: true })}>{children}</MantineProvider>;
```

`highContrast` changes colour tokens only -- nothing moves. It darkens secondary
text and icons (50% to 55% black, 4.7:1), raises checkbox, switch and field
boundaries to 3:1 (fields gain a 1px inside edge), gives the selected segment of
a segmented control a 3:1 edge, and darkens placeholder text, the focus ring,
links and the brand, danger and success fills to the next darker colour in
Figma's own palette. Dividers stay as Figma draws them. `createCompactTheme()`
with no options is `compactThemeOverride`, and the options it was built with are
published on `theme.other.compact`.

### Tooltips: wrap your app once

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

### Stylesheet, SSR and shadow roots

The stylesheet is injected into `document.head` when the theme is created
(and again, if something removed it, when a themed component renders). For server rendering, put `compactGlobalCss()` (or
`compactGlobalCss({ highContrast: true })`) in a `<style>` in your document head.
For a shadow root, call `ensureCompactStyles()` or append `compactGlobalCss()` to
the root yourself. Mantine's own `@mantine/core/styles.css` is still required,
imported before this package's stylesheet as in the quick start.

### Components the theme restyles

Pass no `size` prop and these render compact. Pass `size="md"` or `size="lg"`
and you get larger sizes back.

| Group | Components |
|-------|------------|
| Inputs | TextInput, NumberInput, Select, NativeSelect, Textarea, PasswordInput, Autocomplete, MultiSelect, TagsInput, PillsInput, FileInput, JsonInput, ColorInput, InputClearButton |
| Buttons | Button, ActionIcon, CloseButton |
| Controls | Switch, Checkbox, Radio, Slider, RangeSlider, SegmentedControl |
| Colour | ColorSwatch, ColorPicker, HueSlider, AlphaSlider |
| Display | Badge, Text, Avatar, Avatar.Group, ThemeIcon, Indicator, Kbd, Pill |
| Navigation | Tabs, NavLink, Pagination, Stepper, Anchor, Burger |
| Feedback | Loader, Progress, RingProgress, Notification |
| Overlays | Menu, Tooltip, Tooltip.Group, Popover, HoverCard, Modal, ScrollArea |

A few defaults are worth knowing: `Badge` defaults to the outlined look
(`variant="filled"` and `"light"` are the brand looks); `Kbd` is Figma's dark key
cap in both schemes (`size="md"` for the large cap, `variant="inline"` for a
light cap in running text, `mod={{ active: true }}` to light it); `Select`
defaults to the outlined trigger; `Tabs` defaults to pills.

### Making it your own

Merge your own theme on top of the compact one:

```tsx
import { createTheme, MantineProvider, mergeMantineTheme } from "@mantine/core";
import { compactTheme } from "@graphty/compact-mantine";

const theme = mergeMantineTheme(compactTheme, createTheme({
    primaryColor: "teal",
}));

<MantineProvider theme={theme}>{children}</MantineProvider>;
```

If you already build your theme from several overrides, take
`compactThemeOverride` (or `createCompactTheme(options)`) instead. It is the raw
`createTheme()` result, suitable for `mergeThemeOverrides()`:

```tsx
import { createTheme, mergeThemeOverrides } from "@mantine/core";
import { compactThemeOverride } from "@graphty/compact-mantine";

const override = mergeThemeOverrides(compactThemeOverride, createTheme({primaryColor: "teal"}));
```

Merge component extensions with care: `mergeThemeOverrides` replaces a
component's `vars` or `styles` function rather than composing it, so an override
of a component this theme already extends discards the compact treatment. Adjust
such a component through its props, `classNames` or the `--cm-*` tokens instead.

### A compact region inside a normal-sized app

`MantineProvider` nests, so you can keep your application at its usual size and
make one region dense -- which is the common case for a sidebar or an inspector.

```tsx
<MantineProvider>
    <TextInput label="Normal size" />

    <MantineProvider theme={compactTheme}>
        <aside style={{width: 240}}>
            <TextInput label="Compact" />
        </aside>
    </MantineProvider>
</MantineProvider>
```

Also exported: `compactColors` (the palettes this theme adds), `compactDarkColors`
(its neutral dark scale) and `compactBrandColors` (the brand scale), if you want
to reuse the colours elsewhere.

## The components

Grouped by what you are trying to do. Every component has a page in
[Storybook](https://graphty.app/storybook/compact-mantine/) with runnable
examples, and every prop is documented in your editor.

### Building a panel

| Component | Reach for it when |
|-----------|-------------------|
| `ControlSection` | a run of controls needs a name, a rule above it and a chevron that folds it away. The workhorse container for a property panel. It can show a dot when something inside it is non-default, an empty state with a single "+", an explanation bubble, and buttons of its own in the header. |
| `ControlGroup` | the same, but it must never fold, or its rule has to bleed out to the edges of a padded container such as a pop-out. |
| `ControlSubGroup` | a handful of rarely-opened settings belong under a section you already have. Quieter than a section: no rule, a smaller chevron. |
| `FieldRow` | one or two fields share a line. It owns the widths and the gaps, so a column of rows lines up. |
| `TrailingSlot` | you are laying out a row by hand and need the fixed 24px slot every row ends with, so that rows with a trailing control end level with rows without one. |
| `AdvancedButton` | a row or a section has settings most people never change. The gear opens them in a pop-out, and marks itself when something behind it is no longer default. |

### Editing a value

| Component | Reach for it when |
|-----------|-------------------|
| `PanelField` | a value is typed, picked from a list or dragged. A real text box, number box or select, 24px tall, whose caption is a 16px drawing inside the box instead of a word above it. |
| `CompoundRow` | two or three values are one thing seen several ways -- a colour and its opacity, a width and its unit -- and must read as one control. |
| `IconGroupRow` | two to six mutually exclusive options whose difference can be drawn: node shapes, edge routing, scale curves. A `SegmentedControl` underneath, so arrow keys work. |
| `ToggleRow` | a setting is a plain yes or no that no picture could stand for. |
| `ToggleRowGroup` | you have two or more of those. It packs them at a 24px pitch and warns you in development if you give it only one. |
| `RampRow` | a range is better drawn than described: a size wedge or a colour ramp with its two endpoints. |
| `CompactColorInput` | a colour and its opacity, on one 24px line, with a picker in a pop-out. Needs a [`PopoutManager`](#floating-panels). |
| `GradientEditor` | a multi-stop linear gradient: colours, positions, angle. Needs a `PopoutManager`. |
| `StyleNumberInput` | a number that has a sensible default, and you want the panel to show at a glance whether the reader has overridden it. `undefined` means "not set" and shows the default in italics with no reset button. |
| `StyleSelect` | the same idea for a dropdown. |
| `ToggleWithContent` | a feature is a yes or no that brings its own settings with it. Turning it off takes its settings off the screen. |

### Showing data

| Component | Reach for it when |
|-----------|-------------------|
| `DataRow` | the string is the reader's own -- an id, a node label, a filename -- with a number beside it. The one row here that keeps a text label, because data cannot be drawn. Selectable, double-clickable, and it can carry a trailing control. |
| `DataRowHeader` | a run of data rows needs a caption, so the rows below can drop the unit word they would otherwise repeat. Give it `onSortChange` and it becomes a sort control. |
| `RankChip` | a rank belongs beside a row: `#6`, rather than a sentence saying "rank 6 of 318". |
| `MetricRow` | one reading has a percentile and a rank. Draws the name, a bar filled to the percentile, the number, and the chip. |
| `HistogramRow` | a distribution would otherwise be spelled as the four numbers that summarise it. 64px tall. |
| `SparklineRow` | a series is going somewhere and you want to see which way. 32px tall. |
| `ProseBlock` | the panel has to say something in words: a plain-language reading, a caveat about how a result falls short, or a record of the last run. |
| `ActionRow` | a row reports a state and offers verbs. The state is always visible; the verbs appear on hover, on focus, and always on a touch screen. |
| `DataTable` | you have columns rather than rows: thousands of them, sortable, searchable, selectable, with only the visible rows in the document. |

### Floating panels

A pop-out is a panel that opens beside a control, can be dragged, and can
contain pop-outs of its own.

**Put one `PopoutManager` high in your tree, above anything that opens a
pop-out.** It owns the shared floating layer: the stacking order, the portal the
panels render into, and the dismissal rules they all obey. Without it, anything
that opens a pop-out throws `usePopoutManagerContext must be used within a
PopoutManager` on first render. `CompactColorInput` and `GradientEditor` use a
pop-out internally, so they need one too. (`InfoCircle` is the exception: it
supplies its own if there is none.)

```tsx
import { Popout, PopoutButton, PopoutManager, UiGlyph } from "@graphty/compact-mantine";

<PopoutManager>
    <aside>
        <Popout>
            <Popout.Trigger>
                <PopoutButton icon={<UiGlyph name="gear" />} aria-label="Display settings" />
            </Popout.Trigger>
            <Popout.Panel width={240} header={{variant: "title", title: "Display settings"}}>
                <Popout.Content>{/* anything */}</Popout.Content>
            </Popout.Panel>
        </Popout>
    </aside>
</PopoutManager>;
```

| Component | What it is |
|-----------|------------|
| `PopoutManager` | The shared floating layer. Required, once, near the root. |
| `Popout` | One pop-out: its trigger and its panel. Also namespaces `Popout.Trigger`, `Popout.Panel`, `Popout.Content` and `Popout.Anchor`. |
| `Popout.Trigger` | Wraps the single element that opens the panel. Give it a real button. |
| `Popout.Panel` | The panel itself: a width, an optional header or tab strip, and its content. |
| `Popout.Anchor` | Wraps a sidebar so every panel opened inside it lines up with that sidebar's edge instead of with its own button. |
| `PopoutButton` | An icon button that stays lit while its panel is open. |
| `InfoCircle` | A circled "i" that reveals an explanation on hover, focus or tap. |

The rules a `PopoutManager` enforces, so you do not have to: Escape closes the
innermost panel; a click outside closes everything; opening a panel closes its
siblings; closing a panel closes everything opened from it; focus returns to the
trigger.

Where a panel opens is set by two independent props on `Popout.Panel`:
`anchorX` decides which edge it lines up with (`"panel"`, `"trigger"`,
`"parent"`, or a ref of your own) and `anchorY` how far down it opens. The
defaults are the arrangement most sidebars want: flush with the panel's edge,
level with the row that opened it.

### More Figma components

| Component | What it is |
|-----------|------------|
| `ToggleIconButton` | An icon button that stays pressed (`aria-pressed`), such as a lock or a visibility eye. |
| `SplitButton` | Two icon buttons joined into one control: a main action and a chevron that opens a menu of related choices. |
| `AlignmentMatrix` | The 3 x 3 alignment grid: nine radios with two-dimensional arrow-key movement. `ALIGNMENT_MATRIX_VALUES` lists its values. |
| `SearchInput` | The filled search field with a leading magnifier and a clear button. |
| `ComboInput` | A value you can type, with a chevron that opens a dark list of presets over the field (font size, gap, export scale). |
| `VariablePill` | A value bound to a named variable, drawn as a pill inside a field, with a Detach button on hover. |
| `ColorPickerPanel` | Figma's colour picker (the panel `CompactColorInput` opens), usable on its own. |
| `ContextMenu` | A dark menu opened at the pointer by a right-click, or from the keyboard with Shift+F10 or the ContextMenu key. |
| `MenuCheckItem` | A checkable row for a Mantine `Menu`, with the check column. |
| `TooltipShortcut` | A tooltip label with its keyboard shortcut after it. |
| `ModalFooter` | The footer row of a Mantine `Modal`: its action buttons, end-aligned. |
| `Toast`, `ToastProvider`, `useToast` | Figma's dark toast: put one `ToastProvider` near the root and call `useToast()` to show one. |
| `ResizeHandle` | A panel's resize edge: drag it, use the arrow keys, or double-click to return to the default size. |
| `Tree`, `TreeItem` | The layer tree: a real ARIA tree with arrow keys, F2 to rename and drag to reorder. |
| `PageList`, `PageRow` | The page list above the layer tree. |
| `InlineRename` | The in-place rename field a tree or page row turns into. |
| `ResultRow` | One row of find results. |

Variants the theme adds to Mantine components (pass them as `variant`): `Button`
`danger`, `danger-outline`, `inverse`, `success`; `ActionIcon` `joined` (inside a
themed `ActionIcon.Group`); `Checkbox` `neutral` (Figma's panel checkbox; the
default is the blue dialog checkbox); `SegmentedControl` `toolbar` (the sliding
mode switch) and `loose`; `Anchor` `secondary`; `Tabs` `default` (the underline
tabs; pills are the default).

### The editor shell

The chrome around an editor's canvas, as Figma draws it. Each one is a real
toolbar, dialog or tab list: one Tab stop, arrow keys inside, names for screen
readers.

| Component | What it is |
|-----------|------------|
| `Toolbar` | The floating bottom toolbar: 48 tall, 13px corners, one Tab stop with ArrowLeft / ArrowRight / Home / End inside. `floating` pins it to the bottom centre of the window. `Toolbar.Divider` is its full-height rule. |
| `ToolButton` | A 32 x 32 tool: `label` (its name and tooltip), `icon`, `shortcut`, and `selected` for the current tool. |
| `ToolGroup` | A tool with a flyout: the face shows the last tool picked, and the chevron beside it opens a dark menu of the group's tools above the toolbar. Give it `tools`, the toolbar's `activeTool` and `onToolChange`; `chevronProps` passes attributes to the chevron button. |
| `SecondaryToolbar` | The contextual 40-tall bar that appears above the toolbar while a mode is active, with `SecondaryToolbar.Button` and `SecondaryToolbar.Divider`. Give a button `dropdown` when it opens a menu (Figma's "More"): it gets a trailing chevron, and inside `Menu.Target` it draws the open state. |
| `NavRail` | The 56-wide navigation rail at the window's edge, one Tab stop with ArrowUp / ArrowDown inside; `footer` pins buttons to its foot, `NavRail.Separator` divides it. |
| `RailButton` | A rail destination: a 32 x 32 pill over a 9px caption; `aria-expanded` (or `active`) lights it while its panel is open. |
| `HelpButton` | The round floating help button; its children are the items of the dark menu it opens. |
| `ShortcutSheet` | The keyboard shortcuts sheet docked at the window's foot: tabs of shortcut columns with dark key caps. Arrow keys switch tabs; Escape closes it. A tab with `variant: "essential"` draws Figma's first tab instead of the list: its `caption` above numbered columns, large key caps, and each entry's `description` under its label. |
| `QuickActions` | The quick actions palette: a search field over sectioned rows. Typing filters, ArrowUp / ArrowDown move the highlight while focus stays in the field, Enter runs, Escape closes. |

```tsx
import { SegmentedControl } from "@mantine/core";
import { useState } from "react";
import { Toolbar, ToolButton, ToolGroup } from "@graphty/compact-mantine";

function EditorToolbar() {
    const [tool, setTool] = useState("move");
    return (
        <Toolbar aria-label="Editor" floating>
            <ToolGroup label="Move tools" tools={moveTools} activeTool={tool} onToolChange={setTool} />
            <ToolGroup label="Shape tools" tools={shapeTools} activeTool={tool} onToolChange={setTool} />
            <ToolButton label="Actions" icon={<ActionsGlyph />} shortcut="Ctrl+K" />
            <Toolbar.Divider />
            <SegmentedControl variant="toolbar" data={modes} />
        </Toolbar>
    );
}
```

The shell brings no glyphs of its own for your tools: pass your own icons,
drawn to sit in a 24px box.

### Glyphs

The premise of the row components is that a small drawing can replace a word,
which only works if the drawings are a fixed, learnable set. Two components draw
them:

- `FieldGlyph` -- the eight glyphs allowed inside a field's 16px slot, each with
  a hollow and a filled form. `FIELD_GLYPH_NAMES` lists them.
- `UiGlyph` -- the shared marks the components draw elsewhere: chevrons and
  carets, a gear, a close, a plus, a check, a warning, the alignment and
  transform verbs, and the frame, rectangle, ellipse and text shapes, each drawn
  with a 1px stroke at any size. `UI_GLYPH_NAMES` lists them.

Both take a `name` and an optional `size`, draw in `currentColor`, and are
hidden from screen readers, because the control around them carries the name.
`FIELD_LETTERS` is the small set of capital letters a field may show in place of
a drawing when a concept has no picture.

See every drawing at once in the **Glyphs** section of
[Storybook](https://graphty.app/storybook/compact-mantine/).

## A worked example

A complete section of a property panel, using one component from each group.

```tsx
import {
    AdvancedButton,
    ControlSection,
    FieldGlyph,
    FieldRow,
    IconGroupRow,
    PanelField,
    RampRow,
    ToggleRow,
    ToggleRowGroup,
} from "@graphty/compact-mantine";

function NodeSizeSection({openAdvanced}: {openAdvanced: () => void}) {
    return (
        <ControlSection
            label="Node size"
            hasConfiguredValues
            info="Node size maps a numeric attribute onto a radius."
            actions={<AdvancedButton label="Advanced node size" changed onClick={openAdvanced} />}
        >
            {/* A pair of fields, each captioned by a drawing instead of a word. */}
            <FieldRow>
                <PanelField label="Smallest node size" glyph="sizeSmallest" kind="number" defaultValue={1} />
                <PanelField label="Largest node size" glyph="sizeLargest" kind="number" defaultValue={4} />
            </FieldRow>

            {/* The mapping between them, drawn at row height. */}
            <RampRow label="Size range" min="1.0" max="4.0" variant="size" scale="sqrt" />

            {/* Three options whose difference can be drawn. */}
            <IconGroupRow
                label="Scale"
                hybrid
                defaultValue="sqrt"
                options={[
                    {value: "sqrt", label: "Square root", icon: <FieldGlyph name="scaleSqrt" />},
                    {value: "linear", label: "Linear", icon: <FieldGlyph name="scaleLinear" />},
                    {value: "log", label: "Logarithmic", icon: <FieldGlyph name="scaleLog" />},
                ]}
            />

            {/* Booleans with no picture, packed tighter than the other rows. */}
            <ToggleRowGroup label="Node decorations">
                <ToggleRow label="Labels" defaultChecked />
                <ToggleRow label="Halos" />
            </ToggleRowGroup>
        </ControlSection>
    );
}
```

### Showing a word beside every drawing

An icon-first panel needs a way out for readers who do not yet know the
drawings, and `PanelLabelsProvider` is it. It carries one preference -- off by
default -- to every component below it, and each one degrades in its own way: a
field grows its label word beside its glyph, and a row holding a pair of fields
becomes two single rows, each with its word in a 76px column. A pair never
becomes a two-line stack.

```tsx
<PanelLabelsProvider showLabels={settings.showLabelsOnControls}>
    <NodeSizeSection />
</PanelLabelsProvider>
```

Read the preference anywhere below with `usePanelLabels()`. Offering it as a
user setting is recommended; nothing in the library requires it.

## The panel grid

The row components are laid out for Figma's 240px panel column, and they all
measure themselves from one exported object so that a column of them lines up:

```
16  +  88  +  8  +  88  +  8  +  24  +  8  =  240
pad   field  gut  field   gap  trail  pad
```

`PANEL_GRID` names every number in it -- `WIDTH`, `FIELD`, `BODY`,
`CONTROL_HEIGHT`, `ROW_PITCH`, `TRAIL` and the rest -- so your own rows can
match without retyping them. It is also published on the theme as
`theme.other.panelGrid`.

`PANEL_INK` is the matching colour map: one entry per role a row paints
(`VALUE`, `CHROME`, `SURFACE`, `ACCENT`, `BORDER`, `SELECTED`, `HOVER`,
`FOCUS`, `DISABLED` and so on), each one a `--cm-*` token rather than a fixed
colour. Paint your own rows from it and they follow the light scheme, the dark
scheme and the AA option for free.

```tsx
import { PANEL_GRID, PANEL_INK } from "@graphty/compact-mantine";

<div style={{height: PANEL_GRID.ROW_PITCH, color: PANEL_INK.CHROME}}>Custom row</div>;
```

You do not have to use a 240px column. Nothing enforces the width; the numbers
are there so that the components agree with each other and with anything you
write beside them.

## Handling events

Two shapes, used consistently across the library.

**A value change gives you the value first and the event second, and the event
is optional:**

```tsx
<ToggleRow label="Labels" onChange={(checked, event) => setLabels(checked)} />
<PanelField label="Radius" kind="number" onChange={(value) => setRadius(value)} />
```

That matches Mantine, and it means a change made in code is expressible as
`onChange(next)` with no event to fabricate.

**An activation gives you the event, never a bare callback,** so you can read
modifier keys, call `preventDefault()`, or find the element that was activated:

```tsx
<AdvancedButton label="Advanced" onClick={(event) => {
    if (event.shiftKey) { openInNewPanel(); } else { open(); }
}} />
```

Rows whose selection behaviour depends on how they were activated -- `DataRow`,
`MetricRow`, `ActionRow` and `DataTable`'s rows -- get a second argument saying
so, rather than making you sniff the event:

```tsx
<DataRow
    label="Mr_Whiskers"
    value={12}
    onClick={(event, meta) => {
        select(id, {add: meta.source === "pointer" && event.shiftKey});
    }}
/>
```

**A drag reports its start, its changes and its end,** so you can open and close
one undo transaction around the whole gesture:

```tsx
<PanelField
    label="Radius"
    glyph="width"
    kind="number"
    onScrubStart={() => beginUndo()}
    onScrub={(delta) => setRadius((r) => r + delta)}
    onScrubEnd={() => commitUndo()}
/>
```

**Anything that opens and closes** takes `opened`, `defaultOpened` and
`onOpenChange(opened, event?)`: `ControlSection`, `ControlSubGroup`,
`InfoCircle` and the whole `Popout` family. Supply `opened` to drive it from
your own state, or leave it out and let the component remember.

**Anything whose content arrives later** takes `busy` and `live`:
`HistogramRow`, `SparklineRow`, `MetricRow`, `CompoundRow`, `RampRow`,
`ProseBlock` and `ActionRow`. Supplying `busy` at all -- true or false -- is how
you say the content is fed by something that finishes later, and that is what
makes a screen reader announce it; `live` sets the politeness and defaults to
`"polite"` once `busy` is given.

```tsx
<MetricRow name="Betweenness" busy={isRunning} percentile={98} value="0.31" />
```

Pass `busy` for the whole life of the component rather than only while the run
is in flight: a live region has to be in the document before the change it
announces.

Every component that holds a value works controlled (`value` plus `onChange`)
or uncontrolled (`defaultValue`), and `onFocus` and `onBlur` are always
forwarded.

## The shared prop names

A handful of names appear on most components, and each one means exactly one
thing everywhere.

| Prop | What it always means |
|------|----------------------|
| `label` | What the thing is called. It is always the accessible name; whether it is also drawn depends on the component and on the [`showLabels` preference](#showing-a-word-beside-every-drawing). `ChartRow`'s label is never drawn, `PanelField`'s is drawn only with the preference on, `ControlSection`'s always is. |
| `value` / `defaultValue` / `onChange` | The state a control holds. Supply `value` with `onChange` to drive it yourself, or `defaultValue` to let it remember. On the display-only rows -- `DataRow` and `MetricRow` -- `value` is the reading drawn on the row and there is no `onChange`. |
| `trailing` | The row's occasional control, in the fixed 24px slot every row ends with. Always a node, always the last thing in the row. |
| `actions` | Buttons that belong to a container rather than to a row: a section header's, a pop-out panel's, an action row's cluster. |
| `disabled` | The control is present but cannot be used: dimmed, skipped by Tab, announced as unavailable. |
| `selected` / `selectedIds` | Which row of a list the reader has picked. Not the same as a control's own value. |
| `busy` / `live` | The content arrives from something that finishes later. See [Handling events](#handling-events). |
| `opened` / `defaultOpened` / `onOpenChange` | Anything that opens and closes. |

## Internationalization

Every string this library can put on the screen or into a screen reader is
overridable, and none of it requires an i18n framework. With no setup you get
English.

`LabelsProvider` replaces the strings and sets the locale used for formatting:

```tsx
import { LabelsProvider } from "@graphty/compact-mantine";

<LabelsProvider
    locale="de-DE"
    labels={{
        mixed: "Verschieden",
        about: (label) => `Info zu ${label}`,
    }}
>
    <Inspector />
</LabelsProvider>;
```

- **Anything you leave out keeps its English default**, so you can translate one
  string or all of them.
- **Providers nest**, and an inner one merges over the outer one, so a dialog
  can restate a single string without repeating the rest.
- **Strings that interpolate are functions**, taking already-formatted pieces,
  so a translation can put them in the order its language needs.
- `defaultLabels` is the complete English set, and `CompactMantineLabels` is its
  type -- start from either when writing a translation.
- `useLabels()` reads the strings from your own components.

The locale is resolved in this order: the `locale` you pass, then the `lang`
attribute on the document, then the browser's preference, then English. It
drives `Intl` throughout: numbers through `Intl.NumberFormat`, ordinals through
`Intl.PluralRules` (which is what makes `98th percentile` come out right outside
English), and sorting through `Intl.Collator`. The same formatters are exported
for your own use:

```tsx
import { useCollator, useNumberFormatter, useOrdinalFormatter } from "@graphty/compact-mantine";

const format = useNumberFormatter({maximumFractionDigits: 2});
format.format(1234.5678); // "1,234.57" in en, "1.234,57" in de
```

Every component draws from the same set, `DataTable` included. A table also
takes a `labels` prop of its own, which merges over whatever the provider says
-- reach for it when one table counts nodes and another counts files, and for
`LabelsProvider` when you are translating.

## Right-to-left languages

Wrap your application in Mantine's `DirectionProvider` and every component here
follows. Layouts are written in logical properties, so padding, gaps and the
order of a row all reverse; arrow keys in a segmented control follow the text
direction; charts and ramps are drawn from the start of the axis rather than
from the left edge, so the picture agrees with the labels beside it.

```tsx
import { DirectionProvider, MantineProvider } from "@mantine/core";

<DirectionProvider initialDirection="rtl">
    <MantineProvider theme={compactTheme}>
        <App />
    </MantineProvider>
</DirectionProvider>;
```

Storybook has a **Direction** toolbar that flips every story, and most component
pages also ship a dedicated right-to-left story, so you can see what your own
layout will do.

## Accessibility

The library targets WCAG 2.2 AA, and the work is done for you rather than left
as a set of props you must remember:

- **Every control is a real control.** Fields are inputs, toggles are checkboxes
  or switches, segmented options are radios, the advanced button is a button, so
  keyboard behaviour, focus order and disabled semantics come from the platform.
- **Keyboard focus is always visible**, and pointer focus is not, so a dense
  surface stays quiet under the mouse without giving up the focus indicator.
- **Exact Figma by default, AA on request.** Figma's own contrast falls short
  of AA in a few places (secondary text, field and checkbox edges); pass
  `createCompactTheme({ highContrast: true })` to raise exactly those. See
  [the WCAG AA option](#createcompacttheme-and-the-wcag-aa-option).
- **Accessibility kept beyond Figma.** Tooltips stay linked with
  `aria-describedby`; the toolbar, the rail and the shortcuts sheet are real
  toolbars and tab lists with arrow-key movement; the quick actions palette is a
  named dialog with a combobox and a list box; the shortcuts sheet closes with
  Escape.
- **State is announced, not only drawn.** Expanded, checked, selected, disabled,
  busy and current are all exposed as ARIA in addition to colour.
- **Charts are one named image with a hidden table behind them**, so a screen
  reader announces the chart and can then read every value, rather than
  announcing a run of anonymous bars. Give every chart a `label`.
- **Results that arrive late are announced.** Give a row `busy` and it becomes a
  polite live region; while `busy` is true the announcement is held back, so the
  reader hears the finished result once rather than every frame of it. A row
  that is never given `busy` stays silent, because most rows hold a value the
  reader set themselves.
- **Hover-revealed controls also appear on focus**, stay in the document, and
  stay in the tab order.
- **Colour is never the only signal.** An advanced button whose settings have
  changed says so in its accessible name; a section with non-default values does
  the same.

Storybook runs axe-core against every story, so a regression shows up in the
Accessibility panel before it is published.

## TypeScript

The package is written in TypeScript and ships its own declarations; there is no
`@types` package to install. Every component's props are exported as a named
type, so you can extend them:

```tsx
import type { DataRowProps, PanelFieldProps } from "@graphty/compact-mantine";

interface MyRowProps extends DataRowProps {
    nodeId: string;
}
```

The prop documentation you see in your editor is the same text that appears in
Storybook's prop tables, so a tooltip is the primary reference and this README
does not repeat it.

A few types are worth knowing by name: `FieldGlyphName` and `UiGlyphName` are
the closed glyph registers (`isFieldGlyphName` and `isFieldLetter` narrow an
unknown string to them), `DataTableColumn<TRow>` describes a table column, and
`CompactMantineLabels` is the string set.

## Which one should I use?

Some components overlap, and a few sit beside a Mantine component that looks
as though it would do. This table names the one to reach for, and what it is
being chosen over where that choice is not obvious.

| If you have | Use | Instead of |
|-------------|-----|------------|
| A label and a reading on one line | `DataRow`, with the reading already formatted | -- it draws `value` verbatim and gives the pair no accessible name, so run a number through `useNumberFormatter().format(n)` yourself, and name the pair yourself where a reader has to hear the two together |
| A gear that opens advanced settings | `AdvancedButton`, with `changed` | -- |
| A group of controls that folds away | `ControlSection` | -- |
| A group of controls that must not fold, or whose rule has to bleed to the edges of a padded container | `ControlGroup` | -- |
| A checkbox on its own line | `ToggleRow` inside a `ToggleRowGroup` | -- |
| A checkbox that reveals the settings it turns on | `ToggleWithContent` | -- |
| A dropdown in a panel row | `PanelField` with `kind="select"` | -- |
| A dropdown with a default the reader can override | `StyleSelect` | -- |
| Two to six drawable options in a panel row | `IconGroupRow` | a bare Mantine `SegmentedControl`, which `IconGroupRow` is built on and adds the panel grid, the glyphs and the `showLabels` preference to |
| An icon button that opens a pop-out | `PopoutButton`, inside `Popout.Trigger` | `AdvancedButton`, which is for a row's or a section's advanced settings and does not light up while a panel is open |
| An explanation bubble | `InfoCircle` | a Mantine `Popover`, which does not share this library's dismissal rules |

A lone boolean is not a row: put it in the trailing slot of the row it modifies,
or make it one tile of an `IconGroupRow`. `ToggleRowGroup` warns in development
when given only one child, for exactly this reason.

Every component puts its own name, in kebab case, on a root `data-testid` --
`advanced-button`, `metric-row`, `popout-panel` -- so a test can find any of
them the same way.

## Breaking changes in the Figma release

compact-mantine is 0.x, and this release changes how things look and measure.
Every export keeps its name and its props; these are the changes a consumer can
notice:

1. **Panel grid.** `PANEL_GRID.WIDTH` 280 -> 240, `FIELD` 108 -> 88, and
   `CONTENT`, `BODY`, `TRIPLE`, `TRIPLE_GAP`, `TOGGLE_PITCH`, `DATA_PITCH`,
   `SECTION_HEADER`, `SECTION_PAD_BOTTOM`, `GLYPH_SLOT`, `GLYPH`, `CHEVRON` and
   `LABEL_COLUMN` change value. Code that hard-codes a 280px panel around these
   rows must follow `PANEL_GRID.WIDTH`.
2. **Ink.** `PANEL_INK.SELECTED` / `ON_SELECTED` now mean Figma's selected item
   (a pale blue ground with a brand glyph), not an inverted solid patch; every
   `PANEL_INK` value is now a `--cm-*` token.
3. **Theme scales.** `spacing.sm` 6 -> 8; `radius.sm` / `md` 4 / 6 -> 5, `lg` /
   `xl` 8 / 12 -> 13; `fontSizes.xs` 10 -> 9, `lg` 14 -> 15, `xl` 16 -> 24;
   `lineHeights` are now px; `shadows` are Figma's elevations.
4. **Colours.** `colors.dark` is a neutral ramp (no more blue-grey), and
   `primaryColor` is the new `brand` palette. Components that passed
   `color="blue"` expecting the primary colour now get Mantine's blue.
5. **Focus.** `focusRing` is `"never"` and the ring is the theme's own 1px ring;
   a consumer's own `focusRing` no longer controls compact-mantine components.
6. **Motion and timing.** Overlays have no transitions, and a tooltip opens
   after 1000ms (it was immediate). Wrap your app in `Tooltip.Group` for the
   warm hand-off.
7. **Select and Tabs.** `Select` defaults to the outlined trigger and its
   dropdown is the dark list box opening over the trigger; `Tabs` defaults to
   `variant="pills"`.
8. **ActionIcon.** `variant="light"` no longer draws a 1px accent border; the
   brand glyph on the selected ground carries the state.
9. **Colour inputs.** `CompactColorInput`'s swatch becomes a 14px chit inside one
   156px field; `GradientEditor` replaces its per-stop sliders with a gradient
   bar and stop rows.
10. **Sections and rows.** `ControlSection` draws its divider below and its
    header is 40 tall; `ControlGroup`'s title is the legend style; `FieldRow`
    puts captions above by default (`labelPosition="inline"` restores beside).
11. **Data.** `DataRow` is 32 tall with 11px names (was 28 / 12px), and
    `DataTable` draws a cell grid.
12. **Pop-outs.** `POPOUT_GAP` 8 -> 0, `POPOUT_NESTED_GAP` 4 -> 0; opening a root
    pop-out closes the open one.
13. **Typeface.** The body font becomes Inter 11/16 at weight 450 wherever the
    stylesheet is injected. `<Text size="sm">` and `size="xs"` render at weight
    450 with Figma's letter-spacing (Mantine's Text was weight 400); `fw` still
    overrides it.
14. **IconGroupRow** loses its inverted selected tile (Figma's white face with an
    inset edge).
15. **Pop-out details.** `PopoutRegion` no longer lets one pop-out stay open per
    region; `PopoutButton` defaults to size `sm` (24px) and shows its open state
    as the ghost button's `aria-expanded` look instead of switching to
    `variant="light"`; a pop-out's tab header is pill `Tabs` (role `tab`)
    instead of a `SegmentedControl` (role `radio`).
16. **Overlays.** A tooltip sits below its trigger by default; `Modal` has no
    backdrop by default; `Loader` at `sm` is 16px (was 18).
17. **Display components.** `Badge` defaults to the outlined 16px look
    (`variant="outline"`), `Pill` is 20 tall, `Indicator` is a 9px dot with a
    ring (`withBorder` on by default), `Kbd` is a dark key cap in both schemes,
    and `Avatar` defaults to `variant="filled"`.

## Contributing

The package lives in the [graphty monorepo](https://github.com/graphty-org/graphty-monorepo)
under `compact-mantine/`.

```bash
pnpm install                 # from the monorepo root
cd compact-mantine
PORT=6006 npm run storybook  # any free port; PORT is required
npm run test:run             # unit and browser tests, once
npm run lint                 # ESLint
npm run build                # library build into dist/
npm run build-storybook      # what CI builds
```

Storybook is the development environment: every component has a page, and a
change to a component shows up there without a rebuild. New components need a
story, a test and complete prop documentation -- the prop comments are compiled
into both the published type declarations and Storybook's tables, so they are
read by people who will never see this repository.

A new component follows the conventions the rest of the library already keeps,
each of which is written down in exactly one place and asserted in
`tests/consistency.test.tsx`:

- **Handlers** come from `src/types/events.ts`. A value change is
  `ChangeHandler<T>`, an activation is `ActivationHandler`, a gesture is a
  start/change/end triple, and anything that opens and closes extends
  `DisclosureProps`. Never write a bare `() => void`.
- **Strings** go in `src/i18n/labels.ts`, never inline. Formatting goes through
  the `Intl` hooks in `src/i18n/formatters.ts`, never through `parseFloat` or a
  hand-written suffix.
- **Layout** is written in logical CSS properties. Where a drawing cannot be
  expressed logically -- a gradient, a clip path, an SVG -- use the helpers in
  `src/utils/rtl.ts`.
- **Announcements** go through `liveRegionProps` in `src/utils/live-region.ts`,
  so every component answers `busy` and `live` the same way.
- **Development warnings** go through `useDevWarning` in
  `src/utils/dev-warning.ts`, so they all fire once, from an effect, in plain
  English, naming the component first.
- **Test hooks** are a root `data-testid` holding the component's own name in
  kebab case, with the parts named after it.
- **Internal shorthand belongs in `//` comments only.** A `/** */` block is
  compiled into `dist/index.d.ts` and into Storybook's prop tables, where a
  stranger reads it.

Bugs and questions: <https://github.com/graphty-org/graphty-monorepo/issues>.

## License

MIT. The bundled Inter typeface is licensed under the SIL Open Font License 1.1
(`dist/fonts/LICENSE-Inter.txt`).
