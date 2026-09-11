# @graphty/compact-mantine

[![npm version](https://img.shields.io/npm/v/@graphty/compact-mantine.svg)](https://www.npmjs.com/package/@graphty/compact-mantine)
[![Storybook](https://img.shields.io/badge/storybook-examples-ff4785)](https://graphty.app/storybook/compact-mantine/)
[![license](https://img.shields.io/npm/l/@graphty/compact-mantine.svg)](./LICENSE)

Compact components and a compact theme for [Mantine 8](https://mantine.dev), for
interfaces where screen space is the scarce resource: property panels,
inspectors, sidebars, editors and dashboards.

It gives you two things, and you can take either one on its own:

1. **A theme.** Drop `compactTheme` into your `MantineProvider` and 41 Mantine
   components render at a dense size -- 24px controls, 11px text, tighter
   spacing -- with no `size` prop anywhere in your code.
2. **A component library.** About thirty components built for a narrow column:
   rows that put a value and its label on one 32px line, charts that fit in the
   height of a line of text, a virtualized data table, and a floating-panel
   system for the settings that do not fit.

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

            {/* This package's own components, for a 280px panel. */}
            <div style={{width: 280}}>
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

That is the whole setup. Two further providers are optional and are introduced
where they matter: [`PopoutManager`](#floating-panels) if you use pop-outs, and
[`LabelsProvider`](#internationalization) if you translate the library's
strings.

## The compact theme

`compactTheme` is a complete Mantine theme. It changes three global tokens and
sets default props and styles on 41 Mantine components, so that a component you
already know renders small without being told to.

| Token | Values |
|-------|--------|
| `fontSizes` | xs 10px, sm 11px, md 13px, lg 14px, xl 16px |
| `spacing` | xs 4px, sm 6px, md 8px, lg 12px, xl 16px |
| `radius` | xs 2px, sm 4px, md 6px, lg 8px, xl 12px |

Inputs default to a 24px height and an 11px face, and are drawn without a
border at rest so that a column of them reads as a list of values rather than a
grid of boxes. Keyboard focus still paints a visible ring; a mouse click does
not, so the surface stays quiet under the pointer.

### Components the theme restyles

Pass no `size` prop and these render compact. Pass `size="md"` or `size="lg"`
and you get Mantine's usual sizes back.

| Group | Components |
|-------|------------|
| Inputs (12) | TextInput, NumberInput, Select, Textarea, PasswordInput, Autocomplete, MultiSelect, TagsInput, PillsInput, FileInput, JsonInput, InputClearButton |
| Buttons (3) | Button, ActionIcon, CloseButton |
| Controls (6) | Switch, Checkbox, Radio, Slider, RangeSlider, SegmentedControl |
| Display (7) | Badge, Text, Avatar, ThemeIcon, Indicator, Kbd, Pill |
| Navigation (6) | Tabs, NavLink, Pagination, Stepper, Anchor, Burger |
| Feedback (3) | Loader, Progress, RingProgress |
| Overlays (4) | Menu, Tooltip, Popover, HoverCard |

### Making it your own

`compactTheme` is a full theme, already merged with Mantine's default. Merge
your own on top of it:

```tsx
import { createTheme, MantineProvider, mergeMantineTheme } from "@mantine/core";
import { compactTheme } from "@graphty/compact-mantine";

const theme = mergeMantineTheme(compactTheme, createTheme({
    primaryColor: "teal",
    fontFamily: "Inter, sans-serif",
}));

<MantineProvider theme={theme}>{children}</MantineProvider>;
```

If you already build your theme from several overrides, take
`compactThemeOverride` instead. It is the raw `createTheme()` result, suitable
for `mergeThemeOverrides()`:

```tsx
import { createTheme, mergeThemeOverrides } from "@mantine/core";
import { compactThemeOverride } from "@graphty/compact-mantine";

const override = mergeThemeOverrides(compactThemeOverride, createTheme({primaryColor: "teal"}));
```

### A compact region inside a normal-sized app

`MantineProvider` nests, so you can keep your application at its usual size and
make one region dense -- which is the common case for a sidebar or an inspector.

```tsx
<MantineProvider>
    <TextInput label="Normal size" />

    <MantineProvider theme={compactTheme}>
        <aside style={{width: 280}}>
            <TextInput label="Compact" />
        </aside>
    </MantineProvider>
</MantineProvider>
```

Also exported: `compactColors` (the palette this theme adds) and
`compactDarkColors` (its dark scale), if you want to reuse the colours
elsewhere.

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
            <Popout.Panel width={280} header={{variant: "title", title: "Display settings"}}>
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

### Glyphs

The premise of the row components is that a small drawing can replace a word,
which only works if the drawings are a fixed, learnable set. Two components draw
them:

- `FieldGlyph` -- the eight glyphs allowed inside a field's 16px slot, each with
  a hollow and a filled form. `FIELD_GLYPH_NAMES` lists them.
- `UiGlyph` -- the fifteen shared marks the components draw elsewhere: chevrons,
  a gear, a close, a plus, a check, a warning. `UI_GLYPH_NAMES` lists them.

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

The row components are laid out for a 280px column, and they all measure
themselves from one exported object so that a column of them lines up:

```
16  +  108  +  8  +  108  +  8  +  24  +  8  =  280
pad    field  gut   field   gap  trail  pad
```

`PANEL_GRID` names every number in it -- `WIDTH`, `FIELD`, `BODY`,
`CONTROL_HEIGHT`, `ROW_PITCH`, `TRAIL` and the rest -- so your own rows can
match without retyping them. It is also published on the theme as
`theme.other.panelGrid`.

`PANEL_INK` is the matching colour map: one entry per role a row paints
(`VALUE`, `CHROME`, `SURFACE`, `ACCENT`, `BORDER`, `SELECTED`, `DISABLED` and
so on), each one a Mantine CSS variable rather than a fixed colour. Paint your
own rows from it and they follow the light scheme, the dark scheme and your
primary colour for free.

```tsx
import { PANEL_GRID, PANEL_INK } from "@graphty/compact-mantine";

<div style={{height: PANEL_GRID.ROW_PITCH, color: PANEL_INK.CHROME}}>Custom row</div>;
```

You do not have to use a 280px column. Nothing enforces the width; the numbers
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

## Contributing

The package lives in the [graphty monorepo](https://github.com/graphty-org/graphty-monorepo)
under `compact-mantine/`.

```bash
pnpm install                 # from the monorepo root
cd compact-mantine
npm run storybook            # http://localhost:9060
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

MIT
