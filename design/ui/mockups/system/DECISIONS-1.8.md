# DECISIONS-1.8 -- the pop-over rule, the anchor rule, the section splits, the legend

Eight research tracks, two user points, one revision. This document settles
them. It is written so that a drafter can apply it without re-reading the
tracks, and so that a later pass does not re-derive any of it.

Everything below was checked against the rendered boards, not against the
markup. Renders and measurement scripts: `tmp/decide-1.8/`. Nothing in the
repo and no `.dc.html` was modified in this phase.

The two user points, restated as they will be answered:

1. Pop-overs hide advanced features, keep them one click away, and stay
   anchored to their parents. We are not using them consistently. -- Sections
   A and B settle the rule; section D applies it per activity.
2. The legend has grown until it reads like a second panel. Is the
   information needed, is it repetitive, does it belong in a panel? --
   Section C answers all three in plain words.

---

## Contents

- A. The pop-over rule: one test, one veto, four riders
- B. The anchor rule: one rule, seven families, ten corrections
- C. The legend: the decision, and what it costs
- D. The section splits, checked against the test and the floor
- E. The four conflicts, resolved
- F. Rejected, with reasons, so they are not re-proposed
- G. Artboards this revision requires
- H. Net effect

---

# A. The pop-over rule

## A1. The door test -- one test, stated as a test

**Does this control sit at a default that most instances never leave, AND can
the row it leaves behind still report whether THIS instance left it? Both
yes: it goes behind the door on that row. Either no: it stays resident.**

This is the first test applied to any single control. 6.11's existing three
questions keep deciding what SURFACE a group of controls gets (dialog,
pop-out, inline); the door test decides where a single control LIVES once that
surface exists.

**Rationale.** The line is drawn by a conjunction, and every single-property
version of it has a counter-example inside Figma itself:

| Refuted test | Counter-example |
|---|---|
| Frequency alone | Layer opacity is rarely touched and stays resident; font size is touched constantly and is also resident |
| Room alone | "Show behind transparent areas" is one checkbox and lives inside the effect popover, while the 224px Fill row stays out |
| Per-item-ness alone | Export configurations are per-item and their scale and suffix stay resident |

What survives every case is the conjunction. Everything Figma puts behind a
gear passes both clauses: constraints default to Top and Left, decoration to
none, letter case to as-typed, dash to solid -- and the row each leaves behind
still reports the deviation, because a dashed stroke looks dashed on the
stroke swatch, an uppercase run looks uppercase in the layer, a shadow's
spread is visible in the shadow. Everything Figma keeps resident fails one or
both: the fill colour, the font size, the auto-layout gap and the export scale
have no default worth speaking of, and the panel row IS the report.

Clause (b) is not a new obligation. It is 6.11's stub obligation, restated as
half of the test rather than as a separate paragraph, so that the test and the
obligation cannot drift apart.

**Relation to Rule 7a.** 7a decides whether a row RENDERS; the door test
decides where a row LIVES when it does render. Where a control is both
defaulted and non-deviating, 7a wins and nothing is drawn at all; the door
exists so the reader can reach the control to CREATE the deviation, which 7a
alone leaves unreachable.

**Spec text.** 6.11, as a new paragraph immediately before "Applied as three
questions":

> One further test decides a single control rather than a surface, and it is
> applied first. Does the control sit at a default that most instances never
> leave, and can the row it leaves behind still report whether this instance
> left it? Both yes: it goes behind the door on that row. Either no: it stays
> resident. The second clause is the stub obligation below, stated as half of
> the test so the two cannot drift apart. Three single-property versions of
> this test were tried and refuted, and are recorded so they are not
> re-derived: frequency (layer opacity is rare and resident; font size is
> constant and resident), room (a one-checkbox option sits inside a popover
> while a 224px row stays out) and per-item-ness (export configurations are
> per-item and stay resident).

**Affected artboards:** every board with a gear or a door -- PresentPanel,
StylePanel, StyleDiverging, StyleFromAnalysis, StyleLibrary, AnalyzePanel,
AnalyzeSweep, ExplorePanel, DataPanelLoaded, ImportOptions, ImportRecognised,
TableJoin, SettingsPerformance, SettingsShortcuts, AiPanel, InspectorGenomics.

## A2. The counter-rule: the one class that vetoes the test

More important than the rule, and Figma has paid for it. Figma hid Constraints
behind a small button in the Position section in UI3. The complaint thread is
titled "UI3 feedback: constraints settings are hidden" and reads "Now a quick
glance at Constraints won't work, you'll have to take a closer look". Figma
reversed it and shipped the inline toggle.

Constraints passes clause (a) perfectly -- a default of Top and Left -- and
its failure is a class the test cannot see: **a wrong value that is invisible
until it does damage.** A wrong constraint is invisible until the frame is
resized.

**6.10a, new subsection immediately after the seven floor items, headed "What
stays resident though it is rarely used":**

> A control whose wrong value is invisible until it does damage stays resident
> however rarely it is touched, and may not become gear contents at any
> density. In this set that is: the export Scope select (a wrong scope
> silently exports the wrong graph -- but see D1, where the canvas export
> frame hint carries the report instead and the select is therefore legally a
> door); the Weight and Treat as pair in Analyze (a wrong weight sense
> silently inverts every path result); and the import Positions checkbox.

Three further classes were proposed as counter-rules and are NOT written as
vetoes, because the door test already refuses them at clause (a): a report of
what is currently true has no default; a scan surface of the user's own
strings has no default; and the entry to a capability is the door row itself,
which the stub obligation already keeps resident. They are recorded here so
that a later pass sees they were considered and found derivable.

**Consequence for this revision:** Analyze's Weight and Treat as pair is
correctly resident on AnalyzePanel and must not be folded into the parameters
gear in a later compaction pass. Inside the Import options dialog the same
pair IS legal behind the Role chip, because the chip prints the value as a
dimmed suffix ("Weight strength") -- the value stays visible and only the
editing moves, which is what makes it not-silent.

**Affected artboards:** AnalyzePanel, AnalyzeSweep, ImportOptions,
ImportRecognised, ImportLargeFile, PresentPanel.

## A3. The depth obligation: one click, counted from the row that owns the property

The user's promise is testable and it half-holds. Counted from a resting
Design panel in Figma: letter case is one click (Type settings gear, Basics
tab already showing); miter angle is one click (Advanced stroke). SVG "Outline
text" is three, two of them ordered, because the export configuration does not
exist yet. The pattern in the refutation is not a disclosure failure: in the
first two cases the thing that owns the property already exists and in the
third it does not. That is our state axis (6.1) and our tier axis (6.2) being
counted together, which is a measurement error.

**Spec text.** 6.11, a fourth obligation under "Three obligations make a
pop-out legal", which becomes four:

> The depth. Exactly one click from the row that owns the property. A door may
> not sit behind another door, and no pop-out may be reached only through a
> second pop-out -- the nesting limit already forbids a pop-out opening a
> pop-out, and this states the reader-facing consequence. Where the owning row
> does not exist yet, the create click is charged to 6.1 and not to this
> obligation; a panel is not in breach because an unadded export configuration
> costs a plus first. Audit every door by walking from the row that owns the
> property, with the owning thing present.

**Forbidden by name from this revision forward:** the Advanced parameter block
behind the History door; the export options behind a Reports door; gradient
handle editing as its own pop-out opened from the ramp pop-out (see D2, where
it becomes a section of that pop-out instead).

**Affected artboards:** PresentPanel, StylePanel, StyleDiverging, AnalyzePanel,
AnalyzeSweep, StyleFromAnalysis.

## A4. The discriminator: a door must buy something a collapsed section cannot

6.11 decides dialog versus pop-out versus inline, and never decides pop-out
versus collapsed section. That gap is why the boards run four mechanisms for
one job: proper anchored pop-outs (FilterBuilderExpert's rule editor),
collapsed sections (Main's nine), a plain "More..." text row hiding two
sections (TimeSlider), and resident verb stacks (MultiSelection). It is a
large part of what the user is seeing.

**A door must buy one of exactly three things a collapsed section cannot give:
width beyond the 256px band; survival across a selection change; or leaving
the rows below operable while it is open. A candidate that buys none of the
three is a collapsed section, because a closed section and a door cost the
same single row and the door adds a click for nothing.**

Worked, in both directions: Schema is a door -- the type-pair matrix cannot be
drawn honestly at 256, so it buys width. Counts is a section -- it is
consulted, not operated, and it buys none of the three. The Selection
statistics third column is a door -- an A / B / Graph / Delta table does not
fit 256. Metric histograms is a section -- a reader comparing five
distributions cannot open five doors.

**This discriminator overturns two proposed splits.** The Recipes library in
Analyze and the Styles library in Style were both proposed as doors on the
argument that they grow without bound. They buy none of the three, so under
the rule they are wrong and the rule stands: both stay collapsed RT-8
sections, and RT-8's trailing slot carries what the door stub would have
carried -- the recipe count for Recipes, the active style's own name for
Styles. That is the same information, in the same one row, with no new surface
and no extra click. Recorded here because both tracks proposed the door
independently and a third pass would propose it again.

**Spec text.** 6.11, appended to the three questions:

> Where question 3 sends content inline, one further question decides pop-out
> from collapsed section: does a door buy width beyond the 256px band,
> survival across a selection change, or leaving the rows below operable while
> it is open? None of the three: it is a collapsed section, whose RT-8 header
> carries in its trailing slot the one fact a door stub would have carried.

**Affected artboards:** AnalyzePanel, StylePanel, StyleLibrary, Main,
ExplorePanel, ExploreNotesList, TimeSlider.

## A5. One property, two homes, decided by scope

The cleanest thing in Figma's model and the one that resolves several
ambiguous cases here. Blend mode has three homes at once: for a whole layer it
is resident in Appearance; for a fill it is inside the colour picker popover;
for an effect it is on the effect. Same property, same control, three
placements, decided by nothing but scope. Opacity does the same.

**Spec text.** 6.9, appended to RT-1's door rule:

> A control may have two homes when it applies at two scopes. Per-selection or
> per-graph: resident. Per-member of a list the surface already shows: behind
> that member's own door, and repeated there rather than moved there. A
> duplicate at two scopes is not a hygiene failure and must not be
> deduplicated by a later compaction pass; 5.1's One fact, one region forbids
> the same FACT in two regions, and this licenses the same CONTROL at two
> scopes, where the facts are different facts.

**The three cases in this set that it licenses:** the scale curve is
per-channel and belongs in the channel's RT-4 trailing glyph (already
correct), while a graph-level scale family, if ever added, would be resident;
a per-layer "Which nodes" rule stays resident on the layer while a per-rule
match count stays in the rule row; opacity, where it exists, is resident on
the row it modifies and repeated inside any picker that row opens.

**Affected artboards:** StylePanel, StyleDiverging, StyleLibrary,
InspectorGenomics, FilterBuilderExpert.

## A6. The stub, made drawable

No board in the set draws this, and it is the only signal a reader has that a
door hides a non-default.

**Spec text.** 6.11, appended to the stub obligation:

> A gear or door glyph draws in the dimmed ink when everything behind it is at
> its default, and in the primary ink when anything behind it is not. It
> renders at every density. Where a hidden option creates a departure that
> 6.10 item 2 requires be named, the departure line renders resident under the
> section that owns the door, not inside it.

**Affected artboards:** every board with a gear -- PresentPanel, StylePanel,
StyleFromAnalysis, StyleDiverging, AnalyzePanel, AnalyzeSweep, ExplorePanel,
TimeSlider, DataPanelLoaded, TableJoin, SettingsPerformance.

---

# B. The anchor rule

## B1. One rule for every transient surface

Nineteen transient surfaces are drawn open across the 48 boards. Measured
against their openers: five are anchored exactly, four are anchored to the
wrong edge of the right control, four have no measurable relationship to any
opener, one is a near miss, one is a centred dialog that should have been
anchored, and six of 6.11's own twelve worked examples are never drawn open at
all. Each drawn case was placed by a different agent's judgment, because
6.11's Anchor paragraph gives a position for only three families and never
says which axis is inviolate when clearance fights the anchor.

**The rule. A transient surface never chooses its own position; it inherits
one from its opener on both axes. One axis carries the GAP: 8px clear of the
opener on the side the surface opens from, or 12px when the surface floats in
the canvas overlay layer. The other axis carries a SHARED EDGE LINE with the
opener's anchor box: top edge to top edge for a surface that opens sideways,
near side edge to near side edge for one that opens up or down. When the
surface will not fit, the gap to the opener is the LAST thing surrendered and
the shared edge line is the FIRST: buy clearance by sliding along the
shared-edge axis, then by flipping the edge line to its opposite pair
(top-to-top becomes bottom-to-bottom), then by dropping a width rung, and only
then by opening centred over the canvas with "from <opener name>" in the
header. A surface whose edge line ends more than 32px -- one header height --
from its opener's anchor box after all of that is not anchored, and must take
the centred form and say so.**

The invariant behind it, in one sentence: **the surface preserves whichever
relationship to its opener carries the meaning, and spends the other one.**

This subsumes and replaces 6.11's "They flip vertically when the bottom would
cross the status bar, and never horizontally". For a vertical-strip opener
(activity panel, inspector) the gap axis is horizontal, so horizontal is
preserved and vertical is spent -- which is exactly what 6.11 says today and
what Main's Schema pop-out does correctly. For a horizontal-overlay opener
(the time bar, the canvas toolbar) the gap axis is vertical, so the 12px gap
above the bar is preserved and HORIZONTAL is spent. On a horizontal bar the
vertical gap is what says "this bar's" and the horizontal position says
nothing, which is why rising to clear the legend is the one move that destroys
the tether.

**Two further clauses that make the rule complete:**

- The anchor box is the opener's smallest focusable ancestor that draws as one
  control. For a split button that is the whole button, not the caret half.
- Second height cap: a pop-out is never taller than half its owning region, so
  the flip is always available. This sits alongside 6.11's existing cap of the
  region height minus 32; the smaller of the two binds.
- A surface narrower than 280px carries an 8px caret at the anchored edge
  instead of an edge line, because nothing aligns meaningfully to a 14px
  control.

**Spec text.** 6.11, replacing the Anchor paragraph's first sentence and its
"flip vertically, never horizontally" clause, with the paragraph above written
out in full, followed by B2's family list and B3's scroll and caret clauses.

**Affected artboards:** TimeSlider, ValidationPopout, MultiSelection,
HistoryPopover, ViewsMenu, StyleDiverging, StyleLibrary, IpadInspector,
DataTableDrawer, ImportOptions, ImportRecognised, ContextMenu, Main,
GroupProfilePopout, CategoryTable, FilterBuilderExpert, AnalyzePicker,
CanvasToolbar.

## B2. The seven families, and the two gap constants

Eleven of the nineteen drawn surfaces belong to families 6.11 never names, and
unnamed families were placed by taste.

| Family | Lane | Gap axis | Shared edge line |
|---|---|---|---|
| Top bar | opens down, top = 40 (the top bar's own bottom edge) | vertical, 8 | opener anchor box left edge |
| Activity rail | opens right, left = 56 | horizontal, 8 | button bottom to menu bottom |
| Activity panel | opens right, left = 336 | horizontal, 8 | row top to pop-out top |
| Inspector | opens left, right = 1152 | horizontal, 8 | row top to pop-out top |
| Canvas overlay | opens away from its overlay | 12 | the overlay's near end aligned to the opener |
| Dock (data table drawer, report editor) | opens up inside the dock | vertical, 8 | column or row edge; caret required |
| Dialog | opens beside its opener inside the dialog rect | 8 | row top to pop-out top |

Two exceptions take no lane: a context menu takes the pointer, and a preview
takes the centred home 6.11 already gives it.

**The two gap constants, and which applies.** Every canvas overlay on every
board uses a 12px inset from the canvas rect: the legend at x 892 with its
right edge 1148 against a canvas right of 1160; the minimap at x 340 against a
canvas left of 328; the toolbar bottom 864 against a canvas bottom of 876.
6.11 currently says 8 for everything, which is why stacked pop-outs sit 4px
out of line with the legend.

> 8px is the gap between a pop-out and the shell region boundary it sits
> beside (left edge 336 beside the panel, right edge 1152 beside the
> inspector). 12px is the inset used by anything that floats in the canvas
> overlay layer, matching the legend, minimap, toolbar and time bar. A pop-out
> that sits in the overlay layer -- canvas-anchored, or a panel or inspector
> pop-out that has slid over the canvas -- takes 12.

**The dialog lane is a change, and it unblocks the whole import track.**
DECISIONS-1.7 POP-3 read 6.11's silence about dialogs as a prohibition ("6.11
forbids a pop-out opening from inside a dialog"). Under that reading no
anchored pop-over is legal inside the Import options dialog, which is the
largest surface in the Data track. The actual constraint 6.11 states is a
NESTING limit, and a lane table that was not written for dialogs.

> Multiplicity: at most one per region, and a dialog is a fourth region for as
> long as it is open; the pop-out closes with the dialog. A 3b dialog may open
> one pop-out; that pop-out may not open a second, and Escape closes the
> pop-out before the dialog.

**Amend DECISIONS-1.7 POP-3's stated reason** so it says what it means: the
validation ISSUES stay inline inside Import options because errors there gate
the Import button and because the issue list is a scan surface of floor-7 ids
-- not because a dialog cannot host a pop-out.

**Affected artboards:** HistoryPopover, Main, StyleLibrary, DataTableDrawer,
StyleDiverging, IpadInspector, ImportOptions, ImportRecognised, ContextMenu,
AnalyzePicker, TimeSlider, GroupProfilePopout, CategoryTable.

## B3. The caret, and what happens when the panel scrolls

Two additions that turn a legal anchor into a visible one.

**The caret.** On ValidationPopout the pop-out's top edge is at y 90 while its
opener sits at y 452, in a lane that also serves Columns, Formulas, Cleaning
steps and Mappings -- four other section headers that could each have opened
it. The opener being lit is the only mark of the relationship, and it is 362px
away.

> A pop-out carries a 6px caret on its leading edge -- the left edge for an
> inspector pop-out, the right edge for an activity-panel one -- positioned at
> the vertical centre of its opener's row and clamped 12px inside the pop-out's
> own corners. A surface narrower than 280px carries an 8px caret instead of an
> edge line (B1). The caret ships with the pop-out shell, not per case.

**Scroll.** 6.11 today says a pop-out "stays open at its last position with the
opener still lit: the title is the anchor, not the pixel". A pop-out frozen at
a pixel while its row is gone is the detached surface the user is complaining
about. Replace the second half:

> A pop-out follows its opener while the opener is in the region. When the
> opener scrolls out, the pop-out docks to the edge it left through, keeps the
> opener lit, drops its caret, and grows a 20px return strip in its header
> naming the opener with a chevron that scrolls it back. When the opener's
> section collapses, or the region changes activity, the pop-out closes.

**Affected artboards:** ValidationPopout, DataPanelLoaded, TimeSlider,
FilterBuilderExpert, GroupProfilePopout, HistoryPopover, Main, MultiSelection,
SHELL-SKELETON.html (the pop-out shell gains one element and one strip).

## B4. The audit: ten corrections, measured

All measured on the rendered boards at 1440x900 inside a 1600x1000 viewport.
These are drafting corrections, not spec changes, except where noted.

| Board | Drawn | Opener | Fault | Correction |
|---|---|---|---|---|
| TimeSlider | pop-out [868,343 280x202] | bar gear [1124,813 24x24] | 268px above its own gear, stacked on the legend [892,553 256x241], so the right-edge alignment at 1148 is invisible | Keep the 12px gap to the bar; slide along the bar. Bottom 794, right edge 884 (8px clear of the legend's 892 left edge): **[604,592 280x202]**. It may cover the toolbar and the minimap, which are dismissible chrome; only the legend is floor item 5. With the legend hidden it returns to right edge 1148 on the gear |
| TimeSlider | two openers titled "Time slider settings" -- panel gear [263,403] and bar gear [1124,813] | -- | the pop-out is anchored to neither | A pop-out reachable from more than one opener is anchored to the opener that was used, and its lane follows that opener's region. The palette route, which has no on-screen opener, opens it in its home panel's lane and lights that row. 6.5's remembered pinned position is stored per opener, not per pop-out type |
| ValidationPopout | [336,90 360x470] | row [64,452 255x32] | lane correct, 362px above its row; a 470px pop-out cannot sit top-to-top at y 452 in a 40-to-616 region | Flip the edge line: bottom to bottom. Region 40 to 616 (usable bottom is the open drawer's top), height cap 288, so **[336,196 360x288]** with its own scroll region. Bottom 484 on the row's bottom 484 |
| MultiSelection | [792,412 360x238] | row [1177,183 255x32] | lane correct, 229px below the opener, with nothing forcing it -- anchored at 183 it would end at 421 and the legend does not start until 682 | **[792,183 360x238]**. No spec change; the same design gets this right three times elsewhere |
| HistoryPopover | [554,44 360x446] | History caret [579,8 16x24], Undo half [554,8 24x24] | left-aligned to the half rather than the split button, gap 12 not 8 | Anchor box is the whole split button, so left 554 is correct; only the gap changes: **[554,40 360x446]**, top on the top bar's own bottom edge. Escape returns focus to the caret |
| ViewsMenu | [581,483 248x341] | Views button [687,832 36x28] | centre-anchored; right edge 829 overhangs the opener by 106 and the toolbar's right end by 102 | Right-align to the opener and sit 8px above it: **[475,483 248x341]**, right edge 723 on the button's 723, bottom 824 |
| StyleDiverging | confirm [872,446 280x109] | Size > Bridges row [1177,470 255x32] | 24px high, sitting under the section header rather than on the row that raised it | **[872,470 280x109]**. And see D2 / XC: a cost gate is not a floating card at all |
| IpadInspector | confirm [652,559 236x81] | ambiguous between the "All 12,412" chip at y 417 and "Select neighbors" at y 694 | no relationship to any opener; right edge 12px clear of the inspector where 8 is the panel-boundary constant | Name the opener explicitly, then **[656,417 236x81]** from the "All 12,412" scope chip, right edge 892, 8px clear of the inspector's 900 |
| StyleLibrary | "Save as style" [480,321 480x258] with a full-screen scrim, and the section overflow menu drawn open beneath it | Styles header bookmark button [295,478 24x24] | a centred modal for something that commits no data, which fails 6.11's own first question; and two transients of different classes open at once | **[336,474 280x258]**, panel lane, top on the section header row's top. The scrim goes, the overflow menu closes. Add to 6.11's worked examples: "Save as style / pop-out, 280, from the Styles header bookmark button / It names one member of a list and commits nothing the canvas must wait on" |
| DataTableDrawer | info bubble [732,721 250x58] | column info circle [848,701 14x14] | centre-anchored with a 6px gap, and it covers the betweenness value in all three visible rows | **[848,721 250x58]** with an 8px caret at x 855; and the flip above the header row is mandatory when the bubble would cover that column's own cells. Same treatment for ImportRecognised's in-dialog bubble |
| Main | rail Help menu [52,751 200x117] | Help button, bottom 872 | 4px off the rail lane and 4px off the button's bottom | left 56, bottom-aligned to the button's 872 |
| GroupProfilePopout | bottom 705 against a legend top of 709 | -- | a 4px gap where the overlay inset is 12 | bottom 697 |

**One spec addition this audit forces.** 6.11 does not list a confirm as a
governed surface, so the two cost and cap confirms were drawn as free cards:

> A cost estimate, cap or destructive confirm is a pop-out with two verbs, not
> a floating card. It takes its region's lane and its opener row's shared edge
> line, its width comes from the same ladder (280 for a sentence and two
> buttons), and Escape cancels and returns focus to the opener. It carries no
> close X: a dismissible warning about spending forty seconds is not a
> warning.

**One review clause, added to the artboard review pass:**

> Every pop-out's shared edge line is within 8px of its opener's anchor box
> unless a named obstruction is recorded in that board's own comment.

## B5. The five that are already right, recorded so a later pass does not undo them

Cite these by pixel in 6.11's Anchor paragraph, so the rule has geometry
attached and a later pass has something to measure against.

| Board | Pop-out | Opener | Match |
|---|---|---|---|
| Main | Schema [672,473 480x295] | inspector row [1177,473 255x32] | top 473 on 473, right edge 1152 |
| GroupProfilePopout | group profile [792,226 360x479] | row [1177,226 255x24] | 226 on 226 |
| CategoryTable | Categories [792,300 360x260] | row [1177,300 255x32] | 300 on 300 |
| FilterBuilderExpert | filter rule [336,277 360x217] | rule row [64,277 255x32] | 277 on 277, panel lane 336 |
| AnalyzePicker | method preview [604,376 280x163] | -- | correctly centred on the canvas band's centre and correctly unanchored; a preview takes no lane |

---

# C. The legend

## C1. The decision, in plain words

**The legend splits by audience. The canvas keeps a READING legend. The export
gets a COMPLETE legend, composed into the image.**

The user asked three questions. Three answers:

**Do we need the information?** Yes, all of it -- but two different readers
need it and only one of them is looking at a screen. Measured over all 43
legend instances and their 480 rendered lines, 61.3% of what the legend says
appears nowhere else on its own board, and the two line kinds with the highest
uniqueness are precisely the two the export needs: the scale word (0%
duplicated, 45 instances) and the median (4% duplicated, 45 instances). Those
two were deliberately moved OUT of the Style panel by 5.3 and into the legend,
on export grounds. Deleting the legend deletes 294 facts.

**Is it repetitive?** Yes, measurably, and unevenly. 38.8% of legend lines
restate something already visible on the same board; per board the duplication
runs 0% to 86%, median 43%. But the redundancy is INVERSE to the size: the 18
legends at or under 80px are 49% duplicated and their entire unique payload is
15 scale words, 15 medians and a handful of endpoints, while the 6 legends
over 240px are 70% unique. The legends that most look like a second panel are
the ones least guilty of repeating one. The repetition is concentrated in
exactly two places: the inspector's reading sentence, which on 18 boards
prints an entire Color block word for word ("58 of 96 accounts, 29 of 48
devices, 20 of 34 phone numbers and 13 of 22 merchants"); and the panel or
result card that already lists every category.

**Should it be a panel?** No. It already has a panel -- the Style layer
inspector -- and that panel does not solve the reading case, because it only
fills when a layer is selected in Style. And a panel cannot be exported while
a legend must be. 6.11's worked-examples table already refuses this and 6.10's
preamble already binds "the legend with the canvas". The verdict stands; what
was missing was the argument, which C7 writes down.

**What the user is seeing is real, and it is a text-surface problem rather
than an area problem.** As a rectangle the legend is not another panel: median
5.13% of the canvas, median 15.2% of the activity panel's area. As a writing
surface it is one to the pixel: its content column is 238px against the Analyze
result card's 237px, it packs 2.1x the text lines per unit area of the panel,
and on CompareSplit the view-B legend draws 32 text lines against that board's
own 27-line Analyze panel. It is not complex; it is a function of how many
channels the user encoded, and four encoded channels is four blocks that no
rule can shrink without lying.

**The deciding fact, checked in the code, not asserted.**
`graphty-element/src/screenshot/ScreenshotCapture.ts` exports by calling
`CreateScreenshotAsync(this.engine, this.scene.activeCamera, ...)` -- a Babylon
scene capture. The only `drawImage` calls in the file are format conversion
and resize. There is no overlay compositing and no `html2canvas`. The legend
is a DOM overlay in the shell, outside that canvas. **So the exported image
contains no legend at all today, and it physically cannot contain the DOM
one.** Every completeness requirement in the requirement set -- W20's success
criterion, W22 phase 5, W25 phase 4, and the genomics persona's "figures that
need to be rebuilt in Illustrator because the legend is not exported" -- is an
export requirement that must be met by a composed legend either way. Once that
legend exists, canvas completeness is redundant. The design has been paying
for export completeness in canvas pixels for a legend the export never
received.

**Who reads it, checked in the requirements.** 6 of 25 workflows require
legend-display. 1 of 12 personas mentions a legend at all, four times, all
four about the exported figure. Of the 15 substantive prose mentions across
the workflows, 13 are explicitly about the exported image, 1 is about
authoring a legend onto the canvas, 1 is ambiguous. No workflow task phase
describes reading the on-screen legend as an interpretation step.

## C2. Floor item 5 splits into an export obligation and a screen obligation

Floor item 5's own justification clause is the export -- "because the legend
travels inside an exported image where no one can hover a glyph" -- and it is
currently being enforced on the screen, where the reader CAN hover and where
the panel next to it often prints the same thing. That is the source of the
growth. The floor stays seven items strong; item 5 is clarified, not weakened,
and its export half is strengthened from "words in an image" to "an image that
actually contains them."

**Spec text.** 6.10 item 5, replacing the current single paragraph:

> 5. The legend line for every encoded channel, in two obligations.
>
>    **Export, absolute.** Every exported image, at every scope, carries a
>    legend composed from the encoding model: every encoded channel with its
>    channel word, attribute, domain endpoints, median or midpoint and the
>    scale in words; the twelve largest categories with their counts and the
>    coverage footer; every departure line, including the clamp line and "not
>    measured (N nodes)"; and one row per state drawn in the exported frame,
>    because a static figure has no filter strip, no status bar and no result
>    card to name them. No compaction, no user setting and no visibility
>    toggle reduces it.
>
>    **Screen.** The canvas legend carries one block per encoded channel:
>    channel, attribute, domain endpoints with the median or midpoint, the
>    scale in words, and every departure line. RT-4 may reduce a scale to a
>    trailing glyph in a panel; it may not in the legend. Category counts,
>    category rows past the canvas cap and the state rows are not floor items,
>    and their homes are named in C3.

**Affected artboards:** all 42 boards that draw a legend, plus PresentPanel
and one new ExportLegend board (G).

## C3. What leaves the canvas legend, and where it goes

Three unconditional cuts. Unconditional is the point: the current rules are
conditional in three separate ways ("counts render whenever the panel does not
list every group", the Compare exception, the drawer compaction), which is why
the measured duplication per board runs 0% to 86% and why CategoryTable
breaks the counts rule while AnalyzeSweep keeps it.

**1. The state-row block leaves the canvas legend entirely.** Ten of the 43
instances carry state rows -- 17 rows in total -- and on the light boards they
are the majority of the legend: ExplorePanel's legend is 141px of which one
Size block is 80. These are not the user's data and they are not encoded
channels; they are app chrome, constant across every dataset, learned once,
and caused by an action the reader just performed. 5.1's One fact, one region
already assigns their content elsewhere: the filter strip names the active
filter, the status bar reads "120 of 200 nodes", the time bar's Viewing
readout and the status bar Viewing slot name the window, the path result card
names the path, the inspector header names the selection. **They render in the
exported legend, which has none of those regions, and in Help's "What the
marks mean". They do not render on canvas.**

**2. Category counts leave the canvas legend.** 164 count lines across 15
instances. This saves no height -- counts are right-aligned on rows that exist
anyway -- and it is a duplication and rule-count change, not a size change,
which is stated plainly rather than claimed as pixels. What it buys is one
rule instead of three, and one performance consequence: 5.3's per-step time
summary currently recomputes the legend's category counts on every scrub, and
after this change the legend is scrub-invariant. **They render in the groups
table, the result card, the Schema table and the exported legend.**

**3. The canvas categorical block caps at five rows plus Other; the export
keeps twelve plus Other.** Only five instances carry more than five
categorical rows -- ExplorerLargeGraph 12, CompareSplit view B 11,
AnalyzeSweep 7, CategoryTable 6, StyleFromAnalysis 6 -- so the cap costs
almost nothing across the set, and where it bites it bites the least
informative rows in the product: "Group 1" through "Group 11", ordinal labels
whose swatch-to-name mapping carries rank and nothing else. Where the names
mean something -- Accounts, Devices, Phone numbers, Merchants -- there are
four and the cap never fires. Five plus Other also matches the conventions the
shell already uses for the same information: the inspector's "Most connected:
top 5", the result card's "2 of 4 members". **The Other row absorbs the
coverage footer rather than sitting above a second line saying the same thing,
and it stays the click target that opens the groups table.**

**Spec text.** 5.1 Legend and Legend hygiene, replacing the counts clause and
the 12-category clause:

> Categorical legends on canvas show the five largest categories by member
> count and then one Other row in the neutral the canvas paints for the same
> nodes, reading "Other (3,388 groups, 43% of nodes)"; clicking Other opens
> the groups table. The coverage footer is not a separate line: the Other row
> carries it. The canvas legend draws no category counts and no state rows.
> The exported legend shows the twelve largest with counts, the coverage
> footer, and one row per state drawn in the frame.

The One fact, one region table row changes to: "A group's member count | the
group table, the result card and the exported legend | the canvas legend".
The row for note count is unchanged.

**Affected artboards:** ExplorerLargeGraph, CompareSplit, ExplorerExpert,
ExplorePanel, ExplorerNotes, ContextMenu, MultiSelection, InspectorGenomics,
FilterBuilderExpert, TimeSlider, AnalyzeSweep, StyleFromAnalysis,
CategoryTable, AiPanel, CanvasToolbar, DataPanelLoaded, ExploreNotesList,
ImportAddToGraph, Main, ViewsMenu, plus every board whose legend carries a
count.

## C4. The exported legend

This is the half that keeps the constraint true, and it is the half that does
not exist today. Three gaps, all of which must close in the same revision as
the cuts, or the cuts are a loss.

**Spec text.** 5.3 Present, tier 2 Image export options, and 5.1 Legend:

> Include legend, default on. The exported legend is composed from the
> encoding model at the export's own scale -- not captured from the canvas
> overlay, which a Babylon scene capture cannot see -- and it does not depend
> on the canvas legend's visibility: hiding the legend with L or with Style's
> Show legend switch does not remove it from an export. In the SVG and PDF
> paths it is emitted as vector text, because editing the legend in
> Illustrator is exactly the rebuild the genomics persona is trying to avoid.

**Rule 7a exception, and where the floor-4 report actually lives.** Present's
Rule 7a says an option at its default is not drawn, so "Include legend", on by
default, would not render -- and the one persona frustration in the whole set
about legends would be answered by a control the user never sees. It is
resolved without an exception to 7a: the control itself goes behind the Image
options door (D1), and the promise becomes visible on the canvas where the
picture is, by extending the export frame hint:

> Export frame: current view, 832 x 836, about 20 nodes in frame; legend: 2
> channels

That hint is resident, it is floor item 4 ("what a control will do, before it
does it"), it reads "legend: off" when the option is turned off, and the Image
options gear draws primary in that case (A6). This is strictly better than a
checked checkbox in a panel, and it is the resolution of the direct conflict
between the Present split and the legend track.

**New implementation work in graphty-element,** recorded so the design does
not promise what the code cannot do: compose the legend block at export scale
into the existing 2D-canvas stage of `ScreenshotCapture.ts`, in the PNG, JPEG,
WebP, SVG and PDF paths.

**Affected artboards:** PresentPanel, and one new ExportLegend board (G).

## C5. Compare draws shared channels once

CompareSplit spends 548px of legend on 832px of canvas -- 218 in half A and
330 in half B, each 256 wide inside a 416-wide half, so each legend covers 62%
of its own half's width. The duplication is not subtle: the Size block is
printed twice identically (the spec acknowledges it by making B's header read
"size as A"), the diff key is printed twice, and "Moved 22" appears a third
time on the Difference chip at top centre, which is the region that owns it.

> Each half draws only the channels whose encoding differs between the halves.
> A channel encoded identically in both is drawn once, in a shared strip that
> rides 12px above the canvas toolbar on the toolbar's own offset ladder (the
> toolbar does not move). The diff key lives on the Difference chip and is not
> repeated in either legend. The exported image of a Compare view carries one
> composed legend that names both halves and carries the diff key.

This deletes 5.1's "Legend, view B (size as A)" header and its counts
exception. The exception is only safe to delete because side B's group sizes
are reachable in the Data table drawer (5.3 makes side B metrics drawer
columns) and on each result card's "See all N groups". If that turns out
false in drafting, the counts exception returns for Compare only and nowhere
else.

**Affected artboards:** CompareSplit.

## C6. The cap, and the compact form

**On-screen cap 334 -> 240.** After the cuts the tallest legend in the set is
about 215 (ExplorerLargeGraph). 240 is not a chosen number: StyleDiverging
measures 240 today with three channels, zero counts and zero state rows, so it
loses nothing under C3 and it is the measured height of a legend that is
entirely floor. The cap therefore binds nothing today and forbids regrowth.
Above the cap, categorical blocks shorten by one row at a time from the
smallest channel upward; a block is never dropped, only shortened. The export
legend has no cap.

**The compact form stops being a third component.** 5.1 and LEGEND-1.8 section
6 specify the drawer-open compact legend separately. Under C3 it becomes one
subtraction from the reading legend -- drop the swatch rows and the ramps,
keep the header lines -- which is exactly the 44px box already drawn on
DataTableDrawer and ValidationPopout. Same 256 width, same right edge, no
scroll.

**Unchanged, and stated so:** width stays 256, so 5.6's 622px two-line reflow
arithmetic (172 + 16 + 246 + 16 + 172) is untouched and there is no ripple
into the toolbar or the bottom stack. The legend stays bottom-right at the
12px inset and never moves; floor item 5 and 6.11's second clause are intact.
6.11's clearance clause survives, but under B1 a canvas pop-out now buys
clearance by sliding rather than by rising, so a shorter legend makes the
centred fallback rare rather than making the clause unnecessary.

**LEGEND-1.8 section 3's "the scale word is always printed, even when it is
the default" is kept, on both surfaces.** It is the highest-uniqueness line in
the entire 480-line inventory -- 45 instances, 0% duplicated anywhere on any
board -- and it is the single clearest thing the legend says that nothing else
does. 6.9's "only a non-default scale prints its name" stays overridden here.

**Affected artboards:** every board with a legend; LEGEND-1.8 sections 1, 4,
5 and 6 are rewritten by C3 and C6.

## C7. Refusals, argued rather than asserted

6.11's worked-examples table keeps its "the canvas legend | inline, refused"
verdict and its Why is extended so this does not come back a third time:

> inline, refused -- floor item 5, whose justification is the exported image.
> A pop-out is dismissible and a legend is not; a panel is not exported and a
> legend is; and a panel that would hold it (the Style layer inspector)
> already exists and only fills when a layer is selected in Style. The size
> complaint is answered by the two obligations in 6.10 item 5, not by a new
> surface.

Add one row: "The legend's state-row block | delete, not move | App chrome,
not an encoded channel; every state is already named by the region that owns
it, and the export legend carries them because a static figure has no such
region."

---

# D. The section splits

Every split below was checked against the door test (A1), the counter-rule
(A2), the discriminator (A4) and the 6.10 floor, which is absolute. Where the
floor and a split collided, the floor won and the split changed; those cases
are named.

## D1. Present -- the largest change in the set, and the user's instinct holds

**Measured resting state.** PresentPanel draws 28 resident rows -- 6 section
headers and 22 content rows -- from y 85 to y 842 in a 795px content area.
100% full, zero headroom, on a 20-node fixture with no saved reports.

**The finding is not that too much is visible. It is that the doors are
already drawn and nothing went behind them.** The board's own title attributes
read "Image export options" and "Data export options" on two gear buttons, and
then eleven of those options render as resident rows beside the gears. A gear
that opens a pop-over and a panel that draws the pop-over's rows beside it
teaches that the gear is decorative and doubles the panel height for nothing.
That is the inconsistency the user named, and it is Figma's own pattern stated
in reverse -- Figma's min and max dimension fields "will be hidden from the
right panel. To access them again, click on the width or height icon."

**Frequency.** Present is the terminal act of a session, not a working panel.
W15 puts export in phase 5 of 6, after audience assessment, message
crystallization, visualization design and narrative construction. W25 budgets
it 5 minutes of a 21-minute workflow. Nothing in this panel is scrubbed while
watching the canvas, which is 6.2's one protection against tier 3, so the
frequency test applies at full strength.

**The door test, row by row.** Scope, View angle, Background, Include legend,
Include note markers and Publication ready all sit at a default most exports
never leave (clause a), and the export frame hint plus the gear's primary ink
report the deviation (clause b). All six pass. Positions, Separator, BOM,
precision, Include computed metrics, Include notes and Top K per source node
pass the same way.

**Rule 7a removes two rows before any pop-over fires:** Legend and Note
markers are both at their default (on), and "Include notes. This graph has
none yet" is content the data cannot support, which Rule 7c deletes rather
than dims.

**Floor check.** Staying resident at every density: the size estimate before
writing (floor 4, and it is why Format and Scale stay resident beside it,
since a cost with both of its inputs hidden is a number no one can steer);
every ceiling and size warning; the full text of every export verb (floor 4);
the last-export filename (floor 7); the pinned-items list (floor 7); and any
departure a hidden option creates, printed resident under its section (floor
2, which at defaults is nothing at all -- and that silence is Rule 7's
corollary working).

**Three surface-class decisions inside this split.**

- The **report sections checklist** (9 rows) leaves the panel. 6.11: a control
  whose home is a dialog may not acquire a second home. Its home is the report
  editor.
- The **report editor is a non-modal bottom drawer**, beside the Data table
  drawer -- not a dialog and not a pop-out. 6.11's first question is exclusive
  and its list is closed (Import options, Table join, Map identifiers, node
  merging, the computed attribute formula, Run a recipe); report generation is
  not on it, so "If no, it is never a dialog." And it cannot be a pop-out: the
  report-generation capability requires an editable description of up to 2000
  characters plus editable methodology and findings sections, which the 480
  ceiling cannot hold, and 6.11 says what that means -- "Anything wider is a
  drawer or the Data table". Non-modal is not a nicety: W15 phases 3 and 4
  interleave, and a modal forces you to close the editor to fix the picture
  you are describing. **This resolves a standing contradiction between 5.3 and
  6.11.**
- The **More section** (header plus four dimmed rows) becomes a menu. 6.11
  already routes verbs to menus. Export recipe (JSON) and Export as script go
  to the Export data header's overflow; Generate report and Export evidence
  bundle go into the report editor. FLOOR-1.9's clause holds: a menu row keeps
  the verb's full text and its Coming tag, so nothing is un-named.

**Top level after (10 rows):**

- RT-8 Export image, with the gear that opens Image options
- RT-1 pair: Format PNG | Scale 2x -- the two inputs of the resident estimate
- Floor line: 1664 x 1672, about 420 KB (becomes the streaming progress row
  with Cancel above 100 MB)
- RT-7: Copy to clipboard | Export image
- RT-6: Last export cat-social-network.png
- RT-8 Export data, with its gear and its recipe overflow
- RT-1 pair: Format JSON | Scope Whole graph, with "about 6 KB" as the dimmed
  suffix inside the scope field
- RT-7: Copy node ids | Export data
- RT-8 Export video -- door, stub "10 s, Orbit once, WebM"
- RT-8 Reports -- library section, resident plus, RT-6 rows carrying each
  saved report's own name; the pinned-items RT-6 list when non-empty
- Conditional and floor-2 only: a resident departure line under the section
  whose hidden option created it (Publication ready on -> "hides all 20
  labels"; Include legend off -> named)

**In pop-over:**

- **Image options**, 280, from the Export image gear: Scope; Scale, replaced
  by Longest side when the scope is Entire graph, with the "about 0.02 px per
  node" warning above 50,000 nodes; View angle as an RT-3 group; Background as
  an RT-3 group; Include legend and Include note markers as an RT-5 pair;
  Publication ready; a collapsed Image quality group (Supersample,
  Anti-aliasing, JPEG or WebP quality); the SVG element-count warning
- **Data options**, 280, from the Export data gear: Columns picker, Separator,
  BOM, precision, Include computed metrics, Positions, Include notes, Top K
  per source node, Copy as TSV, and an "Other exports" group that renders only
  when non-empty
- **Export video**, 280, from its own door row: Duration, Camera, Format, the
  estimated time, Record; progress and Cancel mirrored in the status bar
- **Report editor** as a bottom drawer, titled with the report's own name: the
  sections checklist as a packed RT-5 block with per-section counts, Title,
  Row cap, Include done notes, the ordered pinned-item rows, Generate report,
  Export evidence bundle
- **A menu, not a pop-over:** Export recipe (JSON), Export as script

**28 -> 10 resident rows, about 795px -> about 330px.** The user singled out
Present and the measurement agrees: it is the largest change in the set by a
wide margin, and it is the only panel where more than half the resident rows
move.

**Affected artboards:** PresentPanel, Main, CommandPalette, plus new
PresentCompact, ImageOptionsPopout and ReportEditorDrawer (G).

## D2. Style -- the sharpest inconsistency in the set is inside one row

**Measured:** 24 resident rows in seven sections, against Analyze's 18 in a
harder activity. Style has one door in seven sections; Analyze has two doors,
a menu, a sheet and a per-card gear.

**The sharpest inconsistency the user asked me to find is inside one row.**
5.3 Style already sends the CATEGORICAL sub-mode of an encodable row out of
the panel -- "a 'Values (N)' table ... in a 280 pop-out from the encodable row
it belongs to" -- and StyleFromAnalysis draws it correctly as a "Values 6"
door. The NUMERIC sub-mode, sitting in the same slot on the same kind of row,
is told to render inline: "Domain (auto min and max, editable, with Clamp
outliers) shown over an inline histogram". StyleDiverging draws the
consequence: Color costs six pitches where the categorical case costs three.
**Two sub-modes of one row, two different disclosures.**

6.9 already disagrees with 5.3 here: RT-1's door rule names "the domain pair
on a Scale field" among the doors of the product. **Resolved for 6.9.** The
room test decides it independently -- the histogram is the only control in the
section that cannot be drawn at 32px, and 6.11's own anatomy is that a thing
needing more than a row is what a pop-out is for.

- The numeric ramp gets **one 280 pop-over from the RT-4 trailing glyph**,
  titled with the channel and its attribute: Scale, Palette family, Midpoint
  where diverging, Domain over the inline histogram with Clamp outliers and
  its live match count, Missing value, Use values as-is, **and gradient handle
  editing as a SECTION of this pop-out** rather than a pop-out of its own,
  because 6.11's nesting limit forbids the second surface and A3 now states
  the reader-facing consequence.
- **Floor keeps three things out of that door.** The Palette select stays
  resident, because LEGEND-1.8 section 2 pins the palette name to Style's
  Palette select and the legend body has no other home for it. The clamp
  departure line ("clamped at -4.2 and 3.8; 12 nodes beyond the ends") renders
  resident under the ramp, because 6.10's separation clause binds a departure
  to the channel it describes. The attribute chip stays resident, because Rule
  6 makes the mode what the field contains.

**Layout parameters -> the gear that already exists.** All three drawn field
rows are at their schema defaults -- `NGraphLayoutEngine.ts` declares
`springLength .default(30)` and `gravity .default(-1.2)`, and Edge weight
defaults to the import Weight column -- so Rule 7a already forbids drawing
them, and 6.2's arithmetic ("a schema group of more than four rows renders as
a 3a pop-out opened from a gear on the row it belongs to") already routes the
rest. This is the same mechanism as the Analyze card gear, verbatim: two gears
in the product, one behaviour. 6 rows -> 1.

**Which nodes does not render at its default.** StyleDiverging draws four rows
for a selector that matches every node, while StyleFromAnalysis on the same
dataset correctly draws none, and 5.3's own worked example says why. Rule 7a.
StyleDiverging's inspector 18 -> 14 from this alone.

**The Styles library stays a collapsed section, not a door.** Proposed as a
door; refused by A4's discriminator, which it fails on all three counts. Its
RT-8 header's trailing slot carries the active style's own name, which is
strictly more information than today, where the active style is a selected
background on a row you may have scrolled past. The departure line an applied
style creates ("Applied Publication style. 2 of 5 layers matched nothing: they
need logFC and padj.") is floor item 2 and stays resident under the header.

**Source may not become a door.** 6.10's separation clause binds the reading
to the run, the departure to the channel, the run record to the run and the
cost estimate to the control -- and all four are inside that one section. If a
later compaction pass gives Source a chevron, the layer stops saying what it
is drawing at the exact moment its parameter is being turned. Written down
because 5.3 already measures the section at 164px and someone will try.

**The cost gate is never a pop-over, in either activity.** StyleFromAnalysis
draws it inline under the Granularity row; StyleDiverging draws the identical
construction as a floating card over the canvas with a pin toggle and a close
X. Floor item 4 and 6.11's second clause decide it with nothing to weigh, and
B4 now governs the shape: a confirm is a pop-out with two verbs, no close X,
and a gate is inline on the control that spends the cost.

**Verbs to menus:** Keep this arrangement, Reset to defaults and Start from
current arrangement move to the Arrangement header's overflow.

**24 -> 14 resident rows, three doors in seven sections.** Show legend, which
5.3 puts at tier 1 and no Style board draws, comes back as one of the
fourteen.

**Affected artboards:** StylePanel, StyleLibrary, StyleFromAnalysis,
StyleDiverging, CategoryTable, InspectorGenomics, plus a new RampPopout (G).

## D3. Analyze -- already the model, with two corrections

Analyze already obeys the rule the user is asking for, and it is recorded here
so that a compaction pass does not "improve" it.

**Confirmed as drawn:** Metric histograms stays inline (W23 phase 2 is a scan
across five distributions, and 6.11 already refuses a door for that shape);
History stays inline (6.11 names it in the refused list); All statistics stays
a door with its "Computing 3 of 7" stub; the per-card Advanced gear with its
pinnable fields is the pattern every other gear should copy, and D2 now makes
Style copy it; the picker's Suggested-method scan list stays resident with
Run in full text on every card.

**Two corrections.**

- **More becomes a menu.** A header plus three verbs that each enter a mode or
  a dialog is five rows spent on one overflow glyph. 6.11 already routes verbs
  to menus, and 5.3 already writes it as "A panel-level More row". Compare has
  six other entry points, so the Analyze More row is nobody's first route.
  3 rows -> 1.
- **The sweep run table moves to the 480 pop-out the spec already gives it.**
  AnalyzeSweep renders it three times -- a resolution/groups table in the
  panel card, a fuller table with a sparkline in the inspector, and the
  agreement bars -- which breaks "One result body renders on screen at a
  time". The room test decides it independently: the panel copy has had to
  drop the modularity column to fit, which is how a squeezed table announces
  itself. The panel card keeps title, reading, one-line run record with its
  Details chevron, a "Runs 3" door stub, and the applied action row.

**Recipes stays a collapsed section, not a door** (A4). Its RT-8 trailing slot
carries the count; the plus stays resident under Rule 7b's carve-out.

**Rule 7a is not being enforced on the cards.** AnalyzePanel draws a Method
select reading "PageRank" under a card titled "Influence PageRank"; AnalyzeSweep
draws "Louvain | Visible (200)" under a card titled "Groups Communities
(Louvain)". Both are defaults, both are restated by the title on the same
screen, and Rule 7a and Rule 8 each delete them independently. Method stays a
top-level control once it deviates -- W04's decision points are which
community algorithm and whether communities are stable, and W21 phase 1 wants
MCL where Louvain is only acceptable -- so this is a rendering rule, not a
tier change.

**The + Analysis catalogue is refused as an anchored pop-over, and it is the
one place where the user's "anchor pop-overs to their parents" instruction and
6.11's geometry point in opposite directions.** Two reasons, and the second is
measurable. It is not one member of a list and not a report read once; it is
the index of the product, seven groups and twenty-six cards, which 5.3 says in
its own words. And with the panel open the canvas band runs x 328 to 1160, so
the preview's fixed centred home occupies x 604 to 884; a 360 pop-out at x 336
runs to 696 and a 280 one to 616. **Every rung of the width ladder collides
with the preview,** and 6.11's own remedy ("where that fallback is in play,
the preview does not open") would cost the picker the one thing it has that a
list of names does not. So the picker is the product's one panel-scale
drill-down, 5.3 stops calling it a popover, and 6.11's worked-examples table
gains the row.

**18 -> 14 resident rows.**

**Affected artboards:** AnalyzePanel, AnalyzeSweep, AnalyzePicker,
ExplorerAfterCard, CategoryTable, CompareSplit, plus new AllStatistics,
RunRecordPopout and AnalyzeParameters (G).

## D4. Explore -- the surplus is verbs, not parameters

Five boards draw five different Explore panels for the same state axis: Main
14 resident rows over 9 sections, ExplorePanel 23 over 9, MultiSelection 17
over 10, TimeSlider 14 over 7 plus a "More..." row hiding two more,
ExploreNotesList 6 sections. 6.9 already sets the target: eight collapsed
sections are 264px and never scroll, and that skyline is the point.

**About half of Explore's surplus is not a pop-over problem at all.** 6.11
already rules that verbs go to menus:

- The **Selection actions** section duplicates the Select split button two
  rows above it, and MultiSelection prints "7 nodes, 4 edges" inside it while
  the inspector header and the status bar each print the same fact. Delete the
  section; Select matching filter, Select edges between selected and Select
  largest connected part join the Select split button's menu. -1 row on Main
  and ExplorePanel, -4 on MultiSelection.
- The **inspector action block** caps at four rows in every selection state,
  with the remainder in the block's More menu, each verb keeping its full
  text. What may never move into More: the split button's cost estimate and
  its "All 12,412 may slow the canvas down. Expand all anyway", because floor
  item 4 binds the estimate to the control that spends it; and every departure
  line. MultiSelection 8 action rows -> 4, IpadInspector 7 -> 4,
  ExplorerExpert already at 4.
- **Around the selection** stops being an Explore section. 5.3's own sentence
  already assigns selection-scoped actions to the inspector, and the ego
  network's Hops and Max nodes leave the tier-3 dialog for a 280 pop-over on
  the inspector's Ego network action -- 6.11 question 1 is a no, nothing
  commits, and the canvas must stay touchable to see the size preview and the
  ring chip.
- **Neighborhood expansion** becomes one RT-8 door row whose trailing state
  mark names the remembered depth and type filter ("2 steps, 3 types"), which
  is where 5.4's "uses the last node and edge type filter" becomes readable
  before it acts.

**Rule 7a and 7c, not doors:** at zero rules the Filter builder is one 32px
row with a plus -- "Match all" at zero rules is a default and contradicts
5.3's own condition, and "20 of 20 nodes would match" is the null statement
6.2 forbids. TimeSlider's "Active filters / Time window" chip is drawn while
the slider is docked, which 5.3 forbids outright and which prints the window a
third time. The "More..." text row form is retired from the panel vocabulary:
a text row that hides two sections is a third disclosure mechanism doing the
job of the other two.

**The pattern editor moves into the panel lane.** 5.3 tier 3 anchors it "over
the canvas", which is the preview's one fixed home, and 6.11 warns against two
surfaces arriving in the same place. A 3a pop-out already leaves the canvas
live and the highlight running, so the canvas position buys nothing and costs
the anchor -- the exact failure the user named on the timeline. 360, panel
lane, anchored to the pattern row.

**Notes: confirmed as drawn, and recorded as the precedent.** The list stays
inline (floor 7, and 6.11 has already refused it by name in the same words the
user is now asking about); the header's four filter chips, tag picker and sort
control collapse into one filter door; the row editor pops out anchored to the
row it edits. ExploreNotesList is the best board in the Explore set.

**Time slider settings: the gear does NOT move.** One track proposed moving
the gear to the bar's left end so a right-aligned pop-out could clear a
right-aligned legend. Under B1 the pop-out slides along the bar instead, so
the gear stays where users have learned it and the fix costs no control move.
**The rule wins; the workaround is dropped.**

**Eight sections, one fixed order, every board:** Filter builder, Filters,
Sets, Views, Find a pattern, Neighborhood expansion, Step through time (only
when a Time role exists), Notes.

**Main 14 -> 10, ExplorePanel 23 -> 20, MultiSelection 17 -> 13, TimeSlider 14
-> 11 (and TimeSlider regains Sets and Notes, which it was silently missing).
Inspector: one node 26 -> 24, multi-selection 20 -> 16.**

**Affected artboards:** Main, ExplorePanel, MultiSelection, TimeSlider,
ExploreNotesList, ExplorerNotes, ExplorerExpert, FilterBuilderExpert,
InspectorGenomics, IpadInspector, plus new NoteEditorPopout and
FilterExpression (G).

## D5. Data -- the panel is not where the problem is

The user's "Present could hide most of its content" was tested against Data
and it fails, checkably. Of the twelve content rows in the Loaded state, eight
are 6.10 floor items and three are the front door. The four mapping fields are
floor 2, 4 and 6 AND are already the anchored-door pattern -- each is an RT-1
select whose 12px in-field chevron opens Import options scrolled to that
column with its Role chip focused. **19 -> 17 resident rows, and both removals
are verbs going to menus:** Close dataset to the panel header's overflow, Find
and merge duplicates to the Cleaning steps header's overflow. Columns caps at
8 rows with "Show all 12" opening the Data table drawer.

**The problem is the Import options dialog, which draws the same three role
parameter sets in three different shapes on three different boards:** on
ImportOptions the weight's "strength" is a tag crammed into the amount column
and the time's Kind and Format are two dimmed sub-lines under ts; on
ImportRecognised the same facts are a four-row "Weight: combined_score" block
plus a top-level Identifier system select; on ImportLargeFile they are a prose
sentence. They are per-item parameters of one column, so they belong to that
column's Role chip -- which is already the anchored control the spec built.

- **One 280 pop-over per column, from the Role chip, titled with the column's
  own name.** Weight holds Treat as, Normalize to 0-1 and the Divide by 1000
  offer; Time holds Kind, Measured in and the family-dependent third field;
  Node id holds Identifier system. **The chip is the stub and keeps the setting
  as a dimmed suffix** -- "Weight strength", "Time ISO 8601", "Node id gene
  symbol" -- so what the control will do stays on screen and only the editing
  moves. That suffix is what clears A2's veto: the value is not silent.
- The recognition banner's full per-column record goes behind its Details
  chevron, which floor item 3 names by hand.
- The item-3 picker's per-option settings anchor to the chosen card.

**The second-biggest finding in Data is not a door at all: Rule 7a is not
being enforced in the dialog.** ImportRecognised draws all three policies at
their defaults with the counts "0 0 0" beside them, and draws "Load:
Everything", which is also the default -- on the one board whose entire
argument is that the mapping was done for you. ImportParseError and
ImportLargeFile draw the same policy row at defaults with counts that cannot
be known until the file parses, which is Rule 7a's own named example.
**Deleting the defaults removes more rows than any door proposed here.**

**Refusals recorded so they are not re-proposed:** Cleaning steps (6.11 worked
example, scan list); the Columns list (floor 7 scan surface); the Loaded data
mapping lines (floor 2/4/6, and each field is already its own door); the
Parsing group (every change re-parses the preview grid a pop-over would
cover); the Load control (floor 4 binds the cost estimate to its control and
6.11's second clause forbids a door between them); the Table join match
reports (W20's own success criterion names them); "Run a recipe..." (5.3 names
it the one exception).

**Table join** takes the cheapest version of its split, which needs no new
glyph and no new lane: the conflict rule, Prefix and Case-sensitive hang off
the Conflicts field's own in-field chevron, which is the RT-1 door rule at
field scale. Prefix and Case-sensitive at their defaults are not drawn at all
(Rule 7a). "Color nodes by log2FoldChange after joining" stays resident: it is
W20 step 4 collapsed into one checkbox, and hiding a one-click accelerator
behind a door is the opposite of accelerating.

**Data table drawer:** the toolbar Columns control is in the wrong shape. Show,
hide AND REORDER over a set W20 sizes at 10 to 40 columns is not a menu, and
drag-reorder inside a menu is not a menu at all. It becomes a 280 pop-over
anchored to the Columns chip, with a search box, a checkbox row per column
with a drag handle, Show all / Hide all, and "Add column..." at its foot --
which also gives the spec's missing "Add column" toolbar item a home instead
of a ninth toolbar control. The column HEADER menu is unchanged and stays a
menu.

**One non-disclosure finding the drafting pass must fix:** three boards draw
three different Data panels (DataPanelLoaded's segmented trio with an "Import
settings" gear on Open file; TableJoin's drop zone with the general import
door as a pencil on Loaded data; ImportAddToGraph's 1.5-era label-value list
plus a prose mapping sentence, which Rule 3 forbids outright). One general
import door, one glyph, one title, one home: **the gear on the Loaded data
section header, titled "Import options"** -- because the Open file header's
gear reaches nothing when nothing is loaded, which is also why it is deleted
from the Empty state.

**Counts:** Data panel Loaded 19 -> 17, Empty 7 -> 7; ImportRecognised 15 ->
7, ImportOptions 12 -> 9, ImportLargeFile 13 -> 10, ImportParseError 10 -> 9;
Table join settings 4 controls -> 1.

**Affected artboards:** DataPanelLoaded, Welcome, TableJoin, ImportAddToGraph,
ImportOptions, ImportRecognised, ImportLargeFile, ImportParseError, ImportFlow,
DataTableDrawer, ValidationPopout, plus a new ColumnRolePopout (G).

## D6. AI -- the panel is inverted, and two door rows fix it

**Measured:** the conversation occupies about 280px; Provider and Console
occupy about 445px. 56% of the panel is supporting machinery and 35% is the
thing the panel is for. That inversion is the finding.

- **Provider becomes a door row** whose stub's trailing slot carries the model
  name. 5.3 already assigns provider keys and settings to tier 3, so only the
  STATUS was ever meant to be resident -- and the status is already resident
  in the status bar ("AI: Anthropic ready"), so Rule 8 deletes the panel's
  copy. What the status bar does not carry is the model, which is why that is
  the fact the stub reports.
- **Console is a door when a provider is configured and resident and expanded
  when none is** (6.1's state axis), with the setup prompt replacing the chat
  input in that state. Two input surfaces for one job, stacked, and at most one
  of them is the user's route. Width is not the argument and it was checked:
  the widest console line measures 219px inside the 256px band. The Console
  keeps a pin, because it is one of the three comparative surfaces that earn
  one (E2), and Shift+backtick already opens and focuses it, so the keyboard
  obligation is met by a binding that exists.
- **Floor violation to fix:** each step row's second muted line ("on 100,000
  nodes, 100 sampled sources, 38 s") is floor item 3 and is not drawn on the
  board. It must be resident; only the full record goes behind the Details
  chevron, which 6.10 explicitly licenses.

**This is the one place in the revision where 6.2's frequency override does
the whole job** -- 6.11 question 3 would send the Console inline, and 6.2
moves it. That is the intended mechanism, and the spec should say so out loud
rather than leave a later reader to rediscover it.

**6 supporting blocks (about 445px) -> 2 door rows (about 64px); the
conversation goes from about 280px to about 660px.**

**Affected artboards:** AiPanel, CommandPalette, plus a new AiPanelCompact (G).

## D7. Settings -- mostly the wrong mechanism, and the refusals matter more than the exceptions

6.11's anchor clause defines lanes for regions that have a boundary to be
clear of; a full-panel overlay has none, so a pop-over inside it has nothing
to point at. And the mechanism is already applied at the right scale: 6.9's
RT-1 door rule says a section consulted rather than operated gets the same
treatment at section scale, and **in Settings the nav item is the door and the
pane is what is behind it.** That is written down so a later pass does not
"fix" Settings with pop-overs.

**Refused, with reasons:** Saved items is 26 user-named rows across 8 kinds on
one screen, which is floor item 7 and 6.11's own refused example, and its
per-row verbs are correctly hover-revealed under RT-7's hover split. The
provider cards are an accordion, which anchors each key and model inside that
provider's own row at full width. Detected > Change discloses four numeric
fields, which is exactly 6.2's inline threshold. The four XR rows stay
resident because 5.9 requires them learnable before the headset goes on, so
Rule 7c does not fire.

**Two exceptions, and the first is the inconsistency the user named.**

- **Layout size ratings** is a header plus nine engine rows of constants the
  spec itself calls "benchmarked before release" -- and 35px below it sits
  **Layout stepping**, which collapses three settings into one row reading
  "engine default". Same pane, same content class, two treatments. 6.2's
  arithmetic settles it: more than four schema rows becomes a 3a pop-out from
  a gear on the row it belongs to. 360, because 6.11 assigns that rung to a
  three- or four-column table.
- **Rebind** becomes a 280 pop-over anchored to the key chip that was clicked
  and titled with the action's own name. Today rebinding captures in place and
  the conflict case inserts a warning line that pushes the remaining rows of a
  roughly 60-row table down while the user is staring at a key chip. That
  reflow is the concrete harm, and it is A4's third clause -- the door buys
  leaving the rows below operable.

**Performance pane: about 33 resident control rows -> about 25.**

**Affected artboards:** SettingsPerformance, SettingsShortcuts, Settings,
SavedItems.

## D8. Help -- already at its floor, and one surface class is wrong

Help draws four rows, all verbs, and 6.11 routes verbs to menus. The two
count-bearing rows ("More suggestions (N)", "Already run (N)") become
SUBMENUS, because their members are verbs too. **Nothing here is hidden, and
saying so is part of doing the review honestly.**

**The real finding is the ? surface.** ShortcutsDialog draws a 740px,
two-column, scrimmed, focus-trapped dialog with the canvas dimmed behind it.
6.11's first question is exclusive and its list is closed, so "If no, it is
never a dialog." It is not a legal pop-out either -- 740 is over the 480
ceiling. And the modality defeats the use: you read a binding and the very
next thing you do is press it, which a frozen canvas forbids. The
keyboard-shortcuts capability asks for an "overlay" in its own words.
**Same content, non-modal, no scrim, no focus trap, canvas keeps pointer and
keyboard, Escape closes.**

This is the same 5.3-versus-6.11 dialog conflict that the report editor hits
in D1, and both should be resolved in one edit: 6.11 question 1's list is
closed, and every dialog in the spec that is not on it needs a new surface
class.

**Affected artboards:** Main, ShortcutsDialog, CommandPalette.

## D9. Where the user's instinct does not extend, said plainly

The user said Present could hide most of its content. It can, and it does --
28 rows to 10. But the instinct is a statement about Present, not a general
one, and three sections should be told no:

- **Data** is a section you OPERATE, where Present is a section you configure
  once and read out of. Eight of its twelve content rows are floor items and
  three are the front door. Its one big hideable section was already hidden
  correctly in 1.7 (the validation report went from 282px to a 32px door).
- **Analyze** is already the model and its main risk is a compaction pass
  hiding Metric histograms or History, both of which 6.11 already refuses.
- **Help** draws four rows and is at its floor. There is nothing to hide.
- **AI** looks like a hiding problem and is not: the fix is two door rows and
  a state clause, after which nothing else in the panel is a candidate,
  because a transcript has no doors.

---

# E. The four conflicts, resolved

## E1. A pop-out anchored to a panel row, versus the panel scrolling

**Resolved in B3.** Follow the opener while it is in the region; when it
scrolls out, dock to the edge it left through, drop the caret, keep the opener
lit, and grow a 20px return strip naming the opener with a chevron that
scrolls it back. Close on section collapse or activity change. This replaces
6.11's "stays open at its last position" -- a pop-out frozen at a pixel while
its row is gone is precisely the detached surface the user is complaining
about, and "the title is the anchor, not the pixel" is a rationalisation of
that failure rather than a rule.

## E2. Two pop-outs wanting to be open at once

**One per region stays.** It matches Figma (whose users document the limit by
complaining about it), and it is what keeps the regions legible. Two clauses
make it non-arbitrary rather than merely restrictive:

- **The region is the OPENER's region, not the surface's screen position.** A
  panel pop-out that has slid over the canvas still counts against the panel.
  Without this clause the TimeSlider fix in B4 would silently consume the
  canvas-overlay slot.
- **A dock is a region, as a dialog is.** A pop-out opened from the Data table
  drawer or the report editor drawer counts against that dock. This is the
  honest answer to the concrete collision -- DataTableDrawer draws the time
  slider settings open above the drawer and also wants a Columns pop-over --
  and it gives them independent lives without loosening the rule anywhere
  else. Regions are now five: activity panel, inspector, canvas overlay,
  dialog, dock.

**And the pin is narrowed, which is the other half of this conflict.** Figma
has no pin; the persistent colour picker has been requested for years and
Figma's answer is that it was scoped and cut. So our pin is a Figma gap we are
filling deliberately, and it has to be narrow, because a pinned pop-out that
survives a selection change is a second inspector and re-creates the panel we
split.

> A pin toggle renders only on a pop-out whose content is comparative across
> selections. The set is closed at four: the colour and gradient picker,
> Selection statistics with a pin active, the group profile, and the AI
> console. Every other pop-out loses its pin glyph, which also removes it from
> the 32px header of pop-outs that never needed it. Pin exists to let a reader
> hold one report still while changing what it describes; a pop-out whose
> content is the parameters of the row that opened it has nothing to hold
> still, and pinning it produces a stale panel that lies.

This withdraws 6.11's generalisation ("Pin is generalised from what 5.3 Style
already gives the rich text, gradient and colour popouts") and keeps the
originals. It removes the pin from HistoryPopover, ValidationPopout and
TimeSlider as currently drawn.

**Also recorded:** no artboard may show two transients of different classes
open at once. StyleLibrary currently draws a section overflow menu open
beneath a dialog's scrim, which the Escape ladder already forbids; a dialog
replaces and closes any open menu or pop-out in the same region rather than
dimming it behind the scrim.

## E3. The legend decision against floor item 5 and against the canvas overlay stack

**Against floor item 5:** resolved in C2 by splitting the item into an export
obligation and a screen obligation. Nothing floor item 5 names leaves the
canvas -- channel, attribute, domain endpoints and the scale all stay. What
leaves is counts, category rows past five, and the state-row block, none of
which item 5 names, all of which are named by 5.1's own One fact, one region
table as belonging elsewhere. The floor stays at seven items. The export half
is strengthened, and C4 makes it real in code rather than aspirational.

**Against the overlay stack:** the legend does not move, does not shrink in
width, and does not change corner. Width stays 256, so 5.6's 622px two-line
reflow arithmetic is untouched and the toolbar, minimap and time slider offset
ladder (12 / 82 / 272 / 342) are unaffected. The height cap goes 334 -> 240,
which binds nothing today. The drawer-open compact form stops being a
separately specified component. 6.11's legend-clearance clause survives
unchanged in substance, but B1 changes how it is paid: by sliding along the
overlay rather than by rising, which is the fix for the user's own timeline
example. The one new object is Compare's shared-channel strip, which rides
12px above the toolbar on the toolbar's own offset ladder so the toolbar does
not move.

**One further collision, resolved in C4:** the Present split wants Include
legend behind the Image options door, and the legend track wants it resident
so the export promise is visible. Both get what they need by moving the report
rather than the control: the control goes behind the door, and the canvas
export frame hint carries "legend: 2 channels" or "legend: off" as the
resident floor-4 statement, with the gear drawing primary when it is off.

## E4. Hiding advanced controls versus the reachability rule in 6.4

About 25 rows move behind doors in this revision, which makes 6.4 the
load-bearing rule rather than a formality. Four measures, all mandatory in the
same revision as the doors.

1. **Every new door joins the palette index by both names.** Named, so the
   audit has a list: Image options, Data options, Export video, Report editor,
   Layout parameters, Ramp options, Values table, Column role parameters, Join
   options, Table columns, Provider, Console, Layout size ratings, Rebind a
   shortcut, Neighborhood expansion, Ego network, Advanced parameters, Sweep
   runs, Filter expression, Note editor, All statistics, Run record.
2. **The depth obligation (A3)** makes "one click" measurable and forbids a
   door behind a door.
3. **The stub drawn primary (A6)** means hiding never hides a deviation.
4. **A second escape hatch, beside Rule 11's first.** Figma shipped optional
   property labels in UI3 for discoverability, and after the Constraints
   complaint shipped the inline toggle rather than defending the door. 6.9's
   Rule 11 already mandates the first of those and has no equivalent for the
   second.

> Settings > Appearance > "Keep advanced sections open", default off, renders
> every gear pop-out's contents as inline rows in its own section instead, in
> the same order, at the same 32px pitch. It ships in the same revision as the
> doors, for the same reason Rule 11's first hatch ships with the glyphs. Two
> constraints: it affects only pop-outs whose contents are field rows at 280 --
> reports and matrices at 360 and 480 stay doors at every setting, because they
> do not fit the 256px band and there is no honest inline form; and a panel in
> this mode may scroll, which is the cost the user accepted by turning it on.

This deliberately breaks 6.9's promise that eight collapsed sections are 264px
and never scroll, and only when the user turns it on -- exactly as Rule 11's
first hatch already breaks the 280px pair-row layout. Both breakages are what
make the terse default defensible rather than merely terse.

**Affected artboards:** Settings, SettingsPerformance, CommandPalette,
PresentPanel, StylePanel, plus a new KeepAdvancedOpen (G).

---

# F. Rejected

| Rejected | Why |
|---|---|
| Legend as its own panel or as a seventh activity | A panel is not exported and a legend is; 6.10's preamble binds the legend to the canvas; the panel that would hold it (the Style layer inspector) exists and only fills when a layer is selected in Style; and a seventh rail slot does not exist under floor item 6 |
| Legend as a resident chip opening a pop-over | A chip cannot carry a swatch-to-name map, so for every categorical channel it puts the legend's whole content behind a door; 6.11's one-pop-out-per-region blocks it outright in Compare; and it makes the legend dismissible, which breaks the clearance rule that exists because it is not |
| Legend kept whole on canvas, export left alone | Leaves W20, W22, W25 and the genomics persona unserved, and forces a choice between canvas size and export completeness that has no good side. This is the fallback if and only if the export is ever reimplemented as a DOM composite of the shell rect |
| Legend swatch rows as filter controls | Two designloom requirements are genuinely unmet, but this adds keyboard and reachability obligations, competes with a plausible click-to-select reading of the same row, and requires the legend and the filter strip never to disagree. Deferred to a later revision, on its own, not folded into a disclosure pass |
| Per-channel conditional legend compaction ("compact whenever another resident surface prints it") | Condition-dependent rendering is what produced 0%-to-86% duplication variance across the boards in the first place. C3's cuts are unconditional and therefore checkable, and they replace three conditional rules with one grammar |
| 160px on-screen legend cap | StyleDiverging measures 240 with every line on the floor. 160 would force a floor item off the canvas. 240 is the measured height of an all-floor legend |
| Recipes as a door; the Styles library as a door | Both fail A4's discriminator on all three counts. A closed section and a door cost the same row; the door adds a click for nothing. Both stay collapsed RT-8 sections whose trailing slot carries the count or the active style's name |
| Moving the time slider gear to the bar's left end | A control move to work around an anchor rule. B1 fixes the anchor instead, and the gear stays where users have learned it |
| The generalised pin | Narrowed to four comparative surfaces (E2). Figma has no pin at all; ours is a deliberate gap-fill and must be narrow or it becomes a second inspector |
| + Analysis catalogue as an anchored pop-over | Not one member and not a report; and every rung of the width ladder collides with the preview's fixed centred home, measured (preview 604-884; a 360 pop-out at 336 runs to 696) |
| Import policies as a panel pop-over | 6.11 verbatim: a control whose home is a dialog may not acquire a second home. The fix is Rule 7a, which deletes them at their defaults |
| The Load control, the cost gate, the match reports, Cleaning steps, the Columns list, the attribute profile, the notes list, the search results, the neighbour list, Saved items behind any door | Floor items 4 and 7, and the scan argument 6.11 has already used twice |
| Four classes of counter-rule to the door test | Three of the four are derivable at clause (a) and are recorded in A2 rather than written as vetoes; only "silent damage" survives as 6.10a |

---

# G. Artboards this revision requires

**Six of 6.11's twelve worked examples are never drawn open on any board, so
their anchors are untested -- and among the twelve surfaces that WERE drawn,
four are wrong.** The undrawn six are not safe by default. Add to 9. Mockup
scope:

> Every row of 6.11's worked-example table is drawn open on at least one
> artboard, with its opener lit, before the anchor rule is called validated.

**New boards, in priority order:**

1. **PresentCompact** -- the re-cut Present panel at rest, both gears closed,
   10 rows. The proof that the largest split lands.
2. **ImageOptionsPopout** -- the Image options gear pop-out at 280, with the
   canvas export frame hint reading "legend: 2 channels". Proves C4's resident
   floor-4 report and A6's primary gear.
3. **ExportLegend** -- the composed export legend, drawn as an exported PNG at
   2x with full blocks, twelve categories with counts, the coverage footer,
   the clamp line and the state rows. Makes the export obligation drawable and
   checkable rather than aspirational.
4. **RampPopout** -- the numeric ramp door beside the categorical Values (N)
   door on one board, so the two sub-modes of one row are visibly the same
   door from the same slot.
5. **AllStatistics** -- 360, from the section row, stub still reading
   "Computing 3 of 7".
6. **RunRecordPopout** -- 360, from a run-record Details chevron. The chevron
   appears on eleven boards and opens nowhere.
7. **AnalyzeParameters** -- 280, from the parameters row gear, panel lane, top
   on the row; the gear drawn primary.
8. **ColumnRolePopout** -- a column's role parameters from the Role chip
   inside the Import options dialog. The one board that exercises the dialog
   lane (B2).
9. **ReportEditorDrawer** -- the report editor as a non-modal bottom drawer
   with the sections checklist inside it.
10. **AiPanelCompact** -- Provider and Console as door rows, plus the
    no-provider state where the Console is resident and expanded.
11. **NoteEditorPopout** -- 280, from a note row's edit glyph. The notes list
    itself stays inline and 6.11 is right to refuse it a pop-out.
12. **FilterExpression** -- 360, from the section header.
13. **ShortcutsOverlay** -- the ? reference non-modal, replacing
    ShortcutsDialog's scrim and focus trap.
14. **KeepAdvancedOpen** -- Settings > Appearance showing the second escape
    hatch, with one panel drawn in that mode so the scroll cost is visible.

**Redraws:** TimeSlider, ValidationPopout, MultiSelection, HistoryPopover,
ViewsMenu, StyleLibrary, StyleDiverging, IpadInspector, DataTableDrawer, Main,
GroupProfilePopout (B4); PresentPanel, StylePanel, AnalyzePanel, AnalyzeSweep,
ExplorePanel, ExploreNotesList, DataPanelLoaded, TableJoin, ImportOptions,
ImportRecognised, ImportLargeFile, ImportParseError, ImportAddToGraph,
AiPanel, SettingsPerformance, SettingsShortcuts, ShortcutsDialog (D); and
every board with a legend (C).

---

# H. Net effect

**Resident rows, measured before, projected after.**

| Surface | Before | After |
|---|---|---|
| Present panel | 28 | 10 |
| Style panel | 24 | 14 |
| Analyze Run tab | 18 | 14 |
| Explore panel (Main / ExplorePanel / MultiSelection / TimeSlider) | 14 / 23 / 17 / 14 | 10 / 20 / 13 / 11 |
| Data panel, Loaded | 19 | 17 |
| AI panel, supporting blocks | 6 blocks, about 445px | 2 door rows, about 64px |
| Inspector: nothing selected / one node / multi | 12 / 26 / 20 | 12 / 24 / 16 |
| Inspector action block (MultiSelection / iPad) | 8 / 7 | 4 / 4 |
| Import options, resident rows outside the preview grid | 15 / 12 / 13 / 10 | 7 / 9 / 10 / 9 |
| Settings > Performance | about 33 | about 25 |

Across the six activity panels at rest: **about 116 resident rows to about 80,
a 31% reduction. Present alone accounts for 18 of the 36 rows removed.** New
pop-overs: 17. Rows demoted to menus: 14. Rows deleted outright by Rule 7a and
7c, with no door involved: about 20 -- more than any single door retires,
which is worth stating because the cheapest half of this revision is not a
disclosure change at all.

**Canvas area, measured across all 43 legend instances.**

Before: heights 44 to 330, median 139, total 6,260px of legend at 256 wide =
**1,602,560 px2 of canvas.** 10 instances carry state rows (17 rows in total),
15 carry counts (164 count lines), 5 carry more than five categorical rows.

After: state-row blocks removed (about 342px across the set), categorical caps
applied (about 238px), Compare's shared channels drawn once (about 90px).
**About 670px of legend height removed, 171,520 px2 returned to the canvas --
about 11% of the set's legend area.**

Per board, where it matters: the tallest legend goes 330 -> about 215 (-35%);
ExplorerLargeGraph 313 -> about 215 (-31%); ExplorerExpert 296 -> about 241
(-19%); ExplorePanel 141 -> about 70 (-50%); CompareSplit's two legends 548 ->
about 308 (-44%); **StyleDiverging 240 -> 240, unchanged, because every line
on it is floor.** That last row is the honest headline: this is not a promise
of a small legend, it is a promise that everything on the canvas legend is
load-bearing.

On an 832 x 836 canvas the worst-case legend goes from 39.5% of canvas height
-- at LEGEND-1.8's own scroll cap -- to about 26%. Two boards stop being
scrolling surfaces, which is what made the legend read like a panel.

And the gain the pixels do not show: three conditional legend rules (counts
when the panel does not list every group, the Compare exception, the drawer
compaction) collapse into one unconditional grammar plus one state-based
subtraction, the per-step time summary stops recomputing legend counts on
every scrub, and the exported image carries a legend for the first time.
