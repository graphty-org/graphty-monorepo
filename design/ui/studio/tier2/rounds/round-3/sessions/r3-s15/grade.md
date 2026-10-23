# Grade: session r3-s15 -- Alex (regular analyst), bus stops (T22 A), point out every link of 10 minutes or more

**Grade: SD** (success after a detour). The last screen (`15.png`) shows the three links of 10
minutes or more drawn thick and black -- the two links into the large hub stop and the long link
across the top -- while the other 14 links stay thin and gray and all 10 stops are still drawn.
A key at the top left reads "Edge color: minutes >= `10`" with a black swatch. The left panel
holds a layer row "minutes >= `10`" above PageRank and Everything, and no filter step is on. The
count, 3, was read from the screen: "3 edges selected" under the find box, with a "Selected edges"
table listing School -> Harbor 12, Depot -> Station 15 and Station -> Harbor 14 (`03.png`,
`10.png`). All of this matches the answer key. The answer key accepts "a selection or a color that
marks exactly those ties"; here the mark is a color layer, which outlasts the selection.

The detour: to check that no link of exactly 10 had been left out, Alex ran a second rule,
"=minutes == `10`". It matched nothing and cleared the first selection (`08.png`), so he had to
clear the box and run the first rule again (`09.png`, `10.png`). The key grades "a selection lost
... and made again" as SD.

Build seen: `26f3bb968e43 graphty@0.8.61` (session.json), the frozen build named at the top of the
criteria, at 1440 x 900. Start: setup `bus-stops-ranked.txt` (stops sized and colored by
PageRank). Tool commit `acf3894e2c56`, no uncommitted changes.

## The answer against the key

- **Count (right).** 3, read from "3 edges selected" and from the "Selected edges" table
  (`10.png`). The three links and their minutes match the key exactly.
- **Marked on the drawing (right).** `15.png`: exactly the three links are black and thicker.
  Their positions match the three blue bands of the selection in `10.png`. `work.json` agrees:
  at the end one layer was added (`minutes-10_1 "minutes >= `10`"`), and the run, the source and
  the other layers are unchanged. No notes, no steps, nothing gone.
- **Nothing taken off the drawing (right).** 10 stops and 17 links drawn; no filter step was
  added (`work.json` "steps": []).
- **Not a failure.** Not `hid-the-rest`, not `not-marked` (the black layer marks them with no
  selection needed), the count is not wrong, and not `false-done`.

## Measures

- **Route:** a rule in the find box. Alex typed the condition without "=" ("minutes >= 10"), got
  "Start with = to select by a value:" with the corrected rule as an option, and clicked "Select
  its matches" (`02.png`, `03.png`). He did not type "=" without being shown it. The bare number
  was corrected for him; he did not retype it.
- **Steps:** 14 `real.mjs` steps after the start (`02.png` to `15.png`). The count was on screen
  after step 2 (`03.png`), the same number of steps as the round 2 route without the "/" key.
  Round 3 is compared with round 2 on the grade and count only, not on steps.
- **Wrong turns:** 4. (1) The Data page and the minutes attribute, to look for a list of values
  (`04.png`, `05.png`); it shows the range 2 to 15 and "10 distinct values", but not the values.
  (2) Everything's Values tab, looking for a table of links (`06.png`); it shows only the counts.
  (3) The "== 10" rule, which cleared the first selection (`07.png`, `08.png`). (4) Width 24 on
  the selection's style, which made the selection band large enough to hide his own styling
  until he clicked off (`14.png`).
- **Where he looked for "select where":** the find box first (step 2). He did not look for a
  separate dialog. To check the boundary value he looked in the Data page's attribute summary
  and in Everything's Values.
- **Turning the mark into a style:** Alex went on to the selection's Style tab and added Line
  Color and Width (`11.png` to `14.png`). The app made a new layer named after the rule, and the
  key showed it. This goes beyond what the task asked, but it is what makes his mark survive a
  click on the canvas (`15.png`).
- **False "done":** none. His "Done" at `15.png` is true: the three links are marked, everything
  is drawn and the count was on screen. His end description (three links in the top part around
  the large hub, none in the bottom half; the key says black means the rule) matches `15.png`.
  truth-on-screen holds.
- **Lost earlier styling:** none. The PageRank size and color stayed.
- **Ease (from the transcript):** 6 of 7. Not used for the grade.
- **Build-decided:** no. **Void:** no. Every step printed its screenshot; `leaks.json` shows no
  leaks; `setup.log` shows the file was chosen.
- **Scripted exit:** not applicable; he finished.

## Problems

| #   | Severity | Kind            | Problem | Evidence |
| --- | -------- | --------------- | ------- | -------- |
| 1   | 2        | data-loss       | A rule that matches nothing still replaces the current selection. Running "=minutes == `10`" only to check the boundary cleared the three selected links and showed "Nothing matches this rule", so the user had to make the selection again. Nothing warns that a second rule replaces the first. | `07.png` -> `08.png` (Selection row has no count, bands gone); transcript steps 8 to 10 |
| 2   | 2        | missing-info    | There is no place to see a column's actual values to check a boundary. The minutes attribute page gives the range (2 to 15) and "10 distinct values" but no list, and Everything's Values has no table of links. The only way to check "is any link exactly 10?" was a second rule, which led to problem 1. | `05.png`, `06.png`; transcript steps 5 and 6 |
| 3   | 2        | feedback        | Adding Width to a style made from a selection starts at 24. The selection's blue band grows with it and hides the new black line, so the user cannot see his own style until he clears the selection. | `14.png` (Width 24, wide blue bands); `15.png` after the click; transcript step 14 |
| 4   | 1        | wording         | The rule's backticks show everywhere it is named: the layer row, the layer panel heading and the drawing's key read "minutes >= `10`". A reader sees code, not "10 minutes or more". | `13.png`, `15.png` key and layer row; transcript end |
| 5   | 1        | discoverability | Adding a color on the selection's Style tab silently creates a lasting layer named after the rule. The outcome was good, but nothing said it would happen until the row appeared. | `12.png` -> `13.png`; transcript step 13 |
| 6   | 1        | defaults        | The added edge color starts as black (000000). Black on the gray links was easy to miss beside the blue selection; he would have picked a louder color if asked. | `13.png`; transcript step 13 and end |
| 7   | 1        | feedback        | At the end the find box still holds the rule with "Rule: press Enter to select matches" under it, and the Selection row is empty; the box gives no sign that the rule is no longer selected. This did not matter here because the layer carries the mark. | `15.png` |

No severity 3 or 4: the count and the marked links were right, nothing was hidden, and every
problem cost steps or clarity on a route he completed.

Not studied: keyboard-only and screen-reader use. This session is a simulated returning user
briefed with a history, not a real person; a pass here is weak evidence.
