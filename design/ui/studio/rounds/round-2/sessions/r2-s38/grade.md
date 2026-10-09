# Grade: session r2-s38 -- Dana (supply chain risk analyst), a picture and the numbers for a report

Build: commit 4a7a1a7fb, graphty 0.8.53 (session.json). Setup: Les Miserables sample with
Communities (Louvain) run. Graded from the last screenshot (10.png), the two downloaded files and
the transcript, plus one scripted re-run on the same build.

## Grade: S (success)

- **Picture with key:** `downloads/les-miserables_current-view.png` (1806 x 1720). Against the
  picture checklist and 10.png: same 77 nodes in the same arrangement; colors match the screen;
  no names are drawn on screen, so none are owed in the image; a key "Color: Communities, Group 1
  to Group 6" names the one channel in use. Passes.
- **Numbers Excel can open:** `downloads/les-miserables_nodes.csv`, header
  `id,name,results.louvain.group,results.louvain.groupSize` and 77 rows, one per character. Group
  sizes counted from the file: 20, 17, 11, 11, 10, 8 -- the answer key's sizes, with group 1 the
  20-member group. Passes.
- **Why S:** no wrong turns, step count equal to the success path. Dana hesitated twice (the CSV
  warning box, and guessing that "Nodes" means characters) but every click she made is on the
  success path; CSV's default Edges table is a step of the path, not a detour.
- **Failure codes:** none. **Build-decided:** no. **Void:** no.
- **Screen-reader check (text exists on the build):** the toasts "Exported
  les-miserables_current-view.png" (04.png) and "Exported les-miserables_nodes.csv" (10.png) were
  shown.

## Counts

|                  | This session                   | Success path (round 2 build) |
| ---------------- | ------------------------------ | ---------------------------- |
| Steps (real.mjs) | 9 after the start (steps 2-10) | 9                            |
| Wrong turns      | 0                              | --                           |

Dana opened Export through Main menu > Export... (two steps) instead of Ctrl+E (one), then folded
Ctrl+E and the Data click into one step for the second export; both are allowed routes.

## False "done"

None. Dana claimed the picture part done at step 4 and the numbers part done at step 10; both
files exist and are correct, and the screen shows each export toast.

## Problems

Severity 0-4 (Nielsen); opinion-only findings held one level down. The build defect was
reproduced by `rounds/round-2/repro/r2-s38/repro.sh` (output in `run/` and `run.log`): the
same on this run as in the session.

| #   | Sev | Kind         | Problem                                                                                                                                                                                                                                                                                                                                        | Evidence                                                                                                                                                                                           |
| --- | --- | ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 2   | build-defect | The on-screen color key box sits on top of the drawing and hides part of it: Group 5 has 10 nodes, 9 can be seen on screen; the tenth (and the edges into it) is under the key. The exported image draws the key outside the nodes, so the image shows a node the screen does not, and Dana noticed the two are "framed a little differently". | Session 01.png and 10.png against `downloads/les-miserables_current-view.png` (orange node at about 455,292 in the image); repro `run/01.png` and `run/downloads/les-miserables_current-view.png`. |
| 2   | 2   | behavior     | The Data tab opens on "Graphty JSON" and the Format list has about twenty formats, none named "Excel" or "spreadsheet"; Dana had to know that CSV is what Excel opens. A reader without that knowledge exports the JSON (`wrong-file-type`).                                                                                                   | Steps 5-6, 05.png, 06.png; wrap-up. One participant.                                                                                                                                               |
| 3   | 2   | behavior     | After choosing CSV the table defaults to Edges (pairs of characters, no group column). The choices Edges / Nodes / Adjacency List do not say which one is "one row per character"; Dana guessed Nodes only because 77 nodes matched 77 characters. Stopping at the default gives "numbers without the computed column".                        | Steps 7-9, 07.png, 08.png, 09.png. One participant.                                                                                                                                                |
| 4   | 2   | wording      | The yellow "CSV cannot hold everything" box lists nine technical bullets ("style.color", "dialect", "importer"); it alarmed Dana that her numbers would be lost, and the one bullet that mattered to her (group values come only with the Nodes table) was last.                                                                               | Step 7, 07.png; step 9, 09.png.                                                                                                                                                                    |
| 5   | 1   | wording      | The same groups are called "Communities" / "Group 1..6" on screen and in the image, but `results.louvain.group` and `results.louvain.groupSize` in the CSV; "louvain" means nothing to Dana.                                                                                                                                                   | Step 9, 09.png; `downloads/les-miserables_nodes.csv` header. Opinion held one level down.                                                                                                          |
| 6   | 1   | opinion      | In the export preview the key is too small to read, so Dana could not confirm the key before exporting.                                                                                                                                                                                                                                        | Step 3, 03.png. Opinion held one level down.                                                                                                                                                       |

## Positive notes

- File > Export... sat where Dana expected it, and the exported image's key is larger and clearer
  than the on-screen one.
- "Saved to this computer only; nothing is uploaded" answered her IT question without asking.
