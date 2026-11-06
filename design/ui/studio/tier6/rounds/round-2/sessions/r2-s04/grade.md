Grade: S
False done: no
Wrong turns: 1
Model calls: 6
Failure: none
Participant model: claude-opus-5-5 (from the participant's log; no line in it names sonnet)
Steps: 4 to the success state, on the path of 3 or 4; 10 in all with the reader's own checking

# Session r2-s04: T91 B, Maren, yeast genes

**Result.** The nine genes with `gal4RGexp` below -1, and only they, look different on the canvas, and
Maren reported 9 with a basis on screen. She reached that on the success path, then spent six more
steps checking it, which the task's "how you know" invites.

**Why it is not void.** `leaks.json` found one transcript and no leaks in 25 calls. The session ran on
the frozen build (`session.json`: 3b2a7f0649, no uncommitted changes), and the tool missed nothing.

**What the records show.**

- `styles.json`: one layer added, `gal4RGexp below -1`, from the Assistant. Its selector is
  `data.gal4RGexp < -1`, matched 9, painting size 3 and color `#ff0055`. Nothing else changed.
- `data.json`: 9 nodes drawn `#ff0055` and 322 drawn `#6366f1`. The key card reads "Color: gal4RGexp
  below -1, 9 of 331 nodes".
- `10.png`, the last screen: the Nodes table sorted lowest first, with nine rows below -1 (GAL1, GAL7,
  GAL10, HOM3, ADE4, HIS7, GLN1, MET16, GAL3). These are the key's nine. The tenth row, RPC19, is
  -0.979. The canvas above still shows the red dots and the key card.
- `04.png`: "Found 9 genes", "Sized 9 nodes" and "Colored 9 nodes" were on screen at step 4, before she
  reported anything.

**How the reader got there.**

| Step | What she did                                 | Screenshot | On the path                  |
| ---- | -------------------------------------------- | ---------- | ---------------------------- |
| 1    | Clicked Assistant                            | 02.png     | Yes                          |
| 2    | Clicked the composer                         | 03.png     | Yes                          |
| 3    | Typed the request                            | 03.png     | Yes                          |
| 4    | Clicked Send, read the reply                 | 04.png     | Yes: success state reached   |
| 5    | Opened "5 steps"                             | 05.png     | Checking                     |
| 6    | Clicked Open layer                           | 06.png     | Checking                     |
| 7    | Clicked Data, looking for the table          | 07.png     | Wrong turn: no table there   |
| 8    | Clicked the grid icon in the toolbar         | 08.png     | Checking                     |
| 9    | Clicked the gal4RGexp heading                | 09.png     | Checking: sorted highest first |
| 10   | Clicked the heading again                    | 10.png     | Checking: sorted lowest first  |

The grade stays S and not SD because the one wrong turn came after the success state, while she was
checking a number she already had with a basis on screen. The route to success was no longer than the
path.

**Her report.** She said 9 and gave four grounds: the reply, the layer's rule and key card, the sorted
table, and the nine red dots. All four were on screen when she gave them. She said she did not take the
model's word, so nothing rests on trust. "Did I finish: yes" matches the last screen, so there is no
false done.

**Whether a change that applies at once is comfortable.** It was for this reader. She asked for no
preview and named Undo beside the result as a good thing.

## Problems

No build defect, so no repro. Each problem below is a matter of design or wording, and none blocked the
reader or left her with a wrong belief.

| Severity | Kind    | Problem                                                                                                                                                       | Evidence                  |
| -------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| 2        | behavior | The table has no way in from the Data place, and its toolbar button is an icon with no visible word. She looked under Data, found no table, and guessed the icon. Cost: one wrong turn and a guess | Steps 7 and 8, 07.png, 08.png |
| 2        | behavior | The opened steps show "Query data" and "Style" with a chip of 9, not the condition that was run. A reader checking the number learns nothing there and has to find Open layer. Cost: one extra step | Step 5, 05.png            |
| 1        | wording | Which nodes reads "Rule: data.gal4RGexp < -1, 9 nodes": correct and she read it, but it is written as code                                                     | Step 6, 06.png            |
| 1        | opinion | With the table open the canvas shrinks and the red dots carry no labels, so she could not tell which dot is which gene. She did not try selecting a row, so whether a row links to its dot is untested | Step 10, 10.png           |
| 1        | behavior | A number column's first sort is highest first, so a question about the lowest values takes a second click. The line above the table says which way it is sorted, and she corrected it at once | Steps 9 and 10, 09.png, 10.png |
