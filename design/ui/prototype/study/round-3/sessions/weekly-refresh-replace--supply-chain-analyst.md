# Weekly refresh: bring in this week's export and export the updated table

Participant: Dana Okafor, supply chain risk analyst (simulated; persona in
../../personas/supply-chain-analyst.md).

Task as given by the moderator: "This week's export arrived. Bring it in so last week's
findings carry over, and export the updated table."

Screens used, in order: the weekly return (reopened project, File menu, file picker, load
step, replay report, re-run), version history, the bottom table and its CSV export, and the
Export dialog from the header button. The mocks carry a fraud case (accounts and transfers,
March and April) rather than suppliers and parts; the moderator asked Dana to read "accounts"
as her suppliers and "March / April" as last week and this week.

Renders the participant saw (study view, design notes hidden), in shots/:
r3-dana-refresh-reopened.png, -menu.png, -picker.png, -load.png, -replay.png, -rerun.png,
-vh.png, -export.png, -td-collapsed.png, -td-ranked.png, -td-out.png.

## Transcript (think-aloud)

**1. The project reopened.**

"OK, so this is last week's project. Same picture, same colours. Before I do anything: where it
says 'Last import: March data, accounts-2026-03.csv, transfers-2026-03.csv, Apr 3' -- good, that
tells me what I'm looking at is the old file. That's the first thing I'd check in Power BI too,
the refresh date.

I'm looking for 'Import'. I don't see an Import button. There's a big blue 'Export files...' at
the top right, but that's the other direction. The 'Last import' line -- can I click that? It
doesn't look like a link. Hmm. Left side has Graphs with a plus. I'd be afraid the plus makes a
second graph. I'll try the three lines, top left, that's usually where File lives."

**2. File menu.**

"File. New project, Open, Recent... 'Replace data...' -- 'New files under this analysis; March
kept as a version. 1 slow result will wait for Re-run.' And 'Add data...' -- 'More rows on top
of the data loaded now.'

Honestly my first instinct was Add data, because that's what import means to me. But I don't
want more rows on top, I'd get last week's suppliers twice. Replace is the scary word -- replace
normally means I lose things. The grey line underneath saves it: 'March kept as a version.' OK.
I read that and I believe it about 70 percent. '1 slow result will wait for Re-run' -- no idea
what that means, and I'm not going to worry about it yet. Replace data."

**3. File picker.**

"It's showing me the folder with both weeks, and it's already picked the two new ones, with row
counts next to them. 3,093 rows, 8,370 rows. I like the row counts, that's the first thing I'd
check in Excel -- did the export come out whole. And at the bottom: 'The files are read on this
computer; nothing is sent.' That's the sentence IT is going to ask me about. Whether IT believes
it is another matter, but I'd screenshot that for the security review. Open."

**4. The load step.**

"Now this is the screen I actually care about. 'Counts, against March' -- a table. April 3,093,
March 3,000. Found by id 2,961. New 132. Not in April 39. Rows dropped zero. That is exactly the
reconciliation I do by hand every Monday with XLOOKUP -- who's new, who dropped off, did anything
fall out on the way in. Zero rows dropped, good.

'found by id' -- by which id? Our supplier numbers. Fine, if the ERP number didn't change. If
purchasing re-keyed a supplier under a new number, it'd show up here as one new and one gone and
I'd never know it's the same company. That's my duplicate-supplier nightmare again. I'd want to
see the 132 new ones and the 39 gone side by side to catch that. I don't see a way to do that
here -- the 'Show rows' link is only on the warning.

'Every column has the name it had in March, so no binding step opens.' Great -- if it had made me
re-map columns every week, I'd be back in Excel.

The warning: '26 accounts have no transfers in April... Each will be a component of its own.' I
get the first half: 26 suppliers with no orders this week. 'Component of its own' -- I don't know
what that means. I'll ignore it.

'What replays' -- 'Degree; Louvain with its 5 seeded re-runs: seconds.' 'Modularity vs randomized
baseline: a few minutes: waits.' This is the algorithm stuff. I don't read that. The last line I
do read: '2 style layers, the layout, 1 set, 1 note: carried over.' So my flagged list and my
note come with me. That's the 'last week's findings carry over' part. Load."

**5. The replay report.**

"It's opened a panel on the right, 'Version history', April data today, March data Apr 3. That's
reassuring, it's like file versions in SharePoint.

'Replay report.' Accounts: the same numbers as before, plus 'not in April 39 List' and 'no
transfers in April 26 Select'. I'd click List on the 39 -- those are the ones I'd go ask
purchasing about.

'Sets and notes: Watchlist: 7 of 9 members in April; ACC-705989, ACC-243731 are not in this
data. 1 note carried over by id.' That line is the one I'd have paid for. My watchlist of
single-source suppliers came over and it told me which two dropped out, by name. In Excel I find
that out three weeks later when someone asks why the part is on hold.

Then there's a paragraph about communities keeping their March name and colour by overlap, 39
new, domain refit 0 to 842. Small grey text, a paragraph, I'm not reading it. On my laptop screen
I literally couldn't -- I'd need my glasses. There's a lot of grey writing in this panel.

Left side: '1 out of date', 'Modularity vs ran...' with a yellow warning and a 'Re-run' button.
I don't know what that is, but it's yellow, and yellow means someone will ask me about it. I'll
press Re-run so it goes away. 'Running; a few minutes.' Fine, I'll get coffee. And 'Done' on the
version history, top right."

**6. Checking it took.**

"Statistics now say 3,093 and 8,370, Last import: April data, today 09:14. Good, it's the new
file. I checked the numbers against the load screen, they match. 'Components 27, weakly',
'isolated 26' -- that's the 26 with no orders, I assume. Those words aren't mine but the 26 is."

**7. Version history (moderator showed the full panel).**

"April data current, and I can open March, which goes 'View only'. That's what I'd want: last
week's picture if the VP asks 'what did it look like before'. There's an 'Export log' -- not sure
what for; maybe the audit people. Then a block called 'Methods, one sentence per run' that's
basically a paragraph of statistics per line. Not for me. I'd collapse it if I could."

**8. Export the updated table.**

"Now the table. I don't see a table anywhere on this screen. It's all the picture. The obvious
button is 'Export files...' in blue, so I press that.

It opens 'Export' with a big picture preview on the left. Figures, 'Current view', 2x, PNG --
that's a screenshot, I don't want that first. Scroll down, 'Tables': 'Nodes, 157 rows', 'Edges,
213 rows'. [In the mock the view is filtered to 157; the moderator said it would read 3,093 on her
full graph.] OK, so 'Nodes' is my supplier list, 'Edges' is the orders, I think. The word 'nodes'
-- fine, the tool says it, I'll say it.

What I'm not sure about: does 'Nodes' give me the columns I had, plus the scores? Is it Excel
or CSV? It doesn't say a format next to tables. And the figure and methods boxes are ticked
already, so if I just press Export I get a picture and a text file I didn't ask for. I'd untick
both, tick Nodes, press Export and then open the file to see what I got. That's three extra
clicks and a guess.

Moderator then showed the table at the bottom of the canvas. "Oh -- there's a thin strip at the
bottom that says 'Table, 77 nodes, 254 edges'. I didn't notice it at all; I thought that was a
status bar. And in the weekly-return screens I don't think it was even there. Once it's open this
is much more my world: a proper table, columns, ranks, sortable, and 'Export table as CSV...' on
its own. The export dialog tells me 'Rows: All 300', 'Columns: 10, hidden ones included', a
preview of the CSV and a file name I can change. That I trust -- I can see what's in the file
before I save it. CSV loads into Power BI.

But two things. One: I found two different exports for the same table, one in the blue button
and one on the table, and they don't look alike. Which is the real one? Two: what I actually hand
the VP on Monday is 'what changed' -- the 132 new, the 39 gone, the 2 off my watchlist. I don't
see a column in the table that says 'new this week' or 'gone since last week'. The tool knows
it, it put it in the replay report. If it's not in the export, I'm back to XLOOKUP against last
week's file, which is the job I was hoping to stop doing."

## After the task

**Single Ease Question: 4 of 7.**

"Bringing the file in was easier than I expected once I found Replace data -- the counts screen
is genuinely good and the watchlist carrying over with names is the best thing I've seen. But I
had to dig through a menu to find where import lives, the word 'Replace' made me nervous, and
getting the table out took a wrong turn and a guess. The two halves are a 6 and a 3."

**Would she use it instead of her current tool?**

"Not instead. Beside. For the Monday refresh it could replace my XLOOKUP reconciliation, if the
exported table had a 'new / dropped since last week' column -- that's the bit I'd actually put on
a slide. And 'nothing is sent' is what I'd lead with to IT. But the VP looks at Power BI; this
is where I'd prepare the file, not where anyone reads it. If it can't flag the week's changes in
the CSV, I'll do the refresh here once, then go back to Excel because I still have to do the
comparison there anyway."

## Problems observed

1. No word "Import" anywhere on the reopened project; the refresh door is two levels down in
   the main menu (File > Replace data). Her first instinct was Add data. (Severity 2)
2. "Replace" reads as destructive; only the one-line subtitle "March kept as a version" kept her
   going. The same subtitle's "1 slow result will wait for Re-run" meant nothing to her.
   (Severity 2)
3. Match "by id" gives no way to spot a supplier re-keyed under a new number: new and gone are
   listed separately, never side by side. (Severity 2)
4. The replay report and version history are paragraphs of small grey text with algorithm terms
   (communities by overlap, domain refit, seeded re-runs, modularity); she skipped all of it and
   pressed Re-run on a result she did not understand because it was yellow. (Severity 2)
5. On the weekly-return screens the table is not visible and there is no visible way to open it;
   the collapsed "Table" strip, where it exists, read as a status bar. (Severity 3)
6. Two exports of the same table disagree: the header's Export files... lists Tables (Nodes,
   Edges) with no format and with the figure pre-ticked, while the table's own Export table as
   CSV... shows rows, columns and a preview. The table screens say the header export no longer
   offers tables; the weekly-return export still does. (Severity 3)
7. The exported table has no "new this week / dropped since last week" column, though the tool
   computed both; the week-over-week change is what she reports. (Severity 3)

## What she liked

- The load step's "Counts, against March" table: new, gone, rows dropped, in one place.
- "Watchlist: 7 of 9 members in April; ACC-705989, ACC-243731 are not in this data."
- No column re-mapping when the file has the same columns as last week.
- "The files are read on this computer; nothing is sent." in the picker.
- The CSV export dialog showing rows, columns, a preview and an editable file name.
