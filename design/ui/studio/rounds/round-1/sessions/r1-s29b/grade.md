# Grade: session r1-s29b -- Tom, Florentine families, bigger dots for the families that matter

**Grade: SD** (success with difficulty). In the last screenshot (`12.png`), node sizes are bound to
the PageRank result and the dots clearly differ in size. The panel's Size line reads "1 to 3" and
the key reads "Size: Influence 0.03066 to 0.1458" above "Color: Influence 0.03066 to 0.1458". Tom
said correctly what both mean. The grade is SD rather than S for two reasons: Tom found Size only
by trying the "+" next to Shape, and he hit one dead end, an empty dropdown on the Size line,
before the unlabeled chain-link icon led him to the binding.

## Success definition, checked against the screen

- **A ranking run.** `05.png`: PageRank ran and is shown as "Influence". All 15 dots are colored,
  and the key reads 0.03066 to 0.1458. `06.png`: the Top 10 starts Medici 0.1458, Guadagni 0.0984,
  Strozzi 0.0881.
- **Sizes bound to the result.** `12.png`: there is a Size line reading "1 to 3", and the key has
  gained "Size: Influence". The middle dot (Medici) is by far the largest. This is the end state
  the success path names.
- **Meaning.** Tom said: "The size and the color both show the same thing, what it calls
  'Influence': bigger and darker means the network depends on that family more." He chose
  PageRank, so the link between "Influence" and PageRank is also on record (step 5). That names
  the sizes, and it names the colors as the same Influence ramp. Both are correct.

## Measures

- **Steps:** 11 `real.mjs` steps after the start (`02.png` to `12.png`). The success path is about
  9 steps (11 commands), so the ratio is about 1.2x.
- **Wrong turns:** 1. At step 10 Tom opened the Size box's dropdown ("Open list"), and it opened
  empty (`10.png`). He backed out with Escape. Clicking the "+" next to Shape at step 8 was a
  guess, but it was on the success path, so it is not counted as a wrong turn.
- **False "done":** none. Tom answered "Finished? Yes" at the end, and `12.png` shows sizes bound
  and the size key present. He said the largest dot is "probably the Medici", hedged it, and was
  right: the largest dot is the top value, and the Top 10 in `06.png` puts the Medici first.
- **Activation:** yes. Tom picked a ranking measure and ran it with no help, no tooltip and no
  detour. He followed the "Start here" tag on PageRank (`03.png` to `05.png`).
- **Usage card:** declined with "No thanks" and no detour. He held no wrong belief about what is
  sent.
- **Ease (from the transcript):** 4 of 7, the midpoint of the scale.
- **Build-decided:** no. The empty dropdown cost one wrong turn but did not decide the grade.
  **Void:** no. Every click went to a visible control that a person could reach.

## Problems

| # | Severity | Kind | Problem | Evidence |
|---|---|---|---|---|
| 1 | 3 | build-defect | Adding Size gives a plain number box ("1") with a dropdown arrow. Its "Open list" opens an empty sliver with nothing to choose. The control that binds size to a result is the unlabeled chain-link icon beside it ("Size by attribute"), and nothing on screen points to it. Tom: "It opened... nothing. Empty. Did I do that wrong?" | step 10 `10.png`; repro `11.png` |
| 2 | 2 | build-defect | The color key is drawn over the drawing's top-left node. Only 14 of the 15 dots can be seen once Influence has run, and the size key added later still covers the same node. | step 5 `05.png`, step 12 `12.png`; repro `06.png`, `13.png` |
| 3 | 2 | behavior | The Style tab has no line called "Size". Size sits behind the "+" next to "Shape", and Tom found it only by trying ("Size is a kind of shape, maybe"). | step 7 `07.png`, step 8 `08.png` |
| 4 | 2 | behavior | Adding Size creates a fixed size of 1, not a size that follows a value. The only way to bind it to a result is an icon with no label. | step 9 `09.png`, step 11 `11.png` |
| 5 | 1 | wording | Tom chose "PageRank", and everything afterwards calls it "Influence". He assumed they were the same thing but was not sure. | step 5 `05.png`, step 6 `06.png` |
| 6 | 1 | behavior | No names are drawn on the dots, so Tom could not point to the Medici on the picture. Only the list on the Values tab named them. Naming dots was not part of this task. | step 12 `12.png` |
| 7 | 1 | wording | The Size line reads "1 to 3" and does not name the value it follows, while the Color line beside it says "Influence". Only the key on the canvas says what the sizes stand for. | step 12 `12.png` |
| 8 | 1 | opinion | Running the measure colors the dots but does not size them. Tom expected sizes because the task asked for them. | step 5 `05.png` |
| 9 | 1 | opinion | The method list uses algorithm names (Betweenness, Eigenvector, Katz, HITS). Tom got past it only because one said "Start here". | step 3 `03.png` |
| 10 | 1 | opinion | The key shows raw decimals (0.03066 to 0.1458), and nothing on screen says what 0.15 means in plain words. | step 12 `12.png` |

## Repro of the build defects

Script: `rounds/round-1/repro/r1-s29b/run.sh`. It ran on build 452285142099 (graphty@0.8.53), the
same build as the session, and produced the same screens.

- **Legend covers a node.** Open Florentine families, then Shift+A, then PageRank, then Run.
  `06.png` shows the color key over the top-left node, with 14 of 15 dots visible. `13.png`,
  taken after size is bound, still shows the node covered.
- **Empty Size dropdown.** Influence row, then the Style tab, then "Add to Shape", then "Size",
  then "Open list". `11.png` shows the empty dropdown under the "1" box.
