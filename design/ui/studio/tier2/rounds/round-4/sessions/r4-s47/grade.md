# Grade: session r4-s47 -- Ruth (tier 1 graduate), running club (T23 A), who is a step or two away

**Grade: S** (success). Both halves of the task are met. The count: Ruth answered "14 people, not
counting Ava" and named Ben, Chloe, Dev, Ivan, Sana, Theo, Eli, Farah, Gus, Hana, Jada, Kofi, Quinn
and Ravi -- exactly the key's 14, with none of the five left-out people (Lena, Milo, Nora, Omar,
Pia). The drawing: the last screen (`11.png`) shows the header chip "15 of 20 nodes" with the filter
icon, 15 dots drawn, the neighborhood list still at Hops 2 and Follow All, headed "Ava and 14
connections", and Selection 15. `work.json` confirms one filter step was added and left on:
`step-1 on {"kind":"neighborhood","seeds":["Ava"],"depth":2}`. The route was the node menu's
"Neighborhood", which the key names as opening the same list as the success path.

Build seen: `5277e2cbe1bd graphty@0.8.64` (session.json), the frozen build named at the top of the
criteria, at 1440 x 900. Start: setup `friends-ranked.txt` (friends.csv loaded, PageRank run, size
and color by PageRank, no names drawn). Tool commit `435e878a1d4c`, no uncommitted changes.

## The answer against the key

- **Count (right).** `09.png`: Hops 2, Follow All, "Ava and 14 connections", the 14 names, Selection
  15. Ruth counted the names herself and stated the number without Ava, so the "14 with or without
  Ava" ambiguity of the heading did not bite.
- **Direction (right).** friends.csv loads directed. Ruth saw the one-way arrows in the search
  results (`02.png`: Ava -> Ben, Sana -> Ava ...), reasoned that running together has no direction,
  and kept Follow on All. Not the `meaning-wrong` trap (6 or a smaller count with Follow Out).
- **Drawing (right).** `10.png` and `11.png`: "15 of 20 nodes"; the five top-right dots of `09.png`
  are gone; "Filter to neighbors" is drawn disabled, as the key describes once its step is on. The
  legend titles changed to "Size: PageRank, full graph" and "Color: PageRank, full graph"; Ruth read
  that correctly as the sizes still measuring the whole club and did not rerun PageRank.
- **Check after done.** The last step searched Eli (`11.png`: Ben -> Eli, Dev -> Eli, Eli -> Farah)
  to confirm a two-hop member. It changed nothing: Selection 15 and the filter stayed.
- **Work kept.** `work.json`: the start's run, three layers and source are all still there; the only
  change is the added neighborhood step. Nothing gone.

## Measures

- **Route:** find box -> Ava -> inspector "..." menu -> Neighborhood -> Hops 2 -> Filter to
  neighbors. The success path uses the `g` shortcut instead of the menu; the menu item shows "(G)"
  beside it (`05.png`).
- **Steps:** 10 `real.mjs` steps after the start. Three of them (steps 2, 6, 7) were the tool
  refusing an ambiguous target ("Ava" matched the node row and its edge rows; "2" matched the Hops
  segment and Dev's weight 2, as the key warns) and changed nothing on screen (`03.png` = `02.png`,
  `07.png` and `08.png` = `06.png`). They are tool addressing, not wrong turns in the app. One step
  (the Eli search) was verification after the work was done.
- **Wrong turns:** 0.
- **False "done":** none. "Done" was claimed at step 10, when `11.png` shows the 15-node filter and
  the 14-name list. truth-on-screen: holds.
- **Silent commit:** none. Each action changed the screen visibly (menu, list, Selection count,
  chip).
- **Numbers that disagree:** "Ava and 14 connections" beside Selection 15 is consistent (Ava plus
  14). The legend's range 0.03779 to 0.06394 is the whole graph's, now labeled "full graph".
- **Ease (from the transcript):** 6 of 7. Not used for the grade.
- **Build-decided:** no. **Void:** no. Every step produced its screenshot or a clear tool refusal,
  and `leaks.json` shows no leaks over 23 calls.
- **Scripted exit:** not applicable; Ruth finished.

## Problems

| #   | Severity | Kind            | Problem                                                                                                                                                                                                                                                       | Evidence                                                                                                       |
| --- | -------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| 1   | 1        | wording         | The heading "Ava and 14 connections" uses "connections" for people within 2 steps, most of whom are not tied to Ava directly, while the left panel's "Edges" lists ties. Ruth would call them "people within 2 steps". It did not change her count.               | `09.png`; transcript, "What confused me", first bullet                                                         |
| 2   | 1        | discoverability | The only route Ruth found to Neighborhood is an unlabeled "..." button in the inspector header; she found it by trying it. It cost no wrong turn here.                                                                                                         | `04.png`, `05.png`; transcript step 4 and "The menu that has Neighborhood is hidden behind '...'"              |
| 3   | 1        | consistency     | At Hops 1 the list is a Neighbor / weight table; at Hops 2 the weight column is gone with nothing saying why. Ruth noticed and moved on.                                                                                                                         | `06.png` against `09.png`; transcript step 8 and "What confused me", second bullet                             |
| 4   | 1        | trust           | The drawing has one-way arrows and a Follow Out / In / All control, but nothing says which reading fits a "runs with" list. Ruth chose All by reasoning about the data and could not confirm what Out or In would count. Right answer here; a less careful reader could pick Out. | `02.png` (arrows in the edge results), `06.png` (Follow row, All preselected); transcript, third bullet        |
| 5   | 1        | visual          | No names are drawn on the dots, so who is who can be read only from the right-hand list or a search; Ruth confirmed a two-hop member through the find box instead of the drawing.                                                                                | `01.png` to `11.png`; transcript step 10 and last bullet                                                      |

All five rest on one participant and are not confirmed by this session alone. Problem 5 follows from
the start's setup (`friends-ranked.txt` draws no names), not from a change Ruth made.
