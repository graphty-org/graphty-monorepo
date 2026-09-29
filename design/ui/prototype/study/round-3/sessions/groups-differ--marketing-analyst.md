# What groups are there, and what makes the biggest one different -- Jordan, marketing analyst

**Participant:** Jordan, a growth-marketing analyst who "does the network stuff" one or two days a
week (simulated; see `study/personas/marketing-analyst.md`). Sceptical, busy, reads legends and
column headers, skims anything with a formula.

**Task as read by the moderator:** "What groups are there in this network, and what makes the
biggest one different?"

**Screens, in order (study view, 1440 by 900):**

1. The results panel with a finished Louvain run on a 300-protein interaction network, the run
   record open over the map (`shots/r3-jordan-groups-1.png`).
2. The same panel after she clicked "Communities table" (the moderator stepped the mock), with the
   communities table docked under the map (`shots/r3-jordan-groups-2.png`).
3. The styles list, first as it opens (`shots/r3-jordan-groups-3.png`), then the moderator showed
   the "comparing a group with the rest" state after she asked how to look at one group
   (`shots/screens__styles-list-group-compare--study.png`).
4. The inspector with a set selected (`shots/r3-jordan-groups-4.png`).

**Outcome:** finished with difficulty. Her answer: "Ten groups, but really eight -- two of them are
one protein on its own. The biggest is Community 1, 62 of them, and it's basically the ribosome
group, 56 of 62. It's actually the loosest of the big groups. On the fold-change number it's no
different from everyone else." She got the "what makes it different" part from the last column of
the table, not from the screen built for comparing a group with the rest, which showed her only two
numbers where the group looked the same as everyone else.

## Transcript

### 1. The results panel, run finished, run record open

> OK, "Human protein interactions." So this is biology. Not my world, but a network's a network,
> right? Clusters are clusters.

She looks at the middle of the screen.

> There's a map, sort of, but there's a big box sitting on top of it. "Run record." Method,
> "Louvain, weighted modularity, resolution 1." Seed 7. "Normalization: modularity divided by twice
> the total confidence of all edges." ... Yeah, no. I'm not reading that. That's a formula.

She closes the run record with the X.

> Better. Now I can see the map. Coloured blobs -- that's what I want, that's the Gephi picture.
> Colour by cluster. Good.

She looks at the left panel.

> Left side: "In this project" -- Connected components 3, Louvain 10, Betweenness. So Louvain is
> the clustering. I know Louvain, it's the one Gephi uses for "modularity class". Ten. Ten what?

She finds the "Groups" section in the middle panel.

> Oh, here: "Groups, 10 communities." OK, good, it actually says groups. Modularity 0.716 -- I know
> that one, higher is better, above like 0.4 is decent, so that's a clean split. "The file's
> modules 0.663" -- what's "the file's modules"? Is that another clustering? Someone else's? I
> don't know what I'm supposed to compare that to. I'll ignore it.
>
> "Largest: 62 proteins." "Single proteins: 2, no interaction." So two of the ten are just... one
> dot? Then it's not ten groups. That's eight groups and two strays. Why count them? If I put "10
> segments" on a slide somebody's going to ask me to name all ten.

She reads the top of the panel.

> "Seeded. Undirected. CPU." "Weight: confidence, higher = stronger link (your answer)." My answer?
> I don't remember answering anything. I guess someone set that up. "Details" -- no, that's the
> formula box again.

She glances at the catalog on the far left.

> Closeness says "WF-corrected". Eigenvector has a little warning, "3 components." I have no idea
> what either of those mean and I'm not going to click them. That's the "which of these little
> icons" feeling from Gephi Lite.

She looks at the legend in the bottom right corner of the map.

> Legend: Community 1, 62. Community 2, 43. Community 3, 36. Community 4, 36. "6 more." So...
> Community 1. That's the Brandwatch problem all over again -- cluster 7, cluster 1, doesn't tell
> me who's in it. I want a name. What do these people -- proteins, whatever -- have in common?

She looks for something to click.

> "Communities table." That's the word I want. Table. Clicking.

### 2. The communities table

> OK! A table. This is the thing I always want and never get. Sorted by size, it says. Community 1
> at the top, 62.

She reads the column headers left to right, slowly.

> Size, edges inside, edges out, density inside, log2FoldChange "mean, vs the rest", hub "highest
> degree", module "from the file; most members."
>
> Hub -- AKT1 for Community 1. I get hub. That's the biggest account in the cluster, basically.
>
> Module: "Ribosome, 56 of 62." Oh -- so that's the name. That's the column I wanted. Community 1
> is the ribosome people. Community 2 is Proteasome, 40 of 43. Complex I, Spliceosome, MAPK
> signalling, DNA repair... Honestly that's great. That's exactly "name the segment by what the
> members have in common." But it's the LAST column, way over on the right, and it only works
> because this file already had a "module" column in it. If it was my mention export there'd be no
> "module". I'd need to pick which of my columns -- like "country" or "follower tier" -- goes there.
> Can I? I don't see where.
>
> And why does the legend on the map still say "Community 1" when the table knows it's Ribosome?
> The legend is what goes in the screenshot. The VP is going to read "Community 1".

She compares Community 1 with the others.

> So what's different about the biggest one... Density 0.123. Everyone else is 0.16, 0.2, 0.25.
> So the biggest group is the loosest. That's kind of interesting -- it's big but not tight. Edges
> out, 93, the most, but it's also the biggest, so, whatever, I'd need a percentage.
>
> log2FoldChange: +0.02 vs +0.09. I don't know what fold change is. Something biology. It's a tiny
> number versus another tiny number. Is that different? Community 2 is +0.29 vs +0.04, that looks
> more different. I can't tell if any of this matters. There's no "this is a big difference" cue.
>
> Bottom two: Community 9 and 10, size 1, density "not defined", module "Unassigned". So yeah, the
> strays. At least it's honest about it.

She looks at the top right of the table.

> "Export table as CSV." Good. That's the table. Not a picture. Right? It says "table", so I
> believe it. But it's the community-level table -- ten rows. What I'd actually put in the brief is
> the member list, each person with their cluster name next to them. Where's that? "Nodes" tab
> maybe. I'd try that later.

Off-topic, while the moderator waits:

> This is honestly the part Brandwatch Audiences does for me -- it splits the audience and gives me
> a little card per cluster with bios and top words. It's worse at explaining why, but it's in the
> tool I already pay for. My VP reads slide one. Slide one is "here are four segments, here's what
> they talk about." Not a density column.

Laptop check: she notes the map is now squeezed into the top half.

> On my laptop the map's half the screen now. It's fine, the table's the useful bit anyway. But I
> couldn't screenshot the map for a slide like this.

### 3. The styles list

The moderator asks her to find out more about just the biggest group. She clicks the Graph icon in
the rail and gets the styles list.

> Wait. "Stress response study"? "ppi-core-300"? A second ago this was "Human protein
> interactions", "Interactions". Did I open a different file? Is this the same network?

The moderator says it is the same data.

> OK, if you say so. If this happened for real I'd stop and check. That's how I got burned with
> Talkwalker -- two screens, two numbers.

She looks at the screen.

> There's a list of links across the top, "1. Color by a result, 2. Stacked algorithms..."
> and a checkbox "Show annotations". Is that a menu? A tutorial? I'm skipping it.
>
> The map is all orange-brown now. "Betweenness color." My colours are gone. Where did the Louvain
> colours go? I didn't touch anything. And there's a panel open: "written by the run", "Edit a
> copy", Scale "Log", "Each value is divided by 0.000077, the smallest above 0, before the log."
> No. No no. That's the raw formula stuff I never click.
>
> Styles: Betweenness color, Hub labels, Degree size, Base style. Sets and paths: Hubs, TP53
> neighbours, Down in stress, TP53 to SMAD3. None of these is "Community 1". I don't see how to
> pick the biggest group from here.

The moderator steps to the "comparing a group with the rest" state and tells her she has selected
Community 1.

> OK, the colours are back. Right side: "Community 1, Community. Created from Louvain run, seed 7.
> Size 62 proteins, edges inside 232, edges out 93, density 0.123." Same numbers as the table. Good.
> Same numbers. That matters to me.
>
> "Compared with the rest. Descriptive only; no statistical test." I actually like that. Don't
> pretend. It's the "we can show potential, not prove the sale" thing.

She reads the two charts.

> log2FoldChange: little dot plot with boxes. Group median -0.02, rest 0.05. "Rank-biserial r
> -0.02, effect size, not a significance test." I have no idea what rank-biserial is. But -0.02
> sounds like nothing. So: no difference.
>
> Degree: group 9, rest 8. Also nothing.
>
> So according to this panel the biggest group is... not different? But the table told me it's 56
> of 62 ribosome and it's the loosest group. Neither of those is on this panel. The thing that
> actually makes it different -- what it IS -- isn't in the "what makes it different" box. I'd
> want "90% ribosome here versus, like, 2% in the rest" right at the top.
>
> There's a little sliders icon next to "Compared with the rest" -- maybe that picks which columns.
> I'd try it. If "module" isn't in there I'd give up on this panel and go back to the table.
>
> "Copy members." Copy to where? Clipboard? As what, names? I'd rather have a CSV with the cluster
> label on each row. And "Enrichment analysis isn't part of graphty" -- fine, don't know what that
> is, sounds like a biology thing.

The legend at the bottom left now also has "Size: number of connections (degree)" with dot sizes.

> Oh, this legend has the size key too. That's the thing I'd paste into PowerPoint. Still says
> "Community 1" though.

### 4. The inspector with a set selected

> Now "DNA repair", 30 nodes, "Rule set", rule "module = DNA re..." Colours changed again, black
> blob, orange blob. And the legend now says "Module color: Ribosome 56, Proteasome 40..." -- so
> THIS legend has names! Why didn't the Louvain one? Is "module" a different grouping from
> Louvain? Now I'm confused which grouping I'm supposed to be answering about.
>
> Members by degree: TP53 32, "#2 of 300". BRCA1 13, "#16 to #23 of 300". I like the rank thing,
> that's how I think. "27 more members" -- where's the full list?
>
> Project name's "Human protein interactions" again. Graph is "Interactions". So the styles
> screen was the odd one out.

She stops.

> I have my answer. I'll say it.

**Her answer:** "Ten groups, but really eight real ones plus two loners. The biggest is Community 1,
62 proteins, and it's mostly the ribosome ones -- 56 of 62. It's the loosest of the big groups,
density 0.12 where the others are 0.16 to 0.26. On that fold-change measure and on connections
it's the same as everybody else."

## After the task

**Single Ease Question:** 4 of 7.

> Middle. The table saved it. If the table hadn't had that module column I'd have been stuck on
> "Community 1" with a comparison panel telling me it's the same as everyone. And I was never sure
> which screen was which file.

**Would she use this instead of her current tool?**

> For clustering, maybe, over Gephi -- the table next to the map with the CSV button is the thing
> Gephi never gave me, and the numbers matched between the table and the side panel, which is more
> than I can say for Talkwalker. Over Brandwatch for a VP? Not yet. Brandwatch names the clusters
> for me, badly, but it names them. Here the name only showed up because the file already had a
> "module" column, and the map legend still said "Community 1". Give me: the legend uses the name,
> I choose which of my columns names a cluster, and a member CSV with the cluster name on every row.
> Then I'd try it on a real mention export. And somebody still has to tell me what happens with
> two million customers, and whether that data leaves my laptop -- "Nothing is sent" next to
> Assistant is nice, but that's about the assistant, not my file, right?

## Problems seen

1. **The comparison panel does not show what makes the group different.** It compares on two
   numeric columns where the group matches the rest; the real difference (56 of 62 from one module,
   lowest density of the big groups) is only in the table's last column. Severity 3.
2. **Communities are named "Community 1" in the legend and the side panel even when the table
   already knows a name** ("Ribosome 56 of 62"). The legend is what reaches a slide. Severity 3.
3. **The same data shows two project names and two graph names** ("Human protein interactions" /
   "Interactions" versus "Stress response study" / "ppi-core-300") between screens; she stopped
   trusting the numbers until told. Severity 3.
4. **Moving to the styles list lost the Louvain colours** and opened a betweenness layer editor
   with a log-scale formula she did not ask for; no visible route from there to "Community 1".
   Severity 3.
5. **Two single proteins are counted as communities** ("10 communities"), so the headline count
   is not the number she would report. Severity 2.
6. **Jargon with no plain reading in the first view**: "the file's modules 0.663", "WF-corrected",
   "rank-biserial r", "log2FoldChange", "(your answer)", the normalization formula in the run
   record. Severity 2.
7. **The run record opens on top of the map** in the first view, hiding the result. Severity 2.
8. **The name column works only because the file carried a "module" attribute**; nothing shows
   how she would pick her own column (country, follower tier) to name the clusters. Severity 2.
9. **No member-level export with the cluster label per row** was visible; "Export table as CSV"
   exports the ten-row community table, and "Copy members" does not say in what form. Severity 2.
10. **The styles-list page in the study view still showed the state links and "Show annotations"
    checkbox** above the app, which she read as a tutorial menu. Severity 1 (mock issue).
