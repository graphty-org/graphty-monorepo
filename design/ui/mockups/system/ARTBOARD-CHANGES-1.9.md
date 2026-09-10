# ARTBOARD-CHANGES-1.9 -- the set-wide consistency pass

Owner: the boundary between what a section draws and what its gear hides, drawn
the SAME WAY on every board that draws it. `SECTIONS-1.9.md` settles seventeen
sections; eight agents drew them in parallel from one work list; this record is
what happened when one reader then read all sixty-four boards side by side and
made each section single-valued.

Read this after `SECTIONS-1.9.md` section 5. Where the two disagree, the reason
is named here by hand and the disagreement is the finding.

---

## Contents

- 1. What this pass is for, and the one rule it applies
- 2. The drift, section by section
- 3. The four sweeps
- 4. What changed, board by board
- 5. The boards re-scoped under D11
- 6. What could not be reconciled
- 7. Measurement

---

## 1. What this pass is for, and the one rule it applies

Revision 1.9 was drawn by eight agents working the same list in parallel. Each
board came out internally coherent and well argued. The set did not: the same
section came out of that pass in two, three and in one case six spellings, and
every one of them had a comment explaining why it was right.

That is the failure mode this pass exists to catch. A uniform error is cheap to
fix later; a set of contradictions is not, because each board can cite its own
reasoning and there is nothing left to appeal to. So the method here is not
board-by-board. It is **one rule per section, applied once, to every board that
draws it**, with the exemplars in `SECTIONS-1.9.md` section 4 as the tie-breaker
where the work list is silent.

**The rule, in the form the boards needed.** `SECTIONS-1.9.md` D1 says a chevron
renders only where it opens onto resident rows. Drawn, that is four separate
tests, and the set failed all four:

1. **A section whose capability has not shipped draws no chevron.** It keeps its
   text and its tag (FLOOR-1.9's corollary, spelled out in 5.7) and loses only an
   affordance that opens nothing.
2. **A section that is live but holds nothing draws no chevron.** That is RT-8's
   empty-section form -- dimmed name, one 24 px plus, an EMPTY 16 px leading slot
   -- and 5.6 makes it a decision rather than a snippet: "at zero rules there is
   no chevron, because there is nothing to open."
3. **A CLOSED section's trailing slot carries its state mark and nothing else.**
   D5, and `VOCAB.md` 14.1 in one line: "because a closed section draws no gear,
   A6's two inks move to its chevron."
4. **An OPEN section's trailing slot carries its verbs and its gear**, and the
   gear takes A6's two inks -- `#7a828e` when everything behind it is at its
   default, `#d5d7da` when anything is not. `#4a7ee8` is the accent, which a gear
   wears only with the `#28364e` background of an opener that is currently open.

Every edit below is one of those four, or a value that read two ways.

---

## 2. The drift, section by section

Seventeen sections. Eleven were already single-valued when this pass opened;
they are listed too, because "checked and identical" is the finding that stops
the next pass re-deriving them.

### 5.1 Parameters (layout) -- CLEAN

Five boards, byte-identical headers: open chevron, name `#d5d7da`, one dimmed
`Layout parameters` gear, and the three resident rows Edge length 30 / Pull to
centre -1.2 / Edge weight. The Edge weight value differs by FIXTURE and only by
fixture -- `combined_score` on the three ovarian boards, `value` on the two
cat-social ones -- which FIXTURES 1.3 requires. No edit.

### 5.2 Animation -- CLEAN

Four boards draw it open with Transitions and Reduce motion and a dimmed
`Animation settings` gear; StyleLibrary draws it closed. The dimmed NAME on all
five is 5.2's own licence ("none needed while both values are at their
defaults -- the dimmed section name says it"), not the RT-8 empty form, and
StyleLibrary's Animation is therefore the one dimmed-name section in the set
that keeps its chevron. No edit; recorded so the sweep in section 3 is not
re-run over it.

### 5.3 Values -- CLEAN

Two boards, identical: five value rows plus a "1 more" row carrying the sixth
group's count, and a dimmed `Value options` gear. No edit.

### 5.4 Neighborhood expansion -- FIVE BOARDS, THREE SPELLINGS

The worst of the seventeen.

| Board | Chevron | Name | Mark | Tag |
|---|---|---|---|---|
| Main, ExplorePanel, FilterExpression | closed | 11 px, `#7a828e` | "2 steps, 3 types" on screen | in the title only |
| TimeSlider | closed | 12 px, `#5f6873` | in the title | on screen |
| ExploreNotesList | none | 12 px, `#5f6873` | none | the run's group tag |

Three drawings of one row, each with a measured argument. **Settled by the ship
state, which the set is unanimous about and which is not a per-board fact:**
every board that draws this row says the capability is not built -- three in the
row's own title, one in a per-row tag, one inside a Coming run -- and ContextMenu,
ExplorerExpert, ExplorerNotes, NoteEditorPopout and IpadInspector all draw
"Expand N neighbors" at the unbuilt ink `#5f6873`. Nothing anywhere in the set
draws this capability live. So test 1 fires and the chevron goes, on all five.

**The single spelling, now on Main, ExplorePanel, FilterExpression and
TimeSlider** (ExploreNotesList keeps the run form REGISTER 3 gives it):

```html
<div title="Neighborhood expansion. 2 steps, 3 types. Coming" style="display: flex; align-items: center; justify-content: space-between; gap: 8px; height: 32px; cursor: default;">
  <div style="display: flex; align-items: center; gap: 4px; min-width: 0;">
    <div style="width: 16px; height: 16px; flex: 0 0 auto;"></div>
    <span style="min-width: 0; font-size: 12px; font-weight: 500; line-height: 1.2; color: #5f6873; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Neighborhood expansion</span>
  </div>
  <div style="display: inline-flex; align-items: center; flex: 0 0 auto; height: 16px; padding: 0 6px; border-radius: 8px; background: #374047; color: #7a828e; font-size: 10px; font-weight: 500; line-height: 1; box-sizing: border-box;">Coming</div>
</div>
```

**Two things the set had been told it could not have, and now has.** Main's and
ExplorePanel's 1.8 comments both record the 11 px section name as a deviation
bought to fit name plus mark into 255 px, and both record the Coming TAG as a
string that could not be fitted at any size (Main measured every arrangement of
the four at 291.3 px in a 255 px band). With the mark out of the trailing slot
both constraints dissolve: 16 + 4 + 149.7 + 8 + 50.3 = **228 of 255**. The 11 px
name is retired -- which is 5.4's own stated goal, reached by a different route
than 5.4 expected -- and the tag is on screen, which is what REGISTER 3 asks of
an isolated unbuilt row.

**What is preserved.** The mark "2 steps, 3 types" stays in the row's title on
all four boards that carried it, so 5.4's closed mark and D12's floor-item-4
obligation are recorded rather than dropped, one hover away. It returns to the
trailing slot when the capability ships and the chevron comes back with the rows.

### 5.5 Step through time -- NO BOARD DREW IT OPEN, AND TWO BOARDS DISAGREED IN WRITING

The sharpest cross-board contradiction in the set, and it was in the comments
rather than the pixels. MultiSelection's 1.9 comment says: "D4 keeps the section
CLOSED here ... **TimeSlider draws the open form** and the bar gear that shares
its contents." TimeSlider's 1.9 comment says: "D4 keeps this section closed" and
"The drawing does not change." Both were written in the same pass. Neither board
drew the open form, so 5.5's resident rows existed only as prose and the section
failed the check that at least one board draws each gear-bearing section
expanded.

**Settled in MultiSelection's favour, because it is the promise the set already
made and TimeSlider is the board with the subject and the room** (Explore panel
content measured 349 px in an 800 px window).

- **TimeSlider now draws Step through time EXPANDED**: the RT-1 pair Window
  30 days | Step 7 days with the recompute toggle in the Step field's trailing
  slot, and the Cumulative | Sliding RT-3 track, both at their shipped defaults
  under D3. The header takes the open chevron and D5's open-state slot: the
  section's gear, dimmed at `#7a828e` because nothing behind it deviates, then
  the On switch.
- **The bar-gear pop-out loses those two rows.** It is the gear's contents, and a
  gear never repeats a row the section already draws (Rule 8; One fact, one
  region). What is left is exactly 5.5's gear list: the time attribute, Speed,
  and "Compare with another window". TimeSlider's first-pass argument -- that a
  pop-out may not carry a second pop-out, so the bar route must render the
  section whole -- fails once the panel draws the section: the same window pair
  and the same mode track would be on one screen twice. D8 asks for one set of
  hidden controls, not for one surface that holds everything.
- **The Coming tag is deleted from that header.** A section drawn open and
  operating -- switch on, bar scrubbing, playhead on the track -- cannot also be
  unshipped, and MultiSelection, the section's other board under D8, draws none.
- **The two titles are made one.** TimeSlider read "Step through time (Temporal
  navigation): filter the graph ..."; MultiSelection reads "Step through time (T).
  Temporal navigation: filter the graph ...". MultiSelection's is the one that
  carries the binding REGISTER 1 puts in the title, so both boards now read it.

The On switch stays in the trailing slot in BOTH states on both boards. It is
the one closed mark in the seventeen that survives being opened, and D5 says why:
a master On switch is the section's own control, not a precis of the rows below.

### 5.6 Filter builder, zero-rule state -- SIX BOARDS, SIX SPELLINGS

| Board | Was | State |
|---|---|---|
| FilterExpression | no chevron, dimmed name, one plus | zero rules -- CORRECT, and the target |
| Main | closed chevron, name `#d5d7da`, TWO verbs | zero rules |
| MultiSelection | closed chevron, dimmed name, no plus | zero rules |
| TimeSlider | closed chevron, `#5f6873` | unshipped |
| ExploreNotesList | no chevron, `#5f6873` | unshipped -- CORRECT |
| ExplorePanel, FilterBuilderExpert | open, with rules | live -- CORRECT |

Main's header was the only closed section in the set carrying two verbs, which
is a straight D5 breach; MultiSelection's was an empty section with a chevron and
no plus, which is neither RT-8 form. Both now take FilterExpression's spelling --
empty 16 px slot, dimmed name, ONE 24 px plus titled "Add a rule". "Edit as
expression" leaves Main's header: a builder with no rules has no expression to
edit, and RT-8's empty form carries one plus. TimeSlider takes ExploreNotesList's
unbuilt form.

**FilterBuilderExpert loses a Coming tag.** It draws ten working rules and the
live expression door that 5.6 itself cites as the compliant form, and
FilterExpression draws that editor open with a valid expression in it. A Coming
tag on a section drawn operating is the same contradiction as TimeSlider's Step
through time, and it is removed for the same reason.

### 5.7 Find a pattern -- SIX BOARDS, FOUR SPELLINGS

Chevron on Main and TimeSlider, none on the other four. Name ink `#d5d7da` on
TimeSlider, `#7a828e` on Main, ExplorePanel and FilterExpression, `#5f6873` on
MultiSelection and ExploreNotesList. 5.7 is unambiguous -- "until it ships, the
Coming tag in the trailing slot and no chevron ... A chevron appears with the
rows" -- and REGISTER 3 fixes the ink at `#5f6873`. All six now draw the same
row as Neighborhood expansion above, with the title "Find a pattern (subgraph
search). Coming".

TimeSlider's info circle carrying "Subgraph search: ..." goes with it: the other
five boards carry that technical name in the title, which is where Decision B
sends it, and one board drawing a circle five others do not is the drift.

### 5.8 Schema -- TWENTY-FIVE BOARDS, TWO SPELLINGS OF THE CLOSED SLOT

The counts and the marks were already right everywhere ("N node types, M edge
types", fixture-correct on all 25). The trailing slot was not: **ten boards drew
"Export schema JSON" on a CLOSED Schema header and fifteen did not.** D5 gives a
closed section's slot to its mark alone; `VOCAB.md` 14.1 repeats it. Set-wide,
152 closed section headers carried no trailing button and 17 did -- ten of those
17 were this verb.

The verb is deleted from the closed headers on CommandPalette,
ImageOptionsPopout, InsightsWide, KeepAdvancedOpen, PresentCompact, PresentPanel,
SavedItems, Settings, ShortcutsOverlay and TimeSlider. **Main is untouched**: it
draws the section OPEN, and its slot carries Export schema JSON and the dimmed
`Schema detail` gear on RT-8's 28 px pitch, which is 5.8's own sentence. Nothing
became unreachable -- the verb is one click away on every board, in the slot the
open form gives it.

ExplorerLoading's title is brought into line with its mark: "Schema.
measuring...", the way every other Schema title in the set mirrors the string it
draws.

### 5.9 All statistics -- CLEAN

Four boards closed with the mark "4"; AllStatistics open with the dimmed
`All statistics options` gear and the progress string "Computing 3 of 7" kept in
the slot, which is D5's named exception (a mark that says something the rows do
not). Density reads 0.031 on the one board that draws it. No edit.

### 5.10 Selection statistics -- FOUR BOARDS DRAW IT OPEN, ONE DREW THE GEAR

MultiSelection drew the gear in A6's primary ink, correctly (a pinned A is a
departure). ExplorePanel, FilterBuilderExpert and DataTableDrawer drew the
section open with **no gear at all** -- so the section that 5.10 splits into
resident rows plus a comparison gear was drawn on three boards as a section with
no addition, which is the shape D1 permits but 5.10 does not describe.

All three now carry the gear, dimmed, titled "Selection statistics detail.
Comparison with a pinned card, per-attribute means, links inside the selection,
Export CSV". **FilterBuilderExpert's Export CSV button is what the gear
replaces**: 5.10 files Export CSV behind that gear, so the header had been
drawing one of the gear's own contents beside the slot where the gear belongs.

The four row sets stay different, and that is right: they are four fixtures and
two regions, and section 4 cites DataTableDrawer's four rows and ExplorePanel's
seven as exemplars in the same breath.

### 5.11 Categories -- CLEAN, with one number named

One board. Open chevron, dimmed `Category table parameters` gear, three
two-column rows and the footer. The footer reads **"3 of 41 rows"**, not the
"6 of 41 rows" that 5.11 and D11 both write. The board is right and the work
list is carrying a number over from the pop-out it replaced: the section draws
three rows, so three is what the footer can honestly say. Left as drawn, named
here so it is not "corrected" into a false statement later.

### 5.12 Runs -- CLEAN

Both instances on AnalyzeSweep -- the panel result card and the inspector twin --
are identical, which is what D8 asks: same caption row, same three run rows, same
dimmed `Run comparison` gear, same title "Runs. 3 runs, 4 to 11 groups". The
11 px name is the card's scale on both and does not diverge. No edit.

### 5.13 Export video -- CLEAN, one title added

Two boards open with identical rows (Duration 10 s | Camera Orbit once, Video
format WebM, "about 12 s to record" plus Record) and no gear, which 5.13 permits;
three closed with the mark "10 s, Orbit once, WebM". PresentPanel was the one
closed board without the matching title; it now carries "Export video. 10 s,
Orbit once, WebM" like the other two.

### 5.14 Validation report -- FOUR CLOSED BOARDS, THREE SPELLINGS OF ONE MARK

ImportAddToGraph's own comment found this and left it: "the four boards that draw
this section closed now spell its mark three ways ... the spelling difference is
left for whichever pass owns the mark vocabulary." This is that pass.

5.14 names the mark: the highest severity glyph plus the count. DataPanelLoaded
draws it -- a 16 px amber triangle and "4 types" in the trailing slot -- and
`VOCAB.md`'s own snippet draws the same. **ImportAddToGraph's dot-plus-pill
"4 issue types (27)" becomes that**, with "Validation report. 4 issue types, 27
issues" in the title. TableJoin keeps "2 info" and gains the title it was
missing: on that file the highest severity IS info and the mark says so in words,
so a glyph would restate what the mark already reads (Rule 8). ValidationPopout,
open, keeps its primary-ink detail gear.

### 5.15 Policies -- IDENTICAL ON BOTH BOARDS, AND BOTH DREW A CHEVRON OVER NOTHING

ImportOptions and ColumnRolePopout agreed with each other, so there was no
board-to-board drift -- but both drew a chevron on a section whose two controls
carry a Coming tag, with no rows behind it on either board and no board in the
set drawing the open form. Test 1 fires, and 5.15's own fallback says the same
thing in its own words: "delete the chevron rather than leave it decorative."

Both rows lose the chevron and keep everything else -- the name at value ink, the
Coming tag, and the mark "5 repeats, 2 self-loops", which is the file's own parse
record. The chevron returns with the two resident rows the moment Repeats and
Self-loops ship; ImportOptions' measured 31.57 px of dialog overflow is then the
thing to solve, and it is recorded on that board.

The 400-character title on ColumnRolePopout is replaced by ImportOptions' shorter
one, so the two boards that draw this section carry one string.

### 5.16 Provider -- CLEAN

AiPanel closed with the Connected dot and "claude-sonnet-5"; AiPanelCompact open
with the Connected dot and the dimmed `Provider keys and settings` gear, the
model name deleted because the resident model row prints it. That is D5 drawn
exactly. No edit.

### 5.17 Console -- TWO BOARDS, TWO ARRANGEMENTS OF THE SAME THREE THINGS

Both boards draw a name, a Coming tag and (closed) the mark "3 commands", but in
opposite places: AiPanel put the mark beside the NAME and the tag in the trailing
slot; AiPanelCompact put the tag in the trailing slot beside the pin and the gear.
The set's arrangement everywhere else -- Policies, Neighborhood expansion,
FilterBuilderExpert -- is that **the tag qualifies the NAME and the trailing slot
belongs to the section's mark when closed and to its verbs and gear when open**
(D5). Both boards now take it.

Console keeps its chevron. Its Coming tag is 5.17's own instruction, and unlike
Neighborhood expansion and Find a pattern its open form IS drawn in the set --
AiPanelCompact draws the transcript lines, the input with its completion hint and
Run script -- so the chevron opens onto rows that exist.

---

## 3. The four sweeps

Each was run once, across every board, from a scan rather than by eye.

**Sweep 1 -- the closed trailing slot.** 152 closed section headers in the set;
17 carried a 24 px trailing button. Ten were Schema's Export schema JSON (5.8),
one was Main's Filter builder (5.6), five were the RT-8 empty-section plus, which
is the one thing that form is allowed. After the pass: **zero closed section
headers in the set carry a trailing button**, and the five pluses now sit on
headers with no chevron, which is RT-8's empty form entire.

**Sweep 2 -- unshipped sections with a chevron.** Neighborhood expansion (4
boards), Find a pattern (2), Filter builder (1), Filters (1), Policies (2). All
now draw the empty 16 px leading slot. **Zero remain.**

**Sweep 3 -- live-but-empty sections with a chevron.** RT-8's empty form has an
empty leading slot; nineteen rows across ten boards drew a chevron over it
anyway. This is outside the seventeen, but it is the same defect and the same
edit, and leaving it would have made 1.9 a revision that removed the chevron over
nothing from some sections and not others. Swept: **Filters** (ExploreNotesList,
ExplorePanel, Main, MultiSelection, SettingsPerformance), **Sets**
(ExploreNotesList, ExplorePanel, Main, TimeSlider), **Views** (ExplorePanel, Main,
MultiSelection), **Notes** (ExplorePanel, Main, SettingsShortcuts,
ShortcutsDialog, TimeSlider), **Reports** (KeepAdvancedOpen, PresentCompact,
PresentPanel). Each keeps its dimmed name, its info circle and its resident plus;
the chevron returns with the first saved filter, set, view, note or report.

The ONE dimmed-name section in the set that keeps its chevron is StyleLibrary's
Animation, and 5.2 licenses it by hand: the name is dimmed because both values
are at their defaults, not because the section is empty, and four boards draw its
two rows.

**Sweep 4 -- A6's two inks.** Every gear in the set was read with its title.
One drew A6's primary ink as `#4a7ee8`: AnalyzeSweep's "Advanced parameters. Run
as sweep is on". `VOCAB.md` 14.1 spells the pair `#7a828e` / `#d5d7da`, and every
other deviating gear in the set draws `#d5d7da` -- ImageOptionsPopout,
ReportEditorDrawer, MultiSelection, ValidationPopout. Corrected. ExportLegend's
`#4a7ee8` gear is NOT A6 and is left alone: it carries the `#28364e` background
of an opener that is currently open, which is a different rule.

Every gear's ink was then checked against what that board's gear actually holds.
All correct after the edit: dimmed on Parameters, Animation, Values, Schema, All
statistics, Categories, Runs, Provider, Console, Step through time and the three
Selection statistics gears added here; primary on MultiSelection's Selection
statistics (a pinned A), ValidationPopout's Validation report (1 more issue, 3
info, re-ran after step 2), ImageOptionsPopout's Export image (1 option changed),
ReportEditorDrawer's Bridges report (1 option changed) and AnalyzeSweep's
Advanced parameters (run as sweep is on).

---

## 4. What changed, board by board

Twenty-nine boards. Every one carries a `REVISION 1.9, SET-WIDE CONSISTENCY PASS`
paragraph in its file comment naming its own edits.

| Board | What changed |
|---|---|
| **AiPanel** | Console: the Coming tag moves to the name, "3 commands" moves to the trailing slot (5.17, D5). |
| **AiPanelCompact** | Console: the Coming tag moves to the name; the pin and the gear keep the slot. |
| **AnalyzeSweep** | The Advanced parameters gear takes A6's primary ink `#d5d7da` instead of `#4a7ee8`. |
| **ColumnRolePopout** | Policies loses its chevron; its 400-character title is replaced by ImportOptions'. |
| **CommandPalette** | Export schema JSON leaves the closed Schema header. |
| **DataTableDrawer** | Selection statistics gains its dimmed gear. The "selection / graph" key stays in the header: this drawer's value columns are 38 px and cannot hold the words. |
| **ExploreNotesList** | Filters and Sets lose the chevron over their empty libraries. |
| **ExplorePanel** | Neighborhood expansion and Find a pattern take the unbuilt form; Selection statistics gains its dimmed gear; Filters, Sets, Views and Notes lose their chevrons. |
| **ExplorerLoading** | The Schema title mirrors its mark: "Schema. measuring...". |
| **FilterBuilderExpert** | Selection statistics: Export CSV becomes the section's gear. Filter builder loses a Coming tag it cannot support. |
| **FilterExpression** | Neighborhood expansion and Find a pattern take the unbuilt form. Its zero-rule Filter builder is untouched -- it was the target the others were brought to. |
| **ImageOptionsPopout** | Export schema JSON leaves the closed Schema header. |
| **ImportAddToGraph** | The Validation report mark becomes the amber triangle plus "4 types", with the title 5.14 implies. |
| **ImportOptions** | Policies loses its chevron; its mark span takes the ellipsis form ColumnRolePopout already used. |
| **InsightsWide** | Export schema JSON leaves the closed Schema header. |
| **KeepAdvancedOpen** | Export schema JSON leaves the closed Schema header; Reports loses its chevron. |
| **Main** | Neighborhood expansion and Find a pattern take the unbuilt form, retiring the 11 px name and putting the Coming tag on screen; Filter builder at zero rules takes RT-8's empty form and "Edit as expression" leaves the header; Filters, Sets, Views and Notes lose their chevrons. Its OPEN Schema section is untouched. |
| **MultiSelection** | Find a pattern takes the unbuilt form; Filter builder takes RT-8's empty form and gains the plus it was missing; Filters and Views lose their chevrons. |
| **PresentCompact** | Export schema JSON leaves the closed Schema header; Reports loses its chevron. |
| **PresentPanel** | Export schema JSON leaves the closed Schema header; Reports loses its chevron; Export video's closed header gains its title. |
| **SavedItems** | Export schema JSON leaves the closed Schema header. |
| **Settings** | Export schema JSON leaves the closed Schema header. |
| **SettingsPerformance** | The Explore panel's Filters row -- a Coming tag at value ink over a chevron -- takes RT-8's empty-library form. Ship state is settled for the whole set, not per screen. |
| **SettingsShortcuts** | Notes loses its chevron. |
| **ShortcutsDialog** | Notes loses its chevron. |
| **ShortcutsOverlay** | Export schema JSON leaves the closed Schema header. |
| **TableJoin** | The Validation report header gains its title; the mark "2 info" stays. |
| **TimeSlider** | **Step through time is drawn EXPANDED** with its dimmed gear, its Coming tag deleted and its title made MultiSelection's; the bar-gear pop-out loses the two rows that became resident; Neighborhood expansion, Find a pattern, Filter builder and Filters lose their chevrons; Sets and Notes lose theirs; Export schema JSON leaves the closed Schema header. |

Boards read and left unchanged because they were already single-valued:
AllStatistics, AnalyzePanel, AnalyzeParameters, AnalyzePicker, CanvasToolbar,
CategoryTable, CompareSplit, ContextMenu, DataPanelLoaded, ExplorerAfterCard,
ExplorerExpert, ExplorerLargeGraph, ExplorerNotes, ExportLegend,
GroupProfilePopout, HistoryPopover, ImportFlow, ImportLargeFile,
ImportParseError, ImportRecognised, InspectorGenomics, IpadInspector, IpadPanel,
NoteEditorPopout, RampPopout, ReportEditorDrawer, RunRecordPopout, StyleDiverging,
StyleFromAnalysis, StyleLibrary, StylePanel, ValidationPopout, ViewsMenu,
Welcome.

---

## 5. The boards re-scoped under D11

All eight were re-scoped correctly by the 1.9 pass and needed no repair here.
Verified board by board:

| Board | Premise now drawn | Verified |
|---|---|---|
| **AllStatistics** | All statistics expanded -- three rows, each with its own Computing state -- with the long-tail gear pop-out beside it | yes; the header keeps "Computing 3 of 7" under D5's exception |
| **AiPanelCompact** | Provider and Console both expanded, plus the no-provider state with the setup prompt in place of the chat input | yes; both gears dimmed; Console's tag re-placed here |
| **FilterExpression** | The expression door drawn from a compliant section; its own zero-rule Filter builder as the RT-8 empty-section plus | yes; it is the exemplar Main and MultiSelection were brought to |
| **ImageOptionsPopout** | Premise intact -- a gear pop-out drawn open is a legal board under D1 | yes; Export video closed with its mark, Export image's gear in the primary ink |
| **RampPopout** | Parameters, Animation and Values all expanded, with the ramp door on its resident RT-4 row | yes; three of the seventeen on one board, all three matching their twins elsewhere |
| **ValidationPopout** | Validation report expanded with the 360 detail gear beside it, and no pin | yes; gear in the primary ink; no pin anywhere on the board |
| **CategoryTable** | Categories expanded with its gear and the row-count footer | yes; the footer reads "3 of 41 rows" -- see 5.11 above |
| **AnalyzeParameters** | Premise intact, plus clause (2)'s promotion: Damping 0.5 resident under the Influence row | yes; drawn at ROW 8 with the measurement in the board's comment |

Two of the eight keep their premise entirely, which is D11's own useful finding:
a gear pop-out drawn open is a legal board, and only a SECTION drawn as a pop-out
is not.

---

## 6. What could not be reconciled

Named rather than quietly resolved, because each is a place where two documents
or two boards make claims this pass had no authority to settle.

1. **"6 of 41 rows" (5.11, D11) against the three rows CategoryTable draws.** The
   board's "3 of 41 rows" is the honest number for the rows on screen; the work
   list's "6 of 41" is the pop-out's footer carried over. Left as the board draws
   it. Whoever owns 5.11 should strike the 6.

2. **D12's Expand-neighbors caret is unaddressed on five of its six boards.**
   D12 owes the mark "2 steps, 3 types" to the caret on ContextMenu,
   ExplorerExpert, ExplorerNotes, NoteEditorPopout, IpadInspector and
   FilterExpression. None of the first five was edited in the 1.9 pass and none
   is edited here: on ContextMenu the caret sits inside a contiguous unbuilt run,
   where REGISTER 3 forbids a per-row extra, so the obligation and the register
   collide and the collision is a decision, not a consistency call. It is
   consistent today only in the sense that all six are equally un-done.

3. **Per-fixture ship state remains a per-board claim, and two sections use it.**
   ExploreNotesList declares its divergences deliberately -- "1.8 settles the
   INVENTORY and the ORDER of the eight sections, not which of them have shipped
   on which fixture" -- and draws Filter builder and Step through time unbuilt
   where Main and ExplorePanel draw them live. Those rows are now spelled
   identically WITHIN each state (unbuilt: no chevron, `#5f6873`, tag; live: the
   state's own form), so the remaining difference is a state difference, which is
   what the format brief allows. It is still a claim about the product that no
   document owns.

4. **Neighborhood expansion's closed mark is now in a title, not on a row.**
   5.4 asks for "2 steps, 3 types" as the closed mark. Since the section is
   unshipped everywhere and D1 gives an unshipped section no chevron and no state
   to report, the mark rides in the row's title on all four boards that carried
   it. If the intent of 5.4 was that this capability IS live, the fix is to say so
   in one place and the chevron, the mark and the resident Hops and type-filter
   fields all come back together -- but that is a ship-state decision and it would
   contradict the Coming tag on five boards and the unbuilt "Expand N neighbors"
   on five more.

5. **AnalyzePicker's Predict group** keeps a chevron beside a Coming tag. It is a
   catalogue group, not one of the seventeen: the chevron opens onto question
   rows that exist and some of the questions are unshipped. Left alone, listed so
   the next chevron sweep does not read the scan and delete it.

---

## 7. Measurement

Only two boards change height, and both are declared on the board.

**TimeSlider**, the one board that gains rows: Explore panel content **349 px ->
421 px** in an 800 px window -- two 32 px rows plus an 8 px pad -- so nothing
scrolls. The bar-gear pop-out goes **[604,592 280x202] -> [604,656 280x138]**; it
is bottom-anchored at `bottom: 82px`, so its bottom stays on 794, the 12 px gap
to the bar's top edge at 806 is unchanged, and so are its right edge at 884, its
8 px clearance of the legend at 892 and its absent caret. Inspector content
519 px, unchanged.

**Every other edit is inside an existing 32 px row and changes no height.** A
chevron replaced by an empty 16 px slot is the same box; a 24 px verb removed
from a trailing slot, a 24 px gear added to one, a pill swapped for a glyph plus
a span, and a tag moved from one end of a header to the other all leave the row
at 32. The three boards `SECTIONS-1.9.md` section 7 names as the ones to measure
first -- Main's inspector with Schema open (declared 14 px over, unchanged here),
StylePanel with three sections open, DataPanelLoaded with Validation report
open -- are all untouched by this pass, and their 1.9 measurements stand as
published.
