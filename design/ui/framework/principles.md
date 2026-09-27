# graphty design principles

These principles decide design arguments in the graphty app and in the parts of graphty-element
that people see. There is one baseline and six ranked principles. When two ranked principles pull
in opposite directions, the ranking section says which wins; a pair that has never met in a real
conflict is unranked, and the numbering says nothing about it.

Each principle is written as "A even over B": a reasonable team could choose B, and the principle
says we do not. Each one gives:

- **Means**: what it asks for.
- **Rules out**: the tempting design it forbids.
- **Decides**: a concrete graphty decision it makes.
- **Test**: a check that fails when the principle is broken.
- **Source**: where it comes from -- taken from Figma, adapted from Figma, or graphty's own.

A principle stays on this list only if it wins at least one real conflict that nothing else on
the list, and no fixed rule, already settles (`research/design-method.md` section 5). The conflict
ledger shows each one winning. Principles rank trade-offs and set budgets; they do not place
things on screen. Where a thing lives is decided by the information architecture from the
personas and workflows. The drafts in the worked conflicts are budget checks, not layouts: the
information architecture owns each screen and re-counts it. Quoted screen strings are examples;
`glossary.md` is their authority, and where the two differ the glossary wins.

**The design target** is the intermediate analyst: someone who uses graphty weekly and knows the
field's terms. Other skill levels are served by aids every user gets (see "How every skill level
is served"), never by features of their own.

---

## 0. The baseline: Figma's way, even over a locally better idea

**Means.** If Figma has solved a problem, graphty solves it the same way, and the result should
look and behave like Figma. This covers the layout (nav rail, small bottom-center toolbar, right
inspector, command palette, bottom dock) and the behavior:

- selection drives the inspector; with nothing selected the inspector belongs to the graph, which
  is graphty's page;
- "+" adds first with defaults, configure afterwards;
- no confirmations: every act is one undo step, and undo is silent and exact;
- one home per capability; the context menu, main menu and command palette are doors to that
  home, never second implementations;
- one overlay open at a time;
- edits commit on Enter, Tab or leaving the field;
- the app never starts work unasked: opening a file shows the file. A run implied by an explicit
  command counts as asked: Open placing nodes that have no stored positions, the first entry to a
  view mode that has none, binding an always-available metric to a layer or column, Replace data
  replaying runs. The overview comes from graph attributes that graphty-element maintains at
  O(n+m) cost, not from a run;
- help on request: (i) icons, tooltips that wait and show the name plus the shortcut, and the
  optional "Additional labels" toggle in the view menu, Figma's own;
- the familiar shortcuts: V, Ctrl+K, Enter and Shift+Enter, Shift+click, marquee, Escape.

The baseline is not ranked. It is the default that any ranked principle may override, but only
through a row in the departures table at the end of this document. The row names the principle,
fixed rule or workflow evidence that forces the departure. A departure that cannot name one goes
back to Figma's behavior. "Ours is clearer" is taste, not evidence. A departure changes what is
shown; the device that contains it stays Figma's: "N more", the bottom dock, a header chip, a
submenu, a split button.

**Figma-fidelity review.** The baseline's test only works if someone knows Figma's behavior. Every
framework document is therefore put through a Figma-fidelity review, grounded in the study in
`design/ui/figma/` and `research/figma.md`, which asks of each difference from Figma: is it in the
departures table, does it name what forces it, and is the Figma comparison it relies on correct?
The review also checks each verdict in `research/figma.md` section 5 against the framework. Its
findings land in one of two places, so they can be checked: a row in the departures table below,
or a "Superseded by <document section>" mark on the verdict it overrules. "Go back to Figma's way" is an allowed outcome, and then the framework document changes instead.

The review is a standing seat on the design team, **the Figma expert**, and not a persona. The
personas in `design/designloom/personas/` describe graph users; none of them is a Figma user, and
a persona that knew Figma would pull the design toward one skill level. The seat speaks for how
Figma works, why it works that way and which of its patterns apply. It reviews every framework
document when it is written, and reviews an earlier document again whenever a later one changes a
placement or a behavior the earlier one relied on.

**Not copied.** Figma has weaknesses, and "same as Figma" does not license them
(`research/figma.md` 1.3 and 4.8):

1. a layers tree with no screen-reader roles, context menus reachable only by right-click, and
   tooltips hidden from assistive technology;
2. a second Escape that deselects: an Escape that closes an overlay does nothing else, so a
   habitual double press never loses the selection (the component spec decides the mechanism);
3. "+" buttons and tabs that fire on mouse-down (mouse-down on a visibility eye, which allows
   drag-to-toggle across rows, is kept only if it has a keyboard equivalent);
4. rail panels of uneven weight (Variables takes over the whole editor);
5. one word carrying two meanings ("Actions" is both the palette and a prototype field);
6. promotional and first-run interface: the dismissible card in the nothing-selected inspector,
   onboarding coach marks and "What's new" dialogs.

Figma's persona-specific Dev Mode is ruled out by a fixed rule, below.

**Rules out.** Bespoke controls. The precedent is in `CLAUDE.md` ("UI Components"): the custom
contrast ring on the app shell's lock button was deleted once the fix moved into the shared
theme.

**Decides.** "+" on an empty section adds a default at once, with no dialog. Style-layer rows look
and reorder like Figma's Fill list; where they differ, the departures table says so. The attribute
table is multi-column and sortable, so by Figma's rule it leaves the side panels
(`research/figma.md` 4.14, 4.16); how it is opened, and how few steps it costs, is the information
architecture's decision, checked against the rank of the tasks it serves (ranking by a centrality
is that table sorted). `run-algorithms-on-load` is removed.

**Test.** An interaction that differs from Figma and has no row in the departures table; or any
run the analyst did not start, directly or through a command listed above.

**Source.** Figma: "Predictable", "preserve muscle memory", "Center your ideas, not Figma's UI"
(`research/figma.md` 1.1, 1.2; the study in `design/ui/figma/`).

---

## 1. A value never misstates what it describes, even over a quiet screen

**Means.** Every value graphty shows, and anything built on one (a note, an export, a legend),
lets the reader tell four facts without asking: what it was computed on (its scope), whether it is
still current, whether it is exact, and what produced it (including its variant).

- **Marks only on departure.** The reference state is the full graph with no filter, exact,
  current, reading the weight as its declared role. A value in that state carries no mark.
  Anything else carries one, visible without a hover and never only behind Details. A
  definition's own fields (a rule set's scope and population) are properties, not marks.
- **Scope is marked once, at the smallest container whose values all share it.** An active
  filter is one persistent chip, the filter chip, carrying the node count ("Filtered: 1,204 of
  5,310 nodes", or "Working set: 40 of 5,310 nodes" when the filter is a working set), visible
  whatever is selected and opening the filter on click. That is Figma's pattern for state that
  changes the whole canvas, its zoom control (`research/figma.md` 4.15); where the chip sits is
  the information architecture's decision. A value whose scope is the chip's carries nothing more.
  A result whose scope differs says so on its state line; a table column in its header; a legend
  in its title, which also names the result it encodes.
- **The chip alone marks the filtered node count.** A distant indicator goes unread when it
  states a mode and not the number, as Excel's status bar does (`research/key-insights.md` 3.3);
  the chip states the node count itself, is visible whatever is selected, and the one other count
  a filter changes, edges, carries its own "of" in Statistics because the chip does not state it.
  A Nodes row reading "1,204 of 5,310" would say the chip's words twice, so the row shows the
  count alone. This overrules contradiction 12 in `research/figma.md` 5.6.
- **What leaves the screen as a document carries its scope**: an export, an exported legend (in
  its title), copied table rows (in their column headers) and a note. Copying a single value
  copies the raw number, as Figma's Inspect copies a value on click (`research/figma.md`,
  follow-up on reading existing objects), because it is pasted into a cell whose column the
  analyst labels, and a number with words attached breaks a spreadsheet.
- **Live readings follow the chip; bound values keep their run's scope.** The overview and an
  always-available metric read live (a node's degree in its inspector) are computed on the
  filtered graph. A layer or column bound to degree is a run: after a filter change it keeps its
  scope and says so on its state line (`conceptual-model.md` 7.2).
- **A caveat is one of five kinds, in one of two forms.** The kinds: scope; freshness; exactness
  (an estimate, a method that did not converge, output cut at its declared cap); variant; and a
  violated precondition of the algorithm (closeness on a disconnected graph). Anything else is
  help, and principle 5 governs it.
    - Scope and freshness take the **state-line form**: the one line beside a result, at most two
      tokens, first its status or freshness, then its scope when that differs from the chip's
      ("Out of date - on: 5,310 nodes"). It offers the one verb that resolves its first token and
      ends in Details, which opens the full record (`conceptual-model.md` 7.1, 7.2). There is no
      second line.
    - Exactness, variant and a violated precondition take the **mark form**: one glyph or at most
      three words at the value or the name, each kind with its own word so that no two read alike.
      The estimate mark "~" sits at every estimated value ("~0.412"), in a sorted table and in the
      legend too. A mark carries no verb, with one exception: a violated-precondition mark opens,
      on click, its one verb, the alternative method that does not have the precondition
      ("Harmonic centrality" for closeness on a disconnected graph). The mark is a control, so the
      verb costs no words at rest.
    - **A precondition known before a run shows before it**, as a mark on the run control beside
      the cost band, with the same one verb. graphty-element checks it from the graph's overview,
      which it always maintains, so the check starts no run.
- **The variant is part of the name.** Weakly or strongly connected components, in-degree or
  out-degree, directed or undirected edges, a sampled method ("Betweenness (sampled)"), and a run
  that reads the weight other than as its declared role are always named, because a bare
  "Components: 1" on a directed graph can be a wrong number.
- **Provenance is not a caveat.** The engine, the seed, the sampler and the weight attribute are
  under Details. An exact value is the same number on CPU and GPU; if an engine's precision
  changes the digits shown, that is an exactness caveat and is marked as one. graphty-element
  states its engine once for the session, as `CLAUDE.md` requires, not on every value.
- **A cost estimate is a value too.** It is a band word: "under a minute" (10 to 60 s), "a few
  minutes" (1 to 5 min), "under an hour" (5 to 60 min), "hours" (1 to 24 h) or "over a day". The
  top band is open because nothing past a day changes what the analyst does: they run it
  elsewhere or choose the sampled method. A band that covered six minutes and three days would
  misstate both. A clock time appears only when a run of that
  algorithm on this device and engine has been measured and recorded in graphty-element's cost
  model; a benchmark from another machine does not count.
- **Undo restores stored values and never recomputes.** A seeded or GPU-computed run may not
  reproduce the same digits, and an undo that recomputed would show new numbers under an old
  name.

**Rules out.**

- Gephi's behavior of computing on a filter without recording that scope, which mixes values from
  two graphs in one column (`research/key-insights.md` 3.1).
- A filtered overview that reads "Nodes: 1,204" with nothing on screen saying it is filtered.
- Freshness shown only in a status bar, as in Excel's manual-calculation mode, where readers
  cannot tell from the number whether it is current (`research/key-insights.md` 3.3).
- Desaturating the canvas to mean "out of date": on a graph, the canvas color usually is the data.
- A PageRank that did not converge shown with no mark, or with the estimate's "~".
- A clock time such as "~90 s" from a cost model that has never been measured on this device.

**Decides.** After a filter changes, a held statistic keeps its scope, says "on: 5,310 nodes",
and offers "Run on filtered graph". Nothing reruns on its own. Import facts (direction, weight
role, negative weights, self-loops, parallel edges) are values of the graph's overview. A weight
whose role has not been set reads "weight: unknown" with its inline role control; no role is
guessed (`glossary.md` 11). A non-zero count of self-loops, parallel edges or negative weights
gets its own row; at zero there is no row. Absence can be trusted because the overview is always
computed, so "not checked" never occurs.

**Test.** Apply or change a filter and run nothing. Does the chip name it, does every value whose
scope differs from the chip's say so at its smallest container, and can a reader tell each value's
freshness, variant and exactness without asking? Export a figure or copy table rows: does it
carry its scope? Copy one value: is it the bare number?
Is any mark on screen missing from the closed list of marks (`glossary.md` 10), or does one word
there serve two caveat kinds? Does a band word fall outside its range, or a clock time appear
with no measured run behind it?

**Source.** graphty's own: Figma's properties are authored by the user and are never computed, so
Figma never needed this. The inspection pattern -- a value read together with its context and its
chain back to the source -- is adapted from Figma's Dev Mode variable details (`research/figma.md`,
follow-up on derived values). Freshness and run parameters have no Figma precedent; the precedent
is Gephi's and Cytoscape's result columns. Workflow evidence: "Hub Gene Identification and
Ranking" records weight and direction for every run; "Enrichment Map - Pathway Similarity
Network" requires the creation parameters and cutoffs in the exported report.

---

## 2. The method named is the method run, even over a faster default

**Means.** Figma's long operations are plugin runs: one at a time, one toast, a Cancel control
(`research/figma.md` 4.9). graphty's are routine: exact betweenness took 91 s at 10,000 nodes in
graphty-element's benchmark (`research/graphty-today.md` 7.23), and all-pairs work (diameter,
average path length, exact closeness) is far worse. The tempting answer is to sample by default
on large graphs. graphty does not.

- **Exact is the default, at every size.** NetworkX, igraph and Gephi compute exact values unless
  asked to sample, and analysts check graphty against them.
- **A cheaper method is offered, never swapped in.** A menu shows one row per algorithm; its
  variants are a submenu of that row (Figma's chevron row). On an inspector or a run control the
  variant is a split button (Figma's Boolean operations, `research/figma.md` 4.12). The palette
  lists "Betweenness (sampled)" by name. A sampled run's output is a separate result and never
  becomes the current run of an exact result, so no layer, column or rule bound to "Betweenness"
  silently changes to estimates.
- **The cost shows before the run.** A command expected to take 10 s or more -- Nielsen's limit
  for keeping attention (https://www.nngroup.com/articles/response-times-3-important-limits/) --
  shows its band word (principle 1). A cheaper command shows nothing. The estimate comes from
  graphty-element, never from the app; where the command row puts it is the component spec's
  decision.
- **An act that replays runs shows their combined cost first.** Replace data replays every run;
  its command carries the band word for the whole replay.
- **Long runs report as Figma's plugins do.** The earliest-started running operation has the one
  toast; rows show state only. A run started while another runs waits in start order, and its row
  says "Queued", with one exception: a run whose estimate is under a minute never waits behind a
  run estimated at "under an hour" or more. It starts beside it. Without the exception one click on
  an all-pairs command would block every cheap run behind it for hours, and the analyst in "Hub
  Gene Identification and Ranking" who starts degree, eigenvector, closeness and betweenness in a
  row would wait for the slowest before seeing the fastest. graphty-element owns the queue and
  publishes this policy (`element-contract.md` 3), so no consumer builds one. **Cancel** discards
  an analysis run, queued or running: it changed nothing and leaves no undo step. **Stop** ends a
  layout and keeps the positions it reached, as one undo step (`glossary.md` 9).

**Rules out.** A sampled default above a size threshold; a size-dependent meaning for one
command name; a sibling menu row for each variant; a run button that gives no hint it will take
five minutes; a modal "are you sure?" before a run.

**Decides.** "Betweenness" on a 10,000-node graph shows "a few minutes" until a run on this
device has been measured, and runs exact when clicked. "Diameter" on 300,000 nodes shows "hours"
or "over a day", whichever the cost model gives, and runs exact; the sampled method is chosen from the same row and produces "Diameter (sampled)"
beside the exact result.

**Test.** A command expected to take over 10 s shows no estimate, or a command runs a different
method from the one its name gives, at any graph size.

**Source.** graphty's own. The toast is Figma's; the queue departs from it because a second run
has nowhere to wait in Figma, and the analyst who computes degree, betweenness, closeness and
eigenvector centrality in a row needs one ("Hub Gene Identification and Ranking", phase 1).

---

## 3. Graph objects are the work, even over giving everything a place

**Means.** The primary objects are the graph, nodes, edges, and the objects the analyst keeps
(sets and paths); groups, found paths and matches are primary items reached through their result.
The object list holds only the kept primary objects, headed by the graph's name. Everything else is
secondary and never gets a row there:

| graphty thing                       | Its Figma analogue                                            |
| ----------------------------------- | ------------------------------------------------------------- |
| a result (a run's values and items) | a variable: a named value bound to properties                 |
| a style layer                       | shared like a local style; stacks and orders like a Fill list |
| layout settings                     | Tidy up, a one-shot arrange command                           |
| a note                              | stored like a Dev Mode annotation; read like a comment        |
| a view                              | a prototype flow                                              |
| a saved comparison                  | a saved branch review                                         |

These follow the spine in `conceptual-model.md` 1. Where each one appears on screen is the
information architecture's decision.

**Reading adds nothing to the object list.** Find, Select neighbors and a comparison end as a
selection, a drawing or an inspector reading. A run, including each path query, is recorded under
its result, a kept secondary record. Only the commands that make a set or a path (Create set,
Create path, and the set operations Union, Subtract, Intersect and Exclude) add object-list rows;
Save comparison, Save view and Add note make kept secondary things.

**Rules out.** A list where "PageRank run 3" sits next to "Suspicious accounts"; notes or views
listed beside sets; a path query adding an object-list row; a layers tree of 10,000 node rows.

**Decides.** The object list stays short at any graph size. Individual nodes are reached through
the table, find and the canvas.

**Test.** The object list contains a row, other than the graph heading, whose kind is not set or
path, or a row that appeared as a side effect of reading, running or searching. (A set opened from
a project file or converted from an attribute passes.)

**Source.** Adapted from Figma: "everything is an object with properties", and Find ends as an
ordinary selection with nothing saved (`research/figma.md` 1.1, 4.3). Lee et al.'s graph task
taxonomy supplies the object types (`research/graph-analysis.md` 1.1).

---

## 4. The field's standard terms, even over friendlier words or Figma's words

**Means.** Graph and statistics terms take the field's names, spelled as `glossary.md` section 2
rule 1 says (NetworkX, igraph, Gephi, Cytoscape and Newman's "Networks"), in the forms listed in
`glossary.md` section 12: betweenness, degree, in-degree, PageRank, connected components,
strongly connected components, k-core, modularity, density, transitivity, average clustering,
local clustering coefficient, average path length.

- "Group" names a part of a partition, a cover or a categorical attribute, never a container or a
  command. Community, component and cluster are kinds of group and never synonyms for each other
  (`glossary.md` 14).
- The (i) defines, in at most two sentences: the definition and, where it matters, the common
  misreading. It never recommends or suggests an alternative; an alternative is a caveat's verb.
  Friendly synonyms and the catalogue's retired plain names become command-palette aliases, so
  typing "bridging" finds betweenness (`glossary.md` 15).
- Where a Figma word collides with a graph word, the graph meaning wins. "Component" never means
  Figma's reusable symbol.
- A standard term is never shortened to fit a row ("3 weak", "In | Out"), and so it is exempt
  from the per-row word cap. It still counts toward every other budget in principle 5.

**Rules out.** "Brokers", "Influence", "Bridging" or any other interpretive rename; shortening
"average path length" or "weakly connected components" to fit the row cap; an (i) that says "use
harmonic centrality instead".

**Decides.** Ctrl+G keeps Figma's key but runs Create set, which re-parents nothing: a set has
members, not a parent. Ctrl+Shift+G (Figma's Ungroup) deletes the selected set and leaves its
members as the selection, as Ungroup leaves the former children selected (the study records the
key, not the after-state: `design/ui/figma/flows.md`). Ctrl+Alt+G (Figma's Frame selection) is
left unbound: graphty has no frame, and a second key for Create set matches nothing in Figma.

**Test.** A graph or statistics term on screen that is not the form `glossary.md` 12 gives, a
standard term abbreviated or replaced to fit a row, or an (i) that recommends.

**Source.** Adapted from Figma's "natural mental models": an analyst's natural model is the
field's vocabulary, the word in the paper they will cite.

---

## 5. The data speaks, even over the app explaining itself

**Means.** Principles 1, 2 and 4 each license more on screen than Figma's thin panels carry, and so
does workflow evidence (the graph's Statistics). This principle is the budget that still binds
after they do. Most words on screen are the analyst's: attribute names, values, counts. **App
text** is every visible string that is not a user's attribute name, object name or value, counted
by the method in `research/figma.md` (follow-up on words for one selected object): headings,
labels, state words and verbs count; values, counts and names do not; standard terms count; each
(i) icon visible at rest counts as one word. Every visible app string counts, wherever it is:
panels, toolbar, header, the filter chip, the status line, legend titles (a legend's category
values are data). Budgets are measured with "Additional labels" off.

- **A selected object's inspector:** about 30 words of app text, 40 at most, and at most 3 words
  per section heading or row name. In seven Figma captures of a selected object the counts ran 18
  to 38, median 32 (`research/figma.md`, follow-up on words for one selected object). Commands and
  state lines follow `glossary.md` 3's verb-plus-object rule instead of the row cap.
- **The whole screen at rest**, with a graph loaded and nothing selected: at most 50 words. Figma's
  two panels at rest carry 16 to 19 (`research/figma.md`, follow-up on the nothing-selected
  state). The 50 divides as: the left panel 8, Figma's measured count and a limit the information
  architecture must meet with graphty's rail and object list; the graph's inspector about 32,
  Figma's resting inspector (about 11) plus the Statistics departure; and 10 for the header, the
  toolbar, the filter chip, a legend title and the status line. The graph's inspector at rest has
  at most four sections, Figma's three plus Statistics; a fifth needs its own departures row.
- **Targets at rest.** Words are not the only clutter. Every control that answers a click at rest
  counts one target (a button, a link, a swatch, a chart, a number that routes); a control shown
  only on hover does not. The inspector column at rest, its two header rows included, carries at
  most 32: Figma's measured column carries 24 (`design/ui/figma/right-sidebar-selection/dump-nothing-selected.txt`),
  and outside Statistics graphty's may carry no more than Figma's; the Statistics section is the
  recorded departure. The toolbar and the rail never carry more targets than Figma's (17 and 6).
- **Going over.** Only a caveat that principle 1 requires may raise a budget, in the open, with a
  ledger row naming it. A row that is only a reading goes behind "N more"; a standard term is
  written in full and something else moves.
- **Rows:** dense status leads with at most six headline readings, and a list shows three or four
  rows before "N more", as Figma's inspector does (`research/figma.md` 4.14, 4.15). Principle-1
  mark rows (a non-zero import count, "weight: unknown") sit outside the six.
- **Menus:** one row per algorithm; variants are its submenu.
- **The empty screen**, with no graph: at most the same 50, modeled on Figma's file browser, which
  opens on recent files (https://help.figma.com/hc/en-us/articles/14381406380183-Guide-to-the-file-browser).
  Recent projects, then sample graphs, each by name and thumbnail, three or four before "N more",
  and one Open command that also accepts a dropped file. A sample's name is the dataset's short
  common name, at most 3 words ("Karate club", "Les Miserables"); its node count is data, and any
  description is under its (i).
- **Nothing appears unasked except a closed list:** marks, the state line, the one run toast
  (name, progress, Cancel or Stop), the filter chip, and a value that changed. Nothing depends on
  how often the analyst has seen, used or dismissed a piece of interface: no first-run-only
  interface, coach marks or dismiss-once cards. A list of things that exist, such as recent
  projects, is content, not interface, and may be empty on first use.
  Every empty surface -- the table, search results -- is its title and at most one command, with
  no sentence. An inspector section with nothing in it is absent, as Figma draws no section a
  selection lacks; Export alone keeps its heading and "+" at rest, as Figma's does. The object
  list, which is never titled, is simply blank when nothing is kept, as a new Figma file's Layers
  panel is.
- **The canvas, in every state,** carries no app text except marks at values, the legend and the
  status line. Hovering a node or edge shows at most its label, which is data; its values belong
  in the inspector, as in Figma, where hover draws an outline and nothing else.
- **One (i) per term per surface**, at the term's defining site (a column header, a result's
  name, a command row), never repeated per value or per row.
- No sentences under results, no suggestion cards, no "Coming" tags, no placeholder content.

**Rules out.** A "Getting started" or welcome panel; sample cards with descriptions; tip toasts,
coach marks and "What's new" dialogs; help paragraphs in panels; hover cards of values; "Additional
labels" on the toolbar (it is in the view menu, and it adds only names of fields and
icon-only buttons, never descriptions).

**Decides.** The first version of the graphty app carried 254 words on screen after a load, 136
of them in the right panel and 76 in suggestion cards on the canvas
(`tmp/ux-review/graphty-vs-figma-ux.md`, "What each app shows, and when"). Both are cut to the
budgets above. The graph's inspector at rest is cut to six headline readings and one Attributes
row (worked conflict below).

**Test.** Count the app text of each inspector, of the whole screen at rest and of the empty
screen; the sections at rest; the headline readings and the rows before "N more"; the (i) icons
per term; and the menu rows per algorithm. Look for anything that appears without being asked
and is not on the closed list, and for any interface whose presence depends on how often the
analyst has seen, used or dismissed it.

**Source.** From Figma: "Center your ideas, not Figma's UI", and its measured word and section
counts (`research/figma.md` 1.1, 1.2, 4.8 and the word-count follow-ups).

---

## 6. The drawing stays where the analyst left it, even over a better layout

**Means.** Arranged positions -- those a force or other arrangement layout, a drag or a pin
produced -- change only when the analyst acts: a layout run, a drag, a pin. A layout starts from
the current positions unless Fresh layout is chosen; an element that enters the filtered graph is
placed near its placed neighbors; pins hold; a view stores its positions, so re-laying out never
changes a saved picture (`conceptual-model.md` 5.2).

- **A position that encodes an attribute is an encoding, not an arrangement.** An axis set from
  year or a tier follows its attribute as a style layer follows its data, as Figma's auto layout
  follows its property (`conceptual-model.md` 5.2, 7.2). This principle does not govern it.
- **The first placement of nodes that were never placed is not a move.** Opening a file without
  stored positions, or entering 3D for the first time, runs the layout that command implies; it is
  recorded with its seed like any layout run.

**Rules out.** A force layout that keeps reflowing as filters and data change; a fresh random
layout by default on every run; a whole-graph re-layout when Select neighbors adds one node.

**Decides.** Replace data keeps every arranged position and places new nodes incrementally, so a
graph watched over time keeps its shape from one version to the next. A force layout computed on
an earlier data version carries no mark: an arranged position is never read as a number
(`conceptual-model.md` 5.2), so it states no value to misstate, a mark would sit permanently on
every graph watched over time, and a fresh layout is one command away.

**Test.** Change a filter, grow the selection with Select neighbors, or Replace data. Did any
existing unpinned node with an arranged position move without a layout command?

**Source.** graphty's own, with Figma's split: Figma never moves objects the user placed, and its
auto layout, where position follows a property, reflows live. Archambault and Purchase find that
positions that jump do not make answers wrong but cost the reader their place
(`research/design-method.md` 3.6). The owner's use case of watching a graph over time depends on
it.

---

## The ranking, and why it is in this order

- **1 over 5:** a caveat is data, not help. A value that looks exact when it is not is wrong
  until someone hovers. Principle 1 decides which marks exist; principle 5 decides their form,
  and only a principle-1 caveat may raise a budget.
- **2 over 5:** the band word adds words to a menu and the variant adds a submenu, and both stay.
  Principle 5 still decides the form: one row per algorithm.
- **4 over 5:** the budget caps the app's own words, never the length of the field's names.
- **1, 2, 3, 4 and 6 over the baseline**, each only through a departures row: the paved path is
  right about how to manipulate things and silent on whether a reading is true, what it costs,
  what graph objects are, what graph terms mean and how a computed drawing moves.

No other pair has met in a real conflict, so those pairs are unranked, 3 and 5 included: the
graph's Statistics at rest are forced by workflow evidence, not by principle 3. A new conflict is
worked here and added to the ledger.

## Worked conflicts

### The graph's inspector at rest (workflow evidence against the baseline, form by 4 and 5)

Figma's page inspector is thin; top task 1 (understanding the whole graph) makes the graph's
Statistics the first thing read, so they sit here as a recorded departure. The heaviest ordinary
case: a directed graph with 8 attributes, a weight attribute of unknown role, and a filter on.
Laid out literally -- every reading in top task 1 as a row, two degree histograms, a line per
attribute with type, profile and controls -- it counts about 50 words and ten headline rows. The
resolution keeps every reading one step away and puts six at rest:

```
Statistics
Nodes                                       1,204
Directed edges                    3,877 of 16,020
Density                                0.0027 (i)
Weakly connected components     3 (2 isolates) (i)
Strongly connected components               17 (i)
Degree distribution (i)             [sparkline]
weight: unknown (i)
9 more
Attributes                                      8
<section 2>                                     +
<section 3>                                     +
<section 4>                                <verb>
```

Counted: "Statistics" 1; Nodes 1 (the chip carries "of 5,310", so the row does not repeat it);
"Directed edges" and "of" 3 (the chip says nothing about edges); Density 2; the weak components
row 5 (the term, "isolates", the (i)); the strong components row 4; the degree distribution 3;
"unknown" and its (i) 2 ("weight" is the attribute's name); "more" 1; Attributes 1: **23** for
the Statistics. The other three sections are the information architecture's to choose, and they
may carry at most 9 app words between them, which brings the inspector to its **32**. Figma's
three resting sections carry 4 to 8 (Page, Styles, Export and its button, plus "Show in exports"
and "Preview"; `research/figma.md`, follow-up on the nothing-selected state). The budget leaves no room for a list of results or of views here beyond
a heading and "+"; the information architecture must show where each has a findable home under
principle 3, this four-section cap and the rail rule. The headline readings are nodes, edges, density, the two component counts and the degree
distribution. On an undirected graph the two component rows are one, "Connected components" with
its isolates, so five readings show and the strong row's 4 words go. "weight: unknown" is a
principle-1 mark row outside the six and disappears once a role is set. Without the filter and
the mark, the Statistics come to 20 on a directed graph and 15 on an undirected one; the
information architecture counts the rest (`information-architecture.md` 13).

What the budget forced, and where it went: principle 4 writes both component terms and both
degree terms in full, so the direction and weight line folds into the edges row's name and the
weight's mark row; the largest component's share and the second-level graph statistics sit behind "N more" (the share is also in the
components row's tooltip). An attribute's detected type, weight role, completeness and profile are read and
corrected at its column header in the table; the Attributes row opens the table and carries a
mark when an attribute's import departs (a weight read as text). At rest the degree distribution is
a sparkline of total degree with no toggle; its row opens the attribute histogram on degree, whose
variant row chooses in, out or weighted. A non-zero self-loop, parallel-edge or negative-weight
count adds a mark row of 1 or 2 words; all three at once take the inspector to about 37, over 32,
which principle 1 allows in the open (ledger).

The whole screen at rest: at most 8 in the left panel, 32 here, 4 for the chip at its longest
("Working", "set", "of", "nodes"; "Filtered: ... of ... nodes" is 3), 1 for the view-mode button:
**45**, leaving 5 for whatever the information architecture puts in the header and the toolbar,
a legend title and the status line.

### The heaviest result editor (1 against 5)

A result is a definition, as a Figma variable is (principle 3): clicking its row opens its editor
in a popover to the left of the inspector, the canvas selection stays, and Escape closes the
popover only (`research/figma.md` 4.13 and 5.5). A result never becomes the selection, so the
analyst reads a result without losing the nodes they were reading it against. The popover is the
result's only surface, so it takes a selected object's budget: about 30 words, 40 at most. The
case: a sampled betweenness result, out of date, on a scope other than the chip's. Principle 1
decides which marks exist; principle 5 decides their form.

```
Metric (i)                               Re-run
Betweenness (sampled)
Out of date - on: 5,310 nodes            Details
Attributes
  betweenness      ~0.000 to 0.412
Appearance
  Color            betweenness
Used by
  2 style layers, 1 set
```

Counted: type row 2 ("Metric" and its (i)); "(sampled)" 1 (the name is not counted); the state
line with its verb and Details 7; Attributes 3 (heading, label, "to"); Appearance 2; Used by 5: **20**. A result has no Notes
section, because a note never targets a result (`conceptual-model.md` 6); Add note in the
popover's menu writes a note on the selection that cites this run. "Compare with..." is in the
popover's menu too, not at rest. A run that read the weight other than as declared adds a variant word to the name, about

1. The state line belongs to the run and appears once, however many attributes the run wrote;
   each further attribute adds about 2.

### Diameter on 300,000 nodes (2 against 5)

Sampling by default would keep the overview fast and the menu short. Principle 2 wins: "Diameter"
runs exact and shows its band, "hours" or longer, while cheap runs started after it do not wait
for it. Principle 5 keeps the menu at one row: the sampled method is the
row's submenu and produces "Diameter (sampled)", a sibling result. Principle 1 fixes the form of
the band word: a band until a run on this device has been measured.

### Figma's Ctrl+G (4 against the baseline)

The baseline says keep Figma's shortcuts. Figma's Ctrl+G wraps the selection in a Group parent.
Principle 4 keeps "group" for a part of a partition, never a container. Result: the key stays and
runs Create set, nothing is re-parented, Ctrl+Shift+G deletes the selected set and selects its
members as Ungroup does, and bare "group" in the palette finds the Groups listing under a
partition result first and Create set second.

## Conflict ledger

| Conflict                                                                     | Settled by                             | Outcome                                                                                                                                                                         |
| ---------------------------------------------------------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Statistics computed on a filter without recording it (Gephi)                 | 1                                      | The value keeps its scope and marks it                                                                                                                                          |
| A filtered overview with no mark                                             | 1                                      | The header chip names the filter                                                                                                                                                |
| The filter named at the top of five surfaces at once                         | 1, form by baseline                    | One chip, Figma's zoom-control pattern; scope marked only where it differs                                                                                                      |
| The filtered node count on the chip and the Nodes row                        | 1, form by 5                           | The chip carries "of N" for nodes; the Nodes row shows the count alone, because the chip states the number itself and a mode word far from the number is what goes unread       |
| "Of N" on every overview count against the chip alone                        | 1, form by 5                           | Only edges carry "of"; the chip states the node count (overrules `research/figma.md` 5.6, contradiction 12)                                                                     |
| A run on a working set marking "working set" on every value                  | 1, form by 5                           | The chip reads "Working set"; runs on it carry nothing more                                                                                                                     |
| A node's degree in its inspector against a degree-sized layer after a filter | 1                                      | The live reading follows the chip; the bound layer is a run and marks its scope                                                                                                 |
| Out of date and a different scope at once                                    | 1, form by 5                           | One line, two tokens                                                                                                                                                            |
| A second "record line" beside the state line                                 | 1, form by 5                           | One line; engine, seed, sampler and weight attribute under Details                                                                                                              |
| A bare "Components" on a directed graph                                      | 1                                      | The variant is part of the name                                                                                                                                                 |
| A PageRank that did not converge                                             | 1                                      | Its own mark word at the value, never "~"                                                                                                                                       |
| A weight role guessed from the column name                                   | 1                                      | "weight: unknown" with its role control                                                                                                                                         |
| "No self-loops, parallel edges or negative weights" on every clean graph     | 1, form by 5                           | No row at zero; a row when non-zero                                                                                                                                             |
| Import-count rows pushing the resting inspector past 32                      | 1 over 5                               | Allowed in the open; the rows sit outside the six readings                                                                                                                      |
| Missing values hidden on a clean load                                        | 1 over 5                               | One mark on the Statistics Attributes row, "Attributes: 3 incomplete", only while an attribute has missing values                                                               |
| "~90 s" from an unmeasured cost model                                        | 1                                      | A band word until a run on this device is measured                                                                                                                              |
| The "~" mark against the word budget                                         | 1, form by 5                           | "~" at the value; detail under Details                                                                                                                                          |
| Sampled as the default above a size threshold                                | 2 over 5                               | Rejected; exact at every size, sampled beside it                                                                                                                                |
| A sampled row beside every expensive command                                 | 2 over 5                               | One row per algorithm; the variant is its submenu                                                                                                                               |
| A sampled run tuning the exact result                                        | 2                                      | A sibling result, never the current run                                                                                                                                         |
| A second long run while one runs                                             | 2 over baseline                        | Queued on its row; one toast                                                                                                                                                    |
| A cheap run queued behind a run of hours                                     | 2                                      | A run under a minute starts beside a run of "under an hour" or more; long runs wait in start order                                                                              |
| One band word for six minutes and for three days                             | 1                                      | Bands up to "hours" and an open "over a day"                                                                                                                                    |
| The graph's full overview at rest                                            | workflow evidence, form by 5           | Six headline readings (five on an undirected graph), "N more", one Attributes row: 20 words (15 undirected), 23 in the heaviest case; at most 32 with the other sections        |
| The Results panel's family names against the left panel's 8 words            | 4 over 5                               | 17 words at rest, in the open: the field's family names are never shortened, and they are the only way to find an algorithm without its name (`information-architecture.md` 13) |
| The whole screen at open, on the Results panel, against its 50 words         | 4 and 1 over 5                         | 50 on a directed graph before a run paints; the legend title a painted run adds, which principle 1 requires, makes 51, in the open (`information-architecture.md` 13)           |
| A rank on every numeric value in a node's inspector                          | 1, form by 5                           | Only metric values show a rank, as a bare number; the denominator and scope are in the tooltip                                                                                  |
| "3 weak, 17 strong" and "In \| Out" to fit the rows                          | 4 over 5                               | Terms in full; something else moves behind "N more"                                                                                                                             |
| A path query adds a row to the object list                                   | 3                                      | Recorded as a query under its result; Create path adds the row                                                                                                                  |
| Runs listed beside sets                                                      | 3                                      | Runs sit under their result                                                                                                                                                     |
| "Brokers" instead of betweenness                                             | 4                                      | Palette alias only                                                                                                                                                              |
| An (i) that recommends harmonic centrality                                   | 4                                      | The (i) defines; the alternative is the one verb of the precondition mark, and shows on the run control before a run                                                            |
| A result given its own selected-object inspector                             | baseline, form by 5                    | A result is a definition: its row opens an editor popover, within a selected object's budget, and the canvas selection stays                                                    |
| A copied value carrying its scope against pasting into a spreadsheet         | baseline                               | One value copies the raw number, as Figma's Inspect does; copied rows and exports carry the scope in headers and titles                                                         |
| 3-word row cap against "average path length"                                 | 4 over 5                               | Never shortened; still counted                                                                                                                                                  |
| Ctrl+G makes a "Group"                                                       | 4 over baseline                        | Key kept; runs Create set; Ctrl+Alt+G unbound                                                                                                                                   |
| Help text under PageRank                                                     | baseline                               | The (i) instead                                                                                                                                                                 |
| A sample gallery with descriptions on the empty screen                       | 5                                      | Recents, then samples, by name and thumbnail                                                                                                                                    |
| A first-run coach mark or tip toast                                          | 5                                      | Rejected; the (i) and the palette instead                                                                                                                                       |
| Values in a hover card on the canvas                                         | 5                                      | The label only; values in the inspector                                                                                                                                         |
| `run-algorithms-on-load`                                                     | baseline                               | Removed; overview from graph attributes                                                                                                                                         |
| An axis from year after a Correct of year                                    | model rule (`conceptual-model.md` 7.2) | The axis follows, as a style layer does                                                                                                                                         |
| A live force layout reflowing on every filter                                | 6 over baseline                        | Arranged positions move only by a layout command                                                                                                                                |
| Fresh layout versus keeping positions                                        | 6                                      | Keep positions unless Fresh layout is chosen                                                                                                                                    |
| A file opened with no stored positions                                       | 6 and baseline                         | First placement is not a move; the implied layout is recorded                                                                                                                   |

## Departures from Figma

This is the single list. `conceptual-model.md` and every other framework document point here.
"Ontology" means the object model in `conceptual-model.md`; "workflow evidence" names the task or
workflow that forces a departure when no principle does.

| Figma                                                                                                                     | graphty                                                                                                                                                                                                  | Forced by                                        | Evidence                                                                                                                                                                                                                                                                                  |
| ------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The page's inspector is thin: three sections, at most two fixed rows under a header                                       | with nothing selected the inspector is the graph's, adding a Statistics section of six headline readings, four sections in all                                                                           | workflow evidence, form by 5                     | understanding the overall graph is a top task (`top-tasks.md` task 1); Figma keeps dense status under a selection (`research/figma.md` 4.8, 4.15)                                                                                                                                         |
| Creating a variable binds it to nothing                                                                                   | a result's first run adds one automatic layer below the analyst's layers                                                                                                                                 | workflow evidence                                | 15 of 20 figure-producing workflows encode an algorithm's result (`top-tasks.md`, "Coloring by a value")                                                                                                                                                                                  |
| Any layer can be hidden, including a group's children (Ctrl+Shift+H)                                                      | nodes and edges are filtered, never hidden; the eye applies only to what a row draws itself (a style layer, a found path, a set's or group's hull or outline), never to members                          | 1                                                | membership is many-to-many, so a node in two sets with opposite eyes has no truthful drawing and nothing orders the two eyes; style layers that take opacity to 0 are ordered, so the stack settles every conflict between them, and each counts what it took to opacity 0 (rules, below) |
| A layers tree lists every layer                                                                                           | no tree of nodes; the object list holds only kept sets and paths                                                                                                                                         | 3                                                | tens of thousands of nodes; membership is many-to-many                                                                                                                                                                                                                                    |
| A child is listed under its parent in the tree                                                                            | a group is listed under its result, not in the object list                                                                                                                                               | 3                                                | partitions produce hundreds of groups                                                                                                                                                                                                                                                     |
| A click on a group's child selects the group                                                                              | a click always selects the element; Shift+Enter returns only to where the analyst entered from                                                                                                           | ontology (`conceptual-model.md` 4.1)             | membership is many-to-many, so there is no single parent                                                                                                                                                                                                                                  |
| Ctrl+G wraps in a Group; Ctrl+Shift+G ungroups; Ctrl+Alt+G wraps in a Frame                                               | Ctrl+G runs Create set; Ctrl+Shift+G deletes the selected set and selects its members; Ctrl+Alt+G is unbound                                                                                             | 4                                                | "group" is a graph word; the inverse keeps muscle memory; graphty has no frame (`design/ui/figma/flows.md`; `research/figma.md` 4.12)                                                                                                                                                     |
| Local styles never overlap, so no ordered rule list exists                                                                | one ordered stack of style layers, top wins each channel                                                                                                                                                 | fixed rule: appearance only through style layers | overlapping selectors need visible precedence (`research/figma.md` 5.5)                                                                                                                                                                                                                   |
| Applying a fill style replaces the fill list                                                                              | a covered automatic layer stays in the stack, switched off, marked "covered by ..."; covered automatic layers collapse into one "N covered" row                                                          | 1                                                | removing it would hide that the result was painted and then covered; four centrality runs in a row ("Hub Gene Identification and Ranking") add one row at rest, not four                                                                                                                  |
| Hovering a style row outlines nothing                                                                                     | hovering a style-layer row outlines what it paints, and its Select painted icon selects it, the target icon of Figma's own Selection colors rows                                                         | fixed rule: appearance only through style layers | selectors overlap, so "which nodes does this touch?" is a constant question (`research/figma.md` 5.5)                                                                                                                                                                                     |
| Overrides are listed only per instance                                                                                    | every override is collected in one Overrides row at the top of the style-layer stack, present once something is overridden, offering "Select overridden" and "Clear all"                                 | 1                                                | per-element bypasses visible only through a selection cause "my mapping does not work" (`research/graph-tools.md` 20.4)                                                                                                                                                                   |
| A frame's default appearance is its own fill and stroke                                                                   | the default look is the Default look row, kept at the bottom of the style-layer stack, shown when "N more" expands it, never deleted                                                                     | fixed rule: appearance only through style layers | appearance set outside the stack is invisible to the layer list and cannot be reordered, removed or persisted (`CLAUDE.md`, Graph Styling)                                                                                                                                                |
| A property row is one target: its label is inert or a scrub handle, and a bound value opens its picker from the whole row | a Statistics reading's number opens the table on what it counts, and the rest of its row opens the reading's editor                                                                                      | ontology                                         | a count is a question about elements and a reading is a definition with parameters; Figma's own Selection colors rows carry a separate target icon that selects the layers using the colour (`research/figma.md` 4, Selection colors)                                                     |
| Auto layout reflows live; Tidy up records nothing                                                                         | an arranging layout runs once over a frozen scope with a record and seed; the last run wins for the nodes it wrote; entering nodes are placed incrementally                                              | 6                                                | force layouts are stochastic and costly; a node belongs to many sets                                                                                                                                                                                                                      |
| A flow starts from a frame on the canvas                                                                                  | a view restores captured working state and carries its own export settings; exporting several views follows Figma's export of several frames                                                             | 6                                                | positions are computed, so a graph drawing has no frames                                                                                                                                                                                                                                  |
| Branch review overlays two versions                                                                                       | an overlay is offered only on aligned node positions                                                                                                                                                     | 6                                                | a node-link drawing has no fixed frame geometry                                                                                                                                                                                                                                           |
| The bottom dock holds wide tools (Motion timeline, shortcuts)                                                             | the dock also holds the attribute table, linked to the canvas selection                                                                                                                                  | workflow evidence                                | analysis reads values across hundreds of elements; multi-column lists leave the side panels (`research/figma.md` 4.14, 4.16)                                                                                                                                                              |
| Comments anchor to a canvas position or a top-level frame                                                                 | a note anchors to graph objects, can be written on the current selection, and stores no position                                                                                                         | 3, 6                                             | computed positions move at every layout; a graph has no top-level frames (`research/figma.md` 2.7)                                                                                                                                                                                        |
| No inspector lists commentary for an object                                                                               | a Notes section in each selected object's inspector or editor; the graph's own notes are the first group of the Notes panel, which keeps the resting inspector to four sections                          | workflow evidence                                | taking a note is an every-session task (`top-tasks.md` task 5); notes are read beside the object's values (`research/figma.md` 5.5)                                                                                                                                                       |
| Comments are a mode that replaces the inspector; clicking one goes to its location                                        | notes are a rail panel beside a visible inspector, grouped by target; clicking a note selects its targets                                                                                                | workflow evidence, 3                             | three of the four note-reading steps in "Fraud Ring Investigation" and "Criminal Network Analysis" need a target's live value the writer could not have quoted (`information-architecture.md` 3)                                                                                          |
| Resting-inspector rows hold properties, not commands                                                                      | the graph's Layout row carries a Run icon                                                                                                                                                                | workflow evidence                                | making the layout readable is an every-session task (`top-tasks.md` task 7) with no other home at rest                                                                                                                                                                                    |
| Flows sit in the page inspector                                                                                           | views are jumped to from the zoom menu's Views submenu and managed in a popover list                                                                                                                     | workflow evidence, 5                             | three of four view workflows navigate with them; a dark menu holds no rows with their own menus                                                                                                                                                                                           |
| Header row 2 holds the Design and Prototype tabs beside zoom                                                              | the filter chip takes the tabs' slot                                                                                                                                                                     | 1                                                | the scope a number was computed on is the most expensive error to miss                                                                                                                                                                                                                    |
| Asset rows carry no state, and every Assets tile inserts on click                                                         | a result row carries at most one state mark, and every Results row opens its editor; items are never rows there                                                                                          | 1, 3, 5                                          | a result is a definition; a row with every mark on counted 17 to 20 words                                                                                                                                                                                                                 |
| "+" adds first with defaults, configure afterwards                                                                        | a catalogue row that needs an argument, or whose cost word is "a few minutes" or longer, opens its editor unrun; several rows run together show their combined cost word first and leave such rows unrun | 2                                                | an expensive default run can cost hours; every other row runs at once                                                                                                                                                                                                                     |
| Share is the filled header button                                                                                         | Export... is, and it opens the Export dialog over the whole project with every row checked, as Figma's does; an object's Export section button names its object                                          | owner decision                                   | exporting and presenting are one task (`top-tasks.md`, Export)                                                                                                                                                                                                                            |
| Values are authored, never computed                                                                                       | freshness, scope, exactness and variant marks on values                                                                                                                                                  | 1                                                | computed values go out of date and can be estimates                                                                                                                                                                                                                                       |
| One plugin runs at a time; Figma has no queue                                                                             | a second run waits as "Queued" on its row, except that a run under a minute starts beside one of "under an hour" or more; the toast is Figma's                                                           | 2                                                | exact runs are long; "Hub Gene Identification and Ranking" starts several in a row (`research/figma.md` 4.9)                                                                                                                                                                              |
| Menu rows carry only a shortcut                                                                                           | a command expected to take 10 s or more carries a band word                                                                                                                                              | 2                                                | Figma has no routine long operations                                                                                                                                                                                                                                                      |
| The canvas carries no chrome but the toolbar and Help                                                                     | one legend in a canvas corner                                                                                                                                                                            | 1                                                | an encoding without its key misstates the value                                                                                                                                                                                                                                           |
| (as above)                                                                                                                | a status line on the canvas only while counted elements are not drawn                                                                                                                                    | 1                                                | the numbers count elements the drawing leaves out                                                                                                                                                                                                                                         |
| A multi-selection lists every shared property, with "Mixed" where values differ                                           | several selected elements list the shared values only, then one "N differ" row that opens the table scoped to the selection                                                                              | 5                                                | a node carries tens of columns, not about ten properties (`information-architecture.md` 4)                                                                                                                                                                                                |
| Lasso (Q) belongs to vector edit mode                                                                                     | Lasso sits in the Select tool's flyout                                                                                                                                                                   | ontology                                         | graphty has no vector edit mode to hold it, and selecting a region of nodes is selection                                                                                                                                                                                                  |
| The mode control is a segmented control showing every mode                                                                | one view-mode button showing the current mode, which expands to 2D, 3D, VR and AR                                                                                                                        | owner decision                                   | the toolbar must stay small                                                                                                                                                                                                                                                               |
| Every file opens on Layers                                                                                                | a project with no kept sets or paths opens on the Results panel; one that has them opens on Graph                                                                                                        | workflow evidence                                | ranking by a centrality and detecting communities are every-session tasks that start in Results, and the object list would be blank (`top-tasks.md` tasks 2 and 3; `information-architecture.md` 2, 10)                                                                                   |
| Agents is the second rail button, its panel 280 px                                                                        | the Assistant is the last rail button, its panel 280 px                                                                                                                                                  | workflow evidence                                | it appears only when a provider is configured, and a button that comes and goes must not move Graph, Results or Notes                                                                                                                                                                     |

## How every skill level is served

Everyone gets the same aids, and no feature appears for only one skill level:

- undo and working defaults, so trying anything is safe;
- the (i) on a technical term, defining it in at most two sentences, once per surface;
- tooltips that wait and give the name plus the shortcut;
- the command palette, with friendly synonyms as aliases (principle 4);
- the "Additional labels" toggle in the view menu;
- sample graphs, listed by name, and the documentation.

Marks exist because a value needs them (principle 1), not to teach; a beginner benefits as a side
effect. Warnings come from the data, not from a guess about the user: closeness on a disconnected
graph says so for everyone.

**Test.** Everything visible at rest, on the empty screen, or appearing without being asked, is
used by the intermediate analyst in a top task (`top-tasks.md`), is one of the aids above, or is
on principle 5's closed list. An element that exists because "a beginner might not know", or that
appears only the first few times, fails.

## Rules, not principles

These are fixed constraints, never traded away, so they are not ranked:

- All graph logic lives in graphty-element; the app only consumes it (`CLAUDE.md`).
- Node and edge appearance is applied only through style layers.
- An algorithm's suggested style layers paint only the elements in its own result.
- Highlights such as paths stack as edge and node style layers.
- One reserved color means "selected", and every shipped data palette is measured against it
  (`research/key-insights.md` 3.6).
- Color follows the category, never its size rank, so a category keeps its color when a filter or
  a re-run reorders the groups by size.
- Imported data is never altered silently: nothing is coerced, merged or overwritten without
  showing it; derived values get their own columns; a type correction is a recorded, undoable
  step. Test: import a file and correct a type. Is an imported column overwritten, or is the
  correction missing from undo?
- Anything counted but not drawn says so where it would be drawn (a collapsed set's count badge,
  the status line over the drawing limit); an individual node is never silently undrawn. A style
  layer that takes elements' opacity to 0 is a hide the reader chose: it has no floor, and its row
  counts what it took to opacity 0 ("412 at opacity 0").
- **The marks are closed**, and `glossary.md` 10 lists each with its screen word. They derive from
  principle 1's caveat kinds, one word per kind, and this list and the glossary's are the same
  list:
    - the state line (freshness and scope);
    - exactness: "~" for an estimate, "not converged", "first <N>" for output cut at its cap;
    - variant: a variant word in the result's name, and "weight: unknown" in the graph's
      Statistics, the graph-level form of the same caveat (the weight's reading is undeclared, so
      every weighted run names the reading it used);
    - a violated precondition: a phrase of at most three words at the value, with its one verb;
        - scope, as working state: the filter chip ("Filtered:", "Working set:"), and "filtered out" on
          a Find hit, naming the step that removed it;
    - scope, as an attribute's coverage: "<N> incomplete" on the Statistics Attributes row, because
      an attribute with missing values is read over fewer elements than the graph;
    - what is counted but not drawn, which is scope as the drawing sees it: "not drawn",
      "<N> at opacity 0";
    - a style layer's state, the state-line form on a layer's row: "covered by <layer>",
      "partly covered", "<N> covered";
    - references: Earlier run, Earlier data, "merged into <name>", "(removed)", "not computed".
      The band word is a value, not a mark. A new mark needs a new caveat kind in principle 1 and a
      ledger row.
- Notes carry their context: a note cites the runs and the filter steps in force when it was
  written, because the cutoffs a methods section must report (confidence, FDR, similarity) are
  filters, not algorithm parameters.
- Only a run declared deterministic may drop its stored values; its row then reads "Values not
  kept" and offers Restore. A run that cannot be recomputed exactly keeps its values
  (`element-contract.md` 8).
- No persona-specific features, modes or panels.
- Plain ASCII in all content.

## Decided elsewhere

- **Behavior is fixed by the kind of object, never by graph size or cost**:
  `conceptual-model.md` 7.2.
- **A path is its own kind, not a set**: `conceptual-model.md` 4.2.
- **The default scope of a run** (the filtered graph, frozen at start): `conceptual-model.md` 4.5.
- **Filtering has one meaning**; there is no display-only filter step: `top-tasks.md`.
- **Notes, their targets and citations**: `conceptual-model.md` 6.
- **Where results, notes, views and the attribute table appear, and where the filter chip
  sits**: the information architecture, which must show each has a findable home within the
  four-section cap at rest, principle 3's object list and the rule against rail panels of uneven
  weight.
- **2D as the desktop opening view** is a default backed by flat-screen studies (Greffard et al.,
  `research/graph-analysis.md` 6.9), not a truth claim. Changing graphty-element's own 3D default
  changes published behavior and is the owner's decision, listed with the other one-way doors in
  `one-way-doors.md`.
- **The run queue** (start order, the under-a-minute exception, cancelling a queued run):
  `element-contract.md` 3.
- **Contract shapes these principles depend on** -- a frozen scope reference, a freshness field,
  exact or sampled in the result id, the cost estimate, derived columns, result ids minted once,
  typed-column storage and retention -- are in `element-contract.md`.

## Sources

- `design/ui/framework/research/design-method.md` sections 3.6 and 5
- `design/ui/framework/research/figma.md` sections 1.1-1.3, 2.7, 4.3, 4.8, 4.9, 4.12, 4.14-4.16,
  5.4, 5.5 and its follow-ups on derived values, word counts, the heaviest result inspector and
  the nothing-selected state
- `design/ui/figma/flows.md` (Figma's group, ungroup and frame shortcuts)
- `design/ui/framework/research/key-insights.md` sections 2 and 3
- `design/ui/framework/research/graph-analysis.md` sections 1.1, 6.9
- `design/ui/framework/research/graph-tools.md` section 20.4
- `design/ui/framework/research/graphty-today.md` section 7.23
- `design/ui/framework/conceptual-model.md`, `glossary.md`, `top-tasks.md`, `element-contract.md`
- `tmp/ux-review/graphty-vs-figma-ux.md`
- Workflows in `design/designloom/workflows/`: "Hub Gene Identification and Ranking",
  "Enrichment Map - Pathway Similarity Network"
- Nielsen, "Response Times: The 3 Important Limits":
  https://www.nngroup.com/articles/response-times-3-important-limits/
- Figma, "Guide to the file browser":
  https://help.figma.com/hc/en-us/articles/14381406380183-Guide-to-the-file-browser
