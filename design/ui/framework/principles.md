# graphty design principles

**Job.** Settle design arguments: one baseline, six ranked principles and the fixed rules.
**Not here:** placements (`information-architecture.md`), behavior (`interaction-patterns.md`),
words (`glossary.md`). **Owner:** design professor. **Ceiling:** the README's table. **Validated
by:** the conflict ledger, where each principle wins a real conflict nothing else settles.

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

**Means.** Figma supplies graphty's **chrome grammar and interaction conventions**; graph behavior
follows graphty's own model (`conceptual-model.md`), because a graph is not a design file. Where
Figma has solved a problem of panels, rows, menus, keys or editing, graphty solves it the same way,
and the result should look and behave like Figma. This is a narrower claim than "graphty behaves
like Figma", and the honest one: sorting the departures ledger showed about eighteen graph facts
forcing well over forty differences, so a claim that Figma decides graph behavior would be false.
It covers the layout (nav rail, small bottom-center toolbar, right inspector, Quick actions, bottom
dock) and these conventions:

- selection drives the inspector; with nothing selected the inspector belongs to the graph, which
  is graphty's page;
- "+" adds first with defaults, configure afterwards;
- no confirmations: every act is one undo step, and undo is silent and exact;
- one home per capability; the context menu, main menu and Quick actions are doors to that
  home, never second implementations;
- one overlay open at a time;
- edits commit on Enter, Tab or leaving the field;
- the app never starts work unasked: opening a file shows the file. A run implied by an explicit
  command counts as asked: Open placing nodes that have no stored positions, the first entry to a
  view mode that has none, binding an always-available metric to a layer or column, Replace data
  replaying runs. At Load an overview fills only readings graphty-element maintains at O(n+m)
  cost; every other overview row reads Not computed until asked (`files-and-recipes.md` 2, the
  one statement);
- help on request: (i) icons, tooltips that wait and show the name plus the shortcut, and the
  optional "Additional labels" toggle in the view menu, Figma's own;
- the familiar keys by role: the select tool key, the Quick actions chord, Enter and Shift+Enter,
  Shift+click, marquee, Esc (the keys themselves live in the keymaps, `interaction-pattern-entries.md` 9.3).

The baseline is not ranked. It is the default that any ranked principle may override, but only
through a row in the departures ledger, `figma-crosswalk.md` 4, filed under the one forcing fact
that forces it (its section 4.0). A departure that cannot name one goes back to Figma's behavior. "Ours is clearer" is taste, not evidence. A departure changes what is
shown; the device that contains it stays Figma's: "N more", the bottom dock, a chip, a
submenu, a split button.

**Figma-fidelity review.** The baseline's test only works if someone knows Figma's behavior. Every
framework document is therefore put through a Figma-fidelity review, grounded in the study in
`design/ui/figma/` and `research/figma.md`, which asks of each difference from Figma: is it in the
departures ledger, does it name what forces it, and is the Figma comparison it relies on correct?
The review also checks each verdict in `research/figma.md` section 5 against the framework. Its
findings land in one of two places, so they can be checked: a row in the departures ledger,
or a "Superseded by <document section>" mark on the verdict it overrules. "Go back to Figma's way" is an allowed outcome, and then the framework document changes instead.

**Whose habits count.** Figma is the paved path because it is a coherent, tested pattern
language, not because the analyst knows it: no persona is a Figma user. A departure therefore
needs a fact about graphs, a WCAG criterion, or a named workflow that fails under Figma's way; on
keys and gestures, a documented convention of the analyst's own tools (Gephi, Cytoscape, NetworkX)
counts as workflow evidence; and a **platform fact**, what a browser allows (one writer per
browser store, a memory budget, the events a trackpad sends), counts too, because no design can
choose it away. That is the closed list. A rationale that rests on "a Figma user expects" is
written as "an expert editor user expects" or backed by a persona. **The target is under 40
forcing facts**, counted in `figma-crosswalk.md` 4.0 by the lint. **An owner decision is not a
forcing fact**: it is a recorded exception, listed apart in the ledger, applying to chrome only and
never to graph behavior, and a new one needs the owner's written request with its date.

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
5. one word carrying two meanings ("Actions" is both Quick actions and a prototype field);
6. promotional and first-run interface: the dismissible card in the nothing-selected inspector,
   onboarding coach marks and "What's new" dialogs.

Figma's persona-specific Dev Mode is ruled out by a fixed rule, below.

**Rules out.** Bespoke controls. The precedent is in `CLAUDE.md` ("UI Components"): the custom
contrast ring on the app shell's lock button was deleted once the fix moved into the shared
theme.

**Decides.** "+" on an empty section adds a default at once, with no dialog. Style-layer rows look
and reorder like Figma's Fill list; where they differ, the departures ledger says so. The attribute
table is multi-column and sortable, so by Figma's rule it leaves the side panels
(`research/figma.md` 4.14, 4.16); how it is opened, and how few steps it costs, is the information
architecture's decision, checked against the rank of the tasks it serves (ranking by a centrality
is that table sorted). `run-algorithms-on-load` is removed.

**Test.** An interaction that differs from Figma and has no row in the departures ledger; or any
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
  5,310 nodes"), visible
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
  (an estimate, a bound such as "at least" for a sampled diameter, a method that did not converge,
  output cut at its declared cap); variant; and a violated precondition of the algorithm (a
  topological sort on a graph with cycles). A corrected default is a variant, not a violated
  precondition: closeness on a disconnected graph uses the Wasserman-Faust correction and says so
  in its name (`graph-conventions.md` 2). Anything else is
  help, and principle 5 governs it.
  - Scope and freshness take the **state-line form**: the one line beside a result, at most two
    tokens, first its status or freshness, then its scope when that differs from the chip's
    ("Out of date, on: 5,310 nodes", the template of `content-design.md` 4). It offers the one verb that resolves its first token and
    ends in Details, which opens the full record (`conceptual-model.md` 7.1, 7.2). There is no
    second line.
  - Exactness, variant and a violated precondition take the **mark form**: one glyph or at most
    three words at the value or the name, each kind with its own word so that no two read alike.
    The estimate mark "~" sits at every estimated value ("~0.412"), in a sorted table and in the
    legend too. A mark carries no verb, with one exception: a violated-precondition mark opens,
    on click, its one verb, the alternative method that does not have the precondition
    ("Strongly connected components" for a topological sort on a scope with cycles). The mark is a
    control, so the verb costs no words at rest. A variant can carry the same one verb: "closeness
    (WF-corrected)" offers Harmonic centrality from its variant word.
  - **A precondition known before a run shows before it**, as a mark on the run control beside
    the cost band, with the same one verb. graphty-element checks it with its detected-properties
    read over the scope (`element-needs.md`, "A detected-properties read"), which costs O(n+m), so
    the check starts no run.
- **The variant is part of the name.** Weakly or strongly connected components, in-degree or
  out-degree, directed or undirected edges, a sampled method ("Betweenness (sampled)"), and a run
  that reads the weight other than as its declared role are always named, because a bare
  "Components: 1" on a directed graph can be a wrong number.
- **Provenance is not a caveat.** The engine, the seed, the sampler and the weight attribute are
  under Details. An exact value is the same number on CPU and GPU; if an engine's precision
  changes the digits shown, that is an exactness caveat and is marked as one. graphty-element
  states its engine once for the session, as `CLAUDE.md` requires, not on every value.
- **A cost estimate is a value too.** It is a band word, from the one list in `glossary.md` 10.
  The top band is open because nothing past a day changes what the analyst does: they run it
  elsewhere or choose the sampled method. A band that covered six minutes and three days would
  misstate both. A clock time appears only when a run of that
  algorithm on this device and engine has been measured and recorded in graphty-element's cost
  model; a benchmark from another machine does not count.
- **A color or a size means only what the analyst or an applied recipe chose.** Nothing paints by
  itself: an overview never paints at Load (`files-and-recipes.md` 2), and a reader preference
  never decides what a project looks like, because two readers of one file would then see two
  pictures and read two meanings.
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
and offers Re-run, which runs on the filtered graph. Nothing reruns on its own. Import facts (direction, weight
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
  variant is a split button (Figma's Boolean operations, `research/figma.md` 4.12). Quick actions
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
  layout and keeps the positions it reached, within the Run layout step (`glossary.md` 9).

**Rules out.** A sampled default above a size threshold; a size-dependent meaning for one
command name; a sibling menu row for each variant; a run button that gives no hint it will take
five minutes; a modal "are you sure?" before a run.

**Decides.** "Betweenness" on a 10,000-node graph shows "a few minutes" until a run on this
device has been measured, and runs exact when clicked. "Average path length" on 300,000 nodes, a
genuinely all-pairs reading, shows "hours" or "over a day", whichever the cost model gives, and
runs exact; the sampled method is chosen from the same row and produces "Average path length
(sampled)" beside the exact result. (Exact diameter by iterated sweeps usually finishes in a few
breadth-first passes on sparse graphs, so it is not the example.)

**Test.** A command expected to take over 10 s shows no estimate, or a command runs a different
method from the one its name gives, at any graph size.

**Source.** graphty's own. The toast is Figma's; the queue departs from it because a second run
has nowhere to wait in Figma, and the analyst who computes degree, betweenness, closeness and
eigenvector centrality in a row needs one ("Hub Gene Identification and Ranking", phase 1).

---

## 3. Graph objects are the work, even over giving everything a place

**Means.** The primary objects are the graph, nodes, edges, and the objects the analyst keeps
(sets and paths); groups and found paths are primary items reached through their result. The
object list is the Graph panel's Sets and paths section, and holds only the kept sets and paths;
the panel's separate Graphs and Views sections pass, because each lists one kind of its own. Everything else is a
supporting object (`conceptual-model.md` 1.3) and never gets a row there; what each maps to in
Figma is `figma-crosswalk.md` 1 and 2, the one table of those mappings.

These follow the spine in `conceptual-model.md` 1. Where each one appears on screen is the
information architecture's decision.

**Reading adds nothing to the object list.** Find, Select neighbors and a comparison end as a
selection, a drawing or an inspector reading. A run, including each path query, is recorded under
its result, a kept secondary record. Only the commands that make a set or a path (Create set,
Create path, and the set operations Union, Subtract, Intersect and Exclude) add object-list rows;
Save comparison, Save view and Add note make kept secondary things.

**Rules out.** A list where "PageRank run 3" sits next to "Suspicious accounts"; notes or views
as rows of the Sets and paths section; a path query adding an object-list row; a layers tree of 10,000 node rows.

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
  Friendly synonyms and the catalog's retired plain names become Quick actions aliases (`glossary.md` 16), so
  typing "bridging" finds betweenness (`information-architecture.md` 7).
- Where a Figma word collides with a graph word, the graph meaning wins. "Component" never means
  Figma's reusable symbol.
- A standard term is never shortened to fit a row ("3 weak", "In | Out"), and so it is exempt
  from the per-row word cap. It still counts toward every other budget in principle 5.

**Rules out.** "Brokers", "Influence", "Bridging" or any other interpretive rename; shortening
"average path length" or "weakly connected components" to fit the row cap; an (i) that says "use
harmonic centrality instead".

**Decides.** The group chord keeps Figma's key but runs Create set, which re-parents nothing: a
set has members, not a parent. The ungroup chord deletes the selected set and leaves its members
as the selection, as Ungroup leaves the former children selected (`design/ui/figma/flows.md`). The
frame chord is left unbound: graphty has no frame.

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
(i) icon visible at rest counts as one word. A word is a run of characters between spaces; a count
("1,204"), a rank ("#3") or a legend's category value is data and counts zero, and a mark or label
word ("on:", "~", "Filtered:") counts one; `content-design.md` 7 is the method that measures it.
Every visible app string counts, wherever it is:
panels, toolbar, header, the filter chip, the not-drawn line, legend titles (a legend's category
values are data). Budgets are measured with "Additional labels" off.

- **A selected object's inspector:** about 30 words of app text, 40 at most, and at most 3 words
  per section heading or row name. In seven Figma captures of a selected object the counts ran 18
  to 38, median 32 (`research/figma.md`, follow-up on words for one selected object). Commands and
  state lines follow `content-design.md` 3's verb-plus-object rule instead of the row cap.
- **The whole screen at rest**, with a graph loaded and nothing selected: at most 50 words. Figma's
  two panels at rest carry 16 to 19 (`research/figma.md`, follow-up on the nothing-selected
  state). The 50 divides as: the left panel 8, Figma's measured count and a limit the information
  architecture must meet with graphty's rail and object list; the graph's inspector about 32,
  Figma's resting inspector (about 11) plus the Statistics departure; and 10 for the header, the
  toolbar, the filter chip, a legend title and the not-drawn line. The graph's inspector at rest has
  at most three sections plus Statistics, as Figma's resting inspector has three; which they are,
  and the counts at rest, are `interface-specification.md` 4.1 and 4.1a.
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
- **State words:** a new state word joins `glossary.md` 10 only when the comprehension test tells
  it apart from its nearest neighbor (Earlier run from Earlier data, Changed since applied from
  Data changed since applied), because a weekly analyst reads every state word a screen can show,
  and ten row states are already more than any one screen should need.
- **The empty screen**, with no graph: at most the same 50, modeled on Figma's file browser, which
  opens on recent files (https://help.figma.com/hc/en-us/articles/14381406380183-Guide-to-the-file-browser).
  Recent projects, then sample graphs, each by name and thumbnail, three or four before "N more",
  and the commands of `interface-templates.md` 19 (Open, which also accepts a dropped file, and
  Connect to data source, the conflict ledger's row below). A sample's name is the dataset's short
  common name, at most 3 words ("Karate club", "Les Miserables"); its node count is data, and any
  description is under its (i).
- **Nothing appears unasked except a closed list:** marks, the state line, the one running notice
  (name, progress, Cancel or Stop), the filter chip, a value that changed, and a failed autosave. Nothing depends on
  how often the analyst has seen, used or dismissed a piece of interface: no first-run-only
  interface, coach marks or dismiss-once cards. A list of things that exist, such as recent
  projects, is content, not interface, and may be empty on first use.
  Every empty surface follows `content-design.md` 4, the one statement of it. An inspector section
  with nothing in it is absent, as Figma draws no section a
  selection lacks; Notes is absent until a note targets the object, and is reached by the Note tool
  or Add note, as Figma keeps comments out of its right panel. Export alone keeps its heading and
  "+" at rest, as Figma's does, with one setting row per export setting added. The Sets and paths
  section keeps its header and "+" and is otherwise blank when nothing is kept, as a new Figma
  file's Layers panel is.
- **The canvas, in every state,** carries no app text except marks at values, the legend, the
  not-drawn line and the canvas state cards (first-load progress, rendering lost, canvas not
  available; `state-matrix.md` 3). Hovering a node or edge shows at most its label, which is data; its values belong
  in the inspector, as in Figma, where hover draws an outline and nothing else.
- **One (i) per term per surface**, at the term's defining site (a column header, a result's
  name, a command row), never repeated per value or per row.
- No sentences under results, no suggestion cards, no "Coming" tags, no placeholder content.

**Rules out.** A "Getting started" or welcome panel; sample cards with descriptions; tip toasts,
coach marks and "What's new" dialogs; help paragraphs in panels; hover cards of values; "Additional
labels" on the toolbar (it is in the view menu, and it adds only names of fields and
icon-only buttons, never descriptions).

**Decides.** The first version of the graphty app carried several times these budgets after a
load, most of it in the right panel and in suggestion cards on the canvas; both are cut to the
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
the current positions unless a fresh start is chosen on Run layout's start field; an element that enters the filtered graph is
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

The budget checks behind the conflict ledger's hardest rows (the graph's inspector at rest, the
heaviest result editor, diameter on 300,000 nodes, Figma's group chord) are worked in
`research/principles-worked-conflicts.md`; their outcomes are the ledger rows below.

## Conflict ledger

| Conflict | Settled by | Outcome |
|---|---|---|
| Statistics computed on a filter without recording it (Gephi) | 1 | The value keeps its scope and marks it |
| A filtered overview with no mark | 1 | The filter chip names the filter |
| The filter named at the top of five surfaces at once | 1, form by baseline | One chip, Figma's zoom-control pattern; scope marked only where it differs |
| The filtered node count on the chip and the Nodes row | 1, form by 5 | The chip carries "of N" for nodes; the Nodes row shows the count alone, because the chip states the number itself and a mode word far from the number is what goes unread |
| "Of N" on every overview count against the chip alone | 1, form by 5 | Only edges carry "of"; the chip states the node count (overrules `research/figma.md` 5.6, contradiction 12) |
| A node's degree in its inspector against a degree-sized layer after a filter | 1 | The live reading follows the chip; the bound layer is a run and marks its scope |
| Out of date and a different scope at once | 1, form by 5 | One line, two tokens |
| A second "record line" beside the state line | 1, form by 5 | One line; engine, seed, sampler and weight attribute under Details |
| A bare "Components" on a directed graph | 1 | The variant is part of the name |
| A PageRank that did not converge | 1 | Its own mark word at the value, never "~" |
| A weight role guessed from the column name | 1 | "weight: unknown" with its role control |
| "No self-loops, parallel edges or negative weights" on every clean graph | 1, form by 5 | No row at zero; a row when non-zero |
| Import-count rows pushing the resting inspector past 32 | 1 over 5 | Allowed in the open; the rows sit outside the six readings |
| Missing values hidden on a clean load | 1 over 5 | One mark on the Statistics Attributes row, "Attributes: 3 incomplete", only while an attribute has missing values |
| "~90 s" from an unmeasured cost model | 1 | A band word until a run on this device is measured |
| The "~" mark against the word budget | 1, form by 5 | "~" at the value; detail under Details |
| Sampled as the default above a size threshold | 2 over 5 | Rejected; exact at every size, sampled beside it |
| A sampled row beside every expensive command | 2 over 5 | One row per algorithm; the variant is its submenu |
| A sampled run tuning the exact result | 2 | A sibling result, never the current run |
| A second long run while one runs | 2 over baseline | Queued on its row; one toast |
| A cheap run queued behind a run of hours | 2 | A run under a minute starts beside a run of "under an hour" or more; long runs wait in start order |
| One band word for six minutes and for three days | 1 | Bands up to "hours" and an open "over a day" |
| The graph's full overview at rest | workflow evidence, form by 5 | Six headline readings (five on an undirected graph), "N more", one Attributes row: 20 words (15 undirected), 23 in the heaviest case; at most 32 with the other sections |
| The Results panel's family names against the left panel's 8 words | 4 over 5 | 17 words at rest, in the open: the field's family names are never shortened, and they are the only way to find an algorithm without its name (`content-design.md`, counted states; to be recounted, since it was counted with app-defined catalog families) |
| The whole screen at open against its 50 words | 4 and 1 over 5 | 50 on a directed graph before a run paints; the legend title a painted run adds, which principle 1 requires, makes 51, in the open. Decided: 51 is allowed in the open, because principle 1 requires the legend title and no other word can go; recounted by the directed rest-screen story (`content-design.md` 7) |
| A rank on every numeric value in a node's inspector | 1, form by 5 | Only metric values show a rank, in the one format of `content-design.md` 5, with its denominator on the inspector row, never only in a tooltip |
| "3 weak, 17 strong" and "In \| Out" to fit the rows | 4 over 5 | Terms in full; something else moves behind "N more" |
| A path query adds a row to the object list | 3 | Recorded as a query under its result; Create path adds the row |
| Runs listed beside sets | 3 | Runs sit under their result |
| "Brokers" instead of betweenness | 4 | Palette alias only |
| An (i) that recommends harmonic centrality | 4 | The (i) defines; the alternative is the one verb of the precondition mark, and shows on the run control before a run |
| A result given its own selected-object inspector | baseline, form by 5 | A result is a definition: its row opens an editor popover, within a selected object's budget, and the canvas selection stays |
| A failed autosave appearing unasked | 1 over 5 | On the closed list: autosave is the only save, so a silent failure loses the project; it stays until the project saves or a copy is downloaded (`message-catalog.md`, `save.failed`) |
| "N results out of date" as a notice when freshness changes | 5 | Rejected; each result row's Out of date state carries it, and a bulk Re-run is a command on the Results panel header |
| A copied value carrying its scope against pasting into a spreadsheet | baseline | One value copies the raw number, as Figma's Inspect does; copied rows and exports carry the scope in headers and titles |
| 3-word row cap against "average path length" | 4 over 5 | Never shortened; still counted |
| The group chord makes a "Group" | 4 over baseline | Key kept; runs Create set; the frame chord unbound |
| Help text under PageRank | baseline | The (i) instead |
| A sample gallery with descriptions on the empty screen | 5 | Recents, then samples, by name and thumbnail |
| Connect to data source... beside Open... on the empty screen | 5 against workflow evidence | Decided: a second command, recorded here, because the query-first workflows (a knowledge graph, a protein network service) start from a source, not a file; `content-design.md`'s empty start screen names both |
| A first-run coach mark or tip toast | 5 | Rejected; the (i) and Quick actions instead |
| Values in a hover card on the canvas | 5 | The label only; values in the inspector |
| `run-algorithms-on-load` | baseline | Removed; overview from graph attributes |
| An axis from year after a Correct of year | model rule (`conceptual-model.md` 7.2) | The axis follows, as a style layer does |
| A live force layout reflowing on every filter | 6 over baseline | Arranged positions move only by a layout command |
| A fresh start versus keeping positions | 6 | Keep positions unless a fresh start is chosen |
| A file opened with no stored positions | 6 and baseline | First placement is not a move; the implied layout is recorded |

## How every skill level is served

Everyone gets the same aids, and no feature appears for only one skill level:

- undo and working defaults, so trying anything is safe;
- the (i) on a technical term, defining it in at most two sentences, once per surface;
- tooltips that wait and give the name plus the shortcut;
- Quick actions, with friendly synonyms as aliases (principle 4);
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
- **Accessibility: the interface meets WCAG 2.2 AA in its default state** (`visual-language.md`
  A8, which says how the chrome meets it). The canvas is non-text content (1.1.1): the table and the inspector are its text
  equivalent, so every fact a mark conveys is readable there. Data fills may sit below 1.4.11's 3:1
  against the canvas because the value's text form is in the table, and the element then draws a
  neutral fill edge so the node can still be found (`canvas-drawing.md` 4); selection, focus and every
  other state mark keep 3:1 (`canvas-drawing.md` 2).
- The response classes (0.1 s, 1 s, 10 s) and what each allows are `interaction-patterns.md` 3.3.
- Node and edge appearance is applied only through style layers.
- An algorithm's suggested style layers paint only the elements in its own result.
- Highlights stack as style layers of the highlight kind, which write the highlight mark, never a
  data channel (`canvas-drawing.md` 5).
- One reserved mark means "selected": a neutral two-tone mark that never changes a fill
  (`canvas-drawing.md` 2; `decided-doors.md`, "The canvas marks").
- **Color follows the category, never its size rank**: a category keeps its color when a filter or
  a re-run reorders the groups by size (`options-and-encodings.md` 5; door 84, A category's color fixed at first paint).
- Imported data is never altered silently: nothing is coerced, merged or overwritten without
  showing it; derived values get their own columns; a type correction is a recorded, undoable step.
- **Anything counted but not drawn says so** where it would be drawn (a collapsed set's count
  badge, the not-drawn line, a legend note when edge direction is not drawn at the current zoom); an
  individual node is never silently undrawn. Hide on canvas is a hide the reader chose: the not-drawn
  line counts what it hides ("412 hidden").
- **The marks are closed**: each derives from one of principle 1's caveat kinds (freshness and
  scope, exactness, variant, precondition, coverage, counted but not drawn, suppression,
  references), and `glossary.md` 10 is the only list of them. A band word is a value, not a mark.
  A new mark needs a caveat kind here and a row there.
- Notes carry their context: a note cites the runs and the filter steps in force when it was
  written, because the cutoffs a methods section must report are filter steps, not parameters.
- Only a run declared deterministic may drop its stored values; its row then reads "Values not
  kept" and offers Restore (`element-contract.md` 8).
- No persona-specific features, modes or panels.
- Plain ASCII in all content.

## Decided elsewhere

- **Size changes what is offered, never a result silently.** Size may change whether a command is
  offered, what it costs, which method runs and how its result is presented; every size-dependent
  refusal is stated before the click and every approximation is labeled: `state-matrix.md` 1.
- **A path is a set kind stored with its order, and its own object type on screen**:
  `conceptual-model.md` 4.2.
- **The default scope of a run** (the filtered graph, frozen at start) and a search's stated
  scope: `conceptual-model.md` 4.4 and 4.5.
- **What a filter step is, and what is not a filter** (style layers, Hide on canvas, derived
  graphs): `conceptual-model.md` 4.4. There is no display-only filter step.
- **Notes, their targets and citations**: `conceptual-model.md` 6.
- **The departures from Figma**: `figma-crosswalk.md` 4, the one ledger.
- **Where results, notes, views and the table appear, and where the filter chip sits**:
  `information-architecture.md`, within the four-section cap at rest and principle 3's object list.
- **2D as the desktop opening view** is a default backed by flat-screen studies (Greffard et al.,
  `research/graph-analysis.md` 6.9); graphty-element's own default is 2D on a flat screen (`decided-doors.md`, "Decided, and not doors").
- **The run queue**: `element-contract.md` 3.
- **Contract shapes these principles depend on** (a frozen scope reference, a freshness field,
  exact or sampled in the result id, the cost estimate, retention) are in `element-contract.md`.

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
- `figma-crosswalk.md` 4 (the departures ledger)
- compact-mantine `design/figma-spec.md` 2.9 (contrast with `highContrast` off and on)
- Workflows in `design/designloom/workflows/`: "Hub Gene Identification and Ranking",
  "Enrichment Map - Pathway Similarity Network"
- Nielsen, "Response Times: The 3 Important Limits":
  https://www.nngroup.com/articles/response-times-3-important-limits/
- Figma, "Guide to the file browser":
  https://help.figma.com/hc/en-us/articles/14381406380183-Guide-to-the-file-browser
