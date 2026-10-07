# Grade: session r3-s40 -- Alex (intermediate analyst), what did I get, Les Miserables

Build: commit f108a2350, graphty 0.8.53 (build stamp b7590f8de, session.json), sighted, mouse.
Graded from the last screenshot (04.png), the screenshot the counts were read from (02.png) and the
transcript. No files were saved, and the task asks for none. Not from the participant's rating
(6 of 7).

## Grade: S (success)

All four answers are right and each was read off the screen:

1. **Characters: 77.** 02.png, Values > Overview, "Nodes 77". Also 03.png and 04.png, Sources,
   "77 nodes".
2. **Connections: 254.** 02.png, "Edges 254"; 04.png, "254 rows, 254 edges".
3. **Everyone can reach everyone: yes.** 02.png, "Components 1". Stated as one connected piece.
4. **Recorded facts:** `id` and `name` for characters, `shared_chapters` for connections. 03.png
   and 04.png, Data > Attributes (Nodes: id, name; Edges: shared_chapters). His extra details on
   shared_chapters (on every edge, 17 distinct values, 1 to 31) match 04.png.

- **Build-decided:** no. **Void:** no.
- **Failure codes:** none.
- **Usage card:** declined ("No thanks") at step 2 without a detour.

## Counts

| | This session | Success path |
|---|---|---|
| Steps (real.mjs, after the start) | 3 (step 2 held two clicks) | 2-3 |
| Wrong turns | 0 | -- |

- Step 2 (No thanks, open the sample) and step 3 (the Data rail) are the success path.
- Step 4 (click `shared_chapters` to see its range) came after all four answers were on screen;
  exploration, not a detour.
- Steps against the path: 3 / 3 = 1.0x.

## False "done"

None. Every closing claim matches a screen: 77 and 254 (02.png), Components 1 (02.png), the three
attributes and "nothing else" (04.png lists only id, name and shared_chapters), and the
shared_chapters summary (04.png).

## Problems

Severity 0-4 (Nielsen). Opinion-only findings are held one level down. None is a build defect
(no crash, dead control, wrong count or keyboard block), so no repro was scripted.

| # | Sev | Kind | Problem | Evidence |
|---|---|---|---|---|
| 1 | 2 | wording | The Overview's degree row is cut to "Edges per ..." with no way to read the full label; he guessed "edges per node" and said he would not put the figure in a deck without the full name. Also met in other round 3 sessions: confirmed. | Step 2, 02.png. |
| 2 | 2 | wording | "Undirected, from the file: directed 0" reads as a contradiction; he had to reread it to take it as "the file had no directed edges". The line also runs to the panel's right edge with no margin. Also met in other round 3 sessions: confirmed. | Step 2, 02.png. |
| 3 | 1 | wording | Source names in the Data panel are truncated to "Node t..." and "Ed..." although the panel has room beside the counts. | Step 3, 03.png; 04.png. |
| 4 | 1 | opinion | Nothing in the Graph view points to where the attribute list lives; he found it by guessing the Data rail icon "looked like a database". Held one level down. | Step 2-3, 02.png (Graph view lists only Selection and Everything). |
| 5 | 1 | opinion | "Components 1" needs graph vocabulary to read as "everyone can reach everyone"; he knew it from NetworkX and expects a less experienced reader would not. Held one level down. | Step 2, 02.png; debrief. |

**What worked:** three of the four answers were on screen the moment the sample opened, with no
click. The Data view showed the attributes with their types, and row counts equal to node and edge
counts, which he uses as his import check. "Local only" and "Files are read on this computer and
never uploaded" answered his privacy question on the start page (01.png).
