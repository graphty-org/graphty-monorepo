# Tier 6 round 2 insights: meeting the Assistant

Settled from `scores.md` by two independent skeptic checks, on the frozen build 3b2a7f0649
(graphty@0.8.92). Rule: an item both skeptics drop is dropped; an item one skeptic drops or weakens is
weakened (lower severity, narrower claim, or a caveat). Where the skeptics differed on a fact, it was
settled at its source and the source is named. Screens are under `sessions/` and `repro/` of this
folder. Most severe first. Participants are simulated: a failure is strong evidence, a pass is weak.

**Readers can use the Assistant, and no severity 3 is confirmed.** 11 of 12 sessions succeeded, none
claimed a false "done", every task has a success, and Undo restored everything in 2 of 2. The worst
problems left are severity 2. The largest of them is a promise in the Autosave tooltip that is false
for a project opened from a file.

## Where the items stand

| Item | Count | Kept | Weakened | Dropped |
| --- | --- | --- | --- | --- |
| Confirmed problems (rows of `scores.md`) | 23 | 8 (3, 5, 6, 7, 10, 12, 18, 23) | 14 (1, 2, 4, 8, 9, 11, 13, 14, 15, 16, 17, 19, 21, 22) | 1 (20) |
| Severity 3 claims | 3 | 1 (refused key, at 2) | 1 (project with no way back, to 2) | 0; 400% stays open at 3, not counted |
| Candidate insights | 6 | 0 | 4 (1, 2, 4, 5) | 2 (3, 6) |

**After the check: 0 confirmed at severity 3, 11 at 2, 6 at 1, 5 no longer confirmed, 1 dropped.** Both
skeptics' summary lines differ from their own rows; these counts come from the rows.

## Where the bars stand after the check

6 hold, 2 fail, 2 did not hold, 2 open. Bars 1 to 6, 8, 10, 11 and 12 are unchanged. Two change:

| Bar | In `scores.md` | After the check | Why |
| --- | --- | --- | --- |
| 7 A change can be taken back | Fails, 1 of 2 | **Fails as worded**, and not on any fault in Undo | Undo held 2 of 2. r2-s09 fails because the bar reads the session's end, and that reader closed the tab after the task was finished, as her persona's rule told her to |
| 9 No severity 3 or 4 | Fails, 1 confirmed | **Open**, none confirmed | Finding 1 falls to 2. The 400% claim stays open at 3 until `repro/` holds it; it needs no model call |

r2-s09's grade stays F: bar 1 reads the end state, and the skeptics did not contest it. Its success
state was true at step 12, so the task count is 12 of 12 if the session is read to that step.

## Corrections to `scores.md`

- **"A different door opens the same file with a handle" is false.** The start screen's Open a file and
  the main menu's Open project or file are one command. `chooseAndOpenFile` in
  `graphty/src/workspace/start/open.ts` calls `pickFiles`, a plain file input in
  `compact-mantine/src/components/inputs/pickFiles.ts`. Only Save and Locate... (`locateFile` in
  `graphty/src/workspace/project/files.ts`) get a handle. So no way of opening a file reaches Recent
  projects, in a real browser too.
- **So the third row of "Study defects" is wrong as worded.** The setup did not pick a special door.
  The `--reopen` row and Ruth's history are true of saved projects, and she had saved hers in that
  history. They still led her to expect an entry this project could not have.
- **The Autosave chip has a tooltip.** "Says neither what nor when" is true of the label only.
- **Hovering is a deliberate command in the study tool.** All 12 sessions hold one hover of anything
  (r2-s11, "Sends to Google"; counted in `route.jsonl`). A real pointer crosses things on its way, so
  every "nobody hovered" line measures the tool. Round question 5 and the chip-hover measures carry this
  limit: the design's one-hover check is untested, not refuted.
- **Show in table was used in 6 sessions, not 9:** r2-s03, r2-s05, r2-s06, r2-s07, r2-s11 and r2-s12.
  r2-s04, r2-s09 and r2-s10 used the toolbar's Table, and r2-s09 and r2-s10 were looking for leftovers.
- **Round question 3:** r2-s10 did not read "crews" as a finding. At step 5 she wrote that it "worked out
  groups from who is linked", so the "briefly did" is withdrawn.
- **Candidate 5's selection example is wrong:** r2-s01's selection has its line, "Selected 1 node"
  (`sessions/r2-s01/18.png`).

## Findings, most severe first

### 1. "Autosave" promises a return that does not happen for a project opened from a file. Severity 2, weakened from 3

- **What happens:** a reader opens a file, changes it, undoes the change and closes the tab. On coming
  back, the start page shows nothing of it: no Resume, no card, no Recent projects, no word
  (`repro/r2-s09/walk-undone/05.png`). With a change still on, a Restore card appears
  (`repro/r2-s09/walk-kept/04.png`).
- **The real defect is the promise.** The chip's tooltip reads "Your work is kept in this browser and
  comes back when you reopen graphty." (`graphty/src/workspace/autosave/words.ts`). Here it does not come
  back. `findKept` offers only entries with changes, and `remember` keeps no entry for a file without a
  handle, which is every opened file. No reader saw the tooltip; see the hover correction above.
- **"No way back" is false.** Open a file, then the file, brought the project back ("Opened
  lesmis-poster", `tmp/design-studio/tier6/skeptic1-r2/walk/10.png` in the main checkout). Nothing from
  the file was lost. Ruth stood in the file chooser at step 17 and declined, because reloading "proves
  nothing".
- **Why it is not a 3:** she was not blocked by the app, and she kept a true belief ("I can tell Noor it
  was back on screen"). The task was finished at step 12. The close came from her persona's rule, "Tests
  that work is kept", and T94's "exactly as she made it" primed the worry.
- **The label stands, at 2, narrowed.** "Autosave: saved" reads the same with a change on and after Undo.
  Two readers questioned it unprompted (r2-s09, and r2-s10 at step 2).
- **Untested:** whether the conversation comes back with a key. After reopening, the panel reads "Needs a
  key"; the key per tab is settled in `decided.md`.

### 2. A refused key reads as a connection failure. Severity 2, kept

- **What shows:** "Could not reach OpenAI: the connection failed. Nothing changed."
  (`sessions/r2-s01/18.png`). Both T90 readers resent once and neither learned the cause.
- **Not a tool artifact.** Both skeptics probed `api.openai.com` directly: with an `sk-` key the 401
  comes back with no `access-control-allow-origin`, so a browser really does hide it.
- **The fix can only say "may be".** The app cannot tell a refused key from a dropped network. Say the
  key may be at fault and offer the provider section; **keep Send again**, which is right for a drop.
  `scores.md`'s "stop inviting a retry" is rejected.
- **The missing way to the provider folds in here, at 1.** The failure row has no route, but "GPT-4o" and
  "Sends to OpenAI" sit on the same screen, and `decided.md` makes the label a door. The cost was one
  extra click in one session, with Settings opening on General.
- **Limit:** the prompt handed over a second key, so a reader with one bad key was not tested.

### 3. A question can repaint the network, and the turn does not say so. Severity 2, kept

- **What shows:** `styles-steps.jsonl` records a repaint in r2-s01, r2-s02, r2-s06 and r2-s12, and none in
  r2-s05 or r2-s11. `sessions/r2-s02/29.png` has the drawing colored by closeness above a reply saying it
  worked "without altering the graph's styles".
- **Whose it is:** the repaint varies by run. The denial is the model's prose, so count it as the model's.
  "Color: Closeness" and the turn's Undo were there to tell by. One reader liked the repaint.
- **What is left of "a turn does not own all it did":** a painting run shows only "Computed ..." with no
  Colored row (also `sessions/r2-s10/05.png`). That is real, and it is the evidence the open ruling asked
  for. It leans toward a row, though no reader was left with a wrong belief.

### 4. Readers who want proof go to rows, and Show in table leaves those rows out of view. Severity 2, kept; the insight weakened

- **What shows:** 7 nodes selected, the table "In the order loaded", no shaded row in view
  (`repro/r2-s06/walk/04.png`). Reproduced, and seen in 3 sessions. The 2 is for large files; on a
  24-node file it costs one scroll, a 1.
- **The insight, narrowed:** only that readers who wanted proof went to rows. The prompts' "how you
  know" and a tool that clicks by name both favor a labeled button.

### 5. The scope line does not warn that a selection narrows the answer. Severity 2, kept and narrowed

- **What shows:** "Among your selected sources, Victor Szabo" over "Selection 14"
  (`sessions/r2-s05/05.png`). Dev read the line at step 2 and asked anyway. He caught it from the
  reply's word, then wrote: "If I had not read that one word I would have told her the wrong person."
- **The count:** one reader harmed, and that session is the study's plant. r2-s11 cost nothing,
  r2-s01's reply was right, and r2-s03's extra message came from a fixed id list.
- **Only the missing warning is open.** A selection moving the scope is the design, and a click selecting
  is settled (`decided.md`, Hover or focus peeks; design 5.3).

### 6. One measure has several names. Severity 2, kept

Reach and Closeness (r2-s01), Bridges and Betweenness (r2-s05, r2-s06): each reader asked or had to assume.
r2-s12 cost nothing and r2-s08's "Separate pieces" is one unfamiliar word, so neither is evidence.
"Color: Louvain" against "Computed Communities" belongs here (`sessions/r2-s10/05.png`). The direction is
set by `design/ui/framework/glossary.md` section 2, rule 1 ("No friendly substitute reaches a label"),
subject to the `plainName` rule in `CLAUDE.md`.

### 7. A long reply ends below the fold, taking its chips and Undo with it. Severity 2, narrowed

`sessions/r2-s01/18.png` shows the reply cut mid-line on the design's 1440 x 900 window. The real cost is
the hidden chip row and Undo. The two scrollbars are classic Linux headless bars, cosmetic at 1 to 2.
"Never scrolled" is partly participant behavior. So bar 11's one unseen change line stays unseen.

### 8. A waiting question is the smallest text on its card. Severity 2, kept

Traced to source, two sessions and two experts (`sessions/r2-s07/05.png`). The repro did not bring the card
back, which concerns the model's path, not the card.

### 9. Opened steps say what ran, not what was asked. Severity 2, trimmed

Solid in r2-s03 and r2-s04, and r2-s10 by one skeptic's reading, at about one step each. r2-s05's grade has
a different complaint and r2-s09's is a mild "not much to check". Bar 10 forbids a tool's arguments on app
rows, so the fix is plain words, not the arguments.

### 10. Enter in the API key box does nothing and says nothing. Severity 2, kept

One session plus a reproduction (`repro/r2-s02/walk/07.png` to `08.png`). It led to the overshoot onto
Forget key, and a pointer reader would try Enter too.

### 11. Five more at severity 1

The sixth severity 1, the failure row's missing way to the provider, is inside finding 2.

| Problem | State | Why |
| --- | --- | --- |
| The Undo notice ends in a doubled period | Kept | Proved by contrast: r2-s09's request ended in a period and got "..", r2-s10's had none and got one |
| The wheel does not scroll the start page over the hero | Kept, mechanism named | Not the tool: the same `--wheel` did nothing at 300,700 and 1000,500 and scrolled at once at 30,850, the facts bar (`tmp/skeptic2/wheel/` in the worktree). The comment in `StartPageFrame.real-element.test.tsx` says the graph's canvas keeps the wheel for zooming. The canvas runs under the hero, so this reaches what looks like empty page |
| Replies before and after an approval run together | Weakened from 2 | No wrong belief, the repro did not return it, and `decided.md` settles keeping the words. Only the missing gap is open |
| Open run lands on Style | Weakened from 2 | Rests on r2-s06 at one extra click. "Says nothing" is r2-s09 alone. r2-s06's scripted tries could not click it, and that cause was never found |
| Community results read Group 1 to N | Weakened from 2 | The file has no group names, so the words are true and a fix would need a concept the product lacks |

## No longer confirmed

Worth a fixer's attention, not counted.

| Problem | Why |
| --- | --- |
| "Sends to Google" tooltip says "graph details" | One hover, r2-s11. r2-s06, r2-s10 and r2-s11 started from setups that skip the disclosure, and readers who saw it scored 3 of 3 |
| No word on when Undo stops, under a card saying "Undo can bring them back" | One skeptic dropped it. "For good" comes from the prompts, and the card is true and settled. Only r2-s07's question remains |
| Opening the table shrinks the drawing | Nodes do run under the toolbar (`sessions/r2-s07/07.png`), but no reader paid: a screen note |
| The turn's Undo goes with no word | Two different mechanisms. r2-s03 did not test it, r2-s10 recovered unaided, and the rule is settled |
| Settings opens with focus on the X | One skeptic dropped it. First-focusable focus is ordinary dialog behavior: a convenience only |

## Dropped

- **A number column's first click sorts highest first.** The line above the table says which way it
  sorts, both readers fixed it in one click, and both tasks wanted the lowest.
- **Returning readers prove a restore with the layer list.** The study taught it: both histories name the
  list, every setup ends on Graph, and the task asks how they know.
- **Readers wonder what a question costs.** Every persona's history states the cost and a limit of about
  eight, so it cannot be told from priming.

## Weakened, with what is left

- **A change that applies at once is comfortable only while safe.** One reader, r2-s10, on a task
  confounded by "exactly as she made it". What survives: do not reverse "Reversible changes apply at once".
  The rest is finding 1.
- **The model's knowledge and the file's facts look alike.** Only r2-s12 is the model's own knowledge.
  r2-s11's list is true file data, and r2-s10's "crews" is a computed result she already doubted. One
  session, and no defect.

## What held up

- Finding the Assistant: 2 of 2 named the word at once, with the "returning" limit in `scores.md`.
- The approval card: read 2 of 2, and its count was right.
- Undo in the reply: the first choice in 2 of 2, and it restored everything both times.
- The disclosure, once read: 3 of 3 twice, and both readers changed what they would load.
- Computed numbers: no count on a chip, card or line disagreed, across 12 graders.

## What to do with this

- `repro/` for the 400% claim, which settles bar 9. It needs no model call.
- An audit of the 193 session screens, which bars 10 and 11 still owe.
- Test whether the conversation returns with a key after a reopen.
- Before the next round: drop "RETURNING" from first-meeting prompts, keep the CORS lines from
  participants, and either make the tool's pointer cross controls as a real one does or stop reporting
  hover counts.

Three rulings stay open, none of them a one-way door: whether a painting run gets a Colored row (the
sessions lean yes), whether the kept "selection surviving Undo" covers a rollback, and whether
`decided.md`'s entry on the x reaches closing the panel.
