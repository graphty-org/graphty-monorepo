# How is ACC-271813 connected to ACC-233575? -- Marcus, criminal intelligence analyst

Participant: Marcus, 44, criminal intelligence analyst at a state fusion center; i2 Analyst's
Notebook and Excel every day (persona: ../../personas/intelligence-analyst.md). He did this task
once before, in round 3, on a protein-interaction mock; there he rated it 5 of 7.

Task as given by the moderator: "How is ACC-271813 connected to ACC-233575?"

Screens used, in the order he met them: find-and-expand (states 1, 2, 3, 5, 7), sets-and-paths
(states 3, 4, 5, 6), and the inspector mock (one node, and Path to armed) when he went looking
for the button he remembered. Renders read from shots/; the HTML read only to see what a control
does when pressed.

## Transcript

**Find-and-expand, state 1: "March transfers", searching.**

"Okay, this time it's accounts. March transfers, 3,000 accounts, 9,113 edges, directed. That's
my kind of data -- well, it's a bank's, not a carrier's, but a transfer is a call with a dollar
sign on it. Top left says 'Nothing has been sent from this project.' I read that. Good. Left
rail says Assistant off, nothing is sent. Also good. That's the first thing I'd ask."

"The middle is a grey honeycomb. 'Drawn as density.' Fine, three thousand accounts, I didn't
want to see three thousand dots anyway. One orange dot."

"I type 233575 in the search. One hit, ACC-233575, riskScore 98. Under it: 'Enter goes to it;
Enter again selects it.' Plain. And the table at the bottom already has him at the top because
it's sorted by riskScore. riskScore 98. Somebody's going to ask me where 98 came from. I'll come
back to that."

**State 2: the hit is selected.**

"Right panel: ACC-233575. flagged true, riskScore 98, '#1 of 3,000', personal, US. Connections:
In 3, Out 5, All 8. In and out, split. That's the first thing I'd do in i2 with a phone -- who
called him, who did he call. Good, it's split without me asking."

"Now, the question isn't his contacts. The question is how he's connected to ACC-271813. Last
time I did this there was a big 'Path to...' button right under the name. I don't see it. I see
'Neighbors' with a little arrow, a funnel, a pin, and three dots. Where'd Path to go?"

**State 3: opens the Neighbors dropdown, looking for it.**

"Neighbors drop-down. 'Hops from ACC-233575.' 1 hop, 9 nodes. 2 hops, 975. 3 hops, 2,356. And
then a yellow warning: '975 is a third of the graph. Two hops pass through merchants:
ACC-393859 alone has 907 counterparties.' Okay -- I actually like that. That's the eight-crews-
five-hundred-people problem, and it's telling me before I do it that the merchant is going to
blow it up. That's the thing I'd have found out the hard way in i2."

"'Follow: In: paid by, Out: paid to, All.' Money words. Good. 'Paid by' and 'paid to' I don't
have to translate."

"But none of this is a path. I could grow out from 233575 two hops and hope 271813 shows up. That
is how I'd do it by hand in i2, honestly -- expand, expand, look for the name. But you've got
975 people at two hops. No."

**State 7 (the grown step, 34 accounts) and state 5 (a hit left out) -- glanced at.**

"This is the expand-and-look approach. 34 accounts, drawn as actual dots with labels now. I
search the other number while filtered -- the screen where 782213 says 'Not in the filtered
graph: left out by ACC-233575 and neighbors. Not drawn; not in any count.' That's honest. I'd
want that. If I searched 271813 here and it said 'left out', at least I'd know it isn't a
neighbor and I'm not going crazy. But that tells me what he isn't, not how they connect."

"Is there a way to just... ask it for the path? I'm on my second 'where is it'."

**Hovers the toolbar at the bottom of the canvas.**

"Bottom toolbar: an arrow, then a squiggly icon that looks like two dots with a line snaking
between them, then a page icon, then 'Quick actions'. The arrow and 'Quick actions' I get. The
other two have no words and hovering gives me nothing on this screen. The squiggly one looks
like a route on a map. I'll click it. If it's wrong I'll hit Escape."

**Sets-and-paths, state 3: the Path tool is armed.**

"There it is. A little bar pops up over the canvas: From, To, Run, Scope, Weight. That's the
thing. It filled in From with ACC-271813 and To with ACC-233575 -- in the mock I'll pretend I
typed them; I'd type the numbers, I'm not clicking a hexagon. And the To box is a box you type
in, it looks like it. Last time I wasn't sure. This time it just has the number in it."

"Run is grey. And a yellow warning on Scope: 'From is outside the filtered graph. Set Scope to
Full graph to search it.' Okay, wait. Somebody filtered this to 1,071 of 3,000 -- top left says
'Filtered: 1,071 of 3,000 nodes'. I don't remember doing that. The right panel says 271813 is
'Left out by riskScore 20 or more'. So there's a filter on that only keeps the risky accounts,
and my guy is riskScore 1, a business in Mexico. Fine. At least it told me why Run is grey and
what to change, in one sentence. I'd set Scope to Full graph. I would not have wanted it to
quietly search only the risky ones and tell me 'no path' -- that would've been the dangerous
version, and it didn't do that."

"'Weight: amount, not used yet.' Not used yet? Is that a setting or a status? I'll leave it
alone. I want hops."

**State 4: runs on the full graph -- found path.**

"Okay. Now we're talking. It zoomed in. Start and end tags on the chart, a line with arrows:
ACC-271813 to ACC-946224 to ACC-242954 to ACC-233575. Three hops. The arrows go the way the
money went. Right panel: 'Found path (unweighted), 3 hops. Direction: follows transfers.' Last
time I complained it said 'undirected' at me. This says it followed the money. Good. That's the
sentence I say to the sergeant."

"And the bottom table flipped to Edges, 'Selected: 3 edges, in path order': step 1, 271813 to
946224, Mar 4 18:23, $3,530.28. Step 2, 946224 to 242954, Mar 7 13:27, $9,782.05. Step 3,
242954 to 233575, Mar 8 20:29, $9,616.72. THAT is the answer. That is the thing I asked for last
time -- the links, not the stops, with a date and an amount. Four days, three hands, and the
last two are just under ten grand each. Under ten thousand -- that's a reporting threshold, I'd
flag that for the case agent right there. This is the first screen in this thing that shows me
something I didn't already know."

"What's still missing: which record each transfer came from. Bank, statement, reference number,
page. The table has step, source, target, time, amount. If I'm on the stand, 'Mar 7 13:27,
$9,782.05' is good, but I need 'Chase return, line 4,418'. Maybe there's a column scrolled off.
I can't tell. And if 946224 sent 242954 three times that week, is this row one transfer or the
three rolled up? It doesn't say."

"'Ties: 1 of 2 as short.' There's a second three-hop route. Where is it? Last time there were
arrows to step through twelve. Here it's just text. I want to see the other one. If both routes
go through 946224, that's my middleman. If they go through two different people, that's a
different story. It told me it exists and didn't give me a button to see it. That's worse than
not telling me -- now I have to go find it."

"Endpoints: start ACC-271813 'outside filter'. Okay, it remembers the filter. Members, four,
with riskScores 1, 93, 92, 98. So the start is a low-score business and every hop after is a
high-score personal account. That's interesting. Still, riskScore -- whose score? Nothing on the
screen says where that number came from. On the node panel for 233575 in the first screen it
didn't say either. Round the table: 'The score says he's the leader. Based on what?'"

"Up top right: a little bookmark with a tooltip 'Keep path'. That's what I wanted last time.
Not 'Create path to style'. Keep path. I'd press it."

**State 5: clicks "Weight: amount, not used yet".**

"Popover: Weight 'amount'. 'In this run, a bigger amount means: a closer or stronger link.
Distance = 1 / amount. The path prefers big transfers.' ... No. I don't know what I'd do with
that. The path that prefers big transfers. Why would I want the path that prefers big
transfers? I want to know who touched the money. I'd close this and never open it again. At
least it says in words what it would do, so I know not to."

**State 6: tries it the other way -- from 233575 to 271813.**

"Swapped round: From ACC-233575, To ACC-271813, full graph, Run. 'No directed path; one exists
ignoring direction.' And a button, 'Ignore direction'. Good. That's exactly right. Money went
from 271813 toward 233575, not back. It's telling me the direction matters and letting me
choose. That's the switch I asked for last time."

"One thing -- the right panel here shows 233575 with 'Links (count) 8' and memberships Flagged
and 'High risk and Paid ACC-893...'. On the first screen the same guy had 'Connections: In 3,
Out 5, All 8' split out. Here it's one number, 'Links (count)'. Same account, two panels, two
different ways of telling me his contacts. Which panel am I going to get?"

**Inspector mock -- goes back to find the Path to button he remembered.**

"Just to check I'm not crazy -- the protein one. TP53. Right there under the name: 'Path to...'
big button, full width. Press it, black bar at the top: 'Pick the end node: click, or find it by
name (Ctrl+K). Esc cancels.' and the same From/To bar at the bottom. So the button exists -- on
the protein screen. On the account screens it's gone and I had to guess the toolbar squiggle.
That's backwards. Accounts are the ones I'm going to be asked about."

## After the task

**Did he answer the question?** Yes. ACC-271813 paid ACC-946224 ($3,530.28, Mar 4), who paid
ACC-242954 ($9,782.05, Mar 7), who paid ACC-233575 ($9,616.72, Mar 8): three hops, following the
money. There is a second equally short route he could not see. The reverse direction has no
directed path.

**Single Ease Question:** 5 of 7.

"Once I found the path tool it was a 6, maybe a 7 -- the edge table in path order with the dates
and amounts is the whole answer on one screen, and it follows the money and says so. But I spent
my first two minutes looking for the button I used last time, and on these account screens it
isn't there. I found it by clicking an icon with no label. If Path to was under the account name
like it was on the proteins, this is a 6. If the second tie was one click away and each row told
me its source record, it's a 7."

**Would he use it instead of his current tool?**

"For 'how is A connected to B' on a bank return -- yes, over i2. i2 gives me a path; this gave me
the path with the dates and dollars in order, and caught that the money only runs one way. That's
the sergeant's question answered in under five minutes. Not instead of i2 for the chart I hand the
prosecutor, though. Two things stop me: every row has to say which record it came from, and I have
to see all the tied routes, not be told there's one I can't see. And the usual: it has to run on
our server. It says nothing's been sent. I'd want that in writing from IT, not from a label."

## Problems observed

1. On the account screens (find-and-expand, sets-and-paths) the node inspector has no "Path
   to..." button; the protein inspector does. The only way to a path on account data was an
   unlabelled toolbar icon with no tooltip on this screen. He lost about two minutes and found
   it by guessing. (Severity 3)
2. "Ties: 1 of 2 as short" reports a second equally short route but offers no way to see it; he
   needs it to tell a single middleman from two separate routes. (Severity 3)
3. The path's edge rows show time and amount but not the source record (bank, statement,
   reference), and do not say whether a row is one transfer or several combined. (Severity 3)
4. riskScore is shown on every account and ranked (#1 of 3,000) with no sign of where it came
   from or who computed it. (Severity 2)
5. "Weight: amount, not used yet" reads as a status, not a setting; the "Distance = 1 / amount,
   prefers big transfers" option makes no investigative sense to him. He would never touch it.
   (Severity 1)
6. A filter he did not set ("riskScore 20 or more", 1,071 of 3,000) was already on when he opened
   the path tool; the tool correctly refused to run and said why, but he had to discover that a
   filter was active. (Severity 2)
7. The same account shows its contacts two ways on two screens: In/Out/All split in
   find-and-expand, a single "Links (count)" in sets-and-paths. He wondered which panel he would
   get. (Severity 1)
8. Toolbar icons other than "Quick actions" carry no text and, on find-and-expand, no tooltip.
   (Severity 2)

## What worked for him

- The edge table in path order with step, source, target, time and amount: the answer in one
  screen, and it surfaced two just-under-$10,000 transfers he would flag.
- "Direction: follows transfers" on the result, and "No directed path; one exists ignoring
  direction" with an "Ignore direction" button on the reverse run.
- "From is outside the filtered graph. Set Scope to Full graph to search it." instead of a silent
  "no path".
- The Neighbors menu warning that two hops is a third of the graph because of one merchant.
- "Keep path" instead of last round's "Create path to style".
- "Nothing has been sent from this project" and "Assistant: Off. Nothing is sent." in view on
  every screen.
