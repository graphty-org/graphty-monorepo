# Session: what groups are there, and how is the biggest different -- Expert Emma

**Participant:** Expert Emma, network scientist, lives in notebooks (networkx, igraph, leidenalg),
uses Gephi for the final figure. See ../../personas/expert-emma.md.

**Task, as the moderator gave it:** "On the protein network, what groups are there, and how is the
biggest one different from the rest?" She did the same task in the previous round.

**Screens, in order:** the finished Louvain result with its run record open
(screens/results-panel.html#louvain), the communities table in the table dock
(screens/results-panel.html#louvain-table), the style stack page (screens/styles-list.html, first
frame, then the "compared with the rest" frame further down), a set's inspector
(screens/inspector.html#set) and a community's inspector (screens/inspector.html#group), the node
table ranked by three measures (screens/table-dock.html#ranked), and the comparison page
(screens/comparison.html).

**Renders she saw:** shots/tasks/groups-differ/01-results-panel-louvain.png,
02-results-panel-louvain-table.png, 03-styles-list.png, 04-inspector-set.png,
05-table-dock-ranked.png; plus study-view renders of styles-list.html#group-compare,
inspector.html#group and comparison.html.

---

## Think-aloud transcript

**Reading the task.** Same question as last time. Same answer to the framing, too: the groups are
not in the data, they are in the algorithm, the resolution and the seed. So I want those first, then
per-community numbers I can check, then "different on what" -- size, cohesion, and whatever the
biologist's attributes are. I remember roughly what I found last time, so this time I'm mostly
checking whether the things that annoyed me are still there.

**The finished Louvain result.** Left panel: "on: full graph, 300 nodes, 3 components. Seeded.
Undirected. CPU. Weight: confidence, used as similarity." Groups: 10 communities, modularity 0.716,
the file's modules 0.663, largest 62 proteins, single proteins "2, no interaction". Options:
resolution 1, seed 7.

Headline still says 10. Eight of them have edges. The "2, no interaction" line is right there, two
rows down, and I'll grant that I'm the kind of reader who reads two rows down. The biologist is not.

Run record popover. Method "Louvain, weighted modularity, resolution 1". Normalization "divided by
twice the total confidence of all edges" -- so 2m with m the total weight, Newman convention, not the
Gephi inversion. Still not written as "gamma" and still no "higher means more, smaller groups". I
infer it from the normalization line, again. "Weight conversion: confidence used as given, 0.40 to
0.99, as similarity, higher = stronger link." Good.

There's a new line, or new to me: "Numbering: By size, largest first; a protein with no interaction
is a community of its own." Okay. That at least says out loud why there are two groups of one. It's
in the run record, which is where I'd look, so fine. It doesn't make "10" less wrong as a headline,
but it stops anyone saying they didn't know.

"Re-run (keeps Run 1)" is greyed out. Nothing changed, so nothing to re-run. Fine. What I'd actually
want there is "run 10 seeds", and it isn't there.

**The communities table.** Opens as a tab in the dock, "Communities: Louvain". First line: "Full
graph: 10 communities, 2 of them a single protein. Sorted by size." That's better -- the table leads
with the caveat. Columns: size, edges inside, edges out, density inside, log2FoldChange "mean, vs
the rest", hub "highest degree", module "from the file; most members".

Checking it, because I check everything. Sizes: 62+43+36+36+31+31+30+29+1+1 = 300. Edges inside:
232+156+142+104+109+82+97+104 = 1,026. Edges out: 93+56+63+44+59+60+56+41 = 472, halved is 236
between. 1,026 + 236 = 1,262. Matches the overview. Density for Community 1: 232 over 62 choose 2 =
232/1,891 = 0.123. Correct. Still adds up. Good.

So, what groups are there: eight real communities of 29 to 62 proteins, each mostly one of the file's
modules -- Ribosome 56 of 62, Proteasome 40 of 43, Complex I 35 of 36, Spliceosome 32 of 36, MAPK
signaling 31 of 31, TGF-beta 21 of 31, Cell cycle 29 of 30, DNA repair 29 of 29 -- plus GSK3B and
NOTCH1 on their own. TGF-beta is the sloppy one. First half of the question: about a minute. Same as
last time, which is to say fast.

Still no agreement number between the Louvain partition and the file's modules. "Most members" is a
majority vote per row. It can't show me a module split across two communities. I'd still go to
adjusted_rand_score for that.

Still nothing that says each community is connected inside. The catalog is the thing that told me
Louvain can leave a group in pieces. The result should tell me it didn't.

**How is the biggest one different -- from the table.** Community 1: 62, density 0.123. The lowest in
the table. Same trap as last time. Density falls with size; you can't compare 0.123 at 62 nodes with
0.256 at 29 nodes. Doing it by hand again:

- average internal degree, 2 x inside / size: C1 7.5, C2 7.3, C3 7.9, C4 5.8, C5 7.0, C6 5.3, C7 6.5,
  C8 7.2. So Community 1 is second highest, not lowest.
- conductance, out / (2 x inside + out): C1 93/557 = 0.17. The others run 0.15 (C2) to 0.27 (C6).
  Community 1 is among the tightest.

So the only cohesion column in the table says "loosest", and the two numbers I'd actually use say
"one of the tightest". That's not a nitpick. That is the sentence a junior puts in the report. The
table has everything needed to compute it -- it just doesn't.

Hub: AKT1, "highest degree". I asked last time: degree inside, or degree overall? The header still
doesn't say.

log2FoldChange +0.02 vs +0.09. No difference on expression.

**Detour: the style stack page.** The first frame I'm handed on styles-list is betweenness painted as
color on a project called "Stress response study", graph "ppi-core-300". Nothing to do with
communities. I don't know why I'm looking at this for this task. Log scale, "each value is divided by
0.000077, the smallest above 0, before the log" -- that's an honest note about the log, I'll give it
that, and "on a straight scale 289 of 300 proteins would share the lightest of the 5 colors" is a
good reason for the log. But not my question. Same numbers as the other project -- 300, 1,262 -- so I
assume it's the same file under a different project name, and I stop for a second to make sure I
didn't open something else. Same as last time.

Further down the page there's a frame with Community 1 selected and "Compared with the rest". That's
what I'm after, although finding a statistical comparison on the page about styles is odd.

**Compared with the rest.** Community 1: created from Louvain run, seed 7. Size 62, edges inside 232,
out 93, density 0.123. "Descriptive only; no statistical test. 62 proteins in Community 1, 238 in the
rest." Still the right call: the partition was fit on this graph, so a test of degree against it is
circular.

log2FoldChange box and strip: median -0.02 vs 0.05, IQR -0.61 to 0.75 vs -0.69 to 0.85, rank-biserial
r -0.02. Degree: median 9 vs 8, IQR 7-10 vs 6-10, r 0.14. Rank-biserial is what I'd use. "Effect size,
not a significance test." Good.

And the sign problem is still here. Table: +0.02 (mean). This panel: -0.02 (median). Same group, same
column, opposite signs. On the comparison page -- a different, payments dataset -- the communities
table and the comparison both use "Median PageRank", one statistic in both places. So somebody fixed
it there and not on the protein data. Or the two pages disagree about which is right. Either way, on my
data it's still two numbers with two signs.

Density sits here too, 0.123, with no "the rest" beside it and nothing that would stop me reading it
as loose.

**The community's own panel.** Clicking Community 4 in the legend: "Community 4, 4 of 10", with
arrows, and a "Compare with the rest" button right under the name. Good, that's where I'd look for it.
Attributes: 36 nodes, edges inside 104, out 44, "log2FoldCha" -- still cut off -- "-0.10, mean; rest
of graph +0.10". Mean again. So the community panel says mean, the comparison says median. "Created
from Louvain run, conf..." truncated too. At 125 percent zoom in the evening that's going to be worse.

Clicking the button in the mock doesn't take me anywhere. I assume it gets me to the frame I just saw.

**The set panel.** The DNA repair set -- the file's module as a rule set, 30 proteins, not the Louvain
community -- has a "Statistics" block I haven't seen before: edges inside 105, edges out 42, neighbors
out 40, average degree 8.4. Check: (2 x 105 + 42) / 30 = 8.4. So that's average total degree, not
internal. Internal would be 7.0. From edges inside and out I can get conductance, 42/252 = 0.17.
"neighbors out 40" vs "edges out 42" -- distinct outside proteins against edges. Nice, that's a real
distinction and it's labelled.

But: the set gets "Statistics" with average degree and neighbors out; the community gets
"Attributes" with density and a mean fold change. Same kind of object from where I sit -- a bunch of
proteins -- and two different sets of numbers under two different headings. If the community had
"average degree inside" and "neighbors out" I'd have been done ten minutes ago.

**The node table.** Nodes ranked by degree, betweenness and PageRank, with a community column and a
module column. The column headers say which run: "Louvain weighted, seed 7, full graph",
"betweenness exact, unweighted", "PageRank damping 0.85, unweighted". I like that the headers carry
the settings. I note that Louvain was weighted and the centralities weren't, which is fine but it's
the kind of mismatch a reviewer asks about.

And here's the actual answer to the "hub" question. AKT1: module "Unassigned", community "Community
1", degree 24, #4= of 300. HSP90AA1: Unassigned, Community 1, degree 21. RPL28: Ribosome, Community 1,
degree 17. So the hub of the "ribosome" community is not a ribosomal protein. Louvain pulled AKT1 and
HSP90AA1 -- promiscuous hubs with no module in the file -- into the biggest group. That's the six
non-ribosome members out of 62, or at least two of them. That is the most interesting thing about
Community 1 and the table's "hub" column hid it by making it look like AKT1 is what the group is
about. I had to join two tables in my head to see it.

It also explains the degree comparison: median 9 vs 8 is small, but the group carries two of the top
ten hubs. The difference is in the tail, and a box plot with medians is the wrong summary for a tail.

**The comparison page.** Rankings against rankings, scatter, Spearman, top-k overlap. On the payments
data there's a communities table with a row menu: "Compare Community 1 with the rest", "Select
members", "Filter to Community 1". On my protein communities table I don't see that menu. So on one
dataset I get to the comparison from the table row and on mine from the legend or the panel. I
wouldn't have known to right-click; I only know because I saw it on the other data.

Still nothing for comparing two partitions -- the picker leaves Louvain communities out. So no Louvain
vs the file's modules, no seed 7 vs seed 8.

**My answer to the moderator.** Louvain, weighted by confidence, resolution 1, seed 7, Q = 0.716:
eight communities of 29 to 62 proteins plus two unconnected proteins (GSK3B, NOTCH1). Each lines up
with one of the file's modules; TGF-beta is the loosest match (21 of 31). The biggest, Community 1, is
the ribosome (56 of 62) plus a few proteins the file doesn't assign to any module -- including AKT1 and
HSP90AA1, two of the ten most connected proteins in the network. It is not looser than the others:
its lower density is a size effect; average internal degree (7.5) and conductance (0.17) put it among
the tightest. On log2FoldChange it is no different from the rest (r = -0.02), and on degree only
slightly higher (r = 0.14), with the difference coming from those borrowed hubs. I'd rerun with Leiden
and several seeds before I believed the eight.

Better answer than last time, and the tool helped more this time -- the node table with module and
community side by side is what got me the AKT1 point. But cohesion is still my arithmetic, not the
tool's.

---

## Single Ease Question

**5 of 7.** Listing the groups is quick and the numbers check out. The "how is it different" half
still costs me: the table's only cohesion column points the wrong way, the fold change is a mean in
two places and a median in the third with opposite signs, "hub" hides that the hub isn't a member of
the group's module, and the comparison lives on a frame of the styles page. The new set statistics
show the tool can do average degree and neighbors out -- it just doesn't do them for communities.

## Would she use this instead of her current tool?

"For the analysis, no. That's still leidenalg, a seed sweep, adjusted_rand_score against the curated
modules and twenty lines of pandas, and this does none of the three. For handing it to the biologist:
yes, and a bit more yes than last time. The communities table, the node table with community and
module side by side, 'descriptive only, no test' and 'Copy members' for enrichment -- she could find the
AKT1 thing herself with that. But I'd have to tell her not to read the density column, and I don't want
to have to tell her anything. Fix the cohesion column and the mean/median thing and I'd send it this
week. And I still want to drive it from the notebook."

---

## Problems found

1. **Density is still the only cohesion column in the communities table, and it scales with size.**
   (results-panel, communities table; also the comparison frame.) Community 1 reads as the loosest
   (0.123) though its average internal degree (7.5) is second highest and its conductance (0.17) is
   among the lowest. The set inspector already shows average degree and neighbors out; the community
   gets neither. Severity 3.
2. **Mean in the table and community panel, median in the comparison, opposite signs for the same
   group.** (results-panel table: +0.02 mean; inspector group: mean; styles-list comparison: -0.02
   median.) The payments comparison page uses one statistic in both places, so the protein pages
   disagree with the product's own rule. Severity 3.
3. **"hub, highest degree" hides that Community 1's hub is not in the group's module.**
   (results-panel table vs table-dock ranked.) AKT1, "Unassigned" in the file, is the hub of the
   "Ribosome" community; she only saw it by joining the node table and the communities table in her
   head. The header still does not say whether it is degree inside or overall. Severity 3.
4. **Headline still says "10 communities".** (results-panel, Louvain result.) The table's first line
   and the run record's numbering line now explain the two single proteins, which helps, but the
   number the eye lands on is still 10. Severity 2.
5. **No agreement measure between the partition and the file's modules, and no partition-to-partition
   comparison.** (results-panel table; comparison, whose picker excludes groupings.) "Most members" is a
   majority label, not ARI or NMI. Severity 3.
6. **The group comparison is reached differently on different data.** (comparison page: a row menu
   "Compare Community 1 with the rest" on the payments communities table; protein communities table: no
   such menu; protein data: the button on the community panel, and the result shown on a frame of the
   styles page.) Severity 2.
7. **Set and community panels show different numbers under different headings.** (inspector set:
   "Statistics", edges inside/out, neighbors out, average degree; inspector group: "Attributes", size,
   edges inside/out, fold-change mean.) Same kind of object to her; she can't compare a module with a
   community on the same terms. Severity 2.
8. **No statement that each community is connected inside.** (results-panel, Louvain result.)
   Severity 2.
9. **No seed-stability check.** (results-panel, Louvain result: "Re-run" re-runs one seed.)
   Severity 2.
10. **Resolution convention only inferable from the normalization line.** (run record.) Severity 1.
11. **Truncated labels.** (inspector group: "log2FoldCha", "Louvain run, conf...".) Worse at 125
    percent zoom. Severity 1.
12. **Project name changes between frames on the same numbers.** ("Human protein interactions" vs
    "Stress response study, ppi-core-300"; the styles frame given for this task is a betweenness color
    layer unrelated to communities.) Severity 1.
13. **Louvain weighted, centralities unweighted, side by side.** (table-dock ranked.) Labelled, which is
    good, but nothing flags the mismatch when the columns are read together. Severity 1.

## What she liked

- The communities table still adds up exactly: sizes to 300, inside plus between to 1,262, densities
  check.
- The table now leads with "10 communities, 2 of them a single protein", and the run record says why a
  lone protein is a community.
- Node-table column headers carry the run's settings ("Louvain weighted, seed 7, full graph",
  "betweenness exact, unweighted").
- Community and file module side by side in the node table -- that's where the AKT1 finding came from.
- "neighbors out" kept apart from "edges out" in the set panel.
- "Compare with the rest" on the community's own panel, directly under its name.
- "Descriptive only; no statistical test", rank-biserial r with a one-line meaning, "Copy members" for
  enrichment instead of a half-built one.
- The log scale note on the color layer: what it divided by, and how many proteins a straight scale
  would have lumped together.
