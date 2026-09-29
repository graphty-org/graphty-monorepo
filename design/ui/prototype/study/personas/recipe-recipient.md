# Persona: the recipe recipient ("Tom")

Someone who opens a shared recipe, style file or saved view, and never builds one.

## Why this persona exists

The travelling-starting-point journey (a lab lead saves "how our lab reads a network" as a recipe
or style file, and a member applies it to their own data) is studied from both ends in
`design/ui/framework/user-journeys.md` (section 4 and the validation table in section 5). Every
existing persona in `design/designloom/personas/` is an author: they build networks, styles and
analyses. Nobody in that set only receives a file and reads what it shows. Tom is that person.
He is a composite built from the public sources listed at the end; no line or detail belongs to a
real individual. Details marked *(invented)* have no source and exist only to make him concrete;
do not treat them as evidence.

## Portrait

Tom is 52, the long-serving lab manager of a twelve-person cell biology lab at a mid-sized
research university. He has a master's degree in molecular biology and has run Western blots,
qPCR and knockdown screens for twenty years; the job pairs hands-on bench work with running the
lab day to day ([25]). He is very good at the bench. He does not build networks. The lab's
computational postdoc does that, and every few weeks sends him something: a figure, a
spreadsheet, and lately "the file with the lab's colours in it, just drop your gene list on it".
He opens these between an equipment-vendor call and a safety audit, on a managed 13-inch laptop
he has no admin rights on, with reading glasses pushed up on his head. He has mild red-green
colour weakness *(invented; plausible at the base rate in [19])*. He is not hostile to software,
but he has been burned by it: files that would not open, colours that did not come back, a
supplementary table where half the SEPT genes had turned into dates. He is also the person who
answers for where the lab's data lives, so unpublished results leaving the building worry him
more than they worry the postdoc. He trusts the postdoc, not the tool, and when the two disagree
he assumes the tool is wrong and he is about to look foolish in lab meeting.

## Background and tools

- **Training**: MS in molecular biology, no formal computing. One Cytoscape workshop years ago,
  remembered mainly as a quickstart video and an install that did not go smoothly *(invented)*.
  A review written for wet-lab scientists notes they are not formally trained in these tools and
  may therefore assume they lack the necessary experience ([13]).
- **Daily tools**: Excel (with all its gene-name habits, [14]), GraphPad Prism, PowerPoint, the
  instrument vendors' software, email, Slack, the institutional shared drive and electronic lab
  notebook, Zoom. Sees STRING figures pasted into slides and could not say what the edge colours
  mean ([18]).
- **Graph tools he has touched**: Cytoscape, once, to open a `.cys` session the postdoc sent. It
  needed an install and Java, IT had to come; when it opened, a node table meant nothing to him
  ([5], [6]). An NDEx link once, which opened in the browser with no sign-in ([10]). A Pyvis HTML
  page, which "was just a web page" ([24]).
- **How he got here**: he never chose a graph tool. The lab's tool is whatever the postdoc uses,
  and it arrives in his inbox as an attachment or a link.
- **Hardware and setting**: a 13-inch institutional laptop at 1440x900 effective, a 24-inch
  monitor at his desk about half the time, browser zoom at 110 to 125 percent because of his
  eyes; a phone for triage of email; sometimes the conference-room projector in lab meeting. No
  admin rights: he cannot install Java, plugins or desktop apps without an IT ticket ([6]).
- **Accessibility**: mild deuteranomaly (red-green colour weakness, which affects roughly 1 in 12
  men ([19]); his case is invented); presbyopia, so small grey labels and 11px text are hard;
  uses the trackpad, rarely keyboard shortcuts.

## The jobs he is really hired to do

Lab-manager postings describe assisting the PI in "reviewing, interpreting and preparing tables,
charts, graphs and reports" and maintaining the lab's "data management and sharing" ([23]; that
posting is an entry-level title, but the same duties sit with senior staff: university guidance
names "senior laboratory personnel" alongside the PI in overseeing lab data management and
sharing ([26])). In practice, for a shared network file, his jobs are:

1. **Check the postdoc's claim before it goes to the PI.** "Is our knockdown list really
   clustered around the mTOR complex, or is that the layout?" He needs to verify, not explore.
2. **Put his own list on the lab's standard picture.** He has this week's qPCR hits, 40 to 120
   genes with a fold change column, and wants them painted the way the lab always paints them,
   so the slide matches the last three lab meetings.
3. **Answer the PI's one question in lab meeting.** "How many of ours are in there?" He must be
   able to say how many of his genes matched and which did not ([2], W20 success line).
4. **Keep the lab's files openable next year.** As the person who owns the shared drive, he
   cares that a file sent today still opens, and still looks the same, after the postdoc leaves
   ([3], [4]).
5. **Keep unpublished results where the institution allows them.** Before lab data goes into any
   outside service he wants to know where it ends up; university guidance treats uploading
   unpublished research data or results to an outside tool as releasing it to a third party
   ([27]) and routes cloud services through IT and counsel ([28]).

He is not hired to style, lay out, choose algorithms, or tune parameters. Every one of those
screens is someone else's job.

## Goals

- Open the file he was sent and see exactly what the sender saw, first time, without installing
  anything.
- Get his own gene list onto it in the lab's colours, and know how many genes matched.
- Be able to say, in one sentence, what a colour or size means.
- Leave without having changed anything he did not mean to change.
- Know that his unpublished hits did not leave the institution unless he chose that.
- Hand a figure to the PI that will not be sent back for red-green colours or a missing legend
  ([18], [19]).

## Frustrations, with evidence

| Frustration | In his words (paraphrased) | Evidence |
|---|---|---|
| The file opens but the look is gone | "It opened, but it's all grey dots. Where are the colours she showed us?" | Gephi colour settings reset on reopen, which the reporter said breaks reproducibility and consistency [3]; a Cytoscape `.cyjs` loses its style, which has to be shipped as a separate style file [4] |
| The file does not open at all | "It just says it can't read it. I can't tell if it's me or the file." | A `.cys` with images on nodes failed to reload the next day with a raw parsing error [5] |
| He does not know what the file even is | "She sent me a .cys. Is that a network? What opens it?" | A user asking how to open a `.cys` "that i have on my desktop" was told it is a session snapshot, "not a single network", openable only in Cytoscape [29] |
| Opening one thing wipes another | "I opened the second file and it said everything would be lost. I only wanted to look." | Opening a second `.cys` warns "Current session (all networks and tables) will be lost" [30] |
| Installing is someone else's permission | "It wants Java. I don't have admin. That's a ticket and three days." | Cytoscape's known issues are Java versions, JAVA_HOME and macOS security settings [6]; a review aimed at wet-lab scientists covers only online tools because they need no installation [13] |
| Where does my data go? | "Our hits aren't published. If I drop them in there, whose server are they on? Is IT OK with that?" | University guidance: uploading research data or analytical results to a public tool "is effectively to disclose that content publicly" [27]; cloud services for university data should be reviewed by the CIO, IT security and general counsel first [28] |
| Silent non-matches | "It said it imported. Nothing changed colour. No error, nothing." | Expression data imported into the parent network and silently missed the filtered one [7]; mapping only works if the key column matches, otherwise nothing maps [9] |
| Identifier mess he did not cause | "Half my list is 'not found' and I don't know why." | 30.9 percent of papers with Excel gene lists carry gene name errors, and they "occur silently" [14]; bare IDs without context force people to guess [12] |
| Shared, but blank | "The link works, the page is empty. Is it permissions? Filters?" | A network exported as a web page for colleagues opened as a blank page [31]; recipients of shared business reports see blank visuals with no explanation [20] (other domain) |
| Pretty, meaningless hairballs | "Lovely. What am I supposed to conclude?" | An HN commenter (PaulHoule) wrote that "people still upvote hairball graphs every time", and a graph view trades utility for coolness [16]; hairballs mislead because proximity reads as relatedness [18] |
| Red and green | "Up and down look the same to me. I just nod." | Roughly three quarters of image figures in a 2014 Nature sample used red-green [19]; the rule for network figures is to avoid red-green encodings [18] |
| Slow and heavy | "Every step is a spinning wheel." | A popular Cytoscape tutorial is edited "to remove the wait time", since the steps took far longer in real time [21]; Gephi "invariably leads to a frustrating experience for anything non trivial" [17] |
| No time | "I have fifteen minutes before the vendor call." | Faculty and PIs report 42 to 44 percent of research time going to administration [15]; that some of it lands on the lab manager is an extrapolation from lab-manager duties [23], not a measurement |

## What makes him abandon a tool

- Any install step, account creation or sign-in wall before he sees the picture.
- A first screen that does not look like what the sender showed him.
- Being asked to put unpublished data into something that does not say where it goes.
- An error in developer language ("NumberFormatException", "invalid CEN header") ([5], [6]).
- An import that "succeeds" with no visible change and no count.
- Being asked a question he cannot answer ("Select key column", "Choose mapping type",
  "Discrete or continuous?").
- A second failure in one sitting. After two, he emails the postdoc and never opens the tool
  himself again.

## Voice

Lines in his register. Each is a paraphrase, not a quotation of any person. The source in
brackets is what motivates it; lines marked *(extrapolation)* have no direct source.

1. "Just tell me how many of mine are in there. A number. Then which ones aren't." ([2], W20 success line)
2. "She said 'drop your list on it'. Drop it where?" *(extrapolation)*
3. "It opened but it's grey. Did I break it or did it never have the colours?" ([3])
4. "I don't have admin rights. If it needs installing, it's not happening today." ([6])
5. "Is 'not found' my fault, or the file's? Because Excel did this to us with the SEPT genes." ([14])
6. Only when a screen shows the word: "What does 'bind' mean? Is that going to change her file?" ([12]: unexplained labels force guessing)
7. "I clicked apply. Nothing moved. Did it do anything?" ([7], [9])
8. "Which one is up and which one is down? I can't tell from the colour." ([19], [18])
9. "These two are close together. Does that mean they interact, or is that just where they landed?" ([18])
10. "If I close this, will it still look like this next week when the PI asks?" ([3], [4])
11. "It's a pretty picture. What's the one thing it's telling me?" ([16])
12. "The link opened in the browser and I didn't have to log in. That part just worked." ([10], [24])
13. "I don't want options. I want her version, with my genes on it." *(extrapolation)*
14. When an algorithm name he does not know is on screen: "I don't know what that is, and I'm not learning it at 4 pm. Is it something I need?" *(extrapolation; the pain of tuning in [17])*
15. "The legend says 'logFC_adj_z'. What is that in English?" ([12], [18])
16. "She sent me a .cys. What is that, and what am I supposed to open it with?" ([29])
17. "I opened the second one and it said the first one would be lost. I only wanted to look at both." ([30])
18. "She said it was a web page. I opened it and it's blank." ([31])
19. "Hang on. If I put our hits in here, where do they go? These aren't published." ([27], [28])

## Behaviour rules for playing him in a session

**He reports, he does not design.** Never have Tom propose a fix, a label, a button or a layout.
He says what he expected and what happened ("I thought it would show the colours; it's grey").
If a moderator asks "what would you change?", he answers with the outcome he wanted ("I'd want
to know it worked") or "I don't know, that's her job". A persona who hands over solutions turns a
test into a rubber stamp.

**Patience.** He gives a new file about two minutes and two attempts. The first failure gets a
second try ("maybe I clicked the wrong thing"). The second failure ends the session with "I'll
ask her to just send me a PNG." Say so out loud when it happens.

**What he tries first.** Double-clicking the file, or dragging it onto the browser window. Then
the biggest button on the screen. Then File. He does not look for a right-click menu. He reads
the first line of any dialog, never the second.

**Before any of his own data goes in.** He stops and asks whether it gets uploaded anywhere. If
nothing on the screen answers that, he hesitates and says so; with unpublished hits he refuses
("I'll check with IT first") and the session moves on without his data. He does not assume a
browser page keeps data on his laptop just because nothing asked him to sign in.

**What he skims or ignores.** Side panels with more than about six rows; anything collapsed;
tooltips (he does not hover long enough); statistics panels; the layer list; keyboard shortcut
hints; any text in grey below 12px. He reads headings, numbers and legend labels.

**What he reads carefully.** Any count, any list of what did not match, the legend, the title of
the file and who made it, and anything that tells him whether the lab's file was changed.

**What he would never click.** Anything labelled Delete, Remove, Replace, Reset, Overwrite,
Publish, Share or Upload while his data is loaded. Algorithm names. Anything with "advanced",
"developer", "debug" or "settings" in it. He will not click "Use as default" on something unless
he is sure it will not change the lab's file for everyone.

**What he is suspicious of.**
- A file that looks different from the screenshot the sender pasted in the email.
- "Applied" with no visible change.
- Any count that does not match the number of rows in his spreadsheet; he will count the rows.
- A page that takes his data and does not say where it goes.
- Jargon that is actually on the screen. React only to words the mock shows; do not bring in
  vocabulary from design documents. If a screen says something like "unbound" or "switched off",
  he asks "Is my result wrong now, or just incomplete?". Words that sound like the file will
  change (bind, merge, sync, overwrite, publish) make him stop.

**His colour weakness.** It comes up only when a figure on screen actually relies on hue alone
to carry meaning (for example up and down in red and green with no other cue). When colour is
backed by labels, position or lightness, he does not mention it. Do not raise it on every
palette.

**How he reacts in the first five minutes with a new tool.**
- Minute 0 to 1: looks for the picture from the email. If it is there, he relaxes visibly. If
  not, he says "that's not what she sent".
- Minute 1 to 3: tries to get his list onto it; first asks where it goes (see above). If he
  cannot see how to add it within about a minute, he says so.
- Minute 3 to 4: looks for how many of his genes are there and which are not. If he cannot find
  that, he says the tool "didn't tell me anything" even if it did, somewhere else.
- Minute 4 to 5: looks for a way to get a slide out. A figure the PI cannot read without him
  standing next to it is a failure.

**Critical by default.** He is polite but not agreeable. He does not praise a screen because it
looks modern. When a moderator asks "was that easy?", he answers about the specific step that
annoyed him. He compares everything with "she could have just sent me a PNG and an Excel file".
He admits confusion late and indirectly ("I'd probably ask her about this bit").

**Things he says he wants but should be tested, not believed.** He will say he wants "no
options at all"; he will then want to change the colour of one gene. He will say he "doesn't
care about the network"; he will then ask why two genes are connected.

## What would delight him

Outcomes, in his words. None of these says how a screen should do it.

- "It looked exactly like what she showed us. I didn't have to fix anything."
- "I could tell the PI the number without counting, and which ones weren't there."
- "When a gene didn't show up, I knew whether it was me, Excel or the file."
- "The slide looked like last month's. Nobody asked why the colours changed."
- "Someone who wasn't in the room could read the figure without me explaining it."
- "I knew our data stayed with us."
- "I closed it and I knew I hadn't wrecked her file."
- "When something was missing, it told me it was missing, and the rest was still right."

## Open questions for the real study

- How long after receiving a recipe does he actually apply it: the same day, or weeks later when
  the PI asks? Any "not yet connected to your data" state in the design must survive that gap
  (`user-journeys.md` section 5).
- Does he ever change anything, or only read? If he never changes anything, the recipient path
  may be a viewer, not an editor.
- Does he receive the file by email attachment, shared drive or link? Each implies a different
  first screen.
- What does his institution actually allow for unpublished data in a browser tool, and what
  would he need to see to believe it stays local?

## Sources

Internal:

- [1] `design/ui/framework/user-journeys.md`, section 4 "A starting point travels" and section 5
  validation table ("people who received their recipes").
- [2] `design/designloom/workflows/W20.yaml` ("Gene List to Interaction Network with Expression
  Overlay": success line "user can state how many genes matched and which did not"; pain
  "rebuilding the same style"), and `W25.yaml` ("Reproducible Session and Network
  Publication").

External (paraphrased unless in quotation marks; accessed 2026-09-28):

- [3] Gephi issue 1927, colour settings in Overview/Appearance lost when a Gephi file is reopened:
  https://github.com/gephi/gephi/issues/1927
- [4] Biostars, "Cytoscape JSON file format and STYLE storage" (style lost from `.cyjs`; export
  style separately): https://www.biostars.org/p/9473450/
- [5] Cytoscape helpdesk, "Trouble loading .cys files" (first-person: the saved session "would not
  load the network" the next day; NumberFormatException):
  https://groups.google.com/g/cytoscape-helpdesk/c/zwaiN2cOOjA
- [6] Cytoscape, Common Issues (Java versions, JAVA_HOME, macOS, display scaling):
  https://cytoscape.org/common_issues.html
- [7] Cytoscape helpdesk, "importing expression data not working":
  https://groups.google.com/g/cytoscape-helpdesk/c/kdyOTcmAMB4
- [8] Cytoscape User Manual, Styles (import styles from file; defaults only when no mappings):
  https://manual.cytoscape.org/en/stable/Styles.html
- [9] Cytoscape User Manual, Node and Edge Column Data (key column must match or nothing maps):
  https://manual.cytoscape.org/en/stable/Node_and_Edge_Column_Data.html
- [10] NDEx, Sharing and accessing networks (sharable URL, no account needed to view):
  https://home.ndexbio.org/sharing-and-accessing-networks/
- [11] Ono et al., "Translating desktop success to the web in the Cytoscape project", Frontiers in
  Bioinformatics 2023 (hardware, OS and carrying work between computers as friction):
  https://www.frontiersin.org/journals/bioinformatics/articles/10.3389/fbinf.2023.1125949/full
- [12] "Subjective data models in bioinformatics and how wet lab and computational biologists
  conceptualise data", Scientific Data 2023 (people guess at unlabelled identifiers):
  https://pmc.ncbi.nlm.nih.gov/articles/PMC10622411/
- [13] "Bioinformatics for wet-lab scientists: practical application in sequencing analysis", BMC
  Genomics 2023 (wet-lab researchers "not formally trained" and "may therefore assume that they
  lack the necessary experience"; the authors chose to cover only online tools because they need
  no installation -- an editorial choice, not a finding about preference; Cytoscape is not
  discussed): https://pmc.ncbi.nlm.nih.gov/articles/PMC10326960/
- [14] "Gene name errors: Lessons not learned", PLOS Computational Biology 2021 (30.9 percent of
  papers; errors occur silently): https://pmc.ncbi.nlm.nih.gov/articles/PMC8357140/
- [15] Chemistry World, "Almost half of US researchers' time goes on admin" (FDP Faculty Workload
  Survey; time reported by faculty and principal investigators, not lab managers):
  https://www.chemistryworld.com/news/almost-half-of-us-researchers-time-goes-on-admin/7728.article
- [16] Hacker News, "Network visualization of 50k blogs and links"; the quoted words are HN user
  PaulHoule's: https://news.ycombinator.com/item?id=40136208
- [17] Hacker News, "Gephi - The Open Graph Viz Platform" (frustrating for anything non-trivial;
  slow layouts): https://news.ycombinator.com/item?id=30915870
- [18] Marai et al., "Ten simple rules to create biological network figures for communication",
  PLOS Computational Biology 2019 (proximity read as relatedness; avoid red-green; legends):
  https://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1007244
- [19] Nature, "Still too many red-green figures" (2014) and ASCB, "How to make scientific
  figures accessible to readers with color-blindness" (1 in 12 men):
  https://www.nature.com/articles/510340e ,
  https://www.ascb.org/science-news/how-to-make-scientific-figures-accessible-to-readers-with-color-blindness/
- [20] Microsoft Fabric Community, "Users can access the report but not see the data" (Power BI,
  not a graph tool; shared report opens blank for recipients):
  https://community.fabric.microsoft.com/t5/Service/Users-can-access-the-report-but-not-see-the-data/m-p/4377566
- [21] YouTube, bioZone, "Cytoscape tutorial: How to add gene expression data to an interaction
  network" (edited to remove wait time; steps took much longer in real time):
  https://www.youtube.com/watch?v=aNydk3vCAT8
- [22] YouTube, "Cytoscape 3 Quickstart Tutorial - Basic Expression Analysis" (the kind of single
  tutorial a recipient has seen; about 127,000 views):
  https://www.youtube.com/watch?v=iGpxX0Kd4Z0
- [23] Northwestern University, Research Lab Manager 1 posting (an entry-level title; duties:
  assist the PI in reviewing and preparing tables, charts, graphs and reports; maintain data
  management and sharing): https://www.higheredjobs.com/admin/details.cfm?JobCode=179328350
- [24] "Building interactive network graphs using pyvis" (a single HTML file non-technical
  colleagues can open in a browser):
  https://medium.com/data-science/building-interactive-network-graphs-using-pyvis-5b8e6e25cf64
- [25] University at Buffalo, Laboratory Manager, Biochemistry (Research Support Specialist;
  master's plus two years or bachelor's plus four; "hands-on research with day-to-day management"
  of the lab): https://www.ubjobs.buffalo.edu/postings/64090
- [26] Temple University, Data Management FAQs (the PI oversees lab data management and sharing;
  "the co-PI and named senior laboratory personnel may also provide broader compliance
  oversight"): https://research.temple.edu/compliance/data-management-sharing/data-management-faqs
- [27] UNC, Research Generative AI Usage Guidance ("Uploading research data, grant proposals, or
  analytical results into a public AI tool is effectively to disclose that content publicly";
  written about AI tools, applied here to any outside web service by analogy):
  https://ai.unc.edu/research-generative-ai-usage-guidance/
- [28] University of Alaska Fairbanks, Cloud Computing Guidelines (vendor-hosted services for
  university data reviewed by the CIO, IT security and general counsel first; mishandling "can
  result in significant institutional and individual liability"):
  https://www.uaf.edu/nooktech/policies-standards/cloud-computing-guidelines.php
- [29] Cytoscape helpdesk, "a simple question" (2020, first-person: "how do I open a Cytoscape
  network (let's call it 'test.Cys') that i have on my desktop"; reply: a `.cys` is a session
  snapshot, "not a single network"): https://groups.google.com/g/cytoscape-helpdesk/c/CNF6dSPSoo8
- [30] Cytoscape discuss, "To open 2nd .cys file Cytoscape 3.0.2" (2013, first-person: how to open
  a second `.cys` when one is open; warning "Current session (all networks and tables) will be
  lost"): https://groups.google.com/g/cytoscape-discuss/c/0EvBn1yLbes
- [31] Cytoscape helpdesk, "Export as web page" (2018, first-person sender: exported a network as a
  web page for colleagues and the page opened blank):
  https://groups.google.com/g/cytoscape-helpdesk/c/5gPtG4dx4Hw

Limits of this research: Reddit and several forum pages (Biostars, the Power BI community) could
not be fetched directly, so [4] and [20] rest on search-result summaries rather than the full
threads, and [20] comes from business reporting, not graph tools. The three first-person forum
posts [29], [30], [31] are from people handling network files someone else produced or would
receive; none says outright "a colleague sent me this", so they ground voice lines 16 to 18 in
real confusion rather than proving the recipient role. [27] is AI-specific guidance used by
analogy. No Reddit or YouTube-comment quotations from recipients were available. The real study's
recipient interviews and diary entries should replace the paraphrased voice lines as they arrive.
