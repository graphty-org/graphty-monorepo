# Data management, round 1: the flows to design for

Written by the user advocate for the first round of data mocks. It names the data flows a person
must reach at once (on the first screen, with zero or one click) and the special cases that may sit
a few clicks away, ranked, each with who does it, how often, what starts it, what the real app
makes them do today, what they need, how it ends, and the data to draw it with.

Sources: `design/data/data-management-requirements.md` (requirement numbers below are that
document's), its evidence file, the adversarial priority review in `tmp/data-priority-review/`,
the persona and workflow files in `design/designloom/`, the studio's tier 1 to 3 results, and the
app's code in `graphty/src/workspace/`.

## How this ranking differs from the requirements document

The requirements rank by adding up every persona's need, which lets specialist jobs outrank the
average reader's. The owner's standing rule is the opposite: the average first-time and weekly
reader first, personas to check the design, not to generate it. The priority review and the
studio's observed sessions move four things, and this brief takes all four:

1. **Replace data and "add a second file" move up to key flows.** In studio sessions 8 of 8
   hunted for Replace, and opening the same file again with a graph open silently doubled every
   tie (82 edges from 41). That is the commonest wrong turn observed, not a rare job. The studio
   already decided that opening a file that is already open offers Replace first.
2. **The name column joins the mapping line.** 19 of 21 failed to name their nodes in one study
   because the name column had to be bound by hand. Every own-file session meets it.
3. **Column type and "from the file or computed" go into "what loaded".** A yes/no column read as
   text made a filter keep 0 nodes; file values and run results looked the same 12 of 12.
4. **Server data (Neo4j, NDEx, web APIs, expand from the server) is a special case, one menu item
   away, not first-screen.** No studio session has ever touched it, and five of fourteen personas
   need it. It still gets a clear door ("Open network data" beside Open), because for those five
   it is the only way in.

Two jobs ranked high on persona scores have no observed session behind them: the table join and
everything about server data. The mocks should make them easy to test, and the next study should
test them before they are built ahead of the observed failures.

## The flows, ranked

Key flows: 1 to 6. Special cases: 7 to 11.

| Rank | Flow                                       | Kind    | Who, how often                                                         |
| ---- | ------------------------------------------ | ------- | ---------------------------------------------------------------------- |
| 1    | Open my own file and get a right drawing   | key     | 13 of 14 personas, every session                                       |
| 2    | Check that it loaded right                 | key     | 10 personas; blocking for Alex and the knowledge engineer              |
| 3    | Find, then show only what matters          | key     | 12 personas, every session for analysts, fraud, security, genomics     |
| 4    | Bring in a newer copy, keep my work        | key     | Alex weekly, supply chain monthly, security; the studio's top detour   |
| 5    | Add a second file to this graph            | key     | genomics (join), intelligence, supply chain, knowledge engineer        |
| 6    | Take the numbers out                       | key     | 11 personas; blocking for Emma, marketing, recommender engineer        |
| 7    | Fix a column: its type, its role, its name | special | 7 to 10 personas, sometimes                                            |
| 8    | Load from a server, expand, load more      | special | fraud (50 alerts a day), genomics, knowledge engineer, security, intel |
| 9    | Clean up what the load report found        | special | fraud, supply chain, knowledge engineer, intelligence                  |
| 10   | Several filters, saved sets, an id list    | special | Alex, fraud, security, genomics                                        |
| 11   | Repeat last month's steps on this month    | special | Alex, security, genomics, supply chain                                 |

---

## Key flows: on the first screen, zero or one click

### 1. Open my own file and get a right drawing

- **Who:** everyone with a file. Explorer Elena (tries a CSV export from a product tool), Analyst
  Alex (weekly, a spreadsheet of relationships), the genomics user (a STRING TSV), the supply
  chain analyst (supplier and shipment tables). Workflows W01, W14, W18.
- **How often:** every session that is not a sample or a saved project.
- **Trigger:** the reader drops a file on the start screen or the canvas, uses Open, pastes, or
  gives a URL.
- **Today:** "Open project or file..." or "New from data..." opens the Data page titled "Open as a
  new graph". It shows a preview grid, a role menu per column (Key, Name, From -> node, To -> node,
  Weight, Time, Edge id, Attribute), "Each row is", Direction "As the file says", the weight line,
  "Import styles from the file", and a match report. One Enter loads a clean file. What goes wrong:
  the name column is often not guessed, so nodes are called by their id everywhere; a whole-number
  count column loads as "Attribute" with "Weight: none", needing two choices; a project file
  dropped on "New from data" is refused as "no nodes or edges"; every column's menu is shown even
  when every guess is confident.
- **Needs:** one line that states the mapping in plain words, with Change: "Each row is a link
  from `bait` to `prey`, weighted by `confidence` (higher means stronger). Nodes are named by
  `gene`. Undirected." Focus on Load. Only uncertain columns open for a choice, each with its type
  and how many values do not fit. A recipe, style file or project dropped here opens as that, not
  as data; an unknown file offers "Read as...". Every door says the file stays in this browser.
- **End state:** the graph is drawn, nodes carry their names, and the reader did not make a single
  choice for a clean file.
- **First failure to design for:** a CSV where the name column and the weight are both unclear.
- **Fixture:** clean case `cat-social-network.json`, 20 nodes, 29 edges, no issues (FIXTURES
  section 1). Uncertain case `ovarian_de_string.tsv`, 318 proteins, 1,104 interactions, weight
  `combined_score` 0.4 to 0.99, name column `preferredName` (FIXTURES section 3).
- **Requirements:** 4, 5, 6, 7 (plus the name column), 9.

### 2. Check that it loaded right

- **Who:** Elena ("what is this?"), Alex (blocking: a wrong import spoils every later answer),
  Emma, the genomics user, the knowledge engineer. Workflows W01, W18.
- **How often:** every load, before and right after.
- **Trigger:** the preview, then the first drawing.
- **Today:** before loading, the match report shows unmatched edge ends with "Add / Leave out" and
  can filter the grid to the unmatched rows; refused files show a problem block with what to do.
  After loading, the Data place lists Sources and Attributes, each attribute with a type glyph
  whose word is only in a tooltip ("Number", "Category", "Result of PageRank"). There is no
  plain statement of separate groups, unlinked nodes or percent filled, and degree is not listed
  before a run.
- **Needs:** before loading, the report shows only lines that are not zero, each with a count, a
  row number and a fix ("Skip these rows"). A clean file shows no report at all. After loading,
  one sentence: "200 nodes, 612 links, directed. One connected part. 4 kinds: 96 accounts, 48
  devices, 34 phone numbers, 22 merchants." Then each column with its type in words, how full it
  is, and whether it came from the file or from a run.
- **End state:** the reader can say how big the graph is and whether anything was left out,
  without opening anything.
- **First failure to design for:** the fraud file's 27 issues of 4 types.
- **Fixture:** `fraud-ring-synthetic.json`, 200 nodes, 612 edges; issues: 5 repeated pairs, 14
  edges without amount, 6 non-date values in `opened`, 2 self-loops, written "4 issue types, 27
  issues" (FIXTURES 2.1, 2.6). Clean contrast: the cat network, which shows no report.
- **Requirements:** 8, 10, the visible half of 17, column origin.

### 3. Find, then show only what matters

- **Who:** Alex every session, fraud ("this account"), intelligence, security, genomics ("padj
  below 0.05"), Elena ("the one I know"). Workflows W02, W06, W12, W17.
- **How often:** many times a session.
- **Trigger:** a name, a number, or a condition in the reader's head.
- **Today:** the find box takes a name or value and can turn typed text into a rule. Observed:
  every participant typed the condition into the find box in the data's own words first, never
  rule syntax; the column's own menu second. There is no Select-or-Hide card on today's toolbar.
- **Needs:** the find box answers a name or a condition in plain words ("padj < 0.05", "amount
  over 5000") and offers the matching condition card. The card holds conditions that must all
  hold, counts "60 of 318" live, and ends in Select or Hide. Hiding never deletes; a rule naming a
  column that does not exist says so instead of showing an empty result.
- **End state:** the drawing shows 60 of 318, the toolbar says a filter is on, export still holds
  all 318.
- **First failure to design for:** a condition on a column whose type is wrong (yes/no read as
  text keeps 0).
- **Fixture:** ovarian STRING after its join: padj < 0.05 matches 60 of 318; abs(log2FoldChange)
    > 1 matches 44 of 318 (FIXTURES 3.2). Find by name: TP53, 41 links. Fraud: find `acct-4471`.
- **Requirements:** 11, 12, 3.

### 4. Bring in a newer copy, keep my work

- **Who:** Alex (weekly: "re-running last week's work on new data is the reason Alex comes
  back"), the supply chain analyst (monthly supplier export), security, marketing. Workflows W03,
  W19.
- **How often:** every return visit for these readers.
- **Trigger:** a new export of the same file arrives (`suppliers-oct.csv` after
  `suppliers-sept.csv`).
- **Today:** there is no visible Replace control. Readers right-clicked the source row (7 of 8),
  clicked the file name, or used "Open project or file...", which opens the Data page as "Add to
  <project>" with Load, adding the same edges again. On the replace page, 8 of 8 left the
  weight's meaning unset although the old source had one.
- **Needs:** dropping or opening a file that matches the open source pre-chooses Replace, with
  Load beside it and its warning ("every link would repeat"). Replace carries the old mapping by
  header name ("Used your mapping from suppliers-sept.csv. Change"), keeps styles, runs, notes and
  filters, reruns the runs, and reports "+12 / -3 / 40 changed" and anything that no longer
  binds. One undo brings the old data back.
- **End state:** October's graph with September's styles and analysis on it, and a one-line
  difference.
- **First failure to design for:** the new file renamed a column, so one style no longer binds.
- **Fixture:** supply chain `suppliers.csv` plus `ships_to.csv`, 120 nodes, 400 edges
  (requirement 15's test); October: +12 nodes, -3, 40 changed (requirement 16's test). The studio
  case: a 41-edge friends file opened twice became 82 edges.
- **Requirements:** 16, 13's pre-chosen verb, the header-mapping half of 19.

### 5. Add a second file to this graph

- **Who:** the genomics user (blocking: an expression table onto STRING nodes), the
  bioinformatics researcher, intelligence (a second source of entities), the supply chain analyst
  (a node table and an edge table), the knowledge engineer. Workflows W09, W13, W20, W24.
- **How often:** sometimes for most, every session for genomics.
- **Trigger:** "I have the network; now add my measurements" or "here is another list of
  contacts".
- **Today:** the Data place "+" menu ("Add data...") and the Data page's "Add a table" let a reader
  add a node table and an edge table together. There is no join of a table onto existing nodes,
  and a second file that shares node ids silently drops its attributes for every node already in
  the graph.
- **Needs:** inside a project, a second file offers three plain verbs, one pre-chosen from how its
  ids and headers match: Add to this graph, Add columns to nodes, Replace data. Before commit the
  match line is visible: for Add, "adds 26 nodes, 62 links, updates 14"; for Add columns, the
  suggested key column, matched rows, rows not in the graph, nodes that get no value, repeated
  keys, and "19 more match ignoring case [Use]".
- **End state:** the expression columns sit on the nodes, the 6 unmeasured nodes are named, and
  the table is listed as a source.
- **First failure to design for:** the key column differs in case (`tp53` vs `TP53`).
- **Fixture:** `expression.tsv` joined onto `preferredName`: 340 rows, 312 matched, 28 rows not in
  the graph, 6 nodes with no value, adds log2FoldChange, padj, baseMean, go_terms (FIXTURES 3.1).
  Note: requirement 14's test uses 318 matched and 22 unmatched; boards follow FIXTURES.
- **Requirements:** 13, 14, 15.

### 6. Take the numbers out

- **Who:** Alex, Emma (blocking: a figure and a table for a paper), marketing (a ranked list for
  a deck), the recommender engineer (features for a model), genomics. Workflows W15, W25.
- **How often:** at the end of most sessions.
- **Trigger:** "I need this in a spreadsheet" or "send it to a colleague".
- **Today:** "Export..." in the main menu opens an Export dialog. Observed: readers look for
  export at the table first (18 of 21); the dialog opened on the edges and on graphty's own JSON
  format, with a long warning in program terms.
- **Needs:** from the table, export the node table as CSV by default, with every computed and
  joined column, and the choice to export only what is shown, the selection or a set. Any loss
  the format causes is stated in one line before writing.
- **End state:** a CSV of 318 rows with degree, PageRank and the joined expression columns.
- **Fixture:** ovarian STRING after a run and a join; "showing 60 of 318" exports 60.
- **Requirements:** 20, 35.

---

## Special cases: a few clicks away

### 7. Fix a column: its type, its role, its name

- **Who:** fraud (amount with "N/A"), the genomics user, supply chain, Alex (6 of 7 went to the
  column after loading to say what a number means).
- **How often:** sometimes; blocking when it happens, because a wrong type silently breaks
  filters.
- **Trigger:** a column shows the wrong type, or a filter matched nothing.
- **Today:** a column's role can be set only on the Data page before loading; after loading the
  attribute row shows a type glyph and nothing to change.
- **Needs:** the column's row (Data place and table header) opens one menu: type with "1 blank
  among 500", role (weight and its meaning, time, kind, name), rename, hide. Changing the type
  first says how many values will not convert. Each change is one undo step.
- **Fixture:** fraud `amount` with one "N/A" in 500 rows loads as a number with "1 blank"; fraud
  `opened` with 6 non-date values.
- **Requirements:** 17, 39, 33, 37.

### 8. Load from a server, expand, load more

- **Who:** the fraud analyst (starts each of 50+ alerts a day from one account and views its
  neighborhood), the genomics user (a gene list to STRING, or an NDEx network), the knowledge
  engineer (Neo4j, 10,000 to 10,000,000 nodes), security (SIEM), intelligence (seed entities).
  Workflows W06, W13, W20.
- **How often:** every session for these five; never for the rest.
- **Trigger:** the data is not a file.
- **Today:** "Open network data" lists NDEx, Neo4j and a web API as "on the way" and opens only a
  graph file at a web address. graphty-element can already do all of it.
- **Needs:** "Open network data" beside Open lists the sources; each draws its own fields, offers
  Test before Load ("sign-in refused" before any data loads), then browse (NDEx search "TP53") or
  query. A node from a source offers Expand and Collapse with a depth and a limit; a capped load
  says "5,000 of 40,000 loaded" with Load more. A reopened project shows its saved graph and asks
  before querying again. A gene list pasted with a species gives "287 found, 13 not found".
- **Fixture:** fraud: expand `acct-4471` (37 links) with a limit of 50, marked partial; Neo4j query
  matching 40,000 under a 5,000 limit; NDEx "TP53" search.
- **Requirements:** 23 to 27, 43.

### 9. Clean up what the load report found

- **Who:** fraud, supply chain ("Acme" spelled three ways), the knowledge engineer (blocking:
  duplicates), intelligence.
- **How often:** sometimes; only when the data needs it.
- **Trigger:** the load report or "what loaded" shows a problem line.
- **Needs:** cleanup appears as offers on the report line that found the problem, never as a
  standing panel: trim padded spaces, merge case-only id variants per group, combine repeated
  links (sum, with a count column), drop or keep self-loops, fill missing weights. Each is one
  undo step.
- **Fixture:** fraud: 5 repeated pairs combined with sum; 2 self-loops on acct-4471 and merch-88,
  kept; 14 links without amount. Supply chain: "Acme ", "ACME" and "Acme" merge to one; 40 blank
  ids.
- **Requirements:** 30, 31, 32.

### 10. Several filters, saved sets, an id list

- **Who:** Alex, fraud, security, genomics.
- **How often:** often for these, once the first filter is on.
- **Trigger:** a second condition that should stack, or "keep this set for next week".
- **Needs:** the condition card becomes an ordered list of steps only once there are two, each
  switchable and showing what it removed. Save as set, reapply after reopening, and paste a list
  of ids as a set ("47 matched, 3 not in graph").
- **Fixture:** ovarian STRING: step 1 padj < 0.05 (60 of 318), step 2 abs(log2FoldChange) > 1;
  security events, two steps on host kind and count.
- **Requirements:** 28, 34, 44.

### 11. Repeat last month's steps on this month's file

- **Who:** Alex, security, genomics, supply chain, Emma (a recipe from a colleague).
- **How often:** sometimes; the reason a weekly reader comes back.
- **Trigger:** a colleague's recipe file, or a new export with the same shape.
- **Needs:** a dropped recipe opens Apply. Columns bind by role, then name; the reader confirms
  only weight meanings; everything unbound is listed before anything runs ("column padj not
  found"); one undo reverses it. The steps of this project are listed in order with a methods
  paragraph.
- **Fixture:** a recipe needing `padj` applied to a table without it; supply chain October file.
- **Requirements:** 22, 19, 36.

---

## What the first screen must not show

From the principles and these flows: no server form, cleanup panel, filter-step list, recipe
editor, join settings or type menu until the flow that needs it; no default-valued setting (the
direction line is shown only when the file does not say, the "Import styles" switch only when the
file has styles); no zero-count line in any report; no internal word ("Key", "Edge id",
"Attribute", "source" as a column role) where a plain one exists.

## Questions for the owner's first look

- Is the server-data door (flow 8) acceptable as one menu item beside Open, with nothing on the
  first screen, until a study observes it?
- Should the mapping line name the name column ("Nodes are named by `gene`") on every file, even
  when the id and the name are the same column?
