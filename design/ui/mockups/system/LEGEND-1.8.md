# LEGEND-1.8 -- the legend component

The canvas legend is one component, drawn the same way on every board that has
one. This file holds its rules, in the eight numbered sections the other
system files and the artboards cite as "LEGEND-1.8 section N".

The original file was lost before it was ever committed (FLOOR-1.9 section 6
records the overwrite). This text is rebuilt from what the surviving record
quotes or measures: DECISIONS-1.8, ARTBOARD-CHANGES-1.8, FLOOR-1.9, VOCAB 14.5
and 14.6, and the legend comments and markup on the artboards. Where the record
does not say something, this file says so rather than guessing.

Revision 1.8 changed the component after these rules were written:
DECISIONS-1.8 C2, C3 and C6 rewrite sections 1, 4, 5 and 6. Each section below
gives the rule and then what 1.8 changed. VOCAB 14.5 (the reading legend) and
14.6 (the export legend) hold the markup.

## 1. The box

- One box, bottom-right of the canvas at the 12 px overlay inset. It never
  moves; a canvas pop-out that needs the space moves or scrolls instead.
- **256 px wide on every board.** The set used to run ten widths. 256 is the
  smallest 8 px step whose content box (256 less 16 of padding and 2 of border,
  so 238) holds every header in the set on one line but two, and it still
  clears the centred 246 px canvas toolbar by 25 px against the 16 px minimum
  that 5.6 sets.
- A header longer than 238 px wraps to two lines. That is the honest outcome:
  no width both holds it and clears the toolbar. One is
  `Color: Tight clusters (Markov clustering, MCL)`, 250 px at 11 px. The
  longest header that does fit is `Arrow: payment direction (edge direction)`
  at 230.5 px.
- No "Legend" caption.
- Blocks are separated by a 1 px `#374047` rule.

**Changed in 1.8 (C6):** the on-screen `max-height` drops from 334 to 240 (200
on iPad). Above the cap, categorical blocks shorten one row at a time from the
smallest channel upward; a block is never dropped. The export legend has no
cap. One board, ExplorerLargeGraph, keeps 334 and records why in its legend
comment (see section 4, last bullet).

## 2. Blocks and headers

- One block per **encoded** channel (see section 8), in this order: Color,
  Size, Outline, Edge width, Arrow.
- These five are the only channel words. No other word heads a block.
- The header is the channel word, a colon, the attribute's plain name, then its
  technical name in parentheses in the dimmed ink `#7a828e`:
  `Size: Most connected (Degree centrality)`, `Color: node type (type)`. Where
  a block keys an analysis run, the run name is the plain name:
  `Outline: Find a path (shortest path)`.
- **The palette name is not printed in the legend body.** Its one home is the
  Style panel's Palette select, which is why that select stays resident in the
  panel rather than moving behind a door.

## 3. Quantitative blocks

- A quantitative block draws **min / median / max**: three stops, the middle
  one carrying the word "median". A diverging block draws min / midpoint /
  max. The old one-line `1 to 44` string is retired, grammar and characters
  both: `1 / 6 / 44` and `1 / 22 / 44` would print the same string.
- The swatch radius or weight at each stop is the encoding's own transform,
  so a sqrt-scaled size block draws sqrt-scaled discs.
- **The scale word is always printed, even when it is the default**, on the
  line under the ticks: `sqrt scale`, `linear scale`, `-log10 scale`,
  `diverging scale`. The legend travels inside an exported image where no one
  can hover a glyph. DECISIONS-1.8 C3 keeps this rule on both surfaces and
  overrides 6.9's "only a non-default scale prints its name" for the legend.
- A clamped scale prints its clamp line under the scale word, for example
  `clamped at -4.2 and 3.8; 12 nodes beyond the ends`.
- Nodes with no value get their own row, `not measured (N nodes)`.

## 4. Categorical blocks

- One row per category: a 10 px swatch and the label.
- Categorical colors use the Okabe-Ito spelling, in order: `#e69f00`,
  `#56b4e9`, `#009e73`, `#f0e442`, `#0072b2`, `#d55e00`, `#cc79a7`. Boards
  with more groups continue with `#b58a3c`, `#66c2a5`, `#8da0cb` and
  `#e78ac3` (ExplorerLargeGraph's eleven).
- A small ordinal domain may be drawn as its complete set of stops instead of
  as endpoints, for example the four numbered stops `1 2 3 4` with
  `Path order  source to target`.
- **The Other row carries the coverage footer; there is no separate footer
  line.** It reads, for example, `Other (3,388 groups, 43% of nodes)`, is drawn
  in the neutral the canvas paints for the same nodes, and opens the groups
  table when clicked.
- **No legend swatch the canvas does not paint.** A row's swatch is a fill the
  canvas actually draws for those nodes.

**Changed in 1.8 (C3):** on canvas, no category counts (the `space-between`
count span comes off the row) and at most five rows plus Other. The export
legend keeps twelve rows with counts, then Other.

## 5. State rows

- State rows are app chrome, not encoded channels: Selected, Open notes, Not
  on path (dimmed), and the other states an action draws on the canvas. They
  form one final block, after every channel block.
- **A state row's swatch is colour-agnostic**: a transparent disc with a
  1.5 px white ring for Selected, the neutral `#a3a8b1` for Open notes. It
  never borrows a data color.
- No counts on state rows.
- A state row is a state row wherever it is drawn. `Not on path (dimmed)`
  belongs here, not inside the path's Outline block.
- The original fixed an order for these rows. The surviving record cites that
  order but never lists it, so it is not restated here. Whoever next changes
  the export legend should write it into this section.

**Changed in 1.8 (C3):** the state-row block leaves the canvas legend entirely.
It renders in the export legend, one row per state drawn in the frame, and in
Help's "What the marks mean". On canvas, other regions name each state: the
filter strip, the status bar, the time bar, the path result card and the
inspector header.

## 6. The compact legend

When a bottom dock (the data table drawer) is open, the minimap hides and the
legend compacts rather than hiding, because an encoded channel always needs
its line. The compact legend is one line per encoded channel: the header and
the scale in one word, for example:

- `Color: node type, categorical`
- `Size: Most connected, sqrt`

**Changed in 1.8 (C6):** the compact legend is no longer a separately
specified component. It is the reading legend with the swatch rows and the
ramps taken out and the header lines kept: same 256 width, same right edge, no
cap and no scroll. The two lines above are unchanged as strings.

## 7. The datasets' stops

The quantitative stops every board uses for each sample dataset, so the same
encoding reads the same on every board. FIXTURES.md holds the numbers they come
from.

| Dataset                | Channel    | Attribute                    | Stops                      | Scale     |
| ---------------------- | ---------- | ---------------------------- | -------------------------- | --------- |
| Cat graph              | Size       | Most connected (degree)      | 2 / median 3 / 4           | sqrt      |
| Fraud ring             | Size       | Most connected (degree)      | 1 / median 6 / 44          | sqrt      |
| Ovarian STRING network | Size       | Most connected (degree)      | 1 / median 5 / 41          | sqrt      |
| Ovarian STRING network | Size       | significance (padj)          | 0.05 / median 1e-3 / 1e-12 | -log10    |
| Ovarian STRING network | Color      | fold change (log2FoldChange) | -4.2 / midpoint 0 / 3.8    | diverging |
| Ovarian STRING network | Edge width | confidence (combined_score)  | 0.4 / median 0.6 / 0.99    | linear    |

The median 5 on the ovarian degree row is invented once, here, and used on
every ovarian board.

**The cat graph has no edge channel.** Its edges are drawn at one width, 1.5,
on every board; a width ramp there would be an encoded channel with nothing
true to put in its block.

## 8. No block for an unencoded channel

A block appears only for a channel the canvas is encoding right now. A
capability that is not built is not a channel, and a channel that is not
encoded at the current point (for example while History previews an earlier
step) has no block until it is encoded again.

A channel that is encoded but still being measured keeps its block, with a
departure line that says so (`sized after load`).
