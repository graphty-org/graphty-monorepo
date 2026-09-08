# Decisions for spec revision 1.5

The ratified outcome of nine design passes against spec revision 1.4: the
seven defects, XR, info circles, compact icons, four minimalization passes
(core screens, data screens, expert screens, navigation screens) and three
navigation-path passes (novice, analyst, data). This document supersedes the
proposals those passes returned. Where a pass proposal and this document
disagree, this document wins.

## How to read this

Each decision carries an ID, the rule, why it was taken, the spec text where
there is one, and the artboards affected. A decision marked **(rule)** applies
to every artboard and is checked before any per-screen edit; a decision marked
**(screen)** names its files.

Section numbers this revision claims:

| Number | Owner |
|---|---|
| 5.9 | XR (VR and AR) |
| 6.7 | Explanation rule (info circles) |
| 6.8 | Icon rule |

Two passes both proposed "6.7". The Explanation rule takes it because the Icon
rule cites it; the Icon rule takes 6.8.

Artboard count: **39 stays 39, plus one addition, `ExplorerSubset`** (NAV-12).
Three proposed artboards are rejected (see Rejected).

## Precedence when two decisions land on one row

Apply in this order. The first that fires wins.

1. **Reported text stays.** 6.7 pins readings, caveats, scope lines,
   estimates, counts, validation text, empty states, insight bodies and
   unavailable reasons inline. No minimalization, density, width or Settings
   value moves them.
2. **The owning region keeps the fact; every other region drops it.**
   MIN-1 names the owner per fact.
3. **Teaching text moves behind a circle; it is not deleted.** A sentence that
   teaches is disclosed (6.7), never removed, unless it restates a control or a
   value visible on the same screen -- then it is a duplicate and rule 2
   applies.
4. **A control that a traced path uses as its entry point keeps its label.**
   Icons never take the text off a row that a novice or analyst path enters
   through (6.8, and IK-4).
5. **Never both.** One string is either deleted as a duplicate or moved behind
   a circle. It is never deleted in one pass and re-homed in another.

---

# 1. Defects

## DEF-1 (rule) One treatment for a subtle action; the binding lives in the tooltip

**Decision.** A panel action that is not its section's primary action is a
*subtle action row*: transparent at rest, no border, 24 px tall, full panel
width, 4 px radius, a 14 px leading icon in the dimmed colour, an 11 px label
at weight 500, hover as its only chrome. Its trailing slot carries data about
the action or nothing -- never its key. A binding appears in exactly four
places: the control's tooltip, a menu row, a palette row, and the shortcuts
table. Bordered and filled boxes inside a panel are reserved for inputs,
selects and the section's primary button.

**Why.** 28 controls across 16 artboards drew a command as a bordered box with
a right-aligned mono key chip, which reads as a text field with a suffix; the
same action ("Zoom to selection") was drawn four different ways. Worse, in the
inspector Actions blocks the trailing column carried a key on some rows and
data on others, so one column meant three things down one list. The spec
already put the binding in tooltips, menus and the palette; it never said those
were the only places.

**Spec text.** 5.6, new paragraph after Context menu:

> Where a binding appears. A key binding is shown in exactly four places: the
> control's tooltip, as the last element of the tooltip sentence after a 6 px
> gap; a dropdown, context or row menu item, right-aligned in the item's
> trailing column; a command palette row, in its last cell; and the shortcuts
> table (the ? dialog and Settings > Keyboard shortcuts). Nowhere else. A
> binding never appears inside a button, never in the trailing column of a
> panel action row, a switch row or a section header, and never in any trailing
> column that also carries data on other rows: a trailing column means one
> thing per list. Two chips are not bindings in disguise and stay: the top bar
> search pill's Cmd+K and the / hint inside a search input, both printed inside
> a real input where a hint belongs.
>
> Action shapes. A panel action that is not its section's primary action is a
> subtle action row: transparent at rest, no border, 24 px tall, full panel
> width, 4 px radius, a 14 px leading icon in the dimmed colour, an 11 px label
> at weight 500, hover as its only chrome. Its trailing slot carries data about
> the action or nothing -- never its key. An action drawn as a bordered box
> with a trailing chip reads as a text field with a suffix and is never used.

5.3 Settings cross-cutting, amend the keyboard-shortcuts line to end: "...every
tooltip ends with its binding, which with menus, the palette and the shortcuts
table is the only place a binding appears."

**Artboards.** ExplorePanel, ExploreNotesList, FilterBuilderExpert, TimeSlider,
Main, CompareSplit, HistoryPopover, MultiSelection, DataTableDrawer,
DataPanelLoaded, ExplorerExpert, ExplorerNotes, InspectorGenomics, AiPanel,
StylePanel, StyleDiverging. Unchanged and not to be "fixed": the top bar Cmd+K
pill, the / hint inside search inputs, every menu row, palette rows, the
shortcuts dialog and Settings rebind rows, the tooltip bubble, the History
header legend.

**Guard.** The inline chip was the cheapest always-visible route from mouse to
keyboard. It is replaced, not removed: tooltip on hover, context menu on
right-click, palette, and the ? dialog. The hover fill on the action row is
`#374047` (not `#2a3035`) and the leading icon is mandatory, because a
transparent row is otherwise not obviously clickable.

## DEF-2 (rule) Cost classes are internal; the estimate sits beside Run

**Decision.** No cost-class word -- instant, iterative, heavy, sampled, cubic,
unbounded, windowed -- appears anywhere in the interface. An open question-group
header shows the group name alone; a collapsed header shows the name and the
card count as a dimmed trailing number. The estimate appears exactly once per
card, in three bands: under 2 s nothing at all; from 2 s to the ask limit an
11 px dimmed estimate immediately left of Run; above the ask limit the estimate
moves onto the button ("Run (about 40 s)") and Run confirms once; above the
warn limit the card carries the section 3 warning line and the button reads
"Run anyway (about 3 h)". The scope line never carries the estimate.

**Why.** "3 cards, heavy" is three problems in one row: the count restates what
expanding shows, the class is an implementation word that is wrong at the size
being drawn (every "heavy" card finishes instantly on 20 nodes), and a group's
class is a range, so AnalyzePanel had to write "3 cards, instant to cubic",
which says nothing. The spec already contradicted itself on where the estimate
goes (scope line at one place, beside Run at another) and ExplorerLargeGraph
invented a third place, a card-title pill.

**Spec text.** 5.3 Analyze, replace the question-group intro:

> Question groups, each a collapsible header. An open header shows the group
> name alone. A collapsed header shows the group name and the card count as a
> dimmed trailing number ("Find groups  4"), because the count is the only
> thing a collapsed group can tell you; its tooltip reads "4 questions in this
> group". Cost classes are an internal cost model: they select each card's
> estimate and its ask, warn, sampling and time-box behaviour, and they gate
> which cards the Insights strip may offer (7.3). No class name ever appears in
> the interface: not on a group header, not on a card, not in a tooltip, not in
> the palette, not in a caveats line. What the user sees of cost is an estimate
> in the user's units of time, and a warning when it is large. The Cost column
> in the table below is engineering reference, not label text.

Retitle that table's third column "Cost class (internal)". Delete ", followed
by the estimate when one applies" from the card anatomy. In Running and scope,
add the three estimate bands verbatim, ending: "Estimates round to one
significant figure and are written with the words about, s, min and h; never a
tilde. The estimate never appears twice on one card, and the scope line never
carries it." The List view row carries the estimate too, so List is not the
cheaper way to hide cost.

**Artboards.** AnalyzePanel, ExplorerAfterCard, ExplorerLoading,
ExplorerLargeGraph, IpadPanel.

## DEF-3 (rule) Each fact once in the Import options dialog

**Decision.** File name and size appear once, in the title row. Counts appear
once, in a one-line summary. The memory estimate and the render ceiling appear
once, in the warning line. The subset arithmetic appears once, inside the
chosen Load option. The dialog carries no Large badge -- a badge separates one
row from its neighbours in a list, and a dialog is about one file. A sample or
recent row shows its size only when the size is the decision.

**Why.** ImportLargeFile stated the file name twice, the render ceiling three
times and the memory estimate twice, with five lines of chrome before the first
touchable control. The spec's own canonical string is shorter than what was
drawn. Sample rows across four artboards carried a KB figure that decides
nothing.

**Spec text.** 5.3 Data, dialog item 1:

> The file's identity appears once, in the title row: "Import options" then,
> dimmed, "<file name>, <size>" followed by the entry clause of item 0. The
> body opens with the summary and nothing else: "200 nodes, 612 edges,
> directed, weighted by amount, timed by ts". For a large file the dialog reads
> only the first 256 KB for format, confidence, mapping and first rows, and the
> summary reads "Estimated 1.0M nodes, 10M edges (from the first 256 KB)";
> parsing starts on Import. Sizes read KB below 1 MB, MB below 1,000 MB, GB
> above. The summary never repeats the file name, never carries a Large badge,
> and never states a limit that the warning line below it states. Each fact
> appears once in the dialog.

Sample datasets: "A sample or recent row shows its size only when the size is
the decision -- above the large-graph threshold, where it accompanies the Large
badge and the 'Opens in Performance mode, about 20 s' line. Small samples show
counts alone."

**Artboards.** ImportLargeFile, ImportAddToGraph, ImportRecognised,
ImportOptions, Welcome, TableJoin. Unchanged because the number is the
decision: DataPanelLoaded's loaded-file size, PresentPanel export sizes,
SettingsPerformance's memory readout, Settings' model download size.

**Guard.** The warning line is the only remaining "this is not routine" signal
in the dialog, so it keeps the amber triangle, stays above the fold, and is the
first focusable element in the dialog body.

## DEF-4 (rule) The Time role gains a unit family, and every time surface reads from it

**Decision.** A Time role takes three fields: Kind, **Measured in** (Date and
time / Number / Ordered category), and a family-dependent third field (Format
and resolution for dates; Unit name singular and plural plus Decimals for
numbers; Order and Unit name for ordered categories). One substitution table
drives every downstream string: window size, step, overlay readout, cumulative
form, status bar slot, filter chip, track ticks, step tooltip, playback speed,
attribute select groups, and the Load control's window option.

**Why.** The Time role's Format list already admitted "plain number", and
nothing downstream honoured it: every surface was written in days and dates. A
simulation step counter, an ontology version sequence, a training epoch and an
experiment round all satisfy the Time role and break every one of those
strings. This narrows the temporal-navigation capability's stated requirement
without cause.

**Spec text.** 5.3 Data item 4 gains the three fields and the detection rule
(ISO-shaped string, 10-digit integer, 13-digit integer give Date and time; any
other numeric column gives Number, default unit "step"; a low-cardinality text
column given a Time role gives Ordered category; an ambiguous guess is marked
"guessed"). The substitution table is authoritative:

| Surface | Date and time | Number, unit "step" | Ordered category, unit "release" |
|---|---|---|---|
| Window size control | 30 with a unit select | 50 with a static label "steps" | 3 with a static label "releases" |
| Step control | 7 days | 10 steps | 1 release |
| Overlay readout | Viewing: 2026-01-05 to 2026-02-04 | Viewing: steps 1,200 to 1,250 | Viewing: v1.2 to v1.4 |
| Cumulative form | Viewing: up to 2026-02-04 | Viewing: up to step 1,250 | Viewing: up to v1.4 |
| Status bar slot | same string | same string | same string |
| Filter chip | Time: 2026-01-05 to 2026-02-04 | Time: steps 1,200 to 1,250 | Time: v1.2 to v1.4 |
| Track ticks | month or day labels by span | round numbers at the fitted interval | category names, evenly spaced |
| Step tooltip | Step forward 7 days (.) | Step forward 10 steps (.) | Step forward 1 release (.) |
| Playback speed | 1x (one window per second) | 1x (one window per second) | 1x (one window per second) |
| Load window option | ts runs from A to B; pick a start and end | step runs from 0 to 5,000 | release runs from v1.0 to v2.3 |

Ordered category has no arithmetic: window and step are counts of categories,
the track is evenly spaced, and the density sparkline is a bar per category.
5.3 Explore, 5.1 status bar, 5.4 Temporal result and 7.3 card 6 are amended to
read their units from the role rather than from dates.

**Artboards.** TimeSlider (mark every unit-bearing string as derived; render
the unit select only in the Date and time case; "1x (one step per second)"
becomes "1x (one window per second)"), ImportOptions (the Time role popover
grows to three lines: Kind "A single moment", "Measured in: Date and time",
"Format: ISO 8601 (2026-04-01T00:00:03Z)" -- the word "instant" goes because it
also named a cost class), DataTableDrawer, ImportLargeFile, and the eleven
artboards carrying the empty status-bar slot template comment.

## DEF-5 (rule) The four import artboards are one dialog in four states, and the title row says why it opened

**Decision.** One name, four states. The title row carries the entry clause in
one of six fixed forms: "delimited file", "guessed column", "parse error",
"second file, data already loaded", "above the large-graph threshold", "always
show import options is on"; when two apply the more specific wins, in that
order from the end. The dialog opens automatically on six triggers and reopens
on the loaded file from seven places, one of which (the command palette) is new.

**Why.** Three of the four artboards are the same mode with different files and
nothing said so; the canvas titles did not even share a name. Nothing on any of
them said why the dialog appeared, which for a dialog that opens unbidden is
the first question a user has.

**Spec text.** 5.3 Data, new dialog item 0 (the entry clause), plus the
complete open list (delimited text file; any guessed column; any parse error;
a second file while data is loaded, opening at item 3; any file above the
large-graph threshold, which wins over the immediate-load rule; Settings >
Data management "Always show import options") and the reopen list (any Change
link on a Loaded data line, scrolled to its own control; the "Mapped as before"
toast; the Data tier 3 list; the Insights strip card "Load the full graph"; the
step 3 choice "Compare with current graph"; Import as "Add attributes from a
table"; the command palette). Reopening never re-reads the file. 5.5 indexes
"Import options (technical: import mapping)", enabled only when a file is
loaded.

**Artboards.** ImportOptions, ImportRecognised, ImportLargeFile,
ImportAddToGraph, CommandPalette. Canvas titles become "Import options --
delimited file, nothing loaded", "-- recognised export, nothing loaded",
"-- above the render ceiling, nothing loaded", "-- second file, data already
loaded". Each file's leading comment carries the same two-line STATE block.

**Note.** DEF-3 and DEF-5 are applied together or not at all: the title row
gains one clause while the body loses more than two lines.

## DEF-6 (screen) The render thresholds are measured, not typed

**Decision.** Settings > Performance replaces the large-graph threshold row and
both render ceiling rows with one detected block: a headline sentence, the
measurement provenance, the consequence sentence, and two actions, Recalibrate
and Change. Change discloses the four numeric fields pre-filled with the
detected values and stamps the block "Set by you.  Use detected values". The
numbers come from a first-run offscreen probe (browser facts plus a 512x512
instanced render at 1,000 / 8,000 / 64,000 nodes, hard-capped at 2.5 s and
abandoned the moment a file is opened), stored with a machine fingerprint and
shared with the Analyze estimate probe. Detection failure applies the built-in
defaults silently, never a modal, never a blocked start.

**Why.** The screen asked the user to type ten numbers that are properties of
the machine, not of the graph or of taste; nobody knows what to type, and the
same person meets a laptop and a workstation in one week. Section 12 already
admitted the numbers were guesses. The calibration mechanism already exists for
Analyze estimates: one record, two consumers.

**Spec text.** 5.3 Settings > Performance gains the Machine calibration
paragraph (probe inputs, the fitted line, the threshold at 16.7 ms per frame
floored at 2,000 and capped at 100,000, the ceiling as the lesser of 100 ms per
frame and 60 per cent of the memory budget, both rounded down to one
significant figure, the iPad producing its own numbers from the same probe, and
re-running on Recalibrate or when the machine fingerprint changes), the What
Settings shows block, and the failure path. The defaults table's threshold and
ceiling rows read "measured on this machine; <numbers> as the fallback" and the
separate iPad ceiling row is deleted. Section 12's threshold bullet is rewritten:
the render threshold and ceiling are no longer open; the exact-computation cap
and the layout size ratings still need a benchmark story.

**Artboards.** SettingsPerformance, ImportLargeFile (the warning's tooltip now
reads "Render ceiling: about 200,000 nodes, measured on this machine.
Settings > Performance"), ExplorerLargeGraph (Performance mode chip tooltip),
Welcome (comment only: the probe runs offscreen here and is abandoned if a file
is opened first).

**Guard.** The consequence sentence beneath the detected number is what makes
it legible and is never trimmed. Rounding to one significant figure is what
stops thermal jitter from changing the displayed value between runs.

## DEF-7 (rule) A metric that has not been computed is still an encoding you can pick

**Decision.** Every attribute list -- the Style By attribute select, the Explore
filter builder's attribute row, the Custom score path picker and the Analyze
histogram picker -- ends with a group of node metrics the graph supports that
have not been run: a 12 px play glyph, the plain name, the technical name
dimmed, and a trailing hint that is "not run" under 2 s and the estimate
otherwise. Picking one runs it and applies the selection the user was making,
as one undoable pair, under the same estimate-and-confirm gate the Insights
strip and the palette already use. Metrics that cannot run on this graph are
listed disabled with the reason in the tooltip; cubic and unbounded metrics are
never listed.

**Why.** The list was a record of what you had already done, not a menu of what
you could do, so "colour by influence" -- a Style intent -- cost a round trip
through Analyze the user did not want. The background degree pass made it
actively misleading: "Most connected" was in the select while every other
centrality was absent, so the rule the user inferred from the one visible case
was false. This is the same decision the analyst pass reached from the other
end and they are merged here.

**Spec text.** 5.4 Style layer row and 5.3 Explore tier 2 gain the Not computed
yet group, the one-action run (spinner in the row, type-default scale or
palette already editable, helper line "Computing Bridges (betweenness)... 42%
Cancel" mirrored in the status bar), the completion contract (one result card
in Analyze, one Data table column, one entry in Explore's attribute list, no
duplicate; the encoding applies; the legend updates; one history entry, "Ran
Bridges (betweenness) and encoded it as node size", and one undo takes back
both), and the three estimate bands. Analyze's Encode as style is unchanged and
remains the other way in; a run started from an attribute list is an ordinary
run with the same queue, progress row, result card and history entry.

**Artboards.** StylePanel (Size row select drawn open with the group),
StyleDiverging (drawn with the above-ask-limit confirm, so that state exists
somewhere), FilterBuilderExpert, ExplorePanel, HistoryPopover (the paired
history entry), ExplorerAfterCard, ExplorerExpert, ExplorerLargeGraph
(comments only: Encode as style is the second of two routes).

**Guard.** A select is a low-commitment control and users open one to browse.
The play glyph and the "not run" hint are load-bearing, not decoration: a
not-run row never looks like a plain attribute. The search input at the top of
the popover is required, not optional, and not-run metrics sort last inside
Metrics, never above a file attribute.

---

# 2. XR

XR is accepted as **spec text only**. It adds no artboards, no capability and
no cost to the flat shell. Nothing in designloom -- no persona, no workflow,
none of the 61 capabilities -- asks for it, so it earns its place as a viewing
mode and is written as an honest degrade.

## XR-A (rule) Section 3 gains an XR shell row, and 5.9 is written

**Decision.** New section 3 row:

> | XR shell | A rail-and-panels shell does not transfer to a headset. VR and AR are a viewing mode for a graph built at the desk, not a second shell: no rail, no activity panel, no 280 px inspector, no status bar, no dialogs. The two in-session surfaces are a wrist panel and a follow card. Scope, bindings, comfort and the return contract are owned by section 5.9. |

New section 5.9, whose load-bearing content is:

- **Scope, one sentence.** In XR you look, select, inspect, expand, ask and
  note; everything that authors data, filters, encodings or exports stays flat.
- **Two surfaces and no others.** A wrist panel anchored to the left forearm at
  a 0.6 m stand-off, 0.24 by 0.32 m, a header, at most eight content rows and
  one row of four large actions, three type sizes (title 45 arcmin, body 30,
  label 24). A follow card billboarded beside the selected node at the node's
  depth, 0.30 by 0.18 m at 1 m, five rows, two type sizes. No surface uses a
  smaller size, a table, a monospace id by default, or an ellipsis: a value
  that does not fit is replaced by its shape and the row offers "Read at the
  desk".
- **The scope table.** Data: no. Explore: read-only plus Expand one hop and
  voice search. Analyze: results readable as their plain-language reading, plus
  at most eight parameter-free runs. Style: read-only, no layout switching --
  a relayout in a headset is a moving world. Present: Capture view only. AI:
  yes, and it is the primary text route. Settings: Comfort only.
- **Entry.** A flat sheet on the desktop screen before the session starts, with
  a readiness line, "In VR you can" and "Do these at the desk", the Comfort
  row, Don't show this again, Cancel and Enter VR. Suppressing the sheet never
  suppresses the readiness warning.
- **Navigation.** The user never moves; the graph does. Grab-the-world is the
  whole model; snap turn 30 degrees by default with a vignette on continuous
  turn; Fit means Fit and recenter; Views presets turn the graph, not the head;
  no teleport in phase one. World scale is clamped so the graph never subtends
  more than 120 degrees and never shrinks below 0.1 m.
- **Selection.** Ray plus trigger or pinch, gaze plus pinch substituted
  automatically where the session reports eye tracking, no marquee, an Add
  toggle instead of Shift, and a 200 selection cap.
- **Running.** Voice is the primary route and the Run list of eight
  parameter-free runs is the guaranteed one. A run whose estimate exceeds 5 s
  is refused in place -- "About 40 s -- run this at the desk" -- because a
  stalled frame in a headset is a comfort problem; until algorithms run off the
  main thread the cap is 1 s and the list says so.
- **Notes.** Readable and addable, append-only in session (no Edit, Delete or
  Done), dictated by voice with Save and Discard, with "Flag this" as the
  provider-free and speech-free fallback.
- **Entering and leaving.** Entry carries in selection, filters, window, style
  layers, results and notes, and places the graph at 0.8 m at arm's length
  rather than inheriting the flat camera; the time slider is frozen. Leaving
  carries out everything the session changed plus one XR viewpoint bookmark,
  restores the flat camera, and an unexpected end takes the same path.
- **Comfort and size.** The XR entry ceiling is 10,000 visible nodes or 50,000
  visible edges -- the desktop *large-graph threshold*, not the render ceiling
  -- because the budget is two eyes in 13.8 ms. Labels capped at 20 at every
  size; Performance mode always on; automatic detail reduction below 72 Hz with
  "Reduced detail to keep the view smooth"; no camera acceleration ever.
- **AR differs in three ways only:** the graph floats at table height in
  passthrough, Capture view records the passthrough framing, and hand tracking
  is unavailable, so AR is controller-first.

**Spec sections.** 3, 5.9 (new).

**Artboards.** None.

## XR-B (screen) The Views menu XR rows gain a gate and a reason

**Decision.** Both XR rows carry the 5.9 gate: under the ceiling "Enter VR";
between the ceiling and 50,000 visible nodes "Enter VR (visible subset)" with
the subset named in the entry sheet; above 50,000 visible nodes disabled with
the reason on the row. Choosing either row opens the flat entry sheet. While a
session runs the status bar mode chip reads VR or AR with an Exit button and
the flat shell stays interactive as a mirror; Escape never leaves XR. The AI
setImmersiveMode tool is subject to the same gate.

**Trimmed from the proposal:** only Enter VR carries a second line (the
readiness count). Enter AR carries none. Two second lines would make the XR
pair the visually heaviest item in a menu whose real job is Reset view.

**Spec section.** 5.6 View modes.

**Artboards.** ViewsMenu (one second line, plus a comment recording the three
gate states so the disabled form is documented without a second artboard).

## XR-C (screen) Settings carries the full XR table and four XR rows

**Decision.** Settings > Keyboard shortcuts' four-row read-only VR group
becomes a twelve-row read-only XR group with two binding columns (Controller,
Hands), headed "Read-only. Learn these before you put the headset on --
Settings is not reachable in a session." Settings > Performance gains four rows
under an **XR sub-header**: XR entry ceiling, XR frame floor, XR run estimate
cap, XR comfort. The Performance mode row's effect list gains "and is always on
in a headset regardless of this setting".

Settings is the complete table; the ? dialog is not (MIN-4).

**Spec sections.** 5.3 Settings (Keyboard shortcuts; Performance defaults
table).

**Artboards.** SettingsShortcuts, SettingsPerformance.

## XR-D (screen) Return from XR is legible: one toast, one History group

**Decision.** On return the shell shows "Back from VR" with one summary line
naming what changed and Undo for the expansion only; no toast when the session
changed nothing. History records the session as one collapsible group, "VR
session 14:21 - 14:39", whose voice-taken steps carry "by voice, in VR" in
their second line, so the exported recipe and the analysis log say where each
step came from. Exiting is not itself a step and is not undoable.

**Trimmed from the proposal:** the toast is recorded as a comment on Main, not
drawn. Main is already carrying the reference shell and a drawn toast reads as
a permanent element. The History group is drawn.

**Spec sections.** 5.9 Entering and leaving; 5.3 Analyze History.

**Artboards.** HistoryPopover (drawn), Main (comment).

## XR-E (screen) Notes dictated in a headset are marked, and XR notes are append-only

**Decision.** A note dictated in a headset is an ordinary note with one extra
mark, a "Dictated" chip beside the time in the inspector, the Explore notes
list and the notes hover card, so a transcript is re-read before it is relied
on. "Flag this" writes a note with empty text whose body reads "Flagged in VR
14:32" in the placeholder style. Edit, Delete and Done do not exist in a
session; all three work normally at the desk. The export prints the Dictated
mark whether or not the chip is drawn.

**Spec section.** 5.7 Notes.

**Artboards.** ExplorerNotes, ExploreNotesList.

## XR-F (rule) The register, the refusals and the open questions ship together

**Decision.** 5.8 gains the nine element rows XR rests on, including the two
capabilities that do not exist in any form (an in-headset world-space UI layer
with forearm anchoring and arcmin-based text scale; grab-the-world on empty
space with a scale clamp and a scale-changed event). Section 11 gains six
refusals: authoring in XR (data table, filter builder, style editor, layout
list, export, Present in any headset form), teleport and walk-in room scale
(deferred), time scrubbing in session, two-hand node manipulation, collaborative
XR, and AR hit-testing. Section 12 gains five open questions: the entry ceiling
and frame floor are reasoned, not measured; is speech recognition available
inside an immersive session; is the 0.6 m forearm stand-off right or should the
panel be placeable; is the 200 selection cap right; is AR worth shipping
without hand tracking.

These three are mandatory companions to 5.9. Without them the numbers read as
benchmarked and the working element session reads as though the wrist panel
were a styling task.

**Spec sections.** 5.8, 11, 12.

**Artboards.** None.

## XR-G (screen) The assistant's XR form is named in the AI panel

**Decision.** In an XR session the microphone becomes push-to-talk on the
controller's B or Y and on the wrist panel's microphone target, held rather
than toggled, with the transcript on the wrist panel and two large targets,
Send and Discard. Answers in session are the same readings shortened to two
lines plus "Read the rest at the desk". Where the headset browser has no speech
recognition the microphone and the whole dictation route are hidden rather than
disabled, and the Run list and Flag this are the guaranteed paths. The console
has no XR form.

**Spec section.** 5.3 AI (tier 1 and tier 2).

**Artboards.** AiPanel (one muted line under the Voice input switch: "Also used
for push-to-talk in VR and AR.").

---

# 3. Info circles

## IC-1 (rule) Section 6.7, the Explanation rule: taught text may be circled, reported text may not

**Decision.** Explanatory text either teaches or reports. The test: read the
sentence with the data taken away. If it survives word for word it teaches and
may go behind an info circle. If any part of it changes or disappears, that
part reports and stays on screen. A sentence that mixes the two is split at the
boundary.

**Why.** The complaint about density is real but the design had no rule, so
every panel author decided case by case and the result drifted text-heavy. The
danger of any hide-the-help pass is that it eats the two mechanisms W14 depends
on -- the plain-language reading (the Comprehension criterion) and the insight
card body (Activation). Sorting by teaches-versus-reports protects both
automatically, because a reading is computed from this graph and can never be
circled, while a card description is identical on every dataset and always can.

**Spec text.** 6.7, new after 6.6:

> Taught text goes behind an info circle. Reported text is inline, and no
> Settings value, density value or screen width may move it behind a circle.
> Reported text includes, and is not limited to: plain-language readings (7.5),
> caveats lines, run record lines, scope lines, estimates and cost warnings,
> match counts and result counts, validation and error messages, empty states,
> insight card bodies (7.3), and the reason a control is unavailable.
>
> Three kinds of taught text stay inline anyway, because reading them late is
> worse than reading them never: text on a control that changes or deletes
> data, text on a control that spends more than the ask limit, and text that
> says where the user's data or credentials go.
>
> An info circle is never the only route to its sentence. The same string is
> the control's accessible description, so a screen reader reads it on focus
> whether or not it is drawn; it is indexed by the command palette with its
> control; and Settings > Appearance draws every one of them inline at once. A
> circle changes when a sentence is read, never whether it exists (principle 1).
> Disclosure is not vocabulary: the same string appears verbatim wherever it
> appears, circled in one place and inline in another, and 6.3's
> same-input-same-text rule is about the string, not its disclosure.

**Principle 1 ruling.** Moving a sentence behind a resting-state visible glyph
is disclosure, not carving out: the guidance is on screen, one hover, focus or
tap away, and is still the accessible description. Principle 1 is broken only
when guidance stops existing or stops being reachable. It is not broken here.

**Artboards.** All (this is the gate every later edit is checked against).

## IC-2 (rule) The control: adopt and normalize the circle three artboards already draw

**Decision.** A 12 px circled "i" in a 14 px box, stroke 1.5, `#a3a8b1` at rest
and `#d5d7da` on hover, focus or open; 24 px hit area in the built app through
padding and negative margin, so no row grows. It sits immediately after the
last name of the canonical pair it explains and before any status pill, so the
label order preference never moves it and it never lands between the two names.
Opens on a 150 ms hover dwell, on a 150 ms keyboard-focus dwell of the control
it belongs to, and on tap; a click pins it until Escape, an outside click, or a
second click. A circle attached to a focusable control is not itself a tab
stop; one attached to static text is, with role button and aria-expanded. The
popover is the tooltip bubble at 250 px: at most two sentences and 220
characters, then at most one "Learn more" link, then the binding as a key chip
when one exists. A sentence that will not fit is not a circle. Below 1280 px
and on any touch pointer, tap is the only open gesture and the popover opens
pinned. Info circles are chrome: Performance mode and the "Hover and tooltips"
switch govern canvas tooltips only and never turn a circle off, so the densest
screens keep their explanations.

**Why.** ImportRecognised, ImportAddToGraph and Settings already draw a circled
i at two slightly different geometries with a 250 px popover and a Learn more
link. Codifying what exists beats inventing a control. Hover for the pointer,
focus dwell for the keyboard, accessible description for the screen reader
resolves all three modalities with one idea and keeps 30 extra tab stops out of
Settings > Performance.

**Spec section.** 6.7 (continues). VOCAB section 10 carries the markup.

**Artboards.** ImportRecognised, ImportAddToGraph, Settings normalize their
existing glyph to the canonical geometry; every other use draws it verbatim.

## IC-3 (rule) The master control is one switch, in Settings > Appearance, defaulted off

**Decision.** "Show help text under controls" is rewritten as **"Show help text
in place"**, default **off**: every taught sentence sits behind its info
circle, one hover, focus or tap away, and is still the control's accessible
description. On, every info circle in the application draws its sentence inline
under its control and the circle is hidden. The switch changes where a sentence
is read, never whether it exists. Density goes back to being about row scale
only: Compact no longer hides card descriptions, because one behaviour has one
owner.

**Why.** The mechanism the user is asking for already existed, with its default
pointing the text-heavy way and a question-mark glyph that reads "I am
confused" rather than "here is more". Flipping the default is what makes the
pass land; keeping the switch is what keeps it principle-1 safe, because one
click restores every sentence at once. Leaving density as a second owner of the
same behaviour would give one decision two controls.

**Spec text.** 5.3 Settings > Appearance:

> density (Comfortable or Compact; Compact uses the Mantine xs row scale and
> tightens caveats spacing, and changes row height only -- it never changes
> which explanations are visible); Label order: Plain first (default) or
> Technical first (both names are always rendered; an info circle always
> follows the complete pair and never sits between the two names); Show help
> text in place (default off: every taught sentence sits behind its info
> circle, one hover, focus or tap away, and is still the control's accessible
> description. On: every info circle draws its sentence inline and the circle
> is hidden. The switch changes where a sentence is read, never whether it
> exists (6.7)).

**Artboards.** None currently draw Appearance. When one is added it draws the
switch off, with the sub-line "Off keeps every explanation one hover or tap
away on the i."

## IC-4 (rule) Readings, caveats and the unavailable reason are pinned inline

**Decision.** A plain-language reading is never placed behind a circle, at any
density, on any screen width, under any Settings value; it is the mechanism for
the W14 comprehension criterion and is the first thing the inspector shows. The
modularity band clause leaves the sentence and becomes the info circle on every
modularity value, in the reading and in the result body alike, because the
scale is identical on every graph while the number and the band word are not.
The reason a control is unavailable is reported text, never behind a circle: it
is the disabled control's own tooltip, which opens on hover, on keyboard focus
and on tap, names the one action that would enable the control, and is never
repeated as body text in a panel or a result card.

**Why.** 7.6 names the reading as the comprehension mechanism, so it must
survive any density pass untouched -- and it should say so in 7.5's own voice
rather than being re-derived. The band clause was the one taught fragment
inside a reported sentence and was already duplicated as a hover-only tooltip.
An unavailable reason reports state, so it cannot be circled; but a
three-line paragraph in a result body is the wrong home for a sentence about
one control.

**Spec text.** 7.5 second paragraph: "A reading is never placed behind an info
circle, at any density, on any screen width, under any Settings value (6.7)."
The community example becomes "The groups are clearly separated (modularity
0.54)." and the banding sentence ends "...the band scale is the info circle on
every modularity value and is no longer repeated inside the sentence."
6.7 closing paragraph carries the unavailable-reason rule; 5.3's Compare
categories row carries the enabling action in its tooltip.

**Artboards.** ExplorerExpert, ExplorerAfterCard, CategoryTable, CompareSplit
(modularity circles); ExplorerAfterCard (the three-line "Import a category
table..." paragraph is deleted and the disabled row is drawn with its tooltip
open); AnalyzePanel, Main, ExplorePanel (disabled rows keep their tooltips;
"Pick a node first" stays inline where it names the action that enables a Run
button in view -- and see MIN-12).

## IC-5 (rule) The run record collapses; it is provenance, not help

**Decision.** The run record is never placed behind an info circle. It
collapses to one line -- method, the parameters that were not defaults, and
scope -- with a Details chevron opening the full record (weight attribute,
direction, timestamp, duration, engine version, Copy as JSON, Copy as command,
Copy methods text). Its open state is remembered per view kind under 6.5. Cards
that belong to one run family -- a sweep, the two halves of a Compare -- render
the shared fields once, on the family's summary card or header strip, and each
member's line carries only what differs plus timestamp and duration. The three
Copy links become one Copy control (IK-5). The caveats line stays visible in
both reading states; the run record no longer does.

**Why.** On ExplorerExpert a result card opened with 13 lines of prose in a 280
px column, of which two were the reading and five were the run record -- the
densest block in the design. Putting it behind an i would misclassify
provenance as help and set exactly the precedent 6.7 exists to prevent. The
right instrument is the tier axis. W25 asks for parameters "available as
copyable text", not permanently displayed, and Copy methods text is what a
methods section actually consumes.

**Spec text.** 7.5: "The caveats line stays visible in both states. The run
record collapses to one line -- method, the parameters that were not defaults,
and scope -- with a Details chevron opening the full record. Its open state is
remembered per view kind under 6.5. The run record is never placed behind an
info circle: it reports what was done, not what a thing means (6.7)." 5.3
Result shapes gains the run-family rule. 6.5 gains "run record open state per
view kind".

**Artboards.** ExplorerExpert, ExplorerAfterCard, AnalyzeSweep, CompareSplit,
InspectorGenomics, MultiSelection, HistoryPopover, ExplorerLargeGraph,
CategoryTable, AiPanel. One card per canvas is drawn with Details expanded so
the full record is visible somewhere.

## IC-6 (screen) Settings > Performance moves its helper sentences behind circles

**Decision.** Each defaults-table row carries its explanation in an info circle
on the row label. What stays inline is what reports this graph: the readout at
the top, the list of rules in force, the Turn off anyway warning with its
memory and frame-rate estimate, and any clause naming the current dataset
("This graph: 1.1M", "Off for this graph"). Rows whose control spends more than
the ask limit keep their sentence inline under the three carve-outs. Two
sentences split rather than move. This lands after DEF-6 has removed the three
threshold rows and MIN-13 has hidden the config keys, so the column is already
shorter.

**Why.** The most text-heavy screen in the canvas, and every threshold row's
sentence describes what the setting does rather than what this graph is --
roughly 26 lines across three columns. Nobody in Settings > Performance is a
first-time user, and the row labels are self-describing for the person who is.

**Spec section.** 5.3 Settings > Performance.

**Artboards.** SettingsPerformance, Settings, SettingsShortcuts.

## IC-7 (rule) Import options gains circles rather than losing text

**Decision.** Each role, policy and load control in the Import options dialog
carries an info circle holding the sentence the spec already assigns to its
hover-only tooltip: Identifier system, Treat as, Repeated edges, Edges that
mention unknown nodes, Edges from a node to itself, Load, Parsing, the
bipartite checkbox. What stays inline is what reports this file: the detection
summary, the per-column type and completeness, the row count, the validation
issues, the memory estimate and every warning that gates the Import button.

**Why.** This is where a novice makes the decisions with the longest
consequences and the dialog explained almost none of them on screen; the
explanations lived in hover-only tooltips that nothing pointed at. Applying 6.7
here adds guidance rather than removing it, which is worth stating explicitly
so the pass is not read as pure subtraction.

**Spec section.** 5.3 Data, Import options steps 4 to 7.

**Artboards.** ImportOptions, ImportRecognised, ImportAddToGraph, TableJoin.
If a column of circles down the policy rows forms a distracting vertical line
in the render, drop the circle from the two policy rows whose select value
already states the policy in full.

## IC-8 (rule) Every hover-only explanatory tooltip gets a visible circle

**Decision.** Wherever the spec says "in the tooltip" for an explanation, it
means an info circle. Circles are added at: the modularity value, the Category
table title, the percentile row in Computed metrics, the Data table column
headers, the Treat as control, the search-syntax hint, and the presets caveat.
Tooltips without a circle are limited to reported text -- an unavailable
reason, a truncated value's full text, a control's binding, an exact count
behind a rounded one.

**Why.** A dozen explanations had no on-screen affordance, which means on iPad
they do not exist, by keyboard they do not exist, and for a novice who does not
think to hover they do not exist either. That is a reachability gap against
6.4's spirit. The fix costs nothing now that the circle is defined.

**Not included:** the cost-class circle the pass proposed for question-group
headers. DEF-2 deletes the words, so there is nothing left to explain.

**Spec text.** 6.3, replace the tooltip sentence: "Every explanatory tooltip in
this document is an info circle (6.7): one sentence, at most one docs link,
with a visible 12 px affordance, so it is reachable by pointer, keyboard and
touch alike. Tooltips without a circle are limited to reported text. 'Opens a
dialog' is rendered as an ellipsis on the row label."

**Artboards.** ExplorerExpert, ExplorerAfterCard, CategoryTable,
InspectorGenomics, DataTableDrawer, DataPanelLoaded, ImportOptions, Main,
ExplorePanel, StylePanel, StyleDiverging, FilterBuilderExpert, CommandPalette.

---

# 4. Icons

## IK-1 (rule) Section 6.8, the Icon rule: the label-first test

**Decision.** Write the label first, then apply this test.

- **Icon only**, when all four hold: the label is one verb from the icon
  register; the control repeats, on peer rows, peer sections or in a cluster of
  three or more peers *that exist now*; one undo, or doing it again, restores
  the prior state; and it acts on the object it sits inside, so the target is
  unambiguous from position.
- **Icon plus text**, when the label is one register verb but the control is
  the action the surface exists for: the destination action of a panel, card,
  dialog or drawer. Present's Export image, Export data and Copy to clipboard;
  the Import dialog's Import; Table join's Join; Data's Open file.
- **Text only, no icon**, otherwise: the label is more than one word; it
  carries a count, format or scope; the control carries a Coming tag; or the
  step is one undo cannot take back.

**Collapse clause.** Three or more siblings sharing one register verb and
differing only in the object collapse into one icon of that verb whose click
opens a menu carrying the full labels. The icon replaces the group, never a
member.

An icon-only control renders neither name, so 6.8 is a bounded exception to
principle 4, bounded by the tooltip: every icon-only control has a tooltip
carrying the plain name, the technical name where 6.3 requires it, and the key
chip where one is bound.

**Spec section.** 6.8 (new).

**Artboards.** All (rule only; the visible consequence is per IK-5 to IK-8).

## IK-2 (rule) One verb, one drawing: freeze the register before iconifying anything

**Decision.** VOCAB section 5 becomes the closed icon register: 30 glyphs
reused verbatim from the artboards, 8 consolidated, 6 newly drawn (edit/pencil,
paste, eye-off, lock, unlock, tag). A glyph in the register is copied
verbatim; a verb absent from it keeps its text label; the register grows by
editing VOCAB, never by drawing a glyph in one artboard. Consolidations: the
pushpin adopts the ExplorerAfterCard upright form (currently drawn ten ways
across eighteen instances), the gear adopts the rail form, the funnel one path,
the bookmark the ViewsMenu ribbon, and the zoom-to-selection target the
corner-bracket form with a centre dot (the concentric-circle variant reads as
the gear at 12 px).

**Deliberately not drawn:** save (there is no project save; saving is Export
and the download glyph carries it -- no floppy disk is ever drawn), duplicate
(nothing duplicates an object), sort (a column sorts by its existing chevrons),
group/ungroup, run (the play triangle belongs to the time slider transport),
expand all and collapse all.

**Why.** Today the drift is invisible because each glyph sits beside its own
text. The moment the text goes, the glyph is the only name the control has, and
ten pushpins become ten unrelated controls. Consolidation is a prerequisite,
not a tidy-up.

**Spec section.** VOCAB section 5.

**Artboards.** The eighteen artboards that draw a drifted glyph, replaced as a
whole-svg-body swap so a mismatch is visible rather than subtle.

## IK-3 (rule) Four things every icon-only control carries

**Decision.** (1) An aria-label equal to the tooltip text with the key chip
removed; the glyph is aria-hidden; a toggle keeps one name and expresses state
with aria-pressed. (2) A tooltip: verb, then the object when the icon does not
sit on its object, then the key chip; 150 ms delay; never suppressed in
Performance mode, which governs canvas elements only. (3) A 24 by 24 CSS px hit
area with 4 px clear space, growing to 32 by 32 with a 16 px glyph below 1280
px for any icon that is the sole path to a capability; a trash icon is always
last in its cluster with 8 px of separation. (4) A non-hover twin: every
hover-revealed icon repeats as a full-text item in that surface's overflow,
context or long-press menu. An icon-only control never carries a Coming tag; a
verb that has not shipped keeps its text and its tag.

**Spec section.** 6.8.

**Artboards.** All.

## IK-4 (rule) Five homes, and one takes no icons

**Decision.**

| Home | Visibility | Max | Order | Acts on |
|---|---|---|---|---|
| Panel header | always | 3 plus overflow | view toggles, pin, overflow, close | the panel |
| Section header | on section hover or focus | 2 plus overflow | verbs by frequency, then overflow | the section's content |
| Row | on row hover or focus | 3 | edit, visibility, delete | that row |
| Toolbar | always | none | as laid out | the surface |
| Footer or action bar | n/a | 0 | n/a | n/a |

The row order is fixed application-wide so position teaches the verb; a fourth
row verb goes in the row's context menu. The pinned inspector action block and
dialog button rows take no icon-only controls, because that is where the
destination and destructive actions live. Toolbar icons are always visible and
never hover-revealed.

Hover-revealed icons are permitted only for **second-visit verbs** (copy,
export, recompute, edit, visibility, delete). A control that a traced novice or
analyst path enters through keeps its text label -- see the Change-link ruling
in Conflicts.

**Spec section.** 6.8.

**Artboards.** All.

## IK-5 (rule) Collapse the Copy family: about 66 labels become about 22 icons with menus

**Decision.** On every result card the stacked copy links (Copy as JSON, Copy
as command, Copy methods text, Copy as TSV, and Copy member ids where the shape
has members) become one copy icon in the card header opening a menu of the full
labels. Where a single copy action stands alone -- Copy all on the Attributes
header, Copy list on TableJoin's unmatched rows, Copy steps on the path
section, Copy reading -- it becomes one copy icon with no menu. The icon
performs the last-used copy on click, with the menu on the caret, once the
last-used verb has been chosen once. The attribute cell's copy-plus-chain pair
collapses to one copy icon opening the two-item menu 6.6 already specifies,
which frees the chain glyph for CompareSplit's Link views toggle.

**Why.** The single largest text wall in the design: three blue links in a
stack before the reader reaches the result, and often a fourth below. The four
differ only in the object, which is exactly the collapse clause. This decision
merges with IC-5: the three record copies live inside the collapsed Details
block, and the card header's Copy menu carries the rest.

**Spec sections.** 5.3 Analyze Result shapes; 5.4; 6.6.

**Artboards.** ExplorerAfterCard, ExplorerExpert, CategoryTable, AnalyzeSweep,
CompareSplit, ExplorerLargeGraph, AiPanel, HistoryPopover, InspectorGenomics,
TableJoin, ExplorePanel, ContextMenu, DataTableDrawer, MultiSelection,
IpadInspector.

## IK-6 (screen) Section-header verbs: statistics copy, export and recompute

**Decision.** Copy, Export CSV and Recompute leave panel footers and result
bodies and become hover-revealed icons on the section header they act on. The
Analyze All statistics footer keeps only its timestamp line. The inspector's
Most connected header carries a download icon whose menu holds "Export top 20
(CSV)" and "Export ranked list (CSV)" -- both labels survive in the menu
because both carry counts. Style's Import... and Export JSON leave Preset
details for the panel header overflow, renamed Import style... and Export style
(JSON), joined by Expand all sections, Collapse all sections and Reset styles
to defaults. Export keeps its text wherever the label names a scope, a count or
a format, because the scope is what the user checks before clicking.

**Spec sections.** 5.3 Analyze (All statistics), 5.3 Style tier 2, 5.4.

**Artboards.** AnalyzePanel, FilterBuilderExpert, MultiSelection, StylePanel,
StyleDiverging, DataTableDrawer, TableJoin, HistoryPopover, and every artboard
that draws the inspector's Most connected or Schema headers -- applied to all
of them or to none, so the inspector does not read differently from artboard to
artboard.

## IK-7 (screen) Rebind becomes a row-hover pencil; row verbs become the fixed triple

**Decision.** SettingsShortcuts loses its 37 Rebind buttons: the key chip
becomes the click target, the row reveals a pencil on hover or focus, a
customised row also reveals a refresh icon, and the header gains "Click a key
to rebind it." Note rows join style layers, filter rules and selection sets in
carrying the row-hover triple (pencil, eye where applicable, trash). The trash
is icon-only only when the row names the object it deletes, the object is a
user-made view object, and one undo restores it; removing data, a result, a
stored key or a dataset keeps its text and its confirmation.

**Not included:** the same pencil for the "Change" links on Data and Import
mapping rows. See Conflicts.

**Spec sections.** 5.3 Settings (Keyboard shortcuts); 5.4; 6.8.

**Artboards.** SettingsShortcuts, ExplorerNotes, ExploreNotesList,
InspectorGenomics, ExplorerExpert, MultiSelection, StylePanel, StyleDiverging,
FilterBuilderExpert, IpadInspector, CompareSplit, DataTableDrawer.

## IK-8 (rule) The never list and the novice exemptions

**Decision.** These keep their text no matter how often they repeat: Run in
every form (Run all node rankings, Run as sweep, Run anyway, Re-run, Run again
with changes) -- a play triangle in a card holding Method, Scope and Advanced
reads as "preview", not "spend 40 seconds", and principle 6 requires a
deliberate ask; Cancel; every label ending in "anyway"; every destructive verb
(Close dataset, Remove key, Clear history..., Remove result, Reset to
defaults); every selection and filter verb (Encode as style, Select members,
Filter to type...); Try it; Open File, Open from URL, Paste data; Union,
Intersect, Subtract; Test connection.

6.8 does not apply at all to the Empty state (7.1), the Insights strip (7.3),
the Import options dialog or the command palette. A first-time user has not
learned the register yet; it is taught in the panels on the second visit, never
on the first screen. The inspector action block, Present's exports and the
context menu are exempt by construction: every one of their labels is a verb
plus the object the user is checking before the click, and the context menu is
the non-hover twin that makes row icons reachable on touch.

**Spec section.** 6.8.

**Artboards.** All (as a constraint).

---

# 5. Minimalization

Four passes returned 197 proposals across 39 artboards. They are ratified as
fifteen rules plus the per-screen lists in the source passes, which stay valid
wherever they do not contradict a rule here or a decision above. Every deletion
below is a duplicate of something else visible on the same screen, a zero-state
restatement, a default that is only interesting when it is not the default, or
a fact moved one click or one hover away and remembered under 6.5. No control,
shortcut, palette entry or workflow decision is removed.

## MIN-1 (rule) One fact, one region

**Decision.** A fact rendered in its owning region is not repeated in a second
region on the same screen. Owners:

| Fact | Owner | Dropped from |
|---|---|---|
| Node and edge counts | status bar | Loaded data header, Analyze panel header, inspector line above the reading |
| Shown of loaded of total | status bar | filter strip (which keeps the chips only) |
| Active filter chips | filter strip when Explore is closed; the Explore panel when it is open | the other one |
| Time window | the slider readout and the status bar Viewing slot | the filter strip's time chip, and the Explore chip's value while the slider is on |
| Selection size | status bar plus the inspector header | the canvas marquee caption, the reading's opening restatement |
| Cost estimate | the card's Run row | scope line, card title pill, warning line |
| Scope | the panel's sticky scope line | every card whose scope matches it |
| Run parameters | the run record (collapsed) | the caveats line, the card body |
| A group's member count | the group table or list | the legend, when the panel lists every group |
| Note count | the inspector (selection-scoped) and the status bar chip (dataset-scoped) | the legend, which keys the marker without a count |
| Validation issue counts | the status bar chip | the rail badge, which becomes an unnumbered warning dot |
| Palette name | Style's Palette select and the legend's overflow menu | the legend body |
| File name | the top bar | the Loaded data first row |
| Mapping | one Loaded data line with one Change | the second mapping line and its duplicate Change |

**Why.** The dominant waste across all four passes is not decoration; it is the
same number drawn three or four times at once. 37 appears six times on
ContextMenu, 40% six times on ExplorerLoading, 12,412 nine times on one 280 px
iPad overlay, the time window four times on TimeSlider, and 132 of 200 four
times on DataTableDrawer. Two of those copies disagreed with each other
(StylePanel's legend said 18 where the panel said 20; IpadInspector's chip said
8 notes where the status bar said 9), which is the strongest argument for a
single owner.

**Spec sections.** 5.1 (status bar, filter strip, legend, rail badge), 5.3
Analyze (panel scope line), 5.4 (Loaded data, Counts).

**Artboards.** All.

## MIN-2 (rule) Zero, null and default rows are not drawn

**Decision.** A row, chip, caption or clause whose content is "nothing here" or
"the default is in force" is not rendered. Specifically: legend blocks for
unencoded channels (and the whole legend when nothing is encoded); "Isolated
nodes 0" and "(largest holds 100%)" when there is one connected part; section
header counts of 0 or 1; "None active", "None yet", "Not computed" beside a
Coming tag; "100% filled" on a complete column; "Nothing was guessed" as a
standalone line; "Below the render ceiling"; the word "Skipped" beside a Skip
role chip; a default axis scale named in a caption ("Linear scale.", "linear x,
linear y", "linear scale" under a histogram) -- only a non-default scale prints
its name; "Yes" before a value that answers its own row ("Weighted | amount
(strength)"); zero halves of a selection count ("3 nodes", not "3 nodes, 0
edges").

**Why.** Absence is already legible and is more legible once the zeros stop
competing with the values. Rows that are still computing read "Computing..." so
an absent row unambiguously means zero.

**Spec sections.** 5.1 Legend, 5.4 (Counts, Multiple nodes), 6.2.

**Artboards.** All.

## MIN-3 (rule) A count on a header only when the section is collapsed or truncated

**Decision.** A group or section header shows a count only when the count says
something the reader cannot see: the section is collapsed, or it is expanded
but truncated. "Attributes 34" with "Show all" keeps its count; "Computed
metrics 2" above two visible rows does not. Catalogue counts go entirely: "4
cards", "5 actions", "18 engines, 5 families", "4 results", "2 views", "2
saved", "Actions 20". A header count never carries a unit word the section name
already supplies.

**Spec sections.** 5.3, 5.4, 6.2.

**Artboards.** All.

## MIN-4 (rule) Coming tags consolidate; the ? dialog lists shipped bindings only

**Decision.** A contiguous run of three or more unshipped rows in one list,
menu or section renders as dimmed, disabled rows under one muted group note --
"Coming soon" on a group header or divider, with the panel carrying one info
circle reading "Dimmed rows are not built yet." Isolated unshipped rows keep
the per-row tag. An unshipped row carries no key chip, because a binding that
does nothing is worse than no chip. The ? dialog renders only bindings whose
action has shipped; Settings > Keyboard shortcuts renders the full table with
its Coming tags and is the surface where the unshipped ones are learned.

**Why.** 66 Coming tags across nine navigation-and-expert artboards, seven in
one twelve-row context menu, eleven in one eight-line action block, twelve in
the read-only shortcuts dialog. At that density the tag stops reading as status
and starts reading as texture, and it out-weighs the labels it qualifies. A
menu that reads as mostly broken costs confidence, which is a W14 criterion.

**Spec text.** 5.8: "A control whose status is not shipped carries a muted
Coming tag; where three or more contiguous rows in one list share that status,
the tag is rendered once on the group header or divider and the rows are dimmed
and disabled instead of tagged individually." 5.6: "The ? dialog renders only
bindings whose action has shipped."

**Artboards.** ViewsMenu, ContextMenu, ShortcutsDialog, SettingsShortcuts,
ExplorePanel, ExplorerExpert, MultiSelection, DataTableDrawer, ImportOptions,
ImportLargeFile, DataPanelLoaded, HistoryPopover, FilterBuilderExpert,
AnalyzeSweep, CategoryTable, InspectorGenomics, StyleDiverging, CompareSplit,
Main, AiPanel, PresentPanel, TimeSlider, IpadPanel, IpadInspector.

**Also fixed here.** ViewsMenu's Top / Front / Side rows carry key chips beside
a Coming tag while ShortcutsDialog lists the same bindings as live. Resolve in
favour of the bindings being live: delete the Coming tags from those three rows
and keep the chips. Cancel on ExplorerLoading must never carry a Coming tag
either -- 5.1 and principle 6 both require a cancel; if the abort path has not
shipped, draw Cancel disabled with the spec's own reason tooltip.

## MIN-5 (rule) Scope and caveats: state it once, at the level that owns it

**Decision.** The caveats line drops its scope clause when the scope is the
whole graph, and keeps it verbatim whenever the run was sampled, restricted to
a component, filtered or windowed. The panel states the scope once, on a sticky
header ("Scope: all 20 visible nodes. Change"); a card states its own scope only
when it differs. Counts read "120,418" rather than "120,418 of 120,418" when
shown, loaded and total are equal; the N-of-N form returns the moment a filter,
window or subset makes them differ. A per-card partial-data caveat is not
repeated on every card while a load is in progress; the sticky panel scope line
carries it.

**Why.** Sixteen copies of "On 20 of 20 nodes" in one panel, three copies of
the sample size and seed on one card, six copies of "Partial data (40%
loaded)", and "40%" six times on one screen. A caveats line and a run record
line that overlap by design is a spec defect, not an authoring slip.

**Spec sections.** 5.3 Analyze (Result shapes, Running and scope), 5.4.

**Artboards.** AnalyzePanel, IpadPanel, ExplorerAfterCard, ExplorerLoading,
ExplorerLargeGraph, CompareSplit, AnalyzeSweep, CategoryTable, HistoryPopover.

## MIN-6 (rule) One result body on screen at a time

**Decision.** A result open in the inspector renders its Results-list card
collapsed to title, state and headline plus the primary action; expanding the
card restores the full body, and the card returns to full when the inspector
shows something else. Reading, caveats line, run record and shape body render
exactly once on screen. A sweep's run table, sparkline and pairwise-agreement
block live in the inspector; the panel's Sweep summary card carries a headline
plus Keep, Compare and Export CSV. A Done state chip is not drawn -- state
chips are for Running, Queued, Failed and Stale.

**Why.** CategoryTable renders one enrichment result twice in full at the same
moment, about twenty duplicated items; AnalyzeSweep renders sixteen table cells
plus the NMI trio twice, and the two copies behave differently (Keep links in
one, click-to-colour in the other), so the reader cannot tell which is
authoritative.

**Spec sections.** 5.3 Analyze (Result shapes, Run as sweep).

**Artboards.** CategoryTable, AnalyzeSweep, CompareSplit, ExplorerAfterCard,
HistoryPopover.

## MIN-7 (rule) Legend hygiene

**Decision.** The legend drops: its "Legend" caption and the "Minimap" caption
beside it (a swatch list with channel names and a thumbnail with a viewport
rectangle name themselves; the heatmap form of the minimap above 10,000 nodes
keeps its caption, because that picture is not self-describing); blocks for
unencoded channels; the palette-and-coverage footer unless categories were
dropped, when it reads "Top 9 of 3,412 colored"; the palette name, which moves
to the legend's overflow menu and stays on Style's Palette select; the range
caption when tick values are drawn (the caption keeps only the scale word);
counts on state rows (Selected, Matches filter, Filtered out, Outside window);
group counts when the panel lists every group; the note count; layer counts.
Channel headers render their canonical pair on one line.

**Exception, recorded so nobody "fixes" it:** on CompareSplit the legend counts
are the only place the eleven B-side group sizes appear, so legend group counts
stay there. The B legend drops the Size block, which is identical to A's,
and its header reads "Legend, view B (size as A)".

**Spec section.** 5.1 Legend.

**Artboards.** All that draw a legend.

## MIN-8 (rule) Status bar hygiene

**Decision.** Drop the 3D chip -- the canvas 2D/3D control is always visible
and the mode chip slot is kept for VR and AR with their Exit button. Merge the
layout name and running state into one chip ("Force directed - settled",
"Force directed - step 120 of 1,000, Stop", "Positions from file", "Quick grid
(Performance mode)") and drop the "Layout:" label; the chip gains a caret
(NAV-12). Render the AI slot only when a provider is configured or a call is in
flight. While the Analyze panel is open with the running card in view, the
status bar shows a spinner and the percentage only -- one Cancel on screen per
run, on the visible card; the full slot returns when the card scrolls away. The
rail Data icon carries an unnumbered warning dot and the status bar chip reads
"4 data issues" with "4 issue types, 27 issues" in its tooltip. The notes chip
is hidden while Explore is open with the Notes section expanded. The
Performance mode chip names the label cap only, with the full rule list in its
tooltip and in Settings.

**Spec section.** 5.1 (status bar, activity rail).

**Artboards.** All desktop artboards; IpadPanel and IpadInspector for the chips
they draw.

## MIN-9 (rule) The inspector graph summary sheds what the reading already says

**Decision.** Counts becomes a tier 2 section, collapsed by default, remembered
per 6.5, sitting under the reading. Direction, Weighted and Timed merge into one
Type row ("Directed (from file), weighted (amount), timed (opened)"). Density
renders in its plain form with the scientific notation on hover. Node
attributes and Edge attributes merge into one collapsed Attributes section with
Nodes and Edges tabs, and a sampling caveat is stated once inside it rather
than on both headers. The Most connected list moves its repeated unit word onto
the column header. The largest-part share stays in the reading and leaves the
Counts row. Case notes render as one affordance: "Add a case note" at zero,
"N case notes" above it. The Analyze pointer becomes one link, "More in
Analyze".

**Why.** Eight to twelve stat rows sat open by default, directly under a
reading that states composition and edge count, with node and edge totals in
the status bar a third time. Nothing in the block is a control and none of it is
read more than once a session; W14 comprehension is carried by the reading, not
the table, and 6.5 removes the cost for the analyst who wants it open.

**Spec section.** 5.4 (Nothing selected).

**Artboards.** All that draw the inspector.

## MIN-10 (rule) The node inspector states each fact once

**Decision.** Drop the type row from Key attributes when the header badge shows
it; drop the id row when the displayed label equals the id (the id-type
annotation moves to the copy-id tooltip); drop the rank sub-row that the
reading states; fold the directional degree breakdown onto the In / Out / All
tabs, which carry their own counts; drop the neighbour-type prose line where
type filter chips already carry the same numbers; drop the "Both N" line when
it equals the section header count; render a long text value as its shape
("sequence  393 aa, MEEPQSDPSV...") with a copy icon rather than 390 inline
characters; move the count out of the header when the link beside it carries it
("Attributes" plus "Show all 12"); merge Neighbors-in-group and Share-of-
neighbors into one row; delete the "Key attributes" sub-header inside a section
already titled Attributes, replacing it with a hairline rule; drop the
"Annotations" technical name from the Notes header and the "(annotations)"
suffix from the legend row, which 6.3 already exempts.

**Spec section.** 5.4 (One node, Multiple nodes).

**Artboards.** ContextMenu, ExplorerNotes, ExplorerExpert, InspectorGenomics,
IpadInspector, CompareSplit, MultiSelection, ExploreNotesList, Main,
ExplorePanel, TimeSlider.

## MIN-11 (rule) Helper text is deleted only when it restates something visible

**Decision.** A helper sentence is deleted when it restates a control, a value
or a list on the same screen; otherwise it moves behind its info circle (6.7)
and is never both deleted and re-homed. Deleted as restatement: the Rules in
force sentence above the checkbox list that renders the same seven rules; "Also
JPEG and WebP" beside a Format select that lists them; the Select menu's
contents printed under the Select button; the dialog's field list printed under
"Generate report..."; the sweep table's two-sentence caption; "Legend updates
automatically"; "Presets never change which labels show" (to a circle);
"Applies on next load" repeated on five rows in one column (to the column
header); the reserved-key dump in Settings (to a circle, plus a precise
in-capture message); the two-sentence arrow key under a statistics table (to
the column header's circle, with the column renamed "A: acct-4471"); the
promise sentence naming four other screens under the join grid; the format word
on a recent row whose filename carries the extension.

**Spec sections.** 5.3 throughout, 6.3, 6.7.

**Artboards.** All.

## MIN-12 (rule) Analyze states panel-level facts at the panel

**Decision.** On desktop the Analyze panel header carries the scope line and
the Weight and Treat as controls only; the graph statistics block is deleted,
because it is a character-for-character copy of the inspector Counts section
rendered at the same moment 900 px to the right. On iPad the block stays, since
5.2 allows one overlay at a time. Per-card scope goes (MIN-5). "Not computed"
beside a Coming tag goes (MIN-2). The three "Pick a node first" lines go: the
disabled Run button and the empty From/To fields carry it, and the button's
tooltip names the precondition; "Leave both empty for the global cut" moves to
an info circle on the From/To pair, being the one such line that adds a fact.

**Direction guard.** DEF-2, MIN-3, MIN-5, MIN-12 and the info-circle pass all
land on this one panel. See the Direction guard section: the card description
stays inline in Cards view.

**Spec section.** 5.3 Analyze.

**Artboards.** AnalyzePanel, ExplorerAfterCard, IpadPanel.

## MIN-13 (rule) Config keys are not vocabulary pairs

**Decision.** Settings > Performance's 28 monospace storage keys
(`largeThreshold`, `ceiling.desktop`, `exactCap`, `labelCap`, `preSteps` and
the rest) are hidden behind one header switch, "Show config keys", off by
default and remembered under 6.5; on, every key returns in place. The exported
configuration file always carries them. The eight layout engine names are
exempt and stay visible: they are genuine 6.3 pairs.

**Why.** 6.3's vocabulary rule covers concepts a user meets in analysis. A JSON
key is not a synonym for a plain label; it is an implementation address, useful
to the small audience hand-editing a config or writing a script. Reading it as
a canonical pair put 28 technical names on one screen and squeezed the labels
into truncation.

**Spec text.** 6.3, after the canonical pairs table: "The vocabulary rule
covers user-facing concepts -- algorithms, metrics, layouts, attributes, panel
and section labels. Settings storage keys are not vocabulary pairs;
configuration pages render them only when 'Show config keys' is on (remembered
per 6.5), and the exported configuration file always carries them."

**Artboards.** SettingsPerformance.

## MIN-14 (rule) The canonical pair renders on one line

**Decision.** A plain and technical pair never occupies two stacked lines. On
cards, collapsed section headers, legend channel headers, segmented controls
and inspector titles it renders as "Plain name (technical name)" with the
technical half muted, truncating the technical half with a tooltip at narrow
widths and never the plain half. Both names are still rendered, so principle 4
holds; only the layout changes. Mode or invocation detail is not part of the
pair ("Node merging", not "Node merging, batch mode").

**Spec text.** 6.3, after "in muted text or parentheses": "The pair is rendered
on one line; the technical name never occupies a line of its own, and mode or
invocation detail is not part of the pair. At narrow widths the technical half
truncates with a tooltip; the plain half never does."

**Artboards.** StylePanel, StyleDiverging, CategoryTable, CompareSplit,
AnalyzeSweep, ExploreNotesList, ExplorerLoading, ExplorerLargeGraph,
DataPanelLoaded, InspectorGenomics.

## MIN-15 (rule) The time slider has one home for its settings

**Decision.** The slider bar carries the transport (play, pause, step, scrub),
the Viewing readout and a gear that opens the Explore section; the duplicated
Window / Step / Cumulative / Sliding / Speed row leaves the bar. "Step through
time" and "Time slider settings" merge into one tier 2 section with the On
switch on its header. The window is printed twice, not four times: on the
slider bar and in the status bar Viewing slot; the canvas filter strip drops its
time chip while the slider is docked, and the Explore chip names the filter
rather than repeating its value. The step button reads "Step forward" with the
size in its tooltip (unit-aware per DEF-4).

**Spec sections.** 5.3 Explore (temporal navigation), 5.1 (filter strip).

**Artboards.** TimeSlider, ExplorePanel, DataTableDrawer.

## Per-screen lists

The four passes' per-artboard change lists are the working reference for the
edits above and stay valid except where a rule here or a decision above
supersedes them. Estimated effect after these rules: roughly 2,205 to 1,692
items on the core screens, 1,275 to 1,005 on the data screens, 1,360 to 1,073
on the expert screens, 1,575 to 1,230 on the navigation screens -- about 21 per
cent across the set, concentrated in the panels rather than in the guidance.

---

# 6. Navigation paths

Three passes traced twenty use cases end to end. Five paths were already
minimal and are left alone, and that is recorded here so a later pass does not
"improve" them: describing what you are looking at (zero interactions -- the
reading and the legend are on screen at load), finding an entity by name
(three), filter-check-undo (three plus one), finding a path between two named
nodes (six, fully keyboard, via the palette's @ prefix and Cmd+Enter), and
fixing a flagged data problem (two).

## NAV-1 (screen) The sample blurb's closing hint loads and runs

**Decision.** 7.1's sample manifest already defines a "suggested first card"
field that nothing consumes, and every blurb already ends in an imperative the
design cannot honour ("Try finding the groups."). That sentence becomes a link:
clicking the row loads the sample and stops; clicking the hint loads it and
then runs the manifest's suggested first card exactly as an Insights card click
would -- size-aware defaults, home panel opened with the control highlighted for
two seconds, primary encoding applied, reading written into the inspector, one
undoable history entry, that card retired. A sample with no suggested card
renders its blurb as plain text. Above the large-graph threshold the suggested
card must respect the 7.3 above-threshold set (Connected parts, not Groups).

**Why.** Cold start to a coloured graph goes from two interactions to one, and
it hits three of W14's four criteria at once without a wizard, which principle
1 forbids.

**Spec section.** 7.1 item 2.

**Artboards.** Welcome, ImportOptions, ImportRecognised (the condensed sample
list).

## NAV-2 (rule) A result applies its own primary encoding, from every route

**Decision.** On its first completion a result applies the primary action of
its shape as a style layer automatically, identically from an Insights card,
the panel's Run, the palette's Enter or Cmd+Enter, the console, an AI tool call
and the attribute-list route of DEF-7. It applies only when no user-authored
style layer already drives that channel; when one does, the card shows the
un-applied primary action and the reading omits its closing clause. The applied
form reads "Encoded as node color" with "Change encoding" beside it, the legend
updates, the reading's last clause names the change, and the application is one
undoable step separate from the result.

**Why.** 7.3 makes an Insights card click colour the graph and nothing said the
same capability does so from its panel, the palette or the assistant, so one
capability produced two pictures depending on which of principle 3's three
routes the user took -- and the palette route cost an extra click plus a panel
visit to find the button. The artboards already contradicted each other on this
(AiPanel draws the applied form; ExplorerAfterCard draws an unpressed "Encode
as style" above a legend that already shows the encoding).

**Spec sections.** 5.3 Analyze (Result shapes), 6.1 (Result row), 7.3.

**Artboards.** ExplorerAfterCard (card becomes the applied form), AiPanel,
ExplorerExpert, InsightsWide.

## NAV-3 (screen) The Role chip is the control, and the dialog says how many columns were guessed

**Decision.** The Role chip in a column header is itself the control: clicking
it opens the role menu and choosing a role applies it and closes the menu; the
Type chip behaves the same way; Rename and Skip move to the header overflow.
Tab and Shift+Tab move between column headers, Enter opens the focused chip's
menu, arrows move within it, and Escape closes the menu without closing the
dialog. When any role or type was guessed the summary carries a third line,
"1 column was guessed.  Review", where Review scrolls the first guessed column
into view, focuses its Role chip, and steps to the next.

**Why.** Correcting one wrong column cost four interactions (header, select,
choice, dismiss) and the dialog had no keyboard route at all, which breaks 6.4
for the one capability every novice passes through. No artboard drew the
popover, so the surface the whole path turns on was unvalidated.

**Spec section.** 5.3 Data, Import flow, dialog items 1 and 4.

**Artboards.** ImportOptions (draw the role menu open on the guessed column and
the guessed-count line), ImportLargeFile, ImportAddToGraph, TableJoin.

## NAV-4 (screen) The load toast names the mapping and opens Loaded data

**Decision.** When the import assigned any role that was guessed or changed in
the dialog, the completion toast adds a clause naming them -- "Loaded 200 nodes
and 612 edges in 1 s. Mapped amount to weight, ts to time.  Details" -- and
Details opens Data with Loaded data expanded and its mapping line highlighted
for two seconds. The highlight reveals that row's hover affordances for its
duration. On the session's first load the panel switches to Explore so the
search field faces a user who has just seen their graph, and the toast is the
route back to Data; this is stated as the one exception to 6.5's last-active-
activity memory.

**Spec sections.** 5.1 (loading phases), 6.1 (Loaded row).

**Artboards.** DataPanelLoaded, ImportOptions.

## NAV-5 (rule) Copy reading is drawn on every reading

**Decision.** 7.5 already says readings offer Copy reading and the artboards
honour it in exactly one file. Every reading renders the affordance in its
header row, including the graph summary; on the graph summary it copies the
reading plus the caveats line plus the Counts rows and the legend's channel
lines, so one click produces a paragraph a user can paste to a colleague.

**Spec section.** 7.5.

**Artboards.** Main, CommandPalette, ExplorerAfterCard, ExplorerLargeGraph,
InsightsWide, IpadInspector.

## NAV-6 (rule) Close the palette's index holes and define Enter for non-capability rows

**Decision.** 5.5's index gains: Open file, Import options, Change the column
mapping, Ask the assistant..., Console, Show suggestions, More suggestions (N),
Copy the graph summary, the Help menu's documentation and feedback items, every
question-group batch action ("Run all node rankings" / "All centralities" and
each group's "Run all (N)"), the Data table drawer's cross-metric agreement
control ("Compare measures" / "Top N by each metric", disabled with its reason
until two ranking results exist), Export selection, History entries, and an
**Attributes group**: every node and edge attribute, computed attribute and
result metric by both names, with its type and range and four actions -- Color
by, Size by, Filter by, Show in table -- chosen with Left and Right and run
with Enter. Commands always rank above Attributes, the Attributes group caps at
five rows with "and N more", and it appears only after three typed characters.
The Enter and Cmd+Enter split applies to capability rows only; on every other
row Enter performs the row's action directly. Rows sort with an exact id or
label match first, matching the Explore search rule. The palette also accepts
"@a > @b" and offers one Find a path row whose Enter runs it under the 2 s gate.

**Why.** 6.4 requires a palette route for every capability, and the holes fell
exactly on the longest paths: import had none, the AI panel had none (so
principle 3's own third route was unindexed), the suggestions had none, and
"color by an attribute" had no keyboard route at all because the palette
indexed capabilities but not the objects they act on. 5.5 also defined Enter
only for capability rows, leaving undefined what Enter does on the sample
dataset row a keyboard novice needs first.

**Guard.** Making Enter run a sample dataset row means a stray Enter can
replace the loaded graph. The Import options dialog's "What to do with this
file" step already guards a second file in the Loaded state, and that guard
applies to palette loads too.

**Spec section.** 5.5.

**Artboards.** CommandPalette (draw the Attributes group, one Actions row, and
the "@a > @b" hint row).

## NAV-7 (rule) Step rows are links, and History has a visible front door

**Decision.** Every AI step row and every History row title is a link that does
what an Insights card click does in 7.3 item 2 -- opens the step's home panel,
scrolls to the control or result it produced, and highlights it for two seconds
-- and never re-runs anything. On History rows the new behaviour is confined to
the row title, because the row body already carries click-to-preview and
double-click-to-restore; the title must be visually distinct. Undo becomes a
split button: the main half undoes, a caret opens the History popover, and
right-click and long-press keep working. The caret's tooltip reads "History"
and carries no binding.

**Why.** 7.4 already prints the owning panel name on each step and it was not a
link, so after an answer arrived the user clicked a rail icon and hunted the
Results tab. History was reachable only by a gesture the interface never showed
-- the HistoryPopover artboard's own caption says the button "was right-clicked".

**Spec sections.** 7.4, 5.3 Analyze (History), 5.1 (Undo scope).

**Artboards.** AiPanel, HistoryPopover, ExplorerExpert, Main, ExplorerAfterCard,
DataPanelLoaded.

## NAV-8 (rule) The Insights strip is recoverable and keyboard-reachable

**Decision.** The strip's X raises a toast, "Suggestions hidden on every
dataset.  Undo", for eight seconds, and is reversible at any later time from
Help > Show suggestions and from the palette. The strip's trailing line, "N more
in Help", becomes a link that opens the Help menu with More suggestions
expanded. Help's menu is: Keyboard shortcuts (?), Show suggestions, More
suggestions (N), Already run (N) -- a flat list of retired card names, each
re-runnable, with no estimates and no return to the strip -- Documentation,
Send feedback. F6's region ring gains the Insights strip when it is shown, with
Left and Right between cards, Enter to activate and Delete to dismiss.

**Why.** This was the only true dead end in the traced set: one small X, global
across every dataset, silently removed the entire novice guidance layer;
undo does not catch it because panel state is not undoable; the stated recovery
lived in a Help menu no artboard draws; and the strip -- the most important
affordance on the novice path -- was not in the F6 ring at all, which is a flat
6.4 violation, since a card's run-plus-open-plus-read behaviour is not
equivalent to running the same capability from the palette.

**Spec sections.** 7.3, 5.3 Help, 5.6 (keyboard table).

**Artboards.** Main (toast, focus ring on the first card, and the Help menu
drawn open), DataPanelLoaded ("2 more in Help" becomes a link), InsightsWide,
CommandPalette, ShortcutsDialog, SettingsShortcuts.

## NAV-9 (rule) The assistant has a keyboard route and a return path

**Decision.** Backtick focuses the assistant input when a provider is
configured and the console otherwise; Shift+backtick always focuses the
console, so an expert who learned backtick as the console keeps it. The AI
panel's setup link opens Settings > AI providers with a "Save and return"
button; saving a key closes Settings, reopens the AI panel and focuses its
input.

**Spec sections.** 5.6 (keyboard table), 5.3 AI.

**Artboards.** AiPanel, Settings, ShortcutsDialog, SettingsShortcuts,
CommandPalette.

## NAV-10 (rule) Selection says something on the canvas, and narrow screens hand off

**Decision.** A single-node selection draws its incident edges in the selection
colour at full opacity and outlines its immediate neighbours; nothing is dimmed.
Below the large-graph threshold every incident edge is drawn and the top ten
neighbours by weight are labelled regardless of the label cap, capped further
where one node's degree alone would exceed the hover-highlight cap of 500;
above the threshold the rule matches hover-highlight exactly. A multi-node
selection highlights edges between selected nodes only. Below 1280 px,
activating a row whose defined behaviour is "selects and centers the target and
shows it in the inspector" -- a search result, a result-table row, a path step,
a note row, a Matches row -- closes the panel overlay and opens the inspector
overlay on that target, with a back affordance returning to the panel with its
list state and scroll position intact.

**Why.** The goal of "find an entity and see who it connects to" was answered
only in the inspector, because the spec never said what selection does to the
canvas. On iPad the same path cost an extra interaction because the inspector
the search was for is not on screen.

**Spec sections.** 6.1 (Selected row), 5.3 Cross-cutting, 5.2.

**Artboards.** ExplorerExpert, IpadInspector, MultiSelection, IpadPanel.

## NAV-11 (rule) The analyst's four missing moves

**Decision.**

1. **A Consensus result shape.** "Run all node rankings" and any batch of two
   or more node-metric results emit one Rankings summary card: the union of the
   top N across methods, one rank column per method, an agreement column
   ("top 10 in 5 of 6"), the pairwise Spearman rank correlation of the top 20,
   the agreement sentence, and Select agreement set, Combine into a score,
   Encode as style, Export CSV, See all in data table. The Data table drawer
   keeps "Top N by each metric" and reads the same N and k. A node-metric
   reading gains the follow-up "Check this against other measures", gated by
   the summed estimate and the ask limit. Emitted only from a batch of two or
   more, never from a single run, so the novice single-card path is untouched.
2. **Save as recipe.** History's actions row and Present gain "Save as
   recipe...", which names the ordered history and stores it under Saved items
   -- the same artifact Present exports as JSON. "Run a recipe..." moves from
   Data tier 2 into the tier 1 secondary row beside Open from URL and Paste
   data, and Welcome gains a fourth block, "Saved recipes", shown only when one
   exists, so a month-old analysis reruns on a new file from a cold start.
3. **Replace on a saved set.** Set rows read Replace / Union / Intersect /
   Subtract with Filter to set at the right, and clicking the set name replaces
   the selection. Union onto an emptied selection is never the documented way
   to load a set. Because selection is not undoable, a set replacement writes a
   status-bar note naming the previous selection size.
4. **Report defaults and a report badge.** Report sections default to checked
   whenever their content is non-empty -- Notes, Pinned items, Validation
   report, Data changes, but never Data tables -- each showing its item count;
   the Present rail icon carries a badge with pinned items plus unresolved
   notes; and "Pin to report" joins a note row's hover actions.

Also: "Run again with changes" becomes a split action whose secondary item
"Run and compare" enters Compare with A set to this card and B to the new run,
skipping the source picker; and the filter chip's X and a "Clear all" (from two
chips) are written into 5.3, which currently grants no way to remove a chip --
Cmd+Z is not the substitute, because checking a filter puts entries on top of
it in the one shared history store.

**Spec sections.** 5.3 Analyze (Result shapes, tier 2 group actions, Running
and scope, History), 5.3 Explore (filter chips, Selection sets), 5.3 Present,
5.3 Data tier 1, 5.1 (rail, Undo scope), 7.1, 7.3, 7.5.

**Artboards.** AnalyzePanel, DataTableDrawer, AnalyzeSweep, HistoryPopover,
PresentPanel, DataPanelLoaded, Welcome, MultiSelection, ExplorePanel,
FilterBuilderExpert, CompareSplit, ExplorerAfterCard, InsightsWide.

## NAV-12 (rule) The data worker's five missing moves, and one new artboard

**Decision.**

1. **The status bar layout slot becomes a menu.** Its caret opens the four
   quick picks of 5.3 Style with their size estimates and disabled reasons, the
   active engine checked, then Re-run, Stop and Layout settings... It is a
   mirror of the Style quick picks -- no parameters, no All layouts list, the
   same ask-once confirmation above the threshold -- so Style remains the home
   and four traced paths lose a panel switch.
2. **Table join auto-picks Match on.** The field defaults to the candidate with
   the highest match rate against the key column, computed on the first 1,000
   rows, with each candidate's rate in the select and the winner named in a
   helper line ("Best match: preferredName, 92%"). Below 5% it opens empty with
   "No column in the graph matches these values. Try Map identifiers." and Join
   disabled. This was a silent dead end: a gene-symbol table against a STRING
   network read "Matched 0 of 340 rows" with no hint where the symbols live.
3. **Encode from the attribute row.** Every attribute row menu -- Data >
   Columns, the Data table column header, the inspector attribute rows -- opens
   with Color by this, Size by this (numeric only) and Filter by this above the
   column operations. All three write into the selected style layer (or the
   base layer) and then open Style with that layer selected and the changed row
   highlighted, so the encoding's home is still where the user is taken. The
   join dialog carries a "Color nodes by <column> after joining" checkbox.
4. **A drawable default threshold.** "Filter above threshold" opens at the
   lowest threshold whose match count falls under the render ceiling, stated as
   a drawability sentence and never as an analytical recommendation, with a
   live count and a warning-coloured "still above the render ceiling". Community
   results carry the same rule as "Filter to the top N groups". The "Narrow the
   view" insight card's description becomes "Filter by type, attribute, or a
   result you have already run." and its Try it preselects the most recent
   completed result from the current data version.
5. **Auto-fix applies at once; the drawer says how to fix a row.** Auto-fix is
   one Cleaning step with a toast and no confirmation, per 5.1's own rule, with
   a separate Preview link beside it. A drawer opened from an issue's Show rows
   carries a one-line hint bar naming the issue, the column and the two fixes,
   dismissed on the first successful cell edit and never shown alongside the
   performance hint.

Also: with two to five nodes selected the inspector shows "Merge N nodes"
naming the survivor, which merges immediately with the default conflict rules,
writes one Cleaning step, and raises "Merged 2 nodes into acct-4471. Undo |
Review conflicts"; the merging dialog stays the home for batch matching and for
more than five nodes. "Export selection..." joins the multi-selection context
menu, the inspector More list and the palette, all landing in Present with
Scope preset -- export stays in Present per section 3.

**New artboard: `ExplorerSubset.dc.html`** (1440x900). 6.1 defines a
Loaded-subset state that no artboard draws, and it is where the large-file path
ends -- the most intimidating arrival in the product. It continues
ImportLargeFile: 50,000 of 1,000,000 nodes and 410,000 of 10,000,000 edges on
the quick grid in Performance mode; the filter strip's two sample lines; the
compact status bar counts and the Performance mode chip; the Insights strip
carrying "Load the full graph" and "Narrow the view"; and the graph summary
opening "Showing a sample." with every count reading shown of loaded of total.
Section 9's mockup table gains the row. The grid is drawn honestly as a bounded
field of small uniform dots with the 20-label cap.

**Spec sections.** 5.1, 5.3 Data (Attach mode, Columns, Validation, Node
merging, Data table drawer), 5.3 Style (Layouts), 5.4, 5.5, 5.6, 7.3, 9.

**Artboards.** All (status bar caret); TableJoin, DataPanelLoaded,
DataTableDrawer, InspectorGenomics, ExplorerLargeGraph, MultiSelection,
ImportLargeFile, PresentPanel, ContextMenu, and the new ExplorerSubset.

---

# 7. Direction guard

The goal is a less intimidating, more minimal interface. Two decisions that
each remove a little can together strip a screen of meaning. Where that
happens, the more valuable one is kept and the other is bounded.

**G1. The Analyze panel keeps its card descriptions in Cards view.** DEF-2
deletes the cost word and the count from seven group headers, MIN-5 moves the
per-card scope line to the panel, MIN-12 deletes the panel's statistics block
and the three "Pick a node first" lines, MIN-2 deletes "Not computed", and the
info-circle pass proposed moving all fifteen one-line card descriptions behind
circles. Applied together the panel becomes a list of bare names with a Run
button, which is *more* intimidating for a novice, not less -- "what is
Bridges?" is the question the description answers. The description is the most
valuable text on an Analyze card and it stays inline in Cards view, which is the
default. The circle takes over only in List view, where the spec already hid
the description in a hover-only tooltip; there the circle is a strict
improvement, because it gives that tooltip a visible affordance. The panel
still loses roughly twenty lines from the other five decisions.

**G2. Import options loses chrome and gains explanation.** DEF-3 and DEF-5
shorten the dialog while IC-7 adds ten info circles to controls that explained
nothing. The net is fewer lines and more available guidance, and that pairing
is deliberate: the density pass pays for the disclosure pass on the one screen
where a novice makes the decisions with the longest consequences.

**G3. Welcome and the Insights strip are untouched by every density rule.**
They are the arrival path, they are text-heavy on purpose, and W14's
under-two-minutes criterion runs through them. The only edits allowed there are
de-duplication against a second region on the same screen (the Data panel's
copy of the sample list, the drop-zone copy and the format list) and the
removal of a technical name that is not a canonical pair ("Search").

**G4. Hover-revealed icons never take a first-visit label.** IK-4 confines
hover-revealed icons to second-visit verbs. Where a traced path enters through
a labelled control, the label stays even if the icon rule would allow a glyph.

**G5. The reading always survives.** Four readings are shortened by the
minimalization passes and none is deleted. Each keeps a count, a named subject
and a comparison, so a novice can still repeat it back:

- MultiSelection: "5 accounts, 1 device and 1 phone number selected, with 4
  edges between them. They average 9.4 links against 6.1 for the graph."
- FilterBuilderExpert: "22 proteins match; 16 more are their neighbors. They
  average 12.3 links against 6.9 for the graph."
- CategoryTable: "3 categories stand out for group 3, led by DNA damage
  response. 21 of its 52 members share it."
- ExplorerLoading: "Loading 48,000 of 120,000 nodes. Rankings and statistics
  fill in when loading finishes."

ExplorerLargeGraph's caveats line merges its two overlapping warnings into the
stronger one: "Approximate (100 samples, seed 4171). 81% of nodes score zero or
near zero, so only the top ranks are meaningful."

---

# 8. Conflicts resolved

**C1. Minimalization deleting text the info circles want to move.** The 6.7
test decides, and rule 5 of the precedence list forbids doing both. Teaching
text moves; reported text stays; a duplicate of something visible on the same
screen is deleted and is not re-homed. Concretely: the search-syntax hint
("Prefix with id:, type:, exact: or regex:, or start with = for an
expression.") is taught, so it moves behind a circle on the Search label and
also shows on field focus -- it is not deleted, and it is not retired by usage.
The "Import a category table (Data > Add attributes from a table, Apply to:
Groups) or enable a provider in Settings > Extensions" paragraph is an
unavailable reason, so it reports: the paragraph is deleted from the result
body and the sentence becomes the disabled control's own tooltip (IC-4), which
opens on hover, focus and tap. Settings > Performance's helper sentences teach,
so they move (IC-6) -- except the "for this graph" clauses and the three
carve-outs, which stay inline.

**C2. Icons removing a label that navigation needs as an entry point.**
Split by surface. SettingsShortcuts' 37 Rebind buttons become a row-hover
pencil plus a clickable key chip: one expert surface, pure repetition, nothing
enters through it. The 18 "Change" links on Data and Import mapping rows keep
their text: DEF-5 names "any Change link on a Loaded data line" as one of seven
documented reopen paths for the Import options dialog, NAV-4 sends the load
toast's Details straight to that line, and a novice reads it within seconds of a
load. A hover-only pencil would turn a documented route into discovery-only on
desktop and menu-only on touch. Where the highlight flash lands on such a row it
also reveals that row's hover affordances for its duration.

**C3. The info circle and the Settings help-text switch doing the same job.**
One owner. The switch is rewritten as the master control for info circles
("Show help text in place", default off) and density stops governing which
explanations are visible, keeping only row scale. The glyph changes from "?" to
the circled "i"; the "?" is reserved for the shortcuts dialog binding.

**C4. Several passes on the Analyze question-group header.** Four proposals
landed on one row: delete the cost class, delete the card count, add an info
circle explaining the cost class, and drop the [N] key chip. Resolution: DEF-2
governs. The class word is deleted everywhere, so the circle that would have
explained it has nothing to explain and is dropped; the count survives only on a
collapsed header, with a tooltip reading "4 questions in this group"; no
section header carries a key chip (DEF-1).

**C5. Several passes on the run record.** Five proposals: collapse to one line
with Details; collapse to method, parameters and duration; share the record
across a run family; hide it behind a Run details disclosure; and collapse the
three copy links. All are one decision, IC-5 plus IK-5: one line carrying
method, non-default parameters and scope, a Details chevron for the rest, the
family's shared fields rendered once on the family summary, one Copy control,
and the state remembered per view kind. 7.5's sentence keeping the record
visible in both reading states is amended; the caveats line still is.

**C6. Several passes on the status bar layout slot.** Three proposals: merge
name and state into one chip; make the slot a menu; drop the engine name.
Resolution: one chip carrying name and state, no "Layout:" label, with a caret
opening the quick picks (MIN-8 plus NAV-12). The engine name stays rendered
inline -- see C7.

**C7. 6.3 pressure from four directions.** Four proposals wanted a technical
name moved into a tooltip (Insights strip cards, dense statistics tables,
segmented layout controls, the status bar). All four are refused, and one
amendment is accepted instead: the pair renders on **one line**, never stacked
(MIN-14). That recovers the space every one of those proposals was chasing
without dropping a name from render. Two further 6.3 changes are accepted
because they are not about canonical pairs at all: storage keys are not
vocabulary (MIN-13), and "Notes Annotations" on a section header was always a
conformance error, since 6.3 already says section labels use Notes.

**C8. Coming tags: three competing consolidations.** VOCAB group label, muted
rows plus a panel info circle, and outright deletion from the ? dialog. Merged
into MIN-4: dimmed disabled rows plus one group note per contiguous run, one
info circle per panel that has any, no key chips on unshipped rows, and the ?
dialog listing shipped bindings only while Settings keeps the full table.

**C9. Two passes used the same proposal ids.** The info-circle pass and one
navigation pass both numbered proposals INFO-01 onward, and two passes both
claimed spec section 6.7. Section numbers are assigned above; proposals are
cited here by decision id, not by their source ids.

**C10. The same capability proposed twice from opposite ends.** The Style-first
metric path arrived as a defect (the attribute select lists only computed
metrics) and as an analyst dead end (the same list, reached from Explore and
the Custom score picker). Merged into DEF-7, with the union of artboards and
the three entry points of NAV-12 item 3.

**C11. Legend group counts.** One pass removes them because the panel lists
every group; another needs them because on CompareSplit the legend is the only
place eleven B-side group sizes appear. Resolution: the rule is conditional --
legend counts render whenever the panel does not list every group -- and
CompareSplit is named as the case that keeps them.

**C12. Two rows both offering Zoom to selection.** The Explore panel and the
inspector both drew it with the same key chip. 5.4 makes the inspector the home
for selection-scoped actions, so the Explore row is removed; F, the context
menu and the palette are unchanged.

**C13. Two passes on the ? dialog's length.** One removes twelve unshipped
rows; another removes two whole groups (panel and editor focus movement). The
first is accepted; the second is refused, because a keyboard-only user is
exactly who opens that dialog and the twelve-row cut already reclaims the
space. F6's Cycle regions row stays and gains the Insights strip.

**C14. XR versus the flat shell's budget.** The XR pass proposed two new
artboards, twelve Settings rows, nine element rows, six refusals and five open
questions. XR is a viewing mode no persona asks for, so it costs the flat shell
nothing: the spec text, the Settings rows under an XR sub-header, the register,
the refusals and the open questions are accepted; the two artboards are not,
the Views menu gains one second line rather than two, and the return toast is
recorded as a comment rather than drawn on Main.

---

# 9. Rejected

- **All fifteen Analyze card descriptions behind info circles** -- with DEF-2,
  MIN-5 and MIN-12 also landing on that panel it strips the screen of meaning;
  bounded to List view instead (G1).
- **Usage-based retirement of syntax hints after two successful submissions** --
  breaks 6.5's "no usage-based retirement of helper text", and the determinism
  that makes every user's screen match the docs is worth more than the line.
- **Showing the marquee "Shift+drag" hint only until the first marquee** --
  same rule, same reason.
- **Dropping the technical name from Insights strip cards** -- moves a
  canonical name into a tooltip on the one surface aimed at a first-time user;
  MIN-14's one-line rendering recovers the space instead.
- **Moving the technical name into a row tooltip inside a dense statistics
  table** -- same erosion of 6.3, and the bioinformatics reader who thinks in
  `padj` is exactly who loses it.
- **Moving layout engine names into segmented-control tooltips** -- same; the
  three stacked lines are fixed by rendering the pair inline.
- **Dropping "(ngraph)" from the status bar layout slot** -- same; the label
  word "Layout:" is what goes, not the name.
- **A row-hover pencil replacing "Change" on Data and Import mapping rows** --
  the Change link is a documented reopen path for the Import options dialog and
  is read seconds after a load; hover-only would make a novice entry point
  discovery-only (C2).
- **An info circle explaining the cost-class words on question-group headers**
  -- DEF-2 deletes the words; there is nothing left to explain.
- **New artboard `XrEntry.dc.html`** -- a viewing mode that no persona, workflow
  or capability asks for does not take one of forty artboards; 5.9 and the
  entry sheet's copy carry it as text.
- **New artboard `XrHeadset.dc.html`** -- same, and a schematic on a flat frame
  invites the "third platform" reading that 5.9's opening paragraph exists to
  prevent.
- **New artboard `TimeSliderSteps.dc.html`** -- the Number and Ordered-category
  renderings live in DEF-4's substitution table, which is the authority every
  surface reads from.
- **Moving the "In a panel" and "Inspector notes" groups out of the ? dialog**
  -- keyboard-only users are who opens it, and MIN-4 already reclaims the space
  (C13).
- **A second line under Enter AR in the Views menu** -- would make the XR pair
  the visually heaviest item in a menu whose real job is Reset view.
- **Drawing the "Back from VR" toast on Main** -- Main is the reference shell
  and a drawn toast reads as a permanent element; recorded as a comment, with
  the History group drawn in HistoryPopover.
- **Deleting the Cancel control's presence during progressive loading, or
  tagging it Coming** -- 5.1 and principle 6 both require a cancel in every
  phase; if the abort path has not shipped it is drawn disabled with its reason.

---

# 10. What a later pass does with this

1. Read the precedence list. It settles every collision this document did not
   name.
2. Apply the rules (DEF-1, DEF-2, DEF-4, IC-1 to IC-5, IC-8, IK-1 to IK-5,
   IK-8, MIN-1 to MIN-15, NAV-2, NAV-5, NAV-6) before any per-screen edit, and
   check each screen edit against them afterwards.
3. Take the per-screen lists from the source passes as the working reference;
   drop any item a rule here supersedes.
4. Use VOCAB section 10, "1.5 additions", for the markup. Every new control in
   this revision has a snippet there; nothing in this document introduces a
   shape that VOCAB does not carry.
