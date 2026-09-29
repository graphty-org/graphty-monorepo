# How is ACC-271813 connected to ACC-233575? -- Dana, supply chain risk analyst

**Participant:** Dana Okafor, supply chain risk analyst at an industrial equipment maker. Lives in
Excel and Power BI; has tried Gephi and a Power BI network visual and dropped both. Not a network
scientist. Mild presbyopia; small grey labels are a real problem for her. She did this same
question in an earlier round on the protein sample data and rated it 4 of 7.

**Task as given by the moderator:** "How is ACC-271813 connected to ACC-233575?"

**Screens seen, in order:** the "March transfers" project with Find open and ACC-233575 typed;
the same account selected with its inspector and a hover card; the Neighbors menu opened on it;
a second account inside a filtered view with its Neighbors menu; a search hit that a filter leaves
out; then the page the task hands over next, a whole-graph selection of "7,495 selected"; then the
sets-and-paths page: two sets focused, the Path tool bar filled with ACC-271813 and ACC-233575,
the found path, the "what amount means" popup, and the "no path" state with the ends swapped.

Renders the participant looked at:
- `../../../shots/tasks/how-connected/01-find-and-expand-t-find.png`
- `../../../shots/screens__find-and-expand--t-inspect.png`
- `../../../shots/screens__find-and-expand--t-size.png`
- `../../../shots/screens__find-and-expand--t-click.png`
- `../../../shots/screens__find-and-expand--t-outside.png`
- `../../../shots/tasks/how-connected/02-inspector-cap.png`
- `../../../shots/tasks/how-connected/03-sets-and-paths.png`
- `../../../shots/screens__sets-and-paths-s3--study.png`
- `../../../shots/screens__sets-and-paths-s4--study.png`
- `../../../shots/screens__sets-and-paths-s5--study.png`
- `../../../shots/screens__sets-and-paths-s6--study.png`
- `../../../shots/screens__find-s8--study.png` (Quick actions, looked at when hunting for a path command)

## Think-aloud

**Before starting.** "Bank accounts again. Fine -- an account is a vendor number to me. Two
vendor numbers, how are they connected. Last time this was proteins and I had to pretend. At
least these look like something out of an ERP. Personal, merchant, business -- I'll read those
as supplier types."

**Find, first screen.** "Top left, a search box, and it already has 233575 in it. That's what I
would do, I type the number. One hit: 'ACC-233575, riskScore 98'. Good, it found it on a partial
number, I don't have to type the ACC- bit. Line underneath: 'Enter goes to it; Enter again selects
it. Searching the full graph: 3,000 nodes.' OK, 'nodes', I'll translate that to accounts. The
little orange dot in the grey honeycomb is where it is, I suppose. I wouldn't have found it by
looking.

"The right side says 3,000 nodes, 9,113 edges, 'directed', 'components 1', 'density 0.00101'. I
don't know what components or density mean for me and I'm not going to find out. Directed I care
about -- money goes one way, same as a purchase order."

**The account, selected.** "Right panel now says ACC-233575, 'Node', then a 'Neighbors' button with
a little arrow, a funnel, a pin, three dots. Attributes -- flagged true, riskScore 98, '#1 of
3,000' in small grey, which I can just about read at my desk. On the laptop, no. Connections: In
3, Out 5, All 8. That's a clean table, I like that, it's like 'bought from three, sold to five'.

"Now -- where is 'Path to'? Last time there was a button that said 'Path to...' in words and that
was the one thing that made it easy. It's gone. I have Neighbors. I'll open Neighbors, maybe it's
in there."

**The Neighbors menu.** "'Hops from ACC-233575: 1 hop 9 nodes, 2 hops 975 nodes, 3 hops 2,356.'
Then a yellow warning: '975 is a third of the graph. Two hops pass through merchants:
ACC-393859 alone has 907 counterparties.' OK, that is actually a useful sentence -- it tells me
before I do something stupid that one big account connects everybody. In my world that is the
freight forwarder everyone uses; of course everything is 'connected' through it, it means
nothing. I'd want the tool to say that when it finds me a path, too.

"But this is 'what is around this one account'. It's not 'how does this one get to that one'.
Nothing in here says the other account. Not it. Closing it."

**Another account, and the one the filter leaves out.** "Here there are nine accounts drawn with
their numbers on them, a proper picture, and a merchant selected. Its menu says 'Out: paid to --
none. ACC-893168 sent no transfers.' Fair, it tells me instead of drawing nothing.

"Then this one: I searched 782213 and the panel says 'Not in the filtered graph: left out by
ACC-233575 and neighbors. Not drawn; not in any count.' And a link 'Add selection to step'. I
understand 'not drawn'. I don't understand 'step'. Is a step a filter? It seems to mean 'the
filter you have on'. So: the account exists, it's hidden by what I did earlier. That matters,
because my other account, 271813, is probably going to be hidden too."

**Hunting for the path command.** "OK. I'm still looking for 'connect these two'. The three dots
on the account -- I don't know what's in there, the screen doesn't show me. In the toolbar under
the picture there's an arrow, a squiggly icon that looks like a road or an S-bend, a note icon,
'Quick actions' in words, and a square. The squiggly one might be a route. No label, no tooltip I
can see. I wouldn't click it cold.

"'Quick actions' has words, so I'd go there. On the search page they show it: you type 'who
matters most' and it lists degree, betweenness and so on with a plain line each. So I'd type 'path'
or 'how are these connected'. I'm guessing it would find something called path. I'm guessing."

*Moderator note: the mocks do not show Quick actions answering "path"; she was allowed to continue
to the page the task hands over next.*

**The next page: "7,495 selected".** "What is this? The whole cloud has a black outline around it,
'7,495 selected'. The right panel says 1,863 nodes and 5,632 edges. The project is called
'Transfers, March 2026' here, it was 'March transfers' a second ago. And there are only 3,000
accounts. So how do I have 7,495 selected? ...Oh, 1,863 plus 5,632 is 7,495. It's adding the
accounts and the transfers together. Why would anybody want that number? That's apples plus
oranges. If I put that on a slide my VP would ask me what a 7,495 is.

"Nothing here is about my two accounts. I didn't do this. Moving on."

**Sets and paths, first state.** "Left side: 'Sets and paths' -- Flagged, High risk, 'Paid
ACC-893168 frozen'. 'Paths' is in the heading, so that's the right room. But this state is two
sets focused with an Intersect tooltip. 'Members in both sets' -- that's a VLOOKUP-both-lists,
I understand it, but it's not my question."

**The Path tool bar.** "Here it is. A bar over the picture: From ACC-271813, To ACC-233575, Run.
Somebody put my two accounts in -- I didn't see how. The squiggly toolbar icon is blue now, so I
guess that icon WAS the path thing. I'd never have known. If From and To take typing, that's what
I wanted last time; the To box has the cursor in it so I think it does.

"Run is grey. There's a yellow '!' on 'Filtered graph' and a line: 'From is outside the filtered
graph. Set Scope to Full graph to search it.' Right -- I called it. 271813 is hidden by a filter
someone left on. The top-left chip says 'Filtered: 1,071 of 3,000 nodes', and the right panel for
271813 says 'Left out by: riskScore 20 or more'. That reads backwards to me -- it has riskScore 1,
so it's left out because the filter KEEPS 20 or more. Whatever. The line tells me exactly what to
do: change Scope. So I change Scope to Full graph and press Run. That's fine. I prefer it telling
me to Excel-style 'your filter is hiding this row' than just saying 'not connected'. That was my
big worry last time."

**The found path.** "OK. Now we're talking. The picture zooms in, there's a thick line with
'start' at 271813 and 'end' at 233575, through 946224 and 242954. Big labels, I can read those.

"And the table at the bottom -- 'Selected: 3 edges, in path order.' Step 1, 2, 3, source, target,
time, amount. 271813 paid 946224 $3,530.28 on Mar 4, 946224 paid 242954 $9,782.05 on Mar 7,
242954 paid 233575 $9,616.72 on Mar 8. THAT is the answer. That's a table, it's in order, it has
dates and money. The dates go forward, so the money could actually have travelled that way, which
is the first thing anyone will ask. I would copy these three rows straight into Excel -- I'm
assuming the three dots on the table does that; I'd check.

"The right side: 'Found path (unweighted), 3 hops.' 'Paths ignore amount: hops were counted, not
dollars.' Honest, at least. 'Direction: follows transfers' -- good, that answers my question from
last time about whether direction counts. 'Ties: 1 of 2 as short.' So there's another three-step
route. Which one? Same question as last time, twelve then, two now. Two I could live with if I
could see the other one. Does it go through the same middle accounts? If both go through 242954,
242954 is the one I care about. It doesn't say, and I don't see a 'next' or 'show the other'.

"Members: the four accounts with riskScore, the middle two are 93 and 92, both flagged. That's
interesting -- the in-between accounts are high risk. The picture shows them orange."

"Top of the panel: 'Found path', then icons. One of them has a tooltip 'Keep path'. That's
better than 'create path to style' from last time. I would keep it. The other two icons -- a
target and a funnel -- no idea without hovering."

**What amount means.** "There's a popup: Weight 'amount', 'In this run, a bigger amount means: a
closer or stronger link', 'Distance = 1 / amount. The path prefers big transfers.' Re-run. OK, so
I CAN make it care about money. 'Prefers big transfers' I understand. '1 / amount' I skip. For
spend that's what I asked for last time: a five-million link is not a two-thousand link. I'd
re-run it with that and see if the route changes. I don't know what the other choice in that
dropdown is, and I wouldn't open it."

**The ends swapped.** "From 233575 to 271813: 'No directed path; one exists ignoring direction',
and a button 'Ignore direction'. That's good. That tells me money doesn't flow back the other way,
and it tells me there IS a connection if I don't care which way. That's the 'not connected in the
data you gave me' sentence I wanted. Nearly."

**Her Tier 2 question.** "In my data the middle two would be Tier 2 -- who my supplier buys from.
I have that for maybe fifteen percent of spend. So for most of my pairs this bar would say 'no
path', and I'd want it to say 'no path in what you loaded' and ideally how many of my suppliers
have any sub-tier links at all. It still doesn't. Where do I get the Tier 2 data from? Same
answer as last time: I bring it."

**My answer.** "ACC-271813 paid ACC-946224 on March 4, 946224 paid ACC-242954 on March 7, and
242954 paid ACC-233575 on March 8. Three transfers, dates in order, amounts 3,530, 9,782 and
9,617. Both accounts in the middle are flagged. There is one other route just as short that I
couldn't see. And the money only goes that way -- not back."

## Single Ease Question

**4 out of 7.** "Once I was on the path screen it was a 5, maybe a 6 -- the grey Run told me why,
the table is exactly what I'd paste, the direction is stated, and 'no path one way, there is one
ignoring direction' is the honest answer. But getting there was worse than last time. Last time
the account had a 'Path to...' button in words. This time the account panel has Neighbors and
three icons, and the path thing is a squiggle in the toolbar with no label. I only found out it
was the path tool because it lit up blue after somebody else filled in the boxes. And a screen in
the middle told me I had 7,495 things selected out of 3,000. So the same 4: easy end, guessing
start."

## Would she use this instead of her current tool?

"Instead of? No. Next to, for this one question, yes, more than last time. Excel cannot do 'how
does A reach B through three steps' without me doing three VLOOKUPs by hand, and the risk
platform draws me a sub-tier map but doesn't route from one supplier to another, as far as I know.
The step table with dates and money is the thing I'd use -- that goes on the Thursday slide.

"But the same things stand. It's only as good as my Tier 2 data, which is thin. I need to know
the table exports as rows, not a picture. The 'Nothing has been sent from this project' line at
the top is nice and I'll show it to IT, but IT will still want it in writing. And it has to end
up somewhere Power BI can read, or my VP never sees it."

## Observer notes

Problems, most severe first:

1. **The labelled "Path to..." button is gone on the account inspector.** On the find-and-expand
   and sets-and-paths pages a selected account shows "Neighbors" plus unlabelled icons (funnel,
   pin, more); the protein inspector still has "Path to..." in words. That button was what she
   praised most last round, and the new route to paths she took first (search, then the account)
   no longer offers it. Severity 3.
2. **The Path tool's toolbar icon has no label or visible tooltip.** She guessed the squiggle
   might be a route but would not click it cold; she learned what it was only when it showed
   pressed on the Path tool screen. Her fallback was Quick actions, which the mocks never show
   answering "path". Severity 3.
3. **How From and To got filled is not shown.** The bar arrives with both accounts in it; she
   did not see a step that put them there, so she could not repeat it. Severity 2.
4. **"7,495 selected" adds accounts and transfers into one number.** The whole-graph selection
   screen shows 7,495 selected over a graph of 3,000 accounts; she worked out it was 1,863 + 5,632
   and called it "apples plus oranges" she could not put on a slide. The same screen names the
   project "Transfers, March 2026" where every other screen says "March transfers". Severity 2.
5. **"1 of 2 as short" with no way to see or compare the other route.** Her question is whether
   the routes share a middle account; the panel gives a count only. Improved from 12 to 2 in the
   data, not in the design. Severity 2.
6. **"Left out by: riskScore 20 or more" reads backwards.** For an account with riskScore 1 she
   read the line as the reason being the wrong way round; the filter keeps 20 or more, and the
   wording names the kept range as the cause. Severity 2.
7. **"Step" is unexplained.** "Add selection to step" and "left out by ACC-233575 and
   neighbors" assume she knows that a Neighbors filter is a step. Severity 1.
8. **Completeness of the links is still not stated.** "No directed path; one exists ignoring
   direction" helped, but nothing says how much of the network was loaded, so a "no path" on her
   thin sub-tier data would still read as a fact. Severity 2.
9. **Small grey rank lines.** "#1 of 3,000" and the column sub-labels are hard for her at laptop
   size. Severity 1.

What worked:

- Find matched a partial number and said what Enter does and what it searched.
- The Neighbors menu's warning that one merchant with 907 counterparties connects a third of the
  graph -- she read it as "the freight forwarder everyone uses" and wants the same caution on a
  found path.
- "Not in the filtered graph ... Not drawn; not in any count" for a hidden hit, and the Path
  tool's grey Run with "From is outside the filtered graph. Set Scope to Full graph" -- the tool
  told her why, instead of saying "not connected".
- The found path's step table: step, source, target, time, amount, in path order. She called it
  the answer and the thing she would paste into Excel; she checked the dates run forward.
- "Direction: follows transfers" and "Paths ignore amount: hops were counted, not dollars" stated
  the reading plainly; "a bigger amount means ... The path prefers big transfers" gave her the
  spend weighting she asked for last round.
- "No directed path; one exists ignoring direction" with an "Ignore direction" button.
- "Keep path" as the tooltip where "Create path to style" used to be.
