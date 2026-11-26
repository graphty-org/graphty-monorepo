# Data Preparation, Import and First Assessment Across All Graph Users

Most graph projects do not start with a graph. People start with spreadsheets, vendor exports, logs, survey
responses, gene lists, bibliographic records or document dumps, and spend a large, mostly invisible part of the
project turning them into node and edge tables a graph tool will accept. The Origraph authors put it plainly: network data "is rarely collected in a form that suits the analysis
process" ([Bigelow et al., Origraph](https://www.arxiv.org/abs/1812.06337v2)). Graph-database, knowledge-graph and network-biology users
start instead from a query against a live database, endpoint or repository, and their "import" is choosing how much
to pull (section 4.12). This document follows both kinds of preparation across populations: the material people
have, the conversions they run, the choices import dialogs force (column roles, direction, duplicate edges, types,
missing nodes, layers, time and place), the errors those choices cause, and the first checks after loading. It confirms, corrects and deepens Graphty's workflows W01 (First Exploration) and W18 (Data Import and
Validation).

## 1. Population

This is a cross-cutting activity, not a job. Everyone in the other user-research documents does it; what differs is
the input shape and the tool.

| Population                                                      | Typical starting material                                                                                      | Typical tool at import                                               | Coding                   |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ------------------------ |
| Students and instructors in SNA, DH and network-science courses | Hand-made Excel sheets; course datasets                                                                        | Gephi Data Laboratory, Palladio, Kumu, NodeXL                        | Mostly none              |
| Academic social network researchers                             | Roster surveys (wide, one row per respondent), affiliation tables                                              | UCINET DL editor, R (igraph, statnet), Gephi                         | Bimodal: menus or R      |
| Digital humanists and historians                                | Transcribed letters, records with multi-value people cells                                                     | Palladio, Gephi, nodegoat, Python                                    | Low to medium            |
| Bibliometricians and research librarians                        | Web of Science, Scopus, Dimensions, OpenAlex exports                                                           | VOSviewer, bibliometrix/biblioshiny, CiteSpace, Sci2                 | Low to medium            |
| Network and systems biologists                                  | Gene lists, expression tables, MITAB/KGML downloads, correlation matrices                                      | Cytoscape (stringApp), R (WGCNA, igraph)                             | Medium                   |
| Molecular epidemiologists                                       | Sequence alignments turned into pairwise distance files                                                        | HIV-TRACE, MicrobeTrace, Cytoscape                                   | Medium                   |
| Intelligence, law enforcement and OSINT analysts                | Call detail records, bank statements, case spreadsheets                                                        | i2 Analyst's Notebook import specifications, Maltego table import    | Low                      |
| Fraud and AML analysts                                          | Transaction tables, customer-identifier tables                                                                 | Graph database loaders, Linkurious, KeyLines apps                    | Low to medium            |
| Security analysts                                               | SharpHound zips, Zeek and NetFlow logs, STIX bundles                                                           | BloodHound, Graphistry, Maltego, OpenCTI                             | Medium                   |
| Data scientists and graph engineers                             | Relational tables, Parquet, RDF                                                                                | Neo4j LOAD CSV and Data Importer, pandas plus NetworkX               | High                     |
| Personal-network (egocentric) survey researchers                | Ego, alter and alter-alter files (Network Canvas) or a Qualtrics export                                        | R (egor, ideanet)                                                    | Medium                   |
| Graph-database and knowledge-graph users                        | A live Neo4j, Neptune or Memgraph database; a SPARQL endpoint                                                  | Neo4j Browser and Bloom, Linkurious query templates, graph notebooks | Medium (query languages) |
| Network biologists pulling public networks                      | NDEx records, STRING queries, Zenodo or figshare deposits                                                      | Cytoscape (NDEx, stringApp), ndex2                                   | Medium                   |
| Network neuroscientists                                         | One region-by-region matrix per subject (and per modality or time window), node coordinates                    | Brain Connectivity Toolbox, bctpy, GRETNA, BrainNet Viewer           | Medium                   |
| Ecologists                                                      | Species incidence matrices, one per site or season; Web of Life or Mangal downloads                            | R `bipartite`, `emln`, igraph                                        | Medium to high           |
| People-analytics teams                                          | Collaboration metadata (Viva Insights, Slack, email) joined to HR attributes; one edge set per survey question | Viva Insights, Polinode                                              | Low to medium            |
| Investigative journalists and OSINT researchers                 | Leaked or collected document dumps, company registries                                                         | Aleph and FollowTheMoney, Datashare, Gephi                           | Low to medium            |

Each of the added rows has its own population document in this folder; their import paths are in sections 4.5 and
4.11 to 4.16.

**Size of the effort.** Data scientists spend 45% of their time on loading and cleansing
([Anaconda 2020](https://know.anaconda.com/rs/387-XNW-688/images/Anaconda-SODS-Report-2020-Final.pdf)); no source found
for graph-tool users.

**Skill profile.** Novices do not know that edges must reference node ids, that a CSV keeps one worksheet (Bowdoin,
4.1), or that "Directed" is a default they accepted. Experts spend their time on harder choices:
how to weight an event table, how to project a two-mode table, where to threshold a similarity matrix, whether to keep tie types as layers.

**How often.** Once per project for most academics; daily for investigators who load new returns into a template;
continuously for engineers who maintain pipelines.

## 2. Personas

These are composites, each grounded in the cited tutorials, help-desk threads and documentation. Personas already in
design/designloom (genomics-cytoscape-user, intelligence-analyst, fraud-analyst, cybersecurity-analyst, explorer-elena)
also import data; the four below are the people for whom preparation and import is the main event.

### 2.1 Priya Raman -- spreadsheet-first network builder (id: spreadsheet-first-network-builder)

- **Role and background.** Master's student in public policy (or program officer at a nonprofit) mapping a coalition
  of organizations for a course project or a funder report. Comfortable in Excel and Google Sheets, never written code.
- **Tools today.** Excel; Gephi after a library workshop ([Brown LibGuide](https://libguides.brown.edu/gephi));
  Kumu because it opens a spreadsheet in the browser ([Kumu import guide](https://docs.kumu.io/guides/import/import)).
- **Data.** One sheet, one row per organization, with a "Partners" column holding several names separated by
  semicolons; 50 to 300 organizations; names typed inconsistently ("Food Bank of X", "X Food Bank").
- **Goals.** A readable map, a count of who is most connected, a figure for a slide.
- **Frustrations.** Saved as .xlsx when the tool wanted .csv; a comma inside a name split the row (seinecle, 4.1);
  edges did not attach because edge-sheet names differed from node ids; duplicate nodes because "Create missing nodes"
  stayed checked (Grandjean, 4.1); the first view is "completely unreadable" until a layout runs (Grandjean).

### 2.2 Sgt. Dana Whitfield -- event-log network builder (id: event-log-network-builder)

- **Role and background.** Crime or intelligence analyst in a regional police unit (the same pattern holds for an AML
  investigator with bank statements or a SOC analyst with connection logs).
- **Tools today.** Analyst's Notebook import specifications that turn each call row into entity-link-entity; Excel to
  reformat each carrier's layout first; sometimes Maltego's table import.
- **Data.** One row per call: calling number, called number, start time, duration, cell site. Thousands to hundreds of
  thousands of rows per return, laid out differently by each carrier; i2's PatternTracer took "up to 100,000 telephone
  records at a time" ([Nextgov 2002](https://nextgov.com/digital-government/2002/06/software-sorts-out-suspect-phone-data/204384)).
- **Goals.** Who talks to the targets, how often, who are common contacts, and a chart for the case file.
- **Frustrations.** Each new carrier layout needs a new or edited specification; a direction column says "inbound" or
  "outbound" and must be transformed ([i2 link direction](https://docs.i2group.com/anb/9.4.0/setting_the_link_direction.html));
  phone numbers in several formats break identity matching; a spreadsheet with a huge "used range" of blank cells
  throws OutOfMemory on import ([IBM technote](https://www.ibm.com/support/pages/resolving-outofmemoryexception-errors-when-importing-data-analysts-notebook));
  long text truncated at 255 characters ([IBM](https://www.ibm.com/support/pages/why-are-long-string-values-imported-excel-file-sometimes-truncated-255-characters)).

### 2.3 Dr. Ines Aldana -- bibliometric network analyst (id: bibliometric-network-analyst)

- **Role and background.** Research-impact librarian or bibliometrician producing collaboration and topic maps for
  deans, grant offices and systematic reviews.
- **Tools today.** Web of Science and Scopus exports; VOSviewer for co-authorship, co-citation and keyword maps
  ([Leiden VOSviewer guide](https://gorlaeus-library.github.io/VOSviewer/collab.html)); bibliometrix in R
  ([vignette](https://bibliometrix.org/vignettes/Introduction_to_bibliometrix.html)); Excel for thesaurus files.
- **Data.** Export batches (section 4.7); multi-value author, affiliation and keyword cells; name variants ("Smith J",
  "Smith JA").
- **Goals.** Who collaborates with whom, which groups exist, how topics cluster; defensible thresholds.
- **Frustrations.** Concatenating batches; building a thesaurus by hand; the choice between full and
  fractional counting ([Perianes-Rodriguez, Waltman, van Eck](https://arxiv.org/abs/1607.02452v4)); documents with
  hundreds of authors swamping the map (the Notre Dame guide caps authors per document at 25:
  [ND LibGuide](https://libguides.library.nd.edu/vos-viewer/demo)).

### 2.4 Tomas Lindqvist -- graph data wrangler (id: graph-data-wrangler)

- **Role and background.** Research software engineer, bioinformatician or data scientist who prepares network files
  for colleagues who use desktop tools. Writes pandas, R and SQL.
- **Tools today.** pandas plus NetworkX, R igraph, Neo4j LOAD CSV, the WGCNA export, tn93 plus HIV-TRACE.
- **Data.** Correlation or distance matrices, event logs of millions of rows, relational tables.
- **Goals.** A file the colleague's tool can open, with a defensible edge threshold, the right direction and weights,
  and a record of what was dropped.
- **Frustrations.** A threshold that is too low "produces monstrous files"
  ([Bioconductor support](https://support.bioconductor.org/p/95965/)); NetworkX `DiGraph` silently keeps one edge per
  pair, so repeated replies vanish unless counted first (Penn book, 4.3); igraph's "Some vertex names in edge list are
  not listed in vertex data frame"
  ([Posit forum](https://forum.posit.co/t/network-analysis-error-messages-some-vertex-names-in-edge-list-are-not-listed-in-vertex-data-frame/157302));
  Neo4j MERGE without a uniqueness constraint (section 4.10).

## 3. Use cases (ranked)

| Rank | Question the user answers at import time                                                                                                                                                                     | Frequency                                                 | Stakes                                                                                                 |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| 1    | "Did everything load?" -- node and edge counts match what I expected                                                                                                                                         | Every import                                              | High: silent drops corrupt every later metric                                                          |
| 2    | "Are my nodes the same things?" -- ids match between tables, no near-duplicate names                                                                                                                         | Every import                                              | High: split or merged identities change degree and paths                                               |
| 3    | "Is it directed, and what do repeated rows mean?" -- direction and parallel-edge policy                                                                                                                      | Every import                                              | High: Gephi CSV defaults to Directed; summing or dropping duplicates changes weights                   |
| 4    | "Turn my rows into ties" -- event log to weighted edges; multi-value cell to edges; wide roster survey to edge list; ego, alter and alter-alter files to a set of ego networks; relational tables to a graph | Most projects                                             | High: the weighting rule, missing-respondent rule and node/relationship mapping are analytic decisions |
| 5    | "Turn my two-mode table into the network I care about" -- bipartite load and projection                                                                                                                      | Common in DH, SNA, fraud, bibliometrics                   | High: projection inflates density and clustering                                                       |
| 6    | "Turn my matrix into a network" -- adjacency, similarity or distance matrix to thresholded edges                                                                                                             | Common in biology, epidemiology, psychology               | High: the threshold decides the network                                                                |
| 7    | "Get a network for my list" -- gene list to interaction network via a database                                                                                                                               | Constant in biology                                       | Medium-high: unmatched or ambiguous identifiers                                                        |
| 8    | "Load it again next month" -- reuse a saved mapping or template on a new file of the same layout                                                                                                             | Daily in investigations                                   | Medium                                                                                                 |
| 9    | "It is too big" -- sample, filter or aggregate before import                                                                                                                                                 | Occasional                                                | Medium: crashes, or silent truncation at 1,048,576 rows in Excel                                       |
| 10   | "Is this network shaped the way I expect?" -- components, degree, isolates, self-loops, first layout                                                                                                         | Every import                                              | Medium-high: catches the errors above                                                                  |
| 11   | "Pull the part I need" -- capped query to a database, endpoint or repository; expand; refresh                                                                                                                | Every session for database users                          | High: uncapped freezes the tool; capped hides what was left out                                        |
| 12   | "Make a graph from these documents" -- extract entities and relationships with provenance                                                                                                                    | Constant in journalism and GraphRAG work                  | High: extraction and entity-resolution errors become false links                                       |
| 13   | "When and where" -- parse time and place columns                                                                                                                                                             | Common in investigations, temporal and spatial work       | Medium-high: unparsed rows silently drop out of time and map views                                     |
| 14   | "Keep my tie types apart" -- load several relations, modalities, sites or windows over the same nodes as layers                                                                                              | Common in SNA, ONA, connectomics, ecology, investigations | High: merging layers on import fuses different relations into one weight                               |

## 4. Step-by-step workflows

### 4.1 Two-table spreadsheet import into Gephi (the canonical novice path)

Sources: [Toronto MDL tutorial](https://mdlutoronto.github.io/gephi-visualize-network-dataset/3-c-import-this-data-into-gephi/),
[Gephi CSV manual page](http://docs.gephi.org/desktop/User_Manual/Import/CSV_Format/),
[seinecle tutorial](https://seinecle.github.io/gephi-tutorials/generated-html/importing-csv-data-in-gephi-en.html),
[Bowdoin guide](https://research.bowdoin.edu/digital-computational-studies/digital-computational-studies/excel-data-and-gephi-data-laboratory),
[Grandjean](https://www.martingrandjean.ch/introduction-to-network-visualization-gephi/).

1. **Build two sheets in Excel (hours to days).** Node table with at least `Id` and `Label` ("must have at least an
   Id and a Label", seinecle); edge table with at least `Source` and `Target`, which "refer to node Ids" (Bowdoin);
   optional `Type`, `Weight` and time columns (section 4.15). Bowdoin recommends unique numeric ids with short labels.
2. **Save each sheet as CSV.** Excel defaults to .xlsx and a CSV keeps only the active worksheet (Bowdoin, Brown).
   Quote labels that contain commas (seinecle).
3. **Data Laboratory > Import Spreadsheet > nodes file.** Choose separator and charset; "Import as: Nodes table".
4. **Column types screen.** Fix types before Finish; an existing column's type cannot be changed later; cells that
   cannot be parsed become null (manual).
5. **Import report.** Check "# of Nodes" (19 in the tutorial); choose "Append to existing workspace".
6. **Import Spreadsheet > edges file, "Import as: Edges table".** Source and Target are mandatory and cannot be
   deselected; "If no node/edge Id column is provided ... an automatic id will be assigned"; edge type "default is
   Directed" (manual).
7. **Edge import report.** Set "Graph Type" (Toronto: Undirected because relationships are mutual); confirm "# of
   Edges" (31). Choose the edge merge strategy for duplicates. Gephi's importer API defines SUM, AVG, MAX, MIN, FIRST,
   LAST and NO_MERGE ([EdgeMergeStrategy](https://gephi.org/gephi/0.9.2/apidocs/org/gephi/io/importer/api/EdgeMergeStrategy.html)).
   Uncheck "Create missing nodes" when nodes are already loaded (Grandjean); check it when importing an edge list
   alone (seinecle).
8. **Read the second message.** Gephi reports mutual edges removed when it converts to undirected; the Toronto tutorial
   says to ignore it only "when the count is 0".
9. **Verify in Data Laboratory** tables.

**Known failure modes.** The importer once kept only the first parallel edge, fixed in 2011 to sum weights
([Launchpad 785635](https://bugs.launchpad.net/gephi/+bug/785635)); reciprocal edges "vanishing" in 2020 was
directed-versus-undirected confusion ([GitHub 2216](https://github.com/gephi/gephi/issues/2216)). No source gives
step timings.

### 4.2 Network and attribute import into Cytoscape, with key-column joins

Sources: [Cytoscape manual, Creating Networks](https://manual.cytoscape.org/en/stable/Creating_Networks.html),
[Node and Edge Column Data](https://manual.cytoscape.org/en/3.10.3/_sources/Node_and_Edge_Column_Data.md.txt),
[Importing Network From Table tutorial](https://cytoscape.org/cytoscape-tutorials/protocols/importing-network-from-table/),
[Cytoscape help desk threads](https://groups.google.com/g/cytoscape-helpdesk/c/O0Qpdb0zuLc).

1. **File > Import > Network from File.** Text or Excel; one worksheet at a time.
2. **Assign column roles:** Source Node, Target Node, optional Interaction Type (where layered data puts its layer,
   section 4.16); other columns become edge or node attributes. Types: String, Boolean, Integer, Floating Point, List; a list needs one delimiter for the whole table.
3. **Watch for attribute overwrite.** In the bait-prey tutorial, a prey seen with several baits keeps only "the last
   value imported" of a node attribute.
4. **File > Import > Table from File** for node data: choose "Where to Import Table Data" (a network collection, one
   network, or the Unassigned Table, which links later), "Import Data as" node, edge or network columns, and the key
   column in the file to match "Key Column for Network".
5. **Common failure: nothing matches.** The network key `shared name` is always a String, so a numeric id column must
   be switched to String; the default key is the file's first column; when no key values match "only column headers
   import"
   ([thread](https://groups.google.com/g/cytoscape-helpdesk/c/O0Qpdb0zuLc)); users also report half the values
   importing with no explanation ([thread](https://groups.google.com/g/cytoscape-helpdesk/c/tB4mcg8VHvA)).
6. **Clean up:** Edit > Remove Duplicated Edges (same source and target, keep one) and Edit > Remove Self-Loops
   ([Quick Tour](https://manual.cytoscape.org/en/latest/Quick_Tour_of_Cytoscape.html)); users ask how to collapse A-to-B
   and B-to-A while staying directed ([Biostars](https://www.biostars.org/p/9524627)).
7. **Identifier mapping is a separate step:** right-click a column > Map Column, using Ensembl and BridgeDb, constrained
   by species; "Force Single" keeps the first answer (manual).

### 4.3 Event table to weighted network (calls, emails, transactions, connections)

Sources: [Hardin et al. Enron tutorial](https://jse.amstat.org/v23n2/hardin/EnronTutorial.pdf),
[SNAP email-Enron](https://snap.stanford.edu/data/email-Enron.html), [Penn networks book](http://wonderlab.gse.upenn.edu/networks_book/ch6-network-data-handson.html),
[PyGraphistry hypergraph](https://pygraphistry.readthedocs.io/en/0.52.1/api/hyper.html),
[i2 link direction](https://docs.i2group.com/anb/9.4.0/setting_the_link_direction.html),
[IBM multiplicity technote](https://www.ibm.com/support/pages/node/6413409).

1. **Inspect the raw rows.** One row per event; endpoints may be in different columns (From, To, Cc, Bcc), may point at
   another record rather than a person (a forum reply's `toID` is a post id, so the analyst must join to find the
   replied-to author: Penn book), or may be split by direction ("inbound"/"outbound").
2. **Normalize identifiers.** Phone number formats, email aliases, account numbers with and without prefixes. i2 uses
   "Column Actions" and substitution files to rewrite values before matching
   ([IBM](https://www.ibm.com/support/pages/changing-and-replacing-values-i2-analysts-notebook-import-specification-data-column))
   and advises to "normalize values before matching"
   ([IBM](https://www.ibm.com/support/pages/item-matching-and-duplicate-handling-analysis-repository-onyx-importer)).
3. **Choose what an edge is.** Keep every event as its own link or one summarized link (i2 multiplicity); one edge
   per pair with a count (Penn: `groupby(...).size()`, dropping per-event attributes); a weighted formula (Hardin et al. add direct messages to a
   discounted sum over Cc recipients, restricted to enron.com addresses, then symmetrize with U = M + M^T - D); or
   binary and undirected (SNAP's email-Enron draws an edge if one address sent at least one email to the other).
4. **Choose direction.** Caller to called, sender to recipient, payer to payee. i2 can set one direction for all links
   or read it from a column.
5. **Or build a hypergraph.** Graphistry's `hypergraph(df, columns)` makes one node per event and one per distinct
   value; `direct=True` links the row's values to each other instead (section 4.14).
6. **Load and check counts:** unique endpoints, edges after aggregation, self-loops (a person emailing themself), and
   the share of events that lost an endpoint.

### 4.4 Multi-value cells and two-mode tables to a bipartite network and its projection

Sources: [Kumu import guide](https://docs.kumu.io/guides/import/import), [OpenRefine splitting](https://guides.library.illinois.edu/openrefine/splitting),
[seinecle bipartite tutorial](https://seinecle.github.io/gephi-tutorials/generated-html/k-partite-bi-partite-graph-en.html),
[Hanneman ch. 6](https://faculty.ucr.edu/~hanneman/nettext/C6_Working_with_data.html),
[Borgatti et al. ch. 5 exercises](https://study.sagepub.com/borgatti2e/student-resources/chapter-5/chapter-5-data-management),
[PAOHvis](https://aviz.fr/Research/paohvis), [bibnets](https://mirror.las.iastate.edu/CRAN/web/packages/bibnets/bibnets.pdf).

1. **Recognize the shape.** One row per record with a delimited people column (letters, papers, a "Partners" cell); a
   person-by-event incidence matrix; a two-column person,event list; UCINET nodelist2; PAOHvis CSV, where each document
   stays one hyperedge.
2. **Split the cell into rows.** OpenRefine: Edit cells > Split multi-valued cells with the separator (pipe with the
   regular-expression option), which creates rows grouped as one record; clean the individual values; optionally join
   back. Kumu does this at import: pipe-separated values in a `To` cell draw one connection to each element.
3. **Clean names after splitting.** OpenRefine clustering: start with fingerprint ("least likely to produce false
   positives"), then n-gram, phonetic keys chosen by language, and Levenshtein; clustering is syntactic and "can't replace semantic reconciliation"
   ([OpenRefine clustering](https://openrefine.org/docs/technical-reference/clustering-in-depth)).
4. **Decide: keep two-mode or project.** Hanneman: UCINET Data > Affiliations builds actor-by-actor or event-by-event
   matrices; Cross-Products and Minimums differ for valued data. In Gephi, the Multimode Networks Transformation plugin
   takes the mode column and left and right matrices; duplicate the workspace first because the plugin modifies it in
   place, and re-running on a transformed workspace gives wrong results (seinecle).
5. **Know what projection does.** Every event becomes a clique, inflating links and density; different bipartite
   graphs project to the same one-mode graph
   ([Zhou et al.](https://arxiv.org/pdf/0707.0540), [Latapy et al.](https://arxiv.org/pdf/cond-mat/0611631)). Weighting
   choices: academic-social-network-research.md section 5.3.

### 4.5 Matrix input: adjacency, similarity and distance matrices

Sources: [yEd Excel import](https://yed.yworks.com/support/manual/import_excel.html) and
[yEd Q&A](https://yed.yworks.com/support/qa/9808/relational-entities-in-excel-file-to-directed-graph),
[Kumu adjacency FAQ](https://docs.kumu.io/frequently-asked-questions/how-do-i-restructure-my-adjacency-matrix),
[Gephi DL format](https://docs.gephi.org/desktop/User_Manual/Import/UCINET_DL_Format),
[NetworkX from_pandas_adjacency](https://networkx.org/documentation/latest/reference/generated/networkx.convert_matrix.from_pandas_adjacency.html),
[WGCNA exportNetworkToCytoscape](https://search.r-project.org/CRAN/refmans/WGCNA/html/exportNetworkToCytoscape.html),
[AUTO-TUNE](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11289888/).

1. **Who has matrices.** Survey and sociometric data (UCINET full matrix), social scientists' Excel grids, gene
   co-expression (correlation or topological overlap), sequence distances, psychological symptom correlations.
2. **Tool support varies.** yEd imports a matrix with "exactly one edge property" and no adjacency lists; Kumu needs
   a conversion to a connection list first; Gephi reads UCINET DL `fullmatrix`; NetworkX reads a DataFrame (entry
   (i, j) is an edge from i to j); a MATLAB tool exists only to convert matrices to Gephi CSVs
   ([adj2gephilab](https://www.mathworks.com/matlabcentral/fileexchange/51146-adj2gephilab)).
3. **Threshold similarity.** WGCNA's `exportNetworkToCytoscape` defaults to 0.5, one tutorial uses 0.02, and forum
   answers say "the choice is up to you" ([Biostars](https://www.biostars.org/p/9514423/)).
4. **Threshold distance.** HIV-TRACE draws an edge when TN93 distance is at or below a threshold, commonly 1.5% for HIV
   pol (`tn93 -t 0.015`, then `hivnetworkcsv`); "too high ... many spurious links" (AUTO-TUNE). Clusters are connected components at that threshold
   ([Rhee et al.](https://hivdb.stanford.edu/_wrapper/pages/pdf/Rhee.2019.OFID.pdf)).
5. **Threshold brain matrices by density, not only by value.** An absolute threshold keeps edges above a
   correlation (published values "ranging from r=0.1-0.8"); a proportional one keeps a fixed share of the strongest
   edges so every subject has the same density, and measures "are more stable across proportional than absolute
   thresholds" ([Garrison et al. 2015](https://pmc.ncbi.nlm.nih.gov/articles/PMC4554838)). Proportional thresholds can
   inflate group differences when one group's connectivity is lower
   ([van den Heuvel et al. 2017](https://research.vu.nl/en/publications/proportional-thresholding-in-resting-state-fmri-functional-connec/)).
   Matrices arrive one per subject and are thresholded as a batch across a sweep of densities
   (network-neuroscience-connectomics.md).
6. **Symmetrize or dichotomize.** UCINET Transform > Symmetrize (Maximum, Minimum "the weakest link ... a pretty common
   choice", Sum, Average and others) and Transform > Dichotomize, which "may throw away considerable amounts of
   information" (Hanneman).

### 4.6 Identifier list to network via a database (biology)

Sources: [Jensen lab stringApp exercises](https://jensenlab.org/training/stringapp/),
[stringApp](https://apps.cytoscape.org/apps/stringapp), [Ziemann et al. 2016](https://genomebiology.biomedcentral.com/track/pdf/10.1186/s13059-016-1044-7),
[Abeysooriya et al. 2021](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8357140/).

1. **Start from a list without edges** (gene symbols or UniProt accessions).
2. **Protect identifiers from Excel.** Excel turns SEPT2 into a date; 19.6% of papers with Excel gene lists had such
   errors in 2016, and 30.9% in 2014-2020. Since late 2023 Excel can turn Automatic Data Conversion off
   ([TechRepublic](https://www.techrepublic.com/article/how-to-control-data-conversions-excel/)).
3. **File > Import > Network from Public Databases > "STRING: protein query".** Paste identifiers, choose species,
   confidence cutoff (0.4 in a UCSF example), and "maximum additional interactors" (0 keeps only the query proteins).
4. **Resolve ambiguity.** A dialog lists terms that match several STRING proteins; the first match is preselected.
5. **Join the measurements.** File > Import > Table from File, "To a Network Collection", change "Key Column for
   Network" from `shared name` to `query term`, key the file on its UniProt column.
6. **Check.** How many query terms mapped, how many are isolated, then layout. Downstream steps belong to W20 and
   genomics-cytoscape-user.

### 4.7 Bibliographic export to co-authorship or co-occurrence map

Sources: [Leiden VOSviewer guide](https://gorlaeus-library.github.io/VOSviewer/collab.html),
[UIC guide](https://researchguides.uic.edu/bibliometrics/vosviewer), [ND guide](https://libguides.library.nd.edu/vos-viewer/demo),
[bibliometrix vignette](https://bibliometrix.org/vignettes/Introduction_to_bibliometrix.html).

1. **Search and export.** Web of Science: "Full Record and Cited References", tab-delimited, 500 records per file;
   Scopus: CSV or BibTeX, up to 2,000 per export.
2. **Concatenate batches** into one file; optionally filter by affiliation (Leiden).
3. **Thesaurus.** Tab-delimited "Label" and "Replace by" columns; sort to find variants; delete rows not replaced.
4. **VOSviewer: Create a map based on bibliographic data > Read data from bibliographic database files** > tab for the
   source database > choose analysis (Co-authorship, Authors), counting method (full or fractional), "Ignore documents
   with a large number of authors" (25 in the ND guide), minimum documents per author, thesaurus file.
5. **First look.** "Very colored map with many small clusters" (Leiden); lower the threshold if authors drop out.

### 4.8 Saved mappings and templates (reuse across files)

- **i2 Analyst's Notebook:** import specifications saved as .ximp or .oimp, which "cannot convert" between each other
  ([i2 docs](https://docs.i2group.com/anb/9.4.1/import_specifications.html)).
- **Maltego:** the table-import wizard picks connectivity (Meshed, Sequential, Tree, Manual), maps columns to
  entities, samples and merges links; "save mapping" is on by default ([Maltego docs](https://docs.maltego.com/support/solutions/articles/15000010797-import-graph-from-table)).
- **Kumu and Polinode:** downloadable templates fix the sheet shape ([Polinode](https://docs.polinode.com/guide/networks.html)).
- **Neo4j Data Importer:** a saved, reusable CSV-to-graph model
  ([GraphAcademy](https://graphacademy.neo4j.com/courses/importing-relational-to-graph/3-importing/4-creating-relationships)).
- **No source found** for Gephi or Cytoscape GUI users saving a column mapping; scripted users reuse code instead.

### 4.9 First minutes after loading

Sources: [Gephi Quick Start](http://gephi.org/quickstart/), [Programming Historian, Ladd et al.](https://programminghistorian.org/en/lessons/exploring-and-analyzing-network-data-with-python),
[Cytoscape Analyzer](https://manual.cytoscape.org/en/3.10.3/_sources/Network_Analyzer.md.txt),
[NodeXL guide](https://dspace.stir.ac.uk/retrieve/f1292af1-5cdb-400b-820a-bccae8f82e1f/NodeXL%20-%20a%20guide%20to%20network%20insights%20-%20Author%20Version.pdf),
[Duke Gephi guide](https://guides.library.duke.edu/gephi/visualizing).

1. **Read the counts.** Gephi's import report shows node and edge counts before OK; Programming Historian's "sanity
   check" is 119 nodes and 174 edges.
2. **Global descriptors.** Average degree, density, `is_connected`, diameter only on the largest component
   (`nx.diameter` on a disconnected graph raises an error), transitivity (Programming Historian). Cytoscape Tools > Analyze Network asks directed or undirected (default undirected) and
   reports nodes, edges, connected components, diameter, radius, characteristic path length, clustering coefficient.
   NodeXL's Overall Metrics separates unique edges, duplicate edges and self-loops.
3. **Look at hubs** in the degree list.
4. **Run a layout.** Gephi Quick Start: ForceAtlas 2, stop when balanced, Prevent Overlap; size nodes by degree.
5. **Reduce clutter.** Filters > Topology > Giant Component (Duke) or Degree Range with the left slider at 2 (Quick
   Start).
6. **What it catches.** Unexpected component counts point to id mismatch or duplication; isolates to edges that did
   not attach; doubled edges to an undirected file loaded as directed; self-loops to alias problems; artifact hubs (a
   mailing list, an "Unknown" placeholder, a consortium paper) top the degree list.

No source gives minutes for any of these steps (see the W01 correction in section 9).

### 4.10 Very large files

1. **Know the ceilings.** Excel stops at 1,048,576 rows by 16,384 columns
   ([Microsoft](https://support.microsoft.com/en-us/office/excel-specifications-and-limits-1672b34d-7043-467e-8e27-269d656771c3)),
   so any file whose row count sits at or just under that number has probably been cut off by Excel. NodeXL needs 32 GB RAM for 200 thousand edges (NodeXL guide). Gephi's features page says 100,000 nodes and 1,000,000 edges; the Desktop page now
   says 1M nodes and 5M edges ([features](https://www.gephi.org/features), [desktop](https://gephi.org/desktop)).
2. **Raise memory.** Gephi detects low memory and offers a new limit after restart
   ([troubleshooting](http://docs.gephi.org/desktop/User_Manual/Troubleshooting/)). Cytoscape lets a large network exist without a view and suppresses graphics details
   ([Rendering Engine](https://manual.cytoscape.org/en/3.9.0/Rendering_Engine.html)).
3. **Reduce before import.** Kumu: "Try a subset first"; Maltego samples at import; WGCNA thresholds prefilter;
   BloodHound users split SharpHound JSON until v5.7.0 streamed ingest
   ([release notes](https://bloodhound.specterops.io/resources/release-notes/2024-03-04-v5-7-0)).
4. **Load into a database.** Neo4j: uniqueness constraints first (MERGE is "VERY slow" otherwise), batch with
   `CALL { ... } IN TRANSACTIONS`, nodes then relationships
   ([Neo4j LOAD CSV guide](https://neo4j.com/docs/data-ingestion-guide/ingestion-methods/load-csv/)).

### 4.11 Survey network data: roster (sociometric) and personal-network (egocentric) surveys

Sources: [egor Qualtrics article](https://egor.tillt.net/articles/qualtrics.html),
[ideanet nc_read](https://cran.r-project.org/web/packages/ideanet/vignettes/nc_read.html),
[ideanet ego_netwrite](https://cran.r-project.org/web/packages/ideanet/vignettes/ego_netwrite.html),
[Huisman and Steglich 2008](https://www.stats.ox.ac.uk/~snijders/siena/HuismanSteglich2008.pdf),
[non-response study, dlib.si](https://dlib.si/stream/URN:NBN:SI:DOC-ZRONLGAC/11c18f78-4757-406f-a6aa-de60f4a78124/PDF),
academic-social-network-research.md (sections 3.2 and 5).

**Roster branch (one bounded group).**

1. **Wide to long:** one row per respondent with friend1 to friend5 becomes one row per respondent-nominee pair; a
   survey with several name-generator questions yields one edge set per question (section 4.16).
2. **Match recalled names to roster ids** by hand or with the clustering of section 4.4.
3. **Mark non-respondents as missing, not tie-less.** Treating unobserved ties as zero is "probably the most-used
   approach, often by default" (dlib.si study, via search summary); non-respondents' incoming nominations are still
   observed and reconstruction methods use them (Huisman and Steglich). The choice changes every centrality.
4. **Check:** response rate, nominations outside the roster, self-nominations.

**Egocentric branch (many unconnected personal networks).**

1. **Collect** in Network Canvas or Qualtrics: each ego names up to N alters, describes them, and says which know
   each other.
2. **Export.** Network Canvas gives "either a GraphML file or a directory of CSV files"; `nc_read` returns ego,
   alter and alter-alter tables, one edgelist per tie type; merging fails when a variable is numeric in one interview
   and text in another (`nc_merge` works around it). Qualtrics: drop two header rows, add an ego id, run
   `onefile_to_egor(...)`, which reads alter-alter questions by position, then drop blank alter slots (egor article).
3. **Load as a set** keyed by ego id; `ego_netwrite` treats each as independent and has no tie weights.
4. **Analyze** per-ego size, density, composition and diversity across hundreds of egos, joined to the ego table.

### 4.12 Query or connection as import (graph databases, endpoints, repositories)

Sources: graph-database-query-and-expand-exploration.md, knowledge-graph-engineers-and-graphrag.md,
[Linkurious query templates](https://doc.linkurious.com/user-manual/3.1/query-templates),
[stringApp exercises](https://jensenlab.org/training/stringapp/), [NDEx](https://www.ndexbio.org/).

1. **Connect** to a database (Neo4j, Neptune, Memgraph), a SPARQL endpoint or a repository (NDEx, STRING, Zenodo,
   figshare, REST).
2. **Query:** Cypher, Gremlin or SPARQL; a Bloom search phrase; a Linkurious template ("a mix of code ... and
   placeholders for variables"); a gene list typed into stringApp.
3. **Cap the result.** Neo4j Browser draws at most 1,000 nodes and 100 neighbors per expand, and tabs freeze at
   1,000 (graph-database document); the view can hide how much the query returned.
4. **Expand later** with the cap per expand, and **refresh** next week with stable ids so positions and notes
   survive. An NDEx DOI does the opposite: it freezes a published network.

graph-io already has source modules for cypher, gremlin, sparql, ndex, rest, s3, url, figshare, zenodo and github.

### 4.13 Document collection to entity graph (journalism, OSINT, GraphRAG)

Sources: [ftm-analyze NER](https://darc.li/docs/ftm-analyze/ner/), [FollowTheMoney graphs](https://followthemoney.tech/docs/graphs),
[Aleph export](https://docs.aleph.occrp.org/developers/how-to/data/export-network-graphs),
[GraphRAG outputs](https://microsoft.github.io/graphrag/index/outputs/).

1. **Upload documents** into Aleph or Datashare; named-entity recognition produces `Mention` entities "resolved into
   actual Entities ... during cross-referencing", which small instances may never do; ftm-analyze emits resolved
   entities with "the source document as proof".
2. **Cross-reference** against registries and sanctions lists; unresolved mentions stay unlinked.
3. **Export:** `ftm export-gexf` for Gephi, `ftm export-cypher` for Neo4j; property values become edges, and
   `Ownership` or `Membership` "contract ... and turn into an edge". GraphRAG writes Parquet `entities` and
   `relationships` with `text_unit_ids` back to the source chunks.
4. **Check** counts by type, unresolved mentions, near-duplicates, and that every edge leads back to a document.

### 4.14 Relational tables to a graph, and the shared-identifier decision

Sources: [Neo4j relational to graph](https://neo4j.com/docs/getting-started/data-modeling/relational-to-graph-modeling/),
[Neo4j first-party fraud](https://neo4j.com/blog/fraud-detection/first-party-bank-fraud-detection-graph-databases/),
[PyGraphistry hypergraph](https://pygraphistry.readthedocs.io/en/0.52.1/api/hyper.html).

1. **Entity tables become labels**, rows nodes, columns properties; "Foreign keys ... are transformed into
   relationships" and "Join tables ... become relationships" with their columns as properties.
2. **Keep business keys**, drop technical ones, add uniqueness constraints.
3. **Decide what a shared attribute is.** A phone, device or address used by several accounts can be its own node
   (keeps which identifier is shared; fraud rings share "a subset of legitimate contact information") or a direct
   account-to-account link with a count (smaller; what a person-to-person view needs). Graphistry's hypergraph does
   the first by default and the second with `direct=True`.
4. **Load nodes, then relationships**; check counts per label and type against the tables.

### 4.15 Time and location columns

Sources: [Gephi Import Dynamic Data](http://docs.gephi.org/desktop/User_Manual/Import_Dynamic_Data/),
[Gephi wiki](https://github.com/gephi/gephi/wiki/How-to-import-dynamic-network),
[Launchpad bug 659017](https://bugs.launchpad.net/bugs/659017),
[Launchpad question 198168](https://answers.launchpad.net/gephi/+question/198168), law-enforcement-and-intelligence-analysts.md,
temporal-and-dynamic-networks.md.

**Time.**

1. **Choose timestamps or intervals.** Gephi supports both, but "These two time representations cannot be mixed within
   the same graph."
2. **Parse the format.** Gephi accepts yyyy-mm-dd and ISO 8601 "with optional timezone"; interval cells use a quoted
   bracket syntax such as `<[1.0, 2.0]>`, with "Infinity" for an open end (Launchpad question).
3. **Or merge columns.** Data Laboratory > Merge Columns > "Create time interval" from start and end columns.
4. **Check it took effect.** An imported interval column was once ignored by the timeline (fixed in 0.7); unparsed
   dates become nulls (Gephi CSV manual) and silently drop from the timeline.

**Location.**

1. **Find the place column:** latitude and longitude, a cell-site id, an address or a place name.
2. **Join or geocode.** Call records join the carrier's cell-site list on cell id and sector; i2's map takes
   coordinates only (law-enforcement document); place names need a gazetteer.
3. **Count what did not place** before drawing a map.

### 4.16 Multilayer and multiplex data (several tie types, modalities, sites or times among the same nodes)

Sources: [muxViz README](https://github.com/manlius/muxViz/blob/master/gui-old/README.md),
[De Domenico, Porter, Arenas 2015](https://arxiv.org/html/1405.0843v2), [emln guide](https://ecological-complexity-lab.github.io/emln_package/multilayer.html),
[emln reference](https://cran.r-project.org/web/packages/emln/refman/emln.html), [multinet IO](https://search.r-project.org/CRAN/refmans/multinet/html/IO.html),
[pymnet](https://github.com/mnets/pymnet), [McGee et al. survey](https://ar5iv.arxiv.org/html/1902.06815).

A multiplex network has one node set and several edge sets (advice, friendship and trust among the same employees); a
multilayer network adds edges between layers, usually a node tied to its own copy elsewhere (a species in two sites, a
brain region in two time windows). Who brings it: survey SNA and ONA (one edge set per question;
organizational-network-analysis-people-analytics.md 4.4), law enforcement (criminal, drugs and social link types;
eight resource-exchange layers with nearly half the nodes in several: law-enforcement-and-intelligence-analysts.md
5.8), connectomics (structural and functional layers, frequency bands, time windows), ecology (sites, seasons,
interaction types) and network science.

**Encodings in source files.**

| Encoding                                             | Who                                                                                                                                            | Evidence                                                   |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| One edge list or matrix per layer, shared node ids   | ONA per question (Polinode, Kumu connection types); ecology `frame2webs`, one matrix per site; connectomics, one matrix per modality or window | ONA, ecology, connectomics documents                       |
| One edge table with a layer column                   | Cytoscape Interaction Type (4.2); multinet edge lines "actor, actor, layer"; pymnet `net["Alice","Bob","Friends"] = 1`                         | multinet IO, pymnet                                        |
| Per-layer edge lists tied by a configuration file    | muxViz, one line per layer: "path_layer_X;label_layer_X;layout_layer_X"                                                                        | muxViz README                                              |
| Extended edge list: node, layer, node, layer, weight | muxViz ("1 1 2 1 0.5"); emln `layer_from node_from layer_to node_to weight` for interlayer links                                               | muxViz README, emln reference                              |
| Supra-adjacency matrix                               | Neuroscience, where it is "used most frequently"                                                                                               | [Neuroimaging review](https://arxiv.org/html/2501.19024v1) |

Interlayer links are an analytic choice: emln's examples tie a pollinator to itself across 12 patches (2,657
interlayer links), tie a plant across time periods, or use none for a "node-aligned multiplex" (106 species, 3
interaction layers, 4,623 links); directed interlayer "links should go both ways" (emln guide). Brain time windows
tie each region to itself with a coupling weight omega that is swept (connectomics Workflow 11).

**Import paths.**

1. **muxViz:** edge-colored (configuration file plus one edge list per layer) or not (extended edge list, layer-info
   file, mandatory node layout file). Ids must be sequential integers unless the label option is checked, and then a
   layout file must list every label.
2. **emln:** `create_multilayer_network(list_of_layers, interlayer_links, layer_attributes, bipartite, directed)`;
   state-node attributes keyed by layer and node; `get_igraph()` returns one igraph per layer and drops interlayer
   links.
3. **multinet:** `#LAYERS` (each directed or undirected) and `#EDGES` sections; `#TYPE multilayer` once interlayer
   edges exist; `read_ml(..., aligned = TRUE)` puts every actor in every layer.
4. **Gephi:** no layer model; a blueprint calls "attributes to qualify edges" the workaround, and a 0.9.1 user saw
   parallel GML edges merged with weight 2 ([blueprint](https://blueprints.launchpad.net/gephi/+spec/parallel-edges),
   [rgexf issue](https://bitbucket.org/gvegayon/rgexf/issues/23/gephi-sees-multiple-edges-between-nodes-as)). GEXF
   1.3 added an edge `kind` for parallel edges ([GEXF history](https://gephi.org/gexf/history.html)). The merge
   strategy of 4.1 silently fuses layers that share a pair.
5. **Cytoscape, igraph:** the layer is an edge attribute; users filter or subgraph per layer. No source found for a
   Cytoscape app in routine multilayer use.

**What they report.** Per-layer size, density, components and centrality, then the union (law enforcement; Montagna's
Meetings and Phone Calls merged with weights summed). Overlap: SNA multiplexity, pairs tied in both relations over
pairs, or a -1 to +1 coefficient tested by permutation ([UNC handout](https://www.cpc.unc.edu/projects/nangrong/socnet/multiplex.pdf));
muxViz mean edge overlap and layer degree correlations. Across layers: overlapping degree and the multiplex
participation coefficient (neuroimaging review); one study built 68-region diffusion and MEG layers at 22% density
and compared the coefficient by age ([Commun. Biol. 2024](https://pmc.ncbi.nlm.nih.gov/articles/PMC10902297)).
Versatility ranks nodes on the full multilayer structure because per-layer or aggregate centrality "can lead to
misleading results" ([De Domenico et al. 2015](https://www.nature.com/articles/ncomms7868)). Layer-set structure:
reducibility, multilayer modularity with omega and gamma sweeps, flexibility (network-scientists document Workflow J).

**How they draw it.** Translucent parallel planes in 3D (muxViz, Arena3D, emln's MiRA viewer); small multiples
(bipartiteD3 site facets); one graph with edges colored by layer (muxViz edge-colored mode; shipping modes in
maritime flows); and matrices, "more readable than node-link diagrams" for large or dense graphs except path finding
(McGee et al.). muxViz adds the summed aggregate and an annular plot of per-layer node descriptors; positions are per
layer or shared from one layer or the aggregate (De Domenico et al.).

**Sizes and readability.** Few layers: 2 to 3 questions in ONA surveys, 2 in Montagna (about 100 nodes per layer),
2 to 3 in muxViz's biology examples, 3 in Kefi, 8 in Bright et al., 12 patches in Gilarranz; brain time-window
networks have one layer per window over 68 to 400 regions. A VR study of 3- and 7-layer networks found no overall
winner among 2D, 2.5D and 3D ([Feyer et al. 2023](https://arxiv.org/abs/2307.10674)); McGee et al. found no study
showing 3D usability gains outside stereo viewing. No source found for a layer or node count at which a stacked view
stops being readable.

## 5. Data

**Input shapes people actually have.**

| Shape                                                                                                              | Who                                                                                                                | What has to happen                                                                               |
| ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| Separate node and edge tables                                                                                      | Tutorials, Kumu, Polinode, Gephi                                                                                   | Ids must match; direction and duplicates decided                                                 |
| Edge list only                                                                                                     | Most scraped and exported data                                                                                     | Nodes created from endpoints ("Create missing nodes")                                            |
| One row per event                                                                                                  | Calls, emails, transactions, logs, forum posts                                                                     | Aggregate or keep multi-edges; join pointer columns                                              |
| One row per record with multi-value cell                                                                           | DH letters, papers, organizations, tags                                                                            | Split to rows; two-mode or co-occurrence                                                         |
| Wide survey row (respondent, friend1..friend5)                                                                     | SNA rosters                                                                                                        | Wide to long; name to roster id; non-respondents marked missing                                  |
| Egocentric ego, alter and alter-alter files                                                                        | Personal-network surveys (Network Canvas, Qualtrics plus egor)                                                     | Load as many small networks keyed by ego id                                                      |
| Relational tables with foreign keys                                                                                | Fraud, AML, enterprise data                                                                                        | Tables to labels, keys and join tables to relationships; shared identifiers as nodes or links    |
| Query result from a database, endpoint or repository                                                               | Graph-database, knowledge-graph and biology users                                                                  | Capped query, expand, refresh                                                                    |
| Document collection -> extracted entities (NER or LLM) -> typed entity graph with provenance                       | Journalists, OSINT, GraphRAG engineers                                                                             | Resolve mentions; keep the source document on each node and edge                                 |
| Stack of matrices, one per subject                                                                                 | Network neuroscience                                                                                               | Threshold each (absolute or proportional) and analyze as a batch                                 |
| Layered: one file or matrix per layer, a layer column, or an extended edge list (node, layer, node, layer, weight) | SNA and ONA multi-question surveys, connectomics modalities and windows, ecology sites and seasons, investigations | Keep layers distinct; declare interlayer links; per-layer and cross-layer metrics (section 4.16) |
| Adjacency list (node, neighbors...)                                                                                | Kumu To cells, NetworkX, Gephi CSV                                                                                 | Expand                                                                                           |
| Adjacency or incidence matrix                                                                                      | UCINET users, Excel grids                                                                                          | Convert or read as matrix; one edge property only in yEd                                         |
| Similarity or distance matrix                                                                                      | Biology, epidemiology, psychology                                                                                  | Threshold, symmetrize                                                                            |
| List of ids without edges                                                                                          | Gene lists, watchlists, seed accounts                                                                              | Query a database for edges                                                                       |
| Bibliographic records                                                                                              | WoS, Scopus, OpenAlex                                                                                              | Parse fields, thesaurus, counting method                                                         |
| Domain interchange files                                                                                           | MITAB, KGML, BioPAX, SharpHound JSON, STIX bundles, RDF                                                            | Format-specific reader                                                                           |

**Formats by population and gaps against Graphty.** graph-io currently reads CSV/TSV (edge, node and adjacency-list
tables), XLSX, JSON (several dialects including NetworkX adjacency_data), GraphML, GEXF, GML, DOT, Pajek, SIF, XGMML,
CX, CX2, OBO, Cytoscape sessions (.cys) and Neo4j CSV. Formats users bring that are not on that list:

| Format                                                                           | Population                   | Evidence                                                                                              |
| -------------------------------------------------------------------------------- | ---------------------------- | ----------------------------------------------------------------------------------------------------- |
| PSI-MITAB 2.5-2.7                                                                | Interaction biologists       | [MITAB 2.6 spec](https://psicquic.github.io/MITAB26Format.html)                                       |
| KGML                                                                             | Pathway biologists           | [KEGGscape](https://keggscape.readthedocs.io/)                                                        |
| BioPAX, SBML                                                                     | Pathway modelers             | [Cytoscape readers](https://manual.cytoscape.org/en/3.10.3/Supported_Network_File_Formats.html)       |
| UCINET DL (edgelist1, nodelist1/2, fullmatrix)                                   | Academic SNA                 | [Gephi DL reader](https://docs.gephi.org/desktop/User_Manual/Import/UCINET_DL_Format)                 |
| Delimited adjacency or incidence matrix                                          | SNA, psychology, Excel users | yEd, Kumu FAQ, adj2gephilab                                                                           |
| Pairwise distance CSV (tn93)                                                     | Molecular epidemiology       | AUTO-TUNE commands                                                                                    |
| WoS tab-delimited, Scopus CSV, BibTeX, RIS                                       | Bibliometrics                | VOSviewer, bibliometrix                                                                               |
| RDF (Turtle, N-Triples), SPARQL results                                          | Knowledge-graph users        | [neosemantics](https://neo4j.com/labs/neosemantics/tutorial/) needs a URI constraint and config first |
| SharpHound/AzureHound JSON zip                                                   | AD security                  | BloodHound file ingest                                                                                |
| STIX 2.1 bundles                                                                 | Threat intelligence          | [OASIS visualizer](https://github.com/oasis-open/cti-stix-visualization)                              |
| FollowTheMoney JSON lines                                                        | Journalists, OSINT           | [FollowTheMoney graphs](https://followthemoney.tech/docs/graphs) (section 4.13)                       |
| GraphRAG Parquet tables (entities, relationships)                                | GraphRAG engineers           | [GraphRAG outputs](https://microsoft.github.io/graphrag/index/outputs/)                               |
| Egocentric CSV sets (Network Canvas)                                             | Personal-network researchers | [nc_read](https://cran.r-project.org/web/packages/ideanet/vignettes/nc_read.html) (section 4.11)      |
| PAOHvis hypergraph CSV                                                           | DH event data                | [PAOHvis](https://aviz.fr/Research/paohvis)                                                           |
| muxViz configuration plus layer files; extended edge lists; multinet text format | Multilayer researchers       | Section 4.16                                                                                          |
| Vendor case files (.anb/.anx, .mtgx)                                             | Investigators                | No public spec found                                                                                  |

**Typical sizes.** Course and DH networks: 19 to a few hundred nodes (Toronto 19/31; Quaker 119/174; PAOHvis 50-500).
NodeXL sets: up to 200,000 edges, bounded by RAM. Call records: up to 100,000 rows per batch. SNAP email-Enron: 36,692
nodes and 183,831 edges from about half a million emails. Co-expression: tens of thousands of genes before
thresholding. Multilayer sets: 2 to 12 layers (section 4.16).

**Identifier problems.** Gene symbols converted to dates; numeric ids read as numbers on one side and strings on the
other (Cytoscape `shared name`); case and whitespace differences (igraph error threads); name variants needing
thesauri or clustering; phone and address formats (i2); duplicate node ids where Kumu keeps "the row furthest down";
re-imports creating duplicate connections unless connections carry ids
([Kumu FAQ](https://docs.kumu.io/frequently-asked-questions/how-do-i-avoid-duplicating-data)); in i2 repositories,
duplicates land in a "Duplicate Items" set for manual merge (IBM item matching).

**Properties decided at import.** Directed (Gephi CSV default), undirected (Cytoscape Analyzer default), mixed
(per-edge Type in Gephi); weighted from a column, from a count of duplicates, or by formula; multigraph kept or
merged; multiplex or multilayer from a layer column or separate files (section 4.16); bipartite marked by a type attribute; temporal from start and end columns or event times, and geographic from
coordinates, cell sites or addresses (both in section 4.15); hierarchical from group columns (yEd Group Node IDs).

**Sensitivity.** Call records and bank data are legally controlled and worked offline; Neo4j's Data Importer stresses
that data "will not leave your computer, except to be imported" (GraphAcademy). A browser tool that never uploads
the file matters to these users.

## 6. Analysis methods at import time

The integrity checks, transformations and first descriptors are the steps of sections 4.1 to 4.16. Validation habits
on top of them: re-import a small hand-checked subset; compare counts with the source system; review merge candidates
by hand (OpenRefine, i2 Duplicate Items, stringApp ambiguity dialog); document thresholds (AUTO-TUNE exists because
thresholds were chosen by default rather than by data).

## 7. Outputs and collaboration

- **What leaves the import step:** a cleaned node table and edge table (often the deliverable for the next person), a
  saved project file, a mapping or specification for the next file, a thesaurus, and notes on dropped rows.
- **Reproducibility:** scripted pipelines (pandas, R, py4cytoscape) are the reproducible path; GUI imports leave no
  record of the separator, merge strategy or direction chosen. No source found for a desktop tool that exports an
  import log.
- **Hand-offs:** wrangler to analyst (files); analyst to prosecutor (every link traces to a record row or document).

## 8. Tools landscape and pain points

Other tools' strengths and pains are in the workflow that uses them (section 4).

| Tool                           | Import strength                                                                          | Documented pain                                                                                                           |
| ------------------------------ | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Gephi                          | Spreadsheet wizard with types, merge strategy, append                                    | Directed default; create-missing-nodes duplicates; time columns                                                           |
| Cytoscape                      | Column roles, list types, key-column joins, public databases                             | Key type mismatch; first-column default key; attribute overwrite; one sheet at a time                                     |
| yEd                            | Excel matrix, edge list, node list, groups                                               | No adjacency lists; one edge property for matrices                                                                        |
| Kumu                           | Templates; pipe multi-values; label or id matching                                       | Matrices need conversion; .xls rejected; non-UTF-8 garbles                                                                |
| i2 Analyst's Notebook          | Reusable specifications; column actions; identity matching                               | Spec per layout; blank used range OOM; 255-char truncation; gated docs                                                    |
| Maltego                        | Connectivity patterns; saved mappings; sampling                                          | File import not in the browser edition ([Maltego](https://support.maltego.com/en/support/solutions/articles/15000061789)) |
| Neo4j                          | LOAD CSV, Data Importer, admin import                                                    | Constraints-first; delimiter and quoting errors; import directory restriction                                             |
| muxViz, emln, multinet, pymnet | Layer files, extended edge lists, interlayer links, multilayer metrics and stacked views | R or Python only; muxViz needs integer ids or a layout file                                                               |

## 9. Requirements implied

| #   | Requirement                                                                                                                                                                                                                                                                                                                                                  | Priority | Covered in design/designloom?                                    |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- | ---------------------------------------------------------------- |
| 1   | Import report: rows read and skipped (with reasons), nodes, edges, endpoints created, duplicates merged, self-loops, reciprocal pairs collapsed                                                                                                                                                                                                              | Must     | Partial: W18 lists issues, not counts                            |
| 2   | Explicit direction choice shown at import with the default named, and per-edge direction from a column                                                                                                                                                                                                                                                       | Must     | Partial: data-import has a toggle; per-edge Type not stated      |
| 3   | Parallel-edge policy choice: keep as multi-edges, merge with count, sum, average, min, max, first, last                                                                                                                                                                                                                                                      | Must     | Gap                                                              |
| 4   | Endpoint matching between node and edge tables with a list of unmatched ids, and a choice to create or drop them                                                                                                                                                                                                                                             | Must     | Partial: "orphan references" in W18                              |
| 5   | Key type and normalization at match time (string versus number, trim, case)                                                                                                                                                                                                                                                                                  | Must     | Gap                                                              |
| 6   | Multi-value cell splitting with a chosen delimiter, producing edges or a two-mode graph                                                                                                                                                                                                                                                                      | Must     | Gap                                                              |
| 7   | Event table to network: choose endpoint columns, aggregation rule, and keep per-event attributes when not aggregating; hypergraph option                                                                                                                                                                                                                     | Must     | Gap                                                              |
| 8   | Two-mode load (type column) and projection with weighting choice, keeping the original                                                                                                                                                                                                                                                                       | Must     | Gap outside W16 and the fraud doc                                |
| 9   | Matrix import (adjacency, incidence, similarity, distance) with symmetrize, absolute and proportional thresholds, edge count and density previewed; a stack of matrices as a set                                                                                                                                                                             | Must     | Gap                                                              |
| 10  | Save, name, share and re-apply an import mapping; warn when a file does not fit                                                                                                                                                                                                                                                                              | Should   | Gap                                                              |
| 11  | Identifier safety: never coerce SEPT2-like strings to dates; show type inference and let the user override                                                                                                                                                                                                                                                   | Must     | Partial                                                          |
| 12  | Near-duplicate node detection (fingerprint, n-gram, phonetic) with a review-and-merge step                                                                                                                                                                                                                                                                   | Should   | Partial: node-merging exists, detection does not                 |
| 13  | First-look panel: counts, density, average degree, components with giant share, isolates, self-loops, degree list, diameter on giant component                                                                                                                                                                                                               | Must     | Mostly covered by W01 capabilities                               |
| 14  | Before-load size check with options (sample, filter, aggregate)                                                                                                                                                                                                                                                                                              | Must     | Covered by the corrected data-import requirement                 |
| 15  | Readers for PSI-MITAB, KGML, UCINET DL, delimited matrices, WoS/Scopus/BibTeX/RIS, RDF, SharpHound JSON, STIX bundles                                                                                                                                                                                                                                        | Should   | Gap                                                              |
| 16  | An exportable import log (settings and counts) for reproducibility                                                                                                                                                                                                                                                                                           | Should   | Gap                                                              |
| 17  | Local-only processing statement for sensitive files                                                                                                                                                                                                                                                                                                          | Should   | Gap                                                              |
| 18  | Many ego networks keyed by ego id as one collection, browsable singly and comparable                                                                                                                                                                                                                                                                         | Should   | Gap                                                              |
| 19  | A missing-respondent flag that keeps "did not answer" distinct from "no tie" through import and metrics                                                                                                                                                                                                                                                      | Must     | Gap                                                              |
| 20  | Remote sources: credentials kept locally, result cap with the count shown before loading, expand later, refresh with stable ids                                                                                                                                                                                                                              | Must     | Partial: graph-io source modules; no workflow                    |
| 21  | Keep a source-document reference on every node and edge; read FollowTheMoney entity streams and GraphRAG tables                                                                                                                                                                                                                                              | Should   | Gap                                                              |
| 22  | Relational mapping where a column can be declared a shared-entity node (phone, device, address), with the option to collapse it into direct weighted links                                                                                                                                                                                                   | Should   | Gap                                                              |
| 23  | Time columns: timestamp or interval, format parsing, time zone, and a count and list of rows that failed to parse                                                                                                                                                                                                                                            | Must     | Gap (see temporal-and-dynamic-networks.md)                       |
| 24  | Location columns: latitude/longitude or place name, geocoding, and a count of rows that did not place                                                                                                                                                                                                                                                        | Should   | Gap                                                              |
| 25  | Layers as data: import one file per layer, a layer column, or an extended edge list; nodes present in several layers; optional interlayer links with weights; never merge edges across layers silently; per-layer and cross-layer metrics (overlap, overlapping degree, participation, versatility); stacked, side-by-side, edge-colored and flattened views | Should   | Gap (see network-scientists-and-analysis-method-validity.md R28) |

**Corrections to existing records.**

- W01: the 1-5 minute phase timings and the 15-minute target have no source; replace with the evidenced sequence in
  section 4.9 and mark timings as unvalidated. Add self-loops, parallel edges and reciprocal-pair collapse to the
  information needs, and the giant-component diameter rule.
- W18: add the decisions tutorials force (direction default, merge strategy, create missing nodes, append versus new,
  key type, layers), the input shapes of section 5, saved mappings, and the attribute-overwrite and one-sheet pitfalls.
- data-import capability: CSV support is described as edge lists only; users also bring event tables, multi-value
  cells, roster and egocentric survey files, relational tables, matrix stacks, layered (multiplex) files,
  document-derived entities and live queries (sections 4.3 to 4.16).

## 10. Sources

Every source is linked inline at the claim it supports; sibling documents named in the text hold their own source lists.
