# Principles: worked conflicts

Evidence for `../principles.md`: the budget checks that settled its hardest conflicts, drafted as
examples, not layouts. The information architecture owns each screen and re-counts it; where this
note and a framework document disagree, the framework document wins.

### The graph's inspector at rest (workflow evidence against the baseline, form by 4 and 5)

Figma's page inspector is thin; top task 1 (understanding the whole graph) makes the graph's
Statistics the first thing read, so they sit here as a recorded departure. The heaviest ordinary
case: a directed graph with 8 attributes, a weight attribute of unknown role, and a filter on.
Laid out literally -- every reading in top task 1 as a row, two degree histograms, a line per
attribute with type, profile and controls -- it counts about 50 words and ten headline rows. The
resolution keeps every reading one step away and puts six at rest:

```
Statistics
Nodes                                       1,204
Directed edges                    3,877 of 16,020
Density                                0.0027 (i)
Weakly connected components     3 (2 isolates) (i)
Strongly connected components               17 (i)
Degree distribution (i)             [sparkline]
weight: unknown (i)
9 more
Attributes                                      8
<section 2>                                     +
<section 3>                                     +
<section 4>                                <verb>
```

Counted: "Statistics" 1; Nodes 1 (the chip carries "of 5,310", so the row does not repeat it);
"Directed edges" and "of" 3 (the chip says nothing about edges); Density 2; the weak components
row 5 (the term, "isolates", the (i)); the strong components row 4; the degree distribution 3;
"unknown" and its (i) 2 ("weight" is the attribute's name); "more" 1; Attributes 1: **23** for
the Statistics. The other three sections are the information architecture's to choose, and they
may carry at most 9 app words between them, which brings the inspector to its **32**. Figma's
three resting sections carry 4 to 8 (Page, Styles, Export and its button, plus "Show in exports"
and "Preview"; `research/figma.md`, follow-up on the nothing-selected state). The budget leaves no room for a list of results or of views here beyond
a heading and "+"; the information architecture must show where each has a findable home under
principle 3, this four-section cap and the rail rule. The headline readings are nodes, edges, density, the two component counts and the degree
distribution. On an undirected graph the two component rows are one, "Connected components" with
its isolates, so five readings show and the strong row's 4 words go. "weight: unknown" is a
principle-1 mark row outside the six and disappears once a role is set. Without the filter and
the mark, the Statistics come to 20 on a directed graph and 15 on an undirected one; the
counted states are in `content-design.md`. The overview recipe row and the Last import row now sit at rest (`information-architecture.md` 2, "Prominence"), so this budget is to be recounted.

What the budget forced, and where it went: principle 4 writes both component terms and both
degree terms in full, so the direction and weight line folds into the edges row's name and the
weight's mark row; the largest component's share and the second-level graph statistics sit behind "N more" (the share is also in the
components row's tooltip). An attribute's detected type, weight role, completeness and profile are read and
corrected at its column header in the table; the Attributes row opens the table and carries a
mark when an attribute's import departs (a weight read as text). At rest the degree distribution is
a sparkline of total degree with no toggle; its row opens the attribute histogram on degree, whose
variant row chooses in, out or weighted. A non-zero self-loop, parallel-edge or negative-weight
count adds a mark row of 1 or 2 words; all three at once take the inspector to about 37, over 32,
which principle 1 allows in the open (ledger).

The whole screen at rest: at most 8 in the left panel, 32 here, 4 for the chip at its longest
("Working", "set", "of", "nodes"; "Filtered: ... of ... nodes" is 3), 1 for the view-mode button:
**45**, leaving 5 for whatever the information architecture puts in the header and the toolbar,
a legend title and the status line.

### The heaviest result editor (1 against 5)

A result is a definition, as a Figma variable is (principle 3): clicking its row opens its editor
in a popover to the left of the inspector, the canvas selection stays, and Escape closes the
popover only (`research/figma.md` 4.13 and 5.5). A result never becomes the selection, so the
analyst reads a result without losing the nodes they were reading it against. The popover is the
result's only surface, so it takes a selected object's budget: about 30 words, 40 at most. The
case: a sampled betweenness result, out of date, on a scope other than the chip's. Principle 1
decides which marks exist; principle 5 decides their form.

```
Metric (i)                               Re-run
Betweenness (sampled)
Out of date - on: 5,310 nodes            Details
Attributes
  betweenness      ~0.000 to 0.412
Appearance
  Color            betweenness
Used by
  2 style layers, 1 set
```

Counted: type row 2 ("Metric" and its (i)); "(sampled)" 1 (the name is not counted); the state
line with its verb and Details 7; Attributes 3 (heading, label, "to"); Appearance 2; Used by 5: **20**. A result has no Notes
section, because a note never targets a result (`conceptual-model.md` 6); Add note in the
popover's menu writes a note on the selection that cites this run. "Compare with..." is in the
popover's menu too, not at rest. A run that read the weight other than as declared adds a variant word to the name, about
1. The state line belongs to the run and appears once, however many attributes the run wrote;
each further attribute adds about 2.

### Diameter on 300,000 nodes (2 against 5)

Sampling by default would keep the overview fast and the menu short. Principle 2 wins: "Diameter"
runs exact and shows its band, "hours" or longer, while cheap runs started after it do not wait
for it. Principle 5 keeps the menu at one row: the sampled method is the
row's submenu and produces "Diameter (sampled)", a sibling result. Principle 1 fixes the form of
the band word: a band until a run on this device has been measured.

### Figma's group chord (4 against the baseline)

The baseline says keep Figma's shortcuts. Figma's group chord wraps the selection in a Group
parent. Principle 4 keeps "group" for a part of a partition, never a container. Result: the key
stays and runs Create set, nothing is re-parented, the ungroup chord deletes the selected set and
selects its members as Ungroup does, and bare "group" in the palette finds the Groups listing under
a partition result first and Create set second.

