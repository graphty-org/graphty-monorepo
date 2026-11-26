# Organizational Network Analysis and People Analytics Practitioners

Organizational network analysis (ONA) practitioners map the informal relationships inside a company -- who goes to
whom for advice, information, trust or energy -- and use those maps to make decisions about reorganizations,
onboarding, retention, change programs and workload. They are people analytics teams inside large employers, HR
leaders who sponsor the work, and external consultants who run ONA engagements, often in the tradition of Rob Cross's
research. They gather the network in two ways: relationship surveys that ask every employee to name colleagues
("active" ONA), and collaboration metadata from email, calendar and chat systems ("passive" ONA), joined in both cases
to HR attributes such as department, level, location and tenure. Graph software is central to their work, but the
network is never the deliverable on its own: the output is an executive readout in which individuals are protected,
groups are compared, and a small number of decisions are argued from the structure. Four neighboring groups work on
the same people graph with different data and questions: org design and workforce planning practitioners who edit the
formal reporting hierarchy, leadership development facilitators who run personal (egocentric) network assessments,
internal communications and community managers who analyze enterprise social network activity, and HR technology
teams building person-by-skill graphs for internal talent matching.

## 1. Population

**Job titles seen in the evidence.** People analytics manager, lead or senior manager; people data scientist; head of
talent science and analytics (Keith McNulty at McKinsey, author of a handbook on graphs in people analytics [S30]);
senior HR director (Cisco [S20]); Insights Analyst (the Viva Insights role that runs network queries [S6]); organizational development or change consultant;
independent ONA consultant (Innovisor, OrgMapper, Activate Networks, Connected Commons members [S16][S23][S25]);
org design consultant and workforce planning analyst (users of Orgvue, Visier Organization Design and Workday Adaptive
Planning [S53][S54][S55]); executive coach or leadership development facilitator using a personal network assessment
[S57]; internal communications and community manager reading Viva Engage or SWOOP network reports [S59][S60].
Academic-practitioners also run engagements: Michael Arena led GM's network program, which he describes as a voluntary
community of about 8,000 people, before moving to AWS [S24].

**Sectors.** Large employers everywhere: automotive (GM [S24]), telecom [S25], consumer goods (an 8,000-person CPG
division [S27]), professional services (Booz Allen [S28]), energy (GE Renewable Energy, about 43,000 staff [S28]),
banking [S19][S28], software (Carta, 250 employees [S17]; Ramco [S20]) and public sector (a 155-person city
workforce [S33]).

**Population size and adoption.** No source gives a head count of ONA practitioners. i4cp, which partners with Rob
Cross, says ONA is "utilized by only a handful of organizations" despite its popularity, and its Connected Commons
consortium exists to teach member companies to run survey ONA themselves with low-cost software [S26]. Passive ONA
through Viva Insights is not on by default. Its network, meeting, email and chat data ("behavioral insights") are
disabled for every customer new after November 15, 2025, and for earlier customers with no analyst assigned since May
2025 or no advanced-analysis query ever created; while off, Viva Insights uses only Copilot analytics and analysts
"can't run custom meeting queries, cross-collaboration queries, or external collaboration queries" [S61]. A tenant's
passive network data may simply not exist until an admin opts in; no source counts the tenants that have.

**How often they touch graph tools.** Survey ONA is episodic: 3 to 5 weeks for a pilot or 6 to 10 weeks enterprise-wide,
re-run every 3 to 6 months or after a major change [S22]. Passive ONA is continuous: Viva queries can auto-refresh
weekly or monthly [S6] and Worklytics recommends 30-day, 90-day and 12-month windows [S12]. Org design work is project
based, around a restructuring or cost program [S53][S55].

**Skill profile.** Graph literacy is moderate: practitioners know degree, betweenness, brokerage, density, communities
and the E-I index, and they read role labels (central connector, broker, boundary spanner, peripheral person) more
fluently than formulas [S3][S4]. Coding ability is split. In-house data scientists work in R or Python (Microsoft's
vivainsights package wraps igraph and ggraph [S9][S10]; job postings for people data science ask for Python, R, SQL
and "network analysis" [S34]). HR leaders and many consultants do not code and work in Polinode, Kumu, Gephi or
UCINET with spreadsheets [S1][S13][S23].

**Team context.** A typical survey ONA has an executive sponsor, an HR business partner, a people analytics analyst or
external consultant, and Legal, Privacy and employee representatives who approve the data use before collection
[S22][S35]. In Germany a works agreement with the works council is the usual legal basis for processing employee
collaboration data [S35].

## 2. Personas

### 2.1 Priya Natarajan -- in-house people analytics lead who runs survey ONA (id: people-analytics-ona-lead)

- **Role and background.** Leads a three-person people analytics team at a 6,000-person manufacturer. I/O psychology
  master's; writes SQL and some R.
- **Tools today.** Polinode for the survey and first network views [S1][S2]; Excel for the HRIS join; Gephi for one
  polished map [S23]; PowerPoint.
- **Data.** A roster of 300 to 2,000 employees in the target unit; four or five relationship questions (information,
  problem-solving advice, decision approval, energy, "I need more access to this person"); HR columns for business
  unit, function, level, location, tenure band, gender and manager.
- **Goals.** Show the executive team where silos and bottlenecks sit before a reorganization; find the 3 to 5 percent of
  people carrying a disproportionate share of collaboration and relieve them [S3][S4]; identify connectors to recruit
  as change agents [S16][S17].
- **Frustrations.** Response rates that stall at 60 percent and leave holes in the map [S11][S14]; executives who want
  names when the consent letter promised confidentiality [S24]; hairballs that need hand styling; redoing all cleanup
  for the next wave.

### 2.2 Marcus Hale -- independent ONA consultant (id: ona-consultant)

- **Role and background.** Former strategy consultant running three to six ONA engagements a year for change and
  post-merger programs; strong on interpretation, light on code.
- **Tools today.** A network survey tool (Polinode, OrgMapper, Optimice) [S1][S23][S36]; UCINET or Gephi [S37][S23];
  Kumu for client-clickable maps [S13]; PowerPoint templates.
- **Data.** Client rosters of 150 to 5,000 people; 3 to 6 relationship questions; attributes the client sends (legacy
  company, region, function, level); sometimes 15 weeks of email logs for comparison with the survey [S25].
- **Goals.** Deliver a readout that leaders act on within the engagement: decision-rights changes, deputies for
  overloaded leaders, cross-boundary forums, a list of change agents [S22][S25]; sell a follow-up wave to measure
  impact.
- **Frustrations.** Every client's roster is different (duplicate names, contractors, leavers mid-survey); rebuilding
  the same 20 slides by hand for each client; no clean way to compare wave 1 with wave 2 when the org chart changed in
  between; executives who over-read a force-directed picture.

### 2.3 Dana Okafor -- workplace analytics analyst on passive data (id: workplace-collaboration-analyst)

- **Role and background.** Data scientist in a people analytics team at a 40,000-person company on Microsoft 365. Holds
  the Insights Analyst role. Fluent in R and Python. Her first dependency is the Viva Insights admin, who must have
  turned on behavioral insights and Advanced Analysis before any network query runs [S61].
- **Tools today.** Viva Insights person-to-person, group-to-group and Change management queries as CSV [S6][S8]; the
  vivainsights packages (`network_p2p`, `network_g2g`) [S9][S10]; Power BI; occasionally Gephi (Microsoft's
  workgroup-mapping team used it with ForceAtlas2 and Louvain [S31]).
- **Data.** Pseudonymized collaborator pairs with monthly tie scores, group collaboration minutes and HR attributes;
  10,000 to 100,000 nodes [S31].
- **Goals.** Measure whether a reorganization produced the intended cross-team collaboration, flag groups becoming
  insular, track new-hire network growth, publish monthly dashboards to leaders [S8][S32].
- **Frustrations.** Network data that does not exist because behavioral insights were never enabled, then a five-day
  wait after they are [S61]; canned views; `network_p2p` plots "may take a long time" on big graphs, so she renders to
  PDF [S9]; minimum group size of 5 suppresses small teams [S7]; explaining that layout shapes the picture [S10].

### 2.4 Elena Ruiz -- HR business partner who reads and presents ONA results (id: hr-business-partner)

- **Role and background.** HR business partner to a division president. Not an analyst; reads dashboards and slides,
  and holds the one-on-one conversations that follow an ONA.
- **Tools today.** Power BI or Viva dashboards, PowerPoint decks, a shared Kumu or Polinode view link [S13][S2].
- **Data.** Never sees row-level network data in confidential projects; sees group-level matrices, role counts and, for
  named leaders who consented, their own percentile [S24].
- **Goals.** Turn the readout into actions: relieve overloaded leaders, push decisions down, plan onboarding ramps,
  pick change agents, and explain results to employees without breaking trust [S22][S24].
- **Frustrations.** Maps she cannot explain to her president; findings that cannot be shown because a group is below
  the minimum size; no way to "drill in" without seeing names she is not allowed to see.

### 2.5 Sam Whitfield -- org design consultant (id: org-design-consultant)

- **Role and background.** Works in an HR transformation practice or as an internal HR planning analyst; runs
  spans-and-layers diagnostics and restructuring scenarios for cost programs. Strong in Excel; not a network analyst.
- **Tools today.** Orgvue, Visier Organization Design or Workday Adaptive Planning Org Design and Scenario Modeling
  (vendor-reported features) [S53][S54][S55]; PowerPoint and spreadsheets for the business case.
- **Data.** The HRIS position hierarchy (position id, parent position id, incumbent, grade, cost, location), often for a
  whole enterprise; one scenario copy per design option.
- **Goals.** Find managers with too few or too many direct reports and positions below the target layer count; model a
  to-be structure; show headcount, cost and span changes against the baseline [S54][S55].
- **Frustrations.** No source found beyond vendor pages. The vendor documentation read here shows no informal-network
  data, so ONA results and hierarchy redesign appear to live in different tools.

### 2.6 Grace Lin -- leadership development facilitator (id: leadership-network-coach)

- **Role and background.** Executive coach or L&D facilitator running a cohort program for 20 to 40 managers.
- **Tools today.** A personal network assessment such as Cross's diagnostic (book appendix with an online version)
  [S57], the Connected Commons multi-rater network assessment with a five-module virtual course [S26], or a general
  survey tool with an ego-network template [S58].
- **Data.** One small egocentric network per participant: the people they name from free recall, ratings of each
  contact (level, function, frequency, what the tie provides), and sometimes whether those contacts know each other
  [S58][S62]. No organization-wide roster.
- **Goals.** Show each participant the makeup of their network -- for example over-reliance on peers at one level or a
  network confined to one division -- and agree on actions such as delegating decision rights or a rotation [S62].
- **Frustrations.** General survey tools treat named contacts as text fields, not nodes [S58]; producing one readable
  map per participant by hand.

### 2.7 Tom Brennan -- internal communications and community manager (id: esn-community-manager)

- **Role and background.** Runs the enterprise social network (Viva Engage, formerly Yammer) for a large employer.
- **Tools today.** Viva Engage network and community analytics (network admins and corporate communicators; the
  Network analytics dashboard appears only when at least 50 percent of users hold a qualifying license) [S59]; SWOOP
  Analytics for persona and influence reports and benchmarks [S60][S63].
- **Data.** Posts, replies, reactions and mentions per community over a rolling window.
- **Goals.** Raise the share of active, two-way participants; spot communities that depend on one or two hubs.
- **Frustrations.** SWOOP's 2025/26 benchmark of about 17 million interactions from about 3 million employees in 5,758
  communities at 73 enterprises reports a drift toward one-way broadcasting [S64].

## 3. Use cases (1-10 are core ONA, ranked by evidence and stakes; 11-14 come from the neighboring groups)

| Rank | Question answered with the graph                                                                                                   | Frequency                                                              | Stakes                                                                                                                                                                                                        |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | Where are the silos and bottlenecks between units, and did a reorganization or merger change them?                                 | Every reorganization or integration; Viva ships a template for it [S8] | High: reorganization design, integration success; Microsoft's template ranks new, lost and changed group ties [S8]; Activate's telecom case found sub-function, not legacy company, drove collaboration [S25] |
| 2    | Who is overloaded -- who carries a disproportionate share of requests, and who do others say they need more access to?             | Most survey ONAs include it                                            | High: burnout and attrition of key people; 3 to 5 percent of employees contribute 20 to 35 percent of value-added collaborations [S3]; in one merger about 5 percent absorbed over 40 percent of demands [S3] |
| 3    | Who are the informal influencers, connectors and brokers to recruit for a change program?                                          | Every change program that uses ONA                                     | Medium to high: Innovisor targets the 3 percent who influence 90 percent [S16]; GM's 200 to 300 brokers and energizers spread ideas [S24]                                                                     |
| 4    | Are new hires integrating into the network, and how fast?                                                                          | Recurring; onboarding programs                                         | Medium: Microsoft found new hires still well below tenured staff after 24 weeks [S32]; the CPG case found new joiners took 2 to 3 years to reach high-performer network sizes [S27]                           |
| 5    | Which people or roles are at retention risk because of network position (peripheral, energy-draining, isolated after a role move)? | Periodic, linked to attrition models                                   | High for the individuals; Booz Allen added network factors to an attrition model and built onboarding around five of them [S28]                                                                               |
| 6    | Who are the hidden integrators and experts the org chart misses, and should recognition or pay change?                             | Occasional                                                             | High: a bank's hidden integrators generated over six times average cross-selling revenue; pay was adjusted after several left [S28]                                                                           |
| 7    | How do decision and approval flows run, and can decisions be pushed down?                                                          | Occasional, with operating-model work                                  | Medium: at one firm 15 percent of the network made 65 to 70 percent of decisions; leaders pushed decisions deeper [S24]                                                                                       |
| 8    | Does inclusion hold at the network core (gender, location, remote workers), not just in headcount?                                 | Growing                                                                | Medium: Arena proposes checking that the core's mix matches the workforce [S24]                                                                                                                               |
| 9    | How did remote or hybrid work change cross-group ties?                                                                             | Spiked 2020-2022, still recurring                                      | Medium: remote work cut cross-group collaboration time by about 25 percent at Microsoft [S29]                                                                                                                 |
| 10   | Whose departure would fragment the network or cut groups off, and where should we build redundancy?                                | With retirements, layoffs, succession planning                         | High: Parise, Cross and Davenport studied knowledge loss through ONAs at 80 organizations; losing a broker can split a network into isolated subgroups [S65]                                                  |
| 11   | Are spans and layers on target, and what do headcount, cost and spans look like under a proposed structure?                        | Every restructuring or cost program                                    | High: decides positions and cost; tools flag off-target spans and excess layers [S54][S55][S53]                                                                                                               |
| 12   | What does my own network look like, and how should I change it? (egocentric, per leader)                                           | Each leadership cohort                                                 | Medium: individual development; high performers' networks tend to bridge subgroups rather than be large [S62]                                                                                                 |
| 13   | Which enterprise social communities depend on a few hubs, and who engages versus broadcasts?                                       | Continuous, monthly reporting                                          | Medium: SWOOP's Influencer Risk Score measures the drop in reach from the first- to third-ranked person [S63]                                                                                                 |
| 14   | Who internally has most of the skills a role or project needs?                                                                     | Recurring with internal mobility                                       | Medium: skills graphs match people at 80, 90 or 100 percent of a requirement (vendor-reported) [S66][S67]; see knowledge-graph-engineers-and-graphrag.md                                                      |

## 4. Step-by-step workflows

### 4.1 Survey-based ONA engagement, from design to executive readout

Sources: Polinode [S1][S2]; Optimice course [S36]; Agneessens and Labianca [S14]; Arena [S24]; consulting framework
[S22]; Visible Network Labs [S11].

1. **Define the business question and boundary (days 1-5).** Name one purpose ("influencers for what?") before
   collecting anything [S24]. Choose the population boundary (one business unit, the top 200 leaders [S25], or the whole
   company) and whether external partners are in scope [S22].
2. **Get approvals (1-2 weeks, overlapping).** Legal, Privacy, HR and employee representatives approve purpose,
   access and retention; in Germany a works agreement [S35]. Decide the transparency level up front: confidential
   (only the analytics team sees names -- "the norm"), fully transparent (GM's volunteers saw their own connections), or
   anonymous (rare) [S24]. Network surveys cannot be anonymous to the researcher because respondents name others [S38].
3. **Build the roster (2-3 days).** Export from the HRIS: Name, Email, optional firstName, plus attribute columns
   (department, location, level, tenure) that become node attributes; names must be unique, so append the email [S1].
   Do not ask in the survey for data the HRIS already holds [S36].
4. **Write the questions (2-5 days).** Typically 5 to 10 questions in total [S22], of which 2 to 3 relationship types
   is a common multiplex design [S39]. Common relationship prompts: information ("who do you go to for information
   to get your work done"), problem-solving advice ("who do you typically turn to for help in thinking through a new
   or challenging problem") [S4], trust (whom you would trust to keep work concerns confidential, from Krackhardt and
   Hanson's advice/trust/communication scheme) [S40], energy (who energizes or drains you) [S4], and access ("would
   greater access to this person help your performance" -- Cross flags overload when more than a quarter of a
   person's contacts say they need more access [S28]). Rating follow-ups (frequency Never / Once / Quarterly / Monthly
   / Weekly / Daily, or tie strength Very weak to Very strong [S39]) must be numeric codes [S36]. Large rosters use
   Search and Select because multiple choice becomes infeasible above about 200 names [S1]. Decide roster (closed)
   versus open ("snowball", two or three waves at most) [S36][S39].
5. **Pilot and launch (1 day + 2-3 weeks fieldwork).** Preview, send a test email, pilot with a few people [S36]. The
   invitation states the purpose, what the data will not be used for (for example performance evaluation), and how
   identities are handled [S24]. Reminders go to Not Started and Started respondents [S1].
6. **Monitor response (daily during fieldwork).** Target 60 to 70 percent at minimum because a tie is only seen if at
   least one of the pair responds [S11]; evaluators' guidance is 70 to 80 percent [S15]. Published organizational
   cases report 66 percent (142 of 215) [S33] and 92 percent (143 of 155) [S33]. Close the survey by setting it to
   Completed [S1].
7. **Generate the network (hours).** Polinode's Generate Networks offers All Questions, Combine Questions, Exclude
   Self-selections, Exclude Unselected and Anonymize Nodes [S1]. In Gephi: import an edge list (Source = respondent,
   Target = nominee) and a node file with the Sum merge strategy so repeated nominations add up, then check node and
   edge counts [S23].
8. **Handle non-respondents (hours, a judgment call).** Non-respondents still appear as nominated nodes with incoming
   ties only [S41]. Options: keep them and use in-degree-based measures, which are robust to random missingness and
   computable for non-respondents [S15]; reconstruct their ties from what respondents reported (Stork and Richards),
   which Huisman found stable for undirected networks with up to 40 percent non-response but weaker for directed
   ones [S41]; or drop them. Representativeness matters more than the raw rate [S42]; uneven non-response across
   units distorts specific structures even when communities are recoverable [S43].
9. **Compute metrics (hours).** In Polinode's Manage Metrics: In/Out/Total Degree, Betweenness, Closeness, Eigenvector,
   Communities (Louvain, with resolution and maximum size options) and about 35 others; metrics are computed on the
   visible (filtered) network [S2]. Typical role
   reading: high in-degree on information or advice = central connector and overload risk; high betweenness = broker
   or bottleneck; ties that cross units = boundary spanner; low degree = peripheral, often new hires [S4][S5].
10. **Build the views (1-3 days).** Force-directed layout or Org Chart / Tree for the formal hierarchy; color by unit, size by in-degree; Roll-up groups
    nodes by a categorical attribute; the Collaboration Matrix shows ties between groups; filters stack with AND logic
    [S2]. OrgMapper recommends ForceAtlas2 above about 100 nodes and Fruchterman-Reingold below [S23].
11. **Executive readout (1-2 meetings).** Show formal org chart and informal network side by side [S25]; anchor on
    what leaders know and frame findings positively, for example by first showing executives their own centrality
    [S44]; for confidential projects, do not show the full network to executives -- tell each leader whether they are
    in the top 15 percent or top 5 percent of people others want access to, with HR following up one-on-one, and group
    the rest as "the other 85 percent" [S24]. Review sensitive findings subgroup by subgroup rather than in a
    department-wide meeting [S44].
12. **Hand off and plan wave 2.** Deliver action plans (deputies for overloaded connectors, decision-rights changes,
    cross-boundary forums, onboarding ramps) and schedule a re-measurement in 3 to 6 months [S22].

**Elapsed time.** 3 to 5 weeks for a pilot, 6 to 10 weeks enterprise-wide [S22]; per-step durations are this
document's estimates.

### 4.2 Building a network from passive collaboration metadata

Sources: Microsoft Learn [S6][S7][S8][S61]; workgroup-mapping paper [S31]; new-hire paper [S32]; Worklytics
[S12][S45]; email tie thresholds [S46].

0. **Get the data turned on (Viva).** The AI admin or Viva Insights admin enables Behavioral insights in Viva Feature
   Access Management in the Microsoft 365 admin center (or by PowerShell) and also selects Advanced Analysis; processing
   takes five days before analysts can run network queries [S61].
1. **Connect sources and pseudonymize at ingestion.** Worklytics' Psoxy proxy runs in the customer's cloud,
   allowlists metadata fields and replaces emails with tokens; the same algorithm and secret must be applied to the
   HRIS export so the two join [S45]. Viva supports partitions, keyword and domain suppression and an end-user opt-out
   for row-level outputs [S7].
2. **Define what counts as an interaction.** Viva's "reciprocal interaction" in a 4-week window is: a 1:1 meeting or
   unscheduled call; an action and a response through chats with 8 or fewer participants or emails with 18 or fewer
   participants; or both attending a meeting within the meeting threshold [S8]. The legacy meeting exclusion dropped
   single-attendee, 8-hour-plus, 250-plus-attendee and cancelled meetings [S47]. Microsoft's workgroup mapping drew an edge when two people exchanged at least 4 emails in a month
   with at least 1 in each direction [S31]. The new-hire study weighted reciprocal edges by the geometric mean of the
   two directed counts, sqrt(w(i->j) * w(j->i)) [S32]. Other studies used 5 to 10 reciprocated emails a year [S46]. Worklytics' rule is to filter automated traffic, separate internal
   from external participants, and keep edge rules stable across periods [S12]. The practitioner chooses the window
   (30 days, 90 days, 12 months [S12]; at least 3 months each side of a change [S8]).
3. **Project group interactions (two-mode data).** Meetings, group chats, channels and multi-recipient emails are
   person-by-event records; turning them into person-to-person ties is a projection, and its weighting decides the
   network. Choices seen: a participant cap (Viva's 8 and 18 above; the new-hire study: groups under 10), and dividing each interaction by its number of recipients so a 9-person meeting counts less per
   pair than a 1:1 [S32]. The new-hire study kept one-on-one and group layers separate: mean distinct contacts per
   person were 3.87 (1:1 meetings) versus 12.68 (group meetings) [S32].
4. **Run the query.** Viva person-to-person: Time period (default last 3 months; 1 month, 6 months, 1 year or custom),
   optional Auto-Refresh, metrics Strong tie score/type and Diverse tie score/type (strong = reciprocal interaction
   and many shared connections; diverse = few shared connections), primary and secondary collaborator filters, HR
   attributes; output CSV pair rows (PrimaryCollaborator_PersonId, SecondaryCollaborator_PersonId, attributes,
   MetricDate, scores) [S6].
5. **Load and analyze.** In R: `network_p2p(data, hrvar = "Organization", centrality = "betweenness", community =
"leiden", comm_args = list(resolution = 0.1), layout = "mds", return = "plot" | "table" | "data" | "network" |
"sankey", seed = 1)`; layout defaults to deterministic multidimensional scaling and `"plot-pdf"` is recommended for
   large graphs [S9]. `network_g2g` plots group collaboration time with an `exc_threshold` that hides small edges
   [S10]. Microsoft's guidance: read the summary tables first, form hypotheses from knowledge of the organization,
   test across date ranges and populations, and only then tune the visual, because layout and styling shape what
   appears [S10][S48].
6. **Aggregate before showing.** Minimum group size is at least 5 for Power BI templates and leader views [S7].
   Workgroup mapping reported metrics only in aggregate above a minimum sample size, kept degree as the only
   individual property (for node size), and hid links in executive maps [S31].
7. **Deliver.** Unlabeled maps colored by workgroup, a 2x2 scatter of workgroup metrics, animations of change over
   time, generated into PowerPoint by an automated pipeline that allowed up to 4 presentations a week instead of one
   every 2 to 4 weeks by hand [S31].

### 4.3 Measuring a reorganization or merger with before/after group networks

Source: Viva Insights Change management ONA documentation [S8]; Activate Networks telecom case [S25].

1. **Set up.** Choose a before period and an after period (at least three months each), filter the population, pick
   up to three HR attributes for grouping (an attribute with more than 100 values cannot be selected [S8]), then rename or combine attribute values so the before and after groups
   match ("Inventory Management" + "Facilities" -> "Internal services"), and choose up to three focus groups [S8].
2. **Read the three insight cards.** Significant change in collaboration (ranked: new ties between existing groups,
   lost ties, significant changes, net new groups, lost groups -- significance is a combined rank of absolute percent
   change and absolute magnitude); Showing signs of insularity (E-I index, -1 all internal to +1 all external; -0.67 is a
   5:1 internal ratio and marks silo risk; a drop of 0.1 or more flags increased insularity); Brokers of information
   flow (a Bridging Index; the top five groups get a bridging rank, with arrows for groups entering or leaving the top
   five) [S8].
3. **Explore.** Side-by-side before/after group graphs: node size = group size, segments colored by a second attribute,
   edge thickness = collaboration amount, after-view edges green for increase and purple for decrease, a gray "Other"
   node collapsing filtered groups, "Expand both groups" to drill into subgroups, a matrix view of change in hours or
   percent, camera icon to export the view [S8].
4. **Know the aggregation.** Group minutes are averaged across directions and summed across segments and months; E-I
   is a size-weighted average; the Bridging Index varies slightly between runs [S8].
5. **Explain drivers.** Activate Networks used network regression to test which attributes (location, rank,
   sub-function, role, legacy group) predicted community membership in both survey and email networks; 60 to 80
   percent of email ties fell inside communities and week-to-week email network correlation ran 0.84 to 0.98 [S25].

### 4.4 Finding overloaded people and change agents from a multiplex survey

1. **Keep the relationship types as separate edge sets** (Kumu connection types as filters [S13]; Polinode per question
   [S1]); advice, trust and communication networks answer different problems [S40].
2. **Overload.** For each leader, count how many name them as an important information source (41 to 105 across one
   director group) and the share who say greater access would help (15 to 36 percent); overlay on the org chart with
   span of control [S25]. Flag when more than 25 percent need more access [S28]. In the same case 5 percent of leaders
   held 26 percent of ties [S25].
3. **Change agents.** Rank by in-degree on energy or influence questions, then choose the smallest set that reaches
   most of the network within one or two steps. At Carta the top four influencers held 171 nominations, and two steps
   out from the top ten reached all 250 employees [S17]; Innovisor seeks the smallest group influencing 90 percent
   [S16]. GM matched brokers and energizers to spreading ideas [S24].
4. **Validate.** Combine with observation and interviews; do not rely on one metric [S23][S24].

### 4.5 New-hire integration and retention tracking

Sources: Microsoft new-hire study [S32]; McChrystal Group CPG case [S27]; Booz Allen in MIT SMR [S28].

1. Define cohort start (first outbound activity) and a matched tenured comparison group (organizational group, job
   function, manager status, location, team size) [S32].
2. Build weekly ego networks for 24 weeks; compute network size (distinct contacts), intensity (sum of weights) and
   structural diversity (components left after removing the ego) per channel [S32].
3. Model the gap with mixed-effects regressions; report cohort curves, never individual rankings [S32].
4. Join to performance and attrition data (the CPG division found network size correlated with ratings) and design
   onboarding "network ramps" [S27][S22].

### 4.6 Knowledge-loss and key-person risk

Sources: Parise, Cross and Davenport [S65]; Borgatti's key player problem [S68]; Livas, Renshaw and Butts on simulated
personnel loss [S69].

1. Rank candidates: central connectors (high in-degree on information or advice), brokers (high betweenness or
   brokerage across units) and people near retirement or at flight risk [S65].
2. Remove each candidate, then sets of candidates, from a copy of the network. Borgatti's point is that the best set is
   not the top-k individuals: removing two people can add no fragmentation while a different pair splits the network,
   so the set is searched as a whole (KPP-Neg, implemented in the R package `keyplayer`) [S68].
3. Measure the damage: fragmentation (share of pairs that can no longer reach each other), number of components, and
   change in distance between groups [S68]. Simulations on 17 World Trade Center response networks found losing
   high-degree members or coordinators did the most damage [S69].
4. Plan redundancy: introductions and mentoring around central connectors, pre-authorized decision limits so brokers
   are not bottlenecks, deputies and succession [S65]. No source gives step durations.

### 4.7 Spans and layers and scenario modeling on the reporting hierarchy

Sources: Visier Organization Design documentation [S54]; Workday Adaptive Planning 2026 R1 release notes [S55]; Orgvue
(vendor pages) [S53]. All features below are vendor-reported.

1. Import the HRIS position hierarchy; the project captures a baseline snapshot that can be refreshed later [S54].
2. Compute spans (direct reports per manager) and layers (management levels) per leader; flag managers off the span
   target and positions below the target layer [S53]. Workday colors segments Micro, Narrow, Optimal or Wide and warns,
   without blocking, when a change breaks a guideline [S55].
3. Copy the baseline into a scenario; drag organizations or positions to new parents, bulk-move, create or inactivate
   positions; Visier stages moves and exits in a holding area that also computes savings [S54][S55].
4. Watch metrics recompute live: headcount, FTE, total workforce cost, span of control, layers [S54][S55].
5. Compare scenario with baseline (hover shows Scenario, Baseline and Difference) or scenarios side by side, with
   counts of new, inactivated and moved organizations; export changes to CSV or XLSX and a deck to PowerPoint; route
   for approval [S54][S55].

### 4.8 Personal network assessment in a leadership cohort

Sources: Qualtrics and egor ego-network survey guide [S58]; Training magazine on the Personal Network Assessment [S62];
Cross's diagnostic [S57]; Connected Commons course [S26].

1. Each participant answers a name generator (free recall: "who do you go to for ...") and lists contacts; templates
   start at about five slots and expand [S58].
2. Name interpreters rate each contact: level, function, frequency, closeness, what the tie provides [S58][S62].
3. Optionally, alter-alter questions ask whether each pair of contacts knows the other, usually as one undirected
   question per pair [S58].
4. Each participant gets an ego map colored by function or level and a profile compared with patterns from research
   (diversity and bridging rather than size) [S62]; Connected Commons' assessment adds peer and team raters [S26].
5. The coach and participant agree on actions (delegation, rotation across divisions) [S62] and may re-measure; no
   source found for a standard re-measurement interval. The participant is usually the only person who sees the map.

### 4.9 Enterprise social network community analysis

Sources: SWOOP support and persona pages [S60][S63]; Viva Engage analytics [S59].

1. Choose a community or the whole network and a period (SWOOP counts a person active when they average at least one
   post, reply or reaction every two weeks) [S60].
2. Classify people by the balance of what they give and receive: Engagers balance both, Catalysts start threads that
   draw replies, Responders mostly reply and react, Broadcasters post more than they receive (orphan posts exceed
   replies, likes and mentions received), Observers rarely participate [S60].
3. Rank influence by personal network size (people engaged) and compute the Influencer Risk Score, the percentage drop
   from the first- to the third-ranked person's reach; fewer than six listed users gives no score [S63].
4. Filter by organizational attributes in Viva Engage network analytics and report against benchmarks [S59][S64].

## 5. Data

| Property                 | Survey ONA                                                                                                                                                                                                                                                               | Passive ONA                                                                                                                                                                                                                                                                                                                                              |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Source                   | Roster survey in Polinode, OrgMapper, Optimice/sumApp, Google Forms or SurveyMonkey [S1][S13][S36]                                                                                                                                                                       | Microsoft 365 (Viva), Google Workspace, Slack, Zoom, Jira and others via Worklytics connectors [S6][S12]                                                                                                                                                                                                                                                 |
| File formats             | Excel with Nodes and Edges sheets, Google Sheets, GEXF, JSON (Polinode upload) [S2]; Kumu Elements and Connections sheets [S13]; two CSVs (edge list + node attributes) for Gephi [S23]; UCINET DL and Excel for UCINET [S37]                                            | CSV query exports (pair rows with metrics and HR attributes) [S6]; GraphML from email mbox tools [S49]                                                                                                                                                                                                                                                   |
| Typical size             | Published roster surveys: 155 [S33], 215 [S33], 250 [S17], top 200 leaders [S25]. GM's roughly 8,000-person network was a voluntary open community, not a roster survey [S24]. Edges: each respondent names a handful of people per question (Carta: four or more [S17]) | 8,000 [S27] to 61,000+ [S29] people; 10,000 to 100,000 nodes in workgroup mapping [S31]; about 11,000 new hires plus matched peers in the new-hire study [S32]. Edge counts and density: no source found in these papers; the closest figures are mean distinct contacts per person of 3.87 to 12.68 by channel [S32] and modularity of 0.6 to 0.8 [S31] |
| Attribute columns        | 5 to 10 HR columns (unit, function, level, location, tenure, gender, manager, legacy company) [S1][S23][S25]                                                                                                                                                             | Same HR columns joined by pseudonymous ID; up to three used for grouping in Viva Change management [S8]                                                                                                                                                                                                                                                  |
| Identifiers and problems | Unique names (email appended); exact-match merging; leavers and contractors [S1]                                                                                                                                                                                         | Multiple IDs per person merged to one [S22]; pseudonyms must be computed identically in HRIS and SaaS exports [S45]; external domains reclassified as internal after acquisitions [S7]                                                                                                                                                                   |
| Direction and weight     | Directed nominations; numeric strength or frequency codes; repeated nominations summed [S36][S23]                                                                                                                                                                        | Reciprocity required for ties [S8][S31]; weights = minutes, counts or geometric mean [S8][S32]                                                                                                                                                                                                                                                           |
| Multiplex                | Yes: one edge set per question [S1][S13]                                                                                                                                                                                                                                 | Channels (email, chat, meetings, calls) can be separate layers [S32]                                                                                                                                                                                                                                                                                     |
| Temporal                 | Waves (before/after, annual)                                                                                                                                                                                                                                             | Weekly or monthly snapshots: 24 weekly ego snapshots per new hire over about 10 months of data [S32]; monthly networks in workgroup mapping [S31]; up to 3 years history [S12]                                                                                                                                                                           |
| Two-mode and multi-type  | No source found in survey ONA                                                                                                                                                                                                                                            | Person-by-meeting, person-by-chat and person-by-channel records projected to person-person ties [S8][S32]; person-skill, person-project and role-skill links in skills graphs [S66][S67]                                                                                                                                                                 |
| Hierarchical             | Formal reporting line from HRIS overlaid on informal network [S2][S25]                                                                                                                                                                                                   | Reporting hierarchy per month used for "freedom" metric [S31]                                                                                                                                                                                                                                                                                            |
| Sensitivity              | Personal data about named individuals, including negative ties (energy drain); cannot be anonymous to the analyst [S38]                                                                                                                                                  | Employee monitoring law; works council co-determination in Germany [S35]; vendor and Microsoft rules against using it for individual evaluation [S7][S12]                                                                                                                                                                                                |

**Three more data shapes.** (1) Hierarchy-only: position id and parent id with cost and grade, one tree per scenario,
compared with a baseline [S54][S55]. (2) Egocentric: per participant, one ego, its named contacts with ratings, and
optional undirected contact-contact ties -- many small separate graphs per cohort, each seen only by its owner [S58].
(3) Enterprise social: reply, mention and reaction events per community over a continuous window, with role
classification from in and out activity balance [S60][S63].

## 6. Analysis methods

- **Centrality.** In-degree (the workhorse for "go-to" people), betweenness, closeness, eigenvector, PageRank
  [S2][S9][S13].
- **Brokerage and boundary measures.** Brokerage in Polinode [S2]; E-I index for group insularity [S8]; Bridging Index
  for broker groups [S8]; cross-boundary density, broker concentration and routing distance as Worklytics KPIs [S12].
- **Structural holes and core-periphery.** Burt's Constraint, Effective Size and Efficiency (effective size divided by
  degree), a Core Periphery split, and External vs Internal (share of a node's ties to people with a different
  attribute value) are all in Polinode's metric list [S2].
- **Formal versus informal.** Polinode's Informal Alignment compares a person's informal ties with the reporting lines,
  and Informal Distance measures how far apart in the formal structure their informal contacts sit; Observed vs Expected
  compares tagged nominations with the expected rate [S2]. This turns the org-chart-beside-network comparison into a
  number per person.
- **Key-player removal.** Fragmentation and component change after removing a set of nodes (KPP-Neg) [S68].
- **Hierarchy metrics.** Span of control and layers per manager, recomputed on each scenario [S54][S55].
- **Activity-balance roles.** SWOOP personas from given versus received posts, replies and reactions [S60].
- **Communities.** Louvain and Leiden with a resolution parameter; hierarchical Leiden with a maximum community size
  [S2][S9][S31]. Where communities and department colors disagree, informal structure crosses formal lines [S23].
- **Ego-network measures.** Size, intensity, structural diversity (ego components) [S32]; strong versus diverse ties by
  shared connections [S6].
- **Role classification.** Central connectors, boundary spanners, brokers, peripheral people [S4]; energizers versus
  de-energizers [S50].
- **Statistical models.** Network regression of community membership on attributes [S25]; mixed-effects models of
  network growth [S32]; correlation of network size with performance and attrition [S27][S28]. Academic practice adds
  ERGMs (a longitudinal downsizing study [S51]) and missing-data imputation [S41].
- **Group-level matrices.** Collaboration Matrix and Membership Matrix (Polinode) [S2]; group-to-group change matrix in
  hours or percent (Viva) [S8].
- **Validation habits.** Tables before pictures and re-runs across date ranges [S10]; several metrics [S23]; survey
  versus email networks [S25]; interviews [S24]; response rate and missingness checks [S15][S42].

## 7. Outputs and collaboration

- **Executive readout decks.** Org chart beside informal network, maps colored by unit, org chart annotated with
  nomination counts and access percentages, regression tables [S25]; slides generated from templates [S31].
- **Protected individual feedback.** Percentile bands to consenting leaders with HR follow-up [S24].
- **Dashboards.** Power BI templates gated by minimum group size [S7]; Worklytics KPI dashboards [S12].
- **Interactive shares.** Kumu share links and presentations [S13]; Polinode view links and saved views [S2].
- **Scenario decks and change lists.** Org design exports scenario changes to CSV or XLSX and decks to PowerPoint [S54].
- **Private ego maps.** One per leadership participant, seen by the participant and coach [S62].
- **Change and action plans.** Lists of change agents, deputies, decision-rights moves, forums, onboarding ramps
  [S22][S24].
- **Reproducibility and audit.** Edge rules must stay fixed across waves or comparisons are noise [S12]; Viva records
  the metric rule a query used [S6]; Psoxy allowlists let security audit what left the tenant [S45]. Matching groups across org changes is done in Viva by renaming and combining attribute values [S8];
  no survey-tool equivalent was found.

## 8. Tools landscape and pain points

| Tool                                                          | What practitioners use it for             | Evidence of love                                                                                                                                                                 | Evidence of pain                                                                                                                                                                                                            |
| ------------------------------------------------------------- | ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Polinode                                                      | Survey plus analysis in one browser app   | Built-in roster survey, network generation with Anonymize Nodes, 35 metrics, Collaboration Matrix, saved views [S1][S2]                                                          | Respondent credits above 10 respondents [S1]; multiple choice infeasible above about 200 names [S1]; no documented wave-to-wave comparison found                                                                            |
| Viva Insights                                                 | Passive ONA at enterprise scale           | Templates with before/after, insularity and broker views; auto-refresh [S6][S8]                                                                                                  | Behavioral data off by default for new tenants, five-day processing after opt-in [S61]; canned views; Bridging Index varies between runs; attributes over 100 values unusable [S8]; group-size floors hide small teams [S7] |
| vivainsights (R/Python)                                       | Custom p2p and g2g analysis               | igraph community algorithms, seedable, tables and igraph export [S9]                                                                                                             | Plots slow on large graphs; marked experimental [S9]                                                                                                                                                                        |
| Worklytics                                                    | Passive ONA from many SaaS tools          | 25+ connectors, pseudonymizing proxy in customer cloud [S12][S45]                                                                                                                | Edge thresholds left to the customer [S12]                                                                                                                                                                                  |
| Gephi                                                         | Polished maps, exploration                | ForceAtlas2, modularity, Sum merge for repeated nominations [S23]; used by Microsoft's mapping team [S31]                                                                        | Manual import and labeling steps [S23]; not a survey tool; no privacy features                                                                                                                                              |
| Kumu                                                          | Interactive client-facing maps            | Connection types as filters, decorate by metric, presentations, share links [S13]                                                                                                | Metrics limited to the basics on its SNA page [S13]                                                                                                                                                                         |
| UCINET / NetDraw                                              | Academic-style analysis by consultants    | Standard measures, DL format, attribute-driven node styling [S37]                                                                                                                | Old Excel format requirements [S37]                                                                                                                                                                                         |
| Viva Engage analytics and SWOOP                               | Enterprise social network health          | Network analytics with organizational attribute filters [S59]; SWOOP personas, Influencer Risk Score, cross-company benchmarks [S60][S63][S64]                                   | Engage dashboard needs at least 50 percent of users licensed [S59]; persona and risk rules are vendor-defined [S63]                                                                                                         |
| Orgvue, Visier Organization Design, Workday Adaptive Planning | Spans and layers, restructuring scenarios | Baseline plus scenarios, live headcount, cost, span and layer metrics, scenario comparison, PowerPoint export (vendor-reported) [S53][S54][S55]                                  | Their documentation shows no informal-network data in the same view; no independent evaluation found                                                                                                                        |
| Innovisor, OrgMapper, Confirm, Humanyze, TrustSphere          | Specialized ONA services                  | Influencer surveys (OrgMapper's has 18 questions across five dimensions [S23]); ONA in performance reviews (Confirm [S52]); badges with about 90 percent opt-in (Humanyze [S19]) | Mostly vendor claims; little published validation [S16][S52]                                                                                                                                                                |

**Cross-cutting pain points.** Surveys depend on high response and burden respondents, while passive data measures
volume, not trust or value, and can produce false signals [S19][S26]. Employees may see ONA as surveillance or
betrayal [S19]. Over-interpreting force-directed pictures is a known trap [S10][S22]. Managers acting on network data
(for example removing non-central people) can harm individuals and poison later data collection [S38].

## 9. Requirements implied

Existing Graphty personas and workflows in `design/designloom` cover community detection (W04), path and hub work
(W05, W17), findings communication (W15), import and validation (W18) and network evolution (W19). None mentions
surveys, rosters, non-respondents, HR joins, privacy aggregation, hierarchies as editable data, or ego networks.

| Capability                                                                                                                                                                  | Priority    | Covered by existing personas/workflows?                                                            |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | -------------------------------------------------------------------------------------------------- |
| Import an edge list plus a separate node-attribute table and join them on an ID, reporting unmatched IDs (nominees not on the roster, roster people never named)            | must-have   | Partly (W18 covers import, not roster joins)                                                       |
| Multiplex edges: one edge set per relationship question, filter and style by edge type, combine types with a chosen rule (sum, any, all)                                    | must-have   | NOT covered                                                                                        |
| Respondent versus non-respondent flag on nodes, with in-degree-only measures and a visible marker that out-ties are unknown; optional reconstruction from reported ties     | must-have   | NOT covered                                                                                        |
| Directed, weighted nominations with numeric strength; repeated nominations summed on import                                                                                 | must-have   | Partly                                                                                             |
| Group roll-up: collapse nodes by an attribute into group nodes with sized nodes and aggregated edge weights, plus a group-by-group matrix view                              | must-have   | NOT covered                                                                                        |
| E-I index, density within and between groups, brokerage roles (Gould-Fernandez style) and boundary-spanner counts per attribute                                             | must-have   | NOT covered (W04 has communities, not attribute-based boundary measures)                           |
| Privacy controls in the element: anonymize labels, hide individuals below a minimum group size, show only aggregates, suppress specific attributes                          | must-have   | NOT covered                                                                                        |
| Org chart (reporting tree) layout and side-by-side formal versus informal views of the same people                                                                          | must-have   | NOT covered                                                                                        |
| Before/after comparison of two waves with group matching (rename or merge attribute values), edge color by increase or decrease                                             | must-have   | Partly (W19 covers evolution, not group matching or wave comparison)                               |
| Ego-network metrics over time: size, intensity, structural diversity per channel                                                                                            | should-have | Partly (W19)                                                                                       |
| Minimum set of nodes covering a share of the network within k steps (change-agent selection)                                                                                | should-have | NOT covered                                                                                        |
| Percentile banding output for individuals (top 5 / top 15 percent) instead of exact ranks                                                                                   | should-have | NOT covered                                                                                        |
| Reproducible edge rules (thresholds, window, reciprocity) saved with the project and applied identically to the next wave                                                   | should-have | NOT covered                                                                                        |
| Deterministic, seedable layouts so the same data gives the same picture across readouts                                                                                     | should-have | Partly (element offers seeds)                                                                      |
| Export of de-identified views and tables to slides and spreadsheets                                                                                                         | should-have | Partly (W15)                                                                                       |
| Two-mode import and layout (person-event, person-skill), and projection to one-mode with a selectable weight: count, divided by event size, capped by participant count     | must-have   | NOT covered                                                                                        |
| Burt's constraint, effective size and efficiency; core-periphery fit; External vs Internal per attribute                                                                    | must-have   | NOT covered                                                                                        |
| Formal-hierarchy-aware measures: each pair's network distance compared with their distance on the org chart, and per-person alignment of informal ties with reporting lines | must-have   | NOT covered                                                                                        |
| Interactive, non-destructive node or set removal with deltas in components, fragmentation, reach and between-group distance; key-player set search                          | must-have   | NOT covered                                                                                        |
| Expandable, collapsible tree layout for enterprise hierarchies (tens of thousands of positions; GE Renewable Energy alone has about 43,000 staff [S28])                     | must-have   | NOT covered                                                                                        |
| Editable parent links (drag a node or branch to a new parent) on a scenario copy, with spans, layers and attribute sums (headcount, cost) recomputed live                   | should-have | NOT covered                                                                                        |
| Diff of two hierarchies or two graphs over the same people: moved, added, removed nodes and changed metrics, side by side                                                   | should-have | Partly (W19)                                                                                       |
| Many small ego networks per project: one map per participant from ego, alters and alter-alter tables, batch styled and exported, each private to its owner                  | should-have | NOT covered                                                                                        |
| Activity-balance role classification from directed in and out counts, and concentration of reach among top-ranked nodes                                                     | could-have  | NOT covered                                                                                        |
| Formats used here: Excel Nodes/Edges sheets, Kumu-style Elements/Connections sheets, Polinode GEXF/JSON, UCINET DL, Viva p2p CSV pair rows                                  | should-have | Partly (graph-io has CSV, GEXF, GraphML; no Excel or Viva pair-row mapping found in this research) |

## 10. Sources

- [S1] https://docs.polinode.com/guide/surveys.html -- Polinode survey steps.
- [S2] https://docs.polinode.com/guide/networks.html -- Polinode file formats.
- [S3] https://archive.news.virginia.edu/content/qa-how-much-workplace-collaboration-too-much/ -- Cross on collaboration overload figures.
- [S4] https://dmccreary.github.io/organizational-analytics/appendices/hidden-power-of-social-networks-book -- Summary of Cross and Parker's network types and roles.
- [S5] https://www.slideshare.net/slideshow/leadership-in-networks-teigland-jun2013/22957423 -- Course slides with the problem-solving prompt and role definitions (via search summary).
- [S6] https://learn.microsoft.com/en-us/viva/insights/advanced/analyst/cross-collaboration-p2p -- Viva person-to-person query steps.
- [S7] https://learn.microsoft.com/en-us/viva/insights/advanced/setup-maint/privacy-settings -- Minimum group size of at least 5.
- [S8] https://learn.microsoft.com/viva/insights/advanced/analyst/change-management-queries -- Change management ONA.
- [S9] https://search.r-project.org/CRAN/refmans/vivainsights/html/network_p2p.html -- network_p2p signature and defaults.
- [S10] https://microsoft.github.io/vivainsights/articles/network-analysis.html -- vivainsights ONA workflow and validate-before-visualize guidance.
- [S11] https://visiblenetworklabs.com/2022/04/06/raising-your-response-rate-a-brief/ -- Network surveys need 60-70 percent response.
- [S12] https://www.worklytics.co/blog/measuring-knowledge-sharing-and-innovation-via-ona -- Worklytics edge rules.
- [S13] https://docs.kumu.io/disciplines/sna-network-mapping -- Kumu SNA workflow.
- [S14] https://iris.unitn.it/retrieve/e3835199-5208-72ef-e053-3705fe0ad821/Agneessens%20Labianca%202022.pdf -- Agneessens and Labianca primer on survey network data in organizations (abstract level).
- [S15] https://aea365.org/blog/?p=4753 -- Evaluator guidance.
- [S16] https://www.innovisor.com/2025/12/02/why-you-should-not-map-networks-during-workshops/ -- Innovisor survey question and #ThreePercentRule.
- [S17] https://carta.com/sg/en/blog/the-shadow-organizational-chart/ -- Carta influencer case.
- [S19] https://d3.harvard.edu/platform-peopleanalytics/submission/organizational-network-analysis-overcoming-common-pitfalls/index.html -- ONA pitfalls.
- [S20] https://www.shrm.org/topics-tools/news/technology/human-network-analysis-next-frontier-people-analytics -- GM, Ramco, Cisco cases; vendors named.
- [S22] https://umbrex.com/resources/frameworks/organization-frameworks/organizational-network-analysis-ona/ -- Consulting framework.
- [S23] https://orgmapper.com/gephi-tutorial -- OrgMapper Gephi workflow for survey ONA.
- [S24] https://www.i4cp.com/productivity-blog/awss-michael-arena-how-organizational-network-analysis-works-in-the-real-world -- Arena.
- [S25] https://www.slideshare.net/slideshow/the-network-approach-to-change-initiatives/26073709 -- Activate Networks (Cross) telecom case.
- [S26] https://www.i4cp.com/productivity-blog/how-to-leverage-organizational-network-insights-without-conducting-an-ona -- Connected Commons.
- [S27] https://www.mcchrystalgroup.com/capabilities/case-study/detail/2023/07/28/harnessing-data-to-identify-burnout-early-and-boost-retention -- McChrystal Group 8,000-person CPG passive ONA case.
- [S28] https://sloanreview.mit.edu/article/collaborate-smarter-not-harder -- Cross, Davenport, Gray.
- [S29] https://www.eurekalert.org/news-releases/927729 -- Remote work study of 61,000+ Microsoft employees.
- [S30] https://www.routledge.com/Handbook-of-Graphs-and-Networks-in-People-Analytics-With-Examples-in-R-and-Python/McNulty/p/book/9781032204970 -- McNulty handbook and author role.
- [S31] https://ar5iv.labs.arxiv.org/html/2005.00402 -- Workgroup mapping.
- [S32] https://ar5iv.labs.arxiv.org/html/2304.03441 -- Microsoft new-hire network study: cohort.
- [S33] Search summaries of https://arxiv.org/pdf/2202.05903 (city workforce, 92 percent, 143 of 155) and a production and sales company study (66 percent, 142 of 215) returned with https://arxiv.org/pdf/2201.01290 results.
- [S34] https://builtin.com/job/data/senior-manager-people-data-science/318102 -- Job posting listing network analysis with Python.
- [S35] https://apps.eurofound.europa.eu/legislationdb/employee-monitoring-and-surveillance/germany -- German works council co-determination and Section 26 BDSG.
- [S36] https://www.slideshare.net/slideshow/organizational-network-analysis-ona-practitioner-course-setting-up-the-survey/28663045 -- Optimice practitioner course on survey setup.
- [S37] https://faculty.ucr.edu/~hanneman/nettext/C6_Working_with_data.html -- Hanneman on UCINET data handling; https://study.sagepub.com/borgatti2e/student-resources/chapter-5/chapter-5-data-management -- DL formats.
- [S38] https://scholars.uky.edu/en/publications/toward-ethical-guidelines-for-network-research-in-organizations/ -- Borgatti and Molina on ethics of organizational network research.
- [S39] https://visiblenetworklabs.com/2025/10/20/50-social-network-analysis-survey-questions/ -- Question prompts.
- [S40] https://heller.brandeis.edu/executive-education/maine-2023-2024/readingsession6/informal-networks.pdf -- Krackhardt and Hanson.
- [S41] https://www.stat.cmu.edu/~brian/780/bibliography/11%20Imputation/huisman.pdf -- Huisman on imputing non-response.
- [S42] https://www.researchgate.net/profile/Yehuda_Baruch2/publication/228079609_Survey_Response_Rate_Levels_and_Trends_in_Organizational_Research/links/09e415112cd948d7f6000000.pdf -- Baruch and Holtom on representativeness versus rate.
- [S43] https://arxiv.org/abs/2201.01290 -- Ego-driven ONA privacy approach.
- [S44] https://www.oreilly.com/library/view/the-organizational-network/9780470542200/9780470542200_reviewing_the_results_with_the_departmen.html -- Reviewing results subgroup by subgroup.
- [S45] https://docs.worklytics.co/psoxy -- Psoxy pseudonymizing proxy.
- [S46] https://pmc.ncbi.nlm.nih.gov/articles/PMC3219656 -- Email tie thresholds in the literature.
- [S47] https://learn.microsoft.com/en-us/previous-versions/viva/insights/tutorials/meeting-exclusion-concept -- Legacy default meeting exclusion rule.
- [S48] https://microsoft.github.io/wpa/articles/network-analysis.html -- wpa network functions and interpretation order.
- [S49] https://ddl-tribe.readthedocs.io -- Tribe: email mbox to GraphML.
- [S50] https://www.cnbc.com/2021/09/14/skills-that-will-help-you-get-promoted-faster-according-to-career-expert-and-leadership-professor.html -- Energizers promoted faster.
- [S51] https://research.tudelft.nl/en/publications/advice-tie-reallocation-under-organizational-downsizing-a-longitu/ -- Advice ties under downsizing (ERGM).
- [S52] https://www.confirm.com/blog/organizational-network-analysis-guide -- Confirm ONA in performance reviews.
- [S53] https://www.orgvue.com/solutions/organization-analysis/ and https://www.orgvue.com/solutions/organization-modeling/ -- Orgvue vendor pages (via search summaries); https://docs.orgvue.com/orgvue-workspace-user-guide/user-guide/template-packs.html -- Spans and Layers packs.
- [S54] https://docs.visier.com/swp/Organization%20Design/organization-design.htm -- Visier Organization Design.
- [S55] https://doc.workday.com/adaptive-planning/en-us/what-s-new/releases/2026r1-release-notes/2026r1-planning-for-hcm-and-financials/org-design-and-scenario-modeling.html -- Workday Org Design and Scenario Modeling.
- [S57] https://www.oreilly.com/library/view/the-hidden-power/9781633691537/19_appendixB.html -- Cross and Parker, Appendix B personal network diagnostic.
- [S58] https://cran.csail.mit.edu/web/packages/egor/vignettes/qualtrics.html -- Ego-network survey structure; https://nosh.northwestern.edu/wp-content/uploads/2021/02/1-s2.0-S0378873321000186-main.pdf -- Network Canvas and ego surveys.
- [S59] https://learn.microsoft.com/viva/engage/analytics -- Viva Engage analytics roles.
- [S60] https://www.swoopanalytics.com/personas and https://support.swoopanalytics.com/hc/en-us/articles/14366255955993-Persona-Distribution-What-and-How-SWOOP-for-Viva-Engage -- SWOOP personas and active-user rule.
- [S61] https://learn.microsoft.com/en-us/viva/insights/advanced/setup-maint/enable-disable-behavioral-insights -- Enabling behavioral insights in Viva Insights.
- [S62] https://trainingmag.com/?p=12055 -- Activate Networks on the Personal Network Assessment in executive coaching.
- [S63] https://support2.swoopanalytics.com/hc/en-us/influential-people-what-and-how-swoop-for-viva-engage -- SWOOP Influential People and Influencer Risk Score (via search summary).
- [S64] https://www.swoopanalytics.com/viva-engage-bm-25 -- SWOOP 2025/26 Viva Engage benchmark.
- [S65] https://sloanreview.mit.edu/?p=3026 -- Parise, Cross and Davenport, MIT SMR 47(4), 2006 (abstract and summaries; actions per role at https://www.anecdote.com/?p=6402).
- [S66] https://365talents.com/en/resources/skills-graph-guide-hr-leaders/ -- Skills graph.
- [S67] https://neo4j.com/blog/neo4j-critical-aspect-human-capital-management-hcm -- Graph model for HR.
- [S68] https://doi.org/10.1007/s10588-006-7084-x -- Borgatti, "Identifying sets of key players in a social network," 2006 (abstract and secondary sources); https://csqsiew.github.io/ch11.html -- keyplayer R package.
- [S69] https://arxiv.org/abs/2308.06917 -- Livas, Renshaw and Butts, "Calling the Dead.
