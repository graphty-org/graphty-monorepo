# Session: t03, Expert Emma (network scientist)

Task as given: "How many circles of characters does the story fall into, how big is each one,
and what is the biggest one like? Then ask for fewer, larger circles and see what that would
take. The data on screen is a sample: characters of the novel Les Miserables, linked when they
appear in the same chapter."

Renders are in design/ui/prototype/tmp/round-7-sessions/t03--expert-emma/. Every command was run
from design/ui/prototype with the prefix
`timeout 120 node app-b/study.mjs --try <dir>/NN.png task:t03`, followed by the steps listed.

## Think-aloud

**01 (start screen, shots/tasks/t03/01.png).** "Circles" is the moderator's word for
communities. The sidebar already has a Louvain row with "6 groups". The picture is colored by
PageRank, not by community, so the picture tells me nothing about the groups. Fine, I don't
read groups off a force layout anyway.

**02** -- `--click "Louvain"`. Bottom table switched to a Louvain tab: 6 communities with size,
density, edges inside, edges leaving. Sizes 25, 17, 10, 10, 9, 6; that sums to 77, which is the
node count. Good. The biggest has 44 edges inside and 49 leaving. That is a weak community, more
of a leftover bin. No Q, no resolution, no seed on this screen yet.

**03** -- `--click "Louvain" --click "Community 1"`. Right panel shows Community 1 (25 nodes,
color E69F00) but says it is "Covered for Color by PageRank" -- so the community colors are
painted underneath and I can't see them. The table jumped to all 77 nodes, not the 25 in this
community. The "group" column there is the dataset's own group attribute, not the Louvain
label, which is easy to confuse. I still don't know who is in Community 1.

**04** -- `--click "Louvain" --click "Community 1" --click "Data"`. Meant the right panel's Data
tab; got the left Data section instead. Useful anyway: 77 nodes, 254 edges, undirected, weight
"value, stronger", density 0.0868, 1 connected component, degree distribution plot (log-log CCDF,
nice). Louvain listed as a result column.

**05** -- `... --click "from Louvain"`. This is the page I wanted. Modularity 0.565, 6
communities, no unconnected nodes, size bars, each community's hub: Community 1 hub Gavroche,
16 links inside. "Made with": Louvain, weight value, stronger, seed 7. I checked density:
44 / (25*24/2) = 0.147, matches the table. So: 6 communities; biggest is 25 characters around
Gavroche, sparse (density 0.147) and leaking more edges out (49) than it keeps (44).

**06** -- `... --click "All options..."`. Full parameter list: resolution 1.0, level "Final,
most merged", max iterations 100, tolerance 1e-6, seed 7. Good that it's all visible. But
nothing says which resolution convention this is. In the standard one, gamma below 1 gives
fewer, larger communities. Gephi had it inverted. I need to know.

**07** -- `... --hover "Resolution"`. No tooltip. No note, no formula, no link to docs.

**08** -- `... --click "1.0"`. I clicked the value to edit it. The options box closed and the
panel now says "Settings changed since the run" with Rerun / Revert. I did not type anything.
What changed? To what? It doesn't say. That makes me nervous.

**09** -- `... --click "1.0" --click "Rerun"`. "Rerunning, cannot be stopped." On 77 nodes Louvain
is milliseconds; a progress bar is theatre here, and "cannot be stopped" would worry me on a big
graph. Old numbers still shown.

**10** -- `... --click "Rerun" --click "Style"`. Still "Rerunning". Never finished. Style tab shows
Louvain paints 77 nodes with "Eight distinct" colors, yet the picture is still PageRank orange.

**11** -- `--click "Analyze"`. Trying another route: the Analyze palette. Search box, Recent:
Louvain, PageRank, Shortest path. Fine.

**12** -- `--click "Analyze" --click "Which nodes form densely connected groups."` Louvain form:
weight, "Higher means Stronger/Farther/Capacity", resolution 1.0, "Under a second", buttons
"Run as copy" and "Update Louvain row". Run as copy is what I want: keep gamma 1 to compare.
Still no word on which way resolution goes. I'll assume standard and go to 0.5.

**13** -- `... --click "1.0" --key End --key Backspace x3 --key 0 --key . --key 5`. "Nothing on
screen is called 1.0" -- the field isn't clickable by its value here.

**14** -- `... --click "Resolution" --key End --key Backspace x3 --key 0 --key . --key 5`. Field
now reads 0.5.

**15** -- `... --click "Run as copy"`. A note: "Would add Louvain as a copy at the top of the list,
running". Nothing else happens. No new row, no result.

**16** -- `... --click "Update Louvain row"`. Back on the Louvain page: still 6 communities, Q
0.565. No running bar, no "settings changed" note.

**17** -- `... --click "Update Louvain row" --click "All options..."`. Resolution: 1.0. My 0.5 was
discarded silently. And "Level: Final, most merged" means this is already Louvain's coarsest
level, so resolution is the only lever for fewer, larger groups, and I could not get it to run.
I stop here.

## Outcome

- First half: yes. 6 communities of 25, 17, 10, 10, 9 and 6 characters, Q = 0.565 (Louvain,
  weighted by "value", seed 7, resolution 1.0). The biggest is 25 characters with Gavroche as the
  hub; it is loose (density 0.147) and has more edges leaving (49) than inside (44). I never saw
  the member list of that community, only its hub.
- Second half: no. I found where the resolution is and typed 0.5, but no route produced a new
  partition. One path rewound my value to 1.0 without saying so; another sat on "Rerunning,
  cannot be stopped" forever; "Run as copy" only said it would. I never learned whether lowering
  gamma makes fewer groups in this tool, because nothing says which convention it uses.

Succeeded? Partly. The counting and sizing, yes. The "fewer, larger" half, no.

Single Ease Question: 3 of 7.

Would I use this instead of my current tool? Not for this. In networkx this is two lines:
`louvain_communities(G, weight="value", resolution=0.5, seed=7)` and I'd have the sizes and the
members. What I did like: every parameter including the seed is shown after the run, Q is right
there, the size bars and per-community density and edges-leaving are exactly what I would
compute myself, and "Run as copy" is the right idea for comparing two resolutions. If the copy
actually ran, the resolution field said which convention it follows, and I could see the members
of a community in one click, this would be a decent hand-off view for a non-coder.

## Problems seen

1. Clicking the resolution value in "All options" marks the run as changed without any visible
   edit, and doesn't show the new value (render 08).
2. "Update Louvain row" silently discards the typed resolution (renders 16, 17).
3. Rerun never completes and says "cannot be stopped" (renders 09, 10).
4. Resolution has no explanation of direction or convention, no tooltip (render 07).
5. Selecting a community does not list its members; the table switches to all 77 nodes (render 03).
6. Community colors are covered by the PageRank layer, so the picture never shows the groups
   unless you know to hide PageRank (renders 03, 10).
7. Two different "Data" targets (left nav and right-panel tab) with the same name (render 04).
