# Text and Qualitative Data Networks

People in this population start from words, not from node and edge tables. Five groups do so in different ways:

1. **Text-network researchers** turn running text (interview transcripts, open-ended survey answers, tweets, abstracts,
   a novel, a policy document) into a word co-occurrence network to see what a corpus is about.
2. **Qualitative researchers** code transcripts in a qualitative data analysis (QDA) package (ATLAS.ti, MAXQDA, NVivo,
   Dedoose) and use graphs in two separate ways: they _compute_ how codes co-occur across quotations, and they _draw_
   theory or concept networks by hand, linking codes, quotations and memos with named, directed relations such as "is
   cause of" or "contradicts". The second is authoring, not computing.
3. **Quantitative ethnographers** feed coded utterances into epistemic network analysis (ENA) and compare two groups'
   code networks on one shared node layout with a statistical test. Coding is increasingly automated (regular-expression
   classifiers, GPT-4, topics).
4. **Corpus linguists** build collocation networks outward from one seed word, with edge length set by an association
   statistic and a concordance under every collocate.
5. **Computational social scientists** turn topic models or text embeddings into topic-correlation, topic-hierarchy or
   document-similarity networks, inside a loop of computational detection and close reading.

All of them treat the graph as a lens on text and go back from a node or an edge to the passages behind it before they
claim anything. Every graph is built by a pipeline with many choices (unit, window, measure, threshold, coder) that
change what it shows.

Related coverage elsewhere: discourse network analysis of policy debates is in `academic-social-network-research.md`
section 5.7. Coding interview transcripts into a causal map (the Causal Map app, causal loop diagrams) is in
`systems-and-stakeholder-mapping-civic.md` Workflow I; it is the nearest case to the hand-built QDA networks in 5.4
here, but its edges are coded causal claims aggregated across sources, while a QDA network is one analyst's drawn
theory. Keyword co-occurrence from bibliographic fields is in `bibliometrics-and-science-mapping.md`; named-entity graphs
from documents are in `data-preparation-and-import.md` section 4.13; thresholding a similarity or correlation matrix
into a graph is in `data-preparation-and-import.md` section 4.5.

## 2. Population

**Who they are.**

- _Text-mining social scientists and health researchers_ using KH Coder, a free tool "for quantitative content analysis
  or text mining" [KHC-SITE]. Its author's list counts "more than 3500 academic research papers"; Wikipedia counts
  "more than 500 English research papers" in Google Scholar [KHC-WIKI]. The 3,500 figure is self-compiled and dated, so
  treat it as a floor for a population largest in Japan and East Asia. Example: daily co-occurrence networks from
  82,905 fear-related tweets after Fukushima [YAGAHARA-2018].
- _Qualitative researchers in health, nursing, education, psychology and organization studies_ who code interviews,
  focus groups and open-ended answers in ATLAS.ti, MAXQDA, NVivo or Dedoose. A content analysis of 763 articles
  (1994-2013) that used ATLAS.ti or NVivo found most used the software "for data management and analysis", fewer "to
  visually display their methods" [WOODS-2016]. Every major package ships a hand-drawn network editor: ATLAS.ti
  Networks [ATLAS-RELATIONS], MAXQDA MAXMaps [MAXMAPS-OBJECTS], NVivo concept maps [NVIVO-CONCEPT]. No source gives
  the share of researchers who open a network view, computed or drawn; "no source found".
- _Quantitative ethnographers and learning-analytics researchers_ using ENA. A systematic review found 76 empirical ENA
  studies in education from 2010 to 2021, "most" on "small samples with manually coded interactions" [ELMOAZEN-2022];
  a science-education scoping review found 19 [SCIED-ENA-2024]. Uses outside education: surgical training
  [ENA-SURGERY], patient interviews [ZORGO-2023], nursing-assistant interviews [NURSING-ENA-2024], clinical team
  simulations [ENA-SPATIAL-2021]. The community has its own conference (ICQE) [ISQE-PRECONF]. It is moving to
  automated coding: nCoder, "the most widely used automated coding tool in the QE community", builds regular-expression
  classifiers that are then generalized "to code the entire dataset" [ICQE-NCODER-GPT]; TopicENA (2026) replaces manual
  concept coding with BERTopic topics because manual coding "limits its scalability" [TOPICENA-2026].
- _Corpus linguists and corpus-based discourse analysts_ using #LancsBox GraphColl, whose collocation networks are
  taught in Lancaster's corpus linguistics exercises on the BNC2014 [LANCSBOX-EX] and introduced in the International
  Journal of Corpus Linguistics [BREZINA-2015]. No user count found.
- _Computational social scientists_ using structural topic models (R `stm`) [STM-TOPICCORR], BERTopic [BERTOPIC-VIS]
  or document embeddings [GDELT-EMB]. Nelson's computational grounded theory is the standard method reference for
  combining these with close reading [NELSON-2020]. No count of who draws the topic networks; "no source found".
- _Writers, strategists and knowledge workers_ using InfraNodus, a commercial text-network product developed "since
  2011" [INFRANODUS-METHOD]; its Obsidian plugin has about 35,000 downloads (cited in
  `personal-knowledge-graphs-and-note-networks.md`).
- _Digital humanists_ using Gephi via Nocodefunctions or Cowo [GEPHI-TEXT], Voyant Links [VOYANT-LINKS], R (quanteda,
  textnets) [QUANTEDA-NET] [BAIL-TEXTNETS] or Python (textnets, EmoAtlas) [TEXTNETS-PY] [PASSARO-2026].
- _Regional communities_: IRaMuTeQ's "analise de similitude" in Brazilian and French health and psychology
  [IRAMUTEQ-PT]; Leximancer concept maps in Australian business and health research [LEXIMANCER-FAQ].

**Market context.** QDA software market estimates of about $1.2 to $1.7 billion disagree [QDA-MARKET]; MAXQDA reports
users in 192 countries [MAXQDA-COMPARE]. Vendor numbers, not usage of network views.

**How often they touch graph tools.** Per project. A qualitative study codes for weeks, builds and redraws its concept
network as the theory develops, and opens the co-occurrence view near the end; a KH Coder study produces a handful of
figures; an ENA study builds one model and iterates on parameters; a corpus linguist runs many GraphColl searches per
session. No source gives frequencies.

**Skill profile.** High domain and interpretive skill; low to moderate graph literacy. ATLAS.ti's manual has to explain
that its c-coefficient "is not the same as" a Pearson correlation [ATLAS-CCOEF]; KH Coder's warns that "words plotted
close to each other do not always mean they have a strong co-occurrence" [KHC-MANUAL]; Brezina et al. warn that with
MI "we need to be careful not to infer (uni)directionality" from the arrow [BREZINA-2015]. Most are no-code GUI users;
a minority use R (rENA, quanteda, stm, rock) or Python (textnets, BERTopic).

**Team context.** Two to four coders who measure agreement (Cohen's kappa 0.863 over 810 utterances
[NURSING-ENA-2024]; four coders on 510 survey responses [CHEN-2024]); increasingly a model as a further coder, with
its agreement measured the same way [ICQE-NCODER-GPT]; a principal investigator who owns the codebook; journal
reviewers who ask how the network was built.

## 3. Personas

### 3.1 Dr. Aiko Morimoto -- corpus-to-word-network researcher (id: text-network-analyst)

- **Role.** Associate professor of public health in Japan; supervises three master's students.
- **Tools and data.** KH Coder (MeCab or Stanford tagger, R for plots) [KHC-WIKI], Excel, sometimes Gephi. Open-ended
  survey answers (hundreds to thousands), tweets (tens of thousands) split by day or group [YAGAHARA-2018], document
  variables (age group, day, region). A student runs `stm` for the same corpus and wants its topic network beside hers.
- **Goals.** A figure of the main word clusters and how they differ between groups or days; a paragraph per cluster
  backed by quotations.
- **Frustrations.** Each figure is a static R plot; changing unit or threshold means re-running and re-reading; colors
  change with the community method [KHC-MANUAL]; reviewers ask why Jaccard and why 0.1.

### 3.2 Dr. Rosa Delgado -- qualitative researcher who builds concept networks and maps code co-occurrence (id: qualitative-code-network-researcher)

- **Role.** Health-services researcher; leads four coders on a stigma or patient-experience study.
- **Background.** Thematic analysis and grounded theory; ATLAS.ti or MAXQDA for coding, Dedoose in team projects.
  Composite drawn from Chen et al. (510 responses, four coders, Dedoose export to Gephi with ForceAtlas2 and Louvain)
  [CHEN-2024], Networked Grounded Theory (ATLAS.ti plus Gephi communities) [BRAILAS-2014], and the ATLAS.ti network
  editor's relation vocabulary [ATLAS-RELATIONS].
- **Data.** 20-60 interviews or several hundred open-ended answers; 30-150 codes in groups; memos; participant
  attributes. Increasingly, model-suggested codes accepted or rejected per segment [ATLAS-AISUGGEST] [MAXQDA-AICODING].
- **Goals.** Draw her emerging theory: categories as nodes, "is cause of", "is part of", "contradicts" as typed
  arrows, each link backed by quotations and explained in a comment; see which themes travel together by subgroup; a
  clean figure for the paper.
- **Frustrations.** The drawn network and the computed co-occurrence are separate views; co-occurrence matrices "could
  work well for interviews involving smaller samples, but exhibit slow performance or poor interpretability for large
  datasets" [CHEN-2024]; the trip to Gephi loses the quotations; ATLAS.ti Web views "cannot currently be exported"
  [ATLAS-WEB]; QDPX project exchange drops NVivo relationship types and MAXQDA's "complex concept maps"
  [NVIVO-REFI] [MAXQDA-REFI], so a drawn theory cannot move between packages.

### 3.3 Dr. Sam Okafor -- quantitative ethnographer (id: epistemic-network-analyst)

- **Role.** Learning-sciences or medical-education researcher comparing how two groups (novices and experts, high and
  low performers) connect ideas in talk.
- **Background.** Trained at an ENA workshop; ENA web tool for exploring, rENA in R for papers; nCoder or GPT-4 when the
  data are too large to hand-code [ICQE-NCODER-GPT].
- **Data.** One row per utterance, metadata columns and 3-10 binary code columns; 10-50 units. Examples: RS.data, 48
  students, 6 codes [TAN-2024]; 26 patient interviews, 5 of 52 codes [ZORGO-2023]; 810 utterances, 4 codes
  [NURSING-ENA-2024]. Automated coding keeps the code count small but lets one edge rest on thousands of lines.
- **Goals.** Show that two groups' networks differ, where (subtracted network) and how strongly (t test or
  Mann-Whitney, effect size), and confirm with quotations.
- **Frustrations.** Many interacting parameters (window, conversation, rotation); the web guide documents them thinly
  [ENA-GUIDE-CODES]; "subtraction networks should always be visualized along with the two networks being subtracted"
  [TAN-2024], three figures per comparison; no view that sets a human-coded and a machine-coded model side by side.

### 3.4 Dr. Eleanor Price -- corpus linguist (id: corpus-linguist)

- **Role.** Lecturer in corpus-based discourse analysis; teaches GraphColl to undergraduates.
- **Tools and data.** #LancsBox X with reference corpora (BNC2014) and her own specialized corpora; CQL-style queries
  such as `[hw="drug" pos="N.*"]` [LANCSBOX-EX].
- **Goals.** Find the collocates of a word, the collocates two words share, and the discourses they point to; report
  the parameters in Collocation Parameters Notation so others can replicate [LANCSBOX-MAN].
- **Frustrations.** Graphs overpopulate (the manual contrasts "392 collocates" with "the top 10") [LANCSBOX-MAN];
  "there is no one definite set of collocates" [LANCSBOX-MAN], so every graph needs its parameters next to it.

## 4. Use cases (ranked)

| #   | Question answered with the graph                                                               | Who                                             | Frequency                  | Stakes                                                                           |
| --- | ---------------------------------------------------------------------------------------------- | ----------------------------------------------- | -------------------------- | -------------------------------------------------------------------------------- |
| 1   | Which passages support this link? (drill-back)                                                 | all                                             | Every session, many times  | High: validity rests on it [TAN-2024] [ATLAS-TUTORIAL]                           |
| 2   | How do my concepts relate (cause, part of, contradicts)? Draw the theory and keep its evidence | qualitative-code-network-researcher             | Throughout analysis        | High: the network becomes the reported model [ATLAS-NETCREATE] [ATLAS-RELATIONS] |
| 3   | What are the main topics in this corpus and which words carry them?                            | text-network-analyst                            | Per study, several figures | Medium: main figure [YAGAHARA-2018] [GEPHI-TEXT]                                 |
| 4   | Which codes co-occur, and does a cluster form a theme?                                         | qualitative-code-network-researcher             | Late in analysis           | Medium [CHEN-2024] [BRAILAS-2014]                                                |
| 5   | Do two groups connect the same codes differently?                                              | epistemic-network-analyst                       | Per study                  | High: the statistical claim [TAN-2024] [ZORGO-2023]                              |
| 6   | Does a machine coding give the same network as human coding?                                   | epistemic-network-analyst; qualitative          | Per study, growing         | High: validity of automated coding [ICQE-NCODER-GPT]                             |
| 7   | What does word X collocate with, and what do X and Y share?                                    | corpus-linguist                                 | Many per session           | Medium: discourse claims [LANCSBOX-MAN]                                          |
| 8   | Which topics co-occur in documents, and how do topics nest?                                    | computational social scientists                 | Per study                  | Medium [STM-TOPICCORR] [BERTOPIC-HIER]                                           |
| 9   | How did discussion change over time?                                                           | text-network-analyst; epistemic-network-analyst | Per study                  | Medium [YAGAHARA-2018] [RENA-ACCUM]                                              |
| 10  | Which words or codes bridge topics; where are the gaps?                                        | InfraNodus users                                | Daily to per project       | Low to medium [INFRANODUS-METHOD]                                                |
| 11  | Which documents share vocabulary or meaning?                                                   | computational social scientists                 | Per study                  | Medium [TEXTNETS-PY] [GDELT-EMB]                                                 |
| 12  | Is the network robust to preprocessing choices?                                                | reviewers, careful authors                      | Rare, should be per study  | High when asked [CRO-WINDOW] [VANECK-2009]                                       |

## 5. Step-by-step workflows

### 5.1 Corpus to word co-occurrence network in KH Coder

Sources: KH Coder manual [KHC-MANUAL]; developer answer [KHC-1108]; Yagahara et al. [YAGAHARA-2018].

1. **Prepare text.** One plain-text file or a spreadsheet column; new line = paragraph, period = sentence; `<H1>` to
   `<H5>` tags define higher units (news: H1 year, H2 month, H3 article); variables from a separate file. Yagahara
   filtered by 89 fear expressions, stripped user names and URLs, removed duplicates and bot retweets.
2. **Pre-process.** `Project > Run Pre-Processing` tokenizes and tags (ChaSen or MeCab for Japanese, Stanford for
   English); "force pick up" keeps phrases as one word, "force ignore" removes strings.
3. **Choose words** by part of speech and minimum frequency (Yagahara: 100-150 words); check them in the KWIC
   concordance (`Tools > Words > KWIC Concordance`), saved to CSV.
4. **Run `Tools > Words > Co-Occurrence Network`.** Choose the Unit (sentence, paragraph, H1-H5) -- "caution should be
   exercised"; words-words or words-variables. Edge strength is Jaccard; the developer recommends Jaccard for small
   units and Cosine or Euclid for large ones: "the size of computing unit is important rather than the size of dataset".
5. **Filter edges.** `Top (number)` (default "Top 60", for about 60-70 words) or `Jaccard coef. >=` 0.1 or 0.2. The
   status line reports drawn versus input counts: "Nodes 51 (71), Edges 90 (206), Density .071, Min. Jaccard .225".
6. **Encodings.** Line width by strength, node size by frequency; colors by centrality or by community (edge
   betweenness, random walks, modularity); 12 community colors at most; within-community edges solid, between dashed;
   optional minimum spanning tree; label overlap avoidance.
7. **Layout** is automatic: Fruchterman-Reingold (words-words) or Kamada-Kawai (words-variables); "whether or not the
   words are connected with lines (edges) is significant", not distance.
8. **Go back to text** with `Tools > Documents > Search Documents`; no source shows clicking a node to open passages.
9. **Repeat per group or period** (Yagahara: one network per day for seven days); each run has its own layout, so
   positions are not comparable.
10. **Export** EMF, EPS, PDF, PNG, SVG or "R Source"; no GraphML or edge-list export found; matrices to CSV or SPSS.

### 5.2 Corpus to semantic network in Gephi (Nocodefunctions, Cowo, or code)

Sources: Levallois [GEPHI-TEXT]; quanteda [QUANTEDA-NET]; textnets [TEXTNETS-PY].

1. **Decide what a term is**: words minus stopwords, n-grams, noun phrases, stems or lemmas.
2. **Decide how many**: "A ball park figure is 300 words max"; tf-idf for collections, "for specialists".
3. **Decide the unit**: sentence, paragraph or document ("you decide"); quanteda `fcm(context = "window", window = 5)`.
4. **Decide the weight**: binary or full counting; optionally PMI so rare terms that always co-occur get strong edges.
5. **Build**: Nocodefunctions (free web app, "no registration") returns a Gephi file [NOCODE-MEDIUM]; or quanteda
   `fcm_select` top 30 and `textplot_network(min_freq = 0.5)` (1,000-node limit); or textnets `Textnet(min_docs = 2)`,
   `project()`, disparity-filter backbone `alpha` 0.2-0.6, Leiden, `save_graph("file.gml")`, fixed seed.
6. **Visualize in Gephi** (1,484 PubMed abstracts to 250 terms and 19,613 relations): labels on, edges hidden "they
   clutter the view", nodes shrunk to 0.5, Modularity, color labels by community, ForceAtlas2, Expansion, Label Adjust,
   export PDF, PNG or SVG.
7. **Interpret**: "a cluster of terms characterizes a topic"; going back to text happens outside Gephi.

### 5.3 Coded segments to a computed code co-occurrence network (ATLAS.ti, MAXQDA, Dedoose to Gephi)

Sources: ATLAS.ti [ATLAS-TUTORIAL] [ATLAS-CCOEF] [ATLAS-VIS] [ATLAS-NETFN] [ATLAS-WEB]; MAXQDA [MAXQDA-CRB]
[MAXQDA-CODEMAP] [MAXMAPS-COOC]; Chen et al. [CHEN-2024].

1. **Code with comparison in mind**: codes per dimension, categories, participant or demographic codes "so you can
   compare groups later". Weeks of work; no source gives hours.
2. **ATLAS.ti `Analysis > Code Co-occurrence`.** Cells count quotations where both codes apply under five relations
   (overlap, overlapped by, within, enclose, same). Optional c-coefficient n12 / (n1 + n2 - n12); above 1 means
   overlapping quotations need cleaning; a yellow dot flags codes whose frequencies differ more than fivefold.
3. **Drill down**: "Click a cell to view its quotations"; "counts show frequency, not meaning". The Query Tool tests
   AND, OR, WITHIN, FOLLOWS and saves results as codes.
4. **Visualize**: Sankey (click an edge to its quotations, delete nodes or edges, Auto Layout), bar chart, or
   force-directed graph (Mac, Web); or "Add Co-occurring Codes" in a Network after setting a global filter. Web views
   cannot be exported.
5. **MAXQDA**: `Visual Tools > Code Relations Browser` in three modes (intersection, proximity within N paragraphs,
   same document); double-click a cell for its segments; `Code Map` places codes by MDS with average-linkage clusters
   saved as variables; adjacency matrix to .xlsx "for network tools such as Gephi". The MAXMaps **Code Co-Occurrence
   Model** puts selected codes on an inner circle and co-occurring codes on an outer circle, with a minimum
   co-occurrence filter, line width by frequency and symbol size by segment count; "Relations between the codes in the
   outer circle are ignored" [MAXMAPS-COOC].
6. **Leave for Gephi when built-ins fail.** Chen et al.: export from Dedoose, aggregate by incident or by person,
   nodes sized by frequency and colored by code family, ForceAtlas2, Louvain, subset by setting or attribute.
7. **Validate** by reading responses next to the network; once in Gephi the link to quotations is gone.

**Variant: AI-assisted coding before the co-occurrence step.** (a) ATLAS.ti: highlight a segment, the model proposes
codes, the researcher picks which to attach ("the AI suggests, but you decide") [ATLAS-AISUGGEST]. (b) MAXQDA: write
code memos that define each code ("AI Assist uses your code memos to understand how you define a code"), list the
segments or open-ended responses, run `AI Coding`, then approve or discard each suggestion in a table; the model's
explanation is saved as a comment on each newly coded segment [MAXQDA-AICODING]. MAXQDA 26.1 (February 2026) codes "a
code and up to 50 documents" at once [MAXQDA-261]. (c) Then compute co-occurrence as above. The provenance a network
needs therefore grows: who or what coded each segment, the model's explanation, and whether a human accepted it.

### 5.4 Hand-built conceptual network in a QDA package

Sources: ATLAS.ti manuals [ATLAS-NETCREATE] [ATLAS-RELATIONS] [ATLAS-NODESLINKS] [ATLAS-LINKING] [ATLAS-RELV9];
MAXQDA [MAXMAPS-OBJECTS] [MAXMAPS-CSS]; NVivo [NVIVO-CONCEPT].

This is the theory-building use of a graph: nodes are placed and linked by the analyst, not computed.

1. **Create a network** (`Network Manager > Create Network` on Windows, `New > New Network` on Mac) and name it; often
   one per category or code group. Not available in ATLAS.ti Web [ATLAS-NETCREATE].
2. **Add nodes** by dragging codes, quotations, memos, documents, groups or other networks into the editor; "A single
   code, memo, or quotation can appear in multiple networks" [ATLAS-NETCREATE]. Groups act as filters and cannot be
   linked [ATLAS-NODESLINKS].
3. **Link nodes**: drag the dot in a node's corner onto another node; for code-code or quotation-quotation links a
   relation list opens, or `Create Relation` [ATLAS-LINKING]. Preset code relations: "is associated with" and
   "contradicts" (symmetric), "is part of", "is cause of", "is a" (asymmetric), "noname", "is property of"
   [ATLAS-RELATIONS]. Quotation-quotation links ("hyperlinks") carry relations such as "explains" or "supports",
   which is how a link is itself evidence [ATLAS-NODESLINKS].
4. **Define relations**: each has name, short and symbolic labels, line width and color, a property and a preferred
   layout direction; editing a relation changes "all links using it" [ATLAS-RELATIONS]. Properties differ by version:
   the v9 manual offers transitive, symmetric or asymmetric and says "Transitive relations enable semantic retrieval"
   [ATLAS-RELV9]; the v22 Mac manual lists only symmetric and asymmetric [ATLAS-RELATIONS].
5. **Edit links**: comment ("why the nodes are linked"), reverse direction, change relation, unlink; code-code links
   have names, authors and comments, while coding, memo and hierarchical links are "second-class" with no properties
   [ATLAS-LINKING] [ATLAS-NODESLINKS].
6. **Manage links in the Link Manager**: every code-code link and every quotation hyperlink in one list; filter by
   relation, comment, change relation [ATLAS-LINKING] [ATLAS-NETCREATE].
7. **Mind the code tree**: hierarchical code-code links drawn in a network change the hierarchy of codes and folders
   across the whole project [ATLAS-NODESLINKS].
8. **Arrange**: automatic circular, hierarchical or left-right layouts, or by hand; align and distribute tools
   [ATLAS-NETCREATE].
9. **Export** PNG, JPG, PDF or XPS (Windows) or image or print (Mac) [ATLAS-NETCREATE]; the whole project travels as
   QDPX, but NVivo does not transfer "relationship codes" and "relationship types" and MAXQDA's QDPX excludes "complex
   concept maps" [NVIVO-REFI] [MAXQDA-REFI].

**MAXMaps and NVivo.** MAXMaps: create a map, drag codes, memos, documents and coded segments onto it, draw links in
link mode, add free objects; links made in a map "are not repeated in the project" [MAXMAPS-OBJECTS]. Model templates
generate starting maps, among them the Code Co-Occurrence Model (5.3) and the Code-Subcodes-Segments Model, which puts
one code at the center, subcodes around it and up to N coded segments as their own nodes, chosen by priority or size,
labelled by their text or comment [MAXMAPS-CSS]. NVivo concept maps: shapes for concepts plus project items, connectors
dragged between them and labelled with F2; project items "are not linked to your data" [NVIVO-CONCEPT].

**What this needs from a graph tool**: hand placement, typed directed edges from an editable vocabulary, mixed node
types (code, quotation, memo, document), edges with comments, and opening the quotations behind any node or link.

### 5.5 Group comparison with epistemic network analysis (ENA web tool or rENA)

Sources: Tan et al. [TAN-2024]; ENA web guide [ENA-GUIDE] [ENA-GUIDE-DATA] [ENA-GUIDE-CONV] [ENA-GUIDE-STATS]
[ENA-GUIDE-PLOT]; Zorgo and Peters [ZORGO-2023].

1. **Segment and code.** One sentence per line ("transcription is a form of data transformation"), stanza breaks,
   several codes per line, coded in iROCK, which runs locally so data are not uploaded; merge coders with
   `rock::merge_sources()`; measure agreement.
2. **Build the table**: one row per line, IDs, text, metadata, one 0/1 column per code; CSV, XLSX, XLS or Rdata; at
   least three codes [ENA-GUIDE-CODES].
3. **Units** (whose network: `c("Condition", "UserName")` gives 48), **conversations** (which lines may connect).
4. **Window**: moving stanza (web default 4 lines), whole conversation, infinite or threaded; the R chapter uses
   `window.size.back = 7`. Window choice is a research topic of its own [SIEBERT-2017].
5. **Groups and rotation**: `mean = TRUE` puts the group difference on the x axis; otherwise SVD; sphere normalization.
6. **Model**: co-occurrences accumulate per unit, are normalized and reduced; "all ENA networks from the same model have
   the same node positions".
7. **Plot**: mean network per group, then the subtracted network colored by the larger side; minimum edge weight,
   scaling, hide unconnected codes; points with 95% confidence intervals.
8. **Test**: Welch t and Mann-Whitney with effect size (MR1 t(45.31) = -6.52, d = 1.88, N = 26 and 22); "Write Up"
   generator.
9. **Fit**: "most ENA models have a goodness of fit that is well above 0.90".
10. **Close the interpretive loop**: `view()` shows the lines behind a unit's connection; authors quote them.
11. **Reuse**: points into a regression; ordered network analysis (ONA) is the directed variant with self-loops.

**Variant: automated coding at scale.** (a) nCoder: define a code, write regular expressions, compare classifier and
human on a training set, inspect disagreements, refine, then test on unseen lines and, once agreement is high enough
(kappa, precision, recall, Shaffer's rho), code the whole dataset. In one study on government COVID-19 speeches,
nCoder reached test kappa 0.53 and GPT-4 0.46; nCoder had higher precision (0.79 vs 0.52), GPT-4 higher recall (0.8),
on 100 training and 100 test lines [ICQE-NCODER-GPT]. (b) TopicENA: fit BERTopic, use topics as codes, tune topic
granularity (coarse for large datasets) and the inclusion threshold, then run ENA [TOPICENA-2026]. (c) Steps 2-11 as
above. The study then needs to show both codings and where their networks disagree.

### 5.6 Text network with gaps and drill-back (InfraNodus)

Sources: [INFRANODUS-METHOD] [INFRANODUS-HOW] [INFRANODUS-DOCS].

1. Paste text (as little as a 100-word abstract). 2. Stopwords removed, lemmas merged, synonym list. 3. A 4-word
   window links lemmas with weights 3, 2, 1 by distance. 4. ForceAtlas, Louvain topics, node size by betweenness.
2. "Structural gaps" between clusters; a GPT model writes a bridging question. 6. Selecting a keyword shows its text;
   removing hubs reveals concepts underneath; CSV and GEXF import, topic-tagged statements export.

### 5.7 Seeded collocation network (corpus linguistics, #LancsBox GraphColl)

Sources: #LancsBox X manual [LANCSBOX-MAN]; exercise sheet [LANCSBOX-EX]; Brezina, McEnery and Wattam [BREZINA-2015].

1. **Load a corpus** (or select one such as BNC2014); in the 2015 tool imported corpora "are considered atomic".
2. **Set the unit** (word, lemma, headword, part of speech) and the **span** (words to the left and right, for example
   L5-R5). Switching from 'word (lowercase)' to 'lemma' is an exercise step because it changes the graph [LANCSBOX-EX].
3. **Search the node word** or a query (`[hw="drug" pos="N.*"]`). A table and a graph appear; the table is sorted and
   filtered by logDice by default. All measures are computed at once (MI, MI2, MI3, log-likelihood, Delta P and others;
   14 statistics in 26 equations, and user-defined ones) [LANCSBOX-MAN] [BREZINA-2015].
4. **Set thresholds**: statistic cut-off, minimum collocate and collocation frequency; "overpopulated" graphs are fixed
   by stricter thresholds or a graph filter (392 collocates versus the top 10) [LANCSBOX-MAN].
5. **Read the graph**: edge length = association strength ("magnet effect", shorter is stronger); circle size =
   collocation frequency; color = corpus frequency (blue to red); position left or right = where the collocate occurs
   in text, middle when both; overlapping collocates spread out. Right-click a table column to assign it to a graph
   dimension [LANCSBOX-MAN] [LANCSBOX-EX].
6. **Hover a collocate** for a KWIC preview of its lines with the node [LANCSBOX-MAN].
7. **Expand into a network**: double-click a collocate (it becomes a node) or search more nodes; shared collocates move
   to the middle, unique ones to the rim; an "i" icon lists shared collocates [LANCSBOX-MAN]. The 2015 tool colored
   fully searched words red and unexpanded collocates purple [BREZINA-2015].
8. **Mind direction**: arrows show direction only with a directional measure such as Delta P and only when both words
   have been searched [BREZINA-2015].
9. **Report and export** in Collocation Parameters Notation, for example `4b-MI2(3), L5-R5, C5-NC1; function words
removed`, saved with results; the 2015 tool exported collocate lists as CSV and the graph as GraphViz dot or an
   image [LANCSBOX-MAN] [BREZINA-2015].

### 5.8 Topic model or embeddings to a topic or document network

Sources: stm [STM-TOPICCORR] [STM-PLOT]; BERTopic [BERTOPIC-VIS] [BERTOPIC-HIER]; Nelson [NELSON-2020]; GDELT
[GDELT-EMB]; Welbers network-tools [WELBERS-SIM].

Frame (computational grounded theory): "pattern detection" by inductive computational exploration, "pattern
refinement" that "returns to an interpretive engagement with the data", and "pattern confirmation" with further
computational methods [NELSON-2020]. The networks below are detection tools; refinement means reading documents behind
a topic or an edge.

1. **stm topic correlations.** Fit a model with K topics; `topicCorr(model, method = "simple", cutoff = 0.01)`
   thresholds the topic-proportion correlations, or `method = "huge"` selects edges with a graphical model
   (Meinshausen-Buhlmann, penalty chosen by RIC to limit false positives) [STM-TOPICCORR]; `plot()` is "a thin wrapper"
   around igraph, Fruchterman-Reingold by default, labels "Topic #", vertex size per topic [STM-PLOT]. The interactive
   add-on stmCorrViz was "Archived on 2025-06-17" from CRAN [STMCORRVIZ], so the static plot is what remains.
2. **BERTopic.** `visualize_topics()` embeds topics' c-TF-IDF in 2D with UMAP (an intertopic distance map);
   `visualize_hierarchy()` clusters topics with Ward linkage on 1 - cosine similarity, with a `color_threshold`;
   `visualize_heatmap()` shows topic similarity [BERTOPIC-VIS] [BERTOPIC-HIER].
3. **Document similarity network.** Build a document-by-feature matrix (tf-idf, topic proportions or embeddings),
   compute pairwise similarity, keep pairs above a threshold (`min.similarity`) or each node's k nearest neighbors,
   group by period, export to Gephi [WELBERS-SIM]. GDELT: 19,598 vaccine articles, 384 million cosine comparisons, kept
   pairs between 0.6 and 0.99, top 16,000 edges, OpenOrd in Gephi; the result was "many tiny isolated clusters" and the
   author suggests UMAP or t-SNE for embeddings [GDELT-EMB]. Thresholding choices are covered in
   `data-preparation-and-import.md` section 4.5.
4. **Refine and confirm**: read documents for each topic or cluster, then test with other methods [NELSON-2020].

### 5.9 Other tools (short notes)

- **Leximancer**: context block "2 sentences, but not crossing paragraph boundaries"; spring layout; theme circles whose
  size "has no bearing" on prevalence [LEXIMANCER-FAQ] [SMITH-2006].
- **IRaMuTeQ**: similarity analysis graph; corpus preparation "affects directly the quality and stability of results"
  [IRAMUTEQ-PT].
- **NVivo**: cluster analysis of files, codes or cases (Jaccard, Sorensen, Pearson), dendrogram or 2D/3D map, called
  exploratory [NVIVO-CLUSTER].
- **Voyant Links**: collocates within 5 words as a force-directed graph [VOYANT-LINKS].
- **AutoMap and ORA**: delete lists, thesauri, window size, meta-networks [AUTOMAP].
- **EmoAtlas forma mentis networks**: syntactic distance up to k = 4 instead of a window [PASSARO-2026].

## 6. Data

**Sources.** Interview and focus-group transcripts; open-ended survey answers; social media posts; news, speeches and
policy documents; abstracts; literary texts; reference corpora (BNC2014); chat logs; video-coded team talk.

**Formats in.** Plain text and Word; spreadsheets with a text column; QDA projects and QDPX [NVIVO-REFI]; code-by-code
matrices (XLSX), MAXQDA adjacency matrix; ATLAS.ti XML [BRAILAS-2014]; KH Coder document-word matrices [KHC-MANUAL];
`.rock` files [ZORGO-2023]; ENA utterance tables [ENA-GUIDE-DATA]; topic-by-document proportion matrices and topic
correlation matrices [STM-TOPICCORR]; document embedding matrices and pairwise similarity edge lists [GDELT-EMB]
[WELBERS-SIM]; collocation tables with statistics [LANCSBOX-MAN].
**Formats out.** Images (EMF, EPS, PDF, PNG, SVG, JPG, XPS); R source [KHC-MANUAL]; GML, GEXF [TEXTNETS-PY]; GraphViz
dot [BREZINA-2015]; XLSX with coordinates [MAXQDA-CODEMAP]; CPN strings [LANCSBOX-MAN]; no standard format carries
passages or a relation vocabulary across packages [NVIVO-REFI] [MAXQDA-REFI].

**Sizes.**

| Case                          | Corpus                                                        | Graph                                                                             |
| ----------------------------- | ------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| KH Coder manual               | one novel                                                     | 51 of 71 words, 90 of 206 edges [KHC-MANUAL]                                      |
| Fukushima tweets              | 82,905 tweets, 7 days                                         | 100-150 words per day, Jaccard >= 0.1 [YAGAHARA-2018]                             |
| Gephi tutorial                | 1,484 abstracts                                               | 250 terms, 19,613 edges [GEPHI-TEXT]                                              |
| Readable ceiling              | --                                                            | about 300 words [GEPHI-TEXT]; quanteda cap 1,000 nodes [QUANTEDA-NET]             |
| Stigma survey                 | 510 responses, 4 coders                                       | code families (count not given) [CHEN-2024]                                       |
| ENA RS.data                   | 48 students                                                   | 6 codes, 48 unit networks [TAN-2024]                                              |
| ENA nursing                   | 810 utterances                                                | 4 codes [NURSING-ENA-2024]                                                        |
| nCoder vs GPT-4               | speeches from 7 countries                                     | 100 training and 100 test lines per code before coding the rest [ICQE-NCODER-GPT] |
| MAXQDA AI Coding              | up to 50 documents per run                                    | codes unchanged; segments grow [MAXQDA-261]                                       |
| TopicENA                      | "substantially larger" than prior ENA (count not in abstract) | topics as nodes [TOPICENA-2026]                                                   |
| GraphColl, alcohol in BNC2014 | reference corpus                                              | 15,221 candidates, 94 collocates pass [LANCSBOX-EX]; 392 vs top 10 [LANCSBOX-MAN] |
| Document embeddings           | 19,598 articles                                               | 16,000 edges kept [GDELT-EMB]                                                     |

So: code networks are small (3-150 nodes), but with automated coding each edge can rest on thousands of segments;
hand-built concept networks hold tens of nodes of mixed type; word and collocation networks are 10-300 drawn nodes cut
from vocabularies of thousands; document networks run to tens of thousands of nodes.

**Graph properties.** Undirected and weighted for co-occurrence; directed for ONA, Delta P collocations and authored
relations; typed edges with a vocabulary in QDA networks; bipartite underneath and projected. Node attributes:
frequency, part of speech, code family, hierarchy path, node type (code, quotation, memo, document). Edge attributes:
count, weight, relation type, comment, author, the segments behind it, and for automated coding the coder (person or
model), model explanation and acceptance. Multi-group: one network per group, period or coding on a shared node set.

**Identifier problems.** Node identity comes from preprocessing: lemma versus word form (a GraphColl setting), multi-word
terms, synonyms, Japanese segmentation, homonyms [YAGAHARA-2018]; code renames and merges; duplicate names under
different parents [MAXQDA-CRB]; topic numbers that change when a model is re-fit.

**Sensitivity.** Transcripts are human-subjects data; iROCK runs locally "so data are not uploaded" [ZORGO-2023]; AI
coding sends text to a model provider [MAXQDA-AICODING]. A browser tool that never uploads the corpus is a requirement.

## 7. Analysis methods

- **Co-occurrence measures**: count; binary or full counting; Jaccard; Cosine and Euclid; c-coefficient; PMI; tf-idf;
  distance-weighted windows; ENA normalized vectors. Van Eck and Waltman favor association strength over cosine and
  Jaccard [VANECK-2009].
- **Collocation association measures**: logDice (GraphColl default), MI, MI2, MI3, log-likelihood, Delta P
  (directional), user-defined; span L and R; minimum frequencies [LANCSBOX-MAN] [BREZINA-2015].
- **Topic and embedding graphs**: topicCorr thresholding (cutoff 0.01) or graphical-model edge selection
  [STM-TOPICCORR]; Ward hierarchy over cosine distance [BERTOPIC-HIER]; similarity threshold or k nearest neighbors
  [WELBERS-SIM] [GDELT-EMB].
- **Thresholds and backbones**: top N, minimum coefficient, minimum spanning tree [KHC-MANUAL]; disparity filter
  [TEXTNETS-PY]; minimum co-occurrence [MAXMAPS-COOC]; minimum edge weight in ENA [ENA-GUIDE-PLOT].
- **Relation semantics**: symmetric, asymmetric, transitive relations and semantic retrieval along transitive links
  [ATLAS-RELV9].
- **Layouts**: Fruchterman-Reingold, Kamada-Kawai, ForceAtlas2, OpenOrd, MDS, ENA's fixed positions, concentric
  co-occurrence model, radial collocation graph with strength as length and text side as position, hand placement.
- **Communities and centrality**: Louvain, Leiden, edge betweenness, random walks; betweenness for bridging words;
  average-linkage clusters saved as code variables.
- **Statistics and agreement**: ENA tests, effect sizes, goodness of fit; Cohen's kappa, precision, recall, Shaffer's
  rho between human and machine coders [ICQE-NCODER-GPT].
- **Which choices change results**: window size changes diameter, path length and clustering [CRO-WINDOW]; construction
  method changes character networks [CHAR-NET-2016] [FICTION-HAL]; co-occurrence is "sensitive to window size"
  [PASSARO-2026]; ENA segmentation is "the heart of the analysis" [ZORGO-2023]; "different statistical procedures and
  threshold values highlight different sets of collocates" [LANCSBOX-MAN]; topic granularity and inclusion threshold
  shape TopicENA networks [TOPICENA-2026]; human versus machine coding gives different codes [ICQE-NCODER-GPT].
- **Validation habits**: reading passages behind each link; inter-coder and human-machine agreement; ENA fit; pattern
  refinement by close reading [NELSON-2020]; triangulation [CHEN-2024]. Sensitivity runs are recommended but no source
  shows them as routine.

## 8. Outputs and collaboration

- **Deliverables**: journal figures (per group or period; ENA's two means and a subtraction); the drawn concept network
  as the paper's model figure; a methods paragraph with unit, measure, threshold, coder and model; CPN strings for
  collocations [LANCSBOX-MAN]; quotations per link.
- **Reproducibility**: R source from KH Coder; rENA, stm, textnets scripts with seeds; ROCK files; ENA "Write Up";
  CPN; MAXQDA saves model explanations as segment comments [MAXQDA-AICODING]. GUI tools rarely record preprocessing.
- **Audit**: reviewers ask for passages behind a link and the parameters; provenance (edge to segments to documents,
  and who coded them) does not leave the QDA package today.
- **Sharing**: QDA project files within a team; QDPX between packages with losses [NVIVO-REFI] [MAXQDA-REFI]; raw
  transcripts rarely shared under consent terms.

## 9. Tools landscape and pain points

| Tool                      | What it does well                                                                                                                            | Where it fails (evidence)                                                                                                                                                                                                                              |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| KH Coder                  | Full pipeline from raw text; many measures, MST, communities [KHC-MANUAL]                                                                    | Static plots; one layout per run; no node-to-passage click found                                                                                                                                                                                       |
| ATLAS.ti                  | Network editor with relation vocabulary, Link Manager, quotations as nodes; co-occurrence with drill-down [ATLAS-NETCREATE] [ATLAS-VIS]      | Coefficient above 1 with overlaps [ATLAS-CCOEF]; Web views not exportable, networks not in Web [ATLAS-WEB] [ATLAS-NETCREATE]; hierarchical links rewrite the code tree [ATLAS-NODESLINKS]; transitive property not in current manual [ATLAS-RELATIONS] |
| MAXQDA                    | Code Relations Browser, Code Map, MAXMaps models and free maps, AI Coding with explanations [MAXQDA-CRB] [MAXMAPS-OBJECTS] [MAXQDA-AICODING] | Map links not written back to the project [MAXMAPS-OBJECTS]; concept maps dropped from QDPX [MAXQDA-REFI]                                                                                                                                              |
| NVivo                     | Concept maps, cluster analysis [NVIVO-CONCEPT] [NVIVO-CLUSTER]                                                                               | Map items "not linked to your data"; no co-occurrence network; relationship types lost in QDPX [NVIVO-REFI]                                                                                                                                            |
| Dedoose to Gephi          | Full network analysis [CHEN-2024]                                                                                                            | Manual export per subset; quotations left behind                                                                                                                                                                                                       |
| ENA web tool, rENA        | Shared layout, subtraction, statistics, coded lines [TAN-2024]                                                                               | Many parameters, thin docs [ENA-GUIDE-CODES]; three figures per comparison; no human-versus-machine view                                                                                                                                               |
| nCoder, GPT-4 coding      | Code datasets too large for hand coding [ICQE-NCODER-GPT]                                                                                    | Low recall (nCoder) or low precision (GPT-4) against humans                                                                                                                                                                                            |
| #LancsBox GraphColl       | Seeded expansion, strength as length, KWIC on hover, CPN [LANCSBOX-MAN]                                                                      | Overpopulation; layout position "has no implications" in the 2015 tool [BREZINA-2015]                                                                                                                                                                  |
| stm, BERTopic             | Topic correlation graphs, hierarchies, distance maps [STM-PLOT] [BERTOPIC-VIS]                                                               | Static igraph plot; topics renumber on refit                                                                                                                                                                                                           |
| InfraNodus                | One-step text network, gaps [INFRANODUS-METHOD]                                                                                              | Fixed 4-word window; commercial                                                                                                                                                                                                                        |
| Gephi via Nocodefunctions | Layout, filtering, statistics [GEPHI-TEXT]                                                                                                   | No text in the graph file; label-only styling by hand; embeddings give "tiny isolated clusters" [GDELT-EMB]                                                                                                                                            |

Cross-cutting pain points: pipeline and drawing live in different tools; each parameter change means a new layout, so
settings cannot be compared side by side; passages and coder provenance are lost on export; group or coder comparison
needs a shared layout only ENA provides; drawn theory networks are locked in one package.

## 10. Requirements implied

Graphty's Designloom records have no persona for this population and no workflow that starts from text or from coded
segments. W24 (condition comparison) compares two gene networks by identifier union and difference; it does not fix one
layout for several weighted networks or subtract edge weights. Data-preparation 4.4 (two-mode projections), 4.5
(matrix thresholding) and 4.13 (entity graphs) are the nearest import paths.

| #   | Capability                                                                                                                                                                                        | Priority | Covered?                                          |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------- |
| 1   | Import a coded-segment table (one row per segment, 0/1 code columns, metadata) and build a code co-occurrence network with a chosen unit (segment, document, moving window within a conversation) | must     | No                                                |
| 2   | Provenance on every node and edge: the segment ids behind it, shown on click, fast when an edge has thousands of segments                                                                         | must     | No (civic Workflow I asks for it on causal links) |
| 3   | Create and edit nodes and edges by hand, with hand placement kept across sessions                                                                                                                 | must     | No                                                |
| 4   | A relation-type vocabulary the user edits: name, direction, symmetric or asymmetric, transitive, line style and color; changing a type restyles all its edges                                     | must     | No                                                |
| 5   | Mixed node types (code, quotation, memo, document) with edges between any of them, an edge comment, and opening the evidence behind a node or link                                                | must     | Partly (generic node attributes)                  |
| 6   | Weighting choices: count, binary vs full, Jaccard, cosine, association strength, PMI, c-coefficient; association measures logDice, MI, log-likelihood, Delta P                                    | must     | No                                                |
| 7   | Thresholds and backbones (top N, minimum weight, spanning tree, disparity filter, k nearest neighbors) with "drawn of total" counts                                                               | must     | Partly (generic filtering)                        |
| 8   | One node layout across several networks (groups, periods, codings) and a subtracted network colored by the larger side                                                                            | must     | No                                                |
| 9   | Coder or source attribute on segments (person, model), with model explanation and accepted flag; filter edges by coder; show human and model codings as two networks on one layout                | should   | No                                                |
| 10  | Seeded expansion: start from one node, double-click a neighbor to expand it, mark expanded versus unexpanded nodes                                                                                | should   | No                                                |
| 11  | Edge length set by a weight, and constrained placement (left, right, middle) from a node attribute                                                                                                | should   | No                                                |
| 12  | Hover preview of the text behind a node or edge (concordance lines)                                                                                                                               | should   | No                                                |
| 13  | Raw text to word network in the browser: tokenize, stopwords, lemmatize, multi-word terms, synonyms, top-N by frequency or tf-idf, window by sentence, paragraph, document or N words             | should   | No                                                |
| 14  | Import topic-by-document, topic correlation and embedding matrices; build threshold or kNN graphs; show a topic hierarchy                                                                         | should   | Partly (data-preparation 4.5)                     |
| 15  | Re-run with changed parameters keeping positions of surviving nodes; two settings side by side                                                                                                    | should   | No                                                |
| 16  | Record build parameters (unit, window, measure, threshold, vocabulary, coder; CPN for collocations) with the graph and figures                                                                    | should   | Partly (W25)                                      |
| 17  | Label-centric rendering: nodes as labels, faint edges, overlap removal                                                                                                                            | should   | Partly (styling)                                  |
| 18  | Run in the browser with no upload of transcripts                                                                                                                                                  | must     | Not stated anywhere                               |
| 19  | Import a QDPX project's codes, segments and links                                                                                                                                                 | could    | No                                                |
| 20  | Directed ordered co-occurrence with self-loops inside the node                                                                                                                                    | could    | No                                                |

New Designloom records recommended:

- Personas: `text-network-analyst` (Tier A: core graph view, large population by KH Coder and InfraNodus counts, gap
  yes); `qualitative-code-network-researcher` (revised to Tier A: the hand-built network is where the theory is written,
  every major QDA package ships an editor for it, and the QDA market is large, though no source counts network use);
  `epistemic-network-analyst` (Tier B: medium population, core view); `corpus-linguist` (Tier B: distinct seeded
  workflow, no population count). Topic-model users stay a variant of `text-network-analyst`. `survey-network-researcher`,
  `digital-humanist` and `systems-mapping-facilitator` should not absorb them: their data are relational tables,
  letters or causal claims aggregated across sources, not text or coded segments.
- Workflows: "Corpus to word co-occurrence network with passage drill-back" (5.1, 5.2, 5.6); "Coded segments to a code
  co-occurrence network, with AI-assisted coding" (5.3); "Hand-built conceptual network in a QDA package" (5.4);
  "Compare groups' or coders' code networks on a shared layout" (5.5); "Seeded collocation network" (5.7); "Topic model
  or embeddings to a topic or document network" (5.8).

## 11. Sources

- [KHC-SITE] https://khcoder.net/en/ -- KH Coder home.
- [KHC-WIKI] https://en.wikipedia.org/wiki/KH_Coder -- paper counts, back-end tools.
- [KHC-MANUAL] https://khcoder.net/en/manual_en_v3.pdf -- units, co-occurrence network options, status line, Search Documents, export.
- [KHC-1108] https://github.com/ko-ichi-h/khcoder/discussions/1108 -- developer on measures by unit size.
- [YAGAHARA-2018] https://pmc.ncbi.nlm.nih.gov/articles/PMC5876491/ -- Fukushima tweets, daily networks.
- [ATLAS-CCOEF] https://doc.atlasti.com/ManualMac.v9/CodeCooccurrence/CodeCoOccurrenceTableCcoefficient.html -- c-coefficient.
- [ATLAS-VIS] https://manuals.atlasti.com/Win/en/manual/CodeCooccurrence/CodeCoOccurrenceTableVisualization.html -- Sankey, click edge to quotations.
- [ATLAS-NETFN] https://manuals.atlasti.com/Win/en/manual/Networks/NetworksAnalyticFunctions.html -- Add Co-occurring Codes, five overlap relations.
- [ATLAS-TUTORIAL] https://atlasti.com/research-hub/co-occurrence-analysis-with-atlas-ti -- co-occurrence workflow, Query Tool.
- [ATLAS-WEB] https://atlastihelp.helpscoutdocs.com/article/593-what-is-the-code-co-occurrence-view -- Web views not exportable.
- [ATLAS-NETCREATE] https://atlastihelp.helpscoutdocs.com/article/727-how-to-create-networks-in-atlas-ti -- create network, add entities, link, Link Manager, layouts, export; not in Web.
- [ATLAS-RELATIONS] https://doc.atlasti.com/ManualMac.v22/Networks/NetworksAboutRelations.html -- preset relations and properties, user-defined relation attributes, propagation to links.
- [ATLAS-RELV9] https://doc.atlasti.com/ManualWin.v9/Networks/NetworksAboutRelations.html -- transitive property; "Transitive relations enable semantic retrieval".
- [ATLAS-NODESLINKS] https://manuals.atlasti.com/Mac/en/manual/Networks/NetworksAboutNodesAndLinks.html -- first- and second-class links, hyperlinks, hierarchical links change the code tree.
- [ATLAS-LINKING] https://manuals.atlasti.com/Mac/en/manual/Networks/NetworksLinkingNodes.html -- linking, link editing, Link Manager.
- [ATLAS-AISUGGEST] https://atlasti.com/suggested-codes-in-atlas-ti-web -- AI suggested codes; "the AI suggests, but you decide".
- [MAXQDA-CRB] https://www.maxqda.com/help/visual-tools/code-relations-browser-visualizing-overlapping-codes -- three modes, export for Gephi.
- [MAXQDA-CODEMAP] https://www.maxqda.com/help/visual-tools/code-map-position-codes-according-to-similarity -- MDS, clusters, XLSX export.
- [MAXMAPS-COOC] https://www.maxqda.com/help-mx22/maxmaps/the-co-occurrence-model -- Code Co-Occurrence Model.
- [MAXMAPS-CSS] https://www.maxqda.com/help-mx22/maxmaps/the-code-subcode-segments-model -- Code-Subcodes-Segments Model.
- [MAXMAPS-OBJECTS] https://www.maxqda.com/help/maxmaps/objects-in-maxmaps -- creating maps and adding objects; plus Silver and Lewins https://study.sagepub.com/node/5542 on links not written back (search summary).
- [MAXQDA-AICODING] https://www.maxqda.com/help/ai-assist/ai-coding-segments -- AI Coding from code memos, approve or discard, explanations saved as comments.
- [MAXQDA-261] https://www.maxqda.com/blogpost/maxqda-26-1 -- February 2026, a code and up to 50 documents.
- [MAXQDA-REFI] https://www.maxqda.com/help-mx24/reports/export-and-import-refi-qda-projects -- QDPX excludes complex concept maps (search summary).
- [MAXQDA-COMPARE] https://www.maxqda.com/blogpost/qda-software-comparison -- 192 countries (search summary).
- [NVIVO-CLUSTER] https://help-nv.qsrinternational.com/14/win/Content/vizualizations/cluster-analysis.htm -- cluster analysis.
- [NVIVO-CONCEPT] https://help-nv.qsrinternational.com/14/win/Content/vizualizations/concept-maps.htm -- concept maps, project items not linked to data (search summary).
- [NVIVO-REFI] https://help-nv.qsrinternational.com/14/win/Content/projects-teamwork/refi-qda%20standard.htm -- REFI-QDA support; relationship codes and types not transferred (search summary).
- [CHEN-2024] https://visualanalyticshealthcare.github.io/homepage/proceedings/2024/8.pdf -- 510 responses, Dedoose to Gephi.
- [BRAILAS-2014] https://nsuworks.nova.edu/tqr/vol19/iss8/3 -- Networked Grounded Theory (abstract).
- [WOODS-2016] https://core.ac.uk/download/57709604.pdf -- 763 ATLAS.ti and NVivo articles (search summary).
- [GEPHI-TEXT] https://seinecle.github.io/gephi-tutorials/generated-pdf/working-with-text-en.pdf -- Levallois, text in Gephi.
- [NOCODE-MEDIUM] https://medium.com/@vespinozag/transform-any-text-into-a-semantic-network-with-nocodefunctions-app-in-just-4-steps-36621a354cae -- Nocodefunctions (search summary).
- [QUANTEDA-NET] https://search.r-project.org/CRAN/refmans/quanteda.textplots/html/textplot_network.html -- fcm, 1,000-node limit.
- [BAIL-TEXTNETS] https://sicss.io/2020/materials/day3-text-analysis/text-networks/rmarkdown/Text_Networks.html -- R textnets.
- [TEXTNETS-PY] https://textnets.readthedocs.io/en/stable/tutorial.html -- Python textnets.
- [VOYANT-LINKS] https://voyant.lincsproject.ca/docs/tutorial-links.html -- Voyant Links (search summary).
- [AUTOMAP] https://www.cmu.edu/casos-center/research/tools/automap.html -- AutoMap and ORA.
- [PASSARO-2026] https://arxiv.org/pdf/2601.07327 -- forma mentis versus co-occurrence networks (search summary).
- [LEXIMANCER-FAQ] https://kangaroo-buffalo-xre9.squarespace.com/faqs-leximancer-displays-and-outputs -- Leximancer FAQ (hosting not confirmed as official).
- [SMITH-2006] https://www.doi.org/10.3758/BF03192778 -- evaluation of Leximancer.
- [IRAMUTEQ-PT] https://educapes.capes.gov.br/bitstream/capes/1132538/2/Aula%20DADPC%20-%20Iramuteq.pdf -- IRaMuTeQ similitude (search summary).
- [INFRANODUS-METHOD] https://infranodus.com/docs/text-network-analysis -- method.
- [INFRANODUS-HOW] https://infranodus.com/about/how-it-works -- gaps, GPT questions.
- [INFRANODUS-DOCS] https://infranodus.com/docs -- import and export (search summary).
- [LANCSBOX-MAN] https://lancsbox.lancaster.ac.uk/data/materials/Manual_EN.pdf -- #LancsBox X manual, GraphColl sections 4.1-4.8: settings, logDice default, graph encodings, KWIC hover, double-click expansion, overpopulation, CPN.
- [LANCSBOX-EX] https://lancsbox.lancaster.ac.uk/data/materials/Ex_GraphColl.pdf -- GraphColl exercises on BNC2014: graph legend, word versus lemma, 15,221 candidates and 94 collocates.
- [BREZINA-2015] https://ling.hse.ru/data/2016/10/11/1108830056/brezina_et_al_2015_-_graphcoll_paper.pdf -- Brezina, McEnery, Wattam, "Collocations in context", IJCL 20:2: GraphColl design, 14 statistics, directionality, exports.
- [STM-TOPICCORR] https://search.r-project.org/CRAN/refmans/stm/html/topicCorr.html -- simple (cutoff 0.01) and huge methods.
- [STM-PLOT] https://search.r-project.org/CRAN/refmans/stm/html/plot.topicCorr.html -- igraph wrapper, Fruchterman-Reingold.
- [STMCORRVIZ] https://cran.r-project.org/web/packages/stmCorrViz/index.html -- CRAN removal notice, archived 2025-06-17.
- [BERTOPIC-VIS] https://maartengr.github.io/BERTopic/getting_started/visualization/visualization.html -- intertopic distance map, hierarchy, heatmap.
- [BERTOPIC-HIER] https://maartengr.github.io/BERTopic/api/plotting/hierarchy.html -- Ward linkage, 1 - cosine similarity.
- [NELSON-2020] https://ideas.repec.org/a/sae/somere/v49y2020i1p3-42.html -- Nelson, Computational Grounded Theory, Sociological Methods and Research 49(1).
- [GDELT-EMB] https://blog.gdeltproject.org/using-the-gsg-document-embeddings-to-visualize-story-clusters-using-gephi/ -- 19,598 articles, cosine 0.6-0.99, 16,000 edges, OpenOrd.
- [WELBERS-SIM] https://rdrr.io/github/kasperwelbers/network-tools/f/howto/howto_content_similarity_network.md -- document similarity graphs, min.similarity, export to Gephi.
- [ICQE-NCODER-GPT] https://learninganalytics.upenn.edu/ryanbaker/ChatGPT_ICQE_FinalVersion.pdf -- Zambrano et al., "From nCoder to ChatGPT": nCoder workflow, kappa, precision, recall.
- [TOPICENA-2026] https://arxiv.org/abs/2603.03307v1 -- Lu and Hsu, TopicENA (abstract).
- [ENA-GUIDE] https://bookdown.org/tan78/intro_to_ena/ -- ENA web tool guide.
- [ENA-GUIDE-DATA] https://bookdown.org/tan78/intro_to_ena/features.html -- data format.
- [ENA-GUIDE-CONV] https://bookdown.org/tan78/intro_to_ena/conversations.html -- stanza windows.
- [ENA-GUIDE-CODES] https://bookdown.org/tan78/intro_to_ena/codes.html -- at least three codes.
- [ENA-GUIDE-PLOT] https://bookdown.org/tan78/intro_to_ena/plotTools.html -- plot options.
- [ENA-GUIDE-STATS] https://bookdown.org/tan78/intro_to_ena/stats.html -- tests, write-up.
- [TAN-2024] https://par.nsf.gov/servlets/purl/10608654 -- Tan, Swiecki, Ruis, Shaffer, ENA and ONA in R.
- [RENA-ACCUM] https://search.r-project.org/CRAN/refmans/rENA/html/ena.accumulate.data.html -- rENA accumulation.
- [ZORGO-2023] https://pmc.ncbi.nlm.nih.gov/articles/PMC9809407/ -- ROCK and ENA tutorial.
- [NURSING-ENA-2024] https://arxiv.org/html/2405.08948v2 -- nursing-assistant interviews, kappa 0.863.
- [SIEBERT-2017] https://learning-analytics.info/index.php/JLA/article/view/5416 -- conversational grain size.
- [ELMOAZEN-2022] https://ieeexplore.ieee.org/document/9706446 -- review of 76 ENA studies.
- [SCIED-ENA-2024] https://link.springer.com/article/10.1007/s10956-024-10193-x -- ENA in science education (search summary).
- [ENA-SURGERY] https://par.nsf.gov//servlets/purl/10060314 -- ENA of surgical residents (search summary).
- [ENA-SPATIAL-2021] https://research.monash.edu/en/publications/modelling-spatial-behaviours-in-clinical-team-simulations-using-e/ -- clinical team simulations.
- [ISQE-PRECONF] https://par.nsf.gov/servlets/purl/10341770 -- ICQE pre-conference workshops (search summary).
- [CRO-WINDOW] https://arxiv.org/pdf/1405.4433 -- window size changes network structure.
- [CHAR-NET-2016] https://dx.doi.org/10.1007/978-3-319-46224-0_7 -- character network construction (search summary).
- [FICTION-HAL] https://dl.ifip.org/IFIP-AICT-482/hal-01616308 -- parameters change fiction networks (search summary).
- [VANECK-2009] https://ideas.repec.org/a/bla/jamist/v60y2009i8p1635-1651.html -- normalizing co-occurrence data.
- [QDA-MARKET] https://www.verifiedmarketresearch.com/product/qualitative-data-analysis-software-market/ -- market estimate (low confidence).
