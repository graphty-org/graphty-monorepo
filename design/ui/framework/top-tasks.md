# Top tasks

**Job.** Rank what analysts come to graphty to do, with the evidence behind each rank and what
success looks like. **Not here:** how a task is carried out (`task-flows.md`), where it lives
(`information-architecture.md`), what the inspector shows (`interface-specification.md`), the
rules the model enforces (`conceptual-model.md`). **Owner:** UX researcher. **Ceiling:** the
README's table. **Validated by:** the top-task vote below; until it runs, the owner's ranking of the
same longlist (the fallback) is labeled a single-rater ranking.

The ranking is written for the **weekly analyst**: comfortable with data, has used Gephi or
NetworkX, not a graph theorist, and arrives with a question. Analyst Alex
(`design/designloom/personas/analyst-alex.yaml`) is the clearest case: his goals are "quick access
to common operations", "reproducible analyses" and "regular analysis tasks like centrality and
communities"; his frustrations are "too many clicks for common tasks" and "no way to save analysis
patterns". Task names state the goal in the field's terms and never name a panel or a domain:
"hub gene", "fraud ring" and "influencer" are the same generic tasks.

## This ranking is a hypothesis

The ranks come from coding 25 workflows and 12 personas in `design/designloom/`, every one marked
`validated: false`. They describe imagined use, and the phase coding is one reader's judgment.
This is not McGovern's Top Tasks result, which comes from a vote by real users. It is validated by
a **top-task vote**: a longlist of about 40 tasks in users' words, each voter picking five, drawn
from the weekly and daily personas, including fraud and security analysts. McGovern's method
counts hundreds of votes; a vote of a few dozen is a pilot that shows direction and settles no
rank. **The owner's single-rater ranking of the same longlist comes first**, as a pick-five form
sent now; it lifts the freeze on this list (README, "The freeze") and is labeled a single-rater
ranking until the vote reports. Both are planned in `research/study-schedule.md`. The order of tasks 2 to 7 is the
least certain, so until the vote they must be about equally reachable.

**Measures.** Each task is measured by success rate and time on task from rest, the task
performance indicators McGovern proposes. So the first round has something to be compared against,
each every-session task carries a provisional target, labeled "set by the first vote round":

| Task | Success rate | Time on task from rest |
|---|---|---|
| 1 Characterize | 90% | 30 s |
| 2 Rank | 85% | 45 s |
| 3 Communities | 80% | 90 s |
| 4 Find and explore | 90% | 30 s |
| 5 Note | 85% | 30 s |
| 6 Filter, then characterize | 80% | 60 s |
| 7 Layout | 85% | 45 s |

## How the ranking is used

- **Rank decides prominence.** A higher-ranked task costs fewer steps and sits nearer the
  analyst's attention; when two capabilities compete for a place, the higher-ranked task wins.
- **Cost of error can override rank.** Checking the import, declaring what an edge weight means,
  choosing a weight threshold and knowing how a result read the edges are rare but change every later
  conclusion, so they stay visible regardless of rank.
- **Rank never buys a control of its own.** Most tasks are questions asked of things that exist,
  so they live on the thing. Twelve tasks must not become twelve panels.

| Frequency | Meaning for the weekly analyst |
|---|---|
| Every session | nearly every sitting, often more than once |
| Most sessions | most sittings or most weeks |
| Bookend | once per session, at its start or end |
| Tail | a few times per project or rarer |

## Every session

**1. Characterize the whole graph.** "What have I got, and did it load right?" First in every
session, and again after every filter. Serves "First Exploration - Quick Data Assessment", "Data
Import and Validation", "Visual Exploration - Overview to Detail", "Anomaly Detection".
*Success:* with nothing computed first, the analyst reads the size, direction, density,
components and isolates, the degree distribution and a profile of every attribute, over the
filtered graph, and a broken import (wrong direction, a weight read as text, negative weights, a
flood of isolates) is visible before any algorithm runs. Past the drawing limit the same readings
and the component-size list stand in for the drawing (`state-matrix.md` 4.2). **What is read is the project's overview
recipe**, answered in the question below. Graph statistics one level down (transitivity, diameter,
assortativity) are results once requested, and hold the scope they were computed on.

**2. Rank nodes by a centrality metric.** "Who matters most here?" Several times a session. Serves
"Influencer Identification", "Hub Gene Identification and Ranking", "Hub Investigation", "Drug
Target Discovery". *Success:* the analyst reads the top of a ranking against the metric's
distribution and sees it painted. A violated precondition (eigenvector centrality on a directed
acyclic graph) shows before the run; a corrected variant (closeness on a disconnected graph) is
named in the result's label (`graph-conventions.md` 1). A costly metric shows its cost and offers a
sampled variant, never swapped in silently.

**3. Detect communities and characterize them.** "What are the groups, and what is each like?"
Serves "Community Analysis", "Cluster and Functionally Annotate a Molecular Network", "Enrichment
Map - Pathway Similarity Network". *Success:* the analyst reads the number of communities, their
sizes, modularity and the edges between them, and each community's own statistics; retuning the
resolution revises the same result.

**4. Find a node, inspect it, and explore its neighborhood.** "Show me this account, and who is
around it." Many times a session; first for search-first investigators. Serves "Path
Investigation", "Fraud Ring Investigation", "Criminal Network Analysis", "Threat Hunting", "Hub
Investigation". *Success:* the analyst finds a node by name or value, reads its attributes, metrics
with their rank (on the metric's own row, in the one format of `content-design.md` 5) and memberships, and grows the neighborhood by one hop in one
step, or k hops with one more choice: as a selection, reversed by Previous selection, or as the
investigation's boundary with Filter to neighbors, one undoable step.

**5. Take a note.** "Write down what I found, and what it is about." Serves "Iterative Analysis
Cycle", "Threat Hunting", "Fraud Ring Investigation", "Reproducible Session and Network
Publication". *Success:* a note costs as little as a selection, attaches to the objects it is
about, cites the results it rests on, and next week explains why "set 3" was kept.

**6. Filter to a subgraph, then characterize what is left.** "Just the part that matters." Every
session for about half of frequent users; filtering is required by 18 of 25 workflows. *Success:*
the analyst filters by an attribute or metric, a weight threshold, the largest component or a k-core,
in order, and every later number, statistic and layout describes what is left. Results computed
earlier keep and state their own scope. Styling type X in red or fading the rest is task 8, and hiding it while every
number still counts it is Hide on canvas; neither is this task (`conceptual-model.md` 4.4). **Layout
follows the filter** for the simulation layouts: it reads only the filtered graph, so removed nodes
exert no force, and it moves the filtered graph or a set within it (`conceptual-model.md` 4.4,
5.2; `element-needs.md`, "A layout scope carried"). The Layout row says which scope it will
use.

**7. Make the layout readable.** "Untangle this." A default layout runs on load; the task is
re-running or tuning it. *Success:* reached from the graph, a set or a partition; nodes stay near
their previous positions unless the analyst asks for a fresh layout; separating components, laying
out per community and placing nodes from attributes (longitude and latitude, a tier) are this task.
A saved view keeps its own positions.

## Bookends

**Load a graph.** "Open this week's export." Serves ten workflows, led by "Data Import and
Validation". *Success:* fields map with little effort and the import report is reached from task 1.
Opening starts a new project; Replace data, Add data and adding another graph are explicit.

**Start from a recipe.** "Use the lab's expression overlay on my data", or "do the lab's analysis
on my data". A **recipe** is a project
file with no data (`files-and-recipes.md` 1), so a community shares a starting point without
sharing data; a style file is a recipe with only style layers. Serves Alex's "no way to save
analysis patterns" and "Gene List to Interaction Network with Expression Overlay", whose pain
point is rebuilding the same style for a new list. *Success:* one command applies the recipe;
attributes bind by name; the analyst confirms only weight roles and mismatched measurement levels;
anything unbound is listed, never skipped silently; one undo reverses it.

**Export.** "A figure for Friday, the numbers for my spreadsheet, the project for my colleague."
Serves eleven workflows. *Success:* an object exports as it looks now, with no saved view needed;
tables carry each value's scope in their headers; the methods text is written from the records.
Notes travel by what they are about: notes on definitions in a recipe, notes on elements in a
project, and read-only in a findings report, which scoped to the current filter step is the
investigator's evidence file; no notes-only file is offered (`files-and-recipes.md` 1).

## Most sessions

**8. Color or size by a value.** "Color it by log fold change." Serves the figure phase of 20 of
25 workflows. *Success:* reached from the result it encodes (15 of the 20) and equally from an
imported attribute (5), producing a legend; the scale offered follows the attribute's measurement
level, so community ids never get a color ramp.

**9. Create a named set, and combine sets.** "Keep these ten; which are in both lists?" Serves
"Hub Gene Identification and Ranking", "Fraud Ring Investigation", "Anomaly Detection". *Success:*
the top of a ranking, a community or a hand selection becomes a set in one step; sets combine with
Union, Intersect, Subtract and Exclude; a rule set follows the data and says so.

**10. Compare with...** "Does betweenness agree with PageRank?" Serves the five workflows that
require a comparison. *Success:* one command compares a result with exactly one other (two metrics,
two runs, two scopes, two windows, two graphs) with the standard statistic for the pair, states how
many elements are unmatched, and stays transient until saved.

**11. Find the shortest path.** "How is this account connected to that one?" Serves "Path
Investigation", "Fraud Ring Investigation", "Criminal Network Analysis", "Drug Target Discovery".
*Success:* from a node, name a node or a set as the target and see the path drawn; each query is
kept under one result with its own scope; a similarity weight is converted, never read as a
distance.

**12. Reuse an analysis.** "Do last week's analysis on this week's export". **Replace data** puts new data under a known analysis; its reverse, a known
analysis over new data, is the "Start from a recipe" bookend, ranked there and not again here.
*Success:* rules, runs, style layers and layouts replay; hand-made sets and notes carry over by id
under Replace data; communities match by overlap; what changed since last week is task 10. When
every column matches, Replace data takes three steps or fewer from rest (the command, the file,
Load), with every changed number marked.

## The tail

Reached through the object, search and Quick actions, never in the way: **share a recipe**
(save a project's definitions without its data, for a community to apply; community leads do this,
the weekly analyst consumes); watch the graph change over time (only with a time attribute; "Network
Evolution Analysis"); combine two graphs ("Condition Comparison - Disease vs Control Networks");
project a bipartite graph; choose a layout algorithm; test a result against a null model; check a
partition's stability across seeds; clean and edit data in bulk, including merging duplicates;
bridges and articulation points; link prediction; the rest of the
catalog; save a view; switch between 2D, 3D, VR and AR.

## Requirements that are not tasks

Nobody arrives with these as goals, but each binds the design. Each rule lives in the document
named: every attribute is a sortable column (`information-architecture.md`); every result records
how it was produced, shown by exception (`conceptual-model.md` 7.1); what an edge weight means is a
declared role, never guessed from the name "weight" (`graph-conventions.md`); a different scope is
not out of date, and every number states its graph (`conceptual-model.md` 4.5); degree and
components are always available, and core number and the graph statistics are to be always
available too (`element-needs.md`, "Readings the overview and the tasks promise"); a long run shows progress and can be canceled; going back to
an earlier result is not undo (`conceptual-model.md` 4.3); resuming work costs nothing, because the
project autosaves; one run mechanism serves tasks 2, 3, 6, 10 and 11, so no task is an algorithm
launcher.

## Why the contested rankings came out this way

- **"Run an algorithm" is not a task.** Coding put "run" first, but nobody comes to run something;
  ranking it would build Gephi's 98-entry Statistics panel.
- **The overview is first, above loading.** It is in the first minutes of every workflow, it
  returns after every filter, and "overview first" is the field's standard entry.
- **The overview is a recipe, but its floor is fixed.** Only one workflow ("Visual Exploration -
  Overview to Detail") opens on an overview, and it asks for a generic one; no workflow opens on a
  flows-first or groups-first view. So graphty-element ships one General overview, and Flow overview
  and Community overview are example recipe files.
- **Every filter step changes what is computed**; styling a set, fading it or hiding it on the
  canvas is paint, a different task (`conceptual-model.md` 4.4). Gephi's defect was not that
  filtering changes computation but that the scope a statistic used was not recorded.
- **Layout is every-session**, because position is the strongest channel and eight workflows use
  layout as a working step.
- **Notes are every-session**: they are written inside other phases, and the weekly analyst
  forgets within seven days why a set was kept.
- **Starting from a recipe is a bookend, and task 12 is Replace data alone.** Replace data keeps
  the analysis and changes the data; a recipe keeps the data and changes the analysis; each is
  ranked once, though they share the replay machinery.

The per-task evidence behind each bullet, and the reasons that shaped the earlier inspector rules,
are in `research/archive/top-tasks-long-form.md`.

## Could "Replace data" also be "load style" or "load recipe", so communities share starting points without their data?

Yes. A **recipe** is a project file with no data, and a **style file** is a recipe holding only
style (its contents are `conceptual-model.md` 1.1's one list): one format with optional parts, not
two formats (`files-and-recipes.md` 1). That is a file format, so it is recommended, not decided
(`one-way-doors.md` 19). "Start from a recipe" is a bookend task, "share a recipe" is in the tail,
and task 12, "Reuse an analysis", is its reverse, Replace data. A community lead saves a recipe; a
member applies it to their own data, binding the recipe's attributes to theirs by name and
confirming weight roles, and nothing of the lead's data travels. Shown at work in `task-flows.md`
8 (a recipe) and 8.1 (a style file), and across people in `user-journeys.md` 4.

## Should characterizing a graph be a default overview recipe that a domain can replace?

Yes. graphty-element ships General overview, and registers Flow overview and Community overview as
examples; a project may name its own, and a reader may set a default for every project that names
none. Nothing costly runs at Load, an overview never paints, and Compute the overview fills the rest
in one click. The rule, and why each part of it holds, is `files-and-recipes.md` 2; the two ways to
replace it are `task-flows.md` 2.1.

## Sources

- `design/designloom/personas/*.yaml` and `workflows/*.yaml`, notably `W02.yaml` (Visual
  Exploration - Overview to Detail), `W06.yaml` (Fraud Ring Investigation); capabilities
  `filtering`, `comparison-view`, `analysis-history`, `annotation`, `saved-filters`,
  `style-presets`
- `research/archive/top-tasks-long-form.md` and its sources
- `research/design-method.md`, section 6.6 (phase coding) and the follow-up on a top-task vote
- `research/graph-tools.md` (Gephi and Cytoscape behavior)
- McGovern, *Top Tasks*, 2018, cited for its method, not re-read for this revision
- Open decisions cited (`one-way-doors.md`): 19, The recipe profile and how it binds
