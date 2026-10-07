# Grade: session r3-s56 -- Ruth (reporter with a contacts sheet), T16 "First look", friends.csv

Build: commit f108a2350, graphty 0.8.53 (build stamp b7590f8de, session.json), 1440 x 900, sighted
mode. Graded from the last screenshot (25.png), the transcript and the screenshots it names. No
files were downloaded (no `downloads/` folder; she looked at Export and chose not to save). Not
from the participant's rating (5 of 7).

## Grade: none (T16 is not graded)

The answer key gives T16 no grade; it asks for five records instead. They are below. The required
grade field of the tally carries S only because the field cannot be empty: Ruth reached a drawing,
ran an analysis on her own and read it correctly.

- **Void:** no. One tool miss (step 6: the find box is not reachable by its placeholder text, so
  nothing was typed and the screen did not change). Ruth never saw it; the next command reached the
  box by position. It changed nothing a person would have met.
- **Build-decided:** no. No build defect was met, so there is no scripted repro.
- **False "done":** none. Her debrief claims (loaded the file with nothing dropped, Ava's six ties
  with weights, Betweenness ranking Ava then Ivan, names on the drawing, a picture and a node table
  available from Export) each match a screenshot: 04.png, 09.png, 14.png, 18.png, 25.png. She did
  not claim to have saved anything.

## T16 records

| Record | This session |
|---|---|
| Data used | `friends.csv` (her own kind of file), through "New from data..." and "choose a file..." |
| Steps from the start to the first drawing | 4 commands: "No thanks" on the usage card (optional), "New from data...", choose the file, Load (05.png: 20 nodes, 41 edges). The load screen first showed 41 rows read, 20 nodes, 41 edges, with line numbers (04.png) |
| Analysis run without being asked | yes: Betweenness, from Analyze, Run (steps 10-12, 12.png). She passed over PageRank's "Start here" because Betweenness's one-line description matched her question |
| Result read correctly | yes. "Ava is the one most chains run through, then Ivan, well ahead of everyone else", from Values (14.png: Ava 51.27, Ivan 40.02, Sana 21.35). Reference: Ava 51.27, Ivan 40.02, Sana 21.35. She also matched it to the drawing once names were on (18.png: Ava in the middle, Ivan bridging to the right). She could not say what the value counts (problem 2) and said so; that is not a misreading |
| Verdict | would keep using it, "for the first pass on a story, to see who sits in the middle", with reservations about explaining its numbers. Reasons: "never uploaded" and "Local only" up front and again on Export; the load screen's row counts and line numbers she could match to her sheet; Ava's neighbor list turning "Degree 6" into six names with her weights; a plain sentence under every analysis name |

Beyond the task she put names on the drawing (Style, Label +, `id`, steps 16-18) and found a
per-node CSV of the result in Export (steps 19-25).

## Counts

| | This session |
|---|---|
| Commands (real.mjs, after the start) | 24 |
| Wrong turns | 1 |
| Tool misses (not counted) | 1 (step 6) |

- **The wrong turn:** at step 13 she clicked "Betweenness" in the outline expecting a ranked list
  and got its Style tab (Fill, Shape, Effects, Label). She found the list under "Values" one step
  later (step 14).
- **Exploration (not counted):** clicking Ava and her Degree arrow (steps 8-9); opening Advanced on
  the result (step 15); Export's Image and Data panes, the format list and the Table switch (steps
  19-25). Switching Table from Edges to Nodes (step 25) was required by the export's default, not a
  wrong choice of hers.

## Problems

Severity 0-4 (Nielsen). Opinion-only findings are held one level down. "Confirmed" means seen in two
or more round-3 participants.

| # | Sev | Kind | Problem | Evidence |
|---|---|---|---|---|
| 1 | 2 | behavior | The first drawing has no names. The only way she found to add them was a label line under the Style of an analysis result, and the attribute list offers "id", not "name"; she picked it only because Ava's card had shown "id Ava". She also worried the names would exist only with that coloring. Confirmed (also r3-s55) | Steps 5 and 16-18, 05.png, 17.png, 18.png |
| 2 | 2 | wording | Betweenness's "Made with > Advanced" shows only "Sample size 0", in an input box. She read it as "it counted nobody". Nothing says 0 means exact (all pairs), what the value counts, whether the weight column was used, or whether direction mattered; she trusted the ranking but "could not explain the number to my editor". Confirmed (also r3-s01, r3-s05, r3-s26) | Step 15, 15.png |
| 3 | 2 | behavior | After Run, the seven nodes she had selected earlier keep their yellow rings over the Betweenness color, and the orange ramp's shades were too close for her to tell who is highest. Only the Values tab answered her. Confirmed (also r3-s55) | Step 12, 12.png |
| 4 | 2 | behavior | Clicking a finished run in the outline opens its Style tab, not its values. Confirmed (also r3-s55) | Step 13, 13.png |
| 5 | 2 | behavior | Export > Data opens on Graphty JSON shown as raw code; CSV is one of eighteen formats and defaults to the Edges table, which holds no result. The analysis values appear only after switching Table to Nodes | Steps 21-25, 21.png, 23.png, 25.png |
| 6 | 2 | wording | The CSV warning "CSV cannot hold everything" reads as data loss at first glance, lists colors and positions a reader did not ask for, and says the result columns are written "only by a second export with table: \"nodes\"" -- program syntax rather than the "Table" control's own words. The node CSV's headers are dotted keys (`results.betweenness.value`) and values carry fifteen decimals | Steps 23 and 25, 23.png, 25.png |
| 7 | 1 | opinion | PageRank is badged "Start here" although Betweenness's own line matched her question; a hurried user might follow the badge | Step 10, 10.png |
| 8 | 1 | opinion | A "who knows whom" file is drawn directed; she wondered whether mutual ties were read right. Expected import per the answer key, but nothing says why or how to change it. Confirmed (also r3-s55) | Step 5, 05.png |
| 9 | 1 | opinion | The load screen's header "node (20) --friends (41)--> node" was cryptic; the sentence under the preview said it plainly | Step 4, 04.png |
| 10 | 1 | opinion | The Analyze card does not say whether it runs on the 7 selected nodes or on all 20; she ran it to find out (all 20) | Step 11, 11.png |
| 11 | 0 | opinion | Overview's "Density 0.1079" meant nothing to her | Step 5, 05.png |

**What worked:** "Files are read on this computer and never uploaded", "Local only" and Export's
"nothing is uploaded" answered her first concern. The load screen's "0 node rows and 41 edge rows
read; the load makes 20 nodes and 41 edges", with line numbers, let her check nothing was dropped.
Find took her to Ava, and Degree's arrow turned "6" into six named neighbors with her weights. Each
analysis had a plain sentence and a time estimate ("Under a second"). Values gave a named, ranked
Top 10 with a median, and the node CSV gave every name with value and rank.
