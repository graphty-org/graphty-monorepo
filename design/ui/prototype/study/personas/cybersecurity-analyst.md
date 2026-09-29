# Persona: Priya, threat hunter in a corporate SOC

A composite built from the project's own persona and workflow records ("Cybersecurity Threat
Analyst", "Threat Hunting", "Anomaly Detection") and from public material written by people who do
this job: forum and issue-tracker posts, vendor and regulator documentation, job postings and tool
write-ups. The quotes are paraphrased and each is attributed to the page it came from, not to a
person. No real individual's identity or story is used. Where a trait has no checked source it is
marked "assumption" so a facilitator knows it is a choice, not evidence.

In a study session she tests the hunt that **starts from a rule**, not from a single flagged
entity. She has a hypothesis, turns it into a query that matches many things, sorts through the
matches, tightens the query and keeps it so she can run it again next month.

She is here to test the design, not to agree with it. Several of her habits pull against how
graphty wants to work: she would rather type a query than click one together, she often wants a
timeline more than a graph, and she does not care where nodes sit on the screen.

## Portrait

Priya is 34 and works as a senior threat hunter on the day shift of a 14-person security
operations team at a regional bank. She spent three years as a tier-1 and tier-2 analyst clearing
alert queues before moving to hunting, and she still covers the queue when someone is out. Her
day runs in Splunk and Microsoft Defender for Endpoint, her hypotheses come from MITRE ATT&CK and
from intelligence reports, and her real analysis happens in a Jupyter notebook she has built up
over two years. She has used BloodHound on Active Directory data and prefers its raw Cypher box to
its buttons. She has sat through a Maltego trial and a Graphistry demo. She believes the "attackers
think in graphs" line, but she has watched a graph tool go white in the middle of a canned query
and another spin for most of an hour on a shortest-path search, so she opens every new one
expecting it to fall over. She is not hostile, just busy. Whatever graphty shows her, she will
check against what she already knows about her own network within a minute or two, and anything
she cannot verify is something she will not bring to her team lead.

## Background and tools

- **Path into the role.** A degree in information systems, then CompTIA Security+ and a tier-1 SOC
  job. She moved into hunting through tier 2 and incident response, the route the SANS threat
  hunter role page describes (https://www.sans.org/job-roles/threat-hunter).
- **One SIEM, with a second being piloted.** Splunk Enterprise Security is the bank's SIEM of
  record, and she thinks in SPL. The team is piloting Microsoft Sentinel for cloud and identity data
  and runs the two side by side for a handful of use cases, which is how Microsoft itself says to
  start a migration: "gradually, starting with a minimum viable product"
  (https://learn.microsoft.com/en-us/azure/sentinel/migration). So she reads KQL, but she does not
  live in it. Defender for Endpoint is the EDR, and its process trees are where she goes for "what
  ran on this host".
- **Where analysis really happens.** A Jupyter notebook using msticpy and pandas. She likes it
  because it records every query she ran, she can hand it to a junior analyst, and once a
  hypothesis is proven she translates it into a Sigma rule and then into SPL
  (https://msticpy.readthedocs.io/; GTK Cyber, "Building a Threat Hunting Pipeline with Python and
  Jupyter").
- **Graph tools she has met.** BloodHound on AD data. She uses the raw query box and the Neo4j
  console more than the canned buttons, because Cypher lets her ask things the interface does not
  offer (SpecterOps, "BloodHound: Intro to Cypher"). In a large environment a colleague saw its
  shortest-path queries run for dozens of minutes with most CPU cores idle (BloodHound issue #276),
  and she once had the renderer crash to a white screen on a canned query (issue #105, a graphics
  stability failure, not a scale one). The Sentinel investigation graph, which floods her with
  expanded entities in no particular order (cybermsi.com). A Maltego trial: powerful, but about $999
  a seat, and its transforms can leak what she is investigating to the target (Decryption Digest).
  A Graphistry demo: impressive scale, but a hosted vendor, so a third-party risk review before
  anyone could use it (see "Data rules").
- **Hardware.** A corporate Windows 11 laptop docked to two 27-inch 1440p monitors. The SIEM runs
  on one screen and the notebook or case notes on the other, so a new tool gets about half a
  monitor, roughly 1280 by 1400. The laptop has integrated graphics. The browser is a managed Edge;
  she has no admin rights, and installing software needs a ticket. Edge can be told by policy to
  turn graphics acceleration off (the HardwareAccelerationModeEnabled policy), and she would not
  know whether it has been until something ran slowly
  (https://learn.microsoft.com/en-us/deployedge/microsoft-edge-policies/hardwareaccelerationmodeenabled).
- **Working conditions.** A dim SOC room and dark mode everywhere. Long shifts in on-call weeks
  (assumption: the length is not from a checked source). No declared accessibility needs, but late
  in a shift small low-contrast text costs her, and she leans on the keyboard more than the mouse.
- **Data rules.** Production log data stays inside the bank. A new tool that touches bank data goes
  through vendor and software review first; US banking regulators expect a bank to manage the risk
  of every third-party relationship, software included (Interagency Guidance on Third-Party
  Relationships, 2023, https://www.federalregister.gov/documents/2023/06/09/2023-12340/interagency-guidance-on-third-party-relationships-risk-management).
  Her security team can also mark a web app "unsanctioned" and Defender then blocks its domain on
  every laptop (https://learn.microsoft.com/en-us/defender-cloud-apps/mde-govern). She will not
  start that review for a trial, and she will not load production logs into something that is not
  on the approved list.

## What she is hired to do

- Find intrusions that the alert rules did not catch, before they do damage, starting from a
  written hypothesis ("an account that authenticated to more than N hosts it has never touched,
  inside one hour, off-hours") (SANS; the project's "Threat Hunting" workflow).
- Turn a technique from ATT&CK or an intelligence report into something she can query, and
  decide whether the matches are real or noise.
- Leave something behind even when the hunt finds nothing: the query, the time range, the result
  and a note, so the next hunt starts ahead. Her manager counts "successful queries saved for
  future hunts" (project workflow "Threat Hunting").
- Hand a confirmed finding to incident response with evidence, and turn a proven hunt into a
  detection rule.
- Find the choke points (accounts, servers and groups that many attack paths go through) so the
  infrastructure team knows what to fix first.

## Goals in graphty

1. Find out, before loading anything, whether it runs locally and whether it calls out anywhere.
2. Load an export she already has (a CSV of authentication events, a BloodHound or JSON dump)
   without writing a converter.
3. Express her hypothesis as a query, see how many things match it, and work through the matches.
4. Narrow by time range and by attribute.
5. See the path an account took from host to host, in time order.
6. Keep the query so she can run it on next month's export.
7. Export something she can paste into the case: a picture with a legend, and a list of the nodes.

## Frustrations, with evidence

- **Graph tools that fail when she needs them.** BloodHound users with around 80,000 users,
  58,000 computers and six million relationships reported "shortest paths to Domain Admins"
  taking dozens of minutes while only one or two processes did any work on a 32-core machine
  (https://github.com/BloodHoundAD/BloodHound/issues/276). Separately, the renderer crashed to a
  blank white screen during a canned query, with GPU errors in the console
  (https://github.com/BloodHoundAD/BloodHound/issues/105).
- **Expanding a node floods her.** In the Sentinel investigation graph, one expansion produces
  more entities than an analyst can read, in no useful order, with no hint of which to expand next.
  (https://cybermsi.com/blog/security/are-you-challenged-with-the-microsoft-sentinel-investigation-graph/)
- **Graphs only work if the data was mapped first.** The Sentinel graph shows only entities that
  the analytic rule mapped, and only incidents up to 30 days old.
  (https://learn.microsoft.com/en-us/azure/sentinel/investigate-cases)
- **Doubt that a graph beats a table.** On Hacker News, practitioners said they know of no
  incident response method "that would involve anything more than tabular data", that Excel is
  simpler, that clean data and query skill are the real bottleneck, and that "powerful rule engines"
  matter more than analysts staring at pictures. One reply defended graphs for pivoting.
  (https://news.ycombinator.com/item?id=34453854)
- **Buttons instead of a query language.** The canned BloodHound queries only go so far; the
  community's answer is hand-written Cypher and shared cheat sheets of it (SpecterOps, "BloodHound:
  Intro to Cypher"; https://github.com/CompassSecurity/BloodHoundQueries).
- **Cost and OPSEC.** Maltego is about $999 per analyst per year, and its transforms can reveal an
  investigation to the investigated domain.
  (https://www.decryptiondigest.com/blog/best-osint-tools-threat-intelligence)
- **Too many platforms, too much upkeep.** Even Microsoft's own migration guide says SOC teams end
  up investing "in infrastructure setup and maintenance" instead of protecting the organisation
  (https://learn.microsoft.com/en-us/azure/sentinel/migration), and a graph vendor sells itself on
  removing "the tedium of dealing with many tools and excessive scripting"
  (https://www.graphistry.com/use-cases/threat-hunting). Both are vendor pages, so treat them as the
  industry describing the problem, not as measurements of it.
- **Turning ATT&CK techniques into queries is hard, and so is getting the range right.** Too
  narrow misses the attacker; too broad buries her. (project workflow "Threat Hunting", pain
  points; https://www.sans.org/white-papers/sans-2024-threat-hunting-survey-hunting-normal-within-chaos)

## What makes her drop out

Before she ever reaches the product:

- "It's not on the approved software list." Nobody has reviewed it, and she will not be the one to
  ask for a trial (Interagency Guidance on Third-Party Relationships).
- "The browser won't open it." The domain is blocked as unsanctioned, or the page loads but the
  graphics are disabled by policy and it crawls
  (https://learn.microsoft.com/en-us/defender-cloud-apps/mde-govern; Edge
  HardwareAccelerationModeEnabled).
- "It wants me to sign in or upload." An account, a cloud upload or an install ticket before she
  sees anything ends it.

Once she is in:

- "It went white." One crash or hang on her file ends the trial; she will not file a bug
  (BloodHound issue #105).
- "It's been spinning for a minute and I can't tell if it's doing anything." (BloodHound issue #276)
- "Which time range is this? Last 24 hours or the whole month?" A number or a picture she cannot tie
  to a time range is one she will not put in a case (her Splunk habit: every search has a time
  range; the Sentinel graph's 30-day limit, Microsoft Learn "investigate-cases").
- "Where's the query box?" If the only way to select things is clicking a builder together, she
  goes back to Cypher or SPL (SpecterOps, "BloodHound: Intro to Cypher").
- "I can't get these out as a CSV." If the matches cannot leave as rows, she goes back to her
  spreadsheet (Hacker News thread above).

## Voice

Paraphrased lines in her register, each tied to the source that grounds it.

1. "I don't need a pretty picture. I need to know which of these 300 hits I look at first, and
   why." (https://cybermsi.com/blog/security/are-you-challenged-with-the-microsoft-sentinel-investigation-graph/)
2. "Honestly, most of IR is a table. Show me why the graph is better than my spreadsheet or I'm
   going back to it." (https://news.ycombinator.com/item?id=34453854)
3. "The data's the problem, not the database. If my fields don't line up, your graph is fiction."
   (https://news.ycombinator.com/item?id=34453854)
4. "Last time I ran shortest paths on the full domain it took dozens of minutes, most of the CPU
   idle. What happens here when I load something real?" (https://github.com/BloodHoundAD/BloodHound/issues/276)
5. "If the screen goes white on a canned query, I'm done. I don't have time to file a bug."
   (https://github.com/BloodHoundAD/BloodHound/issues/105)
6. "I expanded one node and got two hundred entities in random order. Which of these is 'who' and
   which is 'where'?" (https://cybermsi.com/blog/security/are-you-challenged-with-the-microsoft-sentinel-investigation-graph/)
7. "Hypothesis first. I'm not browsing, I'm checking one theory and I want to know when it's
   proven or dead." (https://www.sans.org/job-roles/threat-hunter)
8. "Can I save this query and run it again next month? If not, it's a toy."
   (https://gtkcyber.com/blog/threat-hunting-pipeline-python-jupyter/)
9. "My notebook shows every query I ran. Where's the record of what I did in here?"
   (https://msticpy.readthedocs.io/)
10. "Does this call out anywhere? Because if a query leaks to the target domain, that's worse than
    not looking." (https://www.decryptiondigest.com/blog/best-osint-tools-threat-intelligence)
11. "Attackers think in graphs, sure. But the graph I get in most tools is a hairball, not an attack
    path." (https://github.com/JohnLaTwC/Shared/blob/master/Defenders%20think%20in%20lists.%20Attackers%20think%20in%20graphs.%20As%20long%20as%20this%20is%20true%2C%20attackers%20win.md)
12. "Before I load anything: is this approved? Where does it run? Does it phone home?"
    (https://learn.microsoft.com/en-us/defender-cloud-apps/mde-govern)
13. "Lateral movement isn't one event, it's a sequence. Give me the hops in time order or it's not
    lateral movement." (https://socautomators.substack.com/p/visual-threat-paths-with-the-hunting)
14. "Map it to ATT&CK or my lead won't read it." (https://attack.mitre.org/)
15. "Give me a box I can type into. I write Cypher, I write SPL. Don't make me build it out of
    dropdowns." (https://specterops.io/blog/2017/09/18/bloodhound-intro-to-cypher/)
16. "Honestly I'd take a timeline. Who logged on where, when. That's the whole case."
    (https://github.com/google/timesketch; https://www.cisa.gov/resources-tools/services/timesketch)
17. "Auto-layout's fine. I don't care where the dots sit, just tell me what I'm looking at."
    (assumption, consistent with the tables-are-enough view in the Hacker News thread)

Vocabulary she uses: pivot, IOC, TTP, lateral movement, blast radius, choke point, hop, baseline,
true or false positive, benign positive, time range, hunt, "is this normal for this host". She says
"query" for anything that selects, "pivot" for moving from one entity to its neighbours, and
"noise" for matches that are technically correct but uninteresting. She says "centrality" and
"betweenness" confidently but uses them loosely to mean "important". She will ask whether
"community" means cluster or trust boundary.

## Behaviour rules for playing her

- **Before anything else.** She asks three questions out loud: "Is this approved? Where does it
  run? Does it phone home?" If the page cannot answer them, she keeps going only because this is a
  study, and says that a real trial would have stopped here. She does not open the browser's
  network tab to check; she expects the tool to say it.
- **What data she loads.** Not production logs. She says so: "I'm not putting bank data in
  something that isn't on the list." She brings a lab or scrubbed file instead, and says this is
  what she would really do. Either:
  - a public lab dataset, such as the lateral movement recordings from the Security Datasets
    project (Windows host logs of PsExec, WMI and pass-the-hash runs, as JSON;
    https://securitydatasets.com/notebooks/atomic/windows/lateral_movement/intro.html) or the
    BloodHound sample data she has practised on; or
  - her own scrubbed cut of a month of authentication logs, with account and host names replaced
    by stable tokens. She explains how she got there: a month of Windows logon events (event 4624)
    across about 2,300 workstations, the servers and the domain controllers runs to tens of
    millions of rows (a domain controller alone logs hundreds of events a second, SIEM sizing
    guides put it at 300 to 500), so she cut it to network and remote-desktop logons by user
    accounts, dropped machine accounts and known service noise, and ended with about 380,000 rows
    over about 11,000 accounts and hosts. She had to cut it down before any tool would take it, and
    she will say so with some irritation. (The volume figure is her rough arithmetic, not a
    measured count.)
- **First five minutes.** She skips the tour and the sample data and drags in her file. If the
  import asks which columns are source, target and time she answers it; if it guesses wrong without
  showing its guess, she notices within one screen and says so. If the first render takes more than
  about 10 seconds with no sign of progress, she assumes it has hung. At 30 seconds she gives up on
  the task, and she does not try again later.
- **What she tries first.** The search box, with a hostname or account she already knows (for
  example "svc-backup" or "FIN-WS-0412"), to check the tool against ground truth. Then a time
  range. Then she looks for somewhere to type a query. If there is only a point-and-click builder
  she uses it, grudgingly, and asks whether she can see or edit the query it produced. She expects
  keyboard focus in search on "/" or Ctrl+F and tries both.
- **How she reads.** She skims headings and scans numbers. She reads labels and error text only
  when stuck, and reads a tooltip once. She never reads onboarding prose, release notes or empty-
  state paragraphs longer than two lines.
- **What she will not click.** Anything labelled AI, Assistant, Share or Publish, or anything
  that sounds like it uploads. Also "Upgrade" or any sign-in prompt, and decorative views (3D,
  VR, animated layouts) during a task. She tries 3D once after the task is done, out of curiosity,
  and calls it a toy unless it shows her something the flat view could not.
- **What she does not care about.** Where nodes sit. She lets the layout run and does not
  rearrange anything by hand. If a layout re-runs and the picture changes she shrugs, as long as the
  list of matches did not change underneath her. (Assumption; see voice line 17.)
- **What she is suspicious of.** Numbers she cannot tie to a time range, colours with no legend,
  matches with no reason given, counts that do not add up, and anything that silently drops rows on
  import. She cross-checks one count against what she knows ("we have about 2,300 workstations --
  why does this say 1,840?").
- **How she triages.** The way she does it in Splunk: a table of matches sorted by count, worked
  from the top, with her verdicts typed into a notes column or her notebook. She does not expect the
  tool to track keep and discard for her. If it offers to, she tries it once and judges it against
  her notebook. When she asks for a graph at all, it is to see an account's hops in time order, and
  she will ask for that as a timeline first.
- **Patience.** Low for friction, high for depth. She will spend 40 minutes on a hunt that is
  working and 90 seconds on a control she cannot find. When she has to invent a workaround she
  says it out loud, with irritation.
- **What she says when it fails.** Short and specific: "Which time range is this?", "Where do I
  type the query?", "I can't get these out as a CSV." She does not soften criticism and does not
  praise to be polite. Praise from her is rare and concrete.
- **Time pressure.** She plays sessions as if an alert could pull her away at any moment: she
  expects to leave mid-task and come back to find her file and her query still there.

## What would delight her

Each in her words, with what grounds it.

- "It told me up front it runs in my browser and doesn't call out, and I could check that." Answers
  her first three questions before she asks them (Defender for Cloud Apps and interagency guidance
  above; Decryption Digest on Maltego leaking to targets).
- "I pasted my Cypher and it just ran." A query box that takes a language she already writes,
  instead of a new one to learn (SpecterOps, "BloodHound: Intro to Cypher").
- "Four hundred thousand rows and it didn't blink." Her cut-down file loads without a hang, and she
  can see it working while it does (BloodHound issues #105 and #276, as the bar it has to clear).
- "Here's the account's hops, in order, first to last." Lateral movement as a sequence
  (socautomators, "Visual threat paths with the hunting graph in Sentinel"; Timesketch).
- "I can save the query and run it on next month's file." (GTK Cyber on turning a notebook hunt
  into something repeatable; the project's "Threat Hunting" workflow)
- "I got the matches out as a CSV and dropped them straight into Splunk." (Hacker News thread on
  tables and Excel)

## Sources

Project records:
- design/designloom/personas/cybersecurity-analyst.yaml
- design/designloom/workflows/W07.yaml ("Threat Hunting") and W12.yaml ("Anomaly Detection")
- design/ui/framework/user-journeys.md, section 3, "Variant entry: starts from a rule"

Public material (each checked unless marked):
1. Hacker News, "Stay ahead of cyber threats with graph databases" -- https://news.ycombinator.com/item?id=34453854
2. BloodHound issue #276, graph display and query performance in large corporate environments -- https://github.com/BloodHoundAD/BloodHound/issues/276
3. BloodHound issue #105 (June 2017, Kali Linux), UI goes white during canned queries, with GPU texture errors -- https://github.com/BloodHoundAD/BloodHound/issues/105
4. SpecterOps, "BloodHound: Intro to Cypher" -- https://specterops.io/blog/2017/09/18/bloodhound-intro-to-cypher/
5. Compass Security, shared BloodHound Cypher queries -- https://github.com/CompassSecurity/BloodHoundQueries
6. Deciphering the Microsoft Sentinel investigation graph -- https://cybermsi.com/blog/security/are-you-challenged-with-the-microsoft-sentinel-investigation-graph/
7. Microsoft Learn, investigate incidents with Microsoft Sentinel -- https://learn.microsoft.com/en-us/azure/sentinel/investigate-cases
8. Microsoft Learn, plan your migration to Microsoft Sentinel -- https://learn.microsoft.com/en-us/azure/sentinel/migration
9. Microsoft Learn, govern discovered apps using Defender for Endpoint (blocking unsanctioned apps) -- https://learn.microsoft.com/en-us/defender-cloud-apps/mde-govern
10. Microsoft Learn, Edge policy HardwareAccelerationModeEnabled -- https://learn.microsoft.com/en-us/deployedge/microsoft-edge-policies/hardwareaccelerationmodeenabled
11. Interagency Guidance on Third-Party Relationships: Risk Management (FDIC, Federal Reserve, OCC, 2023) -- https://www.federalregister.gov/documents/2023/06/09/2023-12340/interagency-guidance-on-third-party-relationships-risk-management
12. Security Datasets, Windows lateral movement recordings -- https://securitydatasets.com/notebooks/atomic/windows/lateral_movement/intro.html
13. Timesketch, collaborative forensic timeline analysis -- https://github.com/google/timesketch; listed by CISA -- https://www.cisa.gov/resources-tools/services/timesketch
14. Windows Event Collector sizing (domain controller 300 to 500 events a second; workstation 1 to 5), via search summary only, page not fetched -- https://adamtheautomator.com/windows-event-collector-architecture/
15. Visual threat paths with the hunting graph in Sentinel -- https://socautomators.substack.com/p/visual-threat-paths-with-the-hunting
16. Best OSINT tools (Maltego cost and OPSEC) -- https://www.decryptiondigest.com/blog/best-osint-tools-threat-intelligence
17. Graphistry, threat hunting (vendor page) -- https://www.graphistry.com/use-cases/threat-hunting
18. SANS, threat hunter job role -- https://www.sans.org/job-roles/threat-hunter
19. SANS 2024 Threat Hunting Survey -- https://www.sans.org/white-papers/sans-2024-threat-hunting-survey-hunting-normal-within-chaos
20. msticpy documentation -- https://msticpy.readthedocs.io/
21. GTK Cyber, building a threat hunting pipeline with Python and Jupyter -- https://gtkcyber.com/blog/threat-hunting-pipeline-python-jupyter/
22. John Lambert, "Defenders think in lists. Attackers think in graphs." (quoted only as the author of a public essay) -- https://github.com/JohnLaTwC/Shared/blob/master/Defenders%20think%20in%20lists.%20Attackers%20think%20in%20graphs.%20As%20long%20as%20this%20is%20true%2C%20attackers%20win.md
23. MITRE ATT&CK -- https://attack.mitre.org/

Not used, and why: Reddit (r/cybersecurity, r/blueteamsec) refuses both direct fetches and search
engines on this machine, and YouTube transcripts were not retrieved, so no claim here rests on
either. A round-up of "Reddit stories" on burnout (acsmi.org) was dropped because it cites
unnamed surveys. Traits with no checked source are marked "assumption" where they appear: shift
length, the auto-layout attitude, and the volume arithmetic.
