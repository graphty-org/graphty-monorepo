# Cybersecurity Graph Work: Attack Paths, Threat-Intel Pivoting, Incident Response, Network, Cloud and Binary Graphs

## 1. Summary

Security practitioners are among the heaviest everyday users of graph software, but they rarely open a general-purpose
graph tool. Their graphs live inside security products: BloodHound for Active Directory and Entra ID attack paths,
Maltego, VirusTotal Graph and OpenCTI for threat-intelligence pivoting, EDR consoles (Microsoft Defender, Elastic,
SentinelOne, CrowdStrike) for process trees and incident graphs, Arkime and Graphistry for network traffic, cloud
posture platforms (Wiz, Microsoft Defender for Cloud) and KubeHound for cloud and Kubernetes attack paths, and
disassemblers (IDA, Ghidra, Binary Ninja, BinDiff) for control flow and call graphs. Most of these graphs are typed
and directed and answer "can X reach Y, and through what?" Two populations break the pattern: reverse engineers read
layered flowcharts whose nodes are blocks of code, and threat modelers and CTI analysts draw graphs by hand (data flow
diagrams, Attack Flow diagrams) rather than import them. The work splits into daily, time-boxed triage (alerts,
indicator pivots, binaries) and periodic, high-stakes audits and investigations (attack path reviews, incident scoping,
penetration tests). The existing Graphty persona (`cybersecurity-analyst`) and workflow (`W07` Threat Hunting) describe
a generic SIEM threat hunter and miss the dominant tools, data and operations described here.

## 2. Population

**Size.** ISC2 estimated the global cybersecurity workforce at about 5.5 million people in 2024 (5,468,173), with a
workforce gap of about 4.8 million [ISC2-2024]. No source found that counts how many of them use graph tools.

**Job titles and the graph work each does.**

| Population                                                  | Typical titles                                                   | Graph tool they touch                                                                           | How often                                                                            |
| ----------------------------------------------------------- | ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Offensive / red team                                        | Penetration tester, red team operator                            | BloodHound CE (SharpHound, AzureHound), Neo4j Browser, custom Cypher                            | Every internal engagement; daily during one                                          |
| Identity security / AD defenders                            | AD engineer, identity security engineer, "Tier 0" owner          | BloodHound Enterprise or CE, Defender for Identity, Defender XDR hunting graph                  | Continuous (BHE) or periodic audits                                                  |
| Cyber threat intelligence (CTI)                             | CTI analyst, threat researcher                                   | Maltego, VirusTotal Graph, OpenCTI, MISP, DomainTools Iris, Censys, Attack Flow Builder         | Daily to weekly; 52% of organizations had a dedicated CTI team in 2024 [SANS-CTI-24] |
| Malware analysis / reverse engineering                      | Malware analyst, reverse engineer, vulnerability researcher      | IDA (graph view, proximity view), Ghidra (Function Graph, call trees), Binary Ninja, BinDiff    | Every sample; graph views are open most of the working day [RE-PLAT]                 |
| SOC triage                                                  | SOC analyst tier 1-2, MDR analyst                                | EDR process trees and alert stories, incident graphs                                            | Many times per shift                                                                 |
| Incident response / DFIR                                    | Incident responder, DFIR consultant                              | Incident graph, LogonTracer, IRFlow Timeline, Graphistry, spreadsheets                          | Episodic; intense for days or weeks per incident                                     |
| Network security monitoring (NSM) and network / OT security | NSM analyst, network security engineer, ICS/OT security engineer | Arkime Connections, Zeek plus RITA, Graphistry, RedSeal, Nozomi/Claroty, GRASSMARLIN (archived) | Daily (NSM); periodic segmentation and OT asset reviews                              |
| Threat hunting / security data science                      | Threat hunter, detection engineer                                | Graphistry with Splunk or Databricks, KQL hunting graph                                         | Weekly; threat hunting was the top CTI use case (75%) in 2024 [SANS-CTI-24]          |
| Cloud and Kubernetes security                               | Cloud security engineer, CNAPP owner, platform security          | Wiz, Defender for Cloud attack paths, Cartography on Neo4j, KubeHound                           | Daily issue queue; periodic posture reviews                                          |
| Security architecture / threat modeling                     | Security architect, application security engineer                | Microsoft Threat Modeling Tool, OWASP Threat Dragon, pytm, Threagile, whiteboards               | Per design or major change; under half of those who do it, every release [SC-25]     |

**Skill profile.**

- Graph literacy is operational, not theoretical. Practitioners think in nodes, typed edges and paths ("MemberOf",
  "AdminTo", "resolves-to", "spawned", "calls"), rarely in centrality or community vocabulary. The statistic they use
  most is shortest path or hop count; the second is a choke-point or exposure measure.
- Coding ability is bimodal. Pentesters, hunters and reverse engineers write Cypher, KQL, SPL, Gremlin, Python or
  IDAPython; tier-1 SOC analysts mostly click. BloodHound ships prebuilt queries filterable by category ("shortest
  path", "dangerous privileges") so non-Cypher users can work [BH-CYPHER].
- CTI job postings name Maltego, Shodan, Censys, DomainTools, VirusTotal and MISP and ask for 2-5+ years with TCP/IP,
  DNS and HTTP [RF-JOB] [CTI-CAREER].

**Team context.** SOC escalates to IR; IR asks CTI to pivot on indicators and asks reverse engineers to unpack samples;
CTI feeds blocklists and Attack Flow diagrams back to the SOC and purple teams; red teams hand attack-path findings to
AD owners; posture teams hand "toxic combination" issues to infrastructure owners [WIZ-TOXIC]. The graph is often the
hand-off artifact.

## 3. Personas

### 3.1 Dana Okafor -- Internal penetration tester (offensive)

- **Role.** Senior consultant at a security services firm; runs internal network and AD assessments.
- **Tools.** SharpHound and AzureHound, BloodHound CE in Docker [BH-QUICK], Neo4j Browser for raw Cypher,
  hash-cracking tools, NetSPI-style path report generators [NETSPI].
- **Data.** One SharpHound zip per domain (users, groups, computers, ACLs, sessions, GPOs, trusts, ADCS); often several
  domains; sometimes MSSQL and SCCM data through OpenGraph extensions [NETSPI].
- **Goals.** Find the shortest believable path from a phished or cracked account to Domain Admins; prove every hop;
  write a finding the client can fix.
- **Frustrations.** "In a graph with twenty thousand users and hundreds of thousands of edges, the path you want
  exists, but finding it is another matter"; hundreds of near-duplicate paths must be grouped by hand; cracked-password
  lists need manual cross-referencing against group membership [NETSPI]. Large collections import slowly and break on
  non-ASCII names; one client environment in the same write-up had 95,369 user accounts [HELVIO].

### 3.2 Marcus Lindqvist -- Identity security engineer (defensive attack path management)

- **Role.** Owns AD and Entra ID hardening at a 30,000-employee company; former Windows administrator.
- **Tools.** BloodHound Enterprise (Attack Paths, Posture, Privilege Zones), ADUC and ADSI Edit, change tickets,
  Defender for Identity.
- **Data.** Continuous SharpHound and AzureHound collection; Tier Zero definitions; history of analysis runs.
- **Goals.** Drive exposure (share of principals with a path into Tier Zero) down by removing the choke points that
  sever the most paths; report progress to the CISO and auditors [SO-PILLAR2].
- **Frustrations.** Every fix must be checked for whether it breaks a business process before it is made [SO-PILLAR3];
  widening the Tier Zero definition (for example adding a help desk group) makes new findings appear, so counts can
  rise as visibility improves [BHE-START]; vendors publish detections for SharpHound's LDAP enumeration, so defensive
  collection must be coordinated with the SOC [SOPHOS-SH].

### 3.3 Aiko Tanaka -- Cyber threat intelligence analyst

- **Role.** CTI analyst on an in-house team; previously a SOC analyst.
- **Tools.** Maltego (VirusTotal, DomainTools, Shodan, MISP transforms), VirusTotal Graph, OpenCTI, MISP, Censys,
  Attack Flow Builder, spreadsheets for pivot logs.
- **Data.** Domains, IPs, hashes, URLs, X.509 certificates, passive DNS, WHOIS, sandbox reports, STIX 2.1 bundles.
- **Goals.** Turn one indicator into a defensible cluster of attacker infrastructure with confidence, and turn reports
  into detections, blocklists and attack flows.
- **Frustrations.** Expansions explode the graph with shared-hosting noise; OpenCTI warns expanding "can add many
  entities and relations that aren't useful" and rolls back only the last 10 expansions [OPENCTI]; Maltego's cost and
  learning curve [MALT-ALT]; private VirusTotal graphs need a premium license [VT-SEARCH].

### 3.4 Luis Ferreira -- SOC analyst and incident responder

- **Role.** Tier-2 analyst at an MDR provider, rotates into IR engagements.
- **Tools.** Defender XDR alert story and incident graph, Elastic visual event analyzer, SentinelOne Storyline, KQL,
  Splunk, LogonTracer or IRFlow Timeline for EVTX triage.
- **Data.** EDR process events, Windows Security events 4624/4625/4648/4672/4768/4769/4776, Sysmon, firewall logs.
- **Goals.** Classify each alert as true or false; if true, scope, contain and write the incident timeline.
- **Frustrations.** Alert volume: a 2026 survey of 250 practitioners reports a median of about 100 alerts a day, with
  27% of organizations receiving 500 or more [SOC-STATS]; a process tree "shows what spawned what, but not whether
  those relationships matter more broadly" [EDR-TRIAGE]; one RDP session produces both a type 3 and a type 10 logon
  that naive graphs double-count [DFIR-LM].

### 3.5 Priya Raman -- Malware reverse engineer

- **Role.** Malware analyst on a vendor research team; receives samples from IR and CTI.
- **Tools.** IDA with the decompiler, Ghidra for its free decompiler and multi-binary projects, BinDiff, a sandbox,
  IDAPython scripts [RE-PLAT].
- **Data.** One binary (often packed), its disassembly database, imports, strings; a second version of the same family
  for diffing.
- **Goals.** Explain what the sample does (persistence, C2 protocol, injection, evasion), extract indicators for CTI and
  detections, and tell whether a new sample is a variant of a known one.
- **Frustrations.** Ghidra's call graph starts one level of callers and callees deep, the interesting API sequence is
  "buried several levels of calls deep", and expanded graphs tangle until nodes are dragged apart, so some analysts
  prefer the textual call tree [SANS-GHIDRA].

### 3.6 Tomasz Novak -- Network security monitoring analyst

- **Role.** NSM analyst in a SOC with sensors at the network edge and in the data center; also supports the OT team
  at a manufacturing site.
- **Tools.** Zeek, Arkime (sessions, Connections, PCAP), RITA for beacon scoring, Graphistry for ad hoc hunts, a
  passive OT monitor that draws the plant network by zone.
- **Data.** Zeek conn, dns, http and ssl logs; Arkime session metadata and PCAP; firewall logs.
- **Goals.** Find who talks to whom that should not (scanning, beaconing, new external peers, segment violations) and
  pivot from a suspicious pair to the raw sessions.
- **Frustrations.** Graph views show only the top sessions unless the query size is raised, and larger queries are
  slow [MALCOLM-ARKIME]; NAT and DHCP make IP addresses unstable identities [ZEEK-CONN].

### 3.7 Nadia Haddad -- Application security architect (threat modeling)

- **Role.** Security architect in a product security team; runs threat modeling sessions with a development team
  when a new system is designed or an existing one changes. Facilitating, not owning, the model: the cheat sheet asks
  that it be reviewed by all stakeholders, not only security [OWASP-TM]. Application security engineers (Designloom
  `software-supply-chain-security-engineer`) join the sessions and triage threats; Nadia owns the model.
- **Tools.** Microsoft Threat Modeling Tool (design view, analysis view, HTML report) [MS-TMT-FEAT]; OWASP Threat
  Dragon, a free web or desktop tool supporting STRIDE, LINDDUN, CIA, DIE and PLOT4ai [THREAT-DRAGON-HOME]; models as
  code in pytm or Threagile for teams that keep the model beside the source [PYTM] [THREAGILE]; a whiteboard or a
  general diagramming tool to start [OWASP-TM].
- **Data.** A hand-drawn or code-declared data flow diagram: 10 to 100 typed elements (process, external interactor,
  data store, data flow, trust boundary) with per-element properties such as protocol, encrypted, public network or
  stores credentials [MS-TMT-FEAT] [TD-THREATS]. No source gives a typical element count; the range is an estimate.
- **Goals.** Answer the four questions -- what are we working on, what can go wrong, what are we going to do about
  it, did we do a good enough job -- with the diagram as the usual answer to the first [4Q]; find every flow that
  crosses a trust boundary; leave a triaged threat list the team will act on.
- **Frustrations.** Scope is hard to set, architecture documentation is often missing, the practice is hard to scale,
  and follow-up on results is weak [SOUPS24-TM]; practitioners keep going back to the diagram while validating threats
  [ESEM26-TM]; models go stale as code changes, which is why pytm ships a staleness check [PYTM]; generated threat
  lists are long and every item needs a status [MS-TMT-FEAT] [TD-THREATS].

## 4. Use cases ranked by frequency and stakes

Frequency: D = many times per day, W = weekly, P = periodic (monthly, quarterly, per engagement or design),
E = episodic (per incident).

| Rank | Question answered with a graph                                                                      | Who                 | Freq.           | Stakes                                                   |
| ---- | --------------------------------------------------------------------------------------------------- | ------------------- | --------------- | -------------------------------------------------------- |
| 1    | Is this EDR alert malicious? What launched this process and what did it do next? (process tree)     | SOC                 | D, high volume  | Medium per alert; high in aggregate                      |
| 2    | What infrastructure is related to this indicator? (domain -> IP -> certificate -> more domains)     | CTI, SOC            | D-W             | Medium; false clusters cause wrong blocks or attribution |
| 3    | Which entities and alerts belong to this incident, and how did it spread over time?                 | SOC, IR             | D               | High                                                     |
| 4    | What does this function do, and which functions lead to this suspicious API call? (CFG, call graph) | Reverse engineers   | D               | Medium to high (missed capability)                       |
| 5    | Who is talking to whom, and which pairs are new, noisy, scanning or beaconing? (flow graph)         | NSM, hunters        | D-W             | Medium to high                                           |
| 6    | Which accounts logged on to which hosts, in what order, with which logon type?                      | IR, hunters         | E               | Very high (breach scoping)                               |
| 7    | From what I own, what is the shortest path to Domain Admins / Tier Zero?                            | Pentesters          | P               | High for the client                                      |
| 8    | Which choke points cut the most paths into Tier Zero, and did removing them work?                   | Identity security   | P or continuous | Very high                                                |
| 9    | Which cloud or Kubernetes resources chain into a path from the internet to sensitive data?          | Cloud security      | D (issue queue) | High                                                     |
| 10   | If this node is compromised, what critical assets can the attacker reach next? (blast radius)       | IR, CISO reporting  | E               | Very high                                                |
| 11   | What did the adversary do, in order, according to this report? (hand-built attack flow)             | CTI, purple team    | W               | Medium                                                   |
| 12   | What changed between two versions of this binary? (graph diff)                                      | Reverse engineers   | W               | Medium                                                   |
| 13   | Where does untrusted data cross a trust boundary in this design? (data flow diagram)                | Security architects | P               | Medium to high                                           |

The daily items (process trees, indicator pivots, function graphs) are small, local, expand-on-demand graphs; the
periodic items (attack paths, logon graphs, posture) are large, whole-environment graphs queried for paths.

## 5. Step-by-step workflows

### 5.1 Active Directory attack path analysis in BloodHound (red and blue)

Sources: [BH-QUICK] [BH-SEARCH] [BH-CONTROLS] [BH-CYPHER] [SH-FLAGS] [SANS-BH] [SO-PILLAR3] [NETSPI].

1. **Stand up BloodHound.** Install with the BloodHound CLI, which pulls container images and writes a
   docker-compose file; log in and reset the generated admin password [BH-QUICK].
2. **Collect.** Run SharpHound from a domain-joined host [SANS-BH]. `--CollectionMethods Default` covers group
   membership, trusts, ACLs (including ADCS objects), OU structure, GPO links, local groups and sessions; `All` adds
   the rest; `DCOnly` talks only to domain controllers and skips session enumeration; `Session --Loop` repeats session
   collection (default 2 hours) because sessions are transient [SH-FLAGS]. Output is a zip of JSON files, optionally
   password-protected [SH-FLAGS]. Runs take seconds in small environments and "up to tens of minutes" in large ones
   [SANS-BH]. For Entra ID, AzureHound queries Microsoft Graph and Azure REST APIs [U42-AZH].
3. **Ingest.** Upload the zip through File Ingest or the upload API; CE accepts zip or JSON "with no size limit",
   though browser uploads of large files can fail [BH-QUICK]. Large collections are slow; practitioners split files
   or use third-party importers [HELVIO].
4. **Mark state.** Right-click a node -> "Add to Owned" or "Add to Tier Zero"; both trigger re-analysis [BH-SEARCH].
5. **Run saved queries.** Explore -> Cypher -> Saved Queries, filterable by platform (AD, Azure), category and source
   (prebuilt, personal, shared); shortest paths to Domain Admins is "one of the most important queries" [BH-CYPHER].
6. **Pathfind.** Start node, up to three destination nodes (shortest path between each consecutive pair, combined),
   reorder, "Reverse path", and an edge type filter that drops edge kinds the tester cannot or will not abuse
   [BH-SEARCH].
7. **Write custom Cypher** when saved queries do not fit, for example owned-to-high-value paths:
   `MATCH p=shortestPath((g {owned:true})-[*1..]->(n {highvalue:true})) WHERE g<>n RETURN p` (community query, legacy
   property names). Queries are saved, shared, exported and imported as JSON [BH-CYPHER].
8. **Read the result.** Default layout is left-to-right ranked layers ("Sequential" in CE, "Stacked" in Enterprise);
   force-directed "Standard" and "Organic" are alternatives; results with no edges open as a Table [BH-CONTROLS].
   Clicking a node dims everything except paths through it; clicking an edge opens General, Abuse (step-by-step) and
   OPSEC (detection risk) panels; node panel accordions (Members, Member Of, Local Admin Privileges, Inbound and
   Outbound Object Control) each expand into the graph [BH-SEARCH].
9. **Decide (red).** Prefer short paths and quietly abusable edges; severity depends on who the starting principal is
   [NETSPI]; group duplicate paths into one finding [NETSPI].
10. **Decide (blue).** Target choke points ranked by exposure (share of principals whose paths run through them)
    rather than individual misconfigurations [SO-PILLAR2] [SO-PILLAR3].
11. **Check safety and remediate.** Before removing a privilege, determine whether the change breaks a business
    process; follow the step-by-step ADUC remediation; the expected outcome must be verifiable [SO-PILLAR3].
12. **Verify.** Re-collect, re-ingest and re-run the same queries; the path must be gone. BHE shows resolved paths and
    tracks Tier Zero exposure over time [SO-PILLAR3]; the Posture page compares analysis runs [BH-POSTURE].
13. **Hand off.** Export JSON or (Enterprise) PNG/JPG/SVG images after "Hide Labels" [BH-CONTROLS]; per-path findings
    with reproduction commands [NETSPI].

### 5.2 Enterprise attack path management (BloodHound Enterprise, Defender XDR)

Sources: [BH-GRAPHVIEW] [BH-POSTURE] [BH-CAMPAIGN] [SO-PILLAR2] [MS-HUNTGRAPH].

1. Collection runs continuously; analysis recomputes attack paths after each run.
2. Attack Paths page: choose Environment, Zone (default Tier Zero) and Risk filter; a "Choke Point" graph aggregates
   exposed principals per finding; findings list severity, exposure, impact and remediation [BH-GRAPHVIEW].
3. Prioritize findings with high exposure and high impact. A SpecterOps example: one choke point let 93% of users reach
   Tier Zero, others 41% and 10% [SO-PILLAR2]. Vendor claim: one choke point severs more than 17,000 paths on average
   (methodology not published) [BHE-SEARCH].
4. Time-boxed campaigns: define a Privilege Zone around assets in scope, review findings, assign owners, track
   reduction [BH-CAMPAIGN]. Posture page: counts and changes per attack path type across runs [BH-POSTURE].
5. Microsoft's equivalent, the Defender XDR hunting graph, offers predefined scenarios ("Paths to domain admins",
   "Kerberoast paths to critical assets", "Choke points to SQL data stores", critical Kubernetes clusters), filters on
   source and target node properties, 19 edge types and direction, and "Show only the shortest paths" [MS-HUNTGRAPH].

### 5.3 Threat-intelligence pivoting from one indicator

Sources: [MALT-START] [MALT-SLIDER] [MALT-SELECT] [MALT-EXPORT] [VT-OVERVIEW] [VT-NODES] [OPENCTI] [DT-IRIS]
[CENSYS-CS] [CTI-MANUAL].

1. **Record the seed** in defanged form with source and date. (The field manual's case uses "generic,
   non-operational example values"; treat its steps as illustrative [CTI-MANUAL].)
2. **Start a graph.** Maltego: drag a Domain entity from the palette [MALT-START]; VirusTotal Graph: add a file, URL,
   domain or IP node; OpenCTI: "Add an entity to this investigation" [OPENCTI].
3. **Expand.** Maltego: run transforms (domain to IP, certificate, hashes); results are capped by the Transform Result
   Limit slider (Small, Balanced, Large) [MALT-SLIDER]. VirusTotal: double-click or "Full expansion" across 30+
   relationship types [VT-OVERVIEW] [VT-NODES]; the API caps each expansion at 40 nodes and spends quota [VT-SEARCH].
   DomainTools Iris: right-click a value such as a certificate SHA-1 in the SSL Profile panel and pivot from it
   [DT-IRIS]; Microsoft's Iris connector documents up to 500 domains per certificate-hash pivot [DT-CONN].
4. **A real published pivot.** Censys researchers started from confirmed Cobalt Strike hosts, pivoted on a
   certificate subject DN (4 hosts, one confirmed C2), then on DNs from public Malleable C2 profiles (68 hosts for one),
   a structural rule (subject DN equal to issuer DN with fixed field order, 92 certificates), certificate history,
   shared /24 subnets and ASNs, and a reused RDP certificate seen on 53 other hosts. Matches stayed "suspects" until
   validated (parsed beacon config, failed retrieval, or unknown protocol); the output was a deduplicated, defanged IP
   feed [CENSYS-CS].
5. **Judge each edge.** One IP hosting many unrelated domains is shared-hosting noise; a shared value is "a lead, not
   confirmation" [MISP-STORIES]. VirusTotal's "Find commonalities" lists shared attributes across a selection
   [VT-OVERVIEW].
6. **Prune.** Maltego: bookmark colors, then "Select By" bookmark or type and bulk delete [MALT-SELECT]; VirusTotal:
   delete, "Highlight" [VT-NODES]; OpenCTI: roll back up to 10 expansions [OPENCTI].
7. **Save, share, report.** Maltego: Save As with optional encryption [MALT-START], PDF reports of all or bookmarked
   entities [MALT-EXPORT]; VirusTotal: public or organization-private graphs [VT-OVERVIEW]; OpenCTI: relationships
   persist into the knowledge base and export as a STIX report bundle, PDF or image [OPENCTI]. Handoff: blocklists
   and hunt queries to the SOC; STIX to partners.

### 5.4 SOC alert triage with an EDR process tree

Sources: [MDE-ALERT] [ELASTIC-ANALYZER] [MS-INCIDENT] [S1-SEARCH] [NIST-61R3].

NIST SP 800-61r3 (April 2025) frames detection and analysis inside the CSF 2.0 functions rather than prescribing
triage steps [NIST-61R3]; the steps below come from vendor product documentation.

1. **Open the alert** from the queue. Defender's alert page shows the title, affected assets, a details pane and the
   alert story, a tree of the processes and entities before and after the trigger, which may include other alerts from
   the same execution tree [MDE-ALERT].
2. **Walk the tree.** Select an entity; expand any non-alert entity card; the details pane switches to that entity
   with history and actions. The alert timeline offers "a condensed chronological view" next to the process tree
   [MDE-ALERT]. In Elastic, "Analyze event" opens a graph where each node is a process, with event-category pills
   (file, registry, network), time elapsed between processes, and alerts listed oldest to newest; the time range
   defaults to the alert table's range [ELASTIC-ANALYZER]. SentinelOne groups related events under a Storyline ID
   updated as telemetry arrives [S1-SEARCH].
3. **Act** from the details pane (isolate a device, quarantine a file) [MDE-ALERT].
4. **Classify.** Resolve the alert as True alert (with a determination) or False alert; for a false alert from a
   line-of-business application, create a suppression rule [MDE-ALERT].
5. **Move to the incident graph** when it is part of something larger: alerts, users, devices and mailboxes; "play
   the alerts and the nodes on the graph as they occurred over time"; filter by severity and source; "Go hunt" from a
   node; "View blast radius" for the eight top-rated paths to critical targets (at most seven hops) [MS-INCIDENT].

Timeboxes such as "decide by minute 35" appear in individual blog posts, not in vendor or NIST guidance; no source
found that they are common practice.

### 5.5 Host-to-host logon graph during incident response

Sources: [JPCERT-LT] [MS-4624] [IRFLOW-LM] [DFIR-LM].

1. **Collect** Security EVTX from domain controllers and key hosts (audit policy must log 4768/4769/4776) [JPCERT-LT].
2. **Load.** LogonTracer uploads EVTX into Neo4j; accounts (red = SYSTEM-privilege, blue = user) and hosts (green)
   become nodes, logon events edges [JPCERT-LT]. IRFlow Timeline reads EvtxECmd CSVs; edges are source -> target with
   counts, first and last seen, users and logon type [IRFLOW-LM].
3. **Encode logon type** (2 interactive, 3 network, 4 batch, 5 service, 7 unlock, 8 network cleartext, 9 new
   credentials, 10 RDP, 11 cached) [MS-4624]; IRFlow colors edges by type [IRFLOW-LM]. Deduplicate the type 3 that
   precedes an RDP type 10 [DFIR-LM].
4. **Rank.** LogonTracer ranks accounts and hosts by PageRank and flags bursts with ChangeFinder [JPCERT-LT].
5. **Order in time.** Trace chains A -> B -> C with first and last seen per hop; jump to raw events in a +/-5 minute
   window [IRFLOW-LM]; confirm each hop with execution evidence such as Sysmon event 1 [DFIR-LM].
6. **Hand off** a chronological hop table (time, source, target, account, logon type, evidence).

### 5.6 Network flow graph hunting (Zeek, Arkime, Graphistry) and network reachability maps

Sources: [MALCOLM-ARKIME] [ZEEK-CONN] [RITA] [GRANEF] [PYG-SPLUNK] [GRAPHISTRY-TEMPLATES] [AFTERGLOW] [REDSEAL]
[NOZOMI] [GRASSMARLIN].

1. **Pick a time window and query.** In Arkime, filter sessions with an expression; raise "query size" for a
   complete picture at the cost of speed, because smaller queries show only the top sessions [MALCOLM-ARKIME].
2. **Open Connections.** Arkime draws a force-directed graph. Choose source and destination fields: defaults are
   Src IP and Dst IP:Dst Port, but any pair works (Src IP to Protocols, originating to responding network segment,
   GeoIP cities, MAC vendors) [MALCOLM-ARKIME]. Choosing segment fields collapses addresses into subnets.
3. **Weight and threshold.** Set the link weight method and a minimum connections threshold to drop rare or noisy
   pairs; node color marks source, destination or both [MALCOLM-ARKIME].
4. **Read patterns.** Fan-out from one source to many destinations or ports suggests scanning (a classic link-graph
   pattern [AFTERGLOW]); regular, repeated connections between one pair suggest beaconing, scored outside the graph
   by tools such as RITA over Zeek logs [RITA].
5. **Pivot.** Clicking a node or link adds it to the query filter; the Sessions view then lists the sessions and
   exports PCAP [MALCOLM-ARKIME]. Zeek's `uid` links a conn.log row to its dns, http and ssl records [ZEEK-CONN].
6. **Ad hoc variants.** Granef loads Zeek logs into a graph database where analysts run predefined queries or expand
   a node's neighbors [GRANEF]; Graphistry turns an SPL result into a hypergraph (a 5,035-event demo gave 170 entities
   and 15,105 links) [PYG-SPLUNK] and can be wired into Splunk as a click-through workflow action
   [GRAPHISTRY-TEMPLATES]; older AfterGlow pipelines turned firewall CSV into Graphviz link graphs [AFTERGLOW].

**Config-derived reachability and OT topology.** Network security engineers also model reachability without traffic:
RedSeal builds a model from router, switch, firewall and load-balancer configurations plus cloud APIs and scanner
data, then answers whether data can move from one point to another and how attackers could move laterally [REDSEAL].
In OT plants, passive monitors listen on a SPAN port and draw every IP and MAC device, nested serial devices behind
gateways, and links, grouped by zone and Purdue level with protocols between zones [NOZOMI]; the NSA's GRASSMARLIN did
the same for ICS/SCADA networks and was archived in 2023 [GRASSMARLIN].

### 5.7 Cloud and Kubernetes attack paths

Sources: [MDC-MANAGE] [MDC-ATTACKPATH] [MDC-EXPLORER] [WIZ-TOXIC] [KUBEHOUND] [CARTOGRAPHY].

1. **Open the queue.** Defender portal: Exposure Management -> Attack surface -> Attack paths. The Overview tab shows
   paths over time, top 5 choke points, scenarios, targets and entry points; the list filters by risk level, asset
   type, remediation status and time frame [MDC-MANAGE]. Wiz raises a critical Issue for a toxic combination
   (internet exposure + vulnerability + privileged identity + sensitive data) [WIZ-TOXIC].
2. **Read the evidence graph.** Selecting a path opens the Attack Path Map, marking entry points, vulnerable nodes,
   target assets and choke points [MDC-MANAGE].
3. **Inspect nodes.** Each node shows ATT&CK tactics and techniques, risk factors and recommendations; Insight shows
   why it is on the path [MDC-MANAGE]. Limited permissions hide parts of the path [MDC-MANAGE].
4. **Decide which link to break.** The Remediation tab separates recommendations that fix the path from additional
   ones that only lower risk [MDC-MANAGE].
5. **Assign and remediate.** Security triages and assigns; infrastructure owners fix [WIZ-TOXIC].
6. **Verify.** A resolved path can take up to 24 hours to leave the list [MDC-MANAGE]. Ad hoc questions go to cloud
   security explorer ("internet-exposed VMs with high-severity vulnerabilities and access to sensitive storage")
   [MDC-EXPLORER].

**Open-source and Kubernetes variant.** Cartography loads AWS, GCP, Azure, Kubernetes, Okta and Entra into Neo4j for
Cypher queries and rule packs [CARTOGRAPHY]. Datadog's KubeHound reads the Kubernetes API server (offline mode
available), stages objects in MongoDB, computes attack edges such as `CE_NSENTER` (container escape), `POD_EXEC`,
`TOKEN_BRUTEFORCE` and `IDENTITY_ASSUME`, and writes the graph to JanusGraph, queried in Gremlin or a DSL
(`criticalPaths()`, `minHopsToCritical()`) and viewed in a Gremlin client such as G.V(). Red teams start from
externally exposed endpoints; blue teams find frequent path patterns and simulate removing one attack type (blocking
`TOKEN_BRUTEFORCE` removed about 88% of critical paths from one public service), then track the share of external
services with a path to a critical asset over time [KUBEHOUND].

### 5.8 Reverse engineering a malware sample (control flow and call graphs)

Sources: [RE-PLAT] [VARONIS-GHIDRA] [IDA-GRAPH] [IDA-PROX] [SANS-GHIDRA] [BINDIFF] [IDA-GDL].

1. **Load and auto-analyze.** Import the sample into an isolated lab, let auto-analysis finish before starting
   [RE-PLAT] [VARONIS-GHIDRA].
2. **Find a starting point.** Scan imports (network, process, persistence, crypto, file APIs) and strings (URLs,
   registry keys, mutexes), then follow cross-references; reading from the entry point line by line is
   "very time-consuming" [RE-PLAT] [VARONIS-GHIDRA].
3. **Open the function graph.** In IDA, Space toggles graph and text; Ghidra opens a Function Graph window [RE-PLAT].
   Each node is a basic block of code; edges are blue (normal), green (taken jump) and red (not taken); upward edges
   are loops [IDA-GRAPH] [RE-PLAT]. Analysts drag nodes (IDA saves the custom layout), collapse groups of blocks into a
   synthetic node with their own text, and use an overview window [IDA-GRAPH].
4. **Rename and comment** functions and variables as behavior becomes clear; check decompiler output against the
   assembly [RE-PLAT].
5. **Move to the call graph.** IDA's proximity view shows the function, its callers, callees and data references
   (strings, globals) by name, with a hover preview of the code [IDA-PROX]. Ghidra's call graph starts one level deep;
   "Show Outgoing Level Edges" adds a level at a time to find API sequences such as injection [SANS-GHIDRA].
6. **Compare versions.** BinDiff lists matched functions with similarity and confidence (sorted by similarity, green
   to red), plus unmatched functions on each side; a function's flow graphs open side by side with blocks colored
   identical (green), changed (yellow) or missing (red) [BINDIFF].
7. **Export.** IDA writes the current function's flow chart or the call graph as GDL, and scripts can emit DOT
   [IDA-GDL]; indicators and behavior go to CTI and detection engineering.

**Scope note.** Reverse engineers work inside disassemblers whose graph views are tied to the database, and no source
found shows them moving graph work to an outside tool. Their needs (layered flowcharts with ordered branch edges,
nodes holding code text, one-level expansion, graph diff) matter to Graphty as general layout and node-content
capabilities and for exported graphs in reports and teaching, so they appear as should-haves in section 10.

### 5.9 Hand-building an Attack Flow from a threat report

Sources: [AF-BUILDER] [AF-BEST] [AF-LANG] [AF-2026].

1. **Choose a credible technical source**; public-corpus flows need at least one in metadata [AF-BEST].
2. **Set flow properties**: name, description, author, external references [AF-BUILDER].
3. **Order events and map techniques.** Create actions (right-click -> Create -> Attack Flow -> Action) with name,
   ATT&CK technique ID and a description of what this adversary did, not the technique name [AF-BUILDER] [AF-BEST].
   Start with Reconnaissance, Resource Development or Initial Access (or a condition saying it is unknown), join
   alternative entry vectors with an OR operator, end with Impact [AF-BEST]. Assets, conditions and operators are the
   other node types [AF-LANG].
4. **Set confidence** per object: STIX 0-100 mapped to Speculation, Very Doubtful, Doubtful, Even Odds, Probable,
   Very Probable, Certainty [AF-LANG].
5. **Connect and validate.** Drag arrows between anchors; a validation pane flags missing required fields [AF-BUILDER].
6. **Save and export.** Save as .afb for editing, PNG of all or a selection, or "Publish Attack Flow" as STIX JSON;
   there is no autosave [AF-BUILDER]. The 2026 release adds drafting from a PDF or URL, technique suggestions,
   mitigations and detections, timeline and matrix views, and TLP banners on exports [AF-2026].

### 5.10 Threat modeling a system design (security architects; Nadia, section 3.7)

Sources: [OWASP-TM] [MS-TMT] [MS-TMT-FEAT] [THREAT-DRAGON] [TD-THREATS] [PYTM] [THREAGILE] [4Q] [TMC-24] [SC-25]
[SOUPS24-TM].

**Cadence.** Early in design, then maintained alongside the system as it changes [OWASP-TM]. In a 2025 vendor survey,
fewer than half of the companies that threat model do it for every application release [SC-25].

**Method.** STRIDE dominates: 88% of respondents to the 2024-2025 Threat Modeling Connect survey (60+ organizations)
named it as part of their strategy, and 37% of organizations cited diagrams as a main source of information for
identifying threats [TMC-24]. The diagram answers "what are we working on?" [4Q].

1. **Draw the diagram** (30-60 minutes; estimate, no source). Place stencils -- process, external interactor, data
   store, data flow, trust boundary -- with child types such as an HTTP versus HTTPS flow [MS-TMT-FEAT]; or declare
   the same elements in Python (pytm) or YAML (Threagile) and generate the diagram [PYTM] [THREAGILE].
2. **Set properties.** Name, out of scope with a reason [MS-TMT-FEAT]; protocol, encrypted, public network on flows,
   stores credentials on stores [TD-THREATS].
3. **Generate threats.** Rules read element properties and the graph around them: pytm conditions use helpers such
   as `crosses`, `enters`, `exits` and `inside` a boundary [PYTM]; Threagile ships about 40 built-in risk rules
   [THREAGILE]; Threat Dragon suggests threats by type (STRIDE per element) or by context from properties
   [TD-THREATS]. The tool flags flows left unconnected [MS-TMT-FEAT].
4. **Triage.** Select a threat and the tool highlights its interaction on the diagram; set priority, mark read, fill
   justification [MS-TMT-FEAT]; status Open, N/A or a treatment (mitigated, accepted, transferred, avoided,
   eliminated) and severity TBD to Critical [TD-THREATS]. pytm can color elements by risk [PYTM].
5. **Decompose goals** (optional). Attack trees break an attacker's goal into alternative paths [OWASP-TM].
6. **Report and keep current.** HTML report with diagrams and per-element threats [MS-TMT-FEAT]; pytm reports and
   checks how stale the model is relative to the code [PYTM]. Follow-up on results is a common weakness [SOUPS24-TM].

The graph is small and drawn or declared by hand, but the core question -- which directed flows cross which grouped
boundaries, and which elements carry open threats -- is a query over typed nodes, edges and groups. It is kept in
scope with should-have requirements (section 10, items 23 and 28).

## 6. Data

| Source                                   | Format                                                                                     | Typical size                                                                                                                                                                              | Graph shape                                                                                                        | Identifier issues                                                             |
| ---------------------------------------- | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| SharpHound                               | Zip of JSON per object type [SH-FLAGS]                                                     | 20,000 users and hundreds of thousands of edges in one pentest [NETSPI]; 95,369 users in another client [HELVIO]; no source found for the largest enterprise collections                  | Directed, typed multi-edges (MemberOf, AdminTo, HasSession, GenericAll, WriteDacl, DCSync...); heterogeneous nodes | SIDs or GUIDs; `USER@DOMAIN.LOCAL`; format changes need re-collection [BH-OG] |
| AzureHound                               | JSON [U42-AZH]                                                                             | No source found                                                                                                                                                                           | Typed edges (AZResetPassword, AZOwns...); SyncedToEntraUser links AD and Entra [BH-AZ]                             | GUIDs; hybrid duplicates                                                      |
| BloodHound OpenGraph                     | JSON with custom kinds [BH-OG]                                                             | Varies                                                                                                                                                                                    | Generic typed graph                                                                                                | IDs with ":" break search [BH-SEARCH]                                         |
| Windows auth, process, flow and DNS logs | EVTX, CSV                                                                                  | LANL benchmark: 1,648,275,307 events over 58 days, 12,425 users, 17,684 computers, about 12 GB compressed (auth 7.2 GB, process 2.2 GB, flows 1.1 GB, DNS 177 MB, red team 4.8 KB) [LANL] | Bipartite account-host or host-host temporal multi-edges; logon type, auth package [MS-4624]                       | Workstation name or IP missing by protocol [MS-4624]                          |
| EDR and provenance telemetry             | Vendor schemas (Elastic `process.entity_id`, Defender DeviceProcessEvents)                 | DARPA Transparent Computing graphs: 0.26M-1.3M nodes and 0.8M-6.0M edges (Engagement 3), up to 8.0M nodes and 69.3M edges (Engagement 5) [DARPA-TC]                                       | Process tree plus links to files, registry, network; time-ordered                                                  | PID reuse; vendors mint process entity IDs                                    |
| Zeek conn.log, Arkime sessions           | TSV or JSON; Arkime in OpenSearch                                                          | Same order as LANL flows; no single source                                                                                                                                                | Directed temporal multigraph IP:port -> IP:port with bytes, duration, state; `uid` joins dns/http/ssl [ZEEK-CONN]  | NAT and DHCP make IP unstable                                                 |
| STIX 2.1 / MISP                          | JSON                                                                                       | Tens to thousands of objects per bundle or event                                                                                                                                          | Typed SROs (indicates, uses, resolves-to); MISP correlations between events [STIX21] [MISP-STORIES]                | UUIDv5 for SCOs; cross-producer duplicates                                    |
| Attack Flow                              | STIX 2.1 JSON with attack-flow, action, asset, condition, operator objects; .afb [AF-LANG] | Public corpus flows have 10+ actions [AF-BEST]                                                                                                                                            | Small directed acyclic graph with AND/OR operators                                                                 | STIX IDs                                                                      |
| Cloud security graph                     | Vendor internal; Cartography in Neo4j                                                      | No source found                                                                                                                                                                           | Typed directed (has permissions to, can authenticate as, routes traffic to) [MS-HUNTGRAPH]                         | ARNs, resource IDs                                                            |
| KubeHound                                | JanusGraph (Gremlin)                                                                       | 1,982 containers gave 66,984 critical paths (771 after dedup); a 100,000-container cluster collects in under 5 minutes and builds in under 30 [KUBEHOUND]                                 | Typed attack edges between containers, pods, nodes, identities, volumes, endpoints                                 | Kubernetes object names per namespace                                         |
| Disassembly graphs                       | IDA database; GDL or DOT export [IDA-GDL]; JSON from scripts                               | One function: tens to hundreds of blocks (no source found for typical counts)                                                                                                             | CFG: layered, ordered branch edges, loops; call graph: functions plus data references [IDA-GRAPH] [IDA-PROX]       | Addresses; auto names until renamed                                           |
| SIEM extracts                            | CSV / dataframes                                                                           | Thousands to millions of rows                                                                                                                                                             | Event table turned into hypergraph [PYG-SPLUNK]                                                                    | Field names differ per source                                                 |

**Recurring properties.** Directed and typed always; multi-edges common; temporal except AD configuration and code;
hierarchical for process trees, OU containment and network address blocks; layered with back edges for control flow.
Raw event volumes reach billions of rows [LANL], so they are aggregated (host to host, account to host, subnet to
subnet) before display, with drill-down to raw events, as Arkime's threshold-plus-session pivot does [MALCOLM-ARKIME].

**Sensitivity.** AD collections are a map for attackers (threat actors use AzureHound themselves [U42-AZH]);
SharpHound supports zip passwords [SH-FLAGS]; Microsoft scopes blast-radius graphs to the viewer's RBAC
[MS-INCIDENT]; the Attack Flow Builder offers local Docker hosting because the online version is reached over the
internet [AF-BUILDER]. Pentest client data usually cannot leave the engagement environment.

## 7. Analysis methods

- **Shortest paths with edge-type filtering and direction reversal** -- the core method in BloodHound, the Defender
  hunting graph and cloud attack paths [BH-SEARCH] [MS-HUNTGRAPH]; bounded (Defender blast radius: 7 hops max)
  [MS-INCIDENT]; minimum hops to critical in KubeHound [KUBEHOUND].
- **Reachability counts as exposure** -- share of principals or services with any path into a zone [SO-PILLAR2]
  [KUBEHOUND].
- **Choke points** -- "nodes that appear in the highest number of paths" to a target set [MS-HUNTGRAPH]; what-if
  removal of one edge type and recount [KUBEHOUND].
- **Path grouping** -- collapse principals reaching the same target through the same chain [NETSPI]; KubeHound path
  frequency patterns [KUBEHOUND].
- **PageRank and ChangeFinder** on logon graphs [JPCERT-LT]; time-ordered chain tracing [IRFLOW-LM].
- **Aggregation and thresholds** -- link weights, minimum connection counts, field choice that collapses addresses
  to segments [MALCOLM-ARKIME]; beacon scoring per pair [RITA].
- **Commonality analysis** across selected indicators [VT-OVERVIEW]; hypergraph projection of event tables
  [PYG-SPLUNK].
- **Graph matching** -- function similarity and confidence across two binaries [BINDIFF].
- **Validation habits.** Corroborate edges with a second source [MISP-STORIES]; confirm a logon hop with execution
  evidence [DFIR-LM]; validate structural infrastructure matches before publishing [CENSYS-CS]; re-collect after
  remediation [SO-PILLAR3]; vendor graphs show "possible, not guaranteed" paths [MS-INCIDENT].

No source found of practitioners running generic Louvain or global betweenness on security graphs as a routine step;
centrality appears only in target-scoped forms.

## 8. Outputs and collaboration

- **Pentest reports:** per-path findings with images, reproduction commands, severity tied to the starting principal
  [NETSPI].
- **Posture trends** for leadership [BH-POSTURE] [BH-CAMPAIGN]; KubeHound metrics over time [KUBEHOUND].
- **CTI products:** accepted clusters, defanged IP feeds [CENSYS-CS], STIX bundles [OPENCTI]; reporting as a
  dissemination method rose from 62% (2022) to 74% (2024) [SANS-CTI-24].
- **Attack Flow diagrams** as STIX JSON and PNG, with TLP banners [AF-BUILDER] [AF-2026].
- **Incident timelines** and the Defender Activities log of every action on an incident [MS-INCIDENT].
- **Reverse-engineering reports** with annotated flow graphs and indicators [RE-PLAT].
- **Threat model reports** with per-element threats [MS-TMT].
- **Shared saved queries and templates** [BH-CYPHER] [GRAPHISTRY-TEMPLATES]; images with labels hidden [BH-CONTROLS].

## 9. Tools landscape and pain points

| Tool                                       | Loved for                                                                                        | Fails them                                                                                                               |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| BloodHound CE / Enterprise                 | Free CE, saved queries, Abuse/OPSEC help, pathfinding, posture (BHE)                             | Near-duplicate paths, manual reporting [NETSPI]; slow large imports [HELVIO]; image export Enterprise-only [BH-CONTROLS] |
| Maltego                                    | De facto visual link-analysis standard for OSINT/CTI [MALT-ALT]                                  | Cost, learning curve [MALT-ALT]; growth controlled only by per-transform limits [MALT-SLIDER]                            |
| VirusTotal Graph                           | VT data, 30+ relationships, commonalities [VT-OVERVIEW]                                          | Quota per expansion, 40 nodes per query, premium private graphs [VT-SEARCH]                                              |
| OpenCTI / MISP                             | Free, STIX-native, correlation [OPENCTI] [MISP-STORIES]                                          | Noisy expansion, 10-step rollback [OPENCTI]; correlation volume [MISP-STORIES]                                           |
| EDR process trees, Defender incident graph | Parent-child context, timing, alert pills, replay, blast radius [ELASTIC-ANALYZER] [MS-INCIDENT] | Tree alone does not say whether relationships matter [EDR-TRIAGE]; paths are approximations [MS-INCIDENT]                |
| IDA / Ghidra / BinDiff                     | Flow graphs tied to code, saved layouts, groups, side-by-side diff [IDA-GRAPH] [BINDIFF]         | Call graphs tangle when expanded; some prefer text trees [SANS-GHIDRA]                                                   |
| Arkime Connections                         | Any field pair as nodes, thresholds, pivot to sessions and PCAP [MALCOLM-ARKIME]                 | Partial view at small query sizes, slow at large [MALCOLM-ARKIME]                                                        |
| Graphistry                                 | GPU scale, hypergraphs, SIEM templates [PYG-SPLUNK] [GRAPHISTRY-TEMPLATES]                       | Needs notebooks or a server                                                                                              |
| Wiz / Defender for Cloud                   | Ranked issues, evidence graphs, remediation lists [WIZ-TOXIC] [MDC-MANAGE]                       | Proprietary graph; up to 24 h to clear a fixed path [MDC-MANAGE]                                                         |
| KubeHound / Cartography                    | Free, queryable, what-if analysis [KUBEHOUND] [CARTOGRAPHY]                                      | Needs a graph database and Gremlin or Cypher                                                                             |
| Attack Flow Builder                        | Free, STIX output, validation [AF-BUILDER]                                                       | No autosave [AF-BUILDER]                                                                                                 |
| LogonTracer / IRFlow                       | Logon-type encoding [JPCERT-LT] [IRFLOW-LM]                                                      | Niche, self-hosted                                                                                                       |

**Streaming.** No source found of analysts watching a live-updating general graph. Streaming happens upstream
(SentinelOne Storylines updated as telemetry arrives [S1-SEARCH], continuous BHE collection); analysts consume a
refreshed snapshot or a time replay [MS-INCIDENT]. The need is incremental append plus time scrubbing.

## 10. Requirements implied

Must-have (M) and should-have (S). "Not covered" means no existing Graphty persona or workflow in design/designloom
describes it (checked against `cybersecurity-analyst`, W05 Path Investigation, W07 Threat Hunting, W12 Anomaly
Detection, W19 Network Evolution Analysis).

| #   | Capability                                                                                                                                                                                      | Priority | Covered today?                     |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ---------------------------------- |
| 1   | Typed, directed multi-edges; filter paths and views by edge type                                                                                                                                | M        | Not covered                        |
| 2   | Path-to-target queries: from a source set ("owned") to a target set ("Tier Zero"), up to N hops, through waypoints, reversible                                                                  | M        | Partly (W05 single path)           |
| 3   | User-set node flags (owned, high value) as calculated values that queries and styles use                                                                                                        | M        | Not covered                        |
| 4   | Left-to-right ranked-layer layout for path results; tree layout with time spacing for process lineage                                                                                           | M        | Not covered                        |
| 5   | Click-to-focus: dim everything except paths through the selected node                                                                                                                           | M        | Not covered                        |
| 6   | Importers: SharpHound/AzureHound zips, OpenGraph JSON, STIX 2.1 (including Attack Flow), MISP JSON, EVTX-derived CSV, Zeek logs                                                                 | M        | Not covered                        |
| 7   | Event table to graph: pick entity columns from a CSV and generate entity and event nodes                                                                                                        | M        | Not covered                        |
| 8   | Expand-on-demand with per-expansion limits, undo of expansions, bulk prune by type or mark                                                                                                      | M        | Not covered                        |
| 9   | Result table with sort, filter and CSV export                                                                                                                                                   | M        | Partly                             |
| 10  | Time on edges (first/last seen, counts); time filter; chronological replay                                                                                                                      | M        | Partly (W19)                       |
| 11  | Aggregate raw events (billions of rows) into host-to-host, account-to-host or subnet edges with counts and a minimum-weight threshold, and drill down from an aggregated edge to its raw events | M        | Not covered                        |
| 12  | Group nodes by an address hierarchy (CIDR blocks, internal vs external, zones) and collapse or expand groups                                                                                    | M        | Not covered                        |
| 13  | Keep port, protocol and logon type as edge attributes usable in style and filter                                                                                                                | M        | Not covered                        |
| 14  | Remediate-and-rerun: diff two collections, show removed and new paths                                                                                                                           | M        | Not covered                        |
| 15  | Local-only processing and offline use                                                                                                                                                           | M        | Not stated anywhere                |
| 16  | Exposure and choke-point metrics: share of sources reaching the target set; nodes and edges on the most paths; what-if removal                                                                  | S        | Not covered                        |
| 17  | Group duplicate paths into one finding with affected principals                                                                                                                                 | S        | Not covered                        |
| 18  | Create and edit nodes and edges by hand with a typed property schema (for example confidence 0-100), and round-trip STIX Attack Flow JSON                                                       | S        | Not covered                        |
| 19  | Layered top-to-bottom layout with ordered branch edges (taken / not taken) and back edges for loops                                                                                             | S        | Not covered                        |
| 20  | Nodes that render multi-line monospace text (code blocks), with collapse of node groups into one labeled node                                                                                   | S        | Not covered                        |
| 21  | Depth-limited caller and callee expansion one level at a time from a focus node                                                                                                                 | S        | Partly (generic expansion, item 8) |
| 22  | Side-by-side diff of two graphs with matched, changed and unmatched coloring                                                                                                                    | S        | Not covered                        |
| 23  | DFD palette (typed node stencils), trust-boundary grouping, per-element annotations; attack trees as layered trees                                                                              | S        | Not covered                        |
| 24  | Saved, parameterized queries and deep links for an entity and time range                                                                                                                        | S        | Partly (W07)                       |
| 25  | Commonalities across a selection                                                                                                                                                                | S        | Not covered                        |
| 26  | Image export with labels hidden; JSON export of the current subgraph                                                                                                                            | S        | Partly                             |
| 27  | Incremental append of streamed events into an open graph                                                                                                                                        | S        | Not covered                        |
| 28  | List edges that cross a group boundary (enter, exit), and color elements by the status and severity of threats attached to them                                                                 | S        | Not covered                        |

Persona correction: `cybersecurity-analyst` should be split or rewritten. Its behaviors omit BloodHound, Maltego,
process trees, logon graphs, flow graphs and disassembler graphs; its frustration "graph databases are too slow for
real-time detection" is not supported by any source found; its emphasis on global betweenness is secondary to typed
path queries. W07 should become concrete workflows: AD attack path audit, indicator pivot, process-tree triage,
logon-graph scoping and network flow hunting.

## 11. Sources

- [ISC2-2024] https://www.isc2.org/insights/2024/10/isc2-2024-cybersecurity-workforce-study -- workforce and gap.
- [SANS-CTI-24] https://bitsight.com/blog/sans-cti-survey-2024-threat-hunting-now-top-use-case and https://zerofox.com/blog/insights-from-sans-institutes-2024-cti-survey -- CTI survey figures.
- [RF-JOB] https://job-boards.greenhouse.io/recordedfuture/jobs/8371164002 and https://wellfound.com/jobs/4988702-threat-intelligence-analyst -- CTI postings.
- [CTI-CAREER] https://feedly.com/ti-essentials/posts/the-cti-career-guide-roles-skills-and-salaries -- CTI skills.
- [BH-QUICK] https://bloodhound.specterops.io/get-started/quickstart/community-edition-quickstart -- CE install, File Ingest, no size limit.
- [SH-FLAGS] https://bloodhound.specterops.io/collect-data/ce-collection/sharphound-flags -- collection methods, loop, zip password.
- [SANS-BH] https://www.sans.org/blog/bloodhound-sniffing-out-path-through-windows-domains -- collection time, pathfinding, defender use.
- [SOPHOS-SH] https://www.sophos.com/en-us/blog/sniffing-out-sharphound-on-its-hunt-for-domain-admin -- detecting SharpHound collection.
- [BH-SEARCH] https://bloodhound.specterops.io/analyze-data/explore/search -- pathfinding, Owned/Tier Zero, Abuse/OPSEC, ID colon limit.
- [BH-CONTROLS] https://bloodhound.specterops.io/analyze-data/explore/graph-controls -- layouts, Hide Labels, export.
- [BH-CYPHER] https://bloodhound.specterops.io/analyze-data/explore/cypher-search -- saved queries, categories, sharing.
- [BH-GRAPHVIEW] https://bloodhound.specterops.io/analyze-data/findings/graph-view -- Attack Paths page.
- [BH-POSTURE] https://bloodhound.specterops.io/analyze-data/findings/posture -- posture trends.
- [BH-CAMPAIGN] https://bloodhound.specterops.io/analyze-data/privilege-zones/use-cases/run-remediation-campaigns -- campaigns.
- [BH-OG] https://specterops.io/blog/2025/07/29/bloodhound-community-edition-v8-launches-with-opengraph/ -- OpenGraph.
- [BH-AZ] https://bloodhound.specterops.io/resources/edges/az-reset-password -- Entra ID edges.
- [BHE-SEARCH] https://specterops.io/bloodhound-enterprise/ -- vendor claims.
- [BHE-START] https://specterops.io/blog/2025/03/19/getting-started-with-bhe-part-2/ -- Tier Zero additions create findings.
- [SO-PILLAR2] https://specterops.io/blog/2022/01/27/3-foundational-pillars-for-attack-path-management-pillar-2-empirical-impact-assessment/ -- exposure, 93/41/10%.
- [SO-PILLAR3] https://specterops.io/blog/2022/03/03/attack-path-management-pillars-part-3-safe-ad-security-remediation-guidance/ -- choke points, safe remediation, verification.
- [NETSPI] https://www.netspi.com/blog/technical-blog/network-pentesting/adpathfinder-opengraph-attack-path-mapping-in-bloodhound-ce/ -- pentester pain, duplicate paths.
- [HELVIO] https://helviojunior.com.br/en/offsec/dealing-with-large-bloodHound-datasets -- slow imports, 95,369-user client.
- [U42-AZH] https://unit42.paloaltonetworks.com/threat-actor-misuse-of-azurehound/ -- AzureHound, attacker use.
- [MS-HUNTGRAPH] https://learn.microsoft.com/defender-xdr/advanced-hunting-graph -- hunting graph scenarios, edge types, choke points.
- [MS-INCIDENT] https://learn.microsoft.com/en-us/defender-xdr/investigate-incidents -- incident graph, replay, blast radius.
- [MDE-ALERT] https://learn.microsoft.com/en-us/defender-endpoint/investigate-alerts -- alert story, timeline, classify, suppress.
- [NIST-61R3] https://csrc.nist.gov/pubs/sp/800/61/r3/final -- SP 800-61r3, April 2025.
- [CTI-MANUAL] https://1200km.com/cti-analyst-field-manual/docs/infrastructure-pivoting/infrastructure-pivoting-worked-case/ -- illustrative pivot case.
- [CENSYS-CS] https://censys.com/blog/using-cobalt-strike-to-find-more-cobalt-strike/ -- published pivot with host counts.
- [DT-IRIS] https://docs.domaintools.com/iris/investigate/data-panels/ssl-profile/ -- SSL Profile panel, pivot from certificate hash.
- [DT-CONN] https://learn.microsoft.com/en-us/connectors/domaintoolsirisinves/ -- certificate-hash pivot returns up to 500 domains.
- [MALT-START] https://www.maltego.com/blog/beginners-guide-to-maltego-charting-my-first-maltego-graph/ -- palette, transforms, save.
- [MALT-SLIDER] https://support.maltego.com/en/support/solutions/articles/15000061694-setting-the-transform-result-limit-slider -- result limits.
- [MALT-SELECT] https://support.maltego.com/en/support/solutions/articles/15000059548-performing-bulk-actions-with-select-by- -- bulk actions.
- [MALT-EXPORT] https://support.maltego.com/en/support/solutions/articles/15000059538-exporting-results -- PDF reports.
- [MALT-ALT] https://maxintel.org/maltego-alternatives-2026.html -- cost, learning curve.
- [VT-OVERVIEW] https://docs.virustotal.com/docs/graph-overview -- relationships, commonalities.
- [VT-NODES] https://docs.virustotal.com/docs/graph-nodes -- node actions, full expansion.
- [VT-SEARCH] https://virustotal.github.io/vt-graph-api/quickstart.html and https://docs.virustotal.com/docs/graph-management -- 40 nodes per query, premium.
- [OPENCTI] https://docs.opencti.io/latest/usage/pivoting/ -- investigation graph, rollback 10, STIX export.
- [MISP-STORIES] https://circl.lu/doc/misp/user-stories/ -- edge is a lead, correlation volume.
- [STIX21] https://docs.oasis-open.org/cti/stix/v2.1/os/stix-v2.1-os.html -- STIX 2.1 objects.
- [AF-BUILDER] https://center-for-threat-informed-defense.github.io/attack-flow/builder/ -- Builder steps, save and export.
- [AF-BEST] https://center-for-threat-informed-defense.github.io/attack-flow/usage_guides/best-practices -- flow structure, corpus rules.
- [AF-LANG] https://center-for-threat-informed-defense.github.io/attack-flow/language -- object types, confidence scale.
- [AF-2026] https://ctid.mitre.org/blog/2026/07/30/attack-flow-2026/ -- 2026 release features.
- [EDR-TRIAGE] https://www.security.com/product-insights/threat-tracer-investigations-capabilities-you-need -- process tree limits (vendor).
- [ELASTIC-ANALYZER] https://www.elastic.co/guide/en/security/current/visual-event-analyzer.html -- process graph, pills, time range.
- [S1-SEARCH] https://www.sentinelone.com/blog/rapid-threat-hunting-with-deep-visibility-feature-spotlight/ -- Storyline.
- [JPCERT-LT] https://blogs.jpcert.or.jp/en/2017/11/visualise-event-logs-to-identify-compromised-accounts---logontracer-.html -- LogonTracer.
- [MS-4624] https://learn.microsoft.com/en-us/previous-versions/windows/it-pro/windows-10/security/threat-protection/auditing/event-4624 -- logon types.
- [IRFLOW-LM] https://r3nzsec.github.io/irflow-timeline/features/lateral-movement -- logon graph model.
- [DFIR-LM] https://r3nzsec.github.io/irflow-timeline/dfir-tips/lateral-movement-tracing and https://rootguard.gitbook.io/cyberops/defensive-security/dfir/runbooks/lateral-movement-investigation-runbook -- type 3 before type 10, hop confirmation.
- [ZEEK-CONN] https://docs.zeek.org/en/master/logs/conn.html -- conn.log fields, uid.
- [MALCOLM-ARKIME] https://cisagov.github.io/Malcolm/docs/arkime.html -- Arkime Connections fields, threshold, link weight, query size.
- [RITA] https://github.com/activecm/rita -- beacon analysis over Zeek logs.
- [GRANEF] https://dfrws.org/presentation/using-relational-graphs-for-exploratory-analysis-of-network-traffic-data/ -- relational graphs of Zeek data (DFRWS USA 2023).
- [AFTERGLOW] https://cipherdyne.cipherdyne.org/blog/2007/01/visualizing-honeynet-project-iptables-log-data.html and https://infocondb.org/con/def-con/def-con-14/visual-log-analysis-the-beauty-of-graphs -- AfterGlow link graphs, scans.
- [REDSEAL] https://www.redseal.net/network-how-it-works -- config-derived reachability model.
- [NOZOMI] https://www.nozominetworks.com/blog/reduce-ot-risk-with-ics-network-visualization-and-asset-inventory -- passive OT topology, zones, Purdue (2018 vendor post).
- [GRASSMARLIN] https://github.com/iadgov/GRASSMARLIN -- passive ICS mapping, archived 2023.
- [LANL] https://csr.lanl.gov/data/cyber1/ -- multi-source dataset sizes.
- [DARPA-TC] https://arxiv.org/html/2604.14685 -- Table IX, node and edge counts for DARPA TC E3 and E5 graphs.
- [PYG-SPLUNK] https://pygraphistry.readthedocs.io/en/latest/demos/demos_databases_apis/splunk/splunk_demo_public.html -- hypergraph demo.
- [GRAPHISTRY-TEMPLATES] https://graphistry-admin-docs.readthedocs.io/en/latest/app-config/templates.html -- Splunk workflow actions.
- [SOC-STATS] https://www.nhimg.org/soc-and-alert-statistics-guide -- alerts per day survey.
- [WIZ-TOXIC] https://wiz.io/blog/the-anatomy-of-a-toxic-combination-of-risk -- toxic combinations, who remediates.
- [MDC-MANAGE] https://learn.microsoft.com/en-us/azure/defender-for-cloud/how-to-manage-attack-path -- attack path investigation and remediation steps.
- [MDC-ATTACKPATH] https://learn.microsoft.com/en-us/azure/defender-for-cloud/concept-attack-path -- cloud security graph.
- [MDC-EXPLORER] https://learn.microsoft.com/en-in/training/modules/identify-security-risks-posture-management/5-hunt-risks-cloud-security-explorer -- explorer queries.
- [KUBEHOUND] https://securitylabs.datadoghq.com/articles/kubehound-identify-kubernetes-attack-paths/ and https://github.com/DataDog/kubehound -- Kubernetes attack graph, sizes, remediation.
- [CARTOGRAPHY] https://github.com/cartography-cncf/cartography -- infrastructure graph on Neo4j.
- [RE-PLAT] https://web.cecs.pdx.edu/~dmcgrath/courses/Su26/malware/re_platforms.html -- RE platforms, graph view, workflow (course notes).
- [VARONIS-GHIDRA] https://varonis.com/blog/how-to-use-ghidra -- Ghidra workflow, Function Graph.
- [IDA-GRAPH] https://docs.hex-rays.com/user-guide/disassembler/graph-view -- basic blocks, edge colors, groups, layout.
- [IDA-PROX] https://docs.hex-rays.com/core/disassembler/concepts/proximity-view -- callers, callees, data nodes.
- [IDA-GDL] https://docs.hex-rays.com/ida-actions/producefuncgdl and https://python.docs.hex-rays.com/ida_gdl -- GDL and DOT export.
- [SANS-GHIDRA] https://isc.sans.edu/diary/25032 -- Ghidra call graph expansion one level at a time.
- [BINDIFF] https://www.zynamics.com/bindiff/manual/index.html -- matched functions, side-by-side flow graphs.
- [OWASP-TM] https://cheatsheetseries.owasp.org/cheatsheets/Threat_Modeling_Cheat_Sheet.html -- DFDs, tools, attack trees.
- [MS-TMT] https://learn.microsoft.com/en-us/training/modules/tm-use-recommended-tools-to-create-a-data-flow-diagram/2-threat-modeling-tool -- stencils, threat generation.
- [THREAT-DRAGON] https://owasp.org/www-project-threat-dragon/docs-1/threat-generation -- STRIDE per element.
- [THREAT-DRAGON-HOME] https://owasp.org/www-project-threat-dragon/ -- web or desktop; STRIDE, LINDDUN, CIA, DIE, PLOT4ai.
- [TD-THREATS] https://www.threatdragon.com/docs/usage/threats.html -- threats by type or context, properties, status and severity values.
- [MS-TMT-FEAT] https://learn.microsoft.com/en-us/azure/security/develop/threat-modeling-tool-feature-overview -- stencil categories, out of scope, messages, analysis view, interaction focus, reports.
- [PYTM] https://github.com/OWASP/pytm -- threat model as Python; Graphviz DFD, `crosses`/`enters`/`inside` conditions, risk color map, staleness check.
- [THREAGILE] https://github.com/Threagile/threagile -- threat model as YAML; about 40 built-in risk rules; generated DFDs (read through a search summary).
- [4Q] https://shostack.org/files/papers/The_Four_Question_Framework.pdf -- the four questions; DFDs commonly answer the first (read through a search summary).
- [TMC-24] https://shostack.org/blog/state-of-threat-modeling-2024-2025/ -- 60+ organizations; STRIDE 88%; diagrams 37%.
- [SC-25] https://www.securitycompass.com/Research%20Reports/The-2025-state-of-threat-modeling-and-security-by-design.pdf -- under half of companies that threat model do it every release (vendor survey; read through a search summary).
- [SOUPS24-TM] https://usenix.org/conference/soups2024/presentation/verreydt -- interviews in large Dutch organizations: scope, architecture documentation, scaling, follow-up.
- [ESEM26-TM] https://drops.dagstuhl.de/storage/00lipics/lipics-vol394-esem2026/LIPIcs.ESEM.2026.57/LIPIcs.ESEM.2026.57.pdf -- practitioners revisit the DFD while validating threats (read through a search summary).
