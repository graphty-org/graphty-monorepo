# Data management requirements: evidence

This appendix holds the evidence behind
[data-management-requirements.md](data-management-requirements.md): the full text and evidence of
each requirement, the persona and job tables, an inventory of what earlier designs say, what
graphty-element and the app can do today, and the competitor research with its sources. Code and
documents were read on the `golden` branch on 2026-10-19; the network-source rows were read at golden commit 396327383, after those sources landed.

"FACT" marks something a cited file or page says. "JUDGMENT" marks the researchers' own call.
Persona evidence comes from design personas (`design/designloom/personas/`), which are hypotheses,
and design-studio results come from simulated sessions on the studio branch `design/studio-tier3`.
Competitor behavior that several products share is the stronger signal.

## A. Where short file names point

Evidence lines cite files by short name. They resolve as follows.

| Short name                                                                | Full path                                                      |
| ------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `<persona>.yaml`, `personas/<persona>.yaml`                               | `design/designloom/personas/<persona>.yaml`                    |
| `Wnn.yaml`, `workflows/Wnn.yaml`                                          | `design/designloom/workflows/Wnn.yaml`                         |
| `top-tasks.md`                                                            | `design/ui/framework/top-tasks.md`                             |
| `one-way-doors.md` (door N)                                               | `design/ui/framework/one-way-doors.md`, numbered decision N    |
| `graph-conventions.md`, `element-needs.md`, `task-flows.md`               | `design/ui/framework/`                                         |
| `tier1-design.md`, `element-gaps.md`                                      | `design/ui/tier1-real-app/`                                    |
| `recipe.md`, `container.md`, `export-mapping.md`, `README.md` (documents) | `design/documents/`                                            |
| `data-plan.md`                                                            | `design/documents/drafts/data-plan.md`                         |
| `network-sources-design.md`, `style-import-design.md`                     | `design/graph-io/`                                             |
| `agent-harness-features.md`                                               | `design/ai/agent-harness-features.md`                          |
| `undo-design.md`                                                          | `design/undo/undo-design.md`                                   |
| `app-shell-progressive-disclosure-design.md`, "shell"                     | `design/ui/app-shell-progressive-disclosure-design.md`         |
| `report.md`, `roster.md`, `owner-decisions.md` (studio)                   | `design/ui/studio/` on the studio branch `design/studio-tier3` |
| `session/...`, `catalog/...`, `data/...`, `config/...`, `ai/...`          | under `graphty-element/src/`                                   |
| `DataPage.tsx`, `choices.ts`, `useLoadDraft.ts`                           | `graphty/src/workspace/data-page/`                             |
| `DataPlace.tsx`                                                           | `graphty/src/workspace/data-place/`                            |

## B. Requirement evidence

Numbers match the main document. Here they run in number order; in the main document the order
within a tier is priority. "Jobs" are the job rows of section C; the first job named is the one
the requirement is ranked by.

### 1. Every data operation is one element command

- **Tier:** primary. **Owner:** graphty-element. **Jobs:** load-one-file, join-table-onto-nodes, replace-with-newer-data, keep-and-replay-steps.
- **Requirement:** Every data operation (load, mapping, join, replace, type change, cleanup, filter, rename, edit) is one graphty-element command: one undo step, one journal entry, callable from the session API and the AI harness, returning counts and { code, params } facts, never sentences.
- **Acceptance test:** A Node test loads a CSV, joins a table and replaces the data through the session API in about 15 lines with no internal concepts; each call adds exactly one undo step and one journal entry; the AI command list includes load and join.
- **Today:** Partly: loads and updateNodes are undoable; the journal is not saved (graphty-element/src/session/journal.ts:25-54); no load, join, type or cleanup AI command (graphty-element/src/ai/commands/builtin.ts:6-12)
- **Evidence:** PREREQUISITE. FACT: root CLAUDE.md (self-sufficient element; easy things easy; neutral facts); undo as one step per operation (design/undo/undo-design.md); data import essential to 187 AI use cases (design/ai/agent-harness-features.md F33). JUDGMENT: every app requirement below is only its display half; without this the app would compute it.

### 2. The app uses the element's load APIs

- **Tier:** primary. **Owner:** app. **Jobs:** set-structural-role.
- **Requirement:** The Data page takes its roles, weight candidate and other load facts from the element APIs that closed issues #926, #930, #910, #911, #927, #893 and #894 added, and deletes its own copies.
- **Acceptance test:** graphty/src contains no ROLES_BY_KIND and no workaround comment citing those closed issues; the role choices on the Data page equal LOAD_ROLES.
- **Today:** No: app keeps its own role list (graphty/src/workspace/data-page/choices.ts:55-63) though #926 is closed and the element exports LOAD_ROLES (graphty-element/src/session/draft.ts:82); DataPage.tsx:615 ignores DraftTable.weightCandidate (session/types.ts:1128)
- **Evidence:** PREREQUISITE. FACT: root CLAUDE.md 'The app MUST NOT work around graphty-element'; workaround comments at DataPage.tsx:154,341,496,615,629,707,850, useLoadDraft.ts:70,220, DataPlace.tsx:277-279 (graphty/src/workspace/data-page/, data-place/). Cheap and unblocks honest testing of every load requirement.

### 3. One shape for which elements

- **Tier:** primary. **Owner:** graphty-element. **Jobs:** filter-hide, select-by-condition, save-filter-or-set, export-data.
- **Requirement:** Every input that names 'which elements' (style layer, filter, selection, saved set, algorithm scope, export scope) accepts a RuleTree, and the element counts the elements any RuleTree matches.
- **Acceptance test:** The same RuleTree passed to a style layer, a filter, a selection and an export scope matches the same elements; scope.count returns that number without the app evaluating the rule.
- **Today:** No on golden: three shapes -- Selector (styles/selector.ts:63-104), RuleTree (catalog/types.ts:1197), Query/Scope (catalog/types.ts:103,1163); Selector match:'rule' only on the unmerged design/studio-tier3 branch
- **Evidence:** PREREQUISITE for the single condition card. FACT: style layers take Selector (graphty-element/src/session/styles/selector.ts:63-104), filters and rule sets take RuleTree (graphty-element/src/catalog/types.ts:1197), scopes and selection take a JMESPath Query or a Scope (catalog/types.ts:103,1163; selection/targets.ts:111-136). JUDGMENT: without it the app translates one card into three shapes, which the workaround rule forbids.

### 4. Load a file by any door

- **Tier:** primary. **Owner:** both. **Jobs:** load-one-file.
- **Requirement:** A reader can load one graph file or edge table by drop, file picker, paste or URL, and each door says the file is read in this browser and not uploaded.
- **Acceptance test:** The same fixture loaded by each of the four doors yields identical node and edge counts; each door shows the read-locally line.
- **Today:** Yes (drop, pick, paste, URL; design inventory (section D) J1-J3)
- **Evidence:** FACT: every-session/blocking for 10 of 13 app personas (jobs-matrix load-one-file); primary in every graph tool (graph tools 10 (section F)); intelligence 'handle sensitive data' (intelligence-analyst.yaml:483,494); files never uploaded (tier1-design.md:437). The file picker covers devices without drag and drop.

### 5. A clean file is one Enter

- **Tier:** primary. **Owner:** both. **Jobs:** load-one-file.
- **Requirement:** A file the element reports as needing no reader choice opens on the Data page with every check green and focus on Load, so it loads with one Enter.
- **Acceptance test:** A clean GraphML (including one with a declared weight) and a two-column CSV each draw after exactly one Enter from the moment of the drop; 'needs no choice' comes from an element field, not an app heuristic.
- **Today:** Yes per design (tier1-design.md:368-378); 'confident' is not yet an element fact
- **Evidence:** FACT: tier1-design.md:368-378 ('a clean drop is one Enter'); Emma wants minimal clicks (expert-emma.yaml:238). REJECTED: skipping the Data page for self-describing files -- one Enter is already the minimum and keeps the load report in view.

### 6. A dropped file goes where it belongs

- **Tier:** secondary. **Owner:** both. **Jobs:** load-one-file, keep-and-replay-steps.
- **Requirement:** A dropped recipe, style file or project goes to Apply or Open, not the Data page; a file no reader recognizes offers 'Read as...' with the registered formats.
- **Acceptance test:** Drop a recipe: Apply opens; drop a .txt edge list with an unknown extension: 'Read as...' lists CSV and opens it as CSV.
- **Today:** Unverified on golden
- **Evidence:** FACT: drop choice step and 'Read as...' (design/ui/framework/task-flows.md section 2); design/ui/mockups/artboards/ImportParseError.dc.html; design/ui/framework/task-flows.md section 2.

### 7. Column roles at load

- **Tier:** primary. **Owner:** both. **Jobs:** set-structural-role, set-descriptive-role.
- **Requirement:** Before loading, the reader sees each column's guessed role (from the element's LOAD_ROLES, including time and a node or edge kind) and whether the graph is directed, and can change any role, skip a column, flip rows-are-nodes/edges, or set direction without leaving the page; when every guess is confident the page states the mapping in one line with the per-column choices one action away.
- **Acceptance test:** Load bait_prey.tsv: guesses are bait=source, prey=target, confidence=weight, entity_type=kind; a confident file shows the one-line summary; flipping rows-are twice restores the original counts; each change is one action by mouse or keyboard.
- **Today:** Partly: roles key, label, time, source, target, weight, edgeId (graphty-element/src/session/types.ts:1147); no kind role, no skip; app shows its own copy
- **Evidence:** FACT: W18 pain 'treating edge list as node list' (workflows/W18.yaml:84); Cytoscape click-header roles (graph tools 2 (section F)); time is daily for fraud, cyber, intelligence (fraud-analyst.yaml:348, cybersecurity-analyst.yaml:177, intelligence-analyst.yaml:497); Elena 'overwhelming number of options' (explorer-elena.yaml:38). JUDGMENT: name the role 'kind' to avoid clashing with value type. ColumnRole is a closed union, so the kind and skip roles arrive through a new open-union field instead (main document, "Decided here", item 1).

### 8. Load report shows only real problems

- **Tier:** primary. **Owner:** both. **Jobs:** preview-validate-before-load.
- **Requirement:** Before committing, the reader sees only the nonzero problems: edges naming unknown nodes (Add / Leave out), repeated edges, repeated ids, numbers in another locale (decimal commas), and rejected rows each with its row number and reason, with 'Skip these rows' as a way through.
- **Acceptance test:** load-report-mixed.csv shows exactly 18 unmatched ends, 5 repeated edges, 2 repeated ids, 3 decimal-comma weights and a refused row 412 with its code; a clean file shows none of these lines.
- **Today:** Partly: LoadReport has unmatched, duplicates, repeated and errors (graphty-element/src/data/report.ts:18-28,86-151), DraftRow.line exists (session/types.ts:1152-1155); a refused row carries no reason; app shows only unmatched ends
- **Evidence:** FACT: genomics 'no count of what matched' (genomics-cytoscape-user.yaml:37); 'no row number' (plugin-author-domain-researcher.yaml:38); a decimal-comma weight skips the whole edge (graph-io/src/common/codes.ts:618-622); Tableau Data Interpreter appears only when needed (BI [11] (section G)). Element adds a reason code to refused rows.

### 9. The weight's role is visible and never blocks

- **Tier:** primary. **Owner:** both. **Jobs:** set-structural-role.
- **Requirement:** When a column is the weight, its role (distance, similarity, capacity or unknown) is shown on the weight line with the element's guess, can be changed in one action, is stored on the attribute, and is read by every later run; Load is never blocked by it.
- **Acceptance test:** Fixture A-B 0.9, B-C 0.9, A-C 0.1: as similarity the shortest path A to C goes through B; as distance it is the direct edge; with the role unknown the file still loads with one Enter and a run names the role it assumed.
- **Today:** Partly: meaning exists only per run as distance|strength (graphty-element/src/session/runs/types.ts:169-197), defaults to strength (session/data.ts:1062); no meaning on the attribute or the Data page
- **Evidence:** FACT: cost-of-error keeps weight visible (top-tasks.md:46-61); roles and unknown-role behavior, 'strength' is not a role name (design/ui/framework/graph-conventions.md:88-91); door 21 (one-way-doors.md:933). REJECTED: refusing Load until confirmed -- contradicts graph-conventions' unknown-role row and clean-file-one-enter.

### 10. What loaded, in plain words

- **Tier:** primary. **Owner:** app. **Jobs:** check-what-loaded.
- **Requirement:** After a load the Data place shows node and edge counts, direction, number of separate groups and the largest, nodes with no links, and each attribute's value type and percent filled, all read from the element.
- **Acceptance test:** Load an export with 214 isolates: the Data place reads '3 separate groups; 214 with no links' and 'label 61% filled' without running an algorithm; no count is computed in graphty/src.
- **Today:** Element done: data.statistics() and attribute completeness (graphty-element/src/catalog/types.ts:1205-1214 statistics; AttributeDescriptor.completeness); app display partial
- **Evidence:** FACT: top-tasks task 1 every session (top-tasks.md:64-73); Elena has no graph literacy (explorer-elena.yaml:12), so the app words avoid 'component' and 'isolate'; Power Query profiling is off by default (BI [22] (section G)).

### 11. Find by name or value

- **Tier:** primary. **Owner:** app. **Jobs:** select-by-condition.
- **Requirement:** A reader types a name or value and the matching element is selected and brought into view.
- **Acceptance test:** Type an account number: that node is selected and centered.
- **Today:** Yes (find box)
- **Evidence:** FACT: top-tasks task 4, above filter at task 6 (top-tasks.md:89-95); every-session for fraud, cyber, intelligence (jobs-matrix). Ranked above filtering per that order.

### 12. One condition card: Select or Hide

- **Tier:** primary. **Owner:** both. **Jobs:** filter-hide, select-by-condition.
- **Requirement:** A reader states conditions on one condition card and chooses Select or Hide; conditions on the card must all hold, 'X of Y' is shown, and hiding never deletes data.
- **Acceptance test:** Card 'score > 0.7' with Hide: 'showing 140 of 900'; switch to Select: 140 selected, none hidden; a full export still holds 900 nodes.
- **Today:** Partly: visibility.set takes one RuleTree; selection takes text, expression or scope (selection/targets.ts:111-132)
- **Evidence:** FACT: required by 18 of 25 workflows (top-tasks.md:102-104); Cytoscape's filter selects by default (https://manual.cytoscape.org/en/latest/Finding_and_Filtering_Nodes_and_Edges.html); Kumu hide-only needs a separate Focus (https://docs.kumu.io/guides/filter); Flourish deleting filter is an anti-pattern (data-prep tools 4 (section H)). Depends on one-condition-shape.

### 13. Add a second file to this graph

- **Tier:** primary. **Owner:** both. **Jobs:** add-second-file.
- **Requirement:** Inside a project a second file offers three verbs (Add to this graph, Add columns to nodes, Replace data), pre-chosen from element facts about how the file's ids and headers match the graph; Add lets the reader keep or update nodes that already exist and states added, updated and unchanged counts before committing.
- **Acceptance test:** Add a fixture sharing 14 ids with one changed attribute: before commit the page shows added 26 nodes, 62 edges, updated 14; under update all 14 carry the new value; 'Open as a new graph' is not offered inside the project.
- **Today:** Partly: a merge silently skips existing nodes (graphty-element/src/session/project/ingest.ts:568-570); no matched/updated counts
- **Evidence:** FACT: 'Inside a project the page never says Open as a new graph' (tier1-design.md:372-375); i2 enriches the existing item on match (https://docs.i2group.com/anb/9.4.0/record_match_local.html); Gephi users land in two workspaces by mistake (graph tools 1 (section F)). Element: additive LoadChoices.existing 'keep'|'update' (default keep) plus a per-column matchesGraph fact; the app passes update.

### 14. Join a table onto nodes

- **Tier:** primary. **Owner:** graphty-element. **Jobs:** join-table-onto-nodes, map-identifiers.
- **Requirement:** 'Add columns to nodes' joins a table by one key column (suggested) and, before committing, shows matched rows, table rows not in the graph, nodes that get no value, repeated keys, how many more would match ignoring case and spaces, and the rule for clashing column names.
- **Acceptance test:** Join a 340-row logFC table by symbol: 318 matched; 22 not in graph; TP53 matches 2 rows; 4,682 nodes get no value; '19 more match ignoring case [Use]'; symbol suggested as key; joined columns carry origin 'joined'.
- **Today:** No (issue #298 open)
- **Evidence:** FACT: every-session/blocking for genomics (workflows/W20.yaml:59-60); Cytoscape's top complaint is a silent zero-match join (graph tools 11 (section F)); whitespace and case are named causes (graph tools 2 (section F)); Power Query key suggestion (BI [23] (section G)). Simplest element call takes only the table and key; all defaults neutral.
- **Saved as:** the table is a source in the sources member and the join a recipe command naming the key columns; matches are recomputed on open, never stored. Owner decision 2026-10-19 on what a project file records (main document, "Decided by the owner"), item 9.

### 15. A node file and an edge file together

- **Tier:** primary. **Owner:** both. **Jobs:** two-tables-one-network.
- **Requirement:** A reader loads a node file and an edge file together as one network in a single Data page visit.
- **Acceptance test:** Drop suppliers.csv (120 rows) and ships_to.csv (400 rows) in either order: one network of 120 nodes and 400 edges with supplier attributes attached.
- **Today:** Yes for one node and one edge file; app keeps a pick-order workaround (useLoadDraft.ts:70)
- **Evidence:** FACT: Gephi, Polinode, Kumu and Flourish use node and edge sheets (graph tools 1,4,5 (section F)); supply chain merged in Excel first (studio branch design/studio-tier3, design/ui/studio/tier2/roster.md:153-155, simulated). 'Two sheets' dropped: no xlsx reader exists in graph-io/src or graphty-element/src.

### 16. Replace data, keep the analysis

- **Tier:** primary. **Owner:** both. **Jobs:** replace-with-newer-data.
- **Requirement:** Replace data has a visible control; it keeps style layers, runs, sets, notes, filters and joined tables (re-applying joins with their match line), reruns runs, and reports nodes added, removed and changed plus everything that no longer binds; one undo restores the old data and results.
- **Acceptance test:** Replace sept.csv with oct.csv: styles, sets and notes remain; the join reapplies and shows its match line; the summary reads +12 / -3 / 40 changed and lists a rule naming a missing column as a code; one undo restores September and its results.
- **Today:** Partly: Replace hidden in a '...' menu (studio branch design/studio-tier3, design/ui/studio/tier2/report.md:190); no change summary
- **Evidence:** FACT: top-tasks task 12 (top-tasks.md:164-169); Power Query refresh replays steps (BI [17][27] (section G)); Cytoscape tables bind to later networks (graph tools 2 (section F)); Elena fears breaking things (explorer-elena.yaml:41). Element computes the diff and the unbound list.

### 17. See and fix a column's type

- **Tier:** primary. **Owner:** graphty-element. **Jobs:** set-column-type.
- **Requirement:** Each column shows its value type and how many values do not fit it; the reader changes the type in one action and sees how many values will not convert, and what happens to them, before applying.
- **Acceptance test:** amount with one 'N/A' among 500 numbers loads as number with '1 blank'; convert '$1,200' text to number: '3 will not convert, left empty' before apply; restore SEPT2-as-date to text.
- **Today:** No: type read-only, no date kind, inference has no tolerance (graph-io/src/common/text.ts:1-13)
- **Evidence:** FACT: type fix is first-layer in Tableau, Power Query, Sheets, Datawrapper (BI cross-tool table (section G)); Kumu 'Size by' empty until Number (graph tools 4, section F); one N/A turns a column to text today. Door 20 measurement level (one-way-doors.md:313). Conversion options stay one step in.
- **Saved as:** the type and its format in the graph's columns member (JSON Schema), and the change as a recipe command, so a recipe applied to new data reproduces the types. Owner decision 2026-10-19 on what a project file records (main document, "Decided by the owner"), item 8.

### 18. Autosave and reopen

- **Tier:** primary. **Owner:** both. **Jobs:** reopen-as-left, know-provenance.
- **Requirement:** Work autosaves; reopening a project restores every source, mapping, join, filter and set, and reports anything that did not reload.
- **Acceptance test:** Load, join, filter; reload the page: the same counts, join and filter return; a project whose source file moved names it as not reloaded.
- **Today:** Partly: app autosave and recent projects (graphty/src/workspace/autosave/, workspace/project/); version history not in element (task-flows.md 2.2)
- **Evidence:** FACT: 'Resuming work costs nothing, because the project autosaves' (top-tasks.md bookends); intelligence 'Inability to save and share investigation state' (intelligence-analyst.yaml:514).

### 19. Known file shapes map themselves

- **Tier:** secondary. **Owner:** both. **Jobs:** keep-and-replay-steps, set-structural-role.
- **Requirement:** A file whose headers match a mapping the reader used before, or a known export (such as STRING), is mapped automatically, and the Data page names the mapping in one line with Change; matching is by header name, and unmatched or new columns are listed.
- **Acceptance test:** Load two same-headed exports in different column order: the second needs no changes and reads 'Used your mapping from sept.csv'; an export with one new column lists it as unmapped.
- **Today:** No
- **Evidence:** FACT: Maltego saves mappings by default (https://docs.maltego.com/support/solutions/articles/15000010797-import-graph-from-table); Airtable remembers mappings (data-prep tools 2 (section H)); design/ui/mockups/artboards/ImportRecognised.dc.html; Power Query breaks on position (BI [18][28] (section G)). A saved mapping is a recipe with only TableReading (design/documents/recipe.md); the app stores the reader's own (root CLAUDE.md), the element checks fit without throwing.

### 20. Export everything

- **Tier:** primary. **Owner:** graphty-element. **Jobs:** export-data.
- **Requirement:** A reader exports node and edge tables with every computed and joined column, with missing values and caveats written as door 61 decides, and a note of anything the format loses before writing.
- **Acceptance test:** Export after a run and a join: the CSV holds the computed and joined columns; exporting to a format without edge attributes states the loss first.
- **Today:** Yes (whole-graph export)
- **Evidence:** FACT: marketing exports ranked lists, often/blocking (marketing-analyst.yaml:25); eleven workflows (top-tasks.md bookends); door 61 (one-way-doors.md:1020); loss note (design/documents/export-mapping.md section 2).

### 21. Open a sample

- **Tier:** primary. **Owner:** both. **Jobs:** open-sample.
- **Requirement:** The start screen offers sample datasets and generators that open in one click.
- **Acceptance test:** Each sample opens with its documented node count.
- **Today:** Yes
- **Evidence:** FACT: W14 'try sample data first' (workflows/W14.yaml:61); Cytoscape Web sample networks (graph tools 3 (section F)). Zero cost, the novice's door.

### 22. Apply a recipe someone gave you

- **Tier:** secondary. **Owner:** both. **Jobs:** keep-and-replay-steps.
- **Requirement:** A reader applies a recipe someone gave them to their data in one command; attributes bind by name, the reader confirms only weight roles and mismatched measurement levels, everything unbound is listed before anything runs, and one undo reverses it.
- **Acceptance test:** Apply a recipe to a table lacking padj: 'column padj not found' is listed before any step runs; one undo removes the recipe's effects.
- **Today:** No: recipe format specified, not implemented (design/documents/README.md:10-16)
- **Evidence:** FACT: 'Start from a recipe' is a bookend (top-tasks.md bookends); recipe decisions (design/decisions/2026-09-28-document-formats-first-version.md); rebinding via openDocument(text, { columns }) (design/documents/README.md:206-207). Writing recipes stays advanced.

### 23. Connect to a source and test it

- **Tier:** secondary (server data). **Owner:** both. **Jobs:** load-from-network-source.
- **Requirement:** A reader picks a registered source, fills in fields drawn from its descriptor (endpoint, database, sign-in) and tests the connection before loading; the test reports reachable, sign-in accepted, and the reason when not (refused sign-in, blocked by the browser, local network).
- **Acceptance test:** A Neo4j endpoint with a wrong password reports a refused sign-in before any data loads; with the right one it reports success; the app holds no source-specific code.
- **Today:** Element yes, app no. FACT: `data.testSource(source, options)` returns a `SourceProbe` (graphty-element/api/session.api.md on golden); `sourceDescriptors()` in `./catalog`; six built-in sources: ndex, cypher, neo4j, neptune, rest, openalex (graph-io/src/sources/builtins.ts); STRING and deps.dev are sample REST mappings (graph-io/src/sources/rest/samples/). No SPARQL source is registered. The app's NetworkDataDialog.tsx lists NDEx, Neo4j and Web API as "on the way" and opens only a URL.
- **Evidence:** FACT: knowledge engineer 'Writes SPARQL or Cypher queries' (knowledge-engineer.yaml:25); W13 phase 2 'Extract entities from source systems (databases, documents, APIs)' (W13.yaml:42), node_count 10,000-10,000,000 (W13.yaml:26); cybersecurity 'Builds graphs from SIEM events' (cybersecurity-analyst.yaml:23), W07 node_count 100000+ and phase 2 'Convert hypothesis into a graph query' (W07.yaml:34,50); genomics pulls from STRING (genomics-cytoscape-user.yaml:27); design/graph-io/network-sources-design.md sections 6 and 14.3. Competitor: Cytoscape Web 'Open Network(s) from NDEx' on the Data menu (graph tools 3, section F). JUDGMENT: a graph of millions of nodes is queried, not opened, so for these personas connecting is the first job.

### 24. Browse or query what to load

- **Tier:** secondary (server data). **Owner:** both. **Jobs:** load-from-network-source.
- **Requirement:** A reader searches a repository and picks (an NDEx network by name), writes a query or picks labels and relationship types for a database, or fills a web API's parameters, and loads the result as one undo step.
- **Acceptance test:** An NDEx search for 'TP53' lists networks with node and edge counts; choosing one draws it; one undo removes it.
- **Today:** Element yes, app no. FACT: `data.listSource(source, query, options)` returns neutral rows; NDEx implements list through its v2 network search (graph-io/src/sources/ndex/index.ts:7); `data.import({ source, config })` loads (the `data.import-source` history code).
- **Evidence:** FACT: W07 phases 2-3 query translation and execution (W07.yaml:50-52); W13 phase 2 (W13.yaml:42); design/graph-io/network-sources-design.md sections 5 and 14.2.

### 25. Expand from the server and collapse

- **Tier:** advanced. **Owner:** both. **Jobs:** expand-from-source.
- **Requirement:** From a node a source brought, a reader fetches its neighbors from the server with a depth, direction, relationship types and a limit on new nodes; new nodes appear beside the seed; each node states whether it has more to show; collapse removes what that node's expansions added and nothing else.
- **Acceptance test:** In a Neo4j graph, expanding one account with limit 50 adds at most 50 nodes and marks it partial; expanding again continues from the saved cursor; collapse restores the graph; each is one undo step.
- **Today:** Element yes, app no. FACT: `data.expand(ids, ExpandOptions)`, `data.collapse(id)` returning `CollapseResult` (session.api.md on golden); `ExpandBehavior.trigger` "none" | "click" | "double-click", default "none"; facts `_source.expansion`, `_source.hidden`, `_source.loads` (graphty-element/src/session/sources/ids.ts); `W_COLLAPSE_KEPT` for edited nodes. NDEx, Cypher and REST sources implement expand.
- **Evidence:** FACT: W06 phase 1 'View flagged entity in its network context (1-2 hop neighborhood)' (W06.yaml:65) on 10,000-1,000,000 nodes (W06.yaml:50); fraud handles 50+ alerts daily (fraud-analyst.yaml:6); neighborhood-expansion is required by W05, W06, W09 and W17 (design/designloom/capabilities/neighborhood-expansion.yaml), which cover fraud, intelligence and analyst-alex; the capability asks for depth 1-5, type filters, collapse and per-node expansion tracking. design/graph-io/network-sources-design.md sections 5.1 and 14.4.

### 26. Size limits and load more

- **Tier:** secondary (server data). **Owner:** both. **Jobs:** load-from-network-source, load-subset.
- **Requirement:** Every source load and expansion takes size limits (nodes, edges, bytes, requests, time) that the application sets; a capped load keeps what came first, reports which cap it reached and whether more remains, and Load more fetches the next page.
- **Acceptance test:** A query matching 40,000 nodes under a 5,000-node limit loads 5,000, says more remain, and one Load more adds the next page.
- **Today:** Element yes, app no. FACT: `SourceLoadOptions.limits` (`SourceLimitOptions`: maxNodes, maxEdges, maxBytes, maxRequests, timeoutMs; graph-io/src/sources/types.ts:177-191) and `onLimit`; `data.more(options)`; every default is no limit (design/graph-io/network-sources-design.md section 9).
- **Evidence:** FACT: 'Visualizations become unusable during active incidents with high event volume' (cybersecurity-analyst.yaml:41); neighborhood-expansion.yaml asks to warn above 500 and block above 2,000 nodes. JUDGMENT: the numbers are the app's settings, per the root CLAUDE.md rule that the element offers choices and consumers make them.

### 27. Reopen asks before it queries; credentials

- **Tier:** secondary (server data). **Owner:** both. **Jobs:** load-from-network-source, know-provenance.
- **Requirement:** A reopened project shows its saved rows offline and runs no query by itself; each waiting load names its source, endpoint, whether it has a query, whether the server is on the local network and whether sign-in is needed, and runs when the reader approves. A secret is never in the project file, the undo journal or an event; the file holds only the credential's kind, origin and user name. A remembered credential is found by source and origin, so the reader is asked only when none is remembered; remembered credentials are listed and removable.
- **Acceptance test:** A saved Neo4j project reopened in a new browser shows its graph, lists one waiting load needing sign-in, and fetches nothing until approved; the saved file contains no password; forgetting the credential makes the next run ask again.
- **Today:** Element yes, app no. FACT: `data.pendingSourceLoads()` returns `PendingSourceLoad { id, source, endpoint, hasQuery, isLocalNetwork, authRequired }`; `data.runPendingSourceLoad(id, options)`; `./credentials` entry point with `CredentialStore` (remember, lookup by source and origin, list, forget, forgetAll; credentials.api.md on golden); `SourceLoadRecord.credential` is a `SourceCredentialIdentity`; project member `graphty-sources` (`SOURCE_RECORD_MEMBER`).
- **Evidence:** FACT: 'Maintain operational security' (intelligence-analyst.yaml:19); design/graph-io/network-sources-design.md sections 6.4, 14.2 and 16. JUDGMENT: a shared file that ran its stored query on open would reach a database on the reader's machine, so approval is a security floor, not a preference.

### 28. Ordered filter steps

- **Tier:** secondary. **Owner:** graphty-element. **Jobs:** filter-hide.
- **Requirement:** Once a second filter is added, filters become an ordered list of steps that can be switched off, each showing what it removed, saved in the project, in the shape door 25 decides.
- **Acceptance test:** Steps 'largest group' then 'score > 0.7': each shows its removed count; switching step 1 off restores its elements; reopening keeps both steps.
- **Today:** No: one rule tree per session (capability table (section E) section 2 item 6)
- **Evidence:** FACT: door 25 FilterStep shape (one-way-doors.md:514-530); 'every filter step changes what is computed' (top-tasks.md); Gephi declined per-subfilter toggles for newcomers (https://blueprints.launchpad.net/gephi/+spec/subfilter-toggle); Tableau context filters confuse (BI [13] (section G)). Studio 7/7 tested the first filter only (studio branch design/studio-tier3, design/ui/studio/tier2/report.md:168, simulated).

### 29. Sources list

- **Tier:** secondary. **Owner:** graphty-element. **Jobs:** know-provenance, add-second-file.
- **Requirement:** The Data place lists every load as a source with its counts, naming its file or its source, endpoint and query, and once a graph has two or more sources an element's details name the sources that supplied it.
- **Acceptance test:** Load two files and one Neo4j query: three sources listed with counts, the query among them; an edge's details name its source without an extra click.
- **Today:** Partly. FACT: network loads are listed by `data.loads()` (`SourceLoadRecord`: source, config, endpoint, loadedAt, pages) and each node carries `_source.loads`; file loads are not in that list, and a file merge still overwrites the one `data.source()` (ingest.ts:474).
- **Evidence:** FACT: door 29 source attribute holding a list (one-way-doors.md:976); evidence trail (intelligence-analyst.yaml:513, fraud-analyst.yaml:343); Tableau union origin (BI [10] (section G)).
- **Saved as:** the sources member (the experimental `graphty-sources` member extended to files and URLs) and the reserved `_source.loads` column. Owner decision 2026-10-19 on what a project file records (main document, "Decided by the owner"), items 2 and 4.

### 30. Cleanup offers

- **Tier:** secondary. **Owner:** both. **Jobs:** clean-values.
- **Requirement:** When the element finds blank ids, padded spaces, case-only id variants, mixed types, self-loops, missing weights or repeated edges, the load report offers each fix with its count; the element reports coded counts and each fix is a load choice whose default changes nothing.
- **Acceptance test:** 'Acme ' / 'Acme' and 40 blank supplier ids show two offers with counts; each accepted fix is one undo step and undo restores the exact original values.
- **Today:** Partly: duplicateIds and repeatedEdges settings exist (config/DataConfig.ts:67), not shown
- **Evidence:** FACT: Tableau Data Interpreter shown only when messy (BI [11] (section G)); Neo4j excludes blank ids (graph tools 7 (section F)); knowledge engineer every-session (knowledge-engineer.yaml:36); old shell validation set (design/ui/mockups/artboards/ValidationPopout.dc.html).

### 31. Merge exact duplicates

- **Tier:** advanced. **Owner:** graphty-element. **Jobs:** resolve-duplicate-nodes.
- **Requirement:** A reader reviews groups of exact and case- or space-variant duplicate nodes, approves each group, and chooses per attribute how values combine (first, sum, list, earliest); undo splits them.
- **Acceptance test:** 'Acme', 'ACME' and 'Acme ' form one group; approving merges them with the chosen rules; undo restores three nodes.
- **Today:** No
- **Evidence:** FACT: intelligence resolve-duplicates phase (workflows/W09.yaml); fraud across accounts (fraud-analyst.yaml:358); knowledge engineer blocking (W13.yaml:46,74); Linkurious detects at import, Kumu docs dwell on it (graph tools 4 and 8, section F); OpenRefine approve-each (data-prep tools 1 (section H)). Fuzzy groups are advanced.

### 32. Graph properties

- **Tier:** secondary. **Owner:** graphty-element. **Jobs:** set-structural-role.
- **Requirement:** A reader declares how parallel edges combine (keep, or merge with a per-weight reduction sum/max/min and a count), whether self-loops are kept, and whether the graph is two-mode; the element offers 'treat as undirected' when edges are mostly reciprocal.
- **Acceptance test:** Merge parallel edges with sum: weights add and a count column appears; a 95% reciprocal file offers undirected with that figure.
- **Today:** Partly: repeated-edge rule exists, default keep; no declared reductions, self-loop or two-mode setting
- **Evidence:** FACT: graph-conventions.md section 1 and Reductions row; element-needs.md 'Declare undirected'; NodeXL merge adds a count (https://www.slideshare.net/slideshow/2009-node-xl-overview-social-network-analysis-in-excel-2007/1153472). Direction itself is primary in roles-at-load.

### 33. Time spans

- **Tier:** secondary. **Owner:** graphty-element. **Jobs:** set-descriptive-role.
- **Requirement:** A reader marks start and end columns and a unit for time, and the element counts values that do not read as times.
- **Acceptance test:** Mark call_start and call_end with unit seconds: 7 unreadable values counted and readable back from the element API.
- **Today:** Partly: a time role exists; no start/end, unit or date kind
- **Evidence:** FACT: often/important for intelligence, supply chain, cyber, fraud (jobs-matrix set-descriptive-role). The single time chip is primary in roles-at-load.

### 34. Named filters and sets

- **Tier:** secondary. **Owner:** app. **Jobs:** save-filter-or-set.
- **Requirement:** A reader saves a filter or selection under a name, reapplies it, combines sets (and, or, minus) with counts, and renames, deletes or exports saved filters, sets, mappings and recipes from one list.
- **Acceptance test:** Save 'lateral movement via RDP', reopen the project, reapply it; combine two sets and see the count; delete a saved mapping.
- **Today:** Element done: rule sets (catalog/types.ts:1322-1336) and SetsApi; app UI no
- **Evidence:** FACT: a saved filter is a rule set already (graphty-element/src/catalog/types.ts:1322-1336); 'No way to save analysis patterns' (analyst-alex.yaml:54); design/ui/mockups/artboards/SavedItems.dc.html.

### 35. Export scope

- **Tier:** secondary. **Owner:** graphty-element. **Jobs:** export-data.
- **Requirement:** A reader limits an export to the filtered view, a set or the selection, and can leave out chosen columns.
- **Acceptance test:** With 'showing 140 of 900' choose what is shown: the CSV has 140 nodes; leaving out 'ssn' removes that column.
- **Today:** No: exportGraph has no scope (capability table (section E) section 2 item 7)
- **Evidence:** FACT: marketing exports ranked subsets (marketing-analyst.yaml:25); redacting before sharing (design/designloom/personas/intelligence-analyst.yaml:483). Takes a RuleTree (one-condition-shape).

### 36. The list of data steps

- **Tier:** secondary. **Owner:** graphty-element. **Jobs:** keep-and-replay-steps, know-provenance.
- **Requirement:** The reader sees, in order, every step that changed the data (the element's saved undo journal, not a second model), can undo one, and can copy it as methods text the app writes from coded steps.
- **Acceptance test:** After load, join, type change and two filters the list shows five entries in order; the methods text names files, parameters and counts.
- **Today:** Undo yes; journal not saved (journal.ts:25-54)
- **Evidence:** FACT: Power Query applied steps (BI [27] (section G)); methods-section need (genomics-cytoscape-user.yaml:417,436, bioinformatics-researcher.yaml:106); 'methods text is written from the records' (top-tasks.md bookends); door 9 (one-way-doors.md:786). Tableau has no step list (BI [1][11][14] (section G)).

### 37. Rename, delete, fill empty

- **Tier:** secondary. **Owner:** graphty-element. **Jobs:** rename-hide-columns, clean-values.
- **Requirement:** A reader renames an attribute (every style layer, filter, set and run input that reads it follows), deletes an attribute, fills empty values, or writes one value to many elements, each as one undo step.
- **Acceptance test:** Rename n_msgs_30d: a style reading it still paints and a filter on it still counts; fill 40 empty regions with 'unknown' in one undo step.
- **Today:** No rename, delete attribute or fill-empty
- **Evidence:** FACT: no rename in element (capability table (section E) section 1); fill empty, delete attribute in old shell (app-shell-progressive-disclosure-design.md:1215-1231); bulk write (element-needs.md).

### 38. Hide and reorder columns

- **Tier:** secondary. **Owner:** app. **Jobs:** rename-hide-columns.
- **Requirement:** A reader hides and reorders attribute columns in the table, and the choice persists after reopening.
- **Acceptance test:** Hide 25 of 30 columns, reorder two, reopen: the same five show in that order.
- **Today:** Hide in table yes
- **Evidence:** FACT: '30 columns crammed into a preview of five rows' (genomics-cytoscape-user.yaml:38). Presentation, so the app's (root CLAUDE.md).

### 39. Change a role after loading

- **Tier:** secondary. **Owner:** graphty-element. **Jobs:** set-structural-role.
- **Requirement:** From the what-loaded summary a reader reopens the column mapping and changes a role after loading, as one undo step that keeps styles and runs.
- **Acceptance test:** Loaded with weight=count, change weight to score: runs rerun on score; undo restores count.
- **Today:** No
- **Evidence:** FACT: element-needs.md 'Re-map columns after a load'. JUDGMENT: a wrong role is often noticed only after drawing.

### 40. Edit values

- **Tier:** advanced. **Owner:** both. **Jobs:** edit-values.
- **Requirement:** A reader edits a cell and adds or removes a node (with its edges) or an edge; each edit is one undo step and stays marked as edited through save and export.
- **Acceptance test:** Add a link from a report and correct a department name; both show as edited after reopening; undo reverses each.
- **Today:** Element verbs yes (updateNodes, add/remove); table read-only
- **Evidence:** FACT: Gephi Data Laboratory and Kumu edit cells; Datawrapper marks edits (data-prep tools 4 (section H)); graph editing tagged for 256 AI use cases (agent-harness-features.md F32). The edited mark is element state.

### 41. Extract a subnetwork

- **Tier:** secondary. **Owner:** graphty-element. **Jobs:** keep-subnetwork, merge-or-compare-graphs, filter-hide.
- **Requirement:** A reader keeps only the largest group in one action, and saves a filter or set as a subnetwork while keeping the parent.
- **Acceptance test:** 'Keep only the largest group' from what-loaded leaves the largest group; 'Save as subnetwork' from a set keeps the full network reachable.
- **Today:** No
- **Evidence:** FACT: genomics keeps full network, largest component and clusters together (genomics-cytoscape-user.yaml:421,427,433); W20 phase 2; bioinformatics exports subnetworks (:104). Until several graphs per project is decided, export-scope covers it.

### 42. One table, several kinds of node

- **Tier:** secondary. **Owner:** graphty-element. **Jobs:** one-table-several-kinds, set-structural-role, two-tables-one-network.
- **Requirement:** From one event table a reader picks several entity columns to become nodes of different kinds, marks two columns as the same kind of id, and chooses how entities in a row link.
- **Acceptance test:** auth.log (user, src_host, dst_host, time): users and hosts become two kinds; src_host and dst_host share one id space; each row links user to both hosts.
- **Today:** No
- **Evidence:** FACT: Graphistry hypergraph and Neo4j wide-table mapping (graph tools 7, 9 (section F)); Maltego one row to several entities with Meshed/Sequential/Tree links (https://docs.maltego.com/support/solutions/articles/15000010797-import-graph-from-table); cyber loads an authentication log (jobs-matrix).

### 43. Gene list to network

- **Tier:** secondary (server data). **Owner:** both. **Jobs:** load-from-network-source.
- **Requirement:** From the start screen a reader pastes a list of ids, picks a species and a confidence, and gets the network from STRING with a count of ids found and not found, stating what is sent and where before the request.
- **Acceptance test:** Paste 300 symbols, human, 0.7: the network loads, '287 found, 13 not found' is shown, and the source is listed.
- **Today:** Element partly, app no. FACT: the `rest` source's STRING sample mapping takes `identifiers` and `species` and loads the interaction network (graph-io/src/sources/rest/samples/string.ts); no found and not-found counts and no confidence parameter in the mapping.
- **Evidence:** FACT: genomics starts from a gene list (genomics-cytoscape-user.yaml:420,430); W20 phase 1; poor STRING integration (bioinformatics-researcher.yaml:114); design/graph-io/network-sources-design.md.

### 44. Id list as a set

- **Tier:** advanced. **Owner:** graphty-element. **Jobs:** save-filter-or-set, select-by-condition.
- **Requirement:** A reader imports a plain list of identifiers (or a GMT file) as a saved set and sees how many matched.
- **Acceptance test:** Import 50 flagged account ids: set created with '47 matched, 3 not in graph'.
- **Today:** No
- **Evidence:** FACT: door 27 identifier lists as rule sets (one-way-doors.md:958); fraud and threat-indicator lists.

### 45. Join onto edges

- **Tier:** secondary. **Owner:** graphty-element. **Jobs:** join-table-onto-nodes.
- **Requirement:** A join can attach a table to edges, keyed by edge id or by source and target, with the same counts as a node join.
- **Acceptance test:** Join a (from, to, volume) table: '380 of 400 edges matched' and volume on matched edges.
- **Today:** No
- **Evidence:** FACT: element-needs.md 'joins onto edges'.
- **Saved as:** as a node join (requirement 14): a source plus a recipe command naming the key columns. Owner decision 2026-10-19 on what a project file records (main document, "Decided by the owner"), item 9.

### 46. Too-large file path

- **Tier:** advanced. **Owner:** graphty-element. **Jobs:** load-subset, load-one-file.
- **Requirement:** A file over the drawing limit is not refused bare: the reader sees its size and the limit before loading and one way through (the busiest N nodes or the first N rows) pre-chosen.
- **Acceptance test:** A 2M-edge file shows its size, the limit and 'Busiest 50,000 nodes' selected; loading states what was left out.
- **Today:** Refusal only (tier1-design.md:433)
- **Evidence:** FACT: framework puts filter at import in the load step (design/ui/framework/task-flows.md section 2; design/ui/framework/element-needs.md); old shell ImportLargeFile artboard (app-shell-progressive-disclosure-design.md:787-822); marketing and ML scale (marketing-analyst.yaml:632, ml-engineer-recsys.yaml:692).

### 47. Draw the file's own styles

- **Tier:** secondary. **Owner:** graphty-element. **Jobs:** load-one-file.
- **Requirement:** A file that carries colors and sizes (such as GEXF viz attributes) can be drawn with them, as a style layer the reader can remove.
- **Acceptance test:** A GEXF with viz:color draws in its colors; removing the layer restores the default style.
- **Today:** Unverified (design/graph-io/style-import-design.md)
- **Evidence:** FACT: element-needs.md 'Use the file's colors'; root CLAUDE.md requires styling through a layer.

### 48. Refresh a source load

- **Tier:** advanced. **Owner:** graphty-element. **Jobs:** replace-with-newer-data, keep-and-replay-steps.
- **Requirement:** A reader asks whether a source changed since it loaded, and refreshes it: the query re-runs to the same number of pages, expansions replay in order, and the difference (added, removed, updated) applies as one undo step; a value the reader edited that the source also changed is kept unless the reader takes the source's.
- **Acceptance test:** An NDEx network edited upstream reads 'changed'; refresh reports added, removed and updated counts; undo restores the earlier data.
- **Today:** No. FACT: `SourceLoadRecord` keeps config, pages, next and validators, but no `refresh` or `revalidate` is in session.api.md on golden.
- **Evidence:** FACT: W13 pain 'Keeping the KG up-to-date as source data changes' (W13.yaml:89); design/graph-io/network-sources-design.md sections 16.2-16.3 (validators per source: NDEx modificationTime, ETag, content hash).

### 49. Write a recipe

- **Tier:** advanced. **Owner:** graphty-element. **Jobs:** keep-and-replay-steps.
- **Requirement:** A reader saves the current steps as a recipe that names columns, never node ids.
- **Acceptance test:** Save a recipe after a join and two filters; applying it to next month's file rebinds by column name.
- **Today:** No
- **Evidence:** FACT: recipe format decided (design/decisions/2026-09-28-document-formats-first-version.md); Power Query hard-coded names break refresh (BI [28][29] (section G)).

### 50. Computed column

- **Tier:** secondary. **Owner:** graphty-element. **Jobs:** derive-column.
- **Requirement:** A reader creates a column from an expression over other columns and results, in the existing JMESPath dialect, sees its type and fill, and edits it later.
- **Acceptance test:** Create degree_tumor - degree_normal: typed number with fill shown; editing it updates the column.
- **Today:** No
- **Evidence:** FACT: mostly sometimes/important (jobs-matrix derive-column); door 12 recommends JMESPath plus structured forms (design/ui/framework/one-way-doors.md, door 12).

### 51. Similar-name duplicates

- **Tier:** advanced. **Owner:** graphty-element. **Jobs:** resolve-duplicate-nodes.
- **Requirement:** The duplicate review also proposes similar-name groups, approved one group at a time.
- **Acceptance test:** IBM, I.B.M. and International Business Machines land in one proposed group.
- **Today:** No
- **Evidence:** FACT: OpenRefine clustering vs Gephi blind merge (data-prep tools 1 (section H); graph tools 1 (section F)).

### 52. Id mapping table

- **Tier:** advanced. **Owner:** graphty-element. **Jobs:** map-identifiers.
- **Requirement:** A reader applies a mapping table that translates ids between systems before a join, with a count of unmapped ids.
- **Acceptance test:** Apply an Ensembl-to-symbol table: '12 unmapped' shown before the join.
- **Today:** No
- **Evidence:** FACT: genomics fights symbol/Entrez/UniProt (genomics-cytoscape-user.yaml:28); out of v1 (data-plan.md:275).
- **Saved as:** the mapping table is itself a source; the join names it, and matches are recomputed on open (requirement 58). Owner decision 2026-10-19 on what a project file records (main document, "Decided by the owner"), item 9.

### 53. Define a new source

- **Tier:** advanced. **Owner:** graphty-element. **Jobs:** load-from-network-source.
- **Requirement:** A reader or an extension defines a source the element does not ship: a REST mapping for a JSON API, recorded with the load so a reopened project reads it the same way, or a custom source registered by an extension.
- **Acceptance test:** A REST mapping for deps.dev loads a dependency graph, and reopening the project lists the same load with its mapping.
- **Today:** Element yes, app no. FACT: the `rest` source and its mapping (graph-io/src/sources/rest/), `registerSource` and `defineSource` re-exported from `./extend`.
- **Evidence:** FACT: design/graph-io/network-sources-design.md sections 4.1 and 13; cybersecurity SIEM data has no built-in source (cybersecurity-analyst.yaml:23,37). JUDGMENT: a SPARQL source for the knowledge engineer (knowledge-engineer.yaml:25) is the most requested source not yet built.

### 54. Remove one source

- **Tier:** advanced. **Owner:** graphty-element. **Jobs:** know-provenance.
- **Requirement:** A reader removes one source in one undo step, removing only elements no other source supplied.
- **Acceptance test:** Remove source 2 of 3: elements only it supplied go; shared ones stay; undo restores them.
- **Today:** No. FACT: `data.collapse` removes one expansion; there is no `removeLoad` in session.api.md on golden.
- **Evidence:** FACT: no surveyed graph tool ships it (graph tools 10, section F). Depends on sources-list.

### 55. Bipartite projection

- **Tier:** advanced. **Owner:** graphty-element. **Jobs:** merge-or-compare-graphs.
- **Requirement:** A reader projects a two-mode graph onto one kind with a stated weighting.
- **Acceptance test:** Project user-item onto users with shared-item counts as weights.
- **Today:** No (no projection in any package)
- **Evidence:** FACT: ml-engineer-recsys.yaml:25; top-tasks tail; weighting in graph-conventions.md section 3.

### 56. Compare two graphs

- **Tier:** advanced. **Owner:** graphty-element. **Jobs:** merge-or-compare-graphs.
- **Requirement:** A reader combines two named graphs by union, intersection or difference into a new graph with a membership column and per-graph attribute columns.
- **Acceptance test:** Merge tumor and normal: edges carry tumor-only/normal-only/both and logFC_tumor/logFC_normal.
- **Today:** No
- **Evidence:** FACT: sometimes for genomics only (W24.yaml); one data member per file today (design/documents/container.md:44-45). Unblocked: the owner decided on 2026-10-19 that a project can hold several named graphs.
- **Saved as:** the result is its own named graph (one data member) plus a recipe command naming its inputs and the operation, so it can be rebuilt. Owner decision 2026-10-19 on what a project file records (main document, "Decided by the owner"), items 1 and 9.

### 57. Earlier data as a named graph

- **Tier:** advanced. **Owner:** graphty-element. **Jobs:** merge-or-compare-graphs, replace-with-newer-data, know-provenance.
- **Requirement:** After Replace, the reader can keep the earlier data as another named graph ("September") and compare it with the new one.
- **Acceptance test:** After replacing September with October and keeping September, the comparison lists added, removed and changed elements.
- **Today:** No (task-flows.md 2.2: 'Not yet in the element at all')
- **Evidence:** FACT: task-flows.md 8.2; door 28 (one-way-doors.md:1070); door 95 checkpoints. Owner decision 2026-10-19: several named graphs per project, which serves this without a separate versioning mechanism.

### 58. Match nodes across graphs or tables

- **Tier:** advanced. **Owner:** graphty-element. **Jobs:** map-identifiers, join-table-onto-nodes, merge-or-compare-graphs.
- **Requirement:** The element matches nodes of two graphs, or a graph and a table, by a key column with its id system, or through an id-mapping table, and reports matched and unmatched counts. The project stores the rule and recomputes the matches on open; it never stores matched pairs. Joins (14, 45), mapping tables (52) and set operations (56) use it.
- **Acceptance test:** A tumor and a normal network matched by Ensembl gene report matched and only-in-one counts; after reopening the project the same counts return, and the saved file holds the rule and no list of pairs.
- **Today:** No. FACT: no cross-graph matching in any package; one data member per file today (container.md, "The data member" rule 3).
- **Evidence:** FACT: genomics 'fights identifier mismatches (symbol vs Entrez vs UniProt, case sensitivity)' (genomics-cytoscape-user.yaml:28); Cytoscape merges networks by matching columns (graph tools 2 (section F)); the owner's decision of 2026-10-19 to store the rule, not the pairs. JUDGMENT: advanced, because most readers match within one graph through a join, and the rule is shared by every cross-graph operation.

### 59. Place roles

- **Tier:** later. **Owner:** graphty-element. **Jobs:** set-descriptive-role.
- **Requirement:** A reader marks latitude/longitude or country columns and the element counts invalid values.
- **Acceptance test:** Mark lat/lon: 4 out-of-range values counted.
- **Today:** No geo kind (owner-decisions.md 364-373); no map view
- **Evidence:** FACT: Tableau geographic roles (BI [4][5] (section G)). JUDGMENT: nothing reads a geo role until a map view exists.

### 60. Load a subset

- **Tier:** later. **Owner:** graphty-element. **Jobs:** load-subset.
- **Requirement:** A reader loads only a time window or the strongest ties of a large file and sees how much was left out. For network sources the source's own filter parameters, size limits (requirement 26) and expansion (requirement 25) already load only part.
- **Acceptance test:** Load the 6 hours around an alert: rows kept and left out are stated.
- **Today:** No
- **Evidence:** FACT: blocking only for the ML engineer at 10M nodes (W16.yaml:24). too-large-path covers the urgent half.

## C. Personas and data jobs

### Grid

This is the grid as first coded; the corrected grid is in "How the ranking was challenged" below.

Cell = frequency/importance. Frequency: E every session, O often, S sometimes, R rarely. Importance: B blocking, I important, n nice. Blank = no evidence the persona does this job.

| job                          | explorer-elena | analyst-alex | expert-emma | fraud-analyst | intelligence-analyst | cybersecurity-analyst | bioinformatics-researcher | genomics-cytoscape-user | supply-chain-analyst | marketing-analyst | ml-engineer-recsys | knowledge-engineer | plugin-author-domain-researcher | plugin-author-data-scientist |
| ---------------------------- | -------------- | ------------ | ----------- | ------------- | -------------------- | --------------------- | ------------------------- | ----------------------- | -------------------- | ----------------- | ------------------ | ------------------ | ------------------------------- | ---------------------------- |
| load-one-file                | E/B            | E/B          | O/B         | E/B           | E/B                  | E/B                   | O/B                       | O/B                     | E/B                  | E/B               | E/B                | O/I                | E/B                             |                              |
| open-sample                  | S/I            | R/n          |             |               |                      |                       |                           | R/n                     |                      |                   |                    |                    |                                 | S/I                          |
| two-tables-one-network       | R/n            | S/I          |             | O/I           | O/I                  |                       |                           |                         | O/B                  | S/I               | S/I                | O/I                |                                 |                              |
| preview-validate-before-load | E/I            | E/I          | S/n         | S/I           |                      |                       |                           | O/B                     | O/I                  |                   |                    | E/I                | E/B                             |                              |
| check-what-loaded            | E/I            | E/B          | E/I         | O/I           | O/I                  | S/I                   | O/I                       | E/I                     | O/I                  |                   |                    | E/B                |                                 |                              |
| set-structural-role          | S/B            | O/B          | S/I         | O/I           |                      | E/I                   | O/I                       | O/I                     | O/B                  |                   | E/B                |                    | E/B                             |                              |
| set-descriptive-role         |                | S/n          |             | E/I           | O/I                  | E/I                   |                           | R/n                     | O/I                  | S/I               | S/I                | O/I                |                                 |                              |
| set-column-type              | R/n            | S/I          |             | S/I           |                      |                       |                           | O/I                     | S/I                  |                   |                    | O/I                |                                 | S/I                          |
| add-second-file              |                | S/n          |             | O/I           | O/B                  | O/I                   | S/I                       |                         | O/I                  |                   |                    | O/B                |                                 |                              |
| join-table-onto-nodes        |                | S/I          |             | S/I           | S/I                  |                       | O/B                       | E/B                     | O/I                  | O/I               | S/I                | S/I                |                                 |                              |
| map-identifiers              |                |              |             | S/n           |                      | S/n                   | S/I                       | O/I                     |                      |                   |                    | O/I                |                                 |                              |
| merge-or-compare-graphs      |                | R/n          |             |               |                      |                       | S/I                       | S/I                     | S/n                  | R/n               |                    |                    |                                 |                              |
| resolve-duplicate-nodes      |                |              |             | S/I           | O/I                  | S/n                   | R/n                       |                         | S/I                  |                   |                    | E/B                |                                 |                              |
| replace-with-newer-data      |                | O/I          |             | R/n           |                      |                       |                           | R/n                     | O/B                  | O/I               |                    | O/I                |                                 |                              |
| load-from-network-source     |                |              |             | O/I           | O/I                  | E/I                   | O/I                       | E/B                     |                      |                   |                    | E/B                |                                 |                              |
| expand-from-source           |                | S/I          |             | E/B           | O/I                  | O/I                   | S/I                       |                         |                      |                   |                    | S/I                |                                 |                              |
| load-subset                  |                | R/n          |             | S/I           |                      | O/I                   | S/n                       |                         |                      | S/I               | E/B                |                    |                                 |                              |
| know-provenance              |                |              |             | O/I           | O/I                  | S/I                   | S/n                       |                         |                      |                   |                    | O/I                |                                 |                              |
| rename-hide-columns          | S/n            | S/n          |             |               |                      |                       |                           | O/I                     |                      |                   |                    | S/I                |                                 |                              |
| edit-values                  | R/n            |              |             | S/n           | S/I                  |                       |                           | R/n                     |                      |                   |                    | S/I                |                                 |                              |
| filter-hide                  | O/I            | E/B          | E/I         | E/I           | E/I                  | E/B                   | O/I                       | E/I                     | O/I                  | O/I               | O/I                | S/n                |                                 |                              |
| select-by-condition          | E/I            | O/I          | O/I         | E/B           | E/I                  | E/I                   |                           | O/I                     |                      |                   |                    | O/I                |                                 |                              |
| save-filter-or-set           |                | O/I          |             | O/I           | S/I                  | O/I                   |                           | S/I                     |                      |                   |                    |                    |                                 |                              |
| derive-column                |                | S/I          | O/I         | S/I           |                      |                       | S/I                       | S/I                     |                      | S/I               | S/I                |                    |                                 |                              |
| clean-values                 | R/n            | S/I          |             |               | S/I                  |                       |                           | S/I                     | S/I                  |                   |                    | E/B                | S/I                             |                              |
| keep-and-replay-steps        |                | O/I          | S/I         | S/I           |                      | S/I                   | O/I                       | O/I                     | O/I                  | S/I               |                    | O/I                |                                 |                              |
| export-data                  |                | O/I          | O/B         | O/I           | S/I                  |                       | O/I                       | E/I                     | O/I                  | O/B               | E/B                | O/I                |                                 | S/I                          |

### Summary by job

How many of the 14 personas do each job, as first coded, and for whom it is every session or blocking.

| Data job                              | Personas who do it | Every session for                                        | Blocking for                                                 |
| ------------------------------------- | ------------------ | -------------------------------------------------------- | ------------------------------------------------------------ |
| Load one file                         | 13 of 14           | 9 personas, from explorer to lab researcher              | all but knowledge engineer                                   |
| Filter or hide                        | 12                 | analyst, expert, fraud, intelligence, security, genomics | analyst, security                                            |
| Export data                           | 11                 | genomics, recommender                                    | expert, marketing, recommender                               |
| Check what loaded                     | 10                 | explorer, analyst, expert, genomics, knowledge engineer  | analyst, knowledge engineer                                  |
| Set id, source, target, weight        | 10                 | security, recommender, lab researcher                    | explorer, analyst, supply chain, recommender, lab researcher |
| Join a table onto nodes               | 9                  | genomics                                                 | genomics, bioinformatics                                     |
| Repeat steps on new data              | 9                  | --                                                       | -- (often for five)                                          |
| Set time, kind, place                 | 9                  | fraud, security                                          | --                                                           |
| Preview before loading                | 8                  | explorer, analyst, knowledge engineer, lab researcher    | genomics, lab researcher                                     |
| Select by condition                   | 8                  | explorer, fraud, intelligence, security                  | fraud                                                        |
| Node table plus edge table            | 8                  | --                                                       | supply chain                                                 |
| Add a second file                     | 7                  | --                                                       | intelligence, knowledge engineer                             |
| Fix a column's type                   | 7                  | --                                                       | --                                                           |
| Replace with newer data               | 6                  | --                                                       | supply chain                                                 |
| Load from a server or list of ids     | 6                  | genomics, knowledge engineer, security                   | genomics, knowledge engineer                                 |
| Expand a neighborhood from the server | 6                  | fraud                                                    | fraud                                                        |
| Merge duplicate nodes                 | 6                  | knowledge engineer                                       | knowledge engineer                                           |
| Merge or compare two graphs           | 5                  | --                                                       | --                                                           |

### Priority scores

These are the scores of the first coding, kept so the challenges below can be checked against
them. A job's score sums, over the personas with evidence for it, frequency (every session 4, often
3, sometimes 2, rarely 1) times importance (blocking 3, important 2, nice 1), from the grid above.
The main document now ranks from the corrected grid in "How the ranking was challenged".

| job                          | score | personas with evidence | personas for whom it is blocking |
| ---------------------------- | ----- | ---------------------- | -------------------------------- |
| load-one-file                | 141   | 13                     | 12                               |
| filter-hide                  | 88    | 12                     | 2                                |
| set-structural-role          | 78    | 10                     | 5                                |
| export-data                  | 76    | 11                     | 3                                |
| check-what-loaded            | 76    | 10                     | 2                                |
| select-by-condition          | 60    | 8                      | 1                                |
| preview-validate-before-load | 57    | 8                      | 2                                |
| join-table-onto-nodes        | 53    | 9                      | 2                                |
| load-from-network-source     | 50    | 6                      | 2                                |
| keep-and-replay-steps        | 46    | 9                      | 0                                |
| set-descriptive-role         | 45    | 9                      | 0                                |
| add-second-file              | 42    | 7                      | 2                                |
| two-tables-one-network       | 40    | 8                      | 1                                |
| expand-from-source           | 36    | 6                      | 1                                |
| clean-values                 | 33    | 7                      | 1                                |
| derive-column                | 30    | 7                      | 0                                |
| set-column-type              | 29    | 7                      | 0                                |
| resolve-duplicate-nodes      | 29    | 6                      | 1                                |
| replace-with-newer-data      | 29    | 6                      | 1                                |
| load-subset                  | 29    | 6                      | 1                                |
| save-filter-or-set           | 26    | 5                      | 0                                |
| know-provenance              | 24    | 5                      | 0                                |
| map-identifiers              | 20    | 5                      | 0                                |
| rename-hide-columns          | 14    | 4                      | 0                                |
| merge-or-compare-graphs      | 12    | 5                      | 0                                |
| edit-values                  | 12    | 5                      | 0                                |
| open-sample                  | 10    | 4                      | 0                                |

### How the ranking was challenged

The scores above are the first coding. Six reviews then tried to break the ranking, and the main
document now ranks from the corrected grid below. Every cell is still one reader's judgment over
persona and workflow files marked `validated: false`.

Two short names are used in this subsection:

- "The study personas" are the longer persona briefs written for the simulated studio sessions
  (`design/ui/prototype/study/personas/` on the branch `ux-storyboards-mocks-and-study`).
- "The studio" is the design studio's results (`design/ui/studio/` on `design/studio-tier3`).

The rule for evidence is this. The designloom persona and workflow files are the source of record.
A study persona overrides one only where the designloom file is silent. A studio briefing written
to set up a studio task is never evidence about the persona.

#### Cell corrections

Four audits re-read every cell against its cited lines. Every score in the first coding matched a
recomputation from the grid, so the arithmetic was right; the faults were in the cells. These
corrections were accepted, grouped by reason:

- **The citation says something else.** The neighborhood-expansion capability expands the view
  inside the loaded graph (`capabilities/neighborhood-expansion.yaml`, lines 3-5); it does not
  fetch from a server. So expand-from-source falls for fraud, Alex, intelligence, cybersecurity and
  bioinformatics. Other misread citations:
    - Emma's derive-column cites "combines analysis techniques" (`expert-emma.yaml`, line 25).
    - Elena's edit-values cites her fear of breaking things (`explorer-elena.yaml`, line 37).
    - Bioinformatics' duplicate merging cites W22's cluster collapse (`W22.yaml`, line 62).
    - The recommender engineer's derive-column cites model embeddings.
    - The knowledge engineer's provenance cites her entity types.
    - Genomics' rename cites the width of a preview.
- **A job after loading was coded more often than the load.** Preview and check-what-loaded fall
  to "often" for Alex, the knowledge engineer and Emma.
- **Using the app daily is not loading daily.** For fraud and intelligence, load-one-file falls to
  "often": their workflows W05, W17 and W15 start from a graph already built.
- **A studio briefing was cited as a persona fact.** This lowers two-tables for Elena and supply
  chain, and replace and set-structural-role for supply chain.
- **The work happens in the reader's own pipeline, not in the app.** For the knowledge engineer
  this covers cleanup, duplicate merging, a second file, types, id mapping, edits, replay and
  export (`knowledge-engineer.yaml`, line 23; `W13.yaml`, line 89). For the recommender engineer
  it covers derived columns and export.
- **Cells left blank although the files support them.** 24 cells were added from cited lines, for
  example:
    - select-by-condition for marketing, supply chain, bioinformatics and the recommender engineer
    - a time role for Emma (`W19.yaml`, line 27)
    - export for supply chain, raised to blocking ("A no or not sure on Power BI makes it a side
      tool", study persona `supply-chain-analyst.md`, lines 194-197)
- **The two plugin-author personas were removed.** The domain researcher and the data scientist
  write code against graphty-element (`plugin-author-domain-researcher.yaml`, lines 28 and 48-50;
  `plugin-author-data-scientist.yaml`, lines 8 and 52-53). Neither is in any workflow, and the app
  cannot load a third-party plugin. Their needs are graphty-element API requirements:
    - row-numbered parse errors
    - combining replicate edges with a chosen rule
    - failing loudly on a misspelt attribute
    - flat typed-array reads

Two corrections were accepted only in part. For fraud, the audit proposed rarely/nice for
expand-from-source and load-from-network-source; both were set to sometimes/important instead.
The citation fails, but the designloom file's multi-hop tracing and "Disconnected data sources"
(`fraud-analyst.yaml`, lines 23 and 38) make an occasional pull from a source plausible. The study
persona's rule that bank data needs IT approval is not in the designloom file.

#### Jobs that had no row

Three new rows were added:

- **reopen-as-left** (requirement 18 had only provenance, a different job). Evidence: study
  personas `fraud-analyst.md`, lines 229-230; `supply-chain-analyst.md`, lines 228-229;
  `analyst-alex.md`, lines 109-113; and `W25.yaml`, lines 50-51.
- **one-table-several-kinds** (requirement 42). Evidence: `cybersecurity-analyst.yaml`, line 23;
  `ml-engineer-recsys.yaml`, line 22; `intelligence-analyst.yaml`, line 26; study persona
  `supply-chain-analyst.md`, lines 224-225.
- **keep-subnetwork** (requirement 41, which had been scored as filter-hide). Evidence:
  `genomics-cytoscape-user.yaml`, lines 10, 27 and 39; `W20.yaml`, lines 56 and 88-90.

These were not added, each for the reason given:

- **Know where the data goes before loading it.** Every analyst study persona refuses to load
  real data until this is answered. It is a gate passed once, which a frequency scale cannot
  score. Requirement 4 already makes every door say the file stays in this browser. The
  intelligence analyst's "keep sensitive data on this machine" is the same gate.
- **Load a known vendor export without renaming columns.** This is requirement 19's job.
- **Keep elements with no coordinates visible on a map.** It waits for the map view (requirement
  59).
- **Project a two-mode graph, and build a network from shared membership.** Requirements 55 and
  44 cover these in part. They are left for the next coding pass.
- **Indicator lists as a set** for cybersecurity. Her save-filter-or-set cell already covers it.
- **Record the evidence document for a link.** Requirements 29 and 40 cover it in part.
- **See the schema as a graph; load RDF or SPARQL.** These are outside data management;
  requirement 23 records that there is no SPARQL source yet.
- **Publish to a repository such as NDEx.** No requirement covers it yet. This is a gap for a
  later requirement, not a ranking error.
- **Read the full node table.** The table dock already does this.
- **Cut a timestamped graph into windows.** Requirements 33 and 60 cover it.
- **Check graph-wide direction and weighting.** Requirement 32 covers it.
- **Name each condition's attributes on a merge.** This belongs in requirement 56's test.

#### The method

The method review's findings, each with what was done about it:

1. **The published order did not follow the published scores.** For example, autosave scored 24
   but sat above the weight's role at 78. Accepted: order within a tier is now computed, and every
   placement against the score names its rule.
2. **No rule said how a requirement serving several jobs is scored.** Accepted: each requirement
   now has one ranking job, and covering only part of it lowers the tier by one.
3. **Summing over personas buries a job that blocks a few.** Accepted as a weighting: "blocking
   first" is one of the five. The proposal to set every tier by it was rejected as the default. It
   would put the server block in the first layer on two personas' evidence, against the owner's
   stated priority for the average user, with no studio observation. It is the third answer to the
   owner question.
4. **A persona's say is how much its file says.** Totals range from 55 to 140. Accepted as a
   limitation: the normalized weighting gives every persona the same total, and a requirement whose
   tier changes under it is marked weight-sensitive.
5. **The plugin authors were counted as app users.** Accepted: they were removed.
6. **The audience the UI task ranking names was ignored** (`top-tasks.md`, line 10). Accepted as a
   weighting ("audience"): Alex counts three times, fraud and security twice. It is the second
   answer to the owner question.
7. **There was no term for the cost of an error.** Accepted: the named cost-of-error rule from
   `top-tasks.md`, lines 49-52, places 8, 9, 13, 16 and 17.
8. **Multiplying ordinal codes is arbitrary.** Accepted as a check: the additive weighting. A job's
   rank spread over all weightings is published, and a spread over 5 marks it weight-sensitive.
9. **First sessions and repeat work are mixed in one number.** Not computable from the grid, which
   does not say when in a reader's life a job happens. The newcomer's safety net (21) is placed by
   rule instead.

#### The studio

These challenges come from simulated readers in the studio. Each is accepted or rejected:

- **The owner asked for the average user first** (`digests/owner-voice.md`, lines 296-297).
  Accepted: the default weighting stays equal, and the server block moved to secondary.
- **The newcomer personas are not in the grid.** Accepted as a limitation. They exist only as
  study personas, which have no designloom file to code. Open a sample is placed by rule.
- **No studio task opened a network source.** Accepted: requirements 23 to 27 are secondary, and
  each says it is unobserved.
- **Replace and Add are ranked too low.** Accepted. 8 of 8 readers had to hunt for Replace
  (`tier2/rounds/round-1/insights.md`, lines 81-93). The obvious door offered only Add, which
  doubled 41 edges to 82 (`round-2/insights.md`, lines 100-104). Control+O on the same file
  duplicated every edge (`tier3/dry-run-r1-1.md`, line 120). Both 13 and 16 are now placed by cost
  of error, 13's test adds the same-file case, and 16 carries the mapping.
- **Mappings carry over on Replace.** 8 of 8 left the weight's meaning unset (`round-2/scores.md`,
  lines 297-300). Accepted into 16's test.
- **Routing a dropped file is verified broken** (`tier3/dry-run-r1-1.md`, line 50). Accepted: the
  bug is fixed in slice 1, and "Read as..." is secondary.
- **The name column and a count column as the weight.** Accepted into 7's test.
- **Column types silently empty a filter** (`tier3/dry-run-r1-1.md`, line 38). Accepted: 17 is
  placed by cost of error and built in slice 1.
- **Changing a role after loading should be primary.** Rejected. The observed need, saying what a
  number means after loading, is met by 9's weight line in the inspector. 39 stays secondary.
- **Imported and computed columns look the same.** Accepted into 10. Showing degree before a run
  was not added: that is an analysis feature, not a data one.
- **Readers type a condition in the find box; export failed at the door.** Accepted into the tests
  of 11 and 20.

#### The competitors

These challenges compare the ranking with Gephi, Cytoscape, Kumu, Neo4j Bloom, Tableau, Power BI
and Flourish:

- **The order did not follow the scores.** Accepted (method finding 1).
- **Column type is too low:** every tool surveyed shows and fixes types on its first screen
  (section J, "What competitors teach"). Accepted, together with the studio finding.
- **There is no visible place to start a filter.** Accepted: 12 now has an always-visible Filter
  entry in the Data place.
- **Build Expand (25) before Load more (26), as in Neo4j Bloom.** Rejected. The argument rested on
  fraud expanding from a server every session, a cell the audits removed. Expand is now advanced,
  and 26 ships with the server load it guards.
- **Refresh (48) belongs in the first server list.** Rejected. Only the knowledge engineer needs
  it, and her app use is viewing. Its job ranks in the last third under every deciding weighting.
- **Apply a recipe (22) should be secondary.** Accepted.
- **Merging duplicates (31) can stay secondary.** Its job now ranks in the last third, and Kumu's
  duplicates come from re-imports, which 13, 16 and 30 prevent. It moved to advanced.

#### The weightings

All six run on the corrected grid; "published" is the first coding, shown for comparison. A
script computed every table below from the two grids in this section; none was worked by hand.

- **corrected**: the original method, equal weight per persona.
- **audience**: as corrected, with Alex counted three times and fraud and security twice, after
  the weekly analyst `top-tasks.md` is written for and the daily analysts it names (lines 10, 24).
- **normalized**: each persona's cells divided by that persona's total, so every persona has the
  same say.
- **blocking-first**: personas blocked often or more, then personas blocked at all, then the sum.
- **max**: the largest single cell. It ties nine jobs at rank 1, so it is a check only and does
  not decide stability.
- **additive**: frequency plus importance instead of times.

#### Corrected grid

Cell = frequency/importance, as in the original grid. The two plugin-author personas are
removed (they consume graphty-element's API, not the app's data screens); three job rows are new.

| job                          | explorer-elena | analyst-alex | expert-emma | fraud-analyst | intelligence-analyst | cybersecurity-analyst | bioinformatics-researcher | genomics-cytoscape-user | supply-chain-analyst | marketing-analyst | ml-engineer-recsys | knowledge-engineer |
| ---------------------------- | -------------- | ------------ | ----------- | ------------- | -------------------- | --------------------- | ------------------------- | ----------------------- | -------------------- | ----------------- | ------------------ | ------------------ |
| load-one-file                | E/B            | O/B          | O/B         | O/B           | O/B                  | E/B                   | O/B                       | O/B                     | E/B                  | E/B               | E/B                | O/I                |
| open-sample                  | S/I            | R/n          |             |               |                      |                       |                           | R/n                     |                      |                   |                    |                    |
| two-tables-one-network       |                | O/B          |             | O/I           | O/I                  |                       | S/I                       | S/I                     | O/I                  | S/I               | S/I                | O/I                |
| preview-validate-before-load | E/I            | O/I          | S/n         | S/I           | S/I                  |                       |                           | O/B                     | O/I                  |                   |                    | O/I                |
| check-what-loaded            | E/I            | E/B          | O/I         | O/I           | O/I                  | S/I                   | O/I                       | E/I                     | O/I                  | S/I               | S/I                | O/B                |
| set-structural-role          | S/B            | S/B          | S/I         | O/I           | O/I                  | E/I                   | O/I                       | O/I                     | S/B                  |                   | E/B                |                    |
| set-descriptive-role         |                | S/n          | S/I         | O/I           | O/B                  | E/I                   | S/n                       | R/n                     | O/I                  | S/I               | O/I                | O/I                |
| set-column-type              | R/n            | S/I          |             | O/I           |                      |                       |                           | O/I                     | S/I                  |                   |                    | S/I                |
| add-second-file              |                | S/n          |             | O/I           | O/B                  | O/I                   | S/I                       |                         | O/I                  |                   |                    | S/I                |
| join-table-onto-nodes        |                | S/I          |             | S/I           | S/I                  | S/I                   | O/B                       | E/B                     | O/I                  | O/I               | S/I                | S/I                |
| map-identifiers              |                |              |             | S/n           |                      | S/n                   | S/I                       | O/I                     | S/I                  |                   |                    | S/I                |
| merge-or-compare-graphs      |                | R/n          | S/I         |               | S/I                  |                       | S/I                       | S/I                     | S/n                  | R/n               |                    |                    |
| resolve-duplicate-nodes      |                |              |             | S/I           | O/I                  | S/n                   |                           |                         | O/I                  |                   |                    | S/I                |
| replace-with-newer-data      |                | O/I          |             | R/n           |                      | S/I                   |                           | R/n                     | S/B                  | S/I               |                    | O/I                |
| load-from-network-source     |                |              |             | S/I           | R/n                  | S/I                   | O/I                       | E/B                     |                      |                   |                    | O/B                |
| expand-from-source           |                |              |             | S/I           | R/n                  | S/n                   | S/n                       |                         |                      |                   |                    | S/I                |
| load-subset                  |                | R/n          | S/n         | S/I           |                      | O/I                   | S/n                       |                         |                      | R/I               | E/B                | O/I                |
| know-provenance              |                |              |             | O/I           | O/B                  | S/I                   | S/I                       | S/I                     |                      |                   |                    | S/I                |
| rename-hide-columns          | R/n            | S/n          |             |               |                      |                       |                           | S/I                     |                      |                   |                    | S/I                |
| edit-values                  |                |              |             | S/n           | S/I                  |                       |                           | R/n                     |                      |                   |                    | R/n                |
| filter-hide                  | O/I            | E/B          | E/I         | E/I           | E/I                  | E/B                   | O/I                       | E/I                     | O/I                  | O/I               | O/I                | S/n                |
| select-by-condition          | E/I            | O/I          | O/I         | E/B           | O/I                  | E/I                   | O/I                       | O/I                     | O/I                  | O/I               | S/I                | O/I                |
| save-filter-or-set           |                | O/I          |             | O/I           | S/I                  | O/I                   | S/I                       | S/I                     |                      |                   |                    |                    |
| derive-column                |                | S/I          | S/I         | S/I           |                      | S/I                   | S/I                       | S/I                     |                      | S/I               | R/n                |                    |
| clean-values                 | R/n            | S/I          |             | O/I           | S/I                  |                       |                           | S/I                     | O/I                  |                   |                    | S/I                |
| keep-and-replay-steps        |                | O/I          | S/I         | S/I           |                      | O/I                   | O/I                       | O/I                     | O/I                  | S/I               |                    | S/n                |
| export-data                  |                | E/I          | O/B         | O/B           | S/I                  | S/I                   | O/I                       | E/I                     | O/B                  | E/B               | O/B                | S/I                |
| reopen-as-left               |                | O/I          |             | O/B           |                      |                       | S/I                       | S/I                     | O/I                  |                   |                    |                    |
| one-table-several-kinds      |                |              |             |               | S/I                  | E/B                   |                           |                         | S/I                  |                   | E/B                |                    |
| keep-subnetwork              |                |              |             |               |                      |                       | S/I                       | E/I                     |                      |                   |                    |                    |

#### Job scores under each weighting

Rank (score). blocking-first scores read: personas blocked often or more / personas blocked / sum.

| job                          | published | corrected | audience | normalized | blocking-first | max    | additive | rank spread |
| ---------------------------- | --------- | --------- | -------- | ---------- | -------------- | ------ | -------- | ----------- |
| load-one-file                | 1 (141)   | 1 (120)   | 1 (159)  | 1 (131.4)  | 1 (11/11/120)  | 1 (12) | 1 (76)   | 1-1         |
| filter-hide                  | 2 (88)    | 2 (88)    | 2 (132)  | 2 (91.7)   | 3 (2/2/88)     | 1 (12) | 2 (66)   | 1-3         |
| export-data                  | 4 (76)    | 3 (82)    | 5 (111)  | 3 (85.8)   | 2 (5/5/82)     | 1 (12) | 5 (60)   | 1-5         |
| select-by-condition          | 6 (60)    | 4 (80)    | 4 (112)  | 4 (84.7)   | 9 (1/1/80)     | 1 (12) | 3 (63)   | 1-9         |
| check-what-loaded            | 4 (76)    | 5 (79)    | 3 (113)  | 5 (83.4)   | 4 (2/2/79)     | 1 (12) | 4 (62)   | 1-5         |
| set-structural-role          | 3 (78)    | 6 (66)    | 6 (92)   | 6 (68.3)   | 8 (1/4/66)     | 1 (12) | 6 (52)   | 1-8         |
| join-table-onto-nodes        | 8 (53)    | 7 (57)    | 7 (73)   | 8 (53.0)   | 5 (2/2/57)     | 1 (12) | 8 (47)   | 1-8         |
| set-descriptive-role         | 11 (45)   | 8 (54)    | 9 (72)   | 7 (53.8)   | 10 (1/1/54)    | 11 (9) | 7 (48)   | 7-11        |
| two-tables-one-network       | 13 (40)   | 9 (49)    | 7 (73)   | 10 (45.6)  | 11 (1/1/49)    | 11 (9) | 9 (42)   | 7-11        |
| preview-validate-before-load | 7 (57)    | 10 (45)   | 11 (61)  | 9 (46.7)   | 12 (1/1/45)    | 11 (9) | 11 (38)  | 9-12        |
| keep-and-replay-steps        | 10 (46)   | 11 (44)   | 10 (66)  | 11 (42.5)  | 18 (0/0/44)    | 18 (6) | 10 (40)  | 10-18       |
| add-second-file              | 12 (42)   | 12 (37)   | 13 (53)  | 13 (32.2)  | 13 (1/1/37)    | 11 (9) | 12 (32)  | 11-13       |
| load-from-network-source     | 9 (50)    | 13 (36)   | 18 (44)  | 15 (30.2)  | 6 (2/2/36)     | 1 (12) | 15 (28)  | 1-18        |
| load-subset                  | 17 (29)   | 14 (35)   | 15 (47)  | 12 (36.6)  | 14 (1/1/35)    | 1 (12) | 12 (32)  | 1-15        |
| one-table-several-kinds      | --        | 15 (32)   | 18 (44)  | 14 (31.2)  | 7 (2/2/32)     | 1 (12) | 24 (22)  | 1-24        |
| know-provenance              | 22 (24)   | 16 (31)   | 21 (41)  | 17 (26.7)  | 15 (1/1/31)    | 11 (9) | 17 (27)  | 11-21       |
| save-filter-or-set           | 21 (26)   | 17 (30)   | 12 (54)  | 19 (25.0)  | 19 (0/0/30)    | 18 (6) | 17 (27)  | 12-19       |
| clean-values                 | 15 (33)   | 18 (29)   | 20 (43)  | 19 (25.0)  | 20 (0/0/29)    | 18 (6) | 15 (28)  | 15-20       |
| derive-column                | 16 (30)   | 18 (29)   | 16 (45)  | 16 (29.9)  | 20 (0/0/29)    | 25 (4) | 14 (30)  | 14-25       |
| reopen-as-left               | --        | 18 (29)   | 14 (50)  | 21 (23.5)  | 16 (1/1/29)    | 11 (9) | 20 (24)  | 11-21       |
| replace-with-newer-data      | 17 (29)   | 21 (28)   | 16 (45)  | 18 (26.5)  | 17 (0/1/28)    | 18 (6) | 17 (27)  | 16-21       |
| set-column-type              | 17 (29)   | 22 (25)   | 22 (39)  | 22 (21.0)  | 22 (0/0/25)    | 18 (6) | 20 (24)  | 18-22       |
| map-identifiers              | 23 (20)   | 23 (22)   | 24 (26)  | 25 (18.5)  | 23 (0/0/22)    | 18 (6) | 22 (23)  | 18-25       |
| resolve-duplicate-nodes      | 17 (29)   | 23 (22)   | 23 (28)  | 24 (19.0)  | 23 (0/0/22)    | 18 (6) | 25 (21)  | 18-25       |
| merge-or-compare-graphs      | 25 (12)   | 25 (20)   | 25 (22)  | 23 (20.9)  | 25 (0/0/20)    | 25 (4) | 22 (23)  | 22-25       |
| expand-from-source           | 14 (36)   | 26 (13)   | 26 (19)  | 26 (11.3)  | 26 (0/0/13)    | 25 (4) | 26 (16)  | 25-26       |
| keep-subnetwork              | --        | 27 (12)   | 28 (12)  | 28 (9.6)   | 27 (0/0/12)    | 17 (8) | 29 (10)  | 17-29       |
| rename-hide-columns          | 24 (14)   | 28 (11)   | 27 (15)  | 27 (10.2)  | 28 (0/0/11)    | 25 (4) | 27 (13)  | 25-28       |
| edit-values                  | 25 (12)   | 29 (8)    | 29 (10)  | 30 (6.8)   | 29 (0/0/8)     | 25 (4) | 28 (11)  | 25-30       |
| open-sample                  | 27 (10)   | 30 (6)    | 30 (8)   | 29 (8.8)   | 30 (0/0/6)     | 25 (4) | 30 (8)   | 25-30       |

#### Requirement stability

A requirement takes the rank of its one primary job. The score gives it the tier of the third
of the job list that job falls in (ranks 1-10 primary, 11-20 secondary, 21-30 advanced), one
tier lower when it covers only part of the job. 'Score holds' means that tier is the same under
the five deciding weightings and the job's rank spreads by 5 or less; max is shown as a check.
'Placed' is the tier in the main document, and 'why' names the rule or evidence when it differs
from the score.

| req | name                                 | job                          | whole | corrected | audience | normalized | blocking-first | max  | additive | was | placed | score holds | why                                                        |
| --- | ------------------------------------ | ---------------------------- | ----- | --------- | -------- | ---------- | -------------- | ---- | -------- | --- | ------ | ----------- | ---------------------------------------------------------- |
| 4   | Load a file by any door              | load-one-file                | yes   | 1 P       | 1 P      | 1 P        | 1 P            | 1 P  | 1 P      | P   | P      | yes         |                                                            |
| 5   | A clean file is one Enter            | load-one-file                | yes   | 1 P       | 1 P      | 1 P        | 1 P            | 1 P  | 1 P      | P   | P      | yes         |                                                            |
| 6   | A dropped file goes where it belongs | load-one-file                | part  | 1 S       | 1 S      | 1 S        | 1 S            | 1 S  | 1 S      | P   | S      | yes         |                                                            |
| 7   | Column roles at load                 | set-structural-role          | yes   | 6 P       | 6 P      | 6 P        | 8 P            | 1 P  | 6 P      | P   | P      | yes         |                                                            |
| 8   | Load report                          | preview-validate-before-load | yes   | 10 P      | 11 S     | 9 P        | 12 S           | 11 S | 11 S     | P   | P      | no          | cost of error: checking the import                         |
| 9   | The weight's role                    | set-structural-role          | part  | 6 S       | 6 S      | 6 S        | 8 S            | 1 S  | 6 S      | P   | P      | yes         | cost of error: what a weight means                         |
| 10  | What loaded, in plain words          | check-what-loaded            | yes   | 5 P       | 3 P      | 5 P        | 4 P            | 1 P  | 4 P      | P   | P      | yes         |                                                            |
| 11  | Find by name or value                | select-by-condition          | yes   | 4 P       | 4 P      | 4 P        | 9 P            | 1 P  | 3 P      | P   | P      | no          |                                                            |
| 12  | One condition card                   | filter-hide                  | yes   | 2 P       | 2 P      | 2 P        | 3 P            | 1 P  | 2 P      | P   | P      | yes         |                                                            |
| 13  | Add a second file                    | add-second-file              | yes   | 12 S      | 13 S     | 13 S       | 13 S           | 11 S | 12 S     | P   | P      | yes         | cost of error: a second file silently drops attributes     |
| 14  | Join a table onto nodes              | join-table-onto-nodes        | yes   | 7 P       | 7 P      | 8 P        | 5 P            | 1 P  | 8 P      | P   | P      | yes         |                                                            |
| 15  | Node file and edge file together     | two-tables-one-network       | yes   | 9 P       | 7 P      | 10 P       | 11 S           | 11 S | 9 P      | P   | P      | no          |                                                            |
| 16  | Replace data, keep the analysis      | replace-with-newer-data      | yes   | 21 A      | 16 S     | 18 S       | 17 S           | 18 S | 17 S     | P   | P      | no          | cost of error: a newer file lands on Add and doubles edges |
| 17  | See and fix a column's type          | set-column-type              | yes   | 22 A      | 22 A     | 22 A       | 22 A           | 18 S | 20 S     | P   | P      | no          | cost of error: a wrong type silently empties a filter      |
| 18  | Autosave and reopen                  | reopen-as-left               | yes   | 18 S      | 14 S     | 21 A       | 16 S           | 11 S | 20 S     | P   | P      | no          | prevents lost work                                         |
| 19  | Known file shapes map themselves     | keep-and-replay-steps        | part  | 11 A      | 10 S     | 11 A       | 18 A           | 18 A | 10 S     | P   | S      | no          | studio: Replace must carry the mapping                     |
| 20  | Export everything                    | export-data                  | yes   | 3 P       | 5 P      | 3 P        | 2 P            | 1 P  | 5 P      | P   | P      | yes         |                                                            |
| 21  | Open a sample                        | open-sample                  | yes   | 30 A      | 30 A     | 29 A       | 30 A           | 25 A | 30 A     | P   | P      | yes         | newcomer safety net; already built                         |
| 22  | Apply a recipe                       | keep-and-replay-steps        | part  | 11 A      | 10 S     | 11 A       | 18 A           | 18 A | 10 S     | P   | S      | no          | audience weighting; no tool puts recipes first             |
| 23  | Connect to a source and test it      | load-from-network-source     | yes   | 13 S      | 18 S     | 15 S       | 6 P            | 1 P  | 15 S     | P   | S      | no          |                                                            |
| 24  | Browse or query what to load         | load-from-network-source     | yes   | 13 S      | 18 S     | 15 S       | 6 P            | 1 P  | 15 S     | P   | S      | no          |                                                            |
| 25  | Expand from the server               | expand-from-source           | yes   | 26 A      | 26 A     | 26 A       | 26 A           | 25 A | 26 A     | P   | A      | yes         |                                                            |
| 26  | Size limits and Load more            | load-from-network-source     | part  | 13 A      | 18 A     | 15 A       | 6 S            | 1 S  | 15 A     | P   | S      | no          | ships with 24                                              |
| 27  | Reopen asks before it queries        | load-from-network-source     | part  | 13 A      | 18 A     | 15 A       | 6 S            | 1 S  | 15 A     | P   | S      | no          | ships with 24                                              |
| 28  | Ordered filter steps                 | filter-hide                  | part  | 2 S       | 2 S      | 2 S        | 3 S            | 1 S  | 2 S      | S   | S      | yes         |                                                            |
| 29  | Sources list                         | know-provenance              | yes   | 16 S      | 21 A     | 17 S       | 15 S           | 11 S | 17 S     | S   | S      | no          |                                                            |
| 30  | Cleanup offers                       | clean-values                 | yes   | 18 S      | 20 S     | 19 S       | 20 S           | 18 S | 15 S     | S   | S      | yes         |                                                            |
| 31  | Merge exact duplicates               | resolve-duplicate-nodes      | yes   | 23 A      | 23 A     | 24 A       | 23 A           | 18 S | 25 A     | S   | A      | yes         |                                                            |
| 32  | Graph properties                     | set-structural-role          | part  | 6 S       | 6 S      | 6 S        | 8 S            | 1 S  | 6 S      | S   | S      | yes         |                                                            |
| 33  | Time spans                           | set-descriptive-role         | part  | 8 S       | 9 S      | 7 S        | 10 S           | 11 A | 7 S      | S   | S      | yes         |                                                            |
| 34  | Named filters and sets               | save-filter-or-set           | yes   | 17 S      | 12 S     | 19 S       | 19 S           | 18 S | 17 S     | S   | S      | no          |                                                            |
| 35  | Export scope                         | export-data                  | part  | 3 S       | 5 S      | 3 S        | 2 S            | 1 S  | 5 S      | S   | S      | yes         |                                                            |
| 36  | The list of data steps               | keep-and-replay-steps        | part  | 11 A      | 10 S     | 11 A       | 18 A           | 18 A | 10 S     | S   | S      | no          | audience weighting; 16 and 22 need it                      |
| 37  | Rename, delete, fill empty           | rename-hide-columns          | part  | 28 A      | 27 A     | 27 A       | 28 A           | 25 A | 27 A     | S   | S      | yes         | competitors: rename in the column menu                     |
| 38  | Hide and reorder columns             | rename-hide-columns          | part  | 28 A      | 27 A     | 27 A       | 28 A           | 25 A | 27 A     | S   | S      | yes         | competitors: hide in the column menu                       |
| 39  | Change a role after loading          | set-structural-role          | part  | 6 S       | 6 S      | 6 S        | 8 S            | 1 S  | 6 S      | S   | S      | yes         |                                                            |
| 40  | Edit values                          | edit-values                  | yes   | 29 A      | 29 A     | 30 A       | 29 A           | 25 A | 28 A     | S   | A      | yes         |                                                            |
| 41  | Keep the largest group, subnetwork   | keep-subnetwork              | yes   | 27 A      | 28 A     | 28 A       | 27 A           | 17 S | 29 A     | S   | S      | yes         | W20 needs the largest group in one click                   |
| 42  | One table, several kinds of node     | one-table-several-kinds      | yes   | 15 S      | 18 S     | 14 S       | 7 P            | 1 P  | 24 A     | S   | S      | no          |                                                            |
| 43  | Gene list to network                 | load-from-network-source     | yes   | 13 S      | 18 S     | 15 S       | 6 P            | 1 P  | 15 S     | S   | S      | no          |                                                            |
| 44  | Id list as a set                     | save-filter-or-set           | part  | 17 A      | 12 A     | 19 A       | 19 A           | 18 A | 17 A     | S   | A      | no          |                                                            |
| 45  | Join onto edges                      | join-table-onto-nodes        | part  | 7 S       | 7 S      | 8 S        | 5 S            | 1 S  | 8 S      | S   | S      | yes         |                                                            |
| 46  | Too-large file path                  | load-subset                  | part  | 14 A      | 15 A     | 12 A       | 14 A           | 1 S  | 12 A     | S   | A      | yes         |                                                            |
| 47  | Draw the file's own styles           | load-one-file                | part  | 1 S       | 1 S      | 1 S        | 1 S            | 1 S  | 1 S      | S   | S      | yes         |                                                            |
| 48  | Refresh a source load                | replace-with-newer-data      | part  | 21 A      | 16 A     | 18 A       | 17 A           | 18 A | 17 A     | S   | A      | yes         |                                                            |
| 49  | Save steps as a recipe               | keep-and-replay-steps        | part  | 11 A      | 10 S     | 11 A       | 18 A           | 18 A | 10 S     | A   | A      | no          |                                                            |
| 50  | Computed column                      | derive-column                | yes   | 18 S      | 16 S     | 16 S       | 20 S           | 25 A | 14 S     | A   | S      | no          |                                                            |
| 51  | Similar-name duplicates              | resolve-duplicate-nodes      | part  | 23 A      | 23 A     | 24 A       | 23 A           | 18 A | 25 A     | A   | A      | yes         |                                                            |
| 52  | Id mapping table                     | map-identifiers              | yes   | 23 A      | 24 A     | 25 A       | 23 A           | 18 S | 22 A     | A   | A      | yes         |                                                            |
| 53  | Define a new source                  | load-from-network-source     | part  | 13 A      | 18 A     | 15 A       | 6 S            | 1 S  | 15 A     | A   | A      | no          |                                                            |
| 54  | Remove one source                    | know-provenance              | part  | 16 A      | 21 A     | 17 A       | 15 A           | 11 A | 17 A     | A   | A      | no          |                                                            |
| 55  | Two-mode projection                  | merge-or-compare-graphs      | part  | 25 A      | 25 A     | 23 A       | 25 A           | 25 A | 22 A     | A   | A      | yes         |                                                            |
| 56  | Union, intersection, difference      | merge-or-compare-graphs      | yes   | 25 A      | 25 A     | 23 A       | 25 A           | 25 A | 22 A     | A   | A      | yes         |                                                            |
| 57  | Earlier data after Replace           | merge-or-compare-graphs      | part  | 25 A      | 25 A     | 23 A       | 25 A           | 25 A | 22 A     | A   | A      | yes         |                                                            |
| 58  | Match nodes across graphs            | map-identifiers              | part  | 23 A      | 24 A     | 25 A       | 23 A           | 18 A | 22 A     | A   | A      | yes         |                                                            |
| 59  | Place roles                          | set-descriptive-role         | part  | 8 L       | 9 L      | 7 L        | 10 L           | 11 L | 7 L      | L   | L      | yes         | needs a map view                                           |
| 60  | Load a subset of a file              | load-subset                  | yes   | 14 L      | 15 L     | 12 L       | 14 L           | 1 L  | 12 L     | L   | L      | yes         | too-large path (46) covers the urgent half                 |

#### The first layer under the three answers to the owner question

- corrected: 4, 5, 12, 20, 11, 10, 7, 9, 14, 15, 8, 13, 18, 16, 17, 21
- audience: 4, 5, 12, 10, 11, 20, 7, 9, 14, 15, 8, 13, 18, 16, 17, 21
- blocking-first: 4, 5, 20, 12, 10, 14, 23, 24, 43, 26, 27, 42, 7, 9, 11, 8, 13, 18, 16, 17, 21

The first-layer lists hold every requirement the score puts in the first layer under that
weighting, plus those placed by a named rule, in that weighting's order.

### Jobs

#### load-one-file

**Job.** Load one file (a graph file such as GraphML/GEXF/JSON, or one edge table) by drop, file picker, URL or paste, and see a graph

**Example.** Elena drops a who-emails-whom CSV from her team; Priya (cybersecurity) drops an authentication-log CSV (user, host, timestamp); David opens this month's supplier export; Tomasz opens his lab's bait/prey TSV.

**Competitor pattern.** Primary in every graph tool surveyed (graph tools 10 (section F)); Power Query's Navigator offers Load without forcing the editor (BI [17] (section G)); Datawrapper and Flourish need only a drop or paste, and Flourish's network needs only a two-column Links sheet (data-prep tools 4 (section H)).

| persona                         | frequency     | importance | evidence                                                                                                                                                                                                                                                                            |
| ------------------------------- | ------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| explorer-elena                  | every-session | blocking   | FACT: personas/explorer-elena.yaml:21 'Starts by loading data and immediately looking at the visualization', :32 goal 'Load data and see visualization quickly', :27 'Abandons tools quickly'; workflows/W14.yaml:46 data loading phase, :102 metric 'Time to first visualization'. |
| analyst-alex                    | every-session | blocking   | FACT: in W01 and W18 (personas/analyst-alex.yaml:45-53); top-tasks.md:121-123 Load bookend 'Open this week's export'.                                                                                                                                                               |
| expert-emma                     | often         | blocking   | FACT: W01, W18 (personas/expert-emma.yaml:48-53); :26 moves data between graphty and R/Python. JUDGMENT: often, not every session, because she keeps working on a loaded project.                                                                                                   |
| fraud-analyst                   | every-session | blocking   | FACT: daily use, 50+ alerts a day (personas/fraud-analyst.yaml:6,40); W01. JUDGMENT: each alert is new case data, so every session starts with a load.                                                                                                                              |
| intelligence-analyst            | every-session | blocking   | FACT: daily (personas/intelligence-analyst.yaml:43); W09 phase 2 'Data Integration' (workflows/W09.yaml:56).                                                                                                                                                                        |
| cybersecurity-analyst           | every-session | blocking   | FACT: personas/cybersecurity-analyst.yaml:23 'Builds graphs from SIEM events', daily (:43). JUDGMENT: every hunt starts from a fresh event export.                                                                                                                                  |
| bioinformatics-researcher       | often         | blocking   | FACT: personas/bioinformatics-researcher.yaml:21 'Imports data from public databases (STRING, BioGRID, KEGG)'; W20 alternative 'load an edge list exported from STRING or BioGRID' (workflows/W20.yaml:54).                                                                         |
| genomics-cytoscape-user         | often         | blocking   | FACT: W20 phase 1 alternative (workflows/W20.yaml:53-54). Her default start is a gene list, not a file (personas/genomics-cytoscape-user.yaml:26,36), so a file load is the fallback path.                                                                                          |
| supply-chain-analyst            | every-session | blocking   | FACT: studio roster: 'You open the supplier export from the start screen' (studio branch design/studio-tier3, design/ui/studio/tier2/roster.md:150-151).                                                                                                                            |
| marketing-analyst               | every-session | blocking   | JUDGMENT: weekly social-graph analyses (personas/marketing-analyst.yaml:41) begin from an exported follower or interaction edge list; no persona line names the format.                                                                                                             |
| ml-engineer-recsys              | every-session | blocking   | FACT: personas/ml-engineer-recsys.yaml:22 'Constructs bipartite user-item graphs from interaction logs'; W16 phase 1 Graph Construction.                                                                                                                                            |
| knowledge-engineer              | often         | important  | JUDGMENT: she builds the graph in her own ETL (personas/knowledge-engineer.yaml:23) and loads exports into graphty to see and check them (:26-27), so loading matters but graphty is not her primary build tool.                                                                    |
| plugin-author-domain-researcher | every-session | blocking   | FACT: personas/plugin-author-domain-researcher.yaml:19 'Open the lab's own file format directly', :32 'Read a tab-separated lab file with custom column names'.                                                                                                                     |

Sources: design/designloom/workflows/W14.yaml; design/designloom/workflows/W18.yaml; design/ui/framework/top-tasks.md:121-123; graph tools (section F); BI tools (section G)

#### open-sample

**Job.** Open a sample dataset (or generate one) to learn the tool or test something

**Example.** Elena opens Les Miserables to see what a community coloring looks like before trying her own file; Marcus (data scientist) opens a small sample to compare his ported metric against NetworkX.

**Competitor pattern.** Cytoscape Web keeps 'Open Sample Networks' on its Data menu (graph tools 3 (section F)); Polinode offers a template download per file type (section 5).

| persona                      | frequency | importance | evidence                                                                                                                                                                       |
| ---------------------------- | --------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| explorer-elena               | sometimes | important  | FACT: W14 decision 'Should I try sample data first to learn the tool?' (workflows/W14.yaml:61); frustration 'No guidance on where to start' (personas/explorer-elena.yaml:36). |
| plugin-author-data-scientist | sometimes | important  | FACT: 'Validates the port by running both versions on a small graph' (personas/plugin-author-data-scientist.yaml:28) and runs code in Storybook (:29).                         |
| analyst-alex                 | rarely    | nice       | JUDGMENT: arrives with his own question and data (personas/analyst-alex.yaml:21); samples only to try an unfamiliar algorithm.                                                 |
| genomics-cytoscape-user      | rarely    | nice       | JUDGMENT: she follows tutorials step by step (personas/genomics-cytoscape-user.yaml:9-11), which ship their own sample data.                                                   |

Sources: design/designloom/workflows/W14.yaml:61; design/designloom/personas/explorer-elena.yaml

#### two-tables-one-network

**Job.** Load a node table and an edge table (two files or two sheets) as one network

**Example.** David loads 'suppliers.csv' (id, name, country, capacity) and 'ships_to.csv' (from, to, volume); Sarah loads an accounts table and a transfers table.

**Competitor pattern.** Gephi: import nodes, then edges with 'Append to existing workspace' (graph tools 1 (section F)); Polinode Nodes/Edges sheets; Kumu Elements/Connections sheets; Flourish Points + Links (data-prep tools 4 (section H)); networkx builds edges then sets node attributes separately (section 3).

| persona              | frequency | importance | evidence                                                                                                                                                                                                                                                                                                          |
| -------------------- | --------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| supply-chain-analyst | often     | blocking   | FACT: 'Your exports often come as two sheets (suppliers, and who ships to whom), and so far you have merged them in Excel first' (studio branch design/studio-tier3, design/ui/studio/tier2/roster.md:153-155); W11 input 'Supplier relationship data + geographic data + capacity data' (workflows/W11.yaml:90). |
| knowledge-engineer   | often     | important  | FACT: W13 phases Entity Extraction then Relationship Mapping (workflows/W13.yaml:42-44). JUDGMENT: entities and relations arrive as separate tables.                                                                                                                                                              |
| fraud-analyst        | often     | important  | FACT: W06 needs 'Shared identifiers with other entities (device, address, payment method)' (workflows/W06.yaml, Information Needs). JUDGMENT: account attributes and transactions come from different tables.                                                                                                     |
| intelligence-analyst | often     | important  | FACT: 'Works with multi-modal networks' (personas/intelligence-analyst.yaml:26); W09 input 'Multi-source intelligence data' (workflows/W09.yaml:112).                                                                                                                                                             |
| marketing-analyst    | sometimes | important  | FACT: frustration 'No easy way to combine network position with traditional customer attributes' (personas/marketing-analyst.yaml:37).                                                                                                                                                                            |
| ml-engineer-recsys   | sometimes | important  | FACT: W16 information needs 'Item attributes for content-based augmentation' (workflows/W16.yaml:68).                                                                                                                                                                                                             |
| analyst-alex         | sometimes | important  | FACT: the studio's two-table task T4 was run by the Alex persona (studio branch design/studio-tier3, design/ui/studio/tier2/roster.md:197-198). JUDGMENT: sometimes.                                                                                                                                              |
| explorer-elena       | rarely    | nice       | FACT: studio task T4 two tables included Elena (roster.md:197). JUDGMENT: her data usually arrives as one file.                                                                                                                                                                                                   |

Sources: design/ui/tier1-real-app/tier1-design.md (task T4, lines 620-633 per design inventory (section D)); studio branch design/studio-tier3, design/ui/studio/tier2/roster.md:150-156

#### preview-validate-before-load

**Job.** Preview and validate before loading: see the first rows, the guessed mapping, and what will be left out (unmatched ends, bad rows, repeated edges) before committing

**Example.** Priya (genomics) sees '18 of 340 rows name genes not in the network' before she commits; Tomasz sees 'row 412: replicate count is not a number' instead of a failed load; Alex sees that his edge list was read as a node list and flips it.

**Competitor pattern.** Cytoscape's import shows a live parse preview (graph tools 2 (section F)); Neo4j Data Importer highlights incomplete mappings and refuses to import them (section 7); Power Query Navigator preview plus CSV options (BI [17][18] (section G)); Kumu has a review step before save (graph tools 4 (section F)).

| persona                         | frequency     | importance | evidence                                                                                                                                                                                                            |
| ------------------------------- | ------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| analyst-alex                    | every-session | important  | FACT: W18 phases Preview and Validation (workflows/W18.yaml:45,49); pain 'Field mapping is wrong (e.g., treating edge list as node list)' (:84).                                                                    |
| explorer-elena                  | every-session | important  | FACT: W14 information need 'Preview of data before committing to load' (workflows/W14.yaml:72); frustration 'Fear of breaking things' (personas/explorer-elena.yaml:37).                                            |
| genomics-cytoscape-user         | often         | blocking   | FACT: frustrations 'Identifier mismatches that silently drop half the attributes with no count of what matched' and '30 columns crammed into a preview of five rows' (personas/genomics-cytoscape-user.yaml:37-38). |
| plugin-author-domain-researcher | every-session | blocking   | FACT: frustration 'A reader that fails the whole file because of one malformed row, with no row number' (personas/plugin-author-domain-researcher.yaml:38); tries a fix 'at most two or three times' (:27).         |
| knowledge-engineer              | every-session | important  | FACT: 'Source data quality is often poor and inconsistent' (personas/knowledge-engineer.yaml:36); W13 requires data-validation (workflows/W13.yaml:9).                                                              |
| supply-chain-analyst            | often         | important  | FACT: supplier data 'scattered across multiple ERP systems' (personas/supply-chain-analyst.yaml:36). JUDGMENT: mixed exports need checking.                                                                         |
| expert-emma                     | sometimes     | nice       | FACT: frustration 'Forced wizard workflows' (personas/expert-emma.yaml:40). JUDGMENT: she wants an unambiguous file to load with no stop.                                                                           |
| fraud-analyst                   | sometimes     | important  | FACT: time pressure high (personas/fraud-analyst.yaml:11); 'Slow investigation workflows' (:37). JUDGMENT: a known export should load in one step; the preview matters only when something is off.                  |

Sources: design/designloom/workflows/W18.yaml; design/designloom/workflows/W14.yaml:72; design inventory (section D) (J6, J7, J14, J17, J30)

#### check-what-loaded

**Job.** Check what loaded and its quality: counts, direction, components, isolates, attribute completeness, missing values, mixed types

**Example.** Dr. Kim reads '214 isolated nodes, 3 components, label 61% filled' and knows the people export did not link to the org table; Priya (genomics) reads the component sizes and keeps the largest.

**Competitor pattern.** Power Query's profiling is off by default and samples 1,000 rows (BI [22] (section G)); Sheets Column stats and cleanup suggestions (BI [32] (section G)); OpenRefine facets double as the quality report (data-prep tools 1 (section H)).

| persona                   | frequency     | importance | evidence                                                                                                                                                                                            |
| ------------------------- | ------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| analyst-alex              | every-session | blocking   | FACT: top-tasks task 1 'What have I got, and did it load right?' every session (design/ui/framework/top-tasks.md:64-73); W01.                                                                       |
| explorer-elena            | every-session | important  | FACT: goal 'Learn basic structure of their data' (personas/explorer-elena.yaml:31); W14 'Basic statistics after loading' (workflows/W14.yaml:74).                                                   |
| expert-emma               | every-session | important  | FACT: W01; 'Validates tool results against reference implementations' (personas/expert-emma.yaml:24).                                                                                               |
| knowledge-engineer        | every-session | blocking   | FACT: 'Analyzes graph structure to identify gaps and inconsistencies in coverage' (personas/knowledge-engineer.yaml:26); goal 'Ensure data quality through entity resolution and validation' (:33). |
| genomics-cytoscape-user   | every-session | important  | FACT: W20 needs 'Count of query genes found vs not found' and 'Component sizes so the largest can be selected in one click' (workflows/W20.yaml:88-90).                                             |
| bioinformatics-researcher | often         | important  | FACT: W01 (personas/bioinformatics-researcher.yaml:46).                                                                                                                                             |
| fraud-analyst             | often         | important  | FACT: W01 (personas/fraud-analyst.yaml:46).                                                                                                                                                         |
| intelligence-analyst      | often         | important  | FACT: W01 (personas/intelligence-analyst.yaml:45).                                                                                                                                                  |
| supply-chain-analyst      | often         | important  | FACT: roster 'look at what loaded on the Data place' (studio branch design/studio-tier3, design/ui/studio/tier2/roster.md:151).                                                                     |
| cybersecurity-analyst     | sometimes     | important  | JUDGMENT: high time pressure (personas/cybersecurity-analyst.yaml:13) and a known SIEM pipeline; she checks only when counts look wrong.                                                            |

Sources: design/ui/framework/top-tasks.md:64-73; design/designloom/workflows/W01.yaml:60-79

#### set-structural-role

**Job.** Set a column's structural role: node id, source, target, label, edge weight, and declare what the weight means (strength, distance, capacity)

**Example.** Tomasz maps 'bait' to source, 'prey' to target, 'confidence' to weight as strength; David says 'volume' is a capacity; Chris marks user_id and item_id as the two ends of a bipartite edge.

**Competitor pattern.** Cytoscape: click a column header to make it Source/Target/Interaction (graph tools 2 (section F)); Gephi, Kumu and Polinode rely on fixed column names and generate the most help text (sections 1, 4, 5, 11); Flourish fills bindings automatically by type in priority order (data-prep tools 4 (section H)).

| persona                         | frequency     | importance | evidence                                                                                                                                                                                                                                                                                                                                                        |
| ------------------------------- | ------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| analyst-alex                    | often         | blocking   | FACT: W18 phase 3 Field Mapping (workflows/W18.yaml:43), pain 'treating edge list as node list' (:84).                                                                                                                                                                                                                                                          |
| supply-chain-analyst            | often         | blocking   | FACT: roster 'You have never told the program how to read a number in your file' (studio branch design/studio-tier3, design/ui/studio/tier2/roster.md:155-156); studio task T20 'weight at load' (roster.md:189-190) passed 8 of 8 once the Data page set the meaning (studio branch design/studio-tier3, design/ui/studio/tier2/report.md, graphty app table). |
| ml-engineer-recsys              | every-session | blocking   | FACT: 'Constructs bipartite user-item graphs from interaction logs' (personas/ml-engineer-recsys.yaml:22).                                                                                                                                                                                                                                                      |
| plugin-author-domain-researcher | every-session | blocking   | FACT: 'tab-separated file with its own column conventions (bait, prey, a confidence score and a replicate count)' (personas/plugin-author-domain-researcher.yaml:7-8).                                                                                                                                                                                          |
| cybersecurity-analyst           | every-session | important  | FACT: graphs 'connecting users, endpoints, processes, and network connections' (personas/cybersecurity-analyst.yaml:23). JUDGMENT: SIEM columns (src_ip, dst_ip) need mapping each time unless remembered.                                                                                                                                                      |
| genomics-cytoscape-user         | often         | important  | FACT: W23 needs 'Which edges were used (weight attribute, direction) for each run' (workflows/W23.yaml:89).                                                                                                                                                                                                                                                     |
| bioinformatics-researcher       | often         | important  | JUDGMENT: STRING and BioGRID exports carry confidence scores that must be read as strength, not distance (top-tasks.md:49-51 cost-of-error rule).                                                                                                                                                                                                               |
| fraud-analyst                   | often         | important  | FACT: traces money A->B->C->D (personas/fraud-analyst.yaml:23). JUDGMENT: direction and amount-as-weight change every path result.                                                                                                                                                                                                                              |
| explorer-elena                  | sometimes     | blocking   | JUDGMENT: she should not need to touch roles; when a guess is wrong and she cannot fix it she abandons (personas/explorer-elena.yaml:27,35).                                                                                                                                                                                                                    |
| expert-emma                     | sometimes     | important  | FACT: 'Configures algorithm parameters precisely' (personas/expert-emma.yaml:23). JUDGMENT: her GraphML files carry roles already.                                                                                                                                                                                                                              |

Sources: design/ui/framework/top-tasks.md:49-51; design/designloom/workflows/W18.yaml:43; design/ui/tier1-real-app/tier1-design.md:395-428 (per design inventory (section D) J8, J10)

#### set-descriptive-role

**Job.** Set a column's descriptive role: node or edge type/category, time (one moment or start/end), and geographic position (latitude/longitude, country)

**Example.** Marcus (intelligence) marks 'call_start' as time and 'cell_tower_lat/lon' as position; David marks 'country' as a location to see regional concentration; Dr. Kim marks 'entity_type' as the node type.

**Competitor pattern.** Tableau infers geographic roles from field names and generates latitude/longitude (BI [4][5] (section G)); Power BI 'Data category' with the 'AL' ambiguity (BI [21] (section G)); Neo4j maps rows onto labeled node types (graph tools 7 (section F)).

| persona                 | frequency     | importance | evidence                                                                                                                                                                                                  |
| ----------------------- | ------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| intelligence-analyst    | often         | important  | FACT: 'Applies temporal analysis', 'Uses geographic overlays', 'multi-modal networks' (personas/intelligence-analyst.yaml:22,25,26).                                                                      |
| supply-chain-analyst    | often         | important  | FACT: 'Overlays geographic data' (personas/supply-chain-analyst.yaml:25); 'Geographic visualization options are limited' (:40); W11 needs 'Geographic locations of all entities' (workflows/W11.yaml:66). |
| cybersecurity-analyst   | every-session | important  | FACT: 'Creates timeline visualizations showing attack progression' (personas/cybersecurity-analyst.yaml:29); W07 temporal-analysis (workflows/W07.yaml:15).                                               |
| fraud-analyst           | every-session | important  | FACT: 'Starts investigation by examining temporal patterns' (personas/fraud-analyst.yaml:21); W06 temporal-navigation.                                                                                    |
| knowledge-engineer      | often         | important  | FACT: 'Designs ontologies and entity schemas' (personas/knowledge-engineer.yaml:22); W13 phase Schema Design (workflows/W13.yaml:40).                                                                     |
| marketing-analyst       | sometimes     | important  | FACT: 'Lack of temporal analysis to track how influence changes over time' (personas/marketing-analyst.yaml:38).                                                                                          |
| ml-engineer-recsys      | sometimes     | important  | FACT: W16 needs 'User-item interaction data with timestamps' (workflows/W16.yaml:66). JUDGMENT: user vs item is a node type.                                                                              |
| analyst-alex            | sometimes     | nice       | FACT: W19 Network Evolution Analysis (personas/analyst-alex.yaml:54).                                                                                                                                     |
| genomics-cytoscape-user | rarely        | nice       | JUDGMENT: her nodes are all genes; W22 nodes are pathways only (workflows/W22.yaml:35).                                                                                                                   |

Sources: design/designloom/personas/intelligence-analyst.yaml; design/designloom/personas/supply-chain-analyst.yaml; capability table (section E) (no date or geo kind)

#### set-column-type

**Job.** Set or correct a column's value type (number, category, text, date, yes/no, list), with a count of values that will not convert

**Example.** Priya (genomics) fixes gene ids that a spreadsheet turned into dates (SEPT2 -> 2-Sep); Sarah turns 'amount' from text ('$1,200') into a number; Elena never sees the question because the guess was right.

**Competitor pattern.** Datawrapper guesses at 90% tolerance, shows the type by color and fixes it with one select (data-prep tools 4 (section H)); Gephi cannot change an existing column's type (graph tools 1 (section F)); Kumu's Size by stays empty until a field is Number (section 4); Power Query's 200-row guess and hard-coded Changed type step break refresh (BI [20][28] (section G)).

| persona                      | frequency | importance | evidence                                                                                                                                                                                          |
| ---------------------------- | --------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| genomics-cytoscape-user      | often     | important  | FACT: 10 to 40 attribute columns per table (personas/genomics-cytoscape-user.yaml:8-9). JUDGMENT: mangled gene ids and 'NA' strings make numeric columns text (design inventory (section D) J31). |
| knowledge-engineer           | often     | important  | FACT: 'Source data quality is often poor and inconsistent' (personas/knowledge-engineer.yaml:36).                                                                                                 |
| analyst-alex                 | sometimes | important  | FACT: W18 validation 'type mismatches' (workflows/W18.yaml:49); top-tasks names 'a weight read as text' as a broken import (top-tasks.md:69-70).                                                  |
| fraud-analyst                | sometimes | important  | JUDGMENT: timestamps and amounts often arrive as text in bank exports; temporal start depends on it (personas/fraud-analyst.yaml:21).                                                             |
| supply-chain-analyst         | sometimes | important  | FACT: 'Analyzes flow capacity and utilization' (personas/supply-chain-analyst.yaml:26). JUDGMENT: ERP exports mix units and text.                                                                 |
| plugin-author-data-scientist | sometimes | important  | FACT: frustration 'Results that are silently NaN or zero because an attribute name was misspelt' (personas/plugin-author-data-scientist.yaml:42).                                                 |
| explorer-elena               | rarely    | nice       | JUDGMENT: types must be inferred for her; 'Unclear terminology' (personas/explorer-elena.yaml:35).                                                                                                |

Sources: graph-io/src/common/text.ts:1-13 (graph-io infers bool->i32->f64->string with no tolerance and no date type); design inventory (section D) J9

#### add-second-file

**Job.** Add a second file to the current graph (append nodes and edges), matching nodes by id, with a rule for ids that already exist

**Example.** Marcus (intelligence) adds this week's travel records to the communications network; Dr. Kim adds the HR system's people export to the projects graph; Priya (cybersecurity) adds a threat-intel indicator feed to the event graph.

**Competitor pattern.** Gephi's append-or-new-workspace radio button, with users landing in two workspaces by mistake (graph tools 1 (section F)); Kumu re-import duplicates without IDs (section 4); Airtable merge field: update, create, or skip (data-prep tools 2 (section H)).

| persona                   | frequency | importance | evidence                                                                                                                                                                                                      |
| ------------------------- | --------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| intelligence-analyst      | often     | blocking   | FACT: W09 phase 2 'Collect and merge records (communications, financial, travel, surveillance)' (workflows/W09.yaml:56); motivation 'Connect disparate data sources' (personas/intelligence-analyst.yaml:18). |
| knowledge-engineer        | often     | blocking   | FACT: goal 'Integrate data from multiple source systems into unified graphs' (personas/knowledge-engineer.yaml:32).                                                                                           |
| cybersecurity-analyst     | often     | important  | FACT: 'Correlates internal events with external threat intelligence feeds' (personas/cybersecurity-analyst.yaml:26); frustration 'Difficulty correlating events across multiple data sources' (:38).          |
| fraud-analyst             | often     | important  | FACT: frustration 'Disconnected data sources' (personas/fraud-analyst.yaml:38).                                                                                                                               |
| supply-chain-analyst      | often     | important  | FACT: 'Supplier data is scattered across multiple ERP systems' (personas/supply-chain-analyst.yaml:36); Tier 2+ mapping (:22).                                                                                |
| bioinformatics-researcher | sometimes | important  | FACT: 'merges with experimental results' (personas/bioinformatics-researcher.yaml:21).                                                                                                                        |
| analyst-alex              | sometimes | nice       | JUDGMENT: one export per question is his norm (personas/analyst-alex.yaml:21).                                                                                                                                |

Sources: design/designloom/workflows/W09.yaml:54-58; design/designloom/workflows/W13.yaml:42-46; studio branch design/studio-tier3, design/ui/studio/tier2/report.md (deferred severity 2: a newer copy lands on Add even when every tie would be added twice; the Add page leaves new people out by default)

#### join-table-onto-nodes

**Job.** Add attributes to existing nodes from a table matched by an id column, with matched / unmatched / duplicate counts and a rule for clashing column names

**Example.** Priya (genomics) joins a 30-column logFC and p-value table by gene symbol and reads '318 of 340 rows matched; TP53 matches 2 rows'; Jordan joins a CRM table (lifetime value, churn risk) onto customers by customer_id.

**Competitor pattern.** Cytoscape's separate Import Table command; its top community complaint is a join that matches nothing with no reason (graph tools 2, 11 (section F)); Power Query Merge shows an estimate of matching rows and suggests key pairs (BI [23] (section G)); pandas indicator/validate/suffixes (data-prep tools 3 (section H)); networkx silently ignores unknown keys.

| persona                   | frequency     | importance | evidence                                                                                                                                                                                                                            |
| ------------------------- | ------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| genomics-cytoscape-user   | every-session | blocking   | FACT: W20 phase 3 'Join the data table ... check how many rows matched' (workflows/W20.yaml:59-60); 'Joins a wide attribute table ... onto the network by gene symbol' (personas/genomics-cytoscape-user.yaml:28); frustration :37. |
| bioinformatics-researcher | often         | blocking   | FACT: 'merges with experimental results' (personas/bioinformatics-researcher.yaml:21); W20 (:50).                                                                                                                                   |
| marketing-analyst         | often         | important  | FACT: frustration 'No easy way to combine network position with traditional customer attributes' (personas/marketing-analyst.yaml:37).                                                                                              |
| supply-chain-analyst      | often         | important  | FACT: 'Hard to combine network analysis with traditional supply chain metrics' (personas/supply-chain-analyst.yaml:39); W11 input includes geographic and capacity data (workflows/W11.yaml:90).                                    |
| fraud-analyst             | sometimes     | important  | JUDGMENT: risk scores and KYC flags from another system attach to accounts (personas/fraud-analyst.yaml:33 'Prioritize investigations based on risk').                                                                              |
| ml-engineer-recsys        | sometimes     | important  | FACT: W16 'Item attributes for content-based augmentation' (workflows/W16.yaml:68).                                                                                                                                                 |
| intelligence-analyst      | sometimes     | important  | JUDGMENT: watchlist flags onto people; multi-source data (personas/intelligence-analyst.yaml:26).                                                                                                                                   |
| analyst-alex              | sometimes     | important  | JUDGMENT: brings 'broader analytical projects' data (personas/analyst-alex.yaml:5-6).                                                                                                                                               |
| knowledge-engineer        | sometimes     | important  | JUDGMENT: enriches entities from a second system; part of integration (personas/knowledge-engineer.yaml:32).                                                                                                                        |

Sources: design/designloom/workflows/W20.yaml:59-60,92; capability table (section E) section 2 item 1 (merge import skips existing nodes silently; issue #298)

#### map-identifiers

**Job.** Map identifiers between systems (gene symbol / Entrez / UniProt; hostname / IP; account number formats) before or during a join, including case and whitespace normalization

**Example.** Priya (genomics) converts her table's Ensembl ids to the gene symbols STRING used; Priya (cybersecurity) treats src_ip and dst_ip as the same kind of id so one IP is one node.

**Competitor pattern.** OpenRefine reconciliation with scored candidates (data-prep tools 1 (section H)); Cytoscape join failures caused by symbol vs Entrez, whitespace and case (graph tools 2 (section F)); Graphistry hypergraph CATEGORIES (section 9).

| persona                   | frequency | importance | evidence                                                                                                                                                                                                                                                              |
| ------------------------- | --------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| genomics-cytoscape-user   | often     | important  | FACT: 'fights identifier mismatches (symbol vs Entrez vs UniProt, case sensitivity)' (personas/genomics-cytoscape-user.yaml:28); W20 decision 'were the mismatched rows worth chasing' (workflows/W20.yaml:79); W24 'phantom specific nodes' (workflows/W24.yaml:98). |
| bioinformatics-researcher | sometimes | important  | FACT: combines STRING, BioGRID, KEGG (personas/bioinformatics-researcher.yaml:21). JUDGMENT: each uses different ids.                                                                                                                                                 |
| knowledge-engineer        | often     | important  | FACT: 'balancing ontological rigor with the messy realities of enterprise data' (personas/knowledge-engineer.yaml:9-10). JUDGMENT: source systems key the same entity differently.                                                                                    |
| cybersecurity-analyst     | sometimes | nice       | JUDGMENT: host names vs IPs across SIEM sources (personas/cybersecurity-analyst.yaml:38).                                                                                                                                                                             |
| fraud-analyst             | sometimes | nice       | JUDGMENT: account number formats differ between systems (personas/fraud-analyst.yaml:38).                                                                                                                                                                             |

Sources: design/designloom/personas/genomics-cytoscape-user.yaml:28; design inventory (section D) J12, J26

#### merge-or-compare-graphs

**Job.** Keep several named graphs and merge or compare two of them (union, intersection, difference, with a membership column and per-condition attributes side by side)

**Example.** Priya (genomics) merges tumor and normal networks and colors edges 'tumor only / normal only / both', keeping logFC_tumor and logFC_normal; David compares this quarter's supplier network with last quarter's.

**Competitor pattern.** Cytoscape Tools > Merge > Networks (union, intersection, difference) with matching columns and per-column rules, kept out of import (graph tools 2 (section F)); Cytoscape Web kept it as its own chapter (section 3).

| persona                   | frequency | importance | evidence                                                                                                                                                                                                                               |
| ------------------------- | --------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| genomics-cytoscape-user   | sometimes | important  | FACT: 'Keeps several related networks ... in one session' (personas/genomics-cytoscape-user.yaml:33); frustration 'No way to keep a subnetwork and the parent network open together' (:39); W24 phases 1-2 (workflows/W24.yaml:49-53). |
| bioinformatics-researcher | sometimes | important  | FACT: 'Compares disease vs. healthy networks' (personas/bioinformatics-researcher.yaml:24); W24.                                                                                                                                       |
| supply-chain-analyst      | sometimes | nice       | FACT: goal 'Track supplier network changes over time' (personas/supply-chain-analyst.yaml:34).                                                                                                                                         |
| marketing-analyst         | rarely    | nice       | FACT: 'Tracks network evolution to spot rising influencers early' (personas/marketing-analyst.yaml:24). JUDGMENT: a time column usually serves better than two graphs.                                                                 |
| analyst-alex              | rarely    | nice       | FACT: W19 uses comparison-view (workflows/W19.yaml:11).                                                                                                                                                                                |

Sources: design/designloom/workflows/W24.yaml; design/ui/framework/top-tasks.md:173-180 (tail: 'combine two graphs')

#### resolve-duplicate-nodes

**Job.** Find and merge duplicate nodes (same real-world entity under different ids or spellings), previewing the groups and choosing a rule per attribute (first, sum, list, earliest)

**Example.** Dr. Kim merges 'IBM', 'I.B.M.' and 'International Business Machines' from three CRMs; Marcus (intelligence) merges two phone numbers known to belong to one person; David merges a supplier listed under two ERP codes.

**Competitor pattern.** OpenRefine clusters strict-to-lax and the person approves each cluster (data-prep tools 1 (section H)); Gephi 'Detect and merge node duplicates' merges blind (graph tools 1 (section F)); Linkurious duplicate detection by primary key at import (section 8); Kumu advice is to fix the sheet and re-import (section 4).

| persona                   | frequency     | importance | evidence                                                                                                                                                                                                              |
| ------------------------- | ------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| knowledge-engineer        | every-session | blocking   | FACT: 'Uses entity resolution techniques to merge duplicate entities' (personas/knowledge-engineer.yaml:24); W13 phase 4 Entity Resolution and 'Duplicate candidate pairs for resolution' (workflows/W13.yaml:46,74). |
| intelligence-analyst      | often         | important  | FACT: W09 phase 3 'resolve duplicates, build graph' (workflows/W09.yaml:58); W09 requires node-merging (:19).                                                                                                         |
| fraud-analyst             | sometimes     | important  | FACT: goal 'Identify bad actors across multiple accounts' (personas/fraud-analyst.yaml:31). JUDGMENT: she usually wants the shared identifier shown, not merged, so merging is occasional.                            |
| supply-chain-analyst      | sometimes     | important  | JUDGMENT: scattered ERP data (personas/supply-chain-analyst.yaml:36) lists one supplier under several codes.                                                                                                          |
| cybersecurity-analyst     | sometimes     | nice       | JUDGMENT: one host under several names across sources (personas/cybersecurity-analyst.yaml:38).                                                                                                                       |
| bioinformatics-researcher | rarely        | nice       | FACT: W22 requires node-merging (workflows/W22.yaml:17).                                                                                                                                                              |

Sources: design/designloom/workflows/W13.yaml:46,74; design/designloom/workflows/W09.yaml:58; design/ui/framework/top-tasks.md:178 (tail: merging duplicates)

#### replace-with-newer-data

**Job.** Replace the graph's data with a newer export and keep the analysis (rules, runs, styles, sets, notes), seeing what changed

**Example.** David loads October's supplier export over September's project and the chokepoint ranking reruns; Jordan swaps in this week's follower export and keeps her influencer coloring.

**Competitor pattern.** Kumu Google Sheets is a live, re-fetched source (graph tools 4 (section F)); Power Query refresh replays applied steps (BI [17][27] (section G)); Polinode makes a new network on re-upload (graph tools 5 (section F)).

| persona                 | frequency | importance | evidence                                                                                                                                                                                                                                                                                                                                    |
| ----------------------- | --------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| supply-chain-analyst    | often     | blocking   | FACT: 'Every month the numbers change and you redo the ranking by hand' (studio branch design/studio-tier3, design/ui/studio/tier2/roster.md:155-156); studio task T21 rerun (roster.md:191-192); studio found 'Replace has no visible control' (studio branch design/studio-tier3, design/ui/studio/tier2/report.md, deferred severity 2). |
| analyst-alex            | often     | important  | FACT: top-tasks task 12 'Do last week's analysis on this week's export', most sessions (design/ui/framework/top-tasks.md:164-169); goal 'Use specific workflows repeatedly' (personas/analyst-alex.yaml:32).                                                                                                                                |
| marketing-analyst       | often     | important  | FACT: weekly use and 'Tracks network evolution' (personas/marketing-analyst.yaml:24,41).                                                                                                                                                                                                                                                    |
| knowledge-engineer      | often     | important  | FACT: W13 pain 'Keeping the KG up-to-date as source data changes' (workflows/W13.yaml:89).                                                                                                                                                                                                                                                  |
| fraud-analyst           | rarely    | nice       | JUDGMENT: each alert is a new case, not a refresh of the last one.                                                                                                                                                                                                                                                                          |
| genomics-cytoscape-user | rarely    | nice       | JUDGMENT: a new gene list is a new analysis applied from a recipe, not a replace (top-tasks.md:125-133).                                                                                                                                                                                                                                    |

Sources: design/ui/framework/top-tasks.md:164-169; studio branch design/studio-tier3, design/ui/studio/tier2/report.md

#### load-from-network-source

**Job.** Load from a network source or a list of ids: query STRING/NDEx, a graph database (Cypher, SPARQL), a SIEM or a REST API, with credentials

**Example.** Priya (genomics) pastes 300 gene symbols, picks human and confidence 0.7, and gets the STRING network; Dr. Kim runs a SPARQL query for one department's entities; Priya (cybersecurity) pulls the last 24 hours of logons for one host.

**Competitor pattern.** Cytoscape Web 'Open Network(s) from NDEx' on the Data menu (graph tools 3 (section F)); Kumu live Google Sheets (section 4); Datawrapper linked sheets and URLs (data-prep tools 4 (section H)).

| persona                   | frequency     | importance | evidence                                                                                                                                                                                                                                                                                            |
| ------------------------- | ------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| genomics-cytoscape-user   | every-session | blocking   | FACT: 'Starts from a gene list copied out of a spreadsheet, not from a graph file' (personas/genomics-cytoscape-user.yaml:26); W20 phase 1 (workflows/W20.yaml:53-54); frustration :36.                                                                                                             |
| bioinformatics-researcher | often         | important  | FACT: frustration 'Poor integration with biological databases like STRING' (personas/bioinformatics-researcher.yaml:35).                                                                                                                                                                            |
| knowledge-engineer        | every-session | blocking   | FACT: 'Writes SPARQL or Cypher queries' (personas/knowledge-engineer.yaml:25); W13 'Extract entities from source systems (databases, documents, APIs)' (workflows/W13.yaml:42) on 10,000-10,000,000 nodes (:26). JUDGMENT: a graph that size is queried, not opened.                                |
| cybersecurity-analyst     | every-session | important  | FACT: 'Builds graphs from SIEM events' (personas/cybersecurity-analyst.yaml:23); 'Graph databases are too slow' (:39); W07 turns a hypothesis into a graph query over 100,000+ nodes (workflows/W07.yaml:34,50).                                                                                    |
| fraud-analyst             | often         | important  | FACT: 'Disconnected data sources' (personas/fraud-analyst.yaml:38); W06 starts from one flagged entity in 10,000-1,000,000 nodes (workflows/W06.yaml:50,65). JUDGMENT: the seed comes from a server; expansion is its own job below.                                                                |
| intelligence-analyst      | often         | important  | FACT: W09 phase 2 'Collect and merge records (communications, financial, travel, surveillance)' (workflows/W09.yaml:56). JUDGMENT: the persona names no server, and classified systems may not allow a browser to connect ('Maintain operational security', personas/intelligence-analyst.yaml:19). |

Sources: design/designloom/workflows/W20.yaml:53-54; design/graph-io/network-sources-design.md (landed on golden in graphty-element, not in the app, per capability table (section E))

#### expand-from-source

**Job.** Expand a node's neighborhood from the server it came from (click-to-expand), with a depth, direction, type filter and limit, and collapse it again

**Example.** Sarah opens a flagged account and expands its 2-hop neighborhood from the transaction database; Marcus expands a seed suspect's contacts, then collapses a branch that led nowhere.

**Competitor pattern.** Neo4j Bloom and Linkurious expand a node's neighbors from the database in place (JUDGMENT: from general knowledge, not re-checked for this appendix); NDEx answers a neighborhood query on a stored network (design/graph-io/network-sources-design.md section 12.1).

| persona                   | frequency     | importance | evidence                                                                                                                                                     |
| ------------------------- | ------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| fraud-analyst             | every-session | blocking   | FACT: W06 phase 1 '1-2 hop neighborhood' and phase 3 'Expand investigation' (workflows/W06.yaml:65,69); 50+ alerts daily (personas/fraud-analyst.yaml:6).    |
| intelligence-analyst      | often         | important  | FACT: W05, W09 and W17 require neighborhood-expansion (capabilities/neighborhood-expansion.yaml); W09 phase 1 'identify seed entities' (workflows/W09.yaml). |
| cybersecurity-analyst     | often         | important  | FACT: W07 phase 5 'expand or narrow scope' on 100,000+ nodes (workflows/W07.yaml:34,56).                                                                     |
| analyst-alex              | sometimes     | important  | FACT: W05 and W17 require neighborhood-expansion (capabilities/neighborhood-expansion.yaml).                                                                 |
| bioinformatics-researcher | sometimes     | important  | JUDGMENT: growing a STRING or NDEx network around proteins of interest.                                                                                      |
| knowledge-engineer        | sometimes     | important  | FACT: 'Writes SPARQL or Cypher queries to explore and validate the knowledge graph' (personas/knowledge-engineer.yaml:25).                                   |

Sources: design/designloom/capabilities/neighborhood-expansion.yaml; design inventory (section D) J22; design/graph-io/network-sources-design.md section 14.4

#### load-subset

**Job.** Load only part of a large source (a time window, the neighborhood of a seed, the strongest ties, a sample) instead of the whole thing

**Example.** Chris loads only purchases from the last 30 days for 50,000 users; Priya (cybersecurity) loads only events for the 6 hours around the alert; Sarah loads the 2-hop neighborhood of the flagged account.

**Competitor pattern.** Tableau extract filters and data source filters (BI [12] (section G)); Neo4j Data Importer file filter feeds only matching rows (graph tools 7 (section F)).

| persona                   | frequency     | importance | evidence                                                                                                                                                                                                                          |
| ------------------------- | ------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ml-engineer-recsys        | every-session | blocking   | FACT: W16 node_count 10,000-10,000,000 (workflows/W16.yaml:24); frustration 'Visualization tools can't handle graphs with millions of edges' (personas/ml-engineer-recsys.yaml:38); W16 decision 'Which interactions to include'. |
| cybersecurity-analyst     | often         | important  | FACT: 'Visualizations become unusable during active incidents with high event volume' (personas/cybersecurity-analyst.yaml:41).                                                                                                   |
| marketing-analyst         | sometimes     | important  | FACT: 'Tools that can't handle social graphs with millions of users' (personas/marketing-analyst.yaml:36).                                                                                                                        |
| fraud-analyst             | sometimes     | important  | FACT: W06 node_count 10,000-1,000,000 (workflows/W06.yaml:50); phase 1 is a 1-2 hop neighborhood.                                                                                                                                 |
| bioinformatics-researcher | sometimes     | nice       | FACT: 'networks with tens of thousands of nodes' (personas/bioinformatics-researcher.yaml:7-8).                                                                                                                                   |
| analyst-alex              | rarely        | nice       | FACT: W01 decision 'Is graph size manageable or does it require sampling/filtering?' (workflows/W01.yaml:60).                                                                                                                     |

Sources: design/designloom/workflows/W01.yaml:60,84; design inventory (section D) J15 (tier1 refuses a file too large to draw)

#### know-provenance

**Job.** Know which source (load) each node and edge came from, and remove one source

**Example.** Marcus (intelligence) shows that the link between two suspects comes from the travel records, not the phone records, for the briefing; Dr. Kim removes the stale CRM load and keeps the others.

**Competitor pattern.** Tableau unions add Table Name and Sheet origin columns (BI [10] (section G)); Kumu treats the sheet as the source of truth (graph tools 4 (section F)).

| persona                   | frequency | importance | evidence                                                                                                                                                                  |
| ------------------------- | --------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| intelligence-analyst      | often     | important  | FACT: frustration 'Difficulty documenting evidence for links' (personas/intelligence-analyst.yaml:37).                                                                    |
| fraud-analyst             | often     | important  | FACT: 'Documents evidence trail meticulously for legal proceedings' (personas/fraud-analyst.yaml:26).                                                                     |
| knowledge-engineer        | often     | important  | FACT: motivation 'Establish data governance' (personas/knowledge-engineer.yaml:19).                                                                                       |
| cybersecurity-analyst     | sometimes | important  | FACT: incident reports (personas/cybersecurity-analyst.yaml:29). JUDGMENT: which feed an indicator came from matters to the report.                                       |
| bioinformatics-researcher | sometimes | nice       | FACT: 'Documents analysis parameters for reproducibility' (personas/bioinformatics-researcher.yaml:27); W25 phase 2 records import parameters (workflows/W25.yaml:47-48). |

Sources: capability table (section E) (one file source kept per graph; data.loads() lists network loads only); design inventory (section D) J28

#### rename-hide-columns

**Job.** Rename, hide or reorder columns so a wide table is readable

**Example.** Priya (genomics) hides 24 per-sample expression columns and keeps logFC, p-value and mutation count visible; Elena renames 'n_msgs_30d' to 'Messages (30 days)'.

**Competitor pattern.** Tableau's grid sorts, hides and renames fields (BI [1] (section G)); Polinode hides with a '!' header prefix (graph tools 5 (section F)); Observable Data table shows and hides columns (data-prep tools 3 (section H)).

| persona                 | frequency | importance | evidence                                                                                                                                                           |
| ----------------------- | --------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| genomics-cytoscape-user | often     | important  | FACT: 10 to 40 columns (personas/genomics-cytoscape-user.yaml:8-9); frustration '30 columns crammed into a preview of five rows' (:38).                            |
| explorer-elena          | sometimes | nice       | FACT: W01 pain 'Attribute names may be cryptic without documentation' (workflows/W01.yaml:88); 'Overwhelming number of options' (personas/explorer-elena.yaml:34). |
| knowledge-engineer      | sometimes | important  | FACT: 'Creates visualizations to communicate graph schema to stakeholders' (personas/knowledge-engineer.yaml:27).                                                  |
| analyst-alex            | sometimes | nice       | JUDGMENT: tidies before exporting a report (personas/analyst-alex.yaml:17).                                                                                        |

Sources: design/designloom/personas/genomics-cytoscape-user.yaml:38; design/designloom/workflows/W01.yaml:88

#### edit-values

**Job.** Edit values by hand: change a cell, add or remove a node or an edge

**Example.** Marcus (intelligence) adds a link between two suspects from a surveillance report that is in no file; Dr. Kim corrects one mistyped department name.

**Competitor pattern.** Gephi Data Laboratory table editing (graph tools 1 (section F)); Datawrapper layers edits on the raw data with a revert and marks edited cells (data-prep tools 4 (section H)); Kumu's Sheets link is read-only in Kumu (graph tools 4 (section F)).

| persona                 | frequency | importance | evidence                                                                                                                                      |
| ----------------------- | --------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| intelligence-analyst    | sometimes | important  | FACT: 'Difficulty documenting evidence for links' (personas/intelligence-analyst.yaml:37). JUDGMENT: analysts add links from reports by hand. |
| knowledge-engineer      | sometimes | important  | FACT: goal 'Ensure data quality' (personas/knowledge-engineer.yaml:33).                                                                       |
| fraud-analyst           | sometimes | nice       | JUDGMENT: marks a cleared account rather than editing data; notes cover most of it.                                                           |
| explorer-elena          | rarely    | nice       | FACT: 'Fear of breaking things' (personas/explorer-elena.yaml:37).                                                                            |
| genomics-cytoscape-user | rarely    | nice       | JUDGMENT: she edits in R or the spreadsheet and reloads (personas/genomics-cytoscape-user.yaml:7).                                            |

Sources: design/ui/framework/top-tasks.md:173-180 (tail: clean and edit data in bulk); capability table (section E) (updateNodes/removeNodes exist; the table is read-only)

#### filter-hide

**Job.** Filter (hide) elements by value, range, metric, component or neighborhood, in ordered steps, so later numbers describe what is left; never deleting data

**Example.** Priya (genomics) keeps the largest connected component and edges with STRING score over 0.7; Priya (cybersecurity) hides service accounts and benign processes; David filters to Tier 1 and Tier 2 suppliers.

**Competitor pattern.** OpenRefine facets only hide and combine as AND (data-prep tools 1 (section H)); Flourish's Data tab filter deletes rows, an anti-pattern (section 4); Tableau has four filter tiers, which is advanced-user territory (BI [12][13] (section G)).

| persona                   | frequency     | importance | evidence                                                                                                                                                                                                                                                                         |
| ------------------------- | ------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| analyst-alex              | every-session | blocking   | FACT: top-tasks task 6, every session for about half of frequent users, required by 18 of 25 workflows (design/ui/framework/top-tasks.md:102-104).                                                                                                                               |
| cybersecurity-analyst     | every-session | blocking   | FACT: W07 phase 4 'filter noise' (workflows/W07.yaml:54); 'unusable ... with high event volume' (personas/cybersecurity-analyst.yaml:41).                                                                                                                                        |
| genomics-cytoscape-user   | every-session | important  | FACT: W20 phase 2 'Select the largest connected component' (workflows/W20.yaml:56-57); W21 source 'Column filters on log2FC' (workflows/W21.yaml:123).                                                                                                                           |
| expert-emma               | every-session | important  | FACT: W02, W03 require filtering (personas/expert-emma.yaml:48-50).                                                                                                                                                                                                              |
| fraud-analyst             | every-session | important  | FACT: W06 requires filtering (workflows/W06.yaml:16).                                                                                                                                                                                                                            |
| intelligence-analyst      | every-session | important  | FACT: W09 decision 'What time window is relevant?' (workflows/W09.yaml:73).                                                                                                                                                                                                      |
| explorer-elena            | often         | important  | FACT: W02 phase 3 'Filter - Remove uninteresting elements to reduce cognitive load' (workflows/W02.yaml:64). Studio: the toolbar Filters button was the first move 7 of 7, then 8 of 8 (studio branch design/studio-tier3, design/ui/studio/tier2/report.md, graphty app table). |
| bioinformatics-researcher | often         | important  | FACT: W08 requires filtering (workflows/W08.yaml:13).                                                                                                                                                                                                                            |
| marketing-analyst         | often         | important  | FACT: W10 requires filtering (workflows/W10.yaml:13).                                                                                                                                                                                                                            |
| supply-chain-analyst      | often         | important  | FACT: W11 requires filtering; decision 'How deep into the supply chain to map' (workflows/W11.yaml:10,53).                                                                                                                                                                       |
| ml-engineer-recsys        | often         | important  | FACT: W16 requires filtering (workflows/W16.yaml:13).                                                                                                                                                                                                                            |
| knowledge-engineer        | sometimes     | nice       | FACT: W13 does not require filtering (workflows/W13.yaml:7-15).                                                                                                                                                                                                                  |

Sources: design/ui/framework/top-tasks.md:102-111; studio branch design/studio-tier3, design/ui/studio/tier2/report.md

#### select-by-condition

**Job.** Find or select elements by name or condition (degree over 10, logFC below -1, type = server) without hiding the rest

**Example.** Sarah finds the flagged account by its number and selects every account sharing its device id; Priya (genomics) selects genes with logFC < -1 and p < 0.05 to outline them.

**Competitor pattern.** Observable Data table filters by type-aware operators with an 'eject to SQL' path (data-prep tools 3 (section H)); OpenRefine expression facets as the advanced path (section 1).

| persona                 | frequency     | importance | evidence                                                                                                                                                            |
| ----------------------- | ------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| fraud-analyst           | every-session | blocking   | FACT: W06 phase 1 starts from the flagged entity (workflows/W06.yaml, Task Phases 1); top-tasks task 4 'first for search-first investigators' (top-tasks.md:89-95). |
| explorer-elena          | every-session | important  | FACT: 'Uses search to find specific entities she knows about' (personas/explorer-elena.yaml:23).                                                                    |
| intelligence-analyst    | every-session | important  | FACT: W05 target selection (workflows/W05.yaml:50).                                                                                                                 |
| cybersecurity-analyst   | every-session | important  | FACT: 'Uses graph queries to hunt for specific TTPs' (personas/cybersecurity-analyst.yaml:25).                                                                      |
| knowledge-engineer      | often         | important  | FACT: queries to 'explore and validate the knowledge graph' (personas/knowledge-engineer.yaml:25).                                                                  |
| analyst-alex            | often         | important  | FACT: top-tasks task 4 many times a session (top-tasks.md:89).                                                                                                      |
| expert-emma             | often         | important  | FACT: 'let me write custom queries' (personas/expert-emma.yaml:4).                                                                                                  |
| genomics-cytoscape-user | often         | important  | FACT: W20 phase 4 'thicker borders for a few genes of interest' (workflows/W20.yaml:63-64).                                                                         |

Sources: design/ui/framework/top-tasks.md:89-95

#### save-filter-or-set

**Job.** Save, name and reuse a filter or a set (and combine sets)

**Example.** Priya (cybersecurity) saves 'lateral movement via RDP' as a reusable hunt; Sarah saves the mule-network pattern filter; Priya (genomics) keeps 'top 10 hubs' as a set for the figure.

**Competitor pattern.** Gephi Lite saves filters in its workspace file (graph tools 1 (section F)); Tableau context filters fix the order of filters (BI [13] (section G)).

| persona                 | frequency | importance | evidence                                                                                                                                                                                               |
| ----------------------- | --------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| cybersecurity-analyst   | often     | important  | FACT: W07 requires saved-filters (workflows/W07.yaml:18).                                                                                                                                              |
| fraud-analyst           | often     | important  | FACT: W06 requires saved-filters (workflows/W06.yaml:26); 'Compares current graph patterns against known fraud typologies' (personas/fraud-analyst.yaml:25).                                           |
| analyst-alex            | often     | important  | FACT: frustration 'No way to save analysis patterns' (personas/analyst-alex.yaml:37); W12 saved-filters (workflows/W12.yaml:21); top-tasks task 9 named sets, most sessions (top-tasks.md:148-151).    |
| intelligence-analyst    | sometimes | important  | FACT: frustrations 'No way to bookmark or annotate findings', 'Inability to save and share investigation state' (personas/intelligence-analyst.yaml:36,38); W09 saved-filters (workflows/W09.yaml:25). |
| genomics-cytoscape-user | sometimes | important  | FACT: W25 requires saved-filters (workflows/W25.yaml:16); W23 intersection of top-10 lists (personas/genomics-cytoscape-user.yaml:32).                                                                 |

Sources: design/ui/framework/top-tasks.md:148-151; design inventory (section D) J43 (not built)

#### derive-column

**Job.** Derive a new column from others (formula, difference, rank, combined score)

**Example.** Priya (genomics) computes degree_tumor - degree_normal as a rewiring score; Jordan computes engagement = replies / followers; Sarah computes days between account creation and first transfer.

**Competitor pattern.** Observable Data table derived columns (data-prep tools 3 (section H)); Gephi Data Laboratory column actions (graph tools 1 (section F)).

| persona                   | frequency | importance | evidence                                                                                                                                               |
| ------------------------- | --------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| expert-emma               | often     | important  | FACT: 'Combines multiple analysis techniques in custom workflows' (personas/expert-emma.yaml:25); frustration 'No command palette or scripting' (:39). |
| genomics-cytoscape-user   | sometimes | important  | FACT: W24 phase 4 'build a custom score for the difference' (workflows/W24.yaml); W23 combined score (workflows/W23.yaml:62).                          |
| fraud-analyst             | sometimes | important  | FACT: W06 requires computed-attributes (workflows/W06.yaml:18); temporal patterns relative to account creation (personas/fraud-analyst.yaml:21).       |
| marketing-analyst         | sometimes | important  | FACT: W10 requires computed-attributes (workflows/W10.yaml:18).                                                                                        |
| bioinformatics-researcher | sometimes | important  | FACT: W08 requires computed-attributes (workflows/W08.yaml:17).                                                                                        |
| analyst-alex              | sometimes | important  | FACT: W12 requires computed-attributes (workflows/W12.yaml:18).                                                                                        |
| ml-engineer-recsys        | sometimes | important  | FACT: 'Computes graph embeddings ... as ML features' (personas/ml-engineer-recsys.yaml:23).                                                            |

Sources: design/ui/tier1-real-app/tier1-design.md:932 (specialized, per design inventory (section D) J40); capability table (section E) (no derived columns in the element)

#### clean-values

**Job.** Clean values: trim whitespace, normalize case, fill or mark missing values, fix mixed types, drop rows with blank ids, collapse repeated edges

**Example.** Dr. Kim trims trailing spaces that split 'Acme ' from 'Acme'; Priya (genomics) uppercases symbols so 'tp53' matches 'TP53'; David drops 40 shipment rows with a blank supplier id instead of getting one giant blank node.

**Competitor pattern.** OpenRefine facets and clustering (data-prep tools 1 (section H)); Sheets Smart Cleanup suggestions highlight affected cells (BI [32] (section G)); Tableau Data Interpreter offered only when the source looks messy (BI [11] (section G)); Neo4j excludes blank ids by default to avoid super nodes (graph tools 7 (section F)).

| persona                         | frequency     | importance | evidence                                                                                                                                                                                              |
| ------------------------------- | ------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| knowledge-engineer              | every-session | blocking   | FACT: 'Source data quality is often poor and inconsistent' (personas/knowledge-engineer.yaml:36); W13 pain 'Source data quality varies widely' (workflows/W13.yaml:81).                               |
| genomics-cytoscape-user         | sometimes     | important  | FACT: case sensitivity in id matching (personas/genomics-cytoscape-user.yaml:28).                                                                                                                     |
| intelligence-analyst            | sometimes     | important  | FACT: W09 'Data from multiple sources with different formats/quality' (workflows/W09.yaml:101).                                                                                                       |
| supply-chain-analyst            | sometimes     | important  | FACT: scattered ERP data (personas/supply-chain-analyst.yaml:36).                                                                                                                                     |
| analyst-alex                    | sometimes     | important  | FACT: W01 decision 'Are there data quality red flags requiring cleaning?' (workflows/W01.yaml:64); W18 decision 'Should I clean data before loading or handle issues after?' (workflows/W18.yaml:62). |
| plugin-author-domain-researcher | sometimes     | important  | FACT: motivation to stop 'converting it in a spreadsheet every time' (personas/plugin-author-domain-researcher.yaml:19).                                                                              |
| explorer-elena                  | rarely        | nice       | JUDGMENT: she would accept a suggested fix but not seek one out (personas/explorer-elena.yaml:34).                                                                                                    |

Sources: design/designloom/workflows/W13.yaml:81; design/designloom/workflows/W18.yaml:62; design inventory (section D) J31, J35

#### keep-and-replay-steps

**Job.** Keep the data steps (mapping, types, joins, filters, cleaning) as a record and replay them on new data (a recipe or remembered mapping), with a list of what did not bind

**Example.** Priya (genomics) applies the lab's 'expression overlay' recipe to a new gene list and is told 'column padj not found'; Alex reruns last month's import-and-filter steps on this month's export; the methods section is written from the record.

**Competitor pattern.** Power Query Applied steps, replayed on refresh, break when a source column is renamed (BI [27][28] (section G)); OpenRefine extracts history as JSON and applies it elsewhere, but not single-cell edits (data-prep tools 1 (section H)); Linkurious admin templates and Neo4j model files (graph tools 7-8 (section F)); Airtable remembers the column mapping (data-prep tools 2 (section H)).

| persona                   | frequency | importance | evidence                                                                                                                                                                                                                                        |
| ------------------------- | --------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| analyst-alex              | often     | important  | FACT: goals 'Reproducible analyses', 'Use specific workflows repeatedly'; frustrations 'Lack of workflow templates', 'No way to save analysis patterns' (personas/analyst-alex.yaml:30,32,35,37).                                               |
| genomics-cytoscape-user   | often     | important  | FACT: 'Reproduce the exact network months later' (personas/genomics-cytoscape-user.yaml:23); frustration 'Losing the analysis parameters needed for the methods section' (:42); top-tasks 'Start from a recipe' bookend (top-tasks.md:125-133). |
| bioinformatics-researcher | often     | important  | FACT: 'Build reproducible analysis pipelines that other researchers can use and cite' (personas/bioinformatics-researcher.yaml:19); W25 phase 2 (workflows/W25.yaml:47-48).                                                                     |
| supply-chain-analyst      | often     | important  | FACT: monthly redo by hand (studio branch design/studio-tier3, design/ui/studio/tier2/roster.md:155-156).                                                                                                                                       |
| knowledge-engineer        | often     | important  | FACT: 'Writes ETL pipelines' (personas/knowledge-engineer.yaml:23); W13 pain on keeping up to date (workflows/W13.yaml:89).                                                                                                                     |
| cybersecurity-analyst     | sometimes | important  | JUDGMENT: the same SIEM export shape every day (personas/cybersecurity-analyst.yaml:23,43) makes a remembered mapping valuable.                                                                                                                 |
| fraud-analyst             | sometimes | important  | JUDGMENT: 50+ alerts a day of one export shape (personas/fraud-analyst.yaml:6) make a remembered mapping valuable; 'Slow investigation workflows' (:37).                                                                                        |
| marketing-analyst         | sometimes | important  | JUDGMENT: weekly runs of the same analysis (personas/marketing-analyst.yaml:41).                                                                                                                                                                |
| expert-emma               | sometimes | important  | FACT: frustration 'No command palette or scripting' (personas/expert-emma.yaml:39).                                                                                                                                                             |

Sources: design/ui/framework/top-tasks.md:125-133; design/documents/drafts/data-plan.md (draft, per design inventory (section D) J46); capability table (section E) (session.journal records commands but is not saved or replayed)

#### export-data

**Job.** Export data: node and edge tables with every computed column, a filtered subset or a set, and graph formats for other tools

**Example.** Chris exports node features (degree, PageRank, community) as CSV for his model; Jordan exports a ranked influencer list; Priya (genomics) exports the node table with joined columns and uploads GraphML for reviewers.

**Competitor pattern.** Cytoscape exports tables and networks, NDEx upload (design/designloom/workflows/W25.yaml:120-121); Gephi Lite writes GEXF only (graph tools 1 (section F)).

| persona                      | frequency     | importance | evidence                                                                                                                                                                                                                 |
| ---------------------------- | ------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| ml-engineer-recsys           | every-session | blocking   | FACT: 'Exports graph features for use in downstream ML pipelines' (personas/ml-engineer-recsys.yaml:28); 'Difficulty integrating graph features with existing ML pipelines' (:37).                                       |
| genomics-cytoscape-user      | every-session | important  | FACT: W20 phase 6 'export the node table with the joined columns' (workflows/W20.yaml:69-70); W23 target 'exported as CSV' (workflows/W23.yaml:115).                                                                     |
| expert-emma                  | often         | blocking   | FACT: 'Exports raw data for analysis in specialized tools (R, Python, Mathematica)' (personas/expert-emma.yaml:26).                                                                                                      |
| marketing-analyst            | often         | blocking   | FACT: 'Exports ranked lists of influencers with engagement metrics' (personas/marketing-analyst.yaml:25).                                                                                                                |
| analyst-alex                 | often         | important  | FACT: 'Exports metrics for use in downstream analysis or reports' (personas/analyst-alex.yaml:25).                                                                                                                       |
| bioinformatics-researcher    | often         | important  | FACT: 'Exports subnetworks for visualization in publications' (personas/bioinformatics-researcher.yaml:25). JUDGMENT: needs export of a subset, which the element lacks (capability table (section E) section 2 item 7). |
| fraud-analyst                | often         | important  | FACT: 'Documents evidence trail meticulously' (personas/fraud-analyst.yaml:26).                                                                                                                                          |
| supply-chain-analyst         | often         | important  | FACT: 'export the numbers from the Export dialog to check them in a spreadsheet' (studio branch design/studio-tier3, design/ui/studio/tier2/roster.md:152-153).                                                          |
| knowledge-engineer           | often         | important  | FACT: goal 'Enable downstream applications ... to consume graph data' (personas/knowledge-engineer.yaml:34); W13 requires data-export.                                                                                   |
| intelligence-analyst         | sometimes     | important  | FACT: W15 requires data-export (workflows/W15.yaml:20).                                                                                                                                                                  |
| plugin-author-data-scientist | sometimes     | important  | FACT: compares numbers 'in a spreadsheet' (personas/plugin-author-data-scientist.yaml:28).                                                                                                                               |

Sources: design/ui/framework/top-tasks.md:134-139 (Export bookend, eleven workflows); capability table (section E) (exportGraph has no scope option)

### Open questions

- No persona file and no workflow gives measured frequencies; every frequency here is coded from imagined-use YAML marked validated: false (design/ui/framework/top-tasks.md:18-24). The pick-five top-task vote planned there would be the first real evidence; until then treat 'every-session' vs 'often' as one rater's call.
- The four plugin-author personas and the front-end developer are API consumers, not app users; only the domain researcher (lab TSV reader) and the data scientist (small sample, spreadsheet comparison) carry app data jobs. Should their data needs (row-numbered parse errors, custom column names) be scored as graphty-element API requirements instead of app layers?
- Two personas share the name Priya (genomics-cytoscape-user and cybersecurity-analyst). The examples here say which one; the persona files may want distinct names.
- Gene list to network (W20 phase 1) is every-session and blocking for the genomics persona, but graphty-element has no network-source loading on golden (capability table (section E)). Is that persona in scope for the first data release, or is its job served only by 'load an edge list exported from STRING'?
- Add-second-file is often/blocking for the investigator and knowledge personas, yet the element's merge import silently skips nodes that already exist (capability table (section E) section 2 item 1). The matrix ranks it high, so the element fix may need to precede any primary-layer UI.
- Replace vs Add for a newer export: the studio found the newer file lands on Add with duplicates (studio branch design/studio-tier3, design/ui/studio/tier2/report.md deferred severity 2). Should the element report 'every edge in this file already exists' as a fact so the app can steer to Replace?
- Descriptive roles (time, geo, node type) score often/important for five investigator and operations personas but the element has no date or geo kind. Which comes first: time (fraud, cyber, intelligence every session) or geo (supply chain, intelligence)?
- Frequency is per the persona's own session; daily investigators (fraud, cyber, intelligence) start most sessions with a fresh load, so load-time jobs weigh more for them than for weekly analysts who reopen a project. Should the ranking weight personas by session count, or count each persona once?

## D. What earlier designs say

### 0. Which documents are live

Six generations of design say something about data, and they disagree because they were written
for different shells. Knowing which is current is the first thing a reader needs.

| Generation                                     | Documents                                                                                                                                                                  | Status (FACT)                                                                                                                                                                                                                                                                                                            |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A. Designloom catalog (Jan 2026)               | `design/designloom/` capabilities, components, workflows W01-W25, 16 personas                                                                                              | Every capability `status: planned`, every workflow `validated: false` (e.g. `workflows/W18.yaml`, `capabilities/data-import.yaml`). `design/ui/framework/top-tasks.md` lines 18-20 calls the rankings derived from them a hypothesis.                                                                                    |
| B. Element data-loading designs (Nov-Dec 2025) | `design/data/data-loading-design.md`, `data-loading-implementation-plan.md`, `data-formats.md`, `data-testing-design.md`                                                   | Parser/format engineering; phases 1-5 marked done in the implementation plan. Almost no UI content.                                                                                                                                                                                                                      |
| C. Old app shell (Sep 2026)                    | `design/ui/app-shell-progressive-disclosure-design.md` (draft 1.14, 934 KB) and the artboards in `design/ui/mockups/artboards/`                                            | Superseded as the default surface: `graphty/CLAUDE.md` (golden) says `src/workspace/` is "the tier 1 shell and the app's default surface" and "the superseded app shell in `src/components/shell/` stays reachable at `?legacy` ... until issue #3056 deletes it".                                                       |
| D. Object-first exploration (Sep-Oct 2026)     | `design/ui/object-first-ux/` (feature-fit, round-2, round-3, analysis, object-model)                                                                                       | Self-described as "a design exploration ... Nothing here changes the app" (`object-first-ux/README.md` lines 1-8).                                                                                                                                                                                                       |
| E. Current framework and build                 | `design/ui/framework/` (top-tasks, conceptual-model, information-architecture, files-and-recipes, one-way-doors); `design/ui/tier1-real-app/tier1-design.md` and `plan.md` | tier1-design.md is "the design for the first real build" (line 3) and is "cut from the refined B design" on a design branch (lines 8-16). This is what the workspace implements.                                                                                                                                         |
| F. Design-studio evidence (Oct 2026)           | studio `report.md` (tier 1), `studio branch design/studio-tier3, design/ui/studio/tier2/report.md`, `tier3/` (styling), `owner-decisions.md`, `notes/`                     | Simulated-user rounds on the real workspace build; the only behavioral evidence in the repo.                                                                                                                                                                                                                             |
| Side designs                                   | `design/documents/drafts/data-plan.md`; `design/graph-io/network-sources-design.md`; `design/ui/data-view-feature-design.md` + plan                                        | data-plan: "Draft -- not part of version 1" (lines 3-8). network-sources: "Status: design, 2026-10-17. Nothing here is implemented" (line 5), now out of date: most of it landed on golden on 2026-10-19 (section E). data-view: describes the old ViewDataModal, deleted 2026-09-12 (shell doc section 2, lines 39-47). |

JUDGMENT: generation E (framework + tier1-design) plus F (studio decisions) is the controlling
record for the workspace. C and D are the richest catalogs of data jobs and still useful as a
requirements mine, but their placements (rail activities, tier rows, the object tree) do not apply
to the workspace's Graph place / Data place / Data page / Table dock structure.

---

### 1. Every data job the documents name (deduplicated)

Columns: the job; who/what asks for it; where it is designed; the tier or placement each design
gives it (C = old shell tiers 1/2/3 from `app-shell...md` section 5.3 Data, lines 621-697; T1 =
tier1-design.md; FW = framework frequency band from `framework/top-tasks.md`); and whether the
workspace has it (from tier1-design.md section 7 "Not in tier 1", lines 910-935, and the studio
reports).

#### 1a. Getting data in

| #   | Job                                                                                                                                                                 | Asked for by                                                                                                                                          | Designed in                                                                                                                                                                                                                                                                          | Placement claimed                                                                                                                                                   | In workspace?                                                                                                                     |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| J1  | Open one graph file (JSON, GraphML, GEXF, GML, DOT, Pajek, CSV/TSV, SIF, CX2, Neo4j) by drop or picker                                                              | every persona; W01, W14, W18 (`capabilities/data-import.yaml`); "Load a graph" bookend serving ten workflows (`framework/top-tasks.md` lines 121-123) | C 5.3 Data tier 1 (shell lines 621-632); T1 2.10 Data page (t1 lines 367-431), T3 (lines 608-618); object-first `feature-fit/1-data.md` row 1                                                                                                                                        | C tier 1; T1 tier 1; FW bookend                                                                                                                                     | Yes (T3 passed 100% in round 8, t1 line 49)                                                                                       |
| J2  | Open from URL, paste text, Ctrl+V                                                                                                                                   | W14, W18 phase 1 (`workflows/W18.yaml`)                                                                                                               | C tier 1 secondary row (shell 625-627); T1 Sources "+" File / From a URL / Paste (t1 lines 222-229)                                                                                                                                                                                  | tier 1 in both                                                                                                                                                      | Yes                                                                                                                               |
| J3  | Pick a sample dataset (with tags, credit, size, a one-line "Try ...")                                                                                               | Explorer Elena, W14 (`capabilities/sample-datasets.yaml`)                                                                                             | C tier 1 (shell 657-672); T1 2.11 start screen, T2                                                                                                                                                                                                                                   | tier 1                                                                                                                                                              | Yes                                                                                                                               |
| J4  | Reopen a recent file / project                                                                                                                                      | `capabilities/data-import.yaml` (implicit); C "Recent files" tier 1                                                                                   | C tier 1; workspace `project/RecentProjects.tsx`                                                                                                                                                                                                                                     | tier 1                                                                                                                                                              | Yes (projects)                                                                                                                    |
| J5  | Two spreadsheets (nodes file + edges file) as one network                                                                                                           | Genomics user, supply chain, fraud extracts; tier1 task T4                                                                                            | C: "accepts one file, or a nodes file and an edges file together" (shell 625), tabs per file (shell 1060-1062); T1 T4 (t1 lines 620-633)                                                                                                                                             | tier 1 in both                                                                                                                                                      | Yes, one node table plus one edge table; more tables are tier 2 (t1 lines 914-918)                                                |
| J6  | Format detection with confidence, and per-format parsing options (separator, quote, header row, skip lines, encoding, JSON paths)                                   | W18 phase 2; `capabilities/data-preview.yaml` "detected file format with confidence"                                                                  | C Import options item 2 and item 7 "Parsing" collapsed (shell 876-905, 988-993); T1 "File settings" strip with "auto" marks (t1 line 393)                                                                                                                                            | C tier 3 dialog, parsing collapsed inside it; T1 on the Data page                                                                                                   | Yes                                                                                                                               |
| J7  | Preview first rows before committing                                                                                                                                | `capabilities/data-preview.yaml`; W18 phase 4                                                                                                         | C item 4 preview grid (shell 913-950); T1 "Sample grid" (t1 lines 395-399)                                                                                                                                                                                                           | inside the load step                                                                                                                                                | Yes                                                                                                                               |
| J8  | Say what each row is (node / edge) and give columns roles: id/key, source/from, target/to, label/name, weight, time, node type, edge type, edge id, attribute, skip | `components/column-mapper.yaml`; W18 phase 3 "Field Mapping"; pain point "treating edge list as node list"                                            | C role menu with 15 roles (shell 913-920); T1 roles Key, From/To, Links to, Name, Weight, Attribute (t1 lines 395-399); code roles today `nodes: key,label,time; edges: source,target,weight,time,edgeId` (`graphty/src/workspace/data-page/choices.ts`, ROLES_BY_KIND)              | inside the load step                                                                                                                                                | Partly: no node-type, edge-type or category role in the workspace                                                                 |
| J9  | Set or correct a column's value type (text, whole number, decimal, yes/no, date-time, list with separator) with "N values will not convert"                         | `capabilities/data-preview.yaml` "change inferred data types"; `data-validation.yaml` type mismatches                                                 | C Type chip (shell 920-922) and Columns "Change type" tier 2 (shell 673-682); T1: type glyph "read-only" on the Data page (t1 line 399)                                                                                                                                              | C tier 1 of the dialog; T1 not offered                                                                                                                              | No (read-only)                                                                                                                    |
| J10 | Declare what a weight means (strength / distance / capacity; normalize; "divide by 1000")                                                                           | Cost-of-error rule (`framework/top-tasks.md` lines 49-51); STRING exports; tier 2 task "open a file whose number means farther"                       | C Weight role parameters pop-out (shell 723-733, 940-945); T1: weight line in tier 1, meaning in tier 2 (t1 lines 420-428); studio decision `TableMapping.weightMeaning` (owner-decisions.md line 3145) and "every run reads the loaded weight" (line 2601)                          | T1 tier 1 for "use this number as weight", tier 2 for its meaning                                                                                                   | Yes after tier 2 (studio tier 2 task passed 8 of 8, studio branch design/studio-tier3, design/ui/studio/tier2/report.md line 163) |
| J11 | Declare time (moment or start/end; date-time, number with unit, ordered category)                                                                                   | W07, W17, W19 temporal; `capabilities/temporal-analysis.yaml`                                                                                         | C Time role with three fields and one substitution table (shell 925-940, 1070-1095); T1: calendar Time glyph only                                                                                                                                                                    | C inside the dialog; T1 specialized ("the time slider", t1 line 928)                                                                                                | Role exists; units and slider not in tier 1                                                                                       |
| J12 | Identifier system of the id column (account id, gene symbol, Entrez, UniProt)                                                                                       | Genomics persona; W20 decision point "which column is the identifier"                                                                                 | C Node id role carries Identifier system (shell 922-925); data-plan `idNamespace` informational (data-plan.md lines 188-258)                                                                                                                                                         | C dialog                                                                                                                                                            | No                                                                                                                                |
| J13 | Direction (as the file says / directed / undirected), with provenance                                                                                               | W01 "does structure match expectations"; `capabilities/data-import.yaml`                                                                              | C item 2 (shell 876-880); T1 footer Direction (t1 lines 412, 428); object-first row 15 says changing it afterwards stales every run (`feature-fit/1-data.md` note D)                                                                                                                 | tier 1 in the load step                                                                                                                                             | Yes                                                                                                                               |
| J14 | Policies for repeated edges, edges to unknown nodes, self-loops, repeated node ids, id coercion ("1" vs 1)                                                          | `capabilities/data-validation.yaml`; `node-merging.yaml` duplicate edges                                                                              | C item 5 Policies (shell 951-960); T1 match report "Add                                                                                                                                                                                                                              | Leave out", Leave out default (t1 lines 404-411); data-plan `repeatedEdges`, `repeatedNodes`, `missingEndpoints`, `idCoercion` (data-plan.md lines 85-100, 284-297) | C inside the dialog (collapsed under Rule 7a); T1 unmatched only                                                                  | Unmatched ends only |
| J15 | Load a subset of a too-large file (busiest N, largest component, neighborhood, filter, time window)                                                                 | W01 "requires sampling/filtering?"; `capabilities/progressive-loading.yaml` "Load sample"                                                             | C item 6 Load (shell 961-987); T1 refuses "too large to draw" (t1 line 433)                                                                                                                                                                                                          | C inside the dialog                                                                                                                                                 | No; refused instead                                                                                                               |
| J16 | Progress and cancel for a long load                                                                                                                                 | W18 pain point; `capabilities/progressive-loading.yaml`                                                                                               | C status bar; T1 loading card, element "per-load cancel" (t1 line 955)                                                                                                                                                                                                               | always visible                                                                                                                                                      | Partly                                                                                                                            |
| J17 | A file that will not read: name the row, the reason and the fix; skip bad rows                                                                                      | W14, W18 pain "cryptic error messages"; tier1 T5                                                                                                      | C error block item 8, "Skip N rows and import" (shell 994-1008); T1 refusals (t1 lines 430-437, 635-642)                                                                                                                                                                             | always visible on failure                                                                                                                                           | Yes, but without row numbers ("not at first release: E_PARSE_FAILED carries neither", t1 line 433)                                |
| J18 | Remember a mapping per header signature and reapply it ("Mapped as before ... Change"); list, rename, export mappings                                               | Alex "no way to save analysis patterns" (`personas/analyst-alex.yaml`)                                                                                | C Import flow (shell 768-774) and Import mappings library (shell 1285-1299); data-plan as a portable file (data-plan.md lines 15-33)                                                                                                                                                 | C tier 2 library                                                                                                                                                    | No                                                                                                                                |
| J19 | Recognize a known export (STRING, BioGRID, Gephi) and pre-map it                                                                                                    | Genomics, bioinformatics personas                                                                                                                     | C item 2 banner with "Map it myself" (shell 880-905); decision: "known export formats are recognised by auto-detection, never offered as a preset list" (shell section 3, line 88)                                                                                                   | automatic                                                                                                                                                           | No                                                                                                                                |
| J20 | Load from a network source (NDEx, Neo4j/Neptune Cypher, REST/OpenAlex, SPARQL), with credentials                                                                    | Intelligence, cybersecurity, knowledge engineer personas; W13 "databases, documents, APIs"                                                            | `design/graph-io/network-sources-design.md` (whole doc; "Nothing here is implemented", line 5); C: "future phase ... Data at tier 2 as an Online sources list" (shell section 11, line 7838); FW menu "Connect to data source..." (`framework/information-architecture.md` line 307) | C tier 2 (future); FW File menu                                                                                                                                     | Element yes (on golden), app no                                                                                                   |
| J21 | Query a public database by a gene list (paste symbols, species, confidence cutoff)                                                                                  | W20 phase 1; genomics persona "starts from a gene list ... not from a graph file"                                                                     | W20 only; C defers "Public database queries (STRING REST, NDEx)" (shell section 11); FW "A list of ids" row (`information-architecture.md` line 519)                                                                                                                                 | none settled                                                                                                                                                        | Element partly (STRING REST mapping), app no                                                                                      |
| J22 | Expand a node's neighborhood from a server (click-to-expand)                                                                                                        | W06, W09 (`capabilities/neighborhood-expansion.yaml`)                                                                                                 | network-sources 14.4 (line 1381); object-first row 29 note F; round-3 `data-editing.md` section 10                                                                                                                                                                                   | specialized                                                                                                                                                         | Element yes (`data.expand`, `data.collapse`), app no                                                                              |

#### 1b. Combining sources

| #   | Job                                                                                                                                                           | Asked for by                                                                                                           | Designed in                                                                                                                                                                                                                                                                                                                                                                                 | Placement claimed                                                                                                                                       | In workspace?                                                                                                                                                                     |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| J23 | Replace the current data with a new file, keeping the analysis ("rerun on new data")                                                                          | FW task 12 "Reuse an analysis", most-sessions band (`top-tasks.md` lines 164-169); tier 2 task "rerun on a newer copy" | C item 3 "Replace current graph" (shell 905-912); object-first note C "Keep the objects and re-run" (`feature-fit/1-data.md` lines 166-177); T1: "Replace with file and rerunning on new data" is tier 2 (t1 line 919); studio: Replace in the source's "..." menu (studio branch design/studio-tier3, design/ui/studio/tier2/report.md line 162)                                           | FW most-sessions; T1 tier 2                                                                                                                             | Yes (tier 2 build); "Replace has no visible control" is an open severity 2 (studio branch design/studio-tier3, design/ui/studio/tier2/report.md line 190)                         |
| J24 | Add a second file to the current graph (union, nodes matched by id; update/keep both/skip on collision)                                                       | W09 phase 2 "collect and merge records"; W13; intelligence persona                                                     | C item 3 "Add to current graph" with "When an id already exists" (shell 905-910); object-first row 13; network-sources section 15 `idPrefix`, `joinOn`, `columnPrefix` (lines 1443-1482); studio `data.sources()` (owner-decisions.md 2726) and repeat-count on a prepared load (line 1870)                                                                                                 | C tier 1 picker in the dialog; FW explicit command "Add data..."                                                                                        | Yes; studio found "Opening a newer file lands on Add ... even when every tie would be added twice" (studio branch design/studio-tier3, design/ui/studio/tier2/report.md line 191) |
| J25 | Join an attribute table onto nodes (or edges, or groups) by a key column; see matched / unmatched in both directions; conflict rule; prefix; case sensitivity | W20 phase 3 (the genomics core loop); `personas/genomics-cytoscape-user.yaml`; object-first row 36; issue #298         | C Attach mode / Table join (shell 1097-1119), TableJoin artboard; round-3 `data-editing.md` section 8 (line 340); data-plan Joins (lines 259-283); FW "Join..." command on File menu and column header (`information-architecture.md` lines 306, 433)                                                                                                                                       | C tier 1 row "Add attributes from a table" (Loaded state only) + tier 3 dialog; T1 tier 2 ("several tables joined on any key column", t1 lines 916-918) | No                                                                                                                                                                                |
| J26 | Map identifiers between namespaces before a join (symbol to Entrez to UniProt; dictionary table or extension)                                                 | W20 decision point; genomics pain "identifier mismatches silently drop attributes"                                     | C Map identifiers dialog (shell 1120-1125); data-plan: "not part of version 1; a caller maps them before the join (open decision 27)" (data-plan.md line 275)                                                                                                                                                                                                                               | C tier 3                                                                                                                                                | No                                                                                                                                                                                |
| J27 | Compare with a second graph (side B), and network set operations (union, intersection, difference) with membership columns                                    | W24 phases 1-2                                                                                                         | C "Compare with current graph" as the only second graph (shell 911-912, 1319-1324); network collections next phase (shell section 3 line 87, section 11); FW "Add as another graph..." (`information-architecture.md` lines 306, 504) and "combine two graphs" in the tail (`top-tasks.md` line 176); T1 "Compare", "derived graphs and the Graphs switcher" specialized (t1 lines 924-928) | tail / specialized                                                                                                                                      | No                                                                                                                                                                                |
| J28 | Know where each element and value came from (per-load provenance; remove one load)                                                                            | W09 chain of custody; W25                                                                                              | network-sources `_source.loads` and `data.removeLoad` (lines 1460-1466); conceptual model "origin: imported, joined, result, computed, authored" (`framework/conceptual-model.md` line 329); studio `LoadedSource.tables/tableRows/leftOut` (owner-decisions.md 2157, 3176)                                                                                                                 | read in the Data place Sources list (t1 lines 222-229)                                                                                                  | Partly (Sources rows)                                                                                                                                                             |

#### 1c. Reading and checking what loaded

| #   | Job                                                                                                                                                                                  | Asked for by                                                                                      | Designed in                                                                                                                            | Placement claimed                             | In workspace?             |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- | ------------------------- |
| J29 | "What have I got, and did it load right?" -- counts, direction, density, components, self-loops, repeats, isolated nodes                                                             | FW task 1, every session, rank 1 (`top-tasks.md` lines 64-69); W01                                | T1 T6 graph inspector Overview (t1 lines 644-660); C Loaded data section and graph summary                                             | tier 1                                        | Yes                       |
| J30 | Match report at load: rows read, edges made, unmatched values listed with Add / Leave out                                                                                            | tier1 T3/T4 "check it all arrived"                                                                | T1 item 5 Match report (t1 lines 404-411)                                                                                              | tier 1, always visible on the Data page       | Yes                       |
| J31 | Validation / quality report (missing values, mixed types, repeated edges, self-loops, unknown ids, isolated nodes, date-mangled gene ids), severity, auto-fix with undo, "show rows" | `capabilities/data-validation.yaml`; W18 phases 6-7                                               | C Validation (shell 1126-1184), ValidationPopout artboard; object-first row 21; round-3 Rejected tab (`data-editing.md` section 1)     | C tier 2 section + status chip; T1 not listed | No (only the load report) |
| J32 | Attribute list with type, role tag and fill percentage; attribute inspector with histogram                                                                                           | W01 "attribute completeness"; FW "every attribute is a sortable column" (`top-tasks.md` line 185) | T1 Data place > Attributes (t1 lines 230-238); C Columns tier 2 (shell 673-682)                                                        | T1 tier 1 section of the Data place           | Yes                       |
| J33 | Node and edge table: sort, search, show/hide columns, scope to selection or filter, rows-with-issues                                                                                 | genomics pain "30 columns crammed into a preview of five rows"; data-view design                  | T1 Table dock (t1 lines 346-365); C Data table drawer (shell 1185-1238); old data-view modal (`design/ui/data-view-feature-design.md`) | T1 toggled by Shift+T and Quick actions       | Yes                       |

#### 1d. Shaping and cleaning

| #   | Job                                                                                                                                     | Asked for by                                                                                                   | Designed in                                                                                                                                                                                                                                             | Placement claimed                                                                   | In workspace?                                   |
| --- | --------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ----------------------------------------------- |
| J34 | Change mapping after load (re-map columns, re-import with other options)                                                                | W18 pain "field mapping is wrong"                                                                              | C seven reopen paths (shell 840-853); FW "Re-map columns is the one route afterwards" (`information-architecture.md` lines 508-511); object-first note B "a re-import deletes the tree"                                                                 | FW explicit command                                                                 | "Edit source..." on a Sources row (t1 line 229) |
| J35 | Column operations: rename, change type, fill empties, hide, delete; search and replace; merge, split columns                            | Gephi Data Laboratory precedent (`data-view-feature-design.md` competitor section); `computed-attributes.yaml` | C Columns menu tier 2 and column dialogs tier 3 (shell 676-682, 688-692); round-3 `data-editing.md` sections 3-4                                                                                                                                        | C tier 2/3; C section 11 says merge/split/replace "may ship after the mutation API" | No                                              |
| J36 | Edit one cell value                                                                                                                     | issue #297 (object-first row 26)                                                                               | C drawer cell edit (shell 1222, Data table drawer cells); round-3 section 5                                                                                                                                                                             | C drawer                                                                            | No                                              |
| J37 | Add a node or an edge by hand                                                                                                           | none in designloom                                                                                             | round-3 `data-editing.md` section 11                                                                                                                                                                                                                    | context menu                                                                        | No                                              |
| J38 | Remove nodes / edges from the data (not hide)                                                                                           | API exists (`el.removeNodes`)                                                                                  | C drawer row menu "Delete" (shell 1232, drawer row menu); round-3 section 6; object-first row 25 "does not fit"                                                                                                                                         | menu                                                                                | No                                              |
| J39 | Merge duplicate nodes: by selection (2-5 nodes, default rules) or batch by matching attribute/similarity with conflict rules and review | W09, W13, W22, W24 (`capabilities/node-merging.yaml`); knowledge engineer                                      | C Node merging (shell 1262-1284); round-3 section 7; FW Selection menu "Merge nodes" (`information-architecture.md` line 317) and "clean and edit data in bulk, including merging duplicates" in the tail (`top-tasks.md` line 178)                     | C inspector action + tier 3 batch dialog; FW tail                                   | No                                              |
| J40 | Computed attribute / custom score from a formula; saved formulas                                                                        | W06, W08, W10, W12, W23 (`capabilities/computed-attributes.yaml`)                                              | C Computed attributes and Formulas library (shell 1239-1261); object-first note G; FW "New column" on column header (`information-architecture.md` line 433)                                                                                            | C tier 2 row + tier 3 dialog; T1 specialized ("computed attributes", t1 line 932)   | No                                              |
| J41 | Cleaning record: every data-changing step listed, undoable, exportable into the methods                                                 | W09 chain of custody; W25 phase 2                                                                              | C Cleaning steps (shell 1301-1313); FW "Load, Add data, Replace data, Join, Re-map, Merge nodes, Remove, Correct ... writes a data version ... undoable ... record" (`conceptual-model.md` line 640); round-3 rules 1-7 (`data-editing.md` lines 34-67) | C tier 2                                                                            | Undo history exists; no data-step list          |

#### 1e. Filtering and subsets

| #   | Job                                                                                                                                                                                     | Asked for by                                                                     | Designed in                                                                                                                                                                                                                                              | Placement claimed                             | In workspace?                                                                                                                                             |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| J42 | Filter by attribute value, numeric range over a histogram, degree, metric threshold, community, component, N-hop neighborhood; AND/OR/NOT; edges independent of nodes; "showing X of Y" | 18 of 25 workflows (`top-tasks.md` lines 102-104); `capabilities/filtering.yaml` | C Explore tier 2 filter builder (shell 1376-1430), FilterBuilderExpert and FilterExpression artboards; round-3 `filters-sets.md`; FW filter steps on the filter chip (`information-architecture.md` line 162); studio tier 2 "keep only the strong ties" | FW task 6, every session; C tier 2; T1 tier 2 | Yes (tier 2 build: toolbar Filters button "first move 7 of 7, then 8 of 8", studio branch design/studio-tier3, design/ui/studio/tier2/report.md line 168) |
| J43 | Save, name and reuse a filter; import/export as JSON                                                                                                                                    | W06, W07, W09, W12, W25 (`capabilities/saved-filters.yaml`)                      | C Saved things library (shell 540-617); FW rule sets and recipes                                                                                                                                                                                         | C tier 2 library                              | No                                                                                                                                                        |
| J44 | Find by name/value; select where                                                                                                                                                        | FW task 4; tier 1 T12                                                            | T1 find box; FW "Select where..."                                                                                                                                                                                                                        | tier 1                                        | Yes                                                                                                                                                       |
| J45 | Time window filter / time slider                                                                                                                                                        | W07, W17, W19                                                                    | C time slider overlay (shell 1621); T1 specialized                                                                                                                                                                                                       | specialized                                   | No                                                                                                                                                        |

#### 1f. Repeatable steps and output

| #   | Job                                                                                                             | Asked for by                                              | Designed in                                                                                                                                                                             | Placement claimed                    | In workspace? |
| --- | --------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ | ------------- |
| J46 | A reusable data plan for one shape of file (roles, types, joins, constraints)                                   | W13, W20, W06 (data-plan.md lines 15-23)                  | `design/documents/drafts/data-plan.md`; C import mappings                                                                                                                               | not placed in any UI                 | No            |
| J47 | Recipe: save the steps, apply to new data, bind attributes by name, list what did not bind                      | Alex frustrations; W20 pain "rebuilding the same style"   | FW bookend "Start from a recipe" (`top-tasks.md` lines 125-133); C "Run a recipe..." kept in tier 1 as "the one exception" (shell 610-617, 1314-1318); `framework/files-and-recipes.md` | FW bookend; C tier 1; T1 specialized | No            |
| J48 | Export data: node and edge tables with every computed column, graph formats; scope (all / filtered / selection) | W08, W10, W13, W15, W16 (`capabilities/data-export.yaml`) | T1 T13 one Export dialog with Image and Data tabs (t1 decisions 7-8, lines 527-530); C "Data export: One home: Present" (shell section 3)                                               | tier 1                               | Yes           |
| J49 | Save the whole session as a project and reopen                                                                  | W25 phase 3; tier1 T14                                    | T1 T14; C excluded project files (shell section 3 "Project save: Not in this pass"); network-sources section 16 for network data                                                        | tier 1                               | Yes           |

---

### 2. Decisions already taken, and whether they still apply

"Applies" is my JUDGMENT of whether the decision survived into the workspace design (tier1-design
plus framework plus studio decisions).

| Decision (FACT)                                                                                                                                  | Where                                                                                                                                    | Still applies?                                                                                                                                                                                                                                                                           |
| ------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| No skill modes; disclosure by state, tier and remembered expansion                                                                               | shell section 3 (line 64)                                                                                                                | Yes in spirit: framework README says aids are given to everyone, "never by features for one kind of user".                                                                                                                                                                               |
| One graph per session; a second file offers Replace / Add / Add attributes / Compare; "No collections, workspaces or project files"              | shell section 3 (line 77) and lines 1319-1324                                                                                            | Partly superseded. Project save now exists (T1 T14). FW adds "Add as another graph..." (`information-architecture.md` lines 306, 504-506); T1 puts "derived graphs and the Graphs switcher" in specialized (t1 line 928). The four-way choice survives as Add / Replace / Join commands. |
| Open never merges: Open lands in a new project; bringing anything in is an explicit command                                                      | `framework/information-architecture.md` lines 502-506                                                                                    | Yes (current).                                                                                                                                                                                                                                                                           |
| One load step is the one place a mapping is set; Re-map columns is the only route afterwards                                                     | `information-architecture.md` lines 508-511; T1 2.10 "Every data door opens one page" (t1 line 369)                                      | Yes (current). Replaces the old shell's Import options dialog with seven entry states (shell 776-853).                                                                                                                                                                                   |
| Files whose mapping is unambiguous load immediately with default policies; a clean file is one Enter                                             | shell lines 768-774; T1 "a clean drop is one Enter" (t1 line 381)                                                                        | Yes, with a change: T1 always shows the Data page (focus on Load) rather than skipping it.                                                                                                                                                                                               |
| Mapping remembered per header signature                                                                                                          | shell lines 771-774, 1285-1299                                                                                                           | Not carried into T1. Open.                                                                                                                                                                                                                                                               |
| Repeated edges default: combine into one, count, sum weight                                                                                      | shell section 3 (line 86) and lines 951-956                                                                                              | CONTRADICTED by data-plan's default "keep" (data-plan.md line 91) and the element's `repeatedEdges` default. Unresolved; see section 3.                                                                                                                                                  |
| Unknown edge ends: Leave out is the default                                                                                                      | T1 2.10 item 5 (t1 line 405); code `INITIAL_CHOICES.unmatched: "leave-out"` (`data-page/choices.ts`)                                     | Yes (current), contradicting the old shell's "Create the node (default when no nodes table)" (shell 957-959).                                                                                                                                                                            |
| Large graphs: warn and allow, never refuse on size                                                                                               | shell section 3 (line 82)                                                                                                                | Superseded: T1 refuses "too large to draw" before the graph is touched (t1 lines 433, 641).                                                                                                                                                                                              |
| Data export has one home                                                                                                                         | shell section 3 ("Present"); T1 decision 8 "One Export dialog" (t1 line 529)                                                             | Yes, the home is now the Export dialog.                                                                                                                                                                                                                                                  |
| Data cleaning record: every data-changing operation is one undoable entry in the one history store                                               | shell section 3; FW `conceptual-model.md` line 640                                                                                       | Yes as a rule (FW); the list surface is not built.                                                                                                                                                                                                                                       |
| Weight's meaning is a declared role, never guessed from the name                                                                                 | FW `top-tasks.md` line 187; studio "every run reads the loaded weight" (owner-decisions.md 2601) and `TableMapping.weightMeaning` (3145) | Yes (current, built).                                                                                                                                                                                                                                                                    |
| A file that names a weight is set whatever the column is called; a number column is offered as weight in one click                               | T1 "weight line" (t1 lines 420-428)                                                                                                      | Yes.                                                                                                                                                                                                                                                                                     |
| Domain vocabulary only in tooltips; known exports auto-detected, never a preset list                                                             | shell section 3 (line 88)                                                                                                                | Not restated in T1; consistent with FW ("task names ... never name a domain", `top-tasks.md` lines 15-16). JUDGMENT: still applies.                                                                                                                                                      |
| Expression language: JMESPath for selection; [name] grammar for formulas                                                                         | shell section 3                                                                                                                          | Rule language survives (studio owner decision on bare numbers is open, studio branch design/studio-tier3, design/ui/studio/tier2/report.md line 208).                                                                                                                                    |
| Recipes in scope; a recipe stores steps not data                                                                                                 | shell section 3; FW `files-and-recipes.md` ("A recipe is a project file with no data", cited in top-tasks line 127)                      | Yes as design; specialized in T1 (t1 line 925).                                                                                                                                                                                                                                          |
| A data plan never spends compute (no runs on load in the data plan)                                                                              | data-plan.md line 25                                                                                                                     | Draft only; consistent with FW (recipes carry runs).                                                                                                                                                                                                                                     |
| Joined column with an existing name is refused, not merged                                                                                       | data-plan.md line 271                                                                                                                    | CONTRADICTED by the shell's conflict rule (keep existing / overwrite / prefix) and network-sources `existing: keep / update` + `columnPrefix`. Unresolved.                                                                                                                               |
| Identifier mapping is not in version 1                                                                                                           | data-plan.md line 275                                                                                                                    | Consistent with T1 (absent); contradicts the shell's Map identifiers dialog.                                                                                                                                                                                                             |
| Network collections, public database queries, RDF import, parallel edges kept separately: future phase (2026-09-04)                              | shell section 11                                                                                                                         | Network sources now has its own design (2026-10-17) that reverses "future phase" for databases; collections still deferred.                                                                                                                                                              |
| Merging/removing nodes "does not fit" the object model; next phase                                                                               | `object-first-ux/feature-fit/1-data.md` "What does not fit"                                                                              | Reversed within the same exploration by round 3 (`round-3/data-editing.md` sections 6-7), and FW lists "Merge nodes" in the Selection menu. JUDGMENT: superseded.                                                                                                                        |
| graphty-element owns load drafts, match reports, key suggestions, refusals; the app counts nothing                                               | T1 2.10 item 5 (t1 lines 404-408); root `CLAUDE.md`                                                                                      | Yes (binding). One live workaround: `ROLES_BY_KIND` copy of the element's private role list, marked temporary for #926 (`data-page/choices.ts`).                                                                                                                                         |
| Every load kept as a source (`data.sources()`), with tables, table kinds, left-out rows; a prepared load counts repeated edges                   | studio owner-decisions.md lines 2726, 2157, 3176, 1870                                                                                   | Yes (decided 2026-10-07 to 10-09, built for tier 2).                                                                                                                                                                                                                                     |
| A column whose values are the node ids says so (`holdsNodeIds`)                                                                                  | owner-decisions.md line 565                                                                                                              | Yes (2026-10-17).                                                                                                                                                                                                                                                                        |
| A dropped project on the Data page opens as a project (`LoadDraft.graphtyDocument`)                                                              | owner-decisions.md line 540                                                                                                              | Yes.                                                                                                                                                                                                                                                                                     |
| Readable column kinds are number, category, text, yes-no                                                                                         | owner-decisions.md lines 364-373 (`data.readableValues()`)                                                                               | Yes; note: no date or geo kind in that list.                                                                                                                                                                                                                                             |
| Tier 2 scope: filters, more than one node and one edge table joined on any key, weight meaning at load, adding rows, Replace with file and rerun | t1 lines 912-919                                                                                                                         | Yes; the studio built and tested filters, two tables, weight meaning, Replace/rerun in tier 2 (studio branch design/studio-tier3, design/ui/studio/tier2/report.md lines 28-41). Joins beyond one node+one edge table were not tested.                                                   |

---

### 3. Contradictions between documents

1. **Repeated-edge default.** Old shell: combine, count, sum (shell section 3; lines 951-956).
   Data plan and element: `repeatedEdges` default `"keep"` (data-plan.md line 91; it says the
   names are `DataConfig`'s). Object-first row 17 lists keep / error / first / last / sum / min /
   max with "Keep" shown in the mock text.
2. **Unknown edge ends.** Old shell: create the node by default when no nodes table was given
   (shell 957-959); data plan: `missingEndpoints` default `"create"` (data-plan.md line 96).
   Workspace: Leave out by default (t1 line 405; `choices.ts`). The tier 2 studio flagged the
   consequence: "The Add page leaves new people out by default, with a reason that names node rows
   the file does not have" (studio branch design/studio-tier3, design/ui/studio/tier2/report.md line 192).
3. **Join conflicts.** Shell: keep existing / overwrite / prefix (shell 1110-1112). Data plan:
   same-name column refused (data-plan.md line 271). Network sources: `existing: keep | update`
   plus `columnPrefix` (network-sources-design.md lines 1453-1459).
4. **Duplicate keys in a joined table.** Data plan: `onDuplicate` default `"error"` refuses the
   join (line 149). Shell: no rule; W20 asks for a "duplicates" count in the match report
   (`workflows/W20.yaml` information needs).
5. **One graph versus several.** Shell: one graph per session, Compare is the ceiling (lines
   1319-1324). Framework: "Add as another graph..." on the File menu (`information-architecture.md`
   line 306). network-sources: a graph is a list of loads (line 1449). W24 needs several named
   networks.
6. **Large files.** Shell: never refuse, offer subsets (section 3; lines 961-987). T1: refuse "too
   large to draw" (t1 lines 433, 641).
7. **Where import options live after load.** Shell: one gear "Import options" with seven reopen
   paths into a dialog (shell 840-853). Object-first: re-import is a Replace that deletes the
   tree (note B). Round 3: re-import replays journaled edits (`data-editing.md` rule 5). FW: Re-map
   columns, the one route (`information-architecture.md` line 510). Workspace: "Edit source..." on
   a Sources row (t1 line 229).
8. **Value types.** Designloom: string, integer, float, boolean, date
   (`capabilities/data-preview.yaml`). Shell: Text, Whole number, Decimal, Yes/No, Date-time,
   List (shell 920-922). Data plan: string, number, integer, boolean, date, list plus measurement
   level categorical / ordinal / quantitative / temporal / identifier. Element readable kinds:
   number, category, text, yes-no (owner-decisions.md 370). Workspace Attributes glyphs: category,
   number, ordinal, time (`data-place/words.ts` `TypeGlyph`). Five vocabularies for one idea.
9. **Role vocabulary.** Shell: 15 roles including Node type, Edge type and per-end types (shell
   913-920). Data plan: `knownFields` paths plus graph-format `ColumnRole`. Workspace: key, label,
   time / source, target, weight, time, edgeId (`choices.ts`). T1 names "Key, Name, Weight" as
   role tags (t1 line 234). Node type role is in the shell and FW (`conceptual-model.md` line 331) but not in the workspace.
10. **Merging and removing nodes.** Feature-fit 1-data: "does not fit" (lines 270-273).
    Round-3 data-editing: designed (sections 6-7). Old shell: tier 2/3 (shell 1262-1284). FW: in
    the Selection menu yet "tail" by frequency.
11. **Recipe placement.** Shell: tier 1 on Data and Welcome as the one exception (shell 610-617).
    FW: a bookend task. T1: specialized, not before tier 2 passes (t1 line 925).
12. **Persona count.** `object-first-ux/inventory/app-today-and-personas.md` section 6 and the
    shell's section 2 say 12 personas; `design/designloom/personas/` holds 16 (four plugin-author
    personas added).
13. **Components referenced but never defined.** W20 suggests `attribute-table-join-dialog` and
    `data-table-panel`; W22 `gene-set-import-dialog`, `heatmap-panel`; W24 `network-merge-dialog`;
    W21 `cluster-table`, `enrichment-results-table`; W23 `ranked-node-table`. None exists in
    `design/designloom/components/`. The capability files (data-import, node-merging) never list a
    join or a graph-merge capability at all.
14. **W18 cites a source that is not there.** W18's source "Graphty Progressive Disclosure Design
    ... Load Data Wizard with staged disclosure" (`workflows/W18.yaml`); the onboarding wizard was
    dropped (shell section 3) and `design/ui/progressive-disclosure-design.md` is about the
    properties sidebar.

---

### 4. Gaps: jobs nobody designed (or designed only in a superseded shell)

FACT unless marked.

1. **Table join in the workspace.** The genomics core loop (W20 phase 3) is designed only in the
   old shell (TableJoin artboard) and object-first round 3. The current workspace has no join, and
   T1 puts it in tier 2 (t1 lines 916-918); the studio never tested it ("joining more than one
   table" was deferred, report.md line 249).
2. **Category, number, date and geo as declared column kinds.** No current document gives the
   reader a way to say "this column is a date" or "these are latitude/longitude" in the workspace:
   the type glyph is read-only on the Data page (t1 line 399), element readable kinds have no
   date or geo, and `position` exists only as a framework role (`conceptual-model.md` line 333).
   Supply-chain persona's geographic overlay (`personas/supply-chain-analyst.yaml`) has no design.
3. **Node type / edge type role in the workspace.** Designed in the shell and FW, absent in
   `ROLES_BY_KIND`. Typed identity is open decision 13 (data-plan.md lines 298-352).
4. **Entity resolution beyond exact id match.** Batch merge by similarity is designed only in the
   old shell (lines 1262-1284). Nothing current covers W13 phase 4 or W09 phase 3 "same person,
   multiple identities".
5. **Identifier mapping.** Old shell dialog only; data plan excludes it; no element design.
6. **Network set operations (union, intersection, difference with membership attribute).** W24
   phase 2; blocked on collections in every document.
7. **Validation report in the workspace.** The match report covers arrival; the quality report
   (mixed types, missing values, date-mangled gene ids, auto-fix) has no current design.
8. **Reusable data plan / remembered mapping in the workspace.** Designed in the old shell and the
   draft data plan; not placed in T1 or the framework IA. JUDGMENT: this is the "repeatable steps"
   job most personas ask for (Alex, the lab's weekly STRING download, the fraud team's extract).
9. **Starting from a gene list.** W20 phase 1 and the genomics persona start from a list of
   symbols plus species; only FW's "A list of ids" row (`information-architecture.md` line 519)
   touches it, and it does not fetch interactions.
10. **Data versions after Replace.** FW names data versions and "what changed since last week"
    (task 10, `top-tasks.md` lines 164-169); no screen shows a diff of two data versions.
11. **Filtering at load versus after load.** network-sources has a `keep` load option (line 1468);
    the old shell has subset loads; the workspace has neither. Nobody decided whether "only load
    the strong ties" is a load option or a filter step.
12. **Excel files.** No document mentions .xlsx (every design lists CSV/TSV). JUDGMENT: the
    personas who "start from a spreadsheet" (genomics, supply chain) likely hold .xlsx.

---

## E. What graphty-element and the app can do today

### 1. Capability table

Legend: E = graphty-element public API, A = graphty app UI on golden, -- = none.

| Data job                                                                           | Element API (fact)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | App UI (fact)                                                                                                                                                                                                                        | Missing                                                                                                                                                                        |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Load a file / URL / inline text, format detected                                   | `session.data.import({type?, config:{file\|url\|data}, name?}, LoadChoices)`; 13 formats (`KNOWN_FORMAT_IDS`, graphty-element/src/catalog/types.ts ~201)                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Start page drop/open (graphty/src/workspace/start/open.ts:120-136), Data place "+" File / URL / Paste (data-place/DataPlace.tsx, `ADD_SOURCE`)                                                                                       | --                                                                                                                                                                             |
| Preview before load (tables, columns, counts, unmatched/rejected rows)             | `session.data.prepare()` -> `LoadDraft` with `tables`, `mapping`, `resolve`, `missing`, `report`, `rows({only:"unmatched"\|"rejected"\|"loaded"})`, `load`, `styles` (session/types.ts, `LoadDraft`)                                                                                                                                                                                                                                                                                                                                                                                                          | Data page (data-page/DataPage.tsx): Tables list with "+", rows-are toggle, per-column role, delimiter picker, Direction, import styles, Unmatched Add / Leave out with "Show the unmatched rows" (DataPage.tsx:71, 241-330, 882-915) | --                                                                                                                                                                             |
| Column roles at load: id, label, source, target, weight, time, edge id             | `TableMapping` {rowsAre, key, label, source, target, weight, time, edgeId}; `ColumnRole` (session/types.ts:1147, 1193)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Data page role menu: nodes key/label/time, edges source/target/weight/time/edgeId (data-page/choices.ts:60)                                                                                                                          | category, number, date, geo are NOT roles; no "include/exclude column"                                                                                                         |
| Re-map roles after a load                                                          | Only by `config.set` of `data.knownFields.*` (ProjectConfig, session/types.ts:1358) -- affects later records, does not re-read                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Data place "Edit source..." opens the Data page (DataPlace.tsx)                                                                                                                                                                      | Re-map loaded data (element-gaps.md:57 "Missing")                                                                                                                              |
| Column type detection                                                              | `data.attributes()` -> `AttributeDescriptor` {type: string/number/integer/boolean/time/category/mixed, measurement, completeness, uniqueCount, min, max, sampleValues, roles, usedBy} (catalog/types.ts:277, 1071-1112). Time is never inferred from strings (session/attributes.ts ~43)                                                                                                                                                                                                                                                                                                                      | Data place Attributes tree with a type glyph per attribute (category/number/ordinal/time/unknown/result) and a find box (data-place/DataPlace.tsx, words.ts)                                                                         | --                                                                                                                                                                             |
| Set what a column measures (categorical/ordinal/quantitative/time)                 | `data.declare(column, MeasurementDeclaration)`, undoable, "attributes" project slice (session/types.ts:892; catalog/types.ts:302)                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | NONE: no app call to `declare` (grep of graphty/src)                                                                                                                                                                                 | -- in app                                                                                                                                                                      |
| Set a column's storage type (text -> number, text -> date with format, list split) | -- (declare changes measurement only, not values)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | --                                                                                                                                                                                                                                   | Missing in element. Drafted in design/documents/drafts/data-plan.md `AttributeDeclaration.type/format/delimiter` (not implemented)                                             |
| Rename / drop / derive a column                                                    | -- (no renameAttribute/removeAttribute/derive anywhere in graphty-element/src). `origin: "joined" \| "computed"` is declared (catalog/types.ts:1089) but only "imported" is ever produced (session/attributes.ts:184)                                                                                                                                                                                                                                                                                                                                                                                         | --                                                                                                                                                                                                                                   | Missing in element                                                                                                                                                             |
| Rename the source                                                                  | `data.renameSource(name)` undoable                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | NONE: DataPlace.tsx:277 still says "Not drawn until graphty-element provides them: Rename on a source (#894)" -- the API now exists, app comment is stale                                                                            | app                                                                                                                                                                            |
| Edit values                                                                        | `data.updateNodes / updateEdges(RowUpdate[])`, `addNodes/addEdges`, `removeNodes/removeEdges`, `clear`; all undoable (session/types.ts SessionDataApi)                                                                                                                                                                                                                                                                                                                                                                                                                                                        | NONE: the table (table/RecordTable.tsx) is read-only (window via `nodePage/edgePage`, sort, hide columns, group-members scope)                                                                                                       | app                                                                                                                                                                            |
| Add to vs replace the graph                                                        | `ImportOptions.mode: "replace" (default) \| "merge"`; also on `generate`, `loadDataset` (session/types.ts:1302)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Inside an open project, open/drop = merge (start/open.ts:122-133); Data page "Add to <project>" vs "Open as a new graph" (DataPage.tsx:98-101)                                                                                       | --                                                                                                                                                                             |
| Several sources tracked                                                            | `data.source()` is ONE descriptor; a merge import overwrites it (session/project/ingest.ts:474; data.ts:1326). `lastImport()` is the last load only                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Data place Sources shows one source with Node/Edge table children (data-place/words.ts:64-96)                                                                                                                                        | Per-source list, per-element provenance, remove one source. `data.loads()` lists network-source loads only (on golden)                                                         |
| Duplicate node rows within one load                                                | `LoadChoices.duplicateIds: "first" \| "merge" \| "refuse"`; counted in `LoadReport.duplicates` (session/types.ts LoadChoices; data/report.ts ~143)                                                                                                                                                                                                                                                                                                                                                                                                                                                            | NOT exposed on the Data page (no grep hit for duplicateIds in data-page/)                                                                                                                                                            | app                                                                                                                                                                            |
| Node already in the graph during a merge                                           | Record SKIPPED: `if (this.hasNode(nodeId)) continue;` (session/project/ingest.ts:568) -- the new file's attributes for existing nodes are silently dropped and not counted in LoadReport                                                                                                                                                                                                                                                                                                                                                                                                                      | --                                                                                                                                                                                                                                   | Element: an "update existing" policy and matched/added/updated counts. `SourceLoadOptions.existing: "keep" \| "update"` exists for network sources only (on golden)            |
| Repeated edges (same ordered pair)                                                 | `data.knownFields.repeatedEdges`: keep (default) / error / first / last / sum / min / max (config/DataConfig.ts:9-17, 67); report `LoadReport.repeated`, `policy`; filter leaf `repeated-edge`                                                                                                                                                                                                                                                                                                                                                                                                                | -- (not on Data page)                                                                                                                                                                                                                | app                                                                                                                                                                            |
| Endpoint overrides                                                                 | `TableMapping.source/target` (column or `{column}`); `edgeSrcIdPath/edgeDstIdPath`, probe source/target -> src/dst -> from/to (DataConfig.ts ~45)                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Data page role menu                                                                                                                                                                                                                  | --                                                                                                                                                                             |
| Unmatched edge endpoints                                                           | `LoadChoices.unmatched: "add" \| "leave-out"`; `report.unmatched`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Data page Add / Leave out, default Leave out (choices.ts:35)                                                                                                                                                                         | --                                                                                                                                                                             |
| Join a table onto existing nodes by key                                            | NONE. Merge import of a node table drops rows for nodes already present (above). Workaround: read rows yourself and `updateNodes`                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | --                                                                                                                                                                                                                                   | Missing in element: issue #298 OPEN "graphty-element: cannot join an attribute table to the graph by key"; design draft `Join` in design/documents/drafts/data-plan.md:142-153 |
| Merge two graph files                                                              | `import(..., {mode:"merge"})`: node union by id (existing kept), edges added under repeatedEdges. graph-format builder has `addGraph(snapshot, {onDuplicateNode: "merge"\|"error"})` (graph-format/src/types/builder.ts:455-460) but the element does not expose it                                                                                                                                                                                                                                                                                                                                           | Open/drop a second file inside a project                                                                                                                                                                                             | Merge report (added / matched / conflicting), conflict policy per column                                                                                                       |
| Identifier mapping                                                                 | `knownFields.idCoercion: "canonical" \| "keep"` (DataConfig.ts:92); integer ids found either way (`data.node("34")`). graph-io's `idPrefix` load option for network sources                                                                                                                                                                                                                                                                                                                                                                                                                                   | --                                                                                                                                                                                                                                   | Map ids across vocabularies (symbol -> Entrez etc.), case-insensitive match (data-plan.md Join.match is a draft)                                                               |
| Positions from file, partial                                                       | Importer seeds positions (`data.position`, scaled by `knownFields.positionScale`); `session.seededNodeCount`; `layout: "recommended"` picks fixed only when every node is placed (session/layout.ts:203); `positions.set/pin/unpin` undoable                                                                                                                                                                                                                                                                                                                                                                  | Load uses recommended layout via the element                                                                                                                                                                                         | Policy for partly placed files is the element's rule; no app control                                                                                                           |
| Styles from files                                                                  | `LoadChoices.styles: "file"`, `styleOptions`; `draft.styles` summary; `lastImport().styles` notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Data page import-styles toggle with a saved preference (choices.ts:31-52); StyleNotes under Sources                                                                                                                                  | --                                                                                                                                                                             |
| Generated graphs, sample datasets                                                  | `data.generate(name, params)`, `data.loadDataset(name)`; `catalog.generators()`, `catalog.datasets()`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Start page Sample library, Generate a graph (start/StartScreen.tsx:507-576)                                                                                                                                                          | --                                                                                                                                                                             |
| Network sources (NDEx, Cypher/Neo4j/Neptune, REST/OpenAlex, STRING, deps.dev)      | On golden (landed 2026-10-19, merge 396327383, marked experimental): graph-io `defineSource` and registry with six built-in sources (graph-io/src/sources/builtins.ts); element `data.import({source, config})`, `testSource`, `listSource`, `expand`, `collapse`, `more`, `loadSample`, `loads`, `pendingSourceLoads`, `runPendingSourceLoad`; `ExpandBehavior` (click or double-click to expand); `limits` and `onLimit`; `./credentials` entry point (`CredentialStore`); project member `graphty-sources`. Not built: `refresh`, `revalidate`, `removeLoad`, the persistent source cache, a SPARQL source | start/NetworkDataDialog.tsx: placeholder listing NDEx, Neo4j, Web API as "on the way"; only "Open from a link" works                                                                                                                 | Every app surface: connect and test, query, expand and collapse, load more, pending loads, remembered credentials                                                              |
| Filter (data scope)                                                                | `visibility.set(RuleTree)`, `visibility.setWindow(TimeWindow)`; RuleTree leaves: expression, range, categories, degree, component, neighborhood, isolated, self-loop, repeated-edge, edges, member, item, threshold (catalog/types.ts:1197); counts in `status.counts.visibleNodes`                                                                                                                                                                                                                                                                                                                           | NONE: no call to `visibility.set` in graphty/src                                                                                                                                                                                     | Ordered filter steps each naming what it removes (element-gaps.md:151 "Missing: one filter for all steps")                                                                     |
| Selectors / query language                                                         | `Selector` union: everything, expression (JMESPath `where`), has, ids, top, member, hover (session/styles/selector.ts:63-104); `Query = string` JMESPath (catalog/types.ts:103); `find(text)` with `exact:`, `attr:`, `regex:`                                                                                                                                                                                                                                                                                                                                                                                | Find box -> `selection.apply` (graph-place/FindBox.tsx:76-97)                                                                                                                                                                        | `catalog.validate(query)` deprecated, not implemented (catalog/types.ts ~1490, issue #335)                                                                                     |
| Sets / scopes                                                                      | `sets.create/createFrom/createPath/combine/rename/redefine/addMembers/removeMembers/remove/restore` (sets/types.ts:187-378); `scope.resolve/count/save/list/remove/canonical` (scope/ScopeApi.ts:252-301); `Scope` = visible / graph / selection / largest-component / set / where / nodes / define (catalog/types.ts:1163)                                                                                                                                                                                                                                                                                   | Read only: run scope names (runWords.ts:109), table group members, select by scope (inspector/GraphValues.tsx:28)                                                                                                                    | App UI to make or keep a set                                                                                                                                                   |
| Undo / history of data changes                                                     | Every data verb is one undoable step; `undo/redo/history/transaction`; ProjectSlice includes graph, config, attributes (session/types.ts:1526, 2047+)                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Header undo/redo                                                                                                                                                                                                                     | --                                                                                                                                                                             |
| Repeatable steps / recipe                                                          | `session.journal` records every command as plain `SessionCommand` (session/journal.ts:25-54); `session.execute(command)` replays one. Journal is NOT saved in the project file; no "graphty-recipe" reader in graphty-element/src                                                                                                                                                                                                                                                                                                                                                                             | --                                                                                                                                                                                                                                   | Saved, re-runnable data recipe (read X, map roles, join Y, filter) -- drafted as data plan + recipe documents (design/documents/drafts/data-plan.md)                           |
| Project file                                                                       | `project.save/open/rename/markSaved`; members graphty-data (records, direction, source), graphty-session (settings, layout, filter, sets, views), graphty-arrangement, graphty-results, graphty-style, graphty-notes, graphty-view-state (session/projectFile.ts:1-12, 56-70). Data is saved as records, not as the steps that produced them. `open` of a plain data file returns a LoadDraft                                                                                                                                                                                                                 | Save, Save as, Recent projects, autosave (project/actions.ts:188, autosave/)                                                                                                                                                         | Re-read sources on open (network sources only: `pendingSourceLoads`)                                                                                                           |
| Export                                                                             | `element.exportGraph(format, options)`: every format, `styles`, `notes`, loss notes (Graph.ts:6405-6441; data/export.ts:84). Whole graph only                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Export dialog, data and image outputs (export/DataOutput.tsx:118, 151)                                                                                                                                                               | Export a filter's / set's / selection's elements (element-gaps.md:138 "Missing")                                                                                               |
| Graph summary                                                                      | `data.statistics()`, `data.histogram(column)`, `data.fingerprint()`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Inspector graph values                                                                                                                                                                                                               | --                                                                                                                                                                             |

### 2. Where the element is missing something a data job needs

By the root CLAUDE.md "Architectural Principles" (the app must not compute over nodes or edges,
must not work around the element), each of these belongs in graphty-element, not the app.

1. **Join a table onto existing nodes by key.** No API (#298 open). The merge path drops the
   table's rows for nodes already present (session/project/ingest.ts:568), so the obvious user
   path ("add the expression table") silently does nothing to existing nodes. Needs: a join verb or
   a load choice (`existing: "update"`, key column, match mode, on-duplicate) plus a report of
   matched / unmatched keys. Network sources on golden already have `existing: "keep" | "update"`; generalizing it to every import is the smallest step.
2. **Merge report.** `LoadReport` counts within-load duplicates and repeated edges but has no
   "nodes already in the graph: N matched, M added" (data/report.ts). element-gaps.md:55 asked for
   added / updated / unchanged counts.
3. **Several sources.** `data.source()` and `lastImport()` hold one source; a merge overwrites it
   (ingest.ts:474). A Sources list, "which source did this node come from", and "remove that
   source" all need a per-load ledger in the element (the branch's `loads()` covers network
   sources only).
4. **Column edits: rename, drop, convert type, derive.** Nothing exists; `origin: "joined" |
"computed"` is declared but never produced. `declare` sets measurement only. Date parsing from
   text, list splitting and missing-value tokens are drafted in data-plan.md, unbuilt.
5. **More roles.** `ColumnRole` lacks category/type, geo (lat/lon), node size/weight on node
   tables (`nodeWeightPath` exists in config but is not a load role). Geo has no support anywhere.
6. **Filter steps.** One RuleTree for the whole session; no ordered, named, toggleable steps with
   per-step removed counts (element-gaps.md:151).
7. **Scoped export.** `exportGraph` has no scope option (element-gaps.md:138).
8. **Re-map after load / re-read source.** Roles are fixed at load; changing `knownFields` does not
   re-read held records. A project keeps records, not the plan, so "same steps on next week's file"
   has no element support (data plan / recipe documents are drafts).
9. **Query validation.** `catalog.validate` is deprecated and unimplemented (#335), so an app
   filter or set editor cannot check an expression before applying it.

### 3. Where the app lags the element (no element work needed)

Fact: these element APIs exist on golden and the app has no UI for them (grep of graphty/src):
`data.declare` (set measurement), `data.renameSource` (DataPlace.tsx:277 comment is stale),
`data.updateNodes/updateEdges/removeNodes` (table is read-only), `visibility.set/setWindow`
(no filter UI), `sets.create/combine` (no set UI), `LoadChoices.duplicateIds` and
`knownFields.repeatedEdges` (not on the Data page).

## F. Graph tools

### 1. Gephi desktop

Facts

- Two CSV routes: the File > Import route and the Data Laboratory "Import Spreadsheet" route
  (https://gephi.org/faq).
- Data Laboratory import: pick file, separator, encoding and "the target table (nodes or edges)";
  last step: "You can mark what columns to use and select their type when they don't exist yet."
  (http://docs.gephi.org/desktop/User_Manual/Import/CSV_Format/)
- Roles are fixed column names: "'Source' and 'Target' for edges tables ... are mandatory and
  can't be deselected"; matched case-insensitively. "If no node/edge Id column is provided or it
  is empty for some row, an automatic id will be assigned." Edge type defaults to Directed.
  (same page)
- Importing into an existing graph is allowed: "The workspace does not need to be empty." But "If
  a column title already exists in the workspace you will be able to use it but the data type of
  the column can't be changed." Cells that do not parse to the column type become null. A nodes
  import can update an existing node's data instead of creating a node when the id already exists.
  (same page)
- Combine is a choice made at the end of every import: new workspace or append. Tutorials tell
  users to import nodes first, then edges with "Append to existing workspace"
  (https://digipedia.tudelft.nl/tutorial/analyzing-a-building-plan-in-graph-structure). A forum
  answer names the common mistake: data lands in two workspaces because append was not chosen
  (summarized from search results, same tutorial cluster). A Gephi maintainer: appending works
  when the new file "has the same identifier (ID) for elements"
  (https://lists.launchpad.net/gephi.team/msg00191.html).
- Parallel edges: spreadsheet import once kept only the first and ignored the rest; the fix was to
  sum weights (https://launchpad.net/bugs/785635). The importer exposes an edge merge strategy
  (https://gephi.org/javadoc/0.9.3/org/gephi/io/importer/api/class-use/EdgeMergeStrategy.html), and
  a maintainer's first question on a "missing edges" report was the merge setting
  (https://github.com/gephi/gephi/issues/2216).
- Cleaning lives in the Data Laboratory as table actions: merge columns with a user-chosen
  strategy, duplicate column, fill column, copy data to another column
  (https://gephi.org/gephi/0.9.2/apidocs/org/gephi/datalab/api/AttributeColumnsController.html),
  and "Detect and merge node duplicates", which only checks "the equality of values at that
  column" and does not show which nodes will merge
  (https://lists.launchpad.net/gephi.team/msg02483.html).
- Pain points from a teaching guide: users' own headers "cannot be interpreted by Gephi" and must
  be renamed; forgetting to say node vs edge table on import produces errors
  (https://research.bowdoin.edu/digital-computational-studies/digital-computational-studies/excel-data-and-gephi-data-laboratory).
- Gephi Lite (browser) reads GEXF and GraphML only (writes GEXF), and keeps its own JSON
  workspace with appearance and filters (https://docs.gephi.org/lite/user-manual/file-formats).

Judgment: Gephi's primary path is "one file per table, fixed column names, append". Everything
about combining is a single radio button at the end of the import; matching is implicit (same Id
string). Cleaning is a power-user table toolbox with no preview.

### 2. Cytoscape desktop

Facts

- Primary path: File > Import > Network from File. A live preview: "The screen provides a preview
  that shows how the file will be parsed given the current configuration." User clicks a column
  header to make it Source, Target or Interaction; a file with only a source column creates
  nodes without edges. Types are guessed and overridable (String, Boolean, Integer, Floating
  Point, List); lists need one global delimiter. Advanced: first line as names, start row,
  comment prefix. (https://manual.cytoscape.org/en/stable/Creating_Networks.html)
- On import the user picks a new collection or an existing one; networks in a collection are
  linked by the "shared name" column (same page).
- Attribute join is a separate primary command, Import Table from File: target a collection, a
  network, or an "Unassigned Table"; "Import Data as" node, edge or network columns. "The data
  table file should contain a primary key column and at least one data column." "Make sure the
  column designated as key matches what's selected under Key Column for Network." Unassigned
  tables "link automatically" when a matching network is loaded later. Matching is exact,
  "including case". (https://manual.cytoscape.org/en/stable/Node_and_Edge_Column_Data.html,
  https://manual.cytoscape.org/en/3.10.3/_sources/Node_and_Edge_Column_Data.md.txt)
- "It's safest to explicitly specify the value type"; lists "are not supported by Styles"
  (same page). Type is set in the import dialog; I found no documented way to change a loaded
  column's type (search, no source found -- unconfirmed).
- The top pain point on community forums is the join silently matching nothing: "Failed to load
  data: Provided key columns do not contain any matches"
  (https://support.bioconductor.org/p/p133439/, https://biostars.org/p/480280); unmatched rows "are
  effectively discarded upon import"
  (https://py4cytoscape.readthedocs.io/en/0.0.5/tutorials/Importing_data.html). Causes: wrong key
  column, different identifier namespaces (gene symbol vs Entrez), whitespace, case.
- Merging graphs is a Tools menu item, not part of import: Tools > Merge > Networks, Union,
  Intersection or Difference, an Advanced "Matching Columns" setting ("Typically, the name column
  or some other column containing identifier information"), and a per-column "How to merge
  columns" table for output name and type. Tools > Merge > Tables works "similarly".
  (https://manual.cytoscape.org/en/stable/Merge.html)

Judgment: Cytoscape is the clearest model of "two primary imports": network-from-table (roles by
clicking headers, with preview) and table-onto-network (key match). Merge of whole networks is
secondary. Its biggest documented failure is a join that reports no or few matches without
telling the user why -- the match report is the feature graphty should not omit.

### 3. Cytoscape Web / NDEx

Facts

- Data menu: Open Network(s) from NDEx, Open Sample Networks, Import Network from File (.csv,
  .txt, .tsv, .sif, .cx2), Import Data Table Files; workspaces save to NDEx only when logged in;
  Merge Networks is its own manual chapter. Same header-click role assignment and type override
  as desktop. (https://cytoscape-web.readthedocs.io/en/latest/,
  https://cytoscape-web.readthedocs.io/en/latest/Creating_Networks.html)

Judgment: the web port kept exactly the desktop's three verbs (open network, add table, merge
networks) and dropped most of the rest, which is a signal of what the Cytoscape team considers
core.

### 4. Kumu

Facts

- Three sources: Excel/CSV (one-shot import), Google Sheets (live link), JSON blueprints
  (https://docs.kumu.io/llms-full.txt, section "Import").
- Fixed roles by position: "Label (must be in the first cell of Column A)" for elements; "From"
  and "To" in A1 and B1 for connections. Multi-values separated by `|`; several targets in one To
  cell draw several connections. Optional ID as the first column. Separate sheets per element
  type are recommended; "(ignore)" in a sheet name skips it. A review step comes before save.
  (same file, "Structure your data for Kumu", "Excel / CSV")
- Matching on re-import: by Label alone, or Label AND Type when Type is present, or ID when an ID
  column exists; matched elements are updated and "existing data in an element's field ... would
  be replaced". Connections need IDs to be updated rather than duplicated. "If you use IDs on
  elements, connections must reference those IDs". (https://docs.kumu.io/faq/how-do-I-avoid-duplicating-data.html)
- Duplicate cleanup advice: fix the spreadsheet, delete all map data, re-import
  (https://docs.kumu.io/faq/how-to-get-rid-of-duplicates.html).
- Google Sheets is "an ongoing import": refetched on each page refresh, one-way, read-only in
  Kumu, no edits in Table, and pinning and direct decorations are disabled
  (https://docs.kumu.io/llms-full.txt, "Caveats for the Google Sheets integration").
- Excel cons in Kumu's own words: each edit "requires a re-import"; "Re-imports into Kumu increase
  the chances of duplicating data"; edits in Kumu make the sheet "outdated" (same file, "Import").
- Field types are set per field after import: String, Text, URL, Email, Number, Currency, Date
  (same file, "Field type"). "Size by" offers nothing until a field is Number (same file, "Basic
  Editor").
- Documented pitfalls: wrong header cells, hidden sheets, junk in unused cells, .xls, UTF-8,
  "10,000+ data points" (same file, "Common pitfalls").

Judgment: Kumu treats the spreadsheet as the source of truth and the map as a view of it, so
"update from source" is primary and identity (Label vs ID) is the whole game. Its docs spend more
words on avoiding duplicates than on any other import topic.

### 5. Polinode

Facts

- New Network > name + file type (Excel default, GEXF, JSON), template download per type.
  Nodes sheet needs Name (unique, used as id); Edges sheet needs Source and Target, which "can
  reference either Name or ID values". Types auto-detected (numeric if every non-blank cell is a
  number; one text value makes it categorical; blanks are "Not Applicable"). Column-name prefixes
  set roles and types: `*` forces text, `!` hides from filter/color/size, `#` splits hashtags.
  Reserved names (ID, Label, Color, Size, Type, X, Y, Hidden...) are silently not attributes.
  Edges whose Source/Target are not in Nodes are an error. Updating means re-uploading as a new
  network. (https://docs.polinode.com/guide/networks.html)

Judgment: Polinode pushes type and role setting into the file (header prefixes, reserved names);
cheap to build, invisible to users, and silently drops a user column called "Type" or "ID".

### 6. yEd

Facts

- Opens .xls/.xlsx directly; representations: adjacency matrix, edge list, node list. The user
  picks the source/target id columns and node id column ("Adopt" takes the selected cell's
  column), a "Label Text" property, an initial layout and templates; "Property Names in First
  Row" is the usual fix for missing or duplicated nodes.
  (https://yed.yworks.com/support/manual/import_excel.html)
- A user request, unanswered: auto-detect Source/Target and Node ID columns from headers and
  allow separate Nodes/Edges sheets
  (https://yed.yworks.com/support/qa/23615/excel-import-ease-automatically-find-edge-node-lists-separate).

### 7. Neo4j Data Importer (Aura Import) / Arrows / Bloom

Facts

- Model-first: load CSV files, draw labeled nodes and typed relationships (the drawing UI is
  Arrows'), map files to them
  (https://neo4j.com/docs/getting-started/data-modeling/data-modeling-tools/). Each node needs a
  label, a file and an ID property; "By default, Data Importer uses the property with `id` in its
  name as the ID"; types are guessed and editable; duplicate IDs update the first node with "the
  most recently read properties being kept"; rows with an empty ID are excluded by default and
  more exclude values (e.g. `null`) can be added to avoid "super nodes"; a file filter can feed
  only matching rows to an element. Relationships need a type, a file and "Node ID mapping" for
  each end; three setups (same file as both ends auto-mapped, one end's file, separate
  relationship file). Incomplete elements are highlighted and cannot import.
  (https://neo4j.com/docs/data-importer/current/mapping/)
- Scope: "initial data imports of medium complexity (10 node- and relationship-types) and medium
  size (100k to 1M elements)"; Bloom explores data after import and does not load it
  (https://neo4j.com/blog/developer/discover-auradb-free-week-16-the-csv-data-importer-tool/).

Judgment: the only tool here whose primary path handles "one wide table makes several node
types" well, because the user maps columns to a drawn model. The empty-ID and super-node
exclusions are cleaning steps that exist because real tables have blanks.

### 8. Linkurious

Facts

- CSV import runs from admin-made templates: (1) nodes, edges or both, (2) file, delimiter,
  preview, (3) suggested categories/types and properties, accept or change, (4) optional
  duplicate detection with a primary key; users choose merge or ignore duplicates at import.
  Edge files must identify their end nodes, typically by an existing ID property.
  (https://doc.linkurious.com/admin-manual/latest/import-csv/)

Judgment: Linkurious makes the mapping a saved, reusable object (a template) -- the clearest
example of "repeatable steps" in this set -- but puts its authoring behind an admin role.

### 9. Graphistry

Facts

- Data = an edges table bound by `source`/`destination` columns, optional nodes table bound by
  `node`; visual roles (color, label, size, title, weight) are bindings
  (https://hub.graphistry.com/docs/api/2/rest/upload/).
- Hypergraph transform turns one event table into a graph: a node per unique value in each
  `entity_types` column (all columns if none), optionally a node per row (`direct=False`);
  `CATEGORIES` merges columns that hold the same kind of id (e.g. `{'ip': ['attackerIP',
'victimIP']}`) so one IP is one node; `EDGES` limits which entity types connect
  (https://pygraphistry.readthedocs.io/en/latest/demos/for_analysis.html,
  https://pygraphistry.readthedocs.io/en/0.52.1/api/hyper.html).
- The no-code path is a file uploader; I found no public description of its screens
  (https://graphistry-dev.infra.blackbird.ai/docs/api/ -- unconfirmed).

Judgment: the hypergraph's CATEGORIES is the cleanest statement of "identity is a semantic type,
not a column": two columns with the same type of value resolve to the same node.

### 10. Cross-tool comparison

| Job                              | Primary in                                                                | Secondary / advanced in                   | Absent in                          |
| -------------------------------- | ------------------------------------------------------------------------- | ----------------------------------------- | ---------------------------------- |
| Open one file as a graph         | all                                                                       | --                                        | --                                 |
| Edge table + node table          | Gephi (append), Kumu, Polinode, yEd, Cytoscape (table import), Graphistry | --                                        | --                                 |
| Roles: id/source/target          | Cytoscape (click header), Neo4j (map), yEd (pick), Linkurious (suggest)   | --                                        | fixed names: Gephi, Kumu, Polinode |
| Column types                     | Cytoscape, Neo4j, Gephi (at import, only new columns)                     | Kumu (per field later)                    | Polinode (inferred; header prefix) |
| Join a table onto nodes by key   | Cytoscape (Import Table)                                                  | --                                        | Gephi, Polinode (re-upload)        |
| Re-import / update from source   | Kumu (Sheets live, re-import by Label/ID)                                 | Linkurious (templates)                    | Polinode (new network)             |
| Merge graphs, union/intersection | --                                                                        | Cytoscape Tools > Merge                   | most                               |
| Duplicate nodes                  | Linkurious (at import)                                                    | Gephi Data Lab, Kumu (fix sheet and redo) | others                             |
| Exclude blank/null ids           | Neo4j (default on)                                                        | --                                        | others                             |
| Saved, repeatable mapping        | Linkurious templates, Neo4j model file                                    | --                                        | others                             |

### 11. Documented pain points, ranked by how often they recur

1. Identity mismatch on combine. Cytoscape joins that match nothing
   (https://support.bioconductor.org/p/p133439/); Gephi appends that need identical ids
   (https://lists.launchpad.net/gephi.team/msg00191.html); Kumu duplicates on re-import
   (https://docs.kumu.io/faq/how-do-I-avoid-duplicating-data.html); Polinode errors on unknown
   Source/Target (https://docs.polinode.com/guide/networks.html).
2. Header/role conventions. Gephi needs renamed headers (Bowdoin guide above); Kumu needs exact
   cells A1/B1; Polinode silently swallows reserved names; yEd users ask for auto-detection.
3. Type locked or guessed wrong. Gephi cannot change an existing column's type; Cytoscape says
   set it explicitly; Kumu's Size by is empty until a field is Number.
4. Accidental second workspace / second network instead of append (Gephi).
5. Parallel edges silently merged or dropped (Gephi bug 785635, issue 2216).
6. Live source vs local edits conflict (Kumu Google Sheets: read-only, features disabled).

## G. BI tools

### 1. Tableau Desktop

#### First screen and first action (primary path)

- Facts: After connecting, the user lands on the Data Source page: a left pane listing the
  connection and its sheets or tables, a canvas, a data grid showing the first 1,000 rows, and a
  metadata grid [1][2]. The first action is to drag a sheet or table onto the canvas; then click
  "Sheet 1" at the bottom to start building a view [2]. For a single CSV or one-sheet Excel file
  the table is usually placed for you, so the primary path is connect -> glance at the grid ->
  go to Sheet 1 [2].
- Facts: The grid is directly editable for "semantic" changes: sort, hide, rename fields; the
  metadata grid shows fields as rows for bulk renaming or hiding [1].
- Facts: Every field gets a data type and a role up front, shown as an icon (type) and a pane
  position / pill color (role) [3]. Changing either is a click on the field's icon or a drag in
  the Data pane, not a separate step [3][5].

#### Types and roles (set and inferred)

- Facts: Tableau infers the role from values: numbers that can be aggregated become measures,
  everything else dimensions [3]. Its own help names the classic failure: postal codes look
  numeric "but they're actually string values that shouldn't be added or averaged" [3]; a
  numeric ID is fixed by dragging it to Dimensions [3].
- Facts: Two independent axes: dimension/measure (what you do with it) and discrete/continuous
  (blue headers vs green axis) [3].
- Facts: Geographic roles are inferred from common field names (City, State, Country) and shown
  by a globe icon; otherwise set by the field's type icon > Geographic Role > role [4][5]. Once
  set, Tableau generates Latitude/Longitude fields [5]. The role list includes Latitude and
  Longitude for numeric fields [5]. Ambiguous names (e.g. "ST", "Region_Admin") are not
  detected [4, third-party guide in results].
- Judgment: Tableau's key move is that a ROLE is separate from a TYPE and is set in the same
  place the field is shown, by its icon. That maps directly onto graphty's column roles (id,
  source, target, weight, label, category, number, date, geo).

#### Combining several sources

- Facts: Since 2020.2 the canvas has two layers. The top logical layer combines tables with
  "relationships" (the "noodle"), which "defer joins to the time and context of analysis";
  double-clicking a table opens the physical layer for joins and unions [6][1].
- Facts: When relating, "Tableau first attempts to create the relationship based on existing key
  constraints and matching field names"; related fields must share a data type; geographic
  fields cannot define relationships; circular relationships are not supported [6].
- Facts: Performance options (cardinality, referential integrity) are collapsed and Tableau
  recommends changing them only if you are sure of the data [7]. Tableau's FAQ recommends
  relationships first and joins "only when they are absolutely needed" [8].
- Facts: Joins "can cause data loss or duplication if tables are at different levels of
  detail" [9]. Unions append rows by dragging a table beneath another; wildcard unions match a
  name pattern; Tableau adds "Table Name"/"Sheet" columns recording each row's origin; fields
  with different names can be combined with "Merge mismatched fields" [10].
- Facts: Blending is a third, per-sheet method with a primary (blue check) and secondary (orange
  check) source and link icons; it acts like a left join, and changing source order changes
  results [9].
- Facts: Data Interpreter is a checkbox in the left pane that strips titles, notes, footers and
  empty cells from messy Excel/CSV/PDF/Sheets sources, with a "Review the results" link; it is
  offered only when the source needs it [11]. Heavier cleaning is sent to a separate product,
  Tableau Prep [11].

#### Filters

- Facts: Data source filters are added from "Add" in the Filters area at the top right of the
  Data Source page, with a scope of one table or "and all related tables" [12]. Extract filters
  limit what is pulled into an extract [12]. Context filters exist to fix the order of
  operations, e.g. to apply a general filter before a Top N filter, because otherwise users get
  "unexpected results" [13].
- Judgment: Tableau has at least four filter tiers (extract, data source, context, sheet). Only
  the sheet filter is primary; the rest are advanced and a known source of confusion.

#### Steps and repeatability

- Facts: Tableau Desktop does not keep a step list for data shaping; the data source is a
  configuration (connections, canvas, filters, renames) saved with the workbook [1][14]. Step
  recording lives in the separate Tableau Prep product [11].

#### Known usability problems

- Facts: Users upgrading to 2020.2 could not find their joins, which had moved behind the
  physical layer [15]. A community user reported rows "disappearing" after adding a
  relationship, caused by a filter's include-nulls setting [16]. Unmatched rows in
  dimension-only views are hidden unless the user turns on Analysis > Table Layout > Show Empty
  Rows [7]. Tableau wrote a help page titled "Don't Be Scared of Relationships" and advises
  using View Underlying Data often to check what a mark represents [7].

---

### 2. Power BI Desktop / Power Query (and Excel Get & Transform)

#### First screen and first action (primary path)

- Facts: Get data -> pick a connector -> the Navigator: objects on the left, a preview on the
  right, and two buttons, Load and Transform data [17][18]. For a CSV the preview dialog also
  offers File origin, Delimiter and Data type detection [18].
- Facts: "Load" skips the editor entirely; "Transform data" opens the Power Query editor:
  ribbon, Queries pane, data preview, Query settings with Applied steps, status bar [17][19].
- Judgment: The primary path is preview -> Load. The editor is the advanced path, but it is
  one click away and visible on the first dialog, which is a good model: the escape hatch is
  named on the first screen, never forced.

#### Types and roles

- Facts: For unstructured sources (CSV, Excel, text) detection is on by default and is based on
  the first 200 rows; it adds two visible steps, "Promoted headers" and "Changed type" [20]. The
  CSV dialog lets you choose first 200 rows, entire dataset, or no detection [18]. Types are
  changed by the icon on the column header (also ribbon and right-click) [20]. Locale matters:
  UK dates under a US locale produce errors; the fix is Change type > Using locale [20].
- Facts: Power BI also infers a role-like behavior: numeric columns get a default summarization
  (usually Sum) shown by a sigma icon [24]. A separate "Data category" (Address, City, Country,
  Latitude, Web URL ...) is set from Column tools; Microsoft's own example is "AL" meaning
  Alabama or Albania [21].
- Facts: Data profiling (column quality valid/error/empty bars, distribution, column profile)
  is OFF by default, enabled from the View tab, and profiles only the top 1,000 rows unless the
  user clicks the status-bar message to switch to the entire dataset [22].

#### Combining several sources

- Facts: Two separate verbs in the Combine group, each with an "as new" variant: Merge queries
  (join on one or more column pairs, six join kinds, a match estimate shown at the bottom of
  the dialog, a light-bulb suggestion of column pairs, optional fuzzy matching for text) and
  Append queries (stack rows, matched by column NAME not position, nulls where a table lacks a
  column) [23][25].
- Facts: After a merge the right table arrives as a nested table column that must be expanded
  (pick which fields) [23].
- Facts: In the model, Power BI autodetects relationships on load by looking at column names and
  creates one only with "a high level of confidence"; it auto-sets cardinality, cross-filter
  direction and active/inactive [26]. A relationship needs a unique key on one side or it fails
  with "One of the columns must have unique values" [26]. Only one active relationship is
  allowed between two tables and "the automatically selected relationship can be wrong" [26].

#### Steps and repeatability

- Facts: Every transformation is recorded in Applied steps; selecting a step previews the data
  at that point; steps can be renamed, described, deleted, "deleted until end", inserted after,
  moved, and their settings edited via a gear icon; "Extract Previous" turns the earlier steps
  into a reusable query [27]. Inserting or changing a middle step shows a warning [27]. The
  whole query is M code viewable in the Advanced Editor [19]. Refresh replays the steps against
  the current source [17].

#### Known usability problems

- Facts: The auto "Changed type" step hard-codes column names, so a renamed or removed source
  column breaks refresh with "The column ... of the table wasn't found"; community advice is to
  delete the step or turn auto-detection off [28][29]. Type guesses from 200 rows can be wrong
  [29]. A CSV import pins the column count at first import, so columns added later are silently
  dropped on refresh [18].
- Facts: Default summarization sums columns like Year and ID, a widely documented confusion
  [24]. Cross-filter direction "Both" can create ambiguity in models with loops [26].
- Judgment: Power Query's step list is the right idea, but its steps reference columns by name
  at the moment of recording, so they are brittle across file versions. Any graphty recipe must
  match columns by role or by a tolerant name rule and report mismatches, not silently fail.

---

### 3. Excel and Google Sheets (the familiar baseline)

- Facts: Excel's Get Data uses the same Navigator/Load/Transform flow and the same Applied steps
  as Power BI [17][18]. Its everyday join is still a formula: XLOOKUP looks a key up in another
  range and returns a value [30].
- Facts: Google Sheets Tables: Format > Convert to table; the user PICKS a type per column
  (Number, Text, Date, Dropdown, Checkbox, Smart chips, None); a typed column shows a warning on
  cells that do not match rather than refusing them; "None" allows mixed data [31]. Group-by
  views aggregate automatically [31].
- Facts: Sheets' Smart Cleanup offers "Cleanup suggestions" (extra spaces, duplicates, missing
  number formats, anomalies, inconsistent entries) and "Column stats", reached from the Data
  menu; hovering a suggestion highlights the cells [32]. Remove duplicates and Trim whitespace
  are under Data > Data cleanup; Remove duplicates deletes whole rows, a noted pitfall [32][33].
- Judgment: The baseline every analyst already knows is: open a file and see a grid, fix a
  column's type from its header, look a key up in another table, remove duplicates. Anything
  graphty asks for beyond that is new learning.

---

### 4. Cross-tool pattern summary (judgment, grounded in the facts above)

| Job                                           | Tableau                                                  | Power Query / Power BI                                       | Sheets / Excel                 | Layer in practice                                                                        |
| --------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------ | ------------------------------ | ---------------------------------------------------------------------------------------- |
| Open one file, see it                         | Data Source page grid [1]                                | Navigator preview, Load [17]                                 | grid                           | PRIMARY everywhere                                                                       |
| Fix a column's type                           | type icon on field [3]                                   | type icon on header [20]                                     | Sheets column type [31]        | PRIMARY, one click on the column                                                         |
| Set a role (dimension/measure, geo, category) | icon / drag, auto from name [3][4]                       | summarization, data category in Column tools [21][24]        | none                           | PRIMARY for the common roles (inferred, visible, one-click fix); advanced for parameters |
| Add a second table that shares a key          | relationship, auto-matched by name [6]                   | autodetected relationship or Merge with match count [23][26] | XLOOKUP [30]                   | PRIMARY in the BI tools as of 2020+ (Tableau made relationships the default)             |
| Choose join kind, cardinality                 | physical layer, performance options [6][7]               | join kind list, cardinality, cross-filter [23][26]           | n/a                            | ADVANCED / collapsed                                                                     |
| Append rows from another file                 | union beneath, wildcard [10]                             | Append queries [25]                                          | paste                          | SECONDARY                                                                                |
| Clean messy layout                            | Data Interpreter checkbox, offered only when needed [11] | Extract table by example [18]                                | Smart Cleanup suggestions [32] | offered contextually, not a menu the user must find                                      |
| Profile quality                               | View Underlying Data [7]                                 | profiling off by default [22]                                | Column stats [32]              | SECONDARY, but the BI tools are criticized when it is hidden                             |
| Data-level filter                             | data source filter, scoped [12]                          | filter step                                                  | filter view                    | SECONDARY; view-level filter is primary                                                  |
| Repeatable steps                              | not in Desktop; Prep [11]                                | Applied steps + refresh [27]                                 | none                           | SECONDARY: always recorded, rarely edited                                                |

---

### Sources

[1] Tableau, Data Source Page: https://help.tableau.com/current/pro/desktop/en-us/environment_datasource_page.htm
[2] Salesforce Trailhead, Connect to Your Data in Tableau Desktop: https://trailhead.salesforce.com/content/learn/modules/the-tableau-workflow/connect-to-data-in-tableau-desktop
[3] Tableau, Dimensions and Measures, Blue and Green: https://help.tableau.com/current/pro/desktop/en-us/datafields_typesandroles.htm
[4] Tableau, Get Started tutorial, Explore your data geographically: https://help.tableau.com/current/guides/get-started-tutorial/en-us/get-started-tutorial-explore.htm (third-party note on "ST": https://www.thebricks.com/resources/guide-how-do-you-set-geographic-roles-in-tableau)
[5] Tableau, Assign Geographic Roles: https://help.tableau.com/current/pro/desktop/en-us/maps_geographicroles.htm
[6] Tableau, Relationships (learn more): https://help.tableau.com/current/pro/desktop/en-us/datasource_relationships_learnmorepage.htm
[7] Tableau, Don't Be Scared of Relationships: https://help.tableau.com/current/pro/desktop/en-us/datasource_dont_be_scared.htm
[8] Tableau, Questions about Relationships, the Data Model, and Data Sources: https://help.tableau.com/current/pro/desktop/en-us/datasource_datamodel_faq.htm
[9] Tableau, Blend Your Data: https://help.tableau.com/current/pro/desktop/en-us/multiple_connections.htm
[10] Tableau, Union Your Data: https://help.tableau.com/current/pro/desktop/en-us/union.htm
[11] Tableau, Clean Data with Data Interpreter: https://help.tableau.com/current/pro/desktop/en-us/data_interpreter.htm
[12] Tableau, Filter Data from Data Sources: https://help.tableau.com/current/pro/desktop/en-us/filtering_datasource.htm
[13] Tableau, Order of Operations: https://help.tableau.com/current/pro/desktop/en-us/order_of_operations.htm
[14] Tableau blog, extracts vs live connections: https://www.tableau.com/blog/tableau-cloud-tips-extracts-live-connections-cloud-data
[15] InterWorks, Missing joins in Tableau 2020.2: https://interworks.com/blog/2020/07/29/advance-with-assist-missing-joins-in-tableau-20202/
[16] Trailblazer Community thread, losing data when adding a relationship: https://trailhead.salesforce.com/trailblazer-community/feed/0D5KX00000kRf610AC
[17] Microsoft, Getting data overview (Power Query): https://learn.microsoft.com/en-us/power-query/get-data-experience
[18] Microsoft, Text/CSV connector: https://learn.microsoft.com/en-us/power-query/connectors/text-csv
[19] Microsoft, Power Query UI: https://learn.microsoft.com/en-us/power-query/power-query-ui
[20] Microsoft, Data types in Power Query: https://learn.microsoft.com/en-us/power-query/data-types
[21] Microsoft, Data categorization in Power BI Desktop: https://learn.microsoft.com/en-us/power-bi/transform-model/desktop-data-categorization
[22] Microsoft, Data profiling tools: https://learn.microsoft.com/en-us/power-query/data-profiling-tools
[23] Microsoft, Merge queries overview: https://learn.microsoft.com/en-us/power-query/merge-queries-overview
[24] Default summarization summing Year (third-party guides): https://www.thebricks.com/resources/guide-why-does-power-bi-automatically-sum-values , https://www.thebricks.com/resources/guide-why-is-power-bi-summing-my-data
[25] Microsoft, Append queries: https://learn.microsoft.com/en-us/power-query/append-queries
[26] Microsoft, Create and manage relationships in Power BI Desktop: https://learn.microsoft.com/en-us/power-bi/transform-model/desktop-create-and-manage-relationships
[27] Microsoft, Applied steps: https://learn.microsoft.com/en-us/power-query/applied-steps
[28] Fabric community, "The column ... of the table wasn't found": https://community.fabric.microsoft.com/t5/Power-Query/Expression-Error-The-column-quot-quot-of-the-table-wasn-t-found/m-p/3222461
[29] Excel Off The Grid, Stop the auto Changed Type step: https://exceloffthegrid.com/?p=11707
[30] Microsoft Support, XLOOKUP function: https://support.microsoft.com/en-us/office/xlookup-function-b7fd680e-6d10-43e6-84f9-88eae8bf5929
[31] Google, Use tables in Google Sheets: https://support.google.com/docs/answer/14239833
[32] Google, Use Sheets Smart Cleanup: https://support.google.com/docs/answer/10098582 ; Zapier review: https://zapier.com/blog/google-sheets-data-cleanup/
[33] Google, Split text, remove duplicates, or trim whitespace: https://support.google.com/docs/answer/6325535
[34] Kandel, Paepcke, Hellerstein, Heer, Enterprise Data Analysis and Visualization: An Interview Study (VAST 2012): https://idl.uw.edu/papers/enterprise-analysis-interviews -- 35 analysts in 25 organizations; discovery and wrangling reported as the most tedious, time-consuming tasks. Supports ranking cleanup and combining as high-frequency jobs.

## H. Data-prep tools and notebooks

### 1. OpenRefine (desktop data-cleaning tool)

Facts

- Facets are the primary way to look at and select data. A text facet groups identical values with
  counts and "does no guessing about typos or near-matches"; editing a facet entry mass-edits every
  identical cell. Numeric facets show a histogram with draggable range markers and separate
  checkboxes for blank, non-numeric and error values; a timeline facet does the same for dates.
  Facets combine as AND, and later operations apply only to the "matching rows" (except column
  moves and renames, which ignore facets). One-click "customized facets" include Duplicates,
  Blank/Empty/Null and Error. https://openrefine.org/docs/manual/facets
- Clustering (near-duplicate values) is launched from a facet's Cluster button. Methods run from
  strict to lax: key collision (fingerprint, n-gram fingerprint, phonetic) then nearest neighbor
  (Levenshtein, PPM, which is a "last resort"). The dialog shows each cluster's values with
  counts; the user approves a cluster and either picks one existing value or types a new one;
  "Merge selected & re-cluster" applies and re-runs so the user steps through methods in order.
  https://openrefine.org/docs/manual/cellediting
- Reconciliation matches a column against an external authority (Wikidata by default, or any
  service implementing the reconciliation API). Steps: pick service, optionally a type, optionally
  extra columns as disambiguating properties; each cell gets scored candidates; confident matches
  are shown as one dark link, uncertain ones as several light links to choose from; judgment facets
  (matched / new / none) show remaining work, and bulk "accept best candidate" works on a
  filtered set. The docs call it "semi-automated": human review is expected.
  https://openrefine.org/docs/manual/reconciling
- History: every data-changing action is an entry in the Undo/Redo panel; clicking an entry
  returns to that step. "Extract..." exports selected operations as JSON; "Apply..." pastes that
  JSON into another project to replay it. Single-cell edits cannot be extracted.
  https://openrefine.org/docs/manual/running
- Types are per cell (string, number, boolean, date, plus error and null). Import optionally
  "attempt[s] to parse cell text into numbers"; recognized numbers turn green. Dates are made by a
  "To date" transform, which "may not convert all values successfully."
  https://openrefine.org/docs/manual/exploring
- Joining two projects is not a menu item: it is a GREL expression in "Add column based on this
  column", `cell.cross("Project", "keyColumn").cells["col"].value[0]`; `cross` returns an array
  because a key can match several rows, and it only works between projects in the same local
  instance. https://guides.library.illinois.edu/openrefine/joiningprojects ,
  https://forum.openrefine.org/t/hints-tips-and-tricks/127

Judgment

- OpenRefine's best idea for graphty is that the _same_ surface (a facet) is the filter, the
  data-quality report (blank / error / duplicates facets) and the door to cleaning (Cluster). There
  is no separate "clean data" mode.
- Its join is a well-known weak spot (an expression, arrays, same-instance only): evidence that a
  join must be a first-class dialog with a match count, not an expression.
- Strict-to-lax clustering with a human approving each cluster is the right shape for "resolve
  duplicate nodes": the machine proposes groups, the reader confirms.
- Operation history as a replayable file is exactly the recipe idea graphty already designs; the
  caveat that one-off cell edits do not replay is a real limit to state plainly.

### 2. Airtable and Notion databases

Facts

- Airtable "Link to another record" is the join: pick the other table, then pick records; the link
  is two-way and Airtable adds a reciprocal field in the other table automatically. Lookup fields
  show a linked record's value (it updates when the source changes). Converting an existing text
  field to a linked-record field matches each value to the other table's primary field and
  _creates a new record_ when none matches.
  https://support.airtable.com/docs/linking-records-in-airtable
- Airtable CSV import extension: table fields on the left, CSV columns on the right, auto-mapped by
  name and remembered for next time. An optional "merge" mode picks a merge field: matching rows
  update existing records, unmatched rows create records; duplicates in the CSV use only the first
  row; matching is case-sensitive with whitespace trimmed; "Skip blank or invalid CSV values"
  keeps blanks from overwriting. Values a field cannot accept import as blank without an error.
  https://support.airtable.com/docs/csv-import-extension
- Airtable type detection on CSV import: secondary sources say the preview infers number, date,
  single select (repeated text), multi-select (comma lists), URL and email, with a per-column
  dropdown to override. https://www.usecarly.com/blog/how-to-import-csv-to-airtable (third party;
  no official article found)
- Changing an Airtable field type warns that it "may clear some cell data from every record";
  recovery is Ctrl+Z in the same session or base snapshots.
  https://community.airtable.com/t/why-did-my-field-types-change/34875 (community, not official)
- Notion relations connect two databases ("This is a job for relations!"), one-way by default with
  a "Show on <database>" toggle for two-way. Rollups summarize related pages: Show original, Count
  all / values / unique / empty, Percent empty, Sum, Average, Median, Min, Max, Range, Earliest /
  Latest date, Date range. https://www.notion.com/help/relations-and-rollups
- Notion CSV import falls back to Text for a column with mixed values (an "N/A" among numbers);
  the fix is the property-type dropdown, and "Convert to Select" creates one option per unique
  value. https://wisechecker.com/?p=30749 (third party)

Judgment

- Both products make "join" a _property of a column_ ("this column links to that table"), not an
  operation. For non-programmers that is the most understandable join there is, and it maps
  directly onto graphs: a column whose values are node ids IS an edge list (Airtable linked records
  are edges). graphty can phrase "join a table onto nodes" as "this column matches node ids".
- Airtable's merge-field import is the clearest add/update rule outside databases: one key, three
  outcomes (update, create, skip blanks). graphty's designed "Same id [Skip | Replace | Update
  fields]" matches it (see section 6, lesson 3).
- Silent blanking on bad values (Airtable) and silent fallback to Text (Notion) are the anti-pattern:
  the reader only finds out later. Counts must be shown before commit.
- Rollup's aggregation list is the vocabulary graphty needs for "merge duplicate nodes" value rules
  and for collapsing parallel edges (sum, mean, count, first, earliest).

### 3. Notebooks: pandas + networkx (Jupyter, Observable)

Facts

- networkx builds a graph from an edge table with `from_pandas_edgelist(df, source='source',
target='target', edge_attr=None, create_using=None, edge_key=None)`; it adds no node attributes,
  which the docs say to add separately from a node DataFrame.
  https://networkx.org/documentation/stable/reference/generated/networkx.convert_matrix.from_pandas_edgelist.html
- `set_node_attributes(G, values, name=None)` joins a dict of attributes onto nodes; keys for nodes
  not in the graph are "silently ignored".
  https://networkx.org/documentation/stable/reference/generated/networkx.classes.function.set_node_attributes.html
- pandas `merge` is the analyst's join: `how` (left, right, outer, inner, cross, left_anti,
  right_anti), `left_on` / `right_on`, `suffixes` for clashing names (default `_x`, `_y`),
  `indicator=True` adds a `_merge` column of left_only / right_only / both, and `validate`
  ("1:1", "1:m", "m:1") checks key uniqueness. Null keys match each other, unlike SQL.
  https://pandas.pydata.org/docs/reference/api/pandas.DataFrame.merge.html
- Type correction is explicit code: `to_datetime(errors='coerce')` turns unparseable values into
  NaT; `dayfirst` and `format` resolve ambiguous dates; "mixed" format is called "risky".
  https://pandas.pydata.org/docs/reference/api/pandas.to_datetime.html
- Observable's Data table cell gives no-code filter, show/hide columns, derived columns, sort and
  slice, with operators that depend on the column's type, and an "eject" to a SQL cell for more
  complex queries. https://observablehq.com/documentation/cells/data-table ,
  https://observablehq.com/blog/introducing-data-table-cell (read via search snippets; the pages
  returned HTTP 429 to direct fetch)

Judgment

- The analyst's mental model is always two tables: an edge table (source, target, weight, ...) and a
  node table (id, label, attributes), joined by id. graphty's "nodes file + edges file" import and
  the role names (id, source, target, weight) should use exactly these words; they are what a
  pandas user already says.
- The three things a careful analyst checks around a join -- which rows matched (`indicator`),
  whether the key is unique (`validate`), and what happens to clashing column names (`suffixes`) --
  are exactly what a join dialog must show as plain counts: "318 of 340 rows matched", "key is
  unique / TP53 matches 2 rows", "Replace or Keep both (log2fc_2)". networkx's "silently ignored"
  is the failure a GUI should never copy.
- Observable's "simple controls, eject to code" is the progressive-disclosure pattern for graphty:
  the simple path builds the same command a power user could write; an advanced reader sees and
  edits the recipe, not a different system.

### 4. Datawrapper and Flourish (chart builders for journalists)

Facts

- Datawrapper's flow is linear steps: 1 Upload (paste a table, XLS/CSV upload, connect a Google
  Sheet, link an external dataset URL), 2 Check & Describe, 3 Visualize, 4 Publish. Linked sheets
  and URLs can live-update. https://www.datawrapper.de/academy/external-data-sources
- Datawrapper detects text, number or date per column, checking dates first, then numbers, else
  text, and accepts a column as a type when "at least 90% of the values" parse. Type is shown by
  styling: text black left-aligned, numbers blue right-aligned, dates green centered. To fix a
  wrong guess: click the column letter, choose the type in the sidebar (several columns at once
  allowed). The docs warn that 1800-2100 integers can be mistaken for years and that 3/4/2012 is
  ambiguous, recommending ISO dates. https://www.datawrapper.de/academy/data-column-types
- Datawrapper step 2 edits sit on top of the raw upload: edited cells get an orange triangle and
  "Revert changes" restores the raw data; edits are re-applied to a re-upload by row and column
  position only. https://www.datawrapper.de/academy/how-to-change-your-data-in-datawrapper
- Flourish templates bind columns to roles: a "select columns" panel per binding ("Labels/time =
  Column A", "Value = Column B"), and the UI auto-assigns unused columns to bindings by allowed
  data type, in the template's order, most important first; zero-scoring columns are never
  picked. https://developers.flourish.studio/sdk/getting-started/working-with-data ,
  https://developers.flourish.studio/sdk/api-reference/template-yml-automatic-binding
- Flourish's Network graph template needs only a two-column Links sheet (source, target, optional
  value for width); an optional Points sheet defines the full node set and their group and size.
  https://app.flourish.studio/@flourish/network-graph (template page, seen via search snippets of versioned copies)
- A Flourish course notes the Data tab's column filter removes rows permanently.
  https://knightcenter.utexas.edu/JC/courses/DATA0819/Eng/Flourish-Basics-The-Data-Table-Importing-Data-and-Column-Settings.docx.pdf

Judgment

- These are the best-tested "simple path" for non-programmers: drop or paste, see the table with
  types already guessed and visibly encoded, fix a wrong guess with one select, go. No dialog asks
  about joins, duplicates or cleaning on the way in.
- Flourish's minimum for a network (one sheet, two columns, nodes optional) is the bar graphty's
  primary import should meet: an edge list alone must give a graph, with roles pre-bound and shown.
- Role binding by type with an ordered priority list is a direct model for graphty's
  id/source/target/weight/label auto-detection: guess, show the guess in the same place the reader
  changes it, never ask first.
- Filter-that-deletes (Flourish) is the anti-pattern; graphty's design already separates hide
  (view) from remove (data edit, asks first) (`design/ui/object-first-ux/round-3/data-editing.md`,
  "Rules every data edit follows", rule 6).
- Datawrapper's "edits on top of raw, marked, revertible, re-applied on re-upload" is the simplest
  repeatable-step model a non-programmer meets; its weakness (re-applied by position, not by key)
  is what graphty's journal fixes by keying edits to ids
  (`design/ui/object-first-ux/round-3/data-editing.md`, rule 5: edits replay on reload, with
  "2 of 14 edits no longer apply").

### 5. Cross-cutting patterns

| Job                       | Simple path seen in the wild                                                                                                     | Advanced path seen in the wild                                                                |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Load                      | drop / paste / pick file, preview table immediately (Datawrapper step 1, Flourish)                                               | linked URL or sheet that refreshes (Datawrapper external data)                                |
| Type detection            | auto-guess with a tolerance (90%, Datawrapper), visible by color and alignment; override with one select on the column           | per-cell types and expressions (OpenRefine), `to_datetime(format, dayfirst, errors)` (pandas) |
| Column roles              | auto-bind by type in priority order, shown where it is changed (Flourish)                                                        | explicit mapping UI remembered per header set (Airtable CSV import)                           |
| Join                      | "this column links to that table" (Airtable linked record, Notion relation); key match with update/create (Airtable merge field) | pandas `merge` with indicator / validate / suffixes; OpenRefine `cross()`                     |
| Duplicates                | facet counts and a Duplicates facet (OpenRefine)                                                                                 | clustering methods strict to lax with per-cluster approval (OpenRefine)                       |
| Aggregating merged values | rollup menu: count, sum, average, earliest, show original (Notion)                                                               | `groupby().agg` in code                                                                       |
| Filter                    | facets / column filters that only hide (OpenRefine, Observable)                                                                  | expression facets (OpenRefine), SQL eject (Observable)                                        |
| Repeatable steps          | edits layered over raw data, marked and revertible (Datawrapper)                                                                 | history panel with extract / apply JSON (OpenRefine); the notebook itself                     |
| Matching to outside ids   | --                                                                                                                               | reconciliation with scored candidates and judgment facets (OpenRefine)                        |

## I. Gaps in this research

- design/sets, design/undo, design/element-api, design/graph-format and design/xr have not been read for data jobs.
- Competitor products not yet checked: KeyLines, Neo4j Bloom, Graph Commons, Trifacta, Alteryx and Quantexa.
- No real-user complaint mining has been done (forums and bug trackers).
- Whether `report()` fills the repeated-edge counts before a load has not been verified.

## J. Competitor lessons and superseded designs

In short, the competitors teach: let the reader point at columns instead of
demanding fixed headers; make a join say why it matched nothing before it commits; fix a type on
the column itself; prefer two plain verbs to three subtle ones; offer cleanup only when the data
needs it; bind recorded steps by column role or name, never by position; and keep one filter card
first, because ordered filter trees confuse newcomers.

### What competitors teach

- **Every graph tool puts "open a file" first, and the ones with fixed column names write the most
  help pages.** Gephi, Kumu and Polinode need exact headers. Cytoscape lets you click a header to
  make it the source or target ([Cytoscape manual](https://manual.cytoscape.org/en/stable/Creating_Networks.html)).
- **The most repeated complaint is a join that matches nothing and does not say why.** Cytoscape's
  error names no cause, and the causes are the key column, the id system, spaces and case
  ([Bioconductor thread](https://support.bioconductor.org/p/p133439/)). Power Query shows the
  matching-row estimate before you commit
  ([Microsoft](https://learn.microsoft.com/en-us/power-query/merge-queries-overview)).
- **Fixing a column's type is on the column itself everywhere:** Tableau, Power Query, Google
  Sheets and Datawrapper ([Datawrapper](https://www.datawrapper.de/academy/data-column-types)).
- **Two plain verbs beat three subtle ones.** Tableau's relationships, joins and blends are its
  most documented confusion
  ([Tableau](https://help.tableau.com/current/pro/desktop/en-us/datasource_dont_be_scared.htm)).
  Gephi users report landing in two workspaces when they miss the append choice.
- **Cleanup is offered only when the data needs it.** Tableau's Data Interpreter and Google
  Sheets' cleanup suggestions both appear only for messy data
  ([Tableau](https://help.tableau.com/current/pro/desktop/en-us/data_interpreter.htm)).
- **Recorded steps make refresh work, but steps keyed by column position break.** Power Query
  replays applied steps on refresh, and its automatic "Changed type" step fails when a column is
  renamed ([Microsoft](https://learn.microsoft.com/en-us/power-query/applied-steps)). Recipes bind
  by column role and name for this reason.
- **Ordered filter trees confuse newcomers.** Gephi declined a per-step toggle to stay simple
  ([Gephi blueprint](https://blueprints.launchpad.net/gephi/+spec/subfilter-toggle)), and
  Cytoscape's filter selects by default and hides only on request
  ([Cytoscape](https://manual.cytoscape.org/en/latest/Finding_and_Filtering_Nodes_and_Edges.html)).
  So one card is primary and ordered steps appear only once there are two.

### What this supersedes or updates

- **The old app shell's Data section** (`design/ui/app-shell-progressive-disclosure-design.md`,
  section 5.3). Still holds: open, URL, paste and samples first; a mapping stated in one line with
  Change; tables and cleaning one step in. Replaced: table join moves up to the first layer as one
  of three verbs; the seven-way Import options dialog gives way to the Data page; large files get a
  pre-chosen way through instead of "warn and allow"; repeated edges are kept unless the reader
  combines them.
- **`design/ui/tier1-real-app/tier1-design.md`, "Not in tier 1".** Joins, Replace and weight roles
  move up from tier 2 to the first layer. **`element-gaps.md`** beside it is out of date.
- **`design/documents/drafts/data-plan.md`.** Its refusal of a join on a clashing column name is
  replaced by an explicit clash rule, and its remembered mapping becomes a recipe.
- **`design/ui/object-first-ux/feature-fit/1-data.md`.** Its "merging nodes does not fit" is
  overturned; merging is secondary.
- **`design/designloom/capabilities/`.** `data-import.yaml` no longer refuses a file over 100 MB
  without a way through; `saved-filters.yaml` stores saved filters in the project as rule sets;
  `neighborhood-expansion.yaml` keeps its jobs, and its 500-node warning and 2,000-node block
  become settings the app passes.
- **`design/graph-io/network-sources-design.md`** says "Nothing here is implemented". Most of it has
  landed on `golden`; refresh, removing one load, the persistent source cache and a SPARQL source
  have not.

The framework documents in `design/ui/framework/` stay in force; this document applies them to
data.

## K. The project file decision: column roles and sources

### What the columns member holds

The detail of item 8 of the owner's decision of 2026-10-19 (main document, "Decided by the
owner"):

- Standard keywords carry the type, `format` (date-time, date, duration, uri), `enum`, and
  title and description.
- The graphty vocabulary carries: the column's role; the weight's meaning (distance,
  similarity, capacity, unknown) and whether higher means stronger; the id system (Ensembl
  gene, UniProt, email); the time kind (instant, start, end, duration); precision; the original
  format and time zone, so an export writes the values back as they came; the measurement
  level, including ordered categories; a unit or currency; the missing-value markers seen on
  import; a multi-valued separator; and the keys used to match nodes across graphs or tables.
- Values in the data are stored normalized: ids as strings, numbers as numbers, times as ISO
  8601 in UTC, lists as arrays, blanks as missing.
- A column with no recorded role is inferred on open, as today.
- Node positions stay with the layout, and a file's own colors and sizes stay a style layer;
  neither is a column role.
- Recipes refer to columns by role, so a recipe survives renamed columns. Each column change a
  person makes is also a recipe command, so applying a recipe to new data reproduces the
  types.

### What the columns member records per role

The owner's decision of 2026-10-19 (main document, "Decided by the owner", item 8) gives each
column a JSON Schema description. Per role it records:

| Role                     | Recorded besides type and format                          | Stored as                           |
| ------------------------ | --------------------------------------------------------- | ----------------------------------- |
| node id                  | id system; whether it is a key for matching across graphs | string                              |
| edge source, edge target | id system of the node ids they name                       | string                              |
| edge id                  | id system                                                 | string                              |
| weight                   | meaning; whether higher is stronger; unit                 | number                              |
| time                     | time kind; precision; original format and time zone       | ISO 8601 in UTC; durations ISO 8601 |
| label                    | --                                                        | string                              |
| kind                     | the kinds (`enum`)                                        | string                              |
| category                 | the categories (`enum`); whether they are ordered         | string                              |
| place                    | original format; precision                                | string or number, as its type says  |
| link                     | --                                                        | string, `format: uri`               |
| image                    | --                                                        | string, `format: uri`               |

Any column, with a role or none, can also record a unit or currency, missing-value markers and a
multi-valued separator (stored as an array).

### Why JSON Schema rather than Frictionless Table Schema

Values are already stored normalized, so
Table Schema's rules for parsing raw text are not needed. The document file already uses JSON
Schema, so the whole file has one schema language, and standard validators check embedded data
against it. graphty's own meanings need a vocabulary in either language. A Table Schema that comes
with a CSV (a `datapackage.json` beside it) is read by graph-io at import and mapped into the
columns member; graphty never writes one.

### Sources

- FACT: the document container, its typed members, `requires`, skipped unknown kinds and the closed
  data member (`design/documents/container.md` on `golden`, "Data model", "Reading a file" rules
  8 and 10, "The data member" rules 2 and 3); the container's own schema is JSON Schema draft
  2020-12 (`design/documents/container.schema.json`).
- FACT: network loads are recorded today in the experimental `graphty-sources` member
  (`graphty-element/src/session/projectFile.ts`, line 66) and each element's loads in
  `_source.loads` (`graphty-element/src/session/sources/ids.ts`, line 24).
- FACT: JSON Schema 2020-12 lets a schema declare its own keywords through a vocabulary and a
  meta-schema (https://json-schema.org/draft/2020-12/json-schema-core#section-8.1.2).
- FACT: Frictionless Table Schema describes the columns of a text table, including rules for
  parsing raw values such as missing-value markers and number formats
  (https://specs.frictionlessdata.io/table-schema/). graph-io reads it at import; graphty does not
  write it.

## L. Team decisions in full

The main document lists these in short, under "Decided here".

These are additive, so the team decides them; each lands without the owner's approval.

1. **Column roles gain a node or edge kind and a skip choice by a new field, not by widening
   `ColumnRole`.** `ColumnRole` is a closed union that `DraftColumn.suggested` returns, so a new
   member would break a consumer's exhaustive switch. `DraftColumn` gains a field typed as an open
   union (`ColumnRole` plus `"kind"`, `"skip"` and any string), and the table mapping gains optional
   `kind` and `skip` entries. Widening `ColumnRole` itself can ride in the grouped graphty-element
   major the owner has on hold.
2. **A date is a time measurement with an optional unit and format, not a new kind.** `Measurement`
   is already an open union that includes `"time"`, and optional fields on a measurement
   declaration break nothing. Column types and time roles (requirements 17 and 33) need it now.
3. **The weight meaning "similarity" is accepted beside "strength".** Every input accepts both,
   values read back keep saying `"strength"` so no consumer's switch breaks, and `"strength"` is
   deprecated and replaced in the next planned graphty-element major.
   `design/ui/framework/graph-conventions.md` (line 88) asks for the clearer word.
4. **Ordered filter steps take one kind of step.** The published API has one filter per session
   (`session.visibility.filter`) plus one time window, and no `FilterStep`, so the list of steps is
   a new shape. The team takes decision 25 of `design/ui/framework/one-way-doors.md`: one kind,
   every step bounding every computation. Steps are saved as recipe commands.
5. **Network-source limits default to none in the element and are set by the app**, because the
   right cap depends on the consumer's screen and machine.
