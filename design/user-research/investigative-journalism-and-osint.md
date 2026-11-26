# Investigative journalists, OSINT investigators and trust-and-safety teams

## Summary

This population finds hidden relationships between people, companies, accounts and infrastructure,
and proves each one well enough to publish it, act on it or take it to court. It includes reporters
on leak and corruption projects (ICIJ, OCCRP, national investigative desks), open-source
intelligence (OSINT) investigators who expand a single "selector" (an email, username, domain or
phone number) into a network with Maltego and similar tools, disinformation researchers who map
social media and Telegram networks, reporters who trace cryptocurrency flows, human rights
investigators who reconstruct chains of command, platform trust-and-safety (T&S) investigators
who link abusive accounts through shared signals, newsroom graphics desks that turn an
investigation graph into a published chart, and supply-chain investigators at universities, NGOs
and newsrooms who trace forced labor from a source company to the brands that buy from it through
customs and shipping records. They use graph software for three jobs:
expanding outward from a seed, searching and path-finding inside a large prebuilt graph (a leak or
a registry), and drawing a small, verified, annotated picture for an editor, a lawyer, a court or
readers. What sets them apart from scientists and business analysts is that every node and every
edge has to carry its source, the graph is usually sensitive or secret, and the final published
graph is a tiny, hand-checked subset of the working graph.

## 2. Population

**Job titles and organizations.**

- Investigative and data reporters at news organizations and nonprofit consortia. ICIJ's Panama
  Papers project had "more than 370 journalists in more than 100 media organizations", supported
  by three developers in a 12-person staff
  ([Neo4j/Cabra 2016](https://neo4j.com/blog/icij-neo4j-unravel-panama-papers/)); Pandora Papers
  had "more than 600 journalists in 117 countries and territories"
  ([ICIJ FAQ](https://www.icij.org/investigations/pandora-papers/frequently-asked-questions-about-the-pandora-papers-and-icij/)).
  OCCRP's Aleph platform has "24,000+ users" and 4.9 billion+ entities
  ([Aleph Pro announcement](https://occrp.org/en/announcement/occrp-announces-a-new-chapter-for-its-investigative-data-platform-aleph-pro),
  via search summary).
- OSINT analysts at NGOs (Bellingcat, DFRLab), law firms, due-diligence and corporate-intelligence
  firms, brand protection and law enforcement. Postings ask for "Prior experience with link
  analysis platforms, such as Maltego, i2 Analyst's Notebook, Palantir"
  ([job search summary](https://www.ziprecruiter.com/Jobs/Maltego/2),
  [Senior OSINT Analyst posting](https://diversityjobs.com/career/11347678/Senior-Open-Source-Intelligence-Analyst-New-York-New-York)).
  Maltego claims "almost one million" downloads and lists SOC, law enforcement, T&S and
  journalists as user groups (vendor claims;
  [Maltego](https://www.maltego.com/blog/how-investigators-use-maltego/)).
- Disinformation and influence-operation researchers at DFRLab, Graphika, Bellingcat, verification
  desks, election-integrity NGOs and university labs, who map retweet, mention, co-hashtag and
  Telegram forward networks in Gephi and NodeXL. Their full research document is
  `social-media-disinformation-and-marketing.md`; this document covers the investigative-desk
  version (persona 3.5, workflow 5.7).
- Cryptocurrency tracers in newsrooms. ICIJ's Coin Laundry project (2025) had 113 journalists from
  37 partners in 35 countries, traced "tens of thousands of transactions" from hundreds of wallets
  over 10 months, and "mainly relied on" Arkham Intelligence and Tronscan
  ([ICIJ Coin Laundry FAQ](https://www.icij.org/investigations/coin-laundry/cryptocurrency-faqs/)).
  GIJN and ICIJ publish a reporter's guide
  ([GIJN guide](https://gijn.org/resource/reporters-guide-to-investigating-cryptocurrency/), via
  search summary).
- Human rights and accountability investigators at UN mechanisms, NGOs and university centers.
  Security Force Monitor (Human Rights Institute, Columbia Law School) reconstructs the
  "organizational structure, command personnel and chain of command" of security forces from
  public sources, links them to alleged abuses, and publishes on WhoWasInCommand
  ([SFM data model](https://help.securityforcemonitor.org/en/latest/our-general-data-model.html)).
  The Berkeley Protocol sets evidence standards for the field
  ([Berkeley Protocol](https://humanrights.berkeley.edu/programs/investigations/berkeley-protocol)).
- Platform T&S investigators ("Technical Investigator, Behavior Integrity" at Meta, "Deceptive
  Behaviors Investigation Analyst" at TikTok). Postings put SQL first, Python second, and
  "investigations experience focused on network analysis" as preferred (search snippets of
  [TikTok](https://www.themuse.com/jobs/tiktok/deceptive-behaviors-investigation-analyst-usds) and
  [Meta](https://www.themuse.com/jobs/meta/technical-investigator-behavior-integrity-operations-c619bd)).
- Newsroom graphics editors who draw the published chart
  ([OpenNews, Hurt 2013](https://source.opennews.org/articles/network-diagrams-hard/),
  [Storybench on WSJ, 2017](https://www.storybench.org/?p=5635)).
- Forced-labor supply-chain investigators at university labs, NGOs and newsrooms who trace goods
  through shipment records. Sheffield Hallam University's Helena Kennedy Centre, in a report led by
  Laura Murphy, used "publicly available customs data and shipping records" to link five leading
  Chinese manufacturers to 53 contract garment suppliers in ten countries
  ([Sheffield Hallam, Laundering Cotton, 2021](https://www.shu.ac.uk/news/all-articles/latest-news/laundering-cotton-report)).
  C4ADS says it uses "large-scale analysis of corporate and trade data" to trace "the complex supply
  chains that mask forced labor" ([C4ADS forced labor](https://c4ads.org/?p=696)). The Outlaw
  Ocean Project used "bills of lading and other customs information, product packaging and company
  press releases and annual reports" to follow seafood from Chinese plants to buyers in Europe and
  the US (Pulitzer Center page, via search summary:
  [Pulitzer Center](https://pulitzercenter.org/node/31160)). In 2018 the AP followed shipments
  from a factory inside a Xinjiang internment camp to a US sportswear supplier (AP syndication, via
  search summary: [KSL](https://ksl.com/article/46451571)). This is the reverse of the importer's
  trace in `supply-chain-and-physical-infrastructure-networks.md` (persona
  `trade-compliance-analyst`): it starts from the source and walks downstream (persona 3.6,
  workflow 5.10).
- Total size: no source gives a head count; the nearest proxies are Aleph's 24,000+ users and
  consortium rosters of hundreds per project.

**Frequency.** OSINT investigators use link analysis daily or weekly (a named job requirement).
Reporters use graph tools in bursts: weeks on a project, then nothing. In a consortium, a handful
of data staff build the graph and hundreds of reporters search it.

**Skills.** Reporters are strong at documents and spreadsheets and weak at query languages: ICIJ
chose Linkurious because "most journalists are not going to be writing SQL or Cypher queries"
([Linkurious ICIJ summary](https://neo4j.com/?p=49297)), and training classes define degree,
betweenness and eigenvector in one sentence each
([Aldhous NICAR](https://paldhous.github.io/NICAR/2016/gephi.html),
[Online Journalism Blog](https://onlinejournalismblog.com/2020/06/08/a-journalists-introduction-to-network-analysis/)).
OSINT investigators are fluent in pivoting tools, with some Python (Maltego transforms use the
Python TRX library;
[Maltego iTDS](https://support.maltego.com/en/support/solutions/articles/15000019514-add-maltego-trx-transforms-to-maltego-desktop-client-via-itds)).
T&S staff are SQL and Python fluent. Graphics desks know D3 and Illustrator.

**Team context.** Consortium projects are large, secret and cross-border, sharing a document search
engine and a graph explorer (Neo4j/Cabra 2016). OSINT work is small-team with a documented pivot
chain. Crypto projects lean on outside experts: ICIJ "relied on more than two dozen experts to
either trace cryptocurrency transactions or to verify our analyses" (Coin Laundry FAQ). T&S teams
pair automated detection with human review (vendor blog:
[LegitScript](https://www.legitscript.com/fraud-risk-and-prevention/how-network-investigators-stop-bad-actors-on-platforms-and-how-you-can-too/)).

## 3. Personas

Composites; no real person is described. "Ruth" replaces the design-studio personas
`design/ui/studio/personas/data-journalist.md` and `returning-data-journalist.md` as a
requirement record.

### 3.1 Investigative reporter (id: `investigative-reporter`) -- "Ruth"

- **Role:** Reporter on a regional or national investigations desk; partner reporter on a
  consortium leak project several times a decade.
- **Background:** Fast in spreadsheets and documents, has sat through one network-analysis class
  at a journalism conference (the NICAR Gephi class teaches import, Fruchterman-Reingold layout, a
  range filter and betweenness in one session;
  [Aldhous](https://paldhous.github.io/NICAR/2016/gephi.html)). Does not write Cypher.
- **Tools today:** A spreadsheet of people, companies and ties; Datashare or Aleph for document
  search; the consortium's Linkurious or the public Offshore Leaks database; occasionally Gephi,
  Kumu or Flourish ([Online Journalism Blog](https://onlinejournalismblog.com/2020/06/08/a-journalists-introduction-to-network-analysis/)).
- **Data:** A contacts or companies sheet of tens to a few hundred rows that she built by hand;
  registry extracts; a consortium graph of about a million nodes that someone else built.
- **Goals:** Find the shortest chain between two people in her story; find who sits between groups
  that should not be linked; batch-check her country's politicians against a leak (ICIJ's batch
  search returned a CSV of matching documents for a CSV of names in seconds;
  [Neo4j/Cabra 2016](https://neo4j.com/blog/icij-neo4j-unravel-panama-papers/)); hand the editor a
  picture and the fact-checker a table.
- **Frustrations:** A number or a link she cannot trace to a document; statistics that change with
  the filter applied before them (KB lab's trial-and-error finding, cited in the studio file);
  exports that differ from the screen; any sign that unpublished names leave her laptop.
- **Evidence limit:** No first-person account by a reporter learning a graph tool was read
  directly; the persona rests on training material, ICIJ process accounts and studio sessions.

### 3.2 OSINT investigator (id: `osint-investigator`) -- "Tomas"

- **Role:** Open-source researcher at an NGO investigations unit, a newsroom OSINT desk, or a
  corporate-intelligence firm.
- **Background:** Trained on Maltego, Hunchly and registry research; knows that "'Same username' is
  a weak signal" and that "each connection needs a source"
  ([TryHackMe](https://tryhackme.com/resources/blog/practical-osint-how-real-investigations-actually-work)).
- **Tools today:** Maltego Graph (Desktop) with paid data transforms; Hunchly to capture and hash
  web pages ([Bellingcat toolkit, Hunchly](https://bellingcat.gitbook.io/toolkit/more/all-tools/hunchly));
  OpenCorporates, national registries, OpenSanctions, Aleph; Gephi for metrics on exported graphs
  ([EBU Spotlight summary](https://spotlight.ebu.ch/p/investigative-network-mapping-link)); i2
  Analyst's Notebook in law-enforcement-facing roles.
- **Data:** Selectors (emails, aliases, domains, IPs, phone numbers, Google Tag IDs, wallet
  addresses), breach records, WHOIS and passive DNS, company filings. Graphs of tens to a few
  thousand entities; Maltego Community Edition caps a graph at 10,000 entities and returns few
  results per transform (search summary of [Maltego CE docs](https://docs.maltego.com/support/solutions/articles/15000018947-maltego-ce)).
- **Goals:** Attribute a set of accounts or sites to a person or organization; map the
  infrastructure behind a network of sites; produce a defensible pivot chain.
- **Frustrations:** Transforms that flood the graph with irrelevant results ("only run Transforms
  that will yield relevant data"; EBU summary); credit budgets; a graph that looks more convincing
  than its evidence ("A visually compelling graph may make an explanation feel stronger than the
  evidence supports";
  [Maltego tradecraft post](https://www.maltego.com/blog/structured-osint-investigations-with-maltego-and-analytic-tradecraft/));
  GraphML that does not round-trip between tools ([Maltego export](https://docs.maltego.com/support/solutions/articles/15000019396-export-graph-as-xml)).

### 3.3 Trust-and-safety network investigator (id: `trust-and-safety-investigator`) -- "Priya"

- **Role:** Investigator on a platform's integrity, deceptive-behavior or marketplace-risk team.
- **Background:** Two to four or more years in T&S, fraud or intelligence; SQL daily, Python
  weekly (job postings above).
- **Tools today:** Internal SQL warehouse, notebooks and internal case tools. Graph use that a
  source shows: NetworkX connected components in a vendor's fraud pipeline
  ([Castle](https://blog.castle.io/finding-links-between-fraudulent-email-domains-using-graph-based-clustering/));
  a TrustCon 2024 workshop that taught T&S analysts social network analysis in NetworkX, with
  centrality to find "superspreaders" (session listing on a Harvard faculty page, read via search
  summary; direct fetch refused:
  [listing](https://hongqu.scholars.harvard.edu/presentations/network-analysis-discover-emerging-influencers-superspreaders));
  vendor link-analysis views such as Maltego with SpyCloud data
  ([SpyCloud summary](https://spycloud.com/audience/trust-and-safety/)). The TSPA curriculum's
  investigations chapter (only its introduction could be read) names no graph tool
  ([TSPA](https://www.tspa.org/curriculum/ts-curriculum/investigations-intelligence-risk-mitigation/)).
- **Data:** Account records with device fingerprints, IPs, emails and phone numbers, payment
  instruments, registration times, content hashes, and action logs. Millions of accounts in the
  warehouse; no source found for the size of a working graph per case.
- **Goals:** From a few known-bad seed accounts, find the whole network and enforce on it at once.
  Meta's policy acts "based on the behavior we see on our platform -- not based on who the actors
  behind it are or what they say", and removes the assets "directly involved" while leaving
  uninvolved authentic users in place
  ([Meta 2019 policy update](https://about.fb.com/news/2019/10/inauthentic-behavior-policy-update/),
  [Meta inauthentic behavior policy](https://transparency.meta.com/policies/community-standards/inauthentic-behavior)).
- **Frustrations:** Shared attributes that link innocent users (an identity vendor notes that
  legitimate accounts "will likely share" device and network attributes; search summary of
  [Persona](https://withpersona.com/blog/8-ways-i-use-graph-to-uncover-fraud-rings)); proving
  coordination versus coincidence; weak enforcement follow-through (only a small fraction of
  flagged accounts were removed in one study; [arXiv 2505.10867](https://arxiv.org/html/2505.10867v2)).
- **Evidence limit:** No source shows a T&S investigator using a standalone graph visualization
  tool day to day, as opposed to SQL and internal systems. This persona is mostly a consumer of
  internal tools, and its weight in section 10 is lowered accordingly.

### 3.4 Newsroom graphics editor (id: `newsroom-graphics-editor`) -- "Julia"

- **Role:** Graphics reporter or developer who turns an investigation's network into a published
  chart.
- **Background:** D3, Illustrator, Flourish; knows that network charts are "not as intuitive as a
  simple bar chart" for readers ([Online Journalism Blog](https://onlinejournalismblog.com/2020/06/08/a-journalists-introduction-to-network-analysis/)).
- **Tools today (dated evidence):** In 2013, NPR drafted in OmniGraffle and finished in
  Illustrator, redrawing "at least eight" layouts by hand
  ([OpenNews, Hurt 2013](https://source.opennews.org/articles/network-diagrams-hard/)). In 2017,
  WSJ used a D3 force layout with scroll-triggered annotations
  ([Storybench, Wu 2017](https://www.storybench.org/?p=5635)). Flourish offers a network graph
  template with Points and Links sheets on its free plan
  ([Flourish network charts](https://flourish.studio/visualisations/network-charts/),
  [Posner tutorial, 2021](https://miriamposner.com/classes/dh201w21/tutorials-guides/network-analysis/flourish-graph)).
- **Data:** A reporter-supplied, fact-checked list of nodes and links, usually tens to a few hundred
  items (WSJ 2017: 500+ potential conflicts of interest).
- **Goals:** "distilling a complex, messy dataset into a clean visualization with a clear takeaway"
  (Joel Eastwood, WSJ, in Storybench 2017, checked); hover on any node to see how it links back to
  the subject (same source); readable on phones (NPR 2013); every label lawyer-approved.
- **Frustrations:** Text inside the chart that becomes unreadable on phones (NPR 2013); constant
  force-layout motion ("distracting", turned off at WSJ in 2017, per Julia Wolfe); encodings the
  data cannot support (NPR dropped line weight for donation size because the data "wasn't
  consistent enough").
- **Evidence limit:** Searches of NICAR tipsheets, ICIJ's site, Flourish case studies, Storybench
  and OpenNews found no first-hand account from 2021 or later of how a newsroom built a published
  network graphic. The toolchain has changed since these sources (Flourish, Observable, Svelte
  scrollytelling), so the steps above describe 2013-2017 practice. An academic analysis of
  journalistic network images identifies five kinds of "narrative readings" of networks
  ([Bounegru et al., Digital Journalism 2017](https://arxiv.org/abs/1801.01322)).

### 3.5 Disinformation researcher on an investigative or verification desk (id: `osint-disinformation-investigator`)

The full persona is in `social-media-disinformation-and-marketing.md` (same id, used there to
avoid two records for one person). Summary for this population:

- **Role:** Analyst at DFRLab, Bellingcat, Graphika or a broadcaster's verification unit who
  investigates suspected influence operations for publication.
- **Tools today:** Gephi (ForceAtlas2, modularity), 4CAT and Zeeschuimer browser capture, Telepathy
  for Telegram archives and forward edge lists
  ([Bellingcat toolkit, Telepathy](https://bellingcat.gitbook.io/toolkit/more/all-tools/telepathy)),
  CooRTweet for coordination, Maltego for account forensics.
- **Data:** Retweet, mention, reply, co-hashtag and forward networks of thousands to tens of
  thousands of nodes; DFRLab's pro-Kremlin Telegram graph had 3,871 channels and 57,646 forwards
  from 56 seed channels ([DFRLab 2023](https://dfrlab.org/2023/03/01/networks-of-pro-kremlin-telegram-channels-spread-disinformation-at-a-global-scale/)).
- **Goals:** Show that a set of accounts is connected and acts together; separate originators from
  amplifiers; publish a cluster map a general reader can follow.
- **Frustrations:** Collapsing data access (section 5.7); hairball figures; seed hashtags that
  dominate the picture; no ground truth.

### 3.6 Forced-labor supply-chain investigator (id: `forced-labor-trade-investigator`) -- "Hanna"

A variant of `osint-investigator` with its own data (shipment records) and its own workflow.

- **Role:** Researcher at a university forced-labor lab, an NGO investigations unit (C4ADS,
  Earthsight, the Outlaw Ocean Project) or a newsroom supply-chain desk.
- **Background:** Reads Chinese corporate records or works with someone who does; knows production
  stages for her sector (fiber, yarn, fabric, garment). Sheffield Hallam's list of companies
  operating in the Uyghur Region gives "names, addresses, and sectors in both Chinese and English",
  with English translations that are "machine-generated and may not be accurate" (53,397 entities;
  [OpenSanctions](https://www.opensanctions.org/datasets/shu_uyghur_companies)).
- **Tools today:** Shipment-record services. AP's Martha Mendoza usually uses ImportGenius for
  bill of lading data, and GIJN also names Panjiva and Enigma (GIJN tip sheet, via search summary:
  [GIJN](https://gijn.org/resource/expert-tips-for-following-ships-smugglers-and-supply-chains/)).
  Exposing the Invisible lists "Trade Atlas, Export Genius, Xportmine, ListThe, Panjiva" as
  examples ([Exposing the Invisible](https://kit.exposingtheinvisible.org/en/supply-chain.html)).
  Corporate registries (OpenCorporates, Investigative Dashboard, Offshore Leaks; same source);
  MarineTraffic for ships. Supply Trace, built by Northeastern and Sheffield Hallam, applies machine
  learning to shipping data so that "anyone, anywhere, can access those corporate relationships with
  forced labor for free"
  ([Northeastern 2023](https://news.northeastern.edu/2023/03/13/forced-labor-fashion-supply-chain/)).
  A 2024 report on Xinjiang farming used the ImportInfo customs database and Sayari and named 72
  international companies (via search summary:
  [RFA](https://rfa.org/english/uyghur/2024/12/19/uyghur-coerced-land-use-transfers-report/)).
- **Data:** Bills of lading and customs manifests (exporter and importer names, shipment date,
  weight, HS code, ports, sometimes notify parties; Exposing the Invisible), registry and
  ownership records, company disclosures, satellite imagery, worker testimony.
- **Goals:** Show which brands are exposed to a source tied to forced labor; expose third-country
  intermediaries that hide origin; cite a record for every link; publish every company's response.
- **Frustrations:** Customs data "often contains false positives or multiple spellings for the
  same company name" (Exposing the Invisible); buyer and seller identities are "often omitted or
  concealed behind freight forwarding or logistics firms"
  ([Earthsight guidebook](https://earthsight.org.uk/tic/guidebook)); about 16 percent of US
  maritime shipment records from 2013 through 2023 have redacted identities, and redactions rose
  after the UFLPA, especially for cotton and apparel
  ([NYU Stern](https://www.stern.nyu.edu/index%2ephp/experience-stern/faculty-research/supply-chain-secrecy-how-forced-labor-scrutiny-relates-redactions-us-import-records.md));
  materials mix at each stage, so a link shows exposure, not content (Exposing the Invisible:
  "Traceability is a key challenge in supply chains"). Legal risk is real: a named supplier, Smart
  Shirts, began libel proceedings against Sheffield Hallam in December 2023 over its apparel report,
  and a 2022 report was corrected after "an algorithmic mistake in the customs data" named the wrong
  company (both via search summary of Sheffield Hallam pages:
  [Tailoring Responsibility](https://shu.ac.uk/helena-kennedy-centre-international-justice/research-and-projects/all-projects/eu-apparel)).
- **Why not the importer's persona:** screening platforms are sold to "procurement and compliance
  teams" and trace "from direct supplier back to raw material origin"; the vendor page describes no
  downstream trace ([Sayari](https://sayari.com/enterprise/forced-labor-screening/), vendor). The
  investigator has no access to the importer's purchase orders or affidavits, and her output is a
  publication that must survive legal review, not a filing to CBP.
- **Evidence limit:** No first-person account of the step-by-step graph work was read; the full
  Laundering Cotton method and Sheffield Hallam's "Know Your Supply Chains" brief refused direct
  fetch, so their method is known through a search summary and the press release.

## 4. Use cases (ranked)

| Rank | Question answered with a graph                                                                             | Who                                   | Frequency             | Stakes                                                                                                                                                                                                                                     |
| ---- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1    | Is person A connected to person B, and through whom? (shortest path)                                       | Reporters, OSINT                      | Every project         | Defamation risk if wrong; the core "story"                                                                                                                                                                                                 |
| 2    | What else is tied to this selector? (seed-and-pivot expansion)                                             | OSINT, T&S                            | Daily                 | Misattribution of an innocent person                                                                                                                                                                                                       |
| 3    | Which companies does this person control, directly and through proxies or family?                          | Reporters, due diligence              | Every corporate story | Legal; asset recovery (24 governments recovered $1.36B+ after Offshore Leaks; [ICIJ](https://www.icij.org/investigations/pandora-papers/the-inside-story-of-how-the-offshore-leaks-database-became-a-go-to-resource-on-offshore-finance/)) |
| 4    | Do any names on my list appear in this leak or registry? (batch match / cross-reference)                   | Reporters                             | At project start      | Missed stories; false matches                                                                                                                                                                                                              |
| 5    | Which accounts share infrastructure or behave in lockstep? (shared-attribute linking, coordination)        | T&S, disinformation researchers       | Daily in T&S          | Wrongful takedowns or missed campaigns                                                                                                                                                                                                     |
| 6    | Who are the intermediaries and brokers? (degree of intermediaries, betweenness)                            | Reporters, researchers                | Per project           | Identifies enablers (law firms, agents)                                                                                                                                                                                                    |
| 7    | Who communicated with whom in this document dump? (email sender/recipient graph)                           | Reporters                             | Per leak              | Lead generation                                                                                                                                                                                                                            |
| 8    | Which addresses or officers are shared by many entities? (hubs, nominee detection)                         | Reporters, AML                        | Per leak              | Shell-company patterns                                                                                                                                                                                                                     |
| 9    | Where did these funds go? (crypto flow tracing to an exchange)                                             | Reporters, OSINT                      | Per project           | Misattributed wallets; ICIJ double- to quadruple-checked findings (iMEdD, section 5.8)                                                                                                                                                     |
| 10   | Which communities form around this narrative, and who bridges them? (social media cluster map)             | Disinformation researchers            | Per investigation     | Accusing authentic users of coordination                                                                                                                                                                                                   |
| 11   | Who commanded the unit that committed this abuse, on that date? (chain of command)                         | Human rights investigators            | Per case              | Attribution in court or a UN report                                                                                                                                                                                                        |
| 12   | Which brands buy, through intermediaries, from this company tied to forced labor? (downstream trade trace) | Supply-chain investigators, reporters | Per report            | Libel if a match is wrong; import bans and brand action if right (section 5.10)                                                                                                                                                            |

## 5. Step-by-step workflows

### 5.1 Seed-and-pivot expansion in Maltego, then metrics in Gephi

Sources: [Maltego beginner's guide](https://www.maltego.com/blog/beginners-guide-to-maltego-charting-my-first-maltego-graph/),
[Maltego digital footprint workflow](https://academy.maltego.com/workflow-digital-footprint-desktop),
[result limit slider](https://support.maltego.com/en/support/solutions/articles/15000061694-setting-the-transform-result-limit-slider),
[collections](https://docs.maltego.com/support/solutions/articles/15000010775-collections-tab),
[graph sidebar](https://docs.maltego.com/support/solutions/articles/15000009615-graph-sidebar),
[export](https://docs.maltego.com/support/solutions/articles/15000019396-export-graph-as-xml),
[EBU Spotlight summary](https://spotlight.ebu.ch/p/investigative-network-mapping-link),
[Google Tag case](https://www.maltego.com/blog/the-networks-behind-the-headlines/).

1. **Drop the seed.** New graph; drag a Domain, Alias, Email Address or Phone Number entity from
   the palette and set its value. Choose a distinctive seed: "common strings return profiles
   belonging to unrelated people."
2. **Set result volume** with the Transform Result Limit slider (Small, Balanced, Large on paid
   plans; Large "can noticeably increase graph complexity and load time").
3. **Run transforms.** Domain > "To Email address [From whois info]", "To DNS Name", then
   multi-select DNS names and "To IP address [DNS]"; for a person, alias profile search, leaked
   records search, then PII extraction. In the Google Tag case, tag IDs from six seed sites led
   through BuiltWith transforms to seven more sites sharing them.
4. **Prune.** Remove non-matching profiles and disposable emails; keep nothing from a generic alias
   without corroboration. Maltego folds same-type entities that share parents and children into a
   Collection node (default minimum 25); pin an entity to pull it out; entities with notes are
   never collected.
5. **Repeat** with each new alias or email as "a new, independent seed"; **stop** when new
   searches yield nothing new, credits run out, or the question is answered.
6. **Arrange and read** with Block, Hierarchical, Circular or Organic layouts; size by links,
   Entity Rank or Entity Weight; List View shows the graph as a table.
7. **Export and analyze.** GraphML in three dialects (Maltego, yEd, Gephi), optionally selected
   entities only, or CSV. In Gephi, compute betweenness to find "gatekeepers"; export PNG and a
   GEXF that keeps metrics and layout (EBU). "Encrypt" on Save As protects sensitive graphs.
8. **Hand off** a report with the pivot chain, hashed captures (Hunchly) and the graph file.

Typical size and durations: no source found; Community Edition caps a graph at 10,000 entities.

### 5.2 Search, expand and path-find inside a consortium leak graph (ICIJ)

Sources: [Neo4j/Cabra 2016](https://neo4j.com/blog/icij-neo4j-unravel-panama-papers/),
[ICIJ 2018 pipeline](https://www.icij.org/inside-icij/2018/07/how-icij-deals-with-massive-data-leaks-like-the-panama-papers-and-paradise-papers/),
[Neo4j Pandora](https://neo4j.com/blog/pandora-papers-revealing-financial-secrets),
[Offshore Leaks data shape](https://offshoreleaks-data.icij.org/offshoreleaks/neo4j/guide/datashape.html),
[Neo4j Panama examples](https://guides.neo4j.com/sandbox/icij-offshoreleaks/panama-papers-examples.html),
[Linkurious 2014](https://linkurious.com/blog/analysing-the-offshore-leaks-with-graphs/),
[Neo4j Paradise analysis](https://neo4j.com/blog/depth-graph-analysis-paradise-papers/),
[Prophecies](https://icij.gitbook.io/prophecies).

**Data team (weeks to months).** Receive the leak (Panama: 2.6 TB, 11.5 million files; Pandora:
only about 4% structured) on encrypted disks; extract text with Tika and Tesseract on 30-40
servers; rebuild the provider's database (for Pandora, Python and machine learning on PDFs, some
forms keyed by hand); load Neo4j. Model: Entity, Officer, Intermediary, Address; edges OFFICER_OF,
INTERMEDIARY_OF, REGISTERED_ADDRESS, NOMINEE_*, and dedup links SAME_NAME_AS, SAME_ID_AS; dates,
status and sourceID on nodes. Panama: about 950,000 nodes and 1.2 million edges; in Paradise,
addresses had the highest maximum degree (9,268). Linkurious goes on top ("a few weeks of
research" to set up); journalists validate records in Prophecies, sometimes "up to four rounds".

**Reporter (minutes per query, weeks per story).**

1. Type a name in the search box; fuzzy matching finds spelling variants ("Joaquin Loera" surfaced
   "Joaquin Guzman Loera").
2. Batch search: upload a CSV of names (a country's politicians) and get a CSV of hits.
3. Expand a dot to officers, entities, intermediaries and address; expand again for the second
   degree.
4. Shortest path between two names in one click (Ilham Aliyev to Abdolbari Gozal in three steps,
   2014; Rex Tillerson to the Duchy of Lancaster, Paradise Papers).
5. Technical reporters write Cypher: companies a person controls directly and through
   variable-length paths; intermediaries ranked by linked companies; officer pairs who repeatedly
   share entities (excluding "LIMITED" nominees); fuzzy address search ("Malta~"); PageRank.
6. Decide: real person or namesake? Is the link current (inactivation dates)? Nominee service?
   Family links in the Aliyev story were added by reporters; they are not in ICIJ's data.
7. Share the visualization with partners in Linkurious; save documents for the fact-check.
8. Publish: Linkurious API embeds in articles (search summary of
   [Linkurious](https://linkurio.us/blog/team-collaboration-linkurious-enterprise/)); later the
   public Offshore Leaks Database (800,000+ entities, each page disclaiming any implied wrongdoing).

### 5.3 From documents to an entity graph (Datashare, Aleph, OpenSanctions)

Sources: [Datashare plug-in](https://www.icij.org/inside-icij/2024/02/datashares-new-plug-in-helps-investigative-journalists-connect-the-dots-with-graphs/),
[Datashare FAQ](https://www.icij.org/inside-icij/2019/11/what-is-datashare-frequently-asked-questions-about-our-document-analysis-software/),
[Aleph network diagrams](https://docs.aleph.occrp.org/users/investigations/network-diagrams),
[OpenAleph diagrams](https://darc.li/docs/openaleph/user-guide/103/network-diagrams),
[Bellingcat Aleph](https://bellingcat.gitbook.io/toolkit/more/all-tools/occrp-aleph),
[Aleph export summary](https://docs.aleph.occrp.org/developers/how-to/data/export-network-graphs),
[OpenSanctions statements](https://www.opensanctions.org/docs/statements/).

**Datashare.** (1) Install in local mode, offline ("Strictly no data comes out of Datashare, even
to ICIJ"), or use the consortium's server. (2) Index a folder; OCR with Tesseract. (3) Named-entity
recognition highlights people, organizations, locations and emails; batch-search a name list to a
spreadsheet. (4) The Neo4j plug-in builds a graph in one step, with edges from email sender and
recipient fields ("high precision") and document co-occurrence. (5) Explore in Neo4j Bloom,
Linkurious or Gephi (on the Enron corpus, centrality found employees who "centralized
information"). ICIJ's caveat: these graphs "are noisier" and usually unsuited to the final stage.

**Aleph.** (1) Search 4.9 billion+ entities with operators for variants, proximity and Cyrillic.
(2) Create an Investigation; upload documents and persons-of-interest lists. (3) Cross-reference
against all datasets; matches "must be independently verified". (4) Network diagrams > New
diagram; add entities and links; "Discover asset and shares" expands ownership; export an image or
share. Large data "can produce very complex diagrams". (5) For deeper analysis, `ftm export-gexf`
(Gephi, Sigma.js) or `ftm export-cypher` (Neo4j).

**OpenSanctions as a provenance model.** Each "statement" is one value of one property of one
entity, with `dataset`, `entity_id`, `prop`, `first_seen`, `last_seen` and `canonical_id`. Merged
profiles select values; statements keep every assertion from every source. Entity resolution is "a
graph of entity IDs" with positive and negative judgements
([OpenSanctions FAQ](https://www.opensanctions.org/faq/data-structure/wikidata-ids/)). Section 5.9
gives a stricter second model.

### 5.4 A reporter's spreadsheet to a network, without code

Sources: [Aldhous NICAR Gephi class](https://paldhous.github.io/NICAR/2016/gephi.html),
[Online Journalism Blog](https://onlinejournalismblog.com/2020/06/08/a-journalists-introduction-to-network-analysis/),
[First Draft](https://firstdraftnews.org/latest/how-to-use-network-analysis-to-explore-social-media-and-disinformation/),
[Kumu Google Sheets](https://docs.kumu.io/guides/import/google-sheets),
[LittleSis Oligrapher](https://littlesis.org/news/littlesiss-oligrapher-for-beginners),
[Posner Flourish tutorial](https://miriamposner.com/classes/dh201w21/tutorials-guides/network-analysis/flourish-graph).

1. **Define the relationship** before collecting: board seat, shareholding, donation, family.
2. **Build two sheets**: nodes (id, label, type, attributes) and connections (source, target,
   type, weight). A Gephi edge CSV needs Source and Target and an optional Type; without it Gephi
   treats edges as directed, and the class warns to check that direction "matches" the subject.
3. **Import.** Gephi: Data Laboratory > Import Spreadsheet > Edges table; copy Id to Label. Kumu:
   paste a shared Google Sheet link that refreshes on reload (its suggested publicly editable sheet
   would leak an investigation). Oligrapher: draw a small power map by hand.
4. **Lay out** with Fruchterman-Reingold or ForceAtlas 2; an unfiltered vote network is a
   "hairball".
5. **Filter** with Attributes > Range on edge weight (the class keeps Senate pairs voting together
   at least 0.67 of the time); check "Visible graph only" so tables and exports follow the filter.
6. **Measure** betweenness, average degree and modularity; size by betweenness, color by party or
   modularity class. First Draft: pictures are "great tools for exploration" but "by no means
   conclusive charts", and "Starting from one person will make that person look central".
7. **Export** SVG or PDF for print, or JSON with "Visible only" for a Sigma.js page.
8. **Or go straight to Flourish**: Points sheet (id, Group) and Links sheet (Source, Target, Value);
   turn off arrows for undirected data; cut Maximum width from 10 to 1 when all weights are 1; add
   title, source footer and popups; embed.

### 5.5 Fact-check, legal review and the evidence trail

Sources: [GIJN fact-checking summary](https://gijn.org/resource/introduction-investigative-journalism-fact-checking/),
[RCFP pre-publication review](https://www.rcfp.org/resources/pre-publication-review-guide/),
[TryHackMe](https://tryhackme.com/resources/blog/practical-osint-how-real-investigations-actually-work),
[Hunchly](https://bellingcat.gitbook.io/toolkit/more/all-tools/hunchly),
[ICIJ FAQ](https://www.icij.org/investigations/pandora-papers/frequently-asked-questions-about-the-pandora-papers-and-icij/).

1. **Document as you go.** Each pivot is recorded with its source: "An investigation that cannot
   show its reasoning is not actionable"; investigators "look for the intersection of multiple weak
   signals, not a single smoking gun."
2. **Capture and hash the source.** Hunchly records pages with screenshots, timestamps and hashes.
   The Berkeley Protocol sets chain-of-custody principles for evidence meant for courts.
3. **Fact-check spreadsheet.** The draft is broken into statements of fact with columns for source,
   links and file names (GIJN). In a network story each published edge is a statement of fact.
4. **Verification thresholds.** ICIJ counted only the 336 politicians who passed its verification
   criteria; auto-built graphs are not used for final claims (section 5.3).
5. **Right of reply** goes to subjects before publication; for crypto, with the wallet addresses
   (section 5.8). No source gave the general workflow.
6. **Legal review.** Lawyers flag statements that could support a libel or privacy claim (RCFP). No
   source described what lawyers require of a network chart; by inference from the spreadsheet
   method, every edge and label must trace to a checked statement.
7. **Disclaimers.** Offshore Leaks states on every page that listing implies no wrongdoing.

### 5.6 Trust-and-safety account linking and coordination networks

Sources, with what each is: [LegitScript](https://www.legitscript.com/fraud-risk-and-prevention/how-network-investigators-stop-bad-actors-on-platforms-and-how-you-can-too/)
(vendor blog; names no visualization tool),
[arXiv 2512.19061](https://arxiv.org/html/2512.19061v1) (a payment-platform fraud clustering
paper, LINE embeddings plus HDBSCAN; borrowed into T&S here by analogy, not T&S practice),
[Castle](https://blog.castle.io/finding-links-between-fraudulent-email-domains-using-graph-based-clustering/)
(vendor fraud blog), [CooRTweet vignette](https://cran.r-project.org/web/packages/CooRTweet/vignettes/vignette.html),
[Meta 2019 policy update](https://about.fb.com/news/2019/10/inauthentic-behavior-policy-update/),
[Stanford Internet Observatory takedowns](https://cyber.fsi.stanford.edu/node/21662). This is a
reconstruction from adjacent sources, not a documented T&S procedure.

1. **Seeds.** "Building out a network starts with a small set of seed accounts or listings already
   known to be violative" (LegitScript): user reports, classifier hits, a partner's tip.
2. **Pull signals** by SQL: technical (shared devices, serialized email patterns, IPs within a
   short window, phone numbers, payment methods, domain registrations, redirect chains) and
   behavioral (near-identical content, shared branding).
3. **Build the account-to-attribute graph** and project it onto accounts. The payment-fraud paper
   separates "hard links" (phone, card, national id) from "soft links" (device fingerprint, cookie,
   IP); Castle takes `networkx.connected_components()` over shared attributes.
4. **Coordination networks** for influence operations. CooRTweet takes four columns on any platform
   and any object type (hashtags, URLs, images): `object_id`, `account_id`, `content_id` and
   `timestamp_share` (UNIX time). `detect_groups()` takes a `time_window` (vignette examples: 60
   seconds, 30 seconds, and a 10-to-20-second interval) and `min_participation` (examples 1 and
   2); `generate_coordinated_network()` keeps edges at or above an `edge_weight` threshold whose
   default is the median (0.5), adjustable. The vignette warns that "including two platforms does
   not itself establish cross-platform coordination."
5. **Human review.** "None of these signals prove much by themselves. The proof is in the pattern"
   (LegitScript). SIO found one supposed network was really "four or five distinct groups linked to
   each other only by mentions of common public figures or popular hashtags".
6. **Enforce at the network level** on behavior, not content (Meta 2019), and feed confirmed
   indicators back into detection.
7. **Report.** Public threat reports (Meta's are listed at
   [Meta threat reporting](https://transparency.meta.com/en-us/metasecurity/threat-reporting/)).
   Twitter's 2019 information-operations archive, which released datasets with hashed user ids
   ([Twitter 2019](https://blog.twitter.com/en_us/topics/company/2019/information-ops-on-twitter.html)),
   predates the 2023 API changes; no source found that it still reaches researchers.

Durations and graph sizes per case: no source found.

### 5.7 Social media and Telegram network mapping (investigative desk version)

Sources: [Public Data Lab co-hashtag recipe](https://recipes.publicdatalab.org/co-hashtag_network.html),
[Telepathy](https://bellingcat.gitbook.io/toolkit/more/all-tools/telepathy),
[DFRLab 2023](https://dfrlab.org/2023/03/01/networks-of-pro-kremlin-telegram-channels-spread-disinformation-at-a-global-scale/),
[CooRTweet vignette](https://cran.r-project.org/web/packages/CooRTweet/vignettes/vignette.html),
[First Draft](https://firstdraftnews.org/latest/how-to-use-network-analysis-to-explore-social-media-and-disinformation/).
Longer versions of these steps, with parameters and case sizes, are in
`social-media-disinformation-and-marketing.md` (workflows 2 to 4).

1. **Collect.** 4CAT, or Zeeschuimer browser capture for platforms without research access;
   Telepathy for Telegram (needs a Telegram API id and hash; its forward map "creates an edge list
   showing which messages were forwarded to or from the target chat", with Source, Target, Label,
   Source_ID, Username and Timestamp columns; the README calls it "an unmaintained Telegram
   collection toolkit"); platform research APIs where access is granted.
2. **Build the graph.** A directed, weighted, timestamped multigraph whose edges are retweet,
   mention, reply or forward, or a co-hashtag projection. DFRLab: channels as nodes, directed edges
   from source to forwarding channel, weight = forward count, size = incoming forwards.
3. **Remove the query and seed nodes.** In the co-hashtag recipe: Data Laboratory, sort by
   frequency, select the top nodes (the query hashtags, which connect to everything) and Delete
   All; then a frequency range filter and a degree range filter.
4. **Lay out and cluster.** ForceAtlas2 (Scaling up for sparser, Gravity up for denser, LinLog for
   clearer clusters, Prevent Overlap last); Modularity, then color by Modularity Class. DFRLab got
   nine clusters.
5. **Read the clusters.** Name each from its top hashtags, channel names or language; read bridges
   and amplifiers; slice by time. DFRLab reported where labels did not match clusters. The recipe
   recommends "accepting ambiguity".
6. **Check coordination** with CooRTweet-style co-sharing (section 5.6, step 4), then corroborate
   outside the graph (creation dates, name histories, archives).
7. **Publish** a cluster map with annotations and close-ups, flagging unconfirmed claims. First
   Draft: such pictures are "by no means conclusive charts".

**Data access after 2023.** In February 2023 Twitter replaced its Academic Research tier with a
$100-a-month basic tier, and Enterprise access was reported at about $42,000 a month
([TechCrunch 2023](https://techcrunch.com/2023/02/14/twitters-restrictive-api-may-leave-researchers-out-in-the-cold/),
[arXiv 2404.07340](https://arxiv.org/abs/2404.07340)). Meta shut CrowdTangle on August 14, 2024.
Its replacement, the Meta Content Library, is open to "qualified academic or nonprofit
institutions" (later extended to journalists at nonprofits), and researchers report it restricts
downloads and analysis in outside tools
([TechCrunch 2024](https://techcrunch.com/2024/08/15/meta-shut-down-crowdtangle-a-tool-for-tracking-disinformation-heres-how-its-replacement-compares),
[Tech Policy Press](https://techpolicy.press/researchers-consider-the-impact-of-metas-crowdtangle-shutdown)).
Work has moved toward Telegram, Bluesky, Reddit and browser capture. For a graph tool this means
the input is a hand-collected edge list (CSV, GEXF, GDF or GML), not a platform connector.

### 5.8 Cryptocurrency flow tracing

Sources: [ICIJ Coin Laundry FAQ](https://www.icij.org/investigations/coin-laundry/cryptocurrency-faqs/),
[iMEdD Lab, Voutsina 2026](https://lab.imedd.org/en/?p=48253) (interview with ICIJ's Spencer
Woodman), [IJNet, Williams 2025](https://ijnet.org/en/story/5-essential-tools-journalists-conducting-cryptocurrency-investigations),
[GIJN guide](https://gijn.org/resource/reporters-guide-to-investigating-cryptocurrency/) (via
search summary).

1. **Seed wallets.** From scam victims, sanctions lists, police reports, court records, regulator
   complaints, test transactions and earlier leaks (ICIJ).
2. **Look up each address** in a blockchain explorer (Tronscan, Etherscan) or Arkham "early", using
   the platform's filters to find top counterparties (iMEdD); export activity as CSV (GIJN). At
   scale, ICIJ "coded our internal Python scripts to pull this data" from explorer APIs.
3. **Follow inflows and outflows** counterparty by counterparty; Arkham's Visualizer gives "a
   comprehensive overview of all transactions associated with a wallet" (IJNet). Filter by amount,
   token and date. No source gave a standard hop limit.
4. **Label attributed addresses** (exchanges, services, sanctioned entities) and record where each
   label came from. Arkham's labels are leads, not proof (GIJN summary); check exchange hot wallets
   against published proof-of-reserves data (iMEdD).
5. **Stop at the exchange.** Activity inside a centralized exchange is off-chain and invisible to
   explorers (GIJN summary). Ask the exchange (ICIJ put findings to Binance and OKX), and ask
   regulators and police whether they know the addresses: "law enforcement did not have their
   cryptocurrency addresses" (Woodman, iMEdD).
6. **Have experts confirm the path.** ICIJ cites "more than two dozen experts" (FAQ); the iMEdD
   interview says about a dozen. "We would double, triple, quadruple check these findings because
   we know that we are not the experts" (Woodman).
7. **Right of reply with the wallet addresses**, early (iMEdD).
8. **Publish.** No source described the format of the published flow chart.

- **Size:** hundreds of seed wallets and tens of thousands of transactions over 10 months (ICIJ).
- **Cross-reference:** `financial-crime-fraud-aml-kyc.md` does not cover crypto tracing; the same
  data and steps apply to compliance investigators there.

### 5.9 Chain-of-command mapping for human rights accountability

Sources: Security Force Monitor research handbook:
[data model](https://help.securityforcemonitor.org/en/latest/our-general-data-model.html),
[dates](https://help.securityforcemonitor.org/en/latest/how-dates-work.html),
[unit relations](https://help.securityforcemonitor.org/en/latest/units-relations.html),
[conflicting citations](https://help.securityforcemonitor.org/en/latest/multiple-citations-claims.html),
[WhoWasInCommand unit records](https://security-force-monitor.gitbook.io/sfm-research-handbook/en/whowasincommand/unitrec).

1. **Build a source list and cite every claim.** "A claim is an assertion of information evidenced
   by a citation from a source"; every claim needs at least one citation.
2. **Record claims by type:** units; relations between units (`child-of` for hierarchy, `member-of`
   for joint task forces), each with an optional class (`command`, `administrative`, or `class` for
   training cohorts); postings of persons to units; positionings (where a unit was); incidents.
3. **Date each claim as a range.** A precise range means the claim holds on every date in it; an
   imprecise range means it held on at least one day in it. Separate flags say whether a date marks
   a real start or end. A current claim usually ends at the citation's publication date. Fuzzy
   month-only dates are discouraged because they stretch ranges beyond the source.
4. **Mark status:** `accepted`, `conflict`, `work_needed` or `issue`. A citation with partly
   conflicting detail becomes a `conflict` claim plus a separate accepted claim without the
   conflicting detail, each with a public note.
5. **Merge contiguous claims:** relations between the same two units whose ranges overlap or fall
   within a day share one id.
6. **Publish and read.** On WhoWasInCommand each value shows "the sources and confidence rating for
   each value"; a unit's parent chart is drawn "at the last cited or end date of the parent
   relationship", shown at the bottom of the chart, and uses only `command` relations, not
   informal or administrative ones. Linking incident to unit to commander on a date is the
   attribution.

This is a second, stricter model of per-claim provenance beside OpenSanctions (section 5.3): it
adds status, imprecise dates and charts dated "as of" a chosen moment.

### 5.10 Downstream trade trace from an entity of concern to brands

Sources: [Sheffield Hallam, Laundering Cotton](https://www.shu.ac.uk/news/all-articles/latest-news/laundering-cotton-report)
and the report itself ([SHURA PDF](https://shura.shu.ac.uk/29641/1/Murphy-LaunderingCottonXinjiang%28VoR%29.pdf),
via search summary), [Exposing the Invisible](https://kit.exposingtheinvisible.org/en/supply-chain.html),
[Earthsight guidebook](https://earthsight.org.uk/tic/guidebook),
[C4ADS, Spoiled Fruit 2022](https://c4ads.org/?p=5126),
[GIJN tip sheet](https://gijn.org/resource/expert-tips-for-following-ships-smugglers-and-supply-chains/)
(via search summary).

Exposing the Invisible: "In most cases, investigators follow the trail downstream along the
supply chain from this entry point." Earthsight names both directions: "Following specific
products known or suspected to be illegally sourced" forward, or "Tracking high-risk products
backwards from a consumer country to their source", and "Employing both approaches in the same
case may be necessary or fruitful."

1. **Pick the entity of concern.** A company on a published list (Sheffield Hallam's Uyghur Region
   list, the UFLPA Entity List), a plant with worker testimony, or a producer under an import ban.
   Laundering Cotton started from five Chinese textile makers (via search summary of the report).
2. **Collect its names.** Chinese legal name, English trade names, subsidiaries; names on bills of
   lading "are often modified or misspelled", so the same company's records are scattered (via
   search summary of the report).
3. **Pull its outbound shipments.** Shipment records with shipper, consignee, date, weight, HS code
   and ports (Exposing the Invisible); some only by paid subscription (via search summary of the
   report annexes). Mendoza cautions that the data may not be 100 percent accurate (GIJN, via search
   summary). Consignees are the first tier of buyers: in Laundering Cotton, 53 manufacturers in ten
   countries.
4. **Walk downstream tier by tier.** Repeat for each buyer's outbound shipments to brands, keeping
   product continuity (yarn and fabric in, garments out). C4ADS counted shipments per pair: Cargill
   India "has imported 151 shipments of palm oil from Sime Darby's Malaysian subsidiaries", from
   trade data for January 2021 to April 2022, and warned that "this is not a comprehensive
   assessment" (Spoiled Fruit).
5. **Add ownership.** Registry links show, for example, that Huafu, Luthai and Texhong have
   production bases in Vietnam as well as China (via search summary of the report).
6. **Corroborate.** "Supply chain research requires a very high standard of proof"; keep notes and
   files with metadata and hash them (Exposing the Invisible). The AP paired shipment records with
   satellite analysis of the factory (via search summary of AP syndication).
7. **Right of reply.** Sheffield Hallam publishes corporate responses as annexes
   ([Laundering Cotton Annex D](<https://shura.shu.ac.uk/29641/10/Laundering%20Cotton%20Annex%20D%20--%20Corporate%20Responses%20Oct%202%202022%20(1).pdf>),
   seen in search results, not read).
8. **Publish** a report or story naming brands, with annexes; legal review (section 5.5).

**How this differs, step by step, from the importer's trace** (`supply-chain-and-physical-infrastructure-networks.md`
section 5.16; Designloom W230):

| Step      | Importer (trade-compliance-analyst, W230)                  | Investigator (this section, W1090)                                 |
| --------- | ---------------------------------------------------------- | ------------------------------------------------------------------ |
| Start     | One detained shipment                                      | One company of concern, or a list                                  |
| Direction | Upstream to raw materials                                  | Downstream to buyers and brands                                    |
| Shape     | One tree narrowing to origins                              | One source fanning out to many brands                              |
| Evidence  | Own POs, invoices, production records, supplier affidavits | Third-party shipment records, registries, disclosures, imagery     |
| Gaps      | A gap breaks the proof                                     | A redacted or forwarder endpoint stays an unknown node             |
| Proof bar | Admissible to CBP inside 30 days                           | Survives fact-check and libel review; companies get right of reply |
| Output    | Numbered tracing package to the Forced Labor Portal        | Published report or story with link and response annexes           |

The graph needs are shared: trade and ownership edges in one multigraph, entity resolution across
Chinese and English names, and a citation on every edge (R1, R10, R23). Designloom records this
workflow as W1090, owned by `forced-labor-trade-investigator`, `osint-investigator` and
`investigative-journalist`.

## 6. Data

| Source                    | Format                                                                                                                                                                              | Typical size                                                                                                                                                                                   | Notes                                                                                                                                                                                                                               |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Consortium leak graph     | Neo4j database; Offshore Leaks public release as one CSV per node type plus one relationships CSV, or a Neo4j dump ([ICIJ download](https://offshoreleaks.icij.org/pages/database)) | ~1M nodes / 1.2M edges (Panama); public Offshore Leaks 2014: ~250k nodes, 500k edges, 1.2M properties                                                                                          | Heterogeneous typed nodes, directed typed edges, dates on nodes; ODbL licence with attribution                                                                                                                                      |
| Document collections      | PDFs, emails, scans, spreadsheets                                                                                                                                                   | Millions of files, TBs                                                                                                                                                                         | Entities come from NER; noisy                                                                                                                                                                                                       |
| Aleph / FollowTheMoney    | FtM JSON entities; GEXF/Cypher via `ftm` CLI                                                                                                                                        | Billions of entities platform-wide                                                                                                                                                             | Relationships are "interstitial entities" (Ownership with startDate and percentage), not plain edges ([FtM docs](https://followthemoney.tech/docs/))                                                                                |
| OpenSanctions             | Entities plus statements CSV (nightly)                                                                                                                                              | Per-property rows                                                                                                                                                                              | first_seen/last_seen per value; non-commercial licence for statements                                                                                                                                                               |
| Company registries        | Companies House PSC, OpenCorporates, Orbis                                                                                                                                          | Global Witness analysed 10M+ UK records ([Global Witness](https://globalwitness.org/en/campaigns/corruption-and-money-laundering/anonymous-company-owners/companies-we-keep/?accessible=true)) | PSC lacks unique person ids, so one person appears as several ([Open Ownership](https://www.openownership.org/en/blog/what-graph-visualisation-teaches-us-about-beneficial-ownership/)); Orbis is not official legal ownership data |
| Maltego graphs            | .mtgx; GraphML (three dialects); CSV tables                                                                                                                                         | Up to 10,000 entities in CE                                                                                                                                                                    | Entity types with properties, notes, attachments, link labels                                                                                                                                                                       |
| Reporter spreadsheets     | CSV/XLSX, Google Sheets                                                                                                                                                             | Tens to hundreds of rows                                                                                                                                                                       | Hand-typed names; inconsistent spellings                                                                                                                                                                                            |
| Social media and Telegram | 4CAT and Zeeschuimer exports, Telepathy edge-list CSV, GEXF, GDF                                                                                                                    | First Draft example: 19,036 nodes, 207,780 edges; DFRLab 3,871 channels, 57,646 forwards                                                                                                       | Directed, timestamped, multi-relational (mention, retweet, reply, forward); platform APIs largely closed since 2023 (section 5.7)                                                                                                   |
| Co-sharing input          | CooRTweet four columns: object_id, account_id, content_id, timestamp_share (UNIX)                                                                                                   | No source found                                                                                                                                                                                | Any platform, any object type                                                                                                                                                                                                       |
| Crypto transactions       | CSV from explorers or Arkham; JSON from explorer APIs (Tronscan, Etherscan)                                                                                                         | Tens of thousands of transactions (ICIJ)                                                                                                                                                       | Directed multigraph; amount, token and time on each edge; address labels with a source; flows end at exchanges                                                                                                                      |
| Chain-of-command claims   | Security Force Monitor claims and citations                                                                                                                                         | No source found                                                                                                                                                                                | Each claim cited, with status, precise and imprecise date ranges, relation class                                                                                                                                                    |
| T&S warehouse             | SQL tables                                                                                                                                                                          | Millions of accounts                                                                                                                                                                           | Device, IP, payment, timestamps; legally restricted                                                                                                                                                                                 |
| Shipment records          | Bills of lading and customs manifests from commercial services (ImportGenius, Panjiva, others); CSV exports                                                                         | 53 suppliers from 5 source companies (Laundering Cotton); 151 shipments for one buyer-seller pair (C4ADS)                                                                                      | Shipper, consignee, date, weight, HS code, ports; misspelled names; about 16 percent of US records redacted (NYU Stern); parties hidden behind forwarders (Earthsight)                                                              |

**Graph properties.** Directed and typed; multi-edges (director and shareholder of one company;
many transfers between two wallets); bipartite in origin (people to companies, accounts to
attributes) and often projected; temporal (incorporation and dissolution, relationship start and
end, imprecise ranges, post timestamps; ceased relationships greyed, per
[Open Ownership](https://www.openownership.org/en/blog/what-graph-visualisation-teaches-us-about-beneficial-ownership/));
hierarchical (ownership chains, command chains).

**Identifier problems.** Name variants across scripts; no unique person ids in registries (UK PSC
data shows one person as several; Open Ownership); namesakes; "LIMITED" nominees; hashed or 64-bit
platform ids; unattributed wallets. Deduplication is itself a graph of judgements (SAME_NAME_AS in
ICIJ data; positive and negative judgements in OpenSanctions).

**Sensitivity.** Leaks and unpublished names are secret until publication: ICIJ requires PGP keys,
encrypted disks, two-factor authentication and client certificates
([ICIJ 2018](https://www.icij.org/inside-icij/2018/07/how-icij-deals-with-massive-data-leaks-like-the-panama-papers-and-paradise-papers/));
SecureDrop decrypts only on an air-gapped station
([SecureDrop](https://docs.securedrop.org/en/stable/what_is_securedrop.html)); Maltego offers a
self-hosted transform server so lookups stay private
([Maltego CTAS](https://docs.maltego.com/support/solutions/articles/15000020187-what-is-ctas-)).

## 7. Analysis methods

- **Search and fuzzy search** over names and addresses (Lucene "~" terms, proximity, batch lists):
  the most-used operation for non-technical reporters.
- **Neighborhood expansion** one and two hops; variable-length paths to find proxies.
- **Shortest and all shortest paths** with relationship-type filters and a hop limit (the Panama
  guide allows up to 10 hops over officer_of, intermediary_of and registered_address).
- **Degree by type** (intermediaries by companies, addresses by registrants) for nominee and
  shell-factory detection; **co-involvement projection** (officer pairs sharing more than 10
  entities as a virtual JOINT edge).
- **Betweenness** for brokers; **eigenvector** for "wider influence"; **PageRank**; **modularity**
  for social media clusters.
- **Connected components** over shared hard attributes; **co-action networks** with a time window
  (10 to 60 seconds in the CooRTweet examples) and an edge-weight threshold (default the median).
- **Flow following** over transaction edges, filtered by amount, token and date, stopping at
  exchanges (section 5.8); **as-of views** of command charts (section 5.9).
- **Validation habits:** corroborate each link; prefer several weak signals to one; distrust hubs
  that are registered-agent addresses; review every algorithmic match (Prophecies, xref); use
  structured analytic techniques, remembering that several reports "may appear to corroborate a
  claim while ultimately relying on the same original source" (Maltego tradecraft post).

## 8. Outputs and collaboration

- **Deliverables:** stories with embedded interactive graphs (Linkurious embeds, Flourish, D3);
  public searchable databases (Offshore Leaks); static SVG or PDF charts; OSINT reports with
  pivot-chain figures; cluster maps of influence operations; takedown reports; court or UN evidence
  packages with hashed captures; fact-check spreadsheets.
- **Working graph to published graph.** The published graph is a hand-picked, verified subset. NPR
  (2013) redrew layouts by hand at least eight times to avoid "spaghetti"; WSJ (2017) added colored
  background zones, revealed the network step by step on scroll, highlighted paths on hover and
  stopped the simulation's motion. Cambridge Intelligence recommends on-hover labels over
  color-coding nearly 500 relationship categories
  ([Cambridge Intelligence](https://cambridge-intelligence.com/?p=11611), via search summary).
- **Collaboration:** hundreds of reporters share one search engine and one graph explorer; Aleph
  diagrams and Linkurious visualizations are shared with chosen collaborators and exported to
  Excel, Gephi or image editors.
- **Audit:** the pivot chain, the source of each edge, capture hashes and each record's
  verification state.

## 9. Tools landscape and pain points

| Tool                         | Used for                                  | Loved                                                               | Fails them                                                                                                                                                                                            |
| ---------------------------- | ----------------------------------------- | ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Maltego                      | Seed-and-pivot OSINT                      | One hub for many data sources                                       | Result floods, credit costs, CE cap of 10k entities, non-standard GraphML                                                                                                                             |
| Linkurious on Neo4j          | Consortium leak exploration               | Search, expand and one-click shortest path without a query language | Cost ("costly", Open Ownership); needs a data team                                                                                                                                                    |
| Neo4j Bloom / Cypher         | Technical reporters                       | Expressive pattern search                                           | Requires Cypher                                                                                                                                                                                       |
| Datashare                    | Offline document search and NER           | No data leaves the machine; free                                    | Auto-built graphs are noisy                                                                                                                                                                           |
| Aleph / OpenAleph            | Cross-referencing and diagrams            | 4.9B entities, FtM model                                            | Access needs an application; diagrams get complex fast                                                                                                                                                |
| Gephi                        | Metrics, social media maps, print figures | Free, powerful                                                      | "moderate learning curve", "no built-in data collection", directed-by-default CSV trap, slows on very large graphs ([Bellingcat toolkit](https://bellingcat.gitbook.io/toolkit/more/all-tools/gephi)) |
| 4CAT, Zeeschuimer, Telepathy | Social media and Telegram collection      | Work without platform APIs                                          | Telepathy is "unmaintained"; rate limits; no analysis                                                                                                                                                 |
| Arkham, Tronscan, Etherscan  | Crypto tracing                            | Free explorers, address labels, CSV export                          | Labels are leads, not proof; exchanges are opaque                                                                                                                                                     |
| WhoWasInCommand              | Chain-of-command research                 | Sources and confidence on every value                               | One organization's data model; no source on outside use                                                                                                                                               |
| Kumu, Oligrapher, Flourish   | Hand-built maps and reader charts         | Spreadsheet input, embeds                                           | Small graphs; public sheets leak data                                                                                                                                                                 |
| i2 Analyst's Notebook        | Law-enforcement-style link charts         | Standard in due diligence job specs                                 | No source read directly here                                                                                                                                                                          |
| ImportGenius, Panjiva        | Shipment records for trade traces         | Shipper and consignee per bill of lading                            | Paid; misspellings and redactions; no graph of tiers (section 5.10)                                                                                                                                   |
| Supply Trace, Sayari         | Forced-labor exposure across tiers        | Free (Supply Trace) or broad registry and trade coverage (Sayari)   | Sayari is sold to compliance teams and traces upstream; flagged links are "potential risk" (Supply Trace, via search summary)                                                                         |

## 10. Requirements implied

Status of existing Graphty records: none of the current designloom personas is a reporter, OSINT
investigator, crypto tracer, human rights investigator, T&S investigator or graphics editor.
`intelligence-analyst` and workflows W05 (Path Investigation), W09 (Criminal Network Analysis) and W15 (Findings Communication) cover parts of path
finding, annotation and export, but none covers provenance, seed-and-pivot expansion, batch
matching, local-only guarantees or publication graphics. `trade-compliance-analyst` and W230 cover the
importer's upstream forced-labor trace; the investigator's downstream trace (section 5.10) is W1090.

| #   | Requirement                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Priority                                                                 | Covered today?                                                                                                                                                                                 |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | **Provenance on every node, edge and property value**: source document or dataset, URL, capture date, first/last seen or first/last cited, who added it, verification status (accepted, conflict, work needed) and a confidence rating per claim (Security Force Monitor shows sources and confidence for each value); visible in details and carried in every export                                                                                                                                                                          | Must                                                                     | Not covered (annotation is free text only)                                                                                                                                                     |
| R2  | **Fact-check table export**: one row per edge with endpoints, relationship, source and verification state, matching what is on screen                                                                                                                                                                                                                                                                                                                                                                                                          | Must                                                                     | Partly (data-export) -- needs the provenance columns and "visible only" parity                                                                                                                 |
| R3  | **Name search with fuzzy matching and variants** across labels and addresses                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Must                                                                     | Partly (search) -- fuzzy and script variants not specified                                                                                                                                     |
| R4  | **Batch match**: paste or upload a list of names and get hits per name                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Must                                                                     | Not covered                                                                                                                                                                                    |
| R5  | **Shortest path and all shortest paths between two named nodes**, with relationship-type filter and hop limit, listed name by name                                                                                                                                                                                                                                                                                                                                                                                                             | Must                                                                     | Covered (shortest-path, all-paths-finding, path-highlighting)                                                                                                                                  |
| R6  | **Typed multi-relational import** of investigation data: node files per type plus a relationships file (Offshore Leaks CSV), Maltego GraphML, FollowTheMoney JSON, GEXF from Aleph                                                                                                                                                                                                                                                                                                                                                             | Must                                                                     | Partly (CSV, GraphML, GEXF, Neo4j CSV) -- FtM and Maltego dialects not covered                                                                                                                 |
| R7  | **Local-only guarantee**: work fully offline with no network calls for data, and say so; encrypted saved projects                                                                                                                                                                                                                                                                                                                                                                                                                              | Must                                                                     | Not covered as a stated requirement                                                                                                                                                            |
| R8  | **Seed-and-pivot expansion** from one node through pluggable lookups (registry, DNS, sanctions, internal data) with a per-step result limit and undo                                                                                                                                                                                                                                                                                                                                                                                           | Should                                                                   | Not covered (neighborhood-expansion only reveals already-loaded data)                                                                                                                          |
| R9  | **Grouping of same-type leaves** (like Maltego collections) and pinning out of groups                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Should                                                                   | Not covered                                                                                                                                                                                    |
| R10 | **Entity resolution with reversible judgements**: merge and un-merge, keep SAME_AS evidence, never lose source records                                                                                                                                                                                                                                                                                                                                                                                                                         | Must                                                                     | Partly (node-merging) -- reversibility and evidence not specified                                                                                                                              |
| R11 | **Shared-attribute linking**: build account-to-account (or person-to-person) edges from shared values (address, phone, device, tag id), with hard/soft link weighting and connected components                                                                                                                                                                                                                                                                                                                                                 | Should (driven by OSINT tag-id and address pivots; T&S evidence is weak) | Not covered (component-analysis exists but no projection from attribute values)                                                                                                                |
| R12 | **Co-action network builder** from the four-column input (object_id, account_id, content_id, timestamp_share): same object within a time window, minimum participation, edge-weight threshold defaulting to the median                                                                                                                                                                                                                                                                                                                         | Should (driven by disinformation researchers)                            | Not covered                                                                                                                                                                                    |
| R13 | **Confidence usable in filters and styling** (weak, corroborated, confirmed; the R1 rating)                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Must                                                                     | Not covered                                                                                                                                                                                    |
| R14 | **Temporal validity on edges and nodes**: start and end, precise and imprecise ranges, partial dates, first and last cited; active vs ceased greyed by style; filter by date; show the graph "as of" a chosen date; filter relations by class (command vs administrative)                                                                                                                                                                                                                                                                      | Should                                                                   | Partly (temporal-analysis) -- validity intervals not specified                                                                                                                                 |
| R15 | **Degree by relationship type** and co-involvement counts (pairs sharing many entities)                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Should                                                                   | Partly (degree-analysis)                                                                                                                                                                       |
| R16 | **Publication export**: SVG for print, embeddable interactive view with hover-highlighted paths, step-by-step reveal, labels readable on phones, motion off, manual pinned layout                                                                                                                                                                                                                                                                                                                                                              | Must for graphics desks                                                  | Partly (export-image, view-bookmarks) -- embed and narrative steps not covered                                                                                                                 |
| R17 | **Notes attached to nodes and edges** with date and author, kept in the project                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Must                                                                     | Covered in part (annotation)                                                                                                                                                                   |
| R18 | **Shared investigations** among several reporters with per-user notes and roles                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Should                                                                   | Not covered                                                                                                                                                                                    |
| R19 | **Hub warnings**: flag registered-agent addresses and nominee nodes that distort centrality and layout                                                                                                                                                                                                                                                                                                                                                                                                                                         | Should                                                                   | Not covered                                                                                                                                                                                    |
| R20 | **Disclaimers and captions** carried into exported and embedded graphics                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Should                                                                   | Not covered                                                                                                                                                                                    |
| R21 | **Social media edge-list import and reduction**: Gephi-style CSV (Source, Target, Type, Weight, Timestamp headers), GDF, GEXF, Telepathy edge lists; delete seed and query nodes by frequency; ForceAtlas2 and modularity usable at 100k+ edges; time slicing over multi-relational edges                                                                                                                                                                                                                                                      | Should                                                                   | Partly (CSV, GEXF, ForceAtlas2, community detection) -- GDF not covered; scale and seed removal not specified                                                                                  |
| R22 | **Transaction flow graphs**: aggregate parallel transfers between two addresses with amounts summed per token; filter by amount, token and time; attribution label as a sourced node property; mark exchange nodes as off-chain dead ends; expand from an external explorer API (with R8)                                                                                                                                                                                                                                                      | Should                                                                   | Not covered                                                                                                                                                                                    |
| R23 | **Downstream trade trace**: build trade links from shipment-record rows (shipper, consignee, date, product, quantity), aggregated per pair with count and date range; follow them downstream from a chosen source, keeping only hops whose product fits the next production stage; carry ownership edges in the same graph; match Chinese, English and misspelled names with each variant's record kept (with R10); show redacted and forwarder endpoints as unknown nodes; export a link annex with records and a per-company response status | Should                                                                   | Partly: W230 covers the importer's upstream trace (`watch-list-proximity`, `tracing-package-export`); W1090 records this trace; stage filtering and cross-script name matching are not covered |

Requirements R1, R4, R7, R8, R10, R13, R16, R21, R22 and R23 are the main gaps against Graphty's
current personas and workflows. The T&S persona carries the least weight: no source shows T&S staff
using a graph tool outside internal systems, so R11 and R12 rest on the OSINT and disinformation
personas. Under the repository's architecture rules, the data-handling and computation parts
of these (provenance storage, batch matching, attribute projection, co-action networks, merge
judgements) belong in graphty-element; the wording, grouping and panel arrangement belong in the
graphty app.

## 11. Sources

Every source is linked inline where it is used (106 distinct URLs). These were read only through a
search-engine summary, because the page refused a direct fetch, errored, or was not fetched:
Laundering Cotton report and annexes, Sheffield Hallam's Tailoring Responsibility page, Pulitzer Center Outlaw Ocean page, AP Badger story (KSL syndication), GIJN supply-chain tip sheet, RFA 2024 report, GIJN cryptocurrency guide, GIJN fact-checking guide, RCFP pre-publication guide, Berkeley Protocol page, SecureDrop docs, TikTok, Meta and OSINT job postings, EBU Spotlight guide (404), TrustCon 2024 listing, Persona post, SpyCloud page, Castle blog, arXiv 2512.19061, arXiv 2505.10867, Stanford Internet Observatory page, Twitter 2019 post, Meta threat reporting index, Maltego CE and CTAS pages, Linkurious ICIJ and collaboration posts, Prophecies docs, Aleph export guide, Aleph Pro announcement, OpenSanctions FAQ, Kumu and Oligrapher guides, Offshore Leaks download page, Global Witness report, Cambridge Intelligence post. DFRLab figures are as reported in `social-media-disinformation-and-marketing.md`. "No source found" means the
claim was searched for and not found. The graphics-editor evidence (3.4) dates from 2013 to 2017.
