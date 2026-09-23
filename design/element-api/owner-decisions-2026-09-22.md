# Three decisions before graphty-element 2.0

Date: 2026-09-22. Subject: `@graphty/graphty-element`, published today as 1.10.4, on the
`feat/element-api-2` branch that becomes 2.0.

Each of the three publishes or withdraws part of the 2.0 public surface. A published channel
name and a published schema field are both promises: a channel can be ADDED later in a minor
release, but a schema field can only be REMOVED in a major one. So the withdrawals below have a
deadline and the publications do not, and that asymmetry is what makes these worth an hour now.

---

## Summary

Three things need an answer. First, an edge can carry a caption at each end of its arrow: about
a hundred lines in `src/Edge.ts` build one and keep it positioned, no style channel can ask for
one, and nothing anywhere tests that it draws. Second, 291 declared style fields cannot be
reached from any channel, and two blocks account for 252 of them -- the arrow captions (128) and
the tooltips (124). Third, two fields named `maxWidth` and `wrap` were taken off the label
vocabulary rather than implemented, and two sentences the element still publishes describe them
as though they were there.

The recommendation is one package: publish the arrow captions as two channels per end and
publish a channel for a node tooltip's appearance; withdraw the edge tooltip and the two dead
`enabled` flags; leave text wrapping unimplemented and delete the two sentences that describe
it. That is about one and a half days of work. It takes the count of declared-and-unreachable
style fields from 291 to 85, and the count of those recorded as a DEFECT rather than as a
deliberate decision from 258 to 4.

**How to read a leaf count.** A leaf is one settable field in a parsed node or edge style,
counted by walking the schema to the bottom. A rich-text block -- the thing behind a label, a
tooltip and an arrow caption -- declares 57 fields and counts as 64 leaves, because a colour
that may be written as a word or as an object contributes both spellings and a position
contributes three axes.

---

## 1. Captions at the ends of an arrow

### What it is

An edge in this element can be drawn with a cap at each end, and each cap can carry words of its
own: `A --start label--> --end label--> B`. Graphviz calls these `headlabel` and `taillabel`;
Cytoscape calls them `source-label` and `target-label`. They are separate from the edge's own
single label, which sits at the middle.

The capability is declared in the edge schema as `arrowHead.text` and `arrowTail.text`, each a
full rich-text block, and the renderer builds them. No style channel writes either one, so no
layer, no theme and no saved style document can ask for a caption. The story named for the
feature, `stories/ArrowText.stories.ts`, says so in its own doc comment and draws the edge's
middle label instead.

### What is actually there

- **About 100 lines, all in `src/Edge.ts`,** and no caption renderer of its own: it builds a
  `RichTextLabel`, the same class that draws every label and every tooltip. The pieces are two
  label fields with their two offsets, a builder (`createArrowText`, 49 lines), a rebuild pass
  inside `syncContent` (31 lines), nine lines of positioning inside `update`, and disposal.

- **The builder honours 7 of the block's 64 leaves.** It reads the words (as `text` or as a
  `textPath` into the row's data), `fontSize`, `textColor`, `backgroundColor`, `cornerRadius`
  and `attachOffset`. `attachPosition` is pinned to "top". Every other field of the block is
  dropped -- not only by a layer, but by a caller assembling the configuration by hand.

- **Nothing tests it.** `test/browser/Edge.arrowText.test.ts` is 307 lines and never constructs
  an Edge. Every test in it either asserts that an object literal holds the values just written
  into that literal, or constructs a bare `RichTextLabel` directly. What it proves is that the
  schema accepts the fields and that `RichTextLabel` works. The caption path in `Edge.ts` has no
  coverage of any kind, and the only evidence it ever drew is a visual-regression baseline from
  1.x.

- **The expensive half is already correct.** A caption is compared and rebuilt on EVERY paint,
  not only when the edge's source mesh changes. That is precisely the thing three other channels
  got wrong -- a layer added to a graph already on screen resolved a value, reported it, and
  drew nothing -- and it is the half of this work that is hard to get right.

- **In 1.x it is reachable.** A 1.x style template carried a raw edge style, so a consumer could
  write `arrowHead.text` directly, and the 1.x version of the arrow story does exactly that with
  the words "start label" and "end label". It was never written up in `docs/guide/styling.md`,
  whose arrow table lists type, size and colour and stops there.

### The options

**A. Publish the words only** -- two channels, `edge.arrowHeadText` and `edge.arrowTailText`.
Cheapest, and leaves 62 of the 64 leaves per end declared and dead, which is the defect this
round exists to end rather than a fix for it.

**B. Publish the words and the appearance** -- four channels, adding
`edge.arrowHeadTextStyle` and `edge.arrowTailTextStyle` whose value type is `LabelStyle`, the
type `node.labelStyle` already publishes. Captions route through the shared label-options
builder instead of the 7-field one, which leaves the same 16-leaf residue per block that a label
already has and nothing more.

**C. Delete** -- remove `text` from the arrow schema, remove the hundred lines, remove the test,
and record the removal in the migration register.

### What each costs

**B, in detail, because it is cheaper than it looks.** The style painter needs no change at all
for the appearance channels: its label-style branch writes field by field into whatever style
path the channel declares, so a channel declaring `arrowHead.text` lands in the right place with
no edit. Three small changes are needed beside the table entries:

- One line in `StylePainter.writeChannel`. The rule that says "a layer that wrote the words has
  switched the label on" derives the path of the `enabled` flag from the FIRST segment of the
  channel's style path. For `arrowHead.text.text` that writes `arrowHead.enabled`, which does
  not exist. It is inert today rather than an error, because the painted bag is merged into the
  defaults rather than re-parsed, but it should be the leaf's parent -- which is identical for
  every channel published today.
- `Edge.createLabelOptions` takes the whole edge style and reaches into `.label`. It needs to
  take the block instead, which is exactly what the node's equivalent already does and says so
  in its doc comment.
- `createArrowText`'s hand-rolled mapping is then deleted rather than extended.

Plus four channel-table entries, four entries in the table that says what a channel costs the
renderer (all four are "content", drawn beside the mesh), the caption subject restored to the
arrow story, and a test that adds a caption to a graph already on screen and requires the
picture to change. Estimate: half a day to a day, and the first hour of it should go on a test
that proves a caption draws at all, because nothing establishes that today.

**C costs** a 1.x capability removed in the major with no replacement except the edge's single
middle label; about a hundred lines and a 307-line test deleted; and the arrow story renamed or
retired through `stories/story-roster.json`, which is the record that a capability lost its only
demonstration. In exchange, 128 of the 291 unreachable leaves stop existing.

### What breaks

Publishing adds four permanent channel names and no new value type. Deleting takes a working
renderer path out of the product; a consumer on 1.x who found `arrowHead.text` in the type
definitions loses it, and nothing in the guide ever told them it was there, so there is no way
to know how many did.

### Recommendation

**Publish, option B.** Three reasons. The half of the work that is expensive and easy to get
wrong -- keeping a caption correct when a layer is added to a graph that is already drawn -- is
already built and already right. The API addition reuses a type that is already public, so the
permanent surface grows by four names and nothing else. And captions at the ends of an edge are
a standard graph-drawing feature that both of the tools this element's arrow vocabulary was
modelled on publish under names of their own.

Spend the first hour on the test. If it turns out a caption does not draw, the decision flips to
delete and there is evidence behind it rather than an assumption.

---

## 2. The 291 style fields a consumer cannot reach

### What it is

Walking the node and edge style schemas to their leaves gives 143 leaves on a node style and 272
on an edge style. Of those, 59 and 65 can be changed by writing a style channel. The other 291
are declared in a schema the element publishes, read by the renderer in most cases, and
reachable by nobody.

Every one of them is named with a reason in `src/catalog/unreachable.ts`, and a contract test
checks that list in both directions -- a field with no channel and no entry fails, and so does an
entry for a field that has since been given a channel. So the 291 is exact, not an estimate, and
it cannot drift without a red test.

Each entry declares whether it is a decision that stands or a defect that expires. Today 33 are
decisions and 258 are defects, and every one of those 258 carries a placeholder owner and a
placeholder expiry of 2026-12-21 -- nothing automated may assign the work to a person. Replacing
those placeholders is part of what this section is asking for.

### The six groups

| Block | Leaves | Share | What it is | Effort to close | Recommendation |
|---|---|---|---|---|---|
| Arrow captions | 128 | 44% | Item 1 above: 64 leaves at each end of an edge | half a day to a day | publish (item 1) |
| Node tooltip appearance | 62 | 21% | A node's tooltip is drawn on hover and only its WORDS have a channel. The typeface, the panel, the colours and the rest are the element's defaults and a consumer cannot say otherwise | one to two hours plus a story and a test | publish |
| Edge tooltip | 62 | 21% | No edge tooltip has ever been drawn, in any version. The whole block is declared and dead, the words included | days, and it is a different feature | withdraw |
| Label residue | 32 | 11% | 16 per target, already recorded as deliberate: the label's world position, the canvas resolution and auto-size, the Babylon billboard constant, a second spelling of the panel colour, and a few switches superseded by a field that says the same thing better | none | affirm as permanent |
| Gradient node fills | 4 | 1.4% | Linear and radial gradient fills. The renderer builds them, interns the ramps and has tests; the paint path overwrites the colour with a neutral solid so a per-node colour can show, so no gradient survives | one to two days | publish, least certain of the seven |
| `enabled` on a node and on an edge style | 2 | 0.7% | Two flags superseded by the session's visibility mask. Only the label's own `enabled` is ever read | minutes | delete the two fields |
| A node icon | 1 | 0.3% | Already handled honestly: the channel is published with a value type of `never`, so asking for it is a compile error rather than a silent no-op | none | affirm as permanent |

### The node tooltip is the cheapest win on the list

The renderer already reads the entire tooltip block -- `Node.showTooltip` builds the tooltip
through the same options builder a label goes through -- and it already rebuilds a tooltip that
is on screen when a layer changes what it should say. The only missing piece is a channel.

One entry, `node.tooltipStyle`, accepting the same `LabelStyle` value type as `node.labelStyle`
and declaring its style path as the tooltip block, is the whole change: the painter's label-style
branch is generic over that path, so no painter edit is needed. It turns 46 of those 62 leaves
reachable and leaves the same 16-leaf residue a label already has. Add a story and a browser
test and it is done in an afternoon.

### The edge tooltip is blocked on something else entirely

An edge cannot be hovered. `src/Edge.ts` sets `isPickable = false` in three places and the
patterned-line mesh declares it false as well -- which is the same fact that leaves the element
with no edge-click event, recorded in `src/events.ts` under the sentence "a declared event that
never fires is a documented lie". Building the tooltip means building edge picking first, over
instanced lines, patterned meshes and bezier curves.

The channel `edge.tooltip` is nonetheless published today as something the element draws. That
is the one state the package's own rule forbids. The honest 2.0 answer is to publish it as
something the element does NOT draw, with the reason attached, and to delete the tooltip block
from the edge schema so 62 dead fields stop being published alongside the ones that work. It
comes back with edge picking, on the same terms as the click event.

### Gradient node fills

This one is small in leaves and not small in substance. `NodeMesh` builds linear and radial
gradient fills, interns each distinct ramp as a texture, caps the scene at 32 of them and falls
back to the gradient's first colour past the cap. All of that is written and tested. It is
unreachable because the paint path pins a node's material to a neutral solid so that the node's
own per-instance colour can show, which is what keeps a continuous colour encoding from minting
one mesh per node.

Publishing it means a channel whose value is a colour object rather than a colour word, which
widens the published union of what a channel value may be, and it means answering a question
nobody has answered yet: what `node.color` means on a node that is filled with a gradient. The
32-ramp ceiling would become a published caveat.

Two defensible answers -- publish one narrow channel carrying the advanced colour, or delete the
schema arm and the renderer branch. The one answer that is not defensible is the current state,
where the most carefully built renderer path on this list is reachable by nobody.

The recommendation is to publish, and it is the least certain one in this memo. Deleting throws
away more built and tested work per leaf than anything else here, and the question about
`node.color` has a clean answer available: a gradient fill is part of a node's mesh identity, not
per-instance state, so a node drawn with a gradient is drawn from its own source mesh and its
per-instance colour is not drawn at all -- the same rule that already governs an outline colour
and a glow colour. Publishing it means saying that out loud in the channel's caveat, along with
the 32-ramp ceiling. If a gradient-filled node is not a thing the product wants, delete it
instead; what must not happen is a third release in which it is built, tested and unreachable.

### What the package looks like afterwards

Taking the recommendations above -- captions published, node tooltip appearance published, edge
tooltip withdrawn, the two `enabled` flags deleted, the label residue and the node icon affirmed
-- the arithmetic moves like this:

| | Today | After |
|---|---|---|
| Declared and unreachable | 291 | 85 |
| Recorded as a decision | 33 | 81 |
| Recorded as a defect | 258 | 4 |

The 4 that remain are the gradient fills, which stay recorded as a defect with a real owner and
a real date until that channel lands or the renderer branch goes.

---

## 3. Wrapping a label's text

### What it is

Two fields, `maxWidth` and `wrap`, were on the interface a layer writes to style a label. They
say: keep this label no wider than this, and break its words onto another line when it would be.
They were removed rather than implemented, because the renderer never read either one and
publishing a field the renderer ignores is the defect the rest of this memo is about.

### What is actually true about them

- **They were never in 1.x.** They are absent from the renderer's own schema, from the 1.x style
  template, and from the 1.x documentation. They existed only on the 2.0 label vocabulary, which
  has never shipped. Removing them costs no released consumer anything.

- **Two sentences the element still publishes describe them.** The channels `node.labelStyle`
  and `edge.labelStyle` each carry the caveat "The renderer sizes a label to its text, so
  maxWidth and wrap are not drawn." A channel's caveat is part of what the element publishes
  about itself: a settings panel, a plugin or a model reading the catalogue sees it. Both
  sentences now name two fields the type does not have, which is the same kind of documented lie
  as a field with no renderer, pointing the other way.

### What a consumer does today

Hard line breaks. The label parser splits text on a newline and measures, aligns and draws each
resulting line independently, so a consumer who wants two lines writes a newline into the label
text -- as a literal, or through a data column bound to the label channel. `textAlign`,
`lineHeight` and the four margins all already apply across those lines. The parser also reads
inline markup per line, so a run of words can be made bold, italic, coloured, resized or given a
different typeface inside one label.

What is missing is only the automatic case: a consumer who does not know how long the words will
be cannot ask for them to be broken for him.

### What implementing it would take

The drawing side needs nothing. Text is drawn by iterating the parsed lines, so a pass that
turns one line into several is invisible to it, and per-line alignment already works.

The work is one pass in the parser that re-breaks a line's segments at word boundaries against a
measured width. The fiddly part is that a word can straddle two segments carrying different
typefaces, so the pass has to measure and split at the segment level rather than the line level,
and it needs a canvas context to measure with -- which means it moves next to the code that
already creates one to size the label.

Around that: two fields on the label vocabulary, two on the renderer's schema, two entries in
the translation between them, two more in the leaf list the reachability gate reads, a browser
test that requires the label mesh to get taller and narrower, and a story. Three questions the
implementation has to answer: what unit `maxWidth` is in (the label's own canvas pixels, which
is what every other size in that block uses, or world units, which is what a reader thinks in),
what happens to a single word longer than the limit, and how it interacts with the 4096-pixel
ceiling on a label's texture.

Estimate: most of a day, confined to two files, with no API risk beyond the two field names.

### Recommendation

**Do not implement it for 2.0. Delete the two caveat sentences.** They are the only part of this
that is actually wrong today: they are published text describing fields that are not there.

Wrapping is a real gap but a narrow one, and adding two optional fields to the label vocabulary
later is a minor release, not a major -- so nothing about 2.0 forecloses it. Record hard
newlines as the supported answer in the styling guide, which is true today and is not written
down anywhere a consumer would find it.

---

## Checking these numbers

The unreachable count is produced by a test rather than by hand, and it fails if the waiver list
and the schemas disagree in either direction:

    cd graphty-element && npx vitest run test/contracts/config-reachability.test.ts

The per-field reasons, and whether each is recorded as a decision or as a defect, are in
`graphty-element/src/catalog/unreachable.ts`. The longer history of how these gaps were found is
in `design/element-api/capability-losses.md`.

One thing in this memo is not machine-checked and should not be treated as though it were:
nothing proves that an arrow caption draws. There is no test that builds one in a scene and no
story that shows one. The evidence is a 1.x visual-regression baseline and the code reading as
though it works.
