# Session: redo last week's export on this week's data, and show what changed -- Sarah, fraud analyst

Participant: Sarah, level-2 financial crime investigator (composite persona, study/personas/fraud-analyst.md).
Mode: mandated. Her manager has told the team to use graphty for the payments-network review, so she keeps going when something is unclear and lists her workarounds instead of quitting.
Task as given: "Redo last week's export on this week's data, and show what changed."
Screens used, in order: data-panel (file chip, then Update with new data), load-step (the add-data variant, to check she was not on the wrong path), version-history (What changed, then March open), data-panel (Sent and saved), export-dialog (table and evidence file), comparison (two data versions).

Outcome: done with difficulty. She loaded the new file and read what changed without help. The re-export itself is a single unlabeled icon whose result is not drawn, so she ended it on a guess. She could not get "what changed" out of the tool as one file for her reviewer.

Single Ease Question: 4 of 7.

---

## Think-aloud

**Opening the project (data panel, first state).**

"OK, Payments network review. Top left says transfers-2026-03.csv in a little pill. That's the file. Your mock is monthly -- March, April -- not weekly, so I'll pretend 'last week' is March and 'this week' is April. Same thing for me: last period, this period.

First thing I want is the new file in. I'm not going to the hamburger. The pill says the file name, so I click the file name."

**Clicking the file chip (data panel, state 8).**

"Right, it opened a menu on the file itself. 'Update with new data...' is first and highlighted. Good. That's the word I'd use. 'Change how it was loaded', 'Show file', 'Remove table' greyed out. Fine. I don't need to read the rest.

Last time I had to hunt for this. This time it's where I clicked. That's the one thing I'd tell the next person: click the file name."

**Update with new data (data panel, state 4).**

"It asks for the new files and then shows me this before it does anything:

- transfers-2026-04.csv, 8,370 transfers, March had 9,113
- accounts-2026-04.csv, 3,093 accounts, March had 3,000
- All 7 columns match March's
- Accounts found by id 2,961 of 3,000, new in April 132, not in April 39
- Sets keep members that are not in April, marked.

That's the reconciliation I'd do in Excel with a VLOOKUP on the account id before I trust anything. 2,961 plus 39 is 3,000, 2,961 plus 132 is 3,093. It adds up. Good, I can check it.

'Sets keep members that are not in April, marked.' I have a set of fourteen suspects. If one of my mules closed the account in April, I want to know that, not have it quietly drop out. So 'marked' is right. I don't know what 'marked' looks like yet.

'What stays: replaces accounts and transfers. Keeps styles, sets, notes and runs; the runs replay on April's data. March stays in Versions.' OK. March isn't destroyed. That matters -- my reviewer may ask what the March picture looked like, and I filed off March.

Blue button is Replace. 'Add as another graph' in the corner -- no, I don't want two charts. Replace."

**Checking she was not on the wrong path (load-step, add-data).**

"The moderator showed me this other one too -- 'Add data from transfers-2026-04.csv', and it says after the merge 3,132 nodes, 17,483 edges. No. That's March and April stacked on top of each other. If I'd done that, every total would be doubled and I wouldn't notice until the reviewer did. I didn't end up here, because I clicked the file name, but somebody on my team will drag the file onto the window and get this. It does say 'Adds 132 nodes and 8,370 edges to 3,000 and 9,113', which is honest, but 'nodes' and 'edges' -- say accounts and transfers, like the other screen does."

**What changed (version-history, state 1).**

"After Replace, the Data panel has Versions: April data current, March data. Under April there's 'What changed, against March data':

- 27 components (was 1), large change. 26 accounts have no transfers in this version. Select.
- 65 communities (was 35), large change. 26 are single accounts with no transfers in this version.
- 3,093 accounts (was 3,000). 2,961 in both, 132 new, 39 not in April. List.
- 8,370 transfers (was 9,113). 7,576 in both, 794 new, 1,537 not in April.
- Watchlist: 7 of 9. ACC-705989 and ACC-243731 not in April.
- Rows dropped at import: 0.

The watchlist line is the one I care about. Two of my nine watched accounts are gone this month. Name them, which it does. That's the first thing I'd write in the case note: 'two accounts ceased activity'. Good.

'Components' -- I don't use that word, but it explains itself: 26 accounts with no transfers. Fine.

Now I read numbers, so here's what bothers me:

1. 26 accounts with no transfers, and separately 39 accounts not in April. Are the 26 in the 39? They can't be -- the 39 aren't in April at all, the 26 are in April with no transfers. So 26 accounts are in April's account file but moved no money. That's plausible -- dormant accounts. But it took me a minute, and I'd want it said: '26 accounts are in the April account file but have no April transfers.'
2. '7,576 transfers in both.' A transfer is dated. A March transfer isn't in April's data unless the export is a rolling window. If our extract is a rolling 90 days, fine, then 'in both' means the same row appears in both files. If it's calendar months, then 7,576 'in both' means your tool is matching transfers that aren't the same transfer -- same from, same to, same amount, different day. Which is it? I can't tell from this, and it's the kind of number an examiner asks me to trace. Show me how a transfer counts as 'the same'.
3. 1,537 transfers 'not in April'. Same question.

'Select' and 'List' -- good, I can get the actual accounts. 'Show replay report' -- I'd click it once to see if anything failed to re-run. 'Compare with...' -- later."

**Looking at March read-only (version-history, state 2).**

"Clicked March data. It shows it read-only, 'View only' next to the filter, and on the right 'Restore version', counts, and 'Methods, one sentence per run'. 3,000 accounts, 9,113 transfers, 1 component, 0 rows dropped. 'Copy methods text' -- that I'd use, it goes straight into the narrative's methodology paragraph.

Louvain, modularity, randomized baseline -- that's the data-science colleague's stuff. I skip it.

Done, back to April."

**Finding last week's export (data panel, state 7).**

"Now the actual task: redo the export. Where is it? There's an Export... button in the Data header, but I don't want to set it up again from nothing, I want the one I did last time.

Scrolling down the Data panel: 'Sent and saved from this project'. 'Sent: nothing. The Assistant is off and no data source is connected.' Good, that's the answer to 'did anything leave the building', and I'd screenshot that for our IT person.

'Saved to this computer':
- april-communities.svg -- Figure and methods text, May 4
- accounts-by-pagerank.csv -- Table of accounts and methods text, May 4
- Mule ring triage -- Recipe
- Payments network review -- Project file, with its data, Apr 2

So that's my history of what I exported. Good, I don't have to dig in Downloads. accounts-by-pagerank.csv is the one I'd send weekly -- it's the account list, whatever 'pagerank' means to the data-science team.

Each row has a little circular-arrows icon on the right. That's the refresh icon. On every other system I use, circular arrows means reload -- reload the file from disk, or refresh the view. I'd be nervous clicking it on an export row: does it re-download the old file? Does it overwrite what I sent last time?

Hover: 'Export again with these settings...'. OK. So that is the button. It should say that, not make me hover. At 125 percent zoom on a docked laptop I'm not hovering over every icon to find out.

Clicked it. [The mock does not draw what opens.] I have to assume it opens the Export dialog with last time's choices already ticked, on today's data. If so, fine. But I want to know three things before I press anything:

1. Is it this month's data or last month's? The file is named 'april-communities'. If I export again now it had better not be called april-something with May's numbers in it.
2. Does it keep last week's file? That file went to my reviewer. It is evidence now. If the new one overwrites it in Downloads, I've lost what I sent.
3. My suspect set. Two of the fourteen may not be in the new data. Does the export still list them, marked, or drop them?"

**The Export dialog, table and evidence views (export-dialog).**

"Opened Export... from the header to see what I'd be agreeing to. Scope: 'Filtered: 14 nodes, 1 step: in Mule ring suspects'. Table (.csv), Nodes, 14 of 3,000 rows, order riskScore, columns 6, methods always written beside it. Preview of the first lines. Beside it the methods file: 'Data: transfers-2026-03.csv, 3,000 accounts, 9,113 transfers'.

That line is what makes me trust it. The file says which data it came from. If I re-export on April, that line should say transfers-2026-04.csv and I'd check it before I send. Good.

File name: case-acc-233575_nodes.csv. No date, no version in it. Next week's will have the exact same name. That's how two files get mixed up in a case folder. The evidence file has a date in its name -- case-acc-233575_evidence_2026-09-28.html -- so why doesn't the CSV?

'2 files go to your Downloads folder. Nothing is uploaded.' Good sentence. Keep it.

The findings report -- page 1 'Boundary', the 14 accounts with riskScore, degree, PageRank. That's close to what I'd staple to a SAR. But it's one version. There's no page for 'what changed since last time'."

**Show what changed -- to someone else (comparison, two data versions).**

"The second half of the task: show what changed. In the tool I can see it -- the What changed list is good. But 'show' means my reviewer sees it, and my reviewer doesn't have graphty and isn't getting it.

Options I found:

- 'Compare with...' under April's What changed. It opens this comparison: PageRank on March against PageRank on April, a scatter chart, 'Spearman 0.76', '49 of the top 50 are the same in both months', and a list of accounts that moved: ACC-488401 went from #1,575 to #88.

Honestly, the list on the right is useful. 'This account went from nowhere to #88 in one month' -- that's rapid growth in activity, that's a lead. But I'd describe it as 'received from far more accounts than last month', not 'PageRank rank'. The scatter and Spearman I'd never show a reviewer. They'd ask me what Spearman is and I'd have no answer.

'Export table as CSV...' is there under the chart, so I can get the moved-accounts list out. Good. 'Save comparison', 'Done'.

- 'Export the operation log...' in Versions. That's probably a technical log. Not what a reviewer reads.

What I actually want is one button on the What changed list: export this. A CSV with the 132 new accounts, the 39 gone, the two watchlist accounts that went quiet, the transfer counts, and the same methods line. That's the attachment. Right now I'd take a screenshot of the What changed block and paste it into Word, and then build the new/gone list in Excel from the two account files, which is what I do today anyway."

---

## Workarounds she said she would use

- Screenshot the What changed block into the case note, because it cannot be exported as a file.
- Rebuild the list of new and gone accounts in Excel with a lookup across the two monthly account files, for the reviewer.
- Rename every re-exported CSV by hand with the period in the name, because the export names it the same as last time.
- Copy last period's exports out of Downloads into the case folder before re-exporting, in case the new one overwrites them.
- Check the "Data:" line of the methods file after every re-export to confirm it says April and not March.

## What worked for her

- Clicking the file name opens a menu with "Update with new data..." first.
- The update dialog shows old and new counts and new/gone accounts before anything changes, and the numbers add up.
- "March stays in Versions" and the read-only March view with "Copy methods text".
- The watchlist line in What changed, naming the two accounts that are gone.
- "Sent: nothing" and the list of files saved from this project.
- The methods file names the data file it came from.
- "Community colors kept from March by overlap", so the chart does not repaint every period.

## Problems, in her words

1. "The circular arrows mean reload everywhere else. Say 'Export again' on the row. I'm not hovering over every icon." (data panel, Sent and saved)
2. "I clicked it and I don't know what it did. Is it this month's data? Does it keep last week's file? It's evidence now." (data panel, Export again -- the result is not drawn)
3. "There's no way to hand my reviewer 'what changed'. I have to screenshot it." (version history, What changed has no export)
4. "Same file name every week. That's how files get mixed up in a case folder." (export dialog, table file name has no date or data period, though the evidence file has one)
5. "'7,576 transfers in both' -- a transfer is dated. What makes two transfers the same? An examiner will ask me." (version history, What changed)
6. "26 accounts with no transfers and 39 not in April -- which is which? Say it in one sentence." (version history, What changed)
7. "If I'd dragged the file onto the window I'd have doubled every total, and it would have said 'nodes' and 'edges' while doing it." (load step, add data with the same columns)
8. "Compare shows PageRank and Spearman. The moved-accounts list is good; the rest I can't show anybody." (comparison, two data versions)
9. "What does a suspect look like when it's 'marked' as not in April? Does it still go in my export?" (update dialog says sets keep members that are not in April, marked; the marking and its effect on export are not shown)

## Single Ease Question

4 of 7. "Getting the new month in was easy -- that part's a 6. The export part is a guess, and showing what changed to anyone who isn't looking at my screen is a screenshot. Same as last time, basically: it tells me more, but I still finish in Excel."

## Would she use this instead of her current tool?

"No, not for this. The monthly diff is two account files and a lookup in Excel; I can do it in ten minutes and my reviewer can open it. What I'd keep from this is the reconciliation before Replace and the watchlist line -- 'two of your nine watched accounts went quiet' is something Excel doesn't tell me unless I build it. If the What changed list exported as a CSV with the methods line, and the re-export put the month in the file name and left last time's file alone, I'd use it for the periodic review on the big cases. Until then it's the picture, and Excel is the record."
