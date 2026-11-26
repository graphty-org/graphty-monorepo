# Digital Humanities Scholars and Historians: Correspondence, Prosopography, Kinship, Literary and Archaeological Networks

Historians, literary scholars, classicists, medievalists, archivists, historical demographers and archaeologists build
networks out of sources that were never meant to be data: letters, court records, charters and witness lists,
biographical dictionaries, genealogies and parish registers, imprints, plays and novels, and excavated artifacts. Most
read the sources, decide what counts as a tie, and type people and ties into a spreadsheet or a database by hand; a
growing share now extract them automatically with named entity recognition (NER) or large language models (LLMs), or
query them out of large person databases and Wikidata. Data is full of uncertain dates, ambiguous identities and
missing records, and every node and edge must stay traceable to the source passage it came from. Network figures
become evidence inside an argument mostly written in prose; Programming Historian calls a network finding "an
invitation to more research rather than an endpoint or proof" (Ladd et al.).

Scale is wider than "small humanities data" suggests: one scholar's correspondence is usually under 2,000 people,
but the China Biographical Database holds about 470,000 people and LLM extraction has produced corpora of 2.5 million;
analysts query out a subnetwork (an office, a period, a kin group). Family historians, the largest group by far, keep
trees of hundreds to thousands of people and mostly draw them as standard charts.

## 1. Population

**Subpopulations.**

1. **Correspondence and prosopography historians** (early modern, medieval, ancient, modern): letter networks,
   witness lists, office holders. The largest group and the one most DH network lessons serve.
2. **Literary scholars**: character networks in plays and novels, and book-trade networks from imprints.
3. **Archivists and database editors**: union catalogs of letters, authority records, factoid prosopographies,
   linked data (Wikibase, Wikidata).
4. **Kinship researchers**: historical demographers, prosopographers of families and elites, anthropologists working
   on marriage systems, and serious family historians. They use genealogies (GEDCOM files, parish registers, CBDB
   kinship tables) and have their own graph models and software (Pajek, Puck, the Kinsources repository).
5. **Archaeologists using network analysis**: an established field with its own textbook (Brughmans and Peeples,
   Network Science in Archaeology, Cambridge 2023) and a dense US Southwest literature (Mills, Peeples and colleagues).
   Their networks are built from artifact similarity between sites, not from documents.
6. **Computational humanists** who extract networks from text at scale with NER and LLMs (often computer scientists
   paired with historians).
7. **Family historians and genetic genealogists** (hobbyists and professional researchers): by far the largest
   group by headcount. Ancestry reports about 3.8 million subscribers and about 29 million people in its DNA network
   (2025 Impact Report); FamilySearch's shared Family Tree holds 1.79 billion person records (December 2025). Most
   only ever see standard pedigree and descendant charts in their family-tree software. No source found for how
   many draw relationship graphs or DNA match networks; the evidence is forum threads (Gramps Discourse, FHUG) and
   blog tutorials (Family Locket, DNA Explained).

**Job titles and sectors.** Faculty and doctoral students in history, literature, classics, art history, religious
studies, anthropology and archaeology; project postdocs (Warsaw: a correspondence network using "social network
analysis and natural language processing"; Queen Mary: a meta-archive of "c.430,000 letters"); DH librarians;
archivists and catalogers.

**Organizations and venues.** DH centers (Stanford CESTA, Oxford EMLO, Princeton CDH, Luxembourg C2DH), BBAW
(correspSearch), Bodleian, SNAC, Harvard's CBDB, the 2024 Mainz "Bring Your Own Data" network lab, the Historical
Network Research community (Lausanne 2024 workshops), the Journal of Historical Network Research, DHQ, Journal of
Cultural Analytics, Programming Historian, Structure and Dynamics (kinship); for family historians, genealogical
societies, user forums (Gramps Discourse, FHUG) and blogs (DNA Explained, Family Locket).

**Size.** No source found for the number of humanists who use network tools. Indicators: Palladio and Gephi appear on
many history syllabi; CMIF letter files are aggregated by correspSearch; Kinsources holds 123 kinship datasets.
Family historians are counted in the millions (subpopulation 7) but mostly never leave tree charts.

**How often they touch graph tools.** Episodically: a long data-collection phase (months to years), short bursts of
exploration, then a few figures for an article or a project website. Students touch the tools for one assignment; an
Endicott instructor reports data collection "was time-consuming" and students used Gephi "only minimally."

**Skill profile.**

- Graph literacy low to moderate: degree, betweenness, "broker", community; few know what a layout does to a picture.
  Duering warns readers to understand "the centrality and layout algorithms you use, since they shape how the data
  looks."
- Coding is bimodal: most use spreadsheets plus GUI tools (Palladio, Gephi, Gephi Lite, nodegoat); a growing minority
  writes Python (NetworkX) or R (igraph, statnet, tidygraph). The 2024 Mainz lab taught NetworkX in Jupyter alongside
  Gephi 0.10 and nodegoat. Archaeologists lean on R (statnet, tnet) because the field's published scripts are R.
  Kinship anthropologists use Pajek and Puck. Family historians do not code; they live in family-tree software and
  reach Graphviz, yEd or Gephi only through reports and blog tutorials. Large projects pair a historian with a
  physicist or developer.
- Domain depth very high: they distrust any number they cannot explain from the source.

**Team context.** Often solo. Funded projects have a PI, one to three postdocs or assistants doing data entry, and a
developer. Classroom use is common.

## 2. Personas

### Persona A: Dr. Helen Marsh -- Early modern historian building a correspondence network (solo, spreadsheet + GUI)

- **Role and background.** Associate professor writing a monograph on a seventeenth-century scholarly circle; took one
  Programming Historian lesson and a Gephi workshop; does not program.
- **Tools.** Excel or Google Sheets as master copy; EMLO to look up letters; Palladio for quick network-map-timeline
  looks; Gephi 0.10 for metrics and the figure; Inkscape to clean the SVG (the Leiden course teaches this two-tool pattern).
- **Data.** 2,000-5,000 letters, 400-900 correspondents: letter id, sender, recipient, date (often partial, "after
  Easter 1648"), places of writing and receipt, repository and shelfmark, edition page, mentioned people, carrier.
  Comparable to the Hartlib catalog (about 4,585 letters) and the Cyprian edition in EMLO (4,274 letters, 784 persons).
- **Goals.** See who sat between the circle and continental scholars; show change across the Civil War years; one
  clean, citable figure per chapter.
- **Frustrations.** Typos create duplicate nodes and Palladio cannot edit data in place (Conroy, DHQ 2021); Palladio
  has no metrics; Gephi collapses parallel letters into one edge unless weighted (Harvard histecon); partial dates fit
  no tool's date column; no tool keeps the source citation on each edge.

### Persona B: Dr. Tomas Rhee -- Postdoc on a large letters meta-archive (data steward, Python/R)

- **Role.** Postdoc merging about half a million letter records from several catalogs with a network scientist
  (modeled on Networking Archives: State Papers Online plus EMLO).
- **Tools.** pandas or R for cleaning; name clustering; a retrained NER model for places; NetworkX or igraph; Gephi
  for pictures; GitHub and Zenodo for release (the Tudor dataset is "a temporal, directed edgelist", CC BY-NC-SA).
- **Data.** 20,000+ people, 100,000+ letters; directed, temporal, multi-edge; persons reconciled to VIAF, places to
  GeoNames (the CMIF standard uses both).
- **Goals.** Reliable disambiguation ("very labour-intensive", Cromwell letters blog); betweenness over time slices;
  show findings survive archival loss (Ryan and Ahnert found most centrality measures robust until "60% or more" of
  data is removed, transitivity excepted).
- **Frustrations.** GUI tools cannot hold the archive or keep IDs and provenance through import/export; every
  re-clean means re-importing and re-styling; colleagues without Python cannot explore results.

### Persona C: Prof. Aisha Okafor -- Literary scholar and DH instructor (character and book-trade networks)

- **Role.** Professor of English teaching an undergraduate DH methods course; studies early modern drama and print.
- **Tools.** Palladio for teaching; Gephi Lite or Gephi; DraCor and rdracor for play networks; Kumu for student maps.
- **Data.** Imprints turned into collaborator pairs (Duke London Literary Network: author, printer, publisher,
  bookseller; weight = shared works); play co-occurrence by scene for a whole corpus (DraCor German, Shakespeare or
  French drama corpora).
- **Goals.** Compare whole genres or periods (are comedies denser than tragedies?), then return to the scenes; students
  open a tool in a browser in minutes.
- **Frustrations.** Students "simply reported the numbers" (Endicott); Gephi install fights ("Cannot find Java 1.8 or
  higher"); no side-by-side view of dozens of play networks; metrics "difficult to interpret at best" (Trilcke).

### Persona D: Mira Vos -- Archivist and prosopography database editor (authority records, linked data)

- **Role.** Archivist responsible for a correspondence catalog and a factoid prosopography; contributes to a union
  catalog and to Wikidata/FactGrid.
- **Data.** Factoids, "a statement by a modern scholar of a thing a source says about a person", with source, date of
  assertion versus date of event, and conflicting claims kept "side by side" (FactGrid help).
- **Goals.** Readers navigate person to correspondents to records with provenance on every link; a view that survives
  staff turnover (Kindred Britain's page warns "this website is not current and will be retired").
- **Frustrations.** Tools flatten assertions into bare edges; uncertainty is lost on export; bespoke sites die.

### Persona E: Dr. Wen Li -- Historian of Chinese elites using CBDB (large person database, kin and social ties)

- **Role.** Historian of Song-dynasty officials studying how marriage and patronage shaped careers.
- **Tools.** CBDB downloaded as a standalone SQLite file, queried by office, period and place; the CBDB guide's
  sections on querying kinship and social networks; Python (pandas, NetworkX) and Gephi for pictures.
- **Data.** From about 470,000 individuals (2020; over 515,000 by December 2021) she extracts 1,000-10,000 people: kinship rows (normalized kin codes such as F, S, D, H, W), social association rows (letters,
  prefaces, teacher-student), office postings with dates and places.
- **Goals.** Compare a kin network with a patronage network over the same people; place both on a map of
  prefectures.
- **Frustrations.** Raw kinship links do not form a clean tree until relations are normalized (Li et al., CBDB);
  every new query means a new export and a re-styled graph; tools treat kin and social ties as untyped edges.

### Persona F: Prof. Ana Duarte -- Historical demographer and kinship analyst (genealogies, marriage cycles)

- **Role.** Historical anthropologist studying marriage alliances among a regional elite over 300 years; collaborates
  with family historians who supply GEDCOM files.
- **Tools.** Genealogy software and GEDCOM export; Pajek (reads GEDCOM directly as an Ore graph or p-graph); Puck for
  circuit censuses and kin-term analysis; Kinsources to compare with published datasets; Gephi for pictures.
- **Data.** 2,000-50,000 individuals (Ragusan nobility, with UCINET/Pajek: 5,999; largest Kinsources network, Watchi:
  about 50,000).
- **Goals.** Count marriages that re-link already related families (relinking), find preferred marriage types, trace
  descent lines and inheritance paths, show generations as layers.
- **Frustrations.** General graph tools have no family or couple node, no generation layout, no kin-typed edges; GEDCOM
  assumes one husband and one wife per family; parse scripts are hand-written.

### Persona G: Dr. Sam Ortega -- Regional archaeologist (site similarity networks, R)

- **Role.** Archaeologist studying interaction among 50-700 settlements over several 50-year periods.
- **Tools.** R with Peeples's network script (statnet, tnet, igraph), GIS shapefiles for the study area; Gephi or
  Visone occasionally.
- **Data.** A site-by-type count table (ceramic wares, obsidian sources) per period, plus coordinates; the Southwest
  Social Networks database covers over 700 sites, 42 wares, AD 1200-1500 in five 50-year periods.
- **Goals.** Infer interaction or shared practice from similarity; test whether central sites stay central under
  sampling error; draw networks over terrain.
- **Frustrations.** Choice of similarity measure and threshold changes the network; uncertainty from small samples is
  invisible in standard tools; maps need separate GIS work.

### Persona H: Linda Kowalski -- Family historian and DNA hobbyist (Gramps, GEDCOM, shared-match clusters)

- **Role.** Retired teacher, 15 years into her family history; volunteers at a genealogical society; no coding.
- **Tools.** Gramps (or Family Historian, RootsMagic, Family Tree Maker) as master tree; an Ancestry tree and DNA test;
  Gramps graph reports (Graphviz); sometimes ged2dot, yEd, Inkscape; AutoClusters, a Leeds spreadsheet, Gephi.
- **Data.** A GEDCOM tree of 600-6,000 people with families, multiple marriages, adoptions and step-children, cousin
  marriages (pedigree collapse); about 200-2,700 DNA matches with shared centimorgans (cM) and "in common with" lists.
- **Goals.** A wall poster of "the complete family tree"; how two people are related; DNA matches sorted into the four
  grandparent lines to break a brick wall.
- **Frustrations.** A whole database is "no longer a tree" once ancestors repeat, so connectors cross and boxes shrink;
  picking people for a Family Lines Graph is "very effortful" and not saved; reports freeze or come out blank; that
  graph cannot mark fostered or adopted children; moving boxes means editing a .gv file; endogamy ruins DNA clusters.

## 3. Use cases (ranked)

| Rank | Question answered with a graph                                                             | Frequency                                                                   | Stakes                                                          |
| ---- | ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------- | --------------------------------------------------------------- |
| 1    | Who wrote to whom, how much; who are the hubs?                                             | Every correspondence project                                                | Core descriptive claim                                          |
| 2    | Who connected separate groups (brokers, couriers, sustainers)?                             | Very common                                                                 | Recovers overlooked people (Protestant letters: Bernher, Cooke) |
| 3    | How did the network change across periods or events?                                       | Very common                                                                 | Argument about resilience (Marian network "does not fragment")  |
| 4    | Where was the network? Routes, cities, sites (network on a map)                            | Very common; universal in archaeology                                       | Revises narratives (Republic of Letters "far more national")    |
| 5    | Which people co-occur in documents, events, imprints? (two-mode, then projection)          | Common                                                                      | Infers unstated ties (co-witnessing)                            |
| 6    | How are families linked by descent and marriage; which marriages re-link kin?              | Common among kinship researchers and elite prosopographers                  | Claims about alliance strategy and inheritance                  |
| 7    | Which sites shared material culture, and how sure are we?                                  | Standard in network archaeology                                             | Claims about interaction and migration                          |
| 8    | Character structure within a play and across a corpus                                      | Common in literary studies                                                  | Claims about a text or a genre                                  |
| 9    | Who shared correspondents without writing to each other?                                   | Occasional                                                                  | Directs archival search (Hartlib and Vossius)                   |
| 10   | How robust is a finding to missing records or extraction errors?                           | Rising                                                                      | Defends the method                                              |
| 11   | Navigation of an archive or database for readers                                           | Common for archivists                                                       | Long-lived publication                                          |
| 12   | Whole-family relationship chart for print or sharing (all relatives, loops, remarriages)   | Very common among family historians, though most settle for standard charts | Family keepsake; errors are public                              |
| 13   | Which DNA matches cluster together, and which ancestral couple does each cluster point to? | Very common among DNA testers                                               | Identifies unknown parents and ancestors                        |

## 4. Step-by-step workflows

Dating: Workflows 1-3 rest on 2015-era lessons (Palladio's last release was 2015), re-checked against Gephi 0.10/0.11;
2024 workshops still teach them.

### Workflow 1: From a source to node and edge tables (manual coding)

Sources: Duering (Programming Historian); nodegoat lesson; Endicott and Duke course projects.

1. **Define the tie.** Duering: "any action which directly contributed to the survival of persecuted persons in
   hiding." Grandjean: picking one relationship is "a deliberate modelling choice."
2. **Decide who becomes a node**: helpers and suppressors; in literature, whether a character must speak, be present,
   or merely be mentioned.
3. **Coding scheme**: Giver, Recipient, Form of Help, intensity, Duration, Date ("in six-month steps"); a person table;
   expect to "adapt your coding scheme frequently."
4. **Code while reading**: one row per act or letter (a multigraph), unknowns coded 99; weeks to years, the dominant
   cost (Duering: about 5,000 acts among 1,400 people).
5. **Master and working copy.** "Use one spreadsheet for storage and a copy for visualization."
6. **Normalize names, assign IDs** (Duke: a name-letter scheme; Harvard: VLOOKUP; nodegoat: import references first).
7. **Handoff**: two CSVs for Gephi, one wide table for Palladio, or a nodegoat relational model.

### Workflow 2: Quick network + map + timeline exploration in Palladio (2015 software, still taught)

Sources: Duering; Leiden DMT exercise 1; Conroy (DHQ 2021).

1. Click **Start**, paste a CSV or load a Google Sheet; fix detected types. Multi-valued cells use a delimiter.
2. Link tables through **Extension** (Sender and Recipient to People; Places with latitude and longitude in one cell);
   set dates to "Year or Date".
3. **Graph view**: Source = Sender, Target = Recipient; size nodes by count; fixed force layout; edges "cannot be
   weighted."
4. **Two-mode views** by setting Target = Year or Form of Help.
5. **Map view**: point layers plus a Point to Point layer from sender place to recipient place (no direction).
6. **Facets and Timeline**: drag a date range and every view filters.
7. **Export** SVG, or a JSON project file to share.
8. **Read and return to sources** ("Visualisations are of course not 'proof'"); then Gephi or Python for metrics.
   A variant spelling becomes a duplicate node, and since "data cannot be edited within Palladio," the user fixes the
   spreadsheet and starts over.

### Workflow 3: Metrics, communities and a publication figure in Gephi 0.10/0.11 (and Gephi Lite)

Sources: Grandjean's tutorial (1,000 nodes, 14,116 edges; written for 0.8.2, menus still match 0.10); Leiden DMT
exercise 2; Harvard histecon; Gephi Lite manual; GeoLayout page.

1. **Data Laboratory > Import Spreadsheet**: nodes first (Latitude/Longitude as double), then edges with "create
   missing nodes" unchecked, appended to the workspace.
2. Size by degree (**Ranking**); layout ForceAtlas 2 ("prevent overlap") or Yifan Hu.
3. **Statistics**: weighted degree, Network Diameter (gives betweenness, closeness), eigenvector, Modularity
   (resolution 0.1-2).
4. **Appearance**: color by betweenness or **Partition** by modularity class.
5. **Interpretation** (Leiden): who sent the most letters, who "can act as a broker?"
6. **Geography.** GeoLayout 1.0.1 (Gephi 0.10/0.11) places nodes by latitude and longitude but draws no base map, so
   Grandjean overlays the SVG on a map in Inkscape; Gephi Lite v1.1 (October 2026) has a map background.
7. **Preview and export** (desktop only): curved edges, about 70% opacity, SVG or PDF.
8. **Web publication**: Sigma.js exporter or Retina.

Pain: one edge per pair forces separate graphs per relation type (Harvard); Java and memory problems on students'
machines.

### Workflow 4: Scripted analysis in Python (NetworkX) or R

Sources: Ladd et al. (Programming Historian); Sadler; Petz 2024 tutorial (Mainz lab).

1. Load node and edge lists (Quakers: 119 nodes, 174 edges); `nx.Graph()` with attributes.
2. Density, shortest paths, diameter of the largest component, transitivity.
3. Degree, betweenness (low-degree brokers), eigenvector.
4. `greedy_modularity_communities()`; rank inside communities.
5. `nx.write_gexf()` to Gephi.
6. R variant (Sadler): 114 letters become 13 cities and 15 weighted routes (`group_by()`, `summarise()`); igraph,
   ggraph or visNetwork plots.

The Mainz tutorial points to de Valeriola (2021), "Can historians trust centrality?", for robustness checks before
interpreting metrics.

### Workflow 5: Temporal change and brokerage across periods

Sources: QMUL Protestant letters; Programming Historian temporal R lesson; nodegoat.

1. **Protestant letters** (289 letters, 377 actors, 795 ties): remove the executed in date order and recompute
   betweenness; the network "does not fragment" and couriers rise to the top.
2. **R (tsna/ndtv)**: edge spells (onset, terminus, tail, head, censoring flags); `filmstrip()`, `render.d3movie()`, rolling betweenness centralization, forward reachability. Uncertain ranges were
   averaged ("not an ideal solution").
3. **Gephi desktop**: intervals via "Merge columns"; timeline filter; "save your files frequently." Gephi Lite has no
   dynamic graphs.
4. **nodegoat**: dates applied along the traversal path ("people who attended the same educational institute at the
   same time").

### Workflow 6: Uncertainty, provenance and two-mode data in a database (nodegoat, factoids, Wikibase)

Sources: nodegoat lesson and blog; Factoid Prosopography; FactGrid; PoMS.

1. Object types (Person, Letter, Place, Event) with sub-objects such as Birth or Letter-sent, each with date and place.
2. Uncertainty per field: a flag, a certainty class plus "Derived from" (Primary, Secondary, Inference, Conjecture),
   or a 1-100 score filterable with "at least 80."
3. Uncertain dates as Chronology Statements: before/after, between ("around 1666" stored as 1664-1668), relative to
   another event; nodegoat built ChronoJSON because EDTF "could not handle relational date statements."
4. Uncertain places as polygons ("probably in or near London").
5. Sources per statement; conflicting statements side by side.
6. Two-mode charter-witness data (frequent co-witnessing makes a real tie "more probable"); project for metrics, keep
   two-mode for readers.
7. View in nodegoat's geographic, social and chronological views, or export.

### Workflow 7: Automatic extraction with NER and LLMs, then human review

Sources: "A City of Millions"; AffilKG; Norcia newspapers; classical Chinese relation extraction; UW NER thesis;
Labatut and Bost (all 2025 except the last two).

1. **Get text.** OCR or transcription (AffilKG: six social registers, 1892-1965, OCR corrected by hand; Norcia: a
   daily newspaper, 1860-1870).
2. **Extract entities and relations.** Classic NER (weak on early modern spelling) or LLM prompts with structured
   output. "A City of Millions" turned a manual annotation task into a prompt: 70,509 networks from about 30,000 texts
   in 58 languages, each tie typed and rated for affinity. AffilKG extracted person-member-club triplets.
3. **Resolve entities.** Merge name variants (AffilKG hand-checked 150 entity comparisons per dataset).
4. **Measure error on a sample.** AffilKG hand-annotated about 200 triplets per book: edge F1 ranged from about 54
   to 96, and "numerous errors by all LLMs on all texts" were found. A classical Chinese study reached F1 = 0.68 and
   reported hallucination.
5. **Review and correct.** The Norcia project says domain expertise remains central to "monitoring the extraction and
   disambiguation process" and keeps a link from each extracted fact to the newspaper page.
6. **Build and analyze the network**, filtering by confidence, and return to the passages behind surprising edges.

### Workflow 8: Literary character networks across a corpus (DraCor, rdracor)

Sources: rdracor README; DraCor co-occurrence definition; Labatut and Bost; Moretti; Trilcke; Kleist co-reference
study.

1. **Choose the corpus**: `get_dracor()` lists a corpus's plays with metadata.
2. **Choose the tie rule.** DraCor's default is co-presence in a scene, weighted by shared scenes; alternatives
   (speaking to, co-reference, knowledge transfer) "reveal different aspects" (Kleist study). Novels need character
   extraction first (Labatut and Bost).
3. **Extract one network per text**: `get_net_cooccur_igraph()` (undirected, weighted) or
   `get_net_relations_igraph()` (stated relations such as "parent_of"); GEXF or GraphML export.
4. **Compute per play** (size, density, diameter, clustering) and per character (degree, betweenness, words spoken).
5. **Compare across the corpus**: tabulate metrics by genre or decade; plot distributions; pick outliers.
6. **Return to the text**: `get_text_df()` gives speaker, scene and line for the scenes behind a strong tie; Moretti
   removed a character (Hamlet's Horatio) and reread.

### Workflow 9: From Wikidata or a linked-data endpoint to a network

Sources: Programming Historian, "Wikidata for Historical Research" (2026); Ohio State Wikidata CSV guide; Facepager
writers-network tutorial; Bodleian worksheet (Wikidata to Palladio).

1. **Find properties**: Q-ids for items, P-ids for properties (P1066 "student of", P737 "influenced by", P26 spouse).
2. **Query** in the Query Builder (single-subject conditions only), then SPARQL in the Query Service, adapting example
   queries ("unforgiving of typos"); chatbot-written queries need checking.
3. **Export** the result table as CSV: one wide row per subject-property-object, with `?item` Q-ids and `?itemLabel`
   labels.
4. **Map columns**: subject Q-id to source, object Q-id to target, labels to names, often by script (R in Facepager).
5. **Visualize** in Palladio or Gephi.
6. **Re-run and merge** later as Wikidata changes, keeping Q-ids as node ids so styles and notes survive.

### Workflow 10: Kinship and genealogical networks (GEDCOM, Ore graph, p-graph, Pajek, Puck)

Sources: Menezes et al. (2016); Mrvar and Batagelj (2004); UCINET datasets; Roued-Cunliffe (2017); Kinsources study
(2026); CBDB kinship normalization.

1. **Get the genealogy**: GEDCOM from a family historian (structure in Workflow 12; its family records assume one
   husband and one wife, Roued-Cunliffe), parish register reconstitution, or a CBDB kinship query.
2. **Choose a graph model.** Ore graph: people are nodes, parent-child ties are arcs, marriages are edges. P-graph
   (White and Jorion 1992): families or couples are nodes, and each person is an arc from family of origin to family
   of procreation; Mrvar and Batagelj also use a bipartite p-graph and find p-graphs "more suitable for analyses."
   Kinship networks are acyclic in their directed part, so generations are well defined.
3. **Load.** Pajek reads GEDCOM directly (Options > Read/Write > Ore; father links value 1, mother links 2, marriages 0)
   and stores birth, marriage and death years as vectors. Others parse GEDCOM with a script.
4. **Normalize kin terms** when ties come as relation labels: CBDB's kinship data (484,066 relation instances among
   255,149 persons in Li et al.) must be normalized to basic terms before family trees can be rebuilt.
5. **Analyze**: generation depth (Kinsources spans 40 pseudogenerations); a census of matrimonial circuits; a 0-1
   relinking index for marriages between already related families (Mrvar and Batagelj); consanguinity paths; descent
   lines; Puck's reshuffling simulations test whether a marriage pattern beats chance.
6. **Lay out by generation** (layered or pedigree) or use Gephi for a force picture; the Kinsources study used
   Graphviz's network simplex method to assign pseudogenerations.
7. **Compare** with Kinsources (123 datasets, 105 usable, 17 to about 50,000 individuals).

### Workflow 11: Archaeological similarity networks (Brainerd-Robinson, thresholds, resampling, maps)

Sources: Davis's replication code following Peeples (2017) protocol (Antiquity 2023 supplement); Habiba, Athenstaedt,
Mills and Brandes on similarity measures; Brughmans and Peeples (2023).

1. **Build the case-by-type table**: one row per site (and period), one column per ware or source, cells are counts;
   sites with too few sherds dropped (SWSN keeps sites with more than 30 decorated sherds). Coordinates in two columns.
2. **Convert to row proportions** and compute pairwise similarity: Brainerd-Robinson (2 minus the summed absolute
   difference of proportions, rescaled to 0-1), co-presence (types above 10% of an assemblage) or chi-square distance. Habiba et al. warn that measures "do not necessarily have
   similar contextual meaning."
3. **Threshold into a network**: BR ties above 0.6 (statnet `event2dichot`); a 50% co-presence threshold chosen by
   "trial-and-error"; or keep weights (tnet).
4. **Compute** degree, eigenvector and betweenness, and centralization, per period.
5. **Test robustness**: resample 90% down to 10% of sites 1,000 times and correlate centralities with the full network
   (Spearman's rho boxplots); simulate edges from similarities as probabilities.
6. **Map**: plot the network at site coordinates over a shapefile (`plot(..., coord = ...)` with rgdal).
7. **Interpret** ties as interaction, shared practice or exchange, period by period.

### Workflow 12: Family tree to relationship graph or wall chart (GEDCOM, Gramps, Graphviz)

Sources: Gramps Discourse threads 2260, 4007, 4902, 4059, 5446, 8127; GrampsCrossing; ged2dot; GedGraph; yEd family
tree layout; Family Historian duplicate options; MacKiev on Family ChartMasters.

1. **Export GEDCOM** from the tree: individual (INDI) records and family (FAM) records linking up to two partners and
   their children. Three marriages mean three FAM records; a child's link to each set of parents can be birth,
   adopted or foster.
2. **Pick a chart.** Pedigree, descendant, hourglass and fan charts are trees and the default. For everyone at once:
   Gramps Relationship Graph (generations in rows, optional family nodes), Family Lines Graph (rich labels, hand-picked
   "people of interest"), the Graph View add-on, Family Historian's All Relatives diagram, or converters (ged2dot:
   people and families as nodes; GedGraph: shortest relationship path, named).
3. **Select a subset.** A whole tree of about 600 people came out "a mess", so users set a center person, generation
   limits and filters ("include some persons of interest but without their relations") or make several partial charts.
4. **Render.** Gramps writes a Graphviz file and runs dot; for blank or frozen output the advice is to save the .gv
   file and run "Find database loop". Pedigree collapse (cousin marriages, endogamy) creates loops and crossings;
   software duplicates the repeated ancestor (Family Historian links duplicates with "ribbons") or draws the loop.
   Non-birth children get dotted lines in the Relationship Graph if so recorded; the Family Lines Graph ignores it.
5. **Fix the layout by hand**: drag boxes in a reopened .gv file, edit the SVG in Inkscape, try yEd (imports .ged;
   family tree layout with family nodes, generation spacing, partner order), or run GrampsCrossing, which reorders the
   .gv file for "several minutes" to cut crossings. One user found no usable .gv editor and gave up.
6. **Print or share**: PDF or SVG, tiled or sent to a chart printer (Family Tree Maker exports a PDF for Family
   ChartMasters); clickable SVG trees on a Gramps NarrativeWeb site; living people hidden first (GedGraph honors RESN).

### Workflow 13: DNA shared matches to clusters (Leeds method, AutoClusters, Gephi)

Sources: Dana Leeds; DNA Explained; MyHeritage AutoClusters; Family Locket Gephi series parts 1, 2, 5 and "10 ways";
DNA Painter help.

1. **Download matches** with DNAGedcom Client (paid): `m_<name>.csv` (match, shared cM, segments, predicted
   relationship) and `icw_<name>.csv` (pairs of matches who share each other). Ranges: 50-400 cM for a first graph (219 matches in Family Locket's example); 90-400 cM for Leeds; 250 and 50 cM in one
   AutoCluster run.
2. **Group them**, three views of one shared-match graph:
    - _Leeds method_: a spreadsheet, one hand-filled color column per cluster; it "often creates four groups" (the
      grandparent lines), but matches land in two colors and charts grow to seven columns.
    - _AutoClusters_ (Genetic Affairs, MyHeritage, GEDmatch): a matrix reordered so clusters form colored squares on
      the diagonal, gray cells between them; HTML plus CSV. Not node-link.
    - _Gephi_: icw file as undirected edges (`matchid` to Source, `icwid` to Target), match file as nodes; OpenOrd, then
      ForceAtlas 2 (scaling 1000, stronger gravity, then prevent overlap); color by modularity, size by cM; tune the
      resolution until clusters split maternal and paternal, then by grandparent line.
3. **Label each cluster** with the ancestral couple most frequent in its members' trees and mark it on a pedigree
   chart (in Family Locket's example two of six clusters stayed unknown).
4. **Read between clusters**: count edges between two clusters per member (419 for one pair, 12 for another, read as random).
5. **Test placements** in DNA Painter's What Are the Odds: candidate tree, shared cM per match, hypotheses, odds.
6. **Limits**: close cousins and matches under 30-50 cM add spurious links; "network graph analysis is not helpful for
   those with moderate to severe endogamy."

## 5. Data

**Sources.** Letters and calendars (State Papers, EMLO, Electronic Enlightenment); biographical dictionaries and person
databases (ODNB, CBDB, Trismegistos, DPRR, PASE); court records; charters and witness lists
(PoMS, Cambrai); imprints; oral histories (Linked Jazz); plays and novels (DraCor); genealogies (GEDCOM, Kinsources,
Kindred Britain); family trees and DNA match lists (Ancestry, FamilySearch, MyHeritage); excavated artifact counts (SWSN); newspapers and registers via OCR; Wikidata and FactGrid.

**Formats.** CSV and Google Sheets (dominant); Excel; GEXF and GraphML (Gephi, DraCor); TEI correspDesc and CMIF
(VIAF and GeoNames ids); EAC-CPF (SNAC); RDF, Wikibase and SPARQL result tables (Q-ids plus labels); relational and
SQLite databases (CBDB ships as SQLite); GEDCOM; Pajek .net and Puck/Kinsources files; nodegoat CSV/JSON; Palladio
JSON; GeoJSON and shapefiles; LLM extraction output (JSON with confidence and evidence).

**Typical sizes (evidenced).**

| Dataset                                        | Nodes                   | Edges / records                              |
| ---------------------------------------------- | ----------------------- | -------------------------------------------- |
| Sadler, van der Meulen letters 1585            | 13 cities               | 15 routes from 114 letters                   |
| Quakers (Programming Historian)                | 119                     | 174                                          |
| Protestant letters under Mary I                | 377                     | 795 ties from 289 letters                    |
| Duering, help for persecuted Jews              | about 1,400             | about 5,000 acts                             |
| Ragusan nobility genealogy (Pajek)             | 5,999                   | 9,315 parent-child, 2,002 marriages          |
| SWSN ceramics                                  | over 700 sites          | 4.3 million sherds, 42 wares                 |
| GRIMMWELT (nodegoat)                           | 1,400 partners          | 20,000 letters                               |
| Six Degrees of Francis Bacon                   | over 13,000             | about 200,000 relationships                  |
| Tudor State Papers 1509-1603                   | 20,560 people           | 132,747 letters                              |
| Kindred Britain                                | nearly 30,000           | family ties over 15 centuries                |
| Family historian's Gramps tree (forum reports) | 600-6,000               | families, marriages, adoptions               |
| DNA matches, one tester (DNA Explained)        | 1,233-2,698 per company | shared-match pairs; 176 in one clustered run |
| Kinsources, all 105 networks                   | 249,597                 | 439,613                                      |
| Republic of Letters dataset (2022)             | --                      | over 150,000 letters                         |
| Networking Archives                            | --                      | c.430,000 letters                            |
| CBDB                                           | about 470,000 (2020)    | 484,066 kin relation instances (Li et al.)   |
| A City of Millions (LLM)                       | 2,510,021               | 2,805,482 in 70,509 networks                 |

Most single-scholar projects are under 2,000 nodes; corpora and person databases reach hundreds of thousands to
millions, and analysts extract subnetworks by query.

**Attribute columns.** Letters: id, sender, recipient, date (as written, earliest, latest, calendar), places,
repository, shelfmark, page, carrier, certainty. People: name variants, authority id (VIAF, Q-id, CBDB id), birth and
death ranges, gender, office with dates. Kin: relation code, generation, child relationship (birth, adopted, foster), privacy flag. DNA matches: shared cM,
segments, predicted relationship. Sites: coordinates, period, type counts.
Extracted edges: confidence, model, evidence text.

**Identifier problems.** Spelling variants; homonyms in families (Duke could not trace "the Okes and Moseleys");
coarse places; Julian versus Gregorian dates; in family trees, a person entered twice or a loop where someone is their
own ancestor (Gramps "Find database loop"). Fixes: project ids, VIAF/GeoNames/Q-ids, manual reconciliation.

**Graph properties.** Directed and multi-edge by default; temporal at edge and node level with uncertain intervals;
geographic at the edge level; two-mode (person-letter, person-charter); typed ties (kin, patronage, hostility);
mixed graphs for genealogy (directed descent, undirected marriage) with family nodes in p-graphs, and loops from
pedigree collapse; typed parent-child links (birth, adopted, foster, step); shared-match graphs of DNA testers; similarity-derived
weighted complete graphs thresholded in archaeology; many small graphs in literary corpora.

**Sensitivity and access.** Mostly public-domain, but State Papers Online is commercial and derived data often CC
BY-NC-SA. Living people in family trees are hidden before sharing (GEDCOM RESN tag); DNA match lists name living
relatives; Vistorian advertises that data stays "securely on your machine."

## 6. Analysis methods

- **Descriptive counts**: letters per person, year, place.
- **Degree** (in, out, weighted), checked against archive bias.
- **Betweenness**: the signature measure for brokers; position "not necessarily influence."
- **Eigenvector and PageRank.**
- **Modularity communities**, read by period, place or confession; unstable to small changes.
- **Node removal** in historical order (Protestant letters).
- **Shared-neighbor analysis** (Hartlib and Vossius).
- **Temporal**: time slices, rolling centralization, forward reachability.
- **Two-mode projection** of co-witnessing, co-imprint.
- **Kinship**: generation depth (pseudogenerations), matrimonial circuit census, relinking index, consanguinity paths,
  reshuffling simulations against chance (Puck); for family historians, the shortest relationship path between two
  people (GedGraph) and loop detection (Gramps "Find database loop").
- **DNA match clustering**: shared-match graph thresholded by cM, clusters by matrix reordering or modularity, edges
  between clusters per member (Family Locket).
- **Archaeology**: similarity measures (Brainerd-Robinson, co-presence, chi-square), threshold sensitivity, resampling
  of sites for centrality confidence, spatial plots.
- **Corpus comparison**: per-text metrics compared across genres (DraCor).
- **Extraction quality**: sampled precision/recall or F1, entity matching checks (AffilKG).
- **Validation habits**: return to the source; robustness to loss (Ryan and Ahnert; de Valeriola); refuse to
  interpolate missing data (Mapping the Republic of Letters); filter by confidence (Six Degrees strips ties under 50
  percent).
- **Stance**: Weingart: networks "should be used on far fewer" projects; Lemercier warns against "network" as mere metaphor.

## 7. Outputs and collaboration

- **Articles and monographs**: few static figures (SVG cleaned in Inkscape, hand annotations); top-20 metric tables;
  generation-layered kin diagrams; site networks on maps. Family historians print wall charts and email PDFs.
- **Project websites**: Mapping the Republic of Letters, Six Degrees (filter by confidence), Linked Jazz (click an edge
  for the transcript excerpt), nodegoat publications; bespoke D3 or sigma.js sites often decay.
- **Data publications**: edge lists on GitHub and repositories, CMIF files, Kinsources datasets, R Markdown
  replication files (archaeology), released LLM-extracted corpora.
- **Teaching artifacts**: Palladio JSON files; screenshots in essays.
- **Audit**: provenance from figure to edge to source page; Six Degrees confidence calculations "could not be
  independently reproduced."

## 8. Tools landscape and pain points

| Tool (version checked)                                      | Loved for                                                                                       | Fails them because                                                                                                        |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Palladio 1.1 (last release October 2015)                    | Browser, one file, linked network + map + timeline + facets                                     | No metrics, no weighted edges, no layout control, no edit in place, no direction on maps; codebase status "unclear" (UNC) |
| Gephi desktop 0.10/0.11                                     | Metrics, ForceAtlas2, modularity, timeline, SVG/PDF, plugins (GeoLayout 1.0.1 for 0.10/0.11)    | Two files, one edge per pair, Java/memory installs, unstable dynamic data, no base map behind a geographic layout         |
| Gephi Lite v1.1 (October 2026)                              | Browser, no install; map background for nodes with latitude/longitude; date-range filter        | No dynamic graphs, no plugins, no Preview, image-only export (no SVG/PDF), lighter graphs only                            |
| nodegoat                                                    | Historian data model: uncertainty, chronology statements, polygons, sources, temporal traversal | Modeling is hard; vendor-hosted; free tier one project                                                                    |
| Vistorian                                                   | Node-link, matrix, timeline, map; data stays local                                              | Research prototype                                                                                                        |
| Python / R (NetworkX, igraph, statnet, tnet, tsna)          | Full metrics, archaeology and temporal packages, reproducible                                   | Requires coding; weak interactive output                                                                                  |
| Pajek                                                       | Reads GEDCOM, Ore graph and p-graph, large genealogies                                          | Windows desktop, dated interface                                                                                          |
| Puck (SourceForge update 2014)                              | Kinship circuits, reshuffling simulations, Kinsources integration                               | Specialist; little visualization                                                                                          |
| DraCor / rdracor                                            | Play networks via API, corpus metadata, GEXF/GraphML                                            | Metrics easy, interpretation hard; no corpus-comparison view                                                              |
| Wikidata Query Service                                      | Free linked data, Q-ids, CSV export                                                             | SPARQL is "unforgiving of typos"; no network view                                                                         |
| Kumu                                                        | Students build maps quickly                                                                     | Little analysis                                                                                                           |
| Gramps graph reports and Graph View (Graphviz)              | Free; generations in rows; family nodes; SVG and .gv output                                     | Freezes or blank output on real trees; hand-picking people; no saved settings; no drag-to-arrange editor                  |
| Family Historian diagrams                                   | All Relatives and Everyone diagrams; duplicate boxes linked by ribbons                          | Windows desktop; pedigree collapse still messy                                                                            |
| yEd family tree layout                                      | Imports .ged; family nodes, generation layers, partner order                                    | General editor, no genealogy data                                                                                         |
| AutoClusters (Genetic Affairs, MyHeritage) and Leeds method | Shared-match clusters as a colored matrix                                                       | Matrix only; thresholds hidden or manual; endogamy breaks it                                                              |
| DNAGedcom + Gephi                                           | Node-link match network, modularity, size by cM                                                 | Paid gathering; Gephi setup; messy center                                                                                 |

Cross-cutting: duplicate nodes from spelling variants; uncertainty cannot be shown ("not all of these visual variables
can easily be used with current network visualization software", Frontiers 2024); no tool keeps citations on edges
through to the figure; map, timeline and print figure still span tools; no general tool knows family nodes,
generations, pedigree collapse, similarity thresholds or machine-extracted edges.

## 9. Requirements implied

| Requirement                                                                                                             | Priority | Covered by existing Graphty personas/workflows?     |
| ----------------------------------------------------------------------------------------------------------------------- | -------- | --------------------------------------------------- |
| Import one wide CSV of letters/events and build the graph without a node file; also node + edge files                   | Must     | Partly (data-import, W02)                           |
| Multigraph: one edge per letter, aggregated to weights for display                                                      | Must     | Not covered                                         |
| Uncertain dates: ranges, partial dates, uncertain flags (EDTF-like); filters that respect ranges                        | Must     | Not covered                                         |
| Provenance on every node and edge (citation, page, excerpt), shown on click and kept through export                     | Must     | Not covered                                         |
| Certainty/confidence per edge or node, filterable and encoded (opacity, dashes)                                         | Must     | Not covered                                         |
| Linked views: network + geographic map (points, routes with direction, base map) + timeline, filtered together          | Must     | Not covered                                         |
| Two-mode display and projection with weights                                                                            | Must     | Not covered                                         |
| Betweenness, degree, eigenvector, PageRank, modularity with plain-language caveats                                      | Must     | Mostly covered (W03, W09, W23)                      |
| Duplicate-name detection and reversible merge; edit data in place                                                       | Must     | Partly (node-merging)                               |
| Print-quality SVG/PDF export with legend; reproducible layout with a seed                                               | Must     | Partly (export-image, W25)                          |
| GEDCOM import as an Ore graph or p-graph (family nodes kept) with dates, child relationship type and privacy flags      | Should   | Not covered (Pajek only)                            |
| Layered generation layout with crossing reduction; pedigree collapse as a loop or as linked duplicates; hand moves kept | Should   | Not covered                                         |
| Relationship chart from a center person (N generations up and down, extra people "without their relations"), saved      | Should   | Partly (neighborhood expansion)                     |
| Poster export (tiled or large PDF/SVG) with living people hidden                                                        | Could    | Partly (export-image)                               |
| Shared-match graph from match and in-common-with CSVs, cM thresholds, clusters as node-link and reordered matrix        | Could    | Partly (no matrix view)                             |
| Kin-typed edges (parent, spouse, sibling, normalized kin codes) styled and filtered by type; descent-path query         | Should   | Partly (edge attributes)                            |
| Similarity-matrix-to-network builder (case-by-type counts, Brainerd-Robinson and others) with an interactive threshold  | Should   | Not covered                                         |
| Resampling-based confidence on metrics (subsample nodes or edges, show spread of centrality)                            | Should   | Not covered                                         |
| Site and place networks on a base map with geographic coordinates                                                       | Must     | Not covered                                         |
| Import extracted edges with confidence, method and evidence-text fields; filter and encode by confidence                | Should   | Not covered                                         |
| Review queue to accept, reject or correct machine-made edges, with decisions recorded                                   | Should   | Not covered                                         |
| Open many small graphs together; small-multiples comparison view with shared metric scales and distributions            | Should   | Partly (W24 comparison is two graphs)               |
| Link each edge to source passages (scene, line or page ids)                                                             | Should   | Not covered                                         |
| Import a SPARQL result table (or query an endpoint); keep Q-ids and authority ids as node ids; re-run and merge         | Should   | Not covered                                         |
| Import a subgraph from a relational or SQLite query (CBDB-style export)                                                 | Should   | Not covered                                         |
| Handle person databases of hundreds of thousands of nodes by filtering to subnetworks                                   | Should   | Partly (large-graph work)                           |
| Node removal in a chosen order with recomputed metrics; time-sliced metrics                                             | Should   | Partly (removal-impact-analysis, temporal-analysis) |
| Shared-neighbor query ("shared correspondents with X but never wrote to X")                                             | Should   | Not covered                                         |
| Import TEI correspDesc/CMIF; export CSV and GEXF                                                                        | Should   | Partly (TEI/CMIF missing)                           |
| Read-only, long-lived published view with search and click-to-source                                                    | Should   | Partly (W25)                                        |
| Teaching mode: browser-only, sample letter, play and kinship datasets                                                   | Should   | Partly (guided-onboarding)                          |
| Local-only data handling for sensitive or living-person data                                                            | Should   | Not covered explicitly                              |

Gaps relative to design/designloom: no persona for humanities scholars, archivists, kinship researchers, family
historians or archaeologists, and no workflow for hand-coded sources, uncertain dates, provenance, genealogies, similarity networks,
machine extraction, corpus comparison, linked-data import, family-tree charts or DNA match clusters. GEDCOM should
become an import format: it serves both kinship scholars (Persona F) and the much larger family-history population
(Persona H), though for most family historians the graph view would be one chart beside their family-tree software,
not a replacement for it. Suggested workflows: "Letters to network, map and timeline", "Genealogy to generations
and marriage circuits", "Family tree to wall chart", "DNA matches to clusters", "Site assemblages to similarity
network on a map", "Review machine-extracted ties", "Compare a corpus of play networks", "Wikidata query to network".

## 10. Sources

- https://programminghistorian.org/en/lessons/creating-network-diagrams-from-historical-sources -- Duering lesson (2015-02-18).
- https://programminghistorian.org/en/lessons/exploring-and-analyzing-network-data-with-python -- Quaker NetworkX workflow.
- https://programminghistorian.org/en/lessons/temporal-network-analysis-with-r -- tsna/ndtv steps, date caveat.
- https://programminghistorian.org/en/lessons/designing-database-nodegoat -- nodegoat modeling and import.
- https://programminghistorian.org/en/lessons/wikidata-for-historical-research -- Wikidata Query Builder and SPARQL (2026).
- https://www.asc.ohio-state.edu/lewis.239/public/project/mydh-xr/docs/wikiData.pdf -- Wikidata query to CSV.
- https://github-wiki-see.page/m/strohne/Facepager/wiki/Getting-Started-with-Wikidata-(writers-network) -- Wikidata to node/edge lists to Gephi.
- https://bodreader.web.ox.ac.uk/sites/default/files/bodreader/documents/media/session-six-worksheet.pdf -- Bodleian worksheet, Wikidata to Palladio.
- https://dhq.digitalhumanities.org/vol/15/1/000534/000534.html -- Conroy, DHQ 2021 on Palladio.
- https://hdlab.stanford.edu/palladio/releasenotes/2015-10-21 -- Palladio 1.1 last release.
- https://digitalinnovation.web.unc.edu/?p=3993 -- unclear status of Palladio.
- https://www.martingrandjean.ch/gephi-introduction -- Gephi letters exercise, Geo Layout and Inkscape.
- https://gephi.org/desktop/plugins/geolayout-plugin -- GeoLayout 1.0.1 for Gephi 0.10/0.11.
- https://docs.gephi.org/lite/user-manual/differences-with-gephi -- Gephi Lite limits.
- https://gephi.org/ -- Gephi Lite v1.1 announcement (map backgrounds).
- https://gephi.org/faq -- Gephi Lite background map.
- https://seinecle.github.io/gephi-tutorials/generated-html/converting-a-network-with-dates-into-dynamic.html -- dynamic networks in Gephi.
- https://histecon.fas.harvard.edu/visualizing/index.html -- one edge per pair in Gephi.
- https://bookandbyte.universiteitleiden.nl/DMT/SNA/sna-exercises.php -- Leiden Palladio and Gephi exercises.
- https://alice.endicott.edu/assignment_groups/63 -- Salem trials student network.
- https://sites.duke.edu/earlymodernlondon/london-literary-network/ -- imprint network, ID scheme.
- https://www.jessesadler.com/post/network-analysis-with-r/ -- R letters workflow.
- https://historicalnetworkresearch.github.io/lausanne/workshops -- 2024 Lausanne workshops (visual network analysis, nodegoat).
- https://tcdh.uni-trier.de/en/event/bring-your-own-data-lab-historical-network-analysis -- 2024 Mainz lab (Gephi 0.10, nodegoat, Python).
- https://cprog7.github.io/HNR_workshops -- Petz 2024 NetworkX tutorial, de Valeriola robustness pointer.
- https://projects.history.qmul.ac.uk/digital/?p=29 -- Protestant letters analysis.
- https://www.repository.cam.ac.uk/items/version/300 -- Tudor correspondence dataset.
- https://cofk.site.ox.ac.uk/articles/bring-transcriptions-letters-thomas-cromwell -- labor of disambiguation.
- https://www.helsinki.fi/en/helsinki-centre-for-digital-humanities/ryan-abstract -- NER over half a million letter records.
- https://culturalanalytics.scholasticahq.com/article/25943-the-measure-of-the-archive-the-ro-bustness-of-network-analysis-in-early-modern-correspondence.pdf -- Ryan and Ahnert robustness.
- https://digitalhumanitiesnow.org/2018/11/job-postdoc-networking-archives-queen-mary-university-of-london/ -- Networking Archives posting.
- https://ihpan.edu.pl/?p=32621 -- Warsaw DH postdoc.
- https://emlo.bodleian.ox.ac.uk/about -- EMLO.
- https://reviews.history.ac.uk/review/1316 -- Hartlib record counts.
- https://www.ebsco.com/articles/history/43254ed7-1de2-5d0c-81bb-f9002abf19b2/searching-for-missing-links-in-the-republic-of-letters-vossius-and-the-dutch-dimension-of-hartlib-s-circle -- shared-correspondent analysis.
- https://www.neh.gov/humanities/2013/novemberdecember/feature/mapping-the-republic-letters -- Republic of Letters findings.
- https://arxiv.org/abs/2112.04336 -- 150,000-letter dataset.
- https://encoding-correspondence.bbaw.de/v1/CMIF.html -- CMIF fields.
- https://nodegoat.net/blog.s/43/how-to-store-uncertain-data-in-nodegoat-incomplete-source-material -- uncertainty in nodegoat.
- https://nodegoat.net/blog.p/82.m/go/28 -- ChronoJSON and EDTF limits.
- https://nodegoat.net/blog.s/tag/historical+network+research -- temporal traversal, GRIMMWELT size.
- https://www.kcl.ac.uk/factoid-prosopography/about -- factoid model.
- https://database.FactGrid.de/wiki/Help:How_do_I_feed_data_into_FactGrid%3F -- conflicting statements side by side.
- https://www.frontiersin.org/articles/10.3389/fcomm.2023.1305137/full -- uncertainty encodings and tool limits.
- https://www.cmu.edu/news/stories/archives/2015/october/francis-bacon-launch.html -- Six Degrees size.
- https://www.english.cam.ac.uk/spenseronline/review/item/45.3.18 -- Six Degrees reproducibility.
- https://scottmurray.org/work/kindred-britain -- Kindred Britain retirement.
- https://www.informationisbeautifulawards.com/showcase/241-kindred-britain -- Kindred Britain size.
- https://linkedjazz.org/?p=574 -- transcript excerpt per edge.
- https://poms.kdl.kcl.ac.uk/documents/91/10-Closing-Thoughts.pdf -- charter-witness two-mode.
- https://journalofdigitalhumanities.org/1-1/demystifying-networks-by-scott-weingart/ -- Weingart cautions.
- https://halshs.archives-ouvertes.fr/halshs-00521527 -- Lemercier.
- https://newleftreview.org/issues/ii68/articles/franco-moretti-network-theory-plot-analysis -- Moretti character networks.
- https://www.uni-potsdam.de/fileadmin01/projects/lit-19-jhd/Dokumente/Trilcke_-_Social_Network_Analysis_als_Methode_einer_textempirischen_Literaturwissenschaft.pdf -- Trilcke critique.
- https://arxiv.org/abs/1907.02704v5 -- Labatut and Bost, character network extraction.
- https://archive.linux.duke.edu/cran/web/packages/rdracor/readme/README.html -- rdracor functions and metrics.
- https://rdrr.io/cran/rdracor/man/get_net_cooccur_edges.html -- co-occurrence edge weight = shared scenes.
- https://dh-abstracts.library.virginia.edu/works/11766 -- co-presence vs co-reference networks (Kleist).
- https://arxiv.org/abs/2502.19590 -- A City of Millions, LLM-extracted networks.
- https://arxiv.org/html/2505.10798v1 -- AffilKG, LLM extraction from social registers, F1 and errors.
- https://ceur-ws.org/Vol-4304/short2.pdf -- Norcia newspaper knowledge graph with LLMs.
- https://arxiv.org/pdf/2506.15241v1 -- classical Chinese relation extraction, F1 and hallucination.
- https://digital.lib.washington.edu/researchworks/handle/1773/44845 -- NER problems on early modern letters.
- https://www.cambridge.org/core/journals/journal-of-chinese-history/article/harvesting-big-biographical-data-for-chinese-history-the-china-biographical-database-cbdb/066593EBDCEDBADD5FCCE968D64EA76E -- Tsui and Wang 2020, about 470,000 individuals.
- https://fairbank.fas.harvard.edu/research/blog/introducing-the-china-biographical-database-cbdb/ -- 515,488 individuals (Dec 2021).
- https://cbdb.hsites.harvard.edu/resource/cbdbusersguidepdf -- CBDB guide: SQLite, kinship and social network queries.
- https://cbdb.hsites.harvard.edu/resource/normalizationofkinshiprelationstoenrichfamilynetworkanalysispdf -- kin normalization, 484,066 relations, 255,149 persons.
- https://escholarship.org/content/qt5p57j1jm/qt5p57j1jm.pdf -- Menezes et al. 2016.
- https://dlib.si/stream/URN:NBN:SI:DOC-7VRCE0CW/a6b4ecf9-7ca9-41a5-9e34-9fe88141a2ca/PDF -- Mrvar and Batagelj, relinking marriages, p-graphs.
- https://sites.google.com/site/ucinetsoftware/datasets/ragusan-nobility-genealogy -- Ragusan GEDCOM, Pajek Ore import.
- https://journals.aau.dk/index.php/ak/article/download/2684/2116/9131 -- Roued-Cunliffe 2017, GEDCOM structure.
- https://arxiv.org/html/2606.18210 -- Kinsources networks.
- https://sourceforge.net/p/simpa-puck/ -- Puck.
- https://csac.anthropology.ac.uk/bin/Research/Kinsources?rev=1.1 -- Kinsources repository.
- https://www.cambridge.org/core/services/aop-cambridge-core/content/view/33B5AB5D5282DA60F080631646E464E6/9781009170666c1_1-25.pdf/introducing_network_science_for_archaeology.pdf -- Brughmans and Peeples 2023.
- https://static.cambridge.org/content/id/urn:cambridge.org:id:article:S0003598X23001230/resource/name/S0003598X23001230sup002.pdf -- Davis R code after Peeples.
- https://www.inf.uni-konstanz.de/exalgo/group/habiba/papers/submission.pdf -- similarity measures, SWSN data.
- https://vistorian.github.io -- Vistorian.
- https://www.3blmedia.com/news/generations-come-ancestry-publishes-2025-impact-report -- Ancestry subscribers and DNA network size.
- https://www.familysearch.org/en/newsroom/company-facts -- FamilySearch Family Tree.
- https://gramps.discourse.group/t/printable-visualization-of-the-complete-family-tree/2260 -- whole-tree poster.
- https://gramps.discourse.group/t/relationship-graph-immediately-freezes-application/4007 -- report freezes.
- https://gramps.discourse.group/t/family-lines-graph-feature-request/4902 -- people of interest without their relations.
- https://gramps.discourse.group/t/distinguish-birth-vs-foster-children-in-family-lines-graph/8127 -- dotted non-birth lines only in Relationship Graph.
- https://gramps.discourse.group/t/how-to-edit-out-the-circles-in-the-graph-view/5446 -- family-node ellipses.
- https://gramps.discourse.group/t/exporting-the-graph-view-add-on/4059 -- .gv export, graphviz2drawio, yEd suggestions.
- https://github.com/hewettp/GrampsCrossing -- reorders Gramps .gv files to cut crossings.
- https://vmiklos.hu/ged2dot/ -- ged2dot: individuals and families as Graphviz nodes.
- https://pypi.org/project/kimon-gedgraph/ -- GedGraph: relationship path, adoptive links dotted, privacy.
- https://yed.yworks.com/support/manual/layout/layout_family_tree.html -- yEd family tree layout options.
- https://www.family-historian.co.uk/help/fh7/duplicateoptionsdialog.html -- duplicate boxes and ribbons.
- https://fhug.org.uk/kb/kb-article/an-overview-of-diagrams-and-charts/ -- Family Historian diagram types.
- https://support.mackiev.com/754878-Ordering-Printed-Charts-through-Family-ChartMasters -- PDF to large-format chart printer.
- https://www.danaleeds.com/the-leeds-method -- Leeds method.
- https://dna-explained.com/2018/09/26/the-leeds-method/ -- Leeds method steps and cM range.
- https://dna-explained.com/2018/12/04/autoclustering-by-genetic-affairs/ -- AutoCluster grid, files, thresholds, match counts.
- https://magazine.myheritage.com/myheritage-news/introducing-autoclusters-for-dna-matches/ -- MyHeritage AutoClusters steps.
- https://familylocket.com/10-ways-to-group-your-dna-matches-into-genetic-networks -- ten grouping methods.
- https://familylocket.com/creating-gephi-network-graphs-part-1-gather-matches-and-prepare-spreadsheets -- DNAGedcom files, cM range.
- https://familylocket.com/creating-network-graphs-with-gephi-part-2-importing-spreadsheets-and-layouts -- Gephi import and layouts.
- https://familylocket.com/creating-network-graphs-with-gephi-part-5-analyze-the-network-graph -- labeling clusters.
- https://dnapainter.com/help/wato-faq -- What Are the Odds hypotheses.
- https://dhintro18.commons.gc.cuny.edu/2018/10/31/gephi-java-error -- student Gephi Java error.
