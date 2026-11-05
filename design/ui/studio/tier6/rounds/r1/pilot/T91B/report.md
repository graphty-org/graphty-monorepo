# Pilot walk: T91 B, make the yeast genes stand out

Build 8fa33aa786, served from `.study-builds/tier6-r1-8fa33aa786`, live Gemini 3.8 Flash, start
`setup:connected-yeast.txt`. Screenshots are under
/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier6/r1/pilot/T91B/ (written below as
`<walk>/<n>.png`). The data stayed yeast-galactose.graphml, 331 nodes and 361 edges, on every walk.

Result: the task can be reached by pointer and by keyboard. The nine genes the answer key names were
the nine the layer matched (`styles.json`: selector `data.gal4RGexp < -1`, matched 9, painted 9).

## Success path, by pointer (success/, 8 model calls)

1. Assistant on the rail. The panel opens with focus in the composer (02.png).
2. Typed "Make every gene with gal4RGexp below -1 stand out from the rest of the network", Enter.
   "Sending to Google" stayed on screen beside a growing step count (03 to 05.png).
3. The reply arrived within about a minute (within 30 seconds on the keyboard walk): "Found 9 genes...", "Colored 9 nodes", "Sized 9 nodes",
   Open layer, Undo. Nine red nodes on the canvas, key card "Color: Low gal4RGexp, 9 of 331 nodes"
   (06.png). I counted nine by eye.

Then the checks a reader could make. Hovering the 9 chip in the opened steps ringed the nine and
changed nothing else (07.png). Clicking it selected them, and the inspector read gal4RGexp -2.406 to
-1.004 (08.png). Open layer showed "Rule: data.gal4RGexp < -1, 9 nodes" (09.png). The x on the scope
line returned to Whole graph and offered Use selection (13.png). Close returned to Graph, where the
layer list shows Low gal4RGexp 9 (14.png).

Composer keys: Enter when empty does nothing. Escape keeps typed text and focus. Tab goes to the
model label, then Talk, then Send (10 to 12.png). All as `decided.md` says.

## Mismatches with the answer key

- The key gives the key card as "9 of 24 nodes" for A and B. On B it reads "9 of 331 nodes"
  (success/06.png). The B figure is missing from the key.
- The key's change line is "Colored 9 nodes". The model also sized the nine, so a second line "Sized
  9 nodes" appears (success/06.png). Not a failure; the key allows it for A only by implication.

Everything else matched: path of three reader steps, the Open layer action, the nine names (read from
the sorted table, detour-2/06.png: GAL1, GAL7, GAL10, HOM3, ADE4, HIS7, GLN1, MET16, GAL3).

## Keyboard walk (keyboard/, 7 model calls, reached the end)

Started in screen-reader and keyboard-only mode. Focus never fell to the page body after the start.

Tab from the top: Main menu, Project: yeast-galactose, Undo (disabled), Redo (disabled), Graph, Graph
yeast-galactose.graphml, Find. The rail is one tab stop: Assistant is reached with ArrowDown from
Graph. Enter on it opens the panel with focus on textbox "Message the assistant". Control+I does the
same from anywhere; pressed in the composer it closes the panel and focus returns to where it was
(the Node size control, 71.png).

Panel order, forward: Assistant (rail), New conversation, Conversations (menu), New conversation,
Close, the three starters, the composer, Gemini 3.8 Flash, Talk, Send (disabled), Resize left panel,
Graph drawing, Analyze. The scope line is read in browse mode ("Whole graph Node 331 Edge 361") and
is not a stop until there is a selection.

Typing and Enter: focus stayed in the composer. The polite region said "Working", then "Colored 9
nodes. Sized 9 nodes. Answer ready" (35.png). After the reply: Conversation region (visible ring,
40.png), 6 steps, Open layer, Undo. Enter on 6 steps opens them, two "9 nodes, select" chips can be
tabbed to, focus peeks at the nine (49.png), Enter selects and says "9 nodes selected" (50.png). Enter
on Open layer opens the layer (52.png); the count is then available on "Which nodes, 9 of 331 nodes".

## Detours

**Detour 1, looking for it elsewhere (detour-1/, 9 model calls).** Find with "gal4RGexp below -1":
no match, and it offers a rule as an example (02.png); Enter changes nothing (03.png). Main menu has
no AI entry (04.png). Find with "gal4RGexp < -1" and Enter selects 9 (06.png); Tab moves on; Escape in
Find clears the text and keeps the selection (08.png). Analyze with "AI" as the filter lists
All-pairs distance, Louvain and others by letters inside their names; Enter opens All-pairs distance
(10, 11.png). Settings shows AI provider (13, 14.png). Assistant then opened scoped to Selection 9;
"make these stand out from the rest of the network" worked (17.png). Deselecting keeps the look
(18.png). The reply's Undo takes it back, shows Undone and a notice (21.png).

**Detour 2, asking first (detour-2/, 9 model calls).** A starter fills the composer and does not send
(02.png). "how many genes have gal4RGexp below -1?" answered 9 with a chip and Show in table (03.png).
Show in table selected the nine and opened the table with none of them on screen (04.png); two clicks
on the gal4RGexp heading brought them up, shaded (06.png). "make them stand out" worked from there
(08.png). Escape during the next message stopped it: "Stopped. Changes taken back.", my text back in
the composer, look unchanged (10.png). The aborted request is printed as a failed request; that is
the abort itself.

**Detour 3, by hand, then a selection left behind (detour-3/, 11 model calls).** Right-click on the
canvas hit an edge and selected it: the menus have no AI entry (02, 05.png). The plus at Style layers
offers Layer, Folder, Analyze (06.png); Layer opens an empty layer (07.png). Going to Assistant with
that edge still selected, "color genes with gal4RGexp below -1 red and make everything else gray"
failed: the message was scoped to Selection, one edge, and came back "No matches. Style failed.
Nothing changed." with Send again (10.png). Send again cleared the selection and failed again
(11.png). Send again once more failed with Whole graph on the scope line (12.png). Typing it anew
with "across the entire graph" worked (13.png).

## Defects

Severity 0 to 4, each from the walk named.

1. **Severity 3. Send again ignores the scope line.** detour-3/12.png. The scope line read Whole
   graph, and the reply said the current selection held no nodes and asked the reader to select
   something or run across the entire graph, which is what the screen said was happening. Mechanism:
   `again` in graphty/src/workspace/assistant/Conversation.tsx resends with the failed message's own
   `scope.kind`, so the message goes out as a selection scope over an empty selection.
2. **Severity 3. A stray selection fails a whole-graph request, and the offered way out does not
   help.** detour-3/10.png and 11.png. One edge selected by a right-click scopes a request about
   nodes. The screen offers Send again, which cannot work; the x on the scope line is the real way
   out and nothing points to it. "No matches." and "Style failed." do not name the selection; only the
   model's prose does.
3. **Severity 2. The Assistant cleared the reader's selection unasked, and reported it as a change.**
   detour-3/11.png: "Selected 0 nodes" as a change line, the reader's edge gone, Selection became
   Whole graph, in a turn that also failed.
4. **Severity 2. Show in table does not show them.** detour-2/04.png. It opens all 331 rows in load
   order with none of the nine on screen, and nothing says where they are. It also selects them, so
   the scope changes to Selection 9 as a side effect of looking.
5. **Severity 2. A duplicate change line.** detour-1/17.png: "Sized 9 nodes" twice in one turn, because
   the model sized twice. A reader counts two changes where the result is one.
6. **Severity 2. Two identical chip rows in one turn.** keyboard/49.png. Both Query data steps show a
   9 chip, both named "9 nodes, select". `decided.md` allows at most one chip row per turn. success/
   had one, so it follows the number of queries the model makes.
7. **Severity 2. Clicking a chip moves the drawing.** success/07.png against 08.png; keyboard/50.png
   the same. The nodes shift and shrink about 7% on any selection, so the nodes the reader was
   comparing jump. Find does it too (detour-1/06.png), so this is not the Assistant's alone.
8. **Severity 2. Show in table and the table leave a very small drawing.** detour-2/04.png. The nine
   are not distinguishable in it while the table is open.
9. **Severity 2. Open layer is silent to a screen reader.** keyboard/52.png. Enter on it changes the
   inspector, and the step printed no live line, with focus left on the button.
10. **Severity 1. Send looks ready while disabled.** success/02.png and keyboard/35.png. With an empty
    composer it is the full green primary, and the accessibility tree says disabled.
11. **Severity 1. The undo notice reads badly and appears with the panel open.** detour-1/21.png: "Undid
    make these stand out from the rest of the network." quotes the reader's words with no marks. The
    header tooltip has the same shape (20.png). `decided.md` keeps a turn's notice for a closed panel;
    this one repeats "Undone" beside it.
12. **Severity 1. Run status says Sending to Google throughout.** success/03 to 05.png. For up to a
    minute the line never changes while steps run on this machine, and the expanded steps show no
    time until they finish.
13. **Severity 1. Steps name a family, not an act.** success/06.png: Style, Query data, Catalog, Query
    data, Style, Style, Style. The failure line "Style failed." (detour-3/10.png) inherits it.
14. **Severity 1. The rule in the layer is code.** success/09.png: "Rule: data.gal4RGexp < -1" with its
    `data.` prefix, shown to a first-time reader.
15. **Severity 1. The composer says "Ask about this graph" while scoped to a selection.** success/08.png,
    detour-1/17.png.
16. **Severity 1. The chip gives no pointer cue or tooltip.** success/07.png: `cursor: default`,
    `tooltip: null`, on a control that selects.
17. **Severity 1. Names.** "New conversation, Conversations" and "New conversation" sit side by side on
    a fresh panel, and Close does not say what it closes (keyboard walk, forward list above).
18. **Severity 1. The rail is one tab stop with no spoken hint.** keyboard walk: Tab passes from Graph
    into the panel, so Assistant needs ArrowDown or Control+I, and the focus line for Graph gives no
    sign that arrows work.
19. **Severity 1. "AI" in the Analyze filter matches letters inside names** and Enter opens the first
    of them (detour-1/10.png, 11.png). No route to the Assistant from there.
20. **Severity 1. A retried turn loses its failure lines.** detour-3/10.png against 11.png: "Style
    failed.", "Nothing changed." and Send again go from the first turn once it is retried.
21. **Severity 1. Reopening the panel closes opened steps.** keyboard walk, after Control+I twice: 6
    steps is collapsed again.

Known and not counted: the starter "Does name line up with the groups?" (answers.md, seen while
writing the key).
