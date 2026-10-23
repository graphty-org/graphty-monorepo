# Pilot: two spreadsheets as one network

The task asks a first-time user to load `people.csv` (12 staff) and `messages.csv` (23 email
links, one of which, `p11` to `p13`, names someone not on the staff list) as one drawn network and
to report what did not fit. Build under study: graphty@0.8.53, build 0196d46212aa, commit
a1e6b91ff. Two sessions were run: the answer key's route (this folder) and the route that works
(`new-from-data/`). No script errors, `console.error` lines or failed requests appeared in either
session log.

## Verdict

The end state is reachable: one graph drawn from both files, with the stray link shown before
loading and a choice to leave it out (12 nodes, 22 edges) or add the unknown person (13 nodes,
23 edges). Both end states were reached. But the answer key's path does not lead there, and the
route that the key's first step does lead to has a defect that hides the stray row.

## The path that works (7 steps)

1. `--click "New from data..."` -- opens an empty "Add to Untitled" page (`new-from-data/02.png`).
   It does not open a file chooser, so `--upload` must be a separate step.
2. `--click "choose a file..." --upload people.csv` -- read as "Nodes: people.csv, 12 rows", id as
   Key, name and team as Attributes (`03.png`).
3. `--click "Add a table"` (the "+" beside Tables; its tooltip says "Add a table") -- a menu:
   File..., From a URL..., Paste... (`10.png`).
4. `--click "File..." --upload messages.csv` -- read as "Edges: messages.csv, 23 rows", from and
   to proposed as From and To, emails as an Attribute. No role had to be set. The page says
   "the load makes 12 nodes and 22 edges" and "1 edge row name 1 node no node row holds. Show the
   1 unmatched row", with Add / Leave out (`11.png`).
5. `--click "Show the 1 unmatched row"` -- shows line 24: `p11`, `p13`, 6 (`12.png`).
6. `--click "Add"` (or "Leave out") -- the summary changes to 13 nodes and 23 edges (`13.png`).
7. `--click "Load"` -- drawn; Values > Overview reads Nodes 13, Edges 23, one component
   (`14.png`). The Data page lists both tables under one source (`15.png`).

## Blockers

1. **Wrong answer key (the path).** The key says to open `people.csv` with "Open project or
   file..." and then use "the Data page's door for another file". That button loads the file
   straight into a graph of 12 unconnected nodes and never shows the Data import page
   (`02.png`). The Data page that follows (`03.png`) has no visible door for another file; the
   only one is a right-click on the source row, whose single item is "Edit source..."
   (`05.png`). The key should start with "New from data..." and add the second file with
   "Add a table" > "File...", as above.

2. **App defect: the unmatched row is not shown when adding to an open graph.** On the
   right-click route (`Edit source...`, then `choose a file...` with `messages.csv`), the summary
   correctly says "1 edge row name 1 node no node row holds. Show the 1 unmatched row"
   (`07.png`), but clicking that link shows "0 unmatched rows" and "No rows" (`08.png`). A
   participant on this route cannot see which link is the stray one, so cannot report `p11` to
   `p13` from the screen. Loading with "Leave out" gives 12 nodes and 22 edges (`09.png`).

3. **App defect: "Edit source..." does not edit the source, and the first file is dropped from
   the Sources list.** "Edit source..." on `people.csv` opens an empty "Add to people" page that
   does not list `people.csv` among its tables (`06.png`). After loading `messages.csv` there,
   the Graph header reads "From messages.csv" and Sources lists only `messages....` (23 rows, 22
   edges); `people.csv` is gone from the list although its name and team attributes are still
   on the nodes (`09.png`, `10.png`). A user checking "did every file arrive" sees one file.

## Smaller findings (not blockers)

- The match sentence is ungrammatical: "1 edge row name 1 node no node row holds" (`07.png`,
  `new-from-data/11.png`). Something like "1 edge row names a person who is not in any node
  table" would read.
- "Leave out" is already selected before the user decides (`07.png`, `new-from-data/11.png`), so
  pressing Load straight away silently drops the stray link -- the task's "false-done" failure
  is one click away.
- On the Data page after the two-table load, the source names are truncated to "Untitled d...",
  "Node t..." and "Edge ..."; neither file name is visible (`new-from-data/15.png`).
- The menu button at the top left has no tooltip (`new-from-data/04.png`).
- Node labels are not drawn, so names cannot be read off the drawing; the counts on Values >
  Overview are what tell the user everything arrived.

## Study-tool notes

No tool defect. `--click "New from data..." --upload people.csv` in one step fails with "no file
chooser is open" (`new-from-data/02.png`), which is correct: that button opens a page, not a
chooser. Screenshots 04-09 of the `new-from-data/` folder are hovers used to find the "+"
control's name, not participant steps.
