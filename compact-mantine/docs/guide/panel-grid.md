# The panel grid

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

`PANEL_INK` is the matching color map: one entry per role a row paints
(`VALUE`, `CHROME`, `SURFACE`, `ACCENT`, `BORDER`, `SELECTED`, `HOVER`,
`FOCUS`, `DISABLED` and so on), each one a `--cm-*` token rather than a fixed
color. Paint your own rows from it and they follow the light scheme, the dark
scheme and the AA option for free.

```tsx
import { PANEL_GRID, PANEL_INK } from "@graphty/compact-mantine";

<div style={{ height: PANEL_GRID.ROW_PITCH, color: PANEL_INK.CHROME }}>Custom row</div>;
```

You do not have to use a 240px column. Nothing enforces the width; the numbers
are there so that the components agree with each other and with anything you
write beside them.
