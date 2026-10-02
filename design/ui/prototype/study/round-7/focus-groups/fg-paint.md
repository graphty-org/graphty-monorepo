# Focus group: what paints the picture

Five simulated participants looked at the same screen of the clickable B skeleton: the graph
place, with the PageRank row's inspector open. On that
screen, the left list holds computed results (PageRank, Louvain, Betweenness, two shortest
paths), hand-picked node sets (Watchlist, Group 2, Group 8), a folder ("For the report") and
"Everything". The canvas legend reads "Color: PageRank, 0.0033 to 0.0754" and "Size: Degree,
square root scale (area)". The inspector says PageRank "Covers Louvain for Color". The list
footer says "1 hidden row still paints."

The group ran three rounds: first impressions; what would make you trust this picture, and what
is missing; what would make you quit or switch, and the one thing you would change.

Participants:

- **expert-emma** -- network scientist, works in notebooks (pandas, NetworkX).
- **gephi-holdout** (Mara Lindqvist) -- long-time Gephi user who finishes her figures in Inkscape.
- **marketing-analyst** (Jordan) -- social-media analyst, presents to a VP in slides.
- **genomics-cytoscape-user** -- wet-lab genomics, Cytoscape plus Illustrator, answers to a PI and reviewers.
- **bioinformatics-researcher** -- computational biologist, Cytoscape user.

All five are simulated voices from one model. Treat agreement as weaker evidence than it looks;
see "Group-think to discount" below.

## Transcript

### Round 1 -- first impressions

**expert-emma:** Fine. On the left there's a list that mixes three kinds of thing: computed results (PageRank, Louvain, Betweenness), node sets I presumably made myself (Watchlist, Group 2, Group 8), and a folder called "For the report". Then "Everything" sits at the bottom with no explanation. I can live with that. Gephi splits it into partition, ranking and filters, and I don't like that either.

What I do like is the legend over the canvas. "Color: PageRank, 0.0033 to 0.0754" and "Size: Degree, square root scale (area)" is exactly the encoding statement I'd put in a figure caption. But where does Degree come from? It isn't anywhere in the list. So something is sizing my nodes and I can't point at it.

Two lines worry me. The right panel says PageRank "Covers Louvain for Color", so my communities are computed but invisible, and the only hint is a gray sentence. And "1 hidden row still paints" sounds like a contradiction. If I hid it, why is it still on my picture? Before I believe this drawing, I need to know what's actually contributing to it.

**gephi-holdout:** Mara Lindqvist: Fine, first impressions. The left list is doing something like Gephi's Appearance panel, but without Gephi's labels. PageRank, Louvain, two shortest paths, a watchlist, a "For the report" folder and a Betweenness row with its eye crossed out are all stacked in one column. Is that a list of results or a list of colorings? I can't tell. In Gephi those are separate places: statistics on the right, partition and ranking under Appearance, filters in their own panel.

The inspector does help. "Paints 77 nodes (every node with a value)" and "Covers Louvain for Color" are both plain statements, and I'd rather read that than guess. But "covers"? I had to read it twice. I think it means PageRank won and the modularity classes are buried under it. If so, say so.

I do like that the legend is on the canvas, with numbers and a scale named "square root, area". That's my Inkscape step gone, if it survives export.

What I can't see is the order. Which row wins? Is it top or bottom? And "1 hidden row still paints" is a contradiction until someone tells me otherwise.

**marketing-analyst:** I'll be honest, my first reaction is that it's a lot of list for one picture. On the left there's PageRank, Louvain, shortest paths, a watchlist, a folder called "For the report", and something called "Everything", all in one column. Some of those are calculations and some are just groups of people I picked, and they all look the same.

Some of it is good. The little key on the map, color is PageRank and size is degree, is exactly what I've been pasting into PowerPoint by hand for years. "Local only" up top is the first thing I look for before I load customer data, so thank you. And there's a Table button at the bottom, which I'll want in about two minutes.

But it says Louvain has 6 groups, and the map is all orange. Where did my clusters go? I'd guess the clusters got wiped. Then over on the right, in small print, it says "Covers Louvain for Color". Okay, so it's hiding them? Nobody in my meeting is reading that line. If two of these are fighting over the color, I need to see that on the map or in the key, not in a side panel.

**genomics-cytoscape-user:** Okay. The left list is where everything lives, I guess. PageRank, Louvain, Shortest paths, a watchlist, a folder called "For the report". But those aren't the same kind of thing. Two are calculations, one is a set of genes I picked by hand, and one is a folder. In Cytoscape the network list, the style and the node table are separate places. Here they're all mixed into one column, and I can't tell what the order means.

The thing that bothers me most: the list says Louvain found 6 groups, but every node on the network is orange. Where are my clusters? On the right it says "Covers Louvain for Color" in small gray text. So the clusters are under there somewhere and I'd have to go hunting for them. If that's MCODE output I'd want to see it without reading the fine print.

The good part: there's a legend in the corner that says what the color and the size mean, with actual numbers. That's more than I usually get. And it isn't red-green, so my PI won't complain.

Also, "1 hidden row still paints"? I read that twice and I still don't know what it's telling me.

**bioinformatics-researcher:** Fine, I'll start, since nobody else has. The left column reads like Cytoscape's Control Panel crossed with a file browser. I can see PageRank, Louvain, Shortest paths, Watchlist and a "For the report" folder, so I take it each analysis I ran gets its own row. That part makes sense to me.

What I can't sort out is which of those rows the picture is actually showing. Every node is orange-to-brown. Louvain says it found 6 groups, but I can't see a single group color anywhere. The panel on the right says "Covers Louvain for Color", and I don't know what "covers" means. Did PageRank overwrite my partition? Is Louvain still there underneath it?

Below that it says "1 hidden row still paints." If it's hidden, why is it painting? That sentence alone would make me open the node table and check the colors by hand.

The legend is good: the range, 0.0033 to 0.0754, plus a square-root size scale. I'd keep that. But the sidebar mixes two kinds of thing, results I computed and lists I picked by hand, and they all have the same icons and the same check circles.

### Round 2 -- trust, and what is missing

**expert-emma:** Mara is right that the real gap is the order. "Covers" tells me who won, but not why. Is that because PageRank is higher in the list, newer, or set by some rule I'd have to find? I can't trust a figure if I can't say why each node is that color. I'd want every visual channel (color, size, label) listed with exactly one source each, and that includes Degree, which still isn't in the list.

I half disagree with the marketing analyst, though. I don't want Louvain shouting from the map while PageRank holds the color. One encoding per channel is correct. What isn't fine is that the losing result is invisible. Put it in the legend as one line: "Louvain (6 groups) -- not shown, color taken by PageRank."

What's missing for me is the record. In a notebook I can reread the cell. Here I want to click a node and get its PageRank value, its community and its degree, plus which result set each part of how it looks. Without that I'll export and recheck every value in pandas, which makes the app pointless.

**gephi-holdout:** Mara Lindqvist: Trust first, then. I'm with Emma on Degree. If something is sizing my nodes, it needs a row I can point at, otherwise the figure caption is lying by omission. To the marketing analyst: I don't think anything got wiped. "Covers" reads to me like Gephi applying a ranking after a partition, where the last one you applied wins. But Gephi at least makes it obvious that you're the one who clicked Apply. Here the winner is decided somewhere I can't see.

Here's how I actually work. I run modularity, color by class, export, then rank by degree for size and export again. Each figure is one deliberate encoding. If this list is really a stack, then I need the order to be visible and draggable, and I need the loser to show up in the legend as "Louvain, hidden under PageRank". It shouldn't be a gray sentence in a side panel.

And I'm not trusting "hidden still paints" until someone explains it. In Gephi, hidden means it's not in the export, full stop. If that isn't true here, my reviewers will catch it before I do.

**marketing-analyst:** Jordan: I'm with Emma on Degree. If something is sizing my dots, I want to be able to point at it. Otherwise my VP asks "why is that one big?" and I'm stuck saying "the tool did it." That's how I lose the room.

Trust, for me, works the same as always. I find our brand handle. If it's big and dark where I expect it, I believe the rest. If not, I don't. Nothing here lets me click a dot and see "big because of this, dark because of that." I'd need that before this goes in a deck.

Mara asked which row wins, top or bottom. Honestly, I don't care about the order. I care that the key on the map tells the truth. If my clusters are hiding under the influence score, put "Clusters: hidden" right in that key. I won't go hunting in the right panel.

What's missing is a way to save this exact view as a slide, key and all. That's what I'd actually do with it. Last quarter the VP read the first slide and nothing else, so one picture is all I get.

**genomics-cytoscape-user:** Mara's right that I can't see which row wins, but I'd go further than that. I can't trust this picture until I can point at every color and size on it and say where it came from. Emma already caught it: Degree is sizing my nodes and it's not in the list. That's the same feeling I had in March, when my fold-change column was "there" and turned out to be empty. Something is affecting my figure that I didn't put there.

In Cytoscape the style is one place. I open it and I can see exactly what's mapped to fill color and what's mapped to size. Here I'd have to piece that together from a gray sentence on the right and a key on the canvas.

The analyst said nobody in her meeting reads "Covers Louvain for Color." For me it's reviewer 2. If my clusters are on the network, I need to see them. If they're not, the key should say so.

And "1 hidden row still paints." I still don't know what that means, and nobody here has explained it either.

**bioinformatics-researcher:** Emma's right about Degree, and I'll go further. Something is sizing my nodes and nothing in that list owns it. That's exactly the "colors I didn't choose" problem. If I can't click the thing that's sizing the nodes and see the parameters, it doesn't go in a figure.

Mara asked which row wins. For me that's the whole question. In Cytoscape there's one style per view. I know it overwrites, and I keep the clusters in a column I can check. Here I'd want each row to say plainly which channel it owns right now: color, size or nothing. A note saying Louvain is buried under something else isn't enough.

I disagree with the marketing analyst on one thing. I don't want the clusters drawn on top of PageRank automatically. Two encodings on one channel is how hairball figures lie. I want to pick which one owns the color, and I want the loser to say "not shown" in the legend.

And nobody has said this yet. Can I get the Louvain membership out as a table column, even while it's hidden? If the partition only exists as a color, it's a toy.

### Round 3 -- quit, switch, and the one change

**expert-emma:** Here is what would make me quit. I click a node, check its PageRank against my notebook, and can't tell whether the color I'm seeing comes from PageRank, from Louvain, or from the row that is "hidden" but "still paints". If I can't say why each node looks the way it does, then the figure isn't a finding, it's decoration. Opacity is the one thing I won't tolerate.

The one change I'd make is a per-channel statement, in the legend and the inspector both, that says exactly what owns each channel: "Color: PageRank. Size: Degree. Louvain: computed, not drawn." It should go in the exported image as well, because Jordan is right that the slide is all anyone reads. A gray sentence in a side panel doesn't count.

I agree with the bioinformatics researcher that I should choose which result owns the color, and I don't want it decided by some ordering rule I'd have to reverse-engineer. Mara wants drag-to-reorder. I'd accept that, but only if the drawing tells me the outcome. I shouldn't have to infer it from where a row sits.

What would make me switch is all of that, plus Louvain membership exportable as a column whether or not it's drawn. With both, I'd have my figure faster than in Gephi.

**gephi-holdout:** Mara Lindqvist: Quit, first. I quit the day a reviewer finds a color in my exported figure that my legend doesn't explain. That's what "1 hidden row still paints" sounds like to me. If hidden doesn't mean gone from the export, I'm back in Gephi by Friday, with its bad label placement and all.

What would make me switch is an honest legend. The bioinformatics researcher asked for each row to say which channel it owns, and I agree. Go further and make the legend the place where every channel names its one source: color is PageRank, size is Degree, and Louvain is listed as "not shown, color taken by PageRank." If that legend exports as vector text, I've lost my Inkscape step and I'll forgive a lot.

The analyst doesn't care about order, but I do, because order is my method. The one thing I'd change is to show which row wins, and to make me the one who decides that. Drag a row up and it takes the color. That's Gephi's Apply button, except I can see it.

**marketing-analyst:** Jordan: Here's what would make me quit. I put this map in front of my VP, she asks why the clusters aren't there, and I can't answer. Then it's back to Gephi and a hand-made key in PowerPoint, which is slow, but at least I know what's on the slide.

The one thing I'd change is that key on the map. It should list everything that's touching the picture: color, size, and anything that lost. So it would read something like "Clusters: found 6, not shown." That's where my eyes go. They don't go to the right panel, and they definitely don't go to the gray text.

The bioinformatics researcher is right, and I'll back down on one point. I don't need clusters and influence fighting on the same dots. Pick one. Just tell me which one was picked, in the key, in words my VP can read.

Emma's click-a-dot record would have me switching. I'd click our brand handle and it would say "big because of degree, dark because of influence score." That's the whole conversation with my VP, done in ten seconds.

And "hidden still paints"? If that's true, I'm out. In my world, hidden means it's not on the slide.

**genomics-cytoscape-user:** What would make me quit is simple. I export a figure, reviewer 2 asks why node X is dark, and I can't answer. I've had that happen in Cytoscape and it took a week to untangle. If this app makes it more likely, I'm back to Cytoscape plus Illustrator. Ugly, but I know what's mapped to what.

What would make me switch is the opposite. I click a gene, say TP53, and it tells me: fill from PageRank, size from Degree, and Louvain cluster 3 present but not shown. I agree with the bioinformatics researcher that the partition has to be a real table column even when it's hidden. My PI will ask me to filter on it.

I disagree with Jordan about order. I do care about it, because the order is the reason.

If I could change one thing, every color and size on the network would trace back to one row I can click, Degree included. Until then "1 hidden row still paints" sounds like a bug. I'd go and check it in the node table, and then I wouldn't be using this tool.

**bioinformatics-researcher:** Here's what would make me quit: a reviewer asks why one gene is dark and large, and I can't answer without leaving the app. Jordan said the same thing about her VP, and it's the same failure. If I have to export to Cytoscape or pandas to rebuild the reasoning, I'll just stay in Cytoscape. It already does the figure, and I trust its style panel even when it's ugly.

What would make me switch is clicking a node and getting a record: its PageRank value, its Louvain community and its degree, plus which row is setting the color and which is setting the size. Emma asked for this too. I'd add that the record has to show the values from rows that aren't currently showing.

The one thing I'd change: every channel on the drawing gets exactly one named owner I can see, and that includes Degree. Mara wants the order draggable. I don't care about dragging. I care that the legend lists the loser as "Louvain: not shown." And "hidden still paints" either goes away or gets explained in plain words. Until then I'm checking every color by hand.

## The finding nobody in the room made

The two loudest complaints are the same defect. The row that sizes the nodes by Degree IS the
"1 hidden row" that "still paints": in the skeleton, Degree is hidden from the left list, not
from the drawing, and the footer link "Show hidden rows" would reveal it. Not one participant
connected the footer sentence to the missing Degree row, in three rounds. So the screen does not
fail by having an unowned channel; it fails by using "hidden" to mean "hidden from this list"
when every participant reads "hidden" as "not on the picture" (and two, Mara and Jordan, as "not
in the export"). The fix is in the wording and in what "hide" does, not in adding a Degree row.

## Themes

Counts are "raised independently in round 1" / "voiced by the end". Severity is Nielsen 0-4.
"Independent" matters here because the group converged hard after round 1 (see below).

### 1. A hidden row that still paints reads as a contradiction or a bug -- severity 4

- Independent: Emma, Mara, genomics, bioinformatics (4 of 5). Jordan joined in round 3.
- By the end: 5 of 5, and 3 named it a quit trigger (Mara, Jordan, genomics).
- Agreement: total. Every participant reads "hidden" as gone from the drawing; Mara and Jordan
  extend it to gone from the export. Bioinformatics says the sentence alone would send them to
  check every color by hand.
- Dissent: none.
- Note: see the finding above. This and theme 2 are one defect.

### 2. Something sizes the nodes and no row owns it (Degree) -- severity 4

- Independent: Emma only. The others adopted it in round 2, each opening with "Emma is right".
- By the end: 5 of 5.
- Agreement: every visual channel must trace to one row a person can click, and see the
  parameters of (bioinformatics). Genomics ties it to a past incident (an empty column that
  looked filled), so it carries real weight for that persona.
- Dissent: none.
- Discount: one independent voice. But the defect is observable on the screen (the legend names
  Degree, the list does not show it), so it does not depend on the group's agreement.

### 3. The result that lost a channel is effectively invisible -- severity 3

- Independent: all 5. Each saw "Louvain found 6 groups", an all-orange map, and "Covers Louvain
  for Color" in small gray text, and each struggled with it: Jordan guessed the clusters were
  wiped; Mara and bioinformatics could not parse "covers"; genomics would "have to go hunting".
- Agreement: the losing result belongs in the canvas legend, not the inspector. Wording proposed
  by Emma and then repeated by everyone: "Louvain (6 groups) -- not shown, color taken by
  PageRank."
- Dissent: whether the map should show both. Jordan (round 1) and genomics (round 1) wanted to
  see the clusters; Emma and bioinformatics held one source per channel; Jordan conceded in
  round 3, genomics moved to "if not shown, the key should say so".
- "Covers" is the wrong word: 3 of 5 said so outright (Emma, Mara, bioinformatics).

### 4. Which row wins, and who decides -- severity 3; how to fix it is contested

- Independent: Mara (top or bottom?), genomics (cannot tell what the order means),
  bioinformatics (which rows the picture is showing). 3 of 5.
- Split by the end:
  - Order is the method, make it visible and draggable: Mara, genomics.
  - Do not care about order, care that the legend tells the truth: Jordan, bioinformatics.
  - Accept dragging only if the drawing states the outcome: Emma.
- Common ground across all 5: the owner of each channel must be stated in words, wherever the
  rule lives. A drag-to-reorder alone did not satisfy three of them.
- Emma, bioinformatics and Mara also want to be the one who chooses the color owner, not a rule
  they must reverse-engineer.

### 5. A per-node record: values plus which row sets each channel -- severity 3 (missing)

- First voiced: Emma and Jordan, both in round 2, apparently independently (Emma from a
  notebook habit, Jordan from checking the brand handle). Genomics and bioinformatics adopted it
  in round 3. 4 of 5; Mara did not mention it.
- Shape asked for: click a node, see its PageRank, Louvain community and degree, and "fill from
  PageRank, size from Degree, Louvain cluster 3 present but not shown". Bioinformatics adds that
  values from rows not currently drawn must appear too.
- To check against the skeleton: the node inspector state may already carry part of this; the
  group never opened it, so this is unmet discoverability as much as a missing feature.

### 6. A result must exist as data, not only as color -- severity 3

- Bioinformatics (round 2, unprompted), then genomics and Emma (round 3). 3 of 5.
- Louvain membership must be a table column, and exportable, whether or not it is drawn.
  Genomics: "my PI will ask me to filter on it". Bioinformatics: "if the partition only exists
  as a color, it's a toy."

### 7. The legend has to leave the app with the picture -- severity 2

- Mara (round 1: "if it survives export"; round 3: as vector text), Jordan (round 2: save the
  view as a slide, key and all), Emma (round 3: the channel statement in the exported image).
  3 of 5.
- Tied to theme 1: the export must not contain anything the legend does not explain.

### 8. The left list mixes kinds of thing -- severity 2

- Independent: all 5 in round 1 (computed results, hand-picked sets, a folder, "Everything").
- Agreement on the observation; disagreement on how much it matters. Emma "can live with it" and
  dislikes Gephi's split too. Mara and genomics measure it against tools that separate the
  places. Bioinformatics reads it as natural ("each analysis I ran gets its own row") but
  objects that both kinds share the same icons and check circles.
- Not pursued in rounds 2 and 3; the paint question displaced it. "Everything" went unexplained
  (Emma, Jordan).

### What worked

- The canvas legend with real numbers and a named scale: praised independently by all 5 in
  round 1. The strongest positive in the session; every proposed fix builds on it.
- Plain inspector statements ("Paints 77 nodes (every node with a value)"): Mara.
- "Local only" before loading customer data, and the Table button: Jordan.
- A palette that is not red-green: genomics.

## Group-think to discount

- **Degree pile-on.** Four of the five opened round 2 with "Emma is right about Degree". Count it
  as one independent observation, confirmed by the screen, not as five.
- **Converged legend wording.** "Louvain: not shown, color taken by PageRank" was Emma's phrase;
  by round 3 everyone repeated it nearly verbatim. The underlying need (put the loser in the key)
  was independent for Jordan and genomics; the exact wording is not validated.
- **Jordan's concession on showing clusters.** She backed down after two expert voices argued
  against her. The need under her round-1 complaint -- a slide reader must see that clusters
  exist -- is still valid and is what the legend line answers. Do not read the concession as
  evidence that non-expert readers do not want group color.
- **The shared quit story.** Round 3's prompt invited a quit scenario, and four of five gave the
  same one (a reviewer or VP asks why a node looks that way). It reflects the prompt as much as
  the personas; trust it as one strong theme, not four.
- **Simulated-voice caveat.** All five are one model. The cast skews toward researchers who
  publish figures (four of five); only Jordan stands for a reader-first audience, and nobody
  stands for a casual explorer who would never open a legend. A "Louvain is hidden" line may be
  noise for that user.
- **Mock fidelity.** The group judged a static moment. "Covers" and the footer sentence were read
  at rest; no one clicked "Show hidden rows", the eye toggle, or a node. Some confusion here may
  dissolve one click later -- which is a finding about first impressions, not proof the flow
  fails. Run themes 1 and 5 as tasks (find what sizes the nodes; explain why one node is dark)
  before changing structure.
