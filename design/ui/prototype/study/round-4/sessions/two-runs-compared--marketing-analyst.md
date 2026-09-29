# Session: rank the same characters again with one thing changed, and say what differs -- Jordan, marketing network analyst

Participant: Jordan (study/personas/marketing-analyst.md), a growth-marketing analyst who does "the network stuff" one or two days a week. She knows betweenness as "the bridges" and calls every centrality an "influence score".

Task as given: "Yesterday you ranked the Les Miserables characters one way. A colleague asks you to rank them again with one thing changed, and to tell her what differs between the two rankings and how each was made."

What she decided the task meant: yesterday's ranking was betweenness ("who bridges the groups") on the whole cast. The one thing she chose to change is the weight: count how many scenes two characters share, instead of treating every pair as the same. She picked it because the result itself offered it ("Weight: value, not used yet. Change...").

Screens used, in the order she reached them, all at 1440 by 900 (her laptop), rendered as a participant sees them:

- the Les Miserables result under a filter, with its run record open (shots/r4-jordan-tworuns-results-panel-filtered.png)
- the table dock on the full cast (shots/r4-jordan-tworuns-table-dock-small.png)
- the options popover after Cancel, and while a second run is going (shots/r4-jordan-tworuns-results-panel-canceled.png, shots/r4-jordan-tworuns-results-panel-running-result.png; these show a patent network, not Les Miserables)
- a node selected, with its value in each result (shots/r4-jordan-tworuns-results-panel-node-selected.png)
- the result in the inspector (shots/r4-jordan-tworuns-inspector-result.png)
- the comparison surface: two measures, two data versions, and the strip of surrounding states including the "Compare with" picker (shots/r4-jordan-tworuns-comparison.png, shots/r4-jordan-tworuns-comparison-versions.png, shots/r4-jordan-tworuns-comparison-strips.png)
- the three-measure table (shots/r4-jordan-tworuns-table-dock-ranked.png)

## Think-aloud

**1. Finding yesterday's ranking.** "OK, Les Miserables. I open the project and... the right side already has Betweenness, 'Result'. Top nodes: Valjean 0.419, Gavroche 0.172, Marius 0.164, Fantine, Javert. Fine, Valjean at the top, that's who I'd expect, so I believe the rest. That's my known-account check done."

"Where does it say it's yesterday's, though? 'Runs 1. Run 1, 0.1 s, shown.' Point one seconds is how long it took. I don't care how long it took yesterday. I want 'Run 1, Tuesday 4:10pm' or whatever. If my colleague asks 'is this the one you sent me?' I can't tell from this."

**2. The number that doesn't match.** "Hang on. Down at the bottom the table says Valjean betweenness 0.570. The panel says 0.419. Same guy, same measure. This is the Talkwalker thing all over again -- dashboard says one number, download says another."

"...OK, wait. Top left there's a box that says 'Filtered: 60 of 77 nodes, 1 step'. And the panel line says 'on: filtered graph, 60 nodes'. And the table's column header says 'Betweenness exact, unweighted, full graph'. So one is the whole cast and one is 60 of them. Honestly that's good -- it told me why, I didn't have to email anyone. But it took me a minute of being annoyed first. And it makes me worry: did I leave a filter on yesterday? Because if I did, the 'one thing changed' already happened and I didn't choose it. The filter box is small and up in the corner; I'd have walked past it."

"I clicked 'Details'. Run record: Method -- 'Brandes betweenness, exact'. Seed none. Damping 'does not apply'. Normalization, some formula with n-1 -- skipping that. Weight conversion 'None: value not used'. Scope 'Filtered graph, 60 of 77: after Filter to degree >= 2'. And a Copy button. OK, that's the 'how was it made' half of my colleague's question, right there. I'd copy that and paste it under the table in the email. I like that it writes 'Does not apply' instead of leaving a blank -- a blank I'd have asked about."

**3. Changing the one thing.** "'Weight: value, not used yet. Change...' So I can weight it by how often they're together. That's what I'd want anyway -- two characters in thirty scenes together are closer than two in one scene. I click Change."

"And now I'm... in a patent citations project? 124,318 nodes? That's not mine. [Moderator: the mock shows this step on a different dataset.] Fine, pretend it's Les Mis. There's a popover, 'PageRank options', 'Options wait for Run'. Scope, Direction, Weight, Damping. The one I changed has a little blue dot, and a box says 'Damping 0.5 has not run. Run queues it after this run.' Then Run and Reset."

"I'd never click Reset, it sounds like it throws away yesterday. Here it's next to Run in the same box, which makes me nervous. I'd hover it first. If it said 'put the options back to run 1's' I'd be OK."

"For my case the Weight dropdown would say 'value'. Does it know that more scenes together means closer, not further apart? It just says 'value'. I'm assuming it does the sensible thing. If it doesn't, I'm going to tell my colleague 'weighted by scenes together' and be wrong, and I'd never know. The run record has a line for 'Weight conversion' -- so I guess after the run it would say what it did. I'd read that line. I would not read it before I pressed Run."

**4. Does running it again wipe yesterday?** "This is the thing I actually care about. In Gephi, you run the statistic again and the column's just gone, overwritten. Here -- 'Runs 2. Run 2, running, 62%. Run 1, damping 0.85, shown.' So yesterday's is still there and it's still the one on screen while the new one runs. Good. That's the first thing in this whole session that saves me a step I do today: I usually duplicate the column in Excel before re-running."

"But when run 2 finishes, which one does the canvas show? Which one does the table show? The table header said 'Betweenness exact, unweighted, full graph', which is great, it names how it was made -- so will there be a second column that says 'weighted by value'? Or does the column just change under me? I didn't find a screen that shows two runs of the same thing side by side in the table. For my colleague I need both columns in one CSV."

**5. The two panels that don't look the same.** "I opened the result from the inspector side to check, and it's laid out differently. Here 'Compare with...' and 'Show as style layer' are big buttons at the top. On the other screen 'Compare with...' is a little link at the bottom under Runs. And Runs here says '1 run, this one, on the full graph' instead of 'Run 1, 0.1 s, shown'. Are those two different products? I'd have looked for Compare in the wrong place on one of them."

"I clicked a character to see if it tells me their number in each run. It says 'a node selected: its value and rank in each run', and lists Closeness #2, Betweenness #2... one row per measure. If there are two betweenness runs, is that two rows? I'd want 'Valjean: #1 unweighted, #1 weighted'. I'm guessing it would. Didn't see it."

**6. Compare with.** "OK, 'Compare with...'. The picker says 'Compare PageRank with', a search box 'Find a result or run', then 'PageRank on March data', 'Betweenness -- Not run', 'Degree'. So it does list an older one, but that's older DATA, not an older run with different settings. Where is 'Run 1'? For me it should say 'Betweenness, run 1, unweighted' or something. I'd type 'run' in the search box and hope. If it isn't there I'm back to exporting two CSVs and doing VLOOKUP, which is exactly what I do now."

**7. The comparison itself.** "Let me look at the month one, that's the closest thing to mine: same measure, one thing different. The title says 'PageRank, March and April'. Each side has its own line -- 'PageRank on March data, Earlier data, on: March, 3,000 accounts. Unweighted, directed. Details.' So each side says how it was made and has its own record. For my colleague's second question that's basically the answer, I'd copy both."

"'49 of the top 50 in both months. The rankings mostly agree at the top.' That's the sentence. That's what I'd put in the email and on a slide. I don't have to explain anything. Top 5, 10, 20, 50, 100 buttons -- nice, for Les Mis I'd click 10 because there are only 77 characters."

"Then the list on the right, 'Moved': ACC-488401 was #1,575 in March and #88 in April, moved 1,487. That's 'what differs', person by person. For Les Mis it'd be 'Fantine dropped from #4 to #9 once you count scenes' or whatever it actually does. That's the interesting bit and it's sorted by it. Good."

"The Spearman line, 0.76 leaving out 900 tied accounts, 0.88 with them. I know Spearman from a stats class I mostly forgot. My colleague won't know it. I'd leave it out of the email. The scatter -- log rank against log rank -- is for the data science guy. I'd not put it in front of my VP. My VP reads the first slide and nothing else, which is why the '49 of 50' sentence matters and the chart doesn't."

"'PageRank gives the same result every run, so a re-run cannot tell change from noise. Compare with randomized baseline...' I have no idea what that link does and I wouldn't click it. But 'same result every run' is actually reassuring for my case -- if the weighted and unweighted lists differ, it's because of the weight, not luck. I'd like it to just say that about betweenness too."

**8. The PageRank-versus-betweenness one.** "This one says '0 of the top 50 in both. The rankings disagree at the top.' Same layout, so once I've read one I can read the other. Fine. It's not my task, but it tells me the picker also does two different measures, which I'd use for 'hubs versus bridges' on a creator list. That's actually a slide I've tried to make before."

**9. Getting it out.** "'Export table as CSV...' is in the dock in the comparison. Does it give me both rank columns and the 'moved' column? The dock says 'Table' and 'Scatter' tabs; if the Table tab has both ranks, that's my CSV. I'd need to see the file to believe it -- last time I hit export I got a picture."

"'Save comparison' turns it into a result, it says, and there's an Undo. OK, so tomorrow when she asks again I can find it. I'd save it."

"Scale question, since I always ask: this is 77 characters. The month one is 3,000 accounts and it seems happy. Our real creator network is 60,000. The 'Betweenness has not run... a few seconds on 3,093 accounts' note tells me it estimates time, which I like. I'd want the same for my size. Not today's task."

"Also -- 'Nothing has been sent from this project' in the corner. I noticed it. I'd still ask IT before loading our CRM list, but for a novel about French people, fine."

## Her answer to the task

"Yesterday's: betweenness on Les Mis, exact, no weights. I'd check the scope line and the filter box first, because if the 60-of-77 filter was on, that's already a second difference I didn't intend. Today's: the same, weighted by how many scenes each pair shares. I'd send her the 'X of the top 10 in both' sentence, the moved list for anyone who shifted more than a few places, and the two run records copied under it so she can see how each was made. I got to that on the screens for the month-to-month version. For two runs of the same measure on the same data I had to guess that the picker and the table would treat run 1 and run 2 the way they treat March and April."

## Single Ease Question

4 out of 7. "The comparison screen is really good once you're in it -- it gives me the sentence and the list. Getting there for my exact case I was guessing: is yesterday's run in the picker, is it called 'Run 1', will the table keep both columns. And the numbers not matching between the panel and the table gave me a bad minute before I found the filter."

## Would she use this instead of her current tool?

"For this job -- yes, probably, over Gephi plus Excel. What I do now is re-run in Gephi, lose the old column, export twice and VLOOKUP. Here the old run stays, each side says how it was made, and it writes the 'how much do they agree' sentence for me. But my data-science colleague could do this in the notebook in ten minutes, so it has to be quicker than asking him, and it has to hand me one CSV with both columns. If the picker doesn't show 'run 1' by name, I'm back to asking him."

## Problems observed

1. **No date on a run.** The Runs list says "Run 1, 0.1 s, shown" and the inspector says "1 run, this one". Neither says when. "Yesterday's" cannot be identified; she wanted the day and time. Severity 3.
2. **The "Compare with" picker shows no earlier run of the same measure.** The picker drawn lists "PageRank on March data", other measures, and "Not run". No entry for "Run 1" with its differing option. Her whole task depends on that row; she would type "run" in the search box and hope. Severity 4.
3. **Two runs of one measure in the table are not shown.** The column header names how a column was made ("Betweenness exact, unweighted, full graph"), which she valued, but she could not tell whether a weighted run adds a second column or replaces the first. She needs both in one CSV. Severity 3.
4. **Panel and table disagree until the scope is noticed.** Valjean reads 0.419 in the result panel (filtered, 60 of 77) and 0.570 in the table (full graph). Every label is there, but she read the mismatch first as "the numbers don't match" and needed a minute to find the small filter box. A filter left on from yesterday would silently be a second change she never chose. Severity 3.
5. **Two layouts for one result.** Opened from the results panel, "Compare with..." is a row under Runs; in the inspector, it is a button at the top beside "Show as style layer", and Runs reads differently. She asked if they were two products. Severity 3.
6. **The weight's meaning is not said before Run.** Choosing "value" as the weight gives no hint whether more shared scenes means closer or further apart; the run record's "Weight conversion" line only answers after the run. She would have reported "weighted by scenes together" without knowing which way it was used. Severity 3.
7. **Reset sits next to Run in the options box.** She read it as "throw away yesterday" and would not click it without a hover. Severity 2.
8. **The walk jumps dataset.** The options and second-run screens are on a patent network, not Les Miserables, which broke her thread. A mock artifact, but it cost her attention. Severity 2.
9. **Spearman and the log-rank scatter are for someone else.** She skipped both for her colleague and her VP; the overlap sentence carried the answer. Not a defect, but the sentence should stay first. Severity 1.
10. **Whether the CSV holds both ranks and "moved" is not shown.** "Export table as CSV..." is present, but she could not see what the file contains. Severity 2.

## What she liked

- The old run stays, and stays on screen while the new one runs ("Run 1 ... shown"). This saves the step where she duplicates the column in Excel before re-running.
- The run record: method, seed, damping, normalization, weight conversion, scope, with "Does not apply" written out and a Copy button. That answers "how was each made".
- "49 of the top 50 in both months. The rankings mostly agree at the top." The sentence she would paste into the email and the slide.
- The "Moved" list, sorted by how far each one moved.
- The column header that names the method, weight and scope, and the scope line that explained the panel-versus-table mismatch once she found it.
- "Same result every run", which told her any difference between her two runs comes from the change, not from chance.
