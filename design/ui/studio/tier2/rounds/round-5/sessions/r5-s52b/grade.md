# Grade: session r5-s52b (task T23 B, Nadia, tier 1 graduate)

Task T23, dataset B (Florentine families, with a PageRank run sized and colored on the drawing).
Build 8c015b806086 graphty@0.8.65 (`session.json` buildStamp), the round 5 frozen build. The
question: how many families are at most two marriages from the Medici, not counting the Medici,
then a drawing with only the Medici and those families.

**Grade: S**

## Why

The answer key's success: 11 families besides the Medici, read from the screen, and the drawing
narrowed to exactly those 11 and the Medici (the header chip).

- **Count.** Nadia answered 11, not counting the Medici, read from the neighbor list's heading
  "Medici and 11 connections" at Hops 2 and checked against Selection 12 (`06.png`). Her 11
  names (Acciaiuoli, Albizzi, Barbadori, Castellani, Ginori, Guadagni, Pazzi, Ridolfi, Salviati,
  Strozzi, Tornabuoni) are the key's, in the list's own order. She did not report 6 or give 12
  as the count.
- **Drawing (last screenshot, `07.png`).** The header chip reads "12 of 15 nodes" after the
  filter icon; 12 dots are drawn, every one with the selection halo. The three unlit dots of
  `06.png` (about 959,408, 719,557 and 697,715) are gone. "Filter to neighbors" is drawn
  disabled, the key's state once its step is on at the reach shown.
- **Saved state.** `work.json` end lists one new filter step, `{"kind":"neighborhood","seeds":
  ["Medici"],"depth":2}`; the PageRank run, its three style layers and the source are the same
  as at the start. Nothing was lost.

Route: find box, Medici, the node's "..." menu, "Neighborhood", Hops 2, "Filter to neighbors".
The key names the node menu's "Neighborhood" as an equal route to the `g` shortcut, so this is
the success path, not a detour. The count was read from the heading, not counted by hand, so S
rather than SD.

## Counts

- False "done" claims: 0. "Done" was claimed once, after `07.png`, and the screen bears it out
  (chip "12 of 15 nodes", 12 haloed dots).
- Wrong turns: 0. Every step moved toward the task; none was undone or abandoned.
- Tool refusals: 0.
- Broken habit: none. The first moves (the find box, then the Medici's connections) are places
  Nadia's history names, and they led on to the task.
- Steps: 6 actions in the app (type Medici, select Medici, open "...", Neighborhood, Hops 2,
  Filter).

## Problems

| Severity | Problem | Evidence |
|---|---|---|
| 2 | "Hops" is not explained: nothing on the panel says what a hop counts from or that it means steps away from the Medici. Nadia stopped on it and guessed right. The heading has the same shape at either reach ("Medici and 6 connections" / "Medici and 11 connections"), so only the chosen segment says which reach is on. | `05.png`, `06.png`; transcript step 4 and "What confused me" item 2 |
| 2 | The heading's 11 leaves out the Medici while Selection beside it reads 12; Nadia had to work out which number answered the question. She got it right, so no wrong conclusion. | `06.png` (heading at 1287,140; Selection 12 at 281,124); transcript item 4 |
| 1 | After the press, "Filter to neighbors" is drawn disabled and the panel says nothing about how to undo it; the chip "12 of 15 nodes" was her only clue that this was a view filter, not a change to the data. She did not read the gray button as broken or press it again. She asked for a copyable line such as "Showing Medici and 11 families within 2 links". | `07.png` (button at 1281,206; chip at 297,20); transcript step 6 and item 3 |
| 1 | "Neighborhood" sits only behind the node's "..." button; Nadia found it by poking around and said she would not have looked there on a busy day. | `04.png`; transcript step 3 and item 1 |
| 1 | After the filter the legend titles change to "Size: PageRank, full graph" / "Color: PageRank, full graph" and the PageRank row gains a history icon. Nadia read the titles correctly (the data is still whole, only the view changed) and did not rerun; recorded as the key asks, no wrong conclusion. | `07.png` (legend titles; icon at 80,156); transcript step 6 |
| 0 | No names are drawn on the dots, so the Medici could only be found through the find box. Not raised as a problem by Nadia. | `01.png`; transcript 01.png |

Positive, recorded for the round: the heading's 11, Selection 12 and the chip's "12 of 15 nodes"
agreed, and the task took six steps.

Participant's ease rating (6 of 7) is not used in this grade.
