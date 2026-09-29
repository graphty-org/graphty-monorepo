# Session: "What groups are there, and what makes the biggest one different?" -- Jordan, marketing network analyst

Participant: Jordan (simulated; see ../../personas/marketing-analyst.md).
Screens used, in order: Results panel, Styles list, Inspector. Laptop-sized
frames, 1440 by 900.

Moderator's task, as given: "What groups are there in this network, and what
makes the biggest one different?"

## Transcript

**Results panel, first frame (patent citations, PageRank running).**

> OK. So this is... patent citations? Fine, not my data, but whatever, a
> network is a network. 124,000 nodes, and the middle is empty -- "124,318
> nodes not drawn". So I can't even see the map. Right.
>
> Groups. I'm looking for a button that says "Communities" or "Clusters" or
> "Segments". Left side has "In this project" and a long "Catalog" list.
> There's a heading "Community" halfway down -- Girvan-Newman, Label
> propagation, Leiden, Louvain. I know Louvain, that's the Gephi one,
> "modularity". I'd click Louvain. It says "under a minute", that's nice, I
> like that it tells me before I click.
>
> Girvan-Newman "over a day" -- ha. Good that it warns me. I'd never click it
> anyway.

She clicks Louvain in the Catalog (the Queued frame shows what that does).

> It's queued behind PageRank. I didn't start PageRank, somebody did, fine.
> "Edges read as undirected" -- OK, sure, I don't know if that matters for
> patents. "Resolution 1.0" -- skip, defaults. "Its color layer is added when
> it runs." Good, so it'll colour them. That's what I want.
>
> So now I wait. And then... what? I'm scrolling the frames at the top for
> one where Louvain finished. There's "Finished" but that's Betweenness on a
> protein network. There's "Out of date" where Louvain has a Re-run button.
> I never see a Louvain result. I don't know how many groups I'd get, what
> they're called, how big they are. In Gephi I'd get the modularity report
> with the count and a histogram of sizes. Here the Finished panel for
> Betweenness has a distribution and "Top nodes" -- if Louvain gave me "Top
> groups, by size", that's literally question one.

Moderator note: the results panel has no finished community result, so she
cannot see the group list the run would produce. She moves on.

**Styles list (protein network, "module color").**

> OK, this one has colours. Frame 8 and 9 -- "module colors win". And the
> legend in the corner: Ribosome 56, Proteasome 40, Complex I 35,
> Spliceosome 32, DNA repair 30, "4 more". That's -- yes, that is exactly
> the thing. Groups, with names and counts, biggest first. That legend I
> could screenshot for a slide.
>
> But wait. "module" is an attribute, it came with the data -- it's in the
> Attributes list on the right, "module, 9 values". So the tool didn't find
> these groups, the file already had them. Like my colleague's notebook: she
> does the clustering, I import the labels. Which, honestly, is how I
> actually work, so fine. But if I have a raw mention export with no labels,
> where does "Ribosome" come from? Louvain would give me "Community 7",
> won't it. And then I'm back to "why is someone in cluster 7".
>
> "4 more" -- I'd click that, I want all nine. I assume it opens.

**Inspector (the DNA repair set).**

> The biggest group is Ribosome, 56. How do I select it? I'd try clicking the
> Ribosome row in the legend. I'm not sure that does anything -- nothing on
> the legend looks clickable. The Inspector page shows "DNA repair" selected,
> but that one is a set somebody made on the left, "DNA repair, rule, 30",
> with "Rule: module = DNA repair". So to look at Ribosome I have to make a
> set first? Plus button next to "Sets and paths", I guess, then some rule
> builder. That's an extra step I didn't expect for "show me this group".

She reads the DNA repair set in the right panel as a stand-in for the
biggest group.

> OK this is actually useful. "edges inside 105, edges out 42, neighbors out
> 40, average degree 8.4". So it's pretty tight -- most of its links are
> inside. "Members by degree": TP53 32, #2 of 300; BRCA1 13; WRN 13. Good, a
> ranked list inside the group. That's my shortlist for that segment.
>
> But the question is what makes it *different*. Different from what -- the
> rest? The average degree of the whole graph is 8.41 and this group is 8.4.
> I had to go find that in the other screen and do the maths in my head. So
> it's... not different on connectedness? I'd want a line that says "this
> group vs everyone else": average degree, share of edges inside, which
> attributes are over-represented. For my data that'd be "82% run
> marathons, mostly Denver". That's the messaging doc. Nothing here does the
> comparison for me; it just gives me the group's own numbers.
>
> "#16 to #23 of 300" for BRCA1 -- a tie range, fine, took me a second.
>
> And where's the table? I want the 56 Ribosome members with degree and
> group label as a CSV. "27 more" under Members, and there's an Export row at
> the very bottom with two little icons. Is that the picture or the table? I
> hit export last time and got a picture.

Off-topic drift:

> Brandwatch does "audience clusters" and at least it names them from bio
> keywords. Half the time they're garbage names, but they're names. And we
> already pay for it, so the bar for another tool is: does it explain the
> group better. This doesn't yet, it explains the numbers.

Scale question:

> And this was 300 proteins. The patent one had 124,000 and it didn't draw.
> My mention exports are 5 to 80 thousand. Would I see the coloured groups
> at all, or just "not drawn, narrow the graph"? That's the hairball problem
> the other way round -- no picture at all.

## Outcome

Partly done. She found where groups come from (Louvain in the Catalog, with
a time estimate she liked) and, on a different network, a legend listing
named groups with sizes, biggest first. She could read one group's internal
numbers and a ranked member list. She could not see what a finished
community run produces, could not find a one-step way to select the biggest
group from its legend, and had to compare the group to the whole graph by
herself; she answered "what makes it different" only as "it's about as
connected as everything else, and TP53 is its hub", with low confidence.

Single Ease Question: 3 of 7.

Would she use it instead of her current tool?

> Not yet. The legend with counts and the group stats are better than
> Gephi's, honestly -- Gephi never tells me "edges inside versus out". But
> the part I get paid for is the second half of the question, the "what
> makes them different", and here I'm doing that in my head. If clicking a
> group gave me "this group versus everyone" and a CSV of its members, I'd
> try it on a real export. Also I'd need to know my data stays on my laptop
> before I put customer stuff in it.

## Problems observed

1. No finished community result anywhere: after Louvain she cannot see the
   number of groups, their sizes, or names. (severity 3)
2. No "compare this group with the rest" -- the set's statistics are
   absolute; she had to find the graph-wide average elsewhere and subtract.
   (severity 3)
3. Selecting a group from the legend is not offered; the only group shown
   in the Inspector is a set made by a rule, which implies a set-building
   step she did not expect. (severity 2)
4. Group names came from an attribute in the data; nothing shows how a
   computed community would be named or described. (severity 2)
5. The Export row in the Inspector gives no hint whether it exports a
   picture or the member table. (severity 2)
6. On the 124,318-node graph nothing is drawn, so the colour-by-group map
   cannot be seen at her usual scale. (severity 2)
