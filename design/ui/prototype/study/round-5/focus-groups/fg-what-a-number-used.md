# Focus group: what did this number use?

Five simulated participants reviewed the screens that report how a number was computed, and
talked about them in three rounds: first impressions, trust, and what would make each of them
switch or quit. The screens they saw:

- the result panel, whose scope line reads "on: full graph, 300 nodes, 3 components", then
  "Exact. Undirected.", the engine that ran it, and "Weight: confidence, not used yet"
- the Statistics box (nodes, edges, direction, "weight: confidence, not used yet")
- the Betweenness run form, which will not run until the reader says what a higher confidence
  means, states that "the answer is kept on confidence: every measure and the Path tool read
  it", and shows a state line such as "Finished, unweighted. Undirected. Edit held."
- the protein storyboard frame with the "a bigger amount means" choice
- the path bar ("Weight: amount, not used yet"), the filtered scope line ("Filtered: 1,071 of
  3,000 nodes") and a frozen set that records how it was made
- the alert board, the "1,000,000 nodes not drawn" screen, and the gallery of storyboards

Participants (all simulated, built from the graphty personas):

- **Priya (cybersecurity-analyst)** -- SOC threat hunter; starts from a rule and a query;
  answers to incident review.
- **Nadia (alert-reviewer)** -- level-1 alert reviewer at a bank; clears forty alerts a day;
  writes one sentence into a disposition box that QA reads.
- **Emma (expert-emma)** -- network science researcher; checks every number against igraph or
  networkx; needs a methods sentence.
- **Dana Okafor (supply-chain-analyst)** -- supply chain risk analyst; SAP exports into Power
  BI; reports rankings to a VP.
- **Chris (ml-engineer-recsys)** -- ML engineer on recommendations; Parquet, notebooks, MLflow.

These are simulated voices, not real users. Treat every theme below as a hypothesis to test
with a task, not as evidence of behaviour.

## Transcript

Doubled speaker labels in the raw record have been collapsed to one.

### Round 1 -- first impressions

**Priya (cybersecurity-analyst):** I'll say the good part first, since there isn't much of it.
The top left reads "Nothing has been sent from this project", and the side rail says the
assistant is off and nothing is sent. That answers my first question before I ask it. Most
tools never answer it at all.

The result panel is close to something I could use. It shows "on: full graph, 300 nodes, 3
components", then "Exact. Undirected." and which engine ran it. It also says "Weight:
confidence, not used yet." That's the kind of line I'd paste into a case.

Here's what I don't like:

- **No time range.** Nothing on that line says what time window the number covers. In Splunk
  every search has one. If this is last month's export, the line has to say so.
- **"Not used yet" is confusing.** Is the weight used or not? One line up, Options says "None
  for this run". Two phrasings for one fact means I have to stop and check which is true.
- **The layout is organised around the graph, not my question.** Graph, Data, Notes. I start
  from a hypothesis and a query, and I can't find a box to type one into.
- **I'm a side branch in the storyboards.** The alert-triage storyboard follows Nadia and
  Sarah. The hunt that starts from a rule, which is me, comes after as one of two variants.

Where's the query box?

**Nadia (alert-reviewer):** Honestly? The alert board is the first one that looks like my day.
There's a table of alerts, each with its scenario, and I can see "One transfer of 9,000 to
9,999 USD". That's tuition, probably. I'd paste the account number and I'm done looking around.
But the left side has Graphs, Sets and paths, Styles and Views, and that's four words I don't
need to clear an alert. I just need one account and its transfers.

The protein one with the "a bigger amount means" radio buttons worries me. Why am I being asked
that? For an amount, a bigger amount is more money. If I pick the wrong one, does the number
change for everyone, or just for me? It doesn't say whether I changed the data or only my view.

"1,000,000 nodes not drawn" with "Narrow the graph..." is fine, I guess. It still doesn't tell
me which button gets me to one account in under a minute.

And "hop". One hop from what? If Sarah likes these storyboards, fine. She's level 2, she has
the hours for it.

**Emma (expert-emma):** My first impressions are mostly good, and I don't hand those out
easily. The left rail lists what the project holds: graph, results, notes. The Statistics box
gives nodes, edges, direction and "weight: confidence, not used yet" before I've touched
anything. That line alone is more honest than Gephi has been in ten years.

The Betweenness form refuses to run until I say what a higher confidence means. Good. What
worries me is "the answer is kept on confidence: every measure and the Path tool read it."
Betweenness wants confidence turned into a distance, while PageRank wants the raw value as a
strength. If I answer once for the column and the app quietly converts it for each measure, I
need to see that conversion on each run, not just once on the column.

Two more things. "Finished, unweighted. Undirected. Edit held." What is "Edit held"? I'd guess
"you changed something and it hasn't rerun yet", and I might be wrong. And the storyboards are
nice pictures of someone clicking. Where is the same run as a call I can paste into my
notebook? Without that, none of it is reproducible to me.

**Dana (supply-chain-analyst):** First impression: whoever set up that gallery organised it for
themselves, not for me. The storyboards are about protein interactions and money transfers.
None of them start with a messy SAP export, so I had to translate every screen into my own
world before I could judge it.

The run form I looked at says "Finished, unweighted" at the top. Further down it asks me to
decide what a higher confidence number means. For me that would be spend or lead time, and
those are opposite answers: more spend isn't a "longer step". I'm fine being asked. I'm not
fine if my answer quietly becomes the default for everyone's next run and nobody can see who
set it. The panel on the right still says "confidence, not used yet". So which one was the
result computed with? Two places on the same screen are telling me two different things.

The left rail is fine: Graph, Results, Notes. But nothing on screen tells me where my supplier
list is sitting, and IT will ask that before they look at anything else.

The table is where I'd actually live. Show me that first.

**Chris (ml-engineer-recsys):** The rail on the left, with Graph, Data, Notes and Assistant, is
clear enough: objects on the left, the thing I selected on the right, a table at the bottom. I
found my way around without reading the help, and that's rare for me.

What bugs me is the storyboards. Every one runs on the March transfers fraud demo. I have no
user-item graph, no two node types, and nothing that looks like my Parquet with my own ids. So
everything I'm judging, I'm judging on someone else's data.

The part I actually liked is small. The path bar says "Weight: amount, not used yet", and the
scope line says "Filtered: 1,071 of 3,000 nodes". That's a denominator, and it's what I check
first on any number. A frozen set that records how it was made ("Neighbors of ACC-893168,
Follow In, Full graph") is close to something I could defend to a reviewer.

What I want to see: when weight IS used, does that line change to say how? For a transfer, a
bigger amount means a stronger link. For a path search it has to be treated as a cost, where
bigger means further. Those are opposites, so a single "amount" column doesn't tell me which
one I got.

My first impression is honest bookkeeping on a toy dataset, and I'll hold my praise until I see
it run on mine.

### Round 2 -- trust

**Priya (cybersecurity-analyst):** Dana's right that there are two answers on one screen, and
I'd put it more strongly: to me that's a trust failure, not a style issue. If the state line
says "unweighted" and the side panel says "confidence, not used yet", I can't tell which one
the number came from. So I don't report it.

Emma wants the conversion shown on every run. I agree, but it's not enough for me on its own.
The run has to record who answered "bigger means" and when, the same way a Splunk search keeps
its time range and owner. Without that, next month's rerun is a different number and nobody
can say why.

Nadia's question, "did I change the data or only my view?", is the one I'd want answered
first. I've pasted a count into a ticket that turned out to be filtered, and I'd rather not do
that again.

Here's what's still missing for me:

- A time window on every result.
- A text query I can save and run again.
- A copy button that brings the scope line along with the number.

Until those are there, I'll check every figure in my notebook before I trust it.

**Nadia (alert-reviewer):** I agree with Dana. If I set "a bigger amount means" for an amount
column and that quietly becomes everyone's default, QA pulls my alert file and I can't show who
set it or when. I'd rather the app never ask me that at all. On a transfer, the amount is
money. Somebody above me should set that once, with their name on it.

Emma wants a call she can paste into her notebook. I don't have a notebook. I have a
disposition box, and what goes in it is one sentence: what fired, what I looked at, why I
closed it. "Weight: amount, not used yet" isn't that sentence. It makes me stop and ask whether
the number I'm about to paste counted the money or not.

The analyst in round 1 asked where the time range is, and I'm asking it louder. My alert covers
a period. If the screen doesn't say "March 1 to 31", I can't use the number.

What's missing for me is one line I can copy that already reads like a reason.

**Emma (expert-emma):** Dana has the most important point. If my answer about what a bigger
weight means becomes the default for everyone's next run, then the column carries an
interpretation that nobody signed. I'd rather answer on every run and see the answer on the
result line. Something like: "weight: confidence, inverted to distance, 1/w". Tell me the
formula. If it's 1/w, 1-w or -log w, those give different shortest paths, and "inverted" alone
doesn't tell me which.

I agree with the ML engineer. One word covering two opposite meanings is the actual bug here.

I disagree with Nadia on one point. "More money" is not obviously "bigger". For a path, more
money is a longer step or a shorter one depending on the question, so the app is right to ask.
It just shouldn't be Nadia who answers it.

Here's what's missing:

- The API call.
- The seed.
- Whether a tie was broken by node order.

If I import the same file twice and get two orders, I'm done with the tool.

On trust: the "Nothing has been sent" line is good. I'd still want to see it confirmed
somewhere I can check, not just stated.

**Dana (supply-chain-analyst):** Trust first. I agree with Emma, and more strongly than she put
it. For my data, "bigger means" isn't a property of the column. Spend is a strength when I'm
asking who we depend on. Lead time is a cost when I'm asking how long a disruption takes to
reach us. The same export gives me both answers, so the choice belongs on each run and has to
be printed on the result. A single default that somebody set once on the column is how I end
up putting the wrong number in front of a VP.

Nadia asked whether picking the wrong answer changes the result for everyone. That's my
question too. The screen has to say who set the default and when.

On fit: the ML engineer's point about the denominator is right. "1,071 of 3,000" is what I
check first. My version is "of 1,400 suppliers, sub-tier known for 18% of spend". If that
coverage figure isn't beside the chokepoint score, the score is lying by omission.

On what's missing, I'll disagree with the cybersecurity analyst. I don't want a query box. I
want to start from my supplier table, see the weights sitting in its columns, and then ask the
question.

**Chris (ml-engineer-recsys):** Emma's right, and I'd push it further. What a bigger weight
means belongs to the run, not the column. On my graph, "clicks" is a strength when I run
PageRank and a cost when I run a shortest path, and I'd run both in the same afternoon. A
column default is fine as a convenience, like a default argument. But every result has to state
what it actually used, in the same words each time: "Weight: clicks, read as cost (1/x)". It
shouldn't say "not used yet" in one place and "Finished, unweighted" in another. Dana caught
that too, and it's the thing that would make me stop trusting the whole screen.

Nadia, it's fair to ask whether your answer changed the data or just your view. I'd want an
audit trail answering that, like an MLflow param: who set it and when.

What's missing for me: I can't see the run config as something I can copy. There's no seed, no
version, no "this ran on the snapshot from date X." Without those I can't reproduce it, and if
I can't reproduce it, it doesn't go in my writeup.

### Round 3 -- what would make you switch, or quit

**Priya (cybersecurity-analyst):** The thing that would make me quit is one wrong number. I
paste a count into a case, a reviewer reruns it next month, and gets something different. On
screen right now, nothing would tell either of us why.

Emma and the ML engineer both say "bigger means" belongs to the run. I agree, but a label on
the result doesn't finish the job for me. The run has to keep who answered it, when they
answered, the time window, and the formula. It needs all four, just like a saved search keeps
its owner and its time range. Nadia wants one pasteable sentence, and I want the same thing:
copy the number and the scope line comes with it.

Dana, I still disagree about the query box. You can start from your table, fine. My hunts start
from a rule, and a rule I can't type and save is a rule I rebuild by hand every month.

So the one change I'd ask for is a saved query that stores its own weight answer and time
window, reruns by name, and tells me what changed since last time. With that, I'd move work
over from my notebook. Without it, the notebook stays the record and this is just a picture.

**Nadia (alert-reviewer):** Here's what makes me quit, and fast: one alert that takes longer
here than in the case system. If I have to decide what "a bigger amount means" before I get my
number, that's the extra minute. Thirty alerts on day twenty-nine makes that thirty minutes.
I'm back in the case system by lunch.

Emma and Dana both want that choice on every run. That's fine for them because they run one
thing all afternoon. I run the same check forty times a day. So someone above me should set it
once with their name on it, and my screen should show that name. I shouldn't be answering it.

The ML engineer wants seeds and versions. I don't. QA won't read those.

What would make me switch is one button that copies a sentence I can drop straight into the
disposition box. Something like: "ACC-893168, March 1 to 31, 4 transfers out totalling 38,200
USD, amounts counted as money, set by Team Lead, nothing filtered." Put a picture next to it
and I'll use the tool.

The thing to change: stop asking me questions my team lead should answer. And never let me
copy a number without the period and the filter coming along with it.

**Emma (expert-emma):** What would make me quit is simple. I import the same GraphML twice, run
the same measure, and get two different orders, with nothing on screen saying why. If the tie
was broken by node order or by an unstated seed, the ranking is an artefact of the file and not
a finding. After that I go back to igraph and never open the app again.

What would make me switch, at least for the handoff part of my job, is a result line that works
as a methods sentence. It would say the algorithm, the normalization, the weight column, the
transform (1/w, 1-w or -log w, not just "inverted"), the seed, the tie rule and the snapshot
date. It would also have a copy button that produces the same run as a call I can paste into a
notebook.

The ML engineer wants an audit trail like MLflow params. That's right, but it's a subset of
what I'm asking for. Priya wants a time window, and I'd put that inside the same line rather
than in a separate field. I still disagree with Nadia: she shouldn't be the one answering
"bigger means", but it has to be asked.

The one thing to change: every number carries its full recipe, in one line, in the same words
every time.

**Dana (supply-chain-analyst):** I'll quit the first time I copy out a number and can't tell
what it was computed with. Last year I sent a VP a "top chokepoints" list, and the ranking
turned out to be weighted by spend when he'd asked about lead time. I'm not doing that again.
So the thing I'd change is this: each result gets a single line that travels with it when I
copy it. It needs to say which column was used, what bigger meant for this run, who set it, the
date, and my coverage, something like "sub-tier known for 18% of spend". I don't want it in one
place on screen and contradicted in another.

Emma wants formulas and the ML engineer wants a seed. Fine, put them in Details. I can't read
"1/w" to a VP, though. The line has to be in words.

Priya wants a query box. I don't, and she hasn't changed my mind. If this starts from my
supplier table with the columns I recognise, I'd switch off Power BI network visuals tomorrow.
If it starts from a protein demo and a query box, IT's security review will outlast my
patience.

**Chris (ml-engineer-recsys):** Two things would make me quit. The first is if I can't get my
Parquet in with my own user and item ids intact. The second is if I copy a number out and later
find it was computed some other way than the screen said. The second is worse, because the
first only costs me an afternoon and the second ends up in a writeup.

Dana is right that "bigger means" belongs to the run, and I'd stop arguing about the column
default. Keep it, but have every result print the weight it actually read, how it was read, and
the formula: "clicks, read as cost, 1/x". Emma asked for the formula and I agree. Otherwise
"inverted" is a magic number.

Priya, I don't need a query box. I need a copy button that brings the scope and the weight
along with the number, so it drops into MLflow as params.

Nadia, you shouldn't have to answer "bigger means" at all. That's fine. Just show the name of
whoever did.

I'd switch for one change: every copied number arrives with its denominator, weight reading,
seed and snapshot date in the same line. If that's there, I'd use this over my notebook for
debugging.

## Themes

Severity uses Nielsen's 0-4 scale (4 = must fix before release). "Voiced by" counts who raised
or endorsed the point in their own words, not who merely did not object.

### 1. The screen gives two answers to "was the weight used?" (severity 4)

Voiced by 5 of 5: Priya, Dana, Chris, Emma, Nadia.

On one screen the run state line says "Finished, unweighted", the Options block says "None for
this run", and the side panel and Statistics box say "confidence, not used yet". Priya and Dana
raised it in round 1, and by round 2 it was the group's central trust complaint. Priya called it
"a trust failure, not a style issue" and said she would not report a number she could not place.
Chris said it would make him stop trusting the whole screen. Nadia's version is that "not used
yet" makes her stop and ask whether the number counted the money. Emma could not decode "Edit
held" in the same state line.

- Agreement: total. Nobody defended the current wording.
- The fix the group converged on: one phrasing for the weight fact, the same words in every
  place it appears, and a statement of what the number actually used, never "yet".
- Fidelity check before acting: the run form may be showing a previous run's state beside a
  pending edit (which is what "Edit held" may have meant). If so, the contradiction is partly a
  static-mock artifact of two moments on one frame. It still needs fixing, because a reader who
  cannot tell "last run" from "next run" on the same panel has the same problem in the real app.

### 2. What "bigger means" belongs to the run, and each result must print it (severity 3)

Voiced by 4 of 5: Emma, Chris, Dana, Priya. Nadia agrees that it must be visible but dissents
on who answers it (theme 4).

The same column is a strength for one measure and a cost for another: confidence for PageRank
versus Betweenness (Emma), clicks for PageRank versus shortest path (Chris), spend versus lead
time for "who we depend on" versus "how long a disruption takes" (Dana). The form's promise that
"the answer is kept on confidence: every measure and the Path tool read it" worried all four,
because it reads as one answer silently reused for opposite questions. Chris and Emma called the
single word covering two opposite meanings "the actual bug".

- Agreement: the result must state the weight it read and how it read it, in the same words on
  every result.
- Unresolved in round 2, settled by round 3: a column default is acceptable as a convenience
  (Chris: "like a default argument"), provided each result prints what was used. Dana held the
  strongest line in round 2 ("the choice belongs on each run") and did not object to Chris's
  round-3 compromise; Emma still wants the question asked on each run.
- Formula versus words: Emma and Chris need the transform (1/w, 1-w, -log w; Emma notes these
  give different shortest paths). Dana cannot read "1/w" to a VP and wants the line in words
  with formulas in Details. The group's implied design is words on the line, formula one step
  away and in the copied text.

### 3. Who set the reading, and when (severity 3)

Voiced by 5 of 5: Priya, Nadia, Dana, Chris, and Emma ("an interpretation that nobody signed").

Every participant wanted a name and a date on the weight reading. The motives differ: Priya for
reruns next month, Nadia for QA pulling her alert file, Dana to show who set the default, Chris
as an audit param. This is the one requirement that also resolves the Nadia-versus-Emma dispute
(theme 4): if the reading carries its author, it can be set by a team lead and still be visible
to the reviewer.

### 4. Who should be asked "bigger means" at all (severity 3 for high-volume reviewers)

Voiced by Nadia (strongly, all three rounds); Emma and Chris agree she should not be the one
answering; Dana and Emma still want it asked of analysts.

Nadia runs the same check forty times a day. An extra question per alert is, in her arithmetic,
thirty minutes on a heavy day and a reason to return to the case system. She wants it set once
by someone above her, with their name shown on her screen. Emma disagrees that "more money is
obviously bigger" (for a path it depends on the question) but agrees the question is not
Nadia's. This is real dissent about role, not about the need: the group agrees the question is
necessary and disagrees about who answers it. That splits cleanly by role (reviewer versus
analyst), which points at a default with a named setter rather than a single behaviour for
everyone.

### 5. Did my answer change the data, or only my view? (severity 3)

Voiced by 4 of 5: Nadia (raised it), Priya ("the one I'd want answered first"), Dana, Chris.

No screen says whether answering the weight question changes the project for everyone or only
the current run or reader. Priya connects it to pasting a count that turned out to be filtered.
This is a scope-of-effect question the form must answer at the moment it is asked.

### 6. Copying a number must carry its recipe (severity 3)

Voiced by 5 of 5 by round 3.

Everyone asked for a copy that brings the context along. What each wants in it differs, which is
the useful part:

| Participant | Where the copy goes | What it must contain |
|---|---|---|
| Nadia | disposition box, read by QA | one sentence: account, period, the count, how amounts were read, who set it, "nothing filtered" |
| Dana | a VP | words, not formulas: column, what bigger meant, who set it, date, coverage |
| Priya | an incident case | the scope line, time window, who answered, formula |
| Emma | a methods section and a notebook | algorithm, normalization, weight, transform, seed, tie rule, snapshot date; plus the run as a code call |
| Chris | MLflow params | denominator, weight reading, seed, snapshot date |

The shared core is scope and filter, weight reading, period or snapshot date, and who set the
reading. Seed, tie rule and code call matter only to Emma and Chris; Nadia dismissed them ("QA
won't read those"). The group's implied shape is one plain-words line with a details layer
behind it.

### 7. No time window on a result (severity 3)

Voiced by 4 of 5: Priya (all three rounds), Nadia ("March 1 to 31"), Emma (inside the result
line), Chris and Dana (as a snapshot or date). Priya raised it first and the others adopted it,
so it is partly echo (see group-think), but Nadia's alert-period reason and Chris's snapshot
reason are independent.

### 8. The denominator earned praise; coverage is the missing half (severity 2)

Praised by Chris and Dana; Nadia's "nothing filtered" is the same idea from her side.

"Filtered: 1,071 of 3,000 nodes" and "on: full graph, 300 nodes, 3 components" were the most
praised lines in the session. Dana extends the idea to data coverage ("sub-tier known for 18% of
spend"): a score without how much of the network is actually known is "lying by omission". That
extension is single-domain but plausible anywhere data is incomplete.

### 9. Reproducibility: seed, tie rule, version, snapshot (severity 3 for code users, 0 for reviewers)

Voiced by Emma and Chris; Priya indirectly (the rerun next month). Nadia rejected it for her
role; Dana wants it in Details.

Emma's quit condition is the same file imported twice giving two orders with no explanation.
Chris's is a number that turns out to have been computed differently from what the screen said.
Both need the seed and the tie rule recorded, and Emma needs the run as a code call.

### 10. The storyboards are not their starting point (severity 2; partly a fixture artifact)

Voiced by 4 of 5: Dana (no SAP export), Chris (no user-item graph, no Parquet), Priya (the rule
hunt is a side variant), Nadia (four rail words she does not need to clear an alert).

Each wanted a different entry: Dana a table of her columns, Priya a query, Nadia one account,
Chris his own ids. This is a real signal about entry points but a weak signal about the screens
under review, because the complaint is mostly about demo data (see group-think).

### 11. Unprompted praise

- "Nothing has been sent from this project": Priya, Emma. Emma adds she wants it checkable, not
  only stated.
- The weight line existing at all: Emma ("more honest than Gephi has been in ten years"), Priya
  ("the kind of line I'd paste into a case").
- The Betweenness form refusing to run without an answer: Emma.
- The frozen set recording how it was made: Chris.
- The alert board: Nadia ("the first one that looks like my day").
- Rail, selection panel, bottom table layout learnable without help: Chris; Dana would live in
  the table.

### Single-voice items (not group findings)

- A saved text query that stores its weight answer and time window, reruns by name and shows
  what changed (Priya). Dana and Chris explicitly dissented; Dana wants to start from her table.
- "Edit held" is unreadable (Emma).
- "hop" is jargon (Nadia).
- Nothing says where the supplier data is stored; IT asks that first (Dana).
- Getting Parquet in with user and item ids intact (Chris).

## Dissent

- Query box: Priya for; Dana and Chris against; Emma and Nadia silent. Unresolved.
- Who answers "bigger means": Nadia wants never to be asked; Emma and Dana want analysts asked
  on every run; Chris accepts a column default if each result prints what was used.
  Unresolved, but a named default plus per-run override would satisfy all five as stated.
- Formula on the line: Emma and Chris yes; Dana no (words on the line, formula in Details).
- Seeds and versions: essential to Emma and Chris, irrelevant to Nadia.

## Group-think to discount

- Topic priming. The session was framed around what a number used, and the weight line was on
  most screens shown. Five of five converging on weight provenance says the topic was salient,
  not that it outranks the entry-point complaints (theme 10) in real use.
- Cascade after round 2. Once Emma and Dana put "bigger means belongs to the run" strongly,
  Chris, Priya and Nadia each opened by agreeing with a named participant before adding their
  own point. Chris explicitly withdrew his objection ("I'd stop arguing about the column
  default"). Count theme 2 as three independent voices (Emma, Chris, Dana in round 1-2), not
  five.
- Borrowed phrasing. "One pasteable sentence", "the scope line comes with it" and "who set it
  and when" were repeated verbatim across speakers in round 3. The agreement on theme 6 is real,
  but its wording is the group's, not five separate formulations.
- The time window. Priya asked in round 1 and Nadia said she was asking "louder"; Emma and
  Chris folded it into their own lists. Independent reasons exist for Nadia and Chris; the
  others are echo.
- Mock fidelity. The two-answers contradiction (theme 1) may be partly two states of a static
  frame; the demo-data complaint (theme 10) is about fixtures, not design. Both need a check
  against the live screens before they are weighted as design defects.
- Quit questions invite drama. Round 3 asked what would make each person quit; the absolute
  statements there ("never open the app again", "back in the case system by lunch") are
  rhetorical and should be read as priority, not prediction.
- Simulated participants built from personas will voice their persona's known concerns
  (Emma's reproducibility, Nadia's throughput). Those are expected, not discovered.

## What to test next

Tasks written so they do not name the answer:

1. Show the run form and result panel together. "Was the weight used for the number on the
   right? How do you know?" Measure answer and time; record which line they read.
2. After answering the weight question: "Your colleague runs PageRank tomorrow on this project.
   What will it use for the weight?" Tests whether the scope of the answer is understood.
3. "Put this result into a note for your reviewer." Observe what they copy and what is missing
   from what arrives.
4. For a high-volume reviewer: clear five alerts in a row. Count how often the weight question
   interrupts and how long each clear takes.
5. "Who decided how amounts are counted in this project?" Tests whether a named setter is
   findable.
