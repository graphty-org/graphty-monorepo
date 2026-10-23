# Grade: session r5-s56b (task T12R B, Jordan, regular analyst)

Task T12R, dataset B (Florentine families, with a PageRank run sized and colored on the drawing).
Build 8c015b806086 graphty@0.8.65 (`session.json` buildStamp), the round 5 frozen build. The
question: go to the Medici, read what the program knows about them, and say which families they
married into, and how many.

**Grade: S**

## Why

The answer key (tier 1's T12 key, which T12R uses): Medici selected; the six families named from
the screen: Acciaiuoli, Albizzi, Barbadori, Ridolfi, Salviati, Tornabuoni.

- **Selected and a fact read.** `03.png`: Selection 1, the Medici inspector ("Medici / Node",
  Values tab) with id Medici, name Medici, Degree 6 and PageRank "0.1458, #1 of 15". Jordan
  reported Degree 6 and PageRank 0.1458, #1 of 15, and that the file holds no other attribute;
  all match the screen.
- **Neighbors on screen (last screenshot, `04.png`).** The panel reads "Medici" / "Neighborhood",
  "Back to Medici", "Medici and 6 connections", Hops 1 chosen, and lists Acciaiuoli, Albizzi,
  Barbadori, Ridolfi, Salviati, Tornabuoni; Selection reads 7 and six nodes plus the Medici wear
  the yellow glow. Jordan named all six, spelled as on screen, and said 6. Every name and the
  count match the key.
- **Saved state.** `work.json` end equals its start: the PageRank run, its three style layers and
  the source are unchanged. Nothing was lost.

Route: find box (type Medici), the node row of the find list, then the Degree row. That is the
key's success path (the Degree route), reached by pointer instead of Enter. Jordan first read the
six names from the find box's list of ties (`02.png`), which alone would grade SD, but then
opened the Neighborhood list and gave the answer from it, so S.

## Counts

- False "done" claims: 0. "Finished: yes" was claimed once, after `04.png`, and the screen bears
  out every name and the count. Every other claim ("Selection now says 7", "all six highlighted",
  "#1 of 15") matches its screenshot.
- Wrong turns: 0. Jordan picked the node row, not a tie (no "picks a tie instead of the node"
  detour), and opened Degree directly.
- Tool refusals: 0. Tool faults: none; every step changed the screen as asked, no leaks
  (`leaks.json`).
- Steps: 3 actions in the app (type Medici, pick the node row, open Degree).

## Problems

| Severity | Problem | Evidence |
|---|---|---|
| 1 | The Degree row's chevron does not read as a button; Jordan clicked it only from habit. The row is the only route to the names from the inspector. Opinion, no wrong conclusion. | `03.png` (Degree row, chevron at 1411,242); transcript wrap-up "Confusion" |
| 1 | The find box's ties put the searched name on either side ("Acciaiuoli -- Medici", "Medici -- Barbadori"), so the other family's name moves from row to row and has to be read past the Medici part. | `02.png` (Edges 6 list); transcript wrap-up "Confusion" |
| 1 | No names are drawn on the nodes, so the Medici cannot be found on the drawing by eye and Jordan would want labels for a slide. Comes from the setup's style, not a defect; held one level down as an opinion. | `01.png` to `04.png`; transcript 01 and wrap-up |
| 0 | In the Neighborhood view the first neighbor (Acciaiuoli) carries a gray fill while Hops "1" is only outlined, so a row looks lit with no reason (the resting pointer's hover, as the key records). Jordan did not remark on it. | `04.png` (Acciaiuoli row at 1325,240) |

Positive, recorded for the round: two routes agreed (the find list's six ties and the
Neighborhood list), and three counts on screen matched ("Edges 6", Degree 6, "Medici and 6
connections"); Jordan used that agreement as the reason to trust the answer.

Participant's ease rating (7 of 7) is not used in this grade.
