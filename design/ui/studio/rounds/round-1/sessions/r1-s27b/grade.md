# Grade: session r1-s27b -- Grace, bigger dots for the families that matter (Florentine families)

**Grade: F** (failure). The last screenshot (`11.png`) shows a ranking run (PageRank, shown as
"Influence") coloring the dots, but every dot is still the same size: the Size line on the
Influence row reads a fixed "1", the key shows only "Color: Influence", and Grace never said what a
bigger dot means. Failure code: `dead-end` (the Size field's "Open list" arrow opened an empty
list, a build defect reproduced below).

The session did not end by Grace's choice. The transcript says it "ended after step 11, before
the task was finished", after a wait of about 50 minutes for a browser slot; she had not given up
and had one untried lead (the chain-link icon, which is the success path). The criteria make a
session void only for a fault of `real.mjs`, and none occurred, so the grade stands as F from the
screen. Because the cut-off, not the participant, ended it, the session is worth re-running.

## Against the success definition

1. **A ranking run.** Reached. `05.png`: PageRank colored all 15 nodes, key "Color: Influence
   0.03066 to 0.1458". `07.png`: the Top 10 starts Medici 0.1458, Guadagni 0.0984, Strozzi 0.0881.
2. **Node sizes bound to the result.** Not reached. `10.png` and `11.png`: a Size line exists on
   the Influence row but holds the constant "1"; dots are unchanged; no "Size: Influence" in the
   key.
3. **Says what a bigger dot means and what the colors stand for.** Colors: read correctly at step
   5 and in her wrap-up ("light orange (low) to dark brown (high) Influence"). Sizes: she said,
   correctly, that size "means nothing yet". The task asks for the meaning of bound sizes, which
   never existed.

## Measures

- **Steps:** 10 `real.mjs` steps after the start (`02.png` to `11.png`). The success path is about
  9 steps; she was on it at step 10 (Size added) and one control short of the end state.
- **Wrong turns:** 2. Step 6, Style with the whole graph selected (`06.png`: only Canvas
  background, layout Method and Seed). Step 11, the Size field's "Open list" arrow (`11.png`: an
  empty, thin list), a build defect.
- **False "done":** none. At step 5 she said "it colored them, not sized them", and her wrap-up
  says "Finished? No" and "Size means nothing yet". Both match the screen. truth_on_screen: not
  applicable.
- **Silent commits:** none on the success path. Adding Size (step 10) set a constant 1, which is
  not a binding; the canvas did not change, as expected for the default size.
- **Counts that disagree with the drawing:** none. Nodes 15, Edges 20 (`02.png`) and "Influence
  15" match the drawing.
- **Usage card:** declined with "No thanks" at step 2, no detour, no wrong belief about what is
  sent.
- **Activation:** yes. She chose PageRank by its "Start here" tag and ran it with no help.
- **Build-decided:** partly. The empty "Open list" was her last screen; it did not by itself
  decide the grade, since the run's cut-off stopped her before she could try the chain-link icon.
- **Void:** no (no `real.mjs` fault).

## The empty "Open list" is a build defect

Reproduced with a scripted path, `rounds/round-1/repro/r1-s27b/run.sh`: start empty; "No thanks",
"Florentine families"; Shift+A, type PageRank, "PageRank"; "Run"; "Influence"; the Style tab;
"Add to Shape"; "Size"; then `--click "Open list"`. Repro `09.png` matches the session's `11.png`:
the field is focused and a thin, empty dropdown appears below it with no choices, and
`--expect-not "role=option"` passes (there is nothing to pick). Repro `10.png` is byte-identical to
`09.png`. The success path on the same build works: "Size by attribute", then "Influence", gives
"1 to 3" on the Size line and "Size: Influence 0.03066 to 0.1458" in the key, with Medici clearly
largest (repro `13.png`). Same commit as the session (4522851420998602a015e60ae2cbf339049a2c97,
graphty@0.8.53).

## Problems

| #   | Severity | Kind         | Problem                                                                                                                                                                                                              | Evidence                                                                   |
| --- | -------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| 1   | 3        | build-defect | The Size field shows an "Open list" arrow that opens an empty, thin dropdown with no choices. It looks like the place to pick Influence and leads nowhere; it was Grace's last screen.                               | step 11 `11.png`; repro `rounds/round-1/repro/r1-s27b/` `09.png`, `10.png` |
| 2   | 3        | behavior     | Sizing by a value is reachable only through an unlabeled chain-link icon ("Size by attribute" is only its accessible name). Grace guessed at it but never learned what it does. Same finding as r1-s04b and r1-s07b. | step 10 `10.png`, step 11 `11.png`                                         |
| 3   | 2        | behavior     | Running a ranking colors the dots but sizing is a separate, hidden step (select the result row, Style, "+" beside Shape, Size). No "Size" line at the top level of Style.                                            | step 5 `05.png`, step 8 `08.png`, step 9 `09.png`                          |
| 4   | 2        | behavior     | With the graph selected, the Style tab shows only canvas background and layout, with nothing pointing to where dot styles live (on a row such as Influence). A dead end for a first-time user.                       | step 6 `06.png`                                                            |
| 5   | 2        | wording      | The Analyze list is jargon; Grace could not tell whether any method means "what the network depends on most" and picked PageRank only because of "Start here".                                                       | step 3 `03.png`                                                            |
| 6   | 1        | wording      | The method is picked as "PageRank" and the result is named "Influence"; she was unsure they were the same thing.                                                                                                     | step 4 `04.png`, step 5 `05.png`                                           |
| 7   | 1        | behavior     | Adding Size gives a constant "1" with no visible change, so the step looks like it did nothing.                                                                                                                      | step 10 `10.png`                                                           |
| 8   | 1        | behavior     | No family names on the dots, and the color key box covers the top-left of the drawing.                                                                                                                               | step 2 `02.png`, step 5 `05.png`                                           |
