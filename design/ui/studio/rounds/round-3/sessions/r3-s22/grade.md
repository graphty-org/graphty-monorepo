# Grade: session r3-s22 -- Sam (keyboard-only analyst), Florentine families, the Medici's marriages

Build: commit f108a2350, graphty 0.8.53 (build stamp b7590f8de, session.json), keys and typing only,
no pointer. Graded from the last screenshot (18.png) and the transcript, plus one scripted re-run
on the same build. No files were saved, and the task asks for none. Not graded from the
participant's rating (6 of 7).

## Grade: S (success)

The task succeeds when Medici is selected and the six families are named from the screen:
Acciaiuoli, Albizzi, Barbadori, Ridolfi, Salviati, Tornabuoni.

1. **Medici selected.** Steps 12-15: find box, typed "Medici", ArrowDown, Enter. 15.png shows the
   inspector headed "Medici / Node", "Selection 1", and one ringed node. Holds.
2. **One fact read.** Step 15: the Summary shows id Medici, name Medici, Degree 6. Holds.
3. **The six families listed on screen and named.** Steps 17-18: Tab to the "Degree 6" row,
   Enter. 18.png shows "Medici's 6 connections" with Acciaiuoli, Albizzi, Barbadori, Ridolfi,
   Salviati and Tornabuoni. The answer in the debrief names all six and says 6. Holds.

- **Route:** the Degree row ("Degree 6 >"), reached by Tab from the Summary group. No G key and
  no context menu.
- **Help:** none.
- **Void:** no. Every command was a key or typed text, and the tool did nothing a person could
  not.
- **Bar 7 (keyboard only):** met for this session.

## Counts

| | This session | Reference |
|---|---|---|
| Commands (real.mjs, after the start) | 17 | 6 (the pointer path) |
| Keys pressed | 22, plus "Medici" typed (28 keystrokes) | 30 keystrokes on Florentine families, keyboard path |
| Wrong turns | 0 | -- |

- Keystrokes against the keyboard path: 28 / 30, under 1x. He never answered the usage card
  (the reference path closes it), which saved its Tab walk. He then lost 7 Tabs walking back from
  Main menu to the find box after the sample opened (problem 1), where the reference path uses
  `/`.
- **No-op probes (not counted as wrong turns):** ArrowDown on the sample cards (step 6) and
  ArrowDown inside the Summary group (step 16). Neither changed anything, and the next key
  continued on the success path.

## False "done"

None. "Did I finish? Yes" and "The Medici married into 6 families: ..." match 18.png. His
statement that nothing else is recorded about the Medici besides id, name and degree matches
15.png and the sample's attributes (`id`, `name`).

## Problems

Severity 0-4 (Nielsen). Opinion-only findings are held one level down. The build defects below were
reproduced by `rounds/round-3/repro/r3-s22/repro.sh`, which walks the session's keys in
screen-reader mode so the focused element is printed after every key. Its output is in `run/` and
`run.log`.

| # | Sev | Kind | Problem | Evidence |
|---|---|---|---|---|
| 1 | 2 | build-defect | Opening a sample from the keyboard drops focus to the page body. The next Tab starts again at Main menu, and a keyboard user walks 7 stops back to the find box. Also met by the screen-reader participant in r3-s01, and listed against bar 8. | Steps 8-12, 08.png, 09.png. Repro: `run.log` prints "focus: nothing (the page itself)" after Enter on "Open the Florentine families sample" (`run/10.png`), then "Main menu" on the next Tab (`run/11.png`). |
| 2 | 2 | build-defect | The disabled Redo button takes a Tab stop and shows no focus ring. Only its tooltip, "Nothing to redo", shows where focus is (WCAG 2.4.7). Enabled Undo, one stop before it, shows a clear ring. | Step 10, 10.png. Repro: "focus: button "Redo" disabled" in `run.log`, no ring in `run/14.png`; Undo's ring in `run/13.png`. |
| 3 | 2 | behavior | Nothing on screen tells a keyboard user how to reach the find box quickly. He saw no shortcut hint on the box and walked to it by Tab; the `/` shortcut was never found. Seen in one participant. | Steps 9-12, 12.png; debrief "I saw no shortcut hint on the find box". |
| 4 | 1 | behavior | The white frame around the Summary group is focus, but it looks like a "you are here" frame, and arrow keys do nothing inside it. He tried ArrowDown first and needed Tab to reach the Degree row. Seen in one participant. | Steps 15-17, 15.png, 16.png, 17.png. |
| 5 | 1 | wording | "Degree" is jargon to him. Only the ">" at the end of the row hinted that it opens the list of families. The list heading "Medici's 6 connections" was clear, and he read "connections" as marriages from the start page, since the panel never says "married". Held one level down as opinion. | Steps 15 and 18, 15.png, 18.png; debrief. |
| 6 | 0 | opinion | The sample cards are separate Tab stops and do not answer arrow keys. He expected a list and lost one key. Cosmetic. | Step 6, 06.png. |

**What worked:** every control he needed was reachable by keyboard with a visible ring (apart from
Redo). The find box behaves like a search box: type, ArrowDown to the result, Enter. After Enter,
focus moved to the node's Summary instead of being dropped. One Tab reached the Degree row, and
Enter opened the list of six names with focus on it, while the drawing ringed the Medici and their
six neighbors.
