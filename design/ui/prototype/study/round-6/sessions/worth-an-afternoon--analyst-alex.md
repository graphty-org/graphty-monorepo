# Is this file worth an afternoon? -- Analyst Alex

Participant: Alex, operations data analyst (Python and NetworkX for the numbers, Gephi for the
picture). Task as given: "A colleague sent this file. Is it worth an afternoon?"
The file: `ppi-core-300-evidence.tsv`, a protein interaction evidence list (one row per source
per pair).

Screens seen, in order, as a participant sees them (design notes hidden):

- `shots/tasks/worth-an-afternoon/01-start-screen.png`
- `shots/tasks/worth-an-afternoon/02-load-step-blocked.png`
- `shots/tasks/worth-an-afternoon/03-load-step-policy.png`
- `shots/tasks/worth-an-afternoon/04-frame-at-rest.png`
- `shots/r6-alex-afternoon-where-data-goes.png` (the "Where your data goes" link)
- `shots/r6-alex-afternoon-first-look-full.png` (the first-look walkthrough, sample data)

## Think-aloud

### 1. Start screen

"OK. 'Open a graph'. First line under it: 'Files stay on this computer. graphty reads them in
this browser and uploads nothing.' Good, that's the thing I look for, and it's right where I'd
open the file. 'Where your data goes' -- I'll click that in a sec.

'Projects are kept in this browser.' Hm. Our Chrome is managed, IT wipes stuff. Park that.

Samples, four of them. Don't care, I've got a file. 'Open...' -- that's me. It's a TSV, not a
CSV. Nothing here says it reads TSV. I'll just try it."

He clicks "Where your data goes" before opening anything.

"Right, a proper page. 'No account and no server that receives your data.' 'Data leaves only
through Connect to data source and the Assistant, both off until you turn them on.' 'Print or
save as PDF' -- I could actually send that to our IT person, that's useful. Exports go through
the browser's save dialog, and it says project files, so I can save a file and not trust the
browser storage. OK, that answers the IT-wipe thing, sort of.

What it doesn't say: who makes this, does it cost anything, what's the licence. That's the
second thing my manager asks. Top bar on the start screen is blank -- not even a name. This
page says 'graphty 2.0', so fine, it's called graphty. Still no idea if it's free."

Time so far: about a minute, most of it on the data page.

### 2. Load step -- first view (two issues)

"'Open ppi-core-300-evidence.tsv'. Format: TSV, tab, header row. OK, it guessed right. Each row
is an edge, ends protein_a, protein_b, undirected. Fine.

'Issues 2' in yellow. Is that blocking? ... Load is blue, so no. Fine.

First issue: 'confidence is read as text: 150 of 2,298 scores are NA.' Yes, that's R output, NA
is how they write missing. The dropdown is nice actually -- each option tells me the edge count:
NA as missing keeps 2,298, leave out the NA rows gives 2,148. That's the kind of thing I'd
otherwise find out in pandas three steps later. I'll take 'Number, NA as missing'.

It shows me the actual NA rows with line numbers -- 29, 31, 44, 52, 64. All coexpression. Is
that all the NAs are coexpression? It shows 5 of 150, so I can't tell. I'd want to know that,
because if one source has no scores, that's the story.

'What will load: nodes 300, edges 2,298.' And '2 proteins have no partner in the file: GSK3B,
NOTCH1. They are loaded unconnected.' That's good. The colleague said 300 proteins; wc -l on
the file would give me 2,299 lines with the header. So both numbers check out before I've even
loaded."

### 3. Load step -- second view (repeated pairs)

"Hang on, now there's a 'Recent' section behind the dialog. 'Human protein interactions (300
proteins), Sep 21'. It wasn't there a second ago on the start screen, and I didn't open that.
Is that someone else's? Is this browser shared? That's the kind of thing that makes me nervous
with company data. Leaving it.

Issues now 1. '865 pairs appear more than once.' Each row is one evidence source. Options:
'Keep each: 2,298 edges' or 'Combine into one: 1,262 edges' -- combine keeps the highest
confidence and drops source.

So 1,262 actual pairs, 865 of them backed by more than one source. That's already half my
answer, honestly: most of the pairs have more than one line of evidence.

Combine keeps the max. I'd want mean, or a count of sources. There's no choice. And it throws
away source, which is the column I care about. So I'd keep each and do the combining in pandas
myself. Same as last time I looked at a tool like this.

Weight row at the bottom: 'confidence, not used yet'. OK -- so it knows confidence is a number
now. Source is 'Category, 4 values' set as 'Edge type'. It did that without asking me. Fine.

Load."

Clicks on the load step for this: format already right, one dropdown for NA, left repeats as is,
Load. Three decisions, about ninety seconds including reading.

### 4. The loaded frame

"Big grey ball with some clusters on the edges. Hairball, but not a terrible one. Labels on 12
'proteins with the most partners' -- MYC, AKT1, UBB, UBC, TP53, HSP90AA1. Most partners
counted how? Rows or pairs? With repeats kept, a protein with three sources per partner looks
three times as connected. It doesn't say.

Top left: 'Nothing has been sent from this project'. Good. Same message as before, consistent.

Right side, Statistics. This is what I actually came for.

- Nodes 300. Matches.
- Edges '2,298 edges (rows)'. And now a separate 'Linked pairs 1,262 linked pairs'. Good --
  that's exactly the confusion I'd have had. Two numbers, each says what it's counting.
- Density 0.0281. Let me check... 1,262 over 300 times 299 over 2 is 44,850... 0.0281. So
  density is on pairs, not rows. Right answer, but I had to do the division to find out which.
  One word next to it would do.
- Connected components: 3 (2 isolates). So one big component plus GSK3B and NOTCH1. Matches
  what the load step told me. Good, the numbers agree with each other across screens.
- Degree distribution -- a tiny bar strip with no numbers on it. Useless at that size. And again,
  degree on rows or pairs?
- Attributes 2. Which two? Presumably confidence and source. It doesn't say.
- '5 more'. Five more what? Not clicking that yet.

Now the part that bugs me. The line at the top of Statistics says: 'Loaded:
ppi-core-300-evidence.tsv, undirected, NA read as missing, repeated pairs kept, no numeric edge
column.' No numeric edge column? I just told it to read confidence as a number, and the load step
said 'Weight: confidence, not used yet'. So which is it? Either the load step is wrong or this
line is wrong. If I'm going to hand a number to someone, I need the tool not to contradict
itself about what it loaded.

Also: I set source as the edge type. Edges are all the same grey. No legend for source. Did
that do anything? Where did it go?

'Overview: General -- Change overview...' I don't know what an overview is here. Skip.
'Style stack' -- no idea, sounds like developer stuff. Skip. 'Evidence rows' is the name of the
graph in the list on the left. Fine, whatever, it's my file.

Background 'Theme'. Layout 'Force-directed' with a play button. OK."

### 5. "Would I get further this afternoon?"

"The real question with this file is: who's the hub, what are the groups, and is the evidence
any good. So -- can I run betweenness from here?

There's a search magnifier next to 'Graphs' on the left... that's probably searching the graph
list, not algorithms. Left rail has 'Results' with a flask. Bottom toolbar now has 'Quick
actions' written on it -- last time it was just a lightning bolt and I missed it. With the words
on it I'd click that. My first click for 'run betweenness' would be Quick actions, and if that
didn't work, Results."

He looks at the first-look walkthrough (the Les Miserables sample) to see what Quick actions
does.

"OK, you type 'who matters most' and it lists Betweenness, PageRank, Closeness, Degree, each with
a one-line meaning. 'Degree -- already shown as size.' Nice. Betweenness says it runs unweighted
because the weight isn't set. That's honest. Result: 'Exact', on 77 nodes, top five with values,
'47 of 77 characters score 0, Valjean alone scores 0.57; next is Myriel at 0.177.' That line is
the slide. I'd check Valjean against NetworkX -- I'm fairly sure normalised betweenness for
Valjean in that dataset is about 0.57, so if that's what it says, fine.

But the walkthrough's start screen isn't the start screen I saw. That one has 'graphty' in the
corner, a drop zone, 'Ctrl+O', and a list of formats. Mine had a blank bar and no formats. And
the right panel is arranged differently -- 'Export +' at the bottom of the panel, which I did not
see on my loaded file at all. Which one is the real app?"

### 6. What's missing for "worth an afternoon"

"Things I'd need before I'd say yes to spending the afternoon in here rather than in Jupyter:

- Communities. Didn't see them anywhere. Quick actions probably does it, but I haven't seen it.
- A CSV of the numbers. The walkthrough shows 'Export +' in the panel; on my own file there's
  no Export anywhere on screen. There's a 'Table' strip at the bottom: '300 nodes, 2,298 edges
  (rows)'. Maybe I can copy out of that. Not sure.
- How many of the 1,262 pairs are single-source vs multi-source. The load step told me 865
  appear more than once, and then that number is gone from the loaded screen. That was the most
  useful fact about this file and it's only on the dialog I closed."

## Answer to the task (in character)

"Is the file worth an afternoon? Probably yes. 300 proteins, 1,262 real pairs, one big component
plus two loners, 865 pairs with more than one source, 150 missing confidence scores -- that's a
usable dataset, not junk. I got that in about three minutes without writing any code, which is
faster than me in pandas.

Is the tool worth the afternoon? Maybe, for this first look. I'd still combine the evidence in
pandas because combine only keeps the max and drops the source."

## Single Ease Question

**5 out of 7.**

"Loading was easy, and the load step actually caught the two things wrong with the file before I
did. I knocked it down for the loaded screen saying 'no numeric edge column' after I'd just set
one, for the Recent project I didn't put there, and for having to work out myself whether
density and 'most partners' are counted on rows or pairs."

## Would I use this instead of my current tool?

"Not instead. Next to it. For 'someone sent me a file, is it any good' -- yes, I'd open it here
first rather than writing the pandas checks, because the counts come out before I load and they
match. For the monthly deck, no, not yet: I haven't seen communities, I haven't seen a CSV export
on my own file, and I still don't know who makes it or what it costs, and my manager will ask
that before anything."

## Observations for the studio (the facilitator's notes)

Problems, most serious first:

1. **The loaded frame contradicts the load step about the weight column.** Load step (after
   confidence set to "Number, NA as missing"): "Weight: confidence, not used yet". Loaded frame's
   state line: "... repeated pairs kept, no numeric edge column." Alex caught it and said it
   costs trust in every other number. (Severity: high.)
2. **The Recent project still appears between two views of the same load step** ("Human protein
   interactions (300 proteins), Sep 21"), on a first visit whose start screen shows no Recent
   section. Alex read it as someone else's work in his browser -- a data-handling worry, not a
   cosmetic one. Also seen in round 5. (Severity: medium-high.)
3. **The edge type chosen at load leaves no trace on the frame.** Source was set as "Edge type"
   (4 values); on the loaded frame every edge is the same grey and no legend or row mentions
   source. "Did that do anything? Where did it go?" (Severity: medium.)
4. **The multi-source count disappears after load.** "865 pairs appear more than once" is the
   most useful fact about this file for the task, and it exists only on the dialog. The frame
   shows rows and pairs but not how many pairs have more than one row. (Severity: medium.)
5. **Rows or pairs is still unstated for density, degree and "most partners".** The new "Linked
   pairs" row fixed the edges count; Alex still had to divide to learn density is on pairs, and
   could not tell what "most partners" or the degree strip count. (Severity: medium.)
6. **The first-look walkthrough shows a different start screen and right panel from the task's
   screens** (graphty name, drop zone, Ctrl+O and the format list; "Export +" in the panel).
   Alex asked which is real. On his own loaded file he found no Export at all. (Severity:
   medium.)
7. **Combine into one keeps only the highest confidence and drops source**, with no mean, sum or
   source count. He kept each and would pre-aggregate in pandas. Also seen in round 5.
   (Severity: medium.)
8. **No word on cost, licence or maker** on the start screen or the data page; the start
   screen's top bar is empty while the load step's shows "graphty". (Severity: medium for this
   persona; it gates his manager's approval.)
9. **The start screen does not say which formats it reads**; he guessed a TSV would work. The
   walkthrough's start screen does list formats. (Severity: low.)
10. **Words he skipped:** "Style stack", "Overview: General / Change overview...", "5 more",
    "Attributes 2" (which two?). (Severity: low.)

What worked:

- "Files stay on this computer ... uploads nothing" at the point of opening, and the "Where
  your data goes" page he could forward to IT as a PDF.
- The NA dropdown showing the edge count each choice loads, and the first NA rows with line
  numbers.
- The two unconnected proteins named before load and matching "3 (2 isolates)" after.
- Separate "Edges ... (rows)" and "Linked pairs" counts -- the exact confusion he expected.
- "Quick actions" now carries its label; it was his first click for running a measure.
- In the walkthrough: one-line meanings for each measure, "unweighted" and "Exact" stated on
  the result, and the "47 of 77 score 0 ... next is Myriel" sentence.
