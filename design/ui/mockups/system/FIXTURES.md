# FIXTURES -- the canonical numbers for the three datasets

One file. One value per fact. Every number on every artboard is read off this
document, and every derived number is shown here with the arithmetic that makes
it. Where a fact comes from a real file it is COMPUTED and the file is named.
Where a fact is invented it is marked INVENTED, one value is chosen, and every
number derived from it is made to agree with that choice.

If a board and this document disagree, the board is wrong.

Nothing here is a layout instruction. It fixes numbers, the words that carry
them, and nothing else.

---

## 0. The three datasets, at a glance

| | cat social network | fraud ring | ovarian STRING |
|---|---|---|---|
| File on screen | `cat-social-network.json` | `fraud-ring-synthetic.json` | `ovarian_de_string.tsv` |
| Source of truth | REAL: `CAT_SOCIAL_NETWORK` in `graphty/src/data/sampleGraphs.ts` | INVENTED | INVENTED |
| Nodes | 20 | 200 | 318 |
| Edges | 29 | 612 | 1,104 |
| Direction | undirected | directed | undirected |
| Weight | `value` (1 to 10) | `amount` | `combined_score` (0.4 to 0.99) |
| Time | none | `opened` (node date attribute) | none |
| Mean degree | 2.9 | 6.1 | 6.9 |
| Density | 0.153 | 0.031 | 0.022 |
| Components | 1 | 1 | 1 |

A fourth file appears on three boards and is included at the end because it
carried a verified contradiction: `security-events-120k.csv`.

---

## 1. Cat social network -- COMPUTED from sampleGraphs.ts

Extracted from the literal `CAT_SOCIAL_NETWORK` object. Every number in this
section was computed from that object, not chosen.

2026-09-12, at the product owner's request: the superseded `AppLayout` shell was
deleted, and with it the `TEST_GRAPH_DATA` alias this section used to name. The
fixture itself did not move or change -- `AppLayout.tsx` only aliased the object
that has always lived in `graphty/src/data/sampleGraphs.ts` -- so every number
below stands as computed and only the pointer was repaired.

### 1.1 Counts

- Nodes 20, edges 29, unique ids 20.
- Mean degree = 2 x 29 / 20 = 2.9.
- Density = 2 x 29 / (20 x 19) = 58 / 380 = 0.1526 -> **0.153**.
- Connected parts 1. Isolated nodes 0.
- Longest distance (diameter) **5**.
- Typical distance (average path length) **2.99** (exact 2.995 over all 380
  ordered pairs).
- Self-loops **0**. Parallel edges **0**. Dangling endpoints **0**. Missing
  attribute values **0**. So this dataset has NO validation issues, on any
  board, ever.

### 1.2 Schema -- the exact phrasing

`3 node types, 7 edge types`

- Node types come from `breed`: **cat 17, human 2 (The_Vet, Mrs_Henderson),
  dog 1 (Neighbor_Dog_Rex)**. 17 + 2 + 1 = 20.
- Edge types come from `interactionType`, which has exactly 7 values:
  social 8, play 5, territorial 4, feeding 4, medical 4, hunting 2, romantic 2.
  8+5+4+4+4+2+2 = 29.
- `relationship` has 18 values and is NOT the edge-type count. Do not use it.
- Node attributes 8 (id excluded: group, weightLbs, personality, indoorOutdoor,
  ageYears, breed, favoriteSpot, huntingSkill). Edge attributes 3 (value,
  relationship, interactionType).

### 1.3 Degree, top five

The whole ranking is 4,4,4 then twelve 3s then five 2s.

| rank | id | links |
|---|---|---|
| 1 | Mr_Whiskers | 4 |
| 2 | The_Vet | 4 |
| 3 | Mrs_Henderson | 4 |
| 4 | Princess_Fluffington | 3 |
| 5 | Garbage_Bandit | 3 |

Distribution, exact and complete: **2 links: 5 nodes; 3 links: 12 nodes;
4 links: 3 nodes.** 5 + 12 + 3 = 20. No node has 1 link, so that bin is not
drawn. Size legend domain: **1 to 4**.

### 1.4 Bridges (betweenness, normalized, unweighted, direction ignored)

| rank | id | value |
|---|---|---|
| 1 | The_Vet | 0.35 |
| 2 | Chonky_Boy | 0.28 |
| 3 | Zoom_Zoom | 0.17 |

min 0.00, max 0.35. Neighbor_Dog_Rex is 0.00.

### 1.5 Groups -- Louvain, resolution 1.0, seed 42 -- INVENTED partition

The partition is INVENTED, but it is not free: the boards draw enough of it --
four group sizes, four internal densities, three hub degrees and three
cross-group edge counts -- to determine the membership exactly. The membership
is written down here, and every number derived from it is then COMPUTED from
the real edge list rather than chosen.

- **4 groups, sizes 7 / 6 / 4 / 3 = 20.**
- Group internal density: Group 1 0.43, Group 2 0.40, Group 3 0.50, Group 4 1.00.
- **Modularity 0.447**, COMPUTED. Not 0.537, which four boards printed. See 1.5.1.

| group | members | internal edges | density |
|---|---|---|---|
| 1 | Mrs_Henderson, Chonky_Boy, Garbage_Bandit, Butterscotch, Old_Tom, Shadow_Ninja, Ghost_Cat | 9 | 9/21 = **0.43** |
| 2 | Princess_Fluffington, Sir_Naps_A_Lot, The_Vet, Professor_Pawsington, Bella_Ballerina, Therapy_Cat_Whisper | 6 | 6/15 = **0.40** |
| 3 | Zoom_Zoom, Window_Watcher_Wendy, Tiny_Terror, Midnight_Howler | 3 | 3/6 = **0.50** |
| 4 | Mr_Whiskers, Mittens_The_Destroyer, Neighbor_Dog_Rex | 3 | 3/3 = **1.00** |

9 + 6 + 3 + 3 = 21 internal edges; the other 8 of the 29 cross groups.
Group 4 is the only triangle in the graph, which is why its density is 1.00.
The canvas colouring on GroupProfilePopout and ExplorerAfterCard already draws
exactly these four sets.

**Group 1 is pinned independently** by three drawn numbers, and no other
seven-node set satisfies them: internal hubs Mrs_Henderson 4, Garbage_Bandit 3,
Shadow_Ninja 3 (links inside the group). Mrs_Henderson can reach 4 only if all
four of her neighbours are in; Garbage_Bandit then needs Shadow_Ninja;
Shadow_Ninja then needs Ghost_Cat. Every other drawn Group 1 number then
checks out against that set:

- Internal edges 9 (Mrs_Henderson-Chonky_Boy, -Garbage_Bandit, -Butterscotch,
  -Old_Tom; Garbage_Bandit-Shadow_Ninja, -Butterscotch;
  Shadow_Ninja-Chonky_Boy, -Ghost_Cat; Ghost_Cat-Old_Tom).
  Density = 9 / (7 x 6 / 2) = 9 / 21 = 0.4286 -> **0.43**. Matches.
- Inside degrees sum to 18 = 2 x 9. Mrs_Henderson 4, Garbage_Bandit 3,
  Shadow_Ninja 3, Chonky_Boy 2, Butterscotch 2, Old_Tom 2, Ghost_Cat 2. Matches.
- Edges leaving Group 1: exactly 3 -- Chonky_Boy-The_Vet,
  Butterscotch-Tiny_Terror, Old_Tom-Tiny_Terror. So **Group 2: 1 edge,
  Group 3: 2 edges, Group 4: 0 edges**. Matches (The_Vet in Group 2,
  Tiny_Terror in Group 3).
### 1.5.1 Modularity -- COMPUTED, 0.447

Four boards printed **0.537**. With the membership above and the real edge
list, Newman modularity is

Q = sum over groups of ( L_c / m - (d_c / 2m)^2 ), m = 29

| group | internal edges L | degree sum d | L/m | (d/2m)^2 | term |
|---|---|---|---|---|---|
| 1 | 9 | 21 | 0.3103 | 0.1311 | 0.1793 |
| 2 | 6 | 17 | 0.2069 | 0.0859 | 0.1210 |
| 3 | 3 | 11 | 0.1034 | 0.0360 | 0.0675 |
| 4 | 3 | 9 | 0.1034 | 0.0241 | 0.0794 |

**Q = 0.447.** Three decimals, the form the set already used. It still sits in
the "clearly separated" band (above 0.3), so no reading's band word changes --
only the number.

### 1.6 Group 1 enrichment -- CORRECTED

The card printed `indoorOutdoor: outdoor 5 2.4 0.02` and
`breed: tabby 3 1.1 0.03`. Both are false against the file:
the graph holds 5 outdoor nodes, not the 7 that a 2.4 expectation implies, and
1 tabby, not the 3 that a 1.1 expectation implies. Two values with counts 5 and
3 also cannot both live in a seven-member group.

Computed against the pinned Group 1 above and the real whole-graph counts
(stray 4, indoor 7, outdoor 5, mixed 3, and C(20,7) = 77,520):

| row | count in group | expected | raw p |
|---|---|---|---|
| `indoorOutdoor: stray` | 4 of 7 | 7 x 4 / 20 = 1.4 | C(4,4)C(16,3)/C(20,7) = 560/77520 = **0.01** |
| `breed: mixed` | 2 of 7 | 7 x 3 / 20 = 1.1 | P(X>=2) = (3 x 6188 + 2380)/77520 = **0.27** |

Group 1 holds all four strays (Garbage_Bandit, Shadow_Ninja, Old_Tom,
Ghost_Cat) and two of the three mixed-breed cats (Garbage_Bandit, Old_Tom).
The second row is the honest second-strongest value on a card that prints raw,
uncorrected p and says so; there is no other value in this group with a count
above 2.

The info circle's worked example follows row 1: "0.01 means about 1 group in
100 this size would hold this many by chance."

### 1.7 The rest

- Filter board (ExplorePanel): search `outdoor` returns 5 matches, and their
  degrees are the file's -- Mr_Whiskers 4, Mittens_The_Destroyer 3,
  Zoom_Zoom 3, Midnight_Howler 2, Neighbor_Dog_Rex 2. Three are selected
  (Mr_Whiskers, Mittens_The_Destroyer, Zoom_Zoom): mean degree 10/3 = **3.3**
  against 2.9; edges to the rest **8**; shared attributes 2
  (`indoorOutdoor = outdoor`, `group = 1`). The status bar's `6 of 29 edges`
  is the six edges of `value >= 5` that touch a visible node, and is correct.
- Style library "Publication" applies to **2 nodes: The_Vet, Mrs_Henderson**
  (the two humans).

---

## 2. Fraud ring -- INVENTED, one value each

200 nodes, 612 edges, directed, weighted by `amount`, node date attribute
`opened`. Mean degree 2 x 612 / 200 = **6.1**. Density 612 / (200 x 199 / 2) =
**0.031**. Connected parts **1**.

### 2.1 Node type composition -- the exact phrasing

**All four types are named. Never "1 other type".**

> 96 accounts, 48 devices, 34 phone numbers and 22 merchants, connected by 612
> transactions. One connected part holds all 200 nodes.

96 + 48 + 34 + 22 = 200. Schema mark: `4 node types, 3 edge types`.
Attributes: 8 node, 4 edge.

### 2.2 Degree, top five -- the shared table

| rank | id | links |
|---|---|---|
| 1 | merch-88 | 44 |
| 2 | dev-19c2 | 40 |
| 3 | acct-4471 | 37 |
| 4 | ph-2076 | 31 |
| 5 | acct-1187 | 24 |

Graph maximum 44, minimum 1. **Every size-by-degree legend on this dataset
reads `1 to 44, sqrt scale`**, and every degree histogram axis runs 1 to 44,
whatever else is on the board -- a time window filters the drawing, never the
encoding. Two further degrees are fixed because a board prints them:
**acct-2093 21**, **ph-1140 18**. Both sit below rank 5 and disturb nothing.

Any board that draws three of these together draws them in this order and with
these ranks: acct-4471 37 (#3), dev-19c2 40 (#2), ph-2076 31 (#4). Their mean
is (37 + 40 + 31) / 3 = **36.0**. The most connected node in the graph,
merch-88 with 44 links, is not one of them.

### 2.3 Degree distribution -- one chart, 15 bins of 3 links

Same counts on every board that draws it, sums to 200, and is consistent with
612 edges (midpoint degree sum 1,303, inside the 1,103 to 1,503 the bins allow
for the true 1,224).

| bin | nodes | | bin | nodes |
|---|---|---|---|---|
| 1 to 3 | 94 | | 25 to 27 | 2 |
| 4 to 6 | 45 | | 28 to 30 | 1 |
| 7 to 9 | 22 | | 31 to 33 | 1 (ph-2076) |
| 10 to 12 | 12 | | 34 to 36 | no nodes |
| 13 to 15 | 8 | | 37 to 39 | 1 (acct-4471) |
| 16 to 18 | 5 | | 40 to 42 | 1 (dev-19c2) |
| 19 to 21 | 4 | | 43 to 45 | 1 (merch-88) |
| 22 to 24 | 3 | | | |

The 34-to-36 bin is empty and is drawn as an empty track, never as a bar.
The bell-shaped alternative (34/39/31/25/19/14/11/8/6/5/3/2/1/1/1) is
arithmetically impossible: its smallest consistent degree sum is 2,084 against
the 1,224 that 612 edges allow. It is retired.

### 2.4 Named node metrics

| id | degree | betweenness | PageRank | group (of 7) |
|---|---|---|---|---|
| acct-4471 | 37, rank 3 | 0.41, rank 1 | 0.038, rank 1 | 3 |
| dev-19c2 | 40, rank 2 | 0.33, rank 2 | 0.029, rank 3 | 3 |
| ph-2076 | 31, rank 4 | 0.29, rank 3 | 0.026, rank 4 | 5 |
| merch-88 | 44, rank 1 | -- | -- | -- |
| acct-1187 | 24, rank 5 | -- | -- | -- |

acct-4471: In 14 / Out 23 / All 37 on the Neighbors tabs; 0.41 is "on 41% of
the shortest paths"; top 0.5%, rank 1 of 200; opened 2026-03-18, country RO,
risk_score 0.87. Betweenness distribution min 0, median 0.04, mean 0.07,
max 0.41, p99 0.36.

### 2.5 Groups -- Louvain, seed 42, three resolutions

One partition per run record. Every list sums to 200.

- **resolution 0.5: 4 groups, modularity 0.58, 14 ms.** Sizes 61 / 58 / 47 / 34.
  Largest 61, the group around merch-88.
- **resolution 1.0: 7 groups, modularity 0.62, 31 ms.** Sizes
  41 / 38 / 33 / 29 / 24 / 20 / 15. This is the resident partition, so
  "group 3 of 7" on an inspector row means this run.
- **resolution 1.5: 11 groups, modularity 0.55, 16 ms.** Sizes
  31 / 27 / 24 / 23 / 21 / 19 / 16 / 13 / 11 / 9 / 6. Largest 31; acct-4471
  leads the 23-member group; 22 nodes are matched to a different group than in
  the 0.5 run.

### 2.6 Validation -- 4 issue types, 27 issues

Types and instances are stated separately and never collapsed.

| issue type | instances |
|---|---|
| repeated pairs (parallel edges) | 5 |
| edges without amount | 14 |
| non-date values in `opened` | 6 |
| self-loops | 2 |
| **4 types** | **27 issues** |

Status chip: `4 data issues`, titled `4 issue types, 27 issues`. Panel stub:
`4 issue types (27)`. No fraud board carries "3 issue types, 8 issues", and no
fraud board invents a "missing endpoint" type.

**Import fate, one story.** Repeats: **combined + sum, 5 pairs**. Self-loops:
**kept, 2** -- policy Keep on the import dialog, "2 edges point at their own
node. Kept at import, so they are drawn and counted" in the validation report,
and both still counted in the 612. The two are on **acct-4471 and merch-88**.
Nothing anywhere auto-fixes or removes them. Unknown nodes: created, 1.

### 2.7 Time windows -- two, each internally closed

**Window A (TimeSlider), 2026-01-05 to 2026-02-04, 30 days:**
120 of 200 nodes, 340 of 612 edges.
58 of 96 accounts, 29 of 48 devices, 20 of 34 phone numbers, 13 of 22
merchants -- 58 + 29 + 20 + 13 = 120. Largest of 3 parts holds 88%.
In-window degrees, shown of the node's whole-graph total:
acct-4471 24 of 37, merch-88 19 of 44, acct-2093 14 of 21, dev-19c2 12 of 40,
ph-1140 11 of 18. The size legend still reads 1 to 44 "over all 200 nodes, not
the window".

**Window B (DataTableDrawer, CanvasToolbar), 2026-02-18 to 2026-03-19:**
132 of 200 nodes, 388 of 612 edges. Degree cells in the table are whole-graph
degrees with whole-graph ranks (2.2), not window counts.

### 2.8 Other fixed fraud numbers

- Shortest path ph-1140 to merch-88: **3 steps**, through acct-2093 and
  acct-4471, 6 ms.
- Multi-selection board: 7 nodes = 5 accounts + 1 device + 1 phone number,
  4 edges between them; mean degree all links 9.4, inside the selection
  2 x 4 / 7 = 1.1.
- Three-node selection: reaches **71** other nodes.

---

## 3. Ovarian STRING network -- INVENTED, one value each

`ovarian_de_string.tsv`, 318 proteins, 1,104 STRING interactions, undirected,
weighted by `combined_score` (0.4 to 0.99), built around a 40-gene
differential expression list. Mean degree 2 x 1104 / 318 = **6.9**.
Density 2 x 1104 / (318 x 317) = **0.022**. Connected parts 1.

### 3.1 The join

`expression.tsv` joined onto `preferredName`, adding log2FoldChange, padj,
baseMean and go_terms.

- File rows **340**; matched **312**; unmatched file rows **28**;
  312 + 28 = 340.
- Nodes with no expression row: 318 - 312 = **6, drawn "not measured" in gray**.
- Node attributes after the join: 9 named plus 26 namespaced (stringdb:: 6,
  tissue:: 12, compartment:: 8).

### 3.2 Fold change and the clamp

- Raw domain across the 312 measured: **-6.8 to 5.9**.
- Displayed domain, clamped at the 2nd and 98th percentile:
  **-4.2 to 3.8**, midpoint 0, Blue-Orange diverging, blue down / orange up.
- **12 nodes lie beyond the clamped ends** and take the end colors. Wherever
  Clamp outliers is on, the canvas legend says so in the same words:
  "clamped at -4.2 and 3.8; 12 nodes beyond the ends".
- The reading band that goes with a value: a fold change is described relative
  to the drawn domain, not to its sign alone. **-0.42 is a tenth of the domain
  and draws near-neutral, so it reads "Slightly down", never "strongly down"**,
  and it fails the product's own "Fold change over 1" cutoff.
- Filter counts on the same data: padj < 0.05 matches 60 of 318;
  abs(log2FoldChange) > 1 matches 44 of 318.

### 3.3 TP53

Degree **41 links, rank 1 of 318** (the most connected node in the network;
size legend domain 1 to 41). Betweenness **0.312 normalized, 98th percentile,
rank 6 of 318**. log2FoldChange **-0.42**, padj **3.2e-7**. "Expand 41
neighbors".

### 3.4 Groups -- Markov clustering, granularity 2.5 -- one partition

**6 groups, sizes 118 / 71 / 52 / 38 / 24 / 15 = 318**, run in 210 ms over all
318 nodes with combined_score as strength. The largest has 118 members.

These same six integers are the Groups card chips, the legend swatch counts and
the category table's scope. Group 3 has **52** members, which is the
denominator of "21 of its 52 members share the top one". No board draws a
second partition from this run id.

Category table: 212 categories tested, 41 shown, 171 redundant ones hidden
(212 - 41 = 171).

### 3.5 The sample-library card

The library entry "Ovarian cancer DE genes" is this file. It reads
**318 nodes, 1,104 edges** and **"318 proteins, STRING edges at 0.4
confidence, logFC and padj columns."** on every board that lists it. The
150-protein variants (150/1,220, 150/1,240, 150/486) are retired.

---

## 4. security-events-120k.csv

The one file whose count legitimately changes on screen, and the rule that
makes it legible rather than contradictory.

- Finished graph: **120,418 nodes, 1,104,206 edges**, directed, repeated events
  combined into a `count` attribute. Mean degree 18.3. Schema
  `4 node types, 6 edge types`.
- **While loading, the total is an estimate off the file size and is written
  "about 120,000" every time it is drawn** -- in the reading, in the progress
  line and in the status bar. A rounded number is never typeset like an exact
  one. It becomes the exact 120,418 the moment the load ends. Mid-load state:
  48,000 of about 120,000 nodes (40%), 312k edges so far, about 12 s left.
- Groups (Label propagation): the 11 largest are 18,412 / 11,206 / 8,930 /
  7,415 / 5,088 / 4,271 / 3,640 / 2,905 / 2,462 / 2,118 / 1,730 = 68,177, and
  the rest is "Other (3,388 groups, 43% of nodes)": 120,418 - 68,177 = 52,241,
  which is 43.4% of 120,418.
- Node types, all four named: **61,200 processes, 41,300 hosts, 12,900 users
  and 5,018 IP addresses**, connected by **1,104,206 events**.
  61,200 + 41,300 + 12,900 + 5,018 = 120,418. One connected part holds 93% of
  nodes; 3,140 small parts hold the rest. Never "1,100,000 events", never
  "and 1 other type".
- Degree, top five: dc01.corp.local 14,206; 10.0.0.53 9,318; svchost.exe 7,904;
  SYSTEM 6,112; fs02.corp.local 4,870. Graph maximum **14,206**, so the size
  legend reads **1 to 14,206, sqrt scale** -- the same end the ranked list and
  the histogram axis on the same screen carry. It read 1 to 812 on one board
  and 1 to 4 (the cat graph's end) on another; both are retired.
- Betweenness: dc01.corp.local 0.38, 10.0.0.53 0.29, fs02.corp.local 0.21;
  "on 38% of the shortest paths", approximate, 100 samples, seed 4171, 81% of
  nodes score zero or near zero.
- The iPad board draws a different, smaller file, `security-events-41k.csv`:
  41,200 nodes, 212,000 edges; DC01 has 12,412 neighbours; rings hold 29,300
  and 11,900 collapsed, and 29,300 + 11,900 = 41,200.

---

## 5. Known residuals

Recorded rather than half-fixed, so a later pass does not rediscover them as
new defects.

1. **The sample library's sixth slot is a different dataset on different
   boards** (Patent citations 65,000/210,000/14 MB; Amazon items
   65,000/260,000/12 MB; Road network Oahu 62,000/81,000/9.8 MB), and its
   fifth slot alternates between College football (115/613, stable) and
   Airline routes (235/2,101 with one blurb, 235/1,297 with another). These
   are catalogue entries, not the three datasets this document owns, and the
   blurbs differ enough that they may be genuinely different files. Whoever
   owns the component inventory should settle the slot, and then one edge
   count per entry.
2. **Cat Group 1's second enrichment row is weak** (p 0.27). It is the true
   second-strongest value in the pinned membership; there is no other value in
   that seven-node group with a count above 2. If a future pass wants two
   strong rows it must re-invent the partition, not the numbers.
3. **The fraud time attribute is named `opened` on the node and `ts` on the
   edge** across the set. The validation issue is stated against the node
   attribute: "6 non-date values in opened".
