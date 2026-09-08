# Compaction 1.6 -- the row-type system

Revision 1.5 left the interface text-heavy after five passes because every pass
cut sentences and none changed the shape of a row. Measured now, across all 39
artboards at 1440x900: **14,368 visible words, 368 per screen.** Cutting words
inside the current anatomy is worth about a quarter of that and will not fix
the complaint, because the complaint is not really about words. It is about
this: our unit of interface is a stack -- an 11px label line, then a 24px
field, then an explanation line, then a text button -- where Figma's unit is a
single 24px field whose label lives inside it as one glyph. Our label-above-
field control costs 38px of height for one value. Figma's row costs 32px for
two. That is a 2.9x density difference, and it is why our panels scroll and
theirs do not.

So 1.6 is not a copy edit. It is a closed set of ten row shapes, a decision
procedure that assigns every piece of information to exactly one of them, a
floor that vetoes the procedure, and a per-screen work list.

Three numbers to hold the next revision to, in this order of importance:

| Metric | Now | Target |
|---|---|---|
| Panel scroll height, worst case (AnalyzePanel card list) | 3,060px in a 518px window | under 1,040px (2 screens) |
| Words per 100px of a 280px column, worst case (DataPanelLoaded panel) | 27 | under 14 |
| Total visible words, 39 artboards | 14,368 | about 10,700 |

The word count is third on purpose. A drafter who hits the word target without
hitting the pixel targets has not done the job.

---

## 1. The grid every row sits on

One arithmetic identity, derived from Figma's own (16 + 88 + 8 + 88 + 8 + 24 +
8 = 240 at 240px) and re-solved for our 280px column:

```
16  +  108  +  8  +  108  +  8  +  24  +  8  =  280
pad    field  gut  field   gap  trail  pad
```

Constants. These are frozen for 1.6 and every row type below is built from them.

| Name | Value | Note |
|---|---|---|
| column width | 280px | activity panel and inspector alike (spec 5.1) |
| left padding | 16px | |
| right padding | 8px | asymmetric on purpose: the trailing slot is an icon button whose glyph is optically inset |
| content band | x = 16 to x = 272, **256px** | every row spans exactly this |
| body span | 224px | a control that fills the row and still leaves a trailing slot |
| pair | 108 + 8 + 108 | two fields |
| triple | 72 + 4 + 72 + 4 + 72 | three segmented buttons, 224 total |
| trailing slot | 24px at x = 248..272 | always the same x; a row with nothing to put there leaves it empty |
| control height | 24px | already VOCAB 3; only the label placement was wrong |
| **row pitch** | **32px** | 24px control centred, giving 8px between consecutive controls |
| section header | 32px | we keep our 32, we do **not** adopt Figma's 40 -- ours is already tighter |
| section bottom padding | 8px | then a 1px `#495057` divider |
| section rhythm | **1 / 32 / 32n / 8** | divider, header, n content rows, pad |

A fully collapsed inspector of eight sections is therefore 8 x 33 = 264px and
never scrolls. That skyline is the point: closed sections are a legible
inventory of what you have not done yet.

### The field atom

Every changeable value lives in a field. The field is the one place a label is
allowed to be, and it is a glyph there, not a word.

```
| 8px pad | 16px glyph slot | value ... | unit | 8px pad |
                            ^ value ink begins at exactly 24px from the field's left edge
```

- Box: height 24, radius 4, background `#2a3035`, no border (VOCAB 1).
- Glyph slot: 16px wide, holding a **14px** stroke SVG at `#7a828e`, or a
  single capital letter at 11px `#7a828e`. Letters are a closed set -- `N`
  (node count), `E` (edge count), `W` (weight), `D` (depth), `K` (k, as in
  k-core) -- and nothing may be added to it without adding it here.
- Value: 11px, `#d5d7da`, left aligned, ellipsised.
- Unit: 11px, `#7a828e`, right aligned inside the same box. `px` is never
  written. Graph units (`links`, `steps`, `hops`, `nodes`, `s`, `ms`, `%`) are.
- Remaining value width: 76px in a 108px field, 192px in a 224px field.
- The glyph slot is the scrub handle. `cursor: ew-resize`; pointerdown-and-drag
  changes the value, left down, right up. **This is what earns the right to
  drop the word.** Without it an in-field glyph is a riddle. On a touch pointer
  the glyph opens a 3-row stepper popover instead.
- Every field carries a `title` equal to the word the glyph replaced.

### Two ink colours carry the whole hierarchy

Copied from Figma's split, mapped onto our dark palette. Both at 11px --
hierarchy is colour, not size.

| Ink | Value | Exactly these three roles, and nothing else |
|---|---|---|
| value | `#d5d7da` | a value; a live section name; the word `Mixed` |
| chrome | `#7a828e` | a glyph label; a unit suffix; the name of a section that holds nothing |

Reserve `#7a828e` for those three so that *dim* unambiguously means *not the
answer*. VOCAB 1.5 already gives these tokens; 1.6 changes nothing but their
discipline.

---

## 2. The ten row types

Closed set. Every row in every panel is one of these ten. A drafter who cannot
place something in one of them has found either a floor item (section 3) or a
design error -- there is no eleventh shape.

### RT-1 Field row

**The workhorse.** One or two glyph fields on one pitch.

| | |
|---|---|
| Height | 24px control on a **32px** pitch |
| Columns | pair: `16 \| 108 \| 8 \| 108 \| 8 \| 24 \| 8`; single: `16 \| 224 \| 8 \| 24 \| 8` |
| Glyph | 14px SVG (or one capital letter) in a 16px slot, `#7a828e` |
| Type | value 11px `#d5d7da`; unit suffix 11px `#7a828e` |
| Trailing slot | the row's rare control (a door, per RT-1's popover rule), a reset `x`, or empty |
| Replaces | every label-above-field stack in the set: StylePanel's `Which nodes`, `Attribute`+`Scale`, `Smallest`+`Largest`, `Color`+`Width`; AnalyzePanel's `Method`+`Damping`, `Tolerance`+`Max iterations`; all 16 stacked rows in SettingsPerformance; the ImportOptions header row |
| Saves | 14.2px of height per row and one word per field |

A select is a field row whose 14px chevron sits at the field's right edge,
inside the box, after the value -- not in the trailing slot.

**The door rule.** A control used by a minority of selections never gets a
resident row; it gets a 24px trailing glyph that opens a popover. Figma fits
the entire constraints diagram into 24 x 24px this way. Our doors: the filter
builder's Builder/Expression switch, the `Smallest`/`Largest` domain pair (a
door on the Scale field), edge-property overrides, tooltip configuration, and
the Advanced parameter block.

### RT-2 Compound row

Two or three values that belong to **one thing**, inside one box, separated by
a 1px hairline of panel background (`#1f2428`) rather than a gutter -- so they
read as one control, not two.

| | |
|---|---|
| Height | 24px on a 32px pitch |
| Columns | one 224px (or 108px) box; sub-fields divided by 1px `#1f2428`; 8px inner padding either side of each hairline |
| Glyph | the leading sub-field's 16px slot holds a 14px swatch, ramp chip, or glyph |
| Type | values 11px `#d5d7da`; suffixes 11px `#7a828e` |
| Replaces | the four-part colour row (`Color` label + swatch + `#FFFFFF` + `Opacity` label + `100` + `%`); the `Smallest`/`Largest` domain pair; any value that always travels with its own modifier |
| Saves | 2-4 words per row and one whole row where two were used |

Never put two unrelated values in one compound box. If the hairline would be
lying about the relationship, use RT-1's pair instead.

### RT-3 Icon group row

A closed set of 2 to 6 mutually exclusive options, all of which can be drawn.

| | |
|---|---|
| Height | 24px track on a 32px pitch |
| Columns | track 108px (max 3 buttons) or 224px (max 6); 1px inner padding; buttons `flex: 1`, height 22, radius 3 |
| Glyph | 14px, `#7a828e` inactive, `#d5d7da` active on a `#374047` button |
| Type | none, except the hybrid below |
| Replaces | the `Glow / Outline / Wireframe / Flat shaded` checkbox stack (4 rows, 5 words -> 1 row, 0 words); `Show on: All matched`; the In/Out/All neighbour filter; `Scale: Square root / Linear / Log`; `Shape: Box / Sphere / ...` |
| Saves | 3-5 words and 1-3 rows per instance |

**The threshold.** 2 to 6 options whose difference can be drawn -> icon group.
More than 6, or a difference that is conceptual rather than visual -> a select
in RT-1. **The hybrid**, for options whose names we cannot afford to hide
(layout names, scale names): draw the glyph on every button and the word on the
active button only. The panel stays one row, the current choice keeps its name,
the alternatives are learnable by clicking.

Do not convert a legible checkbox into an icon group in pursuit of density.
Figma tried exactly that on `Clip content` and reverted, because an icon that
needs a tooltip to read is slower than the label it replaced. The test is
section 4's Rule 4.

### RT-4 Ramp row

The value is drawn at row size, so the sentence describing it is deleted.

| | |
|---|---|
| Height | 14px ramp vertically centred in a 24px box, on a 32px pitch |
| Columns | `16 \| min 11px \| 4 \| ramp flex, min 120px \| 4 \| max 11px \| 8 \| 24 \| 8` |
| Glyph | the trailing slot holds the 14px **scale-curve** glyph (a drawn sqrt / linear / log curve); clicking it opens the RT-3 group of three |
| Type | endpoints 11px `#7a828e`; no other text |
| Replaces | `Age 45 to 68 maps to sizes 1.0 to 2.0, square root scale.` (12 words); the legend string `1 to 4, sqrt scale`; a colour-domain description; a size-encoding description |
| Saves | about 11 words per encoding row, roughly 8 encoding rows across the set |

Two forms: a colour ramp (sequential or diverging, 14px tall, radius 2, 1px
`#48525c`) and a size wedge (a triangle from 4px to 14px). The curve of the
transform is visible in the wedge, which a sentence can only name.

**One exception, and it is load-bearing.** The scale may become a trailing
glyph *in the panel*. In the **canvas legend** it stays a word, because the
legend travels inside an exported figure where no one can hover it. Floor
item 5.

### RT-5 Toggle row

A boolean whose concept has no glyph in `REGISTER-1.5.md`. The label is the
only word on the row.

| | |
|---|---|
| Height | 24px on a **24px** pitch -- toggles are the one type that packs tighter |
| Columns | `16 \| 16px box \| 4 \| label \| ... \| 24 \| 8` |
| Glyph | none; a 16px checkbox or a 28x16 switch (VOCAB 4) |
| Type | label 11px `#d5d7da`, one to three words, sentence case |
| Replaces | nothing structural -- this is the type that **survives** compaction |
| Saves | the verb only: `Show`, `Enable`, `Activate`, `Use` and `Is` are deleted from every boolean label |

Two hard sub-rules. **(a) Never alone.** A lone boolean between field rows is
not a toggle row -- it becomes the trailing 24px slot of the row it modifies,
or a member of an RT-3 group. Toggle rows come in twos or more, packed. **(b)
Verbs out.** `Show labels` -> `Labels`. `Animate transitions` -> `Transitions`.
`Show minimap` -> `Minimap`. Blender's rule, and it costs nothing.

### RT-6 Data row

The user's own strings. **This is the one place a left-hand text label column
is correct**, because an id, a node label, an attribute name or a filename is
data, and data cannot be given a glyph.

| | |
|---|---|
| Height | 28px, on a 28px pitch (VOCAB 4 list row, unchanged) |
| Columns | `8 \| 16px optional icon \| 4 \| name flex \| 8 \| trailing value \| 8`, inside a 4px-radius row |
| Glyph | 16px leading icon only when the row has a type; otherwise none |
| Type | name 12px `#d5d7da`; trailing value 11px `#7a828e` |
| Replaces | nothing -- it is already right |
| Saves | the repeated unit word: `4 links / 3 links / 3 links` -> a `links` caption on the column header and bare numbers on the rows |

**The repetition rule.** A word appearing on three or more rows of one list
moves to the column header or the section header and is deleted from every row.
Applies to `links`, `members`, `Text`, `Edge attribute`, `Not set`, `transfer`,
`Coming`.

### RT-7 Action row

| | |
|---|---|
| Height | 24px on a 32px pitch |
| Columns | `16 \| state, resident, left \| flex \| actions, right-aligned, 24px each, 4px gap \| 8` |
| Glyph | 14px in a 24px hit area, every one carrying its `REGISTER-1.5.md` title |
| Type | text buttons 11px/500 (VOCAB 4) for the verbs that keep words |
| Replaces | ExplorePanel's 21-row stack of full-width text buttons (330px) with two 24px rows plus a `More`; the per-card `Parameters` word with a 12px chevron |
| Saves | about 50 words across the set, 250px of inspector height |

**The hover split, exactly.** An affordance that *acts* is hidden until row
hover. Anything that *reports state* is resident -- always. Figma's layers
panel: the eye appears on hover, but a layer that is actually hidden shows its
closed eye without hover, because state must be readable and only the action
may hide.

**Verbs that keep their words**, from `REGISTER-1.5.md` 1.6 and spec 6.8's
never list: `Run` in every form, `Cancel`, `import`, `open`, `paste`, `save`,
`remove`, `sort`, `tag`, `unlock`, `duplicate`, `expand neighbors`,
`column type`, every label ending in `anyway`, and every destructive verb. A
play triangle on a card holding Method, Scope and Advanced reads as *preview*,
not as *spend 40 seconds*.

**Touch.** On a touch pointer every hover-revealed glyph is resident, and its
title is reachable by long press. Two of our 39 boards are iPad boards; the
rule is not optional there.

### RT-8 Section header

| | |
|---|---|
| Height | 32px, preceded by a 1px `#495057` divider |
| Columns | `16 \| 16px chevron \| 4 \| name \| 4 \| info circle \| flex \| actions on a 28px pitch ending at x=272` |
| Glyph | 12px chevron; 14px action glyphs |
| Type | name 12px/500. **`#d5d7da` when the section holds a value; `#7a828e` when it holds none** |
| Replaces | the 3-word mode toggle currently sitting in the header's right slot; the strings `Not set`, `Default`, `None`, `No results yet`, `engine default` |
| Saves | 4-6 words per panel, plus 2 words per collapsed section |

**The empty-section rule.** A section that holds nothing is exactly one 32px
row: dimmed name, one 24px `+` in the trailing slot, no content rows, no
empty-state sentence, no placeholder, no `Not set`. Dimming the name says it.
The `+` commits to a sensible default rather than opening a chooser wherever
one exists (Figma's Effects `+` adds a drop shadow immediately).

**The conditional rule.** A section the *data* cannot support does not render
**at all** -- not collapsed, not dimmed, not with a `+`. Temporal sections on an
untimed graph, bipartite cards on a non-bipartite graph, directed methods on an
undirected graph, `Weight` and `Treat as` on an unweighted graph. Collapse is a
memory tax and leaves dead header rows; conditional rendering costs nothing.
Sections keep a fixed **order** even when members are absent.

The header carries the section's verbs, so no row inside it spends width on an
action button.

### RT-9 Chart row

A distribution drawn instead of the four numbers that summarise it. It also
answers what the numbers cannot -- bimodal, long tail.

| | |
|---|---|
| Height | one pitch (**32px**: a 24px sparkline or micro-bar) or two pitches (**64px**: a 56px histogram). Never any other height |
| Columns | `16 \| 224 chart \| 8 \| 24 \| 8`, endpoint labels inset at the chart's two ends |
| Glyph | bars `#48525c`; the selected or highlighted bin `#4a7ee8`; a 1px `#48525c` baseline |
| Type | the two axis-end values only, 11px `#7a828e`. No legend, no title, no summary line |
| Replaces | `Links per node (degree distribution): min 2, median 3, max 4, std dev 0.62` (9 words); `2 links: 5 / 3 links: 12 / 4 links: 3` (3 rows); `Linear scale. min 0, median 0.04, mean 0.07, max 0.41, p99 0.36`; the percentile-plus-rank pair on a metric row (a micro-bar carries the percentile, a `#6` chip carries the rank) |
| Saves | about 30 words across the statistics blocks, more once every result carries a distribution |

Always label the two axis ends with numbers. That is what lets a histogram
degrade gracefully into a picture of the table it replaced, for a user who has
not been taught to read one. The exact statistics stay reachable in
`Copy methods text` and the export -- see the risk in section 6.

### RT-10 Prose block

The only place multi-sentence text is allowed, and it exists solely to hold the
floor. **Three sanctioned instances and no fourth.**

| | |
|---|---|
| Height | auto, full 256px band, 8px below the block |
| Columns | reading: `16 \| 256`; departure and run record: `16 \| 16px mark \| 4 \| text \| 8` |
| Glyph | departure line only: a 14px warning glyph at `#f7b731` |
| Type | **reading** 12px/1.5 `#a3a8b1`, max 2 sentences and 220 characters; **departure line** 11px/1.4 `#d5d7da`; **run record** 11px/1.4 `#7a828e`, one line, with a 12px chevron to Details |
| Replaces | nothing. It is what everything else was pretending to be |

An explanation is not a prose block. It is deleted (if it restates something on
the same screen) or it goes in the info circle (6.7). There is no third option
and no resident helper line anywhere in a panel.

---

## 3. The rules

Ordered. Apply in order; the first that matches decides. Two designers running
this list on the same content land on the same row type.

**Rule 0 -- the floor vetoes.** If the content is on the section 4 floor list,
render it as specified there. No rule below may shorten, hide, iconify or
circle it. Stop.

**Rule 1 -- the word gate.** A word may be printed only if it passes one of
four gates:
  (a) it **names a place you navigate to** -- a section header (RT-8);
  (b) it is a **value, or the user's own data** (RT-1, RT-6);
  (c) it is a **concept or boolean with no glyph in `REGISTER-1.5.md`**, and
      `REGISTER-1.5.md` is closed -- you may not invent one to pass this gate;
  (d) it is on the **floor**.
Every other word is a glyph, a suffix, or deleted. Figma's ratio, for
calibration: 12 words against 35 controls, 0.34 words per control, and nine of
the twelve are section names. We are at roughly 10x that in a panel 40px wider.

**Rule 2 -- routing.** Ask these in order:

| # | Question | Row type |
|---|---|---|
| 1 | Is it the reading, a departure from exact-and-complete, or the run record? | RT-10 |
| 2 | Is it a section name? | RT-8 |
| 3 | Is it the user's own string -- an id, label, attribute name, value, filename? | RT-6 |
| 4 | Is it a distribution, or a set of summary statistics over one? | RT-9 |
| 5 | Is it a colour, gradient, or a numeric range with a transform? | RT-4 (or RT-2 when it travels with an opacity) |
| 6 | Is it a closed set of 2-6 options whose difference can be drawn? | RT-3 |
| 7 | Is it a boolean? glyph in the register -> RT-3 member or the trailing slot; no glyph -> RT-5 (never alone) | RT-3 / RT-5 |
| 8 | Is it a verb? in the register -> icon in RT-7, hover-revealed if it acts, resident if it reports; not in the register or on the never list -> text button | RT-7 |
| 9 | Is it two or three values belonging to one thing? | RT-2 |
| 10 | Is it any other changeable value? pair it with its natural partner | RT-1 |
| 11 | Is it an explanation? | not a row: delete or circle (Rule 8) |

**Rule 3 -- the label is inside the field.** Zero horizontal pixels are spent
on a label column. Every label of a changeable value becomes a 14px glyph in
the field's 16px slot, and the value begins at 24px from the field's left edge.
The one exception is RT-6, where the user's string is the label. A drafter who
writes an 11px label on its own line above a 24px input has broken this rule
and the row is wrong.

**Rule 4 -- glyph or word, decided by two tests.** An in-field glyph or an icon
button is allowed only if **both** hold:
  (i) the glyph is in `REGISTER-1.5.md`; and
  (ii) the control is either draggable (a field, whose glyph scrubs) or a verb
       (a button, whose title names it).
Fail either test and the word stays. A concept -- betweenness, PageRank,
k-core, modularity, weight-as-strength-versus-cost, the six caveat classes --
never becomes a glyph, because an arbitrary symbol is learnable only by someone
who already knows the concept.

**Rule 5 -- the unit is a suffix, never a label.** Right-aligned, 11px
`#7a828e`, inside the field. `px` is implied and never written (`2`, not
`2 px`). Spell only the units the graph data has: `links`, `steps`, `hops`,
`nodes`, `%`, `s`, `ms`, `MB`. Never a parenthetical `(degrees)`. Never `deg`
as an abbreviation -- it collides with degree centrality.

**Rule 6 -- the mode is what the field contains.** Not a control above it.
Fixed = a literal in the field. Data-driven = an attribute chip in the field
and a **filled** glyph in the slot (hollow = fixed). Disagreement across a
multi-selection = the literal word `Mixed` in the value position, at value
colour, no badge and no asterisk, still editable. A mode word that must be
visible (`Hug`, `Fill`, `Auto`) is a right-aligned dimmed word inside the same
field, beside the number. This deletes the `Fixed | By attribute` segmented
pair, which appears 5 times on StylePanel and 13 times across the Style boards.

**Rule 7 -- the default does not render.** Three clauses:
  (a) a control sitting at its default is not drawn; only the **deviation** is
      drawn, inline, with a 12px reset `x` in the trailing slot;
  (b) an affordance that **acts** hides until row hover; anything that
      **reports state** is resident;
  (c) a section the data cannot support does not render at all -- not
      collapsed.
Corollary: an exact, complete, unfiltered run draws **no** departure line at
all. That is what makes `Approximate (sample of 200)` loud again.

**Rule 8 -- explanation is deleted or circled, never both and never resident.**
Delete it when it restates a control, a value or a list visible on the same
screen (spec 6.7 already licenses this). Otherwise it goes in the info circle,
which keeps it as the control's accessible description, in the palette index,
and one hover or tap away. Where a list of unfamiliar things must be browsed,
the sentence lives on the **picker row at the moment of choosing** -- not on the
resting card. Do not simply move 18 descriptions into 18 tooltips; see the risk
in section 6.

**Rule 9 -- repetition rises.** A word on three or more rows of one list moves
to the column header or the section header and is deleted from the rows. A
question asked once per property (`Fixed | By attribute`) rises to the section,
or becomes a per-row glyph under Rule 6.

**Rule 10 -- the pair rule.** See section 5, decision B. It is a rule, but it
is contentious enough to be decided explicitly.

**Rule 11 -- the escape hatch is mandatory.** `Settings > Appearance > Show
labels on controls`, defaulting **off**, turns every in-field glyph into a
glyph plus its word. In that mode RT-1 pair rows become single 224px rows and
the panel roughly doubles in height; every layout must survive that. This is
exactly how Figma defends its own icon-first panel ("Turn on labels to quickly
understand what each control does, or turn them off to focus on your work"),
and it is the thing that makes Rules 1 through 6 defensible to a first-time
user rather than merely terse. Ship it in the same revision as the glyphs, not
after.

---

## 4. The floor

Six items. This is the veto on every rule above. Each traces to a persona
failing a workflow step, not to taste.

1. **The reading.** Every graph summary and every result opens with the
   plain-language sentence, on screen, in full, never behind an info circle, at
   any density, width or Settings value. It is the only mechanism assigned to
   W14's Comprehension criterion.
2. **Every departure from exact and complete, named.** Approximate with its
   sample size; partial or timed out; subset drawn; largest component only;
   filter or time window active. Prune the duplicates (Rule 7c makes the line
   rare); never prune the departure itself.
3. **The one-line run record.** Method, non-default parameters, scope. Details
   behind the chevron.
4. **What a control will do, before it does it.** The scope or match count it
   acts on; the cost estimate above the ask limit; the reason a disabled
   control is disabled; and the full text of `Run` in every form, `Cancel`,
   every label ending in `anyway`, and every destructive verb.
5. **The legend line for every encoded channel.** Channel, attribute, domain
   endpoints, and the scale when it is not the default -- in words, because the
   legend travels inside an exported image where no one can hover it.
6. **Names and data.** The eight rail labels (dropping them frees zero
   horizontal pixels -- the rail is frozen at 48px -- and deletes the map that
   spec 7.1 uses instead of a tour); every capability's plain name; and the
   user's ids, labels, attribute names, values and filename.

The floor on the first-load screen is about **49 words**. Main.dc.html carries
220. The 171-word band between them is where a compaction pass may work; below
49 it is removing the product.

---

## 5. The two explicit decisions

### Decision A -- the Analyze panel

**It becomes contextual, with the catalogue relocated one click behind a
question-first picker. It does not become search-first, and it does not stay a
catalogue.**

This is the structural difference from Figma. Figma's Design tab is an index of
the *selection*; ours is an index of the *product*. Measured: AnalyzePanel's
card list is a 279 x 518px viewport holding **3,060px** of content -- 5.9
screens -- with only 16 of 26 cards drawn and 43 words clipped out of sight.

**The resting panel becomes four things, in this order:**

1. the scope line, drawn **only** when scope is not the whole visible graph
   (Rule 7a);
2. the result cards already run;
3. a **Suggested** group of 3-5 cards, chosen by graph shape (directed,
   weighted, timed, bipartite), current selection, and what has already been
   run -- our equivalent of VS Code's `Commonly Used`;
4. one `+ Analysis` action row.

On a fresh graph that is one row. The 26-card catalogue lives in the popover
that `+` opens: a search field at the top, then the **7 question rows** (`Find
groups`, `Find important nodes`, `Find weak points`, `Find paths`, `Find
unusual things`, `Predict`, `Advanced`) -- 16 words and about 196px against the
current 3,060 -- each expanding to its methods. **The one-line description
stays a full sentence, on the picker row**, which is the only moment it answers
a question. That reverses the spec's rule at line 1007, deliberately.

**Why not search-first.** A graph analyst usually cannot name what they want:
"which nodes matter" does not retrieve "betweenness". Search is a retrieval
device, not a discovery device -- you must be able to produce a word. VS Code's
Settings editor is the peer most like us (a catalogue of unfamiliar named
things) and its answer is search **plus** a browsable tree **plus** a
`Commonly Used` group, not search alone.

**Why not a resident catalogue.** 5.9 screens of scroll is the volume symptom
stated in pixels, and the peer evidence is unanimous: Houdini's Tab menu,
Blender's F3, TouchDesigner's OP Create and the VS Code palette all present
very large operation catalogues, all of them typed into rather than drawn, and
**none of them prints a description under an item**.

**What happens to discovery if you shrink it -- honestly.** A user who does not
know betweenness exists will no longer see the words `Bridges` or `Betweenness`
anywhere in the resting panel. Four mitigations, all already in the spec:

- the Insights strip surfaces 3-5 runnable cards on load, and it is exempt from
  the icon rule and keeps its sentences (spec 7.3, 6.8);
- `+ Analysis` is a visible affordance, which is what spec 6.4's reachability
  rule asks for -- Figma's `+` on an empty Fill section is the same signal;
- the picker opens on 7 questions, not 26 names, so browsing costs 7 reads;
- the command palette (5.5) indexes every card and method, plus **question
  phrasings and outcome words** -- "which nodes matter", "what holds this
  together", "weak points", "modules", "clusters" -- and gains filter tokens
  `@run`, `@selection`, `@weighted`, `@directed`, `@fast`.

**What we do not fully mitigate:** incidental discovery. The user who scrolls
past `Core layers` and gets curious loses that. Accept it, and measure it: a
first-session user should reach at least one algorithm they could not have
named within three clicks. If they cannot, the Suggested group is wrong, not
the decision.

### Decision B -- the plain-and-technical name pair

**Both names on first mention per surface, and on every string that leaves the
app. The primary name alone on repeats.**

A **surface** is one scroll container with one header: the activity panel, the
inspector, one dialog, one drawer, one menu, the canvas legend, the status bar.

**Render both names:**
- on the **first occurrence** of a concept within a surface;
- on anything **typed into or searched** -- the filter builder, the Style
  attribute select, the command palette index (spec 6.3 already requires this);
- on any string that **leaves the app** -- the run record, `Copy reading`,
  `Copy methods text`, exported CSV and JSON headers, Present captions, and the
  canvas legend (it travels inside an exported image);
- on the **Insights strip and the Welcome screen**, always, because a
  first-time user has bound nothing yet -- mirroring 6.8's existing exemption
  of those two surfaces.

**Render the primary name alone** on every repeat occurrence inside the same
surface, and on any row whose section header already carries the pair. The
secondary name stays on that row's info circle, in the control's title, and in
the palette index, so 6.4 holds.

**Two hard sub-rules.**
- *The technical name never occupies a line of its own* (spec 6.3). If the pair
  will not fit on one line at 280px, the technical name goes to the info circle
  **for that occurrence, even a first mention**. Three of AnalyzePanel's 15
  pairs currently wrap onto a 20px line and are in breach today.
- *The pair never renders inside a 24px field.* A field holds the value, not
  the concept's second name.

**Why this is not a novice-versus-expert trade.** `Settings > Appearance`
already lets a user choose which name is primary. A repeat occurrence showing
one name therefore shows Elena `Bridges` and Emma `Betweenness` from the same
rule, resolved per user by a control that exists. Principle 4's "both names are
always rendered" holds at **surface** granularity instead of **occurrence**
granularity; the pair still binds once wherever a reader arrives.

**Honest limit:** in a catalogue of 26 different concepts, 26 first mentions
means the pair rule saves almost nothing there. It pays off on result screens
(where one concept renders four times within 900px of travel) and it removes
the 237 parentheticals across the set. The catalogue saving is Decision A, not
this rule.

---

## 6. Open risks

**R1 -- Glyph literacy. A graph app has more arbitrary glyphs than a drawing
app.** By NN/g's classification six of our eight rail glyphs are arbitrary
rather than resemblance icons. *Mitigation:* Rule 11's labels preference,
shipped in the same revision; every icon-only control carries its register
title; `REGISTER-1.5.md` stays closed, so no glyph exists that has not been
argued for. *Check:* any glyph a first-time user must decode to complete W14
has a resident text twin.

**R2 -- The scrub is invisible in a static mockup and awkward on touch.** The
in-field glyph earns the right to drop the word *because it scrubs*. Ship the
glyph without the scrub and it is a riddle. On iPad there is no hover and drag
competes with canvas pan. *Mitigation:* the artboards draw the glyph with
`cursor: ew-resize` and a `title`; the spec states that pointerdown on the
glyph scrubs; on a touch pointer the glyph opens a stepper popover instead. Do
not merge the glyph change ahead of the interaction.

**R3 -- Discovery loss in Analyze.** Stated in full in Decision A. *Check:* a
first-session user reaches an algorithm they could not have named within three
clicks.

**R4 -- Hover-only actions strand keyboard and touch users.** *Mitigation:*
spec 6.8's full-text twin in the overflow menu is mandatory, not optional; on a
touch pointer every hover-revealed glyph is resident.

**R5 -- Tooltip dumping.** Deleting 18 card descriptions into 18 tooltips moves
the wall of text behind a hover and makes it worse for touch and keyboard. The
dense-UI literature treats tooltip density as a smell, and essential content
must never be tooltip-only. *Mitigation:* descriptions live on the **picker
row**, at the moment of choosing, where they answer a question -- plus, as a
candidate, one description slot in the panel that follows focus or hover. **Flag
that slot as a synthesis: it was not observed in any of the ten peer tools.
Validate it before committing.**

**R6 -- A chart loses the exact number a methods section needs.** A histogram
does not give you the median to three places. *Mitigation:* RT-9 always labels
its two axis ends; the full statistics stay in `Copy methods text` and the
export; floor item 3 protects the run record. *Check:* every RT-9 that replaced
numbers has a path to those numbers within one click.

**R7 -- Default-hidden makes the panel unpredictable between sessions and
between users.** Two people on two graphs see different panels; a colleague's
screenshot does not match your screen. Figma accepts this cost; so should we,
but not silently. *Mitigation:* every section the data *could* support but that
is unset draws its dimmed name and `+` (RT-8), so the inventory of what you
have not done stays visible; only sections the data *cannot* support vanish
entirely; sections keep a fixed order regardless of which members render; and
the palette reaches every capability whatever the panel is showing.

**R8 -- Rule 6 can lie.** A field showing a literal when the property was bound
earlier and is currently overridden reads as "never configured". *Mitigation:*
borrow TouchDesigner's 4px corner square in the glyph slot, meaning "set
earlier, not in effect". Four pixels distinguish a state that otherwise costs a
sentence or is simply lost.

**R9 -- The escape hatch doubles panel height.** Labels-on mode turns pair rows
into single rows. *Mitigation:* every layout is drafted so that labels-on
scrolls gracefully rather than breaking; RT-1 pairs degrade to two RT-1
singles, never to a two-line stack.

**R10 -- A 25% word cut alone will not answer the complaint.** Every deletion
in section 7 is local; the density win is the row anatomy, not the copy. *Check
the pixel metrics at the top of this document first.* A drafter who hits 10,700
words with 38px control stacks still intact has not done the job.

---

## 7. Per-screen plan, all 39 artboards

`Before` is measured: every visible text node walked at 1440x900, whitespace
tokens containing an alphanumeric, `display:none` and `visibility:hidden`
excluded, scrolled-out content **included** (which is why AnalyzePanel reads
611 here and 227 in the panel-only audit -- the catalogue's words exist even
when you cannot see them). `After` is `before` minus a named list, not a
percentage guess.

Two accounting notes. **(a)** 181 `Coming` tags across the set are mockup
scaffolding, not product copy; their removal is bookkeeping. They are left in
both columns. **(b)** Decision A **moves** roughly 200 words out of
AnalyzePanel into a picker that is not yet an artboard. Those words are not
destroyed; a new `AnalyzePicker` board would inherit about 120 of them. The
totals below count the resting panel only, and say so.

### Group A -- catalogue panels (Decision A)

Moves, identical on all three: catalogue leaves the resting state for the
question-first picker; resting panel = scope line (conditional) + results +
Suggested 3-5 + `+ Analysis`; card descriptions to the picker row and the info
circle; `Parameters` word -> 12px chevron (RT-7); `Run` keeps its text (floor
4); contiguous `Coming` rows -> one group tag; label-above-field parameter
stacks -> RT-1 pairs; per-card provenance -> RT-10 run record, departures only.

| Artboard | Before | After |
|---|---|---|
| AnalyzePanel | 611 | 320 |
| ExplorePanel | 354 | 235 |
| IpadPanel | 460 | 300 |

IpadPanel takes the same moves with the touch exceptions in R2 and R4: action
glyphs stay resident, the picker is a sheet, in-field glyphs step rather than
scrub.

### Group B -- result screens

Moves: RT-10 pruned to the floor -- one reading, a departure line **only when
there is a departure**, one run record naming only what differs from the panel
header; the identical caveats string currently drawn verbatim on two cards of
one screen collapses to nothing on the exact runs; graph-level facts (scope,
weight, direction) live once in the panel header; the pair rule (Decision B)
takes the concept from four renderings to one per surface; summary statistics
-> RT-9; per-row unit words -> column header (RT-6); four `Coming` action rows
-> one trailing line.

| Artboard | Before | After |
|---|---|---|
| ExplorerExpert | 621 | 380 |
| ExplorerLargeGraph | 458 | 330 |
| ExplorerAfterCard | 392 | 270 |
| CompareSplit | 374 | 275 |
| AnalyzeSweep | 370 | 265 |
| CategoryTable | 349 | 265 |

ExplorerLargeGraph keeps every departure clause it has -- it is the board where
the floor bites hardest, and its cut is anatomy, not copy.

### Group C -- Style surfaces

Moves: all five `Fixed | By attribute` segmented rows deleted, mode shown by
what the field contains (Rule 6) -- 15 words and 100px each board; label lines
into fields (Rule 3) on `Which nodes`, `Attribute`+`Scale`, `Smallest`+
`Largest`, `Color`+`Width`; the colour row becomes one RT-2 compound; the
encoding sentence becomes an RT-4 ramp; `Skybox: None` becomes an empty swatch;
metric `not run` status becomes a mark, not a word.

| Artboard | Before | After |
|---|---|---|
| StylePanel | 276 | 175 |
| StyleDiverging | 259 | 175 |

### Group D -- inspector-led screens

Moves: two-line metric rows -> one 22px RT-6 row with a rank chip and a
micro-bar (percentile and rank are the same fact in two units); the reading
capped at two clauses, with the numbers left to the stat table that already
carries them; the affordance-explaining sentence (`Arrows show above or below
the graph average...`) deleted outright; attribute rows keep their left-hand
text labels, because they are the user's own strings (RT-6).

| Artboard | Before | After |
|---|---|---|
| MultiSelection | 307 | 215 |
| IpadInspector | 233 | 175 |
| Main | 220 | 185 |
| InspectorGenomics | 175 | 130 |

Main's floor is 49 words; the 36 cut are the first-load Explore panel's empty
section labels and two of three insight card descriptions. `Mixed` (Rule 6)
lands on MultiSelection as a single value token.

### Group E -- import and data

Moves: repeated role and type columns -> a glyph column with one header legend
(`Edge attribute` x7, `Text` x4, `Not set` x4); validation cards stop repeating
`Change / Show rows / Ignore` per card (RT-7 hover split); the summary lines
that restate the validation cards 280px below them are deleted; sentence-length
control labels become noun labels plus a unit suffix (`Repeated edges between
two nodes` / `Combine into one, count the repeats, sum the weight` ->
`Repeats [Combine + sum]`); `engine default` x3 -> empty placeholder.

| Artboard | Before | After |
|---|---|---|
| ImportLargeFile | 629 | 440 |
| ImportRecognised | 620 | 420 |
| ImportOptions | 544 | 380 |
| ImportAddToGraph | 507 | 360 |
| TableJoin | 492 | 355 |
| DataPanelLoaded | 409 | 300 |
| DataTableDrawer | 339 | 265 |

These are the largest boards in the set and the smallest proportional cuts,
because a column mapper is mostly the user's own column names -- floor item 6.

### Group F -- settings and reference

Moves: the 1118 x 73px prose band above the first control deleted (the seven
rules it lists are each visible as the disabled state of a control below it);
the two-threshold sentence deleted (the thresholds are the values in the fields
beneath it); 16 label-above-field stacks -> RT-1 pairs; four `XR ...` labels
lose the `XR` the section header already says.

| Artboard | Before | After |
|---|---|---|
| SettingsShortcuts | 593 | 540 |
| SettingsPerformance | 536 | 350 |
| ShortcutsDialog | 409 | 380 |
| Settings | 262 | 225 |

The two shortcuts boards barely move, correctly: a shortcuts table is a list of
capability names and their keys, and both are floor item 6. Do not compact
them; a small cut here is the sign the rules are working, not failing.

### Group G -- menus, popovers, palettes

Moves: history rows repeat the run record -- the repeated words rise to the
column header (Rule 9); menu rows already obey the rules; the palette **gains**
question phrasings and filter tokens under Decision A and may end up longer,
which is correct.

| Artboard | Before | After |
|---|---|---|
| HistoryPopover | 447 | 330 |
| CommandPalette | 280 | 265 |
| ContextMenu | 197 | 185 |
| InsightsWide | 189 | 185 |
| ViewsMenu | 182 | 170 |

InsightsWide is deliberately almost untouched: the strip is exempt from the
icon rule, its card bodies are reported text, and it is the mitigation that
makes Decision A survivable. Compacting it would remove the thing paying for
the rest.

### Group H -- everything else

Moves: filter rows -> RT-1 and RT-2 with in-field glyphs; the Builder /
Expression switch -> a trailing door; note rows -> RT-6; `Search` label ->
placeholder; the search-syntax popover -> the field's own placeholder; loading
and welcome copy trimmed to the floor plus one affordance.

| Artboard | Before | After |
|---|---|---|
| AiPanel | 338 | 285 |
| Welcome | 324 | 290 |
| PresentPanel | 311 | 245 |
| FilterBuilderExpert | 357 | 260 |
| TimeSlider | 259 | 210 |
| ExplorerLoading | 257 | 215 |
| ExploreNotesList | 251 | 215 |
| ExplorerNotes | 177 | 155 |

### Totals

| | Words | Screens |
|---|---|---|
| Before | 14,368 | 39 |
| After | 10,720 | 39 |
| Cut | 3,648 | **-25%** |

Of which about 200 words are *relocated* to an unbuilt picker board rather than
deleted, and 181 are `Coming` scaffolding. The honest design cut is closer to
3,270 words, **-23%**.

That is the second-most-important number in this document. The first is at the
top: AnalyzePanel's card list, 3,060px in a 518px window, and the 27
words-per-100px of DataPanelLoaded's panel. Fix the rows and the words follow;
fix the words alone and the app still reads text-heavy, which is exactly what
the last five revisions demonstrated.

---

## 8. What a drafter does, in order

1. Read the floor (section 4). Mark every floor item on the board first, before
   deleting anything.
2. Walk every row. Name its row type from Rule 2. A row that is not one of the
   ten is wrong; fix the row, do not add a type.
3. Apply Rule 3 to every label sitting on its own line. This is the change that
   buys the height.
4. Apply Rule 7 -- delete defaults, hide actions, drop unsupported sections.
5. Apply Rules 5, 6, 9 -- units into fields, modes into fields, repeats into
   headers.
6. Apply Rule 8 -- delete or circle every explanation. Nothing resident.
7. Apply Decision B to the pairs, surface by surface.
8. Re-measure: scroll height first, words per 100px second, total words third.

Snippets for all ten row types are in `VOCAB.md` section 11, "1.6 compaction".
