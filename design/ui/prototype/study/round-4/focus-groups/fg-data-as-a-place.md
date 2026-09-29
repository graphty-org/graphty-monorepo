# Focus group: the Data panel as a place

Five simulated participants looked at the Data panel mock: a project with a left rail of Graph,
Data and Notes, and a Data panel listing Sources, Versions, "Recipes applied", "Style files" and
"Sent and saved from this project". The loaded file is transfers-2026-03.csv (9,113 transfers).
In round 1 each participant spoke alone. In round 2 each had heard the others and was asked what
would make them switch to the tool or quit it.

Participants: a fraud analyst (bank), an intelligence analyst (law enforcement, phone returns),
a cybersecurity analyst (threat hunting), a supply-chain analyst (supplier data, Power BI user),
a knowledge engineer (RDF and SPARQL).

These are simulated voices. Treat every finding below as a hypothesis for real users to confirm.

## Transcript

### Round 1

**Fraud analyst:** Okay. Left rail says Graph, Data, Notes. Fine, that's my case file, as far as I can tell. The Data panel is the first thing I'd actually trust, because it names my file, transfers-2026-03.csv, 9,113 transfers, and lists from_account, to_account, amount and timestamp. That's my statement export, so I know where I am. "Amount not used yet" worries me, though. The money is the case. Why would the tool ignore it by default?

Two lines at the top I'd read closely: "Nothing has been sent from this project" and "Sent: nothing. The Assistant is off." Good. That's the first question my manager asks. But "Saved: nothing yet" isn't a record I'd show anyone. I'd need dates, file names and who did it.

"Update with new data..." is what I'd look for when April lands. Whether it replaces March or adds to it, I can't tell from here.

"Recipes applied" and "Style files" mean nothing to me. I wouldn't touch them. The right-hand side says "Style stack" and "Results" and both are empty. The picture in the middle is a grey blob. Where's my account? I'd want a search box first.

**Intelligence analyst:** Before I get into the layout, let me say what happens now when a new month comes in. The carrier sends the next return. I clean the numbers, add them onto the old sheet in Excel, and redraw the chart in i2. Half the time I can't say what changed since last month.

So on this Data panel, the first thing I found without anyone pointing was "Update with new data...". That's my monthly job, so good. "Versions" showing the March file as "current" makes sense to me. It's what I'd hand a prosecutor when he asks which return a chart came from.

"Recipes applied" means nothing to me. Is that cooking? "Style files" I'd skip.

The line at the top, "Nothing has been sent from this project", is the first thing I'd read. The same goes for "Sent and saved" at the bottom. But "Sent: nothing" is the tool's word for it. IT will want to know where it was saved, when, and by whom.

There are three places that say Export or Change. Which one is the real one?

And where's my caller and callee? It says "from_account". Fine, but I'd want to tell it which column is which myself.

**Cybersecurity analyst:** Before I look at anything else I check whether it calls out. Two places answer that, and I found both on my own. "Nothing has been sent from this project" sits under the title, and the rail says "Assistant Off. Nothing is sent." Good. But it's saying that about itself, and I still can't check it. Does that count cover telemetry, or only the Assistant?

The left rail has three things, Graph, Data and Notes. That's simple enough. Data reads top to bottom as file, columns, versions, then what left the machine, which roughly matches how I think about a load.

My problem: "Recipes applied" and "Style files" sit between Versions and "Sent and saved". I don't know what a recipe is. Is it my saved query? If it is, call it a query. Last month I re-ran a hunt on a new export, and the first thing I needed was the query, not the colours.

The file is "transfers-2026-03.csv", but I don't see a time range anywhere. Does "Apr 2" mean the day I loaded it or the data's range?

The right panel repeats the load sentence word for word from the left. Why do I need it twice?

Found without pointing: the "Nothing has been sent" line, the "Sent and saved from this project" section, and "Update with new data...". I did not find a query box.

**Supply-chain analyst:** Okay. Down the left side there's Graph, Data and Notes. That part I get. Data is where my files live, so that's the first place I'd go.

First thing I noticed was the little line up top: "Nothing has been sent from this project." That's the only sentence in here my IT people would care about, and it's in small print. There's a whole "Sent and saved" box too, but it's right at the bottom and I had to scroll to find it. That belongs at the top.

Sources makes sense to me. It shows the file name and date, then what each column means in plain words ("where each transfer starts"). That's good. It's the step Gephi made me guess at.

"Versions": fine, like saving March and April copies of the same workbook.

"Recipes applied" and "Style files": no idea. Recipes for what? I'd leave those alone.

Also, most of this text is small and grey. On my laptop at 110% zoom I'd be squinting.

Real question: "Update with new data" is what I'd do every month. Does it keep my setup or make me start over?

**Knowledge engineer:** Before any opinion, my last concrete case: when March's load came in, I diffed the class counts against February's in SPARQL before I trusted anything. That is my lens here.

The rail reads as three places: Graph, Data, Notes. Fine. I found Data myself. "Assistant: Off. Nothing is sent." is the first thing I check, and it is there without me asking. The line under the project name, "Nothing has been sent from this project", is also good, if it is true.

Sources is where I expected it to be. It lists the columns with a role for each: "Where each transfer starts", "Where each transfer ends". So the tool says what it thinks my data IS. That is the right instinct. Versions I understand, since it is a load history. "Recipes applied" and "Style files" mean nothing to me. Recipe for what? A mapping? A query?

Two objections. On the right, "accounts 3,000 / transfers 9,113" does not say which is nodes and which is edges. I can guess, but I should not have to. And why is Export a button in the Data header? Export is output, and Data should be input.

Found without pointing: Data, Sources, Versions, "Update with new data...", "Sent and saved from this project".

### Round 2

**Fraud analyst:** The intelligence analyst said it best: "IT will want to know where it was saved, when, and by whom." That's the part I care about most. Last quarter an examiner asked me which statement pull a chart in a SAR came from. I spent a morning digging through my Downloads folder. If "Sent and saved" can't give me the file name, the date, my name and which version of the data it came from, it's no good to me. And the supply-chain analyst is right that it belongs at the top, not somewhere I have to scroll to.

The cybersecurity analyst's question worries me as well. Does "Nothing has been sent" include telemetry? If IT finds even one call home that the tool didn't mention, the tool is dead at my bank, and I'm the one who put it forward.

Everyone here passed over "Recipes" and "Style files". So did I, and I'd keep passing them over.

What would make me quit is April overwriting March without asking. What would make me switch is a record I could print and attach to the case file.

Found without pointing: "Update with new data...", "Sent and saved", the "Nothing has been sent" line. Not found: any search for an account.

**Intelligence analyst:** Picking up what the fraud analyst said: "Saved: nothing yet" is not a record. It's the same for me. Last spring a defense attorney asked in discovery which phone return a chart was built from, and on what date. I had to dig through my Outlook to answer. If this panel can't give me the file, the date, who loaded it and where it went, I'll go back to keeping my own log in Excel. And once I'm keeping my own log, why use this tool at all?

The supply chain analyst asked whether "Update with new data" keeps my setup. That's the question I'd quit over. If April wipes out my March chart, I'm done with it. What I need is for it to show me who is new since March.

The cybersecurity analyst is right about recipes. If it's a saved search, call it a saved search.

I'd switch for one thing, a sheet I can print and hand to the prosecutor. It lists every source, when each version came in, and what left the building.

**Cybersecurity analyst:** The knowledge engineer asked me to give a past case first, so here's mine. Last month I re-ran an off-hours lateral movement hunt on the new auth export. What I had to carry over was the query and the time range. Everything else I rebuilt.

The fraud analyst is right that "Saved: nothing yet" isn't a record. My version is harder. My IR lead will ask what left this machine, when it left and where it went. A list that includes telemetry is the only answer she'll accept. If this record only covers the Assistant, I'd call it marketing.

The supply chain analyst asked whether "Update with new data" keeps her setup. That's my switch-or-quit question too. If April comes in and my query doesn't re-run against it, with the new time range shown next to the counts, I'm back in my notebook. If it does, I'd use this monthly.

The knowledge engineer is right about Export too. It sitting in the Data header confused me. For me export means a CSV of the matches, taken from wherever the matches are. The Data panel is the wrong place for it.

Things I'd never touch: "Recipes" and "Style files", until someone tells me whether a recipe is my query. Missing: the data's time range, and a query box.

**Supply-chain analyst:** I'm with the fraud-analyst on "Saved: nothing yet". Last spring IT security asked me where our supplier data had gone. I gave them a list with file names, dates and who sent each one. That's the record they'll want, and it needs to be at the top of the panel, not under Recipes. I'd have missed it too, same as the cybersecurity-analyst nearly did.

The knowledge-engineer asked why Export is in Data, and I agree. I'd look for "make a slide for my VP" next to the picture, not next to my files. Three ways in just makes me wonder which one is the proper one.

What makes me switch: the April file comes in, I click "Update with new data", and everything I set up for March is still there. That means my column meanings and my colours. And it tells me which suppliers are new and which dropped off. Power BI can't do that for me.

What makes me quit: if Update starts me from scratch, I'm gone. Same if the recipes turn out to hold my setup and I've deleted them because nobody told me what they were. Also the small grey text. I'd bump the zoom once, and if it still broke I'd give up.

**Knowledge engineer:** I agree with the cybersecurity analyst: "Nothing has been sent" is the tool vouching for itself. When I sign off a governance report, I attach the SHACL validation log, not a sentence. If the app can't show me a record of each thing sent or saved, with the time, the file and the destination, then that line is a claim. I can't check it.

The fraud analyst's point about "Amount not used yet" is the important one. The tool decided on its own what my data is. For me it's worse. The file I'd load is a subject, predicate, object CSV. If it can't map predicate to the edge label, and can't keep literal-valued rows from turning into nodes, I close it. Nothing I've seen on this panel shows it can do either.

"Recipes" is the wrong word in three people's mouths now. If it means a column mapping, call it a mapping and let me read it.

What would make me switch: after "Update with new data", a diff of counts by column role, last version against this one. I do that today in SPARQL.

What would make me quit: a single unlabelled count.

## Themes

Counts are out of five. "Round 1" counts only what a participant said before hearing anyone else;
that is the independent evidence. Severity uses Nielsen's 0-4 scale (4 = usability catastrophe).

### 1. "Update with new data" must keep the setup and say what changed -- severity 4

- Round 1 (independent): 5 of 5 found the command unprompted. Three raised the open question
  themselves: the fraud analyst (replace or add?), the supply-chain analyst (keep my setup or
  start over?), the intelligence analyst (today "I can't say what changed since last month").
- Round 2: 5 of 5 named it as the switch-or-quit point, each with different content:
  - fraud analyst: quits if April overwrites March without asking
  - intelligence analyst: wants "who is new since March"
  - cybersecurity analyst: the saved query must re-run on the new data, with the new time
    range shown beside the counts
  - supply-chain analyst: column meanings and colours must survive; show suppliers added and
    dropped
  - knowledge engineer: a diff of counts by column role, previous version against this one
- Agreement: full. Dissent: none.
- Discount: the round 2 framing ("what would make you switch or quit") made every participant
  point at one pivot, and the supply-chain analyst's question was repeated by name twice. The
  underlying need survives the discount because every participant brought a different concrete
  monthly routine and a different thing that must carry over.
- What the mock shows today: nothing answers replace-or-append, what carries over, or what
  changed.

### 2. "Sent and saved" is a claim, not a record -- severity 4

- Round 1 (independent): 5 of 5 read the "Nothing has been sent" line first or early. Three
  said a sentence is not enough: the fraud analyst (needs dates, file names, who), the
  intelligence analyst (where, when, by whom), the cybersecurity analyst (the tool vouches for
  itself; does it cover telemetry or only the Assistant?).
- Round 2: 5 of 5 asked for a per-event record: what, when, who, where it went, and from
  which version of the data. Each gave a distinct past case (a bank examiner's question about
  a suspicious-activity report, a discovery request, an incident-response lead, an IT security
  audit of supplier data, a governance sign-off backed by a validation log).
- Two sub-needs that are not unanimous:
  - the record must cover telemetry, not only the Assistant: cybersecurity analyst (origin),
    fraud analyst and knowledge engineer in agreement. 3 of 5, one independent.
  - a printable sheet to attach to a case file: fraud analyst and intelligence analyst. 2 of 5.
- Agreement: full on the need. Dissent: none.
- Discount: the exact field list ("where, when, by whom") was the intelligence analyst's
  wording and the fraud analyst quoted it directly. Treat the field list as one voice; treat
  the need for a record as five.
- Mock-fidelity caveat: whether the count covers telemetry cannot be tested on a mock. The
  finding is about the wording and whether the page shows its scope, not about behaviour.

### 3. "Recipes applied" and "Style files" are not understood -- severity 3

- Round 1 (independent): 5 of 5 did not know what either means and said they would not touch
  them. This is the cleanest finding in the session: unanimous before anyone heard anyone.
- Guesses differ, which is itself the finding: a saved query (cybersecurity analyst), a
  mapping or a query (knowledge engineer), cooking (intelligence analyst).
- Round 2 added a risk: the supply-chain analyst fears deleting them if they turn out to hold
  the setup; the cybersecurity analyst would not touch them until told.
- Discount: the intelligence analyst's round 2 "call it a saved search" adopts the
  cybersecurity analyst's guess; it is not evidence that users think a recipe is a query. The
  knowledge engineer's "three people's mouths" counts echoes.

### 4. Export sits in the wrong place, and there are three of it -- severity 2

- Round 1 (independent): 2 of 5. The intelligence analyst saw three Export or Change entries
  and could not tell which is real; the knowledge engineer said Export is output and does not
  belong in the Data header.
- Round 2: the cybersecurity analyst (export means the matches, from wherever the matches are)
  and the supply-chain analyst (a slide belongs next to the picture) agreed.
- Discount: two of the four are round 2 agreement. The supply-chain analyst's "three ways in"
  repeats the intelligence analyst's point.

### 5. Who decides what the columns mean -- severity 3, with dissent

- Praise, independent: the supply-chain analyst (plain-language roles fix the step Gephi made
  her guess at) and the knowledge engineer (the tool saying what it thinks the data is "is the
  right instinct").
- Objection, independent: the fraud analyst ("Amount not used yet": the money is the case; why
  ignore it by default?) and the intelligence analyst (wants to say which column is caller and
  which callee himself).
- Round 2: the knowledge engineer moved toward the objection: the tool decided on its own, and
  nothing on the panel shows it can map a subject-predicate-object file (predicate as the edge
  label, literal values kept off the node list).
- Reading: participants like seeing the roles and dislike not being asked. The dissent is about
  control, not about showing roles.

### 6. Unlabelled counts -- severity 3, one voice

- The knowledge engineer only: "accounts 3,000 / transfers 9,113" does not say which is nodes
  and which is edges. In round 2 he named "a single unlabelled count" as a quit reason.
- One voice, but a strong one; worth a first-click or comprehension check before acting.

### 7. No way to find one thing: search or query -- severity 3, two voices

- Fraud analyst: "Where's my account? I'd want a search box first." (both rounds)
- Cybersecurity analyst: no query box (both rounds).
- 2 of 5, both independent. This may belong to the Graph place rather than Data; the group was
  looking at Data.

### 8. Placement of "Sent and saved" -- severity 2, one origin

- The supply-chain analyst had to scroll to it and wants it at the top. The fraud analyst
  agreed in round 2.
- Dissent: the cybersecurity analyst said the top-to-bottom order (file, columns, versions,
  what left the machine) "roughly matches how I think about a load".
- Discount: the supply-chain analyst's round 2 claim that the cybersecurity analyst "nearly
  missed" it contradicts his own round 1 report that he found it without pointing. Treat this
  as one voice plus one echo.

### Single-voice observations (do not act on without more evidence)

- No time range for the data; "Apr 2" is ambiguous between load date and data range
  (cybersecurity analyst). Linked to theme 1, where he wants the range next to the counts.
- The right panel repeats the load sentence from the left (cybersecurity analyst).
- Small grey text, a problem at 110% zoom (supply-chain analyst). Possibly a mock styling
  artifact; check the real type scale before acting.
- The graph is a grey blob and the right panel's Style stack and Results are empty (fraud
  analyst). Likely a mock-fidelity artifact of an unstyled first load.

## Group-think and artifacts to discount

- Quoting instead of adding: round 2 opened with direct quotes of earlier speakers in four of
  five turns. Agreement that only restates an earlier line adds no evidence; the counts above
  separate round 1 (independent) from round 2 (possibly echoed).
- Prompt-shaped convergence: the switch-or-quit question gave every round 2 turn the same
  shape and pulled all five toward "Update with new data". The distinct routines each described
  are the evidence, not the unanimity.
- Misattribution: one participant attributed a near-miss to another who reported the opposite
  (theme 8).
- Finding is not using: "found without pointing" on a static mock means the label was visible
  and readable, not that the command would be discovered or understood in use. It says nothing
  about what "Update with new data" does, which is where the severity sits.
- Simulated personas lean toward their scripted concerns (audit trails for the regulated roles,
  query reuse for the hunter, schema for the knowledge engineer). The unanimous round 1 findings
  (themes 1, 2 and 3) are the least exposed to that.
