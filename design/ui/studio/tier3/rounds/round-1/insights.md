# Tier 3 round 1 insights: first use and styling on the real graphty app

Settled from `scores.md` by two independent skeptic checks, on the frozen build 758b8e8081
(graphty@0.8.91). Rule: an item both skeptics drop is dropped; an item one skeptic drops or
weakens is weakened (lower severity, narrower claim, or a caveat). Every participant is the same
model playing first-time personas, so a failure is strong evidence and a pass is weak.
Screenshots are under `sessions/` and `repro/` of this folder. Most severe first.

## Where the bars stand after the check

- **Bar 5 (severity 3 and 4 open): fails, but only on the two backlog items rated 3 before the
  round.** No new severity 3 survives. Candidates 1 to 8 are real problems at severity 2;
  candidates 9 and 10 are dropped from bar 5 (no repro, no session reached them).
- **The node's own Fill "+" that makes a one-node layer** counts by the frozen rule, with corrected
  evidence: only r1-s53 (T51 A) rated it 3; r1-s35 (T43 A) rated it 2; r1-s15 (T47 A) opened a
  node's Style tab and left without a change, so she made no one-node layer. All three were SD
  with one wrong turn.
- **The folder's chain icon that paints every cluster one color** counts by the same rule. No
  session reached it (0 of 10 on T46 and T47), so round 1 says nothing about its severity.
- **Bar 1 fails only on T49 B's F in r1-s46, and the grading rule causes it, not the reader.** The
  drawing is plainly yellow (`sessions/r1-s46/07.png`, `#FFD700`, hue 51 degrees), but the color
  table names it "gold", and "gold" does not contain "yellow". The rule is frozen for this round,
  so the F stands.
- **Bar 6 gains one item:** the inspector's F6 stop draws no focus indicator (WCAG 2.4.7).

## Insights, most severe first

### 1. Newcomers look for the nodes' color in the Graph inspector before the layer list

With nothing picked, the Graph inspector's Style tab holds only canvas settings (background,
lighting, labels) and points nowhere for node color or size. 9 sessions on 5 halves (T39 A, T43 A
and B, T51 A and B) went there first. Each recovered only by matching the count beside "Everything" in
the layer list to the node count. Every one succeeded, so the door is found, but only through a number
match. Both skeptics kept this unchanged. Severity 2.
Screenshot: `sessions/r1-s33/04.png`.

### 2. A new style line starts at the value everything already has, so adding it looks broken

Fill "+" adds a Color line holding `6366F1`, the color every node already is, and a new edge Width
line starts at 8, the width every tie already has, with no unit. Accepting either changes nothing
on screen, and readers could not tell whether the line took effect. Seen in 9 sessions on 5 halves
(T38 A and B, T40 A and B, T45 A and B). Kept by both skeptics. Severity 2.
Screenshot: `sessions/r1-s25/11.png`.

### 3. Checking which nodes a layer paints is done by eye

Nothing on the drawing names a node, and pointing at one shows nothing. A layer's Values tab lists
members by id (`s05`), not by name. The table neither marks the rows the layer paints nor shows
only them. Readers on T41 and T50 cross-checked 24 rows by hand against a "4 of 24" count. No
reader misread a result. Weakened by both skeptics from 3 to 2: the tasks ask for people's names,
which forces the check, and both graders who rated it 3 graded S with 0 wrong turns.
Screenshot: `sessions/r1-s30/16.png`.

### 4. Keyboard users lose focus twice on the way to a styled graph

Two confirmed defects, each with a repro. The inspector's F6 stop draws no focus indicator while
every other F6 stop draws one (WCAG 2.4.7). Both "Samples" controls scroll to the library and
leave focus behind, so the next Tab goes to the top bar. On top of these, reaching a sample card
takes 30 or more Tabs (16 + 4 + 12 in the r1-s18 repro: nine category chips are nine stops, and
Enter in the search does nothing). Every keyboard session still succeeded (Sam, 4 of 4 SD), so the
cost is key presses, not failure; bar 7 holds. All three weakened from 3 to 2 by both skeptics.
All four keyboard sessions are one persona.
Screenshot: `repro/r1-s18/08.png`.

### 5. One color table decides both a grade and what the app says aloud

`colorWord` (compact-mantine) returns a CSS keyword before it looks at hue, so `FFD700` is "gold",
not "yellow", while `F16363`, a salmon, is "red". The app speaks the same names to screen-reader
users ("Node color, set here, gold"), and in T46 two different group colors share one spoken name.
This produced the round's only F and is the one place where what a reader sees and what the app
says disagree by measurement. Kept by both skeptics as fact. Whether the drawing's colors
themselves look alike is not shown: that claim was measured with the same table and is weakened.
Screenshot: `sessions/r1-s46/07.png`.

### 6. Color entry is slow when the reader does not know a hex code (weakened)

The color box is hex first, and nothing says it accepts a color word. The picker's swatches hold
no common hues. T39 A readers spent 2 to 3 extra steps on the hue bar; T39 B readers typed
"orange" or `FFA500`. Both skeptics weakened the comparison: the halves ask for different colors
(dark green, which has no memorable hex, against orange, a CSS keyword), the model typed hex codes
from memory, and a picker defect (build defect 2 below) adds steps on A. What stands: a color word
works every time it is tried, and nothing tells the reader so. Real newcomers would likely be
slower than these sessions. Severity 2.

### 7. Avoiding the purple "Layer" token is not the same as reading it (kept, weakly)

The trap never fired: 0 of 10 T46 and T47 sessions painted every cluster one color. But 6 sessions
on 5 halves called the `<<Layer>>` token unreadable and went around it. The bars count avoidance
as understanding. The token is really on screen; the "unreadable" verdict is the model's opinion.
Next round needs a measure that separates avoiding the token from understanding it.

### 8. The round is at its ceiling (kept)

55 of 56 sessions succeeded, with median wrong turns of 1 or less on every task. The signal is in
cost (steps over the key on T40, T43, T46, T50 and T51), routes and problems, not in success.
Every participant is the same model, which may cap what the round can find, and the answer key
describes most of the problems the graders cite, so grading may also be leading. Read the next
round's tasks for leading before more sessions are spent.

### 9. Smaller findings that survived, weakened

- **A shorter route competes with the bulk route.** On T47 A the Everything layer sets Box in 9
  steps against the folder's 11, and 2 of 3 took it; all 3 B sessions used the folder. One skeptic
  weakened it: the halves use different datasets, so path length is not the only difference.
- **Starting from the find box leads away from a rule.** Rests on 2 of about 24 picking sessions
  (r1-s28, r1-s31). The find box's value rows ("kind is company (6)") read as a rule but coloring
  from them makes a fixed id list, and the layer is named by its count ("4 nodes"). The screen does
  say "Picked by hand". Severity 2.
- **Keyboard cost against pointer cost.** The "3 to 20 times" figure compares key presses with
  pointer steps, different units, on one persona. Reported as cost, not as a ratio.

## Build defects (6, each with a repro)

1. A click on Style layers' "+" while the find list is open is lost: the press re-lays out the
   panel before the release, so the list closes, the button jumps and no menu opens (2).
2. One click on the color picker's hue bar sets the color and closes the picker (2).
3. **Weakened:** one mouse wheel notch zooms only 0.75% of the camera distance. The camera clamps
   each wheel event to one notch (`OrbitInputController`, `deltaY / 100` clamped to 1) and a notch
   moves the camera by `keyboardZoomSpeed / 2` = 0.0075. The study's "3000 wheel" was one synthetic
   event and so behaved as one notch; that measurement is a tool artifact. Needs a repro of about
   30 events of 100 that waits for the camera to stop before it stands as "barely zooms".
4. The first color with a find-box selection held moves the drawing about 130 px, a painted node
   under the inspector (2). Mechanism not traced; it may be a late camera glide.
5. The analysis filter lists seven community methods for "communit" and none for "community" (2).
   Quick actions finding no analysis may be by design (it searches commands): weakened.
6. **Restated:** the color swatch's focus is drawn as the whole box's border, so it looks like the
   hex box has focus (1); Escape from the selection then returns to the Graph inspector instead of
   the open layer (2). Control+A selecting the graph from a button is correct.

The two keyboard focus defects (insight 4) were also counted here in `scores.md`; they are
counted once, as bar 5 candidates.

## Design problems after the check

Kept as rated in `scores.md`: 1 to 7, 14 to 17, 20, 21 (merge with the find-box id list in
insight 9), 27 and 30. Kept at 1: 18, 19 (possibly 0), 22.

Weakened:

- **8, the purple token reads as jargon:** the guillemets are on screen; "jargon" is one model's
  opinion (insight 7).
- **9, nothing points to Which nodes after a run:** to 1. T48 went 6 of 6, median 0 wrong turns.
- **10, the new red beside a look-alike:** only the spoken-name clash is shown; measure perceived
  difference (delta E) before claiming the drawn colors look alike.
- **11, no shape called Cube:** to 1. "Cube" is the task's word; all 6 sessions found Box. A
  "cube" synonym would build the product around one task's wording.
- **12, "cluster" highlights Clustering coefficient first:** to 1. Both supporting halves are B
  halves whose prompt says "clusters".
- **13, nothing helps choose a grouping method:** to 1. Opinion; every session succeeded with
  Louvain.
- **23 ("Style layers", "Layer", "Folder" read as developer words) and 24 ("Everything" does not
  say it is the base):** to 0 to 1. Opinion with no cost in behavior.
- **26, two start-page controls named "Samples":** a bar 6 finding only. The refused clicks were
  the tool's, which the criteria count as tool events.

Dropped:

- **25, the storage notice worries readers:** it appears only because the automation's storage
  quota reads as a private window. For the same reason, 19 of the 72 words on "a sample just
  opened" (bar 8) are the notice; that screen is over its limit with or without them.
- **28 and 29 as separate items:** they repeat insight 4's keyboard walk.

## Bar 5 candidates, final

| #   | Problem                                          | Verdict                      | Severity |
| --- | ------------------------------------------------ | ---------------------------- | -------- |
| 1   | Inspector F6 stop shows no focus                 | Weakened (bar 6, WCAG 2.4.7) | 2        |
| 2   | "Samples" leaves focus behind                    | Weakened                     | 2        |
| 3   | Nothing shows which rows a layer paints          | Weakened                     | 2        |
| 4   | Find-box selection becomes a fixed id list       | Weakened                     | 2        |
| 5   | 30 or more Tabs to reach a sample card           | Weakened, merged with 28, 29 | 2        |
| 6   | The key covers drawn nodes                       | Weakened (no session misled) | 2        |
| 7   | Storage notice too wide at 900 x 700             | Weakened (automation-caused) | 2        |
| 8   | Saved project reopens off center, smaller window | Weakened (mechanism owed)    | 2        |
| 9   | Shift-click anchors on the last clicked layer    | Dropped from bar 5; watch    | 2?       |
| 10  | A picker that picks nothing looks healthy        | Dropped from bar 5; watch    | 2?       |

## Owed before round 2

- `score.mjs` bar 4 must take the start from the first steps line after the graph opens.
- A criteria decision, between rounds, on whether a CSS keyword inside the asked hue's band holds
  for the asked-color rule.
- A wheel repro with real notch-sized events; a trace of the 130 px move and of the off-center
  reopen.
- A measure for question 3 that separates avoiding the token from understanding it.
