# Who matters -- Jordan, marketing network analyst

**Participant:** Jordan, growth-marketing analyst, six years in, "does the network stuff" one or two
days a week. Uses Gephi, NodeXL, a listening suite (Brandwatch) and a colleague's networkx notebook.
Knows degree from betweenness; calls every centrality "influence score". Played at 1440 by 900.

**Task as given by the moderator:** "You have the Les Miserables co-appearance network open. Find the
few characters who matter most to how the story hangs together, and tell me how sure you are of
their order."

**Screens seen:** the project at rest (Les Miserables), the rebuilt navigation frames (Les
Miserables, with a Bridges result and a node selected), the Results panel states (the Algorithms
menu, Quick actions, a finished Betweenness result, the result's table, a closeness result that
states ties, and a Les Miserables Betweenness run on a filtered graph), the table dock (Les
Miserables with degree and betweenness ranked side by side, and the CSV export).

Renders the participant looked at (all in the study view, design notes hidden):
- `../../../shots/screens__frame-at-rest.png`
- `../../../shots/record/r4-jordan-who-nav-new.png`, `../../../shots/record/r4-jordan-who-nav-node.png`
- `../../../shots/record/r4-jordan-who-rp-catalog.png`, `../../../shots/record/r4-jordan-who-rp-quick.png`
- `../../../shots/record/r4-jordan-who-rp-finished.png`, `../../../shots/record/r4-jordan-who-rp-table.png`,
  `../../../shots/record/r4-jordan-who-rp-variant.png`
- `../../../shots/record/r4-jordan-who-rp-filtered.png`
- `../../../shots/record/r4-jordan-who-td-small.png`, `../../../shots/record/r4-jordan-who-td-out.png`

Several Results-panel states are drawn on other datasets (300 human proteins, 124,318 patents)
rather than on Les Miserables. The moderator told her to read them as "the same panel, different
data". That cost her time and trust; it is noted under Problems as a study-material issue, not a
product one.

## Think-aloud

**Project at rest.** "OK, Les Mis. I know the musical, I have not read the book, so, fair warning.
Valjean, Javert, Fantine, Cosette, Marius, the kids at the barricade. Fine."

"So it opens coloured. 'Group color': 2, 8, 4, 1, 3, 5, 0, Other. What is group 2? This is my
'what's purple' problem, just with numbers instead of purple. If this were my data I'd at least know
what the column meant. Here I have no idea -- chapters? Families? Doesn't matter for this task,
moving on."

"Top left: 'Nothing has been sent from this project', with a little lock. Good. That's the first
thing I look for. It's a novel so I don't care today, but I clocked it."

"Right side: 77 nodes, 254 edges, density, connected components 1. Fine. Nothing here tells me who
matters. There's 'Results' with a plus and nothing under it. And a 'Style stack'. I don't know what
a style stack is and I'm not going to find out right now."

"What I actually want is a button that says 'Find influencers' or 'Key characters' or something. I
don't see one. There's a lightning bolt in the bottom toolbar -- no idea. The plus next to Results is
probably where you add a... result? That's circular, but OK, I'd click that."

**The navigation frame, with a table open.** "Oh, this one has a table under the map. Good. 'Full
graph: 77 nodes. Sorted by degree.' Valjean 36, Gavroche 22, Marius 19, Javert 17, Thenardier 16,
Fantine 15. That's a list. But degree just tells me who's in the most scenes with the most people.
The top twenty are all big. I want the ones holding it together."

"And -- wait. Results: 'Bridges -- done'. Bridges! That's literally my word. That's the connector
thing. Somebody already ran it. Let me click it."

**The Bridges result, with Valjean selected.** "Valjean. 'bridges: on no bridge.' ... What? The guy
the whole book is about is not a bridge? That can't be right. Either this measure is broken or I
don't know what it means by bridge. And the Bridges layer in the style stack is off, so I can't even
see what it thinks the bridges are."

"OK, there's a betweenness line right above it -- '0.57, highest'. So betweenness says he's the top
connector, and 'bridges' says he's on no bridge. Two answers to what I thought was the same
question. This is exactly the thing where I put it on a slide and someone asks why the chart says
he's not a bridge. I'm ignoring 'Bridges'. I'd have wanted a one-liner telling me it's about links,
not people, if that's what it is -- I genuinely don't know."

"The table now: 'Sorted by betweenness.' Valjean 0.57, Myriel 0.177, Gavroche 0.165, Marius 0.132,
Fantine 0.13, Thenardier 0.075. Myriel? The bishop? The candlesticks guy? He's in, what, the
first twenty minutes of the musical. Number two?"

"...Actually, OK, I can see it on the map. Myriel's that blue cluster top right, all those little
dots only connect to him. So everybody in his corner has to go through him. That's a bridge in my
sense -- he's the only way into that group. Fine. That's the same as a creator who's the only link
into a niche community. I believe that. I would not have guessed it, and that's kind of the point
of doing it."

**Finding how to run it myself (Algorithms menu).** "If nobody had run it for me -- main menu,
Algorithms, then Centrality: Betweenness, Closeness, Eigenvector, Harmonic centrality, HITS, Katz,
PageRank. Seven. HITS, Katz? No. I know betweenness is the bridge one, so I'd pick it. My VP would
not. There's no line telling me what any of these is for; it's just names. 'Closeness --
WF-corrected' -- I skim past that. 'Eigenvector -- 3 components' with a warning -- that's the
protein one, not mine."

"Quick actions -- type 'centrality' -- same list, but it says how long each would take. 'hours' for
betweenness on the patent thing, 'under a minute' for PageRank. That I like. That's the thing Gephi
never told me. On 77 characters I assume it's instant."

**A finished Betweenness result (protein data, same panel).** "So when it finishes the right side
turns into the result. Top nodes, one to five, with the numbers. 'Exact' with an info icon --
hovering: 'Computed on every node, not estimated. It does not say the ranking is meaningful.' Ha.
OK. That's honest. I actually like a tool that says that, because the vendor tools pretend the
opposite."

"Then: 'Every step in the top 5 is over the 1% tie line; the smallest, ranks 3 and 4, is 1.2%.' Hm.
So it's telling me whether neighbours in the list are basically tied. That's the 'how sure' bit.
But 1% of what? Who decided 1%? I read it as: 3 and 4 are 1.2% apart, which is barely over, so I
wouldn't bet on 3 versus 4. Is that what it means? I think so. I would not put '1% tie line' on a
slide, I'd have to explain it."

"'Weight: confidence, not used yet. Change...' I don't know. Weight -- like, make them bigger?
Skip."

**Closeness, stating a tie.** "This one says it outright: 'Ranks 3 and 4 differ by less than 0.2%,
under the 1% tie line; treat them as tied.' That's the sentence I want. 'Treat them as tied.' Why
does the betweenness one not just say 'none of the top five are tied' in normal words? Same idea,
this one reads better."

**The table dock, Les Miserables, degree and betweenness side by side.** "Now this. 'Valjean is #1
on both. At #2 they part: Gavroche by degree, Myriel by betweenness.' That's the whole story in one
line. Degree says the loud kid at the barricade, betweenness says the bishop who connects a corner
nobody else reaches. That's my 'vanity metric versus who actually moves it' slide, basically
written for me."

"Columns: degree, rank of 77, betweenness 'exact, unweighted, full graph', rank of 77. Gavroche is
#2 on degree, #3 on betweenness. Marius #3, #4. Good, ranks right there, I don't have to sort
twice and eyeball. 'Compare rankings...' -- I'd click that later, not now."

"'Unweighted.' Hang on. These are co-appearances. Two characters in thirty scenes together count
the same as two who shared one scene? That seems like it ignores the whole point of the data. I
see the word, I just don't know what I'd do about it. There's a 'Change...' somewhere but I'm not
touching parameters on a mock."

**The Les Miserables run on a filtered graph.** "Now this one says 'Filtered: 60 of 77 nodes -- 1
step' and the top five are Valjean 0.419, Gavroche 0.172, Marius 0.164, Fantine 0.154, Javert
0.073. Where's Myriel? He was number two a minute ago."

"Oh. 'on: filtered graph, 60 nodes.' And the Details popup: 'Filtered graph, 60 of 77: after Filter
to degree >= 2.' So somebody threw out everyone with only one connection -- which is exactly
Myriel's little corner -- and now he's not a bridge to anything. That makes sense once you see it.
But if I'd come in cold and seen this screen, I'd have told my boss Myriel doesn't matter. The
ranking depends on what you cut. That's the real answer to 'how sure are you'."

"'Every step in the top 5 is over the 1% tie line; the smallest, ranks 2 and 3, is 4.7%.' So here
Gavroche over Marius is 4.7% -- a bit of daylight. On the full graph I have to do it myself:
Marius 0.132, Fantine 0.13. That's, what, one and a half percent? Basically tied. The full-graph
Les Mis panel I saw only showed me the table, not a sentence like this, so I did the maths in my
head. I'd rather it told me."

**Getting it out.** "'Export table as CSV...' It tells me rows, order, columns, and shows the first
few lines, and the headers carry the method. Good. 'I hit export and got a picture' -- not this
time, it says CSV right on the button. That I'd use."

## Her answer to the moderator

"Valjean, clearly. He's number one on everything and he's more than three times the next person on
the connector score -- I'm sure of that. After him, a group of four: Myriel, Gavroche, Marius,
Fantine. Myriel is second only because he's the one way into his own little corner; take out the
one-scene characters and he drops right out, and then it's Gavroche, Marius, Fantine, with Javert a
long way behind. So: Valjean, I'd put money on. The order of two through five, I wouldn't -- Marius
and Fantine are basically tied on the full graph, and Myriel moves depending on what you filter.
And none of this counts how many scenes people share, because it's unweighted, which bugs me."

## Single Ease Question

**4 out of 7.** "Reading the answer once I had the table was easy -- the 'at #2 they part' line did
my job for me. Getting there was not. Nothing said 'key characters', the menu is a list of algorithm
names, 'Bridges' sent me the wrong way, and the 'how sure' part I mostly worked out myself from the
numbers."

## Would she use this instead of her current tool?

"Instead of Gephi for this kind of thing -- maybe, yes. The table next to the map, ranks for two
measures side by side, a CSV that says what method made each column, and it tells me nothing left
my laptop. Gephi does none of that without me fiddling. Instead of Brandwatch -- no, that's where
my data comes from, and we already pay for it; this would sit after it, not replace it. And my
colleague could do the ranking in her notebook in five minutes. What she can't give me is the
sentence about who parts at number two, which is the thing I'd actually paste into the deck."

"Also, honestly, half our Instagram data is gone from Brandwatch since whatever they changed, so the
network I'd load here is already missing people. Not your problem. Still my problem."

## Problems

1. **Severity 3 -- "Bridges" is read as the connector measure.** A result named "Bridges" in the
   Results list uses her own word for high-betweenness people. Selecting Valjean shows "bridges: on
   no bridge" next to "betweenness 0.57, highest", which she read as two contradictory answers to one
   question. Nothing near the result says it is about links, not characters. She discarded it and
   distrusted the panel for a moment.
2. **Severity 3 -- No task-worded entry point.** The Algorithms menu and Quick actions list
   Betweenness, Closeness, Eigenvector, Harmonic, HITS, Katz, PageRank with no plain-words line
   ("people who connect groups", "reach"). She found betweenness only because she already knew the
   name.
3. **Severity 2 -- The "how sure" statement is missing where she needed it, and hard to read where
   it exists.** The full-graph Les Miserables ranking gave no tie statement, so she worked out that
   Marius (0.132) and Fantine (0.130) are about 1.5% apart herself. Where the sentence exists, "over
   the 1% tie line; the smallest ... is 1.2%" did not say what the 1% is of or who set it; the
   closeness version's "treat them as tied" was understood at once.
4. **Severity 2 -- A filter silently reorders who matters.** Myriel is #2 on the full graph and
   absent from the top five after "Filter to degree >= 2". The scope is stated ("on: filtered
   graph, 60 nodes"), but she noticed only because she had seen the other screen first; cold, she
   would have reported that Myriel does not matter.
5. **Severity 2 -- "Unweighted" on a co-appearance network worried her and she did not know what
   to do about it.** "Weight: value, not used yet" read to her like node size ("weighted" means
   "sized by" in her vocabulary); only the table header "unweighted" made her realise scene counts
   were ignored.
6. **Severity 1 -- Group colour legend shows bare numbers.** "Group color: 2, 8, 4, 1..." gives no
   meaning; the same "what's purple" question she gets in meetings.
7. **Severity 2 (study material) -- Most Results-panel states are drawn on other datasets.** The
   task names Les Miserables, but the finished, table, tie and export states show proteins or
   patents. She had to be told to read them as the same panel; she said it made her wonder which
   numbers were real.

## What worked for her

- "Valjean is #1 on both. At #2 they part: Gavroche by degree, Myriel by betweenness." -- the single
  most useful line of the session; she called it her slide.
- The "Exact" tooltip saying it "does not say the ranking is meaningful": she trusted the tool more
  for it.
- Rank columns beside each measure in the table, so she did not sort twice.
- Quick actions giving a time estimate per measure.
- "Nothing has been sent from this project" visible before she did anything.
- The CSV export naming rows, order and method in the header.
