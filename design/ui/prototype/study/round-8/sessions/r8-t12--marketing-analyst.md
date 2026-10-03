# Session: Javert's profile and who he shares chapters with -- Jordan, marketing network analyst

Task as given: "You have never used this program before. You will practice on the ready-made
network of characters from the novel Les Miserables that comes with the program, not on your own
data. Go to the police inspector Javert, read what the program knows about him, and see which
characters he shares chapters with."

Start screen: shots/tasks/r8-t12/01.png. Renders: tmp/round-8-sessions/r8-t12--marketing-analyst/.
Every command was run from design/ui/prototype; `P=tmp/round-8-sessions/r8-t12--marketing-analyst`.

## Step 1 -- start screen (01.png)

Think-aloud: "Start screen. 'Files are read on this computer and never uploaded', and 'Local only'
up top -- good, that's my legal question answered before I asked it. Usage-data banner at the
bottom: no thanks. Les Miserables is right there under Samples, 77 characters."

## Step 2 -- open the sample (02.png)

    timeout 120 node app-b/study.mjs --try $P/02.png task:r8-t12 --click "No thanks" --click "Les Miserables"

"Whoa, a lot is pre-loaded. A PageRank color key top left -- fine. A long list on the left
(PageRank, Louvain, Shortest paths, Watchlist, 'For the report'...) that I did not make. Javert is
labeled right in the middle next to Valjean. I'll just click his name."

## Step 3 -- click "Javert" (03.png)

    ... --click "No thanks" --click "Les Miserables" --click "Javert"

(The click landed on a list row "Valjean to Javert", not on Javert himself.)
"That picked some 'Valjean to Javert' path thing. It says they share 17 chapters -- interesting,
but that's the pair, not him. Let me use the search box like I would for our brand handle."

## Step 4 -- search (04.png, 05.png, 06.png)

    ... --click "Find rows and notes"
    ... --click "Find rows and notes" --type "Javert"
    ... --click "Find rows and notes" --type "Javert" --key Enter

"'Find rows and notes' -- rows? Whatever, it's a search box. Typed Javert -- nothing changed, the
list just sat there (05). Pressed Enter and now I get results (06): a Node, Javert, 17 neighbors;
two path rows; Watchlist; two notes someone wrote about him. Not sure if Enter did it or it was
just slow."

## Step 5 -- pick him (07.png)

    ... --type "Javert" --key Enter --click "17 neighbors"

"Ring around him on the map, 'Javert, 17 connections' under it, and a little icon toolbar. But the
right side says 'Why this look' -- styling. I want his info. There's a Data tab."

## Step 6 -- the Data tab, first try (08.png)

    ... --click "17 neighbors" --click "Data"

(The click hit the left-rail "Data" button, not the panel's Data tab.)
"I meant the Data tab under his name. Instead the whole left side became a page about the file, and
Javert isn't selected any more. Two things called 'Data' on one screen."

## Step 7 -- the Data tab, second try (09.png, 10.png)

    ... --click "17 neighbors" --click "tab Data"            (nothing on screen is called that)
    ... --click "17 neighbors" --click "Style" --key ArrowRight

"Got it (10). Javert: PageRank 0.0303, #5 of 77; Degree 17, #4 of 77. Ranks next to the raw
numbers -- that I can put in a sentence. Betweenness 0.0543 is tucked under '2 more attributes' --
that's the 'bridge' number I actually care about and it's the hidden one. 'group 4' at the top and
'Group 4' with a green dot under Memberships -- same thing? No idea. Memberships also list the
Watchlist and 'Top 9 by degree'. One note on him."

## Step 8 -- find the people he shares chapters with (11.png - 13.png)

    ... --hover "Javert, 17 connections"     (no tooltip)
    ... --hover "Neighbors"                  (nothing called that)
    ... --hover "Select neighbors"           (nothing called that)
    ... --hover "Neighborhood"               (tooltip: "Neighborhood G")
    ... --hover "Grow selection"             (nothing called that)
    ... --click "Neighborhood"               (13.png)

"Icons only on that toolbar, so I rested on them till one said 'Neighborhood'. That opens a box:
'Neighborhood of Javert, distance 1 edge away, covers Javert and 17 neighbors.' Buttons: 'Add as
steps' -- steps of what? -- and a blue 'Filter to neighbors'. Filters are usually undoable and
there's an undo arrow. Going with the blue one."

## Step 9 -- filter (14.png)

    ... --click "Neighborhood" --click "Filter to neighbors"

"The top now says '18 of 77 nodes', and a toast says 'Added filter step: Neighbors of Javert'. But
the map looks exactly the same -- everyone is still on it. And the right side now says Valjean. I
never clicked Valjean. That is the kind of thing that makes me stop trusting a tool."

## Step 10 -- the table (15.png, 16.png)

    ... --click "Filter to neighbors" --click "Table"
    ... --click "Filter to neighbors" --click "Table" --click "Marius" --key PageDown

"A table. Header says '18 of 77 nodes', and right next to it 'Rows 1 to 77 of 77'. Which one? It's
my '4,000 mentions on the dashboard, 3,100 in the download' problem again. The table is four rows
tall, so I see Valjean 36, Gavroche 22, Marius 19, Javert 17, then it's cut off. And the floating
toolbars sit on top of the map. I clicked Marius to scroll, and (16) the filter is gone: top says
'Full graph', table says '77 nodes', Marius is now selected. So clicking a row throws my filter
away? Or the click went to the map? Can't tell. I saw Fantine, Enjolras, Courfeyrac, Bossuet
scrolling past -- but that's the whole cast now, not Javert's people. Two things changed under me
without my asking. I'm done."

Off-topic, because it's what I'd actually be thinking: "This is a nice novel, but my Brandwatch
export doesn't come with chapters. And since the Twitter API went paid I don't even get reply
networks any more -- I get whatever CSV the vendor feels like giving me."

## Outcome

- Did I succeed? Partly. I found Javert and read what it knows about him (PageRank rank, degree
  rank, betweenness, group, memberships, a note). I did NOT come away with the list of who he
  shares chapters with -- I know there are 17 of them, I know Valjean is one (17 shared chapters),
  but I never saw the 17 names together, and I'm not sure the filter I applied even did anything.
- Single Ease Question: 3 of 7.
- Would I use this instead of my current tool? Not yet. The per-character card with "#5 of 77"
  beside the raw number is better than Gephi's data lab for writing a one-line reason, and "files
  never uploaded" on the first screen saves me an email to legal. But a filter that says 18 while
  the map shows 77 and the table says 77, and a selection that jumps to someone I didn't pick, is
  exactly why I check a known account before trusting a ranking. Here I couldn't even trust the
  count. I'd go back to Gephi, where at least "filter" visibly removes things.

## Problems I hit (in my words)

1. "Filter to neighbors" said 18 of 77 but the map kept all 77 characters on screen. (sev 4)
2. After filtering, the panel switched to Valjean, whom I never picked. (sev 4)
3. Table header "18 of 77 nodes" next to "Rows 1 to 77 of 77". (sev 4)
4. Clicking a row in the table seemed to drop the filter back to "Full graph". (sev 4)
5. No plain "who is he connected to" list on Javert's own card; the neighbor list hides behind an
   icon-only button and a filter. (sev 3)
6. Two different things named "Data" on one screen (left rail and the tab on his card); I hit the
   wrong one and lost my selection. (sev 3)
7. Clicking the name "Javert" picked the "Valjean to Javert" path row instead of him. (sev 2)
8. Search showed nothing until I pressed Enter (or it was slow). (sev 2)
9. The table opens four rows tall under floating toolbars. (sev 2)
10. Betweenness -- the bridge number -- is folded away under "2 more attributes" while PageRank
    and degree are shown. (sev 2)
11. "group 4" vs "Group 4" membership -- unclear whether same thing. "Add as steps" -- meaningless
    to me. (sev 1)
