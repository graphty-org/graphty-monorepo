# Answer key for the tier 1 tasks -- GRADERS ONLY

Never give this file, or anything quoted from it, to a participant. A simulated participant who
knows the intended path finds it, and the session proves nothing.

How to grade (from `criteria.md`): S success, SD success with difficulty, F failure, G gave up.
Grade from the last screenshot, the files in `downloads/` and the transcript, never from the
participant's self-rating. Check every claimed answer against a screenshot: a name or number the
participant could only know from memory of the dataset does not count. Record for every session:
grade, failure codes, steps taken, wrong turns, ease (from the transcript), every silent commit
(a commit whose intended effect is on the drawing -- a binding set, a run finished, a layout
applied, a label attribute chosen -- with before and after screenshots that
show no change on the canvas or legend), every false "done" claim (graded apart from the task;
tag `truth-on-screen` when the screen itself said otherwise), every count that disagrees with the
drawing, and every tool print of `ambiguous`, script errors or failed requests. For every
empty-start session also record how the usage card was answered: shared, declined, or skipped
by opening a sample (the card goes away unanswered and usage data stays off); any detour; any
wrong belief about what is sent.

**Answers must be on screen first.** A named answer (a rank, a member, a neighbor, a count)
counts only if it appears in a screenshot taken before the participant states it. A build defect
is confirmed at one participant once you reproduce it as a scripted path on the build.

**Keyboard sessions.** Morgan runs in the tool's screen-reader mode and is graded from the
accessibility tree and focus the tool printed, not from screenshots Morgan never saw; the grader
still checks the final screenshot. Sam (sighted, keyboard only) uses `--key` and `--type` only.
Each task Morgan or Sam takes has a **Keyboard path** (fixed in rehearsal, `--key` and `--type`
only); T9, T10, T13 and T15 have a **Screen-reader check**: the text Morgan must read to know the
step is done. If that text does not exist on the build, record a build defect against the false
"done" bar. Whenever Morgan undoes, record whether the undo was announced and focus stayed put. Mark a session **build-decided** when a build defect alone decided its grade,
and **void** when the tool failed (re-run it).

SD allows: more than two wrong turns, a tooltip or help, a detour then a correction, a correct
answer read from a different place than the success path. Steps in a success path are `real.mjs`
steps; control names marked (r) were confirmed by the re-pilot of every task on commit 9d6598eea
(`rounds/r0/pilot/<task>/pilot.md`), which reached every success state by these paths. Every path
below was walked again on round 2's build, commit 4a7a1a7fb, and reached its success state
(`rounds/round-2/pilot/<task>/`, script `tmp/researcher/r2/walk.sh`); where the build changed a
path, the round 2 path is given and the round 1 path is kept for grading round 1.

**Round 3 routes (walked 2026-10-07 on round 3's build, b7590f8de).** Four changes alter routes:
a run is named by its method everywhere ("PageRank", not "Influence"; "Louvain", not
"Communities"); Size "+" opens its from-data list at once, as Label "+" does; a "Show all labels"
checkbox beside the hidden count turns the overlap rule off; the group layouts accept a community
result after a community run. Every round 3 entry below (marked **Round 3**) was walked on the
build: T6, T7, T9, T10, T11, T12, T13, T15 and T16 in `rounds/r2/pilot/<task>/`, and T2, T3, T5,
T8, T14 and the T7 B setup in `rounds/round-3/preflight/<task>/` (script
`tmp/researcher/r3/walk.sh`); every one reached its end state. Where a route changed, the entry
gives the round 2 scoring and the round 3 scoring side by side. No bar changes.

**Tool prints on round 3.** The tool no longer prints `ambiguous` for a label and the control it
labels ("Show all labels", "Format", "Table"): it counts them as one control (fixed 2026-10-07). It
still prints `ambiguous` for "PageRank" when the run row and a node's "Summary values" group are
both on screen, and for "Group 1" (the row, the legend entry, the outline button). Neither is a
participant's wrong turn.

**Picking an Analyze method.** In success paths the method is picked with `--click "<method>"`
after typing its name. Keyboard paths use `--key Enter` on the only match, which opens its form
with Run focused; a second `--key Enter` runs it (works on commit 9d6598eea).

**Keyboard paths (rehearsed 2026-10-06 on commit 9d6598eea, keys and typing only; walked again
on commit 4a7a1a7fb for round 2, `tmp/researcher/r2/keypaths.out`, every one reaching its end
state).** On round 2's build, focus no longer falls to the page body after a Style pick: it
moves to the new line's control ("1 to 3, variable Influence" after binding a size, "Label
position" after choosing a label attribute). It still falls to the body after "No thanks", after a
refused file, after Back to start and after reopening a project. Written as
the keys a person presses. "Tab to X (n)" means press Tab until X has focus; n is how many presses
it took on the build from the state before, so a grader can compare a participant's count. The
walks are `tmp/researcher/keypaths.mjs` (output `keypaths.out`, `keypaths2.out`, `keypaths3.out`)
and, for the own file, a `real.mjs` session (`tmp/researcher/kb-T15B/`). Common steps:

- *Card:* Tab to "No thanks" (11), Enter. Focus then falls to the page body (an accessibility
  defect for bar 8, not a participant error).
- *Open a sample:* Tab to "Open the <name> sample" (6 for Les Miserables, 8 College football, 9
  Florentine families, from the body), Enter. Focus lands on the drawing.
- *Open the own file:* Control+o (or Tab to "Open project or file..." (5), Enter), then the file.
- *Rank:* Shift+A, type PageRank, Enter (the form opens with Run focused), Enter. The live region
  says "PageRank added, running"; no "finished" announcement was seen.
- *Select a row:* Tab to the outline (14 to 15 from the drawing; the outline's tab stop is its last
  focused row), Down arrow to the row, Enter.
- *Style tab:* Tab to the inspector's tab (6), Left arrow to "Style", Enter.
- *Names:* select Everything; Tab to "Add label line" (14), Enter; type the attribute (`name`,
  `label` or `id`), Enter. Focus falls to the page body; the live region reads "77 labels, 7 hidden
  to avoid overlap" (or the dataset's count).
- *Sizes:* select the result's row (Influence); Style tab; Tab to "Add to Shape" (6), Enter; Enter
  on "Size" (focus falls to the body); Tab to "Size by attribute" (22), Enter; Enter on
  "Influence". Focus falls to the body; the legend reads "Size: Influence". No live announcement.
  Round 3 (walked): Enter on "Size" opens the list with focus in it; Down arrow to "PageRank",
  Enter; the legend reads "Size: PageRank". No "Size by attribute" step.
- *Image:* Control+e; Tab to "Export" (9), Enter. The live region reads "Exported
  <file>.png".

**On-screen names of runs.** Round 2's build (commit 4a7a1a7fb) still names a run on screen by its
result ("Influence" for PageRank, "Communities" for Louvain), as round 1's did; the planned change
to name runs by their method was not made. Either word counts as naming the measure (T7 "what the
order was based on", T9 and T15 "what the sizes stand for"). Paths below click and read the result
word ("Influence"); if a later build names runs by method, use that word, with the same steps and
counts.

**Round 3: runs named by method.** The outline, inspector, table, key and Values read the method
("PageRank", "Degree", "Louvain"). Every path's `--click "Influence"` becomes `--click "PageRank"`
and `--click "Communities"` becomes `--click "Louvain"`; the Analyze list is closed after Run, so
the name resolves to the run row (expect an `ambiguous` print if both are open). Scoring is
unchanged: round 2 and round 3 both accept the method or the result word as naming the measure,
because "influence" or "communities" describes the measure correctly whether or not the build
still prints it. Record every pause or question about the run's name: 17 sessions paused on the
swap in round 2, and that count is what credits or fails the change.

## Failure codes (all tasks)

- `stopped-at-toggle` -- stopped at a checkbox or switch that changed nothing visible, believing
  the step done
- `false-done` -- said a step was done; the screen shows it is not (severity 4 when confirmed)
- `wrong-row` -- changed a row that does not cover the nodes the task is about
- `wrong-attribute` -- bound to an id or another attribute instead of the one asked
- `not-run` -- answered without having the program compute it (guessed from the drawing)
- `read-wrong` -- the value is on screen and was misread or mis-ordered
- `ids-not-names` -- the app showed internal ids ("n4") where names were needed
- `never-found` -- never reached the control or place the task needs
- `dead-end` -- a control the participant chose did nothing or refused, and they did not recover
- `lost-state` -- an earlier step's result disappeared (closed, replaced, reset)
- `wrong-data` -- worked on a sample instead of their file, or the wrong file
- `stopped-before-load` -- read the import page but never loaded the graph
- `no-key` -- the picture has no key to its colors or sizes
- `wrong-file-type` -- a file a spreadsheet cannot open, or an image of the table
- `meaning-wrong` -- a confident wrong reading of what the drawing's sizes or colors stand for

## Reference values (recorded on commit 9d6598eea; re-recorded unchanged on commit 4a7a1a7fb, 2026-10-06)

Recorded by the UX Researcher's scripted runs on the build (`tmp/researcher/ranks.mjs`,
`keypaths.mjs`) and the re-pilot of every task on the same commit (`rounds/r0/pilot/`). If the
commit under test changes before a session, these are re-recorded first (`criteria.md`,
preflight 4). The key records what the build computes, not what a textbook would.

**Re-recorded for round 3.** `tmp/researcher/r3/ranks.mjs` (output `r3/ranks.out`) ran every
ranking below on round 3's build (b7590f8de, 2026-10-07): every top three and value is identical,
and each run row is named by its method ("PageRank", "Degree", ...). Louvain gave 6 groups, sizes
20, 17, 11, 11, 10, 8, modularity 0.5556 on 3 of 3 fresh loads, with the same 20 members of Group 1
read from the exported nodes CSV each time.

**Re-recorded for round 2.** `tmp/researcher/r2/ranks.mjs` (output `r2/ranks.out`) ran every
ranking below on commit 4a7a1a7fb: every top three and value is identical. Louvain gave the same 6
groups, sizes and modularity on 3 of 3 fresh loads, and the exported nodes CSV lists the same 20
members of Group 1 (`rounds/round-2/pilot/T13-v5/downloads/les-miserables_nodes.csv`). The label
statements are unchanged ("77 labels, 7 hidden", "115 labels, 14 hidden", "77 labels, 6 hidden"
once sized).

**On-screen names of runs.** Each run is named on screen by its result (the word in parentheses
below), the same on round 1's and round 2's builds; the method word (first) names the same
measure and counts too: Degree ("Connections"), Betweenness ("Bridges"), Closeness ("Reach"),
PageRank ("Influence"), Eigenvector ("Influence by association"), Katz ("Influence at a
distance"), HITS ("Hubs and authorities"), Core number ("Core depth"), Clustering coefficient
("How tightly knit"), All-pairs distance ("How far from everything else"), Louvain
("Communities"). On round 3's build the method word is the on-screen name everywhere (see "Round 3:
runs named by method"); the values do not change.

**Ties and short Top 10 lists.** A Top 10 stops before a tie it cannot fit, so it can list fewer
than ten, or none: friends.csv's Connections lists only Ava 6 and Ivan 5; Les Miserables'
Connections lists nine; Core depth and How tightly knit list nobody on Les Miserables and
friends.csv. A participant who then reads the order from the table or the drawing gets SD, not F;
a top three that includes a tie is right in either order of the tied names.

| Dataset | Fact | Value |
|---|---|---|
| Les Miserables | characters, connections, attributes | 77, 254; nodes `id` and `name`, edges `shared_chapters`; one component; Undirected |
| Les Miserables | PageRank ("Influence") top 3 | Valjean 0.07543, Myriel 0.04278, Gavroche 0.03577; range 0.003299 to 0.07543 |
| Les Miserables | Degree ("Connections") top 3 | Valjean 36, Gavroche 22, Marius 19 |
| Les Miserables | Betweenness ("Bridges") top 3 | Valjean 1,624, Myriel 504, Gavroche 470.6 |
| Les Miserables | Closeness ("Reach") top 3 | Valjean 0.008475, Marius 0.006993, then Javert and Thenardier tied at 0.006803 |
| Les Miserables | Eigenvector ("Influence by association") top 3 | Gavroche 1, Valjean 0.8409, Enjolras 0.8395 |
| Les Miserables | Katz ("Influence at a distance") top 3 | Gavroche 1, Valjean 0.8408, Enjolras 0.8395 |
| Les Miserables | HITS ("Hubs and authorities") top 3 | Gavroche 0.3178, Valjean 0.2676, Enjolras 0.2672 |
| Les Miserables | Core depth, How tightly knit, How far from everything else | Top 10 empty or tied; these do not measure how much the network depends on a node (see T7) |
| Les Miserables | Louvain ("Communities") | 6 groups, sizes 20, 17, 11, 11, 10, 8; modularity 0.5556; identical on 3 of 3 fresh loads. Group 1 (20): Bamatabois, Brevet, Champmathieu, Chenildieu, Cochepaille, Fauchelevent, Gervais, Gribier, Isabeau, Judge, Labarre, Marguerite, MlleBaptistine, MmeDeR, MmeMagloire, MotherInnocent, Scaufflaire, Valjean, Woman1, Woman2. The Members list shows the first 10 only |
| Les Miserables | label line statement at 1440 x 900 | "77 labels, 7 hidden to avoid overlap" with sizes unchanged; "77 labels, 6 hidden to avoid overlap" once sized by Influence (T15). Round 3 (recorded): "77 labels, 7 hidden", "77 labels, 6 hidden" once sized; with "Show all labels" checked it reads "77 labels" and every name is drawn |
| Les Miserables | Javert's degree and neighbors | 17 (list under T12) |
| College football | teams, games, name attribute | 115, 613; `label` (also `value`, the conference) |
| College football | label line statement at 1440 x 900 | "115 labels, 14 hidden to avoid overlap"; round 3 (recorded): "115 labels, 14 hidden", and "115 labels" with "Show all labels" checked |
| Florentine families | families, marriages, attributes | 15, 20; `id` and `name` |
| Florentine families | the Medici's marriages | 6: Acciaiuoli, Albizzi, Barbadori, Ridolfi, Salviati, Tornabuoni ("Medici's 6 connections") |
| Florentine families | PageRank ("Influence") | Medici 0.1458, Guadagni 0.0984, Strozzi 0.0881; range 0.03066 to 0.1458 |
| Florentine families | Degree ("Connections") | Medici 6, then Guadagni and Strozzi tied at 4 |
| Florentine families | Betweenness ("Bridges") | Medici 47.5, Guadagni 23.17, Albizzi 19.33 |
| Florentine families | Closeness ("Reach") | Medici 0.04, Ridolfi 0.03571, then Albizzi and Tornabuoni tied at 0.03448 |
| Florentine families | Eigenvector ("Influence by association") | Medici 1, Strozzi 0.8072, Ridolfi 0.7698 |
| Florentine families | Katz ("Influence at a distance") | Medici 1, Strozzi 0.6539, Guadagni 0.6138 |
| Florentine families | HITS ("Hubs and authorities") | Medici 0.4303, Strozzi 0.356, Ridolfi 0.3416 |
| friends.csv | people, ties, the attribute that holds the names, weight | 20, 41; Directed; the names are in `id`; `weight` (not used by runs on this build) |
| friends.csv | PageRank ("Influence") top 3, as computed (directed, unweighted) | Farah 0.06608, Ava 0.06423, Hana 0.05883; range 0.04382 to 0.06608 |
| friends.csv | Degree ("Connections") | Ava 6, Ivan 5, then a tie at 4 (the Top 10 lists only Ava and Ivan) |
| friends.csv | Betweenness ("Bridges") | Ava 51.27, Ivan 40.02, Sana 21.35 |
| friends.csv | Closeness ("Reach") | Ava 0.02632, Ivan 0.025, Sana 0.02273 |
| friends.csv | Eigenvector ("Influence by association") | Ava 1, Ivan 0.6709, Chloe 0.4502 |
| friends.csv | Katz ("Influence at a distance") | Ava 1, Ivan 0.7025, Theo 0.3871 |
| friends.csv | HITS ("Hubs and authorities") | Ava 0.48, Ivan 0.3792, Theo 0.3338 |
| friends.csv | label line statement at 1440 x 900, bound to `id`, sized | "20 labels, 0 hidden to avoid overlap"; round 3: "20 labels, 0 hidden" (unsized: "20 labels, 1 hidden", Chloe) |

## The picture checklist (T13 and T15)

An exported image passes when all of these hold against the final screenshot:

- the same nodes and the same arrangement as the final screen;
- sizes visibly different (T15);
- the names that were drawn on screen are drawn in the image;
- a key that names every channel in use: color, and size when sized. The key does not list
  names; labels need no key.

## T1. First launch and usage data (not run in tier 1 rounds)

- **Success:** the usage card answered (either way); the participant says correctly what would
  be sent (how the app is used, never the data analyzed; a session replay with text masked) and
  where to change it later (the header's privacy chip or Settings > Privacy).
- **Path (3):** `--click "What is collected"`; `--click "No thanks"` (or "Share usage data");
  `--click "Local only"` (opens Settings > Privacy).
- **Checked on screen:** opening Settings > Privacy, or reading the line shown after answering
  ("Change this in Settings > Privacy"), both count.
- **Partial:** SD if the answer is right but "change later" is a guess not checked on screen.
  F if they never open what is collected and answer from assumption, or state that their data is
  sent.

## T2. Something to try it on

- **Success:** any sample drawn; the participant says what it is in one sentence that matches
  the sample's description or Overview (what the dots and lines are, roughly how many).
- **Path (1):** `--click "Open the Les Miserables sample"` (any sample card) (r).
- **Partial:** SD if it took a detour (a file chooser opened and cancelled). F: nothing drawn, or
  a wrong description.
- **Measure, not graded:** the "change it later" answer is right if it names the header's privacy
  chip or Settings > Privacy and matches the screen; reading the line "Change this in Settings >
  Privacy" after answering the card counts as checked on screen. When a sample is opened before
  the card is answered, that line never shows; the "Local only" chip's tooltip ("Nothing is sent.
  Opens Settings > Privacy") and Settings > Privacy then count as checked on screen.
- **Keyboard path (20 keys, round 3's build):** card; Tab to "Open the Les Miserables sample"
  (6), Enter; the live region reads "Les Miserables: 77 nodes, 254 edges". Focus then falls to the
  page body (the drawing no longer takes focus on load).

## T3. Your own list of ties

- **Success:** the graph from `friends.csv` drawn (Overview: 20 nodes, 41 edges); the participant
  states 20 people and 41 ties, and checks that nothing was dropped against a rows count on screen
  (Data > Sources: "41 rows, 41 edges" on the edge table, or the import page's sentence if they
  went by "New from data..."; on round 2's build Sources shows one row, "friends.csv 41 rows, 41
  edges", `rounds/round-2/pilot/T3/04.png`).
- **Path (3):** `--click "Open project or file..."`; `--upload friends.csv` (drawn at once; no
  import page, no Load); `--click "Data"` and read Sources.
- **Partial:** SD if "nothing was dropped" rests on the Overview counts alone, with no rows count
  on screen, or roles had to be changed. F codes: `stopped-before-load` (import page route only),
  `wrong-data`, `read-wrong`.

## T4. Two spreadsheets as one network (not run in tier 1 rounds)

- **Success:** one graph drawn from both files; the participant reports the one link (`p11` to
  `p13`) that names someone not on the staff list and knowingly either left it out (12 nodes, 22
  edges) or added the unknown person (13 nodes, 23 edges).
- **Path (r, about 6):** `--click "New from data..."`; `--upload people.csv`; `--click "Add a
  table"`; `--click "File..."`; `--upload messages.csv`; set a role only if the page did not propose it; read the match report;
  `--click "Leave out"` (or "Add"); `--click "Load"`.
- **Partial:** SD if the stray row was noticed only after loading. F codes: one file only,
  `stopped-before-load`, `false-done` ("everything arrived" without the stray row).

## T5. A file that will not read

- **Success:** the participant reaches the refusal and can tell the coworker the file is
  incomplete or cut off (and where, if the screen says) and needs to be sent again whole.
- **Path (2):** `--click "Open project or file..."`; `--upload club-members.graphml`.
- **Partial:** SD if they needed a second attempt or a tooltip to understand the refusal. F: thinks
  it loaded, or blames their own action with nothing to tell the coworker.
- **Keyboard path (18 keys):** card; Tab to "Open project or file..." (5), Enter, the file. The
  live region reads the refusal ("club-members could not be opened: the file is incomplete or
  damaged near line 9, so nothing was read. Ask for the file again."); focus falls to the page
  body. For Morgan the refusal must be announced (assertive); if it is not, record a build defect.

## T6. What did I get?

- **Success:** all four right, read off the screen: 77 characters; 254 connections; one component,
  so every character can be reached; recorded facts: `id` and `name` for characters (either
  alone, with the other honestly not mentioned, counts) and `shared_chapters` for connections.
- **Path (2-3):** `--click "Open the Les Miserables sample"`; read Values > Overview;
  `--click "Data"` (the rail) for Attributes, or the table (Shift+T).
- **Partial:** SD with 3 of 4 right and the fourth honestly unknown. F: 2 or fewer, or a confident
  wrong answer about reachability.
- **Round 3, screen reader:** the tool now has `--read`, which reads the region around focus as a
  screen reader's browse mode does, so the Overview's plain-text counts can be heard without being
  focusable. Grade the screen-reader session on what `--read` and the focus lines offered; the load
  is announced ("Les Miserables: 77 nodes, 254 edges").
- **Keyboard path (35 keys; 28 on round 3's build):** card; open (Values > Overview shows Nodes 77, Edges 254,
  Components 1); Tab to the rail's "Graph" (13), Down arrow to "Data", Enter: Attributes list `id`,
  `name` and `shared_chapters`.

## T7. Who matters most

- **Success:** a ranking run from Analyze (PageRank, degree, betweenness, closeness, eigenvector or
  similar); the top three in the order the app shows for that run (its Top 10 or the sorted
  table), matching the reference values for that ranking and dataset; the measure named (the
  method or its on-screen name, such as "Influence"). Names must appear in a screenshot before
  they are stated.
- **B (running club):** the same on `friends.csv`, from the setup start (names are in `id`).
- **Path (6 on round 1's build, 7 on round 2's):** open the sample; `--key Shift+A`; `--type
  PageRank`; `--click "PageRank"`; `--click "Run"`; `--click "Influence"` (select the run row);
  read Top 10 on its Values. On round 2's build the row opens on its Style tab, so add
  `--click "role=tab:Values"` before reading (walked: `rounds/round-2/pilot/T7-A/`, `T7-B/`).
- **Round 3 path (7, walked: `rounds/r2/pilot/T7/`):** round 2's path including the Values step:
  `--click "PageRank"` (the run row, opening on Style) in place of `--click "Influence"`, then
  `--click "role=tab:Values"` and read the Top 10. Scoring unchanged (either word names the
  measure).
- **Keyboard path:** open; rank; select the Influence row; its Values show the Top 10 (on round
  2's build, Tab to the Values tab first). (No keyboard participant takes T7.)
- **Measures that do not answer the question:** Core depth, How tightly knit and How far from
  everything else do not rank by how much the network depends on a node; a top three read from
  them is F (`meaning-wrong`) unless the participant notices and runs a ranking. Depth-first order
  and Most flow need nodes selected first and do not rank either.
- **Partial:** SD if the order was read from a sorted table or needed a detour. F codes: `not-run`,
  `read-wrong`, `ids-not-names`.

## T8. Circles of characters

- **Success:** a grouping run (Louvain or another community method); the number of groups and the
  largest group's size as the screen shows them; three characters named who are in the largest
  group, each shown in a screenshot (its Members list, the table or the drawing) before stated.
- **Path (7):** open the sample; `--key Shift+A`; `--type Louvain`; `--click "Louvain"`;
  `--click "Run"`; `--click "Communities"` (select the run row) and read Summary and Sizes;
  `--click "Group 1"` (the largest) and read Members. "Communities" counts as naming the method.
  The tool may print `ambiguous` on "Group 1" (a legend entry and a row); expect it. On round 2's
  build both rows open on their Style tab (Group 1 shows only its color), so Summary, Sizes and
  Members need `--click "role=tab:Values"` after each row (9 steps; walked:
  `rounds/round-2/pilot/T8/`). A participant who reads a Style tab and goes looking for the
  members is on the path, not on a wrong turn.
- **Round 3 path (9, walked: `rounds/round-3/preflight/T8/`):** the same, with `--click "Louvain"`
  for the run row ("Louvain 6"); Values shows Summary and Sizes; `--click "Group 1"` and its Values
  show "Size 20", "Made by Louvain" and Members (first 10).
- **Partial:** SD if fewer than three members are named while the count and size are right.
  F: count or size wrong, a named member not in the largest group, `not-run`.

## T9. Bigger dots for the ones that matter

- **Success:** a ranking run, and node sizes on the canvas bound to it (a Size line bound to the
  result; dots visibly differ; the legend shows size); and the participant says, from what the
  screen shows, what a bigger dot means and what the colors stand for. Same on Florentine
  families (B).
- **Path (about 9 steps, 11 commands):** open the sample; `--key Shift+A`; `--type PageRank`;
  `--click "PageRank"`; `--click "Run"`; `--click "Influence"` (the run row, by its on-screen
  name); `--click "role=tab:Style"` (round 2's build already opens the row there);
  `--click "Add to Shape"`; `--click "Size"`; `--click "Size by attribute"` (round 2's build
  opens a titled pop-out with a search box); `--click "role=option:Influence"`. End state: Size
  reads "1 to 3", the legend gains "Size: Influence" (walked on both builds; round 2:
  `rounds/round-2/pilot/T9-A/`, `T9-B/`). Round 2's Size field draws no "Open list" arrow before
  it is bound.
- **Round 3 path (8 steps, 10 commands; walked: `rounds/r2/pilot/T9/`):** open the sample; rank; `--click
  "PageRank"` (the run row, opening on Style); `--click "Add to Shape"`; `--click "Size"` (the
  from-data list opens at once, with "Fixed size" first); `--click "role=option:PageRank"`. End
  state: Size reads "1 to 3", the legend reads "Size: PageRank". The chain-link icon ("Size by
  attribute") stays as the way back to the list after a fixed size was chosen (walked: Escape on
  the list leaves a fixed "1", no Size entry in the key; the chain-link reopens the list). Enter on
  the only Analyze match now opens its form, so `--key Enter` may replace `--click "PageRank"`.
- **Round 2 and round 3 scoring.** Round 2: a new Size line arrived as a fixed "1"; stopping there
  was `stopped-at-toggle` (or `false-done` if the participant said the sizes changed), and finding
  the chain-link was the success path, S with no other detour. Round 3: the same end state and the
  same F codes; choosing "Fixed size" in the list and stopping is `stopped-at-toggle`. Reaching the
  binding by the chain-link after closing the list or choosing "Fixed size" is a detour then a
  correction: SD on round 3, where the same clicks were the S path on round 2. Record for every
  sizing session: whether the list was used, closed, or answered with "Fixed size", and whether
  the participant mentioned the sizes not changing (18 of 18 did in round 2; that share is what
  credits the change).
- **Meaning:** "higher PageRank" (or "bigger means more Influence") names the sizes; the colors
  are the same PageRank ramp. Round 3: the key reads "Size: PageRank" and "Color: PageRank".
- **Partial:** SD if sized by a measure that is not a ranking but defensible (degree is a ranking),
  or if the sizes are bound but the participant cannot say what sizes or colors mean. F codes:
  `false-done` (only the automatic color changed), `stopped-at-toggle`, `wrong-row`,
  `meaning-wrong`.
- **Keyboard path (80 keys on Les Miserables; round 3: 57 on Les Miserables, 60 on Florentine
  families, `tmp/researcher/r3/keypaths.out`):** card; open; rank; sizes. Florentine families is
  the same with its own sample. **Screen-reader check:** the legend's "Size: Influence" with its
  range (0.003299 to 0.07543) as text ("Size: PageRank" on round 3); the Size line's value "1 to 3". Nothing is announced when
  the size binds; record that against bar 8, not against Morgan.

## T10. Names on every dot

- **Success:** a label line bound to the name attribute (`name` for Les Miserables, `label` for
  College football) on Everything or another row covering every node; names drawn on the canvas;
  and the participant reads the hidden-for-overlap count and says why some are not drawn (the
  build has no control that shows every name).
- **Path (4):** open the sample; `--click "Everything"` (opens its Style tab);
  `--click "Add label line"`; `--click "role=option:name"` (or `label`); read the count statement.
- **Partial:** SD if names are drawn but the participant never noticed the hidden ones, or `id`
  was used where it differs from the names (College football). A claim that every name is
  written while the screen shows some hidden is recorded as a false "done" (`truth-on-screen`)
  whatever the task grade. F codes: `stopped-at-toggle`, `wrong-attribute`, `wrong-row`,
  `never-found`, `dead-end`.
- **Per dataset:** graded and reported per dataset; each half needs 3 of 4. A pass on College
  football with a fail on Les Miserables is a wording echo (`label` the attribute, "Add label
  line" the control), not a pass. On round 3 the attribute also shares a word with "Show all
  labels"; the same rule covers it.
- **Round 3 route to every name (5, walked: `rounds/r2/pilot/T10/`):** the round 2 path, then
  `--click "Show all labels"` (a checkbox beside the count; the round 2 notes called it a switch). End state: the statement reads "77 labels" ("115 labels")
  with no hidden part, and every name is drawn. Names may overlap one another where dots are close;
  that is the switch working, not a defect against the task.
- **Round 2 and round 3 scoring.** The success definition does not change: a label line bound to
  the name attribute on a row covering every node, names drawn, and the count read correctly.
  - Round 2 (no switch): S = names drawn, the participant reads "N hidden to avoid overlap" and
    says why some are not drawn. Reaching every name was possible only by View > 2D or zooming,
    and was recorded, not required.
  - Round 3, switch on: S = names drawn, the statement shows no hidden part, and the participant
    says every name is now written. That claim matches the screen and is not `false-done`.
  - Round 3, switch not found: graded exactly as round 2 (S when the hidden count is read and
    explained; SD when the hidden names were never noticed). The prompt asks for every name, so
    record "every name reached: yes / no" for every session apart from the grade; that share is
    what credits or fails the switch.
  - Both rounds: a claim that every name is written while the statement shows a hidden part is a
    false "done" (`truth-on-screen`). Turning the switch on and then saying names are still
    missing, with the statement showing none hidden, is `read-wrong` on that claim only.
  - Record wrong turns spent hunting for the hidden names (about 5 per session in round 2).
- **Keyboard path (54 keys on Les Miserables, 56 on College football):** card; open; names (type
  `name` or `label`). **Screen-reader check:** the live region's "77 labels, 7 hidden to avoid
  overlap" ("115 labels, 14 hidden to avoid overlap" on College football), also the line's text
  "Abc name" in the Style tab. Round 3 (walked by keys, 53 keys on Les Miserables, 55 on College
  football): the live region reads "77 labels, 7 hidden"; Tab to "Show all labels" (3), Space:
  focus `checkbox "Show all labels"` checked, and the live region reads "77 labels". If the change to the statement is not announced, record it against bar 8,
  not against Morgan.

## T11. Untangle the drawing

- **Success:** a different layout method applied (not a re-run of the same one) and node
  positions visibly changed between screenshots. Whether it "helped" is recorded as an opinion,
  not graded; "it did not help" is the expected answer on this build and is not a failure.
- **Path (3 on round 1's build, 4 on round 2's):** open the sample; `--click "Layout"` (r); pick
  another method. On round 2's build Layout opens a list of methods; picking one opens its form
  (a one-line description, its options, "Under a second") and `--click "Apply"` draws it
  (walked: `rounds/round-2/pilot/T11-v2/`, Spectral then Circle). "Force, flat" is gone (folded
  into Force). Picking a method and closing the form without Apply changes nothing, which is not
  a silent commit: nothing was committed.
- **Partial:** SD if the method changed only after a detour. F: only Re-run or the seed changed;
  `never-found`; or the arrangement did not change and they said it did (`false-done`).
- **The "No crossings" refusal.** On Les Miserables (not planar) "No crossings" cannot draw. On
  round 2's build it is greyed in the Layout list and cannot be picked, with the line "the layout
  "planar" cannot draw this graph without crossings: G is not planar." under it (recorded at the
  round 2 pilot; "Rings around a node" and "Tree" are greyed with "Select a node first", three
  others with "Needs a node attribute to group by"). A participant who reports that No crossings
  cannot be used here has read the screen correctly; that is not `false-done` and not a wrong
  turn, and it is not a success by itself. A participant confused by "planar" or "G" is a wording
  finding (the line is graphty-element's own English shown as is). On the round 1 build there is
  no line (a silent no-op, a build defect); a participant who stops there is graded as before and
  the session marked build-decided.
- **Group layouts after a community run (round 3, walked: `rounds/r2/pilot/T11/groups/`).** Trying a group layout after
  a community run is the right model for "clusters easier to tell apart". Path (about 8): open the
  sample; `--key Shift+A`; `--type Louvain`; `--click "Louvain"`; `--click "Run"`; `--click
  "Layout"`; `--click "Rings by group"` (or "Columns by group"); the form opens grouped by the
  Louvain result; `--click "Apply"`. End state: positions change and the groups sit apart.
  "Two columns" needs exactly two groups and stays refused on Louvain's six, with graphty-element's
  own sentence 'the layout "bipartite" needs exactly two groups, and "results.louvain.group" names
  6'; reading that refusal is correct, as with No crossings. On the walk the forms opened with
  "Group by: Communities" already chosen. Accept Rings by group and Columns by group alike as the
  group route; expect "did it help" to differ between them (concentric rings barely separate the
  groups; columns do). Columns by group draws its columns out of the key's order (Group 6, 1, 5, 3,
  4, 2 left to right); a participant who matches columns to the key by color has read it right.
- **Round 2 and round 3 scoring.** The success definition does not change (a different layout
  applied, positions changed; "helped" is an opinion).
  - Round 2: the group layouts stayed greyed with "Needs a node attribute to group by" even after
    a community run. A participant who read that and applied another layout is S (SD if it took a
    detour); one who stopped there with nothing applied is F `dead-end`, marked build-decided.
  - Round 3: a group layout applied with the community result is S. If a group layout is still
    greyed after a finished community run, that is a build defect (the change did not land):
    record it, and grade a participant who stopped there F `dead-end`, build-decided, as in round 2.
    Greyed before any community run (Les Miserables has no attribute to group by) is correct and
    not a defect.
  - Record for every session whether a community run was made and whether a group layout was
    tried; that share is what credits the change.

## T12. One character and who he is tied to

- **Success A:** Javert selected; one fact about him read (degree 17, or a value); his neighbors
  listed on screen by name and the participant names at least three of them from that list and
  says 17. His neighbors, spelled as on screen (the list is alphabetical, with no chapter counts):
  Babet, Bamatabois, Claquesous, Cosette, Enjolras, Fantine, Fauchelevent, Gavroche, Gueulemer,
  MmeThenardier, Montparnasse, Simplice, Thenardier, Toussaint, Valjean, Woman1, Woman2. Spaced
  spellings ("Mme Thenardier", "Woman 1") are accepted too.
- **Success B:** Medici selected; the six families named from the screen: Acciaiuoli, Albizzi,
  Barbadori, Ridolfi, Salviati, Tornabuoni (15 families, 20 marriages; the name attribute is
  `name`).
- **Keyboard path (27 keys on Les Miserables, 30 on Florentine families):** card; open; Escape;
  `/`; type the name; Down arrow; Enter (focus moves to the node's "Summary values"); Tab to
  "Degree 17" (1); Enter. Focus moves to the section "Javert's 17 connections" ("Medici's 6
  connections"), whose names follow.
- **Path (6):** open the sample; `--key /`; `--type Javert`; `--key ArrowDown`; `--key Enter`;
  `--click "Degree"` on Values (the list "Javert's 17 connections").
- **Path by the Neighborhood command (6 or 7, round 2 build):** the same first five steps; then
  `--key g` (6), or right-click the node (`--rclick-at` on its dot, or `--rclick "<name>"` when
  its name is drawn) and `--click "Neighborhood"` in the context menu (7). Round 2's build has no
  floating selection bar, and Shift+F10 opens the context menu only with focus on the canvas.
  With one node selected the command selects the neighbors and opens the same list, "Javert's 17
  connections" ("Medici's 6 connections"); walked: `rounds/round-2/pilot/T12-A-g/`,
  `T12-B-g/`, `T12-A-ctx/`. It counts exactly as the Degree route does: S when the list is
  reached this way with no detour. Keyboard: the same keys as above, with G in place of Tab and
  Enter on "Degree 17" (26 keys on Les Miserables, walked on round 2's build). On the round 1
  build G and Neighborhood only selected the neighbors and listed no names (the several-node
  Summary): not a success path there, and a participant who stopped on that Summary is graded by
  the F codes below as before.
- **Round 2's Degree row carries a chevron** ("Degree 17 >"), a cue round 1's build did not have.
  Record which route each participant took (Degree row, G, the context menu, dots one at a time)
  so the two changes can be told apart.
- **Round 3:** the chevron is part of the row's button: a click on it opens "Javert's 17
  connections" (walked: `rounds/round-3/preflight/C-chevron2/06.png`). Record whether the
  participant clicked the chevron or the word; both are the Degree route. Selecting a node
  recenters the camera, so the lowest nodes can sit under the toolbar; no neighbor in either
  answer is hidden by it.
- **Partial:** SD if neighbors were read from the Edges table or by clicking around the drawing.
  F codes: `ids-not-names`, a count with no names behind it, names from memory (the screenshot
  never listed them), `never-found`.

## T13. A picture and the numbers for a report

- **Success:** two downloads: an image whose picture matches the screen and carries the key to
  the group colors; a CSV (or XLSX) with one row per character and the group each is in.
- **Path (6, round 1's build):** `--key Control+e` (or Main menu > Export...); `--click
  "role=tab:Image"`; `--click "role=button:Export"`; `--key Control+e`; `--click
  "role=tab:Data"`; `--click "role=button:Export"`. Until the export dialog fix, its two kinds are
  grid cells: use `role=gridcell:Image` and `role=gridcell:Data`. A bare "Data" can reach the left
  rail's Data button behind the dialog.
- **Path (9, round 2's build; walked: `rounds/round-2/pilot/T13-v2/`, `T13-v5/`):** `--key
  Control+e` (Image is the first row and already chosen); `--click "role=button:Export"`
  (`les-miserables_current-view.png`); `--key Control+e`; `--click "Data"` (inside the open
  dialog it resolves to the dialog's row); `--click "Format"`, `--click "role=option:CSV"`;
  `--click "Table"`, `--click "role=option:Nodes"`; `--click "role=button:Export"`
  (`les-miserables_nodes.csv`: `id,name,results.louvain.group,results.louvain.groupSize`, 77
  rows, groups numbered by size, 1 = the 20-member group). The Data row's default format is
  "Graphty JSON" (the whole project, `Les Miserables.graphty.json`), which Excel cannot open:
  `wrong-file-type` if that is the only data file. CSV's default table is Edges
  (`les-miserables_edges.csv`, source, target, shared_chapters): one row per tie, no group,
  "numbers without the computed column". A yellow box "CSV cannot hold everything" lists what the
  file leaves out; it is not an error. These defaults are new on round 2's build.
- **Partial:** SD if the files are right after a detour. F codes: `no-key`, `wrong-file-type`,
  numbers without the computed column. The image is checked with the picture checklist. This task
  runs only after the image legend fix (graphty-element issue #133) passes this path.
- **Screen-reader check:** the live region's "Exported les-miserables_current-view.png" (and the
  CSV's name for the data file).
- **Round 3 (walked: `rounds/r2/pilot/T13/`):** the same 9 steps; the key reads "Color: Louvain"
  with Group 1 to Group 6, and the run row is "Louvain". The tool no longer prints `ambiguous` on
  "Format" and "Table". (No keyboard participant takes T13 in round 1.)

## T14. Stop for the day and come back

- **Setup:** `rounds/pilot/T14/setup.txt` (run whole on 2026-10-06; it ends with an Influence
  row, names drawn and "77 labels, 7 hidden to avoid overlap"). Round 2 uses the identical copy
  `rounds/round-2/setups/T14.txt`, which runs whole on commit 4a7a1a7fb.
- **Success:** saved under a name the participant chose; the project closed; reopened from the
  start screen's Recent projects (or the saved file); the run, its colors and the names are back;
  the participant's "did everything come back" matches what the screen shows.
- **Path (5, round 1's build):** `--key Control+s`; `--type "<their name>"`; `--key Enter`;
  Project name menu > `--click "Close project"`; `--click "<their name>"` under Recent projects (r).
- **Path (6, round 2's build; walked: `rounds/round-2/pilot/T14-v2/`):** `--key Control+s` (the
  first Save opens "Save Les Miserables as" with a Name field); `--type "<their name>"`; `--key
  Enter` ("Saved <name> in this browser."; the header shows the name); `--click "Main menu"`;
  `--click "Back to start"`; `--click "<their name>"` under Recent projects ("In this browser - 77
  nodes - <date>"; "Opened <name>"). No file is written: the project is kept in the browser.
  "Save local copy..." in the main menu downloads a `.graphty.json` file; a participant who also
  does that has not taken a wrong turn. The header name is an inline rename field: clicking it
  edits the name, which is not a save.
- **Partial:** SD if a detour (a download they then had to find). F codes: `lost-state`,
  `wrong-data` (reopened the sample), `false-done`.
- **Closing the tab:** if the participant closes the tab or browser and the rehearsal showed the
  tool can reopen the same storage, that path is accepted. If the tool cannot, the session is void
  (tool fault) and re-run, never failed. The rehearsal settled it: `real.mjs --reopen` reopens the
  same storage, and Recent projects still lists the save (`rounds/r0/pilot/T14/09.png`).
- **The run's count after a reopen.** A reopened project's Influence row shows its color ramp but
  not its count "77" (a graphty-element defect: a restored run has no summary). "Everything came
  back except the number beside Influence" is a correct reading and counts as a match, not
  `lost-state`. After the reopen the inspector shows the Graph overview, not the row selected
  before; that is a selection, not work, and is not `lost-state`.
- **Keyboard path (105 keys including the setup's work, round 1's build):** Control+s; type the
  name; Enter (focus goes to the Analyze button; live region "Saved as <name>"); Tab to "Project:
  <name>" (20), Enter; Down arrow to "Close project" (5), Enter (focus falls to the page body); Tab
  to the project under Recent projects (5), Enter (live region "Opened <name>"; focus falls to the
  page body). Check: the Influence row in the outline; select Everything for "77 labels, 7 hidden
  to avoid overlap".
- **Keyboard path (103 keys including the setup's work, round 2's build):** Control+s (focus in
  the Name field); type the name; Enter (focus goes to the Analyze button; live region "Saved
  <name> in this browser."); Tab to "Main menu" (21), Enter (focus on "Back to start"), Enter
  (focus falls to the page body); Tab to the project under Recent projects (5, a grid cell
  "<name> In this browser - 77 nodes - ..."), Enter (live region "Opened <name>"; focus falls to
  the page body). Check as above.
- **Round 3 (walked: `rounds/round-3/preflight/T14/`; keys 97, `tmp/researcher/r3/keypaths.out`):**
  the same path; the setup now ends with a "PageRank" row, names drawn and "77 labels, 7 hidden".
  After the reopen the row reads "PageRank" (still with no count) and the live region says
  "Opened <name>" and then "PageRank finished" again (a run restored, not re-run: not `lost-state`,
  and not a new run).

## T15. A whole first session

- **Success (all five, in one sitting, none undone by a later step):** (1) the sample (A) or
  `friends.csv` (B) drawn; (2) a ranking run from Analyze, finished; (3) node sizes bound to that
  result, visibly different (a Size line), and the participant says what a bigger dot means and
  what the colors stand for; (4) a label line bound to the name attribute on a row covering every
  node, names drawn; (5) an image downloaded that passes the picture checklist.
- **B (own file):** the names are in `friends.csv`'s `id` column, so a label line bound to `id` is
  right here; ids such as "n0" where names belong is `ids-not-names`.
- **Meaning:** "Influence" or "PageRank" names the sizes and colors (see "On-screen names of
  runs").
- **Path (about 18):** T2's step; T7's run; T9's size steps; T10's label steps; T13's image steps.
- **Round 3 (walked: `rounds/r2/pilot/T15/`; 15 commands on A with "Show all labels", 13 on B):**
  the same steps with T7's, T9's and T10's round 3 entries (about 17:
  the size step loses "Size by attribute"). Step 3 is scored as T9's round 3 entry; step 4 needs
  names drawn, not every name, so "Show all labels" is not required on either round; record
  whether it was used. With it on, the picture checklist's "the names drawn on screen are drawn
  in the image" means every name. The screen-reader check reads "Size: PageRank". Round 3 keys
  (walked): 105 on Les Miserables, 103 on the own file, which is now walked whole by keys; the live
  region says "PageRank added, running", then "PageRank finished", "77 labels, 6 hidden" ("20
  labels, 0 hidden" on the own file) and "Exported <file>.png". Main menu > Export... now keeps
  focus in the dialog (Escape returns it to "Main menu"; 51 keys from the start to the image by the
  menu route).
- **Watch on B (not pre-scored):** in the default 3D view Ava's dot (#2) is drawn larger than
  Farah's (#1, partly behind Chloe's), because nearer dots look bigger. A participant who names Ava
  as the top person from dot size alone is `meaning-wrong` on that claim; record it and whether the
  screen's values were read.
- **Partial:** report the number of the five steps reached for every session. SD allows the order
  to differ and detours. F codes: any of the above; the commonest expected are `false-done` on the
  size step (the automatic color taken for the size), `stopped-at-toggle` on names,
  `ids-not-names` on B, `meaning-wrong`, and `no-key`. Runs only after the image legend fix
  passes; if it cannot land, grade steps 1-4 plus "an image was downloaded" and record the legend
  apart (`criteria.md`, preflight).
- **Activation measure:** whether the participant picked a ranking measure and ran it with no
  help, no tooltip and no detour.
- **Keyboard path (118 keys on Les Miserables on round 1's build, 107 on round 2's, where focus no
  longer falls to the body after the Style picks):** card; open; rank; sizes; names; image. On round 2's build the own
  file was also walked by keys in screen-reader mode (`tmp/researcher/r2/kb-T15B/`: Control+o,
  the file, Shift+A, PageRank, Enter, Enter). On the own
  file the same after opening it by Control+o (opening and ranking were walked by keys on
  friends.csv; sizes, names and image were walked by keys on Les Miserables only, with the same
  controls). **Screen-reader check:** "PageRank added, running" then the Influence row in the
  outline (no "finished" announcement exists: record it against bar 8); the legend's "Size:
  Influence"; the live region's "77 labels, 6 hidden to avoid overlap"; "Exported
  les-miserables_current-view.png".

## T16. First look

- **No grade.** Record: steps from the start to the first drawing; whether any analysis was run
  without being asked; if one was, whether its result was read correctly (against the reference
  values); the verdict (keep using it or not) and its reason; which data was used (sample or
  `friends.csv`).
