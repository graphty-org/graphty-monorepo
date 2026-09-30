# Session: how is one account connected to another -- Sarah, level-2 fraud investigator

Participant: Sarah (persona: study/personas/fraud-analyst.md), eight years in financial crime,
works only escalated cases. Mode: not mandated -- her own five minutes and one real task. She got
the answer, but only after leaving the screens she was pointed at, so the patience limit came
close.

Task as given by the moderator: "How is ACC-271813 connected to ACC-233575?"

Screens seen, in order (existing study renders, 1440 x 900): the find-and-expand screen's task
states -- find the seed, inspect the hit, click an account with no neighbours in one direction, a
hit the filter leaves out, grow the step one hop, the grown step, the next seed
(shots/screens__find-and-expand--t-find.png, --t-inspect, --t-click, --t-outside, --t-grow,
--t-grown, --t-next). The inspector with a large selection (shots/record/screens__inspector-cap.png).
Then the sets-and-paths screen: the Path tool, the found path, what amount means, no directed
path (shots/record/screens__sets-and-paths-s3--study.png to -s6--study.png). She also looked at the
inspector's "two selected", "Path to..." and "found path" states, which are drawn on a protein
dataset (shots/screens__inspector-two.png, -path-to.png, -path.png). HTML read only to see what
the search box, the Ties line and the inspector's menus would do when clicked.

## Think-aloud

**Find the seed.** "Search box, top left, good, that's where my hands go. It's already got
233575 in it and one hit, ACC-233575, riskScore 98. Fine -- I'd have typed 271813 first, since
that's the one I know least about, but I'll take it. 'Enter goes to it; Enter again selects it.'
Two Enters. OK." Looks at the drawing. "Grey honeycomb with one orange dot. 'Drawn as density.'
So I can't see my other account at all. Where's 271813? Not on this picture, not until I go and
get it." Looks at the top line of the left panel: "'Nothing has been sent from this project.'
Good. That's the first thing IT will ask."

**Inspect the hit.** "Right side. Flagged true, riskScore 98, number one of 3,000, personal, US.
Connections: in 3, out 5, all 8. Blue numbers, so I can click them. Memberships, in no sets.
Appearance, a colour code D55E00 -- I don't care what colour it is." She looks for anything that
says 'path' or 'connect'. "There's Neighbors, a funnel, a pin, three dots. Nothing that says
'how does this get to that one'. In i2 I'd put both on the chart and ask for the shortest path.
Here I've got 'Neighbors'. So I guess I'm expanding by hand until the other one turns up."

**Click an account with nothing going out.** The mock shows ACC-893168 selected and the
Neighbors menu open. "Hops from ACC-893168, 1 hop none, 2 hops none, 3 hops none. Out: paid to,
none. Then the yellow line: 'sent no transfers: Out finds nothing. In: paid by reaches 37
accounts.' That's actually useful. It tells me why it's empty instead of just being empty. It's a
merchant, 37 people paid it -- that's a collection point or it's a shop. Can't tell which from
here."

**A hit the filter leaves out.** Search 782213, one hit, "Left out by ACC-233575 and
neighbors". Right panel: "Not in the filtered graph ... Not drawn; not in any count." "OK, so if
I'd been sitting on 233575's neighbours and searched 271813, it would still find it but tell me
it isn't on the picture. Good. Better than i2, which just says 'no results'. 'Add selection to
step' -- adds it to what I'm looking at. Fine."

**Grow one hop.** "Hops from 10 selected nodes: 1 hop 34, 2 hops 57, 3 hops 62. In: paid by 961.
Out: paid to 34. 'Counted on the graph before' -- fine, I'll believe it." She thinks about her
task. "This is the manual way. Start at 271813, grow out one hop, two hops, three, and keep
Ctrl+F-ing the table for 233575. That's what I'd do in i2 if the path button was greyed out.
And I don't know which direction to follow -- if 271813 paid into it I want Out, if it got paid
by it I want In. I don't know yet. That's the question."

**The grown step.** "34 accounts, filter steps listed: 9 by neighbours all one hop, plus 1, plus
24 out. It's written down, that's good for the file -- 'Create rule set'. But I still don't see
271813 anywhere in this picture. ACC-527694, 593226, 393859... no." Looks at the toolbar. "Arrow,
then that squiggly icon, then a page, then Quick actions. The squiggly one has no label. It
could be draw-a-line, could be anything. I would not click it on day one." (She did not find
the path tool from these screens. The moderator did not prompt.)

**Next seed.** "ACC-175569, a new seed, four accounts. Different case. Not mine." Skips.

**Inspector with a big selection.** "7,495 selected, it says on the picture. The panel says
1,863 nodes, 5,632 edges. Which is it? Oh -- it's adding accounts and transfers together. Don't
add apples and oranges and put it in a pill. If I'd written 7,495 accounts in a note I'd be
wrong. Also this one says 'Transfers, March 2026' at the top and the other screens say 'March
transfers'. Same file? I'd have to ask."

**Protein screens, "two selected" and "Path to...".** She looks because the moderator's list
named the inspector. "Different data, proteins, but -- there it is. Two selected, and a button
'Paths between...'. And with one selected, 'Path to...' and it says 'Pick the end node: click,
or find it by name (Ctrl+K)'. That's exactly the thing I wanted on the account screen. Why is it
on the protein one and not on mine? On the account screen I had Neighbors and three dots, nothing
else." Pause. "So I guess I select both accounts. How do I select two from search? Enter selects
one. Do I shift-click in the list? Ctrl-click? Nothing says." She finds, in the search box's
empty state, "Paste a list of ids to find them all." "Oh, now that I like. Paste
'ACC-271813 ACC-233575' from the alert, get both. Then 'Paths between'. If that works on
accounts, that's two steps."

**The Path tool, first try.** Sets-and-paths, state 3. "From ACC-271813, To ACC-233575, Scope
Filtered graph with a warning sign, Run greyed out. 'From is outside the filtered graph. Set
Scope to Full graph to search it.' OK, clear. It told me what to change instead of saying 'no
path', which would've been a lie. I'd have been cross for a second -- I didn't set any filter, I
think -- but it's one click. Right side: 271813 is business, Mexico, riskScore 1, not flagged,
14 links, left out by 'riskScore 20 or more'. A business account in Mexico with a score of 1
that reaches a 98? That's the story, right there."

**Found path.** State 4. "3 hops. Start 271813, end 233575, and the table at the bottom:"
She reads it out. "Step 1, 271813 to 946224, March 4, 18:23, $3,530.28. Step 2, 946224 to
242954, March 7, 13:27, $9,782.05. Step 3, 242954 to 233575, March 8, 20:29, $9,616.72. Time in
UTC. Direction 'follows transfers'. OK. That's the answer. 271813 paid in, it went two
accounts, and it landed at 233575 four days later. Both middle accounts are flagged, 93 and 92."

"Now the problems. One: $3,530 went in and $9,782 went out of 946224 three days later. That's
not the same money. This picture makes it look like a pipe and it isn't one -- 946224 had six
grand from somewhere else. If I put this in a SAR as 'funds moved from 271813 to 233575' the
reviewer rips it up. I need to know what else went into 946224 between March 4 and March 7. It
doesn't tell me that. Two: is that the only transfer between 271813 and 946224, or one of ten?
It's showing me one row per hop. If there are five transfers on that link I want five rows.
Three: 'Ties, 1 of 2 as short.' There's a second route, same length. Where is it? There's no
arrow, nothing to click. On the protein screen the same line has little arrows, '1 of 12'. On
mine it's just text. I need both routes -- if the second one goes through the merchant it might
be benign, and that's the one I have to rule out in writing."

"'Paths ignore amount: hops were counted, not dollars.' Fine, that's honest. The Keep path
button is a little bookmark icon with a tooltip. On the protein screen it's a button that says
'Keep path'. Mine's a guess."

"Members, four, sorted by riskScore. Why riskScore? I want them in walk order, with the amount
and date between them, like the protein one does with 'edge confidence'. The table at the bottom
has it, so I'll live, but the side panel is the bit I'd screenshot."

**What amount means.** State 5. "Weight: amount. 'A bigger amount means a closer or stronger
link. Distance = 1 / amount. The path prefers big transfers.' Right, so if I re-run it, it looks
for the route with the big money. That's actually what I'd want for layering -- follow the big
transfers. The 'one over amount' bit I skip. Re-run, fine."

**No directed path.** State 6. "From 233575 to 271813 -- the other way round. 'No directed
path; one exists ignoring direction.' And a button, Ignore direction. Good. That's the question
I actually care about: money went 271813 to 233575, it didn't come back. That line goes in the
narrative. No round trip, at least not in March."

**Export.** "There's 'Export' with a plus on the right panel. I'd want the three rows out as a
CSV and a picture of the path with the dates on it. I can't tell from here if Export gives me
the three rows or the whole 3,000. I'd find out by trying."

## Answer she gave

"ACC-271813, a business account in Mexico with a riskScore of 1, paid $3,530.28 to ACC-946224 on
March 4. ACC-946224 paid $9,782.05 to ACC-242954 on March 7, and ACC-242954 paid $9,616.72 to
ACC-233575 on March 8. Three hops, four days, both middle accounts flagged. There's a second
route just as short that I couldn't see. And the money doesn't reconcile at the first hop --
more went out of 946224 than came in from 271813 -- so I can't say it's the same funds without
the statements. Nothing goes back the other way."

## Single Ease Question

**5 of 7.**

"Once I was on the path screen it was a 6 -- From, To, Run, and a table with dates and amounts,
which is what I'd have spent twenty minutes building in i2. The 5 is for getting there. On the
account screens I was told to use, there's nothing that says 'path' -- Neighbors, a funnel and
an unlabelled squiggle. I only found 'Path to' because the protein screen has it. If I hadn't
been told there was a path tool I'd have expanded hop by hop and Ctrl+F'd the table, and at
three hops out of a business with 14 links that's a hairball."

## Would she use this instead of her current tool?

"For this question, instead of i2 -- yes, if my manager got it approved. The i2 import wizard
alone is half a morning; this had the dates and amounts on the links without me mapping a
column. And it says nothing leaves the building, which is the first thing I'd be asked.

Instead of Excel -- no. The minute I see $3,530 in and $9,782 out, I'm back in the statement
export with a pivot on 946224 between March 4 and March 7, because that's what makes it the same
money or not. Until the path shows me every transfer on each link, and what else came into the
middle accounts in the window, it's a picture that raises the question, not one that answers
it. It's a better i2 for this, not a replacement for the pivot."

## Problems observed

1. **No way to ask "how do these two connect" from the account screens.** On the find and
   expand screens, the single-account inspector shows only Neighbors, a filter, a pin and a menu;
   "Path to..." and "Paths between..." appear only on the protein dataset's inspector. The
   toolbar's path tool is an unlabelled icon. She would have expanded hop by hop instead.
   Severity 3.
2. **The second equally short route cannot be reached.** "Ties 1 of 2 as short" on the
   transfers path has no arrows or link; the protein version has "1 of 12" with arrows. For a
   SAR she must rule out, in writing, the route she cannot see. Severity 3.
3. **One transfer per hop, and no reconciliation.** The path table shows one row per link and
   does not say whether other transfers exist on the same link, or what else entered the middle
   account between hops ($3,530.28 in, $9,782.05 out three days later). The picture reads as a
   pipe of funds when it is not one. Severity 3.
4. **The path's member list is sorted by riskScore, not walk order.** On the transfers path the
   right panel lists the four accounts by riskScore with no amount or date between them; the
   protein path lists walk order with the link value. The side panel is what she would capture
   for the file. Severity 2.
5. **Keep path is an icon on the transfers path.** A bookmark icon with a tooltip, where the
   protein path has a labelled "Keep path" button. Severity 2.
6. **Selecting two accounts from search is not explained.** "Enter selects it" covers one; the
   paste-a-list hint is the only route to two and sits in the empty state, not beside the hit.
   Severity 2.
7. **A count that adds accounts and transfers.** The large-selection pill reads "7,495
   selected" while the panel says 1,863 nodes and 5,632 edges. Severity 2.
8. **Scope surprise.** The Path tool opened on the filtered graph, which left out the start
   account; the message was clear and the fix was one click. Severity 1.
9. **Two names for the same file.** "March transfers" on most screens, "Transfers, March 2026"
   on the large-selection inspector. Severity 1.
10. **Export scope unclear.** "Export +" on the path panel does not say whether it exports the
    three transfers or everything. Not tried to the end. Severity 2.

## What worked

- The path table: step, source, target, time (UTC), amount, in path order -- the flow of funds
  she writes in the narrative, without an import wizard.
- "From is outside the filtered graph. Set Scope to Full graph to search it." -- says what to
  change instead of reporting no path.
- "No directed path; one exists ignoring direction" with an "Ignore direction" button -- answers
  the round-tripping question in one line.
- "Paths ignore amount: hops were counted, not dollars" and the plain wording of what a bigger
  amount means in a weighted run.
- "sent no transfers: Out finds nothing. In: paid by reaches 37 accounts" -- an empty result
  that explains itself.
- "Nothing has been sent from this project" on every screen.
