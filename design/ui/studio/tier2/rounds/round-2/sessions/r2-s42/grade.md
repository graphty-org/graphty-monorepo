# Grade: session r2-s42 -- Dana (returning supply-chain analyst), football team (T4 B), two spreadsheets as one network

**Grade: S** (success). Both files are in one graph and the unmatched row is named. Dana read the
import report, opened "Show the 1 unmatched row" (`08.png`: line 17, `s04 -> s11 (no node row)`,
3 passes), and chose "Add". The answer key accepts either choice when the participant says which
row did not fit. With Add the key expects 11 nodes and 18 edges. The import page (`09.png`: "the
load makes 11 nodes and 18 edges"), the Overview after Load (`10.png`: Nodes 11, Edges 18,
"From 2 files", Components 1) and the Data page's source row (`11.png`/`12.png`: "players.csv and
passes.csv / 11 nodes, 18 edges") all show it. The last screen (`16.png`) is the drawing of that
graph with s11 selected (id s11, Degree 1) and the find box confirming "s04, name: Dina Moss". In
the wrap-up Dana names the row: passes.csv line 17, Dina Moss (s04) passing 3 times to s11, who is
not in players.csv. She says she chose Add so the passes are kept, and that s11 has no name or
position.

Build seen: `8f0d5a6f7791 graphty@0.8.61` (session.json), the frozen build named in the criteria,
at 1440 x 900. Start: empty, no setup. Not void: every step produced its screen. The one refused
click (step 13) was the tool declining an ambiguous name, and it changed nothing.

## The answer against the key

- **Counts (right for the Add path).** 10 players + s11 = 11 nodes, all 18 passes = 18 edges.
  Shown on `09.png`, `10.png` and `12.png`, and `work.json` agrees (one source, "players.csv and
  passes.csv"). Density 0.1636 is 18 / (11 x 10), consistent.
- **Unmatched row named (right).** Line 17, from s04 to s11, 3 passes, s11 not in players.csv.
  She also looked up the sender's name (Dina Moss), which the key accepts.
- **Not a wrong answer.** Not `false-done` (she did not say "everything arrived" while a row was
  left out; she chose to keep the row and said so). Not `never-found` (both files loaded via the
  "+" / "Add a table"). Not wrong counts.
- The Data page's "1 row left out" row and its inspector do not exist on the Add path, so their
  absence is expected.

## Measures

- **Steps:** 15 `real.mjs` steps after the start (`02.png` to `16.png`). The success path is about
  8 (No thanks, New from data, choose players.csv, Add a table, File passes.csv, Show the unmatched
  row, Load, Data). The rest is checking after Load: the "name" attribute, the find box for s11
  (two tries) and for "Dina". About 1.9x, all of it after the answer was already on screen.
- **Wrong turns:** 1. Step 11: Dana clicked the "name" attribute on the Data page to see the rows
  player by player. The attribute inspector offers only a summary (Table, Kind, Origin, Has a value,
  Distinct values) and no list of rows, so she went back to the Graph page and the find box. This
  happened during the check after the task was done, so it did not cost the answer. Step 13 (the
  ambiguous "s11" in the find box) is an aiming slip on a duplicate name, not a wrong place.
- **"Add a table" found:** yes, by hovering the "+" (`05.png`), first try.
- **Report read before Load:** yes, including the unmatched row.
- **False "done":** none. "Yes, I finished" is true on screen: counts and the extra node are
  visible. truth_on_screen: holds.
- **Ease (from the transcript):** 6 of 7. Not used for the grade.
- **Work kept (bar 2):** nothing to lose. Start was empty. The end has one source and the two
  default style layers.
- **Silent commit:** none. Load drew the graph and the Overview gave the counts.
- **Numbers that disagree:** none. The import page, Overview, Data page and find box agree on 11
  and 18.
- **Mis-clicks on "File settings" / "CSV auto":** none.
- **Clicked "10 node rows" / "18 edge rows":** no.
- **Stopped to add names or set the weight:** noticed both, did neither.

## Problems

1. **"Leave out" is the default for the unmatched row (severity 2).** `07.png`: Leave out is
   filled white and preselected. Dana: "If I had skimmed and hit Load, a pass would have quietly
   dropped -- the warning is there, but the default throws data away." She read the report, so it
   did not change her answer. A reader who skims loses the row and finds it only on the Data page
   afterwards. Which choice is active is shown only by the fill, with no words.
2. **"Add" does not say what it adds (severity 2).** `07.png`/`09.png`: the buttons read "Add" and
   "Leave out" next to "1 edge row names a node missing from the node rows." Dana: "I guessed 'Add'
   meant 'add s11 as a player'... the button doesn't say what it adds." The tooltip ("Make a node
   for each missing name") was there but she did not hover it. She guessed right.
3. **A person's name attribute is described as Kind "Groups" (severity 2).** `12.png`: the "name"
   inspector reads Kind "Groups" for a column of 10 distinct names over 10 rows. Dana: "a name is
   not a group -- odd, but I skim past." That is a wrong description of the data, shown on a page
   a reader uses to check what loaded. Repro: load players.csv and open the "name" attribute.
4. **The Data page does not show the loaded rows (severity 2).** `11.png`, `12.png`: Sources, Filters
   and Attributes with percentages, but no row table. Dana's habit is to check the list row by row.
   Here it led to the wrong turn above and to the find box as a stand-in. This is her history's
   "Data place" habit. It counts as a broken habit only if it happens in a second session of the
   task.
5. **No names on the drawing (severity 1, outside the task).** `10.png`: plain spheres. Dana: "I
   can't tell Ana from June... for a VP slide that's a non-starter." The answer key says this is
   the default (name is an Attribute, not the label) and is not part of the task.
6. **The extra node looks like the biggest sphere (severity 1).** `15.png`: s11, with one pass, is
   the largest ball in the middle. Dana asked whether size means something, and decided not to
   trust it. The sizes look like 3D perspective (every node uses the default style), but nothing
   on screen says that size means nothing.
7. **"Weight: none (each edge counts 1)" beside a pass-count column (severity 1, outside the
   task).** `07.png`/`09.png`. Dana noticed it and left it, unsure if it matters later. The answer
   key records this. It is not part of the task.
8. **Small low-contrast gray text on the import page (severity 1).** `03.png`: "Drop a file here, or
   choose a file..." and the "Each row is" label. Dana: "I had to lean in to read it."
9. **Two find-box results share the name "s11" (severity 0, tool aiming).** `14.png`: a click on
   "s11" matched both the node row and the edge row "s04 -> s11", and the tool refused it. A sighted
   reader would click the row they wanted. This is recorded only because it cost a step.
