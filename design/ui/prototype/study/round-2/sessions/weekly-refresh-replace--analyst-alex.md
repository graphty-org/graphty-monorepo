# Session: the new export arrives, bring it in and export the updated table -- Analyst Alex

Participant: Alex, operations data analyst at a logistics company. Computes in NetworkX, draws in
Gephi, and redoes the Gephi half by hand every time the data refreshes. Company Windows laptop,
Chrome, no admin rights.

Task as given by the moderator: "This week's export arrived. Bring it in so last week's findings
carry over, and export the updated table."

Screens: the weekly return screens (start screen, the project reopened, the main menu's File group,
the file picker, the load step, the replay report, Re-run, the Export dialog), Version history, and
the table dock (the large 3,000-account table, a table that is not current, the CSV export).

Note for the reader: the mock project is a payments case (accounts and transfers) rather than
Alex's supplier network, and the new files are named for April rather than a week. Alex played it as
"the same shape as my stuff" and did not dwell on it.

## Getting back into last week's project

**Start screen, Recent projects.** "OK, it opens on recent stuff. 'Case 0314, mule ring, Transfers,
3,000 accounts, edited Apr 3.' That's the one from last time. Thumbnail looks like the hairball I
left, so -- yeah, that's it. Click it."

**Project reopened.** "Right, first thing, counts. accounts 3,000, transfers 9,113. That's what I had
last time, I've got it in my notes. Same colours, the Community legend in the same order, Watchlist,
9. OK. And -- oh, nice -- 'Last import: March data, accounts-2026-03.csv, transfers-2026-03.csv,
Apr 3.' So it tells me which files this is built from. Gephi never told me that; I used to put the
date in the project file name."

"Now, the new export. My first instinct is to drag the two CSVs onto the canvas. Nothing on screen
says I can, though. So I'll look for a menu. There's no File menu along the top -- it's a web app, so
-- the three lines, top left. That's the menu."

**Main menu, File.** "File. New project, Open, Recent... 'Replace data... New files under this
analysis; March kept as a version. 1 slow result will wait for Re-run.' And under it 'Add data...
More rows on top of the data loaded now.' OK, this is the question I would have got wrong. In Gephi
I'd have hit Import and it asks 'append or new workspace' and I always have to think. Here the line
under each one actually says what happens. Replace. That's me."

"'1 slow result will wait' -- which one? It doesn't say. I'll find out, I guess."

Clicks so far: menu, File, Replace data. Three. "Fine."

**File picker.** "Both April files, select both at once. And at the bottom: 'The files are read on
this computer; nothing is sent.' Good. That's the line I need to be able to repeat to IT. Open."

## The load step

**Replace data: April files.** "OK, so it doesn't just go. It shows me first. Good."

"Files: 'accounts, 5 of 5 columns matched', 'transfers, 4 of 4.' Every column has the name it had in
March, so no mapping step. Great, because I name them the same every time on purpose."

"Counts, against March. This is the bit I actually care about. accounts 3,093 -- let me check my SQL
output -- yes, 3,093. transfers 8,370 -- yes. rows dropped 0. OK. found by id 2,961, new 132, that's
3,093. Not in April 39, and 3,000 minus 39 is 2,961. It adds up. I did that in my head without being
asked, which is the point -- the numbers are there to check."

"'26 accounts have no transfers in April. All 26 were in March. Each will be a component of its
own.' Huh. OK, that's a warning I'd want. Last time I'd have found that out when the components
count went weird in a meeting. 'Show rows' -- I'd click that later, probably, to see who they are."

"What replays: 'Degree; Louvain with its 5 seeded re-runs -- seconds.' Good, it's re-running the
communities with the same seeds, that's the thing I always worry about. 'Modularity vs randomized
baseline -- a few minutes: waits.' Right, that's the 'is 0.4 actually good' check I added so I'd
have something to tell my director. So that's the slow one from the menu. It waits. Fine, I'd rather
it asked. '2 style layers, the layout, 1 set, 1 note -- carried over.' That's my colours, my layout,
my Watchlist. That's the whole Gephi half, just -- carried over. OK."

"Load."

## What came back

**After Load.** "Results on the left has a little badge. '1 out of date, Review.' And there's a
Replay report over on the right in Version history."

"Replay report. Accounts found 2,961 of 3,000, new 132, not in April 39 with a List link, no
transfers 26 with Select. 'Components: 1 to 27.' OK, 27 because of the 26 loners, it told me that
already."

"Results: 'Louvain ... 65 communities, was 35.' Wait. It nearly doubled? ... 'Of them 39 are new,
26 of them single accounts.' Hmm. So 26 of the new ones are just the loners. So really 13 new real
groups. I had to do that subtraction myself. If I put '65 communities, was 35' on a slide my
director asks 'what happened in April' and the honest answer is 'mostly nothing, 26 accounts went
quiet'. I'd want it to just say that."

"'26 communities keep their March name and colour by overlap.' OK, so Community 1 this week is the
same group as Community 1 last week. That's -- actually that's the thing I assumed Gephi did and it
didn't. Overlap by how much, though? If Community 3 lost half its accounts is it still Community 3?
It doesn't say."

"Legend. Community 1 359, 2 168, 3 127, then 5 126, then 4 111. So 5 jumped over 4. I read that as
community 5 got bigger than 4 -- which I guess is true, it's sorted by size. OK. That's a finding,
actually. But it's weird to see 5 before 4, I did a double take."

"Watchlist: 7 of 9 in April, ACC-705989 and ACC-243731 not in this data. Good. It kept them in the
set and marked them, it didn't just quietly drop them. That's the thing I was scared of."

"Degree size: 'domain refit to April, 0 to 842, was 1 to 907.' Fine, 0 because of the 26."

**Re-run.** "The modularity thing. Re-run. There's a bar at the bottom, 'Running Modularity vs
randomized baseline', with Cancel. And the row says 'Running; a few minutes'. OK, so it's not hung,
it's telling me. I'd go get a coffee. After -- counts: accounts 3,093, transfers 8,370, components
27, isolated 26, Last import April data, today 09:14. Right."

**Version history (a quick look).** "Two entries, April data current, March data Apr 3. So I can go
back. Good. Methods, one sentence per run: 'Louvain ... seed 11 ... 65 communities, weighted
modularity 0.742.' I would literally paste that into my appendix."

"Two things bug me here. The legend over here says 'Degree size degree, 1 to 842' -- the replay
report and the main legend said 0 to 842. Which is it? It's 0, there are 26 accounts with no
transfers. Somebody's number is wrong, and that's exactly the kind of thing that ends up in a
report wrong. And the project name up top says 'Payments network review', not 'Case 0314'. Did I
open a different project? ... Probably not, but it made me look twice."

## Exporting the updated table

"OK, now, the table. That's actually what my manager wants. The spreadsheet."

"Where's the table? I'm on the graph. There's no table visible. The bottom toolbar -- pointer, a
kind of route icon, a sticky note, a lightning bolt, a square. None of those say 'table'. No
labels. I'd hover each one. The lightning bolt maybe is 'run'? I don't know. There's no View menu
entry I can see from here either."

"Big blue button top right: 'Export files...'. That's the obvious one. Click."

**Export dialog.** "Figures -- Current view, 2x, PNG, checked. Methods text, one text file beside the
figure, checked. Tables: 'Nodes, N rows', 'Edges, N rows', both unticked. OK, so the table is here.
I'd untick the figure, tick Nodes. But -- what format? It doesn't say CSV. It doesn't say which
columns. Is degree in it? The communities? The modularity? If it's a CSV I'm happy; if it's some
JSON thing I'm annoyed. There's no preview for the table the way there is for the picture."

"Then separately, in the table screens, when the table IS open at the bottom there's 'Export table
as CSV...' and that one's great: Rows 'All 300, nodes, full graph', Order 'pagerank, highest first',
Columns '9, hidden ones included', a preview of the first lines and a file name. That's the one I
want. It says CSV, it says how many rows, it shows me the headers. 'degree (full graph)', 'degree
rank (of 300, full graph)' -- long headers, but at least it says what the number was computed on.
I'd rename them in Excel, I always do."

"So now there are two ways to export a table and they look different. Which one's the real one? If
the Export files one gives me something different from Export table as CSV I'll be the one
explaining it."

"And I still don't know how I got the table open. In the big 3,000-account example it's just there
at the bottom already. I'd guess -- maybe clicking the 'accounts 3,093' number in Statistics? The
other screen says counts open as rows. I would not have guessed that on my own. I'd probably have
used Export files and hoped."

"In the table: rank columns with '#293=' -- the equals means a tie? I think. And there's a little
pink 'blocked' tag under the rank columns. Blocked from what? Is my rank broken? That reads like an
error."

"One more thing. The whole point of 'findings carry over' for me is the diff. In the table I want a
column that says this account is new in April, or dropped, or is on my Watchlist. The replay report
knows all of that -- 132 new, 39 gone -- but I can't see a column for it in the export. So in Excel
I'd end up VLOOKUPing against last week's file. Which is what I do now."

## After the task

**Single Ease Question (1-7):** 5.

"Bringing the new data in was easy. Honestly easier than it's ever been -- menu, Replace, pick two
files, check the counts, Load. The counts table before loading is the best thing here; it matched my
SQL and it told me about the 26 loners before they surprised me. What took longest was the table:
finding it, and then working out which of the two exports is the real one and whether it's CSV."

**Would you use this instead of what you use now?**

"For the monthly redo, yes, probably. That's the part of my week I hate -- redoing the Gephi colours
and layout by hand -- and here it just carried over, kept the same community names, kept my
Watchlist and told me what it couldn't do. I'd still check betweenness in Python the first couple
of times until the numbers match. And I'd need IT to sign off, but 'read on this computer, nothing
is sent' is the right line in the right place. What would stop me: if the exported table is not a
plain CSV with the same columns every week, or if I get two different numbers for the same thing,
like that 0 to 842 versus 1 to 842. That's how I get embarrassed in a meeting."
