# Grade: session r1-s04b -- Dev, a whole first session on Les Miserables

**Grade: S** (success). All five parts of the task were reached in one sitting and none was undone
by a later step. One wrong turn (a click that landed on the export dialog itself instead of its
Export button), no tooltip, no help, no detour.

## The five parts (5 of 5 reached)

1. **Les Miserables drawn.** `02.png`: 77 nodes, 254 edges, matching the reference values. Opened
   from Samples on the start screen after "No thanks" on the usage card.
2. **A ranking run finished.** `05.png`: Betweenness (shown on screen as "Bridges") colored all 77
   nodes, key "Color: Bridges, 0 to 1624". `06.png`: the Top 10 reads Valjean 1,624, Myriel 504,
   Gavroche 470.6, the reference top three.
3. **Sizes bound to the result and visibly different.** `11.png`: a Size line on the Bridges row
   and "Size: Bridges" in the key; Valjean, Myriel and Fantine are clearly larger. `17.png` keeps
   it ("Size 1 to 3"). Meaning, at the end: "Both stand for Bridges: how many shortest routes
   between other characters run through that character, 0 to 1624. Big and dark brown means a key
   connector (Valjean, Myriel, Fantine)." Correct: the method's on-screen name names the measure,
   and the order was on screen (`06.png`) before he said it.
4. **Names drawn.** `13.png`: a label line bound to `name` on the Bridges row, which covers all 77
   nodes, reads "77 labels, 7 hidden to avoid overlap". Real names are drawn, not ids. (The
   reference "6 hidden" is for sizes by Influence; this run sized by Bridges.)
5. **Image downloaded and passes the picture checklist.**
   `downloads/les-miserables_current-view.png` (1806 x 1720) shows the same nodes in the same
   arrangement as `17.png`; sizes are visibly different (Valjean, Myriel, Fantine largest); the
   names drawn on screen are drawn in the image (small, some overlapping in the middle); the key
   names both channels in use ("Size: Bridges" and "Color: Bridges", each 0 to 1624). `17.png`
   shows the toast "Exported les-miserables_current-view.png".

## Measures

- **Steps:** 16 `real.mjs` steps after the start (`02.png` to `17.png`). The success path is about
  18, so about 0.9x.
- **Wrong turns:** 1. Step 16, `--click "Export#2"` (`16.png`, byte-identical to `15.png`): nothing
  happened. He recovered at once by pointing at the Export button (step 17).
- **False "done":** none. Each "PART n DONE" (`02.png`, `05.png`, `11.png`, `13.png`, `17.png`)
  matches the screen, and the closing "all five parts" is true. At part 4 he did not claim every
  name was on; he noted that some are tiny and overlap. truth_on_screen: not applicable.
- **Activation:** yes. He chose Betweenness (his tutorial's order, over the app's "Start here" on
  PageRank) and ran it with no help, no tooltip and no detour (`03.png` to `05.png`).
- **Usage card:** declined with "No thanks" at step 2, no detour.
- **Build-decided:** no. **Void:** no.

## The step-16 dead end is not a build defect

Reproduced with a scripted path, `rounds/round-1/repro/r1-s04b/` (start empty; "No thanks", "Les
Miserables"; Control+e; `--click "Export#2"`; `--click "Export"`). With the export dialog open, the
tool prints `ambiguous: "Export" matches 2 controls (button "Export", dialog "Export ...")`. The
second "Export" is the dialog element itself, so "Export#2" clicks the dialog's background:
`03.png` and `04.png` of the repro are byte-identical, as in the session. Clicking the first match,
the button, saves `les-miserables_current-view.png` (repro `05.png`, `downloads/`). The Export
button works; the participant asked the tool for the wrong match. Recorded as a wrong turn, not a
build defect and not a tool fault (a person can click a dialog's background).

## Problems

| # | Severity | Kind | Problem | Evidence |
|---|---|---|---|---|
| 1 | 2 | behavior | Labels are tiny and several overlap in the middle of the drawing; in the exported picture those names are unreadable, which matters for an essay figure. | step 13 `13.png`, `17.png`, the download (center cluster) |
| 2 | 2 | behavior | No "Size" line on the Style tab; size is reached through "+" beside Shape. Dev expected "Size" at the top level and had to guess. | step 7 `07.png`, step 8 `08.png` |
| 3 | 2 | behavior | Adding Size gives a fixed size ("1"); sizing by a value is behind an unlabeled chain-link icon ("Size by attribute" only as its accessible name). No visible word says "by a measure". | step 9 `09.png`, step 10 `10.png` |
| 4 | 1 | wording | The run is picked as "Betweenness" and then named "Bridges" everywhere; Dev had to guess they are the same thing. | step 5 `05.png`, step 6 `06.png` |
| 5 | 1 | opinion | The key says "Bridges, 0 to 1624" with no sentence on what a bridge score means; Dev wants one sentence he can quote. | `17.png`, the download |
| 6 | 1 | behavior | The Export dialog and its Export button share the accessible name "Export", so a request for "the second Export" landed on the dialog background and did nothing, silently. Not an app defect (repro above); listed for the accessibility check's duplicate-name part. | step 16 `16.png`; repro `rounds/round-1/repro/r1-s04b/` `03.png`, `04.png` |
| 7 | 1 | behavior | The key box on the canvas covers the top of the drawing (Blacheville and Listolier sit under it). | `17.png` |

No problem in this session is a build defect under the criteria (no crash, dead control, wrong
count or keyboard block). Problems 1, 2, 3 and 4 repeat findings from r1-s03b (label legibility,
size under Shape, the unlabeled size-by-value icon, the method renamed by its result) and count
toward confirmation as behavior and wording.
