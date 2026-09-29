# Session: this week's export -- the knowledge graph engineer

**Participant:** Dr. Min-ji Kim (fictional composite), knowledge graph engineer and ontologist at a financial-services company; GraphDB workbench, SPARQL in notebooks, Protege; distrusts any viewer that invents data on import.
**Task as given by the moderator:** "This week's export arrived. Do what you did last week, and show your manager what changed."
**Screens used, in order:** the load step (its Add data state, then the rest of its frames for context), Version history (the list, the recipe entry, March data open), the results panel (the out-of-date state), the comparison (two data versions). All at 1440 x 900 in the study view, design notes hidden. The prototype is static: no button responds, so where I say "I click" I mean what the page says the control would do.
**Renders:** `shots/r3-ke-weekly-load-add.png`, `shots/r3-ke-weekly-vh-s1.png`, `shots/r3-ke-weekly-vh-s5.png`, `shots/r3-ke-weekly-vh-s2.png`, `shots/r3-ke-weekly-results-outofdate.png`, `shots/r3-ke-weekly-comparison.png`, `shots/r3-ke-weekly-comparison-full.png`.
**Dataset on screen:** a card-and-transfer network, "Payments network review": March, 3,000 accounts and 9,113 transfers (transfers-2026-03.csv); April, 3,093 accounts and 8,370 transfers (transfers-2026-04.csv). The out-of-date results state switches to a 300-protein interaction network.

## Transcript (thinking aloud)

**Before touching anything.** "Last week" for me would be a SPARQL export, not a transfer file, but the moderator has put me in front of a transfers project, so I will play along: last month's file is loaded, this month's has arrived. What I expect to have to do, from every other tool I use: open the project, bring the new file in, re-run whatever I ran, and then produce a before-and-after I can defend. What I am looking for first is what the tool thinks the new file is and what it does with the old one.

**The load step, Add data from transfers-2026-04.csv.** The project title says "Card and transfer transactions, March 2026, Saved". I assume I chose Add data from somewhere, because the dialog title says "Add data from transfers-2026-04.csv".

Left side: Format "CSV, comma, header row". Each row is "An edge". Ends from_account to to_account. Direction "Directed, as the project is" -- plain text, not a picker. Good, I do not want to be asked that again. Columns: from_account Text, source; to_account Text, target; amount Currency (USD), "weight: unknown"; timestamp "Date and time, UTC", "time role".

"weight: unknown". I read that twice. Last week I apparently made amount the weight and it still says unknown? Unknown what -- unknown whether it is a weight, or unknown what a larger amount means? The column header says Role, so I read it as "the role is unknown", which contradicts what I would have done last week. That is the kind of label that makes me go and check. Later, in Version history, the recipe says "weight: amount" and Louvain says "weighted by amount (larger is stronger)", so something did know. On this screen, the word is wrong for a returning user.

Right side, the thing I actually came for. An issue, yellow glyph: "Same columns as transfers-2026-03.csv, the data already loaded. Add data keeps March and puts April on top of it: 17,483 transfers, and the 39 accounts closed since March stay in. To see April alone, replace March with it: 3,093 accounts, 8,370 transfers." And a button "Replace data instead", already focused.

That is a genuinely good catch. Every tool I have used would have happily unioned the two months and I would have found out from a doubled count. It is exactly the "tell me before, not after" I want.

Now I check the numbers, because that is what I do. Accounts in the file: matched 2,961, new 132, not in April 39. 2,961 plus 132 is 3,093, the April count it quotes. 3,000 minus 2,961 is 39. After the merge: nodes 3,132 (3,000 plus 132), edges 17,483 (9,113 plus 8,370). "Adds 132 nodes and 8,370 edges to 3,000 and 9,113." Everything reconciles. That is the first screen in a while where I did not find a mismatch in the first minute.

But: "the 39 accounts closed since March". Closed? The file does not say closed. The file says those 39 accounts made or received no transfer in April. An account with no activity in a month is dormant, or the extract filtered it, or the id changed in the source system. Calling it "closed" is the tool inventing a fact that is not in my data -- the same thing that made me stop trusting Gephi's RDF import. The metric right under it says "not in April 39", which is the honest wording. Use that one everywhere. If I put "39 accounts closed" in front of my manager and one of them is still open, that is my name on it.

Also missing: a sample of April's rows. The Open dialog for March showed the first five rows with each column's kind under the name; this one shows none. For a file I did not produce myself I want to see five rows before I commit, even if the columns match by name. Matching by name is not matching by meaning -- someone upstream could have swapped the currency.

And the question it does not answer: if the same transfer appears in both files (a late-posted March transfer in the April extract), what happens? It says what Add does and what Replace does, but not whether repeated transfers are detected. For Replace it does not matter. I decide Replace is what I mean.

I click "Replace data instead". The design says the same dialog turns into Replace data. The prototype does not show that state, so I am assuming its title and button change. I would also want Replace to tell me, here, what happens to last week's results: are my communities kept, re-run, or thrown away? Nothing in the dialog says. That is the question I would have in my head with my finger on the button.

**After replacing: Version history.** I end up (the prototype jumps me) on "Payments network review", "View only" chip beside Full graph, and a Version history panel on the right. I did not ask for View only; the panel title explains it once I notice it is a history mode. Fine.

Top entry: "April data, current, Today 09:14". "Replace data from transfers-2026-04.csv, 2026-05-04 09:14." Accounts 3,093; transfers 8,370; found by id 2,961 of 3,000; new in April 132; not in April 39; rows dropped 0.

Same numbers as the dialog, and here it says "not in April", not "closed". So the two screens disagree on the word. Keep this one.

"rows dropped 0" -- I appreciate a zero that is stated when it is the thing I would ask about.

Missing, though: the March entry, when I open it, has "components 1". The April entry has no components row. Did the 132 new accounts form their own islands? I cannot tell from here, and "is it still one component" is the first structural question I ask of a new snapshot. Put the same rows in both entries, or I have to go and compute the missing one.

Results: "Degree and Louvain communities replayed: 65 communities, was 35. 26 keep their March name and color by overlap; 39 are new, numbered 36 to 74. Modularity vs randomized baseline waited for Re-run and re-ran at 09:21."

So "do what I did last week" happened by itself. The recipe entry lower down ("Community overview, recipe, Apr 2") says what last week was: two style layers, two runs, Louvain communities and Degree, binding weight amount, matched by id 3,000 of 3,000. That is provenance. I could put that in a ticket. "Copy methods text" gives me one sentence per run with the seed, resolution, weight direction, element version and "on the CPU". I have not seen a graph viewer write a methods paragraph before. That is the best thing on the screen.

Now the numbers. 35 communities became 65, with the same resolution and the same seed, and modularity went from 0.688 to 0.742, on a graph that changed by 132 accounts out of 3,000. That is not a small change and it is the headline for my manager. 26 plus 39 is 65, good. But 35 minus 26 is 9: nine March communities are gone, and nothing lists them. Did they split? Merge into others? "Keep their name by overlap" -- what overlap, what threshold? Jaccard over members? If I am asked "where did community 12 go", I have no answer on this screen.

Is 35 to 65 a real change in the data, or Louvain being Louvain? Louvain is not stable across small perturbations. The PageRank comparison, later, says "PageRank gives the same result every run, so a re-run cannot tell change from noise" and offers a randomized baseline. For Louvain, which is exactly the algorithm where that matters, nothing like that is offered for the month-to-month change. The modularity baseline tests whether the partition beats random graphs, which is a different question from "did the structure change".

The legend: "Names and colors kept from March data by overlap; 39 new communities numbered 36 to 74". Community 1 359, 2 168, 3 127, 5 126, 4 111, 7 74, 6 58, Other 58 communities 2,070. I add them: 1,023 plus 2,070 is 3,093. Good. The order is by size, so 5 comes before 4, which is fine once I see the names are carried over, not ranks.

Colour. Community 1 is a yellow-orange and Community 5 is a red-orange, and on the canvas, at dot size, I cannot tell which is which. Community 3 green against Community 5 orange I can separate by lightness, just. There are no labels on the canvas for communities, so colour is the only channel. I would not show this to anyone who asks "which cluster is the fraud ring" -- I would be guessing.

Degree size "1 to 842" in April, "1 to 907" in March. One account with over 900 transfers in a 9,113-transfer month -- roughly a tenth of all activity through one id. In my world that is the first thing I check for a bad entity-resolution merge: an aggregate or suspense account, or several customers collapsed into one id. Nothing on screen points me to it. I would have to find it myself. Not a defect of the screen as such, but a tool that says "what changed" should say "the biggest account is still the biggest account, and it is enormous".

The Watchlist: "fixed", "7 of 9" in April, "9" in March. So two accounts I was watching are not in April. I like that it is stated without me asking. I would want to click it and see which two.

**Results: something is out of date.** The prototype sends me to the results panel and -- this is a protein network, 300 proteins. I have lost the thread again. Reading it for what it would mean on my data: "Needs action 2", Louvain and a shortest path, each "Out of date, Re-run", and a "Review out of date" popover: "Louvain used confidence as a distance. Your answer is now higher = stronger link. Re-run to update." "Betweenness and Closeness ran unweighted, so they stay current." And "Re-run all".

That is a clear pattern: it names what changed, which results are affected and which are not, and why. For my weekly refresh I assume "Modularity vs randomized baseline waited for Re-run" in the history means I would have seen a row like this for it. Good, but I had to infer that from a different dataset.

**Show my manager what changed: the comparison.** "PageRank, March and April." A: PageRank on March data, "Earlier data, on: March, 3,000 accounts, Unweighted, directed." B: PageRank on April data. Agreement: "The rankings agree at the top: all 10 of the top 10 are the same. Spearman 0.876 over the 2,961 accounts in both months." In both top 10, 10 of 10; top 20, 19 of 20; top 50, 49; top 100, 76. Tied lowest in March 947, 32 percent; in April 1,027, 35 percent.

Good: it names Spearman instead of saying "similarity". Good: it says which accounts the correlation is over (the 2,961 in both), not all 3,093. Good: ties are counted and drawn as a band instead of pretending a third of the accounts have distinct ranks. The scatter is log-log rank against rank, with "same rank on both" as a diagonal. I can read it.

"Not matched: only in March, closed, 39; only in April, opened, 132." Closed and opened again. Same objection, and here it is worse, because this is the screen I would screenshot for my manager and the word "closed" would go straight into a slide. "Only in March" and "only in April" are exact; the added words are an interpretation the data does not support.

Selected account ACC-488401, "#1,575= in March, #88 in April", moved 1,487 places. That is the kind of row a manager asks about. Good.

But: last week I ran Louvain and Degree, not PageRank -- the recipe entry says so. The change my manager needs to hear about is "35 communities became 65". "Compare with..." offers PageRank on March data, Betweenness, Degree. Where is "Louvain communities on March data"? I cannot compare two partitions here, as far as the screen shows. So the one comparison I need is not offered, and the one offered is for a measure I did not run last week.

Saving it: "Save comparison", then a toast "Comparison saved, Undo", and it appears in the project list as "PageRank and betweenness, on April data". Fine.

Handing it over: "Export files..." at the top, "Export table as CSV..." under the scatter, "Export log" and "Copy methods text" in the history. For my manager I want one picture: before and after, the counts, the moved accounts, as SVG. I do not see "export this comparison as an image" or a report. I would end up taking a screenshot of the scatter and pasting the methods text under it. That is my diagrams.net workflow again, with better numbers.

**Wrap-up, in my words.** The refresh itself is the best I have seen: it caught the stacking mistake before I made it, every count reconciles, the history keeps the import, the recipe and the methods in one place, and the out-of-date pattern says which results a change touches. The "show what changed" half is weaker: the headline change is in a paragraph of text, not in a comparison; the comparison I can make is not the one I need; and two screens put the word "closed" on accounts that only had no transfers.

## Single Ease Question

**4 of 7.** Bringing the file in and re-running was easy, a 6. Getting to something I could put in front of my manager was a 3: I could not compare the communities between months, I could not export the comparison as a picture, and I would have had to edit out "closed" before anyone saw it.

## Would I use this instead of my current tool?

Not instead of it. My data is RDF and this reads CSV, so I would be flattening a SPARQL result every week and explaining the loss. But for a monthly snapshot of a property graph -- which is what this was -- the Version history with its import report and methods sentences is better than what I have, which is a notebook, a spreadsheet and my memory of what I ran. I would use it for the refresh and the audit trail. I would not use it for the manager's slide until it can compare two community partitions and export the comparison as an SVG, and I would not trust it with a stakeholder until it stops calling an account with no transfers "closed".

## Problems found

1. **"Closed" and "opened" are invented facts.** Load step issue text ("the 39 accounts closed since March") and comparison "Not matched" ("only in March, closed", "only in April, opened"). The data says only that an account had no transfer in the month. Version history says "not in April", which is right. Severity 3.
2. **No way to compare the communities between months.** Last week's runs were Louvain and Degree; the change is 35 to 65 communities, but "Compare with..." offers only PageRank, Betweenness and Degree. Nine March communities vanish unlisted, and the overlap rule that carries names is not named. Severity 3.
3. **No export of the comparison as a picture or report.** Only "Export table as CSV...", "Export files...", "Export log" and "Copy methods text"; nothing says "this comparison, as SVG". Severity 3.
4. **"weight: unknown" on a returning load.** In the Add data dialog the amount column's role reads "weight: unknown", while the recipe and Louvain say amount is the weight, larger is stronger. Reads as though last week's choice was lost. Severity 2.
5. **Replace data does not say what happens to last week's results.** The issue row offers "Replace data instead" but not whether the runs will be kept, replayed or dropped; that is only learned afterwards in Version history. Severity 2.
6. **April's import entry lacks the components row March's has.** Cannot tell whether the 132 new accounts are connected. Severity 2.
7. **No sample of April's rows in Add data.** The Open dialog shows five rows with their kinds; Add data shows none, so a column that kept its name but changed its meaning goes unnoticed. Severity 2.
8. **Community colours rely on hue alone.** Community 1 (yellow-orange) and Community 5 (red-orange) cannot be told apart at dot size; no labels on the canvas. Severity 2.
9. **Prototype jumps datasets.** The out-of-date state is on a protein network, not on the transfers project, so the step between replacing data and comparing had to be inferred. Severity 1 (a prototype limitation, not a product one).
