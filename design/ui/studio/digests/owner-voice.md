# The owner's voice on design: every message, in order

This digest collects what the owner (the person who owns graphty and directs the work) typed about
the graphty app's design: its screens, the mocks, the design studio, the simulated user studies,
personas, Figma as a model, and what a first-time user needs. Quotes are verbatim, trimmed to the
relevant sentences ("..." marks a cut). Typos are the owner's. Times are UTC.

Every entry names its source as a transcript file prefix plus the message timestamp. The files are
in `/home/apowers/Projects/graphty-monorepo/.claudehistory/`:

| Prefix | File | Span |
|---|---|---|
| `fac8` | `fac8191f-78c2-4de2-8ae0-bd963cf90bd9.jsonl` | 2026-09-04 to 09-22: the first app design (v1), compact-mantine, the shell, vertical slices, element API |
| `b715` | `b715b27e-f93f-4853-ab53-38c8045833b2.jsonl` | 09-05 to 09-08: a Babylon.js debugging MCP (one design-adjacent remark) |
| `edf0` | `edf07b88-2700-4a9d-93d1-b77a43d817e8.jsonl` | 09-19 onward: WebGPU, migrations, extension points, githerd |
| `3a19` | `3a19ea55-f3cc-4fc0-b85f-842243f52536.jsonl` | 09-23 onward: Figma study, object-first redesign, the design studio, rounds 1-9, the tier 1 real app |

No transcript before 2026-09-04 is in the archive. The owner's first message there says earlier
work used Designloom (persona and workflow YAMLs, now in `design/designloom/`).

To find a quote: `grep -n '"timestamp":"<timestamp>' <file>` (the timestamps below are to the
minute; the extraction script is `design/ui/studio/tmp/extract_owner.py`, its output
`design/ui/studio/tmp/owner-all.jsonl`).

---

## Phase 1: the first design ("v1"), progressive disclosure, 2026-09-04 to 09-09

**2026-09-04 15:46** (fac8) -- why the project was restarted:
> I got stuck when it came time to design a flexible UI that would be easy for novices and flexible for experts. ... do you have skills to help design UIs? can you see the historical work we did with designloom?

**2026-09-04 15:59** (fac8) -- Designloom and the model to follow:
> we don't need to use designloom, it was mostly the YAMLs that mattered
> my thinking was to use a design like Figma or Photoshop that used progressive disclosure
> let's talk before you start designing

**2026-09-04 16:22 / 16:26** (fac8) -- platform and scope answers:
> desktop first, but must work on an iPad with magic keyboard (smaller screen)
> touch is secondary ... overlapping is fine, and the user can open and close panels ... I suspect I will come back and validate all use cases and personas after we nail down a design ... I also want to see example of using different tools and analysis -- e.g. styling, betweenness, etc

**2026-09-04 18:27** (fac8) -- questions on the first mocks (auto-generated summaries, autorun, experts):
> "17 cats, 1 dog and 2 humans, connected by 29 relationships..." -- what creates this summary? AI? is it on by default? what would it look like for a very large, very complex network?
> how does styling work? how would a user style edges AND nodes? how would they style groups and paths? how are automatic stylings that are the result of algorithms different than manual stylings
> "Find groups", "Who has influence", "Search for something you know" -- would these be annoying to expert users?

**2026-09-04 19:34** (fac8) -- new analysis asked of the screens:
> run through the screens to see how they would look with massively large networks
> do we have a scientist persona for the genome users of Cytoscape?
> there needs to be an annotation function where users can put notes on nodes and edges
> how would users load, review, and clean data? review the functionality of Gephi and Cytoscape where data loading and preview is a major feature set

**2026-09-04 22:19** (fac8) -- decisions on the report:
> large graphs should warn but allow the user to move forward ... the UX should drive the engine features, not the other way around

**2026-09-05 16:41** (fac8) -- long review of the v1 screens; the lasting points:
> "Try it" boxes -- maybe only visible when loading default data sets? if you brought your own data, maybe you already know what you're doing?
> Are the graph summary and other information automatically running analysis? That might be annoying for experts that are loading large graphs.
> how do algorithms show up under "styling"? e.g. if I want to make all the nodes change size by their centrality, how would I run a centrality algorithm and then style it?
> things like "3.2GB Large" are just clutter. ... we need to make it easy to understand and minimalistic. more data is just clutter that actually makes it harder to read.

**2026-09-05 17:37** (fac8) -- first complaint about text:
> the UX is becoming intimidatingly text-heavy. consider moving some of the newbie text to information circles ("i" inside a circle) ...
> we could use compact icons for save, load, copy, paste, etc. rather than wordy buttons
> analyze navigation paths for various key features and use cases. does the path exist? is it a minimal number of interactions?

**2026-09-06 00:12** (fac8):
> the app is still very text heavy. research how figma managed to create a compact, easy to understand layout without being text heavy.

**2026-09-06 15:57** (fac8) -- Figma pop-outs, bottom toolbar, analysis produces a style:
> Figma uses an iterative pop-out component that only shows that information on demand, which keeps the UI cleaner.
> analyze should result in creating a style -- MCL, granularity 2.5 shows the colors for groups, that belongs under styles.
> the toolbar for pan, zoom, select, 2d/3d, should be in the bottom center of the viewer like Figma -- it's more aesthetically pleasing that way and feels like a focus rather than an afterthought
> go through multiple stages of adversarial review with a Figma designer persona, novice users, and expert users.

**2026-09-07 17:31 / 21:48** (fac8) -- the pop-over rule:
> the point of the figma pop-overs is that they hide advanced features, but still keep them one-click away. the pop-overs are also anchored to their parents ...
> the design pattern with Figma is "expand the panel for basic options" and "click an icon for advanced features for the pop-over to appear"? is that what we're doing?

**2026-09-07 23:14** (fac8): "looks great! I'm happy with the screens. what's next?"

**2026-09-09 06:19** (fac8) -- panel rule settled:
> study figma, a panel always expands. the components shown in the panel aren't GLOBALLY commonly used, they are LOCALLY commonly used. ... a layout panel would show a couple common parameters and have an advanced gear for the rest. do not make panel that has a pop-out on its own.
> build the component library as part of our compact-mantine package.

## Phase 2: building the v1 shell and vertical slices, 2026-09-11 to 09-16

**2026-09-12 06:00 / 15:37** (fac8) -- panel lifecycle:
> what's our plan for handling the lifecycle of panels? when should they stay open? when should they close? should they ever overlap?
> when I have the left bar open and I click settings, the settings panel opens underneath it. this is a bad and confusing user experience. why didn't you catch this?

**2026-09-12 16:08** (fac8) -- duplicate homes:
> why the duplicate locations for functionality? why is there an export on the top bar, when there is also a Present mode? why is there a layout selection in the bottom bar when that is also under style?

**2026-09-13 15:05** (fac8) -- the first onboarding slice:
> Build one vertical slice: W14 onboarding. Welcome, load a sample, defaults on load, the suggestion strip, one analysis, one plain-language reading.

**2026-09-13 19:45** (fac8) -- welcome screen and manual acceptance tests:
> make the welcome screen a modal screen rather than depending on the graph background color.
> create user acceptance tests that Claude can run manually using the Playwright MCP to verify that key paths are working and rendering correctly

**2026-09-13 23:08** (fac8) -- style layers only, and interactions under-specified:
> update CLAUDE.md that styling MUST be applied through a style layer, and MUST NOT be applied manually in any circumstance
> our spec doesn't include enough details about the interaction of our design. ... examples of problems we have had: layering issues, such as which window is on top; sidebars opening or closing in very confusing ways; buttons not reflecting state of the application; built out functionality not being available through any interaction flow; can't type in text boxes or text entry not selected by default

**2026-09-14 23:11** (fac8) -- nested algorithm styles, panels simplified:
> when I run Louvian it on the Karate network it creates 6 new styles ... we should have "nesting of styles in the UI" -- a top level "Louvian" style ... like a folder with the individual group styles underneath. if the top style is changed, that style is inherited by all the styles inside
> our panel open / closed / autohide is a confusing nightmare. remove the panel locks and remove autohide. the panels are always open unless the user clicks the button to hide them. there is one button to hide / show both

**2026-09-16 19:45** (fac8) -- algorithms layer, never mute:
> multiple algorithms MUST be able to layer their styles, that's the entire point of having style layers. having an algorithm that "mutes the rest" is the antithesis ... if people want to hide one style to make another one more visible, that's a user choice. it MUST NOT be an algorithm choice.

## Phase 3: architecture rules that shape the app, 2026-09-19 to 09-22

**2026-09-19 13:53 / 15:18** (fac8) -- graphty-element owns all graph functionality; the app is HTML around it and must not work around it (now in the root CLAUDE.md, "Architectural Principles").

**2026-09-19 16:57** (fac8) -- the file kinds a user saves and loads:
> loading data ... styles, where graph styles can be saved and loaded independently to apply an existing style to new data ... analysis, which runs a set of analysis functions on a graph so that new graphs can benefit ... great for domain specific work ... annotations, which are notes that are independent from the data so that the data can remain immutable ... maybe camera views? ... or one file that combines any of the above

## Phase 4: the Figma study and the object-first idea, 2026-09-25 to 09-26

**2026-09-25 14:25** (3a19) -- the core complaint:
> I'm not a UX designer so I don't know what terms to use to describe this problem or how to fix it. The graphty app looks complex and cluttered compared to figma. ... There are more things on the screen and more cognitive load in graphty app than in figma. In figma it's easy to learn and explore without wizards -- it's intuitive. Have a subagent behave as a UX designer and compare graphty app to figma. Teach me ...

**2026-09-25 14:56** (3a19) -- what he took away:
> the UI is minimalist; there is consistency in all the UI components, layouts, and interactions; there is a common visual language across all the components; the information architecture is key to a clean organization ... where do we NECESSARILLY have differences ...?

**2026-09-25 15:06** (3a19) -- the objects are results:
> the objects might actually be the results of the algorithms and the filters: the bridges, the groups, the paths, the filtered sets ... our "create an object" isn't drawing, its filtering and algorithms.

**2026-09-25 15:18** (3a19): "let's do a deeper dive into what a new UX for graphty that is based on figma might look like. create a few key mocks ... identify any rough edges where the fit might be awkward"

**2026-09-25 23:22** (3a19) -- review of the first object-first mocks:
> the mocks are inconsistent -- some have a hamburger menu, and some have a left rail
> "highlights are exclusive" -- paths are just edge styles, they should layer just like node styles.
> the right panel has too much content and will require a lot of scrolling ... maybe tabs for "data", "node style", "edge style", "group style", "overview"... I dunno, that's a lot too
> make sure that all current and proposed graphty-element features are considered. e.g. how would a timeline work?

**2026-09-26 02:48** (3a19) -- what "key functionality" means:
> not being able to open data is a pretty massive gap -- that's really key to the application ... key functionality is functionality that is required to make the app work (loading data) or features for data analysis or visualization (timelines), it is not things like wizard or cards that suggest people run algorithms.

**2026-09-26 14:29** (3a19) -- mock feedback:
> bring back the nav rail for managing data, styles, views, and AI
> the bottom-center toolbar got too complex -- too many buttons, too many words. 2D, 3D, AR, VR should be a single button that expands to its options, where the button shows the currently selected option
> where is export style, export recipe? load style?
> the documents describe the UX but not the actual design. create documentation describing our visual language and approach

**2026-09-26 14:47 / 14:51** (3a19) -- missing frameworks:
> should the visual language document cover things like consistent usage patterns (e.g. empty list with `+` to add things)? object first design? when to use flyouts vs modals? that level of the design seems to be missing and is what leads to the lack of consistency and refinement
> as I said before, I'm not a ux designer. ... what are the other high-level frameworks that a good UX design will have to ensure consistency and a refined approach?

**2026-09-26 14:56** (3a19) -- the warning about personas:
> I worry about starting with the personas and workflows -- that's how we ended up with the muddled mess of v1. it cluttered the UX with novice features and verbose text that was intended to help new users. how would we expect the personas and workflows to interact with an object-first design?

**2026-09-26 15:08** (3a19): "let's hold off on the new mocks until we settle the overall design"

**2026-09-26 15:24** (3a19) -- top tasks input:
> export and present seem like the same thing. it's unlikely people will present from the browser
> don't change common technical terms: e.g. leave betweenness instead of using brokers
> taking notes seems like it should be a common task
> Watch over time is a key use case for me, but probably not for the average user
> understanding the overall graph (how many nodes, how many edges, degree of connection / histogram, etc.) seems like a key task

**2026-09-26 15:50** (3a19) -- the founding brief of the design studio (the most-cited message):
> figma is our paved path -- if they have already solved a problem, we should solve it the same way and our end result should resemble figma. don't ask me to make decisions that should be decided by data, persona, or workflows. ... design for the intermediate user and don't let personas create a cluttered UI -- safe exploration through undo, inline explanations through (i) information icons, etc. enable all users without adding specific features for specific personas.
> our conceptual model and vocabulary is key. ... nodes, edges, groups, paths, etc. are what we want to interact with. don't overload the object-first model. graph objects are the focus. secondary objects like notes and views should not be conflated with primary objects. create our ontology first, then decide on the vocabulary ... stick with industry standard terms ... steal from other projects like Cytoscape and Gephi.
> use personas and workflows as a validation of your approach.

**2026-09-26 15:58** (3a19) -- how the studio must work:
> this is a UX design research team that is collaborating and working with each other. the process should be iterative and collaborative with multiple subagents representing different perspectives. there need to be adversarial reviews and constructive criticism ... this may take hours to execute

## Phase 5: canonical documents, mocks and simulated studies, 2026-09-27 to 10-02

**2026-09-27 18:46** (3a19) -- second studio session, add a design professor, state matrix, and notes on the framework documents:
> add a design professor to the team that will ensure we are following best practices. ... consider breaking out flows and user journeys. ... we also need to consider our state matrix -- what happens with large and small graphs? how many styling elements ... how do we view data and styles at the same time? what happens if there are large number of layers? how do we manage options for algorithms and layouts?
> top-tasks.md -- ... "replace data" ... could also be "load style" or "load recipe" ... which enables communities to share starting points without sharing their data. ... maybe there should be a default overview recipe and a way to replace the default
> conceptual-model.md -- can we add functionality (like an ordered index) to our sets to extend them into paths? ... do we need two kinds of filters: one that changes the view, and one that removes nodes? ... how do we differentiate between sets with continuous styling values and sets with group values? ... the ontology is the model ... did we capture that edges can have types and attributes?
> information-architecture.md -- how do we think about visualizing data ... vs. looking at raw data

**2026-09-28 14:40** (3a19) -- third session: storyboards, flows, mocks and simulated user studies:
> use the existing design to create storyboards, flows, and mocks. ... put through a simulated user study with the graphty user personas, including simulated focus groups. the simulated personas should be constructed from information that we have already gathered and more details on the internet ... forums, content from youtube ... The goal is to create a refined design that is ready for development ... there is no time constraint, take your time and get it right. present the user with mocks and storyboards as they become available so that at least one real human is involved

**2026-09-28 22:56** (3a19) -- mock feedback: Figma's "Export..." is also under the project-name menu; styles libraries live under the color picker, not a nav item; "what is the "M" in the top right if we don't have account management?"; "why is there "results" on the left? ... how does the left nav bar relate to our ontology?"

**2026-09-28 23:59** (3a19) -- do not copy Figma too literally:
> we might be taking "copy figma" too literally. we should follow our own ontology and information archtiecture and consider our overall navigation structure rather than following figma where it doesn't make sense. ... exports in the top right rather than thinking about how we want to structure data management is a miss.

**2026-09-29 15:00 / 15:40** (3a19) -- real users and cost:
> I don't have access to real analysts to test with, nor do I have a real-life design studio ... The best I can do is publish it to graphty.app and use sentry.io to analyze the results.
> these user studies are really expensive in terms of both time and tokens, you need to make sure they are correct before they launch

**2026-09-29 19:04 / 19:17 / 19:53** (3a19) -- overfitting:
> which screen names money? are we overfitting to a specific use case?
> "It's a feature grown from one persona's task, which the studio's own rules forbid." -- why didn't our design studio catch that? do we have a persona that should be looking for that?
> shouldn't running other users through the same flows catch the over-indexing mistake?

**2026-09-30 00:37** (3a19) -- the owner's counter-proposal (became "refined B"):
> running an algorithm happens from the toolbar or from a left-hand nav rail section "Algorithms"; running an algorithm creates a new style (groups, path, etc.) that show up at the top of a graph groups list on the left; groups may be nested as trees ...; clicking on a set or a path on the left opens up a style inspector on the right ...; dragging and dropping in the graph groups reorders their styles
> I'm a little concerned that you are randomly shuffling around components without considering ALL the flows and whole structure of the app.

**2026-09-30 10:07** (3a19) -- replies to the critique of that proposal:
> I would imagine a "Page Rank" row in the graph list. If you click on it, the right hand side shows the available values for styling page rank.
> `Running five centralities ... shouldn't create five styles fighting over colour.` -- I disagree, I think it should. And users should be able to show / hide layers with an eye icon
> if those hundreds of communities are of interest to the researcher, that's probably fine
> the right-hand inspector should show styling under one tab and have another tab for showing data (summaries of a group, membership, etc.)
> filters belong in the data tab ... there should be a default "everything" layer that draws the default style, and if the everything layer is hidden (eye icon) then nothing is shown ... if you want to effect the layout you should filter instead of hide ... selected nodes should also be a built-in layer with their own styling.

**2026-09-30 10:35** (3a19) -- measures must paint; round 7 questions; first clickable skeleton:
> `Measures don't paint on their own.` -- I think that's a fatal flaw. this is graph visualization software, not visualizing results kinda defeats the purpose
> use refined B for round 7. ... should notes also show up in the tree? ... should algorithms be in the nav rail? or the toolbar? ... what is the complete design for the toolbar? ... is "Data" in the nav rail really "Sources"? ... maybe we should be borrowing some of Tableau's paradigm
> create a mock of refined B ... as layout complete as possible ... so that I can click through different sections of the application

**2026-09-30 15:25** (3a19) -- review of the refined B skeleton:
> I like where refined B is headed.
> when I click on the "Everything" layer, it only has some of the styling options ... consider how to add all styling options but keep the right sidebar organized.
> should the data nav link become the equivalent of Tableau's "Data Sources" where multiple data sources can be loaded, extracted / cached, connected to, joined, filtered, etc?
> maybe notes should have a style layer rather than being a callout. as a general rule, styling should be unopinionated and left to the user.
> "Why this look" has a lot of layers and uses a lot of real estate. maybe it should just list the active layers
> I also still question why path is a top level item -- maybe it should be under select?
> I don't think the design takes all of graphty-element's functionality into account. for example, where can I set and save specific camera views? where can I export images and videos?
> I think we had a design principle that ever element has one home. ... review the app for duplicative locations
> we need common interaction patterns for the right sidebars ... one well thought out right sidebar per layer type ... "re-run layout" is an action, but I think at one point we said that the right-hand sidebars were just for reading data, not running actions.

**2026-10-01 00:52** (3a19) -- next skeleton review, then simplify everything:
> many of the values in styling nodes and edges are going to be empty / unset. what's the interaction pattern for that? should we have '+' to add a row ...? or should we have pop overs ...?
> why add "show legend" and the camera controls as their own buttons ...? why not follow the interaction pattern of using the toolbar
> the toolbar shouldn't have text on it, it should have tooltips that get shown after an on-hover delay
> the data sidebar is getting rather complex. are we trying to do too much in too small of a space?
> how do users set a label on a node to be a field from that node's data source? can they also set it to be the content of a note or the number of notes on node? ... can users set notes on edges? ... "why this look" should be collapsable
> go through every screen, every component, every interaction. what can we simplify? what can we refine? what can we polish? where can we make interaction patterns the same?

**2026-10-01 04:08 - 04:44** (3a19) -- data sources (Tableau research):
> label field should be a variable that is picked in styling, not a pre-defined field ... maybe we want multiple labels (some above, some below the node)
> can't we join graphs on something other than node id? ... door entry times that have a person_id and a building_id
> don't worry about blending for now, but I do want to load and join multiple data sources
> weight should be a field that is defined when the data source is loaded
> + next to label should start empty

**2026-10-01 05:28** (3a19) -- notes in graphty-element; studies without waiting; success criteria:
> yes, make notes part of graphty-element's API ... (time and node / edge / group / path would likely be required)
> provide me a skeleton mock when it's ready, and move on to the user studies / focus groups without waiting for me to review the skeleton.
> determine what your success criteria looks like before you start.

**2026-10-01 12:22 / 14:28** (3a19) -- wide data:
> what happens when our data has dozens of attributes per node or per edge? will surfaces like the data loading sidebar become overwhelmed? what about when our data is json ... json paths ...?
> add the state matrix, wide data, and json before the study

**2026-10-02 13:17 / 13:35** (3a19) -- more personas: "a cytoscape hold out" and "someone that has been using cytoscape to work with the gene ontology"; "do they typically load the whole graph all at once? or load smaller sections and join them together?"

**2026-10-02 16:30 / 16:38** (3a19) -- the origin of the first-time-user focus:
> why didn't the dry run catch the mock issues before the user survey? ... is our user study focused on first use?
> we should prioritize the tasks that we are giving users -- first time users will need to focus on how to load data (and maybe they need sample data), run algorithms, create styles, add labels, etc. What are the most common needs across all users? what is our typical use case? how should we make sure this is functional for the average user before worrying about specialized features or functionality?
> what were the successes of the last round? it's hard to tell if it was all failures or if some things are working well.

## Phase 6: the tier 1 real app, 2026-10-03 to 10-06

**2026-10-03 05:20 - 05:24** (3a19) -- stop mocking, build the real app:
> our user studies keep breaking on the fact that it's not a real app. should we build the real app instead and then run the user studies against that?
> we're building with Claude Code -- isn't it just as easy to build real code as a mock?
> stop round 9 and build the tire 1 path as the real graphty app. the tier 1 app should get deployed to graphty.app after a successful build and release. after it is done, use it for the next round of user studies. if there are features missing in graphty-element that are going to be needed by the design in future releases, file them as high priority issues

**2026-10-03 16:04** (3a19) -- column types:
> are you trying to determine types automatically? or are you having the creator of the column say what type it is? asking because automatic determination is going to be error prone ... why do we need style channel groups?

**2026-10-03 16:10** (3a19) -- presentation neutrality (now in CLAUDE.md):
> graphty-element MUST be neutral about how information is displayed and MUST NOT be opinionated about presentation or information structure. ... graphty app (or other apps that use graphty-element) will make ALL presentation decisions

**2026-10-06 14:44** (3a19): "search our .claudehistory for next steps in our design studio work and what comes after the tier 1 design."

**2026-10-06 18:24** (3a19) -- this run's brief: a study group reviews tier 1 against a first-time user's core path, with full history; test a local build ahead of the release; iterate locally; designers keep notes of priorities, values, reasons, what worked and failed, criteria and thinking, summarized with the most important on top and seeded from history; success criteria first; several rounds; a final report of what was tested, learned and next steps.

---

## What the owner has asked for, summarized

Where the owner changed position, the later one is given and the earlier one noted.

### Who the app is for
- Design for the intermediate user. Enable novices and experts without features for specific
  personas (3a19 2026-09-26 15:50). Personas and workflows VALIDATE the design; they do not
  generate it, because generating from them produced v1's clutter (3a19 09-26 14:56).
- First-time users first: load data (perhaps sample data), run algorithms, create styles, add
  labels; the average user's common needs before specialized features (3a19 10-02 16:38).
- Watching a graph over time matters to the owner but is not an average-user task (3a19 09-26 15:24).
- Understanding the overall graph (node and edge counts, degree histogram) is a key task (same).
- Desktop first; must fit an iPad with a keyboard; touch is secondary (fac8 09-04 16:22, 09-15 06:36).

### The model: Figma, but graphty's own ontology
- Figma is the paved path: where Figma solved a problem, solve it the same way (3a19 09-26 15:50).
  Later qualified: do not copy Figma literally where graphty differs, especially navigation and
  data management (3a19 09-28 23:59).
- Object-first. The objects are graph objects and the results of algorithms and filters (groups,
  paths, bridges, filtered sets); "creating" means filtering and running algorithms
  (3a19 09-25 15:06). Notes and views are secondary objects, not to be conflated (09-26 15:50).
- Ontology first, then vocabulary; industry-standard terms ("betweenness", not "brokers");
  borrow from Cytoscape and Gephi (09-26 15:24, 15:50).
- What Figma teaches: minimalism, consistency, a common visual language, information
  architecture as the organizing key (09-25 14:56). Needed frameworks: visual language,
  interaction patterns (empty list with +, flyout vs modal), flows and journeys, a state matrix
  (09-26 14:47, 09-27 18:46).

### Restraint
- Not text-heavy: icons with tooltips, (i) info icons for explanations, no wordy buttons, no
  clutter like "3.2GB Large" (fac8 09-05 17:37, 09-06 00:12, 09-05 16:41).
- No wizards or suggestion cards; those are not key functionality (3a19 09-26 02:48). Earlier v1
  had a suggestion strip and "Try it" boxes; the owner questioned them for experts
  (fac8 09-05 16:41) and later ruled them out.
- Automatic analysis on load may annoy experts with large graphs (fac8 09-05 16:41).
- Every feature has one home; no duplicate locations (fac8 09-12 16:08, 3a19 09-30 15:25).
- Panels: always open unless hidden; one button hides or shows both; no locks, no autohide
  (fac8 09-14 23:11; replaces the earlier "locked open by default" from 09-13 19:45).
- A panel expands to show locally common options; an advanced gear opens an anchored pop-over
  for the rest; no panel that is only a pop-out (fac8 09-07 21:48, 09-09 06:19).
- Toolbar bottom center, no text, tooltips after a hover delay; 2D/3D/AR/VR as one button
  showing the current mode; legend and camera controls go through the toolbar
  (fac8 09-06 15:57, 3a19 09-26 14:29, 10-01 00:52). Open questions he raised: toolbar on the
  left or movable; path under select rather than top level (09-30 15:25).
- Right sidebar: common interaction patterns across layer types, one inspector per layer type,
  styling in one tab and data in another; it reads data rather than running actions
  (09-30 10:07, 09-30 15:25). Unset style values: + to add or Figma pop-overs (10-01 00:52).
- Rename by double click (09-30 15:25). Undo for every action, safe exploration (09-26 16:09, 15:50).

### Layers, algorithms and styles
- All styling goes through style layers (fac8 09-13 23:08).
- Algorithms layer their styles and never mute others; hiding is the user's choice
  (fac8 09-16 19:45).
- Running an algorithm creates rows in the left-hand graph list (groups, paths, a "PageRank" row);
  clicking a row opens its style inspector on the right; drag to reorder; eye icon to hide;
  five centralities may coexist as five layers; hundreds of communities are fine
  (3a19 09-30 00:37, 09-30 10:07). An algorithm's rows nest like a folder with inheritance
  (fac8 09-14 23:11). Algorithms may suggest row names as they suggest styles (3a19 10-02 17:08).
- Measures must paint: a result the user cannot see is a fatal flaw (09-30 10:35).
- A built-in "Everything" layer draws the default style; a built-in selection layer; filters
  belong in the data tab and change what is laid out, hiding only changes what is drawn
  (09-30 10:07). The Everything layer must reach every style option without clutter (09-30 15:25).
- Labels: the field is chosen in styling, not predefined; several labels per node; user-positioned;
  "+" next to label starts empty (10-01 04:08, 04:44; 09-26 00:13).

### Data
- Loading data is key functionality; its absence from mocks was "a pretty massive gap" (09-26 02:48).
- Data nav like Tableau's Data Sources: load and join several sources, join on fields other than
  node id; no blending yet; weight chosen at load; column types declared rather than guessed
  (09-30 15:25, 10-01 04:08-04:15, 10-03 16:04).
- Wide data and JSON paths must not overwhelm the data surfaces (10-01 12:22).
- Large graphs warn but proceed (fac8 09-04 22:19).

### Files, notes, views
- Separately saved and shared: data, styles, recipes (analysis sequences, including a replaceable
  default overview recipe), annotations, perhaps camera views, or one file combining them
  (fac8 09-19 16:57, 3a19 09-27 18:46).
- Notes are common; on nodes, edges, groups and paths; part of graphty-element's API as plain
  text, rendered as Markdown by the app; possibly drawn by a style layer (09-26 15:24,
  10-01 05:28, 10-01 14:52, 09-30 15:25).
- Export and present are the same thing (09-26 15:24). Camera views can be saved; images and video
  can be exported (09-30 15:25).

### Components
- compact-mantine components match Figma pixel for pixel in light and dark; one color picker,
  the Figma one; consider deprecating native Mantine ones (3a19 09-26 00:28, 10-01 21:53-21:57).
- Use default components; fix the shared one rather than writing a bespoke control
  (fac8 09-13 23:08).

### How the studio works
- A collaborating team of designer subagents with adversarial review, a Figma expert, a design
  professor; iterate as long as needed (3a19 09-26 15:58, 09-26 18:45, 09-27 18:46).
- Do not ask the owner for decisions that data, personas or workflows should settle; ask only
  one-way doors (09-26 15:50).
- Simulated personas built from real-world sources (forums, video); include a Cytoscape
  hold-out and a gene ontology Cytoscape user (09-28 14:40, 10-02 13:17).
- Guard against overfitting to one persona's task; run other personas through the same flows
  (09-29 19:04-19:53).
- Studies are expensive: validate them before launch; set success criteria first; report
  successes, not only failures (09-29 15:40, 10-01 05:28, 10-02 16:38).
- Show the owner mocks as they become available; a clickable skeleton of the whole layout
  (09-28 14:40, 09-30 10:35).
- Now (latest): test the real tier 1 app, not mocks; iterate locally instead of waiting for the
  release queue; the app ships to graphty.app; missing graphty-element features become
  high-priority issues; designers keep running notes (10-03 05:24, 10-06 18:24).
- Real users later: graphty.app plus Sentry analytics are the only real-world signal available
  (09-29 15:00).
