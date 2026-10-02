# Session: swap March's transfers for April's (ML engineer, recommendation systems)

Participant: Chris, senior ML engineer on a retail recommendations team (simulated persona).
Task as given by the moderator: "April's transfers have arrived as a new export. You want
everything you built on March -- the rings, the rankings, the colors -- to run again on April's
numbers in place of March's, without rebuilding anything."

Start screen: shots/tasks/t13/01.png. Renders: tmp/round-7-sessions/t13--ml-engineer-recsys/.
All commands were run from design/ui/prototype.

Outcome: gave up. Single Ease Question: 2 of 7.

## Think-aloud

**Start screen.** Title says "Transfers, March 2026". Left tree has Louvain (35 groups), "Links in
(count)", Everything. Right panel is the Louvain run, "from Louvain, Sep 28", seed 11. Fine. In my
world this is "rerun the DAG on the new partition", so I want the input node of the pipeline, not
the styles. First guess: the project title menu.

```
timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t13--ml-engineer-recsys/01.png task:t13 --click "Transfers, March 2026"
```

**01.** Rename, Save, Save as, Export, "Apply recipe or style file...", Version history, Close
project. Nothing like "swap input" or "new month". "Apply recipe" sounds like the reverse
direction -- bringing a recipe to data, not data to my recipe. Skip for now. The rail has "Data",
that is where inputs should live.

```
timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t13--ml-engineer-recsys/02.png task:t13 --click "Data"
```

**02.** Good, this is the lineage I wanted: Sources = accounts-2026-03.csv (3,000 nodes) and
transfers-2026-03.csv (9,113 rows, 9,113 edges). One filter, "amount is at least 1,000", 812 of
3,000 nodes. Each source has a three-dot button. Before I find it, let me click the file name.

```
timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t13--ml-engineer-recsys/03.png task:t13 --click "Data" --click "transfers-2026-03.csv"
```

**03.** That opened the column mapping editor for the March file. Nice match report with counts
("9,113 rows became 9,113 edges"), I like that. But no "pick a different file" here; the file name
at the top is just a label. Back out and use the three dots.

```
timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t13--ml-engineer-recsys/04.png task:t13 --click "Data" --click "More actions for transfers-2026-03.csv"
-> nothing on screen is called "More actions for transfers-2026-03.csv"
timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t13--ml-engineer-recsys/05.png task:t13 --click "Data" --hover "More"
timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t13--ml-engineer-recsys/06.png task:t13 --click "Data" --click "More actions"
```

**05-06.** Hovering hit the right panel's "More actions" (Shift+F10) instead of the source row's.
That menu is selection, layout, "Compute the overview", "Clear graph data". Not it. Two three-dot
buttons with no visible difference is annoying; I had to fish for the row's one.

```
timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t13--ml-engineer-recsys/07.png task:t13 --click "Data" --click "Source actions"
-> nothing on screen is called "Source actions"
timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t13--ml-engineer-recsys/07.png task:t13 --click "Data" --click "transfers-2026-03.csv actions"
-> nothing on screen is called "transfers-2026-03.csv actions"
timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t13--ml-engineer-recsys/07.png task:t13 --click "Data" --click "Actions for transfers-2026-03.csv"
```

**07.** Got it: Rename, "Replace with file...", "Edit source...", "Refresh". "Replace with file"
is exactly the verb I was looking for. This is the right place.

```
timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t13--ml-engineer-recsys/08.png task:t13 --click "Data" --click "Actions for transfers-2026-03.csv" --click "Replace with file..."
```

**08.** "Replace: transfers-2026-03.csv", file is transfers-2026-04.csv, 8,370 rows, "all 4
columns of transfers-2026-03.csv are here, so every role carried over". Great, that is the schema
check I want. Header line says account (3,000) --transfers (8,370)--> account (3,000).

But two things bother me. One: the preview rows are character-for-character the March rows, with
timestamps 2026-03-29, 2026-03-25, 2026-03-11. If this is April's export, why are the first rows
dated March? Either the preview is stale or the export is wrong, and the screen does not say which.
Two: the accounts table stays at 3,000 and the report says nothing about April transfers that
point at account ids that are not in the March accounts file. New accounts in April is the normal
case (cold start), and I want that count before I trust anything downstream. I will press Load
anyway and look at the result.

```
timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t13--ml-engineer-recsys/09.png task:t13 --click "Data" --click "Actions for transfers-2026-03.csv" --click "Replace with file..." --click "Load"
```

**09.** Hm. The source still says transfers-2026-03.csv, 9,113 rows, 9,113 edges. Summary says
Edges 9,113. The preview promised 8,370. So the April file did not land. Worse: my filter "amount
is at least 1,000" is gone -- Filters now says "No filters", nodes are back to 3,000 of 3,000. So
the one visible effect of Load was to throw away part of what I built, which is the opposite of the
task. No toast, no "replaced", no undo hint.

```
timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t13--ml-engineer-recsys/10.png task:t13 --click "Data" --click "Actions for transfers-2026-03.csv" --click "Replace with file..." --click "Load" --hover "transfers-2026-03.csv"
timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t13--ml-engineer-recsys/11.png task:t13 --click "Data" --click "Actions for transfers-2026-03.csv" --click "Replace with file..." --click "Load" --click "Graph"
```

**10.** Hovering the source row does not expand the truncated line ("9,113 edges, r..."). I cannot
read the end of it.

**11.** Graph view: identical to the start. Louvain still "Sep 28", same seed, same sizes 297 /
182 / 147 ... down to the count. Title still "Transfers, March 2026". If Louvain had rerun on 8,370
different edges, those sizes would have moved. Nothing says the runs are stale, rerunning, or
rerun. I have no evidence anything happened.

```
timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t13--ml-engineer-recsys/12.png task:t13 --click "Transfers, March 2026" --click "Apply recipe or style file..."
```

**12.** Tried the other door. "Apply recipe: Mule ring triage", a separate .graphty file from Mar
28 that would add Watchlist, PageRank, max flow, cycles on top of my tree. That is someone else's
recipe going onto this data, not my March work going onto April data. Cancel. Not touching it.

```
timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t13--ml-engineer-recsys/13.png task:t13 --click "Data" --click "Actions for transfers-2026-03.csv" --click "Replace with file..." --click "Load" --click "Actions for transfers-2026-03.csv"
timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t13--ml-engineer-recsys/14.png task:t13 --click "Data" --click "Actions for transfers-2026-03.csv" --click "Replace with file..." --click "Load" --click "Actions for transfers-2026-03.csv" --click "Edit source..."
```

**13-14.** The source menu is unchanged after the Load, and "Edit source" shows the March file,
9,113 rows, March timestamps. That settles it: the replacement did not take. I am stopping here.

## Verdict

- **Succeeded?** No. I found the right verb ("Replace with file...") and the preview looked right
  (8,370 rows, columns matched), but after Load the project still had the March file, 9,113 edges,
  the same Louvain result with the same date and sizes, and my amount filter had disappeared.
  I would not trust any number on that screen as April.
- **Single Ease Question:** 2 of 7. Finding the replace action took fishing for an unlabeled
  three-dot button; the outcome contradicted the preview and silently dropped a filter.
- **Would I use this instead of my current tool?** No, not for this. In my world this is a
  parameter change on a pipeline: point the job at s3://.../2026-04/ and rerun, and I get a run log
  saying which steps reran and on how many rows. Here I get no log of what reran, no "stale"
  marker on Louvain, no count of April ids missing from the accounts table, and a filter that
  vanished. The replace dialog's match report is the best part of the app -- if Load actually
  kept every step, reran them, and then showed me a before/after (March 9,113 edges -> April
  8,370; communities 35 -> N; filter still on, X of Y nodes) I would consider it.

## Problems seen

1. After "Load" in Replace, the source, edge count, mapping editor and every result still show
   March (9,113 edges, Louvain Sep 28, identical community sizes). The preview had said 8,370.
2. Load removed the filter "amount is at least 1,000" without saying so. Rebuilding is exactly
   what the task forbids.
3. No feedback after Load: no toast, no "rerunning", no stale badge on Louvain or "Links in", no
   change to the project title or date.
4. The replace preview shows March-dated rows (2026-03-29 ...) for a file named 2026-04.
5. The replace report does not count April transfers whose accounts are missing from the March
   accounts file, nor offer to replace the accounts file too.
6. Two visually identical three-dot buttons (source row and right panel); the source row one is
   found only by its accessible name. The truncated source-row subtitle cannot be read on hover.
7. "Apply recipe or style file..." sits in the title menu next to Save, which reads like the
   reuse-my-work path but applies a different recipe file.
