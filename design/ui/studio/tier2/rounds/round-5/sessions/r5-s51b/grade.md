# Grade: session r5-s51b (task T23 A, Tom, tier 1 graduate)

Task T23, dataset A (running club, friends.csv, with a PageRank run sized and colored on the
drawing). Build 8c015b806086 graphty@0.8.65 (`session.json` buildStamp), the round 5 frozen build.
The question: how many people Ava runs with plus the people they run with, not counting Ava, then
a drawing with only Ava and those people.

**Grade: S**

## Why

The answer key's success: 14 people besides Ava, read from the screen, and the drawing narrowed to
exactly those 14 and Ava (the header chip).

- **Count.** Tom answered 14, "not counting Ava", read from the neighbor list's heading "Ava and
  14 connections" at Hops 2 with Follow All, and checked against the 14 names under it and
  Selection 15 (`08.png`). That is the key's answer, with the key's own names (Ben, Chloe, Dev,
  Eli, Farah, Gus, Hana, Ivan, Jada, Kofi, Quinn, Ravi, Sana, Theo). He did not report 6, did not
  use Follow Out, and did not give 15 as the count.
- **Drawing (last screenshot, `09.png`).** The header chip reads "15 of 20 nodes"; 15 dots are
  drawn, all with the selection halo (two close pairs near 567,758 / 583,752 and 716,745 /
  735,745, as the key notes); the five unlit nodes of `08.png` (top right) are gone. "Filter to
  neighbors" is drawn disabled, the key's state once its step is on at the reach shown.
- **Saved state.** `work.json` end lists one new filter step, `{"kind":"neighborhood","seeds":
  ["Ava"],"depth":2}`, and the PageRank run, its three style layers and the source are unchanged
  from the start. Nothing was lost.

Route: find box, Ava, the node's "..." menu, "Neighborhood", Hops 2, "Filter to neighbors". The
key names the node menu's "Neighborhood" as an equal route to the `g` shortcut, so this is the
success path, not a detour. Read from the screen, not counted by hand, so S rather than SD.

## Counts

- False "done" claims: 0. "Done" was claimed once, after `09.png`, and the screen bears it out
  (chip "15 of 20 nodes", 15 dots).
- Wrong turns: 0. Every step moved toward the task and none was undone or abandoned.
- Tool refusals (not wrong turns): 2. `--click "Ava"` matched both the find result and the
  inspector title (step 2), and `--click "2"` matched both the Hops segment and the "2" in Dev's
  weight cell (step 6, the clash the key names). Each was retried at once with a precise locator
  (`Ava#1`, `role=radio:2`); neither reached the app.
- Broken habit: none. The first move (the find box) is a place Tom's history names, and it led on
  to the task.
- Steps: 7 actions in the app (type Ava, select Ava, open "...", Neighborhood, Hops 2, Filter),
  plus the two refused clicks.

## Problems

| Severity | Problem | Evidence |
|---|---|---|
| 2 | After the filter, the PageRank row gains a history icon and the legend titles change to "Size: PageRank, full graph" / "Color: PageRank, full graph". Tom did not know whether his colors were now wrong and said he would ask about it. He did not rerun or act on it, so no wrong conclusion; the key asks for any participant who reads the mark as a problem to be recorded. | `09.png` (icon left of PageRank at 80,156; legend titles); transcript step 8 and "What confused me" item 5 |
| 2 | "Hops" is not a word Tom knows. He guessed that 2 meant one step past Ava's own people and said he would not have trusted the number without the names in the list. The heading reads the same shape at either reach ("Ava and 6 connections" / "Ava and 14 connections"), so only the chosen segment says which reach is on. | `06.png`, `08.png`; transcript step 5 and item 3 |
| 1 | The Hops 1 list shows a weight beside each name; at Hops 2 the weights vanish with no word why. Tom noticed and did not know why (the key's "Neighbor / weight table" at 1 and plain list at 2). He did not read it as another feature. | `06.png` against `08.png`; transcript item 4 |
| 1 | "Neighborhood" sits only behind the node's "..." button; Tom found it because it was the only button there, not because anything pointed to it. | `05.png`; transcript step 4 and item 2 |
| 1 | No names are drawn on the nodes, so Ava could only be found through the find box, not on the drawing. | `01.png`, `09.png`; transcript item 1 |
| 0 (tool) | Two text locators were ambiguous ("Ava", "2") and were refused before reaching the app. | transcript steps 2 and 6 |

Positive, recorded for the round: the heading's 14, Selection 15 and the chip's "15 of 20 nodes"
agreed, and Tom said that let him report the number without counting.

Participant's ease rating (6 of 7) is not used in this grade.
