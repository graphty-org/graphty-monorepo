# Graphty mockup vocabulary

Exact values for every artboard. Sources, in priority order: `graphty/src/theme.ts`
(dark palette, compact sizes), the existing shell and sidebar controls in
`graphty/src/components/`, Mantine 8 dark defaults, the app-shell spec section 5,
and `design/designloom/tokens/default-theme.yaml`. Anything the app does not
define is marked **chosen**.

Rules that override everything below: inline styles only, inline stroke SVG
icons only, plain ASCII, real copy from the cat social network dataset
(`cat-social-network.json`, 20 nodes, 29 edges).

## 1. Colors

theme.ts dark palette (index: value):

| dark[] | hex | Mantine dark-mode role |
|---|---|---|
| 0 | `#d5d7da` | text (`--mantine-color-text`) |
| 1 | `#a3a8b1` | secondary body text |
| 2 | `#7a828e` | dimmed (`--mantine-color-dimmed`) |
| 3 | `#5f6873` | disabled text, placeholder |
| 4 | `#48525c` | default border (`--mantine-color-default-border`) |
| 5 | `#374047` | default hover (`--mantine-color-default-hover`) |
| 6 | `#2a3035` | default surface, input background (`--mantine-color-default`) |
| 7 | `#1f2428` | body (`--mantine-color-body`) |
| 8 | `#161b22` | deep background |
| 9 | `#0d1117` | deepest |

### Backgrounds

| Token | Value | Where |
|---|---|---|
| app / canvas background | `#161b22` | root artboard background and the graph canvas (dark[8]; artboard brief root). **chosen** for canvas: the current app paints the canvas with body `#1f2428`; the skeleton uses `#161b22` so panels read as raised surfaces |
| panel background | `#1f2428` | rail, activity panel, inspector, top bar, status bar, cards' parent (Mantine body; LeftSidebar/RightSidebar/TopMenuBar use `--mantine-color-body`) |
| input background | `#2a3035` | compact TextInput, NumberInput, Select, search pill, tab row track (theme.ts `--input-bg: var(--mantine-color-default)`) |
| raised surface | `#374047` | RightSidebar header, unselected layer rows, control hover (dark[5]) |
| row hover | `#2a3035` | list rows, algorithm cards, rail items on hover. **chosen** (dark[6] on a `#1f2428` panel) |
| control hover | `#374047` | icon buttons, subtle buttons, inputs on hover (dark[5]) |
| selected row | `#28364e` | selected list row / active tab / active rail item background. **chosen**: accent at 20% over `#1f2428`. Pair with a 1px `#4a7ee8` border when the row is a card; the existing LeftSidebar uses Mantine `blue-9` bg + `blue-7` border for this |
| highlight flash | `#4a7ee8` 1px border + `#28364e` bg | the 2-second highlight after an Insights card click |
| card background | `#2a3035` | algorithm cards, insight cards, result cards. **chosen** |
| card border | `#374047` | 1px. **chosen** |
| overlay scrim | `rgba(13, 17, 23, 0.6)` | behind Settings overlay and command palette. **chosen** (dark[9] at 60%) |
| tooltip / popover background | `#2a3035` | with 1px `#48525c` border. **chosen** (Mantine dark tooltip is `dark-4` filled; this keeps contrast with the text) |
| kbd chip background | `#374047` | keyboard shortcut chips (Cmd K). **chosen** |

### Text

| Token | Value |
|---|---|
| text primary | `#d5d7da` |
| text secondary (body copy in cards, readings) | `#a3a8b1` |
| text dimmed (labels, section sub-headers, status bar, technical names) | `#7a828e` |
| text disabled / placeholder | `#5f6873` |
| text on accent | `#ffffff` |
| link | `#5b8ff9`, hover `#75a5f9` (artboard brief) |

### Accent

theme.ts does not override Mantine `blue`, so per the brief the accent is the
designloom primary:

| Token | Value |
|---|---|
| accent (primary button, checked checkbox, switch on, active rail bar, focus ring, selected borders) | `#4a7ee8` |
| accent hover | `#5b8ff9` |
| accent pressed | `#3a6dd7` |
| accent tint (selected bg) | `#28364e` **chosen** |
| accent 40% tint for progress track fills / badges | `#2a5cc6` |

For reference only: the running app currently renders Mantine's default blue
(`blue-5 #339af0`, filled buttons `blue-8 #1971c2` in dark mode). Do not use
those in the mockups; use `#4a7ee8`.

### Status colors (designloom)

| Token | Value |
|---|---|
| success (layout settled, AI ready) | `#61d095` |
| warning (validation issues) | `#f7b731` |
| info | `#33bfd7` |
| danger (remove, errors) | `#eb4949` |

### Borders and dividers

| Token | Value |
|---|---|
| panel edge borders (rail right, panel right, inspector left, top bar bottom, status bar top) | `1px solid #48525c` |
| section divider (ControlSection uses Mantine `gray.7`) | `1px solid #495057` |
| subtle divider inside cards / between list rows | `1px solid #374047` **chosen** |
| input border | none (theme.ts `--input-bd: none`) |
| input focus | `1px solid #5b8ff9` (designloom focus_ring) |
| overlay shadow (iPad panel and inspector overlays, command palette, popovers) | `0 8px 24px rgba(0, 0, 0, 0.45)` **chosen** |

Some of the roles above are painted differently by `compact-mantine`, the
shipped component library, and deliberately so. Keep drawing these values;
section 16 says which roles diverge and why.

## 2. Typography

Font family (Mantine default; theme.ts sets none). Put this on `body` in the
helmet style, exactly as the brief does:

```
font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
```

Monospace (hex values, ids, code): `ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`

Type ramp actually used by the app. Sentence case everywhere; the code does
NOT uppercase section headers (ControlSection renders `Text size="xs" fw={500}`
in sentence case; the older figma-style-sidebar.md uppercase idea was not
implemented). No letter-spacing anywhere.

| Role | Size | Weight | Color | Line height | Source |
|---|---|---|---|---|---|
| badge text | 9px | 500 | on badge | 1 | theme.ts Badge compact `--badge-fz: 9px` |
| pill / segmented control text | 10px | 400 | `#d5d7da` | 1 | theme.ts Pill `10px`, SegmentedControl `10px` |
| control label (above an input) | 11px | 400 | `#7a828e` | 1.2 | theme.ts compact label, `marginBottom: 1` |
| input value | 11px | 400 | `#d5d7da` | 24px box | theme.ts `--input-fz: 11px` |
| checkbox / switch label | 11px | 400 | `#d5d7da` | 1.2 | theme.ts, CompactCheckbox |
| button text (compact) | 11px | 500 | varies | 24px box | theme.ts Button compact |
| stat row label / value | 11px | 400 / 500 | `#7a828e` / `#d5d7da` | 1.2 | **chosen** (the library draws the pair with `DataRow`, at its own metrics) |
| rail label, status bar, tooltip, kbd chip, technical name | 11px | 400 | `#7a828e` | 1.2 | **chosen** |
| section header (ControlSection) | 12px | 500 | `#d5d7da` | 1.2 | ControlSection `Text size="xs" fw={500}` |
| sub-group header (ControlSubGroup) | 12px | 400 | `#7a828e` | 1.2 | ControlSubGroup |
| body / paragraph, list row text, card title, panel title | 12px | 400 (titles 500) | `#d5d7da` | 1.4 | RightSidebar header `12px fw 500`, Text xs |
| plain-language reading in inspector | 12px | 400 | `#a3a8b1` | 1.5 | **chosen** |
| top bar dataset name | 13px | 500 | `#d5d7da` | 1.2 | **chosen** |
| dialog / large panel title (LeftSidebar "Layers") | 14px | 500 | `#d5d7da` | 1.2 | LeftSidebar `Text size="sm" fw={500}` |
| welcome heading | 20px | 600 | `#d5d7da` | 1.25 | **chosen** (designloom 2xl) |

## 3. Sizes

### Shell (spec section 5.1; these are frozen)

| Region | Size |
|---|---|
| activity rail | width 48px, full height between top of frame and status bar |
| top bar | height 40px, spans everything right of the rail |
| activity panel | width 280px |
| inspector | width 280px (spec; the superseded RightSidebar was 260px -- use 280. That component was deleted 2026-09-12; 280 remains the value) |
| status bar | height 24px, spans the full 1440px width |
| canvas at 1440x900 | 832px wide by 836px tall |
| canvas at 1180x820 (iPad, no docked panels) | 1132px wide by 756px tall |
| insights strip | absolute, top 12px, centered in the canvas, max-width 720px, cards 160px wide, 8px gap |
| minimap | absolute, bottom 12px, left 12px, 160px by 100px |
| legend | absolute, bottom 12px, right 12px, width 160px, min-height 80px |
| welcome block | centered in canvas, max-width 600px |
| command palette | 560px wide, top 120px, centered over the whole frame |
| Settings overlay | one frozen rect (R2-N08): the scrim covers the body row right of the rail and below the top bar, the panel is inset 12px on all four sides, so at 1440x900 the panel is 60,52, 1368px by 812px. 8px radius, `#1f2428` on a 1px `#48525c` border, `0 8px 24px rgba(0, 0, 0, 0.45)`. 36px title row, left nav 200px. Every Settings section draws this same rect, so nothing moves when the user changes section. The title row's right cluster is, in order, the `Back to the assistant` 11px `#5b8ff9` text action (Settings only, where the AI panel sent the user), a 12px gap, then the tail every Settings board shares: `Changes save automatically` at 11px `#7a828e`, an 8px gap and the 24px Close X. No bordered button sits in this header |

### Controls (theme.ts compact size unless noted)

| Control | Size |
|---|---|
| text / number / select input | height 24px, padding 0 8px, font 11px, radius 4px, no border |
| button (compact) | height 24px, padding 0 8px, font 11px, radius 4px |
| icon button (ActionIcon compact) | 24px by 24px hit area, icon 14px (12px for chevrons and X) |
| checkbox | 16px by 16px, radius 2px, 4px gap to label |
| switch | 28px by 16px track, 12px thumb, 2px inset |
| slider | 4px track, 12px thumb |
| badge (compact) | height 14px, font 9px, padding 0 4px, radius 7px |
| pill (compact) | height 16px, font 10px, padding 0 6px, radius 8px |
| chip (filter chip, insights chip) | height 20px, font 11px, padding 0 8px, radius 10px **chosen** |
| color swatch | 14px, radius 2px, 1px border `#48525c` |
| section header row | 32px tall (8px vertical padding on a 16px line) |
| sub-group header row | 24px tall |
| stat row | 22px tall (4px vertical padding) |
| list row | 28px tall, padding 0 8px, radius 4px **chosen** |
| layer row (existing) | 26px tall, padding 4px 6px, radius 4px, 1px border |
| card | padding 8px 10px, radius 4px, 1px border |
| rail item | 48px wide by 44px tall: 16px icon, 2px gap, 11px label |
| panel title row | 36px tall, padding 0 16px, 1px bottom border |
| tab row | 24px tall track, 22px tall tabs |
| progress bar | 4px tall, radius 2px |
| tooltip | padding 4px 8px, radius 4px, font 11px |

### Icons

Inline SVG, `viewBox="0 0 16 16"`, `fill="none"`, `stroke="currentColor"`,
`stroke-width="1.5"`, `stroke-linecap="round"`, `stroke-linejoin="round"`.
Sizes used by the app (lucide): 12px chevrons/X/reset, 14px inside inputs,
menu items, panel title icons; 16px rail icons, list icons, Plus; 18px top bar
actions; 24px empty-state glyphs. Icon color follows the text color of the
parent (`#7a828e` dimmed by default, `#d5d7da` when active).

### Radii

| Use | Value |
|---|---|
| inputs, buttons, icon buttons, rows, cards, tooltips, minimap, legend | 4px (Mantine default radius sm) |
| checkbox, swatch | 2px |
| floating toolbar, command palette, Settings overlay panel | 8px |
| pills, chips, badges, progress bars | fully round (half the height) |

### Spacing

4px base. Values in use: 1px (label to input), 2px, 4px (tight gaps, gap
between controls in a group), 6px, 8px (gap between controls, section header
padding, button rows), 10px (Mantine `xs`, `Group gap="xs"`), 12px (canvas
overlay inset), 16px (panel horizontal padding, `pl="md"` indent). Panel
content padding is 8px 16px 16px. Always use flex or grid `gap`, never sibling
margins.

## 4. Component snippets

All snippets are complete and use the exact values above. Copy them verbatim
and change only the text.

### Section header row with chevron (ControlSection)

Divider above, 12px/500 label, 12px chevron in a 16px hit box, optional
configured-values dot. Open state uses chevron-down; closed uses chevron-right.

```html
<div style="display: flex; flex-direction: column;">
  <div style="height: 1px; background: #495057;"></div>
  <div style="display: flex; align-items: center; justify-content: space-between; height: 32px; cursor: pointer;">
    <div style="display: flex; align-items: center; gap: 4px;">
      <div style="width: 16px; height: 16px; display: flex; align-items: center; justify-content: center; color: #7a828e;">
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="4,6 8,10 12,6"></polyline></svg>
      </div>
      <span style="font-size: 12px; font-weight: 500; line-height: 1.2; color: #d5d7da;">Parameters</span>
      <div style="width: 6px; height: 6px; border-radius: 50%; background: #4a7ee8;"></div>
    </div>
    <div style="display: flex; gap: 4px;"></div>
  </div>
</div>
```

Closed chevron: replace the polyline with `<polyline points="6,4 10,8 6,12"></polyline>`.

Sub-group header (ControlSubGroup, lighter): 24px row, 10px chevron, 12px dimmed label, children indented 16px.

```html
<div style="display: flex; align-items: center; gap: 4px; height: 24px; cursor: pointer;">
  <div style="width: 16px; height: 16px; display: flex; align-items: center; justify-content: center; color: #7a828e;">
    <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6,4 10,8 6,12"></polyline></svg>
  </div>
  <span style="font-size: 12px; line-height: 1.2; color: #7a828e;">Advanced</span>
</div>
```

### Compact text input with label

```html
<div style="display: flex; flex-direction: column; gap: 1px;">
  <span style="font-size: 11px; line-height: 1.2; color: #7a828e;">Label text</span>
  <div style="display: flex; align-items: center; height: 24px; padding: 0 8px; background: #2a3035; border-radius: 4px; font-size: 11px; color: #d5d7da; box-sizing: border-box;">Mr_Whiskers</div>
</div>
```

Placeholder state: text color `#5f6873`. Focused state: add `box-shadow: 0 0 0 1px #5b8ff9;`. Default-value state (StyleNumberInput/StyleSelect when unset): `font-style: italic; color: #7a828e;`.

### Compact select

```html
<div style="display: flex; flex-direction: column; gap: 1px;">
  <span style="font-size: 11px; line-height: 1.2; color: #7a828e;">Layout</span>
  <div style="display: flex; align-items: center; justify-content: space-between; height: 24px; padding: 0 8px; background: #2a3035; border-radius: 4px; font-size: 11px; color: #d5d7da; box-sizing: border-box;">
    <span>Force-directed</span>
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#7a828e" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="4,6 8,10 12,6"></polyline></svg>
  </div>
</div>
```

### Number input (with reset x when explicitly set)

```html
<div style="display: flex; align-items: flex-end; gap: 4px;">
  <div style="display: flex; flex-direction: column; gap: 1px; flex: 1;">
    <span style="font-size: 11px; line-height: 1.2; color: #7a828e;">Depth</span>
    <div style="display: flex; align-items: center; height: 24px; padding: 0 8px; background: #2a3035; border-radius: 4px; font-size: 11px; color: #d5d7da; box-sizing: border-box;">2</div>
  </div>
  <div style="width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; border-radius: 4px; color: #7a828e; cursor: pointer;">
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="4" x2="12" y2="12"></line><line x1="12" y1="4" x2="4" y2="12"></line></svg>
  </div>
</div>
```

Two inputs side by side: wrap both in `display: flex; gap: 8px;` and give each column `flex: 1; min-width: 0;`.

### Checkbox row (CompactCheckbox)

```html
<div style="display: flex; align-items: center; gap: 4px; height: 20px; cursor: pointer;">
  <div style="width: 16px; height: 16px; border-radius: 2px; background: #4a7ee8; display: flex; align-items: center; justify-content: center; box-sizing: border-box;">
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3.5,8.5 6.5,11.5 12.5,5"></polyline></svg>
  </div>
  <span style="font-size: 11px; line-height: 1.2; color: #d5d7da;">Show labels</span>
</div>
```

Unchecked box: `<div style="width: 16px; height: 16px; border-radius: 2px; background: #2a3035; border: 1px solid #48525c; box-sizing: border-box;"></div>`

### Toggle switch (compact Switch, 28 by 16)

```html
<div style="display: flex; align-items: center; gap: 6px; height: 20px; cursor: pointer;">
  <div style="width: 28px; height: 16px; border-radius: 8px; background: #4a7ee8; position: relative; box-sizing: border-box;">
    <div style="position: absolute; top: 2px; left: 14px; width: 12px; height: 12px; border-radius: 50%; background: #ffffff;"></div>
  </div>
  <span style="font-size: 11px; line-height: 1.2; color: #d5d7da;">Animate transitions</span>
</div>
```

Off state: track `background: #48525c;`, thumb `left: 2px;`.

### Primary button (compact, filled)

```html
<div style="display: inline-flex; align-items: center; justify-content: center; gap: 4px; height: 24px; padding: 0 8px; border-radius: 4px; background: #4a7ee8; color: #ffffff; font-size: 11px; font-weight: 500; line-height: 1; cursor: pointer; box-sizing: border-box;">Run</div>
```

Hover `#5b8ff9`, pressed `#3a6dd7`, disabled `background: #374047; color: #5f6873;`.

### Subtle button (compact, text only)

```html
<div style="display: inline-flex; align-items: center; justify-content: center; gap: 4px; height: 24px; padding: 0 8px; border-radius: 4px; background: transparent; color: #a3a8b1; font-size: 11px; font-weight: 500; line-height: 1; cursor: pointer; box-sizing: border-box;">More</div>
```

Hover: `background: #374047; color: #d5d7da;`. Outline variant (secondary actions like "Encode as style" when not primary): `background: transparent; border: 1px solid #48525c; color: #d5d7da;`.

### Icon button (24 by 24 hit area)

```html
<div style="width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; border-radius: 4px; color: #7a828e; cursor: pointer;">
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="2.25"></circle><path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M3.4 12.6l1.4-1.4M11.2 4.8l1.4-1.4"></path><circle cx="8" cy="8" r="4.75"></circle></svg>
</div>
```

Hover: `background: #374047; color: #d5d7da;`. Active/toggled: `background: #28364e; color: #4a7ee8;`.

### Chip / pill

Filter chip (removable) and insights chip share this shape. 20px tall, 11px text.

```html
<div style="display: inline-flex; align-items: center; gap: 4px; height: 20px; padding: 0 6px 0 8px; border-radius: 10px; background: #2a3035; border: 1px solid #48525c; color: #d5d7da; font-size: 11px; line-height: 1; box-sizing: border-box;">
  <span>breed = tabby</span>
  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="#7a828e" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="4" x2="12" y2="12"></line><line x1="12" y1="4" x2="4" y2="12"></line></svg>
</div>
```

Accent chip (selected filter, active insight): `background: #28364e; border-color: #4a7ee8; color: #d5d7da;`.
Mantine compact Pill (16px, 10px text, no border): `height: 16px; padding: 0 6px; border-radius: 8px; background: #374047; font-size: 10px;`.

### Card (algorithm card, insight card, result card)

Plain-language name first, technical name second in dimmed text, one-line
description, action row.

```html
<div style="display: flex; flex-direction: column; gap: 6px; padding: 8px 10px; border-radius: 4px; background: #2a3035; border: 1px solid #374047; box-sizing: border-box;">
  <div style="display: flex; align-items: baseline; justify-content: space-between; gap: 8px;">
    <span style="font-size: 12px; font-weight: 500; line-height: 1.2; color: #d5d7da;">Find groups</span>
    <span style="font-size: 11px; line-height: 1.2; color: #7a828e; white-space: nowrap;">Communities (Louvain)</span>
  </div>
  <span style="font-size: 11px; line-height: 1.4; color: #a3a8b1;">Cluster cats that interact with each other more than with the rest.</span>
  <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
    <div style="display: flex; align-items: center; gap: 4px; height: 24px; cursor: pointer; color: #7a828e;">
      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6,4 10,8 6,12"></polyline></svg>
      <span style="font-size: 11px; line-height: 1.2;">Parameters</span>
    </div>
    <div style="display: inline-flex; align-items: center; justify-content: center; height: 24px; padding: 0 8px; border-radius: 4px; background: #4a7ee8; color: #ffffff; font-size: 11px; font-weight: 500; line-height: 1; cursor: pointer; box-sizing: border-box;">Run</div>
  </div>
</div>
```

Highlighted card (2-second flash after an Insights click): `border-color: #4a7ee8; background: #28364e;`.
Result card: same shell, add a 14px badge "Done" (below) and make the primary button read "Encode as style".
Insight card on the canvas strip: width 160px, `background: #1f2428; border: 1px solid #48525c;`, title 12px/500, one 11px line, and a 12px X icon button top-right.

### Divider

```html
<div style="height: 1px; background: #495057;"></div>
```

Subtle divider inside cards or between list rows: `background: #374047;`. Vertical divider in a toolbar: `width: 1px; height: 16px; background: #48525c;`.

### Tab row (segmented)

Track on `#2a3035`, active tab raised to `#374047` with primary text, inactive dimmed. Used for Nodes / Edges in data preview, Provider tabs, and Settings sections when horizontal.

```html
<div style="display: flex; gap: 2px; height: 24px; padding: 1px; border-radius: 4px; background: #2a3035; box-sizing: border-box;">
  <div style="flex: 1; display: flex; align-items: center; justify-content: center; height: 22px; border-radius: 3px; background: #374047; color: #d5d7da; font-size: 11px; font-weight: 500; line-height: 1; cursor: pointer;">Nodes</div>
  <div style="flex: 1; display: flex; align-items: center; justify-content: center; height: 22px; border-radius: 3px; color: #7a828e; font-size: 11px; font-weight: 500; line-height: 1; cursor: pointer;">Edges</div>
</div>
```

### List row (normal, hover, selected)

28px rows, 16px leading icon optional, trailing 11px dimmed value optional.

```html
<div style="display: flex; flex-direction: column; gap: 1px;">
  <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; height: 28px; padding: 0 8px; border-radius: 4px; color: #d5d7da; font-size: 12px; line-height: 1.2; cursor: pointer; box-sizing: border-box;">
    <span>Mr_Whiskers</span>
    <span style="font-size: 11px; color: #7a828e;">4 links</span>
  </div>
  <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; height: 28px; padding: 0 8px; border-radius: 4px; background: #2a3035; color: #d5d7da; font-size: 12px; line-height: 1.2; cursor: pointer; box-sizing: border-box;">
    <span>Chonky_Boy</span>
    <span style="font-size: 11px; color: #7a828e;">3 links</span>
  </div>
  <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; height: 28px; padding: 0 8px; border-radius: 4px; background: #28364e; color: #d5d7da; font-size: 12px; line-height: 1.2; cursor: pointer; box-sizing: border-box;">
    <span>Mrs_Henderson</span>
    <span style="font-size: 11px; color: #7a828e;">4 links</span>
  </div>
</div>
```

The first row is the resting state, the second is hover, the third is selected.

### Badge (compact, 14px)

```html
<div style="display: inline-flex; align-items: center; height: 14px; padding: 0 4px; border-radius: 7px; background: #2a5cc6; color: #ffffff; font-size: 9px; font-weight: 500; line-height: 1; text-transform: uppercase; box-sizing: border-box;">Done</div>
```

Variants: neutral `background: #374047; color: #d5d7da;`; success `background: #61d095; color: #0d1117;`; warning `background: #f7b731; color: #0d1117;`; danger `background: #eb4949; color: #ffffff;`. Badges are the one place uppercase is used.

### Progress bar (4px)

```html
<div style="display: flex; flex-direction: column; gap: 4px;">
  <div style="display: flex; justify-content: space-between; font-size: 11px; line-height: 1.2; color: #7a828e;">
    <span>Running Communities (Louvain)</span>
    <span>64%</span>
  </div>
  <div style="height: 4px; border-radius: 2px; background: #374047; overflow: hidden;">
    <div style="width: 64%; height: 4px; border-radius: 2px; background: #4a7ee8;"></div>
  </div>
</div>
```

Status bar variant (progressive loading): 4px bar, 120px wide, inline in the status bar, no label row.

### Tooltip bubble

```html
<div style="display: inline-flex; flex-direction: column; gap: 2px; padding: 4px 8px; border-radius: 4px; background: #2a3035; border: 1px solid #48525c; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45); font-size: 11px; line-height: 1.4; color: #d5d7da; max-width: 220px;">
  <span>Finds the nodes that sit on the most shortest paths.</span>
  <span style="color: #5b8ff9;">Learn more</span>
</div>
```

Disabled-rail tooltip text: "Load data first".

### Keyboard chip (used in the cmd-K pill and shortcuts list)

```html
<div style="display: inline-flex; align-items: center; height: 16px; padding: 0 4px; border-radius: 3px; background: #374047; color: #a3a8b1; font-size: 10px; line-height: 1; box-sizing: border-box;">Cmd K</div>
```

## 5. Rail icons (16px grid)

Use these exact paths so every artboard's rail matches SHELL-SKELETON.html.

| Activity | SVG inner markup |
|---|---|
| Data (database) | `<ellipse cx="8" cy="4" rx="5.5" ry="2"></ellipse><path d="M2.5 4v8c0 1.1 2.5 2 5.5 2s5.5-.9 5.5-2V4"></path><path d="M2.5 8c0 1.1 2.5 2 5.5 2s5.5-.9 5.5-2"></path>` |
| Explore (compass) | `<circle cx="8" cy="8" r="6.5"></circle><polygon points="10.5,5.5 9,9 5.5,10.5 7,7"></polygon>` |
| Analyze (bar chart) | `<line x1="3" y1="13.5" x2="3" y2="8"></line><line x1="8" y1="13.5" x2="8" y2="2.5"></line><line x1="13" y1="13.5" x2="13" y2="6"></line>` |
| Style (paintbrush) | `<path d="M13.5 2.5l-6 6"></path><path d="M7.5 8.5c-1.5 0-2.5 1-2.5 2.5s-1 2-2.5 2c1.5 1 4.5 1 5.5-1 .5-1 .5-2-.5-3.5z"></path>` |
| Present (presentation screen) | `<rect x="2" y="3" width="12" height="8" rx="1"></rect><line x1="8" y1="11" x2="8" y2="14"></line><line x1="5.5" y1="14" x2="10.5" y2="14"></line>` |
| AI (sparkles) | `<path d="M7 3l1.3 3.7L12 8l-3.7 1.3L7 13l-1.3-3.7L2 8l3.7-1.3z"></path><path d="M13 2v2.5M11.75 3.25h2.5"></path>` |
| Settings (gear) | `<circle cx="8" cy="8" r="2.25"></circle><circle cx="8" cy="8" r="4.75"></circle><path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M3.4 12.6l1.4-1.4M11.2 4.8l1.4-1.4"></path>` |
| Help (circle question) | `<circle cx="8" cy="8" r="6.5"></circle><path d="M6 6.3a2 2 0 0 1 3.9.5c0 1.3-1.9 1.6-1.9 2.7"></path><line x1="8" y1="11.75" x2="8" y2="12.25"></line>` |

Other shell icons: undo `<path d="M4 6h6.5a3 3 0 0 1 0 6H7"></path><polyline points="6.5,3.5 4,6 6.5,8.5"></polyline>`; redo `<path d="M12 6H5.5a3 3 0 0 0 0 6H9"></path><polyline points="9.5,3.5 12,6 9.5,8.5"></polyline>`; search `<circle cx="7" cy="7" r="4.5"></circle><line x1="10.5" y1="10.5" x2="14" y2="14"></line>`; export/download `<path d="M8 2v8"></path><polyline points="5,7.5 8,10.5 11,7.5"></polyline><path d="M2.5 12.5v1a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1v-1"></path>`; share `<circle cx="12" cy="3.5" r="1.75"></circle><circle cx="4" cy="8" r="1.75"></circle><circle cx="12" cy="12.5" r="1.75"></circle><line x1="5.6" y1="7.1" x2="10.4" y2="4.4"></line><line x1="5.6" y1="8.9" x2="10.4" y2="11.6"></line>`; inspector toggle (panel-right) `<rect x="2" y="2.5" width="12" height="11" rx="1.5"></rect><line x1="10" y1="2.5" x2="10" y2="13.5"></line>`; X `<line x1="4" y1="4" x2="12" y2="12"></line><line x1="12" y1="4" x2="4" y2="12"></line>`; plus `<line x1="8" y1="3" x2="8" y2="13"></line><line x1="3" y1="8" x2="13" y2="8"></line>`; check `<polyline points="3.5,8.5 6.5,11.5 12.5,5"></polyline>`.

## 6. Rail states

| State | Icon and label color | Background | Left bar |
|---|---|---|---|
| resting | `#7a828e` | transparent | none |
| hover | `#d5d7da` | `#2a3035` | none |
| active | `#d5d7da` | `#28364e` | 2px `#4a7ee8`, full item height, on the left edge |
| disabled (Empty state) | `#5f6873` | transparent | none; tooltip "Load data first" |

## 7. Dataset facts for copy

`cat-social-network.json`: 20 nodes (17 cats, 1 dog Neighbor_Dog_Rex, 2 humans: The_Vet and
Mrs_Henderson), 29 edges, undirected, edge weight
attribute `value` 1-10, node attributes: group, weightLbs, personality,
indoorOutdoor, ageYears, breed, favoriteSpot, huntingSkill. Edge attributes:
relationship, interactionType. Highest degree is 4, shared by Mr_Whiskers, Mrs_Henderson and The_Vet.
Status bar copy: `20 nodes  29 edges`.

## 8. Canonical Graph summary strings (Loaded state, nothing selected)

Identical inputs give identical readings (spec 7.5), so every Loaded artboard
pastes these verbatim into the Nothing-selected inspector and the Analyze
statistics summary. Plain word first, technical term second (spec 6.3).

Reading (12px/400, `#a3a8b1`, line-height 1.5):
`17 cats, 1 dog and 2 humans, connected by 29 relationships. Everyone is connected to everyone else through at most 5 steps.`

Counts section (header `Counts`, 22px stat rows, label `#7a828e`, value 11px/500 `#d5d7da`):

| Label | Value |
|---|---|
| Nodes | 20 |
| Edges | 29 |
| Direction | Undirected |
| Weighted | Yes (value) |
| How tightly linked (density) | 0.153 |
| Average links per node | 2.9 |
| Connected parts (components) | 1 |
| Longest shortest path (diameter) | 5 |

`Self-loops` and `Parallel edges` rows appear only when non-zero; this dataset
has 0 of each, so they are omitted. Weighted reads `No` for a graph with no
numeric edge attribute chosen as the weight.

Most connected section (header `Most connected` with dimmed `Degree`; 28px list
rows, trailing `N links`). Order is degree descending, ties in dataset order:

1. Mr_Whiskers -- 4 links
2. The_Vet -- 4 links
3. Mrs_Henderson -- 4 links
4. Princess_Fluffington -- 3 links
5. Garbage_Bandit -- 3 links

Attributes: two tier 2 sections, `Node attributes` (dimmed count `8`) and
`Edge attributes` (dimmed count `3`). Collapsed on first load; when open, 22px
rows with the name in `#d5d7da` and a typed range in `#7a828e`:

| Node attribute | Range |
|---|---|
| group | number, 8 values |
| weightLbs | number, 4 to 165 |
| personality | text, 20 values |
| indoorOutdoor | text, 7 values |
| ageYears | number, 0.5 to 68 |
| breed | text, 17 values |
| favoriteSpot | text, 20 values |
| huntingSkill | number, 0 to 10 |

| Edge attribute | Range |
|---|---|
| value | number, 1 to 10 |
| relationship | text, 18 values |
| interactionType | text, 7 values |

Legend size label: `Size: most connected (degree)`; color label when nothing
is encoded: `Color: not encoded`.

Insight card layout: title 12px/500, technical name 11px dimmed on the second
line (`Communities (Louvain)`, `Degree centrality`, `Search`), one 11px
description line, then a `Try it` row (11px/500, `#5b8ff9`, trailing 12px
arrow). No per-card X; the strip has one 24px X icon button at its end (spec
7.3), and cards retire only after a run from the panel.

## 9. 1.3 additions

Spec revision 1.3 (sections 3, 5.1, 5.3, 5.4, 5.6, 5.7, 5.8, 6.3). Every
snippet below is complete; copy it verbatim and change only the text. The
shell pieces (navigation cluster, Export menu trigger, Compare toggle, status
bar slots) are drawn in SHELL-SKELETON.html and are not repeated here.

Overrides of earlier sections:

- Section 4 "Keyboard chip": from 1.3 every binding is rendered with the
  bordered 11px mono key chip below (menus, tooltips, palette rows, the
  shortcuts table, the cmd-K pill). Spelling: modifiers joined with "+"
  (`Cmd+K`, `Shift+0`, `Cmd+Enter`), single keys bare (`F`, `=`, `-`, `0`,
  `N`), named keys as words (`Enter`, `Esc`, `Home`, `Delete`).
- Section 8 Counts table: the `Longest shortest path (diameter)` row leaves
  the inspector graph summary (5.4: diameter and average path length live in
  Analyze tier 2, All statistics). Add an `Isolated nodes` sub-row under
  Connected parts (value `0` for the cat dataset) and the "Case notes" line
  (`Case notes: none  Add a case note`).
- Section 8 reading: unchanged for the cat dataset. The "at most N steps"
  sentence stays because 7.5 gives it as the canonical example; do not add
  it to any other dataset unless an exact diameter result exists.
- The top bar cmd-K pill reads `Search commands, nodes and edges` on every
  screen (5.5).

### Coming tag (5.8)

Muted 10px pill. Sits after the technical name on a card title row, after a
row label in a list, or after a control label. The control it tags is drawn
in its normal enabled state; the tag is the only difference.

```html
<div style="display: inline-flex; align-items: center; height: 16px; padding: 0 6px; border-radius: 8px; background: #374047; color: #7a828e; font-size: 10px; font-weight: 500; line-height: 1; box-sizing: border-box;">Coming</div>
```

Card title row with the tag:

```html
<div style="display: flex; align-items: baseline; gap: 6px; min-width: 0;">
  <span style="font-size: 12px; font-weight: 500; line-height: 1.2; color: #d5d7da;">Core layers</span>
  <span style="font-size: 11px; line-height: 1.2; color: #7a828e; white-space: nowrap;">k-core decomposition</span>
  <div style="display: inline-flex; align-items: center; height: 16px; padding: 0 6px; border-radius: 8px; background: #374047; color: #7a828e; font-size: 10px; font-weight: 500; line-height: 1; box-sizing: border-box;">Coming</div>
</div>
```

### Warning line with Continue anyway (section 3, warn and allow)

11px, warning triangle in `#f7b731`, text in `#a3a8b1`, the link in
`#5b8ff9`. The warning states the estimate and the consequence; the safe
option is the default and the link continues past it. Used under Run on a
card, under Import, under Expand neighbors, in the Import options dialog.

```html
<div style="display: flex; align-items: flex-start; gap: 6px; padding: 6px 8px; border-radius: 4px; background: #2a3035; border: 1px solid #48525c; font-size: 11px; line-height: 1.4; color: #a3a8b1;">
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#f7b731" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="flex: 0 0 auto; margin-top: 1px;"><path d="M8 2.5l6 11H2z"></path><line x1="8" y1="6.5" x2="8" y2="9.5"></line><line x1="8" y1="11.5" x2="8" y2="11.75"></line></svg>
  <span>Above the render ceiling: drawing everything may be slow or run out of memory (estimated 2.4 GB). <span style="color: #5b8ff9; cursor: pointer;">Continue anyway</span></span>
</div>
```

Card form (5.3 Analyze): the line reads `About 3 h at this size. Filter to
a part, or run the sampled version` and the Run button beside it reads
`Run anyway (about 3 h)` using the outline button variant
(`background: transparent; border: 1px solid #f7b731; color: #f7b731;`).
Expansion form (5.3 Explore): `More than 2,000 nodes: the canvas may slow
down. Filter by type first, or expand anyway` with the link text
`Expand anyway`. iPad ceiling form (5.2): `This file has 1,000,000 nodes.
On iPad, graphty can show about 50,000 of them smoothly and may run out of
memory with more. Open it on a desktop for the full graph, or continue
anyway.`

### Modal dialog frame (5.3 tier 3 dialogs)

Scrim over the whole frame, dialog 720px wide centered, 8px radius, 40px
title row, 16px body padding, footer with a secondary and a primary button.
The root artboard div needs `position: relative` for the scrim to anchor.
The canvas under the scrim keeps its cluster, minimap and legend.

```html
<div style="position: absolute; left: 0; top: 0; width: 1440px; height: 900px; display: flex; align-items: center; justify-content: center; background: rgba(13, 17, 23, 0.6); z-index: 20;">
  <div style="width: 720px; max-height: 760px; display: flex; flex-direction: column; border-radius: 8px; background: #1f2428; border: 1px solid #48525c; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45); box-sizing: border-box; overflow: hidden;">
    <div style="flex: 0 0 40px; height: 40px; display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 0 12px 0 16px; border-bottom: 1px solid #48525c; box-sizing: border-box;">
      <span style="font-size: 14px; font-weight: 500; line-height: 1.2; color: #d5d7da;">Import options</span>
      <div style="width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; border-radius: 4px; color: #7a828e; cursor: pointer;">
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="4" x2="12" y2="12"></line><line x1="12" y1="4" x2="4" y2="12"></line></svg>
      </div>
    </div>
    <div style="flex: 1 1 auto; min-height: 0; display: flex; flex-direction: column; gap: 12px; padding: 16px; overflow: hidden; box-sizing: border-box;">
      <span style="font-size: 12px; line-height: 1.4; color: #a3a8b1;">200 nodes, 612 edges, directed, weighted by amount, timed by ts, 5 repeated pairs, 2 self-loops.</span>
    </div>
    <div style="flex: 0 0 48px; height: 48px; display: flex; align-items: center; justify-content: flex-end; gap: 8px; padding: 0 16px; border-top: 1px solid #48525c; box-sizing: border-box;">
      <div style="display: inline-flex; align-items: center; justify-content: center; height: 24px; padding: 0 8px; border-radius: 4px; background: transparent; border: 1px solid #48525c; color: #d5d7da; font-size: 11px; font-weight: 500; line-height: 1; cursor: pointer; box-sizing: border-box;">Cancel</div>
      <div style="display: inline-flex; align-items: center; justify-content: center; height: 24px; padding: 0 8px; border-radius: 4px; background: #4a7ee8; color: #ffffff; font-size: 11px; font-weight: 500; line-height: 1; cursor: pointer; box-sizing: border-box;">Import</div>
    </div>
  </div>
</div>
```

Dialogs with three footer actions (Import, Load a subset, Cancel) put
Cancel first on the left with `margin-right: auto` on a wrapping div, then
the secondary and primary buttons on the right.

### Key chip (5.6, 11px mono, bordered)

```html
<div style="display: inline-flex; align-items: center; height: 16px; padding: 0 4px; border-radius: 3px; background: #2a3035; border: 1px solid #48525c; color: #a3a8b1; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 11px; line-height: 1; box-sizing: border-box;">Shift+0</div>
```

Inside a tooltip the chip sits at the end of the sentence with a 6px gap.
In a menu row it is right-aligned. In a palette row it is the last cell.

### Dropdown menu (top bar Export, Views menu, header menus, row menus)

200px wide, 4px padding, 24px rows with a 14px icon, 11px label and a
right-aligned key chip; 1px dividers between groups; a check mark replaces
the icon on a toggled row. Anchored below its trigger with a 4px gap.

```html
<div style="position: absolute; left: 12px; bottom: 148px; width: 200px; display: flex; flex-direction: column; gap: 1px; padding: 4px; border-radius: 4px; background: #2a3035; border: 1px solid #48525c; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45); box-sizing: border-box; z-index: 15;">
  <div style="display: flex; align-items: center; gap: 8px; height: 24px; padding: 0 8px; border-radius: 3px; color: #d5d7da; font-size: 11px; line-height: 1.2; cursor: pointer; box-sizing: border-box;">
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#7a828e" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 8a5.5 5.5 0 1 0 1.6-3.9"></path><polyline points="2.5,2.5 2.5,6 6,6"></polyline></svg>
    <span style="flex: 1 1 0; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Reset view</span>
    <div style="display: inline-flex; align-items: center; height: 16px; padding: 0 4px; border-radius: 3px; background: #2a3035; border: 1px solid #48525c; color: #a3a8b1; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 11px; line-height: 1; box-sizing: border-box;">Shift+0</div>
  </div>
  <div style="display: flex; align-items: center; gap: 8px; height: 24px; padding: 0 8px; border-radius: 3px; background: #374047; color: #d5d7da; font-size: 11px; line-height: 1.2; cursor: pointer; box-sizing: border-box;">
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#7a828e" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="2.5" width="11" height="11" rx="1.5"></rect><line x1="2.5" y1="6" x2="13.5" y2="6"></line></svg>
    <span style="flex: 1 1 0; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Top</span>
    <div style="display: inline-flex; align-items: center; height: 16px; padding: 0 4px; border-radius: 3px; background: #2a3035; border: 1px solid #48525c; color: #a3a8b1; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 11px; line-height: 1; box-sizing: border-box;">7</div>
  </div>
  <div style="height: 1px; background: #48525c; margin: 3px 0;"></div>
  <div style="display: flex; align-items: center; gap: 8px; height: 24px; padding: 0 8px; border-radius: 3px; color: #d5d7da; font-size: 11px; line-height: 1.2; cursor: pointer; box-sizing: border-box;">
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#4a7ee8" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3.5,8.5 6.5,11.5 12.5,5"></polyline></svg>
    <span style="flex: 1 1 0; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Show minimap</span>
    <div style="display: inline-flex; align-items: center; height: 16px; padding: 0 4px; border-radius: 3px; background: #2a3035; border: 1px solid #48525c; color: #a3a8b1; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 11px; line-height: 1; box-sizing: border-box;">M</div>
  </div>
</div>
```

The second row is the hover state. A row with a trailing ellipsis in its
label ("Save view...") opens a dialog (6.3). Disabled rows: `color: #5f6873`
and no hover. Views menu order (5.6): Reset view `Shift+0`, Top `7`, Front
`1`, Side `3`, Isometric (3D only), Follow selection (toggle), divider, Save
view..., divider, Show minimap `M`, Show legend `L`, divider, Enter VR, Enter
AR (only when the browser reports support). Export menu (5.1): Image, Data.

### Context menu variant (5.6)

Same box as the dropdown, positioned at the pointer (absolute inside the
canvas), no trigger, every item with a key chip when it has one, groups
separated by dividers. Node menu order: Frame this node (Double-click),
Expand neighbors `E`, Select neighbors `Shift+E`, Find path from here `P`,
Radial layout around this node, Pin, Add a note `N`, Merge with..., Copy
id. Edge menu: Inspect, Select endpoints, Add a note `N`. Multi-selection:
Zoom to selection `F`, Filter to selection, Save as set, Invert `I`,
Remove selected `Delete`. Empty canvas: Fit `0`, Reset view `Shift+0`,
Select all visible `Cmd+A`, Paste data `Cmd+V`, Switch to 2D `5`.

```html
<div style="position: absolute; left: 412px; top: 318px; width: 220px; display: flex; flex-direction: column; gap: 1px; padding: 4px; border-radius: 4px; background: #2a3035; border: 1px solid #48525c; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45); box-sizing: border-box; z-index: 15;">
  <div style="display: flex; align-items: center; gap: 8px; height: 24px; padding: 0 8px; border-radius: 3px; color: #d5d7da; font-size: 11px; line-height: 1.2; cursor: pointer; box-sizing: border-box;">
    <span style="flex: 1 1 0; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Expand neighbors</span>
    <div style="display: inline-flex; align-items: center; height: 16px; padding: 0 4px; border-radius: 3px; background: #2a3035; border: 1px solid #48525c; color: #a3a8b1; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 11px; line-height: 1; box-sizing: border-box;">E</div>
  </div>
  <div style="display: flex; align-items: center; gap: 8px; height: 24px; padding: 0 8px; border-radius: 3px; color: #d5d7da; font-size: 11px; line-height: 1.2; cursor: pointer; box-sizing: border-box;">
    <span style="flex: 1 1 0; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Add a note</span>
    <div style="display: inline-flex; align-items: center; height: 16px; padding: 0 4px; border-radius: 3px; background: #2a3035; border: 1px solid #48525c; color: #a3a8b1; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 11px; line-height: 1; box-sizing: border-box;">N</div>
  </div>
  <div style="height: 1px; background: #48525c; margin: 3px 0;"></div>
  <div style="display: flex; align-items: center; gap: 8px; height: 24px; padding: 0 8px; border-radius: 3px; color: #d5d7da; font-size: 11px; line-height: 1.2; cursor: pointer; box-sizing: border-box;">
    <span style="flex: 1 1 0; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Copy id</span>
  </div>
</div>
```

### Bottom drawer frame (5.1, 5.3 Data table drawer)

Docks along the canvas bottom edge, 260px tall, inside the canvas div
(absolute, left 0, right 0, bottom 0). While open the minimap and legend
are hidden and the navigation cluster keeps its left inset with its bottom
at 272px (drawer 260 + 12). A Graph / Table segmented control sits at the
canvas top center. The drawer never covers the panel or the inspector.
Tab row 28px, toolbar row 28px, table header 24px sticky, table rows 24px
(spec 5.3 names the 28px list-row height for rows; the drawer uses the
denser 24px table row so 260px shows eight rows; flag if the spec should
be aligned), numbers right-aligned and tabular. The toolbar fits the 832px
canvas exactly; on a narrower canvas (Compare split) fold Columns, Add
column and Top N by each metric into one "More" menu.

```html
<div style="position: absolute; left: 0; right: 0; bottom: 0; height: 260px; display: flex; flex-direction: column; background: #1f2428; border-top: 1px solid #48525c; box-sizing: border-box; overflow: hidden; z-index: 5;">
  <div style="flex: 0 0 28px; height: 28px; display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 0 12px; border-bottom: 1px solid #374047; box-sizing: border-box;">
    <div style="display: flex; align-items: center; gap: 12px;">
      <div style="display: flex; gap: 2px; height: 22px; padding: 1px; border-radius: 4px; background: #2a3035; box-sizing: border-box;">
        <div style="display: flex; align-items: center; justify-content: center; height: 20px; padding: 0 10px; border-radius: 3px; background: #374047; color: #d5d7da; font-size: 11px; font-weight: 500; line-height: 1; cursor: pointer;">Nodes</div>
        <div style="display: flex; align-items: center; justify-content: center; height: 20px; padding: 0 10px; border-radius: 3px; color: #7a828e; font-size: 11px; font-weight: 500; line-height: 1; cursor: pointer;">Edges</div>
      </div>
      <span style="font-size: 11px; line-height: 1.2; color: #7a828e;">Showing 120 of 200 nodes</span>
      <div style="display: inline-flex; align-items: center; gap: 4px; height: 20px; padding: 0 6px 0 8px; border-radius: 10px; background: #2a3035; border: 1px solid #48525c; color: #d5d7da; font-size: 11px; line-height: 1; box-sizing: border-box;">
        <span>Sorted by betweenness, high to low</span>
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="#7a828e" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="4" x2="12" y2="12"></line><line x1="12" y1="4" x2="4" y2="12"></line></svg>
      </div>
    </div>
    <div style="display: flex; align-items: center; gap: 4px;">
      <div style="display: inline-flex; align-items: center; height: 16px; padding: 0 4px; border-radius: 3px; background: #2a3035; border: 1px solid #48525c; color: #a3a8b1; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 11px; line-height: 1; box-sizing: border-box;">Shift+T</div>
      <div style="width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; border-radius: 4px; color: #7a828e; cursor: pointer;">
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="4" x2="12" y2="12"></line><line x1="12" y1="4" x2="4" y2="12"></line></svg>
      </div>
    </div>
  </div>
  <div style="flex: 0 0 28px; height: 28px; display: flex; align-items: center; gap: 8px; padding: 0 12px; border-bottom: 1px solid #374047; box-sizing: border-box;">
    <div style="width: 120px; flex: 0 0 120px; height: 22px; display: flex; align-items: center; gap: 6px; padding: 0 8px; border-radius: 4px; background: #2a3035; font-size: 11px; color: #5f6873; white-space: nowrap; overflow: hidden; box-sizing: border-box;">
      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="#7a828e" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="7" cy="7" r="4.5"></circle><line x1="10.5" y1="10.5" x2="14" y2="14"></line></svg>
      <span>Search columns</span>
    </div>
    <div style="display: flex; align-items: center; gap: 4px; height: 22px; padding: 0 8px; border-radius: 4px; background: #2a3035; font-size: 11px; color: #d5d7da; white-space: nowrap; box-sizing: border-box;">
      <span style="color: #7a828e;">Show</span><span>Selected</span>
      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="#7a828e" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="4,6 8,10 12,6"></polyline></svg>
    </div>
    <div style="display: flex; align-items: center; gap: 6px; height: 20px; cursor: pointer;">
      <div style="width: 28px; height: 16px; border-radius: 8px; background: #4a7ee8; position: relative; box-sizing: border-box;"><div style="position: absolute; top: 2px; left: 14px; width: 12px; height: 12px; border-radius: 50%; background: #ffffff;"></div></div>
      <span style="font-size: 11px; line-height: 1.2; color: #d5d7da; white-space: nowrap;">Rows with issues</span>
    </div>
    <div style="display: inline-flex; align-items: center; justify-content: center; height: 22px; padding: 0 8px; border-radius: 4px; color: #a3a8b1; font-size: 11px; font-weight: 500; line-height: 1; white-space: nowrap; cursor: pointer;">Columns</div>
    <div style="display: inline-flex; align-items: center; justify-content: center; height: 22px; padding: 0 8px; border-radius: 4px; color: #a3a8b1; font-size: 11px; font-weight: 500; line-height: 1; white-space: nowrap; cursor: pointer;">Add column</div>
    <div style="display: inline-flex; align-items: center; justify-content: center; height: 22px; padding: 0 8px; border-radius: 4px; color: #a3a8b1; font-size: 11px; font-weight: 500; line-height: 1; white-space: nowrap; cursor: pointer;">Top N by each metric</div>
    <div style="flex: 1 1 auto;"></div>
    <div style="display: inline-flex; align-items: center; justify-content: center; height: 22px; padding: 0 8px; border-radius: 4px; background: transparent; border: 1px solid #48525c; color: #d5d7da; font-size: 11px; font-weight: 500; line-height: 1; white-space: nowrap; cursor: pointer; box-sizing: border-box;">Export this table</div>
  </div>
  <div style="flex: 1 1 auto; min-height: 0; display: flex; flex-direction: column; overflow: hidden;">
    <div style="flex: 0 0 24px; height: 24px; display: grid; grid-template-columns: 32px 160px 100px 120px 120px minmax(0, 1fr); align-items: center; padding: 0 12px; background: #2a3035; border-bottom: 1px solid #48525c; font-size: 11px; font-weight: 500; color: #7a828e; box-sizing: border-box;">
      <div style="width: 16px; height: 16px; border-radius: 2px; background: #2a3035; border: 1px solid #48525c; box-sizing: border-box;"></div>
      <div style="display: flex; align-items: center; gap: 4px; padding-right: 8px;"><svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 4h10M8 4v9"></path></svg><span>id</span></div>
      <div style="display: flex; align-items: center; gap: 4px; padding-right: 8px;"><svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 4h10M8 4v9"></path></svg><span>type</span></div>
      <div style="display: flex; align-items: center; justify-content: flex-end; gap: 4px; padding-right: 8px; color: #d5d7da;"><span>betweenness</span><svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4,6 8,10 12,6"></polyline></svg></div>
      <div style="display: flex; align-items: center; justify-content: flex-end; gap: 4px; padding-right: 8px;"><svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2.5l-1.5 11M11.5 2.5l-1.5 11M3 6h10.5M2.5 10h10.5"></path></svg><span>degree</span></div>
      <div style="display: flex; align-items: center; gap: 4px;"><svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="3.5" width="11" height="10" rx="1.5"></rect><line x1="2.5" y1="7" x2="13.5" y2="7"></line><line x1="5.5" y1="2" x2="5.5" y2="5"></line><line x1="10.5" y1="2" x2="10.5" y2="5"></line></svg><span>opened</span></div>
    </div>
    <div style="display: grid; grid-template-columns: 32px 160px 100px 120px 120px minmax(0, 1fr); align-items: center; height: 24px; padding: 0 12px; background: #28364e; border-bottom: 1px solid #374047; font-size: 11px; color: #d5d7da; box-sizing: border-box; cursor: pointer;">
      <div style="width: 16px; height: 16px; border-radius: 2px; background: #4a7ee8; display: flex; align-items: center; justify-content: center; box-sizing: border-box;"><svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3.5,8.5 6.5,11.5 12.5,5"></polyline></svg></div>
      <div style="padding-right: 8px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">acct-4471</div>
      <div style="padding-right: 8px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">account</div>
      <div style="padding-right: 8px; text-align: right; font-variant-numeric: tabular-nums;">0.41</div>
      <div style="padding-right: 8px; text-align: right; font-variant-numeric: tabular-nums;">44</div>
      <div style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">2026-03-18</div>
    </div>
    <div style="display: grid; grid-template-columns: 32px 160px 100px 120px 120px minmax(0, 1fr); align-items: center; height: 24px; padding: 0 12px; border-bottom: 1px solid #374047; font-size: 11px; color: #d5d7da; box-sizing: border-box; cursor: pointer;">
      <div style="width: 16px; height: 16px; border-radius: 2px; background: #2a3035; border: 1px solid #48525c; box-sizing: border-box;"></div>
      <div style="padding-right: 8px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">dev-19c2</div>
      <div style="padding-right: 8px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">device</div>
      <div style="padding-right: 8px; text-align: right; font-variant-numeric: tabular-nums;">0.33</div>
      <div style="padding-right: 8px; text-align: right; font-variant-numeric: tabular-nums;">40</div>
      <div style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">2026-02-02</div>
    </div>
  </div>
</div>
```

The first data row is the selected state (`#28364e`, checked box). Sorted
column header: primary text plus a 10px arrow (down = high to low, up = low
to high). An offending cell (Show rows from a validation issue) gets
`box-shadow: inset 0 0 0 1px #f7b731`. A computed-attribute cell carries a
9px `fx` badge (neutral badge variant). Row hover `background: #2a3035`.
Graph / Table control at the canvas top center while the drawer is open:

```html
<div style="position: absolute; top: 12px; left: 50%; transform: translateX(-50%); display: flex; gap: 2px; height: 24px; padding: 1px; border-radius: 4px; background: #2a3035; border: 1px solid #48525c; box-sizing: border-box; z-index: 6;">
  <div style="display: flex; align-items: center; justify-content: center; height: 20px; padding: 0 10px; border-radius: 3px; background: #374047; color: #d5d7da; font-size: 11px; font-weight: 500; line-height: 1; cursor: pointer;">Graph</div>
  <div style="display: flex; align-items: center; justify-content: center; height: 20px; padding: 0 10px; border-radius: 3px; color: #7a828e; font-size: 11px; font-weight: 500; line-height: 1; cursor: pointer;">Table</div>
</div>
```

### Data table cell set

| Cell | Style |
|---|---|
| text | `font-size: 11px; color: #d5d7da; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding-right: 8px;` |
| number | text style plus `text-align: right; font-variant-numeric: tabular-nums;` (3 significant digits, scientific below 1e-3; hover shows the stored value) |
| id (read-only) | text style in `#a3a8b1` |
| missing | `Not set` in `#5f6873; font-style: italic;` |
| list | 16px pills (section 4 Mantine compact Pill) in a `display: flex; gap: 4px;` row |
| computed | number style plus the 9px neutral badge `fx` before the value |

Type icons in headers, 12px, `stroke="currentColor"`:

| Type | Inner SVG |
|---|---|
| Text | `<path d="M3 4h10M8 4v9"></path>` |
| Whole number, Decimal | `<path d="M6 2.5l-1.5 11M11.5 2.5l-1.5 11M3 6h10.5M2.5 10h10.5"></path>` |
| Yes/No | `<polyline points="3.5,8.5 6.5,11.5 12.5,5"></polyline>` |
| Date-time | `<rect x="2.5" y="3.5" width="11" height="10" rx="1.5"></rect><line x1="2.5" y1="7" x2="13.5" y2="7"></line><line x1="5.5" y1="2" x2="5.5" y2="5"></line><line x1="10.5" y1="2" x2="10.5" y2="5"></line>` |
| List of text | `<line x1="5.5" y1="4" x2="13.5" y2="4"></line><line x1="5.5" y1="8" x2="13.5" y2="8"></line><line x1="5.5" y1="12" x2="13.5" y2="12"></line><circle cx="3" cy="4" r="0.5"></circle><circle cx="3" cy="8" r="0.5"></circle><circle cx="3" cy="12" r="0.5"></circle>` |

### Note marker badge (5.7)

A 14px filled circle with a 9px count, tinted by the note color, with a
1.5px canvas-colored ring so it reads over edges. Six named color tokens:
blue `#4a7ee8` (default), yellow `#f7b731`, green `#61d095`, teal
`#33bfd7`, red `#eb4949`, gray `#a3a8b1`. Count text is `#0d1117` on
yellow, green, teal and gray and `#ffffff` on blue and red. Placed at a
node's top-right (node center + radius * 0.7 on both axes) or at an edge
midpoint. Inside the canvas SVG:

```html
<g transform="translate(431, 286)">
  <circle r="7" fill="#f7b731" stroke="#161b22" stroke-width="1.5"></circle>
  <text x="0" y="3" text-anchor="middle" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" font-size="9" font-weight="500" fill="#0d1117">2</text>
</g>
```

Assistant-authored marker (distinct glyph, 5.3 AI): the same circle with a
four-point sparkle instead of the count:

```html
<g transform="translate(431, 286)">
  <circle r="7" fill="#4a7ee8" stroke="#161b22" stroke-width="1.5"></circle>
  <path d="M0 -4.5L1.2 -1.2L4.5 0L1.2 1.2L0 4.5L-1.2 1.2L-4.5 0L-1.2 -1.2Z" fill="#ffffff"></path>
</g>
```

Cluster marker (above 200 visible markers or in Performance mode): a 16px
pill on the canvas reading `12 notes` (section 4 Mantine compact Pill with
`background: #4a7ee8; color: #ffffff;`). DOM form of the badge, for the
inspector Notes header and the Explore Notes rows:

```html
<div style="display: inline-flex; align-items: center; justify-content: center; width: 14px; height: 14px; border-radius: 50%; background: #f7b731; color: #0d1117; font-size: 9px; font-weight: 500; line-height: 1;">2</div>
```

Done notes never draw markers. The hover card (newest note and "N more")
is the section 4 tooltip bubble with the note row below as its content.

### Note row (5.4 inspector, 5.3 Explore Notes)

Author, relative time, color chip on the first line; text (two lines max);
tag chips and the Done checkbox on the last line. Hover shows Edit and
Delete as subtle buttons at the right of the first line.

```html
<div style="display: flex; flex-direction: column; gap: 4px; padding: 6px 8px; border-radius: 4px; background: #2a3035; border: 1px solid #374047; box-sizing: border-box;">
  <div style="display: flex; align-items: center; gap: 6px;">
    <div style="width: 8px; height: 8px; border-radius: 50%; background: #f7b731;"></div>
    <span style="font-size: 11px; font-weight: 500; line-height: 1.2; color: #d5d7da;">You</span>
    <span style="font-size: 11px; line-height: 1.2; color: #7a828e;">2 h ago</span>
    <div style="flex: 1 1 auto;"></div>
    <div style="display: flex; align-items: center; gap: 4px; height: 20px; cursor: pointer;">
      <div style="width: 16px; height: 16px; border-radius: 2px; background: #2a3035; border: 1px solid #48525c; box-sizing: border-box;"></div>
      <span style="font-size: 11px; line-height: 1.2; color: #7a828e;">Done</span>
    </div>
  </div>
  <span style="font-size: 11px; line-height: 1.4; color: #a3a8b1; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">Money-mule pattern: 14 inbound transfers under 1,000 then one outbound to merch-88 within 3 h. Check the device link.</span>
  <div style="display: flex; align-items: center; gap: 4px;">
    <div style="display: inline-flex; align-items: center; height: 16px; padding: 0 6px; border-radius: 8px; background: #374047; color: #d5d7da; font-size: 10px; line-height: 1; box-sizing: border-box;">mule</div>
    <div style="display: inline-flex; align-items: center; height: 16px; padding: 0 6px; border-radius: 8px; background: #374047; color: #d5d7da; font-size: 10px; line-height: 1; box-sizing: border-box;">evidence</div>
  </div>
</div>
```

Assistant row: author `Assistant` with the 12px sparkle icon (rail AI
glyph) before it; the assistant never marks notes done, so its row still
shows the Done checkbox for the user. Explore Notes list row (28px, no
card): target label 12px, then author and relative time 11px dimmed, then
the first line of text; hover shows Done and Delete. Inspector input:

```html
<div style="display: flex; align-items: center; height: 24px; padding: 0 8px; background: #2a3035; border-radius: 4px; font-size: 11px; color: #5f6873; box-sizing: border-box;">Add a note...</div>
```

Focused it grows to a 64px text area with `box-shadow: 0 0 0 1px #5b8ff9`
and a helper line `Cmd+Enter saves, Esc cancels` in 11px dimmed under it.
Multi-selection form reads `Add a note to these 7 nodes`; graph-level form
in the summary reads `Add a case note`.

### Slider with a histogram behind it (5.3 Explore between, 5.3 Style Range domain)

A 40px histogram of the attribute drawn as SVG bars (`#374047` outside the
selected range, `#2a5cc6` inside), a 4px track under it, two 12px thumbs,
min and max labels and the live match count. Log axis when values span
more than three orders of magnitude; the caption names the scale.

```html
<div style="display: flex; flex-direction: column; gap: 4px;">
  <div style="display: flex; justify-content: space-between; font-size: 11px; line-height: 1.2; color: #7a828e;">
    <span>amount, log scale</span>
    <span>about 412k would match</span>
  </div>
  <div style="position: relative; height: 56px;">
    <svg width="100%" height="40" viewBox="0 0 247 40" preserveAspectRatio="none" style="position: absolute; left: 0; top: 0; display: block;">
      <rect x="0" y="34" width="11" height="6" fill="#374047"></rect>
      <rect x="13" y="28" width="11" height="12" fill="#374047"></rect>
      <rect x="26" y="18" width="11" height="22" fill="#374047"></rect>
      <rect x="39" y="6" width="11" height="34" fill="#374047"></rect>
      <rect x="52" y="2" width="11" height="38" fill="#2a5cc6"></rect>
      <rect x="65" y="8" width="11" height="32" fill="#2a5cc6"></rect>
      <rect x="78" y="14" width="11" height="26" fill="#2a5cc6"></rect>
      <rect x="91" y="12" width="11" height="28" fill="#2a5cc6"></rect>
      <rect x="104" y="20" width="11" height="20" fill="#2a5cc6"></rect>
      <rect x="117" y="24" width="11" height="16" fill="#2a5cc6"></rect>
      <rect x="130" y="26" width="11" height="14" fill="#2a5cc6"></rect>
      <rect x="143" y="30" width="11" height="10" fill="#2a5cc6"></rect>
      <rect x="156" y="31" width="11" height="9" fill="#2a5cc6"></rect>
      <rect x="169" y="34" width="11" height="6" fill="#374047"></rect>
      <rect x="182" y="36" width="11" height="4" fill="#374047"></rect>
      <rect x="195" y="37" width="11" height="3" fill="#374047"></rect>
      <rect x="208" y="38" width="11" height="2" fill="#374047"></rect>
      <rect x="221" y="39" width="11" height="1" fill="#374047"></rect>
      <rect x="234" y="39" width="11" height="1" fill="#374047"></rect>
    </svg>
    <div style="position: absolute; left: 0; right: 0; top: 46px; height: 4px; border-radius: 2px; background: #374047;"></div>
    <div style="position: absolute; left: 21%; width: 47%; top: 46px; height: 4px; border-radius: 2px; background: #4a7ee8;"></div>
    <div style="position: absolute; left: calc(21% - 6px); top: 42px; width: 12px; height: 12px; border-radius: 50%; background: #d5d7da; border: 2px solid #4a7ee8; box-sizing: border-box; cursor: pointer;"></div>
    <div style="position: absolute; left: calc(68% - 6px); top: 42px; width: 12px; height: 12px; border-radius: 50%; background: #d5d7da; border: 2px solid #4a7ee8; box-sizing: border-box; cursor: pointer;"></div>
  </div>
  <div style="display: flex; justify-content: space-between; font-size: 11px; line-height: 1.2; color: #d5d7da;">
    <span>250</span>
    <span>12,000</span>
  </div>
</div>
```

Diverging domain form (Style, Color by logFC): the bars are colored by the
diverging palette, a 1px `#d5d7da` midpoint line sits at the 0 value with
the label `Midpoint 0` above it, the two thumbs are the domain min and max,
and a checkbox row `Clamp outliers at 2nd and 98th percentile` follows.

### Diverging gradient legend bar (5.3 Style legend)

One legend block: plain name, technical name, an 8px gradient bar centered
on the midpoint, three ticks with labels, the palette name and the
"not measured" swatch when any node lacks the attribute.

```html
<div style="display: flex; flex-direction: column; gap: 4px;">
  <span style="font-size: 11px; line-height: 1.2; color: #d5d7da;">Color: fold change <span style="color: #7a828e;">(logFC)</span></span>
  <div style="height: 8px; border-radius: 2px; background: linear-gradient(90deg, #2c6fd6 0%, #8fb4ec 25%, #e6e6e6 50%, #f2b077 75%, #e0641e 100%);"></div>
  <div style="position: relative; height: 12px; font-size: 10px; line-height: 1; color: #7a828e;">
    <span style="position: absolute; left: 0;">-4.2</span>
    <span style="position: absolute; left: 50%; transform: translateX(-50%);">0</span>
    <span style="position: absolute; right: 0;">3.8</span>
  </div>
  <span style="font-size: 10px; line-height: 1.2; color: #7a828e;">Blue-Orange, midpoint 0, clamped at 2nd and 98th</span>
  <div style="display: flex; align-items: center; gap: 6px;">
    <div style="width: 14px; height: 14px; border-radius: 2px; background: #7a828e; border: 1px solid #48525c; box-sizing: border-box;"></div>
    <span style="font-size: 10px; line-height: 1.2; color: #7a828e;">not measured (12 nodes)</span>
  </div>
</div>
```

Sequential bars use `linear-gradient(90deg, #440154, #3b528b, #21918c, #5ec962, #fde725)`
(Viridis) with min, median and max ticks.

### Result card with the run record line (5.3 Result shapes, 5.4)

Order: title row, reading, caveats line, run record line with its three
copy links, then the shape body, then the action row. Both muted lines
stay visible when the reading collapses.

```html
<div style="display: flex; flex-direction: column; gap: 6px; padding: 8px 10px; border-radius: 4px; background: #2a3035; border: 1px solid #374047; box-sizing: border-box;">
  <div style="display: flex; align-items: baseline; justify-content: space-between; gap: 8px;">
    <div style="display: flex; align-items: baseline; gap: 6px; min-width: 0;">
      <span style="font-size: 12px; font-weight: 500; line-height: 1.2; color: #d5d7da;">Bridges</span>
      <span style="font-size: 11px; line-height: 1.2; color: #7a828e; white-space: nowrap;">Betweenness centrality</span>
    </div>
    <div style="display: inline-flex; align-items: center; height: 14px; padding: 0 4px; border-radius: 7px; background: #2a5cc6; color: #ffffff; font-size: 9px; font-weight: 500; line-height: 1; text-transform: uppercase; box-sizing: border-box;">Done</div>
  </div>
  <span style="font-size: 12px; line-height: 1.5; color: #a3a8b1;">acct-4471 is the main bridge. It sits on 41% of the shortest paths between other nodes. <span style="color: #5b8ff9; cursor: pointer;">Simulate removing acct-4471</span> to see what breaks.</span>
  <span style="font-size: 11px; line-height: 1.4; color: #7a828e;">Exact. Directed, weighted by amount as strength. Computed on all 200 nodes.</span>
  <div style="display: flex; flex-direction: column; gap: 2px;">
    <span style="font-size: 11px; line-height: 1.4; color: #7a828e;">Betweenness, normalized, endpoints excluded. Weight: amount (strength). Direction: followed. Scope: visible, 200 of 200 nodes. 2026-09-04 14:12, 38 ms, algorithms 1.4.0</span>
    <div style="display: flex; align-items: center; gap: 8px; font-size: 11px; line-height: 1.2; color: #5b8ff9;">
      <span style="cursor: pointer;">Copy as JSON</span>
      <span style="cursor: pointer;">Copy as command</span>
      <span style="cursor: pointer;">Copy methods text</span>
    </div>
  </div>
  <div style="display: flex; flex-direction: column; gap: 1px;">
    <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; height: 24px; padding: 0 8px; border-radius: 4px; color: #d5d7da; font-size: 11px; line-height: 1.2; cursor: pointer; box-sizing: border-box;"><span>1. acct-4471</span><span style="color: #7a828e; font-variant-numeric: tabular-nums;">0.41</span></div>
    <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; height: 24px; padding: 0 8px; border-radius: 4px; color: #d5d7da; font-size: 11px; line-height: 1.2; cursor: pointer; box-sizing: border-box;"><span>2. dev-19c2</span><span style="color: #7a828e; font-variant-numeric: tabular-nums;">0.33</span></div>
    <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; height: 24px; padding: 0 8px; border-radius: 4px; color: #d5d7da; font-size: 11px; line-height: 1.2; cursor: pointer; box-sizing: border-box;"><span>3. ph-2076</span><span style="color: #7a828e; font-variant-numeric: tabular-nums;">0.29</span></div>
    <span style="font-size: 11px; line-height: 1.2; color: #5b8ff9; padding: 4px 8px; cursor: pointer;">See all 200 ranked</span>
  </div>
  <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
    <div style="display: inline-flex; align-items: center; justify-content: center; height: 24px; padding: 0 8px; border-radius: 4px; background: transparent; color: #a3a8b1; font-size: 11px; font-weight: 500; line-height: 1; cursor: pointer; box-sizing: border-box;">Run again with changes</div>
    <div style="display: inline-flex; align-items: center; justify-content: center; height: 24px; padding: 0 8px; border-radius: 4px; background: #4a7ee8; color: #ffffff; font-size: 11px; font-weight: 500; line-height: 1; cursor: pointer; box-sizing: border-box;">Encode as style</div>
  </div>
</div>
```

Caveats line variants: `Approximate (100 of 1,000,000 sources, seed 4171).
Ranks near the top are reliable; small values are noise.`; `Label
propagation, stopped after 60 s (partial). Computed on the largest part
(912,000 of 1,000,000 nodes). Showing a sample of 50,000.`; `Unweighted,
direction ignored. Converged after 38 passes.`; `Stopped after 5 s, showing
partial results.` Stale results add a muted line `Scope changed: computed
on 200 of 200, now showing 120` with a `Re-run` link, or `Data changed
since this ran. Re-run`. The run record for a Groups card: `Louvain,
resolution 1.0, seed 42. Weight: value (strength). Direction: ignored.
Scope: visible, 20 of 20 nodes. 2026-09-04 14:12, 12 ms, algorithms 1.4.0`.

### Progress row (5.3 Running and scope, 5.1 status bar)

Replaces the card's Run row while a run is in flight. Percent, elapsed
time and Cancel on one line, a 4px bar under it.

```html
<div style="display: flex; flex-direction: column; gap: 4px;">
  <div style="display: flex; align-items: center; gap: 8px; font-size: 11px; line-height: 1.2; color: #a3a8b1;">
    <span style="flex: 1 1 0; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Computing Bridges (betweenness)...</span>
    <span style="font-variant-numeric: tabular-nums;">42%</span>
    <span style="color: #7a828e; font-variant-numeric: tabular-nums;">1.8 s</span>
    <span style="color: #5b8ff9; cursor: pointer;">Cancel</span>
  </div>
  <div style="height: 4px; border-radius: 2px; background: #374047; overflow: hidden;">
    <div style="width: 42%; height: 4px; border-radius: 2px; background: #4a7ee8;"></div>
  </div>
</div>
```

Indeterminate form (the engine reports no progress): omit the percent, and
draw the bar fill as a 30% wide segment at `left: 35%` on a `position:
relative` track. Until per-run cancellation ships (5.8) Cancel is
`color: #5f6873; cursor: default;` with the tooltip `Cannot cancel this run`.
Queued form: the first line reads `Queued (2 of 3)` with no bar. Status bar
mirror in the running slot: `Computing Bridges (betweenness)... 42%
Cancel  and 2 queued`. Batch layout form in the layout slot: `Computing
Kamada-Kawai...  Cancel`. Restyle form: `Restyling 1,000,000 nodes... 38%
Cancel`.

### Rebind row (5.3 Settings, Keyboard shortcuts)

Grid: action label, current key chip, Rebind button. Sized for the
Settings overlay content column (560px or wider), not a 280px panel. Grouped under the
5.6 group names. One row in the recording state.

```html
<div style="display: grid; grid-template-columns: minmax(0, 1fr) 120px 72px; align-items: center; gap: 8px; height: 28px; padding: 0 8px; border-bottom: 1px solid #374047; font-size: 12px; color: #d5d7da; box-sizing: border-box;">
  <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Zoom to selection</span>
  <div style="display: inline-flex; align-items: center; height: 16px; padding: 0 4px; border-radius: 3px; background: #2a3035; border: 1px solid #48525c; color: #a3a8b1; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 11px; line-height: 1; box-sizing: border-box; justify-self: start;">F</div>
  <div style="display: inline-flex; align-items: center; justify-content: center; height: 24px; padding: 0 8px; border-radius: 4px; background: transparent; border: 1px solid #48525c; color: #d5d7da; font-size: 11px; font-weight: 500; line-height: 1; cursor: pointer; box-sizing: border-box;">Rebind</div>
</div>
<div style="display: grid; grid-template-columns: minmax(0, 1fr) 120px 72px; align-items: center; gap: 8px; height: 28px; padding: 0 8px; border-bottom: 1px solid #374047; background: #28364e; font-size: 12px; color: #d5d7da; box-sizing: border-box;">
  <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Toggle inspector</span>
  <div style="display: flex; align-items: center; height: 22px; padding: 0 8px; border-radius: 4px; background: #2a3035; box-shadow: 0 0 0 1px #5b8ff9; font-size: 11px; color: #5f6873; box-sizing: border-box;">Press keys...</div>
  <div style="display: inline-flex; align-items: center; justify-content: center; height: 24px; padding: 0 8px; border-radius: 4px; background: transparent; color: #a3a8b1; font-size: 11px; font-weight: 500; line-height: 1; cursor: pointer; box-sizing: border-box;">Cancel</div>
</div>
```

A conflict while recording adds a line under the row in `#f7b731`, 11px:
`Already used by Focus Explore search. Press again to take it over.` Rows
in the never-bound list show the key chip in `#5f6873` and the tooltip
`Reserved by the browser`. The section footer holds `Reset to defaults`
(outline button) and the read-only `VR controllers` group whose rows have
no Rebind button. The alternative arrow binding row `Arrows walk the
selection to the nearest neighbor` is a radio pair under Navigation and
carries the Coming tag.

### Rail badge count (5.1)

Absolute inside the rail item (which is already `position: relative`).
Warning color, 9px, reads the number of validation issue types, `99+`
above 99.

```html
<div style="position: absolute; top: 2px; right: 4px; display: inline-flex; align-items: center; justify-content: center; min-width: 14px; height: 14px; padding: 0 4px; border-radius: 7px; background: #f7b731; color: #0d1117; font-size: 9px; font-weight: 500; line-height: 1; box-sizing: border-box;">3</div>
```

### Status bar chips (5.1)

All are 16px pills in the 11px status bar. The mode chip is neutral; the
issues chip carries a warning dot; the notes chip carries the marker glyph;
the Performance mode chip carries a bolt. Every chip except the mode chip
is clickable and opens its home.

```html
<div style="display: inline-flex; align-items: center; height: 16px; padding: 0 6px; border-radius: 8px; background: #374047; color: #d5d7da; font-size: 10px; font-weight: 500; line-height: 1; box-sizing: border-box;">3D</div>
<div style="display: inline-flex; align-items: center; gap: 4px; height: 16px; padding: 0 6px; border-radius: 8px; background: #374047; color: #d5d7da; font-size: 10px; font-weight: 500; line-height: 1; box-sizing: border-box;">VR<span style="color: #5b8ff9; cursor: pointer;">Exit</span></div>
<div style="display: inline-flex; align-items: center; gap: 4px; height: 16px; padding: 0 6px; border-radius: 8px; background: #374047; color: #d5d7da; font-size: 10px; font-weight: 500; line-height: 1; cursor: pointer; box-sizing: border-box;"><div style="width: 6px; height: 6px; border-radius: 50%; background: #f7b731;"></div>3 issue types (214k)</div>
<div style="display: inline-flex; align-items: center; gap: 4px; height: 16px; padding: 0 6px; border-radius: 8px; background: #374047; color: #d5d7da; font-size: 10px; font-weight: 500; line-height: 1; cursor: pointer; box-sizing: border-box;"><div style="width: 8px; height: 8px; border-radius: 50%; background: #4a7ee8;"></div>5 notes</div>
<div style="display: inline-flex; align-items: center; gap: 4px; height: 16px; padding: 0 6px; border-radius: 8px; background: #374047; color: #d5d7da; font-size: 10px; font-weight: 500; line-height: 1; cursor: pointer; box-sizing: border-box;"><svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="#f7b731" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 1.5L3 9h4.5L7 14.5 13 7H8.5z"></path></svg>Performance mode: sample 50k, labels off, hover off</div>
```

Copy rules: the issues chip reads `N issue types (total)`; the notes chip
reads `N notes` or `3 of 5 notes` while a filter or window hides targets;
the Performance chip lists the rules in force and opens Settings >
Performance; the subset chip reads `Sample: 50,000 of 1,000,000`. Chips
sit in the status bar issues slot in the order issues, notes, Performance
mode, subset.

### Canonical strings every artboard must use (6.3, 7.5)

Graph summary readings (inspector, nothing selected). Plain name first;
both names always rendered.

| Dataset | Reading | Counts rows |
|---|---|---|
| cat-social-network.json (20 nodes, 29 edges, undirected, weight `value`) | `17 cats, 1 dog and 2 humans, connected by 29 relationships. Everyone is connected to everyone else through at most 5 steps.` | Nodes 20; Edges 29; Direction Undirected; Weighted Yes (value); Average links per node 2.9; How tightly linked (density) 0.153; Connected parts (components) 1 (largest holds 100%); Isolated nodes 0 |
| fraud-ring-synthetic.json (200 nodes, 612 edges, directed, weight `amount`, time `ts`) | `96 accounts, 48 devices and 34 phone numbers, and 1 other type, connected by 612 transactions. One connected part holds all 200 nodes.` | Nodes 200; Edges 612; Direction Directed (from file); Weighted Yes (amount, as strength); Timed Yes (ts); Average links per node 6.1; How tightly linked (density) 0.031; Connected parts (components) 1 (largest holds 100%); Isolated nodes 0; Self-loops 2; Parallel edges 5 (combined at import) |
| security-events-41k.csv (41,200 nodes, 212,000 edges, directed; the iPad hub-node artboard) | `28,400 processes, 9,100 hosts and 3,200 users, and 2 other types, connected by 212,000 events. One connected part holds 91% of nodes; 3,412 small parts (mostly single nodes) hold the rest.` | Nodes 41,200; Edges 212,000; Direction Directed (column); Weighted No; Average links per node 10.3; How tightly linked (density) 1 in 8,000 possible links exist (1.2e-4); Connected parts (components) 3,412 (largest holds 91%); Isolated nodes 2,980 |

Under a filter or time window the reading opens `Showing 120 of 200
nodes.` and every count reads visible of total; under a subset it opens
`Showing a sample.` The diameter sentence appears only for the cat dataset.
Compact numbers above 99,999 (`412k`, `1.0M`); thousands separators below.

Algorithm names (6.3 table, verbatim; plain first, technical in muted text
or parentheses):

| Plain | Technical |
|---|---|
| Groups | Communities (Louvain) |
| Groups | Communities (Leiden) |
| Groups | Communities (Label propagation) |
| Groups | Communities (Girvan-Newman) |
| Tight clusters | Markov clustering (MCL) |
| Connected parts | Components |
| Following direction, Ignoring direction | Strongly, weakly connected components |
| Core layers | k-core decomposition |
| Tight-knit neighborhoods | Clustering coefficient |
| Most connected | Degree centrality |
| Incoming, Outgoing, Both | In-degree, out-degree, total degree |
| Average links per node | Mean degree |
| Influence | PageRank |
| Attenuated influence | Katz centrality |
| Hubs and authorities | HITS |
| Closest to everyone | Closeness centrality |
| Well-connected neighbors | Eigenvector centrality |
| Bridges | Betweenness centrality |
| Bridge edges | Edge betweenness |
| What breaks if removed | Removal impact analysis |
| Bottleneck capacity | Max flow, Min cut |
| Backbone | Minimum spanning tree (Kruskal, Prim) |
| Best pairing | Bipartite matching |
| Farthest apart | Eccentricity, diameter (Floyd-Warshall) |
| Find a path | Shortest path (BFS, Dijkstra when weighted, Bellman-Ford with negative weights) |
| Distance from here | BFS levels |
| Walk from here | Depth-first search |
| Every route | All simple paths |
| Unusual nodes | Anomaly detection |
| Likely missing links | Link prediction |
| Which categories stand out | Category table (term enrichment table) |
| Custom score | Computed attribute |
| Find a pattern | Subgraph search |
| Around the selection | Ego network |
| Step through time | Temporal navigation |
| How tightly linked | Density |
| Compare | Comparison view |
| Data table | Node and edge table |
| Add attributes from a table | Table join |
| Map identifiers | Identifier mapping |
| Close dataset | New session |
| Notes | Annotations |
| Case note | Graph-level annotation |
| Done | Resolved |
| Callouts | Visual annotations (text, arrows, shapes) |
| Arrangement | Layout |
| Force directed | ngraph |
| Layers from a root | bfs |
| Rings around a node | radial (ego-centric) |
| Layered | sugiyama |
| Circle | circular |
| Shells | shell |
| Layers by attribute | multipartite |
| Two sides | bipartite |
| From file | fixed |
| Edge length | springLength |
| Pull to center | gravity |
| Stiffness | springCoefficient |
| Damping | dragCoefficient, velocityDecay |
| Speed vs accuracy | theta |
| Spread | scalingFactor |
| Iterations | maxIter, iterations |
| Random seed | seed |

Retired and renamed strings: "Reach" (reserved word, never a plain name);
"Followers, Following, Both" (now Incoming, Outgoing, Both); "Annotation
tools" (now Notes in Explore, Callouts deferred to Present); "Analysis
history" (now History); "Compare two results" (now Compare); "Node type"
on the Node id role (now Identifier system, `ids: account id`); "Enrichment
table" (now Category table); "Load sample" (now Load a subset); "Include
annotations" (now Include note markers); "Search commands and data" (now
Search commands, nodes and edges). Card descriptions are domain-neutral
and canonical: the Groups card reads `Cluster nodes that interact more
with each other than with the rest` on every screen; no card description
names cats, accounts, genes or proteins. Readings alone substitute the
detected node-type noun. The quick-pick layout segments read `Force
directed`, `Hierarchical`, `Radial`, `More`, with technical ids `ngraph`,
`sugiyama`, `radial (ego-centric)` under them; Hierarchical and Radial
carry the Coming tag.

## 10. 1.5 additions

Spec revision 1.5 (sections 3, 5.1, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 6.3,
6.5, 6.7, 6.8, 7.1, 7.3, 7.5, 9). The decisions these snippets serve are in
DECISIONS-1.5.md; that document names which artboards change. Every snippet
below is complete; copy it verbatim and change only the text.

Overrides of earlier sections:

- Section 9 "Key chip": the chip's allowed hosts are now closed. A binding
  appears in exactly four places -- a tooltip bubble (last element of the
  sentence, 6px gap), a menu row (right-aligned), a palette row (last cell),
  and the shortcuts table. Never inside a button, an action row, a switch row
  or a section header, and never in a trailing column that carries data on
  other rows of the same list.
- Section 4 "Tooltip bubble": the same bubble at `max-width: 250px` is the info
  circle popover (below). The bubble is also the home for a technical name that
  a 24px slot cannot hold, and for the "Learn more" docs link.
- Section 4 "Card": a card title row never carries a cost-class word
  ("heavy", "iterative", "sampled", "instant", "cubic", "unbounded",
  "windowed"). Those words do not appear anywhere in the interface.
- Section 9 "Coming tag": where three or more contiguous rows in one list are
  unshipped, the rows are dimmed (`color: #5f6873`) and disabled and the tag is
  drawn once on the group header or divider; isolated rows keep the per-row
  tag. An unshipped row carries no key chip, and an icon-only control never
  carries a Coming tag.
- Section 8 Counts table: `Isolated nodes 0` and `(largest holds 100%)` are not
  drawn when there is one connected part; `Direction`, `Weighted` and `Timed`
  merge into one `Type` row; the whole Counts block is a tier 2 section,
  collapsed by default.
- Section 5 "Rail icons": section 5 is now the closed icon register (6.8). One
  verb, one drawing. No floppy-disk save glyph is ever drawn -- there is no
  project save, so saving is Export and the download glyph carries it. No
  duplicate glyph, no sort glyph (a column sorts by its existing chevrons), no
  play triangle for Run (the triangle belongs to the time slider transport).

### Info circle (6.7)

A 12px circled "i" in a 14px box. Resting `#a3a8b1`; `#d5d7da` on hover, focus
or open. It sits immediately after the last name of the canonical pair it
explains and before any status pill, so the label order preference never moves
it. In the built app the hit area is 24px through padding and negative margin,
so no row grows; artboards draw the 14px box only.

Resting:

```html
<div style="width: 14px; height: 14px; display: inline-flex; align-items: center; justify-content: center; flex: 0 0 auto; color: #a3a8b1; cursor: default;">
  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="6.5"></circle><line x1="8" y1="7" x2="8" y2="11.5"></line><line x1="8" y1="4.5" x2="8" y2="4.75"></line></svg>
</div>
```

Hovered, focused or open (the only difference is the colour):

```html
<div style="width: 14px; height: 14px; display: inline-flex; align-items: center; justify-content: center; flex: 0 0 auto; color: #d5d7da; cursor: default;">
  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="6.5"></circle><line x1="8" y1="7" x2="8" y2="11.5"></line><line x1="8" y1="4.5" x2="8" y2="4.75"></line></svg>
</div>
```

Popover (the section 4 tooltip bubble at 250px, anchored below the circle with
a 4px gap). At most two sentences and 220 characters, then at most one "Learn
more" link, then the binding as a key chip when one exists. Nothing inside is a
control except that link.

```html
<div style="position: absolute; left: 0; top: 20px; width: 250px; display: flex; flex-direction: column; gap: 2px; padding: 4px 8px; border-radius: 4px; background: #2a3035; border: 1px solid #48525c; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45); font-size: 11px; line-height: 1.4; color: #d5d7da; box-sizing: border-box; z-index: 15;">
  <span>Nodes with well-linked neighbors: a node scores high when the nodes pointing at it score high.</span>
  <span style="color: #5b8ff9; cursor: pointer;">Learn more</span>
</div>
```

Row with a label, its pair and the circle (the canonical order; the circle is
never between the two names):

```html
<div style="display: flex; align-items: center; gap: 4px; height: 22px;">
  <span style="font-size: 11px; line-height: 1.2; color: #7a828e;">Large-graph threshold</span>
  <div style="width: 14px; height: 14px; display: inline-flex; align-items: center; justify-content: center; flex: 0 0 auto; color: #a3a8b1; cursor: default;">
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="6.5"></circle><line x1="8" y1="7" x2="8" y2="11.5"></line><line x1="8" y1="4.5" x2="8" y2="4.75"></line></svg>
  </div>
</div>
```

The parent of a pinned popover needs `position: relative`. On a touch pointer
and below 1280px the popover opens pinned and closes on the next outside tap.
Performance mode never hides an info circle.

### Icon-only button, with its tooltip (6.8)

The section 4 icon button in its three states. 24 by 24 hit area, 14px glyph
(12px for chevrons and X), 4px minimum clear space to the next control. Every
icon-only control carries an aria-label equal to the tooltip text without the
key chip; the glyph is aria-hidden.

Default:

```html
<div title="Copy as TSV" style="width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; border-radius: 4px; background: transparent; color: #7a828e; cursor: pointer; flex: 0 0 auto;">
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="5.5" y="5.5" width="8" height="8" rx="1"></rect><path d="M10.5 5.5v-2a1 1 0 0 0-1-1h-6a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2"></path></svg>
</div>
```

Hover:

```html
<div title="Copy as TSV" style="width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; border-radius: 4px; background: #374047; color: #d5d7da; cursor: pointer; flex: 0 0 auto;">
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="5.5" y="5.5" width="8" height="8" rx="1"></rect><path d="M10.5 5.5v-2a1 1 0 0 0-1-1h-6a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2"></path></svg>
</div>
```

Active or toggled on (`aria-pressed="true"`; a toggle keeps one name and never
changes it with state):

```html
<div title="Link views" style="width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; border-radius: 4px; background: #28364e; color: #4a7ee8; cursor: pointer; flex: 0 0 auto;">
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6.5 9.5a2.5 2.5 0 0 0 3.5 0l2-2a2.5 2.5 0 0 0-3.5-3.5l-.75.75"></path><path d="M9.5 6.5a2.5 2.5 0 0 0-3.5 0l-2 2a2.5 2.5 0 0 0 3.5 3.5l.75-.75"></path></svg>
</div>
```

Its tooltip: verb, then the object when the icon does not sit on its object,
then the key chip. 150ms delay. Never suppressed in Performance mode, which
governs canvas elements only.

```html
<div style="display: inline-flex; align-items: center; gap: 6px; padding: 4px 8px; border-radius: 4px; background: #2a3035; border: 1px solid #48525c; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45); font-size: 11px; line-height: 1.4; color: #d5d7da; max-width: 220px;">
  <span>Zoom to selection</span>
  <div style="display: inline-flex; align-items: center; height: 16px; padding: 0 4px; border-radius: 3px; background: #2a3035; border: 1px solid #48525c; color: #a3a8b1; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 11px; line-height: 1; box-sizing: border-box;">F</div>
</div>
```

Disabled: `color: #5f6873; cursor: default;` with no hover and the reason in
the tooltip ("Zoom to selection. Select something first"). Below 1280px an
icon-only control that is the sole path to a capability is 32 by 32 with a 16px
glyph. A trash icon is always last in its cluster with 8px of separation. In
artboards the tooltip is the native `title` attribute; the bubble above is
drawn only where a tooltip is shown open.

### Icon group in a section header, revealed on hover (6.8)

At most two verb icons plus an overflow, right-aligned, revealed on section
hover or keyboard focus, acting on the section's content. Resting state: the
same row without the trailing group. Every hover-revealed icon repeats as a
full-text item in the section's overflow menu, which is the non-hover twin for
touch.

Hovered (the state to draw when the artboard shows the group):

```html
<div style="display: flex; flex-direction: column;">
  <div style="height: 1px; background: #495057;"></div>
  <div style="display: flex; align-items: center; justify-content: space-between; height: 32px; cursor: pointer;">
    <div style="display: flex; align-items: center; gap: 4px;">
      <div style="width: 16px; height: 16px; display: flex; align-items: center; justify-content: center; color: #7a828e;">
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="4,6 8,10 12,6"></polyline></svg>
      </div>
      <span style="font-size: 12px; font-weight: 500; line-height: 1.2; color: #d5d7da;">All statistics</span>
    </div>
    <div style="display: flex; align-items: center; gap: 4px;">
      <div title="Recompute" style="width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; border-radius: 4px; color: #7a828e; cursor: pointer;">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 8a5.5 5.5 0 1 0 1.6-3.9"></path><polyline points="2.5,2.5 2.5,6 6,6"></polyline></svg>
      </div>
      <div title="Export CSV" style="width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; border-radius: 4px; color: #7a828e; cursor: pointer;">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2v8"></path><polyline points="5,7.5 8,10.5 11,7.5"></polyline><path d="M2.5 12.5v1a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1v-1"></path></svg>
      </div>
      <div title="More" style="width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; border-radius: 4px; color: #7a828e; cursor: pointer;">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="3.5" r="0.75"></circle><circle cx="8" cy="8" r="0.75"></circle><circle cx="8" cy="12.5" r="0.75"></circle></svg>
      </div>
    </div>
  </div>
</div>
```

Row form (three icons maximum, always in the order edit, visibility, delete, so
position teaches the verb):

```html
<div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; height: 28px; padding: 0 8px; border-radius: 4px; background: #2a3035; color: #d5d7da; font-size: 12px; line-height: 1.2; box-sizing: border-box;">
  <span style="flex: 1 1 0; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Mule candidates</span>
  <div style="display: flex; align-items: center; gap: 4px; flex: 0 0 auto;">
    <div title="Edit" style="width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; border-radius: 4px; color: #7a828e; cursor: pointer;">
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11.2 2.3l2.5 2.5-8 8-3.2.7.7-3.2z"></path><line x1="9.6" y1="3.9" x2="12.1" y2="6.4"></line></svg>
    </div>
    <div title="Show on canvas" style="width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; border-radius: 4px; color: #7a828e; cursor: pointer;">
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M1.5 8s2.5-4.5 6.5-4.5S14.5 8 14.5 8s-2.5 4.5-6.5 4.5S1.5 8 1.5 8z"></path><circle cx="8" cy="8" r="2"></circle></svg>
    </div>
    <div title="Delete" style="width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; border-radius: 4px; margin-left: 4px; color: #7a828e; cursor: pointer;">
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 4.5h10M6.5 4.5v-2h3v2M4 4.5l.8 9h6.4l.8-9"></path></svg>
    </div>
  </div>
</div>
```

New glyphs this revision adds to section 5: edit (pencil, above), paste,
eye-off, lock, unlock, tag. Consolidated: the pushpin adopts the upright form
(`<path d="M6 2.5h4l-.5 3.5 2 2.5H4.5l2-2.5z"></path><line x1="8" y1="8.5" x2="8" y2="13.5"></line>`),
the gear the rail form, the funnel `<path d="M2.5 3.5h11l-4.25 5v4.25l-2.5 1.25V8.5z"></path>`,
the bookmark the ViewsMenu ribbon, and zoom-to-selection the corner brackets
with a centre dot.

### Subtle action row (5.6, replaces the boxed action with an inline key chip)

The corrected shape. Transparent at rest, no border, 24px tall, full panel
width, 4px radius, a 14px leading icon in the dimmed colour, an 11px label at
weight 500, hover as its only chrome. The binding is in the tooltip, never in
the row. The trailing slot carries data about the action or nothing.

Wrong (do not draw this; it reads as a disabled text field with a suffix):
a 24px box with `background: transparent; border: 1px solid #48525c;
border-radius: 4px` holding an icon, a label and a right-aligned bordered mono
chip.

Right, resting:

```html
<div title="Zoom to selection (F)" style="display: flex; align-items: center; gap: 6px; height: 24px; padding: 0 8px; border-radius: 4px; background: transparent; color: #d5d7da; font-size: 11px; font-weight: 500; line-height: 1.2; cursor: pointer; box-sizing: border-box;">
  <span style="flex: 0 0 auto; width: 14px; height: 14px; display: inline-flex; align-items: center; justify-content: center; color: #7a828e;">
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 6V2.5H6"></path><path d="M10 2.5h3.5V6"></path><path d="M13.5 10v3.5H10"></path><path d="M6 13.5H2.5V10"></path><circle cx="8" cy="8" r="2"></circle></svg>
  </span>
  <span style="flex: 1 1 0; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Zoom to selection</span>
</div>
```

With the trailing data slot (a count, a target or a Coming tag -- never a key):

```html
<div title="Save as subgraph (Shift+S)" style="display: flex; align-items: center; gap: 6px; height: 24px; padding: 0 8px; border-radius: 4px; background: #374047; color: #d5d7da; font-size: 11px; font-weight: 500; line-height: 1.2; cursor: pointer; box-sizing: border-box;">
  <span style="flex: 0 0 auto; width: 14px; height: 14px; display: inline-flex; align-items: center; justify-content: center; color: #7a828e;">
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 2.5h8a1 1 0 0 1 1 1v10l-5-3-5 3v-10a1 1 0 0 1 1-1z"></path></svg>
  </span>
  <span style="flex: 1 1 0; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Save as subgraph</span>
  <span style="flex: 0 0 auto; font-size: 11px; font-weight: 400; color: #7a828e;">new layer</span>
</div>
```

That second row is the hover state (`background: #374047`). Pressed
`background: #2a3035`. Disabled `color: #5f6873; cursor: default;` with no
hover, the leading icon at `#5f6873`, and the reason in the title ("Zoom to
selection (F). Select something first"). The hover fill is `#374047`, not
`#2a3035`, and the leading icon is mandatory: a transparent row is otherwise
not obviously clickable in a dense panel.

Key chip treatment: in an artboard the binding is the native `title` attribute
and is spelled in parentheses at the end of the sentence -- `title="Show
legend (L)"`. In the product it is the VOCAB key chip at the end of the tooltip
sentence after a 6px gap. Two chips are not bindings in disguise and stay where
they are: the top bar `Cmd K` pill and the `/` hint inside a search input, both
printed inside a real input where a hint belongs.

### Per-card cost estimate beside Run (5.3 Analyze)

Three bands, one estimate per card, never on the scope line and never twice.
Round to one significant figure; write the words about, s, min and h; never a
tilde.

Under 2 s -- nothing at all; the action row is Parameters and Run:

```html
<div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
  <div style="display: flex; align-items: center; gap: 4px; height: 24px; cursor: pointer; color: #7a828e;">
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6,4 10,8 6,12"></polyline></svg>
    <span style="font-size: 11px; line-height: 1.2;">Parameters</span>
  </div>
  <div style="display: inline-flex; align-items: center; justify-content: center; height: 24px; padding: 0 8px; border-radius: 4px; background: #4a7ee8; color: #ffffff; font-size: 11px; font-weight: 500; line-height: 1; cursor: pointer; box-sizing: border-box;">Run</div>
</div>
```

From 2 s to the ask limit -- an 11px dimmed estimate immediately left of Run:

```html
<div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
  <div style="display: flex; align-items: center; gap: 4px; height: 24px; cursor: pointer; color: #7a828e;">
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6,4 10,8 6,12"></polyline></svg>
    <span style="font-size: 11px; line-height: 1.2;">Parameters</span>
  </div>
  <div style="display: flex; align-items: center; gap: 8px;">
    <span style="font-size: 11px; line-height: 1.2; color: #7a828e;">about 5 s</span>
    <div style="display: inline-flex; align-items: center; justify-content: center; height: 24px; padding: 0 8px; border-radius: 4px; background: #4a7ee8; color: #ffffff; font-size: 11px; font-weight: 500; line-height: 1; cursor: pointer; box-sizing: border-box;">Run</div>
  </div>
</div>
```

Above the ask limit -- the estimate moves onto the button and Run confirms once:

```html
<div style="display: inline-flex; align-items: center; justify-content: center; height: 24px; padding: 0 8px; border-radius: 4px; background: #4a7ee8; color: #ffffff; font-size: 11px; font-weight: 500; line-height: 1; cursor: pointer; box-sizing: border-box;">Run (about 40 s)</div>
```

Above the warn limit -- the section 9 warning line, then the outline button:

```html
<div style="display: inline-flex; align-items: center; justify-content: center; height: 24px; padding: 0 8px; border-radius: 4px; background: transparent; border: 1px solid #f7b731; color: #f7b731; font-size: 11px; font-weight: 500; line-height: 1; cursor: pointer; box-sizing: border-box;">Run anyway (about 3 h)</div>
```

The List view row carries the same estimate in the same words, so List is not
the cheaper way to hide cost. A group header carries no estimate and no cost
word; a collapsed group header carries only the card count, with the tooltip
"4 questions in this group".

### Unit-aware time slider labels (5.3 Data Time role, 5.3 Explore)

Every time string is derived from the Time role's unit family. Draw the unit
select with its chevron only in the Date and time case; Number and Ordered
category render a static unit label in the dimmed colour.

Date and time -- window size with a unit select, step in days:

```html
<div style="display: flex; gap: 8px;">
  <div style="flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px;">
    <span style="font-size: 11px; line-height: 1.2; color: #7a828e;">Window size</span>
    <div style="display: flex; align-items: center; gap: 4px;">
      <div style="flex: 1; min-width: 0; display: flex; align-items: center; height: 24px; padding: 0 8px; background: #2a3035; border-radius: 4px; font-size: 11px; color: #d5d7da; box-sizing: border-box;">30</div>
      <div style="flex: 0 0 76px; display: flex; align-items: center; justify-content: space-between; height: 24px; padding: 0 8px; background: #2a3035; border-radius: 4px; font-size: 11px; color: #d5d7da; box-sizing: border-box;">
        <span>days</span>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#7a828e" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="4,6 8,10 12,6"></polyline></svg>
      </div>
    </div>
  </div>
</div>
```

Number (unit "step") and Ordered category (unit "release") -- the same row with
a static unit label instead of the select:

```html
<div style="flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px;">
  <span style="font-size: 11px; line-height: 1.2; color: #7a828e;">Window size</span>
  <div style="display: flex; align-items: center; gap: 6px;">
    <div style="flex: 1; min-width: 0; display: flex; align-items: center; height: 24px; padding: 0 8px; background: #2a3035; border-radius: 4px; font-size: 11px; color: #d5d7da; box-sizing: border-box;">50</div>
    <span style="flex: 0 0 auto; font-size: 11px; line-height: 1.2; color: #7a828e;">steps</span>
  </div>
</div>
```

The overlay readout on the slider bar, and the status bar Viewing slot, use the
same string:

```html
<span style="font-size: 11px; line-height: 1.2; color: #d5d7da;">Viewing: steps 1,200 to 1,250</span>
```

| Surface | Date and time | Number, unit "step" | Ordered category, unit "release" |
|---|---|---|---|
| Window size | `30` + unit select (`days`) | `50` + static `steps` | `3` + static `releases` |
| Step | `7` + unit select (`days`) | `10` + static `steps` | `1` + static `release` |
| Readout, status bar | `Viewing: 2026-01-05 to 2026-02-04` | `Viewing: steps 1,200 to 1,250` | `Viewing: v1.2 to v1.4` |
| Cumulative | `Viewing: up to 2026-02-04` | `Viewing: up to step 1,250` | `Viewing: up to v1.4` |
| Filter chip | `Time: 2026-01-05 to 2026-02-04` | `Time: steps 1,200 to 1,250` | `Time: v1.2 to v1.4` |
| Track ticks | `2026-01  2026-02  2026-03` | `1,000  1,200  1,400` | `v1.0  v1.2  v1.4` (evenly spaced) |
| Step tooltip | `Step forward 7 days (.)` | `Step forward 10 steps (.)` | `Step forward 1 release (.)` |
| Playback speed | `1x (one window per second)` | same | same |

Playback speed never reads "one step per second": there, "step" means a
playback tick and collides with the data unit. Ordered category has no
arithmetic -- window and step are counts of categories, the track is evenly
spaced, and the density sparkline is a bar per category. The Time role popover
in Import options shows three lines: `Kind: A single moment`,
`Measured in: Date and time`, `Format: ISO 8601 (2026-04-01T00:00:03Z)`. The
word "instant" is not used for Kind; it also named a cost class.

### Detected threshold readout with Recalibrate (5.3 Settings > Performance)

One block replaces the large-graph threshold row and both render ceiling rows.
Headline sentence, two subtle actions, the provenance line, then the
consequence sentence, which is what makes the number legible and is never
trimmed.

```html
<div style="display: flex; flex-direction: column; gap: 4px;">
  <span style="font-size: 12px; font-weight: 500; line-height: 1.2; color: #d5d7da;">How much this machine can draw</span>
  <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
    <span style="font-size: 13px; font-weight: 500; line-height: 1.2; color: #d5d7da;">Detected: about 180,000 nodes on this machine.</span>
    <div style="display: flex; align-items: center; gap: 4px; flex: 0 0 auto;">
      <div title="Recalibrate" style="display: flex; align-items: center; gap: 6px; height: 24px; padding: 0 8px; border-radius: 4px; background: transparent; color: #d5d7da; font-size: 11px; font-weight: 500; line-height: 1.2; cursor: pointer; box-sizing: border-box;">
        <span style="flex: 0 0 auto; width: 14px; height: 14px; display: inline-flex; align-items: center; justify-content: center; color: #7a828e;">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 8a5.5 5.5 0 1 0 1.6-3.9"></path><polyline points="2.5,2.5 2.5,6 6,6"></polyline></svg>
        </span>
        <span>Recalibrate</span>
      </div>
      <div title="Change the detected values" style="display: flex; align-items: center; gap: 6px; height: 24px; padding: 0 8px; border-radius: 4px; background: transparent; color: #d5d7da; font-size: 11px; font-weight: 500; line-height: 1.2; cursor: pointer; box-sizing: border-box;">
        <span style="flex: 0 0 auto; width: 14px; height: 14px; display: inline-flex; align-items: center; justify-content: center; color: #7a828e;">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11.2 2.3l2.5 2.5-8 8-3.2.7.7-3.2z"></path><line x1="9.6" y1="3.9" x2="12.1" y2="6.4"></line></svg>
        </span>
        <span>Change</span>
      </div>
    </div>
  </div>
  <span style="font-size: 11px; line-height: 1.4; color: #7a828e;">Measured 4 Sep 18:02 on Apple M2 Pro, 8 cores, 8 GB.</span>
  <span style="font-size: 11px; line-height: 1.4; color: #a3a8b1;">Above about 18,000 nodes graphty switches to Performance mode. Above about 180,000 it loads a subset and warns; Import everything anyway always stays.</span>
</div>
```

The block wants a full Settings column (about 360px). Below that the headline
sentence wraps around the two actions; where the column is narrower, put
Recalibrate and Change on their own row under the provenance line rather than
letting the headline wrap.

Measuring state -- Recalibrate becomes a progress row:

```html
<div style="display: flex; align-items: center; gap: 8px;">
  <div style="flex: 1; min-width: 0; height: 4px; border-radius: 2px; background: #374047; overflow: hidden;">
    <div style="width: 40%; height: 4px; border-radius: 2px; background: #4a7ee8;"></div>
  </div>
  <span style="flex: 0 0 auto; font-size: 11px; line-height: 1.2; color: #7a828e;">Measuring... 2 s</span>
  <div style="display: inline-flex; align-items: center; justify-content: center; height: 24px; padding: 0 8px; border-radius: 4px; background: transparent; border: 1px solid #48525c; color: #d5d7da; font-size: 11px; font-weight: 500; line-height: 1; cursor: pointer; box-sizing: border-box;">Cancel</div>
</div>
```

Overridden state -- Change discloses the four numeric fields pre-filled with
the detected values, and the block is stamped, with the detected line kept
underneath as the reference:

```html
<span style="font-size: 11px; line-height: 1.4; color: #7a828e;">Set by you. <span style="color: #5b8ff9; cursor: pointer;">Use detected values</span></span>
```

Failure -- the info tone, never a warning, never a modal, never a blocked start:

```html
<span style="font-size: 13px; font-weight: 500; line-height: 1.2; color: #d5d7da;">Could not measure this machine. Using safe defaults: about 200,000 nodes.</span>
```

with the two actions reading `Try again` and `Change`, and every estimate
tooltip gaining "Estimated from built-in defaults; this machine was not
measured."

### Style By attribute row: a metric that has not been run (5.4, 5.3 Style)

The attribute select's last group. Computed metrics first with their range as a
dimmed trailing hint, a 1px divider, then the not-yet-run metrics: a 12px play
glyph, the plain name, the technical name dimmed, and a trailing hint that is
"not run" under 2 s and the estimate otherwise. The play glyph and the hint are
load-bearing: a not-run row never looks like a plain attribute.

```html
<div style="width: 200px; display: flex; flex-direction: column; gap: 1px; padding: 4px; border-radius: 4px; background: #2a3035; border: 1px solid #48525c; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45); box-sizing: border-box;">
  <span style="padding: 4px 8px 2px; font-size: 11px; line-height: 1.2; color: #7a828e;">Metrics</span>
  <div style="display: flex; align-items: center; gap: 6px; height: 24px; padding: 0 8px; border-radius: 3px; color: #d5d7da; font-size: 11px; line-height: 1.2; cursor: pointer; box-sizing: border-box;">
    <span style="flex: 1 1 0; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Most connected <span style="color: #7a828e;">degree</span></span>
    <span style="flex: 0 0 auto; color: #7a828e;">1 to 4</span>
  </div>
  <div style="height: 1px; background: #374047; margin: 3px 0;"></div>
  <div title="Runs Betweenness centrality with its defaults, then sizes by it" style="display: flex; align-items: center; gap: 6px; height: 24px; padding: 0 8px; border-radius: 3px; background: #374047; color: #d5d7da; font-size: 11px; line-height: 1.2; cursor: pointer; box-sizing: border-box;">
    <span style="flex: 0 0 auto; width: 12px; height: 12px; display: inline-flex; align-items: center; justify-content: center; color: #7a828e;">
      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="5,3 13,8 5,13"></polygon></svg>
    </span>
    <span style="flex: 1 1 0; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Bridges <span style="color: #7a828e;">betweenness</span></span>
    <span style="flex: 0 0 auto; color: #7a828e;">not run</span>
  </div>
  <div title="Hubs and authorities needs a directed graph" style="display: flex; align-items: center; gap: 6px; height: 24px; padding: 0 8px; border-radius: 3px; color: #5f6873; font-size: 11px; line-height: 1.2; cursor: default; box-sizing: border-box;">
    <span style="flex: 0 0 auto; width: 12px; height: 12px; display: inline-flex; align-items: center; justify-content: center;">
      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="5,3 13,8 5,13"></polygon></svg>
    </span>
    <span style="flex: 1 1 0; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Hubs and authorities <span style="color: #7a828e;">HITS</span></span>
  </div>
</div>
```

Above the ask limit the trailing hint is the estimate (`about 40 s`) and
picking the row does not run; the row shows an inline confirm below the select,
where Cancel restores the previous attribute:

```html
<div style="display: flex; align-items: center; gap: 8px; padding: 6px 8px; border-radius: 4px; background: #2a3035; border: 1px solid #48525c; font-size: 11px; line-height: 1.4; color: #a3a8b1; box-sizing: border-box;">
  <span style="flex: 1 1 0; min-width: 0;">Bridges takes about 40 s on this graph.</span>
  <div style="display: inline-flex; align-items: center; justify-content: center; height: 24px; padding: 0 8px; border-radius: 4px; background: #4a7ee8; color: #ffffff; font-size: 11px; font-weight: 500; line-height: 1; cursor: pointer; box-sizing: border-box;">Run and use it</div>
  <div style="display: inline-flex; align-items: center; justify-content: center; height: 24px; padding: 0 8px; border-radius: 4px; background: transparent; color: #a3a8b1; font-size: 11px; font-weight: 500; line-height: 1; cursor: pointer; box-sizing: border-box;">Cancel</div>
</div>
```

Running -- the row shows the metric name with a 12px spinner, the Scale or
Palette select is already filled with the type default and editable, and the
helper line is mirrored in the status bar:

```html
<span style="font-size: 11px; line-height: 1.4; color: #7a828e;">Computing Bridges (betweenness)... 42% <span style="color: #5b8ff9; cursor: pointer;">Cancel</span></span>
```

On completion the helper line becomes the ordinary domain sentence
(`Bridges 0 to 0.35 maps to sizes 1.0 to 2.0, square root scale`), one result
card appears in Analyze, and History carries one entry for the pair:
`Ran Bridges (betweenness) and encoded it as node size`. The popover needs a
search input at the top whenever the list exceeds eight rows; not-run metrics
sort last inside Metrics and never above a file attribute; cubic and unbounded
metrics are not listed at all.

### Strings this revision standardizes

Copy these verbatim.

| Where | String |
|---|---|
| Import title row | `Import options` then dimmed `<file>, <size> -- <entry clause>` |
| Import entry clauses (six, fixed) | `delimited file`, `guessed column`, `parse error`, `second file, data already loaded`, `above the large-graph threshold`, `always show import options is on` |
| Import summary, small file | `200 nodes, 612 edges, directed, weighted by amount, timed by ts` |
| Import summary, large file | `Estimated 1.0M nodes, 10M edges (from the first 256 KB).` |
| Import grid footer | `First 5 of 617 rows. Click a header to change a column.` |
| Import guessed line | `1 column was guessed.  Review` / `Nothing was guessed.` |
| Import large-file warning | `Too big to draw everything at once: about 2.4 GB of memory. Busiest nodes is selected below, so the graph opens smoothly and the whole file still loads. Import everything anyway` |
| Load toast | `Loaded 200 nodes and 612 edges in 1 s. Mapped amount to weight, ts to time.  Details` |
| Estimate wording | `about 5 s`, `Run (about 40 s)`, `Run anyway (about 3 h)`; one significant figure; the words about, s, min, h; never a tilde |
| Collapsed group header tooltip | `4 questions in this group` |
| Coming group note | `Dimmed rows are not built yet.` |
| Settings > Appearance switch | `Show help text in place`, default off, sub-line `Off keeps every explanation one hover or tap away on the i.` |
| Settings > Performance toggle | `Show config keys`, default off |
| Machine calibration | `Detected: about 180,000 nodes on this machine.` / `Measured 4 Sep 18:02 on Apple M2 Pro, 8 cores, 8 GB.` / `Recalibrate` / `Change` / `Measuring... 2 s  Cancel` / `Set by you.  Use detected values` / `Could not measure this machine. Using safe defaults: about 200,000 nodes.  Try again  Change` |
| Status bar layout chip | `Force directed - settled` / `Force directed - step 120 of 1,000, Stop` / `Positions from file` / `Quick grid (Performance mode)` |
| Status bar issues chip | `4 data issues`, tooltip `4 issue types, 27 issues` |
| Status bar Performance chip | `Performance mode: labels 20`, with the full rule list in its tooltip |
| Notes section header | `Notes 2` (never `Notes Annotations`); legend row `Open notes` |
| Row that opens a dialog | a trailing ellipsis on the label (`More...`), never the words `Opens a dialog` |
| Style, run-and-apply | `not run` / `Bridges takes about 40 s on this graph.  Run and use it  Cancel` / `Computing Bridges (betweenness)... 42%  Cancel` / `Ran Bridges (betweenness) and encoded it as node size` |
| Style, applied encoding | `Encoded as node color` with `Change encoding` beside it |
| Table join match helper | `Best match: preferredName, 92%.` / `No column in the graph matches these values. Try Map identifiers.` |
| Attribute row menu, first three items | `Color by this`, `Size by this`, `Filter by this` |
| Merge toast | `Merged 2 nodes into acct-4471.` then two links, `Undo` and `Review conflicts` |
| Insights strip dismissal toast | `Suggestions hidden on every dataset.  Undo` |
| Help menu | `Keyboard shortcuts`, `Show suggestions`, `More suggestions (2)`, `Already run (1)`, `Documentation`, `Send feedback` |
| Data table drawer hint bar | `6 rows with issues in opened. Double-click a cell to fix it, Esc cancels. Or use Auto-fix in the validation report.` |
| Auto-fix toast | `Set 14 edge weights to 1. Undo` |
| XR return | `Back from VR` with `2 notes, 1 run (Find groups), 12 nodes expanded, 3 selected` |
| XR history group | `VR session 14:21 - 14:39`, child rows marked `by voice, in VR` |
| XR note marks | `Dictated` chip; `Flagged in VR 14:32` in the placeholder colour |
| XR refusals | `About 40 s -- run this at the desk` / `52 attributes -- read them at the desk` / `Reduced detail to keep the view smooth` |
| Narrow the view card | `Filter by type, attribute, or a result you have already run.` |

Retired by this revision: every cost-class word as label text (`heavy`,
`iterative`, `sampled`, `instant`, `cubic`, `unbounded`, `windowed`);
`N cards` on an open group header; `Opens a dialog` as a value; `Not computed`
beside a Coming tag; `Color: not encoded`; `Minimap` and `Legend` as overlay
captions (the minimap keeps its caption only in the heatmap form); `Layout:` as
a status bar label; `AI: not configured`; `1x (one step per second)`;
`Rebind` as a per-row button label; `Kind: instant (a moment)` in the Time role
popover; `Notes Annotations` as a section header.

### Register decisions (REGISTER-1.5.md)

The closed icon register -- every verb, its exact glyph path and its exact title
-- lives in `REGISTER-1.5.md` in this directory. That table is the authority
this section points at; copy from it verbatim. What follows is the part of it
that changes rules already written above.

**ARIA.** The artboards stand in for the 6.8 aria contract with the native
`title` alone. Every icon-only control carries a `title`; that string is both
the tooltip and the accessible name in the mock. No artboard carries
`aria-label`, `aria-hidden`, `aria-pressed`, `role` or `aria-expanded` -- the
18 aria-labels, 25 aria-hiddens and one aria-pressed that TableJoin carried, and
CategoryTable's one stray aria-hidden, were removed so the set is consistent and
a control with no name reads as a missing `title` rather than as a board that
opted out. `aria-label` equal to the tooltip text without the key chip,
`aria-hidden` on the glyph and `aria-pressed` on a toggle remain a production
requirement, recorded here and in spec 6.8, not something the mocks draw. The
"Icon-only button" snippet above is therefore correct as written: title, no
aria.

**Status bar layout chip.** One visible string, `Force directed - settled`, on
all 30 boards that draw it; the other states are
`Force directed - step 120 of 1,000, Stop`, `Positions from file` and
`Quick grid (Performance mode)`. The technical name lives only in the chip's own
tooltip, `title="Force directed (ngraph) - settled"`, which is the one place
`(ngraph)` may appear in the status bar. Where an entry in
ARTBOARD-CHANGES-1.5.md prescribes the `(ngraph)` form as the visible chip text,
that entry is superseded.

**Info circle.** The open popover has one geometry --
`position: absolute; left: 0; top: 20px; width: 250px; ... padding: 4px 8px;` --
and one bounded deviation: where a left-anchored 250px bubble would leave its
parent, swap `left: 0` for `right: 0`. `top` and `padding` never change and the
deviation is horizontal only. The explanation sentence also rides in the
circle's own `title`, because 6.7 asks that the same string be the control's
accessible description and a static mock cannot open a popover to show it. A
circle with no title is an unfinished circle, not a variant.

**Contiguous unshipped rows.** Three or more contiguous unshipped rows in one
list are one group: every row `color: #5f6873` and disabled, no per-row `Coming`
tag, no key chip and no icon-only control on any of them, and one `Coming` tag
plus one info circle titled `Dimmed rows are not built yet.` on the group header
or the divider above the run. A run of two, or an isolated row, keeps the
per-row tag.

**One name per verb.** These titles are now the only spelling in the set:
`Close (Esc)` for a dialog and `Close the panel (Cmd+B)` for a panel,
`Toggle inspector (D)`, `Undo (Cmd+Z)`, `Redo (Shift+Cmd+Z)`,
`Compare two views`, `Share this view`, `Export`, `Views`, `Zoom in (=)`,
`Zoom out (-)`, `Zoom to fit (0)`, `Zoom to selection (F)`, `Settings`,
`Help and keyboard shortcuts (?)`, `More`, `Pin`, `Edit`, `Delete`,
`Show on canvas`, `Copy`, `Recompute`, `Locate`, `List`, `Cards`,
`Select all visible (Cmd+A)`. A disabled control keeps its title and appends one
reason after a full stop: `. Load data first`, `. Nothing to undo yet`,
`. Nothing to redo yet`, `. Select something first`. `Re-run` is not a tooltip
in any surface -- 6.8's never list reserves it for a control that keeps its
text.

## 11. 1.6 compaction

The closed set of ten row types. `COMPACTION-1.6.md` in this directory carries
the decision procedure, the floor and the per-screen plan; this section carries
the anatomy. Every panel row in every artboard is one of RT-1 through RT-10.
There is no eleventh shape: a row that fits none of them is a floor item
(COMPACTION-1.6 section 4) or a design error.

Overrides of earlier sections:

- Section 4 "Compact text input with label": the label stack (11px label line,
  1px gap, 24px input) is **retired inside panels**. The label moves into the
  field as a 14px glyph in a 16px slot. The stack survives only in dialogs
  wider than 280px and in the Settings overlay's own forms, and even there a
  pair of related values prefers RT-1.
- Section 4 "Card": a resting card carries no description sentence. The
  sentence lives on the picker row at the moment of choosing, and in the info
  circle (10, 6.7). Result cards keep the reading.
- Section 4 "Checkbox row": a lone checkbox between field rows is not a row --
  it becomes the trailing 24px slot of the row it modifies, or a member of an
  RT-3 group. Checkbox rows come in twos or more, packed at a 24px pitch.
- Section 2 type ramp: the "control label (above an input)" role is now the
  **in-field glyph** role. Same 11px, same `#7a828e`, different place. Only
  three things are ever drawn in `#7a828e` at 11px: a glyph label, a unit
  suffix, and the name of a section that holds nothing.
- Section 3 "Controls": `section header row 32px` is confirmed and frozen. We
  do not adopt Figma's 40px header; ours is already tighter.
- Section 9 "Coming tag" and 10 "Contiguous unshipped rows": unchanged, and now
  also reachable through RT-9's repetition rule -- a tag on three or more rows
  of one list rises to the group header.

### The grid

One identity, for both the 280px activity panel and the 280px inspector:

```
16  +  108  +  8  +  108  +  8  +  24  +  8  =  280
pad    field  gut  field   gap  trail  pad
```

| Name | Value |
|---|---|
| content band | x 16 to x 272, 256px wide |
| body span (control that leaves a trailing slot) | 224px |
| pair | 108 + 8 + 108 |
| triple (segmented) | 72 + 4 + 72 + 4 + 72 |
| trailing slot | 24px at x 248..272 |
| control height | 24px |
| row pitch | 32px (24px control, 8px between) |
| toggle pitch | 24px |
| data row pitch | 28px |
| section rhythm | 1px divider / 32px header / 32n content / 8px pad |

Panel padding is therefore `0 8px 8px 16px`, not the symmetric `8px 16px 16px`
of section 3. The right side is 8px because the trailing slot is an icon button
whose glyph is optically inset.

### The field atom

Every changeable value lives in one of these. The 16px slot is the label; the
value ink begins at exactly 24px from the field's left edge; the unit is a
right-aligned dimmed suffix in the same box. The slot is the scrub handle --
`cursor: ew-resize`, pointerdown and drag changes the value -- which is what
earns the right to drop the word. On a touch pointer the glyph opens a stepper
popover instead. Every field carries a `title` equal to the word the glyph
replaced.

```html
<div style="display: flex; align-items: center; width: 108px; height: 24px; padding: 0 8px; background: #2a3035; border-radius: 4px; box-sizing: border-box;" title="Smallest node size">
  <div style="width: 16px; height: 16px; flex: 0 0 auto; display: flex; align-items: center; justify-content: center; color: #7a828e; cursor: ew-resize;">
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="5" cy="11" r="2.5"></circle><circle cx="10.5" cy="6.5" r="4"></circle></svg>
  </div>
  <span style="flex: 1; min-width: 0; font-size: 11px; line-height: 1; color: #d5d7da; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">1.0</span>
  <span style="flex: 0 0 auto; font-size: 11px; line-height: 1; color: #7a828e;">links</span>
</div>
```

Drop the unit span when the unit is implied. `px` is never written.

Placeholder: value `#5f6873`. Focused: add `box-shadow: 0 0 0 1px #5b8ff9;`.
Bound to an attribute: the glyph is filled (`fill="currentColor" stroke="none"`
on its inner shape) and the value is an attribute chip. Set earlier but not in
effect: add a 4px `#4a7ee8` square in the slot's lower-left corner.

**Field glyphs.** These are additions to the closed register and must be copied
from `REGISTER-1.5.md` once appended there. Nothing outside this list may be
drawn in a field slot; a concept with no entry keeps its word.

| Slot label | 14px inner SVG |
|---|---|
| size, smallest | `<circle cx="5" cy="11" r="2.5"></circle><circle cx="10.5" cy="6.5" r="4"></circle>` |
| width | `<line x1="2.5" y1="8" x2="13.5" y2="8"></line><polyline points="5,5.5 2.5,8 5,10.5"></polyline><polyline points="11,5.5 13.5,8 11,10.5"></polyline>` |
| opacity | `<circle cx="8" cy="8" r="5.5"></circle><path d="M8 2.5a5.5 5.5 0 0 1 0 11z" fill="currentColor" stroke="none"></path>` |
| attribute binding | `<path d="M2.5 7.2V3.5a1 1 0 0 1 1-1h3.7l6.3 6.3-4.7 4.7z"></path><circle cx="5.5" cy="5.5" r="0.75"></circle>` |
| scale, square root | `<path d="M2.5 13.5C4.5 5 8 2.5 13.5 2.5"></path>` |
| scale, linear | `<line x1="2.5" y1="13.5" x2="13.5" y2="2.5"></line>` |
| scale, log | `<path d="M2.5 13.5C8 13.5 11.5 11 13.5 2.5"></path>` |
| colour | the 14px swatch itself, no SVG |

Letters are allowed in the slot in place of a glyph, at 11px `#7a828e`, from
this closed set only: `N` nodes, `E` edges, `W` weight, `D` depth, `K` k.

### RT-1 Field row

24px controls on a 32px pitch. One 224px field, or two 108px fields, plus the
24px trailing slot. Replaces every label-above-field stack in the set. The
trailing slot holds the row's rare control (a door that opens a popover), a
12px reset `x`, or nothing.

Pair, with a reset in the trailing slot:

```html
<div style="display: flex; align-items: center; gap: 8px; height: 32px;">
  <div style="display: flex; align-items: center; width: 108px; height: 24px; padding: 0 8px; background: #2a3035; border-radius: 4px; box-sizing: border-box;" title="Smallest node size">
    <div style="width: 16px; height: 16px; flex: 0 0 auto; display: flex; align-items: center; justify-content: center; color: #7a828e; cursor: ew-resize;">
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="5" cy="11" r="2.5"></circle><circle cx="10.5" cy="6.5" r="4"></circle></svg>
    </div>
    <span style="flex: 1; min-width: 0; font-size: 11px; line-height: 1; color: #d5d7da; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">1.0</span>
  </div>
  <div style="display: flex; align-items: center; width: 108px; height: 24px; padding: 0 8px; background: #2a3035; border-radius: 4px; box-sizing: border-box;" title="Largest node size">
    <div style="width: 16px; height: 16px; flex: 0 0 auto; display: flex; align-items: center; justify-content: center; color: #7a828e; cursor: ew-resize;">
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="4.5" cy="11.5" r="1.75"></circle><circle cx="10" cy="6" r="5"></circle></svg>
    </div>
    <span style="flex: 1; min-width: 0; font-size: 11px; line-height: 1; color: #d5d7da; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">2.0</span>
  </div>
  <div style="width: 24px; height: 24px; flex: 0 0 auto; display: flex; align-items: center; justify-content: center; border-radius: 4px; color: #7a828e; cursor: pointer;" title="Clear">
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="4" x2="12" y2="12"></line><line x1="12" y1="4" x2="4" y2="12"></line></svg>
  </div>
</div>
```

Single 224px field as a select. The chevron sits **inside** the box after the
value, never in the trailing slot; the trailing slot here is a door onto the
domain and the scale.

```html
<div style="display: flex; align-items: center; gap: 8px; height: 32px;">
  <div style="display: flex; align-items: center; gap: 4px; width: 224px; height: 24px; padding: 0 8px; background: #2a3035; border-radius: 4px; box-sizing: border-box;" title="Size by attribute">
    <div style="width: 16px; height: 16px; flex: 0 0 auto; display: flex; align-items: center; justify-content: center; color: #7a828e;">
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 7.2V3.5a1 1 0 0 1 1-1h3.7l6.3 6.3-4.7 4.7z" fill="currentColor" stroke="none"></path><circle cx="5.5" cy="5.5" r="0.75" fill="#2a3035" stroke="none"></circle></svg>
    </div>
    <span style="flex: 1; min-width: 0; font-size: 11px; line-height: 1; color: #d5d7da; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">Age</span>
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#7a828e" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="flex: 0 0 auto;"><polyline points="4,6 8,10 12,6"></polyline></svg>
  </div>
  <div style="width: 24px; height: 24px; flex: 0 0 auto; display: flex; align-items: center; justify-content: center; border-radius: 4px; color: #7a828e; cursor: pointer;" title="Range and scale">
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="2.5" y1="12" x2="13.5" y2="12"></line><line x1="4.5" y1="12" x2="4.5" y2="9"></line><line x1="11.5" y1="12" x2="11.5" y2="5"></line></svg>
  </div>
</div>
```

The filled glyph on the second field says the property is bound to an
attribute; a hollow glyph says it is a fixed literal. That is the whole
`Fixed | By attribute` control, deleted five times over on StylePanel.

### RT-2 Compound row

Two or three values that belong to one thing, in one box, separated by a 1px
hairline of **panel** background so they read as one control. Never two
unrelated values.

```html
<div style="display: flex; align-items: center; gap: 8px; height: 32px;">
  <div style="display: flex; align-items: center; width: 224px; height: 24px; background: #2a3035; border-radius: 4px; box-sizing: border-box; overflow: hidden;" title="Node color and opacity">
    <div style="display: flex; align-items: center; flex: 1; min-width: 0; height: 24px; padding: 0 8px;">
      <div style="width: 16px; height: 16px; flex: 0 0 auto; display: flex; align-items: center; justify-content: center;">
        <div style="width: 14px; height: 14px; border-radius: 2px; background: #4a7ee8; border: 1px solid #48525c; box-sizing: border-box;"></div>
      </div>
      <span style="flex: 1; min-width: 0; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 11px; line-height: 1; color: #d5d7da; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">4A7EE8</span>
    </div>
    <div style="width: 1px; height: 24px; flex: 0 0 auto; background: #1f2428;"></div>
    <div style="display: flex; align-items: center; gap: 2px; flex: 0 0 auto; height: 24px; padding: 0 8px;">
      <span style="font-size: 11px; line-height: 1; color: #d5d7da;">100</span>
      <span style="font-size: 11px; line-height: 1; color: #7a828e;">%</span>
    </div>
  </div>
  <div style="width: 24px; height: 24px; flex: 0 0 auto; display: flex; align-items: center; justify-content: center; border-radius: 4px; color: #7a828e; cursor: pointer;" title="Show on canvas">
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M1.5 8s2.5-4.5 6.5-4.5S14.5 8 14.5 8s-2.5 4.5-6.5 4.5S1.5 8 1.5 8z"></path><circle cx="8" cy="8" r="2"></circle></svg>
  </div>
</div>
```

### RT-3 Icon group row

Two to six mutually exclusive options, all drawable. Track 108px for up to
three, 224px for up to six. This is the section 4 tab row track with glyphs
instead of words -- do not invent a second component.

```html
<div style="display: flex; align-items: center; gap: 8px; height: 32px;">
  <div style="display: flex; gap: 2px; width: 108px; height: 24px; padding: 1px; border-radius: 4px; background: #2a3035; box-sizing: border-box;">
    <div style="flex: 1; display: flex; align-items: center; justify-content: center; height: 22px; border-radius: 3px; background: #374047; color: #d5d7da; cursor: pointer;" title="Box">
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="10" height="10" rx="1"></rect></svg>
    </div>
    <div style="flex: 1; display: flex; align-items: center; justify-content: center; height: 22px; border-radius: 3px; color: #7a828e; cursor: pointer;" title="Sphere">
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="5"></circle><ellipse cx="8" cy="8" rx="2.25" ry="5"></ellipse></svg>
    </div>
    <div style="flex: 1; display: flex; align-items: center; justify-content: center; height: 22px; border-radius: 3px; color: #7a828e; cursor: pointer;" title="Disc">
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="8" cy="8" rx="5.5" ry="2.75"></ellipse></svg>
    </div>
  </div>
</div>
```

**Hybrid**, for options whose names we cannot afford to hide -- layout names,
scale names, method names. The glyph is on every button, the word only on the
active one. One row, current choice named, alternatives learnable by clicking.

```html
<div style="display: flex; gap: 2px; width: 224px; height: 24px; padding: 1px; border-radius: 4px; background: #2a3035; box-sizing: border-box;">
  <div style="flex: 2 1 0; display: flex; align-items: center; justify-content: center; gap: 4px; min-width: 0; height: 22px; padding: 0 6px; border-radius: 3px; background: #374047; color: #d5d7da; cursor: pointer; box-sizing: border-box;" title="Force directed">
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="flex: 0 0 auto;"><circle cx="4" cy="5" r="1.75"></circle><circle cx="12" cy="4.5" r="1.75"></circle><circle cx="7.5" cy="12" r="1.75"></circle><line x1="5.7" y1="4.9" x2="10.3" y2="4.6"></line><line x1="4.6" y1="6.6" x2="6.9" y2="10.3"></line><line x1="11.2" y1="6" x2="8.3" y2="10.4"></line></svg>
    <span style="font-size: 11px; font-weight: 500; line-height: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">Force directed</span>
  </div>
  <div style="flex: 1 1 0; display: flex; align-items: center; justify-content: center; height: 22px; border-radius: 3px; color: #7a828e; cursor: pointer;" title="Hierarchical">
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="3.5" r="1.5"></circle><circle cx="4" cy="12" r="1.5"></circle><circle cx="12" cy="12" r="1.5"></circle><path d="M8 5v2.5H4.5v3M8 7.5h3.5v3"></path></svg>
  </div>
  <div style="flex: 1 1 0; display: flex; align-items: center; justify-content: center; height: 22px; border-radius: 3px; color: #7a828e; cursor: pointer;" title="Radial">
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="1.5"></circle><circle cx="8" cy="8" r="5.5" stroke-dasharray="2 2"></circle><circle cx="13" cy="8" r="1"></circle><circle cx="4.4" cy="4.9" r="1"></circle><circle cx="5.4" cy="12" r="1"></circle></svg>
  </div>
</div>
```

Threshold: 2 to 6 drawable options become a group; more than 6, or a difference
that is conceptual rather than visual, stays a select in RT-1. Never convert a
legible checkbox into an icon group -- Figma tried it on `Clip content` and
reverted.

### RT-4 Ramp row

The value is drawn at row size, so the sentence describing it is deleted. Two
forms: a size wedge and a colour ramp. The trailing slot holds the scale-curve
glyph, which opens the RT-3 group of three.

```html
<div style="display: flex; align-items: center; gap: 4px; height: 32px;">
  <span style="flex: 0 0 auto; font-size: 11px; line-height: 1; color: #7a828e;">45</span>
  <div style="flex: 1; min-width: 120px; height: 14px; background: #7a828e; clip-path: polygon(0 100%, 100% 0, 100% 100%);"></div>
  <span style="flex: 0 0 auto; font-size: 11px; line-height: 1; color: #7a828e;">68</span>
  <div style="width: 24px; height: 24px; flex: 0 0 auto; margin-left: 4px; display: flex; align-items: center; justify-content: center; border-radius: 4px; color: #7a828e; cursor: pointer;" title="Square root scale">
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 13.5C4.5 5 8 2.5 13.5 2.5"></path></svg>
  </div>
</div>
```

Colour form: replace the wedge div with the section 9 gradient bar at
`height: 14px; border-radius: 2px; border: 1px solid #48525c;`.

This one row replaces `Age 45 to 68 maps to sizes 1.0 to 2.0, square root
scale.` and the legend string `1 to 4, sqrt scale`. **On the canvas legend the
scale keeps its word** -- the legend travels inside an exported image where no
one can hover a glyph.

### RT-5 Toggle row

A boolean whose concept has no glyph in the register. The label is the only
word on the row, and the verb is deleted from it: `Show labels` becomes
`Labels`, `Animate transitions` becomes `Transitions`. Packed at a 24px pitch,
never alone -- a lone boolean becomes the trailing slot of the row it modifies.

```html
<div style="display: flex; flex-direction: column;">
  <div style="display: flex; align-items: center; gap: 4px; height: 24px; cursor: pointer;">
    <div style="width: 16px; height: 16px; flex: 0 0 auto; border-radius: 2px; background: #4a7ee8; display: flex; align-items: center; justify-content: center; box-sizing: border-box;">
      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3.5,8.5 6.5,11.5 12.5,5"></polyline></svg>
    </div>
    <span style="font-size: 11px; line-height: 1.2; color: #d5d7da;">Labels</span>
  </div>
  <div style="display: flex; align-items: center; gap: 4px; height: 24px; cursor: pointer;">
    <div style="width: 16px; height: 16px; flex: 0 0 auto; border-radius: 2px; background: #2a3035; border: 1px solid #48525c; box-sizing: border-box;"></div>
    <span style="font-size: 11px; line-height: 1.2; color: #d5d7da;">Transitions</span>
  </div>
</div>
```

### RT-6 Data row

The user's own strings. **The one place a left-hand text label column is
correct**, because an id, a node label, an attribute name or a filename is data
and data cannot be given a glyph. The repeated unit word rides on the column
header, never on the rows.

```html
<div style="display: flex; flex-direction: column; gap: 1px;">
  <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; height: 20px; padding: 0 8px; box-sizing: border-box;">
    <span style="font-size: 11px; line-height: 1.2; color: #7a828e;">Most connected</span>
    <span style="font-size: 11px; line-height: 1.2; color: #7a828e;">links</span>
  </div>
  <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; height: 28px; padding: 0 8px; border-radius: 4px; color: #d5d7da; font-size: 12px; line-height: 1.2; cursor: pointer; box-sizing: border-box;">
    <span style="min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">Mr_Whiskers</span>
    <span style="flex: 0 0 auto; font-size: 11px; color: #7a828e;">4</span>
  </div>
  <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; height: 28px; padding: 0 8px; border-radius: 4px; color: #d5d7da; font-size: 12px; line-height: 1.2; cursor: pointer; box-sizing: border-box;">
    <span style="min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">Mrs_Henderson</span>
    <span style="flex: 0 0 auto; font-size: 11px; color: #7a828e;">4</span>
  </div>
  <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; height: 28px; padding: 0 8px; border-radius: 4px; color: #d5d7da; font-size: 12px; line-height: 1.2; cursor: pointer; box-sizing: border-box;">
    <span style="min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">Chonky_Boy</span>
    <span style="flex: 0 0 auto; font-size: 11px; color: #7a828e;">3</span>
  </div>
</div>
```

A rank chip replaces `Rank 6 of 318` on a metric row:
`<div style="display: inline-flex; align-items: center; height: 14px; padding: 0 4px; border-radius: 7px; background: #374047; color: #a3a8b1; font-size: 9px; font-weight: 500; line-height: 1;">#6</div>`

### RT-7 Action row

State on the left, resident. Actions on the right, hidden until row hover --
except on a touch pointer, where every glyph is resident. Verbs from
`REGISTER-1.5.md` 1.6 keep their text: `Run` in every form, `Cancel`, every
label ending in `anyway`, every destructive verb.

```html
<div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; height: 32px;">
  <span style="min-width: 0; font-size: 11px; line-height: 1.2; color: #7a828e; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">20 nodes</span>
  <div style="display: flex; align-items: center; gap: 4px; flex: 0 0 auto;">
    <div style="width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; border-radius: 4px; color: #7a828e; cursor: pointer;" title="Parameters">
      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6,4 10,8 6,12"></polyline></svg>
    </div>
    <div style="width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; border-radius: 4px; color: #7a828e; cursor: pointer;" title="Copy reading">
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="5.5" y="5.5" width="8" height="8" rx="1"></rect><path d="M10.5 5.5v-2a1 1 0 0 0-1-1h-6a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2"></path></svg>
    </div>
    <div style="display: inline-flex; align-items: center; justify-content: center; height: 24px; padding: 0 8px; border-radius: 4px; background: #4a7ee8; color: #ffffff; font-size: 11px; font-weight: 500; line-height: 1; cursor: pointer; box-sizing: border-box;">Run</div>
  </div>
</div>
```

### RT-8 Section header

32px, divider above, name 12px/500. **`#d5d7da` when the section holds a value;
`#7a828e` when it holds none.** The header carries the section's verbs, so no
row inside it spends width on an action button.

Live section:

```html
<div style="display: flex; flex-direction: column;">
  <div style="height: 1px; background: #495057;"></div>
  <div style="display: flex; align-items: center; justify-content: space-between; height: 32px; cursor: pointer;">
    <div style="display: flex; align-items: center; gap: 4px; min-width: 0;">
      <div style="width: 16px; height: 16px; flex: 0 0 auto; display: flex; align-items: center; justify-content: center; color: #7a828e;">
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="4,6 8,10 12,6"></polyline></svg>
      </div>
      <span style="font-size: 12px; font-weight: 500; line-height: 1.2; color: #d5d7da;">Size</span>
    </div>
    <div style="display: flex; gap: 4px; flex: 0 0 auto;">
      <div style="width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; border-radius: 4px; color: #7a828e; cursor: pointer;" title="Recompute">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 8a5.5 5.5 0 1 0 1.6-3.9"></path><polyline points="2.5,2.5 2.5,6 6,6"></polyline></svg>
      </div>
    </div>
  </div>
</div>
```

Empty section -- the whole thing. Dimmed name, one `+`, no content rows, no
`Not set`, no `Default`, no `None`, no empty-state sentence. Dimming the name
says it, and the row of dim headers is a scannable inventory of what you have
not done yet.

```html
<div style="display: flex; flex-direction: column;">
  <div style="height: 1px; background: #495057;"></div>
  <div style="display: flex; align-items: center; justify-content: space-between; height: 32px; cursor: pointer;">
    <div style="display: flex; align-items: center; gap: 4px; min-width: 0;">
      <div style="width: 16px; height: 16px; flex: 0 0 auto;"></div>
      <span style="font-size: 12px; font-weight: 500; line-height: 1.2; color: #7a828e;">Edge properties</span>
    </div>
    <div style="width: 24px; height: 24px; flex: 0 0 auto; display: flex; align-items: center; justify-content: center; border-radius: 4px; color: #7a828e; cursor: pointer;" title="Add an edge style layer">
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="3" x2="8" y2="13"></line><line x1="3" y1="8" x2="13" y2="8"></line></svg>
    </div>
  </div>
</div>
```

A section the **data** cannot support does not render at all -- not collapsed,
not dimmed, not with a `+`. Temporal sections on an untimed graph, bipartite
cards on a non-bipartite graph, `Weight` and `Treat as` on an unweighted graph.
Sections keep a fixed order regardless of which members render.

### RT-9 Chart row

A distribution drawn instead of the numbers that summarise it. One pitch (32px,
a 24px sparkline) or two (64px, a 56px histogram). Never any other height.
Always label the two axis ends, so the chart degrades into a picture of the
table it replaced.

Degree distribution of the cat graph -- 2 links: 5, 3 links: 12, 4 links: 3 --
replacing `Links per node (degree distribution): min 2, median 3, max 4, std
dev 0.62`:

```html
<div style="display: flex; flex-direction: column; gap: 2px; height: 64px;">
  <div style="display: flex; align-items: flex-end; gap: 2px; height: 42px;">
    <div style="flex: 1; height: 18px; background: #48525c; border-radius: 1px;" title="2 links: 5 nodes"></div>
    <div style="flex: 1; height: 42px; background: #4a7ee8; border-radius: 1px;" title="3 links: 12 nodes"></div>
    <div style="flex: 1; height: 11px; background: #48525c; border-radius: 1px;" title="4 links: 3 nodes"></div>
  </div>
  <div style="height: 1px; background: #48525c;"></div>
  <div style="display: flex; align-items: center; justify-content: space-between; height: 13px;">
    <span style="font-size: 11px; line-height: 1; color: #7a828e;">2</span>
    <span style="font-size: 11px; line-height: 1; color: #7a828e;">4</span>
  </div>
</div>
```

One-pitch micro-bar, carrying a percentile where `0.31, 98th percentile` and
`Rank 6 of 318` used to be two lines:

```html
<div style="display: flex; align-items: center; gap: 8px; height: 32px;">
  <span style="flex: 1; min-width: 0; font-size: 12px; line-height: 1.2; color: #d5d7da; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">Bridges</span>
  <div style="flex: 0 0 64px; height: 4px; border-radius: 2px; background: #374047; position: relative;" title="98th percentile">
    <div style="position: absolute; left: 0; top: 0; width: 98%; height: 4px; border-radius: 2px; background: #4a7ee8;"></div>
  </div>
  <span style="flex: 0 0 auto; font-size: 11px; line-height: 1; color: #d5d7da;">0.31</span>
  <div style="display: inline-flex; align-items: center; flex: 0 0 auto; height: 14px; padding: 0 4px; border-radius: 7px; background: #374047; color: #a3a8b1; font-size: 9px; font-weight: 500; line-height: 1; box-sizing: border-box;">#6</div>
</div>
```

The exact statistics stay reachable in `Copy methods text` and the export. A
chart never removes the last path to a number a methods section needs.

### RT-10 Prose block

The only place multi-sentence text is allowed, and it exists solely to hold the
floor. **Three sanctioned instances and no fourth.** An explanation is not a
prose block: it is deleted when it restates something on the same screen, and
otherwise goes in the info circle (section 10).

The reading -- on screen, in full, never behind a circle, at any density, width
or Settings value. Two sentences and 220 characters, maximum.

```html
<div style="font-size: 12px; line-height: 1.5; color: #a3a8b1;">17 cats, 1 dog and 2 humans, connected by 29 relationships. Everyone is connected to everyone else through at most 5 steps.</div>
```

The departure line -- **drawn only when there is a departure**. An exact,
complete, unfiltered run draws nothing here, which is what makes the line loud
when it does appear. Departures only: never `Exact.`, never the scope that the
panel header already states.

```html
<div style="display: flex; align-items: flex-start; gap: 4px;">
  <div style="width: 16px; height: 16px; flex: 0 0 auto; display: flex; align-items: center; justify-content: center; color: #f7b731;">
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2.5l6 11H2z"></path><line x1="8" y1="6.5" x2="8" y2="9.5"></line><line x1="8" y1="11.5" x2="8" y2="11.75"></line></svg>
  </div>
  <span style="font-size: 11px; line-height: 1.4; color: #d5d7da;">Approximate (sample of 200). Largest connected part only, 188 of 200 nodes.</span>
</div>
```

The run record -- one line, naming only what differs from the panel header's
scope and weight. Details behind the chevron carry the timestamp, duration,
library version, and the weight and direction treatment.

```html
<div style="display: flex; align-items: center; gap: 4px; height: 20px;">
  <span style="flex: 1; min-width: 0; font-size: 11px; line-height: 1.4; color: #7a828e; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">Louvain, resolution 1.0, seed 42</span>
  <div style="width: 16px; height: 16px; flex: 0 0 auto; display: flex; align-items: center; justify-content: center; color: #7a828e; cursor: pointer;" title="Details">
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6,4 10,8 6,12"></polyline></svg>
  </div>
</div>
```

### The escape hatch

`Settings > Appearance > Show labels on controls`, defaulting **off**, turns
every in-field glyph into a glyph plus its word -- Figma's own `Property
labels` preference, and the thing that makes an icon-first panel defensible to
a first-time user. In that mode an RT-1 pair row becomes two RT-1 single rows
and the panel roughly doubles in height. Every layout must survive it: a pair
degrades to two singles, never to a two-line stack. Draw the row as a section 4
labelled control with the glyph kept in the field:

```html
<div style="display: flex; align-items: center; gap: 8px; height: 32px;">
  <span style="flex: 0 0 76px; font-size: 11px; line-height: 1.2; color: #7a828e;">Smallest</span>
  <div style="display: flex; align-items: center; flex: 1; min-width: 0; height: 24px; padding: 0 8px; background: #2a3035; border-radius: 4px; box-sizing: border-box;">
    <div style="width: 16px; height: 16px; flex: 0 0 auto; display: flex; align-items: center; justify-content: center; color: #7a828e; cursor: ew-resize;">
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="5" cy="11" r="2.5"></circle><circle cx="10.5" cy="6.5" r="4"></circle></svg>
    </div>
    <span style="flex: 1; min-width: 0; font-size: 11px; line-height: 1; color: #d5d7da;">1.0</span>
  </div>
</div>
```

## 12. 1.7 additions

Spec revision 1.7 (sections 5.1, 5.2, 5.3, 5.4, 5.6, 6.2, 6.3, 6.8, 6.9, 6.10,
6.11 new, 11, 12). The decisions these snippets serve are in `DECISIONS-1.7.md`;
that document names which artboards change and carries the direction accounting.
Every snippet below is complete; copy it verbatim and change only the text.

Overrides of earlier sections:

- Section 11 "The ten row types": unchanged, and still closed. A pop-out is a
  **surface**, not an eleventh shape -- its rows are RT-1 through RT-10, exactly
  as a panel's, an inspector's, a dialog's or a drawer's are. The stub a
  gear's contents leave behind is an ordinary RT-8 section header that still
  opens onto its own resident rows; its trailing slot carries the one fact that
  says what is behind the gear when the section is closed. **Withdrawn by
  `SECTIONS-1.9.md` D1:** the clause that let that chevron stay in the closed
  right-pointing form permanently. There is no permanently-closed form, and a
  chevron that reveals nothing is a defect.
- Section 4 "Tooltip / popover background": the `#2a3035` bubble is for tooltips
  and info circles only. A **pop-out** takes the panel background `#1f2428`,
  because it holds panel rows whose fields are `#2a3035` and those fields would
  vanish on a `#2a3035` ground.
- Section 4 "Card" and section 3 "Radii": the canvas toolbar is the one surface
  in the set with a 7px radius and the only canvas overlay with a shadow. Both
  are deliberate two-value exceptions (concentric padding, and lift as the mark
  of an instrument), not the start of a general floating style. The minimap and
  the legend stay flat at radius 4.
- Section 5 "Rail icons" / REGISTER-1.5 section 1.6: still closed, and **1.7
  adds no glyph**. The save and load pair keeps its text, the pop-out reuses the
  existing 12px disclosure caret and 24px close X, and the toolbar reuses the
  five zoom and view glyphs already registered.
- REGISTER-1.5 section 1.1: the settings glyph's object form `Time slider
  settings (T)` loses its key chip and becomes `Time slider settings`. 5.6 binds
  `T` to toggling the slider, and a control may not print a binding it does not
  own.
- Section 9 "Modal dialog frame": unchanged, and now explicitly the tier **3b**
  form. Tier 3a is the pop-out below: no scrim, no focus trap, the canvas live.

### Pop-out container, anchored form (6.11, 6.2 tier 3a)

The 3a surface. No scrim and no focus trap: the canvas keeps pointer and
keyboard, the selection keeps flowing, every change previews live, Escape closes
and returns focus to the opener. One per region.

Widths are a ladder of three and are never invented per case. **280** reuses the
panel identity `16 + 108 + 8 + 108 + 8 + 24 + 8` and is for field rows. **360**
gives a 336px content band and is for a sentence-plus-user-ids report or a three
or four column numeric table. **480** is the ceiling, only for a
two-dimensional matrix or a plot, because at 1440 the canvas band is 832px and a
480 pop-out still leaves 344px of graph.

Anchoring: an activity-panel pop-out opens right with its left edge at `x = 336`,
8px clear of the panel's 328 edge; an inspector pop-out opens left with its right
edge 8px clear of the inspector; a canvas-overlay pop-out sits 8px above its
overlay. Vertical flip when the bottom would cross the status bar; **never a
horizontal flip**, because a pop-out that crosses the shell stops meaning "this
panel's". Height is capped at the owning region's height minus 32 and the pop-out
scrolls internally; it never scrolls the panel behind it.

The 360 form, anchored to the Data panel's Validation report stub, drawn with two
body rows of real copy:

```html
<div style="position: absolute; left: 336px; top: 148px; width: 360px; max-height: 640px; display: flex; flex-direction: column; background: #1f2428; border: 1px solid #48525c; border-radius: 4px; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45); box-sizing: border-box; overflow: hidden; z-index: 8;">
  <div style="display: flex; align-items: center; gap: 4px; height: 32px; padding: 0 4px 0 12px; flex: 0 0 auto; box-sizing: border-box;">
    <span style="font-size: 12px; font-weight: 500; line-height: 1.2; color: #d5d7da; white-space: nowrap;">Validation report</span>
    <span style="flex: 1; min-width: 0; font-size: 11px; line-height: 1.2; color: #7a828e; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">Re-ran after step 2</span>
    <div style="width: 24px; height: 24px; flex: 0 0 auto; display: flex; align-items: center; justify-content: center; border-radius: 4px; color: #7a828e; cursor: pointer;" title="Pin this open">
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2.5h4l-.5 3.5 2 2.5H4.5l2-2.5z"></path><line x1="8" y1="8.5" x2="8" y2="13.5"></line></svg>
    </div>
    <div style="width: 24px; height: 24px; flex: 0 0 auto; display: flex; align-items: center; justify-content: center; border-radius: 4px; color: #7a828e; cursor: pointer;" title="Close (Esc)">
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="4" x2="12" y2="12"></line><line x1="12" y1="4" x2="4" y2="12"></line></svg>
    </div>
  </div>
  <div style="flex: 1; min-height: 0; overflow-y: auto; padding: 0 12px 12px; box-sizing: border-box;">
    <div style="display: flex; flex-direction: column; gap: 4px; padding: 8px 0;">
      <div style="display: flex; align-items: flex-start; gap: 4px;">
        <div style="width: 16px; height: 16px; flex: 0 0 auto; display: flex; align-items: center; justify-content: center; color: #f7b731;">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2.5l6 11H2z"></path><line x1="8" y1="6.5" x2="8" y2="9.5"></line><line x1="8" y1="11.5" x2="8" y2="11.75"></line></svg>
        </div>
        <span style="flex: 1; min-width: 0; font-size: 12px; line-height: 1.4; color: #d5d7da;">14 edges have no amount. Analyze uses weight 1. Median is 240.</span>
      </div>
      <div style="font-size: 11px; line-height: 1.4; color: #7a828e; padding-left: 20px;">acct-41 to acct-88, acct-88 to acct-130, acct-130 to acct-204  <span style="color: #5b8ff9; cursor: pointer;">Show more</span></div>
      <div style="display: flex; align-items: center; gap: 8px; padding-left: 20px;">
        <span style="font-size: 11px; line-height: 1; color: #5b8ff9; cursor: pointer;">Show rows</span>
        <span style="font-size: 11px; line-height: 1; color: #5b8ff9; cursor: pointer;">Auto-fix</span>
        <span style="font-size: 11px; line-height: 1; color: #5b8ff9; cursor: pointer;">Ignore</span>
      </div>
    </div>
    <div style="height: 1px; background: #495057;"></div>
    <div style="display: flex; align-items: center; gap: 4px; height: 28px;">
      <div style="width: 16px; height: 16px; flex: 0 0 auto; display: flex; align-items: center; justify-content: center; color: #61d095;">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3.5,8.5 6.5,11.5 12.5,5"></polyline></svg>
      </div>
      <span style="flex: 1; min-width: 0; font-size: 12px; line-height: 1.2; color: #7a828e;">8 mixed-form ids. Fixed by step 2</span>
    </div>
  </div>
</div>
```

Inside a pop-out the actions are **resident**, not hover-revealed. That is a
deliberate local override of RT-7's hover split: at 360 there is room, and floor
item 4 wants their full text.

The header the pop-out is opened FROM is an ordinary RT-8 section header, and it
**opens**. A section expands in place, a chevron renders only where it opens onto
resident rows, and a pop-out is an addition to a section that already draws
content -- never the section itself (`SECTIONS-1.9.md` D1). So this 360 is not
the Validation report; it is what the Validation report's gear holds. The header
carries its state mark while the section is CLOSED -- here the highest severity's
glyph and the count -- and its rows plus that gear once it is OPEN (D5). Closed,
with the mark:

```html
<div style="display: flex; flex-direction: column;">
  <div style="height: 1px; background: #495057;"></div>
  <div title="Validation report. 4 types" style="display: flex; align-items: center; justify-content: space-between; height: 32px; cursor: pointer;">
    <div style="display: flex; align-items: center; gap: 4px; min-width: 0;">
      <div style="width: 16px; height: 16px; flex: 0 0 auto; display: flex; align-items: center; justify-content: center; color: #7a828e;">
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6,4 10,8 6,12"></polyline></svg>
      </div>
      <span style="font-size: 12px; font-weight: 500; line-height: 1.2; color: #d5d7da;">Validation report</span>
    </div>
    <div style="display: flex; align-items: center; gap: 4px; flex: 0 0 auto; padding-right: 8px;">
      <div style="width: 16px; height: 16px; display: flex; align-items: center; justify-content: center; color: #f7b731;">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2.5l6 11H2z"></path><line x1="8" y1="6.5" x2="8" y2="9.5"></line><line x1="8" y1="11.5" x2="8" y2="11.75"></line></svg>
      </div>
      <span style="font-size: 11px; line-height: 1; color: #7a828e; white-space: nowrap;">4 types</span>
    </div>
  </div>
</div>
```

Open, the mark goes and the rows say it (Rule 8). The report expanded, in the
256px band, at four rows: three amber issue rows, one line each -- the severity
glyph, the name with its count, and that issue's one primary verb -- and the
green line for the warning a cleaning step already closed. The reduction from
each card's four verbs to one is what buys the line: `Preview`, `Show rows`,
`Change` and `Ignore` go behind the gear with the consequence sentences, the
example ids and `Show more`, the remaining amber type, the `Info (3)` group and
`Re-ran after step 2`. The gear draws in the primary ink because a fourth amber
type is behind it, and its title names what the rows do not -- the stub
obligation applied to the gear rather than to the header (14.1, A6).

```html
<div style="display: flex; flex-direction: column;">
  <div style="height: 1px; background: #495057;"></div>
  <div style="display: flex; align-items: center; justify-content: space-between; height: 32px;">
    <div style="display: flex; align-items: center; gap: 4px; min-width: 0; cursor: pointer;" title="Collapse Validation report">
      <div style="width: 16px; height: 16px; flex: 0 0 auto; display: flex; align-items: center; justify-content: center; color: #7a828e;">
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="4,6 8,10 12,6"></polyline></svg>
      </div>
      <span style="font-size: 12px; font-weight: 500; line-height: 1.2; color: #d5d7da;">Validation report</span>
    </div>
    <div title="Validation report detail. 1 more issue, 3 info, re-ran after step 2" style="width: 24px; height: 24px; flex: 0 0 auto; display: flex; align-items: center; justify-content: center; border-radius: 4px; color: #d5d7da; cursor: pointer; box-sizing: border-box;">
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="2.25"></circle><circle cx="8" cy="8" r="4.75"></circle><path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M3.4 12.6l1.4-1.4M11.2 4.8l1.4-1.4"></path></svg>
    </div>
  </div>

  <div style="display: flex; flex-direction: column; padding-bottom: 8px;">
    <div style="display: flex; align-items: center; gap: 4px; height: 28px;" title="14 edges have no amount. Analyze uses weight 1. Median is 240.">
      <div style="width: 16px; height: 16px; flex: 0 0 auto; display: flex; align-items: center; justify-content: center; color: #f7b731;">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2.5l6 11H2z"></path><line x1="8" y1="6.5" x2="8" y2="9.5"></line><line x1="8" y1="11.5" x2="8" y2="11.75"></line></svg>
      </div>
      <span style="flex: 1; min-width: 0; font-size: 12px; line-height: 1.2; color: #d5d7da; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">No amount, 14 edges</span>
      <span style="flex: 0 0 auto; font-size: 11px; line-height: 1; color: #5b8ff9; cursor: pointer;">Auto-fix</span>
    </div>
    <div style="display: flex; align-items: center; gap: 4px; height: 28px;" title="6 opened values are not dates. The time slider skips them.">
      <div style="width: 16px; height: 16px; flex: 0 0 auto; display: flex; align-items: center; justify-content: center; color: #f7b731;">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2.5l6 11H2z"></path><line x1="8" y1="6.5" x2="8" y2="9.5"></line><line x1="8" y1="11.5" x2="8" y2="11.75"></line></svg>
      </div>
      <span style="flex: 1; min-width: 0; font-size: 12px; line-height: 1.2; color: #d5d7da; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">Not dates, 6 opened values</span>
      <span style="flex: 0 0 auto; font-size: 11px; line-height: 1; color: #5b8ff9; cursor: pointer;">Show rows</span>
    </div>
    <div style="display: flex; align-items: center; gap: 4px; height: 28px;" title="5 repeated pairs. 617 rows collapsed into 612 edges, weights summed.">
      <div style="width: 16px; height: 16px; flex: 0 0 auto; display: flex; align-items: center; justify-content: center; color: #f7b731;">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2.5l6 11H2z"></path><line x1="8" y1="6.5" x2="8" y2="9.5"></line><line x1="8" y1="11.5" x2="8" y2="11.75"></line></svg>
      </div>
      <span style="flex: 1; min-width: 0; font-size: 12px; line-height: 1.2; color: #d5d7da; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">Repeated pairs, 5</span>
      <span style="flex: 0 0 auto; font-size: 11px; line-height: 1; color: #5b8ff9; cursor: pointer;">Show rows</span>
    </div>
    <div style="display: flex; align-items: center; gap: 4px; height: 28px;" title="8 mixed-form ids were made consistent by cleaning step 2.">
      <div style="width: 16px; height: 16px; flex: 0 0 auto; display: flex; align-items: center; justify-content: center; color: #61d095;">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3.5,8.5 6.5,11.5 12.5,5"></polyline></svg>
      </div>
      <span style="flex: 1; min-width: 0; font-size: 12px; line-height: 1.2; color: #7a828e; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">8 mixed-form ids. Fixed by step 2</span>
    </div>
  </div>
</div>
```

While its pop-out is open the gear's owning row carries the selected-row
background `#28364e`, so the pop-out is visibly the thing that row opened. The
clause is unchanged; only its subject is, from a section that was a door to the
header row whose gear the pop-out belongs to.

### Canvas toolbar (5.6, 5.1)

The 5.6 navigation cluster, rotated and moved to the bottom centre of the live
canvas rect. Centred with `left: 50%; transform: translateX(-50%)`, never on the
window. Bottom offset is 12 above whatever the canvas floor currently is: **12**
plain, **82** with the time slider on, **272** with the Data table drawer open,
**342** with both. The item set is fixed -- nothing appears or disappears with
selection -- because a centred bar that changes width moves every item under the
pointer.

Derived width, desktop: `3 + 60 + 12 + (28*4 + 2*3) + 12 + 36 + 3 + 2 borders =
246`. Below 1280px, 6.8 point 3 takes the items to 32 with a 16px glyph, the
segmented to 68 and Views to 40, giving `274` at height 40; nothing else changes.

```html
<div style="position: absolute; left: 50%; bottom: 12px; transform: translateX(-50%); display: inline-flex; align-items: center; height: 36px; padding: 3px; border-radius: 7px; background: #1f2428; border: 1px solid #48525c; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45); box-sizing: border-box; z-index: 6;">
  <div style="display: flex; align-items: center; width: 60px; height: 28px; padding: 1px; border-radius: 4px; background: #2a3035; box-sizing: border-box;">
    <div style="flex: 1; height: 26px; display: flex; align-items: center; justify-content: center; border-radius: 3px; font-size: 11px; font-weight: 500; line-height: 1; color: #7a828e; cursor: pointer;">2D</div>
    <div style="flex: 1; height: 26px; display: flex; align-items: center; justify-content: center; border-radius: 3px; background: #374047; font-size: 11px; font-weight: 500; line-height: 1; color: #d5d7da; cursor: pointer;">3D</div>
  </div>
  <div style="width: 12px; height: 28px; display: flex; align-items: center; justify-content: center;"><div style="width: 1px; height: 16px; background: #48525c;"></div></div>
  <div style="width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; border-radius: 4px; color: #a3a8b1; cursor: pointer;" title="Zoom out (-)">
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="7" cy="7" r="4.5"></circle><line x1="10.5" y1="10.5" x2="14" y2="14"></line><line x1="5" y1="7" x2="9" y2="7"></line></svg>
  </div>
  <div style="width: 2px;"></div>
  <div style="width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; border-radius: 4px; color: #a3a8b1; cursor: pointer;" title="Zoom in (=)">
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="7" cy="7" r="4.5"></circle><line x1="10.5" y1="10.5" x2="14" y2="14"></line><line x1="7" y1="5" x2="7" y2="9"></line><line x1="5" y1="7" x2="9" y2="7"></line></svg>
  </div>
  <div style="width: 2px;"></div>
  <div style="width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; border-radius: 4px; color: #a3a8b1; cursor: pointer;" title="Zoom to fit (0)">
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 6V2.5H6"></path><path d="M10 2.5h3.5V6"></path><path d="M13.5 10v3.5H10"></path><path d="M6 13.5H2.5V10"></path></svg>
  </div>
  <div style="width: 2px;"></div>
  <div style="width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; border-radius: 4px; color: #5f6873; cursor: default;" title="Zoom to selection (F). Select something first">
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 6V2.5H6"></path><path d="M10 2.5h3.5V6"></path><path d="M13.5 10v3.5H10"></path><path d="M6 13.5H2.5V10"></path><circle cx="8" cy="8" r="2"></circle></svg>
  </div>
  <div style="width: 12px; height: 28px; display: flex; align-items: center; justify-content: center;"><div style="width: 1px; height: 16px; background: #48525c;"></div></div>
  <div style="display: flex; align-items: center; justify-content: center; gap: 2px; width: 36px; height: 28px; border-radius: 4px; color: #a3a8b1; cursor: pointer;" title="Views">
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2l5.5 3v6L8 14l-5.5-3V5z"></path><path d="M8 8l5.5-3M8 8v6M8 8L2.5 5"></path></svg>
    <svg width="8" height="8" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3,10 8,5 13,10"></polyline></svg>
  </div>
</div>
```

The Views caret points **up** and its menu opens upward, bottom edge 4px above
the bar, clamped 12px inside the canvas edges. The zoom percentage is **not** in
the bar: the status bar owns it, the bar sits 12px above the status bar so the
number is already adjacent to the buttons that change it, and a numeric readout
would change the bar's width as the number changed.

The minimap keeps `left: 12px` and the legend the bottom right, both on the
toolbar's baseline, both hidden while the Data table drawer is open. Below 622px
of canvas -- 650 in the narrow variant -- they rise 48px onto a second line
rather than hiding, because the legend is floor item 5 and a hidden minimap would
make its own `M` toggle lie.

### Save and load control pair (5.3 "Saved things", 6.9 RT-8 and RT-6)

Three verbs and no fourth: `Save as <kind>...` writes a named entry to this
browser, `Import <kind>...` reads a file into the library, `Export <kind> (JSON)`
writes one entry to a file. **Applying is the row click and gets no verb**, which
is what keeps the panels from growing an Apply button per row. `Load` is retired
from this vocabulary: the word is spent on data.

The library header. The `+` is **resident whether the section is empty or full**
-- a one-clause amendment to RT-7's hover split, because saving your first style
is a first-visit verb. The Import and Export pair keeps its text and lives in the
section overflow, never in the panel header:

```html
<div style="display: flex; flex-direction: column;">
  <div style="height: 1px; background: #495057;"></div>
  <div style="display: flex; align-items: center; justify-content: space-between; height: 32px; cursor: pointer;">
    <div style="display: flex; align-items: center; gap: 4px; min-width: 0;">
      <div style="width: 16px; height: 16px; flex: 0 0 auto; display: flex; align-items: center; justify-content: center; color: #7a828e;">
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="4,6 8,10 12,6"></polyline></svg>
      </div>
      <span style="font-size: 12px; font-weight: 500; line-height: 1.2; color: #d5d7da;">Styles</span>
      <div style="width: 14px; height: 14px; flex: 0 0 auto; display: flex; align-items: center; justify-content: center; color: #a3a8b1; cursor: pointer;" title="Saved in this browser on this computer. Export a file to move it.">
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="6.5"></circle><line x1="8" y1="7" x2="8" y2="11.5"></line><line x1="8" y1="4.5" x2="8" y2="4.75"></line></svg>
      </div>
    </div>
    <div style="display: flex; gap: 4px; flex: 0 0 auto;">
      <div style="width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; border-radius: 4px; color: #7a828e; cursor: pointer;" title="More">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="3.5" r="0.75"></circle><circle cx="8" cy="8" r="0.75"></circle><circle cx="8" cy="12.5" r="0.75"></circle></svg>
      </div>
      <div style="width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; border-radius: 4px; color: #7a828e; cursor: pointer;" title="Save as style...">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="3" x2="8" y2="13"></line><line x1="3" y1="8" x2="13" y2="8"></line></svg>
      </div>
    </div>
  </div>
</div>
```

A library row is RT-6 at 28px: the user's own name, a trailing dimmed value, and
the row verb triple on hover with the **visibility slot left empty** -- rename,
nothing, delete. A built-in carries the dimmed word `built-in` and no verbs; an
entry whose dataset is not open draws at `#5f6873` with its reason in the title
and no hover affordances, because floor item 7 outranks Rule 7c for the user's
own saved names.

```html
<div style="display: flex; flex-direction: column;">
  <div style="display: flex; align-items: center; gap: 8px; height: 28px; padding: 0 8px 0 16px; background: #28364e; box-sizing: border-box;">
    <span style="flex: 1; min-width: 0; font-size: 12px; line-height: 1.2; color: #d5d7da; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">Publication style</span>
    <div style="width: 24px; height: 24px; flex: 0 0 auto; display: flex; align-items: center; justify-content: center; border-radius: 4px; color: #7a828e; cursor: pointer;" title="Rename">
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11.2 2.3l2.5 2.5-8 8-3.2.7.7-3.2z"></path><line x1="9.6" y1="3.9" x2="12.1" y2="6.4"></line></svg>
    </div>
    <div style="width: 24px; height: 24px; flex: 0 0 auto;"></div>
    <div style="width: 24px; height: 24px; flex: 0 0 auto; display: flex; align-items: center; justify-content: center; border-radius: 4px; color: #7a828e; cursor: pointer;" title="Delete">
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 4.5h10M6.5 4.5v-2h3v2M4 4.5l.8 9h6.4l.8-9"></path></svg>
    </div>
  </div>
  <div style="display: flex; align-items: center; gap: 8px; height: 28px; padding: 0 8px 0 16px; box-sizing: border-box;">
    <span style="flex: 1; min-width: 0; font-size: 12px; line-height: 1.2; color: #7a828e; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">Colorblind safe</span>
    <span style="flex: 0 0 auto; font-size: 11px; line-height: 1; color: #7a828e;">built-in</span>
  </div>
  <div style="display: flex; align-items: center; gap: 8px; height: 28px; padding: 0 8px 0 16px; box-sizing: border-box;" title="Saved for cats-social. Open that dataset to apply it.">
    <span style="flex: 1; min-width: 0; font-size: 12px; line-height: 1.2; color: #5f6873; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">Cat clusters</span>
    <span style="flex: 0 0 auto; font-size: 11px; line-height: 1; color: #5f6873;">2 Sep</span>
  </div>
</div>
```

Every `Save as <kind>...` dialog carries the destination line under its name
field. It is floor item 4 -- what a control will do before it does it -- and not
an eighth floor item; the floor is seven and stays seven:

```html
<div style="font-size: 11px; line-height: 1.4; color: #7a828e;">Saved in this browser on this computer. Export a file to move it.</div>
```

`Save as <kind>...` always creates. Replacing is `Update from current` on a named
row, or a Save dialog whose primary relabels to `Replace "Publication style"`
with that entry's date beneath the name field. Applying an entry that could not
fully bind writes one line, which is floor item 2 extended to the apply path:
`Applied Publication style. 2 of 5 layers matched nothing: they need logFC and
padj.`

### Import state banner (5.3 Data, Import flow items 0 and 2)

The entry clause is the dialog's **name for its state**, protected by floor item
6, and it is not an explanation of a control -- which is why 6.9 Rule 8 may not
delete it and why floor item 4 is not stretched to cover it. Seven clauses,
fixed, evaluated from the end with the first match winning: `delimited file`,
`guessed column`, `parse error`, `second file, data already loaded`, `above the
large-graph threshold`, `above the render ceiling`, `always show import options
is on`.

The title row, 720px dialog frame, drawn in the state that opened over a
delimited file with one guessed type column:

```html
<div style="display: flex; align-items: baseline; gap: 8px; height: 36px; padding: 0 12px 0 20px; box-sizing: border-box;">
  <span style="flex: 0 0 auto; font-size: 14px; font-weight: 500; line-height: 1.2; color: #d5d7da;">Import options</span>
  <span style="flex: 1; min-width: 0; font-size: 11px; line-height: 1.2; color: #7a828e; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">fraud-ring-synthetic.csv, 38 KB -- guessed column</span>
  <div style="width: 24px; height: 24px; flex: 0 0 auto; align-self: center; display: flex; align-items: center; justify-content: center; border-radius: 4px; color: #7a828e; cursor: pointer;" title="Close (Esc)">
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="4" x2="12" y2="12"></line><line x1="12" y1="4" x2="4" y2="12"></line></svg>
  </div>
</div>
```

The recognition banner is the other half of the same decision, and it is an RT-7
action row carrying a floor item 3 **run record**, not a nine-word notice: a
recognition is an automatic edit to the user's mapping and is reported like any
other automatic action, at the point it happened. `Details` holds the full
per-column record; `Map it myself` clears every pre-assignment and flips the row
to `STRING mapping cleared -- 4 columns guessed. Review` with `Use the STRING
mapping` in its place, so the choice is reversible in both directions without a
confirm:

```html
<div style="display: flex; align-items: center; gap: 8px; height: 28px; padding: 0 12px 0 20px; box-sizing: border-box;">
  <div style="width: 16px; height: 16px; flex: 0 0 auto; display: flex; align-items: center; justify-content: center; color: #61d095;">
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3.5,8.5 6.5,11.5 12.5,5"></polyline></svg>
  </div>
  <span style="flex: 1; min-width: 0; font-size: 12px; line-height: 1.2; color: #d5d7da; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">Recognized a STRING export -- 12 columns mapped, combined_score as weight, 1 saved filter installed</span>
  <div style="width: 24px; height: 24px; flex: 0 0 auto; display: flex; align-items: center; justify-content: center; border-radius: 4px; color: #7a828e; cursor: pointer;" title="Details">
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6,4 10,8 6,12"></polyline></svg>
  </div>
  <div style="display: inline-flex; align-items: center; flex: 0 0 auto; height: 24px; padding: 0 8px; border-radius: 4px; font-size: 11px; line-height: 1; color: #5b8ff9; cursor: pointer;">Map it myself</div>
</div>
```

### Analysis-backed style layer row (5.3 Style, "Layers from an analysis")

A style layer created by a run is an ordinary style layer with one section more.
The row is RT-6 at 28px: the Analyze rail glyph in the type slot, the **run
name**, and -- wherever the selector matches everything -- the run's **headline
in place of the match count**. State reports resident under RT-7's hover split,
so Stale, Running and Failed draw without hover.

```html
<div style="display: flex; align-items: center; gap: 8px; height: 28px; padding: 0 8px 0 16px; background: #28364e; box-sizing: border-box;">
  <div style="width: 16px; height: 16px; flex: 0 0 auto; display: flex; align-items: center; justify-content: center; color: #7a828e;" title="From Groups (Markov clustering). Open the result">
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="13.5" x2="3" y2="8"></line><line x1="8" y1="13.5" x2="8" y2="2.5"></line><line x1="13" y1="13.5" x2="13" y2="6"></line></svg>
  </div>
  <span style="flex: 1; min-width: 0; font-size: 12px; line-height: 1.2; color: #d5d7da; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">Groups (granularity 2.5)</span>
  <span style="flex: 0 0 auto; font-size: 11px; line-height: 1; color: #7a828e;">6</span>
</div>
```

The `Source` section the layer adds sits at tier 1 between the header and the
encoding rows, in this fixed order: the **reading** (RT-10, resident and in full
-- floor item 1, and it may not be collapsed, because the layer is where a
parameter is turned); the **caveats line** (RT-10, only when there is a departure
to name); the **run record** (one dimmed line with its Details chevron); the
**deviating parameters only**, as live RT-1 rows, since Rule 7a does not draw a
parameter sitting at its default and the rest live behind the layer's gear; and
`Open result`.

The worked example, Markov clustering at granularity 2.5 on a 318-node graph.
Note what is absent: no `Which nodes` row, because the selector is every node,
and no caveats line, because the run was exact, unfiltered and on the whole
visible graph.

```html
<div style="display: flex; flex-direction: column; gap: 8px; padding: 8px 8px 8px 16px;">
  <div style="font-size: 12px; line-height: 1.5; color: #a3a8b1;">6 groups found. The largest has 118 members. Colors show groups.</div>
  <div style="display: flex; align-items: center; gap: 4px; height: 20px;">
    <span style="flex: 1; min-width: 0; font-size: 11px; line-height: 1.4; color: #7a828e; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">MCL, granularity 2.5</span>
    <div style="width: 16px; height: 16px; flex: 0 0 auto; display: flex; align-items: center; justify-content: center; color: #7a828e; cursor: pointer;" title="Details">
      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6,4 10,8 6,12"></polyline></svg>
    </div>
  </div>
  <div style="display: flex; align-items: center; gap: 8px; height: 24px;">
    <div style="display: flex; align-items: center; flex: 1; min-width: 0; height: 24px; padding: 0 8px; background: #2a3035; border-radius: 4px; box-sizing: border-box;">
      <span style="flex: 0 0 auto; font-size: 11px; line-height: 1; color: #7a828e; cursor: ew-resize;">Granularity</span>
      <span style="flex: 1; min-width: 0; font-size: 11px; line-height: 1; color: #d5d7da; text-align: right;">2.5</span>
    </div>
    <div style="width: 24px; height: 24px; flex: 0 0 auto;"></div>
  </div>
  <div style="font-size: 11px; line-height: 1; color: #5b8ff9; cursor: pointer;">Open result</div>
</div>
```

`Granularity` stays a **word** inside its own field, dimmed, and does not become
a glyph: Rule 4 forbids giving a concept a glyph, and granularity, resolution,
damping and tolerance are concepts. The word is the scrub handle in place of the
16px slot.

The parameter row is live. A scrub does not run; on release, on Enter or on blur
the layer goes dirty, the canvas keeps the completed run's picture, and the cost
gate appears -- the same three bands Analyze uses, because it is the same run,
and in the same construction `StyleDiverging` already draws for a metric chosen
before it has been run:

```html
<div style="display: flex; flex-direction: column; gap: 4px; padding: 0 8px 8px 16px;">
  <div style="font-size: 11px; line-height: 1.4; color: #d5d7da;">Granularity 3.0 takes about 8 s. Colors still show granularity 2.5.</div>
  <div style="display: flex; align-items: center; gap: 8px;">
    <span style="font-size: 11px; line-height: 1; color: #5b8ff9; cursor: pointer;">Run and use it</span>
    <span style="font-size: 11px; line-height: 1; color: #5b8ff9; cursor: pointer;">Cancel</span>
  </div>
</div>
```

A re-run from a Source row **replaces in place**: same stack position, same
palette, same identity, one history entry. That deliberately inverts the Analyze
rule that a rerun with different parameters adds a card, because a parameter row
inside an object edits that object. To hold 2.5 and 3.0 side by side, use `Run
again with changes` or `Run as sweep`.

## 13. 1.10 floor decisions: disabled controls, and unshipped verbs that must be named

Two floor items settled once, for the whole set. Both were breached the same
way -- a fact that belongs on screen was living in a `title` -- and they get
opposite answers, because the two facts are not the same kind of thing.

### 13.1 Disabled controls: the state is drawn, the reason is the control's own tooltip

**The rule.** A disabled control draws that it is disabled and says why in its
own title. Concretely, and checkably:

1. **The state is always drawn.** Every glyph and every word of a disabled
   control renders at the disabled ink `#5f6873`, its checkbox border drops to
   `#374047`, and it carries `cursor: default`. A disabled control is never at
   the dimmed ink `#7a828e`, never at the primary `#d5d7da`, and never at
   `cursor: pointer` -- a dead control that advertises a click is the defect,
   not the missing sentence.
2. **The reason is the control's own title**, appended after a full stop, one
   clause, naming the one action that would enable it, in REGISTER-1.5 section
   1's form: `Zoom to selection (F). Select something first`,
   `Redo (Shift+Cmd+Z). Nothing to redo yet`, `Analyze. Load data first`.
3. **The reason is not repeated per control.** Where one surface has several
   controls out for one cause, the cause is stated once, in the words the
   surface already uses, and every control keeps only its own title: the five
   unloaded boards say `No file open` in the top bar and `No data loaded` in the
   status bar, which is the whole reason the four rail activities, Export,
   Share and Compare are out; ExplorerLargeGraph draws `Choose nodes...` beside
   `Simulate removal (0)`; ExplorerLoading's progress row is why its two Runs
   cannot run. Rule 9 raises a repeated word to the surface; 6.7 forbids
   repeating it as body text.
4. **One shape keeps its reason on the control: a row in a list of offers.**
   Present's two secondary export rows read `Analysis results as CSV` and
   `Run something first` on one 20px line, name left, reason right-aligned at
   the row's own `#5f6873`. A reader comparing rows in a list must be able to
   see, in the list, why one of them cannot be picked. That trailing clause is
   part of the control, not body text, so 6.7's ban is untouched -- and it is
   the only place a disabled reason is drawn in words.

**Why the reason is not resident everywhere.** Spec 6.7 already settles this and
says so by name: "The reason a control is unavailable is reported text. It is
the disabled control's own tooltip, which opens on hover, on keyboard focus and
on tap, names the one action that would enable the control, and is never
repeated as body text in a panel or a result card." Spec 6.10 item 4 lists the
same reason among the things that may not be hidden. Read together with no
exception stated, those two sentences contradict each other, and that unstated
contradiction is what produced the 1.10 finding: 30 controls "hiding" a reason
that 6.7 had put exactly where it belongs. It cannot be resolved by making every
reason resident. The set holds 133 disabled controls; 101 of them are 24px shell
glyphs whose only name is already a tooltip under 6.8, and a shell that printed
`Nothing to redo yet` beside every dead glyph would spend the chrome's whole
budget restating states the reader changes every few seconds.

**So spec 6.10 item 4 is amended, and the exception is stated.** Item 4 reads
"...the reason a disabled control is disabled..."; it now reads, for this set:

> ...the reason a disabled control is disabled, drawn as the control's disabled
> state and carried in words in that control's own tooltip (6.7), plus, where
> the control is a row in a list of offers, as a trailing clause on the row.
> This is the one floor item whose words may live in a title, and only because
> 6.7 assigns them there and forbids repeating them; the state itself is never
> in a title, and a control that does not look disabled is a floor breach even
> when its tooltip is perfect.

The design document in `design/ui/app-shell-progressive-disclosure-design.md`
still carries the unamended sentence; this section is the amendment of record
for the artboards, and whoever next edits the spec should carry it across.

**What 1.10 changed under this rule.** Nothing was added to any surface. Three
things were drawn that were not: 35 boards drew the disabled Redo at the right
ink with `cursor: pointer` (7 boards already had `cursor: default`, so the set
caught up with its own majority form); PresentPanel's `Include notes` checkbox
sat at primary ink with a pointer cursor, indistinguishable from the live
`Positions` box beside it; ImportRecognised's Data table switch carried no
cursor. All 133 disabled controls now pass clause 1.

### 13.2 An unshipped capability is named, and the line count is what gives

6.8 already says it twice -- "Text only, no icon... the control carries a Coming
tag", and "An icon-only control never carries a Coming tag; a verb that has not
shipped keeps its text and its tag" -- and 6.10 item 6 puts every capability's
plain name on the floor. A title is not a name. Twelve controls broke this and
are now drawn, in two shapes:

**Shape A, a segmented control whose members do not all fit with their glyphs.**
The Arrangement quick-pick on the four Style boards drew `Force directed` in
words beside two 41px glyph boxes named only in their titles. Three names need
214.1 of the track's 217px; three names plus the active segment's glyph need
232.1. An RT-3 member's glyph draws the difference between options and is a rule
below 6.10; the names are floor item 6; Rule 0 says which one survives a short
row. All three segments are text-only, `flex: 1 1 auto` so each sizes to its own
word (91.5 / 78.6 / 47), ink and cursor mark the two that are unshipped, and the
section header's one Coming tag still covers them.

```html
<div style="display: flex; gap: 2px; flex: 1 1 0; min-width: 0; height: 24px; padding: 1px; border-radius: 4px; background: #2a3035; box-sizing: border-box;">
  <div title="Force directed (ngraph)" style="flex: 1 1 auto; display: flex; align-items: center; justify-content: center; min-width: 0; height: 22px; padding: 0 6px; border-radius: 3px; background: #374047; color: #d5d7da; cursor: pointer; box-sizing: border-box;">
    <span style="font-size: 11px; font-weight: 500; line-height: 1; white-space: nowrap;">Force directed</span>
  </div>
  <div title="Hierarchical (sugiyama). Coming" style="flex: 1 1 auto; display: flex; align-items: center; justify-content: center; min-width: 0; height: 22px; padding: 0 6px; border-radius: 3px; color: #5f6873; cursor: default; box-sizing: border-box;">
    <span style="font-size: 11px; font-weight: 500; line-height: 1; white-space: nowrap;">Hierarchical</span>
  </div>
</div>
```

**Shape B, an unshipped verb inside a glyph cluster.** `Use as filter` on three
Style boards and `Select neighbors` on MultiSelection were single dim glyphs in
clusters whose other members are shipped register verbs. Named in place they
need 90 to 96px the row does not have, and taking it would clip the row's
resident scope or the user's own ids -- floor items 4 and 7. So the verb leaves
the cluster and takes the 24px row below at the unshipped ink, glyph plus label,
with its Coming tag where the section header does not already carry one. What
gives is the line count, never a fact (FLOOR-1.9 rule 1).

```html
<div style="display: flex; align-items: center; gap: 4px; height: 24px;">
  <div title="Select neighbors (Shift+E). Not built yet" style="display: inline-flex; align-items: center; gap: 4px; flex: 0 0 auto; height: 24px; padding: 0 6px; border-radius: 4px; color: #5f6873; cursor: default; box-sizing: border-box;">
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="flex: 0 0 auto;"><circle cx="5.5" cy="8" r="2.25"></circle><circle cx="12.5" cy="4.5" r="1.5"></circle><circle cx="12.5" cy="11.5" r="1.5"></circle><line x1="7.6" y1="7" x2="11" y2="5.3"></line><line x1="7.6" y1="9" x2="11" y2="10.7"></line></svg>
    <span style="font-size: 11px; font-weight: 500; line-height: 1; white-space: nowrap;">Select neighbors</span>
  </div>
  <div style="display: inline-flex; align-items: center; flex: 0 0 auto; height: 16px; padding: 0 6px; border-radius: 8px; background: #374047; color: #7a828e; font-size: 10px; font-weight: 500; line-height: 1; box-sizing: border-box;">Coming</div>
</div>
```

The binding stays in the title (REGISTER-1.5 section 1); the label never carries
a key chip.

### 13.3 A section name that does not fit is not shortened; the circle beside it moves

TimeSlider's `Step through time` header put chevron 16 + name 109.2 + info
circle 14 and two 4px gaps -- 147.2px of content -- in the 136.7px the Coming
tag, the gear and the switch left it, so the circle overhung its box by 10.5 and
landed on the tag. The name is floor item 6 and does not shrink; the tag, the
gear and the switch each report state. What gives is the circle: its sentence
moves verbatim into the row's own title, where it is still one hover away, still
the row's accessible description, and still the only copy (6.7: an info circle
is never the only route to its sentence, and the string is unchanged). That is
the same resolution the row's own comment already licensed for the technical
name, and the shape ExploreNotesList already draws for this section name. Left
group is now 129.2 in 136.7.

The general form: **a section header whose name, circle and trailing controls
overrun the 255px band drops the circle into the row's title, never the name,
and never the tag or the state marks in the trailing slot.**

## 14. 1.8 additions

Owned by DECISIONS-1.8: the door and its stub, the pop-out caret and return
strip, the confirm pop-out, the reading legend's two subtractions, and the
export legend block. Every snippet below is the one spelling; where a board
differs, the difference is a state difference and is named in that board's own
comment.

### 14.1 The door stub, dimmed and primary

A door glyph draws in the dimmed ink when everything behind it is at its
default and in the primary ink when anything behind it is not (DECISIONS-1.8
A6). This is the only signal a reader has that a door hides a non-default, and
it renders at every density. Two spellings of the same 24px trailing slot.

```html
<!-- everything behind it is at its default -->
<div title="Image export options" style="display: inline-flex; align-items: center; justify-content: center; flex: 0 0 auto; width: 24px; height: 24px; border-radius: 4px; color: #7a828e; cursor: pointer; box-sizing: border-box;">
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="2.25"></circle><path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M12.6 3.4l-1.4 1.4M4.8 11.2l-1.4 1.4"></path></svg>
</div>

<!-- something behind it deviates -->
<div title="Image export options. 2 options changed" style="display: inline-flex; align-items: center; justify-content: center; flex: 0 0 auto; width: 24px; height: 24px; border-radius: 4px; color: #d5d7da; cursor: pointer; box-sizing: border-box;">
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="2.25"></circle><path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M12.6 3.4l-1.4 1.4M4.8 11.2l-1.4 1.4"></path></svg>
</div>
```

The RT-8 form is not a section that has become a door -- there is no such thing,
and no permanently-closed chevron (`SECTIONS-1.9.md` D1). It is the
**trailing-slot rule**: a section header carries a **state mark when it is
closed** and its **verbs and its gear when it is open** (D5). The closed mark is
the one fact that says what is inside without opening it -- a count, a severity
glyph, an On switch, a progress string, or, new in 1.8, the active member's own
name. Closed, with its mark:

```html
<div style="display: flex; flex-direction: column;">
  <div style="height: 1px; background: #495057;"></div>
  <div title="Styles. Publication" style="display: flex; align-items: center; justify-content: space-between; height: 32px; cursor: pointer;">
    <div style="display: flex; align-items: center; gap: 4px; min-width: 0;">
      <div style="width: 16px; height: 16px; flex: 0 0 auto; display: flex; align-items: center; justify-content: center; color: #7a828e;">
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6,4 10,8 6,12"></polyline></svg>
      </div>
      <span style="font-size: 12px; font-weight: 500; line-height: 1.2; color: #d5d7da; white-space: nowrap;">Styles</span>
    </div>
    <span style="flex: 0 1 auto; min-width: 0; font-size: 11px; line-height: 1; color: #7a828e; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; padding-right: 8px;">Publication</span>
  </div>
</div>
```

Open, the same header draws the down chevron, the same name, and in that slot the
section's verbs and its 24px gear on the 28px pitch RT-8 specifies, ending at
`x = 272`; the mark itself is deleted the moment the resident rows repeat it
(Rule 8), and survives only when it says something the rows do not -- a progress
string while anything is still computing, or a master On switch that is the
section's own control. And because a closed section draws no gear, A6's two inks
above move to its chevron: `#d5d7da` when anything behind the gear deviates,
`#7a828e` when nothing does.

### 14.2 The pop-out caret

6px, on the pop-out's leading edge -- the left edge for an inspector pop-out,
the right edge for an activity-panel one -- at the vertical centre of its
opener's row, clamped 12px inside the pop-out's own corners. It ships with the
pop-out shell, not per case, and it is not drawn once the opener has scrolled
out of the region (14.3 replaces it there).

```html
<!-- activity-panel pop-out: caret on the LEFT edge, pointing back at the panel -->
<div style="position: absolute; left: -6px; top: 16px; width: 6px; height: 12px; overflow: hidden;">
  <div style="position: absolute; left: 3px; top: 1px; width: 10px; height: 10px; transform: rotate(45deg); background: #1f2428; border-left: 1px solid #48525c; border-bottom: 1px solid #48525c; box-sizing: border-box;"></div>
</div>
```

A surface narrower than 280px carries an 8px caret **instead of** an edge
line, because nothing aligns meaningfully to a 14px control. That is the
250px info bubble (6.7) and every menu under 280.

```html
<!-- 250px info bubble under a 14px info circle: 8px caret centred on the circle -->
<div style="position: absolute; left: 7px; top: -8px; width: 16px; height: 8px; overflow: hidden;">
  <div style="position: absolute; left: 3px; top: 3px; width: 10px; height: 10px; transform: rotate(45deg); background: #1f2428; border-left: 1px solid #48525c; border-top: 1px solid #48525c; box-sizing: border-box;"></div>
</div>
```

### 14.3 The return strip

When a pop-out's opener scrolls out of its region, the pop-out docks to the
edge it left through, drops its caret, keeps the opener lit, and grows a 20px
strip in its header naming the opener with a chevron that scrolls it back
(DECISIONS-1.8 B3). It closes outright when the opener's section collapses or
the region changes activity.

```html
<div style="display: flex; align-items: center; gap: 6px; height: 20px; padding: 0 8px 0 12px; border-bottom: 1px solid #374047; background: #232a2f; box-sizing: border-box;">
  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="#7a828e" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="flex: 0 0 auto;"><polyline points="10,3.5 5,8 10,12.5"></polyline></svg>
  <span title="Scroll back to Validation report" style="flex: 1 1 auto; min-width: 0; font-size: 10px; color: #7a828e; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; cursor: pointer;">Validation report</span>
</div>
```

### 14.4 The confirm pop-out

A cost estimate, cap or destructive confirm is a pop-out with two verbs, not a
floating card (DECISIONS-1.8 B4). It takes its region's lane and its opener
row's shared edge line, its width comes from the same ladder -- 280 for a
sentence and two buttons -- and **it carries no pin and no close X**, because
a dismissible warning about spending forty seconds is not a warning. Escape
cancels and returns focus to the opener.

```html
<div style="position: absolute; width: 280px; padding: 10px 12px; border-radius: 6px; background: #1f2428; border: 1px solid #48525c; box-shadow: 0 8px 24px rgba(0,0,0,0.45); box-sizing: border-box;">
  <div style="font-size: 11px; line-height: 1.5; color: #d5d7da;">Bridges takes about 40 s on 318 nodes. Colors still show granularity 2.5.</div>
  <div style="display: flex; align-items: center; justify-content: flex-end; gap: 6px; margin-top: 10px;">
    <div style="display: inline-flex; align-items: center; height: 24px; padding: 0 10px; border-radius: 4px; color: #a3a8b1; font-size: 11px; font-weight: 500; cursor: pointer; box-sizing: border-box;">Cancel</div>
    <div style="display: inline-flex; align-items: center; height: 24px; padding: 0 10px; border-radius: 4px; background: #3d6fd4; color: #ffffff; font-size: 11px; font-weight: 500; cursor: pointer; box-sizing: border-box;">Run and use it</div>
  </div>
</div>
```

The cost GATE is a different thing and is not this: floor item 4 binds the
estimate to the control that spends it, so a gate renders inline under the row
that raised it and never as any floating surface at all.

### 14.5 The reading legend: two subtractions from LEGEND-1.8

The canvas legend keeps LEGEND-1.8's box, its width of 256, its block order,
its header grammar, its min / median / max ramp with the scale word always
printed, its Okabe-Ito and product ramps, its clamp line and its
`not measured (N nodes)` row. Three things change (DECISIONS-1.8 C3, C6):

- **No state-row block on canvas.** LEGEND-1.8 section 5's colour-agnostic
  state swatches are not discarded -- they move to the export legend (14.6)
  and to Help's "What the marks mean".
- **No category counts on canvas.** The `space-between` count span comes off
  the categorical row; the label takes the full width.
- **Five categorical rows plus Other**, not twelve, and the Other row absorbs
  the coverage footer rather than sitting above a second line saying the same
  thing.
- `max-height` is 240, not 334 (200 on iPad).

```html
<!-- categorical row, canvas form: swatch and label only -->
<div style="display: flex; align-items: center; gap: 6px; height: 14px;">
  <svg width="10" height="10" viewBox="0 0 10 10" style="flex: 0 0 auto;"><circle cx="5" cy="5" r="5" fill="#4a7ee8"></circle></svg>
  <span style="flex: 1 1 auto; min-width: 0; font-size: 11px; color: #d5d7da; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Accounts</span>
</div>

<!-- the Other row carries the coverage footer; clicking it opens the groups table -->
<div title="Open the groups table" style="display: flex; align-items: center; gap: 6px; height: 14px; cursor: pointer;">
  <svg width="10" height="10" viewBox="0 0 10 10" style="flex: 0 0 auto;"><circle cx="5" cy="5" r="5" fill="#6b7480"></circle></svg>
  <span style="flex: 1 1 auto; min-width: 0; font-size: 11px; color: #d5d7da; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Other <span style="color: #7a828e;">(3,388 groups, 43% of nodes)</span></span>
</div>
```

The compact (drawer-open) legend stops being a separately specified component:
it is this legend with the swatch rows and the ramps subtracted, keeping the
header lines. LEGEND-1.8 section 6's two lines are unchanged as strings.

### 14.6 The export legend block

Composed from the encoding model at the export's own scale and drawn into the
image, never captured from the DOM overlay -- `ScreenshotCapture.ts` calls
`CreateScreenshotAsync(engine, camera, ...)`, a Babylon scene capture that
cannot see an overlay, which is why the exported image carries no legend
today. It ignores the canvas legend's visibility: hiding the legend with L or
with Style's Show legend switch does not remove it from an export.

Content, in this order, with no cap and no compaction:

1. Every encoded channel, in LEGEND-1.8's block order, with channel word,
   attribute (plain then technical), min / median / max or min / midpoint /
   max, and the scale in words.
2. Twelve categories with counts, then Other with the coverage footer.
3. Every departure line: the clamp line, `not measured (N nodes)`, the
   sampling caveat.
4. One state row per state drawn in the exported frame, in LEGEND-1.8 section
   5's order and with its colour-agnostic swatch, because a static figure has
   no filter strip, no status bar and no result card to name them.

At 2x the block is drawn at 2x: 22px headers, 20px rows, 512px width, 12px
padding. Type is never scaled up from 11px raster.

In the SVG and PDF paths it is emitted as **vector text**, because editing the
legend in Illustrator is exactly the rebuild the genomics persona is trying to
avoid.

### 14.7 The export frame hint, extended

The hint is resident on the canvas and is the floor-item-4 report for
everything behind the Image options door, which is what lets Scope, Background
and Include legend legally leave the panel (DECISIONS-1.8 C4, D1). Its legend
clause reads `legend: 2 channels` when Include legend is on and `legend: off`
when it is not, and in the off case the Image options gear draws primary
(14.1).

```html
<div style="display: inline-flex; align-items: center; gap: 6px; height: 24px; padding: 0 10px; border-radius: 12px; background: rgba(31,36,40,0.92); border: 1px solid #374047; box-sizing: border-box;">
  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="#7a828e" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="flex: 0 0 auto;"><rect x="2.5" y="3.5" width="11" height="9" rx="1"></rect></svg>
  <span style="font-size: 11px; color: #a3a8b1; white-space: nowrap;">Export frame: current view, 832 x 836, about 20 nodes in frame; legend: 2 channels</span>
</div>
```

### 14.8 The two gap constants

One pair, every board (DECISIONS-1.8 B2). **8px** is the gap between a pop-out
and the shell region boundary it sits beside -- left edge 336 beside the
panel, right edge 1152 beside the inspector. **12px** is the inset used by
anything that floats in the canvas overlay layer, matching the legend (right
edge 1148 against a canvas right of 1160), the minimap (left 340 against a
canvas left of 328) and the toolbar (bottom 864 against a canvas bottom of
876). A panel or inspector pop-out that has slid over the canvas takes 12.

## 15. 1.9 additions: a section expands in place

Owned by `SECTIONS-1.9.md`. **Every section expands in place. A chevron renders
only where it opens onto resident rows. No section's content lives entirely
behind a door, and a gear is an ADDITION to a section that already draws
content, never a section's only content.** A gear is optional; a section may be
entirely resident and carry none. A chevron over nothing is a defect.

The door test keeps its shape and changes one word. Clause (a)'s denominator is
now **local**: of the readers who open THIS section, is this among the two or
three things they commonly adjust or consult? Yes: resident. No: behind that
section's gear. Clause (b) -- what is left behind must still report whether this
instance left the default -- is unchanged, the two still conjoin, and A2's veto
still overrides both. "Commonly adjusted" reads as "commonly adjusted or
commonly consulted", so a section made of readouts resolves on what a reader
came to read (D6).

Two consequences that show up in the drawing:

- **Locally common rows render whether or not they deviate.** Rule 7a still
  governs gear contents and every row that is not locally common; it no longer
  reaches the two or three rows that are. `Edge length 30`, `Window 30 days` and
  `Transitions 300 ms` are drawn at their shipped defaults, with the value in
  the field and no reset `x`, and they gain the `x` the moment they deviate (D3).
  A row the DATA cannot support still does not render at all (Rule 7c).
- **Nothing here opens a section that was closed.** "A panel always expands" is
  about capability, not resting state (D4). Eight collapsed sections are still
  `8 x 33 = 264` px and still never scroll; what changed is only what is behind
  the chevron, and its cost is paid only by a reader who opened it.

Two snippets, one section in both of its states. Section 12's Validation report
is the same shape drawn on a section made of readouts; 14.1 is the closed
header's mark and the gear's two inks.

### 15.1 An expanded section: resident rows and a gear

The layout `Parameters` block, which is the product owner's own example -- "a
layout panel would show a couple common parameters and have an advanced gear for
the rest". An open chevron; the section name at the value ink `#d5d7da` because
the section holds values; the RT-1 pair `Edge length 30` and `Pull to centre
-1.2`; the bound `Edge weight` attribute field; and one gear in the trailing
slot at the dimmed ink, because everything behind it sits at its default.

Behind that gear go the six engine internals the door was built for: `Start from
current arrangement`, `Stiffness (springCoefficient)`, `Speed vs accuracy
(theta)`, `Damping (dragCoefficient)`, `Time step (timeStep)` and `Random seed
(seed)`. Three rows resident, six behind the gear.

All three resident rows sit at their shipped defaults -- `NGraphLayoutEngine.ts`
declares `springLength .default(30)` and `gravity .default(-1.2)`, and Edge
weight defaults to the import `Weight` column -- and they are drawn anyway, which
is D3. Nobody opens the Layout section to do nothing.

Field slots: `Edge length` takes the register **width** glyph, an extent, which
is the same reuse TimeSlider already makes for `Window size`. `Pull to centre`
has no register entry, and a 108px half-field cannot hold the words `Pull to
centre` plus a value, so this is the one new **field glyph** in 1.9 -- four
chevrons pointing inward at a centre dot -- and it is owed to `REGISTER-1.5.md`
section 1 on the same terms as the field glyphs in section 11. It is not the
`locate` glyph (concentric circles with ticks) and not `zoom to fit` (four corner
brackets, pointing outward). Every field keeps a `title` equal to the word its
glyph replaced.

The rows keep an empty 24px trailing slot so the grid holds: `16 + 108 + 8 + 108
+ 8 + 24 + 8 = 280`. The section rhythm is the usual `1px divider / 32px header /
32n content / 8px pad`, so three rows is `1 + 32 + 96 + 8 = 137` px.

```html
<div style="display: flex; flex-direction: column;">
  <div style="height: 1px; background: #495057;"></div>
  <div style="display: flex; align-items: center; justify-content: space-between; height: 32px;">
    <div style="display: flex; align-items: center; gap: 4px; min-width: 0; cursor: pointer;" title="Collapse Parameters">
      <div style="width: 16px; height: 16px; flex: 0 0 auto; display: flex; align-items: center; justify-content: center; color: #7a828e;">
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="4,6 8,10 12,6"></polyline></svg>
      </div>
      <span style="font-size: 12px; font-weight: 500; line-height: 1.2; color: #d5d7da; white-space: nowrap;">Parameters</span>
    </div>
    <div title="Layout parameters" style="width: 24px; height: 24px; flex: 0 0 auto; display: flex; align-items: center; justify-content: center; border-radius: 4px; color: #7a828e; cursor: pointer; box-sizing: border-box;">
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="2.25"></circle><circle cx="8" cy="8" r="4.75"></circle><path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M3.4 12.6l1.4-1.4M11.2 4.8l1.4-1.4"></path></svg>
    </div>
  </div>

  <div style="display: flex; flex-direction: column; padding-bottom: 8px;">
    <div style="display: flex; align-items: center; gap: 8px; height: 32px;">
      <div title="Edge length: 30" style="display: flex; align-items: center; gap: 4px; flex: 1 1 0; min-width: 0; height: 24px; padding: 0 8px; background: #2a3035; border-radius: 4px; box-sizing: border-box;">
        <div style="width: 16px; height: 16px; flex: 0 0 auto; display: flex; align-items: center; justify-content: center; color: #7a828e; cursor: ew-resize;">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="2.5" y1="8" x2="13.5" y2="8"></line><polyline points="5,5.5 2.5,8 5,10.5"></polyline><polyline points="11,5.5 13.5,8 11,10.5"></polyline></svg>
        </div>
        <span style="flex: 1; min-width: 0; font-size: 11px; line-height: 1; color: #d5d7da; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">30</span>
      </div>
      <div title="Pull to centre: -1.2" style="display: flex; align-items: center; gap: 4px; flex: 1 1 0; min-width: 0; height: 24px; padding: 0 8px; background: #2a3035; border-radius: 4px; box-sizing: border-box;">
        <div style="width: 16px; height: 16px; flex: 0 0 auto; display: flex; align-items: center; justify-content: center; color: #7a828e; cursor: ew-resize;">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="1.5"></circle><polyline points="6,3 8,5 10,3"></polyline><polyline points="6,13 8,11 10,13"></polyline><polyline points="3,6 5,8 3,10"></polyline><polyline points="13,6 11,8 13,10"></polyline></svg>
        </div>
        <span style="flex: 1; min-width: 0; font-size: 11px; line-height: 1; color: #d5d7da; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">-1.2</span>
      </div>
      <div style="width: 24px; height: 24px; flex: 0 0 auto;"></div>
    </div>

    <div style="display: flex; align-items: center; gap: 8px; height: 32px;">
      <div title="Edge weight attribute" style="display: flex; align-items: center; gap: 4px; flex: 1 1 0; min-width: 0; height: 24px; padding: 0 8px; background: #2a3035; border-radius: 4px; box-sizing: border-box; cursor: pointer;">
        <div style="width: 16px; height: 16px; flex: 0 0 auto; display: flex; align-items: center; justify-content: center; color: #7a828e;">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 7.2V3.5a1 1 0 0 1 1-1h3.7l6.3 6.3-4.7 4.7z" fill="currentColor" stroke="none"></path><circle cx="5.5" cy="5.5" r="0.75" fill="#2a3035" stroke="none"></circle></svg>
        </div>
        <span style="flex: 1; min-width: 0; font-size: 11px; line-height: 1; color: #d5d7da; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">value</span>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#7a828e" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="flex: 0 0 auto;"><polyline points="4,6 8,10 12,6"></polyline></svg>
      </div>
      <div style="width: 24px; height: 24px; flex: 0 0 auto;"></div>
    </div>
  </div>
</div>
```

The gear turns primary `#d5d7da` the moment one of the six deviates, and its
title names the deviation after a full stop -- `Layout parameters. Random seed
set to 7` (14.1, A6). With `Settings > Appearance > Keep advanced sections open`
turned on, the same six render as inline rows in this section, in the same order
at the same 32px pitch, and the panel is then allowed to scroll (D10, E4). Both
states are legal and both still start closed.

### 15.2 The same section, closed

The state a reader arrives at. The chevron is the closed right-pointing form
because the section is closed, not because it cannot open; the gear is not drawn,
because the trailing slot belongs to the mark; and the mark is the layout name
and its state, exactly as the layout chip already prints it. `Force directed -
settled` is 11px dimmed and truncates with an ellipsis before it can push the
name.

```html
<div style="display: flex; flex-direction: column;">
  <div style="height: 1px; background: #495057;"></div>
  <div title="Parameters. Force directed (ngraph) - settled" style="display: flex; align-items: center; justify-content: space-between; height: 32px; cursor: pointer;">
    <div style="display: flex; align-items: center; gap: 4px; min-width: 0;">
      <div style="width: 16px; height: 16px; flex: 0 0 auto; display: flex; align-items: center; justify-content: center; color: #7a828e;">
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6,4 10,8 6,12"></polyline></svg>
      </div>
      <span style="font-size: 12px; font-weight: 500; line-height: 1.2; color: #d5d7da; white-space: nowrap;">Parameters</span>
    </div>
    <span style="flex: 0 1 auto; min-width: 0; font-size: 11px; line-height: 1; color: #7a828e; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; padding-right: 8px;">Force directed - settled</span>
  </div>
</div>
```

One row, 33px with its divider, and that is the whole cost of the section at
rest. Open it and the mark goes, because the header above it already says
`Force directed` and the three rows below say the rest (Rule 8); the gear takes
the slot the mark had. Where the closed mark says something the rows do NOT --
`Computing 3 of 7` while any statistic is still running, or a master On switch --
it stays in the slot beside the gear.

## 16. The contrast divergence: where the shipped library deliberately differs

Owned by `CONTRAST-DIVERGENCE.md`. **The palette in section 1 is what the
artboards paint, and it is not to be reconciled with `compact-mantine`. The
library's `PANEL_INK` is what ships, and it is not to be reconciled with section
1. Five colour roles disagree on purpose; every other colour is the same colour
in both, and a sixth disagreement is a bug in one of them, not a sixth
divergence.**

`compact-mantine` was made WCAG 2.2 AA compliant in a hardening pass and the
boards were not. Both artefacts stand. On the colour a shipped control paints,
the library governs and a board is a picture of an earlier decision; on layout,
composition, density and register, this directory governs and the library is a
consumer of it. Keep drawing section 1's values. The reasoning, the arithmetic
that forces each move, the refused alternatives and the library's own twelve
remaining failures are in `CONTRAST-DIVERGENCE.md`; nothing below restates them.

### 16.1 The four divergences, in one table

Mockup ratios are dark-scheme, the only scheme the boards draw. Library ratios
name their scheme.

| Role | What a board paints | What the library ships | Why |
|---|---|---|---|
| selected ground | `#374047` on a `#2a3035` track, or `#28364e` on the `#1f2428` panel, contents in the primary ink `#d5d7da`. No separate on-selected ink exists. Segment vs track = **1.26:1**, row vs panel = **1.29:1** | Three tokens. `RAISED` keeps `#374047` for chips and tracks; `SELECTED` inverts to `#a3a8b1` dark / `#495057` light at **5.59:1** / 7.35:1 against the track; `ON_SELECTED` punches the label out in `#1f2428` / `#ffffff` at 6.56:1 / 8.18:1 | 1.4.11 asks 3:1 of the boundary that shows a control's state. The library resolves in two schemes and a selected patch can only separate by inverting; the boards draw one scheme and have no such obligation |
| the ink ladder | Four live ranks -- `#d5d7da`, `#a3a8b1`, `#7a828e`, `#5f6873` -- with the fourth doing both the disabled and the placeholder job. On a field: 9.26:1, 5.59:1, **3.44:1**, **2.36:1** | Two live ranks. `VALUE` `#d5d7da` / `#000000`; `CHROME`, `PROSE` and `PLACEHOLDER` all `#a3a8b1` / `#495057` at 5.59:1 / 7.35:1 on a field. `#7a828e` survives as `BORDER` and `DIVIDER` only; `#5f6873` survives as an exempt `DISABLED` | 1.4.3 asks 4.5:1 of text and gives placeholder text no exemption, so nothing dimmer than `#a3a8b1` can sit in a `#2a3035` field. `#7a828e` stayed in the palette by changing clause: as a border it answers to 1.4.11's 3:1 |
| the field boundary | A borderless fill, `#2a3035` on `#1f2428` at **1.17:1**, with a line only on focus (`box-shadow: 0 0 0 1px #5b8ff9`) | The same value. `SURFACE` is `#2a3035` in dark, still **1.17:1** -- recorded as failing rather than fixed. Only the mechanism changed: `--input-bd` is `transparent`, not `none`, so the focus border can paint | 1.4.11's 3:1, refused by arithmetic: a fill bright enough to clear it leaves no room for an ink dimmer than white inside it. Do not add a resting border to a board -- the compliant hairline exists and the library declines it, because it would drop the focus indicator from 4.46:1 to 1.30:1 |
| borders and dividers | A panel edge at `#48525c` and a section divider at `#495057` (section 1, *Borders and dividers*), measuring **1.97:1** and **1.91:1** on the `#1f2428` panel | One token for both. `BORDER` and `DIVIDER` are the identical light-dark(gray-6, dark-2) -> `#868e96` light / `#7a828e` dark, **3.32:1** / **4.03:1** on the panel | 1.4.11's 3:1 for a shape that carries meaning. The token that paints a seam also paints a chart bar and the chart baseline, so the seam's weight is set by the bar. `panel.ts:218-226` records the lift from `#48525c` by name. Keep drawing `#48525c` and `#495057`: at this register a seam is found, not seen |

### 16.2 The accent is a fifth, and a different kind

`compact-mantine` sets no `primaryColor` and no `primaryShade`, so its accent
and status colours are stock Mantine -- `#1971c2` dark / `#228be6` light,
`#fab005`, `#40c057`, `#fa5252` -- and not the values in section 1. Keep drawing
`#4a7ee8` and the designloom status set; the instruction at the end of `###
Accent` stands, and the mockup accent in fact measures better on every ground it
is drawn on (4.06:1 on the panel against the library's 3.12:1). This is the one
divergence a reader sees as a different hue rather than a different shade, which
is why it is named here. Neither side moves: the library keeps stock Mantine and
the boards keep `#4a7ee8`. That is settled in `CONTRAST-DIVERGENCE.md` 4.4, not
left open.

The hexes in the JSDoc on `panel.ts`'s `ACCENT`, `WARNING`, `SUCCESS` and
`DANGER` still quote section 1's values. They are stale comments, not the
shipped colours.

### 16.3 An unlisted disagreement is a bug, not a divergence

The five roles above are the whole list. If a board and a running panel disagree
about any other colour, one of them has drifted and it is to be traced and
fixed, not added to the list. A board that paints a hex found neither in section
1 nor in the shared `dark[]` ramp is the defect regardless of what the library
does -- the palette is closed. Extending the list is a decision made the way the
others in this directory are made: clause named, both ratios measured in their
schemes, counter-argument recorded, in `CONTRAST-DIVERGENCE.md`.
