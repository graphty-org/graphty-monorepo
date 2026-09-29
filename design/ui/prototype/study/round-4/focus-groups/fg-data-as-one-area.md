# Focus group: data management as one area

The owner's feedback asks for data management to be designed as one coherent area: how data comes
in, is versioned, refreshed, joined, filtered, exported and shared. This group looked at the Data
panel mock (Sources, Versions, "Recipes applied", "Style files", "Sent and saved from this
project", with "Nothing has been sent from this project" under the project name) and at the
storyboards that end in it: a monthly return being updated, and a recipe being sent to a partner.
The loaded file in the mock is a payments network of 9,113 transfers.

Three rounds. In round 1 each participant spoke alone. In round 2 each had heard the others. In
round 3 each was asked what would make them switch to the tool, what would make them quit, and the
one thing they would change.

Participants (simulated):

- Sarah, a fraud analyst at a bank (payment statements, phone numbers, accounts)
- Dana Okafor, a supply-chain risk analyst (a quarterly SAP export of suppliers; a Power BI shop)
- Tom, a lab manager who receives a recipe and a file from a postdoc and drops a gene list on it
- Marcus, a criminal intelligence analyst (monthly phone toll returns; evidence goes to court)
- Dr. Chen, a bioinformatics researcher (STRING protein networks, release against release)

These are simulated voices. Every finding below is a hypothesis for real users to confirm. Every
participant said, unprompted, that most of what they said is opinion rather than use: only Dana
ran "Update with new data", and only on a mock.

## Transcript

### Round 1

**fraud-analyst:** First thing I looked for was money. I didn't find it. The Data page tells me amount is "not used yet". On a payments file that is the whole case. If amount doesn't go on the links by default, I'm back to a pivot table before I've started.

The layout itself is fine. Sources, versions, what was sent: that's roughly how a case file is organised, and I'll give it credit for that. The line under the project name, "Nothing has been sent from this project", is the first thing I'd screenshot for IT. It's short and plain, and I believe it more than a privacy page.

What I don't get yet is why "Recipes applied" and "Style files" are two separate things sitting next to each other. I can't tell which one my colleague's colours file turns into. The picture was a grey blob. The storyboards were a clean month with no bad rows. Show me a March file where half the phone numbers have plus signs and brackets in them.

Version history I'd actually use. That depends on my reviewer seeing the same picture next week that I'm looking at today.

**supply-chain-analyst:** Dana Okafor, supply chain risk: Honestly, the first thing I looked for was "import", and I found it. The Data page with the file name, the column list and "Update with new data" is the part I understand. My SAP export comes in every quarter, so that button is the reason I'd open this at all. If it matches my suppliers by name and tells me which ones are new or gone, it's worth something. If it just reloads, I can already do that in Excel.

The storyboards are a mess of words for me, though. "Recipes applied", "Style files", "Style stack", "Versions", "Version history". That's five places that sound like the same thing. I don't know what a recipe is here. I'd guess it's a saved report? Nobody explains it on the page.

The line "Nothing has been sent from this project" is the one I'd screenshot for IT. But it's small grey text under the title, and on my laptop at 110% zoom I'd miss it.

And the picture in the middle is a grey hexagon blob. That tells my VP nothing.

**recipe-recipient:** The first thing I read was the line under the project name: "Nothing has been sent from this project." Good. That's the sentence I'd want to show IT. But it's small, it's grey, and it's underlined like a link. Is it a promise or a button? And which project does it cover, this one or everything I've opened?

After that line I lost the thread. The Data side has Sources, Versions, "Recipes applied", "Style files", then "Sent and saved". That's five headings before I've done anything. What's the difference between a recipe and a style file? She sends me "the file with the lab's colours". Which box does that go in?

"Weight: amount, not used yet. A run that can use it asks..." Is my result wrong now, or just incomplete? I'd probably ask her about this bit.

The storyboard about the recipe was a very long page of small text. I skimmed the pictures. The one I cared about said "84 of 96 genes matched", with the missing ones listed. That's the whole job for me. If that number is there, the rest can live somewhere I never look.

One more thing. Both "Update with new data..." and "Add a table..." sound like they change her file. I wouldn't click either one without asking first.

**intelligence-analyst:** Marcus (criminal intelligence analyst):

What I actually did in my sessions: I opened the Data page first, same as I do with any tool, because the first thing I need to know is where the file goes. The line under the project name said "Nothing has been sent from this project." That's the first thing I read, and it kept me in the chair. I didn't read the storyboards top to bottom. I skimmed the monthly return one, because a new tolls return every month is my life, and I stopped at the part where the data gets updated.

What I say now: the layout is fine. Sources, versions, then what left the building, in that order. I'd keep that. But "Recipes applied" and "Style files" sit one above the other, and I couldn't tell you which one is my colleague's colors. Pick one name. Also, "Assistant off, nothing is sent" is printed down in the left rail in small type. That needs to be up top, where I'll see it every time. The storyboards are long. My sergeant won't read those. Show me the chart they end with and one line saying what changed since last month.

**bioinformatics-researcher:** In my session I only went through Export to send a partner the recipe, with no data in it. I saw this Data panel once, at the end. So this is a first look, not use.

The layout is close to how I think about a project. Sources are at the top, then Versions, then recipes, then what left the machine. Cytoscape splits these up: the session file in one place, styles in another, and nothing at all that tells me what was sent. Putting "Nothing has been sent from this project" under the project name is the right place for it. I read it before anything else.

What bothers me is that the Data panel mock is the payments network, 9,113 transfers. The weekly-return storyboard is the same idea: someone's CSV turning up again. My file doesn't turn up monthly. It's STRING release 12.0 against 11.5, and between those releases about a third of the scored edges changed. "Update with new data..." has to tell me what dropped out and what changed score, as counts, before it redraws anything. Otherwise it's the Cytoscape merge again, just faster.

I also saw "Recipes applied" and "Style files" as two separate rows. Pick one.

### Round 2

**fraud-analyst:** **Sarah (fraud analyst):** What I've actually done here: in my session I opened one file and looked at the Data page. The rest is what I think now.

On trust, I'd put that line under the project name in front of my IT reviewer before anything else. Marcus is right that "assistant off" belongs up there with it. Dana is right that it's too small. But my reviewer's next question is "sent where, by whom, and when?" "Nothing has been sent" only holds up until the first export. After that I need a dated list with who did it and which file, something I can print. Without that it's a claim, not a record.

Dr. Chen's point about counts fits me too. When March's statement comes in, tell me how many accounts are new, gone or changed, and which rows you couldn't match, before you redraw anything. If a phone number with a plus sign quietly turns into a new node, my ring just got bigger and it's wrong.

On recipes, everyone keeps saying pick one name, and I agree. My colleague's colours can change how things look. They should never change which rows got loaded or what counts as a link.

Amount still isn't on the links.

**supply-chain-analyst:** Dana Okafor, supply chain risk:

In my session I did one thing: I opened "Update with new data" on the Q2 SAP export. I never opened a recipe. That is what I did. Here is what I say now.

Marcus is right that the "nothing sent" line has to sit up top. But the line alone won't get me through IT. My reviewer's first question is "where is it stored?", and the line never answers that. I need something like "Stored in this browser on this laptop. Nothing sent. Here is the list of what was exported, with dates." That is a page I can print for them.

I agree with the bioinformatics researcher on counts. For me they are 1,412 suppliers: 38 new, 22 gone, and 9 that might be the same company under a new name. I want those nine in a table I decide on, before anything is redrawn. If it matches "ACME GmbH" to "Acme Holdings" without asking me, I stop trusting every number after it.

Opening a file making a new project is fine. Opening my Q3 file and losing my Q2 colours would not be.

Still missing: a Power BI export. Without it, this is a side tool.

**recipe-recipient:** Tom (lab manager): What I actually did in my session was open the file and drop my list on it. I never opened this Data panel on purpose. I only saw it once, when I went looking for whether my genes had gone anywhere.

Marcus says pick one name for recipes and style files, and so does the bioinformatics one. I'm not going to name anything. That's her job. But I agree there's a problem: I still don't know which box the lab's colours go in, and I'm not guessing.

Dana wants "Update with new data" to tell her what's new and what's gone. Fine for her. For me it's a word that sounds like it rewrites the postdoc's file. I wouldn't press it without emailing her first.

The line under the title is the bit I trust most, but it covers this project only. IT will ask about everything I've opened, and nothing on this page answers that.

And the "Not decided yet" lines? I can't tell if that means I'm missing something or the software is. I'd probably ask her about this bit.

**intelligence-analyst:** Marcus (criminal intelligence analyst):

Dana says a plain reload is something she can already do in Excel. I agree. That's the reason I'd use "Update with new data" at all, and it has to tell me who's new since last month before it redraws anything. The bioinformatics researcher asked for counts first. So do I, but I also need the names. "Twelve new numbers" doesn't help me. Show me which twelve, and which of them called my targets.

The fraud analyst will screenshot the "nothing sent" line. I wouldn't show IT a screenshot. A reviewer asks where it's written down, so I'd want a dated record I can print and put in the case file. The recipe recipient asked whether that line is a promise or a button, and I had the same question.

On trust: I'd load real data only after IT signs off. The page can't change that. On recipes: that's a word for cooking. My colleague sends me "the chart settings". It should change how things look and nothing else. If it hides a link, it's out.

What's missing is the source on every link: which return and which row. That's what gets asked for in discovery.

**bioinformatics-researcher:** Dr. Chen: I agree with Dana on one thing. "Update with new data" is the only reason I'd open this panel. My case is different from hers, though. When I update, the suppliers don't come and go. The edges get rescored. Between two STRING releases, a pair can stay in the network while its combined score falls from 0.72 to 0.38. That falls below my 0.4 cutoff, so for me that edge is gone. The update has to understand thresholds, not just count what was added and removed.

Marcus is right that "Recipes applied" and "Style files" need one name. What worries me more is what a recipe is allowed to touch. It can hold colors, sizes and the layout seed. It must never change my confidence cutoff or remap my identifiers. If a partner's recipe silently turns Ensembl IDs into gene symbols, I can't reproduce anything I get from it.

On trust: "Nothing has been sent" is fine. My reviewer would ask a different question: which STRING release, which cutoff, and which recipe produced Figure 3? I don't see that record anywhere. Sent-and-saved logs where the file went, not where it came from.

### Round 3

**fraud-analyst:** **Sarah (fraud analyst):** What I actually did: I opened one file and looked at the Data page. I never ran an update. The rest is what I say now.

Here's what would make me quit. The April statement comes in, I press "Update with new data", and the ring quietly grows. It happened because "+44 (0)7700" and "07700" got loaded as two separate accounts and nobody asked me. After that I rebuild the case in Excel, and I don't come back. Dana's nine maybe-the-same suppliers are my phone numbers. Put them in a table, I decide, and it's written down.

Here's what would make me switch. Marcus wants every link traced to its return and its row. So do I. That, plus a dated export log I can print with who, what file and when, gets me past my reviewer. Dr. Chen asks which release and which cutoff produced Figure 3. That's my question too, only for me it's which statement and which amount threshold.

The one thing I'd change: put the amount on the links by default. It's round four and I'm still saying it. Until the money is on the chart, this is a picture of who knows who, not a flow of funds.

**supply-chain-analyst:** Dana Okafor, supply chain risk:

In my session I ran "Update with new data" on the Q2 export, and that's all I did. The rest is what I think now.

Here's what would make me quit. I open the Q3 file, it becomes a new project, and my Q2 colours, my notes and my list of nine maybe-the-same suppliers are gone. If I have to redo that every quarter, I'm back in Excel by October. Dr. Chen is worried about rescored links. For me it's supplier names. Either way, if something gets matched or dropped without asking me, I'm done.

Here's what would make me switch. Update shows me 38 new, 22 gone and 9 to decide, in a table I can sort. Then it keeps everything else I built.

Marcus and Sarah are right that a screenshot won't satisfy IT. I'd add one line to their dated list: where it's stored. Right now nothing on the page says that.

Tom, "recipe" means nothing to me either. Call it "saved look" and I'd understand it.

The one thing I'd change is to add a Power BI export: the supplier table with the new, gone and matched columns. Without it, my VP never sees any of this.

**recipe-recipient:** **Tom (lab manager):** Here's what I actually did in my session. I opened her file, dropped my list on it and looked for the count. Everything past that is what I think now.

I'd quit the second time it does something I can't undo. That's my rule anyway. The two I can see coming are "Update with new data" and the recipe box. I still don't know if either one changes her file.

Dr. Chen says a recipe must never touch the cutoff or the IDs. I agree, but I'd go further. If a recipe can hide or rename one of my genes, then "84 of 96 matched" isn't a number I can say in lab meeting.

Dana and Marcus want a printed record. So do I. But mine has to say "everything I've opened on this laptop", not just this project. IT won't ask about one project.

What would make me switch is her picture opening with my genes on it and the count at the top, and me closing it knowing her file is exactly as she sent it.

The one thing to change? I don't know. That's her job. I just need to know I didn't break anything. Otherwise she can send me a PNG.

**intelligence-analyst:** Marcus (criminal intelligence analyst):

In my sessions I only opened the Data page and skimmed the monthly tolls storyboard. I never ran an update on real data, and I won't until IT signs off. Everything below is opinion.

**What would make me quit:** an update that quietly merges records. Sarah's plus-sign problem is my problem too. If 555-0142 and +1 (555) 0142 become two people, or get merged without asking me, my chart is wrong. Then I'm the one explaining it on the stand. I'd be back in Analyst's Notebook that afternoon.

**What would make me switch:** Dana's review table, applied to phone numbers. Show me the new, gone and "might be the same" entries, by name, and let me decide each one before anything redraws. Then give me a printed record with dates, and with the source on each link: which return, which row. Dr. Chen wants to know where a figure came from. So do I. Discovery will ask.

**The one thing to change:** put the source return and row number on every link, and show them when I click the link. Tom can ignore the rest of this page. I can't.

**bioinformatics-researcher:** **Dr. Chen:** What I've actually done here is small. I exported one recipe to a partner and looked at this panel once. What follows is what I'd decide if I spent a Friday afternoon on it.

I'd quit if "Update with new data" redraws first and explains later. When I load STRING 12.0 over 11.5, I need to see counts before anything moves. How many edges dropped below my 0.4 cutoff, how many crossed above it, and which identifiers didn't map. Dana wants her nine possible supplier matches in a table she decides on. I want the same for the edges that fell under my cutoff.

Sarah and Marcus want a dated export log for IT. That's fine, but it only records half the chain. The one thing I'd change is to put, next to that log, the list of what produced each figure: source release, cutoff, recipe and layout seed. Until that exists I can't cite anything made here, so the figure goes back to R.

What would make me switch is a recipe that is locked to appearance. Tom shouldn't have to guess which box the colours go in, and I shouldn't have to check whether a partner's recipe moved my threshold.

## Themes

Counts are out of five. "Round 1" counts only what a participant said before hearing anyone else;
that is the independent evidence. Later rounds can echo. Severity uses Nielsen's 0-4 scale
(4 = usability catastrophe).

### 1. An update must show what changed, and let me decide the doubtful matches, before it redraws -- severity 4

- Round 1 (independent): 3 of 5 asked for a change report before the redraw. Dana (new and gone
  suppliers, matched by name), Dr. Chen (what dropped out and what changed score, as counts,
  before anything redraws), Marcus (one line saying what changed since last month). Sarah raised
  the input that makes it hard -- phone numbers with plus signs and brackets -- without yet
  naming the update.
- Round 2: 4 of 5 (all but Tom) asked for counts first. Dana added the decisive shape: "9 that
  might be the same company", in a table she decides on.
- Round 3: the same 4 named a silent match or merge as their quit point, each with their own
  data: Sarah (+44 (0)7700 against 07700), Dana (ACME GmbH against Acme Holdings), Marcus
  (555-0142 against +1 (555) 0142), Dr. Chen (edges that fell under the cutoff).
- Distinct needs inside the theme, with who holds them:
  - counts before redraw: Dana, Dr. Chen, Marcus (origin, round 1); Sarah (round 2).
  - a review table of "might be the same" that the analyst decides, and the decision written
    down: Dana (origin, round 2); Sarah, Marcus and Dr. Chen adopted it in round 3.
  - names, not only counts, and which new entries touched my targets: Marcus only.
  - threshold-aware diff (an edge that stays but falls under the cutoff is gone): Dr. Chen only.
    One voice, but it is the only participant whose data is rescored rather than added and
    removed, so no one else could have raised it.
  - identifiers that did not map: Dr. Chen (round 3) and Sarah ("rows you couldn't match",
    round 2).
- Agreement: full among the four who maintain data. Dissent: Tom, who never updates anything
  and reads the command as a threat (theme 5).
- Discount: the review table's shape is Dana's; three participants adopted it verbatim ("Dana's
  nine", "Dana's review table"). Count the shape as one voice. The need to not be silently
  merged is four voices, each backed by a different real example.

### 2. "Recipes applied" and "Style files" read as the same thing -- severity 3

- Round 1 (independent): 5 of 5. Every participant raised the pair unprompted. Sarah and Marcus
  could not tell which one a colleague's colours file becomes; Tom asked the same about "the file
  with the lab's colours"; Dana listed five near-synonyms across the mocks ("Recipes applied",
  "Style files", "Style stack", "Versions", "Version history"); Dr. Chen said "pick one".
- The word "recipe" itself: Dana guessed a saved report (round 1), Marcus called it a word for
  cooking (round 2), Dana offered "saved look" (round 3), Marcus said his colleague calls it "the
  chart settings". Tom declined to name it but still does not know which box to use.
- Agreement: full on the problem. The renames are proposals from one voice each; do not adopt
  one on this evidence. A first-click or card-sort test on candidate names would settle it.
- Discount: Marcus and Dr. Chen both said "pick one name" in round 1; the exact wording may be a
  shared-script coincidence, but the confusion itself was independent in all five.

### 3. A recipe must be locked to appearance -- severity 3

- Round 1: 0 of 5. Nobody raised it while they still did not know what a recipe was.
- Round 2: 4 of 5. Sarah first (colours can change how things look, never which rows loaded or
  what counts as a link), then Marcus (look only; if it hides a link, it is out), Dr. Chen (may
  hold colours, sizes and the layout seed; never the cutoff, never an identifier remap).
- Round 3: Tom joined and extended it: if a recipe can hide or rename one of his genes, "84 of 96
  matched" is no longer a number he can say. Dr. Chen named "a recipe that is locked to
  appearance" as his switch reason.
- Agreement: 4 of 5 (Dana silent on it; she never opened a recipe). Dissent: none.
- Reading: this is a trust boundary as much as a naming one. A recipient needs to see, on the
  recipe itself, that it cannot change which data is shown. Whether the real recipe format can
  carry filters or thresholds is a product question this group cannot answer.

### 4. "Nothing has been sent" is a claim, not a record -- severity 4

- Round 1 (independent): 5 of 5 read the line first or early, and 4 of 5 called it the thing
  they would show IT. Problems raised independently: small and grey, missable at 110% zoom
  (Dana); underlined like a link, "promise or button?", and which project it covers (Tom); the
  "Assistant off, nothing is sent" line is down in the left rail and belongs up top (Marcus).
- Round 2: 5 of 5 said the sentence will not survive a reviewer. What each needs differs:
  - a dated, printable export log with who and which file: Sarah (origin), Marcus, Dana.
  - where the data is stored ("in this browser on this laptop"): Dana only, repeated round 3.
  - scope beyond this project ("everything I've opened on this laptop"): Tom only, raised in
    round 1 and repeated in rounds 2 and 3.
  - where a figure came from, not only where a file went: Dr. Chen (theme 6).
- Agreement: full that a record is needed. Dissent: none. Sarah moved from "I'd screenshot it"
  (round 1) to "a claim, not a record" (round 2); Marcus rejected the screenshot outright.
- Discount: the printable-log field list converged by quoting. Count the need for a record as
  five voices; count storage location and all-projects scope as one voice each, both from
  personas who must pass an IT review, so worth testing.
- Mock-fidelity caveat: whether the line is really underlined, and how small it is, should be
  checked in the kit's type scale before acting on those two points.

### 5. For a recipient, "Update with new data" and "Add a table" sound destructive -- severity 3, one voice, deliberate

- Tom in every round: both commands sound like they change the sender's file; he would not press
  either without emailing her; he quits "the second time it does something I can't undo"; he
  switches only if he can close the file "knowing her file is exactly as she sent it".
- Dissent: the other four call the same command the whole reason to open the panel.
- Reading: this is a real tension, not an outlier. The same command is the draw for the person
  who owns the data and the hazard for the person who received it. Tom is the only participant
  in that role, so one voice here is full coverage of the role. The Data area needs to say, to a
  recipient, what is theirs and what is the sender's, and that changing their copy cannot reach
  the sender.

### 6. Where did this come from: per-link source and per-figure provenance -- severity 3

- Per link (which return, which row): Marcus origin, round 2 ("what gets asked for in
  discovery"); his round 3 one change. Sarah adopted it in round 3.
- Per figure (source release, cutoff, recipe, layout seed): Dr. Chen origin, round 2; his round 3
  one change. Sarah adopted it for statements and amount thresholds; Marcus in round 3.
- Tom's version: the "84 of 96 matched" count must be trustworthy, which depends on theme 3.
- Agreement: 3 of 5 by round 3, with two independent origins that point the same way: the export
  log records where things went, and nothing records where they came from.
- Discount: both origins arrived in round 2, after the export-log discussion had started, so
  they may be reactions to it. Still, each came with a concrete external asker (discovery, a
  paper's reviewer) that the persona would face.

### 7. The data is loaded but not used, and the page does not say whether that is a problem -- severity 3

- Sarah in all three rounds: amount is "not used yet"; on a payments file the money is the case;
  it should be on the links by default. Her round 3 one change.
- Tom, independently in round 1: "Weight: amount, not used yet" -- is my result wrong or only
  incomplete? In round 2, the same about "Not decided yet": is something missing from me or from
  the software?
- Two independent voices from opposite ends (expert and recipient) on the same line of the mock.
  Sarah wants a different default; Tom wants to know whether he must act. Both are served by a
  status that says what the tool did with the column and whether anything is waiting on the
  reader.

### 8. The layout order works; the vocabulary does not

- Praise, independent in round 1: Sarah, Marcus and Dr. Chen said the top-to-bottom order
  (sources, versions, what left the machine) matches how they think about a case or a project.
  Dr. Chen contrasted it with Cytoscape, where session, styles and sent files live apart and
  nothing records what was sent.
- Objection, independent in round 1: Dana ("five places that sound like the same thing") and Tom
  ("five headings before I've done anything").
- Reading: the structure of one Data area holds for the three who maintain data over time. The
  load is in the labels (theme 2), not in the grouping. Keep the order; cut and rename headings.

### 9. Carry my setup across the next file -- severity 3, one origin

- Dana, rounds 2 and 3: a new file becoming a new project is fine; losing her colours, notes and
  the nine undecided suppliers every quarter is her quit point.
- Sarah's round 1 remark supports it indirectly: the reviewer must see next week's picture as
  today's.
- One origin. It overlaps theme 1: the others assumed the update keeps their work; Dana is the
  only one who said what happens if it does not.

### Single-voice observations (do not act on without more evidence)

- A Power BI export of the supplier table with new, gone and matched columns (Dana, rounds 2 and
  3). Without it "my VP never sees any of this". Likely generalises to "export the change
  report as a table", which would serve theme 1 too.
- Which new numbers called my targets (Marcus, round 2): this is an analysis over the update, and
  belongs with Graph and results rather than the Data area.
- Marcus will load real data only after IT signs off; nothing on the page changes that.

### Critique of the study materials (5 of 5, round 1)

- The storyboards are long, small-text pages: Tom skimmed the pictures, Marcus's sergeant "won't
  read those", Dana called them "a mess of words". Marcus's fix: the end chart plus one line of
  what changed.
- The data is too clean and too uniform: Sarah wants a messy March file with badly formatted
  phone numbers; Dr. Chen notes every example is a monthly CSV, while his data arrives as
  versioned releases that are rescored, not appended.
- The graph is a grey blob (Sarah, Dana): a mock-fidelity artifact of an unstyled first load. It
  tells nothing about the Data area, but it does tell the storyboards need a styled end state.
- Action for the next storyboard pass: one update storyboard with dirty identifiers and a review
  table, and one release-against-release storyboard with a threshold.

## Group-think and artifacts to discount

- Quoting instead of adding: rounds 2 and 3 open most turns by naming another participant. The
  review table (Dana's), the printable log (Sarah and Marcus) and figure provenance (Dr. Chen)
  each spread by quotation. Counts above separate origins from adopters.
- Prompt-shaped convergence: the round 3 switch-quit-change prompt gave every turn the same
  shape and pulled four of five toward "silent merge" as the quit point. The four different
  examples are the evidence; the unanimity is partly the prompt.
- Anticipation, not use: every participant disclaimed use. Findings about "Update with new data"
  are about what people fear and expect, not about behaviour, and no mock can show whether the
  real update matches. Severity 4 rests on the stakes each described (a court, a regulator, a
  paper), not on an observed failure.
- Minor misattribution: Dana credited Marcus with saying the "nothing sent" line must sit up
  top; he said that about the Assistant-off line in the left rail. The "nothing sent" line is
  already at the top.
- Persona leakage: Sarah's "It's round four and I'm still saying it" refers to the study, not to
  anything a participant could know. Tom's "I'd probably ask her about this bit" recurs word for
  word, a scripted tic. Neither changes a finding.
- Persona lean: the regulated roles (fraud, intelligence) push audit records; the researcher
  pushes reproducibility; the recipient pushes safety. The findings that survive that lean are
  the round 1 unanimous ones: the recipe and style-file confusion (theme 2) and the trust line
  that needs to become a record (theme 4).
