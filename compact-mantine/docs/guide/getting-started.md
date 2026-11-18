# Getting started

## Install

```bash
npm install @graphty/compact-mantine @mantine/core @mantine/hooks
```

`@mantine/core`, `@mantine/hooks`, `react` and `react-dom` are peer dependencies, so you control
their versions. React 18 or later, Mantine 8 or later.

## The smallest working app

Two steps: import Mantine's stylesheet, and give `MantineProvider` the compact theme. This is a
complete, runnable file.

<<< ../examples/getting-started.tsx

That is the whole setup: the theme puts its stylesheet (the Inter typeface, the color tokens and
the component rules) on the page the first time a themed component renders. Three further pieces
are optional and are introduced where they matter: [`Tooltip.Group`](./theme#tooltips-wrap-your-app-once)
around your app for Figma's tooltip timing, a [`PopoutManager`](./popouts) if you use pop-outs or
`CompactColorInput`, and a [`LabelsProvider`](./i18n) if you translate the library's strings.

## Read next

- [The compact theme](./theme): light and dark, the WCAG AA option, the accent, and how to make
  the theme your own.
- [Panels and rows](./rows): the containers and rows a property panel is built from, with a
  complete panel section.
- [Which one should I use?](./which-one): which compact-mantine component replaces which
  Mantine one.
- [The components](./components): every component, by group, with a link to its Storybook page.
