# Round 1 insights: the tier 1 study on the real graphty app

## Addendum, 2026-10-06 (late): what the last 14 grades changed

The 14 valid first-run sessions are now graded, so the round rests on 43 graded sessions, not 29
(`scores.md`). Three conclusions below changed, and two got stronger:

- **Changed: bar 3 fails (insight 1 is severity 4 again).** Nadia (r1-s18) found Javert, read
  "Degree 17", tried the Neighborhood command, the Selection row, the node table and "Frame
  selection", and left: "I'm not clicking 17 dots one at a time and writing them down." Her
  grader rated it 4. The downgrade below rested on a single, thin failure (r1-s17b); there are now
  two failures on the same cause, one of them a clear decision to leave, and 0 of 6 mouse users
  ever clicked the Degree value. A skeptic could still set r1-s17b aside; then the case is one
  leave plus six misses, and the grade of the task does not change.
- **Changed: bar 1 is decided, and fails on T12.** The Les Miserables half of the neighbors task
  is 1 of 3, so it cannot reach 3 of 4. T15 (8 of 8), T3 (3 of 3) and T8 (3 of 3) now pass.
- **Changed: bar 2 holds** (first-time 31 of 34, 91%; at worst 84% once the owed sessions run).
- **New: the dataset decides the neighbors task.** On Florentine families (6 neighbors) every
  participant succeeded, three of four by clicking the six dots one at a time (r1-s20, s21b,
  s22b; 15 to 26 steps). On Les Miserables (17 neighbors) the same detour succeeded once, in 28
  steps (r1-s19b), and two participants left, one saying 17 dots one at a time was too many.
  A fix judged on Florentine families alone would look done; round 2 must report T12 per half.
- **Stronger: sizing by a result.** It is now named in all 12 SD sessions of the whole first
  session and bigger dots (14 sessions met it), and the empty "Open list" in 6. Tom (r1-s02) said
  two dead ends is where he normally stops. Still severity 2 for the chain (graders 2 in 11 of
  14), but it is the main reason the core tasks' ease sits at 4.1.
- **Stronger, now confirmed as behavior:** choosing a group does not mark its dots (3 sessions);
  the Data > Sources tables open an import page (8 sessions, across T3, T6 and T12); the wheel does
  not zoom (7 sessions).
- **Unchanged:** bars 4, 5, 6; no false "done" in 43; every run repainted at once.
- **Method:** no round 1 session ended at a step limit (longest 33 of 60 and 28 of 40), so the
  cap shaped no result. r1-s14 waited about an hour for a browser slot before its first step:
  more evidence for the runner change.

---

Written 2026-10-06 from `scores.md` after two independent skeptics checked every item against the
session transcripts, the grades, the reproduction folders (`repro/<session>/`), `criteria.md`,
`answers.md` and the app source. Rule applied: an item both skeptics drop is dropped; an item one
skeptic drops is weakened.

**Read every item with this caveat.** All participants are simulated, and all are the same model
playing different personas. "Seen in 2 or more participants" is therefore not independent
confirmation. A finding is solid when it has a scripted reproduction or a cause found in the code;
a finding that rests only on several participants behaving alike is weaker. A failure is strong
evidence; a pass is weak until real people confirm it.

43 of 56 planned sessions are graded. 7 were cut off or never started and move into round 2;
7 screen-reader sessions are blocked (see "Study method").

## The bars after the skeptic check

| #   | Bar                                                         | Before           | After                                          | Why                                                                                                                                                                                                                                |
| --- | ----------------------------------------------------------- | ---------------- | ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 3   | No confirmed severity-4 problem                             | Fails            | **Fails** (was "not shown" until the addendum) | A second participant left the neighbors task (r1-s18); severity 4 again (insight 1).                                                                                                                                               |
| 4   | No silent commit on a success path                          | Fails            | **Borderline fail, weakened**                  | "No crossings" does nothing and says nothing (reproduced). The T11 path is "pick another method", which a literal reading covers, but the only instance is one participant's first pick, which his grader counted as a wrong turn. |
| 5   | No count or legend sentence that disagrees with the drawing | Fails            | **Not shown**                                  | Both confirmed items dropped: each count is true. Still pending: the legend keeping an earlier run's key (r1-s49b), not yet reproduced.                                                                                            |
| 6   | No false "done"                                             | Holds            | **Holds, weak pass**                           | 0 in 29. Participants are told to report honestly, so a pass here counts for less than a failure would.                                                                                                                            |
| 7   | Keyboard sessions pass                                      | Cannot pass      | Cannot pass                                    | Screen-reader sessions cannot run; one keyboard session cut off.                                                                                                                                                                   |
| 8   | Automated accessibility check                               | Expected to fail | Expected to fail, narrower                     | The focus losses are real and reproduced. The duplicate-name items are weakened: let the bar 8 script decide them.                                                                                                                 |

Bars 1 and 2 (updated by the addendum): 39 of 43 sessions succeed as graded, 39 of 41 with the
two cut-off sessions void; first-time personas 31 of 34 / 31 of 33, which holds bar 2. Bar 1
fails on T12 (Les Miserables half 1 of 3); T15, T3, T7, T8 and T11 pass; the rest are open.

## Insights, most severe first

### 1. A node's neighbors by name are hard to find, and every detour is broken (severity 4)

Kept. Weakened from 4 to 3 by the skeptic check, then back to 4 by the addendum: r1-s18 is a
second failure, a participant who left with a stated reason. The two bullets below are the
earlier reasoning, kept for the record.

- **What holds.** On the selected node's Values, "Degree 17" is drawn in the same row style as the
  id and name rows (r1-s17b `07.png`). It is the only route to the list of neighbor names, and 0
  of 4 participants clicked it. Every detour they tried instead is a reproduced defect: the
  neighborhood selection's summary ("Babet (1)" for 18 nodes), clicking the Selection row (empties
  the inspector) and the Data > Sources tables (open the import page). Three of four named the
  neighbors by clicking dots one at a time: 25 to 28 steps, ease 2 to 3. The task's ease, 2.75,
  and its 4.3x the success path are the round's worst.
- **Why not severity 4 (superseded).** Only 1 of 4 failed (Elena, r1-s17b), and that session is the thinnest:
  16 steps in about 3 minutes (`01.png` 16:47:02 to `16.png` 16:50:06), ending with a bare
  `--end` and no stated reason, so time pressure on the agent cannot be ruled out. The other
  three graders rated it severity 3, and r1-s17b's own grader wrote that severity 4 needed a
  second participant.
- **A study artifact to note.** In compact-mantine `DataRow` with `onClick`, the row is a real
  button with a hover tint and a pointer cursor. Simulated participants act on still screenshots
  and almost never hover, so a hover cue is untested. At rest the row carries no mark, so the
  finding stands.
- **"Only route" is slightly overstated.** The Data > Node table would be a second route if
  clicking it did not open the import page.

### 2. Keyboard users lose focus on the core path (severity 3)

Kept. Rests on one keyboard participant (Sam), but both defects are reproduced in a persistent
browser: after a pick from a Style panel menu, focus falls to the page body (r1-s09b); the start
page's sample entries take focus with no visible ring (r1-s16b `run.sh`: after 7 Tabs with no
ring, Enter opened College football, which proves focus was there). Sam still finished the whole
first session, in 32 steps (1.8x the path).

### 3. The legend box hides a node (severity 3)

Kept. On Florentine families at a 1440 x 900 window the legend is drawn over the top-left of the
drawing and covers one of 15 nodes: r1-s29b `03.png` shows the node, `05.png` shows the legend
over it, with `run.sh` reproductions for r1-s28b and s29b. The "covers labels on Les Miserables"
half is not reproduced and is weaker.

### 4. Choosing "No crossings" does nothing and says nothing (severity 3)

Kept at severity 3; its weight on bar 4 is weakened (see the bars). On Les Miserables the method
box returns to "Force - Recommended", the drawing is unchanged, and no message says the method
cannot draw this graph (r1-s43b `06.png`; repro `rounds/round-1/repro/r1-s43b/06.png`). The
repro has screenshots and commands in the grade but no `run.sh`. The fix needs a refusal fact from
graphty-element and words from the app.

### 5. Sizing dots by a result is found by guessing (severity 2), and its list is empty (severity 3)

Weakened from severity 3 to 2.

- **What holds.** There is no Size line on the node Style tab; Size sits under "+" beside Shape;
  adding it gives a fixed "1"; binding it to a result is an unlabeled chain-link icon named only in
  a tooltip.
- **What does not.** "9 of 9 met the same chain" overstates it: three participants were led
  straight there by the "Size by attribute" tooltip (r1-s03b, s06b, s07b), and r1-s09b's extra
  steps came from keyboard focus loss. "It cost the one bigger-dots failure" is removed: that
  failure is r1-s27b, a session the run cut off after a 50-minute queue, with the success path
  still untried, which the round's rules make void. Every other session succeeded, with 0 to 2
  wrong turns; graders rated it severity 2 in 7 of 9.
- **Its own defect, severity 3.** The Size field's "Open list" arrow opens an empty list,
  reproduced with `run.sh` for r1-s27b, s28b and s29b. It never decided an outcome.

### 6. Other reproduced defects on the detours (severity 3)

All kept; each has a scripted reproduction.

- Clicking the inspector's "Selection" row empties the inspector to its heading (r1-s17b, s19b,
  s21b).
- Clicking a table under Data > Sources opens the "Add to <graph>" import page instead of the
  table (r1-s17b, s19b, s21b, s22b, s33b).
- A reopened project's run row loses its count: a restored run has no summary (r1-s47b).
  graphty-element.
- The mouse wheel does not zoom. `graphty-element/src/cameras/OrbitInputController.ts` has pinch
  and keyboard zoom but no wheel handler (`TwoDInputController.ts` has one), and screenshots before
  and after a wheel turn are byte-identical (r1-s10b, s11b, s12b, s15b, s19b).

### 7. A multi-node summary that says "Babet (1)" (severity 3, design and wording)

Kept, but not as a count that disagrees with the drawing and not as a build defect. For 18
selected nodes, the Summary shows "Babet (1)" for the name column. `attributeSummary()` in
`graphty/src/workspace/inspector/NodeValues.tsx` prints a column's commonest value with its count;
for a column whose values are all unique that is true and useless. The fix belongs in the app.

### 8. "Hidden to avoid overlap" offers no way out (severity 2)

Weakened from 3 to 2. The count is honest and fixed round 8's false "done", but it names none of
the hidden labels and gives no control to show them. Only 2 sessions tried to click the text
(r1-s10b, s12b), not 6. The task prompt ("Get every character's name written next to its dot")
itself sends participants looking for the hidden ones after they have succeeded; graders called
those post-success turns. Graders rated it 2 in 3 of 4 sessions. The wheel defect inside this
insight is listed separately (insight 6).

### 9. Node styling has no signpost from the graph's Style tab (severity 2)

Kept. The app opens with the whole graph selected, and its Style tab holds only Background, Method
and Seed. 8 sessions opened it first looking for node styling; every one recovered in about 1 step.
These 8 are one shared first guess by one model, not 8 independent observations.

### 10. The method's name disappears after a run (severity 1 to 2)

Kept, as a cost only. The Analyze list says "PageRank"; everything afterwards says "Influence"
(r1-s29b `03.png`, `05.png`); Betweenness becomes "Bridges". It never caused a failure. Graders
rated it 1 to 2. Simulated experts know the method names well, so they may notice the switch more
than real readers would; "experts checked values elsewhere" rests on one expert (r1-s30b).

### 11. The study runner, not the app, caused every void

Kept. See "Study method".

## Other problems after the skeptic check

| Sev | Problem                                                                                                                           | Verdict                                                                                                                                                                                          | Evidence                                         |
| --- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------ |
| 2   | The layout method list has no descriptions; an expert picked "Force, flat" to separate clusters and got the opposite              | Weakened from 3: one participant's anecdote; T11 passed 2 of 2                                                                                                                                   | r1-s43b, s44b                                    |
| 2   | Hovering a dot shows no name                                                                                                      | Kept                                                                                                                                                                                             | `tooltip: null` in the r1-s17b repro; 5 sessions |
| 2   | "N nodes, 0 edges" beside "Edges among them N" for a neighborhood selection                                                       | Kept as wording; removed from bar 5. Both counts are true (no edge is selected)                                                                                                                  | r1-s17b, s19b, s21b, s22b                        |
| 2   | The Values histogram draws equal-height bars when every value is distinct: honest per-value counts that mislead as a distribution | Kept, reworded. Cause in `buildHistogram` (graphty-element), reproduced                                                                                                                          | r1-s36b, s38b; r1-s48b incomplete                |
| 2   | Labels drawn tiny and piled in crowded centers; soft in the exported picture                                                      | Kept, weakly: the one misread name ("Bossuet") was a guess the participant flagged                                                                                                               | 8 sessions                                       |
| 2   | After binding, the Size line reads "1 to 3" without naming the value it follows                                                   | Kept (graders 1 to 2)                                                                                                                                                                            | r1-s06b, s07b, s28b, s29b                        |
| 2   | "Add label line" is disabled in Quick actions with no reason                                                                      | Kept                                                                                                                                                                                             | r1-s19b, s21b, s22b                              |
| 2   | Choosing a group lists its members but does not mark its dots                                                                     | Kept; confirmed as behavior by a third session (addendum), still no scripted reproduction                                                                                                        | r1-s39, s40b, s41b                               |
| 2   | Spectral leaves the drawing in one clump; the view is fitted to a few outliers                                                    | Kept, reproduced                                                                                                                                                                                 | r1-s43b, s44b `run.sh`                           |
| 2   | Table names in Data > Sources are cut off ("Node ...", "Edge t...")                                                               | Kept                                                                                                                                                                                             | r1-s31b, s33b                                    |
| 1   | The bottom toolbar is icons with no words                                                                                         | Weakened from 2: the one expert who hovered found Layout, which is normal tooltip use                                                                                                            | 6 sessions                                       |
| 1   | "Start here" on PageRank pulls the "depends on them" task toward it                                                               | Weakened from 2: PageRank is an accepted answer, and none of 9 sessions failed because of it; the pull may come from the task wording                                                            | 9 sessions                                       |
| 1   | The key shows raw decimals with no words for what the measure means                                                               | Kept, opinion level                                                                                                                                                                              | 5 sessions                                       |
| -   | No names drawn on the dots by default                                                                                             | Weakened (one skeptic dropped it): it is the intended default and the premise of the names task, not a defect                                                                                    | -                                                |
| -   | Two controls share an accessible name ("Export" button and dialog; "Neighborhood" button and menu item; "Graph")                  | Weakened (one skeptic dropped it): different roles, a common pattern, not plainly a WCAG failure. Came from the study tool's "ambiguous" prints. Bar 8's script decides; recheck "Graph" by role | r1-s03b, s04b, s17b, s33b                        |

**Not yet confirmed (one participant, no reproduction):** the legend keeps an earlier run's key
after a second coloring run (r1-s49b, severity 3, reproduction queued; it decides bar 5); Escape
closing the selection's menu also clears the selection (r1-s19b); Quick actions finds no styling
command (r1-s09b).

## Per-task notes

- **T12, one character and his ties:** 5 of 7, ease 2.86, 4.2x the success path. Fails bar 1 on
  its Les Miserables half (1 of 3); Florentine families 4 of 4, three of them by clicking dots.
- **T9, bigger dots:** with r1-s27b void it is 5 of 5 (Les Miserables 2 of 2, Florentine 3 of 3),
  every one SD. Lead with the voided count.

## What worked

- **No false "done" in 29 sessions** (round 8: 10 of 21 on names). A weak pass: see bar 6. The
  round 8 comparison is also confounded: round 8 ran on a mock study tool, not the real app.
- **The whole first session reached all five parts in 5 of 5 graded sessions**, on a sample and
  on an own file, with the legend in the exported picture.
- **Ranking and groups are quick:** running-club ranking 3 of 3 at the success path's length, ease
  5.3; circles of characters 2 of 2, ease 6.
- **Loading is easy:** a CSV is drawn on open; a broken file is refused in two steps with a message
  the participant forwarded as is (ease 7).
- **Every analysis run repainted the drawing and the legend at once.**

## Study method

**Why the harness lists failed sessions.** A session marked "failed" at 40m00s is a session agent
that hit its 40-minute limit. The limit includes the wait for one of the 4 shared browser slots,
and graders recorded waits of 17 to 50 minutes before the first step. Example: the first run of
r1-s03 (Nadia, whole first session) left 17 screenshots (15:17 to 15:24), no transcript and no
grade. It does not need a restart: it was run again as r1-s03b, which finished and was graded
success with difficulty. The same holds for every other first-run session that has a "b" re-run.

**What still has to run.**

1. Fix the runner first (now in `criteria.md`'s change log): at most 4 participants alive at
   once, no step cap, one or two sentences per step, and always `--end` the session even when the
   agent is stopped.
2. The 7 cut-off or never-started sessions (r1-s08b, s16b, s26b, s27b, s34b, s46b, s48b) run in
   round 2's roster, not as round 1 "c" runs.
3. Done: the 14 valid first-run sessions are graded (see the addendum).
4. Reproduce the stale legend (r1-s49b).
5. Run bars 8 and 9 by their scripts.
6. Morgan's 7 screen-reader sessions, once the study tool has a screen-reader mode.

**Also fix in the session prompt:** it asks difficulty as "7 = very hard", the reverse of the
Single Ease Question (confirmed in the transcripts); ask it as 7 = very easy.
