# Session: this week's export -- supply chain risk analyst

Participant: Dana Okafor (composite persona), supply chain risk analyst at an industrial
equipment maker. Weekly, voluntary user at best; lives in Excel and Power BI.

Task as given by the moderator: "This week's export arrived. Do what you did last week, and show
your manager what changed."

Screens, in the order she met them: the load step (opening a file, and adding a second file to an
open project), the Results panel (results that went stale after the data changed), the comparison
surface (one result on two data versions), and version history.

Note for readers: every mock uses a payments-transfer network (accounts, transfers) or a protein
network, not supplier data. The moderator told her at the start to "read accounts as suppliers
and transfers as purchase orders". How much that substitution costs is part of what this session
found, and it is reported as a finding, not hidden.

## Transcript (think-aloud)

**1. The opening screen.**

"OK, 'Open a graph'. Graph -- so, a chart? No, this is the network thing. There's a Recent list:
'Card and transfer transactions, February, Mar 2'. So pretend that's my supplier file from last
week. Good, it remembers it. That's the first thing I check. If I had to redo the column setup
every Monday I'd be out."

"I'd click that recent one to get last week back. Then I need to put this week's file in. I'm
looking for 'Import' or 'Update'... there isn't one on this page. There's 'Open...'. If I click
Open with the new file, does it make a brand new project and lose last week? I don't know. I'd
probably just drag the CSV onto the window and see what happens."

Moderator shows the dialog the app gives when a file is dropped on an open project.

**2. Adding this week's file (the dialog titled "Add data from transfers-2026-04.csv").**

"Title says 'Add data'. Hmm. I don't want to add, I want to swap last week for this week. Let me
read -- oh, there's a yellow warning. 'Same columns as transfers-2026-03.csv, the data already
loaded.' OK, it noticed. 'Add data keeps March and puts April on top of it: 17,483 transfers, and
the 39 accounts closed since March stay in. To see April alone, replace March with it.' And a
button, 'Replace data instead'."

"That's actually good. That is exactly the mistake I would have made. In Power BI I've appended
a quarter on top of a quarter before and doubled spend for a week before anyone noticed. It
caught it and it told me in numbers."

"Left side: columns, it kept my settings. from_account is source, to_account is target, amount is
currency, timestamp is time. I didn't have to map anything. Good. What's 'weight: unknown' next to
amount? Unknown what? It's spend. I'd ignore it -- it doesn't look like it's stopping me."

"Right side: matched 2,961, new 132, not in April 39. THAT is the thing my manager asks.
Which suppliers dropped off, which are new. Fifty percent of my Monday is that pivot. I want to
click that 39 and see the names. Can I? It just looks like a number. It doesn't look clickable."

"'After the merge: nodes 3,132, edges 17,483.' But I'm not merging, I'm replacing. Does this panel
change when I click Replace data instead? I'd assume so."

She clicks "Replace data instead". (The page says the dialog becomes Replace data, with nothing
read again.)

"Fine. Now the big blue button should say Replace. I'd check that before I hit it. OK."

**3. After the swap: the Results panel with "Needs action 2".**

Moderator shows the stale-results state. (The mock is the protein network; she was told to read
it as her project.)

"Needs action, 2, with yellow exclamation marks. 'Louvain -- Out of date -- Re-run.' 'Shortest
path TP53 to SMAD3 -- Out of date.' I don't know what Louvain is. Last week I -- well, in this
story I ran something that coloured the groups. I'd guess that's it."

"There's a box: 'confidence is now read as a similarity; these read it as a distance.' I have no
idea what that sentence means. That's a scientist sentence. I skip it. What I read is the button:
'Re-run all'. Yes. That's what I want, redo everything I did last week on the new data. Do it."

"Why do I have to press it at all? Last week's steps should just run on this week's file. I'd
like it to ask once -- 'redo last week's analysis on this file?' -- and go. But at least it's one
button and not me clicking through each one."

"And 'Betweenness and Closeness read no weight, so they stay current.' ...'Betweenness' I know --
that's the chokepoint one from the webinar. Good, it's current. I'll believe that."

**4. Showing the manager what changed: the comparison.**

"Now, 'show my manager what changed'. Where would I go? I'd look for 'Compare' or 'What changed'.
In the left list I see results -- Degree, Louvain, PageRank. Nothing says 'compare to last week'."

Moderator: "What would you do?"

"I'd right-click the result? Or look for a menu on it. ... Fine -- in the Results panel page
there's a 'Compare with...' under Appearance. That's buried under colours and labels. I'd never
look there. Appearance is how it looks, not what changed."

She is shown the "Two data versions" comparison, PageRank on March against April.

"OK. Left: 'A on March data, B on April data'. Clear. Right side: 'Kendall tau-b 0.781'. No.
'Spearman, ties inflate this, 0.876'. No. I don't know what those are and my VP definitely
doesn't. If I put 'tau-b 0.781' on a slide, somebody asks me what it is and I'm dead."

"'Top 5 in both: 5 of 5.' That one I get: the top five didn't change. That's a real sentence
for the Thursday meeting."

"'Not matched: only in March, closed 39. Only in April, opened 132.' Good, same numbers as the
import screen, so it's consistent. I'd want those as a list."

"'Differences -- Moved / March only / April only.' OK, now we're talking. 'Top 100 in either
month, by places moved.' ACC-488401, number 1,575 to number 88. So something jumped way up. For
me that would be a supplier that suddenly matters a lot more. That IS the story for my manager --
'these three suppliers moved up, here's why'. But why did it move? It doesn't say. It's a rank of
PageRank. I don't know what PageRank means for a supplier. Spend? Number of parts? If I can't
explain the number I can't use it. I'd need it to rank on something I understand, like spend or
number of single-source parts."

"Then there's this scatter plot at the bottom. Dots, a diagonal, grey bands. My manager would
look at that for two seconds and ask me to just give her the list. I'd skip it."

"'Export table as CSV...' at the bottom. Yes. That I would click. That's how this gets to Power
BI -- I'd load it there. Does the CSV have both months and the moved number in it? The note says
'every account with both values and both ranks'. OK, then I can make the 'what changed' table in
Excel. Honestly, that is what I'd do: export and build the slide in Power BI."

"'Clicking April only' tab -- ACC-772350, 'absent' in March, #217 in April. OK, new supplier and
it's already number 217. That's useful. 'Create set' -- I don't know what a set is. 'Add note' I
get."

**5. Version history.**

"Now, where's last week? There's a Version history panel. 'April data, current, Today 09:14'.
'Opened 22 times.' 'Community overview, recipe, Apr 2'. 'March data, Apr 2'. OK, it keeps both.
That answers 'can I go back if this week's file is garbage' -- yes, 'Restore version'. Good. That
matters: half the time the ERP export is broken and I need last week's picture back."

"Expanded April: accounts 3,093, transfers 8,370, found by id 2,961 of 3,000, new in April 132,
not in April 39, rows dropped 0. That's a nice little audit block. 'Rows dropped 0' -- I like
that, I always worry the import silently ate rows."

"Then 'RESULTS: Degree and Louvain communities replayed: 65 communities, was 35.' 65 groups from
35 in one week? Is that real or is that the tool? If my supplier groups double in a week,
something is wrong with the data, not the world. It doesn't say which one. I'd not show that to
my manager until I knew."

"'METHODS, ONE SENTENCE PER RUN: Degree on Transfers, April data... directed; in plus out,
unweighted; 1 to 842. graphty-element 2.0.0, on the CPU.' That is a paragraph for a journal. I'd
never read it. And the labels here are tiny and grey, 'ACCOUNTS AND TRANSFERS', 'RESULTS' -- on my
laptop at 110% I'd be squinting."

"'Export log' -- what's a log? For IT maybe. 'Export files...' the blue one -- that's the picture,
I assume. For the manager I'd want one image and one table. Two export buttons with no hint which
gives me what."

**6. Wrap-up.**

"So did I do what I did last week and show what changed? Mostly. The swap was better than I
expected -- it stopped me doubling the data and it told me 39 gone, 132 new. Re-run all is one
click. The comparison has the thing I need, the 'moved / new / gone' list, but it's wrapped in
statistics I can't say out loud, and I had to be shown where it starts."

## After the task

**Single Ease Question: 4 of 7.** "The file part was a 6. Finding the compare was a 2 -- I would
not have found it. The comparison itself, once I was in it, a 4: the list is good, the numbers on
top are for someone else."

**Would she use it instead of her current tool?** "Not instead. Beside, maybe. The import check
and the 'who dropped off, who's new' numbers are better than what I do in Excel today, and I'd
use it for that every Monday if IT approves it -- and I still need to hear where our supplier list
goes when I drop it in; I saw 'Assistant off, nothing is sent' down the side, which is a start,
but that's the assistant, not the file. But the ranking it compares on is PageRank, and I can't
explain PageRank to my VP. If it compared spend, or 'how many parts depend on this supplier', week
over week, and let me export that to Power BI, I'd use it. And none of this was supplier data --
I had to pretend accounts were suppliers the whole time, so I can't tell you it works on mine."

## Problems observed

1. **No visible way to bring in "this week's file" on an open project.** The start screen offers
   Recent and Open...; nothing says Update, Replace or Add data. She would have dragged the file
   in by guess. Severity 3.
2. **The dialog opens as "Add data" when her intent is "replace".** The warning and "Replace data
   instead" rescued her, and she praised it, but the default verb is the wrong one for the weekly
   case and the "After the merge" counts describe what she did not want. Severity 2.
3. **The matched / new / not-in-April counts are not clickable.** She wanted the names of the 39
   and the 132 there and then. Severity 2.
4. **"weight: unknown" next to her spend column is unexplained.** Ignored, but it planted doubt.
   Severity 1.
5. **Stale-result explanation is in scientist language** ("read as a similarity; these read it as
   a distance"). She skipped it and trusted the button. Severity 2.
6. **Re-running last week's work needs a manual press;** she expected "redo last week" to be
   offered as one question after the swap. Severity 2.
7. **"Compare with..." sits under Appearance.** She would never look for "what changed" under how
   things look; she could not find the comparison unaided. Severity 4 (task-blocking without the
   moderator).
8. **The comparison's headline numbers are Kendall tau-b and Spearman.** Unusable in front of a
   VP; only "top 5 in both" and the moved / only-in lists made sense to her. Severity 3.
9. **The measure being compared (PageRank) has no business meaning for her,** so "moved from
   #1,575 to #88" has no explanation she can give. She wants to compare spend or dependent-part
   counts. Severity 3.
10. **"65 communities, was 35" in version history is reported without saying whether it is real
    change or noise,** and she would not show it. Severity 2.
11. **Small grey uppercase labels and the methods paragraph in version history** are hard to read
    at 110% zoom on a laptop and not read at all. Severity 2.
12. **Two export buttons (Export log, Export files...) and Export table as CSV...** with no hint
    of which gives "one image and one table for the slide". Severity 2.
13. **No supplier data anywhere in the mocks.** She had to translate accounts to suppliers
    throughout, so her positive reactions are weaker evidence than they look. Severity 2 (for the
    study, not the product).

## What she liked

- The same-columns warning that stopped her stacking two weeks, with both outcomes in counts.
- Last week's column setup kept; no re-mapping.
- "Rows dropped 0" and the matched / new / gone counts, repeated consistently across the import,
  the comparison and version history.
- "Re-run all" as one button.
- The Moved / March only / April only lists, and Export table as CSV for Power BI.
- Restore version, so a broken export does not cost her last week's picture.
