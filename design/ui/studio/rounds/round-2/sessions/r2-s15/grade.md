# Grade: session r2-s15 -- Morgan, screen reader, names on every dot (Les Miserables)

**Grade: SD** (success with difficulty). Morgan bound a label line to `name` on the Everything
row, the names are drawn, and Morgan heard and repeated the count "77 labels, 7 hidden to avoid
overlap" and gave the reason (the app hides them so they do not overlap). Morgan found the label
controls by elimination after three wrong turns, which puts this at SD rather than S. Ease given:
3 of 7.

Build seen: `4a7a1a7fbdba graphty@0.8.53` (session.json), 1440 x 900, screen-reader mode, no
uncommitted changes. No downloads (none needed for this task).

## Success check

Morgan works from the accessibility tree and live-region text the tool prints, so each part is
checked against the printed text first and the screenshot second.

1. **Label line bound to the name attribute on a row that covers every node.** Step 45 printed
   `button "Label, Above: name"` inside the Everything row's Style tab. The last screenshot
   (`59.png`) shows the Everything row selected and the label line "Aa Above / Abc name".
2. **Names drawn.** `43.png` (right after step 42) and `59.png` show character names on the
   canvas (Myriel, Napoleon, Fantine, ...).
3. **Count read and the reason given.** Step 42 printed `live: region (polite): "77 labels, 7
   hidden to avoid overlap"`. Morgan said "every name is not done while 7 are hidden", and in the
   debrief "seven of them are hidden by the app's own choice". The panel in `59.png` reads the
   same count.

**Screen-reader check:** both texts the task needs exist on the build and were heard: the live
region's "77 labels, 7 hidden to avoid overlap" and the line's name "Label, Above: name" (shown as
"Abc name" on screen).

## Measures

- **Steps:** 58 `real.mjs` steps after the start (`02.png` to `59.png`), many with several keys.
  The success state was reached at step 42 and confirmed at step 45. The success path is 4 steps
  (54 keys on the keyboard path).
- **Wrong turns: 3** before success:
  1. Arrow and Enter on the canvas to see whether it speaks (steps 8 to 9).
  2. A Tab walk through the Style tab with nothing picked, which holds only Canvas settings
     (steps 14 to 25).
  3. The Graph actions menu (steps 28 to 30).

  After success Morgan made 4 more detours looking for a way to show the 7 hidden names, which
  the build does not have: Label position (steps 46 to 49), reopening the label line (50 to 51),
  the keyboard help (52 to 56) and Escape on the tree (57 to 58).
- **False "done": none.** The final claim, "Names are on: the app said 77 labels, 7 hidden to
  avoid overlap", matches the screen. Morgan never claimed every name was drawn. truth_on_screen:
  not applicable.
- **Undo:** Morgan never undid anything.
- **Silent commits:** none. Choosing `name` changed the canvas and was announced.
- **Counts against the drawing:** none disagree.
- **Tool prints:** no `ambiguous`, no script errors, session.log empty. One reporting gap, noted
  below. It did not decide the grade.
- **Build-decided:** no. **Void:** no.

## Problems

| # | Severity | Kind | Problem | Evidence |
|---|---|---|---|---|
| 1 | 3 | build-defect | Opening the sample moves focus to an element announced as "Canvas" with no name. The reader hears "No nodes to draw" before "Reading Les Miserables", which sounds like a failure, and never hears that loading finished or how many nodes and edges loaded. The canvas does not respond to arrows or Enter. This breaks the "load finished" announcement that bar 8 requires. | Steps 6 to 9 (`07.png` to `10.png`). Reproduced in `rounds/round-2/repro/r2-s15/repro.sh`, steps 03 and 04 of `run.log`. |
| 2 | 3 | behavior | The label controls appear only after the reader picks "Everything" in a two-item tree ("Selection", "Everything"). Nothing says what that list is, what position an item is in, or that picking it changes the Style tab. With nothing picked, the Style tab holds only background and layout settings. Morgan found labels by elimination after walking the whole tab order twice. | Steps 13 to 25 (`14.png` to `26.png`), steps 31 to 36 (`32.png` to `37.png`) |
| 3 | 2 | build-defect | Choosing the label attribute makes two announcements: "0 labels, 0 hidden to avoid overlap" and then "77 labels, 7 hidden to avoid overlap". Bar 8 asks for exactly one announcement when a label line is added. The first is false and is noise. | Step 42 (`43.png`). Reproduced in `repro.sh`, step 10 of `run.log`. |
| 4 | 2 | behavior | "7 hidden to avoid overlap" does not say which 7 characters are missing, and there is no control to show them. A blind reader cannot check the picture and must ask a sighted colleague. Morgan spent 4 detours looking for one. The answer key expects this on this build. | Steps 42 and 46 to 58 (`43.png` to `59.png`) |
| 5 | 2 | build-defect | "Label position" is announced as a dialog, but its controls come after "Add Tooltip" in the Tab order, not next to the button that opened it, and Tab walks out of it to the resize separator and then the page. | Steps 46 to 48 (`47.png` to `49.png`). Reproduced in `repro.sh`, steps 11 and 12 of `run.log`. |
| 6 | 2 | accessibility | "Label" and "Add label line" are two buttons a screen reader cannot tell apart. Neither says what it does or whether it is on. Once a line exists, both become disabled with no reason given. | Steps 36 and 37 (`37.png`, `38.png`), steps 43 and 44 (`44.png`, `45.png`) |
| 7 | 1 | build-defect | The Gravity field reads "-1.2000000476837158", a single-precision float artifact, instead of -1.2. | Step 22 (`23.png`). Reproduced in `repro.sh`, step 06 of `run.log`. |
| 8 | 1 | build-defect | Undo is enabled right after the sample opens, before the reader has changed anything. Morgan wondered what could be undone. | Step 26 (`27.png`). Reproduced in `repro.sh`, step 05 of `run.log`, with no keys pressed on the canvas. |
| 9 | 1 | wording | The background color button is named "Color swatch" and does not say what it colors. Only the next control, "Reset Background to default", tells the reader. | Steps 16 to 18 (`17.png` to `19.png`) |
| 10 | 1 | behavior | Escape on the selected "Everything" tree item does not clear the pick, and Morgan found no keyboard way back to the Canvas settings. | Steps 57 and 58 (`58.png`, `59.png`) |

Problems 1, 3, 5, 7 and 8 are build defects. `repro.sh` reproduces each of them with the
session's keys on the same build, so each counts as confirmed from one participant. The others
come from this session only unless another session recorded them too.

## Tool note (not a build defect)

In the attribute list ("Find an attribute"), Morgan pressed ArrowDown and heard nothing. The
build does move the highlight: the list is a combobox with `aria-activedescendant` pointing at
the highlighted option (`compact-mantine/src/components/shell/QuickActions.tsx`), and the repro's
`run/09.png` shows "id" highlighted after two ArrowDowns. A real screen reader would read "id" and
"name". `real.mjs` prints only the focused element, not its active descendant, so Morgan
pressed Enter on "name" without hearing the choices. The grade would be the same either way, so
the session is not void, but the tool should print the active descendant before the next
screen-reader session runs. The keyboard help list Morgan could not read in steps 54 and 55 is a
similar limit: the tool has no browse mode.
