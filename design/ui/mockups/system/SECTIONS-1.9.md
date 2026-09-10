# SECTIONS-1.9 -- a section expands in place; a gear is an addition, never the section

Owner: the boundary between what a section draws and what its gear hides. One
rule, twelve decisions, seventeen breached sections. Nothing else on the boards
is this pass's to touch, and nothing in DECISIONS-1.8 is reopened except the
one clause named in section 1.

This record acts on the pop-out-only audit of all 48 boards. Where the audit's
proposal and a decision below disagree, the decision wins and the work list
says so.

---

## Contents

- 1. The decision, once
- 2. Why the denominator is local
- 3. The twelve decisions
- 4. The exemplars -- copy these, do not invent
- 5. The work list: seventeen sections
- 6. What the rule does not reach
- 7. The measurement obligation, and the risk it carries

---

## 1. The decision, once

The product owner's words:

> study figma, a panel always expands. the components shown in the panel aren't
> GLOBALLY commonly used, they are LOCALLY commonly used. for example, maybe a
> layout panel would show a couple common parameters and have an advanced gear
> for the rest. do not make panel that has a pop-out on its own.

The same thing in the design's own terms:

**Every section expands in place. A chevron is drawn only where it opens onto
real rows. No section's content lives entirely behind a door. A gear is an
ADDITION to a section that already has resident content, never a section's only
content.**

Two things change, and only two.

**The door test's first clause changes its denominator.** DECISIONS-1.8 A1 asked
"does this control sit at a default that most instances never leave" -- most
instances of the product. It now asks: of the readers who open THIS section, is
this among the two or three things they commonly adjust or consult? The second
clause, the stub obligation, is unchanged, and the two still conjoin.

**The licence for a section that is only a door is withdrawn.** Three documents
carry it in the same words -- 6.9's RT-8 row (about line 4472: "A section that
has become a door keeps its chevron in the closed right-pointing form
permanently and never renders the open form"), VOCAB's door-stub snippet (about
line 2426: "Its chevron is the closed form and never opens"), and DECISIONS-1.7
A2, which added the sentence to RT-8 in the first place. All three are struck.
A chevron that reveals nothing is a defect, and seventeen sections in the set
draw one today.

What does not change: which sections default open and which default closed (D4);
6.10a's veto (D2); 6.11's three questions about which SURFACE a group of
controls gets (section 6); and every refusal DECISIONS-1.8 recorded so it would
not be re-proposed.

**Spec text.** 6.11, replacing the paragraph that begins "The governing test":

> Every section expands in place. A chevron renders only where it opens onto
> resident rows, and no section's content lives entirely behind a door. A gear
> or trailing door is an addition to a section that already draws content; it is
> never the section itself. The governing test decides which controls are the
> addition. Of the readers who open THIS section, is this among the two or three
> things they commonly adjust or consult, AND can the row it leaves behind still
> report whether this instance left the default? Behind the gear: not among
> them, and the report survives. Resident: either clause fails. 6.10a vetoes the
> test in both forms.

**Spec text.** 6.9, RT-8, replacing the door-form sentence:

> A section header's chevron renders the open form when the section is open and
> the closed form when it is closed. There is no permanently-closed form. The
> trailing slot carries a state mark when the section is closed -- a count, the
> highest severity glyph, an On switch, a progress string, the active member's
> own name -- and the section's verbs and its gear when it is open.

---

## 2. Why the denominator is local

DECISIONS-1.8 A1 was right about the shape of the test and wrong about one
word in it, and the failure is systematic rather than a matter of taste.

**The test was written to decide one control against its siblings.** Layer
opacity against font size; a dash style against a stroke colour. Applied that
way the global denominator works, because the siblings share it and the test
discriminates between them. Applied to a whole section it stops discriminating,
because every row in the section shares the same denominator -- and for any
section below the first screen, that denominator says "most instances never
leave the default" for all of its rows at once. Clause (a) passes for every row
simultaneously, the whole section departs, and what is left is a chevron over
nothing. That is not a drafter's error repeated seventeen times. It is the test
returning the answer it was asked for.

**The layout panel, worked.** StylePanel drew three parameter rows and deleted
all three into the gear, on good evidence: `NGraphLayoutEngine.ts` declares
`springLength .default(30)` and `gravity .default(-1.2)`, Edge weight defaults
to the import Weight column, so Rule 7a forbade drawing them and the global
door test agreed. The board's own comment records the deletion. The result is
RampPopout, where the Parameters header's trailing slot is literally an empty
div and only the row title speaks: a section that says nothing, opens onto
nothing, and hides six engine internals behind a click a reader has no reason to
make.

Now ask the local question. Edge length is rare across the product -- one
Parameters section against 48 boards, and most sessions never touch a layout
parameter at all. Inside the section it is not rare; it is the point. **Nobody
opens the Layout section to do nothing.** They open it because the arrangement
is wrong, and edge length and pull to centre are the two dials that make it
right. Stiffness, theta, damping, time step and random seed are the ones they
will not touch, and those are what the gear is for. Three rows resident, six
behind the gear, which is the owner's sentence verbatim: "a couple common
parameters and an advanced gear for the rest."

**The counter-examples in A1 all survive, and nothing in the refutation is
lost.** Only the denominator of clause (a) moves; the conjunction is unchanged,
so every case A1 decided by the conjunction is decided the same way now.

| A1's refuted test | Its counter-example | Under the local denominator |
|---|---|---|
| Frequency alone | Layer opacity is rarely touched and stays resident; font size is touched constantly and is also resident | Still refuted. Opacity is resident because clause (b) fails -- no row behind it reports the value -- not because of any frequency, global or local |
| Room alone | "Show behind transparent areas" is one checkbox inside the effect popover while the 224 px Fill row stays out | Still refuted, and untouched: room was never a clause |
| Per-item-ness alone | Export configurations are per-item and their scale and suffix stay resident | Still refuted. Scale and suffix are locally common to the configuration that owns them, so the local denominator agrees with the global one here |

And the veto is unchanged and still overrides both forms of the test: **a control
whose wrong value is invisible until it does damage stays resident however rarely
it is touched.** The export Scope select, Analyze's Weight and Treat as pair and
the import Positions checkbox keep their 6.10a protection, and no decision below
folds any of them into a gear.

---

## 3. The twelve decisions

Settled. Apply them; do not re-open them.

### D1. The rule

Stated in section 1. Three consequences a drafter checks on every section:

- A section with no resident rows and no gear contents is not a section. It is
  either the RT-8 empty-section form -- dimmed name, one 24 px plus in the
  trailing slot, no chevron -- or, where the data cannot support it, it does not
  render at all (Rule 7c).
- A gear is optional. A section may be entirely resident and carry no gear, which
  is what Export video becomes (5.13). A gear with no resident section above it
  is the defect this record exists to remove.
- The 24 px trailing door on a ROW is untouched. RT-1's door rule operates at
  field scale on a row that is itself resident, and every one of those doors is
  in block B of the audit's inventory, where it belongs. What is withdrawn is
  DECISIONS-1.7 A2's extension of that rule "at section scale".

### D2. The door test goes from global frequency to local

Clause (a) becomes: **of the readers who open THIS section, is this among the two
or three things they commonly adjust or consult?** Yes: resident. No: behind that
section's gear. Clause (b) -- what is left behind must still report whether this
instance left the default -- is unchanged, and the two clauses still conjoin.
6.10a's veto is unchanged and still overrides.

Argued in section 2. The short form: global frequency is the wrong denominator
because it is the same denominator for every row of a section, so it cannot tell
them apart, and it therefore empties the section rather than splitting it.

### D3. Locally common rows render whether or not they deviate

This is the collision with 6.9's Rule 7a ("a control sitting at its default is
not drawn"), and it is one of the two decisions that changes the most drawn
pixels. It sits between Rule 7a and D1, and both have a real claim.

Rule 7a's claim is the one that bought 1.6 its density: 3,648 words and the
promise that an exact, complete, unfiltered run draws no departure line at all,
which is what makes "Approximate (sample of 200)" loud. Nothing here weakens
that in the general case.

D1's claim is arithmetic. Every one of the three sections where this collides
holds locally common controls that happen to sit at their shipped defaults:
Edge length 30, Window 30 days, Transitions 300 ms. Under 7a alone none of them
draws. Under 7a alone the section therefore draws nothing while nothing
deviates -- and a section that draws nothing is a chevron that reveals nothing,
which D1 forbids. Worse, it forbids it in exactly the state a first-time reader
arrives in, since a fresh graph is all defaults: the panel is at its emptiest
precisely when the reader knows least.

**Resolution. Rule 7a continues to govern gear contents and every row that is
not locally common. It no longer reaches the two or three rows that are.** Those
rows render at their defaults, with their value in the field and no reset x
(there is nothing to reset), and they gain the reset x the moment they deviate.

**Spec text.** 6.9, Rule 7, clause (a), appended:

> This clause does not reach the two or three locally common rows that 6.11's
> door test keeps resident in a section. Those render at their defaults, because
> a section whose rows are all deleted by this clause is a chevron that opens
> onto nothing, which 6.11 forbids. Everything behind a gear is still governed
> here, and so is every resident row that is not locally common.

**What it costs, named honestly.** About a dozen rows across the Style and
Explore panels are drawn for the first time in this revision purely because of
this clause: Parameters 3, Animation 2, Step through time 2, Neighborhood
expansion 2, Policies 2. All twelve are behind chevrons that default closed
(D4), which is what pays for them.

**What it does not license.** A row the data cannot support still does not
render (Rule 7c). ImportRecognised's three policy rows with the counts "0 0 0"
stay deleted -- not because they are at defaults, but because there are no
repeats and no self-loops on that file. Where the counts are non-zero, as on
ImportOptions with "5 repeats, 2 self-loops", the rows render (5.15).

### D4. Default open or closed state is unchanged

"A panel always expands" is a statement about capability, not about resting
state. Nothing in this revision opens a section that was closed or closes one
that was open.

So 6.9's skyline promise survives intact: **eight collapsed sections are
8 x 33 = 264 px and never scroll, and that skyline is the point.** What changes
is what is behind the chevron, and the cost of the new rows is paid only by a
reader who opened the section deliberately. This is the single load-bearing
decision in the record; without it the seventeen sections below add about 54
rows to panels that spent revision 1.6 removing them. Section 7 does that
arithmetic.

It also answers the audit's third open question, on which every row count in the
work list depended: a section still defaults CLOSED, and it satisfies D1 because
the chevron now opens onto real rows.

### D5. The header's trailing slot: a state mark when closed, verbs and the gear when open

The second of the two decisions that changes the most drawn pixels, because it
governs 17 sections x every board that draws them, and because the marks are
what a reader reads at rest.

**Closed, a section summarises.** The mark is the one fact that says what is
inside without opening it, and 6.11's stub obligation already names the
vocabulary: a count, the highest severity glyph, an On switch, a progress
string, the active member's own name. Nothing here is new; what is new is that
the mark now belongs to the CLOSED state specifically rather than to a section
that can never be opened.

**Open, a section operates.** Its verbs and its gear occupy the slot, on the
28 px pitch RT-8 already specifies, ending at x = 272.

**The rule for the changeover, which is where the pixels are.** Rule 8 deletes
an explanation that restates something visible on the same screen, and a state
mark that restates a resident row is exactly that. So:

- **A mark the rows repeat is deleted the moment the rows are visible.** Schema's
  "3 node types, 7 edge types" is deleted when the type rows are drawn; Categories'
  "41 rows" is deleted when the footer reads "6 of 41 rows"; Neighborhood
  expansion's "2 steps, 3 types" is deleted when the Hops and type-filter fields
  are drawn -- which also retires the 11 px section name that Main and ExplorePanel
  both had to invent to fit name plus stub into 255 px.
- **A mark that says something the rows do not stays when open.** All statistics'
  progress string stays while any row is still computing, because the section's
  own rows each report only their own state. Step through time's On switch stays,
  because it is the section's own master control and not a summary of anything
  below it -- MultiSelection already draws it in that slot. Provider's Connected
  dot stays for the same reason; its model name goes, because the resident model
  row prints it.

That is the answer to the audit's sixth open question, and it generalises: **the
mark survives if it is the section's own control or the section's own state; it
dies if it is a precis of rows now on screen.**

### D6. "Commonly adjusted" reads as "commonly adjusted or commonly consulted"

Five of the seventeen sections hide readouts rather than controls -- Schema, All
statistics, Categories, Sweep runs and Validation report -- and clause (a) has to
reach them or they resolve to "no controls, therefore nothing resident, therefore
a door", which is the defect again by another route.

They resolve on what a reader came to READ. Of the people who open Schema, the
type names and their counts are what they came for. Of the people who open All
statistics, density, diameter and average path length are what they came for. The
long tail -- per-type completeness, the degree distribution, Coming rows -- is
what the gear is for.

This also confirms the audit's first open question and its corollary, which is D7.

### D7. Two artefacts keep a 480 pop-out

**Schema's edges-by-type-pair matrix** and **the sweep's NMI agreement block.**
Neither can be drawn honestly in the 256 px band -- one is two-dimensional, the
other is a pairwise comparison of three runs -- and 6.11's width ladder assigns
480 to exactly that: "a two-dimensional matrix or a plot".

What changes is where they are opened FROM. Today each IS its section. From this
revision each is opened from a gear on an expanded section, which is D1's
permitted shape and is exactly the owner's "advanced gear for the rest". A4's
discriminator is satisfied by both on its first clause: they buy width beyond the
256 px band.

No third artefact qualifies. Selection statistics' four-column table, Categories'
four-column table and the validation cards all reduce honestly (5.10, 5.11, 5.14),
and the audit says so in each case.

### D8. A section drawn in two regions takes the resident form in both

Three sections appear twice: **Sweep runs** in the panel result card and in the
inspector; **Selection statistics** in the inspector and in the Data table drawer;
**Step through time** in the panel and on the canvas time bar.

Both instances take the resident form. The alternative -- one region gets the rows
and the other keeps a door -- would make the same section two different shapes on
one screen, which is the inconsistency this whole revision exists to remove, and
it would put the door in whichever region the drafter happened to think of second.

5.1's One fact, one region is not breached: A5 already licenses the same CONTROL
at two scopes, and AnalyzeSweep's panel card and inspector are two scopes of one
run set. What One fact, one region still forbids is the same FACT twice in one
region, which is why AnalyzeSweep's three renderings of the run table collapse to
two (D3 of DECISIONS-1.8 keeps that finding intact).

### D9. Settings navigation is out of scope

A nav list is a picker, not a section with a chevron. DECISIONS-1.8 D7 stands
unchanged, including the sentence written expressly so a later pass does not fix
Settings with pop-overs: "in Settings the nav item is the door and the pane is
what is behind it."

The audit is right that this is the purest statement in the set of the shape D1
forbids, and it is right to have left it alone. The difference is real: a nav row
carries no chevron, opens a full pane rather than a transient, and is one of seven
mutually exclusive destinations rather than a disclosure of its own row's content.
Section 6 lists it with the other four things the rule does not reach.

### D10. "Keep advanced sections open" survives as a separate preference

DECISIONS-1.8 E4's second escape hatch -- `Settings > Appearance > Keep advanced
sections open`, default off, rendering every gear pop-out's contents as inline
rows in its own section -- is unaffected.

It does not collapse into the new rule, because the two mechanisms govern
different things. The new rule governs what is behind the CHEVRON, and sections
still default closed (D4). The hatch governs what is behind the GEAR, on a section
the reader has already opened. Turn the hatch on and Parameters shows nine rows
instead of three; leave it off and it shows three. Both states are legal, and
both still start closed.

E4's two constraints on the hatch are unchanged: it affects only pop-outs whose
contents are field rows at 280, and a panel in that mode may scroll.

### D11. Boards whose only premise was a door drawn open are re-scoped, not retired

Eight boards on the edit list exist to draw a door open. None is deleted; each
becomes the drawing of the expanded section, with its gear pop-out beside it where
one still exists. That is the audit's tenth open question, answered board by board:

| Board | Was | Becomes |
|---|---|---|
| AllStatistics | the 360 statistics pop-out drawn open | All statistics expanded -- three rows -- with the long-tail gear pop-out beside it |
| AiPanelCompact | Provider and Console as door rows | both sections expanded, plus the no-provider state where Console is resident with the setup prompt in place of the chat input |
| FilterExpression | the 360 expression pop-out drawn open | keeps the expression door, drawn from FilterBuilderExpert's compliant ten-rule section; its own zero-rule Filter builder becomes the RT-8 empty-section plus row (5.6) |
| ImageOptionsPopout | the Image options gear pop-out at 280 | premise intact -- it was already the model (section 4). Only its Export video section changes, to the inline form |
| RampPopout | the ramp door beside the categorical Values door | keeps the ramp door on its resident RT-4 row; its Parameters, Animation and Values sections all become expanded sections, which is three of the seventeen fixes on one board |
| ValidationPopout | the 360 report pop-out drawn open | Validation report expanded, with the 360 detail gear beside it. It also loses its pin, which E2 already removed |
| CategoryTable | the 360 category table drawn open | Categories expanded -- three rows and the "6 of 41 rows" footer -- with the full table in the Data table drawer |
| AnalyzeParameters | the 280 parameters gear pop-out | premise intact -- a card gear on a card with resident content. Add the clause (2) promotion: the one commonly adjusted parameter (Resolution, Damping) becomes a resident row |

Two of the eight keep their premise entirely, which is the useful finding: a gear
pop-out drawn open is a legal board under D1, and only a SECTION drawn as a
pop-out is not.

### D12. Stub-silent doors are swept in the same pass

These survive D1 -- each sits on a section or a control that already has resident
content -- and each fails 6.11's stub obligation, which A6 made drawable and which
no board has drawn. They are fixed now rather than in a later pass, because the
fix is the same edit in the same file.

| Door | Boards | What it owes |
|---|---|---|
| Import settings, on the Open file header | ImportOptions, ImportParseError, ImportLargeFile, ColumnRolePopout | Deletion. It reports nothing, it duplicates the Loaded data door, and DECISIONS-1.8 D5 already ruled that one general import door exists and it is the gear on the Loaded data header |
| Columns chip | DataTableDrawer | A count: "9 of 12" |
| Parsing gear | ImportLargeFile | Its five values live only in a title. The separator and the header-row state come out as the mark; the gear also gains a keyboard route, which it does not have today |
| Advanced, Encryption password | Settings | Both draw no state at all. Advanced reports whether Base URL, max tokens or temperature deviate; Encryption password reports set or not set |
| Expand-neighbors caret | ContextMenu, ExplorerExpert, ExplorerNotes, NoteEditorPopout, IpadInspector, FilterExpression | The depth and type filter its Explore twin carries: "2 steps, 3 types". It prints a count today and nothing else, so a reader cannot see what the button will do before pressing it -- floor item 4 |

---

## 4. The exemplars -- copy these, do not invent

The shape this record asks for is already drawn, on boards that have been through
review. The fix for the seventeen is to copy these, and a drafter who finds
themselves inventing a form has picked the wrong exemplar.

**Export image** -- ImageOptionsPopout, ExportLegend, PresentCompact, PresentPanel,
ReportEditorDrawer. An open chevron; four or five resident rows (Format PNG |
Scale 2x, the size estimate "1664 x 1672, about 420 KB", Copy to clipboard |
Export image, the last-export filename); one gear in the trailing slot holding
Scope, Background, View angle, Legend, Note markers, Only pinned labels and the
Image quality group; A6's two inks on the gear; and the departure line ("Only
pinned labels on: hides all 20 labels") resident under the section that caused it.
**What it proves:** the whole rule in one section. Resident content, a gear that
is an addition, a stub that reports, and a floor item that stays outside the door.

**Loaded data** -- DataPanelLoaded, ValidationPopout, ImportAddToGraph, TableJoin.
Four to six resident rows naming the format, the size, the direction and every
column mapping, with one dimmed "Import options" gear.
**What it proves:** the same shape on a section made of floor items, where the
resident rows are not controls at all but the report the reader came for -- D6 in
practice, before D6 was written.

**Source** -- StyleFromAnalysis. The reading, the run record, the deviating
Granularity field, the cost gate and Open result all resident, with a dimmed
Advanced parameters gear for the MCL internals.
**What it proves:** an analysis-backed section can carry four floor items and
still have a gear, and that the gear takes the engine internals rather than the
answer. DECISIONS-1.8 D2 already forbade Source becoming a door; this is what
that refusal looks like drawn.

**Export video, inline** -- KeepAdvancedOpen. Drawn fully inline with Export data
beside it, because the hatch is on.
**What it proves:** the inline form of section 5.13 is already specified and
already measured. The fix there is not a new drawing; it is making the hatch-on
form the default form.

**Selection statistics, inline** -- DataTableDrawer at four rows, ExplorePanel at
seven, both in the same 256 px band that MultiSelection claims is too narrow for
the same content.
**What it proves:** the width argument for that door is false, checkably, on two
boards in the same set. It is also the precedent for D8: two regions, one shape.

**Parameters, open** -- StyleLibrary. Draws the section open with a resident Edge
weight row plus its gear, while StylePanel, StyleFromAnalysis, StyleDiverging and
RampPopout draw the identical section as a door.
**What it proves:** the closest thing in the set to the owner's own example, one
row short of it. It also settles the board-to-board divergence in 5.1 -- the
correct form already exists in the file, and the other four boards move to it.

**Most connected (Degree)** -- drawn open on roughly twenty boards: a column
caption, five ranked rows, a distribution chart, verbs in the trailing slot.
**What it proves:** the largest and most repeated proof in the set that a
CONSULTED section can be resident, ranked, complete and honest at 256 px. Every
"it will not fit" argument in the seventeen is measured against this section,
which fits twenty times over.

---

## 5. The work list: seventeen sections

One subsection per breached section. Each names the boards, what is behind the
door today, the resident rows it gains, what stays behind the gear, and the mark
its header keeps when closed (D5). Taken from the audit and tightened; where the
audit's proposal conflicts with a decision above, the decision wins and the
conflict is named.

### 5.1 Parameters (layout) -- Style

**Boards:** StylePanel, StyleFromAnalysis, StyleDiverging, RampPopout. StyleLibrary
already draws it open with one resident row and is the target (section 4).

**Today:** a 280 pop-out at left 336 holding Start from current arrangement,
Stiffness (springCoefficient), Speed vs accuracy (theta), Damping
(dragCoefficient), Time step (timeStep) and Random seed (seed). RampPopout's and
StyleDiverging's opener is the row; StylePanel's and StyleFromAnalysis's is a gear.
RampPopout's trailing slot is an empty div -- the stub reports nothing at all.

**Resident:** **Edge length 30**, **Pull to centre -1.2**, and the **Edge weight**
attribute field. This is a restoration, not a new claim: StylePanel's own comment
at line 511 records those three rows being deleted into the gear.

**Behind the gear:** the six engine internals that were the door's original
justification -- Start from current arrangement, Stiffness (springCoefficient),
Speed vs accuracy (theta), Damping (dragCoefficient), Time step (timeStep),
Random seed (seed). The gear takes A6's two inks and finally has resident content
to be an addition to.

**Closed mark:** the layout name and its state, as the layout chip already prints
it -- "Force directed - settled".

**Conflict named.** DECISIONS-1.8 D2 wrote this section down as "6 rows -> 1" on
Rule 7a and 6.2's four-row arithmetic. D3 overturns the row count and leaves the
routing: the three locally common rows come back at their defaults, the six
internals stay in the gear 6.2 assigned them. Net against 1.8: +3 rows on four
boards, none of them at rest.

### 5.2 Animation -- Style

**Boards:** StylePanel, StyleLibrary, StyleFromAnalysis, StyleDiverging, RampPopout.

**Today:** Transitions, Easing and Reduce motion behind a 14 px gear titled
"Animation settings". The section draws no chevron at all -- the 16 px leading
slot is an empty div -- and no rows, so the gear is the only route in. With
Policies (5.15) this is clause (1)'s defect in its purest form: a header that is
neither a section nor a door.

**Resident:** **Transitions (300 ms)** and **Reduce motion**. Two RT-5 toggles,
packed, which is what RT-5's "never alone" sub-rule asks for. Reduce motion argues
for residence on accessibility grounds independently of this rule.

**Behind the gear:** Easing, and any per-channel transition overrides.

**Closed mark:** none needed while both values are at their defaults -- the dimmed
section name says it (RT-8). "Off" when Transitions is off, which is the state a
reader is most likely to have forgotten setting.

**Conflict named.** This is D3's test case: 300 ms is the default and Rule 7a is
the stated reason no row is drawn today. D3 decides it -- the row renders at its
default -- and the gear keeps everything else.

### 5.3 Values -- Style, nested inside the Color / Outline section

**Boards:** RampPopout (nested in Outline), StyleFromAnalysis (nested in Color).

**Today:** a 280 per-value colour table, the categorical twin of the ramp pop-out,
from the same trailing slot and the same one click. Six values on both boards, all
at their Okabe-Ito defaults, which is why the count is drawn dimmed.

**Resident:** the value rows themselves -- swatch, value name, count. Six fit the
256 px band; cap at five with an "N more" row, which is 5.1's own five-plus-Other
convention and matches the canvas legend's cap from C3.

**Behind the gear:** the palette-level controls -- palette family and Reverse,
value ordering, the "Other" roll-up threshold, and Reset per-value overrides.

**Closed mark:** the count, dimmed while every value is at its default, primary
once any value is overridden.

**Note.** The numeric ramp door on the same row is untouched and stays a door: it
is a trailing glyph on a resident RT-4 row, not a section, and DECISIONS-1.8 D2
put the histogram behind it for room reasons that still hold. What changes is only
its categorical twin, which was hiding a list rather than a histogram.

### 5.4 Neighborhood expansion -- Explore

**Boards:** Main, ExplorePanel, ExploreNotesList, FilterExpression. TimeSlider
draws the same row dimmed with no state mark.

**Today:** a 280 pop-over in the panel lane holding Hops, node types, edge types
and direction. Main names all four in its own comment.

**Resident:** the two facts the stub already prints -- a **Hops field reading
"2 steps"** and a **type-filter field reading "3 types"**. These are the locally
common controls by construction: the row was given that state mark in the first
place because it is what a reader must know before pressing expand, which is floor
item 4. Drawing them also retires the 11 px section name that Main and ExplorePanel
both had to invent to fit name plus stub into 255 px.

**Behind the gear:** direction (followed / ignored / reversed), the max-nodes cap,
and the per-type checkbox list that the "3 types" field summarises.

**Closed mark:** "2 steps, 3 types". Deleted when open, because the two fields say
it (D5, Rule 8).

**Related, from D12:** the Expand-neighbors caret on six boards gains the same
mark. It prints a count today and never the depth or type filter its Explore twin
carries.

### 5.5 Step through time -- Explore, and the canvas time bar

**Boards:** MultiSelection, TimeSlider (settings pop-out drawn open at
[604,592 280x202]).

**Today:** the 280 time-slider settings pop-out, shared with the bar gear: the
time attribute select ("opened"), the Window 30 days | Step 7 days pair with the
"Recompute results on each step" toggle in its trailing slot, the Cumulative |
Sliding track, Speed 1x, and the RT-7 row "Compare with another window". The
section's own stub carries the On switch and nothing else -- the window is printed
in the status bar, on the bar's Viewing readout and in the exported legend, and
not in the section that owns it.

**Resident:** **Window 30 days | Step 7 days** as one RT-1 pair, and the
**Cumulative | Sliding** RT-3 track. Of the readers who open this section, the
window size, the step and the window mode are the three things they change.

**Behind the gear:** the time attribute select (fixed at import on most graphs),
Speed, "Recompute results on each step", and "Compare with another window".

**Closed mark:** the On switch, which MultiSelection already draws in that slot.
It **stays when the section is open** -- it is the section's own master control,
not a precis of the rows below it (D5).

**D8 applies.** The bar gear opens the same gear contents, so there is still one
destination and one set of hidden controls; the bar itself continues to carry
everything that is scrubbed. DECISIONS-1.8 D4's refusal to move the bar gear is
unaffected.

### 5.6 Filter builder, zero-rule state -- Explore

**Boards:** FilterExpression. FilterBuilderExpert draws the same section with ten
resident rules and is already compliant.

**Today:** an OPEN chevron over zero rows, with the whole section living in a 360
expression pop-out drawn at [336,181 360x179]: the RT-1 expression field holding
`data.padj < 0.05`, the validation line "Valid. Shows as 1 rule in the builder.",
the Result select "Select matches", and "and 60 of 318 nodes would match." The stub
reports neither the expression, the mode nor the count.

**Resident:** at zero rules, **nothing** -- the section is the RT-8 empty-section
form: dimmed name, one 24 px plus in the trailing slot, **no chevron**. Once it has
rules it takes FilterBuilderExpert's shape: the rule rows, the scope pair and the
live match count.

**Behind the gear:** the expression editor stays a door, as FilterBuilderExpert
already draws it -- an angle-brackets glyph on a section that has resident content.

**Closed mark:** the rule count and the match count once rules exist ("38 of 318");
the dimmed name alone at zero.

**Conflict named.** The audit proposed drawing the Nodes | Match all scope pair and
the Result select resident in the zero-rule state. D1 is satisfied more cheaply and
DECISIONS-1.8 D4 already decided this case in the other direction: "Match all" at
zero rules is a default that contradicts 5.3's own condition, and "20 of 20 nodes
would match" is the null statement 6.2 forbids. **The decision wins: at zero rules
there is no chevron, because there is nothing to open.** D1 forbids a chevron over
nothing; it does not require rows to be invented so that one can be drawn.

### 5.7 Find a pattern -- Explore

**Boards:** ExplorePanel. ExploreNotesList and Main draw the same row unshipped.

**Today:** a 360 pattern-editor pop-out in the panel lane, measured by the board
itself -- row [64,549 255x32] gives pop-out left 336, top 549, right edge 696, with
a 6 px caret at y 565 -- and never drawn, because the capability is Coming.

**Resident, when built:** a saved-pattern field naming the pattern being matched,
and the Find row with its live match count. Both are what anyone opening the
section acts on.

**Behind the gear, when built:** matching options -- induced versus non-induced,
whether direction is followed, and the result cap.

**Closed mark:** until it ships, the Coming tag in the trailing slot and no
chevron, per FLOOR-1.9's corollary that an unshipped control keeps its text and
its tag. A chevron appears with the rows.

**Confidence:** the audit marks this PLAUSIBLE rather than CONFIRMED, because the
contents are not drawn. It is on the list so the pattern editor is not built as a
section-that-is-a-door in the first place.

### 5.8 Schema -- inspector

**Boards:** drawn as a permanent door on 21 -- Main (drawn open at [672,473
480x295]), AllStatistics, AnalyzePanel, AnalyzeParameters, AnalyzePicker,
CommandPalette, DataPanelLoaded, ExploreNotesList, ExplorerLargeGraph,
ExplorerLoading, ImageOptionsPopout, InsightsWide, PresentCompact, PresentPanel,
ReportEditorDrawer, RunRecordPopout, SettingsShortcuts, ShortcutsOverlay,
TimeSlider, ValidationPopout, ViewsMenu -- and as an ordinary live collapsed
section on five: ImportAddToGraph, KeepAdvancedOpen, SavedItems, Settings,
TableJoin.

**Today:** a 480 pop-out holding the node-type table (Node type / Nodes / Complete
-- cat 17, human 2, dog 1), the edge-type tables two-up, the "Edges by type pair"
matrix with its "undirected, so each pair is counted once" caption, and three
resident blue verbs: Filter to type / Select all of type / Export schema JSON.

**Resident:** the **node-type rows with their counts** and the **edge-type rows
with their counts**, as the short two-column tables Main already draws, capped at
five with an "N more" row; plus the existing RT-7 verb row **Filter to type /
Select all of type**. Of the readers who open Schema, the type names and counts are
what they came for (D6) -- and the five compliant boards already describe exactly
this as the open form: "open rows are node types with counts (cat 17, dog 1,
human 2), edge types with counts, the type-pair list".

**Behind the gear:** per-type completeness, and the **edges-by-type-pair matrix**,
which keeps its 480 under D7 because it is the one part that cannot be drawn
honestly at 256. Export schema JSON stays in the trailing slot where several boards
already put it.

**Closed mark:** "3 node types, 7 edge types", or "measuring..." while it computes.
Deleted when open.

**Board divergence, settled.** This answers the audit's eighth open question: **the
five boards that draw the live collapsed section are correct and the twenty-one are
brought to them.** Same for Validation report, which splits the same way -- a door
on DataPanelLoaded and ValidationPopout, a live collapsed section on ImportAddToGraph
and TableJoin.

**Measurement flag.** At twelve rows this is the largest single inline addition in
the record and the first board to measure (section 7).

### 5.9 All statistics -- Analyze

**Boards:** AllStatistics (pop-out drawn open at [336,358 360]), AnalyzePanel,
AnalyzeParameters, ExplorerAfterCard, IpadPanel.

**Today:** a 360 pop-out with its own header verbs (Recompute, Export CSV, More):
Graph type / Multigraph flattened at import; How tightly linked (density) 0.031;
Spread of links (degree distribution); Longest shortest path (diameter) 5; Typical
distance (average path length) 2.99; Tight-knit neighborhoods (Coming); Closed
triangles (Coming); and the footer "Instant rows follow the data. Computed rows:
running."

**Resident:** the three statistics a reader opens the section for --
**How tightly linked (density) 0.031**, **Longest shortest path (diameter) 5**,
**Typical distance (average path length) 2.99** -- each carrying its own
"Computing..." state on its own row, which retires the stub's "Computing 3 of 7"
contortion.

**Behind the gear:** the long tail and the policy -- Graph type and the multigraph
note, Spread of links (degree distribution), Tight-knit neighborhoods, Closed
triangles, plus Recompute, "Recompute on every filter change", Copy values and
Export CSV.

**Closed mark:** the count "4", or the progress string "Computing 3 of 7" while
any row is running. **The progress string stays when the section is open** for as
long as anything is still computing, because each resident row reports only itself
(D5).

**Note.** DECISIONS-1.8 D3 confirmed All statistics "stays a door with its
'Computing 3 of 7' stub". That confirmation is overturned by D1; the stub string
survives as the closed mark.

### 5.10 Selection statistics -- inspector, and the Data table drawer

**Boards:** MultiSelection (pop-out drawn open at [792,183 360x418]).

**Today:** a 360 pop-out with the attribute / Selection / A / Graph / difference
column headings; Nodes 7 | 1 | 200; Edges 4 | -- | 612; Average links per node with
"all links" 9.4 | 37 | 6.1 | +3.3 and "inside the selection" 1.1; Average amount
(weight) 4,600 | 2,910 | 1,880 | +2,720; and Export CSV.

**Resident:** **Nodes 7 | 200**, **Edges 4 | 612** and **Average links per node
9.4 | 6.1** -- the two-column Selection / Graph form that DataTableDrawer already
draws at four rows and ExplorePanel at seven, in the same 256 px band this pop-out
claims is too narrow for it. The two shared-attribute rows sit below the header
rather than orphaned beside it.

**Behind the gear:** the comparison machinery -- the third column against the
pinned A, the "inside the selection" split, the per-attribute means (Average
amount), and Export CSV. Only the pinned-A case needs the 360.

**Closed mark:** the count "4".

**D8 applies:** the inspector and the drawer both take the resident form. The pin
stays on this section, which is one of E2's closed set of four comparative surfaces
that earn one -- and it is the pin case, not the section, that the 360 gear serves.

### 5.11 Categories -- inspector

**Boards:** CategoryTable (pop-out drawn open at [792,300 360, max 418]).

**Today:** a 360 four-column sortable table (category | source | adjusted p | genes)
with six of 41 rows drawn -- DNA damage response GO:BP 2.1e-9 21; p53 signaling
pathway KEGG 8.4e-8 14; Intrinsic apoptosis 3.0e-6 12; Cell cycle arrest; TP53
regulates transcription of cell cycle genes; Response to hypoxia -- and a "6 of 41
rows" footer.

**Resident:** the **top three categories as two-column rows** (name plus adjusted p,
with source demoted to the row title), and the **"6 of 41 rows" footer** that opens
the full table in the Data table drawer. This is the shape every other ranked
inspector section already uses: Most connected draws five rows plus a chart in the
same band on roughly twenty boards.

**Behind the gear:** the table's parameters, which the inspector's pinned More menu
already enumerates -- which adjusted-p column, which members column, sort by
members, the Jaccard >= 0.5 redundancy rule, source filter, and Export categories
(CSV).

**Closed mark:** "41 rows". Deleted when open, because the footer says it.

### 5.12 Runs (sweep runs) -- Analyze panel result card, and inspector

**Boards:** AnalyzeSweep, both the Sweep summary card row in the panel and the twin
row in the inspector.

**Today:** a 480 pop-out (left 336 from the card, left 672 from the inspector) with
the three runs and their Resolution, Groups and Modularity; the sparkline of group
count over the swept value; the pairwise agreement block (0.5 vs 1.0 0.81, 1.0 vs
1.5 0.64, 0.5 vs 1.5 0.72); Keep per row, Compare and Export CSV.

**Resident:** the caption row **"resolution | groups"** and the **three run rows** --
0.5 / 4, 1.0 / 7 carrying the applied-run mark, 1.5 / 11. The board's own comment
lists exactly these under "WHAT WAS HERE", so the inline form is a restoration, and
it puts back the paintbrush that said which run the canvas is reading.

**Behind the gear:** the comparison apparatus -- the "Agreement between runs (NMI)"
block with its three micro-bar rows, the sparkline, and Compare / Export CSV. The
**NMI block keeps its 480** under D7; it is opened from a gear on the expanded
section rather than being the section.

**Closed mark:** "Runs 3".

**D8 applies:** panel card and inspector both take the resident form. DECISIONS-1.8
D3's finding stands -- three renderings of one run table is one too many, and it is
the panel copy's dropped modularity column that announced the squeeze. Two
renderings at two scopes is what A5 licenses; the third was the agreement block,
which is now gear contents in one place.

### 5.13 Export video -- Present

**Boards:** PresentCompact (pop-out drawn open at [336,326 280x138]), PresentPanel,
ImageOptionsPopout, ReportEditorDrawer.

**Today:** a 280 pop-out holding the Duration "10" "s" | Camera "Orbit once" pair;
Video format "WebM"; "about 12 s to record"; and the blue Record button.

**Resident:** **Duration | Camera** as one RT-1 pair, **Video format**, and the
**estimate-plus-Record row** -- which is literally what KeepAdvancedOpen already
draws when the hatch is on (section 4). The estimate is floor item 4 and Record's
full text is floor item 4, so both were always going to be resident under an open
chevron.

**Behind the gear:** the video twin of the Image quality group -- scope, background,
resolution and frame rate. If none of those ships, **this section carries no gear at
all** and is simply an expanded section, which D1 permits: a gear is an addition,
not an obligation.

**Closed mark:** "10 s, Orbit once, WebM" -- the stub DECISIONS-1.8 D1 specified,
which survives as the closed-state mark and is deleted when the rows are drawn.

**Effect on the Present split.** DECISIONS-1.8 D1's ten-row top level is unchanged
at rest, because Export video's chevron still defaults closed (D4). Opened, Present
draws 13. The rest of that split -- the report editor as a non-modal drawer, the
More section becoming a menu, the two gears -- stands untouched.

### 5.14 Validation report -- Data

**Boards:** DataPanelLoaded, ValidationPopout (pop-out drawn open at
[336,164 360x288]). ImportAddToGraph and TableJoin already draw it as a live
collapsed section and are the target.

**Today:** a 360 pop-out with four open warning cards, each with its count, a
consequence sentence, example ids and "Show more", and its verbs (Auto-fix: set
them to 1 / Preview / Show rows / Ignore); the green "8 mixed-form ids. Fixed by
step 2" line; a collapsed Info (3) group; and "Re-ran after step 2" dimmed beside
the pop-out title.

**Resident:** the **issue rows themselves**, one line each -- severity glyph, count,
name and its primary verb -- for the two or three amber ones (for example "No
amount, 14 edges / Auto-fix"), plus the green **"Fixed by step 2"** line.

**Behind the gear:** the report detail and its policy -- the per-card consequence
sentences and example ids with "Show more", the Info (3) group, the Ignore list,
and "Re-ran after step 2". At 360 if the example ids need it.

**Closed mark:** the amber triangle and "4 types" -- the highest severity glyph plus
the count, which is 6.11's stub vocabulary exactly.

**Measurement flag.** DataPanelLoaded measured the pre-1.8 open section at about
282 px, so the inline form is known to fit the region; but 1.7 cut this section
from 282 px to a 32 px door and celebrated it, and this record puts part of it
back. The resident form must come in near four rows -- about 128 px -- not near
282. That is the whole reason the consequence sentences and example ids go behind
the gear rather than staying with their rows.

### 5.15 Policies -- Import options dialog

**Boards:** ColumnRolePopout, ImportOptions.

**Today:** nothing. Unlike every other entry on this list there is no pop-out at
all: Rule 7a deleted the controls, the board's own comment refuses a pop-out "on
all three counts", and what remains is a chevron over an empty section. This is
clause (1)'s defect in its purest form, with Animation.

**Resident:** the two control rows ImportOptions itself still describes --
**"Repeats: Combine + sum"** and **"Self-loops: Keep"**. They render at their
defaults under D3.

**Behind the gear:** the rarer merge detail -- which attribute wins on a combine,
and the name of the repeat-count column. If neither ships, **delete the chevron**
rather than leave it decorative.

**Closed mark:** "5 repeats, 2 self-loops".

**Conflict named, and bounded.** DECISIONS-1.8 D5 celebrated Rule 7a deleting the
import policy defaults -- "deleting the defaults removes more rows than any door
proposed here" -- and that finding survives almost intact. D3 restores exactly two
rows, on the file that HAS repeats and self-loops. Where the counts are zero, as on
ImportRecognised's "0 0 0", the rows do not render and neither does the section:
that is Rule 7c, the data cannot support it, which is a different clause from the
one D3 amends. The other deletions D5 named -- "Load: Everything" at its default,
the three policies drawn with counts that cannot be known until the file parses --
are untouched.

**Also refused, still:** import policies as a panel pop-over. 6.11 verbatim -- a
control whose home is a dialog may not acquire a second home.

### 5.16 Provider -- AI

**Boards:** AiPanel, AiPanelCompact.

**Today:** a 280 pop-out in the panel lane at left 336, titled "Provider": the model
select, the provider keys and settings (which themselves hand off to Settings > AI),
and the "Voice input" switch with its full title "Voice input. Also used for
push-to-talk in VR and AR." Never drawn open on any board.

**Resident:** the **RT-1 model field ("claude-sonnet-5")** and the **RT-5 Voice
input switch**. AiPanel's own comment records that these two plus the status were
the section's resident rows before 1.8 collapsed them, and that Voice input is
floor item 6. Of the readers who open Provider, the model and the microphone are
what they touch.

**Behind the gear:** the provider select and its keys -- API key, and the Base URL /
max tokens / temperature trio that Settings.dc.html already files under an
"Advanced" row in the same provider accordion. One destination, not two (Rule 9).

**Closed mark:** the model name "claude-sonnet-5", plus the chevron's primary ink
when anything behind the gear deviates (A6). The model name is deleted when open;
the Connected dot stays, because it is the section's own state and the status bar's
"AI: Anthropic ready" is a different region's copy of a different fact.

### 5.17 Console -- AI

**Boards:** AiPanel, AiPanelCompact (pop-out drawn open at [336,644 280x190]).

**Today:** a 280 pop-out holding the monospace transcript block ("> findNodes
indoorOutdoor=outdoor / 5 nodes / > runAlgorithm louvain res=1.0 / 4 groups,
modularity 0.447 / > runAlgorithm betweenness / top The_Vet 0.35") and an RT-7 input
row ("zoomToN" with the ghost completion "odes <ids>" and Run script). It keeps its
pin.

**Resident:** the **one-line console input** with its completion hint and **Run
script**, plus the **last two transcript lines**. This is a working surface, not a
settings set, and the expanded form is already in the spec: DECISIONS-1.8 D6
concedes the Console should be "resident and expanded" when no provider is
configured. Only the configured state hid it. Width was checked there too -- the
widest console line measures 219 px inside the 256 px band.

**Behind the gear:** console preferences only -- clear transcript, copy transcript,
transcript length, and the completion-hint toggle.

**Closed mark:** "3 commands", plus the Coming tag while it is unshipped.

**Unchanged:** the pin stays on the section (E2's closed set of four), and
Shift+backtick still opens and focuses it, so the keyboard obligation is met by a
binding that exists. DECISIONS-1.8 D6's inversion finding is untouched: 6 supporting
blocks at about 445 px became 2 door rows at about 64 px, and those two door rows
now open onto rows instead of pop-outs.

---

## 6. What the rule does not reach

Said plainly so that a later pass does not over-apply it. **None of these is a
section with a chevron, and D1 does not touch any of them:**

- **A pop-out for ONE MEMBER of a list.** One filter rule (FilterBuilderExpert),
  one group's profile (GroupProfilePopout), one column's role (ColumnRolePopout),
  one note (NoteEditorPopout), one shortcut being rebound (SettingsShortcuts). 6.11
  question 2 owns these and A5 licenses the repeated control at member scope.
- **A report read once and not returned to.** The run record's Details chevron on
  eleven boards, the History popover, the Table join match reports.
- **A picker.** The "+ Analysis" catalogue, the Settings nav list (D9), the attribute
  and encoding pickers.
- **A menu.** The Select split button's menu, every section overflow, the Views menu,
  the column header menu, the context menu.
- **A dialog.** Import options, Table join, Map identifiers, node merging, the
  computed attribute formula, Run a recipe -- 6.11 question 1's closed list.
- **A preview.** The method comparison preview, which takes no lane and is correctly
  unanchored.

6.11's three questions about which SURFACE a group of controls gets are unchanged,
and so is question 4, A4's discriminator: a door must buy width beyond 256, survival
across a selection change, or leaving the rows below operable. What this record adds
is that the discriminator is asked about a GEAR's contents now, never about a whole
section, because a whole section no longer has the option of leaving.

---

## 7. The measurement obligation, and the risk it carries

**The obligation.** Every newly inlined section is measured against the panel's
800 px scroll region on the board that draws it -- 795 px measured on PresentPanel,
y 85 to y 842 -- and against the inspector's own region on the boards that draw it
there. **Any board that overflows says so in its own comment**, naming the section
and the overflow in pixels, in the same form the two pre-existing overflows on
StyleDiverging and StyleFromAnalysis are recorded (FLOOR-1.9 section 5). A board
that overflows silently has not been measured.

Measure with the sections the board's own comment says are open. One-section-at-a-time
is not a rule and must not be assumed.

**The risk, stated honestly.** This revision adds resident rows to a set that spent
revision 1.6 removing them. 1.6 cut 3,648 words and set the worst-case panel scroll
target at under 1,040 px against a measured 3,060; DECISIONS-1.8 took the six
activity panels from about 116 resident rows to about 80. Seventeen sections here
gain about 54 rows between them:

| Section | Rows when open | Section | Rows when open |
|---|---|---|---|
| Schema | 12 | Categories | 4 |
| Values | 5 | Sweep runs | 4 |
| Validation report | 4 | All statistics | 3 |
| Parameters | 3 | Selection statistics | 3 |
| Export video | 3 | Console | 3 |
| Animation | 2 | Neighborhood expansion | 2 |
| Step through time | 2 | Policies | 2 |
| Provider | 2 | Filter builder | 0 |
| Find a pattern | 0 today, 2 when built | | |

**D4 is what pays for it.** None of those rows is drawn at rest, because every one
of them is behind a chevron that still defaults closed. The skyline is unchanged:
eight collapsed sections are still 8 x 33 = 264 px and still never scroll, and the
resting resident-row counts in DECISIONS-1.8's H table stand as published, with the
one exception named in 5.13 (Present, 10 at rest, 13 with Export video open). What
this revision changes is the cost of an OPEN section, and that cost is only paid by
a reader who chose to open it -- which is the whole difference between disclosure
and deletion.

**Three boards to measure first**, because they are where the arithmetic is closest:

1. **Main's inspector with Schema open.** Twelve rows at the 32 px pitch is 384 px
   on top of an inspector DECISIONS-1.8 projects at 24 resident rows. The five-row
   cap plus an "N more" row is the mitigation and it must be drawn, not assumed.
2. **StylePanel with Parameters, Animation and the Color section's Values all open.**
   Three of the seventeen fixes land on one panel: ten rows, 320 px, on top of the
   fourteen 1.8 leaves resident. RampPopout carries the same three.
3. **DataPanelLoaded with Validation report open.** The section this set already
   cut from 282 px to 32 px once. Four rows is the budget; anything approaching the
   old 282 means the consequence sentences did not go behind the gear.

And one interaction to check while measuring: with `Keep advanced sections open`
turned on (D10), every gear's contents inline as well, so the same three boards are
measured twice. That mode is allowed to scroll -- E4 says so -- and the default mode
is not.
