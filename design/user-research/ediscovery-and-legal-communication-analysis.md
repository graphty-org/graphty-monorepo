# eDiscovery, litigation review and internal-investigation teams who use communication graphs

## 1. Summary

This population reviews large collections of email and chat for lawsuits, government
investigations, merger reviews and internal investigations: contract and first-pass review
attorneys, case-team associates, litigation-support and eDiscovery analysts, internal-investigations
counsel, the receiving side (plaintiff firms and agencies analyzing productions they did not
collect), and at the edge compliance surveillance reviewers. They meet graph software inside their
review platform -- Relativity, Everlaw, Reveal/Brainspace, Nuix, Proofpoint -- not as a separate
graph tool, and they meet three different graphs:

1. **The email thread tree**, a time-ordered tree of messages shown in a pane of the document viewer.
   It is the graph the largest group, first-pass reviewers, sees on every threaded email they open.
   Its nodes carry states from deduplication and inclusiveness, and reviewers select a branch and code
   it in one action.
2. **The people graph** ("who talked to whom"), built from email headers after every person's
   addresses and display names are merged into one entity. Analysts and case teams use it at early
   case assessment, custodian selection, privilege screens and investigations, as a facet that narrows
   a document list.
3. **The people-fact-issue structure** produced by generative-AI fact extraction (Relativity Case
   Strategy, generally available January 2026): facts with dates, issues and associated people that
   feed chronologies, witness summaries and deposition outlines.

The graph is almost never the deliverable. Its correctness depends on steps most graph users never
see: entity merging, deduplication, permission scoping, and the fact that a graph built from collected
mailboxes is a biased sample of who actually communicated.

A second, smaller legal population works with a different graph: **the case-law citation network**,
in which court decisions are nodes and each citation from a later decision to an earlier one is a
directed edge. Its users are empirical legal scholars, who rank precedents and trace how a line of
case law developed, and legal researchers in practice, who meet a citation map inside Lexis or
Westlaw. Section 11 covers them.

## 2. Population

**Job titles.** Contract and first-pass review attorney; review manager; case-team associate;
litigation-support, practice-support and eDiscovery analyst; eDiscovery project manager (at firms and
at vendors such as Consilio, Epiq, KLDiscovery, Lighthouse); in-house eDiscovery counsel;
internal-investigations counsel and forensic accountants at consultancies; plaintiff-side litigation
support; government litigators and agency staff who receive productions (FTC and DOJ in merger
Second Requests, SEC enforcement). No job posting read directly names "communication analysis" or
"name normalization" as a duty; they sit inside "structured analytics" (no source read directly; the
postings found were only seen as search excerpts and are not cited).

**Sectors and size.** Relativity reports "over 329,000 enabled users in 48+ countries", "more than
13,000 organizations" and use by "199 of the Am Law 200", with the U.S. Department of Justice as a
named customer ([EDRM, About Relativity, undated](https://edrm.net/?p=163681)). These count platform
accounts, not people who open any graph view. No source gives a headcount of review attorneys or
litigation-support staff, or a usage share for any graph view. US eDiscovery consulting is estimated
at about $6.9bn in 2026 ([IBISWorld](https://www.ibisworld.com/united-states/industry/e-discovery-consulting-services/5420/)).

**How often they touch each graph.**

- _Thread tree: daily, for reviewers._ Relativity's Email Thread Visualization opens from an icon in
  the document Viewer for any threaded email, and emails outside the reviewer's queue open "a new
  queue limited to that thread group"
  ([Relativity help](https://help.relativity.com/RelativityOne/Content/Relativity/Analytics/Email_thread_visualization.htm)).
  Practitioners describe threading as routine: "Most review tools these days include email
  threading"; a litigation-support director "uses email threading regularly"; a Husch Blackwell
  eDiscovery lead reports "as much as a 50% reduction in the number of emails that need to be
  reviewed" ([Twigger, Above the Law, 2018](https://abovethelaw.com/2018/06/email-threading-one-of-the-most-overlooked-gems-in-ediscovery/)).
  A Delaware State Bar Journal article treats threading as "a touchstone around which to organize the
  review workflow" ([DSBA via Morris James, 2023](https://www.morrisjames.com/?p=5989)). No source
  measures how often reviewers open the visual pane itself rather than only the threading fields.
- _People graph: episodic and front-loaded_ -- at early case assessment, custodian selection, privilege
  screens, and when a new name turns up in an investigation. A former law-firm eDiscovery program head
  used it "sometimes" to prioritize custodians in a phased review
  ([Casey, Reveal, 2022](https://revealdata.com/blog/lets-get-visual-supercharging-ediscovery-with-data-visualization),
  reposted by [ACEDS](https://aceds.org/?p=585353)). How often case teams actually open it: no source
  found. No forum, Reddit, ILTA or Relativity Fest discussion of frequency or trust was found; the
  practitioner pieces found (CDS, Casey, Twigger) are by vendor-affiliated authors.
- _People-fact-issue structure: new._ Used from fact development through deposition preparation where
  licensed; no source shows whether it reduces use of the people graph.

**Skill profile.** Graph literacy low to moderate: users read node size, edge thickness and color
clusters, and some Reveal users pick PageRank or betweenness from a menu
([Connection Map](https://ai-help.revealdata.com/en/Connection-Map.html)). No coding for attorneys;
analysts write saved searches, regular expressions and sometimes scripts. Domain literacy is high:
privilege, custodians, threading, deduplication, production rules.

**Team context.** A case team directs; a review manager runs contract reviewers; a litigation-support
analyst or vendor runs processing and analytics; eDiscovery counsel negotiates scope and custodians.
Team sizes: no source read directly.

## 3. Personas

### 3.1 Litigation-support analyst (id: `litigation-support-analyst`) -- "Dana"

- **Role.** Senior eDiscovery analyst at a vendor serving large firms; Relativity Certified
  Administrator; six years of processing and analytics.
- **Tools.** RelativityOne Processing; structured analytics sets for email threading, textual
  near-duplicates and name normalization; dashboards with the Communication Analysis widget;
  Brainspace for concept clustering; Excel for entity cleanup lists.
- **Data.** 20 to 150 custodians; mailbox PSTs; Teams and Slack exports converted to Relativity Short
  Message Format (RSMF); hundreds of thousands to millions of documents.
- **Goals.** Clean entities before the case team looks at the graph; run threading so reviewers see a
  correct tree; never let a mis-merged alias reach a privilege log.
- **Frustrations (grounded).** "Name Normalization can create many thousands of entities and
  aliases"; "The algorithm is quite data-dependent, and the results are not perfect"
  ([quick reference](https://help.relativity.com/Server2025/Content/System_Guides/User_quick_reference/Analytics/Name_normalization.htm));
  no documented unmerge; she must not edit an alias name "even if it's incorrect" because later runs
  read it ([results](https://help.relativity.com/Server2025/Content/Relativity/Analytics/Name_normalization_results.htm));
  missing-email placeholders in thread trees that "may not represent truly missing emails".

### 3.2 First-pass and contract reviewer (id: `ediscovery-first-pass-reviewer`) -- "Jordan"

- **Role.** Contract attorney on a staffed review, coding responsiveness, privilege and
  confidentiality from a batch queue.
- **Tools.** The review platform's Viewer, coding layout and Email Thread Visualization pane.
- **Data.** One thread group at a time: tens of messages, with attachments and duplicate spares.
- **Goals.** Review only inclusive emails, code a whole branch consistently, and catch family or
  duplicate coding conflicts before QC does.
- **Graph use.** Reads the tree (black inclusive, white non-inclusive, stacked duplicate spares,
  question-mark missing), clicks nodes to open messages, colors nodes by a coding field to spot
  inconsistencies, shift-selects a branch and mass-edits it
  ([Relativity help](https://help.relativity.com/RelativityOne/Content/Relativity/Analytics/Email_thread_visualization.htm)).
- **Frustrations (grounded).** In some platforms "the identification of Inclusive emails does not
  consider email recipients", so a reviewer may "not see the full list of recipients", which matters
  for privilege ([Thornhill, Cooley, 2023](https://uklitigation.cooley.com/threading-carefully/));
  reduction "much smaller" than promised when data irregularities make unique emails look like
  duplicates ([Twigger 2018](https://abovethelaw.com/2018/06/email-threading-one-of-the-most-overlooked-gems-in-ediscovery/)).

### 3.3 Case-team associate running ECA and custodian strategy (id: `ediscovery-case-associate`) -- "Marcus"

- **Role.** Litigation associate at a large firm, or eDiscovery counsel at a company.
- **Tools.** Everlaw or Relativity; the people graph opened from a search result; a Word custodian memo.
- **Goals.** "identify the key players" ([Everlaw 2023](https://www.everlaw.com/blog/2023/03/20/introducing-communication-visualizer/));
  decide which custodians to add, drop or review first and defend the list to the other side or the
  agency; find people nobody named.
- **Frustrations.** Graph counts that do not match the document list; blast emails and distribution
  lists that make everyone a hub; Everlaw's view is capped at 25 total name nodes (Section 5.4);
  key-player rankings that favor whoever was collected (Section 6.1).

### 3.4 Internal-investigations investigator (id: `internal-investigations-counsel`) -- "Priya"

- **Role.** Forensic investigator or counsel on a corporate investigation (bribery under the Foreign
  Corrupt Practices Act (FCPA), fraud, data theft).
- **Tools.** Brainspace concept search, Communications and Conversations; RelativityOne with
  sentiment analysis; Nuix.
- **Goals.** Start from an auditor's or whistleblower's description, find the emails, then use the
  graph to "identify additional persons of interest" and judge "level of participation in the
  conversation" ([Reveal FCPA case study](https://www.revealdata.com/success-stories/fcpa-compliance-audit)).
- **Frustrations.** Code names and personal accounts split one person into several nodes; people who
  were never collected appear only through custodians' mail.

### 3.5 Receiving-party analyst (id: `receiving-party-production-analyst`) -- "Ellen"

- **Role.** Litigation-support analyst at a plaintiff firm, or agency staff reviewing a Second Request
  or subpoena production.
- **Tools.** Whatever platform loads productions (Relativity, Everlaw, GoldFynch); load-file viewers;
  Excel.
- **Data.** TIFF or PDF images, text, selective natives and a .dat load file with an .opt image
  cross-reference. From/To/CC arrive as delimited strings; custodian and threading fields may be
  absent or blank; some header values appear only on the image face.
- **Goals.** Validate the production, build a usable people view without the producer's processing,
  find whom the producing party's custodians talked to, and spot gaps that suggest withheld data.
- **Frustrations (grounded).** Empty fields, Bates gaps, values only "on the face of PDFs", and no way
  to re-run the producer's processing; she must "request missing data" from opposing counsel
  ([Consilio](https://consilio.com/resource/ediscovery-deep-dive-6-key-questions-for-opposing-party-productions),
  [GoldFynch](https://support.goldfynch.com/support/solutions/articles/21000004211-how-to-validate-and-qc-what-is-received-and-uploaded-from-a-load-file-production)).

### 3.6 Communications surveillance reviewer (id: `communications-surveillance-reviewer`) -- weak evidence

Compliance analyst at a bank or broker clearing alerts on traders' email, chat and voice (Relativity
Trace, Global Relay, Behavox, NICE Actimize). Surveillance documentation describes alert queues,
lexicons and threading ([Trace data flow](https://relativitydev.github.io/relativity-trace-documentation/docs/administrator_guide/data_flow/detailed_data_flow.html));
no source read directly shows a click-level graph workflow. Keep as a candidate, not a design driver.

## 4. Use cases (ranked)

| Rank | Question answered with a graph                                                                                     | Who, how often                             | Graph                           |
| ---- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------ | ------------------------------- |
| 1    | Which messages in this thread must I read, and can I code this whole branch at once?                               | First-pass reviewers, every threaded email | Thread tree                     |
| 2    | Is coding consistent across the thread, its duplicates and attachments?                                            | Reviewers and QC, every review             | Thread tree                     |
| 3    | Who are the key players in this collection or search result, and how much did each send and receive?               | Case teams, at ECA                         | People graph                    |
| 4    | Which custodians should we collect or review first; can we drop or add any?                                        | Analysts, at scoping and in phased reviews | People graph                    |
| 5    | Show every document between these two people, or this person and an outside domain                                 | Investigations, deposition prep            | People graph, pair drill        |
| 6    | Which documents involve attorneys; who confers or breaks privilege?                                                | Every production                           | People graph with roles         |
| 7    | Who talked about this topic, and in what tone?                                                                     | Investigations                             | People graph with overlays      |
| 8    | In a production we received, whom did their custodians talk to, and where are the gaps that suggest withheld data? | Receiving side, every production           | People graph from load file     |
| 9    | Which people are tied to which issues and facts, over time?                                                        | Case teams, fact development to trial      | People-fact-issue with timeline |
| 10   | Is this surveillance alert part of a group of related people?                                                      | Surveillance, daily                        | Unconfirmed                     |

## 5. Step-by-step workflows

### 5.1 Name normalization and entity cleanup (Relativity) -- before any people graph

Sources: [Name normalization](https://help.relativity.com/RelativityOne/Content/Relativity/Analytics/Name_normalization.htm),
[Best practices](https://help.relativity.com/Server2024/Content/Relativity/Analytics/Best_practices_for_name_normalization.htm),
[Quick reference](https://help.relativity.com/Server2025/Content/System_Guides/User_quick_reference/Analytics/Name_normalization.htm),
[Results](https://help.relativity.com/Server2025/Content/Relativity/Analytics/Name_normalization_results.htm).

1. **Seed known people.** Pre-create entities and aliases; link aliases with **Assign to Entity**;
   classify entities (Custodian - Processing, Custodian - Legal Hold, Communicator).
2. **Build the saved search.** Email only. Optionally restrict to "a subset of documents (such as only
   your privileged documents)"; best practice is "identifying the priority custodian alone at first",
   then adding custodians incrementally.
3. **Create a structured analytics set** with the name normalization operation; map To/Cc/Bcc header
   fields; optional domain filtering and an exclusion list (shared mailboxes, distribution addresses).
4. **Know the parser rules.** Splits on semicolons; caps aliases per entity "to prevent over-merging"
   (no number stated); merges entities with the same first and last name; "If a document has more than
   500 total entities and aliases associated with it, the document is excluded".
5. **Review.** Entities and Aliases tabs; sort by frequency; triage categories Junk, To Check, Not Sure;
   "open the entities and aliases and verify that the associated documents are correct". Yet "it's not
   practical to verify the correctness of every entity" in large workspaces, so cleanup is selective.
6. **Fix.** Assign to Entity ("No more than 500 aliases") or Merge ("No more than 50 entities"; survivor
   is the Processing or Legal Hold entity, else the lowest Artifact ID; other entity data is deleted).
   No documented split or unmerge. Do not edit alias names.
7. **Hand off.** Entity From, Entity Recipient and Entity Participant fields now feed searches, the
   graph and privilege logs.

Time per step: no source found. **Same step elsewhere:** Brainspace merges by Shift-clicking nodes and
**Merge**, then naming the person in Manage People
([Communications](https://docs.revealdata.com/brainspace/docs/communications),
[People Manager](https://docs.revealdata.com/brainspace/docs/people-manager)). Everlaw builds entities
at upload and lets admins merge, remove an address and mark an address as shared (Everlaw's help pages
return 403 to direct reading; this comes from search excerpts of
[Entity Management](https://support.everlaw.com/hc/en-us/articles/29564010077083-Entity-Management)).

### 5.2 Email thread tree in the viewer (Relativity) -- the reviewer's daily graph

Sources: [Email thread visualization](https://help.relativity.com/RelativityOne/Content/Relativity/Analytics/Email_thread_visualization.htm),
[Inclusive emails](https://help.relativity.com/RelativityOne/Content/Relativity/Analytics/Inclusive_emails.htm),
[Twigger 2018](https://abovethelaw.com/2018/06/email-threading-one-of-the-most-overlooked-gems-in-ediscovery/),
[DSBA 2023](https://www.morrisjames.com/?p=5989).

1. **Run email threading** (analyst) as a full build in a structured analytics set. It writes the Email
   Author Date ID field and marks each email inclusive or not and each duplicate as spare. An inclusive
   email "contains unique content not included in any other email"; a non-inclusive one has "text and
   attachments ... fully contained in other (inclusive) emails"; Email Duplicate Spare is "set to Yes for
   all but one duplicate in each group".
2. **Open a document** in the Viewer and click the Email Thread Visualization icon. The pane shows the
   whole thread group; the open email is outlined in orange and drawn larger.
3. **Read the layout.** Time runs left to right, earliest on the left. Forward and Reply branch
   downward; Reply All comes before those branches. Icons encode the action (reply, reply all, forward,
   draft) and attachments (one or many).
4. **Read node states.** Black = inclusive, non-duplicate-spare; white = not inclusive; a double-stacked
   icon = duplicate spares or other emails at the same thread position (causes: an inserted
   confidentiality footer, body-text differences, different attachments); a question mark = missing.
   "Missing email icons may not represent truly missing emails"; they often appear when an earlier
   segment changed, and a secured email mid-thread shows as missing.
5. **Navigate.** Click a node to open it; hover for sender, sent date, attachments and duplicate spares.
6. **Highlight coding.** Turn on Highlight Field and pick a Yes/No or single-choice field; each choice
   gets a color. A red exclamation point marks a node whose duplicate spares or attachments have
   mismatched coding.
7. **Select a branch and act.** Enable Mass Edit Selection; click emails (attachments and duplicate
   spares come along, a green circle counts them); Shift-click the first and last email to take a
   branch; Edit opens the mass-edit form; Done refreshes the tree.
8. **QC.** Practitioners mark non-inclusive families "unreviewed" in a Review Status field to separate
   deliberate skips from accidental ones, and code whole threads non-responsive to remove "hundreds or
   thousands of emails very quickly" (Twigger). Having "a single attorney" review "an entire email
   thread" keeps coding consistent (DSBA).

Older equivalents: Kroll Ontrack's Advanced Thread View inside Relativity sorted threads by inclusive
count and flagged coding inconsistencies across a conversation; its page shows conflicting dates (2016
and 2022) ([Ontrack](https://www.ontrack.com/en-us/press/kroll-ontrack-streamlines-the-review-of-communication)).

### 5.3 Communication Analysis widget in Relativity: the people graph as a facet

Source: [Communication analysis](https://help.relativity.com/RelativityOne/Content/Relativity/Analytics/Communication_analysis.htm)
(modified 2025-Aug-12).

1. **Prepare the view.** Run a search; for correct counts keep all unique documents "rather than only
   inclusive emails" and remove duplicates "so one communication isn't counted twice". Relativity
   records other holders of deduplicated items in an All Custodians field when it is mapped
   ([duplication workflow](https://help.relativity.com/RelativityOne/Content/Relativity/Processing/Processing_duplication_workflow.htm), search excerpt).
2. **Add the widget.** Errors if name normalization has not run.
3. **Read what is counted.** Each document is one communication from the top-segment sender to its
   recipients. "By default, the visualization displays the largest 500 communicating entities"; no
   documented setting changes it. Entities only in documents the user cannot view are omitted.
4. **Read the picture.** Node size = sent + received; frequent communicators share a color; a self-loop
   means a person emailed themself from another of their own addresses; Communication Volume sets
   thickness.
5. **Filter.** Top 5 Communicators preset; To, Cc and Bcc checkboxes (clearing Bcc "hides recipients who
   appear only in the Bcc field"); Minimum Connections; Detached Entities; Grouping; Sentiment rings;
   an entity list with Locate and Focus.
6. **Drill.** Hover for totals; double-click a node to add "entity is sender or recipient" to the search
   and rerun; double-click a link to isolate the pair.
7. **Act.** Flag, Mass Edit, Select Groups, Select Neighbors, Hide Selected. **Apply** writes the
   selected nodes into the search conditions, and the document list shows only their documents.
8. **Hand off.** The reviewer codes, batches or saves the search. The widget has no documented export.

### 5.4 Key players and custodian prioritization at ECA (Reveal/Brainspace and Everlaw)

Sources: [Reveal Communications](https://docs.revealdata.com/docs/communications),
[Brainspace Communications](https://docs.revealdata.com/brainspace/docs/communications),
[Connection Map](https://ai-help.revealdata.com/en/Connection-Map.html),
[Everlaw 2023](https://www.everlaw.com/blog/2023/03/20/introducing-communication-visualizer/),
[Everlaw help](https://support.everlaw.com/hc/en-us/articles/17106075039771) (403 to direct reading;
figures from search excerpts of that page).

1. **Scope.** Open the graph on the whole project or the current search; Everlaw opens from a search, a
   results table or Data Visualizer.
2. **Choose node type.** Reveal: Communicators or Domains. Everlaw: Names, Emails or Domains.
3. **Set caps.** Reveal: Max Node Count default 100, Max Link Count default 1,000 (raising it may pull
   in "blast email traffic"); no "showing N of M" count is documented. Connection Map: Max Links default
   the top 500 relationships, and the app shows the total number of pairs in the data. Everlaw: by
   default the top 10 name nodes by emails sent and received; specified names can each show their "top
   x" neighbors, under a cap on total nodes (25 for names, 20 for domains): for example two specified
   names with 11 neighbors each gives 2 x (11 + 1) = 24 nodes. An "Others" node aggregating hidden
   traffic is unverified: no readable source mentions one.
4. **Remove noise.** Toggle To/Cc/Bcc; Brainspace Recipient Volume "< 100" drops mass mailings; minimum
   connections.
5. **Read structure.** Color clusters; Connection Map marks custodians with C and people in the search
   with S; a Network Analysis menu highlights by betweenness, PageRank or eigenvector (all, incoming,
   outgoing); layouts Standard (force-directed), Hierarchical, Radial, Structural, Lens, Organic.
6. **Decide.** Use the graph to "expand or reduce the total in scope custodians on a matter based on
   actual communication patterns" (Casey 2022). No source gives a numeric rule. Discount custodians'
   centrality (Section 6.1).
7. **Feed search.** Reveal Add to Search makes a "Communicator:" pill covering all aliases; Brainspace
   Add to Query; Everlaw Selection mode sends "persons, lines of communication, and groups" to filter or
   "expedite directly to review", and helps "share, and assign important document sets".
8. **Deliver.** A custodian list and memo for the meet-and-confer or agency, plus, in Reveal, an exported
   graph image and Communications Data CSV (Section 8). In FTC Second Requests most parties searched
   fewer than 35 custodians (search excerpt of [FTC 2015 best practices](https://www.ftc.gov/system/files/attachments/merger-review/best_practices_for_merger_investigations_august_2015.pdf));
   the FTC now asks parties to describe custodians' responsibilities and how they will use eDiscovery
   tools before using them ([FTC 2021](https://www.ftc.gov/enforcement/competition-matters/2021/09/making-second-request-process-both-more-streamlined-more-rigorous-during-unprecedented-merger-wave)).

### 5.5 Privilege screen and names legend

Sources: [Purview privilege detection](https://learn.microsoft.com/en-us/purview/ediscovery-attorney-privilege-detection),
Relativity aiR for Privilege pages ([Entities](https://help.relativity.com/RelativityOne/Content/Relativity/aiR_for_Privilege/Entities.htm),
[Known items](https://help.relativity.com/RelativityOne/Content/Relativity/aiR_for_Privilege/Known_items.htm),
[Confirm Privilege Status](https://help.relativity.com/RelativityOne/Content/Relativity/aiR_for_Privilege/Confirm_Privilege_Status_annotation.htm);
all returned 404 to direct reading, so wording is from search excerpts),
[Zhang et al. 2025](https://arxiv.org/abs/2512.08073).

1. **Build the attorney list.** Purview takes a CSV of attorney emails and sets HasAttorney and
   IsPrivilege. aiR for Privilege Known Attorneys need Email Address, Full Name and Role, optional start
   and end dates of the legal role, and one record per address for a person with several.
2. **Map onto entities.** Annotators mark entities Legal Role (privilege conferring) or Not Legal Role
   (neutral); a Privilege Breaker annotation on a domain makes every entity with an alias in that domain
   a breaker.
3. **Screen.** Documents with an attorney participant or domain go to a privilege team.
4. **Iterate.** New attorney names found in review are added and the screen rerun.
5. **Log.** The privilege log lists author and recipients for each withheld document; the people in it
   need affiliations and lawyer status (names-legend sources were only seen as search excerpts and are
   not cited).
6. **Graph as algorithm input.** Zhang, Qin and Huber-Fliflet (arXiv, December 2025) build a directed
   people network from headers, label counsel from signatures and propagate scores from counsel to rank
   likely privileged communications. The abstract gives no dataset size or metrics.

### 5.6 Internal or regulatory investigation: content first, then people

Sources: [Reveal FCPA case study](https://www.revealdata.com/success-stories/fcpa-compliance-audit),
[Brainspace Conversations](https://docs.revealdata.com/brainspace/docs/conversations),
[Proofpoint blog](https://www.proofpoint.com/us/blog/compliance-and-archiving/uncovering-ediscovery-insights-through-data-visualization).

1. An auditor's description of suspected fraud frames the search.
2. Concept search on the topics; flag suspicious emails; build new concept searches from "key blocks of
   text from each communication".
3. Open the people graph on the hits to see who else participates; add persons of interest.
4. Open **Conversations** for chosen people: each dot is an email on a timeline, lines run from sender to
   recipients and forwards; "+number" adds excluded recipients; counters show displayable versus
   returned documents.
5. Check time: Proofpoint's timeline drills year > month > day (55,259 results to 123 on one day) and
   exposes dates with no data.
6. Save the search, tag emails, export a metadata CSV; in Reveal, export the graph image.
7. Deliverables: findings memo, chronology of key emails, interview list. Forensic tools such as Autopsy
   add a "Snapshot Report" of the current graph and filters
   ([Autopsy](https://sleuthkit.org/autopsy/docs/user-docs/4.18.0/communications_page.html)).

### 5.7 Receiving party: from a load file to a people graph

Sources: [GoldFynch](https://support.goldfynch.com/support/solutions/articles/21000004211-how-to-validate-and-qc-what-is-received-and-uploaded-from-a-load-file-production),
[Consilio](https://consilio.com/resource/ediscovery-deep-dive-6-key-questions-for-opposing-party-productions).

1. **Check the package** (DATA, IMAGES, NATIVES, TEXT folders) against the production specification or
   ESI agreement.
2. **Validate the .dat.** Confirm "the number of rows matches the expected number of documents
   produced"; spot-check BEGIN BATES, END BATES, CUSTODIAN, FILE EXT, EMAIL FROM; check "were values
   populated for those fields?" -- empty fields in re-produced records can overwrite existing values.
3. **Validate the .opt and Bates ranges.** Every document has an image reference; "no gaps in the Bates
   numbers"; gaps may be family attachments, multi-page documents, privilege withholdings or agreed
   exclusions; check whether the range follows the last production.
4. **Map fields** to the platform; request missing fields; extract header values that appear only on
   image faces.
5. **Group duplicates** by MD5 hash and family values if provided, and compare against already-coded
   records.
6. **Thread and normalize.** Run threading once text exists; run name normalization on the From/To/CC
   string fields (no native message headers are available).
7. **Build and read the people graph.** Whom did the producing party's custodians talk to, which
   outside domains appear, which expected pairs or date ranges are empty. Gaps feed deficiency letters
   and requests for missing data. (No source documents a receiving party's graph steps in detail; steps 6
   and 7 follow from the producing-side tools applied to produced fields.)

### 5.8 Fact extraction and chronologies (Relativity Case Strategy)

Sources: [LawNext, January 2026](https://www.lawnext.com/2026/01/relativity-launches-air-for-case-strategy-to-extract-and-organize-key-facts-using-generative-ai.html);
Relativity help on [Creating a fact chronology](https://help.relativity.com/RelativityOne/Content/Relativity/aiR_for_Case_Strategy/Creating_a_fact_chronology.htm),
[witness summaries and deposition outlines](https://help.relativity.com/RelativityOne/Content/Relativity/aiR_for_Case_Strategy/Creating_witness_summaries_and_deposition_outlines.htm)
and [overview](https://help.relativity.com/RelativityOne/Content/Relativity/aiR_for_Case_Strategy/aiR_for_Case_Strategy.htm)
(the help pages returned 404 to direct reading; wording is from search excerpts).

1. **Set up the case.** Create a Fact Chronology; enter "People and Aliases": names and aliases of key
   individuals with role and affiliations; describe "What are you trying to prove?". People need not be
   listed to be found, but loosely similar name variants may be missed unless given as aliases.
2. **Run extraction** on up to 5,000 documents per job (LawNext). Each fact gets a primary fact date, a
   fact name and type, related issues, associated individuals and organizations (the aiR Entities
   field), a document summary and a citation to source text; it is tagged helpful or harmful and scored
   1 to 4 with a rationale. Duplicate facts are consolidated.
3. **Review the chronology** in a timeline that groups facts by issue (a Fact Navigator page also exists).
4. **Generate witness summaries and deposition outlines.** A witness must appear in a fact's aiR Entities
   field for that fact to be used.

Relativity announced general availability on January 12, 2026 (LawNext); a Relativity press-release
headline calls the solution "Now Standard in RelativityOne" (page timed out on direct reading). The
structure is people x facts x issues x documents x dates -- a multipartite graph with a timeline. It
competes with the people graph for "who are the key players", but no source shows whether practitioners
now open the communication graph less.

### 5.9 Chat and insider-risk data

Sources: [Relativity short message workflow](https://help.relativity.com/RelativityOne/Content/System_Guides/Relativity_Short_Message_Format/Short_message_investigative_workflow.htm),
[Purview data risk graph](https://learn.microsoft.com/purview/insider-risk-management-data-risk-graph).

1. Convert Teams, Slack, Google Chat and Cellebrite exports to RSMF; slice dense conversations into
   12- or 8-hour documents.
2. The people graph reads RSMF header participants: "Visualizations are based on what is in the header
   and not the frequency of messages sent." A 200-person channel draws as a clique.
3. Reviewers code individual messages; message coding does not propagate to the document.
4. Purview's insider-risk data risk graph links users, files and activities for one alert, shows names
   "even if pseudonymization is enabled", and is being retired on November 24, 2026 in favor of a
   tabular Activity explorer.

## 6. Data

| Property                | Detail                                                                                                                                                                                                                                                                                                                                                                                 |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sources                 | Exchange/Microsoft 365, Gmail, PST/MBOX, Teams, Slack, Google Chat, mobile extractions, archives; for the receiving side, production volumes                                                                                                                                                                                                                                           |
| Formats                 | Native mail; load files (.dat metadata with From, To, Cc, Bcc, Date Sent, Custodian, MD5; .opt image cross-reference); RSMF; generated fact tables                                                                                                                                                                                                                                     |
| Matter sizes            | EDRM Enron v2: 151 custodians, 1,227,255 emails, 493,384 attachments ([EDRM 2010](https://edrm.net/2010/11/edrm-and-zl-technologies-launch-new-enron-email-data-set/)); no other per-matter size source read directly                                                                                                                                                                  |
| Full people-graph scale | SNAP email-Enron, built from about 0.5 million Enron emails: 36,692 address nodes, 183,831 undirected edges, largest component 33,696 nodes (91.8 percent) ([SNAP](https://snap.stanford.edu/data/email-Enron.html)). Normalization "can create many thousands of entities and aliases" (Relativity). So the graph behind a matter is tens of thousands of nodes before entity merging |
| Graph sizes drawn       | Relativity largest 500 entities by default; Reveal 100 nodes and 1,000 links by default; Connection Map top 500 relationships with the total shown; Everlaw top 10 names by default, 25 total name nodes maximum. Whether these caps are rendering limits or readability choices: no source found either way                                                                           |
| Thread tree size        | One thread group: typically tens of messages (no source gives a distribution)                                                                                                                                                                                                                                                                                                          |
| Identifiers             | Display names, SMTP and Exchange addresses, chat handles, phone numbers; in productions, delimited strings. Problems: many addresses per person, shared mailboxes, distribution lists, generic names, same name for different people                                                                                                                                                   |
| Graph shapes            | People graph: directed multigraph, one edge per document per recipient, typed To/Cc/Bcc, weighted, timestamped, bipartite person-document underneath, aggregation person > address > domain. Thread tree: time-ordered tree or DAG of messages with placeholder nodes and per-node states. Case facts: people-fact-issue-document multipartite graph with dates                        |
| Sensitivity             | Privileged and confidential; protective orders; per-user document security                                                                                                                                                                                                                                                                                                             |

### 6.1 What the people graph can and cannot see

- **It is a custodial sample.** The graph is the union of the mailboxes that were collected. An edge
  between two non-custodians appears only when a custodian was also on the message. SNAP notes the same
  effect for Enron: non-Enron addresses "appear only as sources and sinks". Degree and centrality are
  therefore inflated for custodians, and "key player" rankings partly restate the collection decision.
- **Bcc is visible only from the sender's side.** "Bcc recipients are stored in the message in the
  sender's mailbox, but not included in headers of the message delivered to recipients." A Bcc edge
  exists only if the sender's mailbox was collected.
- **Distribution-list membership depends on holds.** Expanded membership is stored "in the sender's
  mailbox" and only after the mailbox "is placed on In-Place Hold or Litigation Hold, or assigned to a
  Microsoft Purview retention policy"; "If you search the recipient's mailbox, messages sent to
  distribution groups will not show the expanded list"; up to 10,000 members, 25 nesting levels
  ([Microsoft Learn](https://learn.microsoft.com/en-us/purview/ediscovery-preserve-bcc-and-expanded-distribution-group-recipients)).
  That page now applies only to classic eDiscovery for 21Vianet-hosted tenants, since Microsoft retired
  classic eDiscovery on August 31, 2025; the storage behavior it describes is Exchange Online's.
- **Deduplication changes who appears to hold a message.** Global deduplication keeps one copy; other
  holders survive only in an All Custodians field if it was mapped.
- **Threading can hide recipients.** Inclusive-only views may drop recipient variants (Cooley 2023).
- **Productions are partial by design.** Privilege withholdings, agreed exclusions and missing fields
  remove edges the receiving side cannot restore.

## 7. Analysis methods

- **Counts first.** Sent, received, total per entity and per pair; top-N lists.
- **Tree reading.** Inclusive versus non-inclusive, missing placeholders, coding-color consistency
  across a branch.
- **Grouping.** Unnamed community detection drives same-color clusters; users do not choose the
  algorithm.
- **Centrality from a menu.** Betweenness, PageRank, eigenvector with in/out variants (Connection Map).
  No source shows reviewers interpreting the numbers, and none shows any platform correcting them for
  partly observed non-custodians (Section 6.1).
- **Filters as analysis.** Role, minimum connections, recipient count, date range, concept, sentiment.
- **Absence.** Empty pairs and dates without data, for spoliation checks and receiving-side gap
  analysis.
- **Algorithmic people graphs.** Score propagation from counsel nodes for privilege (Zhang et al.);
  knowledge-graph link prediction for relevance (DISCOG, [arXiv 2405.19164](https://arxiv.org/abs/2405.19164));
  a survey of over forty communication-analysis systems found weak support for group dynamics and
  privacy ([Fischer et al.](https://arxiv.org/abs/2106.14802)).
- **Fact chronologies.** Generative extraction of people, facts and issues with dates (Section 5.8).
- **Validation habits.** Verify entities against their documents; reconcile graph counts with list
  counts; compare load-file row counts and Bates ranges.

## 8. Outputs and collaboration

- **Primary outputs are lists and coded documents**: custodian lists, saved searches, batches, coded
  branches, privilege logs, chronologies, witness outlines, deficiency letters, productions.
- **Graph exports exist but vary.** Reveal documents "Export the Communications graph as an image" and a
  Communications Data table ("Communicator Name and number of Communications") that "may be exported to
  CSV format" ([Reveal](https://docs.revealdata.com/docs/communications)). Everlaw shares and assigns the
  document sets behind a selection. Relativity's widget has no documented export. Pictures appear in ECA
  memos; no source read directly shows a review-platform graph used as a court exhibit.
- **Defensibility.** Entity merges write audits; search conditions produced by the graph are saved. No
  source documents an audit record of the graph view itself (which nodes were hidden, which cap
  applied, which custodians' data the edges came from).

## 9. Tools landscape and pain points

| Tool                                     | Graph features                                                                                                                               | Notable limits                                                                                                                        |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Relativity / RelativityOne               | Email Thread Visualization; Communication Analysis widget; name normalization; sentiment rings; aiR for Privilege; Case Strategy             | Missing placeholders that may be false; people graph needs normalization, top 500 by default, top segment only, no unmerge, no export |
| Everlaw                                  | Communication Visualizer (Names, Emails, Domains; exploration and selection modes)                                                           | 10 names by default, 25 total name nodes maximum; help pages not machine-readable                                                     |
| Reveal / Brainspace                      | Communications (image and CSV export), Connection Map (centralities, six layouts, total pairs shown), Conversations timeline, People Manager | Defaults 100 nodes and 1,000 links without a stated total                                                                             |
| Nuix, Proofpoint Discover                | Communication network and timeline views                                                                                                     | Vendor descriptions only                                                                                                              |
| Microsoft Purview                        | Attorney-list privilege detection; insider-risk data risk graph                                                                              | Data risk graph retired November 2026                                                                                                 |
| Load-file viewers (GoldFynch and others) | Row, field and Bates validation                                                                                                              | No graph; receiving side builds people views from string fields                                                                       |

Cross-cutting pains: wrong entities silently distort every count; blast emails and distribution lists
create false hubs; graph and list counts disagree when duplicates or inclusive-only views are used;
caps hide people, and only Connection Map states the total; chat channels appear as cliques; rankings
favor collected custodians; thread placeholders can be artifacts; graph views export inconsistently
and carry no record of how they were produced.

**Adversarial note on fit.** These users stay inside their review platform under document-level
security and will not export privileged data to a separate browser tool. Graphty reaches them mainly
through review-platform builders embedding graphty-element, secondarily through analysts who export an
entity edge list or a produced load file. Read the requirements as what an embeddable component must do
for those builders.

## 10. Requirements implied

No designloom persona today is a review attorney, litigation-support analyst, receiving-party analyst
or investigator. `intelligence-analyst` and `fraud-analyst` with the Path Investigation, Criminal
Network Analysis, Findings Communication and Data Import and Validation workflows cover ego networks,
node merging, filters and export, but none treats the graph as a facet of an external record list, none
counts documents rather than edges, and none handles aliases, permissions, caps, message trees or
observation bias.

| #   | Requirement                                                                                                                                                                                                                      | Priority | Covered today?                                  |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ----------------------------------------------- |
| R1  | **Two-way link to an external record list**: a selection emits a neutral query descriptor (sender-in, recipient-in, pair, role filter, or record IDs); when the host's record set changes, the graph rebuilds                    | Must     | Not covered                                     |
| R2  | **Entity and alias layer**: many identifiers per node; merge, assign, remove, **unmerge**, survivor rules, exclusion list; every change audited and reversible                                                                   | Must     | Partly (node merging)                           |
| R3  | **Edges derived from records with explicit counting rules**: one record = one communication per sender-recipient pair; top segment or all segments; dedupe by record key; edge count shown as records                            | Must     | Not covered                                     |
| R4  | **Permission-scoped graph**: the host supplies the visible record set; nodes only in hidden records are dropped and counts recomputed                                                                                            | Must     | Not covered                                     |
| R5  | **Top-N cap reported as "showing N of M"** for nodes and relationships, adjustable (as Connection Map shows total pairs and Relativity draws the top 500). An aggregated "others" node is optional and unverified in any product | Must     | Partly (filtering) -- totals not reported       |
| R6  | **Typed multi-edges with role filter** (To/Cc/Bcc or chat roles), thickness by volume, direction shown                                                                                                                           | Must     | Partly                                          |
| R7  | **Noise controls**: minimum connections, maximum recipients per record, hide detached nodes                                                                                                                                      | Must     | Partly (filtering)                              |
| R8  | **Aggregation levels**: person / address / domain / organization without re-import                                                                                                                                               | Should   | Not covered                                     |
| R9  | **Pair isolation and drill-to-records** with sent/received/total on hover                                                                                                                                                        | Must     | Partly                                          |
| R10 | **Classification styling and glyphs**: custodian, non-custodian, attorney, privilege conferring or breaking, in search criteria, flagged; legend                                                                                 | Must     | Partly                                          |
| R11 | **Record-level score overlays**: sentiment, concept counts, privilege likelihood                                                                                                                                                 | Should   | Not covered                                     |
| R12 | **Automatic grouping with stable colors**, select group and select neighbors                                                                                                                                                     | Should   | Covered                                         |
| R13 | **Directional centralities and seeded score propagation**                                                                                                                                                                        | Should   | Partly                                          |
| R14 | **Timeline linked to the graph** with year > month > day drill; gaps visible                                                                                                                                                     | Should   | Partly                                          |
| R15 | **Channel-aware chat import**: no clique by default; weight by messages                                                                                                                                                          | Should   | Not covered                                     |
| R16 | **Pseudonymized display mode** with stable pseudonyms through export                                                                                                                                                             | Should   | Not covered                                     |
| R17 | **View provenance**: export the view's parameters (scope, caps, filters, merges, hidden nodes, contributing custodians) with the image or edge list. This is the real gap; no product documents it                               | Should   | Partly (view bookmarks)                         |
| R18 | **Image and table export** (entity, aliases, classification, counts) -- matching Reveal's existing PNG and CSV practice for memos and privilege-log legends                                                                      | Must     | Partly (data export)                            |
| R19 | **Time-ordered message tree layout**: left-to-right by sent time, replies and forwards as branches, a DAG when a message has two parents                                                                                         | Must     | Not covered (tree layouts are not time-ordered) |
| R20 | **Placeholder nodes** for inferred missing messages, styled distinctly and marked as inferred                                                                                                                                    | Must     | Not covered                                     |
| R21 | **Per-node state styling** from record fields (inclusive, duplicate spare, coding value, coding conflict badge) through style layers                                                                                             | Must     | Partly (data-driven styles)                     |
| R22 | **Branch selection** (range-select along a path, include attachments and duplicates) that emits record IDs for the host's mass edit                                                                                              | Must     | Not covered                                     |
| R23 | **Edge provenance**: each edge records which custodian's copy (or which production) produced it; custodian versus non-custodian applied as a ranking filter; a caution flag on centrality computed over partly observed nodes    | Must     | Not covered                                     |
| R24 | **Graph from delimited recipient strings**: build a people graph from .dat or CSV From/To/CC fields, tolerate missing fields, no native message needed                                                                           | Must     | Partly (CSV edge import only)                   |
| R25 | **People-fact-issue view**: multipartite graph of people, facts, issues and documents linked to a timeline, filtered by issue or person                                                                                          | Should   | Not covered                                     |

Main gaps: R1 to R5, R19 to R24. Under the repository's architecture rules, alias merging,
record-to-edge derivation, permission scoping, caps with totals, tree layout, branch selection and edge
provenance belong in graphty-element as neutral data and events; wording, panel layout and how a host
maps descriptors to its own search syntax belong to the consuming application.

## 11. Case-law citation networks: legal network analysts

Sections 1 to 10 cover graphs built from communications. This section covers a separate legal
population whose graph is built from court decisions citing earlier decisions. The users, data
sources and analysis steps differ from eDiscovery; the methods overlap with bibliometric citation
analysis (bibliometrics-and-science-mapping.md).

### 11.1 Population

**Who.** Empirical and computational legal scholars (law faculty, political scientists who study
courts, PhD students), legal informatics researchers, and at the edge legal researchers in practice
who meet a citation map inside a commercial research service.

**How large.** No source counts the people. The proxies found are small:

- The German Law Journal ran a special section on network analysis and legal scholarship, prompted
  by Derlen and Lindholm's network analysis of the Court of Justice of the European Union (CJEU).
  Its introduction takes "a broader perspective" on "the utility and the limits of network analysis
  for legal scholarship generally" and lists the strand's anchor works: Fowler et al. (2007) on the
  US Supreme Court, Lupu and Voeten (2012) on the European Court of Human Rights (ECtHR), Gelter
  and Siems (2013) on cross-citation between European supreme courts, Lettieri et al. (2016) on EU
  case law and Whalen (2016) on the promises and challenges of legal network analysis
  ([Petersen and Towfigh, German Law Journal 18(3), 2017](https://www.cambridge.org/core/journals/german-law-journal/article/network-analysis-and-legal-scholarship/E8C3D0AB58A01DD35C4B5DAC4893ACDF)).
- JURIX, the main European legal informatics conference, received 90 submissions in 2024 and
  accepted 21 long and 17 short papers plus 16 or 17 posters (sources differ); only some are about
  citation networks (search excerpts of the
  [JURIX 2024 proceedings listing](https://ebooks.iospress.nl/volumearticle/70992) and
  [conference site](https://jurix2024.law.muni.cz/); not read directly).
- Frontiers in Physics published several case-law network papers in 2021 and 2022 (Soh; Adusumilli
  et al., below), from physics and complex-systems groups rather than law schools.

So this is a specialist academic community, probably hundreds of active researchers worldwide, not
thousands; the "hundreds" is an inference from the venues above, not a count.

**Do practitioners use citation graphs beyond citator lists?** Partly, and only inside their research
service:

- LexisNexis added Ravel View to Lexis Advance in June 2018. It maps "the top 75 results from a
  user's case law search"; "The bigger the circle, the more frequently that case has been cited by
  other cases"; "The vertical axis shows the Supreme Court at the top, followed by federal and state
  courts below"; connecting lines use "familiar Shepard's colors for positive and negative
  treatment"; and "By mapping cases across time, lawyers can identify trends"
  ([LexisNexis press release, 2018](https://www.lexisnexis.com/community/pressroom/b/news/posts/lexisnexis-launches-data-visualization-to-enhance-its-flagship-online-legal-research-platform-lexis-advance)).
  A LexisNexis how-to guide (search excerpt only) says it is not the default view, and that hovering
  a link shows the citing language
  ([Ravel View how-to](https://www.lexisnexis.com/pdf/lexis-advance/Ravel-View-How-To-Literature.pdf)).
- Westlaw KeyCite shows a case's direct appellate history as a graphical view beside the list of
  linked documents; citing references stay a filtered list (by jurisdiction, reported status,
  headnote) (search excerpt of
  [Thomson Reuters help](https://www.thomsonreuters.com/en-us/help/westlaw-precision/tools/access-keycite-for-cases)).
- On CanLII, "indegree centrality and PageRank scores of caselaw within the network are effective
  predictors" of how often a case is viewed, and "roughly 19% of Canada Supreme Court cases remain
  important despite the passage of time" while other courts keep fewer than 3% in regular citation
  ([Neale, Journal of Open Access to Law, 2013](https://ojs.law.cornell.edu/index.php/joal/article/view/20)).
  Network measures track what practitioners open, but no source shows practitioners building or
  analyzing a citation graph themselves, or how often Ravel View is opened.

### 11.2 Personas

**Legal citation network scholar (id: `legal-citation-network-scholar`).** A law or political
science researcher who builds the citation network of one court (or one doctrine) from a court
database, ranks precedents by authority, follows how a line of case law developed, and writes it up
for a law review or a computational journal. Codes in Python (the studies read used NetworkX and
NetworKit). Evidence: the works in 11.1 and 11.4.

**Case-law research attorney (id: `case-law-research-attorney`), weak evidence.** A litigator or law
librarian who opens a citation map of a search result to see which cases are central, which court
decided them and when, and whether later treatment was positive or negative, then reads the cases.
The only evidence is the products themselves (Ravel View, KeyCite's graphical history); no source
describes this user's own steps or frequency.

### 11.3 Data

| Source                                       | What it gives                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Size seen                                                                                        |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| CourtListener (Free Law Project), US         | Opinions Cited/Citing API: filter by `citing_opinion` for what an opinion cites and `cited_opinion` for what cites it, with a `depth` (times cited within the opinion); bulk export of the citation graph (monthly in the v3 docs, quarterly in the v4 docs); the docs warn that not every parallel citation is known (search excerpts of [v4 citations API](https://wiki.free.law/c/courtlistener/help/api/rest/v4/citations) and [v3](https://www.courtlistener.com/help/api/rest/v3/citations)) | Federal subset: 1,317,233 cases and 11,451,351 citations, about 1926 to 2020 (Adusumilli et al.) |
| HUDOC, ECtHR                                 | Case metadata including a free-text field of cited Strasbourg case law; open Python libraries build a nodes and edges CSV from it, with a list of references they could not resolve (search excerpt of [echr-extractor](https://pypi.org/project/echr-extractor))                                                                                                                                                                                                                                  | Article 8 corpus: 9,777 cases, 39,582 citation links (Mohammadi et al.)                          |
| EUR-Lex and the CELLAR SPARQL endpoint, CJEU | Case metadata and case-to-case citations by CELEX number or ECLI; open toolkits export a directed citation graph (search excerpt of [cjeu-py](https://pypi.org/project/cjeu-py/)); some researchers parse citations from judgment text with regular expressions instead                                                                                                                                                                                                                            | Consumer-law subset: 446 cases, 1980 to October 2023 (Jiang et al.)                              |
| CanLII, Canada                               | Citations among Canadian decisions on CanLII (Neale)                                                                                                                                                                                                                                                                                                                                                                                                                                               | Not stated in the abstract                                                                       |
| Published research edge lists                | Fowler et al.'s US Supreme Court edge list joined with Spaeth database issue areas; Singapore Court of Appeal citations with Singapore Law Reports subjects (Soh)                                                                                                                                                                                                                                                                                                                                  | US Supreme Court 26,681 majority opinions 1791 to 2005 (Fowler et al.)                           |

Node attributes that matter: decision date, court, court level, jurisdiction or circuit, subject or
issue area, and an identifier (CELEX, ECLI, application number, reporter citation). Edge attributes:
date (from the citing case), times cited within the opinion, and in commercial citators a treatment
(followed, distinguished, overruled). The graph is directed and almost acyclic, since decisions cite
earlier decisions; it is sparse and fragmented: in the federal network 299,973 of the 1,317,233
cases are isolated, and the largest component in the Article 8 network holds 7,234 of 9,777 cases
(about 74 percent).

### 11.4 Workflows and analysis steps

**A. Rank precedents by authority, then check how the ranking moves over time.**

1. Pull one court's decisions and their citations (CourtListener bulk file, HUDOC metadata, CELLAR).
2. Resolve each citation to a decision; count and keep a list of citations that do not resolve.
3. Join court, date and subject attributes.
4. Compute in-degree, PageRank and hub and authority (HITS) scores. Fowler et al. built a network of
   26,681 majority opinions (1791 to 2005) and proposed centrality measures that identify the most
   legally relevant precedents "at any point in time", validated by how well they predict later
   citations by state courts, the Courts of Appeals and the Supreme Court itself (abstract, search
   excerpt of [Political Analysis 15:324](https://www.cambridge.org/core/journals/political-analysis/article/network-analysis-and-the-law-measuring-the-legal-importance-of-precedents-at-the-us-supreme-court/D9B2F13BE2594E1527780AAFDD6BF164)).
   Soh combines hub and authority scores, an exponential time decay and subject relevance,
   including a subject-sensitive PageRank
   ([Soh, Frontiers in Physics, 2021](https://frontiersin.org/articles/10.3389/fphy.2021.665563/full)).
   Hub and authority scores are Kleinberg's HITS: a decision that cites many authoritative
   decisions is a good hub, and one cited by many good hubs is a good authority, so every decision
   gets two scores from one run. Soh says "we use Kleinberg's authority and hub scores" and includes
   both score types in the model; he lets the power iteration run "for a maximum of 300 power
   iterations, three times the package default", modifies the package "to return prevailing scores
   if convergence is not achieved", and in one model recomputes the scores "within the subgraph of
   nodes sharing at least one subject with the citer" (sections 2.3 and 2.4 of the same paper).
5. Recompute the ranking on the network as it stood at chosen dates (the graph truncated to decisions
   up to each date) and compare. Neale reads citation life spans the same way: most Canadian cases
   stop being cited after a span that depends on jurisdiction.
6. Compare scores across court levels. In the federal network "the striking predominance of Supreme
   Court case decisions" holds among the top 1,000 nodes, and ArticleRank scaling exponents fall
   with court level: district 4.07, appellate 3.30, Supreme Court 2.88
   ([Adusumilli et al., Frontiers in Physics, 2022](https://www.frontiersin.org/articles/10.3389/fphy.2021.695219)).
7. Read the top cases against doctrine; export the ranked table and a figure. Sadl and Olsen argue
   the method should give doctrinal study "a stable and complete quantitative basis for a further
   in-depth study of case law"
   ([Leiden Journal of International Law, 2017](https://www.cambridge.org/core/product/CC01D5633773395798E64ECBC6FC0384/core-reader)).

**B. Find and group the case law on one provision.** Mohammadi et al. collected 9,777 ECtHR Article 8
cases from HUDOC, fitted a 17-topic LDA model to the texts, ran Louvain community detection on the
citation network, and then weighted each citation by the cosine similarity of the two cases' topic
vectors before running Louvain again; "our combined (text and citation-based) approach provides the
best results in finding and grouping case law", evaluated against 198 hand-labeled eviction cases
([arXiv 2401.16429](https://arxiv.org/html/2401.16429v1)). Steps: import the network, keep the
largest component, attach a per-case topic vector, weight edges by similarity, detect communities,
inspect the community that holds known seed cases, list its members.

**C. Trace how a line of case law developed (main path).** Jiang, Breskaya and van Dijck applied main
path analysis to 446 CJEU consumer-rights cases from 1980 to October 2023: five time slices, the top
three key-route main paths per slice, merged into one overlay network; the paths fell into five
themes (unfair terms, equivalent effect, comparative advertising, free movement of goods, product
liability), and the authors note the method's limits for "comprehensive, representative results in
large networks"
([Artificial Intelligence and Law, 2026](https://eprints.whiterose.ac.uk/id/eprint/243421/)). This is
the bibliometric main path workflow (W56) with legal attributes, plus a per-slice merge.

**D. Map a search result by court and time (practice).** As in Ravel View: take the top results of a
case search, place each case by decision date and court level, size by citation count, draw
citations colored by treatment, hover a link to read the citing sentence, click a case to bring it to
the top of the list.

**How much is reused from bibliometrics.** Steps A4, B and C reuse the citation-network methods of
bibliometrics-and-science-mapping.md: centralities, community detection, time slicing, main paths
and a year axis. What is new is legal: the data sources and identifier resolution (A1, A2), the court
level and jurisdiction attributes (A3, A6, D), authority as of a date (A5), treatment-typed edges (D)
and HITS, which the bibliometric workflows do not use.

**Is HITS a legal measure or a general one?** A general directed-graph measure that court citation
research favors more than other citation research does. Xu, Mariani, Lu and Medo compared 17 ranking
metrics on paper citations (APS and high-energy physics) and US patent citations and found "the
identification rate values of the HITS authority score are 0.143 (APS), 0.116 (HEP), and 0.054
(PAT)", well behind age-corrected PageRank; they contrast "the poor performance of HITS here" with
the praise it gets in court-citation studies, and suggest "court decision citation networks may be
intrinsically more favorable to HITS"
([Xu et al., Journal of Informetrics, 2020](https://arxiv.org/html/2001.05414)). So the bibliometric
and patent workflows have no evidence-backed reason to adopt it, while flow networks do: the
migration-flow workflow already computes "eigenvector, PageRank and hub and authority scores on raw
weights". HITS needs direction (hub is the outgoing side, authority the incoming side), returns two
values per node, and has its own options (iteration cap, tolerance, normalization, edge weight), so it
is its own measure rather than a setting of PageRank or eigenvector centrality. graphty-element
already ships it (`graphty-element/src/algorithms/HITSAlgorithm.ts`, publishing a combined score plus
separate hub and authority values, and refusing undirected input); the gap is that it is not
recorded as a capability any workflow can require.

**Does the court hierarchy need a layered layout?** Yes for D, and usefully for A6. The one
practitioner citation map found puts court level on the vertical axis and time across, rather than
using a force layout; a force layout drawn from citations alone mixes levels, and the federal-network
finding that centrality follows court level is easiest to see with levels as bands. The research does
not show scholars asking for it: the scholarly papers report tables and force or community pictures.

### 11.5 Requirements implied

| #   | Requirement                                                                                                                                                                                                                      | Priority | Covered today?                                                                             |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------ |
| L1  | **Court citation import**: build a directed graph from a court database export or API (CourtListener, HUDOC metadata, CELLAR), keeping date, court, level and identifier, and reporting unresolved citations as a count and list | Should   | Partly (generic CSV edge import and import report)                                         |
| L2  | **Authority measures**: in-degree, PageRank and hub and authority scores on a directed citation graph                                                                                                                            | Should   | Yes (degree, PageRank and HITS ship in graphty-element; HITS has no capability record yet) |
| L3  | **Authority as of a date**: compute a measure on the graph truncated to decisions up to a date, and as a series over dates                                                                                                       | Should   | Partly (cumulative windows are planned)                                                    |
| L4  | **Court-by-time layout**: decision date on one axis, court level as bands on the other, citations drawn between them                                                                                                             | Should   | Partly (attribute axes and tiers are planned)                                              |
| L5  | **Treatment-typed citations**: edges carry a treatment value, colored and filterable                                                                                                                                             | Could    | Partly (typed edges and edge encoding)                                                     |
| L6  | **Edge weights from node vectors**: weight each existing edge by the cosine similarity of a vector column on its two nodes, then detect communities                                                                              | Could    | Not covered                                                                                |
| L7  | **Main paths per time slice, merged**: run main path analysis on each slice and overlay the results                                                                                                                              | Could    | Partly (main path analysis is planned)                                                     |

Priorities are Should and Could because the population is small and academic. Under the
repository's rules, the import, measures, layouts and edge weighting belong in graphty-element; the
names a reader sees for courts and treatments belong to the application.

## 12. Sources

Read directly:

- https://help.relativity.com/RelativityOne/Content/Relativity/Analytics/Email_thread_visualization.htm -- thread tree layout, node states, missing placeholders, highlight field, branch mass edit
- https://help.relativity.com/RelativityOne/Content/Relativity/Analytics/Inclusive_emails.htm -- inclusive, non-inclusive, duplicate spare definitions
- https://help.relativity.com/RelativityOne/Content/Relativity/Analytics/Communication_analysis.htm -- widget steps, largest 500 by default, Bcc filter, no export
- https://help.relativity.com/RelativityOne/Content/Relativity/Analytics/Name_normalization.htm -- parser rules, 500-entity document limit
- https://help.relativity.com/Server2024/Content/Relativity/Analytics/Best_practices_for_name_normalization.htm -- priority custodian first, triage categories, verification
- https://help.relativity.com/Server2025/Content/System_Guides/User_quick_reference/Analytics/Name_normalization.htm -- "many thousands", "not perfect", not practical to verify every entity
- https://help.relativity.com/Server2025/Content/Relativity/Analytics/Name_normalization_results.htm -- merge 50, assign 500, survivor rules, no unmerge
- https://help.relativity.com/RelativityOne/Content/Relativity/Processing/Deduplication_considerations.htm -- global and custodial deduplication
- https://help.relativity.com/RelativityOne/Content/System_Guides/Relativity_Short_Message_Format/Short_message_investigative_workflow.htm -- chat workflow
- https://docs.revealdata.com/docs/communications -- caps, Export Graph image, Communications Data CSV
- https://docs.revealdata.com/brainspace/docs/communications -- Brainspace settings, merge, Add to Query
- https://docs.revealdata.com/brainspace/docs/people-manager -- people and aliases
- https://docs.revealdata.com/brainspace/docs/conversations -- conversation timeline
- https://ai-help.revealdata.com/en/Connection-Map.html -- centralities, layouts, total pairs, C and S glyphs
- https://www.everlaw.com/blog/2023/03/20/introducing-communication-visualizer/ -- modes, key players, share and assign
- https://learn.microsoft.com/en-us/purview/ediscovery-preserve-bcc-and-expanded-distribution-group-recipients -- Bcc and distribution-list storage, classic retirement
- https://learn.microsoft.com/en-us/purview/ediscovery-attorney-privilege-detection -- attorney list
- https://learn.microsoft.com/purview/insider-risk-management-data-risk-graph -- data risk graph retirement
- https://snap.stanford.edu/data/email-Enron.html -- Enron graph size and component
- https://edrm.net/2010/11/edrm-and-zl-technologies-launch-new-enron-email-data-set/ -- EDRM Enron v2 counts
- https://edrm.net/?p=163681 -- Relativity users and organizations
- https://www.lawnext.com/2026/01/relativity-launches-air-for-case-strategy-to-extract-and-organize-key-facts-using-generative-ai.html -- Case Strategy launch and fact fields
- https://consilio.com/resource/ediscovery-deep-dive-6-key-questions-for-opposing-party-productions -- receiving-party validation
- https://support.goldfynch.com/support/solutions/articles/21000004211-how-to-validate-and-qc-what-is-received-and-uploaded-from-a-load-file-production -- load file QC steps
- https://www.ftc.gov/enforcement/competition-matters/2021/09/making-second-request-process-both-more-streamlined-more-rigorous-during-unprecedented-merger-wave -- Second Request custodian and tool disclosures
- https://abovethelaw.com/2018/06/email-threading-one-of-the-most-overlooked-gems-in-ediscovery/ -- practitioners on threading use and limits
- https://www.morrisjames.com/?p=5989 -- DSBA Bar Journal on thread-centered review
- https://uklitigation.cooley.com/threading-carefully/ -- inclusive emails ignoring recipients
- https://www.ontrack.com/en-us/press/kroll-ontrack-streamlines-the-review-of-communication -- Advanced Thread View
- https://cdslegal.com/insights/demystifying-ediscovery-using-communications-analysis/ -- practitioner framing (vendor-affiliated)
- https://aceds.org/?p=585353 and https://revealdata.com/blog/lets-get-visual-supercharging-ediscovery-with-data-visualization -- Casey 2022 on custodian prioritization
- https://www.revealdata.com/success-stories/fcpa-compliance-audit -- FCPA workflow
- https://www.proofpoint.com/us/blog/compliance-and-archiving/uncovering-ediscovery-insights-through-data-visualization -- timeline drill
- https://revealacademy.revealdata.com/courses/brainspace-communication-analysis -- training course
- https://relativitydev.github.io/relativity-trace-documentation/docs/administrator_guide/data_flow/detailed_data_flow.html -- surveillance workflow
- https://sleuthkit.org/autopsy/docs/user-docs/4.18.0/communications_page.html -- forensic graph snapshot report
- https://arxiv.org/abs/2512.08073, https://arxiv.org/abs/2405.19164, https://arxiv.org/abs/2106.14802 -- research
- https://www.ibisworld.com/united-states/industry/e-discovery-consulting-services/5420/ -- market size

Not readable directly (403, 404, timeout or binary PDF); claims taken from search excerpts of the page
itself and labeled in the text:

- https://support.everlaw.com/hc/en-us/articles/17106075039771 -- default 10 names, 25-node total, neighbor formula
- https://support.everlaw.com/hc/en-us/articles/29564010077083-Entity-Management -- entity merge and shared addresses
- https://help.relativity.com/RelativityOne/Content/Relativity/Processing/Processing_duplication_workflow.htm -- All Custodians field
- https://help.relativity.com/RelativityOne/Content/Relativity/aiR_for_Privilege/Entities.htm, .../Known_items.htm, .../Confirm_Privilege_Status_annotation.htm -- privilege roles and Known Attorneys
- https://help.relativity.com/RelativityOne/Content/Relativity/aiR_for_Case_Strategy/aiR_for_Case_Strategy.htm, .../Creating_a_fact_chronology.htm, .../Creating_witness_summaries_and_deposition_outlines.htm -- case setup and witness rules
- https://www.ftc.gov/system/files/attachments/merger-review/best_practices_for_merger_investigations_august_2015.pdf -- fewer than 35 custodians

Case-law citation networks (section 11), read directly:

- https://www.cambridge.org/core/journals/german-law-journal/article/network-analysis-and-legal-scholarship/E8C3D0AB58A01DD35C4B5DAC4893ACDF -- German Law Journal special section introduction and the strand's anchor works
- https://arxiv.org/html/2401.16429v1 -- ECtHR Article 8 network from HUDOC, topic-weighted community detection
- https://arxiv.org/abs/1501.05237 -- EU legislation network from the Official Journal (abstract)
- https://frontiersin.org/articles/10.3389/fphy.2021.665563/full -- Soh, hub and authority (Kleinberg HITS, 300-iteration cap, subject-local recomputation), time decay, subject-sensitive PageRank
- https://arxiv.org/html/2001.05414 -- Xu, Mariani, Lu and Medo, HITS weak on paper and patent citations, contrasted with court networks
- https://www.frontiersin.org/articles/10.3389/fphy.2021.695219 -- US federal case law from CourtListener, sizes and court-level scaling
- https://eprints.whiterose.ac.uk/id/eprint/243421/ -- main path analysis of CJEU consumer cases
- https://ojs.law.cornell.edu/index.php/joal/article/view/20 -- Neale, CanLII in-degree and PageRank predict views
- https://www.cambridge.org/core/product/CC01D5633773395798E64ECBC6FC0384/core-reader -- Sadl and Olsen, citation networks and doctrinal method (abstract)
- https://www.lexisnexis.com/community/pressroom/b/news/posts/lexisnexis-launches-data-visualization-to-enhance-its-flagship-online-legal-research-platform-lexis-advance -- Ravel View

Case-law citation networks, from search excerpts only (labeled in the text):

- https://www.cambridge.org/core/journals/political-analysis/article/network-analysis-and-the-law-measuring-the-legal-importance-of-precedents-at-the-us-supreme-court/D9B2F13BE2594E1527780AAFDD6BF164 -- Fowler et al. 2007 abstract
- https://wiki.free.law/c/courtlistener/help/api/rest/v4/citations and https://www.courtlistener.com/help/api/rest/v3/citations -- CourtListener citation API
- https://pypi.org/project/echr-extractor and https://pypi.org/project/cjeu-py/ -- HUDOC and CELLAR citation extraction tools
- https://www.lexisnexis.com/pdf/lexis-advance/Ravel-View-How-To-Literature.pdf -- Ravel View interaction
- https://www.thomsonreuters.com/en-us/help/westlaw-precision/tools/access-keycite-for-cases -- KeyCite graphical history
- https://ebooks.iospress.nl/volumearticle/70992 and https://jurix2024.law.muni.cz/ -- JURIX 2024 counts
