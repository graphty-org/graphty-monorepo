# Session: show every character's name -- Chris, ML engineer (recommendation systems)

Task as given: "You have never used this program before. You will practice on the ready-made
network of characters from the novel Les Miserables that comes with the program, not on your own
data. Right now only a few characters have their names written on the drawing. Get every
character's name written next to its dot."

Outcome: gave up. Labels stayed on about 15 of 77 nodes.

All commands were run from design/ui/prototype. `S` below stands for
`timeout 120 node app-b/study.mjs --try tmp/round-8-sessions/r8-t10--ml-engineer-recsys/NN.png task:r8-t10`,
and every run starts with `--click "No thanks" --click "Les Miserables"` (written as `...`).

## Think-aloud

**01 (start screen).** Start page, samples on the right. I'd normally drag my own edge list in,
but fine, moderator says sample. "Local only" and "never uploaded" in the corner -- good, that
is the first thing my privacy review would ask. Dismissing the usage-data banner.

**02** `S --click "No thanks" --click "Les Miserables"`
Opens straight into a graph with a lot already on it: PageRank coloring, Louvain, shortest
paths, a watchlist. 77 nodes, maybe 15 have names. On the left there's a row "Labels show...
1 node". That's the obvious thing to poke.

**03** `S ... --click "Labels show"`
Toast: "Labels shown anyway (this file): Valjean. Opens in the inspector (not available yet)."
So that row is a list of nodes forced to show a label. It's one node. The others that are
labeled must be some automatic thing. "Not available yet" -- okay, can't edit it.

**04** `S ... --click "Everything"`
"Everything -- Built-in row. Paints 77 nodes, 254 edges." Good, a denominator. It has a Label
section with a plus. This looks like the base style for all nodes, so a label here should hit
all 77.

**05** `S ... --click "Everything" --click "Label"`
Nothing. Panel unchanged.

**06/07** `S ... --click "Everything" --hover "Add label"` -> nothing on screen is called that.
`--hover "Label"` -> no tooltip. `--click "+"` -> nothing called "+". The plus next to Label is
either dead or I can't hit it. 30 seconds gone, switching to keyboard.

**08** `S ... --key Control+k`
Command palette. Finally something that feels like VS Code. Recent, Go to, etc.

**09** `S ... --key Control+k --key l --key a --key b --key e --key l`
One hit: "Add label line -- Attribute menu > Add label line". Not sure what a "label line" is,
but it's the only label command.

**10** `... --key Enter`
It threw me into a completely different project, "IT estate, March 2026", 300 hosts, with an
attribute menu open on vuln_count_critical_unremediated_over_30_days. I never opened that. If
this happened with real data I would wonder what else it was silently doing. It did teach me
where the command lives though: Data, an attribute, its menu, "Add label line".

**11** `S ... --click "Data"`
Back in Les Mis, Data rail. Attributes: label (in use as "Name, Label"), group, betweenness,
degree. So the name column is ALREADY the label. The text is there; something is hiding most of
it. (Two controls are called Data; the rail one got clicked.)

**12** `S ... --click "Data" --click "label"`
label: Category, 77 of 77 nodes have a value, 77 distinct, in use as Name, Label. Every node has
a name. Nothing here says why only 15 are drawn. No "visibility" or "density" anywhere.

**13/14** `S ... --click "Data" --click "label" --hover "More"` -> "More actions Shift+F10".
`--click "More actions"` -> menu: Add label line, Show as groups, Place by (disabled), Filter
to..., Select where label is..., Read as..., Edit on the Data page, Show in table.

**15** `... --click "Add label line"`
Toast: "Add label line: label (not available yet)". Second dead end.

**16** Hovered names to find toolbar items. "Canvas menu": nothing. "Labels": the tooltip on the
row says "Labels shown anyway (this file)". "View": exists. "Display": nothing.

**17** `S ... --click "View"`
Camera menu: Fit, Frame selection, Front/Side/Top, saved views, Switch to 2D, VR/AR. No labels.

**18** `S ... --click "Labels show" --click "More actions"`
The "..." on that row is not called More actions; couldn't open it.

**19** `S ... --key Control+k --key n --key a --key m --key e`
Only "Settings: General" (it matches "Your name") and "Find 'name'".

**20/21** `... --key Enter` then `--click "Performance"`
Settings. General is my name, theme, number format. It mentions "the graph's Canvas section".
Performance is actually good: "Idle. This graph (77 nodes) is below the threshold, so runs use
the CPU", limits "Less detail above 10,000 nodes". So 77 nodes is not over any culling
threshold, which makes the hidden labels stranger. No label setting.

**22** `S ... --click "Co-appearanc" --click "Style"`
Clicking the graph name opens a dropdown (Compare graphs, New graph from...) that covers the
inspector; Style click timed out.

**23** `S ... --click "Co-appearanc" --key Escape --click "Style"`
Escape put the inspector back on PageRank. Style there is PageRank's style.

**24** `S ... --key Control+k --key Escape --click "Style"` -- same, PageRank.

**25/26** Palette "canvas": only "Hide on canvas" and "Settings: Accessibility and input".
While the palette is open the right side shows the graph (Co-appearances, Style / Layout /
Data), but I can't click it -- the palette blocks it. As soon as the palette closes, it goes
back to PageRank. I never found a way to get the graph's own Style tab, which is where I now
suspect the label switch lives.

**27/28** Palette "all": "Select all visible Ctrl+A". Thought: select all, then "show label"
on the selection, the way Valjean got pinned.
`... --key Control+k --key a --key l --key l --key ArrowDown x3 --key Enter`
Opened the "Selection" row's style (color FFD700, size 1.45, opacity 40). No nodes visibly
selected, no label action.

**29** Hovered the remaining toolbar icons: "Legend L", "Analyze Shift+A". Nothing for labels.

Stopping. That's well past ten minutes for "show the names", on a 77-node graph.

## Verdict

- **Succeeded?** No. Still about 15 of 77 names on screen.
- **Single Ease Question:** 2 out of 7.
- **Would I use this instead of my current tool?** Not on this evidence. In networkx it's
  `nx.draw(G, with_labels=True)` -- one argument. Here the data clearly knows every name (label
  column, 77 of 77 filled, in use as Label), but nothing tells me why only some are drawn or
  where the switch is. Two of the three things that looked like the answer said "not available
  yet", the plus next to Label on the Everything row did nothing, and the command palette
  dropped me into a different project. Things I did like: "Local only" up front, the node and
  edge counts everywhere, and the Performance page that tells me CPU vs GPU and the threshold in
  plain numbers. The palette is the right idea for someone like me. But if I can't turn on
  labels I'm not going to trust it with an ego graph of a user and their candidates, where the
  ids ARE the point.

## Problems seen

1. Only some labels are drawn and nothing on screen says why (no "showing 15 of 77 labels",
   no reason, no link to the setting). Severity: high.
2. The plus next to "Label" on the Everything row did nothing when clicked and has no tooltip.
   Severity: high -- it was the most natural route.
3. The command palette's "Add label line" result jumped into a different project (IT estate)
   with an unrelated attribute's menu open. Severity: high -- leaves the user's data.
4. "Add label line" and the "Labels shown anyway" row both end in "not available yet".
   Severity: medium.
5. I could not get the graph's own inspector (Style tab) to stay up: clicking the graph name
   opens a dropdown, Escape returns to PageRank, the palette blocks clicks. Severity: medium.
6. Searching the palette for "label", "name", "canvas" or "all" never offered a "show all
   labels" or "label density" command. Severity: medium.
