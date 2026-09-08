# Decisions for spec revision 1.7

The ratified outcome of five design tracks run against spec revision 1.6:
import flow, pop-outs, save and load, analysis as style, and the bottom-centre
toolbar. This document supersedes the proposals those tracks returned. Where a
track proposal and this document disagree, this document wins.

Revision 1.6 rebuilt every panel on the ten-row-type compaction system of 6.9
and cut panel words by 42 per cent. Three of the five tracks below add controls
back. That is the risk this revision is managed against, and every decision
carries a **Direction** line saying whether it adds or removes visible
information. The net is in section B, stated in pixels and in words, with the
words counted honestly rather than claimed.

## How to read this

Each decision carries an ID, the decision, why it was taken, the spec text where
there is one, the artboards affected, and its direction. A decision marked
**(rule)** applies to every artboard and is checked before any per-screen edit;
a decision marked **(screen)** names its files.

Section numbers this revision claims:

| Number | Owner |
|---|---|
| 6.11 | The pop-out rule |

One number, not five. Every other change in this revision is an amendment to a
section that already exists, which is the discipline the tracks were run under:
a revision that claims six new section numbers has not resolved anything, it
has added five more places to look.

## Precedence when two decisions land on one row

Apply in this order. The first that fires wins.

1. **The floor vetoes (6.10, Rule 0).** No decision here shortens, hides,
   iconifies, circles or defaults away a floor item. Where a track proposal
   did, it is cut; two were (POP-9b, POP-12a).
2. **A door is not a deletion; a circle is.** 6.10 forbids putting the reading
   behind an *info circle* and explicitly licenses putting the full run record
   behind a *Details chevron*. Disclosure by tier is legal; disclosure by
   explanation is not. This is the sentence that lets track 2 exist.
3. **A floor item may not be separated from the thing it qualifies.** The
   reading travels with its result, the departure with the channel it
   describes, the run record with its run, the cost estimate with its control,
   the legend with the canvas. A pop-out that takes a floor item and leaves
   behind the thing it was about is a breach even though rule 2 would allow it.
4. **1.6's compaction rules keep their force except where this document names
   the amendment.** Rule 7a, Rule 7c, Rule 8 and Rule 9 are unchanged in the
   general case; each takes exactly one carve-out here, each written into 6.9
   rather than left as an artboard habit.
5. **The register stays closed.** No decision in this revision adds a glyph to
   6.8. The one proposal that required two new glyphs is rejected (TB-6).

---

## A. The six conflicts, settled once

These are the collisions the tracks could not settle among themselves. They are
decided here, before the per-track decisions, because eleven decisions below
depend on them.

### A1. The bottom stack: one floor, three riders, one order

**The order, bottom to top:** the canvas rect; the **Data table drawer**, which
is a dock and therefore shortens the rect; the **time slider**, an overlay
sitting on the bottom edge of whatever rect remains; the **canvas toolbar**,
an overlay riding 12 px above whichever of those is currently beneath it. The
minimap and the legend share the toolbar's baseline.

Nothing new is invented. 5.1 already says "Docks resize the canvas; overlays do
not" and already docks the slider to the top edge of the drawer, so the four
vertical offsets fall out with no new arithmetic:

| State | Toolbar bottom offset |
|---|---|
| nothing else on | 12 |
| time slider on | 82 |
| drawer open (260) | 272 |
| drawer open with the slider docked to it | 342 |

**The slider is 70 px, not 72.** TimeSlider.dc.html draws 70 and
DataTableDrawer.dc.html draws 72; the slider's own board is authoritative. The
both-open offset is therefore 342, and DataTableDrawer's slider padding changes
from `6px 12px 2px` to `6px 12px 1px` and its overlay offset from 344 to 342.

**The gap the tracks left open, closed here:** when the Graph / Table control
maximises the drawer to the full canvas height there is no canvas left to
navigate, so the toolbar hides with the minimap and legend and returns when the
drawer is restored. Graph / Table stays at top centre and is the way back. This
is the only condition under which the toolbar is not drawn, and it is not a
disappearing item set -- the whole bar leaves, which reads as "there is no
canvas", not as "an item vanished".

**Graph / Table never enters the toolbar.** The bar's item set is fixed, because
a centred container that changes width moves every item under the pointer.

### A2. A pop-out is a container, not an eleventh row type

6.9 says there is no eleventh shape, and that sentence is what makes the set
closed. It survives intact, because a pop-out is not a row -- it is a
**surface**, in the same category as the panel, the inspector, the dialog and
the drawer that 6.9's own preamble already names. Its rows are the same ten.

So 6.9 changes in exactly two places and gains no rule:

1. **The preamble** gains one clause: "Every row in every panel, inspector,
   dialog, drawer **and pop-out** is one of ten shapes." Nothing else.
2. **RT-1's door sub-rule** is extended from field scale to section scale: "A
   control used by a minority of selections gets a 24 px trailing glyph that
   opens a popover; a **section** consulted rather than operated gets the same
   treatment at section scale, and 6.11 decides which sections those are."

The stub a departing section leaves behind is **not a new shape either**: it is
an RT-8 section header, and RT-8 already carries the state-mark job in its own
anatomy line ("the name is primary when the section holds a value and dimmed
when it holds none"). RT-8 gains one sentence describing the door form: its
chevron stays in the closed right-pointing form permanently, it never renders
the open form, and its trailing slot may carry the one fact that says what is
behind the door -- a count, the highest severity glyph, an On switch, or a
progress string.

That is the whole of 6.9's change. Two clauses, no new rule number, no eleventh
shape, and the closed set stays closed.

### A3. Pop-outs against the floor: the test, and the two cuts

The prompt is right that this is where track 2 could have quietly broken the
product. The test is precedence rules 2 and 3 above, applied item by item:

| Pop-out | Floor items in play | Verdict |
|---|---|---|
| POP-1 time slider settings | 2 (the window is a departure) | Legal. The Viewing readout stays on the slider; only the settings move |
| POP-2 filter rule | 4 (match count) | Legal **with amendment**: the per-rule match count stays in the rule row's trailing slot; only the editing controls move |
| POP-3 validation report | 4, 7 | Legal. The consequence sentences, the user's ids and the full-text actions all move together, with the thing they qualify |
| POP-4 group profile | 1, 2, 3, 7 | Legal. The reading, caveats and run record stay in the inspector by construction; only the per-group detail moves, with its group |
| POP-5 advanced parameters | 4 | Legal. Already a door in the spec; the cost estimate stays at the Run control |
| POP-6 schema | none | Legal |
| POP-7 run record Details | 3 | Legal, and explicitly licensed: floor 3 names the Details chevron itself |
| POP-8 all statistics | 2 | Legal **with amendment**: the per-row caveats move with their rows, and the stub must report the computing state, or 6.2's "Computing..." guarantee breaks behind the door |
| POP-9a selection statistics, third column | none | Legal |
| POP-9b **attribute profile** | 7 | **CUT.** See below |
| POP-12a **selection-set verbs** | 6 | **CUT.** See below |

**Cut 1, POP-9b, the attribute profile.** Nine rows of the user's own attribute
names and their top values is a scan surface made of floor-7 data. Track 2's own
POP-10 establishes the rule that decides it -- the notes list stays inline
because the note text is floor 7 and the list exists to be scanned -- and the
attribute profile is the same thing wearing a numeric costume. A reader
comparing five attributes across a selection cannot open five doors. The
third-column half of POP-9 survives on its own merit: a three-column numeric
table genuinely does not fit the 256 px band, and that is the width ladder
doing its job rather than the door rule overreaching.

**Cut 2, POP-12a, the selection-set verbs.** Replace, Union, Intersect,
Subtract and Filter to set are five verbs on one row. A pop-out is for
parameters and reports; a **menu** is for verbs, which is why the Data table
column header menu, the History row menu and the Views menu are all menus and
stay menus. These become the set row's context menu, matching the row-verb
treatment SAV-7 sets for every library row. That also keeps them reachable on
touch, where RT-7 makes a row's overflow resident.

Both cuts are recorded in 6.11's worked-examples table so a later pass does not
re-propose them.

### A4. The Results tab stays and narrows; the encoding controls leave it

Analysis as style collides with the Results tab and with the result-shapes
table. The shapes table decides it, and the tracks' own arithmetic was wrong.
Counting the thirteen shapes by what each writes onto the drawn graph:

| writes | Shapes | Count | What a run creates |
|---|---|---|---|
| a value per node or per edge | Node metric, Community, Layered grouping, Edge metric, Anomaly, Category table | 6 | an encoding layer |
| a set of nodes or edges | Path, Edge set, Removal impact, Scenarios | 4 | a highlight layer, exclusive, above the stack |
| nothing on the drawn graph | Pair list, Temporal, Fact | 3 | no layer |

Track 4 said "seven of the thirteen shapes paint nothing". Three paint nothing;
four paint a set. The correct sentence, and the one that goes in the spec, is:
**three of thirteen write nothing on the drawn graph and four write a set
rather than a value, so seven of thirteen never produce an encoding layer.** A
Results tab that disappeared would strand those seven and strand floor items 1,
2 and 3 with them.

So: **Results stays**, and narrows to two jobs -- the list of runs, and the home
of the evidence. What leaves is the encoding controls, because encoding has one
home and that home is Style (principle 2). An applied card's action row becomes
the resident state swatch, the layer name, and "Change encoding", which opens
Style with that layer selected. No card holds a palette, a scale or a domain.

### A5. Save and load against Present: one convention wins

Three verbs, one destination each, and applying is not a verb:

- `Save as <kind>...` -- creates a named entry in that kind's library, in this
  browser.
- `Import <kind>...` -- reads a JSON file into the library.
- `Export <kind> (JSON)` -- writes one library entry to a file.
- **Apply is the row click.** It gets no verb, which is what keeps the panels
  from growing an Apply button per row.

`Load` is retired from this vocabulary. The word is spent on data -- "Load data
first" is the disabled string on four rail items, "Loaded data" is a section
name, Loading is a state in 6.1 -- and a Load button beside a style would teach
the wrong noun for the one thing that really does load.

**The Present collision is settled by a distinction, not by a location.**
Section 3 gives data export one home, Present. That rule is about *the graph*.
Export of a saved thing is export of *settings that name attributes* -- a
selector, an expression, a column name, an algorithm name, a checklist -- and it
travels with the kind's own library section. Section 3's row is amended to say
so, so the next pass does not re-centralise these into Present and re-bury them.

**The one exception, named so it is not re-litigated:** `Run a recipe...` stays
in Data tier 1 and on Welcome. It is not a save-or-load verb, it is the front
door of an empty app, and it is the one place where the list is not on screen,
so a verb is needed to open it. `Import and replay` is retired in its favour.

### A6. The import entry clause: restored as a name, not as an explanation

This is the sharpest collision in the revision. 1.6 deleted the entry clause
from all four Import boards under Rule 8, as a restatement of the Format field.
The deletion is the whole of the complaint: it removed the only sentence that
distinguished four boards from each other.

**Decision, in three parts.**

1. **The clause is restored** to the title row: `Import options` at 14 px
   primary, then dimmed 11 px `<file>, <size> -- <entry clause>`.
2. **It is protected by floor item 6, names -- not by floor item 4.** Track 1
   proposed amending floor 4 ("what a control will do before it does it") to
   cover the reason a dialog opened. That is rejected. Floor 4 is about a
   *control* and about a *prediction*; a dialog is not a control and its entry
   state is not a prediction. Stretching floor 4 to cover "any text that helps"
   would destroy the discipline that makes the floor a veto rather than a
   preference. The clause is protected instead as what it actually is: part of
   the dialog's **name**. Floor 6 covers "every capability's plain name", and
   6.9's Rule 1 word gate already passes it on the first gate -- it names a
   place you navigate to.
3. **Rule 8 is closed anyway**, because the misapplication was real and will
   recur. Rule 8 gains: "A trigger is not an explanation. Naming the condition
   that caused a surface to appear does not restate the controls it contains,
   even when the two share a word -- 'delimited file' is why this dialog
   opened, 'CSV, 98% confidence' is what the parser found."

**And 1.6's "the default does not render" is honoured, not overridden.** There
is no default entry state: all seven clauses name a condition that is a
departure from "the file simply loaded". Rule 7a deletes controls sitting at
their default; it has nothing to delete here. The rule and the clause do not
actually collide once the clause is understood as a name rather than as a
sentence about a control.

---

## B. The direction guard: what this revision adds and removes

Every decision below carries a **Direction** line. Summed:

### Resident panel pixels

Removed (measured section heights inside the 800 px panel column):

| Where | From | To | Delta |
|---|---|---|---|
| Filter builder, expert (POP-2) | 567 | 180 | -387 |
| Group profile in the inspector (POP-4) | 228 | 0 | -228 |
| Validation report (POP-3) | 282 | 32 | -250 |
| Step through time (POP-1) | 169 | 32 | -137 |
| All statistics (POP-8) | 149 | 32 | -117 |
| Filter builder, simple (POP-2) | 169 | 128 | -41 |
| Notes header controls (POP-10) | -- | -- | -64 |
| Import policies compacted (POP-11) | 197 | 157 | -40 |
| Advanced block off the card (POP-5) | -- | -- | about -60 per card |
| Encoding controls off result cards (STY-5) | -- | -- | about -24 per applied card |
| Navigation cluster off the canvas edge (TB-3) | 56 x 160 of chrome | 0 | canvas gained |

Added:

| Where | Cost |
|---|---|
| Source section on an analysis-backed style layer (STY-3, as amended) | **+164 measured** at 280 px: a 33 px RT-8 header plus a 131 px body (reading over two lines, run record, one deviating parameter row, Open result) |
| Five library section headers (SAV-1, SAV-5, SAV-8, SAV-9, SAV-10) | +33 each where the kind exists; an empty one is +33 with no rows |
| Highlight layer row in the Layers list (STY-4) | +28 while one exists |
| Four field chevrons in Loaded data (IMP-7) | +0 width, +0 height |

**Net on resident panel pixels: about -900 across the set**, dominated by track
2. The removals total about 1,264 px on the eight measured sections before the
per-card savings; the additions total about 357 px. Track 2 is the reason tracks 3 and 4 are affordable, and that is the whole
architecture of this revision: one track pays for two.

### Visible words

Honestly: **words rise slightly.** Track 2 relocates text rather than deleting
it, so it buys pixels and not words. The additions are:

| Decision | Words added | Why it is allowed |
|---|---|---|
| IMP-1 entry clause | +3 to +4 on each of five Import boards | floor 6, names |
| IMP-4 recognition run record | +12 on one board | floor 3, a run record may not be shrunk to nine words |
| IMP-5 Everything arithmetic | +14, and -1 button and -1 inline link | floor 4, the cost estimate belongs at the control |
| IMP-9 parse-error board | +30 on a new board | floor 4, the reason a disabled control is disabled |
| SAV-3 destination line | +9 per Save dialog and per library info circle | floor 4, what a control will do |
| SAV-6 apply report | +12 when something did not bind | floor 2, every departure named |
| STY-3 Source reading and caveats | +25 per analysis-backed layer | floor 1 and floor 2 |
| STY-6 cost gate line | +11 while a re-run is pending | floor 4 |

That is roughly **+120 to +150 words across 48 boards, about 1 per cent of the
1.6 total of about 10,700.** Every one of them is a floor item or a name. No
decision in this revision adds an explanation, a description sentence, a
category word or a restatement, and three decisions delete some
(IMP-5, POP-11, STY-7).

**The claim this revision makes is therefore not "fewer words".** It is: panel
height falls by about a fifth on the five worst screens, the word count rises
by about one per cent, and every added word traces to 6.10. A revision that
claimed a word win here would be lying about what tracks 1, 3 and 4 do.

### How the numbers were got

The removals are the section heights track 2 measured inside a 279 x 800 panel
scroll region. The three new components -- the canvas toolbar, the pop-out shell
and the layer Source section -- were rendered privately from the VOCAB 1.7
snippets over a `file://` URL and measured, not estimated:

| Component | Claimed | Measured |
|---|---|---|
| Canvas toolbar, desktop | 246 x 36 | **246.00 x 36.00** |
| Pop-out stub (RT-8 door header) | 33 | **33.00** |
| Library section header | 33 | **33.00** |
| Library rows, three | 84 | **84.00** |
| Import title row with entry clause | 36 | **36.00** |
| Recognition run-record row | 28 | **28.00** |
| Analysis-backed layer row | 28 | **28.00** |
| Source body at a 280 px column | -- | **131.00** |

The one number that came back larger than the proposal claimed is the Source
body, and STY-3 and section J now carry the measured figure rather than the
estimate. No screenshot was written into the repository.

---

## C. Track 1 -- Import flow

Track IDs kept. The four Import boards are one dialog in four of seven entry
states, and nothing on them says so.

### IMP-1 Restore the entry clause, and close Rule 8 (screen + rule)

**Decision.** All title rows become `Import options` at 14 px primary, then
dimmed 11 px `<file>, <size> -- <entry clause>`. The clause list grows from six
to seven by splitting the size trigger, and the tie-break is stated
operationally: **evaluate the list from the end; the first match wins.**

| Board | Clause |
|---|---|
| ImportOptions | `fraud-ring-synthetic.csv, 38 KB -- guessed column` |
| ImportRecognised | `ovarian_de_string.tsv, 212 KB -- delimited file` |
| ImportLargeFile | `netflow-2026-q2.csv, 3.2 GB -- above the render ceiling` |
| ImportAddToGraph | `devices-batch2.csv, 8 KB -- second file, data already loaded` |
| ImportParseError (new, IMP-9) | `malformed-export.csv, 1.2 MB -- parse error` |

Note the correction track 1 found: ImportOptions was mislabelled even before
the deletion. It has a guessed type column, and `guessed column` sits later in
the trigger list than `delimited file`, so the tie-break gives it `guessed
column`. Its file comment records which trigger won and which it beat.

**Rationale.** See A6. The clause is a name, protected by floor 6; Rule 8 is
closed against the specific reasoning that deleted it.

**Spec text.** (1) 6.9 Rule 8 gains, after "Delete it where it restates a
control, a value or a list visible on the same screen": "A trigger is not an
explanation. Naming the condition that caused a surface to appear does not
restate the controls it contains, even when the two share a word -- 'delimited
file' is why this dialog opened, 'CSV, 98% confidence' is what the parser
found, and deleting the first because the second is on screen removes the
answer to the user's first question." (2) 5.3 Data, Import flow item 0's fixed
list becomes seven: `delimited file`, `guessed column`, `parse error`, `second
file, data already loaded`, `above the large-graph threshold`, `above the
render ceiling`, `always show import options is on`, with the tie-break
restated as "Evaluate the list from the end; the first match wins." (3) 6.10
floor item 6 gains: "...and the entry state of a dialog that opens unbidden,
which is the dialog's name for that state and not an explanation of its
contents." **Floor item 4 is not amended.**

**Artboards.** ImportOptions, ImportRecognised, ImportLargeFile,
ImportAddToGraph, ImportParseError.

**Direction.** Adds: +3 to +4 words per board, five boards. Justified by
floor 6.

### IMP-2 Write the state machine into the spec as a decision table (rule)

**Decision.** Two tables in 5.3 Data before item 0. Table A, the six inputs
that decide everything: graph already loaded; format class (unambiguous /
delimited / unreadable); header signature (unknown / remembered / matches a
known export); anything guessed; estimated size against the two numbers; the
Always show import options setting. Table B, one row per combination that
behaves differently, giving: does the dialog open; which clause wins; does
item 2's banner render; does item 3's picker render; what item 6's Load control
defaults to; the primary button's label.

Three sentences of composition law follow, because the tables cannot carry
them: conditions combine and do not exclude one another; a recognised export
above the ceiling draws the banner and the warning and the pre-selected subset
and takes the ceiling's clause, because the clause names the trigger and not
the contents; only five of seven clauses are drawn as boards, and the boards
are samples of the table.

**The two numbers get their division of labour stated explicitly**, because
they are 1,500 lines apart today and one board's comment and its own title
disagree about which applies: "Crossing the large-graph threshold opens the
dialog and turns on Performance mode after import. Crossing the render ceiling
additionally pre-selects a subset, draws the departure line and relabels the
primary button when Everything is chosen. Between the two numbers the dialog
opens with no warning and no subset, which is the case the boards do not draw."

**Rationale.** The machine is fully determined by the spec today, but only as
prose scattered across item 0, the trigger paragraph, items 3 and 6, Rules 7a
and 7c, and a Performance table far away. No reader can assemble it, which is
why four boards that are one dialog read as four dialogs.

**Artboards.** The four existing Import boards, comments only: each replaces
its freeform OPENS paragraph with the same four-line extract from the table.

**Direction.** Neutral on screen. Spec only.

### IMP-3 New artboard: draw the import flow as one machine (screen)

**Decision.** `ImportFlow.dc.html`, 1440 x 900, no shell chrome, five regions:
a header band; WAYS IN (the seven triggers in list order with their clauses and
an arrow up the left edge labelled "evaluated from the end; first match wins");
THE DIALOG (one reduced outline with its nine items as bands, the five
always-present ones solid and the four conditional ones tinted with their
render conditions on leader lines); WAYS OUT (the primary verbs with their
destination states and boards, then Cancel with its two behaviours, and Esc and
the title-row X noted as the same action); WAYS BACK IN (the seven reopen paths
as arrows curving back in, each with its scroll target). Below, the decision
table of IMP-2 at 11 px with eight example files, including the two rows no
board draws.

The board draws **no new icons and no new words**: every clause, verb and label
is copied verbatim from VOCAB.md and REGISTER-1.5.md, and the board is where a
reviewer checks that claim.

**Rationale.** The user's question was "how does a person arrive at three of
these four screens", and it cannot be answered from inside any one of them --
the relationship lives in the triggers above and the destinations below. Every
other board in the set draws a resting state; nothing draws a transition, and
import is the one place where the transitions carry the decisions.

**Stale reference to fix.** ImportLargeFile.dc.html line 21 points its exit at
`ExplorerSubset.dc.html`, which does not exist in the canvas directory. The
WAYS OUT column may not cite it; that row reads "not drawn" until the board
exists.

**Spec text.** One row in the section 9 artboard index between ImportAddToGraph
and TableJoin; one pointer sentence in 5.3 Data after the reopen-paths
paragraph.

**Direction.** Adds one board. Removes nothing from any panel. The board exists
to make four existing boards legible, which is a net reduction in what a reader
has to hold in their head.

### IMP-4 The recognised state becomes a run record and becomes reversible (screen)

**Decision.** The nine-word banner becomes an RT-7 action row spanning the
dialog width, under the interpretation row, in the floor-3 form: `Recognized a
STRING export -- 12 columns mapped, combined_score as weight, 1 saved filter
installed`, with `Details` (a 24 px chevron opening the full per-column record)
and the text button `Map it myself`. Pressing it clears every pre-assignment,
leaves detection-only guesses, and flips the row to `STRING mapping cleared --
4 columns guessed. Review` with `Use the STRING mapping` in place of `Map it
myself`, so the move is reversible in both directions without a confirm and
without leaving the dialog. The saved-filter line 500 px below is deleted where
it stands and rides in the banner and the Details record (Rule 9: the fact
rises to the row that caused it).

**Rationale.** Two failures in one row. The escape hatch is a bare `Change`
naming no object. And the recognition silently rewrote the user's mapping --
twelve column roles, the weight, seven edge attributes, the identifier system,
a named saved filter -- and reported none of it. That banner is a floor item 3
run record, and floor items are Rule 0 vetoes that no compaction may shrink. It
had been shrunk to nine words.

**Rule 9 collision, resolved in the spec text.** Rule 9 would nominally delete
the filter name from the banner as a repeat of the foot-of-dialog line, which
is exactly the collision that produced this bug. The spec change names the
banner as the origin so Rule 9 resolves the right way.

**Spec text.** 5.3 Data item 2 is rewritten: "...a one-line run record naming
what the recognition did -- the column count, the weight column, and the count
of saved filters installed -- with Details holding the full per-column record,
and 'Map it myself' clearing every pre-assignment. The banner is a floor item 3
run record: a recognition is an automatic edit to the user's mapping and is
reported like any other automatic action, at the point it happened, not as a
consequence line elsewhere in the dialog."

**Artboards.** ImportRecognised.

**Direction.** Adds +12 words on one board. Required by floor 3.

### IMP-5 Symmetric arithmetic on the large-file options; three Everything doors become one (screen)

**Decision.** Three edits to ImportLargeFile. (1) The Everything radio gains the
same two-line block Busiest nodes has, at the same indent and colour: `Draws
1.0M nodes and 10M edges. Edges beyond 500,000 are hidden until zoomed in.` and,
with the warning glyph, `About 2.4 GB. May be slow or run out of memory.` (2)
The warning line loses the inline `Import everything anyway` link and loses the
2.4 GB figure, reading `Above the render ceiling -- about 200,000 nodes on this
machine. Busiest nodes is selected below; the whole file still loads.` (3) The
footer's separate `Import everything anyway` button is deleted; the footer
becomes the same three slots as every other state and the primary's label
follows the Load selection. Separately, ImportRecognised's `Load a subset
(Coming)` footer button is deleted, since it duplicates the Load control four
rows above it.

**Rationale.** The user is being steered and the steering is one-sided: the
selected option carries two lines of arithmetic and the rejected one carries a
consequence sentence and no cost, with its cost sitting 300 px away attached to
the ceiling rather than to the choice. Floor 4 puts a cost estimate at the
control it is the cost of, and an option the user is being steered away from is
exactly the one whose cost must be legible. Three affordances for one branch,
where item 6 specifies one, is why this footer looks nothing like the other
three.

**Spec text.** Item 1's each-fact-once assignment changes one clause: "counts
in this summary, the render ceiling in the warning line, and every Load
option's own arithmetic and cost inside that option -- the chosen one and the
ones not chosen alike." Item 6 gains: "The Everything path is offered once, as
the Everything option; the primary button follows the selection. No inline link
and no second button duplicates it." Item 9's button list drops `Load a subset`.

**Artboards.** ImportLargeFile, ImportRecognised.

**Direction.** Adds +14 words on the Everything option; removes one button and
one inline link. Roughly neutral, and required by floor 4.

### IMP-6 Every route in and out, including what Cancel does (rule)

**Decision.** Cancel is defined for every state, in one paragraph after item 9:
Cancel, Escape and the title-row X are one action. **When nothing was loaded**,
Cancel abandons the file: the shell returns to Empty, the status bar reading
line clears, and the file does not enter Recent -- a file the user declined is
not a file they opened. **When a graph is loaded**, Cancel closes and changes
nothing: no re-apply, no re-parse, no re-run, no new Cleaning step, no history
entry. **On a reopen where the user changed a role, type, policy or Load option
without pressing the primary**, Cancel confirms once -- "Discard the changes to
the mapping?" with Discard and Keep editing -- because the dialog is showing the
mapping of a graph already on screen and a silent discard is indistinguishable
from a silent apply. A menu open inside the dialog takes Escape first. **On a
parse error Cancel is the only exit and is never disabled.**

The seven reopen paths each gain a scroll target, as a table: a mapping field on
a Loaded data line -> that role's column header, its Role chip focused; the
"Mapped as before" toast -> the grid, top; the Data tier 3 list -> the dialog
top; the Insights card "Load the full graph" -> the Load control, Everything
focused; the step 3 choice "Compare with current graph" -> the picker, Compare
selected; Import as "Add attributes from a table" -> the picker, Attach
selected; the palette -> `Import options` at the top, `Change the column
mapping` scrolled to the grid.

The primary button follows the branch: Import / Import everything anyway when
nothing is loaded; Add / Replace / Add attributes / Open comparison following
the item 3 picker when a graph is. Replace keeps its full text as a destructive
verb.

**Rationale.** Half the answer to "how do you get to these screens" is how you
get out of them, and Cancel appears on all four boards and is defined on none.
The two cases are materially different and one is a data-loss risk.

**Reconciliation the spec must make.** "Reopening never re-reads the file"
already stands in 5.3 and sits close enough to the discard confirm to be
misread. The confirm is about in-dialog edits, not about re-parsing; say so.
The "file does not enter Recent" rule touches 7.1 item 3 and Settings > Data
management and must be checked against them rather than asserted.

**Artboards.** All five Import boards, comments: each replaces the identical
copy-pasted seven-path paragraph with a four-line IN / REOPENS AS / OUT /
CANCEL form for its own state.

**Direction.** Neutral on screen except the discard confirm, which is a dialog
that only appears after an edit.

### IMP-7 Restore a visible reopen door on every Loaded data line (screen + rule)

**Decision.** The four mapping fields in DataPanelLoaded's Loaded data section
(weight/amount, time/ts, label/id, ids/account id) render as RT-1 **select**
fields rather than flat text: each gains the 14 px chevron inside the box after
the value, which is the register's existing mark for "this field opens
something". Each field's title names its target verbatim ("Weight column:
amount. Change in Import options"). The Import settings gear on the section
header stays as the general door.

**Rationale.** The first and most-used of the seven reopen paths is "any Change
link on a Loaded data line, scrolled to its own control". 1.6 removed every one
of those links, raising them to a single section gear under Rule 9, and one gear
on a header cannot scroll to the weight column. The reopen path now has no
visible door and no scroll target, and the fields render as flat dimmed text
with no chevron, so nothing signals they are controls at all.

**What this does NOT reverse.** DataPanelLoaded also deleted "Repeated edges:
combined, 5 pairs. Change" and "Self-loops: kept, 2. Change" under Rule 8,
because validation cards 300 px below carry the same Change. That deletion is
sound -- the affordance survives elsewhere on the same screen -- and stands.

**Spec text.** 6.9 Rule 9 gains: "Rule 9 raises a repeated word to a header. It
does not raise a repeated affordance: where each row's copy of a verb acted on
that row, one copy on the header is a different and weaker control, and the
rows keep their own doors -- as the field's own chevron where the field is the
door, never as a bare text row that happens to be clickable." Reopen path 1 is
restated in the panel's current vocabulary.

**Artboards.** DataPanelLoaded.

**Direction.** Adds four glyphs, zero width (the chevron sits inside the
existing 108 px field), zero words. Restores a navigation affordance.

### IMP-8 Retitle the four boards in canvas.json (screen)

**Decision.** The four canvas titles become one sentence pattern with one
variable: `Import options -- guessed column`, `Import options -- delimited file
(recognised export)`, `Import options -- above the render ceiling`, `Import
options -- second file, data already loaded`. The variable half is the same
clause the title row now draws, so the gallery label and the screen agree word
for word. Each file comment's CANVAS TITLE line is updated and loses its
"canvas.json is not edited here" hedge.

**Ordering constraint.** IMP-8 must not land before IMP-1: if the tie-break
correction is not applied, the first title reverts to "delimited file" and stops
matching its own screen.

**Coordination.** canvas.json is shared and all four files declare they do not
edit it. This is one deliberate coordinated edit, made together with IMP-3's and
IMP-9's new entries and the group-2 annotation count, which goes from (7) to
(9).

**Direction.** Neutral. Index only.

### IMP-9 New artboard: the parse-error state (screen)

**Decision.** `ImportParseError.dc.html` on the 720 frame over the Empty shell.
Title row `Import options  malformed-export.csv, 1.2 MB -- parse error`. The
summary is replaced by item 8's error block: the plain-language statement, the
offending line quoted in the monospace face with its line number, and the count
(`Row 1,284 has 7 values where the header has 5. 3 more rows like this.`). The
grid renders as far as it parsed with the offending row in the warning colour
and a `Show the 4 bad rows` action. **The Parsing group is drawn open with
Separator focused**, because the separator and the quote character fix this
class of file. Footer: Cancel at the left, never disabled; the note slot carries
the reason the primary is disabled in full (`4 rows cannot be read. Fix the
separator or skip them.`); the primary reads `Import` and is disabled, with a
secondary text button `Skip 4 rows and import` beside it. Nothing on this board
is iconified and the error text is never moved behind an info circle.

**The corpus chosen: ragged rows**, because its fix is a skip rather than a
setting, which is what makes the secondary button necessary.

**Rationale.** Of the seven clauses, five are drawn, one needs no board
("always show import options is on" produces a dialog identical to one already
drawn) and one is between the two numbers and is a dialog with nothing special
on it. Parse error is genuinely different: it is the only state where the
primary is disabled, the only one where item 8 renders, and no board in the set
exercises floor 4's "the reason a disabled control is disabled" on the
highest-stakes disabled button in the app.

**Spec text.** Item 8 expands from one sentence to a specification, including
the clause that **the parse-error state overrides the remembered open state of
the Parsing group for this one opening and does not overwrite it** -- otherwise
a user who once collapsed Parsing never sees the control that fixes their file.

**Direction.** Adds one board and about 30 words on it. Required by floor 4.

---

## D. Track 2 -- Pop-outs

Track IDs renumbered POP-n from the track's P-n. This is the load-bearing track:
it is what pays for tracks 3 and 4.

### POP-0 Spec 6.11, the pop-out rule, and the 3a / 3b split of tier 3 (rule)

**Decision.** 6.2's tier 3 bullet, which currently reads "popout or dialog" --
one rung for two mechanisms with opposite relationships to the canvas -- splits
in two:

- **Tier 3a, pop-out.** No scrim, no focus trap. The canvas keeps pointer and
  keyboard, selection keeps flowing, every change previews live, Escape closes,
  at most one per region.
- **Tier 3b, dialog.** Scrim, focus trap, canvas frozen, one commit point.

6.2's scrub clause then holds verbatim and gains a second sentence: **a control
the user scrubs while watching the canvas is never 3a or 3b, but its settings
may be 3a and may never be 3b.** That is what lets the time slider keep its
transport, track, sparkline, playhead and Viewing readout on the canvas while
its settings move into a pop-out, and it is why a pop-out may itself *contain* a
scrub control such as the filter builder's dual-handle quantile slider.

**6.11, the rule, in one sentence:** "A pop-out is for one member of a list, or
for a report you read once. An inline section is for the job the panel is open
to do. A dialog is only for a commit the canvas must wait on."

**Applied as three questions, first yes decides.**

1. Must the graph stop being touchable until this is answered? Yes -> 3b dialog.
   True only where a commit changes the data before anything else can proceed:
   Import options, Table join, Map identifiers, node merging, the computed
   attribute formula, Run a recipe. If no, it is never a dialog.
2. Is it about ONE member of a list this surface already shows, or is it a
   report read once and not returned to? Yes -> 3a pop-out, anchored to that
   member's row, titled with that member's own name.
3. Otherwise it is an inline section at the tier 6.2 assigns.

6.2's frequency test overrides in both directions and is unchanged.

**Three obligations make a pop-out legal.**

- **The stub.** Whatever leaves leaves a resident RT-8 row that names it and
  reports its state: the count, the severity glyph, the On switch, the progress
  string. RT-8's existing rule (name primary when the section holds a value,
  dimmed when it holds none) is how a door marks that it hides a non-default.
  Figma's constraints control has no such mark and that is its documented
  complaint (https://dev.to/goldenekpendu/what-happened-to-the-constraints-tab-figma-ui3-update-457a).
- **The keyboard.** Hover never opens a pop-out; hover only reveals the
  *opener*, which RT-7's hover split already permits and which RT-7 already
  makes resident on a touch pointer. Every pop-out has three routes per 6.4: a
  focusable opener in the panel's tab order whether or not it is hovered,
  opening on Enter or Space; a palette row indexed by both names; and its
  home-panel row. Escape closes and returns focus to the opener. F6 cycles the
  open pop-out immediately after the region that owns it. Up and Down on a
  driving list re-target an open pop-out rather than closing it.
- **The nesting limit.** A pop-out may open a menu, an info circle, a colour or
  gradient picker, or a 3b dialog which replaces and closes it. **A pop-out may
  never open a second pop-out.** Figma's text-style bug -- floating panels that
  close when the details icon is clicked
  (https://forum.figma.com/t/type-detailed-settings-no-longer-accessible/27177)
  -- is the defect class this rule buys us out of.

**Anatomy.** Widths are a ladder of three, taken from our own grid, never
invented per case. **280** reuses the panel identity 16+108+8+108+8+24+8 and is
for field rows. **360** gives a 336 px content band and is for a
sentence-plus-user-ids report or a three or four column numeric table. **480**
is the ceiling and is only for a two-dimensional matrix or a plot, because at
1440 the canvas band is 832 px and a 480 pop-out still leaves 344 px of graph.
Anything wider is a drawer or the Data table, not a pop-out. Height is capped at
the owning region's height minus 32, with the pop-out's own scroll region; a
pop-out never scrolls the panel behind it.

**Anchor.** Activity-panel pop-outs open right with their left edge at x = 336,
8 px clear of the panel's 328 edge. Inspector pop-outs open left with their
right edge 8 px clear of the inspector. Canvas-overlay pop-outs sit 8 px above
their overlay with right edges aligned to the opener. Vertical flip when the
bottom would cross the status bar; **never a horizontal flip**, because a
pop-out that crosses the shell stops meaning "this panel's". On panel scroll the
pop-out follows its row while the row is in view and, once the row scrolls away,
stays open at its last position with the opener still lit -- the title is the
anchor, not the pixel.

**Header** is 32 px: the member's own name, the technical name dimmed beside it
per 6.3, a pin toggle, and the register's close X titled `Close (Esc)`. **Pin**
is generalised from what 5.3 Style already gives three popouts: pinned ignores
click-outside, survives selection change, and its dragged position is remembered
per pop-out type under 6.5. That is the feature Figma scoped and dropped
(https://forum.figma.com/t/persistent-color-picker-when-unpinned-from-right-panel/203),
and we get it for free by specifying it before shipping.

**Multiplicity: one per region** -- at most one in the activity panel, one in
the inspector, one on the canvas overlay. Below 1280 px and on iPad a pop-out is
a second sheet over its panel at full panel width with a back chevron, honouring
5.2's one-overlay-at-a-time rule.

**6.9's change is in A2 and is two clauses. There is still no eleventh row
type.**

**Spec text.** 6.2 tier 3 splits; new section 6.11; 5.6 Escape ladder rung 2
gains the focus-return clause; 6.4's reachability audit gains a fourth route
family and is re-run.

**Artboards.** SHELL-SKELETON.html gains the pop-out shell so every board
inherits one drawing.

**Direction.** Neutral by itself. It is the licence the removals below spend.

### POP-1 Step through time: the settings pop out, the scrubber does not (screen)

**Decision.** The slider bar keeps everything that is scrubbed -- transport,
track with tick marks and the timestamp density sparkline, playhead, the
`Viewing: 2026-01-05 to 2026-02-04` readout, `by opened`, and the gear. The gear
opens a 280 pop-out about 232 tall, 8 px above the slider bar with right edges
aligned: time attribute select; an RT-1 pair Window 30 days / Step 7 days with
units from the Time role's Measured in field; an RT-3 pair Cumulative /
Sliding; Speed 1x; an RT-5 toggle `Recompute results on each step`; and an RT-7
row `Compare with another window`. **The Explore panel's Step through time
section collapses from 169 px to one 32 px RT-8 row**: name, dimmed technical
name, the On switch resident in the trailing slot, and the gear.

**Rationale.** Today the gear switches the whole left panel to Explore and
scrolls it, which is a context switch away from the canvas the user is watching
in order to change a number that immediately re-renders that canvas. 6.2 forbids
making the *slider* a dialog; it never intended to forbid giving its settings a
non-modal surface. This is Figma's split between inline typography and the type
settings gear
(https://help.figma.com/hc/en-us/articles/360039956634-Explore-text-properties).

**Register defect fixed here.** REGISTER-1.5 gives the settings glyph the object
title `Time slider settings (T)`, but 5.6 binds T to *toggling the slider*.
Under 5.6's own rule a control may not print a binding it does not own, so the
title becomes `Time slider settings` with no key chip.

**Artboards.** TimeSlider (draws the pop-out open), ExploreNotesList,
MultiSelection, DataTableDrawer, InsightsWide.

**Direction.** Removes 137 px from the Explore panel on five boards. Adds a
door.

### POP-2 Filter builder: the builder stays inline, one rule pops out (screen)

**Decision.** The builder section drops from 567 px to about 180: Nodes/Edges
scope; Hide others / Select matches; Match all / Match any; **one 32 px row per
rule reading the rule back in plain form, with its own match count in the
trailing slot and an X to remove it**; the neighbors row; `+ Rule`; and the live
`38 of 318 would match` line. One rule pop-out at 360, anchored to its row,
titled with the rule read back, holds the attribute picker with its search field
and groups, NOT, the operator select, the dual-handle quantile slider over a
full-width histogram on a log axis with both endpoints legible, and the
per-rule detail. The Builder / Expression door **moves from the rule row to the
section header** and opens a separate 360 pop-out for the JMESPath field.

**Amendment against the floor (A3).** The per-rule match count stays in the rule
row's trailing slot, not in the pop-out. Floor 4 puts the count a control acts
on at that control, and the rule row is the control.

**Rationale.** The largest single consumer of panel space in the set, 71 per
cent of one column -- but the builder is why the user opened Explore, so
question 2 says inline for the builder as a whole. What is about one member is
the rule. This is Figma's effects section exactly: the list of effects is
inline, each row's parameters live behind that row's own gear
(https://help.figma.com/hc/en-us/articles/360041488473-Apply-effects-to-layers).
It also fixes a drawing problem: 224 px cannot hold two slider handles and two
legible numbers.

**Nesting.** The attribute picker inside the pop-out is drawn as a **menu**, not
a second pop-out.

**Spec text.** 5.3 Explore tier 2 restates the builder; the sentence "the
Builder and Expression switch is a trailing door on that row rather than a
resident tab pair" is amended, since the row it referred to no longer exists.
COMPACTION-1.6.md line 128's door catalogue takes the same edit.

**Artboards.** FilterBuilderExpert (draws the pop-out), ExplorePanel, Main,
TimeSlider, ExploreNotesList, ExplorerLargeGraph, StylePanel, StyleDiverging.

**Direction.** Removes 387 px on the worst board and 41 px on ExplorePanel.

### POP-3 Validation report: a 360 pop-out beside the Data panel (screen)

**Decision.** The section drops from 282 px to one 32 px row: name, the highest
severity's glyph, the count in the trailing slot, name primary while any issue
is open and dimmed once all are fixed or ignored, chevron permanently closed. The
pop-out opens at 360, left edge x = 336, header `Validation report` with
`Re-ran after step 2` dimmed beside it: errors, then warnings, then a collapsed
Info (3) group; per type a count, the consequence sentence, the first examples
of the user's own ids with Show more, and the actions **resident rather than
hover-revealed**, because at 360 there is room and floor 4 wants their full text.

**Rationale, and it is the argument no other case can make.** Every issue card's
Show rows opens the Data table drawer along the canvas bottom, filtered to the
offending rows. A 3b dialog would have to close to let that happen, and the user
would lose the issue text at the exact moment they need to compare it against
the rows. A 3a pop-out at the left sits happily beside a bottom drawer, and the
user reads "14 edges have no amount. Analyze uses weight 1. Median is 240."
while looking at edges 41, 88 and 130. 360 rather than 280 because the
consequence sentence and the line of user ids are floor items 4 and 7 and cannot
be shortened; at 360 the consequence fits two lines instead of four.

**The exception, drawn.** Inside the Import options dialog the validation issues
stay **inline**, because 6.11 forbids a pop-out opening from inside a dialog and
because errors there gate the Import button. ImportOptions and ImportRecognised
are unchanged and are the drawn proof.

**Not a repeat of the status bar chip.** 5.1 gives the status bar "4 data
issues". The stub row's count is a different fact -- the chip is a global alarm,
the row is the door's state mark required by 6.11 -- and 6.9 explicitly licenses
a count on a collapsed header.

**Artboards.** DataPanelLoaded, MultiSelection, ImportOptions, ImportRecognised;
new board `ValidationPopout.dc.html`, which draws the pop-out **with the Data
table drawer open underneath**, because the coexistence is the argument.

**Direction.** Removes 250 px.

### POP-4 Groups result: the size table stays, the per-group profile pops out (screen)

**Decision.** The inspector keeps, unchanged and in this order: the reading, the
caveats line, the one-line run record with Details, the headline row, the full
Groups by size table with its members and density columns, and the result-scoped
actions. The 228 px Group 1 block leaves the column entirely and becomes a 360
pop-out anchored to the clicked row, headed `Group 1` with `Communities
(Louvain)` dimmed beside it: over-represented values as a four-column table,
internal hubs as RT-6 rows, edges to other groups as RT-9 micro-bars per
neighbouring group rather than three bare numbers, and the group-scoped actions.
The Group 1 row carries the selected-row fill so the tether is visible. **Up and
Down on the table re-target the pop-out without closing it.**

**Rationale.** This is not only a density problem, it is a missing capability
wearing a density problem's clothes: the block is fixed to one group while the
table above it lists four, and on a real dataset forty. Anchoring it to the
clicked row turns a fixed block into a detail view over every group. 360 because
over-represented values is a four-column table whose first column carries the
user's own attribute names.

**5.4 reconciliation.** 5.4 says "One result body renders on screen at a time"
and "Reading, caveats line, run record and shape body each render exactly once".
The pop-out is part of *one* shape body, not a second; the sentence gains a
clause saying so, or a reader will call this a violation.

**Region multiplicity, stated rather than discovered.** The profile and POP-7's
run record Details are both inspector-region pop-outs, so opening one closes the
other. That is correct -- both are about the same result -- and it goes in the
spec.

**Artboards.** ExplorerAfterCard, CategoryTable, ExplorerExpert; new board
`GroupProfilePopout.dc.html`.

**Direction.** Removes 228 px from the inspector and adds a capability.

### POP-5 Advanced parameters become a pop-out; the four-row threshold (rule + screen)

**Decision.** 5.3 Analyze already puts the Advanced block behind a gear as a
collapsed block inside the parameters section, explicitly "not a dialog". It
becomes a 280 3a pop-out anchored to the parameters row, so Advanced stops
pushing Run below the fold. **The gear draws in the primary colour, not dimmed,
whenever any hidden option deviates from its default** -- 6.11's stub
obligation. Pinned Advanced fields keep working: a pinned field renders inline
and does not render in the pop-out.

**The threshold, stated as a number so two drafters agree:** a schema group of
**more than four rows** renders as a 3a pop-out opened from a gear on the row it
belongs to; four rows or fewer render inline. Force directed's three visible
parameters therefore stay inline and the rule visibly does not fire, which is
the point of stating it.

**Rationale.** This is Figma's auto layout split -- direction, gap and padding
inline, canvas stacking and stroke-in-layout behind the gear
(https://help.figma.com/hc/en-us/articles/31289464393751-Use-the-horizontal-and-vertical-flows-in-auto-layout)
-- and its export split, where per-export settings stay inline and per-file
settings go behind Advanced
(https://help.figma.com/hc/en-us/articles/13402894554519-Export-formats-and-settings).
The split is by change frequency, not by complexity. When Figma split on
complexity instead, with Constraints, users complained.

**Spec text.** 6.2's derived-tier paragraph gains the four-row threshold, which
is a genuine amendment: it currently says options not flagged advanced are tier
2 inline with no size limit. 6.5's per-card memory of the Advanced block's open
state becomes memory of the pop-out's position per pop-out type; pinned fields
keep their own per-card memory.

**Artboards.** StylePanel, StyleDiverging, AnalyzePanel, ExplorerAfterCard,
AnalyzeSweep, ExplorerExpert, IpadPanel.

**Direction.** Removes about 60 px per card that has an Advanced block.

### POP-6 Schema: the inspector row becomes a door to a 480 pop-out (screen)

**Decision.** The Schema row keeps its summary (`4 node types, 3 edge types`) as
the door's state mark and its chevron goes permanently closed. The pop-out is
480 wide, right edge 8 px left of the inspector: a node type table (type, count,
completeness), an edge type table, **the type-pair list drawn as a matrix** with
node types on both axes and edge counts in the cells, and the three actions as
an RT-7 row.

**Rationale.** The panel cost is already paid -- the row is already collapsed on
eight boards -- and what is missing is anywhere to put the contents. The
type-pair list is a two-dimensional relationship and is drawn honestly only as a
matrix, which cannot be drawn in a 256 px content band at any density. This is
the width-driven case and it is what justifies having 480 in the ladder.

**The stub must carry `measuring...`**, because the schema numbers come from
SchemaExtractor and are not always ready; otherwise the door hides the fact that
the data is not yet there.

**Drawn on Main**, not as its own board -- the shell is drawn once in
ValidationPopout and GroupProfilePopout, and a third board for the same shell at
a different width is not worth an artboard.

**Artboards.** Main (draws it), TimeSlider, ExploreNotesList, DataPanelLoaded,
ExplorerLoading, ExplorerLargeGraph, ViewsMenu, InsightsWide.

**Direction.** Neutral on panel height; adds a capability that had nowhere to
live.

### POP-7 Run record Details: a 360 pop-out; the one-line record stays (rule)

**Decision.** The one-line run record stays exactly as drawn -- dimmed, method,
non-default parameters, scope -- and its chevron opens a 360 pop-out headed with
the result's own title: weight attribute and its meaning, direction, every
parameter including seed and sample size, scope with counts, timestamp,
duration, the algorithms package version, and the copy control whose menu holds
Copy as JSON, Copy as command and Copy methods text. **Nothing is removed from
the panel**; what changes is that opening Details no longer pushes the shape
body and the action block off screen.

**Rationale.** Floor 3 already draws the line exactly where 6.11 would: the
one-line record is on the floor and never moves, the full record is explicitly
permitted behind Details. It is provenance, read once per result, never
scrubbed, about one member of the results list -- both branches of question 2
say pop-out. 360 because the values are long and a wrapped key-value list at
224 px is unreadable.

**The sentence that must survive verbatim:** the run record is never placed
behind an info circle, because a pop-out is disclosure by tier and a circle is
disclosure by explanation. That is precedence rule 2 of this document.

**Artboards.** ExplorerAfterCard, CategoryTable, ExplorerExpert, AnalyzeSweep,
CompareSplit, ExplorerLargeGraph.

**Direction.** Neutral on resident content; removes the push-down.

### POP-8 All statistics: a 360 pop-out whose stub reports the computing state (screen)

**Decision.** All statistics becomes one 32 px row whose trailing slot reports
state: `Computing 3 of 7` while the passes run, the count when idle, the name
primary once values exist. The pop-out holds the seven rows with their per-row
caveats (`estimated from 100 samples`, `at least 14 (two sweeps)`), the footer,
and the hover-revealed header icons with their full-text twins in the overflow.

**The stub clause is mandatory, not decorative.** 6.2 guarantees that rows still
computing read "Computing..." so an absent row unambiguously means zero. Behind
a door there is no row to say it. Without the stub this proposal would quietly
break that guarantee, which is why 6.11 gains the general clause: **a door over
lazily computed content reports the computation on its stub.**

**Artboards.** AnalyzePanel, IpadPanel.

**Direction.** Removes 117 px.

### POP-9 Selection statistics: pop out at 360 when a third column exists (screen)

**Decision.** Selection statistics stays **inline** in its two-column form,
unchanged. When a pin is active, or above the selection cap, the third column
(A, B, Graph, plus Delta) does not fit the 256 px band and the section becomes a
stub row opening a 360 pop-out with the Export CSV of attribute, A, B, graph,
difference.

**The attribute profile does NOT pop out. Cut, on floor 7.** See A3, cut 1. Nine
rows of the user's own attribute names and top values is a scan surface, and
POP-10 establishes that a scan surface made of floor-7 data does not go behind a
door. It stays inline on FilterBuilderExpert.

**Coupling to draw.** 5.4's pin feature is what produces the third column, so
the two are drawn together on MultiSelection.

**Artboards.** MultiSelection, ExplorePanel, FilterBuilderExpert, DataTableDrawer.

**Direction.** Removes about 60 px conditionally; the cut declines a further
removal that would have breached the floor.

### POP-10 Notes list: NO pop-out for the list, YES for the header filter and the editor (screen)

**Decision.** A deliberate no, so the rule is visibly capable of saying no. At
444 px the notes list is the second largest consumer in the set and it fails
question 2 on both branches: the note text is the user's own data (floor 7) and
the list exists to be scanned and clicked through, which 6.2 already names as a
thing that is never a dialog. Hiding note text behind a door would mean opening
fourteen doors to find the note you half remember.

What does move: the four filter chips, the tag picker and the sort control
collapse into one filter door in the section header (280 pop-out); the search
input stays inline; the header keeps `Notes 14` or `8 of 14 visible`. The note
rows are unchanged. A row's edit glyph opens a 280 note editor pop-out anchored
to the row rather than growing the row in place.

**Spec text.** The reasoning gets one home, in 5.7, and is recorded in 6.11's
worked examples as the case where **size alone is never a trigger**.

**Artboards.** ExploreNotesList; ExplorerNotes, InspectorGenomics and
MultiSelection keep their inspector Notes sections inline and unchanged.

**Direction.** Removes about 64 px. Declines a 380 px removal on principle.

### POP-11 Import policies: NO pop-out, compact them instead (screen)

**Decision.** The second deliberate no. The three applied policies are
provenance with a Change link whose home is the Import options dialog, and a
pop-out would give a control a second home, which 6.4 and the one-behaviour-
one-home discipline both refuse. The real fix is already written in the spec's
own Row types in Data paragraph and has not been applied: a policy is a noun and
a value in one field, not a sentence. `Repeats` holding `Combine + sum`,
`Unknown` holding `Create`, `Self-loops` holding `Keep`, each with its full
sentence on its info circle and its Change link in the trailing slot, each drawn
only where it deviates from the default per Rule 7a.

**Spec text.** No new rule. One line in 6.11's worked examples recording that
import policies were considered and rejected, because **a control whose home is
a dialog may not acquire a second home as a pop-out.** This is the proposal that
keeps 6.11 from becoming a licence to pop everything out.

**Artboards.** DataPanelLoaded; ImportOptions unchanged.

**Direction.** Removes about 40 px with no new mechanism.

### POP-12 The remaining candidates, decided (rule)

So no future drafter re-derives these one at a time. Recorded as a table in
6.11.

**Pop-out, yes.** (a) The style layer Categories `Values (N)` table of value to
swatch, shape or line style with per-row overrides, capped at 12: 280, from the
encodable row it belongs to. (b) Compare two metrics, the X and Y scatter with a
log toggle and brushing that selects nodes: 480, 3a because brushing is done
against the canvas. (c) The sweep run table (value, headline statistic,
duration) with its sparkline and pairwise agreement: 480 from the Sweep summary
card. (d) Neighborhood expansion type checkboxes with their counts and the
"Adds about 37 nodes" preview: already described in the spec as opened by the
split button's arrow, so this names an existing pop-out rather than adding one.
(e) The rich text label editor, gradient editor, colour picker and pattern
editor: already popouts in 5.3 Style, now inheriting 6.11's shell, pin and
nesting rules -- the pattern editor is the precedent 6.11 generalises.

**Cut, and reclassified as a menu.** Selection sets. See A3, cut 2: five verbs
per row is a row context menu, matching SAV-7's row treatment, not a pop-out. A
pop-out is for parameters and reports; a menu is for verbs.

**Stays a menu.** The Data table column header menu, the History row menu, the
Role and Type chip menus in the Import grid, the Views menu, every context menu.
One choice from a closed list is a menu, which is what Figma keeps even for
blend mode, with a live canvas preview on hover
(https://help.figma.com/hc/en-us/articles/360040667874-Apply-blend-modes-to-layers-fills-and-effects).

**Stays inline.** Cleaning steps and History (scan lists whose before and after
already render in the inspector); the Insights strip (the novice route, keeps
its sentences); **the canvas legend** (floor 5, and it travels inside exported
images).

**The tightest case to draw once and confirm:** (b) and (c) both want 480 in the
inspector region, which at 1440 leaves 344 px of canvas.

**Direction.** Neutral. An audit, not a change.

### POP-13 Register, keyboard and touch deltas (rule)

**Decision.** (a) REGISTER-1.5's settings glyph object form `Time slider
settings (T)` loses its key chip; 5.6 binds T to toggling the slider and a
control may not print a binding it does not own. (b) **No new glyph is added**:
a door section keeps the register's existing closed right-pointing 12 px chevron
permanently and never renders the open form, which is how the panel skyline
still reads as an inventory; the opener carries the panel's selected-row fill
while its pop-out is open. (c) A hover-revealed opener is drawn resident on the
iPad boards, per RT-7's existing touch clause. (d) CommandPalette gains one row
per pop-out -- `Time slider settings`, `Validation report`, `Group profile`,
`Run record`, `Schema`, `All statistics`, `Filter expression` -- which is 6.4's
second route for each. **SettingsShortcuts and ShortcutsDialog gain no new
bindings.**

**Spec text.** 5.6 gains the pop-out keyboard clauses of POP-0. 5.2 gains the
narrow-screen sheet form.

**Precedence note.** ARTBOARD-CHANGES-1.5.md may carry the old settings title;
per REGISTER-1.5's own precedence note the register wins and the checklist entry
is the thing to correct.

**Artboards.** TimeSlider, CommandPalette, SettingsShortcuts, ShortcutsDialog,
IpadPanel, IpadInspector.

**Direction.** Adds seven palette rows, which are not visible until the palette
is open. Neutral on panels.

---

## E. Track 3 -- Save and load

Track IDs renumbered SAV-n from the track's T3-n. Twelve kinds of user-made
thing exist in the design and only one, the view bookmark, has a complete set in
a visible place. The style template -- the kind the user noticed -- is the worst
case: Import and Export live in a panel header overflow that every artboard
draws closed, and there is no save verb at all.

### SAV-1 The library section is the treatment: load is a list, save is a plus on its header (rule)

**Decision.** Every kind a user creates and would expect to keep gets a
resident RT-8 **library section** in the panel that owns the kind. Its rows are
RT-6, and **clicking a row applies the entry -- that is load, and it needs no
verb.** Its header carries a resident 24 px `+` in the trailing slot titled
`Save as <kind>...`, and on section hover an overflow whose two text items are
`Import <kind>...` and `Export <kind> (JSON)`.

**Frequency decides the shape.** Across one session an analyst saves at most one
style and one recipe and applies a bookmark, a set or a filter dozens of times.
Resident pixels belong to the list; the rare verb gets one glyph on that list's
header.

**Rejected alternatives, on the record.** (a) An icon pair in the panel header
fails twice: REGISTER-1.5 section 1.6 states there is no save glyph and no
import glyph and that both verbs keep their text, and 6.8 caps the panel header
at three icons in a fixed order whose slots Style has already spent. (b) A named
tier 1 row costs 32 px of the most expensive real estate in the app, on panels
that just cut 42 per cent of their words, for a verb used once a session. (c)
The header overflow is the current answer and is what produced this complaint.

**The one amendment this needs, and its limit.** RT-7's hover split hides
affordances that act. That split exists for second-visit verbs -- copy, export,
recompute, edit, delete. **The `+` that adds to a library section is resident
whether the section is empty or full**, because saving your first style is a
first-visit verb and 6.8 already says a control a traced novice path enters
through keeps its visible form. Every other affordance still hides until hover.

**Empty libraries cost 33 px, not 165.** Rule 7c's one-row empty form already
applies: dimmed name, one `+`, no content rows, no `Not set`, no empty-state
sentence. That is what makes five new sections affordable.

**Spec text.** A "Saved things" paragraph in 5.3 before the per-activity lists;
6.9 Rule 7b takes the one-clause amendment above; 6.8's Panel header row gains
"no saved-thing verb may live in the panel header or its overflow -- it lives on
the section that lists the kind."

**Supersedes.** Revision 1.5 decision IK-6, in part: the half that moved Style's
Import and Export into the panel header overflow is reversed. The rest of IK-6
-- statistics copy, export and recompute becoming section-header verbs -- is
untouched and is the precedent being extended.

**Artboards.** StylePanel, StyleDiverging, ExplorePanel, Main,
FilterBuilderExpert, AnalyzePanel, PresentPanel, MultiSelection, TimeSlider,
ExplorerExpert, DataPanelLoaded, HistoryPopover; new board `StyleLibrary`.

**Direction.** Adds up to five section headers at 33 px each, on the panels that
own the kinds. Offset by deleting Style's preset chip row and Present's
duplicate recipe row.

### SAV-2 Three verbs, one destination each; `Load` is retired (rule)

**Decision.** As A5. `Save as <kind>...` creates; `Import <kind>...` reads a
file into the library; `Export <kind> (JSON)` writes one entry to a file; apply
is the row click. The ellipsis is load-bearing: it means a dialog that will ask
for a name.

**Normalisations.** Style gains `Save as style...`. `Export analysis recipe
(JSON)` becomes `Export recipe (JSON)`. `Import and replay` becomes `Import
recipe...`, and the imported row is run by clicking it. `Save selection as
set...` keeps its longer form, because "selection" names the source and the
floor's scope clause wants it. Each of these keeps its text label wherever it
is a menu row -- REGISTER-1.5 section 1.6 lists import, open and save as
glyph-free -- while on a library section header `Save as <kind>...` is the
resident plus with that string as its title, which is an add-to-this-list
glyph rather than a save glyph (REGISTER-1.5 section 10.6).

**The plus's reuse must be documented.** The glyph on a library header is the
plus, `Save as style...` included, because the verb adds an entry to the list
that header owns; the artboards draw the plus there on all ten kinds. The
bookmark is not extended and keeps "save a view, set, recipe or subgraph"
where it is drawn inline in a selection action cluster. On StyleLibrary the
plus serves two verbs on one board -- `Add a style layer` on the Layers
header, `Save as style...` on the Styles header -- which requires an entry in
REGISTER section 8, because an undocumented reuse is a defect by that file's
own rule.

**Cross-app precedent.** VS Code names its pair Export Profile / Import Profile,
not Save/Load
(https://github.com/microsoft/vscode-docs/blob/main/docs/configure/profiles.md);
Cytoscape names its style round-trip Import Styles from File / Export Styles to
File (https://manual.cytoscape.org/en/stable/Styles.html).

**Spec text.** 6.3 gains a "Saved-thing verbs" sub-rule. Section 3's Data export
row is amended per A5. The kind nouns join the register: style, filter,
subgraph, set, view, recipe, pattern, formula, report, mapping.

**Artboards.** StylePanel, StyleDiverging, ExplorePanel, FilterBuilderExpert,
MultiSelection, DataTableDrawer, ContextMenu, PresentPanel, AnalyzePanel,
HistoryPopover, ViewsMenu, CommandPalette, Welcome.

**Direction.** Neutral. Renaming, and one word shorter on the recipe export.

### SAV-3 Say where a save goes; no dirty indicator (rule)

**Decision.** Every `Save as <kind>...` dialog carries a destination line under
the name field, 11 px dimmed: **`Saved in this browser on this computer. Export
a file to move it.`** Every library section header's info circle carries the
same sentence as its first line. Settings > Data management > Saved items gains
a storage line and a per-row origin. **The top bar is unchanged: no dirty
indicator, no saved/unsaved state.**

**Rationale.** "Save" is only honest with a destination. The answer is: this
browser's local storage on this machine. It survives closing the tab, closing
the dataset and opening a different file; it does not survive clearing site
data, and it does not travel to another machine or another person -- which is
the entire reason Export exists and why Export sits beside Save rather than a
menu away. Floor 4 already requires that a control state what it will do before
it does it, so this is a clarifying instance of an existing floor item and **not
an eighth floor item; the floor is seven and stays seven.**

**The risk this line exists to prevent.** Adding the word Save anywhere makes a
reader expect a document model and therefore a dirty dot. The destination line
is what prevents that reading and must ship in the same revision as the `+`, or
the confusion is worse than today.

**Artboards.** StylePanel, ExplorePanel, PresentPanel, AnalyzePanel, Settings;
new board `SavedItems`.

**Direction.** Adds 9 words per Save dialog and per library info circle. Neither
is resident panel text. Required by floor 4.

### SAV-4 Write the template / project line into section 11 (rule)

**Decision.** Section 11's final bullet is replaced: **a style template is how
to draw a graph; a project file is the graph.** Every kind under Saved items
stores settings that name attributes -- selectors, expressions, column names,
algorithm names, parameters, checklists. None stores nodes, edges, attribute
values, computed results or node positions. **Two carry names of data without
carrying data**, and are stated honestly rather than hidden: a saved subgraph
and a selection set hold node ids, and a bookmark holds a camera; both are bound
to the dataset that produced them and neither can reconstruct a graph.

**Rationale.** Twelve kinds are about to get save verbs and someone will
reasonably ask whether that is a project file arriving by instalments. It is
not, and the reason generalises the argument section 3 already accepted for
recipes ("a recipe stores steps, not data"). Cytoscape draws the identical line
in its own manual -- styles export "in a file separate from the session file"
(https://manual.cytoscape.org/en/stable/Styles.html) -- and Figma's split is the
same shape: autosave plus version history for the document, an explicit File >
Save local copy for the portable artifact
(https://help.figma.com/hc/en-us/articles/8403626871063-Save-a-local-copy-of-files).

**Section 12's project-files open question stays exactly as written.** This
strengthens the case for the deferral by showing how much is reachable without
it.

**Direction.** Neutral. Spec only, plus one info-circle line on SavedItems.

### SAV-5 Style gets a Styles library; the element's StyleTemplate is a documented subset (screen)

**Decision.** The preset chip row is deleted. In its place a tier 1 `Styles`
section (technical `Style templates`), RT-8 header with name, count, info circle
and a resident `+` titled `Save as style...`. Rows are RT-6 at 28 px: the five
built-ins first, dimmed, with a `built-in` trailing word; then the user's own,
with a relative date in the trailing slot; the active one carries the selected
background. Row hover reveals rename and delete on user rows only. Section
overflow: `Import style...`, `Export style (JSON)`, `Reset styles to defaults`.
Style's panel header overflow keeps only Expand all / Collapse all / Reset.

**The schema finding, verified in the repo, and it is the sharp part.**
`graphty-element/src/config/StyleTemplate.ts` is a strictObject of graph, layers,
data and behavior. `DataConfig` carries `knownFields` (nodeIdPath, edgeSrcIdPath,
weight and time paths) and `algorithms` (a list of algorithm names). `GraphStyle`
carries `viewMode` and a `background` discriminated union whose skybox member
holds inline `ImageData`. So a naive round-trip of the element's format would
let applying a colleague's style **silently rewrite this graph's column roles**,
**spend compute without an ask** (against principle 6), **override a view mode**
section 3 made cross-cutting and canvas-owned, and **ship a multi-megabyte image
inside a settings file**.

**Therefore the app writes and reads a named subset**, and the two genuinely
useful cross-cutting bits become explicit checkboxes in the Save dialog, **off
by default**: `Also save the column roles (id, source, target, weight, time)` and
`Also save which analyses to run on open`, each with its consequence in an info
circle. The skybox field is dropped on write with a one-line note. On apply, an
unticked knownFields or algorithms block in an imported file is ignored and
reported.

**A loose end this closes.** Settings > Data management > Saved items already
promises to list "presets", which today cannot exist because presets are
built-in and unsavable. Merging the built-ins and the user's styles into one
list makes that promise true.

**Spec text.** 5.3 Style tier 1's preset sentence becomes the Styles library;
the tier 3 sentence sending Import/Export to the panel header overflow is
deleted; a "What a style carries" paragraph is added. 5.8 registers that
StyleTemplate needs a documented app subset and a strict-mode-safe partial read.

**Supersedes.** DECISIONS-1.5 IK-6 in part, and ARTBOARD-CHANGES-1.5 items 1416
and 4478, which deleted the Style template row; those entries need superseding
notes rather than silent contradiction.

**Artboards.** StylePanel, StyleDiverging; new board `StyleLibrary`, which draws
the Save as style dialog over the panel with the two checkboxes and the
destination line.

**Direction.** Roughly neutral: adds a section header, deletes the preset chip
row.

### SAV-6 Apply reports what did not bind; a saved thing for another dataset is dimmed, not hidden (rule)

**Decision.** Applying a library entry always writes one line saying what did
not bind: `Applied Publication style. 2 of 5 layers matched nothing: they need
logFC and padj.` This is floor 2 extended to the apply path.

**And a carve-out in Rule 7c, narrow and written down.** Rule 7c says a section
the data cannot support does not render at all. Applied naively to library rows
that would hide a user's own saved subgraph because they have the wrong file
open -- which is exactly the disappearance being complained about, in a new
costume. **Floor 7 wins:** a library row for a saved thing that cannot apply to
the current dataset renders **dimmed with its reason in the title**, never
absent. On SavedItems those rows group under a dimmed `For graphs you do not
have open` header with a count.

**The carve-out's limit.** Only rows carrying a user-supplied name. Rule 7c is
unchanged everywhere else, and COMPACTION-1.6's defence of it stands.

**Spec text.** Floor item 2 gains "and, when a saved thing is applied, what in
it did not bind: the layers, rows, columns or ids that found nothing, named."
6.9 Rule 7c gains the carve-out. 5.3 gains a per-kind scope note: portable
(style, recipe, pattern, formula, report configuration, import mapping) versus
bound to the dataset that produced it (saved subgraph, selection set, view
bookmark, and any saved filter stored as an explicit member list).

**Artboards.** StylePanel, StyleDiverging, ExplorePanel, AnalyzePanel,
MultiSelection, StyleLibrary, SavedItems.

**Direction.** Adds 12 words when something did not bind, and nothing when
everything did -- Rule 7's corollary applies here as everywhere. Required by
floor 2.

### SAV-7 Overwrite is never implicit (rule)

**Decision.** Row verbs use the fixed application-wide triple with the
visibility slot empty: rename (pencil), empty, delete (trash), revealed on row
hover and resident on the two iPad boards. The full set is the row's context
menu, which is also the touch twin: Rename, Duplicate, Update from current,
Export JSON, Delete.

**`Save as <kind>...` always creates a new entry.** An ellipsis that quietly
replaces something is how people lose work. Replacing is `Update from current`
on that specific row, so the user points at what will be lost. If the user types
an existing name into the Save dialog, the primary button relabels to `Replace
"Publication style"` and the row's date is shown beside it -- floor 4 doing its
job.

**Delete gets a toast with Undo for 10 seconds and no confirmation dialog.**
5.1's rule is that any action undoable from the top bar gets no confirmation,
only a toast; a library delete is not undoable from the top bar, so read
strictly it would need a dialog. The toast-local undo is the better behaviour
and the **one-clause exception must be stated, not assumed**: it is not an entry
in the fifty-deep history store, and 5.1's undo scope does not grow.

**Artboards.** ExplorePanel, MultiSelection, StylePanel, AnalyzePanel,
PresentPanel, IpadPanel, IpadInspector, ContextMenu, StyleLibrary, SavedItems.

**Direction.** Neutral. Hover-revealed verbs on rows that already exist.

### SAV-8 Recipes: one creation point, one in-session list, both cold-start doors kept (screen)

**Decision.** Creation belongs where the steps are, which is History. A
`Recipes` library section goes directly under History in Analyze: resident, RT-8
header with count and a `+` titled `Save as recipe...`, rows showing name, step
count and date, click to replay on the current data, overflow holding Import and
Export. History's section actions lose `Save as recipe...` (now the `+` one
section down) and `Import and replay` (now `Import recipe...`), and keep Replay
all, Export history, Export as script, Copy as commands, Copy as methods text,
Clear history. Present deletes its duplicate `Save as recipe...` row and keeps
the renamed `Export recipe (JSON)`. **Welcome and Data tier 1 are unchanged**:
`Run a recipe...` is the cold-start route and NAV-11 rests on it.

**Rationale.** The recipe is the most thoroughly specified saved thing and its
verbs are the most scattered -- four panels for one artifact -- and yet
mid-session there is nowhere to see the list of recipes you have saved.
Principle 2 says one home per capability.

**The adjacency this costs, and the mitigation.** Present's recipe row sits
deliberately beside Pin to report and Generate report because a recipe is part
of the evidence story. Present's report sections checklist already includes
Methods and Analysis steps, which is the same content in the report, and the
recipe **file export** stays in Present.

**Artboards.** AnalyzePanel, HistoryPopover, PresentPanel; Welcome and
DataPanelLoaded unchanged.

**Direction.** Adds a 33 px section header to Analyze; removes one row from
Present and two from History's actions. Net about zero.

### SAV-9 The two kinds with no home at all: report configurations and formulas (screen)

**Decision.** Both are named in Settings > Data management > Saved items and
neither has a control anywhere in the panels. Both get the standard treatment.

`Saved reports` goes immediately above Present's report sections checklist; a
row click loads the configuration into the checklist and dialog fields. A report
configuration carries the sections checklist and its per-section options, the
title, the row cap, the Include done notes switch, the image export options and
the pinned-item slots **by kind** -- not the pinned items themselves, the notes,
the results, the image or the graph. Loading one onto a different graph produces
the same report shape over that graph's content and reports what it could not
fill.

`Formulas` goes under Columns in Data, below `Add computed attribute`; rows show
the formula name and its expression truncated at 11 px dimmed; a click adds the
computed column to the current dataset. A formula carries its name, its
`[name]`-grammar expression, its output type and its fill policy -- not the
computed values, which are recomputed on apply.

**Rationale.** A user producing a weekly report re-checks the checklist, re-sets
the row cap, re-picks the image scope and re-types the title every time. And a
computed attribute is authored in a dialog and attached to a column of the
current dataset, so an expression that took ten minutes to get right is gone the
moment the dataset closes, and the only way to carry it forward is to save an
entire recipe.

**Overlap with the recipe, stated rather than hidden.** The recipe already
serialises computed-attribute formulas, so two artifacts can now carry a
formula. That is acceptable: the recipe is the whole session as steps, the
formula is one reusable expression, and a recipe applies formulas as part of a
replay while the Formulas library applies one on demand.

**One flag against section 12.** A saved formula makes the `[name]` grammar an
exported artifact, which raises the cost of the JMESPath-versus-`[name]`
decision still open in section 12. Note it there.

**Artboards.** PresentPanel, DataPanelLoaded, CategoryTable.

**Direction.** Adds two 33 px section headers, one per panel, empty at 33 px
until used.

### SAV-10 Import mappings already save themselves and never say so (screen)

**Decision.** An `Import mappings` library section at the end of Data tier 2,
after Cleaning steps. Rows are one per remembered header signature, **named by
the file that created it** ("expression.tsv columns"), with the column count in
the trailing slot and the mapping summary in the title. Row hover gives rename
and delete; the context menu adds `Apply to current file` and `Export mapping
(JSON)`; the section overflow holds `Import mapping...`. **No `+` on the
header** -- the entry is created by the import, so creation stays implicit --
and instead the header's info circle carries `Mappings are remembered when you
import a file whose columns graphty has seen before.` The `Mapped as before...
Change` line's mapping name becomes a link into this row.

**Rationale, and it is the inverse of the user's complaint and the more serious
honesty failure.** 5.3 already says mappings are remembered per header
signature, so the app is saving something on the user's behalf, into the same
storage as everything else, with no list, no name, no delete and no export. A
user who mis-mapped a column once gets the wrong mapping applied silently on
every future file with those headers, and their only route out is a Change link
on a line they may not read. Meanwhile the mapping is the single most valuable
thing to share with a colleague who receives the same weekly export, and it is
the one thing that cannot be exported.

**A live question this exposes.** The header signature (sorted column names plus
delimiter) is a weaker key than the notes fingerprint, and two unrelated exports
with identical column names collide into one mapping. Naming the mapping after
its originating file makes the collision visible instead of silent, which is the
minimum fix; whether the signature needs strengthening belongs beside the
existing fingerprint question in section 12.

**Artboards.** DataPanelLoaded, ImportOptions, ImportRecognised, ImportLargeFile,
TableJoin.

**Direction.** Adds one 33 px section header to Data. Makes an existing silent
behaviour visible, which is the point.

### SAV-11 Cmd+S is unbound: point it at the honest answer (rule)

**Decision.** `Cmd/Ctrl+S` opens the command palette **scoped to Save**,
listing one `Save as <kind>...` row per saveable kind, with kinds that cannot
apply right now dimmed and reasoned. The app intercepts the browser default, and
the interception is listed as deliberate.

**Rationale.** Cmd+S appears nowhere in the spec and on no artboard. Every user
who wants to keep a style will press it, and today the browser answers with Save
Page As, which is both wrong and slightly alarming. Binding it to a project save
is off the table (sections 3 and 11). So bind it to the truth: it answers "where
is save" in one keystroke, it teaches the vocabulary of SAV-2, and **it says
without a sentence that there is no one thing to save** -- which is the
mitigation for the document-model expectation SAV-3 also guards against.

Principle 3 requires every capability to be reachable three ways, so the palette
index needs these entries regardless; the binding is a cheap addition once they
exist.

**Artboards.** CommandPalette (the scoped state, or at minimum the seven `Save
as...` rows and matching `Apply style: ...` rows), ShortcutsDialog,
SettingsShortcuts.

**Direction.** Neutral on panels. One row in two shortcut tables.

### SAV-12 Settings > Data management becomes the housekeeping list (screen)

**Decision.** Two lists of the same items is only confusing if they have the
same job, so separate them explicitly. **The panel section is the working list**
-- one kind, in the context where it is used, verbs apply / save / rename /
update / delete. **Settings > Data management > Saved items is the housekeeping
list** -- every kind at once, with storage used, a per-row origin, the group
whose dataset is not open, and bulk delete. Both act on the same entries.

**The bundle export is REJECTED for 1.7.** Track 3 proposed `Export all saved
items (JSON)` and `Import saved items...`. Track 3's own note is the reason to
decline: it is "one step from looking like a project file", and section 11
defers project files while section 12 holds that decision open. A whole-library
bundle is exactly the artifact whose existence pre-empts that decision, and its
collision-resolution UI (Keep both / Replace / Skip) is new interaction surface
the section 9 artboard list does not cover. **Recorded as an input to the
project-file question in section 12, not shipped here.**

**Artboards.** Settings; new board `SavedItems`.

**Direction.** Adds a Settings screen. Off-panel, and it replaces a promise the
Settings text already makes.

---

## F. Track 4 -- Analysis as style

Track IDs renumbered STY-n from the track's T4-n.

### STY-1 The run becomes the object; the result card and the style layer become two faces of it (rule)

**Decision.** A **run** is the object the run record already describes: an
algorithm, its parameters, its seed, its scope, its timestamp and duration, the
engine version, and the fields it wrote into
`algorithmResults.<namespace>.<type>.<field>`. Every route makes one and only
one, and History has held one row per run since 5.1. This revision makes the run
**addressable** and gives it two faces.

- **The result face** is the evidence: the reading, the caveats line, the
  one-line run record and the shape body, in the Results tab and the inspector's
  Algorithm result view.
- **The style face** is the picture: one style layer whose encoding rows read
  the run's fields, in Style's Layers list and the Style layer inspector.

Neither face owns the run. Selecting either selects the run, and Pin to report,
Compare with..., Copy as command, Copy methods text, the Data table column, the
Explore attribute entry and the History row all address the run rather than a
face.

**Three lists, three questions, no overlap:** Analyze Run is what to compute,
Analyze Results is what has been computed, Style Layers is what is drawn.

**Why this is needed.** The layer's binding reads a path that names the
algorithm but not its parameters, its seed or its scope, so MCL at granularity
2.5 and MCL at 3.0 are the same path and the layer cannot tell you which one it
is drawing. The user's sentence -- "MCL, granularity 2.5 shows the colors for
groups" -- names one thing, and the design has to have one thing to name.

**One reading and one run record per run per screen.** Where both faces could
render them, the inspector renders them in full and the panel card collapses to
title, state and headline, which is the rule 1.5 already set.

**Amendment to the History row rule.** "Opens the step's home panel" now has two
candidate homes: a run opens Analyze at its card, an encoding change opens Style
with its layer selected. It still never re-runs anything.

**Word hygiene.** "Result" becomes ambiguous in five places in 5.3 and 5.4 where
it currently means the card; those occurrences must be re-read as the run or as
the result face.

**Artboards.** ExplorerAfterCard, CategoryTable, StylePanel.

**Direction.** Neutral to slightly removing: the card's action row shrinks.

### STY-2 Automatic, once per run -- with three limits (rule)

**Decision.** A run applies its shape's primary action on first completion,
identically from every route. The design already chose automatic in 1.5 and the
user's phrasing assumes it; what was missing were the limits.

1. **Once.** On first completion and never again. A card re-opened, re-selected,
   expanded from its collapsed form or restored from a History position does not
   repaint.
2. **Not over a hand.** Suppressed when a user-authored layer already drives the
   channel, and suppressed for the same reason when the user has since re-bound
   that channel by hand. In the suppressed case the card shows the un-applied
   primary action, its title names the layer that holds the channel, and the
   reading omits its closing clause.
3. **One per batch.** A batch that emits several runs into one channel -- Run all
   node rankings, a group's Run all (N), a sweep, Replay all -- applies the first
   and lands the rest un-applied; the batch's own summary card carries the
   Encode as style that replaces. **Six runs never paint six times.**

**No preference for turning this off.** A switch would ship two products with
two pictures, and the escape already exists twice: the application is one
undoable step separate from the result, and the layer can be deleted while the
run stays.

**Boards that draw the limits.** ExplorerExpert is the canonical drawing of
suppression -- its Groups card keeps the full `Encode as style` button because
node color is already held by the user's own layer -- and its file comment says
so, so it reads as the rule rather than as an inconsistency with
ExplorerAfterCard. AnalyzeSweep draws the batch limit: three per-value cards
land un-applied and the Sweep summary card carries the applier.

**Artboards.** ExplorerExpert, AnalyzeSweep.

**Direction.** Neutral. Rules, not rows.

### STY-3 What an analysis-backed layer carries (screen + rule) -- AMENDED

**Decision.** A style layer created by a run is an ordinary style layer with one
section more, `Source`, at tier 1 between the header and the encoding rows, in
this fixed order:

- **the reading**, RT-10, resident and in full. Floor 1, and it may not move
  into a collapsible section: the layer is where a parameter is turned, so the
  sentence that changes when it is turned is on screen where it turns;
- **the caveats line**, RT-10, drawn only when there is a departure to name;
- **the run record**, one dimmed line with its Details chevron (POP-7);
- **the deviating parameters only**, as live RT-1 rows -- see the amendment;
- **`Open result`**, a link that selects the run's result face.

**The amendment, and it is what makes this revision affordable.** Track 4
proposed rendering the run's whole parameter set inline. Instead: **Rule 7a
already decides this. A parameter at its default is not drawn.** The layer's
resident parameter rows are the ones that deviate -- typically the one the run
name carries -- and everything else lives behind the layer row's gear as POP-5's
280 pop-out, with the gear drawn in the primary colour whenever a hidden
parameter deviates.

**Measured, not estimated.** Rendered privately at a 280 px column width, the
amended Source is **164 px**: a 33 px RT-8 header plus a 131 px body (the
reading wrapping to two lines at 36, the run record at 20, one deviating
parameter row at 24, Open result, and the section's 8 px paddings and gaps). The
unamended form adds 32 px per further parameter row, so an algorithm exposing
five parameters would have cost 292 px. This is track 2 paying for track 4, and
it is the cross-track synthesis of the revision.

**The layer row.** RT-6 at 28 px: the analyze glyph in the type slot, whose
title reads `From Groups (Markov clustering). Open the result`; the run name;
and, in the trailing value, **the run's headline in place of the match count**
wherever the selector matches everything -- `6` for a Community run, `0 to 0.41`
for a node metric. State reports resident under RT-7's hover split, so Stale,
Running and Failed draw without hover.

**The run name.** One string names a run everywhere -- result card title, layer
row, legend block, History row, Compare label chip, and every string that leaves
the app. It is the card's plain name alone while it is the only run of that
card, and gains the differing parameter in parentheses as soon as a sibling
exists: `Groups`, then `Groups (granularity 2.5)`. Renaming the layer replaces
the layer's copy and only the layer's copy; a name a person typed is floor 7 and
never re-derives.

**One Source entry per run the layer reads.** A layer later bound to a second
run carries a second entry in binding order; the glyph on the layer row means at
least one binding is analysis-backed.

**The worked example, MCL at granularity 2.5 on the 318-node ovarian dataset.**
Layer row: `Groups (granularity 2.5)` with `6` in the trailing value. Inspector:
the name; `Markov clustering (MCL)` dimmed; `6 groups found. The largest has 118
members. Colors show groups.`; **no caveats line**, because the run was exact,
unfiltered and on the whole visible graph; `MCL, granularity 2.5` with its
Details chevron; one Granularity slider at 2.5; `Open result`; then Color
holding the filled `Groups` chip and the Okabe-Ito palette, with `Values (6)`
collapsed. **No `Which nodes` row**, because the selector is every node and Rule
7a deletes a control at its default.

**The one tier rule this breaks, named.** Floor 1 forbids Source from being
collapsed by default, so Source is the one tier 1 section in the layer inspector
that cannot follow 6.5's remembered-expansion memory.

**Artboards.** StylePanel, CategoryTable; new board `StyleFromAnalysis`.

**Direction.** **Adds 164 px per analysis-backed layer** (measured), all of it
floor items or the one parameter that is not at its default. This is the largest
single addition in the revision and it is the one the budget in section B is
measured against.

### STY-4 What paints, decided mechanically per shape (rule)

**Decision.** Each shape declares **what it writes onto the drawn graph**, and
that declaration -- not the shape's name and not the drafter's taste -- decides
whether a run paints and what kind of layer it makes. The table is in A4. The
rule in one sentence: **a run paints when its result is a property of the
elements that are drawn, and what it writes decides which kind of layer.**

A pair list scores pairs that are not edges, a fact is one scalar about the whole
graph, and a time series is about time, so none has anything to bind a channel
to. `Show as dashed edges` on a pair list stays a canvas overlay; `Add as edges`
stays an undoable Cleaning step, after which ordinary styling applies to real
edges.

**Highlight layers are named as layers because they already behave as layers:**
the path highlight persists, dims the rest and renders a legend block --
ExplorerExpert's legend already carries a `Find a path (shortest path) / Not on
path (dimmed) / Selected` block. Naming it puts its off switch in one place,
gives it the run name every other run has, and lets floor 5 hold for it.
**Exactly one highlight layer exists at a time**; a second path result replaces
the first, which is what the shape's existing Clear already implies. Edge set's
`Dim the rest` becomes a property of the highlight layer rather than a separate
verb.

**The element agrees.** `SuggestedStyles` carries a category enum -- node-metric,
edge-metric, grouping, path, hierarchy -- which is that split, and an algorithm
whose result paints nothing simply has no suggestedStyles method. The category
is descriptive and derived from writes, not the other way round.

**One mismatch found and fixed in 5.8.** FloydWarshallAlgorithm declares category
`path` while colouring a per-node eccentricity, against a spec shape of Fact.
Resolution: Farthest apart stays a Fact whose supporting nodes are the centers,
and the per-node eccentricity it already computes is exposed as an ordinary node
metric in the Not computed yet group, so it can be encoded like any other metric
without a Fact card pretending to paint.

**Two claimants for the top of the stack, decided.** Compare mode's diff overlay
wins; the highlight layer is disabled with its reason shown.

**Artboards.** ExplorerExpert, CategoryTable (comments and one action-row
annotation).

**Direction.** Adds a 28 px layer row while a highlight is active; removes a
scattered Clear verb.

### STY-5 The Results tab stays; the encoding controls leave it; delete gets two verbs (rule)

**Decision.** As A4, with the corrected arithmetic. Results narrows to the list
of runs and the home of the evidence. On a card whose run paints, the applied
form is the **resident state swatch plus the layer name**, and `Change encoding`
opens Style with that layer selected; the un-applied form keeps the full `Encode
as style` button. No card holds a palette, a scale or a domain.

**Two delete verbs, both stated, both undoable, both by toast.**

- `Delete layer` removes the picture and leaves the run; the card reverts to its
  un-applied form.
- `Remove result` deletes the run **and every layer that reads it, and names the
  count before the act**: `Removed Groups (granularity 2.5). Removes 1 style
  layer. Undo` -- floor 4. A layer that reads two runs survives the removal of
  one, with that binding's Source entry replaced by the row's disabled form and
  its reason.

**The thing this changes that is genuinely new.** `Change encoding` becomes a
cross-panel link, which is the first time a result card sends the user to
another activity to finish an act it started. That is deliberate: encoding has
one home.

**The floor across the two faces**, written into the spec as a table so a later
pass cannot lose half of it:

| Floor item | Result face | Style face |
|---|---|---|
| 1, the reading | always, first, in full | always, first, in full, on an analysis-backed layer |
| 2, every departure named | whenever there is one | whenever there is one; a sampled or partial run that drives a channel says so where the channel is edited |
| 3, the one-line run record | always, with Details | always, with Details |
| 4, before it does it | Run's three estimate bands | Re-run's three estimate bands; the layer count inside Remove result |
| 5, the legend line | not applicable | unchanged; the block title is the run name |
| 6, names | both names per 6.3 | the run name, or the typed name once renamed |
| 7, the user's own data | ids, labels, values | a renamed layer never re-derives |

**Artboards.** ExplorerAfterCard, CategoryTable, AnalyzePanel (no change to its
empty Results tab).

**Direction.** **Removes** about 24 px per applied card and adds four words to
one toast.

### STY-6 Re-running from Style: live parameter, Analyze's cost bands, replace in place (rule)

**Decision.** A parameter row in a layer's Source is **live**: changing it
re-runs the algorithm and repaints this layer. Same off-thread queue, same
progress row, same history entry, same cost model as a run started in Analyze;
only the entry point differs.

**Turning the value.** A scrub does not run. On release, on Enter or on blur the
layer goes dirty: the canvas keeps the completed run's picture, the field shows
the new value at value colour with a 12 px reset x (Rule 7a's deviation form),
and the gate appears beneath. **Nothing on the canvas ever shows a
half-computed state.**

**The cost gate is Analyze's, in the same three bands**, because it is the same
run. Under 2 s it starts on release with no button and no confirm, which is what
lets a granularity be turned rather than submitted. From 2 s to the ask limit it
is one line and two verbs -- `Granularity 3.0 takes about 8 s. Colors still show
granularity 2.5. Run and use it / Cancel` -- which is **the construction
StyleDiverging already draws** for a metric chosen before it has been run
(`Bridges takes about 40 s. Size still shows Significance (padj).`), so one gate
has one form wherever a style edit implies a computation. Above the ask limit the
estimate moves onto the verb; above the warn limit the section carries the
section 3 warning line.

**While it runs**, Source shows `Computing Groups (Markov clustering)... 42%
Cancel`, the layer row shows Running resident, the canvas keeps the previous
colours, and the status bar mirrors the run then the restyle -- two phases, two
strings, both already specified, and never a third.

**Replace in place.** A re-run from a Source row replaces this run and repaints
this layer: same stack position, same palette, same identity; the run name
re-derives unless it was renamed; the result card is replaced rather than added.
One history entry: `Changed Groups granularity 2.5 to 3.0`. **This deliberately
inverts the Analyze rule that a rerun with different parameters adds a card**,
and the inversion must be written as an exception or the two sentences
contradict each other. A parameter row inside an object edits that object; Run
and `Run again with changes` are the verbs that make a new one, and Run as sweep
exists for holding 2.5 and 3.0 side by side.

**Two consequences stated rather than absorbed.** Per-value colour overrides are
dropped when the re-run changes the value set, because a group id is not stable
across granularities; the toast says so and Undo restores them. Consecutive
re-runs of the same parameter on the same layer **coalesce into one history
entry** while that layer stays selected and nothing else intervenes, so turning
a slider through five values does not evict a data mutation from a fifty-deep
store.

**One thing to reconcile.** Above the large-graph threshold the existing rule
already batches inspector style edits behind an Apply button, and a Source edit
now batches a run and then a restyle. The Apply button and the `Run and use it`
verb must become **one gate on that path**, not two buttons in sequence.

**Artboards.** StyleDiverging (its existing gate relabelled in a comment as the
same construction reached from the other direction); new board
`StyleFromAnalysis` draws the mid-edit state with the canvas still showing the
2.5 colours.

**Direction.** Adds 11 words while a re-run is pending and nothing at rest.
Floor 4.

### STY-7 The resting Analyze panel: this subtracts, and one addition is refused (rule)

**Decision.** The resting Run tab is unchanged: the scope line when it is not
the whole visible graph, the cards already run, a Suggested group of three to
five, and one `+ Analysis` row. **The only change is a subtraction** -- a card
whose run painted loses its encoding controls to the resident swatch and a link.
1.6's compaction of that action row becomes the rule rather than one board's
decision.

**One addition considered and refused, on the record.** Naming the channel a
suggested card will paint -- `Groups -> colors` -- is a fact about what a
control will do, which floor 4 protects. It is refused because **the reading's
closing clause already states it at the only moment it can be checked**
("Colors now show groups"), and a channel word on five resting cards is Rule 8's
explanation of a thing the next click demonstrates. The refusal is recorded so a
later pass does not re-litigate it as an oversight.

**The two tabs sharpen rather than move.** Run is what to compute. Results is
what has been computed. Neither is where a picture is edited, and that is the
sentence that keeps Analyze from growing a style panel inside it.

**The residual tension, unresolved by design.** A novice who now finds the
picture in Style has one more reason never to open the Analyze catalogue. The
mitigation is unchanged -- the Insights strip, `+ Analysis`, the picker, the
palette -- and section 12's "Discovery loss in Analyze" check still applies as
written.

**Artboards.** AnalyzePanel, ExplorerAfterCard (comments).

**Direction.** Removes. The Analyze panel's word count falls slightly.

### STY-8 Migration: seven breaks, and where the source lives in StyleTemplate (rule)

**Decision.** A style layer has meant one thing since revision 1.0 -- a selector
plus encodings, authored by a person, portable. Some layers now carry a run.
Seven consequences, each with its fix.

1. **Export stops round-tripping, and already fails today.** A calculatedStyle's
   inputs name `algorithmResults.<ns>.<type>.<field>` and carry no parameters, so
   an exported analysis-backed layer imported onto another dataset binds to
   whatever run shares that path, or to nothing, and paints silently wrong
   either way. **Fix, verified against the schema:** a `source` object --
   algorithm key, parameters, seed, scope descriptor -- carried under
   `metadata.source` on the **layer**, because `StyleLayer` is a strictObject
   that an element built before this change would reject outright, while
   `StyleLayerMetadata` is `.loose()` and passes unknown keys through.
   `TemplateMetadata` is also strict, so a template-level source is not an
   option either. **Import has three defined outcomes**: the run exists and the
   layer binds; the run does not exist but can be run, and the layer imports with
   its Source gate showing the estimate under the same three bands; it cannot run
   on this data, and the layer imports **disabled with the reason in its
   tooltip** rather than being dropped, because a silently missing layer is
   worse than a disabled one.
2. **Order no longer fully determines the picture**, since a layer can be stale,
   running or failed. Fix: state reports resident on the layer row, and the
   canvas holds the last good picture until a re-run completes.
3. **Delete has two meanings.** Fix: STY-5's two verbs.
4. **Undo depth.** Fix: STY-6's coalescing.
5. **Two claimants for a re-run.** Analyze's `Run again with changes` and
   Style's Source rows both re-run one algorithm, which reads as a principle 2
   violation. It is not: the parameters of a run have one home, the run's
   Source, and it renders on whichever face is on screen -- the way Cleaning
   steps and History are two filtered views of one store. The verbs stay
   distinguished by scope: Source edits this run, `Run again with changes` makes
   a new one.
6. **A generated name over a typed one.** A renamed layer never re-derives; the
   run name then survives in the run record line, which is where floor 3 puts it.
7. **Compare.** Runs in Compare are namespaced `algorithmResults.A.*` and
   `algorithmResults.B.*`. A layer whose source is one half carries the half in
   its name (`Groups (A)`) and, when Compare exits, is disabled with its reason
   rather than repainting the merged view.

**5.8 additions**, all carrying the Coming tag in the mockups: the layer source
binding and its Source section; `metadata.source` in StyleTemplate v1 and the
three import outcomes; re-run from a layer with the shared cost gate; highlight
layers in the Layers list; and the FloydWarshall category mismatch.

**Section 12 addition.** A layer that carries an algorithm and its parameters
and a recipe that carries an ordered history are now two artifacts holding the
same kind of thing, and the next phase's project file carries both. Is source in
the style JSON right, or is an analysis-backed layer a one-step recipe wearing a
style's clothes? Default: keep source as an optional metadata block on the
layer, and let the recipe stay the ordered-history artifact.

**Artboards.** StyleDiverging, StylePanel (comments recording the export case
and the three import outcomes).

**Direction.** Neutral on screen; a disabled imported layer carries its reason,
which is floor 4.

---

## G. Track 5 -- The canvas toolbar

Track IDs renumbered TB-n from the track's T5-n. The 5.6 navigation cluster
rotates 90 degrees and moves to the bottom centre of the canvas rect.

### TB-1 The navigation cluster becomes a bottom-centre canvas toolbar (rule + screen)

**Decision.** The vertical 56 px cluster at the canvas's left edge is deleted
and its contents become one horizontal floating bar centred on the live canvas
rect. Order, left to right, by how long the effect lasts: **[2D | 3D]
segmented** (5 toggles it); divider; **Zoom out (-), Zoom in (=), Zoom to fit
(0), Zoom to selection (F)**; divider; **Views** (cube plus an up-caret, opening
the 5.6 menu upward).

Two deliberate order changes from the vertical stack: the segmented control
keeps its position at the head, and **Zoom out precedes Zoom in**, because
horizontally magnitude should increase rightward -- vertically, in-above-out was
already correct.

**The item set is fixed.** Nothing appears or disappears with selection or
state, because a centred container that changes width moves every item under the
pointer. Zoom to selection is therefore permanently drawn and merely disables,
with the register's exact disabled title `Zoom to selection (F). Select
something first` -- floor 4, the reason a disabled control is disabled. The
Graph / Table segmented control stays at top centre and never enters the bar
(A1).

**Rationale.** The user's reason is aesthetic and it is a real one: a control in
the optical centre of the bottom edge reads as the viewer's own instrument,
while a 56 px column stuck to the left edge above the minimap reads as leftover
chrome. Figma's reason was space and reach -- moving the toolbar to the bottom
"frees up more canvas space" and puts tools "closer to where your hands
naturally rest", with muscle-memory parity with FigJam
(https://www.figma.com/blog/making-the-move-to-ui3-a-guide-to-figmas-next-chapter/).
The grouping logic is Figma's: modal tools, then the mode control, then one-shot
actions, then the menu
(https://help.figma.com/hc/en-us/articles/360041064174). And the resulting
composition -- minimap left, toolbar centre, legend right, one baseline -- is
exactly tldraw's bottom zone (https://tldraw.dev/sdk-features/ui-components),
which is why it reads as designed rather than dropped in.

**6.8 already sanctions it**: Toolbar is one of the five icon homes, always
visible, max none, order as laid out, acting on the surface.

**Spec text.** 5.6's Navigation cluster paragraph becomes the Canvas toolbar
paragraph, with the contents, the fixed-item-set sentence, and tooltips opening
upward. Every later occurrence of "navigation cluster" is renamed (5.1 overlays,
5.1 minimap note, 5.2, 5.6 zoom percentage, 5.8, 7.2). 5.1's ASCII sketch moves
`[toolbar]` between `[minimap]` and `[legend]`.

**One comment to re-point, not delete.** InsightsWide's comment justifies the
deleted status-bar 3D chip by pointing at "the navigation cluster"; that
sentence must be re-pointed or the deletion loses its justification.

**Artboards.** All 36 boards that draw the cluster. The swap is mechanical and
should be done by one script in `canvas/tmp`, the way the 1.5 register pass was;
only DataTableDrawer, TimeSlider, CompareSplit, ViewsMenu, IpadPanel and
IpadInspector need hand attention afterwards. **CompareSplit keeps one toolbar**,
centred on the full two-view canvas, because its views are linked.

**Direction.** Neutral on words. Removes a 56 x 160 column of chrome from the
canvas edge.

### TB-2 Toolbar geometry: 246 x 36 desktop, 274 x 40 below 1280 (rule)

**Decision.** Every number derives from a token the shell already owns.

Item 28 x 28 with the register's fixed 14 px glyph gives 7 px clear space,
comfortably over 6.8's 24 x 24 hit area with 4 px clear. Height 36 sits between
the shell's 24 px row and its 40 px top bar, so the bar joins the existing
vertical rhythm. Padding 3 with a 4 px item radius makes the container radius
exactly concentric at 7 (outer = inner + padding), which is why 7 and not a
rounder 8.

Derived width, with TB-6 rejected so the bar has no pointer pair:

```
3 + 60 + 12 + (28*4 + 2*3) + 12 + 36 + 3 + 2 borders = 246
pad  seg  div     zoom group    div  views pad
```

Below 1280 px, 6.8 point 3 **mandates** the larger form for any icon that is the
sole path to a capability -- 32 x 32 with a 16 px glyph -- so the responsive rule
is not invented here, it falls out of the icon rule: items 32, segmented 68,
Views 40, dividers and gaps unchanged, giving `3 + 68 + 12 + (32*4 + 2*3) + 12 +
40 + 3 + 2 = 274` at height 40. Nothing else changes between the two sizes.

(Track 5's 316 and 352 include the rejected pointer pair; its 254 fallback is
arithmetically 246. The numbers above are the ones to draw.)

**Tokens.** Background `#1f2428`, border 1 px `#48525c`, item colour `#a3a8b1`,
hover `#2a3035` / `#d5d7da`, disabled `#5f6873`, divider a 12 px box holding a
1 px x 16 px rule in `#48525c`. The segmented control's selected half uses the
neutral raised fill `#374047`, **not the accent**, because choosing a view is not
an armed state.

**The one new visual behaviour, deliberate.** The bar carries the existing
tooltip shadow token `0 8px 24px rgba(0,0,0,.45)` and is **the only canvas
overlay that does**. Lift is the mechanism that makes it read as an instrument;
the minimap and legend stay flat, which correctly sorts them as content boxes.
The 7 px radius and the shadow are a deliberate two-value exception and are
recorded as such in VOCAB rather than left to drift into a general "floating"
style.

**Spec text.** 5.6's Canvas toolbar paragraph gains the geometry; 6.8 point 3
gains a parenthetical naming the toolbar as the case it governs.

**Direction.** Neutral.

### TB-3 The left edge: the minimap stays; the freed column becomes canvas (rule)

**Decision.** 5.1's "the minimap is bottom left by design; the legend owns bottom
right" is unchanged. Moving the toolbar out of the left edge is a pure gain.

**Horizontal collision, and it does not fire on desktop.** The three share one
12 px baseline with 16 px minimum clearance. The minimap occupies 12 + 160 = 172
from the left and the legend the same from the right, so the two-line rule fires
below `172 + 16 + 246 + 16 + 172 = 622 px` of canvas. At 1280 with the panel and
the inspector both open the canvas is 672 and the clearance is 41 px a side, so
**nothing reflows at any standard desktop size** -- a consequence of rejecting
TB-6, since the 316-wide bar would have reflowed at 1280. Below 1280 the narrow
variant applies and the threshold is 650.

**When it does fire**, the minimap and legend **rise 48 px onto a second line**
and the bottom band belongs to the toolbar alone. They are never hidden: the
legend is floor 5 and may not be dropped, and a hidden minimap would leave its M
toggle and its Views menu checkmark describing a state the user cannot see. The
legend's 40 per cent height cap is measured from its raised bottom. The rise uses
the panel's own transition so it reads as the layout reflowing, not as a glitch.

**The clamp the tracks left open, closed here.** Panel and inspector widths are
resizable, so a user can drive the canvas arbitrarily narrow. **Drags are
clamped so the canvas never goes below 520 px**, which is one line in 5.1 and
also keeps the graph usable. Between 520 and 622 the two-line rule handles it;
there is no third step.

**Artboards.** All 36 lose the left column; the two-line state is drawn once, on
CanvasToolbar, as a 600-wide canvas slice.

**Direction.** Removes chrome from the canvas edge; adds nothing.

### TB-4 The bottom stack (rule)

**Decision.** As A1, in full: the order, the four offsets (12 / 82 / 272 / 342),
the slider normalised to 70 px, and the toolbar hiding with the minimap and
legend when the drawer is maximised to full canvas height.

**Do not merge the toolbar into the time slider bar.** The slider exists only
when a Time role is assigned, so a merged bar would change size and position the
moment a user maps a timestamp column, and the toolbar would inherit the
slider's conditional life. Two objects, 12 px apart.

**The failure mode we are buying into, named.** Figma's bottom-centre bar
occludes canvas content there and cannot be moved, docked or hidden, a request
years old
(https://forum.figma.com/t/new-ui-issue-bottom-center-toolbar-is-getting-in-the-way/83144,
https://forum.figma.com/suggest-a-feature-11/allow-us-to-dock-move-the-new-ui3-toolbar-7861).
Our exposure is smaller -- a 246 x 36 bar over a force-directed layout occludes
no measurement label -- and TB-8 gives the escape Figma never shipped.

**The one adjacency someone will argue about, answered in advance.** With the
drawer open the canvas shows Graph / Table at top centre and the toolbar at
bottom centre, two centred controls on one screen. That is acceptable -- opposite
edges, only one conditional -- and it is the strongest argument anyone will make
for folding Graph / Table into the toolbar. The counter-argument is the fixed
item set, and it must be written where the next drafter will find it.

**Artboards.** DataTableDrawer (bottom 342, slider height 70, padding
`6px 12px 1px`), TimeSlider (bottom 82), Main, and CanvasToolbar draws the full
three-way stack once as a labelled slice.

**Direction.** Neutral.

### TB-5 Narrow screens: iPad 1180 x 820 (screen)

**Decision.** This case resolves itself, which is the best evidence the placement
is right. 5.2 says overlays do not resize the canvas, so the rect stays 1132
wide and the toolbar centres on it. At its 274 px narrow width its edges land 149
px clear of a 280 px panel overlay on the left and 149 px clear of a 280 px
inspector overlay on the right -- no special case, no reflow, at either overlay
or with both closed. Its lower edge sits 36 px above the window bottom, above the
status bar and clear of the iPadOS home indicator.

**The binding hole this closes.** 5.2 says overlays close "on tapping the
canvas", and the toolbar is drawn inside the canvas element. Without a rule, a
tap on Fit would dismiss the panel the user is working in. **Tapping the toolbar
is not tapping the canvas: it does not close an open overlay.** This is a
genuine hole that only appears once the toolbar sits inside the canvas rect on a
touch device, and it must be closed in 5.2, not left to implementation.

**The bottom-anchored trap this avoids.** Excalidraw's mobile bottom UI is eaten
by the Android navigation bar
(https://github.com/excalidraw/excalidraw/issues/10082). Our 24 px status bar
occupies that band already.

**Artboards.** IpadPanel (Zoom to selection disabled), IpadInspector (enabled, a
node is selected). Both record the two clearances in a comment so a later resize
does not silently eat them.

**Direction.** Neutral.

### TB-6 REJECTED: Select (V) and Pan (H) pointer modes (rule)

**Decision. Rejected**, and the gap it was solving is closed a different way.

**Why rejected.** (a) It is the only proposal in the revision that adds a
**concept**, in a revision whose direction is subtraction. (b) It reopens 5.6's
explicit decision that there are no persistent tool modes and that the pointer,
hand and zoom toggles of the current BottomToolbar are removed -- a decision
nothing here has shown to be wrong. (c) It requires **two new glyphs**, which
would open the register that precedence rule 5 keeps closed, and the track's own
private render found the arrow and hand silhouettes hard to tell apart at 14 px.
(d) It breaks 3D orbit on a bare-touch iPad in Select mode, which the track
itself flags as possibly unacceptable; the fallback offered was to make Select
2D-only, which costs the touch marquee in 3D and leaves the feature half
present.

**The real gap it identified is real and is closed here.** Box-select needs
Shift+drag, and 5.6's touch list has no Shift, so marquee selection is
unreachable on a bare-touch iPad -- and multi-selection gates "N selected",
Filter to selection, Save as set and the whole multi-node inspector. **Fix: a
verb, not a mode.** `Select a region` joins the canvas context menu and the
command palette. It arms the **next** drag on empty canvas as a marquee and
disarms on release -- one shot, no persistent state, no status chip, no register
addition (a palette row and a menu row both carry text), and no effect on any
existing gesture. On desktop it is a second route to a binding that already
works, which 6.4 wants anyway.

**Consequence.** The bar is 246 x 36 and the icon register stays closed.

**Spec text.** 5.6's "There are no persistent tool modes" sentence **stays**. The
touch paragraph gains the one-shot verb and its two routes. CommandPalette and
ContextMenu gain one row.

**Direction.** Declines an addition; adds one palette row and one context-menu
row.

### TB-7 The zoom percentage stays in the status bar (rule)

**Decision.** The percentage does not enter the toolbar. 5.1 gives the status bar
a zoom slot and 5.6 defines its menu, and "One fact, one region" forbids a second
copy -- which gains a row: `Zoom percentage | status bar | the canvas toolbar`.

Three reasons, recorded because this is the decision most likely to be reopened.
(a) **Figma made the same call**: after moving every tool to the bottom bar it
left the percentage in the top-right of the right sidebar
(https://help.figma.com/hc/en-us/articles/360041065034). Miro and tldraw bind
theirs to a navigation cluster rather than a tool bar
(https://help.miro.com/hc/en-us/articles/360017730553-Toolbars,
https://tldraw.dev/sdk-features/ui-components). (b) **Geometry**: with the
toolbar at bottom offset 12 and the status bar 24 px directly beneath, the
percentage renders about 12 px below the Zoom in and Zoom out buttons -- already
adjacent, already grouped by proximity, at zero cost. (c) **A numeric readout
would change the bar's width** as the graph is zoomed from 10% to 1000%, which
is precisely the width instability a centred bar cannot tolerate.

**One consequential edit.** The status bar's overflow rule drops slots right to
left in the order AI status, zoom, layout name, Viewing -- so zoom is the second
thing to go on a narrow window, and at that point the percentage would have no
home at all while the toolbar shows four zoom controls with no readout. **Move
zoom later in the drop order**, now that it is the only camera fact in the bar.
One word changed.

**Artboards.** Main gains a comment recording the decision in the style of the
existing MIN- and NAV- comments, so the next agent does not re-add a percentage
to the bar.

**Direction.** Neutral.

### TB-8 The Views menu opens upward, gains a Toolbar row, and the bar can be turned off (rule)

**Decision.** The menu re-anchors so its bottom edge sits 4 px above the
toolbar's top edge, centred on the Views button, **clamped 12 px inside the
canvas's left, right and top edges** and scrolling internally if the stack pushes
it up -- the clamp is real, not theoretical: on iPad with the drawer and slider
open the menu's top would otherwise land 3 px above the canvas top. The trigger's
caret flips to point up.

A checked `Toolbar` row joins the Show group between Minimap and Legend,
following RT-5's verbs-out form. **The toolbar becomes the third canvas overlay
with a visibility toggle**, and 6.5 already remembers "minimap and legend
visibility", so it joins that clause rather than adding a new one.

**The trap, and the way back.** Hiding the toolbar hides its own Views menu, so
the row needs a return path that is not the row itself. **The command palette
row `Show canvas toolbar` is that path**, is always available on Cmd+K, and needs
no new binding. The toolbar is never on the Escape ladder.

**Rationale.** The loudest and longest-running complaint about Figma's move is
not the position, it is the absence of an exit; the only shipped workaround hides
the sidebars too
(https://forum.figma.com/suggest-a-feature-11/ui3-option-to-hide-the-toolbar-for-keyboard-users-19766,
https://forum.figma.com/suggest-a-feature-11/minimize-or-hide-toolbar-1937). The
cost of not repeating that mistake is one menu row.

**No key binding, deliberately.** M and L are taken and 5.6's never-bind list is
long. It makes the toolbar the only one of the three canvas overlays without a
key, which someone will call an inconsistency; the honest answer is that it is
the only one whose toggle can hide its own front door, so its way back should be
the palette rather than a key pressed by accident.

**Artboards.** ViewsMenu (re-anchored, plus the Toolbar row), CommandPalette,
and a caret flip on Main, DataTableDrawer, TimeSlider, IpadPanel, IpadInspector.

**Direction.** Adds one menu row and one palette row; buys an exit.

---

## H. Rejected

| Proposal | Why |
|---|---|
| **Amend floor item 4 to cover the reason a dialog opened** (track 1, IMP-1) | Floor 4 is about a control and about a prediction. Stretching it to "any text that helps" destroys the discipline that makes the floor a veto. The entry clause is protected by floor 6, names, which is what it actually is |
| **Pop out the attribute profile** (track 2, POP-9b) | Floor 7. Nine rows of the user's own attribute names and top values is a scan surface, and POP-10 already establishes that a scan surface of floor-7 data does not go behind a door |
| **Pop out the selection-set verbs** (track 2, POP-12a) | A pop-out is for parameters and reports; a menu is for verbs. Reclassified as the set row's context menu, matching SAV-7 |
| **Render a run's whole parameter set inline in the layer's Source** (track 4, STY-3 as proposed) | About 190 px on a panel 1.6 just cut. Rule 7a already decides it: only the deviating parameters render, the rest go behind the layer gear. Source costs about 110 px instead |
| **`Export all saved items (JSON)` and `Import saved items...`** (track 3, SAV-12) | One step from a project file, which section 11 defers and section 12 holds open. Recorded as an input to that question, not shipped here |
| **Select (V) and Pan (H) pointer modes** (track 5, TB-6) | Adds a concept in a subtracting revision, reopens a settled 5.6 decision, needs two new glyphs in a closed register, and breaks 3D orbit on bare touch. The real gap it found -- touch marquee -- is closed by a one-shot `Select a region` verb |
| **A channel word on resting Suggested cards** (track 4, STY-7) | The reading's closing clause already states it at the only moment it can be checked. Refusal recorded so a later pass does not re-litigate it as an oversight |
| **`Save as <kind>` in a panel header icon pair** (track 3, SAV-1) | REGISTER-1.5 section 1.6: import, open and save have no glyph. 6.8 caps the panel header at three icons in a fixed order, already spent |
| **Separate artboards for the 280 and 480 pop-out cases** (track 2) | The shell is one component drawn twice, at 360, in ValidationPopout and GroupProfilePopout. TimeSliderSettings is drawn on TimeSlider, SchemaPopout on Main, FilterRulePopout on FilterBuilderExpert. Eleven new boards becomes eight |

## I. New artboards

Eight, taking the set from 40 to 48.

| Board | What it draws | Why it cannot be a change to an existing board |
|---|---|---|
| `ImportFlow` | The seven triggers with their clauses in precedence order, the nine dialog items with four conditional bands, the five exits, the seven reopen paths, and the decision table | It is the only board in the set that draws a transition rather than a resting state, and the relationship between the four Import boards is not visible from inside any of them |
| `ImportParseError` | The one entry state where the primary is disabled, item 8 renders, and the Parsing group opens by default | No board exercises floor 4's disabled-reason clause on the highest-stakes disabled button in the app |
| `ValidationPopout` | A 360 activity-panel pop-out **with the Data table drawer open beneath it** | The coexistence of a left pop-out and a bottom drawer is the entire argument for 3a over 3b, and it cannot be drawn on one surface |
| `GroupProfilePopout` | A 360 inspector pop-out anchored to a table row, with the re-targeting tether | The browsable-detail case, and the left-opening anchor |
| `StyleLibrary` | The Styles section at rest and hovered, plus the Save as style dialog with its two off-by-default checkboxes and the destination line | It is the only place the section overflow is drawn open anywhere in the set, and the checkboxes are the schema decision made visible |
| `SavedItems` | Settings > Data management with every kind grouped, storage used, origins, and the dimmed "For graphs you do not have open" group | The housekeeping list is a different job from the working lists and must be seen to be different |
| `StyleFromAnalysis` | The user's own example -- MCL granularity 2.5 on the 318-node ovarian dataset -- with the Source section and the granularity mid-edit showing the cost gate | The whole of track 4 in one picture, including the canvas holding the last good colours while a re-run is pending |
| `CanvasToolbar` | The bar at both sizes, the three-way bottom stack as a labelled slice, and the two-line minimap/legend state | A new component with a shadow, a concentric radius and four vertical offsets |

`canvas.json` takes one deliberate coordinated edit: eight new entries, the four
Import retitles of IMP-8, and the group-2 annotation count from (7) to (9). Every
Import file comment's "canvas.json is not edited here" hedge is removed, since
the edit is now made.

## J. Risks

1. **The word count rises and the pixel count falls.** If a reviewer measures
   only words, this revision looks like a regression against 1.6. Section B is
   the answer and must be read before the artboards are judged. Every added word
   traces to 6.10; if a later pass finds one that does not, it is a defect, not a
   precedent.
2. **The Source section is the single biggest addition and lands on Style.** At
   164 px measured per analysis-backed layer, a user with three such layers pays
   492 px on a panel 1.6 just cut -- more than half a panel column. The
   amendment (Rule 7a decides which parameters render) is what keeps it
   affordable, and StyleFromAnalysis must be measured against the 1.6
   scroll-height target rather than waved through. If three stacked
   analysis-backed layers prove unreadable, the next lever is collapsing the
   run record line into the layer row's title, which is legal under floor item 3
   only if the Details chevron survives.
3. **Five library sections could become a habit.** SAV-1 is a treatment, not a
   licence. POP-11's rule -- a control whose home is a dialog may not acquire a
   second home -- is the guard, and 6.11's worked-examples table is where the
   next drafter must look before adding a sixth.
4. **One pop-out per region will surprise someone.** Opening a run record's
   Details closes the group profile. That is correct and it is written down, but
   it is the kind of rule discovered by frustration rather than by reading.
5. **The discovery risk in Analyze is unchanged and now has one more reason to
   fire.** A novice who finds the picture in Style has one less reason to open
   the Analyze catalogue. Section 12's existing check still applies as written;
   this revision does not improve it.
6. **The toolbar occludes the canvas bottom centre and always will.** TB-8's
   Toolbar row is the escape, and its way back is a palette row a user must know
   exists. That is a real, small, permanent cost, accepted knowingly.
7. **`metadata.source` is a forward-compatibility bet.** It is verified against
   the current schema -- `StyleLayer` is strict and `StyleLayerMetadata` is
   `.loose()` -- but a future tightening of that metadata object would break
   every exported analysis-backed layer. 5.8 must record the dependency, not just
   the feature.
8. **The header signature is a weak key.** SAV-10 makes an existing silent
   behaviour visible and thereby makes its collisions visible too. Naming the
   mapping after its originating file is the minimum fix, not the whole fix, and
   the question belongs beside section 12's fingerprint question.
9. **Two spec numbers are now doing similar work.** 6.9's RT-1 door rule and
   6.11's section-scale door rule are one mechanism at two scales. A2 says so
   explicitly; if a later pass lets them drift into two concepts, the closed row
   set stops being closed.
