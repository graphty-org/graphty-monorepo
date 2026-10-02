# Session: clusters in Les Miserables -- Jordan, marketing network analyst

Task as given: "How many circles of characters does the story fall into, how big is each one,
and what is the biggest one like? Then ask for fewer, larger circles and see what that would
take."

All commands were run from design/ui/prototype. Renders are in
tmp/round-7-sessions/t03--marketing-analyst/. Every run replays from the start screen.

## Start (shots/tasks/t03/01.png)

"OK. Orange map, everything colored by PageRank. In the left list there's 'Louvain, 6 groups'.
That's clustering. I call them clusters, but fine. I'll click it."

## 02 -- click Louvain

    timeout 120 node app-b/study.mjs --try .../02.png task:t03 --click "Louvain"

A Louvain table opened at the bottom: 6 communities with sizes 25, 17, 10, 10, 9 and 6, plus
density, edges inside and edges leaving.

"Good, that was fast. Six clusters, 25 / 17 / 10 / 10 / 9 / 6, which adds up to 77, the whole
cast. But the map is still all orange, so I can't SEE the clusters. In Gephi the first thing
I do is color by community."

## 03 -- click Community 1 (the biggest)

    ... --click "Louvain" --click "Community 1"

The left list expanded the six communities and the inspector showed Community 1: "Paints 25
nodes. Covered for Color by PageRank". The table switched to all 77 nodes, not the 25.

"I wanted to see who's IN the big one, and it gave me all 77 people. And there's a 'group'
column with 2, 8, 4. Is Valjean in group 2 or in Community 1? Two numbering systems for the
same thing. That's the 'which number goes in the report' problem again. And 'covered by
PageRank' -- so the color is there but I can't see it. Weird."

## 04 -- try the Data tab

    ... --click "Louvain" --click "Community 1" --click "Data"

That opened the whole Data page (file summary: 77 nodes, 254 edges, density 0.0868), not
Community 1's members.

"Not what I meant. I meant the little Data tab next to Style. Whatever."

## 05 -- the "..." menu

    ... --click "Louvain" --click "Community 1" --click "More actions"

A menu opened, but for Community 3. It has "Select members", "Show members in table" and
"Frame members".

"That's the menu I want, 'show members in table', but it's for Community 3, not 1. Why 3?"

## 06 -- 08 -- trying to get the same menu for Community 1

    ... --click "Louvain" --click "Community 1" --click "Show members in table"
      -> nothing on screen is called "Show members in table"
    ... --click "Louvain" --click "Community 1" --click "Actions"     (also tried Menu, Options,
      "Community 1 actions" [not found], More; the renders overwrote each other)
      -> 07: opened a command search box ("Type a command or a place")
    ... --click "Louvain" --click "Community 1" --hover "Community 1" --click "More actions"
      -> 08: Community 3's menu again

"I rested my pointer on Community 1 and clicked its dots, and I got Community 3's menu again.
I give up on that."

## 09 -- 10 -- trying to make the map show clusters

    ... --click "Louvain" --click "Community 1" --hover "PageRank" --click "Hide"
      -> 09: hid Community 1 instead (tooltip "Show Community 1 / Alt-click ... show only this row")
    ... --click "Louvain" --click "Community 1" --click "Hide PageRank"
      -> 10: nothing on screen is called "Hide PageRank"

"I wanted PageRank off so the clusters show. I hid the wrong row, and the map didn't change
anyway. Two strikes, I'm done with that path. For a slide I'd need the clusters colored. That
must exist; I just couldn't find it."

## 11 -- "from Louvain" link in the inspector

    ... --click "Louvain" --click "Community 1" --click "from Louvain"

The inspector showed the Louvain run: 6 communities, no unconnected nodes, modularity 0.565
("Strong grouping: far more links fall inside the communities than between them"), a size bar
chart, and each community with its hub: Community 1, 25 characters, hub Gavroche, 16 links
inside; Community 2, 17, hub Valjean; Community 3, 10, Myriel; Community 4, 10, Fantine;
Community 5, 9, Thenardier; Community 6, 6, Gillenormand. Below that, "Made with": Method,
Weight, Higher weight, Seed, "All options...".

"THIS is the screen. Count, sizes, a hub for each cluster in plain English. 'Hub Gavroche' I
can put on a slide. 'Community 1' I can't; I'd rename it. The biggest one is 25 people around
Gavroche, but density is 0.147, and from the table it has 44 links inside and 49 going out.
So more links leave it than stay inside. It's big because it's loose. That's a mushy segment
-- in marketing terms, not a segment I'd write one message for. The 6-person one has density
1, everyone knows everyone. That's a real clique."

Aside: "Honestly, this is what Brandwatch's audience clusters should show. It gives me 'cluster
7' and no reason. Here at least I get the hub and the link counts."

## 12 -- 13 -- All options

    ... --click "from Louvain" --click "All options..."
    ... --hover "Resolution"

Options panel: Method, Weight, Higher weight, Seed 7, Resolution 1.0, Level "Final, most
merged", Stop after, Scope "Full graph", Max iterations 100, Tolerance, Optimized. Hovering
Resolution showed nothing.

"Fewer, bigger clusters... is that resolution? A Gephi tutorial said move resolution, but I
honestly don't remember which way. Lower? Higher? Nothing here tells me. And 'Level: Final,
most merged' sounds like it's ALREADY as merged as it goes. So can I get bigger ones or not?
Nothing says 'fewer groups' or 'bigger groups'. That's the word I was looking for."

## 14 -- click the resolution box

    ... --click "All options..." --click "1.0"

The panel closed. Top of the inspector: "Settings changed since the run", with Rerun and
Revert.

"Wait, I just clicked the box. What did it change it to? I can't see the number anymore. Good
that there's a Revert, though."

## 15 -- Rerun

    ... --click "1.0" --click "Rerun"

"Rerunning, cannot be stopped", with a progress bar. The table and sizes still show the old 6.

"OK, it's running, and I can see it's running. That's better than Gephi's spinning wheel. But
'cannot be stopped'? On my 80,000-node file that would scare me. And I still don't know what
I asked for or what I'll get. Nothing told me 'about 4 groups at this setting' before I
pressed it. I'm stopping here."

## Verdict

- Did I succeed? Half. I can say there are 6 clusters, sized 25, 17, 10, 10, 9 and 6. The
  biggest is 25 characters around Gavroche, and it's loose (density 0.147, more links leaving
  than inside). I could NOT find out what fewer, bigger clusters would take. I found a
  "Resolution" number with no explanation of which way to move it. I changed it without
  seeing to what, and the rerun gave me no result to look at.
- Single Ease Question: 3 out of 7. The run summary was great once I found it, through a
  small link in the corner. Everything around it fought me: the map never showed the
  clusters, the menu kept opening for the wrong community, and the table showed everyone
  instead of the members.
- Would I use it instead of my current tool? Not yet. The cluster summary (hub per cluster,
  links in versus out, the plain-English modularity line) beats Brandwatch's "cluster 7" and
  is what I'd want my notebook colleague to give me. But I couldn't color the map by cluster
  for a slide, I couldn't pull one cluster's member list, and "make fewer groups" is a raw
  algorithm knob with no hint. If "fewer / bigger groups" were a plain control with a preview
  of the count, and the clusters showed on the map, I'd try it on real data, as long as the
  "Local only" label up top means what I think it means.
