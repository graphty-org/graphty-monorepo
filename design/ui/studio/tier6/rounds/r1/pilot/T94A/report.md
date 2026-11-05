# Pilot of tier 6 task T94A: taking a change back on the Les Miserables poster

Build 8fa33aa786 from .study-builds/tier6-r1-8fa33aa786, 1440 x 900, started from
`setup:connected-lesmis-poster.txt` on every walk (saved project open, Assistant connected, panel
closed). Screenshots and step files are under
/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier6/r1/pilot/T94A/ (shortened to `T94A/`
below). The data stayed the project's own 77 nodes and 254 edges on every walk.

Result: reached on the pointer path and on the keyboard path. Nothing asked for was skipped. The
success path matches the answer key: every way of taking the change back restored the look, the
layers and the runs. The one route that does not is deleting the layer by hand, which brings the
picture back and leaves the run behind (defect 1). By keyboard, Undo in the turn throws focus to the
top bar (defect 2).

## Routes walked

### Success path by pointer (T94A/success)

Start: key card "Color: Poster", "3 of 77 nodes"; layers Hovered, Selected, Poster, Everything (01).
Assistant on the rail (02). Typed "Color every character by the circle of friends they belong to",
Enter: "Sending to Google" with Stop Esc (03). Reply: 6 communities, the change line "Computed
Communities for 77 nodes" with Open run and Undo; key card "Color: Louvain", Group 1 to 6 (04). Undo in
the turn: the row reads Undone, the notice "Undid Color every character by the circle of friends they
belong to.", key card back (05). Graph place: the same four layers (06). Data place: 77 and 254, no
filter (07). Back to the Assistant: conversation still there, Undone (08).

Records: `look` 1328d3dd4bea at the start and the end, dd3a804a3d4b while changed. `styles.json`
`changes` empty. `work.json` start and end equal, no runs. Three steps, as the key says.

### Keyboard (T94A/keyboard, started --keys --sr)

Reached the end. Tab from the top: Main menu, "Project: lesmis-poster", Undo (disabled), Redo
(disabled), Graph; ArrowDown to Assistant; Enter opens the panel with focus in textbox "Message the
assistant". In the composer: Enter when empty does nothing, Escape keeps focus and does nothing, Tab
goes to "Gemini 3.8 Flash", Talk, Send (disabled while empty); Shift+Tab comes back the same way.

Typed the request, Enter. Status line: "Working", "Louvain finished: 6 groups", "Computed Communities
for 77 nodes. Answer ready". Focus stayed in the composer. Shift+Tab: Undo, Open run, "1 step"
(collapsed), region "Conversation", Close. Tab back down to Undo and Enter: the status line said
"Undid Color every character ...", and focus went to the top bar's Undo, which is disabled (28, 29;
defect 2). From there Tab reaches Redo. Control+I reached the composer and pressed there closed the
panel, returning focus to the control it came from, as decided.

The Graph place by keyboard (`--read`): Hovered 0, Selected 0, Poster 3 nodes, Everything 77 nodes
and 254 edges, so a screen-reader user can confirm the layers. Tab into the list lands on the bottom
row, Everything (defect 7). In the composer Shift+Control+Z redid and Control+Z undid the change, each
announced, focus staying in the composer. Sending again and pressing Escape at once: "Stopped.
Changes taken back.", the request back in the composer, no change (48). The tool's line
`net::ERR_ABORTED` at that step is the cancelled request itself, not an app failure.

Focus never fell to the page body. Records: `styles.json` `changes` empty, `work.json` equal, no runs.

### Detour 1: asking the Assistant to put it back (T94A/detour-1)

After the change (02), "That is not what she wants. Put it back exactly as it was.": one step, the
reply "Undid the previous community detection and restored the graph styling to its previous state.",
the first turn reads Undone, the look is back, Redo is live (03). Its change line reads only "Changed
the graph" (defect 5). "Is the poster exactly as it was when I opened it?": three steps, "Yes, the
graph has been restored to its exact original state, with no remaining changes or algorithm runs."
(04). That was true here, and it is the model's prose with no chip. Graph place as at the start (05).
`look` back to 1328d3dd4bea, `styles.json` `changes` empty, `work.json` equal, no runs.

The first reply in this walk said the communities were "based on their shared chapters". It came from
the model; no screen in the walk showed chapter data, and the other walks' replies did not say it.

### Detour 2: Control+Z and the top-bar arrow (T94A/detour-2)

Control+Z with focus in the empty composer took the change back, row Undone (03). The Redo arrow's
tooltip reads "Redo Color every character by the circle of friends they belong to Shift+Ctrl+Z" (04);
Redo brought it back with the notice "Redid ...", and the turn offered Undo again (05). With "hello
there" typed in the composer, Control+Z took one letter off the text and left the graph alone (06),
which is what a person expects. The top-bar arrow then took the change back, row Undone, tooltip
"Nothing to undo", the typed text kept (08). Records equal, no runs.

### Detour 3: deleting the layer by hand (T94A/detour-3)

Graph place while changed: a new layer Communities 77 above Poster, whose count is replaced by a mark
with the tooltip "Painted over by Communities" (03, 04). Right-click Communities gave the layer menu
(05). Delete: the look is back (1328d3dd4bea), key card back, notice "Deleted Communities layer. Its
results are kept." with Undo (06). The Assistant turn now shows only Open run; Undo has moved off it,
as decided, because the delete is the newest step (07). The run is still there: Open run shows Louvain
in the inspector (08, 09), and Analyze lists it under Recent (10). Nothing in the Graph or Data place
lists it (06, 12), and neither inspector tab has a way to remove it. Defect 1. The top-bar arrow twice,
"Undo deleting Communities" then "Undo Color every character ...", cleared everything (13, 14, 15):
records equal, no runs. Stopping after Delete is what a returning reader would do.

### Detour 4: the main menu, New conversation, closing the panel (T94A/detour-4)

Main menu: Back to start, New project, Open project or file, Open sample, Save, Save as, Save local
copy, Export, Rename, Settings, Keyboard shortcuts, Help. No revert entry (03). New conversation
clears the panel to the starters while the color stays on; nothing says the change is still there
(04). The title's list shows the old conversation with Open and Delete (05). Open brought it back with
Undo still offered (06). Close returned to the Graph place; Control+Z there took the change back (08);
the Assistant shows Undone (09). Records equal, no runs.

### Detour 5: searching for a way back (T94A/detour-5)

Find box, "undo": "No match for "undo". To select by a value, type a rule such as name == 'Napoleon'"
(03). Enter keeps the text (04), Escape clears it and keeps focus (05), Tab goes on to "Add a layer or
a folder" (06). Analyze filter, "undo": "No analysis matches "undo"", in a popover that keeps its full
height for the one line (07). Enter does nothing (08), Tab closes the popover (09), and Escape after
that does nothing (10). Both boxes behave as expected; neither points at Undo. The session ended with
the change on, since it walked only the search.

## Answer key against the screen

No mismatch. Key card, Undone row, conversation kept, `look`, `styles.json` and `work.json` all read as
the key says, and the step count is the key's. The changed `look` differed from the key's example and
between walks (dd3a804a3d4b, 48e970ad8962), which the key allows: it says to compare within a session.

## Defects

1. **Deleting the layer brings the picture back and leaves the run, with no visible way to remove it**
   (severity 3; the reader says the project is exactly as Noor made it while a Louvain run remains).
   The picture is identical, and the only sign is the notice's "Its results are kept". The run appears
   in no list in the Graph or Data place, its inspector has no delete, and the only ways back are Undo
   twice or Open run in the turn. The key counts this against bar 7. T94A/detour-3/06.png, 08.png,
   09.png, 12.png.
2. **Undo in the turn sends focus to the top bar's disabled Undo** (severity 2). The turn's button is
   removed when the row becomes Undone, and focus lands on a control read as "Undo, disabled", right
   after an action that worked, far from the conversation. Remove on an approval returns focus to the
   composer; this should do the same. T94A/keyboard/28.png, 29.png.
3. **A click on Assistant just after a project opens can be thrown back to Graph** (severity 2). In one
   start of eight the setup's `--click Assistant` landed, focus was on the Assistant button, and the
   place was still Graph, so the setup stopped at "nothing on screen is called AI provider...". The
   likely path is `AssistantPlace`'s effect that sends the place to Graph when `on === false`, if the
   new element reports no features for a moment; this was read in the code, not proven. A second click
   would work. In the same start the start screen's sample picture venice-transit.webp failed with
   `net::ERR_BLOCKED_BY_ORB`. T94A/setup-race/01.png, 03.png, setup.log.
4. **The run inspector's Style tab is blank** (severity 1). Open run lands on an empty pane with no
   words, and the numbers are one tab over. T94A/detour-3/08.png.
5. **"Changed the graph" on the turn that put it back** (severity 1). The change line says less than
   the reply, and a reader checking it learns nothing. T94A/detour-1/03.png.
6. **New conversation gives no sign that a change is still on** (severity 1). The panel reads as a
   fresh start with six colors on the canvas; the top-bar arrow is the only route left in view.
   T94A/detour-4/04.png.
7. **Tab into the layer list lands on the bottom row** (severity 1), Everything, not the first.
   T94A/keyboard route, step after "Add a layer or a folder".
8. **Send is drawn as the full primary button while empty and disabled** (severity 1). The screen
   reader says disabled; the eye sees it ready. T94A/success/05.png.
9. **One result, four names** (severity 1): the reader's "circle of friends" becomes Communities on the
   layer and the change line, Louvain on the key card and the run, and Group 1 to 6 in the key, with
   "Groups" on the run. T94A/detour-3/03.png, 08.png.
10. **The six-row key card covers nodes** (severity 1). It grows over the top left of the drawing and
    hides a node at about 533,184 with the Graph place open. The card is an overlay by rule and framing
    ignores it, so this is noted, not a request to reframe. T94A/detour-3/03.png.

## Checked and matching the decisions

Undo only on the newest step; no notice while the panel is open for a finished turn; focus stays in
the composer through streaming; Esc stops only while running and takes changes back; the x closes the panel;
the Control+I rule. The known "analysis asked as a question repaints" did not arise here, since the
reader asks for the color.
