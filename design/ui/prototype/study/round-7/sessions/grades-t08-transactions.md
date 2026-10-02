# Grades: rearranging the transfers graph (round 7)

The task: "With 3,000 accounts the drawing is a smear. Try another way of arranging it that will
not freeze your laptop. The data on screen is a sample: one month of card and bank transfers
between accounts." The graph has 3,000 accounts and 9,113 directed transfers weighted by amount,
drawn as a gray hexagon density map.

Success means opening the Layout window (right panel, Style tab, the Method field "Spread Out"),
reading the Size column -- "Any" for most methods, "2,000" with a clock for Spread Out Flat,
Natural Grouping and No Crossings -- and picking a method without that mark. Success with
difficulty: reaching the window only after a detour, or picking a marked method and then backing
out after reading its tooltip. Failure: picking a marked method without noticing, or never
reaching the methods. Intended renders: shots/tasks/t08-transactions/01.png (start) and 02.png
(the Layout window).

## Headline

All four reached the Layout window and all four ended on a method rated for any size. The two
technical participants read the Size column cold and never touched a marked method. The two
business participants each clicked Natural Grouping -- a method marked for 2,000 -- first, and only
learned what the mark meant by resting on the "2,000" afterward. The app applied it on one click
with no confirmation. In the real product that click is the freeze the task warns about, so the
cost column works as information but not as protection.

Every participant also closed the window to an identical picture. The skeleton draws the same
static density map whatever the method, so nobody could judge whether the drawing got better.
That is a limit of the skeleton, not design evidence, but it removed the task's payoff.

## Grades

| Participant | Their own call | Grade | Marked method picked? | What ended on screen |
|---|---|---|---|---|
| Analyst Alex | success with difficulty | success | No | Graph, window closed, Method "Rings from a Node" (Any) |
| ML engineer (Chris) | success with difficulty | success | No | Graph, window closed, Spread Out with the ForceAtlas2 engine (Any) |
| Fraud analyst (Sarah) | success with difficulty | success with difficulty | Yes, Natural Grouping, then backed out | Layout window, Method "Concentric Rings" (Any) |
| Supply chain analyst (Dana) | success with difficulty | success with difficulty | Yes, Natural Grouping, then backed out | Graph, window closed, Method "Columns by Group" (Any) |

Outcome tally: 2 success, 2 success with difficulty, 0 failure, 0 gave-up.
Single Ease Question: Alex 4, Chris 5, Sarah 3, Dana 3 (mean 3.75 of 7).

Why Alex and Chris are upgraded from their own call: each reached the window in two steps (one
hover on the canvas toolbar that taught them the word "layout", then the Style tab), read the
Size column against the graph's 3,000 before hovering anything ("Some say 2,000 with a little
clock. I have 3,000. So those are the ones that'll hang"), and picked only unmarked methods. Their
difficulty came after the pick -- an unchanged picture, the panel not naming the engine -- which
the rubric does not grade and which is mostly the static skeleton.

Why Sarah and Dana are not failures: both ended on an unmarked method after reading the warning
in the tooltip, which is the rubric's back-out case. Both are close to the line. Sarah saw the
"2,000" but read the clock as "recent or history", not slow, and picked Natural Grouping because
the name sounded like clusters. Dana inferred "the clock probably means slow" and picked it anyway
"to see if it warns me". Neither would have backed out without choosing to hover a gray number.

## Per participant

**Analyst Alex.** Hovered the toolbar play button ("Resume layout"), clicked Style, found Layout
"a bit odd" under Style, opened the window. Read the Size column, confirmed with the Natural
Grouping tooltip ("Good warning, says my number"), skipped Concentric Rings for needing a grouping.
Found ForceAtlas2 under the Engine menu, which took him "a while" since Spread Out is a family
name. Then switched to Rings from a Node; its Root node stayed "None". Closed to the same picture
twice and stopped on unnamed toolbar icons. Concluded correctly that his choices would not freeze;
could not tell whether the smear was fixed.

**ML engineer.** Hovered "Run" (no such name), then the play button, then Style and the window.
Read the column at a glance ("I didn't have to read a paragraph"), confirmed Natural Grouping's
tooltip, chose ForceAtlas2 for its weight handling. Noticed the options did not change from
NGraph's, the panel still said "Spread Out", and Kamada-Kawai in the engine menu carries no cost
mark although on 3,000 nodes it is the one likely to hang. Called it "a probable success that I
can't verify".

**Fraud analyst.** Looked for "Arrange", tried five toolbar names, then Style. Opened the window,
noted three methods at 2,000, and clicked Natural Grouping anyway ("that's what I want, clusters").
It applied at once. Closed to the same picture, unsure whether her laptop was frozen. Hovered the
"2,000", read "The canvas stops responding while it computes", and switched: first Rings from a
Node (could not set the center account), then Concentric Rings. Ended with the window open on an
unmarked method.

**Supply chain analyst.** Hovered "Full graph" (Filters), then clicked "Graph" and the canvas
repainted with a Louvain coloring she never asked for (see the prototype findings). Started over,
tried three toolbar names, then Style. Read the column, guessed the clock meant slow, picked
Natural Grouping to see whether it would warn her; it did not. Read the tooltip, switched to
Columns by Group, which never asked what to group by. Ended on the unchanged picture.

## Findings

Severity is Nielsen's 0 to 4. "Prototype" marks a defect of the skeleton or the study tool, not
of the design; fix those in the skeleton and do not count them as design evidence.

1. **A method marked too slow applies on one click with no confirmation; the consequence lives
   only in a tooltip.** 2 of 4 picked one (Sarah, Dana), both the less technical participants;
   both said the warning must come at the click, not on hover. 1 of 4 read the clock as
   "recent/history". Severity 3: frequent among non-experts, and the real-product cost is a
   frozen tab. Options to test: a confirm step for an over-rated method naming the graph's count,
   or a word next to the number ("slow") instead of a bare clock.
2. **The Size column is the best-liked thing in the task.** 4 of 4 praised it unprompted, 3 of 4
   specifically the tooltip quoting "this graph has 3,000". Positive; keep it.
3. **The picture never changes after a layout (prototype).** 4 of 4. The skeleton shows one static
   density map. It blocked every participant from judging the result and fed doubt about whether
   the choice took. Fix in the skeleton before rerunning: a visibly different drawing per method
   family, or a "laid out" state. A design question survives it: 2 of 4 (Alex, Chris) asked
   whether the density map would hide any layout at this size anyway.
4. **No sign of progress, completion or cost after the pick.** 3 of 4 (Sarah, Dana, Chris) could
   not tell "working, done or frozen"; Chris asked for a time and where it ran (GPU or CPU).
   Severity 3. Partly masked by finding 3, but the toast "Laid out again" claims completion
   instantly even for a method the app itself says will block.
5. **Closing the window flips the right panel back to Data.** 4 of 4 noticed; it hides the Method
   field that would confirm the choice. Severity 2.
6. **The engine is invisible outside the window.** 2 of 4 (Alex, Chris) chose ForceAtlas2 and then
   saw only "Method: Spread Out" in the panel; Alex: "If I'm presenting this, I need to know which
   layout I used." Severity 2.
7. **Engine options do not follow the engine (prototype).** 2 of 4 (Alex, Chris) saw NGraph's
   spring and drag settings under ForceAtlas2 and lost trust. The section file uses one fixed
   option list for every engine. Fix in the skeleton.
8. **Engines carry no cost mark.** 1 of 4 (Chris), but verified: the Engine menu lists
   Kamada-Kawai with no size rating while the method list rates everything. Single voice, expert
   and correct. Severity 2.
9. **Methods that need an input apply without asking for it.** 3 of 4: Rings from a Node with
   Root node "None" that could not be clicked (Alex, Sarah), Columns by Group with no group column
   (Dana); Concentric Rings "needs a grouping" (Alex declined it, Sarah ended on it). Severity 3:
   a participant can end on a layout that cannot do what its name says.
10. **Layout sits under the Style tab.** 4 of 4 remarked on it; 3 of 4 said style means colors.
    All four still found it within a few steps, after hovering the canvas toolbar first, where only
    the play button says "layout". Severity 2.
11. **Method names hide the algorithms experts look for.** 2 of 4 (Alex, Chris): "Natural Grouping"
    does not say what it computes; ForceAtlas2 is found only under Spread Out's Engine menu.
    Severity 2.
12. **The options pane is physics jargon.** 3 of 4 skipped it on sight (Alex, Sarah, Dana).
    Severity 1; the experts wanted the algorithm's own options instead.
13. **Clicking "Graph" lands on a Louvain result (prototype).** 1 of 4 (Dana), on the transfers
    graph with no run made; she quit trust in the step. The intended success render
    shots/tasks/t08-transactions/02.png also shows a Louvain row the start screen lacks, so the
    fixture leaks state between routes. Fix before rerunning; severity 3 if anything like it ships.
14. **Toolbar icon names could not be discovered (study-tool limit).** 4 of 4 tried to hover icons
    by guessed names and got "nothing on screen is called ...". The tool matches by exact name;
    a real reader would just rest the pointer. Not design evidence.
15. **"Undo Ctrl+Z" does not say what it undoes.** 1 of 4 (Chris). Severity 1.

Also liked: the "Laid out again" toast with Undo (2 of 4: Sarah, Chris), the visible seed
(2 of 4: Alex, Chris), "Local only" (2 of 4: Alex, Dana).

## Before this task is run again

- Make the canvas change visibly when a method is applied, so the task's payoff can be judged.
- Give each engine its own option list in the Layout window.
- Stop the "Graph" click and the success state from carrying a Louvain row the start screen does
  not have.
- Keep the task wording identical so this round's attempts compare.
