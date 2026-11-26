# Communicating findings: the deliverables each population hands to someone else

## 1. Summary

Almost nobody who analyzes a graph is the last person to see it. A bench scientist hands a figure to a journal; a
prosecution analyst hands a chart to a jury; an anti-money-laundering (AML) investigator hands a narrative and a
transaction table to a regulator; a public health epidemiologist hands an aggregated cluster summary to partners; a
penetration tester hands a label-hidden attack-path image and a hop table to a client; a reporter hands an embedded
graphic to readers. This document is about that hand-off: what each deliverable must contain, in what format, how
the working graph is cut down for its audience, whether it is made once or regenerated every month, how it is shared
and protected, and what goes wrong when people try to get it out of today's tools.

The consistent finding is that the deliverable is rarely "a picture of the graph". It is a picture plus a legend,
the parameters that produced it, citations back to source records, and a document around it. In three high-stakes
settings the node-link picture is deliberately absent: a US suspicious activity report cannot attach an image,
federal guidance tells health departments not to show molecular network diagrams to partners, and a court
illustrative aid is not evidence. Several deliverables are not one-off artifacts but recurring products regenerated
from refreshed data (attack-path exposure tracking, monthly ONA dashboards, bibliometric reports, continuing-activity
SAR reviews). Others are about time (timeline charts, animations, small multiples) or start in 3D and must be
flattened into fixed views for paper.

This is a cross-cutting document. Population-specific detail lives in the sibling documents in this folder; this
document collects each population's hand-off and corrects Graphty's "Findings Communication" workflow (W15 in
design/designloom/workflows), which names no concrete deliverables, has no regulatory or public-health output and
treats every deliverable as a one-off image.

## 2. Population

The population is "everyone who analyzes graphs", seen at the moment they produce something for another person.

| Producer                              | Typical job titles                                                       | Primary deliverable                                                                                                                             | Recipient                                 | How often                                         |
| ------------------------------------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- | ------------------------------------------------- |
| Life scientist / bioinformatician     | Postdoc, staff scientist, core analyst                                   | Multi-panel journal figure, legend, methods; network deposit; session                                                                           | Journal, reviewers                        | Per paper                                         |
| Network / social scientist            | Faculty, PhD student                                                     | Figure plus code and data deposit                                                                                                               | Journal, committee                        | Per paper                                         |
| Network neuroscientist                | Imaging postdoc, connectomics analyst                                    | Network-ordered matrix heatmap with block outlines; multi-view 3D ball-and-stick figure; connectogram; supplementary edge table; rotating movie | Journal                                   | Per paper                                         |
| Crime / intelligence analyst          | Criminal intelligence analyst, trial analyst                             | Briefing chart, target package, court exhibit, timeline chart                                                                                   | Investigators, prosecutors, jury          | Weekly briefings; per trial                       |
| Forensic accountant                   | Forensic accountant, trial graphics consultant                           | FRE 1006 summary chart or FRE 107 illustrative aid                                                                                              | Jury, judge, opposing counsel             | Per trial                                         |
| AML / fraud investigator              | Financial crimes investigator, SAR writer                                | SAR narrative plus one CSV; case file; referral package                                                                                         | FinCEN or NCA, law enforcement, QC        | Daily to weekly; continuing reviews every 90 days |
| Public health epidemiologist          | HIV cluster epidemiologist, outbreak responder                           | Line list and narrative for disease intervention staff; cluster- or population-level summaries for partners and the public                      | Program staff, community partners, public | Monthly cluster review; per outbreak              |
| Cybersecurity analyst                 | Penetration tester, red teamer, threat intel analyst, incident responder | Per-path findings with label-hidden images; chronological hop table; STIX bundle; blocklists; exposure trend                                    | Client, SOC, partners                     | Per engagement; continuous for exposure           |
| OSINT analyst                         | Investigator, due-diligence analyst                                      | Report PDF with graph images and entity tables                                                                                                  | Client, management                        | Per engagement                                    |
| Bibliometrician                       | Research analyst, librarian                                              | Map screenshots, interactive VOSviewer Online link or embed, methods note; institutional dashboard                                              | Journal, leadership, funders              | Per paper; recurring reports                      |
| ONA / people analytics                | People analytics lead, ONA consultant                                    | Executive readout deck; monthly dashboard; personal reports                                                                                     | Leadership, HR, respondents               | Per engagement; monthly dashboards                |
| Systems mapper                        | Systems-change strategist, facilitator                                   | Narrated interactive map and embed; poster                                                                                                      | Funders, boards, public                   | Per project, then updates                         |
| Journalist                            | Data reporter, graphics editor                                           | Embedded graphic; print graphic; public database                                                                                                | Readers, partner newsrooms                | Per story                                         |
| Digital humanist                      | Historian, archaeologist, DH developer                                   | Static article figures; project website; data publication                                                                                       | Readers, scholars                         | Per article or project                            |
| Code-first data scientist             | Data scientist, ML engineer                                              | Notebook, pyvis HTML, Plotly, Streamlit or Dash app; DataFrame or CSV for engineers                                                             | Stakeholders, engineers                   | Ad hoc to weekly                                  |
| Supply chain / infrastructure analyst | Supply chain risk analyst, transmission planner                          | Exposure dashboard (map plus ranked tables); affected-parts list; regulatory filings                                                            | Executives, regulators, crews             | Per incident; semiannual scores; annual plans     |
| Dependency / impact engineer          | SRE, platform engineer, network engineer                                 | Affected-service list; postmortem with dependency chain; impacted-CI list; draw.io or Visio diagram                                             | Incident team, change board               | Per incident or change                            |
| Student                               | Undergraduate or graduate student                                        | Image plus node table in a report or slides                                                                                                     | Instructor                                | Per assignment                                    |

Sources for the added rows: the sibling documents network-neuroscience-connectomics.md (section 8), public-health-
and-molecular-epidemiology.md (workflow hand-offs), cybersecurity-graph-work.md (sections 5.1-5.5),
bibliometrics-and-science-mapping.md (export and output sections), code-first-data-scientists-and-graph-ml.md
(section 8), digital-humanities-and-historical-networks.md (section 7), supply-chain-and-physical-infrastructure-
networks.md (section 8), dependency-and-impact-analysis-engineers.md (section 8) and
students-educators-and-first-time-users.md (deliverables).

Skill profile at hand-off time: the producer is expert in the domain and moderate in graph literacy; the RECIPIENT
usually has none (a juror, a board member, a community partner, a reader) or is an expert reviewer looking for
missing parameters. In nearly every population the final step happens in a general-purpose tool (Illustrator,
Inkscape, PowerPoint, Word, a BI dashboard) rather than in the graph tool. No reliable count of this population
exists (no source found).

## 3. Personas

### 3.1 Dr. Hannah Okoro -- publication figure author (id: `publication-figure-author`)

- **Role.** Staff scientist in a systems biology lab who prepares network figures and supplementary deposits.
- **Tools today.** Cytoscape (Export as Image to PDF or SVG; Legend Creator; EnrichmentMap "Show Creation
  Parameters"), Illustrator or Inkscape, NDEx. The Cytoscape manual recommends PDF for publication because it is
  vector ([Cytoscape manual, Export Your Data](https://manual.cytoscape.org/en/3.10.3/_sources/Export_Your_Data.md.txt)).
- **Data.** 100 to 2,000 node networks with 10 to 40 attribute columns; enrichment thresholds that must be reported.
- **Goals.** A figure that survives reduction to an 85 mm column and a reviewer asking "what threshold did you use?".
- **Frustrations.** Only the visible canvas is exported
  ([EnrichmentMap protocol](https://baderlab.github.io/EnrichmentMap_Protocol/exporting-figures-creating-legends-and-saving-work.html));
  Legend Creator "does not support" edge line style, color or thickness
  ([tutorial](https://cytoscape.org/cytoscape-tutorials/protocols/legend-creator)); "Export text as font" breaks on
  two-byte characters (Cytoscape manual); parameters are copied by hand into the legend.

### 3.2 Ray Delgado -- litigation demonstratives specialist (id: `litigation-demonstratives-specialist`)

- **Role.** Forensic accountant retained per case to build fraud and conspiracy trial graphics; testifies as a
  summary or expert witness; his charts are attacked by opposing experts. Distinct from the in-house prosecution
  trial analyst in the law enforcement sibling document.
- **Tools today.** Excel schedules, i2 Analyst's Notebook or a diagramming tool, PowerPoint, a large-format printer.
  Trial guidance: build from "the general ledger, the bank records, or the cash flow summaries" and "test
  demonstrative evidence prior to trial" ([Weintraub](https://www.weintraub.com/?p=6334)).
- **Data.** Thousands of bank and wire records; 10 to 60 entities on the final chart, each arrow tied to a schedule
  row and Bates-numbered documents.
- **Goals.** A chart a juror understands in under a minute that survives a Rule 1006 or Rule 107 objection.
- **Frustrations.** Graph tools do not keep the link between a drawn arrow and its record row; large i2 prints
  truncate or blank (section 9); a summary chart "must be accurate and nonprejudicial" and must not be "embellished
  by or annotated with the conclusions of or inferences drawn by the proponent" (_United States v. Bray_, 139 F.3d
  1104 (6th Cir. 1998), [FindLaw](https://caselaw.findlaw.com/court/us-6th-circuit/1097222.html)), so defense
  counsel attack sizing, framing and agency marks (section 5.2).

### 3.3 Grace Mwangi -- graph deliverable recipient (id: `graph-deliverable-recipient`)

- **Role.** A composite of people who receive graph deliverables but never operate a graph tool: a program officer,
  a COO reading an ONA readout, a prosecutor, a compliance reviewer, a community partner of a health department, an
  editor. She opens a link on a phone, or reads a printed page, often in black and white; she may use a screen reader.
- **Tools today.** A browser (Kumu, Linkurious guest links, VOSviewer Online links), PDF readers, i2 Chart Reader (a
  free viewer to "show, search, and print" charts, [i2 Chart Reader](https://i2group.com/i2-chart-reader)), PowerPoint.
- **Goals.** Understand the one message in under a minute; know what she may forward; trust that names she sees are
  meant for her.
- **Frustrations.** Static exports lose tooltips; color does not survive grayscale printing
  ([Cambridge Intelligence](https://cambridge-intelligence.com/intelligence-dissemination-with-pdf-exports/)); dense
  graphs are unreadable on a phone, "where you have such a small screen and can't rely on things like tool tips or
  hover" (WSJ graphics, via [journalism.co.uk](https://www.journalism.co.uk/how-the-wall-street-journal-approaches-data-interactives-on-mobile/)).

The sibling documents already define `fraud-analyst`, `intelligence-analyst`, `newsroom-graphics-editor`,
`ona-consultant`, `prosecution-trial-analyst`, `systems-change-strategist` and the public health, connectomics,
cybersecurity and bibliometrics personas; this document does not redefine them.

### 3.4 Who makes each deliverable, and who only reads it

Grace Mwangi never operates a graph tool, so she cannot be the user of a workflow whose steps are freezing chart
states, writing a narrative, redacting labels or re-rendering a monthly dashboard. Each production workflow below
belongs to the analysts the sibling documents already define; the recipient appears on it only as the reader of the
result. Her own steps -- open what arrived, read the message, check what she may do with it, follow a claim to its
source, compare with last period -- differ from every producer's and are the same across populations, so they are a
workflow of their own ("Reading a graph deliverable someone else made", W1018 in design/designloom/workflows) rather
than steps folded into each producer's.

| Deliverable (section)                                 | Who produces it (Designloom persona id)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Who reads it                                                                                                                          |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Journal figure and network deposit (5.1)              | The genomics lab bioinformatician (`genomics-cytoscape-user`) who runs the STRING, cluster, enrich and figure protocol for her own paper, and the core facility bioinformatician (`network-biology-core-bioinformatician`) who produces figures and an NDEx deposit for each lab he serves. `publication-figure-author` is a facet of both, not a third person                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Reviewers, editors, journal readers                                                                                                   |
| Web exports, newsroom embeds, public databases (5.6)  | Newsroom embeds: the desk's graphics editor (`newsroom-graphics-editor`); at NPR a graphics editor drafted the diagram, a News Apps intern finished it in Illustrator and the two built the click-through code ([OpenNews Source](https://source.opennews.org/articles/network-diagrams-hard/)). Public entity databases: the investigation's data team (`investigative-journalist`); ICIJ's Offshore Leaks database is published by the consortium, whose Data and Research Unit editor described the need for a tool that "didn't require the intervention of any data scientist or developers" ([Neo4j](https://neo4j.com/blog/neo4j-power-behind-paradise-papers/); [ICIJ download page](https://offshoreleaks.icij.org/pages/database)). Project sites: the correspondence archive editor (`prosopography-archivist`). Notebook HTML and Streamlit apps: the notebook data scientist (`notebook-graph-data-scientist`) | The public, phone readers, other journalists and researchers who download the data                                                    |
| SAR narrative, CSV and case file (5.3)                | The Level 2 AML investigator (`aml-investigator`) does every step, including the continuing-activity review: FinCEN asks for continuing activity to be reported at least every 90 days, due 120 days after the prior SAR, and filers keep copies five years ([FinCEN SAR FAQ](https://www.fincen.gov/resources/faqs/frequently-asked-questions-regarding-the-fincen-suspicious-activity-report-sar/))                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | QC reviewer, examiner, regulator                                                                                                      |
| ONA readout and monthly dashboard (5.4)               | The in-house people analytics lead (`people-analytics-ona-lead`) or the external consultant (`ona-consultant`) builds and facilitates the readout; the analyst holding the Viva Insights Analyst role (`workplace-collaboration-analyst`) runs the queries and Power BI templates behind the dashboard, on de-identified data ([Microsoft Learn](https://learn.microsoft.com/en-us/viva/insights/advanced/setup-maint/user-roles))                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Executives, the HR business partner (`hr-business-partner`); managers see only aggregated insights about their own team (same source) |
| Narrated systems map and map links (5.5)              | The foundation strategist who owns the map (`systems-change-strategist`) and the facilitator who digitizes it (`participatory-systems-mapping-facilitator`); for VOSviewer Online links, the research-impact librarian (`research-impact-librarian`) or the review author (`bibliometric-analyst`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Boards, funders, the public, journal readers                                                                                          |
| Public health cluster communication (5.7)             | The HIV surveillance epidemiologist (`hiv-molecular-cluster-epidemiologist`) writes the line list, narrative and partner table; the public health laboratory's genomic epidemiologist (`phl-genomic-epidemiologist`) supplies cluster calls. CDC's review group includes "HIV prevention, surveillance, and partner services leadership and staff" ([CDC](https://www.Cdc.gov/hiv/programresources/guidance/hiv-cluster-detection-and-response-guidance/cluster-review-and-prioritization.html))                                                                                                                                                                                                                                                                                                                                                                                                                            | Partner services supervisor (`dis-supervisor`) for the line list; partners and the public for aggregates only                         |
| Attack-path findings and exposure trend (5.8)         | Penetration tester (`penetration-tester`) for per-path findings; incident responder (`luis-ferreira`) for the hop table; threat intelligence analyst (`aiko-tanaka`) for STIX and blocklists; attack-path management owner (`marcus-lindqvist`) for the trend, which BloodHound's Posture page shows as "how your remediation efforts are reducing risk" ([BloodHound docs](https://bloodhound.specterops.io/analyze-data/bloodhound-gui/posture-page))                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Client, CISO, auditors, SOC                                                                                                           |
| Fixed-view connectome figure, matrix and movie (5.10) | The imaging network neuroscientist (`network-neuroscience-researcher`), the clinical connectome researcher (`clinical-connectome-researcher`), the computational network neuroscientist (`computational-network-neuroscientist`) and the EEG/MEG connectivity researcher (`eeg-meg-connectivity-researcher`) each draw the main anatomical figure of their own papers; `publication-figure-author` is a facet of each                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Reviewers, editors, journal readers                                                                                                   |
| Recurring regenerated deliverables (5.11)             | Whoever owns the recurring product: `marcus-lindqvist` (exposure), `workplace-collaboration-analyst` (monthly dashboard), `research-impact-librarian` (institutional reports), `supply-chain-analyst` (resiliency scores), `aml-investigator` (continuing-activity review)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Leaders and reviewers comparing periods                                                                                               |

The readers' side, sourced: Kumu viewers open a published presentation by link, private presentations carry a token
in the URL and may add a password, and a privacy change gives the presentation a new URL
([Kumu presentations](https://docs.kumu.io/guides/presentations)); i2 Chart Reader exists so recipients can view
charts without the analysis tool ([i2](https://i2group.com/i2-chart-reader)).

## 4. Use cases (ranked by stakes times frequency)

| #   | Question the deliverable answers                                                                                          | Who                                           | Frequency                  | Stakes                                                               |
| --- | ------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- | -------------------------- | -------------------------------------------------------------------- |
| 1   | "Why is this activity suspicious?" -- SAR narrative and transaction table                                                 | AML investigators                             | Daily                      | Regulatory examination findings; documents producible for five years |
| 2   | "How were these people and accounts connected?" -- court exhibit or illustrative aid                                      | Trial analysts, forensic accountants          | Per trial                  | Liberty; appeal                                                      |
| 3   | "Which clusters need action, without exposing anyone?" -- aggregated cluster summary                                      | Public health epidemiologists                 | Monthly; per outbreak      | Privacy of people living with HIV; community trust                   |
| 4   | "Which paths let an attacker reach our crown jewels, and are there fewer than last month?" -- findings and exposure trend | Pen testers, defenders                        | Per engagement; continuous | Breach                                                               |
| 5   | "What does this network show, and with which parameters?" -- journal figure                                               | Scientists, neuroscientists, bibliometricians | Per paper                  | Acceptance, reproducibility                                          |
| 6   | "Who should we brief on, watch or arrest?" -- briefing chart                                                              | Intelligence analysts                         | Weekly                     | Operational                                                          |
| 7   | "What happened in what order?" -- timeline chart, animation, small multiples                                              | Analysts, researchers, journalists            | Per case or paper          | Court; scientific claims about change                                |
| 8   | "Is it the same as last month?" -- recurring regenerated deliverable                                                      | ONA, cyber, bibliometrics, supply chain, AML  | Monthly to semiannually    | Trend decisions                                                      |
| 9   | "Where does collaboration break down?" -- ONA readout                                                                     | ONA consultants                               | Per engagement             | Careers; privacy law                                                 |
| 10  | "How does this system work, where should money go?" -- narrated map                                                       | Systems strategists                           | Per project                | Funding                                                              |
| 11  | "What did we find, can readers explore it?" -- embed or public database                                                   | Journalists, digital humanists                | Per story or project       | Defamation; public trust                                             |
| 12  | "Can someone else reproduce or continue this?" -- session, deposit, notebook                                              | All                                           | Per hand-over              | Continuity, audit                                                    |

## 5. Step-by-step workflows

### 5.1 Journal figure and network deposit (Cytoscape; Gephi variant)

Sources: EnrichmentMap protocol steps 14-20; Cytoscape manual; Legend Creator tutorial; NDEx Current Protocols
([PMC8544027](https://pmc.ncbi.nlm.nih.gov/articles/PMC8544027)); [PLOS figures](https://journals.plos.org/plosmedicine/s/figures);
[Nature figure guide](https://research-figure-guide.nature.com/figures/preparing-figures-our-specifications); Marai
et al., "Ten simple rules to create biological network figures for communication"
([PMC6762067](https://pmc.ncbi.nlm.nih.gov/articles/PMC6762067)).

1. **Write the caption first** (Marai rule 1); decide node-link or adjacency matrix (rule 2 suggests a matrix for
   dense networks).
2. **Cut to the message.** Remove nodes, collapse clusters, aggregate the periphery (rule 5); split overview and
   detail panels rather than overloading channels (rule 9). In Cytoscape: filters, largest component, group/collapse.
3. **Style for print.** Labels at least caption size (rule 4); avoid red-green, check grayscale (rule 6); no
   unjustified 3D (rule 10). Clear overlapping labels: in Gephi, Label Adjust "slightly moves nodes where labels are
   overlapping" ([Gephi blog](https://gephi.wordpress.com/2008/11/15/label-adjust/)) and Noverlap separates nodes but
   "doesn't manage labels" ([plugin page](https://gephi.org/desktop/plugins/noverlap/)); Cytoscape has no automatic
   option, so helpdesk replies suggest manual layout, zoom or label wrapping
   ([cytoscape-helpdesk, 2016](https://groups.google.com/g/cytoscape-helpdesk/c/djlA3moVD74)). Cell Press-style widths of 85, 114 or 174 mm with 6-8 pt minimum fonts are commonly
   cited (secondary: [Manusights](https://manusights.com/blog/cell-reports-formatting-requirements)); PLOS asks for
   789-2250 px width at 300 dpi, TIFF or EPS, at most 10 MB, captions outside the file; Nature asks for vector art,
   RGB and embedded fonts, with dpi minimums that differ between its pages.
4. **Frame and export.** Fit the whole network, because "only the visible part of the map is exported"; File >
   Export as Image > PDF or SVG. For bitmaps resolution comes from zoom, not the DPI field
   ([cytoscape-discuss](https://groups.google.com/g/cytoscape-discuss/c/WyE-wbZU0q0)).
5. **Record parameters** from EnrichmentMap > Show Creation Parameters into the legend, by hand, and update them if
   filters changed the network.
6. **Build the legend** with Legend Creator (node mappings only) or downloadable legend parts. Gephi Preview export
   has none: "use a tool, such as Adobe Illustrator or Inkscape to add a legend"
   ([University of Toronto tutorial](https://mdlutoronto.github.io/gephi-visualize-network-dataset/7-g-export-visualizations-as-static-images/)).
7. **Assemble panels** in Illustrator or Inkscape; 1-4 hours per figure, repeated after every reviewer round.
8. **Save the session** (zipped .cys).
9. **Deposit.** Export to NDEx (private) > Share URL for reviewers > fill properties > request DOI after acceptance;
   "All network properties must be populated in order to request a DOI", after which the network is frozen. NDEx has
   been an official repository for Springer Nature and PLOS journals since 2017 (PMC8544027).

**Gephi variant.** Styling must be redone in Preview because exports use Preview, not Overview
([Launchpad answer](https://answers.launchpad.net/gephi/+question/191110)); a 50,000-node PDF export never finished
and the bug was closed Won't Fix ([bug 808617](https://bugs.launchpad.net/gephi/+bug/808617)).

**Hand-off:** figure files, legend text with parameters, methods paragraph, session file, NDEx link or DOI.

### 5.2 Court exhibit from a working chart (US federal; UK notes)

Sources: FRE 1006 ([Cornell LII](https://law.cornell.edu/rules/fre/rule_1006)); FRE 107 and 2024 committee notes
([courtrules.net](https://www.courtrules.net/federal/evidence/rule-107)); _United States v. Bray_, 139 F.3d 1104
(6th Cir. 1998); _United States v. Fei Xie_, No. 25-6034 (10th Cir. Mar. 31, 2026), an unpublished order and
judgment ([PDF](https://www.ca10.uscourts.gov/sites/ca10/files/opinions/010111410037.pdf)); _R v Calland_ [2017]
EWCA Crim 2308 ([National Archives](https://caselaw.nationalarchives.gov.uk/ewca/crim/2017/2308)); Law Enforcement
Analytic Standards, 2nd ed. ([PDF](https://www.azdps.gov/sites/default/files/2023-07/Law_Enforcement_Analytic_Standards_2nd_edition.pdf)).

1. **Decide the legal category before drawing.** A summary of voluminous records is admitted under FRE 1006 ("a
   summary, chart, or calculation offered to prove the content of voluminous admissible writings ... that cannot be
   conveniently examined in court"), and "the proponent must make the underlying originals or duplicates available".
   An aid that only helps the jury follow testimony falls under FRE 107 (effective December 1, 2024): allowed unless
   its utility is "substantially outweighed by the danger of unfair prejudice, confusing the issues, misleading the
   jury"; it "is not evidence and must not be provided to the jury during deliberations" without consent or order;
   and "when practicable ... must be entered into the record".
2. **Restrict content to trial evidence.** _Fei Xie_ restates Tenth Circuit law that "charts constructed by a
   witness using non-trial sources are inadmissible under Rule 611(a)". The chart there (G-15, a drug trafficking
   organization chart) was "created by SA Reinsch based on his investigation and was admitted before the government
   introduced any evidence establishing Mr. Xie's role". What the case does and does not hold: it is "not binding
   precedent"; Mr. Xie had not objected, so review was for plain error; the court found Rule 1006 "inapplicable"
   because G-15 summarized nothing voluminous; it said "we need not decide whether the chart's admission was a clear
   or obvious error" because he could not show an effect on substantial rights; and it affirmed. Practical rule
   drawn from the Rule 611(a) line, not from a finding in this case: every node and line should map to an exhibit or
   schedule row in evidence. The working graph (tips, unconfirmed links) is not the exhibit.
3. **Strip inference the data cannot carry.** In _Calland_ the judge allowed phone-mast location only at town level
   on a sequence-of-events chart, and the Court of Appeal criticized "wrongly conflating the position of the mast with
   the inferences which can properly be drawn".
4. **Keep emphasis neutral.** _Bray_ (published, 6th Cir.) requires a Rule 1006 summary to be "accurate and
   nonprejudicial", warns that one "containing elements of argumentation could very well be the functional
   equivalent of a mini-summation", and contrasts pedagogical devices that may "reflect ... through captions or other
   organizational devices or descriptions, the inferences" of the proponent. FRE 107 adds the unfair-prejudice and
   misleading-the-jury test. In _Fei Xie_ the defendant argued that his photo "is framed in red and is larger and
   above other ... members", that "a large HSI badge" stamped "the Government's imprimatur" on it, and that the chart
   "minimized the role that others played"; the court answered "We disagree" on prejudice. So emphasis is a live
   objection, not a settled reversal ground. Practice: uniform sizes and frames unless size encodes an evidenced
   quantity; no agency marks; a neutral layout.
5. **Use standard link conventions.** Circles for people, rectangles for businesses, solid lines for confirmed and
   dotted for suspected links ([RFFlow sample](https://www.rff.com/link_analysis_sample.php)). For a 1006 summary,
   suspected links drop out because they are not evidence (inference from steps 2-4; no court source states it).
6. **Annotate each element with its source.** Arrows carry date, amount and exhibit or Bates number; products must
   "clearly distinguish" sources and label opinions so they are "not interspersed in the factual portion" (Analytic
   Standards). No uniform footnote format found.
7. **Disclose and get rulings early** under the pretrial order (Weintraub; ABA
   [article](https://www.americanbar.org/groups/family_law/publications/family-advocate/2022/spring/show-and-tell-summaries-and-demonstrative-evidence/)).
8. **Produce the physical forms.** 16:9 screen, A0-plus foam board (i2 needs custom paper above A0,
   [IBM](https://www.ibm.com/support/pages/node/242017)), letter binder copies, record copy. i2 8.9.5 truncated PDFs
   above Letter ([IBM](https://www.ibm.com/support/pages/node/510995)); Compatibility Printing Mode "can reduce
   overall printing quality" ([IBM](https://www.ibm.com/support/pages/using-compatibility-printing-mode-resolve-printing-issues-analysts-notebook)).
9. **Testify** as fact, summary or expert witness (Analytic Standards).

A sequence-of-events or timeline chart (theme lines and event frames in i2; law enforcement sibling document section
5.3) goes through the same steps; see section 5.9. UK: cell-site and telephone schedules are served on the defense
with the material behind them (_R v Furniss_, [judiciary.uk](https://www.judiciary.uk/wp-content/uploads/2015/01/r-v-furniss-and-others.pdf)).

**Hand-off:** exhibit files, the schedule, the source index, a record copy. Days to weeks per trial.

### 5.3 Regulatory output from a graph investigation (US SAR)

Sources: FinCEN SAR form specification ([SARX](https://sdtmut.fincen.treas.gov/docs/SARX.pdf)); financial crime
sibling document; Cambridge Intelligence PDF guide; [Maltego reporting](https://www.maltego.com/blog/five-ways-to-export-maltego-graph-for-reporting/).

1. **Freeze the state** at decision points: Cambridge Intelligence's pattern saves serialized chart state "with a
   caption and timestamp" and names SARs and warrant applications as targets; Maltego saves .mtgl plus a PDF report.
2. **Translate the graph into the narrative.** The SAR has no place for a picture; the narrative covers who, what,
   when, where and why. Graph facts become sentences ("accounts A, B and C received 41 cash deposits totaling $X and
   forwarded 93 percent to D"): per-pair sums and counts over a date window, path lists, shared identifiers.
3. **Attach the table.** A SAR "may contain supporting documentation in the form of one comma separated file (.CSV)
   with a maximum size of 1 megabyte", described in Part V (SARX).
4. **Assemble the case file.** Chart images, entity and transaction tables, rationale; Maltego reports for 30
   entities "can easily generate a 20-page report". Kept five years and producible on request.
5. **Quality control** by a second reviewer or committee; the chart must be regenerable from case data.
6. **Continuing activity** is a recurring deliverable: an optional 90-day review with filing 120 days after the
   prior SAR, comparing counterparties and flows across two date ranges (financial crime sibling, FinCEN FAQ). The
   SAR's existence must not be disclosed, so every artifact naming it is restricted.

### 5.4 ONA executive readout and recurring dashboard

Sources: Innovisor sample output ([PDF](https://www.innovisor.com/wp-content/uploads/2026/06/Sample-Output-Leadership-Network-Accelerator.pdf));
Viva Insights ([privacy](https://learn.microsoft.com/en-us/viva/insights/privacy/privacy-considerations)); Borgatti
and Molina ([record](https://scholars.uky.edu/en/publications/toward-ethical-guidelines-for-network-research-in-organizations/)).

1. **Set visibility** before showing anything. Management may act on maps (for example firing non-central workers),
   and organizations have three parties to consent (secondary summary,
   [Lumen](https://courses.lumenlearning.com/atd-tc3-management/chapter/ethical-considerations-with-social-network-analysis/));
   Viva Insights' minimum group size cannot go below five.
2. **Put the survey question and legend on every network slide** ("NOTE: This network is based on the question:
   ..."; "the larger the dot, the more connections").
3. **Title each slide with its finding** ("THE KEY BARRIER TO CONNECTIVITY IS FUNCTION").
4. **Show before and after** ("WE CAN IMPROVE THE CURRENT CONNECTIVITY BY 31%").
5. **End with named actions** within the agreed visibility (pairs for "THE RECOMMENDED 1-ON-1"; the sample uses
   pseudonyms).
6. **Facilitate**: "the consultant simply showed the diagrams and explained what the numbers represented"
   ([O'Reilly](https://www.oreilly.com/library/view/the-organizational-network/9780470542200/9780470542200_reviewing_the_results_with_the_departmen.html)).

**Hand-off:** a 10-20 slide deck; ongoing programs publish monthly dashboards to leaders in Power BI or Viva (ONA
sibling document); personal network reports in some practices
([Posit](https://opensource.posit.co/resources/videos/2024-10-31_brennan-antone-democratizing-organizational-surveys-with-quarto-and-shiny/)).

### 5.5 Narrated systems map (Kumu) and bibliometric map links (VOSviewer Online)

Sources: [Kumu presentations](https://docs.kumu.io/guides/presentations); [Kumu embeds](https://docs.kumu.io/guides/embeds.html);
[RJI tips](https://rjionline.org/news/systems-mapping-for-storytelling-tips-for-using-kumu/);
[VOSviewer Online linking](https://app.vosviewer.com/docs/sharing/linking/).

1. **Guided path or free exploration** (RJI); a linear story may suit a slideshow better than a map.
2. **Kumu presentation**: Title, Map, Text, Image and Embed slides; each Map slide keeps its view, zoom, focus and
   filter -- the guided-reveal pattern.
3. **Publish with a privacy choice**; changing presentation privacy creates a new URL; map edits require "Publish
   again"; "Anyone who has access to the share link or the embedded version ... will be able to view the map, even if
   the project is private".
4. **Embed** by iframe; `?autoplay=10`; scroll-zoom off by default; updates "may take up to one hour to appear".
5. **Bibliometric equivalent.** VOSviewer Online visualizations are shared "by linking to the visualization": URL
   parameters (`json`, `map`, `network`, `scale`, `curved_links`) point at a hosted JSON file, often on Google Drive set
   to "Anyone with the link", and `simple_ui` is used when embedding. The bibliometric write-up adds a methods
   paragraph listing data source, counting method, thresholds and clustering resolution (bibliometrics sibling).

### 5.6 Interactive web exports, newsroom embeds and public databases

Sources: Cytoscape manual; [Gephi Lite sharing](https://docs.gephi.org/lite/user-manual/share-graph-as-url);
[Graphistry privacy](https://pygraphistry.readthedocs.io/en/latest/server/privacy.html);
[Linkurious guest mode](https://doc.linkurious.com/admin-manual/4.0/guest-mode);
[Offshore Leaks](https://offshoreleaks.icij.org/pages/howtouse); ndtv
([render.d3movie](https://search.r-project.org/CRAN/refmans/ndtv/html/render.d3movie.html)).

1. **Pick the vehicle.** Cytoscape Export > Network to Web Page (about 1,000 nodes well, 5,000 slowly); Gephi's
   Web Publish plugin posts to a public gist ("do not publish your networks if the data is confidential",
   [plugin](https://gephi.org/desktop/plugins/web-publish-plugin)); Gephi Lite `?file=<url>` from a public gist;
   Graphistry private, organization or public-link modes; Linkurious guest links, where "anyone who can reach /guest
   can browse the full database in read-only mode" unless restricted; code-first users write pyvis HTML files or
   Plotly figures and Streamlit or Dash apps, whose interactive output "may not survive in GitHub or nbviewer"
   (code-first sibling); digital humanists build project sites in D3 or sigma.js that "often decay" (DH sibling).
2. **Simplify for the page.** Verified subset, manual layout, background zones, scroll reveal, motion stopped, text
   moved out of the canvas for phones (journalism sibling). NPR found that "the text in the diagram itself is
   illegible" when the static graphic was scaled down to a small screen, while the explanatory text kept in HTML
   above each step stayed readable ([OpenNews Source](https://source.opennews.org/articles/network-diagrams-hard/)).
3. **Public database:** search plus per-entity graphs; some entities have "too many connections ... to display a
   useful graph"; inclusion "is not intended to suggest or imply" wrongdoing; data downloadable as CSVs and Neo4j
   dumps under the Open Database License; ICIJ asks users to "always cite the International Consortium of
   Investigative Journalists when using this data" ([download page](https://offshoreleaks.icij.org/pages/database)).
4. **Check what leaks.** A web export ships the data, not just the picture; attributes hidden in the view are
   usually in the JSON. No tool documentation found warning about this beyond Gephi's and Kumu's notes.

Who does these steps: steps 1, 2 and 4 for a newsroom embed are the graphics editor's (`newsroom-graphics-editor`),
whose input has already passed fact-checking and legal review; step 3 is the investigation's data team
(`investigative-journalist`); project sites are the archive editor's (`prosopography-archivist`) and notebook HTML
the notebook data scientist's (`notebook-graph-data-scientist`). All four are on W318 with the recipient as reader
(section 3.4).

### 5.7 Public health: cluster communication without network diagrams

Source: CDC, _Cluster Detection and Response Guidance for Health Departments_, Communications and Data Protection
sections (October 30, 2024, [CDC](https://www.cdc.gov/hivpartners/php/cdr/health-department-guidance.html)); public
health sibling document.

The working artifact is a molecular or contact network (Secure HIV-TRACE, MicrobeTrace). The deliverables are not.

1. **Internal hand-off.** The epidemiologist turns a cluster into a line list and narrative for disease intervention
   specialists and program staff (sibling, workflow hand-off).
2. **Partners.** CDC: "Avoid using molecular network diagrams, which are easy to misinterpret, for communicating
   with partners." "Unless data sharing agreements are in place, only share cluster- or population-level data." The
   deliverable is a cluster-level table or summary (counts by cluster, growth, population group, geography).
3. **Small cells.** "Also consider population size and cell counts to ensure confidentiality of people represented
   in data." CDC gives no numeric threshold on this page; jurisdictions set their own (no source found for a single
   national rule).
4. **Public.** "When communicating with the public about clusters, do not share individual-level data." "Only share
   information describing clusters or groups experiencing rapid transmission, not individuals."

**Implication.** The graph tool must produce an aggregate table with suppression from the network it holds, and must
make it hard to export the node-link picture for this audience by accident.

### 5.8 Cybersecurity: attack-path findings and exposure tracking

Sources: cybersecurity sibling document (sections 5.1-5.5, citing BloodHound, NetSPI, OpenCTI and DFIR guides);
BloodHound Enterprise datasheet ([PDF](https://specterops.io/wp-content/uploads/sites/3/2025/07/BHE_Datasheet_1016-4_61bcf0.pdf)).

1. **Per-engagement findings.** Export JSON or (Enterprise) PNG, JPG or SVG images after "Hide Labels", so object
   names do not leak into the report; each path becomes a finding with reproduction commands.
2. **Lateral movement.** Hand off "a chronological hop table (time, source, target, account, logon type, evidence)".
3. **Threat intelligence.** OpenCTI exports a STIX report bundle, PDF or image; blocklists and hunt queries go to the
   SOC and STIX to partners.
4. **Continuous exposure.** BloodHound Enterprise is sold to "continuously identify every available attack path"
   (datasheet); it tracks Tier Zero exposure over time and its Posture page compares analysis runs (sibling). The
   deliverable is a trend regenerated after every collection, not an image: wait for ingest and analysis, check
   group and session completeness, keep the same environment, zone and severity filters, then read the per-category
   Count and Change table (resolved paths included) and the exposure trend (section 5.11).

### 5.9 Temporal deliverables: timelines, animations and small multiples

Sources: temporal and dynamic networks sibling (section 8); law enforcement sibling (section 5.3); ndtv
render.d3movie; _R v Calland_.

- **Timeline or sequence-of-events chart** for court and case files: i2 theme lines (one per entity) and event
  frames, each event tied to its source; _Calland_ shows that each plotted location must carry only the precision
  the evidence supports.
- **Animation as HTML.** ndtv's `render.d3movie` writes "an HTML file with embedded javascript player app including
  the JSON data structure", "displayed in a web browser as an interactive HTML5 SVG animation", or an htmlwidget for
  Shiny; pathpy has `export_html` (temporal sibling).
- **Animation as video.** Gephi screen recordings uploaded to YouTube (temporal sibling); BrainNet Viewer renders a
  12-second rotating AVI in about ten minutes ([PMC3701683](https://pmc.ncbi.nlm.nih.gov/articles/PMC3701683)). Talks and newsroom pieces need MP4 or GIF.
- **Small multiples for print.** ndtv `filmstrip` and weekly slice panels in papers, sharing one layout so nodes do
  not jump between panels (temporal sibling).
- **Parameters.** Window length, step and aggregation rule must be reported (CiteSpace captions such as "time slice
  length=1, top N=150"); investigators record the exact window behind each exhibit.

### 5.10 From 3D to a deliverable (connectomics)

Who makes it: network neuroscientists (fMRI and diffusion imaging researchers), clinical connectome researchers,
computational network neuroscientists and EEG/MEG connectivity researchers. The connectomics sibling document
(network-neuroscience-connectomics.md) ranks drawing "a connectome or a result subnetwork in anatomical 3D for a
paper" as "every paper; the main figure".

Sources: Xia, Wang and He, "BrainNet Viewer: a network visualization tool for human brain connectomics", PLoS ONE
2013 ([PMC3701683](https://pmc.ncbi.nlm.nih.gov/articles/PMC3701683)); BrainNet Viewer manual v1.42, sections 6.2
"Option" and 7.1 "Load Files & Save as Image" ([nitrc.org](https://nitrc.org/docman/view.php/504/1280/brainnet));
nilearn `plot_connectome` reference
([nilearn.github.io](https://nilearn.github.io/dev/modules/generated/nilearn.plotting.plot_connectome.html));
netplotbrain paper ([PMC10312269](https://pmc.ncbi.nlm.nih.gov/articles/PMC10312269/)); Marai et al. rule 10
([PMC6762067](https://pmc.ncbi.nlm.nih.gov/articles/PMC6762067)).

1. Positions are anatomical (atlas coordinates), not a layout; they must be kept, not recomputed.
2. Pick a fixed view layout. In BrainNet Viewer "the single view shows only one brain model", the medium view shows
   "the lateral and medial sides of each hemisphere", and the full view shows "all sides of the brain surface"
   (Xia et al. 2013). Parcel maps are laid out the same way, as a grid of lateral and medial views per hemisphere
   with one shared color bar, often next to the ball-and-stick view of the same nodes in the same colors
   (connectomics sibling, section 8).
3. Export at size. BrainNet Viewer saves "TIFF, BMP, EPS, JPEG and PNG", and "the resolution of the output image can
   also be modified in dots per inch (DPI)". Its movie is "a 12 second long, 30 FPS, 735x534, AVI file" that rotates
   "at one degree per frame", and "generating these videos takes approximately 10 minutes" (Xia et al. 2013).
4. Alongside: a matrix heatmap ordered by network or module with block outlines, a circular connectogram, and a
   supplementary edge table with region labels (connectomics sibling, section 8).
5. Save the settings. In BrainNet Viewer "the configuration in this panel can be saved as a .mat file and recalled
   at next use or in a command line"; `BrainNet_MapCfg(...)` takes the surface, data files and that option file and
   renders figures in batch for every subject or condition (Xia et al. 2013).

The Python tools offer other fixed view grids rather than BrainNet Viewer's lateral-and-medial one. nilearn's
`plot_connectome` draws a glass brain with `display_mode` values such as 'ortho', 'lzr' or 'lyrz' ('l' and 'r' are
"sagittal left hemisphere only" and "sagittal right hemisphere only") and writes .png, .pdf or .svg through
`output_file`; its reference names no medial view and no DPI setting. netplotbrain takes view letters ('L', 'R',
'S', 'I', 'A', 'P'), where "a string of multiple letters can also be specified to generate multiple subplots" (for
example `view='LSR'`, or a list of strings for several rows), and offers preset combinations and rotating frames;
its paper names no medial view either. A tool serving all three groups therefore needs named camera views that can
be chosen freely and arranged in a grid, with lateral and medial per hemisphere as one preset among several.

Paper, PDF and court have no 3D medium. A 3D view becomes a deliverable only as fixed, labeled views plus an
optional turntable video; if depth carries no data (an abstract force layout), Marai rule 10 says flatten to 2D.

### 5.11 Recurring deliverables regenerated from refreshed data

Evidence: BloodHound Enterprise exposure trends (5.8); ONA monthly dashboards (5.4); bibliometric institutional
reports and "sometimes a Tableau or Shiny dashboard, plus a methods note so the work 'can be reproduced and handed
off'" (bibliometrics sibling); Cisco general managers report supply chain resiliency scores twice a year (supply
chain sibling); continuing-activity SAR reviews (5.3); dependency engineers, for whom "a link to a filtered view, a
saved selector or a saved query is the shareable unit" and everything "is regenerated from source" (dependency
sibling).

**How a mature tool does the comparison.** BloodHound Enterprise's Posture page is a recurring graph deliverable
regenerated after every analysis run, and its documentation spells out what "compare with the previous period"
takes ([Posture page](https://bloodhound.specterops.io/analyze-data/bloodhound-gui/posture-page);
[Data Quality](https://bloodhound.specterops.io/collect-data/data-quality)):

- **Fixed scope.** Filters for environment (one Active Directory domain or Azure tenant), zone (Tier Zero by
  default, or another zone or the Hygiene category), severity, and a date range "to compare posture trends between
  analysis runs". For meaningful trend comparisons the page says to "use the same filter scope and similar date
  ranges across reviews".
- **A change table by category.** Count is "the number of findings that existed on the end date of the selected
  range"; Change is "the calculated difference in the number of findings between the beginning and end date". Paths
  that were fully resolved by remediation, or deprecated by the vendor, during the range still appear in the table for
  that range. Counts are per day, so runs that cross a day boundary can shift the numbers.
- **Trend graphs** of attack path exposure (the percentage of principals that can compromise the zone), findings,
  active attack paths and objects in the zone, on a linear or logarithmic scale.
- **A completeness gate.** Group Completeness and Session Completeness are "the percentage of all computers that were
  scanned successfully", counting only enabled computers with a login in the past 14 days. The Data Quality page says
  to "wait for ingest and analysis processing to complete before you compare counts or trends"; completeness below 100
  percent is normal because "workstations and servers can be offline, unavailable, or inaccessible during a collection
  run", and low completeness points to "collector permissions, collector logs, and collection scheduling". A drop in
  exposure in a period with poor session coverage may be missing data, not remediation.

**Matching the same things across periods.** A refreshed extract renames, merges, adds and drops entities, and
every comparison depends on matching them:

- Neo4j Bloom scenes "rely on node and relationship IDs in Neo4j", and the documentation warns that a database that
  reuses ids (for example after backup and restore) can make saved scenes display incorrectly
  ([Bloom scenes](https://neo4j.com/docs/bloom-user-guide/current/bloom-tutorial/export-data/)).
- Institutions in bibliometric reports change names and merge. The Research Organization Registry keeps one
  identifier through a rename, marks organizations that split, merged or closed as inactive, and links them with
  Successor and Predecessor relationships; its search and affiliation matching return active records only by default
  ([ROR, organization status](https://ror.org/blog/2022-12-07-handling-org-status/);
  [ROR relationships](https://ror.org/blog/2023-02-27-parents-children-and-other-relationships-in-ror)). A
  year-over-year institutional report must roll predecessors into successors or the merged unit appears as a new
  entity and its parts as departures.
- ONA practitioners keep the edge rules stable across periods and use at least three months on each side of a change
  (ONA sibling, section 5). Viva Insights' minimum group size (default five, never lower) shows no data for a group
  below the threshold ([Microsoft Learn](https://learn.microsoft.com/en-us/viva/insights/privacy/privacy-considerations)),
  so a team that shrinks between periods vanishes from the dashboard; a reader can mistake suppression for a
  departure unless the change table marks it.

**Keeping positions fixed.** Maps are compared by position only when positions do not move. VOSviewer separates
building a map (the map file carries no coordinates, VOSviewer computes them) from viewing an existing one (the map
file carries x and y) ([VOSviewer file types](https://app.vosviewer.com/docs/file-types/map-and-network-file-type)),
which is how science overlay maps keep one base map across years (Designloom workflow W57). Kumu maps connected to a
Google Sheet fetch their data "on the fly each time you refresh the page", but pinning elements in place does not
work on those maps ([Kumu](https://docs.kumu.io/guides/import/google-sheets)), so a refreshed map can be rearranged.

**Graph tools that re-render a saved view.** NeoDash, the Neo4j dashboard builder, builds dashboards from reports;
"each report will have a single Cypher query behind it", a Graph report draws the returned nodes and relationships,
and each report's settings hold its refresh rate ([NeoDash reports](https://neo4j.com/labs/neodash/2.2/user-guide/reports/)).
Its Graph report re-runs the query when shown ("Auto-run query") and lays the result out force-directed, freezing
only positions a viewer drags ([NeoDash graph report](https://neo4j.com/labs/neodash/2.4/user-guide/reports/graph/)).
BloodHound Enterprise Posture regenerates on every analysis run. Both store the query and settings, and neither, in
its documentation, stores fixed positions or a period-to-period diff of the drawing itself. Viva Insights queries
auto-refresh when new collaboration data arrives, only for the preset time ranges, while the Power BI report must
still be refreshed to show the new results ([Viva auto-refresh](https://learn.microsoft.com/en-us/previous-versions/viva/insights/tutorials/query-auto-refresh)).

Steps, combining these practices:

1. **Build once**: view, filters, styling, legend, parameters block, tables.
2. **Save as a definition**, not pixels: the query or import mapping, the filters and scope, the style, the
   parameters, and the positions or the base map that must stay fixed.
3. **Load the new period's data** and wait until import and any analysis have finished.
4. **Check coverage before comparing**: completeness of the collection (share of expected sources or hosts that
   reported), record counts against the previous period, and the data date. Below the agreed level, mark the period
   as not comparable instead of reporting a change.
5. **Match entities across periods**: by stable id; apply renames and merges (predecessor rolled into successor);
   list new and departed items, and items hidden by a minimum group size, separately.
6. **Re-render with the same scope and parameters**, keeping existing positions fixed and placing only new items.
7. **Build the change table**: per category, the count at the end of the period, the change from the start, and the
   items resolved, retired or newly appeared within the period; plus trend lines over all periods.
8. **Publish**: export the files, refresh the dashboard or update the embed, stating the period, the data date, the
   coverage figures and that the scope matches the previous edition.

## 6. Data at hand-off

- **What travels.** Images (PDF, SVG, EPS, TIFF, PNG); videos (AVI, MP4); chart files (.cys, .gephi, i2 .anb/.anx,
  .mtgl, Kumu, BrainNet .mat options); interchange (GraphML, GEXF, CX2, VOSviewer JSON, STIX bundles, CSV, XLSX);
  documents (PDF, PowerPoint, Word); web bundles (HTML plus JSON); notebooks; dashboards.
- **Size.** Far smaller than the working graph: UNODC example court charts under 20 entities (law enforcement
  sibling); a single leadership team in ONA readouts; hundreds of nodes per journal panel; around 1,000-5,000 nodes
  for Cytoscape web exports. Public-health partner deliverables contain no nodes at all.
- **Identifiers and provenance.** Exhibit and Bates numbers, transaction ids, gene ids and database versions, survey
  question text, atlas names, connectome versions, figure-to-edge-to-source-page links (DH). Linkurious data exports
  contain "only raw data" ([Linkurious](https://doc.linkurious.com/user-manual/latest/visualization-export/)); Bloom's
  CSV layout is fixed ([Neo4j community](https://community.neo4j.com/t/exporting-csv-file-from-bloom/62288)). The
  picture and the data separate at export.
- **Sensitivity.** SAR confidentiality; grand jury and discovery rules; classification marking; ONA minimum groups;
  HIV cluster confidentiality and small cells; object names in attack-path images; unpublished data before a paper.

## 7. Analysis methods carried into deliverables

The deliverable shows the RESULT in plain terms; the method goes in the legend, methods or footnote.

- **Science:** clustering, enrichment thresholds, layout names and seeds; connectomics adds thresholds, density and
  atlas; bibliometrics adds counting method and clustering resolution; temporal work adds window parameters.
- **Court and SAR:** per-pair sums, counts, date ranges, paths, shared identifiers; centrality almost never named.
- **Public health:** cluster counts and growth over a period, by population group; no individual measures.
- **Cyber:** path enumeration, choke points, hop order; exposure as a trend.
- **ONA:** degree as node size, cross-group tie percentages, modeled "after" connectivity.
- **Intelligence:** ICD 203 source quality and fixed likelihood terms; ICD 208 products customers can "readily find,
  access, use, and pass along" ([ICD 203](https://www.dni.gov/files/documents/ICD/ICD-203.pdf),
  [ICD 208](https://www.dni.gov/files/documents/ICD/ICD-208-Maximizing-the-Utility-of-Analytic-Products-2017-01-09.pdf)).

## 8. Outputs and collaboration: deliverable matrix

Cadence: O = one-off, frozen at hand-off; R = recurring, regenerated from refreshed data.

| Population                    | Final deliverable                                                              | Must contain                                                                     | Format                                                | Recipient                       | Cadence                      | Provenance / audit               |
| ----------------------------- | ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- | ----------------------------------------------------- | ------------------------------- | ---------------------------- | -------------------------------- |
| Life science                  | Figure + legend + methods; deposit; session                                    | Node and edge legend; thresholds, tool, layout                                   | Vector PDF/SVG/EPS or 300-600 dpi TIFF; 85/114/174 mm | Journal                         | O                            | NDEx URL then DOI                |
| Network science               | Figure + code + data                                                           | As above plus seed                                                               | As above                                              | Journal                         | O                            | Repository                       |
| Neuroscience                  | Ordered matrix heatmap; multi-view 3D figure; connectogram; edge table; movie  | Block outlines; lateral/medial views; one shared color bar; atlas and thresholds | TIFF/EPS/PNG at size and DPI; AVI; CSV                | Journal                         | O                            | Option files; connectome version |
| Crime analyst                 | Link chart; timeline chart; summary                                            | Key, date of currency, source grading, marking                                   | 16:9 slide, A3 print                                  | Commanders                      | O, weekly                    | Facts apart from opinion         |
| Trial / forensic accountant   | FRE 1006 summary or FRE 107 aid; timeline                                      | Trial evidence only; exhibit refs; neutral emphasis                              | Screen, A0+ board, binder, record copy                | Jury, judge                     | O                            | Underlying records available     |
| AML / fraud                   | SAR narrative + one CSV; case file                                             | Who/what/when/where/why; CSV described                                           | Text; CSV at most 1 MB; PDF case file                 | FinCEN/NCA, QC                  | O; R for continuing activity | Five-year retention              |
| Public health                 | Line list + narrative (internal); cluster-level summary (partners, public)     | No network diagram for partners; aggregates; small cells considered              | Table, short report                                   | Program staff, partners, public | R (monthly review)           | Data sharing agreement           |
| Cybersecurity                 | Findings with label-hidden images; hop table; STIX; blocklists; exposure trend | Reproduction steps; time-ordered hops; hidden object names                       | PNG/JPG/SVG, CSV, STIX JSON                           | Client, SOC, partners           | O per engagement; R exposure | Re-run queries to verify         |
| OSINT                         | Report PDF; entity tables                                                      | Graph image, top entities, method trail                                          | PDF, CSV, GraphML                                     | Client                          | O                            | Saved graph; captures            |
| Bibliometrics                 | Screenshots; VOSviewer Online link or embed; methods note; dashboard           | Counting method, thresholds, resolution                                          | PNG at 200 percent; JSON link; iframe                 | Journal, leadership             | O papers; R reports          | Archived JSON                    |
| ONA                           | Readout deck; dashboard; personal reports                                      | Survey question per slide; legend; finding titles                                | PowerPoint; Power BI or Viva                          | Leadership, HR                  | O readout; R dashboard       | Minimum group sizes              |
| Systems mapping               | Narrated presentation; embed; poster                                           | Stepwise reveal; sources                                                         | URL, iframe, image                                    | Funders, public                 | O, then updates              | Republish to update              |
| Journalism                    | Embedded and print graphic; database                                           | Verified subset; caveats; phone labels                                           | SVG; responsive HTML; CSV dumps                       | Readers                         | O                            | Per-edge verification            |
| Digital humanities            | Article figures; project site; data publication                                | Provenance to source page; confidence                                            | SVG cleaned in Inkscape; website; CSV on GitHub       | Readers, scholars               | O                            | Edge to source page              |
| Code-first data science       | Notebook; pyvis HTML; Plotly/Streamlit/Dash; CSV                               | Code plus seed                                                                   | ipynb, HTML, app, CSV                                 | Stakeholders, engineers         | O or R                       | Code and seed                    |
| Supply chain / infrastructure | Exposure dashboard; affected-parts list; regulatory filings                    | Map plus ranked tables; revenue at risk                                          | Dashboard, tables, one-line diagrams                  | Executives, regulators          | R                            | Supplier audit trail             |
| Dependency / impact           | Affected-service list; postmortem; impacted CIs; diagram                       | Dependency chain; timeline                                                       | Ticket, draw.io XML, PNG, Visio                       | Incident team, change board     | O; R regenerated from source | Saved query or view link         |
| Education                     | Image + node table in report                                                   | Legend, metric table                                                             | PNG, SVG/PDF; Word or PDF                             | Instructor                      | O                            | None                             |

**Simplification techniques that recur:** write the message first (Marai rule 1); filter to the evidenced subset;
aggregate clusters; manual layout and pinning; one finding per slide or panel; guided reveal (Kumu, scrollytelling,
snapshot sequences); bake labels in because tooltips vanish; grayscale-safe encodings; legend and provenance on the
artifact; aggregate instead of draw when individuals must not be visible (public health, ONA).

## 9. Tools landscape and pain points at export time

| Tool                                | What people use for hand-off                                   | Documented pain                                                                                                                                                                             |
| ----------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cytoscape                           | Image export, session, NDEx, web page                          | Only visible area exported; DPI field misleading; node-only legends; slow web export above about 5,000 nodes                                                                                |
| Gephi                               | Preview export; Sigma.js template; Gephi Lite gist             | Styling redone in Preview; label settings lost ([bug 728875](https://bugs.launchpad.net/bugs/728875)); no legend; large PDF hangs; public gists only                                        |
| i2 Analyst's Notebook               | Print, PDF, custom paper, timeline charts, Chart Reader        | PDF truncation above Letter on 8.9.5; blank PDFs; missing PDF plug-in ([IBM](https://www.ibm.com/support/pages/missing-export-pdf-option-ibm-i2-analysts-notebook))                         |
| Maltego                             | .mtgl, tables, image tiles, PDF report                         | 20-page reports for 30 entities; recipients need Maltego                                                                                                                                    |
| Linkurious                          | Image export with captions; data export; guest links           | No legend in export docs; data export drops styling; guest mode can expose the database                                                                                                     |
| Neo4j Bloom                         | PNG (SVG since Feb 2026), CSV, scene sharing                   | Fixed CSV; screenshot omitted labels in one version ([community](https://community.neo4j.com/t/screenshot-in-bloom-does-not-capture-displayed-node-properties-if-viewing-full-graph/68044)) |
| KeyLines / ReGraph                  | Vector PDF, annotations, snapshot reports                      | Developer builds the report; map layers may drop ([docs](https://developers.cambridge-intelligence.com/docs/keylines/pdf-export))                                                           |
| Kumu                                | Presentations, links, embeds                                   | New URL on privacy change; one-hour embed delay; link holders see private maps                                                                                                              |
| BloodHound                          | JSON; Enterprise image export with Hide Labels; posture trends | Image export is Enterprise-only (cyber sibling)                                                                                                                                             |
| BrainNet Viewer                     | Multi-view figures, AVI, option files                          | MATLAB; ten-minute movie render; threshold must be reset per matrix (connectomics sibling)                                                                                                  |
| ndtv / pathpy                       | HTML animations, filmstrips                                    | R or Python only                                                                                                                                                                            |
| MicrobeTrace, HIV-TRACE             | Cluster views, tables                                          | Partner deliverable needs aggregation elsewhere (public health sibling)                                                                                                                     |
| PowerPoint / Illustrator / BI tools | Final assembly in almost every population                      | Every upstream change means redoing assembly; no link back to data                                                                                                                          |

**The common failure** is that the graph tool's job ends at a picture, and the deliverable is finished elsewhere by
hand: legends in Illustrator, parameters copied from dialogs, sources typed into footnotes, aggregate tables built
in Excel, narratives written from scratch, and the whole thing rebuilt next month.

## 10. Requirements implied

Coverage is judged against Graphty's records in design/designloom: capabilities `export-image` (implemented),
`legend-display` (implemented), `view-bookmarks` (implemented), `data-export` (implemented), `annotation` (planned),
`report-generation` (planned); workflows W15 (Findings Communication) and W25 (Reproducible Session and Network
Publication).

| #   | Requirement                                                                                                                                                                                                                                                                                                                                                           | Priority                                                                                | Covered?                                             |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| R1  | Vector export (SVG, PDF) of the whole graph or a chosen region, independent of the viewport, with embedded fonts and Unicode                                                                                                                                                                                                                                          | must                                                                                    | Partly (`export-image`: formats and resolution only) |
| R2  | Print-size export in mm or inches at 300-600 dpi with legibility preview; presets 85/114/174 mm, Letter, A4, A0, 16:9                                                                                                                                                                                                                                                 | must                                                                                    | Gap                                                  |
| R3  | Legend generated from the live style for node AND edge encodings, inside the export, editable text                                                                                                                                                                                                                                                                    | must                                                                                    | Partly (`legend-display` on screen)                  |
| R4  | Parameters and provenance block (source and version, filters, algorithms, layout and seed, time window, date) as legend text and methods paragraph                                                                                                                                                                                                                    | must                                                                                    | Gap                                                  |
| R5  | Per-element source references (record id, exhibit or Bates number, URL) surviving export as footnotes or a linked table                                                                                                                                                                                                                                               | must for court, SAR, journalism, DH                                                     | Gap                                                  |
| R6  | Filtered, column-chosen, size-capped CSV of a subgraph (1 MB SAR), plus per-pair sums and counts over a date window                                                                                                                                                                                                                                                   | must for AML                                                                            | Gap                                                  |
| R7  | Evidence-only mode: hide unconfirmed links and non-evidence attributes. Neutral emphasis: uniform sizing unless encoding a stated measure, no decorative frames or marks (basis: _Bray_ "accurate and nonprejudicial"; FRE 107 unfair prejudice)                                                                                                                      | must (evidence-only); should (neutral emphasis)                                         | Gap                                                  |
| R8  | Named, captioned, timestamped view states published in order as PDF or slides                                                                                                                                                                                                                                                                                         | must                                                                                    | Partly (`view-bookmarks`)                            |
| R9  | Annotation layer (text, arrows, callouts, zones) that exports                                                                                                                                                                                                                                                                                                         | must                                                                                    | Planned (`annotation`)                               |
| R10 | Guided presentation with text per step, shareable and embeddable                                                                                                                                                                                                                                                                                                      | should                                                                                  | Gap                                                  |
| R11 | Standalone HTML export and embeddable widget: phone-readable labels, scroll-zoom off, motion off, keyboard navigation of nodes and edges, and a tabular alternative                                                                                                                                                                                                   | should; must for public-sector publishers (R13)                                         | Gap                                                  |
| R12 | Share controls on web exports (private, invitees, organization, public link, password), a warning that all included attributes ship, field stripping before publish                                                                                                                                                                                                   | must when sharing exists                                                                | Gap                                                  |
| R13 | Accessible exports: text alternative (entity and relationship list), keyboard access, WCAG contrast, grayscale and colorblind check                                                                                                                                                                                                                                   | must for embeds and HTML published by public-sector producers; should elsewhere         | Partly (W15 "colorblind-safe")                       |
| R14 | Session file restoring data, styles, positions, filters and views; interchange export preserving style where possible                                                                                                                                                                                                                                                 | must                                                                                    | W25 in principle                                     |
| R15 | Repository deposit (NDEx or similar) with private reviewer link and DOI metadata                                                                                                                                                                                                                                                                                      | should for science                                                                      | W25 if it includes NDEx                              |
| R16 | Privacy aggregation: aggregate-only export (cluster or group tables, no node-link diagram) with configurable small-cell suppression and minimum group size; pseudonymize names                                                                                                                                                                                        | must for public health and ONA                                                          | Gap                                                  |
| R17 | Viewer-only mode that opens a delivered file without the analysis UI                                                                                                                                                                                                                                                                                                  | should                                                                                  | Gap                                                  |
| R18 | Matrix (adjacency heatmap) view with chosen ordering (by module or attribute) and block outlines, exportable as a figure                                                                                                                                                                                                                                              | must for neuroscience; should for dense networks                                        | Gap                                                  |
| R19 | Fixed positions (anatomical or geographic) preserved, rendered in several named views (lateral, medial, axial, or chosen cameras) in one figure with one shared color bar                                                                                                                                                                                             | must for neuroscience                                                                   | Gap                                                  |
| R20 | 3D scene export as a set of fixed, labeled orthographic views at print resolution with one legend, and as a turntable video; a one-step flatten to 2D                                                                                                                                                                                                                 | must where 3D is used                                                                   | Gap                                                  |
| R21 | Label-redacted image export: hide or replace node labels and chosen attributes, verified absent from the file                                                                                                                                                                                                                                                         | must for cyber                                                                          | Gap                                                  |
| R22 | STIX bundle export and chronological hop-table export (time, source, target, account, evidence) for a path                                                                                                                                                                                                                                                            | should for cyber                                                                        | Gap                                                  |
| R23 | Temporal export: video (MP4 or GIF) with fixed camera and timing; standalone animated HTML; small-multiple panels sharing one layout; timeline chart with source references per event                                                                                                                                                                                 | must for temporal and court work                                                        | Gap                                                  |
| R24 | Saved deliverable template (view, filters, style, legend, parameters, tables, fixed positions) that re-renders against new data, exportable on demand or on a schedule, or embedded live; before comparing it checks coverage, matches entities across periods (renames, merges, new, departed, suppressed), and adds a per-category change table with resolved items | must for recurring deliverables                                                         | Gap (`report-generation` planned, unspecified)       |
| R25 | Deliverable rules up front: choose the deliverable type (journal, court 1006/107, SAR, public-health partner, public embed) and apply its constraints                                                                                                                                                                                                                 | should                                                                                  | Gap                                                  |
| R26 | Overlap-free labels in the figure: no label overlaps another label or a node, resolved at the export's physical size; labels-only placement with leader lines by default (layout kept), moving nodes as an option; short-code labels with a mapping table; unplaceable labels reported, not stacked                                                                   | must for journal figures (psychometric R11, network pharmacology R10); should elsewhere | Gap (`label-overlap-removal` planned)                |

**Accessibility basis for R13.** The Department of Justice's ADA Title II rule (published April 24, 2024) adopted
WCAG 2.1 Level AA for state and local government web content, including PDFs and other conventional documents, with
listed exceptions ([UNC School of Government](https://www.sog.unc.edu/blogs/coates-canons/understanding-new-ada-web-accessibility-requirements-state-and-local-governments-2)).
An interim final rule of April 20, 2026 moved compliance to April 26, 2027 for entities of 50,000 or more people and
April 26, 2028 for smaller ones and special districts ([Federal Register](https://www.govinfo.gov/content/pkg/FR-2026-04-20/html/2026-07663.htm)).
Federal agencies fall under Section 508, whose revised standards incorporate WCAG 2.0 Level AA
([US Access Board](https://www.access-board.gov/ict/)). Health departments, public universities and state agencies
that embed an interactive graph are covered. Accessible node-link diagram research
([arXiv 2311.04502](https://arxiv.org/html/2311.04502v4)) supports a navigable structure and a text alternative.

**Corrections to W15.** (a) The deliverable is defined by the recipient's rules (journal specifications, FRE
1006/107, FinCEN form, CDC partner guidance, minimum group sizes), so W15 needs an "identify the deliverable type and
its rules" step first. (b) Several key deliverables are not graph images (SAR narrative plus CSV; public-health
aggregate tables; hop tables and STIX; FRE 107 aids that stay out of the jury room), so W15's outputs must include
narratives, tables and structured exports. (c) Parameters and provenance are mandatory. (d) W15's "test with
representative audience" maps to formal review: peer review, SAR QC, opposing counsel, works councils, data sharing
agreements. (e) W15 must distinguish one-off from recurring deliverables and cover temporal and 3D-to-print outputs.
(f) Add personas `litigation-demonstratives-specialist`, `publication-figure-author` and `graph-deliverable-recipient`.
(g) Every production workflow names its producers (section 3.4); `graph-deliverable-recipient` stays on them only
as the reader, and her own steps are the separate reading workflow W1018. The facet `publication-figure-author` never
stands alone as a producer: the journal figure (W313) names the genomics lab and core facility bioinformaticians, and
the web export (W318) names the newsroom graphics editor, the investigation's data team, the archive editor and the
notebook data scientist.

## 11. Sources

Primary sources are linked inline. Additional sources and sibling documents relied on:

- https://manual.cytoscape.org/en/3.10.3/_sources/Export_Your_Data.md.txt -- Cytoscape export, web export limits, fonts.
- https://py4cytoscape.readthedocs.io/en/latest/reference/generated/py4cytoscape.network_views.export_image.html -- scripted export.
- https://pmc.ncbi.nlm.nih.gov/articles/PMC5679399 -- NDEx peer-review flow.
- https://github.com/SachaEpskamp/qgraph/issues/5 -- qgraph labels overlap in tight spring layouts; answers offer HTML tooltips or more repulsion, nothing for print.
- https://docs.yworks.com/yfiles-html/dguide/label_placement/ -- generic labeling moves only labels and cannot resolve all overlaps; integrated labeling removes them by moving nodes.
- https://mdlutoronto.github.io/gephi-visualize-network-dataset/6-f-add-labels-and-make-final-layout-adjustments/ -- teaching sequence ends with Label Adjust, then Noverlap.
- https://gephi.org/desktop/plugins/sigmaexporter -- Sigma.js export needs a web server.
- https://bsaefiling.fincen.treas.gov/docs/FinCENSARElectronicFilingRequirements.pdf -- SAR attachments.
- https://neo4j.com/docs/bloom-user-guide/current/bloom-tutorial/export-data/ -- Bloom export.
- https://offshoreleaks.icij.org/pages/database -- data download and license.
- https://neo4j.com/blog/neo4j-power-behind-paradise-papers/ -- shared visualizations among 382 journalists; Data and Research Unit editor quote.
- https://source.opennews.org/articles/network-diagrams-hard/ -- who built NPR's network diagram; illegible text on small screens.
- https://helpcenter.flourish.studio/hc/en-us/articles/8761553784719-Network-graph-an-overview -- Flourish network inputs.
- https://www.cdc.gov/hivpartners/php/cdr/health-department-guidance.html -- CDC cluster communication and data protection.
- https://caselaw.findlaw.com/court/us-6th-circuit/1097222.html -- United States v. Bray, summary charts.
- https://www.ca10.uscourts.gov/sites/ca10/files/opinions/010111410037.pdf -- United States v. Fei Xie (unpublished).
- https://search.r-project.org/CRAN/refmans/ndtv/html/render.d3movie.html -- ndtv HTML animation output.
- https://app.vosviewer.com/docs/sharing/linking/ -- VOSviewer Online links and simple_ui.
- https://specterops.io/wp-content/uploads/sites/3/2025/07/BHE_Datasheet_1016-4_61bcf0.pdf -- continuous attack path mapping.
- https://www.govinfo.gov/content/pkg/FR-2026-04-20/html/2026-07663.htm -- ADA Title II compliance date extension.
- https://www.sog.unc.edu/blogs/coates-canons/understanding-new-ada-web-accessibility-requirements-state-and-local-governments-2 -- Title II scope and exceptions.
- https://www.access-board.gov/ict/ -- Section 508 standards.
- https://www.fincen.gov/resources/faqs/frequently-asked-questions-regarding-the-fincen-suspicious-activity-report-sar/ -- continuing-activity timing and five-year copies.
- https://learn.microsoft.com/en-us/viva/insights/advanced/setup-maint/user-roles -- Viva Insights Analyst and manager access.
- https://bloodhound.specterops.io/analyze-data/bloodhound-gui/posture-page -- exposure trend for tracking remediation.
- https://bloodhound.specterops.io/collect-data/data-quality -- completeness checks before comparing counts or trends.
- https://neo4j.com/labs/neodash/2.2/user-guide/reports/ -- NeoDash reports: one Cypher query each, refresh rate setting.
- https://neo4j.com/labs/neodash/2.4/user-guide/reports/graph/ -- NeoDash Graph report: auto-run query, positions frozen only after drag.
- https://neo4j.com/docs/bloom-user-guide/current/bloom-tutorial/export-data/ -- Bloom scenes rely on database ids.
- https://ror.org/blog/2022-12-07-handling-org-status/ -- inactive organizations, successor and predecessor links.
- https://app.vosviewer.com/docs/file-types/map-and-network-file-type -- map files with x and y coordinates.
- https://docs.kumu.io/guides/import/google-sheets -- sheet-connected maps refresh on load; pinning unavailable.
- https://learn.microsoft.com/en-us/previous-versions/viva/insights/tutorials/query-auto-refresh -- Viva query auto-refresh.
- https://www.Cdc.gov/hiv/programresources/guidance/hiv-cluster-detection-and-response-guidance/cluster-review-and-prioritization.html -- cluster review group membership.
- Sibling documents in this folder: financial-crime-fraud-aml-kyc.md, law-enforcement-and-intelligence-analysts.md,
  public-health-and-molecular-epidemiology.md, network-neuroscience-connectomics.md, cybersecurity-graph-work.md,
  bibliometrics-and-science-mapping.md, code-first-data-scientists-and-graph-ml.md,
  digital-humanities-and-historical-networks.md, supply-chain-and-physical-infrastructure-networks.md,
  dependency-and-impact-analysis-engineers.md, students-educators-and-first-time-users.md,
  temporal-and-dynamic-networks.md, organizational-network-analysis-people-analytics.md,
  investigative-journalism-and-osint.md, systems-and-stakeholder-mapping-civic.md.
