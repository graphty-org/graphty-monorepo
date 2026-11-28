# Personal Knowledge Graphs and Note Networks

People who keep their notes in "networked" note-taking tools -- Obsidian, Logseq, Roam Research, TheBrain, Emacs
org-roam, VS Code Foam, and canvas tools such as Obsidian Canvas and Heptabase -- are probably the largest group of
non-specialists who look at a node-link drawing of their own data. Each note is a node; each `[[wikilink]]`, tag, linked
property or hand-drawn arrow is an edge; the graph changes every time they type. They open a graph view for a few
reasons: to see what is near the note they are writing (the "local graph"), to find notes nobody links to ("orphans"),
to get a colored overview of what their notes contain, to arrange ideas by hand on a canvas, and -- for a minority -- to
run real network analysis on their own thinking. Forum evidence is blunt: the whole-vault ("global") graph is widely
described as beautiful but useless once a vault passes a few thousand notes, while the local graph, filtered and colored
views, structured neighborhoods (TheBrain) and hand-placed canvases are what people actually use.

Two facts shape what a graph product must build for them. First, they do not leave their note app to look at a graph:
the graph views they install are **plugins that run inside the note app** and read the app's own resolved link index,
so the integration model is "embed in the host and consume its link graph", not "import a folder". Second, a growing
share of edges is **machine-made** (embedding similarity, LLM entity extraction), which adds provenance and privacy
requirements.

Quotations were checked against the cited page. Where a claim rests on a search summary or third-party estimate, it
says so. "No source found" means a search was made and nothing turned up.

## 1. Population

### Who they are

- **Knowledge workers keeping a "second brain".** Engineers, product people, consultants, writers and managers who keep
  work and personal notes in Obsidian, Logseq or Roam. Self-reports: a standup comedian keeping joke notes, a user who
  imported 2,500 unlabeled notes and uses the graph to see "where I am", a user with Kindle highlights for "over a
  thousand" books [Obs-WhatsThePoint]; a project manager who wants "files linking into a manufacturing folder"
  [Obs-DepthFilter].
- **Zettelkasten practitioners.** Followers of Niklas Luhmann's slip-box method (atomic permanent notes, structure notes
  or Maps of Content, Folgezettel sequences). The most deliberate linkers and the most opinionated about graph views
  [ZK-Folgezettel] [Obs-MiloRelationships] [Obs-Presets].
- **Academics and graduate students.** Zotero with Better BibTeX citekeys plus Obsidian, one literature note per paper
  [USU-ZoteroObsidian] [Obs-PhD] [Obs-AcademicZK]. A Roam-based "discourse graph" variant (questions, claims, evidence,
  sources) was studied with 48 researchers over about three years; 14 of 23 surveyed current users were academics
  [Chan-Synthesis]. A 2025 case study observed seven industry researchers who all used Obsidian [SecondBrains-arXiv].
- **Visual thinkers and canvas mappers.** People who reject the force-directed graph and place cards by hand on a
  canvas, drawing labeled arrows: Obsidian Canvas (stored as JSON Canvas files) [Obsidian-Canvas] [JSONCanvas-Blog],
  Heptabase whiteboards, Obsidian Excalidraw. One forum user wants the canvas "as a post-it, kanban, timeline, topic
  organization view" with "lines/areas in the background" for "visual partition" [Obs-Spatial]. Third-party
  comparisons describe Heptabase as the product where "The canvas is the thinking" and its graph as secondary
  [Fabric-Heptabase] (Fabric is a competing vendor; no statement by Heptabase itself was found).
- **Developer note-takers (Emacs, VS Code).** Emacs org-roam users keep notes as Org files indexed in a SQLite database
  and view them with org-roam-ui, a browser graph that follows the node open in Emacs [OrgRoam-Manual] [OrgRoamUI].
  Some analyze the database directly in R with igraph [Prevos-OrgRoam]. VS Code users use Foam, whose "Foam: Show
  Graph" command opens a force graph of notes and tags [Foam-Graph]. This group writes code and expects scriptable data.
- **Typed-object and outliner users.** Tana (supertags: "a tag that carries its own database of properties"
  [AE-TanaCapacities]), Capacities (one object type per object; a comparison page describes a tag-network graph view
  [Capacities-Tana], search summary), and the Logseq database version, where tags are classes with inherited
  properties and Node-type properties link nodes [Logseq-DB]. Whether Tana has a graph view is disputed between sources
  (search summary); not resolved here.
- **Long-term "brain" curators.** TheBrain users who build one hand-made network over decades. Jerry Michalski's Brain:
  "over 572,000 Thoughts (nodes)" and "over 1,120,000 links" as of March 2024, entered by hand since December 1997
  [JerrysBrain]. TheBrain draws only the active thought's neighborhood (Workflow F).
- **Digital gardeners.** People who publish part of their vault with Obsidian Publish or Quartz; Quartz shows a local
  graph on every page (defaults: local depth 1, global depth -1 meaning all) [Quartz-Graph].
- **LLM-assisted note-takers.** A fast-growing set of plugins extracts entities and relations from notes with a local or
  cloud model and draws them as a graph (Workflow I). Smart Connections, which finds semantically related notes with a
  local embedding model, has about 1.2 million downloads -- more than any graph-view plugin [SmartConnections].

### How many

- **Obsidian.** No official count. The CEO was reported as estimating around one million users, unknowable precisely
  because the app has no analytics [Substack-CEO] (search summary). Third-party claims of 1 to 1.5 million
  [Fueler-Obsidian] are unverified. 2,667 community plugins in October 2025 [arXiv-PluginMaintenance] (search summary).
- **Plugin downloads** (directory snapshots, different dates): Smart Connections about 1.2M [SmartConnections];
  Breadcrumbs (typed hierarchy links) 258,154 [Breadcrumbs]; Juggl (Cytoscape.js workspace) 140k [Juggl]; Extended
  Graph about 87k [ExtendedGraph]; 3D Graph 37k to 84k [3DGraph]; InfraNodus about 35k [InfraNodus]; Advanced Graph View
  10k [AdvancedGraphView]; Simple Graph Builder about 4k [SimpleGraphBuilder]; LLM Wiki 807, now archived [LLMWiki];
  Expansive Local Graph 468 [ExpansiveLocalGraph]; KG Forge 220 [KGForge]. Six-figure numbers for graph replacements
  show the built-in view does not satisfy a large minority, and that the replacement they choose is an in-app plugin.
- **Logseq.** About 44,000 GitHub stars [StarHistory-Logseq] (search summary). No primary user count found.
- **Roam Research.** No user count found; commentary describes declining engagement after 2021 [Every-FallOfRoam]
  (search summary). The discourse-graph extension had about 30 daily active users in November 2022 [Chan-Synthesis].
- **org-roam, Foam, Heptabase, Tana, Capacities, TheBrain.** No user counts found.

### Frequency, skill and team context

- **Frequency.** Note-taking is daily; graph use is not. Many never open the graph or disable it ("never found it
  helpful", "I'm absolutely non-visual") [Obs-WhatsThePoint] [Obs-HowManyNotes]. Heavy users keep the local graph
  docked beside the editor permanently [Obs-GraphUseless]; others open it for maintenance or to regain context
  [Obs-HowDoYouUse]. Canvas and TheBrain users navigate through the spatial view continuously.
- **Graph literacy.** Mostly none formally: they think in "notes", "links", "backlinks", "hubs", "MOCs", "orphans". A
  minority wants metrics: one user exported a vault to Gephi to learn "which ideas hold everything together"
  [Obs-Gephi]; plugins expose Jaccard, Adamic-Adar, co-citation, label propagation [GraphAnalysis], PageRank and
  Louvain [AdvancedGraphView].
- **Coding ability.** Wide. Many write CSS snippets, Dataview queries and search syntax (`-path:`, `tag:`). A smaller
  group writes Python (obsidiantools gives a NetworkX graph [obsidiantools]), R (igraph over org-roam.db
  [Prevos-OrgRoam]), jq [Obs-Gephi] or reads `app.metadataCache.resolvedLinks` through `eval` [Obs-CLIGraph].
- **Team context.** Almost entirely solo and private. Exceptions: labs sharing a discourse graph [DG-News] and published
  gardens. Privacy is a selling point: plugins advertise "No telemetry. No analytics." and "no network requests at all"
  [AdvancedGraphView] [KGForge].

## 2. Personas

### Priya -- knowledge worker with a growing vault (id: pkm-knowledge-worker)

- **Role.** Senior product manager; Obsidian for three years; daily, meeting, people and project notes; about 4,000 notes.
- **Tools.** Obsidian core graph and local graph, search, bookmarks, Dataview; Extended Graph installed from the plugin
  directory.
- **Data.** Markdown in nested folders, wikilinks to people and projects, a few hundred tags, property links such as
  `project: "[[Alpha]]"`.
- **Goals.** See what relates to the note she is editing; recover project context after weeks away; spot unlinked notes.
- **Frustrations.** Global graph is a hairball of daily notes; "Where am I?" [Obs-FirstTimeHalfYear]; filters and color
  groups lost or re-typed [Obs-Presets]; property links clutter depth 2 [Obs-HideFrontmatter]; layout differs every time
  [Obs-WhatsThePoint].
- **Grounding.** [Obs-WhatsThePoint], [Obs-HowDoYouUse], [Obs-FirstTimeHalfYear], [Obs-Presets], [Obs-HideFrontmatter].

### Tomas -- Zettelkasten writer (id: zettelkasten-writer)

- **Role.** Independent essayist; atomic permanent notes, structure notes, a "Home" note; "Don't make a link you can't
  explain" [Obs-AcademicZK].
- **Tools.** Local graph at depth 2 to 3 in a sidebar; global graph filtered by path and grouped by note type; Breadcrumbs
  or ExcaliBrain for typed up/down/next links; Juggl for project workspaces.
- **Data.** 2,000 to 10,000 notes, 3 or more links per note, typed relations in frontmatter (`up:`, `parent::`), "TK"
  placeholder notes for ideas still to write [Obs-TwoWays].
- **Goals.** Second-order connections through shared concepts; archive "health" by coloring MOCs, status and atomic
  notes [Obs-Presets]; the next note to write.
- **Frustrations.** Excluding hubs "also cuts off anything they might form a path to" [Obs-LocalFilter]; depth stops at
  5 [Obs-IncreaseDepth]; traversal stops at tags [LocalGraphTagLinks]; Folgezettel order invisible in a force layout
  [ZK-Folgezettel].
- **Grounding.** [ZK-Folgezettel], [Obs-MiloRelationships], [Obs-LocalFilter], [Obs-Presets], [Obs-TwoWays].

### Dr. Amara Osei -- graduate researcher with Zotero (id: academic-literature-note-researcher)

- **Role.** Fourth-year PhD student (environmental science) following a lab handbook's reading workflow [USU-Handbook].
- **Tools.** Zotero with Better BibTeX and annotation colors; Obsidian with Zotero Integration, Templater, Dataview
  [USU-ZoteroObsidian]; occasionally a citation-graph plugin [LiteratureGraph].
- **Data.** 300 to 1,500 literature notes named by citekey, imported highlights, hand-written `[[concept]]` links, MOCs per
  chapter. Re-imports overwrite edits outside `persist` blocks [USU-ZoteroObsidian].
- **Goals.** Which papers share a concept [Obs-PhD]; gaps in reading; a chapter outline from linked claims.
- **Frustrations.** Note graph and citation graph are separate [LiteratureGraph]; hub concepts dominate; three of four
  academic workflow write-ups read never mention the graph [USU-ZoteroObsidian] [USU-Handbook] [Obs-AcademicZK].
- **Grounding.** [USU-ZoteroObsidian], [USU-Handbook], [Obs-PhD], [Obs-AcademicZK], [Chan-Synthesis].

### Kenji -- vault analyst and plugin tinkerer (id: pkm-vault-analyst)

- **Role.** Data engineer treating an 18,000-note vault as a dataset. Comparable self-report: 18,413 notes, 57,800
  internal links, graph unused because "it takes around 4 minutes before the entire graph is build" [Obs-HowManyNotes].
- **Tools.** Graph Analysis [GraphAnalysis]; Advanced Graph View [AdvancedGraphView]; obsidiantools and NetworkX
  [obsidiantools]; Gephi via a CSV edge list [Obs-Gephi]; Simple Graph Builder with a local Ollama model
  [SimpleGraphBuilder].
- **Goals.** Notes that hold the vault together; missing-link suggestions; clusters named by content; growth over time.
- **Frustrations.** No built-in whole-graph export ("No one script yet, just a series of moves" [Obs-Gephi]; the CLI
  exports links one note at a time [Obs-CLIGraph]); external parsers give a graph "slightly different to what you see in
  the Obsidian app" [obsidiantools]; plugins that patch the core graph break because it "lacks an API" [ExtendedGraph].
- **Grounding.** [Obs-HowManyNotes], [Obs-Gephi], [Obs-CLIGraph], [GraphAnalysis], [obsidiantools].

### Lena -- visual thinker and canvas mapper (id: pkm-canvas-mapper)

- **Role.** UX researcher and workshop facilitator; thinks spatially; abandoned the force graph because "the layout
  moves" and she cannot pin a node where she put it.
- **Tools.** Obsidian Canvas for project boards, Excalidraw for sketches; tried Heptabase whiteboards.
- **Data.** 20 to 40 `.canvas` files, each with 30 to 200 cards: note cards pointing at vault files, text cards, web
  links, groups as labeled regions, labeled arrows ("causes", "contradicts"). Positions are hers and meaningful.
- **Goals.** Lay out an argument or research synthesis by hand; see which canvases a note appears on; turn a sketch into
  real linked notes.
- **Frustrations.** Arrows drawn on a canvas are not links: they never reach backlinks or the graph view
  [ObsQuirks-CanvasLinks]; text cards don't appear in backlinks until converted to files [Obsidian-Canvas]; no view
  mixes her hand placement with automatic layout of everything else. (Persona composite; the frustrations are sourced.)
- **Grounding.** [Obsidian-Canvas], [JSONCanvas-Spec], [ObsQuirks-CanvasLinks], [Obs-Spatial], [Fabric-Heptabase].

### Raj -- Emacs/VS Code developer note-taker (id: pkm-developer-note-taker)

- **Role.** Backend engineer and part-time researcher; notes in Emacs org-roam (or Foam in VS Code at work).
- **Tools.** org-roam with autosync, org-roam-ui in a browser beside Emacs, R and igraph for analysis
  [OrgRoamUI] [Prevos-OrgRoam].
- **Data.** 1,000 to 5,000 Org files and headings with IDs, indexed in `org-roam.db` (SQLite); ID links are the edges
  [OrgRoam-Manual].
- **Goals.** A graph that follows him as he moves between notes; degree, backlinks and communities he can script.
- **Frustrations.** org-roam-ui reloads the whole graph on every save; 3D mode is slow ("man is it slow") [OrgRoamUI];
  the built-in `org-roam-graph` renders a static Graphviz image [OrgRoam-Manual]; community validation is a judgment
  call [Prevos-OrgRoam].
- **Grounding.** [OrgRoam-Manual], [OrgRoamUI], [Prevos-OrgRoam], [Foam-Graph].

## 3. Use cases

Order is a **judgment** from the threads and plugin pages read for this document, weighted by how many distinct sources
mention each use and by plugin download counts. No mentions were counted systematically, so the order is not a measured
ranking.

| #   | Question the user answers                                                                      | Frequency                                               | Stakes                                        | Evidence                                                            |
| --- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------- |
| 1   | What is connected to the note I am writing (1 to 3 hops)?                                      | Continuous for users who dock the local graph           | Low per use; how they find related notes      | [Obs-GraphUseless] [Obs-WhatsThePoint] [ZK-Folgezettel] [OrgRoamUI] |
| 2   | Which notes are related in meaning even if not linked?                                         | Continuous for Smart Connections users                  | Low to medium                                 | [SmartConnections]                                                  |
| 3   | Which notes are orphans or under-linked, so I can link, merge or delete them?                  | Periodic maintenance                                    | Medium                                        | [Obs-HowDoYouUse] [FindUnlinked] [Logseq-LinkedStructure]           |
| 4   | What does my vault contain, by folder, tag or note type, with noise removed?                   | Occasional                                              | Low to medium; also a "showcase"              | [Obs-GraphUseless] [Obs-Presets]                                    |
| 5   | Regain context: start from a topic and follow its connections outward                          | Occasional                                              | Medium                                        | [Obs-DepthFilter] [ExpansiveLocalGraph]                             |
| 6   | Navigate a typed hierarchy (parents, children, siblings, jumps)                                | Continuous for TheBrain, ExcaliBrain, Breadcrumbs users | Medium: main navigation                       | [TheBrain-Relationships] [ExcaliBrain] [Breadcrumbs]                |
| 7   | Lay out ideas by hand with labeled relations and regions                                       | Continuous for canvas users                             | Medium                                        | [Obsidian-Canvas] [Obs-Spatial]                                     |
| 8   | Which entities (people, concepts, organizations) do my notes mention and how are they related? | Per project; growing                                    | Medium; privacy risk if a cloud model is used | [SimpleGraphBuilder] [NeuralComposer] [LLMWiki-Forum]               |
| 9   | Which notes should be linked (link prediction, co-citation)?                                   | Occasional, power users                                 | Medium                                        | [GraphAnalysis] [InfraNodus]                                        |
| 10  | Which papers share a concept; how do sources cite each other?                                  | Per writing project                                     | High for a thesis                             | [Obs-PhD] [LiteratureGraph]                                         |
| 11  | Which notes hold everything together; how do notes cluster?                                    | Rare                                                    | Low                                           | [Obs-Gephi] [Prevos-OrgRoam] [AdvancedGraphView]                    |
| 12  | Find claims supported or opposed by evidence                                                   | Per project; small population                           | High for researchers                          | [Chan-Synthesis]                                                    |
| 13  | How did my vault grow over time?                                                               | Rare                                                    | Low                                           | [Obsidian-GraphHelp] (Animate)                                      |

Counter-evidence: many users do not use the graph at all. One wrote "I found myself spending more time tweaking the
graph criteria than optimizing my vault"; another, "chaotic patterns have no meaning" [Obs-WhatsThePoint]. A Logseq
answer calls the graph useful for spotting missing or mistaken links rather than navigation [Logseq-LinkedStructure].

## 4. Step-by-step workflows

Times per step: no source found for most; these are seconds-to-minutes interactive actions.

### Workflow A -- Local graph docked beside the note being written (Obsidian)

Sources: [Obsidian-GraphHelp], [Obs-GraphUseless], [LocalGraphDepth], [Obs-IncreaseDepth], [Obs-HideFrontmatter].

1. **Open.** Command "Open local graph"; drag the pane to the right sidebar and leave it ("bottom-right corner while
   writing" [Obs-GraphUseless]). It follows the active note.
2. **Set depth.** Slider in the filter panel; opens at depth 1 [LocalGraphDepth]; maximum 5 [Obs-IncreaseDepth];
   experienced users recommend 2 or 3 [Obs-GraphUseless]; some want 7 to 9 for sparse graphs [Obs-IncreaseDepth].
3. **Edge directions.** Toggle incoming, outgoing and neighbor links [Obs-TwoWays]. Tags count as outgoing links, so
   turning outgoing off hides tags [Obs-TagsOutgoing] (search summary).
4. **Tags, attachments, missing notes.** Toggles Tags, Attachments, "Existing files only", Orphans [Obsidian-GraphHelp].
   Tag nodes stop traversal, so notes sharing a tag never appear at any depth [LocalGraphTagLinks].
5. **Property links.** Quoted links in properties (`link: "[[Episode IV]]"` [Obsidian-Properties]) pull in "unrelated
   notes of the same type" at depth above 1; "There is no workaround at the moment" [Obs-HideFrontmatter].
6. **Read and act.** Hover to preview, click to open; node size is link count; the current note can be colored
   [Obs-FirstTimeHalfYear]. Decide: open a neighbor, add a link, or ignore.

### Workflow B -- Replace or extend the built-in graph with a plugin (Obsidian)

This is how most users who want a better graph get one: they never leave Obsidian. Sources: [Obs-CommunityPlugins],
[Obsidian-Views], [Obsidian-MetadataCache], [AdvancedGraphView], [ExtendedGraph], [Obs-PluginGuidelines],
[Obs-DevPolicies].

1. **Install.** Settings > Community plugins; turn off Restricted Mode; Browse; search (for example "Advanced Graph
   View"); Install; Enable [Obs-CommunityPlugins] [AdvancedGraphView]. Obsidian warns that plugins "run third-party code
   on your behalf". Beta versions come through the BRAT plugin; manual installs go in a folder named for the plugin id
   [AdvancedGraphView].
2. **The view registers beside the editor.** The plugin calls `registerView` with a factory, opens a leaf with
   `workspace.getRightLeaf(false)` and `setViewState`, and `revealLeaf` in case the sidebar is collapsed
   [Obsidian-Views]. Users then see a ribbon icon or command (for example "Advanced Graph View: Open graph view") and a
   local-graph sidebar pane [AdvancedGraphView].
3. **The plugin reads the host's resolved link graph.** `metadataCache.resolvedLinks` maps each source path to
   destination paths with link counts; `unresolvedLinks` does the same for links to notes that do not exist
   [Obsidian-MetadataCache]. Advanced Graph View says "Notes and links come from vault files and `metadataCache`"
   [AdvancedGraphView]. Using the host's index means aliases, duplicate names and property links resolve exactly as
   the app resolves them; an independent parser can differ ("slightly different to what you see in the Obsidian app"
   [obsidiantools]).
4. **It stays in sync.** It subscribes to metadata `changed` (a file was re-indexed; not fired on renames, so the vault
   rename event is also needed), `resolved` (all files resolved; fires again after modifications) and `deleted`
   [Obsidian-MetadataCache].
5. **It follows the active note.** Advanced Graph View's follow toggle: "open a note anywhere in the vault and the camera
   moves to it and marks it" [AdvancedGraphView].
6. **It opens notes back in the editor.** Side-pane mode: "a click opens the note in a pane beside the graph rather than
   over it"; explore mode: "Open puts the current note in a new tab" [AdvancedGraphView]. Pinned positions "survive graph
   rebuilds and restarts".
7. **Alternative: patch the core view.** Extended Graph modifies the built-in graph instead of replacing it; "Since the
   core graph plugin lacks an API and documentation, many features are experimental" [ExtendedGraph]. Desktop only.
8. **Constraints a plugin must meet.** Directory plugins may not include client-side telemetry and must disclose network
   use, payments, accounts and closed source code; violations can lead to removal [Obs-DevPolicies] (search summary of
   the policy page). Guidelines: release every listener on unload, do not detach leaves in `onunload`, do not keep
   references to views, do not build DOM with `innerHTML` [Obs-PluginGuidelines]. Advanced Graph View requires Obsidian
   1.13.0+ and is desktop only [AdvancedGraphView].

Equivalents elsewhere: org-roam-ui follows the node open in Emacs (Workflow J); Foam's graph is a VS Code command
[Foam-Graph].

### Workflow C -- Orphan and dead-end sweep

Sources: [Obs-HowDoYouUse], [Obs-WhatsThePoint], [FindUnlinked], [AdvancedGraphView], [Logseq-LinkedStructure].

1. Open the global graph with Orphans on; orphans "are on the outside off to themselves" [Obs-HowDoYouUse]; untagged
   notes form "an outer ring" when tags are shown [Obs-WhatsThePoint].
2. Filter noise first (daily notes, templates) with `-path:`.
3. Click each straggler; link, tag, merge or delete it [Obs-HowDoYouUse].
4. Many switch to a list: a plugin writes a report of notes with no backlinks; others list notes with no links either
   way or only one [FindUnlinked] (search summary). obsidiantools lists `isolated_notes`, `isolated_media_files` and
   `isolated_canvas_files` [obsidiantools].
5. Logseq rule of thumb: fewer than two connections is dangling; many more than eight is overloaded and should be split
   [Logseq-LinkedStructure].
6. Re-run later; Advanced Graph View ships Orphans, Broken links and Dead ends presets [AdvancedGraphView].

Decision points: orphan definition (no backlinks vs no links), whether attachments count, which folders to ignore.

### Workflow D -- Filter, group, focus: a readable global overview, and expanding from a topic

Sources: [Obs-GraphUseless], [Obsidian-GraphHelp], [Obs-Presets], [Obs-DepthFilter], [Obs-LocalFilter],
[ExpansiveLocalGraph].

1. **Filter.** `-path: xxx`, `-tag: useless`, or `path: My ideas` [Obs-GraphUseless]. Path filters can hide wanted links.
2. **Group.** "New group", a query, a color [Obsidian-GraphHelp]; "Start with the largest groups, filter them out, then
   group what remains" [Obs-GraphUseless].
3. **Tune.** Arrows, text fade, node size, link thickness; center, repel and link forces [Obsidian-GraphHelp].
4. **Focus.** Zoom to a large node, drag it out, ask what connects to it and why [Obs-GraphUseless].
5. **Expand from a topic.** Filtering shows only links among matches: "There's no way to see any depth to our filtered
   results" (requests since January 2021) [Obs-DepthFilter]. Workaround: a local graph on a hub at higher depth, which
   drags in daily notes and hubs that "connect topics the user isn't currently exploring"; users want to keep only paths
   reaching a target within k steps [Obs-LocalFilter]. Expansive Local Graph adds right-click "Expand here (+1)",
   "Reduce here (-1)", "Reset this branch" [ExpansiveLocalGraph].
6. **Save and share.** "I re-use a handful of graph view filter configurations over and over" [Obs-Presets]; bookmarks
   now save graph settings (search summary). Sharing is a screenshot, sometimes annotated in a drawing app
   [Obs-HowDoYouUse].

### Workflow E -- Logseq: journals first, page graph second

Sources: [Logseq-Confusion], [Logseq-LinkedStructure], [Logseq-Journals], [Logseq-DB], [Logseq-DBChangelog].

1. **Write in the journal.** Logseq opens a new Journals page each day [Logseq-Journals]. The user writes blocks there,
   with page references inside blocks, for example a meeting block mentioning `[[Carla]]`, `[[John]]`, `[[Project XYZ]]`
   [Logseq-Confusion].
2. **Read through linked references.** The referenced pages stay mostly empty; the user reads each page's "linked
   references" to see where it was mentioned [Logseq-Confusion].
3. **Open the graph.** The page graph (single page, often in the right sidebar) or the global graph, with toggles for
   journals, orphans and built-in pages [Logseq-Filters] (search summary).
4. **Hit the mismatch.** The graph draws page-to-page links only: the journal connects to Carla, John and Project XYZ,
   but those pages do not connect to each other, and block references are not edges. The user asks, "Am I the only one
   perceiving a clash of workflows and concepts here?" [Logseq-Confusion].
5. **Restructure.** The answer: move knowledge to the page it belongs to ("John is working in Project XYZ" goes on John's
   page); showing indirect links "would get too noisy even faster than it already gets" [Logseq-Confusion].
6. **Database version.** DB graphs are SQLite; tags are classes with inherited properties; Node-type properties link
   nodes; EDN is "the only export that fully captures a graph's data" [Logseq-DB]. A rebuilt Graph View V2 (2026) targets
   "faster rendering on large graphs" and adds a zoom-in view of one task's neighborhood [Logseq-DBChangelog].

### Workflow F -- TheBrain plex navigation

Sources: [TheBrain-Relationships], [TheBrain-BeyondPlex], [JerrysBrain].

1. **Activate a thought.** Click or tap it: "it moves to the center and it becomes the Active Thought"; linked thoughts
   arrange around it by relationship [TheBrain-Relationships].
2. **Add a child.** With a thought active, add a new thought below it (the help's example: from "My Brain" create child
   "My Company"). Children sit below.
3. **Add a parent.** Add a broader thought above ("super ordinate topics of the active Thought"). A thought may have
   several parents.
4. **Add a jump.** Link a related thought that is neither parent nor child (an accountant shared by several companies);
   jumps sit to the left.
5. **Siblings appear.** "Child Thoughts that share a common Parent" are derived, not created, and sit to the right.
6. **Move on.** Click any neighbor to make it active; the plex redraws. Mapped links in the note footer act the same;
   unlinked mentions can be converted into thought links [TheBrain-BeyondPlex].
7. **Find the way back.** The past-thought list retraces steps; pins give "instant access to your most current hot
   topics"; search uses the operating system index; backlinks show where the active thought is referenced
   [TheBrain-BeyondPlex].

Why it matters: this structured, neighborhood-only view is how a 572,000-thought, 1.12-million-link network built by
hand stays navigable [JerrysBrain]. It never draws the whole graph. Help pages do not give menu names or shortcuts.

### Workflow G -- Canvas mapping (Obsidian Canvas, JSON Canvas)

Sources: [Obsidian-Canvas], [JSONCanvas-Spec], [JSONCanvas-Blog], [JSONCanvas-Apps], [ObsQuirks-CanvasLinks].

1. **Create.** Command "Canvas: Create new canvas" or right-click a folder > New canvas; saved as a `.canvas` file in
   JSON Canvas format [Obsidian-Canvas].
2. **Add cards.** Double-click for a text card; "Add note from vault" or drag notes in from the file explorer; add media,
   web pages, or drag a folder to add all its files [Obsidian-Canvas].
3. **Connect.** Drag from a card edge's circle to another card; dropping in empty space creates a new card.
4. **Label.** Double-click the line, type, Escape.
5. **Group.** Select cards > right-click > Create group; double-click the group name to rename it.
6. **Promote.** Right-click a text card > "Convert to file..." so it becomes a note; "Text-only cards don't appear in
   Backlinks" until then [Obsidian-Canvas].
7. **Link back.** Embed the canvas in a note with embed syntax [Obsidian-Canvas]. In the link index, a file card creates
   a `resolvedLinks` entry from the canvas to the note, but "Edge connections between cards do NOT appear in
   `resolvedLinks`" [ObsQuirks-CanvasLinks]: the labeled arrows never reach the graph view or backlinks.

The file format (JSON Canvas 1.0, MIT license, published March 2024 [JSONCanvas-Blog]): top-level `nodes` and `edges`.
Every node has `id`, `type` (`text`, `file`, `link`, `group`), integer `x`, `y`, `width`, `height` and optional `color`;
`file` nodes add `file` and an optional `subpath`; `group` nodes add `label` and an optional background image. Edges
have `id`, `fromNode`, `toNode`, optional `fromSide`/`toSide` (top, right, bottom, left), `fromEnd`/`toEnd` (none or
arrow; default arrow at the target), `color` and `label`. Colors are hex or presets "1" to "6" [JSONCanvas-Spec].
Supporting apps include Obsidian, Kinopio, Flowchart Fun, OrgPad, Charkoal and Ideaflip, plus a Heptabase converter
[JSONCanvas-Apps]. It is a node-link graph with author-fixed positions, sized nodes, regions and labeled, sided edges.

### Workflow H -- Academic literature notes from Zotero

Sources: [USU-ZoteroObsidian], [USU-Handbook], [Obs-AcademicZK], [Obs-PhD], [LiteratureGraph], [Chan-Synthesis].

1. **Annotate in Zotero.** Better BibTeX citekey; color-coded highlights (important, follow-up, disagreement, critique,
   question) [USU-ZoteroObsidian]; tag groups 0 to 4 [USU-Handbook].
2. **Import.** "Zotero: Create Literature Note"; a template creates Cite, Synthesis, Link, Abstract, Annotations and
   Metadata sections [USU-ZoteroObsidian].
3. **Synthesize** inside `persist` blocks; re-import to pull new annotations [USU-ZoteroObsidian].
4. **Link.** "Related" field as `[[@citekey]]`; `[[keyword]]` in comments; in a Zettelkasten variant, literature notes
   feed permanent notes gathered into MOCs via an "up-MOC" property [Obs-AcademicZK].
5. **Overview.** A Dataview table of papers [USU-ZoteroObsidian]; the graph, if used, shows papers sharing keywords
   [Obs-PhD].
6. **Citation graph (separate).** Literature Graph builds citations from `obsidian://cite` links, reference lists matched
   by DOI or author-year-title, and OpenAlex; outside works are "ghost" nodes; Chronological and Layers layouts
   [LiteratureGraph].

How it differs: citekey identity; two edge families (written concept links vs citations) in separate graphs;
machine-imported, periodically overwritten content; the discourse-graph community's most-used feature was a relation
list, not a picture -- 70 percent of active respondents called "Discourse Context" core [Chan-Synthesis].

### Workflow I -- Build an entity graph from my notes with an LLM, review it, write links back

Sources: [SimpleGraphBuilder], [NeuralComposer], [KGForge], [MemVector], [LLMWiki-Forum], [SmartConnections].

1. **Choose a model.** Local (Ollama or another OpenAI-compatible server) or cloud with an API key (Claude, OpenAI,
   Gemini, DeepSeek) [SimpleGraphBuilder]. LLM Wiki's quick start pulls a chat model and an embedding model (about 5 GB)
   into Ollama; cloud keys are opt-in [LLMWiki-Forum]. Neural Composer manages a local LightRAG server, starting and
   stopping it with Obsidian, or points at a remote GPU server [NeuralComposer].
2. **Run extraction.** "Analyze current note" or the whole vault; 10 fixed entity types, free-form relation verbs, every
   reply validated against a JSON schema [SimpleGraphBuilder]. First extraction "processes every note one by one" and
   can take hours; later runs only new and edited notes [LLMWiki-Forum].
3. **Merge entities.** Optional resolution merges variants ("AI" and "artificial intelligence") [SimpleGraphBuilder];
   Neural Composer lets the user merge duplicates and edit descriptions [NeuralComposer].
4. **Inspect.** Interactive graph with search, neighborhood focus and path finding [SimpleGraphBuilder]; 2D (Sigma.js)
   or 3D (WebGL) [NeuralComposer]; a typed-edge list filtered by predicate with provenance [KGForge]. MemVector places
   notes on a 2D canvas by declared relations, with embedding similarity as "a second force" [MemVector].
5. **Accept or reject.** KG Forge stores source, confidence, timestamp and lineage on every triple [KGForge]; no source
   found for a per-edge accept/reject review step in any plugin read -- answers carry links to source notes for
   checking [LLMWiki-Forum].
6. **Write back.** Opt-in: "Mirror the graph into your vault as real Obsidian links", so edges then appear in the core
   graph and backlinks [SimpleGraphBuilder].

Privacy: the local path keeps notes on the machine ("your notes never leave your machine" [LLMWiki-Forum]); a cloud
provider receives note text. MemVector's synthesis sends "graph-hop neighbors" of the selection to the configured
provider [MemVector]. A search summary reported an open MemVector issue in which notes excluded from vector indexing
still reach a cloud model as graph neighbors; this could not be confirmed on the plugin page read, so treat it as
unverified -- but the mechanism (graph expansion pulls in notes the user did not select) is documented. Smart
Connections creates embeddings "locally by default" and shows related notes as a graph plus list [SmartConnections].

### Workflow J -- org-roam: follow mode in the browser, analysis in R

Sources: [OrgRoam-Manual], [OrgRoamUI], [Prevos-OrgRoam].

Follow mode:

1. Org files and headings with IDs are nodes; ID links are edges; `org-roam-db-autosync-mode` keeps `org-roam.db`
   (SQLite) current [OrgRoam-Manual].
2. Enable org-roam-ui: it starts a server at `http://127.0.0.1:35901/` and connects "via a WebSocket for real-time
   updates" [OrgRoamUI].
3. Write in Emacs; "ORUI follows you around Emacs by default" -- the graph moves to the open node. A command opens the
   current node in local view.
4. Double-click a node to open its note in Emacs. The graph reloads in full on each save. 3D exists, but the FAQ says
   "man is it slow" [OrgRoamUI].

Analysis (Peter Prevos, 2021) [Prevos-OrgRoam]:

1. Connect with DBI/RSQLite; `SELECT id, title FROM nodes`; `SELECT source, dest FROM links WHERE type = '"id"'`.
2. Strip quotes from titles; join links to nodes twice; build an igraph; `simplify` away multi-edges and self-loops.
3. Degree three ways: total, out ("Links") and in ("Backlinks"); list the top ten.
4. Spinglass communities, each named after its member with the most backlinks; the author notes no agreed validation.
5. Plot with Fruchterman-Reingold, color by community, size by sqrt(in-degree + 1), labels hidden.
6. Ego graph of order 2 around one node ("Topology"), walktrap communities, Kamada-Kawai layout.
7. Export to an interactive networkD3 force graph sized by backlinks, saved as HTML.

### Workflow K -- Export a vault and analyze it elsewhere (Obsidian)

Sources: [Obs-Gephi], [obsidiantools], [GraphAnalysis], [AdvancedGraphView], [Obs-CLIGraph].

1. **Extract.** jq over Obsidian's cache to CSV, hand-cleaned [Obs-Gephi]; obsidiantools' `vault.graph` [obsidiantools];
   the Neo4j Graph View plugin [Obs-Gephi]; or `resolvedLinks` through `eval` (about 6 ms), because the CLI's per-note
   link commands took 1,296 calls on a 1,296-note vault; a whole-graph CLI export was requested in October 2026
   [Obs-CLIGraph].
2. **Analyze.** Centrality and modularity [Obs-Gephi]; in-app, Graph Analysis gives Jaccard, Adamic-Adar, common
   neighbors, co-citation (weighted by proximity, with the surrounding sentence) and label propagation relative to the
   current note [GraphAnalysis]; Advanced Graph View sizes and colors by PageRank, link counts, recency, and Louvain
   clusters named by TF-IDF [AdvancedGraphView].
3. **Read.** Qualitatively: co-citation is a "2nd order backlinks panel" [GraphAnalysis].
4. **Round trip.** Users asked how to bring Gephi results back; no answer existed [Obs-Gephi].

## 5. Data

### Formats and what each carries

| Tool and storage                                                       | Node identity                                   | Edge kinds                                                                                                                                                        | Notes                                                                                                                                                                                                                         |
| ---------------------------------------------------------------------- | ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Obsidian, Foam: folder of Markdown                                     | File path; links resolve by name, alias or path | Wikilinks and Markdown links (with heading/block subpaths), embeds, tags (nested), quoted property links, unresolved links [Obsidian-Links] [Obsidian-Properties] | The host's `resolvedLinks`/`unresolvedLinks` give source -> target -> count [Obsidian-MetadataCache]; typed links by plugin convention (Dataview `parent:: [[X]]`, Breadcrumbs up/down/next/prev) [ExcaliBrain] [Breadcrumbs] |
| Obsidian Canvas: JSON Canvas                                           | Card `id`; file cards point to a vault path     | Hand-drawn edges with sides, ends, label, color; groups as regions                                                                                                | Positions fixed by the author [JSONCanvas-Spec]                                                                                                                                                                               |
| org-roam: Org files plus `org-roam.db` SQLite                          | ID property on a file or heading                | ID links (other links cached but not graph edges by default)                                                                                                      | Tables include `nodes` and `links` [OrgRoam-Manual] [Prevos-OrgRoam]                                                                                                                                                          |
| Logseq file graphs: Markdown or Org                                    | Page name                                       | Page references, tags; property values become pages [Logseq-PropsNodes]                                                                                           | Block references not drawn [Logseq-Confusion]                                                                                                                                                                                 |
| Logseq DB: SQLite; EDN export                                          | Node (page or block); page names unique per tag | Node-type properties, tags as classes with `Extends` parents                                                                                                      | [Logseq-DB]                                                                                                                                                                                                                   |
| Roam: JSON or EDN export                                               | Block `:block/uid`; page title                  | `:block/refs`, children tree                                                                                                                                      | Field names from third-party parsers, no official schema found [RoamSDK] (search summary)                                                                                                                                     |
| TheBrain: JSON export (`thoughts.json`, `links.json`, or a `.brz` ZIP) | Thought                                         | Parent, child, jump; siblings derived                                                                                                                             | From an importer plugin's documentation (search summary) [TheBrainImport]; no official schema found                                                                                                                           |
| Tana, Capacities                                                       | Node or object with a type                      | Supertag/type fields, references                                                                                                                                  | No export schema read; no source found                                                                                                                                                                                        |
| LLM-extraction plugins                                                 | Entity or note                                  | Extracted triples with type, provenance, confidence [KGForge]                                                                                                     | Stored in plugin data, SQLite or JSON                                                                                                                                                                                         |

Import priority implied: the host's resolved link graph (live, exact) first; JSON Canvas next (open spec, positions,
small effort); org-roam SQLite and Logseq EDN/SQLite for developer and outliner users; a Markdown folder parser for
published gardens and offline analysis; Roam and TheBrain JSON after that.

### Properties, sizes and breakage

- **Node kinds users distinguish.** Notes, attachments, tags, unresolved links (deliberate placeholders and "TK" markers
  [Obs-TwoWays]), daily notes, MOCs/hubs, folders (not drawn natively; long-running requests [Obs-Folders]), canvas
  cards, extracted entities.
- **Graph properties.** Directed multi-edges with counts [Obsidian-MetadataCache]; hierarchical overlays (folders, nested
  tags, MOCs, typed parent/child); temporal (creation and modification time; Animate replays creation order
  [Obsidian-GraphHelp]); bipartite structure (notes-tags, papers-concepts); edge families by origin (written, embedding
  similarity, LLM-extracted, hand-drawn on a canvas).
- **Sizes of real, hand-built vaults.** Self-reports: 265; about 1,600; 2,809; about 3,000; 4,000; about 5,000;
  5,500; 6,236; 7,000 to 8,000; 9,950; 18,413 notes with 57,800 links; about 20,000; 39,509 [Obs-HowManyNotes]
  [Obs-HowManyNotes-p2]; 10,704 notes with 17,557 links [Obs-MaxNotes] (search summary). Typical range 1,000 to 20,000,
  long tail to about 40,000. Link density from these figures: about 1.6 to 3.1 links per note (computed here).
- **Synthetic stress case, not a user vault.** The often-cited 130,000-note vault (osbm/nixpkgs-vault) was generated from
  NixOS nixpkgs package metadata; its author built it because he "thought the graph view would be cool"
  [Obs-LargeVault] [NixpkgsVault]. On it the global graph froze, the local graph froze even at depth 1, one CPU core
  ran at 100 percent and the GPU was unused; after deleting 100k notes, about 29k rendered [Obs-LargeVault].
- **Very large hand-built networks are navigated by neighborhood.** Michalski's 572,000 thoughts and 1.12 million links
  live in TheBrain, which draws only the plex around the active thought [JerrysBrain] [TheBrain-Relationships].
- **Where the built-in graph breaks.** "a bit laggy" at about 12,000 notes; four minutes to build at 18,413
  [Obs-HowManyNotes]. One forum member, WhiteNoise: "There is not a hard limit but the performance of graph view
  degrades with the number of notes", and "I don't think anything above 25K files is practical with a modern desktop
  computer" -- one person's estimate [Obs-LargeVault]. Usefulness breaks much earlier: an unfiltered graph of
  "thousands of nodes" [Obs-GraphUseless]; a full graph unusable "as the vault grew" [Obs-HowDoYouUse]. No source gives
  a precise usefulness threshold.
- **Mobile.** Graph views freeze or drift on iPad and Android [Obs-Mobile] (search summary); several replacement plugins
  are desktop only [ExtendedGraph] [AdvancedGraphView].
- **Identifiers.** Renames update links automatically (optionally after a prompt) [Obsidian-Links]; property links need
  quotes [Obs-FrontmatterGraph]; citekeys need letter suffixes to stay unique [Obs-PhD]; Logseq DB names are unique
  per tag [Logseq-DB].
- **Sensitivity.** Private journals, health, finances, client notes. Local-first is the norm; cloud LLM extraction is
  the main new exposure (Workflow I). Michalski publishes his under CC0 [JerrysBrain] -- the exception.
- **Change rate.** Every edit; Obsidian fires `changed` per file and `resolved` after modifications
  [Obsidian-MetadataCache]; org-roam-ui reloads on save [OrgRoamUI].

## 6. Analysis methods

- **Most users:** degree by eye (node size), isolates, neighborhoods at depth 1 to 3, visual clusters after coloring.
  Interpretation is about their own writing practice: under- or over-linked notes, dense areas, what to write next.
- **Power users:** Jaccard, Adamic-Adar, common neighbors, co-citation, label propagation [GraphAnalysis]; PageRank and
  Louvain with TF-IDF labels [AdvancedGraphView]; in/out degree as links/backlinks, spinglass and walktrap communities,
  order-2 ego graphs [Prevos-OrgRoam]; betweenness and "structural gaps" on word co-occurrence [InfraNodus].
- **Machine-made edges:** embedding similarity [SmartConnections] [MemVector]; LLM-extracted triples with confidence and
  provenance [SimpleGraphBuilder] [KGForge]; graph-RAG retrieval that expands along graph neighbors [NeuralComposer]
  [MemVector].
- **Proposed but not common:** rare-shared-neighbor weighting, community coloring, t-SNE placement, hive plots, node2vec
  [Athens-605].
- **Validation.** Effectively "does this make sense to me". Prevos: no agreed way to validate communities, so they need
  human interpretation [Prevos-OrgRoam]. A Zettelkasten user built the same notes three ways and found local graphs best
  for Folgezettel and global graphs best for structure notes [ZK-Folgezettel].

## 7. Outputs and collaboration

Mostly none: a graph session's output is edits to notes (new links, merges, MOCs, accepted LLM links). Otherwise:
screenshots, sometimes annotated [Obs-HowDoYouUse]; growth animations [Obsidian-GraphHelp]; SVG [ExtendedGraph];
networkD3 HTML [Prevos-OrgRoam]; canvases embedded in notes [Obsidian-Canvas]; published sites with local graphs
[Quartz-Graph]; outlines, literature tables and Neo4j-compatible CSV from discourse graphs [Chan-Synthesis]. Saved
views are the only reproducibility mechanism, and users lose color groups by mis-clicking "restore filters"
[Obs-Presets].

## 8. Tools landscape and pain points

| Tool                       | What it offers                                                                                                                                                | What users love                                         | What fails them                                                                                                                                                                                                                                                    |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Obsidian core graph        | Global and local graph, query filters and color groups, forces, depth 1 to 5, Animate [Obsidian-GraphHelp]                                                    | Local graph ("an absolute treasure" [Obs-GraphUseless]) | Hairball; no depth on filtered sets [Obs-DepthFilter]; filters cut paths [Obs-LocalFilter]; unstable layout, no pinning [Obs-WhatsThePoint]; no folder nodes [Obs-Folders]; property links not separable [Obs-HideFrontmatter]; no API for plugins [ExtendedGraph] |
| Extended Graph             | Patches core graph: images, shapes, pinning, saved views, link-type removal, SVG export [ExtendedGraph]                                                       | Saved configurations                                    | Experimental, desktop only                                                                                                                                                                                                                                         |
| Advanced Graph View        | Own view from `metadataCache`: WebGL, worker layout, PageRank, Louvain, follow-active-note, side-pane open, pins that persist, no network [AdvancedGraphView] | Large vaults, privacy                                   | Small installed base, desktop only                                                                                                                                                                                                                                 |
| ExcaliBrain, Breadcrumbs   | TheBrain-like parent/child/friend/sibling navigation; typed up/down/next links [ExcaliBrain] [Breadcrumbs]                                                    | Readable neighborhood                                   | Separate from the visual graph                                                                                                                                                                                                                                     |
| Smart Connections          | Local embeddings, related notes as graph plus list [SmartConnections]                                                                                         | Related notes without linking                           | Graph handoff is a paid tier                                                                                                                                                                                                                                       |
| LLM graph builders         | Entity extraction, merge, 2D/3D graph, optional write-back [SimpleGraphBuilder] [NeuralComposer] [KGForge]                                                    | Graph without manual linking                            | Small, young; review steps thin; cloud exposure                                                                                                                                                                                                                    |
| Obsidian Canvas, Heptabase | Hand-placed cards, labeled arrows, groups [Obsidian-Canvas] [Fabric-Heptabase]                                                                                | Control over placement                                  | Obsidian arrows are not links [ObsQuirks-CanvasLinks]                                                                                                                                                                                                              |
| Logseq graph               | Page-level global and page graph; Graph View V2 in the DB version [Logseq-DBChangelog]                                                                        | --                                                      | Pages only, so journal users see few connections [Logseq-Confusion]                                                                                                                                                                                                |
| Roam graph overview        | Whole-database and per-page graph                                                                                                                             | --                                                      | "already unusable" at scale; notes move on every navigation [Athens-605]                                                                                                                                                                                           |
| TheBrain                   | Plex: parents above, children below, jumps left, siblings right; pins; past thoughts [TheBrain-Relationships] [TheBrain-BeyondPlex]                           | Scales by drawing only the neighborhood                 | Proprietary, manual linking                                                                                                                                                                                                                                        |
| org-roam-ui, Foam          | Browser graph following Emacs; VS Code graph command [OrgRoamUI] [Foam-Graph]                                                                                 | Follow mode                                             | Full reload on save; slow 3D                                                                                                                                                                                                                                       |

Also: Juggl (Cytoscape.js workspace, 140k downloads, unmaintained per a search summary) [Juggl]; Graph Analysis and
InfraNodus (scores as tables, text-network gaps) [GraphAnalysis] [InfraNodus]; Gephi, NetworkX and igraph via export
(Workflows J and K). The global view is mostly decorative -- a "showcase" [Obs-GraphUseless].

## 9. Requirements implied

Graphty context: graphty-element and the graphty app already cover neighborhood expansion, ego networks, filtering,
saved filters, view bookmarks, link prediction, community detection, centrality, large-graph rendering and temporal
navigation (`design/designloom/capabilities/`). No existing persona or workflow in `design/designloom/` describes
personal note networks; none of the 13 import formats is a note-app format.

| #   | Requirement                                                                                                                                                                                                                                                                                                                                                           | Priority    | Covered by designloom?                                     |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | ---------------------------------------------------------- |
| 1   | **Host adapter (primary path).** graphty-element accepts a live graph from a host note app's own resolved link index (for Obsidian, `resolvedLinks`/`unresolvedLinks` with counts, plus per-file metadata) so links resolve exactly as the host resolves them, with no Markdown parsing of its own                                                                    | must-have   | No                                                         |
| 2   | **Incremental change events.** Apply per-file changed, renamed, deleted and "all resolved" events as small graph diffs, without re-laying out the whole graph                                                                                                                                                                                                         | must-have   | No                                                         |
| 3   | **Runs inside a host's view.** The element can be mounted in a desktop plugin view (Obsidian on Electron, a VS Code webview, a Logseq plugin, a local page beside Emacs) with no network access, no telemetry, no `innerHTML` from user data, and full cleanup on unload, so a plugin built on it can pass Obsidian's review [Obs-DevPolicies] [Obs-PluginGuidelines] | must-have   | No                                                         |
| 4   | **Current-item input and open-item output.** The host tells the element the active node; the view follows and marks it. Click or hover hands the node id back so the host opens or previews it in a pane                                                                                                                                                              | must-have   | Partly (`ego-network`, `details-on-demand`)                |
| 5   | Local n-hop neighborhood, depth 1 to at least 5 (users ask for 7 to 9), separately per direction and edge kind                                                                                                                                                                                                                                                        | must-have   | Partly (`ego-network`)                                     |
| 6   | Per-node expand and collapse beyond the depth limit, with branch reset                                                                                                                                                                                                                                                                                                | must-have   | Partly (`neighborhood-expansion`)                          |
| 7   | Filter then expand: depth applied to a query-defined set                                                                                                                                                                                                                                                                                                              | must-have   | No                                                         |
| 8   | Path-preserving filters: hide hubs or placeholders but keep routes through them; keep only paths reaching a target set within k hops                                                                                                                                                                                                                                  | should-have | No                                                         |
| 9   | Query-defined color groups saved with the view                                                                                                                                                                                                                                                                                                                        | must-have   | Partly (`visual-encoding-nodes`, `style-presets`)          |
| 10  | Edge kinds by origin, each filterable and stylable: inline link, property link (per property), tag, embed, folder, hand-drawn canvas edge, embedding similarity, LLM-extracted; optional traversal through tag nodes                                                                                                                                                  | must-have   | No                                                         |
| 11  | Edge provenance and confidence: source note, method (written, similarity, model name), confidence weight, timestamp; inferred edges visibly different from written ones; accept/reject per edge with the decision handed to the host for write-back                                                                                                                   | should-have | No                                                         |
| 12  | Privacy statement per data flow: the element itself never sends data; any capability that would (a cloud model) is off by default and names what leaves the machine, including graph neighbors pulled in by expansion                                                                                                                                                 | must-have   | Not stated                                                 |
| 13  | Orphan, dead-end, under-linked and broken-link views with configurable definitions, plus list export                                                                                                                                                                                                                                                                  | must-have   | Partly (`component-analysis`, `degree-analysis`)           |
| 14  | Stable layout: pin nodes, keep positions across sessions and edits, seeded layout                                                                                                                                                                                                                                                                                     | must-have   | Partly (seed exists; persistence across edits not covered) |
| 15  | Mixed layout: hand-placed (fixed) nodes and computed nodes in one view, groups as regions                                                                                                                                                                                                                                                                             | should-have | No                                                         |
| 16  | JSON Canvas import and export with positions, sizes, groups, edge labels, sides and colors kept                                                                                                                                                                                                                                                                       | should-have | No                                                         |
| 17  | Saved presets of filters, groups, display and forces                                                                                                                                                                                                                                                                                                                  | should-have | Partly (`view-bookmarks`, `saved-filters`)                 |
| 18  | Scale: interactive at 20,000 notes and about 60,000 links on a laptop (covers the real long tail to about 40,000 notes); 130,000 nodes as a stress target; layout off the main thread                                                                                                                                                                                 | must-have   | Partly (`large-graph-rendering`)                           |
| 19  | Neighborhood-only structured view for very large networks (hundreds of thousands of nodes) that never draws the whole graph: parents above, children below, jumps and siblings at the sides, with a trail of past items                                                                                                                                               | should-have | Partly (`layout-hierarchical`, `layout-radial`)            |
| 20  | Link suggestions ranked relative to the current note (Jaccard, Adamic-Adar, co-citation, similarity)                                                                                                                                                                                                                                                                  | should-have | Partly (`link-prediction`)                                 |
| 21  | Folders as nodes or regions; group boxes by folder or tag                                                                                                                                                                                                                                                                                                             | should-have | No                                                         |
| 22  | **Standalone importers (secondary path)** for published gardens and offline analysis: Markdown folder (wikilinks, aliases, subpaths, embeds, nested tags, quoted property links, unresolved links, attachments optional), org-roam SQLite, Logseq EDN; then Roam and TheBrain JSON. Results labeled as possibly differing from the app's own resolution               | should-have | No                                                         |
| 23  | Two edge families for research notes (written links vs citations) with citekey identity                                                                                                                                                                                                                                                                               | should-have | No                                                         |
| 24  | Growth replay by creation time                                                                                                                                                                                                                                                                                                                                        | could-have  | Partly (`temporal-navigation`)                             |
| 25  | Touch: pinch without selecting nodes; tablet performance                                                                                                                                                                                                                                                                                                              | should-have | No source in designloom found                              |
| 26  | Export of the note graph to GraphML/GEXF/CSV                                                                                                                                                                                                                                                                                                                          | should-have | Partly (`data-export`)                                     |

Design notes: the current-note view, not the global overview, should be the default landing view for this population.
Hub nodes (daily notes, MOCs, big tags) need "de-emphasize without disconnecting", because they dominate every force
layout [Athens-605] [Obs-LocalFilter]. The integration is a capability graphty-element should own (adapter, events,
cleanup), so a plugin author writes wiring, not graph code.

## 10. Sources

- [Obsidian-GraphHelp] https://obsidian.md/help/plugins/graph
- [Obsidian-Properties] https://obsidian.md/help/properties
- [Obsidian-Links] https://obsidian.md/help/links
- [Obsidian-Canvas] https://obsidian.md/help/plugins/canvas
- [Obsidian-MetadataCache] https://docs.obsidian.md/Reference/TypeScript+API/MetadataCache
- [Obsidian-Views] https://docs.obsidian.md/Plugins/User+interface/Views
- [Obs-PluginGuidelines] https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines
- [Obs-DevPolicies] https://docs.obsidian.md/Developer+policies (search summary; page not rendered)
- [Obs-CommunityPlugins] https://obsidian.md/help/community-plugins
- [ObsQuirks-CanvasLinks] https://saberzero1.github.io/obsidian-extended-metadatacache/obsidian-quirks/canvas-file-links
- [JSONCanvas-Blog] https://obsidian.md/blog/json-canvas/
- [JSONCanvas-Spec] https://jsoncanvas.org/spec/1.0/
- [JSONCanvas-Apps] https://jsoncanvas.org/docs/apps/
- [Fabric-Heptabase] https://developers.fabric.so/comparison/heptabase-vs-obsidian (competing vendor; third-party)
- [Obs-Spatial] https://forum.obsidian.md/t/visual-spatial-note-taking-whiteboard-mind-map-concept-map/32346/70
- [Obs-LargeVault] https://forum.obsidian.md/t/obsidian-graph-view-doesnt-work-for-a-large-vault/106287
- [NixpkgsVault] https://github.com/osbm/nixpkgs-vault
- [Obs-GraphUseless] https://forum.obsidian.md/t/you-all-say-the-graph-is-useless-let-me-show-you-how-to-use-it/116738
- [Obs-WhatsThePoint] https://forum.obsidian.md/t/whats-the-point-of-the-graph-view-how-are-you-using-it/71316
- [Obs-HowDoYouUse] https://forum.obsidian.md/t/how-do-you-use-the-graph-view/
- [Obs-FirstTimeHalfYear] https://forum.obsidian.md/t/just-tried-graph-view-for-first-time-in-half-a-year-and/41288
- [Obs-DepthFilter] https://forum.obsidian.md/t/add-a-depth-slider-to-filtered-graph-view/11571
- [Obs-LocalFilter] https://forum.obsidian.md/t/improved-filtering-of-local-graph/35937
- [Obs-IncreaseDepth] https://forum.obsidian.md/t/increase-the-depth-of-the-local-graph/32146
- [Obs-Presets] https://forum.obsidian.md/t/graph-view-presets-to-save-and-load-filters-display-settings/8131
- [Obs-HideFrontmatter] https://forum.obsidian.md/t/an-option-to-disable-frontmatter-links-to-show-up-in-graph-view/114940
- [Obs-FrontmatterGraph] https://forum.obsidian.md/t/frontmatter-link-in-the-graph/39851
- [Obs-TwoWays] https://forum.obsidian.md/t/two-ways-of-using-the-graph-as-a-tool-for-thought/6028
- [Obs-TagsOutgoing] https://forum.obsidian.md/t/tags-becomes-useless-when-outgoing-links-is-off-in-local-graph/45283 (search summary)
- [Obs-Folders] https://forum.obsidian.md/t/create-a-graph-based-on-the-folder-structure/32411 (search summary)
- [Obs-HowManyNotes] https://forum.obsidian.md/t/how-many-notes-do-you-have/36987
- [Obs-HowManyNotes-p2] https://forum.obsidian.md/t/how-many-notes-do-you-have/36987?page=2
- [Obs-MaxNotes] https://forum.obsidian.md/t/maximum-number-of-notes-in-vault/1509 (search summary)
- [Obs-Mobile] https://forum.obsidian.md/t/feature-open-local-graph-on-mobile-ios/16638 (search summary)
- [Obs-Gephi] https://forum.obsidian.md/t/obsidian-graph-to-gephi/10563
- [Obs-CLIGraph] https://forum.obsidian.md/t/cli-a-command-for-the-whole-link-graph-not-one-note-at-a-time/119161
- [Obs-PhD] https://forum.obsidian.md/t/research-phd-academics/1446
- [Obs-AcademicZK] https://forum.obsidian.md/t/academic-note-taking-and-making-system-with-the-zettelkasten-method-obsidian-zotero/64941/2
- [Obs-MiloRelationships] https://forum.obsidian.md/t/in-what-ways-can-we-form-useful-relationships-between-notes-long-read/702
- [USU-ZoteroObsidian] https://groundwater.usu.edu/blog/2023/A-Zotero-to-Obsidian-Workflow/
- [USU-Handbook] https://groundwater.usu.edu/group_handbook/part3/reading_paper.html
- [ZK-Folgezettel] https://zettelkasten.de/posts/catographing-folgezettel-debate/
- [Chan-Synthesis] https://arxiv.org/html/2407.20666v2
- [DG-News] https://buttondown.com/DiscourseGraphs/archive/dg-news-september-2026/ (search summary)
- [SecondBrains-arXiv] https://arxiv.org/abs/2509.20187v1
- [ExpansiveLocalGraph] https://community.obsidian.md/plugins/expansive-local-graph
- [LocalGraphDepth] https://community.obsidian.md/plugins/local-graph-depth
- [LocalGraphTagLinks] https://community.obsidian.md/plugins/local-graph-tag-links
- [ExtendedGraph] https://community.obsidian.md/plugins/extended-graph
- [AdvancedGraphView] https://community.obsidian.md/plugins/graph-insight
- [3DGraph] https://obsidianstats.com/plugins/3d-graph
- [Juggl] https://community.obsidian.md/plugins/juggl
- [Breadcrumbs] https://dev.obsidianstats.com/plugins/breadcrumbs
- [ExcaliBrain] https://github.com/zsviczian/excalibrain
- [GraphAnalysis] https://github.com/skepticmystic/graph-analysis
- [InfraNodus] https://community.obsidian.md/plugins/infranodus-graph-view
- [SmartConnections] https://community.obsidian.md/plugins/smart-connections
- [SimpleGraphBuilder] https://community.obsidian.md/plugins/simple-graph-builder
- [NeuralComposer] https://forum.obsidian.md/t/neural-composer-local-graph-rag-made-easy-lightrag-integration/109891
- [KGForge] https://community.obsidian.md/plugins/kg-forge
- [MemVector] https://community.obsidian.md/plugins/memvector-knowledge-engine
- [LLMWiki] https://community.obsidian.md/plugins/llm-wiki
- [LLMWiki-Forum] https://forum.obsidian.md/t/new-plugin-llm-wiki-turn-your-vault-into-a-queryable-knowledge-base-privately/113223
- [FindUnlinked] https://community.obsidian.md/plugins/find-unlinked-files (search summary)
- [LiteratureGraph] https://community.obsidian.md/plugins/literature-graph
- [obsidiantools] https://pypi.org/project/obsidiantools/
- [Quartz-Graph] https://quartz.jzhao.xyz/features/graph-view
- [OrgRoam-Manual] https://www.orgroam.com/manual.html
- [OrgRoamUI] https://github.com/jethrokuan/org-roam-ui
- [Prevos-OrgRoam] https://www.r-bloggers.com/2021/08/visualise-org-roam-networks-with-igraph-and-r
- [Foam-Graph] https://foambubble.github.io/foam/user/features/graph-visualization (search summary)
- [AE-TanaCapacities] https://www.asianefficiency.com/technology/tana-vs-capacities-vs-logseq/
- [Capacities-Tana] https://capacities.io/compare/tana (search summary)
- [RoamSDK] https://docs.rs/crate/roam-sdk/0.4.0/source/docs/export.md (search summary; third-party)
- [TheBrainImport] https://community.obsidian.md/plugins/thebrain-import (search summary)
- [Logseq-Confusion] https://discuss.logseq.com/t/confusion-about-the-graph-view-whats-the-point-of-it-if-you-rely-on-blocks-and-journals/28136
- [Logseq-LinkedStructure] https://discuss.logseq.com/t/how-to-leverage-logseqs-linked-structure/21147
- [Logseq-PropsNodes] https://discuss.logseq.com/t/page-properties-show-up-in-global-graph-and-page-graph-view/10247/2
- [Logseq-Filters] https://discuss.logseq.com/t/option-to-ignore-certain-nodes-in-the-graph/1312 (search summary)
- [Logseq-Journals] https://discuss.logseq.com/t/how-to-get-started-with-logseqs-journals-page/8432 (search summary)
- [Logseq-DB] https://raw.githubusercontent.com/logseq/docs/master/db-version.md
- [Logseq-DBChangelog] https://discuss.logseq.com/t/logseq-db-changelog/30013/37
- [Athens-605] https://github-users.yhajoa.workers.dev/athensresearch/athens/discussions/605 (mirror)
- [Every-FallOfRoam] https://every.to/superorganizers/the-fall-of-roam (search summary)
- [TheBrain-Relationships] https://help.thebrain.com/androidphone/thoughtrelationships.html
- [TheBrain-BeyondPlex] https://thebrain.com/blog/navigating-beyond-the-plex
- [JerrysBrain] https://sites.google.com/view/jerrysbrain/welcome
- [StarHistory-Logseq] https://www.star-history.com/logseq/logseq/ (search summary)
- [Substack-CEO] https://tfthacker.substack.com/p/getting-to-know-the-ceo-of-obsidian (search summary)
- [Fueler-Obsidian] https://fueler.io/blog/obsidian-usage-revenue-valuation-growth-statistics
- [arXiv-PluginMaintenance] https://arxiv.org/html/2602.17018v1 (search summary)
