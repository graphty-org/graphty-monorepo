# Genetic Genealogists: DNA Shared-Match Networks and Clusters

## Summary

A consumer DNA test (AncestryDNA, 23andMe, MyHeritage, FamilyTreeDNA, or an upload to GEDmatch) gives the tester a
**match list**: every other customer who shares DNA with them, each with an amount of shared DNA in centimorgans (cM),
the unit genealogists use to estimate how close a relationship is. Each vendor also answers a second question for any
one match: which of the tester's other matches share DNA with that match too. The vendors call this "Shared Matches"
(Ancestry), "In Common With" (FamilyTreeDNA), "Relatives in Common" (23andMe), "Shared DNA matches" (MyHeritage) and
"People who match both kits, or 1 of 2 kits" (GEDmatch)
([Family Locket, 10 ways](https://familylocket.com/10-ways-to-group-your-dna-matches-into-genetic-networks)).

Put the two together and the tester has a graph. **Each node is one match**, sized by the cM it shares with the
tester. **An edge joins two matches who share DNA with each other.** The tester is the center of everything and is left
out of the graph, because every match is connected to them by definition. Matches who descend from the same ancestral
couple share DNA with each other more often than with matches from other lines, so the graph falls into dense groups.
Genealogists call these groups **clusters** and read each one as a family line: at best the four grandparent lines or
the eight great-grandparent couples, labeled from the family trees of the cluster's members
([Your DNA Guide, Leeds method](https://www.yourdnaguide.com/?p=519);
[Family Locket, Gephi part 5](https://familylocket.com/creating-network-graphs-with-gephi-part-5-analyze-the-network-graph)).

Three ways of drawing the same graph are in use:

- **The Leeds method**, a spreadsheet colored by hand, one column per cluster, built from matches sharing more than 90
  and less than 400 cM ([Your DNA Guide](https://www.yourdnaguide.com/?p=519)).
- **The clustered matrix** (AutoClusters), a match-by-match grid reordered so each cluster becomes a colored square on
  the diagonal, with gray cells for matches that fall in more than one cluster. Genetic Affairs built it in 2018;
  MyHeritage shipped it to subscribers in February 2019
  ([MyHeritage](https://magazine.myheritage.com/myheritage-news/introducing-autoclusters-for-dna-matches/)); GEDmatch,
  23andMe and, in July 2025, Ancestry followed with their own matrix views
  ([DNA Explained, Ancestry clusters](https://dna-explained.com/2025/07/10/how-to-use-ancestrys-new-match-clusters-and-what-they-mean/)).
- **The node-link network graph**, which hobbyists build themselves in Gephi from two CSV files, following multi-part
  blog tutorials ([Family Locket, Gephi part 1](https://familylocket.com/creating-gephi-network-graphs-part-1-gather-matches-and-prepare-spreadsheets);
  [DNA-Sci, Gephi from GEDmatch](https://dna-sci.com/2020/08/19/auto-clusters-in-gephi-using-data-from-gedmatch/)).

The work differs from anything else in this research in five ways that matter to graphty:

1. **The input is two tables, not a graph file**: a match list (one row per match) and an in-common-with list (one row
   per pair), both vendor exports or third-party downloads, with vendor-specific columns.
2. **Filtering by a cM band comes before anything else.** Close relatives (over about 400 cM) connect to every cluster
   and smear them together; distant matches (under about 30-50 cM) add random edges. Every method sets a band, and the
   band is the main knob.
3. **One match can belong to several clusters**, for good reasons (a double cousin, a close relative of the tester,
   intermarried lines). Every matrix tool shows this with gray cells, and Gephi's one-label-per-node modularity cannot.
4. **Clusters are labeled from outside the graph**: the ancestral couple most common in the members' family trees.
5. **The method fails for endogamous communities** (Ashkenazi Jewish, Acadian, Polynesian and others), where every match
   shares background DNA with every other, and practitioners need to recognize that before they waste a week.

The population is very large (around 57 million kits across the five main databases in March 2026, by The DNA Geek's
counts), but most testers only ever see the vendor's own cluster view. The people this document is about are the
smaller group who clean, filter, cluster and label match networks themselves: serious hobbyists, volunteer "search
angels" who help adoptees find birth parents, professional genetic genealogists, and researchers from endogamous
communities who have to adapt every method.

## 2. Population

### 2.1 Size

| Evidence | Figure | Source |
| --- | --- | --- |
| Kits in genealogical matching databases, March 2026 | AncestryDNA about 30 million (projected "any day now"); 23andMe "a little under 14 million"; MyHeritage 9.6 million; FamilyTreeDNA just under 1.8 million; GEDmatch about 2.2 million (projection) | [The DNA Geek, March 2026](https://thednageek.com/database-sizes-march-2026/) |
| Ancestry subscribers and DNA network, 2025 | About 3.8 million subscribers; about 29 million people in the DNA network | [Ancestry 2025 Impact Report](https://www.3blmedia.com/news/generations-come-ancestry-publishes-2025-impact-report) |
| MyHeritage AutoClusters | Built into MyHeritage for Premium, PremiumPlus and Complete subscribers, February 28, 2019; $29 one-time per uploaded kit | [MyHeritage](https://magazine.myheritage.com/myheritage-news/introducing-autoclusters-for-dna-matches/) |
| Ancestry Matches by Cluster | Pro Tools feature rolled out from July 2025, staged access until December 2025, in beta | [DNA Explained](https://dna-explained.com/2025/07/10/how-to-use-ancestrys-new-match-clusters-and-what-they-mean/) |
| GEDmatch clusters | Offered with Genetic Affairs to Tier 1 subscribers ($10 for one month) of a site then reporting 1.1 million users | [Verogen 2021](https://verogen.com/gedmatch-partners-with-genetic-affairs-to-offer-new-tools-for-users/); [Family Locket, 10 ways](https://familylocket.com/10-ways-to-group-your-dna-matches-into-genetic-networks) |
| Unknown-parentage volunteers | DNA Detectives, a Facebook group of search angels, "over 70,000 members" in 2017 and over 100,000 in later reports | [Adoption.com](https://adoption.com/what-you-need-to-know-about-using-a-search-angel); [Vice](https://motherboard.vice.com/read/facebooks-dna-detectives-are-helping-adoptees-find-their-birth-parents) |

**How many build networks themselves.** No source counts Gephi users among genealogists, and no vendor publishes how
many people run its cluster tool. The proxies are the number of tutorials and tools aimed at them: Family Locket's
Gephi series runs to at least five parts plus a DNAGedcom 4 update, DNA-Sci's GEDmatch walkthrough dates from 2020,
Family Locket lists ten distinct ways to group matches (two of them node-link graphs), and DNA Painter keeps an index of
clustering lectures covering six cluster tools ([DNA Painter, grids and matrices](https://dnapainter.com/grids-and-matrices)).
Treat the do-it-yourself network builders as a small, highly motivated slice (thousands to tens of thousands, not
millions) of a population of millions who see clusters only as a vendor feature. The size claim is an inference from
those proxies; no source states it.

### 2.2 Skill profile

- **Domain knowledge high, graph literacy low.** They know the Shared cM Project ranges, triangulation and pedigree
  collapse well. They learned "modularity", "resolution" and "ForceAtlas 2" from one blog series and use them as
  recipes (Family Locket's tutorial gives exact settings to copy:
  [part 2](https://familylocket.com/creating-network-graphs-with-gephi-part-2-importing-spreadsheets-and-layouts)).
- **No coding.** Data arrives as CSV from a download tool and is edited in Excel: headers renamed so Gephi recognizes
  them ([part 1](https://familylocket.com/creating-gephi-network-graphs-part-1-gather-matches-and-prepare-spreadsheets)).
- **Voluntary, long-running work.** A case (an unknown grandfather, a brick wall) runs for weeks or years; the network
  is rebuilt each time the match list grows.
- **Sensitive data about other people.** Every node is a living person who did not consent to appear in someone
  else's chart.

### 2.3 Sub-populations

1. **Serious hobbyists** sorting their own matches into grandparent lines to break a brick wall (the existing
   family-historian-dna persona).
2. **Unknown-parentage searchers and search angels**: adoptees, donor-conceived people and people surprised by a
   test result, and the volunteers who help them. Clusters tell them which lines are unknown; the intersection of two
   unknown clusters points at the missing parent's couple.
3. **Professional genetic genealogists** who run cases for clients across several vendors and deliver a written report.
   Investigative genetic genealogists, who identify unknown remains or suspects for law enforcement, use the same match
   clustering on forensic profiles ([Othram](https://othram.com/research/feature-preview/streamlining-forensic-genetic-genealogy-with-automatic-clustering-of-genetic-matches));
   their legal and policy constraints put them outside this document's personas, though the graph work is the same.
4. **Researchers from endogamous communities** (Ashkenazi Jewish, Acadian, colonial and island populations) for whom
   default settings produce one undifferentiated blob
   ([Family Locket, Gephi part 5](https://familylocket.com/creating-network-graphs-with-gephi-part-5-analyze-the-network-graph)).

## 3. Personas

The existing record **family-historian-dna** (Linda Kowalski, from the digital-humanities document, Persona H) already
covers the hobbyist who keeps a GEDCOM tree and clusters DNA matches with the Leeds method, AutoClusters and Gephi. The
personas below add the three sub-populations whose network work differs from hers.

### Persona A: Dorothy Haines -- unknown-parentage search angel (id: unknown-parentage-search-angel)

- **Role.** Retired payroll manager; volunteer search angel for an adoptee support group; works three or four cases at
  once, each for a stranger who has shared their DNA login or a match export.
- **Tools today.** AncestryDNA Matches by Cluster and Shared Matches, MyHeritage AutoClusters, DNA Painter's What Are
  the Odds (WATO) and Shared cM Project tool, a Leeds spreadsheet, Ancestry trees and public records to build "quick
  and dirty" trees for matches.
- **Data.** A client's match list (hundreds to a few thousand matches over 20 cM), the shared-match pairs among the top
  few hundred, and the client's known side if one parent is known.
- **Goals.** Split matches into the known parent's side and the unknown side; find the two clusters on the unknown side
  that meet in one match (the missing parent's parents); test candidate placements by shared cM.
- **Frustrations.** Ancestry shows full shared matches only to subscribers (three without)
  ([DNA Explained 2024](https://dna-explained.com/2024/02/05/ancestrys-thrulines-and-shared-matches-now-require-a-subscription/));
  Ancestry lists a match in only one cluster even when it belongs to two
  ([DNA Explained 2025](https://dna-explained.com/2025/07/10/how-to-use-ancestrys-new-match-clusters-and-what-they-mean/));
  every vendor's clusters live in its own site, so the client's Ancestry and MyHeritage results cannot be merged; she
  must show the client the reasoning without exposing the names of the client's matches to the wider support group.

### Persona B: Clive Ashford -- professional genetic genealogist (id: professional-genetic-genealogist)

- **Role.** Accredited genealogist running a small practice; clients are estates, adoptees and families with brick
  walls; bills by the hour and delivers a written report with figures.
- **Tools today.** DNAGedcom Client (paid) and the Collins-Leeds method, Genetic Affairs AutoCluster and AutoTree,
  Shared Clustering (Windows), Gephi when a case needs it, DNA Painter for chromosome maps and WATO, Excel, a genealogy
  database for trees.
- **Data.** Exports from two to five vendors per client: match lists with cM, segments and longest segment;
  in-common-with pairs where the vendor offers them; segment files from FamilyTreeDNA, MyHeritage and GEDmatch.
- **Goals.** One consistent cluster picture per client across vendors; a report figure that explains the reasoning;
  a defensible statement of what is known, what is likely, and what is excluded.
- **Frustrations.** Each vendor's export has different columns and limits (23andMe capped downloads at 1,500 matches
  for most testers; Ancestry offers no match download at all; MyHeritage removed its export for a time:
  [DNA Explained 2022](https://dna-explained.com/2022/08/03/how-to-download-your-dna-match-lists-segment-files/));
  third-party download tools have received cease-and-desist letters from Ancestry
  ([DNA Explained 2024](https://dna-explained.com/2024/02/05/ancestrys-thrulines-and-shared-matches-now-require-a-subscription/));
  a full download of an Ancestry match list "can take a very long time, often as long as 12-24 hours"
  ([Shared Clustering wiki](https://github-wiki-see.page/m/jonathanbrecher/sharedclustering/wiki/Shared-Clustering-versus-other-clustering-tools));
  the cluster tools produce a matrix, a list and a figure that he has to stitch into a report by hand.

### Persona C: Shoshana Perlman -- endogamous-heritage DNA researcher (id: endogamous-heritage-dna-researcher)

- **Role.** Software tester by day; researches her Ashkenazi Jewish family in evenings and is active in a Jewish
  genealogy society's DNA special interest group.
- **Tools today.** Shared Clustering with its endogamy check and similarity report, MyHeritage AutoClusters (which
  adjusts matching for Ashkenazi testers), GEDmatch one-to-one comparisons, DNA Painter chromosome maps with a raised
  segment minimum, a spreadsheet of known relatives.
- **Data.** Thousands of matches, many of them predicted as close cousins who are really distant; shared-match lists in
  which almost everyone shares with almost everyone.
- **Goals.** Find the few real clusters among her closest matches; tell real relatives from background sharing; tie a
  cluster to one grandparent's town.
- **Frustrations.** "Network graph analysis is not helpful for those with moderate to severe endogamy"
  ([Family Locket, part 5](https://familylocket.com/creating-network-graphs-with-gephi-part-5-analyze-the-network-graph));
  the Leeds method "very likely won't work" for her
  ([Newman, RootsTech 2025](https://cms-z-assets.familysearch.org/bc/86/5633a4c2b3a3dfce11ae6ae3dd40/rootstech2025newman-dnaendogamy.pdf));
  her cluster diagram has a "speckly" background
  ([Shared Clustering wiki](https://github-wiki-see.page/m/jonathanbrecher/sharedclustering/wiki/Endogamy---Advanced-analysis-techniques));
  every threshold must be raised by hand, and no tool tells her up front whether clustering will work at all, except
  Shared Clustering's own check.

## 4. Use cases (ranked)

Ranked by how many people do it and how much it depends on a network view.

| Rank | Use case | Who | Network dependence |
| --- | --- | --- | --- |
| 1 | Sort matches into the four grandparent lines (or maternal and paternal sides) | Everyone | High: the whole point of clustering |
| 2 | Label each cluster with an ancestral couple from members' trees | Everyone | Medium: needs the cluster plus attributes from outside the graph |
| 3 | Find the unknown parent or grandparent: two unknown clusters that meet in one match | Search angels, adoptees, professionals | High: the meeting point is a structural feature (a node bridging two clusters) |
| 4 | Place a new or unlabeled match by the clusters it shares with ("related to him and her but not them") | Everyone | High ([Your DNA Guide, MyHeritage AutoClusters](https://www.yourdnaguide.com/ydgblog/myheritage-autoclusters)) |
| 5 | Tune the cM band and clustering resolution until clusters split cleanly | Do-it-yourself network builders | High |
| 6 | Count connections between clusters to tell related lines from random links | Gephi users | High ([Family Locket, part 5](https://familylocket.com/creating-network-graphs-with-gephi-part-5-analyze-the-network-graph)) |
| 7 | Decide whether clustering can work at all (endogamy check) and adapt thresholds | Endogamous researchers | High |
| 8 | Test candidate tree placements by shared cM (WATO) | Search angels, professionals | Low: a probability tool over a candidate tree, not over the match network ([DNA Painter WATO FAQ](https://dnapainter.com/help/wato-faq)) |
| 9 | Paint segments onto a chromosome map per ancestor | Segment-oriented researchers | Low: a different view of segment data |
| 10 | Share a cluster figure or report with a client or relative without exposing match names | Professionals, search angels | Medium |

## 5. Step-by-step workflows

### 5.1 The Leeds method by hand (spreadsheet, 90-400 cM)

Sources: [Your DNA Guide, Leeds method](https://www.yourdnaguide.com/?p=519);
[DNA Explained, the Leeds method](https://dna-explained.com/2018/09/26/the-leeds-method/).

1. **List the band.** List every match who shares "less than 400 cM of DNA but more than 90 cM" (about second and third
   cousins). Roberta Estes, applying it at several vendors, used second and third cousins plus "about 300" of the
   closest fourth cousins, since Ancestry had "more than 1000 fourth cousins".
2. **Leave out close family.** "Don't use siblings or anyone closer than the second cousin level"; they share with every
   group.
3. **Seed the first color.** Mark the first match in column 1 with a color; open their shared matches on the vendor site
   and color every listed match's cell in that column.
4. **Seed the next.** Take the first uncolored match, give it a new color in column 2, color its shared matches. Repeat
   until every match has at least one color.
5. **Handle double colors.** Matches can share with more than one group; color each cell that applies. Estes instead
   added such a match to its closest group "so long as it was relatively consistent", and set aside matches that landed
   in many groups.
6. **Read the result.** On a well-built tree the four colors correspond to four great-grandparent couples (Your DNA
   Guide) or the four grandparent lines (Dana Leeds). Estes found second- and third-cousin grouping "very consistent",
   but at 23andMe the method "simply didn't work well."
7. **Know the limits.** Grouping "does NOT MEAN" a shared ancestor; it is "a hint, a tip to be followed" (Estes).

### 5.2 Vendor or third-party autocluster matrix (MyHeritage, Genetic Affairs, GEDmatch, Ancestry, 23andMe)

Sources: [MyHeritage 2019](https://magazine.myheritage.com/myheritage-news/introducing-autoclusters-for-dna-matches/);
[Your DNA Guide](https://www.yourdnaguide.com/ydgblog/myheritage-autoclusters);
[DNA Explained, Genetic Affairs 2018](https://dna-explained.com/2018/12/04/autoclustering-by-genetic-affairs/);
[DNA Explained, Ancestry 2025](https://dna-explained.com/2025/07/10/how-to-use-ancestrys-new-match-clusters-and-what-they-mean/);
[GEDmatch blog](https://www.gedmatch.com/blog/what-are-dna-autoclusters/).

1. **Request the run.** MyHeritage: DNA, Tools, AutoClusters, choose the kit; one run per kit per day; the result is
   emailed as a zip after minutes to hours. Genetic Affairs: choose vendor and thresholds (one run used "250 cM and 50
   cM"); each run cost 25 credits of 200 free at sign-up. Ancestry: DNA, Matches, "By cluster"; Pro Tools subscription
   required.
2. **Know the thresholds.** MyHeritage picks minimum and maximum cM automatically and lists them in the HTML and
   ReadMe.pdf. Ancestry clusters matches sharing 65 to 1,300 cM who share at least 20 cM with each other, and includes
   "SOME qualifying people in clusters, but not all". 23andMe's help suggests a 50-70 cM minimum and a 300-500 cM
   maximum for grandparent-level groups ([23andMe help via search](https://customercare.23andme.com/hc/en-us/articles/38509301730839-How-to-Use-DNA-Relatives-Clustering-at-23andMe)).
3. **Open the files.** MyHeritage and Genetic Affairs send an HTML chart, a CSV of the grid and a match list (MyHeritage
   adds a ReadMe.pdf listing excluded matches and why: "Read it").
4. **Read the matrix.** Each cell is two matches who both match the tester and each other ("does NOT mean they are
   triangulated"); each color is a cluster; gray cells are matches in more than one cluster, often the tester's closest
   relatives ("this grey never-never-land"); adjacent gray cells can suggest that two clusters are related
   (MyHeritage). GEDmatch states the same reading: "Matches appearing in multiple clusters are shown in gray, while
   white spaces indicate little or no shared DNA."
5. **Read the list below the grid.** Both MyHeritage and Genetic Affairs list each cluster's members with links to
   their trees and contact pages, plus the matches that met the criteria but clustered with no one. Your DNA Guide
   found the list "easier to read" than the chart.
6. **Label and place.** Work out which branch each cluster represents, using matches already known; then place a
   mystery match by the clusters it shares with ("She's related to him and her but NOT to them").
7. **Mind the view limits.** Ancestry shows the grid only for a cluster or combined group of "100 matches or fewer",
   recomputes clusters on each visit, lists a multi-cluster match under one cluster only, and offers no export; to
   recover a match's full cluster membership the practitioner reads its row across the grid or keeps a spreadsheet.
### 5.3 Build the node-link network graph by hand (DNAGedcom plus Gephi)

Sources: [Family Locket, part 1](https://familylocket.com/creating-gephi-network-graphs-part-1-gather-matches-and-prepare-spreadsheets);
[part 2](https://familylocket.com/creating-network-graphs-with-gephi-part-2-importing-spreadsheets-and-layouts);
[part 3](https://familylocket.com/creating-gephi-network-graphs-part-3-adjusting-the-network-graph);
[part 5](https://familylocket.com/creating-network-graphs-with-gephi-part-5-analyze-the-network-graph);
[DNA-Sci, from GEDmatch](https://dna-sci.com/2020/08/19/auto-clusters-in-gephi-using-data-from-gedmatch/).

1. **Download the two tables.** In DNAGedcom Client (subscription $5 or $10 a month), open the Gather tab, choose the
   vendor, log in, pick the test profile, enter a cM range ("50-400 cM" for a first graph, down to 40 or 35 cM if there
   are few matches), check "Gather ICW", uncheck trees and ethnicity, and gather. It can run for hours and resumes
   where it stopped. The result is a match file `m_<test taker name>.csv` and an in-common-with file
   `icw_<test taker name>.csv`.
2. **Rename headers so Gephi recognizes the tables.** In the in-common-with file, rename `matchid` to `source` and
   `icwid` to `target`, and rename or delete the trailing `source` column. In the match file, rename `matchid` to `ID`.
   This renaming is the entire reason a spreadsheet step exists.
3. **Import the pair file as edges.** Gephi detects it as "an edges file"; set the graph type to undirected and append
   to the workspace. The nodes arrive "in a clump in the center".
4. **Lay it out.** Run OpenOrd, then ForceAtlas 2 with scaling 1000 and "stronger gravity"; stop when clusters form;
   then check "prevent overlap" and run again so labels are readable.
5. **Import the match file as nodes.** Gephi detects "a nodes table"; deselect unneeded vendor columns (starred,
   private, hint, archived, image URL, scanned, member since, ethnic regions), set undirected, append.
6. **Cluster.** Run modularity (Gephi uses the Louvain method), then color nodes by modularity class and size them by
   shared cM (the tutorial suggests a 20 to 100 size range). A 50-400 cM graph gave "6 communities with modularity of
   0.638".
7. **Sweep the resolution.** The default resolution is 1.0. On one graph from 15 cM up: resolution 20 gave 11
   communities but really two large ones (maternal and paternal) plus nine tiny; resolution 5 gave five large (maternal
   whole, paternal split four ways); 1.0 gave 21 clusters; 0.5 gave 36; 0.3 gave 49 ("four maternal clusters, and LOTS
   of paternal clusters"). The practitioner picks the resolution whose clusters match known family lines.
8. **Label the clusters.** Gephi numbers them largest to smallest; the practitioner renames each after the most recent
   common ancestral couple found in its members' trees and notes which stayed "Unknown". Promising clusters can be
   copied to a new workspace and clustered again to get subclusters.
9. **Measure the links between clusters.** Filter to two clusters, read the total edge count, and subtract each
   cluster's own edges: clusters 14 and 15 gave 17,082 minus 5,946 minus 10,717 = 419 connecting edges (a real
   relationship), while clusters 2 and 14 gave 11,118 minus 5,160 minus 5,946 = 12 edges, read as "no connection at all
   (just random connections)". Normalize by cluster size: cluster 17 averaged 0.67 connecting edges per node and
   cluster 15 averaged 0.42.
10. **Prune noise.** Close cousins ("1st and 2nd cousins, cause a lot of connections between further back clusters")
    are removed in a copy of the graph. A node joining two clusters can be a double cousin descending from both
    couples.
11. **The GEDmatch variant.** Without a download tool, the pairs are collected by hand: run one-to-many, then the
    "people who match 1 or 2 of both kits" tool for each match in turn, and paste each result into an edges sheet.
    "GEDmatch is the easiest way to manually collect the input data, but it's still fairly time-consuming", and Gephi
    "sometimes freezes even on very high-powered computers", so the author saves often.

### 5.4 Decide whether clustering can work at all, and adapt for endogamy

Sources: [Shared Clustering wiki, endogamy](https://github-wiki-see.page/m/jonathanbrecher/sharedclustering/wiki/Endogamy---Advanced-analysis-techniques);
[Newman, RootsTech 2025](https://cms-z-assets.familysearch.org/bc/86/5633a4c2b3a3dfce11ae6ae3dd40/rootstech2025newman-dnaendogamy.pdf);
[DNA Painter, chromosome mapping and endogamy](https://dnapainter.com/blog/chromosome-mapping-and-endogamy/);
[Family Locket, part 5](https://familylocket.com/creating-network-graphs-with-gephi-part-5-analyze-the-network-graph).

1. **Test for endogamy first.** Shared Clustering has a "Check endogamy" button; its other test is practical: start a
   "Slow and complete" download of all matches down to 6 cM, and if it finishes in a few hours, cluster normally, but
   if it would take "days or weeks", switch to the similarity approach.
2. **Download differently.** Its "Endogamy Special" option downloads all matches but only "the shared matches over 50
   cM for each match", keeping the pair table manageable.
3. **Raise every threshold.** The wiki's endogamy settings are minimum cluster size 3, maximum gray percentage 0,
   lowest centimorgans to cluster 50, and lowest centimorgans in shared matches 50 -- which covers "only a tiny
   percentage of your total matches". Jewish genealogists commonly disregard matches under about 100 cM for a fully
   Ashkenazi tester, and DNA Painter advises raising its 7 cM segment minimum to 10 or 15 cM.
4. **Read a speckly diagram.** Instead of solid clusters on white, the diagram has a "speckly" background, possibly
   across the whole thing. Two things are still readable: matches already identified, and clusters of at least three or
   four matches, even unidentified ones ("Unknown clusters could open up entirely new branches of your tree").
5. **Fall back to per-cluster similarity.** Copy one cluster's test IDs into a similarity report, work down the ranked
   list, and repeat per cluster; "You should not ignore weak matches that appear high in your similarity list!"
6. **Say so in the write-up.** Network analysis "is not helpful for those with moderate to severe endogamy", and such a
   tester's graph "will show connections to many clusters"; the finding is that the method does not apply, which is
   itself a result worth recording.

### 5.5 Find an unknown parent or grandparent from the clusters

Sources: [Your DNA Guide, MyHeritage AutoClusters](https://www.yourdnaguide.com/ydgblog/myheritage-autoclusters);
[DNA Painter WATO FAQ](https://dnapainter.com/help/wato-faq);
[DNA Explained, Ancestry clusters](https://dna-explained.com/2025/07/10/how-to-use-ancestrys-new-match-clusters-and-what-they-mean/).

1. **Separate the known side.** If one parent is known, label the clusters that belong to that parent's lines from
   known relatives, and treat the rest as the unknown side. Where the vendor offers a parental split (Ancestry's
   Parent 1 and Parent 2 tabs, built from SideView), start from it.
2. **Label what can be labeled.** For each unknown cluster, read the members' trees and public records, and look for a
   surname or a place shared by several members.
3. **Place a mystery match by its cluster pattern.** The reasoning is purely structural: the match is "related to him
   and her but NOT to them", so they belong to one line and not another.
4. **Look for the meeting point.** A match or a small group that connects two unknown clusters is a candidate
   descendant of both couples, which points at the missing parent's own parents; in a matrix this shows as gray cells
   or as dark areas off the diagonal.
5. **Build a candidate tree and score it.** Enter the candidate tree in DNA Painter's What Are the Odds, with each
   known match's shared cM, and compare hypotheses: the tool reports the relative probability of each placement from
   the Shared cM Project, and a 0.00% means the shared amount makes that relationship statistically impossible. A low
   match, or no match where one is expected, rules hypotheses out.
6. **Keep the caveat.** WATO's own FAQ warns that with pedigree collapse or endogamy "these hypotheses may not be
   accurate", and it works best for hypotheses no further back than second great-grandparents.

### 5.6 Run a case across several vendors and hand over a report

Sources: [DNA Explained, downloads by vendor](https://dna-explained.com/2022/08/03/how-to-download-your-dna-match-lists-segment-files/);
[DNA Explained, FamilyTreeDNA downloads](https://dna-explained.com/2024/08/29/familytreedna-match-download-files-are-back/);
[Family Locket, 10 ways](https://familylocket.com/10-ways-to-group-your-dna-matches-into-genetic-networks);
[Shared Clustering wiki](https://github-wiki-see.page/m/jonathanbrecher/sharedclustering/wiki).

1. **Collect what each vendor allows.** FamilyTreeDNA exports a Family Finder match CSV (names, match date,
   relationship range, shared cM, longest segment, linked relationship, ancestral surnames, haplogroups, notes,
   matching bucket of maternal, paternal or both, X-match cM, autosomal transfer) and a separate all-segments file from
   the chromosome browser, but reports no pair data: "FamilyTreeDNA doesn't report how your matches share DNA with each
   other" beyond its Matrix. MyHeritage exports a match list (name, age, country, manager, relationship, total cM,
   percent shared, segment count, largest segment, tree details, SmartMatches, surnames, notes, Theory of Family
   Relativity) and a segment export. 23andMe's download combines matches and segments and was capped at "1500 matches"
   for most testers. Ancestry "does not facilitate or allow downloading your match list", so its pairs come from the
   site itself or a tool that reads it.
2. **Cluster per vendor, not across vendors.** Each database has its own kit identifiers, so clusters are computed per
   vendor and reconciled by hand through known relatives who tested in more than one.
3. **Choose the tool per database size.** Shared Clustering (Windows, free) reads Ancestry shared-match lists, and
   "With 2,000 matches sharing 20 cM or more, you can expect 1,800 or more of them are assigned to clusters"; adding
   matches under 20 cM "will typically _triple_ the size of the clusters" at the cost of a download of "12-24 hours".
   DNAGedcom's Collins-Leeds method covers five vendors on a subscription.
4. **Write the figure and the reasoning.** The deliverable is a labeled cluster figure, the cluster-to-couple
   assignment, the cM evidence per match, and the hypotheses that survived; practitioners assemble this by hand from a
   matrix screenshot, a spreadsheet and a tree chart.
5. **De-identify.** Match names are living people's names; a report shared outside the family uses initials, kit
   identifiers or cluster labels instead.

## 6. Data

### 6.1 The two tables

| Table | One row per | Typical columns | Source |
| --- | --- | --- | --- |
| Match list | Match | Match identifier, display name, shared cM, shared segments, longest segment, predicted relationship range, side (maternal, paternal, both), tree size or link, notes, labels | [DNA Explained](https://dna-explained.com/2022/08/03/how-to-download-your-dna-match-lists-segment-files/); [FamilyTreeDNA columns](https://dna-explained.com/2024/08/29/familytreedna-match-download-files-are-back/) |
| In-common-with pairs | Pair of matches who share DNA with each other | `matchid`, `icwid` (renamed to source and target for Gephi), the vendor name | [Family Locket, part 1](https://familylocket.com/creating-gephi-network-graphs-part-1-gather-matches-and-prepare-spreadsheets) |
| Segment file (separate view, not the network) | Match and chromosome | Match name, chromosome, start, end, cM, SNPs | [DNA Explained](https://dna-explained.com/2022/08/03/how-to-download-your-dna-match-lists-segment-files/) |

The pair table is an edge list with no weight: the vendors report that two matches share DNA, not how much, except
where a matrix shows it (FamilyTreeDNA's reworked Matrix adds shared cM, shared segments and an estimated relationship
range between two matches, for up to ten selected matches:
[DNA Painter index](https://dnapainter.com/grids-and-matrices)). Ancestry's grid reveals a 20 cM floor between matches
but no value, and a blank cell means "less than 20 cM with each other", not zero.

### 6.2 Sizes

| Scale | Figure | Source |
| --- | --- | --- |
| Matches in a first Gephi graph (50-400 cM) | 219 matches | [Family Locket, part 1](https://familylocket.com/creating-gephi-network-graphs-part-1-gather-matches-and-prepare-spreadsheets) |
| Matches in one autocluster run (250 and 50 cM thresholds) | 176 matches | [DNA Explained](https://dna-explained.com/2018/12/04/autoclustering-by-genetic-affairs/) |
| Whole match lists within a cousin cutoff | 1,233 at 23andMe (5th cousins and closer), about 1,500 at FamilyTreeDNA, 2,698 at Ancestry (4th cousins and closer) | [DNA Explained](https://dna-explained.com/2018/12/04/autoclustering-by-genetic-affairs/) |
| Edges in a cluster pair | 17,082 edges across two clusters; 5,946 and 10,717 inside them | [Family Locket, part 5](https://familylocket.com/creating-network-graphs-with-gephi-part-5-analyze-the-network-graph) |
| A reader's import | "513,689 mutual edges removed" on one import; another saw 50 nodes and 220 edges | [Family Locket, part 2 comments](https://familylocket.com/creating-network-graphs-with-gephi-part-2-importing-spreadsheets-and-layouts) |
| Tool caps | Genetic Affairs processed up to 499 matches per run; Ancestry shows its grid only for 100 matches or fewer | [DNA Explained 2019](https://dna-explained.com/2019/12/02/genetic-affairs-reconstructs-trees-from-genetic-clusters-even-without-your-tree-or-common-ancestors/); [DNA Explained 2025](https://dna-explained.com/2025/07/10/how-to-use-ancestrys-new-match-clusters-and-what-they-mean/) |

So a graph is hundreds of nodes and thousands to tens of thousands of edges after filtering, and tens of thousands of
nodes with hundreds of thousands of edges if the band is opened to the whole match list. The pair table grows roughly
with the square of the band, which is why every tutorial filters first.

### 6.3 Thresholds in use

| Threshold | Values seen | Source |
| --- | --- | --- |
| Leeds band | More than 90 and less than 400 cM | [Your DNA Guide](https://www.yourdnaguide.com/?p=519) |
| Gephi first graph | 50-400 cM; 40 or 35 cM if few matches; another example from 15 cM up | [Family Locket, part 1](https://familylocket.com/creating-gephi-network-graphs-part-1-gather-matches-and-prepare-spreadsheets); [part 5](https://familylocket.com/creating-network-graphs-with-gephi-part-5-analyze-the-network-graph) |
| Genetic Affairs run | 250 cM maximum and 50 cM minimum; 20-300 cM in another; lowest selectable minimum 9 cM | [DNA Explained](https://dna-explained.com/2018/12/04/autoclustering-by-genetic-affairs/); [DNA Explained 2019](https://dna-explained.com/2019/12/02/genetic-affairs-reconstructs-trees-from-genetic-clusters-even-without-your-tree-or-common-ancestors/) |
| Ancestry | 65-1,300 cM with the tester; 20 cM minimum between two matches | [DNA Explained 2025](https://dna-explained.com/2025/07/10/how-to-use-ancestrys-new-match-clusters-and-what-they-mean/) |
| 23andMe guidance | 50-70 cM minimum, 300-500 cM maximum for grandparent groups; 30-50 cM minimum with endogamous ancestry | [23andMe help](https://customercare.23andme.com/hc/en-us/articles/38509301730839-How-to-Use-DNA-Relatives-Clustering-at-23andMe) |
| Endogamy settings | 50 cM to cluster and 50 cM between shared matches, minimum cluster size 3, maximum gray 0 | [Shared Clustering wiki](https://github-wiki-see.page/m/jonathanbrecher/sharedclustering/wiki/Endogamy---Advanced-analysis-techniques) |
| Where grouping breaks down | "at about 40-45 cMs" results became unpredictable; vendor-dependent between 30 and 40 cM | [DNA Explained, Leeds](https://dna-explained.com/2018/09/26/the-leeds-method/) |

### 6.4 Attributes carried alongside

Shared cM with the tester (node size), predicted relationship range, side (maternal, paternal, both), whether the match
has a tree, the practitioner's own cluster label and notes, and the ancestral couple assigned to a cluster. Vendor
exports also carry columns no one wants in the graph (image URLs, ethnic regions, "member since"), which are deselected
at import.

### 6.5 Privacy

Every node is a living person, named, with a contact link. Match data is covered by each vendor's terms: Ancestry has
sent cease-and-desist letters to tools that download match lists
([DNA Explained 2024](https://dna-explained.com/2024/02/05/ancestrys-thrulines-and-shared-matches-now-require-a-subscription/)),
and 23andMe's 2023 breach -- "roughly 5.5 million DNA Relatives profile files" accessed -- was a scrape of exactly this
relative data ([Wikipedia, 23andMe data leak](https://en.wikipedia.org/wiki/23andMe_data_leak)), after which features
in DNA Relatives were temporarily disabled. A tool that holds a match network holds sensitive data about people who
never used it.

## 7. Analysis methods

| Method | How it is used here | Note |
| --- | --- | --- |
| Band filtering on a node attribute (cM) | The first and most consequential step; both a floor and a ceiling | The ceiling is unusual: most populations filter weak edges, not strong nodes |
| Ego removal | The tester is dropped, since they connect to everything | The graph is an ego network with the ego deleted |
| Community detection (Louvain modularity in Gephi; the vendors' own clustering) | Produces the clusters read as family lines | Gephi assigns one community per node, which cannot express a match in two lines |
| Resolution sweep | The practitioner tries 20, 5, 1.0, 0.5, 0.3 and picks the split that matches known family | Done by rerunning and re-coloring by hand |
| Matrix reordering (seriation) | AutoClusters and every vendor matrix order rows and columns so clusters form squares on the diagonal | The dominant view in the commercial tools, not node-link |
| Between-cluster edge counting | Total edges of two clusters minus each cluster's internal edges, normalized per node | Hand arithmetic in a spreadsheet today |
| Bridging nodes | A node joining two clusters is read as a double cousin or a close relative | Read by eye |
| Degree as noise signal | A match connected to many clusters means a close relative or endogamy | Read by eye |
| Shared-cM probability (WATO, Shared cM Project) | Scores candidate placements, outside the graph | Needs a candidate tree, not the match network |
| Segment painting | Attributes a shared segment to an ancestor on a chromosome map | A separate coordinate view, not a graph |

Two methods the population needs and does not have: **overlapping cluster membership** (every matrix tool shows gray
cells for it; no node-link tool expresses it), and **an endogamy diagnostic** computed from the graph itself (edge
density among matches, or the share of matches that fall in no cluster) rather than guessed from a download's duration.

## 8. Outputs and collaboration

- **A labeled cluster figure**, shared with relatives, a client or a support group: today a screenshot of a Gephi
  canvas or an AutoClusters HTML page.
- **A cluster-to-couple table**: cluster number, label, member count, the evidence for the label, and which clusters
  stayed unknown (in one example "two of six clusters stayed unknown").
- **Notes written back onto a pedigree chart**: "Blue boxes indicate which clusters matches with these MRCA couples
  were in" ([Family Locket, part 5](https://familylocket.com/creating-network-graphs-with-gephi-part-5-analyze-the-network-graph)).
- **The vendor's own files**: an HTML matrix, a CSV grid and a match list, emailed as a zip, plus a ReadMe listing the
  thresholds chosen and the matches left out.
- **Group labels written back to the vendor site**: Ancestry users copy cluster membership into colored group labels on
  the match list so the clustering survives the recomputation that happens on each visit.
- **A written client report** with the figure, the reasoning, the probabilities and the exclusions.
- **De-identified sharing**: initials or kit identifiers instead of names when the figure leaves the family.

## 9. Tools landscape and pain points

| Tool | What it does for this work | Limits |
| --- | --- | --- |
| Vendor cluster views (MyHeritage AutoClusters, GEDmatch Clusters, 23andMe DNA Relatives Clustering, Ancestry Matches by Cluster) | One-click clustered matrix inside the site or by email | Matrix only, no node-link; thresholds chosen for you (MyHeritage) or fixed (Ancestry's 65-1,300 cM and 20 cM); grid only up to 100 matches (Ancestry); recomputed on every visit; one run per kit per day (MyHeritage); subscription or credits; no export (Ancestry) |
| Genetic Affairs AutoCluster | Cross-vendor clustered matrix with HTML, CSV grid and match list | Credits per run; up to 499 matches per run; Ancestry support removed after a cease-and-desist |
| Shared Clustering (free, Windows) | Large Ancestry cluster diagrams, endogamy check, similarity reports | Windows only, Ancestry only, downloads of 12-24 hours; spreadsheet output |
| DNAGedcom Client and Collins-Leeds | The only general way to get the two tables out of several vendors | Paid subscription; gathering takes hours; header renaming by hand; vendor blocking |
| Leeds spreadsheet | Needs no tool at all; teaches the concept | Entirely manual; one color column per cluster; charts grow past the four intended groups |
| Gephi | The only node-link route: modularity, resolution control, recoloring, node size by cM, subclustering | Hard for non-technical users; the center is a tangle; freezes; no DNA concepts (no cM band filter, no ego removal, no cluster labels that survive a rerun) |
| DNA Painter (WATO, Shared cM, chromosome maps, cluster formatter) | Scores placements; reformats autocluster output into a CSV | Not a network view |
| RootsFinder, DNA2Tree | Cluster views tied to a tree; an iOS app for Ancestry data | Narrow platforms |

**Cross-cutting pain points.**

1. The graph cannot be built without renaming CSV headers by hand.
2. The cM band is set in a download tool, so changing it means downloading again (hours) instead of moving a slider.
3. The tester must be removed manually, or is never in the file in the first place, and nothing in the tool knows there
   is an ego.
4. A match that belongs to two lines is either a gray cell with no further information or, in a node-link graph,
   silently forced into one community.
5. Cluster labels are typed into Gephi's data table or a spreadsheet and lost when the resolution is changed and
   modularity renumbers the clusters.
6. Counting edges between two clusters is manual subtraction, and readers reported negative numbers from spreadsheet
   mistakes.
7. The matrix view and the node-link view are different products, so nobody sees both of one graph.
8. Close relatives have to be deleted to make the picture readable, in a copy, by hand.
9. Nothing says in advance whether endogamy makes the whole exercise pointless, except one Windows tool's button.
10. Nothing anonymizes a figure before it is shared, although every node names a living person.

## 10. Requirements implied

| Requirement | Priority | Covered today? |
| --- | --- | --- |
| Import two tables as one graph: a node table (matches, with shared cM) and a pair table (in-common-with), with per-vendor column presets so headers need no renaming | Must | Partial (columnar table import and a column mapper exist; a two-table match import with vendor presets does not) |
| Designate an ego and exclude it from the graph, while keeping its per-node value (shared cM with the tester) as a node attribute | Must | No |
| Band filter on a node attribute with both a floor and a ceiling, applied live, with the match count shown | Must | Partial (filtering and interactive thresholds exist; a two-ended band on a node attribute with a live count does not) |
| Community detection with a resolution control and a live cluster count, recolorable without losing labels | Must | Partial (community detection and a resolution sweep are planned; label persistence across runs is cluster-identity-across-runs) |
| Overlapping cluster membership: a node may belong to several clusters, shown as such in both views, with the reason distinguished (close relative versus two lines) | Must | No |
| Clustered adjacency matrix of the same graph, rows and columns reordered so clusters sit on the diagonal, cells colored by cluster, cells for multi-cluster members marked, switchable with the node-link view | Must | Partial (a sortable matrix view is planned; cluster seriation and the paired view are not) |
| Cluster labels and notes that the user types, that survive a reclustering, and that appear in the legend and in exports | Must | Partial (cluster labeling is automatic from text; user labels that persist are not) |
| Between-cluster connection counts computed and shown per cluster pair, normalized per member | Should | No |
| Remove or hide selected nodes (close relatives) and recluster, without destroying the original | Should | Partial (filtering and selection exist; a kept-aside working copy does not) |
| A density diagnostic that says up front whether clustering will separate anything (share of matches in no cluster, background edge density), so an endogamous tester is told before investing a week | Should | No |
| Node size by a numeric attribute with a usable range, and a legend that states the attribute and its endpoints | Must | Yes (visual encoding and legend) |
| De-identified display: show initials, kit identifiers or cluster labels instead of names, in the view and in every export | Must | Partial (de-identified display is planned) |
| Export per cluster: members with their shared cM, labels and notes, as a table | Should | Partial (export by cluster is planned) |
| Subcluster a selected cluster on its own, and come back to the whole graph | Should | Partial (multilevel cluster view is planned) |
| Figure export with the legend, cluster labels and the thresholds used recorded alongside | Must | Partial (image export exists; a record of the thresholds does not) |

Nothing in this list needs segment data, chromosome coordinates or probability calculations: those belong to the
chromosome-painting and WATO tools this population uses beside the graph.

## 11. Sources

- https://magazine.myheritage.com/myheritage-news/introducing-autoclusters-for-dna-matches/ -- MyHeritage AutoClusters, February 28, 2019: matrix of colored clusters, gray cells for multi-cluster matches, automatic thresholds, HTML plus CSV plus ReadMe by email, one run per kit per day, subscription or $29 per uploaded kit, endogamy handling.
- https://www.yourdnaguide.com/ydgblog/myheritage-autoclusters -- running and reading AutoClusters: read the PDF of excluded matches first, open the HTML in a browser, use the list under the chart, label clusters from known matches, place a mystery match by what it shares.
- https://www.yourdnaguide.com/?p=519 -- the Leeds method step by step, "less than 400 cM of DNA but more than 90 cM", four colors as four great-grandparent couples, color every cell that applies.
- https://dna-explained.com/2018/09/26/the-leeds-method/ -- Leeds applied at four vendors: exclude closer than second cousins, sort by longest block, where grouping breaks down (30-45 cM), 23andMe failure, overlap as a sign of endogamy, "a hint, a tip to be followed".
- https://dna-explained.com/2018/12/04/autoclustering-by-genetic-affairs/ -- Genetic Affairs AutoCluster: 250 and 50 cM thresholds, 176 clustered matches, grid and HTML and match list, gray squares for matches in more than one cluster, credits, per-vendor match counts (1,233 / about 1,500 / 2,698).
- https://dna-explained.com/2019/12/02/genetic-affairs-reconstructs-trees-from-genetic-clusters-even-without-your-tree-or-common-ancestors/ -- 50-250 cM run with minimum cluster size 2 and the tester excluded, 9 cM lowest selectable minimum, 499-match processing cap.
- https://dna-explained.com/2025/07/10/how-to-use-ancestrys-new-match-clusters-and-what-they-mean/ -- Ancestry Matches by Cluster: 65-1,300 cM, 20 cM between matches, colored and blank and grey cells, grid only for 100 matches or fewer, recomputed each visit, a multi-cluster match listed once, Pro Tools, beta, no export.
- https://dna-explained.com/2024/02/05/ancestrys-thrulines-and-shared-matches-now-require-a-subscription/ -- shared matches behind a subscription from early 2024, three visible without; cease-and-desist letters to match-download tools.
- https://dna-explained.com/2022/08/03/how-to-download-your-dna-match-lists-segment-files/ -- what each vendor lets a user download, the columns, the 23andMe 1,500-match cap, and Ancestry's refusal to allow match downloads.
- https://dna-explained.com/2024/08/29/familytreedna-match-download-files-are-back/ -- Family Finder match CSV columns, the all-segments download, and that FamilyTreeDNA reports no pair data.
- https://familylocket.com/creating-gephi-network-graphs-part-1-gather-matches-and-prepare-spreadsheets -- DNAGedcom gathering, 50-400 cM, the m and icw files, renaming matchid and icwid to source and target, 219 matches.
- https://familylocket.com/creating-network-graphs-with-gephi-part-2-importing-spreadsheets-and-layouts -- importing the pair file as edges and the match file as nodes, undirected, OpenOrd then ForceAtlas 2 with scaling 1000 and stronger gravity, prevent overlap, deselecting vendor columns.
- https://familylocket.com/creating-gephi-network-graphs-part-3-adjusting-the-network-graph -- Louvain modularity, coloring by cluster, node size by shared cM (20 to 100), six communities at modularity 0.638, the endogamy warning.
- https://familylocket.com/creating-network-graphs-with-gephi-part-5-analyze-the-network-graph -- resolution sweep (20, 5, 1.0, 0.5, 0.3 giving 11, 5, 21, 36, 49 clusters), labeling clusters by ancestral couple, subclustering, between-cluster edge arithmetic (419 versus 12), per-node ratios, removing close cousins, "network graph analysis is not helpful for those with moderate to severe endogamy".
- https://familylocket.com/10-ways-to-group-your-dna-matches-into-genetic-networks -- the ten grouping methods, each vendor's shared-match feature name, DNAGedcom and GEDmatch pricing, Gephi and RootsFinder as the network-graph routes.
- https://dna-sci.com/2020/08/19/auto-clusters-in-gephi-using-data-from-gedmatch/ -- collecting pairs by hand from GEDmatch one-to-many and "people who match 1 or 2 of both kits", pasting into an edges sheet, Gephi freezing, why Gephi over the automated tools.
- https://github-wiki-see.page/m/jonathanbrecher/sharedclustering/wiki -- Shared Clustering wiki index: clusters from Ancestry shared-match lists, red and gray overlap, dark areas off the diagonal, close relatives, endogamy, "In a _perfect cluster_, every member of the cluster appears in the shared match lists of every other member."
- https://github-wiki-see.page/m/jonathanbrecher/sharedclustering/wiki/Shared-Clustering-versus-other-clustering-tools -- 1,800 of 2,000 matches clustered at 20 cM and up, tripling cluster size by adding matches under 20 cM, 12-24 hour downloads, excluding matches with fewer than two shared matches.
- https://github-wiki-see.page/m/jonathanbrecher/sharedclustering/wiki/Endogamy---Advanced-analysis-techniques -- the endogamy check, the Endogamy Special download (shared matches over 50 cM), cluster settings (size 3, gray 0, 50 cM and 50 cM), the speckly diagram, per-cluster similarity reports.
- https://cms-z-assets.familysearch.org/bc/86/5633a4c2b3a3dfce11ae6ae3dd40/rootstech2025newman-dnaendogamy.pdf -- RootsTech 2025 presentation: the Leeds method very likely will not work for endogamous testers; raise the minimum threshold.
- https://dnapainter.com/blog/chromosome-mapping-and-endogamy/ -- DNA Painter's 7 cM default segment minimum, 10 cM suggested for Ashkenazi testers, 15 cM to reduce false segments.
- https://dnapainter.com/help/wato-faq -- What Are the Odds: hypotheses over a candidate tree scored from shared cM, 0.00% as statistically impossible, the pedigree-collapse and endogamy caveat, best for second great-grandparents or closer.
- https://dnapainter.com/grids-and-matrices -- index of clustering and matrix tools and lectures: Leeds, Collins-Leeds, FamilyTreeDNA Matrix, DNA Painter matrix, GEDmatch matrix, the vendors' automated clusters, Shared Clustering.
- https://www.gedmatch.com/blog/what-are-dna-autoclusters/ -- GEDmatch clusters, AutoKinship and AutoSegment; matches on both axes, a color per cluster, "Matches appearing in multiple clusters are shown in gray, while white spaces indicate little or no shared DNA"; intermarriage causing overlap.
- https://customercare.23andme.com/hc/en-us/articles/38509301730839-How-to-Use-DNA-Relatives-Clustering-at-23andMe -- 23andMe DNA Relatives Clustering, inspired by the Leeds method; 50-70 cM minimum and 300-500 cM maximum for grandparent groups; 30-50 cM minimum advised with endogamous ancestry.
- https://thednageek.com/database-sizes-march-2026/ -- database sizes in March 2026: AncestryDNA about 30 million, 23andMe a little under 14 million, MyHeritage 9.6 million, FamilyTreeDNA just under 1.8 million, GEDmatch about 2.2 million (projected).
- https://www.3blmedia.com/news/generations-come-ancestry-publishes-2025-impact-report -- Ancestry about 3.8 million subscribers and about 29 million people in the DNA network.
- https://verogen.com/gedmatch-partners-with-genetic-affairs-to-offer-new-tools-for-users/ -- GEDmatch and Genetic Affairs: autoclusters for Tier 1 subscribers of a site with 1.1 million users.
- https://othram.com/research/feature-preview/streamlining-forensic-genetic-genealogy-with-automatic-clustering-of-genetic-matches -- investigative genetic genealogy: automatically detected clusters in a match matrix, zooming into a cluster, shared-match drill-down, hundreds of matches from a forensic profile.
- https://adoption.com/what-you-need-to-know-about-using-a-search-angel -- search angels and the DNA Detectives group as volunteer helpers for unknown-parentage searches.
- https://motherboard.vice.com/read/facebooks-dna-detectives-are-helping-adoptees-find-their-birth-parents -- DNA Detectives as one of the largest search-angel groups.
- https://en.wikipedia.org/wiki/23andMe_data_leak -- the 2023 scrape of about 5.5 million DNA Relatives profiles and the features disabled in response.
