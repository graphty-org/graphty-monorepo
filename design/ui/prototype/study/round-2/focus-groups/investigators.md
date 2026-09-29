# Focus group: investigations, evidence and approval

Round 2 of the simulated study. Four participants whose work is building a case that someone else
(a manager, a court, a security team, a vice-president) must accept.

| Participant | Role | Day-to-day tools |
|---|---|---|
| Sarah | Bank fraud investigator (anti-money-laundering, second level) | Alert queue, Excel, Word for the suspicious activity report |
| Priya | Threat hunter in a security operations team | Splunk, BloodHound, a notebook |
| Marcus | Criminal intelligence analyst in a police agency | i2 Analyst's Notebook, on Citrix desktops |
| Dana | Supply-chain risk analyst | A paid risk platform, Power BI, Power Query, two ERPs |

Stimulus: the bank-fraud storyboard (a level-1 referral picked up at level 2, the whole-bank
overview that draws nothing at 1,000,000 accounts, the month's 3,000-account file drawn as density
with alerted accounts as orange diamonds, a typed amount rule, neighbours out two hops, a shortest
path, a distractor account on alert, the evidence export, and the "Where your data is" chip and
page). Three rounds: first impressions, trust and fit, then switch-or-quit and one change.

Note for readers: in round 2 Dana calls the threat hunter "Sam". The threat hunter is Priya
throughout; the slip is a simulation artifact, not a finding.

## Transcript

### Round 1 -- first impressions

**Sarah (fraud investigator):** Five-second read: it's a place to look at the month's accounts
with the alerted ones picked out. The orange diamonds read as "alerts" straight away. The grey
honeycomb doesn't tell me anything. Is that 2,950 accounts or a texture? The table underneath is
the first thing I trust, because it has alert IDs, the scenario and a risk score, like my queue.

What I like is that the start of my part of the storyboard, where I pick up the referral, carries
level 1's note with it. Half my first hour goes on redoing what the escalation didn't say.

The first place I push back is "Nodes", "Edges" and "degree" on the tabs and column headers. To me
those are accounts, transactions and counterparties.

The whole-bank screen that draws nothing is honest, and I'd rather have that than a hairball. But
"max degree 167,302" on the first screen is the payment processor. Say that.

The export dialog is where I stopped. It names 46 accounts when only 12 are in the ring. I'd want
to know why before anything goes near a SAR. The line "Nothing is uploaded" is fine, but that's a
claim, and IT will ask me to prove it.

My question for today: what does this give me that a pivot table on the statement doesn't?

**Priya (threat hunter):** Five-second read: it's a graph viewer for a CSV, with a table
underneath for when the picture stops being useful. That's the honest version, and I mean it as a
compliment.

The frame that got my attention is the one with 124,318 nodes that it doesn't draw. It shows a
count, stats, components and a sorted table. That isn't a white screen. I've had BloodHound crash
to white on a canned query, so a tool that tells me up front what it won't draw already has my
trust over one that tries and dies.

The rule step is the closest thing here to how I actually work. I can type
`amount between 9000 and 9999.99`, and it gives me 21 nodes and 45 edges before I commit. Is that a
real query box or just a single filter field? I'll push on that later.

What's missing for me: the storyboard is a fraud story, and nothing in it has a time axis. My hunt
is "which hosts did this account touch, in order, off-hours," and I can't see a time range
anywhere. Also, the filename chip up top tells me which file I opened. It doesn't tell me whether
that file went anywhere else.

**Marcus (intelligence analyst):** Five seconds in, I'd say this is a bank's fraud alert queue with
a gray honeycomb behind it. It's not a link chart. There are no people, phones or cars, just orange
diamonds on hexagons. To be fair, I know who the diamonds are, and the note in the corner says
2,950 accounts are drawn as density. So when I count what's on screen, the tool isn't lying to me
about what's missing, which is better than the last vendor I saw.

The export screen is what I'd actually use. It tells me the file names 46 accounts, 18 of them
people outside the ring, before it writes anything. It lists the methods too: neighbors out 2 hops,
a rule on the amount, a shortest path. That's the first thing a defense attorney asks for. But none
of those transfers carries a source or a grade. If I'm on the stand, "line from
transfers-2026-08.csv" isn't a source.

The "Where your data is" chip says nothing was uploaded, and the data is saved in this browser.
Fine. Now who approved this browser tab to hold case data? IT will ask me that before they ask
anything else.

**Dana (supply-chain analyst):** After five seconds, my guess at the purpose: it's a spreadsheet of
flagged accounts with a big blank box on top. On the whole-bank screen the box says "1,000,000
nodes not drawn." So the picture, which I assume is the point, is empty, and the table is doing all
the work. I can already do that in Excel.

The right-hand panel says "weak components," "average degree" and "isolated nodes." I don't know
what those mean for my business. The grey labels are small, and on my 14-inch laptop I'd need my
glasses.

The export box is the first thing that talks my language. It says four files go to Downloads and
nothing is uploaded. That's the line IT will ask about, but it's in tiny grey text at the bottom.
Put it at the top. The CSV tables are good, because Power BI can read those. A PNG isn't a slide I
can hand my VP.

This is a bank story, not mine. My "alerts" come from the risk platform we already pay for, about
four hundred a week. If this is a second queue for me to work, the answer is no. Show me a supplier
being removed and which products break.

### Round 2 -- trust, and what does not fit

**Sarah:** I trust the shortest-path panel more than I expected to. It says the undirected route is
two hops through the merchant and that this isn't a flow, and that's the sentence I'd otherwise
have to write myself. It still doesn't let me defend it, though. Each hop has an amount and no
date. Five transfers between 9,200 and 9,900 are only layering if they happen in order, within
days. If they're out of order, it's five unrelated payments. So I agree with the cybersecurity
analyst: the time axis isn't a nice-to-have. It's the finding.

In the distractor frame, ACC-523284 is on alert and connects to the ring through one transfer.
Nothing on screen tells me whether it's a mule or a customer who paid a mule. I'd need its
statement, and for that I go to Excel.

I disagree with the intelligence analyst on one point. Source grading is police work. My source is
the core banking extract, and a file name plus a row number would be enough, as long as the export
carries it on every line.

On Dana's point, I agree. If this becomes a second queue, my manager will say no before I ever get
the chance to.

**Priya:** On trust, I'd defend a result from this if I can rerun it and get the same answer. In
the rule frame the chip says "Filtered: 25 of 3,000 nodes". That's a count I can check against
Splunk in two minutes. What I can't see is the rule as text I can copy into a ticket, or a way to
run it against September's file next month. If that saved rule exists, it's my Sigma rule. If it
doesn't, this is a one-off picture.

Dana, I disagree that Excel does this. A pivot gives you counts. It can't give you everyone two
hops out from an account. Sarah, you're right about the 167,302. In my data that's the domain
controller, and a tool that doesn't flag it makes every path run through it.

The "Where your data goes" page is the first thing I'd forward to our security review. But it's
still a promise. I'd open the browser's network tab and check it myself.

Nothing I saw has time on it. Every edge needs a timestamp I can filter on, and a pointer back to
the log line it came from. Without both, it won't survive my team lead.

**Marcus:** The shortest-path frame earned some trust. It gives me the five-hop route along the
direction of the transfers. Then it tells me, without my asking, that if you ignore direction the
route is two hops through ACC-465572, and that this isn't a flow. A defense attorney would find
that before I did, so I'm glad the tool says it first.

But the hops only show amounts, no dates. If the transfer out of ACC-640034 came before the money
arrived there, that isn't a chain, it's a coincidence. Sort the hops by date and warn me when
they're out of order. Priya's right that there's no time axis anywhere, and that's where I'd get
cross-examined.

Dana, I'll disagree with you: the empty box is right. I don't want the whole bank drawn. I want the
thirty accounts around this one.

On the data chip, "uploaded: nothing, this session" leaves me asking what happened last session.
And "Assistant: off" is only useful if my agency can lock it off. If a user can switch it on and
send rows to a provider, IT won't approve the tool.

Sarah's question stands: why 46 accounts in the evidence file when there are 12 in the ring?

**Dana:** Trust: I'd trust the "Where your data is" box more than anything else on these screens.
It gives the file, the time it was read, "uploaded: nothing" and a list of every file written out.
Sam asked whether the filename chip tells you if anything went anywhere. It does, once you click
it. But in my security review IT won't click. They'll want that on a page I can attach to the
ticket.

What doesn't fit my work: the shortest-path screen has a line saying the route "is not a flow from
one to the other." I'd need to read that twice. The path I care about is supplier to part to
product, and I don't have that path. My tier 2 data is a company name and a country for maybe 15
percent of spend. Sarah asked what this gives her that a pivot table doesn't. For me it's the same
question. The honest answer might be "the second hop," and I only have that for a few commodities.

What's missing: a join. I have two ERPs with two spellings of every supplier name. I also don't
have a slide.

**Marcus, on sourcing and grades (reply to Dana):** You're right, but for me the source column is
"which spreadsheet did this row come from." That would be enough.

### Round 3 -- switch or quit, and the one change

**Sarah:** Here's what would make me switch. Give me an evidence export where every line carries
the source file, the row number and the transaction date. Sort the path hops by date, and flag any
hop that runs out of order. If it did that, I'd use it for the ring cases where I currently spend a
day in Excel rebuilding who paid whom. I'd still write the SAR in Word, but I'd attach its file.

I'd quit if it turns into another queue, like Dana said, or if IT can't sign off on it. Marcus is
right about that. A promise in grey text doesn't count. I need something I can put in the vendor
risk ticket.

My one change is dates on every transfer, with a time range I can filter on. Without dates, the
path panel is a nice picture that I can't defend. With them, it's the layering finding.

Priya, I'd take the saved rule too, but it's second on my list after dates. It's also still
missing the reason 46 accounts ended up in a 12-account ring file.

**Priya:** What would get me to switch: a saved rule that I can run again. I'd type
`amount between 9000 and 9999.99` into a real query box, save it with a name, and next month point
it at September's file. It should give me the same count, and I should be able to copy the rule as
text into the ticket. That rule is what I'd defend to my team lead. The picture isn't.

What would make me quit: no timestamps. Sarah and Marcus both got there from the money side, so
this isn't only a security complaint. If an edge has no time on it, I can't order the hops, I
can't filter to off-hours, and I can't point to the log line it came from. I'd close the tab and go
back to my notebook.

The one thing I'd change is to give every edge a time. Then give me a time range filter, and warn
me when a path's hops run out of order, the way Marcus asked. I don't need a separate timeline
view. A time-sorted edge table next to the graph would do.

Dana, you can still say no. The difference is that my "no" gets fixed with one column.

**Marcus:** Three things would make me switch. First, every link has to carry its source row, a
date and a reliability grade, and the export has to keep all three. Dana, the source column you
mean is the first of those, and I'd take it. Second, a time window with before-and-after, plus the
path hops in date order, like Sarah asked. Third, a one-page "where your data goes" statement, and
a setting IT can lock so the assistant can't be turned on. If I have all three, I'd run this next
to i2 on a live case, which is further than Gephi or Palantir ever got with me.

Two things would make me quit. One is a blank or black canvas on our Citrix desktops, because I
can't change that setting and IT won't. The other is a query box that only a programmer can use.
Priya can have her typed rule. I'd want "who called at least two of my targets" as a button.

The one thing I'd change: explain the 46-versus-12 on the export screen itself, by listing which
method pulled in each of the 18 outsiders. If I can't say that on the stand, the file doesn't go in
discovery.

**Dana:** The question for me is whether I switch to this or never start using it. As it stands, I
don't switch. I'd close the tab after the fraud demo and go back to my Power BI report, because
nothing on these screens is about my suppliers.

It could get me in two ways. The first is to load my supplier export and my survey spreadsheet and
match up "Acme Plastics Inc." and "ACME PLASTICS" without me spending a day in Power Query. The
second is to click a resin supplier, say "take this out," and get back a list of the finished
products that lose their only source, with spend next to each one. I'd get that list as a table I
can paste into a slide, not as a graph.

Marcus, you want thirty accounts around one account. I want the opposite direction, from one
supplier outward to everything that depends on it. It's the same shape, but it's built from a
different question.

Priya's saved rule matters to me too. If I rerun the same check next quarter on a fresh export,
that's a scorecard, and my VP reads scorecards.

The one thing I'd change is to stop saying "nodes" to me. Say "suppliers."

## Summary of themes

Severity uses Nielsen's scale: 0 not a problem, 1 cosmetic, 2 minor, 3 major, 4 catastrophe
(blocks adoption). "Independent" means the participant raised it before anyone else did in the
session; "adopted" means they took it up after hearing someone else.

### 1. Relationships carry no time, so a path cannot be defended -- severity 4

- **Who:** Priya (independent, round 1; repeated rounds 2 and 3), Sarah (adopted round 2, with her
  own reason; round 3 "one change"), Marcus (adopted round 2, with his own reason; round 3).
  Dana did not raise it. 3 of 4.
- **What they asked for, in agreement:** a date or time on every transfer or connection; a time
  range filter; path hops sorted by date with a warning when a hop runs out of order. Priya
  explicitly does not need a timeline view -- a time-sorted relationship table beside the graph is
  enough. Marcus adds before-and-after comparison around a window.
- **Why it is strong despite being adopted:** each participant gave a distinct domain reason.
  Sarah: layering is only layering if the transfers happen in order within days. Marcus: a transfer
  out that precedes the money arriving is coincidence, not a chain, and is where he would be
  cross-examined. Priya: off-hours filtering and hop order.
- **Fidelity caveat:** the mock kit already has a time slider and timestamped fixtures used
  elsewhere; the fraud storyboard's transfers simply carried no date column. Part of this is the
  stimulus, not the framework. What remains a design finding is the out-of-order hop warning and
  date-ordered path hops, which nothing in the design currently specifies. Verify in the next round
  with a fraud fixture that has dates.

### 2. Data handling must be provable to IT, not claimed on screen -- severity 3

- **Who:** all four, each independently in round 1. Sarah ("that's a claim, IT will ask me to
  prove it"), Priya ("doesn't tell me whether that file went anywhere"; would check the network tab
  herself), Marcus ("who approved this browser tab to hold case data?"), Dana ("tiny grey text at
  the bottom, put it at the top").
- **Agreement:** the "Where your data is" chip and page were the most trusted thing on screen
  (Dana, Priya) but are not enough on their own. Wanted: a one-page statement that can be attached
  to a vendor-risk or security ticket without anyone opening the app (Dana, Sarah, Marcus); the
  "nothing uploaded" line prominent in the export dialog, not at the foot (Dana); history beyond
  "this session" (Marcus); an administrator lock that keeps the assistant off (Marcus).
- **Dissent:** none. Differences are in what counts as proof (Priya trusts her own network
  inspection; Dana needs a document).
- **Discount:** low. Raised before any cross-talk, and consistent with each persona's real
  approval path.

### 3. The evidence export does not say why each extra account is in it -- severity 3

- **Who:** Sarah (independent, round 1; repeated round 3), Marcus (round 1 partly positive; round 2
  repeated Sarah's question; round 3 "one change"). 2 of 4, raised in every round.
- **Detail:** the dialog already states 46 accounts, 18 outside the ring, and lists the methods
  used. What is missing is per-account attribution: which method (two-hop neighbours, the amount
  rule, the shortest path) brought in each of the 18. Marcus: without that, the file does not go in
  discovery. Sarah: without it, nothing goes near a suspicious activity report.
- **Dissent:** none. Priya and Dana did not comment.

### 4. Every exported line needs its source row -- severity 3

- **Who:** Marcus (round 1), Sarah (round 2), Priya (round 2, "a pointer back to the log line"),
  Dana (round 2 via Marcus's reply; she asked "which spreadsheet did this row come from").
  4 of 4 in some form.
- **Agreement:** source file and row number on every exported line, alongside the date from
  theme 1.
- **Dissent:** reliability grading. Marcus wants a grade on every link (round 1 and round 3).
  Sarah: "source grading is police work"; file and row are enough for a bank. Treat grading as an
  optional, user-defined column rather than a built-in concept.

### 5. Graph vocabulary instead of the reader's words -- severity 3 for non-technical readers, 1 for technical ones

- **Who:** Sarah (round 1: nodes, edges, degree should be accounts, transactions, counterparties),
  Dana (round 1: weak components, average degree, isolated nodes mean nothing; round 2: "not a
  flow" needed two readings; round 3 "one change": say suppliers). 2 of 4, both independent.
- **Dissent (silent):** Priya and Marcus used "nodes" and "hops" themselves and raised no
  objection. The split tracks technical fluency, not domain.
- **Implication:** labels should take the names of the loaded data's things (accounts, suppliers)
  where the data provides them, with graph terms as secondary.

### 6. The overview that draws nothing at 1,000,000 accounts -- mixed; hub labelling severity 2

- **For it:** Priya (round 1; BloodHound crashes to a white screen), Marcus (round 2, "the empty
  box is right, I want the thirty accounts around this one"), Sarah (round 1, "honest, better than
  a hairball").
- **Against it:** Dana (round 1, "a big blank box", the table does all the work). Single voice,
  and Marcus rebutted it; but it is Dana's first impression, which is what a first-time reader
  gets. Consider making the empty state point at the next step rather than just stating the count.
- **Hub:** Sarah (round 1, the payment processor) and Priya (round 2, the domain controller) want
  the dominant high-connection entity named and flagged, because otherwise every path runs through
  it. Independent reasons from two domains.

### 7. The shortest-path panel's undirected note -- positive, with one comprehension failure

- **Who:** Sarah and Marcus (round 2) trusted it most: it says the undirected route is two hops
  through a merchant and is not a flow, before a defence attorney does. Dana (round 2) had to read
  "is not a flow from one to the other" twice. Keep the behaviour; plain-language the sentence.
  Severity 1.

### 8. A saved, rerunnable rule -- severity 2, with a real split on form

- **Who:** Priya (rounds 1-3; her top ask), Sarah (round 3, second after dates), Dana (round 3,
  rerun next quarter becomes a scorecard). Marcus agrees on rerun but dissents on form.
- **Agreement:** save a rule by name, copy it as text into a ticket, rerun it on next month's file
  and get a comparable count.
- **Dissent:** Marcus will quit over "a query box that only a programmer can use"; he wants common
  investigative questions ("who contacted at least two of my targets") as ready-made actions.
  Priya wants a typed query. Both can be satisfied: preset actions that write a visible,
  copyable rule.
- **Open question from Priya (round 1):** whether the rule field is a full query language or a
  single filter. The static mock could not answer this; it is a fidelity gap, not a finding.

### 9. Must not become a second alert queue -- severity 3 as an adoption risk

- **Who:** Dana (independent, round 1: 400 alerts a week already come from a paid platform),
  Sarah (adopted, rounds 2 and 3: her manager would refuse). 2 of 4.
- **Reading:** the tool should open a case that already exists elsewhere (as the referral frame
  does, which Sarah praised in round 1) rather than present its own alert list.
- **Discount:** partly group-think on Sarah's side; she adopted Dana's framing wholesale. Her own
  round 1 praise of the carried-over referral note is the independent evidence for the same point.

### 10. "What does this give me that a pivot table does not?" -- unresolved

- **Who:** Sarah (round 1), Dana (round 2). Priya answered: a pivot counts; it cannot give
  everyone two hops out. Dana conceded "the second hop" may be the honest answer but she only has
  that data for a few commodities.
- **Implication:** the value proposition is multi-hop reach and ordered paths; storyboards should
  show that moment explicitly rather than leave the reader to infer it.

### 11. Supply-chain fit -- one participant, but consistent across all three rounds

- **Who:** Dana only. Her needs: matching the same supplier spelled differently across two exports
  (entity matching), a "remove this supplier" what-if that returns the finished products losing
  their only source with spend, output as a table for a slide rather than an image.
- **Discount heavily as a group finding:** the stimulus was a bank story, so her rejection is
  largely about what she was shown. Not discounted as a persona need: test it with a supply-chain
  storyboard before drawing conclusions.
- **Note:** Dana's "outward from one supplier to everything that depends on it" is the same
  neighbourhood operation Marcus wants, in the downstream direction. That supports a single
  direction-aware neighbourhood action rather than a separate feature.

### Single-voice observations (keep, do not weight)

- Density honeycomb is unreadable as a count -- is it 2,950 accounts or a texture? (Sarah, round 1;
  Marcus noted it without objecting). Severity 2 if it recurs.
- Distractor account: nothing distinguishes a mule from a customer who paid a mule; needs the
  account's statement in reach (Sarah, round 2).
- Blank or black canvas on locked-down Citrix desktops would end adoption (Marcus, round 3). One
  voice, but a known real-world risk for GPU rendering on virtual desktops; worth a technical check
  independent of the study.
- Small grey labels are hard to read on a 14-inch laptop (Dana, round 1).
- An image export is not a slide (Dana, round 1).

## Group-think and moderation effects to discount

- **Time-axis cascade.** Priya raised it in round 1; Sarah and Marcus took it up in round 2, and
  in round 3 Priya cited their agreement as evidence it is not "only a security complaint". The
  convergence is partly social. It survives because each gave an independent, domain-specific
  reason, but count it as one strong independent voice plus two reasoned adoptions, not three
  independent discoveries.
- **Second-queue agreement.** Sarah adopted Dana's framing. Count it as one independent voice.
- **Explicit cross-referencing from round 2 onward.** Participants addressed each other by name and
  echoed each other's asks ("like Sarah asked", "Marcus is right"). Round 1 is the cleanest signal;
  weight later-round asks by whether the speaker gave their own reason.
- **Stimulus bias.** All frames were a bank-fraud story. Dana's rejection and Marcus's "no people,
  phones or cars" are partly reactions to the scenario, not the design.
- **Fidelity.** The static mock could not show whether the rule field is a real query language,
  what a time slider would do, or what a dated fixture would look like. Priya's "is it a real query
  box" and part of the time finding are fidelity questions to retest with an interactive or dated
  mock.
- **Simulation artifact.** Dana addressed the threat hunter as "Sam" in round 2. Ignore.

## Top changes the group motivates, in order

1. Dates on relationships in the fraud storyboard; path hops in date order with an out-of-order
   warning; a time range filter and a time-sorted relationship table.
2. Per-account "brought in by" attribution on the export screen, and source file, row and date on
   every exported line.
3. A standalone, attachable data-handling statement; the "nothing uploaded" line moved to the top
   of the export dialog; an administrator lock for the assistant.
4. Name the loaded data's things (accounts, suppliers) in labels; flag and name the dominant hub.
5. Saved rules that can be copied as text and rerun, with preset investigative questions that
   write the rule for non-programmers.
6. A supply-chain storyboard to test Dana's needs on their own terms.
