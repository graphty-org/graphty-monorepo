# Focus group: investigations, evidence and approval

Round 3 of the simulated user study. Four simulated participants reviewed the alert-triage work
(the queue screen with its density patch and alert table, the alert-triage storyboard including
the frame that finds four accounts cashing out just under 9,000, the path between two accounts,
the whole-bank screen past the drawing limit, the "Where the data is" panel and the export dialog
with its evidence file) and discussed them over three rounds: first impressions and purpose,
trust in the evidence, then what would make each of them switch or quit.

Participants (all simulated, built from the graphty personas plus public forum and video
material):

- **fraud-analyst (Sarah)** -- bank fraud and AML analyst; lives in Excel and i2; writes SARs.
- **cybersecurity-analyst (Priya)** -- SOC threat hunter; queries logs; answers to incident
  review.
- **intelligence-analyst (Marcus)** -- law-enforcement intelligence analyst; i2 charts, subpoena
  returns, cases briefed to prosecutors.
- **supply-chain-analyst (Dana Okafor)** -- supply chain risk analyst; SAP exports into Power BI;
  reports to a VP.

Caveat for everything below: these are simulated participants. Treat their statements as
hypotheses to test with real people, not as evidence of real behaviour.

Transcript note: the note in the mocks is signed "Sarah, Wednesday 17:05". That Sarah is the
fictional author inside the fixture, not the participant Sarah; the shared name may have steered
the participants' reading of the note (see group-think effects). Speaker labels that were doubled
in the raw record have been collapsed to one.

## Transcript

### Round 1 -- first impressions

**Sarah (fraud analyst):**

Five seconds in, here's what I think it's for: my month of transfers, with the monitoring
system's alerts drawn as orange diamonds on a gray blob, and a table underneath. The table is the
part I'd actually use. I'm glad the blob isn't 3,000 dots and it says outright that 2,950 accounts
are drawn as density. I'd have asked.

Then it starts talking developer at me. "Filtered: 14 of 3,000 nodes", "total degree",
"Neighbors". I say accounts, counterparties and transactions.

On the storyboard: frame 15 is a pivot table. Sorting transfers by amount is ten minutes in
Excel. Frame 16 is where it earns something. It shows the four accounts that never alerted
because they cash out just under 9,000, and it writes down why the lookalike was left out. That
goes in a SAR.

Where it falls down is the path on day 2. "5 hops of 9,260 to 9,862 USD", but when? Rapid
movement is about hours: money in Tuesday, out Wednesday. Without dates on the links, or a
timeline, I can't tell that route from coincidence.

"Nothing is uploaded" on the export is a nice line. But my IT people won't take a sentence in the
app's own dialog as the answer.

**Priya (cybersecurity analyst):**

Five seconds on the start screen: it's a local graph viewer. The line "Files stay on this
computer, uploads nothing" answers two of my three gate questions before I even ask them, and
that's more than BloodHound or Maltego ever told me. The third question is whether it's approved,
and no screen can answer that. In a real trial I'd stop there. I'm going on because this is a
study, and I'm using the bank-transfers sample, not our logs.

On the alert-triage open screen, I like that the table comes before the picture. 2,950 nodes
drawn as a grey density patch, with the 50 alerts as diamonds on top, is the first graph tool that
didn't hand me a hairball. But the table is sorted by alert ID. Why not risk score? The 92 is
sitting on row seven.

Two things are missing and they bother me. First, I don't see a time range anywhere. "August
alerts" is a title, not a range. Is that the whole month, or does it end at the export cutoff?
Second, the rule "alert is true" is shown as text I can't edit. Where do I type?

The export dialog saying "Nothing is uploaded" is good. Whether that evidence file holds up in
front of IR is a question for later.

**Marcus (intelligence analyst):**

Five-second read: it's a tool for finding accounts that are linked by money and picking out a
ring. That's fair, and it's more than I get from most demos.

The first thing I checked was the chip that says "Nothing is sent" and the "Where the data is"
panel. Uploaded: nothing. Saved: in this browser. That's the question I ask before I load real
case data, so I'm glad it answers it without my asking. But "saved in this browser" on a managed
Edge profile worries me too. If IT wipes the profile, is my case gone?

Next, the grey honeycomb labelled "2,946 nodes drawn as density." I can't brief a sergeant with a
heat blob. I get why it's there. I'd still start from my seeds and grow outward.

The export dialog is the closest thing here to my real job, because it produces an evidence file,
CSVs and a grayscale check. Still, a note that says "Sarah, Wednesday 17:05" isn't sourcing.
Where's the subpoena return, the Bates number, the reliability grade? Show me the record behind
each of those five transfers or it doesn't go in the product. And every node is an ACC number. In
i2 a person, a phone and an account each have their own icon.

**Dana Okafor (supply chain analyst):**

Five seconds on the queue screen, and my guess at its purpose is "a bank tool for working through
fraud alerts." That is the storyboard's job, not mine. I know it is not built for me, so I will
judge what would carry over.

The first thing I noticed was the grey hexagon blob with orange diamonds. I don't know what "2,950
nodes drawn as density" means. Is that 2,950 suppliers I can't see individually? Then the
whole-bank version shows me an empty white canvas that says "1,000,000 nodes not drawn." I'd have
closed the tab. That said, I'd rather be told it isn't drawn than wait 300 seconds for it the way
I did in Power BI.

The table at the bottom is where I'd actually live, with a reason column and a score. Good. But
the score needs a visible reason, and here it has one: "Structuring: 3 or more transfers..." I'd
want that for "why is this supplier a chokepoint."

The "Where the data is" box, which shows read from this computer, nothing uploaded, and the files
written, is the first thing I'd screenshot for IT.

My open questions: does anything here export to something Power BI can read, and would an admin
have to approve it?

### Round 2 -- trust in the evidence

**Sarah:**

Trust first. I'd defend frame 16 because it shows its reasoning: four accounts that cash out just
under 9,000, and a written reason the lookalike was dropped. But an examiner can't test "5 hops of
9,260 to 9,862 USD" from a number in a dialog. Every link on that path needs its transaction
reference, date and time. That lets me tie it back to the core banking statement. If I can't, I
rebuild the whole path in Excel, and then the graph saved me nothing.

I agree with the intelligence analyst that "Sarah, Wednesday 17:05" isn't sourcing. I don't need
Bates numbers, but I do need the statement or export each transfer came from. Priya, I don't want
a query box. I want a date range I can drag, because hours are the case.

The file chip doesn't answer "did anything upload?" for me. My IT people answer that, not the
app.

Would I switch? Not from i2 or Excel yet. I'd use it for frame 16 and nothing else.

**Priya:**

On trust: the evidence file's first page is the right idea. It gives the filter step, the source
file and its date, 14 rows, and it says PageRank ran on the full graph. I'd still get cut apart in
an incident review. There's no hash of transfers-2026-03.csv, so I can't prove the file I analysed
is the file IR holds. And "in Mule ring suspects" is a label, not a rule. A fixed set of 14
accounts tells me what I chose, not why. I want the rule written out as text that someone else
can paste in and run again.

Sarah's right about "Nothing is uploaded". My IT people won't take the app's word for it either.
They'll check the proxy logs. Publish what the page is allowed to connect to, and that sentence
becomes something they can verify.

I'm with Sarah on time too. For me a timeline isn't an add-on. Half my hunts are "what happened
between 02:00 and 02:40", and the table is the closest thing to that here.

Still no box to type in. I'd bring this to my lead as a way to present results, not as a hunting
tool.

**Marcus:**

On trust, this is closer than most tools get. The evidence file lists the method: Neighbors at two
hops, a rule step on amount, and a shortest path. When defense counsel asks "how did you pick
these twelve?", I could read that out. The grayscale print check is also right, because our case
copies come off a black-and-white printer.

The problem is that every row is still an account, an amount and nothing else. The edge table has
no date column and no column for the source record. Sarah's right: without timestamps I can't
tell a ring from coincidence, and I can't put it on a timeline for the ADA. A note signed "Sarah,
Wednesday 17:05" records who wrote it. It says nothing about where the fact came from.

Priya, I'd push back on the query box. I'm not a programmer. What I want is a button for "who
touched at least two of my seeds." That's a pivot I do in Excel every week.

The biggest gap is how I actually work. Half my case is the same man under three spellings and two
phones. Where do I merge those? And where's a person as a different thing from an account?

**Dana:**

On trust: I'd believe the ring's numbers only if I could click a figure and get back to the row in
the CSV it came from. The tool once told me a distributor was my biggest chokepoint, and it turned
out to be one company entered twice under two names. That's why "46 accounts" makes me nervous:
nothing on this screen says the importer merged or split anyone.

Sarah's point about time is my point about lead times. A link without a date or a lead time is
just a line.

The export is closer to what I need than anything else here. Two CSVs, nodes and edges, go
straight into Power BI with no admin approval, because it's just a file. That answers the question
I asked in round 1. But the columns say "total degree". My VP won't read that.

I agree with the intelligence analyst about "saved in this browser". IT will ask me what that
means, and I won't know.

Priya's right that nobody here can answer "is it approved". That's where this stops for me.

And the grey 11-point text in the export dialog is hard for me to read without my glasses.

### Round 3 -- what would make you switch, or quit

**Sarah:**

Here is what would make me switch, for one job and not for everything. Every link on the path
should carry the transaction reference, the date and time, and the statement it came from. I
should be able to drag a date range and watch the ring light up across Tuesday and Wednesday. With
those two things, frame 16 goes straight into my SAR narrative and I stop rebuilding it in Excel.
The export also needs to open in Excel with columns called account, counterparty, amount and date.
Right now they say "total degree."

Here is what would make me quit. I find one amount in the graph that doesn't match the core
banking statement. Or I find a single sentence anywhere that assumes I have a data scientist.

Marcus wants people and phones as their own things, and I'm with him. Half my mule cases are one
person behind four accounts. But I don't need a merge wizard. I need to see that four accounts
share an address.

Priya, I'll give you the hash of the source file. An examiner would ask for that too.

The one thing to change is dates on the links. Without them the ring on the screen proves nothing
I can defend.

**Priya:**

I'd take this to my lead if it did three things. First, give me a text box where I can type the
rule and save it, for example `amount >= 9000 and amount < 10000 and count(out, 24h) >= 3`. I also
want it to go into the evidence file word for word, so IR can paste it in and get the same 14
back. Marcus, a button for "touched two of my seeds" is fine. Put it next to the box, not in place
of it. Second, a time range on every screen, and the table sortable by timestamp and score, not by
alert ID. Sarah and I agree on this. Third, a SHA-256 of every input file in the evidence file,
and a published list of the domains the page is allowed to contact, so my IT people can check it
against the proxy logs.

What makes me quit: the renderer going white partway through a query, or any network call I
didn't start.

The one thing I'd change is to make the rule a piece of text I can type, save and replay. Without
that it's a tool for presenting results, not for hunting, and I already have PowerPoint.

Nobody has asked yet whether I can load this month's export next month and rerun the saved rule
against it.

**Marcus:**

Here's what would make me switch. I need the entity and its identifiers kept separate: a person,
with two phones and three spellings of his name under him, and a merge step that I can undo and
that writes down why I merged them. After that, give me a date and a source on every link, so
every transfer or call on the chart traces back to its subpoena return, and a timeline view that
uses those dates. Get both of those right and I would build a whole case here, not just use it
once for the ring on frame 16.

Here's what would make me quit. If my agency's CJIS officer can't sign off on it, I'm done.
Priya's right that no screen answers that, and Sarah's right that "Nothing is uploaded" is the app
talking about itself. Give my IT people a written list of everything the page connects to, and put
a pinned install somewhere other than a browser profile, because IT wipes those.

Dana, your point that the "biggest chokepoint" turned out to be one company entered twice is my
case with one man under three spellings. The tool has to say what it merged. It must never do that
quietly.

If I could change one thing, it's the edge table: add a date column and a source column. Without
those, the evidence file shows the method but not the facts.

**Dana:**

The thing that would make me quit: IT says no, or the approval ticket sits for six weeks. No
screen fixes that. Priya's right that the app can't vouch for itself. Give me a one-page note that
my security reviewer can check, one that lists where the data goes and what the page connects to,
and I'll attach it to the ticket myself.

What would make me switch, at least for one job: I load my SAP supplier export as it comes out,
without renaming columns. The tool tells me outright "these two suppliers look like the same
company, merge?" before it calls anyone a chokepoint. Marcus asked for the same thing with his
three spellings of one man. It's the same problem in a different industry, and my
duplicate-distributor mess is exactly that.

The one thing I'd change: every number should click through to the rows behind it. That goes for
the export columns too. Say "suppliers that depend on it", not "total degree", and put the lead
time or date on the link, the way Sarah asked. If the CSV lands in Power BI with columns my VP can
read, I'd use this before Thursday. I'd use it for that and nothing else, the way Sarah said about
frame 16.

And make the text bigger.

## Summary of themes

Severity uses Nielsen's 0-4 scale (0 not a problem, 1 cosmetic, 2 minor, 3 major, 4 catastrophe).
"Independent" means the participant raised it in round 1 before hearing the others; "adopted"
means they took it up after someone else raised it. Where a claim could be checked against the
mocks, the check is given.

### 1. A link carries no date and no source record, so a path proves nothing (severity 4 for investigative use)

- **Who:** Sarah (independent, round 1: "5 hops ... but when?"; rounds 2-3: transaction
  reference, date and time, and source statement on every link; her one change); Marcus
  (independent on sourcing in round 1 -- "show me the record behind each of those five
  transfers"; adopted dates in round 2; his one change is a date and a source column in the edge
  table); Priya (adopted, round 2: "what happened between 02:00 and 02:40"); Dana (adopted, round
  2, translated to lead times on supplier links).
- **Check against the mocks:** the transfers fixture has a timestamp column and the load screen
  maps "Date and time", so the data exists. The path readout, the edge table and the evidence file
  do not show it, and the export dialog says the timestamp is kept as text. This is a design gap
  in what the result surfaces carry, not a fidelity artefact.
- **Dissent:** none on the need. The two parts differ in strength: dates were raised by all four;
  a per-link source record (statement, subpoena return) by Sarah and Marcus, and it depends on the
  import keeping a row reference.
- **Discount:** low. Two independent voices with a concrete case (hours between in and out), and
  every participant named it as a blocker, not a wish.

### 2. No time range and no timeline (severity 3)

- **Who:** Priya (independent, round 1: "August alerts is a title, not a range"; round 3: a time
  range on every screen); Sarah (round 1 asked for "a timeline", round 2 "a date range I can
  drag, because hours are the case"); Marcus (round 3: a timeline view from the link dates).
- **Dissent:** on form only -- Sarah wants a draggable range and explicitly not a query box;
  Priya wants the range stated and also expressible in her typed rule (`count(out, 24h)`).
- **Discount:** low to moderate. Depends on theme 1: a timeline is only as good as the dates on
  the links.

### 3. The app vouching for itself is not evidence; approval needs a checkable artifact (severity 3; partly outside any screen)

- **Who:** Priya (independent, round 1: "is it approved" cannot be answered by a screen; round 2:
  publish what the page may connect to so IT can check proxy logs; round 3: SHA-256 of every
  input in the evidence file); Sarah (independent, round 1: IT "won't take a sentence in the
  app's own dialog"); Marcus (round 3: CJIS sign-off, a written list of connections); Dana (round
  3: a one-page note for the security reviewer, attached to her own ticket).
- **What is praised, not faulted:** all four independently singled out "Where the data is",
  "Nothing is sent" and "uploads nothing" in round 1 as answering their first question -- Dana
  would screenshot it for IT. The finding is that the statement needs a verifiable companion (a
  published connection list, input hashes), not that it should go.
- **Dissent:** none. Sarah and Dana treat it as IT's job; Priya and Marcus want the product to
  supply the proof.
- **Discount:** moderate. The approval gate is real in all four personas' sources, but the
  simulation cannot tell us what a real reviewer accepts; the connection list and hash are
  concrete enough to test.

### 4. Silent merges and missing entity kinds: one person behind several accounts (severity 3 for investigators, 2 generally)

- **Who:** Marcus (independent, round 1: every node is an account number; round 2: same man
  under three spellings and two phones; round 3: separate entity from identifiers, undoable merge
  with a written reason); Dana (round 2, from her own history: a "chokepoint" that was one company
  entered twice; round 3: "these two look like the same company, merge?" before any ranking);
  Sarah (adopted, round 3: one person behind four accounts, but "I need to see that four accounts
  share an address", not a merge wizard).
- **Dissent:** real. Marcus wants an undoable merge step; Sarah wants shared attributes made
  visible, no merging; Dana wants a duplicate warning before analysis.
- **Discount:** moderate. Marcus and Dana raised it from separate histories; Sarah's agreement came
  after both. The shared core -- the tool must never merge or split quietly, and should say what
  the importer did ("46 accounts" gives no sign) -- is safer to act on than any one of the three
  forms.

### 5. Developer vocabulary in reader-facing places (severity 3)

- **Who:** Sarah (independent, round 1: "Filtered: 14 of 3,000 nodes", "total degree",
  "Neighbors"; round 3: export columns account, counterparty, amount, date; quits on "a single
  sentence that assumes I have a data scientist"); Dana (round 2: "total degree" in the export,
  "my VP won't read that"; round 1: did not know what "nodes drawn as density" meant).
- **Check against the mocks:** "total degree" appears as a column in the alert-triage screen and
  the load screen. Confirmed.
- **Dissent:** none. Marcus and Priya did not comment on wording.
- **Discount:** low. Independent, specific strings, confirmed in the mocks.

### 6. A rule you cannot type, save and replay (severity 3 for the security analyst, 1-2 for the others)

- **Who:** Priya (independent, round 1: "where do I type?"; round 2: "in Mule ring suspects" is a
  label, not a rule; round 3: typed rule, saved, pasted word for word into the evidence file,
  rerun against next month's export).
- **Dissent:** strong. Sarah wants a draggable date range instead; Marcus wants a "touched at
  least two of my seeds" button because "I'm not a programmer". Priya accepted the button beside
  the box, not in place of it.
- **The part everyone shares:** the evidence file should record a named set's defining rule, not
  only its members, so it can be rerun. Marcus already values that the file lists the method.
- **Discount:** the typed box is one strong voice; the "record the rule, rerun it next month" need
  is broader and is Priya's unanswered question.

### 7. Table order and the density patch (severity 2)

- **Who:** Priya (round 1: table sorted by alert ID, the 92 on row seven; round 3: sortable by
  timestamp and score); Marcus (round 1: "I can't brief a sergeant with a heat blob", starts from
  seeds); Dana (round 1: did not understand the density label; the million-node empty canvas made
  her want to close the tab).
- **Check against the mocks:** the queue screen states "Sorted by alertId". Confirmed.
- **Balance:** Sarah and Priya praised the density patch over a hairball, and Dana preferred being
  told a graph is not drawn to waiting for it. The label, not the technique, is the problem.
- **Discount:** low for sort order; the density comments are mixed and should not become a
  removal.

### 8. "Saved in this browser" is a risk on a managed machine (severity 2)

- **Who:** Marcus (independent, round 1: if IT wipes the Edge profile, is the case gone? round
  3: a pinned install elsewhere); Dana (adopted, round 2: "IT will ask me what that means").
- **Discount:** moderate; one independent voice, but it matches the approval theme.

### 9. Small grey text in the export dialog (severity 2)

- **Who:** Dana only (round 2, round 3). Single voice, but it is a measurable accessibility check
  (11-point grey text) that should be verified for contrast and size rather than weighted by vote.

### 10. What earned unprompted praise

- Frame 16 of the alert-triage storyboard: the four accounts that never alerted, with the written
  reason the lookalike was excluded (Sarah, Marcus by reference). Sarah and Dana would each use
  the product "for that and nothing else". Frame 15, the amount sort, was called something Excel
  does in ten minutes.
- The evidence file's method page (Marcus: readable to defense counsel; Priya: "the right idea")
  and the grayscale print check (Marcus).
- The reason column on the score ("Structuring: 3 or more transfers...") (Dana).
- The table before the picture (Priya, Sarah, Dana).
- The two-file nodes and edges CSV export going straight into Power BI with no admin approval
  (Dana).

### Single-voice requests, unweighted

- Bates numbers and reliability grades on sources (Marcus; Sarah explicitly does not need them).
- Distinct icons for person, phone and account, as in i2 (Marcus).
- Load an SAP export without renaming columns (Dana).
- Rerun a saved rule against next month's export (Priya).
- Renderer never going white mid-query; no network call the user did not start (Priya's quit
  conditions).

## Group-think effects to discount

- **"Sarah's right" cascade on time.** Sarah raised dates in round 1; by round 2 every
  participant opened with agreement and restated it in their own domain (Priya's 02:00-02:40,
  Dana's lead times). The need is real (two independent voices, confirmed gap), but four votes
  overstate it: count it as two independent plus two adopted.
- **Name collision with the fixture.** The note author in the mocks is called Sarah, the same as a
  participant, and Sarah said she agreed that "Sarah, Wednesday 17:05" isn't sourcing. The
  critique of the note may be partly the group reacting to a name. The underlying point -- an
  author and time are not a source -- stands from Marcus alone. Rename the fixture author before
  the next round.
- **Convergence on "the app can't vouch for itself".** Once Priya framed the approval gate, each
  participant repeated it, and Marcus and Dana quoted both Priya and Sarah. Everyone agreed the
  gate is outside any screen, which also lets the group avoid judging the screens that address it.
  Weight the concrete asks (connection list, input hashes) over the chorus.
- **Cross-industry analogy as consensus.** Marcus and Dana declared their duplicate problems "the
  same problem", and Sarah joined. The three want different controls (undoable merge, duplicate
  warning, shared-attribute view); do not design one merge feature because the group named one
  problem.
- **Priority bargaining on the query box.** Priya, Sarah and Marcus each defended the input style
  that suits them; the compromise ("button next to the box") was social smoothing, not a finding.
- **Segment and task skew.** The mocks were built around a bank fraud storyboard. Sarah is its
  target; Dana said outright it is not built for her, and Priya and Marcus translated it. Dana's
  and Priya's reactions are to a transposed scenario, and none of the four is an explorer or
  presenter persona.
- **Echoing the storyboard's narration.** Frame 16's "reason the lookalike was left out" is the
  storyboard's own caption; praise for it may repeat the author's framing.
- **Simulation effects.** Real approval behaviour (CJIS, IT proxy review, security tickets) and
  real legal admissibility cannot be learned from simulated participants; those themes need a
  real reviewer.
