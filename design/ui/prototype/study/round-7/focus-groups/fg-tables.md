# Focus group: loading three tables into one graph

The six participants are simulated personas, not real people. Their findings rank below anything the owner writes in owner-feedback.md.

The screen under discussion is the table-import screen. On the left are three source tables (people, buildings, entries). In the middle is a grid of rows. Across the top is a summary line: "person (412) --entries (4,180 edges from 4,212 rows)--> building (9)". At the bottom is a match report that lists 25 swipes whose person is not in people and 7 whose building is not in buildings, with "Leave out" already selected for both, then 3 ids that differ only by leading zeros ("not merged"), and 1 repeated person id ("kept the first"). The scenario uses badge-swipe data from March 2026.

Participants: Min-ji Kim (knowledge engineer), Priya (cybersecurity analyst), Alex (data analyst), Elena (spreadsheet explorer, new to graphs), Dana (supply-chain analyst), Chris (ML engineer, recommender systems).

## Transcript

### Round 1: first read of the screen

**knowledge-engineer:** Min-ji Kim (knowledge engineer): The first thing I read was the grey line across the top: "person (412) --entries (4,180 edges from 4,212 rows)--> building (9)". That is the schema. Two classes and one predicate, with counts, before I load anything. I like that, and it is closer to what I draw by hand than anything else on this screen. The table list on the left reads like my mapping files, one source per row, so the organization makes sense to me.

Now the parts I distrust. On people, id 1188 appears twice with two different badges, and the report says "kept the first". So one badge is gone, and I only found that out because I read the small print. That is silent de-duplication with a footnote attached. I want to see the losing row before I press Load, not after.

Second, on entries, "7" and "0007" are shown as different people, "not merged". Good, but now I have 25 swipes that point at nobody, and I would check those first, before anything else.

Small point: it says "Type: person". Is that a class or a label? Please pick one word.

**cybersecurity-analyst:** I'm Priya. The first thing I saw was "Local only" in the top bar. Good, but how do I check it? A label isn't proof. Still, it answers "does it phone home" before I have to ask, and most tools don't.

The layout makes sense to me. The tables are on the left, the grid is in the middle, and there's a match report at the bottom. Up top there's one line that says what I'm going to get: person, entries, building, with the counts. That line is the closest thing here to a query I can read. I'd want to type into it, not just read it.

What I'd check first is the leading zeros. Swipe "7" is flagged "Not in people", but Wei Chen is 0007 right there on the people table. The report admits that 3 keys "differ only by leading zeros (not merged)". So it knows they're probably the same person and it drops them anyway. That's my fields not lining up, and that's how a graph turns into fiction.

Second is Priya Nair. She has two badges, 1188 twice, and it "kept the first". So one badge's swipes now belong to the other badge, and nothing tells me which badge that was.

Third, I don't see a time range anywhere on that summary line. March 2026 is only in the title.

I won't touch "Assistant".

**analyst-alex:** [Alex, pointing at the "Makes" line along the top of the entries screen]

First thing I looked at is this line, "person (412) --entries (4,180 edges from 4,212 rows)--> building (9)." Honestly, that's my SQL check done for me, if the numbers are right. 412 people and 9 buildings I'd know off the top of my head. What I don't like is that 4,180 and 4,212 sit in the same sentence. I'd want to know where the other 32 rows went before I read anything else, and I had to go down to the bottom of the screen to find out. 25 of them are people who aren't in the people list and 7 are buildings that aren't in the buildings list. Also, "Leave out" is already picked. Who picked that? I didn't.

[points at the left-hand list]

The tables down the side make sense. It's three files, so I see three rows. But "Key", "Name" and "From -> person" are small blue tags under the column names, and I nearly missed that those are the settings. In Gephi it's an import wizard that walks you through it. Here it's all on one screen, which is faster, but easier to get wrong.

"Local only" up top: good, I clocked it straight away. Next question is whether that's actually true.

[Observed: points at the counts first, then at the match report. Explains the 32 missing rows unprompted, so the others may pick that up from him.]

**explorer-elena:** Honestly? Last time I tried this it was accounts and integrations in two tabs, and I did a VLOOKUP that quietly matched half of them wrong. Nobody noticed until the meeting.

On this screen, there's a list on the left. People, buildings, entries. That part I get, it looks like my sheet tabs. Then a big table, which is nice, because I trust a table. The line at the top that goes person, arrow, building. I think that's telling me what the picture will be? But it says 4,180 from 4,212 rows. So where did 32 go? That's the first thing I'd check. Probably something in my export.

The blue "Key" and "Name" tags under the column names, I don't know what Key means here. I'd leave them alone.

Wait, Priya Nair is in there twice. Two badge numbers. Is she two dots now? And "each person weighs 1"? I don't know what that means and I'm a bit scared to ask.

Down at the bottom it says "Load". I'd just press that and see what happens, honestly.

**supply-chain-analyst:** Dana: Honestly, the thing I'd look at first isn't the picture. It's that report at the bottom: "25 person IDs are not in people", "7 building IDs are not in buildings", "3 keys differ only by leading zeros". That's my whole life. SAP writes 0007 and the old ERP writes 7. Most tools I've tried merge those quietly or drop them quietly, and I find out three weeks later. Here it's on the first screen, and the bad rows are flagged right in the table. That's the part I'd trust.

The layout makes sense: tables on the left, the rows in the middle, the problems at the bottom. That's how I'd lay it out in Excel.

But the words aren't mine. "Key", "Attribute", "an edge", "Weight: none". I had to work out that "From -> person" means "this column is who swiped". And those little gray labels under the column names, I'd need my glasses for those.

Two things I want answered before I click Load. Why is "Leave out" already picked for the 25? I didn't pick it. And "Local only" up top: does that mean the file never leaves my laptop? Because that's the first thing IT will ask me.

**ml-engineer-recsys:** Chris: First thing I looked at was the line across the top: "person (412) --entries (4,180 edges from 4,212 rows)--> building (9)". That's the right instinct, because it gives me the denominator before anything else. 4,212 rows in and 4,180 edges out, so 32 got dropped, and the report under the grid itemizes them. Good. Most tools just swallow those rows.

The layout reads like a schema editor to me. Files on the left, each one is either nodes or edges, and the column headers get tagged From, To, Key. I get it, but I had to squint at those little blue pills to work out which column became the edge endpoints.

Two things bother me. Person 7 versus 0007: it says three keys "differ only by leading zeros (not merged)". So Wei Chen's swipes just vanish unless I happen to read the fine print? That's my ids getting mangled, which is exactly my nightmare. And "1 repeated key (kept the first)" means Priya Nair's second badge is silently gone. I'd want that to stop me, not be a footnote.

Also, "each person weighs 1"? Why would a node have a weight? That line is noise.

### Round 2: responding to each other, and what is missing

**knowledge-engineer:** **Min-ji:** I'll disagree with Alex and Dana on one thing. "Leave out" is the right default. "Add as people" would make 25 people out of nothing but a number. No name, no badge, and they'd look exactly like real people in the picture. In my world that's a dangling reference, and you report it. You don't paper over it. So keep the default, but tell me why it's the default.

What I'd expect is that those 32 rows don't just disappear when I press Load. I'd want them to stay somewhere I can find tomorrow, like a short validation report attached to the graph. "Show the 32 rows" only works while this screen is open.

Chris, the 7 versus 0007 thing isn't really a matching problem. It's a type problem. The report says it outright: "Number here and Category in people". I want a third button: "treat as the same ID, pad to four digits". At the moment I can only add them or drop them.

What worries me most is the line "notes on entries may move if the row order changes." So an edge has no stable identity. That's the one line on this screen I can't accept.

[Observed: points at the person_id type line, then at the notes warning.]

**cybersecurity-analyst:** Priya: Alex, the 32 add up, fine. But arithmetic isn't trust. I want to see the 32 rows themselves and export them before I load anything, because in my world the swipe that points at nobody is the finding. A badge that isn't in HR is an ex-employee or a cloned card. "Leave out" as the default throws away the exact rows I'd hunt on. Dana's right that somebody chose that for us, and I'd want to know who.

Elena, don't press Load. If Wei Chen's "7" and "0007" stay split, the graph shows a stranger walking into the server room. That's how a false alarm reaches my team lead.

Chris, I agree the repeated key should stop me. I'd go further: it should show both badges side by side and make me pick.

Here's what's missing for how I actually work. I can't save this setup and rerun it next month on the new export. I'd need the "person, entries, building" line as text I can write down and diff. Then there's time. A swipe without a timestamp on it is useless to me, and I don't see one anywhere.

[Observed: Priya argues against the default before anyone else does and tells Elena not to press Load, so she is steering the group.]

**analyst-alex:** **analyst-alex:** [Alex, pointing at "Leave out" on the 25 row]

Priya and Dana, you're both right about "Leave out" already being picked, and I'll go further. That's fine for my first pass, as long as it's written into what I hand over. If the director asks "why does building B4 show 32 fewer entries than the badge system?", I need a line I can paste: "32 rows dropped, here they are." "Show the 32 rows" is a good start. Can I export that as a CSV? That file is the first thing I'd send back to whoever owns the data.

Chris, I don't agree that the leading zeros are fine print. Wei Chen is 0007 in people and 7 in entries, so I'd lose his swipes and he'd show up as a dot with no lines. In pandas I'd just cast both to string and strip the zeros. Here I can't see a button that does that. Is it the "3 keys" link?

What's missing for me is next month. When I swap in April's file, do these choices carry over, or do I click through all of this again?

[Observed: hovers over "3 keys" but doesn't click it. He calls the match report "the bit I'd screenshot".]

**explorer-elena:** **explorer-elena:** Alex, thank you. I had no idea where the 32 went, and you found them in about ten seconds. That's kind of my problem with this screen, though. The answer was at the bottom in small print and I was already reaching for Load. If Alex has to point it out, I'm going to miss it.

Dana, I'm with you on "Leave out" already being picked. In a spreadsheet nothing gets deleted unless I delete it. Here it's decided before I've even seen those rows.

Priya and Chris, the 7 and 0007 thing is my VLOOKUP story all over again. The screen knows they're probably the same person, says so, and goes ahead anyway. I'd honestly rather it ask me, "These look like the same person, merge them?" Yes or no. That's a question I can answer.

What's missing for me is plain words. Key, Weight, an edge. I'd want a sentence like "Each swipe becomes a line from a person to a building."

[Observed: pointed at the bottom report only after Alex mentioned it. Never touched the blue tags.]

**supply-chain-analyst:** Dana: Alex, you're right about the 32. But look at this screen. It shows them, 7, 1530 and B12, flagged right there in the row. I'd click "Show the 32 rows" and go through every one before I trust anything. That's my week anyway, chasing part numbers that aren't in the master list.

What I don't trust yet is "Leave out" being picked for me. If I leave them out, do they still show up anywhere afterward, or do they just disappear? I'd want a list I can export and send back to whoever owns the badge file. "Add as people" scares me more, though. Then I've got a person called 1530 with no name sitting in my picture looking real.

Priya and Chris, I'm with you on 7 and 0007. It knows they're the same and tells me "not merged", but I don't see a button that says "treat these as the same". In my world that's the most common fix there is.

What's missing for me: I can't save these choices. Next month's export will have the same mess.

[Observed: pointed at the flagged cells, then at "Show the 32 rows" and "Add as people".]

**ml-engineer-recsys:** **Chris:** I'm with Priya and Dana on the leading zeros, but I'll go further. Flagging 7 versus 0007 is the easy part. What I want to know is the dtype the tool decided on. If it read the people ids as strings and the swipe ids as ints, then every join downstream is suspect, not only these three. Show me the inferred type for each id column. I don't want "differ only by leading zeros" in a footnote.

Alex, the 32 rows: I found them too, and the reconciliation does add up. 25 plus 7 is 32. That's the part I'd trust. But Elena would press Load straight away, and the defaults would decide for her. "Leave out" being preselected is a policy. Defaults like that are fine in a config file I can diff, and not fine in a click I can't see later.

For how I actually work, this is a one-off. My edge table gets rebuilt every night in Spark. Can I save this mapping and rerun it on tomorrow's export? And where's the timestamp column? Without it, 4,180 swipes is just a count, not a picture of what happened.

### Round 3: what would make you switch, or quit

**knowledge-engineer:** **Min-ji:** I'd quit over one line: "notes on entries may move if the row order changes." I know it's small print, but I build knowledge bases. If my annotation on a swipe slides onto a different swipe after a re-export, the graph is wrong and nothing tells me. Give every edge an identity that comes from the data, like badge, building and time, and not from the row's position.

Priya and Chris, saving the setup as text is what would make me switch. That "person --entries--> building" line is nearly a mapping file already. Let me export it, put it under version control, and run it on April's file. Then Alex's "do I click through this again" goes away.

Elena, I disagree a little. "Merge them? Yes or no" isn't enough for me. I need the rule written down, "pad to four digits", so it applies to next month's data too and doesn't only fix these three.

The one change I'd make: the 32 rows that get dropped should travel with the graph as a report. They shouldn't vanish when I press Load.

[Observed: taps the notes warning twice while speaking.]

**cybersecurity-analyst:** Priya: Honestly, I'd stay in my notebook. Pandas already handles 7 versus 0007 in one line, and I can diff that line. Two things would make me quit this tool for good. The first is if those 32 rows only exist while this screen is open. The second is if I have to click through all of this again on April's export.

Min-ji, I half agree. Don't make up 25 fake people. But "leave out" can't mean they're gone. Load them as their own pile, something like "badges nobody owns", that I can open next to the graph. For me those are the hunt.

Chris has the right fix, and it's the one thing I'd change. Turn that "person, entries, building" line into a recipe I can read, save and rerun. It should list the 7 and 0007 rule, the repeated-badge rule, what happens to the orphans, and which column is the time. If it's plain text I can diff, I'll trust it. A pile of preselected buttons, I won't.

Elena, don't load until you can see that recipe.

[Observed: Priya pointed at the summary line across the top, then at "Leave out", then at "Show the 32 rows".]

**analyst-alex:** **analyst-alex:** [Alex, tapping the "Makes" line, then the match report]

Switch or quit? For me it's about next month. If I have to click through all these blue tags again on April's file, I'll go back to pandas for the cleanup and Gephi for the picture. That's two tools, which is what I've got now, so this screen saved me nothing. If it remembers the setup and tells me "April: 4,390 rows, 4,351 lines, 39 dropped, here they are," then I switch. I'd put that line straight on a slide.

Min-ji, fair point about "Add as people", I'd never pick it either. But Priya's right that whoever picked "Leave out" should be written down somewhere I can see later, not just on this screen.

Chris, the dtypes thing is real, but I wouldn't quit over it. I would quit if Wei Chen shows up as a dot with no lines and nobody tells me.

The one thing I'd change is to make that report at the bottom something I can keep: export it, rerun it, and keep it attached to the graph.

[Observed: points at the counts line and "Show the 32 rows". He says "rerun" three times.]

**explorer-elena:** **explorer-elena:** Honestly, the thing that makes me quit is Priya telling me not to press Load. I was about to. If I need someone like Priya next to me to tell me a button is dangerous, I'll close the tab and go back to my pivot table. That's not a fight, I just won't come back.

Chris and Min-ji, you're arguing about types and padding, and I don't follow most of it. That's fine. But it tells me there are a lot of decisions hiding on this screen, and I don't know which ones are mine to make.

The one thing I'd change: before I load, ask me in plain words. Something like "32 swipes don't match anyone. Three of them look like Wei Chen. Same person?" Then yes or no, and keep the rest somewhere I can find later. Dana, you said you'd want a list you can send back. Same for me, I'd just forward it to whoever made the export.

And I'd switch tools for good if the people dots ended up as just numbers. I need to see the names.

[Observed: points at "Load", then pulls her hand back and looks at Priya.]

**supply-chain-analyst:** **Dana:** The thing that would make me quit is the one Chris raised. Next month I get a new export, and if I have to click all of this again, I won't. I'll go back to my Power Query that's already set up, ugly as it is. Priya's right too: I need to save "badge file to people, swipe file to buildings" and rerun it on April's file. I'd also want it to tell me what changed from last time, so something like "6 new IDs not in people."

The thing that would make me switch is a "treat 7 and 0007 as the same" button. Min-ji said padding and Elena said "merge them, yes or no?" I'd take either one. That one fix is half my week.

Elena, I wouldn't let the tool decide for you either. But Min-ji's right that "Add as people" is worse. I'd rather it stop me and say "25 swipes point at nobody, here they are, export or leave out?" Then I'm the one who picked it.

And before IT asks, I need a straight answer on "Local only."

[Observed: pointed at "3 keys" and at "Leave out".]

**ml-engineer-recsys:** **Chris:** What would make me switch is simple, and nobody's said it yet. The mapping has to be a file. Priya wants the arrow line as text she can diff, and I'd take that further: give me the whole mapping (which column is the from end, which is the to end, the id dtypes, the policy for the 32 rows, the leading-zero rule) as a config I can check into git and run against tomorrow's Parquet. If I can't, I'll just do it in Spark and plot it in a notebook.

What makes me quit is ids getting changed without my say. Min-ji's right that 7 versus 0007 is a type problem. But if the tool pads ids for me without asking, my exported subgraph won't join back to my tables. So it should never rewrite my ids, and it should show me the dtype it inferred for each column.

Dana, I'm with you on exporting the dropped rows, and it should be in the same form as the input.

The one thing I'd change: a repeated id or a type mismatch should block Load until I've decided, the way a failed schema check does. A footnote isn't good enough.

[Observed: points at the "differ only by leading zeros" line and the "kept the first" line, not at the grid.]

## Themes

Counts are out of six participants. "Independent" means the participant raised the point before anyone else in the group had said it. Severity uses Nielsen's 0-4 scale (4 = usability catastrophe).

### 1. Rows left out at Load must survive Load, and be exportable -- severity 4

- **Voiced by:** all six. Min-ji, Priya, Alex, Dana and Elena raised it in round 2; Chris agreed and added that the export should match the input's format.
- **Agreement:** unanimous that the 32 unmatched rows must not exist only while the import screen is open. Three of the six (Priya, Alex, Dana) named it as a reason they would quit.
- **Dissent, about where the rows should go, not whether they stay:**
  - Min-ji wants a validation report attached to the graph.
  - Priya wants the rows loaded as their own group ("badges nobody owns"), because for her the orphans are the finding.
  - Alex, Dana and Elena want a CSV to send back to whoever owns the data.
  - Chris wants the export in the same format as the input.
- **Implication:** a leave-out policy needs a durable artifact. Under the architectural principles that is graphty-element's job (it owns data loading), not the app's.

### 2. Ids that differ only by leading zeros ("7" and "0007") -- severity 4

- **Voiced by:** all six. Five raised it independently in round 1 (Min-ji, Priya, Dana and Chris directly; Elena through her VLOOKUP story). Alex raised it in round 2.
- **Agreement:** everyone agrees that detecting the mismatch, reporting it and then doing nothing about it is the worst of the three options. Alex's version of the cost is concrete: Wei Chen becomes a dot with no lines and nobody is told.
- **Dissent on the remedy.** This is the sharpest split in the session:
  - Min-ji wants a written rule ("pad to four digits") that also applies to next month's data.
  - Elena wants a one-time yes/no question in plain words.
  - Dana would take either.
  - Chris rejects any rewriting of ids, because exported data must join back to his own tables. He wants the inferred type of each id column shown, and wants the two ids treated as equal without changing them.
  - Priya and Alex describe the fix as the one-line cast they would write in pandas.
- **Implication:** the fix that satisfies everyone matches the two ids as equal, leaves the stored ids untouched, and records the rule so it can be reused. Asking once in plain words (Elena's version) can be the screen that leads into that rule.

### 3. Changes the screen makes silently must stop the user, not sit in a footnote -- severity 3

- **Voiced by:** Min-ji, Priya and Chris (repeated id kept first), Elena (whether Priya Nair becomes two dots), and Chris in round 3 (block Load).
- **Agreement:** four of six object to "kept the first". Priya wants both badges shown side by side. Chris wants Load blocked until the user decides, the way a failed schema check blocks a pipeline.
- **Dissent:** Alex would not quit over type issues alone. Dana did not mention the repeated id.

### 4. "Leave out" already selected -- severity 3

- **Voiced by:** Alex and Dana independently in round 1. Priya, Elena and Chris followed in round 2. Min-ji disagreed.
- **Agreement:** five of six object, but not to the default itself. Their objection is that it was chosen silently and is not recorded anywhere afterward. Chris named the distinction: a default is acceptable in a config file he can diff, and not acceptable as a click nobody can see later.
- **Dissent:** Min-ji argues "Leave out" is the correct default, because "Add as people" would create 25 fake people. Over the session Dana, Alex and Priya came round to her view that "Add as people" is worse.
- **Where the group ended up:** keep "Leave out" as the default, say why it is the default, and record it with the import so it can be seen later. Dana's wording: "Then I'm the one who picked it."

### 5. Save the import setup and rerun it on next month's file -- severity 3

- **Voiced by:** five of six (Priya, Alex and Dana in round 2; Chris in round 2; Min-ji in round 3). Elena never mentioned it.
- **Agreement:** this was the most common reason to switch tools or quit. Without it, Alex, Dana, Priya and Chris would each go back to their current tools (pandas with Gephi, Power Query, a notebook, Spark).
- **Split over what to save:**
  - Priya, Chris and Min-ji want plain text they can diff and keep under version control. They point out that the summary line across the top is almost that already.
  - Alex and Dana care less about the format and more about getting the reconciliation again on the next run: "April: 39 dropped", "6 new IDs not in people".
- **Caveat:** four of the six personas are technical data workers, so the demand for a version-controlled config file is overrepresented. The reconciliation-on-rerun version (Alex, Dana) is the one most likely to generalize.

### 6. The summary line across the top is the most trusted thing on the screen -- positive finding

- **Voiced by:** Min-ji, Priya, Alex and Chris praised it unprompted. Elena half understood it ("I think that's telling me what the picture will be?").
- **Agreement:** it gives the count of rows in and edges out before Load, which is the check these participants already do by hand. Priya and Chris want to edit it, save it and diff it.
- **Problem inside the praise:** the sentence shows 4,180 next to 4,212, but the explanation of the difference is at the bottom of the screen. Alex had to go and look for it, and Elena only found it because Alex told her.

### 7. The match report sits too low and its print is too small -- severity 3

- **Voiced by:** Elena (she was reaching for Load before she saw it), Alex (had to scroll for it), Min-ji ("small print"), Chris ("fine print"), Dana ("I'd need my glasses" for the column tags).
- **Agreement:** five of six. The strongest evidence comes from behavior, not opinion. In round 1, before anyone influenced her, Elena said "I'd just press that and see what happens". That is the exact path the report exists to interrupt.
- **Dissent:** Dana found the report on her first look and called it the part she would trust. A participant who already knows to look for problems finds it; one who does not, misses it.

### 8. The words are database words -- severity 2

- **Voiced by:** Dana ("Key", "Attribute", "an edge", "Weight: none"), Elena ("Key", "Weight", "edge"; she asked for "Each swipe becomes a line from a person to a building"), Min-ji ("Type: person" -- a class or a label?), Chris and Elena ("each person weighs 1" is noise).
- **Agreement:** four of six. The column-role tags ("Key", "From -> person") are also easy to miss as controls: Alex, Dana and Chris all had to work out that the small tags are the settings.
- **Dissent:** none. The technical participants were not bothered by the vocabulary, but they agreed the node-weight line is noise.

### 9. "Local only" needs to be provable -- severity 2

- **Voiced by:** Priya, Alex and Dana. Dana raised it in rounds 1 and 3 because "IT will ask".
- **Agreement:** all three welcome the label but do not believe a label on its own. Nobody said what proof would satisfy them.

### 10. Time is missing -- severity 3

- **Voiced by:** Priya (no time range on the summary line), Chris (no timestamp column), and Min-ji indirectly (an edge's identity should include the time).
- **Agreement:** three of six. To these participants a swipe without a time is a count, not an event. The screen gives no way to say which column holds the time.

### 11. Notes can move when row order changes -- severity 4, but only one participant raised it

- **Voiced by:** Min-ji only. She named it as her single reason to quit, and tapped the warning twice.
- **No one else commented on it.** That is probably because the line is small print, not because the others accept it. The underlying defect is real whoever reports it: an edge identified by its row position has no stable identity, so a note can attach itself to the wrong swipe after a re-export. Notes are owned by graphty-element, so this is an element data-model question, not a screen fix. Verify it against the spec before acting, rather than counting votes.

### 12. Other single-voice points

- Elena: people must show up as names, not numbers.
- Priya: she wants to type into the summary line as if it were a query.
- Chris: a mismatch in the inferred type of an id column makes every join suspect, not just these three ids.

## Group-think to discount

- **Alex supplied the answer about the 32 rows.** He explained them in round 1. Elena's round-2 understanding is borrowed from him, and she says so. Count her as "missed it", not "found it".
- **Priya steered the room.** She told Elena not to press Load twice. Elena's round-3 quit statement is a reaction to Priya's warning, not to the screen. Discount it as evidence about the screen. What does survive is the pre-influence behavior behind it (in round 1 she would have pressed Load) and her point that she cannot tell which decisions are hers to make.
- **Rerun demand grew round by round.** Alex, Dana, Priya and Chris each raised it in round 2 without prompting, so the need is real. The specific form, a config file under version control, gathered support in round 3 as people echoed Priya and Chris. Count that specific form as three voices, not five.
- **The objection to "Leave out" was amplified.** Alex and Dana raised it independently. Priya, Elena and Chris then repeated it. The group then moved toward Min-ji's dissent. Treat the surviving finding as "record the default and why", not "remove the default".
- **The test material contained the problems on purpose.** The scenario data was built with exactly these defects, and the screen's own report listed them. "Every participant found the leading-zero problem" partly shows that the mock pointed at it. It does not show that the problem is discoverable when the report is less prominent. A participant with clean data, or with a report collapsed out of sight, has not been tested.
- **Panel skew.** Four of six participants are technical data workers. Elena is the only participant new to graphs, and in a group she defers to the others. Her findings about plain words and decisions she cannot recognize as hers should be weighted up, not down, and confirmed in a solo session.

## Recommended follow-up

- Run solo first-click and think-aloud sessions with Elena-type participants on this screen (no group present) to confirm or refute themes 4, 7 and 8 without Alex or Priya in the room.
- Test a version where Load is blocked until the user resolves the repeated id and the leading-zero ids, against the current version. Measure how many users press Load with the problems unresolved.
