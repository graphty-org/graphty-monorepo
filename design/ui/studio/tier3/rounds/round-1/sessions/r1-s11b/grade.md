Grade: SD
False done: no
Wrong turns: 2

# Grade: r1-s11b (task T40 A, persona Sam)

Participant model: claude-opus-5-5 (every model line in the participant log says Opus; not Sonnet).
Build: 758b8e8081 (`session.json` buildStamp "758b8e8081dc graphty@0.8.91"), the frozen build
`criteria.md` names. Start: `empty`, keyboard only (`keyboardOnlyMode: true`), 1440 x 900.
Saved files: none (no `downloads/` or `saved/` folder).

## Leak check

`leaks.json` found the participant's log (93 tool calls) and lists no leak: nothing was opened
outside the session folder. The run completed. No VOID.

## Final state against the success definition

T40 A succeeds when exactly the 6 characters with "Mme" in the name are drawn purple, everyone
else is unchanged, and the count was said from the screen.

- Last screenshot `46.png`: Les Miserables open; the layer "Married women" (6) is above
  Everything (77); the inspector reads Which nodes "name contains Mme, 6 nodes", "6 of 77 nodes",
  Fill > Color `800080`; the key reads "Color: Married women, 6 of 77 nodes"; six dark purple dots
  among the default indigo ones.
- `styles.json`: layer `layer-1_2` "Married women", node target, selector rule text on
  `data.name`, substring "Mme", sets `node.color` `#800080`, matched 6, painted 6. Everything
  (`everything_2`) still sets `#6366F1` and paints the other 71; no other layer changed a look.
- `key.json` drawn values: nodes `#6366f1` x 71, `#800080` x 6; edges `#a9a9a9` x 254 (unchanged).
- Drawn hex `#800080`; `colorWord` (compact-mantine `color-utils.ts`) is "purple", which holds the
  asked hue word.
- `styles-steps.jsonl`: the task graph's look first changes at `46.png` (`#6366f1`, `#800080`).
- MmeMagloire is still selected from the find-box detour (a yellow ring at `46.png`); graded by
  the style tree, where it is purple like the other five.
- The count: "Nodes 6" in the find list at `25.png` and "6 of 77" in the picker at `42.png`, both
  before the participant said 6. The six names said match the reference values.

He said the six are purple and the rest unchanged, and the screen shows exactly that: no false
done.

## Steps against the success path

The key's path for A is 11 steps by pointer; by keyboard each step also costs the Tab travel to
reach it (the key: the Style layers "+" is 15 Tabs from the graph heading, Which nodes 10 Tabs
from the new layer's row). He took about 105 key presses (his own count, matching the
transcript): about 41 to open the sample, 64 in the workspace.

- Steps 1 to 4: Tab, Tab, Enter on the top bar's "Samples" (`03.png`, `04.png`): the page
  scrolled to the library with focus left on the button.
- Steps 5 and 6 (`05.png`, `06.png`): **wrong turn 1.** Six Tabs walked focus through the top
  bar and back into the start page above, and he read the library as closed. He then reached
  the start card's "Samples" by 13 more key presses (`07.png` to `10.png`) and found the same
  focus problem (`11.png`, a refused type at step 12, `13.png`).
- Steps 14 to 20 (`14.png` to `20.png`): into the library search, `les`, Enter (no effect), then
  10 Tabs through the grid toggle and the category chips to the card; Enter opened Les
  Miserables.
- Steps 21 to 24: Tab and Shift+Tab across the right panel, canvas and left panel to reach the
  find box (focus after opening sat in the right panel).
- Steps 25 to 29 (`25.png` to `29.png`): **wrong turn 2.** `Mme` in the find box ("Nodes 6"),
  Enter selected only MmeMagloire and emptied the list, Node actions opened, "New layer from
  selection" judged useless with one node, Escape. The route was abandoned.
- Steps 30 to 46 (`30.png` to `46.png`): the success path from step 3: "+" > Layer, renamed
  "Married women", Which nodes, Add a condition, `name`, `Mme` ("6 of 77"), Escape to close the
  suggestion list, 7 Tabs to Fill "+", `800080` and Enter. Tab overshoots at steps 35 and 36
  were corrected within one move each and are travel, not wrong turns.

Why SD and not S: the result is the key's own stack (a `name` contains card and a purple Fill on
a new layer), but it was reached after an abandoned detour through the find box, and the route
was far longer than the key's.

## Problems

1. **"Samples" (top bar and start card) scrolls to the library but leaves focus on the button.**
   Severity 3, build-defect, accessibility (WCAG 2.4.3 Focus Order). Steps 4 to 6 and 11 to 13
   (`04.png`, `06.png`, `11.png`, `13.png`): typing went nowhere, the next Tabs scrolled back to
   the top and the library seemed to close; about 15 key presses and one wrong turn lost.
   Reproduced: `../../repro/r1-s11b/commands.md` (step 4 there: "nothing that takes text has
   focus (focus is on a "Samples")"; step 5: Tab lands on "Docs").
2. **No keyboard way to act on every find-box match.** Severity 2, behavior. Step 26 (`26.png`):
   Enter selects only the first match and empties the list; the six matches cannot be selected
   together from the keyboard, so "New layer from selection" (`28.png`) gave no route. This sent
   him on wrong turn 2.
3. **After a sample opens, focus is on no visible control and the next Tab lands in the right
   panel.** Severity 2, accessibility. Steps 20 and 21 (`20.png`, `21.png`): no ring after the
   open; the find box he needed was 4 Shift+Tabs back across the canvas and the left panel.
4. **Moving between the panels is long Tab travel, and the region-jump key is never shown.**
   Severity 2, wording. Steps 22 to 24 and 35 to 37 (`22.png` to `24.png`, `35.png` to `37.png`):
   he crossed the canvas and the 7-button toolbar each way and said he saw no shortcut to jump
   to a panel. The build has F6 region stops (repro `../../repro/r1-s18/commands.md`), but no
   tooltip, menu or hint on screen names it.
5. **Library search: Enter does nothing and the results stay below the fold.** Severity 2,
   behavior. Steps 15 and 16 (`15.png`, `16.png`): after `les` and Enter the screen did not
   change and he could not see whether the list had filtered until 3 more Tabs scrolled to it
   (`17.png`).
6. **Each category chip is its own Tab stop.** Severity 1, accessibility. Steps 17 to 19
   (`17.png` to `19.png`): 9 chips between the search box and the first card; a chip group would
   normally take one Tab stop and arrow keys inside it.
7. **The focus ring on the green "Open a file" button is faint.** Severity 1, accessibility.
   Step 9 (`09.png`): a thin dark outline on the saturated green, visible only on close reading.
8. **The name suggestion list covers Done.** Severity 1, behavior. Step 42 (`42.png`): the list of
   six names opened over Match case and Done; he pressed Escape so Enter would not replace his
   text (the key notes Enter keeps the typed text; nothing on screen says so).
9. **The key's toolbar button turned on as the first color landed, with no word about it.**
   Severity 0, opinion. Step 46 (`46.png`): the list button lit green and the key appeared; he
   read it as a toggle that switched itself on. The key appearing is the intended behavior.
