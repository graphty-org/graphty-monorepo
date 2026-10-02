# Round 7 grades: weight transfers by how often two accounts trade (Transfers, March 2026)

Task as given: "Two accounts that trade with each other often should be treated as more tightly
tied than two that traded only once, whatever the sums -- and graphty should use that in every
later analysis. Set that up as the transfers come in. The data on screen is a sample: one month of
card and bank transfers between accounts."

Grading bar:

- Success: One edge per Pair is chosen, and Weight is moved from amount to the derived count
  column with Higher means Stronger; the notice "Weight moved from amount to count" is read; the
  graph inspector's Weight line agrees after Load.
- Success with difficulty: keeps amount as the weight at first and changes it only after reading
  the match report.
- Failure: leaves amount as the weight while believing frequency is used.
- Known sample-data effect: both import screens say no two transfers share both ends, so the
  derived count is 1 on every row and a frequency weight changes nothing on this sample. A
  participant who says so is reading the screen correctly.

The intended path is: the transfers import screen with amount as the weight, then the same screen
with Pair chosen and count as the weight (the notice showing), then the loaded graph's inspector.

## The last check on the bar cannot pass in this skeleton

The loaded graph is a fixed state. It does not carry anything chosen on the import screen. Its
Summary says "Direction: Directed" and "Weight: amount, stronger" whatever was chosen, and that
includes the intended path's own last render (shots/tasks/t20-transactions/03.png), which shows
"Weight: amount, stronger". The Edit screen behind that link reopens on One edge per Row with amount
as the weight, and Apply returns to the same fixed graph. The Attributes list never shows a count
column.

So "the graph inspector's Weight line agrees after Load" was not reachable for anyone. Every
participant who looked after Load (three of five) saw amount and concluded, correctly by the screen,
that their choice had been dropped. That is a skeleton-fidelity effect, filed with the sample-data
effect above, not a finding about the design. The grades below are therefore given on the leg the
skeleton renders faithfully -- the import screen -- and each one is provisional on the loaded graph
being made to reflect the import before the next round.

## Grades

| Participant | Their own call | Grade | Import screen when they pressed Load | Where they ended | What they concluded |
|---|---|---|---|---|---|
| Fraud analyst (Sarah) | success | success | Pair, count = Weight, Stronger, Directed; notice read | Loading dialog (never opened the Summary) | Set up; "every later analysis" taken on faith |
| Alert reviewer (Nadia) | failure | success (provisional) | Pair, count = Weight, Stronger, Directed; notice read | amount's details: "Weight, set when loaded" | The setting did not stick, twice; gave up |
| Analyst Alex | success with difficulty | success (provisional) | Pair, count = Weight, Stronger, Undirected; notice read | Loading dialog, then a hover on Stronger | Mostly set up; doubts the 9,087 vs 9,113 counts |
| Bioinformatics researcher (Dr. Chen) | failure | success (provisional) | Pair, count = Weight, Stronger, Undirected (last try Directed); notice read | Data panel: amount is Weight, no count | The graph ignored the setting on Load and on Apply |
| ML engineer, recommendations (Chris) | failure | success (provisional) | Pair, count = Weight, Stronger, Undirected; notice read | Data panel after Apply: amount is Weight, no count | The graph ignored the setting twice |

Totals on the import screen: 5 success, 0 success with difficulty, 0 failure, 0 gave up.
Totals on the bar as written, including the after-Load check: 0 of 5 could pass it, and 3 of 5
tried. Nobody left amount as the weight while believing frequency was used.

Every participant took the same route in three clicks: Pair, then the count column's "Attribute"
role, then Weight. All five read the "Weight moved from amount to count" notice and named it as a
good thing (it told them amount was no longer a weight). None kept amount as the weight after
reading the match report, so nobody qualified for success with difficulty on the bar's terms. All
five also read the "No two transfers share both ends" line and the column of 1s, and all five
treated it as a property of the sample rather than of the setting -- the sample-data effect, read
correctly.

## Why each grade

**Fraud analyst -- success.** Recognized at once that amount was the wrong weight and that Pair was
"the pivot-table move." Chose Pair, made count the weight, read the notice. Clicked Undirected to
see whether A-to-B and B-to-A would merge, rejected it ("flow of funds is the whole job"), and her
final run loads with Directed. That peek was an open question about the task's wording, not a wrong
turn toward the goal, so it does not lower the grade. Her last render is the loading dialog; she
never opened the Summary, so she never met the fixed "amount" line. Single Ease Question 6 of 7.

**Alert reviewer -- success (provisional).** The cleanest import of the five: Pair, count as
Weight, notice read, Directed kept, Load. After Load the Summary said "Weight: amount, stronger".
She followed that link to the Edit screen (reset to Row and amount), redid the whole setup, pressed
Apply, and got amount again; amount's detail panel said "Weight, set when loaded". She stopped
("I've spent longer on this than on an alert"). Her own call is failure, and her reading of the
screen is right, but every step she took is the intended path; what defeated her is the fixed
loaded state. Graded success on the import, with the caveat. Single Ease Question 2 of 7, which
she split as 5 for finding the setting and the rest for it not sticking.

**Analyst Alex -- success (provisional).** Pair, count as Weight, notice read, then Undirected
because "trade with each other" sounded symmetric to him, then Load. Afterwards hovered Stronger
and read "A bigger value is a closer tie: a path through it counts as shorter." The hover came
after the setup was done and was about meaning, not about finding the control, so it is not a
"help from a hover" case. His own call of success with difficulty rests on doubts, not on a detour:
the edge counts that disagree under Undirected, and nothing saying the setup would apply to next
month's file. He never opened the Summary after Load. Single Ease Question 5 of 7.

**Bioinformatics researcher -- success (provisional).** Pair, count as Weight, notice read,
Undirected, Load. The Summary showed amount, Directed and 9,113 edges -- "none of it" what she set.
Redid it through Edit and Apply, then tried once more with Directed in case Undirected was the
cause; amount every time, no count attribute. Concluded the setting is silently dropped and that she
would keep the job in R. Correct reading of the fixed state. Single Ease Question 2 of 7 (5 for
finding the controls).

**ML engineer, recommendations -- success (provisional).** Pair ("the groupby"), count as Weight,
notice read, Undirected, Load, then opened Data to verify. Saw amount as the weight, Directed,
reciprocity 0 (against the 26 merged pairs the report had just claimed), and a filter "amount is at
least 1,000" he never made, narrowing the graph to 812 of 3,000 nodes. Redid the setup through Edit
and Apply: the stray filter went away, the weight stayed amount. Stopped. All three things he saw
after Load are the fixed state, not his choices. Single Ease Question 2 of 7 (6 for finding the
controls, 1 for the result).

## Findings that are about the design

Evidence counts are out of 5. Severity is Nielsen's 0 to 4 scale.

1. **Undirected changes one line of the report and nothing else (5 of 5 saw it; severity 3).** With
   Undirected chosen the match report says "Undirected: (a, b) and (b, a) now merge: 9,113 edges
   become 9,087", while the line under it says "9,113 rows became 9,113 edges", the Makes header
   says "9,113 edges from 9,113 rows", the loading dialog says 9,113 edges, and the sample rows still
   show count 1 where the merged pairs should show 2. Fraud analyst, alert reviewer, Alex, Dr. Chen
   and Chris all asked "which is it?"; the two from regulated work said they could not put either
   number in a case file or report. Part of this is the skeleton (the header and rows are not
   recomputed), but the design question is real: when a choice changes how many edges there will
   be, every count on the screen has to move with it, and the merged pairs' count has to be
   visible.
2. **Counting both directions as one pair is only possible by making the whole graph undirected
   (5 of 5 raised it; severity 2).** "Trade with each other" made all five participants ask whether A
   paying B and B paying A is one relationship. Three chose Undirected and said they disliked losing
   who paid whom for every later analysis; two (fraud analyst, alert reviewer) kept Directed for that
   reason. Alex and Chris each asked for a pair merge that ignores direction while keeping the edges
   directed. Worth a spec decision on whether One edge per Pair needs its own "either direction"
   choice.
3. **Nothing says the weight reaches every later analysis (3 of 5; severity 2).** Fraud analyst and
   Alex said they took "every later analysis" on faith; Alex noted the Stronger tooltip mentions only
   paths, not communities or centrality. The intended check -- the inspector's Weight line -- is the
   only confirmation, and in this skeleton it shows the wrong value (see above), so it could not be
   tested whether participants would find it reassuring.
4. **Nothing says the setup carries to the next file (2 of 5; severity 2).** Alex and Dr. Chen read
   "as the transfers come in" as next month's file and found nothing saying the mapping is kept as
   a recipe. Single-session evidence from two domains; not testable on this route.
5. **count appears only after Pair (1 of 5; severity 1).** The fraud analyst noted that someone who
   does not think "group by" first would look for frequency in amount's Weight menu and not find it.
   Single voice; no participant actually got stuck there.

## Skeleton and sample effects, not design findings

- The loaded graph ignores the import screen: Summary "Weight: amount, stronger" and Directed,
  Edit reopens on Row with amount, Apply changes nothing, no count attribute (alert reviewer,
  Dr. Chen, Chris). It blocks the bar's last check for everyone, including the intended path's own
  last render. It must be fixed in the skeleton before this task is run again, or the bar's last
  check must be dropped.
- A filter "amount is at least 1,000" (812 of 3,000 nodes) appears on the loaded graph in one
  click-through (Chris); it belongs to another task's fixed state.
- The Summary's Weight link cannot be clicked while the loading dialog is up (alert reviewer,
  Dr. Chen, one wasted step each); the study tool clicks before loading ends.
- Every derived count is 1 because no two transfers share both ends. All five read this correctly.

## Delights (named unprompted)

- The "Weight moved from amount to count" notice with Undo: 5 of 5. "It didn't leave two weights,
  and it told me what it took away."
- One edge per Pair plus a derived count column as a direct "count transfers per pair": 5 of 5,
  described as a groupby or pivot by four.
- Explicit Combine choices (Sum for amount, Earliest and latest for timestamp): 3 of 5.
- Loading progress with real counts and Cancel: 3 of 5.
