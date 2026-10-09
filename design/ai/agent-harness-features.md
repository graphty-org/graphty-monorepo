# AI agent harness features, derived from the use cases

graphty.app is a graph visualization and analysis product: people load node and edge data, explore it, run graph algorithms, style, filter, annotate, save and export, in 2D, 3D and VR. It will have a built-in AI agent. The harness is everything around the agent's model that lets it do work: its tools, memory, ways of asking and answering, safeguards and runtime.

This document lists 162 features such a harness should have. Each one was found by walking every use case in [agent-use-cases.md](agent-use-cases.md) (507 use cases in 18 categories) step by step and asking what the agent would need to carry that step out. It deliberately ignores how any agent is built today, which technologies exist and what browsers allow: a feature is listed because a use case needs it, not because it is easy. It is a list of what is desirable, with the use cases that need each feature. It is not a roadmap, a priority order or a design.

The full use-case-to-feature map, with the step that calls for each feature, is in [agent-harness-feature-map.json](agent-harness-feature-map.json).

## How the list was made, and its limits

Each use case was decomposed into the ordered steps an agent would take, from the first question to the person through to delivering and remembering the result, and each step was tagged with the capabilities it needs. The free-form capabilities from all use cases were then normalized into one set of canonical features with definitions, and every use case was re-tagged against that set, marking each feature essential (the use case cannot be done without it) or helpful (it makes the result better, safer or easier). Adversarial passes then looked for capabilities the steps needed that no feature covered, for features that overlapped or should be split, and for tags that were wrong; 29 early features were merged into others, new ones were added for the gaps, and 74 individual tags were corrected by hand. A few consistency rules were applied uniformly, for example that any outbound message also needs an approval gate, a preview and AI disclosure, and that anything read from the web needs untrusted-content handling.

Limits: the decomposition and tagging are one model's judgment, not a survey of users or a design review. The line between essential and helpful is a judgment call, and the counts below should be read as rough weight, not measurement. Use cases marked speculative in the source are included. Two entries are quality attributes rather than separately built features (F07 Time and date awareness and F128 Low-latency streaming responses): every feature must have them.

## How to read the counts

- **Essential**: the number of use cases (out of 507) that cannot be done without the feature.
- **Helpful**: the number of use cases where the feature improves the result but is not required.
- **Categories**: how many of the 18 use-case categories use the feature at all, essential or helpful.
- Feature ids (F01 to F191) match the JSON map. Gaps in the numbering are features merged into others.

## Summary of every feature

| Family                                | Feature                                                       | Definition                                                                                                                                                                                                                                                                                                                      | Essential | Helpful | Categories |
| ------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------: | ------: | ---------: |
| Conversation and context              | F01 Multi-turn task conversation                              | Hold one task open across many back-and-forth turns, keeping the goal, earlier answers, choices and intermediate results in play.                                                                                                                                                                                               |        81 |     311 |         18 |
| Conversation and context              | F02 Long-session context and transcript recall                | Keep a long session coherent when its history outgrows what the agent can hold at once, and search, quote and recall the agent's own past turns as data.                                                                                                                                                                        |         3 |       5 |          5 |
| Conversation and context              | F03 Large-material handling                                   | Work over graphs, files and corpora far larger than the agent's context by computing, sampling, profiling and retrieving instead of reading everything.                                                                                                                                                                         |        34 |      44 |         15 |
| Conversation and context              | F04 Reference resolution                                      | Resolve words like 'this', 'these two', 'my cousin' or 'that step' to concrete graph elements, UI controls, earlier results or people.                                                                                                                                                                                          |        15 |       6 |          7 |
| Conversation and context              | F05 User activity awareness                                   | Observe what the user is doing and has done in the product (clicks, selections, camera moves, undos, errors, features used) as context for help.                                                                                                                                                                                |        12 |       6 |          3 |
| Conversation and context              | F07 Time and date awareness                                   | Every feature must know the current date and time and reason correctly about time zones, calendars, recurrence, deadlines and time windows. A quality attribute, not a separately built feature.                                                                                                                                |        28 |      37 |         12 |
| Conversation and context              | F08 Hidden state keeping                                      | Hold information the user must not see yet (a puzzle answer, a game secret) and reveal it only by a stated rule.                                                                                                                                                                                                                |        14 |       8 |          4 |
| Conversation and context              | F173 User state inference                                     | With opt-in, estimate whether the user is right now stuck, overloaded, nauseous, distressed or tired, with a confidence and a limit on false alarms, and adjust pace, detail and interruptions.                                                                                                                                 |         4 |       5 |          6 |
| Asking the user                       | F09 Clarifying questions                                      | Decide when a request is ambiguous or underspecified and what to ask before committing to an interpretation (when and what to ask; the form of the question is F10).                                                                                                                                                            |        76 |     158 |         17 |
| Asking the user                       | F10 Structured questions                                      | Ask the user a question with typed choices, checkboxes, ranges, pickers or a small form and get a machine-readable answer.                                                                                                                                                                                                      |        17 |     220 |         18 |
| Asking the user                       | F11 Interpretation echo-back                                  | Restate in plain words what the agent understood (the request, a translated query, the selected set, what it heard) so the user can correct it. What an action will change is F100.                                                                                                                                             |        12 |       2 |          5 |
| Asking the user                       | F12 Scripted step-by-step sessions                            | Run an ordered, resumable, multi-step dialog in one of two paces: agent-paced (an interview that fills a structured record from the answers) or user-paced (coaching the user through steps they do themselves, waiting for each and never doing it for them unasked).                                                          |        18 |      22 |         13 |
| Asking the user                       | F188 Game and lesson session engine                           | Own the rules of games and lessons: turns, scoring, timers, hidden answers and reveal rules (F08), learner mastery, and deciding what a learner reviews next and when.                                                                                                                                                          |        11 |       9 |          2 |
| Planning and orchestration            | F14 Planning                                                  | Break a goal into an ordered plan of steps with dependencies before acting, and revise it as results arrive or steps fail. Showing the plan for edits is F15.                                                                                                                                                                   |        15 |     124 |         18 |
| Planning and orchestration            | F15 Shared plan and task list                                 | Keep one visible, editable plan or list of steps and parked items with their state (pending, done, blocked) that both the user and the agent see, edit and reorder, and that survives interruptions.                                                                                                                            |         6 |     115 |         17 |
| Planning and orchestration            | F16 Sub-agents                                                | Spawn helper agents with isolated context. Mechanism: parallel fan-out over sources, entities, batches or sub-questions, result merging, and per-agent limits. Configuration: each agent's role, stance or persona, its restricted knowledge and tools, and which model or method it uses (via F167).                           |        17 |      56 |         16 |
| Planning and orchestration            | F18 Error recovery and self-repair                            | Detect failures (timeouts, bad parses, tool errors, missing data, schema changes), diagnose the cause, retry or change approach within limits, and explain what happened in plain words.                                                                                                                                        |         6 |     105 |         11 |
| Planning and orchestration            | F20 Reusable recipes                                          | Capture a working procedure built from existing tools (query, crawl, pipeline, analysis) as a named, parameterized recipe that can be inspected, edited and rerun on new inputs. New code against extension points is F50.                                                                                                      |         9 |      22 |         10 |
| Planning and orchestration            | F181 Agent-based simulation                                   | Run many stateful persona agents that interact with each other over time under a budget, and measure what emerges.                                                                                                                                                                                                              |         3 |       0 |          2 |
| Memory and knowledge                  | F22 Cross-session user memory                                 | Remember a user's or team's preferences, past sources, decisions and lessons, including a learned writing voice, and apply them in later sessions.                                                                                                                                                                              |        34 |     110 |         17 |
| Memory and knowledge                  | F23 Project memory                                            | Store queries, schemas, mappings, recipes, transcripts, notes, decisions and agent state inside a project so the work can be reopened, updated and reused.                                                                                                                                                                      |        41 |     160 |         16 |
| Memory and knowledge                  | F24 Memory viewer and editor                                  | Show the user what the agent remembers about them and let them inspect, correct and remove individual memories. Finding and deleting content everywhere with proof is F151.                                                                                                                                                     |         5 |      11 |          5 |
| Memory and knowledge                  | F25 Memory isolation                                          | Keep memory and data partitioned per project or client, with explicit, permissioned linking across partitions.                                                                                                                                                                                                                  |         3 |       2 |          2 |
| Memory and knowledge                  | F27 Domain knowledge packs                                    | Install, version and trust packs of domain knowledge: procedures, checklists, glossaries, reference facts, method assumptions and caveats, standards, and rules by jurisdiction, consulted instead of relying on model recall alone.                                                                                            |        24 |     102 |         18 |
| Memory and knowledge                  | F29 Product knowledge pack                                    | A built-in domain knowledge pack (F27) of the product's own help, API reference and release notes that must match the product version actually running.                                                                                                                                                                         |        11 |       1 |          3 |
| Memory and knowledge                  | F30 Semantic retrieval                                        | Index text and items by meaning and search them, finding nearest neighbors and near-duplicates across a corpus or the project.                                                                                                                                                                                                  |        10 |      14 |          7 |
| Memory and knowledge                  | F187 Learning from feedback and outcomes                      | Store review verdicts, corrections, accepted or overridden recommendations, and estimate-versus-actual outcomes, and tune the agent's behavior and calibration from them.                                                                                                                                                       |         1 |      66 |         13 |
| Graph and product tools               | F31 Graph data query                                          | Query the loaded graph as structured data: nodes, edges, attributes, schema, neighborhoods, paths, filters, aggregates and algorithm results, including over graphs too large to read whole (with F03).                                                                                                                         |       166 |      12 |         18 |
| Graph and product tools               | F32 Graph editing                                             | Add, remove, merge and change nodes, edges and attributes in the loaded graph, including derived columns and attached media.                                                                                                                                                                                                    |       256 |      17 |         18 |
| Graph and product tools               | F33 Data import and schema design                             | Decide the node types, edge types and attributes for a graph, and map raw records (tables, files, API results) onto them.                                                                                                                                                                                                       |       187 |       2 |         14 |
| Graph and product tools               | F34 Data cleaning and normalization                           | Normalize, deduplicate and repair messy values (names, dates, units, spellings, identifiers).                                                                                                                                                                                                                                   |        12 |      48 |          8 |
| Graph and product tools               | F35 Entity resolution                                         | Decide whether records from one or many sources refer to the same real-world person, place or thing, and merge them with evidence and confidence.                                                                                                                                                                               |        79 |       8 |         14 |
| Graph and product tools               | F36 Algorithm and layout execution                            | Run graph algorithms and layouts (paths, centrality, communities, cycles, flow, link prediction, projection) and read their results.                                                                                                                                                                                            |       249 |      19 |         18 |
| Graph and product tools               | F37 Style layers and annotation                               | Show findings on the graph through named, removable style layers and place notes, labels and callouts on the view.                                                                                                                                                                                                              |       170 |      21 |         18 |
| Graph and product tools               | F38 View and camera control                                   | Drive what the user sees: camera, focus, zoom, filters, highlights, 2D/3D/VR mode, map overlay and time position.                                                                                                                                                                                                               |       105 |      37 |         14 |
| Graph and product tools               | F39 Narrated tours and animation                              | Drive the view through a sequence of stops or time steps with narration synchronized to what is on screen, with pacing, step-back and pause-to-answer.                                                                                                                                                                          |        27 |       4 |         11 |
| Graph and product tools               | F40 Product UI operation and pointing                         | Operate the product's own interface visibly on the user's behalf (open panels, set controls, switch modes) and spotlight or point at controls and canvas regions to show where something is.                                                                                                                                    |         7 |       7 |          3 |
| Graph and product tools               | F41 Interactive canvas tool modes                             | Install a temporary interaction mode on the canvas (click to remove a node, drag a slider) whose effects the agent recomputes live.                                                                                                                                                                                             |         2 |       3 |          4 |
| Graph and product tools               | F42 Capability and catalog introspection                      | Discover which algorithms, layouts, tools, formats and device features exist and are available here, with their parameters, assumptions, outputs, limits and reasons for unavailability.                                                                                                                                        |        11 |     269 |         18 |
| Graph and product tools               | F43 Clickable references and deep links                       | Put links in the agent's text that select, focus or highlight what they mention, and produce links that reopen the product at an exact project, view, selection, time, step or moment in a conversation transcript.                                                                                                             |         6 |      29 |         10 |
| Graph and product tools               | F45 Multi-graph display and visual diff                       | Show several graphs, versions or branches at once: side by side, linked, or as a visual difference overlay. The versions themselves are F46.                                                                                                                                                                                    |        24 |       8 |         13 |
| Graph and product tools               | F46 Versions, branches and structural diff                    | Keep named versions and snapshots of the graph, data and analyses, never altering the user's original; fork disposable branches for what-if work; compute structural differences; promote or discard branches.                                                                                                                  |        49 |      65 |         18 |
| Graph and product tools               | F47 Undo and rollback                                         | Reverse the agent's own actions, one specific step or a whole run, in the product and in outside systems, without disturbing the user's other work.                                                                                                                                                                             |        13 |     293 |         18 |
| Graph and product tools               | F48 Live streaming updates                                    | Push results, events and live data feeds into the visible graph as they arrive, without a full reload.                                                                                                                                                                                                                          |        12 |       7 |          8 |
| Graph and product tools               | F49 Incremental source sync and change detection              | Keep a graph current with its sources by pulling only what changed, flag what is new since last time, track freshness, and pull edits back from linked outside copies. Pushed live feeds are F48.                                                                                                                               |        16 |      25 |         13 |
| Graph and product tools               | F50 Extension authoring and installation                      | Write new code against the product's extension points (algorithm, importer, layout, data source), test it, save agent-written code as a named tool, and install it into the live session.                                                                                                                                       |         4 |       0 |          3 |
| Graph and product tools               | F51 Render capture                                            | Render the graph, a view or the app's UI to images, high-resolution figures, thumbnails, frame sequences or video at a chosen size, headlessly if needed.                                                                                                                                                                       |        66 |      24 |         12 |
| Graph and product tools               | F52 Immersive scene control                                   | Build and drive immersive 3D or VR scenes, rooms and walk-throughs around the graph.                                                                                                                                                                                                                                            |        13 |       5 |          5 |
| Graph and product tools               | F53 Geospatial handling                                       | Work with coordinates, places, distances, routes, map projections, geographic layouts and map layers, using the user's own location only when permitted.                                                                                                                                                                        |        35 |      53 |         16 |
| Graph and product tools               | F169 Entity linking to external authorities                   | Attach stable identifiers from outside authorities (knowledge bases, researcher, organization, place, gene and legal-entity registries, country codes) to nodes, disambiguating by context, with confidence scores, a queue for doubtful links, and care that a wrong id does not look authoritative.                           |        12 |       0 |          6 |
| Graph and product tools               | F178 App and view state reading                               | Read a snapshot of the interface as structured data: selection, style layer stack, camera, mode, panels, settings, versions, errors and recent operations, for help, self-checks and session time travel.                                                                                                                       |        23 |      15 |          8 |
| Information gathering                 | F54 Web search                                                | Search the open web and specialized indexes (scholarly, registries, data portals) and get ranked results to read further.                                                                                                                                                                                                       |        59 |      20 |         15 |
| Information gathering                 | F55 Web fetch                                                 | Retrieve a specific web page, feed, document, data file or API response by address and read it as content.                                                                                                                                                                                                                      |       100 |      24 |         18 |
| Information gathering                 | F56 Browser automation                                        | Drive a real or headless browser the agent controls to render script-heavy pages, follow links, crawl multi-page sites, record network requests and fill web forms under supervision.                                                                                                                                           |         9 |       4 |          7 |
| Information gathering                 | F57 Large and paged transfers                                 | Download or upload large files and fetch large result sets in pages or chunks, with size checks, streaming and resume from where it stopped.                                                                                                                                                                                    |         3 |      10 |          9 |
| Information gathering                 | F58 Rate limiting and politeness                              | Pace requests to outside services, honor their limits and quotas, back off on throttling and resume afterward.                                                                                                                                                                                                                  |         4 |      26 |         12 |
| Information gathering                 | F59 License and terms checks                                  | Find and respect data licenses, platform terms, robots rules, copyright and redistribution restrictions before fetching, using or publishing content.                                                                                                                                                                           |        18 |      16 |         12 |
| Information gathering                 | F60 Content archiving and evidence preservation               | Save a copy of each fetched page or response with timestamps, hashes and capture context so evidence survives the source changing and can hold up in reports.                                                                                                                                                                   |         3 |       5 |          4 |
| Files, documents and media            | F61 Read user files                                           | Open files and folders the user supplies or points to (uploads, local folders, connected drives, archives), including large, binary and proprietary formats.                                                                                                                                                                    |       164 |      13 |         18 |
| Files, documents and media            | F62 Format detection and parsing                              | Identify the format of an unknown file or response and parse mixed and messy formats into records, including time, place and device metadata embedded in photos, audio and video.                                                                                                                                               |        41 |       8 |         12 |
| Files, documents and media            | F63 Document parsing and OCR                                  | Read long, scanned or photographed documents (PDFs, scans, office files, handwriting) and extract text, tables, layout, page positions and structured facts.                                                                                                                                                                    |        37 |       9 |         10 |
| Files, documents and media            | F64 Vision                                                    | Understand images: photos, scans, figures, drawings, screenshots, camera frames and the agent's own rendered views.                                                                                                                                                                                                             |        51 |      31 |         15 |
| Files, documents and media            | F65 Audio and video processing                                | Transcribe audio with speakers and timestamps, split video into frames or segments, track motion and events, and align them to time.                                                                                                                                                                                            |        13 |       3 |          7 |
| Files, documents and media            | F67 Write files and exports                                   | Save files the agent produces (data, code, repaired copies, graph exports in standard formats, images) to the user's device or workspace with chosen names and formats.                                                                                                                                                         |        75 |      19 |         17 |
| Files, documents and media            | F68 Document generation                                       | Produce formatted documents for people (reports, memos, methods sections, slides, posters, worksheets, printable sheets, cards) with embedded figures and tables, following a supplied template or house style.                                                                                                                 |        79 |     187 |         18 |
| Files, documents and media            | F69 Template and form filling                                 | Fill a user- or authority-supplied template or official form exactly (regulator report, request letter, PDF or web form) for the user to check and submit.                                                                                                                                                                      |         5 |       1 |          3 |
| Files, documents and media            | F70 Chart and figure generation                               | Draw charts outside the graph canvas: histograms, curves, heatmaps, uncertainty bands, tables.                                                                                                                                                                                                                                  |        20 |       4 |          7 |
| Files, documents and media            | F71 Media composition                                         | Assemble deterministic media from existing material: slideshows, animations, videos and audio from frames, captions and cuts, plus format conversion, resizing and rasterizing.                                                                                                                                                 |        21 |       7 |          8 |
| Files, documents and media            | F73 Outputs that stay current                                 | Keep generated outputs linked to their source data and regenerate them when it changes; a dashboard is a linked output on continuous refresh.                                                                                                                                                                                   |         7 |       6 |          4 |
| Files, documents and media            | F170 Entity and relation extraction from unstructured content | Read text, transcripts and images and emit typed nodes and edges held to an approved schema, each tied to the exact passage, page or frame it came from, at corpus scale.                                                                                                                                                       |        22 |       9 |          9 |
| Files, documents and media            | F182 Generative media                                         | Generate new images, illustrations, audio, voices, 3D models and tactile graphics, with provenance marks and safety screening.                                                                                                                                                                                                  |         6 |       1 |          5 |
| Files, documents and media            | F191 Standalone interactive output generation                 | Build self-contained interactive outputs (explorable pages, interactive stories, games, embeddable views) that run without the product, and playtest them by driving the built output (F79 or F56).                                                                                                                             |         7 |       1 |          3 |
| Execution and compute                 | F74 Sandboxed code execution                                  | Write and run code in an isolated environment with packages, files, resource and time limits, and no access beyond what is granted, reading the graph in and results out.                                                                                                                                                       |       181 |      42 |         17 |
| Execution and compute                 | F75 Scaled compute jobs                                       | Run many independent computations, or heavy ones, at scale: fan-out of resamples, rewirings and parameter grids, and jobs on bigger, accelerated or rented compute, with provisioning, data transfer, aggregation, partial-failure handling and teardown.                                                                       |        23 |      20 |          8 |
| Execution and compute                 | F77 Batch model pipelines                                     | Map a language or vision model over many items (pages, chunks, frames, records) as a stateless pipeline and aggregate the outputs.                                                                                                                                                                                              |         6 |       5 |          3 |
| Execution and compute                 | F78 Specialized model tools                                   | Call purpose-built models (classifiers, parsers, entity extraction, image hashing, translation) as tools.                                                                                                                                                                                                                       |        14 |       4 |          5 |
| Execution and compute                 | F79 Headless app instances                                    | Drive separate, invisible instances of the product to replay steps, explore options or reproduce bugs without touching the user's session.                                                                                                                                                                                      |         6 |       9 |          5 |
| Execution and compute                 | F80 Offline and low-connectivity mode                         | Keep working without a network or on basic devices and poor connections, using on-device execution (F180) and cached data, and sync small deltas safely when connectivity returns.                                                                                                                                              |         4 |       3 |          5 |
| Execution and compute                 | F167 Model routing and diversity                              | Choose which model (size, family, on-device or remote, specialist) runs each step or sub-agent by cost, latency, privacy and skill, deliberately vary models across independent workers, and record which model produced each output.                                                                                           |         8 |      61 |         15 |
| Execution and compute                 | F171 Constraint solving and optimization                      | Elicit objectives and hard and soft constraints from the user (table sizes, must-not-pair, capacities, fairness, travel time), solve, explain why no solution exists, and compare near-best alternatives.                                                                                                                       |        15 |       1 |          7 |
| Execution and compute                 | F180 On-device model and tool execution                       | Run the model and tools entirely on the user's device; shared by offline mode (F80) and the local-only privacy mode (F150).                                                                                                                                                                                                     |        36 |      15 |         13 |
| Integrations and outbound actions     | F81 External tools and connectors                             | Call outside services and tools through one catalog: built-in connectors to public data interfaces and business systems, plus tool servers the user or organization adds at run time, all with typed schemas, discovery and one trust and permission model.                                                                     |       134 |      18 |         18 |
| Integrations and outbound actions     | F83 Account connectors and delegated access                   | Connect to the user's own accounts (mail, calendar, photos, notes, banks, task apps, drives) and act in them through granted, scoped, revocable access.                                                                                                                                                                         |        53 |      16 |         12 |
| Integrations and outbound actions     | F84 Outbound writes                                           | Write into systems outside the product (databases, content systems, open-data projects, ticket systems, code repositories, outside documents, publishing destinations, the product's own feedback tracker): show a diff, write only what is approved, and verify the result after writing.                                      |        55 |       9 |         14 |
| Integrations and outbound actions     | F86 Outbound messaging                                        | Send messages, invites, requests, digests and alerts to people other than the user over the channel adapters of F136, as reviewed drafts, individually or in pausable, throttled batches.                                                                                                                                       |        28 |      10 |         13 |
| Integrations and outbound actions     | F87 Agent-to-agent exchange                                   | Exchange requests, results, offers and agreements with agents and bots run by other people, organizations or tools, under agreed rules.                                                                                                                                                                                         |         7 |       8 |          9 |
| Integrations and outbound actions     | F88 Agent as a service                                        | Expose the agent and the product's graph abilities as a callable service for other programs and agents, including a constrained public copy grounded only in published data.                                                                                                                                                    |         3 |       0 |          2 |
| Integrations and outbound actions     | F90 Physical devices and local network                        | Read from and send commands to physical hardware and devices on the user's local network (sensors, adapters, printers, embossers, projectors, lights, robots) under strict permission.                                                                                                                                          |         9 |       3 |          8 |
| Integrations and outbound actions     | F168 External data store connection and query authoring       | Connect to the user's database, warehouse, graph store or triple store, read its schema, write queries in its own language for approval, run a sample and a cost check first, enforce read-only, and page the results.                                                                                                          |        10 |       1 |          7 |
| Integrations and outbound actions     | F172 Outreach and response collection                         | Collect answers from outside people (surveys, forms, interviews, confirmations, scoring) and run the campaign around it: track each recipient's status, match replies to the right graph records, remind people who have not answered, escalate along an agreed chain, and place outbound voice calls.                          |        14 |       1 |         10 |
| Long-running and proactive work       | F93 Durable jobs                                              | Run checkpointed, resumable work outside the conversation turn that survives closing the page, crashes and disconnects, can be paused and resumed in this or a later session, and comes back with the result.                                                                                                                   |        67 |      52 |         18 |
| Long-running and proactive work       | F95 Triggers                                                  | Start a durable job (F93) without the user present when a time, recurrence, deadline, outside event, watched condition or threshold fires, and decide whether the result is worth delivering.                                                                                                                                   |        62 |      45 |         18 |
| Long-running and proactive work       | F96 User notification policy                                  | Decide when and how to reach the user outside the current view or session (urgency, batching, quiet hours, channel choice) over the channel adapters of F136 and push or desktop notices.                                                                                                                                       |        25 |      71 |         17 |
| Long-running and proactive work       | F98 Proactive suggestions                                     | Speak up unprompted at a suitable moment with a hint, caveat or likely next step, under frequency limits.                                                                                                                                                                                                                       |        11 |       7 |          7 |
| Human control and trust               | F99 Approval gate                                             | Stop before a consequential, costly, irreversible or outward-facing action, show exactly what will happen, and proceed only on explicit approval from the user or a designated approver, recording the answer.                                                                                                                  |       106 |     102 |         18 |
| Human control and trust               | F100 Action proposal and dry-run preview                      | Show exactly what an action would change before doing it for real: diff, row counts, a sample, every recipient, cost. What the agent understood is F11.                                                                                                                                                                         |        90 |     245 |         18 |
| Human control and trust               | F101 Policy and restriction modes                             | One enforcement engine, applied in every tool, that limits what the agent may touch or do (read-only, draft-only, explain-only, hint-only, these systems or fields only, no network, spoiler-free) with policy sources from the user, an administrator, instructor or organization, and rights over who may change each policy. |        31 |      56 |         14 |
| Human control and trust               | F102 Stop and interrupt                                       | Let the user interrupt the agent mid-answer or mid-action and stop it at once, leaving a consistent state.                                                                                                                                                                                                                      |       104 |      66 |         18 |
| Human control and trust               | F103 User-tunable agent behavior                              | Let the user dial agent behaviors up, down or off (verbosity, caveats, hints, narration, unprompted speech) and honor the setting.                                                                                                                                                                                              |         5 |       8 |          5 |
| Human control and trust               | F104 Review queue                                             | Collect items needing human judgment (merges, labels, flags, matches, extractions shown over their source image or video) into one queue the user or a reviewer works through, accepting, rejecting or correcting in bulk or one by one, with verdicts recorded for F187.                                                       |        29 |      36 |         12 |
| Human control and trust               | F106 Hand-off to a person                                     | Route a decision, review, sign-off or conversation to a named human (editor, lawyer, data owner, expert, caseworker) with a prepared summary, stop acting on it, and resume when they respond.                                                                                                                                  |        36 |      29 |         15 |
| Quality and verification              | F107 Result verification                                      | Check the agent's own output against the request, the data and independent sources before declaring success, and after acting confirm the intended effect actually happened.                                                                                                                                                    |       134 |     184 |         18 |
| Quality and verification              | F108 Uncertainty reporting                                    | Attach a calibrated confidence to each extracted fact, match, guess or result, separate clear cases from ambiguous ones, and act on low confidence (flag, re-check, ask).                                                                                                                                                       |        91 |     179 |         18 |
| Quality and verification              | F110 Critique, debate and agreement protocols                 | Protocols on top of sub-agents (F16): independent critics that attack or redo the main work, debates and judging, with agents required to differ in model or method (F167); compare outputs, score agreement and surface disagreements instead of merging them away.                                                            |         4 |       9 |          5 |
| Quality and verification              | F111 Analysis ledger                                          | A required derived view of the run records (F118): counts of every statistical test, comparison and look at the data in a session, so corrections and labels stay honest.                                                                                                                                                       |         4 |       5 |          2 |
| Quality and verification              | F112 Schema enforcement                                       | Validate tool inputs and parameters, loaded data, and model outputs against declared schemas and constraints (types, ranges, allowed relations and vocabulary, required fields).                                                                                                                                                |        13 |     196 |         14 |
| Quality and verification              | F114 Evaluation harness                                       | Keep hidden questions with known answers and score the agent against them.                                                                                                                                                                                                                                                      |         1 |       0 |          1 |
| Quality and verification              | F176 Fairness and disparate-impact audit                      | Before ranking, flagging or scoring people, measure who is wrongly caught: false positives across groups, rules that flag someone only for being near others in the graph, biased source data; report it with the result.                                                                                                       |         1 |      19 |         10 |
| Provenance, reproducibility and audit | F115 Element provenance                                       | Attach to every node, edge and attribute the agent creates or changes where it came from (source, quote, page, method, model guess, human), referencing the action-log entries (F119) for the step and the approval rather than recording them again, and show it on demand.                                                    |        52 |     247 |         18 |
| Provenance, reproducibility and audit | F116 Grounding and citation                                   | Every stated or written value carries checkable evidence (address, dataset version, row, page, retrieval date) that points at a per-project source table with version, license and access date; a strict mode blocks values that have none.                                                                                     |        69 |      81 |         18 |
| Provenance, reproducibility and audit | F118 Run records and show your work                           | One record per result of the query, code, prompt, parameters, seeds, data versions and fingerprints, tool versions and data read, so it can be read, audited, described in a methods section and regenerated exactly; 'show your work' is its per-result view.                                                                  |        29 |      97 |         12 |
| Provenance, reproducibility and audit | F119 Action log and audit trail                               | Keep an ordered, inspectable, exportable record of every user and agent action, data access, tool call, input, output, approval and refusal; spending is one view of it. Sealing it is F121.                                                                                                                                    |        44 |      87 |         18 |
| Provenance, reproducibility and audit | F121 Tamper-evident records and signing                       | Hash, sign and trusted-timestamp entries and outputs (the action log, hypotheses, forecasts, reports) so later changes are detectable, and verify signatures and timestamps on received files.                                                                                                                                  |        11 |      10 |          7 |
| Observability                         | F122 Live work visibility                                     | One structured event stream per agent and sub-agent, with a summary view (current step, percent done, time remaining, partial results) and a drill-down view of what each is doing, reading and concluding.                                                                                                                     |         2 |     135 |         18 |
| Observability                         | F124 Performance measurement                                  | Read timing and frame-rate figures for the product and compare them before and after a change.                                                                                                                                                                                                                                  |         1 |       1 |          2 |
| Explanation and communication         | F125 Plain-language explanation                               | Turn findings, numbers, risks and settings into plain-language explanations with the method used, what it means and what it does not mean.                                                                                                                                                                                      |        84 |      80 |         15 |
| Explanation and communication         | F126 Audience adaptation                                      | Adjust wording, reading level, length, tone, pacing and form (large print, easy-read, picture-first) to the audience and the person's current needs, while checking the claim is unchanged.                                                                                                                                     |        10 |      38 |         10 |
| Explanation and communication         | F127 Multilingual and translation                             | Work in the user's or a respondent's language, detect languages and scripts, translate and transliterate, handle right-to-left scripts and localize formats while keeping identifiers stable.                                                                                                                                   |        16 |       9 |         10 |
| Explanation and communication         | F128 Low-latency streaming responses                          | Every interaction mode must answer within its latency budget (live voice, VR, games, hands-free), streaming partial answers. A quality attribute, not a separately built feature.                                                                                                                                               |        22 |       7 |         10 |
| Interaction modes and channels        | F129 Voice conversation                                       | Take spoken input (accents, noisy rooms, several speakers) and speak output with controllable speed, voice and verbosity, in real time.                                                                                                                                                                                         |        39 |      18 |         16 |
| Interaction modes and channels        | F130 Multimodal input and pointing                            | Capture and fuse speech with pointing, lasso, gaze, touch, drawing, controller rays and body pose in 2D, 3D or VR into one command; resolving them to referents is F04.                                                                                                                                                         |        11 |       8 |          8 |
| Interaction modes and channels        | F131 Device capture                                           | Use the user's camera, microphone and location directly from the product, with permission, including continuous capture of a live conversation under recorded consent (F155).                                                                                                                                                   |         9 |       0 |          6 |
| Interaction modes and channels        | F133 Non-visual output channels                               | Deliver output without sight: screen-reader announcements, keyboard focus, braille, captions anchored near the thing discussed, and spatial audio tied to graph elements.                                                                                                                                                       |         5 |       3 |          1 |
| Interaction modes and channels        | F135 Cross-surface and glanceable output                      | Run or show results outside the main app (browser side panels, widgets, watches, wall displays, earpieces, glasses, lock screens) in very short form where needed.                                                                                                                                                              |         5 |       1 |          4 |
| Interaction modes and channels        | F136 Conversation channel adapters                            | Adapters that carry conversation over phone calls, SMS, chat apps, team chat threads and email, inbound and outbound, including over low bandwidth; F96 decides when to reach the user and F86 reuses them for other people.                                                                                                    |        10 |       8 |         10 |
| Interaction modes and channels        | F137 Physical-world perception                                | Recognize and track real objects and spaces through a camera and anchor graph content to them.                                                                                                                                                                                                                                  |         3 |       1 |          1 |
| Interaction modes and channels        | F179 Non-visual data encodings                                | Map graph structure to sound (pitch, timbre, rhythm) and touch (vibration, tactile output) through a stated mapping and a legend the reader can learn.                                                                                                                                                                          |         2 |       1 |          1 |
| Safety                                | F138 Harm and misuse screening                                | Score requests, plans, tool sequences and outputs for harm potential (defamation, stalking, doxxing, surveillance, weapons, unauthorized reconnaissance, judging people) beyond single keywords, and decline, limit or require review.                                                                                          |        19 |      16 |         10 |
| Safety                                | F140 Graduated friction and safe alternatives                 | Respond to risky requests with proportionate friction (asking about purpose, slowing, questioning, per-sender rate limits on sensitive operations, reframing) rather than allow-or-block, and offer legitimate alternatives when declining.                                                                                     |        23 |      10 |         10 |
| Safety                                | F141 Domain advisory framing                                  | Stay inside safe bounds in medical, legal, financial, safety-critical and security topics: mark outputs as advisory, state limits, never imply what the evidence cannot support. Physical hazards of output are F174.                                                                                                           |        29 |      45 |         14 |
| Safety                                | F142 Sensitive presentation                                   | Frame sensitive findings gently and neutrally, and hide or blur abusive, graphic or triggering content by default, revealing it only on request.                                                                                                                                                                                |         8 |      21 |         10 |
| Safety                                | F143 Crisis detection and referral                            | Recognize signs of danger or crisis, offer or trigger the agreed escalation path, and point to appropriate outside resources without acting on the user's behalf.                                                                                                                                                               |         4 |       9 |          3 |
| Safety                                | F145 Agent identity disclosure                                | Tell people outside the user that they are dealing with an AI agent and on whose behalf.                                                                                                                                                                                                                                        |        31 |      65 |         16 |
| Safety                                | F174 Output physical-safety checks                            | Check and rewrite what the agent shows or does in the physical world for bodily harm: flashing that could trigger seizures, motion that causes sickness, room-scale VR obstacles, sound levels, and commands sent to robots or devices.                                                                                         |         7 |       1 |          3 |
| Safety                                | F175 Incidental content scanning                              | While processing user data for another purpose, notice material that signals danger or crime (self-harm, child abuse, leaked credentials), flag it privately to the user with a confidence, and never take outside action on its own.                                                                                           |         1 |      10 |          5 |
| Privacy and data governance           | F147 Sensitive data detection                                 | Recognize personal and special-category data (health, finance, location, biometrics, minors, secrets) and apply stricter rules to where it is sent, shown or stored.                                                                                                                                                            |        35 |      41 |         14 |
| Privacy and data governance           | F148 Redaction and de-identification                          | Remove, blur, mask, pseudonymize, generalize or aggregate personal data (faces, names, numbers, third parties) before it is stored, analyzed, shown, spoken or leaves the user's control.                                                                                                                                       |        40 |      51 |         17 |
| Privacy and data governance           | F149 Data egress control and flow ledger                      | Decide per field and per destination what may leave the device, honor never-send marks in every tool, and record and show which data went to which outside service.                                                                                                                                                             |        12 |      38 |         11 |
| Privacy and data governance           | F150 Local-only processing                                    | A privacy mode that runs chosen tasks entirely on the user's device or private environment (using F180) so raw data never leaves it.                                                                                                                                                                                            |        32 |      17 |         13 |
| Privacy and data governance           | F151 Retention and deletion                                   | Let the user see, set end dates for and delete what the agent stored (recordings, transcripts, memory, derived graphs, exports, caches, logs), find every place a value or person appears, and erase, pseudonymize or delete it everywhere with a receipt.                                                                      |        17 |      21 |         10 |
| Privacy and data governance           | F152 Encrypted storage                                        | Keep stored graphs, memory and files encrypted at rest under the user's control.                                                                                                                                                                                                                                                |         2 |      13 |          4 |
| Privacy and data governance           | F153 Ephemeral sessions                                       | Run a session under a persistence policy that stores nothing and leaves no trace on the device or in the agent's memory and logs.                                                                                                                                                                                               |         3 |       1 |          2 |
| Privacy and data governance           | F154 Re-identification risk estimation                        | Estimate what can be inferred or re-identified from data or an output and how a change (generalizing, suppressing, aggregating) reduces the risk.                                                                                                                                                                               |         6 |       2 |          3 |
| Privacy and data governance           | F155 Consent management                                       | Present consent requests, record who consented to what and for how long, apply it to processing and outputs, honor withdrawal, and refuse to proceed without required consent.                                                                                                                                                  |        38 |      24 |         16 |
| Privacy and data governance           | F183 Synthetic data with stated guarantees                    | Generate synthetic graphs or records that preserve chosen properties of real data under a stated privacy guarantee.                                                                                                                                                                                                             |         2 |       0 |          2 |
| Privacy and data governance           | F184 Joint computation across parties                         | Compute jointly over data held by different parties (organizations, households, hospitals) without any party revealing its data to the others.                                                                                                                                                                                  |         1 |       1 |          1 |
| Privacy and data governance           | F185 Coercion safety and app lock                             | Protect a user from a hostile person at the screen or holding the device: lock the whole agent, quick exit, decoy screen, a duress unlock that opens the decoy, and instant wipe.                                                                                                                                               |         3 |       0 |          1 |
| Privacy and data governance           | F189 Consented cross-user usage aggregation                   | Aggregate usage across many users, with opt-in, de-identified at collection time (F148), visible only to product maintainers.                                                                                                                                                                                                   |         4 |       3 |          3 |
| Security                              | F156 Untrusted content handling                               | Treat fetched pages, files, loaded data, messages, tool output and other agents' output as data that can never issue instructions or grant authority, and contain anything hostile in it.                                                                                                                                       |       133 |      50 |         18 |
| Security                              | F157 Safe file inspection                                     | Inspect a file's structure and cost (decompression bombs, remote references, size) before parsing it, with limits.                                                                                                                                                                                                              |        55 |     123 |         18 |
| Security                              | F158 Credential vault                                         | Hold the user's secrets, keys and sign-ins and use them with narrow scopes without exposing them to the model, conversation, logs, outputs or shared projects.                                                                                                                                                                  |        22 |      34 |         14 |
| Identity, access and collaboration    | F159 Identity and roles                                       | Know who each user or caller is, including on channels without a logged-in screen, and what role and rights they have, including an anonymous-public role with a command allowlist and anonymous proof of group membership, and act within them.                                                                                |        23 |      22 |         12 |
| Identity, access and collaboration    | F160 Authorization verification                               | Confirm the user is authorized for the work (signed scope, role, ethics approval, lawful basis, or that a person-centric analysis is about the requester or someone they act for with consent) before starting, and block steps whose approval is missing.                                                                      |        18 |      32 |         13 |
| Identity, access and collaboration    | F161 Per-item access policy                                   | Enforce who may see each node, field, result or export in every view and agent answer, and let each contributor control, withdraw or hide their own part of a shared graph.                                                                                                                                                     |        37 |       9 |         11 |
| Identity, access and collaboration    | F162 Access-controlled sharing                                | Share a project, view or output with chosen people at chosen permission levels and expiry, and warn before sharing sensitive analyses outside the user's circle. Per-copy marking is F186.                                                                                                                                      |         7 |      29 |         11 |
| Identity, access and collaboration    | F163 Concurrent shared editing                                | Several people work on one project at different times or devices: edits merged without conflict, comments on views, nodes and steps, and attribution of who did what. Live multi-person conversation is F177.                                                                                                                   |        17 |       8 |         11 |
| Identity, access and collaboration    | F164 Shared community knowledge base                          | Read and contribute to a dataset shared with other users under anonymity and anti-abuse rules, without revealing the contributor's identity.                                                                                                                                                                                    |         1 |       2 |          2 |
| Identity, access and collaboration    | F177 Live multi-party conversation                            | Run one live conversation or room with several people present (workshop, classroom, family, a helper and a client): know who is speaking or pointing, take turns, ask the right person, keep a view per person, and allow private asides.                                                                                       |        16 |       0 |          9 |
| Identity, access and collaboration    | F186 Per-copy fingerprinting and leak attribution             | Embed imperceptible marks in each shared copy that survive edits, and later detect which copy leaked, reporting a confidence and resisting forged marks.                                                                                                                                                                        |         1 |       2 |          2 |
| Identity, access and collaboration    | F190 Shared recipe and extension marketplace                  | Share recipes (F20) and extensions (F50) with other people, with vetting status, ratings and abuse reports, treating installed procedures as untrusted until vetted (F156).                                                                                                                                                     |         2 |       0 |          1 |
| Cost and performance                  | F165 Pre-flight cost estimation                               | Predict the runtime, memory, money, request count and download size of an action on this data before running it.                                                                                                                                                                                                                |        11 |      22 |         11 |
| Cost and performance                  | F166 Budgets and limits                                       | Enforce caps on money, compute, model calls, time, request counts, graph growth and download size, and stop cleanly, sample or ask when a limit is near.                                                                                                                                                                        |        25 |     145 |         18 |

## Conversation and context

Holding a task, its history and its referents together across turns, sessions and very large material.

### F01 Multi-turn task conversation

**Definition.** Hold one task open across many back-and-forth turns, keeping the goal, earlier answers, choices and intermediate results in play.

**Includes.** Follow-ups that build on earlier results; corrections that revise an earlier step; switching between related sub-questions without losing the main task.

**Why use cases need it.** Tasks whose first step is an interview or an 'ask which accounts, which city, which kind of graph' exchange, tasks refined over several rounds (cleaning loops, styling, drafting), and games and coaching where each turn depends on the last. Without it every follow-up starts from nothing.

**Reach.** Essential to 81 use cases and helpful to 311; used in 18 of 18 categories, most in Publishing, storytelling and visual design (45), Operations, infrastructure, software and organizations (38), Everyday life: money, home, health, travel and hobbies (34).

**Essential to (81 in total; 10 representative, spread across categories).**

- 2.9 Interview mode graph building
- 3.9 Edge cleanup
- 5.1 Your own accounts as graphs
- 6.1 Purchase graph and forgotten subscriptions
- 7.1 Explain this graph in 60 seconds
- 8.9 Two agents debate over a graph
- 9.1 Literature map from seed papers
- 12.18 Chat-channel post with follow-up answers
- 15.22 Negotiated data clean room between two organizations' agents
- 16.1 Interactive graph theory lessons

**Helpful to.** 311 use cases, for example 1.1 Find me a graph about X; 2.3 Schema-guided extraction; 3.1 Schema inference for unknown files.

**Commonly needed with.** No feature stands out: none shares at least 8 use cases and 30% of this feature's use cases while appearing with it at least 1.5 times as often as chance.

### F02 Long-session context and transcript recall

**Definition.** Keep a long session coherent when its history outgrows what the agent can hold at once, and search, quote and recall the agent's own past turns as data.

**Includes.** Summarizing older turns; pinning decisions and constraints so they survive summarization; searching and quoting earlier turns; recalling an earlier decision on demand.

**Why use cases need it.** Sessions that run for hours or days (an iterative cleaning loop, a document pile worked through, a caption-first collaboration) where the agent must quote what it said earlier or recall a decision made long ago, and must not lose pinned constraints when older turns are condensed.

**Reach.** Essential to 3 use cases and helpful to 5; used in 5 of 18 categories, most in Turning documents, media and conversation into graphs (3), Asking the graph questions: guided analysis and explanation (2), Cleaning and repairing data (1).

**Essential to (3).**

- 2.12 The conversation itself as a graph
- 3.15 Iterative cleaning loop with a human
- 13.15 Sign language and caption-first collaboration for deaf users

**Helpful to.** 5 use cases, for example 2.9 Interview mode graph building; 7.4 Multi-step analysis from one prompt; 8.8 Red-team my analysis.

**Depends on.** F23 Project memory (recalling decisions across a long session needs somewhere to keep them).

**Commonly needed with.** No feature stands out: none shares at least 8 use cases and 30% of this feature's use cases while appearing with it at least 1.5 times as often as chance.

### F03 Large-material handling

**Definition.** Work over graphs, files and corpora far larger than the agent's context by computing, sampling, profiling and retrieving instead of reading everything.

**Includes.** Chunking and indexing; compact graph profiles (counts, distributions, schema, samples); streaming parse; reading the head or a sample of a huge file; retrieving pieces on demand.

**Why use cases need it.** Steps that read a corpus, log set, transaction export, single-cell matrix or repository far larger than the agent can read at once, and steps that 'summarize big graphs first'. The agent must profile, sample, chunk and retrieve rather than read.

**Reach.** Essential to 34 use cases and helpful to 44; used in 15 of 18 categories, most in Science, health and scholarship (19), Operations, infrastructure, software and organizations (18), Investigations: finance, fraud, security, law and journalism (9).

**Essential to (34 in total; 10 representative, spread across categories).**

- 1.5 Pull a graph from a database, warehouse or graph store in plain language
- 2.2 Document pile to sourced entity graph
- 3.1 Schema inference for unknown files
- 9.9 Comorbidity and adverse-event watch
- 9.14 Online discourse and polarization map
- 10.1 Money-flow tracing for anti-money-laundering
- 11.1 Multi-tier supplier risk map
- 11.3 Forced-labor provenance tracing
- 12.36 Training-ready dataset for machine learning
- 16.26 Novelist's character web with continuity checks

**Helpful to.** 44 use cases, for example 2.12 The conversation itself as a graph; 3.3 Fix types column by column; 4.13 Data dictionary and datasheet.

**Commonly needed with.** F23 Project memory (together in 59 use cases, 76% of this feature's); F112 Schema enforcement (together in 52 use cases, 67% of this feature's); F33 Data import and schema design (together in 48 use cases, 62% of this feature's); F38 View and camera control (together in 39 use cases, 50% of this feature's); F15 Shared plan and task list (together in 35 use cases, 45% of this feature's); F14 Planning (together in 36 use cases, 46% of this feature's).

### F04 Reference resolution

**Definition.** Resolve words like 'this', 'these two', 'my cousin' or 'that step' to concrete graph elements, UI controls, earlier results or people.

**Includes.** Using the current selection, pointer target, recent results and conversation history as referents; asking when a reference is ambiguous.

**Why use cases need it.** Steps where the user says 'this', 'these two clusters', 'my cousin' or 'the step where the colors changed' and the agent must bind the words to a node, a region, a saved project or an earlier result, often from pointing, gaze or selection, and ask when several match.

**Reach.** Essential to 15 use cases and helpful to 6; used in 7 of 18 categories, most in Accessibility, voice and immersive interaction (8), Asking the graph questions: guided analysis and explanation (5), Help, support and product quality (3).

**Essential to (15).**

- 2.7 Whiteboard, sticky-note or photo to graph
- 2.9 Interview mode graph building
- 3.19 Cleaning in VR by voice and pointing
- 7.6 Why is this node ranked so high?
- 7.12 Ego network on demand
- 13.1 Eyes-free graph for blind and low-vision users
- 13.6 Voice navigation and hands-free control in VR and AR
- 13.7 Deixis and gesture: these, not those
- 13.8 Walking conversation in room-scale VR
- 13.9 Tabletop AR war room
- 13.12 Phone-call mode: ask your graph while driving
- 13.15 Sign language and caption-first collaboration for deaf users
- 14.5 What am I looking at?
- 14.11 Session time travel
- 14.12 Style layer debugger: why is this node red?

**Helpful to.** 6 use cases, for example 4.6 Snowball expansion from a selection; 7.3 Natural-language queries into selections and filters; 13.20 Side-quest parking lot for distractible and dyslexic users.

**Depends on.** F178 App and view state reading (referents such as 'this' come from the current selection and pointer); F31 Graph data query (names resolve to graph elements).

**Commonly needed with.** F130 Multimodal input and pointing (together in 10 use cases, 48% of this feature's); F129 Voice conversation (together in 14 use cases, 67% of this feature's); F178 App and view state reading (together in 11 use cases, 52% of this feature's); F128 Low-latency streaming responses (together in 8 use cases, 38% of this feature's); F31 Graph data query (together in 15 use cases, 71% of this feature's); F102 Stop and interrupt (together in 14 use cases, 67% of this feature's).

### F05 User activity awareness

**Definition.** Observe what the user is doing and has done in the product (clicks, selections, camera moves, undos, errors, features used) as context for help.

**Includes.** A live stream of user and app events; opted-in history of sessions, projects and features used; error signals. Frame-rate figures belong to F124.

**Why use cases need it.** Help, teaching and accessibility steps that watch what the user does: noticing repeated undos or an abandoned control, a freshly loaded file, which features a user never touches, or a tangent the user has started, so that help arrives at the right moment.

**Reach.** Essential to 12 use cases and helpful to 6; used in 3 of 18 categories, most in Help, support and product quality (9), Accessibility, voice and immersive interaction (7), Asking the graph questions: guided analysis and explanation (2).

**Essential to (12).**

- 7.17 Curiosity companion that watches you explore
- 13.1 Eyes-free graph for blind and low-vision users
- 13.8 Walking conversation in room-scale VR
- 13.17 Switch and eye-gaze access on the desktop
- 13.20 Side-quest parking lot for distractible and dyslexic users
- 14.2 Show-me mode: a live guided tour
- 14.3 Learning by doing on the user's own data
- 14.7 A cheat sheet made for this user
- 14.8 Personalized what's new
- 14.10 Notice struggle and offer help
- 14.18 Learned preferences as defaults
- 14.22 Missing-tool detector that drafts the fix

**Helpful to.** 6 use cases, for example 7.12 Ego network on demand; 13.2 Alt text and layered descriptions; 14.13 Performance tuner.

**Other features build on it.** F98 Proactive suggestions, F173 User state inference.

**Commonly needed with.** F178 App and view state reading (together in 18 use cases, 100% of this feature's); F98 Proactive suggestions (together in 10 use cases, 56% of this feature's); F22 Cross-session user memory (together in 13 use cases, 72% of this feature's); F102 Stop and interrupt (together in 12 use cases, 67% of this feature's); F125 Plain-language explanation (together in 10 use cases, 56% of this feature's); F31 Graph data query (together in 10 use cases, 56% of this feature's).

### F07 Time and date awareness (quality attribute)

**Definition.** Every feature must know the current date and time and reason correctly about time zones, calendars, recurrence, deadlines and time windows. A quality attribute, not a separately built feature.

**Includes.** Relative dates ('last spring'); recurrence rules; timeline windows over data; staleness of facts.

**Why use cases need it.** Steps that reason over dated data (tie strength per year, monthly reply graphs, timelines over decades), schedule or remind (before each birthday, maintenance reminders), check freshness, or interpret 'last spring'. It is a quality every other feature must have.

**Reach.** Essential to 28 use cases and helpful to 37; used in 12 of 18 categories, most in Everyday life: money, home, health, travel and hobbies (16), Your own life as a graph (15), Science, health and scholarship (14).

**Essential to (28 in total; 10 representative, spread across categories).**

- 3.4 Date and time normalization
- 5.3 Who have I lost touch with?
- 5.4 Calendar time map
- 6.1 Purchase graph and forgotten subscriptions
- 6.2 Money flow between my own accounts
- 6.6 Home knowledge graph
- 7.19 Correlation networks from time series
- 8.21 Counterfactual history
- 8.25 Forecast ledger that grades itself later
- 13.21 Personal step-free route network for wheelchair users

**Helpful to.** 37 use cases, for example 2.11 Meeting transcript graphs; 3.5 Unit and currency normalization; 4.2 Search the web for a dataset to join.

**Commonly needed with.** F108 Uncertainty reporting (together in 54 use cases, 83% of this feature's); F34 Data cleaning and normalization (together in 22 use cases, 34% of this feature's); F35 Entity resolution (together in 26 use cases, 40% of this feature's); F18 Error recovery and self-repair (together in 28 use cases, 43% of this feature's); F95 Triggers (together in 28 use cases, 43% of this feature's); F33 Data import and schema design (together in 37 use cases, 57% of this feature's).

### F08 Hidden state keeping

**Definition.** Hold information the user must not see yet (a puzzle answer, a game secret) and reveal it only by a stated rule.

**Includes.** Secrets kept out of displayed output and tool results shown to the user; rule-driven reveals.

**Why use cases need it.** Games, puzzles, lessons and evaluations where the agent computes an answer, a culprit, a spoiler or an exam key and must keep it out of everything the user sees until a rule says to reveal it.

**Reach.** Essential to 14 use cases and helpful to 8; used in 4 of 18 categories, most in Learning, play and creative work (17), Help, support and product quality (3), Everyday life: money, home, health, travel and hobbies (1).

**Essential to (14).**

- 6.23 TV and book character map without spoilers
- 8.5 Hypothesis notebook with pre-registration
- 14.27 Scheduled self-exam of the agent's graph answers
- 16.1 Interactive graph theory lessons
- 16.3 Socratic tutor that targets misconceptions
- 16.4 Course kit for instructors
- 16.5 Homework checker with guardrails
- 16.11 Memory palace from a graph
- 16.12 Six degrees of anything
- 16.13 Daily graph puzzle
- 16.14 Graph detective: generated murder mystery
- 16.16 Graph escape room in VR
- 16.17 Graph telephone party game
- 16.27 Game master's world builder

**Helpful to.** 8 use cases, for example 14.3 Learning by doing on the user's own data; 16.6 Classroom assignment grader and coach.

**Depends on.** F101 Policy and restriction modes (hidden answers must be kept out of every tool result the user can see).

**Other features build on it.** F188 Game and lesson session engine.

**Commonly needed with.** F188 Game and lesson session engine (together in 20 use cases, 91% of this feature's); F126 Audience adaptation (together in 8 use cases, 36% of this feature's); F22 Cross-session user memory (together in 12 use cases, 55% of this feature's).

### F173 User state inference

**Definition.** With opt-in, estimate whether the user is right now stuck, overloaded, nauseous, distressed or tired, with a confidence and a limit on false alarms, and adjust pace, detail and interruptions.

**Includes.** Signals from activity, speech and body; confidence; false-alarm limits; adaptation of pace and detail.

**Why use cases need it.** Steps that estimate, with opt-in, whether the user is overloaded, stuck or nauseous and adjust pace and detail.

**Reach.** Essential to 4 use cases and helpful to 5; used in 6 of 18 categories, most in Accessibility, voice and immersive interaction (4), Help, support and product quality (1), Automation, integration, extension and teamwork (1).

**Essential to (4).**

- 13.5 Cognitive load reducer
- 13.19 Biometric-adaptive immersive sessions
- 14.10 Notice struggle and offer help
- 18.8 Word-finding web for people with aphasia

**Helpful to.** 5 use cases, for example 13.8 Walking conversation in room-scale VR; 15.3 Threshold and anomaly alerts; 16.2 Step-through algorithm animation.

**Depends on.** F05 User activity awareness (it reads activity signals); F155 Consent management (inference is opt-in).

**Commonly needed with.** No feature stands out: none shares at least 8 use cases and 30% of this feature's use cases while appearing with it at least 1.5 times as often as chance.

## Asking the user

Getting the information a task needs from the person, in the right form and order.

### F09 Clarifying questions

**Definition.** Decide when a request is ambiguous or underspecified and what to ask before committing to an interpretation (when and what to ask; the form of the question is F10).

**Includes.** Detecting ambiguity in intent or data meaning; deciding when to ask versus assume; a free-text escape on every choice question.

**Why use cases need it.** First steps of most tasks: 'ask the occasion, audience and length', 'ask which trackers they use', 'ask which show and the last episode watched'. The agent must judge which unknowns block progress and which it may assume.

**Reach.** Essential to 76 use cases and helpful to 158; used in 17 of 18 categories, most in Operations, infrastructure, software and organizations (38), Publishing, storytelling and visual design (33), Everyday life: money, home, health, travel and hobbies (26).

**Essential to (76 in total; 10 representative, spread across categories).**

- 1.3 Plain-English SPARQL pulls
- 2.10 Causal loop diagram from a conversation
- 3.4 Date and time normalization
- 4.11 Licensing, attribution and citation credits
- 5.1 Your own accounts as graphs
- 6.1 Purchase graph and forgotten subscriptions
- 7.2 Who matters most here, with the right kind of matters
- 8.2 Parameter sweep and sensitivity report
- 14.20 Feature request drafting and deduplication
- 17.5 Purpose check before profiling a private person

**Helpful to.** 158 use cases, for example 1.1 Find me a graph about X; 2.1 PDF or scanned document to graph; 3.1 Schema inference for unknown files.

**Commonly needed with.** No feature stands out: none shares at least 8 use cases and 30% of this feature's use cases while appearing with it at least 1.5 times as often as chance.

### F10 Structured questions

**Definition.** Ask the user a question with typed choices, checkboxes, ranges, pickers or a small form and get a machine-readable answer.

**Includes.** Option lists, sliders, thresholds, date ranges, field forms; validation of the answer; defaults the user can accept.

**Why use cases need it.** Steps that need a precise, machine-readable answer: a merge policy per kind, a unit and currency, an edge threshold, which attributes to map to sound, a role from a short list, never-send marks per column. A form or picker avoids misreading free text.

**Reach.** Essential to 17 use cases and helpful to 220; used in 18 of 18 categories, most in Publishing, storytelling and visual design (26), Everyday life: money, home, health, travel and hobbies (21), Science, health and scholarship (21).

**Essential to (17).**

- 1.1 Find me a graph about X
- 2.3 Schema-guided extraction
- 2.9 Interview mode graph building
- 2.18 Voice interviews to collect network survey data at scale
- 3.2 Bipartite to one-mode projection
- 3.5 Unit and currency normalization
- 3.9 Edge cleanup
- 3.11 Placeholder, junk-hub and artifact detection
- 4.2 Search the web for a dataset to join
- 4.10 Source conflict resolution
- 7.2 Who matters most here, with the right kind of matters
- 8.13 Spread simulation: disease, rumors, adoption
- 13.3 Sonification
- 13.4 Tactile graphics and 3D-printed sculptures
- 14.4 Role-specific onboarding paths
- 17.19 Data-flow disclosure: what left this machine
- 17.25 Leak hunt: unmasking a whistleblower from communications graphs

**Helpful to.** 220 use cases, for example 1.2 Wikipedia list or category to graph; 2.4 Community summaries of a corpus; 3.1 Schema inference for unknown files.

**Other features build on it.** F12 Scripted step-by-step sessions, F171 Constraint solving and optimization.

**Commonly needed with.** No feature stands out: none shares at least 8 use cases and 30% of this feature's use cases while appearing with it at least 1.5 times as often as chance.

### F11 Interpretation echo-back

**Definition.** Restate in plain words what the agent understood (the request, a translated query, the selected set, what it heard) so the user can correct it. What an action will change is F100.

**Includes.** Natural-language to graph-query translation shown back for editing; spoken-command confirmation; showing the selected set.

**Why use cases need it.** Steps that translate the user's words into something executable (a query, a set of filters, a lasso selection, a spoken destructive command, a drawn sketch) and must show that reading back before acting on it.

**Reach.** Essential to 12 use cases and helpful to 2; used in 5 of 18 categories, most in Accessibility, voice and immersive interaction (6), Cleaning and repairing data (3), Finding and fetching data (2).

**Essential to (12).**

- 1.3 Plain-English SPARQL pulls
- 1.5 Pull a graph from a database, warehouse or graph store in plain language
- 3.12 Domain-rule consistency checks
- 7.3 Natural-language queries into selections and filters
- 7.12 Ego network on demand
- 13.6 Voice navigation and hands-free control in VR and AR
- 13.7 Deixis and gesture: these, not those
- 13.11 Sketch a graph in the air
- 13.14 Oral-first graph for people who do not read
- 13.15 Sign language and caption-first collaboration for deaf users
- 13.18 Graph anchored on physical equipment in AR
- 14.11 Session time travel

**Helpful to.** 2 use cases, for example 3.1 Schema inference for unknown files.

**Other features build on it.** F168 External data store connection and query authoring.

**Commonly needed with.** F129 Voice conversation (together in 9 use cases, 64% of this feature's); F102 Stop and interrupt (together in 10 use cases, 71% of this feature's).

### F12 Scripted step-by-step sessions

**Definition.** Run an ordered, resumable, multi-step dialog in one of two paces: agent-paced (an interview that fills a structured record from the answers) or user-paced (coaching the user through steps they do themselves, waiting for each and never doing it for them unasked).

**Includes.** Question and step sequencing; skip and return; resume across sessions; building graph data from answers; steps in outside systems; confirming each step before cueing the next.

**Why use cases need it.** Long guided interviews that fill a graph (name generators, care-team maps, gift ledgers, survey calls) and coaching sessions that walk a user through steps they do themselves (requesting a data export, a first tour), both needing order, skip and resume.

**Reach.** Essential to 18 use cases and helpful to 22; used in 13 of 18 categories, most in Your own life as a graph (11), Everyday life: money, home, health, travel and hobbies (8), Care, community and humanitarian work (4).

**Essential to (18).**

- 2.9 Interview mode graph building
- 2.18 Voice interviews to collect network survey data at scale
- 5.1 Your own accounts as graphs
- 5.6 Gift and favor ledger
- 5.8 Wedding or party seating planner
- 5.10 DNA match clustering
- 5.13 Care team map for an aging parent
- 5.24 Disclosure forms filled from your own graph
- 6.1 Purchase graph and forgotten subscriptions
- 6.27 Informal savings groups and family remittance webs
- 6.30 Project plan and calendar holds from a dependency graph
- 9.10 Outbreak contact tracing board
- 14.2 Show-me mode: a live guided tour
- 14.3 Learning by doing on the user's own data
- 17.2 Safety map for survivors of domestic abuse or stalking
- 18.8 Word-finding web for people with aphasia
- 18.10 Lifelong connections map for youth in or leaving foster care
- 18.16 Circle-of-support map in easy-read for adults with intellectual disabilities

**Helpful to.** 22 use cases, for example 5.2 Friend-of-a-friend map from social media exports; 6.8 Phone apps and permissions; 7.18 Any table as a similarity network.

**Depends on.** F23 Project memory (resuming a session needs the partial record stored); F10 Structured questions (steps often take typed answers).

**Commonly needed with.** F62 Format detection and parsing (together in 14 use cases, 35% of this feature's); F22 Cross-session user memory (together in 22 use cases, 55% of this feature's); F96 User notification policy (together in 16 use cases, 40% of this feature's); F95 Triggers (together in 17 use cases, 42% of this feature's); F61 Read user files (together in 21 use cases, 52% of this feature's); F15 Shared plan and task list (together in 17 use cases, 42% of this feature's).

### F188 Game and lesson session engine

**Definition.** Own the rules of games and lessons: turns, scoring, timers, hidden answers and reveal rules (F08), learner mastery, and deciding what a learner reviews next and when.

**Includes.** Turns, scores, timers; reveal rules; mastery tracking; spaced repetition and flashcard ordering.

**Why use cases need it.** Games and lessons with turns, scores, timers, hidden answers, mastery tracking and spaced review.

**Reach.** Essential to 11 use cases and helpful to 9; used in 2 of 18 categories, most in Learning, play and creative work (17), Help, support and product quality (3).

**Essential to (11).**

- 14.3 Learning by doing on the user's own data
- 16.1 Interactive graph theory lessons
- 16.3 Socratic tutor that targets misconceptions
- 16.10 Vocabulary web for language learning
- 16.11 Memory palace from a graph
- 16.13 Daily graph puzzle
- 16.14 Graph detective: generated murder mystery
- 16.15 Play against the agent: Hex, Shannon switching, coloring duels
- 16.16 Graph escape room in VR
- 16.17 Graph telephone party game
- 16.18 Interactive quiz or game for outreach

**Helpful to.** 9 use cases, for example 14.4 Role-specific onboarding paths; 16.4 Course kit for instructors.

**Depends on.** F08 Hidden state keeping (answers stay hidden until the reveal rule); F23 Project memory (mastery is stored).

**Commonly needed with.** F08 Hidden state keeping (together in 20 use cases, 100% of this feature's); F126 Audience adaptation (together in 8 use cases, 40% of this feature's); F22 Cross-session user memory (together in 11 use cases, 55% of this feature's).

## Planning and orchestration

Turning goals into steps, splitting work among helpers, recovering from failure and reusing what worked.

### F14 Planning

**Definition.** Break a goal into an ordered plan of steps with dependencies before acting, and revise it as results arrive or steps fail. Showing the plan for edits is F15.

**Includes.** Dependency ordering; re-planning on new facts or failures.

**Why use cases need it.** Steps that turn a goal into an ordered pipeline (fetch, resolve, build, analyze, report), split work among helpers, plan a lesson or tour, or plan a staged sequence where order matters for safety, then revise as results arrive.

**Reach.** Essential to 15 use cases and helpful to 124; used in 18 of 18 categories, most in Science, health and scholarship (43), Investigations: finance, fraud, security, law and journalism (27), Publishing, storytelling and visual design (8).

**Essential to (15).**

- 2.2 Document pile to sourced entity graph
- 2.14 Research team of sub-agents building a knowledge graph
- 7.4 Multi-step analysis from one prompt
- 8.9 Two agents debate over a graph
- 8.10 Parallel hypothesis exploration with helper agents
- 9.1 Literature map from seed papers
- 10.5 Threat-intel pivoting
- 10.10 Investigation timeline
- 13.5 Cognitive load reducer
- 13.17 Switch and eye-gaze access on the desktop
- 14.2 Show-me mode: a live guided tour
- 14.3 Learning by doing on the user's own data
- 14.23 Exploratory QA bot
- 17.2 Safety map for survivors of domestic abuse or stalking
- 18.13 Reentry map for people leaving prison

**Helpful to.** 124 use cases, for example 1.1 Find me a graph about X; 3.6 Format conversion with a loss report; 4.5 Enrich companies and organizations.

**Other features build on it.** F15 Shared plan and task list.

**Commonly needed with.** F15 Shared plan and task list (together in 102 use cases, 73% of this feature's); F23 Project memory (together in 98 use cases, 71% of this feature's); F118 Run records and show your work (together in 75 use cases, 54% of this feature's); F18 Error recovery and self-repair (together in 61 use cases, 44% of this feature's); F122 Live work visibility (together in 63 use cases, 45% of this feature's).

### F15 Shared plan and task list

**Definition.** Keep one visible, editable plan or list of steps and parked items with their state (pending, done, blocked) that both the user and the agent see, edit and reorder, and that survives interruptions.

**Includes.** The plan shown to the user for edits; status updates as work runs; user check-off and reordering; persistence with the project.

**Why use cases need it.** Steps that show the plan as a checklist, pin the main goal as a visible card, turn a quality report into a task queue, or track which checks came back, so the user and agent see and edit the same list across interruptions.

**Reach.** Essential to 6 use cases and helpful to 115; used in 17 of 18 categories, most in Science, health and scholarship (43), Investigations: finance, fraud, security, law and journalism (25), Your own life as a graph (8).

**Essential to (6).**

- 3.15 Iterative cleaning loop with a human
- 7.4 Multi-step analysis from one prompt
- 13.5 Cognitive load reducer
- 13.20 Side-quest parking lot for distractible and dyslexic users
- 14.4 Role-specific onboarding paths
- 18.12 Check-on-each-other network for heat waves and outages

**Helpful to.** 115 use cases, for example 1.1 Find me a graph about X; 2.2 Document pile to sourced entity graph; 3.10 Data quality report before analysis.

**Depends on.** F14 Planning (the shared list shows the plan).

**Commonly needed with.** F14 Planning (together in 102 use cases, 84% of this feature's); F23 Project memory (together in 90 use cases, 74% of this feature's); F18 Error recovery and self-repair (together in 63 use cases, 52% of this feature's); F118 Run records and show your work (together in 65 use cases, 54% of this feature's); F33 Data import and schema design (together in 70 use cases, 58% of this feature's); F81 External tools and connectors (together in 59 use cases, 49% of this feature's).

### F16 Sub-agents

**Definition.** Spawn helper agents with isolated context. Mechanism: parallel fan-out over sources, entities, batches or sub-questions, result merging, and per-agent limits. Configuration: each agent's role, stance or persona, its restricted knowledge and tools, and which model or method it uses (via F167).

**Includes.** Fan-out and merge; lead, worker, reviewer and specialist roles; persona agents with deliberately restricted knowledge; hand-off rules between agents. Debate, judging and critique protocols are F110; interacting populations are F181.

**Why use cases need it.** Steps that fan out one helper per portal, source, hypothesis, persona or batch; reviewer, critic and researcher roles; persona agents that must know only what their persona knows; exams run in clean sessions.

**Reach.** Essential to 17 use cases and helpful to 56; used in 16 of 18 categories, most in Everyday life: money, home, health, travel and hobbies (11), Publishing, storytelling and visual design (8), Rigor, simulation and what-if (7).

**Essential to (17).**

- 2.2 Document pile to sourced entity graph
- 2.14 Research team of sub-agents building a knowledge graph
- 8.8 Red-team my analysis
- 8.9 Two agents debate over a graph
- 8.10 Parallel hypothesis exploration with helper agents
- 8.19 LLM-persona agent-based simulation
- 8.20 Stakeholder panel of simulated personas
- 8.23 Multi-agent annotation with agreement scoring
- 14.22 Missing-tool detector that drafts the fix
- 14.23 Exploratory QA bot
- 14.26 Usability study simulator
- 14.27 Scheduled self-exam of the agent's graph answers
- 15.7 Batch run over many files
- 15.21 Watch a swarm of sub-agents work
- 16.6 Classroom assignment grader and coach
- 16.14 Graph detective: generated murder mystery
- 16.31 Print-and-play card or board game from a graph

**Helpful to.** 56 use cases, for example 1.1 Find me a graph about X; 2.4 Community summaries of a corpus; 3.6 Format conversion with a loss report.

**Depends on.** F166 Budgets and limits (fan-out needs per-agent and total limits); F122 Live work visibility (the user must see what each sub-agent is doing); F167 Model routing and diversity (the configuration half chooses each agent's model).

**Other features build on it.** F110 Critique, debate and agreement protocols, F181 Agent-based simulation.

**Commonly needed with.** F122 Live work visibility (together in 73 use cases, 100% of this feature's); F166 Budgets and limits (together in 73 use cases, 100% of this feature's); F116 Grounding and citation (together in 38 use cases, 52% of this feature's); F156 Untrusted content handling (together in 42 use cases, 58% of this feature's); F15 Shared plan and task list (together in 33 use cases, 45% of this feature's); F54 Web search (together in 25 use cases, 34% of this feature's).

### F18 Error recovery and self-repair

**Definition.** Detect failures (timeouts, bad parses, tool errors, missing data, schema changes), diagnose the cause, retry or change approach within limits, and explain what happened in plain words.

**Includes.** Retry with backoff; repairing inputs; switching methods; clear failure reports when it gives up.

**Why use cases need it.** Steps that hit timeouts, parse errors, missing dates or failed downloads and must split the query, read the error and the offending region, retry another way, or set a file aside with the reason.

**Reach.** Essential to 6 use cases and helpful to 105; used in 11 of 18 categories, most in Science, health and scholarship (35), Everyday life: money, home, health, travel and hobbies (18), Investigations: finance, fraud, security, law and journalism (15).

**Essential to (6).**

- 1.3 Plain-English SPARQL pulls
- 3.5 Unit and currency normalization
- 3.7 Repair a file that will not load
- 7.14 Self-correcting analysis
- 14.17 Agent self-check of its own UI actions
- 15.7 Batch run over many files

**Helpful to.** 105 use cases, for example 1.1 Find me a graph about X; 2.2 Document pile to sourced entity graph; 5.1 Your own accounts as graphs.

**Depends on.** F119 Action log and audit trail (diagnosis reads what was run); F46 Versions, branches and structural diff (repair often reverts to a snapshot).

**Commonly needed with.** F81 External tools and connectors (together in 72 use cases, 65% of this feature's); F15 Shared plan and task list (together in 63 use cases, 57% of this feature's); F112 Schema enforcement (together in 81 use cases, 73% of this feature's); F33 Data import and schema design (together in 77 use cases, 69% of this feature's); F14 Planning (together in 61 use cases, 55% of this feature's); F118 Run records and show your work (together in 52 use cases, 47% of this feature's).

### F20 Reusable recipes

**Definition.** Capture a working procedure built from existing tools (query, crawl, pipeline, analysis) as a named, parameterized recipe that can be inspected, edited and rerun on new inputs. New code against extension points is F50.

**Includes.** Condensing a session's operation log into a recipe; rerun to refresh.

**Why use cases need it.** Steps that capture a working import, query, crawl or analysis as a named procedure and rerun it on new data or on a schedule ('rerun the query to refresh', 'record the session as a replayable recipe').

**Reach.** Essential to 9 use cases and helpful to 22; used in 10 of 18 categories, most in Cleaning and repairing data (10), Automation, integration, extension and teamwork (5), Finding and fetching data (4).

**Essential to (9).**

- 1.3 Plain-English SPARQL pulls
- 1.5 Pull a graph from a database, warehouse or graph store in plain language
- 3.15 Iterative cleaning loop with a human
- 3.16 Replayable cleaning recipe
- 15.1 Nightly refresh of a saved project from its source
- 15.5 Record a session as a reusable recipe
- 15.6 Recipe library and marketplace
- 15.7 Batch run over many files
- 15.13 Port a NetworkX, igraph or R script

**Helpful to.** 22 use cases, for example 1.2 Wikipedia list or category to graph; 2.11 Meeting transcript graphs; 3.2 Bipartite to one-mode projection.

**Depends on.** F118 Run records and show your work (a recipe is condensed from run records); F23 Project memory (recipes are stored in the project).

**Other features build on it.** F190 Shared recipe and extension marketplace.

**Commonly needed with.** F18 Error recovery and self-repair (together in 13 use cases, 42% of this feature's); F46 Versions, branches and structural diff (together in 12 use cases, 39% of this feature's); F27 Domain knowledge packs (together in 12 use cases, 39% of this feature's); F93 Durable jobs (together in 11 use cases, 35% of this feature's).

### F181 Agent-based simulation

**Definition.** Run many stateful persona agents that interact with each other over time under a budget, and measure what emerges.

**Includes.** Population setup; interaction rules; budgets (F166); outcome measurement.

**Why use cases need it.** Simulation steps that create a persona agent per node and let them interact over time under a budget.

**Reach.** Essential to 3 use cases and helpful to 0; used in 2 of 18 categories, most in Rigor, simulation and what-if (2), Help, support and product quality (1).

**Essential to (3).**

- 8.19 LLM-persona agent-based simulation
- 8.20 Stakeholder panel of simulated personas
- 14.26 Usability study simulator

**Helpful to.** No use case.

**Depends on.** F16 Sub-agents (persona agents are sub-agents); F166 Budgets and limits (simulations run under a budget); F167 Model routing and diversity (many agents run on cheap models).

**Commonly needed with.** No feature stands out: none shares at least 8 use cases and 30% of this feature's use cases while appearing with it at least 1.5 times as often as chance.

## Memory and knowledge

What the agent remembers about people and projects, and the reference knowledge it consults instead of guessing.

### F22 Cross-session user memory

**Definition.** Remember a user's or team's preferences, past sources, decisions and lessons, including a learned writing voice, and apply them in later sessions.

**Includes.** Stated and learned settings (role, language, accessibility needs, usual look, templates, palettes, tone, writing voice learned from samples). Learning from corrections is F187.

**Why use cases need it.** Steps that recall a user's language, sensitivities, liked and rejected sources, usual look, mastery or long-running projects in a later session ('remember the topic and seeds for future updates', 'recall the student's misconceptions').

**Reach.** Essential to 34 use cases and helpful to 110; used in 17 of 18 categories, most in Everyday life: money, home, health, travel and hobbies (21), Your own life as a graph (18), Publishing, storytelling and visual design (15).

**Essential to (34 in total; 10 representative, spread across categories).**

- 5.6 Gift and favor ledger
- 6.27 Informal savings groups and family remittance webs
- 7.17 Curiosity companion that watches you explore
- 9.1 Literature map from seed papers
- 10.2 Beneficial ownership and interlocking boards
- 13.16 Motion, flashing and sensory-sensitivity guard
- 14.4 Role-specific onboarding paths
- 16.1 Interactive graph theory lessons
- 17.19 Data-flow disclosure: what left this machine
- 18.1 Who-is-this memory companion for someone with memory loss

**Helpful to.** 110 use cases, for example 1.1 Find me a graph about X; 2.5 Text network of a document; 3.1 Schema inference for unknown files.

**Depends on.** F24 Memory viewer and editor (remembered facts must be viewable and editable); F151 Retention and deletion (and deletable).

**Other features build on it.** F187 Learning from feedback and outcomes.

**Commonly needed with.** No feature stands out: none shares at least 8 use cases and 30% of this feature's use cases while appearing with it at least 1.5 times as often as chance.

### F23 Project memory

**Definition.** Store queries, schemas, mappings, recipes, transcripts, notes, decisions and agent state inside a project so the work can be reopened, updated and reused.

**Includes.** Durable project notes and records; reopening a project with the agent's working state; project-scoped decisions.

**Why use cases need it.** Steps that save the project together with its watch definitions, mappings, rules found while cleaning, decisions and notes so the work can be reopened and continued ('save the project for the matter', 'remember the ledger').

**Reach.** Essential to 41 use cases and helpful to 160; used in 16 of 18 categories, most in Science, health and scholarship (49), Operations, infrastructure, software and organizations (32), Publishing, storytelling and visual design (30).

**Essential to (41 in total; 10 representative, spread across categories).**

- 1.3 Plain-English SPARQL pulls
- 2.3 Schema-guided extraction
- 3.10 Data quality report before analysis
- 5.6 Gift and favor ledger
- 6.6 Home knowledge graph
- 8.5 Hypothesis notebook with pre-registration
- 9.1 Literature map from seed papers
- 10.2 Beneficial ownership and interlocking boards
- 11.10 Codebase architecture and ownership map
- 15.1 Nightly refresh of a saved project from its source

**Helpful to.** 160 use cases, for example 1.1 Find me a graph about X; 2.13 Argument maps and claim graphs; 3.8 Duplicate node detection and merging.

**Other features build on it.** F02 Long-session context and transcript recall, F12 Scripted step-by-step sessions, F20 Reusable recipes, F188 Game and lesson session engine.

**Commonly needed with.** F14 Planning (together in 98 use cases, 49% of this feature's); F15 Shared plan and task list (together in 90 use cases, 45% of this feature's); F118 Run records and show your work (together in 88 use cases, 44% of this feature's).

### F24 Memory viewer and editor

**Definition.** Show the user what the agent remembers about them and let them inspect, correct and remove individual memories. Finding and deleting content everywhere with proof is F151.

**Includes.** Memory viewer; per-memory edit and remove.

**Why use cases need it.** Steps that let the user see what the agent learned about them and change or remove it, and that remove the agent's own memory when a project or person must be deleted.

**Reach.** Essential to 5 use cases and helpful to 11; used in 5 of 18 categories, most in Accessibility, voice and immersive interaction (6), Safety, privacy and misuse (5), Help, support and product quality (3).

**Essential to (5).**

- 14.4 Role-specific onboarding paths
- 14.18 Learned preferences as defaults
- 17.10 Remove one person from everything: erasure requests
- 17.31 Retention timer and auto-expiry for sensitive projects
- 18.9 Relapse-prevention map for people in recovery

**Helpful to.** 11 use cases, for example 2.12 The conversation itself as a graph; 13.1 Eyes-free graph for blind and low-vision users; 14.10 Notice struggle and offer help.

**Other features build on it.** F22 Cross-session user memory.

**Commonly needed with.** F22 Cross-session user memory (together in 11 use cases, 69% of this feature's); F125 Plain-language explanation (together in 8 use cases, 50% of this feature's).

### F25 Memory isolation

**Definition.** Keep memory and data partitioned per project or client, with explicit, permissioned linking across partitions.

**Includes.** Per-project memory scopes; deliberate cross-project links; no leakage between clients.

**Why use cases need it.** Investigation and client work where each matter's or client's terms, entities and decisions must stay in their own partition and never leak into another.

**Reach.** Essential to 3 use cases and helpful to 2; used in 2 of 18 categories, most in Investigations: finance, fraud, security, law and journalism (4), Science, health and scholarship (1).

**Essential to (3).**

- 9.33 Terminology concept graph for translators
- 10.2 Beneficial ownership and interlocking boards
- 10.11 Case-law citation network

**Helpful to.** 2 use cases, for example 10.5 Threat-intel pivoting.

**Commonly needed with.** No feature stands out: none shares at least 8 use cases and 30% of this feature's use cases while appearing with it at least 1.5 times as often as chance.

### F27 Domain knowledge packs

**Definition.** Install, version and trust packs of domain knowledge: procedures, checklists, glossaries, reference facts, method assumptions and caveats, standards, and rules by jurisdiction, consulted instead of relying on model recall alone.

**Includes.** Procedures and checklists; maintained terminology glossaries; method assumptions and interpretation rules; laws and rules by jurisdiction with when a qualified person must review; pack versioning and trust.

**Why use cases need it.** Steps that depend on reference knowledge the model should not guess: null models and multiple-comparison corrections, kinship terms, country codes and disputed territories, which privacy rules apply in a jurisdiction, field vocabulary.

**Reach.** Essential to 24 use cases and helpful to 102; used in 18 of 18 categories, most in Science, health and scholarship (24), Rigor, simulation and what-if (16), Cleaning and repairing data (13).

**Essential to (24 in total; 10 representative, spread across categories).**

- 4.2 Search the web for a dataset to join
- 5.19 What do I call this relative? Kinship beyond the Western family tree
- 7.2 Who matters most here, with the right kind of matters
- 7.5 Algorithm advisor and pre-flight check
- 8.1 Is my graph the right graph? Modeling check
- 8.3 Null-model significance testing
- 14.4 Role-specific onboarding paths
- 16.33 Differential diagnosis reasoning graph for medical students
- 17.25 Leak hunt: unmasking a whistleblower from communications graphs
- 18.13 Reentry map for people leaving prison

**Helpful to.** 102 use cases, for example 1.1 Find me a graph about X; 2.1 PDF or scanned document to graph; 3.1 Schema inference for unknown files.

**Other features build on it.** F29 Product knowledge pack, F143 Crisis detection and referral.

**Commonly needed with.** F118 Run records and show your work (together in 49 use cases, 39% of this feature's).

### F29 Product knowledge pack

**Definition.** A built-in domain knowledge pack (F27) of the product's own help, API reference and release notes that must match the product version actually running.

**Includes.** Version-matched docs; how-to answers; feature availability.

**Why use cases need it.** Help and support steps that search the help, API reference and release notes for the exact version running, plan a tour of the current interface, or check whether a requested feature already exists.

**Reach.** Essential to 11 use cases and helpful to 1; used in 3 of 18 categories, most in Help, support and product quality (10), Finding and fetching data (1), Automation, integration, extension and teamwork (1).

**Essential to (11).**

- 1.7 Build a data-source connector
- 14.1 Help desk that answers from the docs and cites them
- 14.2 Show-me mode: a live guided tour
- 14.7 A cheat sheet made for this user
- 14.8 Personalized what's new
- 14.9 Help in the user's language
- 14.10 Notice struggle and offer help
- 14.20 Feature request drafting and deduplication
- 14.21 Community answerer
- 14.24 Fixtures and property tests for plugin authors
- 15.12 Write a plugin from a paper

**Helpful to.** 1 use cases, for example 14.6 Explain a metric on this graph.

**Depends on.** F27 Domain knowledge packs (it is a built-in knowledge pack).

**Commonly needed with.** F99 Approval gate (together in 8 use cases, 67% of this feature's).

### F30 Semantic retrieval

**Definition.** Index text and items by meaning and search them, finding nearest neighbors and near-duplicates across a corpus or the project.

**Includes.** Embedding indexes; similarity search; duplicate detection among issues, requests or records.

**Why use cases need it.** Steps that find items by meaning rather than by exact words: nearest papers to an abstract, duplicate issues or feature requests, requirements matched to controls, themes across many messages, missing links by text similarity.

**Reach.** Essential to 10 use cases and helpful to 14; used in 7 of 18 categories, most in Help, support and product quality (9), Science, health and scholarship (7), Turning documents, media and conversation into graphs (3).

**Essential to (10).**

- 5.14 Notes vault, knowledge-base sync and browsing rabbit holes
- 9.3 Conversational literature landscape
- 9.4 Novelty check for an idea
- 9.21 Molecules, reactions and metabolism as graphs
- 9.22 Patent and technology landscape
- 10.13 Regulation-to-controls gap map
- 14.19 Bug report with a minimal reproduction, and support triage
- 14.20 Feature request drafting and deduplication
- 14.21 Community answerer
- 14.22 Missing-tool detector that drafts the fix

**Helpful to.** 14 use cases, for example 2.2 Document pile to sourced entity graph; 3.7 Repair a file that will not load; 8.24 Independent recomputation audit.

**Commonly needed with.** F79 Headless app instances (together in 9 use cases, 38% of this feature's); F84 Outbound writes (together in 13 use cases, 54% of this feature's); F145 Agent identity disclosure (together in 13 use cases, 54% of this feature's); F18 Error recovery and self-repair (together in 12 use cases, 50% of this feature's); F106 Hand-off to a person (together in 9 use cases, 38% of this feature's); F116 Grounding and citation (together in 13 use cases, 54% of this feature's).

### F187 Learning from feedback and outcomes

**Definition.** Store review verdicts, corrections, accepted or overridden recommendations, and estimate-versus-actual outcomes, and tune the agent's behavior and calibration from them.

**Includes.** Verdict and correction records; acceptance and override rates; estimate-versus-actual calibration.

**Why use cases need it.** Steps that keep review verdicts, corrections and estimate-versus-actual outcomes and use them to calibrate later work.

**Reach.** Essential to 1 use cases and helpful to 66; used in 13 of 18 categories, most in Science, health and scholarship (18), Turning documents, media and conversation into graphs (10), Investigations: finance, fraud, security, law and journalism (9).

**Essential to (1).**

- 12.32 Layout bake-off

**Helpful to.** 66 use cases, for example 1.6 Stakeholder map from a brief; 2.1 PDF or scanned document to graph; 3.3 Fix types column by column.

**Depends on.** F22 Cross-session user memory (learned behavior is stored as memory); F104 Review queue (verdicts come from review).

**Other features build on it.** F104 Review queue.

**Commonly needed with.** F104 Review queue (together in 65 use cases, 97% of this feature's); F35 Entity resolution (together in 36 use cases, 54% of this feature's); F108 Uncertainty reporting (together in 58 use cases, 87% of this feature's); F15 Shared plan and task list (together in 33 use cases, 49% of this feature's); F14 Planning (together in 34 use cases, 51% of this feature's); F23 Project memory (together in 40 use cases, 60% of this feature's).

## Graph and product tools

The agent's hands inside the product: reading, building, analyzing, styling and showing graphs, and operating the interface.

### F31 Graph data query

**Definition.** Query the loaded graph as structured data: nodes, edges, attributes, schema, neighborhoods, paths, filters, aggregates and algorithm results, including over graphs too large to read whole (with F03).

**Includes.** Counts, filters and aggregates; neighborhood and path queries; computed algorithm results. Interface state is F178.

**Why use cases need it.** Nearly every analysis step that reads the graph: quick counts, neighborhoods, paths, orphans, hubs checked against placeholder values, findings since last time, the source and date of every edge.

**Reach.** Essential to 166 use cases and helpful to 12; used in 18 of 18 categories, most in Operations, infrastructure, software and organizations (27), Publishing, storytelling and visual design (17), Asking the graph questions: guided analysis and explanation (14).

**Essential to (166 in total; 10 representative, spread across categories).**

- 3.3 Fix types column by column
- 5.1 Your own accounts as graphs
- 7.1 Explain this graph in 60 seconds
- 8.1 Is my graph the right graph? Modeling check
- 11.1 Multi-tier supplier risk map
- 12.3 Reproducible notebook export
- 13.1 Eyes-free graph for blind and low-vision users
- 15.1 Nightly refresh of a saved project from its source
- 16.2 Step-through algorithm animation
- 17.3 Operational-security mode for activists and journalists under repressive governments

**Helpful to.** 12 use cases, for example 4.4 Geocode places; 13.15 Sign language and caption-first collaboration for deaf users; 14.1 Help desk that answers from the docs and cites them.

**Other features build on it.** F04 Reference resolution, F36 Algorithm and layout execution.

**Commonly needed with.** No feature stands out: none shares at least 8 use cases and 30% of this feature's use cases while appearing with it at least 1.5 times as often as chance.

### F32 Graph editing

**Definition.** Add, remove, merge and change nodes, edges and attributes in the loaded graph, including derived columns and attached media.

**Includes.** Bulk edits; merges; derived attributes; photos, audio or images attached to nodes. Together with F31 and F36-F38 this covers the generic 'graph tools'.

**Why use cases need it.** Every step that builds or changes a graph: adding nodes and edges from evidence, merging, deriving attributes, filtering to an episode reached, building a branch for a trial, attaching a photo to a node.

**Reach.** Essential to 256 use cases and helpful to 17; used in 18 of 18 categories, most in Science, health and scholarship (43), Everyday life: money, home, health, travel and hobbies (31), Investigations: finance, fraud, security, law and journalism (24).

**Essential to (256 in total; 10 representative, spread across categories).**

- 3.1 Schema inference for unknown files
- 4.1 Fuzzy-key join of graph and spreadsheet
- 5.1 Your own accounts as graphs
- 6.1 Purchase graph and forgotten subscriptions
- 9.1 Literature map from seed papers
- 10.1 Money-flow tracing for anti-money-laundering
- 11.1 Multi-tier supplier risk map
- 15.3 Threshold and anomaly alerts
- 16.1 Interactive graph theory lessons
- 18.1 Who-is-this memory companion for someone with memory loss

**Helpful to.** 17 use cases, for example 7.3 Natural-language queries into selections and filters; 12.20 Story-ready visuals for journalists; 13.5 Cognitive load reducer.

**Depends on.** F47 Undo and rollback (agent edits must be undoable); F115 Element provenance (edited elements carry where they came from).

**Commonly needed with.** F47 Undo and rollback (together in 273 use cases, 100% of this feature's); F115 Element provenance (together in 273 use cases, 100% of this feature's); F100 Action proposal and dry-run preview (together in 273 use cases, 100% of this feature's).

### F33 Data import and schema design

**Definition.** Decide the node types, edge types and attributes for a graph, and map raw records (tables, files, API results) onto them.

**Includes.** Schema proposal and recording; column-to-node and column-to-edge mapping; loading data into the graph.

**Why use cases need it.** Steps that decide what the nodes and edges are and load data into them: building a co-action graph within time windows, a person-medication graph, a state graph, or loading a downloaded dataset.

**Reach.** Essential to 187 use cases and helpful to 2; used in 14 of 18 categories, most in Science, health and scholarship (37), Operations, infrastructure, software and organizations (32), Everyday life: money, home, health, travel and hobbies (27).

**Essential to (187 in total; 10 representative, spread across categories).**

- 1.1 Find me a graph about X
- 2.1 PDF or scanned document to graph
- 5.1 Your own accounts as graphs
- 6.1 Purchase graph and forgotten subscriptions
- 7.4 Multi-step analysis from one prompt
- 9.1 Literature map from seed papers
- 10.1 Money-flow tracing for anti-money-laundering
- 11.1 Multi-tier supplier risk map
- 15.3 Threshold and anomaly alerts
- 16.1 Interactive graph theory lessons

**Helpful to.** 2 use cases, for example 7.10 Compare my network against references; 8.18 Network growth forecast.

**Commonly needed with.** F112 Schema enforcement (together in 189 use cases, 100% of this feature's); F115 Element provenance (together in 168 use cases, 89% of this feature's); F157 Safe file inspection (together in 103 use cases, 54% of this feature's); F61 Read user files (together in 102 use cases, 54% of this feature's); F18 Error recovery and self-repair (together in 77 use cases, 41% of this feature's); F15 Shared plan and task list (together in 70 use cases, 37% of this feature's).

### F34 Data cleaning and normalization

**Definition.** Normalize, deduplicate and repair messy values (names, dates, units, spellings, identifiers).

**Includes.** Normalization rules; repair of damaged values; identifier normalization.

**Why use cases need it.** Steps that repair messy values before analysis: date formats and epochs, units and currencies, name suffixes and case, spreadsheet-damaged gene symbols, batches of country names to codes.

**Reach.** Essential to 12 use cases and helpful to 48; used in 8 of 18 categories, most in Science, health and scholarship (19), Everyday life: money, home, health, travel and hobbies (13), Investigations: finance, fraud, security, law and journalism (13).

**Essential to (12).**

- 3.3 Fix types column by column
- 3.4 Date and time normalization
- 3.5 Unit and currency normalization
- 3.15 Iterative cleaning loop with a human
- 4.1 Fuzzy-key join of graph and spreadsheet
- 4.2 Search the web for a dataset to join
- 9.5 Gene list to annotated interaction network
- 9.12 Food webs and extinction cascades
- 9.13 Survey-based social network study
- 9.29 Animal social networks from tracking data
- 10.1 Money-flow tracing for anti-money-laundering
- 10.3 Fraud and claim ring detection

**Helpful to.** 48 use cases, for example 1.3 Plain-English SPARQL pulls; 5.1 Your own accounts as graphs; 6.1 Purchase graph and forgotten subscriptions.

**Commonly needed with.** F33 Data import and schema design (together in 46 use cases, 77% of this feature's); F112 Schema enforcement (together in 48 use cases, 80% of this feature's); F32 Graph editing (together in 53 use cases, 88% of this feature's); F61 Read user files (together in 42 use cases, 70% of this feature's); F157 Safe file inspection (together in 42 use cases, 70% of this feature's); F115 Element provenance (together in 54 use cases, 90% of this feature's).

### F35 Entity resolution

**Definition.** Decide whether records from one or many sources refer to the same real-world person, place or thing, and merge them with evidence and confidence.

**Includes.** Candidate matching; scored merges; evidence kept with each merge; uncertain matches sent for review.

**Why use cases need it.** Steps that decide whether two records are the same thing: people across sources and spellings, assignee subsidiaries, donors and lobbyists, wallets under one owner, transfer pairs across accounts.

**Reach.** Essential to 79 use cases and helpful to 8; used in 14 of 18 categories, most in Your own life as a graph (16), Science, health and scholarship (16), Everyday life: money, home, health, travel and hobbies (10).

**Essential to (79 in total; 10 representative, spread across categories).**

- 2.2 Document pile to sourced entity graph
- 3.8 Duplicate node detection and merging
- 4.1 Fuzzy-key join of graph and spreadsheet
- 5.1 Your own accounts as graphs
- 6.1 Purchase graph and forgotten subscriptions
- 9.1 Literature map from seed papers
- 10.1 Money-flow tracing for anti-money-laundering
- 11.1 Multi-tier supplier risk map
- 17.1 Is this a scam? Contact map for an older relative
- 18.5 Tenant organizing and landlord portfolio map

**Helpful to.** 8 use cases, for example 3.20 Tag taxonomy from a messy folksonomy; 4.4 Geocode places; 5.4 Calendar time map.

**Depends on.** F104 Review queue (doubtful merges go to review); F108 Uncertainty reporting (merges carry a confidence).

**Commonly needed with.** F108 Uncertainty reporting (together in 87 use cases, 100% of this feature's); F104 Review queue (together in 36 use cases, 41% of this feature's); F187 Learning from feedback and outcomes (together in 36 use cases, 41% of this feature's); F116 Grounding and citation (together in 44 use cases, 51% of this feature's); F15 Shared plan and task list (together in 39 use cases, 45% of this feature's); F156 Untrusted content handling (together in 48 use cases, 55% of this feature's).

### F36 Algorithm and layout execution

**Definition.** Run graph algorithms and layouts (paths, centrality, communities, cycles, flow, link prediction, projection) and read their results.

**Includes.** Parameter selection; result retrieval; running layouts.

**Why use cases need it.** Steps that compute: centrality, communities, paths, single points of failure, critical paths, removal curves, link prediction, layouts at several thresholds or seeds.

**Reach.** Essential to 249 use cases and helpful to 19; used in 18 of 18 categories, most in Science, health and scholarship (45), Operations, infrastructure, software and organizations (34), Investigations: finance, fraud, security, law and journalism (26).

**Essential to (249 in total; 10 representative, spread across categories).**

- 5.2 Friend-of-a-friend map from social media exports
- 6.2 Money flow between my own accounts
- 7.1 Explain this graph in 60 seconds
- 9.1 Literature map from seed papers
- 10.1 Money-flow tracing for anti-money-laundering
- 11.1 Multi-tier supplier risk map
- 12.4 Draft a full paper from an analysis session
- 13.1 Eyes-free graph for blind and low-vision users
- 15.1 Nightly refresh of a saved project from its source
- 16.1 Interactive graph theory lessons

**Helpful to.** 19 use cases, for example 1.1 Find me a graph about X; 2.7 Whiteboard, sticky-note or photo to graph; 3.8 Duplicate node detection and merging.

**Depends on.** F42 Capability and catalog introspection (choosing a method needs the catalog of methods and their assumptions); F31 Graph data query (results are read back as graph data).

**Other features build on it.** F176 Fairness and disparate-impact audit.

**Commonly needed with.** F42 Capability and catalog introspection (together in 268 use cases, 100% of this feature's).

### F37 Style layers and annotation

**Definition.** Show findings on the graph through named, removable style layers and place notes, labels and callouts on the view.

**Includes.** Creating, editing, reordering and removing style layers; highlights, color scales, dashed previews, evidence overlays; annotations and panel letters.

**Why use cases need it.** Steps that show a result on the graph rather than in prose: highlighting coalitions, marking edges sourced or unsourced, evidence overlays, annotated figures and numbered legends, styles reapplied on refresh.

**Reach.** Essential to 170 use cases and helpful to 21; used in 18 of 18 categories, most in Science, health and scholarship (35), Operations, infrastructure, software and organizations (27), Publishing, storytelling and visual design (25).

**Essential to (170 in total; 10 representative, spread across categories).**

- 2.5 Text network of a document
- 6.8 Phone apps and permissions
- 7.1 Explain this graph in 60 seconds
- 8.2 Parameter sweep and sensitivity report
- 9.1 Literature map from seed papers
- 10.1 Money-flow tracing for anti-money-laundering
- 11.1 Multi-tier supplier risk map
- 12.1 Journal-ready figure package
- 15.1 Nightly refresh of a saved project from its source
- 16.1 Interactive graph theory lessons

**Helpful to.** 21 use cases, for example 2.4 Community summaries of a corpus; 3.8 Duplicate node detection and merging; 5.1 Your own accounts as graphs.

**Commonly needed with.** F38 View and camera control (together in 100 use cases, 52% of this feature's).

### F38 View and camera control

**Definition.** Drive what the user sees: camera, focus, zoom, filters, highlights, 2D/3D/VR mode, map overlay and time position.

**Includes.** Focusing on discussed nodes; dimension switching; filter and time slider settings.

**Why use cases need it.** Steps that change what the user sees: flying to a node, filters and time position for each paragraph of a story, side-by-side years, switching to 3D or VR, animating a time range.

**Reach.** Essential to 105 use cases and helpful to 37; used in 14 of 18 categories, most in Operations, infrastructure, software and organizations (27), Science, health and scholarship (26), Publishing, storytelling and visual design (21).

**Essential to (105 in total; 10 representative, spread across categories).**

- 3.12 Domain-rule consistency checks
- 5.1 Your own accounts as graphs
- 6.1 Purchase graph and forgotten subscriptions
- 7.1 Explain this graph in 60 seconds
- 8.14 Cascading failure and systemic risk
- 9.3 Conversational literature landscape
- 11.1 Multi-tier supplier risk map
- 12.1 Journal-ready figure package
- 15.15 Disagreement resolver for two versions of a graph
- 16.5 Homework checker with guardrails

**Helpful to.** 37 use cases, for example 3.2 Bipartite to one-mode projection; 4.1 Fuzzy-key join of graph and spreadsheet; 7.6 Why is this node ranked so high?.

**Other features build on it.** F39 Narrated tours and animation, F43 Clickable references and deep links.

**Commonly needed with.** F37 Style layers and annotation (together in 100 use cases, 70% of this feature's).

### F39 Narrated tours and animation

**Definition.** Drive the view through a sequence of stops or time steps with narration synchronized to what is on screen, with pacing, step-back and pause-to-answer.

**Includes.** Timeline playback controls; guided tours and presentations; interruptible presentations; narrating live changes as they happen.

**Why use cases need it.** Steps that walk an audience through a sequence: steppers over algorithm states, animated cascades, guided walkthroughs of patterns, live tours viewers can interrupt, narrating shifts as they happen.

**Reach.** Essential to 27 use cases and helpful to 4; used in 11 of 18 categories, most in Learning, play and creative work (8), Rigor, simulation and what-if (5), Your own life as a graph (4).

**Essential to (27 in total; 10 representative, spread across categories).**

- 6.25 Sports passing networks, live or after the match
- 7.1 Explain this graph in 60 seconds
- 8.9 Two agents debate over a graph
- 9.37 Earthquake triggering and fault networks
- 10.1 Money-flow tracing for anti-money-laundering
- 11.10 Codebase architecture and ownership map
- 12.12 Narrated guided tour and flythrough video
- 13.16 Motion, flashing and sensory-sensitivity guard
- 15.16 Review request with guided walkthrough
- 16.1 Interactive graph theory lessons

**Helpful to.** 4 use cases, for example 5.5 Group chat dynamics.

**Depends on.** F38 View and camera control (a tour drives the camera); F102 Stop and interrupt (presentations must be interruptible).

**Commonly needed with.** F129 Voice conversation (together in 15 use cases, 48% of this feature's); F38 View and camera control (together in 22 use cases, 71% of this feature's); F102 Stop and interrupt (together in 21 use cases, 68% of this feature's).

### F40 Product UI operation and pointing

**Definition.** Operate the product's own interface visibly on the user's behalf (open panels, set controls, switch modes) and spotlight or point at controls and canvas regions to show where something is.

**Includes.** Visible UI driving; spotlight overlays and labels on controls; teaching by pointing without clicking.

**Why use cases need it.** Teaching and help steps that spotlight a control and explain it without clicking, and steps where the agent visibly does the fiddly interface work for the user after one confirmation.

**Reach.** Essential to 7 use cases and helpful to 7; used in 3 of 18 categories, most in Help, support and product quality (8), Accessibility, voice and immersive interaction (4), Publishing, storytelling and visual design (2).

**Essential to (7).**

- 12.8 Slide deck from a project
- 12.12 Narrated guided tour and flythrough video
- 13.5 Cognitive load reducer
- 14.2 Show-me mode: a live guided tour
- 14.3 Learning by doing on the user's own data
- 14.5 What am I looking at?
- 14.17 Agent self-check of its own UI actions

**Helpful to.** 7 use cases, for example 13.7 Deixis and gesture: these, not those; 14.1 Help desk that answers from the docs and cites them.

**Depends on.** F178 App and view state reading (operating the interface needs its current state).

**Commonly needed with.** F178 App and view state reading (together in 14 use cases, 100% of this feature's); F31 Graph data query (together in 10 use cases, 71% of this feature's); F125 Plain-language explanation (together in 9 use cases, 64% of this feature's).

### F41 Interactive canvas tool modes

**Definition.** Install a temporary interaction mode on the canvas (click to remove a node, drag a slider) whose effects the agent recomputes live.

**Includes.** Temporary modes with clear exit; live recomputation on each interaction.

**Why use cases need it.** Exploration and play steps that install a temporary mode on the canvas (click to remove a node, play a move) and recompute the result after every interaction.

**Reach.** Essential to 2 use cases and helpful to 3; used in 4 of 18 categories, most in Learning, play and creative work (2), Your own life as a graph (1), Asking the graph questions: guided analysis and explanation (1).

**Essential to (2).**

- 8.12 Resilience: what breaks if we lose this?
- 16.15 Play against the agent: Hex, Shannon switching, coloring duels

**Helpful to.** 3 use cases, for example 5.8 Wedding or party seating planner; 7.12 Ego network on demand; 16.3 Socratic tutor that targets misconceptions.

**Commonly needed with.** No feature stands out: none shares at least 8 use cases and 30% of this feature's use cases while appearing with it at least 1.5 times as often as chance.

### F42 Capability and catalog introspection

**Definition.** Discover which algorithms, layouts, tools, formats and device features exist and are available here, with their parameters, assumptions, outputs, limits and reasons for unavailability.

**Includes.** Tool catalog with parameter schemas; device and browser capability checks (GPU, VR, audio, sensors).

**Why use cases need it.** Steps that choose a method and must know what is available and what it assumes: whether a graph is directed or weighted, which algorithm fits, whether this device has eye tracking or spatial audio, why a capability is missing.

**Reach.** Essential to 11 use cases and helpful to 269; used in 18 of 18 categories, most in Science, health and scholarship (45), Operations, infrastructure, software and organizations (34), Investigations: finance, fraud, security, law and journalism (26).

**Essential to (11).**

- 3.6 Format conversion with a loss report
- 7.2 Who matters most here, with the right kind of matters
- 7.5 Algorithm advisor and pre-flight check
- 7.14 Self-correcting analysis
- 8.17 Link prediction with a backtest
- 13.1 Eyes-free graph for blind and low-vision users
- 13.17 Switch and eye-gaze access on the desktop
- 13.19 Biometric-adaptive immersive sessions
- 14.13 Performance tuner
- 14.14 Capability check for this machine
- 14.19 Bug report with a minimal reproduction, and support triage

**Helpful to.** 269 use cases, for example 1.1 Find me a graph about X; 2.4 Community summaries of a corpus; 3.2 Bipartite to one-mode projection.

**Other features build on it.** F36 Algorithm and layout execution.

**Commonly needed with.** F36 Algorithm and layout execution (together in 268 use cases, 96% of this feature's).

### F43 Clickable references and deep links

**Definition.** Put links in the agent's text that select, focus or highlight what they mention, and produce links that reopen the product at an exact project, view, selection, time, step or moment in a conversation transcript.

**Includes.** In-chat element links; durable deep links into the product; deep links into a transcript.

**Why use cases need it.** Steps that make each finding one click away, text a link to an answer, save an exact view for later, or jump back to a moment in a transcript.

**Reach.** Essential to 6 use cases and helpful to 29; used in 10 of 18 categories, most in Asking the graph questions: guided analysis and explanation (9), Automation, integration, extension and teamwork (9), Rigor, simulation and what-if (5).

**Essential to (6).**

- 2.12 The conversation itself as a graph
- 7.1 Explain this graph in 60 seconds
- 7.17 Curiosity companion that watches you explore
- 13.12 Phone-call mode: ask your graph while driving
- 15.18 Shift handoff for investigations
- 15.39 Glanceable graph facts on a watch, widget or lock screen

**Helpful to.** 29 use cases, for example 1.4 Scrape a site's link structure; 2.5 Text network of a document; 3.13 Validate against a schema or standard.

**Depends on.** F38 View and camera control (a link focuses the view); F46 Versions, branches and structural diff (durable links point at a version).

**Commonly needed with.** F31 Graph data query (together in 20 use cases, 57% of this feature's); F119 Action log and audit trail (together in 16 use cases, 46% of this feature's); F125 Plain-language explanation (together in 17 use cases, 49% of this feature's).

### F45 Multi-graph display and visual diff

**Definition.** Show several graphs, versions or branches at once: side by side, linked, or as a visual difference overlay. The versions themselves are F46.

**Includes.** Linked views; diff overlays between two versions.

**Why use cases need it.** Steps that compare: two candidate datasets, original and repaired graphs, before and after a fault or a cut, two prompt results, years side by side, a fairer picture beside the original.

**Reach.** Essential to 24 use cases and helpful to 8; used in 13 of 18 categories, most in Operations, infrastructure, software and organizations (11), Asking the graph questions: guided analysis and explanation (4), Rigor, simulation and what-if (3).

**Essential to (24 in total; 10 representative, spread across categories).**

- 1.1 Find me a graph about X
- 5.16 Life decision what-if
- 7.8 Compare two network versions
- 8.1 Is my graph the right graph? Modeling check
- 11.1 Multi-tier supplier risk map
- 11.7 Transit accessibility and equity
- 12.28 Figure and layout honesty review
- 13.7 Deixis and gesture: these, not those
- 15.14 Analysis version history with visual diffs
- 17.35 Check whether a received graph or figure was tampered with

**Helpful to.** 8 use cases, for example 3.2 Bipartite to one-mode projection; 6.25 Sports passing networks, live or after the match; 7.2 Who matters most here, with the right kind of matters.

**Depends on.** F46 Versions, branches and structural diff (the versions to compare).

**Commonly needed with.** F46 Versions, branches and structural diff (together in 23 use cases, 72% of this feature's); F38 View and camera control (together in 17 use cases, 53% of this feature's); F33 Data import and schema design (together in 19 use cases, 59% of this feature's); F141 Domain advisory framing (together in 11 use cases, 34% of this feature's); F157 Safe file inspection (together in 17 use cases, 53% of this feature's); F51 Render capture (together in 11 use cases, 34% of this feature's).

### F46 Versions, branches and structural diff

**Definition.** Keep named versions and snapshots of the graph, data and analyses, never altering the user's original; fork disposable branches for what-if work; compute structural differences; promote or discard branches.

**Includes.** Snapshots before risky changes; restore; scenario sandboxes as disposable branches; branch, merge and discard; structural diffs; the controlled-experiment pattern (branch, change one variable, measure with F124, keep or discard).

**Why use cases need it.** Steps that must never touch the original (repair a copy, test a cut in a branch, preview candidate edges dashed in a branch) and steps that compare versions over time or keep a baseline for next month.

**Reach.** Essential to 49 use cases and helpful to 65; used in 18 of 18 categories, most in Operations, infrastructure, software and organizations (29), Cleaning and repairing data (15), Automation, integration, extension and teamwork (12).

**Essential to (49 in total; 10 representative, spread across categories).**

- 3.3 Fix types column by column
- 4.9 Provenance on every node and edge
- 5.16 Life decision what-if
- 7.6 Why is this node ranked so high?
- 8.1 Is my graph the right graph? Modeling check
- 11.1 Multi-tier supplier risk map
- 12.5 Response to peer reviewers
- 13.16 Motion, flashing and sensory-sensitivity guard
- 14.8 Personalized what's new
- 15.1 Nightly refresh of a saved project from its source

**Helpful to.** 65 use cases, for example 1.1 Find me a graph about X; 2.3 Schema-guided extraction; 3.2 Bipartite to one-mode projection.

**Other features build on it.** F18 Error recovery and self-repair, F43 Clickable references and deep links, F45 Multi-graph display and visual diff, F47 Undo and rollback, F49 Incremental source sync and change detection, F118 Run records and show your work.

**Commonly needed with.** No feature stands out: none shares at least 8 use cases and 30% of this feature's use cases while appearing with it at least 1.5 times as often as chance.

### F47 Undo and rollback

**Definition.** Reverse the agent's own actions, one specific step or a whole run, in the product and in outside systems, without disturbing the user's other work.

**Includes.** Grouped agent actions as one undo unit; selective undo of one step; compensating actions in outside systems.

**Why use cases need it.** Steps that change data and promise to be reversible ('keep an undoable merge log', 'roll back just that step and keep later ones', 'go back' by voice, compensating changes written back to outside systems).

**Reach.** Essential to 13 use cases and helpful to 293; used in 18 of 18 categories, most in Science, health and scholarship (43), Everyday life: money, home, health, travel and hobbies (31), Operations, infrastructure, software and organizations (25).

**Essential to (13).**

- 3.8 Duplicate node detection and merging
- 3.14 Knowledge-graph consistency and curation
- 3.15 Iterative cleaning loop with a human
- 3.18 Standing graph steward and dataset curator
- 3.19 Cleaning in VR by voice and pointing
- 7.4 Multi-step analysis from one prompt
- 7.14 Self-correcting analysis
- 13.5 Cognitive load reducer
- 13.17 Switch and eye-gaze access on the desktop
- 14.8 Personalized what's new
- 14.11 Session time travel
- 14.13 Performance tuner
- 15.29 Executable workflow from a drawn graph

**Helpful to.** 293 use cases, for example 1.2 Wikipedia list or category to graph; 2.1 PDF or scanned document to graph; 3.1 Schema inference for unknown files.

**Depends on.** F119 Action log and audit trail (undo needs the record of what was done); F46 Versions, branches and structural diff (rollback restores a snapshot).

**Other features build on it.** F32 Graph editing, F84 Outbound writes.

**Commonly needed with.** F32 Graph editing (together in 273 use cases, 89% of this feature's); F115 Element provenance (together in 280 use cases, 92% of this feature's).

### F48 Live streaming updates

**Definition.** Push results, events and live data feeds into the visible graph as they arrive, without a full reload.

**Includes.** Incremental insertion; windowing, decay and back-pressure for streams.

**Why use cases need it.** Steps that ingest a live feed (event streams, badge readers, traffic, a live game) and keep the visible graph updating without a reload, often as a live overlay for a team.

**Reach.** Essential to 12 use cases and helpful to 7; used in 8 of 18 categories, most in Turning documents, media and conversation into graphs (5), Operations, infrastructure, software and organizations (5), Finding and fetching data (2).

**Essential to (12).**

- 2.12 The conversation itself as a graph
- 6.25 Sports passing networks, live or after the match
- 11.8 Microservice call graph from traces
- 11.9 Streaming graph from an event feed
- 11.24 Co-presence network from proximity sensors
- 11.30 Incident command and mutual-aid resource graph
- 11.37 Machine-internal networks read from a diagnostic port
- 12.45 Live overlay for broadcasts and video calls
- 13.22 Live tangible tabletop: move physical tokens and the graph follows
- 15.21 Watch a swarm of sub-agents work
- 16.1 Interactive graph theory lessons
- 16.12 Six degrees of anything

**Helpful to.** 7 use cases, for example 1.2 Wikipedia list or category to graph; 2.2 Document pile to sourced entity graph; 15.26 Dispatch a graph-planned route to robots or drones.

**Commonly needed with.** F128 Low-latency streaming responses (together in 8 use cases, 42% of this feature's); F102 Stop and interrupt (together in 15 use cases, 79% of this feature's); F33 Data import and schema design (together in 13 use cases, 68% of this feature's); F112 Schema enforcement (together in 13 use cases, 68% of this feature's); F93 Durable jobs (together in 9 use cases, 47% of this feature's); F96 User notification policy (together in 8 use cases, 42% of this feature's).

### F49 Incremental source sync and change detection

**Definition.** Keep a graph current with its sources by pulling only what changed, flag what is new since last time, track freshness, and pull edits back from linked outside copies. Pushed live feeds are F48.

**Includes.** Delta sync; comparing a new run with the saved previous state; per-value freshness; two-way sync with an exported copy.

**Why use cases need it.** Steps that rerun on new data and report only what changed: new citing papers, amended regulations, nightly re-imports, quarter-over-quarter edges, new interview batches.

**Reach.** Essential to 16 use cases and helpful to 25; used in 13 of 18 categories, most in Science, health and scholarship (7), Everyday life: money, home, health, travel and hobbies (6), Finding and fetching data (5).

**Essential to (16).**

- 5.15 Dream and voice-memo journal graph
- 5.17 Lifelong personal graph walked in VR
- 6.30 Project plan and calendar holds from a dependency graph
- 9.2 Literature and citation watch
- 9.9 Comorbidity and adverse-event watch
- 9.10 Outbreak contact tracing board
- 9.26 Origin-destination flows: migration, commuting, bike share
- 9.39 Microbiome and soil co-occurrence networks
- 10.4 Privilege attack paths in directories and clouds
- 10.7 Vulnerability blast radius
- 10.13 Regulation-to-controls gap map
- 10.24 Defined terms and cross-references in a contract or statute
- 12.48 Editable diagram in the team's whiteboard or docs-as-code
- 13.21 Personal step-free route network for wheelchair users
- 15.1 Nightly refresh of a saved project from its source
- 18.2 Bureaucracy navigator for immigrants and refugees

**Helpful to.** 25 use cases, for example 1.2 Wikipedia list or category to graph; 2.3 Schema-guided extraction; 3.16 Replayable cleaning recipe.

**Depends on.** F95 Triggers (sync runs on a schedule or event); F46 Versions, branches and structural diff (changes are diffed against the saved version).

**Commonly needed with.** F95 Triggers (together in 30 use cases, 73% of this feature's); F96 User notification policy (together in 21 use cases, 51% of this feature's); F23 Project memory (together in 28 use cases, 68% of this feature's); F81 External tools and connectors (together in 23 use cases, 56% of this feature's); F112 Schema enforcement (together in 27 use cases, 66% of this feature's); F18 Error recovery and self-repair (together in 19 use cases, 46% of this feature's).

### F50 Extension authoring and installation

**Definition.** Write new code against the product's extension points (algorithm, importer, layout, data source), test it, save agent-written code as a named tool, and install it into the live session.

**Includes.** Generated extension code; tests run before install; registration into the running product; saving agent-written code as a reusable named tool.

**Why use cases need it.** Steps that turn a missing capability into code: write a plugin against the product's extension points, test it on examples, and install it into the running session after approval.

**Reach.** Essential to 4 use cases and helpful to 0; used in 3 of 18 categories, most in Automation, integration, extension and teamwork (2), Finding and fetching data (1), Help, support and product quality (1).

**Essential to (4).**

- 1.7 Build a data-source connector
- 14.24 Fixtures and property tests for plugin authors
- 15.12 Write a plugin from a paper
- 15.13 Port a NetworkX, igraph or R script

**Helpful to.** No use case.

**Depends on.** F74 Sandboxed code execution (generated code is tested in the sandbox before install); F156 Untrusted content handling (installed code is untrusted until vetted).

**Other features build on it.** F190 Shared recipe and extension marketplace.

**Commonly needed with.** No feature stands out: none shares at least 8 use cases and 30% of this feature's use cases while appearing with it at least 1.5 times as often as chance.

### F51 Render capture

**Definition.** Render the graph, a view or the app's UI to images, high-resolution figures, thumbnails, frame sequences or video at a chosen size, headlessly if needed.

**Includes.** Screenshots of the agent's own view; publication-quality figures; frame sequences for animation.

**Why use cases need it.** Steps that produce images of the graph: publication figures, thumbnails for posts, frames for animation, screenshots the agent itself checks, headless renders inside a pipeline.

**Reach.** Essential to 66 use cases and helpful to 24; used in 12 of 18 categories, most in Publishing, storytelling and visual design (28), Science, health and scholarship (15), Operations, infrastructure, software and organizations (11).

**Essential to (66 in total; 10 representative, spread across categories).**

- 8.8 Red-team my analysis
- 9.6 Pathway diff between conditions
- 10.10 Investigation timeline
- 11.3 Forced-labor provenance tracing
- 12.1 Journal-ready figure package
- 12.4 Draft a full paper from an analysis session
- 13.2 Alt text and layered descriptions
- 14.17 Agent self-check of its own UI actions
- 15.8 Graph step in someone else's pipeline
- 16.4 Course kit for instructors

**Helpful to.** 24 use cases, for example 3.4 Date and time normalization; 6.17 Travel history globe; 7.6 Why is this node ranked so high?.

**Commonly needed with.** F64 Vision (together in 38 use cases, 42% of this feature's); F38 View and camera control (together in 42 use cases, 47% of this feature's).

### F52 Immersive scene control

**Definition.** Build and drive immersive 3D or VR scenes, rooms and walk-throughs around the graph.

**Includes.** Scene layout; guided walk-throughs; time slices in space.

**Why use cases need it.** Steps that build a 3D or VR scene: time slices laid out for walking, brain regions at real coordinates, communities as rooms, multi-headset rooms, guided fly-throughs.

**Reach.** Essential to 13 use cases and helpful to 5; used in 5 of 18 categories, most in Accessibility, voice and immersive interaction (8), Learning, play and creative work (5), Science, health and scholarship (3).

**Essential to (13).**

- 3.19 Cleaning in VR by voice and pointing
- 5.17 Lifelong personal graph walked in VR
- 9.20 Brain connectome explorer
- 9.36 Crystals, meshes and materials as graphs
- 9.38 Space: the cosmic web, satellite constellations and debris close approaches
- 13.6 Voice navigation and hands-free control in VR and AR
- 13.8 Walking conversation in room-scale VR
- 13.10 Recorded VR/AR guided tour
- 16.4 Course kit for instructors
- 16.11 Memory palace from a graph
- 16.16 Graph escape room in VR
- 16.28 Choose-your-own-adventure authored as a graph
- 16.34 Playable game world generated from a graph

**Helpful to.** 5 use cases, for example 13.1 Eyes-free graph for blind and low-vision users.

**Commonly needed with.** F130 Multimodal input and pointing (together in 11 use cases, 61% of this feature's); F128 Low-latency streaming responses (together in 8 use cases, 44% of this feature's); F129 Voice conversation (together in 11 use cases, 61% of this feature's); F42 Capability and catalog introspection (together in 17 use cases, 94% of this feature's); F36 Algorithm and layout execution (together in 16 use cases, 89% of this feature's); F102 Stop and interrupt (together in 11 use cases, 61% of this feature's).

### F53 Geospatial handling

**Definition.** Work with coordinates, places, distances, routes, map projections, geographic layouts and map layers, using the user's own location only when permitted.

**Includes.** Geocoding; map overlays; distance and route reasoning.

**Why use cases need it.** Steps that involve places: geocoding addresses within a quota, fetching open map data, drive times, terrain line of sight, flows on a map, adjacency of precincts.

**Reach.** Essential to 35 use cases and helpful to 53; used in 16 of 18 categories, most in Science, health and scholarship (12), Everyday life: money, home, health, travel and hobbies (11), Operations, infrastructure, software and organizations (11).

**Essential to (35 in total; 10 representative, spread across categories).**

- 2.15 Field data collection
- 4.4 Geocode places
- 5.16 Life decision what-if
- 6.9 Kids' carpool and activity network
- 8.16 Traffic and routing what-ifs
- 9.11 Pathogen phylogeny plus mobility
- 10.8 Bot and coordinated-behavior detection
- 11.1 Multi-tier supplier risk map
- 12.38 Map and GIS export
- 18.12 Check-on-each-other network for heat waves and outages

**Helpful to.** 53 use cases, for example 1.6 Stakeholder map from a brief; 2.2 Document pile to sourced entity graph; 4.2 Search the web for a dataset to join.

**Commonly needed with.** F33 Data import and schema design (together in 51 use cases, 58% of this feature's); F81 External tools and connectors (together in 43 use cases, 49% of this feature's); F55 Web fetch (together in 34 use cases, 39% of this feature's).

### F169 Entity linking to external authorities

**Definition.** Attach stable identifiers from outside authorities (knowledge bases, researcher, organization, place, gene and legal-entity registries, country codes) to nodes, disambiguating by context, with confidence scores, a queue for doubtful links, and care that a wrong id does not look authoritative.

**Includes.** Registry lookups; context disambiguation; confidence; doubtful-link queue (F104).

**Why use cases need it.** Steps that attach stable outside identifiers (gene ids, scholarly records, country codes, authority files) with confidence and a queue for doubtful links.

**Reach.** Essential to 12 use cases and helpful to 0; used in 6 of 18 categories, most in Science, health and scholarship (4), Enriching, joining and tracking where data came from (3), Cleaning and repairing data (2).

**Essential to (12).**

- 1.2 Wikipedia list or category to graph
- 3.15 Iterative cleaning loop with a human
- 3.17 Translate and transliterate labels
- 4.2 Search the web for a dataset to join
- 4.3 Entity resolution against an authority
- 4.16 Send corrections back to the open data the graph came from
- 7.8 Compare two network versions
- 9.1 Literature map from seed papers
- 9.5 Gene list to annotated interaction network
- 9.6 Pathway diff between conditions
- 9.16 Historical correspondence network
- 12.42 Publish as linked data

**Helpful to.** No use case.

**Depends on.** F81 External tools and connectors (registry lookups); F104 Review queue (doubtful links go to review); F108 Uncertainty reporting (links carry a confidence).

**Commonly needed with.** F104 Review queue (together in 8 use cases, 67% of this feature's); F187 Learning from feedback and outcomes (together in 8 use cases, 67% of this feature's); F35 Entity resolution (together in 9 use cases, 75% of this feature's); F108 Uncertainty reporting (together in 12 use cases, 100% of this feature's); F81 External tools and connectors (together in 9 use cases, 75% of this feature's); F23 Project memory (together in 8 use cases, 67% of this feature's).

### F178 App and view state reading

**Definition.** Read a snapshot of the interface as structured data: selection, style layer stack, camera, mode, panels, settings, versions, errors and recent operations, for help, self-checks and session time travel.

**Includes.** Selection and camera; layer stack; panel and settings state; recent operations and errors.

**Why use cases need it.** Help and explanation steps that read the selection, layer stack, camera, settings and recent errors to answer 'why is this red?' or 'what was I trying to do?'.

**Reach.** Essential to 23 use cases and helpful to 15; used in 8 of 18 categories, most in Help, support and product quality (16), Accessibility, voice and immersive interaction (10), Asking the graph questions: guided analysis and explanation (4).

**Essential to (23 in total; 10 representative, spread across categories).**

- 3.2 Bipartite to one-mode projection
- 7.6 Why is this node ranked so high?
- 8.18 Network growth forecast
- 11.35 Survey and form logic as a graph
- 12.33 Color-blind and contrast audit
- 13.2 Alt text and layered descriptions
- 13.6 Voice navigation and hands-free control in VR and AR
- 14.5 What am I looking at?
- 14.10 Notice struggle and offer help
- 15.11 Graph result to action across tools

**Helpful to.** 15 use cases, for example 7.12 Ego network on demand; 13.1 Eyes-free graph for blind and low-vision users; 14.1 Help desk that answers from the docs and cites them.

**Other features build on it.** F04 Reference resolution, F40 Product UI operation and pointing.

**Commonly needed with.** F05 User activity awareness (together in 18 use cases, 47% of this feature's); F40 Product UI operation and pointing (together in 14 use cases, 37% of this feature's); F31 Graph data query (together in 21 use cases, 55% of this feature's); F125 Plain-language explanation (together in 20 use cases, 53% of this feature's).

## Information gathering

Finding and reading material from the outside world, politely and within its terms.

### F54 Web search

**Definition.** Search the open web and specialized indexes (scholarly, registries, data portals) and get ranked results to read further.

**Includes.** General and specialized search; result ranking and filtering.

**Why use cases need it.** Steps that look for something whose address is unknown: datasets on a topic, related work, a target's format limits, people-search exposure, official guidance, comparable published networks.

**Reach.** Essential to 59 use cases and helpful to 20; used in 15 of 18 categories, most in Everyday life: money, home, health, travel and hobbies (13), Your own life as a graph (7), Investigations: finance, fraud, security, law and journalism (7).

**Essential to (59 in total; 10 representative, spread across categories).**

- 1.1 Find me a graph about X
- 2.6 Structural-gap research questions
- 5.6 Gift and favor ledger
- 6.5 Home inventory and moving plan
- 9.5 Gene list to annotated interaction network
- 10.7 Vulnerability blast radius
- 11.1 Multi-tier supplier risk map
- 12.1 Journal-ready figure package
- 16.4 Course kit for instructors
- 18.2 Bureaucracy navigator for immigrants and refugees

**Helpful to.** 20 use cases, for example 1.7 Build a data-source connector; 4.8 Proposed missing edges as a separate layer; 5.19 What do I call this relative? Kinship beyond the Western family tree.

**Depends on.** F156 Untrusted content handling (search results are untrusted content).

**Commonly needed with.** F55 Web fetch (together in 68 use cases, 86% of this feature's); F156 Untrusted content handling (together in 79 use cases, 100% of this feature's); F116 Grounding and citation (together in 62 use cases, 78% of this feature's); F15 Shared plan and task list (together in 33 use cases, 42% of this feature's); F22 Cross-session user memory (together in 36 use cases, 46% of this feature's); F16 Sub-agents (together in 25 use cases, 32% of this feature's).

### F55 Web fetch

**Definition.** Retrieve a specific web page, feed, document, data file or API response by address and read it as content.

**Includes.** Pages, PDFs, data files, API responses.

**Why use cases need it.** Steps that read a known address: a dataset's landing page, a regulator filing, a list page, a paper, a fraud database, an API response.

**Reach.** Essential to 100 use cases and helpful to 24; used in 18 of 18 categories, most in Science, health and scholarship (16), Everyday life: money, home, health, travel and hobbies (15), Operations, infrastructure, software and organizations (10).

**Essential to (100 in total; 10 representative, spread across categories).**

- 1.1 Find me a graph about X
- 5.7 Job search warm-intro paths
- 6.6 Home knowledge graph
- 8.11 Careful causal sketch from correlations
- 9.15 Board interlocks and elite networks
- 10.9 OSINT event reconstruction
- 11.1 Multi-tier supplier risk map
- 12.1 Journal-ready figure package
- 16.4 Course kit for instructors
- 17.1 Is this a scam? Contact map for an older relative

**Helpful to.** 24 use cases, for example 1.3 Plain-English SPARQL pulls; 3.13 Validate against a schema or standard; 4.8 Proposed missing edges as a separate layer.

**Depends on.** F156 Untrusted content handling (fetched content is untrusted); F58 Rate limiting and politeness (fetching must respect rate limits).

**Commonly needed with.** F156 Untrusted content handling (together in 124 use cases, 100% of this feature's); F54 Web search (together in 68 use cases, 55% of this feature's); F116 Grounding and citation (together in 84 use cases, 68% of this feature's); F81 External tools and connectors (together in 58 use cases, 47% of this feature's); F15 Shared plan and task list (together in 47 use cases, 38% of this feature's).

### F56 Browser automation

**Definition.** Drive a real or headless browser the agent controls to render script-heavy pages, follow links, crawl multi-page sites, record network requests and fill web forms under supervision.

**Includes.** Crawling; portal navigation; supervised form filling; rendering tests.

**Why use cases need it.** Steps that need a real browser: crawling a site into a link graph, recording third-party requests, testing an output at phone and desktop sizes, submitting a portal form after approval.

**Reach.** Essential to 9 use cases and helpful to 4; used in 7 of 18 categories, most in Publishing, storytelling and visual design (5), Your own life as a graph (3), Finding and fetching data (1).

**Essential to (9).**

- 1.4 Scrape a site's link structure
- 6.31 Property-chain tracker for homebuyers and conveyancers
- 11.28 Internet plumbing behind a service
- 12.14 Standalone interactive web page and embed
- 12.15 Scrollytelling data story
- 12.39 3D model for game engines, 3D tools and AR viewers
- 12.42 Publish as linked data
- 12.44 Civic submission: public comment, testimony or petition packet
- 15.31 Website internal-linking plan pushed to the CMS

**Helpful to.** 4 use cases, for example 2.13 Argument maps and claim graphs; 5.9 Family tree from scattered sources.

**Depends on.** F156 Untrusted content handling (pages are untrusted); F58 Rate limiting and politeness (crawling must be polite); F59 License and terms checks (terms and robots rules).

**Commonly needed with.** F156 Untrusted content handling (together in 13 use cases, 100% of this feature's); F55 Web fetch (together in 10 use cases, 77% of this feature's); F09 Clarifying questions (together in 11 use cases, 85% of this feature's); F99 Approval gate (together in 8 use cases, 62% of this feature's).

### F57 Large and paged transfers

**Definition.** Download or upload large files and fetch large result sets in pages or chunks, with size checks, streaming and resume from where it stopped.

**Includes.** Paging through APIs; resumable downloads; size limits before transfer.

**Why use cases need it.** Steps that download large datasets with resume and size caps and page through large result sets.

**Reach.** Essential to 3 use cases and helpful to 10; used in 9 of 18 categories, most in Finding and fetching data (4), Turning documents, media and conversation into graphs (2), Cleaning and repairing data (1).

**Essential to (3).**

- 1.1 Find me a graph about X
- 1.3 Plain-English SPARQL pulls
- 1.5 Pull a graph from a database, warehouse or graph store in plain language

**Helpful to.** 10 use cases, for example 1.2 Wikipedia list or category to graph; 2.19 Screen recording to a map of how work actually flows; 3.5 Unit and currency normalization.

**Depends on.** F157 Safe file inspection (size checks before transfer); F93 Durable jobs (resumable transfers outlive a turn).

**Commonly needed with.** F81 External tools and connectors (together in 9 use cases, 69% of this feature's); F55 Web fetch (together in 8 use cases, 62% of this feature's); F166 Budgets and limits (together in 9 use cases, 69% of this feature's); F116 Grounding and citation (together in 8 use cases, 62% of this feature's); F112 Schema enforcement (together in 9 use cases, 69% of this feature's); F33 Data import and schema design (together in 8 use cases, 62% of this feature's).

### F58 Rate limiting and politeness

**Definition.** Pace requests to outside services, honor their limits and quotas, back off on throttling and resume afterward.

**Includes.** Per-service pacing; quota tracking; backoff and resume.

**Why use cases need it.** Steps that make many lookups against public services and must pace them, honor quotas and back off on throttling.

**Reach.** Essential to 4 use cases and helpful to 26; used in 12 of 18 categories, most in Finding and fetching data (6), Enriching, joining and tracking where data came from (6), Cleaning and repairing data (4).

**Essential to (4).**

- 1.2 Wikipedia list or category to graph
- 1.3 Plain-English SPARQL pulls
- 1.4 Scrape a site's link structure
- 4.16 Send corrections back to the open data the graph came from

**Helpful to.** 26 use cases, for example 1.1 Find me a graph about X; 2.14 Research team of sub-agents building a knowledge graph; 3.5 Unit and currency normalization.

**Other features build on it.** F55 Web fetch, F56 Browser automation.

**Commonly needed with.** F166 Budgets and limits (together in 24 use cases, 80% of this feature's); F55 Web fetch (together in 19 use cases, 63% of this feature's); F81 External tools and connectors (together in 20 use cases, 67% of this feature's); F156 Untrusted content handling (together in 22 use cases, 73% of this feature's); F116 Grounding and citation (together in 19 use cases, 63% of this feature's); F122 Live work visibility (together in 18 use cases, 60% of this feature's).

### F59 License and terms checks

**Definition.** Find and respect data licenses, platform terms, robots rules, copyright and redistribution restrictions before fetching, using or publishing content.

**Includes.** License detection; terms checks before crawling; redistribution rules on export.

**Why use cases need it.** Steps that check a dataset's or image's license before use, platform terms before collecting posts, bot policies before editing an open project, and public-domain status before adapting a work.

**Reach.** Essential to 18 use cases and helpful to 16; used in 12 of 18 categories, most in Operations, infrastructure, software and organizations (5), Learning, play and creative work (5), Science, health and scholarship (4).

**Essential to (18).**

- 1.1 Find me a graph about X
- 1.2 Wikipedia list or category to graph
- 1.4 Scrape a site's link structure
- 4.11 Licensing, attribution and citation credits
- 4.14 Data access broker that negotiates for a dataset
- 4.16 Send corrections back to the open data the graph came from
- 9.14 Online discourse and polarization map
- 9.17 Character network of a novel or play
- 9.40 Myths, scriptures and folklore motifs
- 10.8 Bot and coordinated-behavior detection
- 10.20 Trafficking and exploitation signals in ad networks
- 10.22 Influencer, sponsorship and brand networks
- 11.26 Creator collaboration and audience-overlap finder
- 12.23 Wiki-ready diagram
- 14.4 Role-specific onboarding paths
- 16.4 Course kit for instructors
- 16.20 Graph from music: the shape of a song
- 16.31 Print-and-play card or board game from a graph

**Helpful to.** 16 use cases, for example 5.7 Job search warm-intro paths; 6.15 Recipe and flavor-pairing inventor; 7.10 Compare my network against references.

**Other features build on it.** F56 Browser automation.

**Commonly needed with.** F55 Web fetch (together in 23 use cases, 68% of this feature's); F116 Grounding and citation (together in 23 use cases, 68% of this feature's); F156 Untrusted content handling (together in 25 use cases, 74% of this feature's); F33 Data import and schema design (together in 22 use cases, 65% of this feature's); F112 Schema enforcement (together in 22 use cases, 65% of this feature's); F54 Web search (together in 11 use cases, 32% of this feature's).

### F60 Content archiving and evidence preservation

**Definition.** Save a copy of each fetched page or response with timestamps, hashes and capture context so evidence survives the source changing and can hold up in reports.

**Includes.** Archived snapshots; capture metadata; hashes.

**Why use cases need it.** Investigation steps that archive each fetched page or item with a timestamp and hash so evidence survives the source changing.

**Reach.** Essential to 3 use cases and helpful to 5; used in 4 of 18 categories, most in Enriching, joining and tracking where data came from (3), Safety, privacy and misuse (3), Turning documents, media and conversation into graphs (1).

**Essential to (3).**

- 4.9 Provenance on every node and edge
- 9.18 Art provenance tracing
- 17.17 Harassment campaign documentation for the target

**Helpful to.** 5 use cases, for example 2.13 Argument maps and claim graphs; 4.5 Enrich companies and organizations; 17.1 Is this a scam? Contact map for an older relative.

**Depends on.** F121 Tamper-evident records and signing (evidence needs hashes and timestamps).

**Other features build on it.** F116 Grounding and citation.

**Commonly needed with.** No feature stands out: none shares at least 8 use cases and 30% of this feature's use cases while appearing with it at least 1.5 times as often as chance.

## Files, documents and media

Reading what people supply in any form and producing files, documents, figures and media for them.

### F61 Read user files

**Definition.** Open files and folders the user supplies or points to (uploads, local folders, connected drives, archives), including large, binary and proprietary formats.

**Includes.** Archives; folders; connected drives.

**Why use cases need it.** Steps that start from the user's own material: a dropped spreadsheet, exports, statements, notebooks, a parenting plan, a large local data file.

**Reach.** Essential to 164 use cases and helpful to 13; used in 18 of 18 categories, most in Science, health and scholarship (29), Operations, infrastructure, software and organizations (20), Safety, privacy and misuse (16).

**Essential to (164 in total; 10 representative, spread across categories).**

- 2.1 PDF or scanned document to graph
- 5.1 Your own accounts as graphs
- 6.1 Purchase graph and forgotten subscriptions
- 9.1 Literature map from seed papers
- 10.1 Money-flow tracing for anti-money-laundering
- 11.1 Multi-tier supplier risk map
- 12.5 Response to peer reviewers
- 15.7 Batch run over many files
- 16.5 Homework checker with guardrails
- 17.1 Is this a scam? Contact map for an older relative

**Helpful to.** 13 use cases, for example 2.7 Whiteboard, sticky-note or photo to graph; 3.11 Placeholder, junk-hub and artifact detection; 14.3 Learning by doing on the user's own data.

**Depends on.** F157 Safe file inspection (files are inspected before parsing); F156 Untrusted content handling (file content is data, not instructions).

**Commonly needed with.** F157 Safe file inspection (together in 177 use cases, 100% of this feature's); F33 Data import and schema design (together in 102 use cases, 58% of this feature's).

### F62 Format detection and parsing

**Definition.** Identify the format of an unknown file or response and parse mixed and messy formats into records, including time, place and device metadata embedded in photos, audio and video.

**Includes.** Format sniffing; parsers for tabular, markup, mail, genealogy, GPS, archive and graph formats; embedded media metadata.

**Why use cases need it.** Steps that must recognize and parse an unknown or messy format: statements from many institutions, genealogy files, GPS tracks, matrices with region labels, broken XML or delimiters.

**Reach.** Essential to 41 use cases and helpful to 8; used in 12 of 18 categories, most in Everyday life: money, home, health, travel and hobbies (15), Your own life as a graph (12), Turning documents, media and conversation into graphs (4).

**Essential to (41 in total; 10 representative, spread across categories).**

- 1.1 Find me a graph about X
- 2.2 Document pile to sourced entity graph
- 3.1 Schema inference for unknown files
- 5.1 Your own accounts as graphs
- 6.1 Purchase graph and forgotten subscriptions
- 6.2 Money flow between my own accounts
- 9.20 Brain connectome explorer
- 10.1 Money-flow tracing for anti-money-laundering
- 14.16 Upgrade old project files
- 16.20 Graph from music: the shape of a song

**Helpful to.** 8 use cases, for example 2.1 PDF or scanned document to graph; 7.4 Multi-step analysis from one prompt; 8.22 Group interactions as hypergraphs.

**Commonly needed with.** F157 Safe file inspection (together in 45 use cases, 92% of this feature's); F61 Read user files (together in 44 use cases, 90% of this feature's); F112 Schema enforcement (together in 37 use cases, 76% of this feature's); F33 Data import and schema design (together in 33 use cases, 67% of this feature's); F147 Sensitive data detection (together in 19 use cases, 39% of this feature's); F34 Data cleaning and normalization (together in 16 use cases, 33% of this feature's).

### F63 Document parsing and OCR

**Definition.** Read long, scanned or photographed documents (PDFs, scans, office files, handwriting) and extract text, tables, layout, page positions and structured facts.

**Includes.** OCR including handwriting; table extraction; page-anchored quotes for provenance.

**Why use cases need it.** Steps that read scanned or long documents: filings, handwritten ledgers, bills of lading, pill bottle labels, drawings, page and margin rules from a call for papers.

**Reach.** Essential to 37 use cases and helpful to 9; used in 10 of 18 categories, most in Operations, infrastructure, software and organizations (8), Everyday life: money, home, health, travel and hobbies (7), Your own life as a graph (6).

**Essential to (37 in total; 10 representative, spread across categories).**

- 2.1 PDF or scanned document to graph
- 5.9 Family tree from scattered sources
- 6.3 Shared expenses settle-up
- 9.15 Board interlocks and elite networks
- 10.17 Records and data-access requests from the gaps in a graph
- 11.3 Forced-labor provenance tracing
- 11.19 Build, pipeline and infrastructure dependency graphs
- 12.1 Journal-ready figure package
- 15.12 Write a plugin from a paper
- 16.9 Learning path and curriculum prerequisite map

**Helpful to.** 9 use cases, for example 2.7 Whiteboard, sticky-note or photo to graph; 5.6 Gift and favor ledger; 6.4 Estate and after-I'm-gone map.

**Depends on.** F115 Element provenance (extracted facts are anchored to pages).

**Commonly needed with.** F61 Read user files (together in 33 use cases, 72% of this feature's); F157 Safe file inspection (together in 33 use cases, 72% of this feature's); F112 Schema enforcement (together in 31 use cases, 67% of this feature's); F116 Grounding and citation (together in 25 use cases, 54% of this feature's); F33 Data import and schema design (together in 27 use cases, 59% of this feature's); F55 Web fetch (together in 20 use cases, 43% of this feature's).

### F64 Vision

**Definition.** Understand images: photos, scans, figures, drawings, screenshots, camera frames and the agent's own rendered views.

**Includes.** Object and label recognition; reading charts; judging what a reader would see in a render (clutter, layout impressions).

**Why use cases need it.** Steps that look at pictures: photos of a fridge or a table, scanned drawings, a viral image, uploaded figures, the agent's own renders checked for legibility and overlap.

**Reach.** Essential to 51 use cases and helpful to 31; used in 15 of 18 categories, most in Publishing, storytelling and visual design (17), Everyday life: money, home, health, travel and hobbies (9), Turning documents, media and conversation into graphs (7).

**Essential to (51 in total; 10 representative, spread across categories).**

- 2.1 PDF or scanned document to graph
- 5.11 Photo co-occurrence graph
- 6.5 Home inventory and moving plan
- 9.20 Brain connectome explorer
- 10.9 OSINT event reconstruction
- 11.22 Buildings as graphs: rooms, wayfinding and evacuation
- 12.1 Journal-ready figure package
- 13.2 Alt text and layered descriptions
- 14.5 What am I looking at?
- 16.5 Homework checker with guardrails

**Helpful to.** 31 use cases, for example 3.4 Date and time normalization; 5.1 Your own accounts as graphs; 6.6 Home knowledge graph.

**Depends on.** F108 Uncertainty reporting (visual readings carry a confidence).

**Commonly needed with.** F108 Uncertainty reporting (together in 82 use cases, 100% of this feature's); F51 Render capture (together in 38 use cases, 46% of this feature's); F22 Cross-session user memory (together in 36 use cases, 44% of this feature's).

### F65 Audio and video processing

**Definition.** Transcribe audio with speakers and timestamps, split video into frames or segments, track motion and events, and align them to time.

**Includes.** Speaker-labeled transcripts; frame extraction; event detection over time.

**Why use cases need it.** Steps that transcribe voice notes, interviews and calls with speakers and dates, split video into frames, and track events over time.

**Reach.** Essential to 13 use cases and helpful to 3; used in 7 of 18 categories, most in Turning documents, media and conversation into graphs (4), Your own life as a graph (3), Investigations: finance, fraud, security, law and journalism (3).

**Essential to (13).**

- 2.13 Argument maps and claim graphs
- 2.15 Field data collection
- 2.19 Screen recording to a map of how work actually flows
- 5.9 Family tree from scattered sources
- 5.15 Dream and voice-memo journal graph
- 5.20 Live conversation whisperer from your relationship graph
- 9.16 Historical correspondence network
- 9.30 Animal social network from video
- 10.9 OSINT event reconstruction
- 10.10 Investigation timeline
- 10.15 On-chain transaction and token graphs
- 13.15 Sign language and caption-first collaboration for deaf users
- 16.20 Graph from music: the shape of a song

**Helpful to.** 3 use cases, for example 2.11 Meeting transcript graphs; 6.34 Shopkeeper credit ledger for informal neighborhood shops; 13.9 Tabletop AR war room.

**Commonly needed with.** F102 Stop and interrupt (together in 12 use cases, 75% of this feature's); F108 Uncertainty reporting (together in 14 use cases, 88% of this feature's); F112 Schema enforcement (together in 11 use cases, 69% of this feature's); F166 Budgets and limits (together in 9 use cases, 56% of this feature's); F122 Live work visibility (together in 8 use cases, 50% of this feature's); F33 Data import and schema design (together in 9 use cases, 56% of this feature's).

### F67 Write files and exports

**Definition.** Save files the agent produces (data, code, repaired copies, graph exports in standard formats, images) to the user's device or workspace with chosen names and formats.

**Includes.** Graph export to graph, table, geo, 3D and image formats; standard interchange formats; physical-output formats (tactile graphics, 3D print files).

**Why use cases need it.** Steps that save outputs: graph exports in standard formats, redacted data, cut paths for fabrication, 3D assets, printable charts, rebuild scripts and data bundles.

**Reach.** Essential to 75 use cases and helpful to 19; used in 17 of 18 categories, most in Publishing, storytelling and visual design (27), Automation, integration, extension and teamwork (9), Safety, privacy and misuse (9).

**Essential to (75 in total; 10 representative, spread across categories).**

- 3.6 Format conversion with a loss report
- 4.11 Licensing, attribution and citation credits
- 5.8 Wedding or party seating planner
- 6.5 Home inventory and moving plan
- 10.5 Threat-intel pivoting
- 12.1 Journal-ready figure package
- 13.2 Alt text and layered descriptions
- 14.7 A cheat sheet made for this user
- 15.7 Batch run over many files
- 16.4 Course kit for instructors

**Helpful to.** 19 use cases, for example 4.8 Proposed missing edges as a separate layer; 7.2 Who matters most here, with the right kind of matters; 8.24 Independent recomputation audit.

**Other features build on it.** F191 Standalone interactive output generation.

**Commonly needed with.** No feature stands out: none shares at least 8 use cases and 30% of this feature's use cases while appearing with it at least 1.5 times as often as chance.

### F68 Document generation

**Definition.** Produce formatted documents for people (reports, memos, methods sections, slides, posters, worksheets, printable sheets, cards) with embedded figures and tables, following a supplied template or house style.

**Includes.** Applying a brand guide or template; accessible tagged output; citation files.

**Why use cases need it.** Steps whose deliverable is a document for people: reports, memos with citations, posters, handouts, worksheets, methods sections, printable seating charts.

**Reach.** Essential to 79 use cases and helpful to 187; used in 18 of 18 categories, most in Science, health and scholarship (42), Publishing, storytelling and visual design (37), Operations, infrastructure, software and organizations (35).

**Essential to (79 in total; 10 representative, spread across categories).**

- 3.6 Format conversion with a loss report
- 5.8 Wedding or party seating planner
- 8.2 Parameter sweep and sensitivity report
- 9.1 Literature map from seed papers
- 10.1 Money-flow tracing for anti-money-laundering
- 11.13 Onboarding who-to-talk-to guide
- 12.2 Methods section and reproducibility package
- 13.2 Alt text and layered descriptions
- 16.4 Course kit for instructors
- 17.1 Is this a scam? Contact map for an older relative

**Helpful to.** 187 use cases, for example 1.1 Find me a graph about X; 2.3 Schema-guided extraction; 3.13 Validate against a schema or standard.

**Commonly needed with.** No feature stands out: none shares at least 8 use cases and 30% of this feature's use cases while appearing with it at least 1.5 times as often as chance.

### F69 Template and form filling

**Definition.** Fill a user- or authority-supplied template or official form exactly (regulator report, request letter, PDF or web form) for the user to check and submit.

**Includes.** Field mapping from data; exact layout preservation.

**Why use cases need it.** Steps that fill an official or supplied template exactly: regulator reports, request letters, daily situation reports, PDF and web forms stopped before submission.

**Reach.** Essential to 5 use cases and helpful to 1; used in 3 of 18 categories, most in Investigations: finance, fraud, security, law and journalism (3), Science, health and scholarship (2), Your own life as a graph (1).

**Essential to (5).**

- 5.24 Disclosure forms filled from your own graph
- 9.10 Outbreak contact tracing board
- 9.19 Livestock movement and herd-health tracing
- 10.1 Money-flow tracing for anti-money-laundering
- 10.17 Records and data-access requests from the gaps in a graph

**Helpful to.** 1 use cases, for example 10.3 Fraud and claim ring detection.

**Commonly needed with.** No feature stands out: none shares at least 8 use cases and 30% of this feature's use cases while appearing with it at least 1.5 times as often as chance.

### F70 Chart and figure generation

**Definition.** Draw charts outside the graph canvas: histograms, curves, heatmaps, uncertainty bands, tables.

**Includes.** Statistical charts; tables; figures embedded in documents.

**Why use cases need it.** Analysis steps that need charts beside the graph: ranking tables, survival and removal curves, uncertainty bands, heatmaps, before-and-after comparisons.

**Reach.** Essential to 20 use cases and helpful to 4; used in 7 of 18 categories, most in Rigor, simulation and what-if (14), Asking the graph questions: guided analysis and explanation (5), Turning documents, media and conversation into graphs (1).

**Essential to (20).**

- 6.30 Project plan and calendar holds from a dependency graph
- 7.2 Who matters most here, with the right kind of matters
- 7.8 Compare two network versions
- 7.10 Compare my network against references
- 7.18 Any table as a similarity network
- 7.20 Rankings from who beat whom
- 8.1 Is my graph the right graph? Modeling check
- 8.2 Parameter sweep and sensitivity report
- 8.3 Null-model significance testing
- 8.4 Homophily and assortativity checks
- 8.6 Multiple-comparison and data-dredging guard
- 8.7 Robustness to missing data
- 8.10 Parallel hypothesis exploration with helper agents
- 8.12 Resilience: what breaks if we lose this?
- 8.13 Spread simulation: disease, rumors, adoption
- 8.15 Intervention planner: where to add one edge
- 8.16 Traffic and routing what-ifs
- 8.18 Network growth forecast
- 8.19 LLM-persona agent-based simulation
- 9.13 Survey-based social network study

**Helpful to.** 4 use cases, for example 3.10 Data quality report before analysis; 8.22 Group interactions as hypergraphs; 15.7 Batch run over many files.

**Commonly needed with.** F75 Scaled compute jobs (together in 14 use cases, 58% of this feature's); F165 Pre-flight cost estimation (together in 12 use cases, 50% of this feature's); F74 Sandboxed code execution (together in 23 use cases, 96% of this feature's); F125 Plain-language explanation (together in 17 use cases, 71% of this feature's); F166 Budgets and limits (together in 17 use cases, 71% of this feature's); F27 Domain knowledge packs (together in 13 use cases, 54% of this feature's).

### F71 Media composition

**Definition.** Assemble deterministic media from existing material: slideshows, animations, videos and audio from frames, captions and cuts, plus format conversion, resizing and rasterizing.

**Includes.** Video and audio encoding with captions and cuts; 360-degree video; multi-voice audio assembly; image conversion and resizing. Generated images and audio are F182.

**Why use cases need it.** Steps that assemble existing frames, captions and audio into slideshows, videos, social-media cuts, print-ready pages and accessible variants.

**Reach.** Essential to 21 use cases and helpful to 7; used in 8 of 18 categories, most in Publishing, storytelling and visual design (15), Everyday life: money, home, health, travel and hobbies (3), Accessibility, voice and immersive interaction (3).

**Essential to (21 in total; 10 representative, spread across categories).**

- 5.11 Photo co-occurrence graph
- 11.38 Event matchmaking: who each attendee should meet
- 12.1 Journal-ready figure package
- 12.2 Methods section and reproducibility package
- 12.6 Grant proposal preliminary-data section
- 12.9 Conference poster
- 13.3 Sonification
- 13.10 Recorded VR/AR guided tour
- 13.14 Oral-first graph for people who do not read
- 16.8 Kids build the food web

**Helpful to.** 7 use cases, for example 2.1 PDF or scanned document to graph; 6.17 Travel history globe; 18.8 Word-finding web for people with aphasia.

**Commonly needed with.** F64 Vision (together in 16 use cases, 57% of this feature's); F51 Render capture (together in 14 use cases, 50% of this feature's); F67 Write files and exports (together in 11 use cases, 39% of this feature's).

### F73 Outputs that stay current

**Definition.** Keep generated outputs linked to their source data and regenerate them when it changes; a dashboard is a linked output on continuous refresh.

**Includes.** Dependency tracking from data to outputs; batch regeneration; refresh policies; auto-refreshing panels with freshness indicators.

**Why use cases need it.** Steps that keep a dashboard, wall display or command-post view current as data changes, and that link several outputs to one source so they refresh together.

**Reach.** Essential to 7 use cases and helpful to 6; used in 4 of 18 categories, most in Publishing, storytelling and visual design (8), Operations, infrastructure, software and organizations (3), Automation, integration, extension and teamwork (1).

**Essential to (7).**

- 11.8 Microservice call graph from traces
- 11.9 Streaming graph from an event feed
- 11.30 Incident command and mutual-aid resource graph
- 12.26 Stakeholder-specific views from one master graph
- 12.45 Live overlay for broadcasts and video calls
- 15.4 Living dashboard
- 16.21 Living ambient display

**Helpful to.** 6 use cases, for example 12.8 Slide deck from a project.

**Depends on.** F95 Triggers (regeneration runs on a change trigger); F118 Run records and show your work (outputs know which data made them).

**Commonly needed with.** F83 Account connectors and delegated access (together in 8 use cases, 62% of this feature's); F09 Clarifying questions (together in 10 use cases, 77% of this feature's); F99 Approval gate (together in 9 use cases, 69% of this feature's).

### F170 Entity and relation extraction from unstructured content

**Definition.** Read text, transcripts and images and emit typed nodes and edges held to an approved schema, each tied to the exact passage, page or frame it came from, at corpus scale.

**Includes.** Schema-held extraction (F112); span, page and frame anchoring (F115); corpus-scale runs (F77).

**Why use cases need it.** Steps that read documents, transcripts and images and emit typed nodes and edges, each tied to the passage or frame it came from.

**Reach.** Essential to 22 use cases and helpful to 9; used in 9 of 18 categories, most in Turning documents, media and conversation into graphs (12), Your own life as a graph (4), Science, health and scholarship (4).

**Essential to (22 in total; 10 representative, spread across categories).**

- 1.6 Stakeholder map from a brief
- 2.1 PDF or scanned document to graph
- 2.2 Document pile to sourced entity graph
- 5.6 Gift and favor ledger
- 5.12 Memoir and life-story graph
- 6.23 TV and book character map without spoilers
- 8.23 Multi-agent annotation with agreement scoring
- 9.15 Board interlocks and elite networks
- 10.22 Influencer, sponsorship and brand networks
- 16.9 Learning path and curriculum prerequisite map

**Helpful to.** 9 use cases, for example 5.9 Family tree from scattered sources; 6.20 New-to-town orientation; 9.30 Animal social network from video.

**Depends on.** F112 Schema enforcement (extraction is held to an approved schema); F115 Element provenance (each element is tied to its passage); F77 Batch model pipelines (corpus-scale runs).

**Commonly needed with.** F112 Schema enforcement (together in 31 use cases, 100% of this feature's); F63 Document parsing and OCR (together in 13 use cases, 42% of this feature's); F108 Uncertainty reporting (together in 31 use cases, 100% of this feature's); F33 Data import and schema design (together in 25 use cases, 81% of this feature's); F122 Live work visibility (together in 21 use cases, 68% of this feature's); F115 Element provenance (together in 31 use cases, 100% of this feature's).

### F182 Generative media

**Definition.** Generate new images, illustrations, audio, voices, 3D models and tactile graphics, with provenance marks and safety screening.

**Includes.** Generated illustrations and pictograms; generated audio; 3D models; provenance marks.

**Why use cases need it.** Steps that generate new illustrations, voices, tactile graphics or 3D models with provenance marks.

**Reach.** Essential to 6 use cases and helpful to 1; used in 5 of 18 categories, most in Learning, play and creative work (3), Everyday life: money, home, health, travel and hobbies (1), Publishing, storytelling and visual design (1).

**Essential to (6).**

- 6.15 Recipe and flavor-pairing inventor
- 12.11 Podcast-style audio briefing
- 13.4 Tactile graphics and 3D-printed sculptures
- 16.11 Memory palace from a graph
- 16.27 Game master's world builder
- 16.31 Print-and-play card or board game from a graph

**Helpful to.** 1 use cases, for example 14.20 Feature request drafting and deduplication.

**Depends on.** F138 Harm and misuse screening (generated media is screened); F115 Element provenance (generated media carries provenance marks).

**Commonly needed with.** No feature stands out: none shares at least 8 use cases and 30% of this feature's use cases while appearing with it at least 1.5 times as often as chance.

### F191 Standalone interactive output generation

**Definition.** Build self-contained interactive outputs (explorable pages, interactive stories, games, embeddable views) that run without the product, and playtest them by driving the built output (F79 or F56).

**Includes.** Self-contained packaging; embedded interactivity; playtest verification.

**Why use cases need it.** Publishing and teaching steps that build a self-contained explorable page, interactive story or game and playtest it.

**Reach.** Essential to 7 use cases and helpful to 1; used in 3 of 18 categories, most in Publishing, storytelling and visual design (3), Learning, play and creative work (3), Cleaning and repairing data (2).

**Essential to (7).**

- 3.15 Iterative cleaning loop with a human
- 3.16 Replayable cleaning recipe
- 12.14 Standalone interactive web page and embed
- 12.15 Scrollytelling data story
- 16.18 Interactive quiz or game for outreach
- 16.28 Choose-your-own-adventure authored as a graph
- 16.34 Playable game world generated from a graph

**Helpful to.** 1 use cases, for example 12.47 Public ask-this-graph widget for a website.

**Depends on.** F79 Headless app instances (playtests drive the built output); F67 Write files and exports (the output is written as files).

**Commonly needed with.** No feature stands out: none shares at least 8 use cases and 30% of this feature's use cases while appearing with it at least 1.5 times as often as chance.

## Execution and compute

Where and how computation runs: sandboxes, scaled jobs, model pipelines, headless copies, devices and solvers.

### F74 Sandboxed code execution

**Definition.** Write and run code in an isolated environment with packages, files, resource and time limits, and no access beyond what is granted, reading the graph in and results out.

**Includes.** Numeric and graph libraries; several language runtimes; tests run on generated code.

**Why use cases need it.** Steps that need custom computation the product does not provide: parsing imports into a dependency graph, agreement scores, simulations, statistical corrections, recomputing with other libraries to cross-check.

**Reach.** Essential to 181 use cases and helpful to 42; used in 17 of 18 categories, most in Science, health and scholarship (35), Rigor, simulation and what-if (28), Everyday life: money, home, health, travel and hobbies (17).

**Essential to (181 in total; 10 representative, spread across categories).**

- 6.1 Purchase graph and forgotten subscriptions
- 7.6 Why is this node ranked so high?
- 8.1 Is my graph the right graph? Modeling check
- 9.5 Gene list to annotated interaction network
- 10.1 Money-flow tracing for anti-money-laundering
- 11.5 Power grid contingency analysis
- 12.2 Methods section and reproducibility package
- 15.3 Threshold and anomaly alerts
- 16.2 Step-through algorithm animation
- 17.9 Untrusted file safety check

**Helpful to.** 42 use cases, for example 1.1 Find me a graph about X; 2.1 PDF or scanned document to graph; 3.1 Schema inference for unknown files.

**Other features build on it.** F50 Extension authoring and installation, F79 Headless app instances, F171 Constraint solving and optimization.

**Commonly needed with.** F118 Run records and show your work (together in 86 use cases, 39% of this feature's).

### F75 Scaled compute jobs

**Definition.** Run many independent computations, or heavy ones, at scale: fan-out of resamples, rewirings and parameter grids, and jobs on bigger, accelerated or rented compute, with provisioning, data transfer, aggregation, partial-failure handling and teardown.

**Includes.** Job batching; result aggregation; partial-failure handling; provisioning and teardown; data transfer. The isolation boundary is F74.

**Why use cases need it.** Steps that run many or heavy computations: resampling and bootstraps, hundreds of rewired graphs, parameter grids, pipelines on larger or accelerated compute in the background.

**Reach.** Essential to 23 use cases and helpful to 20; used in 8 of 18 categories, most in Science, health and scholarship (16), Rigor, simulation and what-if (13), Asking the graph questions: guided analysis and explanation (7).

**Essential to (23 in total; 10 representative, spread across categories).**

- 7.10 Compare my network against references
- 7.18 Any table as a similarity network
- 7.20 Rankings from who beat whom
- 8.2 Parameter sweep and sensitivity report
- 8.3 Null-model significance testing
- 8.4 Homophily and assortativity checks
- 9.11 Pathogen phylogeny plus mobility
- 9.27 Redistricting and adjacency maps
- 9.28 Family trees of texts, languages and designs
- 15.24 Burst to rented compute for a graph too big for the laptop

**Helpful to.** 20 use cases, for example 4.3 Entity resolution against an authority; 7.6 Why is this node ranked so high?; 8.6 Multiple-comparison and data-dredging guard.

**Depends on.** F166 Budgets and limits (scaled jobs need budgets); F93 Durable jobs (large jobs run as durable jobs); F165 Pre-flight cost estimation (cost is estimated first).

**Commonly needed with.** F166 Budgets and limits (together in 43 use cases, 100% of this feature's); F70 Chart and figure generation (together in 14 use cases, 33% of this feature's); F118 Run records and show your work (together in 32 use cases, 74% of this feature's); F74 Sandboxed code execution (together in 41 use cases, 95% of this feature's); F165 Pre-flight cost estimation (together in 13 use cases, 30% of this feature's); F27 Domain knowledge packs (together in 25 use cases, 58% of this feature's).

### F77 Batch model pipelines

**Definition.** Map a language or vision model over many items (pages, chunks, frames, records) as a stateless pipeline and aggregate the outputs.

**Includes.** Per-item prompts; aggregation of outputs. Interacting stateful agents are F181.

**Why use cases need it.** Steps that apply a model to every page, transcript, frame or community and aggregate the outputs: extraction per document, topics per transcript, a summary per community.

**Reach.** Essential to 6 use cases and helpful to 5; used in 3 of 18 categories, most in Turning documents, media and conversation into graphs (8), Science, health and scholarship (2), Finding and fetching data (1).

**Essential to (6).**

- 2.2 Document pile to sourced entity graph
- 2.3 Schema-guided extraction
- 2.4 Community summaries of a corpus
- 2.11 Meeting transcript graphs
- 2.13 Argument maps and claim graphs
- 2.19 Screen recording to a map of how work actually flows

**Helpful to.** 5 use cases, for example 1.6 Stakeholder map from a brief; 2.1 PDF or scanned document to graph; 9.7 Drug repurposing candidates.

**Depends on.** F166 Budgets and limits (per-item model calls need a budget); F167 Model routing and diversity (bulk passes run on cheaper models).

**Other features build on it.** F170 Entity and relation extraction from unstructured content.

**Commonly needed with.** F170 Entity and relation extraction from unstructured content (together in 8 use cases, 73% of this feature's); F167 Model routing and diversity (together in 11 use cases, 100% of this feature's); F122 Live work visibility (together in 10 use cases, 91% of this feature's); F166 Budgets and limits (together in 11 use cases, 100% of this feature's); F112 Schema enforcement (together in 11 use cases, 100% of this feature's); F33 Data import and schema design (together in 10 use cases, 91% of this feature's).

### F78 Specialized model tools

**Definition.** Call purpose-built models (classifiers, parsers, entity extraction, image hashing, translation) as tools.

**Includes.** Task-specific models alongside the main agent model.

**Why use cases need it.** Steps that call a purpose-built model: stance classifiers, syntactic parsers, image hashing, pose tracking, extraction from filings and trials.

**Reach.** Essential to 14 use cases and helpful to 4; used in 5 of 18 categories, most in Science, health and scholarship (9), Investigations: finance, fraud, security, law and journalism (5), Turning documents, media and conversation into graphs (2).

**Essential to (14).**

- 9.10 Outbreak contact tracing board
- 9.14 Online discourse and polarization map
- 9.15 Board interlocks and elite networks
- 9.16 Historical correspondence network
- 9.17 Character network of a novel or play
- 9.25 Network meta-analysis of treatments
- 9.30 Animal social network from video
- 9.40 Myths, scriptures and folklore motifs
- 9.41 Language structure: parse trees and lexical networks
- 10.13 Regulation-to-controls gap map
- 10.19 Research-integrity rings: citation cartels and review mills
- 10.20 Trafficking and exploitation signals in ad networks
- 10.22 Influencer, sponsorship and brand networks
- 10.24 Defined terms and cross-references in a contract or statute

**Helpful to.** 4 use cases, for example 2.8 Printable workshop cards that become a graph; 3.17 Translate and transliterate labels; 7.18 Any table as a similarity network.

**Commonly needed with.** F104 Review queue (together in 11 use cases, 61% of this feature's); F118 Run records and show your work (together in 15 use cases, 83% of this feature's); F187 Learning from feedback and outcomes (together in 11 use cases, 61% of this feature's); F33 Data import and schema design (together in 17 use cases, 94% of this feature's); F112 Schema enforcement (together in 17 use cases, 94% of this feature's); F15 Shared plan and task list (together in 12 use cases, 67% of this feature's).

### F79 Headless app instances

**Definition.** Drive separate, invisible instances of the product to replay steps, explore options or reproduce bugs without touching the user's session.

**Includes.** Replays; bug reproduction; headless rendering.

**Why use cases need it.** Steps that need a separate copy of the product: reproducing a bug, exploratory testing by personas, exams in clean sessions, rendering inside a pipeline.

**Reach.** Essential to 6 use cases and helpful to 9; used in 5 of 18 categories, most in Help, support and product quality (8), Automation, integration, extension and teamwork (3), Cleaning and repairing data (2).

**Essential to (6).**

- 14.19 Bug report with a minimal reproduction, and support triage
- 14.23 Exploratory QA bot
- 14.26 Usability study simulator
- 14.27 Scheduled self-exam of the agent's graph answers
- 15.8 Graph step in someone else's pipeline
- 15.9 Graphty as an MCP server for other agents

**Helpful to.** 9 use cases, for example 3.6 Format conversion with a loss report; 8.24 Independent recomputation audit; 14.1 Help desk that answers from the docs and cites them.

**Depends on.** F74 Sandboxed code execution (instances run isolated).

**Other features build on it.** F114 Evaluation harness, F191 Standalone interactive output generation.

**Commonly needed with.** F30 Semantic retrieval (together in 9 use cases, 60% of this feature's); F84 Outbound writes (together in 10 use cases, 67% of this feature's); F145 Agent identity disclosure (together in 10 use cases, 67% of this feature's); F99 Approval gate (together in 12 use cases, 80% of this feature's); F166 Budgets and limits (together in 9 use cases, 60% of this feature's).

### F80 Offline and low-connectivity mode

**Definition.** Keep working without a network or on basic devices and poor connections, using on-device execution (F180) and cached data, and sync small deltas safely when connectivity returns.

**Includes.** Cached docs and data; queued work; conflict reconciliation on sync; basic-phone support.

**Why use cases need it.** Field and low-connectivity steps: working without a network, on basic phones over text, with cached docs and data synced later.

**Reach.** Essential to 4 use cases and helpful to 3; used in 5 of 18 categories, most in Everyday life: money, home, health, travel and hobbies (2), Safety, privacy and misuse (2), Turning documents, media and conversation into graphs (1).

**Essential to (4).**

- 2.15 Field data collection
- 6.27 Informal savings groups and family remittance webs
- 6.34 Shopkeeper credit ledger for informal neighborhood shops
- 13.13 Offline and low-bandwidth graphty for intermittent connectivity

**Helpful to.** 3 use cases, for example 17.2 Safety map for survivors of domestic abuse or stalking; 18.9 Relapse-prevention map for people in recovery.

**Depends on.** F180 On-device model and tool execution (offline work needs the model on the device).

**Commonly needed with.** No feature stands out: none shares at least 8 use cases and 30% of this feature's use cases while appearing with it at least 1.5 times as often as chance.

### F167 Model routing and diversity

**Definition.** Choose which model (size, family, on-device or remote, specialist) runs each step or sub-agent by cost, latency, privacy and skill, deliberately vary models across independent workers, and record which model produced each output.

**Includes.** Cheap bulk passes; real-time voice models; on-device models for private data; diverse critics; model recorded per output.

**Why use cases need it.** Steps that choose a cheap model for bulk passes, an on-device model for private data, a fast one for voice, and deliberately different models for critics.

**Reach.** Essential to 8 use cases and helpful to 61; used in 15 of 18 categories, most in Science, health and scholarship (10), Turning documents, media and conversation into graphs (9), Your own life as a graph (8).

**Essential to (8).**

- 2.2 Document pile to sourced entity graph
- 2.4 Community summaries of a corpus
- 8.8 Red-team my analysis
- 8.9 Two agents debate over a graph
- 8.10 Parallel hypothesis exploration with helper agents
- 8.23 Multi-agent annotation with agreement scoring
- 13.6 Voice navigation and hands-free control in VR and AR
- 17.3 Operational-security mode for activists and journalists under repressive governments

**Helpful to.** 61 use cases, for example 1.6 Stakeholder map from a brief; 2.1 PDF or scanned document to graph; 5.1 Your own accounts as graphs.

**Other features build on it.** F16 Sub-agents, F77 Batch model pipelines, F110 Critique, debate and agreement protocols, F181 Agent-based simulation.

**Commonly needed with.** F180 On-device model and tool execution (together in 51 use cases, 74% of this feature's); F150 Local-only processing (together in 49 use cases, 71% of this feature's); F149 Data egress control and flow ledger (together in 30 use cases, 43% of this feature's); F61 Read user files (together in 40 use cases, 58% of this feature's); F157 Safe file inspection (together in 40 use cases, 58% of this feature's); F147 Sensitive data detection (together in 24 use cases, 35% of this feature's).

### F171 Constraint solving and optimization

**Definition.** Elicit objectives and hard and soft constraints from the user (table sizes, must-not-pair, capacities, fairness, travel time), solve, explain why no solution exists, and compare near-best alternatives.

**Includes.** Constraint capture; solving; infeasibility explanation; tradeoff alternatives.

**Why use cases need it.** Steps that seat guests, schedule carpools, plan routes or assign rotations under hard and soft constraints, explain infeasibility and compare alternatives.

**Reach.** Essential to 15 use cases and helpful to 1; used in 7 of 18 categories, most in Everyday life: money, home, health, travel and hobbies (10), Your own life as a graph (1), Rigor, simulation and what-if (1).

**Essential to (15).**

- 5.8 Wedding or party seating planner
- 6.3 Shared expenses settle-up
- 6.9 Kids' carpool and activity network
- 6.10 Household chore fairness
- 6.13 Food, symptoms and elimination diet
- 6.16 Garden companion planting
- 6.18 Trip itinerary planner
- 6.19 Every street I have run
- 6.29 Radio contact logs and community mesh networks
- 6.33 Capsule wardrobe and packing graph
- 8.26 Network-aware field experiment designer and runner
- 10.27 Conflict-of-interest screen and recusal list
- 11.4 Freight network redesign
- 15.25 Timetable by negotiating with attendees' agents
- 17.26 Detector evasion design

**Helpful to.** 1 use cases, for example 6.5 Home inventory and moving plan.

**Depends on.** F10 Structured questions (constraints are captured as typed answers); F74 Sandboxed code execution (solvers run in the sandbox).

**Commonly needed with.** F74 Sandboxed code execution (together in 15 use cases, 94% of this feature's); F07 Time and date awareness (together in 8 use cases, 50% of this feature's); F95 Triggers (together in 8 use cases, 50% of this feature's); F81 External tools and connectors (together in 9 use cases, 56% of this feature's); F33 Data import and schema design (together in 10 use cases, 62% of this feature's); F112 Schema enforcement (together in 10 use cases, 62% of this feature's).

### F180 On-device model and tool execution

**Definition.** Run the model and tools entirely on the user's device; shared by offline mode (F80) and the local-only privacy mode (F150).

**Includes.** On-device model; local tool runtime; capability detection of the device.

**Why use cases need it.** Privacy, offline and low-latency steps that run the model and tools on the user's device.

**Reach.** Essential to 36 use cases and helpful to 15; used in 13 of 18 categories, most in Your own life as a graph (8), Science, health and scholarship (8), Safety, privacy and misuse (8).

**Essential to (36 in total; 10 representative, spread across categories).**

- 2.2 Document pile to sourced entity graph
- 5.11 Photo co-occurrence graph
- 6.27 Informal savings groups and family remittance webs
- 7.17 Curiosity companion that watches you explore
- 8.14 Cascading failure and systemic risk
- 9.6 Pathway diff between conditions
- 11.5 Power grid contingency analysis
- 13.13 Offline and low-bandwidth graphty for intermittent connectivity
- 16.7 Class friendship map (with care)
- 17.2 Safety map for survivors of domestic abuse or stalking

**Helpful to.** 15 use cases, for example 5.1 Your own accounts as graphs; 6.17 Travel history globe; 10.1 Money-flow tracing for anti-money-laundering.

**Other features build on it.** F80 Offline and low-connectivity mode, F150 Local-only processing.

**Commonly needed with.** F150 Local-only processing (together in 49 use cases, 96% of this feature's); F167 Model routing and diversity (together in 51 use cases, 100% of this feature's); F149 Data egress control and flow ledger (together in 29 use cases, 57% of this feature's); F147 Sensitive data detection (together in 23 use cases, 45% of this feature's); F61 Read user files (together in 32 use cases, 63% of this feature's); F157 Safe file inspection (together in 32 use cases, 63% of this feature's).

## Integrations and outbound actions

Connecting to outside systems, accounts, agents and devices, and acting in them.

### F81 External tools and connectors

**Definition.** Call outside services and tools through one catalog: built-in connectors to public data interfaces and business systems, plus tool servers the user or organization adds at run time, all with typed schemas, discovery and one trust and permission model.

**Includes.** Connector catalog; runtime tool discovery; per-source trust and permissions. The user's own databases are F168.

**Why use cases need it.** Steps that call outside services: scholarly databases, registries, fraud lookups, DNS and certificate data, print services, microtask platforms, tool servers the user adds.

**Reach.** Essential to 134 use cases and helpful to 18; used in 18 of 18 categories, most in Science, health and scholarship (32), Operations, infrastructure, software and organizations (22), Automation, integration, extension and teamwork (15).

**Essential to (134 in total; 10 representative, spread across categories).**

- 3.5 Unit and currency normalization
- 4.3 Entity resolution against an authority
- 5.6 Gift and favor ledger
- 6.7 Digital footprint and account recovery audit
- 9.1 Literature map from seed papers
- 10.2 Beneficial ownership and interlocking boards
- 11.1 Multi-tier supplier risk map
- 12.4 Draft a full paper from an analysis session
- 15.1 Nightly refresh of a saved project from its source
- 16.4 Course kit for instructors

**Helpful to.** 18 use cases, for example 1.1 Find me a graph about X; 2.13 Argument maps and claim graphs; 4.2 Search the web for a dataset to join.

**Depends on.** F158 Credential vault (connectors use stored credentials); F156 Untrusted content handling (tool output is untrusted); F149 Data egress control and flow ledger (data sent out is governed).

**Other features build on it.** F169 Entity linking to external authorities.

**Commonly needed with.** F18 Error recovery and self-repair (together in 72 use cases, 47% of this feature's); F116 Grounding and citation (together in 75 use cases, 49% of this feature's); F15 Shared plan and task list (together in 59 use cases, 39% of this feature's); F55 Web fetch (together in 58 use cases, 38% of this feature's).

### F83 Account connectors and delegated access

**Definition.** Connect to the user's own accounts (mail, calendar, photos, notes, banks, task apps, drives) and act in them through granted, scoped, revocable access.

**Includes.** Read-only or narrow scopes; revocation; per-account consent.

**Why use cases need it.** Steps that read or write in the user's own accounts (mail, calendar, contacts, music, maps, notes, code host) through narrow, revocable access.

**Reach.** Essential to 53 use cases and helpful to 16; used in 12 of 18 categories, most in Publishing, storytelling and visual design (17), Operations, infrastructure, software and organizations (13), Your own life as a graph (10).

**Essential to (53 in total; 10 representative, spread across categories).**

- 3.20 Tag taxonomy from a messy folksonomy
- 4.16 Send corrections back to the open data the graph came from
- 5.3 Who have I lost touch with?
- 6.9 Kids' carpool and activity network
- 9.1 Literature map from seed papers
- 10.8 Bot and coordinated-behavior detection
- 11.1 Multi-tier supplier risk map
- 12.2 Methods section and reproducibility package
- 15.25 Timetable by negotiating with attendees' agents
- 16.6 Classroom assignment grader and coach

**Helpful to.** 16 use cases, for example 2.11 Meeting transcript graphs; 4.15 Ask the people in the graph to confirm it; 5.7 Job search warm-intro paths.

**Depends on.** F158 Credential vault (delegated access needs scoped credentials); F101 Policy and restriction modes (scopes are enforced in every tool).

**Commonly needed with.** F99 Approval gate (together in 52 use cases, 75% of this feature's); F145 Agent identity disclosure (together in 33 use cases, 48% of this feature's); F09 Clarifying questions (together in 51 use cases, 74% of this feature's); F84 Outbound writes (together in 26 use cases, 38% of this feature's); F101 Policy and restriction modes (together in 30 use cases, 43% of this feature's); F158 Credential vault (together in 22 use cases, 32% of this feature's).

### F84 Outbound writes

**Definition.** Write into systems outside the product (databases, content systems, open-data projects, ticket systems, code repositories, outside documents, publishing destinations, the product's own feedback tracker): show a diff, write only what is approved, and verify the result after writing.

**Includes.** Diffs of proposed changes; reviewable change proposals with tests; comments and tracked changes in outside documents; publishing to sites, portals and channels; filing tickets and product feedback; post-write verification.

**Why use cases need it.** Steps that publish or change something outside the product: posting answers, writing a playlist, publishing pages, filing issues, writing back to a database or document.

**Reach.** Essential to 55 use cases and helpful to 9; used in 14 of 18 categories, most in Publishing, storytelling and visual design (19), Automation, integration, extension and teamwork (10), Help, support and product quality (9).

**Essential to (55 in total; 10 representative, spread across categories).**

- 3.14 Knowledge-graph consistency and curation
- 4.16 Send corrections back to the open data the graph came from
- 6.9 Kids' carpool and activity network
- 8.24 Independent recomputation audit
- 9.1 Literature map from seed papers
- 10.4 Privilege attack paths in directories and clouds
- 11.6 Outage root-cause tracing
- 12.2 Methods section and reproducibility package
- 14.19 Bug report with a minimal reproduction, and support triage
- 15.8 Graph step in someone else's pipeline

**Helpful to.** 9 use cases, for example 3.7 Repair a file that will not load; 4.13 Data dictionary and datasheet; 6.5 Home inventory and moving plan.

**Depends on.** F99 Approval gate (every outbound write is approved); F100 Action proposal and dry-run preview (the diff is shown first); F119 Action log and audit trail (writes are logged); F47 Undo and rollback (compensating actions when undoing).

**Commonly needed with.** F145 Agent identity disclosure (together in 62 use cases, 97% of this feature's); F99 Approval gate (together in 64 use cases, 100% of this feature's); F100 Action proposal and dry-run preview (together in 64 use cases, 100% of this feature's); F83 Account connectors and delegated access (together in 26 use cases, 41% of this feature's); F67 Write files and exports (together in 23 use cases, 36% of this feature's).

### F86 Outbound messaging

**Definition.** Send messages, invites, requests, digests and alerts to people other than the user over the channel adapters of F136, as reviewed drafts, individually or in pausable, throttled batches.

**Includes.** Draft-before-send; mail merge; small batches with a kill switch.

**Why use cases need it.** Steps that contact people other than the user: introductions, digests, alerts with escalation, payment requests, opt-in forms, minutes after a meeting.

**Reach.** Essential to 28 use cases and helpful to 10; used in 13 of 18 categories, most in Everyday life: money, home, health, travel and hobbies (7), Automation, integration, extension and teamwork (7), Your own life as a graph (5).

**Essential to (28 in total; 10 representative, spread across categories).**

- 2.18 Voice interviews to collect network survey data at scale
- 4.14 Data access broker that negotiates for a dataset
- 5.21 Donate my graph to research
- 6.3 Shared expenses settle-up
- 9.2 Literature and citation watch
- 10.17 Records and data-access requests from the gaps in a graph
- 11.15 Community mapping from a survey
- 12.10 One-page executive briefing
- 15.2 Change digest by email, chat or newsletter
- 17.29 Outbound action preview and throttle

**Helpful to.** 10 use cases, for example 5.3 Who have I lost touch with?; 6.4 Estate and after-I'm-gone map; 8.26 Network-aware field experiment designer and runner.

**Depends on.** F99 Approval gate (every send is approved); F100 Action proposal and dry-run preview (every recipient is previewed); F145 Agent identity disclosure (recipients learn they deal with an AI); F102 Stop and interrupt (batches need a kill switch); F136 Conversation channel adapters (messages go over channel adapters).

**Other features build on it.** F145 Agent identity disclosure, F172 Outreach and response collection.

**Commonly needed with.** F145 Agent identity disclosure (together in 38 use cases, 100% of this feature's); F99 Approval gate (together in 38 use cases, 100% of this feature's); F155 Consent management (together in 17 use cases, 45% of this feature's); F95 Triggers (together in 22 use cases, 58% of this feature's); F100 Action proposal and dry-run preview (together in 38 use cases, 100% of this feature's); F96 User notification policy (together in 20 use cases, 53% of this feature's).

### F87 Agent-to-agent exchange

**Definition.** Exchange requests, results, offers and agreements with agents and bots run by other people, organizations or tools, under agreed rules.

**Includes.** Negotiation; task exchange with outside agents; defined exchanges with the user's other tools.

**Why use cases need it.** Steps that talk with someone else's agent: negotiating allowed questions, asking a member's personal agent what was agreed, gathering constraints from other people's agents.

**Reach.** Essential to 7 use cases and helpful to 8; used in 9 of 18 categories, most in Automation, integration, extension and teamwork (5), Science, health and scholarship (2), Care, community and humanitarian work (2).

**Essential to (7).**

- 4.14 Data access broker that negotiates for a dataset
- 12.37 Knowledge pack for another assistant
- 15.9 Graphty as an MCP server for other agents
- 15.22 Negotiated data clean room between two organizations' agents
- 15.23 Federated community graph from members' own agents
- 15.25 Timetable by negotiating with attendees' agents
- 15.36 Exchange cycles arranged between the participants' own agents

**Helpful to.** 8 use cases, for example 5.21 Donate my graph to research; 6.31 Property-chain tracker for homebuyers and conveyancers; 9.1 Literature map from seed papers.

**Depends on.** F156 Untrusted content handling (other agents' output is untrusted); F145 Agent identity disclosure (disclosure in agent exchanges); F99 Approval gate (agreements are approved).

**Commonly needed with.** F99 Approval gate (together in 14 use cases, 93% of this feature's); F95 Triggers (together in 9 use cases, 60% of this feature's); F93 Durable jobs (together in 8 use cases, 53% of this feature's); F166 Budgets and limits (together in 9 use cases, 60% of this feature's); F156 Untrusted content handling (together in 9 use cases, 60% of this feature's); F102 Stop and interrupt (together in 8 use cases, 53% of this feature's).

### F88 Agent as a service

**Definition.** Expose the agent and the product's graph abilities as a callable service for other programs and agents, including a constrained public copy grounded only in published data.

**Includes.** Service endpoint; public, anonymous-user deployment with restricted scope.

**Why use cases need it.** Steps that expose the product's graph abilities to other programs: an authenticated endpoint with quotas, a public widget limited to published data, abilities other agents can discover.

**Reach.** Essential to 3 use cases and helpful to 0; used in 2 of 18 categories, most in Automation, integration, extension and teamwork (2), Publishing, storytelling and visual design (1).

**Essential to (3).**

- 12.47 Public ask-this-graph widget for a website
- 15.8 Graph step in someone else's pipeline
- 15.9 Graphty as an MCP server for other agents

**Helpful to.** No use case.

**Depends on.** F159 Identity and roles (callers must be identified); F101 Policy and restriction modes (a public copy runs in a restricted mode); F166 Budgets and limits (callers are budgeted).

**Commonly needed with.** No feature stands out: none shares at least 8 use cases and 30% of this feature's use cases while appearing with it at least 1.5 times as often as chance.

### F90 Physical devices and local network

**Definition.** Read from and send commands to physical hardware and devices on the user's local network (sensors, adapters, printers, embossers, projectors, lights, robots) under strict permission.

**Includes.** Device reads; output to printers and embossers; device control with state read-back.

**Why use cases need it.** Steps that touch hardware: reading a router's client list, listening through a diagnostic adapter that cannot transmit, sending to an embosser, driving lights, projectors or a fleet.

**Reach.** Essential to 9 use cases and helpful to 3; used in 8 of 18 categories, most in Operations, infrastructure, software and organizations (3), Accessibility, voice and immersive interaction (2), Learning, play and creative work (2).

**Essential to (9).**

- 6.26 Where my internet traffic goes
- 11.24 Co-presence network from proximity sensors
- 11.36 Memory leak hunt through a program's object graph
- 11.37 Machine-internal networks read from a diagnostic port
- 12.35 Real reader test of a figure
- 13.4 Tactile graphics and 3D-printed sculptures
- 13.22 Live tangible tabletop: move physical tokens and the graph follows
- 15.26 Dispatch a graph-planned route to robots or drones
- 16.25 Smart-home lighting tied to the graph

**Helpful to.** 3 use cases, for example 2.8 Printable workshop cards that become a graph; 16.21 Living ambient display; 8.28 Closed-loop lab: the graph picks the next experiment and a robot runs it.

**Depends on.** F99 Approval gate (device commands are approved); F174 Output physical-safety checks (physical commands are checked for harm).

**Commonly needed with.** F81 External tools and connectors (together in 9 use cases, 75% of this feature's); F99 Approval gate (together in 10 use cases, 83% of this feature's).

### F168 External data store connection and query authoring

**Definition.** Connect to the user's database, warehouse, graph store or triple store, read its schema, write queries in its own language for approval, run a sample and a cost check first, enforce read-only, and page the results.

**Includes.** Schema introspection; query dialects; sample and cost check; read-only enforcement; paged results.

**Why use cases need it.** Steps that connect to the user's own database, warehouse or graph store, write queries in its language for approval, and page results read-only.

**Reach.** Essential to 10 use cases and helpful to 1; used in 7 of 18 categories, most in Finding and fetching data (3), Operations, infrastructure, software and organizations (2), Automation, integration, extension and teamwork (2).

**Essential to (10).**

- 1.3 Plain-English SPARQL pulls
- 1.5 Pull a graph from a database, warehouse or graph store in plain language
- 3.14 Knowledge-graph consistency and curation
- 9.24 Funding landscape for nonprofits and research
- 10.4 Privilege attack paths in directories and clouds
- 11.20 Spreadsheet formula and data lineage audit
- 11.31 Angel and venture co-investment network
- 15.26 Dispatch a graph-planned route to robots or drones
- 15.33 Graph metrics written back to the source system as fields
- 16.32 Trading card game deck synergy graph

**Helpful to.** 1 use cases, for example 1.7 Build a data-source connector.

**Depends on.** F158 Credential vault (database credentials); F101 Policy and restriction modes (read-only enforcement); F165 Pre-flight cost estimation (cost check before a query); F11 Interpretation echo-back (the query is shown back for approval).

**Commonly needed with.** F81 External tools and connectors (together in 10 use cases, 91% of this feature's); F33 Data import and schema design (together in 8 use cases, 73% of this feature's); F112 Schema enforcement (together in 8 use cases, 73% of this feature's).

### F172 Outreach and response collection

**Definition.** Collect answers from outside people (surveys, forms, interviews, confirmations, scoring) and run the campaign around it: track each recipient's status, match replies to the right graph records, remind people who have not answered, escalate along an agreed chain, and place outbound voice calls.

**Includes.** Forms and surveys; per-recipient state; reply parsing and matching; reminders and escalation; outbound calls; response scoring.

**Why use cases need it.** Steps that collect answers from outside people (survey waves, microtasks, panels, check-ins), track who has answered, remind and escalate.

**Reach.** Essential to 14 use cases and helpful to 1; used in 10 of 18 categories, most in Enriching, joining and tracking where data came from (2), Everyday life: money, home, health, travel and hobbies (2), Rigor, simulation and what-if (2).

**Essential to (14).**

- 2.18 Voice interviews to collect network survey data at scale
- 4.14 Data access broker that negotiates for a dataset
- 4.15 Ask the people in the graph to confirm it
- 5.21 Donate my graph to research
- 6.34 Shopkeeper credit ledger for informal neighborhood shops
- 8.26 Network-aware field experiment designer and runner
- 8.27 Paid human verification of uncertain edges
- 9.13 Survey-based social network study
- 11.15 Community mapping from a survey
- 11.26 Creator collaboration and audience-overlap finder
- 12.35 Real reader test of a figure
- 12.41 Personal report mailed to each person in the graph
- 15.25 Timetable by negotiating with attendees' agents
- 18.12 Check-on-each-other network for heat waves and outages

**Helpful to.** 1 use cases, for example 6.10 Household chore fairness.

**Depends on.** F86 Outbound messaging (requests are sent as messages); F95 Triggers (replies and deadlines are triggers); F155 Consent management (respondents consent); F145 Agent identity disclosure (respondents learn they deal with an AI).

**Commonly needed with.** F86 Outbound messaging (together in 11 use cases, 73% of this feature's); F145 Agent identity disclosure (together in 14 use cases, 93% of this feature's); F155 Consent management (together in 11 use cases, 73% of this feature's); F99 Approval gate (together in 14 use cases, 93% of this feature's); F100 Action proposal and dry-run preview (together in 15 use cases, 100% of this feature's); F95 Triggers (together in 8 use cases, 53% of this feature's).

## Long-running and proactive work

Work that continues without the user present, starts on its own, and reaches the user later.

### F93 Durable jobs

**Definition.** Run checkpointed, resumable work outside the conversation turn that survives closing the page, crashes and disconnects, can be paused and resumed in this or a later session, and comes back with the result.

**Includes.** Saved intermediate state; retries and branching; user-initiated pause; resume without redoing finished steps; result delivery on return.

**Why use cases need it.** Steps that take longer than a conversation turn or must outlive the page: deep traces, simulations on larger compute, watching a trip, weekly briefings, waiting for replies.

**Reach.** Essential to 67 use cases and helpful to 52; used in 18 of 18 categories, most in Automation, integration, extension and teamwork (17), Turning documents, media and conversation into graphs (12), Science, health and scholarship (12).

**Essential to (67 in total; 10 representative, spread across categories).**

- 2.2 Document pile to sourced entity graph
- 5.23 Briefing before each meeting from my relationship graph
- 8.25 Forecast ledger that grades itself later
- 9.14 Online discourse and polarization map
- 11.1 Multi-tier supplier risk map
- 12.3 Reproducible notebook export
- 13.20 Side-quest parking lot for distractible and dyslexic users
- 14.15 Cost estimate before a heavy run
- 15.1 Nightly refresh of a saved project from its source
- 16.12 Six degrees of anything

**Helpful to.** 52 use cases, for example 1.3 Plain-English SPARQL pulls; 2.1 PDF or scanned document to graph; 3.15 Iterative cleaning loop with a human.

**Depends on.** F102 Stop and interrupt (background work must be stoppable); F122 Live work visibility (its progress must be visible); F96 User notification policy (the user is told when it finishes).

**Other features build on it.** F57 Large and paged transfers, F75 Scaled compute jobs, F95 Triggers, F106 Hand-off to a person.

**Commonly needed with.** F102 Stop and interrupt (together in 119 use cases, 100% of this feature's); F122 Live work visibility (together in 69 use cases, 58% of this feature's); F166 Budgets and limits (together in 63 use cases, 53% of this feature's); F96 User notification policy (together in 48 use cases, 40% of this feature's); F95 Triggers (together in 47 use cases, 39% of this feature's).

### F95 Triggers

**Definition.** Start a durable job (F93) without the user present when a time, recurrence, deadline, outside event, watched condition or threshold fires, and decide whether the result is worth delivering.

**Includes.** One-off and recurring schedules; deadlines; webhooks and watches; feed subscriptions; user-defined rules and anomaly tests; threshold alerts with context.

**Why use cases need it.** Steps that start without the user: schedules, deadlines, rule changes on watched pages, new filings, feed polling, threshold breaches.

**Reach.** Essential to 62 use cases and helpful to 45; used in 18 of 18 categories, most in Everyday life: money, home, health, travel and hobbies (18), Automation, integration, extension and teamwork (14), Your own life as a graph (9).

**Essential to (62 in total; 10 representative, spread across categories).**

- 5.6 Gift and favor ledger
- 6.6 Home knowledge graph
- 8.25 Forecast ledger that grades itself later
- 9.2 Literature and citation watch
- 10.7 Vulnerability blast radius
- 11.3 Forced-labor provenance tracing
- 12.11 Podcast-style audio briefing
- 15.1 Nightly refresh of a saved project from its source
- 16.9 Learning path and curriculum prerequisite map
- 18.2 Bureaucracy navigator for immigrants and refugees

**Helpful to.** 45 use cases, for example 1.4 Scrape a site's link structure; 2.11 Meeting transcript graphs; 3.16 Replayable cleaning recipe.

**Depends on.** F93 Durable jobs (a trigger starts a durable job); F96 User notification policy (and decides whether to tell the user).

**Other features build on it.** F49 Incremental source sync and change detection, F73 Outputs that stay current, F172 Outreach and response collection.

**Commonly needed with.** F96 User notification policy (together in 74 use cases, 69% of this feature's); F93 Durable jobs (together in 47 use cases, 44% of this feature's); F102 Stop and interrupt (together in 56 use cases, 52% of this feature's); F145 Agent identity disclosure (together in 39 use cases, 36% of this feature's).

### F96 User notification policy

**Definition.** Decide when and how to reach the user outside the current view or session (urgency, batching, quiet hours, channel choice) over the channel adapters of F136 and push or desktop notices.

**Includes.** Channel choice; batching; urgency levels.

**Why use cases need it.** Steps that reach the user later: a long run finishing, a watched elevator going down, a birthday coming up, a digest ready, with sensible timing and channel.

**Reach.** Essential to 25 use cases and helpful to 71; used in 17 of 18 categories, most in Everyday life: money, home, health, travel and hobbies (12), Automation, integration, extension and teamwork (11), Care, community and humanitarian work (8).

**Essential to (25 in total; 10 representative, spread across categories).**

- 5.6 Gift and favor ledger
- 6.6 Home knowledge graph
- 8.25 Forecast ledger that grades itself later
- 9.2 Literature and citation watch
- 10.7 Vulnerability blast radius
- 13.21 Personal step-free route network for wheelchair users
- 14.15 Cost estimate before a heavy run
- 16.13 Daily graph puzzle
- 17.11 Consent ledger for people in a graph
- 18.2 Bureaucracy navigator for immigrants and refugees

**Helpful to.** 71 use cases, for example 1.4 Scrape a site's link structure; 2.2 Document pile to sourced entity graph; 3.16 Replayable cleaning recipe.

**Depends on.** F136 Conversation channel adapters (notifications travel over channel adapters).

**Other features build on it.** F93 Durable jobs, F95 Triggers, F106 Hand-off to a person.

**Commonly needed with.** F95 Triggers (together in 74 use cases, 77% of this feature's); F102 Stop and interrupt (together in 58 use cases, 60% of this feature's); F93 Durable jobs (together in 48 use cases, 50% of this feature's); F145 Agent identity disclosure (together in 31 use cases, 32% of this feature's).

### F98 Proactive suggestions

**Definition.** Speak up unprompted at a suitable moment with a hint, caveat or likely next step, under frequency limits.

**Includes.** Next-step prediction as a short ranked list; timing rules for interruptions.

**Why use cases need it.** Steps where the agent speaks first: warning before an unsuitable analysis, offering a hint at a pause, suggesting the next step, noticing a tangent, offering what is new once.

**Reach.** Essential to 11 use cases and helpful to 7; used in 7 of 18 categories, most in Help, support and product quality (5), Asking the graph questions: guided analysis and explanation (4), Accessibility, voice and immersive interaction (4).

**Essential to (11).**

- 3.11 Placeholder, junk-hub and artifact detection
- 7.5 Algorithm advisor and pre-flight check
- 7.15 One caveat and one next question after every result
- 7.17 Curiosity companion that watches you explore
- 8.6 Multiple-comparison and data-dredging guard
- 13.17 Switch and eye-gaze access on the desktop
- 13.20 Side-quest parking lot for distractible and dyslexic users
- 14.3 Learning by doing on the user's own data
- 14.8 Personalized what's new
- 14.10 Notice struggle and offer help
- 14.18 Learned preferences as defaults

**Helpful to.** 7 use cases, for example 3.10 Data quality report before analysis; 6.20 New-to-town orientation; 7.1 Explain this graph in 60 seconds.

**Depends on.** F103 User-tunable agent behavior (unprompted speech must be tunable); F05 User activity awareness (suggestions are timed to what the user is doing).

**Commonly needed with.** F103 User-tunable agent behavior (together in 9 use cases, 50% of this feature's); F05 User activity awareness (together in 10 use cases, 56% of this feature's); F178 App and view state reading (together in 10 use cases, 56% of this feature's); F22 Cross-session user memory (together in 16 use cases, 89% of this feature's); F125 Plain-language explanation (together in 13 use cases, 72% of this feature's); F31 Graph data query (together in 11 use cases, 61% of this feature's).

## Human control and trust

Keeping the person in charge: previews, approvals, limits, interruption and hand-offs.

### F99 Approval gate

**Definition.** Stop before a consequential, costly, irreversible or outward-facing action, show exactly what will happen, and proceed only on explicit approval from the user or a designated approver, recording the answer.

**Includes.** Per-action approvals; approval records; approver other than the user.

**Why use cases need it.** Steps that send, publish, pay, submit, delete, order or connect an account, where the agent must stop, show exactly what will happen and wait for an explicit yes, sometimes from someone other than the user.

**Reach.** Essential to 106 use cases and helpful to 102; used in 18 of 18 categories, most in Automation, integration, extension and teamwork (30), Publishing, storytelling and visual design (29), Operations, infrastructure, software and organizations (15).

**Essential to (106 in total; 10 representative, spread across categories).**

- 3.7 Repair a file that will not load
- 5.14 Notes vault, knowledge-base sync and browsing rabbit holes
- 6.3 Shared expenses settle-up
- 9.1 Literature map from seed papers
- 10.4 Privilege attack paths in directories and clouds
- 11.6 Outage root-cause tracing
- 12.2 Methods section and reproducibility package
- 14.19 Bug report with a minimal reproduction, and support triage
- 15.2 Change digest by email, chat or newsletter
- 17.7 Who can find me? Self-exposure audit

**Helpful to.** 102 use cases, for example 1.3 Plain-English SPARQL pulls; 2.11 Meeting transcript graphs; 3.3 Fix types column by column.

**Depends on.** F119 Action log and audit trail (approvals are recorded); F100 Action proposal and dry-run preview (the user approves what was previewed).

**Other features build on it.** F84 Outbound writes, F86 Outbound messaging, F87 Agent-to-agent exchange, F90 Physical devices and local network.

**Commonly needed with.** F145 Agent identity disclosure (together in 96 use cases, 46% of this feature's); F84 Outbound writes (together in 64 use cases, 31% of this feature's).

### F100 Action proposal and dry-run preview

**Definition.** Show exactly what an action would change before doing it for real: diff, row counts, a sample, every recipient, cost. What the agent understood is F11.

**Includes.** Plain-language proposals; simulated effects on the whole set or a sample.

**Why use cases need it.** Steps that preview before acting: counts before applying a merge, a mapping stated before loading, a sample run before the full job, the batch shown before sending, simulated effects of a cut.

**Reach.** Essential to 90 use cases and helpful to 245; used in 18 of 18 categories, most in Science, health and scholarship (43), Everyday life: money, home, health, travel and hobbies (31), Automation, integration, extension and teamwork (31).

**Essential to (90 in total; 10 representative, spread across categories).**

- 3.1 Schema inference for unknown files
- 4.14 Data access broker that negotiates for a dataset
- 5.14 Notes vault, knowledge-base sync and browsing rabbit holes
- 6.3 Shared expenses settle-up
- 9.1 Literature map from seed papers
- 10.4 Privilege attack paths in directories and clouds
- 11.6 Outage root-cause tracing
- 12.2 Methods section and reproducibility package
- 14.12 Style layer debugger: why is this node red?
- 15.11 Graph result to action across tools

**Helpful to.** 245 use cases, for example 1.2 Wikipedia list or category to graph; 2.1 PDF or scanned document to graph; 3.2 Bipartite to one-mode projection.

**Other features build on it.** F84 Outbound writes, F86 Outbound messaging, F99 Approval gate.

**Commonly needed with.** F32 Graph editing (together in 273 use cases, 81% of this feature's).

### F101 Policy and restriction modes

**Definition.** One enforcement engine, applied in every tool, that limits what the agent may touch or do (read-only, draft-only, explain-only, hint-only, these systems or fields only, no network, spoiler-free) with policy sources from the user, an administrator, instructor or organization, and rights over who may change each policy.

**Includes.** Field-level grants; tutorial and draft-only modes; destination and bot policies; policy change rights.

**Why use cases need it.** Steps that limit the agent: read-only calendar access, explain-only tutorial mode, an instructor's integrity policy, interview-only work with no outreach, destination policies.

**Reach.** Essential to 31 use cases and helpful to 56; used in 14 of 18 categories, most in Operations, infrastructure, software and organizations (15), Safety, privacy and misuse (14), Learning, play and creative work (12).

**Essential to (31 in total; 10 representative, spread across categories).**

- 1.5 Pull a graph from a database, warehouse or graph store in plain language
- 3.18 Standing graph steward and dataset curator
- 4.12 Privacy scrub and policy guardrail before sharing
- 5.3 Who have I lost touch with?
- 6.4 Estate and after-I'm-gone map
- 10.1 Money-flow tracing for anti-money-laundering
- 14.2 Show-me mode: a live guided tour
- 16.3 Socratic tutor that targets misconceptions
- 17.2 Safety map for survivors of domestic abuse or stalking
- 18.7 Indigenous knowledge graph under community data sovereignty

**Helpful to.** 56 use cases, for example 4.4 Geocode places; 5.7 Job search warm-intro paths; 6.11 Habit and mood connections.

**Other features build on it.** F08 Hidden state keeping, F83 Account connectors and delegated access, F88 Agent as a service, F168 External data store connection and query authoring.

**Commonly needed with.** F83 Account connectors and delegated access (together in 30 use cases, 34% of this feature's).

### F102 Stop and interrupt

**Definition.** Let the user interrupt the agent mid-answer or mid-action and stop it at once, leaving a consistent state.

**Includes.** Barge-in during speech; stop button; kill switch for running batches.

**Why use cases need it.** Steps where the user must be able to cut in: barge-in during speech, a stop button on batches, pausing an agent from the graph, stopping cleanly mid-action.

**Reach.** Essential to 104 use cases and helpful to 66; used in 18 of 18 categories, most in Automation, integration, extension and teamwork (21), Accessibility, voice and immersive interaction (20), Turning documents, media and conversation into graphs (13).

**Essential to (104 in total; 10 representative, spread across categories).**

- 2.18 Voice interviews to collect network survey data at scale
- 5.23 Briefing before each meeting from my relationship graph
- 8.25 Forecast ledger that grades itself later
- 9.3 Conversational literature landscape
- 11.1 Multi-tier supplier risk map
- 12.3 Reproducible notebook export
- 13.1 Eyes-free graph for blind and low-vision users
- 15.21 Watch a swarm of sub-agents work
- 16.1 Interactive graph theory lessons
- 18.8 Word-finding web for people with aphasia

**Helpful to.** 66 use cases, for example 1.3 Plain-English SPARQL pulls; 2.1 PDF or scanned document to graph; 3.15 Iterative cleaning loop with a human.

**Other features build on it.** F39 Narrated tours and animation, F86 Outbound messaging, F93 Durable jobs, F129 Voice conversation.

**Commonly needed with.** F93 Durable jobs (together in 119 use cases, 70% of this feature's); F129 Voice conversation (together in 57 use cases, 34% of this feature's); F122 Live work visibility (together in 79 use cases, 46% of this feature's); F96 User notification policy (together in 58 use cases, 34% of this feature's); F95 Triggers (together in 56 use cases, 33% of this feature's).

### F103 User-tunable agent behavior

**Definition.** Let the user dial agent behaviors up, down or off (verbosity, caveats, hints, narration, unprompted speech) and honor the setting.

**Includes.** Mute and snooze; suggestion frequency; caveat level.

**Why use cases need it.** Steps that respect the user's dial for hints, adaptation, narration and tips, including turning them off.

**Reach.** Essential to 5 use cases and helpful to 8; used in 5 of 18 categories, most in Accessibility, voice and immersive interaction (4), Asking the graph questions: guided analysis and explanation (3), Help, support and product quality (3).

**Essential to (5).**

- 7.15 One caveat and one next question after every result
- 7.17 Curiosity companion that watches you explore
- 13.19 Biometric-adaptive immersive sessions
- 13.20 Side-quest parking lot for distractible and dyslexic users
- 14.10 Notice struggle and offer help

**Helpful to.** 8 use cases, for example 7.1 Explain this graph in 60 seconds; 8.5 Hypothesis notebook with pre-registration; 13.5 Cognitive load reducer.

**Other features build on it.** F98 Proactive suggestions.

**Commonly needed with.** F98 Proactive suggestions (together in 9 use cases, 69% of this feature's); F178 App and view state reading (together in 8 use cases, 62% of this feature's); F22 Cross-session user memory (together in 9 use cases, 69% of this feature's); F125 Plain-language explanation (together in 8 use cases, 62% of this feature's); F102 Stop and interrupt (together in 8 use cases, 62% of this feature's).

### F104 Review queue

**Definition.** Collect items needing human judgment (merges, labels, flags, matches, extractions shown over their source image or video) into one queue the user or a reviewer works through, accepting, rejecting or correcting in bulk or one by one, with verdicts recorded for F187.

**Includes.** Grouping similar decisions; bulk actions; verdict records; an overlay item type corrected in place on its source.

**Why use cases need it.** Steps that queue uncertain merges, matches, extractions and flags for a person, batching similar decisions and showing extractions over their source.

**Reach.** Essential to 29 use cases and helpful to 36; used in 12 of 18 categories, most in Science, health and scholarship (18), Turning documents, media and conversation into graphs (10), Investigations: finance, fraud, security, law and journalism (9).

**Essential to (29 in total; 10 representative, spread across categories).**

- 1.6 Stakeholder map from a brief
- 2.1 PDF or scanned document to graph
- 3.8 Duplicate node detection and merging
- 4.1 Fuzzy-key join of graph and spreadsheet
- 7.11 Find the odd nodes
- 8.23 Multi-agent annotation with agreement scoring
- 9.1 Literature map from seed papers
- 10.2 Beneficial ownership and interlocking boards
- 17.10 Remove one person from everything: erasure requests
- 18.1 Who-is-this memory companion for someone with memory loss

**Helpful to.** 36 use cases, for example 2.3 Schema-guided extraction; 3.3 Fix types column by column; 4.4 Geocode places.

**Depends on.** F187 Learning from feedback and outcomes (verdicts are learned from).

**Other features build on it.** F35 Entity resolution, F169 Entity linking to external authorities, F187 Learning from feedback and outcomes.

**Commonly needed with.** F187 Learning from feedback and outcomes (together in 65 use cases, 100% of this feature's); F35 Entity resolution (together in 36 use cases, 55% of this feature's); F108 Uncertainty reporting (together in 57 use cases, 88% of this feature's); F15 Shared plan and task list (together in 33 use cases, 51% of this feature's); F14 Planning (together in 34 use cases, 52% of this feature's); F112 Schema enforcement (together in 41 use cases, 63% of this feature's).

### F106 Hand-off to a person

**Definition.** Route a decision, review, sign-off or conversation to a named human (editor, lawyer, data owner, expert, caseworker) with a prepared summary, stop acting on it, and resume when they respond.

**Includes.** Context packages; waiting state; taking the human's answer back into the work.

**Why use cases need it.** Steps that route a decision to a named person (editor, lawyer, clinician, maintainer, next-shift analyst) with a prepared package, and wait for their answer.

**Reach.** Essential to 36 use cases and helpful to 29; used in 15 of 18 categories, most in Automation, integration, extension and teamwork (10), Help, support and product quality (8), Care, community and humanitarian work (8).

**Essential to (36 in total; 10 representative, spread across categories).**

- 2.2 Document pile to sourced entity graph
- 3.18 Standing graph steward and dataset curator
- 4.14 Data access broker that negotiates for a dataset
- 9.25 Network meta-analysis of treatments
- 10.1 Money-flow tracing for anti-money-laundering
- 12.5 Response to peer reviewers
- 14.21 Community answerer
- 15.3 Threshold and anomaly alerts
- 17.2 Safety map for survivors of domestic abuse or stalking
- 18.8 Word-finding web for people with aphasia

**Helpful to.** 29 use cases, for example 5.10 DNA match clustering; 6.4 Estate and after-I'm-gone map; 8.23 Multi-agent annotation with agreement scoring.

**Depends on.** F93 Durable jobs (the job waits for the person's answer); F96 User notification policy (the person is reached outside the session).

**Commonly needed with.** F119 Action log and audit trail (together in 28 use cases, 43% of this feature's); F141 Domain advisory framing (together in 21 use cases, 32% of this feature's); F95 Triggers (together in 23 use cases, 35% of this feature's); F96 User notification policy (together in 20 use cases, 31% of this feature's); F145 Agent identity disclosure (together in 20 use cases, 31% of this feature's).

## Quality and verification

Checking results, saying how sure the agent is, and testing the agent itself.

### F107 Result verification

**Definition.** Check the agent's own output against the request, the data and independent sources before declaring success, and after acting confirm the intended effect actually happened.

**Includes.** Recounts, recomputation, invariants, tests, re-imports, cross-sources, null-model and stability checks; post-action re-read of state and a screenshot; accessibility and output checks (color-vision simulation, contrast, resolution).

**Why use cases need it.** Steps that check the agent's own work: recounting against the source, recomputing with another method, round-trip diffs, stability checks, verifying a migration or a render.

**Reach.** Essential to 134 use cases and helpful to 184; used in 18 of 18 categories, most in Publishing, storytelling and visual design (45), Science, health and scholarship (33), Everyday life: money, home, health, travel and hobbies (26).

**Essential to (134 in total; 10 representative, spread across categories).**

- 3.6 Format conversion with a loss report
- 7.4 Multi-step analysis from one prompt
- 8.1 Is my graph the right graph? Modeling check
- 9.1 Literature map from seed papers
- 10.1 Money-flow tracing for anti-money-laundering
- 12.1 Journal-ready figure package
- 14.2 Show-me mode: a live guided tour
- 15.12 Write a plugin from a paper
- 16.1 Interactive graph theory lessons
- 17.10 Remove one person from everything: erasure requests

**Helpful to.** 184 use cases, for example 1.1 Find me a graph about X; 2.1 PDF or scanned document to graph; 3.1 Schema inference for unknown files.

**Commonly needed with.** No feature stands out: none shares at least 8 use cases and 30% of this feature's use cases while appearing with it at least 1.5 times as often as chance.

### F108 Uncertainty reporting

**Definition.** Attach a calibrated confidence to each extracted fact, match, guess or result, separate clear cases from ambiguous ones, and act on low confidence (flag, re-check, ask).

**Includes.** Intervals and stability measures; gaps and contradictions flagged; wording matched to confidence; caveats on limits.

**Why use cases need it.** Steps that attach confidence to extractions, merges, guesses and rankings, caveat limits, and treat low confidence as a reason to flag, recheck or ask.

**Reach.** Essential to 91 use cases and helpful to 179; used in 18 of 18 categories, most in Science, health and scholarship (39), Everyday life: money, home, health, travel and hobbies (24), Publishing, storytelling and visual design (22).

**Essential to (91 in total; 10 representative, spread across categories).**

- 1.2 Wikipedia list or category to graph
- 2.1 PDF or scanned document to graph
- 5.9 Family tree from scattered sources
- 8.2 Parameter sweep and sensitivity report
- 9.1 Literature map from seed papers
- 10.2 Beneficial ownership and interlocking boards
- 13.13 Offline and low-bandwidth graphty for intermittent connectivity
- 14.1 Help desk that answers from the docs and cites them
- 17.1 Is this a scam? Contact map for an older relative
- 18.2 Bureaucracy navigator for immigrants and refugees

**Helpful to.** 179 use cases, for example 1.3 Plain-English SPARQL pulls; 2.3 Schema-guided extraction; 3.1 Schema inference for unknown files.

**Other features build on it.** F35 Entity resolution, F64 Vision, F169 Entity linking to external authorities.

**Commonly needed with.** F35 Entity resolution (together in 87 use cases, 32% of this feature's); F64 Vision (together in 82 use cases, 30% of this feature's).

### F110 Critique, debate and agreement protocols

**Definition.** Protocols on top of sub-agents (F16): independent critics that attack or redo the main work, debates and judging, with agents required to differ in model or method (F167); compare outputs, score agreement and surface disagreements instead of merging them away.

**Includes.** Critic agents; debate and judge protocols; a stated definition of independence; agreement scores; disagreement reports.

**Why use cases need it.** Steps that launch a skeptical critic, run a debate with a judge, or compute agreement between independent workers instead of averaging their answers away.

**Reach.** Essential to 4 use cases and helpful to 9; used in 5 of 18 categories, most in Rigor, simulation and what-if (5), Investigations: finance, fraud, security, law and journalism (3), Turning documents, media and conversation into graphs (2).

**Essential to (4).**

- 8.8 Red-team my analysis
- 8.9 Two agents debate over a graph
- 8.23 Multi-agent annotation with agreement scoring
- 15.21 Watch a swarm of sub-agents work

**Helpful to.** 9 use cases, for example 2.2 Document pile to sourced entity graph; 8.10 Parallel hypothesis exploration with helper agents; 9.23 Alliances and rivalries: signed networks.

**Depends on.** F16 Sub-agents (critics are sub-agents); F167 Model routing and diversity (independence needs a different model or method).

**Commonly needed with.** F16 Sub-agents (together in 13 use cases, 100% of this feature's); F122 Live work visibility (together in 13 use cases, 100% of this feature's); F166 Budgets and limits (together in 13 use cases, 100% of this feature's); F14 Planning (together in 10 use cases, 77% of this feature's); F15 Shared plan and task list (together in 9 use cases, 69% of this feature's); F156 Untrusted content handling (together in 11 use cases, 85% of this feature's).

### F111 Analysis ledger

**Definition.** A required derived view of the run records (F118): counts of every statistical test, comparison and look at the data in a session, so corrections and labels stay honest.

**Includes.** Multiple-comparison tracking; exploratory versus confirmatory labels.

**Why use cases need it.** Rigor steps that count every test and look at the data in a session, correct for the number of hypotheses, and label unregistered analyses as exploratory.

**Reach.** Essential to 4 use cases and helpful to 5; used in 2 of 18 categories, most in Rigor, simulation and what-if (8), Science, health and scholarship (1).

**Essential to (4).**

- 8.5 Hypothesis notebook with pre-registration
- 8.6 Multiple-comparison and data-dredging guard
- 8.10 Parallel hypothesis exploration with helper agents
- 9.5 Gene list to annotated interaction network

**Helpful to.** 5 use cases, for example 8.2 Parameter sweep and sensitivity report.

**Depends on.** F118 Run records and show your work (it is a view of the run records).

**Commonly needed with.** F166 Budgets and limits (together in 8 use cases, 89% of this feature's); F74 Sandboxed code execution (together in 9 use cases, 100% of this feature's); F108 Uncertainty reporting (together in 8 use cases, 89% of this feature's).

### F112 Schema enforcement

**Definition.** Validate tool inputs and parameters, loaded data, and model outputs against declared schemas and constraints (types, ranges, allowed relations and vocabulary, required fields).

**Includes.** Parameter range checks; schema checks on loaded data; typed and constrained model output.

**Why use cases need it.** Steps that hold inputs and outputs to a declared shape: extraction into a target schema, typed relations, input checks for replay, rejecting malformed tables.

**Reach.** Essential to 13 use cases and helpful to 196; used in 14 of 18 categories, most in Science, health and scholarship (39), Operations, infrastructure, software and organizations (33), Everyday life: money, home, health, travel and hobbies (28).

**Essential to (13).**

- 2.1 PDF or scanned document to graph
- 2.2 Document pile to sourced entity graph
- 2.3 Schema-guided extraction
- 2.10 Causal loop diagram from a conversation
- 2.11 Meeting transcript graphs
- 2.12 The conversation itself as a graph
- 2.13 Argument maps and claim graphs
- 3.13 Validate against a schema or standard
- 8.23 Multi-agent annotation with agreement scoring
- 14.16 Upgrade old project files
- 15.5 Record a session as a reusable recipe
- 15.8 Graph step in someone else's pipeline
- 15.10 Spreadsheet and form intake pipeline

**Helpful to.** 196 use cases, for example 1.1 Find me a graph about X; 2.4 Community summaries of a corpus; 3.1 Schema inference for unknown files.

**Other features build on it.** F170 Entity and relation extraction from unstructured content.

**Commonly needed with.** F33 Data import and schema design (together in 189 use cases, 90% of this feature's); F18 Error recovery and self-repair (together in 81 use cases, 39% of this feature's).

### F114 Evaluation harness

**Definition.** Keep hidden questions with known answers and score the agent against them.

**Includes.** Regression suites of tasks; scoring over time.

**Why use cases need it.** A standing exam of questions with known answers, hidden from the agent under test, rerun to catch regressions.

**Reach.** Essential to 1 use cases and helpful to 0; used in 1 of 18 categories, most in Help, support and product quality (1).

**Essential to (1).**

- 14.27 Scheduled self-exam of the agent's graph answers

**Helpful to.** No use case.

**Depends on.** F79 Headless app instances (evaluation runs in isolated instances).

**Commonly needed with.** No feature stands out: none shares at least 8 use cases and 30% of this feature's use cases while appearing with it at least 1.5 times as often as chance.

### F176 Fairness and disparate-impact audit

**Definition.** Before ranking, flagging or scoring people, measure who is wrongly caught: false positives across groups, rules that flag someone only for being near others in the graph, biased source data; report it with the result.

**Includes.** Group-wise error rates; proximity-only flags; source bias notes.

**Why use cases need it.** Steps that rank or flag people and must report who is wrongly caught and whether proximity alone caused a flag.

**Reach.** Essential to 1 use cases and helpful to 19; used in 10 of 18 categories, most in Investigations: finance, fraud, security, law and journalism (4), Science, health and scholarship (3), Automation, integration, extension and teamwork (3).

**Essential to (1).**

- 17.13 Guilt-by-association audit

**Helpful to.** 19 use cases, for example 3.8 Duplicate node detection and merging; 4.6 Snowball expansion from a selection; 6.10 Household chore fairness.

**Depends on.** F36 Algorithm and layout execution (it audits ranking and scoring results).

**Commonly needed with.** F160 Authorization verification (together in 8 use cases, 40% of this feature's); F32 Graph editing (together in 17 use cases, 85% of this feature's); F36 Algorithm and layout execution (together in 16 use cases, 80% of this feature's); F74 Sandboxed code execution (together in 14 use cases, 70% of this feature's); F81 External tools and connectors (together in 11 use cases, 55% of this feature's); F33 Data import and schema design (together in 12 use cases, 60% of this feature's).

## Provenance, reproducibility and audit

Where every value came from, how every result was made, and what every action was.

### F115 Element provenance

**Definition.** Attach to every node, edge and attribute the agent creates or changes where it came from (source, quote, page, method, model guess, human), referencing the action-log entries (F119) for the step and the approval rather than recording them again, and show it on demand.

**Includes.** Lineage through imports, edits and derivations; per-element source tags.

**Why use cases need it.** Steps that tag each created or changed element with its source: hop count per node, every edge tied to its sentence, raw media per element, figures tied to transactions.

**Reach.** Essential to 52 use cases and helpful to 247; used in 18 of 18 categories, most in Science, health and scholarship (43), Everyday life: money, home, health, travel and hobbies (31), Investigations: finance, fraud, security, law and journalism (25).

**Essential to (52 in total; 10 representative, spread across categories).**

- 1.6 Stakeholder map from a brief
- 2.1 PDF or scanned document to graph
- 3.5 Unit and currency normalization
- 4.2 Search the web for a dataset to join
- 5.24 Disclosure forms filled from your own graph
- 6.23 TV and book character map without spoilers
- 8.11 Careful causal sketch from correlations
- 9.1 Literature map from seed papers
- 10.1 Money-flow tracing for anti-money-laundering
- 15.38 Contribution credit statements and payout splits

**Helpful to.** 247 use cases, for example 1.1 Find me a graph about X; 2.5 Text network of a document; 3.1 Schema inference for unknown files.

**Depends on.** F119 Action log and audit trail (provenance references action-log entries).

**Other features build on it.** F32 Graph editing, F63 Document parsing and OCR, F170 Entity and relation extraction from unstructured content, F182 Generative media.

**Commonly needed with.** F32 Graph editing (together in 273 use cases, 91% of this feature's); F47 Undo and rollback (together in 280 use cases, 94% of this feature's); F33 Data import and schema design (together in 168 use cases, 56% of this feature's).

### F116 Grounding and citation

**Definition.** Every stated or written value carries checkable evidence (address, dataset version, row, page, retrieval date) that points at a per-project source table with version, license and access date; a strict mode blocks values that have none.

**Includes.** Pinpoint citations carried into outputs; the per-project source table; the strict no-evidence-no-value mode.

**Why use cases need it.** Steps whose output states facts: citing papers, filings, passages and database entries, refusing values without evidence, citing data sources in a report.

**Reach.** Essential to 69 use cases and helpful to 81; used in 18 of 18 categories, most in Science, health and scholarship (20), Operations, infrastructure, software and organizations (14), Your own life as a graph (13).

**Essential to (69 in total; 10 representative, spread across categories).**

- 1.1 Find me a graph about X
- 2.2 Document pile to sourced entity graph
- 4.2 Search the web for a dataset to join
- 8.11 Careful causal sketch from correlations
- 9.1 Literature map from seed papers
- 10.2 Beneficial ownership and interlocking boards
- 11.3 Forced-labor provenance tracing
- 12.4 Draft a full paper from an analysis session
- 14.1 Help desk that answers from the docs and cites them
- 17.28 Privacy records and impact assessments from a data-flow graph

**Helpful to.** 81 use cases, for example 1.3 Plain-English SPARQL pulls; 3.5 Unit and currency normalization; 4.3 Entity resolution against an authority.

**Depends on.** F60 Content archiving and evidence preservation (evidence must survive the source changing).

**Commonly needed with.** F156 Untrusted content handling (together in 102 use cases, 68% of this feature's); F55 Web fetch (together in 84 use cases, 56% of this feature's); F54 Web search (together in 62 use cases, 41% of this feature's); F81 External tools and connectors (together in 75 use cases, 50% of this feature's).

### F118 Run records and show your work

**Definition.** One record per result of the query, code, prompt, parameters, seeds, data versions and fingerprints, tool versions and data read, so it can be read, audited, described in a methods section and regenerated exactly; 'show your work' is its per-result view.

**Includes.** Seed pinning; version capture; replayable step records; method view per result; reasoning trace export.

**Why use cases need it.** Steps that record how a result was made (query, seeds, parameters, versions) so it can go into a methods section, be rerun exactly, or be backtested.

**Reach.** Essential to 29 use cases and helpful to 97; used in 12 of 18 categories, most in Science, health and scholarship (43), Investigations: finance, fraud, security, law and journalism (22), Rigor, simulation and what-if (16).

**Essential to (29 in total; 10 representative, spread across categories).**

- 1.3 Plain-English SPARQL pulls
- 7.20 Rankings from who beat whom
- 8.3 Null-model significance testing
- 8.5 Hypothesis notebook with pre-registration
- 9.1 Literature map from seed papers
- 9.5 Gene list to annotated interaction network
- 11.4 Freight network redesign
- 12.2 Methods section and reproducibility package
- 15.19 Governance and access audit log
- 16.1 Interactive graph theory lessons

**Helpful to.** 97 use cases, for example 1.2 Wikipedia list or category to graph; 2.5 Text network of a document; 3.2 Bipartite to one-mode projection.

**Depends on.** F46 Versions, branches and structural diff (run records pin data versions).

**Other features build on it.** F20 Reusable recipes, F73 Outputs that stay current, F111 Analysis ledger.

**Commonly needed with.** F14 Planning (together in 75 use cases, 60% of this feature's); F23 Project memory (together in 88 use cases, 70% of this feature's); F15 Shared plan and task list (together in 65 use cases, 52% of this feature's); F74 Sandboxed code execution (together in 86 use cases, 68% of this feature's); F18 Error recovery and self-repair (together in 52 use cases, 41% of this feature's); F27 Domain knowledge packs (together in 49 use cases, 39% of this feature's).

### F119 Action log and audit trail

**Definition.** Keep an ordered, inspectable, exportable record of every user and agent action, data access, tool call, input, output, approval and refusal; spending is one view of it. Sealing it is F121.

**Includes.** Replayable operation history; queryable audit export; who did what and why.

**Why use cases need it.** Steps that log every action, refusal, access and approval for later review, often required by investigation, safety and team-policy use cases.

**Reach.** Essential to 44 use cases and helpful to 87; used in 18 of 18 categories, most in Automation, integration, extension and teamwork (20), Safety, privacy and misuse (15), Rigor, simulation and what-if (14).

**Essential to (44 in total; 10 representative, spread across categories).**

- 2.2 Document pile to sourced entity graph
- 3.18 Standing graph steward and dataset curator
- 7.4 Multi-step analysis from one prompt
- 8.1 Is my graph the right graph? Modeling check
- 9.8 Patient referral network
- 10.1 Money-flow tracing for anti-money-laundering
- 11.3 Forced-labor provenance tracing
- 14.11 Session time travel
- 15.5 Record a session as a reusable recipe
- 17.6 Doxxing and stalking aggregation

**Helpful to.** 87 use cases, for example 1.5 Pull a graph from a database, warehouse or graph store in plain language; 3.7 Repair a file that will not load; 4.14 Data access broker that negotiates for a dataset.

**Other features build on it.** F18 Error recovery and self-repair, F47 Undo and rollback, F84 Outbound writes, F99 Approval gate, F115 Element provenance, F121 Tamper-evident records and signing.

**Commonly needed with.** No feature stands out: none shares at least 8 use cases and 30% of this feature's use cases while appearing with it at least 1.5 times as often as chance.

### F121 Tamper-evident records and signing

**Definition.** Hash, sign and trusted-timestamp entries and outputs (the action log, hypotheses, forecasts, reports) so later changes are detectable, and verify signatures and timestamps on received files.

**Includes.** Signing; trusted timestamps; verifiers.

**Why use cases need it.** Steps that must prove a record was not changed: pre-registered hypotheses, immutable predictions, hashed inputs, signed deletion receipts, verifying a received file.

**Reach.** Essential to 11 use cases and helpful to 10; used in 7 of 18 categories, most in Investigations: finance, fraud, security, law and journalism (7), Safety, privacy and misuse (5), Rigor, simulation and what-if (3).

**Essential to (11).**

- 6.32 Co-parenting handoff map for children in two homes
- 8.5 Hypothesis notebook with pre-registration
- 8.25 Forecast ledger that grades itself later
- 12.21 Court or compliance exhibit
- 12.46 Signed, timestamped evidence snapshot
- 15.19 Governance and access audit log
- 17.10 Remove one person from everything: erasure requests
- 17.17 Harassment campaign documentation for the target
- 17.22 Per-recipient watermarked copies to trace a leak
- 17.31 Retention timer and auto-expiry for sensitive projects
- 17.35 Check whether a received graph or figure was tampered with

**Helpful to.** 10 use cases, for example 10.1 Money-flow tracing for anti-money-laundering; 11.3 Forced-labor provenance tracing; 12.49 Deposit the dataset with a permanent identifier.

**Depends on.** F119 Action log and audit trail (the log is one of its sealing targets).

**Other features build on it.** F60 Content archiving and evidence preservation.

**Commonly needed with.** F119 Action log and audit trail (together in 14 use cases, 67% of this feature's); F106 Hand-off to a person (together in 8 use cases, 38% of this feature's); F118 Run records and show your work (together in 10 use cases, 48% of this feature's); F95 Triggers (together in 9 use cases, 43% of this feature's); F14 Planning (together in 9 use cases, 43% of this feature's).

## Observability

Seeing what the agent and the product are doing while it happens.

### F122 Live work visibility

**Definition.** One structured event stream per agent and sub-agent, with a summary view (current step, percent done, time remaining, partial results) and a drill-down view of what each is doing, reading and concluding.

**Includes.** Partial results; time estimates; per-step status; per-agent drill-down.

**Why use cases need it.** Steps that show progress and partial results while long or parallel work runs, including watching a debate or a swarm of helpers.

**Reach.** Essential to 2 use cases and helpful to 135; used in 18 of 18 categories, most in Science, health and scholarship (20), Rigor, simulation and what-if (12), Everyday life: money, home, health, travel and hobbies (11).

**Essential to (2).**

- 8.9 Two agents debate over a graph
- 15.21 Watch a swarm of sub-agents work

**Helpful to.** 135 use cases, for example 1.1 Find me a graph about X; 2.1 PDF or scanned document to graph; 3.6 Format conversion with a loss report.

**Other features build on it.** F16 Sub-agents, F93 Durable jobs.

**Commonly needed with.** F166 Budgets and limits (together in 112 use cases, 82% of this feature's); F16 Sub-agents (together in 73 use cases, 53% of this feature's); F93 Durable jobs (together in 69 use cases, 50% of this feature's); F102 Stop and interrupt (together in 79 use cases, 58% of this feature's); F14 Planning (together in 63 use cases, 46% of this feature's); F15 Shared plan and task list (together in 56 use cases, 41% of this feature's).

### F124 Performance measurement

**Definition.** Read timing and frame-rate figures for the product and compare them before and after a change.

**Includes.** Timings; frame rate; before/after comparison; baseline measurements for experiments.

**Why use cases need it.** Performance-tuning steps that measure frame rate before and after each change and keep or revert it.

**Reach.** Essential to 1 use cases and helpful to 1; used in 2 of 18 categories, most in Rigor, simulation and what-if (1), Help, support and product quality (1).

**Essential to (1).**

- 14.13 Performance tuner

**Helpful to.** 1 use cases, for example 8.28 Closed-loop lab: the graph picks the next experiment and a robot runs it.

**Commonly needed with.** No feature stands out: none shares at least 8 use cases and 30% of this feature's use cases while appearing with it at least 1.5 times as often as chance.

## Explanation and communication

Saying things clearly, to the right audience, in the right language, fast enough.

### F125 Plain-language explanation

**Definition.** Turn findings, numbers, risks and settings into plain-language explanations with the method used, what it means and what it does not mean.

**Includes.** Method limits; interpretation guidance.

**Why use cases need it.** Steps that explain a result, a risk, a cause or a visual encoding in plain words, including what it does not mean.

**Reach.** Essential to 84 use cases and helpful to 80; used in 15 of 18 categories, most in Safety, privacy and misuse (22), Rigor, simulation and what-if (21), Everyday life: money, home, health, travel and hobbies (18).

**Essential to (84 in total; 10 representative, spread across categories).**

- 2.4 Community summaries of a corpus
- 3.2 Bipartite to one-mode projection
- 7.1 Explain this graph in 60 seconds
- 8.1 Is my graph the right graph? Modeling check
- 9.12 Food webs and extinction cascades
- 10.3 Fraud and claim ring detection
- 12.20 Story-ready visuals for journalists
- 13.1 Eyes-free graph for blind and low-vision users
- 14.1 Help desk that answers from the docs and cites them
- 17.1 Is this a scam? Contact map for an older relative

**Helpful to.** 80 use cases, for example 2.3 Schema-guided extraction; 3.5 Unit and currency normalization; 4.2 Search the web for a dataset to join.

**Commonly needed with.** No feature stands out: none shares at least 8 use cases and 30% of this feature's use cases while appearing with it at least 1.5 times as often as chance.

### F126 Audience adaptation

**Definition.** Adjust wording, reading level, length, tone, pacing and form (large print, easy-read, picture-first) to the audience and the person's current needs, while checking the claim is unchanged.

**Includes.** Reading levels; tone for a frightened person, a child or an expert; claim-preservation check.

**Why use cases need it.** Steps that adjust for the audience: reading levels, a frightened older adult, a child, a youth at their own pace, easy-read and picture-first maps.

**Reach.** Essential to 10 use cases and helpful to 38; used in 10 of 18 categories, most in Learning, play and creative work (10), Care, community and humanitarian work (9), Publishing, storytelling and visual design (7).

**Essential to (10).**

- 12.24 Plain-language and reading-level variants
- 13.5 Cognitive load reducer
- 13.12 Phone-call mode: ask your graph while driving
- 13.14 Oral-first graph for people who do not read
- 16.8 Kids build the food web
- 17.1 Is this a scam? Contact map for an older relative
- 18.1 Who-is-this memory companion for someone with memory loss
- 18.8 Word-finding web for people with aphasia
- 18.10 Lifelong connections map for youth in or leaving foster care
- 18.16 Circle-of-support map in easy-read for adults with intellectual disabilities

**Helpful to.** 38 use cases, for example 7.1 Explain this graph in 60 seconds; 9.8 Patient referral network; 11.18 State spaces: Markov chains, state machines and puzzles.

**Commonly needed with.** F129 Voice conversation (together in 18 use cases, 38% of this feature's); F22 Cross-session user memory (together in 21 use cases, 44% of this feature's).

### F127 Multilingual and translation

**Definition.** Work in the user's or a respondent's language, detect languages and scripts, translate and transliterate, handle right-to-left scripts and localize formats while keeping identifiers stable.

**Includes.** Low-resource languages and dialects; names in many scripts.

**Why use cases need it.** Steps in the user's or a respondent's language: interviews, SMS ledgers, kinship terms, translated reports with stable ids, labels in many scripts.

**Reach.** Essential to 16 use cases and helpful to 9; used in 10 of 18 categories, most in Your own life as a graph (5), Science, health and scholarship (5), Care, community and humanitarian work (5).

**Essential to (16).**

- 2.18 Voice interviews to collect network survey data at scale
- 3.17 Translate and transliterate labels
- 5.19 What do I call this relative? Kinship beyond the Western family tree
- 6.27 Informal savings groups and family remittance webs
- 6.34 Shopkeeper credit ledger for informal neighborhood shops
- 9.33 Terminology concept graph for translators
- 9.41 Language structure: parse trees and lexical networks
- 12.25 Translation and localization of outputs
- 13.14 Oral-first graph for people who do not read
- 14.9 Help in the user's language
- 16.10 Vocabulary web for language learning
- 18.2 Bureaucracy navigator for immigrants and refugees
- 18.3 Family tracing after displacement
- 18.6 Humanitarian who-does-what-where coordination map
- 18.11 Recruitment-agency and job-offer check for migrant workers
- 18.14 Crop buyer and price network for smallholder farmers

**Helpful to.** 9 use cases, for example 5.5 Group chat dynamics; 9.1 Literature map from seed papers; 13.15 Sign language and caption-first collaboration for deaf users.

**Commonly needed with.** F35 Entity resolution (together in 13 use cases, 52% of this feature's); F129 Voice conversation (together in 10 use cases, 40% of this feature's); F108 Uncertainty reporting (together in 20 use cases, 80% of this feature's); F22 Cross-session user memory (together in 14 use cases, 56% of this feature's); F102 Stop and interrupt (together in 15 use cases, 60% of this feature's); F147 Sensitive data detection (together in 8 use cases, 32% of this feature's).

### F128 Low-latency streaming responses (quality attribute)

**Definition.** Every interaction mode must answer within its latency budget (live voice, VR, games, hands-free), streaming partial answers. A quality attribute, not a separately built feature.

**Includes.** Streaming output; latency targets per mode.

**Why use cases need it.** Voice, game, VR and screen-reader steps that are useless if late: answering while the user walks, live captions, playing moves in real time.

**Reach.** Essential to 22 use cases and helpful to 7; used in 10 of 18 categories, most in Accessibility, voice and immersive interaction (8), Learning, play and creative work (8), Turning documents, media and conversation into graphs (3).

**Essential to (22 in total; 10 representative, spread across categories).**

- 2.7 Whiteboard, sticky-note or photo to graph
- 3.19 Cleaning in VR by voice and pointing
- 5.20 Live conversation whisperer from your relationship graph
- 13.1 Eyes-free graph for blind and low-vision users
- 13.6 Voice navigation and hands-free control in VR and AR
- 15.17 Live co-exploration with a facilitator agent
- 15.21 Watch a swarm of sub-agents work
- 16.8 Kids build the food web
- 16.12 Six degrees of anything
- 18.8 Word-finding web for people with aphasia

**Helpful to.** 7 use cases, for example 2.9 Interview mode graph building; 6.25 Sports passing networks, live or after the match; 7.1 Explain this graph in 60 seconds.

**Other features build on it.** F129 Voice conversation.

**Commonly needed with.** F129 Voice conversation (together in 23 use cases, 79% of this feature's); F130 Multimodal input and pointing (together in 11 use cases, 38% of this feature's); F102 Stop and interrupt (together in 27 use cases, 93% of this feature's); F39 Narrated tours and animation (together in 9 use cases, 31% of this feature's); F31 Graph data query (together in 16 use cases, 55% of this feature's); F155 Consent management (together in 9 use cases, 31% of this feature's).

## Interaction modes and channels

Every way in and out besides typing in the main window: voice, pointing, devices, phones, small screens and non-visual output.

### F129 Voice conversation

**Definition.** Take spoken input (accents, noisy rooms, several speakers) and speak output with controllable speed, voice and verbosity, in real time.

**Includes.** Speech recognition; speech synthesis; multi-speaker input.

**Why use cases need it.** Steps that listen and speak: spoken interviews and corrections, narration, phone calls, several children talking at once, eyes-free mode.

**Reach.** Essential to 39 use cases and helpful to 18; used in 16 of 18 categories, most in Accessibility, voice and immersive interaction (17), Care, community and humanitarian work (7), Learning, play and creative work (6).

**Essential to (39 in total; 10 representative, spread across categories).**

- 2.7 Whiteboard, sticky-note or photo to graph
- 3.19 Cleaning in VR by voice and pointing
- 5.17 Lifelong personal graph walked in VR
- 6.30 Project plan and calendar holds from a dependency graph
- 9.3 Conversational literature landscape
- 12.11 Podcast-style audio briefing
- 13.1 Eyes-free graph for blind and low-vision users
- 15.16 Review request with guided walkthrough
- 16.1 Interactive graph theory lessons
- 18.1 Who-is-this memory companion for someone with memory loss

**Helpful to.** 18 use cases, for example 2.9 Interview mode graph building; 5.19 What do I call this relative? Kinship beyond the Western family tree; 6.13 Food, symptoms and elimination diet.

**Depends on.** F102 Stop and interrupt (speech needs barge-in); F128 Low-latency streaming responses (live voice needs its latency budget).

**Other features build on it.** F177 Live multi-party conversation.

**Commonly needed with.** F102 Stop and interrupt (together in 57 use cases, 100% of this feature's); F128 Low-latency streaming responses (together in 23 use cases, 40% of this feature's); F126 Audience adaptation (together in 18 use cases, 32% of this feature's).

### F130 Multimodal input and pointing

**Definition.** Capture and fuse speech with pointing, lasso, gaze, touch, drawing, controller rays and body pose in 2D, 3D or VR into one command; resolving them to referents is F04.

**Includes.** Sensor input (head and hand pose, gaze, switches); immersive VR interaction.

**Why use cases need it.** Immersive and accessibility steps that combine speech with pointing, lasso, gaze, controller rays, switches or drawing in the air.

**Reach.** Essential to 11 use cases and helpful to 8; used in 8 of 18 categories, most in Accessibility, voice and immersive interaction (10), Learning, play and creative work (3), Turning documents, media and conversation into graphs (1).

**Essential to (11).**

- 3.19 Cleaning in VR by voice and pointing
- 5.17 Lifelong personal graph walked in VR
- 9.38 Space: the cosmic web, satellite constellations and debris close approaches
- 13.6 Voice navigation and hands-free control in VR and AR
- 13.7 Deixis and gesture: these, not those
- 13.8 Walking conversation in room-scale VR
- 13.9 Tabletop AR war room
- 13.11 Sketch a graph in the air
- 13.17 Switch and eye-gaze access on the desktop
- 13.19 Biometric-adaptive immersive sessions
- 13.22 Live tangible tabletop: move physical tokens and the graph follows

**Helpful to.** 8 use cases, for example 2.7 Whiteboard, sticky-note or photo to graph; 7.12 Ego network on demand; 13.1 Eyes-free graph for blind and low-vision users.

**Commonly needed with.** F52 Immersive scene control (together in 11 use cases, 58% of this feature's); F04 Reference resolution (together in 10 use cases, 53% of this feature's); F128 Low-latency streaming responses (together in 11 use cases, 58% of this feature's); F129 Voice conversation (together in 15 use cases, 79% of this feature's); F178 App and view state reading (together in 9 use cases, 47% of this feature's); F102 Stop and interrupt (together in 15 use cases, 79% of this feature's).

### F131 Device capture

**Definition.** Use the user's camera, microphone and location directly from the product, with permission, including continuous capture of a live conversation under recorded consent (F155).

**Includes.** Photo and audio capture; location fixes.

**Why use cases need it.** Steps that capture directly from the device: a phone photo, voice notes and GPS in the field, a live call, scanning a label in AR.

**Reach.** Essential to 9 use cases and helpful to 0; used in 6 of 18 categories, most in Turning documents, media and conversation into graphs (3), Science, health and scholarship (2), Your own life as a graph (1).

**Essential to (9).**

- 2.7 Whiteboard, sticky-note or photo to graph
- 2.8 Printable workshop cards that become a graph
- 2.15 Field data collection
- 5.20 Live conversation whisperer from your relationship graph
- 9.3 Conversational literature landscape
- 9.29 Animal social networks from tracking data
- 10.10 Investigation timeline
- 13.18 Graph anchored on physical equipment in AR
- 15.17 Live co-exploration with a facilitator agent

**Helpful to.** No use case.

**Depends on.** F155 Consent management (capture needs recorded consent).

**Commonly needed with.** F155 Consent management (together in 9 use cases, 100% of this feature's).

### F133 Non-visual output channels

**Definition.** Deliver output without sight: screen-reader announcements, keyboard focus, braille, captions anchored near the thing discussed, and spatial audio tied to graph elements.

**Includes.** Screen reader; braille; captions of agent and human speech; positional sound cues. Encoding data as sound or touch is F179.

**Why use cases need it.** Steps that deliver output without sight: screen-reader announcements, alt text and data tables, braille labels, anchored captions.

**Reach.** Essential to 5 use cases and helpful to 3; used in 1 of 18 categories, most in Accessibility, voice and immersive interaction (8).

**Essential to (5).**

- 13.1 Eyes-free graph for blind and low-vision users
- 13.2 Alt text and layered descriptions
- 13.4 Tactile graphics and 3D-printed sculptures
- 13.15 Sign language and caption-first collaboration for deaf users
- 13.17 Switch and eye-gaze access on the desktop

**Helpful to.** 3 use cases, for example 13.20 Side-quest parking lot for distractible and dyslexic users.

**Other features build on it.** F179 Non-visual data encodings.

**Commonly needed with.** No feature stands out: none shares at least 8 use cases and 30% of this feature's use cases while appearing with it at least 1.5 times as often as chance.

### F135 Cross-surface and glanceable output

**Definition.** Run or show results outside the main app (browser side panels, widgets, watches, wall displays, earpieces, glasses, lock screens) in very short form where needed.

**Includes.** Small-surface formatting; multiple surfaces.

**Why use cases need it.** Steps that deliver to small or secondary surfaces: earpieces, glasses, watches, widgets, wall displays.

**Reach.** Essential to 5 use cases and helpful to 1; used in 4 of 18 categories, most in Automation, integration, extension and teamwork (2), Learning, play and creative work (2), Your own life as a graph (1).

**Essential to (5).**

- 5.20 Live conversation whisperer from your relationship graph
- 15.37 Browser companion that shows your graph on the pages you visit
- 15.39 Glanceable graph facts on a watch, widget or lock screen
- 16.13 Daily graph puzzle
- 16.21 Living ambient display

**Helpful to.** 1 use cases, for example 13.15 Sign language and caption-first collaboration for deaf users.

**Commonly needed with.** No feature stands out: none shares at least 8 use cases and 30% of this feature's use cases while appearing with it at least 1.5 times as often as chance.

### F136 Conversation channel adapters

**Definition.** Adapters that carry conversation over phone calls, SMS, chat apps, team chat threads and email, inbound and outbound, including over low bandwidth; F96 decides when to reach the user and F86 reuses them for other people.

**Includes.** Telephony; text messaging; participating in team channels.

**Why use cases need it.** Steps that hold the conversation over phone calls, SMS, chat apps or team channels, often on basic phones.

**Reach.** Essential to 10 use cases and helpful to 8; used in 10 of 18 categories, most in Everyday life: money, home, health, travel and hobbies (5), Care, community and humanitarian work (3), Publishing, storytelling and visual design (2).

**Essential to (10).**

- 2.18 Voice interviews to collect network survey data at scale
- 6.27 Informal savings groups and family remittance webs
- 6.34 Shopkeeper credit ledger for informal neighborhood shops
- 12.18 Chat-channel post with follow-up answers
- 12.45 Live overlay for broadcasts and video calls
- 13.12 Phone-call mode: ask your graph while driving
- 17.20 Peer safety alert network for at-risk workers
- 18.11 Recruitment-agency and job-offer check for migrant workers
- 18.12 Check-on-each-other network for heat waves and outages
- 18.14 Crop buyer and price network for smallholder farmers

**Helpful to.** 8 use cases, for example 4.15 Ask the people in the graph to confirm it; 5.23 Briefing before each meeting from my relationship graph; 6.9 Kids' carpool and activity network.

**Depends on.** F159 Identity and roles (callers without a screen must be identified).

**Other features build on it.** F86 Outbound messaging, F96 User notification policy.

**Commonly needed with.** F96 User notification policy (together in 13 use cases, 72% of this feature's); F95 Triggers (together in 12 use cases, 67% of this feature's); F102 Stop and interrupt (together in 14 use cases, 78% of this feature's); F129 Voice conversation (together in 8 use cases, 44% of this feature's); F145 Agent identity disclosure (together in 9 use cases, 50% of this feature's); F148 Redaction and de-identification (together in 8 use cases, 44% of this feature's).

### F137 Physical-world perception

**Definition.** Recognize and track real objects and spaces through a camera and anchor graph content to them.

**Includes.** Object tracking; spatial anchoring.

**Why use cases need it.** Augmented-reality steps that anchor the graph to a real table, rack or surface.

**Reach.** Essential to 3 use cases and helpful to 1; used in 1 of 18 categories, most in Accessibility, voice and immersive interaction (4).

**Essential to (3).**

- 13.9 Tabletop AR war room
- 13.18 Graph anchored on physical equipment in AR
- 13.22 Live tangible tabletop: move physical tokens and the graph follows

**Helpful to.** 1 use cases, for example 13.8 Walking conversation in room-scale VR.

**Commonly needed with.** No feature stands out: none shares at least 8 use cases and 30% of this feature's use cases while appearing with it at least 1.5 times as often as chance.

### F179 Non-visual data encodings

**Definition.** Map graph structure to sound (pitch, timbre, rhythm) and touch (vibration, tactile output) through a stated mapping and a legend the reader can learn.

**Includes.** Sonification; haptic encodings; learnable legends.

**Why use cases need it.** Accessibility steps that map structure to pitch, timbre, rhythm or touch with a learnable legend.

**Reach.** Essential to 2 use cases and helpful to 1; used in 1 of 18 categories, most in Accessibility, voice and immersive interaction (3).

**Essential to (2).**

- 13.3 Sonification
- 13.4 Tactile graphics and 3D-printed sculptures

**Helpful to.** 1 use cases, for example 13.1 Eyes-free graph for blind and low-vision users.

**Depends on.** F133 Non-visual output channels (encodings are delivered over non-visual channels).

**Commonly needed with.** No feature stands out: none shares at least 8 use cases and 30% of this feature's use cases while appearing with it at least 1.5 times as often as chance.

## Safety

Recognizing harm, slowing risky requests, framing advice and protecting people physically and emotionally.

### F138 Harm and misuse screening

**Definition.** Score requests, plans, tool sequences and outputs for harm potential (defamation, stalking, doxxing, surveillance, weapons, unauthorized reconnaissance, judging people) beyond single keywords, and decline, limit or require review.

**Includes.** Pattern detection across turns; dual-use risk scores; warnings and required review.

**Why use cases need it.** Steps that recognize harmful patterns: weak-point maps, requests converging on one private person, hazardous synthesis, detector evasion, fabricated links.

**Reach.** Essential to 19 use cases and helpful to 16; used in 10 of 18 categories, most in Safety, privacy and misuse (12), Turning documents, media and conversation into graphs (5), Rigor, simulation and what-if (5).

**Essential to (19).**

- 1.6 Stakeholder map from a brief
- 2.11 Meeting transcript graphs
- 2.19 Screen recording to a map of how work actually flows
- 8.12 Resilience: what breaks if we lose this?
- 8.28 Closed-loop lab: the graph picks the next experiment and a robot runs it
- 9.21 Molecules, reactions and metabolism as graphs
- 10.5 Threat-intel pivoting
- 10.15 On-chain transaction and token graphs
- 10.18 Social-engineering exposure of an organization
- 10.23 Debunk a viral connect-the-dots chart
- 17.5 Purpose check before profiling a private person
- 17.6 Doxxing and stalking aggregation
- 17.14 Surveillance mapping of activists and dissidents
- 17.18 Dual-use gate for critical-infrastructure targeting
- 17.24 Influence-campaign seeding and microtargeting
- 17.25 Leak hunt: unmasking a whistleblower from communications graphs
- 17.26 Detector evasion design
- 17.33 Worker-protection guard in workplace network analysis
- 17.34 Dual-use review for life-science graphs

**Helpful to.** 16 use cases, for example 1.5 Pull a graph from a database, warehouse or graph store in plain language; 2.2 Document pile to sourced entity graph; 5.19 What do I call this relative? Kinship beyond the Western family tree.

**Other features build on it.** F182 Generative media.

**Commonly needed with.** F160 Authorization verification (together in 18 use cases, 51% of this feature's); F140 Graduated friction and safe alternatives (together in 13 use cases, 37% of this feature's); F119 Action log and audit trail (together in 19 use cases, 54% of this feature's); F101 Policy and restriction modes (together in 13 use cases, 37% of this feature's); F147 Sensitive data detection (together in 12 use cases, 34% of this feature's); F27 Domain knowledge packs (together in 14 use cases, 40% of this feature's).

### F140 Graduated friction and safe alternatives

**Definition.** Respond to risky requests with proportionate friction (asking about purpose, slowing, questioning, per-sender rate limits on sensitive operations, reframing) rather than allow-or-block, and offer legitimate alternatives when declining.

**Includes.** Rate limits on person-centric lookups and sends; refusal with alternatives.

**Why use cases need it.** Steps that slow a risky request down rather than refuse outright: asking the purpose, confirming the network is the user's own, rate-limiting person lookups, offering a safer path.

**Reach.** Essential to 23 use cases and helpful to 10; used in 10 of 18 categories, most in Safety, privacy and misuse (17), Rigor, simulation and what-if (3), Automation, integration, extension and teamwork (3).

**Essential to (23 in total; 10 representative, spread across categories).**

- 1.4 Scrape a site's link structure
- 6.26 Where my internet traffic goes
- 8.17 Link prediction with a backtest
- 8.29 Predict missing labels from the network's structure, with a backtest
- 9.21 Molecules, reactions and metabolism as graphs
- 12.47 Public ask-this-graph widget for a website
- 15.9 Graphty as an MCP server for other agents
- 17.4 Teen and parent follower-safety review
- 17.5 Purpose check before profiling a private person
- 18.15 Recruitment-pathway map for families and exit counselors

**Helpful to.** 10 use cases, for example 4.15 Ask the people in the graph to confirm it; 5.5 Group chat dynamics; 8.15 Intervention planner: where to add one edge.

**Commonly needed with.** F160 Authorization verification (together in 26 use cases, 79% of this feature's); F138 Harm and misuse screening (together in 13 use cases, 39% of this feature's); F159 Identity and roles (together in 12 use cases, 36% of this feature's); F101 Policy and restriction modes (together in 16 use cases, 48% of this feature's); F119 Action log and audit trail (together in 17 use cases, 52% of this feature's).

### F141 Domain advisory framing

**Definition.** Stay inside safe bounds in medical, legal, financial, safety-critical and security topics: mark outputs as advisory, state limits, never imply what the evidence cannot support. Physical hazards of output are F174.

**Includes.** Not-advice framing; stricter rules in sensitive domains.

**Why use cases need it.** Steps in medical, legal, financial and safety topics that must say 'not advice', 'not a forecast' or 'not a verdict' and stay inside what the evidence supports.

**Reach.** Essential to 29 use cases and helpful to 45; used in 14 of 18 categories, most in Publishing, storytelling and visual design (19), Operations, infrastructure, software and organizations (14), Everyday life: money, home, health, travel and hobbies (9).

**Essential to (29 in total; 10 representative, spread across categories).**

- 4.11 Licensing, attribution and citation credits
- 5.20 Live conversation whisperer from your relationship graph
- 6.4 Estate and after-I'm-gone map
- 7.2 Who matters most here, with the right kind of matters
- 8.11 Careful causal sketch from correlations
- 9.7 Drug repurposing candidates
- 10.11 Case-law citation network
- 11.22 Buildings as graphs: rooms, wayfinding and evacuation
- 12.19 Investigative journalism package
- 16.33 Differential diagnosis reasoning graph for medical students

**Helpful to.** 45 use cases, for example 5.4 Calendar time map; 6.2 Money flow between my own accounts; 7.6 Why is this node ranked so high?.

**Commonly needed with.** F09 Clarifying questions (together in 53 use cases, 72% of this feature's).

### F142 Sensitive presentation

**Definition.** Frame sensitive findings gently and neutrally, and hide or blur abusive, graphic or triggering content by default, revealing it only on request.

**Includes.** Harm-aware wording; content shielding.

**Why use cases need it.** Steps that show sensitive findings: scores about real people that are not verdicts, abusive content hidden by default, labels that could stereotype.

**Reach.** Essential to 8 use cases and helpful to 21; used in 10 of 18 categories, most in Your own life as a graph (8), Everyday life: money, home, health, travel and hobbies (5), Safety, privacy and misuse (4).

**Essential to (8).**

- 7.2 Who matters most here, with the right kind of matters
- 7.6 Why is this node ranked so high?
- 7.7 Name the communities
- 8.29 Predict missing labels from the network's structure, with a backtest
- 17.4 Teen and parent follower-safety review
- 17.17 Harassment campaign documentation for the target
- 17.27 Incidental findings protocol
- 18.10 Lifelong connections map for youth in or leaving foster care

**Helpful to.** 21 use cases, for example 1.6 Stakeholder map from a brief; 5.5 Group chat dynamics; 6.4 Estate and after-I'm-gone map.

**Commonly needed with.** F147 Sensitive data detection (together in 15 use cases, 52% of this feature's); F101 Policy and restriction modes (together in 10 use cases, 34% of this feature's); F35 Entity resolution (together in 9 use cases, 31% of this feature's).

### F143 Crisis detection and referral

**Definition.** Recognize signs of danger or crisis, offer or trigger the agreed escalation path, and point to appropriate outside resources without acting on the user's behalf.

**Includes.** Hotlines, legal aid and reporting channels; agreed escalation.

**Why use cases need it.** Steps where danger appears (a distressed respondent, self-harm messages found while cleaning, life-safety risk) and the agent must point to help without acting on the user's behalf.

**Reach.** Essential to 4 use cases and helpful to 9; used in 3 of 18 categories, most in Safety, privacy and misuse (7), Care, community and humanitarian work (5), Turning documents, media and conversation into graphs (1).

**Essential to (4).**

- 2.18 Voice interviews to collect network survey data at scale
- 17.2 Safety map for survivors of domestic abuse or stalking
- 17.27 Incidental findings protocol
- 18.9 Relapse-prevention map for people in recovery

**Helpful to.** 9 use cases, for example 17.1 Is this a scam? Contact map for an older relative; 18.11 Recruitment-agency and job-offer check for migrant workers.

**Depends on.** F27 Domain knowledge packs (referral resources come from a maintained pack).

**Other features build on it.** F175 Incidental content scanning.

**Commonly needed with.** F106 Hand-off to a person (together in 8 use cases, 62% of this feature's); F96 User notification policy (together in 8 use cases, 62% of this feature's); F95 Triggers (together in 8 use cases, 62% of this feature's); F125 Plain-language explanation (together in 9 use cases, 69% of this feature's).

### F145 Agent identity disclosure

**Definition.** Tell people outside the user that they are dealing with an AI agent and on whose behalf.

**Includes.** Disclosure scripts in messages, calls and agent exchanges.

**Why use cases need it.** Steps that send, call or exchange with outsiders and must say an AI agent is acting and for whom.

**Reach.** Essential to 31 use cases and helpful to 65; used in 16 of 18 categories, most in Publishing, storytelling and visual design (21), Automation, integration, extension and teamwork (16), Everyday life: money, home, health, travel and hobbies (11).

**Essential to (31 in total; 10 representative, spread across categories).**

- 2.18 Voice interviews to collect network survey data at scale
- 4.14 Data access broker that negotiates for a dataset
- 5.21 Donate my graph to research
- 6.3 Shared expenses settle-up
- 8.26 Network-aware field experiment designer and runner
- 9.2 Literature and citation watch
- 10.17 Records and data-access requests from the gaps in a graph
- 11.15 Community mapping from a survey
- 12.10 One-page executive briefing
- 15.2 Change digest by email, chat or newsletter

**Helpful to.** 65 use cases, for example 3.7 Repair a file that will not load; 4.13 Data dictionary and datasheet; 5.3 Who have I lost touch with?.

**Depends on.** F86 Outbound messaging (disclosure is needed only when the agent reaches outsiders).

**Other features build on it.** F86 Outbound messaging, F87 Agent-to-agent exchange, F172 Outreach and response collection.

**Commonly needed with.** F84 Outbound writes (together in 62 use cases, 65% of this feature's); F99 Approval gate (together in 96 use cases, 100% of this feature's); F86 Outbound messaging (together in 38 use cases, 40% of this feature's); F100 Action proposal and dry-run preview (together in 96 use cases, 100% of this feature's); F83 Account connectors and delegated access (together in 33 use cases, 34% of this feature's); F95 Triggers (together in 39 use cases, 41% of this feature's).

### F174 Output physical-safety checks

**Definition.** Check and rewrite what the agent shows or does in the physical world for bodily harm: flashing that could trigger seizures, motion that causes sickness, room-scale VR obstacles, sound levels, and commands sent to robots or devices.

**Includes.** Animation flash and motion analysis; VR play-space checks; audio level limits; device command checks.

**Why use cases need it.** Steps that check animations for flashing and motion sickness, VR layouts for obstacles, and device commands for physical harm.

**Reach.** Essential to 7 use cases and helpful to 1; used in 3 of 18 categories, most in Accessibility, voice and immersive interaction (6), Rigor, simulation and what-if (1), Automation, integration, extension and teamwork (1).

**Essential to (7).**

- 8.28 Closed-loop lab: the graph picks the next experiment and a robot runs it
- 13.8 Walking conversation in room-scale VR
- 13.10 Recorded VR/AR guided tour
- 13.16 Motion, flashing and sensory-sensitivity guard
- 13.18 Graph anchored on physical equipment in AR
- 13.19 Biometric-adaptive immersive sessions
- 15.26 Dispatch a graph-planned route to robots or drones

**Helpful to.** 1 use cases, for example 13.6 Voice navigation and hands-free control in VR and AR.

**Other features build on it.** F90 Physical devices and local network.

**Commonly needed with.** No feature stands out: none shares at least 8 use cases and 30% of this feature's use cases while appearing with it at least 1.5 times as often as chance.

### F175 Incidental content scanning

**Definition.** While processing user data for another purpose, notice material that signals danger or crime (self-harm, child abuse, leaked credentials), flag it privately to the user with a confidence, and never take outside action on its own.

**Includes.** Scanning content being cleaned or imported; private flags; the no-informant rule.

**Why use cases need it.** Cleaning and import steps that run across material signaling danger or crime, which must be flagged privately to the user.

**Reach.** Essential to 1 use cases and helpful to 10; used in 5 of 18 categories, most in Everyday life: money, home, health, travel and hobbies (5), Your own life as a graph (2), Safety, privacy and misuse (2).

**Essential to (1).**

- 17.27 Incidental findings protocol

**Helpful to.** 10 use cases, for example 2.2 Document pile to sourced entity graph; 3.14 Knowledge-graph consistency and curation; 5.2 Friend-of-a-friend map from social media exports.

**Depends on.** F147 Sensitive data detection (it is built on sensitive-content classification); F143 Crisis detection and referral (findings route to referral paths).

**Commonly needed with.** F61 Read user files (together in 9 use cases, 82% of this feature's); F157 Safe file inspection (together in 9 use cases, 82% of this feature's).

## Privacy and data governance

Controlling what personal data is collected, kept, shown, sent and inferred.

### F147 Sensitive data detection

**Definition.** Recognize personal and special-category data (health, finance, location, biometrics, minors, secrets) and apply stricter rules to where it is sent, shown or stored.

**Includes.** Classification of fields and content; rule triggers.

**Why use cases need it.** Steps that notice health, minors', location, political or confidential data and apply stricter rules to where it is sent, shown or stored.

**Reach.** Essential to 35 use cases and helpful to 41; used in 14 of 18 categories, most in Science, health and scholarship (18), Your own life as a graph (14), Everyday life: money, home, health, travel and hobbies (12).

**Essential to (35 in total; 10 representative, spread across categories).**

- 2.2 Document pile to sourced entity graph
- 4.4 Geocode places
- 6.4 Estate and after-I'm-gone map
- 8.4 Homophily and assortativity checks
- 9.6 Pathway diff between conditions
- 9.8 Patient referral network
- 10.13 Regulation-to-controls gap map
- 13.12 Phone-call mode: ask your graph while driving
- 16.7 Class friendship map (with care)
- 17.27 Incidental findings protocol

**Helpful to.** 41 use cases, for example 1.5 Pull a graph from a database, warehouse or graph store in plain language; 3.7 Repair a file that will not load; 4.5 Enrich companies and organizations.

**Other features build on it.** F175 Incidental content scanning.

**Commonly needed with.** F148 Redaction and de-identification (together in 34 use cases, 45% of this feature's); F180 On-device model and tool execution (together in 23 use cases, 30% of this feature's); F18 Error recovery and self-repair (together in 32 use cases, 42% of this feature's); F35 Entity resolution (together in 28 use cases, 37% of this feature's); F167 Model routing and diversity (together in 24 use cases, 32% of this feature's); F95 Triggers (together in 27 use cases, 36% of this feature's).

### F148 Redaction and de-identification

**Definition.** Remove, blur, mask, pseudonymize, generalize or aggregate personal data (faces, names, numbers, third parties) before it is stored, analyzed, shown, spoken or leaves the user's control.

**Includes.** Stable pseudonyms with a separate local key; small-count suppression; minimum group sizes; protecting people in the data who are not the user.

**Why use cases need it.** Steps that pseudonymize at import, suppress small counts, coarsen locations, drop non-consenting people, or redact before sending a task outside.

**Reach.** Essential to 40 use cases and helpful to 51; used in 17 of 18 categories, most in Your own life as a graph (13), Operations, infrastructure, software and organizations (13), Publishing, storytelling and visual design (12).

**Essential to (40 in total; 10 representative, spread across categories).**

- 2.7 Whiteboard, sticky-note or photo to graph
- 5.21 Donate my graph to research
- 9.8 Patient referral network
- 10.15 On-chain transaction and token graphs
- 11.12 Organizational network analysis
- 12.22 Patient- or community-facing explainer
- 14.19 Bug report with a minimal reproduction, and support triage
- 15.22 Negotiated data clean room between two organizations' agents
- 16.7 Class friendship map (with care)
- 17.3 Operational-security mode for activists and journalists under repressive governments

**Helpful to.** 51 use cases, for example 2.9 Interview mode graph building; 3.7 Repair a file that will not load; 5.1 Your own accounts as graphs.

**Other features build on it.** F164 Shared community knowledge base, F189 Consented cross-user usage aggregation.

**Commonly needed with.** F147 Sensitive data detection (together in 34 use cases, 37% of this feature's); F145 Agent identity disclosure (together in 28 use cases, 31% of this feature's).

### F149 Data egress control and flow ledger

**Definition.** Decide per field and per destination what may leave the device, honor never-send marks in every tool, and record and show which data went to which outside service.

**Includes.** Per-destination rules; data-flow ledger per session.

**Why use cases need it.** Steps that decide what may leave the device per field and destination and record every outside call with its fields and destination.

**Reach.** Essential to 12 use cases and helpful to 38; used in 11 of 18 categories, most in Safety, privacy and misuse (13), Care, community and humanitarian work (9), Science, health and scholarship (8).

**Essential to (12).**

- 4.4 Geocode places
- 6.9 Kids' carpool and activity network
- 8.27 Paid human verification of uncertain edges
- 9.4 Novelty check for an idea
- 17.2 Safety map for survivors of domestic abuse or stalking
- 17.3 Operational-security mode for activists and journalists under repressive governments
- 17.9 Untrusted file safety check
- 17.19 Data-flow disclosure: what left this machine
- 17.32 Regulated-data check before loading
- 18.7 Indigenous knowledge graph under community data sovereignty
- 18.11 Recruitment-agency and job-offer check for migrant workers
- 18.17 By-name list and outreach network for people experiencing homelessness

**Helpful to.** 38 use cases, for example 1.5 Pull a graph from a database, warehouse or graph store in plain language; 3.17 Translate and transliterate labels; 5.1 Your own accounts as graphs.

**Other features build on it.** F81 External tools and connectors, F150 Local-only processing.

**Commonly needed with.** F150 Local-only processing (together in 29 use cases, 58% of this feature's); F180 On-device model and tool execution (together in 29 use cases, 58% of this feature's); F167 Model routing and diversity (together in 30 use cases, 60% of this feature's); F161 Per-item access policy (together in 16 use cases, 32% of this feature's); F147 Sensitive data detection (together in 20 use cases, 40% of this feature's); F35 Entity resolution (together in 20 use cases, 40% of this feature's).

### F150 Local-only processing

**Definition.** A privacy mode that runs chosen tasks entirely on the user's device or private environment (using F180) so raw data never leaves it.

**Includes.** On-device model; no outside calls in this mode.

**Why use cases need it.** Steps that keep confidential, unpublished or dangerous data on the user's device or private environment.

**Reach.** Essential to 32 use cases and helpful to 17; used in 13 of 18 categories, most in Your own life as a graph (8), Science, health and scholarship (8), Safety, privacy and misuse (8).

**Essential to (32 in total; 10 representative, spread across categories).**

- 2.2 Document pile to sourced entity graph
- 5.11 Photo co-occurrence graph
- 7.17 Curiosity companion that watches you explore
- 8.14 Cascading failure and systemic risk
- 9.6 Pathway diff between conditions
- 10.13 Regulation-to-controls gap map
- 11.5 Power grid contingency analysis
- 13.13 Offline and low-bandwidth graphty for intermittent connectivity
- 16.7 Class friendship map (with care)
- 17.2 Safety map for survivors of domestic abuse or stalking

**Helpful to.** 17 use cases, for example 5.1 Your own accounts as graphs; 6.17 Travel history globe; 9.13 Survey-based social network study.

**Depends on.** F180 On-device model and tool execution (local-only needs the model on the device); F149 Data egress control and flow ledger (egress control enforces it).

**Commonly needed with.** F180 On-device model and tool execution (together in 49 use cases, 100% of this feature's); F167 Model routing and diversity (together in 49 use cases, 100% of this feature's); F149 Data egress control and flow ledger (together in 29 use cases, 59% of this feature's); F147 Sensitive data detection (together in 22 use cases, 45% of this feature's); F61 Read user files (together in 32 use cases, 65% of this feature's); F157 Safe file inspection (together in 32 use cases, 65% of this feature's).

### F151 Retention and deletion

**Definition.** Let the user see, set end dates for and delete what the agent stored (recordings, transcripts, memory, derived graphs, exports, caches, logs), find every place a value or person appears, and erase, pseudonymize or delete it everywhere with a receipt.

**Includes.** Retention schedules; data inventory search; provable deletion.

**Why use cases need it.** Steps that delete transcripts, recordings, derived graphs and memory on schedule or on request, everywhere, with a receipt.

**Reach.** Essential to 17 use cases and helpful to 21; used in 10 of 18 categories, most in Automation, integration, extension and teamwork (7), Safety, privacy and misuse (7), Turning documents, media and conversation into graphs (6).

**Essential to (17).**

- 2.2 Document pile to sourced entity graph
- 2.9 Interview mode graph building
- 2.11 Meeting transcript graphs
- 2.12 The conversation itself as a graph
- 2.15 Field data collection
- 2.18 Voice interviews to collect network survey data at scale
- 5.17 Lifelong personal graph walked in VR
- 5.20 Live conversation whisperer from your relationship graph
- 5.22 Polycule map and shared calendar
- 6.7 Digital footprint and account recovery audit
- 11.24 Co-presence network from proximity sensors
- 13.19 Biometric-adaptive immersive sessions
- 15.23 Federated community graph from members' own agents
- 16.7 Class friendship map (with care)
- 17.10 Remove one person from everything: erasure requests
- 17.31 Retention timer and auto-expiry for sensitive projects
- 18.9 Relapse-prevention map for people in recovery

**Helpful to.** 21 use cases, for example 5.1 Your own accounts as graphs; 6.4 Estate and after-I'm-gone map; 11.12 Organizational network analysis.

**Other features build on it.** F22 Cross-session user memory, F153 Ephemeral sessions.

**Commonly needed with.** F155 Consent management (together in 21 use cases, 55% of this feature's); F148 Redaction and de-identification (together in 18 use cases, 47% of this feature's); F180 On-device model and tool execution (together in 13 use cases, 34% of this feature's); F167 Model routing and diversity (together in 15 use cases, 39% of this feature's); F99 Approval gate (together in 25 use cases, 66% of this feature's); F150 Local-only processing (together in 12 use cases, 32% of this feature's).

### F152 Encrypted storage

**Definition.** Keep stored graphs, memory and files encrypted at rest under the user's control.

**Includes.** User-held keys.

**Why use cases need it.** Steps that keep stored graphs and memory encrypted under the user's key.

**Reach.** Essential to 2 use cases and helpful to 13; used in 4 of 18 categories, most in Your own life as a graph (6), Everyday life: money, home, health, travel and hobbies (6), Turning documents, media and conversation into graphs (2).

**Essential to (2).**

- 5.17 Lifelong personal graph walked in VR
- 17.3 Operational-security mode for activists and journalists under repressive governments

**Helpful to.** 13 use cases, for example 2.2 Document pile to sourced entity graph; 5.6 Gift and favor ledger; 6.1 Purchase graph and forgotten subscriptions.

**Other features build on it.** F185 Coercion safety and app lock.

**Commonly needed with.** F151 Retention and deletion (together in 8 use cases, 53% of this feature's); F147 Sensitive data detection (together in 11 use cases, 73% of this feature's); F62 Format detection and parsing (together in 8 use cases, 53% of this feature's); F07 Time and date awareness (together in 8 use cases, 53% of this feature's); F22 Cross-session user memory (together in 10 use cases, 67% of this feature's); F115 Element provenance (together in 14 use cases, 93% of this feature's).

### F153 Ephemeral sessions

**Definition.** Run a session under a persistence policy that stores nothing and leaves no trace on the device or in the agent's memory and logs.

**Includes.** No-trace mode. Protection against a hostile person at the screen is F185.

**Why use cases need it.** Steps that start a session leaving no trace and avoid storing inferred attributes.

**Reach.** Essential to 3 use cases and helpful to 1; used in 2 of 18 categories, most in Safety, privacy and misuse (3), Care, community and humanitarian work (1).

**Essential to (3).**

- 17.2 Safety map for survivors of domestic abuse or stalking
- 17.12 What can be inferred about me from my friends
- 17.15 Security culture check for an activist or newsroom group

**Helpful to.** 1 use cases, for example 18.9 Relapse-prevention map for people in recovery.

**Depends on.** F151 Retention and deletion (it is a persistence policy).

**Other features build on it.** F185 Coercion safety and app lock.

**Commonly needed with.** No feature stands out: none shares at least 8 use cases and 30% of this feature's use cases while appearing with it at least 1.5 times as often as chance.

### F154 Re-identification risk estimation

**Definition.** Estimate what can be inferred or re-identified from data or an output and how a change (generalizing, suppressing, aggregating) reduces the risk.

**Includes.** Re-identification estimates; inference risk; before/after risk of a redaction.

**Why use cases need it.** Steps that estimate what an outsider could infer or re-identify from a graph or output, and how much a redaction helps.

**Reach.** Essential to 6 use cases and helpful to 2; used in 3 of 18 categories, most in Safety, privacy and misuse (6), Enriching, joining and tracking where data came from (1), Automation, integration, extension and teamwork (1).

**Essential to (6).**

- 4.12 Privacy scrub and policy guardrail before sharing
- 15.22 Negotiated data clean room between two organizations' agents
- 17.11 Consent ledger for people in a graph
- 17.12 What can be inferred about me from my friends
- 17.16 Source protection check before publishing
- 17.23 Structural re-identification test before releasing an anonymized graph

**Helpful to.** 2 use cases, for example 17.3 Operational-security mode for activists and journalists under repressive governments.

**Other features build on it.** F183 Synthetic data with stated guarantees.

**Commonly needed with.** No feature stands out: none shares at least 8 use cases and 30% of this feature's use cases while appearing with it at least 1.5 times as often as chance.

### F155 Consent management

**Definition.** Present consent requests, record who consented to what and for how long, apply it to processing and outputs, honor withdrawal, and refuse to proceed without required consent.

**Includes.** Consent scripts; consent records; withdrawal handling.

**Why use cases need it.** Steps that ask for and record consent (participants, recording, cloned voices, employee graphs), apply it to every output and honor withdrawal.

**Reach.** Essential to 38 use cases and helpful to 24; used in 16 of 18 categories, most in Automation, integration, extension and teamwork (9), Turning documents, media and conversation into graphs (6), Operations, infrastructure, software and organizations (6).

**Essential to (38 in total; 10 representative, spread across categories).**

- 5.21 Donate my graph to research
- 6.4 Estate and after-I'm-gone map
- 8.15 Intervention planner: where to add one edge
- 9.13 Survey-based social network study
- 11.12 Organizational network analysis
- 12.12 Narrated guided tour and flythrough video
- 13.22 Live tangible tabletop: move physical tokens and the graph follows
- 15.23 Federated community graph from members' own agents
- 17.1 Is this a scam? Contact map for an older relative
- 18.1 Who-is-this memory companion for someone with memory loss

**Helpful to.** 24 use cases, for example 2.7 Whiteboard, sticky-note or photo to graph; 5.22 Polycule map and shared calendar; 8.27 Paid human verification of uncertain edges.

**Other features build on it.** F131 Device capture, F172 Outreach and response collection, F173 User state inference, F189 Consented cross-user usage aggregation.

**Commonly needed with.** F151 Retention and deletion (together in 21 use cases, 34% of this feature's); F99 Approval gate (together in 41 use cases, 66% of this feature's); F148 Redaction and de-identification (together in 27 use cases, 44% of this feature's); F102 Stop and interrupt (together in 32 use cases, 52% of this feature's); F95 Triggers (together in 25 use cases, 40% of this feature's); F145 Agent identity disclosure (together in 23 use cases, 37% of this feature's).

### F183 Synthetic data with stated guarantees

**Definition.** Generate synthetic graphs or records that preserve chosen properties of real data under a stated privacy guarantee.

**Includes.** Property-preserving synthesis; stated guarantees; utility checks.

**Why use cases need it.** Steps that replace real data with synthetic data that still reproduces a bug or a pattern before anything is published.

**Reach.** Essential to 2 use cases and helpful to 0; used in 2 of 18 categories, most in Help, support and product quality (1), Safety, privacy and misuse (1).

**Essential to (2).**

- 14.19 Bug report with a minimal reproduction, and support triage
- 17.21 Shareable synthetic twin of a private graph

**Helpful to.** No use case.

**Depends on.** F154 Re-identification risk estimation (the guarantee is measured as re-identification risk).

**Commonly needed with.** No feature stands out: none shares at least 8 use cases and 30% of this feature's use cases while appearing with it at least 1.5 times as often as chance.

### F184 Joint computation across parties

**Definition.** Compute jointly over data held by different parties (organizations, households, hospitals) without any party revealing its data to the others.

**Includes.** Secure joint aggregates and matches; per-party disclosure limits.

**Why use cases need it.** A clean-room step where two organizations compute their overlap without either seeing the other's raw data.

**Reach.** Essential to 1 use cases and helpful to 1; used in 1 of 18 categories, most in Automation, integration, extension and teamwork (2).

**Essential to (1).**

- 15.22 Negotiated data clean room between two organizations' agents

**Helpful to.** 1 use cases, for example 15.23 Federated community graph from members' own agents.

**Commonly needed with.** No feature stands out: none shares at least 8 use cases and 30% of this feature's use cases while appearing with it at least 1.5 times as often as chance.

### F185 Coercion safety and app lock

**Definition.** Protect a user from a hostile person at the screen or holding the device: lock the whole agent, quick exit, decoy screen, a duress unlock that opens the decoy, and instant wipe.

**Includes.** Local app lock; quick exit; decoy; duress unlock; wipe.

**Why use cases need it.** Safety steps for people at risk: a quick-exit control, a decoy graph, a one-command wipe of data, key and memory.

**Reach.** Essential to 3 use cases and helpful to 0; used in 1 of 18 categories, most in Safety, privacy and misuse (3).

**Essential to (3).**

- 17.2 Safety map for survivors of domestic abuse or stalking
- 17.3 Operational-security mode for activists and journalists under repressive governments
- 17.15 Security culture check for an activist or newsroom group

**Helpful to.** No use case.

**Depends on.** F153 Ephemeral sessions (the decoy and wipe build on no-trace sessions); F152 Encrypted storage (locked data stays encrypted).

**Commonly needed with.** No feature stands out: none shares at least 8 use cases and 30% of this feature's use cases while appearing with it at least 1.5 times as often as chance.

### F189 Consented cross-user usage aggregation

**Definition.** Aggregate usage across many users, with opt-in, de-identified at collection time (F148), visible only to product maintainers.

**Includes.** Opt-in collection; de-identification at source; maintainer-only access.

**Why use cases need it.** Product-improvement steps that cluster requests and gaps across many consenting users without identifying them.

**Reach.** Essential to 4 use cases and helpful to 3; used in 3 of 18 categories, most in Help, support and product quality (4), Operations, infrastructure, software and organizations (2), Everyday life: money, home, health, travel and hobbies (1).

**Essential to (4).**

- 14.19 Bug report with a minimal reproduction, and support triage
- 14.21 Community answerer
- 14.22 Missing-tool detector that drafts the fix
- 14.23 Exploratory QA bot

**Helpful to.** 3 use cases, for example 6.29 Radio contact logs and community mesh networks; 11.23 Inside a neural network.

**Depends on.** F148 Redaction and de-identification (de-identification at collection time); F155 Consent management (opt-in).

**Commonly needed with.** No feature stands out: none shares at least 8 use cases and 30% of this feature's use cases while appearing with it at least 1.5 times as often as chance.

## Security

Keeping hostile content, hostile files and secrets from subverting the agent.

### F156 Untrusted content handling

**Definition.** Treat fetched pages, files, loaded data, messages, tool output and other agents' output as data that can never issue instructions or grant authority, and contain anything hostile in it.

**Includes.** Tracking where every tool argument came from and blocking actions traced to untrusted data; quarantining suspicious records for safe inspection.

**Why use cases need it.** Every step that reads fetched pages, files, messages, replies or other agents' output, which must be treated as data and never as instructions.

**Reach.** Essential to 133 use cases and helpful to 50; used in 18 of 18 categories, most in Science, health and scholarship (20), Everyday life: money, home, health, travel and hobbies (18), Safety, privacy and misuse (15).

**Essential to (133 in total; 10 representative, spread across categories).**

- 1.1 Find me a graph about X
- 5.7 Job search warm-intro paths
- 6.8 Phone apps and permissions
- 9.5 Gene list to annotated interaction network
- 10.2 Beneficial ownership and interlocking boards
- 11.1 Multi-tier supplier risk map
- 12.1 Journal-ready figure package
- 15.6 Recipe library and marketplace
- 16.4 Course kit for instructors
- 17.1 Is this a scam? Contact map for an older relative

**Helpful to.** 50 use cases, for example 1.3 Plain-English SPARQL pulls; 3.13 Validate against a schema or standard; 4.6 Snowball expansion from a selection.

**Other features build on it.** F50 Extension authoring and installation, F54 Web search, F55 Web fetch, F56 Browser automation, F61 Read user files, F81 External tools and connectors, F87 Agent-to-agent exchange, F190 Shared recipe and extension marketplace.

**Commonly needed with.** F55 Web fetch (together in 124 use cases, 68% of this feature's); F54 Web search (together in 79 use cases, 43% of this feature's); F116 Grounding and citation (together in 102 use cases, 56% of this feature's).

### F157 Safe file inspection

**Definition.** Inspect a file's structure and cost (decompression bombs, remote references, size) before parsing it, with limits.

**Includes.** Pre-parse checks; resource limits on parsing.

**Why use cases need it.** Steps that open user-supplied or fetched files, which must be checked for size, compression bombs and remote references before parsing.

**Reach.** Essential to 55 use cases and helpful to 123; used in 18 of 18 categories, most in Science, health and scholarship (29), Operations, infrastructure, software and organizations (20), Safety, privacy and misuse (16).

**Essential to (55 in total; 10 representative, spread across categories).**

- 2.11 Meeting transcript graphs
- 5.7 Job search warm-intro paths
- 6.1 Purchase graph and forgotten subscriptions
- 7.4 Multi-step analysis from one prompt
- 9.1 Literature map from seed papers
- 10.13 Regulation-to-controls gap map
- 11.1 Multi-tier supplier risk map
- 12.8 Slide deck from a project
- 16.6 Classroom assignment grader and coach
- 17.9 Untrusted file safety check

**Helpful to.** 123 use cases, for example 1.1 Find me a graph about X; 2.1 PDF or scanned document to graph; 3.1 Schema inference for unknown files.

**Other features build on it.** F57 Large and paged transfers, F61 Read user files.

**Commonly needed with.** F61 Read user files (together in 177 use cases, 99% of this feature's); F33 Data import and schema design (together in 103 use cases, 58% of this feature's).

### F158 Credential vault

**Definition.** Hold the user's secrets, keys and sign-ins and use them with narrow scopes without exposing them to the model, conversation, logs, outputs or shared projects.

**Includes.** Scoped tokens; revocation; secrets never in clear to the agent.

**Why use cases need it.** Steps that connect with the user's keys, subscriptions or sign-ins, which must never appear in the conversation, code or project.

**Reach.** Essential to 22 use cases and helpful to 34; used in 14 of 18 categories, most in Automation, integration, extension and teamwork (13), Enriching, joining and tracking where data came from (6), Everyday life: money, home, health, travel and hobbies (6).

**Essential to (22 in total; 10 representative, spread across categories).**

- 1.5 Pull a graph from a database, warehouse or graph store in plain language
- 3.14 Knowledge-graph consistency and curation
- 6.4 Estate and after-I'm-gone map
- 7.19 Correlation networks from time series
- 8.26 Network-aware field experiment designer and runner
- 9.1 Literature map from seed papers
- 10.4 Privilege attack paths in directories and clouds
- 11.14 CRM relationship map with warm paths
- 15.11 Graph result to action across tools
- 17.3 Operational-security mode for activists and journalists under repressive governments

**Helpful to.** 34 use cases, for example 2.11 Meeting transcript graphs; 3.5 Unit and currency normalization; 4.4 Geocode places.

**Other features build on it.** F81 External tools and connectors, F83 Account connectors and delegated access, F168 External data store connection and query authoring.

**Commonly needed with.** F81 External tools and connectors (together in 43 use cases, 77% of this feature's); F99 Approval gate (together in 45 use cases, 80% of this feature's); F83 Account connectors and delegated access (together in 22 use cases, 39% of this feature's); F95 Triggers (together in 27 use cases, 48% of this feature's); F18 Error recovery and self-repair (together in 27 use cases, 48% of this feature's); F145 Agent identity disclosure (together in 24 use cases, 43% of this feature's).

## Identity, access and collaboration

Who is acting, what they may see and do, and how several people work together.

### F159 Identity and roles

**Definition.** Know who each user or caller is, including on channels without a logged-in screen, and what role and rights they have, including an anonymous-public role with a command allowlist and anonymous proof of group membership, and act within them.

**Includes.** Authentication on phone or chat channels; role-based rights; anonymous-public role; anonymous membership credentials.

**Why use cases need it.** Steps that know who is asking: verifying a caller, role-gated access, an outreach worker's agency, anonymous proof of membership.

**Reach.** Essential to 23 use cases and helpful to 22; used in 12 of 18 categories, most in Automation, integration, extension and teamwork (10), Safety, privacy and misuse (9), Everyday life: money, home, health, travel and hobbies (5).

**Essential to (23 in total; 10 representative, spread across categories).**

- 5.22 Polycule map and shared calendar
- 6.32 Co-parenting handoff map for children in two homes
- 9.8 Patient referral network
- 10.1 Money-flow tracing for anti-money-laundering
- 12.47 Public ask-this-graph widget for a website
- 13.12 Phone-call mode: ask your graph while driving
- 15.8 Graph step in someone else's pipeline
- 17.7 Who can find me? Self-exposure audit
- 17.10 Remove one person from everything: erasure requests
- 18.17 By-name list and outreach network for people experiencing homelessness

**Helpful to.** 22 use cases, for example 1.5 Pull a graph from a database, warehouse or graph store in plain language; 4.9 Provenance on every node and edge; 5.13 Care team map for an aging parent.

**Other features build on it.** F88 Agent as a service, F136 Conversation channel adapters, F161 Per-item access policy, F162 Access-controlled sharing, F164 Shared community knowledge base, F177 Live multi-party conversation.

**Commonly needed with.** F161 Per-item access policy (together in 18 use cases, 40% of this feature's); F119 Action log and audit trail (together in 27 use cases, 60% of this feature's); F160 Authorization verification (together in 16 use cases, 36% of this feature's); F101 Policy and restriction modes (together in 18 use cases, 40% of this feature's); F95 Triggers (together in 16 use cases, 36% of this feature's); F96 User notification policy (together in 14 use cases, 31% of this feature's).

### F160 Authorization verification

**Definition.** Confirm the user is authorized for the work (signed scope, role, ethics approval, lawful basis, or that a person-centric analysis is about the requester or someone they act for with consent) before starting, and block steps whose approval is missing.

**Includes.** Scope documents; ethics review records; lawful-basis checks.

**Why use cases need it.** First steps of investigations and research that confirm a signed scope, ethics approval, lawful basis or that the analysis is about the requester.

**Reach.** Essential to 18 use cases and helpful to 32; used in 13 of 18 categories, most in Safety, privacy and misuse (15), Investigations: finance, fraud, security, law and journalism (9), Science, health and scholarship (7).

**Essential to (18).**

- 2.18 Voice interviews to collect network survey data at scale
- 8.4 Homophily and assortativity checks
- 8.26 Network-aware field experiment designer and runner
- 9.8 Patient referral network
- 9.10 Outbreak contact tracing board
- 9.13 Survey-based social network study
- 9.19 Livestock movement and herd-health tracing
- 9.46 Symptom networks in psychology and psychiatry
- 10.1 Money-flow tracing for anti-money-laundering
- 10.3 Fraud and claim ring detection
- 10.4 Privilege attack paths in directories and clouds
- 10.5 Threat-intel pivoting
- 10.8 Bot and coordinated-behavior detection
- 10.18 Social-engineering exposure of an organization
- 10.20 Trafficking and exploitation signals in ad networks
- 10.21 Co-offending and organized-crime networks from court records
- 10.26 Map of AI agents, tools and the permissions between them
- 16.7 Class friendship map (with care)

**Helpful to.** 32 use cases, for example 1.4 Scrape a site's link structure; 2.19 Screen recording to a map of how work actually flows; 4.15 Ask the people in the graph to confirm it.

**Commonly needed with.** F140 Graduated friction and safe alternatives (together in 26 use cases, 52% of this feature's); F138 Harm and misuse screening (together in 18 use cases, 36% of this feature's); F119 Action log and audit trail (together in 29 use cases, 58% of this feature's); F159 Identity and roles (together in 16 use cases, 32% of this feature's); F161 Per-item access policy (together in 16 use cases, 32% of this feature's); F101 Policy and restriction modes (together in 18 use cases, 36% of this feature's).

### F161 Per-item access policy

**Definition.** Enforce who may see each node, field, result or export in every view and agent answer, and let each contributor control, withdraw or hide their own part of a shared graph.

**Includes.** Item-level visibility; sensitivity marks on outputs; contributor control.

**Why use cases need it.** Steps that restrict who sees which node, field or result, let contributors control their own part, and mark outputs as restricted.

**Reach.** Essential to 37 use cases and helpful to 9; used in 11 of 18 categories, most in Care, community and humanitarian work (13), Investigations: finance, fraud, security, law and journalism (10), Science, health and scholarship (6).

**Essential to (37 in total; 10 representative, spread across categories).**

- 5.22 Polycule map and shared calendar
- 9.8 Patient referral network
- 10.1 Money-flow tracing for anti-money-laundering
- 10.3 Fraud and claim ring detection
- 11.32 Water distribution and sewer networks
- 15.23 Federated community graph from members' own agents
- 16.6 Classroom assignment grader and coach
- 17.3 Operational-security mode for activists and journalists under repressive governments
- 18.4 Ecomaps and genograms for social workers and family therapists
- 18.5 Tenant organizing and landlord portfolio map

**Helpful to.** 9 use cases, for example 2.11 Meeting transcript graphs; 6.32 Co-parenting handoff map for children in two homes; 8.12 Resilience: what breaks if we lose this?.

**Depends on.** F159 Identity and roles (visibility depends on who is asking).

**Other features build on it.** F162 Access-controlled sharing.

**Commonly needed with.** F159 Identity and roles (together in 18 use cases, 39% of this feature's); F149 Data egress control and flow ledger (together in 16 use cases, 35% of this feature's); F160 Authorization verification (together in 16 use cases, 35% of this feature's); F53 Geospatial handling (together in 19 use cases, 41% of this feature's); F150 Local-only processing (together in 14 use cases, 30% of this feature's); F61 Read user files (together in 26 use cases, 57% of this feature's).

### F162 Access-controlled sharing

**Definition.** Share a project, view or output with chosen people at chosen permission levels and expiry, and warn before sharing sensitive analyses outside the user's circle. Per-copy marking is F186.

**Includes.** Shareable links; per-person rights and expiry.

**Why use cases need it.** Steps that share a project or view with chosen people and rights, and warn before sharing sensitive analyses.

**Reach.** Essential to 7 use cases and helpful to 29; used in 11 of 18 categories, most in Everyday life: money, home, health, travel and hobbies (7), Automation, integration, extension and teamwork (6), Learning, play and creative work (5).

**Essential to (7).**

- 5.13 Care team map for an aging parent
- 5.22 Polycule map and shared calendar
- 8.12 Resilience: what breaks if we lose this?
- 8.14 Cascading failure and systemic risk
- 14.21 Community answerer
- 15.16 Review request with guided walkthrough
- 17.22 Per-recipient watermarked copies to trace a leak

**Helpful to.** 29 use cases, for example 4.12 Privacy scrub and policy guardrail before sharing; 5.5 Group chat dynamics; 6.3 Shared expenses settle-up.

**Depends on.** F159 Identity and roles (sharing needs identities); F161 Per-item access policy (shared items keep their visibility rules).

**Other features build on it.** F186 Per-copy fingerprinting and leak attribution.

**Commonly needed with.** F147 Sensitive data detection (together in 16 use cases, 44% of this feature's); F53 Geospatial handling (together in 12 use cases, 33% of this feature's); F18 Error recovery and self-repair (together in 13 use cases, 36% of this feature's); F148 Redaction and de-identification (together in 11 use cases, 31% of this feature's).

### F163 Concurrent shared editing

**Definition.** Several people work on one project at different times or devices: edits merged without conflict, comments on views, nodes and steps, and attribution of who did what. Live multi-person conversation is F177.

**Includes.** Conflict-free merging; comments; attribution.

**Why use cases need it.** Steps where several people contribute over time: each parent joins with their own identity, sign-off from every contributor, comments at each stop.

**Reach.** Essential to 17 use cases and helpful to 8; used in 11 of 18 categories, most in Care, community and humanitarian work (6), Everyday life: money, home, health, travel and hobbies (5), Automation, integration, extension and teamwork (3).

**Essential to (17).**

- 3.18 Standing graph steward and dataset curator
- 5.13 Care team map for an aging parent
- 5.22 Polycule map and shared calendar
- 6.3 Shared expenses settle-up
- 6.10 Household chore fairness
- 6.27 Informal savings groups and family remittance webs
- 6.32 Co-parenting handoff map for children in two homes
- 9.2 Literature and citation watch
- 10.13 Regulation-to-controls gap map
- 13.15 Sign language and caption-first collaboration for deaf users
- 15.15 Disagreement resolver for two versions of a graph
- 15.16 Review request with guided walkthrough
- 15.38 Contribution credit statements and payout splits
- 16.14 Graph detective: generated murder mystery
- 17.4 Teen and parent follower-safety review
- 18.1 Who-is-this memory companion for someone with memory loss
- 18.7 Indigenous knowledge graph under community data sovereignty

**Helpful to.** 8 use cases, for example 3.14 Knowledge-graph consistency and curation; 4.9 Provenance on every node and edge; 6.22 Reading graph and what next.

**Commonly needed with.** F159 Identity and roles (together in 8 use cases, 32% of this feature's); F96 User notification policy (together in 11 use cases, 44% of this feature's); F106 Hand-off to a person (together in 8 use cases, 32% of this feature's); F95 Triggers (together in 10 use cases, 40% of this feature's); F145 Agent identity disclosure (together in 9 use cases, 36% of this feature's); F53 Geospatial handling (together in 8 use cases, 32% of this feature's).

### F164 Shared community knowledge base

**Definition.** Read and contribute to a dataset shared with other users under anonymity and anti-abuse rules, without revealing the contributor's identity.

**Includes.** Anonymous contribution and query; abuse controls.

**Why use cases need it.** A peer network that shares a dataset while keeping each contributor anonymous.

**Reach.** Essential to 1 use cases and helpful to 2; used in 2 of 18 categories, most in Care, community and humanitarian work (2), Safety, privacy and misuse (1).

**Essential to (1).**

- 17.20 Peer safety alert network for at-risk workers

**Helpful to.** 2 use cases, for example 18.11 Recruitment-agency and job-offer check for migrant workers.

**Depends on.** F159 Identity and roles (anonymous credentials); F148 Redaction and de-identification (contributions are de-identified).

**Commonly needed with.** No feature stands out: none shares at least 8 use cases and 30% of this feature's use cases while appearing with it at least 1.5 times as often as chance.

### F177 Live multi-party conversation

**Definition.** Run one live conversation or room with several people present (workshop, classroom, family, a helper and a client): know who is speaking or pointing, take turns, ask the right person, keep a view per person, and allow private asides.

**Includes.** Speaker attribution; turn-taking; per-person views; private asides within a shared session.

**Why use cases need it.** Workshops, classrooms, families and helper-client sessions where several people speak and point in one live session.

**Reach.** Essential to 16 use cases and helpful to 0; used in 9 of 18 categories, most in Learning, play and creative work (5), Accessibility, voice and immersive interaction (3), Safety, privacy and misuse (2).

**Essential to (16).**

- 5.8 Wedding or party seating planner
- 6.9 Kids' carpool and activity network
- 9.39 Microbiome and soil co-occurrence networks
- 11.26 Creator collaboration and audience-overlap finder
- 13.9 Tabletop AR war room
- 13.15 Sign language and caption-first collaboration for deaf users
- 13.22 Live tangible tabletop: move physical tokens and the graph follows
- 15.17 Live co-exploration with a facilitator agent
- 16.6 Classroom assignment grader and coach
- 16.8 Kids build the food web
- 16.12 Six degrees of anything
- 16.16 Graph escape room in VR
- 16.17 Graph telephone party game
- 17.1 Is this a scam? Contact map for an older relative
- 17.4 Teen and parent follower-safety review
- 18.1 Who-is-this memory companion for someone with memory loss

**Helpful to.** No use case.

**Depends on.** F159 Identity and roles (each participant is identified); F129 Voice conversation (live rooms are usually spoken).

**Commonly needed with.** F129 Voice conversation (together in 9 use cases, 56% of this feature's); F102 Stop and interrupt (together in 10 use cases, 62% of this feature's).

### F186 Per-copy fingerprinting and leak attribution

**Definition.** Embed imperceptible marks in each shared copy that survive edits, and later detect which copy leaked, reporting a confidence and resisting forged marks.

**Includes.** Per-recipient marks; detection with confidence; forgery resistance.

**Why use cases need it.** A leak-attribution step that makes one imperceptibly different copy per recipient.

**Reach.** Essential to 1 use cases and helpful to 2; used in 2 of 18 categories, most in Safety, privacy and misuse (2), Investigations: finance, fraud, security, law and journalism (1).

**Essential to (1).**

- 17.22 Per-recipient watermarked copies to trace a leak

**Helpful to.** 2 use cases, for example 10.2 Beneficial ownership and interlocking boards; 17.25 Leak hunt: unmasking a whistleblower from communications graphs.

**Depends on.** F162 Access-controlled sharing (marks are applied when sharing).

**Commonly needed with.** No feature stands out: none shares at least 8 use cases and 30% of this feature's use cases while appearing with it at least 1.5 times as often as chance.

### F190 Shared recipe and extension marketplace

**Definition.** Share recipes (F20) and extensions (F50) with other people, with vetting status, ratings and abuse reports, treating installed procedures as untrusted until vetted (F156).

**Includes.** Publishing and installing shared procedures; vetting status; ratings; abuse reports.

**Why use cases need it.** Automation steps that publish or install recipes and extensions shared by others, with vetting.

**Reach.** Essential to 2 use cases and helpful to 0; used in 1 of 18 categories, most in Automation, integration, extension and teamwork (2).

**Essential to (2).**

- 15.5 Record a session as a reusable recipe
- 15.6 Recipe library and marketplace

**Helpful to.** No use case.

**Depends on.** F20 Reusable recipes (recipes to share); F50 Extension authoring and installation (extensions to share); F156 Untrusted content handling (shared procedures are untrusted until vetted).

**Commonly needed with.** No feature stands out: none shares at least 8 use cases and 30% of this feature's use cases while appearing with it at least 1.5 times as often as chance.

## Cost and performance

Knowing what work will cost and keeping it within limits.

### F165 Pre-flight cost estimation

**Definition.** Predict the runtime, memory, money, request count and download size of an action on this data before running it.

**Includes.** Estimates shown in proposals and approvals.

**Why use cases need it.** Steps that estimate rows, time, money or download size before a grid, a crawl, a print order or a long job, and ask approval when large.

**Reach.** Essential to 11 use cases and helpful to 22; used in 11 of 18 categories, most in Rigor, simulation and what-if (8), Asking the graph questions: guided analysis and explanation (6), Science, health and scholarship (6).

**Essential to (11).**

- 1.3 Plain-English SPARQL pulls
- 1.5 Pull a graph from a database, warehouse or graph store in plain language
- 7.5 Algorithm advisor and pre-flight check
- 8.2 Parameter sweep and sensitivity report
- 8.3 Null-model significance testing
- 8.19 LLM-persona agent-based simulation
- 13.4 Tactile graphics and 3D-printed sculptures
- 13.13 Offline and low-bandwidth graphty for intermittent connectivity
- 14.15 Cost estimate before a heavy run
- 15.7 Batch run over many files
- 15.24 Burst to rented compute for a graph too big for the laptop

**Helpful to.** 22 use cases, for example 1.1 Find me a graph about X; 2.4 Community summaries of a corpus; 3.2 Bipartite to one-mode projection.

**Other features build on it.** F75 Scaled compute jobs, F166 Budgets and limits, F168 External data store connection and query authoring.

**Commonly needed with.** F70 Chart and figure generation (together in 12 use cases, 36% of this feature's); F122 Live work visibility (together in 26 use cases, 79% of this feature's); F166 Budgets and limits (together in 28 use cases, 85% of this feature's); F75 Scaled compute jobs (together in 13 use cases, 39% of this feature's); F118 Run records and show your work (together in 20 use cases, 61% of this feature's); F93 Durable jobs (together in 19 use cases, 58% of this feature's).

### F166 Budgets and limits

**Definition.** Enforce caps on money, compute, model calls, time, request counts, graph growth and download size, and stop cleanly, sample or ask when a limit is near.

**Includes.** Per-task and per-user budgets; clean stop at the limit.

**Why use cases need it.** Steps that cap hops, nodes, spending, model calls, time or download size and stop cleanly or sample when the cap is near.

**Reach.** Essential to 25 use cases and helpful to 145; used in 18 of 18 categories, most in Science, health and scholarship (22), Rigor, simulation and what-if (21), Everyday life: money, home, health, travel and hobbies (17).

**Essential to (25 in total; 10 representative, spread across categories).**

- 1.1 Find me a graph about X
- 2.14 Research team of sub-agents building a knowledge graph
- 4.5 Enrich companies and organizations
- 8.2 Parameter sweep and sensitivity report
- 8.9 Two agents debate over a graph
- 13.4 Tactile graphics and 3D-printed sculptures
- 14.13 Performance tuner
- 15.8 Graph step in someone else's pipeline
- 16.12 Six degrees of anything
- 17.9 Untrusted file safety check

**Helpful to.** 145 use cases, for example 1.3 Plain-English SPARQL pulls; 2.1 PDF or scanned document to graph; 3.5 Unit and currency normalization.

**Depends on.** F165 Pre-flight cost estimation (a budget needs an estimate to check against).

**Other features build on it.** F16 Sub-agents, F75 Scaled compute jobs, F77 Batch model pipelines, F88 Agent as a service, F181 Agent-based simulation.

**Commonly needed with.** F122 Live work visibility (together in 112 use cases, 66% of this feature's); F16 Sub-agents (together in 73 use cases, 43% of this feature's); F93 Durable jobs (together in 63 use cases, 37% of this feature's).

## Features nearly every use case needs

These features are used, as essential or helpful, by at least 40% of the 507 use cases. They are the floor of the harness: a task of almost any kind touches them.

| Feature                                  | Essential | Helpful | Share of all use cases |
| ---------------------------------------- | --------: | ------: | ---------------------: |
| F01 Multi-turn task conversation         |        81 |     311 |                    77% |
| F100 Action proposal and dry-run preview |        90 |     245 |                    66% |
| F107 Result verification                 |       134 |     184 |                    63% |
| F47 Undo and rollback                    |        13 |     293 |                    60% |
| F115 Element provenance                  |        52 |     247 |                    59% |
| F42 Capability and catalog introspection |        11 |     269 |                    55% |
| F32 Graph editing                        |       256 |      17 |                    54% |
| F108 Uncertainty reporting               |        91 |     179 |                    53% |
| F36 Algorithm and layout execution       |       249 |      19 |                    53% |
| F68 Document generation                  |        79 |     187 |                    52% |
| F10 Structured questions                 |        17 |     220 |                    47% |
| F09 Clarifying questions                 |        76 |     158 |                    46% |
| F74 Sandboxed code execution             |       181 |      42 |                    44% |
| F112 Schema enforcement                  |        13 |     196 |                    41% |
| F99 Approval gate                        |       106 |     102 |                    41% |

Two groups stand out. The graph tools (F31 query, F32 editing, F33 import and schema, F36 algorithms and layouts, F37 style layers, F74 sandboxed code) are essential far more often than helpful: when a use case touches the graph it cannot do without them. The conversation and control features (F01 multi-turn conversation, F10 structured questions, F47 undo, F42 capability introspection, F112 schema enforcement, F100 previews) are mostly helpful: almost every use case is better with them, but few fail outright without them. F107 Result verification and F108 Uncertainty reporting sit between the two: F107 is essential to about a quarter of all use cases and F108 to almost a fifth, and both are helpful to most of the rest.

Features that are essential to at least 100 use cases:

- F32 Graph editing: essential to 256 (50%)
- F36 Algorithm and layout execution: essential to 249 (49%)
- F33 Data import and schema design: essential to 187 (37%)
- F74 Sandboxed code execution: essential to 181 (36%)
- F37 Style layers and annotation: essential to 170 (34%)
- F31 Graph data query: essential to 166 (33%)
- F61 Read user files: essential to 164 (32%)
- F81 External tools and connectors: essential to 134 (26%)
- F107 Result verification: essential to 134 (26%)
- F156 Untrusted content handling: essential to 133 (26%)
- F99 Approval gate: essential to 106 (21%)
- F38 View and camera control: essential to 105 (21%)
- F102 Stop and interrupt: essential to 104 (21%)
- F55 Web fetch: essential to 100 (20%)

## Features only a few use cases need but that unlock whole categories

These features are essential to relatively few use cases overall, but those use cases cluster in one category, so the category is largely out of reach without them.

| Feature                                                       | Essential overall | Category it unlocks                                          | Essential in that category |
| ------------------------------------------------------------- | ----------------: | ------------------------------------------------------------ | -------------------------: |
| F170 Entity and relation extraction from unstructured content |                22 | Turning documents, media and conversation into graphs        |                   12 of 19 |
| F77 Batch model pipelines                                     |                 6 | Turning documents, media and conversation into graphs        |                    6 of 19 |
| F70 Chart and figure generation                               |                20 | Rigor, simulation and what-if                                |                   13 of 29 |
| F75 Scaled compute jobs                                       |                23 | Rigor, simulation and what-if                                |                   10 of 29 |
| F140 Graduated friction and safe alternatives                 |                23 | Safety, privacy and misuse                                   |                   14 of 35 |
| F188 Game and lesson session engine                           |                11 | Learning, play and creative work                             |                   10 of 34 |
| F29 Product knowledge pack                                    |                11 | Help, support and product quality                            |                    9 of 27 |
| F130 Multimodal input and pointing                            |                11 | Accessibility, voice and immersive interaction               |                    8 of 22 |
| F174 Output physical-safety checks                            |                 7 | Accessibility, voice and immersive interaction               |                    5 of 22 |
| F160 Authorization verification                               |                18 | Investigations: finance, fraud, security, law and journalism |                    9 of 27 |
| F171 Constraint solving and optimization                      |                15 | Everyday life: money, home, health, travel and hobbies       |                    9 of 34 |
| F127 Multilingual and translation                             |                16 | Care, community and humanitarian work                        |                    5 of 17 |
| F57 Large and paged transfers                                 |                 3 | Finding and fetching data                                    |                     3 of 7 |
| F185 Coercion safety and app lock                             |                 3 | Safety, privacy and misuse                                   |                    3 of 35 |
| F87 Agent-to-agent exchange                                   |                 7 | Automation, integration, extension and teamwork              |                    5 of 39 |

- **F170 Entity and relation extraction from unstructured content** (Turning documents, media and conversation into graphs). Reading text, transcripts and images into typed, sourced nodes and edges is the core of the category; without it the agent can only load data that is already structured.
- **F77 Batch model pipelines** (Turning documents, media and conversation into graphs). Every essential use is in this category: mapping a model over each page, transcript or frame is what makes a pile of material tractable.
- **F70 Chart and figure generation** (Rigor, simulation and what-if). Robustness, sensitivity and simulation results are curves, bands and tables; the graph canvas alone cannot show them.
- **F75 Scaled compute jobs** (Rigor, simulation and what-if). Resampling, rewiring and parameter grids need many runs; it is also essential to 9 use cases in Science, health and scholarship.
- **F140 Graduated friction and safe alternatives** (Safety, privacy and misuse). Most of the misuse category is answered with proportionate friction and a safer alternative rather than a flat refusal.
- **F188 Game and lesson session engine** (Learning, play and creative work). Turns, scores, hidden answers and mastery tracking are what make a lesson or game more than a conversation; F08 Hidden state keeping is essential to 11 use cases in the same category.
- **F29 Product knowledge pack** (Help, support and product quality). Answers about the product must come from the help and reference for the version actually running; F178 App and view state reading is essential to another 9 use cases in the category.
- **F130 Multimodal input and pointing** (Accessibility, voice and immersive interaction). Pointing, gaze, switches and controller rays fused with speech are how many of these users give commands at all; F133 Non-visual output channels and F179 Non-visual data encodings are essential only here.
- **F174 Output physical-safety checks** (Accessibility, voice and immersive interaction). Flash, motion-sickness and play-space checks are what make immersive and animated output safe for the people this category serves.
- **F160 Authorization verification** (Investigations: finance, fraud, security, law and journalism). Investigations start by confirming scope, role and lawful basis; without it the agent cannot responsibly begin.
- **F171 Constraint solving and optimization** (Everyday life: money, home, health, travel and hobbies). Seating plans, carpools, rotas and itineraries are constraint problems; prose and graph algorithms do not solve them.
- **F127 Multilingual and translation** (Care, community and humanitarian work). Much of this category works with people in their own language, often over basic phones; F136 Conversation channel adapters carries those conversations.
- **F57 Large and paged transfers** (Finding and fetching data). Three of the seven fetching use cases need resumable, size-capped downloads and paged results; F58 Rate limiting and politeness is essential to three as well.
- **F185 Coercion safety and app lock** (Safety, privacy and misuse). For survivors and people under coercion, a quick exit, decoy and wipe decide whether the product is safe to use at all; F153 Ephemeral sessions is likewise essential only here.
- **F87 Agent-to-agent exchange** (Automation, integration, extension and teamwork). Exchanges with other people's and organizations' agents open negotiation, scheduling and clean-room use cases; F88 Agent as a service and F190 Shared recipe and extension marketplace are essential almost only here.

## Use cases that need unusual combinations

These use cases pair features that rarely appear together anywhere else, often from families far apart. They are the hardest tests of whether the harness's features compose.

### 2.18 Voice interviews to collect network survey data at scale

A researcher or health worker studying who trusts whom gets a network built from short phone interviews in each respondent's language.

Combines a scripted interview, outbound phone calls, several languages, low-latency voice, consent, crisis referral and response collection. It ties for the most essential features of any use case (26), drawn from 13 of the 21 families.

Essential features (26, from 13 families): F01 Multi-turn task conversation, F10 Structured questions, F12 Scripted step-by-step sessions, F23 Project memory, F31 Graph data query, F33 Data import and schema design, F35 Entity resolution, F86 Outbound messaging, F93 Durable jobs, F95 Triggers, F99 Approval gate, F100 Action proposal and dry-run preview, F102 Stop and interrupt, F106 Hand-off to a person, F119 Action log and audit trail, F127 Multilingual and translation, F128 Low-latency streaming responses, F129 Voice conversation, F136 Conversation channel adapters, F143 Crisis detection and referral, F145 Agent identity disclosure, F147 Sensitive data detection, F151 Retention and deletion, F155 Consent management, F160 Authorization verification, F172 Outreach and response collection.

### 13.19 Biometric-adaptive immersive sessions

A long VR session slows, simplifies or pauses when headset eye tracking and heart rate suggest overload or nausea.

Combines biometric sensor input, user state inference, physical-safety checks on motion and on-device processing of health signals, all inside a live VR session that must react within its latency budget.

Essential features (15, from 10 families): F38 View and camera control, F42 Capability and catalog introspection, F93 Durable jobs, F102 Stop and interrupt, F103 User-tunable agent behavior, F108 Uncertainty reporting, F128 Low-latency streaming responses, F130 Multimodal input and pointing, F147 Sensitive data detection, F150 Local-only processing, F151 Retention and deletion, F155 Consent management, F173 User state inference, F174 Output physical-safety checks, F180 On-device model and tool execution.

### 17.2 Safety map for survivors of domestic abuse or stalking

A survivor and advocate see the shared accounts, family plans, location sharing, smart devices and recovery paths an abuser can reach, ordered into a staged separation plan that avoids tipping them off.

Combines a guided interview and a staged plan with ephemeral sessions, an app lock with quick exit and decoy, local-only processing and a hand-off to a human advocate. Few other use cases need coercion safety at all.

Essential features (13, from 8 families): F01 Multi-turn task conversation, F12 Scripted step-by-step sessions, F14 Planning, F32 Graph editing, F36 Algorithm and layout execution, F101 Policy and restriction modes, F106 Hand-off to a person, F143 Crisis detection and referral, F149 Data egress control and flow ledger, F150 Local-only processing, F153 Ephemeral sessions, F180 On-device model and tool execution, F185 Coercion safety and app lock.

### 13.4 Tactile graphics and 3D-printed sculptures

A blind student or science center gets an embosser-ready graphic with braille labels, or a 3D-printable sculpture of the layout on a titled base, sent to an embosser or print service.

Goes from a graph layout to physical objects: non-visual data encodings, generative 3D and tactile output, cost estimation, and sending to an embosser or print service after approval.

Essential features (15, from 8 families): F10 Structured questions, F31 Graph data query, F32 Graph editing, F36 Algorithm and layout execution, F67 Write files and exports, F68 Document generation, F81 External tools and connectors, F90 Physical devices and local network, F99 Approval gate, F107 Result verification, F133 Non-visual output channels, F165 Pre-flight cost estimation, F166 Budgets and limits, F179 Non-visual data encodings, F182 Generative media.

### 15.22 Negotiated data clean room between two organizations' agents

Two banks, hospitals or merging firms learn about the overlap of their private graphs without either seeing the other's.

Two organizations' agents negotiate, then compute jointly over private graphs without revealing them, with re-identification risk estimation and a human hand-off. It is the only use case that needs joint computation across parties as essential.

Essential features (10, from 7 families): F01 Multi-turn task conversation, F37 Style layers and annotation, F87 Agent-to-agent exchange, F99 Approval gate, F106 Hand-off to a person, F119 Action log and audit trail, F148 Redaction and de-identification, F154 Re-identification risk estimation, F156 Untrusted content handling, F184 Joint computation across parties.

### 14.27 Scheduled self-exam of the agent's graph answers

The graphty team gets a standing exam of questions with known answers on reference graphs, rerun whenever the model, graphty or a plugin changes, with one issue filed per regression.

The agent tests itself: hidden answer keys, headless app copies, an evaluation harness, triggers on every model or plugin change, and filing one issue per regression after approval.

Essential features (13, from 8 families): F08 Hidden state keeping, F16 Sub-agents, F79 Headless app instances, F84 Outbound writes, F93 Durable jobs, F95 Triggers, F99 Approval gate, F100 Action proposal and dry-run preview, F101 Policy and restriction modes, F102 Stop and interrupt, F107 Result verification, F114 Evaluation harness, F166 Budgets and limits.

### 5.20 Live conversation whisperer from your relationship graph

During a call or meeting, an earpiece or glasses prompt says "you met Priya at the 2025 summit; you promised her the dataset".

A live whisperer during a conversation: device capture of the call, on-device transcription, consent from the other party, and prompts to an earpiece or glasses fast enough to be useful mid-sentence.

Essential features (16, from 10 families): F01 Multi-turn task conversation, F22 Cross-session user memory, F31 Graph data query, F35 Entity resolution, F65 Audio and video processing, F100 Action proposal and dry-run preview, F102 Stop and interrupt, F128 Low-latency streaming responses, F129 Voice conversation, F131 Device capture, F135 Cross-surface and glanceable output, F141 Domain advisory framing, F150 Local-only processing, F151 Retention and deletion, F155 Consent management, F180 On-device model and tool execution.

### 13.22 Live tangible tabletop: move physical tokens and the graph follows

A workshop or classroom rearranges tokens and strings on a table while an overhead camera tracks them and a projector lights up hubs, bridges and paths.

A physical tabletop: camera perception of tokens, projector control, live graph updates, multi-person conversation and consent for an overhead camera.

Essential features (14, from 8 families): F32 Graph editing, F36 Algorithm and layout execution, F48 Live streaming updates, F64 Vision, F90 Physical devices and local network, F99 Approval gate, F102 Stop and interrupt, F128 Low-latency streaming responses, F129 Voice conversation, F130 Multimodal input and pointing, F137 Physical-world perception, F148 Redaction and de-identification, F155 Consent management, F177 Live multi-party conversation.

### 8.9 Two agents debate over a graph

A policy analyst or student jury watches a pro and a con agent argue a contested question with evidence overlaid on the graph, then a judge scores what survives.

Agents debate while the user watches: sub-agents with different models, a critique and judging protocol, live visibility of each agent and narrated evidence on the graph.

Essential features (16, from 10 families): F01 Multi-turn task conversation, F09 Clarifying questions, F14 Planning, F16 Sub-agents, F31 Graph data query, F36 Algorithm and layout execution, F37 Style layers and annotation, F39 Narrated tours and animation, F74 Sandboxed code execution, F107 Result verification, F110 Critique, debate and agreement protocols, F118 Run records and show your work, F122 Live work visibility, F125 Plain-language explanation, F166 Budgets and limits, F167 Model routing and diversity.

### 13.12 Phone-call mode: ask your graph while driving

A salesperson calls a number, asks about a saved project and gets a one-sentence answer plus a texted link.

A phone call into a saved project: telephony, caller identity, sensitive-data restraint when answering aloud, a one-sentence answer and a deep link sent by text.

Essential features (12, from 8 families): F01 Multi-turn task conversation, F04 Reference resolution, F23 Project memory, F31 Graph data query, F43 Clickable references and deep links, F102 Stop and interrupt, F125 Plain-language explanation, F126 Audience adaptation, F129 Voice conversation, F136 Conversation channel adapters, F147 Sensitive data detection, F159 Identity and roles.

### 17.3 Operational-security mode for activists and journalists under repressive governments

An exiled journalist keeps a graph of sources that never names them in clear text, is warned before any data would reach a cloud model or foreign server, and has a one-command wipe or decoy.

Operational security under a hostile state: encrypted storage, a credential vault, egress control, model routing that keeps data off outside servers, and coercion safety.

Essential features (11, from 5 families): F31 Graph data query, F32 Graph editing, F148 Redaction and de-identification, F149 Data egress control and flow ledger, F150 Local-only processing, F152 Encrypted storage, F158 Credential vault, F161 Per-item access policy, F167 Model routing and diversity, F180 On-device model and tool execution, F185 Coercion safety and app lock.

### 15.8 Graph step in someone else's pipeline

A data engineer using Airflow, dbt, Zapier, n8n or GitHub Actions gets a step that takes a table and returns graph metrics, an image and a link; the agent can write the step too.

The product as a step in someone else's automation: an authenticated service endpoint with quotas, schema-checked input, headless rendering and outbound writes.

Essential features (17, from 10 families): F32 Graph editing, F33 Data import and schema design, F36 Algorithm and layout execution, F51 Render capture, F67 Write files and exports, F74 Sandboxed code execution, F79 Headless app instances, F84 Outbound writes, F88 Agent as a service, F93 Durable jobs, F99 Approval gate, F100 Action proposal and dry-run preview, F102 Stop and interrupt, F112 Schema enforcement, F156 Untrusted content handling, F159 Identity and roles, F166 Budgets and limits.

### 2.15 Field data collection

An ecologist building a pollinator network or a contact tracer builds a graph from field photos, voice notes and GPS.

Field collection offline: device capture of photos, voice and GPS, on-device extraction and a review queue, synced when connectivity returns.

Essential features (14, from 8 families): F33 Data import and schema design, F53 Geospatial handling, F62 Format detection and parsing, F64 Vision, F65 Audio and video processing, F80 Offline and low-connectivity mode, F104 Review queue, F108 Uncertainty reporting, F115 Element provenance, F131 Device capture, F147 Sensitive data detection, F151 Retention and deletion, F170 Entity and relation extraction from unstructured content, F180 On-device model and tool execution.

### 13.18 Graph anchored on physical equipment in AR

A data center or AV technician points a phone at a rack and sees which cable goes where drawn on the real objects, with mismatches against the documentation flagged.

Augmented reality on real equipment: physical-world perception anchored to a rack, reading labels back to the technician, and physical-safety checks before a cable is moved.

Essential features (11, from 7 families): F11 Interpretation echo-back, F31 Graph data query, F36 Algorithm and layout execution, F61 Read user files, F64 Vision, F68 Document generation, F108 Uncertainty reporting, F128 Low-latency streaming responses, F131 Device capture, F137 Physical-world perception, F174 Output physical-safety checks.
