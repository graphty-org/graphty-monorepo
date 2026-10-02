# Session: version history task, Nadia (level-1 alert reviewer)

Task as given: "Someone changed the analysis of March's transfers on Tuesday. See what the project
looked like before that, and what has been done since."

Renders: design/ui/prototype/tmp/round-7-sessions/t36--alert-reviewer/01.png to 05.png.
Every command was run from design/ui/prototype.

## Start screen (shots/tasks/t36/01.png)

"OK. A big hairball, colored. Title says Transfers, March 2026. On the right: Louvain, 'Run from
Louvain, Sep 28', 35 communities. I don't know what Louvain is and I don't need to. I need
'who changed what, when'. In our case system that's the audit trail on the alert. Where's the
audit trail here? The title has a little arrow. In SharePoint the file name menu has version
history. Try that."

## Step 1 -- title menu

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t36--alert-reviewer/01.png task:t36 --click "Transfers, March 2026"

"Rename, Save, Save as, Export, Apply recipe, Version history, Close project. Version history.
Good, that's the word I'd have looked for."

## Step 2 -- Version history

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t36--alert-reviewer/02.png task:t36 --click "Transfers, March 2026" --click "Version history"

"A log on the right, newest on top. Top one, 'current': April data, replaced from the April CSVs,
Sep 30. 3,093 accounts, was 3,000. Two orange-ish 'large change' tags. Under it, without dates:
asked the assistant (Oct 1, sent account ids out to api.anthropic.com -- hm, QA would want to know
that, and at least it says so), applied a recipe 'Mule ring triage' saved by Dana Reyes Mar 28,
Louvain rerun with 65 communities, PageRank, 'Replaced the data with April'. Then a line, then
'March data', Sep 28, the first version, then an export and the first Louvain run, 35
communities.

Which one is Tuesday? Nothing says Tuesday. I've got Sep 28 and Sep 30 and Oct 1. I'm not going
to open a calendar. The thing that changed the analysis is obviously the data swap to April -- it
says 'Runs on March data were marked out of date'. So I'll call that the change. If it's Sep 30
and that's not Tuesday, then I'm wrong and I can't tell from here, because the PageRank, rerun
and recipe rows have no date or name on them. QA would ask 'who ran the rerun?' and I couldn't
answer.

Also: the main screen said Louvain, Sep 28, 35 groups. This says the current version has 65. So
was I looking at old stuff before I opened this? And the project title still says March 2026
while the current data is April. That bugs me."

## Step 3 -- open the March version

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t36--alert-reviewer/03.png task:t36 --click "Transfers, March 2026" --click "Version history" --click "March data"

"'March data, view only. Restore adds it as a new version on top.' Good -- view only, I didn't
break anything, and it tells me Restore doesn't wipe the others. Legend: 297, 182, 147... 30 more
communities, so 35. That's the 'before'. It looks like the start screen, actually. The hairball
looks the same to me either way; I'd only trust the numbers."

## Step 4 -- Compare with current

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t36--alert-reviewer/04.png task:t36 --click "Transfers, March 2026" --click "Version history" --click "March data" --click "Compare with current"

"Two hairballs side by side, March 35 communities, April 65. 'Agreement 0.449' between 0 unrelated
and 1 the same, with a gray band where reruns of March land. So the groups really moved, it's not
noise. Community 1 went 297 to 359. That's more than I need for 'what did it look like before',
but it's the one screen I'd screenshot for the file -- it has the before, the after and numbers
in one picture. 'Keep as row' I won't touch; don't know what it'd do to the project."

## Step 5 -- Runs filter, to find dates

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t36--alert-reviewer/05.png task:t36 --click "Transfers, March 2026" --click "Version history" --click "Runs"

"Hoping the runs tab gives dates. It doesn't. Louvain rerun and PageRank, no date, no person. Only
the data versions and the recipe and the assistant have dates. I'll stop here."

## Answer I would give

- Before the change: the March data version (Sep 28): 3,000 accounts, 9,113 transfers, Louvain
  35 communities (modularity 0.688), plus an export of a 14-account table.
- The change: the data was replaced with April (Sep 30), which marked the March runs out of date.
- Done since: PageRank, a Louvain rerun (65 communities), the Mule ring triage recipe applied
  (5 rows), and a question to the assistant on Oct 1 that sent 14 account ids out.
- Not sure: I could not match any entry to "Tuesday", and the reruns carry no date or person.

## Debrief

Succeeded? Mostly. I found the before and the after list in about four clicks. I'm not certain the
data swap is the Tuesday change, since nothing in the log is labeled with a weekday and the runs
have no dates.

Single Ease Question: 5 of 7. Version history was where I expected it and view-only was clear.
Lost points for the missing dates and names on runs, and for the start screen still showing the
35-group March result and a "March 2026" title when history calls April current.

Would I use this instead of my current tool? Not for alerts -- I don't use a graph tool for
alerts at all. But as an audit trail on a shared picture it beats asking around: it says what left
the computer and that old versions are view-only. QA would still want who-and-when on every row.
