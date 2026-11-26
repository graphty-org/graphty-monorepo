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
[PAOHvis](https://aviz.saclay.inria.fr/Research/paohvis), [bibnets](https://mirror.las.iastate.edu/CRAN/web/packages/bibnets/bibnets.pdf).

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

**What the egocentric export files look like.** These are the files a personal-network researcher would drop on a
graph tool, and none of them is a single graph:

- **Network Canvas CSV:** one set of files per interview session: `caseID_sessionUUID_ego.csv` (one row per
  participant), `caseID_sessionUUID_attributeList_<nodeType>.csv` (one row per alter, one file per node type) and
  `caseID_sessionUUID_edgeList_<edgeType>.csv` (one row per alter-alter tie, one file per edge type; an interview with
  no ties still gets a header-only file). Rows link by `networkCanvasEgoUUID`; edges name their alters by
  `networkCanvasSourceUUID` and `networkCanvasTargetUUID`, and also by `from` and `to`, which hold a `nodeID` that
  "belongs to a different alter in each interview", so only the UUIDs can be used to combine interviews
  ([Network Canvas data export](https://documentation.networkcanvas.com/en/desktop/key-concepts/data-export)).
- **Network Canvas GraphML:** one `caseID_sessionUUID.graphml` per session, with ego attributes stored as graph-level
  data and session details as `nc:` attributes on `<graph>`; Interviewer packages the sessions in one `.zip`. An older
  "merge sessions" option wrote one file with a `<graph>` element per session, and the same page warns that "most
  software outside Network Canvas does not support GraphML files with multiple graphs" (same source).
- **egor three-file format:** an ego table, an alter table with an ego id column, and "a global edge list, first column
  is ego ID variable" for alter-alter ties, tied together by `ID.vars` (`egoID`, `alterID`, `Source`, `Target` by
  default); the EgoWeb and openEddi readers are the same shape with other column names
  ([egor source](https://rdrr.io/cran/egor/src/R/read.egonet.three.files.R)).

The import a researcher needs is therefore a zip or folder of many small files grouped by ego id, read into one
collection of ego networks with the ego table joined, and with alter-alter ties kept separate per edge type.

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
[FollowTheMoney documentation](https://followthemoney.tech/docs/),
[GraphRAG outputs](https://microsoft.github.io/graphrag/index/outputs/).

1. **Upload documents** into Aleph or Datashare; named-entity recognition produces `Mention` entities "resolved into
   actual Entities ... during cross-referencing", which small instances may never do; ftm-analyze emits resolved
   entities with "the source document as proof".
2. **Cross-reference** against registries and sanctions lists; unresolved mentions stay unlinked.
3. **Export:** `ftm export-gexf` for Gephi, `ftm export-cypher` for Neo4j; property values become edges, and
   `Ownership` or `Membership` "contract ... and turn into an edge". GraphRAG writes Parquet `entities` and
   `relationships` with `text_unit_ids` back to the source chunks.
4. **Check** counts by type, unresolved mentions, near-duplicates, and that every edge leads back to a document.

**The files investigators bring, and what an export loses.**

- **FollowTheMoney entity streams.** OCCRP's Aleph, the largest platform built on this model, reports 24,000+ users
  ([OCCRP, Aleph Pro announcement](https://occrp.org/en/announcement/occrp-announces-a-new-chapter-for-its-investigative-data-platform-aleph-pro),
  via search summary) and 4.9 billion+ entities (OCCRP 2025 annual report, via
  search summary). An entity is a JSON object with "a unique `id`", a `schema` and `properties` that "are
  multi-valued and values are always strings"; a stream is one entity per line, in `.ftm` or `.ijson` files, with the
  id first so a plain sort orders it ([FollowTheMoney documentation](https://followthemoney.tech/docs/)). Links are
  properties of type `entity` holding another entity's id (a Passport's `holder`); a relationship with dates or a
  percentage is its own entity (`Ownership` with `owner` and `asset`). Every `Thing` can carry `proof` ("Source
  document", an entity reference), `sourceUrl` and `publisher`
  ([Thing schema](https://followthemoney.tech/explorer/schemata/Thing/)), and statement-level data keeps per-value
  dataset and first-seen and last-seen dates ([OpenSanctions statements](https://www.opensanctions.org/docs/statements/)).
- **What the GEXF and Cypher exports lose.** In `ftm export-gexf` and `export-cypher`, a linked entity's property
  becomes "an edge with no attributes attached to it", which the FollowTheMoney authors call a weakness because
  relationships "always have metadata"; only `Membership` and `Ownership` contract into edges, "a special shortcut,
  not the normal case" ([FollowTheMoney graphs](https://followthemoney.tech/docs/graphs)). Reading the stream itself,
  not an export, is the only way to keep an ownership's dates and percentage on the edge and the `proof` document on
  every node and edge.
- **Maltego graphs.** Maltego exports GraphML in three variants, "one used by Maltego, and two for yEd and Gephi",
  because "the GraphML format is not standardized" and there is "no agreed way to store metadata within the XML file"
  ([Maltego, Export Graph as XML](https://support.maltego.com/en/support/solutions/articles/15000019396-export-graph-as-xml)).
  The native `.mtgx` file holds one or more graphs plus entity type definitions; each node carries its type
  (`maltego.Domain`, `maltego.URL`) and typed fields, read into a NetworkX `MultiDiGraph` by the third-party mtgx2nx
  ([mtgx2nx README](https://github.com/NetwarSystem/mtgx2nx/blob/main/README.md)). No public specification of `.mtgx`
  was found. A generic GraphML reader sees Maltego's entity type and fields only as opaque keys.

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
   layout file must list every label. The configuration line is "path_layer_X;label_layer_X;layout_layer_X" per
   layer (only the path is mandatory), or a single "path_multilayer;path_to_layers_info;path_to_layers_layout" with
   all three mandatory; the extended edge list "allows to specify all possible types of links, intra- and
   inter-layer"; the layout file needs `nodeID` and may add `nodeLabel`, `nodeX`, `nodeY`, `nodeLat` and `nodeLong`,
   and the layer-info file needs `layerID` and may add `layerLabel` (muxViz README).

    What all three formats share, and a single-layer reader loses: a layer is named per edge, a node can exist in
    some layers and not others (a "state node"), and interlayer links are edges between (node, layer) pairs, not
    between nodes. A plain edge-list reader given "1 1 2 1 0.5" would take node 1 and layer 1 as the two endpoints.

2. **emln:** `create_multilayer_network(list_of_layers, interlayer_links, layer_attributes, bipartite, directed)`;
   state-node attributes keyed by layer and node; `get_igraph()` returns one igraph per layer and drops interlayer
   links.
3. **multinet:** `#LAYERS` (each directed or undirected) and `#EDGES` sections; `#TYPE multilayer` once interlayer
   edges exist; `read_ml(..., aligned = TRUE)` puts every actor in every layer. An intralayer edge line is
   "ActorName1,ActorName2,LayerName1,..." and an interlayer one "ActorName1,LayerName1,ActorName2,LayerName2,...";
   `#ACTORS` and `#VERTICES` sections hold actor attributes and per-layer node attributes
   ([multinet IO](https://search.r-project.org/CRAN/refmans/multinet/html/IO.html)).
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

**Formats by population and gaps against Graphty.** graph-io reads 15 formats, each a subpath of the package:
CSV and TSV (edge tables, node tables and adjacency lists), XLSX and XLSM (one sheet per import, read by the CSV rules;
`listGraphs()` lists the sheets, and with no sheet named the first is read with a `W_XLSX_SHEET_CHOSEN` warning),
JSON (node-link, D3, JGF, Cytoscape.js, Graphology, vis, OBO Graphs, plus NetworkX adjacency_data and tree_data on
read), GraphML, GEXF, GML, DOT, Pajek, SIF, XGMML, CX, CX2, OBO, Cytoscape sessions (.cys) and Neo4j CSV
(graph-io/src/formats). Its source modules connect to Cypher, Gremlin and SPARQL endpoints, NDEx, Zenodo, figshare,
GitHub, S3, REST and plain URLs (graph-io/src/sources). A two-sheet workbook (a node sheet and an edge sheet, the
shape of section 4.1) therefore takes two imports and a join; no single call reads both sheets as one graph.

Formats users bring that are not on that list, and the planned Designloom capability that would own each:

| Format                                                                           | Population                   | Evidence                                                                                                                   | Planned capability                                   |
| -------------------------------------------------------------------------------- | ---------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| PSI-MITAB 2.5-2.7                                                                | Interaction biologists       | [MITAB 2.6 spec](https://psicquic.github.io/MITAB26Format.html)                                                            | biological-network-formats                           |
| KGML                                                                             | Pathway biologists           | [KEGGscape](https://keggscape.readthedocs.io/)                                                                             | biological-network-formats                           |
| BioPAX, SBML                                                                     | Pathway modelers             | [Cytoscape readers](https://manual.cytoscape.org/en/3.10.3/Supported_Network_File_Formats.html)                            | biological-network-formats                           |
| UCINET DL (edgelist1, nodelist1/2, fullmatrix)                                   | Academic SNA                 | [Gephi DL reader](https://docs.gephi.org/desktop/User_Manual/Import/UCINET_DL_Format)                                      | survey-network-import                                |
| Delimited adjacency or incidence matrix                                          | SNA, psychology, Excel users | yEd, Kumu FAQ, adj2gephilab                                                                                                | matrix-import                                        |
| Pairwise distance CSV (tn93)                                                     | Molecular epidemiology       | AUTO-TUNE commands                                                                                                         | distance-threshold-network                           |
| WoS tab-delimited, Scopus CSV, BibTeX, RIS                                       | Bibliometrics                | VOSviewer, bibliometrix                                                                                                    | bibliographic-record-import                          |
| RDF (Turtle, N-Triples), SPARQL results                                          | Knowledge-graph users        | [neosemantics](https://neo4j.com/labs/neosemantics/tutorial/) needs a URI constraint and config first                      | rdf-import                                           |
| SharpHound/AzureHound JSON zip                                                   | AD security                  | BloodHound file ingest                                                                                                     | security-format-import                               |
| STIX 2.1 bundles                                                                 | Threat intelligence          | [OASIS visualizer](https://github.com/oasis-open/cti-stix-visualization)                                                   | security-format-import                               |
| GraphRAG Parquet tables (entities, relationships)                                | GraphRAG engineers           | [GraphRAG outputs](https://microsoft.github.io/graphrag/index/outputs/)                                                    | graphrag-output-import                               |
| FollowTheMoney JSON lines (.ftm, .ijson)                                         | Journalists, OSINT           | [FollowTheMoney documentation](https://followthemoney.tech/docs/) (section 4.13)                                           | None yet (proposed: investigation-format-import)     |
| Maltego .mtgx and Maltego-dialect GraphML                                        | OSINT, law enforcement       | [Maltego export](https://support.maltego.com/en/support/solutions/articles/15000019396-export-graph-as-xml) (section 4.13) | None yet (proposed: investigation-format-import)     |
| Network Canvas CSV or GraphML session sets; egor three-file, EgoWeb, openEddi    | Personal-network researchers | [Network Canvas export](https://documentation.networkcanvas.com/en/desktop/key-concepts/data-export) (section 4.11)        | None yet (proposed: egocentric-survey-import)        |
| PAOHvis hypergraph CSV (edge_id, node_name, time_slot, ...)                      | DH event data                | [PAOHvis](https://aviz.saclay.inria.fr/Research/paohvis)                                                                   | None yet (proposed: dynamic-hypergraph-table-import) |
| muxViz configuration plus layer files; extended edge lists; multinet text format | Multilayer researchers       | Section 4.16                                                                                                               | None yet (proposed: multilayer-format-import)        |
| Vendor case files (.anb/.anx)                                                    | Investigators                | No public spec found                                                                                                       | None                                                 |

**PAOHvis input.** One row per node in a hyperedge: `edge_id`, `node_name`, `time_slot`, then optional
`edge_name_description`, `group_name` (the node's group in that time slot) and `role`; a header line must be all
uppercase or it is read as data, comma or semicolon separators, and "a single formatting error" can stop the load; an
empty time slot needs a placeholder node "_" to appear. The tool is described as "well suited for medium size dynamic
hypergraph networks" ([PAOHvis](https://aviz.saclay.inria.fr/Research/paohvis)). The time slot and per-slot group and
role make it more than a bipartite edge list: the same person can belong to a different group in each slot.

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

| #   | Requirement                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Priority | Covered in design/designloom?                                                                                                              |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Import report: rows read and skipped (with reasons), nodes, edges, endpoints created, duplicates merged, self-loops, reciprocal pairs collapsed                                                                                                                                                                                                                                                                                                                                                | Must     | Partial: W18 lists issues, not counts                                                                                                      |
| 2   | Explicit direction choice shown at import with the default named, and per-edge direction from a column                                                                                                                                                                                                                                                                                                                                                                                         | Must     | Partial: data-import has a toggle; per-edge Type not stated                                                                                |
| 3   | Parallel-edge policy choice: keep as multi-edges, merge with count, sum, average, min, max, first, last                                                                                                                                                                                                                                                                                                                                                                                        | Must     | Gap                                                                                                                                        |
| 4   | Endpoint matching between node and edge tables with a list of unmatched ids, and a choice to create or drop them                                                                                                                                                                                                                                                                                                                                                                               | Must     | Partial: "orphan references" in W18                                                                                                        |
| 5   | Key type and normalization at match time (string versus number, trim, case)                                                                                                                                                                                                                                                                                                                                                                                                                    | Must     | Gap                                                                                                                                        |
| 6   | Multi-value cell splitting with a chosen delimiter, producing edges or a two-mode graph                                                                                                                                                                                                                                                                                                                                                                                                        | Must     | Gap                                                                                                                                        |
| 7   | Event table to network: choose endpoint columns, aggregation rule, and keep per-event attributes when not aggregating; hypergraph option                                                                                                                                                                                                                                                                                                                                                       | Must     | Gap                                                                                                                                        |
| 8   | Two-mode load (type column) and projection with weighting choice, keeping the original                                                                                                                                                                                                                                                                                                                                                                                                         | Must     | Gap outside W16 and the fraud doc                                                                                                          |
| 9   | Matrix import (adjacency, incidence, similarity, distance) with symmetrize, absolute and proportional thresholds, edge count and density previewed; a stack of matrices as a set                                                                                                                                                                                                                                                                                                               | Must     | Gap                                                                                                                                        |
| 10  | Save, name, share and re-apply an import mapping; warn when a file does not fit                                                                                                                                                                                                                                                                                                                                                                                                                | Should   | Gap                                                                                                                                        |
| 11  | Identifier safety: never coerce SEPT2-like strings to dates; show type inference and let the user override                                                                                                                                                                                                                                                                                                                                                                                     | Must     | Partial                                                                                                                                    |
| 12  | Near-duplicate node detection (fingerprint, n-gram, phonetic) with a review-and-merge step                                                                                                                                                                                                                                                                                                                                                                                                     | Should   | Partial: node-merging exists, detection does not                                                                                           |
| 13  | First-look panel: counts, density, average degree, components with giant share, isolates, self-loops, degree list, diameter on giant component                                                                                                                                                                                                                                                                                                                                                 | Must     | Mostly covered by W01 capabilities                                                                                                         |
| 14  | Before-load size check with options (sample, filter, aggregate)                                                                                                                                                                                                                                                                                                                                                                                                                                | Must     | Covered by the corrected data-import requirement                                                                                           |
| 15  | Readers for PSI-MITAB, KGML, UCINET DL, delimited matrices, WoS/Scopus/BibTeX/RIS, RDF, SharpHound JSON, STIX bundles                                                                                                                                                                                                                                                                                                                                                                          | Should   | Planned: biological-network-formats, survey-network-import, matrix-import, bibliographic-record-import, rdf-import, security-format-import |
| 16  | An exportable import log (settings and counts) for reproducibility                                                                                                                                                                                                                                                                                                                                                                                                                             | Should   | Gap                                                                                                                                        |
| 17  | Local-only processing statement for sensitive files                                                                                                                                                                                                                                                                                                                                                                                                                                            | Should   | Gap                                                                                                                                        |
| 18  | Many ego networks keyed by ego id as one collection, browsable singly and comparable                                                                                                                                                                                                                                                                                                                                                                                                           | Should   | Gap                                                                                                                                        |
| 19  | A missing-respondent flag that keeps "did not answer" distinct from "no tie" through import and metrics                                                                                                                                                                                                                                                                                                                                                                                        | Must     | Gap                                                                                                                                        |
| 20  | Remote sources: credentials kept locally, result cap with the count shown before loading, expand later, refresh with stable ids                                                                                                                                                                                                                                                                                                                                                                | Must     | Partial: graph-io source modules; no workflow                                                                                              |
| 21  | Keep a source-document reference on every node and edge; read FollowTheMoney entity streams (interstitial Ownership and Membership as edges with their dates and shares, `proof` kept as the source document), Maltego .mtgx and Maltego GraphML (entity type and fields as typed attributes), and GraphRAG tables                                                                                                                                                                             | Must     | Partial: graphrag-output-import and provenance-tracking; FollowTheMoney and Maltego planned in investigation-format-import                 |
| 22  | Relational mapping where a column can be declared a shared-entity node (phone, device, address), with the option to collapse it into direct weighted links                                                                                                                                                                                                                                                                                                                                     | Should   | Gap                                                                                                                                        |
| 23  | Time columns: timestamp or interval, format parsing, time zone, and a count and list of rows that failed to parse                                                                                                                                                                                                                                                                                                                                                                              | Must     | Gap (see temporal-and-dynamic-networks.md)                                                                                                 |
| 24  | Location columns: latitude/longitude or place name, geocoding, and a count of rows that did not place                                                                                                                                                                                                                                                                                                                                                                                          | Should   | Gap                                                                                                                                        |
| 25  | Layers as data: import one file per layer, a layer column, an extended edge list (node, layer, node, layer, weight), a muxViz configuration file with its layer, layer-info and layout files, or a multinet text file; nodes present in several layers; optional interlayer links with weights; never merge edges across layers silently; per-layer and cross-layer metrics (overlap, overlapping degree, participation, versatility); stacked, side-by-side, edge-colored and flattened views | Should   | Partial: multilayer-networks holds the model, file formats planned in multilayer-format-import                                             |
| 26  | Workbook import: list the sheets, let the user pick a node sheet and an edge sheet from one .xlsx, and read them as one graph                                                                                                                                                                                                                                                                                                                                                                  | Must     | Partial: graph-io lists sheets and reads one per import                                                                                    |
| 27  | Egocentric export sets: read a Network Canvas CSV folder or zip (or its per-session GraphML files) and egor three-file tables into one collection of ego networks keyed by ego UUID, ego table joined, alter-alter ties per edge type                                                                                                                                                                                                                                                          | Should   | Planned: egocentric-survey-import                                                                                                          |
| 28  | PAOHvis hypergraph CSV: rows of hyperedge, node and time slot with per-slot group and role, read as timed hyperedges                                                                                                                                                                                                                                                                                                                                                                           | Could    | Planned: dynamic-hypergraph-table-import                                                                                                   |

**Corrections to existing records.**

- W01: the 1-5 minute phase timings and the 15-minute target have no source; replace with the evidenced sequence in
  section 4.9 and mark timings as unvalidated. Add self-loops, parallel edges and reciprocal-pair collapse to the
  information needs, and the giant-component diameter rule.
- W18: add the decisions tutorials force (direction default, merge strategy, create missing nodes, append versus new,
  key type, layers), the input shapes of section 5, saved mappings, and the attribute-overwrite and one-sheet pitfalls.
- data-import capability: as of this revision the record still describes five formats (CSV edge lists, JSON,
  GraphML, GEXF, GML), detects only those five extensions, carries four numbers with no source, cites a page that
  does not exist (graphty.app/docs) and links to none of the format capabilities that own the rest of what users
  bring. Section 9.1 gives the replacement: the formats it reads itself, the capability that owns each other format
  and the research that marks it Must, a verdict on each number, and a primary source for it and for the 49 other
  capability records that cite the same page.
- data-import capability: CSV support is described as edge lists only; users also bring event tables, multi-value
  cells, roster and egocentric survey files, relational tables, matrix stacks, layered (multiplex) files,
  document-derived entities and live queries (sections 4.3 to 4.16).

### 9.1 The data-import record: formats, numbers and sources

The data-import capability is the hub every import workflow requires (W18 and about 300 others link to it), so an
implementer reads it first. It should say what Graphty reads today, hand every other format to the capability that
owns it, keep only the numbers someone has evidence for, and cite real sources.

**What data-import reads itself.** graph-io's readers, one subpath each (graph-io/src/formats on disk): CSV and TSV
(edge tables, node tables and adjacency lists, any single-character delimiter), XLSX and XLSM (one sheet per import,
sheets listed by `listGraphs()`), JSON (node-link and D3, JGF, Cytoscape.js, Graphology, vis, OBO Graphs, NetworkX
adjacency_data and tree_data), GraphML, GEXF, GML, DOT, Pajek, SIF, XGMML, CX, CX2, OBO, Cytoscape sessions (.cys)
and Neo4j CSV; plus graph-io's sources (Cypher, Gremlin and SPARQL endpoints, NDEx, Zenodo, figshare, GitHub, S3,
REST, plain URLs). Format detection should cover every one of these extensions and fall back to content inspection,
and the "Unsupported format" error should list them, not five. The one gap inside data-import's own scope is a node
sheet and an edge sheet from one workbook read as one graph (requirement 26, Must).

**Which capability owns each other format, and who needs it.** Priorities are the ones each research document gives
in its requirements table; "none" means no capability record exists yet. "planned" means a Designloom capability
record exists but nothing ships; "gap" means the owner exists but this piece is missing from it.

| Format or input shape                                                                                              | Owning capability                                                                                                                                 | Status                      | Priority and evidence                                                                                                                                                                                                                                                                                                                                                                                            |
| ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Node sheet plus edge sheet in one .xlsx                                                                            | data-import                                                                                                                                       | gap                         | Must: this document, requirement 26                                                                                                                                                                                                                                                                                                                                                                              |
| Wide record table with no node file (letters, events)                                                              | table-to-graph-builder, multi-value-split-and-projection                                                                                          | planned                     | Must: digital-humanities-and-historical-networks.md requirements; this document requirements 6 and 8                                                                                                                                                                                                                                                                                                             |
| Event tables (CSV, Excel, XES, XES.gz, MXML, OCEL 2.0)                                                             | event-log-import, event-table-to-graph                                                                                                            | planned                     | Must: process-mining-and-process-maps.md R1 and R2; cybersecurity-graph-work.md requirement 7; this document 7                                                                                                                                                                                                                                                                                                   |
| Time-preserving files (GEXF dynamic, start/end or duration columns, contact files, snapshot folders)               | temporal-data-model-import                                                                                                                        | planned                     | Must: temporal-and-dynamic-networks.md T2                                                                                                                                                                                                                                                                                                                                                                        |
| Adjacency, incidence, similarity and distance matrices                                                             | matrix-import                                                                                                                                     | planned                     | Must: this document requirement 9; systems-and-stakeholder-mapping-civic.md (Must-have, one matrix per relationship type)                                                                                                                                                                                                                                                                                        |
| Matrix stacks (nodes x nodes x windows or subjects)                                                                | matrix-stack-import                                                                                                                               | planned                     | Must: temporal-and-dynamic-networks.md T24; this document requirement 9                                                                                                                                                                                                                                                                                                                                          |
| Node sets, scores and path sets on a base graph (TSV/CSV with gene ids)                                            | node-set-overlay-import                                                                                                                           | planned                     | Must: network-medicine-and-biomedical-knowledge-graphs.md R1                                                                                                                                                                                                                                                                                                                                                     |
| PSI-MITAB, KGML, GPML, BioPAX, SBML, extended SIF                                                                  | biological-network-formats                                                                                                                        | planned                     | Should: this document requirement 15                                                                                                                                                                                                                                                                                                                                                                             |
| Newick, NEXUS, phyloXML, extended Newick                                                                           | tree-import-and-axes                                                                                                                              | planned                     | Must: phylogenetics-and-haplotype-networks.md requirements                                                                                                                                                                                                                                                                                                                                                       |
| PNML and BPMN 2.0 XML process models                                                                               | process-model-notation                                                                                                                            | planned                     | Must: process-mining-and-process-maps.md R12                                                                                                                                                                                                                                                                                                                                                                     |
| dbt manifest, CycloneDX, SPDX, OpenLineage, `npm ls --json`, NetBox, Nx graph JSON                                 | dependency-format-import                                                                                                                          | planned                     | Must: dependency-and-impact-analysis-engineers.md R22 (crawler exports and SysML v2 are Should, R32)                                                                                                                                                                                                                                                                                                             |
| SharpHound and AzureHound zips, OpenGraph JSON, STIX 2.1, MISP JSON, EVTX CSV, Zeek logs                           | security-format-import                                                                                                                            | planned                     | Must ("M"): cybersecurity-graph-work.md requirement 6                                                                                                                                                                                                                                                                                                                                                            |
| WoS, Scopus, Dimensions, Lens, PubMed, RIS, BibTeX, OpenAlex                                                       | bibliographic-record-import                                                                                                                       | planned                     | Should: this document requirement 15                                                                                                                                                                                                                                                                                                                                                                             |
| RDF (Turtle, N-Triples, N-Quads, TriG, JSON-LD, RDF/XML); saved SPARQL and Cypher results                          | rdf-import, query-result-import                                                                                                                   | planned                     | Should: this document requirement 15                                                                                                                                                                                                                                                                                                                                                                             |
| UCINET DL, NetDraw VNA, wide survey rosters                                                                        | survey-network-import                                                                                                                             | planned                     | Must for the missing-respondent flag (requirement 19); the readers are Should (requirement 15)                                                                                                                                                                                                                                                                                                                   |
| GraphRAG Parquet output                                                                                            | graphrag-output-import                                                                                                                            | planned                     | Must: this document requirement 21                                                                                                                                                                                                                                                                                                                                                                               |
| GEDCOM; Markdown note folders; XMind and OPML; DAGitty and BIF; chat exports; load-file recipients; OD flow tables | genealogy-import, note-format-import, outline-import, causal-model-formats, channel-aware-chat-import, delimited-recipient-import, od-flow-import | planned                     | Per their own research documents                                                                                                                                                                                                                                                                                                                                                                                 |
| GraphML with coordinates, GeoJSON and GeoPackage, EPANET .inp, MATPOWER and pandapower, KMZ, CSV with lat/lon      | geospatial-file-io (all of R19, plus shapefile, KML and GeoJSON polygon features)                                                                 | planned                     | Must: supply-chain-and-physical-infrastructure-networks.md R19. One record reads both map features and networks that carry geometry                                                                                                                                                                                                                                                                              |
| Offshore Leaks node and relationship CSVs, Maltego .mtgx and Maltego GraphML, FollowTheMoney JSON lines            | investigation-format-import (FollowTheMoney, Maltego .mtgx and Maltego GraphML); Offshore Leaks CSVs: none                                        | planned; Offshore Leaks gap | Must: investigative-journalism-and-osint.md R6; this document requirement 21. ICIJ ships Offshore Leaks as "several CSV files, one per type of node and one for all the relationships", or as Neo4j dumps ([ICIJ download](https://offshoreleaks.icij.org/pages/database)): a multi-file node-plus-relationship set no record names                                                                              |
| Parquet, Arrow and Feather node and edge tables (files or notebook bytes)                                          | columnar-table-import                                                                                                                             | planned                     | Must: code-first-data-scientists-and-graph-ml.md requirements table                                                                                                                                                                                                                                                                                                                                              |
| Network Canvas session sets, egor three-file tables                                                                | egocentric-survey-import                                                                                                                          | planned                     | Should: this document requirement 27                                                                                                                                                                                                                                                                                                                                                                             |
| muxViz configuration and layer files, multinet text, extended edge lists                                           | multilayer-format-import (readers) over multilayer-networks (the data model)                                                                      | planned                     | Should: this document requirement 25                                                                                                                                                                                                                                                                                                                                                                             |
| GDF and Telepathy edge lists from social media collectors                                                          | GDF: none. Telepathy: data-import (its forward map is a CSV edge list)                                                                            | GDF gap                     | Should: investigative-journalism-and-osint.md R21. GDF is GUESS's two-section text format (`nodedef>` then `edgedef>` with typed columns), still read by Gephi ([Gephi, GDF format](https://docs.gephi.org/desktop/User_Manual/Import/GDF_File_Format)); Telepathy's forward map "creates an edge list" in CSV ([Bellingcat toolkit, Telepathy](https://bellingcat.gitbook.io/toolkit/more/all-tools/telepathy)) |
| Any format not listed                                                                                              | plugin-file-reader-contract                                                                                                                       | planned                     | Must: developers-embedding-and-extending-graph-visualization.md requirements table                                                                                                                                                                                                                                                                                                                               |

Opening such a file and checking what its reader kept is Designloom workflow W1162.

**Still unowned.** Two inputs have no capability record: the Offshore Leaks release (one CSV per node type plus one
relationships CSV, read together as one typed graph) and GDF. Both are multi-section or multi-file node-plus-edge
sets, so one record, a typed node-and-relationship file set reader, would cover them. Everything else in the table has
an owner; the owners are planned, not shipped. Geospatial input has one owner, geospatial-file-io: it reads map
features and joins them to nodes, and also reads the networks that carry geometry that
supply-chain-and-physical-infrastructure-networks.md R19 marks Must (EPANET .inp, MATPOWER and pandapower cases,
GraphML with coordinates).

Cross-cutting capabilities every reader above shares, which data-import should name rather than restate:
import-report (requirement 1), saved-import-mappings (10), local-only-processing (17), progressive-loading and the
size check (14).

**The numbers in data-import, checked.** None of the four has a source. Each is either replaced by a rule a primary
source supports or kept only as a design goal that says so.

| Requirement as written                                                    | Evidence found                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Recommendation                                                                                                                                                                                                                       |
| ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| "Handle files up to 100MB in browser without crashing"                    | No source gives 100 MB. The hard browser ceiling is elsewhere: a V8 string can hold at most 2^29 - 24 characters, about 1 GiB, and Firefox about 2 GiB ([MDN, String length](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/length)); in practice the limit is memory for the parsed graph, which no source measures for Graphty.                                                                                                                                                                                                                                                                                                                                                                                 | Delete. The corrected requirement already on the record (show the size and the measured limit before loading, and offer a way through) replaces it. A limit, once measured on named hardware, is stated as measured.                 |
| "Display progress bar updated at minimum every 500ms for files over 1MB"  | No source gives 500 ms or 1 MB. Nielsen Norman Group ties the kind of feedback to expected duration, not file size: a looped indicator "for actions that take between 2-10 seconds", a percent-done indicator "for longer processes that take 10 or more seconds", and percent-done also for shorter runs that process a series of records ([NN/g, progress indicators](https://www.nngroup.com/articles/progress-indicators/); limits in [NN/g, response times](https://www.nngroup.com/articles/response-times-3-important-limits/)). The article gives no update interval.                                                                                                                                                                              | Replace with: show a looped indicator when a load is expected to take 2 seconds or more and a percent-done indicator (rows or bytes read) when it is expected to take 10 seconds or more. Mark any update interval as a design goal. |
| "Support streaming import for files over 50MB to avoid memory exhaustion" | No source gives 50 MB. Papa Parse, the common browser CSV parser, says streaming "is necessary for large files which would otherwise crash the browser" and reads local files in 10 MB chunks by default ([Papa Parse documentation](https://www.papaparse.com/docs)); browsers expose files as streams ([MDN, Blob.stream()](https://developer.mozilla.org/en-US/docs/Web/API/Blob/stream)).                                                                                                                                                                                                                                                                                                                                                              | Replace with: read files as a stream whatever their size, so there is no threshold to choose. Where a format cannot stream (a whole-document XML parse), say so in the size check.                                                   |
| "Auto-detect file encoding with 95% accuracy for common encodings"        | No source. ICU, the reference library for this, calls detection "at best, an imprecise operation using statistics and heuristics" and wants "at least a few hundred bytes" of mostly one language ([ICU user guide, character set detection](https://unicode-org.github.io/icu/userguide/conversion/detection.html)). The Encoding Standard defines only byte-order-mark sniffing and says new formats "must use the UTF-8 encoding exclusively" ([WHATWG Encoding Standard](https://encoding.spec.whatwg.org/)). graph-io's CSV reader already follows a fixed rule: byte order mark, then a declared encoding, then UTF-8, and bytes that are not UTF-8 and declare nothing are read as windows-1252 with a warning (graph-io/src/formats/csv/index.ts). | Replace with that fixed rule, the warning, and a user override of the encoding. Drop the accuracy figure.                                                                                                                            |
| "Support UTF-8, UTF-16, and ISO-8859-1 file encodings"                    | In the Encoding Standard, the labels "iso-8859-1" and "latin1" both decode as windows-1252, and UTF-16 is two encodings, UTF-16LE and UTF-16BE ([WHATWG Encoding Standard](https://encoding.spec.whatwg.org/)).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Reword as UTF-8, UTF-16LE and UTF-16BE (by byte order mark) and windows-1252 (labels latin1 and iso-8859-1), plus any label the platform's decoder accepts.                                                                          |

**Sources for data-import, and for the 49 other records citing graphty.app/docs.** Every one of these records has a
single source, a "textbook chapter" or a Graphty workflow at https://graphty.app/docs/, which holds no such text. Each
should cite the primary work that defines what it implements. For a record that comes from a user workflow rather than
a published method, the user-research document that holds the workflow's evidence is the source; it carries its own
primary links.

| Capability                                       | Replacement primary source                                                                                                                                                                                                                                                                                          |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| data-import, data-export                         | [GraphML primer](http://graphml.graphdrawing.org/primer/graphml-primer.html), [GEXF](https://gexf.net/), [Gephi CSV format](http://docs.gephi.org/desktop/User_Manual/Import/CSV_Format/), [Cytoscape supported formats](https://manual.cytoscape.org/en/3.10.3/Supported_Network_File_Formats.html); this document |
| data-validation, data-preview                    | This document (sections 4.1, 4.2 and 4.9) and its sources: [Cytoscape, Importing Network From Table](https://cytoscape.org/cytoscape-tutorials/protocols/importing-network-from-table/), [Ziemann et al. 2016](https://doi.org/10.1186/s13059-016-1044-7)                                                           |
| progressive-loading, algorithm-progress          | [Stolper, Perer and Gotz 2014, Progressive Visual Analytics](https://doi.org/10.1109/TVCG.2014.2346574); [NN/g, progress indicators](https://www.nngroup.com/articles/progress-indicators/)                                                                                                                         |
| sample-datasets                                  | [Zachary 1977](https://doi.org/10.1086/jar.33.4.3629752); [SNAP datasets](https://snap.stanford.edu/data/); students-educators-and-first-time-users.md                                                                                                                                                              |
| guided-onboarding                                | students-educators-and-first-time-users.md                                                                                                                                                                                                                                                                          |
| basic-statistics, statistics-panel               | [Newman 2003, The Structure and Function of Complex Networks](https://doi.org/10.1137/S003614450342480)                                                                                                                                                                                                             |
| degree-analysis                                  | [Clauset, Shalizi and Newman 2009, Power-law distributions in empirical data](https://doi.org/10.1137/070710111)                                                                                                                                                                                                    |
| component-analysis                               | [Tarjan 1972, Depth-first search and linear graph algorithms](https://doi.org/10.1137/0201010)                                                                                                                                                                                                                      |
| clustering-coefficient                           | [Watts and Strogatz 1998](https://doi.org/10.1038/30918)                                                                                                                                                                                                                                                            |
| centrality-degree, centrality-closeness          | [Freeman 1978, Centrality in social networks: conceptual clarification](<https://doi.org/10.1016/0378-8733(78)90021-7>)                                                                                                                                                                                             |
| centrality-betweenness                           | [Brandes 2001, A faster algorithm for betweenness centrality](https://doi.org/10.1080/0022250X.2001.9990249)                                                                                                                                                                                                        |
| centrality-eigenvector                           | [Bonacich 1972](https://doi.org/10.1080/0022250X.1972.9989806); [Bonacich 1987, Power and centrality](https://doi.org/10.1086/228631)                                                                                                                                                                               |
| centrality-pagerank                              | [Page, Brin, Motwani and Winograd 1999, The PageRank citation ranking](http://ilpubs.stanford.edu:8090/422/)                                                                                                                                                                                                        |
| community-detection                              | [Blondel et al. 2008, Louvain](https://doi.org/10.1088/1742-5468/2008/10/P10008); [Traag, Waltman and van Eck 2019, Leiden](https://doi.org/10.1038/s41598-019-41695-z)                                                                                                                                             |
| community-profiling                              | [Fortunato 2010, Community detection in graphs](https://doi.org/10.1016/j.physrep.2009.11.002)                                                                                                                                                                                                                      |
| shortest-path                                    | [Dijkstra 1959](https://doi.org/10.1007/BF01386390)                                                                                                                                                                                                                                                                 |
| link-prediction                                  | [Liben-Nowell and Kleinberg 2007](https://doi.org/10.1002/asi.20591)                                                                                                                                                                                                                                                |
| anomaly-detection                                | [Akoglu, Tong and Koutra 2015, Graph based anomaly detection and description](https://doi.org/10.1007/s10618-014-0365-y)                                                                                                                                                                                            |
| temporal-analysis                                | [Holme and Saramaki 2012, Temporal networks](https://doi.org/10.1016/j.physrep.2012.03.001)                                                                                                                                                                                                                         |
| ego-network                                      | [Perry, Pescosolido and Borgatti 2018, Egocentric Network Analysis](https://doi.org/10.1017/9781316443255)                                                                                                                                                                                                          |
| layout-force-directed                            | [Fruchterman and Reingold 1991](https://doi.org/10.1002/spe.4380211102); [Jacomy et al. 2014, ForceAtlas2](https://doi.org/10.1371/journal.pone.0098679)                                                                                                                                                            |
| layout-hierarchical                              | [Sugiyama, Tagawa and Toda 1981](https://doi.org/10.1109/TSMC.1981.4308636)                                                                                                                                                                                                                                         |
| layout-radial                                    | [Yee et al. 2001, Animated exploration of dynamic graphs with radial layout](https://doi.org/10.1109/INFVIS.2001.963279)                                                                                                                                                                                            |
| graph-rendering                                  | [Herman, Melancon and Marshall 2000, Graph visualization and navigation in information visualization](https://doi.org/10.1109/2945.841119)                                                                                                                                                                          |
| large-graph-rendering                            | [von Landesberger et al. 2011, Visual analysis of large graphs](https://doi.org/10.1111/j.1467-8659.2011.01898.x)                                                                                                                                                                                                   |
| visual-encoding-nodes, legend-display            | [Munzner 2014, Visualization Analysis and Design](https://doi.org/10.1201/b17511)                                                                                                                                                                                                                                   |
| visual-encoding-edges                            | [Holten and van Wijk 2009, A user study on visualizing directed edges in graphs](https://doi.org/10.1145/1518701.1519054); Munzner 2014                                                                                                                                                                             |
| animated-transitions                             | [Heer and Robertson 2007, Animated transitions in statistical data graphics](https://doi.org/10.1109/TVCG.2007.70539)                                                                                                                                                                                               |
| filtering                                        | [Shneiderman 1996, The eyes have it](https://doi.org/10.1109/VL.1996.545307)                                                                                                                                                                                                                                        |
| zoom-pan, overview-minimap                       | [Cockburn, Karlson and Bederson 2009, A review of overview+detail, zooming, and focus+context interfaces](https://doi.org/10.1145/1456650.1456652); Shneiderman 1996                                                                                                                                                |
| node-selection, hover-highlight, tooltip-display | [Yi, Kang, Stasko and Jacko 2007, The role of interaction in information visualization](https://doi.org/10.1109/TVCG.2007.70515); for tooltips also [NN/g, tooltip guidelines](https://www.nngroup.com/articles/tooltip-guidelines/)                                                                                |
| search, path-highlighting                        | [Lee et al. 2006, Task taxonomy for graph visualization](https://doi.org/10.1145/1168149.1168168)                                                                                                                                                                                                                   |
| neighborhood-expansion                           | [van Ham and Perer 2009, Search, show context, expand on demand](https://doi.org/10.1109/TVCG.2009.108); financial-crime-fraud-aml-kyc.md                                                                                                                                                                           |
| pattern-search                                   | cybersecurity-graph-work.md (threat hunting) and graph-database-query-and-expand-exploration.md                                                                                                                                                                                                                     |
| analysis-history, view-bookmarks                 | [Heer et al. 2008, Graphical histories for visualization](https://doi.org/10.1109/TVCG.2008.137)                                                                                                                                                                                                                    |
| comparison-view                                  | [Gleicher et al. 2011, Visual comparison for information visualization](https://doi.org/10.1177/1473871611416549); temporal-and-dynamic-networks.md                                                                                                                                                                 |
| keyboard-shortcuts                               | [WCAG 2.2, Understanding 2.1.1 Keyboard](https://www.w3.org/WAI/WCAG22/Understanding/keyboard.html)                                                                                                                                                                                                                 |
| export-image, style-presets                      | communicating-findings-and-deliverables.md                                                                                                                                                                                                                                                                          |

Every DOI above was resolved against Crossref's metadata service on 2026-11-25 and matched the author, year and title
given.

## 10. Sources

Every source is linked inline at the claim it supports; sibling documents named in the text hold their own source lists.
