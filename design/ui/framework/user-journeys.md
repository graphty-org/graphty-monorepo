# User journeys

**Job.** Show how analysis work unfolds across sessions and between people, one journey per rhythm
of the work, and which task, object or place serves each stage. **Not here:** clicks, commands
and step sequences (`task-flows.md`); why analysts come, how tasks rank and how each task's success
is measured (`top-tasks.md`); where things live (`information-architecture.md`). **Owner:** UX
researcher. **Ceiling:** the README's table. **Validated by:** interviews with people who match each
rhythm, and a diary study of the two rhythms that span weeks (section 5). **Growth:** this document
does not split. A fifth journey appears only if section 5's studies call for one; a journey is
never added to cover a persona. Why journeys and flows are two documents, and the rule that links
a stage to its flow: the header of `task-flows.md`.

**Everything here is a hypothesis.** The journeys are drawn from 25 workflows and 12 personas in
`design/designloom/`, every one marked `validated: false`. Where each workflow runs, including the ones no
journey covers, is "Workflows and where they run", before section 5.

## How to read a journey

A journey spans many sessions; a flow is one task in one sitting (Nielsen Norman Group, "User
journeys vs. user flows", https://www.nngroup.com/articles/user-journeys-vs-user-flows/). So a
stage names a task, an object or a place, never a click or a command; the command belongs to the
flow the stage points at. **A stage may point only at tasks, objects and places that exist.** A stage with nothing to point at is written up as a gap against
`top-tasks.md` or the information architecture; it never becomes a requirement here, because
journeys drawn per persona grow persona-specific features.

Journeys are cut by the rhythm of the work, not by persona. The workflows show four rhythms: a
first look, a weekly return, an investigation that starts from an alert, and a starting point that
passes from one person to another. **Publishing is not a journey**: it is the closing stage of the
weekly return and of the investigation, with the same pains in both ("legend not part of the
export"; "hunting through dialogs to recover the parameters used weeks ago"). There are no
satisfaction curves: mermaid's journey diagram needs a score per step, and every score would be
invented.

Each stage row has: the goal and doubt in the analyst's words; the task (a `top-tasks.md` number,
a bookend or the tail); the pain, quoted from a workflow; what serves it; the trust question; what
the stage leaves behind; and the flow (what it may name: the stage-to-flow rule in the header of
`task-flows.md`). **Between-session rows** are marked; they are where journeys fail and where
flows cannot see.

## 1. The first look

"What is this file, and is it any good?" One sitting that may become a project, or may never be
repeated. From "First Exploration - Quick Data Assessment", "Data Import and Validation",
"First-Time User Onboarding" (whose activation criterion is "User runs at least one analysis") and
"Visual Exploration - Overview to Detail"; Explorer Elena ("No guidance on where to start"). Small
to medium graphs. Sensemaking position: foraging.

| Stage | Goal and doubt | Task | Pain | Served by | Trust question | Leaves behind | Flow |
|---|---|---|---|---|---|---|---|
| Arrive | "Where do I put this?", or "Can I try it on something first?" | load | a wrong mapping discovered after an algorithm has run | the start screen; a sample; the load step | Did it read my columns as I meant? | a data version, its import report | 2 |
| Triage | "Is this the right file, and did it load right?" | 1 | deciding whether the graph needs sampling or filtering | the graph's Statistics under the overview recipe; the Last import row | Is a broken import visible before anything runs? | nothing new | 2 |
| Sample | "Do the rows mean what I think?" | 4 | -- | the inspector and the table | Am I reading raw values or paint? | a selection | 6 |
| Try a measure | "Which measure answers my question?" | 2, 3 | "Don't know what questions to ask of the data" | the catalog by family; Quick actions' search by question word | Does this measure fit this graph? | a result | 3 |
| Decide | "Go on, clean it, or find better data?" | 5, or load again | -- | a note; the project's data | Will I remember why I stopped? | a note | 7, 8 |

**Variant entry: arrives with a recipe.** The consumer side of journey 4 is a first look with the
analysis already chosen: a recipe, then data, then the binding step. It adds no place; if drawing
it ever needs one, that is evidence this journey is inventing requirements.

## 2. The weekly return

"Same analysis, this week's export: what changed?" One analyst, one project, many weeks, ending in
a figure and a methods text. From "Iterative Analysis Cycle", "Community Analysis", "Hub Gene
Identification and Ranking", "Network Evolution Analysis" and "Reproducible Session and Network
Publication"; Analyst Alex (`personas/analyst-alex.yaml`: "no way to save analysis patterns"). Its
success bar is task 12's in `top-tasks.md`.

| Stage | Goal and doubt | Task | Pain | Served by | Trust question | Leaves behind | Flow |
|---|---|---|---|---|---|---|---|
| *Between sessions:* the export arrives | "Monday's file is here" | -- | -- | the project, which opens where it was left | -- | -- | -- |
| Re-enter | "Where was I?" | -- | -- | the project, reopened as saved (filter steps, style layers, layout; nothing selected); its notes; the Last import row and Version history, which say what changed (`state-matrix.md` 3, reopened) | Is this last week's state? | -- | 2.2 |
| Swap the data | "Run it all again on this" | 12 | "Difficulty documenting analysis path for reproducibility" | a new data version under the same analysis; the replay | Did every rule, run and layer replay, and what did not? | a new data version; runs forked to it | 8 |
| Read what changed | "Is this change real?" | 10 | "Confirmation bias - seeing patterns that aren't there" | a comparison with the previous data version | Is a community difference larger than a re-run on the same data produces? | a saved comparison | 8.2 |
| Follow up | "Why did this cluster grow?" | 2, 3, 4, 6, 7 | -- | a result; Find; the filter chip; the Layout row | What is this number computed on? | filter steps; a set | 3, 3.1, 4, 4.1, 6 |
| Write it down | "Why did I keep set 3?" | 5 | forgetting within a week | a note tied to the set and the result | Will the note still explain it next week? | a note citing its objects | 7 |
| *Between sessions:* reopen next week | "Why is set 3 here?" | 5 | -- | the note on the set | -- | -- | -- |
| Publish | "Friday's figure, and the methods" | export | "legend not exported with the image"; "hunting through dialogs to recover the parameters used weeks ago" | a figure; the methods text from the records | Does the figure carry its scope and legend? | files written out | 5, 5.1, 9 |

## 3. The alert investigation

"Is this alert real?" It starts from one flagged entity and is mostly short: the fraud analyst
handles "50+ alerts daily" (`personas/fraud-analyst.yaml`) with a target of "Under 30 minutes per
alert" and "40-60% fewer false escalations" ("Fraud Ring Investigation"). **Most alerts end early,
cleared or referred, so the main line is the triage**, and the determination can be reached from
any stage. The case that runs over days is the extension. From "Fraud Ring Investigation",
"Criminal Network Analysis" and "Path Investigation". The graphs often begin above the drawing
limit (`scale-levels.md` 1; `element-needs.md`, "Separate the most the element can hold"), so the
order is reversed: Find, then the
neighborhood, then the overview last or never. Folding this into the weekly return would draw an
overview-first route these analysts never take. It adds no task of its own. A project on a graph
this size cannot embed its data in every autosave, so it holds the data by reference (door 2, The file's top level;
`element-needs.md`, "A project that holds its data by reference").

**Main line: the triage.**

| Stage | Goal and doubt | Task | Pain | Served by | Trust question | Leaves behind | Flow |
|---|---|---|---|---|---|---|---|
| Find the seed | "Where is the flagged account?" | 4 | -- | Find, over the full graph | Is what I found in scope, or excluded by a step? | a selection | 6 |
| Expand | "Who is around it? One hop or two?" | 4 | "Losing context when expanding to large neighborhoods" | a Filter to step, grown by Filter to neighbors or Add selection to step | How big is this before I commit? Can a path search leave it? | a filter step | 6 |
| Determine | "Clear it, or refer it?" (reachable from any stage) | 5, export | "Difficulty documenting evidence trail" | a note on the boundary's nodes; an evidence file | Does the file carry the boundary it was computed on? | a note; the evidence file | 7, 9 |
| The next alert | "Next one", in the same sitting and the same project | 4 | -- | A cleared alert keeps only its evidence file, which is its record; a referred alert also keeps a set of its boundary with a note. Then Delete step and Filter to on the new seed. No saved view and no set per cleared alert: views are the report's pages and Sets and paths is one flat list, and 50 a day would bury both | Was the previous boundary kept, or its evidence exported, before it is replaced? | a fixed set with a note; the evidence file | 6.2 |

**Extension: the case that runs over days.**

| Stage | Goal and doubt | Task | Pain | Served by | Trust question | Leaves behind | Flow |
|---|---|---|---|---|---|---|---|
| Connect | "How is this one linked to that one?" | 11 | -- | a path between two nodes, its scope stated | Was a similarity weight read as a distance? Did the search stay inside the boundary? | a path under one result | 10.2 |
| Keep suspects | "These six" | 9, 5 | "Difficulty documenting evidence trail" | a set; a note on it | Will I know next week why this set exists? | a set, a note | 10.1, 7 |
| Test | "Is this ring unusual?" | 10 | "Confirmation bias" | a randomized baseline for a statistic the set was not chosen by; a ring found for its density cannot be tested on density (`graph-conventions.md` 3) | Is the statistic named, with its null model, and was the set chosen by it? | a saved comparison | 10.3 |
| Hand over | "Refer it with the evidence" | export | -- | the evidence file; the methods text | Does the file carry the working set's boundary? | the evidence file | 9 |

**Variant entry: starts from a rule.** "Threat Hunting" does not start from an entity: the analyst
"forms hypotheses about potential threats and queries the graph to find evidence", triages many
matches, refines the query, and counts success as "Successful queries saved for future hunts".
Here the seed is a rule set with many members, the triage runs over those members, a refined rule
is an edit to the same rule set, and the saved rule set or a recipe holding it is the reusable
query. It uses objects that already exist; whether hunters recognize this shape is an interview
question (section 5). The same stage serves "Anomaly Detection" ("Triage - Rank anomalies by
severity") and "Hub Investigation" (rank, then the ego network).

| Stage | Goal and doubt | Task | Pain | Served by | Trust question | Leaves behind | Flow |
|---|---|---|---|---|---|---|---|
| Triage the matches | "Which of these 300 matter?" (a decision point of "Anomaly Detection": "Which anomalies warrant deeper investigation?") | 4 | -- | a rule set's members or a ranked result, stepped in order | Where is this one in the list, and on what scope was it ranked? | notes; a set of the ones kept | 6.1 |

The investigation's boundary is a filter step, not a selection, because it must bound what every
later number is computed on (`conceptual-model.md` 4.4).

## 4. A starting point travels

"Use the lab's expression overlay on my data." A community lead and a member meet only through a
file, and no data crosses: communities share starting points without sharing data. From "Gene List
to Interaction Network with Expression Overlay" (pain: "rebuilding the same style for the
down-regulated list") and "Reproducible Session and Network Publication". **Success line, from the
gene-list workflow: "user can state how many genes matched and which did not."**

| Stage | Actor | Goal and doubt | Task | Served by | Trust question | Leaves behind | Flow |
|---|---|---|---|---|---|---|---|
| Settle an analysis | lead | "This is how our lab reads a network" | 12 | the lead's own weekly return (journey 2) | -- | a project | journey 2 |
| Save the starting point | lead | "Share it without our data" | tail | a recipe; a style file | Does the file hold only definitions? | a recipe or style file | 9 |
| *Between people:* the file travels | both | "Here is our overlay" | -- | a recipe file; a link | -- | -- | -- |
| Apply it | member | "Put it on my list" | bookend | a recipe, applied recipe first or data first; a style file; the binding step | How many matched, and which did not? What is left unbound, and what does that block? | an applied recipe, one undo entry | 8, 8.1 |
| Make it the default | member | "Every new graph should open like this" | 1 | the element's default overview, which the graphty app sets from a reader preference (door 33, Choosing the overview recipe); for this project alone, the project's overview | Were readings under the old overview kept and marked? | a reader preference, or the project's overview | 2.1 |

## Workflows and where they run

Every workflow in `design/designloom/workflows/` has one placement: a **journey** and its stages;
**folded** into a stage of another journey; a **task** of `top-tasks.md` with no rhythm of its
own; or a **gap**, naming what nothing here serves. A gap is recorded here first and is owed to
`top-tasks.md` (a task) or `element-needs.md` (graphty-element work); it is not yet a row there.
The flows check fails on a workflow with no row, so a new workflow cannot go unplaced silently.

| Workflow | Placement |
|---|---|
| W01 | journey 1, all stages ("First Exploration - Quick Data Assessment") |
| W02 | journey 1, Triage and Sample ("Visual Exploration - Overview to Detail") |
| W03 | journey 2, all stages ("Iterative Analysis Cycle") |
| W04 | journey 2, Follow up; task 3 ("Community Analysis") |
| W05 | journey 3, Connect ("Path Investigation") |
| W06 | journey 3, main line ("Fraud Ring Investigation") |
| W07 | journey 3, the variant entry that starts from a rule ("Threat Hunting") |
| W08 | task: 2 and 11, ranking, then paths to known disease proteins; gap: judging druggability from outside annotations ("Drug Target Discovery") |
| W09 | journey 3, main line and extension ("Criminal Network Analysis") |
| W10 | task: 2, and 10 to compare influence measures ("Influencer Identification") |
| W11 | task: 2 (betweenness), and the tail's bridges and articulation points; gap: a "what if" removal kept as a scenario to compare, beyond a filter step ("Supply Chain Risk Assessment") |
| W12 | folded into journey 3, Triage the matches ("Anomaly Detection") |
| W13 | task: load, and the tail's bulk cleaning and merging duplicates (owed, `task-flows.md` 10.3); gap: integrating many sources under one schema ("Knowledge Graph Construction") |
| W14 | journey 1, Arrive, with a sample ("First-Time User Onboarding") |
| W15 | folded into journey 2, Publish, and journey 3, Hand over ("Findings Communication") |
| W16 | task: the tail's link prediction; gap: training and serving a recommender ("Graph-Based Recommendation") |
| W17 | folded into journey 3, Triage the matches ("Hub Investigation") |
| W18 | journey 1, Arrive ("Data Import and Validation") |
| W19 | journey 2, Read what changed; the tail's time route (owed, `task-flows.md` 10.3) ("Network Evolution Analysis") |
| W20 | journey 4, all stages ("Gene List to Interaction Network with Expression Overlay") |
| W21 | task: 3, then 10, each cluster compared with a loaded gene-set library by the enrichment test of `graph-conventions.md` 3, then 5, a note naming each cluster's function; gap: only fetching an outside library ("Cluster and Functionally Annotate a Molecular Network") |
| W22 | task: a set-collection projection (Jaccard or overlap coefficient with a cutoff, `graph-conventions.md` 3), then 3 over it ("Enrichment Map - Pathway Similarity Network") |
| W23 | journey 2, Follow up ("Hub Gene Identification and Ranking") |
| W24 | task: 10 over two graphs, and the tail's combining two graphs; the route is owed (`task-flows.md` 10.3, "Compare with...") ("Condition Comparison - Disease vs Control Networks") |
| W25 | journey 2, Publish; journey 4, Save the starting point ("Reproducible Session and Network Publication") |

Half of the bioinformatics researcher's ten workflows run in no journey: W15 is folded into a
closing stage, and W08, W21, W22 and W24 are tasks or gaps. Whether annotating modules and reading
enrichment form a rhythm of their own is a question for the interviews of section 5, not a fifth
journey drawn now.

## 5. Validation

Interviews per rhythm, sized in the table below and planned in `research/study-schedule.md`.
Interviews alone are weak exactly where journeys matter: people recall work spread over days
unreliably and tidy it in the telling. So the weekly return and the travelling starting point
also get a **four-week diary study**, one short entry per return or per recipe received ("what did
you open, what had changed, what did you redo"), four weeks because a weekly rhythm needs several
returns to show a pattern; and each weekly-return interview is held over the participant's own
last project file, not over memory. Every interview
adds one question, "Show me how you would convince a colleague this is true", which tests the
trust questions against practice. A stage nobody recognizes is deleted, not defended.

| Question | Evidence | Rule |
|---|---|---|
| Do first-time users triage before sampling, or sample first? | 5 to 8 people opening a file they have not seen: "show me what you do first" | keep Triage before Sample if 5 of 8 read the graph's size and import checks before any row; otherwise swap the stages |
| Does the weekly return swap data under a kept analysis, or rebuild it? | 5 to 8 analysts with a recurring export: "walk me through last Monday" | keep it if most swap the data under a kept analysis; if most rebuild, it folds into journey 1 repeated |
| Is the alert investigation its own journey, and is triage its main line? | 5 to 8 investigators: "walk me through the first ten minutes of your last alert, and how it ended" | keep it if 5 of 8 start from an entity; keep triage as the main line if most alerts end within the sitting |
| Does the rule-first hunt share this journey? | 3 to 5 threat hunters: "walk me through your last hunt" | keep it as a variant entry if the seed, triage and saved rule map onto their steps; otherwise it becomes a fifth journey |
| Is the travelling starting point its own journey? | 3 to 5 community or lab leads, and people who received their recipes | fold it back into journeys 1 (variant entry) and 2 (closing stage) if leads share only on request or recipients apply weeks later |

How long passes between receiving a recipe and applying it is unknown; the binding step's "left
unbound, switched off" state must survive whatever gap the interviews find.

## Sources

- `design/designloom/workflows/`: "First Exploration - Quick Data Assessment", "Data Import and
  Validation", "First-Time User Onboarding" (W14: "Should I try sample data first to learn the
  tool?"), "Visual Exploration - Overview to Detail", "Iterative Analysis Cycle", "Community
  Analysis", "Hub Gene Identification and Ranking", "Network Evolution Analysis", "Reproducible
  Session and Network Publication", "Fraud Ring Investigation" (W06, success criteria), "Threat
  Hunting" (W07, goal and success criteria), "Criminal Network Analysis", "Path Investigation",
  "Gene List to Interaction Network with Expression Overlay", as quoted.
- `design/designloom/workflows/`: "Anomaly Detection" (W12), "Hub Investigation" (W17).
- `design/designloom/personas/analyst-alex.yaml`, `explorer-elena.yaml`, `fraud-analyst.yaml`.
- `top-tasks.md`; `task-flows.md`; `scale-levels.md` 1; `conceptual-model.md` 4.4;
  `research/study-schedule.md`.
- Nielsen Norman Group, "User journeys vs. user flows",
  https://www.nngroup.com/articles/user-journeys-vs-user-flows/.
