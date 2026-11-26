# Process Mining Analysts: Process Maps, Models and Deviations from Event Logs

## 1. Summary

Process mining analysts reconstruct how a business or clinical process really runs from the records IT systems leave
behind. Their input is not a graph but an event log: a table in which each row says that an activity happened to a
case (a purchase order, a patient stay, a ticket) at a time, often by a resource. Their tools derive two kinds of graph
from that table. The first is the directly-follows graph (DFG, the "process map"): one node per activity, one directed
edge per "A was immediately followed by B in the same case", with counts and durations on every node and edge. It is
the home screen of every commercial product (Celonis, Disco, Microsoft Power Automate Process Mining, SAP Signavio,
UiPath, ServiceNow, Apromore, IBM) and of the open-source libraries (PM4Py, ProM, bupaR). The second is a process
model with execution semantics -- a Petri net, a process tree or a BPMN diagram with gateways -- on which the log is
replayed so that deviations (skipped steps, unexpected steps) are drawn onto the model. Analysts read bottlenecks,
rework loops, skipped controls and deviating variants off these graphs and drill from a node, edge or deviation to the
cases behind it.

The population is large and commercial (921 LinkedIn vacancies in one 2022 snapshot; a market estimated at about 1.5
billion US dollars in 2025) and includes auditors, hospital quality analysts, task mining and customer journey
analysts. It uses almost none of the vocabulary of network analysis. What it needs instead: a graph recomputed from a
filtered table on every interaction, level-of-detail sliders whose semantics have known traps, a stable layered
layout, token replay animation, model notations (bipartite Petri nets, typed BPMN shapes) and deviation overlays.

Cross-references in this folder: `data-preparation-and-import.md` (section 4.3 turns event tables into
people-to-people networks, not activity sequences; section 4.14 covers relational tables), `temporal-and-dynamic-networks.md`
(time windows over networks), `communicating-findings-and-deliverables.md` (maps in slide decks). No document in this
folder covers web clickstream or path analysis outside process mining; that is a gap for the population review.

## 2. Population

| Group                                                | Typical titles                                                                    | Main tools                                                   | Graph touch                                     |
| ---------------------------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------ | ----------------------------------------------- |
| In-house process mining and process excellence teams | Process mining analyst, process analyst, process excellence manager               | Celonis, Signavio, UiPath, Power Automate, ServiceNow, Disco | Daily: the process map is the home screen       |
| Consultants (Big Four, integrators, boutiques)       | Process mining consultant, value engineer                                         | Celonis, Disco for a fast first look                         | Daily during projects                           |
| Event-log data engineers                             | Data engineer, Celonis data engineer, process mining architect                    | SQL, Celonis data integration, Python                        | Weekly: validate the map against extracted data |
| Internal and external auditors                       | Internal auditor, IT auditor, data analytics auditor                              | Disco, Celonis, ProM                                         | Per audit                                       |
| Healthcare analysts                                  | Clinical pathway analyst, quality improvement analyst, health services researcher | Disco, ProM, bupaR, PM4Py                                    | Per study                                       |
| Task mining and RPA analysts                         | Automation analyst, RPA business analyst                                          | UiPath, Celonis and Power Automate task mining               | Per automation discovery project                |
| Customer journey analysts                            | CX analyst, journey analyst                                                       | Celonis, Disco on web or touchpoint logs                     | Per journey study                               |
| Academics                                            | PhD students and researchers in process science                                   | ProM, PM4Py, bupaR, Apromore                                 | Daily in research                               |

**Size, as evidenced.**

- Market: Everest Group estimated about 1.5 to 1.6 billion US dollars in 2025, growing about 24 percent a year
  ([IT Brief](https://itbrief.com.au/story/celonis-named-everest-leader-in-process-mining-again)); other analyst firms
  give 1.2 to 3.2 billion for 2024, so no figure is reliable. Van der Aalst counted "more than 30 commercial
  offerings" by 2019 and states "they all start from DFGs for discovery" ([p1101](https://www.vdaalst.com/publications/p1101.pdf)).
  Gartner publishes a Magic Quadrant for process mining platforms; Celonis was a Leader in 2023-2025
  ([Celonis press](https://www.celonis.com/news/press/celonis-recognized-as-a-leader-for-third-consecutive-year-in-2025-gartner-magic-quadrant-for-process-mining-platforms)).
- Jobs: every LinkedIn vacancy mentioning process mining in May 2022 gave 921 vacancies from 438 organizations in 47
  countries; 476 from end users, 363 from consultancies, 82 from vendors; 2 percent in health. Most frequent titles:
  process mining consultant (58), process manager (33), business analyst (32), process mining manager (28), data
  scientist (27), process analyst (25), data analyst (23), data engineer (22)
  ([Maleki Shamasbi et al. 2022](https://easychair.org/publications/preprint/3hPk)).
- Celonis: 300 customers each above 1 million US dollars of realized value at Celosphere 2025
  ([press](https://www.celonis.com/news/press/celonis-customers-drive-tangible-business-outcomes-with-enterprise-ai-powered-by-process-intelligence));
  Academy pages claim 224,000 to 300,000+ learners (undated, inconsistent: [JP](https://www.celonis.com/jp/training),
  [DE](https://www.celonis.com/de/academy/)); Siemens is cited with 6,000 users
  ([Celonis Siemens](https://www.celonis.com/de/customer-success-stories/siemens-digital-transformation-process-mining/)).
- Open source and research: PM4Py had about 3.4 million total PyPI downloads by May 2026, including CI traffic
  ([pepy](https://pepy.tech/projects/pm4py)). The IEEE Task Force on Process Mining has about 750 members and runs ICPM
  ([Wikipedia](https://en.wikipedia.org/wiki/Task_Force_on_Process_Mining)); the organizers report that over 420 people
  attended the first ICPM (Aachen, 2019), about 33 percent academics, 23 percent tool providers and 43 percent end users
  and consultants ([ICPM 2019](https://icpmconference.org/2019/); van der Aalst's rounder "over 400" is the same event).
  In the task force's 2021 survey of 289 respondents, Celonis (170), Disco (159) and ProM (127) were the most used tools
  and SAP ECC (114) and S/4HANA (101) the most analyzed systems ([Wynn et al. 2022](https://vdaalst.com/publications/p1249.pdf)).
- Healthcare: one systematic mapping study selected 270 healthcare process mining articles
  ([Dallagassa et al. 2022](https://link.springer.com/article/10.1007/s12652-021-02894-7)); a 2025 review analyzed 53
  in full and found Disco and ProM the most common tools ([Aversano et al. 2025](https://pmc.ncbi.nlm.nih.gov/articles/PMC11784703/)).

**Skill profile.** Fluent readers of process maps (thickness, edge labels, self-loops, start and end), with no evidence
in tutorials or postings of centrality or community detection on the activity graph; network measures appear only in
resource "social network" views. Coding is bimodal: SQL and Celonis PQL in commercial work; PM4Py or bupaR in research
and healthcare ([WonderBotz posting](https://www.jobtarget.com/jobs/jt-h7l1wpz8qz/process-mining-analyst)). Source-system
knowledge (SAP tables, change logs) is the scarce skill. In a 41-person interview study, participants averaged 4.5
years of experience ([Zimmermann, Zerbato and Weber](https://pmc.ncbi.nlm.nih.gov/articles/PMC11646219/)).

**Team and cadence.** Fluxicon names four roles: analyst, domain expert (validation workshops), process owner (sponsor)
and IT administrator (extraction and data dictionary), plus optional privacy officer
([Run a project](https://fluxicon.com/book/read/project/)). Projects take "from 4 weeks up to 6 months"
([project guide 2](https://fluxicon.com/blog/2023/11/project-guide-2/)).

## 3. Personas

Composites; every trait ties to a cited source. One id per role, used across this folder.

### 3.1 Anika, process mining analyst in a center of excellence (`process-mining-analyst`)

- **Role.** Four years in a manufacturer's process excellence team after a business analyst role; Celonis certified.
  Writes SQL and PQL, not Python.
- **Tools.** Celonis Studio (Multi-Object Process Explorer, Process Adherence Manager, KPI views), Excel, PowerPoint;
  Disco for a CSV someone emails her.
- **Data.** SAP purchase-to-pay objects and events, hundreds of thousands of cases and millions of events (BPI Challenge
  2019, a real SAP P2P log: 251,734 cases, 1,595,923 events, 42 activities, 627 users;
  [BPIC 2019 report](<https://ckmnet-website-blog.s3.amazonaws.com/CKM_BPI_Challenge2019_FINAL+(SUBMIT).pdf>)).
- **Goals.** Find rework ("Change Price"), late payments, invoices before orders; size their value; monitor KPIs.
- **Frustrations.** Slider-hidden paths ("I don't trust the maps ... because of this slider, we see paths", Zimmermann
  et al. C15); many setup steps before "a basic 2D map"
  ([Celonis community](https://community.celonis.com/general-q-a-10/is-celonis-becoming-too-complicated-4854)).

### 3.2 Marc, operational excellence consultant (`process-mining-consultant`)

- **Role.** Partner-firm consultant with a Lean Six Sigma background; runs "value workshops to build business cases"
  ([posting](https://builtin.com/job/senior-consultant-business-process-excellence-ai/7046251)).
- **Tools.** Disco for first looks at any client export; Celonis or Power Automate for long deployments.
- **Data.** Whatever the client exports: ticket histories, CRM cases, ERP extracts; at least 3 months, or expected
  case duration x 4 x 5 ([Fluxicon data](https://fluxicon.com/book/read/dataext/)).
- **Goals.** In days: happy path, deviations, bottleneck, money, and an animation executives understand.
- **Frustrations.** Stakeholders who cannot read maps; process mining shows "where issues are, but it's not helping to
  solve them" (Zimmermann et al.).

### 3.3 Hannah, internal auditor (`process-mining-auditor`)

- **Role.** Internal audit data analytics lead; tests whole populations instead of samples
  ([Celonis audit blog](https://celonis.com/blog/process-mining-and-internal-audit-a-match-made-in-heaven)).
- **Tools.** Disco (Follower filter with four-eyes option, audit report), Celonis, ProM.
- **Data.** P2P and O2C logs with user ids for the full audit period.
- **Goals.** Payments without approval, skipped release steps, same person on two segregated steps. Evidence: process
  mining at a financial institution found segregation-of-duties violations and payments without approval
  ([Jans, Depaire and Vanhoof](https://documentserver.uhasselt.be/bitstream/1942/13639/1/Process_Mining_EAA.pdf)); BPIC
  2019 found 3,384 cases where one user created the PO item and recorded the goods receipt.
- **Frustrations.** Simplified maps hide the rare paths that are the findings; timestamp ties make order uncertain;
  every exhibit needs its exact filter chain.

### 3.4 Dr. Okafor, clinical pathway analyst (`clinical-pathway-analyst`)

- **Role.** Health services researcher in a hospital quality-improvement unit; R user; works with clinicians and nurses,
  whose involvement healthcare process mining guidance stresses ([Munoz-Gama et al. 2022](https://www.alexandria.unisg.ch/server/api/core/bitstreams/413ecf90-0787-4e40-806d-cfcdc55ec2b7/content), D6).
- **Tools.** bupaR (processmapR, processanimateR), Disco, PM4Py.
- **Data.** EHR tables (admissions, triage, diagnoses, vitals, labs, medications) joined by patient id and time;
  timestamps that are imprecise, late-registered or date-only; hundreds of distinct codes needing abstraction.
- **Goals.** Where patients wait, which pathways deviate from a guideline, what a protocol change did.
- **Frustrations.** Spaghetti maps from high variability (Munoz-Gama D1); data must stay inside the hospital; 70.63
  percent of reviewed studies did not address privacy at all (Aversano et al. 2025).

### 3.5 Lukas, process mining researcher (`process-mining-researcher`)

- **Role.** PhD student in a process and data science group; writes BPI Challenge reports and papers.
- **Tools.** PM4Py in Jupyter, ProM (Inductive visual Miner), OCEL 2.0 logs, Neo4j event knowledge graphs.
- **Data.** Public XES and OCEL logs (section 6).
- **Goals.** Compare discovery algorithms, fitness and precision, prototype object-centric views, reproducible figures.
- **Frustrations.** Static Graphviz images from PM4Py; "each tool converts the data to the event log differently"
  (Zimmermann et al. C12); switching between console and viewer to tune parameters
  ([van den Elzen et al. 2025](https://eprints.whiterose.ac.uk/id/eprint/225747/9/1-s2.0-S0306437925000444-main.pdf)).

### 3.6 Variants that fold into the personas above

- **Event-log data engineer** (variant of `process-mining-analyst`): builds logs from source tables (workflow 5.1);
  postings ask for "building and maintaining event logs and data models"
  ([Dice](https://www.dice.com/job-detail/044ba331-ab6a-4910-a37c-5b2ba2eda1fd)).
- **Task mining analyst** (`task-mining-analyst`, variant of `process-mining-analyst`): works from desktop interaction
  recordings. UiPath's recorder "captures screenshots and metadata for every keyboard input and mouse click, applies PII
  masking"; its AI "clusters screenshots of the same application and screen across traces, then merges matching steps
  and creates decision points" into a task map ([UiPath recorder](https://docs.uipath.com/task-mining/automation-cloud/latest/user-guide/recorder-client-overview.md),
  [UiPath intro](https://docs.uipath.com/task-mining/automation-cloud/latest/user-guide/introduction)). Celonis records
  "clicks, copy/pastes, time spent per application", timestamps and screenshots and matches actions to business cases
  ([Celonis task mining](https://www.celonis.com/process-mining/what-is-task-mining)). The data is far finer-grained than
  system logs, so the map must be abstracted: Power Automate cites hierarchical maps to "drill down into either UI
  recording combined with high level IS event logs" ([Power Automate map](https://learn.microsoft.com/en-us/power-automate/minit/process-map)).
- **Customer journey analyst** (`customer-journey-analyst`, variant of `process-mining-consultant`): applies the same
  map to touchpoints. Weijs and Caron mapped Google Analytics 4 data (user = customer, session = journey, event =
  touchpoint) into Celonis, discovered journeys with a fuzzy miner and measured conformance to four designed journeys:
  "Only 10.31% conforms" to one ([ICSOFT 2022](https://scitepress.org/PublishedPapers/2022/112639/pdf/index.html)).
  Telenor used Disco on 4,934 customers' cross-channel traces and found designed journeys "result in unintended
  deviations for 10-25% of customers" ([Hansson et al. 2021](https://ceur-ws.org/Vol-3112/paper3.pdf)).

## 4. Use cases (ranked)

| Rank | Question                                                                                                                                              | Frequency                                            | Stakes                                                                                |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------- |
| 1    | What does the process actually look like (happy path, start and end, variant count)?                                                                  | First hour of every project                          | Wrong case notion invalidates everything                                              |
| 2    | Where is time lost (waiting on edges, processing on nodes)?                                                                                           | Every project                                        | Staffing and working capital; BPIC 2019 sized a 2 percent discount at up to EUR 9.16M |
| 3    | Why are these cases slow or deviating (which vendor, plant, channel, user or material over-represents in the cases behind a bottleneck or deviation)? | Every project, right after 2, 4 or 5 (workflow 5.11) | Decides who is told to change                                                         |
| 4    | Where is rework (self-loops, back-edges, repetitions)?                                                                                                | Every project                                        | Usually the cost case                                                                 |
| 5    | Does execution conform to rules or a reference model (skipped steps, wrong order, four eyes, guideline)?                                              | Every audit; most programs                           | Audit findings, regulatory and clinical risk                                          |
| 6    | Which variants dominate and which deviate?                                                                                                            | Every project                                        | The long tail holds "most of the performance and compliance problems" (p1101)         |
| 7    | How do segments compare (country, vendor, before and after)?                                                                                          | Most projects                                        | Targeting the fix                                                                     |
| 8    | Who hands work to whom (attribute such as role as the node)?                                                                                          | Service processes, audits                            | Controls, org design                                                                  |
| 9    | Which steps should be automated (frequent, repetitive paths; automation rate)?                                                                        | Every automation CoE cycle (5.10)                    | Sets the RPA pipeline                                                                 |
| 10   | What would a change do (skip a step, remove rework, add automation) before making it?                                                                 | Business-case stage (workflow 5.12)                  | Justifies investment; results are estimates                                           |
| 11   | How do several objects interact (orders, items, deliveries, invoices)?                                                                                | Growing                                              | Flattening distorts counts                                                            |
| 12   | What happened to this one case?                                                                                                                       | Inside every other use case                          | Evidence                                                                              |
| 13   | Show stakeholders the problem (animation, simplified map)                                                                                             | Every workshop                                       | Funding of the fix                                                                    |

## 5. Step-by-step workflows

### 5.1 Building the event log from source tables (the step practitioners rate hardest)

This is where most of the effort goes: in the IEEE task force survey of 289 practitioners, researchers, vendors and end
users, the most common answer for the share of effort spent on data pre-processing was 61 to 80 percent (36 percent of
respondents); plain text files (229) and relational tables (168) were the usual source formats, XES only 112
([Wynn et al. 2022](https://vdaalst.com/publications/p1249.pdf)). Data access, data extraction and access to additional
information are the three highest-rated of 23 challenges
(C14 80.48, C6 79.56, C4 74.82 on a 0-100 relevance score); "ETL functionality in process mining tools is lacking"
([Zimmermann et al.](https://pmc.ncbi.nlm.nih.gov/articles/PMC11646219/)). Sources: [Fluxicon data extraction](https://fluxicon.com/book/read/dataext/),
[Celonis P2P appendix](https://docs.celonis.com/en/appendices-2269196.html), [Celonis activity table](https://docs.celonis.com/en/activity-table-and-case-table.html),
[MIMICEL](https://arxiv.org/html/2505.19389v1).

1. **Agree the activities.** Ask the process owner to sketch the 5-10 most important activities (Fluxicon).
2. **Choose the case notion.** One or more columns "that together uniquely identify a single execution": ticket number,
   order number, ED stay, patient. Changing it changes the process; switching Service ID to Customer ID revealed repeat
   calls ([Fluxicon perspectives](https://fluxicon.com/book/read/perspectives/)).
3. **Find the events.** Systems with an audit trail or history table give one row per status change, exportable as CSV.
   Database-centric ERPs do not: IT finds milestone timestamps in business tables (a standard SAP P2P job pulls EBAN,
   EKKO, EKPO, EKET, EKBE and change documents CDHDR/CDPOS). Each source becomes an activity, often one SQL statement
   per trigger, unioned into one activity table with `_CASE_KEY`, activity, `EVENTTIME` and an optional `_SORTING`
   column for ties. A timestamp column on a case row ("created at", "approved at") becomes its own activity.
4. **Join tables and decide many-to-many links.** "Follow a case" through references (a PO number on an invoice). Where
   one order has several deliveries, "you must decide how to prepare the data" and may need several datasets (Fluxicon);
   object-centric logs (section 5.9) keep the links instead.
5. **Fix timestamps.** MIMICEL built ED stays from six MIMIC-IV-ED tables with PostgreSQL scripts; triage had no
   timestamp and was set to arrival time plus 1 second. Choose the extraction window (at least 3 months; select by
   start date for fall-out analysis, by end date for compliance).
6. **Validate.** Trace 10-20 cases by hand in the source system's screens and compare with the log (Fluxicon). Then a
   validation session with the domain expert.

Graphty's position: SQL extraction from an ERP stays upstream. Joining one case table to one event table, turning
several timestamp columns into activities, and importing OCEL objects and relations are cheap and common, so they are
requirements (R2).

### 5.2 First discovery, bottleneck and handover view in Disco

Source: Fluxicon tutorial (608 purchase orders, 9,119 events, 98 variants, January-October 2011;
[tutorial](https://fluxicon.com/book/read/tutorial/), [import](https://fluxicon.com/book/read/import/),
[map view](https://www.fluxicon.com/book/read/mapview/)). The tutorial takes about 1-1.5 hours
([academic material](https://fluxicon.com/academic/material/)).

1. **Inspect** the CSV: case id, activity, start and complete timestamps, resource, role.
2. **Map columns.** A 1,000-row preview; each column gets one role (Remove, Case, Activity, Timestamp, Resource,
   Other). Disco guesses roles and timestamp patterns ("succeeds in more than 90% of cases") and accepts a pattern
   override. Several columns with one role are concatenated (case = Customer ID + Product). Rows need not be sorted;
   ties keep file order. A large log took about 3.5 hours as CSV and just over one minute as Disco's FXL format.
3. **Read the map.** Start triangle, end symbol, dashed arrows from start and to end. All 608 cases start with
   "Create Purchase Requisition" and split 374/234; "Amend Request for Quotation" occurs more than 500 times: rework.
4. **Set detail.** Paths slider down first, then Activities. At the lowest Paths setting every shown activity stays
   connected. At 100/100 the map is exact and numbers add up; below that they do not (at 100 percent activities "Amend
   Purchase Requisition" occurs 11 times but only 8 outgoing paths show until Paths is 100 percent).
5. **Statistics and cases.** Most cases close in 16-17 days, some take 80-90+. Top variant 88 cases (about 15 percent);
   each case history shows as a graph or a table.
6. **Filter slow cases.** Performance filter, case duration above 21 days: 92 cases. "Copy and filter" into a named
   data set ("SLA Analysis") so the original stays intact.
7. **Find the bottleneck.** Performance view, Mean: "Amend Request for Quotation" takes about 9.8 minutes but is
   followed by a wait of about 14.9 days. "Add secondary" shows a second metric in smaller type.
8. **Animate.** Cases replay as yellow dots that merge into bubbles at queues; "Synchronize case start times" starts
   all cases together. Large logs are animated only for a subset of cases.
9. **Change the node attribute.** Reload the project, set Activity to Other and Role to Activity, re-import. The map now
   shows "the hand-over of work between different functions, or departments", with ping-pong between roles and
   transfer delays. Power Automate offers the same as a Mining Attribute Selection (resource, region, department,
   plant): "the process map is recalculated including the available metrics"
   ([Power Automate map](https://learn.microsoft.com/en-us/power-automate/minit/process-map)).
10. **Hand off.** Map as PDF, PNG or XML (nodes, edges, every metric, layout); metrics as CSV matrices; filtered log as
    CSV, XES or MXML; animation as AVI; project as `.dsc` ([export](https://fluxicon.com/book/read/export/)).

Per-step timing: no source found.

### 5.3 Rule compliance and four-eyes check (Disco)

Sources: tutorial step 9, [filtering](https://fluxicon.com/book/read/filtering/), BPIC 2019 report.

1. Return to the full data set. Spot a path that should not exist: "Send invoice" straight to "Authorize Supplier's
   Invoice payment", skipping mandatory "Release Supplier's Invoice".
2. Click it, "Filter this path...": a pre-configured Follower filter (eventually or directly followed, or never;
   optional time constraint; optional "4-Eyes" rule that an attribute such as resource is the same or different on both
   events). "Filter this activity..." adds an Attribute filter in Mandatory or Forbidden mode.
3. "Copy and filter", open Cases: 10 cases, each history is evidence.
4. Segregation of duties: "Create PO item" eventually followed by "Record Goods Receipt" with 4-Eyes = same resource.
   BPIC 2019 found 3,384 such cases, 49 percent of complete Service cases versus 0.8 percent of Standard cases.
5. Export an audit report: ZIP with filtered CSV, `.recipe` filter file and text filter report.

Decision point: is a rare path a data error (timestamp ties, missing events) or a violation?

### 5.4 Celonis today: objects and events, Multi-Object Process Explorer, Studio

Verified November 2026 against public search snippets of docs.celonis.com (most pages need sign-in) and Celonis
product posts; menu names may differ.

1. **Enable a process from the catalog** (data engineer): its object types, event types, relationships and a perspective
   are enabled, and transformations added per data connection
   ([objects and events](https://docs.celonis.com/en/modeling-objects-and-events.html)). The Process Intelligence Graph
   view shows object types as nodes and relationships as lines ([PI Graph](https://docs.celonis.com/en/process-intelligence-graph.html)).
2. **Build an event log in a Knowledge Model.** In Studio, open the package's Knowledge Model, Event Logs, choose a lead
   object, select events with filters, set the activity column, order attributes (attributes "are concatenated in the
   order placed, which can create unwanted process variants"), preview in the Process Explorer and save
   ([event logs](https://docs.celonis.com/en/eventlogs-oc.html)). KPIs and filters live in the Knowledge Model as PQL.
3. **Explore in the Multi-Object Process Explorer.** Shared activities appear once and object paths meet there; event
   counts per object type sit beside colored squares; a global slider and one slider per object type; adding an event
   may add others to keep it connected ([Multi-Object Process Explorer](https://docs.celonis.com/en/multi-object-process-explorer.html);
   [multi-slider note](https://community.celonis.com/product-updates/multi-sliders-in-process-explorer-2024-05-29-3571)).
4. **Pick KPIs.** Five built-in KPI views (case frequency, activity frequency, throughput time variants); custom KPI
   groups from Knowledge Model KPIs ([KPIs](https://docs.celonis.com/en/process-explorer-kpis)).
5. **Check adherence** in Process Adherence Manager (workflow 5.7b).
6. **Deliver** Studio views, KPI dashboards and action flows; a map alone is of little business value "without creating
   dashboards" (Celonis community).

Legacy note: the CPM 4.7 Process Explorer had a "Fixed Layout" option and case selection "With this activity" or
"Without this connection" ([4.7](https://help.celonis.com/cpm47/en/process-explorer)); classic Analysis features can no
longer be purchased since August 1, 2025.

### 5.5 Simplifying a spaghetti map, and the filtering trap

Source: [Fluxicon simplification](https://fluxicon.com/book/read/simplification/), [p1101](https://www.vdaalst.com/publications/p1101.pdf).

Strategies in practice order: (1) sliders; (2) keep main variants with the Variation filter (only for structured
processes; then both sliders can go to 100 percent and "the numbers then add up"); (3) remove incomplete cases with the
Endpoints filter ("half-finished cases will otherwise appear as faster than they really are"); (4) split process types
by attribute into named data sets; (5) split scenarios with Mandatory or Forbidden activity; (6) trim to a phase; (7)
split by start or end points; (8) remove "spider" activities such as "Send email"; (9) keep only 5-7 milestones agreed
with a domain expert, then drill between two milestones.

The trap: most tools hide an activity by filtering edges on the built graph instead of rebuilding the DFG from a log
without it. For 500 traces a-b-c and 500 traces a-c with b removed, the correct DFG shows a->c 1,000 times and 6 days;
Disco 2.2.1 and Celonis 4.4 showed a->c in 50 percent of cases and 10 days. Concurrency creates loops between
activities that run once, and simplifying such a map in the two tools produced "two completely different DFGs allowing
for contradictory conclusions"; "bottleneck information may be deceiving, especially after model simplification"
(p1101). Celonis now documents that an edge KPI in panel mode includes hidden intermediate events while slider mode
ignores them; one edge read 52 percent of cases on the panel and 32 percent on the slider
([KPI calculations](https://docs.celonis.com/en/kpi-calculations.html), via search snippet). Frequency filtering also
does not fix "chaotic" activities ([Tax et al.](https://link.springer.com/article/10.1007/s10844-018-0507-6)).

### 5.6 Code-first: PM4Py and bupaR

Sources: [PM4Py API](https://pm4py.fit.fraunhofer.de/static/assets/api/2.7.11/api.html), [bupaR frequency maps](https://bupaverse.github.io/docs/frequency_maps.html),
[bupaR advanced maps](https://bupaverse.github.io/docs/advanced_maps.html), [processanimateR](https://search.r-project.org/CRAN/refmans/processanimateR/html/animate_process.html),
ED study ([arXiv 2609.32010](https://arxiv.org/pdf/2609.32010)).

PM4Py: (1) `read_xes`, or pandas plus `format_dataframe(df, case_id=..., activity_key=..., timestamp_key=...)`, which
maps to `case:concept:name`, `concept:name`, `time:timestamp`. (2) Clean: the ED study removed cases with fewer than
four events or broken boundaries (49) and outside 0.5-48 hours (17), keeping 1,754 of 1,820. (3) Variants:
`filter_variants_top_k`, `filter_variants_by_coverage_percentage`; the ED log had 884 variants for 1,754 cases, top 10
covered 21.3 percent, 80 percent coverage needed 519. (4) `discover_dfg`, `discover_performance_dfg`, `view_dfg`:
static Graphviz images. (5) Models and conformance (5.7a). (6) Resources: `discover_handover_of_work_network`,
`discover_working_together_network`, `discover_organizational_roles`, `view_sna`, `view_dotted_chart`.

bupaR: build an `eventlog` (case, activity, activity instance, lifecycle, timestamp, resource);
`filter_trace_frequency(percentage = 0.95)`; `process_map(type_nodes = frequency("relative_case"), type_edges =
performance(mean))` with secondary layers `sec_nodes`, `sec_edges`; `rankdir` TB, BT or RL; `render = FALSE` returns a
graph to modify; `animate_process(log, mode = "absolute" | "relative")` writes an SVG htmlwidget.

In 74 published case studies (427 visualizations), chart views were 47 percent and network views 44.5 percent:
process maps 134, other node-link diagrams 31, Petri nets 13, BPMN 11 (van den Elzen et al. 2025, Table 2).

### 5.7 Conformance against a discovered or reference model

Conformance checking is one of the three core types of process mining, next to discovery and enhancement. It changes
what must be drawn: Petri nets are bipartite (places and transitions), BPMN has gateways and typed shapes, and
deviations are overlaid on a model, not a DFG.

**(a) Discover a sound model and read deviations: ProM Inductive visual Miner, or PM4Py.**
Source: [Leemans, Fahland and van der Aalst, BPM 2014](https://www.vdaalst.com/publications/p789.pdf),
[TU/e record](https://research.tue.nl/en/publications/process-and-deviation-exploration-with-inductive-visual-miner/).

1. Import XES into ProM, run "Mine with Inductive visual Miner".
2. Set the classifier ("perspective"), the activity threshold (keeps the most frequent activities) and the noise
   threshold on paths for Inductive Miner - infrequent. The chain prepare log, filter activities, discover, align,
   filter node selection, animate reruns from the first task a change affects; intermediate results show while
   alignment runs.
3. Read the model: elements carry how often they were executed. Turn on deviations: alignments find, per trace, the run
   through the model with the fewest deviating moves. "If a trace contains an event that is not allowed by the model, it
   is a log move; if the model requires an event that is not present in the trace, it is a model move." Both are drawn
   as dashed red edges: "an edge that circumvents an activity represents a model move, while a self-edge represents a
   log move."
4. Click nodes to keep only traces through them ("filter node selection"), then animate the log on the model.
5. Export the Petri net or process tree to ProM, images as PNG, PDF or SVG, animation as AVI or SVG.
   The PM4Py equivalent: `discover_petri_net_inductive(log, noise_threshold=...)` or `discover_process_tree_inductive`,
   `conformance_diagnostics_alignments`, `fitness_alignments` and `precision_alignments` for global scores,
   `view_petri_net` (static), `convert_to_bpmn`. The ED study reports replay fitness around 0.90-0.95 as usual for
   structured processes. IvM itself listed global fitness and precision as future work, so no single tool shows the map,
   the deviations and the scores together.

**(b) Compare against a reference BPMN: Celonis Process Adherence Manager, Power Automate.**

1. Celonis Process Adherence Manager (general availability December 2023, "the evolution of Process Sphere"; needs an
   object-centric license) "combines mining, modeling and conformance analysis in one single user interface"
   ([product update](https://community.celonis.com/product-updates/137)).
2. Create the target model: mine a baseline model from the data, edit it and confirm it as the target, or import BPMN
   2.0. Imported files must have exactly one start and one end event and no gateways other than exclusive or parallel,
   and cannot be edited in the model editor (search snippets of [creating a model](https://docs.celonis.com/en/creating-a-process-adherence-manager-model.html)).
3. Read the conformance rate (share of cases conforming) and the Deviation Explorer, where deviations appear as panels
   grouped into categories; a category for unexpected events was added in February 2025
   ([release note](https://community.celonis.com/product-updates/process-adherence-manager-unexpected-event-deviation-category-added-2025-02-13-5109)).
   Deviations are ranked by "impact on the overall process performance" with root causes.
4. Select a deviation to see its variants and cases; allowlist accepted deviations so they still show on the target
   model graph but leave the conformance rate
   ([allowlisting note](https://community.celonis.com/product-updates/process-adherence-manager-deviation-allowlisting-added-2025-02-13-5108)).
5. Export the target model as BPMN or to Process Designer. Older Celonis has a Conformance Checker with
   `BPMN_CONFORMS(..., ALLOW(...))` in PQL ([BPMN_CONFORMS](https://docs.celonis.com/en/bpmn_conforms.html)).
6. Power Automate: Compare, Add layer, choose BPMN and a diagram; it "will be transformed and compared to the currently
   open view". Each layer has a color; elements common to both take the compare color; unchecking the current view
   highlights the shared part ([compare](https://learn.microsoft.com/en-us/power-automate/minit/process-compare-compliance)).
   UiPath labels deviations "Skip" and "Invalid activity" ([UiPath conformance](https://docs.uipath.com/process-mining/automation-suite/2.2510/user-guide/conformance-checking)).

### 5.8 Clinical pathway analysis from EHR data

Sources: [Munoz-Gama et al. 2022](https://www.alexandria.unisg.ch/server/api/core/bitstreams/413ecf90-0787-4e40-806d-cfcdc55ec2b7/content),
[Aversano et al. 2025](https://pmc.ncbi.nlm.nih.gov/articles/PMC11784703/), COVID-19 pathways ([arXiv 2606.00041](https://arxiv.org/html/2606.00041v1)),
MIMICEL, bupaR docs. No single source walks the whole bupaR-plus-guideline sequence; the steps are assembled.

1. **Extract** an EHR or registry cut. The COVID-19 study joined six CSV tables (patients with ER, inpatient and ICU
   times; ER and hospital diagnoses; vitals; medications; labs) "through patient identifiers and timestamps", 4,479
   patients.
2. **Map records and codes to activities.** That study built a "consolidated activity label set" (ER admission,
   triage, ward and ICU transfer, vitals, labs, medication). Standard terminologies (SNOMED CT, ICD-10) and the mix of
   high- and low-level data mean abstraction is needed (Munoz-Gama D5).
3. **Choose the case notion.** Events, patients or episodes; "Events" was the most common case id in the 2025 review,
   above 60 percent. MIMICEL used one ED stay; the COVID-19 study one patient.
4. **Repair timestamps.** Missing timestamps and ones "lacking an hour specification" were imputed from "the nearest
   clinically reliable timestamp" only when that restored plausibility; identical timestamps were kept and flagged.
   Late registration means a timestamp "will not correspond with the activity execution time" (Munoz-Gama).
5. **Map.** Disco or bupaR `process_map` with frequency on nodes and performance on edges; animate with
   processanimateR in relative mode for clinicians.
6. **Compare with the guideline.** Guidelines are "prescriptive models" to check against (Munoz-Gama D3); the COVID-19
   study wrote Declare constraints (monitoring before discharge, valid ordering). Conformance is the least studied
   healthcare topic: under 10 articles in the 2025 review.
7. **Protect data.** Credentialed data cannot leave the network (MIMIC requires access approval).

### 5.9 Object-centric exploration (OCEL 2.0)

Sources: [OCEL 2.0 specification](https://www.ocel-standard.org/2.0/ocel20_specification.pdf), [OC-DFG paper](https://arxiv.org/pdf/2206.11017v3.pdf),
[event graph tutorial](https://github.com/multi-dimensional-process-mining/eventgraph_tutorial), [van der Aalst, Rainbow Spaghetti](https://www.vdaalst.com/publications/p1434.pdf).

1. **Why.** Forcing events into one case causes convergence (one event copied into many cases, inflating counts) and
   divergence (false loops); "real-life activities may involve multiple objects of different types" (p1434).
2. **Load** OCEL 2.0 (SQLite, XML or JSON): `read_ocel2_sqlite`; inspect with `ocel_get_object_types`,
   `ocel_objects_interactions_summary`.
3. **Discover** `discover_ocdfg`, `view_ocdfg`: one DFG per object type, merged; shared activities once, edges colored
   per type. Compare with `ocel_flattening(ocel, "order")` to see what flattening hides.
4. **Graph database route.** Researchers load events and entities into Neo4j as event knowledge graphs: one
   directly-follows chain per entity, chains meeting at shared events, Cypher aggregating to multi-entity DFGs
   ([Esser and Fahland](https://arxiv.org/pdf/2005.14552v2)).
   Critique: object-centric maps encode the type only by hue, so "if color is removed, they can be considered traditional
   process maps" (van den Elzen et al. 2025).

### 5.10 How task mining and customer journey work differs

- **Task mining.** Record selected users' desktops; the vendor clusters screenshots and actions into steps and tasks;
  the analyst reviews each step's screenshots, then links tasks to system-level cases (Celonis "case-matching").
  Recording guidance asks users to pause when off task; UiPath recommends 2 to 7 experienced users and 20,000 to 70,000
  actions, an active user giving 200 to 1,000 an hour, with PII masking
  ([UiPath best practices](https://docs.uipath.com/task-mining/automation-suite/2023.4/user-guide/best-practices-utm)).
  UI logs are usually one unsegmented stream per user whose events "do not have case identifiers", so routines are
  segmented before discovery ([Leno et al. 2020](https://arxiv.org/pdf/2008.05782)). UiPath deprecated always-on
  Unassisted Task Mining for removal on December 1, 2025, pointing to assisted Task Mining
  ([release note](https://docs.uipath.com/task-mining/automation-cloud/latest/release-notes/november-2024), search
  summary). The graph needs several levels: UI actions inside tasks
  inside system activities (Power Automate hierarchical maps).
- **Customer journey.** Session or customer as case, touchpoint or channel as activity; compare the designed journey
  with the actual one and slice by device, campaign or landing page (Weijs and Caron); add a designed step and measure
  the change (Telenor's SMS notification lowered deviations).

### 5.11 Root cause analysis: which case attributes explain the slow or deviating cases

Every major commercial tool ships this as the step after a bottleneck or deviation is found.

- **UiPath** ([root cause analysis](https://docs.uipath.com/process-mining/automation-suite/2.2510/user-guide/root-cause-analysis)):
  (1) the Period filter defines the reference set; (2) the Filter panel defines the selected set, for example cases
  over a throughput threshold or cases through a rework edge; (3) pick a field (supplier, plant, user); (4) read a tree:
  the start node gives the baseline share, each child a field value with its influence (a supplier at 60 percent
  against a 20 percent baseline has +40 percent) and its counts in both sets; "Show significant influencers" weighs
  influence against case count; layers combine fields.
- **Power Automate** ([RCA overview](https://learn.microsoft.com/en-us/power-automate/minit/root-cause-analysis-overview)):
  pick a target metric (case duration, rework); the tool builds a decision tree over all case-level attributes,
  choosing splits that minimize weighted variance (Gini impurity for a categorical target). Its example shows why
  one-attribute "Case Duration Influence" misleads: supplier city Graz looks 15 hours slow overall but is 36 hours slow
  only for aluminium and faster than average for other materials.
- **Celonis** KPI driver analysis is the last step of a standard Exploration: select suspected attributes or all, and an
  algorithm ranks attribute values by their impact on whether cases meet a KPI target
  (search summary of [Celonis docs](https://docs.celonis.com/en/kpi-driver-analysis.html), sign-in).
  The selection is made on the graph (a node, edge, variant or deviation); the result is a ranked table or tree beside
  it. It needs the case attributes joined in workflow 5.1.

### 5.12 What-if simulation over the discovered process

- **UiPath Process Simulation** ([docs](https://docs.uipath.com/process-mining/automation-cloud/latest/user-guide/process-simulation)):
  (1) create a simulation, pick the process, optionally filter; (2) choose scenarios: skip an activity, remove direct
  rework, change an activity's or an edge's throughput time by a percentage, or set an automation rate; (3) run; the
  process graph shows the as-is process in blue and the what-if process in purple on the same graph, either can be
  hidden, node and edge metrics selectable; (4) read the simulated average throughput time with a range and the
  automation rate; compare saved simulations; export PNG. Results are estimates.
- **IBM "What if"** (preview; [docs](https://www.ibm.com/docs/en/SSWR2IP_2.0.0/process-mining-documentation/user-manuals/bpa/simulation.html)):
  from project data, define "process evolutions", simulate, see baseline and scenario side by side.
- **Apromore** (on BPMN): discover a BPMN model; set arrival timetables and inter-arrival distributions, resources and
  their timetables, branching and durations; run to get a simulated log; change a parameter and rerun
  ([Apromore simulation](https://documentation.apromore.org/simulation/index.html)).

The graph output is two derived graphs over the same activities, overlaid or side by side: the same need as comparing
two filtered logs (R16).

## 6. Data

**Classic event log.** Required: case id, activity, timestamp; optional start and complete lifecycle, resource, cost,
case and event attributes. Formats: CSV and Excel (most common), XES (IEEE 1849; traces of events; keys `concept:name`,
`time:timestamp`, `lifecycle:transition`, `org:resource`, `case:` prefix), MXML, Disco FXL and `.dsc`, database tables
in Celonis. XES logs often hold start and complete as separate events with `lifecycle:transition`, not as two columns:
BPIC 2012 work items have SCHEDULE, START and COMPLETE events while other states have only COMPLETE
([BPIC 2012](https://ais.win.tue.nl/bpi/2012/challenge.html)), and some starts or completes are missing
([Bose and van der Aalst](https://www.win.tue.nl/bpi/2012/bose.pdf)).

**Object-centric (OCEL 2.0).** Typed events, typed objects with attributes that change over time, event-to-object
links with qualifiers (an object's role), object-to-object links with qualifiers (part-of). SQLite (one table per type
plus E2O and O2O tables), XML, JSON.

**Models.** Petri nets (PNML), process trees, BPMN 2.0 XML, Declare constraints.

| Log                       | Cases                         | Events        | Activities      | Other                                                | Source                                                                                                                |
| ------------------------- | ----------------------------- | ------------- | --------------- | ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Disco tutorial purchasing | 608                           | 9,119         | not stated      | 98 variants                                          | Fluxicon tutorial                                                                                                     |
| BPIC 2012 loans           | 13,087                        | about 262,200 | no source found |                                                      | [BPIC 2012](https://www.win.tue.nl/bpi/2012/challenge.html)                                                           |
| BPIC 2017 loans           | 31,509                        | 1,202,267     | no source found |                                                      | [BPIC 2017](https://www.win.tue.nl/bpi/2017/bpi2017_paper_41.pdf)                                                     |
| BPIC 2019 SAP P2P         | 251,734                       | 1,595,923     | 42              | 627 users; 5,297-8,591 variants in two sub-processes | BPIC 2019 report                                                                                                      |
| MIMICEL ED stays          | 425,028                       | 7,568,824     | 6               | 205,466 patients                                     | MIMICEL                                                                                                               |
| ED patient flow           | 1,754 clean                   | 16,376        | small           | 884 variants                                         | arXiv 2609.32010                                                                                                      |
| COVID-19 pathways         | 4,479 patients                | not reported  | not reported    | six source tables                                    | arXiv 2606.00041                                                                                                      |
| OCEL 2.0 order management | n/a                           | 21,008        | 11 event types  | 10,840 objects, 6 types                              | [Zenodo](https://zenodo.org/records/8428112)                                                                          |
| Siemens order-to-cash     | about 30 million items a year | not published | up to 60 steps  |                                                      | [Computer Weekly](https://www.computerweekly.com/feature/Siemens-success-sets-the-scene-for-growth-in-process-mining) |

**The graph is small and the data is large.** A map has tens to low hundreds of nodes (Apromore caps display at 250
nodes and 1,000 arcs, [Apromore](https://documentation.apromore.org/discovery/discovermodel.html); ServiceNow caps output
per activity, via search snippet), but every slider move or filter re-aggregates millions of rows. Disco animation runs in
1-2 GB by default and subsamples very large logs. Resource graphs are larger (627 users in BPIC 2019, "too complicated
to reasonably depict"). Task mining logs are much finer-grained than system logs (every click).

**Graph properties.** Directed; several metrics per node and edge; cyclic (self-loops, two-cycles from concurrency);
artificial start and end; derived and parameterized (classifier, case notion, filters, thresholds); temporal under the
hood (replay); multi-typed in the object-centric case; hierarchical with clustering or task abstraction; bipartite for
Petri nets and resource-activity views; typed shapes for BPMN.

**Identifier and quality problems.** Case notion choice; many-to-many document links; timestamp ties (BPIC 2019: several
events per case share a timestamp; "impossible to determine the 'correct' order"); date-only clinical timestamps that
create ties; wrong timestamp columns ([Fluxicon blog](https://fluxicon.com/blog/2016/03/data-quality-problems-in-process-mining-and-what-to-do-about-them-part-4-wrong-timestamp-configuration/));
time-zone shifts (BPIC 2019 CSV and Disco file differ by 5-6 hours); "NONE" resources (25 percent in BPIC 2019); label
granularity ("inability of any algorithm to split labels based on the context", C13); incomplete cases at window edges.

**Sensitivity.** Employee ids (works councils), patient data, financial documents. Fluxicon recommends a privacy officer
and anonymized data for sharing; task mining applies PII masking before analysis; some systems allow only limited
exports per day (C4).

## 7. Analysis methods

| Method                       | Computes                                                                                                                                                            | Read as                                                    |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| DFG, frequency               | Absolute and case frequency, max repetitions per case                                                                                                               | Thick = main flow; absolute much higher than case = rework |
| DFG, performance             | Total, min, median, mean, max (Celonis adds trimmed mean); waiting on edges, processing on nodes                                                                    | Long edges = bottleneck                                    |
| Relative frequencies         | bupaR relative, relative-case, relative-antecedent, relative-consequent                                                                                             | Branching probabilities                                    |
| Variants                     | Distinct sequences, coverage curve, loop shortening                                                                                                                 | Happy path, long tail                                      |
| Rule checks                  | Follower patterns, four eyes, time constraints, Declare                                                                                                             | Compliance counts and case lists                           |
| Discovery with semantics     | Inductive (noise threshold), Heuristics, Split Miner to Petri nets, process trees, BPMN                                                                             | Models without DFG artifacts                               |
| Conformance                  | Token replay, alignments (log and model moves), fitness, precision, BPMN adherence rate                                                                             | Deviation hotspots on the model                            |
| Organizational mining        | Handover, working together, subcontracting, roles; any attribute as node                                                                                            | Social network of resources or departments                 |
| Root cause / driver analysis | Attribute-value shares in a selected vs a reference set; decision trees over case attributes for a target metric                                                    | Ranked values or a tree with case share and effect         |
| Simulation                   | Simulated logs from a model or map plus scenario parameters                                                                                                         | As-is vs scenario graphs and KPI ranges                    |
| Time views                   | Dotted chart, Performance Spectrum ([TU/e](https://pa.win.tue.nl/unbiased-fine-grained-description-of-processes-performance-from-event-data/)), duration histograms | Batching, drift                                            |

**Validation habits.** Expert validation sessions; checking numbers add up at 100 percent detail; involving
stakeholders, the most common mitigation, linked to 15 of 23 challenges (Zimmermann et al.).

**Animation** is mostly communication: it makes the process "tangible"
([Fluxicon 2025](https://fluxicon.com/blog/2025/04/analysis-tips-synchronized-animation/)), used after the bottleneck is
found; no measured split between analysis and presentation use found.

## 8. Outputs and collaboration

- Annotated maps (PDF, PNG, XML), animation videos, variant tables and exception lists, dashboards (Celonis Studio,
  Power BI), BPMN target models, audit reports with filter recipes, BPI Challenge reports and papers.
- Sharing: Disco `.dsc` and `.recipe`; filtered XES or CSV; Celonis packages; Power Automate saved views; ServiceNow
  turns a filter into a reusable "finding" and compares before and after maps
  ([ServiceNow findings](https://www.servicenow.com/community/process-mining-blog/turn-filters-into-findings-patterns-with-servicenow-process/ba-p/3250699)).
- Provenance: analysts "often lose awareness of their current data selection" ([ProMiSE](https://ceur-ws.org/Vol-3413/paper9.pdf)).

## 9. Tools landscape and pain points

| Tool                          | Loved for                                                                             | Fails at                                                              |
| ----------------------------- | ------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Disco                         | CSV to map in minutes, sliders, filter from map, synchronized animation, audit report | Desktop and memory-bound; single file; slider semantics trap          |
| Celonis                       | Scale, SAP catalog, PQL, object-centric model, adherence manager, dashboards          | Heavy data engineering; slider and panel KPIs disagree; complex setup |
| Power Automate Process Mining | Attribute selection, hierarchical clusters, BPMN compare layers, BPMN export          | One node metric at a time; capacity limits                            |
| Apromore                      | Connectivity guarantee, abstraction by duration, multi-log animation on BPMN          | 250-node, 1,000-arc display cap                                       |
| ProM (IvM)                    | Sound models, deviations on the model, animation                                      | Usability; no global scores in IvM                                    |
| PM4Py, bupaR                  | Every algorithm, OCEL, reproducible scripts                                           | Static Graphviz images in Python                                      |
| Neo4j event graphs            | Multi-entity modeling                                                                 | Research-grade, no map UI                                             |

Cross-cutting pain points: distrust of simplified maps (8 of 41 interviewees; 81.8 percent of survey respondents who
rated it had experienced it, C15); ETL outside the tools (C4); tool knowledge (18 of 41 "not feeling comfortable",
C11); layout instability -- dot, "the current industry standard", "often fails" to keep the mental map and one edge can
produce "a completely different layout" ([Mennens et al. 2019](https://diglib.eg.org/handle/10.1111/cgf13723));
variant explosion (884 variants for 1,754 ED cases); multi-object reality ("real processes ... are more complex than
the standard process coming from the vendors"); interaction is under-studied (van den Elzen et al. 2025).

General graph tools are rare: Neo4j in research, Graphviz inside the tools; no source found for routine export to
Gephi or Cytoscape. The opportunity is their own workflow inside an embeddable component.

## 10. Requirements implied

None of the personas or workflows in `design/designloom` mention process mining, event logs, DFGs, XES, OCEL, Petri
nets or BPMN. Related generic capabilities: `layout-hierarchical` (Graphviz dot, used by W11), `temporal-navigation`
(snapshot stepping), `animated-transitions`, `comparison-view`, `filtering`, `saved-filters`, `details-on-demand`,
`data-import` (edge lists), `data-export`, `export-image`, `large-graph-rendering`.

| #   | Requirement                                                                                                                                                                                                                                                                                                                                                                                                       | Priority                                      | Covered?                                             |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- | ---------------------------------------------------- |
| R1  | Event table import (CSV, Excel, XES and XES.gz, MXML) with column roles: case (several columns concatenated), activity, one or two timestamps, resource, other, remove; role and timestamp-pattern guessing with override; preview; parse report                                                                                                                                                                  | Must                                          | No                                                   |
| R2  | Multi-table event data: join a case table to an event table; turn several timestamp columns of a case row into activities; OCEL 2.0 import with objects, E2O and O2O relations. ERP extraction stays upstream (see `data-preparation-and-import.md` 4.14)                                                                                                                                                         | Must (join, timestamp columns), Should (OCEL) | No                                                   |
| R3  | Derive a DFG with artificial start and end; case notion and node classifier are parameters; any event attribute or combination (activity, role, department, resource + activity) can be the node, and changing it recomputes the graph and every metric                                                                                                                                                           | Must                                          | No                                                   |
| R4  | Recompute aggregates from the filtered event table on every filter, never by deleting edges from the full graph; when activities are hidden, offer re-derivation from the projected log or bridged edges, with a flag on each edge saying which                                                                                                                                                                   | Must                                          | No                                                   |
| R5  | Metrics: absolute and case frequency, max repetitions; total, min, median, mean, max, trimmed mean duration; waiting on edges, processing on nodes, computed the same way from two timestamp columns or from lifecycle events (XES `lifecycle:transition` or a lifecycle column) by pairing start and complete per activity instance, with unmatched events reported                                              | Must                                          | No                                                   |
| R6  | Primary metric drives thickness and color, secondary as smaller text; nodes and edges may use different metric types                                                                                                                                                                                                                                                                                              | Must                                          | Partly (generic visual encoding)                     |
| R7  | Activities and paths sliders that keep every shown node on a start-to-end path; stated as a view simplification                                                                                                                                                                                                                                                                                                   | Must                                          | No                                                   |
| R8  | Filters from the map (follower with never, time and same/different resource; mandatory and forbidden activity; endpoints; timeframe modes; case performance; variant); drill to cases and each case's history                                                                                                                                                                                                     | Must                                          | No (`details-on-demand` shows attributes, not cases) |
| R9  | Named copy-and-filter data sets; exportable filter recipe with counts                                                                                                                                                                                                                                                                                                                                             | Must                                          | Partly (`saved-filters`)                             |
| R10 | Stable layered layout from start to end, tolerant of cycles, fixed positions as detail changes, backbone on one line, TB or LR                                                                                                                                                                                                                                                                                    | Must                                          | Partly (dot exists, stability does not)              |
| R11 | Variant list linked to the map, coverage, highlight and filter                                                                                                                                                                                                                                                                                                                                                    | Must                                          | No                                                   |
| R12 | Render Petri nets (places, transitions, arcs, tokens), process trees and BPMN (start, end, tasks, exclusive and parallel gateways, typed shapes) as first-class graph types, laid out start to end; import PNML and BPMN 2.0 XML                                                                                                                                                                                  | Must                                          | No                                                   |
| R13 | Conformance overlay on a model: draw log moves as self-edges and model moves as bypass edges with frequencies, per-element execution counts, a deviation list ranked by case count or impact, cases selectable from a deviation, allowlisting, fitness, precision and conformance rate shown                                                                                                                      | Must                                          | No                                                   |
| R14 | Discover sound models (Inductive Miner with noise threshold) and replay alignments in the element                                                                                                                                                                                                                                                                                                                 | Should                                        | No                                                   |
| R15 | Token replay animation on maps and models: real time and synchronized starts, speed, scrubbing, merged tokens, video export, sampling with the sampled share stated                                                                                                                                                                                                                                               | Should                                        | No                                                   |
| R16 | Compare two or more derived graphs or a reference BPMN as colored layers on one layout with per-edge differences, where the second side is any event table: another filter, another period, or a simulated what-if log (as-is vs scenario overlay, 5.12)                                                                                                                                                          | Should                                        | Partly (`comparison-view`)                           |
| R17 | Clustering by an attribute with collapsible, multi-level hierarchy (milestones; UI actions inside tasks inside system activities)                                                                                                                                                                                                                                                                                 | Should                                        | Partly (`node-merging`)                              |
| R18 | Object-centric DFG: shared activities once, one edge set per object type with per-type sliders and counts, encoded beyond hue                                                                                                                                                                                                                                                                                     | Should                                        | No                                                   |
| R19 | Resource handover, working-together and role networks from the same log, with segregation-of-duties highlighting                                                                                                                                                                                                                                                                                                  | Should                                        | Partly (generic metrics)                             |
| R20 | Warnings for timestamp ties, date-only timestamps, incomplete cases, conditional edge durations, metrics after hiding                                                                                                                                                                                                                                                                                             | Should                                        | No                                                   |
| R21 | Exports that add up: graph with all metrics (JSON or XML), metric CSVs, filtered log (CSV, XES), model as BPMN or PNML, recipe, vector image                                                                                                                                                                                                                                                                      | Must                                          | Partly                                               |
| R22 | Scale: aggregate 1-10 million events interactively in the browser while drawing tens to hundreds of nodes; legible labels when expanded                                                                                                                                                                                                                                                                           | Must                                          | No (`large-graph-rendering` targets many nodes)      |
| R23 | Local-only processing and pseudonymized case and resource ids on export, for patient and employee data                                                                                                                                                                                                                                                                                                            | Should                                        | No                                                   |
| R24 | Dotted chart and case duration histogram linked to the selection                                                                                                                                                                                                                                                                                                                                                  | Could                                         | No                                                   |
| R25 | Case attribute statistics for the current selection against a reference set (the cases behind a clicked node, edge, variant or deviation vs all, or a filter vs a period): per attribute value, counts in each set, share, deviation from baseline and a significance flag; optionally a decision tree over case attributes for a target metric; linked to the map selection, returned as structured facts (5.11) | Must                                          | No                                                   |

Placement under Graphty's rules: deriving graphs from event tables, aggregates, filters, variants, model discovery,
alignments and replay are capabilities, so they belong in graphty-element, usable by a third party with no app code.
Which metric is primary, panel layout and wording are presentation and belong to the app.

Suggested new Designloom workflows: "Event log to process map and bottleneck" (5.1, 5.2, 5.5), "Rule compliance check"
(5.3), "Conformance against a reference or discovered model" (5.7), "Clinical pathway against a guideline" (5.8),
"Before and after or what-if comparison" (section 8, 5.12), "Why are these cases slow" (5.11), "Object-centric
exploration" (5.9). Generating a simulated log is out of scope for a graph component; overlaying its result is R16.

## 11. Sources

Every claim above cites its source inline, with its URL. The sources this document relies on most:

- https://fluxicon.com/book/read/tutorial/ and the rest of the Disco guide (import, mapview, filtering, simplification,
  export, dataext, perspectives, project) -- the canonical workflow and data requirements.
- https://www.vdaalst.com/publications/p1101.pdf -- van der Aalst 2019: DFG limits and the filtering trap.
- https://vdaalst.com/publications/p1249.pdf -- Wynn et al. 2022: IEEE task force survey of 289 respondents on data preparation.
- https://pmc.ncbi.nlm.nih.gov/articles/PMC11646219/ -- Zimmermann, Zerbato and Weber: 23 analyst challenges.
- https://eprints.whiterose.ac.uk/id/eprint/225747/9/1-s2.0-S0306437925000444-main.pdf -- van den Elzen et al. 2025: 427 visualizations in 74 case studies.
- https://www.vdaalst.com/publications/p789.pdf -- Inductive visual Miner: log and model moves on the model.
- https://docs.celonis.com/en/multi-object-process-explorer.html and https://community.celonis.com/product-updates/137 -- Celonis explorer and Process Adherence Manager.
- https://docs.uipath.com/process-mining/automation-suite/2.2510/user-guide/root-cause-analysis and https://learn.microsoft.com/en-us/power-automate/minit/root-cause-analysis-overview -- root cause analysis.
- https://docs.uipath.com/process-mining/automation-cloud/latest/user-guide/process-simulation -- as-is and what-if on one graph.
- https://learn.microsoft.com/en-us/power-automate/minit/process-compare-compliance -- BPMN compare layers.
- https://documentation.apromore.org/discovery/discovermodel.html -- sliders, connectivity guarantee, display caps.
- https://www.ocel-standard.org/2.0/ocel20_specification.pdf -- OCEL 2.0.
- https://ckmnet-website-blog.s3.amazonaws.com/CKM_BPI_Challenge2019_FINAL+(SUBMIT).pdf -- BPIC 2019 report.
- https://arxiv.org/html/2505.19389v1 -- MIMICEL construction.
- https://arxiv.org/pdf/2008.05782 -- routines from unsegmented UI logs.
- https://icpmconference.org/2019/ -- ICPM 2019 attendance.
