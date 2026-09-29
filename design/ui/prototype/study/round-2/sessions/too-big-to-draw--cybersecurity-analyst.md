# Session: a graph too big to draw -- Priya, threat hunter

Participant: Priya, senior threat hunter at a regional bank (persona file:
`study/personas/cybersecurity-analyst.md`). Played in character.

Task as given by the moderator: "Here is last period's citation data. Find anything worth a closer
look."

Screens used, in order: past-drawing-limit (not drawn, offered steps, rule editor, filtered and
drawn, sample, no-WebGPU), find (id pasted past the drawing limit, a verb typed into Find), filter
chip (three steps, editing a step).

## Transcript

**Before anything.** "Okay, first three questions. Is this approved, where does it run, does it
phone home? ... I see 'Assistant: Off. Nothing is sent.' on the left rail. That's about the
assistant, not the app. Doesn't tell me whether my file left the laptop. In a real trial I'd stop
here and ask. It's a study, so I keep going."

"Also -- citation data? This is patents, not auth logs. Fine. It's a graph of who points at who.
Same shape as logons: source, target. I'll treat a citation like a logon and look for the weird
stuff."

**Not drawn (first frame).** "Big box in the middle: '124,318 nodes not drawn. More than this
browser draws at once (50,000).' Good. It didn't go white, it didn't spin, it told me the number
and why. That's honestly the thing BloodHound never did. I'd take this over a crash every day."

"Table underneath, sorted by citationsReceived, highest first. That's my Splunk view. Top one is
6,117,075 with 779. Okay."

"'Last period' -- which period? grantYear says 1999 to 2001. Is that the period? There's no time
range anywhere on the screen. No picker, nothing in the chip, the chip just says 'Full graph'. If
my lead asks 'what time range is this' I'm reading it off a column header. Not great."

"Statistics on the right. Components 3,912. One is 116,905 nodes, 94 percent. Then 41 nodes, 23
nodes, 19 nodes. That's what I'd look at. In a logon graph a little island of 41 accounts that only
talk to each other is exactly the thing worth a closer look. So: can I click '41 nodes'?"

(Reads the prototype: a click on the isolates count opens those rows in the table. Nothing says
the component rows do the same.)

"The isolates count opens its rows, so I'm guessing the 41 does too. If it doesn't I'm stuck --
there's no other way to say 'give me the second-biggest island'. The filter steps later only offer
'Largest component'. I want the small ones, that's where the anomalies are."

"Wait, the counts in this list. 2,406 single nodes, then '3,905 more'. Four listed, plus 2,406,
plus 3,905 -- that's way more than 3,912. In the other frame it says '3,908 more, each 19 nodes or
fewer' and the isolates are a separate line. So one of those is wrong. That's the kind of thing I
catch in the first minute and then I stop trusting the panel."

**Narrow the graph... (filter steps popover).** "Click the blue button. 'Filter steps. No steps
yet.' Offered: 'Largest component, still too many to draw, 116,905' -- greyed out. 'Top 3 by
degree, with neighbors, a sample: favors hubs, 2,041.' At least it says it's a sample and it's
biased toward hubs. Most tools just hand you the hubs and let you think that's the network."

"'Your rule.' Two dropdowns and a box. category is Drugs and medical, citationsReceived >= 25. Six
hundred twelve nodes, 1,904 edges, will draw. Okay, it tells me before I commit whether it'll draw.
That's useful, I hate running a query to find out it's too big."

"Where do I type it though? This is the dropdown builder. I'd write `category == 'Drugs and
medical' AND citationsReceived >= 25` in about four seconds. Can I see it as text? Can I paste
one? I don't see a box. I'll use the dropdowns. Grudgingly."

**Rule editor (full).** "Bigger version. Keep Nodes / Edges, Where, AND/OR, Add condition. Scope:
'Full graph, no steps above.' Result: 612 nodes, 1,843 edges. ... Hang on. The little popover
said 1,904 edges. This one says 1,843. Same rule. Which is it? Sixty-one edges don't vanish between
two screens of the same query."

**Filtered and drawn.** "Filter to. Chip says 'Filtered: 612 of 124K nodes, 1 step'. Toast:
'Filtered to 612 of 124,318 nodes, Undo.' Fine. Canvas draws a gray hairball with a column of tiny
bits on the right. Labels are patent numbers on the hubs. The picture doesn't tell me anything the
table didn't, honestly. The Statistics does: 44 components, 545 in the big one, 31 isolates. Edges
'1,843 of 1,480,221'. So 1,843 wins, I guess."

"ForceAtlas2, Engine: WebGPU. I don't care where the dots sit. Moving on."

**Sample route.** "Tried the 'top 3 by degree' one. Three starbursts. The stats say 'Describes a
sample: top 3 by degree, with neighbors. It favors hubs, so density and clustering read high' and
density has a tag 'sample, reads high'. Good. That's honest. I'd screenshot that and nobody would
misread it. But it's also the least interesting thing for me: the hubs are the famous patents, not
the anomalies."

**No-WebGPU frame.** "My laptop, probably -- managed Edge, maybe acceleration off by policy.
'ForceAtlas2 on the CPU: this browser has no WebGPU.' Plain, no nag. I like that it just says it.
But this frame says 612 nodes, 1,904 edges, components 1, and the table header says category '6
values', citationsReceived '0 to 779'. The drawn frame says 44 components, '1 value', '25 to 779'.
Same filter. If I got these two on two different laptops I'd assume the tool is broken."

**Find.** "Ground truth check. Ctrl+F opens Find, good, that's the first thing I tried. I pasted
three ids -- 6,117,075 6,231,106 6,287,586 -- and got '3 results in all 124,318 nodes'. Pasting a
list of IOCs and getting all of them back is exactly what I do. The inspector says 'Not drawn: the
graph is past the drawing limit. Counted everywhere.' Fine, I don't need them drawn, I need them
found."

"Can I pivot from here? There's a little branch icon and a filter icon on the inspector header. I
guess the branch one is neighbors. Nothing tells me what it'll pull in or how many before I click.
If it's the Sentinel thing where one click gives me two hundred entities, no thanks."

"Tried typing 'betweenness' into Find. '0 matches, Commands: Run Betweenness centrality... in Quick
actions.' Okay, cute. Would I use it? On 124K nodes, is that going to run for dozens of minutes?
It doesn't say."

**Filter chip, three steps.** "Now it's Les Miserables? The chip popover lists 'Filter to Largest
component 76, Filter to degree >= 5 41, Filter out group = 8 28'. That I like -- each step with its
count. That's my search history, basically, like the notebook. Editing a step shows 'Scope: after
step 1: 76 nodes. Result: leaves 41; takes out 35.' Good. Counts before I commit."

"But can I save this list and run it on next month's file? I see 'The barricade -- rule -- 13'
under Sets and paths, so maybe a rule can be saved as a set. It doesn't say it'll re-run on a new
import. And can I get the 612 rows out as a CSV? 'Export...' top right, and a '...' on the table.
Neither says CSV. I'd have to click and hope."

## What I found

"Worth a closer look: the islands. 41, 23 and 19 patents that don't connect to the main body. And
maybe the 41,873 that nobody cites -- no, that's normal for patents. The islands. I got to them by
reading the Statistics panel, not by the filter builder, because the builder can't say 'second
component'. I'd put that in the case notes with the component sizes -- if I trusted the counts,
which I half don't."

## Single Ease Question

4 of 7. "Didn't fall over, told me why it wasn't drawing, and the rule preview is nice. But I
spent more time second-guessing numbers than hunting."

## Would I use it instead of my current tool?

"No, not instead. Next to, maybe, for the first look at a big dump, because it counted everything
and didn't die. Instead of Splunk and my notebook? It'd need a box I can type the query into, a
time range on every number, a CSV of the matches, and a saved rule that re-runs next month. And the
same filter has to give the same edge count on every screen. That last one's non-negotiable."
