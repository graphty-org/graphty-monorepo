# What groups are there, and how is the biggest different -- Dana, supply chain risk analyst

**Participant:** Dana Okafor, supply chain risk analyst at an industrial equipment maker. Lives in
Excel and Power BI; has tried Gephi and a Power BI network visual and dropped both. Not a network
scientist. Mild presbyopia; small grey labels are a real problem for her.

**Task as given by the moderator:** "On the protein network, what groups are there, and how is the
biggest one different from the rest?"

**Screens seen, in order:** a finished grouping run open in the left-hand panel, with its run
record popped open over the picture; the same run with its Communities table open underneath; the
style list of a project called "Stress response study", coloured by betweenness; a saved set
("DNA repair") selected, with a "Compare with the rest" button; the node table sorted by
PageRank with one protein (TP53) selected.

Renders the participant looked at:
- `../../../shots/tasks/groups-differ/01-results-panel-louvain.png`
- `../../../shots/tasks/groups-differ/02-results-panel-louvain-table.png`
- `../../../shots/tasks/groups-differ/03-styles-list.png`
- `../../../shots/tasks/groups-differ/04-inspector-set.png`
- `../../../shots/tasks/groups-differ/05-table-dock-ranked.png`

## Think-aloud

**Before starting.** "Proteins. Not my world. I'll pretend they're suppliers and the groups are
something like commodity families. Let's see what it calls a group."

**The first screen.** *Squints at the box in the middle of the picture.* "OK, something's
already open on top of the picture. 'Run record, Louvain.' Method, seed, damping 'does not
apply', normalization 'modularity divided by twice the total confidence of all edges'. No. I'm
not reading that. That's for whoever built it. Close." *Clicks the X.* "Why was that open when I
got here? It's covering half the dots."

"Left side. 'Louvain, Sep 28 09:31' -- I don't know what Louvain is, a place? But underneath:
'Groups, 10 communities'. Right, that's my word, groups. Ten of them. 'Largest 62 proteins.'
'Single proteins 2, no interaction.' Good, that's plain English -- two loners."

"'Modularity 0.716.' 'The file's modules 0.663.' I don't know what those are. Is 0.716 good?
Is it out of one? And 'the file's modules' -- is that a count? A score? It sits right under the
other one so I guess it's the same kind of number for something the file already had. Doesn't
tell me which is better. Skipping."

"The legend down at the bottom: Community 1, 62; Community 2, 43; 3 and 4, 36; '6 more'. Fine,
sorted by size, that I like. Community 1 is the orange-ish one." *Looks at the picture.* "Which
orange? There's the blob at the bottom right with RPL28, and one at the top with MAPK1, and they
both look orange to me. The legend says Community 1 is that yellow-orange. I think it's the bottom
right one, the big one. I'm not sure. Without my glasses those two are the same colour."

**"Communities table."** "There's a link, 'Communities table'. A table. Now we're talking."
*Clicks.*

**The table.** *Leans in, reads row by row.* "OK. This is the screen. One row per group, sorted
by size. 'Full graph: 10 communities, 2 of them a single protein.' Good, it says it in a
sentence."

"Community 1: size 62. Edges inside 232, edges out 93. Density 0.123. log2FoldChange... 'mean,
vs the rest', plus 0.02 versus plus 0.09. Hub AKT1. Module: Ribosome, 56 of 62."

"Let me go column by column, like I'd do with a pivot. Size -- biggest, obviously. Edges inside
232 -- also the most. Edges out 93 -- the most by a distance; next is Community 3 at 63. So it's
the one most tied to everything else. For me that would be the group that, if it goes down, drags
everyone with it."

"Density -- I'm guessing that's how packed it is inside. 0.123. That's the lowest of the real
groups; the others are 0.16 to 0.26. So it's the biggest but the loosest. That's actually a
useful thing to say. Big and baggy."

"log2FoldChange. That's from the file, I assume -- a biology thing. I don't know what it
measures. But it says 'vs the rest', and it's the only column that does that for me, which is
exactly the question. Plus 0.02 against plus 0.09. So whatever it is, this group moved less than
everyone else. Is 0.07 a big gap? No idea. I'd have to ask the biologist. I'd want it to just say
'about the same' or 'lower' next to it."

"Module column, 'from the file; most members'. Ribosome 56 of 62. That's the line I'd trust. It's
checking the tool's grouping against labels that were already in the data. If I did this on my
suppliers and it said 'Asia-Pacific resin, 56 of 62' I'd believe the rest of the table. Every
group lines up with a module except the two loners, which say 'Unassigned 1 of 1'. Fine."

"One odd thing: the hub of the Ribosome group is AKT1, and further down in the other table AKT1
is 'Unassigned', not Ribosome. So the most connected one in the group isn't one of the group's
own kind. Interesting, in my world that's the distributor sitting in the middle of a commodity
family. I'd flag that."

"The little grey words under the headers -- 'proteins', 'inside', 'highest degree', 'from the
file; most members' -- I had to zoom to read them. 110 percent is not enough for those."

**Trying to click the group.** *Clicks the Community 1 row.* "Can I click it and get just those
62? Select them, make a list?" *Nothing happens.* "No. It's a picture of a table. OK."

**Next screen: the style list.** *Pauses.* "Hold on. 'Stress response study.' And the file on the
left is 'ppi-core-300', and everything's brown now, 'Betweenness color'. Where did my project go?
The one before was 'Human protein interactions'. Did I open something else? Did I lose my groups?"
*Scans for the Louvain colours.* "The Louvain colour layer isn't in the list on the right. There's
Betweenness, Hub labels, Size, Base style. So this isn't where my groups are. Betweenness -- that's
the chokepoint one, I know that from a webinar -- but it's not what I was asked. Moving on. This
screen didn't help me and it made me doubt the last one."

**Next: a set called "DNA repair".** "OK, a 'Sets and paths' list on the left. 'DNA repair, rule,
30'. And on the right there's a button: 'Compare with the rest'. That's literally my question.
That's the button I wanted on the Community 1 row."

"But this is DNA repair, 30 nodes, not the big group. How did someone make this set? 'Rule:
module = DNA re...' -- it's cut off. So it's made from the file's module column, not from the
grouping. If I wanted 'Compare with the rest' for Community 1, I'd have to make a set with a rule
'community = Community 1', I suppose. There's a plus next to 'Sets and paths'. I'd try that. I
don't see anything on the table that does it for me."

"Statistics here: edges inside 105, edges out 42, neighbours out 40, average degree 8.4. Same kind
of numbers as the table. No 'versus the rest' though -- that's behind the button, I assume."

"And now the colours are different again. The legend says 'Module color' -- Ribosome is light
blue. Two screens ago the Ribosome group was orange as Community 1. Same dots, different colour,
different legend. I'd lose track of that in a meeting. And there's a black blob at the top that
isn't in the legend I can see -- '4 more'."

**Last: the node table.** "Nodes table, sorted by PageRank. TP53 selected. There's a 'community'
column -- Community 8 for TP53. I could sort by that and count, like a pivot, but I already got
the counts from the other table. Grey bars under 'community' -- I can't read that, it's just
stripes. This screen is about rankings, not groups. 'Export table...' is there, top right. Good,
that's what I'd use for the slide."

**Wrapping up.** "My answer: ten groups. Eight real ones, 29 to 62 proteins each, and two proteins
on their own with no links. The biggest is Community 1, 62 proteins, and 56 of them are Ribosome
according to the file. It's different in that it's the most connected to everything else -- 93
links out, the most -- but it's the loosest inside, density 0.123, lowest of the real groups. And
on that fold-change thing it moved less than the rest, plus 0.02 against plus 0.09, whatever that
means biologically. Its hub, AKT1, isn't a ribosome protein."

## Single Ease Question

**5 out of 7.** "The Communities table answered it, and it was one click from where I started.
That's the good part. I lost a point because I had to do the 'different from the rest' part myself
column by column, one column had a word I don't know, and the big group's colour was the same as
another group's. And a point for the screen that suddenly belonged to a different project -- that
made me doubt what I'd just read."

## Would she use this instead of her current tool?

"No, not instead. My VP looks in Power BI, and IT would have to approve anything that touches the
supplier list -- nobody's told me where the data goes. It says 'nothing has been sent from this
project' at the top, which is nice to see, I'd want IT to see that too."

"But that Communities table is better than what I have. In Excel I can only group by labels I
already typed in. This finds the groups, then tells me how well they match my own labels -- '56 of
62'. That's a real check. If it named the groups from the column instead of 'Community 1', let me
click a row to get a 'compare with the rest' for that group, and put 'higher' or 'lower' next to
the numbers, I'd export that table to Excel every quarter. Of course it needs links between my
suppliers, and past Tier 1 I mostly don't have them. So: a side tool, if IT says yes."

## Observer notes

- She reached the right table in one click from the run panel ("Communities table") and read the
  answer correctly from it: 10 groups, 2 singletons, biggest 62 with 56 Ribosome, most edges out,
  lowest density, fold change lower than the rest.
- The run record popover was open on arrival and covered the picture; she closed it unread and
  asked why it was open.
- "Modularity" and "the file's modules" in the Groups section meant nothing to her; she could not
  tell whether 0.716 vs 0.663 favoured the run or the file, and skipped both.
- She could not tell Community 1 (amber) from Community 5 (vermilion) on the canvas; she guessed
  the right blob but said she was not sure.
- Only one column in the Communities table compares the group with the rest; for the others she
  compared rows by eye. She asked for plain words ("higher", "lower", "about the same") beside the
  numbers.
- She clicked the Community 1 row expecting to select those 62 proteins; nothing happened. When
  she later saw "Compare with the rest" on a saved set she said it was the button she had wanted
  on that row, and guessed she would have to build a rule set by hand to reach it.
- The style list screen showed a different project name ("Stress response study"), a different
  file name and a betweenness colouring; she thought she had switched projects or lost her groups,
  and it lowered her trust in the previous screen.
- The same cluster was amber (Community 1) on one screen and light blue (Ribosome, module colour)
  on another; she said she would lose track of that in a meeting.
- Small grey sub-labels under the Communities table headers were unreadable to her at 110 percent
  browser zoom.
- She read the node table's community-column mini chart as "just stripes".
