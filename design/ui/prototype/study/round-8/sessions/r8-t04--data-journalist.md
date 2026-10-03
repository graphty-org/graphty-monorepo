# Session: two spreadsheets into one network -- data journalist (Ruth)

Task as given: "You have never used this program before. Two spreadsheets from your team are in
your Downloads folder: one lists the machines on the office network, one lists which machine talks
to which. You want them in as one network and you want to know that every machine and every
connection arrived. If you do not work in IT, these two files are example data, not your own:
treat them as your list of things and your list of links between them."

Renders are in design/ui/prototype/tmp/round-8-sessions/r8-t04--data-journalist/. All commands
were run from design/ui/prototype.

## Step 1 -- start screen (shots/tasks/r8-t04/01.png)

"Open project or file", "New from data", and some samples. I have spreadsheets, not a project,
so "New from data..." sounds closer. I like the line "Files are read on this computer and never
uploaded". That matters to me, so I noticed it.

## Step 2 -- New from data (02.png)

    timeout 120 node app-b/study.mjs --try .../02.png task:r8-t04 --click "New from data..."

A plain file picker: Downloads > it-estate, with hosts-2026-03.csv, connections-2026-03.csv and a
grayed-out png. Easy. I'll tick both CSVs.

## Step 3 -- pick both files, Open (03.png)

    timeout 120 node app-b/study.mjs --try .../03.png task:r8-t04 --click "New from data..." --click "hosts-2026-03.csv" --click "connections-2026-03.csv" --click "Open"

It took both files at once and listed them as two "Tables": hosts 300, connections 1,105, each
with a green check. The top line says `host (300) --connections (1,105)--> host (300)`. That looks
like code, but I can read it: 300 machines, 1,105 links between them. At the bottom a "Match
report: hosts" says "300 rows; every key is unique." The project already calls itself "IT estate,
March 2026". I didn't name it. Odd, but harmless. The hosts sheet has 69 columns, and I won't
look at them all.

The thing I worry about is the links file. In my experience that's where rows go missing,
because a name is spelled differently in the two sheets. I'll check it before I press Load.

## Step 4 -- look at the connections table (04.png)

    timeout 120 node app-b/study.mjs --try .../04.png task:r8-t04 --click "New from data..." --click "hosts-2026-03.csv" --click "connections-2026-03.csv" --click "Open" --click "connections"

This answers my question. The match report says:
- 1,105 rows; every row has both ends.
- 1,105 of 1,105 source found in hosts.
- 1,105 of 1,105 target found in hosts.
- 1,105 rows became 1,105 edges.

That's a number I could explain to an editor. It shows what it counted against what. "source"
and "target" are labeled "From -> host" and "To -> host", which I follow.

It also decided on its own that "bytes_total_24h" is a "Weight", where "Higher means Stronger".
I didn't ask for that, and I don't know yet what it changes. There's a sentence about "a row
without one would weigh 1 0" with a little toggle I don't understand. I left it alone. "Edge id",
"Row / Pair" and "Directed / Undirected" were already set, so I left them too.

## Step 5 -- Load (05.png)

    timeout 120 node app-b/study.mjs --try .../05.png task:r8-t04 --click "New from data..." --click "hosts-2026-03.csv" --click "connections-2026-03.csv" --click "Open" --click "connections" --click "Load"

A big gray hairball with a summary on the right: Nodes 300 nodes, Edges 1,105 connections. That
matches both spreadsheets, so nothing got dropped on the way in.

Two things bother me:
- The dots are already sized by "vu....iated_over_30_days" (a vulnerability count, I gather from
  the key). I never chose that. Who decided big dots mean vulnerabilities? If I put this picture
  in front of an editor, they'd ask why some machines are big, and I'd have to say "the program
  did it". The name is cut off in the middle, too.
- "Isolated nodes 7". Does that mean 7 machines got lost? The total is still 300, so I think they
  just have no links. But the word "isolated" made me double-check.

## Step 6 -- "from 2 tables" (06.png)

    timeout 120 node app-b/study.mjs --try .../06.png task:r8-t04 --click "New from data..." --click "hosts-2026-03.csv" --click "connections-2026-03.csv" --click "Open" --click "connections" --click "Load" --click "from 2 tables"

It takes me back to the import screen with the same match report, now titled
"Edit: hosts-2026-03.csv". So the record of what came in stays with the project, and I can show
it later. Good.

## Step 7 -- click the 7 isolated nodes (07.png)

    timeout 120 node app-b/study.mjs --try .../07.png task:r8-t04 --click "New from data..." --click "hosts-2026-03.csv" --click "connections-2026-03.csv" --click "Open" --click "connections" --click "Load" --click "7"

I expected a list of the 7 machines with no links. I got a table of all 300 nodes ("300 nodes
from hosts-2026-03.csv"). So the 7 is underlined like a link, but it doesn't take me to the 7.
If I wanted to check whether those 7 really have no links or were mismatched, I'd have no way to
see which ones they are. I stopped here.

## Wrap-up

- **Did I succeed?** Yes. Both files came in as one network, and the program told me in plain
  numbers that every machine (300) and every link (1,105 of 1,105, both ends found) arrived. I
  checked that before and after loading.
- **Single Ease Question:** 6 of 7. Getting the files in was fast, and the match report is
  exactly the check I would otherwise do by hand in the spreadsheet. I took one point off for the
  parts I didn't ask for and can't explain: the automatic "Weight", the dots sized by
  vulnerabilities, and an "isolated 7" that doesn't show me the 7.
- **Would I use this instead of my current tool?** For getting a sheet of names and a sheet of
  ties in and proving nothing was dropped, yes. It's better than Gephi, which by reputation
  makes me prepare the data myself and doesn't tell me what it threw away. I'd want it to stop
  styling things before I ask, though. A picture I can't explain is a picture I can't print.

## Problems noticed

1. Clicking the isolated-nodes count ("7") opens a table of all 300 nodes, not the 7 isolated
   ones. The count looks like a link to them, and I couldn't find out which 7 machines they were.
2. After loading, node size is already bound to a vulnerability column the reader never chose,
   and the legend title is cut off in the middle ("vu....iated_over_30_days").
3. The import picks a "Weight" column automatically and shows an unexplained "would weigh 1 0"
   toggle. A first-timer can't tell what it does or whether it changes the result.
4. The summary line `host (300) --connections (1,105)--> host (300)` is written in a code-like
   notation. I could read it, but it doesn't look like plain words.
5. The project is named "IT estate, March 2026" without the user naming it.
