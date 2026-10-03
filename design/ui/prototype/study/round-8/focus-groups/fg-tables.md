# Focus group: loading three tables into one graph (clickable skeleton)

The five participants are simulated personas, not real people. Their findings rank below anything the owner writes in owner-feedback.md.

The screen under discussion is the Data page of the clickable skeleton, showing a three-table import. A rail down the far left reads Graph, Data, Views, Notes, Assistant. A "Local only" chip sits in the top bar. On the left of the page are the three source tables with row counts (people 412, buildings 9, entries 4,212). In the middle is a preview grid of one table's columns, tagged with roles such as Key and Attribute. Across the top is a "Makes" line: "person (411) --entries (4,180 edges from 4,212 rows)--> building (9)". Below sit the edge settings ("One edge per: Row / Pair", "Weight: none (each edge counts 1)", "Directed / Undirected") and a match report: 25 swipes whose person is not in people and 7 whose building is not in buildings, both with "Leave out" already selected; "1 repeated key (kept the first)"; and a note that ids match as written, so "7" and "0007" stay two keys. The Load action is in the bottom corner, labeled "Open as a new graph", with "Esc to leave". The scenario is badge-swipe data for one month.

Participants: Priya (cybersecurity analyst), Min-ji Kim (knowledge engineer), Grace (nonprofit operations analyst, new to graphs, works in Excel), Dana Okafor (supply-chain analyst, works in Power Query), Alex (data analyst, SQL and Python).

## Transcript

### Round 1: first read of the screen

**Priya (cybersecurity analyst):** First thing I looked for was whether it calls out anywhere. There's a "Local only" chip up top, which is a start, but it's a chip. I'd want to click it and see what that actually means before I load anything. I won't touch "Assistant" in the left rail.

The layout makes sense to me: tables on the left, a preview in the middle, and a "Makes" line on top. That line, "person (411) --entries--> building (9)", is the best thing on the screen. It reads like a Cypher pattern, so I can check it in one glance.

The match report works because the numbers add up: 25 plus 7 is 32, and 4,212 minus 32 is 4,180. I checked. Two things bother me, though.

First, "1 repeated key (kept the first)". Priya Nair, 1188, has two badges, and one of them just quietly goes away. That's a dropped row.

Second, swipe ID 7 shows as "not in people", and there's a 0007 sitting in the people table. That's probably the same person. I'm glad it doesn't trim the zeros silently, but I'd want it to say "7 might be 0007".

And it never tells me the time range. There's a time column, but no "March 2 to March 31" anywhere. Which month is this?

**Min-ji (knowledge engineer):** I'll start, since nobody else has yet. The layout itself is easy to read. The rail on the left says what kind of thing each page is about: Graph, Data, Views, Notes. I'll ignore Assistant. The data page lists the tables and shows one table's columns. The line at the top is the first thing I read and the first thing I trust: "person (411) --entries--> building (9)". That is a schema summary, near enough to a class diagram. I wish more tools started there.

Then my suspicion kicks in. The people file has 412 rows, but the header says 411 persons. The explanation is in a report further down: "1 repeated key, kept the first." Kept the first by what rule? That is silent de-duplication with a footnote. The report also says 0007 and 7 stay two separate keys. That is honest, but it is almost certainly a mistake in the data, and it is printed in the same calm gray as everything else.

On wording: "Type" should say class, and a column is not an "Attribute" until I say it is. The "Local only" chip at the top tells me the data stays on this machine. I checked for that before anything else, and it is worth keeping.

**Grace (nonprofit operations analyst):** Honestly, the first thing I did was look for the row count. I found it in the left list: people 412, buildings 9, entries 4,212. Good, that matches how I'd check against Excel. But the line at the top that says "person (411) --entries (4,180 edges...)--> building (9)" looks like code to me. Why 411 when the list says 412? I had to dig into the report at the bottom to find the "1 repeated key", and it's in small blue text. That should sit right next to the number.

Overall it makes sense to me: tables on the left, a preview in the middle, and "what went wrong" at the bottom. That's close to how I'd lay out a workbook. What I don't get is the bar down the far left with Graph, Data, Views, Notes and Assistant. I'm not sure if I've left my graph or if this is a pop-up. "Open as a new graph" with "Esc to leave" makes me nervous. Leave and lose everything?

Words like "Key", "a node" and "an edge" are jargon. And with donor names in these files, "Local only" is the first thing I'd want spelled out in a full sentence.

**Dana (supply-chain analyst):** My first impression is that this works like a Power Query staging screen with a picture tacked on afterwards, and honestly that's what I'd want. You get three tables down the left with row counts and checkmarks, and the data sits in the middle. Rows are rows, so I can read it.

The first thing I checked was the top line where it says "person (411) ... building (9)". The left panel says 412 people. It took me a minute to find the reason further down: one repeated key, kept the first. Good, it said so. But that line at the top reads like code, all arrows and brackets. Give me a sentence instead.

Then there's "Not in people", 25 rows. That's my ERP every quarter. I like that it doesn't quietly drop them. "Leave out" already looks selected, though, so who chose that, me or the tool?

The left rail says Graph, Data, Views, Notes, Assistant. I don't know what Views means yet. "Local only" at the top I did notice. That's the first thing IT will ask about.

And where does this go after Load? Can I get it into Power BI?

**Alex (data analyst):** Okay, first impressions. It's laid out like Gephi: there's a data side and a graph side, and the icons down the left let you jump between them. The first thing I noticed was "Local only" at the top. If that means my file never leaves the browser, it's the most important thing on the screen, so tell me that next to the place I load the file, not in a little chip I have to guess about.

The tables list on the left makes sense to me: people, buildings, entries, each with a row count. The "Makes" line across the top looks like code with all those arrows, but it has the numbers I'd check against SQL. 411 people from 412 rows, so one repeated key, fine. 4,180 edges out of 4,212 rows.

Two things worry me. "Open as a new graph": does that throw away whatever I had open? And the Load button is way down in the bottom corner, below a report I'd honestly skim. I'd also leave "Assistant" alone until I know where it sends things.

### Round 2: responding to each other, and what is missing

**Priya:** Dana, you asked who chose "Leave out". That's the same question I have about "kept the first". Both are decisions the tool made before I touched anything. I'll accept a default, but I want it to show as a choice I can change, with the row it applied to. A footnote isn't enough. In my world, a badge that vanishes is how you miss the contractor who tailgated.

The knowledge engineer called the 0007 problem a data mistake printed in calm gray. I agree, and I'd go further. If "7" and "0007" are the same badge, every one of those 25 unmatched swipes could be a formatting bug, not a stranger. Show me the near-misses before I decide anything.

Alex, I don't fully buy "Local only next to the Load button". I want it next to the Assistant, because that's the thing I'd expect to send data somewhere.

What's still missing for me is the time window, and the per-day count. I correlate swipes against VPN logins by hour. Even a perfect graph is useless to me without "March 2 to 31". Where's the export back to CSV, or into Splunk?

**Min-ji:** Dana asked who chose "Leave out". The screen shows it already pressed, and I'm with Dana that this is the real trust problem. A default that drops 32 rows is still a decision, and nobody signed it. I'd want both options unpressed and Load refusing to go until I pick one.

Priya, I partly disagree with you on "7 might be 0007". I don't want the tool guessing. I want it to list 7 and 0007 together as a possible duplicate, and leave the merge to me. One wrong auto-match and two people's swipes become one person, which is exactly how entity resolution goes wrong.

Grace, "node" and "edge" don't bother me. "Type" does, and so does calling every column an "Attribute".

What's missing is how this fits into my real work. The 32 leftover rows need to go out as a file I can attach to a data-quality ticket. And this mapping should save as something I can rerun next month, not something I click through again. I'd also want each edge to remember which file it came from. And "One edge per: Row / Pair" sits right next to "Weight: none" with nothing connecting them. If I pick Pair, does the count become the weight? It doesn't say.

**Grace:** Priya's right that the numbers add up. I did the same math on my calculator and that's the part I trust. But I'd push back on the knowledge engineer: "class" would be worse for me than "Type". I already have to guess at "node", "edge" and "Pair" up in the gray bar. "One edge per Row" or "Pair"? I'd click Row because it sounds like Excel, but I honestly don't know what I'd be choosing between.

The 7 and 0007 thing is my life. Excel eats leading zeros every time I open a CSV. So when the tool says "ids match as written", I read that as "your export is broken and we're not going to help you." Just tell me "7 is probably 0007, fix it?"

Same as Dana, I didn't pick "Leave out" either. What I'd actually want is a button that downloads those 32 rows so I can paste them into Excel and fix them in the donor database. Then next quarter I'd load the clean file.

And "Directed" or "Undirected" at the bottom is the first spot where I'd stop and go ask someone.

**Dana:** Priya's right about 7 and 0007. That's my two ERPs. One pads the supplier numbers with zeros and one doesn't. Telling me "they stay two keys" isn't enough. I want a button that says "match these anyway", or I'm back in Excel doing a TEXT() column before I load. Same with the repeated badge. "Kept the first" means first in the file? Then I'd want to see the row it threw away.

To Alex on "Open as a new graph": I read it the same way. Esc to leave what, and does my other picture survive?

On fit: what I really need is for this to remember my setup. Every quarter my supplier list changes. If I have to redo the From and To picks and the "Leave out" choices every time, I'll quit after the second month.

"Weight: none (each edge counts 1)". I don't know what weight means here. Is that spend? Is it how many times somebody swiped?

And nobody's said this yet, but I still don't see an export. If it can't hand the 32 dropped rows to Excel, I'll have to rebuild that list by hand.

**Alex:** Priya's right about the 0007 thing, and it's worse than she made it sound. If our SQL export pads IDs and the swipe system doesn't, that isn't one row. It could be every person under 1000. "Not in people, 25" would hide that. I'd want it to say "these look like the same ID with zeros" before I trust 4,180.

I disagree with Dana a little on "Leave out". I don't mind it being preselected, as long as the report says how many rows that drops, and it does. That's how I'd do it in pandas anyway.

What I'm missing is a way to check this against SQL. I know distinct badge-holders, I know row counts. Give me unique people who actually swiped, not just 411 in the people file. And Priya's date range, yes, that too.

Fit with how I work: I'm doing this every month. If I have to redo the matching from scratch each time, I'm back in Python by month three.

### Round 3: what would make you switch, or quit

**Priya:** I'd quit if the tool makes a choice about my data where I can't see it. "Kept the first" and a pre-pressed "Leave out" are both that kind of choice. Alex, I disagree with you here. Pandas is fine because the line that drops rows is right there in my own script, and I can read it. On this screen I can't see a rule at all.

Min-ji's right that the tool shouldn't merge 7 and 0007 on its own. List them side by side and let me decide. I'll take that over a guess.

Three things would make me switch: a saved mapping I can rerun next month, which is Dana's point; the 32 rows I left out exported as a CSV with the reason for each one; and every edge keeping its source file and timestamp. Without timestamps I can't line this up against VPN logins, and then it's a pretty picture I can't use.

If I could change one thing, I'd put the date range and the dropped-row count in that top "Makes" line, before the Load button. Something like "March 2 to 31, 4,180 of 4,212 swipes kept, 32 left out." That's the line my manager would see.

**Min-ji:** I'll answer the moderator's question first. I would quit the first time a count changes and I can't trace it back to rows. That's the 411 against 412 problem. The tool explained it this time, but next month, when the swipes file grows, I need to see what changed: rows added, keys that are new, and keys that went missing. Without that I'm back to doing it in SPARQL.

Alex, I disagree with you about preselecting "Leave out". You do the same thing in pandas, but in pandas you wrote that line yourself. Here nobody wrote it.

Dana and Alex both want the setup remembered, and that's my one change too: save the mapping as a file I can read and rerun. It should hold the key columns, how they match, what happens to unmatched rows, and whether a pair's count becomes the weight. The weight is set when the data loads, so that saved file is the only place anyone can later find out why an edge is heavy. Store it next to the graph, and let me see which source file each edge came from.

What would make me switch is a match report I can attach to a data-quality ticket.

**Grace:** What would make me quit is having to redo this every quarter. Dana and Alex already said it, and I'm saying it louder. Our guidance tells us to refresh the map every quarter. If I have to pick From and To again, and guess at Row or Pair again, I'll go back to a whiteboard. I don't know what "add a batch" or "replace" would even look like here. Before I press anything, I'd want to see last quarter's 412 next to this quarter's number.

Min-ji, I'll disagree with you on one point. I don't want Load to refuse to go. I'm by myself with no one to ask, and a screen that blocks me just means I stop. Show me the choice already made, in plain words like "32 rows left out", and give me a download button next to it.

So the one change I want: put a "Download the 32 rows that didn't match" button right beside that number. I'd fix them in the donor database, and next quarter I'd load the clean file. That button would get me to switch.

**Dana:** My reason to quit is the one Alex gave. If every quarter means picking From and To again, choosing "Leave out" again, and fixing 7 versus 0007 in Excel before I even load, I'll give up by the second month and go back to Power Query and a pivot table. My old way is ugly, but it reruns with one click on Refresh.

Min-ji, I agree with you more than with Priya about the zeros. I don't want it guessing. But I need a "match these anyway" option that I choose once and that it then remembers. Dropping the rows silently and guessing silently are both bad.

Grace, you're right about "Weight". I still don't know whether it means spend or how many times someone swiped. If it really is a count, put the word "count" on the screen.

What would make me switch is seeing last month's setup applied to this month's file, with a line that says what changed: "38 new people, 12 swipes match no one." Then a Load button. I'd also want the 32 dropped rows downloadable so I can send them to Excel.

If I could change one thing, it would be for the tool to save the setup and rerun it.

**Alex:** I'd quit if I have to redo this setup every month. Dana said it first and I'll say it again: I already have a Python script that does this join. It's ugly, but it reruns. If this page can't remember "swipes.person_id matches people.badge" and let me drop next month's file in on top, it's a nicer-looking version of something I already have, and I'll go back to the script.

I don't agree with Min-ji that Load should refuse to run until I pick an option. Make me click through every choice and I'll stop using it by week two. The defaults are fine as long as the count of rows they drop sits right next to Load.

The one thing I'd change is the 7 and 0007 problem. Put it at the top as a warning with a count: "312 IDs would match if you ignore leading zeros." Every number below that line depends on it. 4,180 means nothing until I know that's been checked.

What would make me switch is a saved setup I can rerun, with a CSV of the rows that didn't match.

## Themes

Counts are out of five participants. "Independent" means the participant raised the point before anyone else in the group had said it. Severity uses Nielsen's 0-4 scale (4 = usability catastrophe). Severity is the researcher's judgment of the underlying problem, not a vote count.

### 1. Save the import setup and rerun it on the next file -- severity 4

- **Voiced by:** all five. Min-ji, Dana and Alex raised it in round 2 without being prompted, in that order. Priya adopted it in round 3, crediting Dana. Grace adopted it in round 3 ("Dana and Alex already said it, and I'm saying it louder"), but she grounded it in her own fact: her organization's guidance says to refresh the map every quarter.
- **Agreement:** the most common reason to quit. Four of five named it as their single reason to quit or their single change (Min-ji, Grace, Dana, Alex). Every one of them names a current tool that already reruns: Python (Alex), Power Query Refresh (Dana), SPARQL (Min-ji), a whiteboard (Grace).
- **What a rerun must show, beyond replaying the picks:** a reconciliation against last time. Min-ji wants rows added, new keys and missing keys; Dana wants "38 new people, 12 swipes match no one"; Grace wants last quarter's 412 beside this quarter's count. Three of five, raised independently in round 3.
- **Split over form:** Min-ji (and Priya) want a readable saved file, stored next to the graph, that includes the key columns, matching rule, unmatched-row policy and weight rule. Dana, Alex and Grace care about the outcome (drop in next month's file, see what changed), not the format.
- **Implication:** the import setup is graph data. Under the architectural principles, saving, replaying and reconciling it belongs to graphty-element, which owns data loading.

### 2. Ids that differ only by leading zeros ("7" and "0007") -- severity 4

- **Voiced by:** all five. Priya and Min-ji independently in round 1. Grace, Dana and Alex in round 2 after Priya, but each with their own source of the problem (Excel eating zeros, two ERPs, a padded SQL export).
- **Agreement:** reporting the mismatch and then doing nothing ("ids match as written") is not acceptable. Alex sized the risk: if one system pads and the other does not, it is every id under 1000, not one row, and every count on the screen ("4,180") is untrustworthy until this is checked. Priya made the same point from the other side: the 25 "strangers" may all be formatting bugs.
- **Dissent on the remedy, and it converged by round 3:**
  - Priya first asked for "7 might be 0007"; Grace for "7 is probably 0007, fix it?".
  - Min-ji rejected any automatic merge: list the pair, let the user decide. Priya and Dana came round to her in round 3.
  - Dana added that the decision must be made once and remembered (ties to theme 1).
  - Alex wants it promoted to a top-of-screen warning with a count ("312 IDs would match if you ignore leading zeros").
- **Where the group ended up:** detect and count near-miss ids, show them prominently above the summary, never merge silently, let the user accept a "match these anyway" rule once, and save that rule with the setup.
- **Same finding as the previous round's group.** The skeleton still shows the defect-and-shrug wording that group objected to.

### 3. Decisions the tool made before the user arrived -- severity 3

Two separate defaults, which the group treated as one problem: "1 repeated key (kept the first)" and "Leave out" already pressed for the 32 unmatched rows.

- **"Kept the first" -- voiced by:** Priya and Min-ji independently in round 1 (a dropped row; "kept the first by what rule?"), Grace in round 1 (the explanation is far from the 411 it explains), Dana in round 2 (first in the file? show me the row it threw away). Four of five. Alex accepted it as "fine".
- **"Leave out" preselected -- voiced by:** Dana independently in round 1 ("who chose that, me or the tool?"). Priya, Min-ji and Grace agreed in round 2, each citing Dana.
- **Dissent, the clearest split in the session, about the remedy:**
  - Min-ji: leave both options unpressed and block Load until the user picks.
  - Priya: keep a default, but show it as a changeable choice next to the rows it affects; it is the invisibility she objects to.
  - Alex: preselection is fine as long as the number of rows it drops sits next to Load. He said blocking would make him quit by week two.
  - Grace: also against blocking, for a different and stronger reason -- she works alone with no one to ask, and a blocked screen means she stops. She wants the choice shown as made, in plain words ("32 rows left out"), with a download beside it.
- **Where the group ended up:** four of five reject blocking Load. All five accept a visible default. What they reject is a default that is not shown as a decision, not tied to the rows it affected, and not recorded. That matches where the previous round's group ended up.

### 4. Rows left out must leave as a file -- severity 3

- **Voiced by:** all five. Min-ji first in round 2 (a file to attach to a data-quality ticket), then Grace and Dana in the same round, Priya in round 2 generally (CSV or Splunk) and in round 3 specifically (the 32 rows with a reason per row), Alex in round 3.
- **Agreement:** unanimous. For Grace it is the single feature that would make her switch: fix the rows in the donor database, load the clean file next quarter.
- **Variation in what the file is for:** a ticket attachment (Min-ji), a fix-up list for Excel (Grace, Dana, Alex), and a reason per row (Priya). None of these conflict.
- **Note:** Dana said "nobody's said this yet" after Min-ji and Grace had both said it. Count her as agreeing, not as independent.

### 5. The "Makes" summary line: trusted by the technical half, read as code by the rest -- severity 2

- **Positive:** Priya, Min-ji and Alex praised it unprompted in round 1 ("best thing on the screen", "the first thing I trust", "the numbers I'd check against SQL").
- **Negative:** Grace and Dana independently said it looks like code and asked for a sentence instead. Alex also called it code-like, while finding it useful.
- **Shared problem inside the praise:** four of five (Min-ji, Grace, Dana, Alex) noticed 411 against the 412 rows in the table list in round 1, and had to go to the bottom report to find out why. Grace called the explanation "small blue text" that "should sit right next to the number".
- **Proposals to extend it:** Priya wants the date range and the kept and left-out counts in it ("March 2 to 31, 4,180 of 4,212 swipes kept, 32 left out"); Alex wants unique people who actually swiped beside the 411 in the file.
- **Implication:** keep the line; put the reason for each changed count next to the count; offer a plain sentence form, for example "411 people (1 duplicate set aside), 4,180 swipes kept of 4,212, 9 buildings".

### 6. "Open as a new graph" and "Esc to leave" read as a threat to the current work -- severity 3

- **Voiced by:** Grace and Alex independently in round 1 ("leave and lose everything?"; "does that throw away whatever I had open?"). Dana agreed in round 2.
- **Agreement:** three of five. Nobody contradicted it. Alex also said the Load button sits "way down in the bottom corner, below a report I'd honestly skim".
- **Implication:** the label and the escape hint must say what happens to an open graph. This is a fear that stops users before they commit, and it should be checked in a solo click-through rather than taken as a group number.

### 7. The edge settings are not understood -- severity 3

- **Voiced by:** Min-ji (Row versus Pair sits beside "Weight: none" with nothing connecting them; does a pair's count become the weight?), Grace ("I'd click Row because it sounds like Excel, but I honestly don't know what I'd be choosing between"; "Directed or Undirected" is where she would stop and ask someone), Dana (does weight mean spend, or the number of swipes? "put the word count on the screen").
- **Agreement:** three of five, from both ends of the panel: the expert does not know how the two settings interact, and the novices do not know what either means.
- **Why it matters beyond wording:** Min-ji pointed out that the weight is fixed at load time, so a later reader of the graph has no way to learn why an edge is heavy unless the rule is saved with it (ties to theme 1).

### 8. "Local only" needs to say what it means, and where -- severity 2

- **Voiced by:** all five noticed it in round 1. That is the strongest unprompted agreement in the session.
- **Agreement:** a chip is not enough. Priya wants to click it and see what it means; Grace wants a full sentence because her files hold donor names; Dana says it is the first thing IT will ask; Alex calls it the most important thing on the screen if true.
- **Dissent about placement:** Alex wants it beside the place a file is loaded; Priya wants it beside Assistant, the one thing she expects might send data elsewhere.
- **Related:** three of five (Priya, Min-ji, Alex) said in round 1 that they would avoid Assistant. Nobody said why beyond not knowing where it sends data. The two placements are compatible: say it once where data comes in, and say what Assistant does and does not send at Assistant.

### 9. Time is missing -- severity 3 for the participants who need it

- **Voiced by:** Priya independently in round 1 (no date range though there is a time column), again in round 2 (per-day counts; correlating with VPN logins by hour) and round 3 (each edge must keep its timestamp). Alex agreed in round 2.
- **Agreement:** two of five, but for Priya it is disqualifying: without time on each edge "it's a pretty picture I can't use". The previous round's group also raised time.
- **Implication:** the setup needs a way to say which column holds the time, and the summary should show the range it covers.

### 10. Each edge should remember where it came from -- severity 2

- **Voiced by:** Min-ji in round 2 and round 3 (which source file each edge came from), Priya in round 3 (source file and timestamp per edge).
- **Agreement:** two of five, both from the technical half. Ties to themes 1 and 9.

### 11. The left rail is not self-explanatory to newcomers -- severity 2

- **Voiced by:** Grace (cannot tell whether she has left her graph or opened a pop-up), Dana ("I don't know what Views means yet").
- **Dissent:** Min-ji and Alex read the rail easily (Min-ji: "says what kind of thing each page is about"; Alex: "like Gephi").
- **Implication:** the split runs exactly along graph experience. Test the rail with first-click tasks on newcomers before acting; Grace's uncertainty also feeds theme 6.

### 12. Vocabulary -- severity 2

- **Voiced by:** Grace ("Key", "node", "edge", "Pair", "Directed"), Min-ji ("Type" should be "class"; a column is not an "Attribute" until she says so), Dana ("Weight").
- **Dissent:** Grace pushed back directly on Min-ji: "class" would be worse for her than "Type". Min-ji said "node" and "edge" do not bother her.
- **Implication:** the two directions conflict, so the fix is not a different set of terms. It is plain-language explanations attached to the controls (Dana's "put the word count on the screen"). Min-ji's point that "Attribute" is applied to every column before she chose it belongs with theme 3: a role assigned on her behalf.

### 13. Single-voice points

- Dana: where does the graph go after Load; can it go into Power BI? Priya also asked for export into Splunk, so "export of the loaded graph to another tool" has two voices.
- Alex: a count of unique people who actually swiped, to check against SQL.
- Priya: per-day swipe counts.
- Grace: she does not know what "add a batch" or "replace" would look like for a refresh.

## Group-think to discount

- **The rerun demand snowballed in round 3.** Three participants raised it independently in round 2 (Min-ji, Dana, Alex). Priya and Grace then adopted it, each crediting someone else. The need is real at three independent voices; Grace's version carries her own fact (quarterly refresh guidance), Priya's is an echo. Also note that Alex said "Dana said it first" when Min-ji did.
- **The "Leave out" objection was carried by Dana's question.** Only Dana raised it independently. Priya, Min-ji and Grace each opened their round-2 point by quoting her. Count the objection as one independent voice plus three agreements. The finding that survives is the one everyone held regardless: show the default as a decision and record it, which four of five said in their own terms by round 3.
- **The leading-zero remedy converged on Min-ji.** Priya and Dana moved from "suggest the match" to "list both and let me decide" after Min-ji's argument. That is persuasion, not independent agreement. Grace never moved: she still wants "7 is probably 0007, fix it?" Her version should not be lost, because she is the participant least able to work out the remedy herself.
- **Grace deferred less than a newcomer usually does.** Her round-1 points (411 vs 412, the jargon, the rail, "lose everything") came before anyone influenced her, and in round 3 she disagreed with Min-ji outright. Weight her unprompted round-1 behavior heavily: it is the closest thing in this session to a real first-time user. Her "I'd click Row because it sounds like Excel" is behavioral evidence that the edge settings will be guessed, not chosen.
- **The test data contained the defects on purpose, and the screen's own report pointed at them.** "Everyone found the leading-zero problem" and "everyone noticed 411 vs 412" show that the report and the summary pointed at them. They do not show that a user with clean-looking data, or with the report collapsed, would notice. That case has not been tested.
- **Avoiding Assistant may come from the personas, not the screen.** Three participants volunteered in round 1 that they would leave Assistant alone, before it was discussed and with no visible reason on this screen. Treat it as a stated stance of these personas, not as a reaction to the design.
- **Panel skew.** Three of five (Priya, Min-ji, Alex) are technical data workers; they drove the saved-file, provenance and timestamp demands. Dana sits between. Grace is the only participant new to graphs. The technical half's praise of the summary line and comfort with the rail should not be generalized.
- **"Would quit" statements are hypothetical.** Every participant named a reason to quit when asked to. Rank by what they did on the screen in round 1 (what they looked for, what they misread) over what they predicted in round 3.

## Recommended follow-up

- Solo first-click and think-aloud sessions with Grace-type participants on this screen (no group present) to test themes 6, 7 and 11: what "Open as a new graph" is expected to do, which edge option they pick and why, and whether they know where they are from the rail.
- A version with the near-miss ids shown at the top with a count, against the current version: measure how many participants load with the problem unresolved.
- A rerun task: the same setup applied to a second month's file, with a reconciliation line. Ask participants to say what changed and whether they would load it.
- Before acting on themes 1, 2, 4, 9 and 10, check the spec for what graphty-element already plans for saved import setups, near-miss id detection, left-out-row export, time columns and per-edge source. All of these are data-loading behavior that the element owns, not screen work in the app.
