# Round 7 grades: how many circles, and what fewer, larger ones would take (Les Miserables)

Task as given: "How many circles of characters does the story fall into, how big is each one, and
what is the biggest one like? Then ask for fewer, larger circles and see what that would take."

Grading bar:

- Success: the Louvain run's Data tab is read (6 groups, modularity 0.565, the Sizes list); one
  group is opened in the inspector and its members or summary read; and the resolution is changed
  under "Made with" so the bar at the top of the inspector offers Rerun or Revert.
- Success with difficulty: counts and sizes found, but the retuning control found only after two
  or more tries, or the retune done through Analyze (which offers to update the same row) or "Run
  as copy".
- Failure: reads the legend's colors as the answer without counts, or cannot reach any way to
  retune.

Grades go by what reached the screen and what the participant concluded, not by how sure they
felt. Two things about the prototype matter for every grade below:

- The intended end screen is "Settings changed since the run", with Rerun and Revert. The
  prototype stops there. Pressing Rerun shows "Rerunning, cannot be stopped" and never finishes,
  and no route shows a second partition. So no participant could have seen "fewer, larger
  circles" come out; the task is graded on reaching the control that asks for them.
- On the intended path, the group step is the group's Style tab ("Paints 10 nodes", "Covered for
  Color by PageRank"). That is the only group summary the prototype offers, so opening any
  community's inspector counts as the group step. Nobody opened a group's own Data tab.

## Grades

| Participant | Their own call | Grade | Furthest point on the success path | Answer |
|---|---|---|---|---|
| Network scientist (Emma) | failure | success with difficulty | all three: run Data tab, Community 1 inspector, "Settings changed" with Rerun / Revert (render 08) | 6 groups, sizes, Q 0.565, biggest = 25 around Gavroche, loose; lower resolution |
| Marketing analyst (Jordan) | failure | success with difficulty | all three; ended on "Rerunning" after "Settings changed" (renders 11, 14, 15) | 6 groups, sizes, Q 0.565, biggest = 25 around Gavroche, loose; resolution, direction unknown |
| Computational biologist (Dr. Chen) | gave up | success with difficulty | all three; "Settings changed" reached at render 07 | 6 groups, sizes, Q 0.565, biggest = 25 around Gavroche; "lower resolution and a rerun" |
| Knowledge graph engineer (Dr. Kim) | success with difficulty | success with difficulty | all three, then the Analyze form's "Run as copy" too | 6 groups, sizes, Q 0.565, biggest = 25 around Gavroche; lower resolution, ideally as a copy |
| Gephi holdout (Dr. Lindqvist) | success with difficulty | success with difficulty | community table and Community 1 inspector; never the run Data tab; retuned through Analyze, Resolution typed as 2, "Run as copy" (render 13) | 6 groups, sizes, biggest = 25, loose; no modularity; resolution "up", direction a guess |
| Genomics postdoc (Maren) | failure | failure | community table and Community 1 inspector; reached the Analyze form but never changed the value; ended on a stray "Betweenness 2" run (render 18) | 6 groups, sizes, biggest = 25, loose; no modularity; "did not get fewer circles" |

Totals: 0 success, 5 success with difficulty, 1 failure, 0 gave up. Every participant gave the
right count (6) and sizes (25, 17, 10, 10, 9, 6) within one or two clicks, and every one described
the biggest group correctly as large and loose (density 0.147, 49 edges leaving against 44
inside). The second half is where the task broke: nobody saw the 25 members of the biggest
group, and nobody was told which way to move resolution.

## Why each grade

**Network scientist -- success with difficulty, up from her own "failure".** Render 05 is the
run's Data tab (modularity 0.565, Sizes, hubs, "Made with" seed 7); render 03 is the Community 1
inspector; render 08 is the intended end screen, "Settings changed since the run" with Rerun and
Revert, reached on her first try at the resolution. She rated herself a failure because the rerun
never finished and the Analyze route's "Update Louvain row" silently put her 0.5 back to 1.0
(render 17). The first is the prototype stopping where it was built to stop; the second is a real
defect (below). The wrong turn into the left rail's Data section (render 04) makes it "with
difficulty".

**Marketing analyst -- success with difficulty, up from their own "failure".** Reached the run's
Data tab at render 11, by way of Community 1's "from Louvain" link, after five renders of wrong
menus (the "More actions" menu kept opening for Community 3) and hiding the wrong row. Then All
options, the resolution box, and "Settings changed" with Rerun and Revert (render 14). Their
conclusion -- "I found a Resolution number with no explanation of which way to move it" -- is an
accurate description of what it takes, and of what the screen failed to say.

**Computational biologist -- success with difficulty, up from their own "gave up".** Same route
as the analyst, with fewer detours: Community 1 inspector, wrong "Data", then "from Louvain" to the
run Data tab (render 04), All options, and "Settings changed" with Rerun and Revert (render 07).
They stopped because nothing confirmed what value they had set, and reopening All options showed
1.0 with the bar gone (render 10). Their stated answer, "a lower resolution and a rerun", is
correct, so this is not a give-up on the screen evidence.

**Knowledge graph engineer -- success with difficulty, as they called it.** All three steps,
plus the Analyze form's "Run as copy" as a second route. They also got the closest to a member
list: "Show members in table" filtered to Community 3's ten names, the wrong community. Many
wrong turns ("Paints 25 nodes" selecting 5, hiding PageRank changing nothing, the menu for the
wrong row).

**Gephi holdout -- success with difficulty.** Counts and sizes from the community table, the
Community 1 inspector opened, and a retune through Analyze: Resolution typed as 2 and "Run as
copy" pressed (render 13). That is the bar's second success-with-difficulty route exactly. She
never reached the run's Data tab, because the run-row link "from Louvain, Sep 28" opened the
Analyze picker (render 08) rather than the run's settings, so she never saw modularity or the
seed and listed both as missing. Her 2 follows Gephi's convention (higher means fewer, larger);
nothing on screen says whether that is right here.

**Genomics postdoc -- failure, as she called it.** Counts and sizes yes, the Community 1
inspector yes, the Analyze form yes. But the value never changed: she pressed "Run as copy" with
1.0 still in the field (render 12), and the retune ended there. She never saw modularity, for the
same reason as the Gephi holdout. Her last renders compound it: "Show members in table" from
Community 1 filtered to Community 3, "Compare with another run..." replaced the whole file with a
different dataset (render 17), and "Rerun" from the Louvain row's menu started a Betweenness run
(render 18). The grade is failure because no retune was made and her conclusion was "I did not get
fewer circles". The inability to type into the field is partly the study tool (see caveats).

## What the grades show

| Finding | Evidence | Severity (Nielsen 0-4) |
|---|---|---|
| Opening a community does not show who is in it. The node table switches to all 77 nodes, and "Show members in table" lives behind a menu | 6 of 6 tried to list the biggest group's members; 0 of 6 succeeded; 3 found the menu item | 4 |
| Resolution says nothing about direction: no hint that lower (or higher) means fewer, larger groups, and no preview of the group count before rerunning | 6 of 6 hovered or clicked for a hint and got none; 2 (Gephi holdout, network scientist) said Gephi and NetworkX use opposite conventions | 4 |
| The "More actions" menu on a selected community opens for Community 3, not the selected row | 3 of 6 (marketing analyst, genomics postdoc, knowledge engineer), each repeatedly | 4 if real; may be a prototype wiring defect |
| Changing resolution under "All options" shows "Settings changed" but never shows the new value; reopening shows 1.0 and the bar is gone | 4 of 6 reached it (network scientist, marketing analyst, biologist, knowledge engineer); all 4 said they did not know what would be rerun | 3 |
| The Analyze form's "Update Louvain row" discards the typed resolution without a word | 1 of 6 (network scientist), confirmed by render 17 | 3 |
| The run row's own "from Louvain, Sep 28" link opens the Analyze picker, while Community 1's "from Louvain" link opens the run's Data tab. The two links that look the same go to different places | 2 of 6 took the run-row link (Gephi holdout, genomics postdoc); both missed modularity and the seed as a result | 3 |
| Community colors are covered by PageRank; hiding PageRank with its eye leaves the drawing and legend on PageRank | 6 of 6 noticed the drawing never showed communities; 2 hid PageRank and saw no change, 1 hid the wrong row | 3 |
| Two controls named "Data" (the left rail and the inspector tab) | 6 of 6 asked for "Data" meaning the tab and landed on the rail | 2 (see caveats) |
| The node table's "group" column (the file's own attribute) sits beside Louvain's "Community N" | 6 of 6 raised it unprompted | 2 |
| "Paints 25 nodes" selects 5 nodes | 2 of 6 (genomics postdoc, knowledge engineer); both said it cost them trust in the counts | 2 |
| "Hub Gavroche, 16 links inside" reads as the community's inside count (44) | 1 of 6 (knowledge engineer); single voice | 1 |
| "Compare with another run..." replaced the open file with a different dataset; "Rerun" from the Louvain row's menu started Betweenness | 1 of 6 (genomics postdoc), both confirmed by renders 17 and 18; likely prototype wiring, but would be severity 4 in a product | not graded; fix the prototype |

What worked: the community table (size, density, edges inside, edges leaving) was found in one
click by 6 of 6, and 5 of 6 said it beats what their current tool gives them. The run's Data tab
(modularity with a plain-language line, sizes, a hub per group, seed) was the screen 4 of 4 who
reached it called "the page I wanted". "Run as copy" was praised by 3 of 3 who saw it as the right
way to compare two resolutions.

## Caveats on the evidence

- No participant could see a rerun result: the prototype ends at "Settings changed" and its Rerun
  never completes. The four complaints about an endless "Rerunning, cannot be stopped" are about
  the prototype's fidelity, not the design, though "cannot be stopped" on a 77-node graph drew
  comment from 3 and deserves a look.
- Clicking the resolution value under All options marks the run as changed without any typing:
  that is how the prototype simulates an edit. Some of the "I didn't type anything" reaction is
  that; the missing new value on the bar is a real design gap either way.
- The study tool clicks controls by their visible text. In the Analyze form, the resolution field
  has no text "1.0" to click, so the genomics postdoc could not get into it; two others clicked the
  "Resolution" label instead and typed. A mouse user would just click the field, so her failure to
  change the value is partly the tool. Her grade stands because no retune was made and she never
  reached the run's Data tab.
- The "Data" name clash is inflated the same way as in other tasks: `--click "Data"` presses the
  first control with that name, which is the rail.
- All six are simulated personas; agreement among them is weaker evidence than six real people.
