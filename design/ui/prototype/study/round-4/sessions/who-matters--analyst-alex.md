# Who matters -- Analyst Alex

**Participant:** Alex, operations data analyst at a logistics company. Computes centrality in
NetworkX, draws it in Gephi, pastes it into a monthly deck. Knows roughly what betweenness means,
could not derive it. Has been burned by numbers that changed on a rerun.

**Task as given by the moderator:** "You have the Les Miserables co-appearance network open. Find
the few characters who matter most to how the story hangs together, and tell me how sure you are
of their order."

**Screens seen:** the project at rest (Les Miserables), the main menu with Algorithms open, Quick
actions, a betweenness result open in the inspector (shown on the protein sample, the only data
the moderator had that state for), the same result with its table open, the Les Miserables table
with degree and betweenness ranked side by side, a character (Valjean) selected in the inspector.

Renders the participant looked at (all in the study view):
- `../../../shots/record/r4-alexwho-frame.png` -- project at rest
- `../../../shots/record/r4-alexwho-rp-catalog.png`, `../../../shots/record/r4-alexwho-rp-quick.png` -- finding betweenness
- `../../../shots/record/r4-alexwho-rp-finished.png`, `../../../shots/record/r4-alexwho-rp-table.png`,
  `../../../shots/record/r4-alexwho-rp-variant.png`, `../../../shots/record/r4-alexwho-rp-sampled.png` -- a result in the inspector
- `../../../shots/record/r4-alexwho-insp-result.png` -- the result's own inspector page
- `../../../shots/record/r4-alexwho-table-small.png` -- Les Miserables, degree and betweenness ranked
- `../../../shots/record/r4-alexwho-nav-new-graph.png`, `../../../shots/record/r4-alexwho-nav-new-node.png`,
  `../../../shots/record/r4-alexwho-nav-new-menu.png` -- the same project with sets, views and a selection
- `../../../shots/record/r4-alexwho-table-ranked.png` -- three measures ranked (protein sample, for the pattern)

## Think-aloud

**Project at rest.** "OK, Les Mis. I know this one, it's the one every tutorial uses. 77 nodes, 254
edges -- yes, that's the standard file. Good, the counts are right there, I don't have to go
digging."

"Colored by 'group'. Legend says 2, 8, 4, 1... fourteen in group 2. So group 2 is the big one.
Those are just the numbers from the file, right, not communities it found? 'Group color' -- yeah,
that's the file's column. Fine."

"'Labels: the 18 characters with the most connections.' So the labels are degree. Valjean in the
middle, Marius and Gavroche down at the bottom with the students, Myriel off on his own up top
right. Honestly I could answer 'Valjean' from the picture. But 'matters most to how the story hangs
together' -- that's not 'who has the most connections'. That's who holds it together. That's
betweenness. That's what I'd run."

"And one thing already: 'value not used yet'. The file has the co-appearance counts on the edges.
So whatever I run, it's going to ignore how often two people appear together. Park that."

**Finding betweenness.** "I'd just type it." *Looks at Quick actions.* "Ctrl+K, type 'centrality',
Betweenness is first. OK. There's a time estimate on the right -- 'hours' on this one, because this
is some huge patent thing, but on 77 nodes that's going to say nothing, or 'instant'. I like that it
tells me before I click. That's the lunch-break problem, sorted, at least in principle."

"There's also the lightning bolt on the toolbar, 'Run a measure', and a '+' next to Results. Three
ways in. Fine, I'd use the keyboard one."

"The main menu has it too, Algorithms, Centrality, Betweenness. Closeness has a little 'WF-corrected'
tag -- no idea, skip. Eigenvector has a warning about components, doesn't matter here, Les Mis is
one component. It said 1."

**A result in the inspector.** *The moderator explains this state is only drawn on the protein
data.* "OK, same panel, different data, I'll read it as if it's mine."

"Top nodes, five of them, with the scores. 'Exact.' 'Undirected.' 'Weight: confidence, not used yet.
Change...' -- so again it tells me it ignored the weights. Good that it says it. And then this
line: 'Every step in the top 5 is over the 1% tie line; the smallest, ranks 3 and 4, is 1.2%.'"

*Pause.* "That's... actually the question the moderator asked me. 'How sure are you of the order.'
It's telling me the gaps. I'd never compute that in NetworkX, I'd eyeball it. 1.2% between 3 and 4 --
I'd still call that close. But at least it says so."

*Looks at the closeness variant.* "'Ranks 3 and 4 differ by less than 0.2%, under the 1% tie line;
treat them as tied.' OK, so it'll actually tell me to call it a tie. That's what I want in the deck.
Where does the 1% come from, though? Who decided 1%? If my director asks, I can't say 'the tool
said 1%.'"

*Looks at the sampled one.* "And this is the estimated one, on the big graph -- 'Ranks below #2 may
swap between runs', a seed, an error bound. Right. Les Mis is exact, so that one's not my problem
today. But nice that it's honest about it."

**Les Miserables, the table.** "OK, here's the real thing. Degree and betweenness next to each
other, each with a rank column. That's exactly the table I'd build in pandas."

"The line on top: 'Valjean is #1 on both measures. At #2 they part: Gavroche by degree, Myriel by
betweenness.' Yeah. That's the sentence. That's the thing a director would actually understand."

"Reading the betweenness column. Valjean 0.570, #1. And it's not close -- the next one is 0.177.
Three times the next person. I'm sure about him."

*Scrolls down the table.* "Myriel 0.177, #2. Gavroche 0.165, #3. Marius 0.132, #4. Fantine 0.130,
#5. Thenardier 0.075, #6."

"Hmm. Marius and Fantine. 0.132 and 0.130. That's nothing. And the table just says #4 and #5, flat.
On degree it puts an equals sign on ties -- 'Enjolras #6=, Fantine #6=' -- but that's only when the
numbers are identical. Here they're not identical, they're just basically the same, and there's no
sign. On the protein panel it had that tie sentence. Here, in the table, nothing. So which is it --
does the table know about the 1% thing or not?"

"Myriel and Gavroche: 0.177 and 0.165. What's that, seven percent? Probably real. But I'd want it to
just tell me, like the panel did."

"And Myriel at #2 by betweenness with degree 10. He's only #18 on degree. That's the classic thing
-- he's the only door into the bishop's little corner up top right, so every path from those guys
goes through him. That's betweenness being betweenness. I would NOT tell my director 'the bishop
holds the story together'. I'd say 'Valjean, clearly; then it depends how you measure it.'"

"Javert. Degree #4, betweenness #7, 0.054. So he's connected to a lot, but he's not a bridge.
Makes sense, he's always in Valjean's scenes."

**Where did betweenness come from?** *Looks at the inspector with Valjean selected, in two of the
drawings.* "In this one, betweenness 0.57 is listed under 'Attributes', with group and degree. In
the other one it's under 'Results', '0.57, highest'. Is it in the file or did I run it? Because if
it came in with the file, I have no idea how someone computed it."

"And the Results list on the right, in the same project -- it only has 'Bridges, done'. No
betweenness. So I've got a betweenness column in my table and no betweenness run in the list. Where
do I click to see how it was run? The protein one had 'Details' and a whole run record, seed,
normalization. I want that here, and I can't find it for Les Mis."

"Also -- 0.57 in one place, 0.570 in the table. And in the other table, sorted by betweenness,
Fantine is '0.13' but Marius is '0.132'. That one actually matters. '0.13' next to '0.132' looks
like Marius is clearly ahead. He isn't. If I screenshot that table, I've just made a gap that isn't
there."

**The weights.** "Last thing. 'Betweenness exact, unweighted, full graph.' Good, it says so in the
header -- I like that, the column tells you what it is. But the question is 'how the story hangs
together', and the file has how many chapters two people share. Would the order change if I used
that? Probably Valjean doesn't move. But Myriel versus Gavroche, Marius versus Fantine -- I'd bet
those move."

"There's 'Change...' next to 'value not used yet'. I'd click it, set it, run again, and then I
want the two runs side by side. The panel had 'Compare with...'. I think that's what it's for. I'd
try it. But I haven't seen it on this data, so I'm not going to promise it works."

"Oh, and -- with co-appearance counts, bigger is 'closer', right? And betweenness wants a distance.
In NetworkX I have to flip that myself. Does this flip it? I don't know. I'd check in Python."

**Compare rankings.** "'Compare rankings...' on the agreement line -- a scatter, rank against rank,
the moderator says. Yeah, I'd look at that. Probably the fastest way to see Myriel and Javert as the
two outliers."

## His answer to the moderator

"Valjean. That one I'm sure of -- he's number one on degree and on betweenness, and on betweenness
he's three times the next person. Rerun it, weight it, whatever, he's staying on top."

"After that it's a pack of four: Myriel, Gavroche, Marius, Fantine, in that order by betweenness.
I'm not sure of that order. Myriel's only there because he's the one link to his own little group;
on degree he's eighteenth. Gavroche is second on degree and third on betweenness, so he's probably
the safest number two. Marius and Fantine are basically tied -- 0.132 against 0.130. And all of it
ignores how often they appear together, so I'd rerun it weighted before I put the order in a slide."

"If you want a sentence: 'Valjean holds the story together; Gavroche, Marius, Fantine and Myriel
come next, in an order that depends on the measure.'"

## Single Ease Question

**5 out of 7.** "Getting the numbers was easy -- type it, run it, the table has both measures and
ranks, and it even writes the comparison sentence for me. What took longest was the 'how sure'
part. The protein screen had exactly the sentence I needed, the tie line, and the Les Mis table
didn't. And I couldn't find the run for the betweenness column, so I couldn't check how it was
done."

## Would he use this instead of his current tool?

"For this kind of question -- top few, and how solid is the order -- not instead. Alongside. The
table with rank columns and that 'they part at #2' line is better than what I do in Gephi; in
Gephi I'd export to Excel and rank it myself. And telling me when two ranks are a tie is something
no tool I use does. If the table carried that tie note, and '0.13' stopped hiding the gap, I'd
probably stop doing the ranking step in pandas. But until I've seen the weighted run come out the
same as NetworkX, the numbers I'd put in front of my director still come from Python."

## Problems observed

1. **The "how sure" answer exists, but not where he was looking.** The result panel's sentence
   about ranks and the 1% tie line ("Every step in the top 5 is over the 1% tie line"; "treat them
   as tied") is exactly the task's second half. The Les Miserables table, where he actually read
   the ranking, carries no such note, and ranks #4 and #5 (0.132 and 0.130) appear as a clean
   step. He had to judge the gaps himself. Severity 3.
2. **Uneven rounding makes a near tie look like a gap.** In the table sorted by betweenness,
   Fantine shows "0.13" beside Marius's "0.132"; elsewhere Valjean shows "0.57" and "0.570". The
   two-digit value reads as clearly lower, and a screenshot of it would carry that into a slide.
   Severity 3.
3. **A betweenness column with no betweenness run.** In the Les Miserables frames the Results list
   holds only "Bridges, done", yet the table and inspector show betweenness. He could not open the
   run to see its method, weight and details, which he had seen on the protein data. Severity 3.
4. **Is betweenness data or result?** One inspector drawing lists betweenness under Attributes
   (with group and degree), another under Results ("0.57, highest"). He could not tell whether it
   came in with the file or was computed. Severity 2.
5. **The 1% tie line has no stated origin.** He trusted the sentence but would not repeat it to a
   director without knowing who set 1% and why. Severity 2.
6. **Weighted versus unweighted is visible but untested.** "Value not used yet" and "unweighted"
   are stated clearly, which he liked, but whether the co-appearance counts would be read as
   strength or distance for betweenness is not said, so he would still check the weighted order in
   Python. Severity 2.
7. **The legend lists groups by size.** "Group color: 2, 8, 4, 1..." sorted by count; he read
   group 2 as "the big one" and briefly as the most important. He corrected himself, but the order
   invites the reading. Severity 1.

## What worked for him

- The agreement line above the table ("Valjean is #1 on both measures. At #2 they part: Gavroche by
  degree, Myriel by betweenness.") is the sentence he would put in a deck, unchanged.
- Degree and betweenness side by side with rank columns and "=" on exact ties: the table he builds
  in pandas every time, already built.
- The column header names the run ("exact, unweighted, full graph"), so the table cannot be read
  as something it is not.
- Quick actions shows a time estimate before he runs anything.
- The tie sentences on the result panel ("treat them as tied") and the sampled run's "Ranks below
  #2 may swap between runs" answer his fear of numbers that change without warning.

## Moderator note

The navigation page itself rendered blank in the study view; its individual frames
(`?frame=new-data`, `new-menu`, `new-node`) rendered and were used instead. The result-panel states
exist only on the protein and patent samples, so the participant read them as stand-ins for his
own data.
