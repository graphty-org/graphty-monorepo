# Session: apply a colleague's recipe to wide host data -- Dr. Chen (computational biologist)

Task as given by the moderator: "A colleague sent the colors and analysis steps their team uses on host
data, without their data. Two of the things they expect to find about each host are called differently
in your hosts. Put them to use on your hosts so that nothing in them is silently skipped. The data on
screen is a sample: a company's IT estate, hosts and the network connections between them, with dozens
of things recorded about each. If that is not your line of work, treat it as your own wide spreadsheet."

Start screen: shots/tasks/t15-wide/01.png. Renders are in
tmp/round-7-sessions/t15-wide--bioinformatics-researcher/ (01-18). All commands were run from
design/ui/prototype with `timeout 120 node app-b/study.mjs --try <dir>/NN.png task:t15-wide ...`.

## Think-aloud

**01 (start).** "IT estate, March 2026". 300 nodes, 1,105 edges, directed, weight bytes_total_24h.
"Columns: 8 of 69", so this is the wide table. Fine, I'll pretend it's my expression table with 69
columns. In Cytoscape this is File > Import > Styles from File. I need to find "import" for a style and
for whatever their analysis steps are saved as.

**02** `--hover "Menu"` -- tooltip "Main menu" on the hamburger. That's where File would be.

**03** `--click "Style"` -- Style tab on the right: canvas background, print-safe colors, layout method
"Spread Out", seed 7. Good that there's a seed. No "load style" here.

**04** `--click "Main menu"` -- New project, Open..., Open recent, Select where..., Settings, Keyboard
shortcuts, Help. No Import. "Open..." sounds like it would replace my network with a file, and I don't
want to lose what I have. Not clicking it.

**05** `--hover "More"` -- that landed on the right panel's "More actions (Shift+F10)".

**06** `--click "Views"` -- "No saved views. Save view (+)". A colleague's colors plus steps might be a
saved view, so the Views panel's own "..." is worth a look.

**07** `--click "Views" --hover "Views menu"` -- "nothing on screen is called Views menu". Guessing names.

**08** `--click "More actions"` -- right panel menu: Select all visible, Invert selection, Re-run layout,
Reshuffle layout seed, Unpin all, Compute the overview, Add node..., Add note, Clear graph data.
Nothing for bringing in someone else's setup.

**09** `--click "Views" --click "More view actions"` then `--click "Views" --click "View actions"` --
neither exists.

**10** `--click "Views" --click "More"` -- the Views "..." holds only "Export tour video... Save a view
first". Dead end.

**11** `--hover "Graph actions"` -- nothing called that. I wanted the "..." beside the left search box.

**12** `--click "Hosts"` -- the graph dropdown: "Hosts, 300 nodes" and "Compare graphs...". Compare
graphs is interesting for my disease-vs-control work, but not this.

**13** `--click "IT estate, March 2026"` -- the project name is a menu: Rename, Save, Save as, Export,
**Apply recipe or style file...**, Version history, Close project. There it is. I would never have
looked under the file name first; in Cytoscape it's under File > Import. Took me about eight tries.

**14** `--click "Data"` -- (checked in parallel) Sources: hosts-2026-03.csv (300 nodes),
connections-2026-03.csv (1,105 rows, 1,105 edges). Attributes list with types and fill rates
(backup_last_success_at 84%, cmdb_last_audited_at 62%). That is genuinely good: type and completeness
per column is what I check first on any import.

**15** `--click "IT estate, March 2026" --click "Apply recipe or style file..."` -- no file chooser. A
dialog "Apply recipe: Mule ring triage", file mule-ring-triage.graphty, "Expects: a transfer network of
accounts". And behind it the whole project has changed: title "Transfers, March 2026", 3,000 nodes,
9,113 edges, weight "amount". My 300 hosts are gone. I didn't pick that file and I didn't open that
project. The dialog says "4 of 4 matched by name and type", which can't be my colleague's file, because
my colleague told me two of the fields don't match. The layout of the dialog itself is what I'd want:
what it brings, what it expects, each row it adds with its column -- but it's showing me the wrong
recipe on the wrong network.

**16** same, then `--click "Cancel"` -- now I'm in "Les Miserables", co-appearances, 77 nodes, with
PageRank, Louvain, Shortest paths, Watchlist already painted. Third network in three clicks. Where are my
hosts? This is the node-count-I-cannot-reconcile problem, except worse: it's a different dataset
entirely.

**17** same, then `--click "Show all"` -- "Hide matched" toggles on, and each row shows the column it
mapped: "weight: fee -> fee", "time -> timestamp", "riskScore -> riskScore", "alertRule -> alertRule".
So this is where a mismatch would show up, as "their name -> my name". That's the right idea. But on
this file everything matched, so I still don't know how I'd fix a column that's named differently, and I
can't trust that it's about my network.

**18** `--click "Analyze"` -- back on my hosts, the Analyze palette: Louvain, PageRank, Shortest path,
Links (count), Links in/out, Total bytes_total_24h. One-line definitions under each, which I like. But
it runs one measure at a time; it doesn't take a colleague's file.

I stop here. The only entry point for the colleague's file threw away my network and showed me a
different team's recipe on different data, and cancelling put me somewhere else again. At that point
I'd open RStudio.

## Outcome

- Succeeded? No. I found the command ("Apply recipe or style file..." under the project name), but it
  never applied anything to my hosts. It showed a transfer-network recipe on a 3,000-node transfer
  dataset, reported 4 of 4 matched, and I never got to the two fields that are named differently.
- Single Ease Question: 2 of 7.
- Would I use this instead of my current tool? Not for this. The idea is better than Cytoscape's: a
  style plus analysis steps in one file, a preview that lists every row it adds and which of my columns
  each one reads ("time -> timestamp"), applied as one undo step. That's exactly the "show the method"
  record I need for a reviewer. But a tool that swaps my network for another one when I open a file
  dialog, and then lands me in a third one when I cancel, has failed the first thing I check: is my data
  still my data. I'd also want this scriptable from R (apply recipe X to network Y, report unmatched
  columns as a table), and nothing I saw says it is.

## Problems, in her words

1. "Apply recipe" is under the project name, not under the main menu where Open and New are. I went
   through the hamburger, the right panel's "...", the Views "..." and the graph dropdown first.
2. Choosing "Apply recipe or style file..." did not ask me for a file. It went straight to a recipe I
   never chose.
3. My 300-host network was replaced by a 3,000-node transfer network the moment the dialog opened.
4. Cancel did not bring my hosts back; it put me in Les Miserables with someone's analysis already on it.
5. The recipe reported 4 of 4 matched, so I never saw how a mismatched field is flagged or fixed --
   which was the whole point of the exercise.
6. The "..." buttons all look the same and their names are only found by resting on them; I wasted
   several guesses.

## What she liked

- Data panel: every column with its type and how full it is (84%, 62%, 3%).
- The recipe preview: "Brings / You supply / Expects", one row per thing it adds, each with the column
  it reads, "Adds 6 rows on top of the tree, one undo step".
- Analyze palette: plain one-line definition under each measure.
- Layout has a visible seed.
