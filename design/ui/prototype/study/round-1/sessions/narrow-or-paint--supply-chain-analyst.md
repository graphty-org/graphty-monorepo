# Session: narrowing to the biggest connected piece -- supply chain risk analyst

Participant: Dana Okafor (composite persona), supply chain risk analyst. Lives in Excel and Power
BI, not a network scientist, reads tables carefully and skims everything else.

Task given by the moderator, and nothing more: "Look only at the biggest connected piece, and tell
me its size and who matters most in it."

Screens used, in order: the filter chip with no steps, the filter chip after adding a step, the
frame at rest (to check how I would have found the chip), the Results panel.

Outcome: finished, with some doubt about the second half. Size: 76 of 77. Who matters most:
Valjean, by number of connections -- but I was not sure that is what "matters" should mean, and the
one screen that offered other rankings did not let me aim them at the piece I had narrowed to.

## Think-aloud

**1. Filter chip, nothing applied yet.**

"OK. Les Miserables. So this is the book characters, not suppliers. Fine, I'll pretend Valjean is a
distributor.

There's a box open at the top of the picture: 'Filter steps. No filter steps. Every number reads the
full graph.' Grey text, small. I had to lean in. And under it '+ Add step'.

Before I even touch that -- the right side says Statistics. 'nodes 77, edges 254, components 2,
largest component 76.' Largest component, 76. I think that's my answer to the size part? The
moderator said 'biggest connected piece', the screen says 'largest component'. I'm going to assume
those are the same thing. Nobody told me what a component is. 'Edges' is 254, which I think are the
lines.

So... 77 characters, and the biggest piece is 76. So there's one left over -- is that the little
blue dot way out on the left, on its own? Probably. OK. But she said 'look only at' it, so I think
she wants me to actually cut the rest away, not just read a number."

**2. Add step.**

"I click 'Add step'. A menu: under 'Filter to' -- 'Largest component', 'k-core...', 'Rule...'. Then
under 'Filter out' -- 'Rule...'.

'Largest component' -- that's the same words as the statistics, good, I'll take it. 'k-core' I have
no idea, I'm not clicking that. There are two 'Rule...' items, one under each heading, and the
difference is just which heading they're under. I'd miss that if I were in a hurry.

I click 'Largest component'. It adds a row, 'Filter to Largest component', with a checkbox and a
number 76 at the end. The chip up in the left panel changes to 'Filtered: 76 of 77 nodes'. OK,
that's clear, I like that it says 76 OF 77, that's what I'd put on the slide.

Nodes. Fine, so the characters are nodes."

**3. Reading the table for who matters.**

"Bottom table: 'Filtered graph: 76 of 77 nodes. Sorted by degree.' Degree -- I don't know that
word here. It's the number that's biggest for Valjean, 36, then Gavroche 22, Marius 19, Javert 17,
Thenardier 16. The dots in the picture are bigger for the bigger numbers, and the left panel has a
style called 'Size by degree', so I'm guessing degree means how many other characters each one is
linked to. How many connections. If that's right, Valjean is the one who matters. 36 is miles
ahead.

But -- in my world the one who 'matters' is not the one with the most connections, it's the
chokepoint. The distributor everyone goes through. Is that the same as this? I don't know. The
table only gives me the one number. I'd want a column that says 'if this one goes away, how much
falls apart', and I don't see it here."

**4. A worry from the other version of this screen.**

"The moderator showed me the version with three steps on. There, the table had two columns, 'degree'
and 'degree on: full graph' -- Valjean 18 and 36. Two numbers for the same thing, for the same
person. I get it once I stare at it -- one is counted after the filter -- but if I'd pasted the wrong
column into a deck I'd look like an idiot in front of the VP. And the stats on the right said
'largest component 28' while the chip said '28 of 77', so the words 'largest component' meant the
whole thing I'd filtered to, not the original 76. Same words, different number, depending on what
I've done. That's the kind of thing I stop trusting.

With just my one step it doesn't matter, because dropping one loner doesn't change anybody's count.
But I'd check it every time now."

**5. How would I have got here from the normal screen?**

"The normal screen: top left says 'Les Miserables', then 'miserables.json', then a pale little grey
thing with a funnel, 'Full graph'. I'd have read that as a label telling me what I'm looking at. I
would NOT have clicked it. A funnel is a filter in Excel, so maybe eventually, but it looks
switched off. The mock I started from already had the box open for me, so I didn't have to find
it. In real life I'd have gone looking for a 'Filter' button on the toolbar at the bottom, and
that's four icons with no words -- an arrow, a squiggle, a page, a lightning bolt."

**6. The Results panel, looking for something better than 'degree'.**

"The little flask on the left rail says 'Results'. There's a catalog: Centrality -- Betweenness,
Closeness, Eigenvector, Harmonic centrality, HITS, Katz, PageRank. Betweenness I know from a vendor
webinar, that's the chokepoint one. Or I think it is. Nothing here says, in a sentence, what
question each one answers. Katz? HITS? No.

In the finished example, Betweenness has 'Top nodes: 1 MAPK1, 2 TP53...' and '295 more in the
table'. That's the list I'd want. Good. But above it: 'on: full graph, 300 nodes, 3 components'
and a 'Scope' box that says 'Full graph'. So if I'd filtered to the big piece, is this running on
my filtered piece or on everything? The box says Full graph. I'd have to open the Scope dropdown
and hope 'Filtered graph' is in there -- the screen doesn't show me the choices. Honestly my first
instinct is that the filter I set and this Scope box are two different things that don't know
about each other, and I'd just have filtered in one place and got numbers for another.

Also 'hours' next to Betweenness in one of the catalogs. Hours. For 300 rows I can do a pivot in
ten minutes.

And that example is on proteins, a different dataset, so I can't actually tell you Valjean's
betweenness. I'll stick with the table."

**7. My answer to the moderator.**

"The biggest connected piece is 76 characters out of 77 -- it's everybody except one loner. The
one who matters most is Valjean, 36 connections, way more than anyone. If you mean 'who's the
chokepoint' rather than 'who's connected to the most', I think I'd need that Betweenness thing,
and I'm not confident it would have run on just the 76."

## After the task

**Single Ease Question: 5 of 7.** The size was easy -- it was literally printed on the right before
I did anything, and the step I added said '76 of 77'. 'Who matters most' was the hard half: the
only ranking in front of me is 'degree', which I had to guess the meaning of, and the proper
ranking lives in a different panel full of names I don't know with a Scope box that doesn't obviously
follow my filter.

**Would I use this instead of what I have?** "For this exact job -- 'drop the stragglers, who's the
hub' -- this is quicker than Gephi was, and the '76 of 77' wording is honest in a way I like. But
it doesn't beat a pivot table on its own; I can count connections per supplier in Excel. Where it
would earn its keep is the chokepoint ranking, and that's exactly the part I couldn't trust here.
And before any of that: where does my supplier list go when I load it, will IT sign off, and can I
get this table into Power BI? Until someone answers those, it's a side tool."

## Problems seen

1. **The filter entry point looks like a label, not a control** (frame at rest). The pale grey
   'Full graph' chip with a funnel reads as status. Severity 3.
2. **'Degree' is the only ranking offered, with no plain meaning** (filter chip, table). She guessed
   it means connections from the size legend. Severity 2.
3. **Results ignores or hides the filter** (Results panel). 'Scope: Full graph' and 'on: full
   graph' sit next to a graph she just narrowed; the options in Scope are not visible and nothing
   links it to the chip. Severity 3.
4. **Two numbers for the same measure** (filter chip, three steps). 'degree' and 'degree on: full
   graph' side by side, and 'largest component' changing meaning with the filter. Severity 2.
5. **Catalog names with no business question** (Results panel). Katz, HITS, Harmonic, Eigenvector,
   k-core: never clicked. Severity 2.
6. **Small grey text** (filter popover, table caption, stats labels). Hard to read without her
   glasses. Severity 2.
7. **Two identical 'Rule...' items in the Add step menu**, told apart only by their heading.
   Severity 1.

## What worked

- 'Filtered: 76 of 77 nodes' on the chip: a number she would put on a slide.
- 'Largest component' in the menu uses the same words as the statistics, so she found it at once.
- The table sorted by the ranking, with the answer in the first row.
