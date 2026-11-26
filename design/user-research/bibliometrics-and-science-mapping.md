# Bibliometrics and Science Mapping

Bibliometric and science-mapping users turn exports from citation, patent and grant databases (Web of Science,
Scopus, Dimensions, Lens, PubMed, OpenAlex, Derwent, PatSnap, PATSTAT, NIH RePORTER) into networks of authors,
institutions, countries, journals, cited references, keywords, patent classes and assignees, and publish maps of
those networks in review papers, evaluation reports, patent landscapes and research-office briefings. The largest
group is domain researchers writing "bibliometric analysis of X" reviews; others are librarians, patent analysts,
funder analysts and a small core of scientometricians; graduate students and systematic reviewers use seed-based
citation graphs to find what to read. Almost every
network is derived, not given: the raw data is a set of records (papers, patent families, grants), each with many
authors, references, classes or keywords, and the user chooses the projection (co-authorship, co-citation,
bibliographic coupling, co-occurrence, direct citation), the counting method and the thresholds. The slow parts are
export limits, merging databases, cleaning name variants and choosing parameters, and the deliverable is usually a
static figure plus a methods paragraph that lists those parameters.

---

## 2. Population

**Job titles and settings.**

- Domain researchers writing bibliometric reviews: clinicians, business and management faculty, education
  researchers, engineers and their PhD students. A review of 1,873 bibliometric reviews in education found 87% were
  published 2020-2024 and 69% were by scholars in emerging nations [TAMING-WILD-WEST]. A STAR Protocols protocol
  (2024) walks biomedical researchers through Web of Science, CiteSpace and VOSviewer step by step, which shows the
  audience is not trained in information science [PROTOCOL-STAR].
- Research-impact librarians and research-intelligence analysts: "Bibliometrics and Research Impact Librarian"
  (Waterloo), "Research Impact Informationist" (MUSC), "Health Research Intelligence Librarian" (UNC-Chapel Hill)
  [WATERLOO-JOB] [UNC-JOB] [JOBS-SEARCH]. Waterloo's posting centers on "strategic requests from leadership" using
  InCites and SciVal; UNC's asks for "network analysis, collaboration mapping, or graph analytics (e.g., VOSviewer,
  Gephi, NetworkX)" [UNC-JOB]. The NIH Library teaches "Creating Network Visualizations with VOSviewer" and gives
  NIH offices up to 20 staff hours per report [NIH-LIB].
- Patent and technology-intelligence analysts: IP analysts in corporate patent departments, R&D competitive
  intelligence, technology-transfer offices, and patent offices. Landscape reports feed portfolio management, R&D
  investment and technology transfer, and in industry are usually confidential [PATENT-ANALYSIS-WIKI]. WIPO
  publishes landscape-report guidelines and an open-source patent analytics manual [WIPO-PLR] [WIPO-MANUAL-GEPHI].
- Funders, program officers and evaluation analysts, who analyze what a portfolio supports and who receives it
  [OPENALEX-FUNDER] [NIHMAPS].
- Professional scientometricians: CWTS at Leiden, Drexel (CiteSpace), ministry teams such as France's scanR
  [LEIDEN-FIELDS] [OPENALEX-TOPICS] [SCANR-ARXIV].
- Graduate students and systematic reviewers who use citation graphs to find papers, not to publish a map
  [HKUST-COMPARE] [TAY-CHASING].

**Size and growth (OpenAlex public API, queried 2026-11-25).**

- Works with "bibliometric" in the title per year: 826 (2015), 2,631 (2020), 8,809 (2023), 12,638 (2024), 16,959
  (2025), roughly a 20-fold rise in ten years [OPENALEX-QUERY].
- Works whose abstract names each tool (an undercount): VOSviewer 49 (2015) to 11,729 (2025); CiteSpace 64 to 3,705;
  bibliometrix 14 (2018) to 3,210; Gephi 84 to 387; CitNetExplorer never above 23 a year. "Software survey:
  VOSviewer" has 28,646 citations [OPENALEX-QUERY].
- No source counts people; tens of thousands a year making a map is an inference from paper counts.

**Frequency.** Review authors: one to three intensive weeks per review [PROTOCOL-STAR]; librarians and patent
analysts weekly; students weekly during a literature review; scientometricians continuously, in code.

**Skill profile.** Review authors know tool vocabulary but rarely graph theory; CiteSpace's "numerous buttons, menus
and options" overwhelm "all but expert users" [SMU-CITESPACE]. Librarians increasingly need "Python or R"
[UNC-JOB]. Teams: two researchers search and screen independently, a senior third settles ambiguity
[PROTOCOL-STAR]; librarians are often a team of one.

---

## 3. Personas

### 3.1 Bibliometric review author (id: bibliometric-review-author)

**Dr. Lina Haddad, assistant professor of nursing, writing her second "bibliometric analysis" for a Q2 journal.**

- Background: clinical researcher, no information-science training; learned VOSviewer from a library guide. Uses
  SPSS, Excel and EndNote. Does not code.
- Tools: Web of Science, Scopus, VOSviewer for maps, CiteSpace for the burst table reviewers asked for, Excel for
  "top 10" tables, PowerPoint to crop figures.
- Data: 2,000-12,000 records exported in 500-record batches from Web of Science ("Full Record and Cited References")
  [ND-GUIDE] [ISTL-CITESPACE]; sometimes Scopus CSV as a second source.
- Goals: defensible figures (annual output, country and institution collaboration, co-cited references, keyword
  clusters, keyword overlay by year, burst table) and a methods section reviewers accept.
- Frustrations: the "tedious" export loop [ISTL-CITESPACE]; merged files VOSviewer will not read [GROUP-MERGE];
  noisy keyword maps until she builds a thesaurus [CASRAI-VOS]; results that "can sometimes be inconsistent"
  between runs [PROTOCOL-STAR]; reviewers asking for parameters she did not record.

### 3.2 Research-impact librarian (id: research-impact-librarian)

**Marcus Oyelaran, Health Research Intelligence Librarian at a research university library.**

- Background: MLIS, three years in a bibliometrics unit. Writes Python and R for cleaning; uses OpenRefine.
- Tools: InCites and SciVal for indicators and their built-in collaboration maps; Web of Science, Scopus, Dimensions
  and OpenAlex for data; VOSviewer and Gephi for network maps; Tableau or Shiny for dashboards [UNC-JOB]
  [WATERLOO-JOB] [SCIVAL-COLLAB].
- Data: a department's publications for 5-10 years (hundreds to a few thousand records), matched to a roster with
  ORCID and Scopus Author IDs; external collaborator institutions; funding acknowledgments.
- Goals: answer a dean's question ("who do we collaborate with?") with visualizations "for non-technical
  audiences" and documented methods [UNC-JOB].
- Frustrations: name homonyms create false bridges, worst for common Chinese and Korean surnames
  [VELDEN-HOMONYMY]; each report rebuilt by hand; a 20-hour budget per report cuts cleaning short [NIH-LIB].

### 3.3 Scientometrics analyst (id: scientometrics-analyst)

**Dr. Ana Ribeiro, research analyst in a national research ministry's data team (modeled on the scanR team).**

- Background: PhD in information science; Python, Elasticsearch, OpenAlex snapshots, igraph or graphology.
- Tools: her own pipelines; Louvain or Leiden; ForceAtlas2; VOSviewer Online embedded by iframe for display
  [SCANR-ARXIV] [VOS-ONLINE-EMBED].
- Data: millions of publications with disambiguated author, affiliation and topic identifiers; displayed networks
  capped at a few hundred nodes [SCANR-ARXIV]; for field classification, the full direct-citation graph of tens of
  millions of papers [OPENALEX-TOPICS].
- Goals: interactive community maps any institution can embed, labeled automatically; a stable classification of
  publications into fields for normalized indicators.
- Frustrations: VOSviewer's layout "less intuitive" than ForceAtlas2; hyperauthored papers bloat co-authorship
  networks; no Leiden in Graphology [SCANR-ARXIV].
- Workflow: 5.9.

### 3.4 Literature-discovery researcher (id: literature-discovery-researcher)

**Tomas Lindqvist, second-year PhD student starting a thesis literature review.**

- Tools: Connected Papers (5 free graphs a month), Litmaps (2 free maps, 100 articles per map), ResearchRabbit,
  Inciteful, Zotero [HKUST-COMPARE].
- Data: one to ten seed papers; graphs of tens to a few hundred papers.
- Goals: not miss key papers; see clusters and prior and derivative works; export a reading list as BibTeX or RIS;
  get told when a new paper cites the seeds [LITMAPS-MONITOR].
- Variant: a systematic reviewer who must log an include or exclude decision for every candidate and report
  citation-search counts in a PRISMA flow diagram [WOHLIN-2014] [PRISMA-S-QA].
- Frustrations: graph quotas; static graphs rebuilt as the review grows; no control over how similarity is computed
  [HKUST-COMPARE] [TAY-CHASING]; a redesign that removed the network view he relied on [RR-2026].

### 3.5 Patent landscape analyst (id: patent-landscape-analyst)

**Priya Natarajan, senior patent information analyst in a medical-device company's IP department.**

- Background: engineering degree, patent-search certification; works with patent attorneys and R&D leads. Uses Excel,
  OpenRefine or VantagePoint for cleaning; no coding, or light R.
- Tools: a commercial platform (Derwent Innovation, PatSnap or Orbit Intelligence) for search, citation maps and
  landscapes; Lens.org for open data; Gephi or VOSviewer for networks; PATSTAT when a statistician helps
  [PATENT-ANALYSIS-WIKI] [WIPO-MANUAL-GEPHI] [PATSNAP-CITMAP].
- Data: a few thousand to tens of thousands of patent documents collapsed to families; the Lens "pizza" example
  returned 44,773 publications in 19,856 simple families [WIPO-MANUAL-LENS]. Each family carries CPC and IPC codes,
  applicants and assignees, inventors, priority dates, jurisdictions, legal status, and backward and forward
  citations split into examiner and applicant citations.
- Goals: a landscape report (who files, in which classes, where, how fast; most-cited patents; white space) and
  inputs for freedom-to-operate and licensing.
- Frustrations: assignees "as written on the patent" [VDP-PATENTS]; applicant rankings "raw" [WIPO-MANUAL-LENS];
  families differ by database [EPO-FAMILIES]; examiner and applicant citations mixed [HEGDE-SAMPAT].

### 3.6 Research-portfolio analyst at a funder (id: research-portfolio-analyst)

**Daniel Osei, evaluation analyst in a national health research funder's strategy office.**

- Tools: Dimensions (grants linked to publications, patents and trials), NIH RePORTER, OpenAlex funder filters,
  Python, Tableau [OPENALEX-FUNDER] [DIMENSIONS-FUNDING].
- Data: grant records (funder, award ID, investigator, institution, amount, start and end dates, abstract) and the
  papers that acknowledge them.
- Goals: show the board what the portfolio covers, how its fields shift between periods, which institutions receive
  funding, and where the funder overlaps other funders.
- Frustrations: grant-to-paper links are inferred and differ by source [FUNDING-PUBLIC-GOOD]; award amounts are not
  available when grouping in OpenAlex [OPENALEX-FUNDER].

---

## 4. Use cases (ranked)

| Rank | Question answered with a graph                                                                                              | Who                                                  | Frequency                                | Stakes                                               |
| ---- | --------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- | ---------------------------------------- | ---------------------------------------------------- |
| 1    | What are the topical themes of field X? (keyword or term co-occurrence with clusters)                                       | review authors, librarians                           | nearly every review                      | publication; misread themes become "hotspots" claims |
| 2    | What are the intellectual foundations of X? (co-citation of references, sources or authors)                                 | review authors, scientometricians                    | most reviews                             | publication                                          |
| 3    | Which countries, institutions and authors collaborate? (co-authorship at three levels)                                      | all                                                  | most reviews; every institutional report | partnerships, funding                                |
| 4    | Which topics are emerging or declining? (overlay by year, bursts, timeline)                                                 | review authors                                       | most reviews                             | research agenda                                      |
| 5    | Who patents what, in which classes? (CPC co-occurrence, assignee network, landscape map)                                    | patent analysts                                      | every landscape report                   | R&D investment, licensing, freedom to operate        |
| 6    | Which documents are central or seminal? (direct citation, betweenness, forward-citation counts)                             | review authors, patent analysts                      | often                                    | completeness; patent value                           |
| 7    | What is the backbone of knowledge flow in X? (main path analysis, historiograph, RPYS)                                      | scientometricians, advanced authors, patent analysts | occasional                               | interpretation of field history                      |
| 8    | Where does our institution's or funder's work sit in science, compared with peers? (overlay on a fixed base map; diversity) | librarians, research offices, funders                | per request; annual                      | benchmarking, strategy                               |
| 9    | What does our funding portfolio support and who receives it? (portfolio maps, funder-recipient networks)                    | funder analysts                                      | annual reviews                           | budget allocation                                    |
| 10   | Which recent papers share a knowledge base? (bibliographic coupling)                                                        | review authors                                       | sometimes                                | research-front detection                             |
| 11   | Which papers should I read next, and have I found them all? (seed graphs, snowballing to saturation)                        | PhD students, systematic reviewers                   | weekly during a review                   | missing literature; review validity                  |
| 12   | How did the cluster structure evolve? (time slices, thematic evolution)                                                     | scientometricians                                    | occasional                               | field dynamics                                       |
| 13   | How is all of science organized? (classification of tens of millions of papers)                                             | CWTS, OpenAlex, ministries                           | ongoing                                  | field-normalized indicators, rankings                |

---

## 5. Step-by-step workflows

### 5.1 VOSviewer bibliometric review from Web of Science (the dominant workflow)

Sources: Notre Dame guide [ND-GUIDE], UIC guide [UIC-GUIDE], Leiden Gorlaeus library tutorial [GORLAEUS-TOPICS],
VOSviewer manual 1.6.20 [VOS-MANUAL], STAR protocol [PROTOCOL-STAR].

1. **Define the search (days to 2 weeks).** Topic query, document type and language filters. In the STAR example a
   keyword query returned 47,458 records, 11,721 after type, English and 2020-2024 filters, and 11,547 after two
   researchers screened titles and abstracts [PROTOCOL-STAR]. Record the query and retrieval date.
2. **Export.** Web of Science: Export > Plain Text File or Tab-delimited, records "1 to 500", Record Content "Full
   Record and Cited References" [ND-GUIDE]. Cited references are "necessary for identifying citation, bibliographic
   coupling, and co-citation links" [VOS-MANUAL]. 3,635 records needed 8 files [GORLAEUS-TOPICS].
3. **Load.** File > Create > "Create a map based on bibliographic data" > "Read data from bibliographic database
   files" > Web of Science tab > all batch files. VOSviewer deduplicates across files, but "Combining data from
   different data sources is not possible" [VOS-MANUAL].
4. **Choose map type, unit and counting (repeated for 4-6 maps)** [VOS-MANUAL]:
    - Co-authorship (authors, organizations, countries); co-occurrence (all keywords, author keywords, Keywords Plus);
      citation, bibliographic coupling (documents, sources, authors, organizations, countries); co-citation (cited
      references, sources, authors).
    - Counting: full (default) or fractional (each paper totals 1), with at most 25 authors per document at Notre
      Dame [ND-GUIDE]; CWTS prefers fractional "for many purposes" [PERIANES-2016].
5. **Set thresholds (iterated).** The wizard shows how many items meet each minimum. Guide values: minimum citations
   per cited reference 3 [ND-GUIDE]; keyword occurrences 3-10 for small and medium sets [ALBRECHT-BLOG]. Users start
   with strict thresholds and loosen them [CASRAI-VOS], untick irrelevant items, and export selected items as a
   starting thesaurus [UIC-GUIDE].
6. **Generate and tune.** Association strength; VOS layout (attraction 2, repulsion 1); clustering resolution,
   minimum cluster size, "merge small clusters", random seed [VOS-MANUAL]. Resolution 1 to 1.20 turned three clusters into four in the Gorlaeus example [GORLAEUS-TOPICS].
7. **Read the views.** Network (at most 1,000 strongest lines by default), overlay (Viridis; average year,
   normalized citations) and density views [VOS-MANUAL]. "Large, blue terms are well-researched older topics. Small,
   yellow terms may be emerging"; clusters are named from their largest terms and checked with an expert
   [GORLAEUS-TOPICS].
8. **Export.** Screenshot (200% scaling, transparent background); map and network files, JSON, GML or Pajek; Share
   for an interactive link with embed code [VOS-MANUAL] [ND-GUIDE].
9. **Write up.** The STAR figure set: annual counts; maps of productive countries, institutions and journals;
   collaboration networks of countries, keywords and authors; CiteSpace co-occurrence [PROTOCOL-STAR]. Methods list
   the parameters of section 8.

Time: 2-3 days each for query design, cleaning, tuning, interpretation and reporting [PROTOCOL-STAR].

### 5.2 Term and keyword co-occurrence with thesaurus cleaning

Sources: [VOS-MANUAL], [GORLAEUS-TOPICS], [UIC-GUIDE], [GARDENING-CLEANING].

1. **Text or keywords.** "Create a map based on text data" extracts English noun phrases from titles and abstracts,
   optionally ignores copyright statements and structured-abstract labels, and unifies plurals [VOS-MANUAL];
   abbreviations are not linked to written-out terms [GORLAEUS-TOPICS].
2. **Counting.** Binary (once per document) is "usually the preferred setting" [GORLAEUS-TOPICS].
3. **Threshold and relevance.** Default minimum 10 occurrences; VOSviewer by default drops the 40% of terms with the
   lowest relevance [VOS-MANUAL]. The Gorlaeus librarian lowers the threshold until 1,000-2,000 terms remain
   [GORLAEUS-TOPICS]. Excluding a long term can re-count it as an embedded shorter term [VOS-MANUAL].
4. **First map, then thesaurus (2-5 rounds; hours to days).** Find synonyms ("h-index", "Hirsch index"), spelling
   variants, abbreviations and noise terms; write a tab-separated file with columns "label" and "replace by" (empty
   removes the term). The same format merges authors, organizations, sources, countries and references. The map is
   rebuilt from scratch with the thesaurus [VOS-MANUAL] [UIC-GUIDE]. OpenRefine is the documented alternative.
5. **Clean upstream when needed** in Excel: "I could mark 100 records in 5 minutes. 10,000 in 8 hours"
   [GARDENING-CLEANING]; STAR allots 2-3 days to cleaning [PROTOCOL-STAR].
6. **Report.** Clusters become "themes"; the overlay by average year becomes "emerging topics" [GORLAEUS-TOPICS].

### 5.3 CiteSpace co-citation with time slicing, bursts and timeline

Sources: [ISTL-CITESPACE], CiteSpace 101 [CS101-NODES] [CS101-CLUSTER] [CS101-INTERPRET], [CS-SCOPUS], [CS-BURST],
[SMU-CITESPACE], [CHEN-PNAS-2004].

1. **Setup.** Files named "download_*.txt" [CS-APPENDIX]; other databases converted to Web of Science format,
   "quite tricky" [SMU-CITESPACE]; 97.0% of Scopus references converted in one example [CS-SCOPUS].
2. **Deduplicate.** Web of Science records win [CS-DEDUP]; matching fails when author forms differ [CS-TICKET].
3. **Configure.** 1-year slices; node type; selection by g-index (k=25 common), Top N or Top N% per slice
   [CS101-NODES]; a reported string: "g-index k=25, LRF=2.5, L/N=10, LBY=5" [ARXIV-LING-AI]; optional Pathfinder or
   minimum-spanning-tree pruning.
4. **Run.** One network per slice, merged into a synthesized network [CHEN-PNAS-2004].
5. **Cluster and label.** Aim for "about 7~10 major clusters", silhouette above 0.70, "~100 nodes per slice";
   labels by LLR, LSI or MI from citing articles, "LLR usually gives the best result" [CS101-CLUSTER]
   [CS101-NODES].
6. **Bursts.** Kleinberg's algorithm (gamma, minimum duration); 5 years gave 31 bursts [ISTL-CITESPACE]; published
   as the "Top N References with the Strongest Citation Bursts" table [CS-BURST].
7. **Timeline view.** One row per cluster, nodes at publication year, red rings for bursts, purple trims for high
   betweenness, "tree rings" for yearly citations [CS101-INTERPRET] [SMU-CITESPACE].
8. **Validate** pivotal papers with experts; citation variants stay unmerged [ISTL-CITESPACE].

### 5.4 Merging Web of Science and Scopus with bibliometrix

Sources: [BIBLIOMETRIX-CONVERT] [BIBLIOMETRIX-MERGE] [BIBLIOMETRIX-NETWORK] [BIBLIOMETRIX-NETPLOT]
[BIBLIOMETRIX-THEMATIC] [GROUP-MERGE].

1. Export Web of Science and Scopus (Dimensions, Lens, OpenAlex, PubMed also work); `convert2df(file, dbsource,
format)` maps each to Web of Science tags [BIBLIOMETRIX-CONVERT].
2. `mergeDbSources(..., remove.duplicated = TRUE)` [BIBLIOMETRIX-MERGE]; VOSviewer cannot read the merged
   "KW_Merged" field, so one practitioner wrote a Python fix [GROUP-MERGE].
3. `biblioNetwork(M, analysis, network)` builds collaboration, co-citation, coupling and co-occurrence matrices
   [BIBLIOMETRIX-NETWORK].
4. `networkPlot(...)`: normalization (association, Jaccard, inclusion, Salton, equivalence), `n` vertices, clustering
   (louvain, leiden, infomap, walktrap and others), layouts (Fruchterman-Reingold, Kamada-Kawai, MDS), clustering
   `seed` default 123 [BIBLIOMETRIX-NETPLOT].
5. `thematicMap(...)`: clusters keyword co-occurrence and plots Callon centrality against density into motor, niche,
   basic and emerging/declining quadrants [BIBLIOMETRIX-THEMATIC] [RBLOGGERS-BIBLIO].

### 5.5 Institutional collaboration report (librarian service)

Sources: [NIH-LIB], [UNC-JOB], [WATERLOO-JOB], [UCL-DOWNLOAD], [SCIVAL-COLLAB], [DIMENSIONS-HELP], [VOS-MANUAL].

1. **Intake and scoping.** A dean, center director or agency office asks a question; the NIH Library caps basic
   service at 20 staff hours per report with an 8-week turnaround [NIH-LIB].
2. **Decide whether a network is needed.** SciVal's Collaboration module answers many questions with a world map
   and a collaborator table filtered by years and subject, with no network graph [SCIVAL-COLLAB]. A network adds
   value for structure: which internal groups bridge to which partners, co-author clusters, topic structure.
3. **Export data** within the limits in section 6 [UCL-DOWNLOAD] [DIMENSIONS-HELP], or pull from APIs (OpenAlex,
   Crossref, Europe PMC, Semantic Scholar, OpenCitations) inside VOSviewer [VOS-MANUAL].
4. **Clean:** match authors to a roster by ORCID or Scopus ID, build thesauri, cap authors per document (implied by
   "quality assurance practices" [UNC-JOB]; a published procedure: no source found).
5. **Map.** Organization and country co-authorship (fractional) and keyword co-occurrence, as in 5.1 and 5.2.
6. **Deliver.** Summaries "for non-technical audiences" plus documented methods [UNC-JOB].

### 5.6 Seed-based literature discovery, snowballing and citation drill-down

Sources: [CP-LAUNCH], [CP-HKUST], [CP-PREMIUM], [LITMAPS-VIS], [LITMAPS-HKU], [LITMAPS-MONITOR], [RR-TRINITY],
[RR-2026], [INCITEFUL-HELP], [HKUST-COMPARE], [WOHLIN-2014], [PRISMA-S-QA], [TAY-CHASING], [CITATIONCHASER],
[CITNET-ARXIV].

The four common tools differ in what an edge means and what position means, which is the product-relevant part.

**Connected Papers (similarity graph, force layout).**

1. Enter one seed by DOI, title or URL; multi-origin graphs came with premium accounts in 2022 [CP-HKUST]
   [CP-PREMIUM].
2. The tool analyzes on the order of 50,000 papers and keeps a few dozen most similar to the seed; similarity
   comes from co-citation and bibliographic coupling over Semantic Scholar, so papers that never cite each other can
   sit side by side [CP-LAUNCH]. The exact formula is unpublished [TAY-CHASING].
3. Read the force-directed graph: node size is citation count, color is year (darker is newer), distance is
   similarity [CP-HKUST].
4. Open "Prior works" (older papers most cited by the graph's papers, often the seminal ones) and "Derivative works"
   (newer papers citing many graph papers, often surveys); in the HKUST example each list held 10 papers [CP-HKUST].
5. Click any node to make it the next seed; each new seed is a new graph and counts against the free quota of 5
   graphs a month [CP-PREMIUM].
6. "Expand" to a list and download BibTeX into Zotero or another manager [CP-HKUST].

**Litmaps (attribute-axis map, not a force layout).**

1. Search or import seeds (DOI, title, BibTeX, RIS, PubMed, Zotero); "Explore Related Articles" adds recommended
   papers (white) around seeds (black); lines are citations [LITMAPS-HKU].
2. Position is data: by default x is publication date and y is citation count, so older references fall left of a
   seed and newer citing papers right (this follows from the date axis) [LITMAPS-HKU]. Clicking an axis switches it to Cite Count, Ref Count,
   Publication Date, Momentum, Map Connectivity (citations inside the map), Content Similarity, Co-citation Network
   or Co-author Network [LITMAPS-VIS].
3. Axes are switched for a purpose (vendor's table): date by reference count finds reviews, momentum by map
   connectivity "cutting-edge" papers, similarity or co-citation on both axes subtopics; dragged papers keep custom
   positions [LITMAPS-VIS].
4. "Monitor" reruns the map's search on a schedule and emails new papers, replacing database alerts; free users get
   the default algorithm, Pro users can tune it [LITMAPS-MONITOR].
5. Free accounts: 2 maps, 100 articles per map; export BibTeX, RIS or CSV [LITMAPS-HKU] [HKUST-COMPARE].

**ResearchRabbit (collection-driven loop).**

1. Add papers to a Collection; tick some; choose Similar Work (topic modeling ranked by citations), Earlier Work
   (their references) or Later Work (papers citing them) [RR-TRINITY].
2. Inspect the result, add useful papers to the Collection, repeat; the graph updates as the Collection grows
   [RR-TRINITY].
3. After Litmaps acquired it and redesigned it (from about October 2025), the network view was removed; results are
   plotted citation count (y) by date (x) with switchable axes, free searches take up to 50 input papers, and
   commenting and collaborators are gone [RR-2026]. Zotero sync and BibTeX or RIS export remain [RR-2026]
   [HKUST-COMPARE].

**Inciteful (ranked tables over a two-hop citation graph).**

1. Enter a seed or import a BibTeX library; several seeds hang off a placeholder node [INCITEFUL-HELP].
2. It collects references and citations two hops out (typically 10,000-20,000 papers) and stops at one hop above
   150,000 papers, suggesting a keyword filter [INCITEFUL-HELP].
3. Read the "Important Papers" table (PageRank) and the "Similarity" table (Adamic/Adar coupling, Salton
   co-citation); each table shows its SQL, which users may edit [INCITEFUL-HELP] [TAY-CHASING].
4. Add papers from the tables as seeds; export DOI tables as BibTeX or RIS. No alerts [INCITEFUL-HELP]
   [HKUST-COMPARE]. A separate "Literature Connector" shows paths between two papers.

**Snowballing in a systematic review (a decision process, not a picture)** [WOHLIN-2014].

1. Build a tentative start set (often from Google Scholar) that is diverse in "publishers, years and authors" and
   covers every community; only papers finally included form the actual start set.
2. Backward: for each included paper, exclude references on basic criteria (language, year, type), drop ones
   already examined, then judge by title, by "the place and context of the reference" in the citing paper, then
   abstract, then full text. Final inclusion needs the full text.
3. Forward: examine every citing paper in Google Scholar, first on the information Scholar shows, then abstract and
   full text.
4. Put newly included papers in a pile for the next iteration; do "one iteration at the time to get traceability".
   Stop when an iteration finds no new papers; then contact authors and restart if they add papers.
5. The replication logs counts per paper and screening stage (126 citations examined in one iteration, mostly
   excluded on Scholar data); the paper names no logging tool, so the log lives outside graph tools. PRISMA 2020
   reports "Citation searching (n = )" under other methods, per-search counts in supplements [PRISMA-S-QA].
6. Tools: citationchaser (R, Lens API, deduplicated RIS) is built for evidence synthesis; PROSPERO protocols name it
   72 times (2021-2024), Connected Papers 24, Litmaps 6, Google Scholar over 8,000 in 2023 alone [TAY-CHASING]
   [CITATIONCHASER].

**Expert variant.** CitNetExplorer clusters a direct citation network of up to "several million publications",
drills down to about 100, expands by predecessors and successors, draws a transitive reduction [CITNET-ARXIV].

**Population and complaints.** User counts: no source found; the PROSPERO counts are a lower bound. Complaints:
opaque similarity ("you don't get the exact formula"), coverage gaps, OpenAlex under-reporting references
[TAY-CHASING]; quotas [CP-PREMIUM] [LITMAPS-HKU]; point-in-time graphs with no update [INCITEFUL-HELP].

### 5.7 Main path analysis and algorithmic historiography

Sources: [MAINPATH-WIKI], [BATAGELJ-SPC], [MPAR], [LUCIO-ARIAS-HISTCITE], [RPYS-SCHUBERT], [BIBLIOMETRIX-HIST].

1. **Build the direct citation network** from records with cited references (Web of Science or OpenAlex); keep only
   citations inside the corpus.
2. **Make it acyclic:** remove or shrink cycles from mutual or same-year citations [BATAGELJ-SPC].
3. **Compute traversal weights** SPC (source-to-sink paths through a link), SPLC, SPNP: in Pajek via Network >
   Acyclic Network > Create Weighted Network + Vector > Traversal Weights [MAINPATH-WIKI]; in R with mpaR [MPAR].
4. **Search.** Local ("priority first") follows the heaviest outgoing link; global finds the chain with the largest
   total weight; key-route (Liu and Lu 2012) forces chosen key links into the path and shows more detail as their
   number grows [MAINPATH-WIKI].
5. **Draw** the path as a year-layered DAG (time on one axis), as in HistCite historiographs, which show "scientific
   developments as chronological citation networks" [LUCIO-ARIAS-HISTCITE]. bibliometrix `histNetwork(M, sep = ";")`
   returns the direct citation matrix for a historiograph [BIBLIOMETRIX-HIST].
6. **Complement with RPYS**, the distribution of cited references' publication years, to find historical roots;
   static and over-time analyses of one corpus can disagree [RPYS-SCHUBERT].

### 5.8 Science overlay map for benchmarking

Sources: [RAFOLS-OVERLAY], [CARLEY-OVERLAY], [LEYDESDORFF-PATENT-OVERLAY], [RAFOLS-MEYER].

1. **Get a base map** of categories or journals: Carley et al. built a 227-category map from 11,365 journals,
   laid out in VOSviewer, shipped as a routine [CARLEY-OVERLAY]. Patent analysts have equivalent base maps
   of IPC classes built from USPTO citations, visualized in VOSviewer or Pajek [LEYDESDORFF-PATENT-OVERLAY].
2. **Map the unit's records** (an institution, funder, researcher or topic) to categories or journals and count them.
3. **Overlay:** keep base-map node positions fixed; size or color each node by the unit's count or share.
4. **Compare** units side by side or one unit across years; the positions never move, so maps are comparable. The
   authors demonstrate benchmarking, collaborations and temporal change for universities, corporations and funding
   agencies [RAFOLS-OVERLAY].
5. **Quantify** interdisciplinarity with the Rao-Stirling diversity index over the classification, optionally with
   network coherence [RAFOLS-MEYER].

Limitation: the category routine needs Web of Science access and must be updated when categories change
[CARLEY-OVERLAY].

### 5.9 Code-first classification and community maps at scale (scientometrician)

Sources: [WALTMAN-VANECK-2012], [TRAAG-LEIDEN], [LEIDEN-FIELDS], [OPENALEX-TOPICS], [SCANR-ARXIV].

National- or global-scale classification (CWTS method):

1. **Data:** an OpenAlex snapshot (87 million publications, 2000-2024, in the August 2025 CWTS set) or Web of
   Science [OPENALEX-TOPICS].
2. **Graph:** (extended) direct citation; the original method classified "almost ten million publications"
   [WALTMAN-VANECK-2012].
3. **Cluster** with the Leiden algorithm, which guarantees connected communities, at several resolutions to get a
   hierarchy [TRAAG-LEIDEN]. The Leiden Ranking Open Edition 2023 uses 4,521 micro-level fields; OpenAlex exposes 4
   domains, 26 fields, 252 subfields and 4,516 topics [LEIDEN-FIELDS] [OPENALEX-TOPICS].
4. **Label** clusters with an LLM from the 250 most cited titles in each [OPENALEX-TOPICS].
5. **Use** the fields for field-normalized indicators [LEIDEN-FIELDS].

Ministry portal (scanR) [SCANR-ARXIV]: about 4 million publications in Elasticsearch with precomputed entity pairs;
keep "the top 2000 links"; build in Graphology, cap at 300 nodes by betweenness; ForceAtlas2 (gravity 0.05, scaling 10) and Louvain; label communities with an LLM; output VOSviewer Online JSON embedded by iframe.

### 5.10 Patent landscape report

Sources: [WIPO-PLR], [WIPO-MANUAL-LENS], [WIPO-MANUAL-GEPHI], [VDP-PATENTS], [EPO-FAMILIES], [PATSNAP-CITMAP],
[HEGDE-SAMPAT], [RELIANCE-ON-SCIENCE].

1. **Plan:** topic, collaborators and scope, including country and time coverage [WIPO-PLR].
2. **Search** in Lens, Derwent, PatSnap or Orbit with Boolean queries over full text, claims and classification
   codes, restricted by jurisdiction and grant or application [WIPO-MANUAL-LENS].
3. **Collapse to families.** "it is good practice to collapse the results onto a single family record" (Lens "one doc
   per family") [WIPO-MANUAL-LENS]. A DOCDB simple family shares exactly the same priorities; an INPADOC extended family
   shares at least one priority directly or indirectly; definitions vary by database [EPO-FAMILIES].
4. **Export.** Lens: up to 50,000 records logged in as CSV, RIS or JSON [WIPO-MANUAL-LENS]; JSONL carries "all
   available information" [VDP-PATENTS].
5. **Normalize assignees.** Split multi-applicant fields, strip suffixes, expand abbreviations, fuzzy-match
   (VantagePoint or OpenRefine; 5,884 drone documents in the WIPO example) [WIPO-MANUAL-GEPHI] [VDP-PATENTS].
6. **Assignee network** in Gephi: co-occurrence importer on the applicant column, remove self-loops, modularity (246
   communities), filter by frequency (minimum 5), Fruchterman-Reingold then NoOverlap, about 20 minutes of label
   cleanup, PDF finished in Illustrator [WIPO-MANUAL-GEPHI].
7. **CPC co-occurrence or overlay map** on an IPC base map [LEYDESDORFF-PATENT-OVERLAY]; a step-by-step guide for
   CPC co-occurrence: no source found.
8. **Forward-citation network for key patents.** PatSnap's Citation Map centers a selected record, groups citing and
   cited records by assignee, and exports PNG or citation data [PATSNAP-CITMAP]. Analysts weigh examiner citations,
   which predict renewal better than applicant citations [HEGDE-SAMPAT].
9. **Link to science** with patent-to-paper citation data (Reliance on Science flags each citation as applicant or
   examiner, front page or body text) [RELIANCE-ON-SCIENCE].
10. **Deliver** a landscape report: filing trends, top assignees, technology maps, networks, white space; in industry
    usually confidential [PATENT-ANALYSIS-WIKI].

### 5.11 Funder portfolio map

Sources: [OPENALEX-FUNDER], [NIHMAPS], [FUNDING-PUBLIC-GOOD], [DIMENSIONS-FUNDING].

1. **Find the funder ID** (NSF is F4320306076 in OpenAlex) [OPENALEX-FUNDER].
2. **Portfolio by field:** works filtered `awards.funder_id:F4320306076`, grouped by `primary_topic.field.id`
   [OPENALEX-FUNDER].
3. **Shifts:** compare field shares for 2015-2017 and 2023-2025 [OPENALEX-FUNDER].
4. **Recipients:** group by `authorships.institutions.id`; the graph form, a funder-institution-field network, is
   not in the tutorial [OPENALEX-FUNDER].
5. **Grant-text topic map:** topic-model grant abstracts and lay grants out by similarity, as NIHMaps did with a
   700-topic model of NIH awards [NIHMAPS].
6. **Check linkage:** grant-paper links vary by source; one study preferred Dimensions over RePORTER for linking
   [FUNDING-PUBLIC-GOOD].

---

## 6. Data

**Sources and formats.**

| Source                                                          | Export for mapping                                              | Per-export limit (dated)                                                                                                                                 | Notes                                                                                                                                                                                                                   |
| --------------------------------------------------------------- | --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Web of Science                                                  | Plain text or tab-delimited, "Full Record and Cited References" | 500 per export in library guides [ND-GUIDE] [VOS-MANUAL]; UCL (Nov 2026): 1,000 tab-delimited, Fast 5K with limited fields [UCL-DOWNLOAD]                | Excel export drops cited references [WOS-LIMITS]                                                                                                                                                                        |
| Scopus                                                          | CSV with all fields                                             | VOSviewer manual: 2,000; UCL (Nov 2026): CSV "up to 20,000 items" [UCL-DOWNLOAD]; whether 20,000 holds with references included: no current source found | References capped at 10 per document in 2025, cap lifted 15 November 2025, bulk limits lifted 10 March 2026, so 2025 corpora may be truncated [SCOPUS-RN-2025] [SCOPUS-RN-2026]; the help page is stale [SCOPUS-FIELDS] |
| Dimensions                                                      | "Export for bibliometric mapping" CSV                           | 2,500 free; 5,000 Plus; 50,000 Analytics [DIMENSIONS-HELP]                                                                                               | grants linked to papers in the paid product [DIMENSIONS-FUNDING]                                                                                                                                                        |
| Lens (scholarly)                                                | CSV                                                             | 50,000 [VOS-MANUAL]                                                                                                                                      |                                                                                                                                                                                                                         |
| Lens (patents)                                                  | CSV, RIS, JSON; JSONL for all fields                            | 50,000 logged in, 1,000 without account [WIPO-MANUAL-LENS] [VDP-PATENTS]                                                                                 | family collapsing at search time                                                                                                                                                                                        |
| Derwent, PatSnap, Orbit                                         | proprietary exports                                             | no source found                                                                                                                                          | normalized assignees and families are selling points [PATENT-ANALYSIS-WIKI]                                                                                                                                             |
| PATSTAT                                                         | database tables                                                 | n/a                                                                                                                                                      | harmonized applicant names, geography, sectors [PATENT-ANALYSIS-WIKI]                                                                                                                                                   |
| PubMed                                                          | PubMed format                                                   | 10,000 [VOS-MANUAL]                                                                                                                                      | no references, so no citation maps                                                                                                                                                                                      |
| RIS, EndNote                                                    | reference-manager files                                         | varies                                                                                                                                                   | co-authorship and keyword maps only [VOS-MANUAL]                                                                                                                                                                        |
| OpenAlex, Crossref, Europe PMC, Semantic Scholar, OpenCitations | APIs; snapshots                                                 | paging                                                                                                                                                   | OpenAlex `awards.funder_id` for funding [OPENALEX-FUNDER]                                                                                                                                                               |

**Record models.**

- Paper: ordered authors, affiliations, countries, source, year, type, title, abstract, author and indexed
  keywords, funding text, citation count, cited references; 500-12,000 per review [PROTOCOL-STAR]; millions in
  portals [SCANR-ARXIV]. Discovery tools add a screening decision per paper [WOHLIN-2014].
- Patent family: family ID (DOCDB simple or INPADOC extended), member publications by jurisdiction, priority dates,
  applicants and assignees (raw and normalized), inventors, CPC and IPC codes (many per family), legal status,
  backward and forward citations each marked examiner or applicant, and citations to scientific papers
  [EPO-FAMILIES] [VDP-PATENTS] [RELIANCE-ON-SCIENCE].
- Grant: funder, award ID, investigators, institution, amount, period, abstract, and linked outputs (papers, patents,
  trials) [OPENALEX-FUNDER] [DIMENSIONS-FUNDING].

**Graph properties.** Natively bipartite or hypergraph (paper-author, paper-reference, family-CPC, family-assignee,
grant-paper); every map is a projection, which loses which authors were on one paper [HYPERGRAPH-PERSIST]
[HYPERGRAPH-SCIREP] and can change node rankings [HYPERGRAPH-RW]; fractional counting is the practitioner's
correction [PERIANES-2016]. Weighted; directed and almost acyclic for direct citation, undirected otherwise; every
record has a year; geographic (countries, jurisdictions); multi-level (authors to organizations to countries, CPC
codes to sections, subsidiaries to parent assignees).

**Sizes.** 3,561 records gave 857 nodes and 6,182 links [ISTL-CITESPACE]; scanR caps maps at 300 nodes
[SCANR-ARXIV]; the WIPO assignee network had 5,265 nodes before filtering [WIPO-MANUAL-GEPHI]; classification
graphs span 87 million publications [OPENALEX-TOPICS]; discovery graphs hold a few dozen papers [CP-LAUNCH].
Published figures usually show 50-1,000 nodes.

**Identifier problems.** Author forms differ by database [CS-TICKET]; lumping by initials cut a co-author network's
clustering coefficient about fourfold [LUMPING-PMC]; reference variants split citations [VOS-MANUAL].

**Access.** Authors share figures, not subscription data; reports on named researchers are sensitive
[WATERLOO-JOB]; corporate landscapes are confidential.

---

## 7. Analysis methods

- **Performance analysis** (counts, citations, h-index) feeds tables; Donthu et al. split bibliometrics into
  performance analysis and science mapping [DONTHU-2021].
- **Counting:** full vs fractional [PERIANES-2016]; Leydesdorff and Park dispute a single right form
  [LEYDESDORFF-PARK].
- **Normalization, layout, clustering:** as in 5.1, 5.4 and 5.9; plus year-layered DAG layouts (5.7), fixed
  base-map coordinates (5.8), and Leiden at several resolutions [TRAAG-LEIDEN]. Walktrap tends to give trivial
  clusters [WALKTRAP-NOTE].
- **Embedding-based maps:** embed titles and abstracts (SPECTER, SciBERT, PubMedBERT), reduce (UMAP, t-SNE),
  cluster (HDBSCAN), label with an LLM; about 21 million PubMed abstracts with t-SNE [PUBMED-LANDSCAPE]
  [LLM-CLUSTER-LABELS]; over 33 million Web of Science documents [CITATION-AWARE-EMBED]. Output: a point map or kNN
  graph; UMAP needs a seed to repeat [UMAP-REPRO].
- **Cluster labeling:** LLR, LSI, MI; LLM labels, which cost money and hit rate limits [ISTL-CITESPACE].
- **Centrality:** betweenness, total link strength, PageRank, patent forward-citation counts [CS101-INTERPRET]
  [HKUST-COMPARE] [HEGDE-SAMPAT].
- **Validation:** re-runs at other resolutions, expert cluster naming, Q and silhouette [GORLAEUS-TOPICS]
  [ISTL-CITESPACE]; routine significance testing: no source found.

---

## 8. Outputs and collaboration

- **Review papers:** static figures plus top-10 tables [PROTOCOL-STAR]. Reporting guidelines (BIBLIO, GLOBAL and
  others) ask for
  database, query, dates, software version, map type, counting, thresholds, normalization, resolution and minimum
  cluster size [BIBLIO-2023] [GLOBAL-ARXIV] [MARZI-2025]; reviewers' comments show these are often missing
  [IMPLICIT-STANDARDS].
- **Interactive maps:** VOSviewer Online iframes over hosted JSON [VOS-ONLINE-EMBED], in Dimensions
  [VOS-ONLINE-SEARCH] and scanR [SCANR-ARXIV].
- **Reports:** institutional reports and dashboards [UNC-JOB]; confidential patent landscapes
  [PATENT-ANALYSIS-WIKI]; funder portfolio reviews [OPENALEX-FUNDER]; reading lists as BibTeX or RIS synced to
  Zotero, and for systematic reviews a screening log and PRISMA counts (5.6).
- **Reproducibility:** most reviews are GUI clicks. VOSviewer exposes random seeds and a command line [VOS-MANUAL];
  bibliometrix defaults to `seed = 123` [BIBLIOMETRIX-NETPLOT]; UNC asks for "reproducible workflows, including
  version control" [UNC-JOB].

---

## 9. Tools landscape and pain points

| Tool                                                 | Role                                   | Loved for                                                                           | Fails them                                                                                                                                                  |
| ---------------------------------------------------- | -------------------------------------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| VOSviewer (CWTS, free)                               | default map tool                       | five databases plus APIs; fractional counting; thesaurus; overlay and density views | no cross-database merge; English-only terms; rebuilt per thesaurus change [VOS-MANUAL]; layout "less intuitive" than ForceAtlas2 for one team [SCANR-ARXIV] |
| CiteSpace (Drexel)                                   | temporal co-citation                   | slices, bursts, timeline, automatic labels                                          | steep learning curve; only Web of Science format native [SMU-CITESPACE]; variants not merged [ISTL-CITESPACE]; key features paid [CS-TICKET]                |
| bibliometrix                                         | merging, thematic maps, historiograph  | merges databases; scripts                                                           | merged output unreadable by VOSviewer [GROUP-MERGE]                                                                                                         |
| Pajek, mpaR                                          | main path analysis                     | SPC weights, key-route search [MAINPATH-WIKI] [MPAR]                                | usability: no source found                                                                                                                                  |
| Gephi                                                | styling; patent assignee networks      | ForceAtlas2, co-occurrence importer [WIPO-MANUAL-GEPHI]                             | flat adoption [OPENALEX-QUERY]; no undo, labels finished in Illustrator [WIPO-MANUAL-GEPHI]                                                                 |
| Derwent, PatSnap, Orbit                              | patent search, families, citation maps | integrated families and normalization [PATENT-ANALYSIS-WIKI] [PATSNAP-CITMAP]       | subscription; proprietary exports                                                                                                                           |
| Lens                                                 | open scholarly and patent search       | free 50,000-record exports [WIPO-MANUAL-LENS]                                       | rankings "raw" [WIPO-MANUAL-LENS]                                                                                                                           |
| SciVal, InCites                                      | indicators, collaboration world maps   | many collaboration questions without a graph                                        | no network view [SCIVAL-COLLAB]                                                                                                                             |
| CitNetExplorer                                       | direct citation drill-down             | millions of papers [CITNET-ARXIV]                                                   | under 25 mentions a year [OPENALEX-QUERY]                                                                                                                   |
| Connected Papers, Litmaps, ResearchRabbit, Inciteful | discovery graphs (5.6)                 | instant seed graphs; prior and derivative lists; axis maps; monitoring              | quotas; opaque similarity; no decision log [HKUST-COMPARE] [TAY-CHASING]                                                                                    |

Cross-cutting pain points: export batching and changing limits [SCOPUS-RN-2025] [UCL-DOWNLOAD]; merges that break
downstream tools [GROUP-MERGE] [CS-TICKET]; name variants [ISTL-CITESPACE] [VDP-PATENTS]; unreported, sensitive
parameters [TAMING-WILD-WEST] [IMPLICIT-STANDARDS]; tool hopping with incompatible files, two mapping tools even in
the STAR protocol [PROTOCOL-STAR] [WIPO-MANUAL-GEPHI]; hyperauthorship [SCANR-ARXIV]; no one tool covers overlays,
main paths, patent families and the common map types.

---

## 10. Requirements implied

graph-io reads GML, Pajek, GEXF, GraphML, CSV and JSON, so Graphty opens what VOSviewer, Pajek and Gephi export, but
no bibliographic, patent or grant export. No designloom persona or workflow covers this topic.

| #   | Capability                                                                                                                                                                                     | Priority | Covered today? |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | -------------- |
| 1   | Import bibliographic exports (Web of Science, Scopus, Dimensions, Lens, PubMed, RIS, BibTeX, OpenAlex), many batch files as one corpus                                                         | must     | No             |
| 2   | Deduplicate and merge across sources (DOI, database ID, title plus author plus year)                                                                                                           | must     | No             |
| 3   | Keep the record-level bipartite or hypergraph model; derive projections (co-authorship at three levels, co-occurrence, citation, coupling, co-citation) as views                               | must     | No             |
| 4   | Counting: full, fractional, max authors per document, binary terms                                                                                                                             | must     | No             |
| 5   | Threshold step showing how many items meet each minimum; item table to untick                                                                                                                  | must     | Partly         |
| 6   | Thesaurus table for any entity, edited in place; VOSviewer thesaurus files                                                                                                                     | must     | No             |
| 7   | Link normalization: association strength, Jaccard, Salton, inclusion, equivalence, none                                                                                                        | must     | No             |
| 8   | Seedable similarity layout and ForceAtlas2; Leiden or Louvain with resolution, minimum cluster size, seed                                                                                      | must     | Partly         |
| 9   | Overlay coloring by a score with legend; density view                                                                                                                                          | must     | Partly         |
| 10  | Readable labels; draw only the N strongest links                                                                                                                                               | must     | Partly         |
| 11  | Figure export: high-resolution raster, transparent background, SVG or PDF                                                                                                                      | must     | Partly         |
| 12  | Every parameter (sources, query, counting, thresholds, normalization, layout, clustering, seeds, thesaurus) as structured data                                                                 | must     | No             |
| 13  | Load a layout from file and keep positions fixed (base maps); size and color by a unit's share; compare units or years on identical coordinates                                                | must     | No             |
| 14  | Directed citation analysis: make acyclic, SPC/SPLC/SPNP weights, local, global and key-route main paths                                                                                        | should   | No             |
| 15  | Year-layered DAG layout for historiographs and main paths                                                                                                                                      | should   | No             |
| 16  | Patent import (Lens CSV and JSONL, PATSTAT) with the family model: family ID, CPC/IPC, assignees raw and normalized, examiner vs applicant citations, forward citations, patent-to-paper links | should   | No             |
| 17  | Assignee normalization aids (suffixes, fuzzy grouping, subsidiary roll-up) via the thesaurus                                                                                                   | should   | No             |
| 18  | Grant records linked to papers; funder-institution-field bipartite views                                                                                                                       | should   | No             |
| 19  | Diversity metrics over a classification (Rao-Stirling)                                                                                                                                         | should   | No             |
| 20  | kNN or similarity graph from vectors attached to nodes; seeded reduction for point maps                                                                                                        | should   | No             |
| 21  | Time slicing and burst detection; burst table data                                                                                                                                             | should   | No             |
| 22  | Timeline layout (row per cluster, x by year)                                                                                                                                                   | should   | No             |
| 23  | Cluster labeling (LLR, tf-idf) and quality (modularity, silhouette)                                                                                                                            | should   | No             |
| 24  | VOSviewer map, network and JSON import and export                                                                                                                                              | should   | No             |
| 25  | Embeddable map matching VOSviewer Online's iframe and JSON use                                                                                                                                 | should   | Partly         |
| 26  | Country collaboration on a world map                                                                                                                                                           | should   | No             |
| 27  | Hyperauthorship handling: per-paper caps, hypergraph-aware centrality                                                                                                                          | should   | No             |
| 28  | Seed-based expansion from OpenAlex or Crossref: references, citations and similar papers of a selected set, added to a growing collection                                                      | should   | Partly         |
| 28a | Attribute-axis layout (x, y from year, citations, momentum), switchable, with pinned positions                                                                                                 | should   | No             |
| 28b | Seed-similarity graph (co-citation plus coupling) and ancestor and descendant lists of the shown set                                                                                           | should   | No             |
| 28c | Per-candidate include or exclude decision, stage and iteration; PRISMA counts                                                                                                                  | should   | No             |
| 28d | Rerun a saved expansion and flag new papers                                                                                                                                                    | could    | No             |
| 29  | Scripted, repeatable runs (same inputs and seed, same map)                                                                                                                                     | should   | Partly         |
| 30  | Name disambiguation aids: prefer ORCID or author IDs; homonym warnings                                                                                                                         | should   | No             |
| 31  | Leiden at several resolutions on tens of millions of edges, headless                                                                                                                           | could    | Partly         |

---

## 11. Sources

- [OPENALEX-QUERY] OpenAlex API, queried 2026-11-25: https://api.openalex.org/works?filter=title.search:bibliometric&group_by=publication_year ; same with abstract.search:<tool>; https://api.openalex.org/works/doi:10.1007/s11192-009-0146-3
- [VOS-MANUAL] VOSviewer Manual 1.6.20: https://www.vosviewer.com/documentation/Manual_VOSviewer_1.6.20.pdf
- [ND-GUIDE] Notre Dame library, VOSviewer demo: https://libguides.library.nd.edu/vos-viewer/demo
- [UIC-GUIDE] UIC library, VOSviewer guide: https://researchguides.uic.edu/bibliometrics/vosviewer
- [GORLAEUS-TOPICS] Leiden Gorlaeus library, "Creating an overview of topics": https://gorlaeus-library.github.io/VOSviewer/howto-topics.html
- [PROTOCOL-STAR] Protocol for bibliometric analysis in biomedicine with CiteSpace and VOSviewer, STAR Protocols 5(3):103269, 2024, doi:10.1016/j.xpro.2024.103269: https://pmc.ncbi.nlm.nih.gov/articles/PMC11408372/
- [ISTL-CITESPACE] Issues in Science and Technology Librarianship, CiteSpace case study: https://journals.library.ualberta.ca/istl/index.php/istl/article/download/2779/2822?inline=1
- [CS101-NODES] https://sites.google.com/site/citespace101/6-configure-a-citespace-run/6-4-node-selection
- [CS101-CLUSTER] https://sites.google.com/site/citespace101/first-example/4-2-clustering
- [CS101-INTERPRET] https://sites.google.com/site/citespace101/first-example/4-3-interpret-results
- [CS-SCOPUS] https://citespace.podia.com/blog/48cc06cd-a615-45e8-9eb4-fcbaff26c424
- [CS-BURST] https://citespace.podia.com/glossary-burstness
- [CS-DEDUP] https://sourceforge.net/p/citespace/blog/2019/07/scopus
- [CS-TICKET] https://sourceforge.net/p/citespace/tickets/52
- [CS-APPENDIX] https://www.frontiersin.org/api/v4/articles/1550373/file/Table_3.docx/1550373_table_3/1
- [SMU-CITESPACE] https://library.smu.edu.sg/topics-insights/citespace-bibliometric-mapping-tool-power-users-reviews-business
- [CHEN-PNAS-2004] Chen 2004, PNAS: https://pmc.ncbi.nlm.nih.gov/articles/PMC387312
- [ARXIV-LING-AI] https://arxiv.org/pdf/2411.19858
- [BIBLIOMETRIX-CONVERT] https://raw.githubusercontent.com/massimoaria/bibliometrix/master/R/convert2df.R
- [BIBLIOMETRIX-MERGE] https://search.r-project.org/CRAN/refmans/bibliometrix/html/mergeDbSources.html
- [BIBLIOMETRIX-NETWORK] https://raw.githubusercontent.com/massimoaria/bibliometrix/master/R/biblioNetwork.R
- [BIBLIOMETRIX-NETPLOT] https://raw.githubusercontent.com/massimoaria/bibliometrix/master/R/networkPlot.R
- [BIBLIOMETRIX-THEMATIC] https://raw.githubusercontent.com/massimoaria/bibliometrix/master/R/thematicMap.R
- [BIBLIOMETRIX-HIST] histNetwork: https://search.r-project.org/CRAN/refmans/bibliometrix/html/histNetwork.html
- [RBLOGGERS-BIBLIO] https://www.r-bloggers.com/2025/05/mapping-research-landscapes-and-dynamics-some-basic-bibliometric-analyses-with-r/amp/
- [GROUP-MERGE] https://groups.google.com/g/dataanalysistraining/c/Ku4ESanxUHo
- [GARDENING-CLEANING] https://sites.google.com/view/bibliometricgardening/structure/7-cleaning
- [CASRAI-VOS] Secondary source: unsigned "CASRAI Editorial Board" guide, published 24 July 2026: https://casrai.org/guides/vosviewer
- [ALBRECHT-BLOG] https://nayalbrecht.github.io/posts/2025/01/blog-post-3
- [PERIANES-2016] Perianes-Rodriguez, Waltman, van Eck: https://arxiv.org/abs/1607.02452
- [LEYDESDORFF-PARK] https://arxiv.org/abs/1611.06943
- [DONTHU-2021] https://fenix.iseg.ulisboa.pt/downloadFile/281608120804967/Lit%20Review%20Donthu%20et%20al%202021.pdf
- [TAMING-WILD-WEST] https://link.springer.com/article/10.1007/s11092-026-09492-1 (abstract via OpenAlex)
- [MARZI-2025] https://onlinelibrary.wiley.com/doi/10.1111/ijmr.12381
- [BIBLIO-2023] BIBLIO guideline: https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10722750/ ; checklist: https://www.equator-network.org/wp-content/uploads/2024/01/BIBLIO-Checklist.pdf
- [GLOBAL-ARXIV] GLOBAL guideline: https://arxiv.org/pdf/2610.38748
- [IMPLICIT-STANDARDS] https://arxiv.org/pdf/2508.16276
- [WATERLOO-JOB] https://uwaterloo.ca/lib/about/work-libraries/bibliometrics-and-research-impact-librarian
- [UNC-JOB] UNC-Chapel Hill Health Research Intelligence Librarian (IASSIST): https://iassistdata.org/jobs-repository/2026-07-22_2/
- [JOBS-SEARCH] https://access.sconul.ac.uk/node/91562 ; https://jobs.library.musc.edu/RII.php
- [NIH-LIB] https://www.nihlibrary.nih.gov/about-us/news/bibliometrics-classes-and-services ; https://datascience.nih.gov/node/33596
- [UCL-DOWNLOAD] UCL library, downloading data (updated Nov 10, 2026): https://library-guides.ucl.ac.uk/research-metrics/downloading-data
- [SCIVAL-COLLAB] Elsevier, SciVal Collaboration module: https://www.elsevier.support/scival/answer/collaboration-module-identify-and-evaluate-existing-and-potential-collaboration-partners
- [SCANR-ARXIV] Barbier and Jeangirard, Mapping scientific communities at scale: https://arxiv.org/html/2501.10035
- [VOS-ONLINE-EMBED] https://app.vosviewer.com/docs/sharing/embedding
- [VOS-ONLINE-SEARCH] https://app.vosviewer.com/docs/file-types/json-file-type ; https://leidenmadtrics.nl/articles/vosviewer-goes-online-part-1
- [DIMENSIONS-HELP] https://help.dimensions.ai/en/articles/9784001
- [SCOPUS-FIELDS] https://www.elsevier.support/scopus/answer/what-fields-are-used-when-exporting-documents-from-scopus
- [SCOPUS-RN-2025] Scopus release notes 2025: https://www.elsevier.support/scopus/answer/scopus-release-notes-2025
- [SCOPUS-RN-2026] Scopus release notes 2026: https://www.elsevier.support/scopus/answer/scopus-release-notes-2026
- [WOS-LIMITS] https://library.bath.ac.uk/web-of-science-all-databases/saving
- [HKUST-COMPARE] https://libguides.hkust.edu.hk/citation-chaining/citation-mapping-tools-comparison
- [CITATIONCHASER] https://cran.r-project.org/web/packages/citationchaser/index.html
- [CITNET-ARXIV] van Eck and Waltman, CitNetExplorer: https://arxiv.org/pdf/1404.5322
- [HYPERGRAPH-PERSIST] https://arxiv.org/pdf/2201.00972
- [HYPERGRAPH-SCIREP] https://www.nature.com/articles/s41598-021-85133-5.pdf
- [HYPERGRAPH-RW] https://arxiv.org/pdf/1911.06523
- [VELDEN-HOMONYMY] https://arxiv.org/pdf/1106.2473
- [LUMPING-PMC] https://pmc.ncbi.nlm.nih.gov/articles/PMC3722140
- [WALKTRAP-NOTE] https://arxiv.org/pdf/1512.09023
- [MAINPATH-WIKI] Main path analysis: https://en.wikipedia.org/wiki/Main_path_analysis
- [BATAGELJ-SPC] Batagelj, Efficient algorithms for citation network analysis: https://arxiv.org/abs/cs/0309023
- [MPAR] mpaR R package: https://cran.r-universe.dev/mpaR/mpaR.pdf
- [LUCIO-ARIAS-HISTCITE] Lucio-Arias and Leydesdorff, main paths in HistCite historiograms: https://arxiv.org/abs/0911.1454
- [RPYS-SCHUBERT] Leydesdorff et al., RPYS and algorithmic historiography: https://arxiv.org/abs/1604.04705
- [RAFOLS-OVERLAY] Rafols, Porter, Leydesdorff, Science overlay maps: https://arxiv.org/abs/0912.3882
- [CARLEY-OVERLAY] Carley et al. 2017, Enhanced science overlay maps, JDIS 2(3): https://dare.uva.nl/id/4f03cac6-50c1-40bd-8990-33eb53abaae5
- [LEYDESDORFF-PATENT-OVERLAY] Leydesdorff, Kushnir, Rafols, overlay maps for USPTO data by IPC: https://arxiv.org/abs/1210.6456
- [RAFOLS-MEYER] Rafols and Meyer 2010, Diversity and network coherence: https://arxiv.org/abs/0901.1380
- [WALTMAN-VANECK-2012] Publication-level classification system: https://arxiv.org/abs/1203.0532
- [TRAAG-LEIDEN] Traag, Waltman, van Eck 2019, From Louvain to Leiden: https://www.nature.com/articles/s41598-019-41695-z
- [LEIDEN-FIELDS] Leiden Ranking fields: https://open.leidenranking.com/information/fields ; https://leidenranking.com/information/fields
- [OPENALEX-TOPICS] OpenAlex Topics: https://help.openalex.org/hc/en-us/articles/24736129405719-Topics ; CWTS dataset: https://zenodo.org/records/17442025
- [OPENALEX-FUNDER] OpenAlex funder portfolio tutorial: https://help.openalex.org/tutorials/funder-portfolios/
- [NIHMAPS] Talley et al. 2011, Database of NIH grants (Nature Methods): https://pmc.ncbi.nlm.nih.gov/articles/PMC5361216
- [FUNDING-PUBLIC-GOOD] Science as a public good (Dimensions vs RePORTER linkage): https://arxiv.org/pdf/2105.00152
- [DIMENSIONS-FUNDING] Dimensions funding strategy page (vendor): https://www.dimensions.ai/resources/sharpen-your-funding-strategy-and-strengthen-your-grant-applications
- [PATENT-ANALYSIS-WIKI] Patent analysis: https://en.wikipedia.org/wiki/Patent_analysis
- [WIPO-PLR] WIPO Guidelines for Preparing Patent Landscape Reports (Trippe, 2015), WIPO pub 946: https://tind.wipo.int/record/28858 (table of contents seen; full text returned 403)
- [WIPO-MANUAL-LENS] WIPO Open Source Patent Analytics manual, The Lens: https://wipo-analytics.github.io/manual/the-lens-1.html
- [WIPO-MANUAL-GEPHI] Same manual, Gephi: https://wipo-analytics.github.io/manual/gephi-1.html
- [VDP-PATENTS] van der Pol, Extracting patent data (NetworkIsLife): https://jpvdp.github.io/NetworkIsLife/Package_patents.html
- [EPO-FAMILIES] EPO, patent families: https://epo.org/en/searching-for-patents/helpful-resources/first-time-here/patent-families
- [PATSNAP-CITMAP] PatSnap help, Citation Map (summary via search; page returned 403): https://help.patsnap.com/hc/en-us/articles/37766630365341-Citation-Map
- [HEGDE-SAMPAT] Hegde and Sampat 2009, examiner citations and patent value, Economics Letters: https://econpapers.repec.org/RePEc:eee:ecolet:v:105:y:2009:i:3:p:287-289
- [RELIANCE-ON-SCIENCE] Marx, Reliance on Science dataset: https://zenodo.org/records/11461587
- [PUBMED-LANDSCAPE] Gonzalez-Marquez et al. 2024, The landscape of biomedical research, Patterns: https://pmc.ncbi.nlm.nih.gov/articles/PMC11240179
- [LLM-CLUSTER-LABELS] Murray et al., Using language models to label clusters of scientific documents: https://arxiv.org/pdf/2511.02601
- [CITATION-AWARE-EMBED] Liang, van Eck et al., citation importance-aware document representations for science mapping: https://arxiv.org/abs/2512.13054
- [UMAP-REPRO] UMAP documentation, reproducibility: https://umap-learn.readthedocs.io/en/latest/reproducibility.html
- [CP-LAUNCH] Connected Papers launch post: https://medium.com/connectedpapers/announcing-connected-papers-a-visual-tool-for-researchers-to-find-and-explore-academic-papers-89146a54c7d4
- [CP-HKUST] HKUST library, Connected Papers: https://library.hkust.edu.hk/sc/connected-papers
- [CP-PREMIUM] Connected Papers, premium accounts and multi-origin graphs: https://connectedpapers.substack.com/p/announcing-premium-accounts-multi-22-07-28
- [LITMAPS-VIS] Litmaps help, visualization and axes: https://docs.litmaps.com/en/articles/9181490-use-and-edit-litmaps-visualization
- [LITMAPS-HKU] HKU library blog, Litmaps: https://blog-sc.hku.hk/?p=3264
- [LITMAPS-MONITOR] Litmaps help, Monitor: https://docs.litmaps.com/en/articles/9126249-monitor-get-alerts-for-important-research
- [RR-TRINITY] Trinity University guide, ResearchRabbit papers: https://libguides.trinity.edu/researchrabbit/papers
- [RR-2026] Effortless Academic, ResearchRabbit 2026 review: https://effortlessacademic.com/research-rabbit-2026-review-for-researchers/
- [INCITEFUL-HELP] Inciteful, paper discovery explained: https://incitefulmed.com/academic/help/paper-disovery-explained
- [WOHLIN-2014] Wohlin, Guidelines for snowballing in systematic literature studies, EASE 2014, doi:10.1145/2601248.2601268: https://www.wohlin.eu/ease14.pdf
- [PRISMA-S-QA] PRISMA 2020 and PRISMA-S: common questions on tracking records and the flow diagram: https://pmc.ncbi.nlm.nih.gov/articles/PMC9014944
- [TAY-CHASING] Aaron Tay, all about citation chasing and tools: https://aarontay.substack.com/p/all-about-citation-chasing-and-tools
