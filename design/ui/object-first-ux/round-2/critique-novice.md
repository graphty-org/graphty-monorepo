# Round 2 critique: the novice's advocate and a Figma expert read the revision

This is a critique of `design/ui/object-first-ux/round-2/revision.md` (and the twelve screen
specs beside it in `screens.md`) from two seats at once: the advocate of Explorer Elena, the
novice persona in `design/designloom/personas/explorer-elena.yaml` (a product manager with no
graph vocabulary who loads data, clicks the big nodes, reads importance from colour and size,
screenshots for colleagues, and quits when the curve feels steep), and a Figma expert checking
the revision's borrowings against the measured study in `design/ui/figma/components.md`.

It answers the six questions the round-2 brief asked, in order: is the frame one frame; do the
inspector tabs actually cut scrolling for the common tasks (rows counted per tab); is the
toolbar learnable; is running an algorithm understandable without a wizard; does styling of
continuous and group values read as one system; does the timeline fit. Then a ranked findings
table and three changes to make first. Nothing here was tried in a running app: the round-2
screens are specifications, not pictures yet, so every "I click" is what `revision.md` says
would happen. Paths are under `/home/apowers/Projects/graphty-monorepo/`.

Numbers that recur below were computed once, from the Figma measurements, by
`tmp/object-first/tab-width-check.mjs` (a ten-line script; run it with `node`).

## Terms

Design words used here, defined once. The revision's own glossary (its section 0) defines the
model words (Object, Set, Measure, Grouping, Group, tree, inspector, mask, Focus, the eye,
state); these are the extra ones this critique needs.

- **Frame**: the fixed parts of the window that never change meaning: which panels exist, where
  the menus are, what sits under the canvas.
- **Header block**: the top of the inspector that never scrolls: title row, summary row, reading
  row and the tab strip (revision section 2.3).
- **Pill tab**: one of a short row of text labels under the header block; the selected one is
  bold on a grey pill. Measured in Figma as text plus 8 px of padding each side, 24 px tall, 4
  px between tabs (`design/ui/figma/components.md` section 16).
- **Row budget**: how many 32 px rows fit in the inspector below the header block before the
  reader must scroll.
- **Affordance**: a visual cue that says "this can be clicked" (a button's fill, a chevron, an
  underline). A control without one is found only by accident or instruction.
- **Armed tool**: a toolbar tool that has been picked and now waits for a canvas click (the
  Path tool after pressing P). A **command** acts the moment it is clicked and waits for
  nothing.
- **Face**: the variant a flyout tool runs when clicked without opening its flyout; the last one
  used (Figma's rule).
- **Laptop budget**: the persona's device is a laptop. A 1366 x 768 or 1440 x 900 screen minus
  about 85 px of browser chrome gives a 683 or 815 px viewport; the mocks are drawn at 1600 x 1000.

## 1. Is the frame now one frame?

**Yes.** Section 1 of the revision names the disagreement correctly (the eight mocks were
consistent with each other and inconsistent with the two references), argues both options with
a table of what each rail item would actually hold, and picks one: no rail, the dataset name and
its chevron as the file menu, a Views list above the tree, one bottom dock with three tabs, and
a time transport bar that appears only while a time window is on. `screens.md` states the same
frame in its shared conventions and every screen entry obeys it. The "Data versus Table"
question gets the right answer (one object, two views of it) and the "does Layout have enough
for a panel" question gets a row count (5 to 8) rather than an opinion.

Three things the frame still does badly for a novice, none of which is a reason to reopen the
rail decision.

**Help, Settings and Keyboard shortcuts are behind the dataset name's chevron, and nothing on
screen says "menu".** Figma puts its main menu there too, but Figma also draws a floating "?"
help button at the bottom right of the canvas (`components.md` lists it among the surfaces
carrying the 200-level shadow), and Figma's users are known for not finding the file menu. The
persona's stated frustration is "no guidance on where to start"; the one word a stuck novice
hunts for is Help, and here it is one chevron next to "Karate Club", which reads as "switch
dataset". Before a load the header says "graphty" in secondary text, which reads as a title,
not a control. Fix: a "?" ghost button at the right of the status bar (the status bar has a free
right end before the zoom readout) opening Help, Keyboard shortcuts and the sample list; the
file menu keeps its rows. One 24 px button, no new home.

**The bottom dock has no visible opener while it is closed.** Table opens on Shift+T or by
clicking the status bar's "34 nodes 78 edges" (which has no affordance: it is 11 px secondary
text), Assistant opens from the Ask button, and History opens only by opening one of the others
and switching tab. History is also the only visible undo the design has (Ctrl+Z has no control),
and the persona's fourth frustration is "fear of breaking things": the undo list is the thing
that cures it, and it is three steps away. The revision admits the loss of a "you are here"
indicator (section 1.3). Fix: when the dock is closed, its tab strip stays as a 24 px handle
along the bottom of the canvas above the status bar, the way a browser's collapsed developer
tools or Figma's collapsed Motion timeline keep a strip; clicking a tab name opens the dock on
that tab. The handle IS the indicator, and it gives History a door.

**The status bar is becoming the second home for everything, in the strip with the least
room.** Counted across the revision: the counts, the mask readout ("Focused on X: 6 of 34
[Exit]", the time window), the layout chip, the computing chip with a GPU glyph and Cancel, the
stale chip with Re-run all, the tool's state ("Rank: Bridges", screen 4), the selection count,
"VR [Exit]", "Back from VR: 2 objects added", "the page will pause for about 8 s", export
progress, and the zoom readout. Seven of these can be present at once. At 11 px in a 1280 px
window that is crowded but possible; the design should say which items yield when it is not.
Each is a mirror of a real home (allowed by the round-1 rule), so this is a layout task, not a
model defect. Fix: state a priority order and a collapse rule (a chip collapses to its glyph
with a tooltip when the bar is short), and draw the busiest state once in the kit.

## 2. Do the inspector tabs cut scrolling for the common tasks?

**For the analyst's tasks, yes; for the novice's most frequent click, no; and the tab strip as
specified does not fit the panel it is drawn in.** Three parts: the widths, the row counts, and
the node.

### 2.1 The tab strip does not fit a 240 px panel at Figma's measurements (blocker)

The revision specifies Figma's pill tabs (section 0: "24 px tall, 11 px text, the selected one
bold on a grey pill", `components.md` section 16) in a 240 px panel whose row grid is
16 / 88 / 8 / 88 / 8 / 24 / 8, leaving 216 px between the gutters. Figma's tab is its text plus
16 px of padding, with 4 px between tabs, and Figma measured "Design" at 54.3 px and
"Prototype" at 69.5 px, which is about 6.3 px per character at 11 px weight 550 (the selected
weight, which every tab reserves so the strip never shifts). At those numbers:

| Tab set                                       | Width at Figma's 8 px padding | At 4 px padding | Room |
| --------------------------------------------- | ----------------------------- | --------------- | ---- |
| Dataset: Overview, Layout, Canvas, Data, Time | 272                           | 232             | 216  |
| Dataset without Time                          | 227                           | 195             | 216  |
| Set: Definition, Members, Style, Record       | 252                           | 220             | 216  |
| Measure: Values, Definition, Style, Record    | 246                           | 214             | 216  |
| Grouping: Groups, Definition, Style, Record   | 246                           | 214             | 216  |
| Node: Overview, Attributes, Connections       | 239                           | 215             | 216  |

None of the six fits at Figma's padding; the five-tab Dataset does not fit at any padding, and
the Set does not fit at 4 px. Every screen from 2 to 10 draws a tab strip, so the mock builder
will squeeze, wrap or truncate silently, and the design will be judged on whatever the squeeze
produced. This is the one finding that stops the screens being drawn as specified.

The fix is a constraint, not a redesign, and it is a two-way door: **at most four tabs per kind,
and four names totalling at most 27 characters at 4 px padding (21 at Figma's 8 px)**, or the
right panel goes to 280 px (which fits every four-tab set at Figma's padding but still not the
five-tab Dataset). Names that meet the 4 px constraint: Set "Define, Members, Style, Record"
(24); Measure "Values, Define, Style, Record" (23); Grouping "Groups, Define, Style, Record"
(23); Node "About, Attributes, Links" (20) or "Overview, Data, Links" (16); Dataset "Overview,
Layout, Canvas, Data" (24). The Dataset's fifth tab, Time, goes where the revision already puts
every other "surface with settings": section 6.1 calls the transport bar the surface and the
Time tab the property, and the Labels row and the layout engine already keep their settings in
a gear popover. Put the nine Time rows in the transport bar's gear, and give the Data tab one
row, "Time [sent v]", beside the column that carries the role, which shows the bar. That also
answers the timeline's discoverability problem in section 6 below.

### 2.2 The 24-row budget is a desktop budget, and the header block is 144 px, not 112

Section 2.3 gives the header block as three rows totalling 112 px, then lists four: Title 48,
Summary 32, Reading 32, Tabs 32, which is 144. `screens.md` repeats 112. The row budget then
reads "24 x 32 = 768 px, which fits a 960 px window under the 112 px header block and the 48
px panel header". A 960 px window is a 1600 x 1000 monitor with browser chrome, not the
persona's laptop. Computed with the 144 px block, the 48 px panel header and the 24 px status
bar, after about 85 px of browser chrome:

| Screen                  | Viewport | Free height | Rows before scrolling |
| ----------------------- | -------- | ----------- | --------------------- |
| 1366 x 768 laptop       | 683      | 467         | 14                    |
| 1440 x 900 laptop       | 815      | 599         | 18                    |
| 1600 x 1000 (the mocks) | 915      | 699         | 21                    |
| 1920 x 1080             | 995      | 779         | 24                    |

So the budget the rules promise (rule 3: "no tab exceeds 24 rows") holds only on a 1080p
monitor. Against the laptop budget of 14 to 18 rows, counted from the section 2.4 tables with
every conditional row present, section headers counted as rows and disclosures collapsed:

| Kind, tab            | Claimed max | Counted                                                                                | Fits 14 rows                 | Fits 18 rows |
| -------------------- | ----------- | -------------------------------------------------------------------------------------- | ---------------------------- | ------------ |
| Dataset, Overview    | 14          | 10 plus one per Finding (open-ended)                                                   | yes                          | yes          |
| Dataset, Layout      | 11          | 12                                                                                     | yes                          | yes          |
| Dataset, Canvas      | 12          | 13                                                                                     | yes                          | yes          |
| Dataset, Data        | 24          | 21 to 24 with 12 columns (Export is below the fold)                                    | no                           | no           |
| Dataset, Time        | 9           | 10                                                                                     | yes                          | yes          |
| Set, Definition      | 12          | 8 to 12                                                                                | yes                          | yes          |
| Set, Members         | 16          | 16                                                                                     | no                           | yes          |
| Set, Style           | 14          | 4 to 14 (a fresh Path is 7)                                                            | yes                          | yes          |
| Set, Record          | 16          | 15 to 18 (one row per parameter and per caveat)                                        | no                           | marginal     |
| Measure, Values      | 14          | 13                                                                                     | yes                          | yes          |
| Measure, Definition  | 10          | 7 to 10                                                                                | yes                          | yes          |
| Measure, Style       | 16          | 10 with the second block collapsed, 17 to 18 open                                      | yes collapsed                | no open      |
| Grouping, Groups     | 8           | 8                                                                                      | yes                          | yes          |
| Grouping, Definition | 9           | 9                                                                                      | yes                          | yes          |
| Grouping, Style      | 14          | 15 (`screens.md` screen 7 also counts 15)                                              | no                           | yes          |
| Node, Overview       | 18          | 13 with three objects; one row per Measure, Grouping and painted channel, so unbounded | no with five or more objects | marginal     |
| Node, Attributes     | 12          | 12                                                                                     | yes                          | yes          |
| Node, Connections    | 12          | 12                                                                                     | yes                          | yes          |

The tabs do cut scrolling where it hurt in round 1: a Measure opens on Values (13 rows) instead
of scrolling past a Definition; a Group's Style is 2 to 6 rows; a Grouping's Groups tab is 8.
The analyst's complaint (six parameter rows before the top 10) is gone. But six of eighteen tabs
still scroll on a 768-tall laptop, and the rule should say 14 or 16, not 24, and be checked
against that. Fixes, all small: cap member rows at 5 (not 8) on Members; move Export off the
Data tab (the Export button is its home; the Data tab's copy is the second home the revision
argues against elsewhere); make the Node Overview's Values and Look sections show three rows
then "and N more"; and correct 112 to 144 in both files.

### 2.3 The node's default tab answers the analyst's question, not the novice's (major)

The persona's second behaviour is "clicks on prominent nodes to see what they are and who they
connect to". On a fresh load, with no objects in the tree, a node's Overview tab (section 2.4,
Node) is: a VALUES header with nothing under it, MEMBER OF "In no set", a LOOK header with
nothing painted, three doors ("Style this node...", "Style its group..." absent, "Add to
[set v]"), a position line, and NOTES "+". Seven rows about objects that do not exist. "What is
it" is the Attributes tab and "who does it connect to" is the Connections tab, both one tab
away, and neither is where the panel opens. Round 1's novice walkthrough hit the same wall
(finding 3 of `critique/novice-walkthrough.md`: the node inspector is a report about objects
first), and the tab split has moved the answer rather than surfaced it.

Fix: the node's first tab leads with the material. Overview becomes: the label and the first
three attributes (with "All 23 >" to the Attributes tab), "Connected to 17 nodes >" (to the
Connections tab), then VALUES, MEMBER OF and LOOK as they are, with an empty section drawn as
its header only (the revision's own disclosure rule). Nothing new is built; the rows move up.
For an analyst with six objects, the objects still start on the first screen.

### 2.4 Smaller inspector points

- **The remembered tab per kind** (section 2.5) means the same click on two Groups can open
  two different tabs if the reader wandered into Record on the first. Figma remembers
  Design / Prototype globally and its novices are surprised by it. Minor: remember per kind
  only after the reader has changed tab twice in a session, or not at all in the first
  release; the four event overrides in section 2.5 already do the useful part.
- **"Definition" as a tab name** is a stranger's word for "how this was made"; it also fails
  the width constraint. "Define" or "Setup" fits; "Made from" would be clearest but is two
  words.
- **The Record tab is right.** One place for provenance, export and notes on every kind is the
  best consistency win in the revision, and the "Copy as methods text" row is the persona's
  "communicate findings to stakeholders" in one click.

## 3. Is the toolbar learnable?

**Mostly yes, and better than round 1 by a wide margin.** Labels under every icon, a 0 ms
tooltip delay on the toolbar alone, plain names first and technical names second in every
flyout, the cost printed before the click, the "in tree" mark on a row already run, and the
face rule so a plain click does the last thing you did. The round-1 novice scored "find a path"
at 2 of 5 because of the icon hunt; with "Path" written under the icon and node labels on
hover (section 6.9), the same task is a 4. Four things hold it back.

**With labels, the buttons cannot stay 32 px wide, and the bar then does not fit the 1280 px
window the frame argument relies on.** The only place Figma draws a 9 px label under an icon is
the rail, whose buttons are 56 px wide for that reason (`design/ui/figma/left-sidebar/README.md`
section 1). At 9 px Inter, "Neighbours" is about 45 px and "Structure" about 41; on a 32 px
button they spill into the 8 px gaps on both sides. Computed for the bar as specified (ten
tools, six 16 px chevrons, three dividers, the 122 px mode switch, 8 px gaps, 8 px padding): 661
px at 32 px buttons, 741 at 40, 821 at 48. Section 1.5 rejects the rail partly because "two 240
px panels leave 800 px of canvas" at 1280; the labelled toolbar at 48 px buttons is wider than
that canvas, and at any width it collides with the 160 px legend card that `screens.md` draws
at the bottom right. Figma's answer is to let the toolbar overlap the panels below 1280 (its
section 40: "never collapses"), which is acceptable if stated. Fix: decide the button width
(40 px with 8 px labels is the compromise), drop the labels from Select and Hand (the two icons
that are thirty years old, which is the revision's own test), let the legend dock above the
toolbar's right end rather than beside it, and draw screen 11 (the toolbar reference sheet) at
1280 as well as 1600, so the collision is seen before it is built.

**Two kinds of button wear one costume, and the revision contradicts itself about which kind
Rank is.** Section 3.2 says clicking Groups, Rank or Structure "runs the face variant on what
is showing with default parameters"; section 4 step 1 says pressing R means "Rank takes the
brand fill; nothing else changes", and the run only starts at step 2 or 4. Both cannot be true.
If Rank runs on click it is a command, and the brand fill (which the toolbar reserves for "the
armed tool") is wrong for it; if it arms, there is no canvas action for it to wait for. For a
novice the mixed metaphor is the harm: Path and Neighbours wait and tell her what to do in the
secondary bar; Groups acts instantly with no confirmation of what it will run on or what it
will cost. Fix, recommended: make every creation tool arm the same way, and give the
command-like ones a secondary bar too: "Rank by [Bridges v] on what is showing, 115 nodes,
about 2 s [Run] Cancel" (or "on Group 2, 11 nodes" under Focus). Enter or Run runs it; the
flyout row click still runs directly for the analyst's two-click picture. One rule for the
whole toolbar (arm, read the bar, act, snap back), the scope and the cost seen before anything
happens, and no dialog. It also removes the need for the Alt+click convention, which no novice
will find.

**The initial faces are not defined.** The face is "the last-used variant", so on a fresh
session each flyout tool needs a first face, and for the novice it must be the cheapest and
most legible one: Connections for Rank (not Bridges, which is the round-1 mocks' face and
"heavy"), Communities for Groups, Shortest route for Path, By values for Filter, Separate
pieces for Structure. One line in section 3.2.

**Structure is the least coherent flyout, and its name does not say its question.** The
placement rule ("by the question the algorithm answers") is right, and the flyout row
icons could carry it further. Structure's ten rows hand back five different kinds of object
(a Grouping, a Set, a Measure, a Finding, a linked Set), so the one thing a novice most wants
to predict, "what will appear in the tree", is unpredictable from this button, and "Over time"
and "What breaks if removed" are not about a skeleton at all. Fix: (a) every flyout row's left
icon is the kind icon the tree row will carry (Set, Measure, Grouping, Finding), in place of
Figma's check glyph, so the flyout shows its result shape without a word; (b) "What breaks if
removed" keeps its primary home on the node's overflow (where the revision already lists it)
and "Over time" moves to the transport bar's gear, where a reader thinking about time already
is; (c) the label is fine once the flyout is predictable.

Smaller: "E" for Neighbours has no mnemonic (Figma's E is Ellipse); "Rank" alone does not say
"rank the nodes" but the flyout's first row does; the mode switch showing VR and AR only when
supported is right; the "Ask" button is the best novice door in the design, because "how are 1
and 34 connected" typed in plain words needs no vocabulary at all, and the permanent privacy
line above the composer is the right honesty. The three suggestion rows under the root
(`screens.md` screen 2) still vanish after the first object with no way back (round-1 finding
8, not addressed); with a labelled toolbar this matters less, but a "Suggestions" row in the
Objects header's overflow would close it.

## 4. Is running an algorithm understandable without a wizard?

**Yes, for the case the persona will actually meet, and the section 4 table is the best piece
of the revision.** Elena on Karate Club: press G (or click the "Find groups (G)" suggestion
row), a row "Communities (Louvain)" appears at the top of the tree already selected, the canvas
goes four colours, the legend switches itself on, the summary row says "4 groups", the reading
row says "The groups are clearly separated (modularity 0.36) ?", and the inspector opens on the
Groups tab. Every round-1 novice finding about this moment is answered: the plain name comes
first in the row (finding 6), the reading is on the surface (4), the legend is on (7). She can
say "there are four groups" out loud without opening anything, which is the onboarding
workflow's comprehension test (`design/designloom/workflows/W14.yaml`).

The expensive case (a waiting row whose count slot is the button "Run (about 4 min)", the
inspector opening on Definition with Run focused so Enter is the second click, "Approximate
instead" beside it) is honest and needs no wizard, provided the row-is-a-button affordance is
drawn strongly (a hollow circle plus text is not much; a secondary button in the count slot
is). Two defects.

**The first-free-channel rule is not per kind, so the second run can paint nonsense.** Step 8:
"Colour if no visible object above writes it, else Size, else Outline, else Colour anyway".
The suggestion rows offer "Rank by connections (R)" before "Find groups (G)"; a reader who
takes them in that order gets a Measure on Colour, then a Grouping whose first free channel is
Size: four communities drawn as four node sizes. A Grouping has no order, so Size is
meaningless for it, and Shape or Outline is what it should take. Fix: the free-channel order is
per kind: Measure: Colour, Size, Opacity; Grouping: Colour, Shape, Outline; Set: Outline,
Colour, Glow. One table row in section 5.7, and the element's suggested-encoding change carries
it.

**The click-versus-arm contradiction** (section 3 above) is also a section 4 defect, because
step 1 as written shows a novice a blue button and nothing else, which is exactly the "what
now" moment a wizard exists to prevent. The secondary-bar fix closes it.

Smaller: "Alt+click opens the parameters popover" is an expert's gesture; the "..." on the
flyout row is the findable one and should be the one the text leads with. The cancel rules and
the stale rules are clear and, importantly, never show a modal. Undo has no control on screen
(see the dock finding in section 1).

## 5. Does styling of continuous and group values read as one system?

**The model is one system; the rows are three.** The rule is right and simply stated: one tab
called Style on every kind; a Set or Group has paint rows (a fixed value on a channel); a
Measure or Grouping has encoding blocks (a channel bound to values through a scale and a
palette); precedence is per channel, top of the tree wins, children above their parent. The
Group's override above its inherited row, with the inherited chit now clickable (round-1
finding 2, fixed), is the best three clicks in the design. The Measure block (Channel, Scale,
Palette, Domain, Clamp, Missing, Legend) and the Grouping block (Channel, Palette, one swatch
per Group, Other, Overflow, Show the largest) are complete, and the palette picker being one
component for both is right. Two things stop it reading as one system on the screen.

**Three grammars for "which channel this row paints".** Side by side, the first rows of each
Style tab as specified:

| Kind         | Rows as written                                                                                                           |
| ------------ | ------------------------------------------------------------------------------------------------------------------------- |
| Set (a Path) | NODES header, "[chit] 1B9E77 100% [eye][-]"; EDGES header, "[chit] 1B9E77 100% [eye][-]", "Width [3]", "Pattern [Dash v]" |
| Grouping     | "Channel [Colour v] [eye][-]", "Palette [Okabe-Ito v]", swatch rows..., "+" listing "Edge colour"                         |
| Measure      | "Channel [Colour v] [eye][-]", "Scale", "Palette", ..., "+" listing "Edge width, Edge colour"                             |

So a Set says which element kind it paints with a section header (NODES, EDGES) and leaves
its Colour row unlabelled (Figma's fill row) while labelling Width and Pattern; a Measure and a
Grouping say it with a word prefixed to the channel name ("Edge colour") in one flat list, and
label every row. A reader who learned the Set tab on a Path and then opens a Measure meets a
different layout for the same idea. This is the exact place the owner's instinct ("node style,
edge style") should be honoured in every tab, and the revision honours it in one. Fix: every
Style tab has the NODES and EDGES section headers with a "+" each; a paint row and an encoding
block both begin "Colour [chit or ramp] ..."; the Set's Colour row gets its label like its
siblings; a Measure's "+" under EDGES lists Width, Colour, Opacity. One grammar, and "Edge
colour" disappears as a channel name.

**The Set highlight colours collide with the group palette.** New Sets take "blue, then green,
then orange, then the categorical palette's colours" (section 5.4). Okabe-Ito, the default
Grouping palette, is orange, sky blue, green, yellow, dark blue, vermilion, pink; screen 8's
own path colours (#1b9e77 green, #2166ac blue) sit next to Okabe-Ito's #009e73 and #0072b2. A
path drawn green through green community nodes is invisible, and the novice reads importance
from colour. The width and pattern channels help on edges but not on the path's nodes. Fix: the
highlight palette is chosen to be distinct from every categorical palette the element ships
(the element owns both lists, so it can check), and a Path's default node paint is an Outline
in the path colour rather than a fill, so the community colour stays visible underneath.

Smaller, all vocabulary the novice would not open in her first ten minutes but will meet in
her first hour: "Domain" and "Range" are mathematics; "Values from / to" and "Sizes from / to"
say the same thing. "Clamp outliers" is fine with its percentile caption. Three eyes (the row's,
the block's, the object's) is Figma's own count and is fine.

## 6. Does the timeline fit?

**Structurally, yes.** Time as a mask, like Focus, that composes with it ("Focused on Group 2,
2019-03: 6 of 34"); the transport bar as the surface, drawn only while a window is on; a View
saving the window; video export recording playback; Escape pausing first. That is the right
shape and it is drawn in `screens.md` screen 10 convincingly. Two defects, one of them a
contradiction inside the revision.

**Playback marks objects stale, which contradicts "a mask exactly as Focus".** Section 6.1:
"Time is not an object ... it is a mask (what is showing), exactly as Focus is". Focusing on
Group 2 does not mark Bridges stale; the revision is careful about that everywhere else (stale
means the inputs changed). But two paragraphs later, with the default switch off, every
Measure and Grouping "carries the amber stale dot" as soon as a window is set, the status bar
says "N stale [Re-run all]", and the objects API gets a new hash input to make it so. For the
novice this is the whole tree turning amber the moment she touches the slider, which reads as
"you broke it"; for the model it is a mask behaving like a data change. Fix: a window never
marks stale. The caveat "computed on 2019-01 to 2019-12" lives where the revision already puts
it (the legend line under the block, and the summary row), as a caveat not a state; the
"Re-run objects while playing" switch remains the reader's explicit opt-in; the hash change in
section 8 is deleted. The revision's own better answer for "how did the network evolve" is
Structure > Over time, and this keeps that the only place values change with time unasked.

**A time column has no door until the reader finds "Set as time" three levels down.** The Time
tab exists only "once a column carries the time role", set from Data tab > column "..." > Set
as time. A reader who loads her own CSV with a `date` column sees no tab, no bar, and no hint;
the attribute catalogue already types the column as `time`
(`inventory/element-capabilities.md`, the attribute catalogue row), so the app knows. Fix: when
a column of type time exists and no role is set, the Dataset's Findings section (whole-graph
facts, already a section) carries one row: "Time column: sent, 2019-01 to 2019-12
[Show over time]", which sets the role, sets a full-range window and shows the bar. With the
Time tab folded into the transport bar's gear (section 2.1), that row and the Data tab's "Time
[sent v]" row are the two doors, and the five-tab Dataset is gone.

Smaller: the transport bar's count reads "412 of 1,204 showing" (nodes) while the time column
is on edges (`sent`); whether a node with no in-window edges is drawn is unspecified and the
element's window API takes one attribute. Say which, in one line. Sliding versus cumulative,
speed, step keys and the change-count ticks are all right.

## Round-1 novice findings, checked

| Round-1 finding (`critique/novice-walkthrough.md`)     | Round 2                                                                              |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| 1 Tools unlabelled, tooltip delay                      | fixed: labels, 0 ms delay (section 3.1); width unresolved (this critique, section 3) |
| 2 Locked inherited swatch is a dead click              | fixed: the chit creates the override (5.3)                                           |
| 3 "Colour this node..." too easy, no door to the group | fixed: "Style its group..." (2.4, Node)                                              |
| 4 The reading buried behind "Made by" and "?"          | fixed: the reading row in the header block (2.3)                                     |
| 5 No labels before a Measure exists                    | fixed: hover label on any node (6.9)                                                 |
| 6 Row name not the verb clicked                        | fixed: plain name first in the row                                                   |
| 7 Legend off by default                                | fixed: on with the first Grouping or Measure (4, step 8)                             |
| 8 Suggestion rows vanish with no way back              | not addressed                                                                        |
| 9 "Share"                                              | fixed: "Export"                                                                      |
| 10 Legend in the picture                               | fixed: on by default (6.8)                                                           |
| 11 "Fill" versus "Look"                                | fixed: "Style" everywhere; "Look" is the node's report (5.1)                         |
| 12 Suggestion rows look like contents                  | partly: they carry tool icons and keys now                                           |
| 13 The eye reads as "hide"                             | not addressed; the tooltip is the only explanation                                   |
| 14 Unexplained words on the Dataset                    | not addressed: Density, Parts, Settled remain on Overview; "Domain" is added         |
| 15 The Path flyout is a shock                          | partly: the heavy items moved to Structure; Rank now has 12 rows                     |
| 16 Counts formatted three ways                         | fixed: one rule in `screens.md`                                                      |
| 17 Two exports that read the same                      | fixed: "Framed image" on objects, the Export button for the picture                  |

## Findings, ranked

Severity: blocker = the screens cannot be drawn or the model contradicts itself in a way the
mocks would hide; major = the novice takes a wrong turn or a measurable promise fails on her
device; minor = friction she notices and passes.

| #   | Severity | What                                                                                                                                                                                                            | Where                                            | Fix                                                                                                                                                               |
| --- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | blocker  | The pill-tab strips do not fit the 240 px panel at the Figma tab measurements the revision specifies: 227 to 272 px of tabs in 216 px of room; the five-tab Dataset fits at no padding                          | `revision.md` 2.3, 2.4; `screens.md` conventions | at most four tabs per kind, names totalling 27 characters at 4 px padding (or 21 at 8 px), or a 280 px panel; Time's rows become the transport bar's gear popover |
| 2   | major    | Clicking Groups, Rank or Structure runs at once (3.2) or only arms the tool (4 step 1); the two sections disagree, and a novice pressing R sees a blue button and nothing else                                  | `revision.md` 3.2, 4                             | every creation tool arms and shows a secondary bar "Rank by [Bridges v] on what is showing, 115 nodes, about 2 s [Run] Cancel"; flyout row click runs directly    |
| 3   | major    | The 24-row budget assumes a 960 px window; the header block is 144 px (its own four rows), not 112; on a 768-tall laptop the budget is 14 rows and six tabs exceed it                                           | `revision.md` 2.3, 2.6 rule 3; `screens.md`      | set the rule at 14 rows; cap member rows at 5; Export off the Data tab; Node Overview sections show 3 rows then "and N more"; correct 112 to 144                  |
| 4   | major    | A node's default tab is a report about objects (empty Values, "In no set", empty Look, three doors) on a fresh load; the novice's questions "what is it" and "who does it connect to" are on the other two tabs | `revision.md` 2.4 Node                           | Overview leads with the label, three attributes and "Connected to 17 nodes >", then the object sections, empty ones as headers only                               |
| 5   | major    | The suggested-encoding rule (Colour, else Size, else Outline) is not per kind; Rank then Groups paints communities as node sizes                                                                                | `revision.md` 4 step 8, 5.7                      | per-kind free-channel order: Measure Colour, Size, Opacity; Grouping Colour, Shape, Outline; Set Outline, Colour, Glow                                            |
| 6   | major    | Style tabs use three grammars for "which element kind and channel": NODES/EDGES headers with an unlabelled Colour row on a Set; "Edge colour" as a channel name in one flat list on a Measure and a Grouping    | `revision.md` 5.2, 5.3, 5.4                      | NODES and EDGES headers on every kind; every paint row and block starts with its channel name; the Measure's EDGES "+" lists Width, Colour, Opacity               |
| 7   | major    | Setting a time window marks every Measure and Grouping stale, contradicting "a mask exactly as Focus"; the tree turns amber when the slider moves                                                               | `revision.md` 6.1, 8                             | a window never marks stale; "computed on <range>" is a caveat in the legend and summary; the opt-in switch stays; drop the hash change                            |
| 8   | major    | A time column has no door: the Time tab appears only after Data > column "..." > Set as time, which nothing on screen suggests                                                                                  | `revision.md` 6.1, 2.4 Dataset                   | a Findings row "Time column: sent, 2019-01 to 2019-12 [Show over time]" when a time-typed column has no role, plus a "Time [sent v]" row in Data                  |
| 9   | major    | With labels the tool buttons cannot stay 32 px; the bar is 661 to 821 px wide against the 800 px canvas at 1280 that section 1.5 relies on, and it collides with the legend card                                | `revision.md` 3.1, 1.5; `screens.md` screen 11   | 40 px buttons with 8 px labels; no label on Select and Hand; legend docks above the toolbar's right end; draw screen 11 at 1280 too                               |
| 10  | major    | Help, Settings and Keyboard shortcuts are behind the dataset name's chevron with no visible menu affordance; the stuck novice has no "?"                                                                        | `revision.md` 1.3, 1.5                           | a "?" ghost button at the right of the status bar opening Help, shortcuts and samples                                                                             |
| 11  | minor    | The closed dock has no opener; History (the only visible undo) is three steps away                                                                                                                              | `revision.md` 1.3                                | the dock's tab strip stays as a 24 px handle above the status bar when closed                                                                                     |
| 12  | minor    | The status bar can hold seven mirrored items at once with no yield order                                                                                                                                        | `revision.md` 1.4, 4                             | a priority order and a collapse-to-glyph rule; draw the busiest state once                                                                                        |
| 13  | minor    | Initial faces of the flyout tools are undefined; "last used" has no first value, and the round-1 face for Rank was the heavy one                                                                                | `revision.md` 3.2                                | Connections, Communities, Shortest route, By values, Separate pieces                                                                                              |
| 14  | minor    | Structure hands back five object kinds and includes "Over time" and "What breaks if removed", so the tree result is unpredictable from the button                                                               | `revision.md` 3.3, 3.4                           | flyout row icon = the kind icon of the row it makes; "Over time" to the transport gear; removal impact stays on the node                                          |
| 15  | minor    | Set highlight colours (blue, green, orange, then the categorical palette) collide with Okabe-Ito community colours; a green path through green nodes vanishes                                                   | `revision.md` 5.4; `screens.md` screen 8         | a highlight palette disjoint from the shipped categorical palettes; a Path's node paint is an Outline, not a fill                                                 |
| 16  | minor    | Suggestion rows vanish after the first object with no way back (round-1 finding 8)                                                                                                                              | `screens.md` screen 2                            | "Suggestions" in the Objects header overflow                                                                                                                      |
| 17  | minor    | "Definition", "Domain", "Range", "Density", "Parts" are a stranger's words on the surface                                                                                                                       | `revision.md` 2.4, 5.2                           | "Define" (or "Setup"), "Values from / to", "Sizes from / to"; the Dataset words get the "?" reading                                                               |
| 18  | minor    | The remembered tab per kind can make the same click open two different tabs                                                                                                                                     | `revision.md` 2.5                                | remember only after the reader changes tab twice in a session; keep the four event overrides                                                                      |
| 19  | minor    | Whether a node with no in-window edges is drawn under an edge-time window is unspecified                                                                                                                        | `revision.md` 6.1                                | one line: nodes follow their edges, or nodes with no time attribute are always drawn                                                                              |

## What to change first

1. **Make the tab strip fit, on paper, before any screen is drawn** (finding 1): four tabs,
   short names, the width rule written into `screens.md` conventions, Time into the transport
   gear. It is an hour's edit and it decides whether screens 2 to 10 are honest.
2. **One rule for every creation tool: arm, read the secondary bar, act, snap back** (findings
   2 and 13). It resolves the section 3 / section 4 contradiction, gives the novice the scope
   and the cost before anything runs, and needs no dialog and no Alt+click.
3. **Lead the node with the node, and paint per kind** (findings 4 and 5). Both are row moves
   and a table row in the element list, and both are on the novice's first three clicks.

The timeline pair (findings 7 and 8) and the Style grammar (finding 6) are next; each is a
paragraph in `revision.md` and a screen in `screens.md`, and none reopens a settled decision.
