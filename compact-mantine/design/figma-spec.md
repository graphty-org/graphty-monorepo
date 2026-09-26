# compact-mantine: the Figma specification

This is the build specification that makes `@graphty/compact-mantine` pixel- and
style-accurate to the Figma editor's UI3 components, in the light and the dark theme, with an
optional WCAG AA mode. Every implementer works from this file. It says, component by component
and state by state, the exact values to hit, where each value was measured, and which file of
this package owns the change.

The measurements come from the Figma study in the repository at `design/ui/figma/` (outside
this package). Its `components.md` is the consolidated inventory; each `<name>.styles.json`
beside a `<name>.png` holds the computed styles of one captured region. When `components.md` and
a `styles.json` disagree, the `styles.json` wins. The Figma study says not to copy Figma's icons,
logos, CSS, class names or markup: we copy measurements and behaviour, and draw our own glyphs.

## 0. How to read this file

- Sizes are CSS pixels, `width x height`. Colours are written `light / dark`. A translucent
  colour is written as 8-digit hex (`#000000e5` is black at 90 percent).
- A citation is `folder/capture #n`, where `n` is the element index in that capture's
  `styles.json` (`elements[n]`). Folder abbreviations:

  | Abbreviation | Folder under `design/ui/figma/` |
  |---|---|
  | bc | `buttons-and-controls/` |
  | dt | `dark-theme/` |
  | ii | `index-and-inventory/` |
  | cr | `contradictions-resolved/` |
  | rs | `right-sidebar-selection/` |
  | ls | `left-sidebar/` |
  | pm | `popovers-and-menus/` |
  | bt | `bottom-toolbar/` |
  | hm | `header-and-modes/` |
  | ma | `measurement-audit/` |
  | ac | `accessibility/` |
  | C | `components.md` section number (the consolidated value, itself cited there) |

- A tool that prints a capture as one line per element (box, colours, font, padding, radius,
  border, outline, shadow) is at `tmp/digest.py` in the worktree root:
  `python3 tmp/digest.py bc/btn-primary-md-enabled--default` style paths, relative to the study
  folder, without `.styles.json`. It keeps only the elements inside the capture's region. Use it
  to check a value before arguing with this file.
- "Token" below always means one of this package's CSS custom properties, `--cm-*`, defined in
  section 2. Components never write a raw colour; they read a token (or `PANEL_INK`, which now
  resolves to the tokens).

## 1. Rules that hold everywhere

These restate the owner's settled decisions. They are not open for re-argument in a package.

1. **Default look is exact Figma in both themes**: colours, sizes, radii, weights,
   letter-spacing, shadows, row geometry, menu and tooltip darkness, motion, timing.
2. **Neutral dark greys.** Dark panels are #2c2c2c, fields #383838, pressed #444. The old
   blue-grey `dark` ramp (#1f2428 ...) goes.
3. **Panel 240 px, field 88 px.** Grid `16 | 88 | 8 | 88 | 8 | 24 | 8`.
4. **Typeface: Inter Variable**, bundled in this package (SIL OFL, latin subset woff2, license
   file shipped). Weights 450 body, 550 strong, 600 top-level layer names. Consumers do nothing.
5. **Accent.** #0d99ff exactly for filled accent surfaces (primary button, selected tool, checked
   blue checkbox, switch on, slider-less brand fills). #007be5 for links and brand text / icons
   in light. #0768cf pressed. Dark theme #0c8ce9 for brand fills and the focus ring, #7cc4f8 for
   brand text / icons (all from `--color-*-brand` dark values).
6. **Focus ring: 1px #0d99ff / #0c8ce9**, keyboard focus only (`:focus-visible`), except number
   and text fields which ring on any focus. Inside (-1px) on fields and joined segments, outside
   (+1px) on buttons. Every focusable control carries `outline: 1px solid transparent` at rest
   so focus never shifts layout. Mantine's 2px ring is gone.
7. **Motion.** Menus, submenus, selects, popovers, tooltips, modals, toasts, tabs, rows and inputs
   change in one frame: no fade, no slide, no scale. The only transitions are listed in
   section 2.8.
8. **Tooltips.** 1000 ms cold, instant when warm (any tooltip visible or within its 300 ms hide
   window), 300 ms hide. Dark (#1e1e1e) in both themes. They KEEP `aria-describedby` (Figma
   hides them from assistive technology; we do not).
9. **One popover at a time.** Opening another light popover (Popout) replaces the open one.
10. **Menus and listboxes are dark in both themes** (#1e1e1e surface, #0c8ce9 inset highlight).
11. **Accessibility we keep beyond Figma**: tooltip `aria-describedby`; a real ARIA tree for the
    layer tree with arrow-key navigation; every control's keyboard behaviour at least as good as
    today (see section 14 for the list).
12. **Compatibility.** Every existing export keeps its name and its props; restyles land inside
    them. New Figma components are new exports. Anything that cannot stay compatible is listed in
    section 15 for the release notes (compact-mantine is 0.x).
13. **Plain ASCII** in all code, comments, docs and stories.
14. **WCAG AA is an option** (`highContrast`), off by default. Section 2.9 lists exactly what it
    changes.

## 2. Tokens

All tokens are CSS custom properties on `:root`, written with the CSS `light-dark()` function so
that they resolve per element from its `color-scheme`. Mantine already sets `color-scheme: light`
or `dark` on `:root[data-mantine-color-scheme]`, so no second theme object is needed. A subtree
that must render dark in the light app (menus, tooltips, the toast, the shortcuts sheet) sets
`color-scheme: dark` on its surface and every token inside it resolves dark: this is Figma's
`data-preferred-theme="dark"` trick, done with the platform. `light-dark()` inside an unregistered
custom property is resolved where the property is USED, which is what makes that work.

Source for every value in this section: `design/ui/figma/tokens/css-variables.json` (light) and
`css-variables-dark.json` (dark), read with the Figma variable in the last column.

### 2.1 Colour roles

| Token | Light | Dark | Figma variable |
|---|---|---|---|
| `--cm-bg` | #ffffff | #2c2c2c | `--color-bg` |
| `--cm-bg-secondary` (field fill, track, joined group) | #f5f5f5 | #383838 | `--color-bg-secondary` |
| `--cm-bg-hover` (row / tab / tool hover) | #f5f5f5 | #383838 | `--color-bg-hover` |
| `--cm-bg-pressed` (= tertiary) | #e6e6e6 | #444444 | `--color-bg-pressed`, `--color-bg-tertiary` |
| `--cm-bg-secondary-hover` (checkbox / switch hover) | #e6e6e6 | #444444 | `--color-bg-secondary-hover` |
| `--cm-bg-secondary-pressed` | #d9d9d9 | #757575 | `--color-bg-secondary-pressed` |
| `--cm-bg-transparent-hover` | #0000000d | #ffffff0d | `--color-bg-transparent-hover` |
| `--cm-bg-transparent-pressed` | #0000001a | #ffffff1a | `--color-bg-transparent-pressed` |
| `--cm-bg-selected` | #e5f4ff | #394360 | `--color-bg-selected` |
| `--cm-bg-selected-hover` | #bde3ff | #4a5878 | `--color-bg-selected-hover` |
| `--cm-bg-selected-secondary` | #f2f9ff | #32394d | `--color-bg-selected-secondary` |
| `--cm-bg-selected-pressed` | #80caff | #394360 | `--color-bg-selected-pressed` |
| `--cm-bg-brand` | #0d99ff | #0c8ce9 | `--color-bg-brand` |
| `--cm-bg-brand-hover` | #007be5 | #0a6dc2 | `--color-bg-brand-hover` |
| `--cm-bg-brand-pressed` | #0768cf | #105cad | `--color-bg-brand-pressed` |
| `--cm-bg-disabled` | #d9d9d9 | #757575 | `--color-bg-disabled` |
| `--cm-bg-menu` (menus, listboxes; same in both) | #1e1e1e | #1e1e1e | `--color-bg-menu` |
| `--cm-bg-tooltip` (same in both) | #1e1e1e | #1e1e1e | `--color-bg-tooltip` |
| `--cm-bg-toolbar` (toast; same in both) | #2c2c2c | #2c2c2c | `--color-bg-toolbar` |
| `--cm-bg-inverse` / hover / pressed | #2c2c2c / #383838 / #444444 | #ffffff / #f5f5f5 / #e6e6e6 | `--color-bg-inverse*` |
| `--cm-bg-danger` / hover / pressed | #f24822 / #dc3412 / #bd2915 | #e03e1a / #c4381c / #963323 | `--color-bg-danger*` |
| `--cm-bg-success` / hover / pressed | #14ae5c / #009951 / #008043 | #198f51 / #078348 / #0a5c35 | `--color-bg-success*` |
| `--cm-bg-warning` | #ffcd29 | #f3c11b | `--color-bg-warning` |
| `--cm-bg-component-tertiary` | #f1e5ff | #473956 | `--color-bg-component-tertiary` |
| `--cm-bg-mode-switcher` / hover | #f5f5f5 / #e6e6e6 | #444444 / #383838 | `--color-bgtoolbarmodeswitcher*` |
| `--cm-bg-info` (hint banner) | #e5f4ff | #394360 | `--color-bg-info` |
| `--cm-text` | #000000e5 | #ffffff | `--color-text` |
| `--cm-text-secondary` | #00000080 | #ffffffb2 | `--color-text-secondary` |
| `--cm-text-tertiary` (placeholder) | #0000004d | #ffffff66 | `--color-text-tertiary` |
| `--cm-text-disabled` | #0000004d | #ffffff66 | `--color-text-disabled` |
| `--cm-text-brand` (links, brand text) | #007be5 | #7cc4f8 | `--color-text-brand` |
| `--cm-text-onbrand` / `-secondary` | #ffffff / #ffffffcc | #ffffff / #ffffffcc | `--color-text-onbrand*` |
| `--cm-text-ondisabled` | #ffffff | #2c2c2c | `--color-text-ondisabled` |
| `--cm-text-oninverse` | #ffffffe5 | #000000e5 | `--color-text-oninverse` |
| `--cm-text-component` | #8638e5 | #d1a8ff | `--color-text-component` |
| `--cm-text-danger` | #dc3412 | #fca397 | `--color-text-danger` |
| `--cm-text-menu` / `-secondary` / `-disabled` (same in both) | #ffffff / #ffffffb2 / #ffffff66 | same | `--color-text-menu*` |
| `--cm-icon` | #000000e5 | #ffffff | `--color-icon` |
| `--cm-icon-secondary` | #00000080 | #ffffffb2 | `--color-icon-secondary` |
| `--cm-icon-tertiary` | #0000004d | #ffffff66 | `--color-icon-tertiary` |
| `--cm-icon-brand` | #007be5 | #7cc4f8 | `--color-icon-brand` |
| `--cm-icon-disabled` | #0000004d | #ffffff66 | `--color-icon-disabled` |
| `--cm-icon-ondisabled` | #ffffff | #2c2c2c | `--color-icon-ondisabled` |
| `--cm-icon-component-tertiary` | #c5b2dc | #7f699b | `--color-icon-component-tertiary` |
| `--cm-border` (dividers, field hover outline, select trigger) | #e6e6e6 | #444444 | `--color-border` |
| `--cm-border-strong` | #2c2c2c | #ffffffe5 | `--color-border-strong` |
| `--cm-border-selected` (focus ring, selected border) | #0d99ff | #0c8ce9 | `--color-border-selected` |
| `--cm-border-selected-strong` (primary-button and switch ring) | #007be5 | #7cc4f8 | `--color-border-selected-strong` |
| `--cm-border-disabled` | #e6e6e6 | #444444 | `--color-border-disabled` |
| `--cm-border-danger` / `-strong` | #ffc7c2 / #dc3412 | #864537 / #fca397 | `--color-border-danger*` |
| `--cm-border-translucent` (secondary button, panel edge) | #0000001a | #ffffff1a | `--color-bordertranslucent` |
| `--cm-border-translucent-strong` (checkbox, switch track) | #00000033 | #ffffff33 | `--color-bordertranslucentstrong` |
| `--cm-control-icon-outline` (knob on, blue-check halo) | #0000001a | #0000001a | `--color-controliconoutline` |
| `--cm-control-knob-off-outline` | #00000033 | #00000033 | `--color-controlknoboffoutline` |
| `--cm-border-menu` (legacy context separator) | #383838 | #383838 | `--color-border-menu` |
| `--cm-scrollbar` | #b3b3b380 | #b3b3b380 | `--color-scrollbar` |
| `--cm-text-highlight` (text selection) | #0d99ff66 | #0d99ff66 | `--color-texthighlight` |
| `--cm-modal-backdrop` | #00000080 | #00000080 | `--color-modalbackdrop` |

Inside a dark-scoped surface (`color-scheme: dark`), `--cm-bg-brand` resolves to #0c8ce9 and
`--cm-text-secondary` to #ffffffb2: that is exactly what Figma's menu highlight and shortcut text
measure (C32, cr/main-menu-hover-highlight). The legacy context menu is the one surface that is
NOT dark-scoped (highlight #0d99ff); we do not build a legacy variant (section 8.2).

### 2.2 PANEL_INK, re-pointed

`PANEL_INK` keeps every key (graphty reads it at about 400 call sites) and each key now resolves
to a token. New keys are added for roles the old map lacked.

| Key | New value | Was |
|---|---|---|
| `VALUE` | `var(--cm-text)` | Mantine text |
| `CHROME` | `var(--cm-text-secondary)` | gray-7 / dark-1 |
| `PROSE` | `var(--cm-text-secondary)` | gray-7 / dark-1 |
| `PLACEHOLDER` | `var(--cm-text-tertiary)` | gray-7 / dark-1 |
| `DISABLED` | `var(--cm-text-disabled)` | Mantine disabled |
| `SURFACE` | `var(--cm-bg-secondary)` | gray-1 / dark-6 |
| `PANEL` | `var(--cm-bg)` | Mantine body |
| `RAISED` | `var(--cm-bg-pressed)` | gray-3 / dark-5 |
| `SELECTED` | `var(--cm-bg-selected)` | gray-7 / dark-1 (an inverted patch) |
| `ON_SELECTED` | `var(--cm-icon-brand)` | body |
| `BORDER` | `var(--cm-border)` | gray-6 / dark-2 |
| `DIVIDER` | `var(--cm-border)` | gray-6 / dark-2 |
| `ACCENT` | `var(--cm-bg-brand)` | Mantine primary filled |
| `ON_ACCENT` | `var(--cm-text-onbrand)` | primary contrast |
| `WARNING` | `var(--cm-bg-warning)` | yellow-6 |
| `SUCCESS` | `var(--cm-bg-success)` | green-6 |
| `DANGER` | `var(--cm-bg-danger)` | red-6 |
| new `HOVER` | `var(--cm-bg-hover)` | -- |
| new `PRESSED` | `var(--cm-bg-pressed)` | -- |
| new `TRANSPARENT_HOVER` / `TRANSPARENT_PRESSED` | the two transparent tokens | -- |
| new `SELECTED_HOVER` / `SELECTED_SECONDARY` | the two selected tokens | -- |
| new `BRAND_TEXT` | `var(--cm-text-brand)` | -- |
| new `TERTIARY` | `var(--cm-icon-tertiary)` | -- |
| new `FOCUS` | `var(--cm-border-selected)` | -- |
| new `TRANSLUCENT` / `TRANSLUCENT_STRONG` | the two translucent borders | -- |
| new `MENU` / `ON_MENU` / `ON_MENU_SECONDARY` | #1e1e1e and its two text tokens | -- |
| new `COMPONENT` | `var(--cm-text-component)` | -- |

`SELECTED` and `ON_SELECTED` change meaning from "inverted solid patch" to Figma's "selected
item" (#e5f4ff with a brand glyph). The selected segment of a segmented control is NOT
`SELECTED` in Figma; it is a white face with an inset edge, which the segmented control draws
itself (section 5.2). Listed as a breaking change.

### 2.3 Type

The family is `"Inter Variable", "Inter", ui-sans-serif, system-ui, -apple-system,
"BlinkMacSystemFont", "Segoe UI", "Roboto", "Helvetica Neue", sans-serif` (Figma
`--font-family-default` with our bundled face first). Monospace: `"Roboto Mono", ui-monospace,
SFMono-Regular, Menlo, monospace` (Figma `--text-mono-medium`; not bundled).

| Role | Size / line-height | Weight | Letter-spacing | Figma token | Used by |
|---|---|---|---|---|---|
| body | 11 / 16 | 450 | 0.055px | `--text-body-medium` | menu items, tooltips, input values, buttons, list rows |
| body strong | 11 / 16 | 550 | 0.055px | `--text-body-medium-strong` | section titles (letter-spacing normal on section `h2`), active tab, toast |
| heading small | 13 / 22 | 550 | -0.032px | `--text-heading-small` | selection type title, file name |
| heading medium | 15 / 25 | 550 | -0.075px | `--text-heading-medium` | empty-state heading |
| caption strong | 9 / 14 | 500 | 0.27px | `--text-body-small-strong` | captions above two-column fields |
| caption | 9 / 14 | 450 | 0.045px | `--text-body-small` | rail labels |
| layer top-level | 11 / 32 | 600 | 0.055px | none | top-level tree rows |
| layer nested / legend | 11 / 32 (legend 11 / 16) | 400 | 0.055px (legend normal) | none | nested tree rows, field legends |
| large row | 13 / 24 | 400 | -0.003px | none | quick actions rows |
| sheet | 12 / 16 (tabs 12 / 38) | 400 | normal | none | keyboard shortcuts sheet |
| key cap | 14 / 24 | 400 | normal | none | key caps |

Mantine theme mapping (`theme.fontSizes` / `theme.lineHeights`, both px):

| Mantine size | fontSize | lineHeight |
|---|---|---|
| xs | 9px | 14px |
| sm | 11px | 16px |
| md | 13px | 22px |
| lg | 15px | 25px |
| xl | 24px | 32px |

`theme.fontFamily` is the family above; `theme.headings.fontWeight` 550. The injected stylesheet
sets `body` to 11/16 weight 450 letter-spacing 0.055px (Figma's app root measures
`Inter, sans-serif 11px/16px`, bc/btn-primary-md-enabled--default #2). Text selection colour is
`--cm-text-highlight`. No uppercase anywhere; emphasis is weight, never size or colour.

Source: C1, `tokens-and-typography/README.md`, `--text-*` variables.

### 2.4 Spacing

Figma's spacers are 4 / 8 / 12 / 16 / 24 / 32 (`--spacer-1 .. -5`, with `-2-5` 12). There is no 6.
The Mantine spacing scale changes only where it was off-grid:

| Mantine | Old | New |
|---|---|---|
| xs | 4 | 4 |
| sm | 6 | **8** |
| md | 8 | 8 |
| lg | 12 | 12 |
| xl | 16 | 16 |

`md` stays 8 so that existing `gap="md"` layouts in graphty do not move; `sm` joins it because
6 is not on Figma's grid. Common paddings to use directly: `0 8px`, `4px 0`, `0 0 12px 0`
(section bottoms), `0 8px 0 16px` (right-panel rows).

### 2.5 Radii

| Mantine | Old | New | Figma |
|---|---|---|---|
| xs | 2 | 2 | `--radius-small`: checkbox, chit, key caps, size badge |
| sm | 4 | **5** | `--radius-medium`: every button, input, select, tab, tooltip, row highlight, list row |
| md | 6 | **5** | (medium) |
| lg | 8 | **13** | `--radius-large`: menus, popovers, modals, toolbar, toast, cards |
| xl | 12 | **13** | (large) |

Full (9999px, `--radius-full`) is written as a literal for avatars, switch track, slider track and
the help button. The segmented-thumb option radius is 3 (`calc(5px - 2px)`). One-sided joins are
`5px 0 0 5px` and `0 5px 5px 0`. `theme.defaultRadius` stays `sm`.

### 2.6 Elevation

Panels have no shadow; they are separated by 1px `--cm-border`. Floating surfaces use these five
(C4; the first blur is 0.5px as measured live, not the 1px in the token text). Each is one
`--cm-elevation-*` token; the dark value adds white inset hairlines, so the tokens are written
with `light-dark()` per colour stop and `transparent` where a layer exists in only one theme:

| Token | Light | Dark | Used by |
|---|---|---|---|
| `--cm-elevation-100` | `0 0 .5px rgba(0,0,0,.3), 0 1px 3px rgba(0,0,0,.15)` | `0 0 .5px rgba(0,0,0,.5), 0 1px 3px rgba(0,0,0,.4), inset 0 1px 0 rgba(255,255,255,.1), inset 0 0 1px rgba(255,255,255,.3)` | sliding thumb of the mode switch |
| `--cm-elevation-200` | `0 0 .5px rgba(0,0,0,.18), 0 3px 8px rgba(0,0,0,.1), 0 1px 3px rgba(0,0,0,.1)` | `0 3px 8px rgba(0,0,0,.35), 0 1px 3px rgba(0,0,0,.5), inset 0 1px 0 rgba(255,255,255,.08), inset 0 0 1px rgba(255,255,255,.3)` | floating toolbar, quick actions, help button |
| `--cm-elevation-300` | `0 0 .5px rgba(0,0,0,.15), 0 5px 12px rgba(0,0,0,.13), 0 1px 3px rgba(0,0,0,.1)` | `0 5px 12px rgba(0,0,0,.35), 0 1px 3px rgba(0,0,0,.5), inset 0 1px 0 rgba(255,255,255,.08), inset 0 0 1px rgba(255,255,255,.3)` | tooltips, slider thumb under-layer |
| `--cm-elevation-400` | `0 0 .5px rgba(0,0,0,.12), 0 10px 16px rgba(0,0,0,.12), 0 2px 5px rgba(0,0,0,.15)` | `0 10px 16px rgba(0,0,0,.35), 0 2px 5px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.08), inset 0 0 1px rgba(255,255,255,.35)` | menus, listboxes, light popovers |
| `--cm-elevation-500` | `0 0 .5px rgba(0,0,0,.08), 0 10px 24px rgba(0,0,0,.18), 0 2px 5px rgba(0,0,0,.15)` | `0 10px 24px rgba(0,0,0,.45), 0 3px 5px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.08), inset 0 0 1px rgba(255,255,255,.35)` | modals |
| `--cm-elevation-toast` | `0 1px 3px rgba(0,0,0,.4), inset 0 0 .5px rgba(255,255,255,.3), inset 0 .5px 0 rgba(255,255,255,.1), 0 0 .5px rgba(0,0,0,.5)` (both themes) | same | toast (C37) |

Menus, listboxes and tooltips are dark surfaces, but their SHADOW follows the page theme: in
the light app Figma measured the light column on a menu (bc/tab-design--default #40:
`0 2px 5px .15, 0 10px 16px .12, 0 0 .5px .12`) and on a tooltip (ii/tooltip-with-shortcut #63).
So the surface element keeps the page's `color-scheme` (its `box-shadow` resolves light in the
light app) and an inner wrapper carries `color-scheme: dark` for everything drawn inside it. The
overlays and inputs packages build their dark surfaces this way.

Mantine `theme.shadows` maps onto them so `shadow="..."` props keep working: xs = 100, sm = 200,
md = 300, lg = 400, xl = 500.

### 2.7 Focus ring

One colour and one width: `1px solid var(--cm-border-selected)`, on `:focus-visible`, drawn in one
frame. Resting focusable controls carry `outline: 1px solid transparent` with the same offset. The
variants and who uses them (C5, ac/focus-rings.json, ii/focus-ring-tab-01..14):

| Class (foundation) | Rule | Used by |
|---|---|---|
| `cm-focus-outside` | `outline-offset: 1px` | ghost icon buttons, text buttons, tabs, segmented faces, checkbox face, toggle icon label |
| `cm-focus-pseudo` | ring on `::before` (inset 0) at offset +1px, element keeps its own outline | secondary button (its grey outline stays), icon buttons that open a popover |
| `cm-focus-flush` | `outline-offset: 0` | page rows, search field wrapper, rail pill (inactive), grid cells |
| `cm-focus-inside` | `outline-offset: -1px` | field wrappers (any focus, `:focus-within`), select trigger, joined group segments, toolbar tools, active rail pill, scroll containers |
| `cm-focus-inside-2` | 1px at `-2px` | round help button (fades in 200ms ease-out), main-menu-style 32 buttons |
| `cm-focus-double` | `box-shadow: inset 0 0 0 1px var(--cm-bg), 0 0 0 1px var(--cm-bg), 0 0 0 2px var(--cm-border-selected)` | selected (blue) toolbar tool, colour chit |
| `cm-focus-primary` | `outline: 1px solid var(--cm-border-selected-strong)` at -1px plus `box-shadow: inset 0 0 0 2px #fff` | primary button (Share style). Generic primary: 1px #0d99ff at +1px (bc/btn-primary-md-enabled--focus #63) -- use the generic |
| `cm-focus-switch` | 1px `var(--cm-border-selected-strong)` at +1px on the track | switch |

`theme.focusRing` becomes `"never"` so Mantine emits no ring of its own, and every focusable
element this package themes gets one of the classes above through its theme `classNames` (or
its component's markup). A test in the foundation asserts that every themed focusable component
shows a 1px ring on keyboard focus, so "never" cannot silently leave a control with none.

### 2.8 Motion

`--cm-duration-sm: 100ms`, `--cm-duration-md: 200ms`, `--cm-ease-out: ease-out`,
`--cm-ease-in-out: cubic-bezier(.645,.045,.355,1)`, `--cm-ease-loading: cubic-bezier(.65,0,.35,1)`.

Every Mantine overlay (Menu, Popover, Tooltip, HoverCard, Modal, Combobox dropdowns, Notification,
Collapse where it is chrome) gets `transitionProps: { duration: 0 }` in its theme `defaultProps`
(Mantine animates them 100-150ms by default: cr/README "what actually animates"). `Collapse`
inside ControlSection / ControlSubGroup opens in one frame as well (`transitionDuration: 0`). The
SegmentedControl indicator does not slide (`transitionDuration: 0`).

What DOES move (C6):

| What | Property, duration, easing |
|---|---|
| Section header title, chevron, "+" on hover (empty sections) | `color`, `fill` 100ms ease-out |
| Hover-revealed header / row actions | `opacity` 100ms ease-out |
| Checkbox tick, checking only | `stroke-dashoffset` 12 -> 0, 100ms `--cm-ease-in-out`; box fill instant |
| Switch knob | `transform` 100ms ease-out; track `background` 100ms `--cm-ease-in-out` |
| Help button focus ring | 200ms ease-out |
| Loading button | label fades out 200ms `--cm-ease-loading`; spinner fades in after 100ms |

`prefers-reduced-motion: reduce` removes none of these (Figma keeps the 100-150ms micro
animations and removes only large slides, which we do not have).

### 2.9 The `highContrast` option (WCAG 2.2 AA)

Off by default. When on, ONLY these tokens change; nothing else moves. Contrast figures are WCAG
ratios computed from the composited colours on the surface named.

Owner's list:

| Token | Figma light / dark | AA light / dark | Why (ratio after) |
|---|---|---|---|
| `--cm-text-secondary`, `--cm-icon-secondary` | #00000080 / #ffffffb2 | **#0000008c** / #ffffffb2 | 55% black: 4.76:1 on #fff, 4.66:1 on #f5f5f5 fields. Dark already passes (7.7:1) |
| `--cm-border-translucent-strong` (checkbox face, switch track border) | #00000033 / #ffffff33 | **#00000073** / **#ffffff59** | 3.36:1 against #fff; dark 3.42:1 against #2c2c2c |
| new `--cm-field-edge` (field boundary; Figma has none, transparent) | transparent / transparent | **#00000073** / **#ffffff59** | fields gain a 1px inside edge at 3:1 (same figures); drawn as `box-shadow: inset 0 0 0 1px` so the box does not grow |
| new `--cm-field-edge-hover` | `--cm-border` (the Figma hover outline) | **#000000a6** / **#ffffff80** | keeps a visible hover step above the resting edge |
| new `--cm-segment-edge` (selected segment inset edge) | #e6e6e6 / #444444 (= `--cm-border`) | **#00000073** / **#ffffff73** | 3.08:1 against the #f5f5f5 track; dark 3.44:1 against #383838 |
| `--cm-border` (dividers) | unchanged | unchanged | owner: dividers stay as Figma |

Also required for AA, added by this plan (Figma's values fail AA here too; each is the next
darker Figma token, so the look stays inside Figma's palette). The owner has not approved these
yet; they are listed separately so the owner can veto any row, and each is one line in the token
file:

| Token | Figma light / dark | AA light / dark | Why |
|---|---|---|---|
| `--cm-text-tertiary` (placeholder only; `--cm-text-disabled` stays, disabled controls are exempt) | #0000004d / #ffffff66 | #0000008c / #ffffffb2 | placeholder is text: 2.3:1 fails 4.5:1 |
| `--cm-border-selected` (focus ring) | #0d99ff / #0c8ce9 | **#007be5** / #0c8ce9 | #0d99ff is 2.99:1 on #fff and 2.74:1 on #f5f5f5, under 3:1 |
| `--cm-bg-brand` (white text on it: primary button, menu highlight, selected tool, checked box) | #0d99ff / #0c8ce9 | **#0768cf** / **#0a6dc2** | white on #0d99ff is 2.99:1 and on #0c8ce9 3.53:1, under 4.5:1 for 11px text |
| `--cm-bg-brand-hover` / `-pressed` | #007be5 / #0768cf | #0768cf / #105cad (light hover = the new rest; pressed one step darker #105cad) | keep a visible step |
| `--cm-text-brand`, `--cm-icon-brand` (links) | #007be5 / #7cc4f8 | **#0768cf** / #7cc4f8 | #007be5 is 4.23:1 on #fff |
| `--cm-bg-danger` | #f24822 / #e03e1a | #bd2915 / #963323 | white on #f24822 is 3.67:1 |
| `--cm-bg-success` | #14ae5c / #198f51 | #008043 / #0a5c35 | white on #14ae5c is 2.9:1 |
| menu highlight (`--cm-bg-brand` inside the dark scope) | #0c8ce9 | #0a6dc2 | white on #0c8ce9 is 3.53:1 |

Fields in the AA mode: a field (number, text, search, combo, paint) draws `--cm-field-edge` at
rest; hover swaps it for `--cm-field-edge-hover`; focus replaces it with the 1px focus ring, as
in Figma. The outlined select trigger already has a border (`--cm-border`); in AA mode that
border becomes `--cm-field-edge`. Checkbox and switch borders read
`--cm-border-translucent-strong`, so they need no component change.

## 3. Theme API and how the tokens reach the page

### 3.1 Public API

```ts
export interface CompactThemeOptions {
    /** Apply the WCAG 2.2 AA token set (section 2.9). Default false: exact Figma. */
    highContrast?: boolean;
}
export function createCompactTheme(options?: CompactThemeOptions): MantineThemeOverride;

export const compactThemeOverride: MantineThemeOverride; // === createCompactTheme()
export const compactTheme: MantineTheme;                 // mergeMantineTheme(DEFAULT_THEME, compactThemeOverride)
export function compactGlobalCss(options?: CompactThemeOptions): string; // the whole stylesheet, for SSR or a shadow root
export function ensureCompactStyles(options?: CompactThemeOptions): void; // idempotent injection; exported for shadow roots
```

Usage stays one line: `<MantineProvider theme={compactTheme}>`, or
`<MantineProvider theme={createCompactTheme({ highContrast: true })}>`. Light / dark is Mantine's
own colour scheme (`defaultColorScheme`, `forceColorScheme`, `useMantineColorScheme`); there is no
second theme object per scheme. The resolved options are published on
`theme.other.compact = { highContrast: boolean }` and `theme.other.panelGrid` stays.

### 3.2 Delivery (implementation, foundation-owned)

- One stylesheet, `compactGlobalCss()`: the Inter `@font-face` (the woff2 inlined as a data URL
  by Vite's library mode), the `:root` token block, the AA token block scoped to
  `:root[data-cm-contrast="high"]`, the body type rules, the focus-ring and dark-surface utility
  classes, and every package's component CSS. Each package writes its CSS as a TypeScript module
  exporting a template string at `src/theme/css/<package>.css.ts`; the foundation's aggregator
  collects them with `import.meta.glob("./css/*.css.ts", { eager: true })` in filename order (the
  foundation's file is `00-foundation.css.ts`), so a package adds its file without touching the
  aggregator.
- Injection: `createCompactTheme` wraps every component extension's `vars` resolver so that its
  first call runs `ensureCompactStyles(theme.other.compact)`. That inserts one
  `<style data-compact-mantine>` into `document.head` (once), and writes
  `data-cm-contrast="high" | "figma"` on `document.documentElement` when it differs from the
  theme's option. With no `document` (Node, SSR) it does nothing; SSR consumers put
  `compactGlobalCss()` in their head. Last rendered theme wins the contrast attribute; two
  providers with different contrast on one page are not supported (comment it with a
  `ponytail:` note).
- Mantine's own CSS still loads first (`@mantine/core/styles.css`, the consumer's existing
  import). Our stylesheet is appended later and targets our own `cm-*` classes, which components
  receive through theme `classNames` or their own markup, so it wins without `!important`.
- Mantine component extensions keep using `vars` for sizes; colours come from tokens. Where a
  state needs a selector (`:hover`, `[data-active]`, `::before`), the rule lives in the owning
  package's `.css.ts`, keyed on a `cm-*` class set through that extension's `classNames`.

### 3.3 Mantine theme values the foundation sets

`primaryColor: "brand"` with a 10-shade palette whose shades land on Figma's tokens where Mantine
reads them (Mantine uses shade 6 filled / 7 hover in light, 8 / 9 in dark, shade 4 as the dark
anchor colour):

| Index | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 |
|---|---|---|---|---|---|---|---|---|---|---|
| brand | #e5f4ff | #bde3ff | #80caff | #4db5ff | #7cc4f8 | #30a8ff | #0d99ff | #007be5 | #0c8ce9 | #0a6dc2 |

`colors.dark` becomes a neutral ramp so that unthemed Mantine surfaces match: `#ffffff, #b3b3b3,
#8c8c8c, #757575, #444444, #444444, #383838, #2c2c2c, #1e1e1e, #111111` (dark-7 = body #2c2c2c,
dark-6 = default field #383838, dark-5 = hover #444, dark-0 = text). `colors.gray` stays Mantine's.
`white` #ffffff, `black` #000000. `fontSmoothing: true`. `cursorType: "default"`.

## 4. Buttons

Package: buttons. Theme files: `src/theme/components/buttons.ts`, `src/theme/styles/buttons.ts`,
`src/theme/css/buttons.css.ts`.

### 4.1 Button (Mantine `Button`), primary = `variant="filled"` (the default)

Geometry for every text variant (C7, bc/btn-primary-md-enabled--default #63, #66):

| Size | Height | Label inset | Font | Radius | Border |
|---|---|---|---|---|---|
| sm (default, Figma md) | 24 | 0 8px (label span; button padding 0) | 11/16 450 0.055px | 5 | none; `outline: 1px solid transparent` |
| md (Figma lg) | 32 | 0 12px | same | 5 | same |
| xs | 20 | 0 6px | 11/16 450 | 5 | (not in Figma; keep the ramp) |
| lg / xl | 36 / 44 | 0 16px / 0 20px | 13 / 15 | 5 | (not in Figma; keep the ramp) |

- "Button" label measures 52.3 x 24 (sm) and 60.3 x 32 (md) (bc/btn-primary-lg-enabled--default #25).
- Left section (icon): a 24 x 24 slot with `margin-inline-start: -4px`, so the visible start
  inset is 4px; the label follows directly ("Create" 73.3 x 24, bc/btn-primary-md-icon--default
  #25, #28 at x-4). Right section shortcut: `padding-inline-start: 4px`, colour the variant's
  secondary text (`#ffffffcc` on primary: bc/btn-primary-md-shortcut--default #29).
- Loading: width unchanged, `cursor: progress`, label fades out 200ms, a 16 x 16 spinner centred
  (bc/btn-primary-md-loading--default #28).
- Disabled: skipped by Tab (native `disabled`), `cursor: auto`, no hover.

States per variant (bc/btn-<variant>-md-enabled--default|hover|pressed|focus, bc/btn-*-disabled--default):

| Variant | Default bg / text | Hover bg | Pressed bg / text | Rest outline | Focus | Disabled |
|---|---|---|---|---|---|---|
| filled (primary) | `--cm-bg-brand` #0d99ff / #0c8ce9, `--cm-text-onbrand` | `--cm-bg-brand-hover` #007be5 / #0a6dc2 | `--cm-bg-brand-pressed` #0768cf / #105cad, text #ffffffcc | none | 1px `--cm-border-selected` at +1px | bg `--cm-bg-disabled` #d9d9d9 / #757575, text `--cm-text-ondisabled` #fff / #2c2c2c |
| default (secondary) | transparent / `--cm-text` | `--cm-bg-transparent-hover` | `--cm-bg-transparent-pressed` / `--cm-text` | `outline: 1px solid --cm-border-translucent` at -1px | grey outline stays; blue ring on `::before` inset 0, offset +1px | text `--cm-text-disabled`, outline `--cm-border-disabled` |
| subtle (ghost) | transparent / `--cm-text` | `--cm-bg-transparent-hover` | `--cm-bg-transparent-pressed` | none | +1px ring | text `--cm-text-disabled` |
| danger (`color="red"` filled, or new `variant="danger"`) | `--cm-bg-danger` / #fff | `--cm-bg-danger-hover` | `--cm-bg-danger-pressed` / #ffffffcc | none | +1px ring | as filled |
| danger-outline (new) | transparent / `--cm-text-danger` | transparent-hover | transparent-pressed | 1px `--cm-border-danger` at -1px | pseudo ring | text disabled |
| inverse (new) | `--cm-bg-inverse` / `--cm-text-oninverse` | `--cm-bg-inverse-hover` | `--cm-bg-inverse-pressed` / #ffffffcc | none | +1px ring | as filled |
| success (new) | `--cm-bg-success` / #fff | `--cm-bg-success-hover` | `--cm-bg-success-pressed` / #ffffffcc | none | +1px ring | as filled |
| light, outline, gradient, white (Mantine) | map `light` to the toggle-on look (`--cm-bg-selected`, `--cm-text-brand`), `outline` to secondary, others keep Mantine derivation on the brand palette | | | | | |

Dark measurements: secondary on dark, dt/dark-secondary-button-proto--default #24 (outline
#ffffff1a, text #fff), --hover (#ffffff0d). Full-width secondary (`fullWidth`) is 208 x 24 in a
240 panel (16 margins).

Keyboard: native button. Interaction: activates on click (text buttons are NOT mouse-down).

### 4.2 Link (Mantine `Anchor`) -- owned by the selection package (it lives in `navigation.ts`)

11/16 weight 450 0.055px, `--cm-text-brand` #007be5 / #7cc4f8, no underline, pointer
(bc/btn-link-md-enabled--default #25). Pressed: a `::before` pill inset `-4px -8px`, radius 5,
`--cm-bg-selected` (#e5f4ff / #394360); focus puts the 1px ring on that pill. Secondary link
(`c="dimmed"` or a new `variant="secondary"`): `--cm-text-secondary`, padding 0 4, radius 5,
hover bg `--cm-bg-hover` and text `--cm-text`, focus 2px ring at -2px (C10).
On dark-scoped surfaces links are 12/16 #80caff.

### 4.3 Ghost icon button (Mantine `ActionIcon`, default `variant="subtle"`)

(C11, bc/icon24-*, bc/icon32-*, dt/dark-icon-button-add-fill--*)

| Size | Box | Glyph |
|---|---|---|
| sm (default) | 24 x 24, radius 5, `display: grid` | 24 svg box, glyph 12 nominal (10-14); close X 10 x 10; chevrons 5 x 3 |
| md | 32 x 32, padding 0 4, radius 5 | 24 box |
| xs | 18 (keep ramp) | |

| State | Background | Icon |
|---|---|---|
| default | transparent; outline 1px transparent at -1px | `--cm-icon` |
| hover | `--cm-bg-transparent-hover` #0000000d / #ffffff0d (dt/dark-icon-button-add-fill--hover #33) | unchanged |
| pressed (`:active`) | `--cm-bg-transparent-pressed` #0000001a / #ffffff1a (--pressed #33) | unchanged |
| open (`aria-expanded="true"`) | `--cm-bg-selected` #e5f4ff / #394360 | `--cm-icon-brand` #007be5 / #7cc4f8 |
| open + hover | `--cm-bg-selected-secondary` #f2f9ff / #32394d | brand |
| focus-visible | ring +1px (`cm-focus-outside`; `cm-focus-pseudo` when `aria-haspopup`) | |
| disabled | transparent, no hover | `--cm-icon-disabled` |

Other variants: `default` = secondary (1px `--cm-border-translucent` outline); `light` =
"highlighted" (`--cm-bg-selected`, hover `--cm-bg-selected-hover`, pressed
`--cm-bg-selected-pressed`, brand icon; this REPLACES the 1px accent border the old theme added to
`light`, see section 15); `filled` = brand fill, white icon; `radius="xl"` = full pill.
Mouse-down activation: a "+" (add) button fires on `pointerdown` in Figma; ActionIcon keeps click
(Mantine), and the new ToggleIconButton (4.4) and pill tabs use pointer-down.

Tooltip: every icon-only button has a tooltip (section 8.3) below it.

### 4.4 Toggle icon button (NEW export `ToggleIconButton`)

A 24 x 24 icon toggle, really a checkbox (C12, bc/toggle-icon-*, bc/toggle-aspect-lock--*,
dt/dark-toggle-aspect-lock--*). Build it on a visually hidden `<input type="checkbox">` covering
the box plus a drawn label (radius 5), or on `ActionIcon` with `aria-pressed` -- implementer's
choice; the accessible role must be checkbox or toggle button, Space toggles.

| State | Background | Icon |
|---|---|---|
| off | transparent | `--cm-icon` |
| off hover / pressed | `--cm-bg-transparent-hover` / `-pressed` (dt/dark-toggle-aspect-lock--hover #27 #ffffff0d) | |
| on | `--cm-bg-selected` | `--cm-icon-brand` |
| on hover | `--cm-bg-selected-secondary` | brand |
| on pressed | `--cm-bg-selected` | brand |
| focus-visible | 1px ring on the label, offset +1px | |
| disabled off / on | icon `--cm-icon-disabled`; on: bg `--cm-bg-disabled` | |

Props: `checked`, `defaultChecked`, `onChange`, `label` (accessible name and tooltip), `icon`,
`checkedIcon` (eye variant: glyph swap, never filled -- `variant="swap"`), `disabled`. Fires on
pointer DOWN (so a drag down a column toggles many rows); keyboard Space.

### 4.5 Split button (NEW export `SplitButton`)

Two halves joined, each with its own hover (C13, bc/split-chevron16-prototype-view--*,
bc/split-input-dropdown-scale--*).

| Kind | Geometry | States |
|---|---|---|
| icon + chevron (`size="md"`) | `role=group`, gap 1px; main 32 x 32 radius `5px 0 0 5px`, padding 0 4, 24 icon; chevron 16 x 32 radius `0 5px 5px 0`, 5 x 3 caret | hovering either half lights BOTH `--cm-bg-transparent-hover`; the pressed half `--cm-bg-transparent-pressed`; chevron icon brand while its menu is open |
| field + chevron | grid `1fr min-content`, gap 1px; field on `--cm-bg-secondary` radius `5px 0 0 5px`; chevron 24 x 24 on `--cm-bg-secondary` radius `0 5px 5px 0` | chevron hover and pressed `--cm-bg-transparent-hover`; focus ring at -1px |

The field + chevron kind is the ComboInput (section 6.3); SplitButton covers the icon + chevron
kind. The chevron half opens a dark Menu (section 8.1).

### 4.6 Joined button group (Mantine `ActionIcon.Group`, themed)

Three momentary buttons reading as one 88 x 24 bar (C14, ii/tooltip-with-shortcut #39-#47,
dt/dark-align-left--hover #27):

- Each button 88/3 = 29.3 x 24 (28.7 measured with rounding), `--cm-bg-secondary`, outer radii
  `5px 0 0 5px` / `0 5px 5px 0`, inner corners square, no gap, no divider, 24 icon box.
- Hover and pressed: that button `--cm-bg-pressed` #e6e6e6 / #444.
- Focus: 1px ring INSIDE (-1px).
- Two groups in a row sit 8px apart. Tooltips carry the shortcut ("Align left  Alt+A").

Theme `ActionIconGroup` (and the ActionIcons inside it) so that
`<ActionIcon.Group><ActionIcon variant="default">...` renders this. `variant` inside a group
defaults to a new `"joined"` look.

### 4.7 Close button (Mantine `CloseButton`, and `InputClearButton` shares its scale)

Figma's close is a 24 x 24 ghost icon button with a 10 x 10 X (C35 "Close"). Default size
becomes `sm` = 24 box, 10 icon; `xs` = 16 box, 10 icon (inline clear in a 24 field). Colours as
4.3.

## 5. Selection controls

Package: selection. Theme files: `src/theme/components/controls.ts`, `src/theme/styles/controls.ts`,
`src/theme/components/navigation.ts`, `src/theme/styles/navigation.ts`,
`src/theme/css/selection.css.ts`.

### 5.1 Pill tabs (Mantine `Tabs`, default `variant="pills"` restyled)

(C16, bc/tab-design--default #34-#38, bc/tab-prototype--hover #31)

- `role=tablist`, flex row, gap 4. Tab 24 tall, padding 0 8px, radius 5, 11/16, no border.
- Width reserved for the bold label: render the label twice (a hidden weight-550 copy stacked
  under the visible one) so selecting never shifts layout ("Design" 54.3, "Prototype" 69.5).

| State | Background | Text |
|---|---|---|
| unselected | `--cm-bg` #fff / #2c2c2c | `--cm-text-secondary`, 450 |
| unselected hover | `--cm-bg-hover` | unchanged |
| selected (`aria-selected`) | `--cm-bg-secondary` #f5f5f5 / #383838 | `--cm-text`, 550 |
| focus-visible | 1px ring +1px | |

Keyboard: automatic activation (arrows move focus AND select; Mantine `activateTabWithKeyboard`
true, `loop` true); one Tab stop. Activation on pointer DOWN (set `onMouseDown` to activate).
The old `variant="default"` underline tabs remain reachable with `variant="default"`.
Row tabs (184 x 24 in a left nav, Manage libraries): `orientation="vertical"` renders full-width
24-tall rows with the same colours.

### 5.2 Segmented control, panel (Mantine `SegmentedControl` + `IconGroupRow`)

(C17, bc/segmented-text-align-*, bc/segmented-flow-*, dt/dark-segmented-text-align-center--default #27-#43)

- Track `<fieldset role=radiogroup>`: `--cm-bg-secondary`, radius 5, height 24, NO padding,
  no gap. Options `flex: 1 1 0` (3 in 88 = 29.3; 3 in 184 = 61.3; 4 in 184 = 46).
- Icon option: 24 x 24 glyph box centred. Text option: padding 0 8, 11/16 450.
- Checked face: `--cm-bg` #fff / #2c2c2c, radius 5, `box-shadow: inset 0 0 0 1px
  var(--cm-segment-edge)` (= `--cm-border` #e6e6e6 / #444 in Figma mode; dt/... #31
  `rgb(68,68,68) 0 0 0 1px inset`). Icon / text `--cm-text`.
- Unchecked: transparent; icon `--cm-icon-secondary`, text `--cm-text-secondary`. NO hover fill.
- Focus-visible: 1px ring on the face, +1px. Read-only / disabled: icons `--cm-icon-disabled`.
- No sliding animation (indicator `transitionDuration: 0`).
- Keyboard: arrows move the selection (native radios), Tab leaves. Pointer-down activation.
- Tooltip per option.

`IconGroupRow` becomes this look (its `SELECTED` inverted patch, `TRACK_PADDING` 1,
`SEGMENT_GAP` 2 and `SEGMENT_RADIUS` 3 go).

Loose group variant (colour picker paint types): six 24 x 24 radios 4px apart, no track; selected
`--cm-bg-secondary` radius 5; hover `--cm-bg-secondary`; focus 2px ring at -2px. Offer as
`SegmentedControl` `variant="loose"`.

### 5.3 Segmented control with a sliding thumb (toolbar modes) -- `SegmentedControl variant="toolbar"`

(C18, bc/segmented-toolbelt-option-selected--default #27-#37)

- Root 122 x 32 (for 4 options), padding 2, radius 5, `--cm-bg-mode-switcher` #f5f5f5 / #444.
  Options 28 x 28, gap 2, radius 3, 24 icon box; unselected icon `--cm-icon-secondary`; hover
  `--cm-bg-mode-switcher-hover` #e6e6e6 / #383838.
- Thumb (Mantine indicator): 28 x 28, radius 3, `--cm-bg`, `--cm-elevation-100`; selected icon
  `--cm-icon-brand`. The thumb jumps (no slide).
- Focus: ring on the option at -1px, radius 3. Arrows move between radios.

### 5.4 Checkbox (Mantine `Checkbox`)

(C19; bc/checkbox-neutral-*--*, bc/checkbox-blue-*--*, dt/dark-checkbox-clip-content--default #27)

- Face 16 x 16, radius 2, 1px border, `outline: 1px solid transparent` offset +1px. Hidden input
  over it. Label 11/16 450, 8px after the box. Wrapper margin 4px 0 (24 row) -- in a panel
  ToggleRow the row is 32 (section 9.6).
- Two variants: `variant="neutral"` (panel: stays grey when checked, `--cm-icon` glyph) and the
  default `variant="filled"` = blue (dialogs, popovers, table headers: brand fill, white glyph).
  Which is the DEFAULT: **blue** (Mantine's default look family); `ToggleRow` uses neutral, the
  Figma panel convention.

| State | Face bg | Face border | Glyph |
|---|---|---|---|
| unchecked | `--cm-bg-secondary` #f5f5f5 / #383838 | `--cm-border-translucent-strong` #00000033 / #ffffff33 | -- |
| unchecked hover / pressed | `--cm-bg-secondary-hover` #e6e6e6 / `--cm-bg-secondary-pressed` #d9d9d9 | same | |
| neutral checked / indeterminate | `--cm-bg-secondary` (hover #e6e6e6, pressed #d9d9d9) | same | check / dash in `--cm-icon` |
| blue checked | `--cm-bg-brand` | `--cm-border-translucent` #0000001a (hover #00000033) | white check with a 4px `--cm-control-icon-outline` halo |
| blue checked pressed | `--cm-bg-brand-hover` | #00000033 | |
| blue indeterminate | `--cm-bg-brand` | #0000001a | white dash about 8 x 2 |
| focus-visible | unchanged | unchanged | 1px ring +1px (bc/checkbox-neutral-checked--focus #26) |
| disabled unchecked | transparent | `--cm-border-disabled` | |
| disabled neutral checked | transparent | `--cm-border-disabled` | `--cm-icon-disabled` |
| disabled blue checked | `--cm-bg-disabled` | transparent | `--cm-icon-ondisabled` |

Glyphs: check 9 x 8.5 (as the menu check column) drawn with a stroke so the tick can animate
`stroke-dashoffset` 12 -> 0 over 100ms when checking only. Space toggles.

### 5.5 Switch (Mantine `Switch`)

(C20; bc/switch-off--*, bc/switch-on--*, bc/switch-mixed--* (with @2x))

- Hit area 32 x 24; track 32 x 16 (30 x 14 + 1px `--cm-border-translucent-strong` border),
  radius full; input 32 x 16 at y+4.
- Knob: a 12 x 8 PILL (not a circle), radius full, #fff, 1px outline; x+4 off, x+16 on,
  `transition: transform 100ms ease-out`.

| State | Track | Knob |
|---|---|---|
| off | `--cm-bg-secondary` | x+4, outline `--cm-control-knob-off-outline` |
| off hover / pressed | `--cm-bg-secondary-hover` / `-pressed` | |
| on | `--cm-bg-brand` | x+16, outline `--cm-control-icon-outline` |
| on hover | unchanged | |
| on pressed | `--cm-bg-brand-hover` | |
| mixed (new `indeterminate` prop) | `--cm-bg-brand` | a 10 x 2 bar centred at x+11 |
| focus-visible | `cm-focus-switch` on the track | |
| disabled off / on | transparent + `--cm-border-disabled` / `--cm-bg-disabled` | `--cm-icon-disabled` / #fff |

Label (when present) 8px to the right, 11/16 450 ("True" / "False" in tables).

### 5.6 Radio (Mantine `Radio`)

Figma has no free-standing radio in the chrome (radios are segmented faces). Keep Mantine's
Radio themed on the checkbox's colours: 16 x 16 circle, border `--cm-border-translucent-strong`,
fill `--cm-bg-secondary`; checked `--cm-bg-brand` with a 6px white dot; focus 1px ring +1px;
label 11/16 450 8px after.

### 5.7 Alignment matrix (NEW export `AlignmentMatrix`)

(C21; bc/alignment-grid-9, bc/alignment-grid-cell--*, dt/dark-alignment-grid-cell--default #24-#50)

- 88 x 56, `--cm-bg-secondary`, radius 5, 4px transparent top/bottom border (padding 3 in cells).
  Nine cells 29.3 x 16, each a hidden radio with a tooltip ("Align top left").
- Idle cell: a 2 x 2 dot, radius 2, `--cm-text-tertiary` (#0000004d / #ffffff66).
- Active cell: three bars 2 x 7, 2 x 10, 2 x 5 (radius 2, gap 2, in a 16 x 16 indicator with
  padding 3), `--cm-text-brand` #007be5 / #7cc4f8. Bars rotate / reorder for the vertical
  direction (`direction="horizontal" | "vertical"` prop).
- Hover on another cell previews the bars in `--cm-icon-secondary` (dark: brand #7cc4f8).
- Focus: outline on the cell. Keyboard: arrow keys move in 2D (radio group with a 3x3 grid:
  Left/Right within a row, Up/Down within a column), Tab leaves.
- Props: `value` (`"top-left" .. "bottom-right"`), `onChange`, `direction`, `label`.

### 5.8 Slider and RangeSlider (Mantine), plain

Plain (non-colour) slider: small variant (C29): 8px track radius full on `--cm-bg-secondary`
with a 1px inset `--cm-border-translucent-strong` outline; fill `--cm-bg-brand`; thumb 12 x 12
circle, 2px white border, `box-shadow: 0 0 0 1px rgba(0,0,0,.2), inset 0 0 0 1px rgba(0,0,0,.2)`
plus `--cm-elevation-300`; hover no change; mouse-down jumps; focus-visible 1px ring on the thumb
at -2px; disabled track `--cm-bg` with `--cm-border-disabled`, thumb `--cm-icon-ondisabled`.
Mark labels 9/14. Colour sliders are the colour package's (section 7.4).

### 5.9 Other navigation components (Burger, NavLink, Pagination, Stepper)

No Figma counterpart; re-skin on tokens, keep sizes:

- NavLink: a 24-tall row pill inside a 32 row (like a page row, 9.2): hover `--cm-bg-hover`,
  active `--cm-bg-secondary` weight 550, label 11/16.
- Pagination: controls are ghost 24 buttons (4.3); active control `--cm-bg-secondary` weight 550.
- Stepper: icon 24, `--cm-bg-secondary` pending, `--cm-bg-brand` active / completed, label 11/16.
- Burger: 18 box, `--cm-icon`, 1.5px lines.

### 5.10 IconGroupRow, ToggleRow, ToggleRowGroup, ToggleWithContent (existing components)

- IconGroupRow: the panel segmented control (5.2) laid on the grid (88 or 184 wide), a
  24 trailing slot at x+208.
- ToggleRow (checkbox form): row 32 tall (`TOGGLE_PITCH` 32), neutral checkbox at x+16, label
  8px after, 11/16 450 `--cm-text`. Switch form: switch at the row start, label 8px after.
  ToggleRowGroup keeps its grouping semantics.
- ToggleWithContent: the toggle row as above; the revealed content follows at the same inset with
  no animation.

## 6. Inputs

Package: inputs. Theme files: `src/theme/components/inputs.ts`, `src/theme/styles/inputs.ts`,
`src/theme/css/inputs.css.ts`.

Shared field rules (every filled field: TextInput, NumberInput, PasswordInput, Autocomplete,
MultiSelect / TagsInput / PillsInput wrappers, FileInput, JsonInput, Textarea, NativeSelect,
ColorInput, the panel fields):

- 24 tall, `--cm-bg-secondary`, radius 5, NO border at rest: `--input-bd: transparent`, plus an
  outline slot `outline: 1px solid transparent; outline-offset: -1px` on the wrapper.
- Value 11/16 weight 450 0.055px `--cm-text`; placeholder `--cm-text-tertiary`; text inset 7-8
  (8 by default; 7 where measured: select-like combos). Selection colour `--cm-text-highlight`.
- Hover: outline `--cm-border` (#e6e6e6 / #444; dt/dark-number-input-x--hover #27
  `rgb(68,68,68) solid 1px -1px`).
- Focus (mouse OR keyboard, `:focus-within` on the wrapper): outline `--cm-border-selected`
  (dt/dark-number-input-x--focus #27 `rgb(12,140,233)`). Focus wins over hover and over invalid.
- Disabled: wrapper `--cm-bg` (white / #2c2c2c), outline 1px `--cm-border-disabled`, text
  `--cm-text-disabled`, no hover (bc/number-input-disabled--*).
- Invalid (`error`): outline `--cm-border-danger-strong` #dc3412 / #fca397, hidden while focused.
  Error message text 11/16 `--cm-text-danger`. (Figma never shows it, but keep Mantine's error
  prop working.)
- Label (Mantine `label` prop above a field): 11/16 weight 400 `--cm-text-secondary`, margin 0
  0 4 0 -- the field-row legend (C45). Description 11/16 `--cm-text-secondary`.
- No transition.
- AA mode: resting `box-shadow: inset 0 0 0 1px var(--cm-field-edge)`, hover
  `--cm-field-edge-hover` (section 2.9).

Outlined variant (NEW `variant="outlined"`, also the effect-settings popover fields): `--cm-bg`,
1px `--cm-border` border, radius 5, padding-inline-start 7. Hover unchanged. Focus 1px
`--cm-border-selected`.

Textarea: min 56 tall, padding 4 8. Rename variant: section 10.3 (the tree package draws it).

### 6.1 Scrubbable number input (Mantine `NumberInput`; `PanelField kind="number"`; `StyleNumberInput`)

(C22; ii/number-input-default|hover|label-hover|focus-click|focus-keyboard,
dt/dark-number-input-x--* #27 #30, rs/state-input-*)

- Wrapper 88 x 24 (wide 184, stroke 72), filled as above. A 24 x 24 leading slot holds the label
  glyph or letter ("X", "W") in `--cm-text-secondary` (icons 16-24 box); the input starts at
  x+24, 64 wide in an 88 field, `padding-inline-end: 8`. `PANEL_GRID.GLYPH_SLOT` becomes 24.
- The leading slot is the scrub handle: `cursor: ew-resize`; the input shows `cursor: default`
  until focused, then `text`. Hovering the slot also shows the hover outline.
- Scrubbing: pointer-down on the slot and drag: value changes live at exactly 0.5 unit per screen
  px (Shift: 10x step per C22 arrows rule is keyboard only; scrub has no modifier in Figma);
  `html` and `body` take `cursor: ew-resize` for the drag; release commits once (one change
  event with the final value; `onChangeStart` / `onChangeEnd` where the component already has
  gesture handlers). Focus stays in the field after a scrub.
- Typing: nothing applies until Enter, Tab or blur. A click selects the whole value. Expressions
  evaluate (`40*2` -> 80; + - * / and parentheses; no `eval`). Bad input silently reverts on
  commit.
- Keyboard: ArrowUp / ArrowDown +-step (Shift +-10 steps), applied immediately. Enter commits and
  KEEPS focus (we have no canvas; Figma returns focus to its canvas -- section 14). Escape
  reverts the typed text and blurs. Tab commits and moves on.
- Mixed: `value="mixed"` (new, where the component's value type allows a sentinel -- PanelField
  `mixed` prop) shows the word "Mixed" in `--cm-text`.
- NO stepper chevrons ever (`hideControls` default true). `StyleNumberInput`'s reset button stays
  (compatibility) as a 24 ghost icon button in the trailing slot, not inside the field.
- `role=spinbutton` with `aria-valuenow`; `aria-description` "Use arrow keys to change the value".

### 6.2 Text input and search (Mantine `TextInput`; NEW export `SearchInput`)

- TextInput: the shared field rules; widths from the grid.
- SearchInput (C25; ls/find-open, dt/dark-search-input-assets--focus #24-#29): filled 24 tall,
  radius 5; leading 24 slot with a 16 magnifier; input 11/16 450, `padding-inline-end: 8`;
  placeholder `--cm-text-tertiary`; a 16 clear (x) CloseButton appears in a 24 trailing slot once
  there is text; focus outline 1px `--cm-border-selected` at offset **0** (measured, not -1);
  the outline lingers 100ms after blur then drops in one frame; `autoFocus` prop (default false;
  Figma autofocuses on open, the caller decides). Escape with text clears it; Escape when empty
  bubbles. `size="lg"`: 32 tall, 13/24 text (quick actions).
- Joined variant: field radius `5px 0 0 5px` + a 24 x 24 trailing button `0 5px 5px 0`, both
  `--cm-bg-secondary`, 1px gap (the `rightSection` prop of SearchInput with `joined`).

### 6.3 Combo input (NEW export `ComboInput`)

(C23; bc/combo-input-*--*, bc/combo-*--open, dt/dark-combo-font-size--hover #37-#45)

- 88 x 24, radius 5, `--cm-bg-secondary`, no border at rest; input padding `0 24px 0 7px`; a
  24-wide chevron slot at the end (a 5 x 3 caret in `--cm-text-tertiary`; font-size kind: 25 with
  a 1px `--cm-bg` left divider).
- Hover: 1px `--cm-border` border (dark #444, measured on the label #42). Focus: outline
  `--cm-border-selected` like the number input.
- The chevron (the trailing 18px hit area) opens the dark listbox (6.5) positioned so the current
  value sits over the field. Typing still edits the value (free text or number). Control+ArrowDown
  opens from the keyboard. Enter applies, Escape closes without change and returns focus to the
  field.
- Props: `value`, `onChange`, `options` (value + label, separators, disabled), `numeric`
  (parse / scrub like 6.1), `suffix` (the "Hug" mode word, `--cm-text-secondary`, right-aligned
  before the chevron), `label`.

### 6.4 Select trigger (Mantine `Select`, `NativeSelect`, `StyleSelect`, `PanelField kind="select"`)

(C26; ii/select-trigger-default #27-#30, dt/dark-select-prototype-device--default #26-#29,
dt/dark-select-font-family--default #45)

- The one OUTLINED field: 24 tall, `padding-inline-start: 8`, `--cm-bg` #fff / #2c2c2c, 1px
  `--cm-border` #e6e6e6 / #444, radius 5, 11/16 450 0.055px; grid `1fr 24px`: a 24 chevron slot
  at the end, caret 5 x 3 in `--cm-text-tertiary` (#ffffff66 in dark).
- Hover: no change. Focus-visible: 1px `--cm-border-selected` at -1px. Disabled: text and caret
  `--cm-text-disabled`. Open: the trigger keeps its look.
- Widths from the grid (88 field, 184 body, 208 in a popover).
- Row-style trigger (font family): 184 x 32 row button with a 184 x 24 bordered box inside.
- Select is `variant="outlined"` by default now (it was `filled`); `variant="filled"` stays
  available and is what ComboInput looks like.

### 6.5 Dark listbox (the dropdown of Select, Autocomplete, MultiSelect, TagsInput, ComboInput)

(C26 listbox, C32; ii/select-listbox-open, ii/select-listbox-option-hover (pseudo `li::before`
inset 0 8px, #0c8ce9), cr/export-format-select-*, dt/dark-select-*--open)

- Surface `--cm-bg-menu` #1e1e1e in both themes, radius 13, `--cm-elevation-400` (page scheme),
  padding 8px 0, no border; `color-scheme: dark` inside.
- Position: OVER the trigger with the selected option exactly on top of the trigger (macOS
  style); the list starts 8px left of the trigger and is 16px wider than its longest option.
  Mantine Combobox cannot do this natively: implement with the dropdown `position` middleware
  or an offset computed from the selected option index (`offset = -(index * 24 + 8)`), clamped
  to the viewport minus 6px. When there is no selection, open below with offset 4.
- Option `role=option`: 24 tall, padding `0 32px 0 12px`: a 16 x 16 check column at x+12
  (white check 9 x 8.5, `opacity: 0` when unselected), then the label at x+32 from the list edge;
  11/16 450 0.055px `--cm-text-menu`. Optional 24 leading icon.
- Highlight: `::before` inset `0 8px`, radius 5, `--cm-bg-brand` (dark scope = #0c8ce9). The
  selected option carries the highlight until another is hovered; only one row is ever filled.
  Highlighted text stays #fff; secondary text becomes `--cm-text-onbrand-secondary`.
- Disabled option: `--cm-text-menu-disabled`, no highlight. Group label: 11/16 `--cm-text-menu-secondary`,
  same row geometry, not selectable. Separator: 1px `--cm-border-translucent` (dark scope
  #ffffff1a) with 8px above and below.
- Long lists: clamp to viewport - 6px; 24px chevron rows (5 x 3 caret) at the ends that scroll on
  hover; native scrollbar hidden.
- Keyboard: Enter / Space open with focus on the selected option; ArrowUp / Down move; Home /
  End; type-ahead; Enter commits; Escape closes without change and returns focus to the trigger.
- No animation.

### 6.6 Variable pill and bound field (NEW export `VariablePill`)

(C31; rs/apply-variable-radius-bound, rs/fill-variable-bound, ls/bind-11-bound-fill-pill-hover)

- Inside a number field the value becomes a pill: height 20, `--cm-bg`, 1px `--cm-border`,
  radius 5, padding 0 4, 11/16 450, pointer. Hover: tooltip with the name and value, and a
  16 x 16 "Detach" (broken link) ghost button at the field end.
- Bound fill row: one 156 x 24 button, 1px `--cm-border` outline, radius 5: a 14 chit + name (128
  wide); hover adds a 24 Detach button.
- Component-property chip: 156 x 24 on `--cm-bg-component-tertiary`.
- Props: `name`, `value` (for the tooltip), `onDetach`, `onClick`, `swatch` (a colour for the
  fill form).

### 6.7 Other Mantine inputs

- PasswordInput: shared field rules; visibility toggle is a 24 ghost icon button in the trailing
  slot.
- Autocomplete, MultiSelect, TagsInput, PillsInput: shared field rules; pills are Figma
  "variable pill" shaped (height 20, `--cm-bg`, 1px `--cm-border`, radius 5, padding 0 4,
  11/16); dropdown = dark listbox 6.5 (opens BELOW, offset 4, since there is no single selected
  row to align).
- FileInput, JsonInput: shared field rules.
- NativeSelect, ColorInput: NEW theme extensions here (graphty currently themes them itself; that
  app-side copy is removed by the shell package once these exist). NativeSelect = the outlined
  trigger 6.4; ColorInput = a filled field with a 14 chit at x+5 (section 7.1).

## 7. Colour

Package: colour. Theme files: `src/theme/components/color.ts` (new; the foundation's registry picks
up every `*ComponentExtensions` export in `src/theme/components/` on its own), `src/theme/css/color.css.ts`.

### 7.1 Colour chit (Mantine `ColorSwatch`, themed)

(C27; bc/chit-swatch--*, ii/select-listbox-option-hover #42 14 x 14 radius 2 at x+5)

- In a field: 14 x 14, radius 2, at x+5 y+5 of the 24 field; a half-pixel inner border
  (`inset 0 0 0 1px var(--cm-border)` drawn at 0.5 scale on `::after`); a colour with alpha
  shows a checkerboard on the right half (7 x 14). Focus: `inset 0 0 0 1px
  var(--cm-border-selected)` on `::after` (`cm-focus-double` on a standalone chit).
- In pickers and lists: 16 x 16, radius 20%, 24 pitch (8 gaps), 9 per row; light colours add
  `inset 0 0 0 2px var(--cm-border-translucent)`. Style swatch: 16 circle.
- Click opens the picker (7.3); the row that triggered it shows `--cm-bg-pressed` while open.

### 7.2 Paint row field (`CompactColorInput`)

(C28; rs/fill-opacity-default|hover|focus, bc/color-row-composite(--hover), ii/tooltip-panel-below #49-#50 and pseudo)

- ONE field 156 x 24 (184 without row icons), radius 5, `--cm-bg-secondary` with a 1px border in
  the same colour (hover: whole field border `--cm-border`; focus: `--cm-border-selected`).
- Inside: chit 14 x 14 at x+5; hex input 77 x 24 from x+24 (11px, uppercase, 450, left padding
  0 -- the text starts at x+24); a 1px seam (`::before`, `--cm-bg`, 22 tall) between hex and
  opacity; opacity part 54 x 24 (input 38 wide, padding-inline-start 7, value without "%", then a
  14 x 24 "%" suffix in `--cm-text-secondary` that is the scrub handle).
- Eye (ToggleIconButton, swap variant) and minus (ghost icon button) are 24 buttons after the
  field in the row, 4 apart -- these belong to the row (CompoundRow / caller), not the field.
- Hex: invalid silently reverts. Opacity: ArrowUp +1, Shift +10, committed immediately; scrub
  0.5 per px on the "%".
- `HEX_WIDTH` 72 / `OPACITY_WIDTH` 54 / `JOINED_RADIUS` 4 become 77 / 54 / 5; the swatch is no
  longer a separate 24 button but the chit inside the field (still a real button for keyboard
  access, named "Open colour picker"). The existing reset button stays in the trailing slot.
- Image / gradient: chit thumbnail and the word "Linear" / "Image" in place of the hex. Mixed:
  placeholder "Mixed".

### 7.3 Colour picker (NEW export `ColorPickerPanel`; used by CompactColorInput)

(C30; ii/colour-picker-solid, pm/color-picker-open, dt/dark-color-picker)

A light popover (section 8.4 shell, 240 wide, height fits) opened from the chit, docked left of
the panel. Top to bottom:

1. Header 40: pill tabs "Custom" / "Libraries" at x+8 (only "Custom" when there are no
   libraries: then a title "Colour"); "+" and Close 24 x 24 at the end; divider `inset 0 -1px 0
   var(--cm-border)`.
2. Paint-type bar 41 (padding 8, 1px bottom border): the loose segmented group (5.2) of 24 x 24
   radios 4 apart (Solid, Gradient) -- only the types the caller supports.
3. Saturation / brightness field 208 x 208 at x+16, radius 5, reticle = the 16 thumb of 7.4
   with a hidden input for keyboard access (arrows move 1%, Shift 10%).
4. Eyedropper 24 ghost button (only when `window.EyeDropper` exists) at x+16, then hue and
   opacity sliders (7.4), 172 wide.
5. Value row 24: format select "Hex" (outlined, 55 x 24: Hex / RGB / HSL / HSB) then a joined hex
   field 89 x 24 (radius `5px 0 0 5px`) and opacity 54 x 24 (`0 5px 5px 0`) with "%"; one 1px
   ring around the joined pair on focus.
6. Divider, then swatches (7.1 grid) -- the caller's swatch set (`SWATCH_COLORS_HEXA`).

Behaviour: stays open while other panel rows are clicked; Escape or Close dismisses; focus
returns to the chit; one popover at a time (8.4). Mantine's `ColorPicker` may be used for the
saturation field and sliders if its parts can be themed to these values; otherwise draw them.

### 7.4 Colour sliders (Mantine `HueSlider`, `AlphaSlider`, themed)

(C29; bc/slider-hue--*, bc/slider-opacity--*, pm/color-picker-hue-pressed)

- Hit area 180 x 24, `role=slider`. Visible track 172 x 16, radius full, 1px inset outline
  `--cm-border-translucent-strong`; hue = rainbow gradient; opacity = colour to transparent over a
  checkerboard. The track extends half a thumb past each end.
- Thumb 16 x 16 circle, 4px white border, filled with the current colour, `box-shadow: 0 0 0 1px
  rgba(0,0,0,.2), inset 0 0 0 1px rgba(0,0,0,.2)`, with a 12 x 12 under-layer carrying
  `--cm-elevation-300`.
- Hover no change; mouse-down jumps; drag live. Focus-visible: 1px ring on the thumb at -2px.
  Disabled: track `--cm-bg`, border `--cm-border-disabled`, thumb `--cm-icon-ondisabled`.
- Keyboard: arrows 1 unit, Shift 10, Home / End.

### 7.5 Gradient editor (`GradientEditor`)

(C30 gradient mode; pm/color-picker-type-gradient)

- A 208 x 24 gradient bar (radius 5, the gradient over a checkerboard) with square stop handles
  (16 x 16 squares, 2px white border, the stop colour inside, `--cm-elevation-300`); the selected
  stop is ringed `--cm-border-selected`. Dragging a handle moves the stop live; click on the bar
  adds a stop; Delete / Backspace on a focused handle removes it (respect `minStops`).
- A "Stops" header row (11/16 550 title, "+" 24 ghost button) then one 32 row per stop:
  position % field (46 wide filled), chit + hex (paint field 7.2 without opacity divider when
  `showOpacity` false), a minus 24 button.
- Direction (`showDirection`): a rotate 24 ghost button and a flip 24 ghost button beside a
  "Linear" select, as Figma; the numeric direction stays available as a number field.
- Keyboard on a handle: ArrowLeft / Right move 1%, Shift 10%.
- The existing per-stop position slider goes (section 15).

## 8. Overlays

Package: overlays. Theme files: `src/theme/components/overlays.ts`, `src/theme/styles/overlays.ts`,
`src/theme/components/feedback.ts`, `src/theme/styles/feedback.ts`, `src/theme/css/overlays.css.ts`.

### 8.1 Dark menu (Mantine `Menu`)

(C32; ii/menu-v2-item-hover, pm/main-menu-root|item-hover|disabled-item-hover|sub-view,
cr/main-menu-hover-highlight, bt/flyout-*, bc/tab-design--default #40)

| Part | Value |
|---|---|
| Surface | `--cm-bg-menu` #1e1e1e in both themes, radius 13, `--cm-elevation-400` (page scheme), no border, padding 8px 0, `color-scheme: dark` inside. Width hugs content (min 152) |
| Row (`Menu.Item`) | 24 tall, padding 0 8px, full width; the highlight is an inner pill inset 8px each side, radius 5, `padding-inline-end: 8` |
| Label | 11/16 450 0.055px `--cm-text-menu`; text starts 16px from the menu edge (32 with a check column) |
| Leading slot | 16 x 16 check column (white 9 x 8.5 check, `opacity: 0` when unchecked) and/or a 24 x 24 icon with 4px gap |
| Shortcut (`rightSection`) | right-aligned, same font, `--cm-text-menu-secondary` #ffffffb2, at least 16px after the label |
| Submenu chevron | 24 x 24 box, 3 x 5 glyph, shortcut colour |
| Divider (`Menu.Divider`) | 1px `--cm-border-translucent` (dark scope #ffffff1a) with 8px above and below: 17px between two rows |
| Label (`Menu.Label`) | same row, text `--cm-text-menu-secondary` |
| Scroll | clamp to viewport - 6px each side; 24px chevron rows at the ends that auto-scroll on hover; native scrollbar hidden |

| State | Look |
|---|---|
| hover, keyboard highlight (`data-hovered`), pressed | highlight `--cm-bg-brand` (dark scope #0c8ce9), text #fff, shortcut and chevron `--cm-text-onbrand-secondary` #ffffffcc. No separate pressed colour |
| checked (`menuitemcheckbox` / `menuitemradio`) | white check in the check column |
| submenu open | parent row stays highlighted |
| disabled | label and shortcut `--cm-text-menu-disabled` #ffffff66, no highlight on hover |
| danger (`color="red"`) | text `--cm-text-danger` (dark scope #fca397); highlight `--cm-bg-danger` |

Placement: 4px below its trigger, start-aligned (`offset: 4`, `position: "bottom-start"`);
submenus 4px beside the parent menu, first row aligned with the parent row (top = row top - 8),
flipping to the other side when there is no room. Submenus open and close with NO delay
(`openDelay: 0`, `closeDelay: 0`, Mantine `Menu.Sub`), no safe triangle.
Keyboard: Mantine's menu keyboard (ArrowUp / Down, Home / End, ArrowRight opens a submenu,
type-ahead, Escape closes the whole stack and returns focus to the trigger), `loop` true,
`transitionProps.duration` 0. Tab is ignored inside a menu (`trapFocus`).
One overlay at a time: Figma closes whatever was open when a menu opens. A menu opened by a
pointer-down outside an open Popout already closes that Popout through the Popout's
click-outside handling, and a menu opened from INSIDE a Popout (a select in a settings popover)
must NOT close it. Prove both with a test; add no coordinator unless the test shows a gap.

### 8.2 Context menu (NEW export `ContextMenu`)

(C33; pm/ctx-canvas-frame, pm/ctx-layer-row; we build the CURRENT dark-scoped look, not the
legacy #0d99ff one)

A Menu opened at the pointer: top-left 3px right of and 5px above the pointer; the first enabled
row is highlighted on open. Wrapper component: `<ContextMenu items|children target>` that listens
for `contextmenu` on its target. Unlike Figma it ALSO opens from the keyboard: Shift+F10 and the
ContextMenu key open it at the focused element's bottom-left (section 14). Escape closes and
returns focus to the element that had it.

### 8.3 Tooltip (Mantine `Tooltip`, `Tooltip.Group`, NEW export `TooltipShortcut`)

(C34; ii/tooltip-with-shortcut #63-#71, ii/tooltip-panel-below #69, cr/tip-*, cr/warm-frame-to-rectangle)

- Bubble: 24 tall for one line (40 two lines), padding 4px 8px, radius 5, `--cm-bg-tooltip`
  #1e1e1e both themes, 11/16 450 0.055px #fff, `max-width: 180px` (multiline wraps), shadow
  `--cm-elevation-300` (light column in light app: ii/tooltip-with-shortcut #63), `pointer-events:
  none`, z-index above popovers.
- Shortcut on the same line 12px after the label in `--cm-text-menu-secondary` #ffffffb2:
  `label={<TooltipShortcut label="Align left" shortcut="Alt+A" />}` ("Align left  Alt+A" =
  109 x 24).
- Arrow on (`withArrow` default true), same fill: 14 x 7 when the bubble is below, 12 x 6 above,
  6 x 12 beside. The bubble edge sits 6px from the trigger (`offset: 6`), arrow fills the gap.
- Placement: `bottom` by default, flipping above when there is no room; centred; clamped 6px
  inside the viewport.
- Timing: `openDelay: 1000`, `closeDelay: 300` in the Tooltip theme `defaultProps`; transition
  duration 0. Warm hand-off needs Mantine's `Tooltip.Group` around the whole shell, and a theme
  cannot add a provider, so: give `TooltipGroup` theme `defaultProps` of openDelay 1000 /
  closeDelay 300 (so a bare `<Tooltip.Group>` is right), document that the consumer wraps its
  shell once, and do NOT nest groups inside compact-mantine components (a nested group would
  break the shell-wide warmth). The shell package wraps the graphty app. Dismiss at once on
  pointer-down, any non-modifier key and wheel.
- Keyboard focus shows the tooltip with the same delay (`events: { hover: true, focus: true,
  touch: false }`). `aria-describedby` wiring stays (Mantine does it).
- Per-trigger delays: rail buttons 500, avatars 150, help button 0 -- via `openDelay` props at
  those call sites; inside a warm group they are immediate anyway.

### 8.4 Light popover (the `popout` family: Popout, PopoutPanel, PopoutHeader, PopoutButton, PopoutManager, PopoutRegion, PopoutAnchor, InfoCircle; Mantine `Popover` and `HoverCard`)

(C35; ii/light-popover-stroke-settings (@2x, looked at), ii/light-popover-close-hover,
ma/popover-effect-settings, ma/popover-stroke-advanced, dt/dark-effect-settings-popover)

| Part | Value |
|---|---|
| Shell | `role=dialog`, 240 wide default (216 style pickers, 304 create dialogs, 280 edit variable), `--cm-bg`, radius 13, `--cm-elevation-400`, NO border. Height fits content |
| Header | 40 tall (48 with a select), padding `0 32px 0 8px`, divider `box-shadow: inset 0 -1px 0 var(--cm-border)`. The whole header is the drag handle |
| Title | 11/16 550 `--cm-text`, padding-inline-start 8 (text at x+16) |
| Tabs in the title slot | pill tabs (5.1), NOT SegmentedControl |
| Close | 24 x 24 ghost icon button, 8px from the top and end, 10 x 10 X |
| Body | 16px from the divider to the first control and from the last to the bottom; rows 32 tall, padding 0 16; label column 64-72 (11/16 450 `--cm-text-secondary`), 8 gap, controls 24 tall from x+88..96 |

Placement: to the start side (left in LTR) of its anchor region, end edge flush with the panel's
start border (`POPOUT_GAP` 0), top aligned with the row that opened it, moved up to stay on screen.
A child popout docks flush to the start of its parent (`POPOUT_NESTED_GAP` 0; Figma: the 304
create dialog sits at x = picker.x - 304, rs/README 959).

Behaviour: ONE root popout at a time -- opening another root popout closes the open one (the
PopoutManager enforces it; a child of an open popout is the one allowed second dialog). Escape,
Close or a click outside dismisses; focus returns to the trigger. The trigger shows its open state
(`aria-expanded` -> 4.3 open look: #e5f4ff with a brand icon) while the popout is up. No open or
close animation. Draggable by the header. Opening focuses the popout (its first field when the
caller asks via `initialFocus`).

Mantine `Popover` and `HoverCard` dropdowns get the same shell (radius 13, `--cm-elevation-400`,
no border, padding 8, `--cm-bg`, no transition).

InfoCircle (no Figma counterpart; Figma explains with tooltips only): keep the component, trigger
is a 24 ghost icon button with a 12 info glyph, bubble is a light popover shell 240 wide with
body text 11/16 450 `--cm-text-secondary`.

### 8.5 Modal (Mantine `Modal`, themed)

(C36; pm/dialog-file--save-to-version-history, pm/dialog-preferences--nudge-amount,
ac/dialog-accessibility-settings, hm/comment-delete-confirm-dialog)

- Frame 480 wide default (`size`: sm 320, md 480, lg 760), `--cm-bg`, radius 13,
  `--cm-elevation-500`, centred. Overlay: none by default (`withOverlay` false), `--cm-modal-backdrop`
  when the caller asks.
- Header 40 (41 with its 1px bottom border `inset 0 -1px 0 var(--cm-border)`), padding
  `0 32px 0 16px`, title 11/16 550 at x+16, Close 24 ghost at the end.
- Body padding 16. Footer (a NEW `ModalFooter` helper or documented markup): 40 tall,
  `box-shadow: inset 0 1px 0 var(--cm-border)`, padding `0 8px 0 16px`, buttons 24 tall,
  end-aligned 8 apart: secondary Cancel then primary (disabled until valid) or danger.
- Focus moves to the first field; Tab trapped; Escape closes. No animation.

### 8.6 Toast (NEW exports `Toast`, `ToastProvider`, `useToast`; Mantine `Notification` themed for the look)

(C37; pm/toast-zoom-to-selection, pm/toast-action-copy-png, pm/toast-hovered,
dt/dark-toast-zoom-to-selection)

- Pill 40 tall, radius 13, padding 0 8, `--cm-bg-toolbar` #2c2c2c in both themes,
  `--cm-elevation-toast`, `color-scheme: dark` inside; centred horizontally, bottom 16px above
  the bottom toolbar (caller supplies the bottom offset; default 76).
- Message `role=alert`, padding 8, 11/16 550 0.055px #fff, optional 16 leading icon.
- Action button: 24 tall, transparent, 1px `rgba(255,255,255,.1)` outline, radius 5, 11/16 450,
  padding 0 8, hover #373737. Optional dismiss X in a 33px segment with a 1px start border.
- Duration: about 3 s for short messages (under 20 characters), about 6 s for longer; toasts with
  an action never auto-dismiss; hover does not pause. ONE toast: a new one replaces the text and
  restarts the timer. Instant in and out.

### 8.7 Overlay scrollbar (Mantine `ScrollArea`, themed)

(C53; pm/scrollbar-layers-*, pm/scrollbar-right-panel-*)

- `type="hover"`, `scrollHideDelay: 0`: shown only while the pointer is over the container,
  removed instantly. Scrollbar (track) 10 wide, padding 2, transparent; thumb 6 wide, the visible
  pill = thumb height - 4, radius 6, `--cm-scrollbar`. Track hover or drag adds a 1px
  `--cm-border` edge line on the track's start side; the pill does not change.
- Keyboard focus on the viewport: 1px ring at -1px and the thumb shows.

### 8.8 Loader, Progress, RingProgress (feedback)

- Loader: 16 spinner by default (`sm` 16), `--cm-icon` stroke, the Figma button spinner.
- Progress: 4px track `--cm-bg-secondary`, fill `--cm-bg-brand`, radius full.
- RingProgress: tokens only.

## 9. Chrome: sections, rows and the panel grid

Package: chrome. CSS file: `src/theme/css/chrome.css.ts`. The grid constants themselves
(`PANEL_GRID`) are the foundation's (section 9.1), because every package reads them.

### 9.1 The panel grid (`PANEL_GRID`, foundation)

(C45; rs/frame-top-panel (looked at), rs/s-al-full-panel, dt/dark-panel-autolayout (looked at))

```
| 16 pad | field 88 | 8 | field 88 | 8 | trail 24 | 8 pad |  = 240
```

| Member | Old | New | Note |
|---|---|---|---|
| WIDTH | 280 | **240** | the panel content (241 with its 1px `--cm-border-translucent` edge) |
| PAD_LEFT | 16 | 16 | |
| PAD_RIGHT | 8 | 8 | |
| CONTENT | 256 | **216** | x 16 .. 232 |
| BODY | 224 | **184** | a control spanning both fields |
| FIELD | 108 | **88** | |
| GUTTER | 8 | 8 | |
| TRAIL_GAP | 8 | 8 | |
| TRAIL | 24 | 24 | at x 208 .. 232 |
| TRIPLE | 72 | **BODY / 3 (61.33)** | segments share the width, no gaps |
| TRIPLE_GAP | 4 | **0** | |
| CONTROL_HEIGHT | 24 | 24 | |
| ROW_PITCH | 32 | 32 | single row (paint, effect, export, property) |
| TOGGLE_PITCH | 24 | **32** | checkbox row in a panel (24 in dialogs) |
| DATA_PITCH | 28 | **32** | list and tree rows: a 24 pill in a 32 row |
| SECTION_HEADER | 32 | **40** | |
| SECTION_PAD_BOTTOM | 8 | **12** | |
| GLYPH_SLOT | 16 | **24** | a field's leading slot and scrub handle |
| GLYPH | 14 | **12** | nominal drawn glyph (10-14 allowed) |
| CHEVRON | 12 | **10** | close X 10 x 10; carets are drawn 5 x 3 inside it |
| VALUE_INSET | 24 | 24 | |
| SPARKLINE_HEIGHT / HISTOGRAM_HEIGHT | 32 / 64 | 32 / 64 | |
| LABEL_COLUMN | 76 | **72** | popover label column (64-72) |
| new FIELD_ROW | -- | 48 | 16 legend + 4 + 24 control + 4 |
| new CAPTION_ROW | -- | 50 | 9/14 caption above each column + 3 + 24 |
| new LEGEND | -- | 16 | legend band height |
| new POPOVER_WIDTH | -- | 240 | light popover default |
| new POPOVER_HEADER | -- | 40 | popover and modal header |

The identity `PAD_LEFT + FIELD + GUTTER + FIELD + TRAIL_GAP + TRAIL + PAD_RIGHT === WIDTH` must
still hold (tests/constants/panel.test.ts). The panel resizes 241..500 in Figma; our rows are
fixed-width by the grid, so a wider panel just adds space at the end (a consumer concern).

### 9.2 Section header (`ControlSection`)

(C44; bc/section-title-button--default #25-#34, bc/panel-title-collapsible-stroke--*,
ii/tooltip-panel-below #25-#39, cr/empty-section-title-hover)

- Header 40 tall, `padding: 0 8px 0 16px`; title `h2` 11/32 weight 550, letter-spacing normal,
  `--cm-text`, inside a 224 x 32 hover target (4px from the top); actions 24 x 24 ghost icon
  buttons, 4 apart, at the end (x+208 for the last).
- Collapse chevron: a 16 slot in the left gutter (x 0..16), shown only where the section
  collapses (`collapsible` sections); 5 x 3 caret, `--cm-icon-secondary`.
- Empty section (`empty` / no configured values): title `--cm-text-secondary`; hovering the header
  turns title, chevron and "+" `--cm-text` over 100ms ease-out. Clicking an empty title calls
  `onAdd` when given (Figma adds an item), else expands.
- Sections are separated by a 1px `--cm-border` BELOW each section (full panel width), and end
  with 12 bottom padding. The old divider ABOVE the header goes.
- The body opens and closes in one frame (Collapse duration 0).
- `technicalName`, `info`, `hasConfiguredValues` props keep working (info = the InfoCircle
  trigger among the actions).

### 9.3 Field row with a legend (`ControlGroup`, `FieldRow`)

(C45; rs/frame-top-panel "Position", dt/dark-number-input-x--default #23 fieldset 240 x 48 padding 0 8 0 16)

- `fieldset` 240 x 48: a 16 legend band (11/16 weight 400, letter-spacing normal,
  `--cm-text-secondary`), 4 gap, 24 controls, 4 bottom. Controls on the grid (88 | 8 | 88 | 8 |
  24).
- Labelled two-column row (`FieldRow showLabels` / captions): 50 tall, 9/14 weight 500 0.27px
  `--cm-text-secondary` captions ABOVE each column, 3 gap, 24 control. The old "word beside each
  control" layout (`LABEL_COLUMN` beside) stays only for `labelPosition="inline"` (new prop,
  default `"above"`), for compatibility where a caller relies on it -- listed in section 15.
- `ControlGroup`'s title becomes the legend (11/16 400 secondary), not 10px 500 primary; its
  divider goes (groups inside a section are not divided in Figma).

### 9.4 Sub-group (`ControlSubGroup`) -- "Advanced ... settings"

Figma never folds settings away inside the panel; it opens a light popover from a 24 icon button
(C35 "Advanced settings", `AdvancedButton`). Keep `ControlSubGroup` working (compatibility) but
restyle it as a 32 row: a 16 chevron in the gutter + 11/16 450 `--cm-text-secondary` label that
turns `--cm-text` on hover over 100ms; content opens in one frame. Recommend `AdvancedButton` +
Popout in the docs.

### 9.5 Trailing slot and AdvancedButton (`TrailingSlot`, `AdvancedButton`)

The 24 slot at x 208..232. `AdvancedButton` is a 24 ghost icon button (4.3) with the settings
glyph and the open look while its popout is up.

### 9.6 Property rows (`ActionRow`, `CompoundRow`, `PanelField` row, `ToggleRow`)

(C45, C46 actions, C28 paint row)

- Single row 240 x 32, the control centred (4 above / below), padding `0 8px 0 16px`.
- `ActionRow`: trailing icon cluster, 24 buttons 4 apart. Row actions on property rows (paint,
  effect) are ALWAYS visible (Figma); hover-revealed actions (opacity 0 -> 1, 100ms ease-out) are
  the tree's (10.1) -- keep `ActionRow`'s existing reveal prop but default it to always visible
  on panels. Coarse pointers (`hover: none`) always show them.
- `CompoundRow` (paint-row-like joined readout): one field 156 x 24 (or 184), radius 5,
  `--cm-bg-secondary`, 1px `--cm-bg` seams between segments, segment text 11/16 450; the
  interactive form hovers `--cm-border` outline and focuses with the 1px ring.
- Checkbox row: 32 tall, 16 box + 8 + label (5.4 neutral).

### 9.7 Dividers

| Where | Style |
|---|---|
| between sections | 1px `--cm-border` bottom border, full panel width |
| popover / modal header, footer | `box-shadow: inset 0 -1px 0` / `inset 0 1px 0` `--cm-border` |
| panel edge against content | 1px `--cm-border-translucent` |
| toolbar | 1 x 48 (secondary bar 1 x 40) `--cm-border` |
| rail | 16 x 1 `--cm-border`, margins 8 top 7 bottom |
| dark menu | 1px `--cm-border-translucent` (dark scope) with 8 above and below |
| sticky tree row | `box-shadow: 0 1px 0 0 var(--cm-border)` |

Mantine `Divider` default colour becomes `--cm-border` (a theme extension owned by the chrome
package in its CSS: `.mantine-Divider-root` border colour).

### 9.8 Ramp, chart and prose rows (`RampRow`, `HistogramRow`, `SparklineRow`, `MetricRow`, `ProseBlock`, `RankChip`)

No Figma counterpart. Re-skin on tokens and the new grid, keep their layouts and props:
- text 11/16 450 (prose 11/16 450 `--cm-text-secondary`; the old 12px reading size becomes 11);
- bars and lines `--cm-icon-secondary` (a 3:1-ish neutral that reads on white; the old
  `PANEL_INK.BORDER` would now be #e6e6e6 and too faint), highlighted bin `--cm-bg-brand`,
  chart baseline `--cm-border`;
- chips (RankChip): height 16, radius 5, `outline: 1px solid var(--cm-border)` at -1px, 11/16 450
  `--cm-text-secondary`, transparent (the Figma "Beta" badge look, C51).

### 9.9 Resize handle (NEW export `ResizeHandle`)

(C54; ls/resize-handle-focus, ls/split-handle-keyboard-focus, rs/resize-panel-min|max)

- An 8px `role=separator` (focusable, `aria-orientation`, `aria-valuenow/min/max`,
  `aria-valuetext` "240 pixels (min)") straddling a panel edge (`edge="start" | "end" | "top" |
  "bottom"`), `cursor: ew-resize` (`e-resize` at min, `w-resize` at max for an end edge;
  `ns-resize` for a split).
- No visible hover or drag indicator. Keyboard focus draws a grip pill `::before`
  `--cm-border-selected`, radius full: 4 wide (vertical handles, full height up to 500) or 120 x 4
  (split).
- Arrow keys change the size 1px per press in the edge's direction (Shift: 10px -- ours; Figma
  steps 1 only); Home / End jump to min / max; double-click resets to `defaultValue`.
- Controlled: `value`, `min`, `max`, `defaultValue`, `onChange` (live while dragging),
  `onChangeEnd` (on release).

## 10. Tree and lists

Package: tree. CSS file: `src/theme/css/tree.css.ts`.

### 10.1 Layer tree (NEW exports `Tree`, `TreeItem`; ARIA tree)

(C46; ii/layer-row-default-*, ii/layer-row-hover (pseudo `::after` 4 8 0 12 #f5f5f5),
ii/layer-row-selected (pseudo 4 8 4 12 #e5f4ff), ii/layer-row-parent-selected (looked at),
cr/light-layer-row-parent-selected, cr/dark-layer-row-*, ls/drag-01-drop-into-frame-indicator)

Geometry:

| Part | Value |
|---|---|
| Row | 32 tall, the full panel width (240); rows scroll horizontally only if the consumer allows |
| Indent | the top-level type icon sits at x+16 (ii/layer-row-selected #33: x 73 in a panel starting at 57); each level adds 24 (x+40, x+64, ...), built from 16px spacer slots |
| Caret | 16 x 32 slot before the icon, `--cm-icon-tertiary`; drawn only while the pointer is over the tree or the row is expanded |
| Type icon | 16 x 32 slot, glyph 10-16; `--cm-icon-tertiary` for nested rows, `--cm-icon` for top-level rows; any icon becomes `--cm-icon` on a selected row; component rows `--cm-icon-component-tertiary` (purple, `--cm-text-component` when selected) |
| Name | 11 / line-height 32, 0.055px, ellipsis; weight 600 top-level, 400 nested; `--cm-text`; `tone="component"` rows `--cm-text-component` |
| Actions | 48 x 24 container, gap 4, end margin 12: the caller's ToggleIconButtons (lock, eye) with 16 glyphs; opacity 0 until the row is hovered or focused; permanently visible when the toggle is on (locked / hidden) |

States (painted by a `::after` / `::before` behind the row content, z-index -1, no transition):

| State | Pseudo, inset (t r b l) | Fill | Radius |
|---|---|---|---|
| hover | `::after` 4 8 0 12 (24 tall) | `--cm-bg-hover` | 5 |
| selected | `::after` 4 8 4 12 | `--cm-bg-selected` | 5 |
| selected + hover | unchanged | | |
| contiguous multi-selection | first 4/8/0/12, middle 0/8/0/12 (32 tall), last 0/8/4/12 | `--cm-bg-selected` | 5 5 0 0 / 0 / 0 0 5 5 (one merged block) |
| selected parent, expanded | `::after` 4 8 0 12 plus a 4px bottom band `--cm-bg-selected-secondary` | `--cm-bg-selected` | 5 5 0 0 |
| child of a selected parent | `::before` 0 8 0 0 (full 32, from the panel edge); last child 0 8 4 0 | `--cm-bg-selected-secondary` | 0; last 0 0 5 5 |
| hover on a child of a selected parent | `::after` 4 8 0 12 | `--cm-bg-selected-hover` | 5 |
| hidden (`dimmed`) | name and icon `--cm-text-tertiary` | | |
| focus-visible (ours; Figma rows are not focusable) | 1px ring on the 24 pill area (inset 4 8 4 12), `--cm-border-selected` | | 5 |
| dragging | the dragged row keeps its pill; target container: 1px `--cm-border-selected` box around the full row, no radius; insertion: a 2px `--cm-icon` line starting at the insertion depth's icon x | | |

Sticky expanded top-level row (optional `stickyRoots`): `--cm-bg`, `box-shadow: 0 1px 0 0
var(--cm-border)`.

Semantics and keyboard (OURS, WAI-ARIA APG tree view; Figma has none):
- `role=tree` (`aria-multiselectable` when multi-select), rows `role=treeitem` with `aria-level`,
  `aria-setsize`, `aria-posinset`, `aria-expanded` (parents), `aria-selected`. One Tab stop,
  roving `tabindex`.
- ArrowDown / ArrowUp move focus; ArrowRight expands a closed parent, else moves to the first
  child; ArrowLeft collapses an open parent, else moves to the parent; Home / End; type-ahead;
  Enter or Space selects (Shift extends a range, Control/Meta toggles); `*` expands siblings;
  F2 renames (10.3); Alt+L collapses all (Figma's shortcut).
- Pointer: click selects; Shift+click range; Control/Meta+click toggles; the caret toggles one
  row; double-click renames. Row lock / eye toggles fire on pointer DOWN.
- Drop zones inside a target row: top quarter = before it, middle half = into it (box only),
  bottom quarter = its first child (when expanded) or after it. Reordering is reported through
  `onMove({ id, parentId, index })`; the tree does not move data itself.
- Virtualization: use `@tanstack/react-virtual` (already a dependency) above ~200 visible rows.
- Data API: `items` as a flat or nested structure of `{ id, name, icon, children, tone, dimmed,
  actions }`, controlled `selected`, `expanded`, with `onSelect`, `onExpandedChange`, `onRename`,
  `onMove`. Keep it minimal; the tree renders, the caller owns state.

### 10.2 Page row / list (NEW exports `PageList`, `PageRow`)

(C47; bc/page-row--default|hover|focus #33-#41, ls/scratch-pages-*)

- Wrapper 240 x 32 (padding 4 8) around a 224 x 24 button, radius 5, text at x+16, 11 / line
  24.
- Default `--cm-bg`, weight 400; hover `--cm-bg-hover`; current (`aria-current="page"`)
  `--cm-bg-secondary` AND weight 550 (no blue); hover on current unchanged.
- Divider row: the same row holding a 208 x 1 `--cm-border` line with 8px margins.
- Keyboard: Figma's own model is accessible, so keep it: a one-column `grid` with one Tab stop; ArrowUp / Down move focus without switching;
  Enter / Space / click switches. Focus ring: 1px `--cm-border-selected` on the whole 240 x 32
  wrapper, radius 5, offset 0.
- The same row, with `--cm-bg-selected` and weight 600 for a selected GROUP, is the variables
  collection list (`tone="group"`).

### 10.3 Inline rename (NEW export `InlineRename`)

(C24 inline rename; ls/scratch-layers-rename-field, ls/scratch-pages-rename-field)

Replaces a name in place: 24 tall (layer: 176 wide from name x - 8; page: 224), `--cm-bg` (#fff /
#2c2c2c), 1px `--cm-border-selected` border, radius 5, padding-inline-start 7, 11/16 450; the
whole name pre-selected on mount. Enter commits, Escape cancels, blur commits; focus then returns
to the row it came from (ours; Figma returns to its canvas). Built on Mantine `TextInput` with its
own classNames (no new theme variant needed in the inputs package).

### 10.4 Find result row (NEW export `ResultRow`)

(C48; ls/scratch-find-results)

240 x 52 (34 for one line), padding `8 8 8 16`, 16 icon, name 11/16 400 with the matched
substring weight 600, parent path 10/16 `--cm-text-secondary`; current result `--cm-bg-selected`
with a 1px border in the same colour; hover `--cm-bg-hover`. `role=option` inside a listbox driven
from a SearchInput (focus stays in the input, `aria-activedescendant` -- ours, Figma has none).

### 10.5 DataRow, DataRowHeader, RankChip (existing)

DataRow becomes the Figma list row: 32 tall (`DATA_PITCH`), content in a 24 pill inset 4 8 4 12
(hover `--cm-bg-hover`, selected `--cm-bg-selected`, radius 5), name 11 / line-height 32 450
`--cm-text` (the old 12px reading size goes), secondary values `--cm-text-secondary`
right-aligned, actions as ActionRow. DataRowHeader: 32 tall, 11/16 550 `--cm-text-secondary`
column labels, sort caret 5 x 3. RankChip: section 9.8.

### 10.6 DataTable (existing; the Variables spreadsheet conventions)

(C56; ls/vars-04-table-two-modes, ls/vars-07-row-selected, ls/vars-14-number-cell-focus)

- Grid lines: every cell draws `outline: 1px solid var(--cm-border)` (lines overlap instead of
  doubling); no outer `PANEL_INK.BORDER` border.
- Header row 40, text 11/16 600 `--cm-text`; data rows 40; cell padding 0 16 (name column) /
  0 8; cell text 11/16 450.
- Row hover: no tint. Selected row: every cell `--cm-bg-selected`. Active (keyboard) cell: a 1px
  `--cm-border-selected` box drawn inset by `::before` (278 x 38 in a 280 x 40 cell); the cell's
  own input shows no outline.
- Sort indicator: 5 x 3 caret after the header label. Keyboard model unchanged (the existing
  grid navigation in `navigation.ts` / `selection.ts` stays).

## 11. Editor shell

Package: shell (runs LAST; it also owns `src/index.ts`, `src/types/index.ts`, the exports test,
the i18n strings, the docs pages and the graphty integration). Theme files:
`src/theme/components/display.ts`, `src/theme/styles/display.ts`, `src/theme/css/shell.css.ts`.

### 11.1 Floating toolbar (NEW export `Toolbar`)

(C40; bt/toolbar-default, hidpi-2x-captures/04-bottom-toolbar)

- `role=toolbar` (with `aria-label`), height 48, padding 8, gap 8 between groups, `--cm-bg`,
  radius 13, `--cm-elevation-200`, no border. Width hugs content (529 in Figma's design mode).
- `Toolbar.Divider`: 1 x 48 `--cm-border`, full height (negative block margin 8).
- Position is the caller's (Figma centres it on the window, bottom 12). Export a `floating`
  prop that applies `position: fixed; bottom: 12px; left: 50%; transform: translateX(-50%)`.
- Keyboard: one Tab stop, roving focus starting on the selected tool; ArrowLeft / Right move
  through tools, chevrons and the mode radios; Home / End.

### 11.2 Tool button, tool group and flyout (NEW exports `ToolButton`, `ToolGroup`)

(C41; bc/tool-move--*, bc/tool-rectangle--*, bc/tool-chevron--hover #31-#36, bt/flyout-*,
bt/chevron-open-*)

| Part | Value |
|---|---|
| ToolButton | 32 x 32, padding 4, radius 5, 24 icon box (glyph 15-18), `aria-pressed` |
| Chevron | 16 x 32, padding 4 0, radius 5, 24 svg box with a 5 x 3 caret, 1px after its tool |
| Group | tool + chevron = 49 x 32 (`role=group`, gap 1); groups 8 apart; the group face is the LAST tool picked from its flyout |

| State | Tool | Chevron |
|---|---|---|
| default | transparent, `--cm-icon` | transparent |
| hover | `--cm-bg-hover` (each half its own) | `--cm-bg-hover` |
| pressed | `--cm-bg-hover` | `--cm-bg-pressed` |
| selected (`aria-pressed=true`) | `--cm-bg-brand`, white icon | stays transparent |
| open (flyout up) | | `--cm-bg-pressed` |
| focus-visible | 1px ring at -1px; on the selected tool `cm-focus-double` | ring at -1px |

Flyout: the dark menu (8.1) opened ABOVE the chevron (bottom 4px above it, start-aligned to the
chevron), rows `menuitemradio` with the 16 check at x+12 on the current face, a 24 white icon,
label from x+60, shortcut 16 after the longest label. Picking a row selects the tool, makes it the
group face and closes. Tooltips ABOVE the toolbar ("Frame  F"; chevron "Region tools").
The mode switch at the toolbar end is `SegmentedControl variant="toolbar"` (5.3).

### 11.3 Contextual secondary bar (NEW export `SecondaryToolbar`)

(C42; bt/secondary-vector-bar, bt/secondary-image-bar)

A second bar 8px above the main one: 40 tall, padding 8 (0 for a crop-style bar), gap 8, radius
13, `--cm-elevation-200`, `--cm-bg`, 1 x 40 dividers. Items 24 tall: icon buttons or labelled
buttons (24 icon + 11/16 400 label, padding-inline-end 8); selected `--cm-bg-brand` with white
content; hover `--cm-bg-hover`; a "More" dropdown button turns `--cm-bg-selected` with brand text
while open. Optional hint banner under it: `--cm-bg-info`, 13/22 500 `--cm-text-brand`, radius
`13px 13px 0 0`.

### 11.4 Navigation rail (NEW exports `NavRail`, `RailButton`)

(C43; ls/rail-*, ls/rail-focus-ring-*, ii/menu-v2-item-hover #28-#51, hidpi-2x-captures/03-navigation-bar)

- Rail 56 wide + 1px `--cm-border` end border, padding 8 top / 16 bottom, `role=toolbar`
  vertical. `NavRail.Separator`: 16 x 1 `--cm-border`, margins 8 top 7 bottom.
- RailButton 56 x 56, column, padding 4 0, gap 2: a 32 x 32 icon pill (radius 5, 24 svg) above a
  40 x 14 label (9/14 450 0.045px `--cm-text`, clipped, no ellipsis).
- Hover and pressed: pill `--cm-bg-hover`. Active (`aria-expanded=true` or `active`): pill
  `--cm-bg-selected`, icon `--cm-icon-brand`; the label does not change; no side indicator.
- Focus: ring on the pill, offset 0 (inside -1px on the active pill).
- Tooltip to the END side with a 6 x 12 arrow, 500ms delay, shortcut shown; none on the active
  button.
- Keyboard: one Tab stop; ArrowUp / Down / Home / End; Enter or Space activates (the consumer
  moves focus into the opened panel).
- A footer 32 x 32 icon button may carry a notification dot (11.6).

### 11.5 Floating help button (NEW export `HelpButton`)

(C15; bc/help-button--default #24)

32 x 32 circle (radius 100%), `--cm-bg`, 1px transparent border, `--cm-elevation-200`, icon
`--cm-icon`; no hover change; focus ring 1px at -2px fading in over 200ms ease-out; its tooltip
shows and hides immediately (`openDelay` 0). Opens a dark Menu (the caller's items).

### 11.6 Badges and dots (Mantine `Badge`, `Indicator`, themed)

(C51; bt/mode-metronome-full, ls/rail-library-updates-hover)

- Badge default (`variant="outline"` look, "Beta"): height 16, padding 0 4, radius 5, transparent,
  `outline: 1px solid var(--cm-border)` at -1px, 11/16 450 `--cm-text`. Inside a dark menu the
  outline is #383838 (dark scope `--cm-border-menu`) and the text `--cm-text-menu-secondary`.
- `variant="filled"`: `--cm-bg-brand`, white text; `variant="light"`: `--cm-bg-selected`,
  `--cm-text-brand`.
- Indicator (notification dot): 5 x 5 `--cm-bg-brand` with a 2px `--cm-bg` border (9 x 9),
  radius 100%, top-end of the icon.
- Count ("+2"): 11/16 `--cm-text-secondary` in a 24 x 24 slot (plain Text).

### 11.7 Avatar and avatar stack (Mantine `Avatar`, `Avatar.Group`, themed)

(C52; hm/header-right-default, hidpi-2x-captures/06-right-panel-header)

- Avatar 24 x 24 (sm), radius 100%, initial 12/24 400 white on the user's colour (`color` prop /
  `bg`); in a stack each avatar has a 2px `--cm-bg` ring (28 including the ring) and steps 21px
  (overlap 3). `Avatar.Group` spacing -3 (plus the ring).
- Avatar buttons: focus ring 1px `--cm-border-strong` at -3px. Tooltip / hover card after 150ms.
- Stack fade-in: 150ms opacity when an avatar is added (the one animation here).

### 11.8 Key caps and the keyboard shortcuts sheet (Mantine `Kbd`, themed; NEW export `ShortcutSheet`)

(C39; pm/keyboard-shortcuts-panel, ma/keyboard-shortcuts-essential)

- Kbd (key cap): 1px solid #ffffffb2 border, radius 2, bg #1e1e1e, text 14/24 400 #ffffffb2;
  "Ctrl" 33 x 31 (padding 1px 4px 0), single characters 32 x 31; caps 3px apart. Highlighted
  (`data-active`): bg and border #80caff, text #1e1e1e. The key cap is DARK in both themes (it
  only appears on the dark sheet in Figma). A light inline variant for prose (`variant="inline"`):
  11/16, 1px `--cm-border`, radius 2, padding 0 4, `--cm-text-secondary`.
- ShortcutSheet: docked full-width at the bottom (caller positions it), `--cm-bg-menu` #1e1e1e in
  both themes (dark adds a 1px #444 top border), `color-scheme: dark`. Tab strip 38 tall:
  `role=tab` buttons padding 0 16, 12/38 400; selected #fff, others #ffffffb2; the filler before
  the active tab has radius `0 0 2px 0` (folder-tab look). Close 38 x 39 with a 12 X at #ffffff66.
  Body lists shortcut groups: 12/16 400 labels #fff, caps as above.
- Keyboard: focus is not moved in on open; arrows move and select tabs (automatic activation);
  Escape DOES close it (ours; Figma's does not).

### 11.9 Quick actions palette (NEW export `QuickActions`)

(C38; pm/quick-actions-open, pm/quick-actions-search-align, bt/actions-panel-*, ac/quick-actions-*)

- Panel 529 x 354 (width prop), `--cm-bg`, radius 13, `--cm-elevation-200`; the caller positions
  it (Figma: bottom 8 above the toolbar, start-aligned with it). We add `role=dialog` with a name
  (ours; Figma has none).
- Search field 513 x 32 at 8 inset: SearchInput `size="lg"` (13/24).
- Scope pill tabs (5.1) optional.
- Section headers 11/16 450 `--cm-text-secondary`, inset 16.
- Rows 513 x 32, padding 0 4, radius 5; 32 x 32 icon slot; label 13/24 400 (`--cm-text`; disabled
  `--cm-text-disabled`); shortcut 11/24 `--cm-text-tertiary` right-aligned. Highlighted row
  `--cm-bg-hover`; the first row is highlighted on open.
- Keyboard: typing filters live (the caller filters, or a default substring match); ArrowUp /
  Down move the highlight while focus stays in the input, exposed with `aria-activedescendant`
  on a `role=combobox` input + `role=listbox` rows (ours); Enter runs; Escape closes.

### 11.10 Text, ThemeIcon, Pill (display, themed)

Text: sizes from 2.3. ThemeIcon: 24 box, radius 5, `variant="light"` = `--cm-bg-selected` with a
brand glyph. Pill: the variable-pill shape (6.7).

### 11.11 Cards, canvas overlays

Cards and tiles (C55) and canvas overlays (C50: selection handles, size badges, marquee) are not
built: graphty draws its canvas with graphty-element, and no compact-mantine consumer needs a
library card yet. Add them when a panel needs one.

## 12. Every existing export, and where it lands

| Export | Kind | Package | What changes |
|---|---|---|---|
| `compactTheme`, `compactThemeOverride` | theme | foundation | Figma defaults; now built by `createCompactTheme()` |
| `compactColors`, `compactDarkColors` | theme | foundation | neutral dark ramp, `brand` palette added |
| `CompactColorInput` | component | colour | paint row field 7.2 + picker 7.3 |
| `ControlGroup` | component | chrome | legend row 9.3 |
| `ControlSection` | component | chrome | section header 9.2 |
| `ControlSubGroup` | component | chrome | 9.4 |
| `DataTable` | component | tree | 10.6 |
| `GradientEditor` | component | colour | 7.5 |
| `InfoCircle` | component | overlays | 8.4 |
| `Popout`, `PopoutButton`, `PopoutManager`, `PopoutRegion`, `usePopoutManager`, `usePopoutRegion` | components | overlays | light popover 8.4, one at a time |
| `StyleNumberInput` | component | inputs | 6.1 |
| `StyleSelect` | component | inputs | 6.4 |
| `ToggleWithContent` | component | selection | 5.10 |
| `ActionRow`, `CompoundRow` | rows | chrome | 9.6 |
| `AdvancedButton`, `TrailingSlot` | rows | chrome | 9.5 |
| `DataRow`, `DataRowHeader`, `RankChip` | rows | tree (RankChip look per 9.8) | 10.5 |
| `FieldRow` | row | chrome | 9.3 |
| `HistogramRow`, `MetricRow`, `SparklineRow`, `RampRow`, `ProseBlock` | rows | chrome | 9.8 |
| `IconGroupRow` | row | selection | 5.2 |
| `PanelField` | row | inputs | 6.1 / 6.2 / 6.4 |
| `ToggleRow`, `ToggleRowGroup` | rows | selection | 5.10 |
| `FieldGlyph`, `UiGlyph`, `FIELD_GLYPH_NAMES`, `FIELD_LETTERS`, `UI_GLYPH_NAMES`, guards | icons | foundation | redrawn at Figma weights (1px strokes on a 24 box, 12 nominal); new glyphs added (see 13) |
| i18n exports (`defaultLabels`, `LabelsProvider`, formatters) | i18n | shell | new strings folded in |
| `PanelLabelsProvider`, `usePanelLabels` | context | chrome | unchanged |
| `useActualColorScheme`, `useDirection`, `isRtl` | hooks | foundation | unchanged |
| `COMPACT_SIZING`, `MANTINE_SPACING` | constants | foundation | FONT_SIZE 11, HEIGHT 24 unchanged; SECTION_GAP 4 |
| `PANEL_GRID`, `PANEL_INK` | constants | foundation | 9.1, 2.2 |
| `POPOUT_GAP`, `POPOUT_NESTED_GAP`, `POPOUT_Z_INDEX_BASE` | constants | overlays | gaps 0 / 0 |
| `DEFAULT_GRADIENT_STOP_COLOR`, `SWATCH_COLORS_HEXA` | constants | colour | unchanged unless the picker needs 9 per row |
| colour utils (`createColorStop`, `isValidHex`, ...) | utils | colour | unchanged |
| `getActivationMeta` | util | foundation | unchanged |
| all types | types | shell (`src/types/index.ts`) | new types added |

Mantine components themed today, and their package: ActionIcon, Button, CloseButton (buttons);
Checkbox, Radio, RangeSlider, SegmentedControl, Slider, Switch, Anchor, Burger, NavLink,
Pagination, Stepper, Tabs (selection); Autocomplete, FileInput, InputClearButton, JsonInput,
MultiSelect, NumberInput, PasswordInput, PillsInput, Select, TagsInput, Textarea, TextInput + new
NativeSelect, ColorInput (inputs); HoverCard, Menu, Popover, Tooltip, Loader, Progress,
RingProgress + new Modal, Notification, ScrollArea, TooltipGroup (overlays); Avatar, Badge,
Indicator, Kbd, Pill, Text, ThemeIcon (shell); new ColorSwatch, HueSlider, AlphaSlider,
ColorPicker (colour).

## 13. Foundation deliverables (what every package can rely on)

- `src/theme/tokens.ts`: the token table (2.1, 2.6, 2.8), AA deltas (2.9), type scale (2.3),
  spacing (2.4), radii (2.5), `CM_FONT_FAMILY`.
- `src/theme/colors.ts`: neutral `dark` ramp, `brand` palette (3.3).
- `src/theme/index.ts`: `createCompactTheme`, `compactThemeOverride`, `compactTheme`, theme
  fields (3.3), `focusRing: "never"`, resolver wrapping for style injection, `other.compact`.
- `src/theme/global-styles.ts`: `compactGlobalCss`, `ensureCompactStyles`, the glob aggregator.
- `src/theme/css/00-foundation.css.ts`: `@font-face`, `:root` tokens, the AA block, body type,
  `::selection`, and the SHARED primitive classes several packages use, so no package waits on
  another:
  - `cm-focus-*` (2.7);
  - `cm-dark-surface` (a wrapper that sets `color-scheme: dark`);
  - `cm-visually-hidden`;
  - `cm-field` (the filled field of section 6: 24 tall, `--cm-bg-secondary`, radius 5,
    transparent outline slot at -1px, hover `--cm-border`, `:focus-within`
    `--cm-border-selected`, `[data-disabled]`, `[data-error]`, the AA `--cm-field-edge`) and
    `cm-field-outlined`;
  - `cm-menu-surface` (dark surface, radius 13, `--cm-elevation-400` from the page scheme,
    padding 8px 0, inner `color-scheme: dark`) and `cm-menu-row` (24 tall row, 11/16 450,
    `::before` highlight inset 0 8px radius 5 on `[data-hovered]`, `[data-combobox-selected]`,
    `[aria-selected="true"]` and `:hover`; disabled rule; the 16 check column), used by the
    overlays package's Menu and the inputs package's listbox;
  - `cm-popover-surface` (`--cm-bg`, radius 13, `--cm-elevation-400`, no border), used by
    Popout, Popover, HoverCard, the colour picker.
- `src/theme/components/index.ts`: collects every `*ComponentExtensions` export of the files in
  its folder with `import.meta.glob("./*.ts", { eager: true })`, so a package adds a theme file
  (the colour package's new `color.ts`) without touching the registry.
- `src/fonts/inter-latin-wght-normal.woff2` and `src/fonts/LICENSE-Inter.txt` (from
  `@fontsource-variable/inter`, SIL OFL 1.1), copied to `dist/fonts/LICENSE-Inter.txt` by the
  build; a `*.woff2` module declaration so TypeScript accepts the import.
- `src/constants/panel.ts`: `PANEL_GRID` (9.1), `PANEL_INK` (2.2); `src/constants/spacing.ts`.
- `src/icons/index.tsx`: glyphs every package needs, drawn by us (not Figma's): `caretDown`,
  `caretRight` (5 x 3 visible), `check` (9 x 8.5), `dash` (8 x 2), `close` (10 x 10), `plus`,
  `minus`, `eye`, `eyeClosed`, `lock`, `unlock`, `search`, `settings`, `link`, `unlink`
  (detach), `eyedropper`, `rotate`, `flipHorizontal`, `flipVertical`, `alignLeft`,
  `alignCenterH`, `alignRight`, `alignTop`, `alignCenterV`, `alignBottom`, `more` (three dots),
  `help`, `frame`, `rectangle`, `ellipse`, `text`, `component`, `group`; existing names keep
  working. A package that needs a glyph not in this list draws it inline in its own file and
  reports it; the shell package may fold such glyphs into the register.
- The harness: `.storybook/preview.tsx` gains a "Contrast" toolbar (Figma / AA) that renders with
  `createCompactTheme({ highContrast })`; `tests/setup.ts` and `tests/setup.browser.ts` inject
  the stylesheet; `tests/figma/harness.tsx` exports `renderFigma(ui, { scheme, highContrast })`
  (MantineProvider + forced scheme), `computed(el, pseudo?)`, `hex(color)` (normalises
  `rgb()/rgba()` to 8-digit hex), and `expectBox(el, { w, h })`, so every package's browser tests
  compare against this spec the same way.
- Cross-cutting regression suites that pin the OLD values (`tests/theme/css-baseline-regression`,
  `css-variables-regression`, `css-baseline-verification`, `css-computed-styles.browser`,
  `compact-css-regression`, `tokens`, `colors`, `theme`, `api`, `focus-ring*`, `light-dark-mode`,
  `migration`, `css-tokens.browser`): the foundation updates the token-level assertions to this
  spec and DELETES per-component assertions from them (each package's own suites and its
  `tests/figma/<package>.browser.test.tsx` replace them), so no package breaks a file it does not
  own.

## 14. Deliberate departures from exact Figma (kept or added on purpose)

These are the places the result will NOT match Figma, and why. Everything else matches.

| Where | Figma | Ours | Why |
|---|---|---|---|
| Tooltips | hidden from assistive technology | `aria-describedby` kept | owner decision; WCAG 4.1.2 |
| Layer tree | no roles, no keyboard | ARIA tree, roving focus, arrows, F2 rename, focus ring on rows | owner decision |
| Tree rows, find results, quick actions | not focusable / no `aria-activedescendant` | focusable, announced | same reason |
| Context menu | right-click only | also Shift+F10 and the ContextMenu key | flows.md section 9 "do not copy" |
| Shortcuts sheet | Escape does not close it | Escape closes it | flows.md section 9 |
| Quick actions | no dialog role | `role=dialog` + combobox / listbox | screen reader users need a name and a model |
| Enter in a number / text field, rename commit | returns focus to the canvas | keeps focus in the field (rename: returns to the row) | we have no canvas focus target; losing focus to `body` would be worse |
| Resize handle | 1px per arrow only | 1px, Shift 10px, Home / End | additional keys, nothing removed |
| Alignment matrix | radios | radios with 2D arrow movement | a 3x3 grid read left-to-right is otherwise hard to operate |
| Existing props | -- | every existing component and prop keeps working | owner decision; restyles land inside |
| `InfoCircle` | no equivalent (tooltips only) | kept, restyled as a light popover | existing export; graphty uses it |
| `ControlSubGroup` in-panel foldaway | never (always a popover) | kept, restyled | existing export |
| `StyleNumberInput` / `StyleSelect` / `CompactColorInput` reset button | none | kept in the trailing slot | existing prop and graphty behaviour |
| `RampRow`, chart rows, `ProseBlock`, `RankChip`, `DataTable` extras | no equivalent | kept, restyled on tokens | existing exports |
| Nested popouts | only the create-style dialog docks to the left | a child popout docks flush to its parent | existing API; root popouts are one-at-a-time as Figma |
| Checkbox default | neutral in the panel, blue in dialogs | Mantine `Checkbox` defaults to blue; `ToggleRow` uses neutral | a bare Mantine Checkbox reads as a dialog checkbox |
| `highContrast` option | -- | section 2.9 | owner decision; off by default |

## 15. Breaking changes for the release notes (0.x)

1. Panel grid: `PANEL_GRID.WIDTH` 280 -> 240, `FIELD` 108 -> 88, `CONTENT`, `BODY`, `TRIPLE`,
   `TRIPLE_GAP`, `TOGGLE_PITCH`, `DATA_PITCH`, `SECTION_HEADER`, `SECTION_PAD_BOTTOM`,
   `GLYPH_SLOT`, `GLYPH`, `CHEVRON`, `LABEL_COLUMN` change value (9.1). Code that hard-codes a
   280 panel around these rows must follow `PANEL_GRID.WIDTH`.
2. `PANEL_INK.SELECTED` / `ON_SELECTED` now mean Figma's selected item (#e5f4ff, brand glyph),
   not an inverted solid patch; every `PANEL_INK` value now resolves to a `--cm-*` token.
3. Theme scale values: `spacing.sm` 6 -> 8; `radius.sm/md` 4/6 -> 5, `lg/xl` 8/12 -> 13;
   `fontSizes.xs` 10 -> 9, `lg` 14 -> 15, `xl` 16 -> 24; `lineHeights` now px; shadows replaced.
4. `colors.dark` is a neutral ramp; `primaryColor` is the new `brand` palette. Components that
   passed `color="blue"` expecting the primary colour get Mantine blue, not the accent.
5. `focusRing` is `"never"`; the ring is ours (1px). A consumer's own `focusRing` override no
   longer controls compact-mantine components.
6. Overlays have no transitions; Tooltip opens after 1000 ms (was immediate).
7. `Select` defaults to `variant="outlined"`; its dropdown is the dark listbox opening over the
   trigger. `Tabs` default `variant="pills"`.
8. ActionIcon `variant="light"` no longer draws the 1px accent border the old theme added for a
   3:1 state boundary (the Figma "highlighted" look replaces it). The brand glyph on
   `--cm-bg-selected` carries the state; the AA option does not add the border back.
9. `CompactColorInput`: the swatch becomes the 14px chit inside one 156 field; `HEX_WIDTH` 77,
   `JOINED_RADIUS` 5. `GradientEditor`: per-stop position sliders replaced by the gradient bar and
   stop rows.
10. `ControlSection` draws its divider below, header 40; `ControlGroup` title is the legend
    style; `FieldRow` puts captions above by default (`labelPosition="inline"` restores beside).
11. `DataRow` is 32 tall with 11px names (was 28 / 12px). `DataTable` draws a cell grid.
12. `POPOUT_GAP` 8 -> 0, `POPOUT_NESTED_GAP` 4 -> 0; opening a root popout closes the open one.
13. The body font becomes Inter Variable 11/16 450 wherever the stylesheet is injected.
14. `IconGroupRow` loses its inverted selected tile (Figma white face with an inset edge).

## 16. How each package proves it matches

- One Storybook story per component named `States` that renders every state from its table
  side by side (hover and pressed via a `data-state` / forced class hook, since pseudo classes
  cannot be forced), in whatever theme the toolbar selects; Chromatic already captures light and
  dark.
- A browser test `tests/figma/<package>.browser.test.tsx` that renders each component with the
  harness in light and dark (and AA where the component reads an AA token) and asserts, for each
  state in this file: box width / height, padding, radius, background, text colour, font size /
  weight / line-height / letter-spacing, border / outline / box-shadow, using `hex()` so
  translucent colours compare exactly. Hover and pressed are driven with Playwright pointer
  actions through `@vitest/browser`'s `userEvent`.
- Visual check against the Figma PNG of the same state (the study's `@2x` captures) for anything
  a computed style cannot show (glyph drawing, pseudo elements): screenshot the story, crop, and
  compare side by side by eye; do not trust an image model's yes / no.

## 17. Work packages

The work is split into a foundation and eight packages. No two of them edit the same file. The
exact file lists are in the plan the orchestrator holds; in short:

| Order | Package | Sections | Owns (besides its own new folders `src/components/<key>/`, `stories/figma/<key>/`, `tests/components/<key>/`, `tests/figma/<key>.browser.test.tsx`, `src/theme/css/<key>.css.ts`) |
|---|---|---|---|
| 1 | foundation | 2, 3, 9.1, 13 | theme assembly, tokens, colours, fonts, global stylesheet, `PANEL_GRID` / `PANEL_INK`, icons, harness, Storybook preview, cross-cutting token tests |
| 2 (parallel) | buttons | 4 (not 4.2) | `theme/components/buttons.ts`, `theme/styles/buttons.ts` |
| 2 | selection | 4.2, 5 | `theme/components/controls.ts` + `navigation.ts` and their styles; IconGroupRow, ToggleRow, ToggleWithContent |
| 2 | inputs | 6 | `theme/components/inputs.ts` + styles; PanelField, StyleNumberInput, StyleSelect |
| 2 | colour | 7 | `theme/components/color.ts` (new); CompactColorInput, GradientEditor, colour constants and utils |
| 2 | overlays | 8 | `theme/components/overlays.ts` + `feedback.ts` and their styles; the popout family, InfoCircle, `constants/popout.ts` |
| 2 | chrome | 9 (not 9.1) | ControlSection, ControlGroup, ControlSubGroup, FieldRow, TrailingSlot, ActionRow, CompoundRow, RampRow, ChartRow, ProseBlock |
| 2 | tree | 10 | DataRow, DataTable, the new tree components |
| 3 | shell | 11, 12, 15 | `theme/components/display.ts` + styles; `src/index.ts`, `src/types/index.ts`, rows barrel, i18n, README, docs pages, exports test; graphty integration |

Rules for every package: never edit `src/index.ts` or `src/types/index.ts` (report new exports
instead); never import another package's NEW component or class; strings as English prop
defaults; glyphs missing from the register drawn inline and reported.
