## 2026-09-28 -- recorded decisions (relayed, not a review comment)

- The keyboard node walk uses Shift+Arrow; plain arrows keep orbiting in 3D and panning in 2D. The keyboard-only study tests it (see PR #586, design/ui/framework/decided-doors.md once merged).
- Reader messages are published as { key, params, text } with keys graphty.<area>.<message> (PR #586, message-catalog.md "Published keys").

## 2026-09-28 -- the owner's decisions on milestones 1 and 2

Decided by the owner (one-way doors):
- The findings report (the case file) is ONE SELF-CONTAINED HTML FILE: figures embedded, notes and tables as real text, opens offline in any browser, prints to PDF. A native PDF may be added later as a second format of the same report.
- graphty-element publishes SVG FIGURE EXPORT now; PDF export comes later, once SVG is solid. The Print look keeps a greyscale check.
- AUTHORSHIP: each note records its author and time; a recipe records who saved it and when. Both come from the project's author setting as given (blank if none is set). The author is shown only when a project holds more than one.

CORRECTION: framework-changes.md says "the owner's decision is the date only ... Notes carry no author". The owner never made that decision; it is withdrawn. The owner's decision is the one above: notes carry their author. Never record an owner decision that is not in this file.

Decided on the owner's behalf (reversible; the studio may revisit with evidence):
- The project file saves the selection when it closes, so a case resumes where it stopped (an optional, additive field).
- No separate Note tool for now; Add note's existing entry points cover it. Adding a tool later is additive; removing one from the default keymap is not. Test the several-notes-in-a-row case before proposing it again.
- After undoing a filter step, show the one-line notice naming the step (undo version B).
- The misplaced filter-step warning: the studio's call; test whether the proposed mark is noticed.

## 2026-09-28 -- the owner's review of the mocks (verbatim, then what it touches)

1. "for the export button in the top right of the design studio mocks: figma also has an "Export..." in the drop-down under the project name in the top left"
   -- Add Export... to the project-name menu (top left), as Figma does. Decide whether the top-right button stays as a second route or goes.

2. "styles doesn't need to be under the graph nav link -- figma has custom styles, libraries of styles, gradients, etc. under the color picker (e.g. select somthing, go to "Selection colors" in the right toolbar, and it has + in the header to add, custom, library, shaders, etc.)"
   -- The owner challenges putting the style stack in the left panel's Graph section (the Layers slot). Study Figma's pattern (design/ui/figma/: right-sidebar-selection, popovers-and-menus, the color picker's Custom / Libraries tabs and the "+" on Selection colors) and redesign where style layers and style libraries live so they follow it: reached from the selection's appearance in the right panel and from the color picker, not a left-nav place. Keep what style layers must keep (an ordered, visible stack; precedence; the legend) and show where the stack is seen when nothing is selected. Record the framework change.

3. "what is the "M" in the top right if we don't have account management?"
   -- The avatar implies accounts and multiplayer, which the framework rejects. Remove it, or replace it with something real (for example the project's author setting, now that notes and recipes record an author) -- and say which.

4. "why is there "results" on the left? that seems inconsistent with the rest of our interaction model. shouldn't the right tab or the bar on the bottom be responsible for exploring results? how does the left nav bar relate to our ontology?"
   -- Answer this in the gallery, plainly: what each left-rail button is in the ontology, and why. Then reconsider Results' home against the owner's model: the right panel (a tab or the inspector) and the bottom dock (the table) explore results; the left side navigates objects. Consider running results from Quick actions and the catalog, reading them in the inspector and the table, and whether a Results rail panel is needed at all. Record the framework change and test the new placement in the next round.

These outrank simulated findings. Show the owner the before and after for each in the next milestone.

## 2026-09-28 -- the owner's direction on following Figma (verbatim, then what it asks)

"tell the design studio that we might be taking "copy figma" too literally. we should follow our own ontology and information archtiecture and consider our overall navigation structure rather than following figma where it doesn't make sense. for example, we could make better use of the nav rail than I have seen so far, and exports in the top right rather than thinking about how we want to structure data management is a miss. we really need to give ourselves flexibility around the aspects of graphty that are different than figma."

What this asks of the studio (it outranks the Figma paved-path rule wherever the two conflict):
- Figma is the source for conventions at the level of controls and gestures (rows, popovers, menus, keys, selection driving the inspector). It is NOT the source for graphty's structure. Structure comes from graphty's own ontology (conceptual-model.md) and information architecture: the objects, the places, the top tasks.
- Redesign the overall navigation structure from graphty's ontology first, then borrow Figma only where it fits. Where graphty differs from Figma -- data, data sources and versions, results and runs, sets and paths, filters, recipes, comparison, notes and findings -- design for graphty, not for Figma's slot.
- The nav rail: make real use of it. It is under-used today. Decide what each rail destination is in the ontology (see the earlier question "how does the left nav bar relate to our ontology?") and give graphty's distinct concerns their own homes there if the IA supports it.
- Data management: an Export button in the top right is a symptom of not having designed data management. Design how data comes in, is versioned, refreshed, joined, filtered, exported and shared (projects, recipes, style files, data files, findings reports) as one coherent area, and put export where that design says it belongs.
- Record every structural change as a framework change (information-architecture.md, figma-crosswalk.md, interface-specification.md), with the ontology reason. The figma-crosswalk's "departures" list should grow wherever graphty's ontology calls for it; a departure no longer needs a "forced" reason, only a better-for-graphty reason with evidence.
- Test the restructured navigation in the next study round (a tree test and first-click tasks across the personas), and show the owner the before and after in the next milestone.

## 2026-09-28 -- on milestone 3

- Milestone 3 asked again about SVG and PDF figure export. It was already decided above: SVG now, PDF later. Do not re-ask decided questions; check this file first.
- The .graphty recipe format is covered by the existing file-format decision (the file format ships in one major release; one-way-doors.md door 15). No new question.
- The owner's feedback on the navigation (the Figma direction, the nav rail, data management, Results on the left, styles under the selection, the "M" avatar) arrived during round 2 and is not yet reflected. Round 3 must act on it, and milestone 4 must show the before and after for each item.

## 2026-09-28 -- participant view is a trap

The owner clicked "Participant view" on screens/undo.html and could not get the options back or leave it: the #study hash hides the bar and nothing offers a way out, and on an iPad editing the address is the only exit. Fix in the kit, for every page with a participant view: Esc returns to the facilitator view, and a small, low-contrast corner control does the same (a participant will not notice it; a facilitator can find it). Test it on a touch device width.

## 2026-09-29 -- the owner's decision on telemetry (one-way door, decided)

- Telemetry is OFF until the user opts in, and graph content is always masked (options 1 and 2 together). At first use the app asks for opt-in.
- The opt-in text, in the owner's words (the content designer may tighten wording and length but must keep every commitment): "Your data is yours, but please help us. We will never see the data you analyze, but we would like to collect information about how you use the app so that we can improve the user experience. This data will only ever be used by the author of the application and his Claude Code sessions."
- What is collected when opted in: Sentry Session Replay with every node name, attribute value, label and file content masked; anonymous task events (file loaded, first graph drawn, measure run, result read, style added, export, undo) with timings; errors and performance; a feedback widget. No file contents ever leave the computer.
- Update the data-handling page ("Where your data goes" / "Sent and saved") and the first-run flow to match, and add the opt-in to the storyboards and task flows. This closes the telemetry question the data page left open.
- The owner's reason: Sentry on graphty.app will be the real user study, so the first shipped pass must be mostly right, with no trust-busting flaws on first use.

## 2026-09-29 -- the owner asks whether the money fix is overfitting (owner's question; the direction below is Claude's, reversible)

The owner asked, about round 6's "money in against money out went from 2.00 to 5.00, now that the screens name money": which screen names money, and are we overfitting to a specific use case?

Yes, in three ways, and the direction is:
1. The task said "money in against money out" and the fix put "money" on the screen; part of the gain is participants matching task words to screen words. Task wording must never reuse the words a fix puts on screen.
2. Only the currency branch was tested; the generic "Total <column> in" label never met a participant, nor did currency detection.
3. Currency detection is a one-domain special case the ontology does not have (columns have no unit concept).
Direction: name weighted measures from the data in every domain -- "Total <column> in", "Total <column> out", "Links in (count)" -- with the column's unit only if the data declares one; drop the currency special case. Every label or wording change is tested on at least two domains (the transfers data plus a non-money dataset such as protein interaction confidence or citation counts) with task wording that does not reuse the screen's words. Audit every fix from rounds 4-6 for the same two patterns (task words matching screen words; a fix that only serves one domain) and list them in the decision log.

## 2026-09-30 -- spelling (owner)

Use American spelling everywhere in the gallery, mocks, study material and proposed framework text: color, gray, behavior, center, analyze. Fix British spellings (colour, grey, behaviour) wherever a page is touched.

## 2026-09-30 -- the owner chooses refined structure B for round 7 (owner decisions)

Decided by the owner:
- Round 7 tests REFINED STRUCTURE B (study/structure-comparison/structure-b.md, refined as below). Not A, not the "two lists on the left" hybrid.
- A run PAINTS as soon as it finishes. "Measures don't paint on their own" is rejected as a fatal flaw: this is graph visualization software, and not visualizing results defeats the purpose. Several runs may fight over color; the eye icon on each row shows and hides, and the results stay available to compare.
- One tree of rows on the left, each row something that can paint the graph: a group, a path, or a measure (a "PageRank" row whose right-hand inspector offers the styling for PageRank's values). Rows carry a type icon, in the spirit of Tableau's typed fields.
- The tree holds rows, not nodes: nesting means "came from this run", not membership. Parent/child can be locked (a run's children reorder only within it; a path cannot be dropped under a community).
- Every run is a row marked by its kind; its paintable outputs are its children; its non-paintable outputs (a graph-level reading like modularity, a pair list) are on the run's Data tab.
- Hundreds of communities are fine when they are what the researcher studies: collapsed by default, sortable, searchable, "show members in table".
- The right inspector has a Style tab and a Data tab (summary, membership, provenance); the table dock lists many rows. Define the line between them so they do not duplicate.
- Filters belong with the data (they change what is computed and laid out); hiding is the eye (drawing only).
- A built-in "Everything" base layer draws the default style; hiding it shows only what other layers show (hidden nodes still take part in the layout -- say so; filter to leave them out).
- Selection is a built-in layer with its own styling, pinned at the top.
- A node's inspector answers "why this look": "color from Community 3, size from PageRank".
- Organize the tree: folders for grouping rows, "hide" and "show hidden" for the list (separate from the eye, which is paint on the canvas).
- Suggested by Claude and welcome: "solo" (Alt-click an eye shows only that row), note counts on rows.

Questions the owner asks the design team to consider (decide them as a studio, with reasons; the owner reviews):
1. Should notes also show up in the tree?
2. Figma puts tools that modify things in the bottom toolbar. Running an algorithm effectively creates new data (adds rows to the tree). Should algorithms be in the nav rail (more visibility, space for configuration) or the toolbar (fits the paradigm, no jumping between the algorithms place and the tree)?
3. What is the complete design of the toolbar: what belongs on it and what does not? Where do cameras, views, 2D/3D/VR/XR fit? Do enough users draw paths for a top-level Path tool?
4. Is "Data" in the nav rail really "Sources"? Consider borrowing Tableau's paradigm (its data source page, typed fields, dimensions and measures).

The owner wants a clickable, layout-complete skeleton of refined B to review BEFORE any focus group or flow study.

## 2026-09-30 -- the owner's review of the refined B skeleton (verbatim; answer every item)

"I like where refined B is headed." Questions back to the design team:
- when I click on the "Everything" layer, it only has some of the styling options for nodes and edges. displaying all the styling options is important, but it is also complex because there are so many of them (and likely more in the future). the design team should consider how to add all styling options but keep the right sidebar organized.
- renaming a row should be double clicking on it, like in figma. it shouldn't require a right-click
- the "File" menu has "Add data" and "Paste data". shouldn't those be under the data tab? also, there is "Add new graph from" when you drop down from the top of the left bar. should the data nav link become the equivalent of Tableau's "Data Sources" where multiple data sources can be loaded, extracted / cached, connected to, joined, filtered, etc?
- maybe notes should have a style layer rather than being a callout. as a general rule, styling should be unopinionated and left to the user.
- when I click on a node "Why this look" has a lot of layers and uses a lot of real estate. maybe it should just list the active layers
- consider whether the toolbar should move to the left-hand side of the screen (or be re-positionable) so that the text could expand horizontally (and potentially be hidden) without using up all the toolbar space. if there was more toolbar space, would we add more tools? is it a limiting factor? I also still question why path is a top level item -- maybe it should be under select?
- I don't think the design takes all of graphty-element's functionality into account. for example, where can I set and save specific camera views? where can I export images and videos? review all the graphty-element functionality and make sure we have it all accounted for in the skeleton.
- maybe we should bring back "views" or "present" or "export" to the nav rail? maybe setting or jumping to cameras should be a tool? or maybe camera management is already at the bottom of the graph and it's just not explained well?
- I think we had a design principle that ever element has one home. the drop down menu in the top left has "View" which expands to 2D, 3D, etc. That is duplicative of what is in the toolbar. review the app for duplicative locations for features and decide if we should simplify.
- is the "preferences" window the same as "settings" in most apps? is it complete with all the settings we would like to have?
- the right sidebars are getting cluttered and complex, and are overloading what they can do. we need common interaction patterns for the right sidebars -- similar looks and feels and modes of interaction. we probably need one well thought out right sidebar per layer type, and we need to think about how the layouts are the same or different across different layers. we also need to think about what belongs in the right-hand side. for example "re-run layout" is an action, but I think at one point we said that the right-hand sidebars were just for reading data, not running actions.
"take your time and answer each question. come back to me with a new updated refined B so I can review it before it goes to the personas / study group review."
Owner principle stated here: styling should be unopinionated and left to the user.

## 2026-09-30 -- the owner's third review of the refined B skeleton (verbatim; answer every item)

"great progress! more feedback for the design team."
- why does the edge styling say "Line 5", "Arrow head 4"? what do the numbers mean?
- many of the values in styling nodes and edges are going to be empty / unset. what's the interaction pattern for that? should we have '+' to add a row (even if there can be only one)? or should we have pop overs display advanced options like figma does? popovers might be preferable to accordions (again, drawing from Figma's interaction patterns)
- it looks like the "Everything" right-hand panel styling is different than "For the report", even though they are styling the same things?
- why add "show legend" and the camera controls as their own buttons in the top left and top right of the canvas? why not follow the interaction pattern of using the toolbar
- the toolbar shouldn't have text on it, it should have tooltips that get shown after an on-hover delay so that users can understand them without taking up the space of text
- the data sidebar is getting rather complex. are we trying to do too much in too small of a space?
- research tableau's data loading, joins, etc. determine how much of their functionality we should copy for our design.
- how do users set a label on a node to be a field from that node's data source? can they also set it to be the content of a note or the number of notes on node?
- can users set notes on edges?
- "why this look" should be collapsable

"as a primary focus of the next round of the design studio go through every screen, every component, every interaction. what can we simplify? what can we refine? what can we polish? where can we make interaction patterns the same?"
"let's see if we can streamline things a bit before our next round of user testing. return the next set of skeleton wireframes to me to review before we move on."
Owner decisions stated here: the toolbar carries icons only, no text, with tooltips shown after a hover delay. "Why this look" is collapsible. The skeleton comes back to the owner for review before any user testing.

## 2026-09-30 -- the owner's notes on the Tableau research and the data design (verbatim)

- "In a graph, the link between nodes and edges is fixed by the file format: each edge's two ends point at node ids." -- don't you have to know which field holds the IDs?
- you didn't mention node weight or edge weight as pre-defined fields?
- label field should be a variable that is picked in styling, not a pre-defined field -- maybe we want to label our nodes with names; maybe locations; maybe sizes. maybe we want multiple labels (some above, some below the node)
- isn't blending different sources one of our use cases?
- live versus snapshots is interesting, maybe file that as a issue for future enhancement (filed: issue #643)
- "wait, can't we join graphs on something other than node id? for example, if a graph is a set of door entry times that have a person_id and a building_id, maybe we want to load in two other graphs for people and buildings"
- "don't worry about blending for now, but I do want to load and join multiple data sources"
- "weight should be a field that is defined when the data source is loaded"

Owner decisions stated here:
- Loading several data sources and joining them on any key column (not only the node id) is a primary task. Worked example: a door-entries table (person_id, building_id, time) joined to a people table and a buildings table.
- Blending is out of scope for now.
- Weight (node weight and edge weight) is a field defined when the data source is loaded.
- A label is a variable picked in styling, not a predefined field; several labels per node (for example one above, one below) are wanted.
- Live data sources versus snapshots is a future enhancement (issue #643), not in the current design.
- "+ next to label should start empty" (owner decision: adding a Label line binds nothing until the user picks a field; it is not pre-filled with Name)

## 2026-10-01 -- the owner's decisions after reviewing refined B version 3 (verbatim)

- "yes, make notes part of graphty-element's API"
- "we have no way to get name unless someone enters it in settings and we store it; that's fine if they enter it, but it will most likely be empty. we should specify the metadata that can be added for notes, but it will mostly be options (time and node / edge / group / path would likely be required)"
- "address the three issues above" -- the three places version 3 did not yet follow the owner's later decisions: the "+" next to Label must start empty (not pre-filled with Name); loading several data sources and joining them on any key column is a primary task (worked example: a door-entries table with person_id, building_id and time, joined to a people table and a buildings table); weight (node and edge) is a field defined when the data source is loaded.
- "provide me a skeleton mock when it's ready, and move on to the user studies / focus groups without waiting for me to review the skeleton."

Owner decisions stated here:
- Notes are part of graphty-element's public API.
- A note's author name comes only from Settings, is optional, and will usually be empty; the design must work well without it.
- Note metadata is specified: time and the note's target (node, edge, group, path, ...) are required; everything else is optional.
- The next user study round runs on this skeleton without waiting for the owner's review.

## 2026-10-01 -- the owner on scale, nested data and states (verbatim)

"has our design studio created a state matrix? what happens when our data has dozens of attributes per node or per edge? will surfaces like the data loading sidebar become overwhelmed? what about when our data is json, not a flat table, and we have to work with json paths that might include multiple layers of subobjects or arrays?"
"add the state matrix, wide data, and json before the study"

Owner decisions stated here:
- Before the next user study: a state matrix for the skeleton, a design that holds up with dozens of attributes per node and per edge, and a design for loading nested JSON (paths through several layers of sub-objects and arrays).
