# Law enforcement crime and intelligence analysts, and defense and national intelligence analysts

## 1. Summary

This population turns records about people, phones, accounts, wallets, vehicles, places and events
into pictures of who is connected to whom, when and where. It includes criminal intelligence and crime analysts in police and
sheriff's departments, state police, fusion centers, drug task forces (HIDTA) and prosecutors'
offices; digital forensic examiners who analyze seized phones; cryptocurrency tracing investigators
in tax, federal and cyber units; and military and national intelligence analysts doing
counter-terrorism and targeting. Their signature work is call detail record (CDR) analysis, phone extractions, timelines,
cell-site and license plate mapping, link charts, group disruption analysis and blockchain tracing. The
main tools are i2 Analyst's Notebook, Palantir Gotham, PenLink, Cellebrite Pathfinder, Chainalysis
Reactor, CellHawk and Esri. What sets them apart from scientists and business analysts: the same
pair of entities is joined by many typed, timestamped, directed links; every item carries a source
and a reliability grade; charts are often laid out by hand because position carries meaning; data
keeps arriving during a case; and the final product may be an exhibit a witness must defend under
cross-examination.

## 2. Population

**Job titles.** "Criminal Intelligence Analyst" (I to III, Senior, Supervisor) is a civil-service
job class in many US states ([Iowa][r101],
[Arkansas](https://sas.arkansas.gov/job_class_codes/criminal-intelligence-analyst/),
[Texas SAO][r102], [Missouri State Highway Patrol][r1]). Other titles: crime analyst, investigative
analyst, intelligence research specialist, fusion center analyst, HIDTA analyst, digital forensic
examiner, cryptocurrency investigator, and in the military, intelligence analyst (US Army MOS 35F)
and targeting analyst.

**Size.** No headcount of US analysts exists. The International Association of Crime Analysts
(IACA) reported 7,357 members in 93 countries in FY2025, about 74% in the US
([IACA FY2025 report](https://www.iaca.net/assets/docs/Minutes/FY2025_ANNUAL_REPORT.pdf)); a signal,
not a count. i2 claims "over 2,000
organizations" and "4,500+ users in more than 140 countries" for Analyst's Notebook
([i2 product sheet][r103]). No count of
cryptocurrency investigators was found.

**How often they touch graph tools.** Daily for tactical analysts on active cases, who run
constant "deconflictions through multiple systems" and "record analysis to determine
interrelationships and transactions" ([MSHP][r1]). Strategic analysts who map hot spots use link
charts less often.

**Skill profile.** Graph literacy is practical: degree, "who is in the middle", paths, clusters,
often learned from i2's SNA feature or a vendor course. Coding is mostly SQL and Excel; a Harris
County analyst pulls data "from an ODBC connection ... using Microsoft SQL Server, SSRS Reports,
Subpoena, and exports" ([IACA 2024 SNA talk][r2]). US training standards put 16 hours of basic
training on "association analysis, telephone record analysis, flowchart analysis
(event/commodity), financial analysis"
([Analyst Professional Development Road Map](https://bja.ojp.gov/sites/g/files/xyckuh186/files/Publications/AnalystProfessionalDevelopmentRoadmap.pdf)).

**Subpopulations that work differently.**

- _Digital forensic examiners and detectives_ work inside forensic suites (Cellebrite Pathfinder,
  Oxygen Forensic Detective, Magnet AXIOM, MSAB XAMN). Many cases now get their communications
  evidence mainly from phone extractions, because CDRs do not show app messaging. Cellebrite notes
  "nearly every case involving a digital component and often more than two devices"
  ([Cellebrite multi-device guide][r12]).
- _Cryptocurrency tracing investigators_ (IRS Criminal Investigation, FBI, HSI, Europol, national
  cyber units) trace ransomware payments, darknet-market and scam proceeds, sanctions evasion and
  thefts in server-backed tools: Chainalysis Reactor, TRM Forensics, Elliptic Investigator and the
  open-source GraphSense. IRS-CI used blockchain analysis to seize over 50,000 bitcoin stolen from
  the Silk Road marketplace ([Wikipedia][r21]).
- _Military and national intelligence analysts_ work under doctrine that is public even when their
  systems are not (section 5.10).

**Team context.** Analysts serve detectives, task-force officers and prosecutors rather than owning
cases, and they testify: US standards require that "analysts shall be capable of giving testimony
as fact/summary and expert witnesses" ([Law Enforcement Analytic Standards, 2nd ed.][r3]).
Military analysts sit in staff sections and targeting working groups and brief commanders.

**Crime analysis versus military and counter-terrorism intelligence.**

|            | Crime / criminal intelligence analyst                                              | Counter-terrorism / military intelligence analyst                     |
| ---------- | ---------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Core data  | CDRs, tower dumps, extractions, RMS, jail calls, warrant returns, ALPR, blockchain | Multi-source reporting, biometrics, forensics, captured media (DOMEX) |
| Question   | Who did it, who is in the crew, where did the money go, can we prove it            | Who is in the network, where they will be, which node to act on       |
| Output     | Case charts, court exhibits, bulletins, affidavits                                 | Target lists and folders, briefings, assessments                      |
| Constraint | Disclosure and admissibility, 28 CFR Part 23 retention                             | Classification, need-to-know, releasability                           |

## 3. Personas

### 3.1 Dana Ruiz -- criminal intelligence analyst, county sheriff's office (new: `crime-intelligence-analyst`)

- **Background.** Four years as an analyst. Grounded in the Harris County unit, which analyzes
  "tens of millions of data points" ([IACA 2024][r2]).
- **Tools today.** i2 Analyst's Notebook with saved import specifications; Excel; SQL against the
  records management system (RMS), jail-call and gang databases; ArcGIS Pro; CellHawk; PenLink
  PLX for pen registers; the free i2 Chart Reader for detectives.
- **Data.** CDR warrant returns from several carriers (each with its own columns, time zone and
  "carrier key"), tower dumps, ALPR reads, jail call logs (one year of a gang's outbound calls was
  "600K nodes"), Cash App and Zelle returns, provider returns from Meta, Google and Snap, adult
  service ads, gang lists.
- **Goals.** Find the phone that ties suspects to scenes; find the "shot caller" and the bridges
  between sets; give detectives leads to subpoena next; produce charts a prosecutor can use.
- **Frustrations.** Built-in SNA in RMS and jail systems: "You see two nodes are linked but they
  are all weighted the same. You cannot group them up by crime-type, region, or gang"
  ([IACA 2024][r2]). Normalizing carrier formats and time zones by hand ([SWGDE 2023][r4]). Slow
  i2 charts on large data and a steep learning curve ([SelectHub][r104]). "Sometimes the analysis
  goes nowhere" ([IACA 2024][r2]).

### 3.2 Gail Brennan -- trial and investigative analyst, district attorney's office or federal task force (new: `prosecution-trial-analyst`)

- **Background.** Former police analyst supporting prosecutors on homicide, robbery-crew and
  conspiracy cases. Grounded in the Dallas "Scarecrow bandits" case, charted in Analyst's Notebook
  ([i2 case study][r105]), and UK case Calland's "detailed sequence of events chart"
  ([R v Calland, EWCA Crim 2308][r106]).
- **Tools and data.** i2 timeline and association charts, redacted copies, PDF, large prints,
  ArcGIS; certified carrier records, cell-site lists, extraction reports, an exhibit index.
- **Goals.** An exhibit a jury understands in a minute, where every line traces to a record the
  defense has; a version that survives the judge's rulings.
- **Frustrations.** Judges strike inferences the data cannot carry: the Court of Appeal said the
  prosecution was "wrongly conflating the position of the mast with the inferences which can
  properly be drawn", and the trial judge asked for an alternative chart without 11 contested
  occasions ([Calland][r106]). Maps must "preserve aspect ratios" and automated plots must be
  checked by manual mapping ([SWGDE][r4]).

### 3.3 Marcus -- counter-terrorism and military intelligence analyst (existing: `intelligence-analyst`, corrected)

- **Background.** A decade of military intelligence (all-source analyst in a brigade or division
  intelligence section, then a targeting cell), now in a civilian counter-terrorism role.
- **Tools today.** DCGS-A tools including "Axis Pro/Link Diagram" for "mapping and understanding
  threat networks" ([ATP 2-33.4 A-4][r7]); i2 and Palantir Gotham; spreadsheets; and, when systems are down, sticky notes on a whiteboard,
  which doctrine endorses because they work "in OEs [operational environments] with intermittent
  connectivity and limited bandwidth" ([ATP 2-33.4 5-18][r7]).
- **Data.** Multi-source reporting; "biometrics, forensics, and DOMEX information"
  ([ATP 2-33.4 5-20][r7]); personality files; communications metadata; travel and financial
  records.
- **Goals.** Answer "Which nodes should be targeted for collection or defeat?"
  ([ATP 2-33.4 5-20][r7]); nominate high-value individuals with supporting reporting; measure what
  an operation did to the network.
- **Frustrations.** One person under many spellings and selectors; keeping grades visible; the
  pitfall that analysts "assume (incorrectly) that a central
  figure in a network is the leader" and that link charts are "a freeze-frame look" unless paired
  with a timeline ([ATP 2-33.4 table 5-5][r7]); releasable versions of classified charts ([i2][r103]).

### 3.4 Kevin Osei -- cryptocurrency tracing investigator, federal tax or cyber unit (new: `crypto-tracing-investigator`)

- **Background.** Special agent or civilian investigator with an accounting or cyber background,
  certified on a vendor course.
- **Tools today.** Chainalysis Reactor or TRM Forensics (agencies often hold more than one), block
  explorers, GraphSense where licensing or openness matters, Maltego with the INTERPOL GraphSense
  transform ([INTERPOL transform][r22]), Excel, i2 for the off-chain case chart.
- **Data.** Seed addresses from ransom notes, victim reports, seized devices or exchange records;
  the vendor's server-side graph of transactions and attributed clusters; exchange subpoena
  returns.
- **Goals.** Follow funds "from the first deposit to the final cash-out" ([Reactor page][r9]),
  find the exchange where they were cashed out, serve legal process there, seize what remains, and
  present the flow in court.
- **Frustrations.** Unreadable graphs: one Reactor wash-trading graph was "a veritable Christmas
  tree of multicolor types of transactions"
  ([The Block](https://www.theblock.co/news/business/2022-05-19-new-tech-streamlines-investigations-into-illicit-crypto-use-chainalysis-147856));
  defense attacks on clustering
  heuristics ("junk science", per coverage of the Bitcoin Fog case, [Stout][r11]).

## 4. Use cases, ranked

Ranked by frequency and stakes, judged from the sources cited.

1. **Telephone record (toll) analysis.** Who called whom, how often, common numbers, change around
   an event ([UNODC][r5]) (5.1, 5.2). Daily; high stakes.
2. **Multi-device analysis of phone extractions** (5.6). Daily where there is a forensic lab.
3. **Placing a device or vehicle near a scene.** Cell sites, tower dumps (Scarecrow: 150,000
   records to "fewer than ten identifiable phones", [i2][r105]), ALPR convoys (5.4, 5.5). Very high
   stakes, often contested.
4. **Timeline charting** (5.3). Every major case; highest stakes in court ([Calland][r106]).
5. **Association charting of a group.** UNODC's questions include "Who is central in this
   organization?" and "Who forms a bridge or liaison between distinct organizations?" (5.7).
   Weekly to daily in gang and narcotics units.
6. **Deconfliction and subject research.** One- and two-hop lookups before an operation
   ([MSHP][r1]). Many times a day, usually in search interfaces.
7. **Cryptocurrency tracing** (5.9). Daily for specialists; seizures and court.
8. **Commodity and fiat money flow.** Count and total per direction; Cash App "bridge" accounts between
   targets ([IACA 2024][r2]). Weekly; see financial-crime-fraud-aml-kyc.md.
9. **Social media, ads and provider returns** (5.11). Weekly in gang and trafficking units.
10. **Network analysis for targeting** (5.10). Daily in targeting cells; life-and-death stakes.
11. **Group SNA and disruption planning from intelligence logs** (5.8): profiles, removal
    simulation, replacement. Periodic; feeds enforcement priorities.
12. **Briefing and court charts** (5.7).

## 5. Step-by-step workflows

Note on sources: i2 documentation at docs.i2group.com now sits behind a login, so i2 details come
from search-indexed excerpts, IBM technotes, a published i2 user guide and UNODC; links to it are
kept for readers with access. Vendor steps are marked.

### 5.1 Importing call detail records into i2 Analyst's Notebook

Sources: [IBM 6413409](https://www.ibm.com/support/pages/node/6413409),
[IBM 716175](https://www.ibm.com/support/pages/node/716175), i2 excerpts on
[specifications](https://docs.i2group.com/anb/9.4.0/import_specifications.html) and
[local matching](https://docs.i2group.com/anb/9.4.0/record_match_local.html), [SWGDE][r4].

1. **Obtain records.** Serve legal process and request the carrier's "CDR reference document,
   also known as a 'carrier key'" and its cell-site list ([SWGDE 7.1, 6.3][r4]). For prepaid MVNO
   phones, records must also come from the underlying network.
2. **Clean in Excel.** Columns differ by carrier. Carriers report times in the device's zone, the
   switch's zone, a central zone or UTC, and "a single CDR could also contain a mix of time zones"
   (SWGDE 7.3). Normalize numbers; UNODC says "always use dialling codes" ([UNODC ch. 9][r5]).
3. **Start the import** (Import > Import from file), pick or create a specification, set delimiter
   and header rows, and pick a design: association for a calling network or timeline.
4. **Assign columns.** Calling number to entity 1 (Telephone), called number to entity 2; date,
   time, duration, type and cell ID to the link. Each entity needs an identity column. Column
   actions replace or standardize values so matching works
   ([IBM](https://www.ibm.com/support/pages/changing-and-replacing-values-i2-analysts-notebook-import-specification-data-column)).
5. **Set date and time formats** per column.
6. **Set link multiplicity**: Multiple (every call a line), Directed (calls in one direction
   merged; the usual choice) or Single (one line per pair)
   ([about links](https://docs.i2group.com/anb/9.4.0/about_links.html)); label links with the count
   and "Sum Numeric Links" on duration or amount (IBM 716175).
7. **Matching**: choose the properties that identify an entity, so a number in two carriers' files
   becomes one node.
8. **Save the specification** (.ximp or .oimp) to a "workgroup" folder; teams keep one per carrier.
9. **Import and check** with List Items and List Most Connected
   ([IBM](https://www.ibm.com/support/pages/analyzing-total-number-links-between-entities-ibm-i2-analysts-notebook)).

### 5.2 Telephone analysis, and appending live pen-register data

Sources: [UNODC ch. 9][r5], [PenLink CDR primer][r16],
[IBM link thickness](https://www.ibm.com/support/pages/node/6520022), [PenLink live collection][r17].

The manual method still taught: a square, directed "from x to" matrix of call tallies, then a
chart with most-linked numbers in the center and counts per direction; UNODC says this works
"only ... for the most simple of datasets".

In software (typical i2 sequence, reconstructed from the sources):

1. Import all subject phones with Directed multiplicity (5.1).
2. Size link width by Count with a conditional formatting specification (IBM 6520022).
3. Find common numbers linked to two or more subjects; the i2 Insights add-on has a heat matrix.
4. Hide one-off contacts, filter by date around the event, switch a pair to Multiple to see each
   call.
5. Identify unknown numbers by subscriber lookups; add names, aliases and addresses.
6. Run centrality on the number network (5.8).
7. Hand off priority numbers for legal process or a wiretap application, and a toll chart.

**Appending live data (ongoing investigations).** Pen registers, trap-and-trace orders and Title
III wiretaps deliver records continuously. PenLink markets PLX for "live collection of phone data"
and says social media, messaging and email providers deliver intercept data "in near-real time, to
support pen register and wiretap collection" ([PenLink][r17], vendor claim). The
chart step, inferred from these sources and the i2 matching step: re-import new records through the
same specification, match them to entities already on the chart, keep the analyst's hand layout and
annotations, and highlight what is new since the last update. How i2 users handle this: no source found.

### 5.3 Building a timeline (theme-line and event-frame) chart

Sources: [UNODC ch. 7][r5], [i2 user guide][r107],
[IBM event-frame technote](https://www.ibm.com/support/pages/setting-event-frame-behaviour-theme-lines-after-importing-ibm-i2-analysts-notebook),
[ATP 2-33.4 5-8 to 5-10][r7], [Calland][r106].

In i2 a theme line is a horizontal line for "a key element of an investigation, such as a suspect
or bank account"; an event frame is a box that "emphasizes date and time information" on or
between theme lines; time runs left to right on a time bar.

1. Decide the theme lines (one per suspect, phone, vehicle, account), related lines together.
2. Create events from imported rows or statements. UNODC: text "no longer than three or four
   words", hypothesized events drawn differently.
3. Connect events to theme lines; bulk imports leave frames pinned to lines, fixed with Segment
   Wiring Height "Not Diverted" (IBM technote). Configure the time bar; save a template.
4. Read gaps, bursts and order (Scarecrow: a vehicle stolen "two to three days before each
   offense", [i2][r105]); filter by time.
5. Keep association chart and timeline as linked views; KronoGraph demos do this on about 23,000
   calls among 27 people ([Cambridge Intelligence][r108]).
6. For court, show only what the evidence supports, with alternatives for possible rulings.

### 5.4 Cell-site, timing-advance and radio-survey analysis

Sources: [SWGDE 17-F-001 v2.0][r4] (now v3.0), [SWGDE 25-F-002 timing-advance notes, 2025][r117],
FBI CAST ([basic course flyer][r118]; a leaked CAST guide, copies on [Scribd][r119] and
[DocumentCloud][r120], read partly from search summaries; dated 2018), [UKAS bulletin][r121],
[Tart et al. 2021][r122], [i2 Insights sheet][r123], [CellHawk][r124].

Three location record types arrive, and they mean different things:

- **Historical cell-site data in CDRs:** cell and sector per call, text or data session, drawn as a
  wedge from the cell-site list (location, azimuth, beamwidth).
- **Timing-advance or distance records**, kept by carriers for engineering: cell, sector and a
  distance band per event. CAST's request template asks for "Timing Advance Reports, currently known
  as True Call, to include cell site, sector, and distance from tower", and lists Verizon "RTT" and
  AT&T "NELOS" reports; practitioners say True Call is T-Mobile's and NELOS gives latitude,
  longitude and accuracy in meters ([forum](https://www.forensicfocus.com/forums/general/per-call-measurment-data/), search excerpt). SWGDE says this analysis "should not be confused
  with historical cell site location information analysis". Some returns add a provider-estimated
  point and confidence; SWGDE warns these come from undisclosed algorithms whose "validity and
  accuracy ... cannot therefore be determined". Carriers need not keep them.
- **Area searches:** devices in a requested area and window, from the carrier's estimated location,
  not from timing advance (SWGDE 25-F-002 section 10).

Steps (CAST course outcomes plus SWGDE; CAST's own step order: no source found):

1. **Request.** A probable-cause warrant (SWGDE), the carrier key, a cell-site list "representative
   of the time period(s)", and timing-advance reports; CAST suggests at least 60 days of records for
   pattern analysis. Preserve early.
2. **Normalize** time zones (5.1) and distance units. Providers send a band number or a distance in
   steps, miles or meters. The band's inner edge is band number times step (LTE 78.07 m, GSM about
   550 m, 5G 78 to 9 m), the outer edge one step farther. SWGDE's example: a T-Mobile LTE "0.34 miles"
   is 547.18 m, band 7, 546.49 to 624.56 m.
3. **Plot.** CDR events as sector wedges (do not "underestimate a sector's actual coverage");
   timing-advance events as an arc across the sector angle between inner and outer edge. Multipath
   means the phone "may be physically closer to the antenna than indicated". Overlapping arcs from
   events close in time are intersected ("lateration"). CAST teaches its free mapping tool CASTViz.
4. **Tower and area dumps:** intersect numbers seen at several scene towers in offense windows
   (Scarecrow: two hours before to one hour after); survivors go to the call chart (5.2).
5. **Validate coverage by radio survey (drive test)** when the question needs it. CAST uses
   "industry standard survey gear" to find a sector's true coverage (search summary). In the UK,
   accreditation for geolocation opinion "must cover RF survey capability, CDR content normalisation
   and processing and mapping"; a survey is not needed in every case, but "without an RF survey ...
   there is no testing or confirmation of the CDR content", and skipping one must be justified
   ([UKAS][r121]). A single-device five-minute static survey "is now known to be deeply flawed (very
   prone to false exclusions)"; better practice uses several devices, idle and call modes, approaches
   from many directions, and a mast visit if a cell is missing. ([Tart et al.][r122]).
6. **Join location back to the chart and timeline.** The i2 Insights add-on answers "Who called who
   and with what SIM or phone?" and "When and where they made the call?", maps "cell tower
   locations", "azimuths" and "entities at cell towers", and can "play back locations". CellHawk
   makes "static maps, animated routes, heatmaps, and link charts" (vendor). So each event carries phone, time, cell, sector and band, and the
   same record is a link on the association chart, a frame on the phone's theme line and a wedge or
   arc on the map (inferred; no public step-by-step for i2 or Pathfinder found).
7. **Report and testify.** Drafts marked "draft ... not fully verified"; court maps verified by a
   second method, with "legends and distance scales" and true aspect ratio (SWGDE 17-F-001). UK juries
   see "a series of maps and tables, often with survey results" (Tart). Only a qualified expert
   testifies: CAST's basic course "does not provide the requisite knowledge or experience to qualify
   students as experts", and CAST agents get "over 500 hours of training" before testifying.
   Certification runs basic course, then geo-location, field-exercise, instructor and advanced
   courses, about 18 to 24 months (search summary of the CAST guide).

Uncertainty conventions for court: SWGDE fixes band widths and the inner-edge reading and says
timing advance "cannot be used to determine a device's exact geolocation"; a standard wedge radius
or arc-width rule: no source found. A location event is therefore a shape (wedge, arc, or point with
radius) with its source record, provider confidence and a verified flag, tied to a phone and a time.

### 5.5 Co-location and convoy analysis from ALPR reads

Sources: [i2 iBase Convoy Analysis][r14], [Vigilant PlateSearch brochure][r15],
[UCF convoy paper][r23].

ALPR (automatic license plate reader) cameras record plate, time and camera location. The same
co-occurrence logic applies to tower dumps and extraction locations.

1. Start from target plates (a suspect's car, a stolen vehicle) and a date-time range. In i2 iBase
   Plate Analysis (SQL Server databases only), convoy analysis compares "a target list of vehicles"
   with plate records.
2. Define an encounter: i2 counts vehicles read at the same camera within plus or minus 10 seconds
   of the target (search excerpt of the 9.2.1 documentation).
3. Set a minimum count of repeat encounters: setting it to 2 means the vehicle "has been in convoy
   with a target vehicle on more than one occasion" ([i2][r14]).
4. Review candidates: vehicles "previously unknown, but ... identified traveling with known or
   suspected criminals"; enrich with registration data (make, model, color)
   ([i2 ANPR article](https://i2group.com/articles/leveraging-anpr-for-intelligence-led-policing)).
5. Chart the co-occurrence graph (target to companion, weighted by encounter count) and pass
   companions to the toll and timeline work. Vigilant markets the same "associate or convoy
   analysis" ([Vigilant][r15], vendor claim).
6. Caution: researchers note a convoy should be judged "relative to background traffic patterns",
   because vehicles meet by chance ([UCF][r23]).

### 5.6 Multi-device communication analysis from phone extractions

Sources: [Cellebrite multi-device guide][r12], [Cellebrite social circles][r24],
[Cellebrite cross case][r25], [Octostar forensic importer][r13], [Magnet AXIOM Connections][r26].
Steps assembled from vendor material; no vendor manual was readable.

1. **Import every device's extraction.** Formats include UFDR XML reports and UFDR packages (ZIP
   with media) from Cellebrite ([Octostar][r13]), and XML or CSV reports from other suites.
2. **Unify identities.** Pathfinder claims to "correlate digital identifiers across platforms and
   devices" ([Cellebrite][r12]): one person may appear as a phone number, an email, a WhatsApp
   account and app user IDs, and contact names differ across phones.
3. **Build the communication graph.** Nodes are contacts or numbers, links are communications,
   filterable "by message type, direction, and time range" ([Octostar][r13]). Group chats make a
   person-to-group two-mode graph rather than pairwise links.
4. **Find common contacts.** Pathfinder's graph "identifies the people they share in common"
   ([Cellebrite][r24], search excerpt). Octostar defines "Hubs: contacts on three or more devices"
   and "Bridges: contacts on exactly two devices" ([Octostar][r13]).
5. **Open the messages behind a link.** Pathfinder shows "all messages between parties, across
   apps in one unified view" ([Cellebrite][r12]). AXIOM Connections relates artifacts through a
   chosen attribute such as "a filename or hash value" across phones, cloud and computers
   ([Magnet][r26]).
6. **Build a timeline** of "a person's pattern of life" ([Cellebrite][r12]).
7. **Run cross-case matching** to see "if the same people were involved in different cases"
   ([Cellebrite][r25], search excerpt).
8. **Export** with artifact references so each line traces to an extraction record.

Sizes: no published per-phone figure found.

### 5.7 Producing a court or briefing chart by hand

Sources: [UNODC ch. 6][r5], [Law Enforcement Analytic Standards][r3],
[ABA on summaries](https://www.americanbar.org/groups/family_law/publications/family-advocate/2022/spring/show-and-tell-summaries-and-demonstrative-evidence/),
[Calland][r106].

UNODC's seven-step method: assemble data; determine the focus; build an association matrix;
code each association; count links "across and down"; draw a preliminary chart; "clarify and
re-plot" to remove long and crossed lines.

Conventions that carry meaning:

- Circles for people, rectangles for organizations; "confirmed links are shown with solid lines
  and suspected links with dotted lines". A link is confirmed only when graded A1, A2, B1 or B2
  (UNODC figure 6-4), so line style follows the source grade. Hypothesized links must look
  different. Army doctrine uses colored and dashed lines by activity (money, communications) with a
  legend ([ATP 2-33.4 5-20][r7]).
- "All charts should be timed, dated and sequence numbered", "particularly relevant with regard to
  disclosure issues", with a key.
- Most-linked entities in the center; "a symbol represents the same thing whenever it is used".
- "A chart is not in itself an analytical product, it is an analytical tool"; products separate
  fact from judgment ("Data Source Attribution", analytic standards).

Legal frame (US): phone-contact charts are usually admitted as summaries of voluminous records
(Federal Rule of Evidence 1006), so the underlying records must be admissible and given to the
other side. Hand-off: a redacted copy per audience (i2 "Save a Redacted Copy",
[excerpt](https://docs.i2group.com/anb/9.4.0/present_and_distribute_charts.html)), PDF, a poster,
the read-only i2 Chart Reader.

### 5.8 Network analysis of a criminal group from intelligence records

Sources: [Home Office Research Report 89][r6] and its "How to guide" annex, [IACA 2024][r2],
[Dempsey 2021][r112]; disruption studies [Cavallaro et al. 2020][r113], [Jia et al. 2024][r114],
[Bright et al. 2015][r115], [Ficara et al. 2023][r116].

1. **Seed and sweep.** Choose seeds (five gang-linked individuals) and a window (six months);
   code everyone the logs mention and the relation (gang, criminal, drugs or "other social
   links"); sweep again (the study stopped after two).
2. **Filter by grade.** About 600 links cut to 424 (A1 to A4, B1, B2 on 5x5x5, about 73 percent),
   on analysts' advice, though untested-source intelligence "may be the most operationally
   important".
3. **Load.** UCINET via a custom script, then NodeXL, "which is able to read in data that is not in
   matrix form". Harris County in ArcGIS: CSV to link chart, "generate node scores", search calls
   to key nodes, add RMS and court data, re-run.
4. **Measure each link type, then overlay.** Size, components, density and centrality per
   sub-network (all, gang, criminal, drugs, social, drugs plus social). Manchester's three drugs
   components "are actually connected via other social links", which "may make the network more
   difficult to disrupt". Operational systems
   mostly treat links as binary and equal ([Dempsey][r112]; Harris County). i2 can weight links by type (search excerpt).
5. **Profile people.** Plot degree against betweenness: gatekeepers ("uniquely connected to parts
   of the network, but not to many others"), central, highly visible (many links, no unique role),
   peripheral. Manchester: 3, 7, 10 and 117 of 137.
6. **Match profile to action.** Fragment through gatekeepers or central people; gather or spread
   information through central and highly visible people; aim prevention at peripheral people.
   As the gang "does not heavily rely on individuals", the report suggests removing all central
   figures at once.
7. **Simulate removal** (UNODC's "which three individuals would sever a supply network?"). Rank by
   a centrality; remove one at a time (an arrest), re-ranking what remains, or in blocks (a raid);
   track the largest connected component (LCC) after each step. Montagna: removing the top 5
   percent by betweenness gave "a reduction of up to 70% in the size of the LCC", weighted or not
   ([Cavallaro et al.][r113]). Betweenness wins when any node may go, degree when removals must come
   from the LCC, and a greedy search over high-betweenness nodes beats both ([Jia et al.][r114]).
8. **Model replacement.** In a 793-actor Dutch cannabis chain, orphaned actors recruited same-role
   replacements and the chain often became "more efficient"; only removing every electricity
   diverter worked ([Duijn et al. 2014](https://pmc.ncbi.nlm.nih.gov/articles/PMC3937802)).
   Manchester warns a non-criminal tie may turn criminal to replace a broken one.
9. **Allow for missing data.** Wiretaps run "at most 40 days" and leaders avoid phones
   ([Cavallaro et al.][r113]). Research perturbs edges to test whether rankings hold
   ([Catlin et al. 2025](https://arxiv.org/abs/2509.08028)) and predicts missing links
   ([Berlusconi et al. 2016](https://pmc.ncbi.nlm.nih.gov/articles/PMC4841537)); practitioner
   use: no source found; in practice the checks are grading and officer review.
10. **Validate and report.** In Manchester, officers found a "gatekeeper" with family ties not known to be
    in the gang; nodes were not scaled by tie strength "given limitations around the accuracy of
    the police intelligence data"; decisions weigh profiles "alongside network statistics ...,
    network diagrams, and operational experience". Advising a police ethics
    committee, Dempsey says descriptive graphs are about 90 percent of "real and effective usage",
    dismantling metrics are "quite opaque", and ties past the first degree need more evidence
    ([Dempsey][r112]). A police briefing template: no public source found (military: 5.10).

### 5.9 Cryptocurrency tracing from a seed address to a cash-out exchange

Sources: [Chainalysis Reactor][r9], [Chainalysis cross-chain blog][r27], [TRM Forensics][r28],
[GraphSense][r10], [INTERPOL transform][r22], [Haslhofer and Meiklejohn 2022][r29],
[Stout on Sterlingov][r11], [Elliptic on DarkSide][r30],
[Bracewell on exchange records](https://bracewell.com/node/54234). No vendor manual was readable;
the order of steps is assembled from these sources.

1. **Get a seed.** A ransom note's payment address, a victim's outgoing transaction, an address on
   a seized device or in exchange records. Colonial Pipeline: 63.7 of 75 ransom bitcoin traced with a block
   explorer and seized ([Elliptic][r30]).
2. **Look up the cluster and its attribution.** Addresses are grouped into clusters believed to be
   one controller. The co-spend heuristic treats addresses used as inputs to one transaction as
   "likely controlled by the same user" ([Stout][r11]); the change heuristic assigns a payment's
   change output to the sender ([Haslhofer and Meiklejohn][r29]); both can err (error rates in
   financial-crime-fraud-aml-kyc.md, 5.7). GraphSense's Maltego transforms are "To Cluster" and
   "To Tags" ([INTERPOL][r22]). Tags come in GraphSense TagPacks, public or private
   ([GraphSense][r10]).
3. **Expand hop by hop.** TRM's UTXO mode follows "transactions forward or backward in the chain
   with a single click" ([TRM][r28], search excerpt); GraphSense offers "transaction traversal"
   and "automatic search for transaction paths between two nodes" ([GraphSense][r10]). Analysts
   restrict by amount and time (filter menus: no public source).
4. **Handle peel chains, mixers and bridges.** A peel chain is "a set of linked transactions that
   are all initiated by the same entity", followed by finding the change output at each step
   ([Haslhofer and Meiklejohn][r29], search excerpt). Reactor keeps "every case-relevant token in a single graph" with an asset selector that
   dims other clusters ([Chainalysis][r27]).
5. **Reach a labeled service cluster** ([Reactor][r9]); an exchange deposit address is where
   identity can be obtained.
6. **Serve legal process on the exchange.** IRS requests to exchanges have sought "account
   registration records, Know-Your-Customer (KYC) due diligence ... records of account activity"
   ([Bracewell](https://bracewell.com/node/54234), search excerpt).
7. **Add off-chain identities.** Reactor lets investigators add "financial entities and documents"
   to the graph ([Reactor][r9]); otherwise the KYC identity moves to the i2 case chart.
8. **Produce the court graph.** In United States v. Sterlingov (Bitcoin Fog), after Daubert
   hearings the court held Chainalysis analytics "admissible as substantive evidence"; Reactor had
   attributed over 900,000 addresses to the service and "undercover transactions confirmed"
   attributions ([Stout][r11]). TRM shows "which clustering heuristic is
   being used" for court use ([TRM][r28], search excerpt).

Unlike CDR work, the graph lives on a vendor server and is never imported whole, nodes are
clusters that open into addresses, and the analyst must show how much traced value went down each
branch. Exchange-side tracing: financial-crime-fraud-aml-kyc.md 5.4 and 5.7.

### 5.10 Network analysis for targeting (military and counter-terrorism)

Sources: [ATP 2-33.4 (2020)][r7] chapter 5 and appendix F, [FM 3-24 (2014)][r8] paragraphs
4-94 to 4-102 and 7-52 to 7-55. Steps marked "doctrine" are prescribed; "inferred" steps are
common practice not spelled out in these manuals.

1. **Define the network and the question** (doctrine). Link analysis informs "the targeting
   process and ... assessing personalities, as accomplished during step 3 of the intelligence
   preparation of the battlefield process" ([ATP 2-33.4 table 5-5][r7]).
2. **Extract entities and relationships** "from intelligence holdings that include ... biometrics,
   forensics, and DOMEX information" (doctrine, 5-20, step 1).
3. **Build the activities matrix** (doctrine): it "determines connections between individuals and
   any organization, event, entity, address, activity, or anything other than persons", a two-mode
   people-by-events table (5-11, figure 5-9).
4. **Build the association matrix** (doctrine): it "identifies the existence and type of
   relationships between individuals as determined by direct contact" (5-11, figure 5-8). Projecting it to person-to-person ties
   is inferred practice; the manual does not prescribe it.
5. **Draw the link diagram** (doctrine, 5-20 step 2): separate shapes ("circles for people,
   rectangles for activities, and triangles for facilities") and line styles per activity ("green
   solid lines for money transfers, blue dotted lines for communications"), with a legend.
6. **Analyze centrality and structure** (doctrine). Questions: "Which entity is central or key to
   the network?", "Who or what forms a bridge or liaison between groups or subgroups?", "How have
   the interactions changed over time?" (5-20 step 4). FM 3-24 names degree, betweenness ("a broker
   role") and density, and warns that peripheral nodes "are often connected to networks that are not
   currently mapped" ([FM 3-24 4-96, 4-97, 4-99][r8]).
7. **Build pattern-of-life timelines and time event charts** (doctrine, 5-8 to 5-10), because link
   analysis "seldom conveys change over time unless paired with a timeline" (table 5-5).
8. **Summarize and nominate** (doctrine). Step 5 is to "summarize what is observed in the chart and
   draw interim hypotheses". In targeting, high-value targets are ranked "in order of their relative
   worth"; analysts "determine how the threat might react to the loss of each identified HVT"; those
   confirmed are "nominated as HPTs" and grouped in a high-payoff target list "submitted to the
   commander for approval" (appendix F-8, F-13, F-14). Attaching each nomination's supporting
   reports to the chart node is inferred.
9. **Assess after action** (doctrine). Battle damage assessment charts may be "based on the threat's
   organization" (F-55, figure F-3); FM 3-24 tells staffs to map density over time to "monitor the
   effects of recent operations" and notes a fall in density "means the group is reduced and
   becoming fragmented" (4-101, 4-100).
10. **Release** (inferred from i2's redaction by clearance, [i2][r103]): briefing versions per
    classification level, with ICD 203 confidence and likelihood ("Likely" = 55-80%,
    [ATP 2-33.4 figure C-1][r7]).

### 5.11 Gang and trafficking networks from social media, ads and provider returns

Sources: [IACA 2024][r2], [COPS Cincinnati report][r19], [Maryland MCAC][r31],
[Magnet warrant returns][r18], [Maltego law enforcement][r20].

1. **Collect.** Provider warrant returns "typically come in .zip files" of HTML, JSON, CSV, PDF,
   mbox and images with no standard layout ([Magnet][r18]); Public profiles are collected by OSINT tools; Maltego sells law enforcement a
   "capability to collect, preserve, and monitor social media intelligence" ([Maltego][r20]).
2. **Extract link types**: account to account (messages, friends, followers), account to IP
   address and login time, account to device, account to phone and email.
3. **Link ads and accounts by shared identifiers.** Harris County linked 244.6K adult service ads
   through 13,336 phone numbers ([IACA 2024][r2]).
4. **Add the friend and follower graph.** "'Friends' can be used effectively for link analysis"
   ([MCAC][r31], search excerpt). Cincinnati police combined official records with social media
   data, and SNA "clearly showed the gang's hierarchy" ([COPS][r19], search excerpt).
5. **Join to CDRs and RMS** in the case chart ([PenLink][r16]).

## 6. Data

### 6.1 Sources and formats

- **Telecom:** CDRs, cell-site lists, tower dumps, pen register and trap-and-trace feeds (live),
  timing-advance and distance reports (True Call, RTT, NELOS; 5.4), "pings" ([SWGDE][r4], [PenLink][r16]); Excel, CSV, PDF or
  fixed-width text per carrier.
- **Device extractions:** contacts, call logs, app messages, group chats, media, locations, Wi-Fi
  networks; Cellebrite UFDR (XML or ZIP package), other suites' XML and CSV ([Octostar][r13]).
- **Provider returns:** ZIP packages of HTML, JSON, CSV, PDF and mbox per provider ([Magnet][r18]).
- **Blockchain:** server-side ledgers and attributions (vendor or GraphSense); exchange KYC returns.
- **Agency records:** RMS, CAD, arrests, field interviews, gang databases, jail calls, ALPR reads
  (LAPD's Palantir manual covers person, vehicle and ALPR searches, [Prison Legal News][r109]).
- **Intelligence logs** with identifier, date, people, linked reports and grade ([Home Office][r6]);
  financial returns; military multi-source reports and DOMEX (no public schema).
- **Interchange:** i2 chart (.anb), template (.ant), specs (.ximp/.oimp), ANX XML
  ([IBM](https://www.ibm.com/support/pages/analysts-notebook-exchange-file-anx-format)), CSV,
  KML/shapefiles.

### 6.2 Graph properties

- **Typed, multi-modal entities:** person, phone number, handset (IMEI), SIM (IMSI), app account,
  email, IP address, wallet address and cluster, vehicle, address, cell site, camera, organization,
  event.
- **Multigraph** with many typed, timestamped, directed edges per pair, aggregated by direction
  with counts and sums (5.1); in blockchain work each edge also carries amount and asset.
- **Identity nodes with many identifiers** to be merged (5.6), and **cluster nodes** that open into
  addresses (5.9).
- **Two-mode data** that analysts project: inmates to numbers, phones to towers, people to events
  (the activities matrix), people to group chats, ads to phone numbers.
- **Temporal and spatial:** timestamps in mixed zones; sector wedges, timing-advance arcs, camera points.
- **Multiplex:** criminal, drugs and social layers (5.8); Montagna Meetings and Phone Calls
  ([Zenodo](https://zenodo.org/record/3938818)); Sinaloa ties by type ([Calderoni et al. 2025][r110]).
- **Uncertain and graded edges:** confirmed, suspected, hypothesized; heuristic cluster membership.
- **Incomplete, fuzzy-bounded, changing:** Sparrow's three problems
  ([Wikipedia summary](https://en.wikipedia.org/wiki/Link_analysis)); and growing during a case.

### 6.3 Documented sizes

| Case                          | Size                                             | Source                                      |
| ----------------------------- | ------------------------------------------------ | ------------------------------------------- |
| Scarecrow robbery crew        | ~150,000 tower records to <10 phones             | [i2][r105]                                  |
| Harris County funnel          | 10M+ records to ~100,000 to ~1,000 to ~100 nodes | [IACA 2024][r2]                             |
| Harris County jail calls      | ~600K nodes per year; 120-156 after filtering    | same                                        |
| Harris County trafficking ads | 244.6K ads, 13,336 phone numbers                 | same                                        |
| Manchester gang               | 137 people, ~600 links, 424 reliable             | [Home Office][r6]                           |
| Montagna mafia                | ~100 nodes per layer, 124-256 edges              | [Zenodo](https://zenodo.org/record/3938818) |
| Sinaloa trial                 | 188 actors                                       | [Calderoni et al.][r110]                    |
| Nampa trafficking ring        | 59 suspects                                      | [Cellebrite][r12]                           |
| Bitcoin Fog                   | >900,000 addresses attributed to one service     | [Stout][r11]                                |

Court and briefing charts are far smaller: UNODC examples have under 20 entities. No published i2
size limit was found. Military network sizes: no source found.

### 6.4 Identifier problems

- Phone formats ("+420..." vs "00420...",
  [GraphAware](https://policinginsight.com/feature/analyzing-call-detail-records-with-connected-data/)).
- One person, many phones and accounts; one phone, many users (SWGDE: CDRs "do not conclusively
  indicate who was using a device").
- Names, aliases, nicknames, contact names that differ across seized phones.
- Same entity across sources: i2 Find Matching Entities offers Smart Matching, Label Matching and
  "Previously Linked Matches", then review, merge and "Does Not Match" exclusions
  ([IBM](https://www.ibm.com/support/pages/find-matching-entities-ibm-i2-analysts-notebook));
  iBase import does not flag duplicates
  ([excerpt](https://docs.i2group.com/ibase/9.1.2/matching_entites_import.html)).
- Wallet clusters are heuristic and can be wrong; heuristics are contested in court ([Stout][r11]).

### 6.5 Sensitivity and access

- US criminal intelligence systems label information "to indicate levels of sensitivity, levels
  of confidence, and the identity of submitting agencies" (28 CFR 23.20, in [standards][r3]).
- Palantir ALPR searches require a "search purpose (a DR or case number) ... for auditing" (LAPD).
- UK handling codes P or C ([College of Policing APP][r111], search excerpt).
- Classified data and redacted copies per clearance (i2). Data mostly stays on agency networks
  (inferred).

## 7. Analysis methods

### 7.1 Algorithms and statistics actually used

- **Counting** per pair, direction, hour and weekday.
- **Common neighbors:** numbers called by several subjects; devices at several scenes; contacts on
  two or more seized phones (hubs and bridges, 5.6).
- **Co-location and convoy:** entities seen at the same place within a time window, at least N
  times (5.5).
- **Centrality:** degree, betweenness, closeness, eigenvector, k-core (i2 SNA; FM 3-24). Harris
  County: eigenvector picks the "General/Sheriff linked to Majors"; betweenness picks the bridge.
- **Paths:** Find Path including dated-event order; connecting network among seeds; path search
  between wallets (GraphSense).
- **Flow tracing:** following value through hops, peel chains and bridges (5.9).
- **Clustering by heuristics:** co-spend and change-address clustering of wallets.
- **Density and change over time:** FM 3-24 4-99 to 4-102.
- **Removal impact:** sequential or block removal by a centrality, scored by largest-component
  size, with replacement (5.8; UNODC; ATP 2-33.4 F-13).
- **Degree-by-betweenness profiles:** gatekeeper, central, highly visible, peripheral (5.8).
- **Matrices:** association (triangular), telephone (square, directed), activities (two-mode).

### 7.2 Interpretation and validation habits

- Grade before use; US gradients run "reliable" to "reliability unknown" and "confirmed" to
  "cannot be judged", and the bottom two are not disseminated ([standards][r3]).
- Do not equate centrality with leadership ([ATP 2-33.4 table 5-5][r7]); expect a disrupted
  network to rewire rather than collapse (5.8).
- Missing-data checks (edge perturbation, link prediction) exist in research; practitioner use:
  no source found.
- Validate with officers who know the group (Home Office); verify cell-site plots by a second
  method (SWGDE) and coverage by radio survey (5.4); confirm cluster attributions with undercover transactions (Bitcoin Fog).

### 7.3 Grading and confidence systems a tool must represent

| System                               | Source axis                                        | Information axis                                                                | Other                          | Source                                                           |
| ------------------------------------ | -------------------------------------------------- | ------------------------------------------------------------------------------- | ------------------------------ | ---------------------------------------------------------------- |
| 4x4 (Europol and others)             | A, B, C, X                                         | 1-4                                                                             |                                | [UNODC ch. 4][r5]                                                |
| 6x6 Admiralty / NATO                 | A to E, F cannot be judged                         | 1 confirmed to 5 improbable, 6 cannot be judged                                 |                                | UNODC; [Wikipedia](https://en.wikipedia.org/wiki/Admiralty_code) |
| UK 5x5x5 (to about 2016)             | A always reliable ...                              | 1 known to be true ...                                                          | 5 handling codes               | [Home Office][r6]                                                |
| UK 3x5x2 (current)                   | 1 reliable, 2 untested, 3 not reliable             | A known directly ... E suspected false                                          | P or C handling                | [College of Policing][r111]                                      |
| US analytic standards                | reliable ... reliability unknown                   | confirmed ... cannot be judged                                                  | sensitivity                    | [standards][r3]                                                  |
| US IC ICD 203 (judgments, not items) | source descriptors per ICD 206                     | likelihood bands (7, from "Almost no chance" 01-05% to "Almost certain" 95-99%) | confidence high, moderate, low | [ATP 2-33.4 app. C][r7]                                          |
| i2 default grading                   | reliable, sometimes reliable, unreliable, untested | reliable, unreliable, unknown                                                   | confidentiality; source type   | [i2 user guide][r107]                                            |

ICD 203 grades judgments, not items. In i2, grades are properties of every chart item (Chart
Properties > Definitions > Grading System, changed only "when your chart is empty") and drive line
style through conditional formatting.

## 8. Outputs and collaboration

- **Deliverables:** association, toll, timeline, commodity and flow charts, cell-site maps,
  "intelligence booklets" for prosecutors ([MSHP][r1]), bulletins, high-payoff
  target lists and target spreadsheets ([ATP 2-33.4 F-11][r7]), crypto flow graphs for affidavits
  and trial. A "network analysis might include an association matrix, a link chart, a map, a
  geospatial chart, a summary, conclusions, and recommendations" ([standards][r3]).
- **Sharing and audit:** chart files on shared drives, Chart Reader, PDF, redacted copies, shared
  stores; dated, sequence-numbered charts; technical review (SWGDE); logged search purposes.

## 9. Tools landscape and pain points

| Tool                                                                        | Role                                  | Loved for                                                        | Fails them                                                                                                |
| --------------------------------------------------------------------------- | ------------------------------------- | ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| i2 Analyst's Notebook (Windows, from about $7,160/yr per [SelectHub][r104]) | Link and timeline charts              | Import specs, multiplicity, theme lines, grading, redaction, SNA | Learning curve, lag on large data, cost, docs behind login                                                |
| i2 iBase / Insights                                                         | Shared stores, ANPR, phone dashboards | Convoy analysis, heat matrix                                     | Duplicates not flagged                                                                                    |
| Palantir Gotham                                                             | Large agencies, military              | Search Around, Resolve, audit                                    | Cost; scrutiny ([The Intercept](https://theintercept.com/2021/01/30/lapd-palantir-data-driven-policing/)) |
| PenLink PLX                                                                 | Returns, live pen registers           | Live collection (vendor claim)                                   | No public detail on graphs                                                                                |
| Pathfinder, Oxygen, AXIOM, XAMN                                             | Extraction analysis                   | Multi-device graphs, cross-case                                  | One suite per format                                                                                      |
| Reactor, TRM, Elliptic, GraphSense                                          | Blockchain tracing                    | Attribution, cross-chain; GraphSense is MIT-licensed             | Cluttered graphs; contested heuristics                                                                    |
| CellHawk, ArcGIS, KronoGraph, UCINET, Maltego                               | Maps, toolkits, SNA, OSINT            | Owned already; linked timeline                                   | Mapping only; need developers; matrix formats                                                             |

Cross-cutting pain points: format and time-zone normalization; aggregating parallel links while
keeping each; grade and source on every line; hand layout for court; data that keeps arriving;
links all weighted equally.

## 10. Requirements implied

"Covered" means an existing Graphty capability or workflow in design/designloom addresses it;
"gap" means none does.

| #   | Requirement                                                                                                                                                                                                                                                                          | Priority | Coverage                                              |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- | ----------------------------------------------------- |
| 1   | Saved, shareable import mappings: columns to entities and links, identity column, value replacement, date format and zone per column                                                                                                                                                 | must     | Gap                                                   |
| 2   | Typed, directed, timestamped parallel edges, shown as each, one per direction or one per pair, with count and sum                                                                                                                                                                    | must     | Gap                                                   |
| 3   | Edge width or label from count or summed attribute                                                                                                                                                                                                                                   | must     | Partly (visual-encoding-edges)                        |
| 4   | Linked timeline: theme line per entity, event frames, time bar, synced selection                                                                                                                                                                                                     | must     | Gap                                                   |
| 5   | Source and grade on every node and edge; configurable schemes (4x4, 6x6, 3x5x2); style by grade; ICD 203 confidence kept separate                                                                                                                                                    | must     | Gap                                                   |
| 6   | Preserved hand layout, align, grouping boxes, legends; date and sequence number on exports                                                                                                                                                                                           | must     | Partly (legend-display, export-image)                 |
| 7   | Redacted copies per audience or classification level, and read-only sharing                                                                                                                                                                                                          | must     | Gap                                                   |
| 8   | Every element traceable to its source records, with export of the rows                                                                                                                                                                                                               | must     | Gap                                                   |
| 9   | Geographic view of location events as sector wedges, timing-advance arcs (inner and outer edge) or point with radius, each tied to a phone, a time and its source record, with a draft or verified flag; the same event selectable on chart, timeline and map; legend and true scale | should   | Gap                                                   |
| 10  | Common-neighbor finder across seeds ("called by 3+ subjects", "on 2+ phones")                                                                                                                                                                                                        | must     | Gap                                                   |
| 11  | Co-location and convoy links: same place within a time window at least N times, weighted by count                                                                                                                                                                                    | should   | Gap                                                   |
| 12  | Entity resolution with review, merge and "does not match" memory; identity nodes with many identifiers                                                                                                                                                                               | must     | Partly (node-merging)                                 |
| 13  | Two-mode data and projection (activities to association matrix)                                                                                                                                                                                                                      | must     | Gap                                                   |
| 14  | Group chats as hyperedges; drill-down from an edge to its messages                                                                                                                                                                                                                   | must     | Gap                                                   |
| 15  | Cross-case matching of entities against earlier saved charts or stores                                                                                                                                                                                                               | should   | Gap                                                   |
| 16  | Append to a chart: match to existing entities, keep layout and notes, highlight what is new                                                                                                                                                                                          | must     | Gap                                                   |
| 17  | Server-backed hop expansion from a seed with amount and time filters, no full import                                                                                                                                                                                                 | must     | Partly (graph-database query and expand)              |
| 18  | Expandable and collapsible cluster nodes (cluster to addresses)                                                                                                                                                                                                                      | must     | Gap                                                   |
| 19  | Directed flow with amount, asset and time per edge, showing how traced value splits per hop                                                                                                                                                                                          | must     | Gap                                                   |
| 20  | Attribution tags with source and confidence, shown on nodes                                                                                                                                                                                                                          | must     | Gap                                                   |
| 21  | Multilayer view and per-layer metrics                                                                                                                                                                                                                                                | should   | Gap                                                   |
| 22  | Degree, betweenness, closeness, eigenvector, k-core, density, time-respecting paths, connecting network                                                                                                                                                                              | must     | Mostly covered; gap for time-respecting paths, k-core |
| 23  | Removal simulation: sequential or block removal by a chosen centrality, re-ranked each step; largest-component curve; before/after comparison                                                                                                                                        | should   | Partly (removal-impact-analysis)                      |
| 23a | Centrality per link type and on a chosen overlay of types, with per-type weights                                                                                                                                                                                                     | should   | Gap                                                   |
| 23b | Ranking stability under random edge removal or addition, and predicted missing links                                                                                                                                                                                                 | could    | Gap                                                   |
| 24  | Time-of-day histograms and entity-by-entity heat matrix                                                                                                                                                                                                                              | should   | Partly (metric-histograms)                            |
| 25  | Offline, on-premise operation; audit log of searches and purposes                                                                                                                                                                                                                    | must     | Gap                                                   |
| 26  | Normalization helpers for phone numbers and time zones                                                                                                                                                                                                                               | should   | Gap                                                   |

Corrections to existing records:

- `intelligence-analyst` mixes two populations. Keep it for the counter-terrorism and military
  analyst (section 3.3, with the doctrine-based workflow in 5.10) and add
  `crime-intelligence-analyst`, `prosecution-trial-analyst` and `crypto-tracing-investigator`.
- `W09` should add the workflows in section 5 and the sizes above (working charts of 100 to 1,000
  nodes filtered from 100,000 or more records; court charts of tens of nodes). Cryptocurrency
  tracing and military targeting deserve their own workflow records.

## 11. Sources

Every source is also cited inline where used. Reference-style links:

[r1]: https://www.machs.mo.gov/MSHPWeb/PatrolDivisions/HRD/Civilian/CivilianJobDescriptions/documents/CriminalIntelligenceAnalystI-DDCC-TAU.pdf
[r2]: https://iaca.net/assets/Training-Files/Webinars/VirtualConferences/2024VirtualConference/2024%20IACA%20SNA%20Bush.pdf
[r3]: https://www.azdps.gov/sites/default/files/2023-07/Law_Enforcement_Analytic_Standards_2nd_edition.pdf
[r4]: https://www.swgde.org/wp-content/uploads/2024/06/2023-12-18-SWGDE-Recommendations-for-Cell-Site-Analysis-17-F-001-2.0.pdf
[r5]: https://www.azdps.gov/sites/default/files/2023-07/Criminal_Intelligence_Manual_for_Analysts.pdf
[r6]: https://assets.publishing.service.gov.uk/media/5a80e27ae5274a2e87dbc5d0/horr89.pdf
[r7]: https://irp.fas.org/doddir/army/atp2-33-4.pdf
[r8]: https://irp.fas.org/doddir/army/fm3-24.pdf
[r9]: https://www.chainalysis.com/chainalysis-reactor/
[r10]: http://graphsense.org/
[r11]: https://www.stout.com/en/insights/article/judicial-scrutiny-chainalysis
[r12]: https://cellebrite.com/en/connect-the-dots-guide-to-investigations-with-multiple-digital-devices
[r13]: https://install.octostar.com/docs/octostar/forensic-importer
[r14]: https://docs.i2group.com/ibase/10.0.0/convoy_analysis.html
[r15]: https://www.motorolasolutions.com/content/dam/msi/docs/products/license-plate-recognition-systems/vigilant-platesearch/vigilant_platesearch_brochure.pdf
[r16]: https://www.penlink.com/blog/cdr-analysis-101/
[r17]: https://www.penlink.com/platform/live-communication/
[r18]: https://www.magnetforensics.com/blog/warrant-return-analysis-in-magnet-axiom/
[r19]: https://portal.cops.usdoj.gov/resourcecenter/content.ashx/cops-w0859-pub.pdf
[r20]: https://www.maltego.com/law-enforcement/
[r21]: https://en.wikipedia.org/wiki/Blockchain_analysis
[r22]: https://www.github.com/INTERPOL-Innovation-Centre/GraphSense-Maltego-transform
[r23]: https://stars.library.ucf.edu/scopus2015/3200
[r24]: https://cellebrite.com/en/series/tip-tuesday/how-to-plot-social-circles-in-cellebrite-pathfinders-investigative-analytics-solution/
[r25]: https://cellebrite.com/en/series/tip-tuesday/how-to-use-the-cross-case-analysis-feature-in-cellebrite-pathfinder-to-find-hidden-correlations/
[r26]: https://magnetforensics.com/resources/letting-connections-in-magnet-axiom-work-for-you
[r27]: https://www.chainalysis.com/blog/cross-chain-investigations/
[r28]: https://www.trmlabs.com/forensics
[r29]: https://arxiv.org/abs/2205.13882
[r30]: https://www.elliptic.co/blog/us-authorities-seize-darkside
[r31]: https://mcac.maryland.gov/2024/01/using-gang-activity-on-social-media-to-drive-intelligence-led-policing/
[r101]: https://das.iowa.gov/criminal-intelligence-analyst-06019
[r102]: https://hr.sao.texas.gov/Compensation/Archives/2025/JobDescriptions/R6170.pdf
[r103]: https://i2group.com/hubfs/Products/i2-Analysts-Notebook.pdf
[r104]: https://www.selecthub.com/p/data-visualization-tools/i2-analyst-s-notebook/
[r105]: https://i2group.com/articles/catching-the-scarecrow-bandits
[r106]: https://caselaw.nationalarchives.gov.uk/ewca/crim/2017/2308
[r107]: https://www.slideshare.net/slideshow/user-guide-customizing-an-danalyzing-anb-ibase-intelligence/31384486
[r108]: https://cambridge-intelligence.com/blog/timeline-investigation-tools-for-law-enforcement/
[r109]: https://www.prisonlegalnews.org/news/publications/palantir-secret-user-manual-police-officers/
[r110]: https://journals.sagepub.com/doi/10.1177/00224278251386040
[r111]: https://www.college.police.uk/app/intelligence-management/completing-intelligence-report
[r112]: https://www.westmidlands-pcc.gov.uk/wp-content/uploads/2021/10/2021-07-21-EC-Agenda-Item-2-Social-Network-Analysis-Primer.pdf
[r113]: https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0236476
[r114]: https://pmc.ncbi.nlm.nih.gov/articles/PMC11338461/
[r115]: https://researchnow.flinders.edu.au/en/publications/networks-within-networks-using-multiple-link-types-to-examine-net/
[r116]: https://arxiv.org/abs/2209.02012
[r117]: https://www.swgde.org/wp-content/uploads/2025/07/2025-06-29-Technical-Notes-on-the-Use-of-Timing-Advance-Records-25-F-002-1.0.pdf
[r118]: https://www.in.gov/ilea/files/9.22.25-CAST-Basic-Fishers-flyer-REGISTRATION-EXTENDED.pdf
[r119]: https://www.scribd.com/document/546709731/FBI-Cast
[r120]: https://s3.documentcloud.org/documents/21094223/fbi-data-gu.pdf
[r121]: https://www.ukas.com/resources/technical-bulletins/cell-site-analysis-for-geolocation/
[r122]: https://pure.coventry.ac.uk/ws/files/55114871/Post_Print.pdf
[r123]: https://i2group.com/hubfs/i2_Infosheets_i2%20Insights_US%20Letter_Digital.pdf
[r124]: https://leadsonline.com/cellhawk

ATP 2-33.4 and FM 3-24 were read in full from archived copies of the irp.fas.org PDFs. Vendor pages
(Chainalysis, TRM, Cellebrite, PenLink, Vigilant, Maltego) are marketing, so their numbers are
vendor claims. "Search excerpt" marks claims read from search summaries of pages that could not be
fetched; treat them as lower confidence.
