# Grade: session r1-s24 -- Elena, bigger dots for the important characters (Les Miserables)

**Grade: SD** (success with difficulty). PageRank was run, node sizes are bound to its result and
visibly differ, the key shows size, and Elena said correctly what the sizes and colors mean. It
is SD rather than S because she needed a tooltip ("Size by attribute") to find how to size by a
value, after two dead ends.

## The success definition, checked against the screen

1. **A ranking run.** `07.png`: after PageRank ran, all 77 dots are orange and the key reads
   "Color: Influence 0.003299 to 0.07543", the reference range. A row "Influence 77" sits in the
   outline. `08.png`: the Top 10 starts Valjean 0.07543, Myriel, Gavroche.
2. **Sizes bound to the result, visibly different, key shows size.** Last screenshot `17.png`
   (same state as `15.png`): the Influence row's Style tab has a Size line reading "1 to 3"; the
   key reads "Size: Influence 0.003299 to 0.07543" above "Color: Influence"; the dots clearly
   differ in size (two large dark dots, one in the middle and one at the bottom hub, several
   medium ones). This is the reference end state for this build.
3. **Meaning from the screen.** "Both stand for the same thing, 'Influence' ... Bigger and darker
   means more influential." Correct: sizes and colors are both the PageRank (Influence) result.
   "Valjean is the top one, then Myriel and Gavroche" was on screen in `08.png` before she said
   it. She hedged on which drawn dot is Valjean ("probably"), which is accurate: no names are
   drawn and hover showed nothing.

No downloads were expected for this task and none were saved.

## Measures

- **Steps:** 16 `real.mjs` steps after the start (`02.png` to `17.png`, two of them hovers after
  the task was done). The success path is about 11 commands, so about 1.5x.
- **Wrong turns:** 2. Step 4, the Style tab on the Graph row (`04.png`: only Canvas Background,
  Method and Seed), abandoned. Step 12, the Size field's "Open list" arrow (`12.png`: an empty,
  thin list), abandoned with Escape.
- **Help used:** a tooltip, "Size by attribute", on the unlabeled chain-link icon (`13.png`).
  This is what makes the session SD.
- **False "done":** none. "Did I finish? Yes" matches `17.png` (Size line bound, key shows size,
  dots differ). "Now it shows something" at step 15 is true. truth_on_screen: not applicable.
- **Activation:** she picked PageRank from the "Start here" tag and ran it with no detour, but
  said she could not tell whether "depends on most" meant PageRank or Betweenness; the tag
  decided for her.
- **Ease (self-reported):** 4 of 7.
- **Usage card:** declined with "No thanks" at step 2, no detour, no stated belief about what is
  sent.
- **Build-decided:** no. The empty "Open list" cost a wrong turn but she recovered. **Void:** no.

## Problems

| # | Severity | Kind | Problem | Evidence |
|---|---|---|---|---|
| 1 | 3 | build-defect | The Size field's "Open list" arrow opens an empty list. A control that does nothing; it sent her to a dead end. Already reproduced as a scripted path in `rounds/round-1/repro/r1-s27b/run.sh`, so confirmed. | step 12 `12.png` |
| 2 | 2 | behavior | Sizing by a value is behind an unlabeled chain-link icon whose purpose shows only on hover ("Size by attribute"). | step 13 `13.png`, step 14 `14.png` |
| 3 | 2 | behavior | No "Size" line on the Style tab; size is reached through "+" beside Shape. She had to guess the section. | step 9 `09.png`, step 10 `10.png` |
| 4 | 2 | behavior | The Graph row's Style tab offers nothing about dots (background, layout Method, Seed), so the obvious first place for "bigger dots" is a dead end. | step 4 `04.png` |
| 5 | 2 | behavior | Hovering a dot shows no name, so she could not check the biggest dots against the Top 10. | step 16 `16.png`, `17.png` |
| 6 | 1 | wording | The run is picked as "PageRank" and then named "Influence"; she was unsure they were the same. | step 7 `07.png` |
| 7 | 1 | wording | The Analyze list is jargon to a newcomer; she could not map "depends on most" to a method and relied on the "Start here" tag. | step 5 `05.png` |
| 8 | 1 | opinion | Running PageRank colored the dots but did not size them, and the orange shades barely differ. | step 7 `07.png` |
| 9 | 1 | wording | Three scales for one thing: key 0.003299 to 0.07543, Size line "1 to 3", and raw decimals with no words for what they mean. | `15.png`, `17.png` |
| 10 | 1 | wording | "Size by attribute": "attribute" is not her word. | step 13 `13.png` |
| 11 | 1 | behavior | The flask (Analyze) button in the toolbar has no visible label; she found it only through the outline's hint. | step 5 `05.png` |
