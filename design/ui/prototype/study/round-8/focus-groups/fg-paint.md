# Focus group: what paints the picture

Six simulated participants looked at the same screen of the clickable B skeleton: the graph
place on the Les Miserables co-appearance graph (77 nodes), with the PageRank row's inspector
open. On that screen the left list holds Selection, Notes, Labels, the runs (PageRank, Louvain
with 6 groups, Shortest paths, Density, Link prediction), a hand-picked set (Watchlist), a folder
("For the report") and "Everything" at the bottom. The canvas is orange to brown, and its legend
reads "Color: PageRank, 0.00330 to 0.0754". The right inspector has Style and Data tabs; the Style
tab shows Fill (Color, "Orange to brown"), Shape, Effects, Label and Tooltip, and says "Paints 77
nodes (every node with a value)" and "Covers Louvain for Color". The list footer says "1 row not
listed still paints." The table dock sits at the bottom ("Columns: 9 of 9"), with a floating
toolbar of icon buttons.

The group ran three rounds: first impressions; what would make you trust this picture, and what
is missing; what would make you quit or switch, and the one thing you would change.

Participants:

- **genomics-cytoscape-user** (Maren) -- wet-lab genomics; Cytoscape plus Illustrator; answers to a
  PI and to reviewers.
- **gephi-holdout** (Mara) -- long-time Gephi user who teaches with it and finishes figures in
  Inkscape.
- **marketing-analyst** (Jordan) -- social-media analyst; presents maps to a VP in slides.
- **cytoscape-holdout** (Renata) -- Cytoscape trainer and consultant; keeps about forty named
  styles and reuses them across client networks.
- **explorer-elena** (Elena) -- business user from dashboards and slide tools; not a network
  specialist.
- **gene-ontology-cytoscape-user** (Joaquin) -- builds Gene Ontology subgraphs with typed edges
  (is_a, part_of, regulates) for papers.

All six are simulated voices from one model. Agreement is weaker evidence than it looks; see
"Group-think to discount" at the end.

## Transcript

### Round 1 -- first impressions

**genomics-cytoscape-user:** First impression: there's way too much on the left. "Selection, Notes, Labels show..., PageRank, Louvain, Shortest paths, Density, Link prediction, Watchlist, For the report, Everything." Is that a list of results, of styles, or of things I saved? In Cytoscape those are three separate places. Results go in the node table, the style goes in the Style tab, and my subnetworks go in the Network panel. Here they're all mixed into one column, and I can't tell which rows are actually painting my network.

The right panel is more familiar. "Fill, Color, Orange to brown" reads like a style tab. And I do like "Paints 77 nodes (every node with a value)", because that's a count I can check.

Two things bother me. The canvas is orange-on-orange, so did I choose that or did the app? And there's a little cube icon in the bottom toolbar. Please tell me this doesn't open in 3D.

Also, "1 row not listed still paints." What row? If something is coloring my network and I can't see it in the list, that's my legend-is-wrong problem all over again. Where's the legend that goes into the PDF?

**gephi-holdout:** Mara (the Gephi holdout): So the left column is everything at once. Selection, Notes, Labels, PageRank, Louvain, Shortest paths, Density, Link prediction and a folder called "For the report" all sit in one list, as if they were the same kind of thing. In Gephi, statistics live in the Statistics panel and appearance lives in Appearance. Here a result and its paint look like one row. Is "Density" a coloring? It has no swatch. Is "Louvain" my modularity class or a palette? I can't tell from the list.

Two things I like. "Full graph" sits at the top, so a statistic tells me what it ran on, and that's my first test. "Local only" tells me my data stays put. Undo and redo are visible too, and I'll press Cmd+Z the moment I recolor something.

What I'd ignore is the Assistant button and that cube, which I assume means 3D. "Covers Louvain for Color" does tell me PageRank won the color, but I had to read the side panel to learn that. The legend card is the first thing in years that might keep me out of Inkscape. The Table tab is tucked away at the bottom. Fine, but it should be one click away.

**marketing-analyst:** Okay, first impression: this is a lot of rows. The left list mixes my results ("PageRank", "Louvain 6 groups") with Selection, Notes, Labels and some "For the report" folder. I can't tell if that list holds my analyses or my layers. Probably both? "1 row not listed still paints" -- what does that even mean? Something is coloring my map and it's hidden from me? That's exactly the "which number goes in the report" problem I get from Brandwatch.

The good part: the "Color: PageRank, 0.0033 to 0.0754" box on the map. That's a legend, finally. And the right panel saying "Paints 77 nodes" is helpful.

But orange to brown on a projector, printed in grayscale? Everyone just looks orange. And I'd call PageRank an influence score anyway, so tell me what it means.

Where's the table? Oh, "Table" is down at the bottom. Fine, I found it. Those little icons in the floating bar at the bottom, though? No clue what they do. I've clicked four of them already.

**cytoscape-holdout:** Renata: First thing I looked for was File, then Import. What I found was a hamburger and a dataset name, so I'm already guessing. The left rail says Graph, Data, Views, Notes, Assistant. Fine. But the middle list mixes everything together: a selection, notes, labels, PageRank, Louvain, shortest paths, a watchlist, a folder "For the report", and something called "Everything" at the bottom. So is this my Style panel, my Network panel or my filter list? In Cytoscape those are three different things, and I teach them as three different things on day one.

When I click PageRank, the right panel shows Style and Data tabs with Fill, Shape, Label and Tooltip. That part reads like a Style with mappings, and "Paints 77 nodes" is the kind of count I want. I'll credit that. But I can't tell whether that row is the result itself or a mapping someone made from it for me, and that matters. Who decided PageRank is orange to brown? I didn't.

The Table is down at the bottom with "Columns: 9 of 9". Good, I can see it. So where's the session? If I close this tab, what do I get back?

**explorer-elena:** OK, so the first thing I see is a big list down the left. Some of the words in it I know (Notes, Selection) and some I'd never click: PageRank, Louvain, Betweenness, Link prediction. I honestly can't tell which of those are things I did and which are just options waiting for me. Is "Shortest paths" something I ran, or a menu?

The picture in the middle is fine. It's orange dots, and the "Color: PageRank" box at the top tells me the color means something, but "0.00330 to 0.0754"... is that a lot? I'd probably assume the darker ones are the important customers and stop there.

The right side looks like the settings panel in Slides, where you pick a color and that's it. I get that part. But "Shape", "Effects", "Label" and "Tooltip" with plus signs all look the same to me, so I wouldn't know which one makes things bigger.

Then there's another row of buttons at the bottom with little icons and no words. I'd skip those.

So my honest first take is that there are three places to look and I don't know which one is "mine."

**gene-ontology-cytoscape-user:** Joaquin here. The left list is the first thing I tried to read, and it mixes too many different kinds of thing in one column: Selection, Notes, Labels, PageRank, Louvain, Shortest paths, Watchlist, a folder called "For the report", and something called "Everything". Some rows are results, some are saved selections, and some I can't place at all. They're all at the same level, so I can't tell which of them actually paints the drawing.

In Cytoscape I know where things are. The network is in one place, the Style panel in another, and the Node Table under both. This app has a table along the bottom, and Style and Data tabs on the right, so I can mostly map it.

What I couldn't find is edge types. It's a co-appearance graph, fine, but nothing on the screen tells me whether an edge has a type, or whether there's a legend for edges at all. The color legend on the canvas says "PageRank 0.00330 to 0.0754". That's good, I read legends. But "Covers Louvain for Color" took me two reads before I understood it.

### Round 2 -- trust, and what is missing

**genomics-cytoscape-user:** **Maren:** Okay, trust. Renata asked the same question I would: who decided PageRank is orange to brown? I didn't. If the app picks a gradient for me, I spend the next ten minutes checking whether it's lying. Is it centered on anything? Does one outlier wash out the rest? So for me "Paints 77 nodes" is the only line on that screen I'd actually trust, because it's a count.

As for fit, my day doesn't start with PageRank. It starts with a DESeq2 table and 300 gene symbols. I don't see where my log2 fold change would go, or whether all 300 matched. Until I see that number, the rest is a demo.

Mara, I'm with you on the legend card. If it really comes out with the PDF, that's the first thing here that saves me an evening in Illustrator. But I'd want it to say what the numbers are. "0.0033 to 0.0754" means nothing to a reviewer.

Joaquin is right about the left list. I can't tell which rows are painting. And "1 row not listed still paints" is a silent problem, the exact kind that makes me stop trusting a tool.

**gephi-holdout:** **Mara:** Trust first. Undo up top earns my attention, but only once I've changed a color, pressed Cmd+Z, and watched it go back. A visible button doesn't prove that. And who chose orange to brown for PageRank? Renata asked the same thing, and she's right. In Gephi nothing gets painted until I ask for a ranking. Here a statistic seems to arrive already wearing a palette. If the app did that for me, I want it off.

Joaquin, my problem is the reverse of yours. "Covers Louvain for Color" read clearly enough. What it tells me is that two rules are fighting over one channel, and I'm finding out from a caption. In Gephi the last ranking I applied wins, and I know that because I'm the one who applied it.

What's missing for me is a "Size" line in the Style panel. I'd look there first to make high PageRank bigger, and I don't see one. Elena's guess is the same as mine. Then there's "1 row not listed still paints": a hidden rule is still painting my graph and I can't see it in the list. That's exactly how a figure goes to a reviewer with a legend that's wrong.

**marketing-analyst:** Okay, trust. Renata's question is the one I keep coming back to: who decided PageRank is orange to brown? If the app picked it, I have to undo it before the deck. If I picked it, I want to know where I did that. Joaquin, I'm with you on "Covers Louvain for Color." I read it three times. If two results are fighting over the color, the map should just say "Color: PageRank" and the legend should match it. Mara, you like the legend card, and so do I, but only if it's exactly what ends up in the export. Otherwise it's the dashboard-says-4,000, download-says-3,100 thing all over again.

How I'd really use it: I need a table sorted by influence score, top 40, as a CSV, with the cluster names on each row. I still haven't seen that. Elena's right that nothing says "make bigger." In Gephi it's a size tab and you're done.

What's missing: grayscale. Orange on orange dies on the printer. And don't get me started on Brandwatch dropping Instagram.

**cytoscape-holdout:** **Renata:** Joaquin's right about edges. In Cytoscape, Edge Table and edge mappings sit in the same place as the node ones. Here I've only been shown nodes, so I can't tell whether edges get the same treatment or are an afterthought.

Maren, you asked "what row still paints?" and that's my trust problem too. In Cytoscape a bypass at least shows up in the Style panel with a marker. A row that paints but isn't listed is a hidden bypass, and that's how you end up with a figure you can't reproduce eighteen months later.

Mara, you call it a statistic, I call it a column. Either way, I want the PageRank values to sit in the Node Table as a column I can sort. The coloring should be a separate mapping that I make from that column, give a name, and save. Right now the result and its paint come as one row, so if I delete the row, do I lose the numbers too?

What's missing: a way to save this coloring under a name, export it, and apply it to the next client's network. I'd also like the midpoint on that gradient to be visible. Until I see those, all I know is that this paints nodes. I don't know that it's a Style.

**explorer-elena:** Elena: Honestly, I'm with Marketing on the "1 row not listed still paints" thing. That one scared me. If something is coloring my dots and I can't find it, I'm going to assume I broke it. I'd probably just close the tab and start over.

Renata asked who decided PageRank should be orange to brown. I hadn't even noticed that wasn't me. I thought orange was just what the app looks like. And now that I know, I'm not sure how I'd tell next time.

On trust: I don't think I would have trusted the dark dots in the meeting. I'd have said "these are our biggest customers," and somebody would have asked me how I knew. And I wouldn't know.

Fit: in our dashboard I click a bar and get a list. Here I'd click the big dot and hope.

What's missing for me is just one sentence that says what the color means, in normal words. "0.0754" means nothing to me. Mara and Joaquin seem fine with three panels, but I'm not.

**gene-ontology-cytoscape-user:** Joaquin: Maren is right, and so is Renata. I trust a tool when I can tell a result from a style, and this list puts both in one column. In Cytoscape I'd click PageRank in the Node Table and see a column of numbers. Here I click it and get a Fill panel. So did the app color my terms, or did I?

Mara likes that "Full graph" tells her what a statistic ran on. I want the same thing for my own data: which file, which GO release, how many terms were loaded and how many are hidden. I didn't see any of that.

What's missing for me is edge types. My edges are is_a, part_of and regulates. If the app can color nodes by PageRank, where do I set line style by relation? I couldn't find it, and in grayscale print color won't save me.

Elena says she wouldn't know which control makes things bigger. I wouldn't either. Size has no row of its own.

And "1 row not listed still paints"? That's the one line that would make me stop trusting the legend.

### Round 3 -- quit, switch, and the one change

**genomics-cytoscape-user:** **Maren:** What would make me quit is one silent mismatch. If I paste 300 genes, I need to see how many it found and which ones it didn't. If I can't see that count, I'm gone, and nothing else on these screens matters.

What would make me switch is a fold-change gradient centered on zero, with the midpoint shown in the legend, that comes out in the PDF. That would save me an evening in Illustrator every time. Even then, I'd probably still redo the final figure in Cytoscape, because reviewers recognize it and my PI cites it.

Renata, you're right that the result and its coloring have to be two separate things. If I delete the coloring, I need my numbers to still be in the table.

Mara, you want nothing painted until you ask. I'm the same, with one difference: if the app does pick colors, it had better not pick red-green. My PI can't read it.

The one thing to change is that "1 row not listed still paints." Every row that's coloring my network has to show up in the list, with a count next to it. If something is painting where I can't see it, I can't trust the legend, and if I can't trust the legend, I can't use the figure.

**gephi-holdout:** **Mara:** What would make me quit is short. If PageRank or modularity show up already painted when I didn't ask, I'm out. Renata, you put it well: the numbers belong in a column, and the paint is a separate thing I make from that column myself. When a statistic comes out wearing an orange-to-brown gradient, I can't tell whether I'm looking at the result or at the designer's taste. In Gephi nothing changes color until I click Apply in Ranking, and that's the only reason I trust what I'm looking at.

What would make me switch, at least for teaching, is undo that really covers the appearance changes, and a legend that goes out with the SVG. Maren, I agree it has to name the statistic and the range.

The one thing I'd change: show every rule that is painting the graph in the list, every time. "1 row not listed still paints" is a hidden rule, and it will put the wrong legend in front of reviewer two. And give me a Size line next to Color, so making high PageRank bigger takes one move. Joaquin, Elena, I'm with you there.

Fix those and I'll give it a second session on my own retweet network. That's a second session. It isn't a switch.

**marketing-analyst:** **Jordan:** Okay, quitting first. I'd quit the day I put a map in a deck, someone asks "why is that one orange?", and the answer turns out to be a row I can't see. Renata called it a hidden bypass. I call it a Monday meeting I lose.

I'd switch for a simple reason. Gephi is three clicks to size by influence score and color by cluster, but then I'm stuck in Illustrator adding the key. If this app gets me the same three clicks and the legend that's on the map actually lands in the PNG, I'd give it the afternoon. Mara's right that the legend card is the hook. It just has to be honest.

The one thing I'd change: nothing gets colored until I ask. No orange-to-brown "for me." Maren and Renata both said it, and so did I. Load my data, show it plain gray, and let me pick Color and Size myself.

Elena, you said you'd assume the dark dots are the big customers. That's exactly why it can't decide for us. Then my VP asks "why is that one big?", and I need to be the one who decided.

And grayscale, please. Our printer has been broken since March.

**cytoscape-holdout:** **Renata:** What would make me quit is the one Maren and Mara already hit: a palette I didn't ask for, plus a row that paints without showing up in the list. If I can't hand a reviewer a figure and say what every color came from, I'm back in Cytoscape that afternoon.

What would make me switch is portability. I keep forty named styles. If I could take this coloring, call it `pagerank-size-v1`, export it as a file, and apply it to next month's client network without clicking through it again, I'd look seriously. The same goes for a session that reopens unchanged eighteen months later. Show me that and I'll forgive the hamburger.

Joaquin, edges have to work the same way as nodes, or it's half a style.

The one change I want: keep the result and the mapping apart. PageRank should be a column of numbers. Size should be a mapping I make from that column, in a Size line I can see, and deleting it shouldn't take the numbers with it. Elena, a mapping like that would also give you your sentence, because the legend could then say which column drives it.

**explorer-elena:** Elena: If I'm being honest, I'd quit quietly. I wouldn't announce it. The moment would be the second time something colored my dots and I couldn't tell whether I did it. That "1 row not listed still paints" line already got me once.

Mara says nothing should get painted until she asks. Maybe that's right for her. My worry is the opposite. If I load my data and everything is plain gray, I'm going to assume it didn't work. So I'd want something, but I'd want it to say what it is.

Renata wants to save the coloring and reuse it. Sounds smart, but I'd never get that far.

What would make me switch is one sentence next to the color, in normal words. Something like "Darker means more connected." Then I could say it out loud in the meeting. Right now I'd say "the dark ones are our biggest customers," and I'd be wrong, and I wouldn't even know it.

So my one change is to stop showing me "0.0754" and tell me what it means.

**gene-ontology-cytoscape-user:** Joaquin: Quit or switch? I'd quit on one thing, and it's the same thing I keep coming back to. My edges are is_a, part_of and regulates. If the app draws them as one gray line, I can't use it on GO and I go back to GOATOOLS and Graphviz. I don't care how good the node panel is. So far nobody has shown me an edge.

Renata wants the PageRank numbers kept in the table as a column, separate from the coloring. I agree, and it matters more for me. My padj and gene_count columns come from R. They're data, not a style. If deleting a row in that left list can delete my values, I'm out.

Mara and Marketing both asked who picked orange to brown. I'll add this: whatever gets picked has to survive grayscale, and for edges that means line style, not hue.

What would make me switch is a view of the GO subgraph laid out top-down, with the relation types drawn differently and a legend that says which is which. If I could take that straight into a paper, I'd switch.

If I could change one thing: that list on the left. Show me which rows are painting the drawing right now, and on which channel. And never let a row paint without being listed.

## What the screen actually does, checked against the skeleton

Several complaints describe something the skeleton already has, one click away from the static
moment the group judged. Read the themes with these in mind:

- **The row that is not listed** is Group 6, one of Louvain's six communities, which someone
  removed from the list view. It still paints Color, under PageRank. The footer line links to a
  state that shows it dimmed in the list, and its row menu offers "Show in list view". Nobody
  followed the link.
- **Size exists.** It is a line inside the Style tab's Shape group, not a heading of its own.
  Four participants concluded there is no Size control (Mara, Jordan, Joaquin, Renata) and Elena
  could not tell which heading would hold one.
- **PageRank is already a sortable table column**, and deleting a run names the style layers
  that go with it. Nobody opened the table or a row menu, so the fear that deleting a row deletes
  the numbers is unanswered on screen, not confirmed.
- **Edge line patterns exist** in the style pickers (dash, dash-dot and others), but nothing on
  this screen shows an edge, an edge row or an edge legend.
- **Who chose the palette** is an owner decision, not an open question: a run paints as soon as
  it finishes (owner feedback, 2026-09-30, "measures don't paint on their own is rejected as a
  fatal flaw"), and a run's menu has "Restore the suggested look". The group's demand that
  nothing paint until asked is therefore input on how that decision is presented, not a reason
  to reverse it.

## The finding nobody in the room made

The rename did not fix the problem; it moved it. In the previous round the footer said "1 hidden
row still paints", and every participant read "hidden" as "not on the picture". This round tests
the studio's rename to "not listed" (decision log: "round 8 tests whether the confusion
survives"). It survives, in a sharper form. Nobody misread the words this time -- all six
understood that a row is painting while absent from the list -- and all six rejected exactly
that state. Renata named it a "hidden bypass", and Jordan, Elena, Maren, Mara and Joaquin each
made it a quit trigger or their one change.

So the confusion was never only vocabulary. The owner asked for list hiding that is separate
from the eye, and that is kept. What this group objects to is a painting row that the list
does not account for at rest. Studio recommendation (reversible, for the next spec pass): a row
removed from the list view must still be accounted for wherever paint is explained -- the
footer names it and its channel ("Group 6 -- not listed, paints Color on its members, under
PageRank"), and the canvas legend never shows a color whose source is not named. Removal hides
the row from the list, never from the explanation. Test it as a task ("one node is a different
color from its neighbors; find out why") before changing structure.

## Themes

Counts are "raised independently in round 1" / "voiced by the end". Severity is Nielsen 0-4.

### 1. A row that paints but is not listed breaks trust in the legend -- severity 4

- Independent: Maren, Jordan (round 1). Mara, Renata, Elena, Joaquin joined in round 2.
- By the end: 6 of 6. Quit trigger or one change for all six; the strongest signal in the
  session.
- Agreement: every row that paints must be visible, with its channel (Joaquin) and its count
  (Maren). Renata frames it as reproducibility; Jordan and Mara as the wrong legend going out;
  Elena as "I'd assume I broke it" and close the tab.
- Dissent: none.
- See the finding above. The skeleton's way back (footer link, "Show in list view") went
  unseen.

### 2. The result and its paint arrive as one thing, and nobody chose the palette -- severity 3

- Independent: Maren ("did I choose that or did the app?"), Mara (a result and its paint look
  like one row), Renata ("who decided PageRank is orange to brown?") in round 1. Joaquin, Jordan
  and Elena picked it up in round 2, mostly by quoting Renata.
- By the end: 6 of 6 raised the "who chose it" concern. Four asked that nothing paint until they
  ask (Mara, Jordan, Maren, Renata); Mara and Jordan made it a quit trigger.
- Dissent: Elena. Plain gray after loading would make her think the app had failed; she wants
  paint that says what it is. Joaquin does not ask for no paint, only for paint that survives
  grayscale.
- Constraint: the owner has decided runs paint when they finish. Within that decision, the
  group's need resolves into three things the studio can act on: say on screen that the run
  painted this and that the look is a suggestion ("Suggested look from PageRank -- change or turn
  off"); make the one-move off (the eye) obvious from the inspector; and show that the values
  live on as a table column whatever happens to the paint (Renata, Joaquin, Maren, Mara).
- Elena's dissent supports the owner's decision with a non-expert reason the experts did not
  give.

### 3. The left list mixes kinds of thing, and done and available look alike -- severity 3

- Independent: all 6 in round 1. Up from severity 2 last round, because this cast went further:
  Elena could not tell runs she made from options ("Is Shortest paths something I ran, or a
  menu?"), and Mara asked whether a row with no swatch (Density) paints at all.
- Agreement on the observation. The fix most of them proposed -- three places, as in Cytoscape
  or Gephi -- conflicts with the owner's decision of one tree of rows, each something that can
  paint, with a type icon.
- What the group needs inside one tree: rows read as things already made, never as a menu
  (Elena); a row shows whether it is painting now and on which channel (Joaquin, Maren, Mara);
  and a row that cannot paint, or paints nothing at the moment, looks different from one that
  does (Mara on Density).
- Note: four of six measured the list against Cytoscape's three panels, and three of those six
  are Cytoscape users. Discount the "split it" proposal; keep the need.

### 4. Size cannot be found -- severity 3

- Independent: Elena (round 1: "which one makes things bigger"). Mara raised it in round 2 and
  credited Elena; Jordan, Joaquin and Renata adopted it.
- By the end: 5 of 6 (not Maren).
- The skeleton has Size, as a line inside the Shape group. This is a discoverability failure:
  five people looked for "Size" as a heading next to Fill and did not find it. Studio
  recommendation: give Size its own heading in the Style tab, beside Fill.

### 5. The legend needs meaning, not just a range -- severity 3

- Independent: Elena ("is that a lot?") and Jordan ("tell me what it means") in round 1. Maren
  in round 2 ("means nothing to a reviewer"), Mara in round 3 (name the statistic and the range).
- By the end: 4 of 6. Elena's one change.
- What was asked for differs by audience: Elena wants a plain sentence ("Darker means more
  connected"); Maren and Mara want the statistic named with its range and, for diverging data, a
  visible midpoint (Maren, Renata). Both fit in one legend: a plain reading line under the named
  range.
- Elena's admission that she would have presented "the dark ones are our biggest customers"
  wrongly is the most concrete harm voiced in the session.

### 6. Grayscale and color-blind safety -- severity 3

- Jordan (all three rounds), Joaquin (rounds 2 and 3: for edges, line style rather than hue),
  Maren (round 3: never red-green). 3 of 6, each for their own reason (projector and printer,
  print, a PI who cannot read red-green).
- The orange-to-brown ramp looked like a single color to Jordan on a projector. Not measured;
  check the ramp's lightness range rather than trusting the voice.

### 7. Edges are absent from this screen -- severity 3 for typed-edge users

- Independent: Joaquin only (round 1). Renata adopted it in round 2.
- Joaquin's quit trigger: three relation types must draw differently (line style) and have a
  legend. The skeleton has edge patterns in its pickers, but this screen shows no edge row, no
  edge style and no edge legend.
- One voice, but it is the persona whose job depends on it. Run it as a task (make is_a, part_of
  and regulates look different) rather than weighing it by count.

### 8. The legend must be exactly what is exported -- severity 2 (untested)

- Maren (round 1: "the legend that goes into the PDF"), Mara (rounds 1 and 3: with the SVG),
  Jordan (rounds 2 and 3: in the PNG). 3 of 6.
- The legend card is the hook for all three; any mismatch with the export ends it. Nobody opened
  the export on this screen.

### 9. "Covers Louvain for Color" -- severity 2

- Joaquin (two reads, round 1), Jordan (three reads, round 2). Mara understood it and objected
  to the mechanism instead: two rules fight over one channel and she learns of it from a caption.
- Same word flagged last round. Rewording it alone will not answer Mara; the losing result
  belongs in the legend, as last round's group also concluded.

### 10. Unlabeled toolbar icons, and the cube -- severity 2

- Jordan (clicked four icons without learning what they do) and Elena (would skip them) in
  round 1. Maren and Mara both assumed the cube means 3D and wanted to avoid it.
- Two separate small findings: icon-only buttons need visible names or reliable tooltips for
  non-experts, and a dimension toggle should not be the first thing that catches a 2D user's eye.

### Single voices, off this screen

Real needs, but not about this screen and voiced once; route them to the matching study rather
than this one.

- Maren: after pasting 300 gene symbols, how many matched and which did not (her quit trigger).
- Joaquin: the provenance of loaded data -- file, GO release, terms loaded and hidden.
- Renata: named, exported, reusable styles; a session that reopens unchanged after eighteen
  months; File and Import where she expects them.
- Jordan: top 40 by influence score, with cluster names, as a CSV.
- Mara: undo that provably covers appearance changes (she will test it, not trust the button).

### What worked

- "Paints 77 nodes (every node with a value)": Maren, Jordan and Renata in round 1; Maren calls
  it the only line she would trust. A count is the form of statement this group believes.
- The canvas legend card: Mara, Jordan, Joaquin and Maren, all conditional on it being honest and
  exported.
- The Style tab maps onto Cytoscape's Style panel: Maren, Renata and Joaquin.
- "Full graph" as the scope a statistic ran on, "Local only", visible undo: Mara.
- The table dock was found without help: Jordan, Renata.

## Group-think to discount

- **"Who decided orange to brown?"** is Renata's phrase. Maren and Mara had their own version in
  round 1; Jordan, Elena and Joaquin quoted Renata in round 2, and Elena said she had not
  noticed until Renata asked. Count three independent voices, not six.
- **"Nothing painted until I ask"** converged among four experts in round 3, each citing the
  others. It is also the incumbent-tool habit (Gephi's Apply, Cytoscape's mappings) and it runs
  against an owner decision. Elena's dissent is the one voice outside that habit, and it points
  the other way.
- **The "hidden bypass" frame.** Renata's label for the unlisted row was adopted by Jordan and
  echoed by Mara. Theme 1 stands on its own (two independent voices in round 1, and the state is
  observable), but the framing as a Cytoscape bypass is one person's.
- **Size pile-on.** One independent voice (Elena); four followed. The screen confirms the
  discoverability problem, so it stands, but as one observation.
- **Cast skew.** Five of six are expert holdouts from Cytoscape or Gephi, three of them Cytoscape
  users, so "split the list into separate places" is partly a familiarity reflex. Only Elena
  stands for a reader with no incumbent tool, and nobody stands for a notebook user.
- **The shared quit story.** The round-3 prompt invites a quit scenario, and four gave the same
  one (someone asks why a node looks that way and I cannot answer). Trust it as one strong theme,
  not four.
- **Simulated voices.** All six are one model; agreement among them is cheap.
- **Mock fidelity.** The group judged a static moment. Nobody followed the footer link, opened
  the Shape group, opened the table, opened a row menu or showed an edge. Themes 1, 4 and 7, and
  the fear of losing values in theme 2, should be run as tasks with the participant view before
  any structural change: find what colors one odd node; make high-PageRank nodes bigger; make
  three edge types look different; remove PageRank's color and confirm the values are still in
  the table.
