# Interaction patterns: rejected alternatives

Rationale for `../interaction-patterns.md`: the alternatives its patterns considered and rejected,
each with its reason. It binds nothing; where it and the patterns disagree, the patterns win.

| Alternative | Why rejected |
|---|---|
| Alt subtracts from the canvas selection | a third modifier grammar that neither Figma nor the graph tools the analysts know uses |
| An Esc ladder of five to eight rungs | nobody can predict the fourth press; the ladder is Figma's three rungs, and a gesture ending or a field reverting answers Esc before the ladder (`../interaction-patterns.md` 3.6) |
| Esc leaves version history but not comparison | two exits for two surfaces that look alike |
| A confirmation for runs over the background line | the cost shows before the click and undo cancels |
| A "Delete N objects" dialog | the latest step is always undoable |
| A selection history ring | a second undo stack for state declared outside undo |
| A box over the cap stops at the cap | a later Filter to would silently analyze part of what was chosen |
| Alt+arrow nudging | positions have no units, so a nudge step means nothing; the arrows walk, and the Position row is the single-pointer alternative to dragging (`../interaction-pattern-entries.md` 9.2) |
| A paste of ids joins on a loaded graph | ids alone carry no values to join |
| A hand-kept command table as the permanent source | it duplicates the definitions and drifts; the register is provisional and checked |
| A result or layer row click replaces the canvas selection, or makes the inspector show the last-activated row | a definition is not a selection-type object; an inspector that follows the last-activated row is a hidden mode, and an analyst inspecting three nodes would lose them by opening a result (`../interaction-patterns.md` 3.1) |
| Progress only on the row, never in a notice | a single running notice stays visible when the run's row has scrolled out of view or its panel is closed |
| Tab on a canvas with no walk does nothing | `principles.md`, departures (Tab leaves the canvas) |
| The walk starts when the canvas gains focus | an invisible mode entry: Enter could never reach a set's members, Esc took two presses to deselect after a click, and Tab trapped a bare embed's keyboard users |
| Enter in a field returns focus to the canvas, as Figma's does | `principles.md`, departures (focus stays where the analyst works) |
| Alt+drag orbits | it collides with window-manager drags on Linux; a right drag with a travel threshold keeps the context menu |
| Three Select neighbors commands | one command with a direction argument keeps the catalog small and lets consecutive presses count as one selection change |
| A permanent Previous selection row in the inspector | loud chrome for a rare event; added only if the moderated task in `../interaction-pattern-entries.md` 4.4 fails |
| Mod+click on the canvas left unassigned | a dead first click for Gephi and Cytoscape users, with no Figma meaning to protect |
| Several sets selected at once | reopens the one-object selection (`one-way-doors.md` 39) to solve bulk edits, which row multi-focus already covers; an inspector of several sets would show Mixed rules, which have no meaning |
| Esc during playback aborts to the window where Play began | the analyst loses the moment they stopped on, and one undo after Pause already returns there; playback is not a held gesture (`../interaction-patterns.md` 3.6) |
| The inspector follows the focused node during the canvas walk | a hidden "last activated" state: a keyboard user who walked away from a 3,000-node selection would see one node and remove 3,000 with Delete (`../interaction-patterns.md` 3.1) |
| Enter on a definition row runs its primary command (Select painted, Apply view) | Enter would do something other than a click, against the WAI-ARIA patterns, and applying a view would become the side effect of a key; the primary command is the context menu's first item (`../interaction-patterns.md` section 2) |
| Selecting a Find hit or a finding never moves the camera | on a large graph the selected hit is usually off screen; Figma's Find zooms to its hit (`../interaction-patterns.md` 3.1) |
| An element selection's Appearance only reads | it breaks Figma's select-then-change-the-fill path, and a write to the Overrides layer already goes through a style layer (`../interaction-patterns.md` 3.2) |
| Graphs keep the order they were added | a hand order of graphs carries meaning: time slices, before and after, chapters (`../conceptual-model.md` 7.1) |
| A count opens the table on what it counts | under test against 4.3; a count answered only in the table leaves the canvas and inspector off the answer |
| Tool keys fire only while the canvas has focus | every keyboard user would first have to cycle to the canvas after selecting in the table |
| Redo re-dispatches a run that undo canceled | a key press would silently start minutes of work; Redo restores the result unrun instead (`../interaction-patterns.md` 3.4) |
| Figma's lock chord pins a node | lock stops selection and Pin fixes position; one chord, two meanings |
| Figma's hide chord filters out the selection | Hide is cosmetic in Figma, while Filter out changes counts and layouts |
| Named folders of style layers, as Figma groups layers | the source fold covers the common case, and a hand folder would suggest a precedence that only the stack order decides |
| Present as a mode | views are presented by exporting them and stepped through in the Views submenu (`figma-crosswalk.md` 4.1) |
| A history list under Undo, permanently | kept until graphty-element restores a canceled run on Redo; then removed, because the label names the next step (`../interaction-patterns.md` 3.4) |


## Moved from the information architecture

These were listed among the structural rejections of `information-architecture.md` 11; they are
choices about behavior, so they are recorded here.

- **Loading at once with detected defaults, corrected with undo** (an earlier decision, and Figma's
  add-first rule): at millions of rows a wrong mapping costs minutes per retry, and a join's match
  count must be seen before the join.
- **One Open whose effect depends on the file** (an earlier decision): a verb that sometimes merges
  is unpredictable and cannot be documented in one line; Figma's Open never merges.
- **Choosing a legend entry adds a filter step:** one click would re-scope every number.
- **A selection history:** selection is outside undo; trails are kept by a Filter to step, Create
  path or Save view, and Previous selection covers one step back.
