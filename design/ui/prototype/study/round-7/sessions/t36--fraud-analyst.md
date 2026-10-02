# Session: t36, fraud analyst (Sarah)

Task as given: "Someone changed the analysis of March's transfers on Tuesday. See what the
project looked like before that, and what has been done since. The data on screen is a sample:
one month of card and bank transfers between accounts."

Mode: first impression (not mandated). Renders in
tmp/round-7-sessions/t36--fraud-analyst/.

## Steps

Start screen (shots/tasks/t36/01.png). Title "Transfers, March 2026", Louvain colors, 35 groups,
Community 1 is 297.

> Somebody touched my case on Tuesday. I want an audit trail. No "History" button on screen.
> The case name at the top has a little arrow, so that's where I look first.

01. `timeout 120 node app-b/study.mjs --try .../t36--fraud-analyst/01.png task:t36 --click "Transfers, March 2026"`

> A file menu: Rename, Save, Save as, Export, Apply recipe, Version history, Close project.
> "Version history" is the right word. Good.

02. `... --try .../02.png task:t36 --click "Transfers, March 2026" --click "Version history"`

> A log on the right, newest at the top. Current version is "April data", replaced from the
> April CSVs on Sep 30: 3,093 accounts (was 3,000), 8,370 transfers (was 9,113), 132 new and 39
> gone, and it says "large change" twice: 27 components instead of 1, 65 communities instead of
> 35. Good, it tells me what moved in numbers I can check.
> Then: asked the assistant on Oct 1, and it says what left the machine (my question, 14 account
> ids, 3 statistics). I like that it says so; I'd be the one explaining it.
> Then the recipe "Mule ring triage" (saved by Dana Reyes, Mar 28), Louvain rerun, PageRank,
> "Replaced the data with April". Then "March data", Sep 28.
> Problem: I was told Tuesday. Today is Friday Oct 2, so Tuesday was Sep 29. Nothing in this log
> says Sep 29. Most rows have no date at all and none say WHO did it. "PageRank" by whom, when?
> The one name on screen, Dana Reyes, is who saved the recipe in March, not who applied it.
> For an audit trail that's the first thing an examiner asks. I'm guessing the change is the
> data swap to April and everything above it.

03. `... --click "Transfers, March 2026" --click "Version history" --click "March data"`

> "March data, view only. Restore adds it as a new version on top." Good: looking doesn't
> destroy anything, and restore doesn't wipe the April work. The legend shows 297, 182, 147,
> which is what I started with. That's the "before". Under it: the original Louvain run (35
> communities, seed 11) and an export "case-acc-233575_ring-pagerank_2026-03.csv". So someone
> already sent something out on that case, from the March picture.

04. `... --click "March data" --click "Compare with current"`

> Two pictures side by side, March and April, with the same coloring. Agreement 0.449, with a
> plain note that reruns on the same March data score about 0.76, so this is a real change, not
> noise. 35 to 65 communities, 9 gone, Community 1 297 to 359, a size-change list. That's
> useful: the rings I built the case on got reshuffled by new data, not by somebody fiddling
> settings. I'd still want to know whether account 233575's ring held together, and I don't
> see a way to ask that here without hunting. "Agreement" I wouldn't put in a SAR, but the
> explanation is plain enough for me.

05. `... --click "Version history" --click "Replaced the data with April"`

> Wanted the who and when of that row. Instead it threw me out of the history onto a Data page
> showing accounts-2026-03.csv and transfers-2026-03.csv, 3,000 nodes. Wait. History said April
> is current. The project I started in also shows March (35 groups, 297). So which one is the
> live project? The title says March, history says April is current. That's the kind of thing
> that makes me not trust the tool with a case file. I'd stop here.

## Outcome

Think I succeeded? Mostly. I found the before (March data, view only) and what was done after
(April data swap, Louvain rerun, PageRank, recipe, assistant question) and could compare March to
April side by side. I could not confirm which of those happened on Tuesday, or who did any of
them, because the log has no per-row dates and no names.

Single Ease Question: 5 of 7. Finding history was quick. The missing who/when and the March vs
April "which is current" confusion cost me.

Would I use this instead of my current tool? Not instead. As an audit trail it is better than
what i2 gives me (nothing) and better than "check the file's modified date" in Excel. But an
audit log without a name and a timestamp on every entry is not an audit log I can hand a QA
reviewer. Put user and time on every row and it earns a place for the big cases.
