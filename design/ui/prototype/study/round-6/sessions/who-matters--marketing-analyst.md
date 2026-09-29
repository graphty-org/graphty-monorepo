# Who matters in Les Miserables -- Jordan, marketing network analyst

Task as read to her: "You have the Les Miserables co-appearance network open. Find the few
characters who matter most to how the story hangs together, and tell me how sure you are of their
order."

Screens she worked through, all in the participant view (design notes hidden): the Les
Miserables project at rest, the navigation walkthrough, the Results panel states, the run-and-read
states, the table dock, the inspector and the closeness variant. Renders:
`shots/r6-jordan-who-*.png`; the crops she looked at closely are in `tmp/who-matters-jordan-r6/`.

## Think-aloud

**1. The project at rest.** "OK, 77 characters, 254 links, one piece. Colored by 'group' -- 2, 8,
4, 1... I still don't know what purple means. If I pasted this in a deck someone would ask me
what group 8 is and I'd have nothing. Labels on 18 characters with the most connections, fine.
Valjean is in the middle of everything, obviously. Up on the right it says 'value not used yet'
next to 'undirected'. Value of what? Scene counts, I'm guessing. I'll come back to that."

"'How the story hangs together' -- that's a connector question, not a popularity question. Who
holds the groups together. In Gephi I'd size by betweenness. So I want betweenness."

**2. Finding the measure.** She opens the main menu and goes to Algorithms. "Centrality:
Betweenness, Closeness, Eigenvector, Harmonic, HITS, Katz, PageRank. Nothing here says 'who
connects groups'. I know betweenness so I'm fine, but my manager would not be." She hovers
Betweenness (run-and-read, catalog state). "Oh, there's a tooltip now -- 'how often a node lies on
the shortest paths between other nodes: the brokers and bottlenecks'. OK, 'brokers', that's my
word. That's good. But I only see it because I hovered the one I already wanted. If I didn't
know the name I'd have to hover seven things."

She tries Quick actions. The render she is shown is a patent network typed 'centrality', with
cost words beside each entry ('hours', 'under a minute'). "I like that it tells me the cost up
front. I'd type 'connector' or 'influencer' here, honestly. I see on the money network that
typing 'money' gives me sentences -- 'total amount of transfers into each account'. Does
'connector' find betweenness? I can't tell from this. I'd guess no and go back to the menu."

**3. The run.** In the navigation walkthrough a Betweenness run is already in Results: "Betweenness,
today 14:02. Exact, normalized, no weight. Full graph, 77 nodes." She opens it. "'No weight:
every edge counts the same.' Good, that's a sentence I understand. Last time I thought
'unweighted' meant node size. So it ignored how many scenes two characters share. Is that what I
want? Probably not -- two characters in thirty scenes together are tighter than two who pass in
one. But I don't see a button right here that says 'use the scene counts'. There's 'Re-run' and
'Compare with...'. I guess Re-run lets me change it? I'd click it and hope."

Top nodes: "Valjean 0.57, Myriel 0.177, Gavroche 0.165. Then the table: Marius 0.132, Fantine 0.13,
Thenardier 0.075."

**4. How sure am I of the order.** "Right, now the second half of the question. Where does it
tell me how sure to be?" She looks under Top nodes in the Les Miserables run. "Nothing. Just three
names and numbers." She scrolls the Results panel states. "The protein one has a line, 'every step
in the top 5 is over the 1% tie line; the smallest, ranks 3 and 4, is 1.2%'. And the filtered
Les Mis one has it too, 4.7%. So the tool knows how to say it -- it just didn't say it for the
full cast, which is the one I'm reporting."

She works it out herself from the table: "Valjean 0.57 against 0.177 -- he's three times the next
one, no question. Myriel versus Gavroche, 0.177 and 0.165, that's about 7% apart. I'd call that a
real gap but not a huge one. Marius 0.132 and Fantine 0.13 -- that's nothing, one and a half
percent. I would not put them in an order on a slide."

"And what's the '1% tie line' anyway -- 1% of what, and who decided 1% counts as a tie? The
closeness one said 'treat them as tied' in plain words. That I get. '1.2%, over the tie line' I
have to translate."

In the run-and-read 'read one node' state (proteins again) she notices: "This version has no tie
sentence at all under the top five, and ranks 3 and 4 are 0.0695 and 0.0687. The other state of
the same run had the sentence. So which one is the real product? That's the kind of thing that
makes me check everything twice."

**5. The table.** Table dock, small-graph state. "'Valjean is #1 on both measures. At #2 they part:
Gavroche by degree, Myriel by betweenness.' Yes. That's my slide. I love that. And rank columns
next to each number, so I don't sort twice. Header says 'Betweenness exact, unweighted, full
graph' -- clear." She checks the rank cells for 'near' marks: "On the protein table it says
'#7, near #8'. On Les Mis, Marius is #4 and Fantine is -- I can't see her in this crop, but the
Marius cell just says '#4', no 'near'. If Fantine is 1.5% below, that's over 1%, so no mark. OK,
consistent I suppose. But to me 1.5% is still a coin-flip."

**6. The inspector.** Selected Valjean. "Results: betweenness 0.57, highest. Bridges: on no
bridge." She stops. "Bridges. That's the thing I'm measuring -- the bridge people. And it says
Valjean is on no bridge while being the top connector. I know from last time it means links, not
people, but a new person on my team would read that as the tool contradicting itself. It still
doesn't say 'links' anywhere near it."

**7. The filter trap.** Results panel, filtered state. "Filtered to degree 2 or more, 60 of 77,
and now it's Valjean, Gavroche, Marius, Fantine, Javert. Myriel's gone from the top five. It does
say 'values on 60 of 77 nodes: the filtered graph' right under Top nodes, which is better. If I'd
filtered first to 'clean up the hairball' I'd probably still have reported without Myriel. The
bishop matters because his little household hangs off him -- cut the one-link people and of course
he drops."

**8. The closeness variant, for a second opinion.** "Different screen, Valjean filtered out. Here
the side panel says 'Weight: value, shared scenes, 1 to 31' and 'Distance = 1 / value' under
Betweenness. Wait -- so on this screen the scene counts ARE used? On the other screen it said no
weight. Is that a setting I changed? I didn't do anything. That makes me wonder which betweenness
I'd get by default." "Marius 0.930 and Combeferre 0.928 -- nothing under the list saying those are
tied here either."

## Her answer to the moderator

"The ones that matter: Valjean, by a mile -- about three times anyone else on 'who connects the
story'. Then Myriel and Gavroche. Myriel because he's the only link to the bishop's whole
household; Gavroche because he's in with lots of people -- he's #2 if you just count
connections. After that Marius and Fantine, and I would not rank those two against each other,
they're within a percent or two.

How sure: very sure about Valjean first. Fairly sure about Myriel and Gavroche being the next
tier, but not which one is #2 -- it depends on whether you're counting connections or bridging,
and the tool told me that itself, which I liked. Not sure at all about Marius versus Fantine.
And there's a caveat: this ignored how many scenes people share. I'd want to rerun with the scene
counts before I put numbers on a slide, and I'm not certain from these screens what the default
is, because one screen says no weight and another uses it."

## Single Ease Question

**5 of 7.** "Getting to the ranking was easy and the agreement line is exactly what I'd put in a
deck. I lost points because the 'how sure' part I had to do myself on the full cast, the 'Bridges'
row still reads like it contradicts the answer, and I'm unsure whether scene counts are in or out."

## Would she use this instead of her current tool?

"For a shortlist like this -- yes, over Gephi, probably. No install, it tells me up front
nothing's been sent anywhere, it gives me the rank next to the score and a sentence I can paste.
Gephi never tells me two numbers are basically the same; this at least tries. But I wouldn't hand
it to my manager yet: the measure names still assume you know the jargon, and until it always
tells me 'these two are tied' in plain words, I'm still doing the check in Excel before I trust it."

## Problems observed

1. **Severity 3 -- No "how sure" statement on the Les Miserables full-graph ranking.** The run
   she was reporting lists Valjean 0.57, Myriel 0.177, Gavroche 0.165 with no tie sentence; the
   protein and filtered Les Miserables runs have one. She computed the gaps herself (about 7%
   between #2 and #3, 1.5% between Marius and Fantine). The same protein run also shows the
   sentence in one state and not in another, which made her doubt which state is the product.
2. **Severity 3 -- "Bridges" still reads as the connector measure.** Selecting Valjean shows
   "bridges: on no bridge" beside "betweenness 0.57, highest". Nothing says it is about links.
3. **Severity 2 -- Whether scene counts are used is contradictory across screens.** The Les
   Miserables run says "No weight: every edge counts the same"; the closeness-variant screen, same
   project, shows Betweenness with "Distance = 1 / value" and "Weight: value, shared scenes". She
   could not tell what the default is, or how to switch weight on from the run (only Re-run is
   offered).
4. **Severity 2 -- The "1% tie line" wording.** "Over the 1% tie line; the smallest is 1.2%" does
   not say what the 1% is of or why 1% means tied; "treat them as tied" (closeness) was understood
   at once. She also considered 1.5% a coin-flip for a report, so a rule that marks 1.5% as a real
   order felt too strict for her purpose.
5. **Severity 2 -- Task words only reach the measure by hovering.** The Betweenness tooltip
   ("the brokers and bottlenecks") is good, but only appears on hover of an item she already
   knew; typing "connector" or "influencer" in Quick actions has no shown result, while "money"
   gets plain sentences on another network.
6. **Severity 2 -- A filter still quietly reorders who matters.** Myriel drops out of the top five
   after "Filter to degree >= 2". The scope line under Top nodes is now visible, but cold she
   would still have reported without him.
7. **Severity 1 -- Group legend shows bare numbers.** "2, 8, 4, 1" with no names.
8. **Severity 2 (study material) -- Most Results and run-and-read states are drawn on proteins,
   patents or transfers,** not Les Miserables; she had to read them as "the same panel" and it
   again made her wonder which numbers were real.

## What worked for her

- "Valjean is #1 on both measures. At #2 they part: Gavroche by degree, Myriel by betweenness." --
  her slide, again.
- "No weight: every edge counts the same" -- a sentence she understood without translating.
- The Betweenness tooltip naming "brokers", her own word.
- Rank columns beside each score, with the method and scope in the header.
- Cost words in Quick actions and "Nothing has been sent from this project".
- The filtered run stating "values on 60 of 77 nodes: the filtered graph" directly under Top nodes.
