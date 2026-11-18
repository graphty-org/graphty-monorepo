# compact-mantine

Compact components and a compact theme for [Mantine 8](https://mantine.dev), for interfaces where
screen space is the scarce resource: property panels, inspectors, sidebars, editors and
dashboards. The look is measured from the Figma editor's own interface, in its light and its dark
theme: the same 24px controls, the same 11px Inter, the same colors, radii, shadows and timing.

It gives you two things, and you can take either one on its own:

1. **A theme.** Drop `compactTheme` into your `MantineProvider` and the Mantine components render
   dense and Figma-accurate -- 24px controls, 11px text, tighter spacing -- with no `size` prop
   anywhere in your code. The theme ships its own typeface (Inter) and stylesheet, so there is
   nothing else to set up.
2. **A component library.** Components built for a narrow column and an editor around it: rows
   that put a value and its label on one 32px line, charts that fit in the height of a line of
   text, a virtualized data table, a floating-panel system, and the editor shell -- a floating
   toolbar, a navigation rail, a quick actions palette and a keyboard shortcuts sheet.

Everything is typed, translatable, keyboard-operable, screen-reader-tested, works in light and
dark schemes, and works in right-to-left languages.

```bash
npm install @graphty/compact-mantine @mantine/core @mantine/hooks
```

## Where to go

| Page                                          | What it covers                                                         |
| --------------------------------------------- | ---------------------------------------------------------------------- |
| [Getting started](./guide/getting-started)    | install and the smallest working app                                   |
| [The compact theme](./guide/theme)            | light and dark, the AA option, the accent, overriding the theme        |
| [The panel grid](./guide/panel-grid)          | the 240px column, `PANEL_GRID` and the `--cm-*` color tokens           |
| [Panels and rows](./guide/rows)               | `ControlSection`, `FieldRow`, `ToggleRow`, `DataRow` and a whole panel |
| [Colors and CompactColorInput](./guide/color) | the color field, the picker, gradients and the palettes                |
| [Pop-outs](./guide/popouts)                   | floating panels and the `PopoutManager` they need                      |
| [The components](./guide/components)          | every component, by group                                              |
| [Which one should I use?](./guide/which-one)  | the compact-mantine component that replaces each Mantine one           |
| [API reference](./api/)                       | every exported component, hook, constant and type                      |

Every component also has a page in [Storybook](https://graphty.app/storybook/compact-mantine/),
with an example whose props you can edit and every state in light and dark.
