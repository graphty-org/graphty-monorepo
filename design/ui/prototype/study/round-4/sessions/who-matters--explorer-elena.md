# Session: "who matters most to the story, and how sure" -- Explorer Elena

Participant: Elena, 34, product manager at a B2B software company. No graph training. Uses Google
Sheets, Slides charts and her company's analytics dashboard every day. Says "dots", "lines",
"groups", "the big ones". Has seen the Les Miserables musical once; has not read the book.

Clock: curious afternoon (no deadline, tolerates three or four dead ends).

Moderator task, as given: "You have the Les Miserables co-appearance network open. Find the few
characters who matter most to how the story hangs together, and tell me how sure you are of their
order."

Screens used, as she saw them:

- the main window with Les Miserables open, at rest, table under the graph sorted by degree
  (shots/screens__navigation-frame-new-annot.png, with the numbered notes hidden from her);
- the older at-rest window with the Statistics block and an empty Results heading
  (shots/screens__frame-at-rest.png);
- Valjean clicked, table sorted by betweenness (shots/screens__navigation-frame-new-node.png);
- the table with Degree and Betweenness side by side and the "Compare rankings..." sentence
  (screens/table-dock.html, the "Small graph: 77 characters" state);
- the Betweenness result panel for Les Miserables, which turned out to be on a filtered graph
  (shots/screens__results-panel--filtered.png);
- the main menu's Algorithms list and the Quick actions box (shots/screens__results-panel--catalog.png,
  shots/screens__results-panel--quick-actions.png), both drawn on other datasets;
- the Betweenness panel and the ranked three-measure table, both drawn on a protein network
  (shots/screens__inspector-result.png, shots/screens__table-dock-ranked--study.png);
- "Compare rankings...", which opens a payments network (shots/screens__comparison--study.png).

Where a screen shows a different dataset, the moderator said: "that part of the mock is drawn on
other data; pretend it's Les Miserables." What she made of that is recorded as she said it.

## Think-aloud

**At rest, first look.** OK. Les Miserables. So these are the characters? The dots are people.
... The big orange one in the middle is Valjean, that makes sense, he's the main guy. Then there's
a bunch of big light-blue ones at the bottom -- Marius, Gavroche, Enjolras. That's the students,
the barricade, I remember that from the musical.

"Matter most to how the story hangs together." Hm. So the ones in the middle? Valjean is literally
in the middle. Javert's right next to him. So I'd say Valjean, Javert... and then Marius because
he's where all the lines go down to the blue bunch.

(She points at the legend.) What's "Group color, 2, 8, 4, 1"? Is 2 like... second tier? Orange is
"2" and Valjean is orange, so maybe orange is the important group and the numbers are... no. 14,
13, 11 -- those are how many are in each one. OK so 2 is a group name. That's a weird name for a
group. I'll ignore the colours.

(She reads the table under the graph.) Oh nice, there's a table. "Full graph: 77 nodes. Sorted
by degree." Valjean 36, Gavroche 22, Marius 19, Javert 17, Thenardier 16, Fantine 15. What's
degree? ... It's a number and it's biggest for Valjean, so I guess it's how important they are.
Or how many scenes. OK so off this, the top four are Valjean, Gavroche, Marius, Javert. That's
kind of what I said from the picture, good.

Gavroche second is a bit weird though. He's the little kid. He's not second-most important to the
story.

**Is that the answer?** The question says "how the story hangs together", and "how sure". The
table just gives me one number. How sure am I? ... I don't know, it's a table, it's sorted, it's
the order. 100 percent? That feels like the wrong answer.

(She looks at the right side of the older at-rest screen.) Statistics. Nodes 77, edges 254,
density 0.0868. I don't know what density is, is 0.08 dense? Doesn't sound dense. Connected
components 1. Degree distribution with a little bar chart. ... Nothing here says who matters.

"Results" with a plus. Nothing under it. Results of what? I haven't done anything. (She does not
click the plus.)

**Clicking the big one.** Let me just click Valjean. (Valjean selected.) Right side changes:
Valjean, Node. Appearance, Size: degree, Group color, Bridges off, Base style. Attributes: group
2, degree 36. Results: "betweenness 0.57, highest". "bridges: on no bridge".

"Betweenness." OK. Is that good? "Highest", so it's the highest one. That sounds like the thing
-- he's between everybody. Bridges "off" and "on no bridge" -- I don't understand the bridge
thing at all, I'll leave it.

(She looks down.) Oh, the table changed, now it says "Sorted by betweenness". Valjean 0.57, then
Myriel 0.177, Gavroche 0.165, Marius 0.132, Fantine 0.13, Thenardier 0.075.

Myriel? Who's Myriel? (She finds the label on the top right of the picture.) He's off in his own
little blue corner with like eight dots around him. How is he second? ... Oh wait, is that the
bishop? The candlesticks bishop? He's in the first ten minutes of the musical. He can't be the
second most important person in the story.

And Javert's gone. Javert was fourth a minute ago and now he's not in the top six at all. That
can't be right. I probably clicked something that changed what it's counting.

**Looking for how sure.** (She scrolls the table, stops on the sentence above the columns.)
"Valjean is #1 on both measures. At #2 they part: Gavroche by degree, Myriel by betweenness."
OK, that is actually helpful. So there are two ways of counting and they agree on Valjean and
disagree after that. So I'm sure about Valjean. The rest depends on which one you pick. Which one
do I pick? It doesn't say which one is "how the story hangs together".

"Compare rankings..." -- that sounds like exactly my question. (Clicks.)

(Comparison page, payments data.) Payments network review. Accounts, ACC-139419. PageRank. OK,
this isn't my thing at all. The moderator says pretend. ... "0 of the top 50 in both", "Spearman
0.40". There's a scatter plot. I don't know what Spearman is. If I squint, the idea is "these two
lists disagree a lot", which I guess tells me how sure to be. But I couldn't tell you what it
would say for Les Mis. I'd go back.

**The Betweenness panel.** (Moderator shows the Les Mis result panel.) Betweenness, Result. Top
nodes: 1 Valjean 0.419, 2 Gavroche 0.172, 3 Marius 0.164, 4 Fantine 0.154, 5 Javert 0.073.

Wait. Valjean was 0.57 in the table. Now he's 0.419. And Myriel's gone, Gavroche is back at two,
and Javert is back in. Same word, "betweenness", different numbers, different order. Now I really
don't know which one to believe.

(Long pause, reading.) "on: filtered graph, 60 nodes, 1 component." ... Filtered? I didn't filter
anything. (She looks at the top left.) "Filtered: 60 of 77 nodes, 1 step". Oh. So somebody took
seventeen of them out. I didn't see that at all until now. So this one is on fewer characters,
that's why it's different. OK. ... That's kind of scary though, I'd have taken these numbers to a
meeting.

(She reads under the top five.) "Every step in the top 5 is over the 1% tie line; the smallest,
ranks 2 and 3, is 4.7%." ... I don't know what that means. Tie line. Is 4.7 percent good? Is it
saying they're basically tied or that they're not tied? I think it's saying the order is real?
I'm guessing. If that's the "how sure" answer, it's hiding in a sentence I had to read three
times.

The little bar chart, "Distribution": one tall bar at zero and a blue sliver at the far right.
"zero: 32 nodes". So half of them have zero of this. And one dot way out at the end, that's
Valjean. So Valjean is way out ahead on his own. That picture actually says it better than the
sentence: Valjean for sure, then a clump.

**Trying to run it myself.** If I want it on the whole book, I think I need to run it again. The
Run button is grey. (She does not find a way to change "Filtered graph" back.) Maybe the plus
next to Results? (Moderator shows the menu.) It opened a big list: Centrality, Betweenness,
Closeness, Eigenvector, Harmonic centrality, HITS, Katz, PageRank, then Community, Louvain,
Leiden... Structure, Flow, Prediction.

No. I'm not picking from that. I know Betweenness from the other screen, so I'd click that. But
if I didn't already know the word I would close this. "Eigenvector" -- no.

(Quick actions box, shown by the moderator.) Oh, this is a search. "centrality" ... I wouldn't have
typed "centrality", I'd have typed "important" or "most connected". Does that find anything? It
shows "hours" next to Betweenness, which is scary -- is that going to take hours? (Moderator:
that one is a much bigger graph.) OK.

**The other data.** (The protein screens, with three measures.) This table has three columns and
a rank column after each, "#1, #2, #4=". And the sentence again, "MAPK1 and TP53 are the top 2 on
all three measures. At #3 they part." OK, I get the pattern now: if all the columns agree, you can
be sure. Where they part, you can't. That's a nice way to say it, honestly. I would want that for
Les Mis. I only saw it with two columns for Les Mis. What's "#4=" -- equal fourth? Like a tie in
sports. Yeah, I get that one.

## Her answer

"Valjean, definitely. He's first on everything, and on that little chart he's way off on his own.
After him it's Gavroche and Marius -- they're near the top on both of the counts I saw. Then it
gets fuzzy: one count says Javert, one says Myriel the bishop, which I don't believe, and a third
one was on a filtered version I didn't know I was looking at. So: sure about number one, fairly
sure Gavroche and Marius are in the next group but not which order, and not sure at all after
that."

Her Slack sentence: "Valjean holds the whole thing together; Gavroche and Marius are next;
after that it depends how you count."

The correct reading, for the record: on the full graph Valjean is first on both measures. Gavroche
and Marius are in the top four on both. Myriel is second by betweenness because he is the only
link between his own small cluster and the rest, which is exactly what "hangs together" asks; she
rejected the most informative result in the table because it contradicted her memory of the
musical.

## Single Ease Question

"Four. Getting to Valjean was easy, a one. Getting to 'how sure' was hard. The table sentence
about where they part was the only thing that told me, and then another screen gave me different
numbers for the same word and I didn't notice it was filtered."

SEQ: 4 of 7.

## Would she use it instead of her current tool?

"My current tool for this is nothing. I'd sort a spreadsheet by the count column. So yes, I'd use
this over that, because of the sentence that says where the two lists agree and where they split
-- a spreadsheet would never tell me that. But I wouldn't take the numbers to my VP until someone
told me which of the betweennesses was the real one. The filter thing scared me."

## Observer notes

- She never pressed the Results "+" on her own; the moderator showed the menu. She did not find a
  way to put the filtered result back on the full graph and stopped trying after one guess.
- She read node size as importance and the middle position as importance; both happened to agree
  with degree here, so the misreading went uncorrected.
- She took the legend's numeric group names ("2", "8") as ranks for a few seconds before reading
  the counts.
- Engagement dropped at the Algorithms list (answers shortened to "no", "OK") and recovered only
  when she saw the ranked three-measure table.
- The two agreement sentences above the table ("Valjean is #1 on both measures. At #2 they
  part...") were the only place she got her "how sure". She did not understand the "1% tie line"
  sentence in the result panel, and read the distribution chart instead.
- She did not notice "Filtered: 60 of 77 nodes" in the project header until the result panel's
  first line said "filtered graph". Between the table (full graph, Valjean 0.57, Myriel #2) and
  the result panel (filtered, Valjean 0.419, Javert #5) she first blamed herself ("I probably
  clicked something"), then the tool.
