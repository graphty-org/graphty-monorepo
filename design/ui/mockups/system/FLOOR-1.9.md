# FLOOR-1.9 -- floor content is drawn, not hovered

Owner: the 6.10 floor as it appears on the artboards. One decision, applied
everywhere it reaches. Nothing else on the boards is this pass's to touch.

## 1. The decision, once

**A floor item is drawn in the words the reader needs, on the surface, at the
size the surface has. A title attribute, an HTML comment and the far side of a
door are all the same place: not on screen. When the room is short, what gives
is emphasis -- an adverb, a determiner, a longer spelling of the same fact, or
the line count -- never the fact itself, and never the item 6.10 ranks higher.**

The ranking inside one line, from 6.10 item 3 and the precedent HistoryPopover
set for the whole set: **scope above parameters, both above emphasis.** So a
record line that will not fit shortens its parameter to a synonym and drops the
determiner in front of its scope; if it still will not fit, it takes a second
line. It does not send either fact to the title.

Corollary, from 6.8's own sentence ("An icon-only control never carries a
Coming tag; a verb that has not shipped keeps its text and its tag"): an
unshipped control is never icon-only when it stands alone or when its siblings
in the same segmented control carry words.

## 2. What was fixed

### 2.1 AnalyzeSweep -- the pass cap comes back onto the run record (floor 3)

The 1.5 pass restored `max passes 20` to the record (REGISTER-1.5 section 10.5,
item 10). A later sweep spent the same pixels on the scope's determiner and
sent the parameter back to the title, which is where 1.5 had found it.

Measured widths at 11px, in the bands the Details chevron leaves:

| string | width |
|---|---|
| `Louvain, seed 42, max passes 20, all 200 nodes` | 264.3 |
| `Louvain, seed 42, 20 passes, all 200 nodes` | 236.8 |
| `Louvain, seed 42, max passes 20, 200 nodes` | 248.0 |
| **`Louvain, seed 42, 20 pass cap, 200 nodes`** | **231.3** |

Drawn, one string on both copies of the record: `Louvain, seed 42, 20 pass cap,
200 nodes`. The inspector's 235 px band holds it on one line. The panel card's
217 px band wraps it onto two, with `200 nodes` kept whole in a nowrap span so
the break falls between the parameters and the scope instead of orphaning the
noun. Rule 0 is why the line grows rather than the record shrinking: no rule
below 6.10 may shorten a floor item, and a fixed 20 px row height is a rule
below 6.10.

Two reasons for that wording rather than the runner-up `20 passes`: "pass cap"
says the number is a ceiling and not a count, and it is the phrase the board's
own comment was already using for the parameter. Dropping `all` is not an
invention either -- `200 nodes` is what HistoryPopover prints on both of its
surfaces for this scope, what ExplorerExpert prints for its Groups record, and
what HistoryPopover's own comment argues for at length ("the scope clause is
'200 nodes', not 'all 200 nodes', on every run record this board draws").

### 2.2 The four Style boards -- Selection only is drawn (floor 6)

`Apply to: Selection only` was a 51.8 px box holding a dashed-square glyph, with
the name only in `title="Apply to: Selection only. Coming"`. Its sibling segment
`All visible` carried its name in words. A segmented control in which the
shipped choice has a name and the unshipped one does not is the one shape 6.8
forbids twice: the label is two words, and the control carries a Coming tag.

Drawn: both segments at `flex: 1 1 0`, icon plus 11 px label, 109.5 px each in
the 223 px track. `All visible` needs 82.3, `Selection only` needs 107.5, so
neither ellipsizes. `Selection only` keeps the unshipped ink `#5f6873`, keeps
`. Coming` in its title, and stays covered by the one Coming tag on the
Arrangement section header -- the tag's owner set one string for the set and
this pass adds no instance of it.

The task named StylePanel and StyleDiverging. The sweep found the identical
block, character for character, on StyleFromAnalysis and StyleLibrary, so all
four got the same edit from the same script.

### 2.3 TimeSlider -- the isolated unshipped control is named (floor 6)

`Select all visible` was a lone 24 px glyph on its own row, dim, with its own
Coming tag beside it and its name only in the title. It is not a member of a
glyph cluster, so 6.8 applies in its plainest form: a verb that has not shipped
keeps its text AND its tag. Drawn as icon plus label at the unshipped ink, 119
px on a 255 px row whose left half already states the scope (`120 nodes`); the
key chip stays in the title, where REGISTER 1 puts it.

### 2.4 ExplorerExpert -- the path block joins the legend's vocabulary (floor 5)

Two things were wrong in one block.

**The channel word.** The block was headed with the run name and no channel, and
in the newer revision of this board with `Highlight:` -- a sixth channel word
that only this board used. LEGEND-1.8 fixed five: Color, Size, Outline, Edge
width, Arrow. The true one here is **Outline**: what the layer puts on a path
node is a 2 px `#eb4949` ring over the node-type fill the Color block above
already keys, which is exactly what CompareSplit's `Outline: matched to a
different group` names. The run name stays where the design doc's floor table
puts it ("the block title is the run name"), so the header reads
`Outline: Find a path (shortest path)`. At this legend's 172 px content band it
takes two lines, which is what LEGEND-1.8 already accepts for the two longest
headers in the set.

**The domain.** The row said `Path order  1 to 4`. That was the last surviving
two-endpoint domain string in the set, in the exact characters FIXTURES 1.3
retired from twelve boards as the cat graph's degree domain -- on a fraud board
where it was not a degree at all. LEGEND-1.8 section 3 retired the grammar as
well as those characters, and min / median / max is meaningless over four
ordinal positions.

So the row **draws its domain instead of stating it**: four stops, 1 2 3 4, the
complete set of values, which is section 4's grammar for a small categorical
domain and strictly more than the endpoints floor 5 asks for. The words beside
it say which way the numbers run: `Path order  source to target`, with the
direction phrase kept whole so it wraps as a unit. The four is FIXTURES 2.8 --
ph-1140 to merch-88 is 3 steps through acct-2093 and acct-4471, so the path is
four numbered nodes, which is what the canvas draws and what the chip above it
calls "3 steps". The endpoints are not restated in the legend because the chip
on the same canvas already names them (Rule 8).

## 3. The sweep, and how it was run

All 48 boards were rendered headless off `file://` and read out of the DOM, not
grepped: about 2,500 titled elements, 1,600 of them with no visible text of
their own, some 380 distinct title strings. Each was tested against the seven
floor items and, where a title carried floor-shaped content, the board's own
rendered text was searched for the same fact.

What the sweep cleared:

- **Run records.** Every title carrying a full record (`Weight:`, `Scope:`,
  `algorithms 1.4.0`) has its one-line record drawn beside it. AnalyzeSweep was
  the only line missing a fact, and 2.1 fixes it.
- **Departures.** ExplorerLargeGraph's `approximate: 100 samples, seed 4171`
  reads on screen as `Approximate (100 samples, seed 4171).`; ExplorerLoading's
  partial-data title sits beside a drawn `Partial data (40% loaded)`. No
  departure lives only on hover.
- **Legend lines.** The four titles shaped like legend lines
  (`Node size: Bridges, 0 to 0.41, square root scale` and three
  `Node color: ...` ones) are applied-style indicators on 24 px buttons, and
  every one of their boards draws the matching legend block on the canvas.
- **Control estimates and disabled reasons.** FilterBuilderExpert's two range
  handles carry 0.7 and 0.99 in titles and print both under the track. Every
  disabled control takes the register's form -- same title plus the one reason
  after a full stop -- which REGISTER-1.5 fixed for the set.
- **User data.** TableJoin's 6 unmatched proteins, InspectorGenomics's
  `top 0.3%`, DataPanelLoaded's `4 issue types, 27 issues`: each is drawn, and
  the title is the longer form, never the only form.
- **Info circles.** About 120 of the long titles are 6.7 explanations of a
  method, a setting or a statistic. An explanation is not a reading and is
  allowed to be a hover; floor 1's sentences are all on screen.
- **Unshipped controls.** Every control carrying a Coming tag or `Not built
  yet` draws its name in words except the boxes fixed in 2.2 and 2.3 and the
  cluster members recorded in 4.

## 4. Residuals, recorded rather than half-fixed

1. **The Arrangement quick-pick, four boards.** `Hierarchical (sugiyama)` and
   `Radial (radial)` are unshipped and drawn as glyph-only segments beside a
   named `Force directed`, so two capability names live only in titles -- the
   same breach as 2.2. It is not the same fix: measured, the three names need
   232.1 px inside a 217 px track with the active segment's icon kept, and
   214.1 px only if that icon is removed too, which redraws a shipped control
   and touches the icon set another pass normalized. Naming all three needs a
   row that is not this row (two lines, or two quick picks and More). That
   belongs to whoever owns the Style panel.
2. **`Use as filter`, three boards**, and **`Select neighbors`** on
   MultiSelection: unshipped or unbuilt verbs drawn as one dim glyph inside a
   cluster whose every other member is also an icon-only register verb. 6.8's
   collapse clause owns that cluster; un-collapsing one member is a change to
   the cluster, not the naming of a lone control, which is why 2.3 was fixed
   and these were not. Recorded for the icon register's owner.
3. **`Not on path (dimmed)` sits inside the path block** on ExplorerExpert,
   while LEGEND-1.8 section 5 lists it among the state rows of the final block.
   It is drawn either way, at the right swatch and the right opacity, so no
   floor item is at stake; moving it is the legend component owner's call.
4. **ExplorerExpert's Find a path record reads `all 200`** with the noun cut,
   because `200 nodes` is 227 px in the 219 px that card leaves. The board
   argues it in place. Fixing it needs a shorter parameter clause, not a
   shorter scope.

## 5. Verification

Every touched file was re-rendered and read back out of the DOM.

- `Louvain, seed 42, 20 pass cap, 200 nodes` on both record lines: one line in
  the 235 px band, two lines in the 217 px band, neither clipped.
- `Selection only` renders on all four Style boards, 109.5 px segment, no
  ellipsis; `Select all visible` renders on TimeSlider at 119 px.
- The path block reads `Outline: Find a path (shortest path)` over two lines,
  then the four numbered stops with `Path order source to target`, nothing
  past the legend's content edge.
- No live `Highlight:` and no live `1 to 4` remains on any board.
- Format: one `support.js` line per file, no other script tag, no
  `data-dc-script`, plain ASCII in all 48 files, root sizes 1440 x 900
  unchanged on every touched board, and no untitled icon-only control on them.
- No new overflow. The two pre-existing ones on StyleDiverging and
  StyleFromAnalysis (the 160 px minimap box, and a `Groups (granularity 2.5)`
  label) are untouched and unrelated.

## 6. One thing this pass did not cause and could not repair

At 17:19:55 local, while this pass was running, every file in this directory was
overwritten with an older snapshot of the canvas: 48 boards rolled back,
`LEGEND-1.8.md` deleted, the legends back at 160 / 190 / 192 / 240 px instead of
the single 256 that LEGEND-1.8 fixed. Whatever did it saved the state it
replaced into the nested directory `canvas/canvas/`.

That nested copy is the good state. It holds every owner's normalization AND
this pass's four fixes, which had been applied and verified against it at 17:17.
A second copy of it, made at 17:23 in case the nested one is cleaned up, is in
`tmp/floor19-good-state/` (61 files).

Because other agents were writing to the rolled-back files at the time, this
pass did not restore the directory -- a mass restore would have destroyed their
in-flight work, and picking the authoritative snapshot is not this owner's
call. Instead the four fixes were re-applied to the rolled-back boards, which
carry the same breaches, with two width-forced variants recorded above (the
wrapped record line in 2.1 and the wrapped legend header in 2.4) and one
additional board, TimeSlider (2.3), that only the older revision breaks.

Whoever reconciles this: `tmp/floor19-good-state/` is newer than what is in
this directory for every file except the seven this pass and the concurrent
passes have edited since.
