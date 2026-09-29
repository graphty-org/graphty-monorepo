# Session: fix the wrong middle filter step -- Dr. Min-ji Kim, knowledge graph engineer

Task, as the moderator gave it: "You narrowed the graph in three steps and the middle one was
wrong. Fix it without losing the third."

Screens used: the filter chip and its step list (the "Wrong middle step: Largest component"
state), the undo screen, and the three-ways-back screen for the same mistake. Data: Les
Miserables co-appearances, 77 characters. Three steps: Filter out label = Valjean, Filter to
Largest component, Filter out label = Javert.

Outcome: success. Two ways worked. Turning the middle step off took one click. Replacing it
with the rule she actually wanted took nine clicks and a reorder. She did not use undo.

## Think-aloud

**1. The chip.** "60 of 77 characters, 3 steps. OK, it counts characters, not triples, not
'nodes'. This sample has one class, so that is fine. On my data I want the class name there,
and the other screen calls the same thing 'nodes'. Pick one. Anyway: I expected about 75 and
I have 60. Fifteen are missing. I open the chip."

**2. The step list.** "Three rows, in the order they apply, each with 'took out N, M left'.
This is the part I usually rebuild by hand: in SPARQL I comment out one FILTER at a time and
rerun a COUNT. Here it is 1, 15, 1. The 15 is the Largest component step, so that is where the
damage is. The note under it, 'keeps only the largest of the 7 connected pieces it reads', is
the sentence I need. It says the step reads the graph after the Valjean step, not the original.
Removing Valjean cut the graph into pieces and this step threw away all of them but one. That
is the mistake, and the screen showed it to me without my asking."

"Largest by what? Node count, I assume. The graph is undirected so weak versus strong does not
matter here. On a directed graph it would, and I want to see which one it is."

**3. Hovering the 15.** "I hover the count and get two dark tooltips on top of each other.
One says 'Took out 15: Myriel, Mlle.Baptistine, Mme.Magloire...', the other is the same text
wrapped, and where they overlap I cannot read either. I can make out 'and 10 more'. Don't
give me 'and 10 more'. If fifteen entities vanished I want all fifteen, or a way to select
them. Myriel and his household are the bishop's people. They should stay, so that confirms the
step was wrong for my question."

**4. The row's menu.** "The '...' on the row gives Edit step, Turn off step, Move up, Move
down, Create rule set from step, Delete step. Good. No 'auto-fix', no 'suggested cleanup', and
Delete has no dialog. Nothing here changes data I cannot see."

**5. Trying to edit the step.** "I open Edit step on Largest component, hoping for 'drop pieces
smaller than N'. What I meant was 'drop the characters left alone'. The editor only offers
Filter to or Filter out, plus Scope 'After step 1: 76 characters' and Result 'took out 15, 61
left'. Scope and result together are what I would put in a governance report, so the
information is good. But I cannot change what this step does, only flip it to its inverse, and
'keep everything except the largest component' is not what I want either. So this step cannot
be fixed, only replaced."

**6. First fix: turn it off.** "Checkbox. One click. The row greys out and says 'off, takes
nothing out'. The Javert row recounts itself: took out 1, 75 left. The chip reads '75 of 77, 2
of 3 steps'. The third step is still there and still applied. That is the task done.
Statistics says 'Components 9, up from 3 when Filter to Largest component was turned off'. That
is the most honest line on the screen: it tells me the number moved and why. I would like that
in every tool I own."

"One small thing: the 'Turn on step' tooltip covered the row's own 'off, takes nothing out'
text right after I clicked. The first thing I want to read after a click is the row's new
state."

**7. Undo? No.** "I looked at the undo screens because the moderator put them in front of me.
Edit shows 'Undo Re-run betweenness', and Undo history lists Re-run betweenness (1 step), Filter
out label = Javert (2 steps), Filter to Largest component (3 steps), Filter out label = Valjean (4
steps). So undo goes back through my good third step to reach the bad second one. I would never
do that. The list says so plainly, and that I respect."

"But the two screens disagree. One undo screen says undo only unticks a step and never removes
the row, so the Javert step would still be in the list, just off. The other says undoing back
to the middle step 'throws away' the Javert filter. Which one is true? Also, 'Undo back to here'
on the Largest component row: back to before this step or after it? I read it as 'after' at
first. The count says 3 steps, and 3 steps back means before. Two readings of one label is one
too many. I stay with the checkbox, because I can see what it does."

**8. Second fix: replace it with what I meant.** "Turning it off brings back the 5 characters
left alone. I did not want them. I wanted Valjean out, the isolated ones out, Javert out. So I
add a step: Add step, Filter out, Rule... It defaults to 'degree <= 1', which is an odd default.
I change 1 to 0. The editor says 'keeps only nodes with more than 0 neighbors among the 60 it
reads'. So degree is counted on this step's input, not the original graph, and it says so.
Correct, and I did not have to guess. It says 'nodes' here and 'characters' in the chip, though."

"The new step lands at the bottom, as step 4. There is no 'add step below this one'. I use
Move up twice. While it passes through, the Largest component step recounts to 'took out 10 of
the 2 pieces', so it now takes only the bishop's household. Then I delete Largest component.
Final: Valjean out (76), degree <= 0 out (took 5, 71), Javert out (took 1, 70). 70 of 77, 3 steps,
and the third step is intact. Nine clicks. Tolerable, but 'Replace step' or 'Add step after'
would make it three."

"Then I check my own work. Statistics says Isolated characters 1. Why 1, when I filtered out
the isolated ones? Because the Javert step comes after the isolate step, and removing Javert
left someone alone. The isolate rule reads only the graph before it, which is what I asked
for. The fix is to move my new step to the bottom. Order matters in any pipeline, and the tool
does not pretend otherwise. But nothing warned me that a later step re-created what an earlier
step removed. I found it only because I read the statistics."

**9. Betweenness scope.** "On the three-ways-back screen, after the change the betweenness
column says 'on: 60 nodes' with Re-run, and the 15 returned characters have no value instead of a
zero. Correct: a blank is not a zero. It does not claim to be current. After Re-run every value
drops, 0.485 to 0.307 for Marius. That is expected with more pairs. Which betweenness, though?
Normalized how? And 'weight: value, used as similarity': converted to distance how, 1/w? I would
ask before I put that number in a report."

**10. Colour.** "Group colours are orange, sky blue, bluish green, dark blue and pink, each with a
number in the legend. I can tell them apart by the legend. Group 3 (orange-red) next to group 4
(bluish green) is the pair I would have trouble with if they did not have labels. Here they do."

## Single Ease Question

**5 of 7.** Turning the step off: a 7. One click, the right counts, the third step
untouched, and a statistic that says why it moved. Replacing it with what I meant pulls the
score down. The step's editor cannot change what the step does, a new step can only go at the
bottom, the tooltip that names what was lost is garbled and cut at "10 more", and the two undo
screens disagree about what undo does to my third step.

## Would I use this instead of my current tool?

"For this job, tracing where my entities went in a chain of filters, it is better than what I
do now. In SPARQL I comment out FILTER lines one at a time and rerun COUNT queries. Here every
step shows its count, what it read, and whom it took out, and I can turn one off without
touching the others. Gephi's filter panel does not tell me what each stage removed.

But not instead of SPARQL for my own graph. There is still no way to get Turtle or an endpoint
in. And I want to take this step list with me as data, either as the rules or as the list of
excluded IRIs, so the explanation lives next to the knowledge graph and not only in the tool.
If it could do that, I would put this step list in front of a data owner to show why a
count changed."

## Problems observed (for the study record)

- Count tooltip on a step: two tooltips render on top of each other and are unreadable; the
  list of what was taken out stops at "and 10 more" with no way to see or select the rest.
- Editing a Largest component step offers only Filter to / Filter out; its rule (which component,
  largest by what, minimum size) cannot be changed, so a wrong step can only be replaced.
- A new step always goes at the end; putting a replacement in the middle takes two Move ups. No
  "Add step after" or "Replace step".
- The undo screen says undo unticks a step and keeps the row; the three-ways-back screen says
  undoing to the middle step "throws away" the third. "Undo back to here" also reads two ways
  (before or after this change).
- No warning when a later step re-creates what an earlier step removed (an isolate reappearing
  after the Javert step); found only through Statistics.
- "Nodes" and "characters" are used for the same thing on different screens and inside one
  editor.
- The "Turn on step" tooltip covers the row's new "off, takes nothing out" text right after the
  click.
- Betweenness: the variant, the normalization and how a similarity weight becomes a distance are
  not stated.
