# Session: the quiet weight trap -- Jordan, marketing network analyst

Task as given by the moderator: "The Les Miserables edges carry a number. Rank
the characters, then tell me whether you trust the ranking and why."

Screens used: the weight-role-trap screens in order (load, the Betweenness run
form, its answer list, the result, changing the answer, the re-run), plus the
result view and table from the results-panel, run-and-read and table-dock
screens (those show a protein dataset, not Les Miserables; used only to see
what a finished result and the table look like). Played at 1440 by 900.

## Think-aloud

**1. Dropping the file in (the Open miserables.json dialog).**

"OK, drag it in. It tells me what it read before it commits: JSON, 77 nodes,
254 edges, undirected, zero isolated. That's my usual first check, so, fine.

Then a box: 'Edge attribute value -- whole numbers, 1 to 31; most edges 1 to
3', and a little bar chart. And a line: 'A measure that reads value asks, each
time it runs, what a bigger value means.' OK. So it's not asking me now. Good,
because I have no idea what 'value' is -- the file just calls it value.

Honestly the bar chart is the only thing in there I'd look at twice: most
edges are 1 to 3, a few big ones. That looks like counts. Mentions look like
that. Load."

**2. After load (the graph, the right-hand panel).**

"It's called Co-appearances now, not Untitled. And on the right under
Statistics: 'Weight -- value, shared scenes, 1 to 31'. Oh. So value is shared
scenes. That's the thing I didn't know a second ago. Where did it get that
from? Presumably the file says it somewhere. Fine, I'll take it.

The table underneath is sorted by degree: Valjean 36, Gavroche 22, Javert 17.
There's an empty betweenness column already sitting there, which I guess is
waiting for me. The groups are just numbers -- 2, 8, 4, 1. 'Group 2' means
nothing to me. If this were my data I'd want names on those."

**3. Finding the ranking (the Catalog).**

"Where's 'find influencers'? There isn't one. Catalog, Centrality:
Betweenness, Closeness, Harmonic centrality, PageRank, Eigenvector. Algorithm
names. I can live with it because I know what I want -- the connectors, the
people between groups -- so, Betweenness. If I were my manager I'd be lost
here. The little 'i' next to each one is presumably the explanation. I'd
hover it if I didn't know."

**4. The run form.**

"It opens a small box. Scope: Full graph, 77. Weight: value -- already picked
for me. Then 'In this run, a bigger value means:' and 'Choose...'. And the Run
button is greyed out, with a tooltip 'Choose what a bigger value means first'.

OK, I actually like that it won't let me skip it and it tells me why it's
greyed. Gephi would have just run.

But hang on -- Weight is already set to value. I didn't ask to weight
anything. Do I have to? Could I just run it plain? The box doesn't say. I'll
assume if it's there it should be used."

**5. The answer list.**

"Two options.

'a longer or costlier step -- Distance = value.'
'a closer or stronger link -- Distance = 1 / value, such as a count of shared
scenes.'

I'm skipping the formula bits, I don't do formulas. But the second one
literally says 'shared scenes', and the panel on the right just told me value
IS shared scenes. So it's that one. More scenes together is a stronger
relationship. That's how I'd think of mentions too -- more replies, closer.

Why is it talking about distance at all? I asked for betweenness, which in
my head is 'who sits between the groups'. I don't think of it as distances.
I picked the right one because two bits of text happened to match, not
because I understood what 'costlier step' would do to the ranking.

Also, the first option was highlighted when the list opened. If I'd been
clicking fast and hit enter I'd have got that one. Just saying."

(Jordan chose "a closer or stronger link". Her reason was the matching words
"shared scenes" on the option and in the Statistics panel, not the
conversion line.)

**6. The result.**

"Ran instantly. Under Runs: 'Betweenness 10:15, Run 2. Distance = 1 /
value'. The run line says how it read the number; I'll remember that. The
table is now sorted by betweenness: Valjean 0.795, Marius 0.499, Myriel
0.224, Fantine 0.193, Courfeyrac 0.177, Thenardier 0.172, Gavroche 0.102.

Sanity check: is the big name on top? Valjean, yes. He's the main character,
if he wasn't first I'd bin it. Marius second -- he's the young guy who bridges
the student revolutionaries and Cosette's side. That makes sense to me as a
connector. Gavroche is way down at 0.102 even though his degree is 22, second
highest. That's actually the kind of thing I want: 'lots of contacts is not
the same as sitting in the middle'. That's my whole pitch to the VP.

And the degree column sits right next to betweenness, so I can see that
straight away without making another sheet. Good."

**7. The moderator asks: do you trust it?**

"Mostly. But the way I'd check is: what happens if I'd picked the other
answer? Because I just told you I don't really understand the two options.
If the list barely changes, I don't care. If it changes a lot, I need to know
I picked right.

So I open the run again. Same form, my answer is filled in: 'a closer or
stronger link'. I switch it to 'a longer or costlier step' just to see. The
run in the list goes 'Out of date' with a little warning sign, the column
header in the table says 'Out of date' instead of the range, and the button
says 'Re-run (keeps Run 1)'. And it kept showing the old numbers until I
pressed it.

That I like. A lot. Talkwalker would have silently swapped the numbers and
I'd have had the old ones in a deck. And 'keeps Run 1' -- good, I don't lose
the one I had.

Re-run. Now the other reading: Valjean 0.454, Gavroche 0.285, Javert 0.193,
Myriel 0.177, Thenardier 0.129, Fantine 0.114, Mabeuf 0.089.

Whoa. OK. So Marius is gone from the top seven, Javert is third, Gavroche is
second. And -- this is the scary part -- this one ALSO looks right. Valjean
on top, Javert the guy who chases him, sure. If I'd picked this one first I
would have passed my own check and shipped it.

So do I trust the first one? I trust it more, because of one thing: the
option said 'such as a count of shared scenes' and the data says value is
shared scenes. That's a chain I can say out loud: more scenes together means
a closer tie, so I told it closer. I don't trust it because the numbers look
right. Both looked right."

**8. Comparing the two runs.**

"Now I've got two runs in the list, Run 1 and Run 2, each with its
'Distance = ...' line. The table only shows one betweenness column at a
time. I want them side by side: rank in run A, rank in run B, who moved. Where
did Javert go? I'd have to click back to the other run and scroll.

In the result view on the other screen (the protein one) there's a 'Compare
with...' under 'Runs of this measure', so I assume that's where it would be.
I'd click it. And on the table screen there's a 'Compare rankings...' link
and rank columns with '#1, #2'. If I get that here, with a 'moved from 10th
to 2nd' column, that's the slide.

Also, the scores: 0.795 in one run and 0.454 in the other for the same guy,
both 'normalized'. I'm not explaining that to anyone. I'd put ranks in the
deck, never the decimals."

**9. Off topic, but.**

"This is exactly our listening-export problem. The vendor exports an edge
number and calls it 'weight', and in one export it's replies and in the next
it's some 'affinity' score, and nobody tells you. Half the time the column
isn't even labelled like 'shared scenes' is here. With my data that right-hand
panel would probably just say 'weight, 1 to 400' and I'd be back to guessing.
The Twitter pipeline used to at least tell you what a retweet was."

**10. Hand-off.**

"The run line 'Distance = 1 / value' is what I'd need to go in the CSV
next to the scores, otherwise the file on the drive looks identical to the
wrong one. On the table screen there's 'Export table...' at the top right; on
this one there's just a '...'. I'm assuming it's in there. Didn't check it
today. And 'Distance = 1 / value' is not a label I'd put on a slide. 'Counted
closer when they share more scenes' -- that I would."

## Answer to the task

**Ranking (value read as a closer or stronger link):** Valjean, Marius,
Myriel, Fantine, Courfeyrac, Thenardier, Gavroche.

**Do I trust it?** "Yes, with a reason I can say out loud: value is shared
scenes, more shared scenes is a stronger tie, and I told the run 'stronger
link', and the run line says so. I don't trust it because it looks right --
the other reading looked just as right, and my usual check, is the big name
on top, passed both times. What I'd still want: the two runs side by side
with who moved, so I can show I checked."

## Single Ease Question

**5 out of 7.** "Getting a ranked table was easy and it wouldn't let me run
without answering, which saved me. Knowing which answer to pick was only easy
because the file happened to say 'shared scenes' and the option happened to
say it too. With my own data that match won't be there. And checking the
other reading cost me a re-run and then flipping between runs by hand."

## Would I use this instead of my current tool?

"For the ranking step, probably yes over Gephi. Gephi uses the weight however
it uses it and never tells me. This makes me say what the number means, puts
that on the result, and flags 'Out of date' instead of quietly changing the
numbers under me. That's the difference between a list I can defend and one I
can't. Instead of Brandwatch? No -- that's where the data comes from, this
would sit after it. Before I'd put it in front of my VP I'd need: a task word
to start from instead of algorithm names, the two readings side by side, names
on the groups, and a CSV that carries which reading it used."

## Moments worth noting (in her words)

- "It won't let me run until I answer, and it tells me why the button is
  grey." The disabled Run with its reason was welcome, not an obstacle.
- "It said 'shared scenes' on the right, and the option said 'shared scenes'.
  That's why I picked it." The right answer came from matching words, not from
  the conversion line; she skipped both "Distance = ..." formulas.
- "With my data that panel would just say 'weight, 1 to 400'." The
  matching example only works when the column already carries a description.
- "Why is betweenness talking about distance?" The word distance does not
  connect to her idea of betweenness as "who sits between groups".
- "I didn't ask to weight anything." Weight arrived already set to value, with
  no visible way to run it unweighted from what she read.
- "The first option was highlighted when the list opened." A fast enter would
  have picked the wrong reading.
- "Out of date, keeps Run 1, didn't redo it behind my back -- good." Liked
  strongly.
- "Both readings looked right. My check passed both times." Checking a known
  name on top does not catch a wrong reading.
- "Where did Javert go?" No side-by-side of the two runs on this screen; she
  would look for "Compare with...".
- "0.795 in one, 0.454 in the other, same guy." She would report ranks only.
- "'Group 2' means nothing to me." Numeric group labels.
- "'Distance = 1 / value' is not a slide label." She wants the reading in
  plain words on the export and the slide.
