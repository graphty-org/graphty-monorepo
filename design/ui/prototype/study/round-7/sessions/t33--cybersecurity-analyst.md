# Session: "how did the April rerun go, and which month is on screen" -- Priya, threat hunter

Participant: Priya, senior threat hunter at a regional bank (persona file study/personas/cybersecurity-analyst.md).

Moderator's task, as given: "Before lunch you asked graphty to redo the rings of accounts on April's
data. See how that went, and which month the drawing is showing you now. The data on screen is a
sample: one month of card and bank transfers between accounts. If that is not your line of work,
treat the accounts as your own things (suppliers, customers, hosts, genes) and the transfers as what
passes between them."

All commands run from design/ui/prototype. D = tmp/round-7-sessions/t33--cybersecurity-analyst (absolute path used in the real runs).

## Start screen (shots/tasks/t33/01.png)

> Fine. Title bar: "Transfers, March 2026". Chip says "Local only", good, that is my first question
> answered, or it claims to. Left: a Louvain row, "35 groups". Right panel: Louvain, "Run from
> Louvain, Sep 28", 35 communities, modularity 0.688, seed 11. Legend top-left, Community 1 is 297.
>
> So... everything on this screen says March. I asked for April before lunch. Either it never ran,
> or I am not looking at it. There is no banner, no "out of date", no job finished toast. Nothing
> tells me my request went anywhere. In Splunk a finished search sits in the job list. Where's the
> job list here? Title has a dropdown, start there.

## Step 1 -- the title menu

    timeout 120 node app-b/study.mjs --try $D/01.png task:t33 --click "Transfers, March 2026"

> Rename, Save, Save as, Export, Apply recipe, Version history, Close project. Version history is
> the closest thing to an audit log. Trying it.

## Step 2 -- Version history

    timeout 120 node app-b/study.mjs --try $D/02.png task:t33 --click "Transfers, March 2026" --click "Version history"

> OK, now we're talking. A log. Top entry: "April data -- current". Replaced from
> accounts-2026-04.csv and transfers-2026-04.csv, Sep 30. 3,093 accounts (was 3,000), 8,370
> transfers (was 9,113), 132 new, 39 gone. Two "large change" flags: 27 components where March had
> 1, because 26 accounts have no transfers this month, and 65 communities, was 35, 26 of which are
> those single accounts. Community numbers carried over from March. That is a decent change summary;
> it is roughly what I'd write in my notebook header.
>
> Under it, newest first: "Asked the assistant -- Sent to api.anthropic.com, Oct 1: your question,
> 14 account ids, 3 statistics." Stop. The chip at the top says "Local only". This says account ids
> left the building. That's exactly the thing I would have to report. I didn't send it in this
> session, the log says someone did on Oct 1. Noting it and moving on because this is a study.
>
> Then "Applied recipe Mule ring triage", "Louvain communities, rerun -- 65 communities, modularity
> 0.742. The March result is kept as an earlier result." There it is. The rerun happened. Then
> PageRank, "Replaced the data with April -- runs on March data were marked out of date."
>
> So the log says: April is current, Louvain was rerun on April, March runs are out of date. And
> the drawing in this history view has a legend saying Community 1 is 359, not 297, "Numbers carried
> over from March". That's the April run.

## Step 3 -- what is the Louvain run link on the main screen

    timeout 120 node app-b/study.mjs --try $D/03.png task:t33 --click "from Louvain, Sep 28"

> I clicked "from Louvain, Sep 28" expecting the run details. Got an "Analyze" picker with
> Louvain in Recent. Not what I wanted; that's "run a new thing", not "show me the run I have".
> Closing it mentally.

## Step 4 -- Data panel, then the Louvain row

    timeout 120 node app-b/study.mjs --try $D/04.png task:t33 --click "Data"
    timeout 120 node app-b/study.mjs --try $D/05.png task:t33 --click "Louvain"

> Data panel. Sources: accounts-2026-03.csv, 3,000 nodes. transfers-2026-03.csv, 9,113 edges.
> MARCH files. The history said those were replaced by the 04 files. Also a filter "amount is at
> least 1,000, 812 of 3,000 nodes" is on, and the top chip changed to "812 of 3,000 nodes". And the
> drawing turned into a gray hex blob. Fine, whatever, but the counts are still 3,000 and 9,113.
>
> Clicked the Louvain row: same as the start. 35 groups, 297 in Community 1, Sep 28, seed 11.
> That's the March run. No "out of date" mark anywhere on it, even though the history literally
> says "runs on March data were marked out of date". Marked where? Not here.

## Step 5 -- Runs tab, and look at March in the history

    timeout 120 node app-b/study.mjs --try $D/06.png task:t33 --click "Transfers, March 2026" --click "Version history" --click "Runs"
    timeout 120 node app-b/study.mjs --try $D/07.png task:t33 --click "Transfers, March 2026" --click "Version history" --click "March data"

> Runs tab is a cleaner view: April data (current) -> Louvain rerun, PageRank; March data ->
> Louvain 35 communities, seed 11. Good filter, I like that tab.
>
> Clicked March data: "March data, view only. Restore adds it as a new version on top." Legend
> goes back to 297 for Community 1. So the history knows the difference between the two. The main
> screen, as far as I can tell, is the March one.

## Step 6 -- leave the history with Esc

    timeout 120 node app-b/study.mjs --try $D/08.png task:t33 --click "Transfers, March 2026" --click "Version history" --key Escape

> It says "Esc to leave". I pressed Esc. And now I'm in a different project. "Les Miserables",
> 77 nodes, character names. My transfers are gone from the screen. If that happened on a real
> shift I would assume I'd just lost my work. That's a "went white" moment for me.

## Step 7 -- leave the history through the Graph rail instead

    timeout 120 node app-b/study.mjs --try $D/10.png task:t33 --click "Transfers, March 2026" --click "Version history" --click "Graph"

> Back on the transfers. Title: "Transfers, March 2026". Louvain 35 groups, 297, Sep 28. Same as
> the start. So the main drawing is not the April rerun.

## Step 8 -- the "Local only" chip, Views, Notes, Assistant

    timeout 120 node app-b/study.mjs --try $D/11.png task:t33 --hover "Local only"
    timeout 120 node app-b/study.mjs --try $D/09.png task:t33 --click "Views"
    timeout 120 node app-b/study.mjs --try $D/12.png task:t33 --click "Notes"
    timeout 120 node app-b/study.mjs --try $D/13.png task:t33 --click "Assistant"

> Hover on "Local only" just says "Privacy settings". Views: none saved, so I'm not inside some
> saved March view. Notes: none. Nobody left me a note about the rerun.
>
> Assistant panel: "Off. Nothing is sent." But the history says it sent 14 account ids to
> api.anthropic.com on Oct 1. One of those is wrong. I'm not clicking "Turn on in Settings", I don't
> click AI things, but I want to know which of the two statements is true. Right now I can't.

## Step 9 -- compare March to the current version

    timeout 120 node app-b/study.mjs --try $D/14.png task:t33 --click "Transfers, March 2026" --click "Version history" --click "March data" --click "Compare with current"

> This is the best screen I've seen. Side by side, March 3,000 accounts / 35 communities, April
> 3,093 / 65. Agreement 0.449 over 2,961 accounts in both, and it tells me reruns of March on the
> same data score 0.759 to 0.768. So the drop is real, not seed noise. 26 matched pairs, 13 new
> groups in April holding 773 accounts, 26 singles, 9 gone. Size change table: Community 1 297 to
> 359, Community 27 52 to 107, Community 31 37 to 64. "Descriptive only; no statistical test." Good,
> it doesn't oversell. Community 27 doubling is where I'd start.

## Where I stopped

> How did the rerun go: it ran. April Louvain, 65 communities, modularity 0.742, but 26 of those
> are one-account groups with no transfers, so really 39 that matter. Rings shifted a lot versus
> March: agreement 0.449, well under the rerun band. Community 1 grew 297 to 359, 27 doubled, 13
> new groups worth 773 accounts.
>
> Which month the drawing shows: the main drawing is showing March. Title says March, sources are
> the 03 files, 3,000 nodes, 9,113 edges, Louvain is the Sep 28 run with 35 groups. That is what I'd
> write down. But the history says April is "current", and the April run is only visible inside
> version history and compare. I could not find any control on the main screen that switches the
> drawing to the April run, and nothing on the main screen says the March run is out of date. So
> my answer is "March" with low confidence, because the tool contradicts itself.

## Verdict

- Succeeded? Half. I'm confident about how the rerun went (the compare screen nailed it). I am not
  confident about which month the drawing is on: I'd say March, but the app's history says April is
  current, so either the main screen is stale or I misread "current".
- Single Ease Question: 3 of 7.
- Would I use this instead of my current tool? Not yet. The version log and the compare screen are
  better than anything in my notebook for "what changed between two months" -- the rerun band
  next to the agreement score is exactly what I'd want and never get from Splunk. But three things
  kill it for me: the main screen says March while the log says April is current, with no stale
  warning on the old run; "Local only" and "Assistant: Off, nothing is sent" sit next to a log line
  saying 14 account ids went to api.anthropic.com; and pressing Esc, which the screen told me to
  press, threw me into a different project. Any one of those I'd have to explain to my lead. All
  three, I go back to the notebook.
