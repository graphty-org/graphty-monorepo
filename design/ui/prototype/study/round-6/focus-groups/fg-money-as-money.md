# Focus group: money as money

Five simulated participants, each played from a persona file in `study/personas/`. None of them is a real person, and nothing here is the owner's decision. They reviewed the storyboards and the transfers screen, a 3,000-account, 9,113-row money-transfer file drawn as a density picture, with a stats panel and a table drawer. They also saw the notes on the selected-rows footer and the dated trace, which is a table of transfers in date order. The group ran for three rounds:

1. First impressions, and how the screen is organised.
2. Reactions to each other, and what makes a number trustworthy.
3. What would make each of them switch to the tool, what would make them quit, and the one thing they would change.

| Speaker | Role |
|---|---|
| Sarah | Fraud analyst |
| Priya | Threat hunter at a bank |
| Dana | Supply chain risk analyst |
| Chris | ML engineer, recommendation systems |
| Alex | Operations analyst at a logistics company |

---

## Transcript

### Round 1 -- first impressions and organisation

**Sarah (fraud analyst):**
Honestly? The storyboards make more sense to me than the app does. The alert one tells a real story: Nadia clears the tuition payment, sends me the pass-through, and I spend three days finding the ring. That's my week. Except for "four of them never alerted", which I'd want proven.

Then you open the transfers screen and I get a grey blob of 3,000 hexagons. Over on the right it says "Nodes", "Edges", "Density", "Weak components". I don't know what any of that is for, and it tells me nothing about the case. The only line I actually read was "amount not used yet". Not used yet? That's the whole file. On this screen the amount is just decoration, and all the thing is counting is links.

The organisation's fine, I suppose. Graph, Data, Results, Notes. I'd go straight to the Table at the bottom and ignore the rest. "Nothing has been sent from this project" I like. My manager would ask about that first.

To whoever said the side panel is tidy: tidy isn't the same as useful. Where are my in-versus-out totals by counterparty? That's my pivot table, and it's ten minutes of work.

**Priya (threat hunter):**
I checked the transfers screen against how I'd check my own data. The top bar says "direction followed, amount not used yet." Good, that's honest, and I read it first. But then "Edges 9,113 edges (rows)" sits right above "Linked pairs 9,113." Are those the same number by coincidence, or does it just count rows? If two transfers between the same pair got merged, I need to know, because that's exactly where the money hides. A blob of 3,000 hexagons with no labels tells me nothing. I'd scroll past it to the table.

The storyboards feel like they were written by someone who watches a graph. I watch a timeline. Alert triage came closest, because it has dates on it. The left rail with Graph, Data, Results and Notes makes sense. "Sets and paths" does not. I don't know what goes in there until I've made one.

Where is the query box? Clicking "Quick actions" isn't how I narrow 9,000 rows.

**Dana (supply chain risk):**
First thing I saw on the transfers screen was a big grey blob of hexagons. The label says "3,000 accounts drawn as density". Fine. But what am I supposed to tell the VP about a blob? The one line I actually read was top right: "amount not used yet." So the money is sitting in the file and nothing on this screen uses it. That's the whole question for today, isn't it? It's small grey type, too. I leaned in to read it.

The left side, with Graphs, Sets and paths, Views, looks like folders. I'd guess it's where I keep things. I don't know what "Linked pairs" is or why it matches "Edges" exactly. And "Weak components: 1"? Is weak bad?

The storyboards help more than the screens. At least they tell a story in order.

I'm guessing the ML engineer will say he'd just do this in pandas. I'd do it in a pivot table in ten minutes. So show me a total per supplier that ties to my spend column and I'll listen. Until then it's a picture. And where does this file go when I load it?

**Chris (ML engineer):**
The first thing I noticed is that it didn't draw the hairball. "3,000 accounts drawn as density" is the right default. I've closed Gephi over less. And the stats panel says "amount not used yet" in plain words. That's the denominator line I usually have to dig for, so credit there.

How it's organised: three panels plus a table drawer, on a 1440 laptop. The canvas gets maybe half the width. I'd collapse the left rail on day one. "Edges 9,113 (rows)" next to "Linked pairs 9,113" reads like the same number twice. Either tell me when they'd differ or drop one.

Storyboards: the money ones aren't my domain, but the weight question is my problem too. Is a purchase worth more than a click, or is it a cost? I've watched people get that backwards in a notebook. My worry is the app asks me every single run. I'd want to set it once per column and have every result say which reading it used.

Honestly, "Quick actions" and "Assistant: Off" tell me nothing. What would it compute? For totals per account I'd still do `groupby().sum()` in pandas, unless the footer shows the row count it summed.

**Alex (operations analyst):**
The first thing I looked for was whether my data goes anywhere. "Nothing has been sent from this project" is right at the top, and the assistant says "Off. Nothing is sent." Good. That's the line I'd point at if IT asks.

Then I checked the counts. 3,000 nodes and 9,113 edges, and "rows" tells me that's my CSV line count, so I can match it against SQL. But why is "Linked pairs" a separate line when it's the same number? If they're ever different I'd want to know why before I paste anything.

The line that actually worried me is "amount not used yet". It's a transfers file, and the amount is the whole point of it. It says that in small grey text with a "Change..." link. I nearly missed it.

The picture is a grey blob again. At least it says "3,000 accounts drawn as density" and doesn't pretend to be something else.

The left side isn't clear to me: Graph, Data, Results, Notes, and then Graphs, "Sets and paths" and Views under that. I don't know which one holds my metrics table. And "Style stack" means nothing to me.

The storyboards I skimmed. There's too much text in them, and I read the pictures.

### Round 2 -- reacting to each other, and trust

**Sarah (fraud analyst):**
Chris, I don't want it remembered for me. If a default is quietly doing the job, I can't defend it to an examiner. Ask me, and then print the reading on the result so it ends up in my case note.

The part I trust least is the footer on the dated trace. It shows Money in 22,670.50 and Money out 28,321.82 for all of August. That month-wide total hides the story. Only 3,479.70 came in on Aug 5 before roughly 28,000 went out on Aug 6. The two inflows of about 9,000 on Aug 17 and Aug 24 came in after it had already gone. So where did the money for the Aug 6 outflows come from? I had to add the column up in my head to see that. The note says a From date splits the footer in two. Fine, but show that split first. Right now I'd be copying the month total into the case note and getting it wrong.

Priya's right about merged transfers. At least here it's 8 rows, and they're dated.

Dana, a pivot gets me the totals. It doesn't get me the order the money moved in, and the order is the case.

**Priya (threat hunter):**
Chris, I'm with you on setting it once. But once per column isn't enough for me. I want it written into the saved query. Next month I rerun the same hunt, and if someone changed the default in between, my numbers change quietly and I won't know. Every result should say what the amount meant and who set that.

Alex, you and I asked the same thing about "Edges" and "Linked pairs". Nobody's answered it. If three transfers between the same two accounts count as one pair, then the pair count is how the money gets hidden. I'd want the table to show me those merged rows, not a little info icon.

Sarah wants in against out per counterparty. I want the same thing with dates on it. For a mule account, the totals matter less than the order: money comes in, then money goes out within the hour. A total for all of March doesn't show that. Dana, a pivot shows you where it ended up. It doesn't show when it moved.

What's still missing is a box to type the filter in. I'm not clicking "Quick actions" to get down to amounts over 9,000.

**Dana (supply chain risk):**
Trust comes down to one thing for me. Does the total tie to my spend column? I read in the notes that selected rows get a footer like "Sum of Money in, 14 rows". That's the first thing today I'd actually use. If I pick all my suppliers and that sum matches my ERP spend total to the dollar, I'll believe the rest. If it's off by even a little, I'm back in Excel, and I won't come back.

Sarah's right about the pivot. Money in and out per counterparty is the whole job, and it should be a column, not something I have to go and build.

Chris, I'm with you on setting it once. Spend is spend. Don't ask me every run what a bigger number means. Ask me once, remember it, and print it on the result, so my VP doesn't have to ask me.

Priya's point about merged transfers worries me too. Two ERPs, duplicate suppliers. If rows get combined, I need to see how many.

What's missing is periods. My VP asks "last quarter", never "all time".

**Chris (ML engineer):**
Sarah's right that tidy isn't the same as useful, but for me the useful part is whether I can check it. The footer says "Sum of Money in, 14 rows." Good, it gives the row count, and that's what I asked for. Now tell me whether duplicate transfers between the same pair got summed or merged first. That's Priya's question too, and it's the same bug.

On the weight question I disagree with the screen. It asks "a bigger value means" on every run and remembers nothing. Twenty runs a day on the same column means twenty times I answer the same question. I'd get it wrong once out of boredom, and that's worse than a default. Set it once on the column, let a run override it, and print "Distance = 1 / value" on the result. That state line is the good part. Keep it.

Alex, your IT line is fine, but what I'd paste is the header, "Betweenness exact, unweighted, full graph." That header is my methods section.

What's missing is an export that writes out the reading of the weight and the groupby it did, so I can rerun it in pandas and get the same number. If the numbers match, I stop rerunning.

**Alex (operations analyst):**
Trust first. Chris, I agree with you: the footer is only worth something if it says how many rows it summed and whether it skipped any blanks. I'd check the footer against my SQL before I believed anything else on the screen. If they don't match to the penny, I'm done with it.

Priya's right about merged transfers. If two payments between the same pair got folded into one line, then "Linked pairs" and "Edges" should come apart, and I'd want the screen to tell me that happened, not leave me to notice.

Sarah, I don't really want a pivot table in here. My pivot is already in Excel. What I can't do in Excel is follow the money through two or three hops.

Here's how it fits my week. I'd run it once, and next month when the data refreshes I'd want the same answer from the same settings without clicking through everything again. If it asks me every time what a bigger amount means, I'll pick the wrong one on a Friday. Set it once per file, like Chris said, and stamp it on every result.

What's missing: I can't tell who set that reading or when.

### Round 3 -- switch, quit, and the one change

**Sarah (fraud analyst):**
I'd give up on it the first time I paste a number into a case note and it turns out to be the wrong one. That footer is a good example. It shows the total for all of August, and the story is in the order the money moved: about 3,500 came in on Aug 5, about 28,000 went out on Aug 6, and the rest came in later. If I have to add that up in my head, it's no faster than my spreadsheet.

Chris, Dana, Alex, you all want it remembered. Fine for your volume. But my numbers go to an examiner, and "a default did it" is not an answer I can give. So remember it if you like, as long as every result prints what the amount meant, who set it, and when. Priya said the same.

I'd switch for one thing: show the money in before and the money out after, split at each outflow, per account, on the dated trace. That's the three days of work I do by hand.

The one thing I'd change is to make that split the first thing you see, not the month total.

**Priya (threat hunter):**
Two things would make me quit. First, if the pair count ever merges three transfers into one line and the screen doesn't show it. Second, if a rerun next month gives different numbers because someone changed the amount reading and nothing flagged it. Either one and I'm back in Splunk and a notebook, and I won't come back. An analyst doesn't give a tool a second chance on evidence.

Here's what would make me switch. Sarah caught the Aug 5 against Aug 6 thing by adding it up in her head. I want the screen to do that for me. Give me in-before and out-after sums at every hop, with timestamps and not just dates, because a mule moves money in hours.

Sarah, I agree about asking, but only the first time. After that it goes into the saved hunt, and every result says who set it and when. Dana, a remembered default without a name on it is how an examiner catches you out.

The one thing to change: give me a query box. "amount > 9000 AND time < 1h after inbound." Right now I'd have to click Quick actions to get anywhere near that, and it doesn't get me there.

**Dana (supply chain risk):**
What would make me quit is the footer disagreeing with my ERP spend total, even by a dollar, with nothing on screen saying why. Alex, I'm with you. If it's off to the penny, I'm done.

What would make me switch is a spend total per supplier that ties out, filtered to last quarter, and stamped with what the amount was taken to mean. Then I can paste it into the VP deck without a footnote war. Leadership already thinks our risk platform covers this. A picture won't change their minds, but a number that ties out will.

Sarah, I get why you want to be asked every time, because an examiner is grilling you. Nobody grills me. I'll still take one question on the file, as long as it's remembered, and the answer is printed on every result along with who set it.

Priya's merged-rows point is the one I lose sleep over. With two ERPs I've got duplicate suppliers everywhere. If rows get folded together, the footer has to say how many.

The one thing to change: put a period picker right beside the total. "All time" is never what my VP asks for.

**Chris (ML engineer):**
I'd quit over one thing: a number I can't reproduce. If the footer total and my `groupby().sum()` disagree by even one row, I'm back in the notebook, and I won't come back to check again. Alex said the same thing about his SQL.

What would make me switch is an export I can rerun. I mean the result plus the weight reading ("distance = 1 / amount"), whether duplicate transfers between a pair were summed or merged, the row count, and the date window. If I rerun that in pandas and get the same answer twice, I stop rerunning it.

Sarah, you're right that a hidden default can't be defended. Priya's version fixes that, though. Store the reading in the saved query, not in some global setting, and print who set it and when. That way it's still asked for once and it's still on the record. Being asked every run is how I'd pick the wrong reading at 6pm.

If I could change one thing, it would be this: when "Edges" and "Linked pairs" differ, show me the merged rows. Right now they're the same number and nobody on screen can tell me why.

**Alex (operations analyst):**
What would make me switch is simple. I refresh the file next month, open the project, and get the same numbers from the same settings, and every result is stamped with how the amount was read, who set that, and on what date. Then I can stop doing the Gephi half by hand every month.

What would make me quit is a footer total that doesn't match my SQL. Or finding out later that two transfers got folded into one "linked pair" without the screen telling me. Either one and I'm back in NetworkX for good.

Chris, you'll rerun it in pandas either way, and I get that. I only need to rerun it once. If the numbers match, I'm done checking.

Sarah, I've changed my mind about the dated trace. The month total really does hide the order. I'd want the before and after split shown first.

The one thing I'd change: set the amount reading once for each file, let me override it on a run, and print that reading on every result I paste.

---

## Synthesis

Severity uses Nielsen's scale: 4 is a catastrophe, 3 is major, 2 is minor, 1 is cosmetic. Counts are out of five speakers. A finding counts as "independent" only when the speaker raised it before hearing it from anyone else, which in practice means in round 1. Anything that first appeared in round 2 or 3 after another speaker had said it counts as agreement, not as separate evidence.

### Themes

**1. The amount goes unused on a money file, and the one line that says so is easy to miss.** Severity 3.
- Voiced by all 5, all independently in round 1. Sarah, Dana and Alex called it the whole point of the file. Priya and Chris praised the line for being honest.
- Dana ("small grey type ... I leaned in") and Alex ("I nearly missed it") both said the line is too quiet for how much it matters.
- Agreement: the screen is honest to say this, but on a transfers file the amount not being used is the headline, and it is shown as a footnote. Nobody disputed it.
- Dissent: none on the substance. Priya and Chris gave credit where the other three gave alarm. They were reacting to the same line, so this is a difference of tone, not a split.

**2. "Edges" and "Linked pairs" show the same number, and nothing explains when they would differ.** Severity 4 for the risk as the participants described it; see the caveat at the end of this theme.
- Priya, Chris and Alex raised it independently in round 1. Dana raised it independently too, as "I don't know what Linked pairs is". That makes 4 of 5.
- Sarah endorsed it in round 2 without first raising it herself.
- By round 3 it was a stated quit condition for Priya, Alex and Chris. Priya and Chris named it as their single change, and Dana said it is what she "loses sleep over".
- Agreement: if several transfers between the same two accounts are combined into one pair, the screen must say so and show the combined rows. An info icon is not enough (Priya). The footer should say how many rows were combined (Dana).
- Dissent: none.
- Caveat: in the mock the two numbers are equal because the sample data has no repeated pairs. The fear was triggered by an unexplained coincidence, not by an observed merge. The underlying need is real and was widely shared, but "severity 4" rates the risk as they described it, not a failure anyone actually hit.

**3. A total covering the whole period hides the order the money moved in. Show the in-before and out-after split first.** Severity 3.
- Sarah raised it in round 2 with worked figures from the dated trace, and made it her switch condition and her one change in round 3.
- Priya added timestamps: a mule account moves money in hours, so dates alone are not enough.
- Alex changed his mind in round 3 and asked for the split to be shown first.
- Dana and Chris did not engage with order. Their needs are totals over a period.
- Agreement: 3 of 5. The two participants whose work is about money moving through accounts (fraud and threat hunting) ranked this highest.
- Dissent: Dana, and Alex before round 3, treated per-counterparty totals as the job. Sarah and Priya both told Dana directly that a pivot table shows where money ended up, not when it moved.
- Mock note: the split only exists in a design note ("a From date splits the footer in two"). Nobody saw it rendered, so this is a finding about what is shown first, not about whether the split can be made.

**4. What the amount means should be set once, remembered, overridable on a run, and stamped on every result with who set it and when.** Severity 3.
- Chris proposed setting it once per column (round 1). Dana and Alex agreed in round 2; Alex wanted it per file.
- Priya moved it into the saved query so that a rerun cannot change quietly. Alex then asked for "who set it, and when".
- Sarah opened opposed: she wanted to be asked every time, for defensibility to an examiner. By round 3 she accepted remembering, provided every result prints the reading, who set it and when.
- Final agreement: 5 of 5 on the stamp. 4 of 5 on remembering by default, with Sarah conditional.
- Dissent that still stands: where the remembered value lives. Chris said per column, Alex per file, and Priya and Chris (by round 3) in the saved query. This split is unresolved and matters for the design. Sarah's underlying point also stands: a default that no name is attached to cannot be defended.
- The screen's current behaviour, asking "a bigger value means" on every run, was rejected by 4 of 5 as a source of mistakes made out of boredom ("wrong one on a Friday", "at 6pm").

**5. A number is trusted only if it ties out to the participant's own system, to the penny, and states the rows it summed.** Severity 3.
- Chris named the row count first (round 1). Alex's version was "match to the penny against SQL". Dana's was "ties to ERP spend to the dollar", and Chris's was "rerun in pandas".
- 4 of 5, each tying out against their own tool. Sarah framed the same worry as pasting a wrong number into a case note.
- Further asks: say whether blanks were skipped (Alex); an export that records the weight reading, the handling of duplicates, the row count and the date window, so the result can be rerun (Chris).
- All four named failing to tie out as a condition for leaving and never coming back. This is the strongest shared statement in the session.
- Agreement: strong. Dissent: none.

**6. The density picture of 3,000 accounts tells a money question nothing.** Severity 2.
- Voiced by Sarah, Priya, Dana and Alex (4 of 5), all independently in round 1. Each of them would skip past the picture to the table.
- Dissent: Chris praised not drawing the hairball as the right default, and Alex conceded that "at least it doesn't pretend".
- Reading: nobody objected to density as the way a 3,000-node graph is drawn. The objection is that the picture answers no question they came with. This theme did not come up again after round 1, which suggests it was a first impression and not a blocker.

**7. There is no way to type a filter or query.** Severity 2 (3 for Priya's persona).
- Priya raised it in all three rounds and made it her one change, with an example query: "amount > 9000 AND time < 1h after inbound".
- Chris said independently that "Quick actions" tells him nothing about what it would compute.
- Nobody else asked for it.
- This is essentially a single voice; see "Discount" below. It is real for the threat-hunter persona and untested for the rest.

**8. Totals per counterparty and per period are missing.** Severity 2.
- Sarah asked for in-versus-out totals per counterparty (round 1). Dana asked for the same as a column and wanted a period picker next to the total ("last quarter, never all time"), which was her one change.
- Priya wanted the same totals with dates attached.
- Alex dissented: he already has pivots in Excel and wants what Excel cannot do, which is following money through two or three hops.
- The period ask comes mostly from Dana. It is the same underlying need as Chris's date window in his export.

**9. The navigation labels are unclear.** Severity 2.
- The labels that confused people were "Sets and paths" (Priya, Alex, Dana), "Style stack" (Alex), "Weak components" (Dana: "Is weak bad?"), "Quick actions" and "Assistant: Off" (Chris, Priya), and the Nodes/Edges/Density stats in general (Sarah).
- Alex could not tell which section would hold his metrics table. Dana read the rail as folders.
- The top level (Graph, Data, Results, Notes) was accepted by Sarah, Priya and Chris. Chris would collapse the left rail on a 1440 laptop because the canvas gets about half the width.
- Voiced in round 1 only. Cross-check this against the round's tree test before acting on it.

**10. The privacy line works.** Positive finding.
- Sarah and Alex independently singled out "Nothing has been sent from this project" as what their manager or IT would ask first.
- Chris said the methods header ("Betweenness exact, unweighted, full graph") is what he would paste, and asked to keep the state line ("Distance = 1 / value").

**11. The storyboards read better than the screens.** Mixed.
- Sarah and Dana preferred the storyboards because they tell a story in order. Priya found them written for "someone who watches a graph", not a timeline, with alert triage the closest. Alex skimmed them as too much text.
- Sarah wants the "four of them never alerted" claim proven.

### Where the group disagreed

- **Asked every run or remembered.** Sarah against the other four at the start. It resolved into remembering plus a stamp showing the reading, who set it and when. The resolution is real, but Sarah conceded under four-to-one pressure (see "Discount").
- **Where the remembered reading lives.** Per column (Chris), per file (Alex), or in the saved query (Priya, and Chris by round 3). Unresolved.
- **Totals or order.** Dana (totals over a period) against Sarah and Priya (order in time). Alex moved from totals to order. Chris is neutral; he wants whatever can be reproduced.
- **Should the tool do pivots at all.** Sarah and Dana said yes. Alex said no, and wants hops instead.
- **The density picture.** Chris approved of it; the others dismissed it.

### Group-think and artifacts to discount

- **"To the penny", "I won't come back".** Alex said "to the penny" and Dana repeated it almost word for word in round 3 ("Alex, I'm with you ... off to the penny"). Every speaker adopted the never-come-back framing once Dana said it in round 2. Count the tie-out need as 4 independent voices (theme 5), but do not read the absolutism as four separate measurements of intolerance. One phrase spread through the group.
- **The stamp convergence.** Theme 4 built up conversationally: Chris proposed, Priya refined, Alex added "who and when", and then everyone repeated the full formula. Sarah's move from "ask me" to "remember plus stamp" happened under four-to-one pressure. Treat her concession as provisional. Her underlying requirement, defensibility to an examiner, should be tested alone with a fraud persona.
- **Alex's change of mind on order.** It came in round 3, right after Sarah and Priya pressed the point twice. It may be persuasion, or it may be conformity. Weight theme 3 on Sarah and Priya, not on three voices.
- **Merged pairs grew in the retelling.** It started as a question about a coincidence (theme 2 caveat). By round 3 it was stated as a known failure ("if the pair count ever merges three transfers"). Nobody saw a merge.
- **Reactions to design notes, not screens.** Dana ("I read in the notes"), Sarah ("The note says a From date splits...") and Chris (the footer row count) reacted to text in the notes describing behaviour that is not rendered. Their praise of the footer and their demand for the split are reactions to promises. Verify both on a rendered state before counting either as validated.
- **Mock data effects.** The equal counts (9,113 and 9,113), "Weak components: 1" and the eight-row dated trace are properties of the sample file. They produced some confusion that real data would produce differently.
- **Cross-talk that was not real.** In round 1, Sarah answered "whoever said the side panel is tidy", but nobody had said it. Dana predicted Chris's pandas remark before he made it. Round 1 was meant to be independent, and these lines show the personas knew each other's positions. Treat round-1 overlap as slightly less independent than claimed.
- **Single voices.** The query box (Priya), the period picker (Dana), the rerunnable export (Chris) and proof of "never alerted" (Sarah) each rest on one persona. Keep them as hypotheses for that persona's segment. They are not group findings.

### What this group points at, in priority order

1. Make an unused amount on a money file impossible to miss, and put the choice of what the amount means where it is read.
2. Explain the relationship between rows and linked pairs, and when rows are combined, show the count and the rows themselves.
3. Make every total state its row count, any skipped blanks, and its date window, and stamp the amount reading on it, with who set it and when.
4. On the dated trace, show the in-before and out-after split before the total for the whole period, and test it on a rendered screen.
5. Settle where the remembered amount reading lives (per column, per file or in the saved query), then test that decision alone with a fraud persona.
