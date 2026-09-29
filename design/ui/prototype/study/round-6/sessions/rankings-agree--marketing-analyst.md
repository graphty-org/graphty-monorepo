# Do these two ways of scoring agree on who matters? -- Jordan, marketing network analyst

Task as given by the moderator: "Do these two ways of scoring agree on who matters?"
Starting point: the Results place on the left rail, where Compare with... now lives.

Screens seen, all at 1440 by 900:

- Results place with the compare menu open: `shots/screens__results-panel--compare-with.png`
  (study render: `tmp/rankings-agree-jordan/rp-compare.png`)
- The comparison, scatter and differences: `shots/tasks/rankings-agree/01-comparison.png`
  (every state, full page: `tmp/rankings-agree-jordan/comp-full.png`)
- The table dock with rank columns: `shots/tasks/rankings-agree/02-table-dock-large.png`

## Think-aloud

**1. The Results place.**
"OK, 'two ways of scoring' -- so two influence scores. In my world that's the follower-count
one versus the 'who sits between groups' one. I click Results because that's the only word here
that sounds like scores. There's a list: PageRank twice, Betweenness (sampled), Weakly connected
components. Fine, those are the runs. Good that it keeps both PageRanks with the date, I've been
burned by tools that just overwrite."

"Where's compare? ... There's a little icon on the right of the top row, the two arrows. No
label. I only see it because that row's highlighted. If you hadn't told me 'Compare with' was on
this rail I'd have hovered over everything first. I clicked it on a hunch."

**2. The compare menu.**
"'Earlier runs of PageRank' -- no, I don't care about damping, whatever that is. 'Other runs on
this graph: Betweenness (sampled), 101 sources.' That's the one. PageRank against betweenness,
that's the influence-versus-bridges question. I pick that."

"Small thing: this says betweenness is sampled here, and when the comparison opens it says
'Exact'. Different graph in your mocks, I think -- patents on one, payments on the other -- so
I'll let it go, but if I saw 'sampled' become 'exact' on my own data I'd stop and ask which one
I've got."

"Also, on another version of the menu, from the Compare with... button on the PageRank result,
Betweenness says 'Not run'. So if I click that does it run it? Does it just sit there? I'd click
it and hope. Not the end of the world."

**3. The comparison opens.**
"Oh, OK. It's a scatter in the bottom, and the map shrank to the top half. On my laptop the map
is now a strip, but honestly for this question I don't need the map, I need the answer, so fine."

"Right side of the scatter, big text: '0 of the top 50 in both. The rankings disagree at the
top.' ... That is the answer. That's the sentence. I'd put that on the slide nearly word for
word. Zero out of fifty. So the two scores are picking completely different people."

"Top 5, 10, 20, 50, 100 -- 'At the other lengths: 0 of 5, 0 of 10, 0 of 20, 18 of 100.' That
line is tiny and grey, and it's actually the interesting bit -- they only start overlapping at a
hundred. I nearly missed it."

"Then 'Spearman 0.40, leaving out the 1,153 accounts tied at the bottom of both (0.78 with
them).' Two numbers. Which one do I put in the report? My VP will see 0.78 and say 'so they
basically agree'. I opened the little i: it explains that the bottom ones agree only because
both give them nothing, so the first number is fairer. OK, I buy that, I think. But I know
myself: I'd quote the 0.40 and someone on the data team would say 'why did you drop 1,153
accounts?', and I'd have to paste this paragraph. Honestly I'd leave Spearman off the slide and
use the zero-of-fifty."

**4. Reading the scatter.**
"Rank on PageRank across, rank on betweenness down, rank 1 at the top left. So up-and-left is
good. Took me a second; I expected 'good' to be up-and-right like every chart I make. The dashed
line is 'same rank on both'. Above the line, betweenness likes them more; below, PageRank likes
them more. The legend says it in words, so fine."

"Most of the dots are in the bottom right and sort of on the right side -- basically nobody at
the top of both. The top-left grey box, top 50 of each, is empty except for the circled one,
ACC-139419, which is #1 on betweenness and #76 on PageRank. That's my bridge person -- 'number
one connector, but not a big name'. That is exactly the micro-creator-at-the-bridge story."

"The dots are very small and light grey. On a projector that's going to be fog. And the shaded
top-50 box is a very light grey on a lighter grey. Printed in greyscale, gone."

**5. The Differences list on the right.**
"'Ranked higher by: Betweenness | PageRank'. Betweenness is on. The list: ACC-139419 #76 / #1,
ACC-701495 #316 / #2 ... these are the connectors PageRank doesn't rate. That's my shortlist for
'people between groups'. I click PageRank on the toggle -- the other version shows ACC-393859
#1 on PageRank and #1,780= on betweenness. Wait. The number one PageRank account is tied for
last on bridging? So the 'most influential' by the famous score connects nothing to anything.
That's a good slide. That's the 'follower count is a vanity metric' slide, with a number."

"'Create set' and 'Add note...' on the row -- fine. I'd want 'Create set' on the whole top 20
of this list, not one row at a time, but I didn't look hard."

**6. Getting it out.**
"Export table... top of the dock. The dialog: Table (.csv), every account with both scores and
ranks, and 'Nothing is uploaded, 2 files go to your Downloads folder'. Good -- that's the thing
I always have to ask about. There's also Figure (.svg) and Image (.png). I'd want the scatter
with the 'zero of the top 50' sentence on it. I can't tell if the figure includes the Agreement
text or just the dots. If it's just dots, I'm back in PowerPoint typing the caption."

"What I really want exported is the Differences list -- 'ranked higher by betweenness, top
100' -- not all 3,093 rows. With the whole table I'd sort in Excel anyway. That's the Excel step
I was hoping to skip."

**7. The table dock.**
"Switching to Table. Now it's a different file -- 'March transfers, 3,000 nodes' -- and above
the rows it says 'The top 10 are the same on both measures, led by ACC-393859.' ... Hang on. I
just read 'zero of the top 50 in both'. Now 'the top 10 are the same on both'. Which both? It
doesn't say which two measures. I think the columns here are degree and PageRank, not
betweenness, but the sentence doesn't name them, and I'd have to scroll right to find out.
That's my 'dashboard says 4,000 and the download says 3,100' moment. If I pasted this line
into the deck thinking it was the same comparison, I'd be flat wrong."

"The 'Compare rankings...' link next to it is half covered by the column menu in this shot, but
I guess that takes me back to the scatter."

**8. Drift.**
"Also, this is bank transfers, not creators. I get the idea, but the day I load a real mention
export, half the top accounts will be bots, and neither score knows that. That's not your
problem, it's Brandwatch's export, but it's the first question my VP asks."

## The answer she would give

"No. They don't agree at the top. None of the top 50 accounts by one score are in the top 50 of
the other; they only start overlapping at 100 (18 of them). The number-one connector is #76 on
PageRank, and the top PageRank account is tied for last on connecting. If you want reach, use
one; if you want bridges, use the other -- they give you different people."

## Single Ease Question

**5 out of 7.**

"The answer was right there in a sentence, and that's rare. What cost me: the compare button on
the rail is an unlabelled icon I found by guessing, the two Spearman numbers invite an argument
I'd rather not have, and the table's 'top 10 are the same on both measures' line nearly made me
say the opposite of the truth because it didn't say which measures."

## Would she use this instead of her current tool?

"For this question, yes -- probably. Today this is two sorted columns in Excel, a VLOOKUP, and
me eyeballing the overlap, and I'd never get the 'zero of fifty, eighteen of a hundred' line
without a pivot table. Brandwatch can't do it at all; it gives me one influence score and
that's that. So this saves a real half hour. What stops it being a full yes: I need the
Differences list as a CSV on its own and a picture with the sentence on it, not just the dots.
If the export gives me that, I'd switch for this job."
