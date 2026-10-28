# Grade: session r1-s36 -- Alex, a regular analyst, puts the football coach's two spreadsheets together (players.csv + passes.csv)

**Grade: S** (success). Both files are in one drawn network, the counts are stated and right for
the choice he made, and the row that did not fit is named in full. Before loading, the import page
flagged one pass row whose receiver is not in the squad list; he opened it (line 17, s04 to s11, 3
passes), chose "Add", and loaded 11 nodes and 18 edges. The answer key accepts either Add (11 and 18) or Leave out (10 and 17) when the participant says which row did not fit, and he did, in the
session and in the wrap-up ("line 17, s04 -> s11, 3 passes ... s11 isn't on the squad list").

Build seen: `946256efb876 graphty@0.8.56` (session.json), at 1440 x 900, no uncommitted changes.
This is the frozen build named in the criteria. Every step ran and every screenshot matches its
command. Step 10's `--click "passes"` matched two things on screen (the preview table's column
header and the "Role of passes" list) and the tool took the header, as it printed; the participant
saw the column sort and recovered with a click on the list. That is the participant's ambiguous
target, not a tool fault. The session is not void.

## What the last screen shows (`16.png`)

- Header "players and passes"; the Graph tree holds Selection (1) and Everything.
- The drawing has 11 dots joined by arrows; s11 is selected (yellow ring) and is the largest dot.
- The inspector shows node s11: id s11, Degree 1. No name and no position, because s11 has no row
  in players.csv.
- Two screens earlier (`14.png`), right after Load, the Graph Overview reads Nodes 11, Edges 18,
  Directed, Loaded weight "passes (closer)", Density 0.1636, Components 1, "Edges per node 1 to 4,
  mean 3.273", with "From 2 files" under the title. The find box at `15.png` lists node s11 and
  edge "s04 -> s11", so the added row is on the graph.
- Before Load (`09.png`): "10 node rows and 18 edge rows read; the load makes 11 nodes and 18
  edges", with "Add" chosen, and the unmatched row shown as Line 17, from s04, to s11 (no node
  row), passes 3.

## Measures

- **Steps:** 16 after the start (`02.png` to `16.png`). The graded end state (both files loaded,
  counts on screen) is reached at step 14; steps 15 and 16 were his check that s11 arrived. The
  success path is about 8 steps; the extra steps are the weight setting (3 steps) and the check.
- **Wrong turns: 1.** Step 10 (`10.png`): he clicked the word "passes" meaning the role list
  under it, and sorted the preview table's column instead. Recovered on the next step.
  Setting "passes" as the weight with "Closer" (steps 11 to 13) is not part of the task, and the
  answer key asks graders to record anyone who stops to set it: he did, unprompted, after reading
  "Weight: none (each edge counts 1)". "Closer" is the right reading (more passes, a stronger
  tie), so no `meaning-wrong`.
- **False "done": none.** His claims are "11 nodes (the 10 players plus s11) and 18 edges (all 18
  pass rows), directed, with the pass count as the weight" and "the Overview panel numbers match
  the files". All are on screen (`14.png`, `09.png`). truth-on-screen: no wrong claim. His guess
  that s11's size is the 3D view's perspective is labeled as a guess ("probably"), not a claim.
- **Unmatched row found:** before loading, from the import page's own report (`07.png`,
  `08.png`), not after a detour.
- **Self-rating** (6 of 7) was not used in grading.

## Problems

Severity runs from 0 to 4 (Nielsen). "Confirmed" means seen in two or more participants.

1. **Severity 2 (confirmed: this session and r1-s34, same task, same dot) -- s11, a guest with one
   pass, is drawn as the largest dot on the picture, and nothing on screen says why dots differ in
   size.** The start was empty and no style was added, so the size is most likely the 3D view's
   perspective (s11 nearer the camera); a reader cannot tell that from a size meaning something.
   He said he "would have reported him as the hub" had he not checked. Not a 4: he checked and drew
   no wrong conclusion. Evidence: `14.png`, `16.png`, step 16 remark, wrap-up.
2. **Severity 2 (confirmed with r1-s33, r1-s34, r1-s35) -- a whole-number column named "passes" on
   an edge table comes in as a plain Attribute, with "Weight: none (each edge counts 1)", and
   nothing on the page suggests making it the weight.** He noticed and fixed it himself; a user who
   does not read that line gets every tie counted the same. Evidence: `07.png`, `09.png`, step 7
   and step 9 remarks, wrap-up.
3. **Severity 2 (confirmed with r1-s34, r1-s35) -- "Leave out" is the preselected choice for the
   unmatched row, and which choice is on is shown only by an outline.** He read the outline
   correctly, but a quick Load drops a pass silently except for the "1 left out" line. Evidence:
   `07.png`, `08.png`, step 8 remark, wrap-up.
4. **Severity 1 -- the column header and the role list above it share the name "passes", and a
   click on the word sorts the table instead of opening the list.** Evidence: `10.png`, `11.png`.
5. **Severity 2 (confirmed with r1-s34, r1-s35) -- no names on the dots after loading, and the
   find box lists players by id (s01, s11), not by name, although players.csv has a name column.**
   He could not tell who is who without searching or clicking. Evidence: `14.png`, `15.png`,
   wrap-up.
6. **Severity 1 (opinion) -- the "Closer" explanation's example is about emails between two
   people**, which reads oddly on a football file; it did not mislead him. Evidence: `12.png`,
   `13.png`, step 13 remark.

What worked: the import page found the unmatched row before anything loaded, showed it with its
line, ends and value on one click, and offered Add and Leave out side by side (`07.png` to
`09.png`). The "Add a table" plus was found from its tooltip on the first hover (`05.png`). The
Overview's counts and "Loaded weight" row let him check the result against the files (`14.png`).

## What this says about the round

No build defect showed up: every control did what the answer key says, and no step was spent on a
broken control. The participant spent his time on the task's real questions (did everything
arrive, what did not fit), not on implementation flaws. The problems are design findings about
what the import page leaves unsaid (weight, default for the unmatched row, names) and about dot
size on an unstyled 3D drawing.
