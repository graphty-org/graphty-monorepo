# How is this account connected to that one? -- Marcus, criminal intelligence analyst

Participant: Marcus, 44, criminal intelligence analyst at a state fusion center; i2 Analyst's
Notebook and Excel every day (persona: ../../personas/intelligence-analyst.md).

Task as given by the moderator: "How is this account connected to that one?"

Screens used: the inspector mock (states 1, 4, 6, 8, 11, 12 and the selection-cap state) and the
Find mock (states 1, 10 and 11). Renders read from shots/; the HTML read only to see what a
control does when pressed.

## Transcript

**Opening the first screen (inspector, one node selected, TP53).**

"Okay. 'Human protein interactions.' TP53, BRCA1. That's not an account, that's biology. You
asked me about accounts. I'll pretend TP53 is my first account and see if the buttons make
sense, but I'm telling you now, I can't judge a tool on data I don't know."

"Right side, top: the thing I clicked, TP53. Under it: Neighbors, and a big button, Path to...
Good. 'Path to' -- that's the question. Somebody finally put it on the front of the thing
instead of burying it in an analysis menu. In i2 I'd have to go find Find Path under the
Analysis tab and hope I remember which one's which."

"The tooltip says 'Filter to neighbors, 1 hop: 33 nodes. Ctrl+Z undoes it.' Fine, I like that it
tells me the count before I press it. But I'm not doing neighbors. I want the path."

**Presses Path to... (inspector state 4).**

"Black bar at the top: 'Pick the end node: click, or find it by name (Ctrl+K). Esc cancels.'
Down at the bottom there's a little From/To box -- From says TP53, To says 'Pick the end node'.
Okay, that's clear. Plain English. I would not click in that hairball to find my second account,
though. Three thousand accounts, I'm typing the number. So Ctrl+K. I'd have liked to just type
into that 'To' box at the bottom -- it looks like a box you type in. Can I? It doesn't say.
I'll assume yes."

"Does it follow direction? Money goes one way. If A sent to B and B sent to C, that's a path.
If C sent to B and A sent to B, that's two people paying the same guy -- that's a
connection too, but it's a different sentence when I say it to the sergeant."

**Tries the other way in: two selected, Paths between... (inspector state 8).**

"Oh, here -- select both, and there's 'Paths between...' Popup: From TP53, To SMAD3, a swap
arrow, 'Weight by: None: count hops', and at the top 'On: full graph, 300 nodes. Undirected.'
Undirected. Okay, it told me. On a protein thing, sure. On my transfers I'd want that to say
directed and I'd want a choice -- follow the money, or ignore the arrows. I don't see a switch
here. If it's greyed text it's not a control, it's a statement."

"'Weight by' -- no weight, count hops. That's what I want nine times out of ten. Shortest by
number of hands the money went through. If it offered 'amount' I'd have to think about what
that even means for a shortest path. Leave it on hops."

"'Every shortest path is found and drawn together.' Good. That's what I want. Not just one."

**Presses Run (inspector state 11, a found path).**

"Right panel: 'Found path. 3 hops. 1 of 12.' Wait. The popup just told me every path is drawn
together. Now it's showing me one, with arrows to flip through twelve. Which is it? I've got
twelve equal routes and I'm looking at one. That's actually the important thing for me -- if
there's twelve ways from A to B, maybe they're both just paying the same merchant and it means
nothing. If there's one, it's a middleman and I care. So tell me the twelve up front, and let
me see them all on the board at once."

"The member list: TP53, MSH2, UBB, SMAD3, walk order. Okay, that's the chain. That's the answer
to the sergeant's question, basically. Two in the middle. On accounts that'd be 'your guy sent
to this one, who sent to that one, who sent to the target.'"

"What I don't see: the links. It lists the stops, it doesn't list the hops. Each stop has
'confidence 0.82' hung under it -- I'm guessing that's the line going to the next one? It's
indented under the node like it belongs to the node. On my data that line is a transfer: how
much, what date, which statement it came from. That's the thing I'll be asked about on the
stand. Here I get a number with no label of what it's the confidence of."

**Clicks one link on the path to check it (inspector state 6, one edge).**

"TP53 -- BRCA1. Endpoints. Attributes: confidence 0.71. That's it. No source. No date. No record
number. If this were a transfer it'd need the amount, the date and the bank's reference, and
honestly the ability to say 'there were four transfers between these two, here they are'. One
line on the chart standing for four records is how i2 does it -- 'four transactions,
$11,200'. This just shows one number. Maybe that's just this dataset. I can't tell from here."

"There's a 'Notes -- Add a note' at the bottom. Fine, I could write the source in myself. That's
what I do in i2 today. It'd be better if it came from the import."

**Keeps the path (inspector state 12).**

"'Create path to style' -- huh? What does 'to style' mean? The description says pressing it
keeps the path and puts it on the left as a row. So it's 'Save path'. Why does it say 'to
style'? I'd have hesitated on that button. I'd probably have pressed it anyway because it's the
only thing that looks like 'keep this'."

"Kept path shows up under 'Sets and paths' on the left, named from its ends. Good. That's the
thing I'd want to hand the case agent: TP53 to SMAD3, saved, I can come back to it."

**Now the Find mock, where the data looks like mine (Find states 1, 10, 11).**

"This one's 'Transfers, April 2026. 3,093 accounts, 8,370 transfers. Directed, weight: amount.'
Now we're talking. Table at the bottom: ACC numbers, kind, community, degree. Merchants on
top, of course -- the merchant always has the most links. That's the first thing I'd filter
out."

"Search box top left. I type ACC-705989. '0 results in all 3,093 nodes. 0 matches in Transfers,
April 2026 (3,093 accounts).' And a button, 'Search recent projects'. Okay -- it's not in April.
That's a real thing; accounts close. I press it."

"'Recent projects: found in 1 of 7. ACC-705989, found in Transfers, March 2026. Open.' That's
nice. That's the 'I've seen this number before, which case was it' problem, and it answered it.
That's worth something to me. I'd want it to tell me what 'Open' does to what I've got open --
does April close? Do I lose my path? It doesn't say. I'd be scared to press it in the middle of
something."

"And -- this is the real task -- if one account is only in March and the other is only in April,
how do I get a path between them? They're in two different graphs. Nothing on this screen tells
me I can put March and April together. I'd have to go back to my Excel and merge the two
returns, then load that. That's the part that eats my afternoon."

**Selection-cap state (7,495 selected on Transfers, March).**

"Just glanced at this one. Hexagons, grey blob. 'Accounts as density.' If I selected half the
graph by accident, okay, it tells me 1,863 nodes, 5,632 edges, 13 of 14 flagged in the mule
ring. That's fine but it's not my question."

## After the task

**Did he answer the question?** On the protein data, yes: start node, Path to, pick the end,
three hops, chain of four. On account data he never saw a path drawn -- the only account screen
is Find, and the account he searched for was in a different month's data.

**Single Ease Question:** 5 of 7.

"The path part is easy. Easier than i2 honestly -- 'Path to' right there with the thing I
clicked, and it tells me in words what to do next. I'd give it higher if the links on the path
told me what they are: amount, date, the record. And if 'undirected' wasn't something it just
announces at me on money data."

**Would he use it instead of his current tool?**

"For 'how is A connected to B', yes, I'd try it, if it runs on our own box and nothing leaves
the building -- I saw 'Assistant: Off. Nothing is sent.' on the left, I noticed that, good. But
not instead of i2 yet. i2 lets me say, on the stand, 'this line is these four transfers from the
Chase return, page 12.' This lets me say 'confidence 0.71'. Until every line carries its record,
it's where I'd find the path, and i2 is still where I'd draw it for the prosecutor."

## Problems observed

1. The found-path result links carry no source, date or amount; the edge inspector shows one
   bare attribute. Cannot say where a link came from. (Severity 3)
2. The path form says "Every shortest path is found and drawn together", but the result shows
   "1 of 12" with a stepper; which is it? The count of equal routes matters to the analysis.
   (Severity 2)
3. "Undirected" is stated in the path form but offers no choice to follow direction; on money
   data he expects to choose. (Severity 3)
4. "Create path to style" reads as a styling action, not "keep this path". (Severity 2)
5. The per-link value in the members list ("confidence") is indented under a node and not
   labelled as belonging to the link between two stops. (Severity 2)
6. "Open" on a match in another project does not say what happens to the project and work
   currently open. (Severity 2)
7. No visible way to find a path between accounts that live in two different datasets (March
   and April). (Severity 3)
8. The To field in the pick bar looks typeable but does not say so; the only stated way to name
   the end is Ctrl+K. (Severity 1)
9. The path-to mocks use protein data, not accounts; he had to translate the task. (Severity 1)
