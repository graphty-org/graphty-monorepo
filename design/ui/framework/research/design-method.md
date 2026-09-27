# Design method for the graphty framework documents

This note sets out how to write the four documents that make up the design framework of the
graphty app and of graphty-element (the web component that owns every graph capability):

1. the **ontology and conceptual model** -- what things exist, what can be done to them, how they
   relate;
2. the **vocabulary** -- the one name each of those things goes by;
3. the **design principles** -- the ranked rules that settle design arguments;
4. the **information architecture** (IA) -- where every capability lives in the app.

For each document it gives the established method it is built on, the concrete steps, the
artifacts, the quality checks a reviewer applies, and how the personas and workflows in
`design/designloom/` validate the result without generating features. Every claim cites a source;
section 11 lists them and says which were read in full and which only through an abstract or a
search summary.

---

## 1. Summary of the findings that drive decisions

1. **Build the conceptual model first, and keep it about the task domain.** Johnson and Henderson
   define the conceptual model as the ontology of an application: the objects, operations,
   attributes and relationships of the task domain, with presentation and implementation objects
   (dialog boxes, buffers, databases) deliberately excluded. The UI is designed from it, not the
   other way round. For graphty the task domain is graph analysis, so the primary objects are the
   graph objects the graph-visualization literature already names: graph, node, edge, path,
   connected component, cluster or group (Lee et al. 2006).
2. **Every concept has exactly one purpose.** Daniel Jackson's overloading rule is the precise test
   for the owner's instruction "don't overload the object-first model". A concept that serves two
   purposes (a "view" that is both a saved camera and a filter, a "set" that is both a selection
   and a style) is a design flaw that shows up later as confusing behaviour.
3. **Separate primary from secondary objects by a written test, not by feel.** A primary object
   is something the reader's analytical question is about (a node, an edge, a path, a component).
   A secondary object exists to annotate, present, record or configure primary ones (a note, a
   view, a style layer, a layout, the project). OOUX's objects-before-actions method and the
   nested-object matrix make the relationships explicit, so nesting follows real relationships.
4. **One preferred term per concept, one meaning per term.** Johnson and Henderson name the two
   classic lexicon failures -- several terms for one concept, and one term for several concepts --
   and ANSI/NISO Z39.19 gives the standard remedy: a preferred term, non-preferred synonyms as
   "USE" references, and scope notes that fix meaning. In graphty the non-preferred synonyms
   become command-palette search aliases ("link", "relationship" and "vertex" find edge and node)
   and the scope notes become the text behind the (i) info icons.
5. **The biggest vocabulary risk is collision with Figma, not jargon.** Figma is the paved path for
   the chrome, but several of its core words mean something else in graph analysis: component
   (a reusable design element versus a connected component), group, layer, frame, selection,
   instance, variable. The vocabulary needs an explicit collision table, and where a Figma word
   collides with a standard graph term the graph meaning wins.
6. **Useful principles are ranked, reversible and decide real cases.** A principle passes the
   reversibility test when a reasonable team could hold its opposite ("accessibility even over
   aesthetics" passes; "make it easy to use" fails). The "A even over B" form forces the trade-off.
   A principle set is ranked so that conflicts between principles are settled by order, and every
   principle is shown settling at least one real design argument; one that settles none is cut.
7. **Figma's own published principles are the paved-path starting point.** Figma lists nine
   (powerful, precise, systematic; predictable, biased toward simplicity, natural mental models;
   responsible, detail-oriented, respectful). "Biased toward simplicity" ("the tool will naturally
   bend toward complexity, and we'll have to actively work against that tendency") and
   "predictable" map directly onto the owner's brief. Figma's UI3 write-up also shows the paved
   path is empirical: Figma shipped floating panels and reverted them because they slowed people
   down.
8. **Design for the perpetual intermediate, and inflect the interface.** Cooper's finding is that
   most users plateau at intermediate skill; beginners either climb to it or leave, experts drift
   back to it. The design move is to "inflect" the interface: the most frequent functions in the
   most immediate places, the rare ones deeper. The persona set agrees: 6 of the 12 personas are
   intermediate, 5 expert, 1 novice.
9. **Progressive disclosure has two hard requirements and a two-level ceiling.** Nielsen Norman
   Group: put everything users frequently need up front, make the path to the rest obvious, and
   more than two levels of disclosure usually fails. If a design needs a third level, simplify the
   design instead.
10. **Top tasks decide prominence; tiny tasks get demoted.** McGovern's method finds a "long neck":
    a handful of tasks take a quarter of all votes. Those get the most immediate homes; the long
    tail is reachable (command palette, menus) but never competes for space. With no user vote
    available, the workflows' task phases plus the owner's corrections stand in as the vote;
    section 6.6 does that count.
11. **IA: every capability has one home, and several doors.** Object-based IA (Prater; Dan Brown's
    principle of objects) puts each operation on the object it operates on. Brown's "multiple
    classification" and "front doors" principles allow more than one route in -- the command
    palette is the universal second door -- but there is one canonical home. Brown's "focused
    navigation" (do not mix apples and oranges) means each place in the app has one organizing
    principle. Brown's "growth" means the structure must hold 10 times the current content (the
    algorithms package already has 98+ algorithms).
12. **Shneiderman's mantra is the IA skeleton for a visualization tool.** "Overview first, zoom and
    filter, then details on demand", plus relate, history and extract. It lines up with the
    owner's correction that understanding the whole graph (counts, degree distribution, density)
    is a key task: the overview is the home state, not a feature. "Home state" means the resting
    content of the inspector, not the whole screen: search-first work has an equal claim on the
    resting state, and section 6.5 gives the rule that lets both hold it in different places.
13. **Personas and workflows are tests, not generators.** Use them to run cognitive walkthroughs
    (four questions per step) against the framework. The workflow YAML fields `requires_capabilities`
    and `suggested_components` are feature lists and must not be used as structure. A walkthrough
    failure is fixed by a general mechanism (defaults, undo, (i) icons, the palette), never by a
    persona-specific feature.
14. **Most of this framework is a two-way door; the vocabulary and ontology are not.** Names and
    object kinds that reach graphty-element's session API or the project file are published
    contracts. That is where the owner's decisions belong. Principles and IA are cheap to revise.
15. **An earlier object model in this repository contradicts the brief in instructive ways.**
    `design/ui/object-first-ux/object-model.md` treats nodes and edges as "material, not objects",
    puts datasets, sets, measures, groupings and views as peer rows of one tree, and renames
    betweenness to "Bridges". Each breaks a rule above (domain objects first, one purpose per
    concept, keep standard terms). It is useful as a list of concepts to classify, not as a model.
16. **Cleaning and analysis share one history, and the history records graph states, not bare
    results.** Every tool read that records history at all puts edits to the data in the same
    history as the rest of the work (VisTrails, OpenRefine, Power Query), and the two tools
    that do not keep one coherent history show the cost: Gephi has no undo and silently
    overwrites earlier result columns; Jupyter accumulates hidden state that no longer matches the
    visible cells. VisTrails is the model that fits graphty's branching analysis tree: each node
    of the tree is a complete state reached by an action, and a result belongs to the state it
    was computed on, so it is never wrong -- only "computed on an earlier graph". Section 3.5.
17. **A capability every workflow uses briefly gets a visible entry at depth zero; its full
    working surface appears on demand.** Keyboard-only access is never enough for a top task
    (NN/g: accelerators supplement visible UI; hidden navigation is used about half as often and
    is at least 39% slower on desktop). What is permanently shown is decided by kind: status the
    reader needs to interpret what they see stays visible (visibility of system status); a
    command stays visible as an entry point, not as an open panel. So the whole-graph summary is
    the inspector's resting content, and Find is a visible field whose results replace the left
    panel's list only while in use. Section 6.5.
18. **Whether a derived object follows the data or holds its value is decided by its kind, not
    by the graph's size.** Every reactive tool read (Excel, marimo, Observable, Pluto) follows by
    default and offers a hold for expensive work; Jupyter, which does neither, is the standard
    example of results that look current and are not. For graph analysis, following also does
    harm when the result is unstable under small edits (modularity has exponentially many
    disagreeing near-optimal partitions) or is a layout. So statistics, linear measures, rule
    sets and style layers follow; costly centrality, community detection, paths and layouts
    hold and are marked out of date on the value itself. No study read measures how readers
    notice or interpret a stale mark on a computed value; the adjacent evidence (inline versus
    summary error messages, contextual indicators, the tools' own marks) all points to marking
    the value where it is read and linking a summary line to each mark. Section 3.6.
19. **Among kept objects, only three relationships are containment; everything else is a
    reference.** Tested against the workflows, a relationship is containment only when the child
    has one parent, cannot exist without it, and loses nothing the reader cares about when the
    parent is deleted. That holds for the history (a step follows a step), for a measure and its
    runs (its versions), and for a partition and its groups. "Computed within a set", "kept from a
    run", "a note about", "a view showing" and "a layer painting from" all fail it: they are
    many-to-many or must survive deletion. So the object list is a list grouped by kind with
    reference links, not a tree nested by scope. Section 3.7.
20. **Colour must follow the category, not its position in a sorted list.** d3 and Observable
    Plot assign colours by position (order of first use, or sorted order), so adding or removing
    one category shifts the colour of others; Gephi Lite stores a value-to-colour map and gives a
    new value no colour rather than reshuffling. graphty-element today colours categories by size
    rank, so an edit that swaps two groups' sizes swaps their colours. Inconsistent encodings make
    reading "slow and error-prone" (Qu and Hullman). Named categories need a stored colour per
    value; algorithm partitions, whose raw ids mean nothing, need canonical labels assigned by the
    element (by size first, then matched by overlap on every re-run). Section 3.8.
21. **By task phase, the long neck is Run, the whole-graph summary and reading results.** Coding
    all 139 task phases of the 25 workflows, those three take about 40% of the persona-weighted
    phases; Run alone appears in 17 of 25 workflows. Note plus label is next (about 11%). Find
    and Keep are small by phase share but are entry or hand-off steps. Section 6.6.
22. **A run's scope is a field, not a place.** Of 28 run steps, about 62% run on the whole graph
    and 25% run once per part of something (each community, each time window, each condition);
    only two start from one kept set and two from chosen nodes. A set's inspector can offer "run
    within this set" as a door, but the home is one run dialog with a scope field, and "each
    group of a partition" is a first-class scope, not a later extension. Section 6.6.
23. **Add note needs a global entry; labelling is not a note.** Six of the eleven note-writing
    steps cite several targets, and only one of those could start from one canvas selection; the
    rest mix elements with kept objects (runs, states, sets). So Add note is a toolbar tool (as
    Figma's Comment tool is) that starts from whatever is selected and adds further targets by
    reference, rather than requiring a multi-selection that mixes canvas elements and list rows.
    Classifying elements ("error, threat or discovery") and naming groups are attribute edits on
    the selection or the group, not notes. Section 6.6.

---

## 2. The order of work, and why

Johnson and Henderson's title states the order: "begin by designing what to design". The
conceptual model comes before any screen, and the vocabulary is built from it. Principles and IA
depend on both.

| Step | Document                                       | Depends on                                      | Why this order                                                                                                                     |
| ---- | ---------------------------------------------- | ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| 0    | Top tasks (an input, not a framework document) | owner's brief and corrections, workflows        | Prominence decisions in IA need a ranked task list; the ontology needs the nouns the tasks use                                     |
| 1    | Ontology and conceptual model                  | top tasks, graph literature, element API        | Everything else names, arranges or ranks these objects                                                                             |
| 2    | Vocabulary                                     | ontology                                        | A term needs a concept to point at; Johnson and Henderson derive the lexicon from the model                                        |
| 3    | Principles (draft early, rank late)            | brief, research, conflicts met in steps 1, 2, 4 | Spool: principles that emerge from the work guide future work and move teams toward agreement; generic ones do not decide anything |
| 4    | Information architecture                       | ontology, vocabulary, top tasks, principles     | Rosenfeld, Morville and Arango's labeling and organization systems need both the objects and their names                           |
| 5    | Validation pass                                | all four                                        | Workflow walkthroughs and persona checks, then revise any document                                                                 |

Draft the principles at step 1 as hypotheses, because the first arguments about the ontology are
where they are needed; rank and finalize them after the IA, because only then are the real
conflicts known. Revisit earlier documents whenever a later one exposes a flaw: Johnson and
Henderson note that problems discovered in UI design prompt refinement of the model.

---

## 3. The ontology and conceptual model

### 3.1 What the method is

- **Conceptual model (Johnson and Henderson).** "The model of the application that the designers
  want users to understand." It contains the user-visible object types, their attributes, the
  operations on them, and their relationships, organized in a type hierarchy (subtypes inherit
  operations) and a containment hierarchy (some objects contain others). It excludes purely
  presentational and purely implementational objects. It is the source of the product vocabulary
  and of task-level scenarios used to check it.
- **Norman's three models.** The designer's model, the system image (everything the product shows)
  and the user's model. The designer reaches the user only through the system image, so the
  conceptual model has to be visible in the UI's structure, not only in documentation.
- **Concept design (Daniel Jackson).** A concept is a reusable unit of behaviour with one purpose
  and an operational principle: a short "if you do this, then that happens, which fulfils the
  purpose" story. Rules: one purpose per concept (overloading is a flaw), concepts independent of
  each other, and reuse familiar concepts rather than inventing new ones. Jackson also argues,
  against Norman, that in software the concept IS the behaviour, not a psychological picture of
  it: relabelling cannot fix a concept whose behaviour is wrong. For graphty this means the
  ontology is also a statement about graphty-element's behaviour, and a flaw found here is an
  element defect.
- **OOUX and ORCA (Sophia Prater).** Objects before actions. ORCA runs four passes -- Objects,
  Relationships, Calls to action, Attributes -- producing an object guide, a nested-object matrix
  (every object on both axes, relationships in the cells), a CTA matrix (objects by user role,
  actions in the cells) and an object map (attributes, marked core content or metadata). Nesting
  defines contextual navigation: reach content through related content.
- **OVID (IBM, Roberts, Berry, Isensee, Mullaly).** Objects, Views, Interaction Design: model the
  objects the user is aware of, then the views of each object, then the interactions. Its value
  here is the explicit separation of an object from its views, which is exactly the owner's
  instruction that views are not primary objects.
- **Established graph ontologies to steal from.** The graph-visualization task taxonomy of Lee,
  Plaisant, Parr, Fekete and Henry defines graph-specific objects (node, link, path, graph,
  connected component, cluster or group) and expresses complex tasks as low-level tasks on those
  objects. The Neo4j property-graph model defines node, label (a named subset a node belongs to),
  relationship (exactly one type, one direction) and property (key-value pairs on nodes and
  relationships). Cytoscape and Gephi supply the working analyst's terms for styles, attribute
  tables, groups and network views (the vocabulary track should read their manuals directly; this
  note did not).

### 3.2 Steps

1. **Noun foraging.** From the workflows' "Task Phases", "Decision Points" and "Information
   Needs" (not from `requires_capabilities`), from the top tasks and from graphty-element's session
   API, list every noun. Prater calls this the discovery pass.
2. **Classify each noun** into one of five bins, with the test written next to it:
    - _primary graph object_ -- the reader's question is about it, and it exists in graph theory
      (Lee et al., Neo4j). Candidates: graph, node, edge, path, connected component, community or
      cluster, group, subgraph or set of elements;
    - _attribute_ -- a value on an object (a degree, a PageRank score, an imported column). A
      computed measure is an attribute of each node it scores, plus a distribution that belongs to
      the graph; test whether it is an object in its own right by asking whether the reader
      operates on it independently of the nodes;
    - _secondary object_ -- exists to annotate, present, record or configure primary objects: note,
      view (camera and mode), style layer, layout, analysis result record, project;
    - _presentation or implementation_ -- excluded from the model (panel, dialog, worker, buffer);
    - _synonym_ -- the same concept as another noun; merge and send to the vocabulary as a
      non-preferred term.
3. **Write each concept as a Jackson concept card:** name (provisional), purpose (one sentence),
   state it holds, actions, operational principle, and which graphty-element API owns it. A card
   with two purposes is split. A card with no element owner is an element gap to record, not an
   app object.
4. **Build the nested-object matrix** for primary and secondary objects. Each cell answers "can an
   X contain or reference a Y, and what is the relationship called?" (a path contains nodes and
   edges; a note annotates any object; a view shows a graph). Empty rows reveal orphans; rows that
   reference everything reveal a god object. Section 3.7 builds this matrix from the workflows
   and gives the test that separates containment from reference.
5. **Build the CTA matrix by object and task, not by role.** ORCA uses user roles as the second
   axis. The owner rules out persona-specific features, so replace roles with top tasks: the cells
   are the operations each task needs on each object. Operations shared across objects (rename,
   hide, delete, note, export) become the universal verbs, which is where the model's
   simplification comes from (Johnson and Henderson: shared operations simplify the UI).
6. **Attributes pass.** For each object list its core content and metadata, marking which
   attributes are computed, imported or user-set, and which are sortable or filterable. This is the
   input to the inspector and to filters in the IA.
7. **Write the operational principles as scenarios** and run the top tasks through them in model
   terms only (no screens). A task that cannot be told in the model's words exposes a missing
   concept.

### 3.3 Artifacts

- Object catalogue: one concept card per object, grouped primary, secondary, attribute kinds.
- Type hierarchy and containment hierarchy (text diagrams, ASCII only).
- Nested-object matrix.
- Object-by-task operation matrix, with the universal verbs listed separately.
- Mapping table from each concept to the graphty-element API that owns it, with gaps listed.
- Task scenarios in model terms.

### 3.4 Quality checks

- Every object passes the one-purpose test (Jackson). Name the purpose in one sentence without
  "and".
- No presentation or implementation object appears (Johnson and Henderson).
- Every primary object has a counterpart in an established graph ontology (Lee et al., Neo4j,
  Cytoscape, Gephi, NetworkX), or the document says why graphty needs a new one. Jackson: reuse
  familiar concepts.
- Secondary objects are never peers of primary objects in the same list or tree without a written
  reason. A note or a view that sits beside a path as a sibling fails.
- Every object and operation maps to graphty-element (CLAUDE.md, Architectural Principles). An
  app-only concept is allowed only for the reader's own preferences.
- Each top task can be narrated as operations on objects in the model.
- The model states what persists in the project file, since that becomes a published format.

### 3.5 History: what a node of the analysis tree is, and where cleaning goes

graphty-element owns a branching tree of the analysis, and the project file saves it. Before the
ontology can define that tree, it has to answer two questions: does a node of the tree record a
result or a whole graph state, and do edits to the data itself (merging two nodes that are the
same entity, deleting isolated nodes, joining an attribute table) belong to the same history as
running algorithms?

**What the tools do.**

| Tool                       | Are data edits in the same history as analysis?                                                                                                                                                              | What happens to earlier results                                                                                                                                                                                                                                                                                            |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| VisTrails                  | Yes. Its change-based model "uniformly captures both changes to parameter values and to workflow definitions"; each tree node is a workflow version and each edge the actions that produced it               | Nothing is lost: users can "undo changes but not lose any results". A result belongs to a version and is re-derived from it; intermediate results are cached so shared sub-structures are not recomputed                                                                                                                   |
| OpenRefine (data cleaning) | The history IS the data edits: "Any activity that changes the data can be undone", saved with the project; operations can be extracted as JSON and replayed. Facets and view settings are not in the history | Linear, not branching: after undoing, a new operation erases the later steps "and cannot be re-applied"                                                                                                                                                                                                                    |
| Power Query                | Cleaning steps form the "Applied steps" list; "selecting any step displays the results of that particular step"                                                                                              | Steps can be edited, inserted, moved or deleted in place, and the record is the recipe, not stored copies of results; the page read does not describe what happens to a later step an edit breaks                                                                                                                          |
| Tableau Desktop            | One workbook-wide undo: "an unlimited number of times, back to the last time you opened the workbook, even after you have saved"                                                                             | Session-scoped and linear; the page read does not say how data source edits interact with it                                                                                                                                                                                                                               |
| Jupyter                    | Cells are the visible recipe, but execution state is separate: hidden state "accumulates in a way that is not necessarily correlated with the notebook's visible code" (Macke et al.)                        | Outputs go stale silently; research tools (nbsafety) exist only to detect which cells need re-running                                                                                                                                                                                                                      |
| Gephi                      | No history. Undo "isn't available. This is the most requested feature" (Gephi FAQ). Data Laboratory edits such as merging nodes mutate the graph in place                                                    | Re-running a statistic overwrites its column, so the FAQ tells users to duplicate the column first. Branching is done by hand, by exporting a filtered graph to a new workspace (graph-tools.md, Gephi)                                                                                                                    |
| Cytoscape                  | Undo and redo cover table edits, network edits and layout, for "the last 10 tasks"                                                                                                                           | A network derived from a selection becomes a new network shown under the one it came from, with "network provenance history" in the Network panel. Read together: structural derivation is a kept branch, in-place edits are short-lived undo steps. Whether analyzer columns are refreshed after a deletion was not found |

**What this means for graphty** (recommendation):

1. **One history for cleaning and analysis.** Every tool that keeps a coherent history puts data
   edits in it, and the two that do not (Gephi, Jupyter) are the standard examples of lost and
   untrustworthy results. A merge, a deletion of isolates or a table join changes what every
   later result means, so it must be a step the tree can show and the reader can go back past.
2. **A tree node is a graph state reached by an action, not a bare result.** This is VisTrails'
   model, and it is the only one that makes a branching tree coherent once the data can change:
   a result is attached to the state it was computed on, so its provenance (algorithm,
   parameters, subgraph) is complete by construction. It agrees with graph-analysis.md, which
   says results are attributes on graph objects plus provenance, not a separate result object:
   the tree records states, and the attributes live on the objects of each state.
3. **A result computed on an earlier state is kept as it was, and says so.** It is never
   silently left out of date (Jupyter's failure: the output stays on screen after its inputs
   change, with nothing to say so) and never silently overwritten (Gephi's). Two cases, set out
   in full in section 3.6:
    - results that **follow** the data -- deterministic, cheap and stable readings (counts,
      density, degree, connected components) -- are recomputed for the current state and cached;
      graph-analysis.md already classifies the graph-level ones as transient;
    - results that **hold** their value -- anything randomized or unstable under small edits,
      superlinear in cost, or a layout -- stay attached to their state, are marked "out of date"
      wherever they are shown, and offer re-run as an action that creates a new step.
      Being referenced by a note, a style layer or a view does not by itself make a result hold:
      a note pins its own copy of what it was about, and a style layer is a live rule that should
      follow whatever its input does (section 3.6).
      This settles the "stale" and "frozen" states listed in graphty-today.md: they are the same
      fact seen from two sides, so the ontology should define one attribute of a result (the state
      it was computed on) and derive the label from it, rather than two independent statuses.
4. **Undo walks the current branch; a new action after undo starts a branch.** OpenRefine's
   erase-on-new-action loses work; VisTrails keeps it. Undo itself stays silent with no visible
   list, as in Figma.
5. **Two granularities, one mechanism.** graph-analysis.md calls the undo stack session-scoped
   and the branching tree kept; figma.md says history lives off the working screen. Both hold if
   the two are distinguished by what they record: every step that changes the graph or its
   results (load, clean, run, derive a subgraph) is a tree node and also an undo step; edits
   that change only presentation or annotation (a style tweak, a rename, a note's text, the
   camera) are undo steps only. Heer and Shneiderman's point that histories are "much more
   valuable when they record high-level semantic actions" is the reason for the split. Figma's
   "off the working screen" applies to undo and to file versions; the analysis tree is where
   results live, so it is a place in the app, not a hidden history.
6. **Selection and view state are not history.** OpenRefine keeps facets out of its history;
   selection, filters that are not steps, and the camera are working state.

**One-way door.** What a tree node is (a state, with results attached) is the shape of the
project file, so this is an owner decision. Everything about how the tree is displayed is not.

### 3.6 Liveness: which derived objects follow the data, and which hold their value

A **derived object** is anything graphty-element computes from the data rather than receiving
it: a statistic, an algorithm result, a query-defined set, a filter, a style layer's painted
values, a layout's positions. When the data changes (an edit, a merge, a deletion, a reload, a
weight change) each derived object must do one of two things:

- **follow** -- recompute for the new data, so what is shown is always true of the graph now;
- **hold** -- keep the value it had, say that it is out of date, and wait for the reader to
  re-run it.

This is published behaviour of the element (it decides what a consumer sees after
`data.add`), and it fixes the set of states the vocabulary must name. It is a one-way door.

**What the tools do.**

| Tool       | Default                                                                                                                                                             | How the other behaviour is reached                                                                                                                                                                                                                                                                                                            | What an out-of-date value looks like                                                                                                                                                                                                                                                                     |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Excel      | Follow: automatic mode recalculates "all dependent formulas every time you make a change to a value, formula, or name"                                              | Manual mode, "for very large workbooks" where "recalculation time might be so long that users must limit when this happens"; and "Automatic except for data tables", which holds one expensive KIND of object while everything else follows                                                                                                   | A single word, "Calculate", in the status bar. Internally every direct and indirect dependent of a change is marked dirty ("if B1 depends on A1, and C1 depends on B1, when A1 is changed, both B1 and C1 are marked as dirty"). Manual mode switches on "Recalculate workbook before saving" by default |
| marimo     | Follow ("autorun"): running a cell re-runs every cell that reads its variables                                                                                      | "Lazy": running a cell "marks affected cells as stale but doesn't automatically run them"; the documented reason is expensive cells "which may call APIs or take a long time to run". Running a cell whose ancestors are stale runs the ancestors first, "to make sure your cell doesn't use stale inputs"; one command runs every stale cell | Stale cells are marked; the page read does not describe the mark. Deleting a cell removes its variables, and cells that read them are re-run or marked stale                                                                                                                                             |
| Observable | Follow: "code re-runs automatically when referenced variables change", in dependency order, and "only the code blocks that are downstream of changed variables run" | The gate is on the INPUT, not the result: an input's _submit_ option makes it "wait until a button is clicked" when "the input will trigger an expensive computation or remote API"                                                                                                                                                           | A dependent waits for its input to finish "preventing referencing code blocks from seeing partially-initialized state": no half-computed value is ever shown as current                                                                                                                                  |
| Pluto      | Follow: "will re-run a cell when a dependency changes"; "at any instant, the program state is completely described by the code you see"                             | Not described on the page read                                                                                                                                                                                                                                                                                                                | None; nothing can be out of date                                                                                                                                                                                                                                                                         |
| Jupyter    | Neither: nothing re-runs and nothing is marked                                                                                                                      | Re-run by hand                                                                                                                                                                                                                                                                                                                                | Nothing. Outputs and hidden state drift from the visible code (Macke et al.); in 666 real sessions, the cells a lineage tracker flagged as needing re-execution were the ones users chose to re-run about 7 times more often than chance                                                                 |
| Gephi Lite | Follow for appearance: styling is a rule, so when data changes the appearance updates "instantly" (graph-tools.md)                                                  | --                                                                                                                                                                                                                                                                                                                                            | --                                                                                                                                                                                                                                                                                                       |
| Kumu       | Community detection holds; a re-run "uses existing communities to seed the algorithm", keeping them stable, unless the user discards them (graph-tools.md)          | --                                                                                                                                                                                                                                                                                                                                            | --                                                                                                                                                                                                                                                                                                       |

Lau, Drosos, Markel and Guo's survey of 60 notebook systems states the trade-off directly:
reactive execution keeps "a predictable (albeit non-linear) execution order" but "can be hard
for novices since it is not clear which cells execute when a particular one is edited", and
automatic liveness has the same cost: "it may not be clear what code executes if the user does
not initiate those actions". The opposite, manual any-order execution, is by the earlier reports
they cite "a major source of frustration" because "it is hard to tell which exact series of cell executions
led to the notebook's current state".

**When following does harm.** The sources give four cases, and a fifth follows from graph
analysis itself:

1. **Cost.** Every tool that follows by default provides an escape for expensive work: Excel's
   manual mode and its data-table exception, marimo's lazy mode, Observable's submit gate. An
   edit that silently starts a betweenness run on a large graph blocks the reader for a
   computation they did not ask for.
2. **Instability.** Good, de Montjoye and Clauset show that modularity "typically admits an
   exponential number of distinct high-scoring solutions" that "can fundamentally disagree on
   ... the composition of the largest modules", so the output "should be interpreted cautiously".
   A community run that follows a one-node edit can return a differently shaped partition, and
   every set, note and colour that meant "community 3" now means something else. This holds even
   for graphty's Louvain, which has no random draw (graphty-today.md, reproducibility table):
   its result depends on node order, and an edit changes node order. Kumu's answer, seeding the
   re-run from the previous result, is itself a held re-run, not a following one.
3. **Invisible execution.** Lau et al.'s hidden-dependency cost: when things re-run on their
   own, the reader cannot tell what ran. For a result that matters as evidence, "why did this
   number change?" must have an answer the reader caused.
4. **Loss of orientation.** Recomputing a force layout moves every node. Archambault and Purchase
   report that preserving the mental map helps user orientation in dynamic graphs (known by
   title only); their earlier controlled study found that preserving it "had little influence in
   terms of error rate and response time" on graph-comprehension tasks. Read together: positions
   that jump do not make answers wrong, but they cost the reader their place.
5. **A claim about a value.** A note that says "these twelve accounts are the ring" is about the
   value at the time it was written (graph-analysis.md section 6.2, the W3C annotation State).
   This is a reason for the NOTE to hold a copy, not for the result to hold: see the rule below.

**When holding does harm.** Holding is safe only if the mark is where the value is read.

- Jupyter shows what an unmarked stale value costs: results that look current and are not.
- Excel's manual mode marks staleness in one place only, the status bar, away from the cells;
  a reader looking at a number cannot tell from the number. Excel compensates by recalculating
  before save, so the file at least does not carry the problem forward.
- A mark that fires when nothing relevant changed teaches readers to ignore it. The nbsafety
  result above is evidence that PRECISE flags match what people want to re-run; no source read
  here measured imprecise ones, so this last point is reasoning, not a finding.

**Evidence on where the mark is noticed.** No study read here measures whether readers notice a
stale mark on a computed value, or compares a mark on the value with one in a summary line; the
one provenance-in-notebooks tool read (Loops, Eckelt et al., abstract only) visualizes "the
impact of changes" but reports use cases and feedback, not a measure of noticing. The nearest
evidence is from neighbouring problems, and it agrees:

| Source                                                | What it shows                                                                                                                                                                                                                            | How close to graphty's question                                                        |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| marimo (source, `Output.tsx` and `Cell.css`)          | The mark is on the output itself: a stale output is drawn at 80% opacity and 50% greyscale with the hover title "This output is stale"; each stale cell also gets a yellow run button, and one global "run stale" control has a shortcut | A tool's design, not a measurement; marks both the value and a global action           |
| Tableau Desktop, paused auto updates                  | "the view is desaturated and invalid commands are disabled"; Run Update on the toolbar or F9                                                                                                                                             | Same shape: the mark is on the picture, the action is global                           |
| Excel, manual calculation                             | The only mark is "Calculate" in the status bar, away from the cells (section 3.6 table)                                                                                                                                                  | The counter-example: a reader looking at a number cannot tell                          |
| NN/g, indicators                                      | Indicators "should be shown in close proximity to that element"; a cart message at the top of the page, far from the button, was missed and users added items several times; "passive notifications can easily be missed"                | Guidance with an observed failure of a distant status message                          |
| NN/g, error messages                                  | "Display the error message close to the error's source"; "Proximity helps users associate the error message content with the interface elements needing attention"                                                                       | Guidance                                                                               |
| Wroblewski, inline validation study (22 participants) | Inline messages against messages after submit: "a 22% increase in success rates", "a 22% decrease in errors made", "a 42% decrease in completion times", "a 47% decrease in the number of eye fixations"                                 | Measured, but it compares timing and place together, and forms are not computed values |
| GOV.UK Design System, error summary                   | A summary at the top is always paired with a message at each field; each summary item links to its field; the wording must match exactly                                                                                                 | A tested pattern for "one aggregate line plus a mark on each item"                     |
| Macke et al. (section 3.6)                            | Cells a precise lineage tracker flagged were re-run about 7 times more often than chance                                                                                                                                                 | Readers act on precise, local flags                                                    |

**What this settles.** The evidence supports the placement rule below and adds three details:
the summary line must link to each out-of-date value (GOV.UK); the mark must use the same words
in both places; and the mark must not rely on colour or dimming alone. marimo and Tableau can
desaturate their outputs because the output's colour is not the data; in graphty, colour on the
canvas usually IS the data (a community or a centrality ramp), and desaturating it would change
what the reader reads. So the mark is a symbol plus words on the rows where the value is read,
and the canvas is left as painted. Whether readers notice and correctly interpret the mark on a
legend row remains untested, and the first usability test of this policy should still ask it.

**The rule** (recommendation). Liveness is a property of the KIND of derived object, fixed in
graphty-element's catalogue, not a runtime decision from the size of the graph. Excel's
"automatic except data tables" is the precedent: one expensive kind holds, everything else
follows, and the reader can predict which is which. Deciding by estimated cost instead would
make the same betweenness run follow on a 50-node graph and hold on a 50,000-node one -- the
reader cannot predict it, and instability (harm 2) does not depend on size at all.

| Derived object                                                                                                                                                                | Follows or holds   | Why                                                                                                                                                          |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Graph statistics (counts, density, component count and sizes, degree distribution, attribute completeness)                                                                    | follows            | Deterministic, linear, unique answer; a stale count is worse than useless                                                                                    |
| Linear per-element measures: degree, in and out degree, connected-component membership                                                                                        | follows            | Deterministic and the answer is unique; component NUMBERS may change, so anything that needs "component 3" keeps a fixed set (graph-analysis.md section 6.2) |
| Query-defined sets and filters over attributes                                                                                                                                | follows            | A rule the reader wrote; graph-analysis.md section 6.2 already says a rule set re-evaluates when cheap                                                       |
| Style layers                                                                                                                                                                  | follows its inputs | A live rule (graph-tools.md); it repaints from whatever its inputs hold now, including a held result's held values                                           |
| Centrality needing all pairs or iteration (betweenness, closeness, PageRank, eigenvector, Katz, HITS), costly graph measures (clustering coefficient, diameter, path lengths) | holds              | Superlinear or iterative with a convergence limit; cost harm                                                                                                 |
| Community detection, label propagation, randomized cuts                                                                                                                       | holds              | Unstable under small edits even when seeded; instability harm                                                                                                |
| Paths between chosen nodes                                                                                                                                                    | holds              | A path is usually evidence, and ties make "the" shortest path change with node order                                                                         |
| Layout positions                                                                                                                                                              | holds              | Orientation harm; force layouts are not reproducible                                                                                                         |
| Notes, fixed sets, sets kept from a result                                                                                                                                    | never derived      | They store their own members or snapshot (graph-analysis.md section 6.2), so they never go out of date; they can only have missing members                   |

Four supporting rules:

1. **Out of date means an input changed, all inputs, transitively.** Excel dirties every direct
   and indirect dependent. graphty-element today derives staleness from node and edge ids only,
   so a weight or attribute edit leaves a weighted betweenness run looking current, and a filter
   change flags a run stale that did not depend on the filter (graphty-today.md sections 7.1 and
   7.7). Both are element defects under this rule: the mark must fire exactly when an input the
   definition reads has changed, and a held result computed from another held result is out of
   date when that one is.
2. **A following object never shows a half-computed value as current.** While it recomputes it
   keeps its previous value marked "computing" (Observable's rule). A following object whose
   recomputation exceeds the element's time budget on this graph shows the old value marked out
   of date with the reason, rather than blocking; this is an exception with a visible cause, not
   a second policy.
3. **Re-running a held object refreshes its out-of-date inputs first** (marimo's rule), and one
   command updates everything out of date (marimo's run-all-stale, Excel's F9). Each re-run is a
   step in the analysis tree (section 3.5), so the earlier value is not lost.
4. **Saving does not recompute.** Unlike Excel's recalculate-before-save, the project file
   stores a held result with its out-of-date mark, because re-running a community detection on
   save would silently change it. Following objects need not be stored beyond a cache.

**States the vocabulary must name.** Five, and no more: _current_; _computing_ (a new value is
on its way; the old one is shown); _out of date_ (held objects only, with what changed: "ran on
34 nodes, now 40", "weights changed"); _cannot update_ (an input the definition names is gone,
the "frozen" state of graph-analysis.md section 6.2); _failed_. Following objects use only
current, computing and failed in normal work. This agrees with section 3.5's point that "stale"
and "frozen" are derived from the state a result was computed on, not stored as independent
statuses.

**Where the mark lives** (the IA consequence). The out-of-date mark is status in the sense of
section 6.5, so it is shown on the value wherever the value is read -- the result's row, the
inspector field, the legend of a style layer painting it -- never only in a distant indicator
(Excel's weakness). The whole-graph summary, the inspector's resting content, carries one
aggregate line ("3 results out of date") whose action is "update all". That is one home for the
state (on the object) and one door to the bulk action (the summary), not two homes. Following
the GOV.UK pattern, the aggregate line expands to name each out-of-date result, each name selects
that result, and the reason text ("weights changed") is word for word the text on the value.
The legend row counts as a place where the value is read: a reader decoding a colour reads the
legend, not the result row, so a legend painting from an out-of-date result carries the mark.
The canvas itself is not dimmed or desaturated, because its colour is the data.

**Contradictions with the other notes, resolved.**

- graph-analysis.md section 6.2 says "re-evaluate immediately when cheap, mark stale when not",
  with the cost rule in the element. This note keeps the rule for rule sets but moves the
  decision from runtime cost to object kind, for predictability and because instability is not
  a cost; runtime cost remains only as the visible exception in supporting rule 2.
- Section 3.5 of this note listed "referenced by a note, a style layer or a view" as a reason
  to hold. That is withdrawn: the note holds its own snapshot and the style layer is a live rule,
  so a reference never forces the thing referred to to hold.
- Section 3.5 attributed "silently recomputed" to Jupyter. Jupyter never recomputes; its failure
  is silent staleness, and the text now says so.
- graph-analysis.md section 5.2 lists algorithm results as "kept, as values and as a recipe" and
  allows "cheap deterministic results" as recipe only. The follow list above is exactly that
  exception, now named by kind.

### 3.7 The nesting matrix: which relationships are containment, which are references

The analysis tree that graphty-element owns will become the shape of the project file. Before
that happens, each relationship between kept objects has to be classified as containment (the
child lives inside the parent) or reference (one object points at another). Figma draws only
containment in its layer tree and shows every other relationship as a property row in the
inspector (`figma.md` section 2.2); graphty needs the same split, and needs to know which
relationships fall on which side.

**The test.** A relationship is containment only if all three hold: (a) the child has exactly
one parent of that kind; (b) the child cannot exist without the parent; (c) deleting the parent
may delete the child without losing anything the reader would want kept. This is Johnson and
Henderson's containment hierarchy made operational, and it is also the rule the file format
needs: a contained object is stored inside its parent, a referenced one is stored once and
pointed at by id.

**The kept objects.** A **step** is one entry in the history (a load, a cleaning edit, a run, a
derive; section 3.5). A **measure** is the named result the reader paints and cites, whose runs
are its versions (graph-analysis.md section 6.13). A **partition** is a measure whose value puts
each node in a group (a community detection, connected components); its **groups** are those
classes. A **set** is a kept, named subset, fixed (stored members) or rule (a stored query). A
**note**, a **view** and a **style layer** are the secondary objects of section 3.2.

**The matrix, from workflow evidence.** Workflows are cited by title.

| Relationship                                         | Workflow evidence                                                                                                                                                                                                                                                                                                        | Cardinality                                                                                       | Must survive deleting the other?                                                 | Kind                                                                                    |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| A step follows a step                                | every workflow; "delete dead ends" (Reproducible Session); "make it the working network" (Gene List to Interaction Network); merge (Condition Comparison)                                                                                                                                                                | one predecessor; several successors if history branches                                           | no: pruning a dead end removes what came after it                                | **containment**                                                                         |
| A measure holds its runs (versions)                  | "adjust approach" (Iterative Analysis Cycle); "refine query" (Threat Hunting); slide the cutoffs and re-run (Enrichment Map); MCL inflation 2 to 4 (Cluster and Functionally Annotate)                                                                                                                                   | each run belongs to one measure                                                                   | no: the versions exist only as that measure's history                            | **containment**                                                                         |
| A partition holds its groups                         | communities (Community Analysis); clusters (Cluster and Functionally Annotate); themes (Enrichment Map)                                                                                                                                                                                                                  | each group belongs to one partition                                                               | no: a re-run replaces the groups                                                 | **containment**                                                                         |
| A run computed within a scope                        | the disease module (Drug Target Discovery); the ring (Fraud Ring Investigation, risk scoring); each community (Community Analysis, characterization); the selected cluster (Cluster and Functionally Annotate); each time window (Network Evolution Analysis); each condition (Condition Comparison)                     | a run has one scope; a scope serves many runs; a per-group run names one partition, not N parents | yes: the run keeps the members it ran on and shows "cannot update" (section 3.6) | reference                                                                               |
| A set kept from a run                                | the ring (Fraud Ring Investigation); rank and select (Influencer Identification); triage (Anomaly Detection); drop small clusters (Cluster and Functionally Annotate); the largest component (Gene List to Interaction Network); the intersection of top-10 lists "across methods" (Hub Gene Identification and Ranking) | a set has zero, one or SEVERAL origins                                                            | yes: a fixed set stores its members                                              | reference                                                                               |
| A run reads another run                              | bridge nodes between communities (Community Analysis); a custom score from several rankings (Hub Gene Identification and Ranking); a difference score from two conditions (Condition Comparison)                                                                                                                         | many to many                                                                                      | yes, with "out of date" propagating (section 3.6, rule 1)                        | reference                                                                               |
| A note about a target                                | the ring (Fraud Ring Investigation, determination); a query that found nothing (Threat Hunting); an evidence chain (Fraud Ring Investigation); an evidence summary (Iterative Analysis Cycle)                                                                                                                            | a note has zero or more targets of any kind; a target has many notes                              | yes: the note keeps its stored copy (graph-analysis.md section 6.7)              | reference                                                                               |
| A view showing a set or filter                       | "filter to relevant subset" (Findings Communication); one view per condition (Condition Comparison); collapsed themes for the summary figure (Enrichment Map)                                                                                                                                                            | many to many                                                                                      | yes: a view with its set gone says so                                            | reference                                                                               |
| A style layer painting from a measure, set or column | encode logFC (Gene List to Interaction Network); encode the combined score (Hub Gene Identification and Ranking); colour clusters (Cluster and Functionally Annotate); the three-state edge legend (Condition Comparison)                                                                                                | one input per layer; an input feeds many layers                                                   | yes: the layer keeps its last paint and says its input is gone                   | reference                                                                               |
| A set inside a set                                   | candidates within the module (Drug Target Discovery); top N within the largest component (Hub Gene Identification and Ranking); the ring within the neighbourhood (Fraud Ring Investigation)                                                                                                                             | many to many; membership overlaps                                                                 | yes                                                                              | reference, and only implied by the scope and origin links above; no workflow acts on it |

**What this means for graphty** (recommendation):

1. **Three containments, everything else a reference.** The history, a measure's versions and a
   partition's groups are containment. Every relationship among sets, measures, notes, views and
   style layers is a reference, because each is many-to-many or must survive deleting the other.
   The two decisive cases are a set with several origins (an intersection of top-10 lists cannot
   sit under one run) and a per-group run (it has one scope, a partition, not fifteen parents).
2. **The object list is a grouped list, not a tree of objects nested by scope.** Its groups are
   by kind (sets, measures, notes, views, style layers), which is also what every graph tool
   read does (`graph-tools.md` section 20.14: "No tool mixes kept subsets, results and styles in
   one list"). A partition's groups appear as a table in the partition's inspector
   (graph-analysis.md section 6.8), and a measure's versions as its history in its inspector;
   neither is a list row. The only indented structure left is the history, if the owner decides
   it branches (section 3.5).
3. **References are drawn from the referring side, as Figma does.** Each reference is a property
   row in the inspector of the object that holds it -- "Computed within: Largest component",
   "Kept from: Betweenness, PageRank", "About: Ring A, 3 accounts", "Shows: Tumor only",
   "Paints from: Louvain" -- and the row selects its target. The reverse direction is one "Used
   by" section in the target's inspector, which is also what deleting it would affect.
4. **Deleting a referenced object never deletes what refers to it.** The referring object keeps
   its stored copy and shows the state section 3.6 names ("cannot update"). Only deleting a
   container deletes its contents, and the delete confirmation names the count.
5. **In the project file**, a contained object is stored inside its container; a reference is
   an id plus whatever the referring object needs to stand alone (the scope's resolved members
   for a run, the origin ids and labels for a set, the stored members for a note). This is a
   one-way door (section 8).

**Contradictions with the other notes, resolved.**

- `design/ui/object-first-ux/object-model.md` section 6.1 nests an object under the object it
  was "computed within", drags are confined to the parent, and deleting a parent deletes its
  children. That fails tests (a) and (c): a scope serves many runs and per-group runs, the run
  must survive its scope, and cascading delete would destroy evidence when a helper set is
  removed. Scope is kept as a reference field ("Computed within"), which is also that document's
  own escape hatch for re-scoping.
- `graphty-today.md` section 7.16 describes the element's designed tree as "a tree of objects
  nested by scope". Under this matrix that is the part to change before it reaches the file
  format; the history is the only tree.
- `graph-tools.md` section 20.14 already recommends "computed within" and "kept from" as
  references drawn as a secondary line or link; this section agrees and gives the test and the
  full set of relationships behind it.
- graph-analysis.md section 6.13 gives a measure "an identity above the run" with its runs as
  versions. That is the second containment above; a history step that produced a run refers to
  it, so a run has one container (its measure), not two.

### 3.8 Stable category colours when a partition or a category recomputes

When a community detection is re-run, or a following partition such as connected components
recomputes after an edit, or an imported category gains a value, the colours on the canvas
either stay with the categories or shuffle. Shuffling means a reader who learned "the blue
group" is now reading a different group in blue, and every note, legend screenshot and
exported figure disagrees with the screen. The question is whether graphty-element must give
partitions canonical labels and assign palette colours stably.

**What the tools do.**

| Tool                                                                                                   | How a category gets its colour                                                                                                                                                                                                                                                                                                                                  | What happens when categories change                                                                                                                                                                                                                                                                                                      |
| ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| d3 ordinal scale (the base of most web charts)                                                         | "the value is implicitly added to the domain and the next-available value in the range is assigned", so colour follows order of first use                                                                                                                                                                                                                       | Stable for the life of one scale; a new scale built after a recompute assigns by the new order of arrival                                                                                                                                                                                                                                |
| Observable Plot                                                                                        | "For ordinal scales, the default domain is the set of all distinct values associated with the scale in natural ascending order"; the page read does not state the assignment rule, but the d3 ordinal scale it builds on maps "the first element in domain ... to the first element in the range, the second domain value to the second range value, and so on" | A value added or removed shifts the colour of every value sorted after it; the documented remedy is an explicit **domain**                                                                                                                                                                                                               |
| Tableau Desktop                                                                                        | "Tableau uses a categorical palette and assigns a color to each value of the field"                                                                                                                                                                                                                                                                             | The pages read do not say whether assignments persist when members appear or disappear; not established here                                                                                                                                                                                                                             |
| Gephi Lite (source, `useColorHistoric.ts`, `appearance/index.ts`, `color/utils.ts`)                    | A stored map from value to colour per attribute, kept in the user's preferences and reused when the same attribute is chosen again                                                                                                                                                                                                                              | A new value is added to the map with no colour and draws in the "missing" colour rather than reshuffling; regenerating the palette keeps every colour already assigned. But its Louvain writes an arbitrary integer (`modularityClass`), so after a re-run colour stays with the NUMBER while the number now names a different community |
| Gephi                                                                                                  | Partition colours by value                                                                                                                                                                                                                                                                                                                                      | "the id is 'a random number given to communities'" (`graph-tools.md` section 20.3), so no identity across re-runs                                                                                                                                                                                                                        |
| Kumu                                                                                                   | --                                                                                                                                                                                                                                                                                                                                                              | A re-run "uses existing communities to seed the algorithm", so communities, and with them their names and colours, carry over (`graph-tools.md` section 20.3)                                                                                                                                                                            |
| graphty-element today (`session/styles/encoding.ts`, `settleCategories`; `session/styles/palettes.ts`) | Categories are ordered "largest group first", ties by name, and the palette is taken in that order; community ids "are handed out in discovery order"                                                                                                                                                                                                           | Colour follows SIZE RANK. That makes a partition's colours independent of the algorithm's arbitrary ids, which is right, but an edit that makes one group larger than another swaps their colours, and a named imported category (a department, a species) changes colour whenever its rank changes                                      |

**Is reshuffling documented to harm reading?** Directly, for one view across a recompute, no
study was found. The closest evidence is Qu and Hullman's study of multiple views: following
single-view guidelines "can lead to effective yet inconsistent views ... making interpretation
slow and error-prone", and Tableau users in their study spontaneously kept encodings consistent
or, when warned, either fixed the inconsistency or stated a reason to keep it (abstract read).
A recompute is the same picture seen twice, so this is the relevant finding, but it is
cross-view evidence, not a measurement of reshuffled colours. Archambault and Purchase's result
on positions (section 3.6) is the analogue for layout: jumps cost the reader their place. The
matching problem itself is well defined: pairing old groups with new groups to maximize shared
members is Kuhn's assignment problem (the Hungarian method), and Rosvall and Bergstrom's
alluvial diagrams show community identity carried across network states by connecting each
clustering to the next.

**The rule** (recommendation):

1. **Separate display order from colour assignment.** The legend may list categories largest
   first; the colour is keyed to the category's identity, never to its position in that list.
   This is the defect in graphty-element today.
2. **Named categories keep a stored colour per value.** For a column whose values are names (an
   imported category, a label the reader applied), the style layer stores the value-to-colour map
   once it first paints, as Gephi Lite does. A new value takes the next unused colour; a value
   that disappears keeps its colour reserved while the layer exists; nothing already painted
   changes colour. The map is part of the style layer in the project file.
3. **Algorithm partitions get canonical labels from graphty-element.** An algorithm's raw ids
   mean nothing, so the element relabels: on a first run, groups are numbered by size (largest
   is 1), ties broken by the smallest member id, so the same data gives the same labels. On a
   re-run of the same measure, each new group is matched to the previous version's group with
   the largest member overlap (an assignment, so no two new groups claim one old one), and
   inherits its label, the reader's name for it and its colour; unmatched new groups get fresh
   labels and unused colours; the measure reports how many matched ("5 of 6 groups matched").
   This is the matching the earlier object model already proposed
   (`design/ui/object-first-ux/object-model.md` section 5) and the identity graph-analysis.md
   section 6.8 assumes when it says a community "is identified by its group number within that
   run".
4. **Connected components follow the same rule.** They follow the data (section 3.6), and their
   numbers change on any edit; labelled by size and matched by overlap, "component 1" stays the
   largest component and keeps its colour across an edit, which is also what makes "the largest
   component" a stable scope.
5. **No matching across different measures.** Two different community detections are compared
   by the reader, not silently aligned; only versions of one measure inherit labels and colours.

**One-way door.** Canonical labels and the stored colour map are published element behaviour
and project-file content: they decide what "community 3" means in a saved file and in the API.

---

## 4. The vocabulary

### 4.1 What the method is

- **Controlled vocabulary (ANSI/NISO Z39.19).** Four principles: eliminate ambiguity (each term
  has one and only one meaning), control synonyms (one preferred term per concept; the others are
  non-preferred terms with USE references), establish relationships (equivalence, hierarchical,
  associative), and test and validate with users. Homographs get a qualifier; scope notes fix what
  a term covers.
- **Product lexicon (Johnson and Henderson).** Once the objects, actions and attributes of the
  conceptual model are named, the team has a lexicon used in the app and its documentation.
  Without one, software suffers two bloopers: several terms for one concept, and one term for
  several concepts.
- **Abby Covert.** A controlled vocabulary is "a list of approved terms and definitions for a
  particular context". Her exercises: list the words you say, list the words you do not say, and
  define terms for outsiders. The "do not say" list is where rejected synonyms and friendly
  inventions are recorded so they do not return.
- **Nielsen's heuristics 2 and 4.** Speak the users' language rather than internal jargon; users
  should not wonder whether different words mean the same thing; follow platform and industry
  conventions. For graph analysts, industry convention is graph-theory and network-science
  terminology, which is why the owner keeps betweenness, PageRank, degree and components.

### 4.2 Steps

1. **Start from the ontology.** One entry per concept card, object, operation and attribute kind.
   A term without a concept is deleted.
2. **Collect candidate terms per concept** from, in this order of authority:
   (a) graph theory and network science as used by NetworkX and the algorithms package;
   (b) Cytoscape, Gephi and Neo4j, the tools the personas already use (several persona files name
   Gephi, NetworkX and Cytoscape);
   (c) graphty-element's current API names;
   (d) Figma, for chrome concepts that are not graph concepts (inspector, toolbar, layers,
   undo, command palette).
3. **Choose one preferred term** per concept. Record the others as non-preferred terms with USE
   references. Rule of choice: the standard graph term wins; never invent a friendly substitute
   (the owner's correction: no "Brokers" for betweenness).
4. **Run the collision check** against Figma and against everyday English. Candidates for the
   collision table: _component_ (Figma's reusable design element; graph theory's connected
   component), _group_ (Figma's grouping of layers; a graph group or community), _layer_
   (Figma's layer list; graphty's style layer), _frame_, _selection_, _view_, _filter_, _style_,
   _instance_, _variable_, _page_. For each: which meaning graphty uses, and what the other
   meaning is called if graphty needs it at all.
5. **Write a scope note** for each preferred term: one or two sentences for someone who has never
   used the app (Covert: define terms for outsiders). The scope note is the source text for the
   (i) info icon and the docs glossary, so it is written once.
6. **Write the "words we do not say" list** with the reason for each.
7. **Map terms to the element API.** A preferred term that differs from graphty-element's
   published name is either a rename of the element API (a one-way door, section 8) or a defect to
   file.

### 4.3 Artifacts

- Glossary table: preferred term, concept (link to the ontology card), scope note, non-preferred
  terms, related terms, element API name, source of the term.
- Collision table with Figma and everyday meanings.
- Words-we-do-not-say list.
- Palette alias list, generated from the non-preferred terms.

### 4.4 Quality checks

- One concept per term and one term per concept, across the app, the docs and the element API
  (Z39.19; Johnson and Henderson).
- No invented term where a standard graph term exists.
- Every collision with a Figma term is resolved in writing.
- Every scope note is understandable by an intermediate analyst with no knowledge of graphty.
- The glossary uses only the terms it defines when it defines other terms.
- Labels in the IA (step 4) use only preferred terms.

---

## 5. The design principles

### 5.1 What the method is

- **Principles decide trade-offs.** principles.design defines them as "clear statements that help
  teams make consistent decisions and trade-offs"; its article "Why Most Design Principles Fail"
  argues most sets fail because they are aspirations ("simple") that each reader interprets
  differently. A slogan describes intent; a principle guides a choice.
- **Reversibility test (Jeremy Keith; Matthew Strom).** A principle is useful only if a reasonable
  team could hold its opposite. "Make it easy to use" fails; "accessibility even over aesthetics"
  passes. Strom adds: memorable, able to decide between options, and usable across disciplines,
  and recommends the "A even over B" form, which passes the test by construction.
- **Principles take sides (Julie Zhuo).** Strong principles explain why this team decided
  something another team would not. Principles that no one could disagree with decide nothing.
- **Emergent principles (Jared Spool).** Generic principles do not help make individual design
  decisions; principles that emerge from the team's real work do, and they move the team toward
  agreement.
- **Ranking.** Stack-ranking principles settles conflicts between them in advance, the way GOV.UK
  and others publish a numbered set (GOV.UK's eleven principles are numbered, and its first,
  "Start with user needs", is the one every other bends to).
- **Paved-path examples.** Figma's nine principles in three themes (Professional: powerful,
  precise, systematic. Approachable: predictable, biased toward simplicity, natural mental models.
  Thoughtful: responsible, detail-oriented, respectful). Atlassian's five ("build trust in every
  interaction", "match purpose and feel familiar", "guide mastery for greater value" -- products
  that "gracefully reveal depth over time"). Apple's long-standing clarity, deference and depth,
  where deference means the UI steps back so content leads -- the same idea as Figma's UI3 north
  star of putting the user's work at the centre.

### 5.2 Steps

1. **Harvest candidate principles** from: the owner's brief and fixed decisions; CLAUDE.md's
   architectural principles (these are constraints, already decided, and are not re-ranked);
   Figma's nine; Cooper's intermediate; progressive disclosure; top tasks.
2. **Write each as "A even over B"** with a one-paragraph rationale that states the reason, not
   the history.
3. **Apply the reversibility test.** Drop or rewrite any whose opposite no reasonable team holds.
4. **Collect real conflicts** met while writing the ontology, vocabulary and IA (at least ten),
   stated as concrete choices (for example: does a view live beside paths in the object list;
   does an algorithm's friendlier name replace its standard name; does a second route to a
   feature justify a second home).
5. **Test every principle on the conflict set.** Record which principle decided each conflict. A
   principle that decides nothing is cut; a conflict that no principle decides reveals a missing
   one.
6. **Rank.** When two principles pull in opposite directions on a real conflict, the one that wins
   ranks higher. Keep five to nine (memorability).
7. **Attach a worked example to each:** one decision it settles and one tempting design it forbids.

### 5.3 Artifacts

- The ranked list, each with the "even over" statement, rationale, example, counter-example.
- A conflict ledger: each real conflict and the principle that decided it.
- A short list of rules (not principles) that are not trade-offs: plain ASCII, graph logic lives in
  graphty-element, styling only through style layers. principles.design distinguishes rules from
  principles; mixing them dilutes both.

### 5.4 Quality checks

- Every principle passes reversibility.
- Every principle decided at least one ledger entry; every ledger entry has a deciding principle.
- The ranking was used at least once to break a tie between two principles.
- No principle names a persona. The owner's rule is to enable all users without persona-specific
  features.
- No principle duplicates an architectural rule from CLAUDE.md.

---

## 6. The information architecture

### 6.1 What the method is

- **Rosenfeld, Morville and Arango.** IA as four interlocking systems: organization (how things
  are grouped), labeling (what they are called), navigation (how people move) and search (how they
  find by query). In an application the search system is the command palette.
- **Dan Brown's eight principles** (ASIS&T Bulletin, 2010): objects (content has a lifecycle,
  behaviours and attributes), choices (meaningful choices focused on a task), disclosure (show only
  enough to tell what lies deeper), exemplars (describe categories by examples), front doors
  (assume people arrive anywhere but the home), multiple classification (several ways to browse),
  focused navigation (do not mix apples and oranges), growth (today's content is a small fraction of
  tomorrow's).
- **Object-based IA (Prater).** Navigation derived from the nested-object matrix: users reach
  objects through related objects, and actions live on the object they act on.
- **Covert.** Structure is arrangement for understanding; her book treats taxonomy as "how we
  arrange things" across hierarchies, heterarchies and sequences, and asks what is being arranged
  and for whom before arranging.
- **Shneiderman's visual information-seeking mantra and task-by-data-type taxonomy.** Overview
  first, zoom and filter, then details on demand, with relate, history and extract as further
  tasks, for network data among seven data types. This is the skeleton of the app's places: the
  overview is the resting state; filters and selection narrow; the inspector gives detail; undo is
  history; export is extract.
- **Cooper's inflection and commensurate effort.** Frequent functions in the most immediate
  places (the toolbar), rare ones deeper (menus, dialogs); people accept more effort for things they
  value more, so a rare, powerful operation may live one level down.
- **Progressive disclosure (NN/g).** Up to two levels; frequent needs up front; obvious signposts.
- **McGovern's top tasks.** Longlist, shortlist, vote, find the long neck, measure task success and
  time, demote tiny tasks.
- **Evaluation: card sorting and tree testing (NN/g).** Card sorting generates groupings; tree
  testing evaluates a proposed hierarchy by asking people where they would find something, scoring
  success, directness and time, with tasks worded so they do not give away the label.

### 6.2 Steps

1. **Inventory.** Every capability (the 61 in `design/designloom/capabilities/`) and every
   graphty-element session operation, one row each.
2. **Assign each row to an object** from the ontology: the object it acts on or reports about. A
   row that fits no object signals a missing concept -- go back to the ontology.
3. **Assign each object's operations a scope:** the whole graph, the current selection, a single
   object, or the app itself (preferences, account). Scope, not topic, decides the place: Figma's
   own split is layers (what exists), properties (the current selection), toolbar (creation tools
   and modes), menus (file and app level), palette (everything, by name).
4. **Rank by top tasks.** Use the workflows' task phases, weighted by the owner's corrections
   (overall graph understanding and note-taking are common; export and present are one task;
   watching a graph over time is important to the owner but not to most users). Mark each row top,
   regular or tail. Tail rows get a palette entry and a menu or inspector home, never a toolbar or
   rail slot.
5. **Place.** Each row gets exactly one canonical home. Additional routes (palette, context menu,
   keyboard shortcut) are allowed as doors and recorded as such.
6. **Check each place has one organizing principle** (Brown's focused navigation). A rail whose
   items are some objects, some tools and some settings fails.
7. **Check disclosure depth.** Top tasks at depth zero or one; nothing beyond two levels.
8. **Growth test.** Add ten times the algorithms, attributes and results and confirm no new place
   is needed (Brown's growth).
9. **Tree test on paper.** For each workflow phase, write a findability task without the target's
   label ("find which accounts sit between the two clusters") and trace the route through the
   proposed places. Score success and directness as a tree test would.

### 6.3 Artifacts

- Capability inventory with columns: capability, object, scope, task rank, canonical home, doors.
- Place map: every place in the app shell (rail, canvas, bottom toolbar, inspector, menus,
  palette, dialogs) with its single organizing principle and what it holds.
- A Figma correspondence table: each place, the Figma place it mirrors, and any deliberate
  difference with its reason.
- Tree-test results per workflow phase.

### 6.4 Quality checks

- Exactly one home per capability; no capability homeless.
- Each place has one organizing principle and uses only preferred terms.
- Top tasks are at depth zero or one; nothing deeper than two.
- The toolbar stays small: every toolbar item is a top task (the owner requires a small toolbar).
- Every place maps to a Figma place, or the difference is justified by the ontology (graph objects
  that Figma lacks), not by preference.
- No place exists for one persona.
- No home is in the app for something that is graph functionality; the app renders what
  graphty-element exposes.
- No top task is reachable only by a keystroke; every shortcut has a visible twin (section 6.5).
- The resting state (nothing selected, nothing searched) shows the whole-graph summary in the
  inspector and a visible Find entry above the left panel's list (section 6.5).

### 6.5 Depth zero versus one keystroke away

Two capabilities that nearly every workflow touches briefly both claim the resting screen:
**Find** (search-first work starts from a known entity: fraud, threat hunting, hub
investigation, gene lists) and the **whole-graph summary** (overview-first work starts from
counts, density, components and the degree distribution). graph-analysis.md treats them as equal
entry paths. Figma puts Find behind a 24 px icon and Ctrl+F, replacing the layer list while open
(`design/ui/figma/left-sidebar/README.md` section 5), and shows page-level content in the
inspector when nothing is selected (`design/ui/figma/right-sidebar-selection/README.md`, the
`nothing` state). The IA needs a rule, not a preference, for what is permanently visible.

**What the literature gives.** No source states the rule in one sentence; it is assembled from
four findings that agree:

- **Hidden entry points are used less and cost time.** NN/g's hidden-navigation study: on
  desktop, hidden menus were used in 27% of cases against 48% to 50% for visible or combined
  navigation, discoverability dropped by more than 20%, tasks were at least 39% slower, and the
  recommendation is "Do not use hidden navigation ... in desktop user interfaces." For search
  specifically, NN/g recommends "a type-in field and not a link"; replacing a link with a box
  raised search use by 91%.
- **Keystrokes supplement, never replace.** NN/g on accelerators: they are "additional, alternate
  ways to accomplish a task", and users who never discover them "should be able to complete the
  same task in another way". Ctrl+F and Escape are the expert's door, not the home.
- **Recognition over recall.** Interfaces should "make information and interface functions
  visible and easily accessible" (NN/g). A shortcut is recall; a visible field is recognition.
- **State the reader must interpret belongs on screen.** Visibility of system status: "only by
  knowing what the current system status is can you change it". Cooper's inflection puts the
  most frequent functions in the most immediate places; NN/g's progressive disclosure puts what
  is frequently needed up front and the rest one obvious step away.

**The rule** (recommendation): sort each candidate by kind, then by frequency.

1. **Status** -- facts the reader needs to interpret what the canvas shows (how big is this
   graph, how many components, is it filtered, what share remains). Shown permanently, in
   compact form, wherever it is the answer to "what am I looking at?". Depth zero.
2. **Entry to a top task** -- a command that starts a top task. Its _entry_ is permanently
   visible (a field or labelled control, with the shortcut in its tooltip); its _working
   surface_ (results list, options) opens only when invoked and closes on Escape. Entry at depth
   zero, surface at depth one.
3. **Tail command** -- palette, menu or context menu only.

Frequency decides between places of the same kind, never between kinds: a very frequent command
still does not get a permanently open panel if that panel displaces status or a more frequent
list.

**Applied to the two contenders.** They do not compete, because they are different kinds and
belong to different places:

- The **whole-graph summary is status**, and it is the graph's properties. It is the inspector's
  resting content when nothing is selected, exactly Figma's page-level "nothing selected" state
  and figma.md's "whole-work readings live with nothing selected". The compact readings (counts,
  density, components, directedness, the share visible under a filter) are at depth zero; the
  degree distribution and the full statistics are one disclosure down. Escape and clicking empty
  canvas return to it, and both are visible-equivalent routes (clicking the canvas is visible).
- **Find is an entry to a top task.** Its entry is a visible type-in field at the top of the left
  panel, the place that answers "what exists?", with Ctrl+F as its shortcut. Typing replaces the
  list with results, as in Figma, and Escape restores the list. This departs from Figma's icon on
  purpose: in Figma finding a layer by name is occasional, in graphty starting from a known
  entity is a top task in the investigation workflows, and NN/g's field-over-link evidence is
  about exactly that case. The field searches attribute values and queries, not only names
  (figma.md). Section 6.6 checks this against phase counts: Find is small by share of phases
  but is the first phase of four investigation workflows, which is why it keeps its field.

This resolves the tension with finding 12 of section 1: "overview first" governs what the
inspector shows at rest, and search-first governs what the left panel offers at rest. Both entry
paths start from the resting screen with zero clicks, which is what "equal weight" in
graph-analysis.md requires. The rule is a two-way door; only a published keyboard shortcut would
be a contract.

### 6.6 Top tasks by task phase, run scope and note targets

Step 4 of section 6.2 ranks capabilities by the workflows' task phases rather than by their
capability lists. This section does that ranking and answers three placement questions that
depend on it: which verbs get an entry at depth zero, whether a run starts from a set's
inspector or from one dialog with a scope field, and whether Add note needs a global entry and a
selection that mixes kinds.

**Method.** Every numbered task phase of the 25 workflows in `design/designloom/workflows/`
(139 phases) was coded with one or two tasks from the list below, reading the phase text, not
the `requires_capabilities` list. A phase with two or three tasks splits its weight evenly. Two
weightings stand in for McGovern's vote, since no user vote exists: **by phase** (every phase
counts 1) and **by persona** (each workflow is worth the number of personas it lists, split
evenly over its phases, so "First Exploration - Quick Data Assessment" with six personas
outweighs "Threat Hunting" with one). Phases that happen off the screen (define the question,
assess the audience) are coded "think" and left out of the shares. The coding is one reader's
judgment; the full coding is in the table at the end of this section so it can be checked and
re-cut.

The tasks: **run** (compute an algorithm or measure), **summary** (read whole-graph facts:
counts, structure, distributions, data quality), **read result** (read, rank or compare what a
run produced), **load** (import, map fields, preview), **inspect** (read one element or a few in
detail), **export** (save, export, share), **navigate** (pan, zoom, look at a neighbourhood),
**note** (write a note or annotation), **label** (classify elements or name groups), **keep**
(make a kept set), **find** (locate a known entity or run a query), **clean** (edit, merge,
resolve, join), **filter**, **style**, **time** (time windows), **history** (read what was
done), **layout**.

**Ranked tasks.**

| Rank | Task        | Share by persona | Share by phase | Workflows that use it (of 25) |
| ---- | ----------- | ---------------- | -------------- | ----------------------------- |
| 1    | Run         | 16.3%            | 18.1%          | 17                            |
| 2    | Summary     | 13.0%            | 7.7%           | 6                             |
| 3    | Read result | 10.2%            | 7.7%           | 9                             |
| 4    | Load        | 8.5%             | 11.5%          | 10                            |
| 5    | Inspect     | 7.9%             | 6.2%           | 10                            |
| 6    | Export      | 7.7%             | 8.8%           | 11                            |
| 7    | Navigate    | 7.4%             | 6.2%           | 9                             |
| 8    | Note        | 6.7%             | 7.2%           | 8                             |
| 9    | Label       | 4.0%             | 3.5%           | 4                             |
| 10   | Keep        | 3.4%             | 5.0%           | 7                             |
| 11   | Find        | 3.3%             | 5.4%           | 5                             |
| 12   | Clean       | 3.1%             | 5.4%           | 5                             |
| 13   | Filter      | 2.7%             | 2.2%           | 5                             |
| 14   | Style       | 2.3%             | 2.2%           | 5                             |
| 15   | Time        | 1.9%             | 1.5%           | 2                             |
| 16   | History     | 0.8%             | 0.8%           | 1                             |
| 17   | Layout      | 0.7%             | 0.8%           | 2                             |

**The long neck.** Run, summary and read result together take about 40% of the persona-weighted
phases (34% by phase); Run leads under both weightings and in reach. The next band (load,
inspect, export, navigate, note plus label) takes about 42%. Everything from keep down is the
tail by share. Two cautions on reading the tail. Style is low because most workflows expect a
run to paint its result without being asked (the suggested style layers), so styling happens
inside Run more often than as a phase of its own. And Find and Keep are low by share but sit at
hand-over points: Find is the FIRST phase of Path Investigation, Fraud Ring Investigation,
Criminal Network Analysis and Threat Hunting, and nothing after it can start without it; Keep is
what turns a result into a scope or a note target. Share of phases measures time spent, not how
much the rest of the work depends on a step. Summary's rank rests on the persona weighting: it
is concentrated in the two onboarding workflows that most personas share.

**Run steps: what do they run on?** 28 phases include a run. Coding the scope of each:

| Scope                                                                                              | Run steps | Share by phase | Share by persona | Workflows                                                                                                       |
| -------------------------------------------------------------------------------------------------- | --------- | -------------- | ---------------- | --------------------------------------------------------------------------------------------------------------- |
| The whole graph                                                                                    | 18        | 64%            | 62%              | 12 workflows                                                                                                    |
| Each part of something, once per part: each community or cluster, each time window, each condition | 5         | 18%            | 25%              | Community Analysis, Cluster and Functionally Annotate, Network Evolution Analysis (twice), Condition Comparison |
| Seeded by chosen nodes (a path's endpoints, a flagged entity)                                      | 2         | 7%             | 8%               | Path Investigation, Fraud Ring Investigation                                                                    |
| One kept set                                                                                       | 2         | 7%             | 4%               | Drug Target Discovery (the module), Fraud Ring Investigation (the ring)                                         |
| A changed copy of the graph (a supplier removed)                                                   | 1         | 4%             | 2%               | Supply Chain Risk Assessment                                                                                    |

The largest connected component appears in Gene List to Interaction Network, but as a change to
the working graph ("make it the working network") after which every run is whole-graph, not as
the scope of one run. So of the run steps that target less than the whole graph (about 36%),
only the two kept-set runs would start naturally from one set's inspector; the per-part runs
are the largest group, and Cluster and Functionally Annotate names the cost of lacking them:
"Re-running enrichment per cluster by hand for 15 clusters".

**Note steps: how many targets?** Eleven phases write notes. Six cite several targets at once:
"Document findings" and "evidence summary" (Iterative Analysis Cycle), "the evidence chain for
each finding" (Fraud Ring Investigation), mitigation for a failure scenario (Supply Chain Risk
Assessment), the narrative (Findings Communication) and connecting changes to events (Network
Evolution Analysis). Of those six, one (an evidence chain of nodes and edges) could start from a
single canvas selection; the other five cite kept objects -- runs, sets, time windows, history
states -- alone or mixed with elements. The five single-target note steps name a kept set (the
ring), a query that found nothing (Threat Hunting), relationships and entities (Criminal Network
Analysis), a callout on the picture (Findings Communication) or the canvas itself (Reproducible
Session). The six **label** phases are different in kind: "Label as error, threat, or genuine
discovery" (Anomaly Detection), hub role and anomaly flag (Hub Investigation), a term per
cluster and theme names (Cluster and Functionally Annotate, Enrichment Map). Each applies one
value to many elements or names one group, and each starts from one selection or one group row.

**What this means for graphty** (recommendation):

1. **Depth zero, always visible: Run, the whole-graph summary, Find, Add note.** Run leads every
   count, so its entry is on the toolbar. The summary is status and is the inspector's resting
   content (section 6.5). Find keeps its field because it gates four workflows. Add note is on
   the toolbar because most note steps do not start from one selection (item 4), as Figma's
   Comment tool is on its toolbar (`figma.md`, bottom toolbar). Reading results is a place (the
   result's inspector and its legend), not a verb, so it needs no entry.
2. **Depth zero in context: Keep and Label.** Keep appears in the inspector header whenever
   something keepable is selected (a selection, a group row, a path, a query), and Label as an
   attribute edit in the selection's inspector and as rename on a group row. Neither earns a
   permanent toolbar slot by share, and both are always one click from the object they act on.
   This refines graph-analysis.md section 6.3 ("Keep" at depth zero): at depth zero where the
   thing to keep is, not on the toolbar.
3. **Run is one dialog with a scope field.** Whole graph is preselected (62% of run steps). The
   field offers the selection, a kept set, the largest component, and "each group of" a
   partition, time window or condition. A set's inspector offers "Run within this set", which
   opens the same dialog with the scope filled in; that is a door, not a second home. This
   contradicts graph-analysis.md section 6.14, which treats "within each community" as "a later
   extension of the same scope": by phase count it is the most common scope after the whole
   graph, so it belongs in the first version of the field. Computing per group is graph logic
   and belongs in graphty-element; its result is one run whose scope names the partition
   (section 3.7).
4. **Add note starts from the current selection and adds targets by reference.** With nothing
   selected it makes a free note on the project; with a selection it takes that as its first
   target; inside the note, further targets (a run, a set, a view, a history step, another
   element) are added by picking or mentioning them. This covers all eleven note steps without
   a multi-selection that mixes canvas elements and list rows. Such a mixed selection would
   exist for this one verb only, Figma has no equivalent, and every other verb would then have
   to define what it does to a mixed selection. It stays out.
5. **Labelling is not a note.** A classification is a user-set attribute on the elements, so it
   can be filtered, coloured and exported, as Anomaly Detection's "prioritized anomaly list with
   classification" requires; a group name is a property of the group. Neither is free text
   pinned to a target. This keeps the note concept to one purpose (section 3.4) and agrees with
   graph-analysis.md section 6.21, which puts judgments on the object judged.
6. **Load and export are regular, not top, and bound to the session's ends.** Load is 8.5% but
   happens at the start; export is 7.7% at the end. Their homes are the file menu and the empty
   state (load) and one Share or Export entry (export), not toolbar tools.
7. **Filter and style stay one level down.** Filter is under 3% and in five workflows; it lives
   in the left panel and the selection's context actions. Style lives in the style layer list
   and the inspector.

**The coding.** One row per workflow: the phases in order, each with its task codes, and the
run scope where a phase runs something. The number is how many personas the workflow file lists.

| Workflow (personas)                                          | Phases and codes                                                                                                                                                           |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| First Exploration - Quick Data Assessment (6)                | Size: summary; Structure: summary; Distribution: summary; Sample: inspect; Attributes: summary                                                                             |
| Visual Exploration - Overview to Detail (3)                  | Overview: navigate; Zoom: navigate; Filter: filter; Details: inspect                                                                                                       |
| Iterative Analysis Cycle (3)                                 | Question: think; Explore: navigate + style; Hypothesize: think; Test: run (whole); Refine: note; Conclude: note                                                            |
| Community Analysis (4)                                       | Detection: run (whole); Validation: read result; Characterization: read result + run (each group); Boundary: run (whole); Inter-community: read result                     |
| Path Investigation (3)                                       | Target selection: find; Path finding: run (seeded); Comparison: read result; Context: navigate; Intermediates: inspect                                                     |
| Fraud Ring Investigation (1)                                 | Alert context: find + navigate; Pattern recognition: find; Ring identification: run (seeded) + keep; Risk scoring: run (kept set); Evidence: note; Determination: note     |
| Threat Hunting (1)                                           | Hypothesis: think; Translation: find; Execution: find; Triage: inspect + filter; Iteration: find; Response: note + export                                                  |
| Drug Target Discovery (1)                                    | Construction: load; Module: keep; Prioritization: run (kept set); Validation: inspect; Selection: keep                                                                     |
| Criminal Network Analysis (1)                                | Initialization: find; Integration: load; Building: clean; Structure: run (whole); Vulnerability: run (whole); Production: export + note                                    |
| Influencer Identification (1)                                | Define: think; Compute: run (whole); Segment: keep; Validate: inspect; Rank and select: read result + keep                                                                 |
| Supply Chain Risk Assessment (1)                             | Mapping: load; Dependency: run (whole); Centrality: run (whole); Scenario: clean + run (changed copy); Mitigation: note                                                    |
| Anomaly Detection (3)                                        | Baseline: summary; Statistical: run (whole) + read result; Structural: run (whole); Triage: read result + keep; Investigation: inspect + navigate; Classification: label   |
| Knowledge Graph Construction (1)                             | Schema: clean; Extraction: load; Relationships: clean; Resolution: clean; Quality: summary; Deployment: export                                                             |
| First-Time User Onboarding (1)                               | Arrival: load; Loading: load; First visualization: summary; Guided exploration: navigate; First analysis: run (whole); Next steps: think                                   |
| Findings Communication (4)                                   | Audience: think; Message: think; Visualization design: filter + style + note; Narrative: note; Production: export; Validation: think                                       |
| Graph-Based Recommendation (1)                               | Construction: load; Features: run (whole); Similarity: run (whole); Generation: run (whole) + read result; Evaluation: think; Deployment: export                           |
| Hub Investigation (3)                                        | Identification: run (whole) + read result; Ego network: navigate; Attributes: inspect; Temporal: time; Role: label; Anomaly: label                                         |
| Data Import and Validation (3)                               | Source, Format, Mapping, Preview, Load: load; Validation: summary; Quality report: summary                                                                                 |
| Network Evolution Analysis (3)                               | Segmentation: time; Metric tracking: run (each window); Change detection: read result; Patterns: read result; Community evolution: run (each window); Interpretation: note |
| Gene List to Interaction Network with Expression Overlay (2) | Get network: load; Trim: keep + clean; Join: clean; Encode: style; Lay out and read: layout + inspect; Save figure: export                                                 |
| Cluster and Functionally Annotate a Molecular Network (2)    | Cluster: run (whole); Inspect: read result + keep; Annotate each: run (each group) + label; Show terms: style + label; Export: export                                      |
| Enrichment Map - Pathway Similarity Network (2)              | Build: load; Explore: find + inspect; Tune: filter + layout; Name themes: run (whole) + label; Publish: export                                                             |
| Hub Gene Identification and Ranking (2)                      | Compute: run (whole); Distributions: read result; Combine: read result + keep; In context: keep + navigate; Report: style + export                                         |
| Condition Comparison - Disease vs Control Networks (2)       | Load both: load; Merge: clean; Compare statistics: summary; Rewired genes: run (each condition) + filter; Side by side: navigate; Report: export                           |
| Reproducible Session and Network Publication (2)             | Tidy: note; Record parameters: history; Save: export; Export: export; Share: export                                                                                        |

**Limits.** The persona lists and phases come from the workflow files, which are marked
`validated: false`; the weights are a proxy for a vote, not a vote. A second coder would move
some half-phases between neighbouring tasks (inspect and read result, keep and label), which
changes shares by a point or two but not the order of the top three, nor the run-scope and
note-target counts, which rest on the phase text directly.

---

## 7. Validation with personas and workflows

### 7.1 Why they validate rather than generate

The personas and workflows are rich, and that is the risk: each workflow YAML carries
`requires_capabilities` and `suggested_components` lists, and each persona carries goals and
frustrations. Read as requirements, they generate a feature per persona and a cluttered UI -- the
outcome the owner forbids. NN/g's guidance is that personas work as an alignment tool, used to
make decisions and build realistic scenarios, and fail when treated as a deliverable. The method
here uses them only after a structure exists, to test it.

What the workflows are good for is their narrative fields: "Task Phases", "Decision Points",
"Information Needs", "Pain Points" and "success_criteria". Those describe what a person is trying
to do and know, independent of any UI. Of 25 workflows, 16 are analysis, 3 exploration,
3 onboarding, 2 reporting and 1 administration, so analysis dominates the tests, as it should.

### 7.2 The protocol

1. **Cognitive walkthrough per workflow phase** (Polson, Lewis, Rieman and Wharton 1992). At each
   step ask: Will the user try to achieve this effect? Will the user notice the correct action is
   available? Will the user understand the action achieves the effect? Will the user get
   appropriate feedback? Run it against the framework (objects, terms, places), not against mocks.
2. **Intermediate first.** Walk each workflow as the intermediate reader (Analyst Alex is the
   reference: knows Gephi and NetworkX, not a specialist). Then walk it as the novice and as an
   expert.
3. **Fix failures with general mechanisms only.** A novice failure is fixed by a default, undo,
   an (i) scope note, a tooltip, the palette, a sample or docs. An expert failure is fixed by a
   shortcut, the palette, or exposing a parameter one level down. If neither works, the fault is
   in the ontology or the IA, and that document is revised. A persona-specific feature is never
   the fix.
4. **Claims analysis for contested choices** (Rosson and Carroll's scenario-based design): for a
   disputed design choice, list its upsides and downsides as they show up in the scenarios, rather
   than arguing preference.
5. **Coverage matrix.** Workflows by places, and workflows by objects. An object used by no
   workflow is suspect; a place used by one workflow is suspect.
6. **Clutter test.** Every proposed addition must name the top task it serves and what it displaces
   or where it sits in the tail. McGovern: the top tasks deserve as much attention as the tail
   combined, and tiny tasks multiply if not removed.

---

## 8. One-way doors in these documents

CLAUDE.md defines a one-way door as costly to undo or a contract published to consumers -- a
public API, an exported type, a data format, a package name. Applying that to the framework:

| Document   | Mostly                  | One-way parts                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ---------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ontology   | two-way on paper        | the object kinds that graphty-element's session API exposes and that the project file saves (the file is a published data format), including what a node of the analysis tree is (section 3.5) and which derived objects follow the data or hold their value, with the states that result (section 3.6); which relationships are stored as containment and which as references (section 3.7); canonical group labels, their matching across re-runs and the stored category colours (section 3.8) |
| Vocabulary | one-way where published | preferred terms that become element API names, event names, project-file keys or documented concepts; renaming them later is a breaking change                                                                                                                                                                                                                                                                                                                                                    |
| Principles | two-way                 | none; they can be re-ranked by an edit                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| IA         | two-way                 | keyboard shortcuts and URLs only if published and documented                                                                                                                                                                                                                                                                                                                                                                                                                                      |

So the owner's decisions cluster in the ontology-to-API mapping and the vocabulary. Everything
else is decided by the team, with the reason stated in one line.

---

## 9. What Figma gives, and what it cannot

| Framework part   | From Figma                                                                                                                                                                             | Specific to graphty                                                                                                                 |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Principles       | Figma's nine, especially biased toward simplicity, predictable, natural mental models; UI3's "work at the centre"; the evidence that panels which slow people down get reverted        | Standard graph terminology over friendliness; element owns graph logic; analysis stacks as style layers                             |
| Conceptual model | the interaction grammar: select an object, then act on it (noun-verb, as in object-oriented UIs per Raskin and Collins); the inspector scoped to the selection; undo as the safety net | the objects themselves: graph, node, edge, path, component, community, group, and the secondary notes, views, layouts, style layers |
| Vocabulary       | chrome terms (toolbar, inspector, palette, undo)                                                                                                                                       | graph terms, and the collision table where Figma's words mean something else                                                        |
| IA               | place scheme: left rail and panel, bottom-centre toolbar, right inspector, menus, palette; scope-based placement                                                                       | what each place holds, decided by the ontology and top tasks                                                                        |

---

## 10. Adversarial review checklist

Reviewers apply these to every framework document, in addition to the per-document checks:

1. Can a stranger understand each section without the others? (No internal IDs, no process
   narration.)
2. Does each object have one purpose? Name it without "and".
3. Is any secondary object a peer of a primary object?
4. Is any term invented where a standard one exists, or used for two concepts?
5. Does every principle pass reversibility, and did it decide a real case?
6. Does every capability have exactly one home, and every place one organizing principle?
7. Is anything placed for one persona?
8. Does anything put graph logic in the app?
9. Is each departure from Figma justified by the graph domain rather than taste?
10. Which statements are one-way doors, and are they flagged for the owner?

---

## 11. Sources

Read directly (page fetched):

- GOV.UK, Government Design Principles: https://www.gov.uk/guidance/government-design-principles
- Figma design principles (as collected): https://www.designprinciplesftw.com/collections/figma-design-principles
- Figma, "Figma on Figma: Our Approach to Designing UI3": https://www.figma.com/blog/our-approach-to-designing-ui3/
- Figma, "Inside the Redesigned Figma": https://www.figma.com/blog/behind-our-redesign-ui3/
- Atlassian design principles (as collected): https://principles.design/examples/atlassian-design-principles
- Matt Strom-Awn, "What makes a good design principle?": https://mattstromawn.com/writing/principles/
- Dan Brown, Eight Principles of Information Architecture, ASIS&T Bulletin 2010 (as collected): https://principles.design/examples/eight-principles-of-information-architecture
- "Conceptual Models in a Nutshell" (Johnson and Henderson), Boxes and Arrows: https://boxesandarrows.com/conceptual-models-in-a-nutshell/
- Daniel Jackson, "Conceptual models missed the point": https://essenceofsoftware.com/posts/conceptual-models/
- Daniel Jackson, "Operational principles": https://essenceofsoftware.com/tutorials/concept-basics/principle/
- Daniel Jackson, "Concept design in three easy steps": https://newsletter.squishy.computer/p/concept-design-in-three-easy-steps
- Sophia Prater, "OOUX: A Foundation for Interaction Design", A List Apart: https://alistapart.com/article/ooux-a-foundation-for-interaction-design/
- Gerry McGovern, "What Really Matters: Focusing on Top Tasks", A List Apart: https://alistapart.com/article/what-really-matters-focusing-on-top-tasks/
- NN/g, "Progressive Disclosure": https://www.nngroup.com/articles/progressive-disclosure/
- NN/g, "10 Usability Heuristics": https://www.nngroup.com/articles/ten-usability-heuristics/
- NN/g, "Tree Testing": https://www.nngroup.com/articles/tree-testing/
- NN/g, "Why Personas Fail": https://www.nngroup.com/articles/why-personas-fail/
- NN/g, "Jakob's Law of Internet User Experience": https://www.nngroup.com/videos/jakobs-law-internet-ux/
- Z39.19 principles of vocabulary control (Marcia Zeng's summary of ANSI/NISO Z39.19-2005): https://marciazeng.metadataetc.org/Z3919/2principle.htm
- Jeff Atwood, "Defending Perpetual Intermediacy" (quotes Cooper): https://blog.codinghorror.com/defending-perpetual-intermediacy/
- Wikipedia, "Object-oriented user interface": https://en.wikipedia.org/wiki/Object-oriented_user_interface
- Wikipedia, "Cognitive walkthrough": https://en.wikipedia.org/wiki/Cognitive_walkthrough
- Lee, Plaisant, Parr, Fekete, Henry, "Task Taxonomy for Graph Visualization", BELIV 2006: https://datavis2020.github.io/pdfs/lee-beliv06.pdf
- Neo4j, graph database concepts: https://neo4j.com/docs/getting-started/graph-database/
- Juliana Freire et al., "VisTrails", The Architecture of Open Source Applications, vol. 1: https://aosabook.org/en/v1/vistrails.html
- VisTrails project page: https://www.vistrails.org/index.php/Main_Page
- OpenRefine manual, History (undo/redo): https://openrefine.org/docs/manual/running#history-undoredo
- Microsoft, Power Query "Applied steps": https://learn.microsoft.com/en-us/power-query/applied-steps
- Tableau Desktop, the workspace (undo and redo): https://help.tableau.com/current/pro/desktop/en-us/environment_workspace.htm
- Gephi FAQ (undo, overwritten statistics columns): https://gephi.org/faq/
- Cytoscape User Manual, Quick Tour (undo scope, network provenance history): https://manual.cytoscape.org/en/stable/Quick_Tour_of_Cytoscape.html
- Microsoft, "Change formula recalculation, iteration, or precision in Excel": https://support.microsoft.com/en-us/office/change-formula-recalculation-iteration-or-precision-in-excel-73fc7dac-91cf-4d36-86e8-67124f6bcce4
- Microsoft Learn, "Excel Recalculation" (dirty cells, calculation modes, data tables): https://learn.microsoft.com/en-us/office/client-developer/excel/excel-recalculation
- marimo, "Runtime configuration" (autorun and lazy): https://docs.marimo.io/guides/configuration/runtime_configuration/
- marimo, "Expensive notebooks": https://docs.marimo.io/guides/expensive_notebooks/
- marimo, "Running cells" (reactivity, deleting and disabling cells): https://docs.marimo.io/guides/reactivity/
- Observable Framework, "Reactivity" (source of https://observablehq.com/framework/reactivity): https://raw.githubusercontent.com/observablehq/framework/main/docs/reactivity.md
- Observable Inputs README (the _submit_ option): https://raw.githubusercontent.com/observablehq/inputs/main/README.md
- Pluto.jl home page (reactivity): https://plutojl.org/
- Lau, Drosos, Markel, Guo, "The Design Space of Computational Notebooks: An Analysis of 60 Systems in Academia and Industry", VL/HCC 2020: https://pg.ucsd.edu/publications/computational-notebooks-design-space_VLHCC-2020.pdf
- Good, de Montjoye, Clauset, "The performance of modularity maximization in practical contexts" (abstract): https://arxiv.org/abs/0910.0165
- Macke et al., "Fine-Grained Lineage for Safer Notebook Interactions" (abstract, including the 666-session evaluation): https://arxiv.org/abs/2012.06981
- Archambault, Purchase, Pinaud, "Animation, Small Multiples, and the Effect of Mental Map Preservation in Dynamic Graphs", IEEE TVCG 2011 (abstract): https://inria.hal.science/inria-00472423v1
- NN/g, "Hamburger Menus and Hidden Navigation Hurt UX Metrics": https://www.nngroup.com/articles/hamburger-menus/
- NN/g, "Findability of navigation on mobile": https://www.nngroup.com/articles/find-navigation-mobile-even-hamburger/
- NN/g, "Search: Visible and Simple": https://www.nngroup.com/articles/search-visible-and-simple/
- NN/g, "UI Accelerators": https://www.nngroup.com/articles/ui-accelerators/
- NN/g, "Memory Recognition and Recall in User Interfaces": https://www.nngroup.com/articles/recognition-and-recall/
- NN/g, "Visibility of System Status": https://www.nngroup.com/articles/visibility-system-status/
- Gephi Lite source, commit 50af8db (2026-09-18), https://github.com/gephi/gephi-lite : `packages/gephi-lite/src/core/preferences/useColorHistoric.ts`, `core/appearance/index.ts`, `components/GraphAppearance/color/utils.ts`, `core/metrics/nodes/louvainMetric.ts`
- marimo source, commit 1e9f420 (2026-09-25), https://github.com/marimo-team/marimo : `frontend/src/components/editor/Output.tsx`, `frontend/src/components/editor/controls/Controls.tsx`, `frontend/src/css/app/Cell.css`
- marimo, "Expensive notebooks" (lazy mode marks dependents stale): https://docs.marimo.io/guides/expensive_notebooks/
- d3-scale, ordinal scales: https://d3js.org/d3-scale/ordinal
- Observable Plot, scales (source of https://observablehq.com/plot/features/scales): https://raw.githubusercontent.com/observablehq/plot/main/docs/features/scales.md
- Tableau Desktop, "Color palettes and effects": https://help.tableau.com/current/pro/desktop/en-us/viewparts_marks_markproperties_color.htm ; "Create custom color palettes": https://help.tableau.com/current/pro/desktop/en-us/formatting_create_custom_colors.htm ; "Pause automatic updates": https://help.tableau.com/current/pro/desktop/en-us/queries_autoupdates.htm
- Rosvall and Bergstrom, "Mapping Change in Large Networks", PLoS ONE 2010: https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0008694
- NN/g, "Indicators, Validations, and Notifications": https://www.nngroup.com/articles/indicators-validations-notifications/
- NN/g, "Error-Message Guidelines": https://www.nngroup.com/articles/error-message-guidelines/
- Luke Wroblewski, "Inline Validation in Web Forms", A List Apart: https://alistapart.com/article/inline-validation-in-web-forms/
- GOV.UK Design System, Error summary: https://design-system.service.gov.uk/components/error-summary/

Known through abstracts or search summaries only (the full text was not accessible; claims above
use only what those summaries state):

- Johnson and Henderson, "Conceptual models: begin by designing what to design", interactions 9(1), 2002: https://dl.acm.org/doi/10.1145/503355.503366
- Johnson and Henderson, _Conceptual Models: Core to Good Design_, 2011: https://link.springer.com/book/10.1007/978-3-031-02195-4
- Sophia Prater, ORCA: https://medium.com/design-bootcamp/introducing-orca-the-third-diamond-in-your-ux-process-23a1babb0389 and the nested-object matrix: https://sophiavux.medium.com/this-is-so-much-of-what-i-teach-in-ooux-4e5f84672149
- Roberts, Berry, Isensee, Mullaly, _Designing for the User with OVID_, 1998: https://dl.acm.org/doi/10.1145/1120212.1120335
- Don Norman, _The Design of Everyday Things_ (designer's model, system image, user's model), via summaries such as https://ixdf.org/literature/book/the-glossary-of-human-computer-interaction/mental-models
- Alan Cooper, _About Face_ (perpetual intermediates, inflecting the interface, commensurate effort): https://www.wiley.com/en-us/About+Face:+The+Essentials+of+Interaction+Design,+4th+Edition-p-9781118766576
- Rosenfeld, Morville and Arango, _Information Architecture_, 4th edition: https://www.oreilly.com/library/view/information-architecture-4th/9781491913529/
- Abby Covert, _How to Make Sense of Any Mess_ (chapter titles read; lesson text not accessible): https://www.howtomakesenseofanymess.com/
- ANSI/NISO Z39.19-2005 (R2010): https://www.niso.org/publications/ansiniso-z3919-2005-r2010
- principles.design, "Why Most Design Principles Fail": https://principles.design/articles/why-most-design-principles-fail
- Jeremy Keith on the reversibility test: https://adactio.medium.com/design-principles-52bdc267c56a
- Julie Zhuo, "A Matter of Principle": https://medium.com/the-year-of-the-looking-glass/a-matter-of-principle-4f5e6ad076bb
- Jared Spool on design principles: https://medium.com/adventures-in-ux-design/work-better-smarter-and-faster-with-design-systems-98827f1c8a1e
- Apple Human Interface Guidelines, design principles: https://developer.apple.com/design/human-interface-guidelines/design-principles
- Shneiderman, "The Eyes Have It", 1996: https://hci.stanford.edu/courses/cs448b/papers/shneiderman96eyes.pdf
- Polson, Lewis, Rieman, Wharton, cognitive walkthroughs, 1992: https://www.sciencedirect.com/science/article/abs/pii/002073739290039N
- Rosson and Carroll, scenario-based design and claims analysis: https://dl.acm.org/doi/10.5555/772072.772137
- Qu and Hullman, "Keeping Multiple Views Consistent: Constraints, Validations, and Exceptions in Visualization Authoring", IEEE TVCG 24(1), 2018, https://doi.org/10.1109/TVCG.2017.2744198 (abstract read through the preprint record https://doi.org/10.31219/osf.io/zm4ub)
- Eckelt, Gadhave, Lex, Streit, "Loops: Leveraging Provenance and Visualization to Support Exploratory Data Analysis in Notebooks" (abstract, preprint record): https://doi.org/10.31219/osf.io/79eyn
- Kuhn, "The Hungarian method for the assignment problem", Naval Research Logistics Quarterly 2(1-2), 1955 (abstract): https://doi.org/10.1002/nav.3800020109
- Archambault and Purchase, "Mental Map Preservation Helps User Orientation in Dynamic Graphs", Graph Drawing 2012, LNCS 7704 (title and bibliographic record only): https://doi.org/10.1007/978-3-642-36763-2_42

Repository material read:

- `design/designloom/personas/*.yaml` (expertise and frequency fields), `design/designloom/workflows/W01.yaml` in full, the names, categories, persona lists and Task Phases of all 25, and their note, annotation and scope passages (section 6.6), `design/designloom/capabilities/*.yaml` categories and one file in full
- `design/ui/object-first-ux/object-model.md` sections 2.1 to 2.4, 5 (group matching across re-runs) and 6.1 (nesting)
- graphty-element source: `graphty-element/src/session/styles/encoding.ts` (`settleCategories`: categories ordered largest first, ties by name) and `graphty-element/src/session/styles/palettes.ts` (community ids in discovery order; palette choice by group count)
- `graph-analysis.md` sections 6.3, 6.7, 6.8, 6.13, 6.14 and 6.21; `graph-tools.md` sections 20.3 and 20.14; `graphty-today.md` sections 6 and 7.16; `figma.md` section 2.2 and the bottom toolbar row of the place table
- `CLAUDE.md` (Architectural Principles, one-way door definition in the owner's instructions)
- `design/ui/figma/left-sidebar/README.md` section 5 (Find) and `design/ui/figma/right-sidebar-selection/README.md` (the nothing-selected state)
- The sibling notes in this folder: `graph-analysis.md` sections 1.6, 4, 5 and 6.2, `figma.md` sections 2.4, 4.2 and 5.4, `graphty-today.md` sections 3, 6, 7.1, 7.7 and 7.9, `graph-tools.md` (Gephi workspaces, Gephi Lite, Kumu, section 20.3)

## Follow-up: a top-task vote or first-click test with real analysts

Question: can the order of top tasks 2 to 6 (the ranking in section 6, which weights workflows by
the personas that list them) be settled by a top-task vote or a first-click test with about five
real weekly analysts?

**Not from inside the design documents.** The personas and workflows are marked `validated: false`
in their files, and no recruited analysts are available to this work, so the vote cannot be run
here. Any ranking claimed without it rests on the persona weighting and must say so.

**If the owner can recruit, the method is small.**

- Top-task vote (McGovern): give each analyst the task list in random order and ask them to pick
  the five that matter most in a normal week. With five people this cannot produce a statistically
  stable ranking; it can only show whether the persona-weighted order is badly wrong (for example
  a task nobody picks sitting at rank 2). McGovern's own surveys use hundreds of voters; five is a
  sanity check, not a measurement (practitioner knowledge; no source re-read for this note).
- First-click test: five tasks phrased in the analyst's words ("find how these two accounts are
  connected"), one screenshot or wireframe per task, record the first click. Five participants
  find most gross findability problems, which is Nielsen's argument for small qualitative tests;
  first-click tests are usually run with more people because the output is a proportion
  (practitioner knowledge; no source re-read for this note).
- Recruit from the persona set that uses graphty weekly or daily (11 of the 12 personas), at
  least one each from biology, security or fraud, and general analysis, since those groups weight
  the tasks differently.

**Decision rule until then.** Keep the persona-weighted order; a design that works regardless of
the order of tasks 2 to 6 (each reachable in the same number of steps from a selection) needs no
vote, so prefer that where it costs nothing.

## Follow-up: three vocabulary checks -- the drawing limit, "metric", and a column named weight

### A status line while nothing is drawn

Question: do the typical graph sizes in the personas and workflows exceed graphty-element's
drawing limit, so that a common workflow shows counts on screen while the canvas is empty? If so,
"the visible graph" cannot name the graph analysis runs over.

**The drawing limit.** On master, `DEFAULT_LIMITS` publishes `renderCeiling: 200_000` nodes and
`edgesDrawn: 500_000` as shipped defaults (`graphty-element/src/session/limits.ts`). An unmerged
branch enforces a measured ceiling of 100,000 nodes and 1,000,000 edges (commit 342a6dec, "raise
the render ceilings to 100,000 nodes and 1,000,000 edges"). The Large Graph Rendering capability
asks for 30 fps to 50,000 nodes / 200,000 edges and a "Graph too large" warning above 200,000
nodes (`design/designloom/capabilities/large-graph-rendering.yaml`). Every figure below is
compared with the 100,000 to 200,000 node range, and the conclusion holds at either end.

**Graph sizes in the requirements.** Each workflow states the graph it starts from in
`starting_state.node_count` (`design/designloom/workflows/*.yaml`); this corrects the earlier
reading that the workflows state no sizes (`graphty-today.md` 7.18).

| Workflow                     | Starting node count  | Personas                                |
| ---------------------------- | -------------------- | --------------------------------------- |
| Threat Hunting               | 100,000+             | Cybersecurity Analyst                   |
| Fraud Ring Investigation     | 10,000 to 1,000,000  | Fraud Analyst                           |
| Influencer Identification    | 10,000 to 1,000,000  | Marketing Network Analyst               |
| Knowledge Graph Construction | 10,000 to 10,000,000 | Knowledge Engineer                      |
| Graph-Based Recommendation   | 10,000 to 10,000,000 | ML Engineer                             |
| Anomaly Detection            | 1,000+               | Fraud, Cybersecurity, Analyst Alex      |
| Hub Investigation            | any                  | Analyst Alex, Fraud, Intelligence       |
| Community Analysis           | 10 to 100,000        | Alex, Emma, Fraud, Marketing            |
| Drug Target Discovery        | 1,000 to 20,000      | Bioinformatics Researcher               |
| the five biology workflows   | 50 to 5,000          | Genomics Cytoscape User, Bioinformatics |

The Gephi user (Analyst Alex, `personas/analyst-alex.yaml`) states no size of his own; his
workflows are "any" or up to 100,000. The analysts who investigate hubs (Hub Investigation lists
Alex, the Fraud Analyst and the Intelligence Analyst) inherit the Fraud Analyst's graphs of up to
1,000,000 nodes. Threat Hunting starts at or above every ceiling, and its phases (form a
hypothesis, translate it into a query, run it, triage the matches) begin with a query, not a
drawing, so the canvas is empty until the query narrows the graph.

**Answer: yes.** Five workflows, one of them Threat Hunting in every case, open on a graph larger
than the element will draw. The conceptual model already specifies this state: a client whose
drawing budget the graph in force exceeds "says so and draws nothing until the analyst narrows
it", while the summary, the table and every run keep working, and status text says "in force" and
keeps "drawn" for the client (`conceptual-model.md` 5.2). In that state a line such as "300,000
nodes in force; none drawn" is on screen, the summary describes 300,000 nodes, and a run computes
over 300,000 nodes, while the set of visible elements is empty.

**Consequence for the vocabulary.** "The visible graph" cannot be the name of the scope analysis
reads, because in these workflows it names the empty set. "The filtered graph" fails the other way:
with no filter step it is still the loaded graph, which the word does not suggest. "The graph in
force" holds in both cases, so the check confirms it rather than reopening the choice. Two leftovers
use the rejected word: key-insights 1.16 still names "the visible graph" as a scope, and
graphty-element's scope-drift record calls the current count `nowVisible`
(`graphty-element/src/session/runs/types.ts`), which counts members of the scope, not drawn
elements -- an element naming defect to file, not an app concern.

### "Metric" never collides with "distance metric" on screen

Question: does any planned on-screen string contain "distance metric", the sense of "metric" (a
distance function) that would make "metric" a poor name for a per-element value such as PageRank?

**None found.** A case-insensitive search for "distance metric", "distance-metric", "metric
space" and "triangle inequality" over `design/ui/framework/`, `design/designloom/` (capabilities,
workflows and personas), `graphty-element/src`, `graphty/src` and `algorithms/src` returns no
match. The capabilities use "metric" only in the per-element sense (`metric-histograms.yaml`,
`statistics-panel.yaml`, `selection-statistics.yaml` and others). graphty-element already speaks
this way on screen-bound text: its result field descriptions read "The number this metric measured
for this element" (`graphty-element/src/session/results/types.ts`), and its result shapes are
`node-metric` and `edge-metric`.

**One near miss, outside graphty's surface.** The Enrichment Map workflow mentions a "similarity
metric and cutoff" (`workflows/W22.yaml` lines 65 and 74). That setting belongs to the
EnrichmentMap Cytoscape app, which builds the map before graphty sees it, and its own
documentation names the options "Jaccard Coefficient", "Overlap Coefficient" and "Combined
Coefficient" rather than metrics (https://enrichmentmap.readthedocs.io/en/latest/Parameters.html).
If graphty ever builds such a network itself, the setting should be called "similarity
coefficient", which is the tool's own word and keeps "metric" single-sense.

So "metric" over "measure" costs no existing or planned string.

### A column named weight, written in both vocabularies

Question: write out the import check's role picker row, and its message, for an edge column
literally named `weight`, once with the framework's roles (distance, affinity, capacity) and once
with graphty-element's current `WeightMeaning` spelling, `"distance" | "strength"`
(`graphty-element/src/session/runs/types.ts`). By the import-check rules a column named weight
has the role "unknown" (`top-tasks.md`, "What an edge weight means").

With affinity:

```
weight   number   0.15 to 0.99   Meaning: [ Unknown v ]   Distance / Affinity / Capacity / Unknown

weight: meaning unknown. Shortest paths, betweenness and closeness ignore it; PageRank and
Louvain read a higher weight as a closer tie. Set its meaning.
```

With strength:

```
weight   number   0.15 to 0.99   Meaning: [ Unknown v ]   Distance / Strength / Capacity / Unknown

weight: meaning unknown. Shortest paths, betweenness and closeness ignore it; PageRank and
Louvain read it as a strength. Set its meaning.
```

The strength rows collide with two other strings that share the same screen:

- The import check's summary shows weighted degree, and its (i) text has to say what that is. The
  network-science name for the sum of edge weights at a node is **strength** (Newman and Barabasi;
  igraph's `g.strength(weights=...)`), which the framework renders as "weighted degree"
  (`graph-analysis.md` section 3, the weighted degree row; the igraph row of the degree table in `graph-tools.md` section 20). With a
  "Strength" role in the row above, "strength" means an edge's value in one row and a node's sum
  in the next.
- The same summary shows weak and strong components on a directed graph, and graphty-element's
  `components` run takes a parameter literally named `strength`, `"weak" | "strong"`, whose record
  note reads "Strength: weak" (`graphty-today.md` 7.24; `catalog/algorithms.ts`). A strength role
  would put "Strength: weak" and "Meaning: Strength" on one panel with unrelated meanings.

The affinity rows have neither clash, and the message still explains the role in plain words ("a
higher weight as a closer tie"), so nothing is lost for a reader who does not know the term. This
confirms the affinity ruling (`conceptual-model.md`, weight roles: "'Strength' is not a role name,
because it means weighted degree"). It also means graphty-element's published
`WeightMeaning.meaning: "strength"` is the spelling to change -- a published type, so it is an
element API change, not an app translation layer.

## Follow-up: status and scope strings at two sizes, the weight-role row, and the names to rename

### Status line and scope picker in two states

The rules these strings follow come from `conceptual-model.md` 5.2 and 5.3: analysis reads the
**graph in force** (the loaded graph after the filter pipeline); "drawn" belongs to the client; a
count reads "X of Y" only while a filter makes X differ from Y; a client over its drawing budget
draws nothing and says so. Edge counts and component sizes below are illustrative; node counts
come from the workflows (`design/designloom/workflows/`).

**Influencer Identification, 1,000,000 nodes, no filter, nothing drawn.** The Marketing Network
Analyst's graph is 10,000 to 1,000,000 nodes, above the shipped `renderCeiling` of 200,000
(`graphty-element/src/session/limits.ts`).

```
Status:  1,000,000 nodes, 3,200,000 edges. None drawn: too many to draw.
         Search, select, or add a filter step to draw part of it.

Run PageRank over
  (o) Graph in force       1,000,000 nodes   (no filter steps)
  ( ) Selection            none selected
  ( ) Largest component    912,400 nodes
  ( ) Saved set...
```

- "1,000,000 nodes": `session.status.counts.nodes` -- true.
- "None drawn": true under the framework rule. Whether graphty-element itself refuses to draw
  above the ceiling on master is not established by the code read here; `renderCeiling` is a
  published figure, not an enforced one.
- "Graph in force 1,000,000": true. The element's own spelling of this scope, `"visible"`, is
  FALSE in this state -- it resolves to 1,000,000 nodes while zero are drawn. The element's doc
  comment on `counts.visibleNodes` already admits it "is NOT the render set"
  (`graphty-element/src/session/types.ts`).
- No separate "Loaded graph" row: with no filter step it is the same set, and two rows with one
  number imply a difference that does not exist. It appears as soon as a filter step exists.
- "Selection: none selected": true, and still meaningful -- a selection can be made from search
  or the table with nothing drawn.
- "Largest component 912,400": true here, because the element reads it from
  `data.statistics().components.largestSize`, which is computed on the loaded graph, and with no
  filter the loaded graph is the graph in force.
- The betweenness row of the same picker at this size must add "sampled": the element
  approximates above `approximateAboveNodes: 2_000` (`limits.ts`), and the run's caveats say so.

**Hub Investigation, 50,000 nodes, one filter step "Degree at least 50".** Hub Investigation
states "any" size; 50,000 is chosen so everything in force is drawn.

```
Status:  1,204 of 50,000 nodes, 3,870 of 212,000 edges in force. 1 filter step.

Run betweenness over
  (o) Graph in force                      1,204 nodes   (1 filter step)
  ( ) Loaded graph                        50,000 nodes
  ( ) Selection                           3 nodes
  ( ) Largest component of loaded graph   48,900 nodes
  ( ) Saved set...
```

- "1,204 of 50,000 ... in force": true; it is `counts.visibleNodes` of `counts.nodes`, which the
  element documents as "the number a status bar means by 'showing 1,204 of 50,000'". No "drawn"
  clause: everything in force is drawn, so it is shown by exception only.
- "1 filter step": true; the element holds exactly one `filter` plus an optional time `window`
  (`VisibilityApi`, `graphty-element/src/session/visibility/VisibilityApi.ts`). A window would
  add "1 time window" to the line.
- "Graph in force 1,204 nodes": the COUNT is true, but the run would not honour it. Every
  element algorithm builds its graph from the whole data manager (for example
  `StronglyConnectedComponentsAlgorithm.compute` reads `getDataManager().nodes`), and
  `element-contract.md` ("Migration") records that every run executes over the whole loaded
  graph whatever scope it records. The row is false until the element honours scope -- an element
  defect, not something the app may paper over.
- "Largest component" alone would be FALSE: the element's `largest-component` scope resolves
  from the loaded graph's components, not the graph in force, so under a degree filter it names
  a component mostly hidden by the filter. Either label it "of loaded graph" (above) or have the
  element resolve it against the graph in force; the label is the minimum.
- "Selection 3 nodes": true.

### The weight-role row for a column named "weight"

By the import-check rule, a column named `weight` has an unknown role, because it means an
affinity in social and biological data and a cost in routing data (`top-tasks.md`, "What an edge
weight means").

```
weight   Meaning  [ Unknown           v ]
                    Distance  -- higher means further apart: a cost, length or time.
                                 Shortest paths, betweenness and closeness add it up.
                    Affinity  -- higher means a closer tie: similarity, confidence, contact
                                 count. PageRank, Louvain and Leiden read it; paths use 1/w.
                    Capacity  -- higher means more can flow: bandwidth, throughput.
                                 Max flow and min cut read it.
                    Unknown   -- paths ignore it; PageRank and communities read it as an
                                 affinity. Set a meaning to use it everywhere.
```

Strings that share the panel, checked for "strength":

| String                                                            | Meaning               | Clash?                                                                                                                                                                                                                                                                                                                                                     |
| ----------------------------------------------------------------- | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Weighted degree -- sum of the affinity column over a node's edges | node sum              | none. Network science calls this a node's **strength** (Barrat et al. 2004; igraph `strength()`: "Summing up the edge weights of the adjacent edges for each vertex"; NetworkX `degree(weight=)`: "the sum of the edge weights adjacent to the node"). Using "Strength" as a role name would give the word two meanings on one panel; "Affinity" avoids it |
| Components, "Connection: Weak / Strong"                           | directed reachability | none once renamed. Today the element's parameter is `strength: "weak" \| "strong"`, labelled "Strength", with record note "Strength: weak." -- it would sit beside "Meaning: Strength" with an unrelated sense. SciPy names the same switch `connection` ("weak" or "strong"); igraph names it `mode`                                                      |
| Modularity                                                        | partition quality     | the element's catalog labels it "Community strength" (`catalog/algorithms.ts`), a third sense of the word                                                                                                                                                                                                                                                  |

So the row itself is clean, and the clash is entirely in published element names, listed next.
The element also has no capacity meaning: max flow records `{ attribute: "capacity", meaning:
"strength" }` (`algorithms/MaxFlowAlgorithm.ts`), so `WeightMeaning` needs a third value.

### Published names using strength, view, notes and visible

Scope: `graphty-element/src/session`, exported through the `./session` entry
(`graphty-element/session.ts`) or `./extend`; catalog names that carry the same word into the
same screens are listed after each group because they share the panel. Names only in comments
or internal helpers are left out.

**strength** (one meaning to remove: an edge weight read as closeness)

- `WeightMeaning.meaning: "distance" | "strength"` (`session/runs/types.ts`), reached through
  `Caveats.weight`; `Caveats` is exported by `./session` and `./extend`. Rename the value to
  `"affinity"` and add `"capacity"`. Saved run records carry `"strength"`, so the project-file
  reader must map the old value.
- Values written by algorithms: PageRank, Louvain, Leiden, Girvan-Newman, label propagation and
  min cut (`attribute: "weight"`), max flow (`attribute: "capacity"`).
- Second meaning, visual: style channel `"node.glowStrength"`, plain name "Node Glow Strength",
  style path `"effect.glow.strength"` (`session/styles/channels.ts`). It is glow intensity (the
  channel's own caveat calls it that) and never shares a panel with weights; renaming to
  intensity is optional.
- Catalog, same panel: components parameter `strength` with label "Strength" and legacy key
  mapping `scc -> { strength: "strong" }` (`catalog/algorithms.ts`); record note "Strength: weak."
  (`algorithms/ConnectedComponentsAlgorithm.ts`); modularity plain name "Community strength".

**view** (framework meaning: a named capture of the working state)

- `NumericColumnView` (`session/results/types.ts`), returned by `RunResult.column()`: a
  read-through window over a column, a typed-array sense of "view". Rename (for example
  `NumericColumn`).
- No string literal or member named `view` is published by the session.
- Catalog, same screens: camera ids `"topView"`, `"sideView"`, `"frontView"`
  (`KNOWN_CAMERA_IDS`, `catalog/types.ts`), documented as "camera views". A saved view contains a
  camera, so a camera named "top view" invites confusion; `"top"`, `"side"`, `"front"` avoid it.

**notes** (framework meaning: prose an analyst writes, with targets)

- `Caveats.notes: readonly string[]` (`session/runs/types.ts`): machine sentences qualifying a
  run. Rename (for example `remarks`), so "notes" is free for the analyst's object.
- `StaleNote` (`session/runs/types.ts`, exported): a scope-drift record, not a note. Rename (for
  example `ScopeDrift`).
- Catalog `LayerSource` reason `"notes"` (`catalog/types.ts`): the element layer that draws
  analyst notes. This one matches the framework meaning; keep it.

**visible** (framework: "drawn" is the client's; analysis reads the graph in force)

- Scope value `"visible"` (`Scope`, `catalog/types.ts`, re-exported by `./session`), and the
  runs default `defaultScope ?? "visible"` (`GraphSession.ts`, `runs/RunsApi.ts`). Means "not
  hidden by the filter or window". False at 1,000,000 nodes with nothing drawn. Rename (for
  example `"in-force"`).
- `SessionStatus.counts.visibleNodes`, `.visibleEdges` (`session/types.ts`).
- `VisibilitySummary.visibleNodes`, `.visibleEdges` (with `totalNodes`, `totalEdges`),
  `FilterResult.visible: { nodes, edges }`, and `VisibilityChange` which extends it
  (`session/visibility/VisibilityApi.ts`).
- `StaleNote.nowVisible`: counts members of the recorded scope, which need not be the visible set
  at all (a selection scope, a saved set).
- `VisibilityApi.isVisible(id)`. A second meaning surfaces here: with `showContext` on, a hidden
  node IS drawn (faintly) and `isVisible` still returns false. So "visible" in the element is
  neither "drawn" (fails at 1,000,000 nodes) nor its complement (fails with context shown); it
  means "not hidden". `isHidden` states that directly.
- Namespace and event names: `session.visibility`, `SessionVisibilityApi`, `VisibilityApi`,
  `ScopeVisibilitySource` (`session/scope/ScopeApi.ts`), event `"visibility:changed"`
  (`SessionEventMap`), plan op and run algorithm name `"visibility.set"`. These describe hiding,
  which is accurate; they can stay if the counts and the scope are renamed.

Sources: Barrat, Barthelemy, Pastor-Satorras, Vespignani, "The architecture of complex weighted
networks", https://arxiv.org/abs/cond-mat/0311416 ; igraph `strength()`,
https://r.igraph.org/reference/strength.html ; igraph `components()` mode,
https://r.igraph.org/reference/components.html ; SciPy `connected_components` `connection`,
https://docs.scipy.org/doc/scipy/reference/generated/scipy.sparse.csgraph.connected_components.html ;
NetworkX `Graph.degree`, https://networkx.org/documentation/stable/reference/classes/generated/networkx.Graph.degree.html ;
graphty-element source paths as cited above.

## Follow-up: workflow counts for the information architecture -- note review, saved views, filters, styling a selection and loading two graphs

Counts over the 25 workflows in `design/designloom/workflows/`, read from each workflow's task
phases, decision points and information needs (the `requires_capabilities` lists are used only to
find candidates). Workflows are cited by title. "Clear" means the phase text says it; "plausible"
means the phase implies it.

### Note review in "Fraud Ring Investigation" and "Criminal Network Analysis"

Neither workflow names a separate review step, so the steps walked are the ones in which notes
already written are read to reach a decision.

| Workflow and phase                                                                                                                         | What is read                                             | Values of the target needed while reading?                                                                                                                                                                     |
| ------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fraud Ring Investigation, Determination (confirm fraud, clear the alert or escalate)                                                       | the evidence chain written during Evidence Documentation | Yes: the risk score of each related entity, community membership, the shared identifier (device, address, payment method) and the path to a known fraud case, all named under the workflow's information needs |
| Criminal Network Analysis, Data Integration and Network Building ("how to handle uncertain or conflicting information", entity resolution) | notes on source reliability and on suspected duplicates  | Yes: the source attribute and the identifying attributes of the two candidate entities                                                                                                                         |
| Criminal Network Analysis, Vulnerability Assessment                                                                                        | notes on suspected brokers and weak links                | Yes: betweenness and degree, which the workflow lists as the evidence for a broker                                                                                                                             |
| Criminal Network Analysis, Intelligence Production (briefings, key player profiles, chain of custody)                                      | every note on a key player                               | Yes: the centrality scores and community that make a person a key player                                                                                                                                       |

All four reading steps need values of the note's target, but only the few values the note is
about -- never the whole inspector. The personas say the same: the fraud analyst "documents
evidence trail meticulously for legal proceedings" and the intelligence analyst complains of
"difficulty documenting evidence for links" (`design/designloom/personas/fraud-analyst.yaml`,
`intelligence-analyst.yaml`). Figma's comment mode hides the inspector
(`design/ui/figma/flows.md`, comment mode), and Figma's annotation carries the layer properties it
is about, kept up to date (`figma.md`, follow-up on Figma evidence for the information
architecture). The evidence supports notes that pin chosen attributes of their target, rather
than a review mode that keeps the inspector open. For evidence the pinned value must be the
value when the note was written, with a mark when the live value differs.

### Saved views: navigation during analysis, or an output?

The four workflows that list `view-bookmarks`:

| Workflow                                     | Role of the saved view      | Evidence                                                                                                                                                      |
| -------------------------------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Visual Exploration - Overview to Detail      | navigate                    | pain point "Difficulty returning to a previous view state"; output is understanding, not a file                                                               |
| Iterative Analysis Cycle                     | navigate, and partly output | Explore: "try different views/encodings" and return between them; Conclude: "Documented findings", "difficulty documenting analysis path for reproducibility" |
| Threat Hunting                               | navigate, and partly output | Result Triage and Iteration return to promising matches; Response: "document hunt", "historical hunt results"                                                 |
| Reproducible Session and Network Publication | output                      | a session file holding every style, filter and annotation; a figure with a legend                                                                             |

Primary role: **3 navigate, 1 output**. Counting every role: **3 navigate, 3 output**. The
capability itself says both: "Return to saved views during exploration" and "Essential for ...
findings communication" (`design/designloom/capabilities/view-bookmarks.yaml`); the annotation
capability also stores annotations "as part of view bookmark" for "Findings Communication",
which does not list view bookmarks. A home for views only under Export serves the one output
workflow and makes the three navigating workflows open the export section to move around.
Figma's nearest object, a flow, is listed in the nothing-selected Prototype panel and again in
the flows list of the presentation view's top bar, which Present opens whatever is selected
(`design/ui/figma/header-and-modes/README.md` section 3; `figma.md`, follow-up on Figma evidence
for the information architecture).

### The longest filter pipeline, and whether it fits a 240 px chip popover

Eighteen workflows list `filtering`. Most name a single threshold ("What confidence threshold
for PPI data?" in "Drug Target Discovery"; "What degree threshold defines a hub?" in "Hub
Investigation"; "minimum audience size" in "Influencer Identification"). The longest:

| Workflow                                              | Conditions combined                                                                                                                                                                                                                 |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fraud Ring Investigation                              | 2-hop neighbourhood of the flagged entity, a time window on transactions, a risk-score threshold (the community is a fourth when "expand to community" is chosen): **3 to 4**                                                       |
| Cluster and Functionally Annotate a Molecular Network | a log2FC threshold on nodes, a confidence threshold on edges (inside the app only when the network is loaded as an edge list; with a STRING query it is a query parameter), clusters of fewer than 3 or 4 nodes dropped: **2 to 3** |
| Enrichment Map - Pathway Similarity Network           | node q-value at most a cutoff and edge similarity at least a cutoff: **2**                                                                                                                                                          |
| Condition Comparison - Disease vs Control Networks    | the largest changes in a difference score; the A-only / B-only / both split is an encoding, not a filter: **1 to 2**                                                                                                                |

The longest is four conditions, mixing nodes, edges, a neighbourhood and time. In Figma's popover
geometry (240 px wide, 208 px content, rows 32 px apart; `design/ui/figma/popovers-and-menus/README.md`
lines 229 to 240), four conditions as one row each plus a 24 px range slider for the numeric
ones take about 40 + 4 x 56 + 32 (add condition) + 32 (the count) = **328 px**, under the 537 px
colour picker. App text: "Filter" 1, "and" between conditions 3 (or one "Match all / any" switch
as Cytoscape's composite filters use, `graph-tools.md` Cytoscape section), "hops of" 2, a
Node/Edge word per condition when not shown as an icon up to 4, "Clear" 1, "of" and "nodes" on
the count 2: **about 9 to 13**. It fits. The one width limit: the label column holds about 13
characters of 11 px text, so an attribute such as "logFC_tumor_vs_normal" needs its own line.

### Workflows that edit the style-layer stack while something is selected

| Workflow                                                 | Step                                                                                                        | Kind      |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | --------- |
| Findings Communication                                   | Visualization Design: "highlight key findings"                                                              | clear     |
| Gene List to Interaction Network with Expression Overlay | "Which genes deserve a bypass highlight for the figure?", "thicker borders for a few genes"                 | clear     |
| Cluster and Functionally Annotate a Molecular Network    | Annotate each cluster: "For the selected cluster ..."; Show terms: colour clusters, label with the top term | clear     |
| Hub Gene Identification and Ranking                      | Report: "label the top 10"                                                                                  | clear     |
| Fraud Ring Investigation                                 | "Entity's immediate connections highlighted"                                                                | plausible |
| Criminal Network Analysis                                | Intelligence Production: visualizations of the key players                                                  | plausible |
| Enrichment Map - Pathway Similarity Network              | Explore: "highlight every pathway containing" a searched gene                                               | plausible |

**4 clear, 7 with the plausible ones**, of the roughly ten workflows that style anything. So the
stack must be reachable while something is selected. Figma reaches its definition list from the
selection: each style section of a selected layer has an "Apply styles" icon that opens the 240
px style and variable picker, with "Create style" inside it, without clearing the selection
(`design/ui/figma/popovers-and-menus/README.md` section 8). Highlighting what a search found
(and the connections of a selected entity) is the selection outline in several of these steps
rather than a layer; the four clear cases each need a lasting layer.

### Workflows that load two graphs

**One**: "Condition Comparison - Disease vs Control Networks" loads two networks ("Import each
network as its own named network in one session") and builds a merged third. Its adoption note
records that several named networks in one session are not yet supported and that a second file
is loaded as side B of Compare mode. The others that look like several graphs are one graph:
"Criminal Network Analysis" and "Knowledge Graph Construction" merge several sources into one
graph; "Network Evolution Analysis" slices one graph into time windows; the subnetworks of
"Gene List to Interaction Network with Expression Overlay", "Drug Target Discovery" and
"Cluster and Functionally Annotate a Molecular Network" are subsets of one graph, which
`key-insights.md` 1.18 models as sets; "Reproducible Session and Network Publication" saves
whatever the session holds. A rail labelled "Graph" holds for 24 of 25 workflows. For the one
exception Figma's precedent is the Pages list: the file holds many pages, the rail button names
the container ("File"), and the list of pages appears only inside it
(`design/ui/figma/left-sidebar/00-left-default.png`), which matches "a graph switcher appears only
when the list holds more than one" (`key-insights.md` 1.18).

## Follow-up: reading notes from their pinned values alone in the two investigation workflows

A paper walk of the four steps in which notes are read to reach a decision, in "Fraud Ring
Investigation" (Determination) and "Criminal Network Analysis" (Data Integration and Network
Building, Vulnerability Assessment, Intelligence Production), with the reader shown only the
note's text and the values its writer pinned (the value at writing, marked when the live value
differs; `figma.md`, follow-up on Figma evidence for the information architecture). The question
for each step: does the reader need a value the writer could not have known to pin? Phases and
information needs are quoted from `design/designloom/workflows/` (the two files titled above).

| Step                                                                                                                                       | Values the writer could pin                                                                                                             | Value the writer could not have pinned                                                                                                                                                                                                                                                                                                  | Enough from pins alone?                                                                                                                                                             |
| ------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fraud Ring Investigation, Determination (confirm, clear or escalate)                                                                       | the flagged entity's risk score, its community, the shared identifier, the path to a known fraud case (the path is a target of its own) | (a) a known fraud case confirmed after the note was written, which creates a "path to known fraud cases" the note cannot contain; (b) new transactions on the entity, which the information need "Transaction timeline (velocity, sequence patterns)" reads; (c) the risk scores of related entities that were not targets of this note | No. Two of the three are values that did not exist at writing, and the live-differs mark on a pinned value catches neither (they are new rows and new attributes, not changed ones) |
| Criminal Network Analysis, Data Integration and Network Building ("how to handle uncertain or conflicting information", entity resolution) | the source attribute and the identifying attributes of both candidate entities (the note targets both)                                  | the conflicting value from a source integrated after the note ("Collect and merge records" arrives source by source); after a merge, the merged entity's attributes                                                                                                                                                                     | No. A conflict note written at source A cannot pin source B's column, which is the conflict itself                                                                                  |
| Criminal Network Analysis, Vulnerability Assessment ("single points of failure, critical brokers, weak links")                             | betweenness and degree, pinned during Structural Analysis where the broker suspicion is written                                         | the removal-impact result (components or reach after removing the node; the workflow lists `removal-impact-analysis`) and whether the node is a cut vertex, both computed in this phase, after the note                                                                                                                                 | No, for notes written in the earlier phase. Yes for notes written in this phase                                                                                                     |
| Criminal Network Analysis, Intelligence Production (key player profiles, chain of custody)                                                 | the centrality scores and community that make the person a key player                                                                   | the rank among all nodes after later merges and re-runs; pins hold the raw value, and "Hierarchy understood" is a relative judgement                                                                                                                                                                                                    | Mostly. The pinned value plus its live-differs mark is the evidence trail the step needs; the rank is readable only from the live result                                            |

**Result: three of the four steps need at least one value the writer could not have pinned.**
The unpinnable values fall into two kinds, and neither is a changed value of a pinned attribute:
values that came into existence after writing (a later source, a later confirmed case, a later
run) and values of objects the note did not target (the related entities). So pinned values
serve the evidence-trail half of each step ("Evidence chain: complete documentation for each
determination"; "Chain of custody maintained"), and the decision half still needs the target's
live values. What the walk supports: a note shows its pinned values as evidence, and its target
name is a link that shows the target's live inspector one step away (the note mode replaces the
inspector, as Figma's comment mode does, so the link is how the reader gets back). A note does
not need to pin everything "just in case"; the pins are what the writer is asserting, and the
live values are what the reader checks against. The personas agree on the split: the fraud
analyst "documents evidence trail meticulously for legal proceedings" (evidence as written) and
the fraud workflow's decision point "When do I have enough evidence to take action?" is read
against the current graph (`design/designloom/personas/fraud-analyst.yaml`).

## Follow-up: coined words met walking Community Analysis and Fraud Ring Investigation

**Question.** A concept list of about 14 words graphty coins for itself is proposed as the
vocabulary a new analyst must learn. Walking "Community Analysis" and "Fraud Ring Investigation"
phase by phase, which coined words does the analyst actually meet on screen, and does the count
agree? The 14-item list itself is not written in any framework document, so the walk counts
from the glossary directly and gives a count to check the list against.

**Method.** A word counts as coined when `glossary.md` gives it tier Screen and its evidence is
graphty's own (not a field word from NetworkX, igraph, Gephi, Cytoscape or Newman, and not a
Figma word used in Figma's sense). Each workflow phase (`design/designloom/workflows/`) was
walked through the routes in `information-architecture.md` and the state words and marks in
`glossary.md` 10. Self-explaining command labels ("Run on full graph", "Create set") are counted
separately, since a reader does not need to learn them.

| Coined word                               | Community Analysis phase                                         | Fraud Ring Investigation phase                                        |
| ----------------------------------------- | ---------------------------------------------------------------- | --------------------------------------------------------------------- |
| working set (and the chip "Working set:") | --                                                               | Alert Contextualization (Filter to neighbors)                         |
| filtered out (Find mark)                  | --                                                               | Pattern Recognition, Ring Identification                              |
| Include found nodes                       | --                                                               | Pattern Recognition, Ring Identification                              |
| automatic layer                           | Detection (Louvain paints itself)                                | Ring Identification (community run)                                   |
| covered, partly covered                   | Boundary Analysis (betweenness as size over the community layer) | Risk Scoring (a risk layer over the community layer)                  |
| No value                                  | Boundary Analysis (size layer)                                   | Risk Scoring                                                          |
| Memberships                               | Characterization                                                 | Ring Identification ("is the entity in a suspicious cluster?")        |
| group name                                | Characterization ("hard to label communities")                   | Ring Identification ("the ring")                                      |
| boundary (Statistics subsection)          | Boundary Analysis                                                | Alert Contextualization (the expansion's cut edges)                   |
| Within each group                         | Characterization ("top nodes per community")                     | --                                                                    |
| Between groups                            | Inter-Community Structure                                        | --                                                                    |
| Earlier run                               | Validation (a second resolution)                                 | --                                                                    |
| Carry over to new run                     | Validation (names onto the new partition)                        | --                                                                    |
| Out of date                               | Validation (after a filter change)                               | Ring Identification (after the working set grows)                     |
| on: <scope> state                         | --                                                               | Ring Identification (a run on the working set against the full graph) |
| expression attribute                      | --                                                               | Risk Scoring                                                          |
| neighborhood aggregate                    | --                                                               | Risk Scoring ("shared identifiers with other entities")               |
| quoted value                              | --                                                               | Evidence Documentation                                                |
| methods text                              | --                                                               | Evidence Documentation (export for the case file)                     |

**Result: 19 coined words, 11 in Community Analysis and 15 in Fraud Ring Investigation,** with 7
in both. The count does not confirm a 14-item list unless the list folds marks and state words
(filtered out, No value, Earlier run, Out of date, on: <scope>) into one concept, "a value's
state", which would bring it to 15. Three words carry most of the load in both walks and are
the ones worth teaching first: working set, automatic layer and covered. Words met only once
(quoted value, methods text, Carry over to new run) are learnable at the point of use. The walk is
a desk walk against the framework documents, not an observed session.

Sources: `design/ui/framework/glossary.md` sections 1, 2, 10 and its term tables;
`design/ui/framework/information-architecture.md` 4, 5, 9;
`design/designloom/workflows/W04.yaml`, `W06.yaml`.

## Follow-up: Include clicks per case in Fraud Ring Investigation and Criminal Network Analysis

**Question.** "Include found nodes" adds nodes a search found outside the working set. With a
depth (hops) on Select neighbors, does a case need 5 Include clicks or fewer?

**The rule that decides the count.** Select neighbors never needs Include: "When the filters
include a working set, Select neighbors also adds the new nodes to it" (`conceptual-model.md`
5.1). Include is offered only by searches that read past the working set: Find, "Select same
value", and paths between named endpoints (`conceptual-model.md` 5.3), plus the separate offer to
widen a data step ("12 more beyond filter 'amount < 10'"). So depth on Select neighbors saves
Select neighbors clicks (one click for two hops instead of two), but does not change the Include
count at all. This matches the expand-from-seeds tools graphty borrows from: Bloom's and
Linkurious's Expand add the neighbours to the view directly (`graph-tools.md` 20.21).

| Case                                                                                                                                                                           | Searches that reach past the working set                                              | Include clicks |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- | -------------- |
| Fraud ring, typical alert: one flagged account, one shared device, one path to a known fraud case                                                                              | Select same value on the device (1), Find path to the known case (1)                  | 2              |
| Fraud ring, heavy alert: three shared identifiers (device, address, payment method, the workflow's list), two known cases, one small-transaction data step hiding ring members | 3 + 2 + 1 (widen the data step)                                                       | 6              |
| Criminal network, whole case loaded (100 to 10,000 nodes, the workflow's range) and no working set                                                                             | none; searches find everything in the filtered graph                                  | 0              |
| Criminal network, seeded from named suspects, grown by Select neighbors, then names from a new source found one by one                                                         | one per new name found outside the set; the workflow integrates sources one at a time | 2 to 5         |

**Result: 5 or fewer in three of the four cases; the heavy fraud alert needs 6.** The count is
driven by how many identifiers and known cases the analyst checks, not by expansion depth. If 6
is too many, the lever is "Select same value" and Find with a list: including every hit of one
search in one click (already the design) and letting a pasted list of identifiers be one search
would bring the heavy case to 3 or 4. A desk walk, not an observed session.

Sources: `design/ui/framework/conceptual-model.md` 5.1, 5.2, 5.3;
`design/ui/framework/information-architecture.md` 3 (Find) and 9;
`design/ui/framework/research/graph-tools.md` 20.21;
`design/designloom/workflows/W06.yaml`, `W09.yaml`.

## Follow-up: is the table open most of a Community Analysis session, once result readings live in the dock

**Question.** `information-architecture.md` 14 leaves open "Is the table open most of a
session?", with the fallback "the dock opens on the first run". The check was specified for
"Hub Gene Identification and Ranking"; here it is run on "Community Analysis", on the assumption
that a result's readings (its items and their values) are read in the bottom dock's table rather
than in the result's editor popover.

**Walk, phase by phase** (phases from `design/designloom/workflows/W04.yaml`; homes from
`information-architecture.md` 5):

| Phase                     | What the analyst reads                                                        | Home                                                                                                              | Dock open?                        |
| ------------------------- | ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| Detection                 | community count, the picture                                                  | the result's row and the canvas                                                                                   | no, until the first "N more"      |
| Validation                | modularity; "community size distribution (one giant community is suspicious)" | modularity at the result; the size distribution is the Groups tab sorted by size                                  | yes                               |
| Characterization          | per group: size, density, common attributes, internal hubs                    | Groups tab with group Statistics and a "most common value" column; "top nodes per community" by Within each group | yes                               |
| Boundary Analysis         | bridge nodes (high betweenness)                                               | Nodes tab sorted by betweenness, or the histogram band                                                            | yes (histogram alone is possible) |
| Inter-Community Structure | how groups relate                                                             | the Groups tab's Between groups view                                                                              | yes                               |

**Result: yes, the dock is open in four of five phases,** and the only phase without it is the
first minute. By the check's own rule the fallback applies to this workflow: open the dock on
the first run of a partition, on its Groups tab. This agrees with the earlier finding that the
table is used "overwhelmingly to sort and compare many rows" in seven workflows, and with
Cytoscape, whose Table Panel is docked below the network with selection synchronised
(`graph-analysis.md`, the section on what the table is for; `graph-tools.md` 1). Gephi puts the
same reading in the Data Laboratory, a separate screen (`graph-tools.md` 20.22), which is the
switching cost a docked table avoids. Phase count is a proxy for time; the check as written asks
for measured session time, which needs an observed session.

Sources: `design/ui/framework/information-architecture.md` 2, 5, 14;
`design/ui/framework/research/graph-analysis.md`; `design/ui/framework/research/graph-tools.md`
1, 20.22; `design/designloom/workflows/W04.yaml`.

## Follow-up: which surprises weekly analysts more -- a legend that changes after a filter, or node sizes that disagree with the inspector's degree

**Question.** Ask three weekly analysts which surprises them more.

**No analysts were asked.** No interview or survey channel exists in this repository, and a
persona file is not a person. What can be said without them:

- Five personas are weekly users: `analyst-alex.yaml`, `marketing-analyst.yaml`,
  `supply-chain-analyst.yaml`, `bioinformatics-researcher.yaml`, `genomics-cytoscape-user.yaml`
  (`design/designloom/personas/`). None names either surprise. The genomics persona's stated
  pains are about the legend being exported at all, not about it changing.
- The framework already settles the size-against-degree case: "The live reading follows the
  chip; the bound layer is a run and marks its scope" (`principles.md`, conflict ledger). So the
  disagreement is shown, not hidden; the open question is only whether the mark is read.
- The nearest published evidence is Qu and Hullman: inconsistent encodings across views make
  interpretation "slow and error-prone", and authors noticed and fixed or justified them when
  warned (this file, section 3.8; abstract only). That study concerns encodings that disagree
  across views, which is the size-against-degree case (two views of one number); it says nothing
  directly about a legend rescaling after a filter.
- Mechanism: a legend that rescales after a filter changes in plain sight, next to the change
  that caused it. Sizes that disagree with the inspector are noticed only when the analyst
  happens to compare two places, and are then read as a wrong number. The second is the likelier
  to produce a wrong conclusion; the first the likelier to be noticed.

**How to actually answer it.** Three analysts are too few to rank two surprises; a
five-second-test pair or a short forced-choice survey with 15 to 20 analysts, each shown both
scenarios in counterbalanced order, would. The owner would need to supply the recruits; see this
file's earlier follow-up on a top-task vote or first-click test with real analysts.

Sources: `design/designloom/personas/*.yaml`; `design/ui/framework/principles.md` (conflict
ledger); this file, section 3.8 and its source list (Qu and Hullman, IEEE TVCG 24(1), 2018,
https://doi.org/10.1109/TVCG.2017.2744198).
