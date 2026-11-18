# @graphty/compact-mantine

[![npm version](https://img.shields.io/npm/v/@graphty/compact-mantine.svg)](https://www.npmjs.com/package/@graphty/compact-mantine)
[![Storybook](https://img.shields.io/badge/storybook-examples-ff4785)](https://graphty.app/storybook/compact-mantine/)
[![license](https://img.shields.io/npm/l/@graphty/compact-mantine.svg)](./LICENSE)

Compact components and a compact theme for [Mantine 8](https://mantine.dev), for
interfaces where screen space is the scarce resource: property panels,
inspectors, sidebars, editors and dashboards. The look is measured from the
Figma editor's own interface, in its light and its dark theme: the same 24px
controls, the same 11px Inter, the same colors, radii, shadows and timing.

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

## Installation

```bash
npm install @graphty/compact-mantine @mantine/core @mantine/hooks
```

`@mantine/core`, `@mantine/hooks`, `react` and `react-dom` are peer dependencies. React 18 or
later, Mantine 8 or later. Then give `MantineProvider` the theme:

```tsx
import "@mantine/core/styles.css";

import { compactTheme } from "@graphty/compact-mantine";
import { MantineProvider } from "@mantine/core";

<MantineProvider theme={compactTheme}>{children}</MantineProvider>;
```

## Documentation

The documentation is at <https://graphty.app/docs/compact-mantine/>:

- [Getting started](https://graphty.app/docs/compact-mantine/guide/getting-started): install and the smallest working app
- [The compact theme](https://graphty.app/docs/compact-mantine/guide/theme): light and dark, the WCAG AA option, the accent,
  making it your own
- [The panel grid](https://graphty.app/docs/compact-mantine/guide/panel-grid), [Panels and rows](https://graphty.app/docs/compact-mantine/guide/rows),
  [Colors and CompactColorInput](https://graphty.app/docs/compact-mantine/guide/color), [Pop-outs](https://graphty.app/docs/compact-mantine/guide/popouts)
- [The components](https://graphty.app/docs/compact-mantine/guide/components), and
  [Which one should I use?](https://graphty.app/docs/compact-mantine/guide/which-one) for the compact-mantine component that
  replaces each Mantine one
- [API reference](https://graphty.app/docs/compact-mantine/api/): every export, generated from the source

Every component also has a page in [Storybook](https://graphty.app/storybook/compact-mantine/).

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
change to a component shows up there without a rebuild.

Stories live under `stories/`, one folder per sidebar section: `introduction/` (MDX pages),
`foundations/`, `components/<group>/` (`panels`, `inputs`, `selection`, `color`, `actions`,
`overlays`, `lists`, `data`, `shell`, each with an `Overview.mdx`), `patterns/`, and
`mantine/<group>/` for the themed Mantine components. `stories/helpers/` holds the shared story
helpers. A component has exactly one story file, titled `Components/<Group>/<Name>`, laid out
like every other:

- The JSDoc above `const meta` is the page's description: one sentence on what the component is
  for, then "When to use it" (naming its nearest alternative), "Usage" (a code snippet),
  "Keyboard and accessibility" and "Measurements" (taken from `design/figma-spec.md`, which the
  published page does not cite).
- `Default` is the first story and is driven by `args`, so the Controls table edits it.
- `States` is the second, with `parameters: BOTH_SCHEMES` from `stories/helpers/schemes.ts`, so
  the page shows every state in light and dark side by side. The visual capture still takes every story
  once per scheme.
- Feature stories follow, then `Keyboard`, `Translated` and `RightToLeft`. Every story has a
  one-sentence JSDoc comment, and a story whose job is to test behavior keeps a `play` function.

New components need a story, a test and complete prop documentation -- the prop comments are compiled
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
