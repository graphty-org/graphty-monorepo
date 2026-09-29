# Focus group: investigations, evidence and approval

Round 1 of the simulated user study. Four simulated participants who build cases other people
check -- a bank fraud investigator, a security operations analyst, a police intelligence analyst
and a supply-chain risk analyst -- reviewed the alert-triage storyboard and its screens (the
whole-bank view, the rule step, the ring, the path, the export dialog and the "Where your data
is" panel). The fixture is a bank's transfer data, so three of the four were translating from
their own domain.

Three written rounds: first impressions and a five-second purpose statement; reactions to each
other; then "what would make you switch, what would make you quit, and the one change you would
make".

Participants are simulated, built from the study personas and public practitioner writing. Treat
every finding here as a hypothesis for a real session, weighted by the evidence counts below.

## Participants

| Name in transcript | Who | Domain |
|---|---|---|
| Sarah | Fraud investigator at a bank | Mule accounts, SAR filings, Excel pivot tables |
| Priya | Security operations analyst | Logons, hosts, processes; writes hypotheses as queries |
| Marcus | Police intelligence analyst | Phone records, field-interview cards; uses i2; testifies |
| Dana Okafor | Supply-chain risk analyst | Supplier alerts from a risk platform; ERP exports; Power BI |

## Transcript

### Round 1

**Sarah (fraud investigator):** In five seconds, what I'd write is "a network viewer that shows
which accounts pass money to each other." It took me longer than five seconds to find the money,
though.

The first screen is a hairball of 3,000 grey dots with orange diamonds on it. That tells me
nothing about a case. I'd skip it and paste my account number into the first box that looks like
a search.

The ring screen is the one I'd keep. Twelve accounts, 24 transfers in the 9,000 to 9,999 range,
and $226,756.28 total, all laid out in a table I can check row by row. The note says who wrote it
and when. Most usefully, it names the four accounts that never alerted. Those four are the actual
finding.

What's missing is amounts and dates on the lines between accounts. I can't see who paid whom, or
when. It's a web, not a flow of funds. My reviewer will ask where the money went, and this
picture doesn't answer that.

I trust the export dialog more than the canvas. It lists files, says they go to my Downloads
folder, and says nothing is uploaded, which is what I need to know. But a "findings report" HTML
file is not something my bank's case file will accept. And the first thing I'd do with those CSVs
is open them in a pivot table, which tells you what the benchmark still is.

**Priya (security operations):** Five-second purpose: "A graph viewer for the fraud team, with an
alert list glued underneath." Transaction monitoring on bank transfers is the bank's
financial-crime team's work, not mine. My data is logons, hosts and processes.

What I actually looked at was the table and the counts, not the hexagon blob. I don't care where
an account sits on the screen. I care that 50 alerted means 50 listed, and the table shows me
that.

The rule screen is the closest thing here to how I work. "amount between 9000 and 9999.99", and
it shows 25 nodes and 42 edges before I commit. That's good. My questions:

- Is that a real query language I can save and rerun next month, or a form made to look like one?
- Where do I put time? "Off-hours, inside one hour" is half of every hypothesis I write.

The start screen says "uploads nothing". I'll believe that after I've watched the network tab.
And the first thing our vendor review will ask about is the line right under it: "Connect to data
source... sends only the query". Sends it where, and who runs that source?

**Marcus (police intelligence):** Five seconds: it's a link-chart tool for money. Accounts,
transfers, a path highlighted. It's not my world, which is phones and field-interview cards, but
I get it.

What I noticed first was the line on the start screen: "Files stay on this computer... uploads
nothing." Good. But that's a sentence on a screen. My IT people don't approve sentences, they
approve paperwork. If this is a website, who ran the approval, and can the department host it on
its own server?

The path frame works for me. It shows who sent money to whom, with the amount on every hop, and
the tiny print says it isn't a flow. That's the kind of honesty I need on the stand. Still, every
account is either a diamond or a dot. Where's my phone icon, my car, my address?

The evidence export is closer than anything a vendor has shown me. But the note sits in a
sidebar, not on the link. Every link needs a source record, a date and a grade. "1,000,000 nodes
not drawn" is honest too, but then all I have is a table, and Excel already gives me a table.

**Dana (supply-chain risk):** Five seconds: "a screen for working through a list of flagged
accounts." That part got through. It's a bank's story, though, not mine. What I'd translate is
the shape of it. My risk platform sends me four hundred alerts a week, and a queue with a note and
a file per alert is the same shape. So it's close enough to judge.

What I liked: the table. It has alert number, account, scenario and a score, in the order the
alerts were raised. I'd read that before I read any picture. The orange diamonds on grey work, and
it isn't a hairball.

What lost me: the whole-bank frame says "1,000,000 nodes not drawn" over a big empty space. I
don't say "nodes". Then the right side says "weak components", "max degree 167,302". I don't know
what either one means or why I'd care. And "alert is true" in typewriter font looks like code I'm
not supposed to touch.

Also, the grey "rule" and "Rule set" labels are tiny. On my 14-inch laptop at 110% I'd be
squinting.

Before I say anything nicer, two questions. Where does my data go when I load it? And does any of
this get out to Power BI?

### Round 2

**Sarah:** I trust the path frame more than I expected to. It gives the amount on every hop, and
the small print says that without direction it's two accounts both paying a merchant, not a flow.
That line would save me from my own reviewer. Marcus is right that it deserves bigger type.

It still has no dates. If the second transfer happened before the first, that path is not a flow
of funds, and the tool doesn't know that. I need a transaction reference and a date on every row,
so each number traces back to core banking. That's the same point as Marcus's source record, in
my language.

Something that worries me: on the ring screen I counted twelve accounts and $226,756.28. The note
in the export says fourteen accounts, 28 transfers and $262,796.52. If that's the same ring, I
stop trusting it. If it's a different one, the screen needs to tell me why.

The evidence file also needs the source file's name, when it was loaded and a checksum, or QA
will pull it apart.

Dana, forget Power BI for me. It's Excel. And I don't want a typed query box. I'm not learning a
language to do what a filter does.

**Priya:** The large-graph variant is the frame I trust most. "1,000,000 nodes not drawn" and a
table sorted by alert ID is better than what I've had from other graph tools, which went white or
spun for an hour. Marcus, Excel gives you a table. It doesn't tell you that 14,036 of 1,000,000
match a rule.

Dana, I disagree about the jargon. "Max degree 167,302, ACC-453831" is the first thing I'd click.
In my data that's a domain controller or a scanner, and it wrecks every path through it. I'd want
to exclude it in one step.

Sarah is right that the evidence file is weak, but I'd push it further. For me to defend it, it
needs:

- the exact rule text
- a hash of the source file
- the tool version
- a timestamp

"Rule step on amount" is a summary, not something I can re-run. If I can't re-run it, a reviewer
will tear it apart.

The padlock line on export is fine, but it doesn't answer whether anything uploaded. Only a
network capture answers that. Marcus has the approval question right.

And time is still missing. I don't see a single time filter or timeline anywhere in this
storyboard.

**Marcus:** Now I've seen the "where your data is" panel, I trust the tool more. It gives the file
name, what was uploaded ("nothing"), where it's saved, and every file written out, with times.
That's the page I'd print and hand to IT, not the line on the start screen. Priya is right to ask
about "Connect to data source" though. The first time something says "sends", my approval stops.

Sarah, you're right that the lines carry nothing. The export has a note that sums up 24
transfers. I can't take that to the stand. I need each link to show its own record: a subpoena
return, a row number, a date, how reliable it is. If the note sits beside the chart, defense will
ask which line it's talking about.

"Browser, 10:33" as the place it's saved worries me too. IT wipes our profiles. Where does the
case file live next month?

Dana, I'll put "weak components" in plain English for you: separate groups that never touch. I
only know that from a workshop. The screen should say it.

What's missing is time. A hop that says $9,400 with no date is half a fact.

**Dana:** The "Where your data is" box is the first thing here I'd forward to IT. It lists the
file, says "uploaded: nothing" and shows what was written out. But it says "nothing, this
session." What about last session? And the Assistant line sends my rows "to the provider you
choose." Our security review stops right there. I'd want the Assistant switched off by the
company, not by me.

"Saved in this browser" worries me too. Our laptops get re-imaged, and if my Monday setup
disappears with that, I'm done.

Marcus is right that a sentence isn't paperwork. Sarah's point about the pivot table is my whole
week. The CSVs are what I'd actually trust, because Power BI can read them. The note in the right
panel is good. It has a name, a time and the numbers in plain words. I'd paste that straight onto
a slide.

What's missing for me: the ring works because the bank has every transfer. I have Tier 1 and a
spreadsheet of names. If "who else links to this one" needs Tier 2 links, where do I get them?
Also, "degree 10" in the table. I don't know that word.

### Round 3

**Sarah:** What would make me switch is being able to click a line between two accounts and get
the transfers behind it. Each one with its transaction reference, the value date and the amount,
in date order, and a total that matches my pivot to the cent. If it had that, I'd use this for
mule cases instead of drawing boxes in PowerPoint for the SAR.

I'd quit over the ring numbers. The screen says 12 accounts and $226,756.28, and the export says
14 accounts and $262,796.52. If nothing on the screen explains the gap, I'm finished, because my
QA team will find it before I do.

Priya, I agree the file needs the source file's name, a checksum and when it was loaded. I don't
need a rule I can re-run, though. I need every figure to trace back to core banking.

Marcus, dates are the thing we have in common. My one change is simple: put dates on the lines
and reject any path where the money moved backwards in time. I don't want a timeline gadget.

My answer on approval is no. Our IT won't let an unapproved website near customer account data,
whatever the padlock says.

**Priya:** I'd quit in the first week if the rule turns out to be a form dressed up as a query.
It has to save as text I can diff, rerun next month and paste into a ticket. Sarah, you don't
have to type anything. Just let me.

I'd also quit if there's no time. My hypotheses are "admin logon off-hours, then a new service
within an hour." That needs a time window in the rule and a timeline next to the graph.

Here's what would make me switch. The whole-bank frame that says "not drawn", and one step to
exclude the max-degree node. Plus the evidence file I listed in round 2: the exact rule text, the
source file hash, the tool version and a timestamp. Sarah's mismatch of twelve accounts on screen
and fourteen in the export would end it for me on the spot. One mismatch and I don't trust any
number in the file.

Dana, I'm with you on the Assistant. It should be off by policy, not by my own choice.

The one thing to change is time. Put it in the rule, show it on every edge, and give me a
timeline view. None of that matters until IT approves it, though. I'd need a hosted-internally
option, and "Connect to data source" has to say exactly where the query goes.

**Marcus:** Here's what would make me quit. The first time defense counsel points at a line on my
chart and I can't say which subpoena return put it there, this tool goes in the drawer and I go
back to i2. Sarah said the same thing with dates, and Priya with re-running the rule. It's one
problem: every link has to carry its own source record, a date and a reliability grade, and that
has to show on the export, not in a note off to the side.

What would make me switch is two things together. The department has to be able to host the tool
on its own server so IT can sign off on it. And I need a timeline I can lay the same links on.
With both of those, I'd use it for phone records, which i2 handles badly at volume.

The one change I'd make is typed entities: a phone, a person, a vehicle, an address. Right now
it's diamonds and dots.

Dana, I'm with you that "Saved in this browser" isn't a case file. It needs to be a file I keep
on the share drive. And no query box for me either. Priya can have hers.

**Dana:** Here's what would make me quit. My laptop gets re-imaged and my Monday setup is gone,
because it was "saved in this browser." Or IT asks where the data goes and the answer includes
"the provider you choose." Either one ends it for me, however good the screens are.

Here's what would make me switch. I load my ERP export and my survey spreadsheet, and the tool
shows me which Tier 1 suppliers turn out to buy from the same place. It needs to say that in
plain words, not "degree" or "weak components." Priya, I get that "max degree" is the first thing
you'd click. I'd click it too if it said "most connected supplier: 41 of your suppliers depend on
it." Then it has to hand me CSVs Power BI reads without me cleaning them. That's where my VP
looks.

The one thing I'd change is to make the "Where your data is" box a real document I can save and
forward. It should cover every session, not just this one, and say whether the company can
switch off the Assistant. Marcus is right that IT approves paperwork. And Sarah's point stands: if
the numbers don't match between the screen and the export, I stop trusting it.

## Themes

Severity uses Nielsen's scale: 0 not a problem, 1 cosmetic, 2 minor, 3 major, 4 catastrophe.
"Independent" means the participant raised it before anyone else in the group had; "echoed"
means they took it up after hearing it.

### 1. The screen and the export disagree about the ring -- severity 4

- **Voiced by:** Sarah (independent, rounds 2 and 3). Priya and Dana (echoed, round 3).
- **What:** the ring screen shows 12 accounts, 24 transfers, $226,756.28; the note carried into
  the export says 14 accounts, 28 transfers, $262,796.52. Nothing says whether these are the same
  set. All three say one unexplained mismatch ends their trust in every number.
- **Fidelity check:** the mocks do hold two sets under similar names. The filter step in the
  alert-triage storyboard yields 14 accounts, of which 12 form the ring; other screens call "the
  mule ring" 14 accounts. So the mismatch is partly a fixture inconsistency across mocks. It is
  still a real design finding: nothing on the ring screen, the note or the export says which set
  a figure counts, and a note written against one set can be exported beside another.
- **Design response:** every figure in a note or export names the set it was counted over and its
  size; when a note's figures differ from the set currently on screen, the note says so. Fix the
  fixtures so the mocks agree before round 2, or the next group will find the same thing and it
  will mask other feedback.

### 2. Time is missing everywhere -- severity 4 for Priya and Marcus, 3 for Sarah

- **Voiced by:** Sarah (independent, round 1: dates on lines), Priya (independent, round 1: time
  in the rule), Marcus (round 2, after Sarah and Priya). Dana did not raise it.
- **What:** no dates on edges, no time window in a rule, no timeline, and no check that a path's
  transfers run forward in time. Sarah's point is precise: a path whose second transfer predates
  the first is not a flow of funds, and the tool presents it as one.
- **Dissent on the form:** Sarah wants dates on the lines and paths rejected when money moves
  backwards, and explicitly no timeline "gadget". Priya and Marcus both want a timeline view next
  to the graph. These are compatible (dates and time-ordered paths first, a timeline as a view
  for those who want it) but they are not the same request.

### 3. Every link must carry its own source record -- severity 3

- **Voiced by:** Marcus (independent, round 1), Sarah (independent in substance, round 1 "who paid
  whom, or when"; aligned with Marcus in round 2). 2 of 4.
- **What:** clicking a line should list the records behind it -- transaction reference or
  subpoena return and row, date, amount, in date order, with a total that matches a pivot table
  to the cent. Marcus adds a reliability grade. It must travel on the export, not in a side note,
  so a reviewer can ask "which line" and get an answer.
- **Discount:** Marcus's round-3 claim that Sarah, Priya and he "said the same thing" merges three
  different needs. Sarah needs traceability to core banking; Marcus needs per-link provenance and
  grading; Priya needs re-runnability (theme 4). Do not count Priya toward this theme.

### 4. The evidence file must be reproducible -- severity 3

- **Voiced by:** Sarah (independent, round 2: source file name, load time, checksum), Priya
  (round 2, extending Sarah: exact rule text, source hash, tool version, timestamp). 2 of 4.
- **What:** "Rule step on amount" is a summary. A reviewer or QA team needs the source file's
  identity and hash, when it was loaded, the tool version, and the exact rule text.
- **Dissent:** Sarah does not need a re-runnable rule, only traceable figures. Priya does. Both
  are served by writing the exact rule text into the file.
- **Also:** the "findings report" HTML file is not something a bank's case file accepts (Sarah);
  CSVs that open cleanly in Excel or Power BI are what Sarah and Dana would actually use. Excel,
  not Power BI, for Sarah.

### 5. Approval: a sentence is not paperwork -- severity 4 for adoption

- **Voiced by:** all four, independently in round 1 (Sarah trusts the export's "nothing is
  uploaded"; Priya will verify with a network capture; Marcus asks who approved it and whether the
  department can host it; Dana asks where her data goes).
- **What:**
  - "Uploads nothing" on the start screen is not trusted on its own. The "Where your data is"
    panel is (Marcus and Dana would print or forward it), but it needs to be a saveable,
    forwardable document and to cover every session, not "nothing, this session" (Dana).
  - "Connect to data source... sends only the query" must say where the query goes and who runs
    that source (Priya, echoed by Marcus). The word "sends" stops Marcus's approval.
  - The Assistant sending rows "to the provider you choose" stops Dana's security review. She and
    Priya want it switched off by company policy, not by the user (Dana independent, Priya
    echoed).
  - A self-hosted option is required by Marcus and Priya. Sarah says her IT will refuse an
    unapproved website regardless.
- **Scope note:** hosting, organisation policy and approval paperwork are product and deployment
  decisions, not screen design. Record them in framework-changes.md as open decisions for the
  owner. What the screens can do: make the data panel an exportable document, say where every
  outbound request goes, and show when a policy has switched the Assistant off.

### 6. "Saved in this browser" is not a case file -- severity 3

- **Voiced by:** Marcus (independent, round 2: "IT wipes our profiles"), Dana (round 2, same round,
  "laptops get re-imaged"; quit reason in round 3). 2 of 4.
- **What:** work kept only in browser storage is lost on re-imaging. Both want the work to live in
  a file they keep on a share drive.

### 7. Graph jargon on the screen -- severity 3 for Dana, 0 for Priya

- **Voiced by:** Dana (independent, rounds 1-3: "nodes", "weak components", "max degree",
  "degree", "alert is true" in code font). Marcus agrees "weak components" needs plain words
  (round 2). Priya dissents (round 2): "max degree 167,302, ACC-453831" is the first thing she'd
  click.
- **Resolution the group reached itself:** Dana's round-3 rewording -- "most connected supplier:
  41 of your suppliers depend on it" -- is something both she and Priya would click. Lead with
  the plain meaning and the number; keep the technical term available, not primary. Rule text in
  code font reads as "not for me" to Dana; see theme 9 for why Priya still needs it.

### 8. Exclude a hub in one step -- severity 2

- **Voiced by:** Priya only (rounds 2 and 3). Dana would click it once reworded. 1 of 4, repeated.
- **What:** a node with 167,302 connections (a domain controller or scanner in Priya's data)
  distorts every path; she wants to remove it from the analysis in one step. Single-voice: confirm
  in a real session before designing for it.

### 9. Rule as saved text versus rule as a form -- severity 3 for Priya

- **Voiced by:** Priya (independent, round 1; quit reason round 3). Sarah and Marcus reject a
  typed query box (rounds 2 and 3).
- **What:** Priya will leave if the rule is "a form dressed up as a query": it must save as text
  she can diff, rerun and paste into a ticket. Sarah and Marcus will not type one. Priya's own
  answer -- "you don't have to type anything, just let me" -- points to a form whose rule is also
  readable, copyable text. Not a real conflict if both exist.

### 10. What reads first: tables and counts, not the canvas -- severity 2

- **Voiced by:** Sarah (the first screen is a 3,000-dot hairball; she'd go straight to search),
  Priya (looked at the table and counts, not "the hexagon blob"), Dana (would read the table
  before any picture). Marcus: "Excel already gives me a table."
- **Split:** Priya trusts the large-graph frame most ("not drawn" plus 14,036 of 1,000,000 matching
  a rule beats tools that hung). Dana sees "1,000,000 nodes not drawn over a big empty space" as
  lost; Marcus as honest but table-only. The counts, not the empty space, are what earns the
  trust; the empty space needs to explain itself in plain words.
- **Positive:** the ring screen (Sarah keeps it; the four accounts that never alerted are "the
  actual finding"), the path frame's amount per hop and its caveat that the path is not a flow
  (Sarah, Marcus), the alert table (Priya, Dana), and the note with author, time and plain
  numbers (Sarah, Dana).

### 11. Small type -- severity 2

- **Voiced by:** Dana (the grey "rule" and "Rule set" labels at 110% on a 14-inch laptop), Sarah
  and Marcus (the path caveat deserves bigger type). 3 of 4 on small secondary text, about
  different labels. Could be partly a screenshot-scale effect; re-check at real size.

### 12. Typed entities -- severity 2, single voice

- **Voiced by:** Marcus only (rounds 1 and 3): phone, person, vehicle, address, not "diamonds and
  dots". Partly a fixture effect -- the bank data has only accounts -- but typed entities with
  icons are standard in his tools. Test with a multi-type fixture before concluding.

### 13. Data the user does not have -- not a design finding

- **Voiced by:** Dana only (round 2): the ring works because the bank holds every transfer; she
  has Tier 1 suppliers and a spreadsheet. Out of scope for the screens; note it as a limit of the
  ring story for supply-chain users.

## Group-think effects to discount

- **The mismatch became a unanimous quit reason by echo.** Only Sarah found it. Priya and Dana
  adopted it in round 3 after hearing it. Count it as one independent observation (plus the
  fixture check above), not three. It is still severity 4 because the failure it describes -- an
  export figure that cannot be reconciled with the screen -- would be fatal whoever found it.
- **Marcus's "it's one problem".** His round-3 synthesis folds dates, per-link sources and rule
  re-running into a single request. They are three different requirements with different users;
  see themes 2, 3 and 4.
- **Approval anxiety snowballed.** Marcus raised paperwork; Priya and Dana amplified it in each
  later round, and by round 3 every participant framed approval as a gate. The underlying concern
  was independent in all four in round 1, but the intensity in round 3 is partly social.
- **Assistant off by policy.** Dana raised it; Priya echoed it without any prior mention. Count
  one independent voice.
- **Stimulus changed between rounds.** Marcus says in round 2 that he has "now seen" the data
  panel. Trust statements about data handling before and after that point are not comparable.
- **Domain translation.** Three of four work outside banking. Their comments about the ring and
  the fixture are about fit to their data, not about the interaction design. Weigh their comments
  on structure (tables, counts, provenance, export) over their comments on content.
- **Simulated participants.** Every voice here is constructed. A finding voiced by one simulated
  participant once is a lead for a real session, not a finding.

## Summary for the design team

| Finding | Independent voices | Severity | Needs |
|---|---|---|---|
| Screen and export disagree about the ring; nothing names the set | 1 (Sarah) + fixture check | 4 | Figures name their set; fix fixtures |
| No time: edge dates, rule time window, time-ordered paths, timeline | 2 (Sarah, Priya) + Marcus | 3-4 | Dates first; timeline as a view |
| Approval: data panel as a document, where queries go, Assistant off by policy, self-hosting | 4 | 4 (adoption) | Screens plus open owner decisions |
| Per-link source records on the line and in the export | 2 (Marcus, Sarah) | 3 | Line opens its records |
| Reproducible evidence file: source hash, load time, tool version, exact rule | 2 (Sarah, Priya) | 3 | Export metadata |
| Work saved only in the browser | 2 (Marcus, Dana) | 3 | A file the user keeps |
| Rule must be saveable text, but not a typed box | 1 (Priya) vs 2 | 3 | Form plus rule text |
| Graph jargon ("degree", "weak components", "nodes") | 1 (Dana) + Marcus | 3 | Plain meaning first |
| Tables and counts read before the canvas | 3 | 2 | Keep counts prominent |
| Small secondary type | 3 | 2 | Re-check at real size |
| Exclude a hub in one step | 1 (Priya) | 2 | Confirm in a real session |
| Typed entities (phone, person, vehicle) | 1 (Marcus) | 2 | Test with a multi-type fixture |
