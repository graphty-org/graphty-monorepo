# Grade: session r1-s05 -- Alex, a whole first session on Les Miserables

**Grade: SD** (success with difficulty). Alex reached all five parts of the task in one sitting,
and no later step undid any of them. The grade is SD rather than S because Alex needed a tooltip:
he hovered the chain-link icon to learn that it means "Size by attribute" (step 10), and before
that he had to guess that size lives under "Shape" (step 7). He made no wrong turns.

The session ran on build `9d6598eea3e9 graphty@0.8.53` at 1440 x 900.

## The five parts (5 of 5 reached)

1. **Les Miserables drawn.** `02.png` shows Overview with Nodes 77, Edges 254 and Components 1,
   which match the reference values. Alex opened it from Samples on the start screen after
   answering "No thanks" on the usage card.
2. **A ranking run finished.** Alex typed "betweenness" into the Analyze search and ran it
   (`03.png` to `05.png`). On screen the result is named "Bridges". `05.png` shows all 77 nodes
   colored and the key "Color: Bridges, 0 to 1624". `06.png` shows the Top 10 starting Valjean
   1,624, Myriel 504 and Gavroche 470.6, which is the reference top three.
3. **Sizes bound to the result and visibly different.** In `12.png` the Bridges row has a Size
   line reading "1 to 3", and the key reads "Size: Bridges". Valjean, Myriel and Fantine are
   clearly larger than the other dots. `18.png` still shows the same. At the end Alex said:
   "Both the size and the color of a dot are that character's betweenness -- the app calls it
   'Bridges' -- from 0 to 1624. Bigger and darker means the character sits on more of the
   shortest paths between other characters." That is correct. Under the answer key, either the
   method's name or the name the app shows identifies the measure. The order he gave matches the
   Top 10 that was on screen in `06.png`.
4. **Names drawn.** In `14.png` the Bridges row, which covers all 77 nodes, has a label line
   bound to `name`, and the statement reads "77 labels, 7 hidden to avoid overlap". The drawing
   shows real names, not ids. The reference figure of "6 hidden" applies when the dots are sized
   by Influence; this session sized them by Bridges, which hides 7, the same as in r1-s04b.
5. **Image downloaded and passes the picture checklist.** The file is
   `downloads/les-miserables_current-view.png` (1806 x 1720), and `17.png` shows the toast
   "Exported les-miserables_current-view.png". The image passes every item on the checklist:
    - it has the same nodes in the same arrangement as `18.png`;
    - the sizes are visibly different (Valjean is much the largest, then Myriel and Fantine);
    - the names drawn on screen are also drawn in the image (small and soft, and overlapping
      around Valjean);
    - the key names both channels in use: "Size: Bridges" and "Color: Bridges", each 0 to 1624.

## Measures

- **Steps:** 17 steps of the session tool after the start (`02.png` to `18.png`). The last step,
  a hover, only checked a tooltip. The success path is about 18 steps, so this is about 0.9 times
  the path.
- **Wrong turns:** 0. Two steps were detours to learn the interface: guessing "+" beside Shape to
  find Size (step 8), and hovering the chain-link icon (step 10).
- **False "done":** none. Every "part n done" matches the screen. At part 4 he said "done-ish"
  and noted out loud that 7 names were hidden, so he did not claim that every name was shown.
  His closing claim, "all five parts", is true. The `truth-on-screen` tag does not apply.
- **Activation:** yes. Alex picked Betweenness, his own choice over the app's "Start here" mark
  on PageRank, found it by typing in the search box, and ran it with no help, no tooltip and no
  detour (`03.png` to `05.png`).
- **Usage card:** declined with "No thanks" at step 2, with no detour.
- **Build-decided:** no. **Void:** no. The tool did nothing a person could not do.

## Problems

| #   | Severity | Kind     | Problem                                                                                                                                                                                                                                                                                                          | Evidence                                                         |
| --- | -------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| 1   | 2        | wording  | Alex picks "Betweenness", and from then on every place that names the result says "Bridges": the left list, the key, the "Made with" line and the exported picture. Nothing tells him they are the same thing, and hovering "Bridges" shows no tooltip. Alex's slide key will say "Bridges" with no explanation. | step 5 `05.png`, step 6 `06.png`, step 18 `18.png`, the download |
| 2   | 2        | behavior | The Style tab has no Size heading. Size is reached through "+" beside Shape, and Alex had to guess that.                                                                                                                                                                                                         | step 7 `07.png`, step 8 `08.png`                                 |
| 3   | 2        | behavior | Adding Size gives a fixed size ("1"). Sizing by a value sits behind a chain-link icon with no visible label; its meaning, "Size by attribute", appears only on hover.                                                                                                                                            | step 9 `09.png`, steps 10-11                                     |
| 4   | 2        | behavior | The labels are tiny. Valjean's name sits on top of his own large dot, and names overlap around him, both on screen and in the exported picture.                                                                                                                                                                  | step 14 `14.png`, the download                                   |
| 5   | 1        | opinion  | Almost every dot is the same orange on the color scale; only the top end (Valjean) stands out. The size channel carries the information.                                                                                                                                                                         | step 5 `05.png`, `18.png`                                        |
| 6   | 1        | opinion  | With size and color both bound to Bridges, the key shows the same measure twice. Alex called this redundant but acceptable.                                                                                                                                                                                      | step 12 `12.png`                                                 |

None of these problems is a build defect under the criteria: there was no crash, no control that
did nothing, no wrong count and nothing that could not be done by keyboard. Problems 1 to 4 repeat
findings from r1-s03b and r1-s04b (the result named "Bridges" instead of the method, size found
under Shape, the unlabeled icon for sizing by a value, and small overlapping labels). They count
toward confirming those problems as behavior and wording findings.
