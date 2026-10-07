# Grade: session r1-s18 -- Nadia, Javert and who he is tied to (Les Miserables)

**Grade: G** (gave up). Nadia found Javert and read one fact about him (Degree 17), but never
saw his neighbors listed by name. She ended the session herself: "I'm not clicking 17 dots one at
a time and writing them down." Her closing answer was "17, probably", with one name (Babet). The
task's F code that fits the end state is "a count with no names behind it".

Build: `9d6598eea3e9 graphty@0.8.53` (round 1). On this build the Neighborhood command selects
the neighbors and shows the several-node Summary, which lists no names. That is not a success
path here. The Degree route ("Javert's 17 connections") is the success path, and she did not take
it: in `06.png` "Degree 17" is shown as a value row, and nothing marks it as clickable.

## What the last screenshot shows (`22.png`)

- 18 nodes highlighted in yellow, zoomed in by "Frame selection", with no names drawn on any node.
- The right panel reads "18 nodes, 0 edges" and Summary: Nodes 18, Edges 0, Edges among them 61,
  id "Babet (1)", name "Babet (1)".
- No list of Javert's neighbors anywhere on screen. No download was saved (there is no
  `downloads/` folder).

## Against the success definition

| Part | Reached | Evidence |
|---|---|---|
| Javert selected | yes | `06.png`: panel "Javert, Node" |
| One fact read (degree 17) | yes | `06.png`: "Degree 17", which she read and guessed meant 17 people |
| Neighbors listed on screen by name | no | the only name she ever saw was "Babet (1)" (`08.png`, `18.png`, `22.png`) |
| At least three names given from that list, plus 17 | no | one name, plus "17, probably" |

## Measures

- **Steps:** 21 `real.mjs` steps after the start (`02.png` to `22.png`, three of them hovers).
  The success path is 6.
- **Wrong turns:** 8. Clicking "Selection" in the left tree (step 9), the Data rail (10), the
  node table, which opened an import page (11), Cancel (12), the "name" attribute (13),
  right-click on a node, which dropped the selection (16), clicking "name Babet (1)" (19), and
  "Frame selection" to look for names on the drawing (20-21).
- **False "done":** none. She said plainly she had not finished, and hedged the count ("17,
  probably"). `truth_on_screen`: not applicable.
- **Silent commit:** none counted. Neighborhood changed the highlight on the canvas both times.
- **Tool print:** at step 4, `--click "Find nodes, edges, values"` failed with "nothing on screen
  is called ...", because that text is the search box's placeholder. A person could have clicked
  there. The next step reached the same box by position, and nothing on screen had changed in
  between, so the outcome was not affected. The session is not void. The parent should decide
  whether this counts against the void target.
- **Build-decided:** partly. The command she reached (Neighborhood) cannot list names on this
  build, but the Degree route existed and she did not find it. Counted as a behavior result, not
  build-decided.
- **Void:** no.

## Problems

| # | Severity | Kind | Problem | Evidence |
|---|---|---|---|---|
| 1 | 4 | behavior | Nothing tells the reader that "Degree 17" opens the list of connections. She read it as a plain number ("is that how many people he's linked to? Probably") and went looking for the names elsewhere. This is why the task failed. | step 6 `06.png` |
| 2 | 3 | behavior | Neighborhood selects 18 nodes, but the panel shows a several-node Summary with one name ("Babet (1)") and no list. The command whose name promises "who's around him" never names them. Fixed in the round 2 build, according to the answer key. | step 8 `08.png`, step 18 `18.png` |
| 3 | 3 | behavior | Clicking "Node table" under Data opens a full-page "Add to Les Miserables" import screen, not the rows. She feared she had changed the data. A control that does something other than its label says; a build defect candidate, not yet reproduced as a scripted path. | step 11 `11.png` |
| 4 | 2 | wording | "18 nodes, 0 edges" next to "Edges among them 61": she could not tell which edge count is true, or whether 18 includes Javert. | step 8 `08.png` |
| 5 | 2 | wording | "id Babet (1)" / "name Babet (1)" for 18 nodes: "(1)" does not say "one of 18 different values", so it reads as if the selection were Babet. Clicking the row does nothing. | step 8 `08.png`, step 19 `19.png` |
| 6 | 2 | behavior | No names drawn on the nodes, and hovering a node shows nothing, even zoomed in. The drawing cannot answer "who" on its own. | step 21 `21.png`, step 22 `22.png` |
| 7 | 2 | behavior | Clicking "Selection" in the left tree blanks the right panel instead of showing what is selected. | step 9 `09.png` |
| 8 | 2 | behavior | Right-clicking a node opens no menu and drops the 18-node selection back to one node. | step 16 `16.png` |
| 9 | 1 | behavior | Returning to Graph from Data keeps the "name" attribute in the right panel instead of the current selection. | step 14 `14.png` |
| 10 | 1 | wording | Tooltips run the shortcut letter into the word: "NeighborhoodG", "LegendL". | step 7 `07.png`, step 15 `15.png` |
| 11 | 1 | behavior | The search box's placeholder "Find nodes, edges, values" is not part of the box's accessible name, so a click on that text by name fails. | step 4 `04.png` |
| 12 | 1 | opinion | Data > Attributes shows "shared_chapters" on edges, which is the column she wanted, but nothing opens it from there. | step 10 `10.png` |

Problem 1 and problem 2 together are the cause of the failure. Problem 3 should be scripted on
the build (open a sample, Data rail, click "Node table") to confirm it as a build defect from one
participant.
