# Supply Chain Risk Analysts and Physical Infrastructure Network Engineers

## 1. Summary

This population analyzes networks of physical and economic flows: parts into products, goods through warehouses, money between industries, countries, banks and investors, electricity, water, traffic, fiber, and services between facilities of different sectors (a substation feeding a pumping station feeding a hospital). Supply risk analysts rank sites by money lost while each is down, an optimization over the bill of materials, not a centrality ranking. Trade compliance analysts trace one detained shipment back to its raw materials, document by document, to prove no input touches a listed entity or region. Network designers compare scenarios against a baseline. Economic network analysts score how shocks spread through dense weighted panels. Economic complexity analysts turn a country-by-product (or region-by-industry) export table into a product-to-product relatedness network, draw it once in a fixed reference layout, and overlay each country or region on that same map to rank its nearby diversification opportunities. Infrastructure engineers run contingency, hosting capacity, isolation, restoration and criticality analyses on networks with fixed geography, nearly always coupled to a physics or demand model. Resilience analysts trace cascades across sectors over time. Space syntax analysts score street segments and building plans by angular configuration. Deliverables are ranked lists, maps, violation tables, scenario comparisons and evidence packages.

## 2. Population

**Supply chain and procurement risk.** Titles: Supply Chain Risk Manager, Supplier Risk Analyst, SCRM Analyst. Ford's risk model was used by "procurement and risk specialists" (https://hdl.handle.net/1721.1/101782). Postings ask for Excel, SQL, Python and Tableau or Power BI, not graph databases (https://jobs.insightpartners.com/companies/exiger/jobs/74802609-scrm-analyst-healthcare-supply-chain-risk). Engines are built by IT or bought (Resilinc, Everstream, Interos, Sourcemap, Altana). McKinsey's 2025 pulse reports 95 percent visibility into tier-one risk but 42 percent into tier two or beyond (https://www.mckinsey.com/capabilities/operations/our-insights/supply-chain-risk-survey; via search results).

**Trade compliance (forced-labor import rules).** Trade compliance analysts and managers at every importer in a sector CBP prioritizes under the Uyghur Forced Labor Prevention Act (UFLPA): apparel, cotton, polysilicon and other silica-based products, tomatoes, aluminum, steel, copper, lithium, PVC, caustic soda, red dates and seafood (CBP 2026 guidance, section 5.16), with customs brokers and trade lawyers; detention figures are in section 5.16. The EU Forced Labour Regulation adds EU importers from December 2027 (section 5.16). Headcount: no source found.

**Deforestation due diligence (EU Deforestation Regulation).** A separate population: every company that first places cattle, cocoa, coffee, oil palm, rubber, soy or wood, or products made from them, on the EU market or exports them (https://green-forum.ec.europa.eu/nature-and-biodiversity/deforestation-regulation-implementation/traceability-and-geolocation-commodities-subject-eudr_en), from importers of cocoa beans, green coffee and palm oil to timber traders and leather and rubber goods makers. Since the December 2025 amendment (Regulation 2025/2650) large and medium operators apply the rules from 30 December 2026 and micro and small operators from 30 June 2027; downstream operators and traders no longer file their own due diligence statements but collect and pass on the reference numbers they receive, and micro and small primary operators file a one-time simplified declaration instead (https://trade.ec.europa.eu/access-to-markets/en/news/delay-until-december-2026-and-other-developments-implementation-eudr-regulation; https://www.jonesday.com/en/insights/2025/12/eu-deforestation-regulation-amendments-deferred-timelines-and-simplification-measures). The Commission's May 2026 simplification review proposed no further change to the legal text (https://www.bakermckenzie.com/en/insight/publications/2026/05/eu-commission-publishes-simplification-review-of-eudr, via search summary). The people doing the work are sustainability, sourcing and compliance staff at those first placers, and the traceability teams of their suppliers' cooperatives, mills and exporters who collect the plot data. Unlike UFLPA, the unit is a due diligence statement covering one or more batches, not a detained entry, and the origin is a mapped land plot, not a facility. Number of operators or statements filed: no source found (the Commission cited projected load on its information system, not a count, when it asked for the 2025 delay: https://www.foodnavigator.com/Article/2025/10/21/eudr-inside-the-it-system/).

**Supply chain network design.** Analysts at manufacturers, retailers, 3PLs and consultancies modeling in Coupa Supply Chain Modeler (formerly LLamasoft), Optilogic Cosmic Frog or anyLogistix.

**Economic and financial network analysts.** Dense weighted directed networks released as yearly or quarterly panels; one question: how far a shock travels. High coding ability (R, Python, MATLAB, Stata).

- Trade and input-output economists use multi-regional input-output tables (WIOD, OECD ICIO, EORA, EUREGIO) and bilateral trade data (CEPII BACI) (Bank of England 2025 toolkit, https://www.bankofengland.co.uk/-/media/boe/files/working-paper/2025/assessing-risk-a-toolkit-for-measuring-regional-supply-chain-exposure-to-global-shocks.pdf).
- Systemic-risk analysts build interbank networks from supervisory reports; such models "have become part of the analytical toolkit of most advanced central banks" (https://www.ecb.europa.eu/press/financial-stability-publications/macroprudential-bulletin/html/ecb.mpbu201804_01.sv.html; also RBA, https://www.rba.gov.au/publications/bulletin/2013/jun/6.html).
- Venture finance researchers build syndication networks among venture capital firms (section 5.14). The standard method is Hochberg, Ljungqvist and Lu, "Whom You Know Matters: Venture Capital Networks and Investment Performance" (Journal of Finance 2007, https://www.stat.berkeley.edu/~aldous/Networks/hochberg.pdf): trailing five-year networks, directed ties from the lead investor to the other syndicate members, five centrality measures, and success measured as exits through an IPO or a sale. Practitioners (venture analysts, founders raising money) read co-investors as ranked lists in PitchBook ("Discover who a VC firm co-invests with most often and the deals they've done together", https://try.pitchbook.com/venture-capital-investors) or Crunchbase (Graph Insights, "the investors they most often invest alongside", https://techcrunch.com/?p=1039525, 2014); drawn networks come from analysts exporting the data to Gephi, NetworkX, Neo4j or GraphXR. No job posting found that names network analysis; the population is small.
- Economic complexity and relatedness analysts (section 3.13 and 5.17) are a separate, network-centered group, not a small corner of trade economics. The two founding papers are cited 3,815 times (Hidalgo, Klinger, Barabasi and Hausmann 2007, "The Product Space Conditions the Development of Nations", https://openalex.org/W2064927380) and 4,435 times (Hidalgo and Hausmann 2009, "The building blocks of economic complexity", https://openalex.org/W1966402429), and "The Principle of Relatedness" (2018) 508 times (https://openalex.org/W2883175180); all counts from the OpenAlex API, queried 2026-11-25. Harvard Growth Lab's Atlas of Economic Complexity "has reached more than 2 million people" and "is used worldwide by policymakers, investors, entrepreneurs, and academics" (https://atlas.hks.harvard.edu/about/). Figures of 2.2 million new users since 2013 and 10.1 million page views in 2024 describe the Growth Lab's whole Viz Hub portfolio, of which the Atlas is one tool, not the Atlas alone (via search summary of the Viz Hub page, https://growthlab.app/). MIT and Datawheel's Observatory of Economic Complexity (OEC) serves the same views commercially (https://oec.world/en/resources/about). Code users are a smaller core: the Python package ecomplexity had 261 PyPI downloads in the last month (https://pypistats.org/api/packages/ecomplexity/recent), and the R packages economiccomplexity and EconGeo 712 and 614 CRAN downloads in the month to 2026-11-24 (https://cranlogs.r-pkg.org/downloads/total/last-month/economiccomplexity,EconGeo).
- Economic geographers apply the same method to regions and industries, technologies or occupations ("relatedness"), most visibly for the EU's smart specialization policy: Balland, Boschma, Crespo and Rigby, "Smart specialization policy in the European Union: relatedness, knowledge complexity and regional diversification" is cited 1,172 times (https://openalex.org/W2791808130). The EU's Smart Specialisation Platform counted 189 registered regions from 33 EU and non-EU countries in October 2020 (via search summary of JRC slides, https://www.errin.eu/system/files/2020-10/20201015errin-ccijrc-s3p-fmerida-iseigneur.pdf); how many of their analysts compute relatedness networks themselves: no source found. The Growth Lab's Metroverse applies it to more than 1,000 cities (https://growthlab.hks.harvard.edu/tools).
- Asset correlation network analysts (section 5.19) build a network from co-moving prices: daily returns of N assets give a correlation per pair, each correlation becomes a distance, and the complete graph is filtered to a minimum spanning tree or a planar maximally filtered graph and colored by sector. The founding papers are Mantegna, "Hierarchical structure in financial markets" (European Physical Journal B 11, 1999), cited 2,512 times (https://openalex.org/W2138144286); Onnela et al., "Dynamics of market correlations: Taxonomy and portfolio analysis" (Physical Review E 68, 2003), cited 870 times (https://openalex.org/W2123199877); and Tumminello, Aste, Di Matteo and Mantegna, "A tool for filtering information in complex systems" (PNAS 2005, the planar filter), cited 1,047 times (https://openalex.org/W2094688862); all counts from the OpenAlex API, queried 2026-11-25. Three groups use it: academic econophysicists, who publish the trees as an economic taxonomy; portfolio researchers, who pick peripheral assets for diversification (Pozzi, Di Matteo and Aste, Scientific Reports 2013, https://www.nature.com/articles/srep01665); and central bank and IMF staff studying bank interconnectedness, who cite the tree and the planar graph as the standard way to turn a full correlation matrix into a network (Craig and Saldias, 418 banks' daily stock returns 1999-2014, Cleveland Fed WP 16-27 and IMF WP 16/184, https://www.imf.org/en/publications/wp/issues/2016/12/31/spatial-dependence-and-data-driven-networks-of-international-banks-44271). Practitioner code is in Python: riskfolio-lib, whose plot_network draws the tree (or the planar graph) colored by cluster, had 77,906 PyPI downloads in the last month (https://pypistats.org/api/packages/riskfolio-lib/recent, queried 2026-11-25), though most of those downloads are for portfolio optimization, not the network plot. How many people draw these trees as a regular task: no source found. The data shape is the signal-derived window network of temporal-and-dynamic-networks.md (model F, workflow 5.7); this document owns the finance workflow.

**Critical-infrastructure interdependency.** CISA's NISAC models "interdependencies across the NCFs" (National Critical Functions; https://www.cisa.gov/NISAC); CISA Protective Security Advisors (PSAs) collect facility dependencies in the CISA Gateway; the Infrastructure Resilience Planning Framework (IRPF) targets state and local governments (https://www.cisa.gov/sites/default/files/2023-06/IRPFFactSheet_%20June23_508c.pdf); FEMA briefs by eight Community Lifelines (https://www.fema.gov/emergency-managers/practitioners/lifelines).

**Physical infrastructure networks.**

- Power transmission: planning engineers at utilities, ISOs/RTOs and consultancies (PSS/E, TARA, PowerWorld, Python; https://dice.com/job-detail/0a5b3004-a9cf-4aaf-aed9-2f7410e59a69). NERC TPL-001 requires P0-P7 planning events (https://www.nerc.com/pa/Stand/Reliability%20Standards/TPL-001-5.1.pdf).
- Power distribution: planning engineers (CYME, Synergi, WindMil, OpenDSS; ArcFM GIS; https://themuse.com/jobs/theaescorporation/senior-distribution-planning-engineer) and control-room operators using an advanced distribution management system (ADMS).
- Utility GIS and water: ArcGIS Utility Network and ArcFM traces; hydraulic modelers (EPANET, InfoWater, WNTR; https://usepa.github.io/WNTR/resilience.html).
- Telecom: outside-plant (OSP) planners in IQGeo, VETRO FiberMap, 3-GIS or ArcFM Fiber Manager.
- Transport: planners at MPOs, state DOTs, transit agencies and development banks (PTV Visum, TransCAD, Emme, OSMnx, r5r/Conveyal). Urban-analytics researchers compute street-network centrality with OSMnx, cityseer and momepy. OSMnx shows 16.5 million total PyPI downloads, 519,000 of them in the last 30 days (https://pepy.tech/project/osmnx, read 2026-11-25). Downloads count installs, including automated ones, not people. Its author describes "a large and growing body of literature" using it across geography, urban planning, transport engineering and computer science (https://arxiv.org/abs/2505.00736). No count of the people who compute street centrality was found.
- Space syntax: architects, urban designers and researchers using depthmapX, the QGIS Space Syntax Toolkit, sDNA and the R packages alcyon and rdepthmap. The 2024 symposium drew 216 researchers from 36 countries (via search summary, https://cyprusconferences.org/?p=3263).

Headcounts: no source found.

## 3. Personas

### 3.1 `supply-chain-analyst` (existing record, corrected) -- David, Supply Chain Risk Manager, automotive OEM

- **Tools.** A vendor platform (Resilinc, Everstream or Interos), an internal exposure model (Ford: SQL Server, graph ETL, LP solver, Tableau map), Excel, supplier surveys.
- **Data.** BOMs and routings, spend by supplier site, volume plans and margins, inventory per part, supplier-reported time to recover, site coordinates, sub-tier links from surveys or trade data.
- **Goals.** Lost revenue per site over its recovery time; find cheap parts with high exposure; respond within hours to an event.
- **Frustrations.** Sub-tier data is self-reported and optimistic; a traditional analysis of 4,000+ tier-1 sites "would likely take two or three years."
- **Correction.** "Computes betweenness centrality to identify chokepoint suppliers" is unsupported: exposure comes from disrupting each node for its time to recover and is "not correlated with the amount Ford spends at the supplier" (Ford Figure 3). See section 7.

### 3.2 `power-grid-planning-engineer` -- Priya, Transmission Planning Engineer, ISO or utility

- **Tools.** PSS/E (ACCC, section 5.4), PowerWorld, PSLF, TARA, Python with psspy, Excel violation tables.
- **Data.** Base cases of 2,000 to 80,000+ buses (public analogue: TAMU ACTIVSg2000, 2,000 buses and 3,209 branches, up to an 82,000-bus case), .sub/.mon/.con files, ratings, substation coordinates.
- **Goals.** Find every thermal and voltage violation for P1-P7 events in her study area, propose and defend mitigation.
- **Frustrations.** Cases are Critical Energy Infrastructure Information (FERC Form 715; https://ferc.gov/industries-data/electric/electric-industry-forms/form-no-715-annual-transmission-planning-and-evaluation-report-instructions). Monitored elements are hand-edited text files. One-lines show "only a limited number of measurements" legibly (https://documents.pserc.wisc.edu/documents/publications/papers/2002_general_publications/pscc02_paper_revisedfinalwithpsccfooter.pdf).

### 3.3 `distribution-planning-engineer` -- Tomas, Distribution Planning Engineer, investor-owned utility

- **Tools.** CYME or Synergi with EPRI DRIVE, OpenDSS, ArcFM/Utility Network GIS as model source, Excel.
- **Data.** Feeder models from GIS (142 to 6,001 buses per feeder in Sandia's 216-feeder set; https://www.osti.gov/servlets/purl/1581693), load allocation from AMI or SCADA, regulator and capacitor settings, interconnection queue.
- **Goals.** Publish per-node hosting capacity for distributed energy resources (DER), screen requests, plan upgrades.
- **Frustrations.** SDG&E's iterative method took 27 hours per feeder versus minutes for DRIVE (https://www.sdge.com/sites/default/files/EPIC-1%20Project%204_Module%203_Final%20Report_0.pdf). Results live per feeder; questions span the territory.

### 3.4 `distribution-control-room-operator` -- Angela, Distribution System Operator, ADMS control room

- **Tools.** ADMS/OMS (for example Oracle Network Management System) with SCADA, GIS connectivity, switching orders, crew dispatch.
- **Data.** Live switch states, fault indicators, recloser lockouts, tags and grounds, crew locations, feeder loading.
- **Goals.** Locate and isolate the faulted section; restore customers via alternate feeders without overloads or safety violations.
- **Frustrations.** Many restoration options, each checked against capacity, tags, crews and DER.

### 3.5 `utility-network-gis-analyst` -- Marcus, GIS Network Analyst, water and electric utility

- **Tools.** ArcGIS Pro Utility Network (upstream, downstream, isolation, subnetwork traces; network diagrams), ArcFM, EPANET or InfoWater, WNTR.
- **Data.** Pipes, valves, hydrants, meters; conductors, transformers, switches; connectivity rules; valve and switch states.
- **Goals.** Valves and customers affected by a main break; crew schematics; criticality ranking for the capital plan.
- **Frustrations.** Traces need topology "free of dirty areas"; loops return whole loops unless flow direction is known; diagrams must be kept in sync.

### 3.6 `infrastructure-resilience-analyst` -- Renee, Infrastructure Resilience Analyst, state emergency management agency

- **Tools.** CISA Gateway (surveys, MapView, Dependency Profile Editor) via a PSA, IRPF guidance, ArcGIS, Excel.
- **Data.** Facility dependency surveys (inputs, providers, backup and its duration, time to severe impact), provider territories, HIFLD-type layers, lifeline categories.
- **Goals.** Know which hospitals, water plants and shelters fail, and when, if a substation, fuel terminal or fiber hub is lost; brief the EOC by lifeline; prioritize backup investments.
- **Frustrations.** Each sector models itself in isolation; dependency data is collected facility by facility; cascade timing depends on owner-reported backup duration.

### 3.7 `network-design-analyst` -- Kevin, Supply Chain Network Design Analyst, consumer goods manufacturer

- **Tools.** Coupa Supply Chain Modeler, Cosmic Frog or anyLogistix; SQL and Python; Excel and PowerPoint.
- **Data.** Locations, products, demand, lanes and rates, facility costs and capacities, last year's shipments.
- **Goals.** A validated baseline, then savings and risk of closing, opening or resizing facilities.
- **Frustrations.** Cost data is "the toughest to get and you don't realize that you don't have it until after the baseline model is built" (https://www.scdigest.com/experts/DrWatson_17-02-21.php?cid=11984, via search summary).

### 3.8 `telecom-osp-planner` -- Sam, Fiber OSP and Transport Planner, regional carrier

- **Tools.** IQGeo Network Manager Telecom (Comsof Fiber for design), VETRO FiberMap or ArcFM Fiber Manager, KMZ files, an inventory system.
- **Data.** Routes, conduits, poles; cables, buffer tubes, strands; splice closures and matrices; ports; circuits mapped to strands.
- **Goals.** Trace a circuit end to end; find a free strand path; prove primary and backup share no conduit.
- **Frustrations.** Shared-risk overlaps are found "by auditing/analyzing the KMZ data" (Microsoft patent; https://patents.google.com/patent/US12366716).

### 3.9 `economic-network-analyst` (replaces the deferred `trade-network-economist`) -- Mei, Economist, central bank

Whole-system matrices and aggregate indicators, unlike `supply-chain-analyst` (a part-at-site DAG) or `aml-investigator` (a case file).

- **Tools.** R, Python (NetworkX), MATLAB or Stata; Gephi or custom plots; Neo4j in one venture case.
- **Data.** Input-output tables and BACI flows by year (WIOD 1,400 nodes); quarterly large-exposure reports (84 to 155 banks, 3,500+ counterparties); investor-to-company rounds; daily prices of 100 to 500 stocks or banks for correlation trees (section 5.19).
- **Variant: asset correlation trees.** Market-risk and portfolio researchers in the same central banks, universities and asset managers build correlation trees from prices (section 5.19). They are a variant of this persona, not a new one: the institutions, the tools (Python, R, MATLAB) and the question (how tightly the system is coupled, and how that changes in a crisis) are the same; only the input differs, and the variant gets its own workflow.
- **Goals.** Direct and indirect exposure to a shock; core nodes; change between periods; who co-invests with whom, who leads and who is invited in, and whether better-connected investors exit more.
- **Frustrations.** Trade networks are "almost complete" (https://pmc.ncbi.nlm.nih.gov/articles/PMC4519177/); counterparty names lack an LEI "in 70% of cases" (ECB); in co-investment maps "the drawn edges are more or less decorative" (https://reactionwheel.net/2010/11/venture-coinvestment-map.html); bank-level results cannot be published.

### 3.10 `transport-network-planner` -- Lena, Transportation Planner, metropolitan planning organization

- **Tools.** OSMnx, r5r or Conveyal, the regional demand model (Visum, TransCAD, Emme), QGIS.
- **Data.** OSM extracts, GTFS, H3 grids with jobs and clinics, flood layers, traffic counts.
- **Goals.** Accessibility within 30/45/60 minutes and how projects change it; rank links by lost travel time; local (distance-limited) centrality at several radii, reported only inside the study area.
- **Frustrations.** Plain betweenness "assumes in general a flat OD matrix" (https://arxiv.org/pdf/2409.08016); link-removal studies need one reassignment per link; centrality near the edge of the downloaded area is distorted unless the network is buffered and the buffer is left out of the results (section 5.6).

### 3.11 `space-syntax-analyst` -- Ioana, Urban Designer, architecture and planning consultancy

- **Tools.** depthmapX, QGIS with the Space Syntax Toolkit and RCL Cleaner, CAD for axial and obstacle maps, sDNA or alcyon.
- **Data.** Street centerlines or a hand-drawn axial map; a DXF plan with obstacle polygons; pedestrian gate counts.
- **Goals.** Show which streets carry through-movement (choice) and which are easy to reach (integration) at several radii, before and after a scheme; which spaces of a building are visually central.
- **Frustrations.** Map preparation dominates (section 5.15); a study cropped London to 7 km to "analyse the networks in reasonable time using DepthmapX" (Kolovou).

### 3.12 `trade-compliance-analyst` (new) -- Nadia, Trade Compliance Manager, apparel and solar-equipment importer

- **Tools.** CBP's Forced Labor Portal, the UFLPA Entity List and withhold-release-order dashboard, a screening platform (Sayari, Kharon or Altana), supplier questionnaires, a customs broker and trade counsel. In-house tooling for compiling packages: no source found.
- **Data.** Entry records, purchase orders, invoices, packing lists, BOMs, bills of lading, certificates of origin, payment and inventory records, production orders, supplier affidavits, often in Chinese; corporate ownership records; the Entity List (187 entities, August 2026).
- **Goals.** Release a detained shipment inside 30 days; keep a prebuilt tracing package per supply chain; screen new suppliers through every tier before buying.
- **Frustrations.** "A gap for even one supplier can undermine the entire submission"; sub-tier suppliers may refuse to share records with her; shipper names vary or are redacted; each package is compiled as numbered PDF exhibits with translations (section 5.16).

### 3.13 `economic-complexity-analyst` (new) -- Ana, Growth Strategy Economist, ministry of economy or development agency

Unlike `economic-network-analyst`, she does not trace a shock through a dense flow matrix. She builds a sparse relatedness network from a two-mode presence table and reads one country or region against a map that stays the same for everyone.

- **Tools.** The Atlas of Economic Complexity and the OEC for ready-made views; the Python package ecomplexity (RCA presence matrix, proximity, density, https://github.com/cid-harvard/py-ecomplexity) or the R packages economiccomplexity and EconGeo for her own tables; published node and edge files with fixed x and y coordinates for the canonical map (https://michelecoscia.com/?p=223); Gephi or plotting code for figures.
- **Data.** Country-by-product exports by year in HS or SITC classifications (Atlas downloads, also a GraphQL API, https://atlas.hks.harvard.edu/data-downloads/); for regional work, region-by-industry employment, patents by technology class, or occupations.
- **Goals.** Show where a country or region sits on the product space, which nearby products it could move into, and how its position changed over the years, for a policy note or a smart specialization strategy.
- **Frustrations.** The canonical layout is fixed outside her tools and changes between releases (the Atlas re-designed its product space layout in version 10.0, October 2024, https://growthlab.hks.harvard.edu/news/atlas-economic-complexity-100-brings-new-data-and-product-space-design/), so old and new figures do not line up; regional relatedness networks have no shared reference layout, so each study draws its own; code packages return matrices, not drawings (the R package projections() returns igraph objects for "product-product and country-country similarity", https://pacha.dev/economiccomplexity/reference/projections.html).

### 3.14 `eudr-due-diligence-officer` (new) -- Sanne, EUDR Compliance Lead, EU importer of cocoa and coffee

Unlike `trade-compliance-analyst`, she is not answering a detention on a deadline set by customs. She files a due diligence statement before each placing on the market or export, and her evidence is a set of mapped land plots, not a pile of supplier documents.

- **Tools.** The EUDR Information System (built on TRACES NT; reached through EU Login, statements entered on screen or through its operator API, https://eudr.webcloud.ec.europa.eu/tracesnt/help/eudr-documentation/operator/geojson-description.html); a commodity traceability platform that collects plot data from suppliers and checks it against forest maps, such as Sourcemap or Koltiva (vendor claims: https://pefc.org/cms/b999fadb-8521-4d4f-8d3c-4688f57fdced/news/10001145/sourcemap-software-for-eudr-automation; https://www.koltiva.com/latin-america); national traceability systems in producer countries (Cote d'Ivoire's cocoa census, the Ghana Cocoa Traceability System, https://www.wri.org/technical-perspectives/eu-deforestation-regulation-compliance-underway); GIS tools for fixing polygons.
- **Data.** GeoJSON plot files (points under 4 hectares, closed polygons otherwise), supplier and cooperative lists, purchase contracts and lot records, upstream reference numbers, forest-cover and land-legality evidence.
- **Goals.** File a valid statement before every placing on the market; know which plots could have fed each batch; keep risk negligible so the goods are not blocked; reuse verified plots across shipments instead of collecting them again (https://www.resourcewise.com/blog/eudr-due-diligence-statements-explained-how-to-manage-polygons-traceability-and-repeat-shipments?hs_amp=true).
- **Frustrations.** Invalid polygons, overlaps and missing data that need manual GeoJSON checks (Koltiva, vendor page above); a 25 MB limit per statement; traceability that stops at the cooperative or licensed buying agent while informal buyers supply the rest (https://mightyearth.org/wp-content/uploads/2025/07/Mighty-Earth_Cameroon_Cocoa_Deforestation_Report_July-2025.pdf, via search summary); one non-compliant plot taints the whole batch it is mixed into.

## 4. Use cases (ranked)

| #   | Question                                                                                                            | Who                           | Frequency                                      | Stakes                                                                                                                                                                                                    |
| --- | ------------------------------------------------------------------------------------------------------------------- | ----------------------------- | ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | "An event hit location X. Which supplier sites, parts and products are affected, and what revenue is at risk?"      | Supply risk                   | Weekly alerts                                  | Very high                                                                                                                                                                                                 |
| 2   | "If this substation or fuel terminal is lost, which hospitals and water plants fail, after how many hours?"         | Resilience analyst, PSA       | Per event and plan                             | Life safety                                                                                                                                                                                               |
| 3   | "For every node, what is the impact if it is down for its time to recover, and where is time to survive shorter?"   | Supply risk                   | Quarterly                                      | Ford: 1,500 unrecognized high-exposure sites                                                                                                                                                              |
| 4   | "This shipment is detained. Can I document every input back to raw material, free of Xinjiang and listed entities?" | Trade compliance              | Per detention (30-day clock); per new supplier | Goods excluded or exported                                                                                                                                                                                |
| 5   | "Which P1-P7 contingencies cause thermal or voltage violations in my study area, caused by which element?"          | Transmission planner          | Annual; per interconnection                    | NERC compliance                                                                                                                                                                                           |
| 6   | "How much DER can each node of each feeder host?"                                                                   | Distribution planner          | Per request                                    | Interconnection speed                                                                                                                                                                                     |
| 7   | "Where is the fault, what do I open, and which restoration plan picks up the most customers safely?"                | Distribution operator         | Every sustained outage                         | Outage minutes, safety                                                                                                                                                                                    |
| 8   | "Which valves isolate this break, and which customers lose service?"                                                | Utility GIS / operations      | Daily                                          | Public health                                                                                                                                                                                             |
| 9   | "What do our flows and costs look like if we close this DC or demand doubles?"                                      | Network design analyst        | Per project                                    | Capital and logistics cost                                                                                                                                                                                |
| 10  | "Which tier-1 suppliers share a hidden tier-2 source; which parts are single-sourced?"                              | Supply risk, sourcing         | Quarterly                                      | High                                                                                                                                                                                                      |
| 11  | "Which of my suppliers sit within a few ownership or trade steps of a listed entity?"                               | Trade compliance, supply risk | On every list update                           | Altana: 18,000+ companies exposed to newly listed entities (https://altana.ai/blog/illuminating-xinjiang-forced-labor-ecosystem)                                                                          |
| 12  | "Are primary and backup circuits physically diverse?"                                                               | Telecom planner               | Per design and audit                           | Outage exposure                                                                                                                                                                                           |
| 13  | "How exposed is each region or industry, directly and indirectly, to a shock in country Y?"                         | Trade economist               | Per policy question                            | Policy                                                                                                                                                                                                    |
| 14  | "Which road links, if lost, add the most vehicle-hours; who can reach jobs within N minutes?"                       | Transport planner             | Per plan; post-disaster                        | 14.7 percent of urban roads in 2,564 cities exposed to a 1-in-100-year flood (https://blogs.worldbank.org/en/developmenttalk/mobility-and-resilience-global-assessment-flood-impacts-urban-road-networks) |
| 15  | "If bank X defaults, which banks fail next, and how much capital is lost?"                                          | Systemic-risk analyst         | Quarterly; stress tests                        | Financial stability                                                                                                                                                                                       |
| 16  | "Who co-invests with whom?"                                                                                         | Venture analyst               | Per fundraise                                  | Deal flow                                                                                                                                                                                                 |
| 17  | "Which streets carry through-movement and which are well integrated, and how does the scheme change that?"          | Space syntax analyst          | Per design project                             | Planning consent, footfall                                                                                                                                                                                |
| 18  | "Which products is this country already good at, and which nearby products could it move into next?"                 | Economic complexity analyst   | Per policy note; yearly data release           | Industrial policy and investment promotion priorities                                                                                                                                                     |
| 19  | "Which plots could have fed this batch, are all of them deforestation-free, and does the statement validate?"   | EUDR due diligence officer    | Before every placing on the market or export   | Goods cannot be placed on the EU market; penalties                                                                                                                                                        |

## 5. Step-by-step workflows

### 5.1 Time-to-recover / time-to-survive stress test (Simchi-Levi model, Ford)

Source: Simchi-Levi et al., Interfaces 45(5), 2015 (https://hdl.handle.net/1721.1/101782).

1. **Define the graph.** A node is "a part or manufacturing process at a particular supplier or Ford facility"; an edge is "a directed flow of materials."
2. **Assemble data.** MRP BOM, routings, inventory; purchasing sites and spend; plant volumes; margins. Scale: 50+ plants, 4,400+ tier-1 sites, 130,000 parts, up to 10 tiers.
3. **Collect per-node attributes.** Time to recover (TTR), unit profitability, inventory, capacity, alternative sources.
4. **Time to survive first.** TTS is "the maximum amount of time the system can function without performance loss if a particular node is disrupted" (an LP). Flag nodes with TTS below TTR.
5. **TTR scenarios.** Disrupt each node (or plant, part or region) for its TTR; an LP reallocates inventory and alternatives to minimize lost units or margin, giving a performance impact (PI) and a risk exposure index.
6. **Read results.** Of 4,534 sites, 2,773 had no impact and 408 very high. The canonical hidden risk is "a low-cost sensor that has high vehicle exposure."
7. **Hand off.** Tableau map with circle size by PI plus linked supplier and part tables (Ford Figure 8); 400+ low-exposure sites dropped from monitoring.

**Graph implications.** Propagation is not reachability: AND across required BOM inputs, OR across alternatives, time buffers from inventory.

### 5.2 Event-at-location exposure response

Sources: Resilinc case study for NIST (https://www.nist.gov/document/nistusrp-resilinc-cyber-scrm-case-studypdf); Cisco 2011 (https://sloanreview.mit.edu/article/creating-more-resilient-supply-chains).

1. **Prepare.** Map tier-1 and sub-tier sites with "site and part level" data, recovery times and alternates; link parts to products to revenue.
2. **Detect.** Cisco knew of the 2011 tsunami "within 40 minutes."
3. **Select exposed sites.** "What suppliers sit within a 50 or 100-mile radius of an earthquake, flood or other natural catastrophe."
4. **Propagate.** "Impacted parts, products, suppliers, sub-tier suppliers, customers, revenue at risk"; Cisco assessed 300+ suppliers within 12 hours.
5. **Confirm and act.** Supplier status turns potential into confirmed exposure; secure alternates by revenue at risk and TTS.

Views: footprint map, ranked table, drill-down; no source found showing a node-link war-room view.

### 5.3 Building and querying a multi-tier supply graph

Sources: Flaaen et al., "Bill of Lading Data in International Trade Research," Federal Reserve FEDS 2021-066 (https://www.federalreserve.gov/econres/feds/files/2021066pap.pdf); Mungo et al., "Reconstructing supply networks" (https://arxiv.org/pdf/2310.00446); Sayari, a vendor (https://sayari.com/enterprise/forced-labor-screening/). No independent step-by-step tutorial was found; steps 3 and 5 rest on vendor descriptions.

1. **Internal backbone (tier 1 is known).** BOMs, part-to-site sourcing and plant-to-product records from ERP/PLM, keyed by part number, supplier site and tariff (HTS) code; Sourcemap's BOM API ingests exactly these (https://www.sourcemap.com/technology/bill-of-materials-n-tier-mapping). Sub-tier links come from surveys or bought data such as Bloomberg SPLC (800,000+ relationships; https://www.bloomberg.com/professional/insights/data/finding-value-in-supply-chain-data).
2. **Pull trade records.** US import bills of lading are CBP vessel manifests released under FOIA: shipper and consignee name and address, free-text description, vessel, ports, weight, quantity, container. No HS code (vendors impute one from the text) and no value (vendors estimate). Vessels carried nearly 50 percent of US import value in 2019 and 64 percent of trade with China; air and land are absent (Flaaen et al.). A foreign supplier's own suppliers need other countries' customs records; the Laundering Cotton study combined Panjiva's international customs data with UN Comtrade (https://shura.shu.ac.uk/29641/11/Laundering%20Cotton%20--%20AnnexC.pdf, via search summary).
3. **Infer the next tier.** Treat each tier-1 site as a consignee, collect its shippers, keep those whose goods are plausible inputs, repeat upstream. Sayari "traces trade flows backward from each supplier" and "links HS code-level trade manifest data to corporate ownership networks" through tier 3; its UFLPA page claims screening to tier 5 (vendor; https://get.sayari.com/lp-uflpa-compliance/).
4. **Resolve entities.** One shipper appears as "Shimano (Kunshan) Fishing Tackle Co" and "Shimano Kunshan Fishing Tackle Co." (https://panjiva.com/Shimano-Kunshan-Fishing-Tackle-Co/26662373, via search summary). Panjiva's link to a corporate identifier existed for only 10-15 percent of US-import shippers and consignees, and 20 to 35 percent of records lacked a shipper ID depending on the year; firms may have their names redacted for two years at a time, one name at a time (19 CFR 103.31), so a firm can be partly visible (Flaaen et al.); a "to order" bill leaves the consignee blank (https://bimco.org/media/idyjbnyz/bimco-ebl-standard-version-10-pdf.pdf, via search summary). Share of matching done by hand: no source found.
5. **Add the ownership layer.** Registry and beneficial-ownership records add parent, subsidiary, shareholder and director edges beside trade edges; Sayari flags "any supplier with connections to UFLPA-listed entities through ownership, co-directorship, or commercial relationships" (vendor).
6. **Mark what is unknown.** Commercial datasets "cover only a fraction of firms, a very small fraction of links" (Mungo et al.); a missing edge is unknown, not absent; link prediction guesses hidden tier-2 links.
7. **Query.** Single-sourced inputs: count suppliers per input (Neo4j demo `(:Suppliers)-[:SUPPLIES_RM]->(:RM)` with `WHERE supplierCount = 1`; https://neo4j.com/developer/demos/supply_chain-demo/). Shared hidden tier 2: intersect upstream sets of tier-1 suppliers, since "two suppliers may rely on a hidden 'second tier' supplier" (Mungo et al.). Then downstream closure from a flagged node to products.
8. **Read results.** Over 60 percent of US consignees have one foreign shipper, though under 20 percent of import volumes (Flaaen et al.). Vendors deliver tier lists, source-cited entity reports and maps; node-link views appear mainly in vendor demos.

**Graph implications.** Two edge families (trade, ownership) over one entity set; merges that keep every source spelling; absent edges as unknown; upstream-set intersection between chosen nodes.

### 5.4 Transmission contingency analysis in PSS/E (ACCC)

Sources: Colorado State University PSS/E lab 4 (https://www.engr.colostate.edu/ECE461/FA13/LAB4/LAB4.pdf); Virginia Tech thesis automating TPL-001 studies (https://vtechworks.lib.vt.edu/bitstreams/efb3cbf5-f126-4d7a-8ad9-ec5d0ecc42cf/download).

1. **Get a solved case.** Load the base case (.sav/.raw), solve the P0 power flow. Public substitutes: TAMU synthetic grids with coordinates (https://electricgrids.engr.tamu.edu/electric-grid-test-cases/activsg2000).
2. **Define subsystems (.sub)** by area, zone, kV, owner or bus list, for example `AREA 123` with `KVRANGE 100 999` (`psspy.bsys` in scripts).
3. **Define monitored elements (.mon)**, for example `MONITOR BRANCHES IN SUBSYSTEM 'REG'`, with voltage limits.
4. **Build the contingency list (.con).** Automatic single-element events plus scripted ones: `CONTINGENCY NUC_MID_1 / OPEN LINE FROM BUS 151 TO BUS 152 CKT 1 / END`.
5. **Build the DFAX file** from .sub, .mon and .con; "If you make changes ... you MUST re-build the DFAX file" (CSU lab).
6. **Run ACCC**, optionally with remedial-action tripping (.trp); output .acc.
7. **Export violations.** `pssexcel.accc` writes flows, voltages and events to Excel; the thesis flags branches above 90 percent of Rate A that rose at least 5 percent.
8. **Review and mitigate.** Violation tables by area and contingency (https://www.caiso.com/documents/appendix-c-reliability-assessment-study-results.pdf); one-lines or geographic views with post-contingency loading as line color or width (https://documents.pserc.wisc.edu/documents/publications/papers/2004_general_publications/Visualizations-for-Power-System_Nov-2004.pdf); rerun after upgrades.

Open-source: pandapower `run_contingency` returns `max_loading_percent` and `cause_element` (https://pandapower.readthedocs.io/en/latest/contingency.html).

**Graph implications.** Steps 2-4 are graph selection done today as text-file editing.

### 5.5 Trace, isolate and rank criticality on a utility network

Sources: ArcGIS Utility Network tracing documentation; WNTR documentation.

1. **Keep topology valid** (no dirty areas).
2. **Trace** upstream, downstream, connected, subnetwork or isolation; isolation "determines the minimum set of operable assets ... needed to stop a network's resource from flowing"; loops return all features unless flow direction is determinate (https://pro.arcgis.com/en/pro-app/3.3/help/data/utility-network/about-tracing-utility-networks.htm).
3. **Report** valves and customers to dispatch with a schematic diagram (tree, schematic and Geo Positions layouts; https://pro.arcgis.com/en/pro-app/2.7/help/data/network-diagrams/diagram-layouts.htm).
4. **Choose model detail (water).** All-pipes models of 12,000-13,000 nodes for 250,000-350,000 people shrank to about 4,300-4,500 when pipes under 20 cm were trimmed (https://pmc.ncbi.nlm.nih.gov/articles/PMC5896566).
5. **Criticality.** WNTR `wn.to_graph()` yields a directed multigraph with coordinates; compute articulation points, bridges and valve segments, then hydraulic N-1: close each pipe and count junctions below a pressure threshold (https://usepa.github.io/WNTR/criticality.html).

### 5.6 Street-network centrality, accessibility and link criticality

Sources: OSMnx (https://osmnx.readthedocs.io/en/stable/getting-started.html); r5r (https://cloud.r-project.org/web/packages/r5r/vignettes/accessibility.html); Network Robustness Index (https://rosap.ntl.bts.gov/view/dot/28941/dot_28941_DS1.pdf).

1. **Build with a buffer.** OSMnx geocodes a place, queries Overpass, keeps the largest weakly connected component, returns a MultiDiGraph. OSMnx itself "initially buffers the query boundary by 500 meters to create a preliminary graph before truncating it," so that street counts at perimeter nodes stay correct (Boeing 2025, https://arxiv.org/html/2505.00736v1). For centrality the analyst buffers much further: a 30-city study of local betweenness "used a 5000m buffer to download the road network in order to mitigate edge effects. The buffer regions were trimmed after betweenness computation and not included in the analysis" (Yamaoka, Kumakoshi and Yoshimura 2021, https://arxiv.org/pdf/2103.11437). The buffer must be at least the largest distance threshold used in step 4.
2. **Clean and weight.** Simplify, consolidate intersections, project; impute speeds and travel times.
3. **Mark the study area.** Nodes inside the study boundary are flagged live; buffer nodes stay in the graph for routing but get no reported value. In cityseer a node with `live` set to false "is still included in shortest-path calculations (as buffer) but receives no centrality value" (Norman Foster Institute course notes, https://norman-foster-institute.github.io/ua_part1/themes/2_networks/cityseer.html). Gil found that "the centrality measures are affected differently by the edge effect," and differently again depending on the type of network distance, and recommends "defining the network's boundary in a way that is relevant to the research question" (Gil 2017, Environment and Planning B, https://research.chalmers.se/en/publication/?id=245772).
4. **Choose distance thresholds.** Local centrality counts only paths within a radius. Published radii: Porta et al. 800, 1,600 and 2,400 m for closeness; Pont et al. 500 to 5,000 m in 500 m steps; Yoshimura et al. and the 30-city study 300 to 5,000 m in 100 m steps, where 300 m stands for pedestrian movement and 5,000 m for motorized travel (all as cited in https://arxiv.org/pdf/2103.11437). cityseer's examples use 400 and 800 m, or walking times of 5, 10 and 20 minutes (https://cityseer.benchmarkurbanism.com/start); its author argues that a moving window at each threshold "clearly and consistently defines the network boundary in relation to the current point of analysis" and prevents "edge rolloff effects" (Simons 2021, https://arxiv.org/abs/2106.15314).
5. **Measure** travel-time-weighted or metric node and edge betweenness and closeness, once per threshold, each stored as its own column ("possible chokepoints" at the global scale). The 30-city study computed all radii in one pass by trimming paths longer than each threshold rather than rerunning Dijkstra per radius (https://arxiv.org/pdf/2103.11437).
6. **Report live nodes only and compare thresholds.** Drop or hide the buffer, then compare results across radii: side-by-side maps per threshold, or one map per segment colored by the radius at which its betweenness peaks and by the peak height, as in the 30-city study; earlier studies clustered the per-radius profiles (https://arxiv.org/pdf/2103.11437).
7. **Accessibility.** r5r `accessibility()` with cutoffs and opportunities per H3 hexagon, mapped as choropleths.
8. **Criticality.** Remove each link, re-assign, rank by added vehicle-hours; flood studies remove flooded segments and rerun accessibility.

**Graph implications.** A per-node study-area flag that routing ignores and every result table, map and export honors; centrality with a distance (or time, or angle) cutoff at several thresholds in one run; and per-threshold results compared side by side or summarized per element as a peak radius (R36, R54).

### 5.7 Cross-sector dependency and cascading impact analysis (CISA Gateway)

Sources: CISA Gateway fact sheets, 2024 (https://www.cisa.gov/sites/default/files/2024-09/CISA%20Fact%20Sheet%20-%20CISA%20Gateway%20-%20Dependency%20and%20Cascading%20Impacts.20SEP2024%20508%20compliant.pdf) and 2021 (https://www.cisa.gov/sites/default/files/publications/CISA%20Fact%20Sheet%20-%20Gateway%20Dependency%20Tool-508c_final.5NOV2021.pdf); Infrastructure Dependency Primer (https://www.cisa.gov/resources-tools/programs/resilience-planning-program/infrastructure-dependency-primer/learn).

1. **Lay the foundation.** IRPF step 2: identify critical infrastructure and its dependencies.
2. **Collect facility dependencies.** PSAs run the Dependency Survey; the Dependency Profile Editor pre-populates "general inputs and outputs" per facility type.
3. **Characterize each dependency.** For power, water, communications, fuel and transport: "the time it will take for the facility to experience a severe impact once primary service is lost," "what percentage of facility operations can be maintained without backup service," and the backup. Dependencies are physical, cyber, geographic or logical.
4. **Build and view.** Facilities and providers with territories are typed nodes; MapView shows "upstream and downstream dependencies"; Events & Incidents shows "dependencies of multiple service providers on a single display."
5. **Simulate a loss.** "Simulate a compromise of the facility and view the cascading impacts over 12-hour increments" (2024).
6. **Report** by FEMA lifeline; IRPF steps 3-5 assess risk and fund actions.

**Graph implications.** Typed cross-sector nodes; time-annotated dependency edges; time-stepped cascade on a map and as a graph.

### 5.8 DER hosting capacity across feeders

Sources: Sandia 216-feeder study and SDG&E DRIVE comparison (section 3.3); CYME EPRI DRIVE module (https://cyme.com/software/cymeepri, via search summary).

1. **Export feeder models** from GIS into CYME, Synergi or OpenDSS with allocated load.
2. **Set criteria**: ANSI C84.1 voltage, thermal, temporary voltage, protection.
3. **Run.** Brute force is about 40,000 scenarios per feeder, over 3,000 simulation hours for 216 feeders (Sandia); DRIVE takes minutes and "align[s] very closely" (SDG&E).
4. **Read node results.** Feeder hosting capacity is the minimum over nodes (Sandia: average feeder 2.05 MW, average locational 5.1 MW); CYME shows heat maps and one-line color layers per criterion.
5. **Use.** Screen requests against node values; roll up to substation; repeat when models change.

### 5.9 Fault location, isolation and service restoration in an ADMS

Source: Oracle Network Management System ADMS guide, FLISR (https://docs.oracle.com/en/industries/energy-water/network-management-system/2502/nms-adms-implementation-guide/NMS_ADMS_25021/DMS_Implementation_FLISR.06.1.html).

1. **Confirm lockout** from the SCADA recloser signal.
2. **Locate** from "Fault Indication signals from devices along the feeder."
3. **Enumerate**: "Identify all possible restoration scenarios" with SCADA switches.
4. **Check pickup feeders** for "current state, available capacity and near-term future capacity."
5. **Evaluate and select** on violations, safety blocks (tags, grounds, crews), DER and remaining capacity. How operators approve: no source found.

**Graph implications.** Radial, switch-state-dependent connectivity; plans are alternative switch-state sets.

### 5.10 Supply chain network design: baseline, optimized baseline, what-if

Sources: Watson, SCDigest (https://www.scdigest.com/EXPERTS/DrWatson_14-07-08.php?cid=8252); anyLogistix tutorial (https://anylogistix.help/tutorial/tutorial-n-optimization.html).

1. **Fill tables**: locations, products, demand, lanes, rules.
2. **Baseline.** "The baseline model represents how your network performed last year. You use it to validate the costs" (Watson).
3. **Optimized baseline** follows "all the rules that should have been in place" and "becomes your new starting point."
4. **Scenarios.** Each DC is Include, Exclude or Consider (anyLogistix); greenfield proposes locations.
5. **Compare** the 10 best solutions with profit and cost; a map draws routes.
6. **Stress test** with simulated disruptions.

**Graph implications.** Edges carry flow and cost (width on a map); facilities switch on and off; scenarios side by side.

### 5.11 Fiber OSP trace, circuit assignment and diversity audit

Sources: IQGeo (https://www.iqgeo.com/product/network-manager-telecom/insight-edition); ArcFM Fiber Manager guide (via search summary); Microsoft SRLG patent (section 3.8).

1. **Import or draw** routes, conduits, cables, splices and panels down to strand level.
2. **Trace** "fiber and coax networks down to individual strands, splices, and connections" (IQGeo); ArcFM's Full Path trace starts from a fiber, splice case or port.
3. **Assign circuits** from a trace ("light paths"); splice reports list tube, strand, loss and circuit.
4. **Check diversity.** Overlaps found "by auditing/analyzing the KMZ data," paths within 10 meters treated as overlapping (patent). No built-in SRLG modeling found in IQGeo or VETRO.

### 5.12 Input-output and trade network exposure (trade economists)

Sources: Cerina et al., PLOS ONE 2015 (https://pmc.ncbi.nlm.nih.gov/articles/PMC4519177/); Bank of England 2025 toolkit (section 2).

1. **Download.** WIOD: 40 economies plus rest of world, 35 industries; EUREGIO: 249 regions in 14 industries.
2. **Build.** 1,400 industry-country nodes; directed monetary flows seller to buyer with self-loops; "almost complete" unweighted.
3. **Compute exposure.** Leontief inverse; "direct (face-value) and indirect (hidden exposure) linkages" (BoE); weighted PageRank, backward linkages, communities (Cerina).
4. **Threshold for display** at one billion US dollars; statistics on the full network.

**Bilateral variant (BACI).** A disparity-filter backbone at alpha = 0.05 keeps 15 percent of links but 84 percent of imbalance (https://arxiv.org/pdf/0704.1225, via search summary) and "is blind to geography" (https://arxiv.org/pdf/1512.02233, via search summary).

**Graph implications.** Fixed layout across years; backbone for display only; animated comparison.

### 5.13 Interbank exposure network and contagion

Sources: ECB 2018 and RBA 2013 (section 2); Battiston et al., "DebtRank," 2012 (https://pmc.ncbi.nlm.nih.gov/articles/3412322).

1. **Pull supervisory reports**: ECB COREP and FINREP for 84 institutions; RBA large exposures from 155 institutions (10 largest and any above 10 percent of capital).
2. **Resolve counterparties**: "in 70% of cases there is no LEI code"; 3,500+ counterparties.
3. **Build**: exposure edges gross and net (about 11.5 trillion euro gross); 6.3 percent (ECB) and about 5 percent (RBA) of possible links.
4. **Describe**: degree, PageRank, EBA interconnectedness, average path 2.2 steps; dense core, sparse periphery.
5. **Simulate**: a bank fails past 4.5 percent of risk-weighted assets, rounds repeat (ECB); DebtRank propagates partial distress, each edge once.
6. **Publish** whole-network charts (ECB) or text by group (RBA).

**Graph implications.** Threshold cascades and DebtRank; per-quarter comparison; label-hiding or grouped export.

### 5.14 Venture syndication network over rolling windows

Sources: Hochberg, Ljungqvist and Lu 2007 (https://www.stat.berkeley.edu/~aldous/Networks/hochberg.pdf; page numbers below are the journal's); reactionwheel.net 2010 (section 3.9); Neo4j and GraphXR (https://neo4j.com/blog/evaluating-investor-performance-using-neo4j-graphxr-and-ml/); Carniel et al. 2023 (https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9815571/); PitchBook and Crunchbase (section 2).

The academic standard is Hochberg, Ljungqvist and Lu (HLL below). Their sample is 3,469 U.S. venture funds of vintage years 1980 to 1999, managed by 1,974 firms, in 47,705 investment rounds of 16,315 companies, from Venture Economics; 44.7 percent of rounds are syndicated (p. 259). The informal practitioner version (reactionwheel.net, Crunchbase) skips the window, the direction and the outcome.

1. **Pull and clean** round-level records (investor, company, round, date, amount): Venture Economics in HLL, Crunchbase in the practitioner version ("incomplete and self-selecting"); merge duplicate firms; aggregate funds up to their management firm, because "we view networks as existing among VC management firms, not among VC funds" (p. 260).
2. **Choose the syndicate definition, two of them.** For the undirected measures, a syndicate is every firm that invested in the same company, in any round, since firms that joined in different rounds still meet on the board (p. 259). For the directed measures, a syndicate is the firms in one round, and the lead investor is "the syndicate member making the largest investment in the round", ties broken by the largest cumulative investment in the company to date (p. 259, note 10). Results are robust to swapping the two definitions (note 11).
3. **Build one network per window.** Adjacency matrices "over trailing 5-year windows" (p. 256): for a fund of vintage year t, the network of all syndicates in the five years before t (Table I note, p. 260). Directed edges point from the lead to each non-lead member; two non-leads in the same syndicate get no directed edge (p. 256, note 6). Repeat for every year.
4. **Compute five centralities per firm per window** (pp. 256-258): degree (unique co-investors), indegree (unique leads who invited the firm in), outdegree (unique firms invited into its own syndicates), eigenvector, and betweenness, each normalized by its maximum in a network of that window's size so years compare (p. 257).
5. **Join the outcome.** Fund exit rate: the share of portfolio companies exited through an IPO or a sale to another company (M&A) as of November 2003, averaging 34.2 percent (pp. 260-262); at the company level, also survival to a next funding round (p. 253). A one-standard-deviation rise in centrality goes with about 2.5 points more exits (p. 253). The practitioner version plots success rate against investment count after dropping investors with fewer than five investments (reactionwheel.net).
6. **Read and draw.** HLL's Figure 1 draws one window (biotech firms, 1990 to 1994) with arrows from lead to member and double arrows where each has led the other, dropping firms with no ties in that window (p. 256). Practitioners look up one firm's top co-investors (PitchBook, Crunchbase) or its ego network (Neo4j and GraphXR). In dense undirected maps "the drawn edges are more or less decorative" (reactionwheel.net); Carniel et al. warn projections "cannot capture the complex and multi-layered interactions."

**Graph implications.** Two projections of the same round records: undirected by company and directed lead-to-member by round, with the lead chosen by a rule on an amount column; rebuild per trailing window and keep one row per firm per window; indegree, outdegree, eigenvector and betweenness normalized per window; firm metrics joined to an outcome table for a linked scatter; a single window drawn with reciprocal arrows; ego view and ranked co-investor table. R32 and R50.

### 5.15 Space syntax: segment angular analysis and visibility graph analysis

Sources: van Nes, depthmapX workshop manual, 2022 (https://www.hvl.no/siteassets/hvl-internett/arrangement/2022/13sss/001vannesdepthmapworkshop.pdf); SST workshop notes (https://github.com/spacesyntax/SST-Workshops/blob/master/UCL/RCL%20workshop/0.%20Segment%20Map%20Preparation.md); Kolovou et al., 2017 (https://spacesyntax.com/wp-content/uploads/2017/09/Road-centre-line-simplification-principles-for-angular-segment-analysis.pdf); alcyon (https://stat.ethz.ch/CRAN/web/packages/alcyon/vignettes/segmentAnalysis.html).

**The data model is the dual graph.** A node is a line (axial line or street segment); an edge joins two lines, weighted by angle, steps or length. Central London within 7 km: 194,445 OSM segments and 280,616 connections (Kolovou et al.).

1. **Project and crop** in meters; the map should be "double the size of the radius used in the analysis."
2. **Choose radii**: macro 10-20 km, meso 5-10 km, micro 800-2,000 m, local 400 m.
3. **Clean**: drop irrelevant OSM classes; RCL Cleaner, Topology Checker, v.clean.
4. **Unlinks** where lines cross without connecting (bridges, tunnels): generated for OSM, drawn by hand otherwise.
5. **Simplify** dual carriageways, roundabouts and staggered junctions; London fell to about 90,000-96,000 segments.
6. **Verify**: "Unverified maps can affect or even abort the analysis."
7. **Analyze in depthmapX** (van Nes): axial analysis at radius n and 3, 5, 7 steps; fix unlinked lines with Unlink and Link; convert to segments removing stubs under 40 percent; angular analysis (Tulip, 1,024 bins) with choice at radii such as `n, 200, 20`; add normalized NAIN and NACH; red-to-blue maps per radius; export CSV.

**Visibility graph analysis.** Obstacle polygons, a 1 m grid, each cell linked to every cell it sees; visual integration as a heat grid. depthmapX timed out beyond 42,705 cells; a GPU method reached 236,000 cells and 4.8 billion edges (https://arxiv.org/pdf/2604.08374, preprint).

**Graph implications.** Polyline nodes; angular edges; integration and choice at several radii as named columns; unlink edits; very high edge counts for VGA.

### 5.16 Forced-labor trace to origin for a detained shipment (UFLPA tracing package)

Sources: CBP, Forced Labor Enforcement Operational Guidance for Importers, Publication 5560-0526, June 2026 ("the 2026 guidance"; https://www.cbp.gov/sites/default/files/2026-06/fld_importer_guidance_final_06092026_0.pdf), which replaced the June 2022 UFLPA guidance (https://www.cbp.gov/sites/default/files/assets/documents/2022-Jun/CBP_Guidance_for_Importers_for_UFLPA_13_June_2022.pdf); CBP UFLPA FAQ (https://www.cbp.gov/trade/programs-administration/forced-labor/faqs-uflpa-enforcement); Foley & Lardner, 2024 (https://www.foley.com/insights/publications/2024/02/multinational-company-cbps-uyghur-forced-labor-part-iii/); Holland & Knight, 2026 (https://www.hklaw.com/en/insights/publications/2026/07/new-compliance-tools-cbp-issues-comprehensive-forced-labor-guidance).

**The rule.** Goods made wholly or in part in Xinjiang (XUAR) or by an entity on the UFLPA Entity List are presumed made with forced labor; the FAQ says one small component from a tier-3 or tier-4 supplier is enough, and also targets affiliates of listed entities and transshipped goods. The list held 187 entities after 43 were added in August 2026 (https://www.thomsonreuters.com/en-us/help/onesource-global-trade/regulatory-insights/2026/august-4th/dhs-updates-uflpa-entity-list-43-new-entities.html). The importer requests an applicability review (no XUAR input or listed entity anywhere in the chain) or an exception (clear and convincing evidence of no forced labor). CBP detained 16,755 shipments worth nearly 3.7 billion dollars through August 2025 (https://www.csis.org/analysis/assessing-impact-uyghur-forced-labor-prevention-act-after-three-years, via search summary).

**The unit is one shipment (an entry), not a supplier.**

1. **Receive the detention notice.** It states the reasons; the importer has 30 days to respond or export, and must request any extension before the deadline (2026 guidance; Foley).
2. **Anchor on the entry.** Tie the goods to purchase orders through invoice, packing list and bill of lading.
3. **Break the product into materials and production steps.** Appendix A names the stages for twelve sectors (aluminum, apparel, caustic soda, copper, cotton, lithium, PVC, red dates, seafood, silica-based products, steel, tomatoes). Apparel: fiber, yarn, fabric, dyeing and finishing, garment assembly. Cotton: from "the origin of the cotton at the bale level." Polysilicon: from the location of the quartzite through polysilicon to the downstream goods. Steel: mining, blast, basic oxygen or electric arc furnace, casting, rolling, finishing. Seafood: where caught or farmed, processed, packed and exported. Tomatoes: lot codes by commodity, variety, location and harvest date.
4. **Walk upstream one step at a time.** For each step record the entity, its role ("whether a supplier is also a manufacturer"), address and contacts, related-party status under 19 CFR 152.102(g), and the records linking it to the next step: purchase order, invoice "for all suppliers and sub-suppliers," packing list, BOM, certificate of origin, payment record, seller's and buyer's inventory records, bills of lading. For each upstream entity the importer did not buy from directly, cite the business record that identified it. Collect an affidavit from each entity; suppliers unwilling to share with the importer may send records to CBP directly (Appendix E; FAQ).
5. **Reconcile quantities.** Show "that the volume of input of component materials matches the volume of output," with production orders and capacity reports proving the supplier could have made the goods (Appendix E; Foley). Factories sourcing the same input inside and outside XUAR "risk being subject to detention" because commingling is hard to rule out (Appendix A).
6. **Screen every entity** against the Entity List and the withhold-release-order and Findings dashboard, looking through ownership to parents and affiliates (Appendix B example; FAQ).
7. **Draw the flowchart and maps.** For cotton, "Number each step along the production process and number any additional supporting documents associated with each step"; maps show each step's region; for metals the flowchart must "distinguish which company performs each step" (Appendix A).
8. **Optionally test origin.** Isotopic fingerprints are compared with a reference library; slow, and "will not function as a viable method of origin determination for all products" (Appendix D).
9. **Compile and submit.** Cover letter, executive summary, numbered exhibits grouped by component or stage ("1.1 supplier123/manufacturer ABC & copper tube"), confidential information in double brackets, OCR, originals plus English translations, no duplicates (Appendix C), through the Forced Labor Portal (Holland & Knight). Review averages two to three weeks; a summary tracing report for a supply chain CBP already reviewed cut detention to 10-14 days (FAQ).
10. **Prebuild for next time.** Affidavits, redacted or untranslated records and incomplete sub-tier information are "unlikely to satisfy CBP," and "a gap for even one supplier can undermine the entire submission" (Holland & Knight). CBP's worked example collects records from ginning to the warehouse before any detention and drops a supplier that will not provide them (Appendix B).

**Vendor-assisted variant.** Sayari: upload the vendor list, resolve each entity, trace trade backward, link ownership, receive "a source-cited map, a UFLPA flag report, and a package for CBP detention response," with alerts on list or ownership changes; it attributes 47 percent of first-half 2025 detentions to tier-2 and tier-3 exposure (vendor claim citing CBP data; section 5.3 links). Kharon's ClearView shows ownership and commercial links from a processor back to entities of concern (https://www.kharon.com/solutions/industries/retail-apparel, via search summary). Researchers use the same data: Laundering Cotton (Sheffield Hallam, 2021) linked five Chinese textile makers to 53 garment suppliers in ten countries through customs records (https://www.shu.ac.uk/news/all-articles/latest-news/laundering-cotton-report, via search summary). Typical package size: no source found.

**EU regimes differ in unit and trigger.**

- EU Deforestation Regulation (2023/1115): a different population with a different unit (a due diligence statement, not an entry) and land-plot origins; see section 5.18.
- EU Forced Labour Regulation (2024/3015; applies from 14 December 2027): no presumption and no entity list; authorities investigate on risk using a database of risk areas and products, request information in a preliminary phase, aim to finish in nine months, and can order withdrawal and disposal (https://cliffordchance.com/insights/resources/blogs/business-and-human-rights-insights/2025/02/eu-ban-on-products-made-with-forced-labour-makes-its-way-into-law.html; https://single-market-economy.ec.europa.eu/single-market/goods/forced-labour-regulation_en). Tracing is on request during an investigation, not per border shipment.

**Graph implications.** A shipment-scoped upstream tree cut from a standing supplier graph, one branch per material, nodes labeled by production step; every edge carries its documents (type, number, date, quantity) and every node a citation; trade and ownership edges together, so closeness to a listed entity is a path through either; input-versus-output checks per node and a flag on mixed-origin nodes; gaps shown as gaps; export as a numbered flowchart, a map and an exhibit index sharing one numbering.

### 5.17 Product space: country overlay and diversification opportunities (economic complexity analysts)

Sources: Hidalgo et al. 2007 as summarized at https://en.wikipedia.org/wiki/The_Product_Space; py-ecomplexity README (https://github.com/cid-harvard/py-ecomplexity); R economiccomplexity projections() (https://pacha.dev/economiccomplexity/reference/projections.html); node and edge files (https://michelecoscia.com/?p=223).

1. **Start from a two-mode table.** Rows are countries (or regions), columns products (or industries), values export value by year.
2. **Binarize by revealed comparative advantage.** A country "exports" a product when its Balassa RCA is at least 1; py-ecomplexity's presence test defaults to RCA with threshold 1 and also offers a per-capita test or a manual matrix.
3. **Project to products.** Proximity between two products is "the minimum of both conditional probabilities" that a country exports one given the other (Wikipedia summary of Hidalgo et al. 2007). The result is a dense product-by-product matrix.
4. **Draw a backbone in one canonical layout.** The original map takes the maximum spanning tree, "775 product nodes and the 774 links", adds "all links of proximity greater than or equal to 0.55" for an average degree of about 4, giving "775 nodes and 1525 links", lays it out with a force-directed spring algorithm and then untangles dense clusters by hand; nodes are colored by product sector and sized by world trade share (same source). The R package instead prunes links until a target average degree (default 5) and falls back to a spanning tree of the strongest links. The finished layout is then distributed as files with fixed x and y coordinates and a community per node (https://michelecoscia.com/?p=223), not recomputed per study.
5. **Overlay one country.** On the fixed map, mark the products where that country has RCA of at least 1; the 2007 paper marks them with black squares, and the OEC keeps the layout fixed while outlining the country's export basket (via search summary of the OEC Wikipedia article, https://wikipedia.com/wiki/Observatory_of_Economic_Complexity). Repeat for other years or countries on identical coordinates.
6. **Rank opportunities.** For each product the country does not yet export, density is the proximity-weighted share of its neighbors that the country already exports: "A high density reflects that a country has many developed products surrounding the unoccupied product" (Wikipedia summary). The ranked list, often weighted by product complexity, is the deliverable.

**Regional variant.** Economic geographers build the same pipeline from region-by-industry or region-by-technology tables (relatedness density, EconGeo); the EU smart specialization literature uses it to pick diversification paths (Balland et al., section 2).

**Graph implications.** The pipeline from a two-mode table to a proximity network is not an ordinary bipartite projection: it binarizes by RCA and normalizes by conditional probability, not by count. The layout is a shared reference, loaded from coordinates and reused for every country and year, with per-entity overlays; the ranking (density) is computed against the overlay, not the graph alone.

### 5.18 Deforestation due diligence statement from plot to product (EUDR operators)

Sources: Commission EUDR traceability and geolocation page (https://green-forum.ec.europa.eu/nature-and-biodiversity/deforestation-regulation-implementation/traceability-and-geolocation-commodities-subject-eudr_en); EUDR Information System GeoJSON rules (https://eudr.webcloud.ec.europa.eu/tracesnt/help/eudr-documentation/operator/geojson-description.html); Finnish Food Authority EUDR FAQ, which states it is not legally binding (https://www.ruokavirasto.fi/en/themes/deforestation-regulation/faq-eudr/); Sourcemap's analysis of the April 2026 Commission FAQ update (https://www.sourcemap.com/blog/analysis-commission-publishes-updated-eudr-faqs); Jones Day on the 2025 amendment (https://www.jonesday.com/en/insights/2025/12/eu-deforestation-regulation-amendments-deferred-timelines-and-simplification-measures).

**The unit is one due diligence statement.** It does not need to be batch-specific and may cover several batches and products; it may be prepared up to a year ahead (Finnish FAQ). The chain it covers runs from land plots through collectors, cooperatives or mills and exporters to the first placer in the EU. Downstream companies only keep and pass on its reference number.

1. **Collect plot geolocations from suppliers.** Each plot is a GeoJSON feature in WGS 84, longitude first: a Point (with an Area property in hectares, default 4) for a plot under 4 hectares, a closed Polygon or MultiPolygon otherwise; no line strings, no holes, no self-crossing edges; coordinates truncated to six decimals; ProducerCountry required, ProducerName and ProductionPlace optional (Information System GeoJSON rules). Micro and small primary operators in low-risk countries may give a postal address for their plots instead (Jones Day). In practice the plot list comes from a cooperative's or mill's mapping, or a national system such as Cote d'Ivoire's cocoa census, which counted about 1 million farmers on 2.3 million hectares, with 705,000 farmer identity cards issued by January 2024 (https://agroberichtenbuitenland.nl/actueel/nieuws/2024/09/23/tracing-the-roots-of-cote-divoires-cacao-enhancing-supply-chain-transparency).
2. **Link plots to the batch.** Record which plots fed which collection point, cooperative, mill or silo, and which of those fed the batch. For shared storage the operator declares the production places of all goods that entered the container since it was last emptied (Sourcemap on the April 2026 FAQ). A statement may declare more plots than the goods actually came from ("declaration in excess"), but only for bulk goods not mixed with non-compliant or untraceable material (https://www.foodnavigator.com/Article/2024/10/11/EUDR-Answering-the-key-questions/). So the edge from plot to batch means "could have contributed", not "did contribute".
3. **Check mixing.** Mixing compliant goods with non-compliant goods or goods of unknown origin is not allowed, and if they cannot be separated the whole shipment cannot be placed (Commission page above, via search summary); mass balance is allowed only when every input is compliant (Finnish FAQ; https://www.fairtrade.net/content/dam/fairtrade/global/fairthrive/Mass%20balance%20for%20EUDR.pdf, via search summary). One non-compliant plot linked to a statement makes the others non-compliant too (FoodNavigator above).
4. **Assess risk.** Overlay each plot on forest-cover and deforestation maps for the 31 December 2020 cut-off, check legality of production in the producing country, and look for gaps in the plot list, which signal a high risk of mixing (https://efi.int/sites/default/files/files/flegtredd/TF/Documents/Insight%20-%20Geolocation%20and%20the%20EUDR%20Dec25.pdf, via search summary). Geolocation is required even for plots in low-risk countries (Sourcemap above).
5. **Mitigate or drop.** Ask suppliers for better polygons, field checks or audits; exclude plots or suppliers that cannot be cleared.
6. **File the statement.** Upload the GeoJSON (25 MB in total per statement; Information System GeoJSON rules), quantities, HS codes and supplier details in the Information System; receive a reference number (up to 14 characters) and a verification number (up to 8) (Finnish FAQ).
7. **Pass the reference number on.** The first downstream operator or trader receives the reference numbers or declaration identifiers with the goods and keeps them for five years; further downstream companies are not required to pass them on (Finnish FAQ; Sourcemap above). The paper trail therefore reaches only the first transaction after the goods are placed on the market.
8. **Reuse plots for repeat shipments.** The same polygon can be referenced in many statements when shipments come from the same land (ResourceWise, section 3.14).

**Size of real plot-to-product graphs.** The origin tier is wide: about 7 million oil palm smallholders supply 2,200 mills, "sometimes thousands of smallholders per mill" (https://www.foodnavigator.com/Article/2025/09/09/eudr-palm-oil-traceability-challenges/); one palm oil refinery in Indonesia took 97 percent of its volume from 25 third-party mills in the first half of 2025 (https://www.ldc.com/wp-content/uploads/Palm-Traceability-to-Mill-List-H1-2025.pdf, via search summary). A refinery-level statement can therefore reach tens of thousands of plot nodes through a few dozen mills, a few hundred nodes above them, and one product at the top. Typical plots per statement: no source found; the only limit stated is the 25 MB file size.

**Graph implications.** The leaf nodes are polygons with an area, not points, and they must be drawn as shapes on a map, selected by drawing or by an imported region, and checked against an overlay layer; this is the one workflow in this document where node geometry is data. Plot-to-batch edges mean possible contribution, so a batch's upstream is a reachable set, and one flagged plot must mark every batch and statement it can reach. The tree is very wide at the bottom and shallow (plot, collector or cooperative, mill or exporter, first placer), so it needs aggregation of plots by supplier with counts and flag totals. Import must validate the Information System's GeoJSON rules (closure, holes, self-crossing, six decimals, file size) before the statement is filed. Downstream of the first placer there is no graph, only a reference number.

### 5.19 Asset correlation trees over rolling windows (economic network analysts, market-risk variant)

Sources: Mantegna 1999 (https://arxiv.org/abs/cond-mat/9802256); Onnela et al. 2003 (https://arxiv.org/abs/cond-mat/0302546); the econophysics review by Chakraborti, Muni Toke, Patriarca and Abergel, which restates the dynamic asset tree method in detail (https://arxiv.org/pdf/0909.1974); riskfolio-lib PlotFunctions source (https://riskfolio-lib.readthedocs.io/en/latest/_modules/PlotFunctions.html).

1. **Load prices and sectors.** Daily closing prices for a fixed set of assets (Onnela et al.: 477 NYSE stocks, 1980-1999, 5,056 prices per stock; a 116-stock S&P 500 subset for drawings), plus a third-party classification giving each asset a sector and an industry (Forbes in the review above, 12 sectors).
2. **Compute returns.** Log price differences per day ("daily log price differences", Mantegna).
3. **Window.** Split the series into windows of width T trading days moved by a step; Onnela et al. used T = 1,000 days stepped monthly (about 21 days), giving 195 windows, and call the width "a trade-off between too noisy and too smoothed data" (review above).
4. **Correlate.** One N x N correlation matrix per window, Pearson by default; riskfolio-lib also offers Spearman, Kendall, Gerber, mutual information and tail dependence as its "codependence" options (source above).
5. **Transform to distance.** d = sqrt(2(1 - rho)), so 0 means perfectly correlated and 2 perfectly anti-correlated (review above).
6. **Filter.** Keep the minimum spanning tree (N - 1 edges) or the planar maximally filtered graph, which keeps the tree and has 3(N - 2) edges (Tumminello et al. 2005, https://openalex.org/W2094688862), or a threshold graph.
7. **Color and read one window.** Draw the tree with each asset colored by sector; branches of one color are sectors the market itself recognizes, mixed branches are not (Mantegna's taxonomy check). Pick a central vertex (highest degree, or another rule; General Electric in the review's 1998 tree) and read each asset's level from it.
8. **Track the series.** Per window: normalized tree length, mean occupation layer (average level from the central vertex) and the distribution of tree edge lengths. The tree shrinks around a crash: the review's figure shows Black Monday (19 October 1987) as a cut in the edge-length distribution, and Onnela et al. report a low mean occupation layer during crashes.
9. **Use.** Portfolio researchers check where assets sit: the Markowitz minimum-risk portfolio assets "always" lie on the outer leaves (Onnela et al. abstract), and Pozzi et al. 2013 build portfolios from the most peripheral stocks of filtered graphs rebuilt daily over the previous year's correlations (https://www.nature.com/articles/srep01665). Export the per-window table and the drawn trees.

**Tools and figures.** Code first: riskfolio-lib's plot_network builds the tree (or, with DBHT linkage, the planar graph), colors nodes by cluster and lays it out with networkx spring, planar, circular or Kamada-Kawai, for one window at a time (source above). Published figures are one sector-colored tree per chosen date plus line charts of tree measures over time.

**Graph implications.** The node set is fixed and every window's network is derived, so the analyst needs the transform and the filter inside the tool, not a precomputed edge list (R51); one tree per window with the same asset in a recognizable place from frame to frame (R52); and sector coloring with a per-branch sector count (R53). Statistics come from the full correlation matrix; only the drawing is filtered, as with the trade backbone in section 5.12.

## 6. Data

| Domain                       | Formats                                                                                    | Size (sourced)                                                                                                                                                              | Properties                                                                                          | Identifier problems                                                                 | Sensitivity                      |
| ---------------------------- | ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | -------------------------------- |
| Supply chain (internal)      | ERP/MRP BOM, routing, purchasing, inventory; CSV/SQL                                       | Ford: 4,400+ tier-1 sites, 130,000 parts, 10 tiers                                                                                                                          | Directed, mostly acyclic, part-at-site nodes, quantity edges, TTR/TTS/inventory/margin, coordinates | One supplier under many names, at several tiers                                     | Confidential                     |
| Supply chain (external)      | Bills of lading, registries, SPLC, vendor graphs                                           | Sayari claims 4B+ trade records, 500M+ companies (vendor)                                                                                                                   | Trade plus ownership multigraph; HS and value imputed                                               | 10-15 percent of US-import parties linked to a corporate ID; redactions; "to order" | Licensed                         |
| Forced-labor tracing package | PDFs of POs, invoices, BOLs, affidavits, production records; flowchart; maps | Per shipment; no source for typical size                                                                                                                                    | Shipment-scoped tree to raw material; documents per edge; quantities per node                       | Names in Chinese and English; related parties                                       | Business confidential, bracketed |
| EUDR due diligence statement | GeoJSON plots (Point, Polygon, MultiPolygon), supplier and lot records, reference numbers | 25 MB of GeoJSON per statement; up to thousands of smallholders per palm oil mill (section 5.18) | Very wide, shallow tree from plots to one product; possible-contribution edges; plot area and country | Farmer names and plot ids differ across cooperatives, mills and national systems | Commercially confidential; farmer personal data |
| Network design               | Location, demand, lane, cost tables                                                        | No source found                                                                                                                                                             | Layered flow network                                                                                | Location codes vary                                                                 | Confidential                     |
| Input-output                 | Dense matrices                                                                             | WIOD 1,400 nodes                                                                                                                                                            | Near-complete weighted directed, yearly                                                             | Classifications change                                                              | Public                           |
| Interbank exposures          | Supervisory templates into matrices                                                        | 84-155 banks, 3,500+ counterparties                                                                                                                                         | Sparse weighted directed, core-periphery                                                            | Names without LEI                                                                   | Confidential                     |
| Infrastructure dependency    | Gateway survey records, GIS layers                                                         | No public source                                                                                                                                                            | Typed cross-sector nodes; time to impact, backup duration, percent function                         | Facility vs provider naming                                                         | Gateway users only               |
| Power transmission           | PSS/E .raw/.sav/.sub/.mon/.con/.acc, PowerWorld, PSLF, MATPOWER, CIM                       | 2,000 to 82,000 buses                                                                                                                                                       | Undirected multigraph; impedance, ratings, switch states                                            | Bus numbers vs substation names                                                     | CEII                             |
| Power distribution           | Utility Network, ArcFM, CYME/Synergi/OpenDSS                                               | 142 to 6,001 buses per feeder; FirstEnergy 8,400 circuits (https://sspinnovations.com/our-projects/how-firstenergy-modernized-grid-operations-with-arcgis-utility-network/) | Radial, switch-dependent                                                                            | GIS vs model IDs                                                                    | Sensitive                        |
| Water                        | Geodatabase, EPANET .inp                                                                   | 12,000-15,000 pipes all-pipes                                                                                                                                               | Looped, valve states                                                                                | GIS vs model IDs                                                                    | Sensitive                        |
| Telecom                      | IQGeo/VETRO/ArcFM, KMZ, GraphML                                                            | No source found                                                                                                                                                             | Conduit, cable, strand, circuit layers; shared-risk groups                                          | Logical vs physical IDs                                                             | Sensitive                        |
| Space syntax                 | DXF, shapefile, .graph                                                                     | Up to 194,445 segments                                                                                                                                                      | Dual graph, angular weights, unlinks                                                                | Split lines                                                                         | Open                             |
| Transport                    | OSM .pbf, GTFS                                                                             | No single source                                                                                                                                                            | Directed multigraph, travel time                                                                    | OSM IDs change                                                                      | Open                             |
| Product space and relatedness | Country-by-product export panels (HS, SITC) as CSV or API; node and edge files with fixed x, y and community | 775 products and 1,525 links in the 2007 map; 6,000+ goods and services in the Atlas (https://growthlab.hks.harvard.edu/tools) | Two-mode table projected to a sparse undirected weighted product network; one fixed layout reused across entities and years | Classification revisions (HS 1992, 2012, 2022) and layout redesigns break comparisons | Open |

| Asset correlation trees | Daily price or return tables (CSV), one column per asset, plus a sector table | 116 to 477 stocks, 4,787 to 5,056 daily prices, 195 windows (Onnela et al., section 5.19); 418 banks (Craig and Saldias) | Complete before filtering; fixed node set, edges change every window |

Scale inference (ours): 8,400 circuits is millions of buses, worked one feeder at a time.

## 7. Analysis methods

**Why betweenness is the wrong default for supply risk.** In a part-to-product DAG most pairs have no path and a product fails when any required input is missing; exposure tracks BOM position, inventory and alternatives (Ford Figure 3). Betweenness suits hub networks such as airports and ports (https://neo4j.com/developer-blog/supply-chain-neo4j-gds-bloom/). Compliance tracing is different again: the question is whether any path reaches a listed entity or region, and each edge must be proven with a document.

**Topology alone misleads on physical networks.** Hines et al. found only "mild correlation" between topological metrics and blackout size (https://arxiv.org/abs/1002.2268v4); WNTR pairs graph metrics with hydraulic N-1; betweenness on streets assumes a flat origin-destination matrix. Graph measures screen; physics or demand models decide.

**Other methods.** SRLG-aware disjoint paths are NP-hard in general (https://cse.unl.edu/~netgroup/publication/xu-srlg-diverse-2011); road criticality uses link removal with reassignment (https://ideas.repec.org/a/eee/transa/v44y2010i5p323-336.html).

## 8. Outputs and collaboration

Ranked tables linked to impact-sized map circles for supply executives; tracing packages (numbered flowchart, maps, exhibit index, affidavits) for CBP; scenario cost tables; lifeline briefings and cascade timelines; violation tables and hosting capacity maps; switching plans, valve lists and schematics; exposure indicators by group; accessibility and segment maps. CEII, Gateway, supervisory and business-confidential rules limit sharing.

## 9. Tools landscape and pain points

| Tool                                             | Used for                                                      | Fails them (evidence)                                                                                                                       |
| ------------------------------------------------ | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Resilinc, Everstream, Interos, Sourcemap, Altana | Supplier mapping, alerts                                      | Coverage depends on "supplier upload discipline across tiers" (https://www.rfp.wiki/vendors/sourcemap)                                      |
| Sayari, Kharon                                   | Trade-plus-ownership tracing, Entity List flags, CBP packages | Vendor claims only; no independent evaluation found                                                                                         |
| Coupa, Cosmic Frog, anyLogistix                  | Network design                                                | Baseline cost data hard to get (Watson)                                                                                                     |
| Neo4j Bloom/GDS                                  | Multi-tier queries                                            | Built by engineers, not risk managers                                                                                                       |
| KeyLines/ReGraph map mode                        | Geo plus network                                              | Layout disabled, nodes not draggable, straight links only (https://developers.cambridge-intelligence.com/docs/keylines/leaflet-integration) |
| PSS/E, PowerWorld, TARA                          | Power flow, ACCC                                              | Subsystems in text files; many contingency states are "one of the core issues" for visualization (https://arxiv.org/pdf/2106.04661)         |
| ArcGIS Utility Network, ArcFM                    | Traces, diagrams                                              | Dirty areas block traces                                                                                                                    |
| EPANET, InfoWater, WNTR                          | Hydraulics, criticality                                       | Graph metrics alone miss hydraulics                                                                                                         |
| IQGeo, VETRO, ArcFM Fiber                        | OSP design and traces                                         | Diversity audits by KMZ overlap                                                                                                             |
| depthmapX, Space Syntax Toolkit, sDNA            | Angular analysis, VGA                                         | Hand map preparation; VGA times out past about 43,000 cells                                                                                 |
| OSMnx, r5r                                       | Street graphs, accessibility                                  | Results are maps, rarely interactive graphs                                                                                                 |
| Gephi GeoLayout                                  | Geographic placement                                          | Missing coordinates dumped on a line; no basemap (https://gephi.org/desktop/plugins/geolayout-plugin)                                       |
| Atlas of Economic Complexity, OEC, ecomplexity, economiccomplexity, EconGeo | Product space views, RCA, proximity, density                  | Web tools show only their own fixed layout and data; code packages return matrices or igraph objects with no drawing; layout redesigns break year-over-year figures (Atlas 10.0) |

Cross-cutting: geographic and topological views are "rarely combined" in grid tools (https://arxiv.org/pdf/2106.04661).

## 10. Requirements implied

Compared against design/designloom: no capability covers geography, basemaps, flows, recovery times, BOMs, cross-sector dependencies, dual graphs or document-backed edges; `removal-impact-analysis` is reachability-based; W11 relies on `centrality-betweenness`.

| #   | Requirement                                                                                                                                                 | Priority | Covered? |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | -------- |
| R1  | Geographic layout from lat/lon or projected x/y; nodes missing coordinates listed, not hidden                                                               | Must     | No       |
| R2  | Basemap with synchronized zoom; edges straight or as stored polylines                                                                                       | Must     | No       |
| R3  | Switch or blend geographic, schematic and force layouts keeping selection                                                                                   | Must     | Partly   |
| R4  | Spatial selection by radius or polygon, then propagate                                                                                                      | Must     | No       |
| R5  | Downstream propagation with AND across required inputs and OR across alternatives                                                                           | Must     | No       |
| R6  | Per-node and per-edge time buffers (TTR, inventory days, backup duration) showing when each downstream node fails                                           | Must     | No       |
| R7  | Weighted roll-up to terminal nodes (revenue, customers) with a ranked table linked to canvas and map                                                        | Must     | Partly   |
| R8  | Run the impact scenario for every node or group; store results as attributes                                                                                | Must     | No       |
| R9  | Scatter of two node attributes linked to the graph                                                                                                          | Should   | No       |
| R10 | Shared upstream dependencies of a set of nodes; alternatives per input                                                                                      | Must     | No       |
| R11 | Tier computation with layered layout and grouping                                                                                                           | Must     | Partly   |
| R12 | Aggregate by geography or company with drill-down, non-destructively                                                                                        | Should   | No       |
| R13 | Capacity and flow in algorithms (max flow / min cut, weighted paths)                                                                                        | Should   | No       |
| R14 | Bridges and articulation points; N-1 enumeration reporting islands                                                                                          | Must     | Partly   |
| R15 | Travel-time-weighted paths and centralities, edge betweenness, cutoff radius                                                                                | Must     | Partly   |
| R16 | Switch/valve states remove edges from traversal; isolation query                                                                                            | Must     | No       |
| R17 | Directed traversal from designated sources (upstream/downstream trace)                                                                                      | Must     | Partly   |
| R18 | Shared-risk groups; check two paths share none, including polyline overlap within a tolerance                                                               | Should   | No       |
| R19 | Import GraphML with coordinates, GeoJSON/GeoPackage, EPANET .inp, MATPOWER/pandapower, KMZ, CSV with lat/lon                                                | Must     | Partly   |
| R20 | Multi-layer graphs (BOM over site; strand under circuit; facility on another sector's provider) with cross-layer impact                                     | Must     | No       |
| R21 | Scenario comparison side by side and robustness across parameter ranges                                                                                     | Must     | Partly   |
| R22 | Export map plus linked table as image and CSV; scenario definition saved                                                                                    | Must     | Partly   |
| R23 | Confidence per edge; unknown sub-tiers shown as unknown, not absent                                                                                         | Must     | No       |
| R24 | Scale: 130,000+ part-site nodes, 82,000-bus cases, thousands of 6,000-bus feeders, city street graphs                                                       | Must     | Partly   |
| R25 | Works fully in-browser with no data leaving the machine (CEII, Gateway, supplier and business-confidential data)                                            | Must     | Partly   |
| R26 | Cross-sector cascade: edges with time to impact, backup duration, percent function; time-stepped playback; grouping by lifeline                             | Must     | No       |
| R27 | Select a subsystem by attribute (area, zone, kV), expand to its branches, export the list                                                                   | Should   | No       |
| R28 | Per-node result heat maps on schematic and geographic views, across many feeders                                                                            | Must     | No       |
| R29 | Compare alternative switch-state configurations by load picked up and blocked devices                                                                       | Should   | No       |
| R30 | Flow volume as edge width on maps; facility open/close toggles                                                                                              | Should   | No       |
| R31 | Dense matrices; backbone (disparity filter) for display while metrics use the full network; same layout across years                                        | Must     | No       |
| R32 | Bipartite projection either way with a matching rule and count weight                                                                                       | Should   | No       |
| R33 | Default-cascade and DebtRank-style propagation with a per-node threshold, reporting rounds and value lost                                                   | Should   | No       |
| R34 | Export that hides labels or aggregates nodes into groups                                                                                                    | Should   | No       |
| R35 | Dual-graph mode: segments as polyline nodes, edges weighted by turn angle, built from centerlines with stub removal                                         | Should   | No       |
| R36 | Radius-limited closeness and betweenness at several radii (steps, meters, angle) in one run, each a named column                                            | Should   | No       |
| R37 | Unlink and link editing where lines cross; list unlinked lines                                                                                              | Should   | No       |
| R38 | Evidence on edges and nodes: attach record type, number, date, quantity and file reference; list edges with no evidence                                     | Must     | No       |
| R39 | Shipment-scoped trace: from one node, extract the upstream tree per input, label nodes by production step, show missing steps as gaps                       | Must     | No       |
| R40 | Two edge families (trade, ownership/control) over one entity set; entity merge that keeps every source name and can be undone                               | Must     | No       |
| R41 | Watch-list proximity: load a list of entities, flag every node with a path to one within k steps over chosen edge types, show the path and its evidence     | Must     | No       |
| R42 | Quantity reconciliation: per node compare input and output volume with a yield factor; flag nodes whose inputs come from both flagged and unflagged sources | Should   | No       |
| R43 | Tracing-package export: numbered flowchart of steps, map of facility locations, exhibit index keyed to the same numbers                                     | Should   | No       |
| R44 | Plot nodes from GeoJSON: Point with area or Polygon and MultiPolygon drawn as shapes on the map, validated against the EUDR Information System rules (closed rings, no holes or crossings, six decimals, 25 MB per statement) | Should   | No       |
| R49 | Possible-contribution trace: from a flagged plot mark every batch and statement it can reach, and from a batch list every plot that could have fed it, aggregated by supplier with counts | Should   | Partly (`dependency-propagation` marks downstream failure; `leaf-grouping` folds plots by supplier) |
| R45 | Two-mode table to relatedness network: binarize by RCA (threshold 1, or per-capita, or a supplied matrix), project to proximity as the minimum of the two conditional probabilities | Should   | Partly (`bipartite-projection` weights by count, not RCA and conditional probability) |
| R46 | Display backbone as maximum spanning tree plus edges above a proximity threshold or a target average degree, statistics still on the full matrix | Should   | Partly (`backbone-extraction`, `threshold-sweep`) |
| R47 | Reference layout loaded from coordinates and reused for every country, region and year, with a per-entity overlay (presence marked, others dimmed) and side-by-side years | Must     | Partly (`fixed-base-map-layout`, planned) |
| R50 | Directed projection from records with a role rule (lead = largest amount in the round, tie broken by cumulative amount), rebuilt for every trailing window with metrics normalized per window and kept as one row per node per window | Should   | Partly (`per-window-metrics`, `event-window-aggregation`, `bipartite-projection` planned or undirected) |
| R48 | Density ranking: for one entity, rank absent nodes by the proximity-weighted share of neighbors it already has, as a table linked to the map | Should   | No       |
| R51 | Correlation-filtered graphs: from a node-by-time value table, returns, rolling-window correlation (estimator selectable), distance sqrt(2(1 - rho)), and a minimum spanning tree, planar maximally filtered graph or threshold per window, with correlation and distance kept on each edge | Should   | Partly (`backbone-extraction` thresholds a matrix; `matrix-stack-import` takes precomputed windows) |
| R52 | Per-window tree measures (normalized tree length, central vertex, mean occupation layer, edge survival between windows) with layout continuity so an asset keeps its place between consecutive windows | Should   | Partly (`per-window-metrics`) |
| R53 | Category coloring with a per-branch count of categories, for checking a tree against a sector classification | Could    | Partly (`visual-encoding-nodes`, `legend-display`) |
| R54 | Study area with a buffer: import a network larger than the study boundary, flag nodes inside it as live, route over all nodes but report, color and export values only for live nodes; compare per-threshold results side by side or as a peak radius per element | Must     | No (`study-area-buffer`, planned) |

**Changes recommended to existing records.** W11 should replace "find high-betweenness nodes" with exposure scoring, TTS screening and event response (R1-R8); `supply-chain-analyst` should use centrality only on hub networks. Add a separate workflow for forced-labor trace to origin (section 5.16, requiring R23 and R38-R43): its unit is the shipment, its edges must carry documents, and its question is closeness to a list, none of which W11's risk scoring covers. Other new workflows: 5.2, 5.4-5.15, above all 5.7. New personas: 3.3, 3.4, 3.6, 3.7, 3.8, 3.9 (`economic-network-analyst`, replacing the deferred `trade-network-economist`), 3.11 (`space-syntax-analyst`), 3.12 (`trade-compliance-analyst`) and 3.13 (`economic-complexity-analyst`, with a product space workflow from section 5.17 requiring R45-R48), and 3.14 (`eudr-due-diligence-officer`, with a deforestation due diligence workflow from section 5.18 requiring R44 and R49). W228 (venture co-investment) should follow section 5.14: trailing five-year windows, a directed lead-to-member projection beside the undirected one, five centralities per window and exits as the outcome (R32, R50). The forced-labor workflow should drop its EUDR source, since EUDR now has its own workflow. Asset correlation trees (section 5.19) are a variant of `economic-network-analyst`, not a new persona, with their own workflow W3006 and a new capability `correlation-filtered-graphs` (R51-R53).

## 11. Sources

Every claim above carries its source URL inline, next to the claim it supports. "Via search summary" marks a figure read from a search engine's summary of the page rather than from the page itself. Vendor pages (Sayari, Kharon, Altana, Coupa) describe their own products and are marked as vendor claims.
