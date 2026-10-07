# Pilot: T16, First look

Build under study: graphty@0.8.53 (build 0196d46212aa), commit a1e6b91ff, opened at `/?next`
from an empty start. T16 has no success path and no grade, so the pilot walked the most likely
newcomer route instead: decline usage data, open `friends.csv`, look, run the analysis the app
marks "Start here", read the result, then put names on the dots.

**End state reached:** yes. A drawing appears after two steps, an analysis runs and its ranked
result is readable with names. No script errors, console errors or failed requests were printed
in any step. Several findings below would change what a newcomer concludes, and two answer-key
blanks are now filled.

## The path walked

| Step | Command | Screenshot | What the screen shows |
|---|---|---|---|
| start | `--start ... empty` | 01.png | Start page: Open, New from data, four samples, usage card |
| 1 | `--click "No thanks"` | 02.png | Card gone |
| 2 | `--click "Open project or file..." --upload friends.csv` | 03.png | **First drawing.** 20 blue spheres, arrows, no names. Overview: 20 nodes, 41 edges, Directed, 1 component, 3 to 6 edges per node |
| 3 | `--click-at 640,578` | 04.png | Node "Ava" selected; right panel: id Ava, Degree 6 |
| 4 | `--key Escape --click "Analyze"` | 05.png | Analyze list; PageRank tagged "Start here" |
| 5 | `--click "PageRank"` | 06.png | PageRank form: damping factor 0.85, Run |
| 6 | `--click "Run"` | 07.png | Nodes recolored orange; key "Color: Influence 0.04382 to 0.06608"; left list gains "Influence 20" |
| 7 | `--click "Influence"` | 08.png | Right panel: Top 10 with names -- Farah 0.06608, Ava 0.06423, Hana 0.05883, Ivan 0.05575, Gus 0.0547 ... |
| 8 | `--click "Everything" --click "Style"` | 09.png | Style tab of the base layer; Label has a "+" |
| 9 | `--click-at 1419,356` ("Add label line") | 10.png | Attribute picker: `id`, Influence, Influence rank, Influence percentile |
| 10 | `--click-at 1106,454` (option `id`) | 11.png | Names drawn; "20 labels, 1 hidden to avoid overlap" |
| 11 | `--hover-at 734,743` | 12.png | The unlabeled dark node is Farah; no tooltip |

Measures for the record: steps to the first drawing = 2 (3 counting the start). Analysis run
unasked: in this pilot, yes (PageRank). Data used: `friends.csv`.

## Blockers and findings

### 1. Answer key: friends.csv PageRank does not use the weight (wrong answer key, or app defect)

`answers.md` says the friends.csv rankings use the weight by default. The values on screen
(08.png) match a directed, **unweighted** PageRank exactly (reference computed by
`design/ui/studio/tmp/pilot-T16/pr.py`):

| Variant | Top 5 |
|---|---|
| directed, unweighted (= the app) | Farah .06608, Ava .06423, Hana .05883, Ivan .05575, Gus .0547 |
| directed, weighted | Farah .06394, Hana .05941, Milo .05648, Chloe .0555, Gus .0535 |
| undirected, unweighted | Ava .06924, Ivan .05873, Farah .04957, Omar .04945, Nora .04944 |
| undirected, weighted | Chloe .06202, Pia .05911, Milo .05832, Ava .05831, Farah .05425 |

The PageRank form (06.png) offers no weight choice and nothing on screen says the weight was
ignored. Either the key is wrong (record the unweighted values) or graphty-element should use a
`weight` column it has. Decide before grading any T16 reading of a ranking.

### 2. A "who knows whom" list is drawn and ranked as one-way (app or graphty-element defect)

The CSV has `source,target` rows for a symmetric relation, and the import makes it Directed
(03.png Overview; arrows on every edge). PageRank then ranks by arrow direction, which depends
on which friend was written first in each row. Undirected, Ava ranks first; directed, Farah
does. A newcomer has no cue that direction matters or that it was assumed, and the drawing
alone (no names) gives no way to notice.

### 3. The top-ranked person's name is the one hidden (graphty-element label placement)

After adding labels (11.png) the status reads "20 labels, 1 hidden to avoid overlap"; the hidden
one is Farah (12.png, `at 734,743: node "Farah" (its label is not drawn)`), the darkest and
top-ranked node, sitting almost on top of Chloe. Overlap culling should not drop the label of the
node the active result ranks highest. Hovering Farah shows no tooltip either (12.png,
`tooltip: null`), so on the canvas the answer cannot be read at all.

### 4. Adding a label line lists every name in the key and covers the drawing (app defect)

11.png: the key gains "Label: Everything" with one row per node ("Ava Ava", "Ben Ben", ...
"8 more"). A label is not a channel that needs a legend; the list repeats each name twice and the
key now covers the left of the canvas, cutting off "Sara" and hiding at least one node.

### 5. Adding a label line creates a second layer also named "Everything" (app defect)

11.png left list: two rows both called "Everything" (one with a brush icon, one with the graph
icon). A newcomer cannot tell which is which.

### 6. No names on the first drawing (design finding)

03.png to 10.png: 20 anonymous spheres. Names appear only after Style > Label > + > `id` -- four
steps a newcomer must discover. The friend names sit in `id`, so `id` is the name attribute for
the answer-key blank. Until labels are on, the only way to learn who is who is clicking nodes one
at a time.

### 7. Smaller observations

- The result is called "Influence" everywhere (key, left list, "Made with: Analysis Influence",
  08.png) though the participant clicked "PageRank"; the word PageRank does not appear again.
- The Values histogram in 08.png draws 20 bars of identical height, which says nothing about the
  distribution (median 0.04736 against a range of 0.04382 to 0.06608 means it is skewed).
- Labels render in a serif face unlike the rest of the app (11.png).

### 8. Study tool: name clashes (study-tool or wording)

- `--click "Analyze"` printed `ambiguous: "Analyze" matches 2 controls` (toolbar flask and the
  left list's "Analyze (Shift+A)" link). It took the first, which worked. Two controls sharing a
  name is also an accessibility point for the app.
- `--click "Style"` printed `ambiguous` (the tab and its tab panel, whose accessible name is its
  whole content: "Nodes Edges Fill Color #6366F1 ..."). Graders should expect these prints in
  T16 sessions; `"role=tab:Style"` avoids it.

## Answer-key blanks this pilot can fill

- friends.csv name attribute: `id`.
- friends.csv PageRank top 3 (as the app computes it, unweighted, directed): Farah 0.06608,
  Ava 0.06423, Hana 0.05883. Ava's degree: 6.
