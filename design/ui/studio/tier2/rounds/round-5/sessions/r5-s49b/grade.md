# Grade: session r5-s49b -- Elena (tier 1 graduate), running club (T23 A), a step or two away

**Grade: S** (success). The last screen (`08.png`) matches the answer key's A end state: the
neighbor list is headed "Ava and 14 connections" at Hops 2 with Follow All, the 14 names under it
are exactly the key's (Ben, Chloe, Dev, Eli, Farah, Gus, Hana, Ivan, Jada, Kofi, Quinn, Ravi, Sana,
Theo), the left panel's Selection reads 15, the header chip reads "15 of 20 nodes", the five
left-out nodes at the top right of `07.png` are gone, and "Filter to neighbors" is drawn disabled
(gray). Elena answered 14 people not counting Ava, read from the header and checked against
Selection 15.

Build seen: `8c015b806086 graphty@0.8.65` (`session.json`), the frozen build named at the top of the
criteria, at 1440 x 900, with no uncommitted changes in the tool's checkout. Start: the ranked
running-club setup (friends.csv loaded, PageRank run, nodes sized and colored by PageRank).

## The answer against the key

- **Count (right).** 14 besides Ava, read from "Ava and 14 connections" with Hops 2 and Follow All
  (`07.png`), and reconciled with Selection 15 ("Ava plus 14, adds up"). Not the one-step 6, not a
  Follow Out count, and stated explicitly as excluding Ava.
- **Drawing narrowed (right).** Chip "15 of 20 nodes" (`08.png`). `work.json` end state adds one
  filter step, `{"kind":"neighborhood","seeds":["Ava"],"depth":2}`, turned on; the run (PageRank,
  label Influence) and the three layers are unchanged from the start, so nothing was lost.
- **Set (right).** The step is Ava's 2-hop neighborhood, matching the 14 names plus Ava.

## Measures

- **Route:** find box (typed Ava), clicked Ava's result, the Degree row's arrow in the node
  inspector (the key's "Degree row's route"), Hops 2, Filter to neighbors.
- **Steps:** 5 `real.mjs` steps that changed the screen, plus 2 commands the tool refused as
  ambiguous ("Ava" matched the results list's rows; "2" also matched Dev's weight 2) that changed
  nothing and were retried with a precise target (`03.png` and `06.png` are identical to `02.png`
  and `05.png`). These are tool-targeting refusals, not wrong turns in the app.
- **Wrong turns:** 0. Hops 1 is where the list opens, not a detour Elena chose; she went straight
  to 2.
- **False "done":** none. "The drawing now shows only those 15 -- the top bar says 15 of 20 nodes"
  is true on `08.png`; "14 people, not counting Ava" is true. truth-on-screen holds.
- **Watch items from the key:** she left Follow on All and got the right set, but said she was
  unsure whether "runs with" should follow one direction and would not have known if Out gave a
  different number (no `meaning-wrong`; recorded as a risk). She read the disabled "Filter to
  neighbors" as "applied", not as broken, and did not press it again. She noticed the key's
  "PageRank, full graph" titles and the PageRank row's history icon without reading them as a
  problem and did not rerun PageRank. She did not read the Hops 1 weight table turning into a plain
  name list as another feature.
- **Silent commit:** none. The filter showed its effect at once: the chip, the gray button, and five
  nodes gone.
- **Numbers that disagree:** none on screen. Elena compared "Degree 6" (`04.png`) with the Hops 1
  list of 6 and the Hops 2 header of 14 without confusion.
- **Ease (from the transcript):** 6 of 7. Not used for the grade.
- **Build-decided:** no. **Void:** no. Eight screenshots for the start, five steps and two refused
  commands; `leaks.json` shows no leaks over 17 calls; `session.log` is empty.
- **Scripted exit:** not applicable; Elena finished.

## Problems

| #   | Severity | Kind            | Problem                                                                                                                                                                                                                                                       | Evidence                                                                                                         |
| --- | -------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| 1   | 2        | meaning         | On directed data "Follow: Out / In / All" gives no hint of which fits "runs with"; Elena left All by luck of the default and said that on Out she "might have gotten a different number and not known". Out gives the key's wrong answer.                       | `05.png`, `07.png` (Follow row, All on); transcript "What confused me", third item                               |
| 2   | 2        | discoverability | The neighbor list's only visible door from the node inspector is a small arrow beside "Degree 6"; Elena found it only because her history said connections were on the right, and did not know what "Degree" means.                                            | `04.png` (Degree row and arrow); `05.png`; transcript step 2 and "What confused me", first item                  |
| 3   | 2        | recovery        | After "Filter to neighbors" the button only turns gray; nothing on screen says how to bring the other five back (the chip's tooltip and the Filters step are not visible at rest). Elena guessed undo would.                                                  | `08.png` (gray button, chip "15 of 20 nodes"); transcript step 5 and "What confused me", fifth item              |
| 4   | 1        | comprehension   | "Hops" with 1 / 2 / 3 is jargon; Elena inferred 2 meant friends of friends only because 1 showed the six direct ties. The header "Ava and 14 connections" does not say the reach.                                                                              | `05.png`, `07.png` (Hops segment; header without a hop count); transcript step 3 and "What confused me", second item |
| 5   | 1        | meaning         | Elena read Ava's "PageRank #20 of 20" and smallest dot as "the least popular runner". On directed data PageRank ranks incoming ties, which is not popularity in a running club. Outside this task's question.                                                 | `04.png` (inspector PageRank #20 of 20); transcript step 2 and "What confused me", fourth item                   |
| 6   | 0        | tool            | Two commands were refused as ambiguous ("Ava" matched the results rows; "2" matched Dev's weight) and nothing happened; retried with "Ava#1" and "role=radio:2". The key names the second; neither is an app defect a reader would meet.                         | `03.png` = `02.png`, `06.png` = `05.png`; transcript steps 2 and 4                                               |

On `07.png` and `08.png` two pairs of nodes near the bottom sit almost on top of each other with
merged halos, as the key notes; Elena counted from the list and chip, not the halos, so it did not
affect her count.
