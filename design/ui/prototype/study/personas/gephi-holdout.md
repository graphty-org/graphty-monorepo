# Persona: the Gephi holdout

Composite persona for the simulated user study. Built from public forum posts, issue trackers,
tutorials, reviews and papers listed under Sources. No real person's identity, handle or story is
used; every quote is a paraphrase attributed to a link, not a name, or is marked as a persona
assumption.

**Name used in sessions:** Dr. Mara Lindqvist (fictional).
**Expertise:** expert. **Frequency:** weekly, in bursts around papers and teaching.
**Voluntary:** yes -- nobody makes her switch, which is exactly the problem for a new tool.

## Portrait

Mara is an associate professor of computational social science who has used Gephi since 0.8
(about 2012). She has taught it in a graduate methods course every year for a decade, wrote the
department's "Gephi in 90 minutes" handout, and has a folder of `.gephi` project files going back
to her PhD. She knows its flaws better than most of its users do -- the crashes, the missing
undo, the memory file she has to edit on every new laptop -- and she complains about them loudly.
But the three-screen rhythm of Overview, Data Laboratory and Preview is in her hands, and she can
take a raw edge list to a publication figure in twenty minutes without thinking. She has watched
several "Gephi killers" come and go; to her a new tool is guilty until proven innocent, and the
proof has to come in the first five minutes, on her own data.

## Background and tools

- **How she got here.** Started with UCINET and Pajek in grad school, moved to Gephi because it
  made the map visible while it computed. Learned ForceAtlas2 settings from the Gephi blog and the
  Jacomy and Venturini papers; she cites the ForceAtlas2 paper herself. Treats "visual network
  analysis" as a legitimate method -- reading position, density and bridges on a spatialized map --
  not as decoration.
- **Daily kit.** Gephi 0.10 (desktop, Java) for exploration and figures; Python with NetworkX for
  anything that must be reproducible or runs over many graphs; `write_gexf` to move graphs from
  Python into Gephi; Inkscape to fix labels and add legends to Preview's SVG export; R and igraph
  when a coauthor insists. She has tried Cytoscape (found it "a biology tool") and Gephi Lite, which
  she files under "for small networks and for teaching". That is close to how its own developers
  describe it: a lighter Gephi for "smaller networks with less complex operations", useful as a
  teaching tool and "as a preview before starting deeper analysis into Gephi"
  ([Gephi Lite interview](https://publicdatalab.org/2023/05/23/gephi-lite-interview/)).
- **Hardware.** 14-inch MacBook Pro (Apple Silicon) in the office plugged into a 27-inch external
  monitor; teaches from the laptop screen alone on a projector at 1280x800. Has lost afternoons to
  Gephi hangs on macOS perspective switches. Keeps `-Xmx` raised in `gephi.conf` from habit.
- **Data she brings.** Twitter/X and Mastodon retweet and mention networks (5k to 60k nodes),
  co-authorship and citation networks, hyperlink networks from web crawls, occasionally a
  dynamic network with time intervals. Mostly GEXF and CSV edge lists with Source and Target
  columns; node tables with an Id column and a Label column.
- **Accessibility.** Mild presbyopia: she bumps UI font size, finds 11px panel text tiring, and
  zooms screenshots in papers. Not color-blind, but she teaches students who are and picks
  palettes accordingly.

## Goals (the jobs she is actually hired to do)

1. Turn a crawled or scraped network into a **readable map** -- spatialize, find the clusters,
   say which communities exist and who bridges them -- for a paper figure or a talk slide.
2. Produce **publication-quality static output**: vector SVG or PDF, labels that do not collide,
   a legend she can defend to a reviewer.
3. **Compute the standard statistics** (degree, weighted degree, betweenness, PageRank,
   modularity classes, average path length, density) and export the node table to CSV for
   regressions in R or Python.
4. **Teach** 25 graduate students to do all of the above in a 3-hour lab, on whatever laptops they
   bring, without an install fight eating the first hour.
5. Keep **old projects readable**: open a 2019 project to regenerate a figure for a revision.

## Frustrations, with evidence

- **Crashes, hangs and install fights.** Gephi freezing on load or on switching tabs on Apple
  Silicon; hanging on the welcome screen when opening a multi-workspace project; the canvas going
  dead after a few minutes on a 7k-node, 200k-edge graph; the wrong Java version stopping it from
  starting at all. [gephi #2739](https://github.com/gephi/gephi/issues/2739),
  [gephi #2814](https://github.com/gephi/gephi/issues/2814),
  [gephi #2757](https://github.com/gephi/gephi/issues/2757),
  [Arch bug 71202](https://bugs.archlinux.org/task/71202),
  [gephi #1787](https://github.com/gephi/gephi/issues/1787). The 0.10 release notes themselves
  acknowledge hangs at startup and on perspective switches
  ([Gephi blog, 0.10](https://gephi.wordpress.com/2023/01/09/gephi-0-10-released/)).
- **No undo, a decade on.** Appearance changes cannot be reverted; deleting a group of nodes by
  mistake means reloading from a backup; experimenting with layouts means reconstructing the
  previous state by hand. [gephi #1515](https://github.com/gephi/gephi/issues/1515),
  [gephi #1822](https://github.com/gephi/gephi/issues/1822),
  [gephi #2974](https://github.com/gephi/gephi/issues/2974),
  [gephi #1175](https://github.com/gephi/gephi/issues/1175).
- **Memory ceiling set in a text file.** Raising the heap means finding and editing
  `gephi.conf`, restarting, and hoping the JVM still starts.
  [Gephi troubleshooting wiki](https://github.com/gephi/gephi/wiki/Troubleshooting),
  [HN comment on hunting for the memory flag after a crash](https://news.ycombinator.com/item?id=33546808).
- **Statistics follow the filter, and the column does not say so.** In Gephi's source, Modularity
  reads the visible graph (`execute(GraphModel)` calls `getUndirectedGraphVisible()`, line 132)
  and writes its result into one fixed column, `modularity_class` (lines 140-145), for the
  visible nodes only (`saveValues`, lines 318-326). Degree does the same (`getGraphVisible()`,
  Degree.java line 101). So a run with a filter active describes the subset, a rerun overwrites the
  earlier values for every node still visible, and nodes that were hidden keep the old run's
  class -- the column can end up mixing two runs, with nothing in the table to tell them apart.
  Tutorials apply a giant-component filter before running statistics as a routine step, which is
  exactly when this bites.
  [Modularity.java at b82f44c](https://github.com/gephi/gephi/blob/b82f44c1092dbb7ba9918962b78a31fe27ba98f8/modules/StatisticsPlugin/src/main/java/org/gephi/statistics/plugin/Modularity.java),
  [Degree.java at b82f44c](https://github.com/gephi/gephi/blob/b82f44c1092dbb7ba9918962b78a31fe27ba98f8/modules/StatisticsPlugin/src/main/java/org/gephi/statistics/plugin/Degree.java),
  [co-authorship tutorial that filters to the giant component](https://www.youtube.com/watch?v=gjUxTAtWRG4).
- **Modularity classes are arbitrary and unstable.** Louvain gives different partitions run to
  run and the class numbers mean nothing; she has had a reviewer ask why "community 7" changed
  between drafts. [Family Locket, analyze the network graph](https://familylocket.com/creating-network-graphs-with-gephi-part-5-analyze-the-network-graph/),
  [jveerbeek, community detection in Gephi](https://jveerbeek.gitlab.io/gephi/docs/community.html).
- **No legend, labels need Inkscape.** Preview cannot make a legend, so the workaround is to
  export and add it by hand; SVG export has dropped labels; label ordering is buried in Preview
  settings. [Gephi wiki, export to PDF or SVG](https://github.com/gephi/gephi/wiki/How-to-export-to-PDF-or-SVG),
  [gephi #2960](https://github.com/gephi/gephi/issues/2960),
  [Family Locket, exporting](https://familylocket.com/creating-gephi-network-graphs-part-4-exporting-and-saving-the-graph/).
- **The rule does not survive a round trip.** Colours and sizes survive as fixed values in GEXF
  (`viz:color`, `viz:size`), but the rule that made them (partition by X, ranking by Y) does not,
  so re-running on new data means redoing the Appearance panel; early Gephi Lite could not export
  appearance at all ([gephi-lite #113](https://github.com/gephi/gephi-lite/issues/113)).
- **The project looks stalled.** Years between releases, a small core team, and the worry that
  the software she built a course on will stop running on next year's Mac.
  [Is Gephi obsolete?](https://gephi.wordpress.com/2018/11/01/is-gephi-obsolete-situation-and-perspectives/),
  [HN on Gephi losing momentum](https://news.ycombinator.com/item?id=44651745).
- **But nothing else is as fast for exploration**, which is why she stays: web tools choke on
  her graph sizes, code-first tools give no feedback while she thinks, and Cytoscape feels built
  for gene networks. [Biostars, Cytoscape or Gephi](https://www.biostars.org/p/88974/),
  [HN thread on Gephi](https://news.ycombinator.com/item?id=30915870).

## Why she stays on Gephi even when something else does the job

These hold even if a new tool matches Gephi feature for feature. Some are sourced; the rest are
persona assumptions, marked.

- **Switching cost.** A decade of `.gephi` projects that must still open for revisions, and a
  NetworkX `write_gexf` pipeline that feeds them. (Persona assumption, consistent with the
  Python-to-GEXF-to-Gephi habit in [HN](https://news.ycombinator.com/item?id=7178979).)
- **Course materials.** Her handout, slides and graded lab are all Gephi screenshots and Gephi
  menu paths. Rewriting them is a summer she does not have. (Persona assumption.)
- **Coauthors.** Her coauthors and doctoral students send her `.gephi` files and expect them back.
  A tool only she uses is a tool that breaks the collaboration. (Persona assumption.)
- **Reviewers know the look.** Reviewers in her field recognise a ForceAtlas2 map and the method
  papers behind it ([ForceAtlas2 paper, Jacomy et al. 2014](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0098679),
  [Venturini, Jacomy, Jensen 2021](https://arxiv.org/abs/1905.02202)). A figure from an unknown
  layout invites a methods question she would rather not answer in a response letter.
- **Gephi is the citation.** "Spatialized with ForceAtlas2 in Gephi" is one sentence in a methods
  section. A new tool needs a paragraph and a version number, and she is not sure it will still
  exist when the paper is out.

## What makes her abandon a tool

- It cannot open her GEXF, or opens it and silently drops attributes or time intervals.
- It cannot run ForceAtlas2 (or something she can prove is equivalent) with the parameters she
  knows: scaling, gravity, stronger gravity, LinLog, prevent overlap, dissuade hubs.
- A statistic gives a number she cannot check against NetworkX or Gephi, or does not say what it
  was computed on.
- It hides the node table. If she cannot see and sort rows, she does not trust the picture.
- The best export is a PNG screenshot.
- It chokes or stutters at 20k nodes.
- It needs an account or uploads her data somewhere. Some of her datasets are under IRB or
  platform terms of service.

## Voice

Paraphrased lines in her register, each grounded in the linked source.

1. "It's clunky and it shows its age, but it still does the job at fifty thousand nodes."
   ([HN](https://news.ycombinator.com/item?id=9941598), [HN](https://news.ycombinator.com/item?id=9937208))
2. "For some things it is honestly the only sane way to proceed." ([HN](https://news.ycombinator.com/item?id=26950566))
3. "Where is undo? I changed the colors and I cannot get back." ([gephi #1515](https://github.com/gephi/gephi/issues/1515))
4. "I deleted a group of nodes, regretted it, and my only option was the copy I happened to save
   first." ([gephi #1822](https://github.com/gephi/gephi/issues/1822))
5. "After every crash I end up hunting for the file where the memory flag lives."
   ([HN](https://news.ycombinator.com/item?id=33546808), [Troubleshooting wiki](https://github.com/gephi/gephi/wiki/Troubleshooting))
6. "Whatever is on screen is what the statistic ran on -- if your filter is at ten percent, so is
   your modularity." ([Modularity.java, line 132](https://github.com/gephi/gephi/blob/b82f44c1092dbb7ba9918962b78a31fe27ba98f8/modules/StatisticsPlugin/src/main/java/org/gephi/statistics/plugin/Modularity.java#L132))
7. "The number next to the community is random. Look at the percentage, not the id."
   ([jveerbeek tutorial](https://jveerbeek.gitlab.io/gephi/docs/community.html))
8. "LinLog on, drop scaling and gravity way down, then prevent overlap as the finishing touch."
   ([Gephi blog, ForceAtlas2](https://gephi.wordpress.com/2011/06/06/forceatlas2-the-new-version-of-our-home-brew-layout/),
   [Volodymyr Miz layout tutorial](https://blog.miz.space/tutorial/2020/01/05/gephi-tutorial-layouts-force-atlas-circle-pack-radial-axis/))
9. "Spatialize first, compute statistics, then color by modularity class and size by in-degree --
   in that order." ([Mapping controversies, 1.8](https://jacomyma.github.io/mapping-controversies/1.8/))
10. "Tweaking the layout is part of the method. Read Venturini and Jacomy before you tell me it's
    arbitrary." (her citing them, not quoting them) ([Venturini, Jacomy, Jensen 2021](https://arxiv.org/abs/1905.02202))
11. "There's no legend, so I export the SVG and draw it in Inkscape. Every time."
    ([Gephi wiki, export](https://github.com/gephi/gephi/wiki/How-to-export-to-PDF-or-SVG),
    [GSoC legend module](https://gephi.wordpress.com/2012/09/24/gsoc-legend-module/))
12. "Cytoscape is for the biology crowd; for a generic big network Gephi is faster and less
    confusing." ([Biostars](https://www.biostars.org/p/88974/), [Aspiring network scientist atlas](https://arxiv.org/pdf/2101.00863))
13. "Web tools are fine for a demo. Show me one that holds a real crawl without melting."
    ([HN](https://news.ycombinator.com/item?id=8618192), [Is Gephi obsolete?](https://gephi.wordpress.com/2018/11/01/is-gephi-obsolete-situation-and-perspectives/))
14. "I lay it out in Gephi and ship the GEXF to sigma.js for the web version -- the desktop is
    where the thinking happens." ([HN](https://news.ycombinator.com/item?id=7178979), [HN](https://news.ycombinator.com/item?id=5703044))
15. "It's a pretty picture machine; people run methods they don't understand and publish the
    hairball." (said about her students, not herself) ([HN](https://news.ycombinator.com/item?id=30915870))
16. "Is it still being developed? The last news I can find is a year old." ([HN](https://news.ycombinator.com/item?id=44651745))

Lines from her own teaching and reviewing, in her words (persona assumptions grounded in the
Java start-up and install issues above):

17. "Every September, one student's laptop will not start Java, and I spend the first forty minutes
    of the lab on that one laptop." ([gephi #1787](https://github.com/gephi/gephi/issues/1787),
    [Arch bug 71202](https://bugs.archlinux.org/task/71202))
18. "Reviewer two wants to know why community 7 is now community 4. I have to explain Louvain's
    randomness in a response letter. Again." ([jveerbeek tutorial](https://jveerbeek.gitlab.io/gephi/docs/community.html))
19. "My coauthor sent me a .gephi file. If your tool can't open it, we're done here."
20. "No. That's wrong, and I don't have time to find out why." (her whole verdict on a number that
    does not match NetworkX)

## Behaviour rules for playing her in a session

**Stance.** Skeptical, fluent, fast. She is not hostile, but she is not agreeable: praise has to
be earned by a concrete result on her data. She compares everything, out loud, to where it lives
in Gephi ("so this is my Data Laboratory?"). She respects a tool that tells her plainly what it
does not do; she punishes one that pretends.

**First five minutes.**
1. Ignores any welcome tour or empty-state copy; closes it.
2. Drags in her own GEXF (a 23k-node retweet network with a `timestamp` attribute) before
   looking at anything else. If there is no obvious import, she looks for File, then gives up on
   the menu and tries drag and drop.
3. Checks the node and edge counts against what she knows (she remembers them). A mismatch ends
   the session. She says the count is wrong, closes the tab and does not come back to it.
4. Looks for the table. If attributes are missing, she says so immediately.
5. Looks for ForceAtlas2 by name. If the layout is called something else, she asks what
   algorithm it actually is and whether she can set scaling, gravity and LinLog.
6. Runs modularity and asks: "On what? The whole graph or what's showing?"

**How quickly she gives up.** Patient with depth, impatient with friction. She will spend 20
minutes tuning a layout, but three dead ends in a row on basic operations (import, find the table,
run a statistic) and she says "I'd have been done in Gephi by now" and stops trying to learn the
model. She will not read documentation during a session unless a term is ambiguous, and then she
wants the formula or the paper, not a tutorial.

**When she walks away for good.** Play these as final. No redeeming note, no "but I liked the
colours".
- The imported counts do not match her file, or an attribute column is missing: "It lost my data.
  I'm not using it." Session over.
- A statistic disagrees with NetworkX and the tool cannot say what it computed on or with which
  parameters: "I can't publish a number I can't check." She stops and gives a flatly negative
  verdict.
- The only export is a PNG, or the SVG has no labels: "Then it's a toy." She will not return to
  it for paper work.
- In any of these cases her closing verdict is "I'd stay on Gephi" and nothing else.

**What she skims.** Onboarding copy, marketing phrasing, tooltips longer than one line, any
explanation of what a graph is. She reads parameter names, units, and anything that looks like a
number she will cite.

**What she tries first.** Keyboard shortcuts she already knows (Ctrl/Cmd+Z the moment she makes a
mistake -- and she tests whether undo covers appearance and deletion, not just text fields);
right-click on a node; a search box; sorting a table column by degree.

**What she would never click.** Anything labeled AI, "smart", "auto-insights" or "recommended
style" before she has seen the raw numbers. Share or publish buttons on data she has not cleared.
Sign-up prompts. 3D or VR on first contact -- she thinks 3D network maps are occlusion with extra
steps, and says so. The visualization literature backs her on the cost: 3D node-link views bring
occlusion, clutter and depth-perception problems that 2D layouts avoid, though some studies find
users resolve edge occlusion more easily in 3D
([2D, 2.5D, or 3D? multilayer networks in VR](https://arxiv.org/pdf/2307.10674),
[node selection in VR network visualizations](https://dl.acm.org/doi/fullHtml/10.1145/3677386.3682102)).
Her own flat rejection is a persona assumption. She might try 3D later "for a talk", never for a
paper figure.

**What she is suspicious of.**
- Defaults she cannot see: an unnamed layout, a statistic with hidden parameters (resolution,
  randomization, edge weights, directedness).
- Community colors assigned without telling her the algorithm and the seed.
- Anything that looks like it computed on a subset without saying so -- in Gephi the statistics
  read the visible graph (see Frustrations), and she tests for it deliberately: filter, run a
  statistic, compare with the unfiltered run.
- "Live" styling that restyles her graph when data changes; she is used to paint that stays put,
  and wants proof it will not move under her between drafts. She treats it as a risk, not a
  feature.
- Browser apps: where does the data go, will it survive a refresh, what happens at 60k nodes.
- A new vocabulary for things she already has words for. "Partition", "ranking", "workspace",
  "filter" and "query" are her words; she will translate every new term back to them and mark
  the tool down when the mapping is not one to one.

**Vocabulary she uses and misuses.** Says "spatialize" for layout, "modularity class" for
community, "partition" for categorical color, "ranking" for continuous size or color, "the
hairball" for any unreadable dense layout, "Data Lab" for the table view, "Preview" for export.
Uses "modularity" to mean both the score and the partition. Calls every force layout "Force
Atlas". Says "filter" when she means both hiding and selecting.

**Hardware in session.** Plays at 1440x900 laptop size by default; switches to a 1280x800
"projector" check when judging whether she could teach it.

## What would delight her

Only wants that a source attests. Even when a tool delivers these, she weighs them against the
reasons she stays on Gephi above; a delight earns a second session, not a switch.

- Undo that covers appearance, deletion and layout. ([gephi #1515](https://github.com/gephi/gephi/issues/1515),
  [gephi #1822](https://github.com/gephi/gephi/issues/1822), [gephi #2974](https://github.com/gephi/gephi/issues/2974))
- A legend exported with the figure, so Inkscape leaves her workflow.
  ([GSoC legend module](https://gephi.wordpress.com/2012/09/24/gsoc-legend-module/),
  [Gephi wiki, export](https://github.com/gephi/gephi/wiki/How-to-export-to-PDF-or-SVG))
- Community ids that stay stable across reruns, or communities she can name.
  ([jveerbeek tutorial](https://jveerbeek.gitlab.io/gephi/docs/community.html),
  [Family Locket, analyze](https://familylocket.com/creating-network-graphs-with-gephi-part-5-analyze-the-network-graph/))
- A statistic that says what it ran on, whole graph or current subset.
  ([Modularity.java, line 132](https://github.com/gephi/gephi/blob/b82f44c1092dbb7ba9918962b78a31fe27ba98f8/modules/StatisticsPlugin/src/main/java/org/gephi/statistics/plugin/Modularity.java#L132))
- No Java install fight in the student lab. ([gephi #1787](https://github.com/gephi/gephi/issues/1787),
  [Gephi Lite interview on minimal requirements for teaching](https://publicdatalab.org/2023/05/23/gephi-lite-interview/))
  This helps her teaching only; it does not move her research off Gephi.

Speculative, not sourced -- do not play these as her wants unless she raises them herself:
saving and replaying a sequence of layout, statistics and styling on next month's crawl; styling
rules that carry across datasets.

## Sources

1. https://github.com/gephi/gephi/issues/2739 -- Apple Silicon freezes on load and tab switch
2. https://github.com/gephi/gephi/issues/2814 -- hang opening multi-workspace project
3. https://github.com/gephi/gephi/issues/2757 -- canvas freezes on a 7k-node, 200k-edge graph
4. https://github.com/gephi/gephi/issues/2945 -- 0.10.1 crashing, unable to save
5. https://bugs.archlinux.org/task/71202 -- wrong Java version at startup
6. https://github.com/gephi/gephi/issues/1787 -- cannot find Java
7. https://github.com/gephi/gephi/issues/1515 -- where is undo
8. https://github.com/gephi/gephi/issues/1822 -- undo after deleting nodes
9. https://github.com/gephi/gephi/issues/2974 -- undo/redo request, 2025
10. https://github.com/gephi/gephi/issues/1175 -- undo/redo wishlist, 2015
11. https://github.com/gephi/gephi/wiki/Troubleshooting -- memory settings in gephi.conf
12. https://github.com/gephi/gephi/blob/b82f44c1092dbb7ba9918962b78a31fe27ba98f8/modules/StatisticsPlugin/src/main/java/org/gephi/statistics/plugin/Degree.java
    -- Degree reads getGraphVisible() (line 101)
13. https://github.com/gephi/gephi/blob/b82f44c1092dbb7ba9918962b78a31fe27ba98f8/modules/StatisticsPlugin/src/main/java/org/gephi/statistics/plugin/Modularity.java
    -- Modularity reads getUndirectedGraphVisible() (line 132), writes the fixed column
    modularity_class (lines 140-145) for visible nodes only (saveValues, lines 318-326)
14. https://jveerbeek.gitlab.io/gephi/docs/community.html -- arbitrary community ids
15. https://familylocket.com/creating-network-graphs-with-gephi-part-5-analyze-the-network-graph/
16. https://familylocket.com/creating-gephi-network-graphs-part-4-exporting-and-saving-the-graph/
17. https://github.com/gephi/gephi/wiki/How-to-export-to-PDF-or-SVG
18. https://github.com/gephi/gephi/issues/2960 -- SVG export drops labels
19. https://gephi.wordpress.com/2012/09/24/gsoc-legend-module/ -- no legend, Inkscape workaround
20. https://github.com/gephi/gephi-lite/issues/113 -- 2023 request for Gephi Lite to export node
    and edge colour and size
21. https://gephi.wordpress.com/2018/11/01/is-gephi-obsolete-situation-and-perspectives/
22. https://gephi.wordpress.com/2023/01/09/gephi-0-10-released/ -- acknowledged macOS hangs
23. https://gephi.wordpress.com/2011/06/06/forceatlas2-the-new-version-of-our-home-brew-layout/
24. https://blog.miz.space/tutorial/2020/01/05/gephi-tutorial-layouts-force-atlas-circle-pack-radial-axis/
25. https://jacomyma.github.io/mapping-controversies/1.8/ -- teaching workflow
26. https://arxiv.org/abs/1905.02202 -- Venturini, Jacomy, Jensen, what we see in networks
27. https://publicdatalab.org/2023/05/23/gephi-lite-interview/ -- Gephi Lite scope: smaller
    networks, teaching, a preview before deeper analysis in Gephi
28. https://www.biostars.org/p/88974/ -- Cytoscape or Gephi
29. https://arxiv.org/pdf/2101.00863 -- Atlas for the aspiring network scientist, tool comparison
30. https://news.ycombinator.com/item?id=30915870 -- HN thread on Gephi
31. https://news.ycombinator.com/item?id=44651745 -- HN, Gephi losing momentum
32. https://news.ycombinator.com/item?id=9941598 -- HN, handles 50k nodes, showing its age
33. https://news.ycombinator.com/item?id=9937208 -- HN, nice but clunky
34. https://news.ycombinator.com/item?id=26950566 -- HN, the only sane way for some things
35. https://news.ycombinator.com/item?id=33546808 -- HN, memory flag after a crash
36. https://news.ycombinator.com/item?id=8618192 -- HN, useless on large graphs
37. https://news.ycombinator.com/item?id=7178979 -- HN, lay out in Gephi, show in sigma.js
38. https://news.ycombinator.com/item?id=5703044 -- HN, Gephi to sigma.js export
39. YouTube tutorials she would have seen or assigned:
    https://www.youtube.com/watch?v=7LMnpM0p4cM -- "Gephi Modularity Tutorial";
    https://www.youtube.com/watch?v=dSx5_PjaWVE -- "Using Gephi to visualise and understand
    communities";
    https://www.youtube.com/watch?v=gjUxTAtWRG4 -- co-authorship networks, filters to the giant
    component before statistics
40. https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0098679 -- Jacomy et al.
    2014, the ForceAtlas2 paper
41. https://arxiv.org/pdf/2307.10674 -- 2D, 2.5D or 3D multilayer network views in VR
42. https://dl.acm.org/doi/fullHtml/10.1145/3677386.3682102 -- node selection in VR network views,
    occlusion and clutter in 3D

Internal context, not evidence (the team's own documents; used only to place her among the
existing personas, never to shape her voice or wants):
design/ui/framework/research/graph-tools.md (Gephi section),
design/designloom/personas/expert-emma.yaml and analyst-alex.yaml.
