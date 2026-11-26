# Engineers Who Analyze Dependencies: IT Services, Networks, Software and Data Lineage

## 1. Summary

This population is the engineers whose daily question is "what depends on what". It has ten groups:

- site reliability engineers (SREs) who read service maps during incidents;
- IT operations and change managers who query configuration management databases (CMDBs) before changes;
- migration architects who map server-to-server connections to plan "move groups" and waves;
- network engineers who read Layer 1, 2 and 3 topology maps;
- application security engineers and developers who inspect transitive package graphs and SBOMs;
- build and infrastructure-as-code engineers who compute what a change affects (Bazel, Nx, Terraform);
- software architects who hunt dependency cycles and layer violations with dependency structure matrices (DSMs);
- data engineers who read table- and column-level lineage (dbt, OpenLineage, DataHub, Dataplex);
- SEO and site-architecture analysts who crawl a website and analyze its internal link graph (Screaming Frog, Sitebulb, Gephi, NetworkX);
- systems engineers in model-based systems engineering (MBSE) who trace requirements to design in SysML models (Cameo, Capella) and need typed models laid out automatically.

Enterprise architects do the same closure work on hand-curated models. All work on directed, typed graphs. The dominant operation is the upstream or downstream closure of a node, to a chosen depth, through only the right edge types, with health or risk overlaid. Migration architects also partition the server graph, and software architects collapse cycles. Two groups differ in kind: SEO analysts rank pages by internal PageRank and compare link graphs before and after a change, and MBSE engineers mostly need readable, automatically laid-out diagrams of nested, typed models with ports. Most do not think of themselves as graph users: the graph is a view inside another product, judged by how fast it answers their question.

## 2. Population

**Job titles.** Site Reliability Engineer, DevOps / Platform Engineer, NOC analyst; Configuration Manager, Change Manager (ITIL); Cloud Migration Architect; Network Engineer; Application Security Engineer, Software Architect, Build / Release Engineer; Enterprise Architect; Data Engineer, Analytics Engineer; Technical SEO Specialist, SEO Consultant; Systems Engineer, MBSE Engineer, Requirements Engineer.

**Scale of the problem (evidence).**

- Meta (2022): 18,500 active services, 393,622 inter-service edges, maximum fan-in 14,084 (https://www.usenix.org/system/files/atc23-huye.pdf).
- Netflix: a real-time dependency graph of "thousands of microservices" (https://infoq.com/news/2026/06/netflix-microservices-realtime/).
- Jack Henry (banking software): about 250 services, 212 behind one gateway (https://www.honeycomb.io/blog/jack-henry-bubble-up-service-map).
- Azure Migrate (now branded Azure Catalyst) runs agentless dependency analysis on up to 3,000 servers per appliance for VMware and 1,000 for Hyper-V and physical servers (https://learn.microsoft.com/en-us/azure/migrate/how-to-create-group-machine-dependencies-agentless).
- The npm graph analyzed by Zimmermann et al.: almost 700K nodes and 4.5M edges; an average package implicitly trusts about 80 other packages (https://blog.acolyer.org/2019/09/30/small-world-with-high-risks/).
- Log4Shell: 35,863 Maven Central artifacts (about 8%) depended on affected log4j code; over 80% only indirectly, most about five levels deep, some nine (https://security.googleblog.com/2021/12/understanding-impact-of-apache-log4j.html?m=1).
- Large dbt projects ship manifests of "dozens of megabytes"; GitLab's dbt docs site downloaded a 58 MB JSON payload and the stock lineage graph crashed (https://www.dagster.io/blog/dbt-docs-on-react).
- Website crawls: Screaming Frog's free version crawls up to 500 URLs (https://beanstalkim.com/learn/visualizing-your-site-structure-in-advance-of-a-major-change); its built-in crawl diagrams show "up to 10k URLs at a time, as they are extremely memory intensive" (https://www.screamingfrog.co.uk/guides/visualisations); a practitioner reports full inlink exports that "can easily reach 1GB to 20 GB" (https://www.briggsby.com/internal-link-analysis-with-python).
- INCOSE, the systems engineering professional society, reported 26,567 members and corporate associates in 2024 (https://www.incose.org/wp-content/uploads/2026/01/2024_incose_annualreport.pdf); not all practice MBSE. A graph layout vendor, Tom Sawyer Software, names Airbus, BAE, Lockheed Martin, NASA, JPL, Raytheon and Toyota as customers of the platform behind its SysML layout product (https://www.omg.org/sysml-directory/vendor/Tom_Sawyer_Software.html, vendor).

No source found for a head count of these roles worldwide, or for Cameo or Capella seat counts.

**How often they touch graph tools.**
SREs at every incident; change managers per change request (ServiceNow opens a dependency map from any CI record, https://www.servicenow.com/docs/r/servicenow-platform/dependency-views/c_NextGenBSMMaps.html); migration architects for weeks per program; AppSec continuously, in bursts on events such as Log4Shell; build engineers on every CI run, mostly through automation; data engineers per pull request and per incident; network engineers, SEO analysts and systems engineers per incident, audit or design review (no source found for their frequency). Monte Carlo's commissioned surveys report data incident resolution averaging of 9 hours (2022) and 15 hours (2023) (https://dzone.com/articles/data-quality-survey-resolving-data-issues-takes-16, https://www.hpcwire.com/bigdatawire/2023/05/02/data-quality-is-getting-worse-monte-carlo-says/).

**Skill profile.** Most are strong coders and command-line users who write a selector or query before they drag nodes. SEO analysts work mostly in crawlers, spreadsheets and Gephi; systems engineers in modeling tools. They know "upstream", "transitive", "blast radius" and "cycle", rarely centrality vocabulary. Edge direction matters: the wrong way "sends responders to the victims' suppliers instead of the victims" (https://edgedelta.com/company/blog/blast-radius-is-a-graph-query).

**Team context.** Work is collaborative and time-boxed (war rooms, change boards, wave reviews, pull-request review, client audits, design reviews). Ownership metadata on nodes is the usual pivot once impact is known (https://www.datadoghq.com/blog/dependency-map-navigator/).

## 3. Personas

Persona ids are new; none of the existing personas in design/designloom/personas covers this population.

### 3.1 `sre-incident-responder` -- Priya, Senior Site Reliability Engineer

- **Background.** On call for a payments platform of about 300 services on Kubernetes.
- **Tools.** Datadog Service Map and Dependency Map Navigator (https://www.datadoghq.com/blog/dependency-map-navigator/), Grafana Tempo service graphs, Kiali, AWS X-Ray, Backstage, PagerDuty.
- **Data.** Trace-derived service graphs (nodes = services, edges = aggregated calls with rate, error rate, latency), Kubernetes topology, deploy events, ownership catalog.
- **Goals.** Decide quickly whether the alerting service is the cause or a victim; find the upstream dependency that broke; tell the incident commander which customer-facing services are affected.
- **Frustrations.** The unfiltered map is unreadable (Jack Henry's "extremely connected" gateway); maps lose nodes when spans are dropped (https://docs.datadoghq.com/tracing/services/services_map/); low-traffic edges vanish from rate queries (https://grafana.com/docs/tempo/latest/metrics-from-traces/service_graphs/); maps go stale (https://getunblocked.com/blog/map-blast-radius-incidents-ai-tools/).

### 3.2 `it-change-impact-analyst` -- Marcus, Configuration and Change Manager

- **Background.** ITIL-certified; owns CMDB data quality at a bank and chairs the change advisory board.
- **Tools.** ServiceNow CMDB with Dependency Views and Service Mapping, Event Management impact trees, Excel exports, a Neo4j prototype with Bloom.
- **Data.** Configuration items (applications, services, VMs, hosts, storage, network devices, racks) linked by typed relationship pairs such as "Depends on::Used by" and "Runs on::Runs"; business services, SLAs, customer counts.
- **Goals.** For every change request, list the business services and customers a maintenance window will affect, confirm redundancy, and schedule or reroute (https://linkurious.com/blog/network-management-and-impact-analysis-with-neo4j/).
- **Frustrations.** Stale relationships (a vendor audit of a 14,000-CI CMDB found 34% stale records, https://virima.com/blog/inherited-cmdb-data-quality-audit); maps default to three levels; impact is not calculated for some service classes (https://www.servicenow.com/docs/bundle/xanadu-it-operations-management/page/product/event-management/concept/c_EMImpactCalculation.html).

### 3.3 `cloud-migration-architect` -- Leila, Data Center Migration Architect

- **Background.** Systems integrator architect moving a retailer's 2,400 VMware servers to the cloud; PowerShell, SQL, Power BI, Excel.
- **Tools.** Azure Migrate / Azure Catalyst dependency analysis, AWS Migration Hub network diagram with Application Discovery Service (closed to new customers as of 2025-11-07, replaced by AWS Transform: https://docs.aws.amazon.com/migrationhub/latest/ug/network-diagram.html), Power BI with Microsoft's network connections template, the CMDB, a wave planning runbook and spreadsheet.
- **Data.** Time-sliced connection records between servers with process names and destination ports; resolved (both ends known) versus unresolved (IP-only) endpoints; server inventory (OS, power state, installed software); application owner interviews.
- **Goals.** Turn thousands of servers into move groups -- "a block of servers or applications that should be moved together" -- and order them into waves (https://docs.aws.amazon.com/prescriptive-guidance/latest/large-migration-portfolio-playbook/wave-planning.html); avoid cutting a live dependency between a migrated and an unmigrated server.
- **Frustrations.** Must wait at least 24 hours for enough data; the multi-server view hides unresolved connections; shared services (Active Directory, DNS, monitoring) connect to everything and must be set aside by hand; the map shows connections but does not propose groups.

### 3.4 `network-topology-engineer` -- Sam, Network Engineer

- **Background.** Runs a campus and two data centers; keeps NetBox as the source of truth; Python with Netmiko and Nornir.
- **Tools.** NetBox with netbox-topology-views, NetDoc for discovery, SolarWinds Network Topology Mapper or Auvik for automatic maps, NetBrain-style path tools, Visio and draw.io for deliverables.
- **Data.** SNMP inventory; CDP/LLDP neighbor tables (local device and port, remote device and port); ARP and MAC forwarding tables; VLAN assignments; IP prefixes and VRFs; routing tables; NetBox devices, cables, sites, racks and roles.
- **Goals.** Keep an accurate physical (Layer 1) and logical (Layer 2 VLAN, Layer 3 subnet and routing) picture of each site; during an outage, find the fault domain and the path traffic actually takes.
- **Frustrations.** The same devices need different edge sets per layer; neighbor protocols are less complete than SNMP (Auvik support, https://support.auvik.com/hc/en-us/articles/202956414); interfaces with several LLDP neighbors break cable inference (https://github.com/dainok/netdoc/wiki); diagrams drift unless regenerated.

### 3.5 `software-supply-chain-security-engineer` -- Dana, Application Security Engineer

- **Background.** Five-person AppSec team covering 600 repositories.
- **Tools.** `npm ls --all`, `npm explain`, `mvn dependency:tree`, `gradle dependencyInsight`, Dependabot, Snyk or Endor Labs, OWASP Dependency-Track, CycloneDX Sunshine, cdxgen/Syft, GUAC.
- **Data.** CycloneDX and SPDX SBOMs per build and image; advisories (GitHub Advisory Database, OSV, NVD) with CVSS, EPSS and CISA KEV flags; licenses.
- **Goals.** When a CVE drops, answer "which applications ship the vulnerable component, through which path, and which direct dependency must we bump"; prioritize by reachability and exploitability.
- **Frustrations.** Dependabot shows only direct dependencies and npm audit reports transitive ones "only as a textual, command-line table" (https://arxiv.org/html/2405.09074v1); 52.9% of real SBOMs carry no dependency edges (https://arxiv.org/abs/2607.22140); nested JARs hide log4j from `mvn dependency:tree` (https://aws.amazon.com/blogs/security/identify-java-nested-dependencies-with-amazon-inspector-sbom-generator); SBOM graph renderers become unreadable at scale (https://cyclonedx.github.io/Sunshine).

### 3.6 `analytics-engineer-lineage` -- Tomas, Analytics Engineer

- **Background.** About 1,500 dbt models on Snowflake in staging, intermediate and mart layers, plus Airflow and Spark.
- **Tools.** dbt Catalog lineage and column-level lineage, `dbt ls --select`, Slim CI, Recce or Datafold, DataHub, OpenLineage into Marquez.
- **Data.** dbt `manifest.json` (`parent_map`, `child_map`, exposures), `catalog.json`; OpenLineage RunEvents with column-lineage facets; BI dashboards as exposures.
- **Goals.** Before merging, know which downstream models, columns, dashboards and owners are affected; after a test failure, trace the bad column upstream.
- **Frustrations.** Large DAGs "might not render" (https://docs.getdbt.com/docs/explore/explore-projects); column lineage cannot parse Python models or hard-coded table names (https://docs.getdbt.com/docs/explore/column-level-lineage); DataHub defaults to one degree and caps CSV export at 10,000 rows (https://docs.datahub.com/docs/act-on-metadata/impact-analysis).

### 3.7 `seo-site-architecture-analyst` -- Noor, Technical SEO Consultant

- **Background.** Agency consultant auditing e-commerce and publisher sites; Excel, some Python.
- **Tools.** Screaming Frog SEO Spider, Sitebulb, Gephi, NetworkX or Pandas for large exports, Google Analytics and Search Console.
- **Data.** A directed page-to-page link graph from a crawl (section 6) with page attributes: status code, crawl depth, indexability, section, sessions, backlinks.
- **Goals.** Find important pages that receive little internal link value, orphan pages and pages buried too deep; before a redesign or migration, predict which high-traffic pages will lose internal PageRank.
- **Frustrations.** Built-in crawl diagrams stop at 10,000 URLs and "do not scale very well" (https://www.screamingfrog.co.uk/seo-spider-10/); exports must be trimmed by hand before Gephi accepts them; one practitioner's working ceiling in Gephi was about 100,000 nodes and a million edges (https://www.onely.com/blog/plotting-websites-structure-gephi/); exports outgrow Excel.
- **Why a separate persona.** The data and the deliverable differ from the impact personas: the question is how link value flows across the whole graph (PageRank, depth, modularity by section), answered by comparing two versions of the graph, not by a closure from one node.

### 3.8 `mbse-systems-engineer` -- Ken, Systems Engineer at an aerospace prime

- **Background.** Maintains a SysML model of an avionics subsystem.
- **Tools.** Cameo Systems Modeler (MagicDraw) with Teamwork Cloud, Dependency Matrix and Relation Map; Capella on some programs; an auto-layout add-on such as Tom Sawyer Model-Based Engineering.
- **Data.** Requirements linked by derive and containment, blocks by satisfy, tests by verify; blocks nested in blocks with ports and connectors; SysML v2 models through the Systems Modeling API (5.12).
- **Goals.** When a requirement changes, list every derived requirement, satisfying block and verifying test; show coverage gaps (requirements with no satisfy or verify) at a design review; keep structure diagrams readable as the model changes.
- **Frustrations.** "Diagram arrangement is time-consuming and costly", and hand-drawn diagrams "constantly showed the wrong contents" as the model changed (vendor blog, https://blog.tomsawyer.com/growing-pains-learning-from-sysml-v1); generic "Arrange All" layouts are "not adapted to all kinds of diagrams" (https://blog.obeosoft.com/a-picture-is-worth-a-thousand-words); matrices grow very large (https://www.webel.com.au/taxonomy/term/1242).
- **Why a separate persona.** The traceability closure resembles the change-impact persona, but the dominant need does not: orthogonal, layered layouts of nested boxes with ports and typed connectors, regenerated from the model.

### 3.9 Smaller groups without a full persona

**Build, release and infrastructure-as-code engineers.** They ask "what does this change affect" of a build graph (workflow 5.9). Their task shape matches the developer in 5.6, with closure over a chosen universe.

**Software architects.** They use DSMs and nested dependency graphs (NDepend, Structure101, Lattix, jQAssistant, dependency-cruiser) to find cycles and layer violations (workflow 5.10).

**Enterprise architects and application portfolio managers.** They keep application, interface and capability graphs in SAP LeanIX, Ardoq or Sparx EA; LeanIX markets understanding "the full impact of retiring an application" (https://www.leanix.net/en/products/application-portfolio-management, vendor). In Ardoq's Dependency Map "reference chains are strictly directional" (https://help.ardoq.com/en/articles/44007-dependency-map). Decommissioning is a typed upstream closure: from the application to retire, follow incoming references to every consumer, roll up to capabilities, list owners. Unlike a CMDB, the graph is curated by hand and typed by meta-model, so mixing curated with discovered edges is a real need (evidence is vendor material and reviews, https://www.g2.com/compare/ardoq-vs-sap-leanix).

## 4. Use cases (ranked)

| Rank | Question answered with the graph                                                                             | Who                                             | Frequency                        | Stakes                                       |
| ---- | ------------------------------------------------------------------------------------------------------------ | ----------------------------------------------- | -------------------------------- | -------------------------------------------- |
| 1    | Incident: is this alerting service the cause or a victim? Which upstream dependency broke?                   | SRE, network engineer                           | Every page                       | Outage minutes, revenue, SLOs                |
| 2    | Blast radius: if X fails, which services, business services and customers are affected?                      | SRE, IT ops                                     | Every incident and change        | Severity, customer communication             |
| 3    | Planned change impact: what breaks if I take X down or change it? Is there redundancy?                       | Change manager, data engineer, systems engineer | Daily                            | Unplanned outages, broken dashboards         |
| 4    | Which servers move together; how to split the estate into move groups with few cut dependencies?             | Migration architect                             | Weeks per migration program      | Failed cutovers, rollbacks                   |
| 5    | Which applications include vulnerable component C, through which path, and which direct dependency fixes it? | AppSec, developers                              | Continuous; bursts               | Breach risk, deadlines                       |
| 6    | What does this commit affect in the build graph, and what must CI build and test?                            | Build engineers                                 | Every CI run                     | CI cost, missed regressions                  |
| 7    | Data incident root cause: which upstream column, model or job produced this bad value?                       | Data engineer                                   | Weekly                           | 9-15 hour average resolution (vendor survey) |
| 8    | Pre-merge data impact: which downstream models, columns, exposures and owners does this PR touch?            | Data engineer                                   | Every PR                         | Broken dashboards and ML features            |
| 9    | Where is the fault domain on the network, and what path does traffic take from A to B?                       | Network engineer                                | Per network incident             | Site or service outage                       |
| 10   | Architecture conformance: which cycles and layer violations exist, and which dependency should be cut?       | Architects                                      | Per review; CI rules             | Maintainability, independent deployability   |
| 11   | Why is this package installed / why two versions?                                                            | Developers                                      | Weekly                           | Build failures, class conflicts              |
| 12   | Who still uses this application or interface before we retire it?                                            | Enterprise architect                            | Per rationalization decision     | Broken integrations                          |
| 13   | Bloat and license: which dependencies are unused, or carry a forbidden license, and through which parent?    | Developers, AppSec                              | Per release                      | Attack surface, legal exposure               |
| 14   | Single points of failure: which component has the most distinct dependents?                                  | IT ops, architects                              | Quarterly                        | Resilience                                   |
| 15   | Topology change over time: what dependency appeared just before the incident?                                | SRE                                             | Post-incident                    | Root cause in postmortems                    |
| 16   | Which important pages are underlinked, orphaned or too deep, and what will a redesign change?                | SEO analyst                                     | Per audit; before each migration | Organic traffic lost after launch            |
| 17   | Which requirements lack a satisfying block or verifying test; what does changing one touch?                  | Systems engineer                                | Per design review and change     | Certification findings, rework               |

## 5. Step-by-step workflows

No source found for per-step durations in any of these workflows; none are given.

### 5.1 Incident triage on a service map (SRE)

Sources: Datadog Service Map and Dependency Map Navigator (section 3.1), AWS X-Ray trace map (https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/ServiceLens.html), Dynatrace Smartscape Classic (https://docs.dynatrace.com/docs/analyze-explore-automate/smartscape-classic) and Visual Resolution Path (https://docs.dynatrace.com/docs/analyze-explore-automate/smartscape/smartscape-in-context-views/visual-resolution-path), Jack Henry (section 2), PagerDuty (https://www.pagerduty.com/resources/incident-management-response/learn/dependency-mapping-faster-incident-resolution/).

1. **Page arrives**; the SRE opens the service from the alert.
2. **Scope the map.** Set environment and a time window covering onset; Datadog maps per scope, and nodes appear only with data in the window. In X-Ray, choose a group (saved filter); the trace map displays up to 10,000 nodes.
3. **Read health overlays.** Datadog colors node borders red or yellow from Service Health. X-Ray outlines red for 5xx, yellow for 4xx, purple for 429 throttling; node size can be health or traffic.
4. **Isolate the alerting node.** Datadog's inspection view puts callers left ("closer to your customers") and callees right ("more likely root causes").
5. **Walk toward candidate causes.** Step to callees that are themselves unhealthy; this is the core loop. In Smartscape Classic's example, 31 unhealthy services all ran processes on one Windows host, which narrowed the cause to that host (vertical stack: application, service, process, host, data center).
6. **Walk the other way for blast radius.** From the faulty node, follow only dependency edges to affected callers; including ownership or correlation edges pulls in nearly every service within two hops (Edge Delta).
7. **Filter to the affected population.** Jack Henry filters to services carrying one institution ID, isolates the failing path, highlights HTTP 500s, then drills into spans.
8. **Correlate with change and time.** Check last-deploy facets and historical topology (Netflix supports time-window queries "to correlate dependency changes with when an incident began").
9. **Pivot** to traces, logs and monitors from the node menu.
10. **Hand off.** Page the owner from the catalog; tell the commander which customer-facing services are affected.

Decisions: cause versus victim, which neighbor next, whom to page. The graph navigates between alert and evidence; it is never the deliverable.

### 5.2 "What breaks if X fails or changes" in a graph CMDB (IT operations)

Sources: Neo4j IT Service Graph (https://neo4j.com/developer/industry-use-cases/agnostic/it-service-graph/it-service-graph), GraphAware Hume (https://graphaware.com/blog/insightful-it-operations-with-hume/), Linkurious (above), ServiceNow relationships (https://www.servicenow.com/docs/r/yokohama/servicenow-platform/configuration-management-database-cmdb/c_CIRelationships.html) and impact calculation (section 3.2).

1. **Load the model.** Neo4j: `(Software)-[:DELIVERS]->(Service)-[:USED_BY]->(Customer)`, `(Software)-[:INSTALLED_ON]->(Server)`. ServiceNow: typed pairs such as "Depends on::Used by".
2. **Identify the target CI**, for example a server going offline for an upgrade.
3. **Bottom-up impact query.** Follow `DEPENDS_ON` in reverse: `MATCH p=(resource)<-[:DEPENDS_ON*]-(dependency) WHERE ID(resource)=$id RETURN p` (GraphAware).
4. **Single point of failure.** `count(DISTINCT dependent)` per component. Neo4j adds a redundancy check: "whether the most important customers have redundancy throughout the network."
5. **Weigh severity.** ServiceNow Event Management propagates severity up the tree (100% down, 60%, 40%, 20% impaired), lowers it one level for redundant network components, and excludes CIs in maintenance.
6. **View the map.** Dependency Views shows three levels each way by default, clusters collapsed, the root CI framed, indicators for open issues, and lets users draw new relationships.
7. **Decide and hand off.** Schedule or reroute; attach the impacted-service list to the change request.

### 5.3 Transitive vulnerability triage across a portfolio (AppSec)

Sources: Google on log4j (section 2), npm, Gradle and Maven documentation (https://docs.npmjs.com/cli/v10/commands/npm-explain, https://docs.gradle.org/current/userguide/viewing_debugging_dependencies.html), Dependency-Track (https://dependencytrack.github.io/docs/next/guides/user/triaging-policy-violations/), Sunshine, V-Achilles (section 3.5), InfoWorld (https://www.infoworld.com/article/3644492/how-to-detect-the-log4j-vulnerability-in-your-applications.amp.html), Veracode (https://veracode.com/blog/managing-appsec/review-log4shell-detection-methods).

1. **Advisory arrives.** Note exact coordinates and version range (log4j-core, not every "log4j" artifact).
2. **Portfolio search.** Query the SBOM store (Dependency-Track, GUAC GraphQL) for every project containing the component; this "is much faster than scanning every Java application" (InfoWorld). Caveat: SBOMs do not show what is deployed (https://www.scworld.com/analysis/asset-management/sbom-is-an-ingredient-not-the-whole-recipe-in-preventing-the-next-log4j-breakdown), and many omit edges, so a missing path is not proof of absence.
3. **Per-application path.** `npm explain <pkg>` prints each installed copy with its chain to the root; `gradle dependencyInsight` and `mvn dependency:tree -Dverbose -Dincludes=<g>:<a>` show selection and conflicts.
4. **Choose the fix point.** For a transitive package the developer usually bumps a direct dependency (V-Achilles). In Maven, fixes propagate "starting from the deepest dependencies first", and many artifacts wait on another's fix (Google).
5. **Prioritize.** By CVSS, EPSS, KEV and reachability. Vendor figures: Semgrep found 31 of 1,614 Dependabot alerts reachable in one project (https://semgrep.dev/blog/2024/overrated-and-underperforming-transitive-reachability-analysis).
6. **Visualize when text fails.** Sunshine draws a sunburst colored by severity, one ring per level. V-Achilles colors direct dependencies orange, vulnerable nodes vermillion and others by hop count; 7 of 10 participants changed fix priority after seeing it versus 3 of 10 with npm audit.
7. **Hand off.** Tickets with the path and the direct dependency to bump; Dependency-Track policy violations can fail CI.

### 5.4 Pre-merge impact on a lineage graph (data engineer)

Sources: dbt graph operators (https://docs.getdbt.com/reference/node-selection/graph-operators), dbt Catalog and column lineage (section 3.6), DataHub (section 3.6), dbt-guard (https://pypi.org/project/dbt-guard/), Atlan (https://docs.atlan.com/product/capabilities/lineage/how-tos/download-and-export-lineage).

1. **Open lineage.** dbt Catalog: model page, then a focus option (upstream and downstream, only downstream, only upstream), or the column card for column lineage.
2. **Select the downstream closure.** `dbt ls --select "my_model+"` (all descendants), `"my_model+1"` (one degree), `"3+my_model+4"` (bounded both ways); `@my_model` adds ancestors of all descendants. Combine with selectors such as `tag:nightly`.
3. **Apply lenses** (resource type, materialization, layer, test status).
4. **Narrow to columns.** Column evolution marks passthrough, rename and transformed columns; only the downstream columns of a changed column are the real impact set.
5. **Check exposures and owners.** DataHub: Lineage tab, upstream/downstream toggle, degree (default 1), facet filters, CSV export with owners, capped at 10,000 rows.
6. **Run CI on the closure.** Slim CI builds `state:modified+`; dbt-guard prunes unaffected descendants with a breadth-first traversal of `child_map`; Recce or Datafold diff values.
7. **Decide.** Breaking, partial or non-breaking; split the PR; notify owners with an impact list.

### 5.5 Root cause after a data break (data engineer)

Sources: dbt column lineage (section 3.6), OpenLineage (https://openlineage.io/docs/spec/object-model, https://openlineage.io/docs/spec/facets/dataset-facets/column_lineage_facet), Dataplex (https://docs.cloud.google.com/dataplex/docs/lineage-views), DataHub framing (https://datahub.com/?p=14889, vendor).

1. **Symptom.** A dbt test fails on a column, or a stakeholder reports a wrong number.
2. **Trace upstream.** dbt's documentation gives the rationale: "a failing data test on a particular column in your dbt model might've stemmed from an untested column upstream." Use status lenses to find the red region.
3. **Inspect transformations on edges.** In Dataplex, processes sit on edges; clicking one shows the SQL and run history; "Visualize Path" highlights the path back to the root. OpenLineage separates DIRECT from INDIRECT (join, filter) column inputs.
4. **Check runs.** In Marquez, a failing or late upstream run (FAIL state, `errorMessage` facet) is often the cause.
5. **Cross tools.** Analysts trace "upstream through three or four candidate sources, then switch between tools" (vendor framing).
6. **Fix and backfill.** Repair upstream, rebuild `my_model+`, notify downstream owners.

### 5.6 Why is this installed, and which version wins (developer)

1. `npm explain`, `gradle dependencyInsight` ("Selection reasons") or `mvn dependency:tree -Dverbose` ("omitted for conflict with 2.0"; verbose was removed in plugin 3.0) show why a copy is present; Gradle marks repeated subtrees `(*)`.
2. Decide: pin, exclude or upgrade the parent. For bloat, DepClean found 2.7% of direct, 15.4% of inherited and 57% of transitive dependencies bloated (https://link.springer.com/article/10.1007/s10664-020-09914-8).
3. Visualize when needed: `npm ls --json | npm2dot`, `depcruise --output-type dot src | dot -T svg`, madge, npmgraph.

### 5.7 Discover dependencies and form move groups (migration architect)

Sources: Azure Migrate / Azure Catalyst agentless dependency analysis (https://learn.microsoft.com/en-us/azure/migrate/how-to-create-group-machine-dependencies-agentless), AWS Migration Hub network diagram (https://docs.aws.amazon.com/migrationhub/latest/ug/network-diagram-how-to.html) and grouping (https://docs.aws.amazon.com/application-discovery/latest/userguide/applications.html), AWS wave planning playbook (section 2), Cloudamize move groups (https://support.cloudamize.com/kb/ai-augmented-move-groups-waves).

1. **Deploy the collector.** An appliance with vCenter, Hyper-V or server credentials polls connections every 5 minutes and sends a combined data point every six hours.
2. **Wait** "at least 24 hours"; each server shows a status (credentials missing, validation failed, over the limit, or View dependencies).
3. **Open the multi-server map.** "Explore Applications" shows "logically grouped server nodes and their connections" since collection began, only resolvable connections, with an overview inset.
4. **Filter** by server name, destination port, OS, connection count and appliance. Selecting a node outlines its immediate dependents; the Connections tab lists incoming and outgoing connections with counts.
5. **Spot and tag a cluster.** Ctrl plus a drag box multi-selects interconnected servers; "Add or edit tags" groups them "as an application". In AWS, shift-click selects, hovering a port "highlights all the connections that open that port", and "Group as application" creates or extends an application.
6. **Drill to processes and ports.** Expanding a connection shows process-to-process connections with destination port (last 24 hours by default, up to 30 days; "Unknown process" otherwise).
7. **Export** a zipped CSV (7 to 30 days), one row per dependency per six-hour slot (columns in section 6); "All" adds unresolved, IP-only connections.
8. **Finish outside the tool.** Microsoft ships a Power BI template whose network connections chart is filtered by source and destination server and process slicers.
9. **Form move groups and waves.** Set aside shared dependencies: AWS says Active Directory "should not be considered when defining move groups". Apply move group rules (shared database, same owner, same patch window). Combine groups into waves (early waves under 10 servers). Cloudamize automates the split with "graph cleaning and clustering" and "deterministic community detection" that avoids overly large clusters; users then move servers between groups by hand.

Decisions: which connections are noise, where a cluster boundary falls, which cut dependencies are acceptable. The core analysis is graph partitioning, done today mostly by eye.

### 5.8 Network troubleshooting and site documentation (network engineer)

Sources: netbox-topology-views (https://github.com/netbox-community/netbox-topology-views), NextBox UI (https://github.com/iDebugAll/nextbox-ui-plugin), NetDoc (https://github.com/dainok/netdoc/wiki), SolarWinds NTM (https://www.solarwinds.com/network-topology-mapper/use-cases/network-mapping), Auvik support (section 3.4), NetBrain A/B path (https://www.netbraintech.com/docs/12ac1ue0to/help/HTML/a-b-path.html, https://www.netbraintech.com/blog/the-science-of-a-b-path-calculation).

Documenting a site:

1. **Discover.** Poll devices by SNMP and collect neighbor, ARP, forwarding, IP and VLAN tables (SolarWinds NTM, Auvik).
2. **Infer cabling.** NetDoc: "L2 neighbors (LLDP/CDP) are used to guess L1 cabling", then "populates NetBox (devices, cables, IP addresses and prefixes)". For Layer 3 it groups IP addresses into prefixes within a VRF.
3. **Render.** netbox-topology-views draws connections "based on the cables you created in NetBox", filtered by name, site, tag and device role; a physics layout runs until the engineer drags devices, whose positions are saved in named coordinate groups. NextBox UI orders device layers by role (layered or auto layout).
4. **Deliver.** Export to draw.io XML or PNG (netbox-topology-views); NetDoc exports L2 and L3 diagrams to draw.io.

Troubleshooting:

1. **Locate the fault domain.** On the Layer 2 view (VLANs, switch links), find the down link or device and the hosts behind it. Auvik describes switching between physical, Layer 2 and Layer 3 views (vendor marketing).
2. **Trace the path.** NetBrain's A/B path emulates forwarding using routing tables, ACLs and policies, in Layer 2, Layer 3 or Layer 3 Active mode; its documented flow baselines a healthy path and, during an incident, compares the live path with the cached one.
3. **Hand off** the path and the failing hop to the device owner or carrier.

### 5.9 What does this change affect in the build graph (build and IaC engineers)

Sources: Bazel query guide (https://bazel.build/query/guide) and language reference (https://bazel.build/query/language), Nx affected (https://nx.dev/docs/features/ci-features/affected), Terraform graph (https://developer.hashicorp.com/terraform/cli/commands/graph), Spacelift (https://spacelift.io/blog/terraform-graph).

1. **Get changed files** from git (Nx: base and head refs).
2. **Compute reverse dependencies within a universe.** Bazel: `rdeps(u, x)` finds "the reverse dependencies of the targets in x within the transitive closure of u", and `rdeps(u, x, depth)` bounds it.
3. **Avoid the universe trap.** `--infer_universe_scope` uses the target patterns in the query, "but this might not be what you want": `allrdeps(//my:target)` can return only the target itself. Sky Query also "cannot order its output according to graph order", so `--output graph` is unavailable with it.
4. **Visualize when needed.** `bazel query "allpaths(//foo, third_party/...)" --notool_deps --output graph | dot -Tsvg`. Nx: `nx graph --affected`, or `nx affected -t build --graph`; `--explain=stdout` writes why each task is affected as JSON.
5. **Infrastructure as code.** `terraform graph` emits DOT of "the dependency ordering of the resources"; `-draw-cycles` colors cycle edges. Large graphs "become dense and hard to read", so practitioners `grep "module.networking"` the DOT before rendering, or switch to Rover, Blast Radius or Inframap.

### 5.10 Find and remove dependency cycles and layer violations (architect)

Sources: NDepend DSM (https://www.ndepend.com/docs/dependency-structure-matrix-dsm), dependency graph (https://www.ndepend.com/docs/visual-studio-dependency-graph), cycles (https://www.ndepend.com/features/dependency-cycles); Lattix DSM paper (https://groups.csail.mit.edu/sdg/pubs/2005/oopsla05-dsm.pdf); dependency-cruiser (https://www.npmjs.com/package/dependency-cruiser); madge (https://github.com/pahen/madge).

1. **Load the hierarchy.** Rows and columns are assemblies, namespaces, classes and methods; a parent row opens to show its children. Cells show coupling counts.
2. **Triangularize.** The command keeps "non-empty cells as close as possible to the diagonal"; on a layered structure this reveals the layers, on a tangled one it exposes cycles.
3. **Read the cycles.** Black cells "represent mutual direct usage (i.e A is using B and B is using A)"; in indirect mode a cycle appears as a red square. "If a dependency cycle involves N components, these N components represent a single super-component."
4. **Open the path.** Clicking a cell "shows the path graph"; the cycle graph follows the cycle between two types. In the node-link view, sub-graphs sit inside parent boxes with expand/collapse, callers green, callees blue, entangled elements red.
5. **Enforce.** NDepend cycle rules (ND1400, ND1401) and dependency-cruiser `forbidden` rules (such as no circular imports or no import from a layer above) fail CI; madge lists circular imports.
6. **Decide** which edge to cut (usually the lightest cell in the cycle) and file refactoring work.

### 5.11 Internal-link audit and migration simulation (SEO analyst)

Sources: Onely Gephi tutorial (https://www.onely.com/blog/plotting-websites-structure-gephi/), Dave Davies on simulating a change (https://searchengineland.com/visualizing-site-structure-advance-major-change-286510, mirrored at beanstalkim.com), Screaming Frog link position (https://www.screamingfrog.co.uk/how-to-analyse-link-position/), Link Score (https://www.screamingfrog.co.uk/link-score/), visualisations guide (section 2), Sitebulb (https://sitebulb.com/resources/guides/crawl-map-examples/, https://support.sitebulb.com/en/articles/12839707-auditing-internal-linking-with-sitebulb), Briggsby (section 2).

Audit:

1. **Crawl.** Crawl the site from the home page. Screaming Frog computes crawl depth, inlink counts and Link Score, a 0-100 internal PageRank-like value calculated in Crawl Analysis for internal, non-redirected, non-canonicalized URLs.
2. **Read in the crawler first.** Sort by Link Score and crawl depth; find orphans by comparing crawled URLs with sitemap, Analytics and Search Console URLs (Sitebulb flags pages found only in those sources). Glance at the force-directed crawl map: Sitebulb colors by depth and exposes flat architecture, pagination chains and "content explosion"; Screaming Frog sizes and colors by depth or path and grays out nodes truncated at 10,000 URLs.
3. **Export the edges.** Bulk Export, All Inlinks or All Outlinks (the vendor warns the file "can be huge"), or Response Codes, Success (2xx) Inlinks.
4. **Clean.** Keep only hyperlinks (link type AHREF, dropping CSS, JS and images); remove nofollow links because "Bots do not follow those links"; decide about navigation and footer links (filter link position to Content, or keep them and down-weight sitewide links -- Onely uses 0.4); keep Source and Target columns; strip the byte order mark. No source found for a standard rule on URL parameters; practitioners decide per site.
5. **Import into Gephi.** Import Spreadsheet as an Edges table, create missing nodes, merge parallel edges by Sum. Past about 50,000 URLs, filter to the giant component first.
6. **Compute.** Directed PageRank with edge weights; modularity, tuning resolution until classes match the site's sections.
7. **Style and lay out.** Color by modularity class or section, size by in-degree or PageRank; ForceAtlas 2 with Prevent Overlap, stopped by hand. Append node attributes (Analytics sessions, Googlebot hits from logs) as a Nodes table.
8. **Act.** List high-value pages with low internal PageRank, propose links from strong pages, and re-crawl to confirm.

Migration or redesign simulation:

1. Build a staging copy of only the new structure (the example adds one hub page of text links in place of a drop-down menu).
2. Crawl live and staging; replace the staging host with the live domain so node ids match.
3. Build both graphs identically, joining organic sessions per landing page.
4. Compare PageRank per page between graphs (the example product page rose from 0.016629 to 0.02171), look for outliers with far fewer inlinks, and flag high-traffic pages that lose value.
5. Deliver side-by-side graph images with a table of per-page PageRank and sessions; adjust the plan before launch.

Code-first variant: read the Source and Target CSV into NetworkX as a directed graph, tag page type from URL patterns, run `pagerank(alpha=0.85)`, and compare score histograms across scenarios (Briggsby).

### 5.12 Requirement traceability and automatic diagram layout (systems engineer)

Sources: MagicDraw relation map criteria, layout and depth (https://docs.nomagic.com/x/OwcmC), predefined maps (https://docs.nomagic.com/MT/latest/magic-cyber-systems-engineer---cameo-systems-modeler/predefined-relation-maps-303992535.html), traceability and matrices (https://docs.nomagic.com/x/OS8mC, https://docs.nomagic.com/x/NS8mC, https://docs.nomagic.com/x/NC8mC), Tom Sawyer Model-Based Engineering (https://tomsawyer.com/model-based-engineering), capellambse auto-layout (https://capellambse-context-diagrams.readthedocs.io/en/stable/diagram_view/), Capella ELK plugin notes (https://capella.rail-research.europa.eu/docs/user/tools/capella/custom-plugins/elk/), SysML v2 API (https://www.omg.org/news/releases/pr2025/07-21-25.htm, https://github.com/systems-modeling/sysml-v2-release).

Change impact on a requirement:

1. **Start at the changed requirement.** Its traceability properties list linked elements; Cameo calls tracing "fundamental to performing impact analysis when requirements change".
2. **Build a relation map.** Choose the context element, the criteria (relationship types), element type and scope; choose Tree or Radial layout; set Depth, the number of branch levels expanded automatically; older versions can also show implied relationships computed from inherited or inner elements (https://docs.nomagic.com/x/ySFUAw). Predefined requirement containment and derivation maps re-render as the model changes.
3. **Check coverage in a matrix.** Satisfy, Refine and Verify matrices put requirements on one axis and design elements or tests on the other; empty rows are coverage gaps. Missing relationships can be added and redundant ones removed in the matrix.
4. **Decide and record.** Update the derived requirements and design, then bring the matrix and maps to the design review.

Keeping structure diagrams readable:

1. **Generate rather than draw.** Tom Sawyer's add-on, a MagicDraw and Cameo plug-in or a Teamwork Cloud web app, lays out block definition, internal block and parametric diagrams; it claims to handle "thousands of elements and relationships" and lets users group elements "into a nested drawing structure to control the level of detail shown" (vendor).
2. **In Capella,** run the ELK layout with snap-to-grid off; it does not support sequence, activity or state machine diagrams. capellambse regenerates architecture diagrams with ELK, keeps nesting at "arbitrary depth", and can leave "large areas of white space" with large subgraphs.
3. **Hand-tune.** Users still lay out by hand: one wants to avoid "spending hours on aligning and adjusting lines, ports and the positions of elements", another calls layout "very time consuming" and not "the most value added of activities", and ELK fails on architecture diagrams that show allocated functions (https://forum.mbse-capella.org/t/effectively-beatifying-diagrams-with-automatic-functions-how/6516).

Data source trend: OMG adopted the Systems Modeling API and Services 1.0 ("SysML v2 API") in 2025, a standard interface "to navigate, query, and update the model" with an OpenAPI description; Tom Sawyer's SysML v2 Viewer reads "any SysML v2 API-compliant repository". It is an emerging standard source; no source found for how many production repositories expose it.

## 6. Data

| Domain                         | Sources and formats                                                                                                                                                                  | Typical sizes (evidence)                                                                                            | Identifiers and problems                                                                                                                                  | Properties                                                                                                                             |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Service maps                   | OpenTelemetry span pairs, eBPF flow logs, mesh metrics, vendor APIs, Prometheus service-graph metrics                                                                                | Hundreds to tens of thousands of services (Meta 18,500; 393,622 edges)                                              | Service names differ across tools; virtual nodes for uninstrumented peers                                                                                 | Directed, weighted (rate, errors, latency), edges age out (Datadog 30 days), cycles possible                                           |
| CMDB / IT topology             | ServiceNow tables plus typed relationship pairs, Neo4j models, CSV exports                                                                                                           | 14,000 CIs in one audit                                                                                             | Duplicates, stale IPs, orphaned relationships                                                                                                             | Typed edge pairs, containment plus dependency, redundancy groups                                                                       |
| Server connections (migration) | Azure Catalyst CSV: Timeslot (six hours), Source server name, application and process, Destination server name, IP, application, process and port; AWS Discovery network connections | Up to 3,000 servers per appliance (VMware), 1,000 otherwise; several appliances; 7 to 30 days                       | Resolved versus unresolved (IP-only, unknown process) endpoints                                                                                           | Directed, time-sliced, process edges nested in server edges, counts as weights                                                         |
| Network topology               | SNMP; CDP/LLDP neighbor tables; ARP and MAC tables; VLANs; prefixes and VRFs; routing tables; NetBox devices, cables, sites, racks                                                   | No source found for typical sizes                                                                                   | Interfaces with several neighbors; neighbor protocols less complete than SNMP; VRFs set by hand                                                           | Separate edge sets per layer (L1, L2, L3) over the same nodes; interface endpoints; grouped by site, rack, role                        |
| Package dependencies           | Lockfiles, `npm ls --json`, Maven/Gradle trees; CycloneDX (`dependencies[]` with `ref`, `dependsOn[]`); SPDX relationships (DEPENDS_ON, CONTAINS); GUAC GraphQL                      | npm package trusts about 80 others; Syft scans list 5,263 to 87,776 nodes; log4j paths 5-9 deep                     | Same package at several versions; name-matching errors; nested JARs; "a component missing from the dependencies array has unknown dependencies, not zero" | Directed, mostly acyclic (npm allows cycles), edge types (runtime, dev, optional, peer), version, vulnerability and license attributes |
| Build and IaC graphs           | Bazel query `--output graph` DOT; Nx project graph and `--explain` JSON; `terraform graph` DOT (`-type=plan`, `-draw-cycles`)                                                        | No source found for typical sizes; Spacelift says static Terraform images stop helping past "a few dozen resources" | Results depend on the chosen universe; Sky Query output is unordered                                                                                      | Directed acyclic (cycles are errors), target and resource types                                                                        |
| Code structure                 | NDepend, Lattix, jQAssistant, dependency-cruiser, madge (DOT, JSON)                                                                                                                  | No source found                                                                                                     | Generated and third-party code inflate graphs                                                                                                             | Nested containment with counts rolled up per level; cycles are the finding                                                             |
| Data lineage                   | dbt `manifest.json` (`parent_map`, `child_map`, exposures); OpenLineage events (`columnLineage` facet); DataHub GraphQL; Dataplex API                                                | Thousands of models; manifests dozens of MB; Dataplex fetches 10 levels, expands 3                                  | Names from physical location; hard-coded table names break lineage; temporary tables                                                                      | Bipartite (jobs and datasets), column graph nested in tables, typed edges, temporal, layered by convention                             |
| Enterprise architecture        | LeanIX, Ardoq, Sparx EA inventories                                                                                                                                                  | No source found for portfolio sizes                                                                                 | Curated by hand; goes stale                                                                                                                               | Typed by meta-model (application, interface, capability, process)                                                                      |
| Website link graphs            | Crawler CSV (All Inlinks/Outlinks: source, target, type, follow, link position, anchor); page tables (status, depth, indexability, Link Score); Analytics and log joins              | Free crawl cap 500 URLs; diagrams cap 10,000; exports of 1 to 20 GB; one Gephi ceiling about 100,000 nodes          | Images, scripts, nofollow and sitewide links dropped or down-weighted; staging hosts renamed                                                              | Directed, weighted, parallel edges merged, root at the home page (depth), compared across versions                                     |
| MBSE models                    | SysML v1 in Cameo/Teamwork Cloud; Capella (Arcadia); SysML v2 via the Systems Modeling API (REST, OpenAPI)                                                                           | Tom Sawyer claims diagrams of "thousands of elements"; no source found for model sizes                              | Diagrams drift from the model when drawn by hand                                                                                                          | Typed nodes and edges (satisfy, derive, verify, refine, containment), nested blocks with ports and connectors                          |

**Sensitivity.** Topology, CMDB, network and server-connection data are security-sensitive (a map of attack paths); SBOM portfolios reveal vulnerable assets; lineage exposes schemas and SQL. Tools run inside the company boundary; uploads to third-party sites are unlikely to be allowed.

## 7. Analysis methods

- **Directed reachability with depth limits.** dbt `+`, `n+`, `@`; Cypher `[:DEPENDS_ON*]`; Bazel `rdeps(u, x, depth)`; DataHub degrees; ServiceNow levels; Ardoq degree sliders. This is the dominant computation, and it is always relative to a universe or loaded subgraph.
- **Edge-type-restricted traversal.** Only dependency edges count for blast radius (Edge Delta); Ardoq chains cannot change direction.
- **Path explanation.** npm explain, Gradle insight, Bazel `allpaths`, Dataplex "Visualize Path", NDepend path graph, NetBrain A/B path.
- **Counting dependents.** Distinct transitive dependents as criticality (Neo4j `count(DISTINCT dependent)`; npm reach). Connection counts as edge weights (Azure).
- **Partitioning into groups with few edges between them.** Migration move groups (5.7), done by eye with lasso selection or by tools such as Cloudamize's community detection; after removing shared hubs (Active Directory).
- **Cycle detection, strongly connected components and layering.** A cycle of N components is one "super-component" (NDepend); DSM triangularization; dependency-cruiser and Terraform `-draw-cycles`.
- **Severity propagation with redundancy.** ServiceNow percentage levels.
- **Root-cause ranking.** Practitioners rarely run centrality by hand, but personalized PageRank over an anomaly-weighted dependency graph is an established research method. MicroRCA reports 89% precision on a Kubernetes benchmark (https://hal.archives-ouvertes.fr/hal-02441640); eIRWR reports MRR 0.78 to 0.95 on 12K-25K-node Alibaba graphs (https://arxiv.org/abs/2608.08073). No source found for which commercial products use it.
- **Decomposition by clustering.** IBM Mono2Micro clusters Java classes by use case and runtime calls to propose microservices (https://arxiv.org/abs/2107.09698).
- **Link-value ranking and version comparison.** SEO analysts run weighted directed PageRank and modularity on the whole link graph and compare scores between live and staging crawls (5.11).
- **Traceability coverage.** Systems engineers look for requirements with no satisfy or verify edge -- empty matrix rows (5.12).
- **Set operations and diffs.** Union of closures, `state:modified`, data diffs, topology at a past time (Netflix), live versus cached network path (NetBrain).
- **Aggregation into higher-level nodes.** Kiali groups versions into an app box; process edges roll up into server edges (Azure); DSM rows roll up to namespaces; ServiceNow collapses CMDB clusters; dbt and Dataplex open tables to columns.
- **Validation habits.** Count confirmations (an edge seen in 400 discovery runs outranks one seen once, Edge Delta); wait for enough collection time (24 hours); treat missing SBOM edges and unresolved connections as unknown, not absent; suspect parsing gaps in column lineage.

## 8. Outputs and collaboration

- **Incident artifacts:** affected-service list and severity; problem timeline; postmortem with the dependency chain. Map screenshots go into postmortems; no source found for export conventions.
- **Change records:** impacted CI lists attached to change requests.
- **Migration plans:** a wave planning runbook recording dependencies, move group rules in priority order and wave criteria, plus a dashboard spreadsheet (AWS playbook); tags on servers marking applications; CSV and Power BI reports for application owners.
- **Network documentation:** draw.io or PNG diagrams per site and layer; NetBox as the source of truth.
- **Security and build:** tickets with path and fix point; VEX statements; CI failures from Dependency-Track policies, dependency-cruiser and NDepend rules; Nx `--explain` JSON.
- **Data impact:** PR descriptions listing affected models and exposures; DataHub/Atlan CSV exports.
- **SEO:** an audit or pre-launch report with side-by-side live and staging graph images, per-page PageRank and sessions, and a list of links to add.
- **MBSE:** traceability matrices, relation maps and regenerated structure diagrams brought to design reviews.
- **Reproducibility:** everything is regenerated from source (manifest, SBOM, traces, discovery); a link to a filtered view, a saved selector or a saved query is the shareable unit. The exceptions are network diagrams with hand-saved coordinates and migration groupings stored as tags.

## 9. Tools landscape and pain points

Tools and frustrations per persona are in section 3. Users value automatic discovery, status overlays, exact scriptable closures, a pivot from node to evidence, and CSV export. They are failed by hairballs at scale and hard node caps (X-Ray 10,000 nodes, Screaming Frog diagrams 10,000 URLs, dbt DAGs that "might not render"), one-to-three-level default depths, missing or stale edges shown as if complete, grouping done by hand, and analysis finished in Excel, Power BI or Gephi because the product view cannot do it. The Lattix authors report that a DSM "appears to overcome scaling problems" that node-link views hit (section 5.10).

**Layout conventions.** Lineage and build graphs: layered left-to-right. Infrastructure stacks: top-to-bottom (Smartscape). Service maps: force-directed, with a three-column isolation view (callers, focus, callees). Network maps: physics layouts with saved positions, role-ordered layers, grouping by site and rack. Packages: indented trees, sunbursts, force graphs. Architecture: DSMs and nested boxes. SEO crawl maps: force-directed from the home page, colored by depth. MBSE: nested boxes with ports on their borders and connectors (Tom Sawyer offers orthogonal layout for them); relation maps as trees or radial.

## 10. Requirements implied

Coverage is checked against design/designloom (personas, workflows W01-W25, capabilities). "Partly" means a related capability exists (for example `layout-hierarchical`, the undirected `removal-impact-analysis`, `comparison-view`) without the stated behavior.

| #   | Requirement                                                                                                                                                            | Priority | Covered? |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | -------- |
| R1  | Directed upstream/downstream closure with separate depth limits each way (dbt `3+x+4`), within a universe or loaded subgraph shown to the user (Bazel's universe trap) | Must     | Partly   |
| R2  | Traversal restricted to chosen edge types and direction, stating which were used                                                                                       | Must     | No       |
| R3  | Layered left-to-right DAG layout stable across expand/collapse; top-to-bottom for infrastructure tiers                                                                 | Must     | Partly   |
| R4  | Focus view: callers on one side, callees on the other, step to re-center                                                                                               | Must     | No       |
| R5  | Group and collapse by attribute (team, application, site, schema, namespace) with aggregated edges and expand-in-place                                                 | Must     | No       |
| R6  | Nested containment (namespace > type; server > process; table > column) re-aggregating edge counts per level                                                           | Must     | No       |
| R7  | Lasso and modifier-click selection that writes an editable group or tag attribute                                                                                      | Must     | No       |
| R8  | Community detection proposed as editable groups, with hub exclusion and a size cap                                                                                     | Should   | Partly   |
| R9  | Cut size (count and weight of edges between groups) per pair, live as nodes move                                                                                       | Must     | No       |
| R10 | Filter and highlight by edge attributes (port, protocol, count, type, link position)                                                                                   | Must     | Partly   |
| R11 | Status overlays (health, test status, severity, license) with worst-of rollup into groups                                                                              | Must     | Partly   |
| R12 | Count of distinct transitive dependents and dependencies as a computed attribute                                                                                       | Must     | No       |
| R13 | Explain-path: all paths from roots to a target, deduplicated and highlighted                                                                                           | Must     | Partly   |
| R14 | Directed failure impact with redundancy and severity levels                                                                                                            | Should   | Partly   |
| R15 | Strongly connected components shown and collapsible as one unit; back-edges marked                                                                                     | Must     | Partly   |
| R16 | DSM matrix view synced with the node-link view (hierarchical rows, triangularize, click for path); also serves traceability matrices                                   | Should   | No       |
| R17 | Several edge layers over one node set (L1, L2, L3; calls versus deployment)                                                                                            | Should   | No       |
| R18 | Port or interface endpoints on edges, shown on hover and usable in filters                                                                                             | Should   | No       |
| R19 | Site and rack grouping, geographic placement, saved manual positions in named sets                                                                                     | Should   | Partly   |
| R20 | Time-sliced edges and "graph as of" or "over window" views                                                                                                             | Should   | Partly   |
| R21 | Unresolved endpoints (IP-only, unknown process) shown distinctly; missing edges treated as unknown                                                                     | Should   | No       |
| R22 | Import dbt manifest, CycloneDX, SPDX, OpenLineage, `npm ls --json`, migration CSVs, NetBox exports, Nx graph JSON                                                      | Must     | No       |
| R23 | Selector language (union, intersection, attribute, graph operators) with shareable links                                                                               | Must     | Partly   |
| R24 | Diff two versions of a graph (before/after a PR, live versus baseline or staging)                                                                                      | Should   | Partly   |
| R25 | Personalized and weighted PageRank, seeded from selected nodes, weights from an attribute                                                                              | Should   | Partly   |
| R26 | Progressive reveal of 10,000+ nodes; never crash on a large manifest or crawl                                                                                          | Must     | Partly   |
| R27 | Duplicate versions as distinct nodes groupable by package name                                                                                                         | Should   | No       |
| R28 | Export closures, groupings and cut edges as CSV; diagrams as SVG/PNG and draw.io                                                                                       | Must     | Partly   |
| R29 | Curated and discovered edges mixed, with the edge's source shown and filterable                                                                                        | Should   | No       |
| R30 | Embeddable element with API hooks so other products can host the view                                                                                                  | Must     | Partly   |
| R31 | Orthogonal, layered layout of nested boxes with side ports and typed connectors, regenerated from the model                                                            | Should   | Partly   |
| R32 | Import a crawler link export with cleanup options; read SysML v2 models through the Systems Modeling API                                                               | Should   | No       |
| R33 | Per-node metric compared across two graph versions (PageRank live versus staging), usable for color and sort                                                           | Should   | Partly   |

No existing designloom persona or workflow covers any of the personas or workflows in this document.

## 11. Sources

Sources are cited inline. Vendor marketing, vendor-commissioned surveys and vendor case studies are labeled as vendor material; claims without evidence say "no source found".
