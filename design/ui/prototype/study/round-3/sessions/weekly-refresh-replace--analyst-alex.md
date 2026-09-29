# Weekly refresh: replace the data and export the table -- Analyst Alex

**Participant:** Analyst Alex, a data analyst at a logistics company who computes network metrics
in Python and draws them in Gephi, and redoes the Gephi half by hand every time the data refreshes.

**Task as given:** "This week's export arrived. Bring it in so last week's findings carry over, and
export the updated table."

**Screens used:** the weekly return (start screen, project reopened, main menu, file picker, load
step, replay report, re-run), version history, and the bottom dock table (its CSV export).
The mocks use a monthly March-to-April refresh of a 3,000-account transfer network; Alex reads
"March" as last week and "April" as this week.

**Renders the participant saw** (in `shots/`): `weekly-return/reopened.png`,
`r3-alex-refresh-menu.png`, `r3-alex-refresh-picker.png`, `weekly-return/load.png`,
`weekly-return/replay.png`, `weekly-return/rerun.png`, `r3-alex-refresh-vh-full.png`,
`r3-alex-refresh-export.png`, `r3-alex-refresh-td-collapsed.png`, `r3-alex-refresh-td-large.png`,
`r3-alex-refresh-td-out.png`.

**Outcome:** success with difficulty. The data came in cleanly and carried over. Exporting the
table took two tries: the big Export button is a figure dialog, and the weekly screens show no
table anywhere.

**Single Ease Question:** 4 of 7.

---

## Transcript

### 1. The project, as I left it

> OK. So this is last week's project. Payments network review. Transfers, 3,000 -- right, that's
> what SQL said last week. Watchlist, nine. Degree sizes, community colours. The legend's still
> there. Good, it kept my colours, that's already better than Gephi Lite.
>
> Now, "bring it in". My reflex in Gephi is File, Open, and then I lose everything and redo the
> afternoon. So I'm not clicking Open. Where's the File menu? There's no menu bar. There's a
> hamburger at the top left. I guess that's it.

### 2. The main menu

> Hamburger... Quick actions, File, Edit, View, Selection, Recipes, Help. OK, File. New project,
> Open, Recent projects -- and then "Replace data... New files under this analysis; March kept as a
> version. 1 slow result will wait for Re-run." And under it "Add data... More rows on top of the
> data loaded now."
>
> Huh. OK, actually that's the exact question I had. I don't want more rows on top, I want this
> week instead of last week. Replace data. The little description saved me, I'd have clicked Add
> data because it says "add" and I'm adding this week's file.
>
> Wait -- the project up here is called "Case 0314, mule ring" now, and the avatar is an S. Last
> screen it was "Payments network review" with an A. Is this the same project? ... The numbers
> are the same, 3,000 and 9,113. I'll assume it's the same thing and move on.
>
> "1 slow result will wait." Which one? It doesn't say. Fine.

### 3. The file picker

> Two files already picked, accounts and transfers, today 08:40. 3,093 rows and 8,370 rows. Right
> next to last week's. "The files are read on this computer; nothing is sent." Good. That's the
> line I look for. Open.

### 4. The load step

> "Replace data with transfers-2026-04.csv". Only the transfers file in the title? I picked two.
> Where's the accounts file? ... The column chips have id, kind, country, riskScore -- those are
> account columns -- and amount, timestamp, which are transfer columns. So I think it read both.
> It should just say both file names.
>
> Counts. This file 3,093 accounts, last time 3,000. Found by id 2,961, new 132, 39 not in this
> file. 2,961 plus 132 is 3,093, yes. 3,000 minus 39 is 2,961, yes. Transfers 8,370. Rows dropped
> zero. I'd check those against my SQL, and if they match I'm happy. This table is honestly the
> best part so far. Gephi never tells me what it's about to do.
>
> "What replays: Degree; Louvain communities -- seconds. Modularity vs randomized baseline -- a
> few minutes: waits for Re-run. 3 style layers, the layout, 1 set, 1 note -- carried over." OK. So
> it's going to redo my stuff. That's the thing I actually want. Load.

### 5. The replay report

> Results panel opened. "1 out of date." Degree current, Louvain current. "Replayed; 65
> communities, was 35."
>
> Whoa. 65? It was 35 last week. 132 new accounts and it almost doubles the communities? That's
> the first thing my manager asks about. The report on the right says "26 communities keep their
> March name and color by overlap; 39 are new." OK -- so Community 1 is still Community 1. That's
> good, that's the thing Gephi never does. But why 39 new ones? Are they tiny? Are they the 132
> new accounts? It doesn't tell me how big the new ones are. I'd have to go dig.
>
> The legend now has Community 5 above Community 4. Because 5 got bigger? I guess the list is by
> size. Kind of makes me think something got renumbered, but the note under it says "names and
> colors matched to March", so fine.
>
> Watchlist: 7 of 9, two accounts not in this data. Good, it didn't just silently drop them.
>
> Statistics on the side: 3,093 accounts, 8,370 transfers... "components 27, weakly". Last week
> it said 1. Twenty-seven? Nothing mentions that. The replay report doesn't say it, the load step
> didn't say it. That's the kind of number I'd put in the deck without noticing and get asked
> about. I'd want it flagged next to the old number, like the accounts are.

### 6. The out-of-date one

> Modularity vs randomized baseline -- out of date, Re-run. Do I need it for the table? I don't
> know if it's even in the table. I'll re-run it to be safe. "Running; a few minutes" with a
> progress bar and Cancel. OK. That I can live with, as long as it doesn't block me. It doesn't
> seem to -- I can still click things.

### 7. Version history (curiosity)

> The clock icon on Data version. Version history: "April data, current, today 09:14" and "March
> data, Apr 3". So last week is still there. I can view it. Good -- if my director asks "what was
> it last week" I can show him. It named the version "April data" by itself. For me it'd be
> "Week 39". Can I rename it? The dots menu, maybe. Not going to find out now.

### 8. Export the updated table -- first try

> Now the table. Where's the table? I don't see a table on this screen at all. Nothing at the
> bottom. OK, big blue button top right: "Export...". Click.
>
> ... That's a figure. Current view checked, 2x, PNG. Methods text checked. Then "Tables: Nodes,
> 157 rows; Edges, 213 rows", both unchecked. 157? I have 3,093 accounts. Oh -- this is a filtered
> view in this screen. In my case I'd expect it to say 3,093.
>
> So to get the table I uncheck the figure, uncheck methods text, tick Nodes, Export. That's four
> clicks after opening the dialog, every week. And I don't see which columns I get, whether it
> has the community name, or whether that modularity thing is in it. I'd click it anyway and open
> the CSV in Excel to check.

### 9. Export the updated table -- second try, from the table

> Somebody showed me there's a table view. There's a strip at the bottom in this other screen --
> "Table 77 nodes, 254 edges, View > Table". So it lives in the View menu. On my weekly screens that
> strip wasn't there at all, so I'd never have found it on my own; I'd have gone through the
> figure dialog.
>
> The table itself: id, kind, country, community, degree, rank, PageRank with the damping in the
> header. That's nice, the method is in the column header. Out-of-date columns say "Out of date,
> Re-run" in the header -- good, so I won't export a stale number without seeing it.
>
> "Export table as CSV..." top right of the table. Dialog: Rows "All 300: Nodes, full graph",
> Order, Columns "10, hidden ones included", a preview of the first lines, file name. The header
> has "community (Louvain, weighted, seed 7...". Seed in the column name. OK, that I can paste
> into a slide footnote. File name, Export. That's the one I want. That's what the blue button
> should have given me.
>
> One thing: the file name it suggests is the dataset name. Every week I'd get the same name. I'd
> want the week, or the version name, in it.

---

## After the task

**Single Ease Question: 4.** Bringing the data in was a 6 -- the load step with the counts is
exactly what I'd want and the colours stayed. Getting the table out was a 2: the button that says
Export makes a picture, the table isn't on screen, and I only found the real CSV export because
someone pointed me at View, Table.

**Would I use this instead of what I do now?** "For the refresh part, yes, honestly. Replace data,
check the counts, it replays degree and Louvain and keeps my community names -- that's the whole
Gephi half I redo every week, and it told me which two watchlist accounts vanished. But I'd still
check the numbers against NetworkX the first few weeks, and I'd want it to tell me when components
jump from 1 to 27 and why I suddenly have 65 communities. And put the table export where Export
is. If I have to go looking for the CSV every Monday I'll just keep exporting from Python."

## Problems observed

1. **The Export button does not lead to the table (severity 3).** "Export..." opens a figure dialog
   with the figure and methods ticked and the tables unticked; the table export is four more clicks
   there, or a separate button inside a table the weekly screens never show.
2. **No table is visible after the refresh (severity 3).** The weekly screens have no table strip;
   the table is reached only through View, Table, which Alex never opened on his own.
3. **Components jumped from 1 to 27 with no comment (severity 3).** The load step and the replay
   report compare accounts and transfers with last week but not components.
4. **65 communities, was 35, with no size for the new ones (severity 2).** The report says 39 are
   new but not how many accounts they hold, so Alex cannot tell whether it matters.
5. **The load step names only the transfers file (severity 2).** Two files were picked; the title
   and counts do not say which file each count came from.
6. **"1 slow result will wait" does not name the result (severity 1).** Named later, in the load
   step.
7. **Project name and avatar differ between screens (severity 1).** "Payments network review" / A
   versus "Case 0314, mule ring" / S made Alex wonder if it was the same project.
8. **The CSV file name does not change between refreshes (severity 1).** Alex wants the version
   name in it.
