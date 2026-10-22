# Grade: session r1-s12 -- Alex, a regular analyst, keeps only the strong ties in Les Miserables (5 or more shared chapters), counts the characters left, then brings everyone back

**Grade: S** (success). Both parts are right and the last screen shows everyone back. With
`shared_chapters` at least 5 he reported 26 characters (and 51 ties), the answer key's value; on
the follow-up, at least 8, he reported 17 characters (19 ties), again the key's value. Each time
he brought every character back by unticking the step's checkbox, which the key accepts. He did
not fall into the known trap (ticking the checkbox after "Save and turn on", which would switch
the step off): he read that saving had turned the step on and unticked once to restore the graph.

Build seen: `946256efb876 graphty@0.8.56` (session.json), 1440 x 900, no uncommitted changes. This
is the frozen build named in the criteria. Every step ran and every screenshot matches its
command; the session is not void.

## What the last screen shows (`13.png`)

- Header: no "N of 77 nodes" chip (the filter chip is gone).
- Filters row: "shared_chapters is at least 8", second line "off", checkbox unticked.
- Overview: Nodes 77, Edges 254, with no "showing" rows.
- The drawing shows the whole network again.

The counts he reported are on earlier screens, in all three places the key names:

- At least 5 (`08.png`): chip "26 of 77 nodes", row "77 to 26 nodes", Overview "Nodes showing 26
  of 77" and "Edges showing 51 of 254".
- At least 8 (`12.png`): chip "17 of 77 nodes", row "77 to 17 nodes", Overview "Nodes showing 17
  of 77" and "Edges showing 19 of 254", checkbox ticked.
- Back after the first part (`09.png`): row "off", Overview Nodes 77, Edges 254.

## Measures

- **Steps:** 12 after the start (`02.png` to `13.png`): 8 for the main prompt, 4 for the
  follow-up. The success path is about 7 and 4.
- **Wrong turns: 1.** Step 2 (`02.png`): he looked for filters in the bottom toolbar and hovered
  its second icon, which is "Layout". He went to Data on the next step. He used the Filters "+"
  door rather than the attribute's "Filter to..." menu; the key accepts either.
- **False "done": none.** Every count he stated is on screen, and his "everyone is back" claims
  match `09.png` and `13.png`. truth-on-screen: no wrong claim on the task's question.
- **Side remark not on screen:** at step 8 he said the filtered drawing "clearly has three
  pieces". `08.png` shows two (a pair at the top, about 594,205 and 656,135, and one piece holding
  the rest). It is outside the question asked and changed nothing he did, so it is not graded as a
  claim, but it is the reason he wanted a filtered Components count (problem 3).
- **Traps avoided:** did not tick the checkbox after "Save and turn on" (`12.png` ticked, then one
  untick, `13.png`); did not read the legend's PageRank range as a count; did not count dots (the
  overlapping pair near 640,372 would have given 25 and 16).
- **Self-rating** (6 of 7) was not used in grading.

## Problems

Severity runs from 0 to 4 (Nielsen).

1. **Severity 2 -- nothing on the Graph page he starts on says that filtering exists or where it
   is.** His first guess was the bottom toolbar; finding Filters under Data "was a guess that paid
   off" (debrief). Evidence: `01.png`, `02.png`, `03.png`.
2. **Severity 1 -- no count while the value is typed.** The step editor shows no preview of how
   many nodes would remain until "Add step" is pressed, so trying several thresholds means
   committing each one. Evidence: `07.png`, step 7 remark, debrief.
3. **Severity 1 -- the Overview's Components (1) and Density stay whole-graph figures while the
   filter is on.** The panel says so ("The counts below are for the whole graph."), but a reader
   who wants the filtered view's piece count has none, and he guessed it wrong (three, where the
   drawing shows two). Evidence: `08.png`, `12.png`, step 8 remark, debrief.
4. **Severity 1 -- the PageRank legend keeps the whole graph's range while the filter hides
   nodes, with nothing saying whose range it is.** He noticed and assumed it was correct; he did
   not read it as a count. Evidence: `08.png`, `12.png`, debrief.

What worked: the hint "Keeps edges that pass and the nodes at their ends" told him in advance
which characters would drop out (`06.png`); the three counts agreed (`08.png`, `12.png`);
clicking the step's row reopened it for editing, and "Save and turn on" named its own effect, so
changing 5 to 8 took four steps and no trap (`10.png` to `12.png`); unticking kept the step for
reuse (`09.png`).

## What this says about the round

No build defect or broken control showed up: every control did what the answer key says it does,
and none of the session went on working around an implementation problem. The findings are about
discovering the filter from the Graph page and about which numbers describe the filtered view.
