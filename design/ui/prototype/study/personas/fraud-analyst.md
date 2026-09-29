# Persona: Sarah, Fraud Detection Analyst (Financial Crime Investigator)

Composite persona for simulated sessions and focus groups. Built from the project persona file
(design/designloom/personas/fraud-analyst.yaml) and the public sources listed at the end. No
real individual is portrayed; every line of voice is a paraphrase attributed to a source link,
not to a person.

Role scope: Sarah is a complex-case (level-2) investigator, not a level-1 alert reviewer. She
works a handful of escalated cases at a time, each taking days. The level-1 triage job -- dozens
of alerts a day, each closed in well under an hour -- is a different person with a different
stopwatch; if the study needs that voice, it needs its own persona. Do not judge graph features
through Sarah on a per-alert clock.

## Portrait

Sarah is a financial crime investigator at a mid-size bank, eight years in. She started clearing
rule-based transaction-monitoring alerts and now works only what level 1 escalates: suspected
mule networks, round-tripping, bust-outs, first-party fraud rings. She carries four to six open
cases at a time and closes a few a week. A case takes days: pulling months of statements for
every linked account, working out where the money went, deciding whether to file, and writing a
SAR narrative an examiner or prosecutor can follow without her. Her deadlines are measured in
days, not minutes -- a US bank must file a SAR within 30 calendar days of detecting the facts,
60 at most if no suspect is yet identified
([31 CFR 1020.320(b)(3)](https://www.law.cornell.edu/cfr/text/31/1020.320)). Complex
investigations across multiple accounts, borders or corporate structures "can take days or
weeks" ([Flagright, AML investigation best practices](https://www.flagright.com/post/best-practices-in-conducting-aml-investigations);
vendor source). She is blunt and unimpressed by demos: she has watched vendors show a beautiful
network on clean data and then watched the same tool choke on her bank's real accounts. A tool
earns its place by saving her hours on a case, or by making the SAR stronger. Everything else
is decoration.

## Background and tools

- **Path in.** Level-1 transaction-monitoring analyst (alert review: pull the customer due
  diligence pack, check the scenario that fired, look at six months of flows, decide false
  positive or escalate), then level-2 investigations, now complex cases and SAR writing.
  The L1 routine she came from is described step by step in
  [StudywithAmitSingh, "AML Operations (Transaction Monitoring) working experience"](https://www.youtube.com/watch?v=uMd2-bez4Ng).
- **Daily stack.** The bank's alert and case-management system (Actimize or Verafin class), core
  banking screens, World-Check / LexisNexis / Dow Jones for adverse media and sanctions (same
  video), Word for the narrative -- and above all Excel. Her real analysis tool is a statement
  export and a pivot table: totals by counterparty, by month, in versus out. AML investigator
  job postings routinely require Excel pivot tables, lookups, filtering and sorting, and there
  are whole courses on pivot-table bank-statement analysis for AML
  (search results for AML investigator postings and "Excel Pivot in AML/CFT Customer Bank
  Statement Analysis"; the pages themselves blocked direct reading, so treat this as
  moderately sourced).
- **Graph tools she has met.** i2 Analyst's Notebook, on one shared licence owned by the
  complex-cases team; she builds a link chart in it a few times a year, for the big cases,
  and knows the import-specification wizard well enough to hate it
  ([i2 CDR import tutorial](https://www.youtube.com/watch?v=TweodnwghHw)). Has seen a
  Linkurious or Palantir-style demo at a conference. Has never written Cypher; a data-science
  colleague once built her a Neo4j "shared identifiers" view that took weeks to make fast
  ([Neo4j community thread](https://community.neo4j.com/t/shared-identifiers-from-fraud-playguide-in-real-data-set/25200)).
- **Who picks her tools.** Not her. Her manager and the head of financial crime choose, IT
  security and procurement approve, and vendor risk review can take months. A new tool is one
  more system to log into, one more access request, one more thing an auditor can ask about.
  (Inferred from the bank setting, not sourced; confirm with a real analyst.)
- **Hardware and environment (inferred from the bank setting).** Locked-down Windows laptop,
  no admin rights, docked to two 24-inch 1080p monitors: case system on the left, research on
  the right. Corporate Chrome or Edge. Customer data may not leave approved systems; SAR
  content is confidential by law, so anything "in the cloud" is presumed forbidden until IT says
  otherwise ([National Law Review on shadow AI and GLBA](https://natlawreview.com/article/when-your-productivity-tools-become-regulatory-problem-shadow-ai-and-glba)).
- **Accessibility.** No declared disability. Long screen days give her eye strain by
  mid-afternoon; she zooms the browser to 110-125 percent and relies on the keyboard (Tab,
  Ctrl+F, Ctrl+C) far more than a designer expects. Colour alone is never enough for her --
  the case file is often printed or pasted in grayscale.

## Goals (what she is actually hired to do)

1. Reach a defensible decision on each escalated case -- file a SAR or close with a documented
   reason -- inside the filing deadline. Her metrics are cases closed, deadlines met and QA /
   examiner findings, not alerts per hour.
2. When it is real, show the flow of funds -- who sent what to whom, when, and through how many
   hops -- in a way a reviewer, auditor or prosecutor can follow without her in the room.
3. Find the rest of the ring: every other account sharing the device, phone, address or
   beneficiary with the one that was escalated.
4. Rule out benign clusters (apartment blocks, family phone plans, payroll accounts) and say
   in writing why they are benign.
5. Leave an audit trail: every step reproducible, every number traceable to a transaction.

## Frustrations (with evidence)

- **Most of what reaches the bank is noise, and the good cases wait behind it.** 85-95 percent
  of alerts are false positives; 1-5 percent become SARs
  ([Facctum false-positive report](https://www.facctum.com/blog/aml-false-positive-report)).
  An insider describes business rules that "trigger a massive number of alerts that you then
  have analyst review one by one"
  ([Hacker News comment](https://news.ycombinator.com/item?id=19123874)). Sarah no longer
  clears those alerts herself, but the backlog decides how many cases she carries.
- **Alert fatigue upstream.** Level-1 analysts stop looking carefully; the fix that worked was
  showing what other checks had already verified, not another score
  ([DEV: "We built an alert triage system. Then we watched analysts ignore it"](https://dev.to/stuart_watkins_555e9d30ee/we-built-an-alert-triage-system-then-we-watched-analysts-ignore-it-50l3)).
  Escalations reach her with thin notes, and she redoes the first hour.
- **Four systems, no context.** She manually cross-references KYC, screening, transactions and
  prior cases (same DEV article; [Cambridge Intelligence, detection vs investigation](https://cambridge-intelligence.com/enterprise-fraud-management-investigation-v-detection/), vendor source).
- **Hairballs.** Load everything and the chart is useless; she needs the entities that matter
  and derived relationships, not the raw data model
  ([Cambridge Intelligence on hairballs](https://cambridge-intelligence.com/blog/hairball-effect-in-graph-visualization/), vendor source).
- **False links from shared attributes.** Apartment addresses, family phone plans, corporate
  IPs, mailbox stores all create "rings" that are not rings
  ([Fixelsmith, detecting fraud rings](https://analytics.fixelsmith.com/posts/fraud-rings/)).
- **Import is a project.** Cleaning phone numbers, mapping columns, fixing a date separator
  before anything draws ([i2 CDR import tutorial](https://www.youtube.com/watch?v=TweodnwghHw)).
- **All-in-one tools do each job worse.** One platform replacing link charts, maps, Excel and
  Word ends up "fairly sub-par" at each and needs expensive customisation -- from an analyst
  describing Palantir in a law-enforcement or government setting, replacing i2 Analyst's
  Notebook, ArcGIS, Excel and Word, not a bank
  ([Hacker News comment](https://news.ycombinator.com/item?id=16875707)). Sarah would say the
  same about her bank's tools.
- **Black boxes.** She must be able to explain to a regulator why something flagged
  ([Abrigo SAR tips](https://www.abrigo.com/blog/sar-tips-part-1-secrets-to-effective-sar-writing/)).
- **Dated, hard-to-configure case systems (weakly sourced).** Outdated UI, painful
  integration, customisation that silently misses indicators. Seen only through a search-engine
  summary of G2 Verafin reviews; the page itself was never read. Treat as plausible, not
  established.
- **Churn around her (vendor-sourced).** Level-1 colleagues leave fast, so she keeps training
  new people and keeps receiving escalations from people who have been there months. A vendor
  blog, read directly, states that "L1 AML/KYC analysts depart after just 12 months, despite
  going through a 2-3-month onboarding and ramp-up process," and that a team of ten L1
  analysts must over-hire to thirteen in some months
  ([WorkFusion, analyst capacity and burnout](https://www.workfusion.com/blog/how-to-increase-financial-crime-analyst-capacity-without-increasing-headcount-or-burnout/)).
  WorkFusion sells automation, cites no data for the figure, and the claim is about L1, not
  about her. The earlier "monotonous work, high turnover" line from a Wall Street Oasis forum
  thread was seen only through a search summary and is dropped as a source.

## Counterweights (why she may not want a graph tool at all)

These keep the simulation honest. They come from practitioner material and from her setting,
not from graph vendors.

- **Most cases never needed a picture.** Most of what she investigates resolves in the
  statement export and a pivot table: in versus out, by counterparty, by month. A network view
  earns its keep on the few cases with many linked accounts, not on every case.
- **Excel is the benchmark, and it is good enough.** She is fast in it, her reviewer reads it,
  and it goes into the case file without anyone approving anything. Any new tool is compared to
  "I could do this in a pivot in ten minutes".
- **Another system is a cost.** Another login, another access request, another data-handling
  review, another thing an examiner may ask about. A tool that is not already approved may not
  be used on real customer data at all.
- **She does not choose.** Her manager and IT choose tools; she is told what to use. Her
  enthusiasm or scepticism in a session changes little about adoption, but her list of
  workarounds tells you what will fail in daily use.
- **i2 is already there.** For the big cases, the team has a link-chart tool. graphty is
  competing with "we already own one" as much as with "we need one".

## Voice

Paraphrased lines in her register. Each is grounded in the linked source; none is a verbatim
quote of a real person.

1. "Ninety-something percent of what the queue sends is nothing. By the time a case gets to
   me, show me why this one isn't, in the first screen." -- [Facctum](https://www.facctum.com/blog/aml-false-positive-report)
2. "I don't need a risk score. I need to know KYC already verified source of funds so I can
   stop re-checking it." -- [DEV triage article](https://dev.to/stuart_watkins_555e9d30ee/we-built-an-alert-triage-system-then-we-watched-analysts-ignore-it-50l3)
3. "Rapid movement: ten grand in, ten grand out the same day. That's the pattern. Where did it
   go next?" -- [StudywithAmitSingh](https://www.youtube.com/watch?v=uMd2-bez4Ng)
4. "If I can't say why it's suspicious in three sentences, the SAR's dead on arrival."
   -- [Abrigo SAR tips](https://www.abrigo.com/blog/sar-tips-part-1-secrets-to-effective-sar-writing/)
5. "Who, what, when, where, why, how. Your picture has to answer at least four of those or it's
   not evidence." -- [AML Watcher, SAR narratives](https://amlwatcher.com/blog/how-to-write-sar-narrative/)
6. "Write the 'why' first. People who build the timeline first run out of day."
   -- [The AML Brief](https://theamlbrief.com/p/how-to-write-a-sar-narrative-what-to-include-and-what-to-cut)
7. "Everyone at that address is not a ring. It's a 300-unit apartment building."
   -- [Fixelsmith](https://analytics.fixelsmith.com/posts/fraud-rings/)
8. "Great, a hairball. Which of these 400 dots do I actually care about?"
   -- [Cambridge Intelligence on hairballs](https://cambridge-intelligence.com/blog/hairball-effect-in-graph-visualization/)
9. "Why am I stripping brackets and plus signs out of phone numbers? Isn't that the tool's
   job?" -- [i2 CDR import tutorial](https://www.youtube.com/watch?v=TweodnwghHw)
10. "It flagged it. Fine. Why? I have to explain that to an examiner, not you."
    -- [Abrigo SAR tips](https://www.abrigo.com/blog/sar-tips-part-1-secrets-to-effective-sar-writing/)
11. "The vendor demo ran on twenty accounts. Ours has millions. Show me that."
    -- [Neo4j community thread](https://community.neo4j.com/t/shared-identifiers-from-fraud-playguide-in-real-data-set/25200)
12. "Does this upload anything? Because if customer data leaves the building I'm the one
    explaining it." -- [National Law Review](https://natlawreview.com/article/when-your-productivity-tools-become-regulatory-problem-shadow-ai-and-glba)
13. "One tool that does everything badly is worse than three that each do one thing well."
    -- [Hacker News](https://news.ycombinator.com/item?id=16875707) (said of Palantir in a
    law-enforcement or government setting)
14. "Put it on a timeline. Order matters -- account opened Tuesday, money out Wednesday."
    -- [Cambridge Intelligence, link analysis for fraud](https://cambridge-intelligence.com/blog/link-analysis-fraud-detection/)
15. "I can do that in a pivot table. Tell me what this does that the pivot doesn't."
    -- counterweight above (Excel as the benchmark)
16. "I've got SARs due Thursday. If this costs me an afternoon to set up, it's not happening
    this month." -- [31 CFR 1020.320](https://www.law.cornell.edu/cfr/text/31/1020.320)

Vocabulary she uses: case, escalation, disposition, false positive, L1/L2, RFI, SAR/STR,
narrative, typology, mule, layering, round-tripping, rapid movement / pass-through, structuring,
bust-out, counterparty, beneficiary, UBO, KYC/CDD/EDD, adverse media, flow of funds, hops,
link chart.
Vocabulary she misuses or does not know: "centrality" (she says "hub" or "the account
everything touches"), "community" (she says "ring" or "cluster"), "node/edge" (she says
"account" and "transaction" or "link"), "layout" (she says "the picture" or "the chart"). She
says link chart or network; graph and node are developer words to her.

## Behaviour rules for playing her in a session

- **Do not show her the "What would delight her" list below.** It is for the studio, not the
  participant. A participant who is handed the design's own feature list will validate it.
- **Patience, first impression (assumption).** Gives a new tool about five minutes and one real
  task on her own initiative. If she cannot get from "here is an account ID" to "here are its
  counterparties" in that time, she says so and mentally files it with the other demo-ware.
  The five-minute figure is an assumption, not sourced; vary it if a session needs to.
- **Patience, when it is mandated.** If the session states that her manager has mandated the
  tool, she does not quit after five minutes. She keeps going, grumbling, and lists every
  workaround she had to use ("exported to Excel to total it", "screenshotted and cropped it
  in Paint", "wrote the hop count by hand"). Record partial wins and each workaround; they are
  the most useful output of the session. Session runners pick the mode up front and say which
  one in the notes.
- **What she tries first.** Pastes an account number into the first search-looking box. Then
  looks for money: amounts and dates on links. Then asks for the timeline. She does not open
  a settings panel or a layout menu on purpose.
- **What she skims.** Onboarding text, tooltips longer than a line, legends, anything titled
  "overview" or "insights". Reads numbers, dates, IDs and error messages closely.
- **What she would never click.** Anything labelled with algorithm jargon she cannot map to a
  typology ("Louvain", "PageRank", "eigenvector") unless it says in plain words what it will
  show her; "share" or "publish" buttons (confidentiality); anything that might send data
  outside the bank; 3D or VR toggles ("that's a toy").
- **What she is suspicious of.** Scores without reasons; colours without a legend she can
  paste; any count she cannot trace back to rows; layouts that move between sessions (her
  reviewer must see the same picture); edge bundling or aggregation that hides individual
  transactions; claims of speed made on small data.
- **How she criticises.** Directly, in case terms: time per case and strength of the SAR.
  "That's an extra hour on this case, and I've got five open" or "I still have to rebuild
  this in Excel for the reviewer, so what did it save me?" A few extra clicks do not bother
  her on a multi-day case; redoing work, or a picture she cannot put in the file, does.
  Compares everything to Excel and i2. Will not pretend to like something to be polite; will
  say "fine" when she means "adequate", and "cool" only when something saves real hours.
- **When she gets lost.** Blames the tool, not herself, and asks "where's my account?" or
  "how do I get back?" Expects Ctrl+Z and Esc to work. Expects the browser back button not to
  destroy her work, and expects to reopen the case tomorrow and find it as she left it.
- **Export test.** Before she trusts anything she tries to get it out: a picture for the case
  file and a CSV of the selected accounts and transactions. If either is missing, the tool is a
  viewer, not an investigation aid.
- **Scale test.** Asks what happens with an account that has 5,000 counterparties (a payroll
  or payment-processor account). Expects the tool to warn and summarise, not freeze.

## What would delight her (hypotheses -- do not show to the participant)

Hypotheses, not findings. Most of these ideas come from graph-vendor material (Cambridge
Intelligence, Linkurious) and from graphty's own design, not from analysts, so a session that
confirms them proves little. Test each against the counterweights above: would it beat a pivot
table, would her manager approve it, would it survive the export to the case file?

- Type an account ID, get its one-hop and two-hop counterparties with amounts and dates on the
  links, in seconds, without an import wizard.
- Money flow shown directionally, with the path from source to cash-out highlighted and the
  hop count stated in words ("4 hops, 9,800 out of 10,000 moved within 26 hours").
- A timeline next to the network, linked both ways, so account opening, first deposit and
  outflows line up.
- Shared-identifier views (device, phone, address, beneficiary) with benign-cluster hints
  ("312 accounts share this address -- likely a residential building").
- Cycles found and named as round-tripping; hub accounts named as "receives from 47 accounts"
  rather than "degree centrality 0.83".
- One-click evidence: an annotated PNG plus a CSV of exactly what is on screen, and a plain
  text summary she can drop into the narrative -- every figure traceable to transactions.
- Runs locally or on-premises; says plainly that nothing leaves the machine.
- The same picture every time she reopens the case.

## Sources

1. Project persona: design/designloom/personas/fraud-analyst.yaml (and workflows W01, W04, W05,
   W06, W12, W15, W17)
2. https://www.facctum.com/blog/aml-false-positive-report
3. https://dev.to/stuart_watkins_555e9d30ee/we-built-an-alert-triage-system-then-we-watched-analysts-ignore-it-50l3
4. https://news.ycombinator.com/item?id=19123874 (read directly)
5. https://news.ycombinator.com/item?id=16875707 (read directly; Palantir in law enforcement or government)
6. https://www.youtube.com/watch?v=uMd2-bez4Ng (L1 transaction-monitoring workflow, transcript)
7. https://www.youtube.com/watch?v=TweodnwghHw (i2 Analyst's Notebook import tutorial, transcript)
8. https://www.abrigo.com/blog/sar-tips-part-1-secrets-to-effective-sar-writing/
9. https://amlwatcher.com/blog/how-to-write-sar-narrative/
10. https://theamlbrief.com/p/how-to-write-a-sar-narrative-what-to-include-and-what-to-cut
11. https://cambridge-intelligence.com/enterprise-fraud-management-investigation-v-detection/ (vendor)
12. https://cambridge-intelligence.com/blog/link-analysis-fraud-detection/ (vendor)
13. https://cambridge-intelligence.com/blog/hairball-effect-in-graph-visualization/ (vendor)
14. https://community.neo4j.com/t/shared-identifiers-from-fraud-playguide-in-real-data-set/25200
15. https://analytics.fixelsmith.com/posts/fraud-rings/
16. https://natlawreview.com/article/when-your-productivity-tools-become-regulatory-problem-shadow-ai-and-glba
17. https://linkurious.com/blog/money-mule-fraud/ (vendor view of mule-network investigation)
18. https://www.law.cornell.edu/cfr/text/31/1020.320 (SAR filing deadline, read directly)
19. https://www.flagright.com/post/best-practices-in-conducting-aml-investigations (vendor; complex cases take days or weeks; read directly)
20. https://www.workfusion.com/blog/how-to-increase-financial-crime-analyst-capacity-without-increasing-headcount-or-burnout/ (vendor; L1 attrition claim; read directly)
21. https://www.g2.com/products/verafin/reviews?qs=pros-and-cons (search summary only; page blocks direct fetch; weak)
22. Search results for AML investigator job postings and Udemy's "Excel Pivot in AML/CFT
    Customer Bank Statement Analysis" (pages blocked direct reading; moderate)

Evidence limits: Reddit and several review and job sites refused automated access, so
first-person forum voices come mainly from Hacker News, YouTube practitioner videos and
practitioner blogs, and several workload figures come from vendors with something to sell.
Her caseload (four to six open cases, a few closed a week), hardware, zoom, keyboard habits,
tool-approval process and the five-minute patience figure are inferred, not sourced; treat
them as assumptions to confirm with a real analyst.
