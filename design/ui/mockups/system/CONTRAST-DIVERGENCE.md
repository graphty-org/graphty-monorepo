# CONTRAST-DIVERGENCE -- the mockups keep their palette, the library keeps its ratios, and neither is a defect

`compact-mantine` was made WCAG 2.2 AA compliant in a hardening pass. The
mockups under `design/ui/mockups/` were not, and the two now disagree about five
colour roles. This document is the record of that disagreement, written so that
a later reader does not close it. It is for whoever opens an artboard beside a
running panel, sees that the selected segment is light in one and dark in the
other, and reaches for a fix.

Neither artefact changes. The mockups keep every hex in VOCAB section 1 and
every hex painted on the 62 boards; the library keeps every value in
`PANEL_INK`. Nothing here repaints a board, moves a token, renumbers a section
or reopens the palette. It settles one question only -- which artefact governs
which decision -- and it is the only licence in this repository for the two of
them to differ.

Every ratio below was computed from the two artefacts' own values with the WCAG
2.x relative-luminance formula, not copied from either one's prose. The library
side was also read back from the live tree: its tokens resolve through Mantine's
own `defaultCssVariablesResolver` in `compact-mantine/tests/constants/panel.test.ts`,
and the twenty-six-pairing audit that produces the count in section 6 was run
against the current tree. Verification scripts: `tmp/contrast-audit.ts`, the
twenty-six-pairing audit that produces the count in section 6, and
`tmp/contrast.mjs` for a single pair. This pass changed no colour value and no
artboard. Under `compact-mantine/` it changed exactly two comments, the stale
hexes and ratios named in 4.4, and nothing else; the unrelated component cleanup
visible in `git status` is not part of it.

Precedence. On the colour a shipped control paints, `compact-mantine` wins and
the artboards are a picture of an earlier decision. On layout, composition,
density, register and every rule the other documents in this directory set, the
artboards win and the library is a consumer of them. Where this document and
either artefact disagree about which of them governs a decision, this document
wins. Where it disagrees with either about a value, that artefact wins, because
neither's values are this document's to set.

---

## Contents

- 1. The decision, once
- 2. How a ratio is written here
- 3. The divergence table
- 4. The five divergences, argued
- 5. Authority: which artefact governs what, and what an unlisted disagreement means
- 6. What the library still fails, and why each is accepted
- 7. Recorded so a later pass does not re-derive them

---

## 1. The decision, once

**The library's AA-compliant palette governs shipped colour. The mockups keep
the values they have. The divergence is deliberate, it is bounded by the list in
section 3, and it is not to be reconciled in either direction.**

Three options were on the table: repaint the mockups to the library, walk the
library back to the mockups, or record the divergence. The third was chosen, and
the first two are refused for reasons worth stating rather than assuming.

Repainting the mockups is refused because the mockups are not a colour
specification that happens to be out of date. They are the drawing of a dense
tool panel at a particular register, and three of the five divergent roles carry
that register. The ink ladder is the clearest case: `#7a828e` is the most-used
ink in the whole set -- **4,768 occurrences across 62 boards**, against 3,083 for
`#d5d7da` and 2,350 for `#a3a8b1` -- because every glyph, unit suffix, section
sub-header and trailing readout is painted with it. Collapsing it into `#a3a8b1`
to satisfy 1.4.3 would flatten the rank the boards use to show hierarchy, and
would do it 4,768 times, to make a picture pass a test that pictures are not
given.

Walking the library back is refused because the library ships. A test suite
asserts five of the moved pairs and fails the build if one is moved back
(`compact-mantine/tests/constants/panel.test.ts:94-141`), and each of the three
moves below was forced by an arithmetic that section 4 reproduces rather than
by taste.

What is worth noticing before the list is how little the two artefacts actually
disagree about. `compact-mantine/src/theme/colors.ts:12-23` replaces exactly one
Mantine hue, `dark`, with a ten-step ramp identical to the `theme.ts` dark
palette that VOCAB.md:17-28 tabulates: `#d5d7da`, `#a3a8b1`, `#7a828e`,
`#5f6873`, `#48525c`, `#374047`, `#2a3035`, `#1f2428`, `#161b22`, `#0d1117`. The
rungs are the same rungs. The divergence is entirely about which rung a role
stands on, and it happens because the library has to stand on two ladders at
once and the mockups only ever draw one.

---

## 2. How a ratio is written here

Every number is a WCAG 2.x contrast ratio computed from the two colours named
beside it, written with its inputs -- `#a3a8b1 on #2a3035 = 5.59:1` -- so that it
can be recomputed rather than trusted. The number that decides a case is
**bolded**.

The mockups draw one scheme, the dark one, so a mockup ratio is always a
dark-scheme ratio and carries no further label. The library resolves in two, so
a library ratio always names its scheme. Where a role's two schemes disagree
about passing, both are given.

A requirement is named as a clause number and its threshold together, the way
the library's own notes name it: **1.4.3 Contrast (Minimum), 4.5:1** for text,
and **1.4.11 Non-text Contrast, 3:1** for a shape that carries meaning or for
the visual boundary that distinguishes a control's state. One exemption is
relied on anywhere in either artefact: WCAG 2.2 excludes a component that cannot
be operated from both clauses, which is what lets a disabled control stay dim.
Placeholder text gets no such exemption and is ordinary text; that single fact
forces most of section 4.2.

---

## 3. The divergence table

Five roles. The first three are the divergences proper. The fourth is an
additional finding, included because it is the one place where a reader
comparing a board to a screenshot sees a different hue rather than a different
shade, and would therefore be the first thing they tried to "fix". The fifth is
the quietest of the set: a border weight the library lifted to answer a clause
the boards never had to answer, recorded in the library's own source and still
painted at the value it replaced on every board.

| Role | Mockup value and ratio (dark scheme) | Library value and ratio | The clause, and what it decides |
|---|---|---|---|
| **selected ground / on-selected ink** | One ground, darker than its ink, in two spellings. Segmented and tab and icon-group: track `#2a3035`, selected segment `#374047`, contents in the primary ink `#d5d7da`. List row, rail item, active tab-as-row: selected ground `#28364e` on the `#1f2428` panel, contents still `#d5d7da`. There is no separate on-selected ink at all. Segment vs track = **1.26:1**; segment vs panel 1.48:1; `#d5d7da` on `#374047` = 7.33:1. List form: `#28364e` vs `#1f2428` = **1.29:1**; `#d5d7da` on `#28364e` = 8.43:1 | Three tokens where the mockups have one. `RAISED` = light-dark(gray-3, dark-5) -> `#dee2e6` / `#374047`, demoted to the chip and track role. `SELECTED` = light-dark(gray-7, dark-1) -> `#495057` / `#a3a8b1`, which inverts: a light patch in the dark scheme. `ON_SELECTED` = `--mantine-color-body` -> `#ffffff` / `#1f2428`, the label punched out of it. SELECTED vs its track = **5.59:1** dark / 7.35:1 light; vs the panel 6.56:1 / 8.18:1; ON_SELECTED on SELECTED 6.56:1 / 8.18:1 | 1.4.11, 3:1, for the boundary that distinguishes a control's state; then 1.4.3, 4.5:1, for the label on that ground. The mockup ground fails 1.4.11 at 1.26:1 and 1.29:1, with no exemption available: a selected segment is an operable control whose state is being drawn. Inverting the ground then forces the second token, because `#d5d7da` on `#a3a8b1` is only **1.66:1** |
| **the ink ladder** | Four live levels plus no separate disabled token. Primary `#d5d7da`, secondary `#a3a8b1`, dimmed `#7a828e`, disabled-and-placeholder `#5f6873` -- one value doing both jobs. On the panel `#1f2428`: 10.86:1, 6.56:1, **4.03:1**, **2.77:1**. On a field `#2a3035`: 9.26:1, 5.59:1, **3.44:1**, **2.36:1**. Two of the four are under 4.5:1 on the panel; three of the four are under it on a field | Two live levels. `VALUE` = `--mantine-color-text` -> `#d5d7da` / `#000000`. `CHROME`, `PROSE` and `PLACEHOLDER` are the identical string light-dark(gray-7, dark-1) -> `#a3a8b1` / `#495057`. VALUE 10.86:1 dark / 21.00:1 light on the panel, 9.26:1 / 18.88:1 on a field; the shared step **5.59:1** dark / 7.35:1 light on a field. The mockups' third step survives as non-text only: `BORDER` and `DIVIDER` = light-dark(gray-6, dark-2) -> `#7a828e` / `#868e96`, 4.03:1 dark / 3.32:1 light on the panel. The fourth survives as the additive `DISABLED` = `--mantine-color-disabled-color` -> `#5f6873` / `#adb5bd`, exempt rather than compliant | 1.4.3, 4.5:1, for CHROME, PROSE and PLACEHOLDER. Placeholder text is ordinary text to WCAG and gets no exemption; that clause is what forces the collapse. BORDER and DIVIDER are held to 1.4.11's 3:1 instead, which is exactly why `#7a828e` could stay in the palette in a different role. DISABLED relies on the WCAG 2.2 inactive-component exemption and is measured but not required to pass |
| **the field boundary** | A field is a borderless fill: `background: #2a3035` on the `#1f2428` panel, `border-radius: 4px`, and the palette says so in as many words -- "input border, none (theme.ts `--input-bd: none`)". Fill vs panel = **1.17:1**. A line appears only on focus: `box-shadow: 0 0 0 1px #5b8ff9`, which measures 4.29:1 on the field and 5.03:1 on the panel. The mockups record none of these numbers | `SURFACE` = light-dark(gray-1, dark-6) -> `#f1f3f5` / `#2a3035`. The dark value is the mockups' value, unchanged. SURFACE vs PANEL = **1.17:1** dark, **1.11:1** light, against a 3:1 requirement -- recorded and refused rather than fixed. One mechanism did change: `--input-bd` is `transparent`, not `none`, and `--input-bd-focus` moved from Mantine's filled primary to shade 5 in dark, lifting the focus border from 2.66:1 on the field to **4.46:1** | 1.4.11, 3:1, for the boundary of a component. No exemption is claimed; the pair is recorded as failing, with arithmetic in 4.3 showing that no token move can fix it. The focus indicator is held to the same 3:1, and that one was fixed |
| **accent and the status colours** | Accent `#4a7ee8` (hover `#5b8ff9`, pressed `#3a6dd7`, tint `#28364e`), text on accent `#ffffff`; success `#61d095`, warning `#f7b731`, info `#33bfd7`, danger `#eb4949`. VOCAB is emphatic that the app's stock blue is not to be drawn: "Do not use those in the mockups; use `#4a7ee8`." `#4a7ee8` on the panel = 4.06:1, on a field 3.46:1, on the raised `#374047` = 2.74:1; white on it = **3.86:1** | `ACCENT` = `--mantine-primary-color-filled`, `ON_ACCENT` = `--mantine-primary-color-contrast`, `WARNING`/`SUCCESS`/`DANGER` = yellow-6 / green-6 / red-6. The theme sets no `primaryColor`; it sets `primaryShade: {light: 8, dark: 5}` and `autoContrast`, so the accent resolves to `#339af0` with black text on it in dark and `#1971c2` with white text in light; the status colours stay stock Mantine `#fab005`, `#40c057`, `#fa5252` -- none of them the mockup hexes. Accent on the panel 5.23:1 dark / 5.02:1 light; on a field 4.46:1 / 4.51:1; on the raised track 3.53:1 / 3.86:1; text on the accent 7.02:1 (black) dark / 5.02:1 (white) light | 1.4.11, 3:1, for the accent fills and the status glyphs; 1.4.3, 4.5:1, for the text on the accent. The library's accent now passes on every ground and for the label drawn upon it; the mockup accent fails 1.4.3 for white text (3.86:1) and 1.4.11 on the raised track (2.74:1). What remains is a difference of hue, and in dark a difference of label colour |
| **borders and dividers** | A panel edge is `1px solid #48525c` (VOCAB.md:89) and a section divider `1px solid #495057` (VOCAB.md:90); the subtle rule inside a card or between list rows is `#374047` (VOCAB.md:91). On the `#1f2428` panel those measure **1.97:1**, **1.91:1** and 1.48:1. The boards record none of the numbers | One token does both jobs. `BORDER` and `DIVIDER` are the identical string, light-dark(gray-6, dark-2) -> `#868e96` light / `#7a828e` dark, **3.32:1** light / **4.03:1** dark on the panel. `panel.ts:218-226` is the library's own record of the move: "Lifted from the #48525c of the original palette, which measured 1.97:1 on the panel against the 3:1 WCAG AA requirement for meaningful non-text such as a chart bar. This is the dimmest step of the palette that meets 3:1 on the panel in both colour schemes." `ControlSection.tsx:313` draws the section rule from `DIVIDER` today | 1.4.11, 3:1, for a shape that carries meaning. The token that paints a seam also paints a chart bar and the chart baseline, and a bar carries information, so the border weight is set by the bar. The mockup values fail the clause at 1.97:1 and 1.91:1 with no exemption available |

---

## 4. The five divergences, argued

### 4.1 SELECTED and ON_SELECTED: the selected ground inverts

**What the mockups draw.** One raised step doing two jobs. `#374047` is the
selected segment of a tab row (VOCAB.md:387 states the rule in words, the
snippet at VOCAB.md:391 repeats it, and the RT-3 icon group at VOCAB.md:2032 and
VOCAB.md:2051 repeats it again), and the same `#374047` is the ground under a
rank chip and the track a micro-bar runs along. The list-row spelling uses the
accent tint `#28364e` instead (VOCAB.md:40, VOCAB.md:410), painted at
Main.dc.html:180 for the selected rail item. Both spellings keep `#d5d7da` on
them: the mockups have no on-selected ink, because a selected item there is a
row like every other row that happens to have a ground.

**Why the library moved.** The two jobs pull in opposite directions and 3:1
exists for only one of them. A raised ground has things drawn *on* it -- a chip's
label, a bar's coloured fill -- so in the dark scheme it has to stay dark enough
for those to remain legible. A selected item is the other way round: it has to
separate from the track around it, which in the dark scheme means going lighter.
Lifting the single token far enough to serve the selected segment is what made
the chip label and the bar fill unreadable, so the pass split the role in two.
`RAISED` keeps the mockups' `#374047` for the chip and the track; `SELECTED`
inverts to `#a3a8b1` in dark and `#495057` in light, clearing **5.59:1** against
its track in dark and 7.35:1 in light.

Inverting the ground then forces a third token, and this is the step that has no
counterpart in the mockups at all. A ground bright enough to clear 3:1 against
its track is too bright to carry the primary text colour: `#d5d7da` on `#a3a8b1`
measures **1.66:1**. So `ON_SELECTED` takes the panel's own colour and the label
reads as a shape punched out of a solid patch, at 6.56:1 dark and 8.18:1 light.
One mockup token becomes three library tokens, and the selected patch reads
light-on-dark in the dark scheme where the mockups read dark-on-dark.

**What would be lost if the mockups were corrected.** Every segmented track, tab
row, icon group, rail item and selected list row across 62 boards would gain a
bright patch in a dark panel. That is not a shade change; it changes what the
boards are a drawing of. The whole set is drawn in the register of a dense dark
tool panel where the current choice is a slightly warmer shade of its
surroundings, and the accent tint `#28364e` is the only ground the boards paint
a selected item with (VOCAB.md:40). Repainting it out to satisfy 1.4.11 would remove the one visual signal
that ties a selected rail item to the accent, in exchange for a compliance
property that a static picture cannot be audited for anyway.

There is also a reason the mockups had no way to arrive at the library's answer.
`SELECTED` inverts *because it must work in two schemes*: a value that separates
from its track in dark and in light cannot be one direction away from the track,
it has to be the opposite direction in each. The mockups draw one scheme. A
one-scheme artefact has no occasion to build the machinery that a two-scheme one
cannot avoid, and it should not be penalised for lacking it.

### 4.2 The ink ladder: four live text levels collapse to two

**What the mockups draw.** Four ranks of live text and no separate disabled
token, tabulated at VOCAB.md:50-57: primary `#d5d7da`, secondary `#a3a8b1`,
dimmed `#7a828e`, and `#5f6873` doing double duty as disabled and as
placeholder. The third rank carries most of the drawing -- the field glyph and
the unit suffix at VOCAB.md:1912 and VOCAB.md:1916, section sub-headers, the
status bar, technical names, the closed letter set at VOCAB.md:1942 -- and the
fourth is separately ruled at VOCAB.md:2798-2803, which requires that a disabled
control draw at `#5f6873` and forbids it at `#7a828e` and at `#d5d7da` by name.

**Why the library moved.** On a `#2a3035` field, no neutral dimmer than about
`#969696` carries text at 4.5:1. The mockups' dimmed step measured 4.03:1 on the
panel and **3.44:1** on a field; the placeholder step measured **2.36:1** on a
field. Both had to be lifted, and the rung they had to be lifted to is
light-dark(gray-7, dark-1) -- the dimmest step of the shared palette that clears
4.5:1 on *both* grounds in *both* schemes. That rung was already occupied by the
secondary ink. So once chrome and placeholder land there, they are
indistinguishable from prose, and "glyph ink", "placeholder ink" and "reading
prose" become one colour with three names.

Placeholder is the clause that forces it, and it is worth naming precisely,
because it is the step a reader is most likely to think was avoidable.
Placeholder text is ordinary text to WCAG. There is no exemption for it. A
placeholder cannot be dimmer than the secondary text and still meet AA on a
field, full stop.

The lift then created a regression the pass had to undo separately. `#5f6873`
had been both the disabled ink and the placeholder ink; lifting the placeholder
would have taken the disabled ink with it, and disabled controls would have read
almost as bright as live ones. Hence the additive `DISABLED` token, deliberately
left at the old dim step, guarded by a test that asserts the opposite of a
minimum: a disabled control must measure no more than half the placeholder's
ratio and still stay above 1.5:1, so that a dead control neither advertises
itself as live nor disappears (`panel.test.ts:130-140`).

The mockups' third step did not leave the library. It changed clause.
`#7a828e` / `#868e96` is `BORDER` and `DIVIDER` now, held to 1.4.11's 3:1 rather
than 1.4.3's 4.5:1, where it measures 4.03:1 dark and 3.32:1 light on the panel.
The same hex, the same ramp, a different requirement.

**What would be lost if the mockups were corrected.** The count in section 1 is
the argument: 4,768 paintings of `#7a828e` across 62 boards, more than either
ink above it. The ladder is what the boards use to encode rank inside a 32px
row -- the value brighter than its label, the label brighter than its unit, the
unit brighter than nothing. Collapse two of the four rungs and a row's internal
hierarchy goes flat, in the one artefact whose job is to show hierarchy at a
glance. Worse, the disabled rule at VOCAB 13.1 is defined *relative to* the
dimmed step: it works because `#5f6873` is visibly below `#7a828e`. Lift
`#7a828e` to `#a3a8b1` and the disabled ink is suddenly two rungs below live
chrome instead of one, which changes how every disabled control on the boards
reads and would require the rule at VOCAB.md:2798-2803 to be rewritten. That
rule is not this document's to reopen, and it is not the library's either.

### 4.3 SURFACE: the field boundary stays below 3:1 on purpose

**What the mockups draw.** A field is a fill and nothing else: `#2a3035` on
`#1f2428`, 4px radius, no border property anywhere -- see the atom at
VOCAB.md:1910-1918, the palette line at VOCAB.md:92, and a live instance at
StylePanel.dc.html:631. The fill is **1.17:1** against the panel. The only line a
field ever draws is the focus ring at VOCAB.md:93.

**Why the library did not move the value.** It did not. `SURFACE` in the dark
scheme is still `#2a3035`. What changed is the status of the number: from
unremarked to recorded and refused, with the arithmetic attached. The panel has
a relative luminance of 0.017. For a fill to reach 3:1 against it, the fill needs
a luminance of at least `3 x (0.017 + 0.05) - 0.05 = 0.151`. For text on *that*
fill to reach 4.5:1, the ink then needs a luminance of at least
`4.5 x (0.151 + 0.05) - 0.05 = 0.855` -- essentially pure white, since white is
1.000. So any field bright enough to have a compliant boundary has no room
inside it for an ink dimmer than white, and the value ink and the secondary ink
merge. Giving a field a visible boundary is therefore a design decision -- a
hairline, a shadow, an underline -- and not a token move. The library leaves it
to the owner and says so.

One mechanism did change, and a drafter should know why. `--input-bd` went from
the mockups' literal `none` to `transparent`, because Mantine draws an input's
border as `1px solid var(--input-bd)` and shows focus by swapping only that one
variable. `none` makes the whole declaration invalid at computed-value time, so
the focus rule could never paint: the field was borderless *and*
unfocusable-looking. `transparent` keeps the resting field borderless and
reserves the 1px the focus ring needs. The focus colour then moved from Mantine's
filled primary -- stock Mantine's shade 8 in dark, measuring 2.66:1 on the field
and 3.12:1 on the panel, under 3:1 -- to shade 5, at **4.46:1** on the field and
5.23:1 on the panel. Light mode keeps the filled colour, which the theme's
`primaryShade` makes shade 8: 4.51:1 and 5.02:1.

**What would be lost if the mockups were corrected.** There is no value to
correct, so the risk runs the other way: a drafter who reads "the library made
the field boundary compliant" and adds a resting hairline to every field on the
boards would be drawing a thing the library explicitly declines to ship. The
compliant hairline exists -- the now-lifted `BORDER` gives 4.03:1 dark and 3.32:1
light against the panel -- and the library refuses to wire it into `--input-bd`
anyway, because a permanently visible grey border reduces the new focus
indicator to a grey-to-blue swap of **1.30:1** in dark and 1.07:1 in light,
instead of the transparent-to-blue **4.46:1** it gets now. Making the resting
boundary visible would cost the focus indicator, and the focus indicator is held
to the same clause. That trade is recorded here so it is not re-derived from the
other end.

### 4.4 ACCENT and the status colours: the library never adopted the mockups' accent

This is an additional finding rather than one of the three, and it is here for a
practical reason: it is the only divergence a reader notices as a different
*hue*. Everything above is a different shade of the same ramp, which reads as a
rendering difference; a blue that is visibly not the blue on the board reads as
a bug, and would be the first thing someone tried to fix.

**What the mockups draw.** `#4a7ee8` and the designloom status set, with an
explicit instruction at VOCAB.md:72-74 not to draw the running app's stock blue.

**What the library ships.** Not that. `compact-mantine` sets no `primaryColor`,
and replaces only the `dark` hue in the palette, so `ACCENT` follows Mantine's
blue and `WARNING`, `SUCCESS` and `DANGER` are stock Mantine `#fab005`,
`#40c057`, `#fa5252`. It does set `primaryShade: {light: 8, dark: 5}` and
`autoContrast: true` (`compact-mantine/src/theme/index.ts`), so the accent is
`#1971c2` with white text on it in the light scheme and `#339af0` with black
text on it in the dark one.

**Why the shade is set.** Stock Mantine fills blue-6 `#228be6` in light and
blue-8 `#1971c2` in dark, both with white text. That failed WCAG AA in four
places: white on `#228be6` is 3.56:1 against the 4.5:1 for text -- every filled
`Button` -- and against 3:1 the fill measured 2.73:1 on the light raised track,
and in dark 2.66:1 on a field (a checked checkbox) and 2.11:1 on the raised
track (a micro-bar). An earlier
version of this document recorded those as accepted, on the grounds that a
`primaryShade` change was too global to impose on a consumer. That was reversed:
a library's default should pass, and a consumer who wants another shade sets
one. No single blue shade carries white text at 4.5:1 and still stands 3:1 off
the dark panel, so the dark scheme takes a lighter fill with dark text on it,
and `autoContrast` picks the text colour from the fill so a consumer's own
`primaryColor` gets readable text too.

| Scheme | Accent | On the panel | On a field | On the raised track | Text on it |
|---|---|---|---|---|---|
| light | blue-8 `#1971c2` | 5.02 | 4.51 | 3.86 | white 5.02 |
| dark | blue-5 `#339af0` | 5.23 | 4.46 | 3.53 | black 7.02 |

`compact-mantine/tests/constants/panel.test.ts` asserts every cell of that
table against its WCAG threshold, from the resolved theme, in both schemes.

**Why `autoContrast` alone is not enough.** Mantine's components choose black or
white text once, in JavaScript, from the light-scheme shade, and a few
(the keyboard-selected option in a Select dropdown, the Switch thumb and its
on-label) hard-code white. Left alone, every filled control in the dark scheme
paints white on `#339af0`, 2.99:1. The theme therefore hands the browser both
answers through CSS `light-dark()` (`compact-mantine/src/theme/contrast.ts`),
sends the selected option's white through `--mantine-primary-color-contrast`,
and keeps a checked Switch's track at blue-8 in both schemes so its white thumb
measures 5.02:1. It also sets `luminanceThreshold: 0.18`, the luminance at which
black and white text measure the same (about 4.56:1), so the choice clears
4.5:1 on any fill. `compact-mantine/tests/theme/accent-contrast.browser.test.tsx`
measures the painted colours of those controls in both schemes.

**The mockups against the library.** The library's accent now passes on every
ground and for the label drawn upon it. The mockups' `#4a7ee8` measures 4.06:1
on the panel, 3.46:1 on a field and 2.74:1 on the raised track, and white on it
is **3.86:1**. What is left is a divergence of hue, plus, in the dark scheme,
of label colour (black on the library's accent, white on the boards'). Neither
side moves for the hue: adopting the mockup blue in the library is a decision
to be taken in this document, by amending the table in section 3, rather than
quietly in `theme/index.ts`, and it would have to keep both ratios above.

**Two stale comments, since corrected.** The JSDoc parentheticals at
`compact-mantine/src/constants/panel.ts` once quoted the *mockup* hexes for four
tokens -- `#4a7ee8`, `#f7b731`, `#61d095`, `#eb4949` -- even though the theme
resolves them to Mantine's, so a reader of the library's own source would have
concluded it already draws the boards' accent. They now quote the resolved
values. The comment at `compact-mantine/src/components/rows/ChartRow.tsx` once
quoted the light-scheme blue-6 measured against the dark grounds; it now quotes
the current shades, which pass on both the field and the raised surface.

### 4.5 BORDER and DIVIDER: the seam is lifted off the boards' value

**What the mockups draw.** A panel edge at `1px solid #48525c` (VOCAB.md:89), a
section divider at `1px solid #495057` (VOCAB.md:90), and a subtle rule inside a
card or between list rows at `#374047` (VOCAB.md:91). Against the `#1f2428`
panel those are **1.97:1**, **1.91:1** and 1.48:1. The boards record none of the
numbers, because at this register a seam is meant to be found rather than seen:
an edge heavy enough to clear 3:1 reads as a frame around the panel.

**Why the library moved.** One token does two jobs. `BORDER` paints the edge of
a control, and it paints a chart bar and the chart baseline. A bar is a shape
that carries information, so 1.4.11's 3:1 applies to it whether or not a reader
would demand it of a decorative seam, and the token cannot be two weights at
once. `panel.ts:218-226` says exactly this: "Lifted from the #48525c of the
original palette, which measured 1.97:1 on the panel against the 3:1 WCAG AA
requirement for meaningful non-text such as a chart bar. This is the dimmest
step of the palette that meets 3:1 on the panel in both colour schemes."
`DIVIDER` is the identical string, so the section rule that
`ControlSection.tsx:313` draws came along with it: `#868e96` light and `#7a828e`
dark, 3.32:1 and 4.03:1 on the panel. Section 6.4 banks both as a win of the
pass.

**What would be lost by repainting the boards.** `#7a828e` is already the
mockups' dimmed *ink*, the one carrying 4,768 of the paintings counted in
section 1. Drawing a panel edge in it puts the seam at the weight of the text
beside it, which is the one thing a seam in a panel this dense must not do -- and
it does it at every panel edge, rail edge and section rule across 62 boards. The
boards also draw one scheme, where the seam only has to hold against `#1f2428`;
the library's value is set by the harder light-scheme case as well, which the
boards have no occasion to solve.

---

## 5. Authority: which artefact governs what, and what an unlisted disagreement means

### 5.1 The split

**`compact-mantine` is the source of truth for the colour a shipped control
paints.** `PANEL_INK` is what runs, it is what a user's contrast checker
measures, and it is what the test suite defends. An artboard is a picture of an
earlier decision about colour and has no authority over a running panel.

**The artboards and the documents in this directory are the source of truth for
layout, composition, density, register, and every rule they set.** Row types and
routing, the door test, the anchor rule, section expansion, the floor, the glyph
and tooltip register, control sizes, the type ramp, the canonical strings -- all
of that is decided here and consumed by the library, not the other way round. A
library implementation that contradicts COMPACTION-1.6, DECISIONS-1.7,
DECISIONS-1.8, SECTIONS-1.9 or FLOOR-1.9 is wrong, and the fix is in the
library.

A useful way to hold the two apart: **the boards decide where a thing goes and
what it says; the library decides what colour it comes out.** The five rows in
section 3 are the entire set of colour decisions where the boards no longer
govern.

### 5.2 An unlisted disagreement is a bug

If the artboards and `compact-mantine` disagree about a colour that is **not** in
the table in section 3, that is not a second divergence. It is a defect in one
of the two, and it must be traced and fixed rather than added to this list. This
document is the only licence in the repository for the two artefacts to differ,
and it licenses exactly five roles.

How to tell which side is at fault. If the disagreement is about a role the
library holds to a WCAG clause and the artboards paint dimmer, check whether the
library's note names the clause and gives a before-value; if it does, the
library moved deliberately and the entry belongs here after this document is
amended to say so. If the library has no such note, the library is the one that
drifted and the fix is in `PANEL_INK`. And if a board paints a hex that is in
neither VOCAB section 1 nor the library's ramp, the board is the defect,
regardless of what the library does -- the palette is closed.

Amending this list is allowed and expected. Adding a sixth row is a decision,
and it is made the way the other decisions in this directory are made: with the
clause named, the two ratios measured in their schemes, and the counter-argument
recorded. Silently repainting one side to match the other is not.

---

## 6. What the library still fails, and why each is accepted

The library targets WCAG 2.2 AA. It does not reach it everywhere, and a record
that only listed the mockups' shortfalls would be dishonest. The full audit
covers twenty-six pairings across both schemes, and **8** of them still fail.
The hardening pass reduced that count, but by how much cannot be recomputed from
this tree, so no before-figure is stated here: `PANEL_INK` has a single commit in
its history, and three of the tokens the audit pairs -- `SELECTED`,
`ON_SELECTED` and `DISABLED` -- were created by the pass itself, so there is no
earlier set of twenty-six pairings to measure. The eight that remain are listed
here in full,
because until now they lived only in an untracked script and this is their first
durable home.

Measured against the live tree, with tokens resolved through Mantine's own
variable resolver. Three failures are in the dark scheme, five in the light one.
Four accent pairings that an earlier version listed here -- white on the light
accent, and the dark accent on a field and on the raised track, and the light
accent on the raised track -- were fixed by the theme's `primaryShade` (4.4).

### 6.1 Three reasons, and the one failure that is none of them

Every accepted failure falls into one of three buckets, and it is worth naming
them because they recur:

1. **Settled at the drawing site, by choosing the ink or the ground rather than
   by moving a token.** The failing pair is retained as the measurement of a
   combination the code does not actually draw.
2. **A decorative ground carrying no meaning of its own.** 1.4.11 asks about
   shapes that carry information; a chip whose rank is carried by the text on it
   does not qualify.
3. **A change too global to make on a consumer's behalf.** Yellow and green on
   white.

Exactly one failure is in none of the three: the field boundary, refused by the
arithmetic in 4.3 and handed to the owner as an open design decision.

### 6.2 The eight

| Scheme | Pair | Ratio / need | Why it is accepted |
|---|---|---|---|
| dark | rank chip ink on the chip -- PROSE `#a3a8b1` on RAISED `#374047` | **4.43** / 4.5 | Bucket 1. Misses by 0.07, and the row does not draw it: `DataRow.tsx:686-688` labels the chip in the primary ink, which measures 7.33:1 on the same ground. Retained as the measurement of the ink the row declines to use |
| dark | field surface against the panel -- SURFACE `#2a3035` on PANEL `#1f2428` | **1.17** / 3 | The one that is in no bucket. Refused by arithmetic (4.3): a fill bright enough to clear 3:1 leaves no room for an ink dimmer than white inside it. A visible boundary is a design decision for the owner |
| dark | rank chip against the panel -- RAISED `#374047` on PANEL `#1f2428` | **1.48** / 3 | Bucket 2. The chip's ground carries no meaning on its own; the rank is carried by the text on it, which passes at 7.33:1 |
| light | field surface against the panel -- SURFACE `#f1f3f5` on PANEL `#ffffff` | **1.11** / 3 | The same arithmetic as the dark case, and worse |
| light | rank chip against the panel -- RAISED `#dee2e6` on PANEL `#ffffff` | **1.30** / 3 | Bucket 2, as above |
| light | a field border against the field fill -- BORDER `#868e96` on SURFACE `#f1f3f5` | **2.99** / 3 | Misses by 0.01. BORDER is already the dimmest step of the shared palette that clears 3:1 on the *panel* in both schemes (4.03:1 dark, 3.32:1 light), and the panel is the ground that matters for chart bars and the section divider. The field fill is the lighter ground and it lands one hundredth short |
| light | warning glyph on the panel -- WARNING `#fab005` on `#ffffff` | **1.86** / 3 | Bucket 3. Yellow cannot reach 3:1 on white before yellow-9 `#e67700`, which measures 3.00:1 and is orange. That is a palette decision, not a mechanical fix |
| light | success glyph on the panel -- SUCCESS `#40c057` on `#ffffff` | **2.36** / 3 | Bucket 3, same reason |

### 6.3 The two exempt pairs, measured and deliberately left low

Disabled ink on a field is 2.36:1 dark and 1.87:1 light; on the panel it is
2.77:1 and 2.07:1. These are exempt under WCAG 2.2's exclusion of inactive
components from 1.4.3 and 1.4.11, and they are asserted to *stay* low by
`panel.test.ts:130-140`. They are counted separately from the eight because
they are not failures; they are the point.

### 6.4 What the pass bought, worth quoting so it is not undone

Accent fill on the panel 5.23:1 dark / 5.02:1 light, on a field 4.46:1 / 4.51:1,
on the raised track 3.53:1 / 3.86:1, and text on it 7.02:1 / 5.02:1 -- all
held by `panel.test.ts`'s accent block. Danger glyph 4.77:1 /
3.28:1. Chart bars and the section divider 4.03:1 / 3.32:1. A field border
against the field fill 3.44:1 in dark. The selected segment against its track
5.59:1 / 7.35:1, and its label on it 6.56:1 / 8.18:1. Placeholder text on a
field 5.59:1 / 7.35:1. Three of these are held by
`compact-mantine/tests/constants/panel.test.ts:111-141` -- the selected segment
against its track, its label on it, and placeholder text on a field -- and a
token moved back below the ratio one of those roles needs fails there rather
than in a consumer's product. That block's other two assertions cover a selected
item against the panel and the ceiling on a disabled control, which are not in
the list above. The remaining four -- the accent fill on the panel, the danger
glyph, the chart bars and divider, and the field border on the field fill -- are
measured here and asserted nowhere, except the accent fill, which is asserted
now.

---

## 7. Recorded so a later pass does not re-derive them

The five divergences in section 3 are decided. Do not re-open any of them by
measuring one artefact against the other and reporting the difference as a
finding; the difference is the finding, and it is written down here.

Specifically, and by name:

1. **The mockups' selected ground is not a contrast bug.** `#374047` on a
   `#2a3035` track at 1.26:1, and `#28364e` on a `#1f2428` panel at 1.29:1, are
   the drawn register of the boards. Do not repaint them to `#a3a8b1`, and do
   not introduce an on-selected ink into VOCAB. The library inverts because it
   resolves in two schemes; the boards draw one.
2. **The mockups' four-rung ink ladder is not a contrast bug.** `#7a828e` at
   4.03:1 and `#5f6873` at 2.36:1 are load-bearing for hierarchy and for the
   disabled rule at VOCAB 13.1. Do not collapse them into `#a3a8b1`. The library
   collapses them because placeholder text has no exemption on a live field.
3. **The mockups' borderless field is not an oversight.** 1.17:1 is the same
   1.17:1 the library ships, recorded and refused there for a reason reproduced
   in 4.3. Do not add a resting hairline to the boards: the compliant hairline
   exists and the library declines it, because it would cost the focus indicator
   more than it buys the boundary.
4. **The mockups' accent is not the library's accent, and that is known.**
   `#4a7ee8` is instructed at VOCAB.md:72-74 and no longer beats the
   library's blue on any ground. Do not repaint the boards to the library's
   blue, and do not repaint the library to `#4a7ee8` either: it would fail
   1.4.3 for white text; 4.4 records why neither side moves. `panel.ts`'s own
   comments quote the library's resolved values rather than the boards', so
   the two are no longer confusable from the source -- they were not always,
   which is what 4.4's first stale comment was.
5. **The mockups' `#48525c` panel edge and `#495057` section divider are not
   contrast bugs.** At 1.97:1 and 1.91:1 on the `#1f2428` panel they are below
   1.4.11's 3:1 and they are the drawn register of the boards, where a seam is
   found rather than seen. Do not repaint them to `#7a828e`, which is the
   boards' dimmed ink. The library lifted `BORDER` and `DIVIDER` because the one
   token also paints a chart bar and a baseline, shapes that carry meaning;
   `panel.ts:218-226` is its own record of the lift, quoted in 4.5.

Three refusals that were considered and are not to be re-proposed: repainting
the boards to the library's palette (refused in section 1, at a cost of 4,768
paintings of one ink alone); walking the library's tokens back to the boards
(refused in section 1; five of the moves are defended by a failing test); and
wiring the compliant `BORDER` hairline into `--input-bd` to close the field
boundary (refused in 4.3, at a measured cost of 4.46:1 -> 1.30:1 on the focus
indicator in dark).

What this document does not reach. It does not touch a colour, an artboard, a
`PANEL_INK` value or a mockup. It does not reopen VOCAB section 1, VOCAB section
13's disabled rule, or any rule set by COMPACTION-1.6, DECISIONS-1.7,
DECISIONS-1.8, SECTIONS-1.9 or FLOOR-1.9. It claims no revision number and
supersedes nothing. It grants exactly one thing: permission for five colour
roles to disagree, and an instruction to treat any sixth disagreement as a bug.
