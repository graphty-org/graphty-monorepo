# Session: "How is this account connected to that one?" -- supply chain risk analyst

Participant: Dana Okafor (composite persona), supply chain risk analyst at an industrial
equipment maker. Screens used: the inspector mock (starting at "One node: TP53, at rest") and
the Find mock. The data in both mocks is sample data (a protein network and the Les Miserables
characters), not suppliers; Dana was asked to imagine her own supplier export in its place.

Task as given by the moderator: "How is this account connected to that one?"

## Transcript (thinking aloud)

**Reading the task.** "Account. OK -- in my world an account is a supplier account or a
customer account. So I'm picturing: how is our Tier 1 casting supplier connected to that
distributor that keeps showing up. Do they share a sub-supplier, does one buy from the other.
That's the question I get after a bankruptcy notice. Fine. And I'll say it now: if the
connection runs through Tier 2, I only have that for maybe fifteen percent of spend, so this
answer is only as good as the links I load."

**Inspector, one thing selected (TP53).** "So this is pretending my supplier is 'TP53'. The
right side has the name at the top and a little tooltip: 'Select neighbors, 1 hop: 33 nodes'.
I don't know what a hop is. I'm guessing it means direct connections -- 33 things it touches.
Underneath: degree, betweenness, pagerank, each with '#2 of 30...' cut off at the edge. I
skip those. Betweenness I've heard in a webinar, that's the chokepoint one, but it's not my
question. The text here is small and grey -- 'Position', 'module' -- on my laptop at 110 I'd be
leaning in. '32 neighbors' under Connections -- the tooltip said 33 and this says 32? Maybe one
is counting itself. That's the kind of thing that makes me stop trusting the numbers."

"What I'm looking for is a second box. 'From this one, to that one.' I don't see it. There's a
funnel, a pin, a three-dots. I'm not clicking three dots on a hunch."

**Find panel.** "OK, there's a search. That I'll use. I type the name -- 'thenard' -- and it
gives me two: Thenardier, Mme.Thenardier. Great, that's the duplicate-supplier problem right
there, two records for the same family, which is my life. It says 'Enter selects.' So I press
Enter, it picks Thenardier, the right side shows it. Now I want the OTHER account. I type the
second name in the same box... and I'd expect that to just replace the first one. Nothing on
this screen says I can pick two. In Excel I'd Ctrl-click. I'll try Ctrl-click in the result
list." (The Find mock shows no multi-select in its result list; Ctrl-click does nothing
visible.) "Nothing. So now I've lost my first one."

**The lightning-bolt box (Quick actions).** "There's a lightning button on the bottom bar. I
type 'connected'. The example here is 'who matters most' and it lists degree, betweenness,
closeness, PageRank, eigenvector, Katz. I at least like that each one has a plain line next to
it -- 'who sits between groups', that I get. But 'connected between two accounts' -- I'm guessing
it'd give me the same kind of list. If I type the second account's name it just throws me back
to Find. Round in a circle."

**Guessing a shift-click on the picture.** "Fine, I'll do what I'd do in PowerPoint: click one,
hold Shift, click the other." (Inspector state 6: two nodes selected.) "OK! Now the right side
says '2 selected', and there's a blue button: 'Paths between...'. THAT is what I wanted from
the start. If I'd seen that button name anywhere before I had two things picked, I'd have been
here in thirty seconds. Also 'edges between: 0' -- I think that means they don't buy from each
other directly. I had to work that out; 'edges' isn't my word, 'direct link' would be."

**The 'Paths between' form.** "From: TP53, To: SMAD3, and a swap arrow. Good, it filled them
in. 'Undirected' -- hm. For me direction matters: materials flow from the sub-supplier to the
supplier to us. If it ignores direction it could tell me our customer is 'connected' to our
supplier through us, which is true and useless. 'Weight by: None: count hops.' I'd want to
weight by spend or by lead time. Is that in that dropdown? I'd open it. 'Every shortest path is
found and drawn together.' OK. Run."

**The result (found path).** "'Found path, 3 hops, 1 of 12.' So there are twelve ways that
are equally short, and it's showing me one. Which one matters? The one through a single-source
part, obviously, but it doesn't know that. I'd click the arrows through twelve of them, I
suppose. The list on the right -- 'Members walk order' -- TP53, MSH2, UBB, SMAD3, with numbers
next to each. That list I actually like; it reads like the chain on an audit form: our
supplier, their supplier, the distributor, the other account. 'Walk order' is a strange phrase,
I'd call it 'the chain'. The grey 'confidence 0.82' lines between them -- I'm guessing that's
about the link, like how sure we are the link is real. If that's our survey confidence, that's
genuinely useful, but I'm guessing."

"The picture: there's a thick dark line through the middle of the hairball. I can find it
because I know it's there. The labels on the path are half covered -- one says 'UEP' or
something under UBB. I would not put this on a slide. What I'd put on a slide is the list,
the four names in order, and ideally all twelve routes in a table."

"Export at the bottom right is two tiny icons, a copy thing and a plus. I don't know which one
gives me a table for Excel. 'Create path to style' -- no idea what that does, not clicking it."

**Kept path / sets on the left.** "On the left there's 'Sets and paths'. I assume if I keep
this route it lands there so I can find it next week. That'd matter -- I'd be asked the same
question on Monday."

## After the task

**Single Ease Question: 3 of 7.** "Once I had both accounts selected it was easy -- one button,
filled in for me, a list in order. Getting both selected was the hard part, and I only got
there by guessing Shift-click. The search box let me find one account and then fought me on
the second."

**Would you use this instead of your current tool?** "For this question, maybe -- nothing I
have does it at all. In Excel I'd be XLOOKUPing between two tabs of survey answers and I'd
miss anything two steps away. Our risk platform shows me one supplier's map, not 'how are
these two tied together'. So the chain list is new to me, that's real. But: the route is only
as good as my Tier 2 links, and I don't have most of those. It needs to respect direction and
let me weight by spend. And I still need to know where my supplier list goes when I load it and
whether I can get the chain out to Excel or Power BI. If IT says yes and it exports the table,
I'd use it as a side tool for exactly this question -- the 'are these two tied together' one
after a bad news day. Not as my main tool."

## Problems observed

1. No way to pick the second account from search. Find says "Enter selects" and selects one;
   typing a second name replaces it; Ctrl-click in the result list does nothing. The
   participant reached two selected things only by guessing Shift-click on the picture.
   Severity 3.
2. "Paths between..." is invisible until exactly two things are selected, so a user with this
   question cannot discover it from one selected thing, from Find, or from Quick actions
   (typing "connected" or a name gives no path command). Severity 3.
3. Path form defaults to "Undirected" and "count hops"; for material flow direction matters
   and she wants to weight by spend or lead time. It is not clear from the form whether either
   is possible. Severity 2.
4. "1 of 12" equal paths with no way to tell which route matters and no table of all twelve.
   Severity 2.
5. The drawn path is hard to see in the hairball and its labels overlap; not slide-ready.
   Severity 2.
6. Vocabulary: "hop", "edges between", "walk order", "Create path to style" are not her words;
   "1 hop: 33 nodes" in the tooltip versus "32 neighbors" in the panel reads as a
   contradiction. Severity 2.
7. Export on the path is two small unlabeled icons; she cannot tell which one gives her a table
   for Excel. Severity 2.
8. Small grey labels (attribute names, "confidence" rows) are hard to read at laptop size;
   ranks cut off at the right edge ("#2 of 30"). Severity 1.

## What worked

- Once two were selected, the single labeled "Paths between..." button with From and To
  already filled in was exactly the right move.
- The ordered list of the chain, with a value next to each step, reads like an audit trail and
  is the part she would take to a meeting.
- Plain-language lines next to each measure in Quick actions ("who sits between groups").
- Find surfaced the near-duplicate names (Thenardier / Mme.Thenardier) together, which mirrors
  her duplicate-supplier problem.
