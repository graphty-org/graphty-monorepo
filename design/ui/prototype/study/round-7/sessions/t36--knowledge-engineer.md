# Session: version history of the March transfers project, knowledge engineer

Participant: Dr. Min-ji Kim, knowledge graph engineer (persona file study/personas/knowledge-engineer.md).
Task as given: "Someone changed the analysis of March's transfers on Tuesday. See what the project
looked like before that, and what has been done since." Sample data: one month of card and bank
transfers between accounts.

All commands were run from design/ui/prototype. Renders are in
tmp/round-7-sessions/t36--knowledge-engineer/.

## 01 -- start screen (shots/tasks/t36/01.png)

"A project called 'Transfers, March 2026'. Hairball in the middle, a Louvain inspector on the right:
35 communities, modularity 0.688, 'Run from Louvain, Sep 28'. Good that the method, weight and seed
are written down. Now, 'what did it look like before' is a provenance question. In Git I would run
git log. Here I look for a history or a changelog. The project name has a dropdown arrow; projects
usually keep their file operations there. I try that first."

## 02 -- project menu

    timeout 120 node app-b/study.mjs --try .../02.png task:t36 --click "Transfers, March 2026"

"Rename, Save, Save as, Export, Apply recipe, Version history, Close. 'Version history' is exactly
the word I wanted. Good."

## 03 -- version history

    timeout 120 node app-b/study.mjs --try .../03.png task:t36 --click "Transfers, March 2026" --click "Version history"

"Hm. The current version is called 'April data'. The project is still titled March 2026, and the
start screen showed me the March Louvain result with 35 communities. So the screen I started on was
showing an older result on top of newer data? That is the kind of thing that makes me distrust the
numbers. The log does tell me a lot, and I respect that: 'Replaced from accounts-2026-04.csv and
transfers-2026-04.csv, Sep 30. 3,093 accounts (was 3,000), 8,370 transfers (was 9,113). 132 new, 39
gone.' And 'What changed' flags a large change: 27 components where there was 1, 26 accounts with no
transfers, 65 communities where there were 35. That is a proper change summary, with counts labeled
as accounts versus transfers. I like that.

Below it, in order: Asked the assistant (Oct 1, sent to api.anthropic.com -- I would want to know
that, and it says what left the machine: the question, 14 account ids, 3 statistics), Applied
recipe 'Mule ring triage' saved by Dana Reyes, Louvain rerun (65 communities, modularity 0.742,
March result kept), PageRank, 'Replaced the data with April' (runs on March marked out of date).
Then a divider, then 'March data', Sep 28, 3,000 accounts, 9,113 transfers, the export, and the
original Louvain run.

But the task said Tuesday. The dates I can see are Sep 28 (a Monday), Sep 30 (a Wednesday), Oct 1,
and 'Mar 28' on the recipe, which I assume is when Dana saved the recipe, not when it was applied.
Most entries have no date at all, and none has a name except the recipe. Who made the change? I
cannot answer 'someone' from this log. I will assume the change meant is the April replacement and
the rerun that followed it, because that is the only thing that changed the analysis."

## 04 -- the March version

    timeout 120 node app-b/study.mjs --try .../04.png task:t36 --click "Transfers, March 2026" --click "Version history" --click "March data"

"'March data, view only. Restore adds it as a new version on top.' Good -- restore is not
destructive, it appends, like a revert commit. The legend is now Community 1 297, Community 2 182,
... 30 more. That matches the start screen. So this is what it looked like before: March data, 3,000
accounts, 9,113 transfers, Louvain with 35 communities, modularity 0.688, seed 11, plus one export
of 14 accounts."

## 05 -- compare with current

    timeout 120 node app-b/study.mjs --try .../05.png task:t36 --click "Transfers, March 2026" --click "Version history" --click "March data" --click "Compare with current"

"Side by side, March Louvain against April Louvain. Agreement 0.449 over 2,961 accounts in both,
and -- this is the part I appreciate -- a reference band: reruns of March on the same data score
0.759 to 0.768. So 0.449 is well below the noise floor; the partitions really differ. It does not
name the agreement measure. Is that adjusted Rand, NMI? I would ask. 'Descriptive only; no
statistical test' is honest. Matched 26 pairs, 13 new in April, 26 singletons, 9 gone. The two
pictures themselves tell me nothing; the numbers on the right do the work."

## 06 -- runs only

    timeout 120 node app-b/study.mjs --try .../06.png task:t36 --click "Transfers, March 2026" --click "Version history" --click "Runs"

"Filtering to runs: March Louvain; then after April arrived, PageRank and the Louvain rerun. That is
the whole list, so I am seeing the full history."

## 07 -- hover an entry for date or author

    timeout 120 node app-b/study.mjs --try .../07.png task:t36 --click "Transfers, March 2026" --click "Version history" --hover "Louvain communities, rerun"

"Hovering the rerun only highlights the row. No timestamp, no author. In a Git log every line has
both. I still cannot tell you which of these happened on Tuesday or who did them."

## Stop

"I am done. Before: March data (3,000 accounts, 9,113 transfers), one Louvain run, 35
communities, modularity 0.688, seed 11, and one CSV export of 14 accounts. Since: the data was
replaced with April (Sep 30), PageRank was run, Louvain was rerun (65 communities, 0.742, the
March result kept as earlier), Dana Reyes's 'Mule ring triage' recipe was applied (5 rows), and
someone asked the assistant on Oct 1, which sent 14 account ids off the machine."

- Succeeded? Mostly. I found the before state and everything since. I could not match the change
  to Tuesday or to a person, because most entries carry neither a date nor an author.
- Single Ease Question: 5 of 7. Finding the history was one menu away; reading it was easy; the
  missing dates and names, and the March title over April data, cost me.
- Would I use this instead of my current tool? For provenance on an analysis, this log is better
  than what any graph viewer I have used offers -- Gephi and Bloom have nothing like it, and it
  writes counts, file names and what left the machine. But I would not trust it as an audit trail
  until every entry has a timestamp and a person, and I would want the agreement measure named.
  Today I would still keep my real audit trail in Git and Jira.

## Observations for the moderator

- Most log entries have no date and no author; only the two data versions, the assistant entry and
  the recipe carry a date, and only the recipe carries a name. A "who changed it on Tuesday" question
  cannot be answered. No entry falls on a Tuesday (Sep 29).
- The project title stays "Transfers, March 2026" while the current version is April data, and the
  start screen's inspector showed the March Louvain result (35 communities). It was not clear
  whether I was looking at old results on new data.
- "Mar 28" on the recipe reads like a date in March 2026 amid September dates; it is ambiguous
  whether it is when the recipe was saved or applied.
- The compare panel does not name its agreement measure.
- Liked: the change summary with labeled counts and "large change" flags, restore that appends a
  new version, the rerun noise band, and the assistant entry saying exactly what left the computer.
