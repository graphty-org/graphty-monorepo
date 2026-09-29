# Session: who matters most in this network, and how sure are you? -- Analyst Alex

Participant: Alex, operations data analyst at a logistics company. Computes centrality in NetworkX,
draws it in Gephi, pastes into a monthly slide deck. Mild red-green colour deficiency. Company
laptop, Chrome.

Task as given by the moderator: "Your manager wants the people who matter most in this network, and
how sure you are."

Screens: the Results panel (starting in the state the page opens on, then paging through its
states with the arrows in the strip at the top), the Inspector with one protein selected, and the
main window at rest.

Outcome: success, with difficulty. Alex got a top list he would put on a slide, and a "how sure"
sentence for the sampled run. For the exact run he had to build the "how sure" himself by clicking
nodes one at a time in the Inspector.

## Part 1 -- landing on the Results panel

**Opening state (a PageRank run in progress on "Patent citations").** "OK, so something is already
running. PageRank, blue bar, 'Running on WebGPU, under a minute'. I did not start this, but fine,
I'll pretend I did."

"124,318 nodes, 1.48 million edges. That's a real size. Left side is a catalog -- Betweenness
'hours', Closeness 'hours', Harmonic 'hours', Girvan-Newman 'over a day'. Huh. OK, that I like. That
is the exact thing that bit me -- I ran betweenness on the depot network before lunch and it was
still going at three. If it had said 'hours' I'd have sampled it."

"There's a box in the middle -- 'Damping 0.5 has not run. Run queues it after this run.' I didn't
change damping. Or -- did I? It says 0.5 and above that it says 'Values shown: run 1, damping 0.85'.
So the picture is 0.85 and the box says 0.5. I'd leave that alone. Actually I'd be slightly nervous
that I just queued a second PageRank by accident. Not a big deal, there's a Reset."

"My manager said 'people', so I'm expecting betweenness, maybe degree. PageRank is fine too, someone
always asks for PageRank. But I'm not going to wait on this one. Let me see what a finished one
looks like."

(Moderator note: the participant used the arrows in the strip at the top to move through the
states, treating each as the next thing the app would show.)

## Part 2 -- the sampled betweenness (patent network)

**Finished, sampled.** "Betweenness (sampled). 'Sampled, 50 sources'. OK so it did what I'd have
done by hand in NetworkX, the k= thing. Good."

"Top nodes: number one 5879702, about 0.0160. Number two 5902311, about 0.0037. Then '#3 to #7',
'#3 to #7', '#3 to #7'. Oh. Oh, that's nice. So it's telling me it can't tell those three apart.
And then a line: 'Ranks below #2 may swap between runs.'"

"That -- honestly that is the sentence. That's the 'how sure'. I can say to her: the top two are
solid, the next five are a tie on this estimate. I have never had a tool say that to me. NetworkX
just gives you a number with nine decimals and lets you embarrass yourself."

"The first one is way out ahead -- 0.016 versus 0.0037, four times the next one. So the top node is
not in doubt. I'd want to say that in words though, and the tool doesn't say it. I'm reading it off
the numbers."

"IDs are patent numbers, which, fine, that's the data. In my case they'd be depot names."

"'Details' -- clicked. A run record. Method: 'Brandes betweenness from 50 random sources, scaled up
by 124,318 / 50'. Seed 7. 'Error bound: plus or minus 0.00035 on each value, 95 runs out of 100.'
OK, '95 runs out of 100' I can read out loud. 'Normalization divided by (n-1)(n-2)/2' -- that's
more than I need but my lead will want it. And there's a Copy button. That goes straight into the
methods note at the bottom of the slide. Good."

"'Direction: Citations read as undirected.' Hm. Citations have a direction. Is that right for
betweenness? I don't know. I'd probably leave it because it's what it picked, and if somebody asks
I'll say 'the tool treated it as undirected'. That's a bit of a cop-out and I know it."

"'Distribution: zero, about 79,554 nodes.' So most of the network is nobody. That's actually a
useful sentence for a manager too."

"Bottom right -- '124,318 nodes not drawn: more than this browser draws at once.' So there's no
picture. For 'who matters', I don't need the hairball, I need the list. That's fine. For the deck
I'd need a picture of something, but that's another day."

"'Compare with...' -- I'd click that, I want to see if PageRank agrees with betweenness. [clicks]
... Nothing. Nothing opened. OK. Maybe it's not built. That's what I actually wanted, though."

## Part 3 -- the exact betweenness (protein network)

**Finished.** "Different network now -- 300 proteins. Fine, smaller, it ran exactly. 'Exact' with
an (i). Hover: 'Computed on every node, not estimated. It does not say the ranking is meaningful.'"

"...Well, then what does? That's a fair thing to say but it leaves me holding it. With the sampled
one it told me how sure. With this one it's 'exact', so the numbers are right, but my manager's
'how sure' is really 'would a different measure give you a different list'. And for that I'm on my
own."

"Top nodes: MAPK1 0.1379, TP53 0.1139, YWHAZ 0.0695, CDK1 0.0687. The list gets cut off after four
-- I have to scroll inside this little panel. The list is the answer and it's at the very bottom,
under Scope, Weight, Appearance, the histogram. I'd rather it was the first thing."

"YWHAZ and CDK1 -- 0.0695 and 0.0687. Those are basically the same. In the sampled one it would have
said '#3 to #4'. Here it says 3 and 4 flat, because it's exact. Technically right. But if I put
'YWHAZ is third' on a slide and someone reruns it with degree, CDK1 is ahead. I'd want the tool to
nudge me that 3 and 4 are neck and neck."

"The graph is painted by it -- dark brown is high. Legend: 'Log scale; the 10 proteins at 0 take
the lightest colour.' Orange to brown, one colour, so I can actually read it. No red-green mud.
Good."

**The table.** "'295 more in the table' -- clicked. Now a table at the bottom. id, module, degree,
betweenness, betweenness rank '#1 of 300'. And the degree column is right there. MAPK1 degree 34,
TP53 32, YWHAZ 24, CDK1 25. So by degree, CDK1 beats YWHAZ. Ha. There's my neck-and-neck."

"'Export table as CSV...' -- good, that's the Excel handoff. I'd do the agreement check in Excel,
honestly. Sort by degree, sort by betweenness, eyeball the top ten. That's what I do now."

**The other answer (colour off).** "Same result, the graph is grey now, 'not shown' with the eye
crossed out. So running it and painting it are separate. I prefer it painted by default, which is
what I got before. Fine."

## Part 4 -- the Inspector

**One protein selected (TP53).** "Click TP53. Right column: module DNA repair, degree 32 '#2 of
300', betweenness 0.1139 '#2 of 300', pagerank 0.01137 '#2 of 300'."

"Oh. This is what I wanted from 'Compare with'. Three measures, same rank. So TP53 is second
whichever way you cut it. That IS the 'how sure' for an exact run -- the measures agree. If I
clicked MAPK1 I'd presumably get #1, #1, #1."

"But I had to click one protein at a time to get that. For ten proteins that's ten clicks and a
notepad. What I want is that little '#2 of 300' stack for the whole top ten, in one place, and a
line that says 'the top two are the same by all three measures; below that they disagree'. Then I'm
done."

"Also -- on the full Inspector page, the right edge is cut off. 'DNA repa', '#2 of 30'. In the
close-up it's fine. Might just be the page."

"'32 neighbours'. 'Memberships: 2 sets'. Not what I'm here for, but fine."

## Part 5 -- the main window at rest

"Les Miserables. OK, the classic. 'This browser. Nothing sent.' under the name -- good, I remember
that from last time. Statistics: 77 nodes, 254 edges, 2 components, 1 isolate. That's the check I
do first against SQL. Good that it's just there."

"Results on the left rail. If I started here I'd go Results, then find Betweenness in the catalog.
I think I'd find it. There's no 'who matters' button and I wouldn't expect one."

## Wrap-up

**What would you tell your manager?** "On the patent network: one node is clearly on top, about
four times the next; the second is solid; three to seven are a tie on this estimate, 95 times in
100. On the proteins: MAPK1 and TP53, by betweenness, and they're also one and two by degree and
PageRank, so I'm confident about those two. After that it depends which measure you pick. I'd paste
the run record into the notes."

**Single Ease Question: 5 of 7.** "The sampled one practically wrote my sentence for me. The exact
one made me do the cross-check by hand, clicking nodes, and the button I thought would do it did
nothing."

**Would you use this instead of what you use now?** "For this question -- maybe. The runtime
warnings in the catalog and the '#3 to #7' ranges are things NetworkX will never give me, and the
run record with a Copy button is my methods footnote done. And it doesn't send anything, which
matters. But I'd still export the CSV and do the 'do the measures agree' part in Excel until
'Compare with' actually does that. So: I'd try it on the next one, side by side with my notebook,
not instead of it yet."
