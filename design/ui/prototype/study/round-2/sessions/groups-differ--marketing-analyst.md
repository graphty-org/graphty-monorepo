# Session: "What groups are there, and what makes the biggest one different?" -- Jordan, marketing network analyst

Participant: Jordan, a growth-marketing analyst who does "the network stuff" one or two days a
week (Gephi, NodeXL, a colleague's networkx notebook, a social-listening suite).

Task, as the moderator gave it: "What groups are there in this network, and what makes the biggest
one different?"

Screens used: the Results panel mock (starting on its first frame, then the finished Louvain frame
and the communities table frame), the Styles list and the Inspector. The mock's dataset changes
between frames (patent citations in the first, a 300-protein interaction network after that); the
moderator told Jordan to treat the protein network as "the network" for the task.

Renders looked at: `shots/screens__results-panel.png`, `shots/record/jordan-gd-not-run.png`,
`shots/record/jordan-gd-louvain.png`, `shots/record/jordan-gd-louvain-table.png`, `shots/screens__styles-list.png`,
`shots/screens__inspector.png`, `shots/record/inspector-set.png`.

## Transcript (think-aloud)

**1. The first screen.**

> OK. So there's... nothing on the map. There's a PageRank thing running, blue bar, "under a
> minute". Fine. Down at the bottom it says 124,000 nodes not drawn because it's more than the
> browser draws. Honestly? Better than Gephi freezing on me. At least it tells me.
>
> But I'm asked about groups. I'm not going to touch PageRank. Left side... "Catalog", and there's
> a heading "Community". That's clusters. Good, it's a word I know, not some icon I have to hover.
>
> Under it: Girvan-Newman "over a day" -- nope, not clicking that. Label propagation, no time on
> it, weird. Leiden, under a minute. Louvain, under a minute. I know Louvain is the one Gephi
> uses when you hit Modularity, I think? The YouTube guy said Louvain. Leiden I've heard is
> "better Louvain" but I couldn't tell you why. I'd pick Louvain because it's what I know, and I'd
> kind of wish there was a line that just said "use this one if you don't know".

She also clocks, without being asked, the left rail: "Assistant -- Off. Nothing is sent."

> Oh, "nothing is sent". Is that about my data or just the AI bit? I'd want that answered before I
> put a customer list in here. For a public mention export I don't care.

She clicks Louvain in the catalog. (The moderator moves to the finished Louvain frame.)

**2. Louvain has run.**

> Right, so now it's colours. That looks like the Gephi map, which is what I'd show a VP. Legend
> bottom right: Community 1, 62. Community 2, 43. Community 3 and 4, 36 each. "6 more".
>
> "Community 1". OK, so they're numbers. In Gephi they're numbers too and I rename them by hand
> in PowerPoint. I'd love it to at least guess a name. Hold on -- in the panel it says "Groups,
> 10 communities". Ten. Largest, 62 proteins. "Single proteins: 2, no interaction". So really
> eight groups and two loners. Good, it just told me that instead of me finding two dots in a
> corner and wondering.
>
> "Modularity 0.716." Yeah, I know that one -- over like 0.4 is decent, I think. "The file's
> modules 0.663." What's the file's modules? The data came with its own groups? Oh -- like when
> my export already has a "segment" column. So it's saying its clusters are tighter than the ones
> that came in the file? I think? That's actually a slide. But the label "the file's modules" I
> had to reread three times.
>
> There's a Run record box open with "Seed 7", "Normalization: modularity divided by twice the
> total confidence of all edges". I'm skipping that, that's for my data-science guy. The "Seeded"
> thing with the little i -- the tooltip says a different seed can put some people in different
> groups. OK. That's honest. Gephi just gives you a different answer every time and never says
> so, and then my boss asks why cluster 7 moved.

**3. Looking for "what makes the biggest one different".**

> So which one's the biggest -- Community 1, 62. Now what's special about it. On the map it's...
> the orange-yellow one? There's orange-yellow bottom right, and yellow at the bottom, and I
> genuinely can't tell which yellow is which. In greyscale on the printout that's dead.
>
> Is there a table? "Communities table" -- there, with a little grid icon. Clicking that.

(The moderator moves to the communities table frame.)

**4. The communities table.**

> OK. OK, this is the thing. One row per group. Size, edges inside, edges out, density, some
> log-fold-change column, hub, module. And "Export table as CSV" right there at the top. That's
> the thing I spend twenty minutes doing in the notebook -- counting per cluster.
>
> Reading Community 1: 62, 232 edges inside, 93 out. Density inside 0.123 -- that's the lowest in
> the list, everyone else is 0.16 to 0.25. So the biggest group is the loosest? Big but not
> tight. That's the "big audience that doesn't talk to each other" story. I'd say that in a
> meeting. Though I'm only guessing density means "how much of the possible talking actually
> happens". Nobody told me that on the screen.
>
> 93 edges out is the most out of anyone too. So it's the most connected to the other groups? Or
> it's just the biggest so of course. I'd want that as a percent, honestly. 93 out of 325.
>
> Hub: AKT1, "highest degree". In my world that's just "the account with the most connections".
> Which is exactly the vanity-metric thing -- I want to know who's the bridge, not the biggest.
> But fine, as a label for the group it's useful: "the AKT1 cluster".
>
> Module: "Ribosome 56 of 62, from the file; most members". Oh, nice. So it tells me the biggest
> group is mostly what the file already called Ribosome, 56 of the 62. In my data that'd be like
> "mostly runners, 56 of 62". That's the name for the segment. That's the answer to "what makes
> it different" -- or half of it.
>
> The log2FoldChange column -- "mean, vs the rest". +0.02 vs +0.09. I don't know what that
> measure is, it's a biology thing. But the idea -- this group's average against everybody else's
> -- is exactly what I want for followers, or engagement rate, or churned-yes-no. My question is:
> who picked THIS column? Can I pick mine? I don't see a way to add a column or swap it. There's
> no "+" on the header, no column picker. If it only ever shows one number column that somebody
> chose, I'm back in the notebook for the real segment profile.

She tries to click the Community 1 row.

> Clicking the row selects those people on the map, the note says. Good. Then I want the list of
> the 62, sorted by... whatever my influence score is, so I can grab the top ten from the biggest
> cluster. Where does that go? The right side still just says Interactions graph, statistics.

(The moderator shows the Inspector page. Its set frame shows a group's members "by degree, 27
more" and its intro says a community offered by a run "is not drawn yet".)

> So if it were a saved set I'd get "Members by degree", three names and "27 more". "27 more" --
> I click that and get what, the table? Probably. But for my Louvain cluster, you're telling me
> that panel doesn't exist yet. So I can see the group in the table but I can't open the group
> itself. Hm.

**5. Styles, briefly.**

> The styles list -- layers, betweenness colour, degree size, module colour. That's for making the
> picture. I'd go there after, to make the big cluster pop for the deck. Not for this question.
> The "Colorblind safe" and "Print" looks in there, if they work, fix my yellow-vs-yellow problem.
> I didn't need it for the answer, though.

## Her answer to the task

> "There are eight real groups plus two loners -- ten communities, Louvain, seed 7. The biggest one
> is Community 1, 62 members. It's mostly the file's Ribosome group, 56 of 62, its hub is AKT1,
> and it's the loosest group -- lowest density, 0.123 -- with the most links out to the other
> groups. On that one numeric column it's a bit lower than everybody else, +0.02 against +0.09,
> but I don't know what that column is so I wouldn't put it on a slide."

## Single Ease Question

**5 of 7.**

> Finding the groups was easy -- "Community" in the catalog, then the table. The "what makes it
> different" part I got, but only because the file already had a module column and someone had
> put one comparison column in for me. With my own data I'm not sure I'd get there.

## Would she use it instead of her current tool?

> Instead of Gephi for this question -- probably yes. The per-group table with a CSV button is the
> step I do by hand every time: Gephi gives me the colours, and then I go to the notebook to count
> who's in each cluster and what they have in common. This does the counting and even names the
> group by the column I brought.
>
> Instead of Brandwatch -- not yet, and that's not really the tool's fault. Brandwatch "does
> clusters" and we already pay for it. What would win it is if I can pick my own columns for that
> "vs the rest" comparison -- followers, engagement, churned -- because then I can finally say WHY
> someone landed in cluster 7, which is exactly the thing Brandwatch never tells me. And someone
> has to tell me, in plain words on the screen, whether my customer file leaves my laptop. Until
> then I'm only loading the public mention export.

## Problems she hit

1. **The group comparison shows only one pre-chosen data column (severity 3).** The table's
   "mean, vs the rest" column is fixed to one attribute (log2FoldChange) with no visible way to add,
   swap or choose columns. The task's second half -- what makes the biggest group different -- is
   answerable only for that column and the file's module column. She wants a profile of the group
   against the rest across the columns she brought (followers, engagement, churned).
2. **A community from a run cannot be opened in the inspector (severity 3).** Selecting a
   community row selects its members, but the inspector has no frame for a run's group: no member
   list, no "top members by" a chosen score, no export of that group's members. A saved set gets
   "Members by degree, 27 more"; a Louvain community gets nothing she can see.
3. **"The file's modules 0.663" is unreadable at first pass (severity 2).** She reread it three
   times before guessing it meant the grouping column already in the data. The comparison is the
   most useful sentence in the panel and its label hides it.
4. **Groups are named "Community 1..10" (severity 2).** She would rename them by hand for every
   deck. The table's "module, most members" column already holds a good default name ("Ribosome,
   56 of 62") that the legend does not use.
5. **Which community algorithm to pick is not explained (severity 2).** Four algorithm names under
   "Community" with run times; nothing says which to use by default or how Louvain and Leiden
   differ. Label propagation has no run time while its neighbours do.
6. **Similar colours for different groups (severity 2).** Community 1 (orange-yellow) and
   Community 8 (yellow) are hard to tell apart on the map and would merge in a greyscale printout.
   Finding the biggest group on the map took longer than finding it in the table.
7. **"density inside" and "edges out" carry no plain meaning (severity 1).** She guessed density
   right; she wanted edges out as a share of the group's edges (93 of 325) to judge whether "most
   links out" is just "biggest".
8. **"hub, highest degree" is a vanity measure for her (severity 1).** Fine as a group label, but
   she would rather see the member who bridges to other groups.
9. **"Nothing is sent" is ambiguous (severity 2).** The rail says "Assistant -- Off. Nothing is
   sent." She could not tell whether that covers her data or only the AI feature, so she would
   still hold back customer data.

## What worked for her

- The "Community" heading in the catalog: a task word she already uses, found in seconds.
- "10 communities ... single proteins: 2, no interaction" -- the loners are counted and named, so
  she does not have to hunt for stray dots.
- The communities table, one row per group, with "Export table as CSV..." on the same bar.
- "Module, from the file; most members: 56 of 62" -- the group is named by her own column, with a
  count she can defend.
- The seed is stated, with a tooltip admitting another seed can move people between groups.
- The canvas says plainly that 124,318 nodes were not drawn and why, instead of freezing.
