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
