# Geographic Flow and Mobility Networks: Migration, Commuting, Mobility and Trade Flows on a Map

## 1. Summary

This population works with origin-destination (OD) flow data: a table of places with coordinates (counties, census
tracts, districts, countries, H3 cells, bike stations) and a table of directed counts between them (people who moved,
workers who commute, trips made, goods shipped), often repeated per year, per day or per hour. Its members are
demographers and population geographers, urban mobility and transport analysts, travel demand modelers, labor-market
economists who draw functional regions, infectious-disease modelers who feed mobility matrices into epidemic
models, network scientists who treat migration and commuting tables as graphs, and air and maritime transport analysts
whose edges are services (non-stop flights, ship port calls) rather than demand. They use graph software because an OD
table IS a directed, weighted, geographically embedded network: nodes are places, edges are flows, the diagonal (trips
that start and end in the same zone) is data, and the questions are network questions -- net versus gross exchange,
asymmetry, concentration, which places form a self-contained region, which flows are larger than distance and size
predict, which airports or ports are hubs, and what breaks when one is removed. Most practitioners split the work
between a data tool (R, Python, DuckDB, Excel) and a flow-mapping tool (flowmap.blue, kepler.gl, QGIS, ArcGIS, mapdeck,
Visum). A research subpopulation loads the same tables into igraph, NetworkX or Gephi for centrality and
community detection (5.8, 5.10), and then loses geography: its network plots use force or Kamada-Kawai layouts and its
maps are made in a separate tool. The one thing every tool and paper fights is visual clutter from many crossing long
edges.

No earlier Graphty research document covers this data type: supply-chain-and-physical-infrastructure-networks.md's
`transport-network-planner` works on the street and transit network, not the OD matrix that loads it, and mentions
only in passing that betweenness suits airports and ports.

## 2. Population

**Demographers and population geographers.** State and national statistical offices, state demographic centers (for
example North Carolina's, https://www.osbm.nc.gov/blog/2026/01/28/north-carolina-top-destination-domestic-migrants),
university population centers, and international bodies. Abel and Sander estimate bilateral flows for 196 countries
(https://pubmed.ncbi.nlm.nih.gov/24675962/); internal-migration comparativists compute indicators such as the
migration effectiveness index with the IMAGE Studio software
(https://link.springer.com/article/10.1007/s12061-018-9274-6; https://eprints.whiterose.ac.uk/99298). Coding ability is
moderate to high (R, Stata, Python). Agency demographers mostly think in matrices, in-flows, out-flows and net flows;
some academic counterparts add centrality and communities (next paragraph).
**Network scientists and planning or geography researchers who treat flows as networks.** They load county migration
or commuting tables into igraph, NetworkX or Gephi for strength, betweenness, PageRank, backbones and communities: a
planning professor's public igraph tutorial (Kaza, UNC; https://nkaza.github.io/post/network-analysis-of-internal-migration),
a University of Florida study of IRS migration before and during COVID-19 (Xu, Hu and Wang, The Professional
Geographer 2025; https://geog.ufl.edu/?p=21167), and an Urban Science paper detecting megaregions from county
commuting in Gephi and NetworkX (https://www2.mdpi.com/2413-8851/6/1/12); a review surveys the literature
(https://arxiv.org/pdf/2002.10992). Coding and graph literacy are high; the map of the result is usually a separate
step in another tool (5.8).

**Air and maritime transport network analysts.** Airline network planners, airport and aviation researchers, and
network scientists studying airline and shipping networks. Their edges are services, not demand: a non-stop segment
flown by a carrier, or a ship's journey between consecutive port calls. Kaluza et al. built a directed network of 951
ports from 16,363 cargo ships' AIS-derived itineraries and found 59 percent of linked port pairs connected in one
direction only (https://pmc.ncbi.nlm.nih.gov/articles/PMC2880080); US airport studies compute centrality in NetworkX and
Gephi and remove top airports to test robustness (https://arxiv.org/html/2505.11559v1; over 16 years,
https://arxiv.org/pdf/2005.01101). Their questions -- hubs, hub-and-spoke versus point-to-point, what disconnects when
an airport, port or strait is removed, how carriers or cargo types differ -- are the most purely graph-theoretic here
(5.10).

**Urban mobility analysts and mobility data scientists.** In city transport departments, metropolitan planning
organizations (MPOs), consultancies, and data vendors (StreetLight, Replica, Teralytics, Motionworks, HERE,
SafeGraph/Advan). The American Planning Association's model description for a "Civic Data Analyst: Transportation"
asks for Python and/or R, SQL, QGIS, PostGIS, geopandas, the ESRI suite, "data visualizations through code (e.g. D3,
ggplot, matplotlib, plotly, kepler.gl, etc.)" and transport formats such as GTFS and GBFS
(https://planning.org/jobdescriptions/civicdataanalyst). Coding ability is high; GIS literacy is high; graph literacy
is low to moderate.

**Travel demand modelers.** At state DOTs, MPOs and consultancies, running four-step or activity-based models in
TransCAD, PTV Visum, Emme or Cube. Texas DOT's manual describes trip generation, distribution, mode split and
assignment, and tells planners to "use big data resources (StreetLight, INRIX, Replica, etc.) to calibrate and
validate models" (https://www.txdot.gov/manuals/des/tsp/chapter-4-traffic-analysis-methodology--tools--and/4-3-analysis-tool-description-and-selection-method/4-3-2-travel-demand-models--tdm-.html).
StreetLight calls the OD matrix "one of the most important data inputs for any model"
(https://www.streetlightdata.com/creating-travel-demand-models). Their matrices are square zones-by-zones arrays,
increasingly stored as OpenMatrix (OMX) HDF5 files that Cube, TransCAD, Emme and Visum can export
(https://www.github.com/osPlanning/omx/wiki).

**Labor-market and regional economists.** They turn commuting matrices into functional regions: US commuting zones
(USDA ERS; Fowler's 2020 delineation), UK travel-to-work areas, EU labor market areas, and Facebook's commuting zones,
by community detection or hierarchical clustering on the flow network (5.5), and publish region boundaries that other
researchers use as units of analysis.

**Infectious-disease and humanitarian mobility modelers.** Epidemiologists who build metapopulation models from airline
and commuting matrices (GLEaM uses Official Aviation Guide flows and commuting statistics from 30 countries;
https://arxiv.org/pdf/0907.3304), who used Baidu mobility out of Wuhan to show early spread tracked travel volume
(Kraemer et al., Science 2020; https://pmc.ncbi.nlm.nih.gov/articles/PMC7146642), and who mapped malaria sources and
sinks from 15 million Kenyan phone users (Wesolowski et al., Science 2012;
https://www.hsph.harvard.edu/news/press-releases/cell-phone-data-malaria/). Humanitarian analysts at IOM's
Displacement Tracking Matrix and Flowminder track displacement flows (section 6).

**Trade-flow mappers.** Covered as the trade variant of `economic-network-analyst` in
supply-chain-and-physical-infrastructure-networks.md 3.9; this document adds only trade drawn as map flows.

**Size.** No headcount source found for any of these groups. Indirect evidence of demand: the QGIS FlowMapper plugin's
version table shows roughly 76,000 downloads (inference from an unlabeled column; https://plugins.qgis.org/plugins/FlowMapper);
kepler.gl ships a dedicated flow layer (https://docs.kepler.gl/llms-full.txt); flowmap.blue's author reports people
"using it in publishing stuff" (https://ftp.fau.de/fosdem/2026/k3601/DC9M73-sqlrooms-flowmap.vtt).

**How often they touch graph tools.** Agency demographers and modelers rarely, by name; they touch flow maps weekly to
monthly or per data release. Researchers and transport network analysts use igraph, NetworkX or Gephi per study. Graph
algorithms appear in regionalization (5.5), spatial-interaction models (5.6), migration network studies (5.8) and air
and shipping hub and robustness analysis (5.10).

## 3. Personas

### 3.1 `migration-flow-demographer` (new) -- Dana, Senior Demographer, state demographic center

- **Background.** MA in demography or geography; writes in R (tidycensus, sf, tmap) and Excel; produces the state's
  annual migration brief and answers legislators' "where are people moving from" questions.
- **Tools today.** tidycensus `get_flows()` for ACS county flows
  (https://walker-data.com/tidycensus/articles/other-datasets.html); the IRS SOI county-to-county inflow and outflow
  CSVs (https://www.irs.gov/statistics/soi-tax-stats-migration-data); data.census.gov tables. The Census Flows Mapper
  (https://www.census.gov/newsroom/archives/2014-pr/cb14-165.html), once the no-code quick look, was decommissioned on
  October 8, 2024 (https://www.census.gov/mobile), so a quick map now needs R, a GIS or a third-party web tool; QGIS or
  ArcGIS (XY To Line, Generate Origin-Destination Links) for print maps;
  mapdeck or flowmap.blue for web maps; chord diagrams with migest `mig_chord()` for regional summaries
  (https://search.r-project.org/CRAN/refmans/migest/html/mig_chord.html).
- **Data.** About 3,200 counties; ACS 5-year county pairs with estimate and 90 percent margin of error; IRS returns,
  exemptions and adjusted gross income per county pair per year.
- **Goals.** Net migration by county and its main origins and destinations; which flows changed since the last
  vintage; gross exchange (in plus out) versus net; age or income of movers where available.
- **Frustrations.** The ACS county-to-county series ended with 2016-2020
  (https://www.census.gov/topics/population/migration/guidance/county-to-county-migration-flows.html); IRS files mix
  total and non-migrant rows into the flows (5.1); small flows have wide margins of error, yet a flow map draws every
  estimate with equal confidence; 50 states already form "thousands of links" (https://arxiv.org/pdf/2110.03662).

### 3.2 `urban-mobility-analyst` (new) -- Marc, Mobility Data Scientist, city transport department or data vendor

- **Background.** MSc in transport, GIS or data science; Python (pandas, geopandas, DuckDB) or R; SQL.
- **Tools today.** kepler.gl or Foursquare Studio (arc and flow layers, time playback), flowmap.blue and its R
  wrapper, deck.gl with flowmap.gl, QGIS; scikit-mobility or MovingPandas to turn raw trajectories into stays and trips
  (5.9); scikit-mobility for gravity and radiation models.
- **Data.** Raw GPS, app or CDR trajectories (one row per device ping) when the team derives its own OD; otherwise
  hourly or daily OD counts between districts, H3 cells or stations (Spain's open data: 135.9 million records a
  week); bike-share trips; LODES commute pairs.
- **Goals.** Morning versus evening peak; corridors where demand outstrips service; before and after a policy; a
  clean interactive map for non-technical staff.
- **Frustrations.** Arc layers become "many intersecting lines, making it hard to discern patterns" (Foursquare,
  https://docs.foursquare.com/studio/docs/use-cases-origin-destination-analysis); long flows over-plot while short
  intra-urban flows are "basically" invisible (Boyandin, FOSDEM 2026); kepler.gl offers "a limited number of symbology
  and scaling choices" (Koylu et al.); hourly data is 24 times larger than daily; vendor data cannot be uploaded to a
  third-party sheet, hence flowmap.blue's in-browser mode (https://www.flowmap.blue/how-to-make-a-flow-map).

### 3.3 `transport-network-planner` (existing research persona, deepened) -- Lena, OD-matrix variant: travel demand modeler at an MPO

The persona in supply-chain-and-physical-infrastructure-networks.md 3.10 works on the street and transit network;
this variant works on the demand that loads it:

- **Tools today.** TransCAD, Visum, Emme or Cube for trip distribution (gravity models with friction factors;
  https://caliper.com/tctraveldemand.htm) and desire lines; OMX files read in Python (`openmatrix`); the Propensity to
  Cycle Tool and stplanr/od in R for active travel (https://ar5iv.arxiv.org/html/1509.04425).
- **Data.** Square zones-by-zones matrices (hundreds to a few thousand traffic analysis zones), one matrix per purpose,
  mode and period; skims (travel time, cost); survey and big-data OD for calibration.
- **Goals.** Which OD pairs carry the most demand; where modeled and observed matrices disagree; where a corridor or
  cycle route would serve the most trips.
- **Frustrations.** Visum desire lines are straight lines only
  (https://cgi.ptvgroup.com/vision-help/VISUM_2025_ENG/Content/1_Tabellarische_grafische_Darstellung/1_12_Matrixspinnen.htm);
  all-zone desire maps "are hard to read", so the TRMG2 model adds its own tool with aggregation to districts
  (https://www.github.com/Triangle-Modeling-and-Analytics/TRMG2/wiki/6-Tools); plain betweenness "assumes in general
  a flat OD matrix" (https://arxiv.org/pdf/2409.08016).

### 3.4 `mobility-epidemiologist` (new) -- Dr. Amara, infectious-disease modeler, school of public health

- **Background.** PhD epidemiology or physics; R or Python; telecom, Meta, airline and census mobility data under
  data-use agreements.
- **Tools today.** Custom metapopulation code; GLEaM-style models; kepler.gl or matplotlib maps for figures.
- **Data.** Daily OD matrices between administrative units (Kang et al.'s US SafeGraph-derived flows at 74,001 tracts,
  3,219 counties and states; https://ar5iv.labs.arxiv.org/html/2008.12238), airline seat matrices, CDR-derived
  matrices produced behind the operator's firewall (Flowminder FlowKit;
  https://www.flowminder.org/media/cpsoguko/flowkit-factfile.pdf).
- **Goals.** Which places are sources and which are sinks of infection; how a travel restriction changed connectivity;
  where to send tests or vaccines first.
- **Frustrations.** Access and privacy: Meta's successor dataset adds differential-privacy noise
  (https://data.humdata.org/dataset/32167ba5-ef67-4254-8eaf-04cdb8b90c1d);
  IOM shares sensitive flow-monitoring data only on request (https://centre.humdata.org/iom-and-ocha-partners-in-displacement-data/);
  sample flows must be scaled to population (Kang et al. multiply each flow by origin population over devices).

### 3.5 `air-maritime-network-analyst` (new) -- Tomas, aviation and shipping network researcher, transport research institute or airline network planning

- **Background.** MSc or PhD in transport economics, operations research or network science; Python (pandas,
  NetworkX) or R (igraph); SQL; Gephi for figures.
- **Tools today.** BTS TranStats (T-100, DB1B); OpenFlights; licensed OAG schedules (used by GLEaM,
  https://arxiv.org/pdf/0907.3304); vendor AIS port calls; NetworkX, igraph or Neo4j Graph Data Science (whose
  centrality tutorial uses an airline network,
  https://neo4j.com/docs/graph-data-science-client/current/tutorials/centrality-algorithms/); Gephi or matplotlib maps.
- **Data.** Hundreds to a few thousand airports or ports; directed weighted edges per month, carrier or cargo type.
- **Goals.** Which airports or ports are hubs and which are bridges (high betweenness, low degree); how hub-and-spoke a
  carrier's network is; what disconnects when a hub, port or canal is removed; how the network changed after a shock
  (9/11, COVID-19, the Suez blockage).
- **Frustrations.** Graph tools ignore geography and map tools ignore graph structure: Anchorage ranks at or near the
  top for betweenness in both a US airport study and a BTS-based tutorial
  (https://metagraph.readthedocs.io/en/stable/getting_started/use_case_1_airline_connectedness.html), a result that
  only makes sense on a map; the edge weight (hop count, passengers, inverse passengers) must be chosen per measure;
  free global route data stopped in June 2014 (section 6).

## 4. Use cases (ranked)

| #   | Question                                                                                                    | Who                                           | Frequency                               | Stakes                                                      |
| --- | ----------------------------------------------------------------------------------------------------------- | --------------------------------------------- | --------------------------------------- | ----------------------------------------------------------- |
| 1   | Where do people or trips come from and go to, for one place or the whole map, shown readably?               | all                                           | daily to per release                    | Public briefs and plans; a misleading map misinforms policy |
| 2   | What is each place's net gain or loss and gross exchange? Which pairs are asymmetric?                       | demographer, trade                            | per release                             | Population estimates, budgets, headlines                    |
| 3   | How do flows change over time (hour of day, weekday, year, before and after an event)?                      | mobility analyst, epidemiologist, demographer | weekly; event-driven                    | Service planning; policy evaluation; outbreak response      |
| 4   | Which places form self-contained functional regions (labor markets, commuting zones, travel-to-work areas)? | labor economist, statistical office           | per census cycle; quarterly at Facebook | Official geographies used for statistics and funding        |
| 5   | Which flows exceed or fall short of what size and distance predict?                                         | geographer, modeler                           | per study                               | Structure beyond "big cities attract"; model validation     |
| 6   | Which OD pairs justify a corridor, route or service (top-N demand, potential cycling demand)?               | transport planner                             | per project                             | Capital investment                                          |
| 7   | Where could infection be imported from, and how did restrictions change connectivity?                       | epidemiologist                                | outbreak-driven                         | Containment decisions                                       |
| 8   | How concentrated are a place's flows (few dominant partners versus many small ones)?                        | demographer, trade                            | per study                               | Exposure and dependency assessments                         |
| 9   | Which airports or ports are hubs or bridges, and what disconnects if one (or a canal or strait) is removed? | air and maritime analyst                      | per study; after a shock                | Route planning, resilience policy, chokepoint risk          |
| 10  | Which places are central in the migration or commuting network, and where do its communities fall on a map? | network-science researcher                    | per study                               | Papers and regional policy                                  |

## 5. Step-by-step workflows

### 5.1 County migration flow map from a federal release (demographer)

Sources: tidycensus article (3.1); ACS flow documentation 2016-2020 (https://www.census.gov/content/dam/Census/topics/population/migration/guidance-for-data-users/acs-migration-tutorial/2016-2020-Migration-Flows-Documentation.pdf);
IRS users guide (https://www.irs.gov/pub/irs-soi/2223inpublicmigdoc.pdf); Census API page
(https://www.census.gov/data/developers/data-sets/acs-migration-flows.html).

1. **Choose the source (minutes, a decision).** ACS 5-year flows give estimates with margins of error and, for some
   vintages, characteristics; county-to-county ended with 2016-2020 and continues only as state-to-county from
   2018-2022. IRS SOI gives annual flows of returns, exemptions and AGI but only for filers. A demographer often pulls
   both and reconciles.
2. **Pull the data (minutes).** In R: `get_flows(geography = "county", state = "NY", county = "Westchester", year =
2018, geometry = TRUE)`. The API now requires a key. Output is long: three rows per pair (`MOVEDIN`, `MOVEDOUT`,
   `MOVEDNET`) with `GEOID1`, `GEOID2`, names, `estimate`, `moe` and centroids `centroid1`, `centroid2`.
   The raw files are a fixed-width national text file plus one Excel sheet per state, each row repeating per-county
   totals; a separate file holds flow, counterflow, net and gross per pair.
3. **Clean (an hour or more, error-prone).** Drop or separate rows that are not county-to-county flows: in IRS files,
   destination codes 96, 97 and 98 are totals (US and foreign, US, foreign) and a row whose origin equals the
   destination is "Non-migrants" (for Hawaii, 564,311 returns), a self-flow that dwarfs every real flow. IRS flows under
   20 returns are folded into "Other Flows", and county totals may not add to state totals. In ACS, moves from abroad
   have `GEOID2 = NA`; suppressed flows are absent. Pad FIPS codes to five characters.
4. **Compute measures (minutes).** Net = in minus out per pair and per county; gross = in plus out; often a net rate per
   1,000 residents, mapped as a choropleth (https://fred.stlouisfed.org/blog/2023/05/mapping-net-migration-by-county).
5. **Filter for drawing (a decision).** Keep the top N origins for a focal place (`slice_max()`), or flows above a
   threshold (Tobler's approach, cited in https://arxiv.org/pdf/2110.03662), or only flows touching a selected county
   (the model of the Census Flows Mapper, retired October 8, 2024: select a county, view inbound, outbound or net).
6. **Draw (minutes to hours).** Web: `mapdeck() |> add_arc(origin = "centroid1", destination = "centroid2",
stroke_width = "estimate")`. Print: 5.4. Regional summaries: `mig_chord()`.
7. **Read and hand off.** The brief names the top origins and destinations and the net balance; the figure goes in a
   PDF report or a web story. MOEs are mentioned in a footnote; no tool listed here encodes them on the map.

### 5.2 Commuting flows from LEHD LODES (planner, analyst)

Sources: LODES technical document 8.4 (https://lehd.ces.census.gov/data/lodes/LODES8/LODESTechDoc8.4.pdf); LEHD code
samples (https://lehd.ces.census.gov/data/lehd-code-samples/sections/lodes/basic_examples.html); Stanford Future Bay
course (https://stanfordfuturebay.github.io/advanced/commute-data.html).

1. **Download one state-year (minutes to an hour).** Files are named like `ca_od_main_JT00_2022.csv.gz` (main: live
   and work in the state; aux: live elsewhere). California's 2022 main file is 92 MB compressed
   (https://lehd.ces.census.gov/data/lodes/LODES8/ca/od/). Years run 2002-2023; job types JT00 to JT05.
2. **Read with types (a common trap).** `w_geocode` and `h_geocode` are 15-character census block codes and must be read
   as text to keep leading zeros. `S000` is total jobs, followed by age, earnings and industry segments. The first
   column is the workplace (destination), the second the residence (origin).
3. **Aggregate (minutes).** Block level is "sensitive to imputation errors", so aggregate to tract (`substr(geocode,
1, 11)`) or county via the LEHD crosswalk; `lehdr::grab_lodes(..., agg_geo = "tract")` does it in one call, a
   whole state at a time.
4. **Filter (a decision).** Stanford keeps pairs with `S000 >= 5` and suggests a maximum distance to drop far-away
   headquarters artifacts; same-tract pairs are kept or dropped by choice.
5. **Draw.** A choropleth of destination tracts for one city's residents, or desire lines (5.3, 5.4).

### 5.3 Phone-derived hourly mobility to an animated, clustered flow map (mobility analyst)

Sources: spanishoddata README and vignettes (https://ftp.fau.de/cran/web/packages/spanishoddata/readme/README.html;
https://ropenspain.github.io/spanishoddata/articles/flowmaps-interactive.html); Tartu 2026 course workbook
(https://tdscience.github.io/tartu26/workbook.html); flowmapblue R vignette
(https://cran.r-project.org/web/packages/flowmapblue/vignettes/flowmapblue.html); Kotov et al. 2026
(https://eprints.whiterose.ac.uk/id/eprint/236055).

This workflow starts from a published, already aggregated OD table; a team holding raw pings first runs 5.9.

1. **Get zones and dates (minutes).** `spod_get_zones("distr", ver = 2)`, `spod_get_valid_dates(ver = 2)`. Version 1
   covers 2020-02-14 to 2021-05-09; version 2 covers 2022 onward and adds sociodemographics.
2. **Query lazily (minutes; data stays on disk).** `spod_get(type = "origin-destination", zones = "districts", dates =
...)` returns a lazy DuckDB table of 19 columns (`date`, `hour`, `id_origin`, `id_destination`, activity, income,
   age, sex, `n_trips`, ...).
   One week is 135,866,524 records covering 925,874,012 trips; the full three years exceed 200 GB.
3. **Aggregate (minutes).** Daily: `group_by(id_origin, id_destination) |> summarise(count = sum(n_trips))`; hourly
   adds a `time` column and "24 times more rows".
4. **Build the location table (minutes).** Zone centroids in WGS84 as `id`, `lon`, `lat`; flows naming an id missing
   from it are lost.
5. **Clip the study area (a decision).** A 10 km buffer around a city; keep flows with both ends inside. Intra-zonal
   pairs are kept.
6. **Map (seconds).** `flowmapblue(locations, flows, mapboxAccessToken = ..., clustering = TRUE)`; the vignette warns
   against turning clustering off for "hundreds and thousands of locations". A `time` column adds a time filter (mapgl:
   `add_time_control(time_interval = "hour")`).
7. **Read.** Zoom: clusters split and the largest flows in the viewport "pop up" (Boyandin). Scrub time to compare
   peaks, then analyze outside the map (Tartu workbook).
8. **Hand off.** An HTML widget or a shared flowmap.blue link; a static PNG for reports.

The same task in kepler.gl or Foursquare Studio: load origin and destination coordinates (or two H3 columns) and a
count; start with an Arc layer; when cluttered, switch to the Flow layer with clustering (on for random pick-up
points, off for fixed stations), Max Top Flows, Fade, Adaptive Scaling, Location Totals and Animation; add a time
filter for playback
(https://docs.foursquare.com/studio/docs/use-cases-origin-destination-analysis;
https://docs.foursquare.com/analytics-products/docs/layer-flow; https://docs.kepler.gl/docs/user-guides/h-playback).

### 5.4 Print-quality flow map in QGIS or ArcGIS (geographer, cartographer)

Sources: CartoGIS course (https://cartogis.readthedocs.io/en/latest/notebooks/week3/lines-and-edgebundling-QGIS.html);
Anita Graser (https://anitagraser.com/2019/05/04/flow-maps-in-qgis-no-plugins-needed/); UBC radial flow tutorial
(https://ubc-library-rc.github.io/gis-dhsi/content/day3/6-radial-flow.html); Esri XY To Line notes
(https://www.esri.com/arcgis-blog/products/arcgis-desktop/mapping/creating-radial-flow-maps-with-arcgis).

1. **Prepare two tables outside QGIS** (Graser: an edges file and a geocoded nodes file, aggregated in Python).
2. **Make lines (minutes).** Either Vector > Shape Tools > XY to line on one table holding both endpoints (ArcGIS: XY
   To Line with line type GEODESIC, GREAT_CIRCLE, RHUMB_LINE or NORMAL_SECTION), or a virtual layer:
   `SELECT ..., make_line(a.geometry, b.geometry) FROM edges JOIN nodes a ... JOIN nodes b ... WHERE a.ID != b.ID`,
   whose `WHERE` clause throws away self-flows to avoid zero-length lines.
   ArcGIS Pro's Generate Origin-Destination Links tool (Analysis toolbox, every license level) builds the lines from
   two point or polygon layers in one step: Origin and Destination Group Fields pair features sharing a value; Line
   Type is PLANAR or GEODESIC; Number of Nearest Destinations and Search Distance cap links per origin; Aggregate
   Overlapping Links merges duplicates and writes LINK_COUNT; Summary Fields add SUM, MEAN, MEDIAN and other statistics
   per link. Outputs include origin and destination ids and coordinates, LINK_DIST and LINK_COUNT, plus charts of link
   count and length per origin or group
   (https://doc.esri.com/en/arcgis-pro/latest/tool-reference/analysis/generate-origin-destination-links.html).
   Aggregation, nearest-N and distance limits are its clutter controls.
3. **Aggregate if needed.** Processing Toolbox > Aggregate, group by `OD_ID`, count into `mobilities`.
4. **Symbolize (an hour of tuning).** Graduated color, natural breaks; width as a data-defined `scale_linear(...)`
   override; curve each line with a geometry generator that inserts an offset midpoint (`make_line(start_point,
centroid(offset_curve(...)), end_point)`), trim the ends, and color by direction.
5. **Optional bundling.** The edge-bundling plugin's force-directed bundling, comparing step sizes from 1,000 to 10,000
   map units (larger means more distortion), styled at about 20 percent opacity.
6. **Alternative.** The FlowMapper plugin takes a square OD matrix and writes two-way, gross and net flow lines plus a
   node layer with in, out and signed net totals, colored gain green, loss red (https://plugins.qgis.org/plugins/FlowMapper).
7. **Lay out and export** a print map. Draw order is handled in the layer list by hand.

### 5.5 Functional regions from a commuting matrix (labor economist, statistical office)

Sources: ONS travel-to-work areas
(https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/employmentandemployeetypes/articles/traveltoworkareaanalysisingreatbritain/2016);
USDA ERS commuting zones (https://www.ers.usda.gov/data-products/commuting-zones-and-labor-market-areas/documentation);
Fowler 2024 (https://doaj.org/article/dc8fcf1861e845fdada7bea5cf272d69); Facebook commuting zones
(https://facebookincubator.github.io/CommutingZones/docs/Methodology/CZMethodology); He et al.
(https://arxiv.org/abs/1903.06029).

1. **Assemble the matrix.** UK: census residence-to-workplace matrix at LSOAs and equivalents. US: county-to-county
   commuting flows. Facebook: aggregated home and work locations of opted-in users.
2. **Choose the method (the core decision).**
    - Threshold algorithm (UK TTWAs): grow areas until at least 75 percent of resident workers work inside and 75
      percent of workers live inside (66.7 percent for areas over 25,000 workers; minimum 3,500). 2011: 228 TTWAs.
    - Hierarchical clustering on a proportional flows matrix (USDA, Fowler): 741 commuting zones in 1990; the
      preliminary 2020 product puts 3,222 counties into 592 zones, some with "relatively weak commuting relationships".
    - Modularity (Louvain): symmetrize flows into an undirected weighted network (New Zealand labor market areas,
      https://docs.iza.org/dp13642.pdf); Facebook drops edges above the 95th distance percentile, runs Louvain twice for
      a hierarchy and merges Voronoi cells per zone, every three months.
    - Self-loops: most commuting stays inside its own county; He et al. build a configuration-model method for networks
      "with a high proportion of self-looping weights" and find overlapping regions, including counties that form a
      region alone.
3. **Validate.** Compare to official regions (Ratti et al. found their 3,042-pixel phone-call partition, modularity
   0.60, "corresponds well" to Government Office Regions; https://pmc.ncbi.nlm.nih.gov/articles/PMC2999538);
   Thiemann et al. found most mobility borders are not state borders (https://pmc.ncbi.nlm.nih.gov/articles/PMC2987795).
4. **Clean geometry and publish.** A "cleaning" step makes each TTWA contiguous with no fragments; output is a
   boundary file plus a lookup from zone to region; ONS warns small TTWAs carry more sampling error.

### 5.6 Observed versus expected: gravity residuals and normalized flows (geographer, modeler)

Sources: scikit-mobility paper (https://arxiv.org/pdf/1907.07062); FlowMapper.org appendix
(https://arxiv.org/pdf/2110.03662); Beecham's vis4sds chapter (https://vis4sds.github.io/vis4sds/05-network.html);
Wood et al. OD maps (https://openaccess.city.ac.uk/id/eprint/537/).

1. **Load flows with a tessellation.** `FlowDataFrame.from_file(..., tessellation=..., tile_id="tile_id")`; every
   origin and destination must exist as a `tile_ID` or the library raises an exception.
2. **Fit a model.** `Gravity(gravity_type="singly constrained")`, `fit(fdf, relevance_column="population")` (distance
   exponent about -1.99 in the paper's example), `generate()` for expected flows; radiation is the parameter-free
   alternative.
3. **Compute residuals.** FlowMapper.org offers an "adjusted flow volume" null model (only flows needed) and a
   doubly-constrained gravity model, then subtracts expected from observed (positive means above expectation).
   Beecham uses (observed - expected) / expected^0.7 for London borough commuting by occupation.
4. **Draw residuals, not volumes.** Flow lines colored by sign, or an OD map (a grid of small maps, one per origin),
   which shows self-flows and avoids clutter; Beecham lists flowline problems: self-flows hidden, "hairball" overlap,
   long flows "visually dominant", false precision of centroids.
5. **Plot with a floor.** scikit-mobility's `plot_flows(min_flow=...)` draws only flows above a minimum.

### 5.7 Desire lines and corridor demand (transport planner)

Sources: stplanr OD vignette (https://docs.ropensci.org/stplanr/articles/stplanr-od.html); PCT paper
(https://ar5iv.arxiv.org/html/1509.04425); jittering (https://robinlovelace.net/publications/lovelace-jittering-2022-b/).

1. **Load long-form OD** (England and Wales MSOA commuting table WU03EW: 2,402,201 rows, 7,201 zone centroids);
   `od_to_odmatrix()` and `odmatrix_to_od()` convert, but long form is "the most useful" for large sparse data.
2. **Split intra-zonal from inter-zonal** (`geo_code1 == geo_code2`): "sometimes ignored", but they indicate local
   activity, and their desire lines have length zero.
3. **Merge directions** with `od_oneway()` (sums A to B and B to A), because one-way lines hide each other.
4. **Make lines** with `od2line(flow, zones)`; check for ids that match no zone first.
5. **Filter.** London: 352,654 lines; keeping inter-zonal flows of 20 or more leaves 28,879 lines (8.19 percent of lines,
   55.7 percent of trips). About 20,000 lines plot quickly. The PCT keeps pairs under 20 km Euclidean with at least 10
   commuters and offers a "top n" slider.
6. **Jitter or route.** Jittering samples start and end points within zones and splits large flows; routed lines are
   summed into a route network (excluding within-zone trips).

### 5.8 Migration or commuting flows as a network in igraph, NetworkX or Gephi (network-science researcher)

Sources: the Kaza tutorial, UF study and Urban Science paper cited in section 2.

1. **Pull flows (minutes).** `tidycensus::get_flows(geography = "county", year = 2020)` for every county.
2. **Keep one measure.** Keep only `variable == "MOVEDNET"` (net flow per pair).
3. **Clean.** Drop rows with a missing `GEOID2` (moves from abroad), non-five-digit GEOIDs and self-loops: 1,440,390
   rows become 406,348.
4. **Deduplicate mirrored pairs.** Net flow from A to B is the negative of B to A, so build a sorted pair key with
   `pmin`/`pmax` and keep one row per pair: 203,174 rows.
5. **Threshold (a decision).** Keep pairs with |net| > 50.
6. **Orient signed edges.** Reverse every edge whose net value is negative and set weight to the absolute value, so
   every edge points the way people net-moved.
7. **Build the graph.** Directed, weighted igraph: 3,083 vertices, 40,279 edges, density 0.0042, 3 components.
8. **Centrality, with a weight choice per measure.** In- and out-strength; betweenness and closeness on inverse
   weights (`1/weight`, so large flows are short distances); eigenvector, PageRank and hub and authority scores on raw
   weights. Report a top-10 table.
9. **Communities.** Collapse to undirected with summed weights; compare Louvain (13 communities, modularity 0.506),
   Walktrap (377, 0.465) and label propagation (98, 0.442). The choice of algorithm changes the answer by an order of
   magnitude.
10. **Plot (the gap).** A California subgraph in `ggraph` with a Kamada-Kawai layout; the author notes "the graph does
    not respect the geographic locations", suggests fixing positions to lat/long by hand, and leaves mapping the
    communities with `tmap` as an exercise. The UF study adds backbone extraction before centrality; the Urban Science
    study runs Gephi nationally and NetworkX for Texas, then maps the megaregions separately.

### 5.9 From raw trajectories to an OD table (mobility data scientist)

Sources: scikit-mobility preprocessing reference
(https://scikit-mobility.github.io/scikit-mobility/reference/preprocessing.html); MovingPandas
(https://movingpandas.readthedocs.io/en/main/api/trajectorystopdetector.html); MeowMotion quick start
(https://urbanbigdatacentre.github.io/meowmotion/getting-started/quick-start); kepler.gl Trip layer
(https://docs.kepler.gl/docs/user-guides/c-types-of-layers/k-trip).

This runs before 5.3 when the team holds pings rather than an OD table; its parameters decide what the map can show.

1. **Load pings.** One row per device ping: user id, UTC timestamp, lat, lng, and often a horizontal accuracy in
   meters (MeowMotion's `impression_acc`).
2. **Filter noise.** Drop points with poor accuracy (MeowMotion's example uses 100 m) and implausible speeds
   (scikit-mobility `filter()` default `max_speed_kmh=500`).
3. **Detect stays (the key parameters).** scikit-mobility `stay_locations()` defaults to a 20-minute stop
   (`minutes_for_a_stop=20.0`) within a 0.2 km radius (`spatial_radius_km=0.2`); MovingPandas
   `TrajectoryStopDetector.get_stop_points(min_duration, max_diameter)` (tutorials: 60 to 120 seconds, 100 m). Optionally cluster stays into places and infer home.
4. **Generate trips.** One trip between consecutive stays (MeowMotion `processFlowGenration`).
5. **Zone (a decision).** Assign trip ends to a zone system: H3 cells, or administrative zones from a shapefile
   (MeowMotion: LSOAs, MSOAs, councils). MeowMotion reads the zone file with geopandas and requires polygons in
   EPSG:4326 with columns `geo_code`, `name` and `geometry`; each trip end takes the code of the polygon it falls in, a
   point-in-polygon join (geopandas `sjoin`, https://geopandas.org/en/stable/docs/reference/api/geopandas.sjoin.html).
   The `geo_code` then becomes the node id of the OD network, and the same polygon file is what a map later draws.
6. **Aggregate per window.** MeowMotion's `generateOD` writes one OD CSV per window -- AM peak 7-10, PM peak 4-7,
   all-day, and non-peak (all-day minus the peaks) -- with `origin_geo_code`, `destination_geo_code`, `trips`,
   `trips_weighted` (scaled to population using home locations) and `percentage`.
7. **Optionally animate the trips themselves.** kepler.gl's Trip layer plays raw trajectories as moving trails from
   GeoJSON LineStrings whose coordinates are [lon, lat, altitude, timestamp].

### 5.10 Air or maritime network: hubs and robustness (air and maritime analyst)

Sources: BTS T-100 (https://www.transtats.bts.gov/DatabaseInfo.asp?QO_VQ=EEE); the metagraph BTS tutorial (3.5);
the US airport study and Kaluza et al. (section 2).

1. **Choose segment or market data (the first decision).** T-100 Segment tables count non-stop legs with carrier,
   aircraft type, seats, departures and passengers; Market tables count enplaned passengers between points on one
   flight number. Segment data describes the service network; market and
   DB1B itinerary data (a 10 percent ticket sample; https://transtats.bts.gov/DatabaseInfo.asp?QO_VQ=EFI) describe
   demand. T-100 is monthly from 1990; international data lags domestic by three months. Free global alternative:
   OpenFlights routes (frozen at June 2014). Licensed: OAG schedules.
2. **Download and clean.** Select fields on TranStats (passengers, origin and destination airport ids, city market
   ids); drop rows with zero passengers (usually package flights, per the tutorial).
3. **Choose nodes.** Airports, or city markets that group airports serving one metro area (the tutorial uses city
   markets).
4. **Build directed weighted graphs.** One per month, year or carrier: sum passengers by origin and destination.
5. **Compute structure.** Degree and strength; betweenness on hop count or inverse passengers (`1/passengers`) --
   the tutorial's top ranks are Los Angeles, Seattle, Anchorage, New York; the arXiv study's top betweenness is
   Anchorage while Atlanta has the highest degree (153); Louvain (8 communities, modularity 0.28, geographically
   coherent) versus label propagation (50).
6. **Test robustness.** Remove airports in order of betweenness, degree, closeness or at random and track the
   largest connected component: removing top-betweenness airports collapsed it fastest, after five removals; random
   removal barely mattered. Some studies add cascade failure with a load threshold.
7. **Compare to null models** (Erdos-Renyi, Barabasi-Albert).
8. **Draw.** Export GML to Gephi, or plot airports at their coordinates with great-circle arcs on a world map or
   globe, sized by strength and colored by community.

Maritime variant (Kaluza et al.): start from port-call records derived from AIS (arrival and departure per ship per
port); link consecutive calls of each ship into journeys (490,517 journeys); build a directed graph of 951 ports and
36,351 port pairs with journey counts; split into container (3,100 ships, 378 ports), dry-bulk (5,498, 616) and tanker
(2,628, 505) layers; compute betweenness (Suez Canal and Shanghai rank high in every layer; Wilhelmshaven is tenth for
tankers but 241st for dry bulk) and directed modularity communities (container 12, Q 0.605; dry bulk 7, Q 0.592; oil
6, Q 0.716). The Panama and Suez canals appear as nodes with high betweenness, which is what makes chokepoint-removal
questions answerable.

## 6. Data

| Source                                           | Shape                                                                                | Size evidence                                                       | Identifier and quality problems                                                                                                                |
| ------------------------------------------------ | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| US ACS county-to-county migration (5-year)       | long pairs; API `MOVEDIN`, `MOVEDOUT`, `MOVEDNET`                                    | about 3,200 counties; 1,440,390 API rows nationally for 2020 (Kaza) | ended with 2016-2020; MOE at 90 percent; abroad has no destination code                                                                        |
| US IRS SOI migration                             | inflow and outflow CSVs per year                                                     | about 3,200 counties                                                | total rows 96/97/98; non-migrant self-flow row; under 20 returns aggregated; filers only                                                       |
| US LEHD LODES                                    | block pairs, workplace first; segments as columns                                    | CA 2022 main JT00 92 MB gz                                          | 15-character block codes lose leading zeros; imputation noise at block level; headquarters artifacts                                           |
| UK census commuting (WU03EW)                     | long pairs by mode                                                                   | 2,402,201 rows; 7,201 MSOAs                                         | intra-zonal rows                                                                                                                               |
| Spain MITMA mobility                             | hourly district OD with activity, age, income, sex                                   | one week 135.9 million records; three years over 200 GB             | zone versions change between v1 and v2                                                                                                         |
| SafeGraph-derived US flows (Kang et al.)         | daily and weekly `geoid_o`, `geoid_d`, `visitor_flows`, `pop_flows`                  | 74,001 tracts                                                       | sample scaled to population                                                                                                                    |
| Meta Data for Good movement                      | daily movement between areas                                                         | --                                                                  | opt-in users; differential privacy noise in successor product                                                                                  |
| Telecom CDR (Flowminder FlowKit)                 | OD matrices computed behind the operator firewall                                    | --                                                                  | only aggregates leave the operator                                                                                                             |
| IOM DTM flow monitoring                          | counts at transit points with origin, destination, mode                              | --                                                                  | sensitive; data on request                                                                                                                     |
| Eurostat regional commuting (`lfst_r_lfe2ecomm`) | commuter shares by region, not a full OD matrix                                      | 12 million inter-regional commuters (2020)                          | NUTS versions change (https://ec.europa.eu/eurostat/web/products-eurostat-news/-/ddn-20210610-1)                                               |
| Global bilateral migration (Abel and Sander)     | country by country by 5-year period                                                  | 196 countries, 1990-2010                                            | estimates from stock tables, not counts                                                                                                        |
| BACI trade (from UN Comtrade)                    | exporter, importer, product, year, value, quantity                                   | about 200 countries, 5,000 HS6 products; only positive flows        | requires a Comtrade license; mirror flows disagree and are reconciled (https://www.cepii.fr/DATA_DOWNLOAD/baci/doc/baci_webpage.html)          |
| Transport model matrices (OMX)                   | square zones-by-zones, many matrices per file                                        | hundreds to thousands of zones (no single source)                   | HDF5; needs a zone lookup                                                                                                                      |
| Raw GPS, app or CDR trajectories                 | one row per ping: user, time, lat, lon, accuracy                                     | no single source; vendor-specific                                   | not a flow table until stays, trips and zones are derived (5.9); personal data                                                                 |
| BTS T-100 segment and market                     | monthly carrier, origin, destination (segment adds aircraft type, seats, departures) | 1990 onward; US carriers and US-touching international flights      | segment (service) versus market (demand) counts differ; international lags 3 months (https://www.transtats.bts.gov/DatabaseInfo.asp?QO_VQ=EEE) |
| BTS DB1B origin and destination survey           | itinerary, market and coupon tables                                                  | 10 percent ticket sample, quarterly                                 | 1 percent in large domestic markets; scaled by 10 to estimate totals (https://transtats.bts.gov/DatabaseInfo.asp?QO_VQ=EFI)                    |
| OpenFlights routes and airports                  | airline, source, destination, stops, equipment                                       | 67,663 routes, 3,321 airports, 548 airlines                         | frozen at June 2014 (https://openflights.org/data)                                                                                             |
| OAG schedules                                    | licensed global flight schedules and seats                                           | used by GLEaM                                                       | licensed; price: no source found                                                                                                               |
| AIS-derived port calls                           | ship, port, arrival and departure time                                               | 16,363 ships, 951 ports, 490,517 journeys in 2007 (Kaluza et al.)   | AIS gaps at some ports and ships; commercial (Lloyd's Sea-web)                                                                                 |

Properties that matter for a graph tool:

- **Two tables joined by id.** A place table (id, name, lat, lon, often a polygon) and a flow table (origin, dest, count,
  optional time); flowmap.blue requires exactly `id`, `name`, `lat`, `lon` and `origin`, `dest`, `count`. Places often arrive as polygons and must be reduced to centroids, or as names that must be geocoded.
- **Long or wide.** Long (one row per pair) dominates; wide square matrices come from transport models, QGIS FlowMapper
  and Excel tables. Sparse: most pairs are zero.
- **Directed and weighted, with a diagonal.** flowmapblue's Swiss sample has 26 locations and 676 (26 times 26) flow
  rows, self-flows included, labeled "Internal & round trips". Commuting matrices are dominated by the diagonal (He et al.). Tools disagree:
  Graser's SQL drops them, stplanr separates them, flowmap.gl shows them as a location total.
- **Multi-attribute and multilayer edges.** Several counts per pair (modes, age bands, earnings, industries,
  purposes), each a separate matrix in matrix form; in transport networks, a separate edge per carrier, aircraft type
  or cargo type between the same two places (Kaluza's container, dry-bulk and tanker layers).
- **Signed net edges.** Net-flow tables (`MOVEDNET`) are antisymmetric: A to B is minus B to A, so analysts keep one
  row per pair and orient the edge by sign (5.8).
- **Uncertainty.** ACS gives a margin of error per flow.
- **Temporal.** Hourly (mobility), daily (phone), monthly (T-100), annual (IRS), 5-year rolling (ACS).
- **Hierarchical geography.** Block to tract to county to state; NUTS levels. Indicators vary with scale and zoning
  (the modifiable areal unit problem; Bernard et al.).
- **Sensitivity.** Microdata never leaves the provider; published flows are suppressed, noised or thresholded; vendor
  data cannot be uploaded to third-party services.

### 6.1 Zone geometry: file formats, joins and coordinate systems

An OD table names places by code; their shapes and positions come from a separate boundary file, and that file is the
second input to almost every map in this document.

**Formats the populations exchange.**

| Source or tool                                          | Formats                                                                                                                                                         |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| US Census cartographic boundary files (counties, tracts) | shapefile, file geodatabase and KML since 2019, GeoPackage since 2024; no GeoJSON (https://www.census.gov/geographies/mapping-files/time-series/geo/cartographic-boundary.html) |
| Eurostat GISCO NUTS regions                             | GeoPackage, shapefile, TopoJSON, GeoJSON, vector tiles (PBF) and SVG, each in EPSG:3035, EPSG:4326 or EPSG:3857 (https://ec.europa.eu/eurostat/web/gisco/geodata/statistical-units/territorial-units-statistics) |
| UK travel-to-work areas (ONS, via data.gov.uk)          | GeoPackage, shapefile, file geodatabase, KML, GeoJSON and CSV for the 2001 areas (https://www.data.gov.uk/dataset/travel-to-work-areas-december-2001-boundaries-uk-bgc); the 2011 areas at full, 20 m, 200 m and 500 m generalization plus ArcGIS feature services (https://www.data.gov.uk/dataset/travel-to-work-areas-december-2011-full-clipped-boundaries-in-united-kingdom4) |
| UN OCHA administrative boundaries (humanitarian and outbreak work) | shapefile and geodatabase plus tables, joined to population data by P-code (https://humanitarian.atlassian.net/wiki/spaces/imtoolbox/pages/2557378679) |
| Spain open mobility data (spanishoddata)                | zones returned as MULTIPOLYGON simple features in ETRS89 / UTM zone 30N, a projected system (https://ropenspain.github.io/spanishoddata/reference/spod_get_zones.html) |
| kepler.gl / Foursquare Studio                           | CSV, GeoJSON, GeoArrow and kepler.gl JSON; a CSV column of WKT or GeoJSON strings becomes a polygon layer, `<name>_lat`/`<name>_lng` pairs become points, a column named `h3_id` or `hexagon_id` becomes an H3 layer (https://docs.kepler.gl/docs/user-guides/b-kepler-gl-workflow/a-add-data-to-the-map) |
| SafeGraph-derived US flows (Kang et al.)               | CSV with `geoid_o`, `geoid_d` and both ends' `lat`/`lng` on every row (https://github.com/GeoDS/COVID19USFlows)                                              |
| US Census centers of population                         | text files of population-weighted center latitude and longitude for states, counties, tracts and block groups (https://www.census.gov/geographies/reference-files/time-series/geo/centers-population.html) |

Every official source above offers shapefile and three of the four offer GeoPackage; the web tools take GeoJSON (or
WKT inside a CSV); KML appears as a secondary official format. No source was found of these populations exchanging FlatGeobuf or GeoParquet, so those stay out of
the requirements below.

**How zones are joined to nodes.** The sources show three ways:

- **By zone id** -- the usual case. The flow table's origin and destination codes match an id column of the boundary
  file (FIPS GEOID, MSOA code, P-code, `geo_code`). stplanr's `od2line()` takes "a spatial (polygon or point) object"
  and matches the first two flow columns to the zones' first column by default
  (https://docs.ropensci.org/stplanr/reference/od2line.html). Leading-zero loss in codes (section 6) breaks this join.
- **By a representative point** -- once matched, a polygon must become a node position. The geometric centroid "can be
  outside the feature borders" (QGIS Centroids,
  https://docs.qgis.org/3.40/en/docs/user_manual/processing_algs/qgis/vectorgeometry.html), so analysts use a point on
  the surface or a population-weighted center (the Census publishes these per tract and county, above); flowmap.blue
  and kepler.gl accept only the point.
- **By point in polygon** -- when trip ends or events arrive as coordinates (5.9), each is assigned the zone it falls
  in. H3 is the gridded alternative: `polygonToCells` fills a boundary with cells and "containment is determined by
  centroids of the cells", so a partition of polygons yields a partition of cells
  (https://h3geo.org/docs/api/regions).

**Coordinate reference systems.** GeoJSON is fixed to WGS84 longitude and latitude, in that order, and the old `crs`
member is no longer used (RFC 7946 section 4, https://datatracker.ietf.org/doc/html/rfc7946). Official files are
often projected: NUTS ships in EPSG:3035 (an equal-area system for Europe) as well as WGS84 and Web Mercator, and
Spain's zones in UTM 30N; MeowMotion refuses anything but EPSG:4326. A tool must read the system declared by a
shapefile's `.prj` or a GeoPackage's metadata, transform to its display projection, and on export write GeoJSON in
WGS84 and other formats in the system the reader asks for.

**What goes back out.** Functional regions are published as "a boundary file plus a lookup from zone to region"
(5.5), and a flow map that is to be finished in QGIS or ArcGIS (5.4) has to arrive there as layers, not as an
image. Out of scope for this population: power and water network formats (EPANET
`.inp`, MATPOWER); no source in this document uses them, and their need belongs to the infrastructure research.

## 7. Analysis methods

### 7.1 Flow arithmetic

Net flow (in minus out), gross flow (in plus out), net-flow ratio (net over gross; FlowMapper.org), net migration rate
per population, two-way versus one-way merging (`od_oneway`), in-, out- and internal totals per place (flowmap.gl
location totals). Census defines inflows, outflows and net flows explicitly
(https://census.gov/newsroom/blogs/random-samplings/2014/09/the-maps-of-migration.html).

### 7.2 Migration system indicators

The IMAGE framework: migration intensity, migration effectiveness index (net over gross), aggregate net migration
rate, Index of Net Migration Impact (71 countries), and connectivity measures such as a migration-weighted Gini (https://www.geog.leeds.ac.uk/ectqg17/presentations/j.stillwell.pdf).
Indicators of intensity, impact and distance vary with scale; effectiveness varies more with zone configuration
(Bernard et al. 2018). Interpretation: in Northern and Western Europe "high intensities are absorbed in reciprocal
flows resulting in low migration effectiveness" (https://arxiv.org/pdf/1911.03795).

### 7.3 Community detection and regionalization

Louvain on symmetrized flows (New Zealand; US commuting zones,
https://ideas.repec.org/a/eee/ecolet/v219y2022ics0165176522003093.html; Facebook with distance pruning); spectral
modularity (Ratti); Infomap for hierarchical structure from taxi flows (https://arxiv.org/pdf/2211.11292);
hierarchical clustering (USDA); threshold self-containment (TTWA); Louvain, Walktrap and label propagation compared
(5.8). Known issues: self-loops (He et al.), resolution, contiguity, and gravity models cannot reproduce observed
borders (Thiemann et al.).

### 7.4 Spatial interaction models

Gravity models (unconstrained, singly or doubly constrained, power or exponential deterrence), the radiation model,
and FlowMapper.org's adjusted-flow-volume null model. Transport planners calibrate gravity models with friction factors
in TransCAD and estimate OD matrices from counts (ODME). Residuals are mapped (5.6).

### 7.5 Epidemic use of mobility networks

Metapopulation models over airline plus commuting networks (GLEaM); case counts against travel volume (Kraemer);
sources and sinks from prevalence times travel (Wesolowski); "effective distance" import risk along airline
shortest-path trees
(https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10843136/).

### 7.6 Filtering and backbones

Thresholds and top-N (all tools); disparity-filter backbones for dense trade and migration networks
(https://arxiv.org/pdf/0704.1225; the UF migration study in 5.8).

### 7.7 Validation habits

Compare against an independent source (Kang et al. against ACS commuting; IRS versus ACS); check county rows against
state totals; compare regions with official boundaries; footnote MOEs and suppression.

### 7.8 Flow clustering and generalization

Methods that reduce millions of OD pairs by respecting flow connections, not only place proximity. Guo's 2009 framework
(IEEE TVCG 15(6), 1041-1048) finds contiguous regions with denser flows inside than across (spatially constrained
graph partitioning), clusters the region-to-region flows on several variables, and maps them at hierarchical levels
(https://www.bohrium.com/paper-details/flow-mapping-and-multivariate-visualization-of-large-spatial-interaction-data/811824481646411776-2445).
Guo and Zhu's 2014 TVCG paper smooths OD flows
(https://vis.cs.ucdavis.edu/vis2014papers/TVCG/papers/2043_20tvcg12-guo-2346271.pdf), and Zhu, Guo, Koylu and Chen
(2019) generalize flows by their density distribution rather than by spatial units, demonstrated on 829,039 New York
taxi trips (https://iro.uiowa.edu/esploro/outputs/journalArticle/Density-based-multi-scale-flow-mapping-and-generalization/9983983663902771).
These answer the criticism that flowmap.blue clusters locations "while disregarding flow connections". Spatial
autocorrelation or hotspot tests defined on flows: no source verified for this document.

### 7.9 Centrality and robustness on transport networks

Strength and degree; betweenness on hop count versus inverse traffic weights (the weight decides what "shortest"
means); closeness; the gap between degree and betweenness that flags bridge airports such as Anchorage; targeted versus random node removal
with largest-component tracking; cascade failure with load thresholds; comparison with random and scale-free null
models (5.10); time series of snapshots (annual or monthly) versus temporal paths, the two modeling approaches a
review of air transport networks distinguishes (https://arxiv.org/abs/1605.04872).

## 8. Outputs and collaboration

- **Static figures**: QGIS or ArcGIS print layouts, R tmap/ggplot, chord diagrams (Abel and Sander's circular
  migration plot, https://download.gsb.bund.de/BIB/global_flow/).
- **Interactive web maps shared by link**: flowmap.blue sheets, kepler.gl exports, mapdeck or flowmapblue HTML widgets
  (the Census Flows Mapper served this role until its retirement on October 8, 2024). flowmap.blue is CC BY-NC 4.0, so
  commercial users must contact the authors (https://github.com/FlowmapBlue/flowmap.blue).
- **Project files**: FlowMapper.org saves a JSON project with joins and classification so others can reopen it.
- **Official geographies**: TTWAs, commuting zones, labor market areas published as boundary files plus lookups
  (shapefile, GeoPackage, GeoJSON and KML; 6.1).
- **Model inputs**: OMX matrices, metapopulation coupling matrices.
- **Reproducibility**: R scripts and DuckDB pipelines are the norm among coders; interactive tools rarely record the
  filter and threshold behind a picture.
- **Privacy review**: provider rules decide what can be published; small flows can disclose.

## 9. Tools landscape and pain points

| Tool                                                              | Used for                                                                                            | Strengths (evidence)                                                                                                                                                                                                                          | Failures (evidence)                                                                                                                                                   |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| flowmap.blue (Sheets, in-browser, R wrapper)                      | quick interactive flow maps, no GIS skills                                                          | zoom-adaptive clustering, top flows, time filter, animation, globe mode with great circles; data not stored on server                                                                                                                         | straight lines only; clustering by proximity "while disregarding flow connections" (https://arxiv.org/pdf/2110.03662); non-commercial license                         |
| flowmap.gl / deck.gl                                              | developers embedding flow maps                                                                      | WebGL; hierarchical clustering; adaptive scales; top-N; diff mode                                                                                                                                                                             | clustering needed from about 100 locations, precomputed from 10,000 (https://deploy-preview-71--flowmapgl.netlify.app/docs/api/clustering)                            |
| kepler.gl / Foursquare Studio                                     | exploratory OD on large data                                                                        | H3 columns; time playback; flow layer with clustering, fade, top flows, location totals; Trip layer for trajectories                                                                                                                          | "monotone curved arcs"; limited symbology; arcs that "can't cross over continents" (https://www.github.com/keplergl/kepler.gl/issues/2512); flow layer "experimental" |
| QGIS (XY to line, geometry generators, FlowMapper, edge bundling) | print maps                                                                                          | full cartographic control                                                                                                                                                                                                                     | hand-built expressions; aggregation outside; bundling "may be perceived as actual routes" (Koylu); self-flows dropped                                                 |
| ArcGIS Pro                                                        | print maps, agencies                                                                                | XY To Line with geodesic lines; Distributive Flow Lines; Generate Origin-Destination Links with group pairing, nearest-N, search distance, overlap aggregation (LINK_COUNT), summary statistics and link-length charts at every license level | no flow arithmetic (net, gross) or flow-aware clustering in that tool; no graph measures                                                                              |
| FlowMapper.org                                                    | designed flow maps                                                                                  | curved, tapered, teardrop styles; net, gross, net ratio; null-model normalization; top-n; classification; project JSON                                                                                                                        | server-side; no usage evidence found                                                                                                                                  |
| R stplanr/od, tidycensus, mapdeck, migest                         | reproducible pipelines                                                                              | long/wide conversion, one-way merge, jittering, chord diagrams                                                                                                                                                                                | every visual choice is code                                                                                                                                           |
| scikit-mobility                                                   | models and quick plots                                                                              | gravity, radiation, tessellation checks, `min_flow`                                                                                                                                                                                           | Folium plots slow for large flows                                                                                                                                     |
| Visum, TransCAD, Emme, Cube                                       | demand modeling                                                                                     | desire lines from any matrix, OD pair filters, bars                                                                                                                                                                                           | straight lines only; whole-matrix maps unreadable without aggregation (TRMG2)                                                                                         |
| Gephi (GeoLayout)                                                 | network view on coordinates; national community detection on county commuting (Urban Science paper) | layout by lat/lon with projections (https://gephi.org/desktop/plugins/geolayout-plugin); GML import from NetworkX                                                                                                                             | no basemap, no flow arithmetic; no source found of agency demographers using it                                                                                       |
| igraph, NetworkX, Neo4j GDS                                       | centrality, communities and robustness on migration, commuting and airline networks (5.8, 5.10)     | full algorithm sets; weight choice per measure                                                                                                                                                                                                | layouts ignore geography (Kaza: "the graph does not respect the geographic locations"); maps made in another tool                                                     |

**Clutter, the common complaint.** n regions need up to n(n-1) lines; 50 states already make "thousands of links"; "filtering lacks the ability to provide an overview";
bundling misreads as routes; matrices hide geography (Koylu et al.). Long flows dominate visually and short flows
vanish (Beecham; Boyandin). Design rules from 97 maps and a 215-participant study: curved beats straight, arrows beat tapering for direction,
minimize overlaps, curve longer flows more (Jenny et al., https://core.ac.uk/works/53876872); a force-directed method
curves flows away from nodes and other flows (https://web.engr.oregonstate.edu/~zhange/images/FlowMapsLayout.pdf).
Shipped remedies: top-N, thresholds, fade, zoom-dependent clustering, viewport-adaptive scales, location totals,
one-place selection, OD maps, chord diagrams.

## 10. Requirements implied

Graphty's Designloom records (design/designloom) contain no geographic population, flow workflow or geographic
capability; filtering, temporal-navigation, visual-encoding-edges and community-detection exist but nothing about
places, coordinates, net flows, self-flows, transport layers or robustness. graphty-element's source already contains a GeographicLayoutEngine and a LocationMapLayoutEngine and the
monorepo ships babylonjs-map and gazetteer, so the rendering base exists.

| #   | Requirement                                                                                                                                                                                                            | Priority | Covered by Designloom today?                                             |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------ |
| R1  | Import a place table plus a flow table joined by id, recognizing lat/lon; report flows whose ids are missing from the place table                                                                                      | must     | No                                                                       |
| R2  | Import OD in long form and as a square matrix (CSV, Excel, OMX), with several counts per pair                                                                                                                          | must     | No                                                                       |
| R3  | Place positions from coordinates, polygons (centroid, point on surface or a supplied population-weighted center) or names (gazetteer geocoding), with a basemap and a choice of projection                               | must     | No                                                                       |
| R4  | Keep self-flows as data: show them as a place's internal total, and let users include or exclude them in statistics and community detection                                                                            | must     | No                                                                       |
| R5  | Flow arithmetic as computed attributes: per pair net, gross, net ratio, two-way merge; per place in, out, internal, net, net rate                                                                                      | must     | Partly (computed-attributes exists; no flow-specific measures)           |
| R6  | Clutter control: top-N flows, threshold, fade small flows, select a place to show only its flows, adaptive thickness scaled to the viewport                                                                            | must     | Partly (filtering is generic)                                            |
| R7  | Zoom-dependent aggregation of places into clusters with flows summed, and administrative roll-up (block to tract to county)                                                                                            | must     | No                                                                       |
| R8  | Curved flows with arrows, offset two-way pairs, longer flows curved more; optional bundling, labeled as not routes                                                                                                     | must     | No                                                                       |
| R9  | Time slices: a time column on flows, filter by range, play through hours or years, and compare two periods (difference of flows)                                                                                       | must     | Partly (temporal-navigation, temporal-analysis; no OD diff)              |
| R10 | Community detection that accepts directed weighted flows with self-loops and can require contiguous regions; show regions as filled areas on the map                                                                   | should   | Partly (community-detection exists; no self-loop or contiguity handling) |
| R11 | Expected-flow models (gravity singly or doubly constrained, radiation, adjusted-flow null model) and residual coloring                                                                                                 | should   | No                                                                       |
| R12 | Matrix and OD-map views as alternatives to the node-link map, linked to it                                                                                                                                             | should   | No                                                                       |
| R13 | Per-flow uncertainty (margin of error) carried through filters and shown                                                                                                                                               | should   | No                                                                       |
| R14 | Data stays local: process large files in the browser without upload                                                                                                                                                    | must     | Partly (runs in the browser; no stated privacy requirement)              |
| R15 | Scale: tens of thousands of places and millions of flow rows loaded, with rendering limited to the aggregated, top-N set                                                                                               | should   | Partly (large-graph-rendering)                                           |
| R16 | Import-time cleaning of release quirks: total rows mixed into flows (IRS 96/97/98), ids that lost leading zeros                                                                                                        | should   | No                                                                       |
| R17 | Export a print-quality map with a flow-width legend, and a shareable link recording filter, threshold and time slice                                                                                                   | must     | Partly (export-image, report-generation)                                 |
| R18 | Chord diagram for region-level summaries                                                                                                                                                                               | could    | No                                                                       |
| R19 | Centrality and community results shown on the geographic layout (size by betweenness, color by community), with the weight meaning chosen per measure (raw, inverse, hop count)                                        | must     | Partly (algorithms exist; no geographic result view)                     |
| R20 | Signed net-flow edges: import antisymmetric net tables, keep one row per pair, orient each edge by sign with the absolute value as weight                                                                              | should   | No                                                                       |
| R21 | Multilayer edges between the same places (per carrier, aircraft type, cargo type, mode), filterable and comparable layer by layer                                                                                      | must     | No                                                                       |
| R22 | Robustness simulation on a geographic layout: remove nodes or edges (by rank of a measure, at random, or a picked hub, canal or strait) and show the largest component and the disconnected places on the map          | should   | No                                                                       |
| R23 | Great-circle arcs on a 3D globe as a first-class view for global air, shipping and migration networks, not only a projection option                                                                                    | must     | No                                                                       |
| R24 | Flow clustering that respects flow connections (spatially constrained partitioning, density-based flow generalization), separate from the location clustering in R7                                                    | should   | No                                                                       |
| R25 | Import aggregated OD tables only; deriving OD from trajectories (stays, trips, zoning, windows) stays in upstream tools such as scikit-mobility, and the zone system and time window travel with the table as metadata | must     | No                                                                       |
| R26 | Import zone boundaries (point, line and polygon features with attributes) from GeoJSON, shapefile, GeoPackage and KML or KMZ, reading the declared coordinate system and reprojecting; join features to nodes by zone id and report unmatched ids on both sides; accept H3 cell ids as zone ids | must     | No (no capability names a geospatial format)                             |
| R27 | Export nodes (as points or their zone polygons) and flows (as lines) with computed attributes to GeoJSON in WGS84, and a zone-to-region lookup with the region polygons for functional regions | must     | No                                                                       |
| R28 | Assign coordinate-only records (trip ends, events) to the zone polygon or H3 cell that contains them, as an import option                                                                                              | could    | No (R25 keeps trajectory processing upstream; this covers small tables) |

New personas proposed: `migration-flow-demographer`, `urban-mobility-analyst`, `mobility-epidemiologist`,
`air-maritime-network-analyst`, plus the OD-matrix variant of the existing research persona `transport-network-planner`.
New workflows proposed: 5.1, 5.2, 5.3, 5.5 to 5.10 (5.4 is the print-quality variant of 5.1 and 5.3).

## 11. Sources

Every non-obvious claim carries its source URL inline, next to the claim, and each workflow names its primary tutorials
and manuals at its top.
