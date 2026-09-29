# Session: "How is this account connected to that one?" -- Sarah, fraud investigator

Participant: Sarah, level-2 financial crime investigator (simulated; persona in
study/personas/fraud-analyst.md). Mode: first impression, not mandated -- she gives it about
five minutes on her own initiative.

Screens used: the inspector mock (screens/inspector.html, renders shots/screens__inspector.png,
inspector-grow.png, inspector-mixed.png, inspector-path.png, inspector-cap.png) and the find
mock (screens/find.html, renders find--s1.png to find--s3.png). The mocks are static, so each
click was resolved by reading what the control is labelled and which next state the prototype
shows.

Moderator's task, as given: "How is this account connected to that one?"

## Transcript (think-aloud)

**First screen -- the inspector, one node selected.**

"Okay. 'Human protein interactions.' TP53, BRCA1... this is biology. Where are my accounts?
I'll pretend the dots are accounts. Fine."

"First thing I want is a box to paste an account number into. Left side: Graphs, Sets and
paths, Styles, Views. No search box. Top right, 'Export'. Nothing that says search. I'd hit
Ctrl+F -- that's what I'd do in anything -- but in a browser that just searches the page
text, and the dots aren't text."

"Right-hand panel. TP53, 'Node'. Degree 32, 'number 2 of 300'. Betweenness 0.1139, pagerank.
Don't know what those are and I'm not going to learn today. 'Connections: 32 neighbors' --
that I understand. Thirty-two counterparties. Where are the amounts?"

**Tries the hop picker (the caret next to the neighbours icon).**

"Oh, this I like. 'Select neighbors of TP53: 1 hop +32 nodes, 2 hops +168, 3 hops +295.' It
tells me how big it's going to get before I press it. That's the payroll-account problem --
if it said 5,000 I wouldn't press it. Good."

"But that's 'who is near this account'. My question is 'how does this one get to that one'.
Grabbing three hops of everything is how you get a hairball."

**Tries selecting both accounts.**

"So I'll click one account, shift-click the other. The panel says '3 selected', nodes 2,
edges 1, Statistics, Attributes, Memberships, Appearance, Export. There's a filter icon and
some other icon. Nothing says 'path', nothing says 'how are these connected'. I've got the two
things I care about selected and it gives me a colour swatch. In i2 I'd at least get 'find
path' on the right-click."

**Looks at the bottom toolbar.**

"Four icons at the bottom, no words. Arrow, a squiggly S thing, a page, a lightning bolt. No
tooltips when I point at them [the mock has none on the toolbar]. The squiggle -- could be
'draw a line'? Could be 'connect'. I'll guess it's the connect one because the others are
obviously pointer, note, and... lightning, no idea."

**Guesses right: the squiggle is the Path tool; the found-path state appears.**

"Okay, now we're talking. 'Found path. 3 hops. 1 of 12.' TP53, MSH2, UBB, SMAD3 in order down
the right side. The picture draws the route with thick lines. That list in walk order is
actually what I'd write in the narrative: A sent to B, B sent to C, C to D."

"But -- '1 of 12'? There are twelve different routes of the same length and it picked one for
me? Which one did the money go through? Shortest by number of hops means nothing to me. Money
doesn't take the shortest route, it takes the route the launderer set up. I want the one where
10k came in and 9,800 went out the next day."

"'Weighted by: hops, no weight.' So it ignored the amounts. And there are no amounts. No dates.
Down the list it shows 'confidence 0.82' between each step -- for me that would need to be
amount and date on every link, or it isn't evidence. Who, what, when -- I've got who. I don't
have what or when."

"Direction. Did A pay B or did B pay A? The lines have little arrowheads, I think, but the list
doesn't say 'sent to'. If the path goes against the flow, it's not a flow of funds, it's two
accounts that happen to know each other."

"'Create path to style.' I don't know what that means. 'Create path' I'd guess saves it. Is it
saved tomorrow? Would my reviewer see the same thing?"

"Export at the bottom -- a copy icon and a plus. Top right 'Export...'. I'd want the four
accounts and three transfers as a CSV and the picture for the case file. Can't tell from here
whether I get the CSV or just a picture."

**Finds the one screen with money in it -- the transfers selection.**

"Now 'Transfers, March 2026'. That's more like it. 'Mule ring, fixed, 14.' 'Amount, edges:
$9,540,249.05' -- a total I could check against my pivot, good. 1,863 accounts selected,
ACC-393859, merchant, US, degree 907, riskScore 0."

"But the picture is a grey honeycomb. Where's my account? Where's the ring? I can't see a
single account in there. And riskScore 62 on ACC-697114 -- 62 out of what, and why? If I put
that in a SAR the examiner asks 'why 62' and I've got nothing."

**Goes to the find screen.**

"Here's a search box, top left. Typed 'thenard', got Thenardier and Mme.Thenardier -- it
forgave the spelling. Fine. It says underneath 'Paste a list of ids to find them all.' That's
actually useful: I'd paste both account numbers and get both selected. That's step one of my
task done, finally."

"'Marius -- left out by Filter out group 8. Not drawn; not in any count.' Hmm. So if one of the
middle accounts is filtered out, does the path go around it, or tell me it's hiding? That
would worry me -- I don't want a route that skips the mule because somebody filtered
'merchant' last week."

"Lightning bolt: I type 'who matters most' and get 'Run Betweenness, Run PageRank, Run
Eigenvector centrality, Run Katz centrality, Run HITS.' No. I would never click any of those.
Is there an entry here for 'how are these two connected'? It's not in the list I can see. If
typing 'how is A connected to B' in here gave me the path, that'd be the thing."

"That's my five minutes."

## After the task

**Single Ease Question (1 very hard -- 7 very easy): 3.**

"I got a path, but by guessing an icon with no label, and the path it gave me has no money,
no dates and eleven brothers it didn't show me. The finding part was okay once I found the
search box. The connecting part I'd never have found without guessing."

**Would you use this instead of what you use now?**

"Not for this. For 'how is A connected to B' today I pull both statements, filter the
counterparty column in Excel and look for names in common, and for the big cases I do it in
i2. What I saw here gives me a prettier line but less information than my spreadsheet -- no
amounts, no dates, not ordered by time. If the path step showed amount and date on every hop,
let me pick 'follow the money in time order' instead of 'fewest hops', and handed me a CSV of
exactly those transfers and a picture for the file, then yes, that saves me an afternoon on a
ring case and I'd ask my manager for it. The hop counts before you grab neighbours -- keep
that, that's the one bit that already knows my world."

## Observations for the studio (moderator notes)

- She never found a route from "two accounts selected" to "the path between them"; the
  two-node selection offers no path command. She reached the Path tool only by guessing an
  unlabelled toolbar icon.
- The found path is ranked by hop count and names 1 of 12 equal paths; for money flow she
  wants direction, amount and date per hop and a time-respecting route, not the fewest hops.
- The path's member list in walk order was the most useful thing on screen for her narrative.
- The hop-size preview on Select neighbors was the one unprompted positive.
- Quick actions answered her question with centrality jargon; no entry matched "how are these
  connected".
- The only financial data (the transfers selection) is drawn as a density honeycomb in which
  no single account is visible; riskScore appears without a reason.
