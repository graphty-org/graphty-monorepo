# Grade: session r3-s48 -- Ruth (tier 1 graduate, returning), Florentine families (T23 B), who is a step or two away

**Grade: S** (success). Ruth read the count, 11 families besides the Medici, from the screen, and
narrowed the drawing to exactly the Medici and those 11. The last screen (`08.png`) shows the
header chip "12 of 15 nodes" after the filter icon, 12 dots drawn, the neighbor list headed
"Medici and 11 connections" at Hops 2 with the 11 names, and the left panel's Selection row at 12.
`work.json` agrees: the end adds one step, `neighborhood` with seeds `["Medici"]` and depth 2,
turned on; runs, layers and notes are unchanged and `gone` is empty.

Build seen: `26f3bb968e43 graphty@0.8.61` (session.json), the frozen build named at the top of the
criteria, at 1440 x 900, tool commit `acf3894e2c56`, no uncommitted changes. Start: setup
`florentine-ranked.txt` (`01.png`). `leaks.json`: 0 calls, no leaks. Not void: every step has a
screenshot, and the transcript, the screens and `work.json` agree. The transcript records that the
tool's `--end` replaced the session folder's contents and deleted the transcript written during the
session, so it was written again after the end; the screenshots and `work.json` bear out every step
it describes, so the record is usable (a tool defect, noted under Measures, not a void).

## The answer against the key

- **The count (right, read from the screen): 11.** `06.png`: after Hops 2 the list reads "Medici
  and 11 connections" with Acciaiuoli, Albizzi, Barbadori, Castellani, Ginori, Guadagni, Pazzi,
  Ridolfi, Salviati, Strozzi, Tornabuoni, and Selection 12. Ruth reported 11 "not counting the
  Medici" and named all 11, the key's list exactly. Peruzzi, Lamberteschi and Bischeri are left
  out, as the key says.
- **The drawing (right): narrowed to the Medici and the 11.** `07.png` and `08.png`: chip "12 of
  15 nodes", three dots gone, 12 drawn, "Filter to neighbors" drawn disabled after the press. The
  step in `work.json` is the 2-hop neighborhood of the Medici.
- **Route:** find box "Medici" (`02.png`), the Medici row in the results (`03.png`), the node
  inspector's three-dot menu, "Neighborhood" (`04.png`, `05.png` at Hops 1, "Medici and 6
  connections", Selection 7), Hops "2" (`06.png`), "Filter to neighbors" (`07.png`). The key's
  route, entered through the menu instead of the `g` key; a bare `--click "2"` hit the Hops segment
  on B, as the key says it can.
- **Traps from the key:** the legend reads "Size: PageRank, full graph" and "Color: PageRank, full
  graph" after the filter (`07.png`); Ruth read it correctly as the ranking over all 15 and did not
  rerun PageRank. The PageRank row's history icon (`07.png`, `08.png`) drew no remark. Ruth did not
  read the disabled "Filter to neighbors" as broken and did not press it again; she noted she did
  not see where to undo it. She did not report 11 as direct ties: she separated the 6 direct from
  the 5 second-step families herself.

## Claims

- **False "done": no.** "11 families, not counting the Medici ... The drawing shows only those 11
  and the Medici ('12 of 15 nodes')." True on `08.png` and in `work.json`.
- truth-on-screen: "three dots on the drawing are not highlighted, which fits 15 - 12 = 3" (`06.png`:
  three dots without a halo) and "Pazzi has one edge: Salviati -- Pazzi" (`08.png`) are both
  accurate.

## Measures

- **Steps:** 7 `real.mjs` steps after the start (`02.png` to `08.png`) against the success path's
  5 (`/`, type, Enter, `g`, Hops 2, Filter). The last step (find "Pazzi", `08.png`) was a check of
  one second-step family, not a detour; it left the filter and the neighbor list in place.
- **Wrong turns: 0.**
- **How Ruth got from "two marriages away" to an action:** the find box's edge list for the Medici
  gave the six direct ties; she then looked for a way to "take in the neighbors" in the node
  inspector's unlabeled "..." menu, where "Neighborhood" matched her question. She did not use the
  Degree row's arrow or the `g` key.
- **Hop distinction:** the Hops 2 list does not say which families are one and which two marriages
  away; Ruth worked it out by comparing with the Medici's edge list from step 2.
- **Tool defect (not a participant problem):** `--end` copied the session from
  `tmp/studio-sessions/` into this folder and replaced its contents, deleting the transcript the
  participant had written here during the session; the briefing had pointed the session folder at
  `tmp/studio-sessions/` rather than the path the task named.
- **Silent commit:** none. The filter shows in the chip, the disabled button and the step in Filters.
- **Build-decided:** no.
- **Ease (self-rated, not used for the grade):** 6 of 7.

## Problems

| #   | Severity | Kind            | Problem                                                                                                                                                                                         | Evidence                                                                                  |
| --- | -------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| 1   | 2        | discoverability | "Neighborhood" is reached only through the node inspector's unlabeled three-dot menu (or the `g` key, or the Degree row's arrow, neither of which says "neighborhood"); Ruth found it only by searching for it. | `03.png` (only "..." at the inspector's top right); `04.png` the menu; transcript step 3 and wrap-up |
| 2   | 2        | comprehension   | The Hops 2 list does not mark which names are one step away and which two, or through whom; a reader who needs "a family they married into, or one that married into those" must cross-check by hand. | `06.png` one flat alphabetical list; transcript steps 6 and 8                           |
| 3   | 1        | feedback        | After the press, "Filter to neighbors" only greys out; nothing beside it says how to undo the filter (the way back is the step's checkbox on the Data page).                                     | `07.png`, `08.png`; transcript wrap-up                                                    |
| 4   | 1        | presentation    | The narrowed drawing carries no names, so the picture alone does not say which families it shows; the names are only in the panel.                                                              | `07.png`, `08.png`                                                                        |

No severity 4: the count and the narrowed drawing are both right, and nothing on screen led to a
wrong conclusion.

Not studied: keyboard-only and screen-reader use. This session is a simulated returning user
briefed with a history, not a real person; a pass here is weak evidence until real people confirm
it.
