# Grade: session r2-s55 -- Elena, first look (friends.csv)

Build: commit 4a7a1a7fb, graphty 0.8.53 (session.json). Graded from the last screenshot (18.png),
the saved picture (downloads/friends_current-view.png), the transcript and one scripted re-run on
the same build.

- **Grade:** none. "First look" is a measure, not a graded task: it has no success path (see
  answers.md and tasks.md). The record it asks for is below. For tables that need a letter, this
  session counts as S: she reached a drawing, ran an analysis, read its result correctly and gave
  a reasoned verdict.
- **Data used:** her own file, friends.csv, dropped on the window.
- **Steps to the first drawing:** 2 actions after the start: "No thanks" on the usage-data card,
  then dropping the file. The drawing appeared with no import questions (03.png).
- **Analysis run without being asked:** yes, one. PageRank ("Influence"), picked because of its
  "Start here" tag (steps 5-7).
- **Read correctly:** yes. The Top 10 she read in 10.png -- Farah 0.06608, Ava 0.06423, Hana
  0.05883, range 0.04382 to 0.06608 -- matches the reference exactly, and her closing sentence
  names the same three people. Two side readings were wrong but did not touch the result: at
  step 4 she took Pia for the most connected because her ball looked biggest (all balls are the
  same size; Pia is nearer the camera), which the "#11 of 20" later corrected; at step 15 she
  guessed the lighter top half were newer members, which nothing in the data supports.
- **Verdict:** probably keep using it, "for a first look at a spreadsheet like this". For: the
  file opened with no questions and nothing to install; "Start here" and the Top 10 got her an
  answer in a few minutes; the "To share" export. Against: method names in Analyze, names only
  through Style > Label > "id", legend numbers that mean nothing to her, the selection ring in the
  exported picture.
- **Steps:** 17 commands after the start. **Wrong turns:** 1 -- step 9 (09.png) clicked the
  Influence row expecting a ranked list and got the Style tab; the list was behind Values.
- **False "done":** none. Her closing claims (a ranked list, names on the dots, an exported
  picture) match 15.png, 18.png and the saved file. Near miss: one name is not drawn -- Chloe's,
  whose ball sits half behind Farah's at the bottom -- and the panel says "20 labels, 1 hidden to
  avoid overlap" (15.png). She never claimed every name was on, and did not notice whose was
  missing; the screen does not say.
- **Tool prints:** two `ambiguous` resolutions ("Influence" at steps 9 and 12, "Export" at step
  18); each took what she meant. No void.

## Problems

Severity 0-4 (Nielsen). The build defect was reproduced by
`rounds/round-2/repro/r2-s55/repro.sh` (output in `run/`, `run.log` and
`run/downloads/friends_current-view.png`), with the same result as the session.

| #   | Sev | Kind         | Problem                                                                                                                                                                                                                                                                                                                                                                                          | Evidence                                                                                                                                                                                                                                                                                |
| --- | --- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 2   | build-defect | The exported "To share" picture draws the selected node with the yellow selection ring and an olive selection fill instead of its data color. The #1 node by Influence (Farah) comes out in a color the legend beside it does not contain, so a reader of the shared image cannot place her on the scale. Nothing in the Export dialog says the selection is included or offers to leave it out. | Step 18, 18.png and downloads/friends_current-view.png. Repro: select Farah from the Top 10, then Main menu > Export... > Export; `run/downloads/friends_current-view.png` shows the same ring and fill. "Farah's yellow -- anyone looking will think she's special in some other way." |
| 2   | 2   | behavior     | Names are not on the first drawing, and the way to them is Influence or Everything row > Style > Label + > "id". "id" read to her as a database number; she picked it only because the node panel had shown "id Pia" earlier.                                                                                                                                                                    | Steps 3, 13-15, 03.png, 14.png. Same finding as round 1's first-look session (r1-s49b).                                                                                                                                                                                                 |
| 3   | 2   | behavior     | Influence and the node's Degree disagree with no explanation: Farah is #1 with Degree 4, Pia #11 with Degree 4. She trusted the ranking because it said "Start here", without understanding it. (The graph is directed; the panel's single Degree does not show in-links versus out-links.)                                                                                                      | Step 11, 11.png. One participant.                                                                                                                                                                                                                                                       |
| 4   | 2   | behavior     | In the default 3D view, nearer balls look larger, and she read size as importance before any size was set (took Pia as the most connected). Nothing on screen says size carries no meaning yet.                                                                                                                                                                                                  | Step 4, 03.png, 04.png. One participant.                                                                                                                                                                                                                                                |
| 5   | 2   | behavior     | Clicking a run's row (Influence) opens its Style tab; the ranked list she wanted is behind the Values tab.                                                                                                                                                                                                                                                                                       | Step 9, 09.png, 10.png.                                                                                                                                                                                                                                                                 |
| 6   | 1   | wording      | The Analyze list is method names (Betweenness, Eigenvector, Katz, HITS); she nearly closed it and stayed only for the "Start here" tag. The list says "PageRank" and everything after says "Influence"; she was unsure they were the same thing.                                                                                                                                                 | Steps 5-7, 05.png, 07.png. Matches round 1's first-look findings.                                                                                                                                                                                                                       |
| 7   | 1   | wording      | The legend shows raw scores (0.04382 to 0.06608) that mean nothing to her; the rank ("#11 of 20") did. Also "Density 0.1079" on the Overview.                                                                                                                                                                                                                                                    | Steps 3, 7, 18; 03.png, 07.png, the saved picture.                                                                                                                                                                                                                                      |
| 8   | 1   | behavior     | One label hidden to avoid overlap (Chloe, behind Farah) and the exported picture has it missing too; the screen does not say whose name is hidden.                                                                                                                                                                                                                                               | Step 15, 15.png ("20 labels, 1 hidden to avoid overlap"), the saved picture. Same as r1-s49b problem 3.                                                                                                                                                                                 |
