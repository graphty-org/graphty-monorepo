# Temporal and Dynamic Network Data and Analysis

**Summary.** Almost every population that uses graph software has time in its data: a transaction has a date, a
logon has a timestamp, a citation has a publication year, a letter has a (sometimes uncertain) date, a contact has an
exposure window, a tweet has a second. What differs is how much of the analysis depends on that time. For some
users (bibliometric analysts, temporal network researchers, social media researchers) "how did this network change?"
is the research question. For others (investigators, AML analysts, threat hunters, epidemiologists) time is a filter
and a constraint: "what happened in this window, and could A have passed something to B given the order of events?"
For a third group (brain imaging, finance, climate) the network does not exist until it is built from per-node
signals, one window at a time. This document defines the time models these users actually work with, how they load,
play, filter and measure them in today's tools, and what a graph product must do to serve them. It deepens Graphty's
workflow W19 (Network Evolution Analysis) and supplies the time model that the investigation, security,
epidemiology, bibliometrics and social media workflows assume but never define.

Cross-references in this folder: `financial-crime-fraud-aml-kyc.md` (time bar and aggregated transaction links),
`cybersecurity-graph-work.md` (logon events), `public-health-and-molecular-epidemiology.md` (cluster growth),
`digital-humanities-and-historical-networks.md` (uncertain historical dates), `network-neuroscience-connectomics.md`
(sliding-window connectivity), `network-scientists-and-analysis-method-validity.md` (time-respecting paths),
`social-media-disinformation-and-marketing.md` (live stream ingestion), `code-first-data-scientists-and-graph-ml.md`
(temporal graph learning), `ecological-interaction-networks.md` (food webs; animal social networks are covered here).

---

## 1. Population

Temporal network work is not one job title. It is a cross-cutting need with six layers:

| Layer                             | Who                                                                                                                                                                                                                                                                            | How time is used                                                                                                           | How often                                                           |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Time is the question              | Bibliometric and science-of-science analysts (research librarians, research-office analysts, scientometricians); computational social scientists and learning-analytics researchers; social media and communication researchers; network scientists studying temporal networks | Build snapshot series, compute metrics per slice, track clusters, detect bursts, animate, publish evolution figures        | Every project                                                       |
| Time is a filter and a constraint | Intelligence and police analysts, AML and fraud investigators, SOC analysts and threat hunters, investigative journalists                                                                                                                                                      | Time bar or timeline filter, play the case forward, check event order, aggregate parallel events per pair, pattern of life | Every case; usually as a filter, not as metrics                     |
| Time is a validity rule           | Epidemiologists and contact tracers, molecular epidemiologists                                                                                                                                                                                                                 | Exposure and infectious windows, transmission must respect onset order, cluster growth in the last N months                | Every outbreak                                                      |
| Time builds the network           | Network neuroscientists (dynamic functional connectivity, fMRI and MEG), quantitative finance researchers (rolling asset correlation trees), climate scientists (climate networks)                                                                                             | Derive one network per window from node signals, then measure and cluster the windows (model F, workflow 5.7)              | Every study                                                         |
| Time is a grouping rule           | Animal social network researchers (behavioral ecologists with GPS, RFID or proximity loggers); wearable-sensor contact researchers (SocioPatterns)                                                                                                                             | Co-location within a time group defines an edge; contacts are short intervals at a fixed resolution                        | Every study (workflow 5.8)                                          |
| Time is a train/test boundary     | Temporal graph ML practitioners (TGN, Temporal Graph Benchmark, PyTorch Geometric Temporal)                                                                                                                                                                                    | Event streams split chronologically; predict future links                                                                  | Every experiment (see `code-first-data-scientists-and-graph-ml.md`) |

**Evidence of scale.**

- Gephi's 2015 community survey (285 respondents, not representative) found "more than half of Gephi users have
  never used Gephi to analyse dynamic networks," while "the vast majority" expected to
  ([Gephi blog](https://gephi.wordpress.com/tag/survey/)).
- Of 89 graph-processing users surveyed, 55 reported dynamic graphs, 40 static and 18 streaming (multiple answers
  allowed); they asked to store "the history of the changes made to the vertices and edges" and to animate them
  ([Sahu et al., arXiv 1709.03188](https://arxiv.org/abs/1709.03188)).
- Every commercial investigation toolkit ships a time control: KeyLines/ReGraph time bar and KronoGraph
  ([Cambridge Intelligence](https://cambridge-intelligence.com/methods-visualizing-dynamic-networks/)), Linkurious
  ([manual](https://doc.linkurious.com/user-manual/3.1/timeline)), Neo4j Bloom Slicer
  ([guide](https://neo4j.com/docs/bloom-user-guide/current/bloom-tutorial/slicer/)), Palantir Vertex
  ([docs](https://palantir.com/docs/foundry/vertex/timeline/)), Oracle "Network Evolution"
  ([docs](https://docs.oracle.com/en/database/oracle/property-graph/26.2/spgdg/using-network-evolution-graph-visualization.html)),
  i2 timeline charts and Time Wheel ([i2](https://docs.i2group.com/anb/9.4.0/time_wheel.html)). No usage statistics
  found for these features.
- Temporal ML has a benchmark suite: TGB link prediction datasets run from 157,474 edges (tgbl-wiki) to 67,169,570
  (tgbl-flight); TGB calls more than 5 million edges medium and more than 25 million large, and splits every dataset
  chronologically 70/15/15 ([TGB, arXiv 2307.01026](https://ar5iv.labs.arxiv.org/html/2307.01026)).

**Skill profile.** (a) Coders (statnet in R; pathpy, Raphtory, DyNetX, teneto in Python; spatsoc; neuroimaging
toolboxes) compute per-window metrics and temporal paths in scripts. (b) GUI users (Gephi, CiteSpace, VOSviewer, i2,
KeyLines-based products) filter, play and screenshot. The handoff is a file: GEXF with spells, a start/end CSV, a
folder of snapshots or a matrix stack.

---

## 2. The time models users actually have

This section is the missing definition. Data that already holds edges falls into one of five shapes (A to E); a
sixth group of users must first derive edges from node signals (F). Most tools support only one or two.

| Model                                              | Definition                                                                                                                                                                                                                                                                        | Who has it                                                                                                                                                    | Example                                                                                                                                                                                                                                                                                                                                                           | Tool support                                                                                                                                                                                                                                                                                                                                           |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **A. Point events (contact sequence)**             | Edge = (source, target, t); repeated pairs are separate events; the source records no duration                                                                                                                                                                                    | Transactions, single logon events, emails, tweets and replies, forum posts                                                                                    | Wire transfers, Windows 4624 logon events, retweets                                                                                                                                                                                                                                                                                                               | KeyLines time bar items with `dt` ([KeyLines](https://developers.cambridge-intelligence.com/docs/keylines/time-bar)); pathpy `TemporalNetwork.add_edge(v, w, t)` ([pathpy tutorial](https://ingoscholtes.github.io/csh2018-tutorial/4_temporal_networks.html)); GEXF `timestamp`                                                                       |
| **B. Intervals (interval graph, spells)**          | Element is active over one or more [start, end] intervals, stored either as start and end or as start plus duration                                                                                                                                                               | Directorships, ownership stakes, membership, exposure windows; and events with a native duration: phone calls, network flows, logon sessions, sensor contacts | Officer 2011 to 2016; a CDR (start + duration); a Zeek conn.log row (`ts` + `duration`, [Zeek](https://docs.zeek.org/en/master/scripts/base/protocols/conn/main.zeek.html)); a logon paired with its logoff; a SocioPatterns line covering [t - 20 s, t] ([SocioPatterns hospital](http://www.sociopatterns.org/datasets/hospital-ward-dynamic-contact-network/)) | GEXF `start`/`end` and `<spells>`; networkDynamic `onset`/`terminus` (and a `duration` column); Palladio timespan; Oracle start and end properties                                                                                                                                                                                                     |
| **C. Snapshot series**                             | One complete graph per period, nodes matched by id                                                                                                                                                                                                                                | Panel survey waves, yearly co-authorship, protein networks per condition, monthly genetic-distance runs, per-season animal association networks               | One edge list per year                                                                                                                                                                                                                                                                                                                                            | Gephi slice mode merge ([Gephi docs](https://docs.gephi.org/desktop/User_Manual/Import_Dynamic_Data/)); DyNet "set of state graphs" ([DyNet, PMC5013899](https://pmc.ncbi.nlm.nih.gov/articles/PMC5013899)); CiteSpace slices                                                                                                                          |
| **D. Time-varying attributes**                     | Topology stable, values change (weight, risk score, membership, color, position)                                                                                                                                                                                                  | Dynamic edge weight, account balance, infection status; **time-varying position**: a phone's cell site per call, an animal's GPS fix                          | GEXF dynamic `attvalue` with start/end; ndtv `activate.vertex.attribute(..., onset, terminus)`; a relocation table (id, datetime, x, y)                                                                                                                                                                                                                           | Gephi, ndtv; KronoGraph and law-enforcement tools pair a map with the timeline for pattern of life ([Cambridge Intelligence](https://cambridge-intelligence.com/blog/timeline-investigation-tools-for-law-enforcement/)); most graph tools do not move nodes on a map over time                                                                        |
| **E. Attribute-derived time (single date column)** | A node or edge has one date property, used to filter but not to define existence                                                                                                                                                                                                  | "date" property in a Neo4j or Linkurious schema; publication year                                                                                             | Bloom Slicer ranges over any temporal or numeric property ([Bloom guide](https://neo4j.com/docs/bloom-user-guide/current/bloom-tutorial/slicer/))                                                                                                                                                                                                                 | Bloom, Linkurious, Maltego histogram ([Maltego](https://docs.maltego.com/en/support/solutions/articles/15000060300-visualizing-trends-using-histograms))                                                                                                                                                                                               |
| **F. Signal-derived window networks**              | No edges in the source. Input is a node x time matrix of signals; the user chooses window length, step, taper, connectivity metric and a threshold or target density, and gets one weighted network per window over a fixed node set (which is then model C with D-style weights) | Dynamic functional connectivity (fMRI, MEG); rolling stock-return correlation trees; climate networks from gridded time series                                | Brain region BOLD signals; daily returns of N stocks; temperature anomalies per grid cell                                                                                                                                                                                                                                                                         | Code only: pyunicorn `ClimateNetwork(threshold or link_density)` ([tutorial](https://www.pik-potsdam.de/~donges/pyunicorn/tutorials/ClimateNetworks.html)); Onnela et al.'s minimum spanning tree per window, where window width trades noise for smoothing ([cond-mat/0302546](https://arxiv.org/abs/cond-mat/0302546)); neuroimaging toolboxes (5.7) |

Formal grounding: Holme and Saramaki's "contact sequences" (i, j, t) and "interval graphs" match A and B; they warn "one will always lose information when projecting a temporal
network structure to a static graph" ([Holme and Saramaki 2012, arXiv 1108.1780](https://arxiv.org/abs/1108.1780)).

### 2.1 Conversions users perform (and where they go wrong)

| From -> To                                  | How it is done today                                                                                                            | Decision the user must make                                                                                                                                                              | Evidence                                                                                                                                                                                                             |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Start + duration columns -> intervals (B)   | end = start + duration (CDRs, Zeek conn, sessions); SocioPatterns tij: [t - 20, t]                                              | None: the source holds the true interval. Treat it as a mapping, not as the decay decision below                                                                                         | [Zeek](https://docs.zeek.org/en/master/scripts/base/protocols/conn/main.zeek.html); [Netzschleuder sp_hospital](https://networks.skewed.de/net/sp_hospital) (`time` is "the end of a 20-second interval")            |
| Point events (A) -> intervals (B)           | Give each event a duration                                                                                                      | How long does an event "last"? Saqr: a forum post has "no clear end time. There is no straightforward answer"; he uses post to last reply. Bruns: each @reply lives `decaytime = 1800` s | [Saqr 2023, arXiv 2307.12339](https://arxiv.org/abs/2307.12339); [Bruns, Mapping Online Publics part 1](https://mappingonlinepublics.net/dev/?p=379)                                                                 |
| Single date column (E) -> interval (B)      | Gephi Data Laboratory > Merge Columns > "Create time interval"; leave end blank for open-ended; "Parse numbers" or date parsing | With one column Gephi assumes the element appears at that date "and then stays for ever"                                                                                                 | [Gephi docs](https://docs.gephi.org/desktop/User_Manual/Import_Dynamic_Data/); [Levallois tutorial](https://seinecle.github.io/gephi-tutorials/generated-html/converting-a-network-with-dates-into-dynamic.html)     |
| Events (A) -> snapshots (C)                 | Bin into windows; aggregate repeated events per pair into a weight                                                              | Window length, step, overlap, attribute aggregation. ndtv `slice.par`: "Currently edge attributes are not aggregated"; `rule='latest'` takes the most recent value                       | ndtv vignette ([CRAN](https://cran.r-project.org/web/packages/ndtv/vignettes/ndtv.pdf))                                                                                                                              |
| Snapshots (C) -> intervals (B)              | Gephi: open all slice files (`mode="slice"`, unique `timestamp`), choose Merge                                                  | Identity across files must already be resolved                                                                                                                                           | [Gephi docs](https://docs.gephi.org/desktop/User_Manual/Import_Dynamic_Data/); [Levallois, simple dynamic network](https://seinecle.github.io/gephi-tutorials/generated-html/creating-a-simple-dynamic-network.html) |
| Positions (D) -> co-location edges (A or C) | spatsoc `group_times(threshold = '5 minutes')`, then `edge_dist(threshold = 50)` or `edge_nn` within each time group            | Time threshold (absorbs GPS fix-time jitter) and distance threshold                                                                                                                      | [spatsoc vignette](https://cloud.r-project.org/web/packages/spatsoc/vignettes/intro.html)                                                                                                                            |
| Signals (F) -> window networks (C)          | Sliding-window correlation per node pair, then threshold                                                                        | Window length, step, metric, threshold; no agreed window length (5.7)                                                                                                                    | [Shakil et al. 2016, PMC4889509](https://pmc.ncbi.nlm.nih.gov/articles/PMC4889509)                                                                                                                                   |
| Any -> static aggregate                     | Collapse all time; count or sum                                                                                                 | Loses time order; "time ordering can matter a lot"                                                                                                                                       | [Holme and Saramaki](https://arxiv.org/abs/1108.1780)                                                                                                                                                                |

**Known traps reported by users.**

- Parallel edges between the same pair: Gephi merges them by increasing weight, so per-period edges can collapse
  (see `network-scientists-and-analysis-method-validity.md`).
- Interval bounds: in Gephi, brackets include endpoints and parentheses exclude them, GEXF bounds are inclusive and a
  missing `end` means infinite; GEXF edges must fall within both endpoints' lifetimes; one representation
  (timestamps or intervals) per network, "you cannot mix them"
  ([Gephi docs](https://docs.gephi.org/desktop/User_Manual/Import_Dynamic_Data/)). KeyLines is half-open,
  `dt1 <= dt < dt2` ([KeyLines API](https://developers.cambridge-intelligence.com/api/keylines/time-bar)).
- Time zones: KeyLines displays in UTC but returns ranges in local time ([KeyLines time zones](https://developers.cambridge-intelligence.com/docs/keylines/time-zones));
  Bloom's filter and rule-based styles "ignore the time offset" of zoned values by default and changing zone changes
  histogram bins ([Neo4j Bloom 2.1 blog](https://neo4j.com/blog/developer/time-travel-with-neo4j-bloom-2-1/)).
- Uncertain dates: historians record "year only, or 'after Easter 1648'" (see
  `digital-humanities-and-historical-networks.md`). General graph tools do not model this (Palladio's timespan
  filter takes plain start and end dates, [Palladio](https://hdlab.stanford.edu/palladio/tutorials/timespan)), but
  nodegoat does, and is the reference design ("no software knows what you mean by 'circa'"). A date is a Statement
  (offset, unit, operator such as "before begin", date) or a Between Statements pair, so "circa 634 BCE" becomes
  "between 2 years before the begin of -634 and 2 years after the end of -634"; a period with Between Statements at
  both ends has four dates; a time span marks an event shorter than its window
  ([chronology](https://nodegoat.net/guide.s/43/storing-chronology-statements)). Relational statements date a letter
  between Letter Y and Letter Z ([relational](https://nodegoat.net/guide.s/44/storing-relational-chronology-statements)).
  The computed date "is used in the visualisations, filters, and analyses" (stored as ChronoJSON).
- Missing dates: Linkurious counts "Missing values" and "Invalid values" for the timeline property separately
  ([Linkurious 3.1](https://doc.linkurious.com/user-manual/3.1/timeline)); Oracle's docs do not say what happens to
  undated elements. Whether undated items are hidden, always shown or flagged is an unanswered question in most tools.

### 2.2 Growing or live history

Everything above assumes a closed history. Some users have an open-ended present: 18 of 89 Sahu et al. respondents
reported streaming graphs. The de facto
precedent is Gephi's Graph Streaming plugin: a "simple JSON-based format that can be used to post mutations to a
graph" (igraph's example sends `an` and `ae` objects for nodes and edges), received by a "Master" server
started from Gephi's Streaming tab; igraph's `GephiGraphStreamer` and Neo4j APOC's `apoc.gephi.add` both send to it
([igraph](https://python.igraph.org/en/main/api/igraph.remote.gephi.GephiGraphStreamer.html),
[APOC](https://neo4j.com/apoc/5/export/gephi)). What a live history needs that a closed one does not:

- add, change and delete events applied in a defined order, appended to the time index without a reload;
- a window that can follow "now" (the latest event) as well as sit at a fixed range;
- incremental layout: new nodes placed near their neighbors without moving everything else (Bruns found running the
  layout during playback "pushes the limits of available processing power", [part 2](https://mappingonlinepublics.net/dev/?p=384)).

The social media document asks for live ingestion with time-windowed views and incremental layout. The counterweight
is `cybersecurity-graph-work.md`: no source found of analysts watching a live-updating general graph; they query a
store and load a bounded window. Live append is therefore a Should, not a Must (T20).

---

## 3. Personas

### 3.1 Dr. Leena Virtanen -- temporal network researcher (`temporal-network-researcher`)

- **Role.** Assistant professor in learning analytics or computational social science; studies how interaction
  networks form over a course or project. Strong R (statnet); her readers are not network scientists.
- **Tools today.** networkDynamic, tsna and ndtv in R; sometimes pathpy; Gephi for a quick look. Grounded in Saqr's
  MOOC tutorial ([arXiv 2307.12339](https://arxiv.org/abs/2307.12339)) and the ndtv vignette examples (workflow 5.4).
- **Data.** Timestamped interactions (forum replies, chats): a few hundred nodes, thousands to tens of thousands of
  events, role attributes.
- **Goals.** Show when groups form and dissolve; compare phases; find who reaches whom and how fast.
- **Frustrations.** Assigning durations to point events; choosing window length; about 450 nodes is unreadable, so
  she subsets to degree > 20; papers need static figures, so she makes filmstrips.

### 3.2 Marcus Hale -- bibliometric evolution analyst (`bibliometric-evolution-analyst`)

- **Role.** Research analyst in a university library or research office, or a PhD student writing a scientometric
  review. Not a coder; expert in Web of Science and Scopus exports.
- **Tools today.** CiteSpace (time slices, timeline view, bursts), VOSviewer (overlay by average year), bibliometrix
  (thematic evolution). An SMU library guide says CiteSpace "has too many options for most users"
  ([SMU guide](https://library.smu.edu.sg/topics-insights/citespace-bibliometric-mapping-tool-power-users-reviews-business)).
- **Data.** 500 to 20,000 records; derived networks of hundreds to a few thousand references, authors or keywords.
- **Goals.** Research fronts and turning points; clusters with labels, bursts, modularity and silhouette; a timeline
  figure.
- **Frustrations.** Slice length changes clusters (5.3); reproducibility; non-WoS formats are "quite tricky".

### 3.3 Dr. Tomas Rey -- social media dynamics researcher (`social-media-dynamics-researcher`)

- **Role.** Communication researcher analyzing hashtag conversations, retweet cascades and coordinated campaigns.
  Moderate scripting; Gephi power user.
- **Tools today.** Collection scripts; dynamic GEXF in Gephi; Hoaxy-style cumulative share timelines
  ([Hoaxy](https://iuni.iu.edu/projects/hoaxy)). Grounded in Axel Bruns' #spill workflow: @replies as edges living 30
  minutes, converted with gawk, filtered to active users, played with 15-minute and one-hour windows, exported as
  video ([part 1](https://mappingonlinepublics.net/dev/?p=379), [part 2](https://mappingonlinepublics.net/dev/?p=384)).
- **Data.** 10^3 to 10^6 accounts, 10^4 to 10^7 interactions, directed multi-edges timestamped to the second.
- **Goals.** How a conversation ignited, who bridged communities when, when it died down.
- **Frustrations.** Edge-weight averaging "underestimates the weight" over long spans; layout during playback lags;
  video had to be sped up 2x to fit an upload limit.

### 3.4 Sgt. Dana Okafor -- timeline-driven investigator (existing persona `intelligence-analyst`, temporal facet)

- **Role.** Police or intelligence analyst; the same pattern applies to AML investigators and SOC analysts.
- **Tools today.** i2 Analyst's Notebook timeline charts (theme lines, event frames) and Time Wheel, or a KeyLines or
  KronoGraph application (workflow 5.2). Grounded in Cambridge Intelligence's law-enforcement material: lawful
  interception, phone downloads, tower dumps and OSINT; pattern of life by hour and weekday
  ([Cambridge Intelligence](https://cambridge-intelligence.com/blog/timeline-investigation-tools-for-law-enforcement/)).
- **Data.** Call detail records (start + duration, and the cell site serving each call), tower dumps (every phone on
  a mast in a time range), phone downloads with location history, transactions, logons: thousands to millions of
  events among tens to thousands of entities. Location over time is part of pattern of life (Cambridge Intelligence,
  above).
- **Goals.** Reconstruct the sequence around an incident; show who called whom just before and after, and where each
  phone was; build a court chart in time order.
- **Frustrations.** Network view, map and timeline are separate tools or separate charts; date and time must be
  configured in the schema before anything plots (the IBM note requires a schema edit and server redeploy).

### 3.5 Dr. Priya Lund -- animal social network researcher (`animal-social-network-researcher`)

- **Role.** Behavioral ecologist (postdoc or faculty) studying how sociality in caribou, birds or bats changes across
  seasons and years. Not covered elsewhere in this folder: `ecological-interaction-networks.md` covers species
  interaction networks such as food webs.
- **Tools today.** R: spatsoc for grouping GPS relocations in time and space, asnipe for association indices,
  igraph for metrics. Composite grounded in the spatsoc vignettes (workflow 5.8).
- **Data.** Relocation tables (id, datetime, x, y) at a fixed fix rate, tens to hundreds of collared animals, months
  to years; also RFID or proximity-logger contacts (model B).
- **Goals.** Compare networks between seasons or years; test against randomized data streams; relate centrality to
  survival or movement.
- **Frustrations.** Results depend on the time and distance thresholds; the map (where animals were) and the network
  (who was with whom) live in different plots.

---

## 4. Use cases (ranked)

| #   | Question                                                                                        | Populations                                                                                | Frequency                             | Stakes                                                                             |
| --- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------- | ---------------------------------------------------------------------------------- |
| 1   | What did the network look like during this window?                                              | Investigators; researchers                                                                 | Constant                              | High: wrong window = missed or false link                                          |
| 2   | Play it forward: in what order did links appear and disappear?                                  | Investigators, social media researchers, teachers presenting                               | Every case or paper                   | Medium to high                                                                     |
| 3   | How did size, density, centrality and clustering change per period?                             | Researchers, bibliometric analysts, network-health monitoring                              | Every study                           | High for papers (claims rest on it)                                                |
| 4   | Which clusters formed, grew, merged, split or died?                                             | Bibliometrics, epidemiology (cluster growth), social media                                 | Every study; monthly in public health | High: CDC priority clusters trigger funded responses (see public-health doc)       |
| 5   | Could A have reached B given event order? (time-respecting path, reachability, latency)         | AML (money flow), security (logon chains), epidemiology (transmission), diffusion research | Every case in those domains           | Very high: an impossible path in court or in an outbreak report is a serious error |
| 6   | When was this entity active? (select node -> see its activity over time)                        | Investigators                                                                              | Constant                              | Medium                                                                             |
| 7   | What is new, gone or persistent between period 1 and period 2?                                  | Researchers, biologists (conditions), risk analysts                                        | Often                                 | Medium                                                                             |
| 8   | Is there a burst or periodic pattern (time of day, weekday)?                                    | Investigators (pattern of life), bibliometrics (citation bursts)                           | Often                                 | Medium                                                                             |
| 9   | Reproduce the evolution figure or video for a paper, report or court                            | All                                                                                        | Every deliverable                     | High                                                                               |
| 10  | Which recurring network states does the system pass through, and how long does it stay in each? | Neuroscientists (dFC), finance researchers                                                 | Every study                           | High for papers; validity is contested (5.7)                                       |
| 11  | Where was each entity, and who was near whom, in this window? (network and map together)        | Investigators (cell sites), animal ecologists (GPS)                                        | Every case or study                   | High                                                                               |

---

## 5. Step-by-step workflows

### 5.1 Load temporal data and play it back in Gephi (GUI researcher)

Sources: [Gephi Import Dynamic Data](https://docs.gephi.org/desktop/User_Manual/Import_Dynamic_Data/),
[Levallois](https://seinecle.github.io/gephi-tutorials/generated-html/converting-a-network-with-dates-into-dynamic.html),
[Bruns part 2](https://mappingonlinepublics.net/dev/?p=384), [Heymann slides](https://www.slideshare.net/slideshow/gephi-dynamic-features/16082594).

1. **Prepare the file (hours to days, outside Gephi).** Dynamic GEXF (`mode="dynamic"`, `timerepresentation`,
   `timeformat`, `start`/`end` or `timestamp`, `<spells>`, dynamic `<attvalue>`), one slice-mode GEXF per period, or a
   CSV with date columns. Bruns wrote two gawk scripts and chose a 1800 s event duration.
2. **Open.** For slices, select all files and choose Merge; check the import report says the graph is dynamic.
3. **Convert date columns.** Data Laboratory > Merge Columns > "Create time interval".
4. **Lay out first.** Run ForceAtlas over the whole span and freeze ("static network, dynamic connections"), or keep
   it running during playback and accept lag.
5. **Filter.** Degree >= 10 took Bruns' 5,485 nodes and 12,805 edges to 495 nodes; the timeline's dynamic range
   filter must be nested with other filters.
6. **Size the window and play.** Without a window Gephi errors "cannot animate timeline without an animation
   interval"; Bruns used one-hour and 15-minute windows over five hours of data.
7. **Dynamic statistics (optional).** Nodes, edges, degree, clustering over time with a window and a "tick"
   ([javadoc](https://gephi.org/javadoc/0.9.3/org/gephi/statistics/spi/DynamicStatistics.html)).
8. **Export.** No built-in video export; users screen-record. Static figures from Preview.

Time: data prep dominates. Handoff: video, a few frames, the GEXF.

### 5.2 Filter and play a case with a time bar (investigator; KeyLines, Bloom, Linkurious, Palantir, Oracle, i2)

Sources: [KeyLines time bar](https://developers.cambridge-intelligence.com/docs/keylines/time-bar),
[Bloom Slicer](https://neo4j.com/docs/bloom-user-guide/current/bloom-tutorial/slicer/),
[Linkurious](https://doc.linkurious.com/user-manual/3.1/timeline), [Palantir](https://palantir.com/docs/foundry/vertex/timeline/),
[Oracle](https://docs.oracle.com/en/database/oracle/property-graph/26.2/spgdg/using-network-evolution-graph-visualization.html),
[IBM i2](https://www.ibm.com/support/pages/how-can-i-do-datetime-analysis-analysts-notebook-data-information-store).

1. **Make time visible (admin, once).** Linkurious: mark a property as Date in the schema. i2 Information Store: add
   date and time chart properties, redeploy the server, set links to "Controlling". Oracle: enable Network
   Evolution, pick start (and optional end) properties, type and unit.
2. **Load events.** KeyLines items carry `id`, `dt` (a date, dates, or `{dt1, dt2}` periods) and optional value `v`.
3. **Read the histogram** (stackable by group in KeyLines; bins adapt in Bloom).
4. **Select a window** by handles, shift-drag (Palantir), date pickers or i2 Visual Search "Between". KeyLines
   filters the chart on the `change` event and re-runs layout. Palantir fades rather than hides.
5. **Play.** KeyLines `play()` slides, `play({extend: true})` grows the end (cumulative), negative speed runs
   backward. Bloom: "Slide range to end", "Start of range to end", "Within range", up to five ranges. A Bloom user
   could not make items vanish after an expiry date
   ([forum](https://community.neo4j.com/t/timeline-in-slicer-make-things-appear-and-disappear/63672)): start and end
   are not first class there.
6. **"When was this active?"** KeyLines selection lines; KronoGraph per-entity rows, heatmaps and "scale wrapping" to
   hour of day or weekday for pattern of life, beside a map
   ([Cambridge Intelligence](https://cambridge-intelligence.com/blog/timeline-investigation-tools-for-law-enforcement/)).
7. **Aggregate** events per pair (count, sum, first, last); see the AML document.
8. **Report.** i2 timeline chart for the case file or court; screenshots captioned with window dates.

Time: minutes per question once configured; configuration can take days.

### 5.3 Time-sliced evolution of a research field in CiteSpace (bibliometric analyst)

Sources: [CiteSpace 101 slicing](https://sites.google.com/site/citespace101/6-configure-a-citespace-run/6-1-time-slicing),
[interpret results](https://sites.google.com/site/citespace101/first-example/4-3-interpret-results),
[Chen et al. 2010, arXiv 1002.1985](https://arxiv.org/abs/1002.1985), [arXiv 2411.19858](https://arxiv.org/pdf/2411.19858).

1. **Export records** from Web of Science, or convert Scopus, Lens, PubMed, CNKI.
2. **Set the span and Years Per Slice** (typically 1). One network per slice.
3. **Select nodes per slice:** g-index with k (25 commonly reported) or Top N (Chen et al.: top 100 in each of 13
   one-year slices).
4. **Run.** Slices merge into one network (Chen et al.: 655 co-cited references), "synthesizing a series of
   individual network snapshots".
5. **Cluster and label;** check modularity Q and silhouette (0.7 or higher makes labeling "more straightforward").
6. **Read time:** link color = slice of first co-citation; "citation tree rings" per slice; red ring = burst;
   purple ring = betweenness > 0.1.
7. **Timeline view:** one row per cluster, nodes at their year.
8. **Burst list** with start, end and strength; **report** timeline figure, burst and cluster tables. Slicing changes
   clusters versus an unsliced run ([CiteSpace blog, search excerpt](https://citespace.podia.com/blog/b026e45b-1011-4670-91d2-07c7f9bb4ea0)).

Alternatives: VOSviewer overlay colors terms by average publication year
([TU Delft](https://tudelft.nl/library/research-analytics/case-2-evolution-of-research)); bibliometrix
`thematicEvolution` with chosen cutting years and a Sankey ([docs](https://rdrr.io/cran/bibliometrix/man/thematicEvolution.html)).

### 5.4 Per-window metrics and animation in R (temporal network researcher)

Sources: [Saqr 2023](https://arxiv.org/abs/2307.12339), [ndtv vignette](https://cran.r-project.org/web/packages/ndtv/vignettes/ndtv.pdf),
[compute.animation](https://search.r-project.org/CRAN/refmans/ndtv/html/compute.animation.html),
[tsna vignette](https://cran.r-project.org/web/packages/tsna/vignettes/tsna_vignette.html).

1. **Clean events:** drop self-loops, count pairs into a static base network, convert time to numeric days.
2. **Assign durations:** an edge-spell table with `onset`, `terminus`, `tail`, `head`, censoring flags.
3. **Build:** `networkDynamic(base.net, edge.spells)`; subset to degree > 20.
4. **Look:** `network.extract(onset = 1, terminus = 7)` per week; `filmstrip()`; `timePrism()` (3D stack);
   `timeline()`.
5. **Metrics per window:** `tSnaStats(nd, snafun = "gden", time.interval = 1, aggregate.dur = 7)` (7-day windows
   stepped daily); likewise reciprocity, centralization, centralities.
6. **Reachability:** `tPath(nd, v = 44)` gives the earliest-arrival tree from a facilitator.
7. **Animate:** `compute.animation(net, slice.par = list(start, end, interval, aggregate.dur, rule = "latest"))`, then
   `render.d3movie()` for an HTML player.
8. **Tune slicing (the key judgment).** Instantaneous slices show mostly isolates; 2.5-minute aggregation reveals
   "triads and groups"; overlapping slices make "changes ... less dramatic"; high-turnover data "appears to change
   chaotically" until a week-long window is used.

Time: a day to a week of scripting; rerun on every parameter change.

### 5.5 Time-respecting path checks (AML, security, epidemiology)

| Domain                   | Rule                                                                                                                                     | How it is done today                                                                                                                                                                                              | Source                                                                                                                     |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| AML circular flows       | Ring of 3 to 6 transactions, each later than the previous, amount within a tolerance                                                     | Cypher quantified path pattern with `WHERE tx_i.date < tx_j.date` between consecutive hops, and `0.80 <= tx_i.amount / tx_j.amount <= 1.00`; uniqueness via APOC; Neo4j 5.9+                                      | [Neo4j transaction ring use case](https://neo4j.com/developer/industry-use-cases/finserv/retail-banking/transaction-ring/) |
| Lateral movement         | Login B continues login A if A's destination is B's source and A occurred within 24 hours before B                                       | Hopper builds a login graph from 780 million logins over 15 months; causal path search backward with a 24 h window (chosen to match maximum session length); 48 h still detected 89.9%                            | [Hopper, USENIX Security 2021, arXiv 2105.13442](https://arxiv.org/abs/2105.13442)                                         |
| Disease transmission     | Infectee's exposure window must overlap infector's timeline; earliest exposure = onset - max incubation, latest = onset - min incubation | Chainchecker flags inconsistent links in orange (example: infector died before infectee was exposed) and exports flagged links as CSV                                                                             | [Chainchecker, PMC7894960](https://pmc.ncbi.nlm.nih.gov/articles/PMC7894960/)                                              |
| Diffusion / causal paths | Consecutive edges (a,b,t), (b,c,t') with 0 < t' - t <= delta                                                                             | pathpy builds a time-unfolded DAG (`DAG.from_temporal_network(t, delta)`) and extracts or samples causal paths; exhaustive extraction on hospital data with delta = 3 was interrupted, sampling 50 roots was used | [pathpy tutorial](https://ingoscholtes.github.io/csh2018-tutorial/4_temporal_networks.html)                                |
| Learning interactions    | Forward reachable set and earliest-arrival path                                                                                          | tsna `tPath`, `tReach`, `forward.reachable`                                                                                                                                                                       | [tsna vignette](https://cran.r-project.org/web/packages/tsna/vignettes/tsna_vignette.html)                                 |

Steps (synthesized from the sources above): (1) pick the start entity and time (alerted account, compromised host,
index case); (2) choose the waiting-time limit, a domain parameter (24 h, an incubation range, delta); (3) search
forward or backward respecting order; (4) read latency, "the shortest time within which i can reach j" (Holme and
Saramaki), and hop count; (5) compare with the static view, which shows paths that cannot have happened; (6) report
the path as an ordered, timestamped list (court exhibit, outbreak report, incident timeline).

Tool support gap: we found no time-respecting path function in the NetworkX, igraph or Gephi documentation
reviewed (consistent with `network-scientists-and-analysis-method-validity.md`), nor in KeyLines, Linkurious, Bloom
or i2 documentation reviewed here. nodegoat's computed dates feed its filters and network visualizations, but we
found no nodegoat documentation of time-respecting path search (no source found). Users write Cypher, Python or R.

### 5.6 Community evolution and two-period comparison

Sources: [Greene tracker](https://github.com/derekgreene/dynamic-community/blob/master/README.md),
[Rosvall and Bergstrom 2010](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC2811724/),
[DyNet](https://pmc.ncbi.nlm.nih.gov/articles/PMC5013899), [NetEvViz](https://www.cs.umd.edu/users/ben/papers/Khurana2011Visual.pdf).

1. **Detect communities per snapshot**, one file per step.
2. **Match across steps:** Greene et al.'s tracker uses a threshold `-t` (default 0.1) and writes a timeline of
   dynamic communities.
3. **Test significance:** Rosvall and Bergstrom bootstrap (for example 1,000 networks), keep nodes co-clustered in
   95% as the significant core, and draw an alluvial diagram of merges and splits.
4. **Two-period diff:** NetEvViz (a NodeXL extension) colors edges only-first green, only-second blue, both red;
   DyNet colors condition-specific edges on a union "central reference network" and ranks nodes by rewiring score.
5. **Report** an alluvial figure, a births/deaths/merges/splits table and rewiring ranks.

Public-health variant: new members per molecular cluster in the last 12 months, ranked by growth relative to size
(`public-health-and-molecular-epidemiology.md`, 5.5).

### 5.7 Signals to per-window networks: dynamic functional connectivity (neuroscientist)

Sources: [Allen et al. 2014, PubMed 23146964](https://pubmed.ncbi.nlm.nih.gov/23146964/),
[Savva et al. 2019, PMC6456784](https://pmc.ncbi.nlm.nih.gov/articles/PMC6456784/),
[Shakil et al. 2016, PMC4889509](https://pmc.ncbi.nlm.nih.gov/articles/PMC4889509),
[Liuzzi et al. 2019, PMC6688728](https://pmc.ncbi.nlm.nih.gov/articles/PMC6688728/). Detail on the field:
`network-neuroscience-connectomics.md`.

1. **Get node signals.** Parcellate the brain into regions (an atlas, or components from spatial ICA as in Allen et
   al.) and average the signal per region: a regions x time matrix.
2. **Choose the window:** length, step (often one TR), shape (rectangular or tapered). There is no agreed length:
   Savva et al. tested 20 to 150 s ("the window size is often empirically chosen"); Shakil et al. found length and
   offset dominate, and states were recovered only when the window matched the state duration. Leonardi and Van De
   Ville's rule, windows longer than the slowest wavelength (about 100 s), is reported second-hand (search excerpt).
3. **Compute connectivity per window.** Pearson correlation is the default; Savva et al. compared ten metrics
   (Spearman, partial correlation, mutual information, and others) and found results depend on the metric. MEG users
   use amplitude envelope correlation, phase locking value or coherence (Liuzzi et al.).
4. **Threshold or keep weights.** Keep the full weighted matrix, or threshold to a fixed density so windows are
   comparable (the climate-network equivalent is pyunicorn's `link_density`).
5. **Measure each window.** Graph metrics per window form time series, as in 5.4.
6. **Cluster windows into states.** k-means on the windowed matrices (Allen et al.'s method, the most common
   convention); report each state's mean matrix, dwell time and transition counts.
7. **Test against nulls** (Savva et al.: 250 phase-randomized surrogates per subject): short windows introduce
   "spurious fluctuations", and in simulations sliding windows "gave poor estimates of correlation for each brain
   state" (Shakil et al.); fixed windows miss brief states (Liuzzi et al.).

Handoff: a stack of matrices (regions x regions x windows), a state-by-time sequence and per-state matrices, usually
shown as matrix heatmaps or brain-space glass plots, not as node-link animations.

### 5.8 Positions to association networks per period (animal social network researcher)

Sources: [spatsoc intro](https://cloud.r-project.org/web/packages/spatsoc/vignettes/intro.html),
[spatsoc for social network analysis](https://cloud.r-project.org/web/packages/spatsoc/vignettes/using-in-sna.html),
[spatsoc repository](https://github.com/ropensci/spatsoc/).

1. **Load relocations** as a data.table with id, POSIXct datetime and projected x, y; add a year or season column.
2. **Group in time.** `group_times(DT, datetime = 'datetime', threshold = '5 minutes')`: fixes within the threshold
   count as simultaneous, absorbing the jitter of scheduled GPS fixes.
3. **Group or pair in space** within each time group: `group_pts(threshold = 50, ...)` (chain rule: A near B near C
   is one group), or `edge_dist(threshold = 50, ...)` for all pairs within the distance, or `edge_nn` for each
   animal's nearest neighbor.
4. **Build a network per period.** Subset to one year, `get_gbi()` builds the group-by-individual matrix, then
   `asnipe::get_network(gbi, data_format = "GBI", association_index = "SRI")` (simple ratio index).
5. **Randomize.** `randomizations(type = 'step' | 'daily' | 'trajectory', iterations, splitBy = 'yr')` builds null
   data streams within each year; rebuild networks from them.
6. **Compare.** Centrality and strength per animal per year, observed against random; compare seasons or years.

Wearable-sensor variant (SocioPatterns): contacts arrive already paired as 20-second intervals (`t i j`), so steps
2 and 3 are done by the hardware, and the analyst's first decision is how to aggregate the intervals (by day, by
shift, by cumulative contact time).

---

## 6. Data

| Population                               | Sources                                                                                                                                                                                                        | Formats                                                                                                      | Typical size                                                                                                                                                                                                                                                               | Time properties                                                                                                                                                 |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Investigators                            | CDRs, tower dumps, phone downloads, bank transactions, case records                                                                                                                                            | CSV, XLSX, i2 ANB/ANX, database queries                                                                      | 10^3-10^6 events                                                                                                                                                                                                                                                           | Calls are intervals (start + duration) with a cell site per call (time-varying position); transactions are point events; intervals for ownership and employment |
| AML                                      | Core banking, SWIFT, registries                                                                                                                                                                                | CSV, SQL                                                                                                     | 6-12 months of transactions per case (AML doc)                                                                                                                                                                                                                             | Directed temporal multigraph; amounts on events                                                                                                                 |
| Security                                 | Windows 4624 logons, Zeek, EDR                                                                                                                                                                                 | EVTX, JSON, TSV                                                                                              | LANL dataset: 1,648,275,307 events, 12,425 users, 17,684 computers, 58 days ([LANL](https://csr.lanl.gov/data/cyber1/)); Hopper: 780 million logins over 15 months                                                                                                         | Logon events are points; flows (Zeek `ts` + `duration`) and logon-logoff sessions are intervals; NAT and DHCP make IPs unstable over time                       |
| Temporal network research datasets       | SNAP temporal ([SNAP](https://snap.stanford.edu/data/index.html)), SocioPatterns ([Zenodo](https://zenodo.org/record/1117884)), Netzschleuder ([sp_hospital](https://networks.skewed.de/net/sp_hospital)), TGB | `src dst unix-time` text (SNAP); `t i j` (SocioPatterns); gt, GraphML, GML, CSV (Netzschleuder); TGB loaders | SNAP: CollegeMsg 1,899 nodes / 20,296 temporal edges; email-Eu-core-temporal 332,334; wiki-talk-temporal 7,833,140; sx-stackoverflow 2,601,977 nodes / 63,497,050. SocioPatterns hospital: 75 people, 32,424 contact lines over 97 hours. TGB: 157,474 to 67,169,570 edges | Point events (SNAP, TGB); 20-second intervals ending at t (SocioPatterns)                                                                                       |
| Neuroscience, finance, climate (model F) | fMRI and MEG time series, returns, gridded climate data                                                                                                                                                        | NIfTI-derived matrices, CSV, NetCDF; output is a matrix stack                                                | Tens to hundreds of nodes, hundreds to thousands of windows (no source found for typical counts)                                                                                                                                                                           | Fixed node set; weights change per window                                                                                                                       |
| Animal social networks                   | GPS collars, RFID, proximity loggers                                                                                                                                                                           | CSV relocation tables                                                                                        | Tens to hundreds of animals over months to years                                                                                                                                                                                                                           | Positions at a fix rate; co-location grouped by a time threshold                                                                                                |
| Epidemiology                             | Line lists, contact interviews, sequences                                                                                                                                                                      | CSV, VHF database template, MicrobeTrace inputs                                                              | Tens to thousands of cases                                                                                                                                                                                                                                                 | Dates of onset, death, exposure windows (intervals derived from incubation ranges)                                                                              |
| Bibliometrics                            | WoS, Scopus, OpenAlex, Lens                                                                                                                                                                                    | WoS plain text, RIS, CSV                                                                                     | 500-20,000 records                                                                                                                                                                                                                                                         | Publication year (yearly granularity); citation time per slice                                                                                                  |
| Social media                             | Platform APIs, archives, scrapers                                                                                                                                                                              | JSON, CSV                                                                                                    | 10^4-10^7 interactions                                                                                                                                                                                                                                                     | Second-resolution events; decay windows invented by the analyst                                                                                                 |
| Learning analytics / SNA research        | Forum logs, observations, surveys                                                                                                                                                                              | CSV, R objects                                                                                               | 10^2-10^3 nodes                                                                                                                                                                                                                                                            | Events or panel waves                                                                                                                                           |
| Historians                               | Letters, archives                                                                                                                                                                                              | Spreadsheets, nodegoat                                                                                       | 10^3-10^5 letters                                                                                                                                                                                                                                                          | Uncertain, partial and relative dates; nodegoat Chronology Statements (2.1)                                                                                     |

**Identifier problems over time.** Snapshot merging needs identical ids across periods, but accounts are renamed,
numbers ported, IPs reassigned and authors disambiguated differently per export. LANL hides its real time frame
("the specific timeframe used is not disclosed").

**Scale and how users cut it down.** Observed sizes span four orders of magnitude, from a 75-person hospital ward to
63 million Stack Overflow events and 1.6 billion LANL events. No source we read plays back a full set of that size;
users reduce first: (a) query a time range out of a store (investigators, threat hunters); (b) keep the most active
nodes (Bruns: degree >= 10 took 5,485 nodes to 495; Saqr: degree > 20); (c) aggregate events into snapshots or
per-pair counts (ndtv, CiteSpace, i2 link summing). These sizes are observed in datasets, not targets; requirement T21 turns them into targets.

**Sensitivity.** CDRs, transactions and logons are legally restricted case data; epidemiological contacts are
protected health information; social media data carries platform terms. Time precision itself can identify people.

---

## 7. Analysis methods

| Method                          | What users compute                                                                                      | Tools                                                                                                                                                                                                                                                                                             | Interpretation and validation habits                                                                                                                                         |
| ------------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Time-window filter              | Subgraph active in [t1, t2]                                                                             | All time bars and sliders                                                                                                                                                                                                                                                                         | Window boundaries (inclusive or half-open) rarely stated                                                                                                                     |
| Sliding-window metrics          | Density, reciprocity, degree, centralization, centralities, clustering per window; window length + step | Gephi (window, tick), tsna `tSnaStats`, Raphtory `rolling(window, step)` with PageRank per window ([Raphtory](https://raphtory.readthedocs.io/en/master/user-guide/algorithms/4_view-algorithms/)), DynNetwork ([Cytoscape app](https://apps.cytoscape.org/apps/dynnetwork)), dFC toolboxes (5.7) | Results "depend on the time of measurement"; Clauset and Eagle showed slice structure depends on window length (via Holme and Saramaki). Analysts try several window lengths |
| Cumulative (expanding) metrics  | Growth curves, cumulative shares                                                                        | Raphtory `expand()`, Hoaxy cumulative share plot, KeyLines `extend`, Bloom "start of range to end"                                                                                                                                                                                                | Growth relative to size (public health)                                                                                                                                      |
| Snapshot comparison             | New, removed, persistent edges; Jaccard; rewiring score                                                 | NetEvViz, DyNet, Graphty `comparison-view` (planned)                                                                                                                                                                                                                                              | Visual diff colors; ranks                                                                                                                                                    |
| Community evolution             | Matched communities, alluvial flows, significance                                                       | Greene tracker, Infomap + alluvial generator                                                                                                                                                                                                                                                      | Bootstrap significance before interpreting change                                                                                                                            |
| Burst detection                 | Kleinberg bursts with start, end, strength                                                              | CiteSpace                                                                                                                                                                                                                                                                                         | Burst table in papers                                                                                                                                                        |
| Temporal paths and reachability | Earliest arrival, latency, reachable set, causal paths with max wait                                    | pathpy, tsna, Raphtory, Cypher, Hopper                                                                                                                                                                                                                                                            | Compare to static; justify the waiting limit                                                                                                                                 |
| Periodicity                     | Hour-of-day, day-of-week activity                                                                       | KronoGraph scale wrapping, i2 Time Wheel                                                                                                                                                                                                                                                          | Pattern of life                                                                                                                                                              |
| Statistical models              | Temporal ERGM, relational event models                                                                  | statnet (tergm), R packages                                                                                                                                                                                                                                                                       | Researcher-only; out of scope for a GUI                                                                                                                                      |

---

## 8. Outputs and collaboration

- **Animations and videos**: Gephi screen recordings (Bruns), ndtv `render.d3movie` HTML players, pathpy
  `export_html`. Uploaded to YouTube or shared as files.
- **Small multiples**: ndtv `filmstrip`, weekly `network.extract` panels in papers.
- **Timeline figures**: CiteSpace timeline view; i2 timeline charts in case files and court; KronoGraph exports.
- **Time series charts** of metrics per window; alluvial and Sankey diagrams.
- **Ordered path lists** with timestamps for court, incident reports and outbreak reports.
- **Reproducibility**: researchers report window length, step, aggregation and slice parameters (CiteSpace
  captions carry strings like "time slice length=1, top N=150"); investigators record the window behind each exhibit.

---

## 9. Tools landscape and pain points

| Tool                                 | Time model                                                           | Loved                                                                                                                                                    | Fails                                                                                       |
| ------------------------------------ | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Gephi                                | Intervals, timestamps, spells, dynamic attributes; slices merged     | Free; GEXF is the de facto dynamic format                                                                                                                | Import fragility (2.1); one representation per graph; playback layout lags; no video export |
| KeyLines / ReGraph / KronoGraph      | Events and periods with values                                       | Histogram, selection lines, extend play, pattern of life                                                                                                 | SDK: developers build the experience; filter-then-relayout loses stability                  |
| Neo4j Bloom Slicer                   | Ranges over properties (date, number)                                | Three play modes, five ranges                                                                                                                            | No start/end interval semantics; scene interactions locked while open                       |
| Linkurious                           | Date properties, histogram filter                                    | Missing and invalid value counts                                                                                                                         | Admin schema step; no playback documented                                                   |
| i2 Analyst's Notebook                | Dated links and entities; timeline charts                            | Court-ready timeline charts, Time Wheel                                                                                                                  | Schema and server configuration; separate from network layout                               |
| Palantir Vertex                      | Events and ranges with time series                                   | Fade instead of hide; time series beside graph                                                                                                           | Proprietary                                                                                 |
| CiteSpace                            | Yearly slices merged                                                 | Rich time encoding (ring colors, bursts, timeline view)                                                                                                  | "Too many options for most users"; parameter sensitive                                      |
| VOSviewer                            | Average year as a color                                              | Simple                                                                                                                                                   | No playback, a single average hides spread                                                  |
| statnet (networkDynamic, ndtv, tsna) | Spells with censoring                                                | Most complete model; per-window stats; temporal paths                                                                                                    | Requires R; "fairly experimental" visuals                                                   |
| pathpy, Raphtory                     | Events; windows; causal paths                                        | Correct temporal paths; rolling and expanding views                                                                                                      | Code only                                                                                   |
| Cytoscape DynNetwork, DyNet          | XGMML with time; state graphs                                        | Biology-friendly; union reference layout                                                                                                                 | DynNetwork targets Cytoscape 3.0; niche                                                     |
| nodegoat                             | Chronology Statements: points, periods, uncertain and relative dates | Only tool reviewed that models date uncertainty                                                                                                          | Humanities-specific data model                                                              |
| Gephi Graph Streaming                | Ordered JSON add/change/delete events                                | Live feeds from igraph and Neo4j APOC                                                                                                                    | Desktop plugin; the receiver must be running                                                |
| Cubix                                | Matrix cube: nodes x nodes x time                                    | Rotate or slice the cube into 2D views; used by an astronomer and a neurologist on their own data ([HAL](https://hal.archives-ouvertes.fr/hal-00931911)) | Research prototype; matrices, not node-link                                                 |
| spatsoc + asnipe (R)                 | Relocations grouped by time threshold                                | Fast co-location grouping, randomized nulls                                                                                                              | Code only; no map-plus-network view                                                         |

---

## 10. Layout stability: what practitioners and research say

| Technique                                                | Where used                                                                                                                                                                                                  | Evidence                                                                                                                                                                                                                                                                                                                                                                                                 |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| One layout for the whole period, fixed positions         | Bruns "static network, dynamic connections"; DyNet "central reference network" from the union of states                                                                                                     | Practitioner choice ([Bruns](https://mappingonlinepublics.net/dev/?p=384); [DyNet](https://pmc.ncbi.nlm.nih.gov/articles/PMC5013899))                                                                                                                                                                                                                                                                    |
| Chain layouts: seed each slice with previous coordinates | ndtv `compute.animation` ("each using the previously calculated positions as initial seed coordinates"); `chain.direction = "reverse"` places isolates near future partners; `default.dist` spaces isolates | [compute.animation](https://search.r-project.org/CRAN/refmans/ndtv/html/compute.animation.html)                                                                                                                                                                                                                                                                                                          |
| Overlapping windows                                      | ndtv `interval < aggregate.dur`                                                                                                                                                                             | Reduces abrupt change ([ndtv vignette](https://cran.r-project.org/web/packages/ndtv/vignettes/ndtv.pdf))                                                                                                                                                                                                                                                                                                 |
| Look-ahead / look-behind in force layout                 | pathpy `look_ahead`, `look_behind`                                                                                                                                                                          | [pathpy tutorial](https://ingoscholtes.github.io/csh2018-tutorial/4_temporal_networks.html)                                                                                                                                                                                                                                                                                                              |
| Anchoring to a reference layout (stress)                 | Offline dynamic drawing                                                                                                                                                                                     | Brandes and Mader: anchoring trades layout quality against stability ([GD 2011](https://link.springer.com/doi/10.1007/978-3-642-25878-7_11))                                                                                                                                                                                                                                                             |
| Time on an axis instead of animation                     | CiteSpace timeline, i2 timeline, KronoGraph, time rings                                                                                                                                                     | Beck et al.: representation of time (animation versus timeline) is the main split in dynamic graph visualization ([Beck et al. 2017](https://diglib.eg.org/handle/10.1111/cgf12791))                                                                                                                                                                                                                     |
| Time as a spatial axis (stacked layers, space-time cube) | ndtv `timePrism()` (slices stacked in 3D); Cambridge Intelligence's "3D layers" (Brandes and Corman 2002) "overlays incremental network charts"; Cubix matrix cube                                          | 3D layers "quickly gets complex" ([Cambridge Intelligence](https://cambridge-intelligence.com/methods-visualizing-dynamic-networks/)); Cubix's first version was titled "Visualizing Dense Dynamic Networks with Matrix Cubes" ([Bach et al., CHI 2014](https://hal.archives-ouvertes.fr/hal-00931911)). Occlusion grows with layer count (our inference); no controlled comparison with animation found |
| Re-layout after each filter                              | KeyLines time bar example calls `chart.layout()` after `chart.filter()`                                                                                                                                     | Fast but positions move ([KeyLines](https://developers.cambridge-intelligence.com/docs/keylines/time-bar))                                                                                                                                                                                                                                                                                               |

Experimental evidence: small multiples were significantly faster with no overall error difference; animation was
more accurate for detecting appearance; mental-map preservation had little effect
([Archambault, Purchase and Pinaud 2011](https://pubmed.ncbi.nlm.nih.gov/20498503/)). ndtv's authors report most success with networks
"fairly sparse, where a relatively small number of ties are changing between time slices, and node turnover is not
too high."

Implication: offer both animation (with stable positions) and small multiples or a time axis; never force re-layout
on every frame.

---

## 11. Requirements implied

Coverage is checked against `design/designloom`: workflow W19 and capabilities `temporal-analysis` (planned),
`temporal-navigation` (implemented: "graphty/src/workspace/time/TimeDock.tsx and the session's time window (setWindow,
play, seek)"), `comparison-view` (planned), `animated-transitions`, component `temporal-controls`.

| #   | Requirement                                                                                                                                                                                                                                                                                                        | Priority                                        | Covered by existing records?                                                                                                     |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| T1  | A documented time model: point events, intervals with multiple spells, snapshot series, time-varying attributes (including position), and attribute-derived dates, on both nodes and edges; plus a stated position on signal-derived networks (T24)                                                                | Must                                            | **No.** `temporal-analysis` assumes "edges with timestamp attribute"; no intervals, spells, node lifetimes or dynamic attributes |
| T2  | Import that preserves time: GEXF dynamic (start/end, timestamp, spells, dynamic attvalues, slice merge), CSV start/end columns, CSV start + duration columns, fixed-resolution contact files (SocioPatterns `t i j`, interval [t - resolution, t]), SNAP `src dst time` lists, a folder of snapshots matched by id | Must                                            | **No** (import of GEXF exists, time preservation not specified)                                                                  |
| T3  | Explicit interval semantics shown to the user: inclusive or half-open, open-ended ends, time zone, granularity                                                                                                                                                                                                     | Must                                            | **No**                                                                                                                           |
| T4  | Event-to-interval conversion with a user-set duration or decay (for example 30 minutes) for true point events only, kept separate from the start + duration mapping; interval-to-window binning with window length, step, and overlap                                                                              | Must                                            | Partly (`temporal-analysis` has window size and step; no duration/decay)                                                         |
| T5  | Time bar: activity histogram (stackable by type), window handles, play sliding / cumulative (extend) / shrinking, speed, step, loop, keyboard                                                                                                                                                                      | Must                                            | Mostly (`temporal-navigation` has slider, play, speed, step, ticks); **missing** histogram, cumulative mode, stacked types       |
| T6  | Fade versus hide for out-of-window items, and a defined rule for undated items (always shown, hidden, or flagged with counts of missing and invalid dates)                                                                                                                                                         | Must                                            | Partly (fade specified); undated rule **missing**                                                                                |
| T7  | Selecting entities shows their activity on the time bar (selection lines); selecting a window highlights entities                                                                                                                                                                                                  | Should                                          | **No**                                                                                                                           |
| T8  | Per-window aggregation of parallel events (count, sum, first, last) feeding styles and algorithms                                                                                                                                                                                                                  | Must                                            | **No** (cross-ref AML doc requirement 3)                                                                                         |
| T9  | Metrics per window, sliding and cumulative, over any built-in algorithm (not only counts and density), exported as tidy CSV                                                                                                                                                                                        | Must                                            | Partly (`temporal-analysis` lists counts, density, modularity, component count)                                                  |
| T10 | Time-respecting paths and reachability: earliest arrival, latency, forward and backward reachable sets, ordered path search with a maximum waiting time and optional attribute constraints (amount ratio)                                                                                                          | Must for investigators and epidemiology         | **No** (no capability mentions temporal paths)                                                                                   |
| T11 | Stable layout across time: one layout over the union, chained seeding from the previous window, optional anchoring strength; never re-layout every frame by default                                                                                                                                                | Must                                            | Partly (`temporal-navigation` says maintain positions); chaining and union **not specified**                                     |
| T12 | Small multiples (filmstrip) and a time-axis view as alternatives to animation                                                                                                                                                                                                                                      | Should                                          | **No** (`comparison-view` handles only two states)                                                                               |
| T13 | Two-period diff coloring: only-first, only-second, both; and node rewiring score                                                                                                                                                                                                                                   | Should                                          | Partly (`comparison-view` highlights only-one-view items)                                                                        |
| T14 | Community evolution: match communities across windows with a threshold, label births, deaths, merges, splits; alluvial view                                                                                                                                                                                        | Should                                          | Partly (W19 lists the goal; no matching method or view)                                                                          |
| T15 | Periodicity views: hour of day, day of week (scale wrapping)                                                                                                                                                                                                                                                       | Should for investigators                        | **No**                                                                                                                           |
| T16 | Burst detection on node or edge activity                                                                                                                                                                                                                                                                           | Could (bibliometrics)                           | **No**                                                                                                                           |
| T17 | Video or image-sequence export of playback with the window dates burned in, and a saved record of window parameters                                                                                                                                                                                                | Should                                          | **No** (export-image is static)                                                                                                  |
| T18 | Uncertain, partial and relative dates (year only, ranges, "between X and Y"), with nodegoat's Chronology Statements as the reference model: each date is a range with a computed best value, and filters say whether they match on overlap or containment                                                          | Should for digital humanities (Could elsewhere) | **No**                                                                                                                           |
| T19 | Validity checks: edges outside node lifetimes, overlapping spells, transmission or flow links that violate order                                                                                                                                                                                                   | Should                                          | **No**                                                                                                                           |
| T20 | Growing history: append and delete events in a defined order without a reload; a window that follows the latest time; incremental layout that leaves settled nodes in place. Matches the social media document's live-ingestion requirement (2.2)                                                                  | Should                                          | **No**                                                                                                                           |
| T21 | Scale targets: window filtering and playback interactive at 10^6 events (TGB "medium" starts at 5 x 10^6), with a documented path above that: load a time range, keep top-N by activity, or aggregate before drawing (section 6)                                                                                   | Must                                            | **No**                                                                                                                           |
| T22 | Stacked-layer (space-time) view of a snapshot series in 3D, time on the third axis, as an alternative to animation and small multiples (T12); best for small or dense networks                                                                                                                                     | Could                                           | **No**                                                                                                                           |
| T23 | Map view honors the time window: positions and events outside the window are hidden or faded, and time-varying positions move as the window plays                                                                                                                                                                  | Should for investigators and animal ecologists  | **No**                                                                                                                           |
| T24 | Signal-derived networks: import a precomputed matrix stack (nodes x nodes x windows) as a snapshot series with per-window weights and a threshold or target density; building the stack from a node x time matrix stays in users' toolboxes for now                                                                | Must (import), Could (build)                    | **No**                                                                                                                           |
| T25 | Chronological export: write a window or a chronological train/validation/test split (for example TGB's 70/15/15) as edge lists, so a temporal ML user can hand off a view                                                                                                                                          | Could                                           | **No**                                                                                                                           |

W19 corrections: its phases assume snapshots from timestamped data; it should name the time model choice (T1, T4)
as its first decision, add time-respecting analysis as a phase or a sibling workflow, and add playback and storage
(T2, T5, T17) to its data flow. Its personas should include the four new personas in section 3 (3.1, 3.2, 3.3, 3.5).

---

## 12. Sources

Every claim links its source inline (about 70 distinct sources); there is no separate list.
