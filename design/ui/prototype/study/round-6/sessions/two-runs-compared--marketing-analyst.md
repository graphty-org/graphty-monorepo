# Session: rank the same characters again with one thing changed, and say what differs -- Jordan, marketing network analyst

Participant: Jordan (study/personas/marketing-analyst.md), a growth-marketing analyst who does "the network stuff" one or two days a week. She calls every centrality an "influence score" and betweenness "the bridges".

Task as given: "Yesterday you ranked the Les Miserables characters one way. A colleague asks you to rank them again with one thing changed, and to tell her what differs between the two rankings and how each was made."

What she decided the task meant: yesterday's ranking was betweenness on Les Miserables. The one thing she changes is the weight: count how many scenes two characters share instead of treating every pair the same. She picked it because the result itself offers it ("Weight: value, not used yet. Change...").

Screens used, all at 1440 by 900, as a participant sees them (design notes hidden):

- the navigation screen on Les Miserables (shots/jordan-r6-tworuns-navigation.png)
- the betweenness result on Les Miserables under a filter, with its run record open (shots/jordan-r6-tworuns-results-panel-filtered.png)
- the options while a second run goes, and after Cancel (shots/jordan-r6-tworuns-results-panel-running-result.png, shots/jordan-r6-tworuns-results-panel-canceled.png; both on a patent network)
- the Runs list with the "Compare with" menu open (shots/jordan-r6-tworuns-results-panel-compare-with.png; patent network)
- the comparison surface: two months, and the strip of smaller states, including a comparison of one measure at two settings and the inspector's "Compare with" picker (shots/jordan-r6-tworuns-comparison-versions.png, shots/jordan-r6-tworuns-comparison-strips.png, shots/jordan-r6-tworuns-comparison-strips-2.png; payments network)
- the table dock on Les Miserables (shots/jordan-r6-tworuns-table-dock-full.png, top state)

## Think-aloud

**1. Opening the project.** "Les Miserables, OK. Graph on the left, the table underneath sorted by degree, the right side says Co-appearances, 77 nodes. Where's my betweenness from yesterday? It's not painted, it's not a column in the table, it's not in the style stack. So it's -- in 'Results' on the left rail, I guess. There's a Results icon. Fine, I'd click that. I'd have liked it just open where I left it, but fine."

**2. Finding yesterday's ranking.** "Here. 'Betweenness, on 60 of 77 nodes, Sep 28 11:02.' OK! There's a date. Last time it said 'point one seconds' and I complained. Now I can tell my colleague 'the one from the 28th at 11.' That's what I wanted."

"Top nodes: Valjean 0.419, Gavroche 0.172, Marius 0.164, Fantine, Javert. Valjean on top, fine, I believe it."

"And -- 60 of 77. Up top the box says 'Filtered: 60 of 77 nodes, 1 step', and it's a real box now, bigger, not the tiny thing in the corner. And the title of the result says 'on 60 of 77' before anything else. So I can't miss it. Which means: yesterday's ranking was on a filtered cast. Did I mean that? I have to decide whether 'the one thing changed' is the weight, or whether I also take the filter off. If I change both, my colleague's question 'what differs' has two answers and I can't separate them. I'd keep the filter on. At least the screen told me before I made the mistake, not after."

"Details. Run record: Brandes betweenness, exact. Seed none. Damping 'does not apply'. Normalization -- formula, skip. Weight conversion 'None: value not used'. Scope 'Filtered graph, 60 of 77: after Filter to degree >= 2'. Engine WebGPU, took 0.1 s. Copy button. That's the 'how was it made' half. I'd paste it under the table in the email."

"The table below says Valjean 0.570, betweenness 'exact, unweighted, full graph'. The panel says 0.419. I know why now -- full graph versus 60 of 77 -- because both say it. Still: two numbers for the same guy on one screen. A VP who looks over my shoulder asks 'which one?'. I'm OK. He isn't."

**3. Changing the one thing.** "Top of the result: 'Weight: value, not used yet. Change...' and a greyed-out button 'Re-run (keeps Run 1)'. Oh, that's nice. That button text answers the thing I was scared of last time -- is re-running going to wipe yesterday. It says it keeps it, right on the button. I don't have to hover. It's greyed because I haven't changed anything yet, and the hover says 'The options match Run 1. Change one to re-run.' Makes sense."

"I click Change... and -- I'm in a patent project again. 124,318 nodes. [Moderator: this step is drawn on a different dataset.] Same thing as last time. Pretend it's Les Mis. 'PageRank options, Options wait for Re-run.' Scope, Direction, Weight, Damping. In my case Weight is the one I'd change, to 'value'."

"And I still don't know what 'value' does. More scenes together -- is that closer, or further apart? For betweenness that's the whole question: if it treats 30 scenes as a long road, my bridges come out backwards and I'd never know. The dropdown just says the column name. The run record has a 'Weight conversion' line, so I'd find out afterwards. I would not know before I pressed the button, and I might not go back to check."

"In the running picture: 'Run 2 running on WebGPU, under a minute', Cancel, progress bar. 'Runs of this measure 2. Run 2, damping 0.5, Sep 28 10:21, running 62%. Run 1, damping 0.85, Sep 28 10:14, shown.' So Run 1 stays on screen while Run 2 goes. Each run is named by the thing that's different -- 'damping 0.5', 'damping 0.85' -- plus when. That's exactly how I'd label them in a spreadsheet. Good."

"Then the popover says 'Damping 0.7 has not run. Run queues it after this run, and keeps Run 1.' OK, 0.7 is a third one I'm queuing? Fine. And 'Reset' is still sitting next to Run in that little box. What does Reset reset? The options, or the runs? I hovered, nothing. I'm not clicking it. Same complaint as last time."

**4. Two runs in the list.** "The Runs list, newest first: 'PageRank, damping 0.5, Sep 28 10:21', 'PageRank, damping 0.85, Sep 28 10:14', then Betweenness, components. Every run with its difference and its time. For my case it'd say 'Betweenness, weighted by value, Sep 29' and 'Betweenness, on 60 of 77, Sep 28 11:02'. Yes. That's the list I'd want."

"There's a little compare icon on the row. Click it: 'Earlier runs of PageRank: PageRank, damping 0.85, Sep 28 10:14.' Then 'Other runs on this graph', then 'The same run on another data version...'. There it is. That's the thing I couldn't find last round -- yesterday's run of the same measure, first in the list, named by its difference and its date. I'd click it without thinking."

**5. The comparison of two runs.** "OK, now what does it look like. The big comparison screen is March against April, not my case. In the little states under it there's one called 'PageRank at damping 0.85 and 0.5'. That's mine -- same measure, one setting changed."

"'Damping 0.85 -- PageRank run 2. Unweighted, directed. Details.' 'Damping 0.5 -- PageRank run 1.' Wait. Run 2 is 0.85? On the results screen Run 1 was 0.85 and Run 2 was 0.5. And down in the inspector picker it says 'PageRank, damping 0.5 -- Run 1'. So which one is Run 1? This is the dashboard-says-4,000, download-says-3,100 thing. If my colleague asks 'is run 1 yesterday's?' I'd give her the wrong answer from one of these screens. I'd stop using the run numbers and only say 'the 0.85 one', which is fine, but then why show me numbers?"

"And no dates on this one. The run list had dates, the result header had a date; the comparison, which is the thing I actually send, just says 'run 2'. The month comparison says 'March data, 3,000 accounts' on each side. I want 'Sep 28 11:02' and 'Sep 29 09:40' on each side of mine."

"'Agreement: The rankings agree at the top. Spearman 0.998, leaving out the 1,153 tied...' That's it? The month one says '49 of the top 50 in both months' with Top 5, 10, 20, 50, 100 buttons. That's the sentence I paste into the email. Here I get Spearman, which my colleague won't read, and 'agree at the top', which is a vibe, not a number. Maybe it's cut down because it's a small tile, I don't know. If the real thing looks like the month one, great. If it looks like this tile, I'm counting overlaps myself."

"'Ranked higher at: Damping 0.85 / Damping 0.5', then a list: ACC-233575 #89 at 0.85, #124 at 0.5. OK, so it's sorted by who moved. For Les Mis that's 'Fantine drops from 4th to 9th when you count scenes' or whatever. That's the 'what differs' person by person. Good. The month one has a 'moved' column with the number of places, this one doesn't, I'd have to subtract. Small thing."

"Save comparison, then 'Comparison saved, Undo', and it shows up in Runs under PageRank. So tomorrow when she asks again it's there. I'd save it."

**6. Getting it out.** "'Export table...' on the dock. In the comparison it'd have both rank columns, I'm guessing, because the Table tab has both. I still haven't seen what the file looks like. Last time I hit export I got a picture. For a 77-row novel I'd honestly just select the table and paste it."

"Table on Les Mis: the column header says 'Betweenness exact, unweighted, full graph'. When I run the weighted one, do I get a second column 'Betweenness weighted by value, 60 of 77'? The panel at the top of the table says 'Valjean is #1 on both measures... Compare rankings...' -- that's degree against betweenness. Nice line, actually, I'd steal it. But I didn't see a table with two runs of the same measure side by side. That's my CSV. I'm assuming."

**7. Off-topic, because it's Monday.** "Honestly the reason I need two rankings side by side is my VP. He reads slide one. If slide one says 'we changed how we count and the list changed', he wants to know if the old list was wrong, and then budget freezes for a month while we argue. So the sentence has to be 'nine of the top ten are the same either way'. That's the whole meeting."

"And for the record -- 77 characters is cute. Our creator graph is 60,000 accounts. The patent one here is 124,000 and it says 'under a minute' for a run. I'd believe it when I see it on ours."

## Her answer to the task

"Yesterday's: betweenness, exact, unweighted, on 60 of the 77 characters because a degree filter was on -- Sep 28 at 11:02. Today's: same thing, same filter, weighted by how many scenes each pair shares. I'd send her the comparison: how many of the top 10 are in both, the list of who moved, and the two run records under it so she sees how each was made. I'd name the runs by what changed and the date, not 'run 1' and 'run 2', because the screens disagree about which is which. And I'd tell her the filter is on, because otherwise she'll look at the full-cast table and think my numbers are wrong."

## Single Ease Question

5 out of 7. "Better than last time, properly better. Yesterday's run has a date, the button says it keeps Run 1, and the compare menu lists the earlier run first, by what's different. That was my whole problem last round and it's fixed. I lose two points because the two-run comparison doesn't give me the '9 of the top 10' sentence the month one gives me, it has no dates, and it calls the runs by the opposite numbers from the results screen. And I still don't know what the weight does before I press Run."

## Would she use this instead of her current tool?

"For this job, yes. What I do now is re-run in Gephi, lose the old column, export twice, VLOOKUP, and count overlaps by hand. Here the old run stays, both are labelled with what changed and when, and the compare menu goes straight to it. If the run-versus-run view gets the same agreement sentence as the month view, I don't need Excel for this at all. If it doesn't, I'm still exporting and counting, and then I might as well ask the data-science guy to do it in his notebook."

## Problems observed

1. **Run numbers contradict each other across screens.** In the results panel, Run 1 is damping 0.85 (Sep 28 10:14) and Run 2 is damping 0.5. In the comparison of the two, damping 0.85 is labelled "PageRank run 2" and damping 0.5 "run 1"; the inspector's picker also labels damping 0.5 "Run 1". She took it as the same kind of screen-versus-download mismatch that makes her distrust a tool, and could not tell which run was yesterday's from the comparison. Severity 4.
2. **The run-versus-run comparison has no overlap number.** The month-to-month comparison says "49 of the top 50 in both months" with Top 5/10/20/50/100; the drawn comparison of one measure at two settings says only "The rankings agree at the top" and a Spearman value. The overlap count is the sentence she sends; without it she counts by hand. (It is drawn as a small tile; she could not tell if the full view has more.) Severity 3.
3. **The comparison names runs without dates.** The run list and result header now carry the date and time, but each side of the run-versus-run comparison reads only "PageRank run 2" and the setting. The thing she sends is the one place the date is missing. Severity 3.
4. **The weight's meaning is still not said before Run.** Choosing "value" as the weight says nothing about whether more shared scenes means closer or further apart; only the run record's "Weight conversion" line says, after the run. Unchanged from last round. Severity 3.
5. **Reset still sits beside Run, with no hover text.** She read it as possibly throwing away runs and would not click it. Unchanged from last round. Severity 2.
6. **The walk still jumps dataset.** Yesterday's result is on Les Miserables; the options, the second run, the run list and the compare menu are on a patent network; the comparisons on a payments network. She had to pretend three times. Severity 2.
7. **Yesterday's result is not visible on opening the project.** The navigation screen shows Les Miserables with no betweenness in the style stack or the table; she had to guess it lived under Results. She guessed right. Severity 2.
8. **Two runs of one measure as two table columns are still not shown.** The column header names method, weight and scope, but no drawn table has two runs of the same measure side by side, which is her CSV. Severity 2.
9. **The run-versus-run "moved" list has no "moved by" column.** The month view shows places moved; the run view shows two ranks and leaves her to subtract. Severity 1.
10. **The queued-run note disagrees with the running run.** While "Run 2, damping 0.5" runs, the popover says "Damping 0.7 has not run. Run queues it after this run." She worked out it was a third run but had to stop and read. Severity 1.

## What she liked

- A date and time on every run and on the result header ("Betweenness, on 60 of 77 nodes, Sep 28 11:02"). She can now say which run is yesterday's.
- "Re-run (keeps Run 1)" written on the button itself, so she knew re-running would not wipe yesterday without hovering.
- The Runs list naming each run by what differs and when ("PageRank, damping 0.5, Sep 28 10:21").
- The compare menu listing "Earlier runs of PageRank" first, which answered last round's top complaint.
- The filter now shown as a clear box and repeated in the result title ("on 60 of 77"), which caught the unintended second difference before she made it.
- The run record with Copy, and "Does not apply" written out.
- "Valjean is #1 on both measures. At #2 they part..." above the table -- a sentence she would reuse.
