# Session r8-t23 -- Jordan, marketing network analyst

Task as given by the moderator: "The Les Miserables network is open with the
program's circles of characters shown (example data, not your own). Leave one
reminder on the whole circle around the bishop Myriel, and one on the chain the
program already traced between Valjean and Javert as a whole, not on any one
character. Then locate both reminders again."

Start screen: shots/tasks/r8-t23/01.png. All commands were run from
design/ui/prototype; renders are in tmp/round-8-sessions/r8-t23--marketing-analyst/.

## Step 1 -- try to get at Myriel

Command: `timeout 120 node app-b/study.mjs --try .../01.png task:r8-t23 --click "Myriel"`

Think-aloud: "OK, the circles are 'Louvain' in this list -- I'd call them
clusters. Six communities, and half the names are cut off: 'Comm...',
'Community...'. Which one is the bishop's? I'll just click Myriel." What I got
was the 'Myriel to Javert' path row on the left, not the bishop's cluster. "Not
what I meant. That's a path, not his circle."

## Step 2 -- guess at the clusters one by one

Commands:
- `--click "Community 5"` (02.png) -- right panel, Data tab: Hub "Thenardier,
  8 links inside". "Oh nice, it tells me the hub. Not Myriel. But I also see
  'Add note (N)' down at the bottom, good to know."
- `--click "Community 4"` (03.png) -- Hub "Fantine". "Nope."
- `--click "Community 3"` (04.png) -- Hub "Myriel, 9 links inside", member list
  with Myriel at the top. "There he is. Three tries. Why can't the row just say
  'Myriel's cluster' or at least not truncate? In a 30-cluster file I'd be
  clicking all afternoon." It says '2 notes' already and the Notes section
  bottom right only shows 'Open in Notes', no Add button that I can see on this
  one.

## Step 3 -- note on the circle

Commands:
- `--click "Community 3" --key n` (05.png) -- I remembered the "(N)" hint from
  Community 5. A box opens on the left: "Note on: Community 3", "Write a note".
  "Good, it says what it's attached to. 'Community 3' is the whole cluster, not
  Myriel himself -- that's what I want."
- `--click "Community 3" --key n --type "Bishop circle - check for brief" --click "Save"`
  (06.png) -- saved; top of the list "Bishop circle - check for brief" tagged
  Community 3; the inspector says "3 notes". "Fine."

Side gripe: "This is the problem with our listening suite too -- I can tag an
account, but I can't tag a segment. I keep the segment notes in a Google Doc
nobody reads."

## Step 4 -- note on the Valjean-Javert chain

Commands:
- `... --click "Graph" --click "Valjean to Javert"` (07.png) -- the path's
  panel: From Valjean, To Javert, "17 shared chapters", and "Note on: Path
  Valjean to Javert" with an Add note link. "Clear. It's the path, not one of
  the two." Small thing: when I came back to the Graph list the Louvain group
  had folded up and shows "1 note" plus a little dashed "3" badge. "1 note and 3?
  Which is it? I just put my note on Community 3, so is it 1 or 3?"
- `... --click "Add note" --type "Valjean-Javert chain - use on pursuit slide" --click "Save"`
  (08.png) -- saved, top of the Notes list, tagged "Valjean to Javert".

## Step 5 -- find them again

Commands:
- `... --click "Graph" --key Escape` (09.png) -- back on the outline. The path
  row now says "1 note", fine. But a toast at the bottom: "Selection cleared
  (PageRank)". "I never selected PageRank. What did I just clear?" Also the
  "Notes 4 items" row in the outline still says 4 though the Notes panel said 9.
  "So which number is right? This is the dashboard-vs-download thing again."
- `... --click "Find rows and notes" --type "Bishop"` (10.png) -- I typed
  "Bishop" in the box that literally says "Find rows and notes". Nothing
  happened. The list did not filter, no result. "That's the first thing I'd
  try, and it does nothing."
- `... --click "Notes"` (11.png) -- the Notes panel on the left rail. Both
  reminders at the top, newest first, each with its tag: "Valjean to Javert"
  and "Community 3". "OK, found both."
- `... --click "Notes" --click "Valjean to Javert"` (12.png) -- clicking the
  tag on my note opens the path's details on the right. The map itself doesn't
  visibly light up the path though -- still all orange from PageRank. "So it
  'found' it in the side panel, but on the picture I can't see where it is."

## Verdict

Did I succeed? Yes, I think so. Both reminders are saved, one on the whole
cluster and one on the whole path, and I found both in the Notes panel.

Single Ease Question: 4 out of 7. Writing the notes was easy once I knew about
N / Add note. Finding the bishop's cluster took three blind clicks because the
names are "Community 3" and get cut off, the search box ignored my word, the
note counts disagreed (4 vs 9, "1 note" vs "3"), and a "Selection cleared
(PageRank)" message appeared for something I didn't do.

Would I use this instead of my current tool? For this job -- leaving notes on
a segment rather than on one account -- maybe, because my listening suite
can't do it at all and I end up in a Google Doc. But not until the search
actually finds notes and the counts agree with each other; if the numbers
disagree on screen I stop trusting the rest.
