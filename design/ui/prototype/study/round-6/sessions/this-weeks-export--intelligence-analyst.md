# Session: this week's export -- the criminal intelligence analyst

**Participant:** Marcus (fictional composite), criminal intelligence analyst at a state fusion center; i2 Analyst's Notebook, Excel pivots, Penlink; ten years Army all-source before that. Measures everything against i2 and Excel, and asks where the data goes before he loads anything.
**Task as given by the moderator:** "Redo last week's export on this week's data, and show what changed."
**Screens used, in the order he met them:** the Data place (first load; the source row's menu from the file chip; Update with new data; a month on, scrolled to Sent and saved), the version list with April's What changed open, March opened read-only, the load step's Add data dialog, the comparison (first the two-measures view, then the two-months view), the Export dialog on its Table choice. All at 1440 x 900, study view, design notes hidden. The mocks are static: where he says "I click", he means what the page says the control would do.
**Renders:** `shots/r6-marcus-twe-dp-s1.png`, `shots/r6-marcus-twe-dp-s8.png`, `shots/r6-marcus-twe-dp-s4.png`, `shots/tasks/this-weeks-export/01-version-history.png`, `shots/r6-marcus-twe-vh-s2.png`, `shots/tasks/this-weeks-export/02-load-step-add-data.png`, `shots/r6-marcus-twe-dp-s6.png`, `shots/r6-marcus-twe-dp-s7.png`, `shots/tasks/this-weeks-export/03-comparison.png`, `shots/r6-marcus-twe-cmp-versions.png`, `shots/tasks/this-weeks-export/04-export-dialog-table.png`.
**Data on screen:** "Payments network review", a transfer network. March: 3,000 accounts, 9,113 transfers (transfers-2026-03.csv, loaded Apr 2). April: 3,093 accounts, 8,370 transfers (transfers-2026-04.csv, loaded May 4). A watchlist of 9 accounts. The Export dialog render is from a different case ("Mule ring, case ACC-233575") and still on March data.

He played along with the setup: it is money, not tolls, but "last month's return, this month's return, same chart for the sergeant, tell him what moved" is his Monday.

## Transcript (thinking aloud)

**Before touching anything.** "OK. Last week I made a chart and a list off this case. New return came in. What I do today in i2: open last week's chart, import the new sheet on top with the same import spec, pray it merges the entities instead of doubling them, re-lay it, re-export, and then do the 'what changed' by hand in Excel -- VLOOKUP the old list against the new one, who's new, who dropped out. That second half is an hour. If this thing does that half, I'm listening."

**The Data place, first look (dp-s1).** "Left rail: Graph, Data, Results, Notes. Data is lit. Fine, that's where a file would be. Under the project name there's a little chip that says transfers-2026-03.csv. So that's the file this chart is built on. I like that it's right there at the top -- on the stand the first question is 'what data is this chart made from', and I can point at it."

"Sources: transfers-2026-03.csv, 9,113 rows, one edge each, 'repeat pairs are not merged'. Good, it says so. Then the columns, what each one is -- from_account 'where each transfer starts', to_account 'where each transfer ends'. Plain English, thank you. amount: 'Weight: amount, not used yet. A run that can use it asks what a larger amount means.' OK, I'll take that on faith."

"And there it is: **Update with new data...** Button, right under the file. That's the word I'd look for. I wasn't looking for 'Import' this time, I was looking for 'the new one', and 'Update' is close enough. I'd click it."

**The file chip (dp-s8).** "What if I click the chip up top instead? It lights up the file row and throws a menu: Update with new data, Change how it was loaded, Show file, and a greyed Remove table. Same thing from the other door. Fine. Two ways to the same button doesn't bother me as long as it's the same button."

**Update with new data (dp-s4).** "'New files, in place of March's': transfers-2026-04.csv, 8,370 transfers, March had 9,113. accounts-2026-04.csv, 3,093 accounts, March had 3,000. It found both files. Good -- I'd have forgotten the accounts sheet."

"'All 7 columns match March's, so everything built on them carries over.' That's the sentence I want from an import spec. In i2 I find out it didn't match when half my links come in as a new entity type."

"Accounts: found by id 2,961 of 3,000, new in April 132, not in April 39." Checks it on his fingers. "2,961 plus 132 is 3,093. 3,000 minus 2,961 is 39. Adds up. And it says 'not in April', not 'closed' or 'gone'. Right. An account that went quiet isn't a dead account, and I don't want a tool telling my sergeant it is."

"'Sets keep members that are not in April, marked.' Marked how? I've got a watchlist. If two of my guys drop out of this month's return I want them still on the list with a flag, not quietly deleted. Sounds like that's what it does. I'd want to see the mark before I'd swear to it."

"What stays: 'Replaces accounts and transfers. Keeps styles, sets, notes and runs; the runs replay on April's data. March stays in Versions.' Good. The old month is kept. That's my discovery copy." Pause. "It says styles, sets, notes and runs. It does not say my export. Last week's export is the whole reason I'm here. Does 'runs replay' mean my chart and my list come out again on April? Or do I have to go make them again? Nothing here says."

"Down at the bottom, 'Add as another graph'. No. Replace." He clicks Replace.

**After the replace: the version list with What changed (01-version-history).** "File chip now says transfers-2026-04.csv. Good, it moved. Versions: April data, current, May 4. March data under it, Apr 2."

"'What changed, against March data (Apr 2)'. Now we're talking. This is my Excel hour."

"'27 components (was 1)', yellow 'large change'. 26 accounts have no transfers in this version. Select." "OK, so 26 accounts are on the accounts sheet but didn't move money this month. They're floating on their own. That's why it's 27 pieces instead of one. Fine -- at least it tells me why, instead of just waving a yellow flag."

"'65 communities (was 35)', large change. '26 are single accounts with no transfers in this version.'" Frowns. "So of the 30 extra groups, 26 are just those same loners, each one a 'group' of one. That's not a large change, that's the same 26 guys counted twice. If I read these two yellow flags to the sergeant he'll think the whole network blew apart. It didn't. I'd want the flag to know the difference."

"'3,093 accounts (was 3,000). 2,961 in both, 132 new, 39 not in April. List.' Same numbers as the dialog. Good -- two screens, same count. That matters to me more than you'd think. 'Side panel said 212, I counted forty' -- that's how I stop trusting a tool."

"'8,370 transfers (was 9,113). 7,576 in both, 794 new, 1,537 not in April.'" Checks. "7,576 plus 794 is 8,370. 7,576 plus 1,537 is 9,113. OK."

"**'Watchlist: 7 of 9. ACC-705989 and ACC-243731 not in April.'** That's the line. That's the first thing the case agent asks: are my guys still active. It named them. I'd put that line in the brief word for word." Beat. "Why didn't they show up? Phone dropped, account closed, moved banks -- the tool can't know, and it doesn't pretend to. Good."

"'Rows dropped at import: 0.' Good, say it every time."

"Two buttons: Show replay report, Compare with. And under March, 'Export the operation log...'" "Replay report -- I guess that's what got re-run. I'd click it to see if my export was re-run. Can't tell from here."

**The legend.** "Community color, Louvain community. 'Names and colors kept from March data by overlap; 39 new communities numbered 36 to 74.' OK -- so Community 1 in April is the same crew as Community 1 in March, roughly. That's important. If the colors shuffled every month I couldn't compare two printouts side by side."

Reads the bottom. "'19 carried on from March's 8 to 35, 39 new.' So 7 on the list, plus 19, is 26 carried. Plus 39 new, 65. March had 35. 35 minus 26 is 9. **Where did 9 of March's groups go?** Broke up? Merged into another one? That's the question I'd actually be asked -- 'did the Eastside crew fold into the Main Street crew?' -- and it's not on this screen. The new groups are counted; the ones that vanished aren't."

**Peeking at March (vh-s2).** He clicks the March row to be sure it is still there. "View only, right at the top by the filter chip, and the file chip flips back to the March file. 'Past version' up on the right, Restore version, Done. Good, it's read-only; I can't wreck last month's chart by accident. Methods, one sentence per run, with the date and the version of the software. 'Louvain communities ... 35 communities ... seed 11.' Copy methods text. That goes in the report appendix. I don't know what a seed is but I know I can hand that paragraph to a defense expert and they'll know." Clicks Done.

**The Add data dialog (02-load-step-add-data).** The moderator shows him the other way in: dropping the April file on the project instead of using Update. "'Add data from transfers-2026-04.csv'. Issue: 'Same columns as transfers-2026-03.csv, the data already loaded. Add data keeps March and puts April on top of it: 17,483 transfers...' and a button, Replace data instead, already highlighted."

"Good catch. That's the exact mistake I'd make in i2 -- import the new month on top of the old one and wonder why everybody's call count doubled. It stopped me. I'd click Replace data instead, and I'd end up where I just was."

"Role column says amount: 'none'. But down at the bottom, 'Weight: amount, used as similarity'. Which one? One says none, one says used. I'd stop and squint at that. Probably fine, but it's the kind of thing a defense attorney reads out loud."

**Now the export. Where is last week's export? (dp-s6, dp-s7).** "Right. The chart and the list I made last week. The Data panel has an Export... button at the top. But I don't want to build it again from zero -- I want 'same as last time'. i2 doesn't have that either; I'd just remember what I clicked."

Scrolls the Data panel. "Versions. Applied recipes: Community overview, fraud-team-colors. Then **Sent and saved from this project**. 'Sent: nothing. The Assistant is off and no data source is connected. Where your data goes.' OK, I read that one carefully, every time. Nothing left the building. Good."

"'Who hosts graphty, and where: Not decided yet.'" Stops. "Not decided yet? That's the only question IT is going to ask me. If that says 'not decided', this doesn't go on a case. I'll come back to that."

"'Saved to this computer': april-communities.svg, 'Figure and methods text, May 4'. accounts-by-pagerank.csv, 'Table of accounts and methods text, May 4'. Mule ring triage, recipe, Apr 20. Payments network review, project file, Apr 2."

"Wait. april-communities.svg, May 4. **Did I already do this?** May 4 is when April loaded. So either the April export is already done, or this list is showing me something I didn't do. Where's last week's -- the March chart? The only thing from before May is the project file and a recipe. If last week's export was the March figure and table, it's not on this list. Either it never got saved here or it got replaced by the April one. I'd stop here and ask whoever set the task."

"Each row has a little circular-arrows icon on the right. No label. Circular arrows to me means refresh -- reload the list, or re-read the file off the disk. I would not guess that it means 'make this export again'. I'd hover it." (The page says hovering reads 'Export again with these settings...'.) "Oh. OK. That's exactly the button I wanted, and I'd never have clicked it on purpose. Put the words on it. 'Export again' as text, not a refresh icon."

"And even then -- 'again with these settings' on which data? The April data, because that's current? Or the data it was made from? Tell me before I click."

**The Export dialog it opens (04-export-dialog-table).** "Scope: 'Filtered: 14 nodes, 1 step: in Mule ring suspects'. Table (.csv), Nodes tab, 14 of 3,000 rows, filtered. Order riskScore. Columns 6. Methods always written beside it. Preview of the first lines, and beside it the methods file."

Reads the methods file, because he reads anything he'll have to repeat. "'Rows: 14 of 3,000 accounts... Data: transfers-2026-03.csv, 3,000 accounts, 9,113 transfers.' **That's March.** This is the old file. 'riskScore: from accounts-2026-03.csv.' Also March. 'Weight: amount, not used yet.' But the April screens said amount is used as similarity."

"So if this is what 'export again' gives me, I've just re-exported last week's data with last week's numbers and a fresh date on it. If I hand that to the ADA as 'this week', I'm the one explaining it on the stand. The dialog has to say, at the top, in words: 'Same settings as your export of May 4. Data: April (transfers-2026-04.csv), not March.' And if a watchlist guy dropped out, 'Mule ring suspects: 12 of 14 in April, 2 marked'. It doesn't say any of that. Right now I can't tell which month I'm about to write."

The moderator notes this render is from another case. "Doesn't matter to me. It's the export dialog. Whatever case it's on, it needs to tell me which month's file is behind it, up top, not in paragraph four of the methods file."

"The good part: '2 files go to your Downloads folder. Nothing is uploaded.' And the methods file rides along every time. That's better than i2, where I write the sourcing note by hand on a slide."

**Show what changed: the comparison.** "Now the second half. The sergeant wants a page: who's new, who dropped, who moved up. From the April row I click Compare with..."

*First view it lands on (03-comparison).* "PageRank and betweenness. 'Rank on PageRank against rank on betweenness', a scatter plot, '0 of the top 50 in both', 'Spearman 0.40'." Long pause. "This isn't March against April. This is two scores on the same data. I didn't ask for this. And PageRank -- that's the Google thing? Betweenness I know, that's the middleman. Spearman I don't know. I'd have closed this and gone back to the Excel VLOOKUP."

*The two-months view (cmp-versions)*, when the moderator points him to it. "OK, 'PageRank, March and April'. Better. Right column: **Not matched: in March only, not in April 39. New in April 132.** Same numbers as before, good, and I'd click those to get the lists. Differences: Moved, March only, April only. That's my three Excel tabs. Moved: ACC-488401, March #1,575=, April #88, moved up 1,487."

"'#1,575=' -- what's the equals sign? A tie? Say 'tied'. And a guy jumping from fifteen-hundred to 88 in a month -- that's the one I'd pull records on. That list is useful. Create set, Add note right on the row. Good."

"'49 of the top 50 in both months. The rankings mostly agree at the top.' Fine, one sentence I can say out loud. The Spearman line and 'Compare with randomized baseline' -- skip. Not for me."

"But it's PageRank. My question is who's the **middleman** now, and that's betweenness. Can I switch it to betweenness, March against April? There's a 'Compare with...' button. Maybe. It doesn't say what it'd let me change. I'd try it and probably end up back in the two-scores view."

"And to hand it over: 'Export table...' over the table, and Save comparison up top. Save comparison -- save it where? Into the project, I guess. For the sergeant I want one page: the What changed lines from the version list, the watchlist line, and the top movers. Those are on three different screens. The What changed box has no export of its own -- there's 'Show replay report' and 'Export the operation log', and I don't know that either of those is the one-pager. I'd end up screenshotting the What changed box into PowerPoint, which is what I do now with i2."

**Where he stopped.** "I got the April data in clean, I trust the counts, and I got the new and dropped lists. I got the watchlist answer in one line, which is the best thing on any of these screens. The export I'm not sure I redid on the right month, and the 'what changed' is spread over two places with no one thing to hand over. Call it half done, with a question mark on the export."

## Single Ease Question

**4 out of 7.**

"Bringing in the new month: that was a 6. Update with new data where the file is, the counts add up on two screens, the watchlist line, nothing leaves the building. Redoing the export: a 2 or 3 -- a refresh icon I'd never have clicked, a list that shows April files already dated May 4 and no sign of last week's, and a dialog whose methods say March. Showing what changed: the version list does most of it, but the vanished groups aren't counted, the two yellow flags are the same 26 loners twice, the comparison opened on the wrong question first, and there's no one page to hand the sergeant. Average it out, 4."

## Would he use this instead of his current tool?

"For the monthly refresh -- load the new return, tell me who's new, who dropped, whether my watchlist is still active -- yes, over the Excel VLOOKUP, today, if IT signs off. That part beats what I do. Not instead of i2; next to it. The chart the jury sees is still an i2 chart, with icons, and this thing can't open an .anb.

"But two things stop it cold. One: 'Who hosts graphty, and where: Not decided yet.' That's the only question IT asks, and until it has an answer I can't put a real case in it, no matter how good the What changed box is. Two: the export. If I can't tell at a glance which month's file an export was written from, I can't use it for anything that goes in a case file. Put 'April data, transfers-2026-04.csv' at the top of the dialog, put 'Export again' in words on the button, and I'd use it every month."

## What the moderator noted

- The Update with new data dialog was read in full and trusted: every count reconciled, "not in April" rather than "closed" was noticed and approved, and "March stays in Versions" answered the discovery-copy worry. It did not say what happens to earlier exports, which was his next question.
- The Watchlist line in What changed ("7 of 9", two named accounts not in April) was his single strongest positive reaction in the session.
- The two large-change flags both rest on the same 26 accounts with no transfers; he read that as the tool overstating the change and would not repeat it to a supervisor.
- The legend counts new groups (39) but not the groups that disappeared (26 of March's 35 are carried on, so 9 are unaccounted for on screen); he asked where they went.
- The refresh-arrows icon on each saved file is the only route to "export again", and it has no visible label; he read it as reload and would not have clicked it.
- The Sent and saved list showed April exports already dated May 4 and no March export, which made him doubt whether the task was already done or last week's files were lost.
- The Export dialog's methods file names transfers-2026-03.csv and March's counts; nothing at the top of the dialog says which data version the export is written from. He called this the reason he could not finish.
- The comparison opened first on two measures over one month, not on two months; he did not understand the view and would have left. The two-months view answered his question, but on PageRank, and he could not see how to switch it to betweenness.
- "#1,575=" was not understood as a tie.
- There is no single thing to hand over for "what changed": the What changed lines, the watchlist line and the moved list live in two places, and only the table exports.
- "Who hosts graphty, and where: Not decided yet" was read, aloud, as a blocker for any real case.
