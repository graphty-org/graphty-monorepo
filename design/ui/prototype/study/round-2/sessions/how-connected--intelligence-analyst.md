# How is this account connected to that one? -- Marcus, criminal intelligence analyst

Participant: Marcus, 44, fusion center analyst, daily i2 Analyst's Notebook and Excel user.
Task as given by the moderator: "How is this account connected to that one?"
Screens used: the inspector mock (started there) and the find mock, as still renders.

## Think-aloud

**Opening the inspector screen.** "Okay. Human protein interactions. That's not my data, but
fine, I'll pretend TP53 is an account. First thing I look for is where I type the account
number. I don't see a search box up top. Left side is Graphs, Sets and paths, Styles. Right side
is one thing selected, TP53, with a little tooltip -- 'Select neighbors, 1 hop: 33 nodes'. That
I like. It tells me thirty-three before I blow the chart up. i2 doesn't do that."

"Dots are all the same shape. Which one's the account and which one's the phone? I'd have to
click them. Flat, at least. No spinning."

"Top left of the rail: 'Assistant. Off. Nothing is sent.' Good. I read that twice. That's the
first question I'd ask."

**Looking for the second account.** "I've got one end. Now I need the other end. I'm guessing I
search. There's no search box on this screen, so I go to the other page -- Find."

**Find screen.** "There it is, a search box on the left. I type a name, I get 'Thenardier' and
'Mme.Thenardier', two results. Fine -- that's the three-spellings problem, and it catches the
partial. Degree next to each one. I click the first one and it's selected on the chart and on
the right. Good. Now how do I get the second one in *with* it? I'd expect to Ctrl-click the
second hit in the list, or a checkbox, or an 'add' button. I don't see one. Clicking the second
hit, I assume, just swaps the selection. So I've lost the first guy."

"Is there a way to just type both of them in? From A, to B? That's the question I get asked
twice a week."

**Trying the bottom toolbar.** "There's a toolbar at the bottom of the chart. Arrow, a squiggly
line thing, a page, a lightning bolt. No labels. The squiggle might be a path? I'd hover it.
Lightning bolt -- I'm not clicking 'lightning' on case data until someone tells me what it does."
(Moderator notes: the lightning bolt is Quick actions; Marcus opens it and types 'who matters
most', sees Betweenness centrality -- 'who sits between groups'.) "Okay, 'who sits between
groups', that's the middleman. That's the one line I wanted. But that's not my question right
now."

**Back to the inspector, the two-node state.** "Somebody shift-clicked two on this one. Now the
right side says '2 selected' and there's a big button, 'Paths between...'. There. That's it.
Why didn't I see that before? Because it isn't there until you have exactly two. I had to know
to shift-click on the chart itself, find my second dot among three hundred. On a real phone dump
I'm not finding one dot by eye."

"Clicked Paths between. Little panel: From TP53, To SMAD3, already filled in, with a swap arrow.
'Weight by: None, count hops.' Okay. 'On: full graph, 300 nodes. Undirected.' Undirected --
hold on. On money, direction matters. A paid B is not B paid A. Can I say 'follow the money'
here? It doesn't say. I'd leave it and hit Run."

**The found path.** "Right side: 'Found path, 3 hops, 1 of 12'. Twelve? Twelve different routes
all the same length, and I get to page through them one at a time with little arrows. The text
says 'every shortest path is found and drawn together', but the panel only lists one. When the
sergeant says 'how does he know him', I need to tell him 'three ways, and here's the one with
the most calls'. Show me all twelve in a list I can scan, not a page-flipper."

"The members list is good. TP53, then the link, then MSH2, then the link, UBB, SMAD3. Walk order.
That's a chain I can read out loud. That's basically the slide."

"Between each one it says 'edge confidence 0.82'. Confidence according to who? That's the
0.37-of-what problem. What I need on that line is: which record -- the wire on March 3rd, the
Western Union from the 12th, bank return page so-and-so. If I click that link and it can't tell
me the record, I can't use the chain. I'm the one on the stand."

"Big button, 'Create path'. So if I don't press it, the path goes away next time I run
something? That's a trap. I'd lose it. It should just stay until I throw it out. After I press
it, it lands in 'Sets and paths' as 'TP53 to SMAD3'. Okay, that I'd use -- that's my saved
answer."

**Filtered chart question.** "One more thing -- on the Find screen the chip says 'Filtered: 28
of 77 nodes'. The paths panel said 'On: full graph'. If I've filtered to last month's calls,
does the path go through people I filtered out? I'd need to know which, because 'connected in
March' and 'connected ever' are different answers."

## After the task

**Single Ease Question: 4 of 7.** Once two were selected it was one click and the answer came
back as a chain I can read. Getting the two selected was the hard part, and I'd never have found
'Paths between' if I hadn't been shown the two-selected state.

**Would I use it instead of i2 and Excel?** "Not yet. For 'how is A connected to B' it's better
than i2 -- i2 makes me dig through a menu for Find Path, and this hands me the chain in walk
order. But I need three things before I'd put a real case in it: let me type both accounts
straight in without hunting for dots, show me every route at once in a list, and put the source
record on every link, not a confidence number. And somebody from IT has to sign off on where the
data lives. If those land, I'd use it for exactly this question."

## Problems observed

1. Paths between is invisible until exactly two nodes are selected; Find selects one hit at a
   time, and there is no visible way to add a second hit from the Find list. He had to fall back
   to shift-clicking a dot on the chart. (severity 3)
2. A path link shows "edge confidence 0.82" but no source record, date or grade. He cannot use a
   chain he cannot trace to a record. (severity 3)
3. "1 of 12" equal paths are stepped through one by one; he wants all of them listed together
   and cannot tell which one is "the" answer. The form says all are drawn together; the
   inspector shows one. (severity 2)
4. The found path is temporary until "Create path" is pressed; he read that as a way to lose
   work. (severity 2)
5. The path form says "Undirected" with no visible way to follow direction (money or calls from
   A to B). (severity 2)
6. Unlabelled icons in the canvas toolbar (path tool, lightning bolt); he would not click the
   lightning bolt on case data without knowing what it does. (severity 2)
7. With a filter on, it is unclear whether a path may route through filtered-out entities ("On:
   full graph" vs "Filtered: 28 of 77"). (severity 2)
8. Every entity is the same dot; no type icons (account, phone, person). (severity 1 for this
   task)

## What worked for him

- "Select neighbors, 1 hop: 33 nodes" told him the size before growing the chart.
- "Assistant. Off. Nothing is sent." answered his first data-handling question.
- Paths between opened with From and To already filled, with a swap.
- The walk-order member list (node, link, node) reads like the sentence he gives a sergeant.
- The kept path shows up in Sets and paths by name.
