# Weekly refresh with Replace data -- supply chain analyst (Dana)

Participant: Dana Okafor (composite persona), supply chain risk analyst. Lives in Excel and
Power BI; weekly, voluntary use at best.

Task as given by the moderator: "This week's export arrived. Bring it in so last week's findings
carry over, and export the updated table."

Screens used, in order: the weekly return (start, reopened, File menu, file picker, Add data
warning, load step, replay report, Re-run, Export dialog), Version history, and the table dock
(ranked table, Export table as CSV). The mock data is a payments case (accounts and transfers,
March and April files); the moderator asked her to read "accounts" as suppliers and "transfers"
as supply links, and "April" as this week's export.

## Transcript (thinking aloud)

**Start screen.** "OK, Recent projects. Case 0314 is the one I was in, edited Apr 3. Good, it
remembered. I'm not setting this up again every Monday, so that already matters." Clicks the
first card.

**Project reopened.** "Same picture as last week, same colors, Watchlist with 9 in it -- that's
my list. Now, where's Import? ... There's no Import button anywhere. Top right there's a big blue
'Export files...' but nothing that says Import or Load." Scans the left panel: Graphs, Sets and
paths, Styles, Views. "Plus signs. The plus next to Graphs? That would add another graph, I think,
not update this one. I don't want two copies." Notices the right side: "'Last import: March data:
accounts-2026-03.csv, transfers-2026-03.csv. Apr 3.' That's the thing I want to change. It has a
little clock icon. I'd click that." (Moderator: that row opens Version history.)

**Version history (viewing mode).** "It lists March data and a report. Found by id, not in April,
rows dropped zero -- I like that it tells me rows dropped, the ERP always drops something. But
there's no 'load new version' here. It says Done. So this is looking at old versions, not bringing
a new one in." Clicks Done. "That was a detour. First place I looked for import was the last
import, and it's read-only."

**Hamburger menu.** "Three lines, top left. Fine, that's where File always is." Opens File. "New
project, Open, Recent... Replace data... and Add data. Hm." Reads the highlighted line: "'New files
under this analysis; March kept as a version. 1 slow result will wait for Re-run.' And Add data is
'More rows on top of the data loaded now'." Pauses. "My gut says Add data. It's this week's
export, I'm adding it. Replace sounds like it throws last week away, and the whole point is last
week's findings carry over. But the line under Replace says March is kept, so... I'll be honest,
I'd have clicked Add data first."

**Add data warning (the door she tried first).** "OK, it caught me. 'Same columns as the data
already loaded. Add data keeps March and puts April on top of it: 3,132 accounts and 17,483
transfers.' Right -- 17 thousand links would be double counting, that's every link twice. Good
that it stopped me, and good it did the arithmetic. 'Replace data instead' -- fine, that button
is the answer." Clicks Replace data instead. "Would've been nicer if the menu had just said
'Load this week's file' or 'Update with a new export'. Replace is a scary word for what it does."

**File picker.** "Two April files, today 08:40, row counts next to them. I select both, Open.
'The files are read on this computer; nothing is sent.' -- that's the line I'd screenshot for IT.
Whether IT believes it is another story."

**Load step.** Reads the table first, as she always does. "April against March: 3,093 against
3,000. Found by id 2,961, new 132, not in April 39. That's the reconciliation I do by hand with
XLOOKUP every week, and here it is before I commit. Rows dropped 0. Good." Reads the file row:
"'5 of 5 columns matched ... every column has the name it had in March, so no binding step
opens.' Good, no column mapping. If SAP renames a column I'll find out what happens then."
The issue: "'26 accounts have no transfers in April. All 26 were in March.' So 26 suppliers went
quiet -- that's actually a finding, not an issue. I'd want that list." Sees Show rows. Then 'What
replays': "'Degree; Louvain with its 5 seeded re-runs -- seconds.' I don't know what Louvain is.
'Modularity vs randomized baseline -- a few minutes: waits.' No idea. '2 style layers, the
layout, 1 set, 1 note -- carried over.' That's the line I care about: my set and my note come
with me. Load."

**Replay report.** "There's a yellow '1 out of date' with Review, and the Results panel opened.
The right side has a Replay report. Watchlist: 7 of 9 members in April; ACC-705989 and
ACC-243731 are not in this data. That's exactly what I need to see -- two of my watched suppliers
dropped out of the export. Either they're gone or the ERP lost them, and I need to chase which."
Scrolls. "'Community color: 26 communities keep their March name and color by overlap; 39 are
new.' I skip that. 'Modularity vs randomized baseline ... waits in Results.' Do I need to click
Re-run? Is my table wrong if I don't? It doesn't tell me whether that thing is in the table I'm
about to export. I'd leave it, honestly. Nobody asked me for modularity." (Moderator: if she
clicks Re-run it runs in the background with Cancel.) "Fine, I clicked it to make the yellow go
away. That's the only reason."

**Finding the table to export.** "Now the table. Where is the table? I've got the picture, the
panels, the legend. I don't see a Table button." Looks at the bottom toolbar: "an arrow, a
squiggle, a sticky note, lightning, a square. None of those says table." Tries the obvious one:
"Export files..., top right, big blue button."

**Export dialog.** "Figures, current view, PNG... Methods text... Tables: 'Nodes, 157 rows',
'Edges, 213 rows'. Wait, 157? I have 3,093 accounts." Rereads the header: "'Filtered: 157 of
3,093 nodes'. So whatever's on screen is filtered and the table would only be 157 rows. I didn't
set a filter this week, but somebody did -- or I did last week -- and it carried over. That's the
kind of thing that gets me in trouble on Thursday: I send the VP 157 rows and he thinks that's
the supplier list." Ticks Nodes. "And it doesn't say CSV. Is it CSV? Excel? It just says Nodes.
And does it include my Watchlist as a column, and the 'not in April' flag? I can't tell from
here. I'd export and open it in Excel to find out."

(Moderator shows the table dock screen as what she would see with the table open.) "Oh, there
IS a table. Nodes and Edges tabs, 'Export table as CSV...' -- that's the one I wanted. And the
dialog says 'Rows: All 300', the order, 'Columns: 9, hidden ones included', a preview of the
first lines and a file name. That's good. That tells me what I'm getting. But I never found how
to open that table on the weekly screens. I'd have given up and used the big Export button."

"The preview has 'degree (full graph)' and 'degree rank (of 300, full...' as column names. My VP
will ask what degree is. I'd rename it in Excel to 'number of links'. And a 0.137852237... with
fifteen decimals -- Power BI won't care, but it tells me this was built by somebody who doesn't
make slides."

## After the task

**Single Ease Question: 4 of 7.** "The bringing-in part was a 5 -- once I got to it, the load
step did my reconciliation for me, which is honestly the best thing I've seen today. Finding it
was a 3: no Import button, the Last import row goes somewhere read-only, and Replace sounds like
it deletes. The export was a 3: I couldn't find the table, the big Export button gave me 157 rows
of a filter I forgot about, and it doesn't say what file type."

**Would she use it instead of her current tool?** "Not instead. Maybe beside. The load step --
found 2,961, 132 new, 39 gone, rows dropped zero, and 'two of your watched ones are not in this
week's data' -- that's twenty minutes of XLOOKUP every Monday, and it's the reason I'd come back.
But the rest is Louvain and modularity, which I'll never click, and the output has to go to Power
BI, so the export has to be dead obvious and has to be a plain CSV with names my VP can read. And
IT still has to say yes. 'Nothing is sent' helps with IT; it doesn't get me the sign-off."

## Problems observed

1. No visible Import or Update entry point on the reopened project; the only import-looking thing
   (Last import row) opens a read-only Version history. Severity 3.
2. Menu wording: "Replace data" reads as destructive to someone whose goal is to keep last week's
   work; she chose Add data first. The warning in Add data rescued her. Severity 2.
3. No discoverable way to open the table from the weekly screens; toolbar icons carry no label
   for "table". Severity 3.
4. Export files... offers "Nodes, 157 rows" under a carried-over filter without saying the table
   is filtered or that the full list is 3,093; easy to send a partial list. Severity 3.
5. Export files... Tables section names no file format and no columns; the table dock's Export
   table as CSV dialog does (rows, order, columns, preview). The two exports disagree (the table
   dock notes say Export files no longer offers tables; the weekly-return export still does).
   Severity 2.
6. "Out of date" result (Modularity vs randomized baseline) is flagged in yellow with no word on
   whether it affects the table she is about to export; she re-ran it only to clear the warning.
   Severity 2.
7. The 26 accounts with no transfers are filed as an "Issue" when to her they are the week's
   finding; she wants that list, not a warning. Severity 1.
8. CSV headers use graph terms ("degree", "degree rank") and full-precision floats; she will
   rename and round in Excel before a slide. Severity 1.
